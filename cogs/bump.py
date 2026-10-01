"""Lembrete de bump do DISBOARD (no estilo dos bots de bump reminder).

Bots não conseguem usar o /bump de outro bot, então quem bumpa é sempre uma pessoa. A Kiza:
1. percebe o bump bem-sucedido pela resposta do DISBOARD (a imagem bot-command-image-bump.png aparece
   em qualquer idioma; o autor do comando vem no metadado da interação);
2. agradece, paga {moeda} e guarda a hora do próximo bump (cooldown de 2h do DISBOARD);
3. quando o cooldown acaba, chama o cargo de avisos de bump no canal.
O horário fica no banco, então um reinício no meio do caminho não perde o lembrete.
"""
from __future__ import annotations

import logging
import random
import time
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.permissoes import eh_membro
from utils.helpers import arquivo_banner, canal_da_funcao, embed, formatar_moeda, pode_gerenciar_cargo, responder

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.bump")

DISBOARD_ID = 302050872383242240
COOLDOWN_BUMP = 2 * 3600
MARCA_SUCESSO = "bot-command-image-bump"
BANNER_BUMP = "bump"


def eh_bump_ok(mensagem: discord.Message) -> bool:
    if mensagem.author.id != DISBOARD_ID:
        return False
    return any(MARCA_SUCESSO in (e.image.url or "") for e in mensagem.embeds if e.image)


def quem_bumpou(mensagem: discord.Message) -> Optional[discord.abc.User]:
    meta = getattr(mensagem, "interaction_metadata", None)
    if meta is not None and getattr(meta, "user", None) is not None:
        return meta.user
    antigo = getattr(mensagem, "interaction", None)  # campo antigo, ainda enviado pelo Discord
    return getattr(antigo, "user", None)


