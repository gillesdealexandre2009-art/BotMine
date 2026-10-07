"""Canais fixos da toca: infos, seja-um-kitsune, lore, changelog, comandos e dúvidas (FAQ).

Cada um é um painel publicado pelo /setup → Publicar painéis. Republicar edita a mensagem em vez de duplicar.
Em canais de fórum (infos/dúvidas costumam ser fórum), o painel vira um post fixado.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Union

import discord
from discord.ext import commands

import config
import textos
from utils.helpers import canal_da_funcao, com_banner, embed, publicar_ou_editar, publicar_ou_editar_forum

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.vitrine")

TEXTO_OU_FORUM = (discord.TextChannel, discord.ForumChannel)


class Vitrine(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def _mencoes(self, guild: discord.Guild) -> dict[str, str]:
        """Valores para os {campos} dos textos: menções dos canais (ou um nome genérico) e a moeda."""
        nomes = {
            "regras": ("regras", "regras"),
            "cargos": ("painel_cargos", "canal de cargos"),
            "chat": ("chat", "chat"),
            "tickets": ("tickets", "canal de tíquetes"),
            "duvidas": ("duvidas", "canal de dúvidas"),
        }
        valores = {"moeda": config.MOEDA_NOME}
        for campo, (chave, generico) in nomes.items():
            canal = await canal_da_funcao(self.bot, guild, chave, TEXTO_OU_FORUM)
            valores[campo] = canal.mention if canal else f"**{generico}**"
        return valores

    @staticmethod
    def _montar(titulo: str, desc: str, campos: list[tuple[str, str]], rodape: str, valores: dict[str, str]) -> discord.Embed:
        e = embed(titulo, desc.format(**valores))
        for nome, valor in campos:
            e.add_field(name=nome.format(**valores), value=valor.format(**valores), inline=False)
        if rodape:
            e.set_footer(text=rodape)
        return e

    async def _publicar(
        self,
        guild: discord.Guild,
        chave: str,
        e: discord.Embed,
        *,
        titulo_post: str = "",
        aceita_forum: bool = False,
    ) -> tuple[bool, str]:
        tipos = TEXTO_OU_FORUM if aceita_forum else (discord.TextChannel,)
        canal: Union[discord.TextChannel, discord.ForumChannel, None] = await canal_da_funcao(self.bot, guild, chave, tipos)
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        embeds, arquivos = com_banner(chave, [e])
        try:
            if isinstance(canal, discord.ForumChannel):
                post = await publicar_ou_editar_forum(
                    self.bot, guild, canal, chave, titulo_post or e.title or chave, embeds=embeds, arquivos=arquivos
                )
                return True, post.mention
            await publicar_ou_editar(self.bot, guild, canal, chave, embeds=embeds, arquivos=arquivos)
        except discord.HTTPException:
            log.warning("Falha ao publicar %s", chave, exc_info=True)
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    # ------------------------------------------------------------------ publicadores (usados pelo /setup)
    async def publicar_infos(self, guild: discord.Guild) -> tuple[bool, str]:
        v = await self._mencoes(guild)
        e = self._montar(textos.INFOS_TITULO, textos.INFOS_DESC, textos.INFOS_CAMPOS, textos.INFOS_RODAPE, v)
        return await self._publicar(guild, "infos", e, titulo_post=textos.INFOS_POST, aceita_forum=True)

    async def publicar_kitsune(self, guild: discord.Guild) -> tuple[bool, str]:
        v = await self._mencoes(guild)
        e = self._montar(textos.KITSUNE_TITULO, textos.KITSUNE_DESC, textos.KITSUNE_CAMPOS, textos.KITSUNE_RODAPE, v)
        cargo_id = await self.bot.banco.get_config_int(guild.id, "cargo_kitsune")
        cargo = guild.get_role(cargo_id) if cargo_id else None
        if cargo is not None:
            e.color = cargo.color if cargo.color.value else e.color
        return await self._publicar(guild, "kitsune", e)

    async def publicar_lore(self, guild: discord.Guild) -> tuple[bool, str]:
        e = self._montar(textos.LORE_TITULO, "", textos.LORE_CAPITULOS, textos.LORE_RODAPE, {})
        return await self._publicar(guild, "lore", e)

    async def publicar_comandos(self, guild: discord.Guild) -> tuple[bool, str]:
        v = await self._mencoes(guild)
        e = self._montar(textos.COMANDOS_TITULO, textos.COMANDOS_DESC, textos.COMANDOS_CAMPOS, textos.COMANDOS_RODAPE, v)
        return await self._publicar(guild, "comandos", e)

    async def publicar_duvidas(self, guild: discord.Guild) -> tuple[bool, str]:
        v = await self._mencoes(guild)
        e = self._montar(textos.DUVIDAS_TITULO, textos.DUVIDAS_DESC, textos.DUVIDAS_CAMPOS, "", v)
        return await self._publicar(guild, "duvidas", e, titulo_post=textos.DUVIDAS_POST, aceita_forum=True)

    async def publicar_changelog(self, guild: discord.Guild) -> tuple[bool, str]:
        """Uma mensagem por versão, da mais antiga para a mais nova (a mais nova fica embaixo)."""
        canal = await canal_da_funcao(self.bot, guild, "changelog")
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        valores = {"moeda": config.MOEDA_NOME}
        membro_id = await self.bot.banco.get_config_int(guild.id, "cargo_membro")
        cargo = guild.get_role(membro_id) if membro_id else None
        aviso = f"|| {cargo.mention} ||" if cargo else None  # sempre marca os membros, escondido no spoiler
        total = len(textos.CHANGELOG)
        for i, (versao, titulo, itens) in enumerate(reversed(textos.CHANGELOG)):
            e = embed(
                textos.CHANGELOG_TITULO.format(versao=versao, titulo=titulo),
                "\n".join(f"• {item.format(**valores)}" for item in itens),
            )
            # banner só na primeira mensagem do canal, para não repetir a mesma imagem em toda versão
            embeds, arquivos = com_banner("changelog", [e]) if i == 0 else ([e], [])
            try:
                await publicar_ou_editar(
                    self.bot, guild, canal, f"changelog_{versao}", embeds=embeds, arquivos=arquivos, content=aviso,
                    # só a versão mais nova (mensagem nova) notifica; as outras só mostram a marcação
                    mencoes=discord.AllowedMentions(roles=[cargo]) if cargo and i == total - 1 else None,
                )
            except discord.HTTPException:
                log.warning("Falha ao publicar changelog %s", versao, exc_info=True)
                return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Vitrine(bot))
