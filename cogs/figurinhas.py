"""Figurinhas: pacotinho de 1 carta por Caudas (com 1 grátis por dia), álbum e ver carta.

A arte e o desenho da carta ficam em utils/figurinhas.py. Aqui só há o fluxo: sortear, cobrar (ou usar a grátis) e guardar
no inventário numa transação só, para nunca cobrar sem entregar nem entregar sem cobrar.
"""
from __future__ import annotations

import asyncio
import io
import logging
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

import config
from utils import figurinhas as fig
from utils.helpers import barra_progresso, embed, formatar_moeda, hoje_e_ontem, responder
from utils.permissoes import checar_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.figurinhas")

COR_RARIDADE = {"comum": 0xC9CED9, "rara": 0x4A9BFF}


class Figurinhas(commands.Cog):
    figurinha = app_commands.Group(name="figurinha", description="Colecione as figurinhas da Kiza", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._imagens: dict[str, bytes] = {}  # carta -> WebP pronto (a carta é igual para todo mundo)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    async def _imagem(self, carta: fig.Carta) -> bytes:
        if carta.id not in self._imagens:
            self._imagens[carta.id] = await asyncio.to_thread(fig.desenhar_carta, carta)
        return self._imagens[carta.id]

    def _arquivo(self, carta: fig.Carta, dados: bytes) -> discord.File:
        return discord.File(io.BytesIO(dados), filename=f"{carta.id}.webp")

    # ------------------------------------------------------------------ abrir
    @figurinha.command(name="abrir", description="Abre um pacotinho e ganha uma figurinha (1 grátis por dia).")
    @app_commands.checks.cooldown(1, 5.0)
    async def abrir(self, interaction: discord.Interaction) -> None:
        guild, membro = interaction.guild, interaction.user
        assert guild is not None
        banco = self.bot.banco
        preco = await banco.ajuste(guild.id, "figurinha_preco")
        gratis = await banco.ajuste(guild.id, "figurinha_gratis") == 1
        hoje, _ = hoje_e_ontem()
        carta = fig.sortear()
        resultado = await banco.abrir_figurinha(guild.id, membro.id, carta.id, preco, hoje, gratis)
        if resultado is None:
            saldo = await banco.saldo(guild.id, membro.id)
            await responder(
                interaction,
                f"🦊 Um pacotinho custa **{formatar_moeda(preco)}** e você tem {formatar_moeda(saldo)}. "
                "O grátis do dia já foi usado. Volta amanhã!",
            )
            return
        await interaction.response.defer()
        r = fig.RARIDADES[carta.raridade]
        e = embed(
            ("✨ Figurinha nova! " if resultado["nova"] else "🔁 Repetida! ") + f"{carta.nome}",
            f"{r.emoji} **{r.rotulo}** · #{carta.numero:02d}\n*{carta.descricao}*" if carta.descricao else f"{r.emoji} **{r.rotulo}**",
            COR_RARIDADE.get(carta.raridade),
        )
        e.set_image(url=f"attachment://{carta.id}.webp")
        if not resultado["nova"]:
            e.add_field(name="Você tem", value=f"x{resultado['quantidade']}")
        e.set_footer(text="Pacotinho grátis do dia!" if resultado["gratis"] else f"Saldo: {resultado['saldo']} {config.MOEDA_NOME}")
        await interaction.followup.send(embed=e, file=self._arquivo(carta, await self._imagem(carta)))

    # ------------------------------------------------------------------ álbum
    @figurinha.command(name="album", description="Veja o seu álbum de figurinhas.")
    @app_commands.checks.cooldown(1, 5.0)
    @app_commands.describe(membro="De quem (padrão: você)")
    async def album(self, interaction: discord.Interaction, membro: discord.Member | None = None) -> None:
        guild = interaction.guild
        assert guild is not None
        alvo = membro or interaction.user
        inventario = await self.bot.banco.inventario_figurinhas(guild.id, alvo.id)
        linhas = []
        for c in fig.CATALOGO:
            qtd = inventario.get(c.id, 0)
            r = fig.RARIDADES[c.raridade]
            linhas.append(
                f"{r.emoji} **#{c.numero:02d} {c.nome}**" + (f" · x{qtd}" if qtd > 1 else "") if qtd
                else f"▫️ #{c.numero:02d} ???"
            )
        tem = sum(1 for c in fig.CATALOGO if inventario.get(c.id, 0) > 0)
        e = embed(f"📒 Álbum de {alvo.display_name}", "\n".join(linhas))
        e.add_field(name="Progresso", value=f"{barra_progresso(tem, len(fig.CATALOGO))} {tem}/{len(fig.CATALOGO)}", inline=False)
        await responder(interaction, embed=e, ephemeral=False)

    # ------------------------------------------------------------------ ver
    async def _autocompletar(self, interaction: discord.Interaction, atual: str) -> list[app_commands.Choice[str]]:
        inventario = await self.bot.banco.inventario_figurinhas(interaction.guild_id, interaction.user.id)  # type: ignore[arg-type]
        achadas = [c for c in fig.CATALOGO if inventario.get(c.id, 0) > 0 and atual.lower() in c.nome.lower()]
        return [app_commands.Choice(name=f"#{c.numero:02d} {c.nome}", value=c.id) for c in achadas[:25]]

    @figurinha.command(name="ver", description="Mostra uma figurinha que você tem.")
    @app_commands.checks.cooldown(1, 5.0)
    @app_commands.describe(carta="Qual figurinha")
    @app_commands.autocomplete(carta=_autocompletar)
    async def ver(self, interaction: discord.Interaction, carta: str) -> None:
        guild = interaction.guild
        assert guild is not None
        c = fig.POR_ID.get(carta)
        inventario = await self.bot.banco.inventario_figurinhas(guild.id, interaction.user.id)
        if c is None or inventario.get(c.id, 0) <= 0:
            await responder(interaction, "Você ainda não tem essa figurinha. Abra pacotinhos com `/figurinha abrir`! 🦊")
            return
        await interaction.response.defer()
        r = fig.RARIDADES[c.raridade]
        e = embed(f"{c.nome}", f"{r.emoji} **{r.rotulo}** · #{c.numero:02d}\n*{c.descricao}*", COR_RARIDADE.get(c.raridade))
        e.set_image(url=f"attachment://{c.id}.webp")
        e.set_footer(text=f"Você tem x{inventario[c.id]}")
        await interaction.followup.send(embed=e, file=self._arquivo(c, await self._imagem(c)))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Figurinhas(bot))
