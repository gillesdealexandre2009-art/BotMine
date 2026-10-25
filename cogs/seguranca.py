"""Segurança: modo raid suave automático, anti-nuke (alerta), regras nativas do AutoMod e auditoria de permissões.

Pensado para ser invisível a quem é membro de verdade: nada de verificação nova, ações duras só diante de sinais claros.
O modo raid MANUAL (/raid ligar, expulsa) continua em cogs/automod.py e é o mais duro: quando ele está ligado, o suave não age.
Tudo configurável em /setup > Segurança e /ajustes (seguranca_*).
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import timedelta
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils import seguranca as seg
from utils.helpers import embed, enviar_log, pode_gerenciar_cargo, responder, truncar
from utils.permissoes import exigir_nivel, nivel_do_membro
from utils.views import BaseView, DonoView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.seguranca")
MAX_CONTAS_GUARDADAS = 200


# ============================================================================ views
class RaidView(BaseView):
    """Botões do alerta de raid. Persistentes: leem o estado do banco, então valem mesmo depois de um reinício."""

    def __init__(self) -> None:
        super().__init__(timeout=None)

    async def _staff(self, interaction: discord.Interaction) -> bool:
        if not isinstance(interaction.user, discord.Member) or await nivel_do_membro(
            interaction.client, interaction.user  # type: ignore[arg-type]
        ) < config.NIVEL_STAFF:
            await responder(interaction, textos.SEG_RAID_SO_STAFF)
            return False
        return True

    @discord.ui.button(label=textos.SEG_RAID_BOTAO_DESLIGAR, emoji="✅", style=discord.ButtonStyle.success, custom_id="kiza:seg:desligar")
    async def desligar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await self._staff(interaction):
            return
        cog: Seguranca = interaction.client.get_cog("Seguranca")  # type: ignore[assignment]
        desligou = await cog.desligar_suave(interaction.guild, quem=interaction.user.mention)  # type: ignore[arg-type]
        await responder(interaction, textos.SEG_RAID_OFF_OK if desligou else textos.SEG_RAID_NAO_ESTAVA)

    @discord.ui.button(label=textos.SEG_RAID_BOTAO_EXPULSAR, emoji="👢", style=discord.ButtonStyle.danger, custom_id="kiza:seg:expulsar")
    async def expulsar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await self._staff(interaction):
            return
        guild = interaction.guild
        assert guild is not None
        cog: Seguranca = interaction.client.get_cog("Seguranca")  # type: ignore[assignment]
        alvos = [m for i in await cog.contas_do_raid(guild) if (m := guild.get_member(i)) is not None]
        if not alvos:
            await responder(interaction, textos.SEG_RAID_EXPULSAR_NADA)
            return

        async def executar(inter: discord.Interaction) -> None:
            n = await cog.expulsar_contas(guild, inter.user)
            await inter.response.edit_message(content=textos.SEG_RAID_EXPULSAR_FEITO.format(n=n), view=None)

        view = ConfirmaView(interaction.user.id, executar, textos.SEG_RAID_EXPULSAR_BOTAO)
        await responder(interaction, textos.SEG_RAID_EXPULSAR_CONFIRMA.format(n=len(alvos)), view=view)


class ConfirmaView(DonoView):
    """Confirmação efêmera de uma ação perigosa (só quem pediu clica)."""

    def __init__(self, dono_id: int, acao, rotulo: str) -> None:
        super().__init__(dono_id, timeout=60)
        self.acao = acao
        botao = discord.ui.Button(label=rotulo, style=discord.ButtonStyle.danger)
        botao.callback = self._confirmar  # type: ignore[method-assign]
        self.add_item(botao)

    async def _confirmar(self, interaction: discord.Interaction) -> None:
        self.stop()
        await self.acao(interaction)


class AuditoriaView(DonoView):
    """Botão 'Aplicar correções seguras': só o dono do servidor, com confirmação, e fica registrado no log."""

    def __init__(self, cog: "Seguranca", dono_id: int) -> None:
        super().__init__(dono_id)
        self.cog = cog

    @discord.ui.button(label=textos.SEG_AUDITORIA_BOTAO, emoji="🛠️", style=discord.ButtonStyle.danger)
    async def corrigir(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        guild = interaction.guild
        assert guild is not None
        if interaction.user.id != guild.owner_id:
            await responder(interaction, textos.SEG_AUDITORIA_SO_DONO)
            return

        async def executar(inter: discord.Interaction) -> None:
            linhas = await seg.aplicar_correcoes_seguras(guild, f"Kiza: correções seguras por {inter.user}")
            resultado = "\n".join(linhas)
            await inter.response.edit_message(content=resultado, view=None)
            e = embed("🛠️ Correções de segurança", textos.SEG_CORRECAO_LOG.format(quem=inter.user.mention, resultado=resultado), config.COR_INFO)
            e.timestamp = discord.utils.utcnow()
            await enviar_log(self.cog.bot, guild, "logs_mod", embed=e)

        await responder(interaction, textos.SEG_CORRECAO_CONFIRMA, view=ConfirmaView(interaction.user.id, executar, "Confirmar"))


# ============================================================================ cog
class Seguranca(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self.detector = seg.DetectorRaid()
        self.nuke = seg.ContadorNuke()

    def views_persistentes(self) -> list[discord.ui.View]:
        return [RaidView()]

    async def cog_load(self) -> None:
        self.vigiar_raid.start()

    async def cog_unload(self) -> None:
        self.vigiar_raid.cancel()

    # ------------------------------------------------------------------ estado do modo raid suave
    async def suave_ate(self, guild_id: int) -> int:
        bruto = await self.bot.banco.get_config(guild_id, "raid_suave_ate")
        return int(bruto) if bruto and bruto.isdigit() else 0

    async def suave_ativo(self, guild_id: int) -> bool:
        return await self.suave_ate(guild_id) > time.time()

    async def raid_manual(self, guild_id: int) -> bool:
        return await self.bot.banco.get_config(guild_id, "raid_ativo") == "1"

    async def contas_do_raid(self, guild: discord.Guild) -> list[int]:
        return seg.ids_da_lista(await self.bot.banco.get_config(guild.id, "raid_suave_contas"))

    async def _guardar_contas(self, guild_id: int, novas: list[int], substituir: bool = False) -> None:
        atual = [] if substituir else seg.ids_da_lista(await self.bot.banco.get_config(guild_id, "raid_suave_contas"))
        todas = list(dict.fromkeys(atual + novas))[-MAX_CONTAS_GUARDADAS:]
        await self.bot.banco.set_config(guild_id, "raid_suave_contas", ",".join(map(str, todas)) or None)

    async def ligar_suave(self, guild: discord.Guild) -> int:
        minutos = await self.bot.banco.ajuste(guild.id, "seguranca_raid_duracao_min")
        await self.bot.banco.set_config(guild.id, "raid_suave_ate", str(int(time.time()) + minutos * 60))
        return minutos

    async def desligar_suave(self, guild: discord.Guild, quem: Optional[str] = None) -> bool:
        """Desliga o modo suave (e avisa). False se já estava desligado."""
        if not await self.suave_ate(guild.id):
            return False
        await self.bot.banco.set_config(guild.id, "raid_suave_ate", None)
        texto = textos.SEG_RAID_DESLIGADO_POR.format(quem=quem) if quem else textos.SEG_RAID_DESLIGADO_AUTO
        e = embed(textos.SEG_RAID_DESLIGADO_TITULO, texto, config.COR_OK)
        e.timestamp = discord.utils.utcnow()
        await enviar_log(self.bot, guild, "logs_mod", embed=e)
        return True

    @tasks.loop(seconds=30)
    async def vigiar_raid(self) -> None:
        """Desliga sozinho o modo raid suave quando o tempo acaba."""
        for guild in list(self.bot.guilds):
            try:
                ate = await self.suave_ate(guild.id)
                if ate and ate <= time.time():
                    await self.desligar_suave(guild)
            except Exception:  # nunca derruba o loop
                log.exception("Falha ao vigiar o modo raid suave em %s", guild.id)

    @vigiar_raid.before_loop
    async def _antes(self) -> None:
        await self.bot.wait_until_ready()

    # ------------------------------------------------------------------ entrada de membros
    async def _isento(self, membro: discord.Member) -> bool:
        return await nivel_do_membro(self.bot, membro) >= config.NIVEL_STAFF

    @commands.Cog.listener()
    async def on_member_join(self, membro: discord.Member) -> None:
        try:
            await self._entrada(membro)
        except Exception:  # segurança nunca derruba o bot
            log.exception("Falha no detector de raid (membro %s)", membro.id)

    async def _entrada(self, membro: discord.Member) -> None:
        guild, banco = membro.guild, self.bot.banco
        if membro.bot or await self.raid_manual(guild.id):  # o modo manual é o mais duro e quem manda
            return
        agora = discord.utils.utcnow().timestamp()
        idade = seg.idade_conta_s(membro.created_at.timestamp(), agora)

        if await self.suave_ativo(guild.id):
            dias = await banco.ajuste(guild.id, "seguranca_raid_conta_dias")
            if idade < dias * 86400 and not await self._isento(membro):
                await self._timeout_raid(membro)
                await self._guardar_contas(guild.id, [membro.id])
            return

        if await banco.ajuste(guild.id, "seguranca_raid_auto") != 1:
            return
        disparo = self.detector.registrar(
            guild.id,
            membro.id,
            idade,
            n=await banco.ajuste(guild.id, "seguranca_raid_n"),
            janela=await banco.ajuste(guild.id, "seguranca_raid_janela"),
            m=await banco.ajuste(guild.id, "seguranca_raid_novas_m"),
            muito_nova_s=await banco.ajuste(guild.id, "seguranca_raid_muito_nova_h") * 3600,
        )
        if disparo is not None:
            await self._disparar(guild, disparo, agora)

    async def _timeout_raid(self, membro: discord.Member) -> bool:
        minutos = await self.bot.banco.ajuste(membro.guild.id, "seguranca_raid_timeout_min")
        try:
            await membro.timeout(timedelta(minutes=minutos), reason=textos.SEG_RAID_TIMEOUT_MOTIVO)
            return True
        except discord.HTTPException:
            log.warning("Não consegui dar timeout a %s no modo raid suave", membro.id, exc_info=True)
            return False

    async def _disparar(self, guild: discord.Guild, disparo: seg.DisparoRaid, agora: float) -> None:
        banco = self.bot.banco
        minutos = await self.ligar_suave(guild)
        dias = await banco.ajuste(guild.id, "seguranca_raid_conta_dias")
        timeout_min = await banco.ajuste(guild.id, "seguranca_raid_timeout_min")
        await self._guardar_contas(guild.id, disparo.ids, substituir=True)

        punidos = 0
        for i in disparo.ids[:50]:  # quem já entrou na onda e tem conta nova
            m = guild.get_member(i)
            if m is None or m.bot or not seg.conta_nova(m.created_at.timestamp(), agora, dias) or await self._isento(m):
                continue
            punidos += await self._timeout_raid(m)
            await asyncio.sleep(0.2)

        linhas = []
        for i in disparo.ids[:15]:
            m = guild.get_member(i)
            if m is not None:
                linhas.append(f"{m.mention} — conta de <t:{int(m.created_at.timestamp())}:R>")
            else:
                linhas.append(f"`{i}` — já saiu")
        e = embed(
            textos.SEG_RAID_TITULO,
            textos.SEG_RAID_MOTIVO[disparo.motivo].format(n=len(disparo.ids))
            + "\n"
            + textos.SEG_RAID_SUAVE_LIGADO.format(min=minutos, dias=dias, timeout=timeout_min),
            config.COR_ERRO,
        )
        e.add_field(name=textos.SEG_RAID_CONTAS, value=truncar("\n".join(linhas), 1000), inline=False)
        if punidos:
            e.add_field(name="Timeout", value=textos.SEG_RAID_TIMEOUT_APLICADO.format(n=punidos), inline=False)
        e.timestamp = discord.utils.utcnow()
        await seg.enviar_alerta(self.bot, guild, e, view=RaidView())

    async def expulsar_contas(self, guild: discord.Guild, quem: discord.abc.User) -> int:
        """Expulsa as contas do alerta que ainda estão no servidor (nunca a staff). Um caso por conta, um aviso no fim."""
        n = 0
        for i in await self.contas_do_raid(guild):
            m = guild.get_member(i)
            if m is None or m.bot or await self._isento(m):
                continue
            try:
                await m.kick(reason=textos.SEG_RAID_KICK_MOTIVO.format(quem=quem))
            except discord.HTTPException:
                continue
            n += 1
            await self.bot.banco.criar_caso(guild.id, "kick", m.id, quem.id, textos.SEG_RAID_KICK_MOTIVO.format(quem=quem), None)
            await asyncio.sleep(0.3)
        await self.bot.banco.set_config(guild.id, "raid_suave_contas", None)
        e = embed("👢 Contas do raid expulsas", f"{quem.mention} expulsou **{n}** conta(s).", config.COR_AVISO)
        e.timestamp = discord.utils.utcnow()
        await enviar_log(self.bot, guild, "logs_mod", embed=e)
        return n

    # ------------------------------------------------------------------ anti-nuke
    @commands.Cog.listener()
    async def on_audit_log_entry_create(self, entry: discord.AuditLogEntry) -> None:
        try:
            await self._nuke(entry)
        except Exception:
            log.exception("Falha no anti-nuke")

    async def _nuke(self, entry: discord.AuditLogEntry) -> None:
        guild, banco = entry.guild, self.bot.banco
        categoria = seg.categoria_nuke(entry.action.name)
        uid = entry.user_id
        if categoria is None or uid is None or self.bot.user is None or uid == self.bot.user.id or uid == guild.owner_id:
            return
        if await banco.ajuste(guild.id, "seguranca_nuke") != 1:
            return
        alvo = truncar(str(entry.target) if entry.target is not None else "?", 60)
        descricao = f"<t:{int(entry.created_at.timestamp())}:T> {entry.action.name} → {alvo}"
        itens = self.nuke.registrar(guild.id, uid, categoria, descricao, await banco.ajuste(guild.id, seg.AJUSTE_NUKE[categoria]))
        if itens is None:
            return
        e = embed(
            textos.SEG_NUKE_TITULO,
            textos.SEG_NUKE_DESC.format(quem=f"<@{uid}> (`{uid}`)", n=len(itens), tipo=textos.SEG_NUKE_TIPOS[categoria]),
            config.COR_ERRO,
        )
        e.add_field(name="Ações", value=truncar("\n".join(itens), 1000), inline=False)
        if await banco.ajuste(guild.id, "seguranca_nuke_remover_perms") == 1:
            e.add_field(name="Resposta", value=await self._tirar_cargos(guild, uid, categoria), inline=False)
        e.timestamp = discord.utils.utcnow()
        await seg.enviar_alerta(self.bot, guild, e)

    async def _tirar_cargos(self, guild: discord.Guild, uid: int, categoria: str) -> str:
        membro = guild.get_member(uid)
        if membro is None:
            return textos.SEG_NUKE_SEM_HIERARQUIA
        alvos = [r for r in seg.cargos_perigosos(list(membro.roles)) if pode_gerenciar_cargo(guild, r)]
        if not alvos:
            return textos.SEG_NUKE_SEM_HIERARQUIA
        try:
            await membro.remove_roles(*alvos, reason=textos.SEG_NUKE_MOTIVO.format(tipo=categoria))
        except discord.HTTPException:
            return textos.SEG_NUKE_SEM_HIERARQUIA
        await self.bot.banco.set_config(guild.id, f"nuke_cargos_{uid}", ",".join(str(r.id) for r in alvos))
        return textos.SEG_NUKE_REMOVIDOS.format(cargos=" ".join(r.mention for r in alvos))

    # ------------------------------------------------------------------ comandos
    seguranca = app_commands.Group(name="seguranca", description="Proteção do servidor.", guild_only=True)

    @seguranca.command(name="status", description="Mostra o estado de cada camada de proteção.")
    @exigir_nivel(config.NIVEL_STAFF)
    async def status(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        await interaction.followup.send(embed=await self.embed_status(interaction.guild), ephemeral=True)  # type: ignore[arg-type]

    async def embed_status(self, guild: discord.Guild) -> discord.Embed:
        banco = self.bot.banco
        aj = await banco.todos_ajustes(guild.id)

        def liga(chave: str) -> str:
            return "✅ ligado" if aj[chave] == 1 else "❌ desligado"

        e = embed(textos.SEG_STATUS_TITULO, None)
        ate = await self.suave_ate(guild.id)
        if await self.raid_manual(guild.id):
            raid = "🚨 **manual** ligado (expulsa quem entra) — `/raid desligar`"
        elif ate > time.time():
            raid = f"🚨 **suave** ligado até <t:{ate}:R> (timeout em conta nova)"
        else:
            raid = "✅ desligado"
        e.add_field(name="Modo raid", value=raid, inline=False)
        e.add_field(
            name="Detector de raid",
            value=f"{liga('seguranca_raid_auto')}: {aj['seguranca_raid_n']} contas em {aj['seguranca_raid_janela']} s "
            f"ou {aj['seguranca_raid_novas_m']} muito novas em 60 s",
        )
        e.add_field(name="Anti-nuke", value=f"{liga('seguranca_nuke')} (alerta)" + (" + tira cargos" if aj["seguranca_nuke_remover_perms"] else ""))
        e.add_field(
            name="Contas novas",
            value=f"{liga('seguranca_novo_ligado')}: {aj['seguranca_novo_minutos']} min, conta < {aj['seguranca_conta_nova_dias']} dias",
        )
        e.add_field(name="Links de golpe", value=liga("seguranca_golpe"))

        regras = await seg.listar_regras(guild)
        if regras is None:
            texto_regras = "não consegui ler (falta **Gerenciar Servidor**?)"
        else:
            minhas = [r for r in regras if r.name.startswith(seg.PREFIXO_REGRA)]
            texto_regras = (
                "\n".join(f"{'✅' if r.enabled else '⏸️'} {r.name}" for r in minhas) if minhas else textos.SEG_REGRAS_NENHUMA
            )
        e.add_field(name="Regras do Discord (funcionam com o bot fora do ar)", value=truncar(texto_regras, 1000), inline=False)

        canal = await banco.get_config_int(guild.id, "canal_logs_mod")
        e.add_field(name="Canal de alertas", value=f"<#{canal}>" if canal else "❌ sem canal de **Logs de moderação** (/setup > Canais)")
        mfa = int(getattr(guild.mfa_level, "value", guild.mfa_level))
        e.add_field(name="2FA para moderadores", value="✅ exigido" if mfa else "⚠️ desligado (só o dono liga, nas configurações do servidor)")
        perms = guild.me.guild_permissions
        faltam = [nome for attr, nome in textos.SEG_PERMISSOES_BOT if not getattr(perms, attr)]
        e.add_field(name="Minhas permissões", value="✅ todas" if not faltam else "❌ faltam: " + ", ".join(faltam), inline=False)
        e.set_footer(text="Ajustes: /setup > 🛡️ Segurança")
        return e

    @seguranca.command(name="aplicar-regras", description="Cria ou atualiza as regras do AutoMod do Discord (valem até sem o bot).")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def aplicar_regras(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        linhas = await seg.aplicar_regras(self.bot, interaction.guild)  # type: ignore[arg-type]
        await interaction.followup.send(embed=embed(textos.SEG_REGRAS_TITULO, "\n".join(linhas)), ephemeral=True)

    @seguranca.command(name="auditoria", description="Lista riscos reais de permissões (só leitura).")
    @exigir_nivel(config.NIVEL_STAFF)
    async def auditoria(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        guild = interaction.guild
        assert guild is not None
        riscos = await self.rodar_auditoria(guild)
        view = AuditoriaView(self, interaction.user.id) if any(r.corrigivel for r in riscos) else None
        kwargs = {"view": view} if view is not None else {}
        await interaction.followup.send(embed=seg.embed_auditoria(riscos), ephemeral=True, **kwargs)

    async def rodar_auditoria(self, guild: discord.Guild) -> list[seg.Risco]:
        banco = self.bot.banco
        cfg = await banco.cfg(guild.id)
        logs = [int(cfg[c]) for c in ("canal_logs_mod", "canal_logs_gerais") if cfg.get(c, "").isdigit()]
        gerenciar = [int(cfg[c]) for c in ("cargo_visitante", "cargo_membro", "cargo_helper") if cfg.get(c, "").isdigit()]
        for lista in (await banco.grupos_cargos(guild.id)).values():
            gerenciar.extend(lista)
        gerenciar.extend(rid for _, rid in await banco.listar_cargos_xp(guild.id))
        return seg.auditar(guild, niveis=await banco.mapa_niveis(guild.id), canais_log_ids=logs, ids_gerenciar=gerenciar)

    @seguranca.command(name="raid-suave", description="Liga ou desliga na mão o modo raid suave (timeout em contas novas).")
    @app_commands.choices(acao=[app_commands.Choice(name="ligar", value="ligar"), app_commands.Choice(name="desligar", value="desligar")])
    @exigir_nivel(config.NIVEL_STAFF)
    async def raid_suave(self, interaction: discord.Interaction, acao: app_commands.Choice[str]) -> None:
        guild = interaction.guild
        assert guild is not None
        if acao.value == "ligar":
            if await self.raid_manual(guild.id):
                await responder(interaction, textos.SEG_RAID_MANUAL_ATIVO)
                return
            minutos = await self.ligar_suave(guild)
            await responder(interaction, textos.SEG_RAID_ON_OK.format(min=minutos))
        else:
            desligou = await self.desligar_suave(guild, quem=interaction.user.mention)
            await responder(interaction, textos.SEG_RAID_OFF_OK if desligou else textos.SEG_RAID_NAO_ESTAVA)

    @seguranca.command(name="devolver-cargos", description="Devolve os cargos que o anti-nuke tirou de alguém.")
    @app_commands.describe(membro="Quem recebe os cargos de volta")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def devolver_cargos(self, interaction: discord.Interaction, membro: discord.Member) -> None:
        banco, guild = self.bot.banco, interaction.guild
        assert guild is not None
        ids = seg.ids_da_lista(await banco.get_config(guild.id, f"nuke_cargos_{membro.id}"))
        cargos = [r for i in ids if (r := guild.get_role(i)) is not None and pode_gerenciar_cargo(guild, r)]
        if not cargos:
            await responder(interaction, textos.SEG_DEVOLVER_NADA)
            return
        try:
            await membro.add_roles(*cargos, reason=f"Kiza: devolvido por {interaction.user}")
        except discord.HTTPException:
            await responder(interaction, textos.SEG_DEVOLVER_ERRO)
            return
        await banco.set_config(guild.id, f"nuke_cargos_{membro.id}", None)
        await responder(interaction, textos.SEG_DEVOLVER_OK.format(cargos=" ".join(r.mention for r in cargos)))


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Seguranca(bot))
