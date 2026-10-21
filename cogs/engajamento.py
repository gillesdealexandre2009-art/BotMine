"""Engajamento: XP por voz, rastreio de atividade e aviso a membros inativos.

Objetivo: que membros reais participem, não só existam. Todo mundo que fala, reage ou entra em call ganha um carimbo
de "última atividade". Uma vez por semana (segunda, 10h BRT) a Kiza verifica quem passou do limite de inatividade e,
dependendo dos ajustes:
  * manda DM avisando que sente falta e convidando a voltar;
  * opcionalmente rebaixa de Membro para Visitante (o membro recupera o cargo ao interagir de novo).

XP por voz: quem fica em call (mesmas regras da fidelidade — gente real, sem surdo, 2+ pessoas) ganha um pouquinho
de XP a cada minuto. Ajuste: xp_voz (0 = desliga).
"""
from __future__ import annotations

import logging
import random
import time
from typing import TYPE_CHECKING

import discord
from discord.ext import commands, tasks

import config
from cogs.fidelidade import membros_que_contam_na_call
from utils.helpers import TZ, embed, enviar_log, nivel_por_xp, pode_gerenciar_cargo

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.engajamento")


class Engajamento(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        self.xp_voz_loop.start()
        self.checar_inativos.start()

    async def cog_unload(self) -> None:
        self.xp_voz_loop.cancel()
        self.checar_inativos.cancel()

    # ------------------------------------------------------------------ rastreio de atividade
    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.author.bot or mensagem.guild is None:
            return
        await self.bot.banco.marcar_ativo(mensagem.guild.id, mensagem.author.id)

    @commands.Cog.listener()
    async def on_reaction_add(self, reaction: discord.Reaction, user) -> None:
        if getattr(user, "bot", True) or reaction.message.guild is None:
            return
        await self.bot.banco.marcar_ativo(reaction.message.guild.id, user.id)

    @commands.Cog.listener()
    async def on_voice_state_update(self, membro: discord.Member, antes: discord.VoiceState, depois: discord.VoiceState) -> None:
        if membro.bot:
            return
        if depois.channel is not None:
            await self.bot.banco.marcar_ativo(membro.guild.id, membro.id)

    # ------------------------------------------------------------------ XP por voz
    @tasks.loop(seconds=60)
    async def xp_voz_loop(self) -> None:
        """A cada minuto, dá XP para quem está em call (mesma regra da fidelidade)."""
        try:
            for guild in self.bot.guilds:
                xp_por_min = await self.bot.banco.ajuste(guild.id, "xp_voz")
                if not xp_por_min:
                    continue
                for canal in [*guild.voice_channels, *guild.stage_channels]:
                    if guild.afk_channel is not None and canal.id == guild.afk_channel.id:
                        continue
                    contam = membros_que_contam_na_call(canal.members)
                    for m in contam:
                        ganho = random.randint(max(1, xp_por_min - 2), xp_por_min + 2)
                        antes, depois = await self.bot.banco.adicionar_xp(guild.id, m.id, ganho)
                        nivel_antes, nivel_depois = nivel_por_xp(antes)[0], nivel_por_xp(depois)[0]
                        if nivel_depois > nivel_antes:
                            xp_cog = self.bot.get_cog("XP")
                            if xp_cog is not None:
                                await xp_cog.aplicar_cargo_nivel(m, nivel_depois)
        except Exception:
            log.exception("Erro no loop de XP por voz")

    @xp_voz_loop.before_loop
    async def _antes_xp_voz(self) -> None:
        await self.bot.wait_until_ready()

    # ------------------------------------------------------------------ aviso de inatividade (toda segunda, 10h BRT)
    @tasks.loop(hours=6)
    async def checar_inativos(self) -> None:
        """Roda a cada 6h; só age na segunda-feira (BRT)."""
        try:
            from datetime import datetime
            agora = datetime.now(TZ)
            if agora.weekday() != 0:  # 0 = segunda
                return

            for guild in self.bot.guilds:
                aviso = await self.bot.banco.ajuste(guild.id, "inatividade_aviso")
                if not aviso:
                    continue
                dias = await self.bot.banco.ajuste(guild.id, "inatividade_dias")
                rebaixar = await self.bot.banco.ajuste(guild.id, "inatividade_rebaixar")
                limite = int(time.time()) - dias * 86400

                inativos = await self.bot.banco.inativos(guild.id, limite)
                if not inativos:
                    continue

                id_membro = await self.bot.banco.get_config_int(guild.id, "cargo_membro")
                cargo_membro = guild.get_role(id_membro) if id_membro else None
                id_visitante = await self.bot.banco.get_config_int(guild.id, "cargo_visitante")
                cargo_visitante = guild.get_role(id_visitante) if id_visitante else None

                avisados = 0
                rebaixados = 0
                for row in inativos:
                    membro = guild.get_member(row["user_id"])
                    if membro is None or membro.bot:
                        continue
                    if cargo_membro and cargo_membro not in membro.roles:
                        continue  # já não é membro

                    # DM
                    try:
                        await membro.send(
                            f"Oi! 🦊 Faz um tempinho que você não aparece na **{guild.name}**. "
                            f"A toca sentiu sua falta! Passa lá quando puder, sempre tem algo rolando.\n"
                            f"-# Se não quiser mais receber esse lembrete, é só aparecer de vez em quando 🧡"
                        )
                        avisados += 1
                    except discord.HTTPException:
                        pass  # DM fechada, segue a vida

                    # rebaixar
                    if rebaixar and cargo_membro and cargo_visitante:
                        try:
                            if pode_gerenciar_cargo(guild, cargo_membro):
                                await membro.remove_roles(cargo_membro, reason=f"Kiza: inativo há {dias}+ dias")
                                await membro.add_roles(cargo_visitante, reason=f"Kiza: inativo há {dias}+ dias")
                                rebaixados += 1
                        except discord.HTTPException:
                            pass

                # log pra staff
                if avisados or rebaixados:
                    desc = f"**{avisados}** avisados por DM"
                    if rebaixados:
                        desc += f", **{rebaixados}** rebaixados a Visitante"
                    e = embed("🦊 Verificação de inatividade", desc, config.COR_AVISO)
                    e.set_footer(text=f"Limite: {dias} dias sem atividade")
                    await enviar_log(self.bot, guild, "logs_gerais", embed=e)
        except Exception:
            log.exception("Erro na verificação de inatividade")

    @checar_inativos.before_loop
    async def _antes_inativos(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Engajamento(bot))
