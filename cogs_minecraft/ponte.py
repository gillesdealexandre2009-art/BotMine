"""Ponte Discord <-> Minecraft: servidor HTTP que o addon consulta, o chat e os eventos do jogo, o vínculo das contas e os painéis.

O addon (pack "Vulpus Ponte", no servidor dedicado) faz as chamadas; este módulo só responde e nunca chama o jogo.
Todas as rotas exigem `Authorization: Bearer <MC_BRIDGE_TOKEN>`. Sem o token a ponte não sobe (o resto da Kiza segue).

Rotas (JSON):
  POST /mc/vinculo  {id, nome}                    -> {vinculado, discord_id?, discord_nome?} ou {codigo, expira_em}
  POST /mc/sync     {id, nome, chave, caudas, xp} -> {saldo, xp}  (diferenças desde a última vez; a chave evita somar duas vezes)
  POST /mc/eventos  {eventos: [{t, nome, ...}]}   -> posta nos canais (veja embeds.TIPOS_EVENTO)
  POST /mc/status   {online: [nomes], max}        -> atualiza o painel do ip-e-porta
  GET  /mc/chat?desde=N                           -> mensagens do chat-bridge depois de N (-1 = só o marcador atual)
  GET  /mc/saude                                  -> {ok: true}
Canais (chaves de config.MC_CANAIS_PADRAO; o /setup pode trocar): mc_chat, mc_ip, mc_historico, mc_login.
Comandos no Discord: /minecraft vincular, conta, desvincular (staff), painel (admin). Painéis com botões no canal de login.
"""
from __future__ import annotations

import asyncio
import hmac
import json
import logging
import os
import re
import secrets
import time
from typing import TYPE_CHECKING, Any, Optional

import discord
from aiohttp import web
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from cogs_minecraft import embeds
from cogs_minecraft.embeds import Contexto
from cogs_minecraft.proximidade import validar_pontos
from utils.helpers import arquivo_banner, formatar_moeda, formatar_numero, nivel_por_xp, publicar_ou_editar, responder
from utils.permissoes import checar_membro, exigir_nivel
from utils.pix import assinatura_valida

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.minecraft")

ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sem 0, O, 1 e I
TAMANHO_CODIGO = 6
VALIDADE_CODIGO = 15 * 60
LIMITE_DELTA = 10_000_000
LIMITE_EVENTOS = 40
MAX_TEXTO_JOGO = 240
MAX_TEXTO_DISCORD = 240
CONTROLE = re.compile(r"[\x00-\x1f\x7f]")
COR_JOGO = re.compile(r"§.")
CAUSA_VALIDA = re.compile(r"^[a-z_]{1,20}$")
TEMPO_FALHA_CODIGO = 60  # no máximo um aviso de código recusado por pessoa a cada minuto, no canal de login


def limpar_texto(texto: Any, limite: int) -> str:
    """Texto vindo de fora: sem códigos de cor do jogo nem caracteres de controle, em uma linha, no tamanho máximo."""
    bruto = COR_JOGO.sub("", str(texto)).replace("\n", " ").replace("\r", " ")
    return CONTROLE.sub("", bruto).strip()[:limite]


def novo_codigo() -> str:
    return "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(TAMANHO_CODIGO))


def _inteiro(valor: Any, limite: int = LIMITE_DELTA) -> Optional[int]:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or valor != valor:
        return None
    n = int(valor)
    return n if abs(n) <= limite else None


def validar_evento(bruto: Any) -> Optional[dict[str, Any]]:
    """Confere e limpa um evento do jogo. Devolve None se não presta (tipo desconhecido, campo faltando)."""
    if not isinstance(bruto, dict) or bruto.get("t") not in embeds.TIPOS_EVENTO:
        return None
    t = bruto["t"]
    txt = lambda campo, lim=40: limpar_texto(bruto.get(campo, ""), lim)  # noqa: E731
    num = lambda campo, lim=1_000_000: max(0, _inteiro(bruto.get(campo, 0), lim) or 0)  # noqa: E731
    ev: dict[str, Any] = {"t": t}
    if t in {"msg", "entrada", "saida", "morte", "streak", "streak_fim", "nivel", "conquista"}:
        ev["nome"] = txt("nome")
        if not ev["nome"]:
            return None
    if t == "msg":
        ev["texto"] = limpar_texto(bruto.get("texto", ""), MAX_TEXTO_JOGO)
        if not ev["texto"]:
            return None
    elif t == "entrada":
        ev["novo"] = bruto.get("novo") is True
    elif t == "saida":
        ev["sessao"] = num("sessao", 10 * 24 * 3600)
    elif t == "morte":
        causa = str(bruto.get("causa", "outro"))
        ev["causa"] = causa if CAUSA_VALIDA.match(causa) else "outro"
        tipo = bruto.get("matador_tipo", "")
        ev["matador_tipo"] = tipo if tipo in {"jogador", "mob"} else ""
        ev["matador"] = txt("matador")
        ev["local"] = txt("local")
    elif t == "streak":
        ev["n"] = num("n", 10_000)
        if ev["n"] < 2:
            return None
    elif t == "streak_fim":
        ev["vitima"] = txt("vitima")
        ev["n"] = num("n", 10_000)
        if not ev["vitima"] or ev["n"] < 2:
            return None
    elif t == "nivel":
        ev["nivel"] = num("nivel", 1000)
        ev["rank"] = txt("rank", 30)
    elif t == "conquista":
        ev["conquista"] = txt("conquista", 60)
        if not ev["conquista"]:
            return None
    elif t in {"cla_criado", "cla_extinto"}:
        ev["cla_tag"], ev["cla_nome"] = txt("cla_tag", 8), txt("cla_nome", 30)
        if not ev["cla_tag"] or not ev["cla_nome"]:
            return None
        if t == "cla_criado":
            ev["fundador"] = txt("fundador")
        else:
            ev["dias"], ev["membros"] = num("dias", 100_000), num("membros", 1000)
    elif t == "guerra_inicio":
        ev["a"], ev["b"] = txt("a", 8), txt("b", 8)
        if not ev["a"] or not ev["b"]:
            return None
        ev["aposta"], ev["ctf"] = num("aposta", 100_000_000), bruto.get("ctf") is True
    elif t == "guerra_fim":
        ev["a"], ev["b"] = txt("a", 8), txt("b", 8)
        if not ev["a"] or not ev["b"]:
            return None
        ev["pa"], ev["pb"] = num("pa", 100_000), num("pb", 100_000)
        ev["vencedor"], ev["motivo"] = txt("vencedor", 8), txt("motivo", 20)
        ev["premio"] = num("premio", 100_000_000)
        ev["cacador"], ev["cacador_n"] = txt("cacador"), num("cacador_n", 100_000)
        ev["capturas_a"], ev["capturas_b"] = num("capturas_a", 10_000), num("capturas_b", 10_000)
    return ev


