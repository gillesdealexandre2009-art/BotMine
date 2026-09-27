"""União de toca (o "casamento" da Kiza): título de dupla, só de brincadeira.

Correções em relação ao bot do SONHE:
* o pedido cobra UMA vez (o valor fica em custódia) e cada pessoa tem no máximo um pedido aberto;
* recusar, cancelar, expirar ou ficar indisponível DEVOLVE o valor;
* pedidos expiram sozinhos (loop a cada 5 minutos).
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from database import agora
from utils.helpers import embed, formatar_moeda, responder
from utils.permissoes import checar_membro, eh_membro
from utils.views import BaseView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.casamento")
SEM_MENCOES = discord.AllowedMentions.none()


class PedidoView(BaseView):
    """Botões do pedido: só a pessoa convidada pode usar."""

    def __init__(self, cog: "Casamento", proponente_id: int, alvo_id: int, timeout: float) -> None:
        super().__init__(timeout=timeout)
        self.cog = cog
        self.proponente_id = proponente_id
        self.alvo_id = alvo_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.alvo_id:
            await responder(interaction, textos.UNIAO_NAO_E_PARA_VOCE)
            return False
        return True

    @discord.ui.button(label=textos.UNIAO_ACEITAR, emoji="🤝", style=discord.ButtonStyle.success)
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        self.stop()
        await self.cog.processar_aceite(interaction, self.proponente_id, self.alvo_id, editar=True)

    @discord.ui.button(label=textos.UNIAO_RECUSAR, style=discord.ButtonStyle.secondary)
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        self.stop()
        await self.cog.processar_recusa(interaction, self.proponente_id, self.alvo_id, editar=True)


class Casamento(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        self.expirar_pedidos.start()

    async def cog_unload(self) -> None:
        self.expirar_pedidos.cancel()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # ------------------------------------------------------------------ respostas (slash ou botão)
    @staticmethod
    async def _resultado(interaction: discord.Interaction, texto: str, editar: bool) -> None:
        if editar:
            await interaction.response.edit_message(content=texto, embed=None, view=None, allowed_mentions=SEM_MENCOES)
        else:
            await interaction.response.send_message(texto, allowed_mentions=SEM_MENCOES)

    async def processar_aceite(
        self, interaction: discord.Interaction, proponente_id: int, alvo_id: int, *, editar: bool
    ) -> None:
        assert interaction.guild_id is not None
        resultado = await self.bot.banco.aceitar_uniao(interaction.guild_id, alvo_id, proponente_id)
        textos_resultado = {
            "ok": textos.UNIAO_FORMADA.format(a=f"<@{proponente_id}>", b=f"<@{alvo_id}>"),
            "sem_pedido": textos.UNIAO_SEM_PEDIDO,
            "expirado": textos.UNIAO_EXPIRADO,
            "indisponivel": textos.UNIAO_INDISPONIVEL,
        }
        await self._resultado(interaction, textos_resultado[resultado], editar)

    async def processar_recusa(
        self, interaction: discord.Interaction, proponente_id: int, alvo_id: int, *, editar: bool
    ) -> None:
        assert interaction.guild_id is not None
        devolvido = await self.bot.banco.recusar_uniao(interaction.guild_id, alvo_id, proponente_id)
        if devolvido is None:
            texto = textos.UNIAO_SEM_PEDIDO
        else:
            texto = textos.UNIAO_RECUSADA.format(alvo=f"<@{alvo_id}>", moeda=config.MOEDA_NOME)
        await self._resultado(interaction, texto, editar)

    # ------------------------------------------------------------------ comandos
    casamento = app_commands.Group(name="casamento", description="Forme uma dupla de toca.", guild_only=True)

    @casamento.command(name="pedir", description="Peça a alguém para formar uma dupla de toca.")
    @app_commands.describe(membro="Quem você quer convidar")
    async def pedir(self, interaction: discord.Interaction, membro: discord.Member) -> None:
        guild, autor = interaction.guild, interaction.user
        assert guild is not None
        if membro.bot or membro.id == autor.id:
            await responder(interaction, textos.UNIAO_INVALIDO)
            return
        if not await eh_membro(self.bot, membro):
            await responder(interaction, textos.PAGAR_DESTINO_NAO_MEMBRO)
            return
        banco = self.bot.banco
        custo = await banco.ajuste(guild.id, "casamento_custo")
        horas = await banco.ajuste(guild.id, "casamento_expira_h")
        expira = agora() + horas * 3600
        resultado = await banco.criar_pedido_uniao(guild.id, autor.id, membro.id, custo, expira)
        erros = {
            "ja_casado": textos.UNIAO_JA_CASADO,
            "alvo_casado": textos.UNIAO_ALVO_CASADO,
            "pedido_existente": textos.UNIAO_PEDIDO_EXISTE,
            "saldo": textos.UNIAO_SEM_SALDO.format(custo=formatar_moeda(custo)),
        }
        if resultado in erros:
            await responder(interaction, erros[resultado])
            return
        e = embed(
            textos.UNIAO_PEDIDO_TITULO,
            textos.UNIAO_PEDIDO_DESC.format(
                proponente=autor.mention, alvo=membro.mention, custo=formatar_moeda(custo), expira=expira
            ),
        )
        view = PedidoView(self, autor.id, membro.id, timeout=horas * 3600)
        try:
            await interaction.response.send_message(
                content=membro.mention, embed=e, view=view, allowed_mentions=discord.AllowedMentions(users=[membro])
            )
        except discord.HTTPException:
            await banco.cancelar_pedido_uniao(guild.id, autor.id)  # não deixa o valor preso
            raise

    @casamento.command(name="aceitar", description="Aceite o pedido de quem te convidou.")
    @app_commands.describe(proponente="Quem te convidou")
    async def aceitar(self, interaction: discord.Interaction, proponente: discord.Member) -> None:
        await self.processar_aceite(interaction, proponente.id, interaction.user.id, editar=False)

    @casamento.command(name="recusar", description="Recuse o pedido de quem te convidou.")
    @app_commands.describe(proponente="Quem te convidou")
    async def recusar(self, interaction: discord.Interaction, proponente: discord.Member) -> None:
        await self.processar_recusa(interaction, proponente.id, interaction.user.id, editar=False)

    @casamento.command(name="cancelar", description="Cancele o seu pedido em andamento (o valor volta pra você).")
    async def cancelar(self, interaction: discord.Interaction) -> None:
        assert interaction.guild_id is not None
        devolvido = await self.bot.banco.cancelar_pedido_uniao(interaction.guild_id, interaction.user.id)
        if devolvido is None:
            await responder(interaction, textos.UNIAO_SEM_PEDIDO)
        else:
            await responder(interaction, textos.UNIAO_CANCELADA.format(valor=formatar_moeda(devolvido)))

    @casamento.command(name="divorciar", description="Desfaça a sua dupla de toca.")
    async def divorciar(self, interaction: discord.Interaction) -> None:
        assert interaction.guild_id is not None
        parceiro = await self.bot.banco.desfazer_uniao(interaction.guild_id, interaction.user.id)
        if parceiro is None:
            await responder(interaction, textos.UNIAO_SEM_UNIAO)
        else:
            await interaction.response.send_message(
                textos.UNIAO_DIVORCIADO.format(parceiro=f"<@{parceiro}>"), allowed_mentions=SEM_MENCOES
            )

    @casamento.command(name="status", description="Veja com quem alguém formou dupla de toca.")
    @app_commands.describe(membro="De quem (padrão: você)")
    async def status(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None) -> None:
        alvo = membro or interaction.user
        assert interaction.guild_id is not None
        perfil = await self.bot.banco.obter_perfil(interaction.guild_id, alvo.id)
        if perfil["casado_com"]:
            texto = textos.UNIAO_STATUS.format(
                nome=alvo.display_name, parceiro=f"<@{perfil['casado_com']}>", desde=perfil["casado_desde"]
            )
        else:
            texto = textos.UNIAO_STATUS_SOLTO.format(nome=alvo.display_name)
        await interaction.response.send_message(texto, allowed_mentions=SEM_MENCOES)

    # ------------------------------------------------------------------ expiração
    @tasks.loop(minutes=5)
    async def expirar_pedidos(self) -> None:
        try:
            for pedido in await self.bot.banco.expirar_pedidos_uniao():
                guild = self.bot.get_guild(pedido["guild_id"])
                try:
                    usuario = self.bot.get_user(pedido["proponente_id"]) or await self.bot.fetch_user(
                        pedido["proponente_id"]
                    )
                    await usuario.send(
                        textos.UNIAO_EXPIRADA_DM.format(
                            servidor=guild.name if guild else "o servidor", valor=formatar_moeda(pedido["valor"])
                        )
                    )
                except (discord.Forbidden, discord.HTTPException):
                    pass  # DM fechada: o valor já foi devolvido de qualquer jeito
        except Exception:
            log.exception("Erro ao expirar pedidos de união")

    @expirar_pedidos.before_loop
    async def _antes_de_expirar(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Casamento(bot))
