"""Presença da Kiza: ela posta sozinha para dar vida à toca.

* Mídias (1x por dia): um desenho fofo que ela "fez", com legenda de quem acabou de rabiscar.
* Publicações (a cada 2 dias): um convite para o pessoal mostrar construções, prints e vídeos.
* Lore (1x por mês): um capítulo novo da história da Kiza, citando amigos novos da toca.

Quem escreve é o cérebro (cog `cerebro`): sem chave ou com o cérebro desligado, nada é postado.
O relógio roda de 5 em 5 minutos; a hora de cada post é sorteada por dia (mas fixa para o dia, então um reinício não
muda nem duplica nada) e a data do último post fica no banco.
"""
from __future__ import annotations

import io
import logging
import random
from datetime import datetime
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from cogs.cerebro import APARENCIA
from utils import rabisco
from utils.helpers import TZ, canal_da_funcao, embed, responder, sem_acento, truncar
from utils.permissoes import exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza
    from cogs.cerebro import Cerebro

log = logging.getLogger("kiza.presenca")

MIDIA_JANELA = (14, 21)  # hora (BRT) em que o desenho do dia pode sair: entre 14h e 21h
PUBLICACOES_JANELA = (11, 19)
PUBLICACOES_A_CADA_DIAS = 2
LORE_A_PARTIR_DA_HORA = 12
TENTATIVAS_POR_DIA = 3  # se a IA falhar, tenta de novo no próximo tique (até aqui)

TEMAS_MIDIA = [
    "um desenho seu e da sua mãe (a kitsune de nove caudas) fazendo algo juntas",
    "um desenho seu com um amigo da toca construindo uma casinha de blocos",
    "a toca do VULPUS à noite, com lanternas e estrelas",
    "você comendo seu lanchinho favorito, toda feliz",
    "um creeper bem fofo que você encontrou",
    "você dormindo enrolada na própria cauda no meio da floresta de blocos",
    "você pescando num lago de blocos, esperando o peixe",
    "você e a sua mãe vendo o pôr do sol do alto de uma colina",
    "sua versão chibi (bem pequenininha e fofa) acenando",
    "uma casa na árvore que você sonhou em construir",
    "você olhando as estrelas com a cauda de cobertor",
    "você com um pet imaginário (um filhote de raposa branca)",
    "o seu cantinho preferido da toca, bem aconchegante",
    "um dia de chuva na toca com você de guarda-chuva",
]

GANCHOS_PUBLICACOES = [
    "mostrar a construção favorita da semana",
    "mandar o print do momento mais engraçado no servidor",
    "mostrar um cantinho escondido do mapa que ninguém conhece",
    "mostrar a maior gambiarra de redstone que já fizeram",
    "mostrar um tour rápido pela própria base",
    "mandar o pior fail que já aconteceu no Minecraft",
    "mostrar o pôr do sol mais bonito que acharam no jogo",
    "mostrar o item mais raro que já conseguiram",
]

SISTEMA_TAREFA = (
    "Você é a Kiza Misuchi, 18 anos, mascote do servidor VULPUS (Minecraft). Escreva como ela: português brasileiro de "
    "chat, minúsculas, fofa, expressiva, poucos emojis (no máximo 1 ou 2), nada de formatação de IA nem de 'olá pessoal'. "
    "O servidor tem menores: tudo sempre fofo e leve. Você NÃO marca ninguém (@) e não promete Caudas, cargos ou prêmios. "
    + APARENCIA
)


def minuto_do_dia(guild_id: int, dia: str, tag: str, hora_ini: int, hora_fim: int) -> int:
    """Minuto do dia (0-1439) sorteado para `tag`, fixo para (servidor, dia): reiniciar o bot não muda o horário."""
    rng = random.Random(f"{guild_id}:{dia}:{tag}")
    return rng.randrange(hora_ini * 60, hora_fim * 60)


