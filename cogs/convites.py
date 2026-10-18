"""Convide um amigo: cada pessoa tem um link pessoal; quem entra por ele e cumpre o caminho (tempo no servidor, conta do Minecraft
ligada e nível mínimo) rende Caudas para quem convidou e para quem chegou.

Como o Discord não diz quem convidou, o bot guarda quantas vezes cada convite foi usado e, quando alguém entra, vê qual subiu.
Se dois convites subirem juntos (entradas quase ao mesmo tempo), ninguém leva o crédito: melhor perder um prêmio do que dar errado.
Prêmio sai com `recompensar_uma_vez` e o convite só fecha uma vez (reiniciar o bot ou repetir a conferência nunca paga duas vezes).
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import embed, enviar_log, formatar_moeda, nivel_por_xp
from utils.permissoes import checar_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.convites")
FUSO = timezone(timedelta(hours=-3))


def achar_convite(antes: dict[str, int], depois: dict[str, int]) -> Optional[str]:
    """O código do convite que ganhou um uso entre os dois retratos. None se nenhum ou mais de um subiu (ambíguo)."""
    subiram = [codigo for codigo, usos in depois.items() if usos > antes.get(codigo, 0)]
    return subiram[0] if len(subiram) == 1 else None


def avaliar(
    entrou_em: int, agora: int, *, nivel: int, tem_mc: bool, ainda_no_servidor: bool, horas: int, dias: int, nivel_min: int, exige_mc: bool
) -> str:
    """'pendente' (ainda não deu), 'ok' (cumpriu), 'saiu' ou 'expirado'."""
    if not ainda_no_servidor:
        return "saiu"
    if agora - entrou_em < horas * 3600:
        return "pendente"  # nunca vale antes do tempo mínimo, mesmo com tudo cumprido
    if nivel >= nivel_min and (tem_mc or not exige_mc):
        return "ok"
    return "expirado" if agora - entrou_em > dias * 86400 else "pendente"


def inicio_do_mes() -> int:
    agora = datetime.now(FUSO)
    return int(agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp())


class Convites(commands.Cog):
    convites = app_commands.Group(name="convites", description="Ranking do programa Convide um amigo.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._usos: dict[int, dict[str, int]] = {}  # servidor -> código -> usos (o último retrato)

    async def cog_load(self) -> None:
        self.conferir.start()

    async def cog_unload(self) -> None:
        self.conferir.cancel()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    async def ligado(self, guild_id: int) -> bool:
        return bool(await self.bot.banco.ajuste(guild_id, "convite_ligado"))

    # ------------------------------------------------------------------ retrato dos usos
    async def retrato(self, guild: discord.Guild) -> Optional[dict[str, int]]:
        try:
            return {c.code: int(c.uses or 0) for c in await guild.invites()}
        except discord.HTTPException:
            return None  # sem a permissão Gerenciar servidor

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        for guild in self.bot.guilds:
            r = await self.retrato(guild)
            if r is not None:
                self._usos[guild.id] = r

    @commands.Cog.listener()
    async def on_invite_create(self, convite: discord.Invite) -> None:
        if convite.guild is not None:
            self._usos.setdefault(convite.guild.id, {})[convite.code] = int(convite.uses or 0)

    @commands.Cog.listener()
    async def on_invite_delete(self, convite: discord.Invite) -> None:
        if convite.guild is not None:
            self._usos.get(convite.guild.id, {}).pop(convite.code, None)

    @commands.Cog.listener()
    async def on_member_join(self, membro: discord.Member) -> None:
        guild = membro.guild
        antes = self._usos.get(guild.id)
        depois = await self.retrato(guild)
        if depois is None:
            return
        self._usos[guild.id] = depois
        if membro.bot or antes is None or not await self.ligado(guild.id):
            return
        codigo = achar_convite(antes, depois)
        if codigo is None:
            return
        convidante = await self.bot.banco.convite_dono(guild.id, codigo)
        if convidante is None or convidante == membro.id:
            return
        # conta recém-criada não rende prêmio (anti-farm com conta fake): fica registrada para não tentar de novo
        nova = datetime.now(timezone.utc) - membro.created_at < timedelta(days=config.BOAS_VINDAS_CONTA_MIN_DIAS)
        await self.bot.banco.convidado_registrar(guild.id, membro.id, convidante, codigo, "recusado" if nova else "pendente")

    # ------------------------------------------------------------------ conferência dos pendentes
    @tasks.loop(minutes=10)
    async def conferir(self) -> None:
        try:
            for guild in self.bot.guilds:
                if await self.ligado(guild.id):
                    await self.conferir_servidor(guild)
        except Exception:
            log.exception("Erro ao conferir os convites")

    @conferir.before_loop
    async def _antes(self) -> None:
        await self.bot.wait_until_ready()

    async def conferir_servidor(self, guild: discord.Guild) -> int:
        """Confere os convites pendentes e paga os que cumpriram. Devolve quantos foram pagos."""
        banco = self.bot.banco
        horas, dias = await banco.ajuste(guild.id, "convite_horas"), await banco.ajuste(guild.id, "convite_dias")
        nivel_min, exige_mc = await banco.ajuste(guild.id, "convite_nivel"), bool(await banco.ajuste(guild.id, "convite_exige_mc"))
        agora = int(time.time())
        pagos = 0
        for c in await banco.convidados_pendentes(guild.id):
            amigo = guild.get_member(int(c["convidado_id"]))
            perfil = await banco.obter_perfil(guild.id, int(c["convidado_id"])) if amigo else None
            nivel = nivel_por_xp(int(perfil["xp"]))[0] if perfil else 0
            tem_mc = amigo is not None and await banco.mc_vinculo_de_usuario(guild.id, amigo.id) is not None
            estado = avaliar(
                int(c["entrou_em"]), agora, nivel=nivel, tem_mc=tem_mc, ainda_no_servidor=amigo is not None,
                horas=horas, dias=dias, nivel_min=nivel_min, exige_mc=exige_mc,
            )
            if estado == "pendente":
                continue
            if estado != "ok":
                await banco.convidado_fechar(guild.id, int(c["convidado_id"]), estado)
                continue
            assert amigo is not None
            if await self.pagar(guild, c, amigo):
                pagos += 1
        return pagos

    async def pagar(self, guild: discord.Guild, c, amigo: discord.Member) -> bool:
        banco = self.bot.banco
        convidante_id = int(c["convidante_id"])
        premio, premio_novato = await banco.ajuste(guild.id, "convite_premio"), await banco.ajuste(guild.id, "convite_premio_novato")
        teto = await banco.ajuste(guild.id, "convite_teto_mes")
        no_teto = await banco.convites_pagos_no_mes(guild.id, convidante_id, inicio_do_mes()) >= teto
        if not await banco.convidado_fechar(guild.id, amigo.id, "teto" if no_teto else "pago"):
            return False  # outra conferência fechou antes
        if not no_teto and premio > 0:
            await banco.recompensar_uma_vez(guild.id, f"convite:{amigo.id}:convidante", convidante_id, premio, "convite")
        if premio_novato > 0:
            await banco.recompensar_uma_vez(guild.id, f"convite:{amigo.id}:novato", amigo.id, premio_novato, "convite")
        quem = guild.get_member(convidante_id)
        await self._avisar(amigo, textos.CONVITE_DM_NOVATO.format(premio=formatar_moeda(premio_novato), convidante=quem.display_name if quem else "alguém"))
        if quem is not None:
            texto = textos.CONVITE_DM_CONVIDANTE_TETO if no_teto else textos.CONVITE_DM_CONVIDANTE
            await self._avisar(quem, texto.format(amigo=amigo.display_name, premio=formatar_moeda(premio)))
        await enviar_log(
            self.bot, guild, "logs_gerais",
            embed=embed(
                textos.CONVITE_LOG_TITULO,
                textos.CONVITE_LOG_DESC.format(
                    convidante=f"<@{convidante_id}>", amigo=amigo.mention,
                    premio="0 (teto do mês)" if no_teto else formatar_moeda(premio), premio_novato=formatar_moeda(premio_novato),
                ),
                config.COR_INFO,
            ),
        )
        return True

    @staticmethod
    async def _avisar(membro: discord.Member, texto: str) -> None:
        try:
            await membro.send(texto)
        except (discord.Forbidden, discord.HTTPException):
            pass  # DM fechada: o prêmio já foi dado, o aviso é só cortesia

    # ------------------------------------------------------------------ comandos
    async def _canal_do_convite(self, guild: discord.Guild) -> Optional[discord.abc.GuildChannel]:
        eu = guild.me
        candidatos = [guild.rules_channel, guild.system_channel, *guild.text_channels]
        for canal in candidatos:
            if canal is not None and eu is not None and canal.permissions_for(eu).create_instant_invite:
                return canal
        return None

    async def _link(self, guild: discord.Guild, user_id: int) -> Optional[str]:
        """O link pessoal: reaproveita o que existe e ainda vale; senão cria um permanente (sem validade nem limite de usos)."""
        banco = self.bot.banco
        existente = await banco.convite_do_usuario(guild.id, user_id)
        vivos = await self.retrato(guild)
        if vivos is None:
            return None
        if existente is not None and existente["codigo"] in vivos:
            return f"https://discord.gg/{existente['codigo']}"
        canal = await self._canal_do_convite(guild)
        if canal is None:
            return ""
        try:
            novo = await canal.create_invite(max_age=0, max_uses=0, unique=True, reason=f"Kiza: link pessoal de {user_id}")
        except discord.HTTPException:
            return None
        await banco.convite_salvar(guild.id, user_id, novo.code)
        self._usos.setdefault(guild.id, {})[novo.code] = 0
        return novo.url

    @app_commands.command(name="convidar", description="Seu link pessoal para convidar amigos e ganhar Caudas.")
    @app_commands.guild_only()
    async def convidar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        if not await self.ligado(guild.id):
            await interaction.response.send_message(textos.CONVITE_DESLIGADO, ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        link = await self._link(guild, interaction.user.id)
        if link is None:
            await interaction.followup.send(textos.CONVITE_SEM_PERMISSAO, ephemeral=True)
            return
        if link == "":
            await interaction.followup.send(textos.CONVITE_SEM_CANAL, ephemeral=True)
            return
        banco = self.bot.banco
        a = {k: await banco.ajuste(guild.id, f"convite_{k}") for k in ("premio", "premio_novato", "nivel", "horas", "dias", "teto_mes")}
        stats = await banco.convites_stats(guild.id, interaction.user.id)
        mes = await banco.convites_pagos_no_mes(guild.id, interaction.user.id, inicio_do_mes())
        ganho = stats.get("pago", 0) * a["premio"]
        desc = textos.CONVITE_DESC.format(
            link=link, horas=a["horas"], nivel=a["nivel"], premio=formatar_moeda(a["premio"]), premio_novato=formatar_moeda(a["premio_novato"]),
            dias=a["dias"], conta_dias=config.BOAS_VINDAS_CONTA_MIN_DIAS, teto=a["teto_mes"],
        )
        desc += "\n\n" + textos.CONVITE_STATS.format(pendentes=stats.get("pendente", 0), pagos=stats.get("pago", 0), ganho=formatar_moeda(ganho))
        desc += "\n" + textos.CONVITE_STATS_TETO.format(mes=mes, teto=a["teto_mes"])
        await interaction.followup.send(embed=embed(textos.CONVITE_TITULO, desc), ephemeral=True)

    @convites.command(name="ranking", description="Quem mais trouxe amigos para a toca.")
    async def ranking(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        linhas = await self.bot.banco.convites_ranking(guild.id, 10)
        if not linhas:
            await interaction.response.send_message(textos.CONVITE_RANKING_VAZIO, ephemeral=True)
            return
        texto = "\n".join(
            textos.CONVITE_RANKING_LINHA.format(pos=i, quem=f"<@{r['convidante_id']}>", pagos=r["pagos"]) for i, r in enumerate(linhas, 1)
        )
        await interaction.response.send_message(embed=embed(textos.CONVITE_RANKING_TITULO, texto), ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Convites(bot))
