"""Mimos dos Kitsunes no Discord (todos só de estilo e conveniência, nada que dê vantagem no jogo):

* **Toca Kitsune**: categoria só dos Kitsunes, com um chat e uma sala "➕ Criar sala Kitsune": entrar nela cria uma sala de voz só sua
  (com o nome e o limite que você escolher em `/sala`), que some quando esvazia.
* **Votações leves**: a staff abre uma votação com até 5 opções e só Kitsunes votam (um voto, que dá para trocar até o fim).
* **Mural dos Kitsunes**: mensagem fixa com quem apoia a toca (cada pessoa pode sair do mural) e um agradecimento no 1º dia de cada mês.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import TZ, barra_progresso, canal_da_funcao, embed, publicar_ou_editar
from utils.permissoes import checar_membro, exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.kitsune_extras")
NOME_CATEGORIA = "🦊 Toca Kitsune"
NOME_CHAT = "🦊・kitsunes"
NOME_CRIADOR = "➕ Criar sala Kitsune"
PREFIXO_SALA = "🦊 "
VAZIA_ATE_APAGAR = 20.0
MAX_OPCOES = 5
MAX_NOME_SALA = 40
MURAL_MAX_NOMES = 60


# ------------------------------------------------------------------ funções puras (testáveis)
def nome_de_sala_valido(texto: str) -> Optional[str]:
    """Nome limpo para a sala de voz (sem menções, sem quebra de linha, até 40 letras), ou None se não sobrou nada."""
    limpo = " ".join(texto.replace("@", "").replace("#", "").split())[:MAX_NOME_SALA].strip()
    return limpo or None


def opcoes_da_votacao(bruto: str) -> list[str]:
    """'Sim; Não; Talvez' -> ['Sim', 'Não', 'Talvez']. Cada opção até 60 letras, sem repetir, de 2 a 5."""
    vistas, saida = set(), []
    for parte in bruto.split(";"):
        op = " ".join(parte.split())[:60]
        if op and op.casefold() not in vistas:
            vistas.add(op.casefold())
            saida.append(op)
    return saida


def embed_votacao(titulo: str, opcoes: list[str], contagem: dict[int, int], encerra_em: int, encerrada: bool) -> discord.Embed:
    total = sum(contagem.values())
    linhas = []
    for i, op in enumerate(opcoes):
        n = contagem.get(i, 0)
        pct = (n / total) if total else 0.0
        linhas.append(f"**{op}**\n{barra_progresso(n, total, 12)} {n} voto(s) · {round(pct * 100)}%")
    topo = textos.VOTACAO_ENCERRADA if encerrada else textos.VOTACAO_ABERTA.format(quando=f"<t:{encerra_em}:R>")
    e = embed(textos.VOTACAO_TITULO.format(titulo=titulo), topo + "\n\n" + "\n\n".join(linhas), config.COR_INFO if encerrada else config.COR_PRINCIPAL)
    e.set_footer(text=textos.VOTACAO_RODAPE.format(total=total))
    return e


def nomes_do_mural(nomes: list[str]) -> str:
    """Lista de nomes do mural, cortada para caber ('e mais N')."""
    if not nomes:
        return textos.MURAL_VAZIO
    mostra = nomes[:MURAL_MAX_NOMES]
    texto = " · ".join(f"🦊 {n}" for n in mostra)
    if len(nomes) > len(mostra):
        texto += textos.MURAL_E_MAIS.format(n=len(nomes) - len(mostra))
    return texto


# ------------------------------------------------------------------ botão de voto (sobrevive a reinício)
class BotaoVoto(discord.ui.DynamicItem[discord.ui.Button], template=r"kiza:voto:(?P<vid>\d+):(?P<i>\d+)"):
    def __init__(self, vid: int, i: int, rotulo: str = "") -> None:
        super().__init__(discord.ui.Button(label=(rotulo or f"Opção {i + 1}")[:80], style=discord.ButtonStyle.primary, custom_id=f"kiza:voto:{vid}:{i}"))
        self.vid, self.i = vid, i

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item: discord.ui.Button, match) -> "BotaoVoto":  # type: ignore[override]
        return cls(int(match["vid"]), int(match["i"]), item.label or "")

    async def callback(self, interaction: discord.Interaction) -> None:
        cog = interaction.client.get_cog("KitsuneExtras")  # type: ignore[attr-defined]
        if cog is not None:
            await cog.votar(interaction, self.vid, self.i)


def view_votacao(vid: int, opcoes: list[str], desligada: bool = False) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    for i, op in enumerate(opcoes):
        item = BotaoVoto(vid, i, op)
        item.item.disabled = desligada
        view.add_item(item)
    return view


class KitsuneExtras(commands.Cog):
    sala = app_commands.Group(name="sala", description="Sua sala de voz Kitsune.", guild_only=True)
    votacao = app_commands.Group(name="votacao", description="Votações dos Kitsunes.", guild_only=True)
    mural = app_commands.Group(name="mural", description="Mural dos Kitsunes.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._vazia_desde: dict[int, float] = {}
        self._mural_assinatura: dict[int, str] = {}

    async def cog_load(self) -> None:
        self.bot.add_dynamic_items(BotaoVoto)
        self.faxina.start()
        self.encerrar_votacoes.start()
        self.mural_automatico.start()

    async def cog_unload(self) -> None:
        for t in (self.faxina, self.encerrar_votacoes, self.mural_automatico):
            t.cancel()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # ------------------------------------------------------------------ quem é Kitsune
    async def cargo_kitsune(self, guild: discord.Guild) -> Optional[discord.Role]:
        cargo_id = await self.bot.banco.get_config_int(guild.id, "cargo_kitsune") or config.CARGO_KITSUNE_PADRAO
        return guild.get_role(cargo_id)

    async def eh_kitsune(self, membro: discord.Member) -> bool:
        cargo = await self.cargo_kitsune(membro.guild)
        return cargo is not None and cargo in membro.roles

    # ================================================================== Toca Kitsune (sala de voz)
    async def _ids(self, guild_id: int) -> tuple[Optional[int], Optional[int], Optional[int]]:
        banco = self.bot.banco
        return (
            await banco.get_config_int(guild_id, "kitsune_categoria"),
            await banco.get_config_int(guild_id, "kitsune_criador"),
            await banco.get_config_int(guild_id, "kitsune_chat"),
        )

    @sala.command(name="configurar", description="(Admin) Cria a Toca Kitsune: categoria só dos Kitsunes, chat e sala para criar salas.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def configurar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        cargo = await self.cargo_kitsune(guild)
        if cargo is None:
            await interaction.response.send_message(textos.SALA_SEM_CARGO, ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        banco = self.bot.banco
        cat_id, criador_id, chat_id = await self._ids(guild.id)
        regras = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False, connect=False),
            cargo: discord.PermissionOverwrite(view_channel=True, connect=True, speak=True, send_messages=True),
        }
        try:
            categoria = guild.get_channel(cat_id) if cat_id else None
            if not isinstance(categoria, discord.CategoryChannel):
                categoria = await guild.create_category(NOME_CATEGORIA, overwrites=regras, reason="Kiza: Toca Kitsune")
                await banco.set_config(guild.id, "kitsune_categoria", str(categoria.id))
            if not isinstance(guild.get_channel(chat_id or 0), discord.TextChannel):
                chat = await categoria.create_text_channel(NOME_CHAT, reason="Kiza: Toca Kitsune")
                await banco.set_config(guild.id, "kitsune_chat", str(chat.id))
            if not isinstance(guild.get_channel(criador_id or 0), discord.VoiceChannel):
                criador = await categoria.create_voice_channel(NOME_CRIADOR, reason="Kiza: Toca Kitsune")
                await banco.set_config(guild.id, "kitsune_criador", str(criador.id))
        except discord.HTTPException:
            log.warning("Não consegui criar a Toca Kitsune", exc_info=True)
            await interaction.followup.send(textos.SALA_SEM_PERMISSAO, ephemeral=True)
            return
        await interaction.followup.send(textos.SALA_CONFIGURADA, ephemeral=True)

    @commands.Cog.listener()
    async def on_voice_state_update(self, membro: discord.Member, antes: discord.VoiceState, depois: discord.VoiceState) -> None:
        if membro.bot or depois.channel is None or (antes.channel is not None and antes.channel.id == depois.channel.id):
            return
        guild = membro.guild
        _cat, criador_id, _chat = await self._ids(guild.id)
        if criador_id is None or depois.channel.id != criador_id:
            return
        if not await self.bot.banco.ajuste(guild.id, "kitsune_sala_ligada"):
            return
        if not await self.eh_kitsune(membro):
            try:
                await membro.move_to(None, reason="Kiza: sala Kitsune é só para Kitsunes")
            except discord.HTTPException:
                pass
            return
        await self._abrir_sala(membro, depois.channel)

    async def _abrir_sala(self, membro: discord.Member, criador: discord.VoiceChannel) -> None:
        guild, banco = membro.guild, self.bot.banco
        categoria = criador.category
        if categoria is None:
            return
        # quem já tem uma sala volta para ela (uma sala por pessoa)
        existente = await banco.get_config_int(guild.id, f"kitsune_sala_{membro.id}")
        sala = guild.get_channel(existente) if existente else None
        if isinstance(sala, discord.VoiceChannel) and sala.category_id == categoria.id:
            await self._mover(membro, sala)
            return
        salas = [c for c in categoria.voice_channels if c.id != criador.id]
        if len(salas) >= await banco.ajuste(guild.id, "kitsune_sala_max"):
            await self._mover(membro, None)
            return
        nome = await banco.get_config(guild.id, f"kitsune_sala_nome_{membro.id}") or textos.SALA_NOME_PADRAO.format(nome=membro.display_name)
        limite = int(await banco.get_config(guild.id, f"kitsune_sala_limite_{membro.id}") or 0)
        dono = discord.PermissionOverwrite(view_channel=True, connect=True, manage_channels=True, move_members=True)
        try:
            nova = await categoria.create_voice_channel(
                (PREFIXO_SALA + nome)[:100], user_limit=limite, overwrites={**categoria.overwrites, membro: dono}, reason=f"Kiza: sala Kitsune de {membro.id}"
            )
        except discord.HTTPException:
            log.warning("Não consegui criar a sala Kitsune", exc_info=True)
            await self._mover(membro, None)
            return
        await banco.set_config(guild.id, f"kitsune_sala_{membro.id}", str(nova.id))
        await self._mover(membro, nova)

    @staticmethod
    async def _mover(membro: discord.Member, sala: Optional[discord.VoiceChannel]) -> None:
        try:
            await membro.move_to(sala, reason="Kiza: sala Kitsune")
        except discord.HTTPException:
            pass

    async def _minha_sala(self, interaction: discord.Interaction) -> Optional[discord.VoiceChannel]:
        guild = interaction.guild
        assert guild is not None
        cid = await self.bot.banco.get_config_int(guild.id, f"kitsune_sala_{interaction.user.id}")
        canal = guild.get_channel(cid) if cid else None
        return canal if isinstance(canal, discord.VoiceChannel) else None

    async def _so_kitsune(self, interaction: discord.Interaction) -> bool:
        assert isinstance(interaction.user, discord.Member)
        if await self.eh_kitsune(interaction.user):
            return True
        await interaction.response.send_message(textos.SO_KITSUNE, ephemeral=True)
        return False

    @sala.command(name="nome", description="(Kitsune) Escolha o nome da sua sala de voz.")
    @app_commands.describe(nome="O nome (até 40 letras)")
    async def sala_nome(self, interaction: discord.Interaction, nome: str) -> None:
        if not await self._so_kitsune(interaction):
            return
        limpo = nome_de_sala_valido(nome)
        if limpo is None:
            await interaction.response.send_message(textos.SALA_NOME_INVALIDO, ephemeral=True)
            return
        guild = interaction.guild
        assert guild is not None
        await self.bot.banco.set_config(guild.id, f"kitsune_sala_nome_{interaction.user.id}", limpo)
        atual = await self._minha_sala(interaction)
        if atual is not None:
            try:
                await atual.edit(name=(PREFIXO_SALA + limpo)[:100], reason="Kiza: sala Kitsune")
            except discord.HTTPException:
                pass  # o Discord limita renomear canal (2 vezes a cada 10 min): vale na próxima sala
        await interaction.response.send_message(textos.SALA_NOME_OK.format(nome=limpo), ephemeral=True)

    @sala.command(name="limite", description="(Kitsune) Limite de pessoas na sua sala (0 = sem limite).")
    @app_commands.describe(pessoas="De 0 a 99")
    async def sala_limite(self, interaction: discord.Interaction, pessoas: app_commands.Range[int, 0, 99]) -> None:
        if not await self._so_kitsune(interaction):
            return
        guild = interaction.guild
        assert guild is not None
        await self.bot.banco.set_config(guild.id, f"kitsune_sala_limite_{interaction.user.id}", str(pessoas))
        atual = await self._minha_sala(interaction)
        if atual is not None:
            try:
                await atual.edit(user_limit=pessoas, reason="Kiza: sala Kitsune")
            except discord.HTTPException:
                pass
        await interaction.response.send_message(textos.SALA_LIMITE_OK.format(n=pessoas or "sem"), ephemeral=True)

    @tasks.loop(seconds=15)
    async def faxina(self) -> None:
        """Apaga as salas Kitsune que ficaram vazias (inclusive as de antes de um reinício)."""
        try:
            for guild in self.bot.guilds:
                cat_id, criador_id, _ = await self._ids(guild.id)
                categoria = guild.get_channel(cat_id) if cat_id else None
                if not isinstance(categoria, discord.CategoryChannel):
                    continue
                for sala in categoria.voice_channels:
                    if sala.id == criador_id:
                        continue
                    if sala.members:
                        self._vazia_desde.pop(sala.id, None)
                        continue
                    desde = self._vazia_desde.setdefault(sala.id, time.monotonic())
                    if time.monotonic() - desde >= VAZIA_ATE_APAGAR:
                        self._vazia_desde.pop(sala.id, None)
                        try:
                            await sala.delete(reason="Kiza: sala Kitsune vazia")
                        except discord.HTTPException:
                            log.warning("Não consegui apagar a sala %s", sala.id, exc_info=True)
        except Exception:
            log.exception("Erro na faxina das salas Kitsune")

    # ================================================================== votações
    @votacao.command(name="criar", description="(Staff) Abre uma votação só para Kitsunes.")
    @app_commands.describe(titulo="A pergunta", opcoes="De 2 a 5 opções separadas por ;", dias="Quantos dias dura (1 a 14)", canal="Onde postar (padrão: chat dos Kitsunes ou este canal)")
    @exigir_nivel(config.NIVEL_STAFF)
    async def votacao_criar(
        self, interaction: discord.Interaction, titulo: str, opcoes: str, dias: app_commands.Range[int, 1, 14] = 3, canal: Optional[discord.TextChannel] = None
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        lista = opcoes_da_votacao(opcoes)
        if not 2 <= len(lista) <= MAX_OPCOES:
            await interaction.response.send_message(textos.VOTACAO_OPCOES_INVALIDAS, ephemeral=True)
            return
        titulo = " ".join(titulo.split())[:150]
        if canal is None:
            _c, _cr, chat_id = await self._ids(guild.id)
            alvo = guild.get_channel(chat_id) if chat_id else None
            canal = alvo if isinstance(alvo, discord.TextChannel) else interaction.channel  # type: ignore[assignment]
        if not isinstance(canal, discord.TextChannel):
            await interaction.response.send_message(textos.SETUP_SEM_CANAL, ephemeral=True)
            return
        encerra = int(time.time()) + dias * 86400
        vid = await self.bot.banco.votacao_criar(guild.id, canal.id, titulo, lista, interaction.user.id, encerra)
        try:
            msg = await canal.send(embed=embed_votacao(titulo, lista, {}, encerra, False), view=view_votacao(vid, lista))
        except discord.HTTPException:
            await self.bot.banco.votacao_encerrar(vid)
            await interaction.response.send_message(textos.SETUP_ERRO_PUBLICAR, ephemeral=True)
            return
        await self.bot.banco.votacao_mensagem(vid, msg.id)
        await interaction.response.send_message(textos.VOTACAO_CRIADA.format(id=vid, canal=canal.mention), ephemeral=True)

    @votacao.command(name="encerrar", description="(Staff) Encerra uma votação agora.")
    @app_commands.describe(id="O número da votação (aparece ao criar)")
    @exigir_nivel(config.NIVEL_STAFF)
    async def votacao_encerrar(self, interaction: discord.Interaction, id: int) -> None:
        guild = interaction.guild
        assert guild is not None
        v = await self.bot.banco.votacao_obter(id)
        if v is None or int(v["guild_id"]) != guild.id:
            await interaction.response.send_message(textos.VOTACAO_NAO_ACHEI, ephemeral=True)
            return
        if not await self._fechar(guild, v):
            await interaction.response.send_message(textos.VOTACAO_JA_ENCERRADA, ephemeral=True)
            return
        await interaction.response.send_message(textos.VOTACAO_ENCERRADA_OK.format(id=id), ephemeral=True)

    async def votar(self, interaction: discord.Interaction, vid: int, opcao: int) -> None:
        membro = interaction.user
        if not isinstance(membro, discord.Member) or interaction.guild is None:
            return
        if not await self.eh_kitsune(membro):
            await interaction.response.send_message(textos.VOTACAO_SO_KITSUNE, ephemeral=True)
            return
        resultado = await self.bot.banco.votar(vid, membro.id, opcao)
        if resultado == "encerrada" or resultado == "inexistente":
            await interaction.response.send_message(textos.VOTACAO_ENCERROU if resultado == "encerrada" else textos.VOTACAO_NAO_ACHEI, ephemeral=True)
            return
        if resultado == "igual":
            await interaction.response.send_message(textos.VOTACAO_IGUAL, ephemeral=True)
            return
        v = await self.bot.banco.votacao_obter(vid)
        opcoes = json.loads(v["opcoes"])
        await interaction.response.edit_message(
            embed=embed_votacao(v["titulo"], opcoes, await self.bot.banco.votos_contagem(vid), int(v["encerra_em"]), False),
            view=view_votacao(vid, opcoes),
        )
        await interaction.followup.send(textos.VOTACAO_VOTOU.format(opcao=opcoes[opcao]) if resultado == "ok" else textos.VOTACAO_TROCOU.format(opcao=opcoes[opcao]), ephemeral=True)

    async def _fechar(self, guild: discord.Guild, v: Any) -> bool:
        if not await self.bot.banco.votacao_encerrar(int(v["id"])):
            return False
        opcoes = json.loads(v["opcoes"])
        canal = guild.get_channel(int(v["canal_id"]))
        if isinstance(canal, discord.TextChannel) and int(v["mensagem_id"]):
            try:
                msg = await canal.fetch_message(int(v["mensagem_id"]))
                await msg.edit(
                    embed=embed_votacao(v["titulo"], opcoes, await self.bot.banco.votos_contagem(int(v["id"])), int(v["encerra_em"]), True),
                    view=view_votacao(int(v["id"]), opcoes, desligada=True),
                )
            except discord.HTTPException:
                log.warning("Não consegui atualizar a votação %s", v["id"], exc_info=True)
        return True

    @tasks.loop(minutes=5)
    async def encerrar_votacoes(self) -> None:
        try:
            for v in await self.bot.banco.votacoes_vencidas():
                guild = self.bot.get_guild(int(v["guild_id"]))
                if guild is not None:
                    await self._fechar(guild, v)
        except Exception:
            log.exception("Erro ao encerrar votações")

    # ================================================================== mural
    async def _canal_mural(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        canal = await canal_da_funcao(self.bot, guild, "kitsune")
        return canal if isinstance(canal, discord.TextChannel) else None

    async def nomes_mural(self, guild: discord.Guild) -> list[str]:
        cargo = await self.cargo_kitsune(guild)
        if cargo is None:
            return []
        nomes = []
        for m in sorted(cargo.members, key=lambda x: x.display_name.casefold()):
            if m.bot or await self.bot.banco.get_config(guild.id, f"mural_oculto_{m.id}"):
                continue
            nomes.append(discord.utils.escape_markdown(m.display_name))
        return nomes

    async def publicar_mural(self, guild: discord.Guild, forcar: bool = True) -> tuple[bool, str]:
        canal = await self._canal_mural(guild)
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        nomes = await self.nomes_mural(guild)
        e = embed(textos.MURAL_TITULO, textos.MURAL_DESC.format(n=len(nomes)) + "\n\n" + nomes_do_mural(nomes), config.COR_PRINCIPAL)
        e.set_footer(text=textos.MURAL_RODAPE)
        assinatura = json.dumps(e.to_dict(), sort_keys=True)
        if not forcar and self._mural_assinatura.get(guild.id) == assinatura:
            return True, canal.mention
        try:
            await publicar_ou_editar(self.bot, guild, canal, "mural_kitsune", embeds=[e], mencoes=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao publicar o mural dos Kitsunes", exc_info=True)
            return False, textos.SETUP_ERRO_PUBLICAR
        self._mural_assinatura[guild.id] = assinatura
        await self.bot.banco.set_config(guild.id, "mural_publicado", "1")
        return True, canal.mention

    @tasks.loop(minutes=30)
    async def mural_automatico(self) -> None:
        """Atualiza o mural (só se ele já foi publicado alguma vez) e agradece no 1º dia de cada mês."""
        try:
            for guild in self.bot.guilds:
                if not await self.bot.banco.get_config(guild.id, "mural_publicado"):
                    continue
                await self.publicar_mural(guild, forcar=False)
                hoje = datetime.now(TZ)
                marca = hoje.strftime("%Y-%m")
                if hoje.day == 1 and await self.bot.banco.get_config(guild.id, "mural_agradecimento") != marca:
                    canal = await self._canal_mural(guild)
                    nomes = await self.nomes_mural(guild)
                    if canal is not None and nomes:
                        await self.bot.banco.set_config(guild.id, "mural_agradecimento", marca)  # marca antes: nunca agradece duas vezes
                        await canal.send(textos.MURAL_AGRADECIMENTO.format(n=len(nomes)), allowed_mentions=discord.AllowedMentions.none())
        except Exception:
            log.exception("Erro no mural dos Kitsunes")

    @mural.command(name="sair", description="Tira o seu nome do mural dos Kitsunes (você continua Kitsune).")
    async def mural_sair(self, interaction: discord.Interaction) -> None:
        assert interaction.guild is not None
        await self.bot.banco.set_config(interaction.guild.id, f"mural_oculto_{interaction.user.id}", "1")
        await interaction.response.send_message(textos.MURAL_SAIU, ephemeral=True)

    @mural.command(name="voltar", description="Coloca o seu nome de volta no mural dos Kitsunes.")
    async def mural_voltar(self, interaction: discord.Interaction) -> None:
        assert interaction.guild is not None
        await self.bot.banco.set_config(interaction.guild.id, f"mural_oculto_{interaction.user.id}", None)
        await interaction.response.send_message(textos.MURAL_VOLTOU, ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(KitsuneExtras(bot))
