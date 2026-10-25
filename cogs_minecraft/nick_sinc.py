"""Apelido do Discord igual ao do jogo: `[TAG] Apelido`.

O jogo manda `cla` (tag, texto puro) e `apelido` (o que a pessoa usa no jogo, "" se não tem) em todo /mc/sync. A ponte entrega
aqui (`receber`); este cog calcula o apelido, guarda o original e muda o membro numa fila lenta (uma mudança a cada 2 s no
servidor e no mínimo `nick_sinc_intervalo_seg` entre duas mudanças da mesma pessoa), fora do loop da requisição.

Regras:
* Nunca mexe no dono do servidor, em bots nem em quem tem cargo igual ou acima do meu (o Discord recusa).
* Sem a permissão Gerenciar Apelidos, ou se o Discord recusar (Forbidden): um aviso por pessoa no log e a sincronia dela
  fica suspensa por 24 h.
* O apelido de antes fica guardado (nick_sinc.original) e volta quando a pessoa desvincula a conta, desliga com
  `/apelido-discord desligar` ou o dono desliga a sincronia no /setup. Se a pessoa já tinha mudado o apelido sozinha depois
  de mim, não desfaço a escolha dela: só esqueço o que guardei.
* Anti-briga: se a pessoa mudar o apelido sozinha no Discord, só registro no log. Só volto a mexer quando os dados do jogo
  mudarem (clã novo, saiu do clã, outro apelido) ou no próximo login dela no jogo.
"""
from __future__ import annotations

import logging
import re
import time
import unicodedata
from typing import TYPE_CHECKING, Any, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import textos
from utils.helpers import responder
from utils.permissoes import checar_membro

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.minecraft")

MAX_NICK = 32  # limite do Discord
TAG_MAX = 8
INTERVALO_GLOBAL = 2.0  # segundos entre duas mudanças de apelido no servidor inteiro
SUSPENSAO = 24 * 3600
COR_JOGO = re.compile(r"§.")
LINK = re.compile(r"\S*(?:://|www\.)\S*|\S+\.(?:com|net|org|gg|io|br|me|xyz|app|dev|tv)\b\S*", re.IGNORECASE)
MOTIVO_AUDITORIA = "Apelido igual ao do Minecraft"
MOTIVO_RESTAURAR = "Apelido de antes (sincronia com o Minecraft desligada)"


# ------------------------------------------------------------------ funções puras
def limpar_parte(texto: Any) -> str:
    """Texto do jogo para o apelido: sem códigos de cor, controle, menções (@), links; espaços únicos."""
    bruto = COR_JOGO.sub("", str(texto if texto is not None else ""))
    bruto = LINK.sub(" ", bruto).replace("@", "")
    bruto = "".join(c if not unicodedata.category(c).startswith("C") else " " for c in bruto)
    return " ".join(bruto.split())


def abreviar(texto: str, limite: int) -> str:
    """Corta com reticências para caber em `limite` caracteres."""
    if limite <= 0:
        return ""
    if len(texto) <= limite:
        return texto
    return texto[: limite - 1].rstrip() + "…" if limite > 1 else texto[:1]


def montar_apelido(cla: Any, apelido: Any, nome_mc: Any, sem_cla: bool = True) -> str:
    """`[TAG] Apelido` (a tag nunca é cortada; o apelido é abreviado) em até 32 caracteres. Sem apelido, vale o nome da conta.

    Sem clã: só o apelido/nome; com `sem_cla` falso devolve "" (= não mexe em quem não tem clã). "" também se não sobrou nada."""
    tag = limpar_parte(cla).replace(" ", "").upper()[:TAG_MAX]
    base = limpar_parte(apelido) or limpar_parte(nome_mc)
    if not base:
        return ""
    if not tag:
        return abreviar(base, MAX_NICK) if sem_cla else ""
    prefixo = f"[{tag}] "
    return prefixo + abreviar(base, MAX_NICK - len(prefixo))


def motivo_bloqueio(guild: Any, membro: Any) -> Optional[str]:
    """Por que eu não posso mudar o apelido desta pessoa: 'bot', 'dono', 'permissao', 'cargo' (ou None se posso)."""
    if getattr(membro, "bot", False):
        return "bot"
    if membro.id == getattr(guild, "owner_id", None):
        return "dono"
    eu = guild.me
    if not eu.guild_permissions.manage_nicknames:
        return "permissao"
    if membro.top_role >= eu.top_role:
        return "cargo"
    return None


