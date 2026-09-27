"""Painel de cargos (cores, gênero, DM, faixa etária) com menus persistentes e exclusividade por grupo."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands

import config
import textos
from utils.helpers import embed, pode_gerenciar_cargo, publicar_ou_editar, responder
from utils.permissoes import eh_membro
from utils.views import BaseView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.cargos")


class SelectGrupo(discord.ui.Select):
    """Menu de um grupo. As opções reais são gravadas na mensagem ao publicar."""

    def __init__(self, grupo: str, opcoes: Optional[list[discord.SelectOption]] = None) -> None:
        super().__init__(
            custom_id=f"kiza:cargos:{grupo}",
            placeholder=config.GRUPOS_CARGOS[grupo]["placeholder"],
            min_values=1,
            max_values=1,
            options=opcoes or [discord.SelectOption(label="—", value="0")],
        )
        self.grupo = grupo

    async def callback(self, interaction: discord.Interaction) -> None:
        cog = interaction.client.get_cog("Cargos")
        if cog is None:
            return
        await cog.aplicar_escolha(interaction, self.grupo, self.values[0])  # type: ignore[attr-defined]


class PainelCargosView(BaseView):
    def __init__(self, opcoes_por_grupo: Optional[dict[str, list[discord.SelectOption]]] = None) -> None:
        super().__init__(timeout=None)
        for grupo in config.GRUPOS_CARGOS:
            if opcoes_por_grupo is None:
                self.add_item(SelectGrupo(grupo))  # registro no setup_hook (só custom_id importa)
            elif opcoes_por_grupo.get(grupo):
                self.add_item(SelectGrupo(grupo, opcoes_por_grupo[grupo]))


class Cargos(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    def views_persistentes(self) -> list[discord.ui.View]:
        return [PainelCargosView()]

    async def aplicar_escolha(self, interaction: discord.Interaction, grupo: str, valor: str) -> None:
        await interaction.response.defer(ephemeral=True)
        guild, membro = interaction.guild, interaction.user
        if guild is None or not isinstance(membro, discord.Member):
            return
        if not await eh_membro(self.bot, membro):
            await responder(interaction, textos.CARGOS_SO_MEMBROS)
            return

        ids_grupo = set((await self.bot.banco.grupos_cargos(guild.id)).get(grupo, []))
        escolha = int(valor)
        novo = guild.get_role(escolha) if escolha else None
        if escolha and (escolha not in ids_grupo or novo is None):
            await responder(interaction, textos.CARGOS_INVALIDO)
            return
        if novo is not None and not pode_gerenciar_cargo(guild, novo):
            await responder(interaction, textos.CARGOS_ERRO_PERM.format(cargo=novo.name))
            return

        remover = [r for r in membro.roles if r.id in ids_grupo and r.id != escolha]
        try:
            if remover:
                await membro.remove_roles(*remover, reason="Kiza: painel de cargos")
            if novo is not None and novo not in membro.roles:
                await membro.add_roles(novo, reason="Kiza: painel de cargos")
        except discord.Forbidden:
            await responder(interaction, textos.CARGOS_ERRO_PERM.format(cargo=novo.name if novo else "?"))
            return
        if novo is None:
            await responder(interaction, textos.CARGOS_REMOVIDO)
        else:
            await responder(interaction, textos.CARGOS_ATUALIZADO.format(cargo=novo.name))

    async def publicar_painel(self, guild: discord.Guild) -> tuple[bool, str]:
        canal_id = await self.bot.banco.get_config_int(guild.id, "canal_painel_cargos")
        canal = guild.get_channel(canal_id) if canal_id else None
        if not isinstance(canal, discord.TextChannel):
            return False, textos.SETUP_SEM_CANAL

        grupos = await self.bot.banco.grupos_cargos(guild.id)
        opcoes_por_grupo: dict[str, list[discord.SelectOption]] = {}
        linhas = []
        for grupo, ids in grupos.items():
            if grupo not in config.GRUPOS_CARGOS:
                continue
            cargos = [r for r in (guild.get_role(i) for i in ids) if r is not None]
            cargos.sort(key=lambda r: -r.position)
            cargos = cargos[:24]
            if not cargos:
                continue
            opcoes = [discord.SelectOption(label=r.name[:100], value=str(r.id)) for r in cargos]
            opcoes.append(discord.SelectOption(label=textos.CARGOS_NENHUM, value="0", emoji="🚫"))
            opcoes_por_grupo[grupo] = opcoes
            linhas.append(f"**{config.GRUPOS_CARGOS[grupo]['titulo']}**")
        if not opcoes_por_grupo:
            return False, textos.SETUP_SEM_CARGOS

        e = embed(textos.CARGOS_TITULO, textos.CARGOS_DESC + "\n\n" + "\n".join(linhas))
        e.set_footer(text=textos.CARGOS_RODAPE)
        try:
            await publicar_ou_editar(
                self.bot, guild, canal, "painel_cargos", embeds=[e], view=PainelCargosView(opcoes_por_grupo)
            )
        except discord.HTTPException:
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Cargos(bot))
