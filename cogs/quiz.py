"""Quiz de Minecraft e forca: jogos rápidos que dão Caudas, com limite diário por pessoa.

O prêmio usa `recompensar_uma_vez` (chave única por pessoa/dia/jogo), então um clique repetido ou um reinício nunca paga duas vezes.
"""
from __future__ import annotations

import logging
import random
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

import config
from utils import quizdata
from utils.helpers import embed, formatar_moeda, hoje_e_ontem, responder
from utils.permissoes import checar_membro
from utils.views import DonoView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.quiz")
_rng = random.SystemRandom()


async def pagar(cog: "Quiz", guild_id: int, user_id: int, jogo: str, premio_ajuste: str, max_ajuste: str, ref: str):
    """Paga o prêmio se a pessoa ainda não bateu o limite do dia. Retorna (premio_pago, bateu_limite)."""
    banco = cog.bot.banco
    hoje, _ = hoje_e_ontem()
    prefixo = f"{jogo}:{hoje}:{user_id}:"
    if await banco.contar_recompensas(guild_id, prefixo) >= await banco.ajuste(guild_id, max_ajuste):
        return 0, True
    premio = await banco.ajuste(guild_id, premio_ajuste)
    saldo = await banco.recompensar_uma_vez(guild_id, prefixo + ref, user_id, premio, jogo)
    return (premio if saldo is not None else 0), False


