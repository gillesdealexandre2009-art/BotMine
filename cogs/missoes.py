"""Missões diárias: 3 por dia, iguais para o servidor. Progresso de conversa fica na memória (sem gravar a cada mensagem).

Quiz e forca são lidos do livro de recompensas. O prêmio sai com `recompensar_uma_vez` (chave por pessoa/dia/missão),
então ver o /missoes várias vezes ou reiniciar o bot nunca paga duas vezes. Reiniciar zera só o contador do dia em andamento.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

import config
from utils import missoes as ms
from utils.helpers import TZ, barra_progresso, embed, formatar_moeda, hoje_e_ontem
from utils.permissoes import checar_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.missoes")
INTERVALO_MSG = 8.0  # só conta mensagem se passaram 8s da anterior da mesma pessoa (sem spam)
MIN_CARACTERES = 4
MAX_CONTADOR = 500


class Missoes(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._prog: dict[tuple[int, int], dict] = {}  # (servidor, pessoa) -> {"dia", "msgs", "resp", "reac", "ultima"}

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    def _estado(self, guild_id: int, user_id: int) -> dict:
        hoje, _ = hoje_e_ontem()
        est = self._prog.get((guild_id, user_id))
        if est is None or est["dia"] != hoje:
            est = {"dia": hoje, "msgs": 0, "resp": 0, "reac": 0, "ultima": 0.0}
            self._prog[(guild_id, user_id)] = est
        return est

    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.guild is None or mensagem.author.bot or len(mensagem.content.strip()) < MIN_CARACTERES:
            return
        est = self._estado(mensagem.guild.id, mensagem.author.id)
        agora = time.monotonic()
        if agora - est["ultima"] < INTERVALO_MSG:
            return
        est["ultima"] = agora
        est["msgs"] = min(MAX_CONTADOR, est["msgs"] + 1)
        ref = mensagem.reference
        if ref is not None and isinstance(ref.resolved, discord.Message) and ref.resolved.author.id != mensagem.author.id:
            est["resp"] = min(MAX_CONTADOR, est["resp"] + 1)

    @commands.Cog.listener()
    async def on_raw_reaction_add(self, evento: discord.RawReactionActionEvent) -> None:
        if evento.guild_id is None or evento.user_id == (self.bot.user.id if self.bot.user else 0):
            return
        if evento.member is not None and evento.member.bot:
            return
        est = self._estado(evento.guild_id, evento.user_id)
        est["reac"] = min(MAX_CONTADOR, est["reac"] + 1)

    async def _progresso(self, guild_id: int, user_id: int, m: ms.Missao) -> int:
        if m.fonte in ("msgs", "resp", "reac"):
            return self._estado(guild_id, user_id)[m.fonte]
        hoje, _ = hoje_e_ontem()
        return await self.bot.banco.contar_recompensas(guild_id, f"{m.fonte}:{hoje}:{user_id}:")

    @app_commands.command(name="missoes", description="Suas 3 missões do dia: complete e ganhe Caudas!")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 5.0)
    async def missoes(self, interaction: discord.Interaction) -> None:
        guild, membro = interaction.guild, interaction.user
        assert guild is not None
        banco = self.bot.banco
        hoje, _ = hoje_e_ontem()
        dia = datetime.now(TZ).date().toordinal()
        premio = await banco.ajuste(guild.id, "missao_premio")
        linhas, feitas, pagas = [], 0, 0
        for m in ms.missoes_do_dia(guild.id, dia):
            atual = min(await self._progresso(guild.id, membro.id, m), m.meta)
            if atual >= m.meta:
                feitas += 1
                saldo = await banco.recompensar_uma_vez(
                    guild.id, f"missao:{hoje}:{membro.id}:{m.id}", membro.id, premio, "missao"
                )
                if saldo is not None:
                    pagas += premio
                linhas.append(f"✅ **{m.titulo}** ({m.meta}/{m.meta})")
            else:
                linhas.append(f"⬜ **{m.titulo}**\n{barra_progresso(atual, m.meta)} {atual}/{m.meta}")
        bonus = ""
        if feitas == ms.POR_DIA:
            extra = premio * 2
            saldo = await banco.recompensar_uma_vez(guild.id, f"missao:{hoje}:{membro.id}:bonus", membro.id, extra, "missao")
            if saldo is not None:
                pagas += extra
            bonus = f"\n\n🎁 **Todas completas!** Bônus de {formatar_moeda(extra)} já entregue."
        rodape = f"\n\n💰 Agora você ganhou **{formatar_moeda(pagas)}**!" if pagas else ""
        desc = f"Cada missão vale {formatar_moeda(premio)}. Novas missões todo dia.\n\n" + "\n\n".join(linhas) + bonus + rodape
        await interaction.response.send_message(embed=embed("📋 Missões do dia", desc, config.COR_PRINCIPAL), ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Missoes(bot))
