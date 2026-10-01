"""Painel de cargos (cores, gênero, DM, faixa etária) com menus persistentes e exclusividade por grupo."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands

import config
import textos
from utils.helpers import (
    com_banner,
    embed,
    formatar_moeda,
    nivel_da_cor,
    nivel_por_xp,
    pode_gerenciar_cargo,
    publicar_ou_editar,
    responder,
    sem_acento,
)
from utils.permissoes import eh_membro
from utils.views import BaseView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.cargos")


class SelectGrupo(discord.ui.Select):
    """Menu de um grupo. As opções reais são gravadas na mensagem ao publicar."""

    def __init__(self, grupo: str, opcoes: Optional[list[discord.SelectOption]] = None) -> None:
        super().__init__(
            custom_id=f"kiza:cargos:{grupo}",
            placeholder=config.GRUPOS_CARGOS[grupo]["placeholder"],
            min_values=1,
            max_values=1,
            options=opcoes or [discord.SelectOption(label="—", value="0")],
        )
        self.grupo = grupo

    async def callback(self, interaction: discord.Interaction) -> None:
        cog = interaction.client.get_cog("Cargos")
        if cog is None:
            return
        await cog.aplicar_escolha(interaction, self.grupo, self.values[0])  # type: ignore[attr-defined]


class PainelCargosView(BaseView):
    """Um menu por mensagem: cada grupo tem seu próprio embed com banner."""

    def __init__(self, grupo: str, opcoes: Optional[list[discord.SelectOption]] = None) -> None:
        super().__init__(timeout=None)
        self.add_item(SelectGrupo(grupo, opcoes))  # sem opções = registro no setup_hook (só custom_id importa)


class BotaoAvisosBump(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(
            custom_id="kiza:cargos:bump", label=textos.BUMP_PAINEL_BOTAO, emoji="🔔", style=discord.ButtonStyle.primary
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        cog = interaction.client.get_cog("Bump")
        if cog is None:
            await responder(interaction, textos.FUNCAO_DESLIGADA)
            return
        await cog.alternar_avisos(interaction)  # type: ignore[attr-defined]


class PainelBumpView(BaseView):
    def __init__(self) -> None:
        super().__init__(timeout=None)
        self.add_item(BotaoAvisosBump())


def emoji_do_cargo(nome: str) -> Optional[str]:
    return config.EMOJIS_CARGOS.get(sem_acento(nome))


class Cargos(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    def views_persistentes(self) -> list[discord.ui.View]:
        return [*(PainelCargosView(grupo) for grupo in config.GRUPOS_CARGOS), PainelBumpView()]

    async def aplicar_escolha(self, interaction: discord.Interaction, grupo: str, valor: str) -> None:
        await interaction.response.defer(ephemeral=True)
        guild, membro = interaction.guild, interaction.user
        if guild is None or not isinstance(membro, discord.Member):
            return
        if not await eh_membro(self.bot, membro):
            await responder(interaction, textos.CARGOS_SO_MEMBROS)
            return

        ids_grupo = set((await self.bot.banco.grupos_cargos(guild.id)).get(grupo, []))
        escolha = int(valor)
        novo = guild.get_role(escolha) if escolha else None
        if escolha and (escolha not in ids_grupo or novo is None):
            await responder(interaction, textos.CARGOS_INVALIDO)
            return
        if novo is not None and not pode_gerenciar_cargo(guild, novo):
            await responder(interaction, textos.CARGOS_ERRO_PERM.format(cargo=novo.name))
            return
        if novo is not None and grupo == "cores":
            minimo = nivel_da_cor(novo.name)
            nivel = nivel_por_xp((await self.bot.banco.obter_perfil(guild.id, membro.id))["xp"])[0]
            if nivel < minimo:
                await responder(interaction, textos.CARGOS_COR_BLOQUEADA.format(cargo=novo.name, nivel=minimo, atual=nivel))
                return

        remover = [r for r in membro.roles if r.id in ids_grupo and r.id != escolha]
        try:
            if remover:
                await membro.remove_roles(*remover, reason="Kiza: painel de cargos")
            if novo is not None and novo not in membro.roles:
                await membro.add_roles(novo, reason="Kiza: painel de cargos")
        except discord.Forbidden:
            await responder(interaction, textos.CARGOS_ERRO_PERM.format(cargo=novo.name if novo else "?"))
            return
        if novo is None:
            await responder(interaction, textos.CARGOS_REMOVIDO)
        else:
            await responder(interaction, textos.CARGOS_ATUALIZADO.format(cargo=novo.name))

    async def publicar_painel(self, guild: discord.Guild) -> tuple[bool, str]:
        canal_id = await self.bot.banco.get_config_int(guild.id, "canal_painel_cargos")
        canal = guild.get_channel(canal_id) if canal_id else None
        if not isinstance(canal, discord.TextChannel):
            return False, textos.SETUP_SEM_CANAL

        grupos = await self.bot.banco.grupos_cargos(guild.id)
        publicados = 0
        for grupo, info in config.GRUPOS_CARGOS.items():  # ordem do config = ordem no canal
            cargos = [r for r in (guild.get_role(i) for i in grupos.get(grupo, [])) if r is not None]
            cargos.sort(key=lambda r: -r.position)
            cargos = cargos[:24]
            if not cargos:
                continue
            opcoes, linhas = [], []
            for r in cargos:
                emoji = emoji_do_cargo(r.name)
                minimo = nivel_da_cor(r.name) if grupo == "cores" else 0
                trava = textos.CARGOS_TRAVA.format(nivel=minimo) if minimo else None
                opcoes.append(discord.SelectOption(label=r.name[:100], value=str(r.id), emoji=emoji, description=trava))
                linhas.append(f"{emoji or '•'} {r.mention}" + (f" · {trava}" if trava else ""))
            opcoes.append(discord.SelectOption(label=textos.CARGOS_NENHUM, value="0", emoji="🚫"))

            e = embed(info["titulo"], "\n".join(linhas))
            if grupo == "idade":
                e.set_footer(text=textos.CARGOS_RODAPE)
            embeds, arquivos = com_banner(grupo, [e])
            try:
                await publicar_ou_editar(
                    self.bot, guild, canal, f"painel_cargos_{grupo}", embeds=embeds,
                    view=PainelCargosView(grupo, opcoes), arquivos=arquivos,
                )
            except discord.HTTPException:
                return False, textos.SETUP_ERRO_PUBLICAR
            publicados += 1
        if not publicados:
            return False, textos.SETUP_SEM_CARGOS
        await self._publicar_bump(guild, canal)

        # Painel antigo (todos os grupos numa mensagem só) sai do canal.
        antigo = await self.bot.banco.get_config_int(guild.id, "msg_painel_cargos")
        if antigo:
            try:
                await (await canal.fetch_message(antigo)).delete()
            except discord.HTTPException:
                pass
            await self.bot.banco.set_config(guild.id, "msg_painel_cargos", "")
        return True, canal.mention

    async def _publicar_bump(self, guild: discord.Guild, canal: discord.TextChannel) -> None:
        """Última mensagem do canal de cargos: convite para receber os avisos de bump (só se o cargo existir)."""
        if await self.bot.banco.get_config_int(guild.id, "cargo_bump") is None:
            return
        banco = self.bot.banco
        e = embed(
            textos.BUMP_PAINEL_TITULO,
            textos.BUMP_PAINEL_DESC.format(
                premio=formatar_moeda(await banco.ajuste(guild.id, "bump_premio")),
                mult=f"{(100 + await banco.ajuste(guild.id, 'bump_xp_pct')) / 100:g}".replace(".", ","),
            ),
        )
        embeds, arquivos = com_banner("bump", [e])
        try:
            await publicar_ou_editar(
                self.bot, guild, canal, "painel_cargos_bump", embeds=embeds, view=PainelBumpView(), arquivos=arquivos
            )
        except discord.HTTPException:
            log.warning("Falha ao publicar o convite de bump em %s", guild.id, exc_info=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Cargos(bot))
