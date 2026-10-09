"""Vida da toca: pergunta do dia, pérolas, drops, aniversários, Sábado da Raposa e a Kiza conversando.

Tudo com frases fixas (textos.py), sem IA. Um relógio de 1 minuto decide o que acontece em cada servidor;
o que precisa sobreviver a reinício (o que já foi postado hoje, quem já levou prêmio) fica no banco.
"""
from __future__ import annotations

import asyncio
import calendar
import logging
import random
import time
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import TZ, canal_da_funcao, embed, formatar_moeda, responder, sem_acento, truncar
from utils.permissoes import eh_membro, exigir_nivel
from utils.views import BaseView

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.vida")

HORA_ACORDA, HORA_DORME = 10, 23  # fora disso a Kiza não provoca nem solta drops
HORA_NIVER = 9
HORA_SABADO = 10
DROP_DURACAO = 120  # segundos para alguém pegar
DROP_INTERVALO_MIN = 3600  # entre um drop e outro
DROP_CHANCE_MINUTO = 1 / 30  # com chat ativo, ~1 drop a cada meia hora até bater o limite do dia
CHAT_ATIVO_SEG = 600  # houve mensagem de gente nos últimos 10 min
COOLDOWN_MENCAO = 30
COOLDOWN_CUMPRIMENTO = 900

CUMPRIMENTOS = (
    ("bom dia", textos.CONVERSA_BOM_DIA),
    ("boa tarde", textos.CONVERSA_BOA_TARDE),
    ("boa noite", textos.CONVERSA_BOA_NOITE),
)


def _ts_ultima_mensagem(canal: discord.TextChannel) -> Optional[float]:
    if canal.last_message_id is None:
        return None
    return discord.utils.snowflake_time(canal.last_message_id).timestamp()


class DropView(BaseView):
    """Botão de drop: o primeiro membro que clicar leva. A trava real é a chave única no banco."""

    def __init__(self, cog: "Vida", valor: int, titulo: str) -> None:
        super().__init__(timeout=DROP_DURACAO)
        self.cog = cog
        self.valor = valor
        self.titulo = titulo
        self.mensagem: Optional[discord.Message] = None
        self.pego = False

    @discord.ui.button(label=textos.DROP_BOTAO, emoji="🦊", style=discord.ButtonStyle.success)
    async def pegar(self, interaction: discord.Interaction, _botao: discord.ui.Button) -> None:
        membro = interaction.user
        if interaction.guild is None or not isinstance(membro, discord.Member) or interaction.message is None:
            return
        if not await eh_membro(self.cog.bot, membro):
            await responder(interaction, textos.DROP_SO_MEMBROS)
            return
        saldo = await self.cog.bot.banco.recompensar_uma_vez(
            interaction.guild.id, f"drop:{interaction.message.id}", membro.id, self.valor, "drop"
        )
        if saldo is None:
            await responder(interaction, textos.DROP_JA_PEGO)
            return
        self.pego = True
        self.stop()
        e = embed(self.titulo, textos.DROP_PEGO.format(mencao=membro.mention, valor=formatar_moeda(self.valor)), config.COR_OK)
        try:
            await interaction.response.edit_message(embed=e, view=None)
        except discord.HTTPException:
            pass

    async def on_timeout(self) -> None:
        if self.pego or self.mensagem is None:
            return
        try:
            await self.mensagem.edit(embed=embed(self.titulo, textos.DROP_EXPIROU), view=None)
        except discord.HTTPException:
            pass


