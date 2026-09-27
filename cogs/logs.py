"""Logs gerais: entradas/saídas, mensagens editadas/apagadas, mudanças de cargo e apelido."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands

import config
from utils.helpers import embed, enviar_log, truncar

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.logs")


class Logs(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def _canal_de_log(self, guild: discord.Guild, canal_id: int) -> bool:
        """True se o canal é um dos canais de log (evita loops de log sobre log)."""
        cfg = await self.bot.banco.cfg(guild.id)
        return str(canal_id) in (cfg.get("canal_logs_mod"), cfg.get("canal_logs_gerais"))

    async def _log(self, guild: discord.Guild, e: discord.Embed) -> None:
        e.timestamp = discord.utils.utcnow()
        await enviar_log(self.bot, guild, "logs_gerais", embed=e)

    # ------------------------------------------------------------------ membros
    @commands.Cog.listener()
    async def on_member_join(self, membro: discord.Member) -> None:
        criada = int(membro.created_at.timestamp())
        e = embed("📥 Entrou no servidor", f"{membro.mention} (`{membro.id}`)", config.COR_OK)
        e.add_field(name="Conta criada", value=f"<t:{criada}:R>")
        e.set_thumbnail(url=membro.display_avatar.url)
        await self._log(membro.guild, e)

    async def _achar_expulsao(self, guild: discord.Guild, membro: discord.Member) -> Optional[discord.abc.User]:
        try:
            async for entrada in guild.audit_logs(limit=5, action=discord.AuditLogAction.kick):
                recente = (discord.utils.utcnow() - entrada.created_at).total_seconds() < 15
                if recente and entrada.target is not None and entrada.target.id == membro.id:
                    return entrada.user
        except (discord.Forbidden, discord.HTTPException):
            pass
        return None

    @commands.Cog.listener()
    async def on_member_remove(self, membro: discord.Member) -> None:
        expulsor = await self._achar_expulsao(membro.guild, membro)
        titulo = "📤 Saiu do servidor" if expulsor is None else "👢 Foi expulso(a)"
        e = embed(titulo, f"{membro.mention} (`{membro.id}`)", config.COR_AVISO)
        if expulsor is not None:
            e.add_field(name="Por", value=expulsor.mention)
        if membro.joined_at is not None:
            e.add_field(name="Entrou", value=f"<t:{int(membro.joined_at.timestamp())}:R>")
        await self._log(membro.guild, e)

    @commands.Cog.listener()
    async def on_member_update(self, antes: discord.Member, depois: discord.Member) -> None:
        adicionados = set(depois.roles) - set(antes.roles)
        removidos = set(antes.roles) - set(depois.roles)
        if adicionados or removidos:
            e = embed("🎭 Cargos alterados", f"{depois.mention} (`{depois.id}`)", config.COR_INFO)
            if adicionados:
                e.add_field(name="Adicionados", value=" ".join(r.mention for r in adicionados), inline=False)
            if removidos:
                e.add_field(name="Removidos", value=" ".join(r.mention for r in removidos), inline=False)
            await self._log(depois.guild, e)
        if antes.nick != depois.nick:
            e = embed("✏️ Apelido alterado", f"{depois.mention} (`{depois.id}`)", config.COR_INFO)
            e.add_field(name="Antes", value=antes.nick or "*nenhum*")
            e.add_field(name="Depois", value=depois.nick or "*nenhum*")
            await self._log(depois.guild, e)

    # ------------------------------------------------------------------ mensagens
    @commands.Cog.listener()
    async def on_message_edit(self, antes: discord.Message, depois: discord.Message) -> None:
        if antes.guild is None or antes.author.bot or antes.content == depois.content:
            return
        if await self._canal_de_log(antes.guild, antes.channel.id):
            return
        e = embed("✏️ Mensagem editada", f"{antes.author.mention} em {antes.channel.mention}  [ir]({depois.jump_url})", config.COR_INFO)  # type: ignore[union-attr]
        e.add_field(name="Antes", value=truncar(antes.content, 1000) or "*vazio*", inline=False)
        e.add_field(name="Depois", value=truncar(depois.content, 1000) or "*vazio*", inline=False)
        await self._log(antes.guild, e)

    @commands.Cog.listener()
    async def on_message_delete(self, mensagem: discord.Message) -> None:
        if mensagem.guild is None or mensagem.author.bot:
            return
        if await self._canal_de_log(mensagem.guild, mensagem.channel.id):
            return
        if not mensagem.content and not mensagem.attachments:
            return
        e = embed("🗑️ Mensagem apagada", f"{mensagem.author.mention} em {mensagem.channel.mention}", config.COR_ERRO)  # type: ignore[union-attr]
        if mensagem.content:
            e.add_field(name="Conteúdo", value=truncar(mensagem.content, 1000), inline=False)
        if mensagem.attachments:
            e.add_field(name="Anexos", value=truncar("\n".join(a.filename for a in mensagem.attachments), 500), inline=False)
        await self._log(mensagem.guild, e)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Logs(bot))
