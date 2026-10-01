"""XP por mensagem, níveis com cargos, /rank e /ranking."""
from __future__ import annotations

import logging
import random
import time
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import barra_progresso, embed, formatar_moeda, formatar_numero, nivel_por_xp, pode_gerenciar_cargo
from utils.permissoes import checar_membro, eh_kitsune, eh_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.xp")
MEDALHAS = ["🥇", "🥈", "🥉"]


class XP(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._proximo: dict[tuple[int, int], float] = {}
        self._ultima: dict[tuple[int, int], str] = {}

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # ------------------------------------------------------------------ ganho de XP
    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.author.bot or mensagem.guild is None or not isinstance(mensagem.author, discord.Member):
            return
        if mensagem.type not in (discord.MessageType.default, discord.MessageType.reply):
            return
        texto = mensagem.content.strip().lower()
        if len(texto) < 4 and not mensagem.attachments:
            return
        membro, guild, banco = mensagem.author, mensagem.guild, self.bot.banco
        if await banco.get_config_int(guild.id, "cargo_membro") is None:
            return  # servidor ainda não configurado: XP desligado
        chave = (guild.id, membro.id)
        agora = time.monotonic()
        if agora < self._proximo.get(chave, 0.0):
            return
        if texto and self._ultima.get(chave) == texto:
            return  # anti-farm: mensagem repetida não rende XP
        if not await eh_membro(self.bot, membro):
            return

        if len(self._proximo) > 5000:  # limpeza simples para não crescer sem limite
            self._proximo.clear()
            self._ultima.clear()
        self._proximo[chave] = agora + await banco.ajuste(guild.id, "xp_cooldown")
        self._ultima[chave] = texto

        xp_min = await banco.ajuste(guild.id, "xp_min")
        xp_max = await banco.ajuste(guild.id, "xp_max")
        ganho = random.randint(min(xp_min, xp_max), max(xp_min, xp_max))
        if await eh_kitsune(self.bot, membro):
            ganho = ganho * (100 + await banco.ajuste(guild.id, "kitsune_xp_pct")) // 100

        antes, depois = await banco.adicionar_xp(guild.id, membro.id, ganho)
        nivel_antes, nivel_depois = nivel_por_xp(antes)[0], nivel_por_xp(depois)[0]
        if nivel_depois > nivel_antes:
            await self.aplicar_cargo_nivel(membro, nivel_depois)
            if await banco.ajuste(guild.id, "xp_aviso_nivel") == 1:
                try:
                    await mensagem.channel.send(
                        random.choice(textos.XP_NIVEL_UP_FRASES).format(mencao=membro.mention, nivel=nivel_depois),
                        allowed_mentions=discord.AllowedMentions(users=[membro]),
                    )
                except discord.HTTPException:
                    pass

    async def aplicar_cargo_nivel(self, membro: discord.Member, nivel: int) -> None:
        """Dá o cargo do maior degrau de XP já alcançado e tira os degraus anteriores."""
        guild = membro.guild
        degraus = await self.bot.banco.listar_cargos_xp(guild.id)
        if not degraus:
            return
        elegiveis = [role_id for lvl, role_id in degraus if lvl <= nivel]
        alvo_id = elegiveis[-1] if elegiveis else None
        todos = {role_id for _, role_id in degraus}
        remover = [r for r in membro.roles if r.id in todos and r.id != alvo_id and pode_gerenciar_cargo(guild, r)]
        novo = guild.get_role(alvo_id) if alvo_id else None
        try:
            if remover:
                await membro.remove_roles(*remover, reason="Kiza: cargo de nível de XP")
            if novo is not None and novo not in membro.roles and pode_gerenciar_cargo(guild, novo):
                await membro.add_roles(novo, reason="Kiza: cargo de nível de XP")
        except discord.HTTPException:
            log.warning("Falha ao atualizar cargo de nível de %s", membro.id, exc_info=True)

    # ------------------------------------------------------------------ comandos
    @app_commands.command(name="rank", description="Mostra seu nível e XP (ou de outra pessoa).")
    @app_commands.guild_only()
    @app_commands.describe(membro="De quem (padrão: você)")
    @app_commands.checks.cooldown(1, 5.0)
    async def rank(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None) -> None:
        alvo = membro or interaction.user
        assert interaction.guild_id is not None
        perfil = await self.bot.banco.obter_perfil(interaction.guild_id, alvo.id)
        nivel, dentro, necessario = nivel_por_xp(perfil["xp"])
        pos = await self.bot.banco.posicao(interaction.guild_id, alvo.id, "xp")
        e = embed(textos.RANK_TITULO.format(nome=alvo.display_name))
        e.set_thumbnail(url=alvo.display_avatar.url)
        e.add_field(name="Nível", value=str(nivel))
        e.add_field(name="XP total", value=formatar_numero(perfil["xp"]))
        e.add_field(name="Posição", value=f"#{pos}" if pos and perfil["xp"] > 0 else "—")
        e.add_field(
            name="Próximo nível",
            value=f"{barra_progresso(dentro, necessario)}  {formatar_numero(dentro)}/{formatar_numero(necessario)}",
            inline=False,
        )
        await interaction.response.send_message(embed=e)

    @app_commands.command(name="ranking", description="Os 10 primeiros do servidor.")
    @app_commands.guild_only()
    @app_commands.describe(tipo="XP ou moedas")
    @app_commands.choices(
        tipo=[
            app_commands.Choice(name="XP", value="xp"),
            app_commands.Choice(name=config.MOEDA_NOME, value="saldo"),
        ]
    )
    @app_commands.checks.cooldown(1, 10.0)
    async def ranking(self, interaction: discord.Interaction, tipo: Optional[app_commands.Choice[str]] = None) -> None:
        coluna = tipo.value if tipo else "xp"
        assert interaction.guild is not None
        linhas_db = await self.bot.banco.top(interaction.guild.id, coluna, 10)
        if not linhas_db:
            await interaction.response.send_message(textos.RANKING_VAZIO, ephemeral=True)
            return
        linhas = []
        for i, linha in enumerate(linhas_db):
            membro = interaction.guild.get_member(linha["user_id"])
            nome = membro.display_name if membro else f"<@{linha['user_id']}>"
            if coluna == "xp":
                valor = f"nível {nivel_por_xp(linha['xp'])[0]} • {formatar_numero(linha['xp'])} XP"
            else:
                valor = formatar_moeda(linha["saldo"])
            marca = MEDALHAS[i] if i < 3 else f"`{i + 1}.`"
            linhas.append(f"{marca} **{nome}** — {valor}")
        titulo = (
            textos.RANKING_TITULO_XP
            if coluna == "xp"
            else textos.RANKING_TITULO_MOEDAS.format(emoji=config.MOEDA_EMOJI, moeda=config.MOEDA_NOME)
        )
        await interaction.response.send_message(embed=embed(titulo, "\n".join(linhas)))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(XP(bot))