class PainelLoginView(discord.ui.View):
    """Botões do painel do canal de login (persistente: continua valendo depois de um reinício)."""

    def __init__(self, ponte: "Ponte") -> None:
        super().__init__(timeout=None)
        self.ponte = ponte
        self.vincular.label = textos.MC_BOTAO_VINCULAR
        self.conta.label = textos.MC_BOTAO_CONTA
        self.ajuda.label = textos.MC_BOTAO_AJUDA

    @discord.ui.button(custom_id="mc_login:vincular", style=discord.ButtonStyle.success, emoji="🔗")
    async def vincular(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await interaction.response.send_modal(VincularModal(self.ponte))

    @discord.ui.button(custom_id="mc_login:conta", style=discord.ButtonStyle.primary, emoji="👤")
    async def conta(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.ponte.responder_conta(interaction, interaction.user)

    @discord.ui.button(custom_id="mc_login:ajuda", style=discord.ButtonStyle.secondary, emoji="❓")
    async def ajuda(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await interaction.response.send_message(embed=embeds.montar_ajuda_login(), ephemeral=True)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)


class PainelIpView(discord.ui.View):
    """Botões de link do painel do ip-e-porta (abrem a página /entrar do site, que abre o Minecraft)."""

    def __init__(self) -> None:
        super().__init__(timeout=None)
        for texto, url in embeds.botoes_ip():
            self.add_item(discord.ui.Button(style=discord.ButtonStyle.link, label=texto, url=url, emoji="🎮"))


class VincularModal(discord.ui.Modal):
    def __init__(self, ponte: "Ponte") -> None:
        super().__init__(title=textos.MC_MODAL_TITULO)
        self.ponte = ponte
        self.codigo = discord.ui.TextInput(
            label=textos.MC_MODAL_CAMPO, placeholder=textos.MC_MODAL_DICA, min_length=4, max_length=12, required=True
        )
        self.add_item(self.codigo)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await self.ponte.responder_vinculo(interaction, str(self.codigo.value))


class Ponte(commands.Cog):
    grupo = app_commands.Group(name="minecraft", description="Ligue sua conta do Discord à do Minecraft.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self.token = os.getenv("MC_BRIDGE_TOKEN", "")
        self._runner: Optional[web.AppRunner] = None
        self._falhas: dict[int, list[float]] = {}  # tentativas erradas de código por pessoa
        self._ultimo_aviso_falha: dict[int, float] = {}
        self.status: Optional[dict[str, Any]] = None  # último status do servidor (online, max, ts)
        self._ip_publicado: Optional[str] = None  # o que está no painel do ip-e-porta agora (para só editar se mudar)
        self._trocas_contador: list[float] = []  # quando o nome do canal contador foi trocado (monotonic), só as da janela
        self._webhooks: dict[int, discord.Webhook] = {}  # webhook do chat-bridge por servidor (falar como o jogador)
        self._mexendo: dict[int, float] = {}  # pessoas cujo cargo Kitsune o próprio bot está mudando agora (monotonic até quando)
        self._tarefas: set[asyncio.Task] = set()  # tarefas soltas (atualizar painel e contador depois de um status)

    # ------------------------------------------------------------------ ciclo de vida do servidor HTTP
    def criar_app(self) -> web.Application:
        app = web.Application(client_max_size=64 * 1024, middlewares=[self._autenticar])
        app.add_routes(
            [
                web.get("/mc/saude", self.rota_saude),
                web.post("/mc/vinculo", self.rota_vinculo),
                web.post("/mc/sync", self.rota_sync),
                web.post("/mc/eventos", self.rota_eventos),
                web.post("/mc/status", self.rota_status),
                web.post("/mc/prox", self.rota_prox),
                web.get("/mc/chat", self.rota_chat),
                web.post("/pix/webhook", self.rota_pix),
            ]
        )
        return app

    async def cog_load(self) -> None:
        self.atualizar_paineis.start()
        self.vencer_kitsune.start()
        if not self.token:
            log.warning("MC_BRIDGE_TOKEN não definido: a ponte com o Minecraft não sobe (os comandos /minecraft seguem).")
            return
        porta = int(os.getenv("PORT", "8080") or 8080)
        self._runner = web.AppRunner(self.criar_app())
        await self._runner.setup()
        await web.TCPSite(self._runner, "0.0.0.0", porta).start()
        log.info("Ponte com o Minecraft ouvindo na porta %d", porta)

    async def cog_unload(self) -> None:
        self.atualizar_paineis.cancel()
        self.vencer_kitsune.cancel()
        if self._runner is not None:
            await self._runner.cleanup()
            self._runner = None

    def views_persistentes(self) -> list[discord.ui.View]:
        return [PainelLoginView(self)]

    # ------------------------------------------------------------------ utilidades
    def guild_id(self) -> Optional[int]:
        bruto = os.getenv("MC_GUILD_ID", "").strip()
        if bruto.isdigit():
            return int(bruto)
        if len(self.bot.guilds) == 1:
            return self.bot.guilds[0].id
        return None

    async def canal_mc(self, guild_id: int, chave: str) -> Optional[discord.abc.Messageable]:
        """Canal da ponte: o do /setup (canal_<chave>) ou o padrão de config.MC_CANAIS_PADRAO.

        "mc_log" é o registro de logins e vínculos para a staff: usa o canal de logs gerais do /setup (sem ele, não registra)."""
        if chave == "mc_log":
            chave = "logs_gerais"
            canal_id = await self.bot.banco.get_config_int(guild_id, "canal_logs_gerais")
            return await self._buscar_canal(canal_id)
        canal_id = await self.bot.banco.get_config_int(guild_id, f"canal_{chave}") or config.MC_CANAIS_PADRAO.get(chave)
        return await self._buscar_canal(canal_id)

    async def _buscar_canal(self, canal_id: Optional[int]) -> Optional[discord.abc.Messageable]:
        if not canal_id:
            return None
        canal = self.bot.get_channel(canal_id)
        if canal is None:
            try:
                canal = await self.bot.fetch_channel(canal_id)
            except discord.HTTPException:
                return None
        return canal if isinstance(canal, discord.abc.Messageable) else None

    async def _enviar(self, guild_id: int, chave: str, texto: Optional[str] = None, embed: Optional[discord.Embed] = None) -> bool:
        canal = await self.canal_mc(guild_id, chave)
        if canal is None:
            return False
        try:
            await canal.send(content=texto, embed=embed, allowed_mentions=discord.AllowedMentions.none())
            return True
        except discord.HTTPException:
            log.warning("Não consegui postar em %s", chave, exc_info=True)
            return False

    async def contexto_de(self, guild_id: int, nome_mc: str, com_perfil: bool = False) -> Contexto:
        """O que se sabe do jogador no Discord (a conta ligada pelo nome do jogo)."""
        vinculo = await self.bot.banco.mc_vinculo_por_nome(guild_id, nome_mc)
        if vinculo is None:
            return Contexto()
        guild = self.bot.get_guild(guild_id)
        membro = guild.get_member(vinculo["user_id"]) if guild else None
        ctx = Contexto(mencao=f"<@{vinculo['user_id']}>")
        selo = await self.bot.banco.mc_kitsune_de(guild_id, vinculo["user_id"])
        ctx.kitsune = selo is not None and self.kitsune_vale(bool(selo["ativo"]), int(selo["ate"]), int(time.time() * 1000))
        if membro is not None:
            ctx.discord_nome = membro.display_name
            ctx.avatar_url = membro.display_avatar.url
        if com_perfil:
            perfil = await self.bot.banco.obter_perfil(guild_id, vinculo["user_id"])
            ctx.nivel, ctx.saldo = nivel_por_xp(perfil["xp"])[0], perfil["saldo"]
        return ctx

    async def _webhook_do_chat(self, guild_id: int) -> Optional[discord.Webhook]:
        """Webhook do chat-bridge (cria na primeira vez): é ele que deixa a mensagem aparecer com o nome e a foto do jogador."""
        if guild_id in self._webhooks:
            return self._webhooks[guild_id]
        canal = await self.canal_mc(guild_id, "mc_chat")
        if not isinstance(canal, discord.TextChannel) or self.bot.user is None:
            return None
        try:
            for existente in await canal.webhooks():
                if existente.name == textos.MC_WEBHOOK_NOME and existente.user is not None and existente.user.id == self.bot.user.id and existente.token:
                    self._webhooks[guild_id] = existente
                    return existente
            criado = await canal.create_webhook(name=textos.MC_WEBHOOK_NOME, reason="Chat do Minecraft: mensagens com o nome e a foto do jogador")
        except discord.HTTPException:
            log.warning("Não consegui criar o webhook do chat-bridge (falta Gerenciar Webhooks?)", exc_info=True)
            return None
        self._webhooks[guild_id] = criado
        return criado

    @staticmethod
    def nome_de_exibicao(nome: str) -> str:
        """O Discord recusa nomes de webhook com "discord" ou "clyde" e exige de 1 a 80 letras: um espaço sem largura quebra a palavra."""
        limpo = nome.strip()[:80] or "?"
        for proibida in ("discord", "clyde", "everyone", "here"):
            achou = re.search(proibida, limpo, flags=re.IGNORECASE)
            while achou:
                i = achou.start() + 1
                limpo = limpo[:i] + "\u200b" + limpo[i:]
                achou = re.search(proibida, limpo, flags=re.IGNORECASE)
        return limpo if len(limpo) >= 2 else limpo + "\u200b"

    async def _falar_como_jogador(self, guild_id: int, ev: dict[str, Any], ctx: Contexto) -> bool:
        """Posta a mensagem do jogo como se a pessoa tivesse falado: nome do jogador e, se é Kitsune, a foto do Discord dela
        (os outros ganham uma cara cinza). Sem webhook ou se o Discord recusar, devolve False e a Kiza posta a linha normal."""
        webhook = await self._webhook_do_chat(guild_id)
        if webhook is None:
            return False
        avatar = ctx.avatar_url if ctx.kitsune and ctx.avatar_url else config.MC_AVATAR_PADRAO
        try:
            await webhook.send(
                content=discord.utils.escape_mentions(ev["texto"]),
                username=self.nome_de_exibicao(ev["nome"]),
                avatar_url=avatar,
                allowed_mentions=discord.AllowedMentions.none(),
            )
            return True
        except discord.NotFound:
            self._webhooks.pop(guild_id, None)  # apagaram o webhook: na próxima mensagem cria de novo
            return False
        except discord.HTTPException:
            log.warning("O webhook do chat-bridge recusou a mensagem de %s", ev["nome"], exc_info=True)
            return False

    @web.middleware
    async def _autenticar(self, request: web.Request, handler):  # type: ignore[no-untyped-def]
        if request.path == "/pix/webhook":  # o aviso do Mercado Pago não tem o nosso token: quem confere é o cog de apoio, na API
            return await handler(request)
        enviado = request.headers.get("Authorization", "")
        esperado = f"Bearer {self.token}"
        if not self.token or not hmac.compare_digest(enviado.encode(), esperado.encode()):
            return web.json_response({"ok": False, "erro": "nao_autorizado"}, status=401)
        return await handler(request)

    @staticmethod
    async def _json(request: web.Request) -> dict[str, Any]:
        try:
            corpo = await request.json()
        except Exception:
            raise web.HTTPBadRequest(text='{"ok": false, "erro": "json_invalido"}', content_type="application/json")
        if not isinstance(corpo, dict):
            raise web.HTTPBadRequest(text='{"ok": false, "erro": "json_invalido"}', content_type="application/json")
        return corpo

    @staticmethod
    def _jogador(corpo: dict[str, Any]) -> tuple[str, str]:
        mc_id = limpar_texto(corpo.get("id", ""), 64)
        nome = limpar_texto(corpo.get("nome", ""), 40)
        if not mc_id or not nome:
            raise web.HTTPBadRequest(text='{"ok": false, "erro": "jogador_invalido"}', content_type="application/json")
        return mc_id, nome

    # ------------------------------------------------------------------ rotas
    async def rota_saude(self, request: web.Request) -> web.Response:
        return web.json_response({"ok": True, "versao": config.VERSAO})

    async def rota_vinculo(self, request: web.Request) -> web.Response:
        corpo = await self._json(request)
        mc_id, nome = self._jogador(corpo)
        gid = self.guild_id()
        if gid is None:
            return web.json_response({"ok": False, "erro": "sem_servidor"}, status=503)
        banco = self.bot.banco
        vinculo = await banco.mc_vinculo_de_jogador(gid, mc_id, nome)
        if vinculo is not None:
            guild = self.bot.get_guild(gid)
            membro = guild.get_member(vinculo["user_id"]) if guild else None
            return web.json_response(
                {
                    "ok": True,
                    "vinculado": True,
                    "discord_id": str(vinculo["user_id"]),
                    "discord_nome": membro.display_name if membro else "",
                    # já houve sincronização desta pessoa: se o jogo perdeu a anotação, não pode fundir (somar) de novo
                    "ja_somou": await banco.mc_ja_sincronizou(gid, vinculo["user_id"]),
                }
            )
        codigo, expira = await banco.mc_criar_codigo(gid, mc_id, nome, VALIDADE_CODIGO, novo_codigo())
        return web.json_response({"ok": True, "vinculado": False, "codigo": codigo, "expira_em": expira})

    async def rota_prox(self, request: web.Request) -> web.Response:
        """Posições dos jogadores (chat de voz por proximidade). Responde na hora; o movimento nas calls acontece depois."""
        corpo = await self._json(request)
        gid = self.guild_id()
        if gid is None:
            return web.json_response({"ok": False, "erro": "sem_servidor"}, status=503)
        prox = self.bot.get_cog("Proximidade")
        if prox is None:
            return web.json_response({"ok": True, "ativo": False})
        pontos = validar_pontos(corpo)
        tarefa = asyncio.create_task(prox.processar(gid, pontos))
        self._tarefas.add(tarefa)
        tarefa.add_done_callback(self._tarefas.discard)
        return web.json_response({"ok": True, "ativo": True, "n": len(pontos)})

    async def rota_sync(self, request: web.Request) -> web.Response:
        corpo = await self._json(request)
        mc_id, nome = self._jogador(corpo)
        chave = limpar_texto(corpo.get("chave", ""), 64)
        d_caudas, d_xp = _inteiro(corpo.get("caudas")), _inteiro(corpo.get("xp"))
        if not chave or d_caudas is None or d_xp is None:
            return web.json_response({"ok": False, "erro": "dados_invalidos"}, status=400)
        gid = self.guild_id()
        if gid is None:
            return web.json_response({"ok": False, "erro": "sem_servidor"}, status=503)
        banco = self.bot.banco
        vinculo = await banco.mc_vinculo_de_jogador(gid, mc_id, nome)
        if vinculo is None:
            return web.json_response({"ok": False, "erro": "nao_vinculado"}, status=403)
        resultado = await banco.mc_aplicar_sync(gid, vinculo["user_id"], vinculo["mc_id"], chave, d_caudas, d_xp)
        if not resultado["repetido"] and d_xp > 0:
            await self._depois_do_xp(gid, vinculo["user_id"], resultado["xp_antes"], resultado["xp"])
        # Kitsune comprado por PIX: o jogo confirma o que já aplicou (kitsune_ok) e recebe o que ainda falta (kitsune_conceder)
        confirmados = corpo.get("kitsune_ok")
        if isinstance(confirmados, list):
            await banco.pg_jogo_ok(gid, vinculo["user_id"], [i for i in confirmados if isinstance(i, int) and not isinstance(i, bool)])
        agora_ms = int(time.time() * 1000)
        pendentes = await banco.pg_kitsune_pendentes_jogo(gid, vinculo["user_id"])
        conceder = [{"id": int(c["id"]), "ate": int(c["kitsune_ate"])} for c in pendentes if int(c["kitsune_ate"]) > agora_ms]
        vencidas = [int(c["id"]) for c in pendentes if int(c["kitsune_ate"]) <= agora_ms]  # acabou antes de o jogo saber: nada a dar
        if vencidas:
            await banco.pg_jogo_ok(gid, vinculo["user_id"], vencidas)
        estado = self._selo_do_corpo(corpo.get("kitsune"))
        if estado is not None and not conceder:  # com compra por entregar, o selo que o jogo conta ainda está velho
            await self.receber_kitsune(gid, vinculo["user_id"], vinculo["mc_nome"], *estado)
        resposta: dict[str, Any] = {"ok": True, "saldo": resultado["saldo"], "xp": resultado["xp"]}
        if conceder:
            resposta["kitsune_conceder"] = conceder
        return web.json_response(resposta)

    async def rota_pix(self, request: web.Request) -> web.Response:
        """Aviso do Mercado Pago ("pagamento mudou"). Não credita nada por conta própria: manda o cog de apoio conferir na API."""
        apoio = self.bot.get_cog("Apoio")
        if apoio is None:
            return web.json_response({"ok": False, "erro": "apoio_desligado"}, status=503)
        try:
            corpo = await request.json()
        except Exception:
            corpo = {}
        if not isinstance(corpo, dict):
            corpo = {}
        dados = corpo.get("data")
        data_id = str((dados.get("id") if isinstance(dados, dict) else None) or request.query.get("data.id") or request.query.get("id") or "")
        segredo = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "").strip()
        if segredo and not assinatura_valida(segredo, request.headers.get("x-signature", ""), request.headers.get("x-request-id", ""), data_id):
            return web.json_response({"ok": False, "erro": "assinatura"}, status=401)
        tipo = str(corpo.get("type") or request.query.get("topic") or request.query.get("type") or "payment")
        if tipo not in {"payment", "order"} or not re.fullmatch(r"[A-Za-z0-9]{4,40}", data_id):
            return web.json_response({"ok": True})
        tarefa = asyncio.create_task(apoio.processar_webhook(data_id))  # type: ignore[attr-defined]
        self._tarefas.add(tarefa)
        tarefa.add_done_callback(self._tarefas.discard)
        return web.json_response({"ok": True})

    async def rota_eventos(self, request: web.Request) -> web.Response:
        corpo = await self._json(request)
        eventos = corpo.get("eventos")
        if not isinstance(eventos, list):
            return web.json_response({"ok": False, "erro": "dados_invalidos"}, status=400)
        gid = self.guild_id()
        if gid is None:
            return web.json_response({"ok": False, "erro": "sem_servidor"}, status=503)
        if await self.canal_mc(gid, "mc_chat") is None:
            return web.json_response({"ok": False, "erro": "sem_canal"}, status=503)
        enviados = 0
        for bruto in eventos[:LIMITE_EVENTOS]:
            ev = validar_evento(bruto)
            if ev is None:
                continue
            ctx = await self.contexto_de(gid, ev["nome"], com_perfil=ev["t"] == "entrada") if "nome" in ev else Contexto()
            if ev["t"] == "msg" and await self._falar_como_jogador(gid, ev, ctx):
                enviados += 1
                continue
            for chave, texto, embed in embeds.montar_evento(ev, ctx):
                if await self._enviar(gid, chave, texto, embed):
                    enviados += 1
        return web.json_response({"ok": True, "enviados": enviados})

    async def rota_status(self, request: web.Request) -> web.Response:
        corpo = await self._json(request)
        online = corpo.get("online")
        if not isinstance(online, list):
            return web.json_response({"ok": False, "erro": "dados_invalidos"}, status=400)
        nomes = [n for n in (limpar_texto(x, 40) for x in online[:50]) if n]
        maximo = _inteiro(corpo.get("max"), 1000) or config.MC_MAX_JOGADORES
        anterior = self.status
        self.status = {"online": nomes, "max": maximo, "ts": time.time()}
        mudou = anterior is None or anterior.get("online") != nomes or anterior.get("max") != maximo
        gid = self.guild_id()
        if gid is not None:
            await self.bot.banco.set_config(gid, "mc_status", json.dumps(self.status))
        await self._kitsunes_do_status(gid, corpo.get("kitsunes"))
        if mudou:
            self._depois_do_status()
        return web.json_response({"ok": True})

    async def rota_chat(self, request: web.Request) -> web.Response:
        gid = self.guild_id()
        if gid is None:
            return web.json_response({"ok": False, "erro": "sem_servidor"}, status=503)
        try:
            desde = int(request.query.get("desde", "-1"))
        except ValueError:
            return web.json_response({"ok": False, "erro": "dados_invalidos"}, status=400)
        banco = self.bot.banco
        if desde < 0:  # primeira consulta depois de ligar: só pega o marcador, sem repetir o passado
            return web.json_response({"ok": True, "ultimo": await banco.mc_chat_ultimo(gid), "mensagens": []})
        mensagens = await banco.mc_chat_desde(gid, desde, 10)
        ultimo = mensagens[-1]["id"] if mensagens else desde
        return web.json_response({"ok": True, "ultimo": ultimo, "mensagens": mensagens})

    # ------------------------------------------------------------------ nível subiu pelo jogo: cargos e prêmio como no Discord
    async def _depois_do_xp(self, guild_id: int, user_id: int, antes: int, depois: int) -> None:
        nivel_antes, nivel_depois = nivel_por_xp(antes)[0], nivel_por_xp(depois)[0]
        if nivel_depois <= nivel_antes:
            return
        guild = self.bot.get_guild(guild_id)
        membro = guild.get_member(user_id) if guild else None
        cog = self.bot.get_cog("XP")
        if membro is None or cog is None:
            return
        try:
            await cog.aplicar_cargo_nivel(membro, nivel_depois)  # type: ignore[attr-defined]
            await cog.premiar_niveis(membro, nivel_antes, nivel_depois)  # type: ignore[attr-defined]
        except Exception:
            log.exception("Não apliquei o nível vindo do Minecraft")

    # ------------------------------------------------------------------ chat do Discord para o jogo
    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.author.bot or mensagem.guild is None or mensagem.guild.id != self.guild_id():
            return
        canal_id = await self.bot.banco.get_config_int(mensagem.guild.id, "canal_mc_chat") or config.MC_CANAIS_PADRAO["mc_chat"]
        if mensagem.channel.id != canal_id:
            return
        texto = limpar_texto(mensagem.clean_content, MAX_TEXTO_DISCORD)
        if mensagem.attachments:
            texto = f"{texto} {textos.MC_MSG_DISCORD_ANEXO}".strip()
        if not texto:
            return
        nome = limpar_texto(getattr(mensagem.author, "display_name", mensagem.author.name), 32) or mensagem.author.name
        await self.bot.banco.mc_chat_enfileirar(mensagem.guild.id, nome, texto)

    # ------------------------------------------------------------------ vínculo (comando e botão usam o mesmo caminho)
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    def _bloqueado(self, user_id: int) -> bool:
        agora = time.monotonic()
        recentes = [t for t in self._falhas.get(user_id, []) if agora - t < 600]
        self._falhas[user_id] = recentes
        return len(recentes) >= 5

    async def _ctx_membro(self, guild_id: int, membro: discord.abc.User) -> Contexto:
        return Contexto(
            mencao=f"<@{membro.id}>",
            discord_nome=getattr(membro, "display_name", membro.name),
            avatar_url=membro.display_avatar.url,
        )

    async def vincular_conta(self, guild: discord.Guild, membro: discord.Member, codigo: str) -> tuple[str, Optional[str]]:
        """Tenta ligar a conta com o código. Devolve (resultado, nome do jogador) e avisa o canal de login."""
        if self._bloqueado(membro.id):
            return "muitas", None
        resultado, nome = await self.bot.banco.mc_vincular(guild.id, membro.id, codigo)
        ctx = await self._ctx_membro(guild.id, membro)
        if resultado == "ok":
            await self._enviar(guild.id, "mc_log", embed=embeds.montar_vinculado(nome or "", ctx))
        elif resultado == "codigo_invalido":
            self._falhas.setdefault(membro.id, []).append(time.monotonic())
            agora = time.monotonic()
            if agora - self._ultimo_aviso_falha.get(membro.id, -1e9) >= TEMPO_FALHA_CODIGO:
                self._ultimo_aviso_falha[membro.id] = agora
                await self._enviar(guild.id, "mc_log", embed=embeds.montar_codigo_recusado(ctx))
        return resultado, nome

    async def responder_vinculo(self, interaction: discord.Interaction, codigo: str) -> None:
        guild, membro = interaction.guild, interaction.user
        assert guild is not None
        resultado, nome = await self.vincular_conta(guild, membro, codigo)
        n = discord.utils.escape_markdown(nome or "")
        if resultado == "ok":
            e = discord.Embed(title=textos.MC_OK_TITULO, description=textos.MC_VINCULO_OK.format(nome=n), color=config.COR_OK)
        else:
            texto = {
                "muitas": textos.MC_VINCULO_MUITAS,
                "codigo_invalido": textos.MC_VINCULO_INVALIDO,
                "ja_vinculado": textos.MC_VINCULO_JA.format(nome=n),
                "conta_em_uso": textos.MC_VINCULO_EM_USO.format(nome=n),
            }[resultado]
            e = discord.Embed(title=textos.MC_ERRO_TITULO, description=texto, color=config.COR_ERRO)
        await responder(interaction, embed=e, ephemeral=True)

    async def responder_conta(self, interaction: discord.Interaction, alvo: discord.abc.User) -> None:
        guild = interaction.guild
        assert guild is not None
        vinculo = await self.bot.banco.mc_vinculo_de_usuario(guild.id, alvo.id)
        if vinculo is None:
            if alvo.id == interaction.user.id:
                e = discord.Embed(title=textos.MC_CONTA_SEM_TITULO, description=textos.MC_CONTA_SEM_DESC, color=config.COR_AVISO)
            else:
                e = discord.Embed(description=textos.MC_CONTA_NENHUMA.format(alvo=f"<@{alvo.id}>"), color=config.COR_AVISO)
            await responder(interaction, embed=e, ephemeral=True)
            return
        perfil = await self.bot.banco.obter_perfil(guild.id, alvo.id)
        nivel = nivel_por_xp(perfil["xp"])[0]
        e = discord.Embed(title=textos.MC_CONTA_TITULO, color=config.COR_PRINCIPAL)
        e.description = textos.MC_CONTA_CORPO.format(
            alvo=f"<@{alvo.id}>",
            nome=discord.utils.escape_markdown(vinculo["mc_nome"]),
            nivel=nivel,
            saldo=formatar_moeda(perfil["saldo"]),
            xp=formatar_numero(perfil["xp"]),
        )
        e.set_thumbnail(url=alvo.display_avatar.url)
        await responder(interaction, embed=e, ephemeral=True)

    # ------------------------------------------------------------------ comandos
    @grupo.command(name="vincular", description="Ligue sua conta do Minecraft com o código que aparece na tela do jogo.")
    @app_commands.describe(codigo="O código de 6 letras que aparece na tela preta do jogo")
    @app_commands.checks.cooldown(1, 3.0)
    async def vincular(self, interaction: discord.Interaction, codigo: str) -> None:
        await self.responder_vinculo(interaction, codigo)

    @app_commands.command(name="online", description="Mostra quem está jogando Minecraft agora.")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 10.0)
    async def online(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        if self.status is None:
            bruto = await self.bot.banco.get_config(guild.id, "mc_status")
            try:
                self.status = json.loads(bruto) if bruto else None
            except ValueError:
                self.status = None
        mencoes: dict[str, str] = {}
        if embeds.status_online(self.status, time.time()) and self.status is not None:
            for nome in self.status.get("online", []):
                vinculo = await self.bot.banco.mc_vinculo_por_nome(guild.id, nome)
                if vinculo is not None:
                    mencoes[nome] = f"<@{vinculo['user_id']}>"
        await interaction.response.send_message(
            embed=embeds.montar_online(self.status, time.time(), mencoes), allowed_mentions=discord.AllowedMentions.none()
        )

    @grupo.command(name="conta", description="Mostra a conta do Minecraft ligada à sua (ou à de outra pessoa).")
    @app_commands.describe(membro="Quem (deixe em branco para ver a sua)")
    async def conta(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None) -> None:
        await self.responder_conta(interaction, membro or interaction.user)

    @grupo.command(name="desvincular", description="(Staff) Desliga a conta do Minecraft de alguém. O saldo e o XP ficam no Discord.")
    @app_commands.describe(membro="Quem")
    @exigir_nivel(config.NIVEL_STAFF)
    async def desvincular(self, interaction: discord.Interaction, membro: discord.Member) -> None:
        guild = interaction.guild
        assert guild is not None
        nome = await self.bot.banco.mc_desvincular(guild.id, membro.id)
        if nome is None:
            await responder(interaction, textos.MC_DESVINCULO_NADA.format(alvo=membro.mention), ephemeral=True)
            return
        log.info("%s desvinculou %s (%s)", interaction.user, membro, nome)
        ctx = await self._ctx_membro(guild.id, membro)
        await self._enviar(guild.id, "mc_log", embed=embeds.montar_desvinculado(nome, ctx, interaction.user.mention))
        await responder(
            interaction,
            textos.MC_DESVINCULO_OK.format(alvo=membro.mention, nome=discord.utils.escape_markdown(nome)),
            ephemeral=True,
        )

    @grupo.command(name="painel", description="(Admin) Publica de novo os painéis do ip-e-porta e do login.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def painel(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        ok = await self.garantir_paineis(forcar=True)
        await interaction.followup.send("Painéis atualizados. 🦊" if ok else "Não consegui publicar os painéis (confira os canais e minhas permissões).", ephemeral=True)

    # ------------------------------------------------------------------ Kitsune: o jogo manda, o cargo do Discord só espelha
    @staticmethod
    def _selo_do_corpo(bruto: Any) -> Optional[tuple[bool, int]]:
        """Lê {ativo, ate} que o jogo manda no sync. None se não veio ou veio estranho (nunca mexe no cargo por engano)."""
        if not isinstance(bruto, dict) or not isinstance(bruto.get("ativo"), bool):
            return None
        ate = bruto.get("ate", 0)
        if isinstance(ate, bool) or not isinstance(ate, (int, float)) or ate != ate or ate < 0 or ate > 4_000_000_000_000:
            return None
        return bruto["ativo"], int(ate)

    async def cargo_kitsune_id(self, guild_id: int) -> int:
        return await self.bot.banco.get_config_int(guild_id, "cargo_kitsune") or config.CARGO_KITSUNE_PADRAO

    @staticmethod
    def kitsune_vale(ativo: bool, ate: int, agora_ms: int) -> bool:
        """O selo vale agora? (tem no jogo e, se tem prazo, ainda não passou)"""
        return bool(ativo) and (ate == 0 or ate > agora_ms)

    async def _cargo_kitsune(self, guild: discord.Guild, membro: discord.Member, desejado: bool, motivo: str) -> bool:
        """Põe ou tira o cargo Kitsune para ele ficar como o jogo manda. True se mudou."""
        cargo = guild.get_role(await self.cargo_kitsune_id(guild.id))
        if cargo is None:
            log.warning("Cargo Kitsune não encontrado no servidor %s", guild.id)
            return False
        tem = cargo in membro.roles
        if tem == desejado:
            return False
        self._mexendo[membro.id] = time.monotonic() + 15
        try:
            if desejado:
                await membro.add_roles(cargo, reason=motivo)
            else:
                await membro.remove_roles(cargo, reason=motivo)
        except discord.HTTPException:
            log.warning("Não consegui mexer no cargo Kitsune de %s", membro, exc_info=True)
            return False
        return True

    async def receber_kitsune(self, guild_id: int, user_id: int, nome_mc: str, ativo: bool, ate: int) -> None:
        """O jogo disse como está o selo Kitsune da pessoa: guarda, ajusta o cargo e avisa quando mudou."""
        agora_ms = int(time.time() * 1000)
        desejado = self.kitsune_vale(ativo, ate, agora_ms)  # o que fica guardado já vale "agora": selo com prazo vencido é inativo
        antes, _depois = await self.bot.banco.mc_kitsune_registrar(guild_id, user_id, desejado, ate)
        tinha = antes is not None and bool(antes["ativo"])
        guild = self.bot.get_guild(guild_id)
        membro = guild.get_member(user_id) if guild else None
        if guild is not None and membro is not None:
            await self._cargo_kitsune(guild, membro, desejado, "Kitsune do Minecraft")
        if desejado == tinha:
            return
        ctx = await self.contexto_de(guild_id, nome_mc)
        if desejado:
            await self._enviar(guild_id, "mc_historico", embed=embeds.montar_kitsune_dado(nome_mc, ctx, ate))
        else:
            expirou = ate > 0 and ate <= agora_ms
            await self._enviar(guild_id, "mc_historico", embed=embeds.montar_kitsune_fim(nome_mc, ctx, expirou))

    async def _kitsunes_do_status(self, guild_id: Optional[int], bruto: Any) -> None:
        """O jogo manda, junto do status, quem tem selo com prazo (também quem está offline): ajusta o cargo de quem ligou a conta."""
        if guild_id is None or not isinstance(bruto, list):
            return
        for item in bruto[:100]:
            if not isinstance(item, dict):
                continue
            nome = limpar_texto(item.get("nome", ""), 40)
            ate = _inteiro(item.get("ate"), 4_000_000_000_000)
            if not nome or ate is None or ate <= 0:
                continue
            vinculo = await self.bot.banco.mc_vinculo_por_nome(guild_id, nome)
            if vinculo is None:
                continue
            atual = await self.bot.banco.mc_kitsune_de(guild_id, vinculo["user_id"])
            if atual is not None and bool(atual["ativo"]) and int(atual["ate"]) == ate:
                continue  # nada mudou: não mexe
            await self.receber_kitsune(guild_id, vinculo["user_id"], vinculo["mc_nome"], True, ate)

    @tasks.loop(minutes=5)
    async def vencer_kitsune(self) -> None:
        """Selos com prazo que passaram: tira o cargo (o jogo também tira o dele; aqui vale mesmo se a pessoa estiver offline)."""
        try:
            for linha in await self.bot.banco.mc_kitsune_vencidos(int(time.time() * 1000)):
                vinculo = await self.bot.banco.mc_vinculo_de_usuario(linha["guild_id"], linha["user_id"])
                atual = await self.bot.banco.mc_kitsune_de(linha["guild_id"], linha["user_id"])
                nome = vinculo["mc_nome"] if vinculo is not None else "?"
                await self.receber_kitsune(linha["guild_id"], linha["user_id"], nome, False, int(atual["ate"]) if atual else 0)
        except Exception:
            log.exception("Erro ao vencer selos Kitsune")

    @vencer_kitsune.before_loop
    async def _antes_de_vencer(self) -> None:
        await self.bot.wait_until_ready()

    @commands.Cog.listener()
    async def on_member_update(self, antes: discord.Member, depois: discord.Member) -> None:
        """Mexeram no cargo Kitsune na mão? Para quem tem conta ligada e estado conhecido do jogo, ele volta ao que o jogo manda."""
        if depois.guild.id != self.guild_id():
            return
        cargo_id = await self.cargo_kitsune_id(depois.guild.id)
        tinha, tem = antes.get_role(cargo_id) is not None, depois.get_role(cargo_id) is not None
        if tinha == tem or time.monotonic() < self._mexendo.get(depois.id, 0.0):
            return
        estado = await self.bot.banco.mc_kitsune_de(depois.guild.id, depois.id)
        if estado is None:
            return  # o jogo ainda não disse nada sobre essa pessoa: não mexe
        desejado = self.kitsune_vale(bool(estado["ativo"]), int(estado["ate"]), int(time.time() * 1000))
        if tem != desejado and await self._cargo_kitsune(depois.guild, depois, desejado, "Kitsune só pelo jogo: voltei ao que o servidor manda"):
            log.info("Cargo Kitsune de %s voltou ao que o jogo manda (%s)", depois, "tem" if desejado else "não tem")

    @grupo.command(name="kitsune", description="(Staff) Mostra quem é Kitsune pelo jogo e quem tem o cargo sem o selo.")
    @exigir_nivel(config.NIVEL_STAFF)
    async def kitsune(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        agora_ms = int(time.time() * 1000)
        nomes = {linha["user_id"]: linha["mc_nome"] for linha in await banco.mc_vinculos_lista(guild.id)}
        com: list[str] = []
        ativos: set[int] = set()
        for linha in await banco.mc_kitsune_lista(guild.id):
            if self.kitsune_vale(bool(linha["ativo"]), int(linha["ate"]), agora_ms):
                ativos.add(linha["user_id"])
                prazo = embeds.texto_prazo(int(linha["ate"]), com_articulo=False)
                com.append(textos.MC_KITSUNE_CMD_LINHA.format(mencao=f"<@{linha['user_id']}>", mc=discord.utils.escape_markdown(nomes.get(linha["user_id"], "?")), prazo=prazo))
        so_cargo: list[str] = []
        cargo = guild.get_role(await self.cargo_kitsune_id(guild.id))
        for membro in (cargo.members if cargo else []):
            if membro.id in ativos:
                continue
            if membro.id in nomes:
                situacao = textos.MC_KITSUNE_CMD_SEM_SELO.format(mc=discord.utils.escape_markdown(nomes[membro.id]))
            else:
                situacao = textos.MC_KITSUNE_CMD_SEM_CONTA
            so_cargo.append(textos.MC_KITSUNE_CMD_SO_CARGO_LINHA.format(mencao=membro.mention, situacao=situacao))

        def bloco(linhas: list[str]) -> str:
            texto = "\n".join(linhas[:15]) if linhas else textos.MC_KITSUNE_CMD_NADA
            if len(linhas) > 15:
                texto += f"\n… e mais {len(linhas) - 15}"
            return texto[:1024]

        e = discord.Embed(title=textos.MC_KITSUNE_CMD_TITULO, color=config.COR_PRINCIPAL)
        e.add_field(name=textos.MC_KITSUNE_CMD_COM.format(n=len(com)), value=bloco(com), inline=False)
        e.add_field(name=textos.MC_KITSUNE_CMD_SO_CARGO.format(n=len(so_cargo)), value=bloco(so_cargo), inline=False)
        e.set_footer(text=textos.MC_KITSUNE_CMD_RODAPE)
        await responder(interaction, embed=e, ephemeral=True)

    # ------------------------------------------------------------------ painéis (ip-e-porta e log-in)
    async def _mencao_canal(self, guild_id: int, chave: str, padrao: str) -> str:
        canal_id = await self.bot.banco.get_config_int(guild_id, f"canal_{chave}") or config.MC_CANAIS_PADRAO.get(chave)
        return f"<#{canal_id}>" if canal_id else padrao

    async def garantir_paineis(self, forcar: bool = False) -> bool:
        """Publica (ou edita) os dois painéis. Só mexe se o conteúdo mudou, a não ser que `forcar`."""
        gid = self.guild_id()
        guild = self.bot.get_guild(gid) if gid else None
        if guild is None:
            return False
        if self.status is None:
            bruto = await self.bot.banco.get_config(guild.id, "mc_status")
            if bruto:
                try:
                    self.status = json.loads(bruto)
                except ValueError:
                    self.status = None
        feito = True
        # ip-e-porta
        canal_ip = await self.canal_mc(guild.id, "mc_ip")
        if isinstance(canal_ip, discord.TextChannel):
            arquivo = arquivo_banner("ip")  # a arte do painel (assets/banners/ip.webp) vai dentro do próprio embed
            e = embeds.montar_painel_ip(
                self.status,
                time.time(),
                await self._mencao_canal(guild.id, "mc_login", "#log-in"),
                arquivo.filename if arquivo else None,
            )
            assinatura = json.dumps(e.to_dict(), sort_keys=True)
            if forcar or assinatura != self._ip_publicado:
                try:
                    await publicar_ou_editar(
                        self.bot, guild, canal_ip, "mc_ip", embeds=[e], arquivos=[arquivo] if arquivo else None, view=PainelIpView()
                    )
                    self._ip_publicado = assinatura
                except discord.HTTPException:
                    log.warning("Falha ao publicar o painel do ip-e-porta", exc_info=True)
                    feito = False
        else:
            feito = False
        # log-in (só republica se forçado ou se ainda não existe: o texto não muda sozinho)
        canal_login = await self.canal_mc(guild.id, "mc_login")
        if isinstance(canal_login, discord.TextChannel):
            ja_existe = await self.bot.banco.get_config_int(guild.id, "msg_mc_login")
            if forcar or not ja_existe:
                try:
                    e = embeds.montar_painel_login(await self._mencao_canal(guild.id, "mc_chat", "#chat-bridge"))
                    await publicar_ou_editar(self.bot, guild, canal_login, "mc_login", embeds=[e], view=PainelLoginView(self))
                except discord.HTTPException:
                    log.warning("Falha ao publicar o painel de login", exc_info=True)
                    feito = False
        else:
            feito = False
        await self._limpar_canal_login(canal_login)
        return feito

    async def atualizar_contador(self, agora: Optional[float] = None, relogio: Optional[float] = None) -> bool:
        """Põe no nome do canal contador quantas pessoas jogam ("🟢 Online | (2) 🦊"). True se trocou o nome.

        O Discord só deixa renomear um canal 2 vezes a cada 10 minutos: usa uma janela deslizante (MC_CONTADOR_LIMITE trocas em
        MC_CONTADOR_JANELA segundos). Quase sempre a troca é imediata; se a janela encheu, a mudança espera a próxima rodada."""
        gid = self.guild_id()
        canal = await self.canal_mc(gid, "mc_online") if gid is not None else None
        if canal is None or not hasattr(canal, "edit"):
            return False
        desejado = embeds.nome_canal_online(self.status, time.time() if agora is None else agora)
        if getattr(canal, "name", None) == desejado:
            return False
        relogio = time.monotonic() if relogio is None else relogio
        self._trocas_contador = [t for t in self._trocas_contador if relogio - t < config.MC_CONTADOR_JANELA]
        if len(self._trocas_contador) >= config.MC_CONTADOR_LIMITE:
            return False
        self._trocas_contador.append(relogio)  # conta já: se falhar, o limite do Discord pode ter estourado e não insistimos
        try:
            await canal.edit(name=desejado, reason="Contador de jogadores do Minecraft")  # type: ignore[attr-defined]
        except discord.HTTPException:
            log.warning("Não consegui renomear o canal contador", exc_info=True)
            return False
        return True

    def _depois_do_status(self) -> None:
        """O jogo acabou de mandar o status: atualiza o contador e o painel na hora, sem esperar a próxima rodada."""

        async def atualizar() -> None:
            try:
                await self.atualizar_contador()
                await self.garantir_paineis()
            except Exception:
                log.exception("Erro ao atualizar o contador depois do status")

        tarefa = asyncio.get_running_loop().create_task(atualizar())
        self._tarefas.add(tarefa)
        tarefa.add_done_callback(self._tarefas.discard)

    async def _limpar_canal_login(self, canal: Optional[discord.abc.Messageable]) -> None:
        """Uma vez só: apaga do canal de login os registros que o bot postou antes (ele fica só com o painel)."""
        gid = self.guild_id()
        if gid is None or not isinstance(canal, discord.TextChannel) or await self.bot.banco.get_config(gid, "mc_login_limpo") == "1":
            return
        painel_id = await self.bot.banco.get_config_int(gid, "msg_mc_login")
        if not painel_id:
            return  # o painel ainda não existe: nada seguro para preservar
        titulos = {textos.MC_LOGIN_ENTROU_TITULO, textos.MC_LOGIN_SAIU_TITULO, textos.MC_LOGIN_VINCULADO_TITULO, textos.MC_LOGIN_DESVINCULADO_TITULO, textos.MC_LOGIN_FALHA_TITULO}
        try:
            async for msg in canal.history(limit=200):
                if self.bot.user is None or msg.author.id != self.bot.user.id or msg.id == painel_id:
                    continue
                if any(e.title in titulos for e in msg.embeds):
                    await msg.delete()
            await self.bot.banco.set_config(gid, "mc_login_limpo", "1")
        except discord.HTTPException:
            log.warning("Não consegui limpar o canal de login", exc_info=True)

    @tasks.loop(seconds=60)
    async def atualizar_paineis(self) -> None:
        try:
            await self.garantir_paineis()
            await self.atualizar_contador()
        except Exception:
            log.exception("Erro ao atualizar os painéis do Minecraft")

    @atualizar_paineis.before_loop
    async def _antes_dos_paineis(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Ponte(bot))
