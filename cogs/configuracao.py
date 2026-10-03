"""/setup (assistente), /configuracao (diagnóstico) e /ajustes (valores numéricos)."""
from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import (
    embed,
    faltas_no_canal,
    permissoes_perigosas,
    pode_gerenciar_cargo,
    responder,
    sem_acento,
    truncar,
)
from utils.permissoes import exigir_nivel
from utils.views import DonoView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.configuracao")

SECOES = {
    "canais": ("📺 Canais", "Onde cada função da Kiza funciona"),
    "cargos_base": ("🎭 Cargos base", "Visitante, Membro, Kitsune, Porteiro e Helper"),
    "niveis": ("🛡️ Níveis de permissão", "Mapeie cargos a Membro/Helper/Staff/Admin"),
    "painel": ("🎨 Painel de cargos", "Cores, gênero, DM e faixa etária"),
    "xp": ("⭐ Cargos de nível de XP", "Cargos dados ao atingir certos níveis"),
    "publicar": ("📤 Publicar painéis", "Regras, verificação, cargos e tickets"),
    "visibilidade": ("🔒 Visibilidade", "Quem enxerga cada categoria/canal"),
    "publicacoes": ("📸 Publicações (fidelidade)", "Canais onde posts contam para virar Helper"),
}

# o que publicar: chave -> (nome do cog, método, rótulo)
PUBLICADORES = {
    "regras": ("Entrada", "publicar_regras", "Regras"),
    "verificacao": ("Entrada", "publicar_verificacao", "Verificação"),
    "cargos": ("Cargos", "publicar_painel", "Painel de cargos"),
    "tickets": ("Tickets", "publicar_painel", "Painel de tickets"),
    "aviso_status": ("Entrada", "publicar_aviso_status", "Aviso fixo"),
    "infos": ("Vitrine", "publicar_infos", "Infos"),
    "kitsune": ("Vitrine", "publicar_kitsune", "Seja um Kitsune"),
    "lore": ("Vitrine", "publicar_lore", "Lore"),
    "changelog": ("Vitrine", "publicar_changelog", "Changelog"),
    "comandos": ("Vitrine", "publicar_comandos", "Comandos"),
    "duvidas": ("Vitrine", "publicar_duvidas", "Dúvidas (FAQ)"),
}


