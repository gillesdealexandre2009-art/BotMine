"""Reservado para a futura ponte Discord <-> Minecraft (ENABLE_MINECRAFT). Veja README.md."""
import logging

log = logging.getLogger("kiza.minecraft")


async def setup(bot) -> None:
    log.warning(
        "ENABLE_MINECRAFT=true, mas cogs_minecraft ainda não tem nenhum módulo. Veja cogs_minecraft/README.md."
    )
