"""Chat de proximidade: quem está perto no jogo cai na mesma sala de voz do Discord.

O Discord não deixa um bot mexer no volume de cada pessoa, então a proximidade é por GRUPOS: o jogo manda a posição de cada jogador
ligado (POST /mc/prox, de 3 em 3 s), o bot junta quem está a até `prox_entrar` blocos (e só desfaz o grupo além de `prox_sair`, para
ninguém ficar trocando de sala) e move cada pessoa para uma sala de voz temporária da categoria "Proximidade". Quem fica sozinho vai
para a sala de entrada. Fora do Mundo normal, em minigames, no Intervalo e nas regiões do mistério o jogo marca `livre = false` e a
pessoa volta para a entrada.

Quem participa: quem está numa sala de voz da categoria (entrada ou temporárias) e tem a conta ligada (`/minecraft vincular`). Entrar
na sala de entrada é o "sim"; sair para qualquer outra call, ou `/proximidade pausar`, é o "não". O bot nunca puxa ninguém de fora
da categoria. Tudo desligável em /ajustes (`prox_ligada`).
"""
from __future__ import annotations

import asyncio
import logging
import math
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

import config
import textos
from utils.helpers import embed
from utils.permissoes import exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.proximidade")

NOME_CATEGORIA = "🎧 Proximidade"
NOME_ENTRADA = "🎧 Entrada (fale com quem está perto)"
PREFIXO_SALA = "🎧 Conversa "
MAX_PONTOS = 60
LIMITE_COORD = 30_000_000
PAUSE_ENTRE_MOVES = 0.4
VAZIA_ATE_APAGAR = 20.0


@dataclass(frozen=True)
class Ponto:
    d: str  # dimensão
    x: float
    y: float
    z: float
    livre: bool  # False = em ambiente especial (minigame, Intervalo, mistério, outra dimensão): não conversa por proximidade


def distancia(a: Ponto, b: Ponto) -> float:
    return math.dist((a.x, a.y, a.z), (b.x, b.y, b.z))


def agrupar(pontos: dict[int, Ponto], grupo_anterior: dict[int, Optional[int]], entrar: float, sair: float) -> list[set[int]]:
    """Componentes de pessoas "perto": ligadas se a distância é <= entrar, ou <= sair quando já estavam no mesmo grupo (histerese).

    Quem não está livre fica sozinho. Devolve todos os grupos, inclusive os de uma pessoa só."""
    ids = [u for u, p in pontos.items() if p.livre]
    pai = {u: u for u in ids}

    def achar(u: int) -> int:
        while pai[u] != u:
            pai[u] = pai[pai[u]]
            u = pai[u]
        return u

    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            pa, pb = pontos[a], pontos[b]
            if pa.d != pb.d:
                continue
            antes = grupo_anterior.get(a) is not None and grupo_anterior.get(a) == grupo_anterior.get(b)
            dist = distancia(pa, pb)
            if dist <= entrar or (antes and dist <= sair):
                pai[achar(a)] = achar(b)
    grupos: dict[int, set[int]] = {}
    for u in ids:
        grupos.setdefault(achar(u), set()).add(u)
    resultado = list(grupos.values())
    resultado += [{u} for u, p in pontos.items() if not p.livre]
    return resultado


def planejar(grupos: list[set[int]], atual: dict[int, int], temporarias: set[int], entrada: int, max_salas: int) -> dict[int, tuple[str, int]]:
    """Para cada pessoa, o destino: ("entrada", 0), ("sala", id da sala que já existe) ou ("nova", n) (n identifica o grupo novo).

    Cada grupo de 2 ou mais fica na sala temporária onde mais gente dele já está (cada sala serve a um grupo só); sem nenhuma, ganha uma
    nova (até max_salas salas; passando disso o grupo fica na entrada). Quem está sozinho vai para a entrada."""
    alvos: dict[int, tuple[str, int]] = {}
    usadas: set[int] = set()
    novas = 0
    total_salas = len(temporarias)
    for grupo in sorted((g for g in grupos if len(g) >= 2), key=lambda g: (-len(g), min(g))):
        contagem: dict[int, int] = {}
        for u in grupo:
            cid = atual.get(u)
            if cid in temporarias and cid not in usadas:
                contagem[cid] = contagem.get(cid, 0) + 1
        if contagem:
            sala = max(contagem, key=lambda c: (contagem[c], -c))
            usadas.add(sala)
            for u in grupo:
                alvos[u] = ("sala", sala)
        elif total_salas + novas < max_salas:
            novas += 1
            for u in grupo:
                alvos[u] = ("nova", novas)
        else:
            for u in grupo:
                alvos[u] = ("entrada", entrada)
    for g in grupos:
        if len(g) < 2:
            for u in g:
                alvos[u] = ("entrada", entrada)
    return alvos


