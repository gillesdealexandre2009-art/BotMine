"""Manutenção: backup diário automático do banco (com retenção) e /backup manual."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import responder
from utils.permissoes import exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.manutencao")
IDADE_MINIMA_S = 20 * 3600  # no loop diário, não cria outro backup se já existe um recente


class Manutencao(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        self.backup_diario.start()

    async def cog_unload(self) -> None:
        self.backup_diario.cancel()

    def _backups(self) -> list[Path]:
        pasta = Path(config.BACKUP_DIR)
        return sorted(pasta.glob("kiza-*.db")) if pasta.exists() else []

    async def fazer_backup(self) -> str:
        pasta = Path(config.BACKUP_DIR)
        pasta.mkdir(parents=True, exist_ok=True)
        nome = f"kiza-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.db"
        await self.bot.banco.backup(str(pasta / nome))
        for antigo in self._backups()[: -max(1, config.BACKUP_RETENCAO)]:
            antigo.unlink(missing_ok=True)
        return nome

    @tasks.loop(hours=24)
    async def backup_diario(self) -> None:
        try:
            existentes = self._backups()
            if existentes and time.time() - existentes[-1].stat().st_mtime < IDADE_MINIMA_S:
                return  # reinícios frequentes não enchem a pasta
            log.info("Backup diário criado: %s", await self.fazer_backup())
        except Exception:
            log.exception("Falha no backup diário")

    @backup_diario.before_loop
    async def _antes_do_backup(self) -> None:
        await self.bot.wait_until_ready()

    @app_commands.command(name="backup", description="Cria um backup do banco agora (só admins).")
    @app_commands.guild_only()
    @exigir_nivel(config.NIVEL_ADMIN)
    @app_commands.checks.cooldown(1, 60.0)
    async def backup(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        try:
            nome = await self.fazer_backup()
        except Exception:
            log.exception("Falha no backup manual")
            await responder(interaction, textos.BACKUP_FALHOU)
            return
        await responder(interaction, textos.BACKUP_OK.format(nome=nome))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Manutencao(bot))
