"""Apoio ao servidor por PIX: compra de Kitsune, doações e metas de arrecadação.

Fluxo: a pessoa pede (comando ou botão) -> a Kiza grava uma cobrança "pendente", pede o PIX ao Mercado Pago e mostra o "copia e cola" e o
QR (só para ela) -> quando o pagamento cai, a Kiza libera. Quem avisa que pagou é o Mercado Pago (aviso em /pix/webhook, ligado na
ponte HTTP) e, de qualquer jeito, a Kiza confere as cobranças pendentes a cada 15 s. Nos dois casos ela consulta o pagamento na API e
só libera se estiver aprovado, com o valor e a referência certos; e cada pagamento só vale UMA vez (garantido no banco).

Kitsune comprado: o cargo no Discord vem na hora e o selo no jogo vai junto na próxima sincronização da ponte (rota /mc/sync devolve
`kitsune_conceder`; o jogo confirma com `kitsune_ok`). O prazo soma ao que a pessoa já tem.
"""
from __future__ import annotations

import asyncio
import base64
import io
import logging
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING, Any, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import barra_progresso, canal_da_funcao, embed, enviar_log, publicar_ou_editar
from utils.permissoes import eh_membro, exigir_nivel
from utils.pix import MercadoPago, PagamentoPix, PixErro, PixNaoConfigurado, ProvedorPix, reais

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.apoio")

MAX_PENDENTES = 3
PASSO_CONFERIR = 15
DIA_S = 86400


def parse_valor(texto: str) -> Optional[int]:
    """'10', '10,50', 'R$ 7.5' -> centavos (1000, 1050, 750). None se não for um valor com até 2 casas."""
    limpo = str(texto).strip().lower().replace("r$", "").replace(" ", "")
    if not limpo:
        return None
    if "," in limpo:  # 1.234,56
        limpo = limpo.replace(".", "").replace(",", ".")
    try:
        valor = Decimal(limpo)
    except InvalidOperation:
        return None
    if not valor.is_finite() or valor <= 0 or valor != valor.quantize(Decimal("0.01")):
        return None
    return int(valor * 100)


def inicio_do_mes() -> int:
    """Primeiro instante do mês atual em Brasília (ts em segundos)."""
    agora = datetime.now(timezone(timedelta(hours=-3)))
    return int(agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp())


def nome_publico(membro: Optional[discord.abc.User], anonimo: bool) -> str:
    if anonimo or membro is None:
        return textos.APOIO_ANONIMO
    return discord.utils.escape_markdown(getattr(membro, "display_name", membro.name))