# ============================================================================ componentes do /setup
class BotaoVoltar(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Voltar", emoji="⬅️", style=discord.ButtonStyle.secondary, row=4)

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.view.cog.mostrar_hub(interaction)  # type: ignore[union-attr]


class SelecaoChave(discord.ui.Select):
    """Menu 'o que você quer configurar dentro desta seção'. Guarda a escolha em view.chave."""

    def __init__(self, opcoes: list[tuple[str, str]], placeholder: str) -> None:
        super().__init__(
            placeholder=placeholder,
            min_values=1,
            max_values=1,
            options=[discord.SelectOption(label=rotulo[:100], value=valor) for valor, rotulo in opcoes],
            row=0,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        valor = self.values[0]
        for opcao in self.options:
            opcao.default = opcao.value == valor
        self.view.chave = valor  # type: ignore[union-attr]
        await self.view.atualizar(interaction)  # type: ignore[union-attr]


class SecaoBase(DonoView):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(dono_id)
        self.cog = cog
        self.guild = guild
        self.chave: Optional[str] = None

    async def construir_embed(self) -> discord.Embed:  # pragma: no cover - sobrescrito
        raise NotImplementedError

    async def atualizar(self, interaction: discord.Interaction) -> None:
        await interaction.response.edit_message(embed=await self.construir_embed(), view=self)

    async def exigir_chave(self, interaction: discord.Interaction) -> bool:
        if self.chave is None:
            await responder(interaction, textos.SETUP_ESCOLHA_PRIMEIRO)
            return False
        return True


# ---------------------------------------------------------------- canais
class SelecaoCanal(discord.ui.ChannelSelect):
    def __init__(self) -> None:
        super().__init__(
            placeholder="Escolha o canal…",
            channel_types=[discord.ChannelType.text, discord.ChannelType.news, discord.ChannelType.forum],
            min_values=1,
            max_values=1,
            row=1,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoCanais = self.view  # type: ignore[assignment]
        if not await v.exigir_chave(interaction):
            return
        ref = self.values[0]
        await v.cog.bot.banco.set_config(v.guild.id, f"canal_{v.chave}", str(ref.id))
        await v.atualizar(interaction)
        canal = v.guild.get_channel(ref.id)
        if canal is not None:
            faltas = faltas_no_canal(canal, v.guild)
            if faltas:
                await interaction.followup.send(textos.SETUP_AVISO_CANAL.format(faltas=", ".join(faltas)), ephemeral=True)


class BotaoLimpar(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Limpar seleção", emoji="🗑️", style=discord.ButtonStyle.danger, row=2)

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoBase = self.view  # type: ignore[assignment]
        if not await v.exigir_chave(interaction):
            return
        await v.limpar()  # type: ignore[attr-defined]
        await v.atualizar(interaction)


class SecaoCanais(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        self.add_item(SelecaoChave(list(config.CANAIS_CONFIG.items()), "1) Qual função?"))
        self.add_item(SelecaoCanal())
        self.add_item(BotaoLimpar())
        self.add_item(BotaoVoltar())

    async def limpar(self) -> None:
        await self.cog.bot.banco.set_config(self.guild.id, f"canal_{self.chave}", None)

    async def construir_embed(self) -> discord.Embed:
        cfg = await self.cog.bot.banco.cfg(self.guild.id)
        linhas = []
        for chave, rotulo in config.CANAIS_CONFIG.items():
            valor = cfg.get(f"canal_{chave}")
            marca = "👉 " if chave == self.chave else ""
            alvo = f"<#{valor}>" if valor else "*não configurado*"
            linhas.append(f"{marca}{'✅' if valor else '❌'} **{rotulo}** — {alvo}")
        e = embed("📺 Canais", "\n".join(linhas))
        e.set_footer(text="1) escolha a função  2) escolha o canal")
        return e


# ---------------------------------------------------------------- cargos base
class SelecaoCargosMulti(discord.ui.RoleSelect):
    def __init__(self, maximo: int = 25) -> None:
        super().__init__(placeholder="Escolha os cargos (vazio = limpa)…", min_values=0, max_values=maximo, row=1)

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoBase = self.view  # type: ignore[assignment]
        if not await v.exigir_chave(interaction):
            return
        ids = [int(r) for r in interaction.data.get("values", [])]  # type: ignore[union-attr]
        ids = [i for i in ids if i != v.guild.id]
        await v.salvar(interaction, ids)  # type: ignore[attr-defined]


class BotaoCriarPorteiro(discord.ui.Button):
    """Cria o cargo Porteiro (mencionável) se ainda não existir, e já o usa nas boas-vindas."""

    def __init__(self) -> None:
        super().__init__(label=textos.SETUP_PORTEIRO_BOTAO, emoji="🚪", style=discord.ButtonStyle.success, row=2)

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoCargosBase = self.view  # type: ignore[assignment]
        banco, guild = v.cog.bot.banco, v.guild
        # trava por servidor: dois cliques rápidos não criam dois cargos
        async with v.cog.trava_porteiro.setdefault(guild.id, asyncio.Lock()):
            atual_id = await banco.get_config_int(guild.id, "cargo_porteiro")
            atual = guild.get_role(atual_id) if atual_id else None
            if atual is not None:
                await responder(interaction, textos.SETUP_PORTEIRO_EXISTE.format(cargo=atual.mention))
                return
            cargo = next((r for r in guild.roles if "porteiro" in sem_acento(r.name)), None)
            texto = textos.SETUP_PORTEIRO_REUSADO
            if cargo is None:
                try:
                    cargo = await guild.create_role(
                        name=config.PORTEIRO_NOME,
                        colour=discord.Colour(config.COR_PRINCIPAL),
                        mentionable=True,
                        reason=f"Kiza: /setup por {interaction.user}",
                    )
                except discord.HTTPException:
                    await responder(interaction, textos.SETUP_PORTEIRO_ERRO)
                    return
                texto = textos.SETUP_PORTEIRO_CRIADO
            elif not cargo.mentionable:
                # cargo reaproveitado precisa ser mencionável, senão a marcação nas boas-vindas não avisa ninguém
                mencionavel = pode_gerenciar_cargo(guild, cargo)
                if mencionavel:
                    try:
                        await cargo.edit(mentionable=True, reason=f"Kiza: /setup por {interaction.user}")
                    except discord.HTTPException:
                        mencionavel = False
                if not mencionavel:
                    texto += "\n" + textos.SETUP_PORTEIRO_NAO_MENCIONAVEL
            await banco.set_config(guild.id, "cargo_porteiro", str(cargo.id))
        await v.atualizar(interaction)
        await interaction.followup.send(texto.format(cargo=cargo.mention), ephemeral=True)


class SecaoCargosBase(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        self.add_item(SelecaoChave(list(config.CARGOS_BASE.items()), "1) Qual cargo?"))
        self.add_item(SelecaoCargosMulti(maximo=1))
        self.add_item(BotaoLimpar())
        self.add_item(BotaoCriarPorteiro())
        self.add_item(BotaoVoltar())

    async def salvar(self, interaction: discord.Interaction, ids: list[int]) -> None:
        await self.cog.bot.banco.set_config(self.guild.id, f"cargo_{self.chave}", str(ids[0]) if ids else None)
        await self.atualizar(interaction)
        role = self.guild.get_role(ids[0]) if ids else None
        dados_pela_kiza = ("visitante", "membro", "helper")
        if role is not None and self.chave in dados_pela_kiza and not pode_gerenciar_cargo(self.guild, role):
            await interaction.followup.send(textos.SETUP_AVISO_CARGO.format(cargos=role.mention), ephemeral=True)

    async def limpar(self) -> None:
        await self.cog.bot.banco.set_config(self.guild.id, f"cargo_{self.chave}", None)

    async def construir_embed(self) -> discord.Embed:
        cfg = await self.cog.bot.banco.cfg(self.guild.id)
        linhas = []
        for chave, rotulo in config.CARGOS_BASE.items():
            valor = cfg.get(f"cargo_{chave}")
            marca = "👉 " if chave == self.chave else ""
            alvo = f"<@&{valor}>" if valor else "*não configurado*"
            linhas.append(f"{marca}{'✅' if valor else '❌'} **{rotulo}** — {alvo}")
        e = embed("🎭 Cargos base", "\n".join(linhas))
        e.set_footer(
            text="Kitsune e Porteiro são dados pela staff à mão (o Porteiro é marcado nas boas-vindas). "
            "Helper a staff dá pelo tíquete Solicitar rank."
        )
        return e


# ---------------------------------------------------------------- níveis de permissão
class SecaoNiveis(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        opcoes = [(str(n), f"Nível {n} — {config.NOMES_NIVEL[n]}") for n in range(4)]
        self.add_item(SelecaoChave(opcoes, "1) Qual nível?"))
        self.add_item(SelecaoCargosMulti())
        self.add_item(BotaoVoltar())

    async def salvar(self, interaction: discord.Interaction, ids: list[int]) -> None:
        await self.cog.bot.banco.definir_cargos_nivel(self.guild.id, int(self.chave), ids)  # type: ignore[arg-type]
        await self.atualizar(interaction)

    async def construir_embed(self) -> discord.Embed:
        por_nivel = await self.cog.bot.banco.cargos_por_nivel(self.guild.id)
        linhas = []
        for n in range(4):
            cargos = " ".join(f"<@&{i}>" for i in por_nivel[n]) or "*nenhum*"
            marca = "👉 " if self.chave == str(n) else ""
            linhas.append(f"{marca}**{n} — {config.NOMES_NIVEL[n]}**: {cargos}")
        e = embed("🛡️ Níveis de permissão", "\n".join(linhas))
        e.add_field(
            name="Como funciona",
            value=(
                "Cargos **Header** (Helper | Header, Staff | Header) entram no mesmo nível do cargo-base.\n"
                "Helper: /warn e histórico • Staff: timeout, kick, limpar, tickets, logs • Admin: ban, /setup, automod, economia.\n"
                "O dono do servidor e quem tem *Administrador* no Discord contam como Admin."
            ),
            inline=False,
        )
        return e


# ---------------------------------------------------------------- painel de cargos
class SecaoPainel(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        opcoes = [(g, dados["titulo"]) for g, dados in config.GRUPOS_CARGOS.items()]
        self.add_item(SelecaoChave(opcoes, "1) Qual grupo?"))
        self.add_item(SelecaoCargosMulti(maximo=24))
        self.add_item(BotaoVoltar())

    async def salvar(self, interaction: discord.Interaction, ids: list[int]) -> None:
        await self.cog.bot.banco.definir_grupo_cargos(self.guild.id, self.chave, ids)  # type: ignore[arg-type]
        await self.atualizar(interaction)
        ruins = [f"<@&{i}>" for i in ids if (r := self.guild.get_role(i)) and not pode_gerenciar_cargo(self.guild, r)]
        if ruins:
            await interaction.followup.send(textos.SETUP_AVISO_CARGO.format(cargos=", ".join(ruins)), ephemeral=True)

    async def construir_embed(self) -> discord.Embed:
        grupos = await self.cog.bot.banco.grupos_cargos(self.guild.id)
        linhas = []
        for g, dados in config.GRUPOS_CARGOS.items():
            cargos = " ".join(f"<@&{i}>" for i in grupos.get(g, [])) or "*nenhum*"
            marca = "👉 " if self.chave == g else ""
            linhas.append(f"{marca}**{dados['titulo']}**: {cargos}")
        e = embed("🎨 Painel de cargos", "\n".join(linhas))
        e.set_footer(text="Até 24 cargos por grupo. Os cargos de faixa etária são só identificação.")
        return e


# ---------------------------------------------------------------- cargos de nível de XP
class SecaoXP(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        opcoes = [(str(n), f"Nível {n}") for n in config.NIVEIS_XP_OPCOES]
        self.add_item(SelecaoChave(opcoes, "1) Qual nível de XP?"))
        self.add_item(SelecaoCargosMulti(maximo=1))
        self.add_item(BotaoVoltar())

    async def salvar(self, interaction: discord.Interaction, ids: list[int]) -> None:
        await self.cog.bot.banco.definir_cargo_xp(self.guild.id, int(self.chave), ids[0] if ids else None)  # type: ignore[arg-type]
        await self.atualizar(interaction)
        if ids:
            role = self.guild.get_role(ids[0])
            if role is not None and not pode_gerenciar_cargo(self.guild, role):
                await interaction.followup.send(textos.SETUP_AVISO_CARGO.format(cargos=role.mention), ephemeral=True)

    async def construir_embed(self) -> discord.Embed:
        atuais = dict(await self.cog.bot.banco.listar_cargos_xp(self.guild.id))
        linhas = []
        for n in config.NIVEIS_XP_OPCOES:
            marca = "👉 " if self.chave == str(n) else ""
            alvo = f"<@&{atuais[n]}>" if n in atuais else "*sem cargo*"
            linhas.append(f"{marca}**Nível {n}** — {alvo}")
        e = embed("⭐ Cargos de nível de XP", "\n".join(linhas))
        e.set_footer(text="Ao subir de nível a pessoa recebe o cargo mais alto que já alcançou (e perde os anteriores).")
        return e


# ---------------------------------------------------------------- visibilidade
async def aplicar_visibilidade(bot: "Kiza", guild: discord.Guild, alvo: discord.abc.GuildChannel, tier: str) -> tuple[bool, str]:
    """Aplica de verdade (view_channel/send_messages) via permission overwrites, sem apagar overwrites de outros alvos."""
    banco = bot.banco
    cfg = await banco.cfg(guild.id)
    por_nivel = await banco.cargos_por_nivel(guild.id)

    def cargos(*niveis: int) -> list[discord.Role]:
        ids: list[int] = []
        for n in niveis:
            ids.extend(por_nivel.get(n, []))
        return [r for r in (guild.get_role(i) for i in ids) if r is not None]

    if tier == "publico":
        everyone_over = discord.PermissionOverwrite(view_channel=True, send_messages=False)
        elegiveis = cargos(2, 3)
    elif tier == "membro":
        everyone_over = discord.PermissionOverwrite(view_channel=False)
        elegiveis = cargos(1, 2, 3)
        for chave in ("cargo_membro", "cargo_kitsune"):
            if cfg.get(chave, "").isdigit():
                role = guild.get_role(int(cfg[chave]))
                if role is not None:
                    elegiveis.append(role)
    elif tier == "helper":
        everyone_over = discord.PermissionOverwrite(view_channel=False)
        elegiveis = cargos(1, 2, 3)
    elif tier == "staff":
        everyone_over = discord.PermissionOverwrite(view_channel=False)
        elegiveis = cargos(2, 3)
    elif tier == "admin":
        everyone_over = discord.PermissionOverwrite(view_channel=False)
        elegiveis = cargos(3)
    else:
        return False, "tier desconhecido"

    try:
        await alvo.set_permissions(guild.default_role, overwrite=everyone_over, reason="Kiza: /setup visibilidade")
        await alvo.set_permissions(
            guild.me,
            overwrite=discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_messages=True),
            reason="Kiza: /setup visibilidade",
        )
        bloqueados = []
        for role in dict.fromkeys(elegiveis):  # sem duplicatas, mantendo ordem
            if not pode_gerenciar_cargo(guild, role):
                bloqueados.append(role.mention)
                continue
            await alvo.set_permissions(
                role,
                overwrite=discord.PermissionOverwrite(view_channel=True, send_messages=True),
                reason="Kiza: /setup visibilidade",
            )
    except discord.Forbidden:
        return False, textos.SETUP_APLICAR_ERRO_PERM.format(alvo=alvo.mention)
    if bloqueados:
        return False, textos.SETUP_APLICAR_ERRO_CARGO.format(alvo=alvo.mention, cargos=", ".join(bloqueados))
    return True, textos.SETUP_APLICAR_OK.format(alvo=alvo.mention, tier=config.TIERS_VISIBILIDADE[tier])


class SelecaoTier(discord.ui.Select):
    def __init__(self) -> None:
        super().__init__(
            placeholder="1) Qual visibilidade?",
            min_values=1,
            max_values=1,
            options=[discord.SelectOption(label=rotulo[:100], value=chave) for chave, rotulo in config.TIERS_VISIBILIDADE.items()],
            row=0,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoVisibilidade = self.view  # type: ignore[assignment]
        for opcao in self.options:
            opcao.default = opcao.value == self.values[0]
        v.tier = self.values[0]
        await v.atualizar(interaction)


class SelecaoAlvoVisibilidade(discord.ui.ChannelSelect):
    def __init__(self) -> None:
        super().__init__(
            placeholder="2) Qual categoria ou canal?",
            channel_types=[discord.ChannelType.category, discord.ChannelType.text],
            min_values=1,
            max_values=1,
            row=1,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoVisibilidade = self.view  # type: ignore[assignment]
        if v.tier is None:
            await responder(interaction, textos.SETUP_VISIBILIDADE_ESCOLHA_TIER)
            return
        ref = self.values[0]
        await v.cog.bot.banco.definir_visibilidade(v.guild.id, ref.id, v.tier)
        await v.atualizar(interaction)
        await interaction.followup.send(
            textos.SETUP_VISIBILIDADE_SALVO.format(alvo=f"<#{ref.id}>", tier=config.TIERS_VISIBILIDADE[v.tier]),
            ephemeral=True,
        )


class BotaoAplicarVisibilidade(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Aplicar permissões", emoji="🔒", style=discord.ButtonStyle.success, row=3)

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoVisibilidade = self.view  # type: ignore[assignment]
        mapa = await v.cog.bot.banco.visibilidades(v.guild.id)
        if not mapa:
            await responder(interaction, textos.SETUP_APLICAR_VAZIO)
            return
        await interaction.response.send_message(textos.SETUP_APLICANDO, ephemeral=True)
        linhas = []
        for canal_id, tier in mapa.items():
            alvo = v.guild.get_channel(canal_id)
            if alvo is None:
                linhas.append(textos.SETUP_APLICAR_SUMICO)
                continue
            _, texto = await aplicar_visibilidade(v.cog.bot, v.guild, alvo, tier)
            linhas.append(texto)
        await interaction.followup.send("\n".join(linhas), ephemeral=True)


class SecaoVisibilidade(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        self.tier: Optional[str] = None
        self.add_item(SelecaoTier())
        self.add_item(SelecaoAlvoVisibilidade())
        self.add_item(BotaoAplicarVisibilidade())
        self.add_item(BotaoVoltar())

    async def construir_embed(self) -> discord.Embed:
        mapa = await self.cog.bot.banco.visibilidades(self.guild.id)
        if not mapa:
            linhas = ["*nada configurado ainda*"]
        else:
            linhas = [f"<#{canal_id}> — {config.TIERS_VISIBILIDADE.get(tier, tier)}" for canal_id, tier in mapa.items()]
        e = embed("🔒 Visibilidade", "\n".join(linhas))
        e.set_footer(
            text="1) escolha a visibilidade  2) escolha a categoria/canal  3) Aplicar permissões manda pro Discord de verdade"
        )
        return e


# ---------------------------------------------------------------- canais de publicação (fidelidade)
class SelecaoCanaisPublicacao(discord.ui.ChannelSelect):
    def __init__(self) -> None:
        super().__init__(
            placeholder="Escolha os canais de publicação (vazio = nenhum)…",
            channel_types=[
                discord.ChannelType.text,
                discord.ChannelType.news,
                discord.ChannelType.forum,
                discord.ChannelType.media,
            ],
            min_values=0,
            max_values=25,
            row=0,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoPublicacoes = self.view  # type: ignore[assignment]
        valor = ",".join(str(c.id) for c in self.values) or None
        await v.cog.bot.banco.set_config(v.guild.id, "canais_publicacao", valor)
        await v.atualizar(interaction)


class SecaoPublicacoes(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        self.selecao = SelecaoCanaisPublicacao()
        self.add_item(self.selecao)
        self.add_item(BotaoVoltar())

    async def construir_embed(self) -> discord.Embed:
        valor = await self.cog.bot.banco.get_config(self.guild.id, "canais_publicacao")
        ids = [int(parte) for parte in (valor or "").split(",") if parte.isdigit()]
        # já vem marcado com o que está salvo: escolher um canal novo não apaga os outros
        self.selecao.default_values = [discord.Object(id=i) for i in ids if self.guild.get_channel(i) is not None]
        linhas = [f"📸 <#{i}>" for i in ids] or ["*nenhum canal ainda*"]
        e = embed("📸 Canais de publicação", "\n".join(linhas))
        e.set_footer(text=textos.SETUP_PUBLICACOES_RODAPE)
        return e


# ---------------------------------------------------------------- publicar
class SecaoPublicar(SecaoBase):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(cog, dono_id, guild)
        botoes = [
            ("regras", "Regras", "📜"),
            ("verificacao", "Verificação", "🔑"),
            ("cargos", "Painel de cargos", "🎭"),
            ("tickets", "Tickets", "🎫"),
        ]
        for chave, rotulo, emoji in botoes:
            self.add_item(BotaoPublicar([chave], rotulo, emoji, discord.ButtonStyle.primary, row=0))
        vitrine = [
            ("infos", "Infos", "📖"),
            ("kitsune", "Kitsune", "🦊"),
            ("lore", "Lore", "🌙"),
            ("changelog", "Changelog", "🎞️"),
            ("comandos", "Comandos", "🤖"),
            ("duvidas", "Dúvidas", "❓"),
        ]
        for i, (chave, rotulo, emoji) in enumerate(vitrine):
            self.add_item(BotaoPublicar([chave], rotulo, emoji, discord.ButtonStyle.secondary, row=1 + i // 5))
        self.add_item(BotaoPublicar(list(PUBLICADORES), "Publicar tudo", "🚀", discord.ButtonStyle.success, row=3))
        self.add_item(BotaoVoltar())

    async def construir_embed(self) -> discord.Embed:
        return embed(
            "📤 Publicar painéis",
            "Cada botão posta (ou **atualiza**, se já existir) a mensagem no canal configurado.\n\n"
            "📜 **Regras** → canal de regras\n🔑 **Verificação** → canal de verificação\n"
            "🎭 **Painel de cargos** → canal do painel de cargos\n🎫 **Tickets** → canal de tickets",
        )


class BotaoPublicar(discord.ui.Button):
    def __init__(self, quais: list[str], rotulo: str, emoji: str, estilo: discord.ButtonStyle, row: int) -> None:
        super().__init__(label=rotulo, emoji=emoji, style=estilo, row=row)
        self.quais = quais

    async def callback(self, interaction: discord.Interaction) -> None:
        v: SecaoPublicar = self.view  # type: ignore[assignment]
        await interaction.response.defer(ephemeral=True, thinking=True)
        resultados = await v.cog.publicar(v.guild, self.quais)
        await interaction.followup.send("\n".join(resultados), ephemeral=True)


# ---------------------------------------------------------------- hub
class SelecaoSecao(discord.ui.Select):
    def __init__(self) -> None:
        super().__init__(
            placeholder="O que você quer configurar?",
            min_values=1,
            max_values=1,
            options=[
                discord.SelectOption(label=titulo[:100], value=chave, description=desc[:100])
                for chave, (titulo, desc) in SECOES.items()
            ],
            row=0,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        v: HubView = self.view  # type: ignore[assignment]
        await v.cog.abrir_secao(interaction, self.values[0])


class HubView(DonoView):
    def __init__(self, cog: "Configuracao", dono_id: int, guild: discord.Guild) -> None:
        super().__init__(dono_id)
        self.cog = cog
        self.guild = guild
        self.add_item(SelecaoSecao())


SECAO_CLASSES = {
    "canais": SecaoCanais,
    "cargos_base": SecaoCargosBase,
    "niveis": SecaoNiveis,
    "painel": SecaoPainel,
    "xp": SecaoXP,
    "publicar": SecaoPublicar,
    "visibilidade": SecaoVisibilidade,
    "publicacoes": SecaoPublicacoes,
}


# ============================================================================ cog
class Configuracao(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self.trava_porteiro: dict[int, asyncio.Lock] = {}

    # ------------------------------------------------------------ navegação do /setup
    async def embed_hub(self, guild: discord.Guild) -> discord.Embed:
        banco = self.bot.banco
        cfg = await banco.cfg(guild.id)
        canais = sum(1 for k in config.CANAIS_CONFIG if cfg.get(f"canal_{k}"))
        base = sum(1 for k in config.CARGOS_BASE if cfg.get(f"cargo_{k}"))
        niveis = sum(len(v) for v in (await banco.cargos_por_nivel(guild.id)).values())
        grupos = sum(1 for v in (await banco.grupos_cargos(guild.id)).values() if v)
        xp = len(await banco.listar_cargos_xp(guild.id))
        vis = len(await banco.visibilidades(guild.id))
        publicacoes = len([p for p in cfg.get("canais_publicacao", "").split(",") if p.isdigit()])
        e = embed(textos.SETUP_HUB_TITULO, textos.SETUP_HUB_DESC)
        e.add_field(
            name="Situação",
            value=(
                f"📺 Canais: **{canais}/{len(config.CANAIS_CONFIG)}**\n"
                f"🎭 Cargos base: **{base}/{len(config.CARGOS_BASE)}**\n"
                f"🛡️ Cargos com nível de permissão: **{niveis}**\n"
                f"🎨 Grupos do painel de cargos: **{grupos}/{len(config.GRUPOS_CARGOS)}**\n"
                f"⭐ Cargos de nível de XP: **{xp}/{len(config.NIVEIS_XP_OPCOES)}**\n"
                f"🔒 Categorias/canais com visibilidade definida: **{vis}**\n"
                f"📸 Canais de publicação (fidelidade): **{publicacoes}**"
            ),
            inline=False,
        )
        e.set_footer(text="Dica: /configuracao mostra o que falta e as permissões que preciso.")
        return e

    async def mostrar_hub(self, interaction: discord.Interaction) -> None:
        view = HubView(self, interaction.user.id, interaction.guild)  # type: ignore[arg-type]
        await interaction.response.edit_message(embed=await self.embed_hub(interaction.guild), view=view)  # type: ignore[arg-type]

    async def abrir_secao(self, interaction: discord.Interaction, secao: str) -> None:
        view = SECAO_CLASSES[secao](self, interaction.user.id, interaction.guild)  # type: ignore[arg-type]
        await interaction.response.edit_message(embed=await view.construir_embed(), view=view)

    async def publicar(self, guild: discord.Guild, quais: list[str]) -> list[str]:
        resultados = []
        for chave in quais:
            nome_cog, metodo, rotulo = PUBLICADORES[chave]
            cog = self.bot.get_cog(nome_cog)
            if cog is None:
                resultados.append(textos.SETUP_PUBLICAR_FALTA.format(o_que=rotulo, motivo=textos.SETUP_MODULO_OFF))
                continue
            try:
                ok, info = await getattr(cog, metodo)(guild)
            except discord.HTTPException:
                log.exception("Falha ao publicar %s", chave)
                ok, info = False, textos.SETUP_ERRO_PUBLICAR
            if ok:
                resultados.append(textos.SETUP_PUBLICADO.format(o_que=rotulo, canal=info))
            else:
                resultados.append(textos.SETUP_PUBLICAR_FALTA.format(o_que=rotulo, motivo=info))
        return resultados

    # ------------------------------------------------------------ /setup
    @app_commands.command(name="setup", description="Assistente de configuração da Kiza (só admins).")
    @app_commands.guild_only()
    @exigir_nivel(3)
    async def setup(self, interaction: discord.Interaction) -> None:
        view = HubView(self, interaction.user.id, interaction.guild)  # type: ignore[arg-type]
        await interaction.response.send_message(
            embed=await self.embed_hub(interaction.guild), view=view, ephemeral=True  # type: ignore[arg-type]
        )

    # ------------------------------------------------------------ /configuracao
    @app_commands.command(name="configuracao", description="Mostra o que está configurado, o que falta e minhas permissões.")
    @app_commands.guild_only()
    @exigir_nivel(3)
    async def configuracao(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        cfg = await banco.cfg(guild.id)
        por_nivel = await banco.cargos_por_nivel(guild.id)
        grupos = await banco.grupos_cargos(guild.id)
        cargos_xp = await banco.listar_cargos_xp(guild.id)

        def tem(chave: str) -> bool:
            return bool(cfg.get(chave))

        funcoes = [
            ("Boas-vindas e adeus", tem("canal_boas_vindas") or tem("canal_adeus"), "canal de boas-vindas/adeus"),
            ("Autorole (Visitante)", tem("cargo_visitante"), "cargo Visitante"),
            ("Regras", tem("canal_regras"), "canal de regras"),
            ("Verificação", tem("canal_verificacao") and tem("cargo_membro"), "canal de verificação + cargo Membro"),
            (
                "Painel de cargos",
                tem("canal_painel_cargos") and any(grupos.values()),
                "canal do painel + cargos nos grupos",
            ),
            ("Tickets", tem("canal_tickets") and bool(por_nivel[2] or por_nivel[3]), "canal de tickets + cargos Staff/Admin"),
            ("Logs de moderação", tem("canal_logs_mod"), "canal de logs de moderação"),
            ("Logs gerais", tem("canal_logs_gerais"), "canal de logs gerais"),
            ("Sugestões", tem("canal_sugestoes"), "canal de sugestões"),
            ("XP, economia e jogos", tem("cargo_membro"), "cargo Membro"),
            ("Visibilidade de categorias/canais", bool(await banco.visibilidades(guild.id)), "seção Visibilidade do /setup"),
            ("Porteiro nas boas-vindas", tem("cargo_porteiro"), "cargo Porteiro (botão em Cargos base)"),
            ("Pedido de rank (Helper)", tem("cargo_helper"), "cargo Helper em Cargos base"),
            ("Publicações na fidelidade", tem("canais_publicacao"), "seção Publicações do /setup"),
        ]
        linhas = [f"{'✅' if ok else '❌'} **{nome}**" + ("" if ok else f" — falta: {falta}") for nome, ok, falta in funcoes]
        e = embed("🩺 Configuração da Kiza", None)
        e.add_field(name="Funções", value=truncar("\n".join(linhas), 1000), inline=False)

        # permissões do bot no servidor
        perms = guild.me.guild_permissions
        faltam = [nome for attr, nome in config.PERMISSOES_NECESSARIAS if not getattr(perms, attr)]
        e.add_field(
            name="Minhas permissões no servidor",
            value="✅ Todas as necessárias." if not faltam else "❌ Faltam: " + ", ".join(faltam),
            inline=False,
        )

        # permissões nos canais configurados
        problemas = []
        for chave in config.CANAIS_CONFIG:
            valor = cfg.get(f"canal_{chave}")
            if not valor:
                continue
            canal = guild.get_channel(int(valor))
            if canal is None:
                problemas.append(f"❌ {config.CANAIS_CONFIG[chave]}: o canal configurado não existe mais")
                continue
            extras = ("attach_files",) if chave in ("logs_mod", "tickets") else ()
            faltas = faltas_no_canal(canal, guild, extras)
            if faltas:
                problemas.append(f"⚠️ {canal.mention}: falta {', '.join(faltas)}")
        if problemas:
            e.add_field(name="Canais com problema", value=truncar("\n".join(problemas), 1000), inline=False)

        # hierarquia de cargos
        ids_para_gerenciar = set(grupos_id for lista in grupos.values() for grupos_id in lista)
        ids_para_gerenciar.update(role_id for _, role_id in cargos_xp)
        for chave in ("cargo_visitante", "cargo_membro", "cargo_helper"):
            if tem(chave):
                ids_para_gerenciar.add(int(cfg[chave]))
        altos = []
        for role_id in ids_para_gerenciar:
            role = guild.get_role(role_id)
            if role is None:
                altos.append(f"❌ cargo `{role_id}` não existe mais")
            elif not pode_gerenciar_cargo(guild, role):
                altos.append(f"⚠️ {role.mention}: suba o meu cargo (**{guild.me.top_role.name}**) acima dele")
        if altos:
            e.add_field(name="Hierarquia de cargos", value=truncar("\n".join(altos), 1000), inline=False)

        # níveis
        if not (por_nivel[2] or por_nivel[3]):
            e.add_field(
                name="Níveis de permissão",
                value="⚠️ Nenhum cargo Staff/Admin mapeado. Por enquanto só o dono e quem tem *Administrador* mandam em mim.",
                inline=False,
            )

        # cargo Helper (dado pelo botão do tíquete Solicitar rank)
        helper = guild.get_role(int(cfg["cargo_helper"])) if tem("cargo_helper") else None
        if helper is not None:
            avisos = []
            if not any(helper.id in por_nivel[n] for n in range(config.NIVEL_HELPER, 4)):
                avisos.append(textos.SETUP_HELPER_SEM_NIVEL.format(cargo=helper.mention))
            perigosas = permissoes_perigosas(helper.permissions)
            if perigosas:
                avisos.append(textos.SETUP_HELPER_PERIGOSO.format(cargo=helper.mention, permissoes=", ".join(perigosas)))
            if avisos:
                e.add_field(name="Cargo Helper", value="\n".join(avisos), inline=False)

        e.add_field(
            name="Módulos carregados",
            value=", ".join(sorted(c.lower() for c in self.bot.cogs)) or "nenhum",
            inline=False,
        )
        e.add_field(
            name="Lembrete",
            value="As intents **Server Members** e **Message Content** precisam estar ativas no Developer Portal.",
            inline=False,
        )
        await interaction.followup.send(embed=e, ephemeral=True)

    # ------------------------------------------------------------ /ajustes
    ajustes = app_commands.Group(name="ajustes", description="Valores numéricos da Kiza neste servidor.", guild_only=True)

    async def _autocompletar_chave(self, interaction: discord.Interaction, atual: str) -> list[app_commands.Choice[str]]:
        atual = atual.lower()
        return [
            app_commands.Choice(name=f"{chave} — {dados[3]}"[:100], value=chave)
            for chave, dados in config.AJUSTES.items()
            if atual in chave or atual in dados[3].lower()
        ][:25]

    @ajustes.command(name="ver", description="Lista todos os ajustes e seus valores.")
    @exigir_nivel(3)
    async def ajustes_ver(self, interaction: discord.Interaction) -> None:
        valores = await self.bot.banco.todos_ajustes(interaction.guild_id)  # type: ignore[arg-type]
        linhas = []
        for chave, (padrao, minimo, maximo, desc) in config.AJUSTES.items():
            valor = valores[chave]
            extra = "" if valor == padrao else f" *(padrão {padrao})*"
            linhas.append(f"`{chave}` = **{valor}**{extra} — {desc}")
        await interaction.response.send_message(
            embed=embed("⚙️ Ajustes", truncar("\n".join(linhas), 4000)), ephemeral=True
        )

    @ajustes.command(name="definir", description="Muda um ajuste numérico.")
    @app_commands.describe(chave="Qual ajuste", valor="Novo valor")
    @exigir_nivel(3)
    async def ajustes_definir(self, interaction: discord.Interaction, chave: str, valor: int) -> None:
        dados = config.AJUSTES.get(chave)
        if dados is None:
            await responder(interaction, textos.AJUSTE_INVALIDO)
            return
        _, minimo, maximo, _ = dados
        if not minimo <= valor <= maximo:
            await responder(interaction, textos.AJUSTE_FORA_FAIXA.format(chave=chave, min=minimo, max=maximo))
            return
        await self.bot.banco.definir_ajuste(interaction.guild_id, chave, valor)  # type: ignore[arg-type]
        await responder(interaction, textos.AJUSTE_SALVO.format(chave=chave, valor=valor))

    ajustes_definir.autocomplete("chave")(_autocompletar_chave)

    @ajustes.command(name="resetar", description="Volta um ajuste ao valor padrão.")
    @app_commands.describe(chave="Qual ajuste")
    @exigir_nivel(3)
    async def ajustes_resetar(self, interaction: discord.Interaction, chave: str) -> None:
        dados = config.AJUSTES.get(chave)
        if dados is None:
            await responder(interaction, textos.AJUSTE_INVALIDO)
            return
        await self.bot.banco.definir_ajuste(interaction.guild_id, chave, None)  # type: ignore[arg-type]
        await responder(interaction, textos.AJUSTE_REDEFINIDO.format(chave=chave, valor=dados[0]))

    ajustes_resetar.autocomplete("chave")(_autocompletar_chave)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Configuracao(bot))