class BotaoOpcao(discord.ui.Button):
    def __init__(self, indice: int, texto: str) -> None:
        super().__init__(label=texto[:80], style=discord.ButtonStyle.secondary, row=indice // 2)
        self.indice = indice

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.view.responder(interaction, self.indice)  # type: ignore[union-attr]


class QuizView(DonoView):
    def __init__(self, cog: "Quiz", dono_id: int, pergunta: str, opcoes: list[str], certa: int) -> None:
        super().__init__(dono_id, timeout=30)
        self.cog, self.pergunta, self.certa, self.opcoes = cog, pergunta, certa, opcoes
        self.respondido = False
        self.mensagem: discord.Message | None = None
        for i, o in enumerate(opcoes):
            self.add_item(BotaoOpcao(i, o))

    def _embed(self, extra: str = "", cor: int = config.COR_INFO) -> discord.Embed:
        return embed("🧠 Quiz da Kiza", f"**{self.pergunta}**\n{extra}", cor)

    async def responder(self, interaction: discord.Interaction, escolha: int) -> None:
        if self.respondido:  # a trava vem antes de qualquer await
            await responder(interaction, "Você já respondeu essa 😅")
            return
        self.respondido = True
        self.stop()
        for item in self.children:
            item.disabled = True  # type: ignore[union-attr]
            if isinstance(item, BotaoOpcao):
                if item.indice == self.certa:
                    item.style = discord.ButtonStyle.success
                elif item.indice == escolha:
                    item.style = discord.ButtonStyle.danger
        if escolha == self.certa:
            premio, limite = await pagar(
                self.cog, interaction.guild_id, interaction.user.id, "quiz", "quiz_premio", "quiz_max_dia",  # type: ignore[arg-type]
                str(interaction.message.id if interaction.message else 0),
            )
            if premio:
                extra = f"\n✅ **Acertou!** +{formatar_moeda(premio)}"
            elif limite:
                extra = "\n✅ **Acertou!** Mas você já ganhou o máximo de Caudas no quiz hoje. Volta amanhã! 🦊"
            else:
                extra = "\n✅ **Acertou!**"
            await interaction.response.edit_message(embed=self._embed(extra, config.COR_OK), view=self)
        else:
            extra = f"\n❌ Era **{self.opcoes[self.certa]}**. Tenta outra!"
            await interaction.response.edit_message(embed=self._embed(extra, config.COR_ERRO), view=self)

    async def on_timeout(self) -> None:
        if self.respondido or self.mensagem is None:
            return
        for item in self.children:
            item.disabled = True  # type: ignore[union-attr]
        try:
            await self.mensagem.edit(embed=self._embed("\n⏰ Acabou o tempo!", config.COR_AVISO), view=self)
        except discord.HTTPException:
            pass


class ChutarModal(discord.ui.Modal, title="Chutar na forca"):
    chute = discord.ui.TextInput(label="Uma letra ou a palavra inteira", min_length=1, max_length=20)

    def __init__(self, view: "ForcaView") -> None:
        super().__init__()
        self.forca = view

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await self.forca.chutar(interaction, quizdata.normalizar(str(self.chute.value)))


class ForcaView(DonoView):
    def __init__(self, cog: "Quiz", dono_id: int, palavra: str) -> None:
        super().__init__(dono_id, timeout=180)
        self.cog, self.palavra = cog, palavra
        self.certas: set[str] = set()
        self.erradas: list[str] = []
        self.finalizado = False
        self.mensagem: discord.Message | None = None

    def _embed(self, extra: str = "", cor: int = config.COR_INFO) -> discord.Embed:
        boneco = quizdata.FORCA_BONECO[len(self.erradas)]
        erros = ", ".join(self.erradas) or "nenhum"
        corpo = (
            f"{boneco}\n`{quizdata.mascarar(self.palavra, self.certas)}`\n"
            f"Erros ({len(self.erradas)}/{quizdata.MAX_ERROS}): {erros}{extra}"
        )
        return embed("🪢 Forca de Minecraft", corpo, cor)

    @discord.ui.button(label="Chutar", emoji="✏️", style=discord.ButtonStyle.primary)
    async def botao(self, interaction: discord.Interaction, _b: discord.ui.Button) -> None:
        if self.finalizado:
            await responder(interaction, "Esse jogo já acabou 🦊")
            return
        await interaction.response.send_modal(ChutarModal(self))

    async def chutar(self, interaction: discord.Interaction, chute: str) -> None:
        if self.finalizado:
            await responder(interaction, "Esse jogo já acabou 🦊")
            return
        if not chute.isalpha():
            await responder(interaction, "Só letras, tá? 😅")
            return
        if len(chute) == 1:
            if chute in self.certas or chute in self.erradas:
                await responder(interaction, f"Você já chutou **{chute}**.")
                return
            (self.certas.add(chute) if chute in self.palavra else self.erradas.append(chute))
        elif chute == self.palavra:
            self.certas.update(self.palavra)
        else:
            self.erradas.append(chute[:8])  # palavra errada conta como um erro
        ganhou = quizdata.venceu(self.palavra, self.certas)
        perdeu = len(self.erradas) >= quizdata.MAX_ERROS
        if not (ganhou or perdeu):
            await interaction.response.edit_message(embed=self._embed(), view=self)
            return
        self.finalizado = True  # a trava vem antes de qualquer await
        self.stop()
        self.botao.disabled = True
        if ganhou:
            premio, limite = await pagar(
                self.cog, interaction.guild_id, interaction.user.id, "forca", "forca_premio", "forca_max_dia",  # type: ignore[arg-type]
                str(interaction.message.id if interaction.message else 0),
            )
            extra = f"\n🎉 **Acertou!** Era **{self.palavra}**."
            if premio:
                extra += f" +{formatar_moeda(premio)}"
            elif limite:
                extra += " (Você já ganhou o máximo de Caudas na forca hoje.)"
            await interaction.response.edit_message(embed=self._embed(extra, config.COR_OK), view=self)
        else:
            await interaction.response.edit_message(
                embed=self._embed(f"\n💀 Perdeu! Era **{self.palavra}**.", config.COR_ERRO), view=self
            )

    async def on_timeout(self) -> None:
        if self.finalizado or self.mensagem is None:
            return
        self.botao.disabled = True
        try:
            await self.mensagem.edit(embed=self._embed(f"\n⏰ Acabou o tempo! Era **{self.palavra}**.", config.COR_AVISO), view=self)
        except discord.HTTPException:
            pass


class Quiz(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    @app_commands.command(name="quiz", description="Uma pergunta de Minecraft: acertou, ganhou Caudas!")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 20.0)
    async def quiz(self, interaction: discord.Interaction) -> None:
        pergunta, opcoes, certa = _rng.choice(quizdata.PERGUNTAS)
        ordem = list(range(len(opcoes)))
        _rng.shuffle(ordem)
        embaralhadas = [opcoes[i] for i in ordem]
        view = QuizView(self, interaction.user.id, pergunta, embaralhadas, ordem.index(certa))
        await interaction.response.send_message(embed=view._embed(), view=view)
        view.mensagem = await interaction.original_response()

    @app_commands.command(name="forca", description="Jogo da forca com palavras de Minecraft.")
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 30.0)
    async def forca(self, interaction: discord.Interaction) -> None:
        view = ForcaView(self, interaction.user.id, _rng.choice(quizdata.PALAVRAS_FORCA))
        await interaction.response.send_message(embed=view._embed(), view=view)
        view.mensagem = await interaction.original_response()


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Quiz(bot))
