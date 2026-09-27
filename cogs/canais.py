"""Regras por canal (/canal-regra) e canal de sugestões.

Regras: so_anexos, so_comandos, auto_thread, reacao_auto. Os canais pérolas, caos e lore não têm
lógica especial: se quiser reações automáticas neles, use `/canal-regra adicionar ... reacao_auto`.
"""
from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Union

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import embed, responder, truncar
from utils.permissoes import exigir_nivel, nivel_do_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.canais")
URL_RE = re.compile(r"https?://\S+", re.I)
REGRAS_SO_TEXTO = {"so_anexos", "so_comandos", "reacao_auto"}
MAX_EMOJIS = 5
REGRAS_ESCOLHAS = [app_commands.Choice(name=nome, value=nome) for nome in textos.CANAL_REGRA_DESCRICOES]


class Canais(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    # ------------------------------------------------------------------ comandos
    grupo = app_commands.Group(name="canal-regra", description="Regras automáticas por canal.", guild_only=True)

    @grupo.command(name="adicionar", description="Ativa uma regra em um canal.")
    @app_commands.describe(
        canal="Canal de texto (ou fórum, para auto_thread)",
        regra="Qual regra",
        emojis="Só para reacao_auto: até 5 emojis separados por espaço",
    )
    @app_commands.choices(regra=REGRAS_ESCOLHAS)
    @exigir_nivel(config.NIVEL_ADMIN)
    async def adicionar(
        self,
        interaction: discord.Interaction,
        canal: Union[discord.TextChannel, discord.ForumChannel],
        regra: app_commands.Choice[str],
        emojis: str = "",
    ) -> None:
        if regra.value in REGRAS_SO_TEXTO and not isinstance(canal, discord.TextChannel):
            await responder(interaction, textos.CANAL_REGRA_SO_TEXTO)
            return
        if regra.value == "reacao_auto" and not emojis.split():
            await responder(interaction, textos.CANAL_REGRA_FALTA_EMOJI)
            return
        valor = " ".join(emojis.split()[:MAX_EMOJIS]) if regra.value == "reacao_auto" else ""
        await self.bot.banco.adicionar_regra_canal(interaction.guild_id, canal.id, regra.value, valor)  # type: ignore[arg-type]
        await responder(interaction, textos.CANAL_REGRA_ADICIONADA.format(regra=regra.value, canal=canal.mention))

    @grupo.command(name="remover", description="Remove uma regra de um canal.")
    @app_commands.describe(canal="Canal", regra="Qual regra")
    @app_commands.choices(regra=REGRAS_ESCOLHAS)
    @exigir_nivel(config.NIVEL_ADMIN)
    async def remover(
        self,
        interaction: discord.Interaction,
        canal: Union[discord.TextChannel, discord.ForumChannel],
        regra: app_commands.Choice[str],
    ) -> None:
        ok = await self.bot.banco.remover_regra_canal(interaction.guild_id, canal.id, regra.value)  # type: ignore[arg-type]
        if ok:
            await responder(interaction, textos.CANAL_REGRA_REMOVIDA.format(regra=regra.value, canal=canal.mention))
        else:
            await responder(interaction, textos.CANAL_REGRA_INEXISTENTE)

    @grupo.command(name="listar", description="Lista as regras de canal ativas.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def listar(self, interaction: discord.Interaction) -> None:
        regras = await self.bot.banco.regras_canal(interaction.guild_id)  # type: ignore[arg-type]
        if not regras:
            await responder(interaction, textos.CANAL_REGRA_VAZIO)
            return
        linhas = []
        for canal_id, dados in regras.items():
            partes = [f"`{r}`" + (f" ({v})" if v else "") for r, v in dados.items()]
            linhas.append(f"<#{canal_id}> — " + ", ".join(partes))
        await interaction.response.send_message(
            embed=embed("📌 Regras de canal", truncar("\n".join(linhas), 4000)), ephemeral=True
        )

    # ------------------------------------------------------------------ aplicação das regras
    @staticmethod
    def _tem_anexo(mensagem: discord.Message) -> bool:
        return bool(mensagem.attachments or mensagem.stickers or URL_RE.search(mensagem.content or ""))

    @staticmethod
    async def _apagar_e_avisar(mensagem: discord.Message, texto: str) -> None:
        try:
            await mensagem.delete()
        except discord.HTTPException:
            return
        try:
            await mensagem.channel.send(
                texto, delete_after=8, allowed_mentions=discord.AllowedMentions(users=[mensagem.author])
            )
        except discord.HTTPException:
            pass

    async def _sugestao(self, mensagem: discord.Message) -> None:
        for emoji in ("✅", "❌"):
            try:
                await mensagem.add_reaction(emoji)
            except discord.HTTPException:
                break
        if isinstance(mensagem.channel, discord.TextChannel):
            nome = textos.CANAL_THREAD_SUGESTAO.format(nome=mensagem.author.display_name)
            try:
                await mensagem.create_thread(name=truncar(nome, 90), auto_archive_duration=1440)
            except discord.HTTPException:
                pass

    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.guild is None or mensagem.author.bot or not isinstance(mensagem.author, discord.Member):
            return
        if isinstance(mensagem.channel, discord.Thread):
            return  # regras não valem dentro de threads
        banco, guild = self.bot.banco, mensagem.guild

        if (await banco.cfg(guild.id)).get("canal_sugestoes") == str(mensagem.channel.id):
            await self._sugestao(mensagem)
            return

        regras = (await banco.regras_canal(guild.id)).get(mensagem.channel.id)
        if not regras:
            return
        if await nivel_do_membro(self.bot, mensagem.author) < config.NIVEL_STAFF:
            if "so_comandos" in regras:
                await self._apagar_e_avisar(mensagem, textos.CANAL_AVISO_SO_COMANDOS.format(mencao=mensagem.author.mention))
                return
            if "so_anexos" in regras and not self._tem_anexo(mensagem):
                await self._apagar_e_avisar(mensagem, textos.CANAL_AVISO_SO_ANEXOS.format(mencao=mensagem.author.mention))
                return

        if "auto_thread" in regras and isinstance(mensagem.channel, discord.TextChannel):
            base = (mensagem.content or "").strip().splitlines()[0] if (mensagem.content or "").strip() else ""
            nome = base or textos.CANAL_THREAD_DUVIDA.format(nome=mensagem.author.display_name)
            try:
                await mensagem.create_thread(name=truncar(nome, 90), auto_archive_duration=1440)
            except discord.HTTPException:
                log.warning("Falha ao criar thread automática", exc_info=True)

        if "reacao_auto" in regras:
            for emoji in regras["reacao_auto"].split()[:MAX_EMOJIS]:
                try:
                    await mensagem.add_reaction(emoji)
                except discord.HTTPException:
                    pass  # emoji inválido ou sem permissão: ignora

    @commands.Cog.listener()
    async def on_thread_create(self, thread: discord.Thread) -> None:
        """Recepciona posts novos em fóruns com a regra auto_thread."""
        if thread.guild is None or thread.owner_id == getattr(self.bot.user, "id", None):
            return
        pai = self.bot.get_channel(thread.parent_id) if thread.parent_id else None
        if not isinstance(pai, discord.ForumChannel):
            return
        regras = (await self.bot.banco.regras_canal(thread.guild.id)).get(pai.id)
        if not regras or "auto_thread" not in regras:
            return
        try:
            await thread.send(textos.FORUM_BOAS_VINDAS, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao recepcionar post de fórum", exc_info=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Canais(bot))
