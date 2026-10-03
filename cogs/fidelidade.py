"""Fidelidade: o caminho até Helper.

A Kiza conta sozinha, por pessoa:
* bumps (no cog de bump, no mesmo ponto em que o bump é pago);
* boas-vindas dadas a quem acabou de chegar, no canal de boas-vindas;
* denúncias aprovadas pela staff (botões no tíquete de denúncia);
* publicações nos canais marcados no /setup (imagem, vídeo, link ou post novo em fórum).
O tíquete "Solicitar rank" mostra o quadro do autor e dá à staff os botões para promover a Helper.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Iterable, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from utils.helpers import (
    barra_progresso,
    embed,
    enviar_log,
    nivel_por_xp,
    permissoes_perigosas,
    pode_gerenciar_cargo,
    responder,
    sem_acento,
)
from utils.permissoes import checar_membro, eh_membro, exigir_nivel, nivel_do_membro
from utils.views import BaseView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.fidelidade")
URL_RE = re.compile(r"https?://\S+", re.I)
SAUDACOES = ("bem-vind", "bem vind", "bemvind", "boas-vind", "boas vind")
EXTENSOES_MIDIA = {"png", "jpg", "jpeg", "gif", "webp", "bmp", "mp4", "mov", "webm", "mkv"}


# ============================================================================ funções puras
def itens_fidelidade() -> list[tuple[str, tuple[str, str, str]]]:
    """(chave, (emoji, rótulo, ajuste da meta)) na ordem do quadro: os contadores, o nível de XP e os dias no servidor."""
    return [*config.FIDELIDADE_TIPOS.items(), ("nivel", config.FIDELIDADE_NIVEL), ("dias", config.FIDELIDADE_DIAS)]


def dias_no_servidor(membro: Optional[discord.Member]) -> int:
    """Dias completos desde a entrada (0 se saiu ou se o Discord não informar)."""
    if membro is None or membro.joined_at is None:
        return 0
    return max(0, (discord.utils.utcnow() - membro.joined_at).days)


def faltando(valores: dict[str, int], metas: dict[str, int]) -> dict[str, int]:
    """Requisito -> quanto ainda falta (só os que não bateram)."""
    return {chave: meta - valores.get(chave, 0) for chave, meta in metas.items() if valores.get(chave, 0) < meta}


def progresso(valores: dict[str, int], metas: dict[str, int]) -> int:
    """0 a 100: média de quanto de cada meta já foi feito (cada uma conta no máximo 100%)."""
    if not metas:
        return 100
    partes = [1.0 if meta <= 0 else min(valores.get(chave, 0), meta) / meta for chave, meta in metas.items()]
    return int(100 * sum(partes) / len(partes))


def eh_saudacao(texto: Optional[str]) -> bool:
    limpo = sem_acento(texto or "")
    return any(p in limpo for p in SAUDACOES)


def novatos_saudados(texto: Optional[str], alvos: set[int], novatos: Iterable[int]) -> list[int]:
    """Quem a mensagem saudou: os novatos marcados/respondidos. Sem ninguém marcado, um "bem-vindo(a)" vale só
    para os últimos que chegaram (BOAS_VINDAS_GENERICA_MAX). `novatos` vem do mais antigo ao mais novo."""
    novatos = list(novatos)
    citados = [n for n in novatos if n in alvos]
    if citados:
        return citados
    return novatos[-config.BOAS_VINDAS_GENERICA_MAX:] if eh_saudacao(texto) else []


def conta_nova(criada_em: datetime, agora: datetime) -> bool:
    """Conta do Discord nova demais para render boas-vindas (contas fake criadas para farmar)."""
    return agora - criada_em < timedelta(days=config.BOAS_VINDAS_CONTA_MIN_DIAS)


def ids_canais(valor: Optional[str]) -> set[int]:
    """'1,2,3' (como fica guardado no banco) -> {1, 2, 3}."""
    return {int(parte) for parte in (valor or "").split(",") if parte.strip().isdigit()}


def eh_midia(anexo) -> bool:
    tipo = (getattr(anexo, "content_type", None) or "").lower()
    if tipo.startswith(("image/", "video/")):
        return True
    nome = (getattr(anexo, "filename", None) or "").lower()
    return "." in nome and nome.rsplit(".", 1)[1] in EXTENSOES_MIDIA


def conta_como_publicacao(mensagem) -> bool:
    """Imagem, vídeo ou link. Texto puro e figurinha não contam."""
    return any(eh_midia(a) for a in mensagem.attachments) or bool(URL_RE.search(mensagem.content or ""))


# ============================================================================ views persistentes
class AvaliarDenunciaView(BaseView):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(
        label=textos.DENUNCIA_APROVAR, emoji="✅", style=discord.ButtonStyle.success, custom_id="kiza:denuncia:aprovar"
    )
    async def aprovar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Fidelidade")
        if cog is not None:
            await cog.avaliar_denuncia(interaction, True)  # type: ignore[attr-defined]

    @discord.ui.button(
        label=textos.DENUNCIA_REJEITAR, emoji="❌", style=discord.ButtonStyle.danger, custom_id="kiza:denuncia:rejeitar"
    )
    async def rejeitar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Fidelidade")
        if cog is not None:
            await cog.avaliar_denuncia(interaction, False)  # type: ignore[attr-defined]


class PedidoRankView(BaseView):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(
        label=textos.RANK_PROMOVER, emoji="🎖️", style=discord.ButtonStyle.success, custom_id="kiza:rank:promover"
    )
    async def promover(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Fidelidade")
        if cog is not None:
            await cog.promover(interaction)  # type: ignore[attr-defined]

    @discord.ui.button(label=textos.RANK_RECUSAR, style=discord.ButtonStyle.secondary, custom_id="kiza:rank:recusar")
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        cog = interaction.client.get_cog("Fidelidade")
        if cog is not None:
            await cog.recusar(interaction)  # type: ignore[attr-defined]


# ============================================================================ cog
class Fidelidade(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    def views_persistentes(self) -> list[discord.ui.View]:
        return [AvaliarDenunciaView(), PedidoRankView()]

    # ------------------------------------------------------------------ quadro
    async def metas(self, guild_id: int) -> dict[str, int]:
        return {chave: await self.bot.banco.ajuste(guild_id, ajuste) for chave, (_, _, ajuste) in itens_fidelidade()}

    async def valores(self, guild: discord.Guild, user_id: int) -> dict[str, int]:
        valores = await self.bot.banco.fidelidade(guild.id, user_id)
        xp = (await self.bot.banco.xp_de(guild.id, [user_id])).get(user_id, 0)
        valores["nivel"] = nivel_por_xp(xp)[0]
        valores["dias"] = dias_no_servidor(guild.get_member(user_id))
        return valores

    async def eh_equipe(self, membro: discord.Member) -> bool:
        """Já é Helper ou acima (pelo nível de permissão ou pelo cargo Helper do /setup)."""
        if await nivel_do_membro(self.bot, membro) >= config.NIVEL_HELPER:
            return True
        cargo_id = await self.bot.banco.get_config_int(membro.guild.id, "cargo_helper")
        return cargo_id is not None and any(r.id == cargo_id for r in membro.roles)

    @staticmethod
    def texto_falta(falta: dict[str, int], metas: dict[str, int]) -> str:
        partes = []
        for chave, (emoji, _, _) in itens_fidelidade():
            if chave not in falta:
                continue
            if chave == "nivel":
                partes.append(f"{emoji} {textos.FIDELIDADE_FALTA_NIVEL.format(nivel=metas['nivel'])}")
            elif chave == "dias":
                partes.append(f"{emoji} {textos.FIDELIDADE_FALTA_DIAS.format(dias=falta[chave])}")
            else:
                partes.append(f"{emoji} +{falta[chave]}")
        return " · ".join(partes)

    async def quadro(self, membro: discord.Member) -> discord.Embed:
        guild_id = membro.guild.id
        valores, metas = await self.valores(membro.guild, membro.id), await self.metas(guild_id)
        linhas = []
        for chave, (emoji, rotulo, _) in itens_fidelidade():
            atual, meta = valores.get(chave, 0), metas[chave]
            barra = barra_progresso(min(atual, meta), meta, 8) if meta > 0 else barra_progresso(1, 1, 8)
            linhas.append(
                textos.FIDELIDADE_LINHA.format(
                    marca="✅" if atual >= meta else "❌", emoji=emoji, rotulo=rotulo, atual=atual, meta=meta, barra=barra
                )
            )
        falta = faltando(valores, metas)
        e = embed(
            textos.FIDELIDADE_TITULO.format(nome=membro.display_name),
            textos.FIDELIDADE_DESC + "\n\n" + "\n".join(linhas),
            config.COR_PRINCIPAL if falta else config.COR_OK,
        )
        e.set_thumbnail(url=membro.display_avatar.url)
        if await self.eh_equipe(membro):
            situacao = textos.FIDELIDADE_JA_EQUIPE
        elif not falta:
            situacao = textos.FIDELIDADE_PRONTO
        else:
            situacao = textos.FIDELIDADE_FALTA.format(itens=self.texto_falta(falta, metas))
        e.add_field(name=textos.FIDELIDADE_SITUACAO, value=situacao, inline=False)
        e.add_field(name=textos.FIDELIDADE_COMO_TITULO, value=textos.FIDELIDADE_COMO, inline=False)
        e.set_footer(text=textos.FIDELIDADE_RODAPE)
        return e

    # ------------------------------------------------------------------ comandos
    @app_commands.command(name="fidelidade", description="Seu caminho até Helper: bumps, boas-vindas, denúncias e publicações.")
    @app_commands.guild_only()
    @app_commands.describe(membro="De quem (padrão: você)")
    @app_commands.checks.cooldown(1, 5.0)
    async def ver_fidelidade(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None) -> None:
        alvo = membro or interaction.user
        if not isinstance(alvo, discord.Member) or alvo.bot:
            await responder(interaction, textos.FIDELIDADE_AJUSTE_BOT)
            return
        await interaction.response.send_message(embed=await self.quadro(alvo))
        staff = interaction.user
        if isinstance(staff, discord.Member) and await nivel_do_membro(self.bot, staff) >= config.NIVEL_STAFF:
            await interaction.followup.send(embed=await self.detalhe(alvo), ephemeral=True)

    async def detalhe(self, membro: discord.Member) -> discord.Embed:
        """Só para a staff: de onde vieram as boas-vindas e as publicações (para pegar farm com conta fake)."""
        guild, banco = membro.guild, self.bot.banco
        agora = discord.utils.utcnow()
        linhas_bv = []
        for novato_id, quando in await banco.ultimas_boas_vindas(guild.id, membro.id):
            dias = (agora - discord.utils.snowflake_time(novato_id)).days  # o id já diz quando a conta foi criada
            novato = guild.get_member(novato_id)
            if novato is None:
                situacao = textos.FIDELIDADE_DETALHE_SAIU
            elif await eh_membro(self.bot, novato):
                situacao = textos.FIDELIDADE_DETALHE_VERIFICOU
            else:
                situacao = textos.FIDELIDADE_DETALHE_NAO_VERIFICOU
            linhas_bv.append(f"<@{novato_id}> · conta de {dias}d · {situacao} · <t:{quando}:R>")
        linhas_pub = [
            f"[mensagem](https://discord.com/channels/{guild.id}/{canal_id}/{msg_id}) em <#{canal_id}> · <t:{quando}:R>"
            for canal_id, msg_id, quando in await banco.ultimas_publicacoes(guild.id, membro.id, 6)  # cabe no campo
        ]
        e = embed(textos.FIDELIDADE_DETALHE_TITULO.format(nome=membro.display_name), textos.FIDELIDADE_DETALHE_DESC)
        e.add_field(name="👋 Últimas boas-vindas", value="\n".join(linhas_bv) or "—", inline=False)
        e.add_field(name="📸 Últimas publicações", value="\n".join(linhas_pub) or "—", inline=False)
        return e

    @app_commands.command(name="fidelidade-ranking", description="Quem está mais perto de virar Helper (staff).")
    @app_commands.guild_only()
    @exigir_nivel(config.NIVEL_STAFF)
    @app_commands.checks.cooldown(1, 10.0)
    async def fidelidade_ranking(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        banco = self.bot.banco
        todos = await banco.todas_fidelidades(guild.id)
        xp = await banco.xp_de(guild.id, todos)
        metas = await self.metas(guild.id)
        lista = []
        for user_id, contadores in todos.items():
            membro = guild.get_member(user_id)
            if membro is None or membro.bot or await self.eh_equipe(membro):
                continue  # quem já é da equipe não ocupa vaga de candidato
            valores = {**contadores, "nivel": nivel_por_xp(xp.get(user_id, 0))[0], "dias": dias_no_servidor(membro)}
            total = sum(contadores.values())  # desempate: só o que a pessoa fez (sem nível e dias)
            lista.append((progresso(valores, metas), total, membro, valores))
        if not lista:
            await responder(interaction, textos.FIDELIDADE_RANKING_VAZIO)
            return
        lista.sort(key=lambda item: (-item[0], -item[1], item[2].id))
        linhas = []
        for i, (pct, _, membro, valores) in enumerate(lista[:10]):
            marca = "" if faltando(valores, metas) else " ✅"
            partes = " · ".join(f"{emoji} {valores[chave]}" for chave, (emoji, _, _) in itens_fidelidade())
            linhas.append(f"`{i + 1}.` **{membro.display_name}** — **{pct}%**{marca}\n{partes}")
        e = embed(textos.FIDELIDADE_RANKING_TITULO, "\n".join(linhas))
        e.set_footer(text=textos.FIDELIDADE_RANKING_RODAPE)
        await responder(interaction, embed=e)

    @app_commands.command(name="fidelidade-ajustar", description="Corrige ou importa números da fidelidade (admin).")
    @app_commands.guild_only()
    @app_commands.describe(
        membro="De quem",
        tipo="Qual contador",
        quantidade="Quanto somar (negativo tira) ou, no modo Definir, o valor final",
        motivo="Por que (fica no log de moderação)",
        modo="Somar (padrão) ou definir o valor exato",
    )
    @app_commands.choices(
        tipo=[
            app_commands.Choice(name=f"{emoji} {rotulo}", value=chave)
            for chave, (emoji, rotulo, _) in config.FIDELIDADE_TIPOS.items()
        ],
        modo=[app_commands.Choice(name="Somar", value="somar"), app_commands.Choice(name="Definir", value="definir")],
    )
    @exigir_nivel(config.NIVEL_ADMIN)
    async def fidelidade_ajustar(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        tipo: app_commands.Choice[str],
        quantidade: app_commands.Range[int, -100000, 100000],
        motivo: app_commands.Range[str, 3, 300],
        modo: Optional[app_commands.Choice[str]] = None,
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        if membro.bot:
            await responder(interaction, textos.FIDELIDADE_AJUSTE_BOT)
            return
        banco = self.bot.banco
        antes = (await banco.fidelidade(guild.id, membro.id))[tipo.value]
        if modo is not None and modo.value == "definir":
            depois = await banco.definir_fidelidade(guild.id, membro.id, tipo.value, quantidade)
        else:
            depois = await banco.somar_fidelidade(guild.id, membro.id, tipo.value, quantidade)
        rotulo = config.FIDELIDADE_TIPOS[tipo.value][1]
        await responder(
            interaction, textos.FIDELIDADE_AJUSTE_OK.format(tipo=rotulo, alvo=membro.mention, antes=antes, depois=depois)
        )
        e = embed(
            textos.FIDELIDADE_LOG_AJUSTE,
            f"{membro.mention}: {rotulo} **{antes}** → **{depois}**\nPor {interaction.user.mention}\nMotivo: {motivo}",
            config.COR_INFO,
        )
        await enviar_log(self.bot, guild, "logs_mod", embed=e)

    # ------------------------------------------------------------------ boas-vindas
    @commands.Cog.listener()
    async def on_member_join(self, membro: discord.Member) -> None:
        if membro.bot or await self.bot.banco.get_config(membro.guild.id, "raid_ativo") == "1":
            return
        if conta_nova(membro.created_at, discord.utils.utcnow()):
            return  # conta recém-criada não rende boas-vindas (anti-farm com conta fake)
        await self.bot.banco.registrar_entrada(membro.guild.id, membro.id)

    @commands.Cog.listener()
    async def on_member_remove(self, membro: discord.Member) -> None:
        if membro.bot:
            return
        perderam = await self.bot.banco.registrar_saida(membro.guild.id, membro.id)
        if perderam:
            log.info("%s saiu logo depois de entrar: %d boa(s)-vinda(s) desfeita(s)", membro.id, len(perderam))

    async def _talvez_boas_vindas(self, mensagem: discord.Message) -> None:
        guild, autor = mensagem.guild, mensagem.author
        assert guild is not None and isinstance(autor, discord.Member)
        novatos = await self.bot.banco.novatos_recentes(guild.id, int(time.time()) - config.BOAS_VINDAS_JANELA)
        if not novatos or autor.id in novatos:
            return  # quem acabou de chegar não conta boas-vindas
        if not await eh_membro(self.bot, autor):
            return
        alvos = {usuario.id for usuario in mensagem.mentions}
        ref = mensagem.reference.resolved if mensagem.reference else None
        if isinstance(ref, discord.Message):
            alvos.add(ref.author.id)
            if self.bot.user is not None and ref.author.id == self.bot.user.id:
                alvos.update(usuario.id for usuario in ref.mentions)  # respondeu às boas-vindas da Kiza
        saudados = novatos_saudados(mensagem.content, alvos, novatos)
        if saudados:
            await self.bot.banco.registrar_boas_vindas(guild.id, autor.id, saudados)

    # ------------------------------------------------------------------ publicações
    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.guild is None or mensagem.author.bot or not isinstance(mensagem.author, discord.Member):
            return
        if mensagem.type not in (discord.MessageType.default, discord.MessageType.reply):
            return
        cfg = await self.bot.banco.cfg(mensagem.guild.id)
        if cfg.get("canal_boas_vindas") == str(mensagem.channel.id):
            await self._talvez_boas_vindas(mensagem)
        elif mensagem.channel.id in ids_canais(cfg.get("canais_publicacao")) and conta_como_publicacao(mensagem):
            if await eh_membro(self.bot, mensagem.author):
                await self.bot.banco.registrar_publicacao(
                    mensagem.guild.id, mensagem.author.id, mensagem.channel.id, mensagem.id
                )

    @commands.Cog.listener()
    async def on_thread_create(self, thread: discord.Thread) -> None:
        """Post novo num fórum de publicação conta mesmo sem imagem (o post já é a publicação)."""
        if thread.guild is None or thread.parent_id is None:
            return
        if thread.parent_id not in ids_canais(await self.bot.banco.get_config(thread.guild.id, "canais_publicacao")):
            return
        if not isinstance(thread.parent, discord.ForumChannel):
            return
        dono = thread.owner or (thread.guild.get_member(thread.owner_id) if thread.owner_id else None)
        if dono is None or dono.bot or not await eh_membro(self.bot, dono):
            return
        # o post do fórum tem o mesmo id do tópico: a "mensagem" é o próprio tópico
        await self.bot.banco.registrar_publicacao(thread.guild.id, dono.id, thread.id, thread.id)

    async def _eh_canal_de_publicacao(self, guild_id: int, canal_id: int) -> bool:
        """Filtro antes de ir ao banco: só apagadas em canal de publicação (ou num post de fórum dele) importam."""
        canais = ids_canais(await self.bot.banco.get_config(guild_id, "canais_publicacao"))
        if canal_id in canais:
            return True
        canal = self.bot.get_channel(canal_id)
        return isinstance(canal, discord.Thread) and canal.parent_id in canais

    @commands.Cog.listener()
    async def on_raw_message_delete(self, evento: discord.RawMessageDeleteEvent) -> None:
        if evento.guild_id and await self._eh_canal_de_publicacao(evento.guild_id, evento.channel_id):
            await self.bot.banco.desfazer_publicacoes(evento.guild_id, [evento.message_id])

    @commands.Cog.listener()
    async def on_raw_bulk_message_delete(self, evento: discord.RawBulkMessageDeleteEvent) -> None:
        if evento.guild_id and await self._eh_canal_de_publicacao(evento.guild_id, evento.channel_id):
            await self.bot.banco.desfazer_publicacoes(evento.guild_id, evento.message_ids)

    @commands.Cog.listener()
    async def on_raw_thread_delete(self, evento: discord.RawThreadDeleteEvent) -> None:
        canais = ids_canais(await self.bot.banco.get_config(evento.guild_id, "canais_publicacao"))
        if evento.parent_id in canais:
            await self.bot.banco.desfazer_publicacoes(evento.guild_id, [evento.thread_id])

    # ------------------------------------------------------------------ tíquetes (chamado pelo cog de tickets)
    async def ticket_aberto(self, canal: discord.TextChannel, autor: discord.Member, categoria: str) -> None:
        """Denúncia ganha os botões de avaliação; pedido de rank ganha o quadro e os botões de decisão."""
        try:
            if categoria == "denuncia":
                e = embed(
                    textos.DENUNCIA_AVALIAR_TITULO, textos.DENUNCIA_AVALIAR_DESC.format(autor=autor.mention), config.COR_INFO
                )
                await canal.send(embed=e, view=AvaliarDenunciaView(), allowed_mentions=discord.AllowedMentions.none())
            elif categoria == "rank":
                topo = embed(textos.RANK_TICKET_TITULO, textos.RANK_TICKET_DESC.format(autor=autor.mention))
                await canal.send(
                    embeds=[topo, await self.quadro(autor)],
                    view=PedidoRankView(),
                    allowed_mentions=discord.AllowedMentions.none(),
                )
        except discord.HTTPException:
            log.warning("Falha ao preparar o tíquete de %s (%s)", categoria, canal.id, exc_info=True)

    async def _ticket_da_staff(self, interaction: discord.Interaction, categoria: str, so_staff: str, proprio: str):
        """O tíquete aberto desta categoria, se quem clicou é Staff+ e não é o autor. Senão responde e devolve None."""
        membro = interaction.user
        if not isinstance(membro, discord.Member) or interaction.channel_id is None:
            return None
        ticket = await self.bot.banco.obter_ticket_por_canal(interaction.channel_id)
        if ticket is None or ticket["status"] != "aberto" or ticket["categoria"] != categoria:
            await responder(interaction, textos.TICKET_NAO_ENCONTRADO)
            return None
        if await nivel_do_membro(self.bot, membro) < config.NIVEL_STAFF:
            await responder(interaction, so_staff)
            return None
        if membro.id == ticket["autor_id"]:
            await responder(interaction, proprio)
            return None
        return ticket

    async def avaliar_denuncia(self, interaction: discord.Interaction, aprovada: bool) -> None:
        ticket = await self._ticket_da_staff(interaction, "denuncia", textos.DENUNCIA_SO_STAFF, textos.DENUNCIA_PROPRIA)
        if ticket is None:
            return
        staff = interaction.user
        autor_id = await self.bot.banco.avaliar_denuncia(ticket["canal_id"], aprovada, staff.id)
        if autor_id is None:
            await responder(interaction, textos.DENUNCIA_JA_AVALIADA)
            return
        if aprovada:
            texto = textos.DENUNCIA_APROVADA.format(staff=staff.mention, autor=f"<@{autor_id}>")
        else:
            texto = textos.DENUNCIA_REJEITADA.format(staff=staff.mention)
        await interaction.response.edit_message(content=texto, view=None, allowed_mentions=discord.AllowedMentions.none())
        e = embed(
            textos.DENUNCIA_LOG.format(resultado="aprovada" if aprovada else "rejeitada"),
            f"Tíquete #{ticket['id']} de <@{autor_id}>\nPor {staff.mention}",
            config.COR_OK if aprovada else config.COR_ERRO,
        )
        await enviar_log(self.bot, interaction.guild, "logs_mod", embed=e)  # type: ignore[arg-type]

    async def promover(self, interaction: discord.Interaction) -> None:
        ticket = await self._ticket_da_staff(interaction, "rank", textos.RANK_SO_STAFF, textos.RANK_PROPRIO)
        if ticket is None:
            return
        guild, staff = interaction.guild, interaction.user
        assert guild is not None and isinstance(staff, discord.Member)
        cargo_id = await self.bot.banco.get_config_int(guild.id, "cargo_helper")
        cargo = guild.get_role(cargo_id) if cargo_id else None
        if cargo is None:
            await responder(interaction, textos.RANK_SEM_CARGO)
            return
        alvo = guild.get_member(ticket["autor_id"])
        if alvo is None:
            await responder(interaction, textos.RANK_AUTOR_SAIU)
            return
        if cargo in alvo.roles:
            await responder(interaction, textos.RANK_JA_TEM.format(autor=alvo.mention, cargo=cargo.mention))
            return
        perigosas = permissoes_perigosas(cargo.permissions)
        if perigosas:
            await responder(
                interaction, textos.RANK_CARGO_PERIGOSO.format(cargo=cargo.mention, permissoes=", ".join(perigosas))
            )
            return
        if not guild.me.guild_permissions.manage_roles:
            await responder(interaction, textos.RANK_SEM_PERMISSAO)
            return
        manda_em_tudo = guild.owner_id == staff.id or staff.guild_permissions.administrator
        if not pode_gerenciar_cargo(guild, cargo) or (not manda_em_tudo and cargo >= staff.top_role):
            await responder(interaction, textos.RANK_ERRO_HIERARQUIA.format(cargo=cargo.mention))
            return
        # grava a decisão antes de dar o cargo: dois cliques (ou Promover e Recusar juntos) não valem duas vezes
        if not await self.bot.banco.decidir_rank(ticket["canal_id"], True, staff.id):
            await responder(interaction, textos.RANK_JA_DECIDIDO)
            return
        try:
            await alvo.add_roles(cargo, reason=f"Kiza: promovido(a) a Helper por {staff}")
        except discord.HTTPException:
            await self.bot.banco.desfazer_decisao_rank(ticket["canal_id"])
            await responder(interaction, textos.RANK_ERRO_HIERARQUIA.format(cargo=cargo.mention))
            return
        await interaction.response.edit_message(view=None)
        await interaction.followup.send(
            textos.RANK_PROMOVIDO.format(autor=alvo.mention, staff=staff.mention),
            allowed_mentions=discord.AllowedMentions(users=[alvo]),
        )
        await self._log_rank(guild, ticket, staff, "aprovado")

    async def recusar(self, interaction: discord.Interaction) -> None:
        ticket = await self._ticket_da_staff(interaction, "rank", textos.RANK_SO_STAFF, textos.RANK_PROPRIO)
        if ticket is None:
            return
        staff = interaction.user
        if not await self.bot.banco.decidir_rank(ticket["canal_id"], False, staff.id):
            await responder(interaction, textos.RANK_JA_DECIDIDO)
            return
        autor = discord.Object(id=ticket["autor_id"])
        await interaction.response.edit_message(view=None)
        await interaction.followup.send(
            textos.RANK_RECUSADO.format(staff=staff.mention, autor=f"<@{autor.id}>"),
            allowed_mentions=discord.AllowedMentions(users=[autor]),
        )
        await self._log_rank(interaction.guild, ticket, staff, "recusado")  # type: ignore[arg-type]

    async def _log_rank(self, guild: discord.Guild, ticket, staff: discord.abc.User, resultado: str) -> None:
        valores, metas = await self.valores(guild, ticket["autor_id"]), await self.metas(guild.id)
        falta = faltando(valores, metas)
        requisitos = "todos cumpridos ✅" if not falta else f"faltava {self.texto_falta(falta, metas)}"
        e = embed(
            textos.RANK_LOG.format(resultado=resultado),
            f"<@{ticket['autor_id']}> • tíquete #{ticket['id']}\nPor {staff.mention}\nRequisitos: {requisitos}",
            config.COR_OK if resultado == "aprovado" else config.COR_AVISO,
        )
        await enviar_log(self.bot, guild, "logs_mod", embed=e)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Fidelidade(bot))