# ---------------------------------------------------------------------------------------------- telas
class PainelApoioView(discord.ui.View):
    """Os três botões do painel (persistentes: os custom_id não mudam)."""

    def __init__(self, cog: "Apoio") -> None:
        super().__init__(timeout=None)
        self.cog = cog

    @discord.ui.button(label=textos.APOIO_BOTAO_KITSUNE, emoji="🦊", style=discord.ButtonStyle.primary, custom_id="apoio:kitsune")
    async def kitsune(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.cog.mostrar_meses(interaction)

    @discord.ui.button(label=textos.APOIO_BOTAO_DOAR, emoji="💖", style=discord.ButtonStyle.success, custom_id="apoio:doar")
    async def doar(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        if await self.cog.pode_apoiar(interaction):
            await interaction.response.send_modal(DoacaoModal(self.cog))

    @discord.ui.button(label=textos.APOIO_BOTAO_METAS, emoji="📊", style=discord.ButtonStyle.secondary, custom_id="apoio:metas")
    async def metas(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        guild = interaction.guild
        if guild is None:
            return
        e = await self.cog.montar_painel(guild)
        await interaction.response.send_message(embed=e, ephemeral=True)


class MesesView(discord.ui.View):
    def __init__(self, cog: "Apoio", opcoes: list[discord.SelectOption]) -> None:
        super().__init__(timeout=300)
        self.cog = cog
        seletor = discord.ui.Select(placeholder=textos.APOIO_MESES_PLACEHOLDER, options=opcoes)
        seletor.callback = self._escolheu  # type: ignore[method-assign]
        self.seletor = seletor
        self.add_item(seletor)

    async def _escolheu(self, interaction: discord.Interaction) -> None:
        await self.cog.cobrar_kitsune(interaction, int(self.seletor.values[0]))


class DoacaoModal(discord.ui.Modal):
    def __init__(self, cog: "Apoio", meta_id: Optional[int] = None) -> None:
        super().__init__(title=textos.DOAR_MODAL_TITULO, timeout=600)
        self.cog = cog
        self.meta_id = meta_id
        self.valor = discord.ui.TextInput(label=textos.DOAR_MODAL_VALOR, max_length=10, placeholder="10")
        self.mensagem = discord.ui.TextInput(
            label=textos.DOAR_MODAL_MENSAGEM, required=False, max_length=150, style=discord.TextStyle.paragraph
        )
        self.anonimo = discord.ui.TextInput(label=textos.DOAR_MODAL_ANONIMO, required=False, max_length=3, placeholder="não")
        for campo in (self.valor, self.mensagem, self.anonimo):
            self.add_item(campo)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        anonimo = str(self.anonimo.value).strip().lower() in {"sim", "s", "yes", "y", "1"}
        await self.cog.cobrar_doacao(interaction, str(self.valor.value), str(self.mensagem.value), anonimo, self.meta_id)


class PixView(discord.ui.View):
    def __init__(self, cog: "Apoio", pg_id: int, user_id: int, copia_cola: str) -> None:
        super().__init__(timeout=45 * 60)
        self.cog, self.pg_id, self.user_id, self.copia_cola = cog, pg_id, user_id, copia_cola

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.user_id:
            await interaction.response.send_message(textos.PIX_NAO_E_SEU, ephemeral=True)
            return False
        return True

    @discord.ui.button(label=textos.PIX_BOTAO_COPIAR, emoji="📋", style=discord.ButtonStyle.secondary)
    async def copiar(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await interaction.response.send_message(f"```{self.copia_cola}```", ephemeral=True)

    @discord.ui.button(label=textos.PIX_BOTAO_CONFERIR, emoji="✅", style=discord.ButtonStyle.success)
    async def conferir(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await interaction.response.defer(ephemeral=True)
        resultado = await self.cog.conferir_por_id(self.pg_id)
        if resultado in {"pago", "ja"}:
            await interaction.followup.send(textos.PIX_JA_PAGO, ephemeral=True)
        elif resultado in {"expirado", "cancelado", "recusado"}:
            await interaction.followup.send(textos.PIX_EXPIROU, ephemeral=True)
        else:
            await interaction.followup.send(textos.PIX_AINDA_NAO, ephemeral=True)

    @discord.ui.button(label=textos.PIX_BOTAO_CANCELAR, emoji="✖️", style=discord.ButtonStyle.danger)
    async def cancelar(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        feito = await self.cog.bot.banco.pg_cancelar(self.pg_id, interaction.user.id)
        await interaction.response.send_message(textos.PIX_CANCELADO if feito else textos.PIX_JA_PAGO, ephemeral=True)
        if feito:
            self.stop()


# ---------------------------------------------------------------------------------------------- cog
class Apoio(commands.Cog):
    meta = app_commands.Group(name="meta", description="Metas de arrecadação para manter a toca.", guild_only=True)
    apoio = app_commands.Group(name="apoio", description="(Admin) Painel e pagamentos do apoio por PIX.", guild_only=True)

    def __init__(self, bot: "Kiza", provedor: Optional[ProvedorPix] = None) -> None:
        self.bot = bot
        self.pix: ProvedorPix = provedor or MercadoPago()
        self._ocupados: set[int] = set()  # pagamentos sendo confirmados agora (evita duas confirmações ao mesmo tempo)

    # ------------------------------------------------------------------ ciclo de vida
    async def cog_load(self) -> None:
        self.conferir_loop.start()
        self.manutencao_loop.start()
        if not self.pix.configurado:
            log.warning("MERCADOPAGO_ACCESS_TOKEN não definido: o apoio por PIX fica desligado até a chave entrar")

    async def cog_unload(self) -> None:
        self.conferir_loop.cancel()
        self.manutencao_loop.cancel()
        await self.pix.fechar()

    def view_painel(self) -> PainelApoioView:
        return PainelApoioView(self)

    def views_persistentes(self) -> list[discord.ui.View]:
        return [self.view_painel()]

    # ------------------------------------------------------------------ regras
    async def ligado(self, guild_id: int) -> bool:
        return bool(await self.bot.banco.ajuste(guild_id, "apoio_ligado"))

    async def pode_apoiar(self, interaction: discord.Interaction) -> bool:
        """Responde sozinha quando não pode (desligado, sem PIX, não é membro). True se pode seguir."""
        guild, user = interaction.guild, interaction.user
        if guild is None or not isinstance(user, discord.Member):
            await self._dizer(interaction, textos.SO_SERVIDOR)
            return False
        if not await eh_membro(self.bot, user):
            await self._dizer(interaction, textos.NAO_E_MEMBRO)
            return False
        if not await self.ligado(guild.id):
            await self._dizer(interaction, textos.APOIO_DESLIGADO)
            return False
        if not self.pix.configurado:
            await self._dizer(interaction, textos.APOIO_SEM_PROVEDOR)
            return False
        return True

    @staticmethod
    async def _dizer(interaction: discord.Interaction, texto: str) -> None:
        if interaction.response.is_done():
            await interaction.followup.send(texto, ephemeral=True)
        else:
            await interaction.response.send_message(texto, ephemeral=True)

    async def meta_destino(self, guild_id: int, meta_id: Optional[int]) -> Optional[int]:
        """A meta que recebe a doação: a escolhida (se estiver ativa) ou a mais antiga ativa. None = doação geral."""
        if meta_id:
            meta = await self.bot.banco.meta_por_id(guild_id, meta_id)
            if meta is not None and not meta["encerrada_em"]:
                return int(meta["id"])
        ativas = await self.bot.banco.metas_ativas(guild_id)
        return int(ativas[0]["id"]) if ativas else None

    async def cobrar(
        self,
        guild_id: int,
        user_id: int,
        tipo: str,
        valor_centavos: int,
        descricao: str,
        *,
        meses: int = 0,
        meta_id: Optional[int] = None,
        anonimo: bool = False,
        mensagem: str = "",
    ) -> tuple[str, Any]:
        """Cria (ou reaproveita) a cobrança. Devolve ("ok", linha), ("muitos", n) ou ("erro", None)."""
        banco = self.bot.banco
        existente = await banco.pg_pendente_igual(guild_id, user_id, tipo, valor_centavos, meses, meta_id)
        if existente is not None:
            return "ok", existente
        pendentes = await banco.pg_pendentes_da_pessoa(guild_id, user_id)
        if pendentes >= MAX_PENDENTES:
            return "muitos", pendentes
        validade = await banco.ajuste(guild_id, "pix_validade_min")
        ref = "KZ" + secrets.token_hex(7).upper()
        pg_id = await banco.pg_criar(
            guild_id, user_id, tipo, valor_centavos, ref, int(time.time()) + validade * 60,
            meses=meses, meta_id=meta_id, anonimo=anonimo, mensagem=mensagem,
        )
        try:
            cobranca = await self.pix.criar(valor_centavos, descricao, ref, validade)
        except PixNaoConfigurado:
            await banco._exec("UPDATE pagamentos SET status = 'cancelado' WHERE id = ?", (pg_id,))
            return "erro", None
        except PixErro:
            log.exception("Não consegui criar o PIX (%s, %s)", tipo, reais(valor_centavos))
            await banco._exec("UPDATE pagamentos SET status = 'cancelado' WHERE id = ?", (pg_id,))
            return "erro", None
        await banco.pg_anexar_provedor(pg_id, cobranca.id, cobranca.copia_cola, cobranca.qr_base64)
        return "ok", await banco.pg_por_id(pg_id)

    # ------------------------------------------------------------------ telas do pagamento
    def embed_pix(self, pg: Any) -> tuple[discord.Embed, Optional[discord.File]]:
        titulo = textos.PIX_TITULO_KITSUNE.format(meses=pg["meses"]) if pg["tipo"] == "kitsune" else textos.PIX_TITULO_DOACAO
        expira = int(pg["expira_em"])
        e = embed(titulo, textos.PIX_DESC.format(valor=reais(pg["valor_centavos"]), expira=f"<t:{expira}:t> (<t:{expira}:R>)"))
        e.add_field(name=textos.PIX_CAMPO_CODIGO, value=f"```{pg['copia_cola']}```", inline=False)
        arquivo = None
        if pg["qr_base64"]:
            try:
                arquivo = discord.File(io.BytesIO(base64.b64decode(pg["qr_base64"])), filename="pix.png")
                e.set_image(url="attachment://pix.png")
            except (ValueError, TypeError):
                arquivo = None
        return e, arquivo

    async def enviar_pix(self, interaction: discord.Interaction, pg: Any) -> None:
        e, arquivo = self.embed_pix(pg)
        view = PixView(self, int(pg["id"]), interaction.user.id, str(pg["copia_cola"]))
        kwargs: dict[str, Any] = {"embed": e, "view": view, "ephemeral": True}
        if arquivo is not None:
            kwargs["file"] = arquivo
        if interaction.response.is_done():
            await interaction.followup.send(**kwargs)
        else:
            await interaction.response.send_message(**kwargs)

    async def _resultado_cobranca(self, interaction: discord.Interaction, estado: str, dado: Any) -> None:
        if estado == "ok":
            await self.enviar_pix(interaction, dado)
        elif estado == "muitos":
            await self._dizer(interaction, textos.APOIO_MUITOS_PENDENTES.format(n=dado))
        else:
            await self._dizer(interaction, textos.APOIO_ERRO_PIX)

    async def mostrar_meses(self, interaction: discord.Interaction) -> None:
        if not await self.pode_apoiar(interaction):
            return
        guild = interaction.guild
        assert guild is not None
        preco = await self.bot.banco.ajuste(guild.id, "kitsune_preco")
        dias = await self.bot.banco.ajuste(guild.id, "kitsune_dias_mes")
        opcoes = [
            discord.SelectOption(label=textos.APOIO_MESES_OPCAO.format(n=n, valor=reais(n * preco * 100)), value=str(n), emoji="🦊")
            for n in config.KITSUNE_MESES
        ]
        e = embed(textos.APOIO_ESCOLHA_MESES, textos.APOIO_ESCOLHA_DESC.format(preco=reais(preco * 100), dias=dias))
        await interaction.response.send_message(embed=e, view=MesesView(self, opcoes), ephemeral=True)

    async def cobrar_kitsune(self, interaction: discord.Interaction, meses: int) -> None:
        if not await self.pode_apoiar(interaction):
            return
        guild = interaction.guild
        assert guild is not None
        if meses not in config.KITSUNE_MESES:
            await self._dizer(interaction, textos.APOIO_ERRO_PIX)
            return
        preco = await self.bot.banco.ajuste(guild.id, "kitsune_preco")
        await interaction.response.defer(ephemeral=True)
        estado, dado = await self.cobrar(
            guild.id, interaction.user.id, "kitsune", meses * preco * 100, f"Kitsune {meses} mes(es) - Vulpus", meses=meses
        )
        await self._resultado_cobranca(interaction, estado, dado)

    async def cobrar_doacao(
        self, interaction: discord.Interaction, valor_texto: str, mensagem: str, anonimo: bool, meta_id: Optional[int] = None
    ) -> None:
        if not await self.pode_apoiar(interaction):
            return
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        minimo, maximo = await banco.ajuste(guild.id, "doacao_min"), await banco.ajuste(guild.id, "doacao_max")
        centavos = parse_valor(valor_texto)
        if centavos is None or not minimo * 100 <= centavos <= maximo * 100:
            await self._dizer(interaction, textos.APOIO_VALOR_INVALIDO.format(minimo=reais(minimo * 100), maximo=reais(maximo * 100)))
            return
        destino = await self.meta_destino(guild.id, meta_id)
        await interaction.response.defer(ephemeral=True)
        estado, dado = await self.cobrar(
            guild.id, interaction.user.id, "doacao", centavos, "Doacao - Vulpus",
            meta_id=destino, anonimo=anonimo, mensagem=mensagem.strip()[:150],
        )
        await self._resultado_cobranca(interaction, estado, dado)

    # ------------------------------------------------------------------ confirmação
    async def conferir_por_id(self, pg_id: int) -> str:
        pg = await self.bot.banco.pg_por_id(pg_id)
        if pg is None:
            return "sumiu"
        if pg["status"] == "pago":
            return "ja"
        if pg["status"] in ("expirado", "cancelado") and not pg["provedor_id"]:
            return pg["status"]
        return await self.conferir(pg)

    async def conferir(self, pg: Any) -> str:
        """Pergunta ao provedor e, se pagaram, libera. Devolve o resultado (pago, ja, pendente, valor, ref, erro, ...)."""
        if not pg["provedor_id"] or not self.pix.configurado:
            return "pendente"
        try:
            info = await self.pix.consultar(str(pg["provedor_id"]))
        except PixErro:
            log.warning("Não consegui consultar o pagamento %s", pg["id"], exc_info=True)
            return "erro"
        return await self.processar(pg, info)

    async def processar(self, pg: Any, info: PagamentoPix) -> str:
        banco = self.bot.banco
        if info.status == "aprovado":
            if info.ref and info.ref != pg["ref"]:
                log.error("Pagamento %s com referência trocada (%s != %s): ignorado", pg["id"], info.ref, pg["ref"])
                return "ref"
            if info.valor_centavos != pg["valor_centavos"]:
                await self._avisar_staff(pg["guild_id"], textos.PAGO_LOG_VALOR_DIFERENTE.format(
                    id=pg["id"], esperado=reais(pg["valor_centavos"]), veio=reais(info.valor_centavos)))
                return "valor"
            if pg["id"] in self._ocupados:
                return "ocupado"
            self._ocupados.add(pg["id"])
            try:
                dias = await banco.ajuste(pg["guild_id"], "kitsune_dias_mes")
                pago = await banco.pg_marcar_pago(pg["id"], dias, int(time.time() * 1000))
                if pago is None:
                    return "ja"
                await self.aplicar(pago)
                return "pago"
            finally:
                self._ocupados.discard(pg["id"])
        if info.status in {"cancelado", "recusado"} and pg["status"] == "pendente":
            await banco._exec("UPDATE pagamentos SET status = 'cancelado' WHERE id = ? AND status = 'pendente'", (pg["id"],))
            return "cancelado"
        if info.status == "devolvido" and pg["status"] == "pago":
            await self._avisar_staff(pg["guild_id"], textos.PAGO_LOG_DEVOLVIDO.format(
                id=pg["id"], tipo=pg["tipo"], valor=reais(pg["valor_centavos"])))
            return "devolvido"
        return "pendente"

    async def processar_webhook(self, provedor_id: str) -> bool:
        """Aviso do Mercado Pago: confere o pagamento citado (o corpo do aviso nunca é confiado)."""
        if not self.pix.configurado or not re.fullmatch(r"[A-Za-z0-9]{4,40}", str(provedor_id)):
            return False
        banco = self.bot.banco
        pg = await banco.pg_por_provedor(str(provedor_id))
        try:
            info = await self.pix.consultar(str(provedor_id))
        except PixErro:
            log.warning("Aviso do PIX %s: não consegui consultar", provedor_id, exc_info=True)
            return False
        if pg is None and info.ref:
            pg = await banco.pg_por_ref(info.ref)  # o aviso chegou antes de eu gravar o id do provedor
            if pg is not None and not pg["provedor_id"]:
                await banco.pg_anexar_provedor(pg["id"], str(provedor_id), pg["copia_cola"], pg["qr_base64"])
                pg = await banco.pg_por_id(pg["id"])
        if pg is None:
            return False
        await self.processar(pg, info)
        return True

    # ------------------------------------------------------------------ o que acontece depois de pago
    async def _avisar_staff(self, guild_id: int, texto: str) -> None:
        log.warning(texto)
        guild = self.bot.get_guild(guild_id)
        if guild is not None:
            try:
                await enviar_log(self.bot, guild, "logs_gerais", embed=embed("💳 Apoio", texto))
            except discord.HTTPException:
                log.warning("Não consegui avisar a staff", exc_info=True)

    async def aplicar(self, pg: Any) -> None:
        """Entrega o que foi pago (cargo, selo, aviso, mural). Se o bot cair no meio, `pg_nao_aplicados` retoma depois."""
        guild = self.bot.get_guild(pg["guild_id"])
        if guild is None:
            return
        membro = guild.get_member(pg["user_id"])
        try:
            if pg["tipo"] == "kitsune":
                await self._aplicar_kitsune(guild, membro, pg)
            else:
                await self._aplicar_doacao(guild, membro, pg)
        except Exception:
            log.exception("Falha ao entregar o pagamento %s", pg["id"])
            return
        await self.bot.banco.pg_marcar_aplicado(pg["id"])
        try:
            await self.atualizar_painel(guild)
        except discord.HTTPException:
            log.warning("Não consegui atualizar o painel de apoio", exc_info=True)

    async def _canal_mural(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        return await canal_da_funcao(self.bot, guild, "doacoes")

    async def _mural(self, guild: discord.Guild, texto: str) -> None:
        canal = await self._canal_mural(guild)
        if canal is None:
            return
        try:
            await canal.send(texto, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Não consegui postar no mural de doações", exc_info=True)

    async def _dm(self, membro: Optional[discord.Member], texto: str) -> None:
        if membro is None:
            return
        try:
            await membro.send(texto)
        except (discord.Forbidden, discord.HTTPException):
            pass  # DM fechada: o mural já agradece

    async def _aplicar_kitsune(self, guild: discord.Guild, membro: Optional[discord.Member], pg: Any) -> None:
        banco = self.bot.banco
        ate = int(pg["kitsune_ate"])
        vinculo = await banco.mc_vinculo_de_usuario(guild.id, pg["user_id"])
        nome_mc = vinculo["mc_nome"] if vinculo is not None else (membro.display_name if membro else str(pg["user_id"]))
        ponte = self.bot.get_cog("Ponte")
        if ponte is not None:
            await ponte.receber_kitsune(guild.id, pg["user_id"], nome_mc, True, ate)  # type: ignore[attr-defined]
        else:  # sem a ponte: guarda o prazo e põe o cargo direto (o fim do prazo é do laço de manutenção abaixo)
            await banco.mc_kitsune_registrar(guild.id, pg["user_id"], True, ate)
            cargo_id = await banco.get_config_int(guild.id, "cargo_kitsune") or config.CARGO_KITSUNE_PADRAO
            cargo = guild.get_role(cargo_id)
            if membro is not None and cargo is not None and cargo not in membro.roles:
                await membro.add_roles(cargo, reason="Kitsune comprado por PIX")
        jogo = textos.PAGO_KITSUNE_JOGO_LIGADO if vinculo is not None else textos.PAGO_KITSUNE_JOGO_SEM_CONTA
        seg = ate // 1000
        await self._dm(membro, textos.PAGO_KITSUNE_DM.format(data=f"<t:{seg}:D>", relativo=f"<t:{seg}:R>", jogo=jogo))
        await self._mural(guild, textos.PAGO_MURAL_KITSUNE.format(nome=nome_publico(membro, False)))

    async def _aplicar_doacao(self, guild: discord.Guild, membro: Optional[discord.Member], pg: Any) -> None:
        banco = self.bot.banco
        meta = await banco.meta_por_id(guild.id, pg["meta_id"]) if pg["meta_id"] else None
        texto_meta = textos.PAGO_MURAL_META.format(titulo=discord.utils.escape_markdown(meta["titulo"])) if meta is not None else ""
        recado = textos.PAGO_MURAL_MENSAGEM.format(mensagem=discord.utils.escape_markdown(pg["mensagem"])) if pg["mensagem"] else ""
        await self._mural(guild, textos.PAGO_MURAL.format(
            nome=nome_publico(membro, bool(pg["anonimo"])), valor=reais(pg["valor_centavos"]), meta=texto_meta, mensagem=recado))
        await self._dm(membro, textos.PAGO_DOACAO_DM.format(valor=reais(pg["valor_centavos"])))
        cargo_id = await banco.get_config_int(guild.id, "cargo_apoiador")
        cargo = guild.get_role(cargo_id) if cargo_id else None
        if membro is not None and cargo is not None and cargo not in membro.roles:
            try:
                await membro.add_roles(cargo, reason="Apoiador (doação por PIX)")
            except discord.HTTPException:
                log.warning("Não consegui dar o cargo Apoiador", exc_info=True)
        if meta is not None and await banco.meta_arrecadado(meta["id"]) >= meta["alvo_centavos"]:
            if await banco.meta_encerrar(guild.id, meta["id"], "concluida"):
                await self._mural(guild, textos.PAGO_META_COMPLETA.format(titulo=discord.utils.escape_markdown(meta["titulo"])))

    # ------------------------------------------------------------------ configuração guiada
    async def configurar(self, guild: discord.Guild) -> list[str]:
        """Cria o canal de doações (se não existir), publica os painéis e confere o cargo Kitsune. Devolve as linhas do relatório."""
        from cogs.configuracao import aplicar_visibilidade  # import tardio: o cog de /setup importa muita coisa

        ok, aviso, erro = textos.APOIO_CFG_OK, textos.APOIO_CFG_AVISO, textos.APOIO_CFG_ERRO
        banco = self.bot.banco
        linhas: list[str] = []

        # 1) canal
        canal = await self._canal_mural(guild)
        if canal is None:
            vizinho = await canal_da_funcao(self.bot, guild, "kitsune", (discord.TextChannel, discord.ForumChannel))
            categoria = getattr(vizinho, "category", None)
            try:
                canal = await guild.create_text_channel(
                    "💖・doações", category=categoria, topic="Ajude a toca a continuar de pé: metas, mural de apoiadores e Kitsune por PIX.",
                    reason="Kiza: /apoio configurar",
                )
            except discord.HTTPException:
                log.warning("Não consegui criar o canal de doações", exc_info=True)
                linhas.append(erro.format(texto=textos.APOIO_CFG_CANAL_FALHOU))
                canal = None
            if canal is not None:
                await banco.set_config(guild.id, "canal_doacoes", str(canal.id))
                sucesso, detalhe = await aplicar_visibilidade(self.bot, guild, canal, "publico")
                linhas.append(ok.format(texto=textos.APOIO_CFG_CANAL_CRIADO.format(canal=canal.mention)))
                if not sucesso:
                    linhas.append(aviso.format(texto=textos.APOIO_CFG_PERMISSAO_FALHOU.format(detalhe=detalhe)))
        else:
            linhas.append(ok.format(texto=textos.APOIO_CFG_CANAL_EXISTE.format(canal=canal.mention)))

        # 2) painéis
        if canal is not None:
            try:
                await self.atualizar_painel(guild, forcar=True)
                linhas.append(ok.format(texto=textos.APOIO_CFG_PAINEL_OK.format(canal=canal.mention)))
            except discord.HTTPException:
                log.warning("Não consegui publicar o painel de apoio", exc_info=True)
                linhas.append(erro.format(texto=textos.APOIO_CFG_PAINEL_FALHOU))
        vitrine = self.bot.get_cog("Vitrine")
        if vitrine is not None:
            publicou, destino = await vitrine.publicar_kitsune(guild)  # type: ignore[attr-defined]
            linhas.append(
                ok.format(texto=textos.APOIO_CFG_KITSUNE_PAINEL_OK.format(canal=destino))
                if publicou
                else aviso.format(texto=textos.APOIO_CFG_KITSUNE_PAINEL_SEM_CANAL)
            )

        # 3) pagamento
        if await self.ligado(guild.id):
            linhas.append(ok.format(texto=textos.APOIO_CFG_PIX_OK) if self.pix.configurado else erro.format(texto=textos.APOIO_CFG_PIX_SEM_CHAVE))
        else:
            linhas.append(aviso.format(texto=textos.APOIO_CFG_AJUSTE_DESLIGADO))
        base = os.getenv("PUBLIC_BASE_URL", "").strip()
        segredo = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "").strip()
        estado = f"{textos.APOIO_CFG_WEBHOOK_URL if base else textos.APOIO_CFG_WEBHOOK_SEM_URL}; {textos.APOIO_CFG_ASSINATURA_SIM if segredo else textos.APOIO_CFG_ASSINATURA_NAO}"
        linhas.append((ok if base and segredo else aviso).format(texto=textos.APOIO_CFG_AVISOS_AUTOMATICOS.format(estado=estado)))

        # 4) cargo Kitsune
        cargo_id = await banco.get_config_int(guild.id, "cargo_kitsune") or config.CARGO_KITSUNE_PADRAO
        cargo = guild.get_role(cargo_id)
        if cargo is None:
            linhas.append(erro.format(texto=textos.APOIO_CFG_CARGO_SEM))
        elif cargo.managed:
            linhas.append(erro.format(texto=textos.APOIO_CFG_CARGO_GERENCIADO.format(cargo=cargo.mention)))
        elif not cargo < guild.me.top_role:
            linhas.append(erro.format(texto=textos.APOIO_CFG_CARGO_ALTO.format(cargo=cargo.mention)))
        else:
            linhas.append(ok.format(texto=textos.APOIO_CFG_CARGO_OK.format(cargo=cargo.mention)))
        if cargo is not None:
            boosters = [m for m in guild.members if getattr(m, "premium_since", None) and cargo in m.roles]
            linhas.append(
                aviso.format(texto=textos.APOIO_CFG_BOOSTERS.format(n=len(boosters))) if boosters else ok.format(texto=textos.APOIO_CFG_BOOSTER_SEM)
            )
        agora_ms = int(time.time() * 1000)
        selos = [s for s in await banco.mc_kitsune_lista(guild.id) if s["ativo"] and (s["ate"] == 0 or s["ate"] > agora_ms)]
        linhas.append(ok.format(texto=textos.APOIO_CFG_SELOS.format(n=len(selos))))

        # 5) metas e cargo Apoiador
        linhas.append(ok.format(texto=textos.APOIO_CFG_METAS.format(n=len(await banco.metas_ativas(guild.id)))))
        apoiador_id = await banco.get_config_int(guild.id, "cargo_apoiador")
        apoiador = guild.get_role(apoiador_id) if apoiador_id else None
        estado_apoiador = textos.APOIO_CFG_APOIADOR_SIM.format(cargo=apoiador.mention) if apoiador else textos.APOIO_CFG_APOIADOR_NAO
        linhas.append(ok.format(texto=textos.APOIO_CFG_APOIADOR.format(estado=estado_apoiador)))
        return linhas

    # ------------------------------------------------------------------ painel de metas
    async def montar_painel(self, guild: discord.Guild) -> discord.Embed:
        banco = self.bot.banco
        preco = await banco.ajuste(guild.id, "kitsune_preco")
        minimo = await banco.ajuste(guild.id, "doacao_min")
        e = embed(textos.APOIO_TITULO, textos.APOIO_DESC.format(kitsune_preco=reais(preco * 100), doacao_min=reais(minimo * 100)))
        metas = await banco.metas_ativas(guild.id)
        if not metas:
            e.add_field(name=textos.APOIO_METAS_TITULO, value=textos.APOIO_SEM_METAS, inline=False)
        for m in metas[:5]:
            arrecadado = await banco.meta_arrecadado(m["id"])
            pct = min(100, arrecadado * 100 // m["alvo_centavos"])
            prazo = textos.APOIO_META_PRAZO.format(data=f"<t:{m['prazo']}:D>") if m["prazo"] else ""
            corpo = (textos.APOIO_META_DESCRICAO.format(descricao=discord.utils.escape_markdown(m["descricao"])) if m["descricao"] else "") + \
                textos.APOIO_META_LINHA.format(
                    barra=barra_progresso(arrecadado, m["alvo_centavos"], 14), pct=pct, arrecadado=reais(arrecadado),
                    alvo=reais(m["alvo_centavos"]), prazo=prazo, apoiadores=await banco.meta_apoiadores(m["id"]))
            e.add_field(name=f"🎯 {m['titulo']}", value=corpo, inline=False)
        inicio_mes = inicio_do_mes()
        mes = await banco.pg_total(guild.id, inicio_mes)
        if mes:
            e.add_field(name="​", value=textos.APOIO_MES.format(valor=reais(mes)), inline=False)
        recentes = await banco.doacoes_recentes(guild.id, 5)
        if recentes:
            linhas = []
            for r in recentes:
                membro = guild.get_member(r["user_id"])
                linhas.append(textos.APOIO_RECENTE_LINHA.format(nome=nome_publico(membro, bool(r["anonimo"])), valor=reais(r["valor_centavos"])))
            e.add_field(name=textos.APOIO_RECENTES, value="\n".join(linhas), inline=False)
        e.set_footer(text=textos.APOIO_RODAPE)
        return e

    async def publicar_apoio(self, guild: discord.Guild) -> tuple[bool, str]:
        """Publicador do /setup → Publicar painéis: o painel de metas e botões no canal de doações."""
        canal = await self._canal_mural(guild)
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        try:
            await self.atualizar_painel(guild, forcar=True)
        except discord.HTTPException:
            log.warning("Não consegui publicar o painel de apoio", exc_info=True)
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    async def atualizar_painel(self, guild: discord.Guild, forcar: bool = False) -> Optional[discord.Message]:
        """Edita o painel do canal de doações (só se ele já foi publicado, a não ser que `forcar`)."""
        canal = await self._canal_mural(guild)
        if canal is None:
            return None
        if not forcar and not await self.bot.banco.get_config_int(guild.id, "msg_doacoes"):
            return None
        e = await self.montar_painel(guild)
        return await publicar_ou_editar(self.bot, guild, canal, "doacoes", embeds=[e], view=self.view_painel())

    # ------------------------------------------------------------------ laços
    @tasks.loop(seconds=PASSO_CONFERIR)
    async def conferir_loop(self) -> None:
        try:
            if not self.pix.configurado:
                return
            for pg in await self.bot.banco.pg_a_conferir():
                await self.conferir(pg)
                await asyncio.sleep(0.3)
            for pg in await self.bot.banco.pg_nao_aplicados():
                await self.aplicar(pg)
        except Exception:
            log.exception("Erro ao conferir pagamentos")

    @conferir_loop.before_loop
    async def _antes_de_conferir(self) -> None:
        await self.bot.wait_until_ready()

    @tasks.loop(minutes=10)
    async def manutencao_loop(self) -> None:
        try:
            banco = self.bot.banco
            expirados = await banco.pg_expirar()
            if expirados:
                log.info(textos.APOIO_LOG_EXPIRADOS.format(n=len(expirados)))
            for meta in await banco.metas_vencidas():
                if await banco.meta_encerrar(meta["guild_id"], meta["id"], "prazo"):
                    guild = self.bot.get_guild(meta["guild_id"])
                    if guild is not None:
                        arrecadado = await banco.meta_arrecadado(meta["id"])
                        await self._mural(guild, textos.META_PRAZO_ACABOU.format(
                            titulo=discord.utils.escape_markdown(meta["titulo"]), arrecadado=reais(arrecadado), alvo=reais(meta["alvo_centavos"])))
            for guild in self.bot.guilds:
                await self.atualizar_painel(guild)
        except Exception:
            log.exception("Erro na manutenção do apoio")

    @manutencao_loop.before_loop
    async def _antes_da_manutencao(self) -> None:
        await self.bot.wait_until_ready()

    # ------------------------------------------------------------------ comandos
    @app_commands.command(name="kitsune", description="Compre o selo Kitsune por PIX (R$ 15 por mês).")
    @app_commands.describe(meses="Quantos meses (se deixar em branco, eu mostro as opções)")
    @app_commands.choices(meses=[app_commands.Choice(name=f"{n} mês(es)", value=n) for n in config.KITSUNE_MESES])
    @app_commands.guild_only()
    async def kitsune(self, interaction: discord.Interaction, meses: Optional[int] = None) -> None:
        if meses is None:
            await self.mostrar_meses(interaction)
        else:
            await self.cobrar_kitsune(interaction, meses)

    async def _meta_autocompletar(self, interaction: discord.Interaction, atual: str) -> list[app_commands.Choice[int]]:
        if interaction.guild is None:
            return []
        metas = await self.bot.banco.metas_ativas(interaction.guild.id)
        return [app_commands.Choice(name=m["titulo"][:100], value=int(m["id"])) for m in metas if atual.lower() in m["titulo"].lower()][:25]

    @app_commands.command(name="doar", description="Ajude a pagar a hospedagem do servidor por PIX.")
    @app_commands.describe(
        valor="Quanto, em reais (ex.: 10 ou 7,50)", mensagem="Recado para o mural (opcional)",
        anonimo="Aparecer como anônimo no mural", meta="Para qual meta (se deixar em branco, vai para a primeira)",
    )
    @app_commands.autocomplete(meta=_meta_autocompletar)
    @app_commands.guild_only()
    async def doar(
        self, interaction: discord.Interaction, valor: str, mensagem: Optional[str] = None, anonimo: bool = False, meta: Optional[int] = None
    ) -> None:
        await self.cobrar_doacao(interaction, valor, mensagem or "", anonimo, meta)

    @app_commands.command(name="apoiar", description="Veja como ajudar a toca: virar Kitsune, doar e as metas.")
    @app_commands.guild_only()
    async def apoiar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.send_message(embed=await self.montar_painel(guild), view=self.view_painel(), ephemeral=True)

    # ---- metas (Admin)
    @meta.command(name="criar", description="(Admin) Cria uma meta de arrecadação. As doações novas já entram nela.")
    @app_commands.describe(titulo="Nome da meta", valor="Quanto precisa arrecadar, em reais", prazo_dias="Em quantos dias acaba (0 = sem prazo)", descricao="Para que é")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def meta_criar(self, interaction: discord.Interaction, titulo: str, valor: int, prazo_dias: int = 0, descricao: str = "") -> None:
        guild = interaction.guild
        assert guild is not None
        if not 1 <= valor <= 1_000_000:
            await responder_ephemeral(interaction, textos.META_VALOR_INVALIDO)
            return
        if not 0 <= prazo_dias <= 3650:
            await responder_ephemeral(interaction, textos.META_PRAZO_INVALIDO)
            return
        prazo = int(time.time()) + prazo_dias * DIA_S if prazo_dias else 0
        meta_id = await self.bot.banco.meta_criar(guild.id, titulo.strip(), valor * 100, descricao.strip(), prazo)
        await responder_ephemeral(interaction, textos.META_CRIADA.format(titulo=discord.utils.escape_markdown(titulo.strip()), id=meta_id, alvo=reais(valor * 100)))
        await self.atualizar_painel(guild)

    @meta.command(name="editar", description="(Admin) Muda o nome, o valor, o prazo ou a descrição de uma meta ativa.")
    @app_commands.describe(id="O número da meta (veja em /meta lista)", titulo="Novo nome", valor="Novo valor em reais", prazo_dias="Novo prazo em dias a partir de hoje (0 = sem prazo)", descricao="Nova descrição")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def meta_editar(self, interaction: discord.Interaction, id: int, titulo: Optional[str] = None, valor: Optional[int] = None,
                          prazo_dias: Optional[int] = None, descricao: Optional[str] = None) -> None:
        guild = interaction.guild
        assert guild is not None
        if titulo is None and valor is None and prazo_dias is None and descricao is None:
            await responder_ephemeral(interaction, textos.META_NADA_PARA_EDITAR)
            return
        if valor is not None and not 1 <= valor <= 1_000_000:
            await responder_ephemeral(interaction, textos.META_VALOR_INVALIDO)
            return
        if prazo_dias is not None and not 0 <= prazo_dias <= 3650:
            await responder_ephemeral(interaction, textos.META_PRAZO_INVALIDO)
            return
        prazo = None if prazo_dias is None else (int(time.time()) + prazo_dias * DIA_S if prazo_dias else 0)
        feito = await self.bot.banco.meta_editar(
            guild.id, id, titulo=titulo.strip() if titulo else None, alvo_centavos=valor * 100 if valor else None,
            descricao=descricao, prazo=prazo)
        await responder_ephemeral(interaction, textos.META_EDITADA.format(id=id) if feito else textos.META_NAO_ACHADA.format(id=id))
        if feito:
            await self.atualizar_painel(guild)

    @meta.command(name="encerrar", description="(Admin) Encerra uma meta (o que já foi doado continua contando no histórico).")
    @app_commands.describe(id="O número da meta (veja em /meta lista)")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def meta_encerrar(self, interaction: discord.Interaction, id: int) -> None:
        guild = interaction.guild
        assert guild is not None
        feito = await self.bot.banco.meta_encerrar(guild.id, id, "encerrada")
        await responder_ephemeral(interaction, textos.META_ENCERRADA.format(id=id) if feito else textos.META_NAO_ACHADA.format(id=id))
        if feito:
            await self.atualizar_painel(guild)

    @meta.command(name="lista", description="(Staff) Mostra as metas ativas e as encerradas há pouco.")
    @exigir_nivel(config.NIVEL_STAFF)
    async def meta_lista(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        e = embed(textos.META_LISTA_TITULO)
        ativas = await banco.metas_ativas(guild.id)
        e.description = "\n".join(
            textos.META_LISTA_LINHA.format(id=m["id"], titulo=m["titulo"], arrecadado=reais(await banco.meta_arrecadado(m["id"])), alvo=reais(m["alvo_centavos"]))
            for m in ativas
        ) or textos.APOIO_SEM_METAS
        encerradas = await banco.metas_encerradas(guild.id)
        if encerradas:
            motivos = {"concluida": textos.META_FIM_CONCLUIDA, "prazo": textos.META_FIM_PRAZO, "encerrada": textos.META_FIM_ENCERRADA}
            e.add_field(name=textos.META_LISTA_ENCERRADAS, value="\n".join(
                f"{textos.META_LISTA_LINHA.format(id=m['id'], titulo=m['titulo'], arrecadado=reais(await banco.meta_arrecadado(m['id'])), alvo=reais(m['alvo_centavos']))} ({motivos.get(m['motivo_fim'], m['motivo_fim'])})"
                for m in encerradas), inline=False)
        await interaction.response.send_message(embed=e, ephemeral=True)

    # ---- painel e pagamentos (Admin)
    @apoio.command(name="painel", description="(Admin) Publica (ou atualiza) o painel de apoio no canal de doações.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def apoio_painel(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        try:
            msg = await self.atualizar_painel(guild, forcar=True)
        except discord.HTTPException:
            msg = None
        if msg is None:
            await interaction.followup.send(textos.APOIO_PAINEL_SEM_CANAL, ephemeral=True)
        else:
            await interaction.followup.send(textos.APOIO_PAINEL_PUBLICADO.format(canal=msg.channel.mention), ephemeral=True)  # type: ignore[union-attr]

    @apoio.command(name="configurar", description="(Admin) Cria o canal de doações, publica os painéis e confere o cargo Kitsune.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def apoio_configurar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        linhas = await self.configurar(guild)
        e = embed(textos.APOIO_CFG_TITULO, "\n".join(linhas))
        await interaction.followup.send(embed=e, ephemeral=True)

    @apoio.command(name="pagamentos", description="(Admin) Mostra os últimos pagamentos confirmados e os totais.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def apoio_pagamentos(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        recentes = await banco.pg_recentes(guild.id, 15)
        e = embed(textos.APOIO_ADMIN_TITULO)
        e.description = "\n".join(
            textos.APOIO_ADMIN_LINHA.format(id=p["id"], tipo=textos.APOIO_ADMIN_TIPO[p["tipo"]], valor=reais(p["valor_centavos"]), user=p["user_id"], quando=f"<t:{p['pago_em']}:R>")
            for p in recentes
        ) or textos.APOIO_ADMIN_VAZIO
        inicio_mes = inicio_do_mes()
        e.set_footer(text=textos.APOIO_ADMIN_TOTAIS.format(
            mes=reais(await banco.pg_total(guild.id, inicio_mes)), kitsune=reais(await banco.pg_total(guild.id, inicio_mes, "kitsune")),
            doacoes=reais(await banco.pg_total(guild.id, inicio_mes, "doacao")), total=reais(await banco.pg_total(guild.id))))
        await interaction.response.send_message(embed=e, ephemeral=True, allowed_mentions=discord.AllowedMentions.none())

    @apoio.command(name="conferir", description="(Admin) Confere agora os pagamentos que estão esperando.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def apoio_conferir(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        pendentes = await self.bot.banco.pg_a_conferir()
        for pg in pendentes:
            await self.conferir(pg)
        await interaction.followup.send(textos.APOIO_CONFERIDO.format(n=len(pendentes)), ephemeral=True)


async def responder_ephemeral(interaction: discord.Interaction, texto: str) -> None:
    if interaction.response.is_done():
        await interaction.followup.send(texto, ephemeral=True)
    else:
        await interaction.response.send_message(texto, ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Apoio(bot))
