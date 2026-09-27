"""/ajuda e /status."""
from __future__ import annotations

import platform
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import embed, formatar_duracao
from utils.permissoes import nivel_do_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza


class Geral(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    @app_commands.command(name="ajuda", description="Mostra o que a Kiza sabe fazer.")
    @app_commands.guild_only()
    async def ajuda(self, interaction: discord.Interaction) -> None:
        nivel = 0
        if isinstance(interaction.user, discord.Member):
            nivel = await nivel_do_membro(self.bot, interaction.user)
        e = embed(textos.AJUDA_TITULO, textos.AJUDA_INTRO)
        chaves = ["membro", "diversao", "suporte"]
        if nivel >= config.NIVEL_HELPER:
            chaves.append("helper")
        if nivel >= config.NIVEL_STAFF:
            chaves.append("staff")
        if nivel >= config.NIVEL_ADMIN:
            chaves.append("admin")
        for chave in chaves:
            nome, valor = textos.AJUDA_CAMPOS[chave]
            e.add_field(name=nome, value=valor.replace("{moeda}", config.MOEDA_NOME), inline=False)
        e.set_footer(text=f"{textos.NOME_BOT} v{config.VERSAO}")
        await interaction.response.send_message(embed=e, ephemeral=True)

    @app_commands.command(name="status", description="Mostra como a Kiza está (latência, tempo online, versão).")
    @app_commands.checks.cooldown(1, 10.0)
    async def status(self, interaction: discord.Interaction) -> None:
        uptime = int((discord.utils.utcnow() - self.bot.iniciou_em).total_seconds())
        banco_ms = await self.bot.banco.ping()
        e = embed(textos.STATUS_TITULO)
        e.add_field(name="Latência", value=f"{round(self.bot.latency * 1000)} ms")
        e.add_field(name="Banco de dados", value=f"{banco_ms:.1f} ms")
        e.add_field(name="Online há", value=formatar_duracao(uptime))
        e.add_field(name="Versão", value=config.VERSAO)
        e.add_field(name="Servidores", value=str(len(self.bot.guilds)))
        e.add_field(name="Python / discord.py", value=f"{platform.python_version()} / {discord.__version__}")
        await interaction.response.send_message(embed=e, ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Geral(bot))
