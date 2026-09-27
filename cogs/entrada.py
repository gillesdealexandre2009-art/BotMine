"""Boas-vindas, adeus, autorole (Visitante), regras e verificação (Visitante -> Membro)."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands

import config
import textos
from utils.helpers import embed, enviar_log, pode_gerenciar_cargo, publicar_ou_editar, responder
from utils.views import BaseView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.entrada")


class VerificacaoView(BaseView):
    """Botão persistente 'Li e aceito'."""

    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(
        label=textos.VERIFICACAO_BOTAO, emoji="🦊", style=discord.ButtonStyle.success, custom_id="kiza:verificar"
    )
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        guild, membro = interaction.guild, interaction.user
        if guild is None or not isinstance(membro, discord.Member):
            return
        banco = interaction.client.banco  # type: ignore[attr-defined]

        id_membro = await banco.get_config_int(guild.id, "cargo_membro")
        cargo_membro = guild.get_role(id_membro) if id_membro else None
        if cargo_membro is None:
            await responder(interaction, textos.VERIFICACAO_SEM_CARGO)
            return
        if cargo_membro in membro.roles:
            await responder(interaction, textos.VERIFICACAO_JA)
            return

        id_visitante = await banco.get_config_int(guild.id, "cargo_visitante")
        cargo_visitante = guild.get_role(id_visitante) if id_visitante else None
        try:
            await membro.add_roles(cargo_membro, reason="Kiza: aceitou as regras")
            if cargo_visitante is not None and cargo_visitante in membro.roles:
                await membro.remove_roles(cargo_visitante, reason="Kiza: aceitou as regras")
        except discord.Forbidden:
            await responder(interaction, textos.VERIFICACAO_ERRO_PERM)
            return

        await responder(interaction, textos.VERIFICACAO_OK)
        e = embed("✅ Verificação concluída", f"{membro.mention} aceitou as regras.", config.COR_OK)
        await enviar_log(interaction.client, guild, "logs_gerais", embed=e)  # type: ignore[arg-type]


class Entrada(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    def views_persistentes(self) -> list[discord.ui.View]:
        return [VerificacaoView()]

    async def _canal(self, guild: discord.Guild, chave: str) -> Optional[discord.TextChannel]:
        canal_id = await self.bot.banco.get_config_int(guild.id, f"canal_{chave}")
        canal = guild.get_channel(canal_id) if canal_id else None
        return canal if isinstance(canal, discord.TextChannel) else None

    # ------------------------------------------------------------------ eventos
    @commands.Cog.listener()
    async def on_member_join(self, membro: discord.Member) -> None:
        if membro.bot:
            return
        guild, banco = membro.guild, self.bot.banco
        if await banco.get_config(guild.id, "raid_ativo") == "1":
            return  # o módulo de automod barra a entrada

        # autorole Visitante
        id_visitante = await banco.get_config_int(guild.id, "cargo_visitante")
        cargo = guild.get_role(id_visitante) if id_visitante else None
        if cargo is not None:
            if pode_gerenciar_cargo(guild, cargo):
                try:
                    await membro.add_roles(cargo, reason="Kiza: autorole")
                except discord.HTTPException:
                    log.warning("Falha ao dar o cargo Visitante a %s", membro.id, exc_info=True)
            else:
                log.warning("Não consigo gerenciar o cargo Visitante em %s (hierarquia)", guild.id)

        # boas-vindas
        canal = await self._canal(guild, "boas_vindas")
        if canal is None:
            return
        id_regras = await banco.get_config_int(guild.id, "canal_regras")
        canal_regras = f"<#{id_regras}>" if id_regras else textos.BOAS_VINDAS_CANAL_REGRAS_PADRAO
        e = embed(
            textos.BOAS_VINDAS_TITULO,
            textos.BOAS_VINDAS_DESC.format(mencao=membro.mention, servidor=guild.name, canal_regras=canal_regras),
        )
        e.set_thumbnail(url=membro.display_avatar.url)
        e.set_footer(text=textos.BOAS_VINDAS_RODAPE.format(n=guild.member_count or "?"))
        try:
            await canal.send(
                content=membro.mention, embed=e, allowed_mentions=discord.AllowedMentions(users=[membro])
            )
        except discord.HTTPException:
            log.warning("Falha ao enviar boas-vindas em %s", guild.id, exc_info=True)

    @commands.Cog.listener()
    async def on_member_remove(self, membro: discord.Member) -> None:
        if membro.bot:
            return
        canal = await self._canal(membro.guild, "adeus")
        if canal is None:
            return
        e = embed(textos.ADEUS_TITULO, textos.ADEUS_DESC.format(nome=membro.display_name), config.COR_AVISO)
        e.set_thumbnail(url=membro.display_avatar.url)
        try:
            await canal.send(embed=e, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao enviar adeus em %s", membro.guild.id, exc_info=True)

    # ------------------------------------------------------------------ publicação (usada pelo /setup)
    async def publicar_regras(self, guild: discord.Guild) -> tuple[bool, str]:
        canal = await self._canal(guild, "regras")
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        e = embed(textos.REGRAS_TITULO, textos.REGRAS_INTRO)
        for titulo, texto in textos.REGRAS:
            e.add_field(name=titulo, value=texto, inline=False)
        e.set_footer(text=textos.REGRAS_RODAPE)
        try:
            await publicar_ou_editar(self.bot, guild, canal, "regras", embeds=[e])
        except discord.HTTPException:
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    async def publicar_verificacao(self, guild: discord.Guild) -> tuple[bool, str]:
        canal = await self._canal(guild, "verificacao")
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        e = embed(textos.VERIFICACAO_TITULO, textos.VERIFICACAO_DESC)
        try:
            await publicar_ou_editar(self.bot, guild, canal, "verificacao", embeds=[e], view=VerificacaoView())
        except discord.HTTPException:
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    async def publicar_aviso_status(self, guild: discord.Guild) -> tuple[bool, str]:
        """Publica um embed fixo e editável de 'em construção' (ex.: status de um addon futuro)."""
        canal = await self._canal(guild, "aviso_status")
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        e = embed(textos.AVISO_STATUS_TITULO, textos.AVISO_STATUS_DESC, config.COR_AVISO)
        try:
            await publicar_ou_editar(self.bot, guild, canal, "aviso_status", embeds=[e])
        except discord.HTTPException:
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Entrada(bot))
