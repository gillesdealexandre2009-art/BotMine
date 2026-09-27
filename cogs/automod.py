"""Automod leve (antispam, convites, links, menções em massa) e modo raid (/raid).

Ignora Staff e acima. Ação: apagar + avisar + (após várias infrações) timeout curto, sempre com log.
Tudo configurável com /ajustes (automod_*).
"""
from __future__ import annotations

import logging
import re
import time
from collections import defaultdict, deque
from datetime import timedelta
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from cogs.moderacao import registrar_caso
from utils.helpers import embed, enviar_log, responder, truncar
from utils.permissoes import exigir_nivel, nivel_do_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.automod")
CONVITE_RE = re.compile(r"(?:https?://)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com/invite)/[A-Za-z0-9-]+", re.I)
LINK_RE = re.compile(r"https?://\S+", re.I)
JANELA_STRIKES_S = 120


class Automod(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._mensagens: defaultdict[tuple[int, int], deque[tuple[float, str]]] = defaultdict(deque)
        self._strikes: defaultdict[tuple[int, int], deque[float]] = defaultdict(deque)

    # ------------------------------------------------------------------ detecção
    async def _detectar(self, mensagem: discord.Message) -> Optional[str]:
        guild, banco = mensagem.guild, self.bot.banco
        assert guild is not None
        conteudo = mensagem.content or ""

        if await banco.ajuste(guild.id, "automod_mencoes") == 1:
            total = len(set(mensagem.mentions)) + len(set(mensagem.role_mentions))
            if mensagem.mention_everyone or total > await banco.ajuste(guild.id, "automod_mencoes_max"):
                return "mencoes"
        if await banco.ajuste(guild.id, "automod_convites") == 1 and CONVITE_RE.search(conteudo):
            return "convite"
        if await banco.ajuste(guild.id, "automod_links") == 1 and LINK_RE.search(conteudo):
            return "link"
        if await banco.ajuste(guild.id, "automod_antispam") == 1:
            chave = (guild.id, mensagem.author.id)
            agora = time.monotonic()
            janela = await banco.ajuste(guild.id, "automod_spam_janela")
            historico = self._mensagens[chave]
            historico.append((agora, conteudo.strip().lower()))
            while historico and agora - historico[0][0] > janela:
                historico.popleft()
            repetidas = sum(1 for _, c in historico if c and c == conteudo.strip().lower())
            if len(historico) > await banco.ajuste(guild.id, "automod_spam_msgs") or repetidas >= 4:
                return "spam"
        return None

    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.guild is None or mensagem.author.bot or not isinstance(mensagem.author, discord.Member):
            return
        if await nivel_do_membro(self.bot, mensagem.author) >= config.NIVEL_STAFF:
            return
        motivo = await self._detectar(mensagem)
        if motivo is not None:
            await self._punir(mensagem, motivo)

    # ------------------------------------------------------------------ ação
    async def _punir(self, mensagem: discord.Message, motivo: str) -> None:
        guild, autor, banco = mensagem.guild, mensagem.author, self.bot.banco
        assert guild is not None and isinstance(autor, discord.Member)
        descricao_motivo = textos.AUTOMOD_MOTIVOS[motivo]

        try:
            await mensagem.delete()
        except discord.HTTPException:
            pass
        try:
            await mensagem.channel.send(
                textos.AUTOMOD_AVISO.format(mencao=autor.mention, motivo=descricao_motivo),
                delete_after=8,
                allowed_mentions=discord.AllowedMentions(users=[autor]),
            )
        except discord.HTTPException:
            pass

        e = embed("🤖 Automod", f"{autor.mention} em {mensagem.channel.mention}", config.COR_AVISO)  # type: ignore[union-attr]
        e.add_field(name="Motivo", value=motivo)
        if mensagem.content:
            e.add_field(name="Mensagem", value=truncar(mensagem.content, 800), inline=False)
        e.timestamp = discord.utils.utcnow()
        await enviar_log(self.bot, guild, "logs_mod", embed=e)

        chave = (guild.id, autor.id)
        agora = time.monotonic()
        strikes = self._strikes[chave]
        strikes.append(agora)
        while strikes and agora - strikes[0] > JANELA_STRIKES_S:
            strikes.popleft()
        if len(strikes) < await banco.ajuste(guild.id, "automod_strikes"):
            return

        strikes.clear()
        duracao = await banco.ajuste(guild.id, "automod_timeout_min") * 60
        try:
            await autor.timeout(
                timedelta(seconds=duracao), reason=textos.AUTOMOD_TIMEOUT_MOTIVO.format(motivo=motivo)
            )
        except discord.HTTPException:
            log.warning("Automod não conseguiu aplicar timeout em %s", autor.id, exc_info=True)
            return
        await registrar_caso(
            self.bot,
            guild,
            "automod",
            autor.id,
            self.bot.user.id,  # type: ignore[union-attr]
            textos.AUTOMOD_TIMEOUT_MOTIVO.format(motivo=motivo),
            duracao,
        )
        try:  # limpa o que sobrou do flood recente
            await mensagem.channel.purge(  # type: ignore[union-attr]
                limit=30,
                check=lambda m: m.author.id == autor.id and (discord.utils.utcnow() - m.created_at).total_seconds() < 90,
            )
        except discord.HTTPException:
            pass

    # ------------------------------------------------------------------ modo raid
    raid = app_commands.Group(name="raid", description="Modo de proteção contra raids.", guild_only=True)

    @raid.command(name="ligar", description="Barra novos membros até você desligar.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def raid_ligar(self, interaction: discord.Interaction) -> None:
        await self.bot.banco.set_config(interaction.guild_id, "raid_ativo", "1")  # type: ignore[arg-type]
        e = embed("🚨 Modo raid ligado", f"Por {interaction.user.mention}", config.COR_ERRO)
        await enviar_log(self.bot, interaction.guild, "logs_mod", embed=e)  # type: ignore[arg-type]
        await responder(interaction, textos.RAID_LIGADO)

    @raid.command(name="desligar", description="Volta a aceitar novos membros.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def raid_desligar(self, interaction: discord.Interaction) -> None:
        await self.bot.banco.set_config(interaction.guild_id, "raid_ativo", None)  # type: ignore[arg-type]
        e = embed("✅ Modo raid desligado", f"Por {interaction.user.mention}", config.COR_OK)
        await enviar_log(self.bot, interaction.guild, "logs_mod", embed=e)  # type: ignore[arg-type]
        await responder(interaction, textos.RAID_DESLIGADO)

    @raid.command(name="status", description="Mostra se o modo raid está ligado.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def raid_status(self, interaction: discord.Interaction) -> None:
        ligado = await self.bot.banco.get_config(interaction.guild_id, "raid_ativo") == "1"  # type: ignore[arg-type]
        await responder(interaction, textos.RAID_STATUS_LIGADO if ligado else textos.RAID_STATUS_DESLIGADO)

    @commands.Cog.listener()
    async def on_member_join(self, membro: discord.Member) -> None:
        if membro.bot or await self.bot.banco.get_config(membro.guild.id, "raid_ativo") != "1":
            return
        try:
            await membro.send(textos.RAID_KICK_DM.format(servidor=membro.guild.name))
        except discord.HTTPException:
            pass
        try:
            await membro.kick(reason="Kiza: modo raid ligado")
            resultado = "expulso(a) pelo modo raid"
        except discord.HTTPException:
            resultado = "**não consegui** expulsar (confira minhas permissões)"
        e = embed("🚨 Entrada barrada", f"{membro.mention} (`{membro.id}`) foi {resultado}.", config.COR_ERRO)
        await enviar_log(self.bot, membro.guild, "logs_mod", embed=e)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Automod(bot))
