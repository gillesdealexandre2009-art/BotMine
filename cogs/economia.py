"""Economia: /daily /saldo /perfil /pagar e o grupo administrativo /economia-admin."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import embed, formatar_moeda, formatar_numero, hoje_e_ontem, nivel_por_xp, responder
from utils.permissoes import checar_membro, eh_kitsune, eh_membro, exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.economia")


class Economia(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # ------------------------------------------------------------------ daily
    @app_commands.command(name="daily", description="Resgate sua recompensa diária.")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 5.0)
    async def daily(self, interaction: discord.Interaction) -> None:
        guild, membro = interaction.guild, interaction.user
        assert guild is not None and isinstance(membro, discord.Member)
        banco = self.bot.banco
        hoje, ontem = hoje_e_ontem()
        bonus = await banco.ajuste(guild.id, "kitsune_daily_pct") if await eh_kitsune(self.bot, membro) else 0
        resultado = await banco.resgatar_daily(
            guild.id,
            membro.id,
            hoje,
            ontem,
            base=await banco.ajuste(guild.id, "daily_base"),
            passo=await banco.ajuste(guild.id, "daily_passo"),
            streak_max=await banco.ajuste(guild.id, "daily_streak_max"),
            bonus_pct=bonus,
        )
        if resultado is None:
            await responder(interaction, textos.DAILY_JA)
            return
        texto = textos.DAILY_OK.format(
            valor=formatar_moeda(resultado["valor"]),
            streak=resultado["streak"],
            saldo=formatar_moeda(resultado["saldo"]),
        )
        if bonus > 0:
            texto += textos.DAILY_BONUS_KITSUNE
        await interaction.response.send_message(texto)

    # ------------------------------------------------------------------ saldo / perfil
    @app_commands.command(name="saldo", description="Mostra seu saldo (ou de outra pessoa).")
    @app_commands.guild_only()
    @app_commands.describe(membro="De quem (padrão: você)")
    @app_commands.checks.cooldown(1, 3.0)
    async def saldo(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None) -> None:
        alvo = membro or interaction.user
        assert interaction.guild_id is not None
        valor = await self.bot.banco.saldo(interaction.guild_id, alvo.id)
        await interaction.response.send_message(
            textos.SALDO_TEXTO.format(emoji=config.MOEDA_EMOJI, nome=alvo.display_name, saldo=formatar_moeda(valor)),
            ephemeral=True,
        )

    @app_commands.command(name="perfil", description="Mostra o perfil de alguém.")
    @app_commands.guild_only()
    @app_commands.describe(membro="De quem (padrão: você)")
    @app_commands.checks.cooldown(1, 5.0)
    async def perfil(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None) -> None:
        alvo = membro or interaction.user
        assert interaction.guild is not None and isinstance(alvo, discord.Member)
        perfil = await self.bot.banco.obter_perfil(interaction.guild.id, alvo.id)
        nivel, _, _ = nivel_por_xp(perfil["xp"])
        e = embed(textos.PERFIL_TITULO.format(nome=alvo.display_name))
        e.set_thumbnail(url=alvo.display_avatar.url)
        e.add_field(name=f"{config.MOEDA_EMOJI} {config.MOEDA_NOME}", value=formatar_numero(perfil["saldo"]))
        e.add_field(name="🌟 Nível", value=f"{nivel} ({formatar_numero(perfil['xp'])} XP)")
        e.add_field(name="🔥 Sequência do daily", value=f"{perfil['daily_streak']} dia(s)")
        if perfil["casado_com"]:
            e.add_field(name="🤝 Dupla de toca", value=f"<@{perfil['casado_com']}>", inline=False)
        if await eh_kitsune(self.bot, alvo):
            e.set_footer(text="🦊 Kitsune")
        await interaction.response.send_message(embed=e)

    # ------------------------------------------------------------------ pagar
    @app_commands.command(name="pagar", description="Envie moedas para outra pessoa.")
    @app_commands.guild_only()
    @app_commands.describe(membro="Quem recebe", valor="Quanto")
    @app_commands.checks.cooldown(1, 10.0)
    async def pagar(
        self, interaction: discord.Interaction, membro: discord.Member, valor: app_commands.Range[int, 1, 1000000]
    ) -> None:
        guild, autor = interaction.guild, interaction.user
        assert guild is not None
        if membro.bot or membro.id == autor.id:
            await responder(interaction, textos.PAGAR_INVALIDO)
            return
        maximo = await self.bot.banco.ajuste(guild.id, "pagar_max")
        if valor > maximo:
            await responder(interaction, textos.PAGAR_LIMITE.format(max=formatar_moeda(maximo)))
            return
        if not await eh_membro(self.bot, membro):
            await responder(interaction, textos.PAGAR_DESTINO_NAO_MEMBRO)
            return
        if await self.bot.banco.transferir(guild.id, autor.id, membro.id, valor) is None:
            await responder(interaction, textos.PAGAR_SEM_SALDO)
            return
        await interaction.response.send_message(
            textos.PAGAR_OK.format(de=autor.mention, para=membro.mention, valor=formatar_moeda(valor)),
            allowed_mentions=discord.AllowedMentions(users=[membro]),
        )

    # ------------------------------------------------------------------ administração
    admin = app_commands.Group(name="economia-admin", description="Ajustes administrativos da economia.", guild_only=True)

    @admin.command(name="dar", description="Dá moedas a alguém.")
    @app_commands.describe(membro="Quem", valor="Quanto")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def admin_dar(
        self, interaction: discord.Interaction, membro: discord.Member, valor: app_commands.Range[int, 1, 10000000]
    ) -> None:
        _, saldo = await self.bot.banco.admin_ajustar(interaction.guild_id, membro.id, valor, interaction.user.id)  # type: ignore[arg-type]
        await responder(
            interaction,
            textos.ECON_ADMIN_DAR.format(valor=formatar_moeda(valor), alvo=membro.mention, saldo=formatar_moeda(saldo)),
        )

    @admin.command(name="tirar", description="Tira moedas de alguém (nunca deixa negativo).")
    @app_commands.describe(membro="De quem", valor="Quanto")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def admin_tirar(
        self, interaction: discord.Interaction, membro: discord.Member, valor: app_commands.Range[int, 1, 10000000]
    ) -> None:
        aplicado, saldo = await self.bot.banco.admin_ajustar(
            interaction.guild_id, membro.id, -valor, interaction.user.id  # type: ignore[arg-type]
        )
        await responder(
            interaction,
            textos.ECON_ADMIN_TIRAR.format(
                valor=formatar_moeda(-aplicado), alvo=membro.mention, saldo=formatar_moeda(saldo)
            ),
        )

    @admin.command(name="xp-definir", description="Define o XP total de alguém.")
    @app_commands.describe(membro="Quem", xp="XP total")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def admin_xp(
        self, interaction: discord.Interaction, membro: discord.Member, xp: app_commands.Range[int, 0, 100000000]
    ) -> None:
        novo = await self.bot.banco.definir_xp(interaction.guild_id, membro.id, xp)  # type: ignore[arg-type]
        nivel = nivel_por_xp(novo)[0]
        cog = self.bot.get_cog("XP")
        if cog is not None:
            await cog.aplicar_cargo_nivel(membro, nivel)  # type: ignore[attr-defined]
        await responder(interaction, textos.XP_ADMIN_OK.format(alvo=membro.mention, xp=formatar_numero(novo), nivel=nivel))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Economia(bot))
