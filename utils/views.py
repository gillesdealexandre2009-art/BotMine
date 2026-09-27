"""Views base: tratamento de erro amigável e travas de dono."""
from __future__ import annotations

import discord

import textos
from utils.helpers import registrar_erro, responder


class BaseView(discord.ui.View):
    async def on_error(self, interaction: discord.Interaction, error: Exception, item: discord.ui.Item) -> None:
        codigo = registrar_erro(error)
        await responder(interaction, textos.ERRO_GENERICO.format(codigo=codigo))


class DonoView(BaseView):
    """View efêmera que só quem a abriu pode usar."""

    def __init__(self, dono_id: int, timeout: float = 600) -> None:
        super().__init__(timeout=timeout)
        self.dono_id = dono_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.dono_id:
            await responder(interaction, textos.VIEW_NAO_E_SUA)
            return False
        return True
