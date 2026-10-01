"""Tickets: canal privado por categoria, assumir/fechar (com confirmação), transcrição e lembrete de SLA."""
from __future__ import annotations

import asyncio
import io
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands, tasks

import config
import textos
from database import agora
from utils.helpers import TZ, com_banner, embed, enviar_log, publicar_ou_editar, responder, slug
from utils.permissoes import eh_membro, nivel_do_membro
from utils.views import BaseView, DonoView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.tickets")
CATEGORIAS = {c[0]: c for c in config.CATEGORIAS_TICKET}
LIMITE_TRANSCRICAO = 5000


# ============================================================================ views
class BotaoCategoria(discord.ui.Button):
    def __init__(self, chave: str, rotulo: str, emoji: str) -> None:
        super().__init__(
            label=rotulo, emoji=emoji, style=discord.ButtonStyle.primary, custom_id=f"kiza:ticket:abrir:{chave}"
        )
        self.chave = chave

    async def callback(self, interaction: discord.Interaction) -> None:
        cog = interaction.client.get_cog("Tickets")
        if cog is not None:
            await cog.abrir_ticket(interaction, self.chave)  # type: ignore[attr-defined]


class PainelTicketsView(BaseView):
    def __init__(self) -> None:
        super().__init__(timeout=None)
        for chave, rotulo, emoji, _ in config.CATEGORIAS_TICKET:
            self.add_item(BotaoCategoria(chave, rotulo, emoji))


