"""Visual dos cargos: nomes curtos e separadores que só ficam em quem tem algum cargo do grupo.

Nada é apagado. /cargos-organizar mostra o plano e só aplica após confirmação.
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import embed, pode_gerenciar_cargo, responder
from utils.permissoes import exigir_nivel
from utils.views import DonoView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.cargos_visual")

ARQUIVO = Path(__file__).resolve().parent.parent / "cargos_visual.json"
PAUSA = 0.5  # segundos entre chamadas à API: poucas por vez, nada de rajada


class ConfirmarView(DonoView):
    def __init__(self, dono_id: int, cog: "CargosVisual", guild: discord.Guild) -> None:
        super().__init__(dono_id)
        self.cog, self.guild = cog, guild

    @discord.ui.button(label="Aplicar", style=discord.ButtonStyle.success, emoji="✅")
    async def aplicar(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        botao.disabled = True
        await interaction.response.edit_message(content=textos.CARGOS_VISUAL_APLICANDO, view=self)
        renomeados, ajustados, falhas = await self.cog.aplicar_tudo(self.guild)
        txt = textos.CARGOS_VISUAL_FEITO.format(renomeados=renomeados, ajustados=ajustados)
        if falhas:
            txt += "\n" + textos.CARGOS_VISUAL_FALHAS.format(lista=", ".join(falhas[:10]))
        await interaction.edit_original_response(content=txt, view=None)
        self.stop()


class CargosVisual(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self.dados: dict = json.loads(ARQUIVO.read_text(encoding="utf-8")) if ARQUIVO.exists() else {}
        self.guild_id = int(self.dados.get("guild_id", 0) or 0)
        self._trava = asyncio.Lock()  # uma sincronização por vez

    # ------------------------------------------------------------------ plano
    def _desejados(self, membro: discord.Member) -> tuple[set[int], set[int]]:
        """(separadores que o membro deve ter, todos os separadores gerenciados)."""
        querem, todos = set(), set()
        ids = {r.id for r in membro.roles}
        for grupo in self.dados.get("separadores", []):
            seps = {int(i) for i in grupo["separadores"]}
            todos |= seps
            if ids & {int(i) for i in grupo["gatilhos"]}:
                querem |= seps
        return querem, todos

    def plano_membro(self, membro: discord.Member) -> tuple[list[discord.Role], list[discord.Role]]:
        """(cargos a adicionar, cargos a remover) só entre separadores."""
        querem, todos = self._desejados(membro)
        tem = {r.id for r in membro.roles}
        guild = membro.guild
        add = [r for i in querem - tem if (r := guild.get_role(i)) and pode_gerenciar_cargo(guild, r)]
        rem = [r for i in (todos & tem) - querem if (r := guild.get_role(i)) and pode_gerenciar_cargo(guild, r)]
        return add, rem

    def plano_nomes(self, guild: discord.Guild) -> list[tuple[discord.Role, str]]:
        saida = []
        for i, novo in self.dados.get("renomear", {}).items():
            r = guild.get_role(int(i))
            if r is not None and r.name != novo and pode_gerenciar_cargo(guild, r):
                saida.append((r, novo))
        return saida

    # ------------------------------------------------------------------ aplicação
    async def sincronizar_membro(self, membro: discord.Member) -> bool:
        add, rem = self.plano_membro(membro)
        if not add and not rem:
            return False
        try:
            if rem:
                await membro.remove_roles(*rem, reason="Kiza: separadores de cargo")
            if add:
                await membro.add_roles(*add, reason="Kiza: separadores de cargo")
        except discord.HTTPException:
            log.warning("Falha ao sincronizar separadores de %s", membro.id, exc_info=True)
            return False
        return True

    async def aplicar_tudo(self, guild: discord.Guild) -> tuple[int, int, list[str]]:
        renomeados, ajustados, falhas = 0, 0, []
        async with self._trava:
            for cargo, novo in self.plano_nomes(guild):
                try:
                    await cargo.edit(name=novo, reason="Kiza: padronizar cargos")
                    renomeados += 1
                except discord.HTTPException:
                    falhas.append(cargo.name)
                await asyncio.sleep(PAUSA)
            for membro in guild.members:
                if membro.bot:
                    continue
                if await self.sincronizar_membro(membro):
                    ajustados += 1
                    await asyncio.sleep(PAUSA)
        return renomeados, ajustados, falhas

    # ------------------------------------------------------------------ eventos
    @commands.Cog.listener()
    async def on_member_update(self, antes: discord.Member, depois: discord.Member) -> None:
        if depois.guild.id != self.guild_id or depois.bot or antes.roles == depois.roles:
            return
        async with self._trava:
            await self.sincronizar_membro(depois)

    # ------------------------------------------------------------------ comando
    @app_commands.command(name="cargos-organizar", description="Padroniza nomes e separadores dos cargos (mostra o plano antes).")
    @app_commands.guild_only()
    @exigir_nivel(config.NIVEL_ADMIN)
    async def organizar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        if guild is None or guild.id != self.guild_id:
            await responder(interaction, textos.CARGOS_VISUAL_OUTRO_SERVIDOR)
            return
        nomes = self.plano_nomes(guild)
        adds = rems = 0
        for m in guild.members:
            if m.bot:
                continue
            a, r = self.plano_membro(m)
            adds += len(a)
            rems += len(r)
        if not nomes and not adds and not rems:
            await responder(interaction, textos.CARGOS_VISUAL_NADA)
            return
        linhas = [f"• {r.name} ➜ **{novo}**" for r, novo in nomes] or ["• nenhum nome muda"]
        e = embed(textos.CARGOS_VISUAL_TITULO, "\n".join(linhas))
        e.add_field(name="Separadores nos membros", value=f"+{adds} a adicionar · −{rems} a remover", inline=False)
        e.set_footer(text=textos.CARGOS_VISUAL_RODAPE)
        await responder(interaction, embed=e, view=ConfirmarView(interaction.user.id, self, guild))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(CargosVisual(bot))
