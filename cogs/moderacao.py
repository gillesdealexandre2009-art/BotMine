"""Moderação: /warn /avisos /remover-aviso /caso /timeout /remover-timeout /kick /ban /unban /limpar.

Cada ação vira um "caso" numerado no banco e é registrada no canal de logs de moderação.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import embed, enviar_log, formatar_duracao, parse_duracao, responder, truncar
from utils.permissoes import exigir_nivel, nivel_do_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.moderacao")

TIPOS_CASO = {
    "warn": ("⚠️ Aviso", config.COR_AVISO),
    "timeout": ("⏳ Timeout", 0xE67E22),
    "untimeout": ("✅ Timeout removido", config.COR_OK),
    "kick": ("👢 Expulsão", 0xE74C3C),
    "ban": ("🔨 Banimento", 0xC0392B),
    "unban": ("♻️ Desbanimento", config.COR_OK),
    "limpar": ("🧹 Limpeza", config.COR_INFO),
    "automod": ("🤖 Automod", config.COR_AVISO),
}
MAX_TIMEOUT_S = 28 * 86400
MIN_TIMEOUT_S = 10


async def registrar_caso(
    bot: "Kiza",
    guild: discord.Guild,
    tipo: str,
    alvo_id: int,
    mod_id: int,
    motivo: str,
    duracao_s: Optional[int] = None,
) -> int:
    """Grava o caso no banco e o publica no canal de logs de moderação. Retorna o número do caso."""
    numero = await bot.banco.criar_caso(guild.id, tipo, alvo_id, mod_id, motivo, duracao_s)
    titulo, cor = TIPOS_CASO[tipo]
    e = embed(f"{titulo} • Caso #{numero}", None, cor)
    e.add_field(name="Alvo", value=f"<@{alvo_id}> (`{alvo_id}`)" if alvo_id else "—")
    e.add_field(name="Moderador", value=f"<@{mod_id}>")
    if duracao_s:
        e.add_field(name="Duração", value=formatar_duracao(duracao_s))
    e.add_field(name="Motivo", value=truncar(motivo, 1000), inline=False)
    e.timestamp = discord.utils.utcnow()
    await enviar_log(bot, guild, "logs_mod", embed=e)
    return numero


async def enviar_dm(
    usuario: discord.abc.User, guild: discord.Guild, tipo: str, motivo: str, duracao_s: Optional[int] = None
) -> bool:
    """DM para a pessoa punida. Retorna False se as DMs estiverem fechadas (nunca levanta erro)."""
    acao = textos.MOD_DM_ACAO.get(tipo)
    if acao is None:
        return False
    acao = acao.format(duracao=formatar_duracao(duracao_s) if duracao_s else "")
    e = embed(
        textos.MOD_DM_TITULO.format(servidor=guild.name),
        textos.MOD_DM_CORPO.format(acao=acao, motivo=truncar(motivo, 800)),
        TIPOS_CASO[tipo][1],
    )
    try:
        await usuario.send(embed=e)
        return True
    except (discord.Forbidden, discord.HTTPException):
        return False


class Moderacao(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    # ------------------------------------------------------------------ validações
    async def _checar_alvo(
        self, interaction: discord.Interaction, alvo: discord.Member, *, hierarquia_discord: bool
    ) -> Optional[str]:
        guild = interaction.guild
        assert guild is not None and isinstance(interaction.user, discord.Member)
        if alvo.id == interaction.user.id:
            return textos.MOD_SI_MESMO
        if alvo.id == self.bot.user.id:  # type: ignore[union-attr]
            return textos.MOD_BOT
        if alvo.id == guild.owner_id:
            return textos.MOD_DONO
        autor_e_dono = interaction.user.id == guild.owner_id
        if not autor_e_dono:
            if await nivel_do_membro(self.bot, alvo) >= await nivel_do_membro(self.bot, interaction.user):
                return textos.MOD_NIVEL
        if hierarquia_discord:
            if alvo.top_role >= guild.me.top_role:
                return textos.MOD_BOT_HIERARQUIA
            if not autor_e_dono and alvo.top_role >= interaction.user.top_role:
                return textos.MOD_HIERARQUIA
        return None

    # ------------------------------------------------------------------ avisos
    @app_commands.command(name="warn", description="Dá um aviso a um membro.")
    @app_commands.guild_only()
    @app_commands.describe(membro="Quem recebe o aviso", motivo="O que aconteceu")
    @exigir_nivel(config.NIVEL_HELPER)
    async def warn(
        self, interaction: discord.Interaction, membro: discord.Member, motivo: app_commands.Range[str, 3, 500]
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        erro = await self._checar_alvo(interaction, membro, hierarquia_discord=False)
        if erro:
            await responder(interaction, erro)
            return
        await interaction.response.defer(ephemeral=True)
        banco = self.bot.banco
        numero = await registrar_caso(self.bot, guild, "warn", membro.id, interaction.user.id, motivo)
        dm_ok = await enviar_dm(membro, guild, "warn", motivo)
        ativos = await banco.contar_avisos_ativos(guild.id, membro.id)

        extra = ""
        limite = await banco.ajuste(guild.id, "aviso_limite")
        if ativos % limite == 0:  # 3, 6, 9... com o padrão
            duracao = await banco.ajuste(guild.id, "aviso_timeout_min") * 60
            try:
                await membro.timeout(timedelta(seconds=duracao), reason=f"Kiza: {limite} avisos (caso #{numero})")
                await registrar_caso(
                    self.bot, guild, "timeout", membro.id, self.bot.user.id, f"Automático: {limite} avisos ativos", duracao  # type: ignore[union-attr]
                )
                await enviar_dm(membro, guild, "timeout", f"{limite} avisos ativos", duracao)
                extra = textos.MOD_AUTO_TIMEOUT.format(limite=limite, duracao=formatar_duracao(duracao))
            except discord.HTTPException:
                extra = textos.MOD_AUTO_TIMEOUT_FALHOU

        texto = textos.MOD_WARN_OK.format(numero=numero, alvo=membro.mention, ativos=ativos, extra=extra)
        if not dm_ok:
            texto += textos.MOD_DM_FALHOU
        await interaction.followup.send(texto, ephemeral=True)

    @app_commands.command(name="avisos", description="Mostra o histórico de casos de alguém.")
    @app_commands.guild_only()
    @app_commands.describe(usuario="De quem")
    @exigir_nivel(config.NIVEL_HELPER)
    async def avisos(self, interaction: discord.Interaction, usuario: discord.User) -> None:
        casos = await self.bot.banco.casos_do_alvo(interaction.guild_id, usuario.id)  # type: ignore[arg-type]
        if not casos:
            await responder(interaction, textos.MOD_AVISOS_VAZIO.format(alvo=usuario.mention))
            return
        linhas = []
        for c in casos:
            rotulo = TIPOS_CASO.get(c["tipo"], (c["tipo"], 0))[0]
            removido = " *(removido)*" if c["tipo"] == "warn" and not c["ativo"] else ""
            linhas.append(f"**#{c['numero']}** {rotulo}{removido} • <t:{c['criado_em']}:d> — {truncar(c['motivo'], 80)}")
        ativos = await self.bot.banco.contar_avisos_ativos(interaction.guild_id, usuario.id)  # type: ignore[arg-type]
        e = embed(f"📋 Histórico de {usuario.display_name}", "\n".join(linhas))
        e.set_footer(text=f"Avisos ativos: {ativos} • mostrando os {len(casos)} casos mais recentes")
        await interaction.response.send_message(embed=e, ephemeral=True)

    @app_commands.command(name="remover-aviso", description="Remove um aviso (ele deixa de contar para o timeout automático).")
    @app_commands.guild_only()
    @app_commands.describe(numero="Número do caso do aviso")
    @exigir_nivel(config.NIVEL_STAFF)
    async def remover_aviso(self, interaction: discord.Interaction, numero: app_commands.Range[int, 1, 1000000]) -> None:
        if await self.bot.banco.desativar_aviso(interaction.guild_id, numero):  # type: ignore[arg-type]
            await responder(interaction, textos.MOD_AVISO_REMOVIDO.format(numero=numero))
        else:
            await responder(interaction, textos.MOD_AVISO_NAO_REMOVIVEL.format(numero=numero))

    @app_commands.command(name="caso", description="Mostra os detalhes de um caso.")
    @app_commands.guild_only()
    @app_commands.describe(numero="Número do caso")
    @exigir_nivel(config.NIVEL_HELPER)
    async def caso(self, interaction: discord.Interaction, numero: app_commands.Range[int, 1, 1000000]) -> None:
        c = await self.bot.banco.obter_caso(interaction.guild_id, numero)  # type: ignore[arg-type]
        if c is None:
            await responder(interaction, textos.MOD_CASO_NAO_ENCONTRADO.format(numero=numero))
            return
        titulo, cor = TIPOS_CASO.get(c["tipo"], (c["tipo"], config.COR_INFO))
        e = embed(f"{titulo} • Caso #{c['numero']}", None, cor)
        e.add_field(name="Alvo", value=f"<@{c['alvo_id']}> (`{c['alvo_id']}`)" if c["alvo_id"] else "—")
        e.add_field(name="Moderador", value=f"<@{c['mod_id']}>")
        e.add_field(name="Quando", value=f"<t:{c['criado_em']}:f>")
        if c["duracao_s"]:
            e.add_field(name="Duração", value=formatar_duracao(c["duracao_s"]))
        e.add_field(name="Motivo", value=truncar(c["motivo"], 1000), inline=False)
        await interaction.response.send_message(embed=e, ephemeral=True)

    # ------------------------------------------------------------------ timeout
    @app_commands.command(name="timeout", description="Coloca alguém em timeout.")
    @app_commands.guild_only()
    @app_commands.describe(membro="Quem", duracao="Ex.: 10m, 2h, 1d, 1h30m", motivo="Por quê")
    @exigir_nivel(config.NIVEL_STAFF)
    async def timeout(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        duracao: str,
        motivo: app_commands.Range[str, 3, 500],
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        segundos = parse_duracao(duracao)
        if segundos is None or not MIN_TIMEOUT_S <= segundos <= MAX_TIMEOUT_S:
            await responder(interaction, textos.MOD_TIMEOUT_INVALIDO)
            return
        erro = await self._checar_alvo(interaction, membro, hierarquia_discord=True)
        if erro:
            await responder(interaction, erro)
            return
        await interaction.response.defer(ephemeral=True)
        try:
            await membro.timeout(timedelta(seconds=segundos), reason=f"{interaction.user}: {motivo}")
        except discord.HTTPException:
            await interaction.followup.send(textos.MOD_ACAO_FALHOU, ephemeral=True)
            return
        numero = await registrar_caso(self.bot, guild, "timeout", membro.id, interaction.user.id, motivo, segundos)
        dm_ok = await enviar_dm(membro, guild, "timeout", motivo, segundos)
        texto = textos.MOD_TIMEOUT_OK.format(alvo=membro.mention, duracao=formatar_duracao(segundos), numero=numero)
        await interaction.followup.send(texto + ("" if dm_ok else textos.MOD_DM_FALHOU), ephemeral=True)

    @app_commands.command(name="remover-timeout", description="Tira alguém do timeout.")
    @app_commands.guild_only()
    @app_commands.describe(membro="Quem", motivo="Por quê")
    @exigir_nivel(config.NIVEL_STAFF)
    async def remover_timeout(
        self, interaction: discord.Interaction, membro: discord.Member, motivo: str = "Timeout removido pela staff"
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        try:
            await membro.timeout(None, reason=f"{interaction.user}: {motivo}")
        except discord.HTTPException:
            await interaction.followup.send(textos.MOD_ACAO_FALHOU, ephemeral=True)
            return
        numero = await registrar_caso(self.bot, guild, "untimeout", membro.id, interaction.user.id, motivo)
        await interaction.followup.send(textos.MOD_UNTIMEOUT_OK.format(alvo=membro.mention, numero=numero), ephemeral=True)

    # ------------------------------------------------------------------ kick / ban / unban
    @app_commands.command(name="kick", description="Expulsa alguém do servidor.")
    @app_commands.guild_only()
    @app_commands.describe(membro="Quem", motivo="Por quê")
    @exigir_nivel(config.NIVEL_STAFF)
    async def kick(
        self, interaction: discord.Interaction, membro: discord.Member, motivo: app_commands.Range[str, 3, 500]
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        erro = await self._checar_alvo(interaction, membro, hierarquia_discord=True)
        if erro:
            await responder(interaction, erro)
            return
        if not guild.me.guild_permissions.kick_members:
            await responder(interaction, textos.MOD_SEM_PERM_DISCORD.format(perm="Expulsar Membros"))
            return
        await interaction.response.defer(ephemeral=True)
        dm_ok = await enviar_dm(membro, guild, "kick", motivo)  # antes: depois de expulso não há DM
        try:
            await membro.kick(reason=f"{interaction.user}: {motivo}")
        except discord.HTTPException:
            await interaction.followup.send(textos.MOD_ACAO_FALHOU, ephemeral=True)
            return
        numero = await registrar_caso(self.bot, guild, "kick", membro.id, interaction.user.id, motivo)
        texto = textos.MOD_KICK_OK.format(alvo=f"**{membro}**", numero=numero)
        await interaction.followup.send(texto + ("" if dm_ok else textos.MOD_DM_FALHOU), ephemeral=True)

    @app_commands.command(name="ban", description="Bane alguém do servidor.")
    @app_commands.guild_only()
    @app_commands.describe(usuario="Quem (pode estar fora do servidor)", motivo="Por quê", apagar_mensagens_dias="Dias de mensagens a apagar (0-7)")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def ban(
        self,
        interaction: discord.Interaction,
        usuario: discord.User,
        motivo: app_commands.Range[str, 3, 500],
        apagar_mensagens_dias: app_commands.Range[int, 0, 7] = 0,
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        membro = guild.get_member(usuario.id)
        if membro is not None:
            erro = await self._checar_alvo(interaction, membro, hierarquia_discord=True)
            if erro:
                await responder(interaction, erro)
                return
        elif usuario.id in (interaction.user.id, self.bot.user.id, guild.owner_id):  # type: ignore[union-attr]
            await responder(interaction, textos.MOD_SI_MESMO if usuario.id == interaction.user.id else textos.MOD_DONO)
            return
        if not guild.me.guild_permissions.ban_members:
            await responder(interaction, textos.MOD_SEM_PERM_DISCORD.format(perm="Banir Membros"))
            return
        await interaction.response.defer(ephemeral=True)
        dm_ok = await enviar_dm(usuario, guild, "ban", motivo) if membro is not None else False
        try:
            await guild.ban(
                usuario, reason=f"{interaction.user}: {motivo}", delete_message_seconds=apagar_mensagens_dias * 86400
            )
        except discord.HTTPException:
            await interaction.followup.send(textos.MOD_ACAO_FALHOU, ephemeral=True)
            return
        numero = await registrar_caso(self.bot, guild, "ban", usuario.id, interaction.user.id, motivo)
        texto = textos.MOD_BAN_OK.format(alvo=str(usuario), numero=numero)
        await interaction.followup.send(texto + ("" if dm_ok or membro is None else textos.MOD_DM_FALHOU), ephemeral=True)

    @app_commands.command(name="unban", description="Desbane alguém pelo ID.")
    @app_commands.guild_only()
    @app_commands.describe(usuario_id="ID do usuário banido", motivo="Por quê")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def unban(
        self, interaction: discord.Interaction, usuario_id: str, motivo: str = "Desbanimento pela staff"
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        if not usuario_id.strip().isdigit():
            await responder(interaction, textos.MOD_ID_INVALIDO)
            return
        uid = int(usuario_id)
        await interaction.response.defer(ephemeral=True)
        try:
            await guild.unban(discord.Object(id=uid), reason=f"{interaction.user}: {motivo}")
        except discord.NotFound:
            await interaction.followup.send(textos.MOD_UNBAN_NAO_BANIDO, ephemeral=True)
            return
        except discord.HTTPException:
            await interaction.followup.send(textos.MOD_ACAO_FALHOU, ephemeral=True)
            return
        try:
            nome = str(await self.bot.fetch_user(uid))
        except discord.HTTPException:
            nome = str(uid)
        numero = await registrar_caso(self.bot, guild, "unban", uid, interaction.user.id, motivo)
        await interaction.followup.send(textos.MOD_UNBAN_OK.format(alvo=nome, numero=numero), ephemeral=True)

    # ------------------------------------------------------------------ limpar
    @app_commands.command(name="limpar", description="Apaga mensagens recentes do canal.")
    @app_commands.guild_only()
    @app_commands.describe(quantidade="Quantas mensagens verificar (1-100)", membro="Só as mensagens dessa pessoa")
    @exigir_nivel(config.NIVEL_STAFF)
    async def limpar(
        self,
        interaction: discord.Interaction,
        quantidade: app_commands.Range[int, 1, 100],
        membro: Optional[discord.Member] = None,
    ) -> None:
        guild, canal = interaction.guild, interaction.channel
        assert guild is not None
        if not isinstance(canal, (discord.TextChannel, discord.Thread)):
            await responder(interaction, textos.MOD_ACAO_FALHOU)
            return
        if not canal.permissions_for(guild.me).manage_messages:
            await responder(interaction, textos.MOD_SEM_PERM_DISCORD.format(perm="Gerenciar Mensagens"))
            return
        await interaction.response.defer(ephemeral=True)
        try:
            opcoes: dict = {"limit": quantidade, "reason": f"Kiza: /limpar por {interaction.user}"}
            if membro is not None:
                opcoes["check"] = lambda m: m.author.id == membro.id  # sem `check=None`: o discord.py não aceita
            apagadas = await canal.purge(**opcoes)
        except discord.HTTPException:
            await interaction.followup.send(textos.MOD_ACAO_FALHOU, ephemeral=True)
            return
        await registrar_caso(
            self.bot,
            guild,
            "limpar",
            membro.id if membro else 0,
            interaction.user.id,
            f"{len(apagadas)} mensagem(ns) em #{canal.name}",
        )
        await interaction.followup.send(textos.MOD_LIMPAR_OK.format(n=len(apagadas)), ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Moderacao(bot))
