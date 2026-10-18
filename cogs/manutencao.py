"""Manutenção: backup diário automático do banco (com retenção) e /backup manual."""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import TZ, embed, enviar_log, responder
from utils.permissoes import exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.manutencao")
IDADE_MINIMA_S = 20 * 3600  # no loop diário, não cria outro backup se já existe um recente
LIMITE_ARQUIVO = 9 * 1024 * 1024  # abaixo do limite de anexo do Discord para servidores sem boost
ENVIAR_BACKUP = os.getenv("BACKUP_ENVIAR_DISCORD", "").strip().lower() in ("1", "true", "sim", "yes")
RESUMO_HORA = 9  # segunda-feira, 9h (Brasília)


class Manutencao(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        self.backup_diario.start()
        self.resumo_semanal.start()

    async def cog_unload(self) -> None:
        self.backup_diario.cancel()
        self.resumo_semanal.cancel()

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

    async def _copiar_para_o_discord(self, caminho: Path) -> None:
        """Cópia FORA do volume: manda o backup para o canal de logs da staff (opt-in por BACKUP_ENVIAR_DISCORD)."""
        if caminho.stat().st_size > LIMITE_ARQUIVO:
            log.warning("Backup grande demais para anexar (%d bytes): cópia no Discord pulada", caminho.stat().st_size)
            return
        for guild in self.bot.guilds:
            enviado = await enviar_log(
                self.bot, guild, "logs_mod",
                conteudo="💾 Cópia diária do banco (guarde bem: tem dados do servidor).",
                arquivo=discord.File(str(caminho), filename=caminho.name),
            )
            log.info("Cópia do backup no Discord (%s): %s", guild.name, "ok" if enviado else "sem canal de logs")

    @tasks.loop(hours=24)
    async def backup_diario(self) -> None:
        try:
            existentes = self._backups()
            if existentes and time.time() - existentes[-1].stat().st_mtime < IDADE_MINIMA_S:
                return  # reinícios frequentes não enchem a pasta
            nome = await self.fazer_backup()
            log.info("Backup diário criado: %s", nome)
            if ENVIAR_BACKUP:
                await self._copiar_para_o_discord(Path(config.BACKUP_DIR) / nome)
        except Exception:
            log.exception("Falha no backup diário")

    @backup_diario.before_loop
    async def _antes_do_backup(self) -> None:
        await self.bot.wait_until_ready()

    # ------------------------------------------------------------------ resumo semanal da staff
    async def montar_resumo(self, guild: discord.Guild, desde: int) -> discord.Embed:
        r = await self.bot.banco.resumo_semana(guild.id, desde)
        casos = ", ".join(f"{n} {tipo}" for tipo, n in r["casos"]) or "nenhum"
        mods = "\n".join(f"• <@{uid}>: {n}" for uid, n in r["mods"]) or "—"
        ajud = "\n".join(f"• <@{uid}>: {n}" for uid, n in r["ajudantes"]) or "—"
        rec = ", ".join(f"{n} {tipo}" for tipo, n, _ in r["recompensas"][:6]) or "nada"
        e = embed("📊 Resumo da semana", f"Os últimos 7 dias na toca, {guild.name}.", config.COR_INFO)
        e.add_field(name="🛡️ Moderação", value=f"Casos: {casos}", inline=False)
        e.add_field(name="Quem mais moderou", value=mods, inline=True)
        e.add_field(
            name="🎫 Tickets",
            value=f"{r['tickets_abertos']} abertos, {r['tickets_fechados']} fechados, **{r['tickets_pendentes']}** pendentes agora",
            inline=False,
        )
        e.add_field(name="Quem mais atendeu", value=ajud, inline=True)
        e.add_field(name="🎁 Engajamento", value=f"Recompensas: {rec}", inline=False)
        return e

    @tasks.loop(hours=1)
    async def resumo_semanal(self) -> None:
        agora = datetime.now(TZ)
        if agora.weekday() != 0 or agora.hour < RESUMO_HORA:
            return
        semana = f"{agora.isocalendar().year}-{agora.isocalendar().week:02d}"
        desde = int((agora - timedelta(days=7)).timestamp())
        for guild in self.bot.guilds:
            try:
                ok, _ = await self.bot.banco.reivindicar_config(
                    guild.id, "resumo_semanal", semana, lambda atual: atual != semana
                )
                if ok:
                    await enviar_log(self.bot, guild, "logs_mod", embed=await self.montar_resumo(guild, desde))
            except Exception:
                log.exception("Falha no resumo semanal (%s)", guild.id)

    @resumo_semanal.before_loop
    async def _antes_do_resumo(self) -> None:
        await self.bot.wait_until_ready()

    @app_commands.command(name="resumo-semana", description="Mostra agora o resumo da semana para a staff.")
    @app_commands.guild_only()
    @exigir_nivel(config.NIVEL_STAFF)
    @app_commands.checks.cooldown(1, 30.0)
    async def resumo_agora(self, interaction: discord.Interaction) -> None:
        assert interaction.guild is not None
        desde = int((datetime.now(TZ) - timedelta(days=7)).timestamp())
        await interaction.response.send_message(embed=await self.montar_resumo(interaction.guild, desde), ephemeral=True)

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