class Vida(commands.Cog):
    aniversario = app_commands.Group(name="aniversario", description="Seu aniversário na toca", guild_only=True)
    aniversario_admin = app_commands.Group(
        name="aniversario-admin", description="Corrigir aniversários (só admins, com prova)", guild_only=True
    )

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._cooldowns: dict[tuple, float] = {}
        self._travas_perola: dict[int, asyncio.Lock] = {}
        self._ultima_humana: dict[int, float] = {}  # canal -> hora da última mensagem de gente (não de bot)

    async def cog_load(self) -> None:
        self.relogio.start()

    async def cog_unload(self) -> None:
        self.relogio.cancel()

    # ------------------------------------------------------------------ utilidades
    def _livre(self, chave: tuple, segundos: float) -> bool:
        """True (e marca) se a ação `chave` não aconteceu nos últimos `segundos`."""
        agora = time.monotonic()
        if agora - self._cooldowns.get(chave, -1e9) < segundos:
            return False
        self._cooldowns[chave] = agora
        return True

    async def _cfg(self, guild_id: int, chave: str) -> Optional[str]:
        return await self.bot.banco.get_config(guild_id, f"vida_{chave}")

    async def _set(self, guild_id: int, chave: str, valor: str) -> None:
        await self.bot.banco.set_config(guild_id, f"vida_{chave}", valor)

    # ------------------------------------------------------------------ relógio
    @tasks.loop(minutes=1)
    async def relogio(self) -> None:
        agora = datetime.now(TZ)
        for guild in list(self.bot.guilds):
            try:
                await self._tique(guild, agora)
            except Exception:  # um servidor com problema não para os outros
                log.exception("Falha no relógio da vida em %s", guild.id)

    @relogio.before_loop
    async def _antes(self) -> None:
        await self.bot.wait_until_ready()

    async def _tique(self, guild: discord.Guild, agora: datetime) -> None:
        chat = await canal_da_funcao(self.bot, guild, "chat")
        if not isinstance(chat, discord.TextChannel):
            return
        banco = self.bot.banco
        hoje = agora.date().isoformat()

        hora_qotd = await banco.ajuste(guild.id, "qotd_hora")
        if hora_qotd >= 0 and agora.hour == hora_qotd and await self._cfg(guild.id, "qotd_data") != hoje:
            await self._set(guild.id, "qotd_data", hoje)  # marca antes de postar: falhar é melhor que duplicar
            await self.postar_pergunta(guild, chat, hoje)

        if agora.hour == HORA_NIVER and await self._cfg(guild.id, "niver_data") != hoje:
            await self._set(guild.id, "niver_data", hoje)
            await self.comemorar_aniversarios(guild, chat, agora.date())

        sabado = agora.weekday() == 5 and await banco.ajuste(guild.id, "sabado_mult") > 1
        if sabado and agora.hour == HORA_SABADO and await self._cfg(guild.id, "sabado_data") != hoje:
            await self._set(guild.id, "sabado_data", hoje)
            await self._enviar(chat, textos.SABADO_ANUNCIO.format(moeda=config.MOEDA_NOME))

        if not HORA_ACORDA <= agora.hour < HORA_DORME:
            return
        await self._talvez_provocar(guild, chat)
        await self._talvez_drop(guild, chat, hoje, sabado)

    async def _enviar(self, canal: discord.abc.Messageable, conteudo: str, **kwargs) -> Optional[discord.Message]:
        kwargs.setdefault("allowed_mentions", discord.AllowedMentions.none())
        try:
            return await canal.send(conteudo, **kwargs)
        except discord.HTTPException:
            log.warning("Falha ao enviar mensagem da vida", exc_info=True)
            return None

    # ------------------------------------------------------------------ pergunta do dia
    async def postar_pergunta(self, guild: discord.Guild, chat: discord.TextChannel, hoje: str) -> None:
        perguntas = textos.PERGUNTAS_DO_DIA
        ordem = random.Random(guild.id).sample(range(len(perguntas)), len(perguntas))  # ordem fixa por servidor
        indice = int(await self._cfg(guild.id, "qotd_idx") or 0)
        await self._set(guild.id, "qotd_idx", str(indice + 1))
        pergunta = perguntas[ordem[indice % len(perguntas)]]
        premio = await self.bot.banco.ajuste(guild.id, "qotd_premio")

        e = embed(textos.QOTD_TITULO, textos.QOTD_DESC.format(pergunta=pergunta, premio=formatar_moeda(premio)))
        try:
            msg = await chat.send(embed=e)
            data_br = datetime.fromisoformat(hoje).strftime("%d/%m")
            topico = await msg.create_thread(name=textos.QOTD_TOPICO.format(data=data_br), auto_archive_duration=1440)
        except discord.HTTPException:
            log.warning("Falha ao postar a pergunta do dia em %s", guild.id, exc_info=True)
            return
        await self._set(guild.id, "qotd_topico", str(topico.id))

    async def _pagar_resposta(self, mensagem: discord.Message, membro: discord.Member) -> None:
        guild = membro.guild
        topico_id = await self._cfg(guild.id, "qotd_topico")
        if topico_id != str(mensagem.channel.id) or not await eh_membro(self.bot, membro):
            return
        premio = await self.bot.banco.ajuste(guild.id, "qotd_premio")
        if premio <= 0:
            return
        saldo = await self.bot.banco.recompensar_uma_vez(guild.id, f"qotd:{topico_id}:{membro.id}", membro.id, premio, "qotd")
        if saldo is not None:
            try:
                await mensagem.add_reaction(config.MOEDA_EMOJI)
            except discord.HTTPException:
                pass

    # ------------------------------------------------------------------ provocar chat parado
    async def _talvez_provocar(self, guild: discord.Guild, chat: discord.TextChannel) -> None:
        banco = self.bot.banco
        intervalo_h = await banco.ajuste(guild.id, "provocar_h")
        ultima = _ts_ultima_mensagem(chat)
        if intervalo_h <= 0 or ultima is None:
            return
        agora = time.time()
        if agora - ultima < await banco.ajuste(guild.id, "chat_parado_min") * 60:
            return
        if agora - float(await self._cfg(guild.id, "provocacao_ts") or 0) < intervalo_h * 3600:
            return
        await self._set(guild.id, "provocacao_ts", str(int(agora)))
        await self._enviar(chat, random.choice(textos.PROVOCACOES))

    # ------------------------------------------------------------------ drops
    async def _talvez_drop(self, guild: discord.Guild, chat: discord.TextChannel, hoje: str, sabado: bool) -> None:
        banco = self.bot.banco
        mult = await banco.ajuste(guild.id, "sabado_mult") if sabado else 1
        limite = await banco.ajuste(guild.id, "drop_max_dia") * mult
        dia, _, feitos = (await self._cfg(guild.id, "drops_dia") or "").partition(":")
        feitos_hoje = int(feitos) if dia == hoje and feitos.isdigit() else 0
        if feitos_hoje >= limite:
            return
        agora = time.time()
        if agora - self._ultima_humana.get(chat.id, 0) > CHAT_ATIVO_SEG:
            return  # drop em chat vazio ninguém vê (e mensagem da própria Kiza não conta)
        if agora - float(await self._cfg(guild.id, "drop_ts") or 0) < DROP_INTERVALO_MIN / mult:
            return
        if random.random() >= DROP_CHANCE_MINUTO * mult:
            return
        await self._set(guild.id, "drops_dia", f"{hoje}:{feitos_hoje + 1}")
        await self._set(guild.id, "drop_ts", str(int(agora)))
        await self.soltar_drop(guild, chat, sabado)

    async def soltar_drop(self, guild: discord.Guild, chat: discord.TextChannel, sabado: bool = False) -> None:
        banco = self.bot.banco
        minimo, maximo = await banco.ajuste(guild.id, "drop_min"), await banco.ajuste(guild.id, "drop_max")
        valor = random.randint(min(minimo, maximo), max(minimo, maximo))
        titulo = textos.DROP_TITULO
        if sabado:
            valor *= await banco.ajuste(guild.id, "sabado_mult")
            titulo = textos.DROP_TITULO_SABADO
        view = DropView(self, valor, titulo)
        try:
            view.mensagem = await chat.send(
                embed=embed(titulo, textos.DROP_DESC.format(valor=formatar_moeda(valor)), config.COR_AVISO), view=view
            )
        except discord.HTTPException:
            log.warning("Falha ao soltar drop em %s", guild.id, exc_info=True)

    # ------------------------------------------------------------------ aniversários
    async def comemorar_aniversarios(self, guild: discord.Guild, chat: discord.TextChannel, dia: date) -> None:
        banco = self.bot.banco
        ids = await banco.aniversariantes(guild.id, dia.day, dia.month)
        if dia.month == 2 and dia.day == 28 and not calendar.isleap(dia.year):
            ids += await banco.aniversariantes(guild.id, 29, 2)  # quem é de 29/02 comemora no dia 28
        membros = [m for m in (guild.get_member(i) for i in ids) if m is not None]
        if not membros:
            return
        premio = await banco.ajuste(guild.id, "niver_premio")
        for m in membros:
            if premio > 0:
                await banco.recompensar_uma_vez(guild.id, f"niver:{dia.year}:{m.id}", m.id, premio, "aniversario")
        await self._enviar(
            chat,
            textos.NIVER_PARABENS.format(mencoes=" ".join(m.mention for m in membros), premio=formatar_moeda(premio)),
            allowed_mentions=discord.AllowedMentions(users=membros),
        )

    @staticmethod
    def _data_valida(dia: int, mes: int) -> bool:
        try:
            date(2024, mes, dia)  # 2024 é bissexto: aceita 29/02
        except ValueError:
            return False
        return True

    @aniversario.command(name="definir", description="Marca o dia do seu aniversário (só uma vez!).")
    @app_commands.describe(dia="Dia (1 a 31)", mes="Mês (1 a 12)")
    async def aniversario_definir(
        self,
        interaction: discord.Interaction,
        dia: app_commands.Range[int, 1, 31],
        mes: app_commands.Range[int, 1, 12],
    ) -> None:
        if not self._data_valida(dia, mes):
            await responder(interaction, textos.NIVER_DATA_INVALIDA)
            return
        banco = self.bot.banco
        # Uma vez só: sem isso, dava para trocar a data todo dia e ganhar o presente de novo.
        if not await banco.marcar_aniversario(interaction.guild_id, interaction.user.id, dia, mes):  # type: ignore[arg-type]
            atual = await banco.obter_aniversario(interaction.guild_id, interaction.user.id)  # type: ignore[arg-type]
            d, m = atual or (dia, mes)
            await responder(interaction, textos.NIVER_JA_DEFINIDO.format(dia=d, mes=m))
            return
        await responder(interaction, textos.NIVER_DEFINIDO.format(dia=dia, mes=mes))

    @aniversario_admin.command(name="definir", description="Corrige o aniversário de alguém (peça uma prova antes).")
    @app_commands.describe(membro="De quem", dia="Dia (1 a 31)", mes="Mês (1 a 12)")
    @exigir_nivel(3)
    async def aniversario_admin_definir(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        dia: app_commands.Range[int, 1, 31],
        mes: app_commands.Range[int, 1, 12],
    ) -> None:
        if not self._data_valida(dia, mes):
            await responder(interaction, textos.NIVER_DATA_INVALIDA)
            return
        await self.bot.banco.definir_aniversario(interaction.guild_id, membro.id, dia, mes)  # type: ignore[arg-type]
        log.info("Aniversário de %s alterado para %02d/%02d por %s", membro.id, dia, mes, interaction.user.id)
        await responder(interaction, textos.NIVER_ADMIN_OK.format(alvo=membro.mention, dia=dia, mes=mes))

    @aniversario_admin.command(name="remover", description="Apaga o aniversário de alguém (a pessoa pode marcar de novo).")
    @app_commands.describe(membro="De quem")
    @exigir_nivel(3)
    async def aniversario_admin_remover(self, interaction: discord.Interaction, membro: discord.Member) -> None:
        await self.bot.banco.definir_aniversario(interaction.guild_id, membro.id, None, None)  # type: ignore[arg-type]
        log.info("Aniversário de %s removido por %s", membro.id, interaction.user.id)
        await responder(interaction, textos.NIVER_ADMIN_REMOVIDO.format(alvo=membro.mention))

    @aniversario.command(name="ver", description="Mostra o aniversário que você marcou.")
    async def aniversario_ver(self, interaction: discord.Interaction) -> None:
        data = await self.bot.banco.obter_aniversario(interaction.guild_id, interaction.user.id)  # type: ignore[arg-type]
        texto = textos.NIVER_SEU.format(dia=data[0], mes=data[1]) if data else textos.NIVER_SEM
        await responder(interaction, texto)

    @aniversario.command(name="lista", description="Os próximos aniversários da toca.")
    @app_commands.checks.cooldown(1, 10.0)
    async def aniversario_lista(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        hoje = datetime.now(TZ).date()
        todos = [(uid, d, m) for uid, d, m in await self.bot.banco.todos_aniversarios(guild.id) if guild.get_member(uid)]
        if not todos:
            await responder(interaction, textos.NIVER_LISTA_VAZIA)
            return
        # gira o calendário para começar em hoje
        todos.sort(key=lambda x: ((x[2], x[1]) < (hoje.month, hoje.day), x[2], x[1]))
        linhas = [f"`{d:02d}/{m:02d}` <@{uid}>" for uid, d, m in todos[:15]]
        await responder(interaction, embed=embed(textos.NIVER_LISTA_TITULO, "\n".join(linhas)), ephemeral=False)

    # ------------------------------------------------------------------ pérolas
    @commands.Cog.listener()
    async def on_raw_reaction_add(self, evento: discord.RawReactionActionEvent) -> None:
        await self._atualizar_perola(evento)

    @commands.Cog.listener()
    async def on_raw_reaction_remove(self, evento: discord.RawReactionActionEvent) -> None:
        await self._atualizar_perola(evento, pode_criar=False)

    async def _atualizar_perola(self, evento: discord.RawReactionActionEvent, pode_criar: bool = True) -> None:
        if evento.guild_id is None or str(evento.emoji) != textos.PEROLAS_EMOJI:
            return
        guild = self.bot.get_guild(evento.guild_id)
        if guild is None:
            return
        mural = await canal_da_funcao(self.bot, guild, "perolas")
        if not isinstance(mural, discord.TextChannel) or evento.channel_id == mural.id:
            return
        origem = guild.get_channel_or_thread(evento.channel_id)
        if not isinstance(origem, (discord.TextChannel, discord.Thread)):
            return
        trava = self._travas_perola.setdefault(guild.id, asyncio.Lock())
        async with trava:
            try:
                msg = await origem.fetch_message(evento.message_id)
            except discord.HTTPException:
                return
            if msg.author.bot:
                return
            reacao = discord.utils.find(lambda r: str(r.emoji) == textos.PEROLAS_EMOJI, msg.reactions)
            n = 0
            if reacao is not None:
                n = sum(1 async for u in reacao.users() if not u.bot and u.id != msg.author.id)  # sem auto-estrela
            cabecalho = textos.PEROLA_CABECALHO.format(emoji=textos.PEROLAS_EMOJI, n=n, canal=origem.mention)
            banco = self.bot.banco
            existente = await banco.obter_perola(guild.id, msg.id)
            if existente:
                try:
                    perola = await mural.fetch_message(existente)
                    await perola.edit(content=cabecalho)
                except discord.HTTPException:
                    pass
                return
            if not pode_criar or n < await banco.ajuste(guild.id, "perolas_min"):
                return
            try:
                perola = await mural.send(
                    cabecalho, embed=self._embed_perola(msg), allowed_mentions=discord.AllowedMentions.none()
                )
            except discord.HTTPException:
                log.warning("Falha ao postar pérola em %s", guild.id, exc_info=True)
                return
            await banco.registrar_perola(guild.id, msg.id, perola.id)

    @staticmethod
    def _embed_perola(msg: discord.Message) -> discord.Embed:
        e = embed(None, truncar(msg.content, 4000) or None, 0xF5C542)
        e.set_author(name=msg.author.display_name, icon_url=msg.author.display_avatar.url)
        e.timestamp = msg.created_at
        imagem = next((a for a in msg.attachments if (a.content_type or "").startswith("image/")), None)
        if imagem is not None:
            e.set_image(url=imagem.url)
        elif msg.embeds and msg.embeds[0].image:
            e.set_image(url=msg.embeds[0].image.url)
        e.add_field(name="​", value=f"[{textos.PEROLA_LINK}]({msg.jump_url})", inline=False)
        return e

    # ------------------------------------------------------------------ conversa e respostas da pergunta do dia
    @commands.Cog.listener()
    async def on_message(self, mensagem: discord.Message) -> None:
        if mensagem.guild is None or mensagem.author.bot or not isinstance(mensagem.author, discord.Member):
            return
        membro = mensagem.author
        self._ultima_humana[mensagem.channel.id] = time.time()
        if isinstance(mensagem.channel, discord.Thread):
            await self._pagar_resposta(mensagem, membro)
        banco = self.bot.banco
        if await banco.ajuste(mensagem.guild.id, "conversa") != 1:
            return
        texto = sem_acento(mensagem.content)
        eu = self.bot.user
        if eu is not None and eu in mensagem.mentions and not mensagem.mention_everyone:
            cerebro = self.bot.get_cog("Cerebro")
            if cerebro is not None and await cerebro.ativo(mensagem.guild.id):
                return  # o cérebro conversa de verdade; as frases fixas ficam de reserva dentro dele
            if not self._livre(("mencao", membro.id), COOLDOWN_MENCAO):
                return
            await self._responder(mensagem, textos.resposta_fixa(mensagem.clean_content))
            return
        chat = await canal_da_funcao(self.bot, mensagem.guild, "chat")
        if chat is None or mensagem.channel.id != chat.id:
            return
        for gatilho, frases in CUMPRIMENTOS:
            if texto.startswith(gatilho) and self._livre(("cumprimento", chat.id, gatilho), COOLDOWN_CUMPRIMENTO):
                await self._responder(mensagem, random.choice(frases))
                return

    async def _responder(self, mensagem: discord.Message, texto: str) -> None:
        try:
            async with mensagem.channel.typing():
                await asyncio.sleep(min(2.5, 0.6 + len(texto) / 60))  # "digitando..." deixa mais natural
            await mensagem.reply(texto, mention_author=False, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            pass


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Vida(bot))
