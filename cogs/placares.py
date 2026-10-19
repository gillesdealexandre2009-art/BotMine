"""Placares fixos no canal #placares: mais tempo em call, maior sessão de jogo seguida e mais tempo de jogo no total.

Cada placar é uma mensagem que a Kiza edita (nunca posta de novo) a cada 10 minutos, e só quando algo mudou. O tempo em call vale
para qualquer sala de voz (menos AFK), com gente suficiente e sem estar ensurdecido (mesma regra da fidelidade); o tempo de jogo vem
do status que o servidor manda a cada minuto (veja database/placares.py).
"""
from __future__ import annotations

import json
import logging
import time
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands, tasks

import config
import textos
from cogs.fidelidade import membros_que_contam_na_call, tempo_em_call
from utils.helpers import embed, publicar_ou_editar

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.placares")
MEDALHAS = ("🥇", "🥈", "🥉")
TOP = 10


def duracao(segundos: int) -> str:
    """'3h20', '45min' ou '2d 5h' (de 24 h para cima)."""
    segundos = max(0, int(segundos))
    if segundos >= 86400:
        dias, resto = divmod(segundos, 86400)
        return f"{dias}d {resto // 3600}h"
    return tempo_em_call(segundos // 60)


def linhas_do_placar(itens: list[tuple[str, str]]) -> str:
    """[(quem, valor)] em 'medalha quem: valor', uma por linha. Vazio vira o texto de placar sem dados."""
    if not itens:
        return textos.PLACAR_VAZIO
    saida = []
    for i, (quem, valor) in enumerate(itens):
        marca = MEDALHAS[i] if i < len(MEDALHAS) else f"**{i + 1}.**"
        saida.append(f"{marca} {quem}: **{valor}**")
    return "\n".join(saida)


class Placares(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._assinaturas: dict[tuple[int, str], str] = {}  # (servidor, placar) -> conteúdo publicado por último

    async def cog_load(self) -> None:
        self.contar_voz.start()
        self.atualizar.start()

    async def cog_unload(self) -> None:
        self.contar_voz.cancel()
        self.atualizar.cancel()

    async def ligado(self, guild_id: int) -> bool:
        return bool(await self.bot.banco.ajuste(guild_id, "placares_ligado"))

    # ------------------------------------------------------------------ tempo em call
    @tasks.loop(seconds=60)
    async def contar_voz(self) -> None:
        try:
            for guild in self.bot.guilds:
                if not await self.ligado(guild.id):
                    continue
                contam: list[int] = []
                for canal in [*guild.voice_channels, *guild.stage_channels]:
                    if guild.afk_channel is not None and canal.id == guild.afk_channel.id:
                        continue
                    contam += [m.id for m in membros_que_contam_na_call(canal.members)]
                await self.bot.banco.voz_somar(guild.id, contam)
        except Exception:
            log.exception("Erro ao contar o tempo em call")

    @contar_voz.before_loop
    async def _antes_voz(self) -> None:
        await self.bot.wait_until_ready()

    # ------------------------------------------------------------------ montagem
    def _nome_discord(self, guild: discord.Guild, user_id: int) -> str:
        membro = guild.get_member(user_id)
        return discord.utils.escape_markdown(membro.display_name) if membro else f"<@{user_id}>"

    async def _nome_do_jogador(self, guild: discord.Guild, nome_mc: str) -> str:
        vinculo = await self.bot.banco.mc_vinculo_por_nome(guild.id, nome_mc)
        if vinculo is not None:
            return self._nome_discord(guild, int(vinculo["user_id"]))
        return discord.utils.escape_markdown(nome_mc)

    async def montar(self, guild: discord.Guild) -> dict[str, discord.Embed]:
        banco = self.bot.banco
        voz = [(self._nome_discord(guild, int(r["user_id"])), tempo_em_call(int(r["minutos"]))) for r in await banco.voz_ranking(guild.id, TOP)]
        sessao = [(await self._nome_do_jogador(guild, r["nome"]), duracao(int(r["maior_s"]))) for r in await banco.mc_tempo_ranking(guild.id, "maior_s", TOP)]
        total = [(await self._nome_do_jogador(guild, r["nome"]), duracao(int(r["total_s"]))) for r in await banco.mc_tempo_ranking(guild.id, "total_s", TOP)]
        return {
            "voz": embed(textos.PLACAR_VOZ_TITULO, textos.PLACAR_VOZ_DESC + "\n\n" + linhas_do_placar(voz), config.COR_PRINCIPAL),
            "sessao": embed(textos.PLACAR_SESSAO_TITULO, textos.PLACAR_SESSAO_DESC + "\n\n" + linhas_do_placar(sessao), config.COR_INFO),
            "total": embed(textos.PLACAR_TOTAL_TITULO, textos.PLACAR_TOTAL_DESC + "\n\n" + linhas_do_placar(total), config.COR_PRINCIPAL),
        }

    async def _canal(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        from utils.helpers import canal_da_funcao

        canal = await canal_da_funcao(self.bot, guild, "placares")
        if canal is None:
            alvo = guild.get_channel(config.CANAL_PLACARES_ID)
            canal = alvo if isinstance(alvo, discord.TextChannel) else None
        return canal

    async def publicar(self, guild: discord.Guild, forcar: bool = False) -> Optional[discord.TextChannel]:
        """Publica (ou edita) os três placares. Sem `forcar`, só mexe no que mudou. Devolve o canal, ou None se não há canal."""
        canal = await self._canal(guild)
        if canal is None:
            return None
        agora = int(time.time())
        for chave, e in (await self.montar(guild)).items():
            assinatura = json.dumps(e.to_dict(), sort_keys=True)
            if not forcar and self._assinaturas.get((guild.id, chave)) == assinatura:
                continue
            e.set_footer(text=textos.PLACAR_RODAPE)
            e.timestamp = discord.utils.utcnow().replace(microsecond=0)
            await publicar_ou_editar(self.bot, guild, canal, f"placar_{chave}", embeds=[e])
            self._assinaturas[(guild.id, chave)] = assinatura
            log.debug("Placar %s atualizado em %s", chave, agora)
        return canal

    async def publicar_placares(self, guild: discord.Guild) -> tuple[bool, str]:
        """Botão Placares do /setup."""
        try:
            canal = await self.publicar(guild, forcar=True)
        except discord.HTTPException:
            log.warning("Falha ao publicar os placares", exc_info=True)
            return False, textos.SETUP_ERRO_PUBLICAR
        if canal is None:
            return False, textos.SETUP_SEM_CANAL
        return True, canal.mention

    @tasks.loop(minutes=10)
    async def atualizar(self) -> None:
        try:
            for guild in self.bot.guilds:
                if await self.ligado(guild.id):
                    await self.publicar(guild)
        except Exception:
            log.exception("Erro ao atualizar os placares")

    @atualizar.before_loop
    async def _antes_atualizar(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Placares(bot))