def validar_pontos(bruto: Any) -> list[tuple[str, str, Ponto]]:
    """Confere o corpo do /mc/prox: [(id do jogador, nome, ponto)]. Entrada estranha vira lista vazia ou é ignorada."""
    if not isinstance(bruto, dict) or not isinstance(bruto.get("pos"), list):
        return []
    saida: list[tuple[str, str, Ponto]] = []
    for item in bruto["pos"][:MAX_PONTOS]:
        if not isinstance(item, dict):
            continue
        mc_id, nome, dim = item.get("id"), item.get("nome"), item.get("d", "")
        if not isinstance(mc_id, str) or not mc_id or len(mc_id) > 64 or not isinstance(nome, str) or not nome or len(nome) > 40:
            continue
        coords = [item.get(c) for c in ("x", "y", "z")]
        if any(isinstance(c, bool) or not isinstance(c, (int, float)) or c != c or abs(c) > LIMITE_COORD for c in coords):
            continue
        saida.append((mc_id, nome, Ponto(str(dim)[:40], float(coords[0]), float(coords[1]), float(coords[2]), item.get("livre") is True)))
    return saida


class Proximidade(commands.Cog):
    grupo = app_commands.Group(name="proximidade", description="Chat de voz por proximidade do Minecraft.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._ocupado = False
        self._pendente: Optional[tuple[int, list[tuple[str, str, Ponto]]]] = None
        self._ultimo_move: dict[int, float] = {}
        self._vazia_desde: dict[int, float] = {}
        self._visto_em: dict[int, float] = {}  # guild -> quando chegou a última posição

    # ------------------------------------------------------------------ ciclo de vida
    async def cog_load(self) -> None:
        self.limpar_salas.start()

    async def cog_unload(self) -> None:
        self.limpar_salas.cancel()

    # ------------------------------------------------------------------ canais
    async def ids_canais(self, guild_id: int) -> tuple[Optional[int], Optional[int]]:
        banco = self.bot.banco

        async def _id(chave: str) -> Optional[int]:
            valor = await banco.get_config(guild_id, chave)
            return int(valor) if valor and valor.isdigit() else None

        return await _id("prox_categoria"), await _id("prox_entrada")

    async def categoria_e_entrada(self, guild: discord.Guild) -> tuple[Optional[Any], Optional[Any]]:
        cat_id, ent_id = await self.ids_canais(guild.id)
        return (guild.get_channel(cat_id) if cat_id else None), (guild.get_channel(ent_id) if ent_id else None)

    @staticmethod
    def temporarias_de(categoria: Any, entrada: Any) -> list[Any]:
        return [c for c in categoria.voice_channels if c.id != entrada.id and c.name.startswith(PREFIXO_SALA)]

    # ------------------------------------------------------------------ processamento
    async def ligada(self, guild_id: int) -> bool:
        return bool(await self.bot.banco.ajuste(guild_id, "prox_ligada"))

    async def processar(self, guild_id: int, pontos: list[tuple[str, str, Ponto]]) -> dict[str, int]:
        """Recebe as posições, decide os grupos e move quem precisa. Só um processamento por vez (o mais novo substitui o que esperava)."""
        if self._ocupado:
            self._pendente = (guild_id, pontos)
            return {"adiado": 1}
        self._ocupado = True
        try:
            resultado = await self._processar(guild_id, pontos)
            while self._pendente is not None:
                gid, ps = self._pendente
                self._pendente = None
                resultado = await self._processar(gid, ps)
            return resultado
        finally:
            self._ocupado = False

    async def _processar(self, guild_id: int, pontos: list[tuple[str, str, Ponto]]) -> dict[str, int]:
        guild = self.bot.get_guild(guild_id)
        if guild is None or not await self.ligada(guild_id):
            return {"movidos": 0}
        categoria, entrada = await self.categoria_e_entrada(guild)
        if categoria is None or entrada is None:
            return {"movidos": 0}
        banco = self.bot.banco
        entrar = await banco.ajuste(guild_id, "prox_entrar")
        sair = max(entrar, await banco.ajuste(guild_id, "prox_sair"))
        espera = await banco.ajuste(guild_id, "prox_espera_seg")
        max_salas = await banco.ajuste(guild_id, "prox_max_salas")

        temporarias = self.temporarias_de(categoria, entrada)
        ids_temporarias = {c.id for c in temporarias}
        em_voz: dict[int, Any] = {}  # user_id -> membro (só quem está numa sala da categoria)
        atual: dict[int, int] = {}
        for sala in [entrada, *temporarias]:
            for m in sala.members:
                em_voz[m.id] = m
                atual[m.id] = sala.id
        # posição de cada pessoa ligada que está na voz da categoria e não pausou
        por_usuario: dict[int, Ponto] = {}
        for mc_id, nome, ponto in pontos:
            vinculo = await banco.mc_vinculo_de_jogador(guild_id, mc_id, nome)
            if vinculo is None:
                continue
            uid = int(vinculo["user_id"])
            if uid in em_voz and not await banco.get_config(guild_id, f"prox_pausa_{uid}"):
                por_usuario[uid] = ponto
        if not por_usuario:
            return {"movidos": 0}
        grupo_anterior = {u: (atual[u] if atual[u] in ids_temporarias else None) for u in por_usuario}
        grupos = agrupar(por_usuario, grupo_anterior, float(entrar), float(sair))
        alvos = planejar(grupos, {u: atual[u] for u in por_usuario}, ids_temporarias, entrada.id, max_salas)

        novas: dict[int, Any] = {}
        movidos = 0
        agora = time.monotonic()
        for uid, (tipo, ref) in sorted(alvos.items()):
            if tipo == "entrada":
                destino = entrada
            elif tipo == "sala":
                destino = guild.get_channel(ref)
            else:
                if ref not in novas:
                    novas[ref] = await self._criar_sala(categoria, len(temporarias) + len(novas) + 1)
                destino = novas[ref]
            if destino is None or atual.get(uid) == destino.id:
                continue
            if agora - self._ultimo_move.get(uid, -1e9) < espera:
                continue
            try:
                await em_voz[uid].move_to(destino, reason="Kiza: proximidade no Minecraft")
            except discord.HTTPException:
                log.warning("Não consegui mover %s para %s", uid, destino, exc_info=True)
                continue
            self._ultimo_move[uid] = agora
            movidos += 1
            await asyncio.sleep(PAUSE_ENTRE_MOVES)
        self._visto_em[guild_id] = time.time()
        return {"movidos": movidos, "grupos": sum(1 for g in grupos if len(g) >= 2), "salas": len(novas)}

    async def _criar_sala(self, categoria: Any, numero: int) -> Any:
        existentes = {c.name for c in categoria.voice_channels}
        n = numero
        while f"{PREFIXO_SALA}{n}" in existentes:
            n += 1
        return await categoria.create_voice_channel(f"{PREFIXO_SALA}{n}", reason="Kiza: grupo de proximidade")

    # ------------------------------------------------------------------ limpeza das salas vazias
    @tasks.loop(seconds=15)
    async def limpar_salas(self) -> None:
        try:
            for guild in self.bot.guilds:
                categoria, entrada = await self.categoria_e_entrada(guild)
                if categoria is None or entrada is None:
                    continue
                for sala in self.temporarias_de(categoria, entrada):
                    if sala.members:
                        self._vazia_desde.pop(sala.id, None)
                        continue
                    desde = self._vazia_desde.setdefault(sala.id, time.monotonic())
                    if time.monotonic() - desde >= VAZIA_ATE_APAGAR:
                        self._vazia_desde.pop(sala.id, None)
                        try:
                            await sala.delete(reason="Kiza: sala de proximidade vazia")
                        except discord.HTTPException:
                            log.warning("Não consegui apagar a sala %s", sala.id, exc_info=True)
        except Exception:
            log.exception("Erro na limpeza das salas de proximidade")

    @limpar_salas.before_loop
    async def _antes_de_limpar(self) -> None:
        await self.bot.wait_until_ready()

    # ------------------------------------------------------------------ comandos
    @grupo.command(name="configurar", description="(Admin) Cria a categoria e a sala de entrada do chat de proximidade.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def configurar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        categoria, entrada = await self.categoria_e_entrada(guild)
        banco = self.bot.banco
        try:
            if categoria is None:
                categoria = await guild.create_category(NOME_CATEGORIA, reason="Kiza: chat de proximidade")
                await banco.set_config(guild.id, "prox_categoria", str(categoria.id))
            if entrada is None:
                entrada = await categoria.create_voice_channel(NOME_ENTRADA, reason="Kiza: chat de proximidade")
                await banco.set_config(guild.id, "prox_entrada", str(entrada.id))
        except discord.HTTPException:
            log.warning("Não consegui criar a categoria de proximidade", exc_info=True)
            await interaction.followup.send(textos.PROX_SEM_PERMISSAO, ephemeral=True)
            return
        await interaction.followup.send(textos.PROX_CONFIGURADO.format(entrada=entrada.mention, distancia=await banco.ajuste(guild.id, "prox_entrar")), ephemeral=True)

    @grupo.command(name="pausar", description="Para de te mover de sala por proximidade (você fica onde está).")
    async def pausar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await self.bot.banco.set_config(guild.id, f"prox_pausa_{interaction.user.id}", "1")
        await interaction.response.send_message(textos.PROX_PAUSADO, ephemeral=True)

    @grupo.command(name="retomar", description="Volta a ser movido de sala por proximidade.")
    async def retomar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await self.bot.banco.set_config(guild.id, f"prox_pausa_{interaction.user.id}", None)
        await interaction.response.send_message(textos.PROX_RETOMADO, ephemeral=True)

    @grupo.command(name="status", description="(Staff) Mostra se o chat de proximidade está funcionando e quem está em cada sala.")
    @exigir_nivel(config.NIVEL_STAFF)
    async def status(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        banco = self.bot.banco
        categoria, entrada = await self.categoria_e_entrada(guild)
        linhas = [textos.PROX_STATUS_LIGADA.format(estado="sim" if await self.ligada(guild.id) else "não (`prox_ligada` em /ajustes)")]
        if categoria is None or entrada is None:
            linhas.append(textos.PROX_STATUS_SEM_CANAIS)
        else:
            linhas.append(textos.PROX_STATUS_ENTRADA.format(sala=entrada.mention, n=len(entrada.members)))
            for sala in self.temporarias_de(categoria, entrada):
                linhas.append(textos.PROX_STATUS_SALA.format(sala=sala.mention, quem=", ".join(m.display_name for m in sala.members) or "(vazia)"))
        visto = self._visto_em.get(guild.id)
        linhas.append(textos.PROX_STATUS_VISTO.format(quando=f"<t:{int(visto)}:R>" if visto else "ainda não chegou posição do jogo"))
        linhas.append(textos.PROX_STATUS_AJUSTES.format(
            entrar=await banco.ajuste(guild.id, "prox_entrar"), sair=await banco.ajuste(guild.id, "prox_sair"), espera=await banco.ajuste(guild.id, "prox_espera_seg")))
        await interaction.response.send_message(embed=embed(textos.PROX_STATUS_TITULO, "\n".join(linhas)), ephemeral=True)


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Proximidade(bot))