def ids_candidatos(valor: str) -> list[int]:
    return [int(p) for p in valor.split(",") if p.strip().isdigit()]


class Presenca(commands.Cog):
    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        self.relogio.start()

    async def cog_unload(self) -> None:
        self.relogio.cancel()

    # ------------------------------------------------------------------ utilidades
    def _cerebro(self) -> Optional["Cerebro"]:
        return self.bot.get_cog("Cerebro")  # type: ignore[return-value]

    async def _cfg(self, guild_id: int, chave: str) -> str:
        return await self.bot.banco.get_config(guild_id, f"presenca_{chave}") or ""

    async def _set(self, guild_id: int, chave: str, valor: str) -> None:
        await self.bot.banco.set_config(guild_id, f"presenca_{chave}", valor)

    async def _tentativa(self, guild_id: int, tipo: str, chave_dia: str) -> bool:
        """Conta uma tentativa para `chave_dia`. False quando já gastou todas (ou já postou)."""
        dia, _, n = (await self._cfg(guild_id, f"{tipo}_tent")).partition(":")
        feitas = int(n) if dia == chave_dia and n.isdigit() else 0
        if feitas >= TENTATIVAS_POR_DIA:
            return False
        await self._set(guild_id, f"{tipo}_tent", f"{chave_dia}:{feitas + 1}")
        return True

    async def _canal_midia(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        for cid in ids_candidatos(await self._cfg(guild.id, "canal_midia") or str(config.CANAL_MIDIAS_ID)):
            canal = guild.get_channel(cid)
            if isinstance(canal, discord.TextChannel):
                return canal
        return None

    async def _canal_publicacoes(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        """O canal de publicações. Confere o nome (devem existir 'public' nele) para nunca postar no canal errado."""
        for cid in ids_candidatos(await self._cfg(guild.id, "canal_publicacoes") or str(config.CANAL_PUBLICACOES_ID)):
            canal = guild.get_channel(cid)
            if isinstance(canal, discord.TextChannel):
                if "public" in sem_acento(canal.name):
                    return canal
                log.warning("Canal de publicações %s se chama '%s'; não vou postar nele", cid, canal.name)
        return None

    # ------------------------------------------------------------------ relógio
    @tasks.loop(minutes=5)
    async def relogio(self) -> None:
        agora = datetime.now(TZ)
        for guild in list(self.bot.guilds):
            try:
                await self._tique(guild, agora)
            except Exception:  # um servidor com problema não para os outros
                log.exception("Falha no relógio da presença em %s", guild.id)

    @relogio.before_loop
    async def _antes(self) -> None:
        await self.bot.wait_until_ready()

    async def _tique(self, guild: discord.Guild, agora: datetime) -> None:
        cerebro = self._cerebro()
        if cerebro is None or not await cerebro.ativo(guild.id):
            return
        hoje, minuto = agora.date().isoformat(), agora.hour * 60 + agora.minute

        alvo = minuto_do_dia(guild.id, hoje, "midia", *MIDIA_JANELA)
        if alvo <= minuto < 22 * 60 and await self._cfg(guild.id, "midia_data") != hoje and await self._tentativa(guild.id, "midia", hoje):
            if await self.postar_midia(guild):
                await self._set(guild.id, "midia_data", hoje)

        dias = agora.date().toordinal() // PUBLICACOES_A_CADA_DIAS
        alvo = minuto_do_dia(guild.id, hoje, "publicacoes", *PUBLICACOES_JANELA)
        ciclo = f"{dias}"
        if alvo <= minuto < 21 * 60 and await self._cfg(guild.id, "pub_ciclo") != ciclo and await self._tentativa(guild.id, "pub", hoje):
            if await self.postar_publicacoes(guild):
                await self._set(guild.id, "pub_ciclo", ciclo)

        mes = f"{agora:%Y-%m}"
        if agora.hour >= LORE_A_PARTIR_DA_HORA and await self._cfg(guild.id, "lore_mes") != mes and await self._tentativa(guild.id, "lore", hoje):
            if await self.postar_lore(guild, agora):
                await self._set(guild.id, "lore_mes", mes)

    # ------------------------------------------------------------------ mídias: desenho do dia
    async def postar_midia(self, guild: discord.Guild) -> bool:
        cerebro, canal = self._cerebro(), await self._canal_midia(guild)
        if cerebro is None or canal is None:
            return False
        tema = random.choice(TEMAS_MIDIA)
        bruto = await cerebro._chamar_api(
            SISTEMA_TAREFA,
            f"Tarefa: você acabou de fazer um desenho e vai postar no canal de mídias para trazer vida à toca.\n"
            f"Tema de hoje: {tema}.\n"
            'Responda SOMENTE com um JSON: {"legenda": "...", "cena": "..."}\n'
            "- legenda: 1 a 3 frases curtas, como a Kiza postando o desenho que fez (ex.: 'olha um desenho que eu fiz de mim e da "
            "minha mãe :D'), com um jeitinho fofo e, de vez em quando, uma pergunta para o pessoal responder. Varie o jeito.\n"
            "- cena: descrição objetiva do desenho (personagens, o que fazem, cenário, cores, legendas curtas a escrever), "
            "para alguém desenhar com formas simples. Se a Kiza aparecer, siga a aparência dela.",
            700, 40,
        )
        dados = rabisco.extrair_json(bruto or "")
        if not dados or not isinstance(dados.get("legenda"), str) or not isinstance(dados.get("cena"), str):
            log.warning("Mídia do dia sem JSON utilizável: %s", truncar(bruto or "vazia", 200))
            return False
        png = await cerebro.desenhar_cena(dados["cena"])
        if png is None:
            return False
        try:
            await canal.send(
                truncar(dados["legenda"].strip(), 600),
                file=discord.File(io.BytesIO(png), filename="desenho-da-kiza.png"),
                allowed_mentions=discord.AllowedMentions.none(),
            )
        except discord.HTTPException:
            log.warning("Falha ao postar a mídia do dia", exc_info=True)
            return False
        return True

    # ------------------------------------------------------------------ publicações: puxar o pessoal
    async def postar_publicacoes(self, guild: discord.Guild) -> bool:
        cerebro, canal = self._cerebro(), await self._canal_publicacoes(guild)
        if cerebro is None or canal is None:
            return False
        gancho = random.choice(GANCHOS_PUBLICACOES)
        bruto = await cerebro._chamar_api(
            SISTEMA_TAREFA,
            "Tarefa: escreva UMA mensagem curta (2 a 4 linhas, no máximo ~350 caracteres no total) para o canal de publicações, "
            f"animando o pessoal a postar aqui. Gancho de hoje: convidar a galera a {gancho}. "
            "Seja carismática e específica, como uma amiga puxando assunto; pode comentar que adora ver o que fazem. "
            "De vez em quando (não sempre) lembre que publicar aqui conta no `/fidelidade`. Sem marcar ninguém. "
            "Responda só com o texto da mensagem.",
            400, 30,
        )
        texto = (bruto or "").strip().strip('"')
        if not texto:
            return False
        try:
            await canal.send(truncar(texto, 900), allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao postar o convite de publicações", exc_info=True)
            return False
        return True

    # ------------------------------------------------------------------ lore mensal
    async def _contexto_lore(self, guild: discord.Guild, agora: datetime) -> str:
        novos = sorted(
            (m for m in guild.members if not m.bot and m.joined_at and (agora - m.joined_at.astimezone(TZ)).days <= 30),
            key=lambda m: m.joined_at,  # type: ignore[arg-type,return-value]
            reverse=True,
        )[:6]
        topo = []
        for user_id, _xp, _saldo in await self.bot.banco.top(guild.id, "xp", 3):
            m = guild.get_member(user_id)
            if m is not None and not m.bot:
                topo.append(m.display_name)
        linhas = [f"Mês: {agora:%m/%Y}. A toca tem {guild.member_count} membros."]
        linhas.append("Amigos que chegaram na toca nos últimos 30 dias: " + (", ".join(m.display_name for m in novos) or "ninguém novo"))
        if topo:
            linhas.append("Os mais animados da toca: " + ", ".join(topo))
        return "\n".join(linhas)

    async def postar_lore(self, guild: discord.Guild, agora: Optional[datetime] = None) -> bool:
        cerebro, canal = self._cerebro(), await canal_da_funcao(self.bot, guild, "lore")
        if cerebro is None or not isinstance(canal, discord.TextChannel):
            return False
        agora = agora or datetime.now(TZ)
        canon = "\n".join(f"{t}: {d}" for t, d in textos.LORE_CAPITULOS)
        bruto = await cerebro._chamar_api(
            SISTEMA_TAREFA,
            "Tarefa: escreva o capítulo deste mês da lenda da Kiza (lore), como se ela mesma contasse no diário dela, em primeira "
            "pessoa, com o jeitinho fofo dela. Pode misturar o servidor de Minecraft e o Discord (novas construções, bagunça, "
            "madrugadas no chat). Cite 2 a 4 nomes REAIS da lista abaixo como amigos que ela fez ou que a acompanham, de forma "
            "carinhosa e inofensiva (sem inventar fatos sérios sobre eles). Nada de romance, nada de maldade.\n\n"
            f"História até agora (mantenha coerente):\n{canon}\n\n"
            f"Dados reais deste mês:\n{await self._contexto_lore(guild, agora)}\n\n"
            'Responda SOMENTE com um JSON: {"titulo": "título curto do capítulo", "texto": "3 a 5 parágrafos curtos"}. '
            "Em 'texto' use quebras de linha (\\n\\n) entre parágrafos, até ~1400 caracteres.",
            1500, 60,
        )
        dados = rabisco.extrair_json(bruto or "")
        if not dados or not isinstance(dados.get("titulo"), str) or not isinstance(dados.get("texto"), str):
            log.warning("Lore do mês sem JSON utilizável: %s", truncar(bruto or "vazia", 200))
            return False
        e = embed(f"📖 {agora:%m/%Y} · {truncar(dados['titulo'], 80)}", truncar(dados["texto"].strip(), 3800))
        try:
            await canal.send(embed=e, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("Falha ao postar a lore do mês", exc_info=True)
            return False
        return True

    # ------------------------------------------------------------------ teste manual (admin)
    @app_commands.command(name="kiza-postar", description="Faz a Kiza postar agora (para testar). Não muda a agenda dela.")
    @app_commands.describe(tipo="O que a Kiza deve postar")
    @app_commands.choices(
        tipo=[
            app_commands.Choice(name="Desenho (canal de mídias)", value="midia"),
            app_commands.Choice(name="Convite (canal de publicações)", value="publicacoes"),
            app_commands.Choice(name="Capítulo do mês (canal de lore)", value="lore"),
        ]
    )
    @app_commands.guild_only()
    @app_commands.checks.cooldown(1, 60.0)
    @exigir_nivel(3)
    async def kiza_postar(self, interaction: discord.Interaction, tipo: app_commands.Choice[str]) -> None:
        guild = interaction.guild
        assert guild is not None
        cerebro = self._cerebro()
        if cerebro is None or not await cerebro.ativo(guild.id):
            await responder(interaction, "O cérebro está desligado (sem chave ou `/ajustes` cerebro = 0).")
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        acao = {"midia": self.postar_midia, "publicacoes": self.postar_publicacoes, "lore": self.postar_lore}[tipo.value]
        ok = await acao(guild)
        await interaction.followup.send("Postei! 🦊" if ok else "Não consegui postar (veja o log; confira também se o canal existe).", ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Presenca(bot))
