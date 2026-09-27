"""Níveis de permissão (0 membro, 1 helper, 2 staff, 3 admin) e checks de comando.

A autorização é SEMPRE decidida aqui, em código, a partir dos cargos mapeados no /setup.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import discord
from discord import app_commands

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza


class SemPermissao(app_commands.CheckFailure):
    def __init__(self, nivel: int) -> None:
        self.nivel = nivel
        super().__init__(f"nível {nivel} necessário")


class NaoEMembro(app_commands.CheckFailure):
    pass


class NaoConfigurado(app_commands.CheckFailure):
    pass


async def nivel_do_membro(bot: "Kiza", membro: discord.Member) -> int:
    """Maior nível entre os cargos do membro. Dono e quem tem Administrador do Discord contam como 3."""
    if membro.guild.owner_id == membro.id or membro.guild_permissions.administrator:
        return 3
    mapa = await bot.banco.mapa_niveis(membro.guild.id)
    nivel = 0
    for cargo in membro.roles:
        nivel = max(nivel, mapa.get(cargo.id, 0))
    return nivel


async def eh_membro(bot: "Kiza", membro: discord.Member) -> bool:
    """Tem o cargo Membro, Kitsune, ou algum cargo mapeado a um nível (helper/staff/admin/membro)."""
    if await nivel_do_membro(bot, membro) >= 1:
        return True
    cfg = await bot.banco.cfg(membro.guild.id)
    ids = {int(cfg[c]) for c in ("cargo_membro", "cargo_kitsune") if cfg.get(c, "").isdigit()}
    mapa = await bot.banco.mapa_niveis(membro.guild.id)
    return any(cargo.id in ids or cargo.id in mapa for cargo in membro.roles)


async def cargo_membro_configurado(bot: "Kiza", guild: discord.Guild) -> bool:
    return await bot.banco.get_config_int(guild.id, "cargo_membro") is not None


def exigir_nivel(minimo: int):
    """Decorator de slash command: exige nível mínimo."""

    async def predicate(interaction: discord.Interaction) -> bool:
        if interaction.guild is None or not isinstance(interaction.user, discord.Member):
            raise app_commands.NoPrivateMessage()
        nivel = await nivel_do_membro(interaction.client, interaction.user)  # type: ignore[arg-type]
        if nivel < minimo:
            raise SemPermissao(minimo)
        return True

    return app_commands.check(predicate)


async def checar_membro(interaction: discord.Interaction) -> bool:
    """Usado por `Cog.interaction_check` nos módulos só para membros."""
    if interaction.guild is None or not isinstance(interaction.user, discord.Member):
        raise app_commands.NoPrivateMessage()
    bot = interaction.client
    nivel = await nivel_do_membro(bot, interaction.user)  # type: ignore[arg-type]
    if nivel >= 3:
        return True
    if not await cargo_membro_configurado(bot, interaction.guild):  # type: ignore[arg-type]
        raise NaoConfigurado()
    if not await eh_membro(bot, interaction.user):  # type: ignore[arg-type]
        raise NaoEMembro()
    return True


async def eh_kitsune(bot: "Kiza", membro: discord.Member) -> bool:
    """Tem o cargo Kitsune (VIP cosmético com bônus pequenos)."""
    cargo_id = await bot.banco.get_config_int(membro.guild.id, "cargo_kitsune")
    return cargo_id is not None and any(r.id == cargo_id for r in membro.roles)
