"""Ponte Discord <-> Minecraft (ENABLE_MINECRAFT). Veja README.md e ponte.py."""
import logging

log = logging.getLogger("kiza.minecraft")


async def setup(bot) -> None:
    await bot.load_extension("cogs_minecraft.ponte")
