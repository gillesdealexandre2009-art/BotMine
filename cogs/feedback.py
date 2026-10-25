"""Feedback do servidor e códigos de resgate de Caudas.

* **Painel de feedback** (canal "feedback", só leitura): botão abre um formulário (nota, opinião, o que melhorar). Vai para os logs da staff
  e a pessoa recebe, só para ela, o pedido de avaliar o servidor no DISBOARD e um código pessoal de 1.000 Caudas.
  O DISBOARD não dá como conferir a avaliação: o código é na confiança. Antiabuso: mínimo de 20 caracteres, 60 s entre envios, um código
  por pessoa (para sempre), novo feedback só depois de 30 dias, código pessoal (só o dono resgata) e só vale com conta de Minecraft ligada.
* **Códigos** (`/codigo`, staff): criar, listar, desativar e ver usos. `/resgatar` troca o código por Caudas (o jogo usa a mesma função pela ponte).
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from database.codigos import CARACTERES_MIN_FEEDBACK, ResultadoCodigo, normalizar_codigo
from utils.helpers import embed, enviar_log, formatar_moeda, publicar_ou_editar
from utils.permissoes import checar_membro, exigir_nivel, nivel_do_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.feedback")
POR_PAGINA = 8
DIA = 86400


# ------------------------------------------------------------------ funções puras (testáveis)
def ler_nota(bruto: str) -> Optional[int]:
    """'4' -> 4; qualquer coisa fora de 1 a 5 -> None."""
    limpo = bruto.strip()
    return int(limpo) if limpo in {"1", "2", "3", "4", "5"} else None


def texto_longo_o_bastante(texto: str, minimo: int = CARACTERES_MIN_FEEDBACK) -> bool:
    return len(" ".join(texto.split())) >= minimo


def mensagem_do_resultado(r: ResultadoCodigo) -> str:
    """Texto puro (serve para o Discord e para o jogo)."""
    if r.ok:
        return textos.CODIGO_OK.format(caudas=f"{r.caudas:,}".replace(",", "."))
    return textos.CODIGO_RESPOSTAS.get(r.status, textos.CODIGO_RESGATAR_ERRO)


def codigo_valido(codigo: str) -> bool:
    return 4 <= len(codigo) <= 40 and all(c.isalnum() or c == "-" for c in codigo)


def resumo_usos(linha) -> str:
    return textos.CODIGO_USOS_ILIMITADOS if not linha["usos_max"] else f"{linha['usos']}/{linha['usos_max']} usos"


def resumo_validade(linha) -> str:
    if not linha["expira_em"]:
        return textos.CODIGO_SEM_VALIDADE
    return textos.CODIGO_VALE_ATE.format(quando=f"<t:{linha['expira_em']}:d>")


def estado_do_codigo(linha, agora: int) -> str:
    if not linha["ativo"]:
        return "⛔"
    if linha["expira_em"] and linha["expira_em"] <= agora:
        return "⌛"
    if linha["usos_max"] and linha["usos"] >= linha["usos_max"]:
        return "✅"
    return "🟢"


def linha_da_lista(linha, agora: int) -> str:
    extra = f" · 👤 <@{linha['dono_id']}>" if linha["dono_id"] else ""
    return textos.CODIGO_LISTA_LINHA.format(
        estado=estado_do_codigo(linha, agora),
        codigo=linha["codigo"],
        caudas=linha["caudas"],
        usos=resumo_usos(linha),
        validade=resumo_validade(linha),
        extra=extra,
    )


# ------------------------------------------------------------------ painel e formulário
class FeedbackModal(discord.ui.Modal, title=textos.FEEDBACK_MODAL_TITULO):
    def __init__(self, cog: "Feedback", minimo: int = CARACTERES_MIN_FEEDBACK) -> None:
        super().__init__(timeout=900)
        self.cog = cog
        self.nota = discord.ui.TextInput(label=textos.FEEDBACK_CAMPO_NOTA, min_length=1, max_length=1, placeholder="5")
        self.texto = discord.ui.TextInput(
            label=textos.FEEDBACK_CAMPO_TEXTO, style=discord.TextStyle.paragraph, min_length=min(minimo, 1000), max_length=1000
        )
        self.melhorar = discord.ui.TextInput(
            label=textos.FEEDBACK_CAMPO_MELHORAR, style=discord.TextStyle.paragraph, required=False, max_length=500
        )
        for campo in (self.nota, self.texto, self.melhorar):
            self.add_item(campo)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await self.cog.receber(interaction, str(self.nota.value), str(self.texto.value), str(self.melhorar.value))


class PainelFeedbackView(discord.ui.View):
    def __init__(self, cog: "Feedback") -> None:
        super().__init__(timeout=None)
        self.cog = cog

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    @discord.ui.button(label=textos.FEEDBACK_BOTAO, emoji="💬", style=discord.ButtonStyle.primary, custom_id="kiza:feedback:abrir")
    async def abrir(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.cog.abrir_formulario(interaction)


class AbrirTicketView(discord.ui.View):
    """Botão (só na resposta efêmera) que abre o tíquete 'receber feedback saldo' pelo sistema de tíquetes."""

    def __init__(self) -> None:
        super().__init__(timeout=900)

    @discord.ui.button(label=textos.FEEDBACK_BOTAO_TICKET, emoji="💰", style=discord.ButtonStyle.success)
    async def abrir(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        tickets = interaction.client.get_cog("Tickets")  # type: ignore[attr-defined]
        if tickets is None:
            await interaction.response.send_message(textos.TICKET_SEM_PAINEL, ephemeral=True)
            return
        await tickets.abrir_ticket(interaction, "feedback")


class ControlesFeedbackView(discord.ui.View):
    """Dentro do tíquete: a staff entrega o código ou recusa."""

    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(label=textos.FEEDBACK_ENTREGAR, emoji="🎁", style=discord.ButtonStyle.success, custom_id="kiza:feedback:entregar")
    async def entregar(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Feedback")  # type: ignore[attr-defined]
        if cog is not None:
            await cog.acao_do_ticket(interaction, entregar=True)

    @discord.ui.button(label=textos.FEEDBACK_RECUSAR, emoji="✖️", style=discord.ButtonStyle.secondary, custom_id="kiza:feedback:recusar")
    async def recusar(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Feedback")  # type: ignore[attr-defined]
        if cog is not None:
            await cog.acao_do_ticket(interaction, entregar=False)


class PaginaCodigosView(discord.ui.View):
    def __init__(self, cog: "Feedback", autor_id: int, guild_id: int, pagina: int, total: int) -> None:
        super().__init__(timeout=180)
        self.cog, self.autor_id, self.guild_id, self.pagina, self.total = cog, autor_id, guild_id, pagina, total
        paginas = max(1, -(-total // POR_PAGINA))
        self.anterior.disabled = pagina <= 0
        self.proxima.disabled = pagina >= paginas - 1

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return interaction.user.id == self.autor_id

    @discord.ui.button(label="Anterior", emoji="⬅️", style=discord.ButtonStyle.secondary)
    async def anterior(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.cog.mostrar_pagina(interaction, self.pagina - 1, editar=True)

    @discord.ui.button(label="Próxima", emoji="➡️", style=discord.ButtonStyle.secondary)
    async def proxima(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.cog.mostrar_pagina(interaction, self.pagina + 1, editar=True)


class Feedback(commands.Cog):
    feedback = app_commands.Group(name="feedback", description="Feedback sobre o servidor.", guild_only=True)
    codigo = app_commands.Group(name="codigo", description="(Staff) Códigos de resgate de Caudas.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._ultimo_envio: dict[int, float] = {}

    def views_persistentes(self) -> list[discord.ui.View]:
        return [PainelFeedbackView(self), ControlesFeedbackView()]

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # ------------------------------------------------------------------ painel
    @staticmethod
    def embed_painel() -> discord.Embed:
        e = embed(textos.FEEDBACK_PAINEL_TITULO, textos.FEEDBACK_PAINEL_DESC.format(moeda=config.MOEDA_NOME), config.COR_PRINCIPAL)
        e.set_footer(text=textos.FEEDBACK_PAINEL_RODAPE)
        return e

    async def canal_fixo(self, guild: discord.Guild, chave: str, padrao: int) -> Optional[discord.TextChannel]:
        """Canal do /setup (`canal_<chave>`) ou, sem ele, o canal fixo do servidor."""
        canal_id = await self.bot.banco.get_config_int(guild.id, f"canal_{chave}") or padrao
        canal = guild.get_channel(canal_id)
        return canal if isinstance(canal, discord.TextChannel) else None

    async def canal_painel(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        return await self.canal_fixo(guild, "feedback", config.CANAL_DAR_FEEDBACK_ID)

    async def canal_feedbacks(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        return await self.canal_fixo(guild, "feedbacks", config.CANAL_FEEDBACKS_ID)

    async def publicar_painel(self, guild: discord.Guild) -> tuple[bool, str]:
        canal = await self.canal_painel(guild)
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        try:
            await publicar_ou_editar(
                self.bot, guild, canal, "feedback", embeds=[self.embed_painel()], view=PainelFeedbackView(self),
                mencoes=discord.AllowedMentions.none(),
            )
        except discord.HTTPException:
            log.warning("Falha ao publicar o painel de feedback", exc_info=True)
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    @staticmethod
    def permissoes_que_faltam(guild: discord.Guild, canal: discord.TextChannel) -> list[str]:
        perms = canal.permissions_for(guild.me)
        exigidas = {"view_channel": "ver o canal", "send_messages": "enviar mensagens", "embed_links": "inserir links (embeds)"}
        return [nome for chave, nome in exigidas.items() if not getattr(perms, chave)]

    @feedback.command(name="configurar", description="(Admin) Publica o painel de feedback e confere minhas permissões nos canais.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def configurar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        painel = await self.canal_painel(guild)
        destino = await self.canal_feedbacks(guild)
        linhas = []
        for canal, id_ in ((painel, config.CANAL_DAR_FEEDBACK_ID), (destino, config.CANAL_FEEDBACKS_ID)):
            if canal is None:
                linhas.append(textos.FEEDBACK_SEM_CANAL.format(canal=f"<#{id_}>"))
                continue
            faltam = self.permissoes_que_faltam(guild, canal)
            if faltam:
                linhas.append(textos.FEEDBACK_FALTA_PERM.format(canal=canal.mention, perms=", ".join(faltam)))
        if linhas:
            await interaction.followup.send("\n".join(linhas), ephemeral=True)
            return
        ok, info = await self.publicar_painel(guild)
        if not ok:
            await interaction.followup.send(textos.SETUP_PUBLICAR_FALTA.format(o_que="Feedback", motivo=info), ephemeral=True)
            return
        await interaction.followup.send(textos.FEEDBACK_CONFIGURADO.format(canal=info, destino=destino.mention), ephemeral=True)  # type: ignore[union-attr]

    @feedback.command(name="enviar", description="Conte o que você achou do servidor.")
    async def enviar(self, interaction: discord.Interaction) -> None:
        await self.abrir_formulario(interaction)

    async def abrir_formulario(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        if not await banco.ajuste(guild.id, "feedback_ligado"):
            await interaction.response.send_message(textos.FEEDBACK_DESLIGADO, ephemeral=True)
            return
        await interaction.response.send_modal(FeedbackModal(self, await banco.ajuste(guild.id, "feedback_min_caracteres")))

    # ------------------------------------------------------------------ envio
    async def receber(self, interaction: discord.Interaction, nota_bruta: str, texto: str, melhorar: str) -> None:
        guild, membro = interaction.guild, interaction.user
        assert guild is not None
        nota = ler_nota(nota_bruta)
        texto, melhorar = texto.strip(), melhorar.strip()
        if nota is None:
            await interaction.response.send_message(textos.FEEDBACK_NOTA_INVALIDA, ephemeral=True)
            return
        banco = self.bot.banco
        if not await banco.ajuste(guild.id, "feedback_ligado"):
            await interaction.response.send_message(textos.FEEDBACK_DESLIGADO, ephemeral=True)
            return
        minimo = await banco.ajuste(guild.id, "feedback_min_caracteres")
        if not texto_longo_o_bastante(texto, minimo):
            await interaction.response.send_message(textos.FEEDBACK_CURTO.format(min=minimo), ephemeral=True)
            return
        agora = time.monotonic()
        resta = await banco.ajuste(guild.id, "feedback_espera_seg") - (agora - self._ultimo_envio.get(membro.id, -1e9))
        if resta > 0:
            await interaction.response.send_message(textos.FEEDBACK_ESPERA.format(seg=int(resta) + 1), ephemeral=True)
            return
        self._ultimo_envio[membro.id] = agora
        banco = self.bot.banco
        ultimo = await banco.feedback_ultimo(guild.id, membro.id)
        liberado = int(time.time()) if ultimo is None else int(ultimo["criado_em"]) + await banco.ajuste(guild.id, "feedback_dias_novo") * DIA
        if ultimo is not None and liberado > time.time():
            await interaction.response.send_message(textos.FEEDBACK_RECENTE.format(quando=f"<t:{liberado}:R>"), ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        try:
            ja_recebeu = await banco.feedback_ja_ganhou_codigo(guild.id, membro.id)
            fid = await banco.feedback_registrar(guild.id, membro.id, nota, texto, melhorar)
        except Exception:
            log.exception("Falha ao gravar feedback")
            await interaction.followup.send(textos.FEEDBACK_ERRO, ephemeral=True)
            return
        await self._avisar_staff(guild, membro, fid, nota, texto, melhorar)
        if ja_recebeu:
            await interaction.followup.send(textos.FEEDBACK_SEM_CODIGO, ephemeral=True)
            return
        resposta = textos.FEEDBACK_OBRIGADA.format(link=textos.FEEDBACK_DISBOARD, moeda=config.MOEDA_NOME)
        await interaction.followup.send(resposta, ephemeral=True, view=AbrirTicketView())

    async def _avisar_staff(self, guild: discord.Guild, membro: discord.abc.User, fid: int, nota: int, texto: str, melhorar: str) -> None:
        """Posta o feedback no canal 'feedbacks' (sem menções que notifiquem)."""
        canal = await self.canal_feedbacks(guild)
        if canal is None:
            log.warning("Canal de feedbacks não encontrado")
            return
        e = embed(textos.FEEDBACK_LOG_TITULO, f"**{textos.FEEDBACK_LOG_ACHOU}**\n{texto[:1000]}", config.COR_INFO)
        e.add_field(name="Autor", value=membro.mention, inline=True)
        e.add_field(name="Nota", value="⭐" * nota + f" ({nota}/5)", inline=True)
        if melhorar:
            e.add_field(name=textos.FEEDBACK_LOG_MELHORAR, value=melhorar[:500], inline=False)
        e.add_field(name="Data", value=f"<t:{int(time.time())}:f>", inline=True)
        e.set_thumbnail(url=membro.display_avatar.url)
        e.set_footer(text=f"#{fid}")
        try:
            await canal.send(embed=e, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao postar o feedback no canal", exc_info=True)

    # ------------------------------------------------------------------ tíquete e entrega do código
    async def checar_ticket(self, guild: discord.Guild, membro: discord.abc.User) -> Optional[str]:
        """Texto de recusa para o tíquete 'receber feedback saldo', ou None se pode abrir."""
        banco = self.bot.banco
        if await banco.feedback_ja_ganhou_codigo(guild.id, membro.id):
            return textos.FEEDBACK_TICKET_JA_RECEBEU
        if await banco.feedback_pendente(guild.id, membro.id) is None:
            canal = await self.canal_painel(guild)
            return textos.FEEDBACK_TICKET_SEM_FEEDBACK.format(canal=canal.mention if canal else "#dar-feedback")
        return None

    async def ticket_aberto(self, canal: discord.TextChannel, autor: discord.Member) -> None:
        e = embed(textos.FEEDBACK_TICKET_TITULO, textos.FEEDBACK_TICKET_DESC.format(autor=autor.mention, moeda=config.MOEDA_NOME), config.COR_INFO)
        try:
            await canal.send(embed=e, view=ControlesFeedbackView(), allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao preparar o tíquete de feedback", exc_info=True)

    async def entregar(self, guild: discord.Guild, alvo_id: int, staff_id: int) -> Optional[tuple[str, bool]]:
        """Gera (ou reenvia) o código pessoal. None se a pessoa nunca mandou feedback."""
        return await self.bot.banco.feedback_entregar(guild.id, alvo_id, staff_id)

    async def texto_da_entrega(self, alvo_id: int, codigo: str, novo: bool) -> str:
        linha = await self.bot.banco.codigo_obter(codigo)
        validade = f"<t:{linha['expira_em']}:d>" if linha and linha["expira_em"] else textos.CODIGO_SEM_VALIDADE
        texto = textos.FEEDBACK_ENTREGUE.format(mencao=f"<@{alvo_id}>", moeda=config.MOEDA_NOME, codigo=codigo, validade=validade)
        return texto if novo else textos.FEEDBACK_REENVIADO + "\n" + texto

    async def acao_do_ticket(self, interaction: discord.Interaction, entregar: bool) -> None:
        guild, membro = interaction.guild, interaction.user
        if guild is None or not isinstance(membro, discord.Member) or interaction.channel_id is None:
            return
        if await nivel_do_membro(self.bot, membro) < config.NIVEL_STAFF:
            await interaction.response.send_message(textos.FEEDBACK_SO_STAFF, ephemeral=True)
            return
        ticket = await self.bot.banco.obter_ticket_por_canal(interaction.channel_id)
        if ticket is None or ticket["status"] != "aberto" or ticket["categoria"] != "feedback":
            await interaction.response.send_message(textos.TICKET_NAO_ENCONTRADO, ephemeral=True)
            return
        alvo = int(ticket["autor_id"])
        if not entregar:
            await self.bot.banco.feedback_recusar(guild.id, alvo)
            await interaction.response.send_message(
                textos.FEEDBACK_RECUSADO.format(mencao=f"<@{alvo}>"), allowed_mentions=discord.AllowedMentions(users=[discord.Object(alvo)])
            )
            return
        r = await self.entregar(guild, alvo, membro.id)
        if r is None:
            await interaction.response.send_message(textos.FEEDBACK_SEM_PEDIDO, ephemeral=True)
            return
        codigo, novo = r
        await interaction.response.send_message(
            await self.texto_da_entrega(alvo, codigo, novo), allowed_mentions=discord.AllowedMentions(users=[discord.Object(alvo)])
        )

    @feedback.command(name="liberar", description="(Staff) Entrega o código de feedback de um membro (ou reenvia o mesmo).")
    @exigir_nivel(config.NIVEL_STAFF)
    async def liberar(self, interaction: discord.Interaction, membro: discord.Member) -> None:
        guild = interaction.guild
        assert guild is not None
        r = await self.entregar(guild, membro.id, interaction.user.id)
        if r is None:
            await interaction.response.send_message(textos.FEEDBACK_LIBERAR_ALVO, ephemeral=True)
            return
        codigo, novo = r
        ticket = await self.bot.banco.obter_ticket_por_canal(interaction.channel_id) if interaction.channel_id else None
        if ticket is not None and ticket["status"] == "aberto" and int(ticket["autor_id"]) == membro.id:
            await interaction.response.send_message(
                await self.texto_da_entrega(membro.id, codigo, novo), allowed_mentions=discord.AllowedMentions(users=[membro])
            )
        else:
            await interaction.response.send_message(
                textos.FEEDBACK_ENTREGUE_FORA.format(mencao=membro.mention, codigo=codigo), ephemeral=True,
                allowed_mentions=discord.AllowedMentions.none(),
            )

    # ------------------------------------------------------------------ resgate (Discord)
    async def resgatar_para(self, guild: discord.Guild, user_id: int, codigo: str) -> ResultadoCodigo:
        """Resgate completo: confere a conta de Minecraft ligada, resgata e avisa a staff. Usado pelo Discord."""
        banco = self.bot.banco
        vinculo = await banco.mc_vinculo_de_usuario(guild.id, user_id)
        nome = vinculo["mc_nome"] if vinculo else ""
        r = await banco.resgatar_codigo(guild.id, user_id, nome, codigo)
        if r.ok:
            await self.avisar_resgate(guild, user_id, normalizar_codigo(codigo), r.caudas, nome)
        return r

    async def avisar_resgate(self, guild: discord.Guild, user_id: int, codigo: str, caudas: int, nome: str) -> None:
        try:
            await enviar_log(
                self.bot, guild, "logs_gerais",
                embed=embed(None, textos.CODIGO_LOG.format(mencao=f"<@{user_id}>", codigo=codigo, caudas=caudas, nome=nome), config.COR_INFO),
            )
        except Exception:
            log.warning("Falha ao avisar o resgate de código", exc_info=True)

    @app_commands.command(name="resgatar", description="Troque um código por Caudas (precisa da conta do Minecraft ligada).")
    @app_commands.guild_only()
    @app_commands.describe(codigo="O código, por exemplo VULPUS-ABCD-EFGH")
    async def resgatar(self, interaction: discord.Interaction, codigo: str) -> None:
        guild = interaction.guild
        assert guild is not None
        try:
            r = await self.resgatar_para(guild, interaction.user.id, codigo)
        except Exception:
            log.exception("Falha ao resgatar código")
            await interaction.response.send_message(textos.CODIGO_RESGATAR_ERRO, ephemeral=True)
            return
        cor = config.COR_OK if r.ok else config.COR_ERRO
        extra = f"\nSaldo agora: {formatar_moeda(r.saldo)}. No jogo, aparece em instantes." if r.ok else ""
        await interaction.response.send_message(embed=embed(None, mensagem_do_resultado(r) + extra, cor), ephemeral=True)

    # ------------------------------------------------------------------ códigos (staff)
    @codigo.command(name="criar", description="Cria um código de resgate de Caudas.")
    @app_commands.describe(
        caudas="Quantas Caudas o código dá", codigo="O código (vazio = eu gero um)", usos_max="Quantas pessoas podem usar (0 = ilimitado)",
        dias_validade="Dias até expirar (0 = nunca)", motivo="Para que serve (só a staff vê)",
    )
    @exigir_nivel(config.NIVEL_ADMIN)
    async def criar(
        self, interaction: discord.Interaction, caudas: app_commands.Range[int, 1, 1_000_000], codigo: Optional[str] = None,
        usos_max: app_commands.Range[int, 0, 100_000] = 1, dias_validade: app_commands.Range[int, 0, 3650] = 0, motivo: str = "",
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        pedido = normalizar_codigo(codigo) if codigo and codigo.strip() else None
        if pedido is not None and not codigo_valido(pedido):
            await interaction.response.send_message(textos.CODIGO_INVALIDO, ephemeral=True)
            return
        criado = await self.bot.banco.codigo_criar(
            guild.id, caudas, codigo=pedido, usos_max=usos_max, dias_validade=dias_validade, criado_por=interaction.user.id, motivo=motivo
        )
        if criado is None:
            await interaction.response.send_message(textos.CODIGO_JA_EXISTE, ephemeral=True)
            return
        usos = textos.CODIGO_USOS_ILIMITADOS if usos_max == 0 else textos.CODIGO_USOS_N.format(n=usos_max)
        validade = textos.CODIGO_VALE_ATE.format(quando=f"<t:{int(time.time()) + dias_validade * DIA}:d>") if dias_validade else textos.CODIGO_SEM_VALIDADE
        await interaction.response.send_message(textos.CODIGO_CRIADO.format(codigo=criado, caudas=caudas, usos=usos, validade=validade), ephemeral=True)

    async def mostrar_pagina(self, interaction: discord.Interaction, pagina: int, editar: bool = False) -> None:
        guild = interaction.guild
        assert guild is not None
        total = await self.bot.banco.codigo_contar(guild.id)
        paginas = max(1, -(-total // POR_PAGINA))
        pagina = min(max(0, pagina), paginas - 1)
        linhas = await self.bot.banco.codigo_listar(guild.id, POR_PAGINA, pagina * POR_PAGINA)
        agora = int(time.time())
        descricao = "\n".join(linha_da_lista(c, agora) for c in linhas) or textos.CODIGO_LISTA_VAZIA
        e = embed(textos.CODIGO_LISTA_TITULO.format(total=total), descricao, config.COR_INFO)
        e.set_footer(text=f"Página {pagina + 1}/{paginas} · 🟢 ativo ⛔ desativado ⌛ expirou ✅ esgotado")
        view = PaginaCodigosView(self, interaction.user.id, guild.id, pagina, total)
        if editar:
            await interaction.response.edit_message(embed=e, view=view)
        else:
            await interaction.response.send_message(embed=e, view=view, ephemeral=True, allowed_mentions=discord.AllowedMentions.none())

    @codigo.command(name="listar", description="Lista os códigos (os ativos primeiro).")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def listar(self, interaction: discord.Interaction) -> None:
        await self.mostrar_pagina(interaction, 0)

    @codigo.command(name="desativar", description="Desativa um código.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def desativar(self, interaction: discord.Interaction, codigo: str) -> None:
        guild = interaction.guild
        assert guild is not None
        ok = await self.bot.banco.codigo_desativar(guild.id, codigo)
        texto = textos.CODIGO_DESATIVADO.format(codigo=normalizar_codigo(codigo)) if ok else textos.CODIGO_NAO_ACHEI
        await interaction.response.send_message(texto, ephemeral=True)

    @codigo.command(name="usos", description="Quem usou um código.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def usos(self, interaction: discord.Interaction, codigo: str) -> None:
        guild = interaction.guild
        assert guild is not None
        linha = await self.bot.banco.codigo_obter(codigo)
        if linha is None or int(linha["guild_id"]) != guild.id:
            await interaction.response.send_message(textos.CODIGO_NAO_ACHEI, ephemeral=True)
            return
        usos = await self.bot.banco.codigo_usos(linha["codigo"])
        corpo = "\n".join(
            f"<@{u['user_id']}> · {discord.utils.escape_markdown(u['mc_nome'])} · <t:{u['quando']}:f>" for u in usos[:40]
        ) or textos.CODIGO_USOS_VAZIO
        e = embed(textos.CODIGO_USOS_TITULO.format(codigo=linha["codigo"]), linha_da_lista(linha, int(time.time())) + "\n\n" + corpo, config.COR_INFO)
        await interaction.response.send_message(embed=e, ephemeral=True, allowed_mentions=discord.AllowedMentions.none())


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Feedback(bot))