# ------------------------------------------------------------------ cog
class NickSinc(commands.Cog):
    grupo = app_commands.Group(name="apelido-discord", description="Seu apelido no Discord igual ao do Minecraft.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._fila: dict[int, tuple[int, float, str]] = {}  # user_id -> (guild_id, monotonic a partir de quando, "aplicar" | "restaurar")
        self._ultimo: dict[int, float] = {}  # user_id -> monotonic da última mudança feita
        self._login: set[int] = set()  # quem entrou no jogo: a próxima soma reaplica mesmo sem mudança nos dados
        self._avisou: set[int] = set()  # quem já teve o erro de permissão registrado no log
        self._mexendo: dict[int, float] = {}  # quem eu estou mudando agora (o on_member_update é meu)

    async def cog_load(self) -> None:
        self.trabalhar.start()
        self.varrer.start()

    async def cog_unload(self) -> None:
        self.trabalhar.cancel()
        self.varrer.cancel()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # -------------------------------------------------------------- configuração
    async def _ligado(self, guild_id: int) -> bool:
        return bool(await self.bot.banco.ajuste(guild_id, "nick_sinc_ligado"))

    async def _sem_cla(self, guild_id: int) -> bool:
        return bool(await self.bot.banco.ajuste(guild_id, "nick_sinc_sem_cla"))

    # -------------------------------------------------------------- entrada (a ponte chama)
    def no_login(self, user_id: int) -> None:
        """A pessoa entrou no jogo: a próxima soma reaplica o apelido (mesmo que ela o tenha mudado sozinha)."""
        self._login.add(user_id)

    async def receber(self, guild_id: int, user_id: int, cla: Any, apelido: Any) -> bool:
        """Dados do jogo vindos do /mc/sync. Enfileira se mudaram (ou se é o primeiro depois do login). True se enfileirou."""
        banco = self.bot.banco
        cla_limpo = limpar_parte(cla).replace(" ", "").upper()[:TAG_MAX]
        apelido_limpo = limpar_parte(apelido)[:MAX_NICK]
        mudou = await banco.nick_guardar_dados(guild_id, user_id, cla_limpo, apelido_limpo)
        login = user_id in self._login
        if not mudou and not login:
            return False
        self._login.discard(user_id)
        if not await self._ligado(guild_id):
            return False
        linha = await banco.nick_linha(guild_id, user_id)
        if linha is not None and (not linha["ligado"] or int(linha["suspenso_ate"]) > time.time()):
            return False
        await self.enfileirar(guild_id, user_id)
        return True

    async def enfileirar(self, guild_id: int, user_id: int, acao: str = "aplicar", agora: Optional[float] = None) -> None:
        agora = time.monotonic() if agora is None else agora
        due = agora
        if acao == "aplicar":
            intervalo = await self.bot.banco.ajuste(guild_id, "nick_sinc_intervalo_seg")
            due = max(agora, self._ultimo.get(user_id, -1e12) + intervalo)
        self._fila[user_id] = (guild_id, due, acao)

    async def aplicar_todos(self, guild_id: int) -> int:
        """Enfileira todo mundo que tem a conta ligada e dados do jogo. A fila anda devagar (um a cada 2 s). Devolve quantos."""
        if not await self._ligado(guild_id):
            return 0
        n = 0
        for linha in await self.bot.banco.nick_com_dados(guild_id):
            await self.enfileirar(guild_id, linha["user_id"])
            n += 1
        return n

    async def ao_desvincular(self, guild: discord.Guild, user_id: int) -> None:
        """A conta foi desvinculada: devolve o apelido de antes na hora e sai da fila."""
        self._fila.pop(user_id, None)
        self._login.discard(user_id)
        membro = guild.get_member(user_id)
        if membro is not None:
            await self._restaurar(guild, membro)

    # -------------------------------------------------------------- fila
    async def processar_proximo(self, agora: Optional[float] = None) -> bool:
        """Faz o próximo item da fila que já pode (um por vez). True se processou algum."""
        agora = time.monotonic() if agora is None else agora
        prontos = [(due, uid) for uid, (_gid, due, _acao) in self._fila.items() if due <= agora]
        if not prontos:
            return False
        _due, user_id = min(prontos)
        guild_id, _due, acao = self._fila.pop(user_id)
        try:
            await self._processar(guild_id, user_id, acao)
        except Exception:
            log.exception("Erro na sincronia de apelido de %s", user_id)
        return True

    @tasks.loop(seconds=INTERVALO_GLOBAL)
    async def trabalhar(self) -> None:
        await self.processar_proximo()

    @trabalhar.before_loop
    async def _antes_de_trabalhar(self) -> None:
        await self.bot.wait_until_ready()

    @tasks.loop(minutes=2)
    async def varrer(self) -> None:
        """Dono desligou a sincronia: todo apelido que eu apliquei volta ao de antes (aos poucos)."""
        try:
            for guild_id in await self.bot.banco.nick_guilds_com_aplicado():
                if await self._ligado(guild_id):
                    continue
                for linha in await self.bot.banco.nick_com_aplicado(guild_id):
                    await self.enfileirar(guild_id, linha["user_id"], "restaurar")
        except Exception:
            log.exception("Erro ao varrer apelidos")

    @varrer.before_loop
    async def _antes_de_varrer(self) -> None:
        await self.bot.wait_until_ready()

    # -------------------------------------------------------------- aplicar e restaurar
    async def _processar(self, guild_id: int, user_id: int, acao: str) -> None:
        guild = self.bot.get_guild(guild_id)
        membro = guild.get_member(user_id) if guild is not None else None
        if guild is None or membro is None:
            return
        banco = self.bot.banco
        linha = await banco.nick_linha(guild_id, user_id)
        if acao == "restaurar" or not await self._ligado(guild_id):
            await self._restaurar(guild, membro)
            return
        if linha is not None and (not linha["ligado"] or int(linha["suspenso_ate"]) > time.time()):
            return
        vinculo = await banco.mc_vinculo_de_usuario(guild_id, user_id)
        if vinculo is None:
            await self._restaurar(guild, membro)
            return
        desejado = montar_apelido(
            linha["cla"] if linha else "", linha["apelido"] if linha else "", vinculo["mc_nome"], await self._sem_cla(guild_id)
        )
        if not desejado:  # sem clã e "não mexe em quem não tem clã" (ou nada para mostrar)
            await self._restaurar(guild, membro)
            return
        bloqueio = motivo_bloqueio(guild, membro)
        if bloqueio is not None:
            log.debug("Apelido de %s não muda (%s)", membro, bloqueio)
            return
        guardou = bool(linha["guardou"]) if linha else False
        if membro.nick == desejado:
            if guardou and linha["aplicado"] != desejado:
                await banco.nick_registrar_aplicado(guild_id, user_id, desejado, None)
            return
        original = membro.nick
        self._mexendo[user_id] = time.monotonic() + 15
        try:
            await membro.edit(nick=desejado, reason=MOTIVO_AUDITORIA)
        except discord.Forbidden:
            await self._sem_permissao(guild_id, user_id, membro)
            return
        except discord.HTTPException:
            log.warning("Não consegui mudar o apelido de %s", membro, exc_info=True)
            return
        self._ultimo[user_id] = time.monotonic()
        await banco.nick_registrar_aplicado(guild_id, user_id, desejado, original)

    async def _sem_permissao(self, guild_id: int, user_id: int, membro: Any) -> None:
        """O Discord recusou: registra UMA vez por pessoa e para de tentar nela por 24 h."""
        if user_id not in self._avisou:
            self._avisou.add(user_id)
            log.warning("Sem permissão para mudar o apelido de %s (%s): sincronia dela pausada por 24 h", membro, user_id)
        await self.bot.banco.nick_suspender(guild_id, user_id, int(time.time()) + SUSPENSAO)

    async def _restaurar(self, guild: Any, membro: Any) -> bool:
        """Devolve o apelido de antes. Só desfaz se o apelido atual ainda é o que eu pus (não passo por cima de escolha da pessoa)."""
        banco = self.bot.banco
        linha = await banco.nick_linha(guild.id, membro.id)
        if linha is None or not linha["guardou"]:
            return False
        if membro.nick == linha["aplicado"] and membro.nick != linha["original"]:
            self._mexendo[membro.id] = time.monotonic() + 15
            try:
                await membro.edit(nick=linha["original"], reason=MOTIVO_RESTAURAR)
            except discord.HTTPException:
                if membro.id not in self._avisou:
                    self._avisou.add(membro.id)
                    log.warning("Não consegui devolver o apelido de %s", membro, exc_info=True)
        await banco.nick_limpar_aplicado(guild.id, membro.id)
        return True

    # -------------------------------------------------------------- só registra (anti-briga)
    @commands.Cog.listener()
    async def on_member_update(self, antes: discord.Member, depois: discord.Member) -> None:
        if antes.nick == depois.nick or time.monotonic() < self._mexendo.get(depois.id, 0.0):
            return
        linha = await self.bot.banco.nick_linha(depois.guild.id, depois.id)
        if linha is not None and linha["guardou"] and depois.nick != linha["aplicado"]:
            log.info("%s mudou o apelido sozinho(a): não mexo até os dados do jogo mudarem ou o próximo login", depois)

    # -------------------------------------------------------------- comandos
    async def descricao_estado(self, guild: discord.Guild, user_id: int) -> tuple[str, str, str, str]:
        banco = self.bot.banco
        linha = await banco.nick_linha(guild.id, user_id)
        vinculo = await banco.mc_vinculo_de_usuario(guild.id, user_id)
        if not await self._ligado(guild.id):
            estado = textos.NICK_VER_ESTADO_SERVIDOR_OFF
        elif linha is not None and not linha["ligado"]:
            estado = textos.NICK_VER_ESTADO_DESLIGADA
        elif linha is not None and int(linha["suspenso_ate"]) > time.time():
            estado = textos.NICK_VER_ESTADO_SUSPENSA
        else:
            estado = textos.NICK_VER_ESTADO_LIGADA
        if vinculo is None or linha is None:
            return estado, textos.NICK_VER_NADA, textos.NICK_VER_NADA, textos.NICK_VER_SEM
        jogo = " ".join(p for p in (f"[{linha['cla']}]" if linha["cla"] else "", linha["apelido"] or vinculo["mc_nome"]) if p)
        ficaria = montar_apelido(linha["cla"], linha["apelido"], vinculo["mc_nome"], await self._sem_cla(guild.id)) or textos.NICK_VER_NAO_MEXE
        original = (linha["original"] or textos.NICK_VER_SEM) if linha["guardou"] else textos.NICK_VER_SEM
        return estado, jogo, ficaria, original

    @grupo.command(name="ver", description="Mostra como está a sincronia do seu apelido com o Minecraft.")
    async def ver(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        estado, jogo, ficaria, original = await self.descricao_estado(guild, interaction.user.id)
        e = discord.Embed(
            title=textos.NICK_VER_TITULO,
            description=textos.NICK_VER_LINHAS.format(
                estado=estado, jogo=discord.utils.escape_markdown(jogo), ficaria=discord.utils.escape_markdown(ficaria),
                original=discord.utils.escape_markdown(original),
            ),
            color=0xE67E22,
        )
        await responder(interaction, embed=e, ephemeral=True)

    @grupo.command(name="desligar", description="Para de mexer no seu apelido e devolve o que você tinha antes.")
    async def desligar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        linha = await self.bot.banco.nick_linha(guild.id, interaction.user.id)
        if linha is not None and not linha["ligado"]:
            await responder(interaction, textos.NICK_DESLIGAR_JA, ephemeral=True)
            return
        await self.bot.banco.nick_definir_ligado(guild.id, interaction.user.id, False)
        self._fila.pop(interaction.user.id, None)
        await self._restaurar(guild, interaction.user)  # type: ignore[arg-type]
        await responder(interaction, textos.NICK_DESLIGAR_OK, ephemeral=True)

    @grupo.command(name="ligar", description="Volta a deixar meu apelido igual ao do Minecraft.")
    async def ligar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        if await banco.mc_vinculo_de_usuario(guild.id, interaction.user.id) is None:
            await responder(interaction, textos.NICK_LIGAR_SEM_CONTA, ephemeral=True)
            return
        await banco.nick_definir_ligado(guild.id, interaction.user.id, True)
        await banco.nick_suspender(guild.id, interaction.user.id, 0)
        self._avisou.discard(interaction.user.id)
        if await self._ligado(guild.id):
            await self.enfileirar(guild.id, interaction.user.id)
        await responder(interaction, textos.NICK_LIGAR_OK, ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(NickSinc(bot))