class Bump(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        self.relogio.start()

    async def cog_unload(self) -> None:
        self.relogio.cancel()

    async def _cfg(self, guild_id: int, chave: str) -> Optional[str]:
        return await self.bot.banco.get_config(guild_id, f"bump_{chave}")

    async def _set(self, guild_id: int, chave: str, valor: str) -> None:
        await self.bot.banco.set_config(guild_id, f"bump_{chave}", valor)

    # ------------------------------------------------------------------ detectar o bump
    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        await self._talvez_registrar(mensagem)

    @commands.Cog.listener()
    async def on_message_edit(self, _antes: discord.Message, depois: discord.Message) -> None:
        await self._talvez_registrar(depois)  # o DISBOARD às vezes responde "pensando..." e edita depois

    async def _talvez_registrar(self, mensagem: discord.Message) -> None:
        guild = mensagem.guild
        if guild is None or not eh_bump_ok(mensagem):
            return
        if await self._cfg(guild.id, "msg") == str(mensagem.id):
            return  # já registrado (mensagem editada de novo)
        await self._set(guild.id, "msg", str(mensagem.id))

        quando = int(mensagem.created_at.timestamp()) + COOLDOWN_BUMP
        await self._set(guild.id, "proximo", str(quando))
        await self._set(guild.id, "lembrado", "0")
        await self._set(guild.id, "canal_ultimo", str(mensagem.channel.id))

        autor = quem_bumpou(mensagem)
        if autor is None:
            return
        await self._set(guild.id, "quem", str(autor.id))
        await self._set(guild.id, "ts", str(int(mensagem.created_at.timestamp())))
        premio = await self.bot.banco.ajuste(guild.id, "bump_premio")
        # valor 0 também registra: é o que conta no ranking de bumps
        await self.bot.banco.recompensar_uma_vez(guild.id, f"bump:{mensagem.id}", autor.id, premio, "bump")
        if premio > 0:
            texto = random.choice(textos.BUMP_OBRIGADO).format(
                mencao=autor.mention, premio=formatar_moeda(premio), quando=quando
            )
        else:
            texto = textos.BUMP_OBRIGADO_SEM_PREMIO.format(mencao=autor.mention, quando=quando)
        try:
            await mensagem.channel.send(texto, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao agradecer bump em %s", guild.id, exc_info=True)

    # ------------------------------------------------------------------ lembrete
    @tasks.loop(minutes=1)
    async def relogio(self) -> None:
        agora = time.time()
        for guild in list(self.bot.guilds):
            try:
                await self._talvez_lembrar(guild, agora)
            except Exception:
                log.exception("Falha no lembrete de bump em %s", guild.id)

    @relogio.before_loop
    async def _antes(self) -> None:
        await self.bot.wait_until_ready()

    async def _talvez_lembrar(self, guild: discord.Guild, agora: float) -> None:
        proximo = await self._cfg(guild.id, "proximo")
        if not proximo or agora < int(proximo) or await self._cfg(guild.id, "lembrado") == "1":
            return
        if await self.bot.banco.ajuste(guild.id, "bump_lembrete") != 1:
            return
        await self._set(guild.id, "lembrado", "1")  # marca antes: falhar é melhor que chamar duas vezes
        canal = await self._canal(guild)
        if canal is None:
            return
        cargo = await self._cargo(guild)
        e = embed(None, random.choice(textos.BUMP_LEMBRETE), config.COR_AVISO)
        banner = arquivo_banner(BANNER_BUMP)
        if banner is not None:
            e.set_image(url=f"attachment://{banner.filename}")  # imagem embaixo do texto
        try:
            await canal.send(
                content=cargo.mention if cargo else None,  # menção dentro de embed não notifica
                embed=e,
                files=[banner] if banner else [],
                allowed_mentions=discord.AllowedMentions(roles=[cargo] if cargo else False),
            )
        except discord.HTTPException:
            log.warning("Falha ao lembrar do bump em %s", guild.id, exc_info=True)

    async def _canal(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        canal = await canal_da_funcao(self.bot, guild, "bump")
        if isinstance(canal, discord.TextChannel):
            return canal
        ultimo = await self._cfg(guild.id, "canal_ultimo")
        canal = guild.get_channel(int(ultimo)) if ultimo and ultimo.isdigit() else None
        return canal if isinstance(canal, discord.TextChannel) else None

    async def _cargo(self, guild: discord.Guild) -> Optional[discord.Role]:
        cargo_id = await self.bot.banco.get_config_int(guild.id, "cargo_bump")
        return guild.get_role(cargo_id) if cargo_id else None

    # ------------------------------------------------------------------ comandos
    @app_commands.command(name="bump-status", description="Quando dá para dar /bump de novo e quem mais bumpou.")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 10.0)
    async def bump_status(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        proximo = await self._cfg(guild.id, "proximo")
        if not proximo:
            linhas = [textos.BUMP_STATUS_NUNCA]
        elif time.time() >= int(proximo):
            linhas = [textos.BUMP_STATUS_PRONTO]
        else:
            linhas = [textos.BUMP_STATUS_ESPERA.format(quando=int(proximo))]
        quem, ts = await self._cfg(guild.id, "quem"), await self._cfg(guild.id, "ts")
        if quem and ts:
            linhas.append(textos.BUMP_STATUS_ULTIMO.format(quem=f"<@{quem}>", quando=ts))
        e = embed(textos.BUMP_STATUS_TITULO, "\n".join(linhas))
        top = await self.bot.banco.top_recompensas(guild.id, "bump:", 5)
        if top:
            medalhas = ["🥇", "🥈", "🥉", "4.", "5."]
            e.add_field(
                name=textos.BUMP_RANKING,
                value="\n".join(f"{medalhas[i]} <@{uid}> — **{n}**" for i, (uid, n) in enumerate(top)),
                inline=False,
            )
        await responder(interaction, embed=e, ephemeral=False)

    @app_commands.command(name="bump-avisos", description="Liga ou desliga a menção quando der para dar bump.")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 5.0)
    async def bump_avisos(self, interaction: discord.Interaction) -> None:
        await self.alternar_avisos(interaction)

    async def alternar_avisos(self, interaction: discord.Interaction) -> None:
        """Usado pelo /bump-avisos e pelo botão do canal de cargos."""
        guild, membro = interaction.guild, interaction.user
        if guild is None or not isinstance(membro, discord.Member):
            return
        if not await eh_membro(self.bot, membro):
            await responder(interaction, textos.CARGOS_SO_MEMBROS)
            return
        cargo = await self._cargo(guild)
        if cargo is None:
            await responder(interaction, textos.BUMP_AVISOS_SEM_CARGO)
            return
        if not pode_gerenciar_cargo(guild, cargo):
            await responder(interaction, textos.CARGOS_ERRO_PERM.format(cargo=cargo.name))
            return
        try:
            if cargo in membro.roles:
                await membro.remove_roles(cargo, reason="Kiza: avisos de bump")
                await responder(interaction, textos.BUMP_AVISOS_DESLIGADO)
            else:
                await membro.add_roles(cargo, reason="Kiza: avisos de bump")
                await responder(interaction, textos.BUMP_AVISOS_LIGADO)
        except discord.Forbidden:
            await responder(interaction, textos.CARGOS_ERRO_PERM.format(cargo=cargo.name))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Bump(bot))