class ControlesTicketView(BaseView):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(label="Assumir", emoji="🙋", style=discord.ButtonStyle.success, custom_id="kiza:ticket:assumir")
    async def assumir(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Tickets")
        if cog is not None:
            await cog.assumir(interaction)  # type: ignore[attr-defined]

    @discord.ui.button(label="Fechar", emoji="🔒", style=discord.ButtonStyle.danger, custom_id="kiza:ticket:fechar")
    async def fechar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Tickets")
        if cog is not None:
            await cog.pedir_fechamento(interaction)  # type: ignore[attr-defined]


class ConfirmarFechamentoView(DonoView):
    def __init__(self, cog: "Tickets", dono_id: int, ticket) -> None:
        super().__init__(dono_id, timeout=60)
        self.cog = cog
        self.ticket = ticket

    @discord.ui.button(label="Sim, fechar", emoji="🔒", style=discord.ButtonStyle.danger)
    async def sim(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        self.stop()
        await self.cog.executar_fechamento(interaction, self.ticket)

    @discord.ui.button(label="Não", style=discord.ButtonStyle.secondary)
    async def nao(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        self.stop()
        await interaction.response.edit_message(content=textos.TICKET_CANCELADO, view=None)


# ============================================================================ cog
class Tickets(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._locks: defaultdict[tuple[int, int], asyncio.Lock] = defaultdict(asyncio.Lock)
        self._fechando: set[int] = set()

    async def cog_load(self) -> None:
        self.checar_sla.start()

    async def cog_unload(self) -> None:
        self.checar_sla.cancel()

    def views_persistentes(self) -> list[discord.ui.View]:
        return [PainelTicketsView(), ControlesTicketView()]

    async def _cargos_staff(self, guild: discord.Guild) -> list[discord.Role]:
        mapa = await self.bot.banco.mapa_niveis(guild.id)
        return [r for r in (guild.get_role(i) for i, n in mapa.items() if n >= 2) if r is not None]

    # ------------------------------------------------------------------ painel
    async def publicar_painel(self, guild: discord.Guild) -> tuple[bool, str]:
        canal_id = await self.bot.banco.get_config_int(guild.id, "canal_tickets")
        canal = guild.get_channel(canal_id) if canal_id else None
        if not isinstance(canal, discord.TextChannel):
            return False, textos.SETUP_SEM_CANAL
        lista = "\n".join(f"{emoji} **{rotulo}** — {desc}" for _, rotulo, emoji, desc in config.CATEGORIAS_TICKET)
        e = embed(textos.TICKET_PAINEL_TITULO, textos.TICKET_PAINEL_DESC.format(lista=lista))
        embeds, arquivos = com_banner("tickets", [e])
        try:
            await publicar_ou_editar(
                self.bot, guild, canal, "painel_tickets", embeds=embeds, view=PainelTicketsView(), arquivos=arquivos
            )
        except discord.HTTPException:
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    # ------------------------------------------------------------------ abrir
    async def abrir_ticket(self, interaction: discord.Interaction, categoria: str) -> None:
        await interaction.response.defer(ephemeral=True)  # criar canal pode passar de 3s
        guild, membro = interaction.guild, interaction.user
        if guild is None or not isinstance(membro, discord.Member) or categoria not in CATEGORIAS:
            return
        banco = self.bot.banco
        rotulo = CATEGORIAS[categoria][1]

        if not await eh_membro(self.bot, membro):
            await responder(interaction, textos.TICKET_SO_MEMBROS)
            return
        painel_id = await banco.get_config_int(guild.id, "canal_tickets")
        painel = guild.get_channel(painel_id) if painel_id else None
        if not isinstance(painel, discord.TextChannel):
            await responder(interaction, textos.TICKET_SEM_PAINEL)
            return

        async with self._locks[(guild.id, membro.id)]:
            existente = await banco.ticket_aberto_do_autor(guild.id, membro.id, categoria)
            if existente is not None:
                canal_existente = guild.get_channel(existente["canal_id"])
                if canal_existente is not None:
                    await responder(
                        interaction, textos.TICKET_JA_TEM.format(categoria=rotulo, canal=canal_existente.mention)
                    )
                    return
                await banco.fechar_ticket(existente["canal_id"])  # canal sumiu: limpa o registro

            staff = await self._cargos_staff(guild)
            leitura = discord.PermissionOverwrite(
                view_channel=True, send_messages=True, attach_files=True, embed_links=True, read_message_history=True
            )
            overwrites: dict = {
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                guild.me: discord.PermissionOverwrite(
                    view_channel=True,
                    send_messages=True,
                    manage_channels=True,
                    manage_messages=True,
                    embed_links=True,
                    attach_files=True,
                    read_message_history=True,
                ),
                membro: leitura,
            }
            for cargo in staff:
                overwrites[cargo] = discord.PermissionOverwrite(
                    view_channel=True,
                    send_messages=True,
                    manage_messages=True,
                    attach_files=True,
                    embed_links=True,
                    read_message_history=True,
                )
            try:
                canal = await guild.create_text_channel(
                    f"{categoria}-{slug(membro.display_name, 16)}",
                    category=painel.category,
                    overwrites=overwrites,
                    topic=f"Ticket de {membro} ({membro.id}) • {rotulo}",
                    reason=f"Kiza: ticket de {membro}",
                )
            except discord.HTTPException:
                log.warning("Falha ao criar canal de ticket", exc_info=True)
                await responder(interaction, textos.TICKET_ERRO_CRIAR)
                return

            ticket_id = await banco.criar_ticket(guild.id, canal.id, membro.id, categoria)
            if ticket_id is None:  # corrida: outro clique criou antes
                try:
                    await canal.delete(reason="Kiza: ticket duplicado")
                except discord.HTTPException:
                    pass
                await responder(interaction, textos.TICKET_ERRO_CRIAR)
                return

        ping_staff = await banco.ajuste(guild.id, "ticket_ping_staff") == 1
        mencoes = [membro.mention] + ([c.mention for c in staff] if ping_staff else [])
        e = embed(
            textos.TICKET_ABERTO_TITULO.format(categoria=rotulo), textos.TICKET_ABERTO_DESC.format(autor=membro.mention)
        )
        e.set_footer(text=f"Ticket #{ticket_id}")
        try:
            await canal.send(
                content=" ".join(mencoes),
                embed=e,
                view=ControlesTicketView(),
                allowed_mentions=discord.AllowedMentions(users=[membro], roles=staff if ping_staff else []),
            )
        except discord.HTTPException:
            log.warning("Falha ao postar a mensagem inicial do ticket", exc_info=True)
        await responder(interaction, textos.TICKET_CRIADO.format(canal=canal.mention))

    # ------------------------------------------------------------------ assumir
    async def assumir(self, interaction: discord.Interaction) -> None:
        membro = interaction.user
        if not isinstance(membro, discord.Member) or interaction.channel_id is None:
            return
        ticket = await self.bot.banco.obter_ticket_por_canal(interaction.channel_id)
        if ticket is None or ticket["status"] != "aberto":
            await responder(interaction, textos.TICKET_NAO_ENCONTRADO)
            return
        if await nivel_do_membro(self.bot, membro) < config.NIVEL_STAFF:
            await responder(interaction, textos.TICKET_SO_STAFF_ASSUMIR)
            return
        if not await self.bot.banco.assumir_ticket(interaction.channel_id, membro.id):
            atual = (await self.bot.banco.obter_ticket_por_canal(interaction.channel_id))["assumido_por"]
            await responder(interaction, textos.TICKET_JA_ASSUMIDO.format(staff=f"<@{atual}>"))
            return
        await interaction.response.send_message(
            textos.TICKET_ASSUMIDO.format(staff=membro.mention), allowed_mentions=discord.AllowedMentions.none()
        )

    # ------------------------------------------------------------------ fechar
    async def pedir_fechamento(self, interaction: discord.Interaction) -> None:
        membro, guild = interaction.user, interaction.guild
        if not isinstance(membro, discord.Member) or guild is None or interaction.channel_id is None:
            return
        ticket = await self.bot.banco.obter_ticket_por_canal(interaction.channel_id)
        if ticket is None or ticket["status"] != "aberto":
            await responder(interaction, textos.TICKET_NAO_ENCONTRADO)
            return
        if membro.id != ticket["autor_id"] and await nivel_do_membro(self.bot, membro) < config.NIVEL_STAFF:
            await responder(interaction, textos.TICKET_SEM_PERM_FECHAR)
            return
        texto = textos.TICKET_CONFIRMAR_FECHAR
        if not await self._log_configurado(guild):
            texto += textos.TICKET_SEM_LOGS
        await interaction.response.send_message(
            texto, view=ConfirmarFechamentoView(self, membro.id, ticket), ephemeral=True
        )

    async def _log_configurado(self, guild: discord.Guild) -> bool:
        canal_id = await self.bot.banco.get_config_int(guild.id, "canal_logs_mod")
        return bool(canal_id and guild.get_channel(canal_id) is not None)

    async def _gerar_transcricao(self, canal: discord.TextChannel, ticket) -> str:
        linhas = [
            f"Ticket #{ticket['id']} • categoria: {ticket['categoria']} • canal: #{canal.name}",
            f"Autor: {ticket['autor_id']}",
            f"Gerado em {datetime.now(TZ):%d/%m/%Y %H:%M} (horário de Brasília)",
            "-" * 60,
        ]
        contador = 0
        async for msg in canal.history(limit=LIMITE_TRANSCRICAO, oldest_first=True):
            contador += 1
            quando = msg.created_at.astimezone(TZ).strftime("%d/%m/%Y %H:%M")
            conteudo = msg.content or ("[embed]" if msg.embeds else "")
            anexos = " ".join(a.url for a in msg.attachments)
            linhas.append(f"[{quando}] {msg.author} ({msg.author.id}): {conteudo} {anexos}".rstrip())
        if contador >= LIMITE_TRANSCRICAO:
            linhas.append(f"[transcrição limitada às primeiras {LIMITE_TRANSCRICAO} mensagens]")
        return "\n".join(linhas)

    async def executar_fechamento(self, interaction: discord.Interaction, ticket) -> None:
        canal, guild, quem = interaction.channel, interaction.guild, interaction.user
        if not isinstance(canal, discord.TextChannel) or guild is None:
            return
        if canal.id in self._fechando:
            await interaction.response.edit_message(content="🔒 Já estou fechando este ticket…", view=None)
            return
        self._fechando.add(canal.id)
        try:
            await interaction.response.edit_message(content="🔒 Fechando…", view=None)
            log_configurado = await self._log_configurado(guild)
            if log_configurado:
                texto = await self._gerar_transcricao(canal, ticket)
                arquivo = discord.File(io.BytesIO(texto.encode("utf-8")), filename=f"ticket-{ticket['id']}.txt")
                e = embed(textos.TICKET_TRANSCRICAO_TITULO.format(id=ticket["id"]), None)
                e.add_field(name="Categoria", value=CATEGORIAS.get(ticket["categoria"], ("", ticket["categoria"]))[1])
                e.add_field(name="Aberto por", value=f"<@{ticket['autor_id']}>")
                if ticket["assumido_por"]:
                    e.add_field(name="Atendido por", value=f"<@{ticket['assumido_por']}>")
                e.add_field(name="Fechado por", value=quem.mention)
                if not await enviar_log(self.bot, guild, "logs_mod", embed=e, arquivo=arquivo):
                    # Nunca apagamos a conversa se não conseguimos guardá-la.
                    await interaction.followup.send(
                        "⚠️ Não consegui enviar a transcrição para o canal de logs, então **mantive o ticket aberto**. "
                        "Confira minhas permissões lá e tente fechar de novo.",
                        ephemeral=True,
                    )
                    return
            await self.bot.banco.fechar_ticket(canal.id)
            try:
                await canal.send(
                    textos.TICKET_FECHANDO.format(quem=quem.mention), allowed_mentions=discord.AllowedMentions.none()
                )
                await asyncio.sleep(5)
                await canal.delete(reason=f"Kiza: ticket #{ticket['id']} fechado por {quem}")
            except discord.HTTPException:
                log.warning("Falha ao finalizar o ticket %s", ticket["id"], exc_info=True)
        finally:
            self._fechando.discard(canal.id)

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, canal: discord.abc.GuildChannel) -> None:
        await self.bot.banco.fechar_ticket(canal.id)  # sem efeito se não era ticket

    # ------------------------------------------------------------------ SLA
    @tasks.loop(minutes=10)
    async def checar_sla(self) -> None:
        try:
            for guild in self.bot.guilds:
                minutos = await self.bot.banco.ajuste(guild.id, "ticket_sla_min")
                if minutos <= 0:
                    continue
                pendentes = await self.bot.banco.tickets_para_sla(guild.id, agora() - minutos * 60)
                if not pendentes:
                    continue
                staff = await self._cargos_staff(guild)
                for ticket in pendentes:
                    canal = guild.get_channel(ticket["canal_id"])
                    if canal is None:
                        await self.bot.banco.fechar_ticket(ticket["canal_id"])
                        continue
                    try:
                        await canal.send(  # type: ignore[union-attr]
                            textos.TICKET_SLA.format(staff=" ".join(c.mention for c in staff) or "Staff", min=minutos),
                            allowed_mentions=discord.AllowedMentions(roles=staff),
                        )
                    except discord.HTTPException:
                        log.warning("Falha ao lembrar do ticket %s", ticket["id"], exc_info=True)
                    await self.bot.banco.marcar_sla_avisado(ticket["id"])
        except Exception:
            log.exception("Erro no lembrete de SLA dos tickets")

    @checar_sla.before_loop
    async def _antes_do_sla(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Tickets(bot))
