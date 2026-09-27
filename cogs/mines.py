"""Mines: joguinho por diversão com a moeda virtual do servidor (sem valor real).

Proteções: aposta máxima e cooldown configuráveis; débito atômico junto com o registro do jogo
pendente; pagamento idempotente (só a primeira finalização paga); apostas de jogos interrompidos
por reinício são devolvidas na inicialização; se o tempo acabar, resgata automaticamente.
"""
from __future__ import annotations

import logging
import random
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import embed, formatar_moeda, responder
from utils.jogos import multiplicador
from utils.permissoes import checar_membro
from utils.views import DonoView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.mines")
JOGO = "mines"
_rng = random.SystemRandom()


class CasaMina(discord.ui.Button):
    def __init__(self, indice: int) -> None:
        super().__init__(label="?", style=discord.ButtonStyle.secondary, row=indice // 4)
        self.indice = indice

    async def callback(self, interaction: discord.Interaction) -> None:
        v: MinasView = self.view  # type: ignore[assignment]
        if v.finalizado:
            await responder(interaction, textos.MINES_ENCERRADO)
            return
        if self.indice in v.minas:
            await v.encerrar(interaction, "explodiu")
            return
        v.reveladas.add(self.indice)
        self.label, self.style, self.disabled = "⭐", discord.ButtonStyle.success, True
        if len(v.reveladas) == config.MINES_CASAS - v.n_minas:
            await v.encerrar(interaction, "perfeito")
            return
        await interaction.response.edit_message(embed=v.embed(), view=v)


class BotaoResgatar(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label=textos.MINES_RESGATAR, emoji="💰", style=discord.ButtonStyle.primary, row=4)

    async def callback(self, interaction: discord.Interaction) -> None:
        v: MinasView = self.view  # type: ignore[assignment]
        if v.finalizado:
            await responder(interaction, textos.MINES_ENCERRADO)
            return
        await v.encerrar(interaction, "resgate")


class MinasView(DonoView):
    def __init__(self, cog: "Mines", guild_id: int, jogador: discord.Member, aposta: int, n_minas: int) -> None:
        super().__init__(jogador.id, timeout=300)
        self.cog = cog
        self.guild_id = guild_id
        self.jogador = jogador
        self.aposta = aposta
        self.n_minas = n_minas
        self.minas = set(_rng.sample(range(config.MINES_CASAS), n_minas))
        self.reveladas: set[int] = set()
        self.finalizado = False
        self.mensagem: Optional[discord.Message] = None
        for i in range(config.MINES_CASAS):
            self.add_item(CasaMina(i))
        self.add_item(BotaoResgatar())

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.jogador.id:
            await responder(interaction, textos.MINES_NAO_E_SEU)
            return False
        return True

    def premio_atual(self) -> int:
        return int(self.aposta * multiplicador(self.n_minas, len(self.reveladas)))

    def embed(self, resultado: Optional[str] = None, cor: Optional[int] = None) -> discord.Embed:
        mult = multiplicador(self.n_minas, len(self.reveladas))
        descricao = textos.MINES_DESC.format(
            aposta=formatar_moeda(self.aposta),
            minas=self.n_minas,
            mult=f"{mult:.2f}",
            premio=formatar_moeda(self.premio_atual()),
        )
        if resultado:
            descricao = resultado + "\n\n" + descricao
        return embed(textos.MINES_TITULO, descricao, cor)

    def _revelar_tudo(self) -> None:
        for item in self.children:
            if isinstance(item, CasaMina):
                if item.indice in self.minas:
                    item.label, item.style = "💥", discord.ButtonStyle.danger
                item.disabled = True
            else:
                item.disabled = True  # type: ignore[union-attr]

    async def encerrar(self, interaction: discord.Interaction, motivo: str) -> None:
        """motivo: 'explodiu' | 'resgate' | 'perfeito'. A trava `finalizado` vem antes de qualquer await."""
        if self.finalizado:
            await responder(interaction, textos.MINES_ENCERRADO)
            return
        self.finalizado = True
        self.stop()
        banco = self.cog.bot.banco
        if motivo == "explodiu":
            saldo = await banco.finalizar_jogo(self.guild_id, self.jogador.id, JOGO, 0, "mines_perda")
            texto = textos.MINES_PERDEU.format(aposta=formatar_moeda(self.aposta), saldo=formatar_moeda(saldo or 0))
            cor = config.COR_ERRO
        else:
            premio = self.premio_atual()
            mult = f"{multiplicador(self.n_minas, len(self.reveladas)):.2f}"
            tipo = "mines_premio" if self.reveladas else "mines_reembolso"
            saldo = await banco.finalizar_jogo(self.guild_id, self.jogador.id, JOGO, premio, tipo)
            if motivo == "perfeito":
                texto = textos.MINES_PERFEITO.format(premio=formatar_moeda(premio), saldo=formatar_moeda(saldo or 0))
            else:
                texto = textos.MINES_GANHOU.format(
                    premio=formatar_moeda(premio), mult=mult, saldo=formatar_moeda(saldo or 0)
                )
            cor = config.COR_OK
        if saldo is None:  # já tinha sido encerrado (ex.: reembolso por reinício)
            texto, cor = textos.MINES_ENCERRADO, config.COR_AVISO
        self._revelar_tudo()
        await interaction.response.edit_message(embed=self.embed(texto, cor), view=self)

    async def on_timeout(self) -> None:
        if self.finalizado:
            return
        self.finalizado = True
        banco = self.cog.bot.banco
        premio = self.premio_atual()
        tipo = "mines_premio" if self.reveladas else "mines_reembolso"
        saldo = await banco.finalizar_jogo(self.guild_id, self.jogador.id, JOGO, premio, tipo)
        if saldo is None:
            return
        if self.reveladas:
            texto = textos.MINES_TIMEOUT.format(premio=formatar_moeda(premio), saldo=formatar_moeda(saldo))
        else:
            texto = textos.MINES_REEMBOLSO.format(aposta=formatar_moeda(self.aposta), saldo=formatar_moeda(saldo))
        self._revelar_tudo()
        if self.mensagem is not None:
            try:
                await self.mensagem.edit(embed=self.embed(texto, config.COR_AVISO), view=self)
            except discord.HTTPException:
                pass


class Mines(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    mines = app_commands.Group(name="mines", description="Um joguinho por diversão.", guild_only=True)

    @mines.command(name="jogar", description="Encontre as casas seguras sem pisar em uma mina!")
    @app_commands.describe(aposta="Quanto apostar (moeda virtual)", minas="Quantas minas (1 a 8)")
    @app_commands.checks.cooldown(1, 30.0, key=lambda i: (i.guild_id, i.user.id))
    async def jogar(
        self,
        interaction: discord.Interaction,
        aposta: app_commands.Range[int, 1, 1000000],
        minas: app_commands.Range[int, 1, 8] = 3,
    ) -> None:
        guild, jogador = interaction.guild, interaction.user
        assert guild is not None and isinstance(jogador, discord.Member)
        banco = self.bot.banco
        minimo = await banco.ajuste(guild.id, "mines_min_aposta")
        maximo = await banco.ajuste(guild.id, "mines_max_aposta")
        if not minimo <= aposta <= maximo:
            await responder(
                interaction, textos.MINES_LIMITES.format(min=formatar_moeda(minimo), max=formatar_moeda(maximo))
            )
            return
        resultado = await banco.iniciar_jogo(guild.id, jogador.id, JOGO, aposta)
        if resultado == "saldo":
            await responder(interaction, textos.MINES_SEM_SALDO)
            return
        if resultado == "em_andamento":
            await responder(interaction, textos.MINES_EM_ANDAMENTO)
            return
        view = MinasView(self, guild.id, jogador, aposta, minas)
        try:
            await interaction.response.send_message(embed=view.embed(), view=view)
            view.mensagem = await interaction.original_response()
        except discord.HTTPException:
            view.finalizado = True
            await banco.finalizar_jogo(guild.id, jogador.id, JOGO, aposta, "mines_reembolso")
            raise


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Mines(bot))
