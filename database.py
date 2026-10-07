"""Acesso ao banco de dados da Kiza (SQLite via aiosqlite).

REGRA DE OURO: este é o ÚNICO módulo que fala com o banco. Os cogs só chamam os métodos
de `Banco`. Se um dia o banco mudar (ex.: PostgreSQL), só este arquivo precisa ser reescrito.

Detalhes importantes:
* Uma única conexão, protegida por um `asyncio.Lock`: nada de transações intercaladas.
* Modo autocommit (isolation_level=None); as transações são abertas explicitamente com
  BEGIN IMMEDIATE em `_tx()`.
* Toda mudança de saldo passa por `_mov`, que faz débito condicional atômico
  (UPDATE ... WHERE saldo >= ?) e grava o livro-razão (`transacoes`).
* Nunca use `INSERT OR REPLACE` em operações que cobram dinheiro.
"""
from __future__ import annotations

import asyncio
import logging
import sqlite3
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Iterable, Optional

import aiosqlite

import config
from migrations import MIGRACOES

log = logging.getLogger("kiza.db")


def agora() -> int:
    return int(time.time())


class Banco:
    def __init__(self, caminho: str) -> None:
        self.caminho = caminho
        self._conn: Optional[aiosqlite.Connection] = None
        self._lock = asyncio.Lock()
        # caches leves (invalidados a cada escrita relevante)
        self._cfg: dict[int, dict[str, str]] = {}
        self._niveis: dict[int, dict[int, int]] = {}
        self._regras: dict[int, dict[int, dict[str, str]]] = {}

    # ------------------------------------------------------------------ infraestrutura
    async def conectar(self) -> None:
        if self.caminho != ":memory:":
            Path(self.caminho).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(self.caminho, isolation_level=None)
        self._conn.row_factory = aiosqlite.Row
        for pragma in (
            "PRAGMA journal_mode = WAL",
            "PRAGMA synchronous = NORMAL",
            "PRAGMA foreign_keys = ON",
            "PRAGMA busy_timeout = 5000",
        ):
            cur = await self._conn.execute(pragma)
            await cur.fetchall()
            await cur.close()
        await self._migrar()
        log.info("Banco pronto em %s", self.caminho)

    async def fechar(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    async def _migrar(self) -> None:
        conn = self._conn
        assert conn is not None
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_versao (versao INTEGER PRIMARY KEY, aplicada_em INTEGER NOT NULL)"
        )
        linha = await self._fetchone(conn, "SELECT COALESCE(MAX(versao), 0) AS v FROM schema_versao")
        atual = linha["v"]
        for versao, sql in MIGRACOES:
            if versao <= atual:
                continue
            log.info("Aplicando migração %s", versao)
            # DDL do SQLite é transacional: ou aplica tudo ou nada.
            await conn.executescript(
                f"BEGIN;\n{sql}\nINSERT INTO schema_versao (versao, aplicada_em) VALUES ({versao}, {agora()});\nCOMMIT;"
            )

    @staticmethod
    async def _fetchone(conn: aiosqlite.Connection, sql: str, params: Iterable[Any] = ()):
        cur = await conn.execute(sql, tuple(params))
        try:
            return await cur.fetchone()
        finally:
            await cur.close()

    @staticmethod
    async def _fetchall(conn: aiosqlite.Connection, sql: str, params: Iterable[Any] = ()):
        cur = await conn.execute(sql, tuple(params))
        try:
            return await cur.fetchall()
        finally:
            await cur.close()

    @asynccontextmanager
    async def _tx(self):
        """Transação exclusiva: BEGIN IMMEDIATE ... COMMIT (ou ROLLBACK se der erro)."""
        if self._conn is None:
            raise RuntimeError("Banco não conectado")
        async with self._lock:
            conn = self._conn
            await conn.execute("BEGIN IMMEDIATE")
            try:
                yield conn
            except BaseException:
                await conn.rollback()
                raise
            else:
                await conn.commit()

    async def _um(self, sql: str, params: Iterable[Any] = ()):
        if self._conn is None:
            raise RuntimeError("Banco não conectado")
        async with self._lock:
            return await self._fetchone(self._conn, sql, params)

    async def _todos(self, sql: str, params: Iterable[Any] = ()):
        if self._conn is None:
            raise RuntimeError("Banco não conectado")
        async with self._lock:
            return await self._fetchall(self._conn, sql, params)

    async def _exec(self, sql: str, params: Iterable[Any] = ()) -> int:
        """Uma única instrução em autocommit. Retorna o rowcount."""
        if self._conn is None:
            raise RuntimeError("Banco não conectado")
        async with self._lock:
            cur = await self._conn.execute(sql, tuple(params))
            try:
                return cur.rowcount
            finally:
                await cur.close()

    async def ping(self) -> float:
        """Latência do banco em milissegundos."""
        inicio = time.perf_counter()
        await self._um("SELECT 1")
        return (time.perf_counter() - inicio) * 1000

    async def backup(self, destino: str) -> None:
        """Cópia consistente do banco (VACUUM INTO). O arquivo de destino não pode existir."""
        Path(destino).parent.mkdir(parents=True, exist_ok=True)
        if self._conn is None:
            raise RuntimeError("Banco não conectado")
        async with self._lock:
            cur = await self._conn.execute("VACUUM INTO ?", (destino,))
            await cur.close()

    # ------------------------------------------------------------------ configuração por servidor
    async def cfg(self, guild_id: int) -> dict[str, str]:
        dados = self._cfg.get(guild_id)
        if dados is None:
            linhas = await self._todos("SELECT chave, valor FROM config_guild WHERE guild_id = ?", (guild_id,))
            dados = {linha["chave"]: linha["valor"] for linha in linhas}
            self._cfg[guild_id] = dados
        return dados

    async def get_config(self, guild_id: int, chave: str, padrao: Optional[str] = None) -> Optional[str]:
        return (await self.cfg(guild_id)).get(chave, padrao)

    async def get_config_int(self, guild_id: int, chave: str) -> Optional[int]:
        bruto = (await self.cfg(guild_id)).get(chave)
        if bruto is not None and bruto.lstrip("-").isdigit():
            return int(bruto)
        return None

    async def set_config(self, guild_id: int, chave: str, valor: Optional[str]) -> None:
        """Grava (ou apaga, se valor for None) uma configuração."""
        if valor is None:
            await self._exec("DELETE FROM config_guild WHERE guild_id = ? AND chave = ?", (guild_id, chave))
        else:
            await self._exec(
                "INSERT INTO config_guild (guild_id, chave, valor) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, chave) DO UPDATE SET valor = excluded.valor",
                (guild_id, chave, valor),
            )
        self._cfg.pop(guild_id, None)

    async def ajuste(self, guild_id: int, chave: str) -> int:
        """Valor de um ajuste numérico (o padrão vem de config.AJUSTES)."""
        padrao = config.AJUSTES[chave][0]
        bruto = (await self.cfg(guild_id)).get(f"ajuste_{chave}")
        if bruto is None:
            return padrao
        try:
            return int(bruto)
        except ValueError:
            return padrao

    async def todos_ajustes(self, guild_id: int) -> dict[str, int]:
        return {chave: await self.ajuste(guild_id, chave) for chave in config.AJUSTES}

    async def definir_ajuste(self, guild_id: int, chave: str, valor: Optional[int]) -> None:
        await self.set_config(guild_id, f"ajuste_{chave}", None if valor is None else str(int(valor)))

    # ------------------------------------------------------------------ níveis de permissão (cargo -> 0..3)
    async def mapa_niveis(self, guild_id: int) -> dict[int, int]:
        mapa = self._niveis.get(guild_id)
        if mapa is None:
            linhas = await self._todos("SELECT role_id, nivel FROM cargos_nivel WHERE guild_id = ?", (guild_id,))
            mapa = {linha["role_id"]: linha["nivel"] for linha in linhas}
            self._niveis[guild_id] = mapa
        return mapa

    async def cargos_por_nivel(self, guild_id: int) -> dict[int, list[int]]:
        resultado: dict[int, list[int]] = {n: [] for n in range(4)}
        for role_id, nivel in (await self.mapa_niveis(guild_id)).items():
            resultado[nivel].append(role_id)
        return resultado

    async def definir_cargos_nivel(self, guild_id: int, nivel: int, role_ids: Iterable[int]) -> None:
        """Substitui os cargos de um nível. Um cargo só pertence a um nível (o último vence)."""
        ids = list(dict.fromkeys(role_ids))
        async with self._tx() as conn:
            if ids:
                marcas = ",".join("?" * len(ids))
                await conn.execute(
                    f"DELETE FROM cargos_nivel WHERE guild_id = ? AND nivel = ? AND role_id NOT IN ({marcas})",
                    (guild_id, nivel, *ids),
                )
                for role_id in ids:
                    await conn.execute(
                        "INSERT INTO cargos_nivel (guild_id, role_id, nivel) VALUES (?, ?, ?) "
                        "ON CONFLICT(guild_id, role_id) DO UPDATE SET nivel = excluded.nivel",
                        (guild_id, role_id, nivel),
                    )
            else:
                await conn.execute("DELETE FROM cargos_nivel WHERE guild_id = ? AND nivel = ?", (guild_id, nivel))
        self._niveis.pop(guild_id, None)

    # ------------------------------------------------------------------ cargos por nível de XP
    async def definir_cargo_xp(self, guild_id: int, nivel_xp: int, role_id: Optional[int]) -> None:
        if role_id is None:
            await self._exec("DELETE FROM cargos_xp WHERE guild_id = ? AND nivel_xp = ?", (guild_id, nivel_xp))
        else:
            await self._exec(
                "INSERT INTO cargos_xp (guild_id, nivel_xp, role_id) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, nivel_xp) DO UPDATE SET role_id = excluded.role_id",
                (guild_id, nivel_xp, role_id),
            )

    async def listar_cargos_xp(self, guild_id: int) -> list[tuple[int, int]]:
        linhas = await self._todos(
            "SELECT nivel_xp, role_id FROM cargos_xp WHERE guild_id = ? ORDER BY nivel_xp", (guild_id,)
        )
        return [(linha["nivel_xp"], linha["role_id"]) for linha in linhas]

    # ------------------------------------------------------------------ painel de cargos (grupos)
    async def definir_grupo_cargos(self, guild_id: int, grupo: str, role_ids: Iterable[int]) -> None:
        """Substitui os cargos de um grupo do painel. Um cargo só pertence a um grupo."""
        ids = list(dict.fromkeys(role_ids))
        async with self._tx() as conn:
            if ids:
                marcas = ",".join("?" * len(ids))
                await conn.execute(
                    f"DELETE FROM painel_cargos WHERE guild_id = ? AND grupo = ? AND role_id NOT IN ({marcas})",
                    (guild_id, grupo, *ids),
                )
                for role_id in ids:
                    await conn.execute(
                        "INSERT INTO painel_cargos (guild_id, grupo, role_id) VALUES (?, ?, ?) "
                        "ON CONFLICT(guild_id, role_id) DO UPDATE SET grupo = excluded.grupo",
                        (guild_id, grupo, role_id),
                    )
            else:
                await conn.execute("DELETE FROM painel_cargos WHERE guild_id = ? AND grupo = ?", (guild_id, grupo))

    async def grupos_cargos(self, guild_id: int) -> dict[str, list[int]]:
        linhas = await self._todos("SELECT grupo, role_id FROM painel_cargos WHERE guild_id = ?", (guild_id,))
        resultado: dict[str, list[int]] = {g: [] for g in config.GRUPOS_CARGOS}
        for linha in linhas:
            resultado.setdefault(linha["grupo"], []).append(linha["role_id"])
        return resultado

    # ------------------------------------------------------------------ regras por canal
    async def regras_canal(self, guild_id: int) -> dict[int, dict[str, str]]:
        dados = self._regras.get(guild_id)
        if dados is None:
            linhas = await self._todos("SELECT canal_id, regra, valor FROM regras_canal WHERE guild_id = ?", (guild_id,))
            dados = {}
            for linha in linhas:
                dados.setdefault(linha["canal_id"], {})[linha["regra"]] = linha["valor"]
            self._regras[guild_id] = dados
        return dados

    async def adicionar_regra_canal(self, guild_id: int, canal_id: int, regra: str, valor: str = "") -> None:
        await self._exec(
            "INSERT INTO regras_canal (guild_id, canal_id, regra, valor) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(guild_id, canal_id, regra) DO UPDATE SET valor = excluded.valor",
            (guild_id, canal_id, regra, valor),
        )
        self._regras.pop(guild_id, None)

    async def remover_regra_canal(self, guild_id: int, canal_id: int, regra: str) -> bool:
        n = await self._exec(
            "DELETE FROM regras_canal WHERE guild_id = ? AND canal_id = ? AND regra = ?", (guild_id, canal_id, regra)
        )
        self._regras.pop(guild_id, None)
        return n == 1

    # ------------------------------------------------------------------ visibilidade (aplicada de verdade no Discord)
    async def definir_visibilidade(self, guild_id: int, canal_id: int, tier: Optional[str]) -> None:
        if tier is None:
            await self._exec("DELETE FROM visibilidade_canal WHERE guild_id = ? AND canal_id = ?", (guild_id, canal_id))
        else:
            await self._exec(
                "INSERT INTO visibilidade_canal (guild_id, canal_id, tier) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, canal_id) DO UPDATE SET tier = excluded.tier",
                (guild_id, canal_id, tier),
            )

    async def visibilidades(self, guild_id: int) -> dict[int, str]:
        linhas = await self._todos("SELECT canal_id, tier FROM visibilidade_canal WHERE guild_id = ?", (guild_id,))
        return {linha["canal_id"]: linha["tier"] for linha in linhas}

    # ------------------------------------------------------------------ perfis e XP
    async def _garantir(self, conn: aiosqlite.Connection, guild_id: int, user_id: int) -> None:
        await conn.execute(
            "INSERT OR IGNORE INTO perfis (guild_id, user_id, criado_em) VALUES (?, ?, ?)", (guild_id, user_id, agora())
        )

    async def obter_perfil(self, guild_id: int, user_id: int):
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, user_id)
            return await self._fetchone(
                conn, "SELECT * FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )

    async def adicionar_xp(self, guild_id: int, user_id: int, quanto: int) -> tuple[int, int]:
        """Soma XP. Retorna (xp_antes, xp_depois)."""
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, user_id)
            linha = await self._fetchone(
                conn, "SELECT xp FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            antes = linha["xp"]
            depois = max(0, antes + quanto)
            await conn.execute("UPDATE perfis SET xp = ? WHERE guild_id = ? AND user_id = ?", (depois, guild_id, user_id))
        return antes, depois

    async def definir_xp(self, guild_id: int, user_id: int, xp: int) -> int:
        xp = max(0, xp)
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, user_id)
            await conn.execute("UPDATE perfis SET xp = ? WHERE guild_id = ? AND user_id = ?", (xp, guild_id, user_id))
        return xp

    async def top(self, guild_id: int, coluna: str, limite: int = 10):
        if coluna not in ("xp", "saldo"):
            raise ValueError("coluna inválida")
        return await self._todos(
            f"SELECT user_id, xp, saldo FROM perfis WHERE guild_id = ? AND {coluna} > 0 "
            f"ORDER BY {coluna} DESC, user_id LIMIT ?",
            (guild_id, limite),
        )

    async def posicao(self, guild_id: int, user_id: int, coluna: str) -> Optional[int]:
        if coluna not in ("xp", "saldo"):
            raise ValueError("coluna inválida")
        linha = await self._um(
            f"SELECT COUNT(*) + 1 AS pos FROM perfis WHERE guild_id = ? AND {coluna} > "
            f"(SELECT {coluna} FROM perfis WHERE guild_id = ? AND user_id = ?)",
            (guild_id, guild_id, user_id),
        )
        existe = await self._um("SELECT 1 FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
        return linha["pos"] if existe else None

    # ------------------------------------------------------------------ economia (livro-razão)
    async def _mov(
        self,
        conn: aiosqlite.Connection,
        guild_id: int,
        user_id: int,
        valor: int,
        tipo: str,
        ref: Optional[str] = None,
    ) -> Optional[int]:
        """Movimenta saldo dentro de uma transação. Retorna o saldo novo, ou None se faltou saldo.

        Débitos são condicionais e atômicos: UPDATE ... WHERE saldo >= ? e conferência de rowcount.
        """
        await self._garantir(conn, guild_id, user_id)
        if valor == 0:
            linha = await self._fetchone(
                conn, "SELECT saldo FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            return linha["saldo"]
        if valor > 0:
            await conn.execute(
                "UPDATE perfis SET saldo = saldo + ? WHERE guild_id = ? AND user_id = ?", (valor, guild_id, user_id)
            )
        else:
            custo = -valor
            cur = await conn.execute(
                "UPDATE perfis SET saldo = saldo - ? WHERE guild_id = ? AND user_id = ? AND saldo >= ?",
                (custo, guild_id, user_id, custo),
            )
            afetadas = cur.rowcount
            await cur.close()
            if afetadas != 1:
                return None
        linha = await self._fetchone(
            conn, "SELECT saldo FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )
        saldo = linha["saldo"]
        await conn.execute(
            "INSERT INTO transacoes (guild_id, user_id, tipo, valor, saldo_apos, ref, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (guild_id, user_id, tipo, valor, saldo, ref, agora()),
        )
        return saldo

    async def saldo(self, guild_id: int, user_id: int) -> int:
        return (await self.obter_perfil(guild_id, user_id))["saldo"]

    async def creditar(self, guild_id: int, user_id: int, valor: int, tipo: str, ref: Optional[str] = None) -> int:
        if valor < 0:
            raise ValueError("creditar exige valor >= 0")
        async with self._tx() as conn:
            return await self._mov(conn, guild_id, user_id, valor, tipo, ref)  # type: ignore[return-value]

    async def debitar(self, guild_id: int, user_id: int, valor: int, tipo: str, ref: Optional[str] = None) -> Optional[int]:
        """Debita atomicamente. Retorna o saldo novo, ou None se o saldo não bastava."""
        if valor < 0:
            raise ValueError("debitar exige valor >= 0")
        async with self._tx() as conn:
            return await self._mov(conn, guild_id, user_id, -valor, tipo, ref)

    async def transferir(self, guild_id: int, de_id: int, para_id: int, valor: int) -> Optional[int]:
        """Transferência atômica. Retorna o saldo novo de quem enviou, ou None se faltou saldo."""
        if valor <= 0 or de_id == para_id:
            raise ValueError("transferência inválida")
        async with self._tx() as conn:
            saldo_de = await self._mov(conn, guild_id, de_id, -valor, "pagamento_enviado", str(para_id))
            if saldo_de is None:
                return None
            await self._mov(conn, guild_id, para_id, valor, "pagamento_recebido", str(de_id))
            return saldo_de

    async def admin_ajustar(self, guild_id: int, user_id: int, delta: int, mod_id: int) -> tuple[int, int]:
        """Dá (delta > 0) ou tira (delta < 0) saldo. Tirar nunca passa de zero. Retorna (aplicado, saldo_novo)."""
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, user_id)
            linha = await self._fetchone(
                conn, "SELECT saldo FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            aplicado = delta if delta >= 0 else -min(-delta, linha["saldo"])
            saldo = await self._mov(conn, guild_id, user_id, aplicado, "admin", str(mod_id))
            return aplicado, saldo  # type: ignore[return-value]

    async def resgatar_daily(
        self,
        guild_id: int,
        user_id: int,
        hoje: str,
        ontem: str,
        base: int,
        passo: int,
        streak_max: int,
        bonus_pct: int,
    ) -> Optional[dict[str, int]]:
        """Resgata o daily. Retorna None se já resgatou hoje."""
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, user_id)
            perfil = await self._fetchone(
                conn, "SELECT daily_ultimo, daily_streak FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            if perfil["daily_ultimo"] == hoje:
                return None
            streak = perfil["daily_streak"] + 1 if perfil["daily_ultimo"] == ontem else 1
            valor = base + passo * (min(streak, streak_max) - 1)
            valor += valor * bonus_pct // 100
            saldo = await self._mov(conn, guild_id, user_id, valor, "daily", hoje)
            await conn.execute(
                "UPDATE perfis SET daily_ultimo = ?, daily_streak = ? WHERE guild_id = ? AND user_id = ?",
                (hoje, streak, guild_id, user_id),
            )
            return {"valor": valor, "streak": streak, "saldo": saldo}  # type: ignore[dict-item]

    async def recompensar_uma_vez(
        self, guild_id: int, chave: str, user_id: int, valor: int, tipo: str, fidelidade: Optional[str] = None
    ) -> Optional[int]:
        """Credita `valor` só se ninguém levou essa `chave` ainda. Retorna o saldo novo, ou None se já foi levada.

        Com `fidelidade`, soma 1 nesse contador da fidelidade na mesma transação (ex.: o bump pago)."""
        if valor < 0:
            raise ValueError("recompensar_uma_vez exige valor >= 0")
        async with self._tx() as conn:
            cur = await conn.execute(
                "INSERT OR IGNORE INTO recompensas_unicas (guild_id, chave, user_id, valor, criado_em) VALUES (?, ?, ?, ?, ?)",
                (guild_id, chave, user_id, valor, agora()),
            )
            inseriu = cur.rowcount == 1
            await cur.close()
            if not inseriu:
                return None
            if fidelidade is not None:
                await self._somar_fidelidade(conn, guild_id, user_id, fidelidade, 1)
            return await self._mov(conn, guild_id, user_id, valor, tipo, chave)

    @staticmethod
    def _like_prefixo(prefixo: str) -> str:
        """Padrão LIKE para 'começa com prefixo', escapando % e _ (usado com ESCAPE '\\')."""
        return prefixo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"

    async def contar_recompensas(self, guild_id: int, prefixo: str) -> int:
        """Quantas recompensas únicas começam com `prefixo` (ex.: 'drop:2026-10-01:')."""
        linha = await self._um(
            "SELECT COUNT(*) AS n FROM recompensas_unicas WHERE guild_id = ? AND chave LIKE ? ESCAPE '\\'",
            (guild_id, self._like_prefixo(prefixo)),
        )
        return linha["n"]

    async def top_recompensas(self, guild_id: int, prefixo: str, limite: int = 10) -> list[tuple[int, int]]:
        """(user_id, quantas) de quem mais levou recompensas com esse prefixo (ex.: 'bump:')."""
        linhas = await self._todos(
            "SELECT user_id, COUNT(*) AS n FROM recompensas_unicas WHERE guild_id = ? AND chave LIKE ? ESCAPE '\\' "
            "GROUP BY user_id ORDER BY n DESC, MIN(criado_em) LIMIT ?",
            (guild_id, self._like_prefixo(prefixo), limite),
        )
        return [(linha["user_id"], linha["n"]) for linha in linhas]

    async def extrato(self, guild_id: int, user_id: int, limite: int = 10):
        return await self._todos(
            "SELECT tipo, valor, saldo_apos, criado_em FROM transacoes WHERE guild_id = ? AND user_id = ? "
            "ORDER BY id DESC LIMIT ?",
            (guild_id, user_id, limite),
        )

    # ------------------------------------------------------------------ união de toca (casamento amigável)
    async def _reembolsar_pedido(self, conn: aiosqlite.Connection, pedido, tipo: str) -> None:
        await self._mov(conn, pedido["guild_id"], pedido["proponente_id"], pedido["valor"], tipo, str(pedido["alvo_id"]))

    async def obter_pedido_uniao(self, guild_id: int, proponente_id: int):
        return await self._um(
            "SELECT * FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?", (guild_id, proponente_id)
        )

    async def criar_pedido_uniao(self, guild_id: int, proponente_id: int, alvo_id: int, valor: int, expira_em: int) -> str:
        """'ok' | 'ja_casado' | 'alvo_casado' | 'pedido_existente' | 'saldo'. Cobra UMA vez (custódia)."""
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, proponente_id)
            await self._garantir(conn, guild_id, alvo_id)
            prop = await self._fetchone(
                conn, "SELECT casado_com FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, proponente_id)
            )
            alvo = await self._fetchone(
                conn, "SELECT casado_com FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, alvo_id)
            )
            if prop["casado_com"]:
                return "ja_casado"
            if alvo["casado_com"]:
                return "alvo_casado"
            existente = await self._fetchone(
                conn, "SELECT 1 FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?", (guild_id, proponente_id)
            )
            if existente:
                return "pedido_existente"
            if await self._mov(conn, guild_id, proponente_id, -valor, "uniao_pedido", str(alvo_id)) is None:
                return "saldo"
            await conn.execute(
                "INSERT INTO pedidos_uniao (guild_id, proponente_id, alvo_id, valor, criado_em, expira_em) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, proponente_id, alvo_id, valor, agora(), expira_em),
            )
            return "ok"

    async def aceitar_uniao(self, guild_id: int, alvo_id: int, proponente_id: int) -> str:
        """'ok' | 'sem_pedido' | 'expirado' | 'indisponivel'. Em qualquer falha o valor é devolvido."""
        async with self._tx() as conn:
            pedido = await self._fetchone(
                conn,
                "SELECT * FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ? AND alvo_id = ?",
                (guild_id, proponente_id, alvo_id),
            )
            if pedido is None:
                return "sem_pedido"
            await conn.execute(
                "DELETE FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?", (guild_id, proponente_id)
            )
            if pedido["expira_em"] <= agora():
                await self._reembolsar_pedido(conn, pedido, "uniao_expirado")
                return "expirado"
            await self._garantir(conn, guild_id, proponente_id)
            await self._garantir(conn, guild_id, alvo_id)
            prop = await self._fetchone(
                conn, "SELECT casado_com FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, proponente_id)
            )
            alvo = await self._fetchone(
                conn, "SELECT casado_com FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, alvo_id)
            )
            if prop["casado_com"] or alvo["casado_com"]:
                await self._reembolsar_pedido(conn, pedido, "uniao_indisponivel")
                return "indisponivel"
            agora_ts = agora()
            await conn.execute(
                "UPDATE perfis SET casado_com = ?, casado_desde = ? WHERE guild_id = ? AND user_id = ?",
                (alvo_id, agora_ts, guild_id, proponente_id),
            )
            await conn.execute(
                "UPDATE perfis SET casado_com = ?, casado_desde = ? WHERE guild_id = ? AND user_id = ?",
                (proponente_id, agora_ts, guild_id, alvo_id),
            )
            # Outros pedidos que envolvem qualquer um dos dois caem, com reembolso.
            outros = await self._fetchall(
                conn,
                "SELECT * FROM pedidos_uniao WHERE guild_id = ? AND "
                "(proponente_id IN (?, ?) OR alvo_id IN (?, ?))",
                (guild_id, proponente_id, alvo_id, proponente_id, alvo_id),
            )
            for outro in outros:
                await conn.execute(
                    "DELETE FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?",
                    (guild_id, outro["proponente_id"]),
                )
                await self._reembolsar_pedido(conn, outro, "uniao_cancelado_automatico")
            return "ok"

    async def recusar_uniao(self, guild_id: int, alvo_id: int, proponente_id: int) -> Optional[int]:
        """Recusa e devolve o valor. Retorna o valor devolvido, ou None se não havia pedido."""
        async with self._tx() as conn:
            pedido = await self._fetchone(
                conn,
                "SELECT * FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ? AND alvo_id = ?",
                (guild_id, proponente_id, alvo_id),
            )
            if pedido is None:
                return None
            await conn.execute(
                "DELETE FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?", (guild_id, proponente_id)
            )
            await self._reembolsar_pedido(conn, pedido, "uniao_recusado")
            return pedido["valor"]

    async def cancelar_pedido_uniao(self, guild_id: int, proponente_id: int) -> Optional[int]:
        async with self._tx() as conn:
            pedido = await self._fetchone(
                conn, "SELECT * FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?", (guild_id, proponente_id)
            )
            if pedido is None:
                return None
            await conn.execute(
                "DELETE FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?", (guild_id, proponente_id)
            )
            await self._reembolsar_pedido(conn, pedido, "uniao_cancelado")
            return pedido["valor"]

    async def expirar_pedidos_uniao(self) -> list[dict[str, int]]:
        """Devolve o valor de todos os pedidos vencidos. Retorna o que foi expirado."""
        async with self._tx() as conn:
            vencidos = await self._fetchall(conn, "SELECT * FROM pedidos_uniao WHERE expira_em <= ?", (agora(),))
            saida = []
            for pedido in vencidos:
                await conn.execute(
                    "DELETE FROM pedidos_uniao WHERE guild_id = ? AND proponente_id = ?",
                    (pedido["guild_id"], pedido["proponente_id"]),
                )
                await self._reembolsar_pedido(conn, pedido, "uniao_expirado")
                saida.append(
                    {
                        "guild_id": pedido["guild_id"],
                        "proponente_id": pedido["proponente_id"],
                        "alvo_id": pedido["alvo_id"],
                        "valor": pedido["valor"],
                    }
                )
            return saida

    async def desfazer_uniao(self, guild_id: int, user_id: int) -> Optional[int]:
        """Desfaz a união. Retorna o ID do parceiro, ou None se não havia união."""
        async with self._tx() as conn:
            await self._garantir(conn, guild_id, user_id)
            perfil = await self._fetchone(
                conn, "SELECT casado_com FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            parceiro = perfil["casado_com"]
            if not parceiro:
                return None
            await conn.execute(
                "UPDATE perfis SET casado_com = NULL, casado_desde = NULL WHERE guild_id = ? AND user_id IN (?, ?)",
                (guild_id, user_id, parceiro),
            )
            return parceiro

    # ------------------------------------------------------------------ jogos (aposta em custódia)
    async def iniciar_jogo(self, guild_id: int, user_id: int, jogo: str, aposta: int) -> str:
        """'ok' | 'saldo' | 'em_andamento'. Debita e registra o jogo pendente na MESMA transação."""
        async with self._tx() as conn:
            existente = await self._fetchone(
                conn,
                "SELECT 1 FROM jogos_pendentes WHERE guild_id = ? AND user_id = ? AND jogo = ?",
                (guild_id, user_id, jogo),
            )
            if existente:
                return "em_andamento"
            if await self._mov(conn, guild_id, user_id, -aposta, f"{jogo}_aposta") is None:
                return "saldo"
            await conn.execute(
                "INSERT INTO jogos_pendentes (guild_id, user_id, jogo, aposta, criado_em) VALUES (?, ?, ?, ?, ?)",
                (guild_id, user_id, jogo, aposta, agora()),
            )
            return "ok"

    async def finalizar_jogo(self, guild_id: int, user_id: int, jogo: str, premio: int, tipo: str) -> Optional[int]:
        """Encerra o jogo pendente e paga o prêmio (se > 0). Idempotente: só a 1ª chamada paga.

        Retorna o saldo novo, ou None se o jogo já tinha sido encerrado.
        """
        async with self._tx() as conn:
            cur = await conn.execute(
                "DELETE FROM jogos_pendentes WHERE guild_id = ? AND user_id = ? AND jogo = ?", (guild_id, user_id, jogo)
            )
            removidas = cur.rowcount
            await cur.close()
            if removidas != 1:
                return None
            if premio > 0:
                return await self._mov(conn, guild_id, user_id, premio, tipo)
            linha = await self._fetchone(
                conn, "SELECT saldo FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            return linha["saldo"]

    async def reembolsar_jogos_pendentes(self) -> list[tuple[int, int, int]]:
        """Chamado na inicialização: devolve apostas de jogos interrompidos por reinício."""
        async with self._tx() as conn:
            linhas = await self._fetchall(conn, "SELECT guild_id, user_id, jogo, aposta FROM jogos_pendentes")
            saida = []
            for linha in linhas:
                await self._mov(
                    conn, linha["guild_id"], linha["user_id"], linha["aposta"], f"{linha['jogo']}_reembolso", "reinicio"
                )
                saida.append((linha["guild_id"], linha["user_id"], linha["aposta"]))
            await conn.execute("DELETE FROM jogos_pendentes")
            return saida

    # ------------------------------------------------------------------ moderação (casos)
    async def criar_caso(
        self, guild_id: int, tipo: str, alvo_id: int, mod_id: int, motivo: str, duracao_s: Optional[int] = None
    ) -> int:
        async with self._tx() as conn:
            linha = await self._fetchone(
                conn, "SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM casos WHERE guild_id = ?", (guild_id,)
            )
            numero = linha["n"]
            await conn.execute(
                "INSERT INTO casos (guild_id, numero, tipo, alvo_id, mod_id, motivo, duracao_s, criado_em) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (guild_id, numero, tipo, alvo_id, mod_id, motivo, duracao_s, agora()),
            )
        return numero

    async def obter_caso(self, guild_id: int, numero: int):
        return await self._um("SELECT * FROM casos WHERE guild_id = ? AND numero = ?", (guild_id, numero))

    async def casos_do_alvo(self, guild_id: int, alvo_id: int, limite: int = 15):
        return await self._todos(
            "SELECT * FROM casos WHERE guild_id = ? AND alvo_id = ? ORDER BY numero DESC LIMIT ?",
            (guild_id, alvo_id, limite),
        )

    async def contar_avisos_ativos(self, guild_id: int, alvo_id: int) -> int:
        linha = await self._um(
            "SELECT COUNT(*) AS n FROM casos WHERE guild_id = ? AND alvo_id = ? AND tipo = 'warn' AND ativo = 1",
            (guild_id, alvo_id),
        )
        return linha["n"]

    async def desativar_aviso(self, guild_id: int, numero: int) -> bool:
        n = await self._exec(
            "UPDATE casos SET ativo = 0 WHERE guild_id = ? AND numero = ? AND tipo = 'warn' AND ativo = 1",
            (guild_id, numero),
        )
        return n == 1

    # ------------------------------------------------------------------ tickets
    async def criar_ticket(self, guild_id: int, canal_id: int, autor_id: int, categoria: str) -> Optional[int]:
        """Cria o registro. Retorna o ID, ou None se a pessoa já tem ticket aberto nessa categoria."""
        try:
            async with self._tx() as conn:
                cur = await conn.execute(
                    "INSERT INTO tickets (guild_id, canal_id, autor_id, categoria, criado_em) VALUES (?, ?, ?, ?, ?)",
                    (guild_id, canal_id, autor_id, categoria, agora()),
                )
                ticket_id = cur.lastrowid
                await cur.close()
        except sqlite3.IntegrityError:
            return None
        return ticket_id

    async def ticket_aberto_do_autor(self, guild_id: int, autor_id: int, categoria: str):
        return await self._um(
            "SELECT * FROM tickets WHERE guild_id = ? AND autor_id = ? AND categoria = ? AND status = 'aberto'",
            (guild_id, autor_id, categoria),
        )

    async def obter_ticket_por_canal(self, canal_id: int):
        return await self._um("SELECT * FROM tickets WHERE canal_id = ?", (canal_id,))

    async def assumir_ticket(self, canal_id: int, staff_id: int) -> bool:
        n = await self._exec(
            "UPDATE tickets SET assumido_por = ? WHERE canal_id = ? AND status = 'aberto' AND assumido_por IS NULL",
            (staff_id, canal_id),
        )
        return n == 1

    async def fechar_ticket(self, canal_id: int) -> bool:
        n = await self._exec(
            "UPDATE tickets SET status = 'fechado', fechado_em = ? WHERE canal_id = ? AND status = 'aberto'",
            (agora(), canal_id),
        )
        return n == 1

    async def tickets_para_sla(self, guild_id: int, limite_ts: int):
        return await self._todos(
            "SELECT * FROM tickets WHERE guild_id = ? AND status = 'aberto' AND assumido_por IS NULL "
            "AND sla_avisado = 0 AND criado_em <= ?",
            (guild_id, limite_ts),
        )

    async def marcar_sla_avisado(self, ticket_id: int) -> None:
        await self._exec("UPDATE tickets SET sla_avisado = 1 WHERE id = ?", (ticket_id,))

    @staticmethod
    async def _decidir(conn: aiosqlite.Connection, canal_id: int, categoria: str, resultado: str, staff_id: int) -> bool:
        """Grava a decisão da staff no ticket só se ninguém decidiu antes (dois cliques não valem duas vezes)."""
        cur = await conn.execute(
            "UPDATE tickets SET avaliacao = ?, avaliado_por = ? WHERE canal_id = ? AND categoria = ? AND avaliacao IS NULL",
            (resultado, staff_id, canal_id, categoria),
        )
        mudou = cur.rowcount == 1
        await cur.close()
        return mudou

    async def avaliar_denuncia(self, canal_id: int, aprovada: bool, staff_id: int) -> Optional[int]:
        """Aprova ou rejeita a denúncia do ticket (só a primeira avaliação vale).

        Aprovar soma 1 em 'denuncias' na fidelidade do autor. Retorna o autor, ou None se já tinha sido avaliada.
        """
        async with self._tx() as conn:
            if not await self._decidir(conn, canal_id, "denuncia", "aprovada" if aprovada else "rejeitada", staff_id):
                return None
            ticket = await self._fetchone(conn, "SELECT guild_id, autor_id FROM tickets WHERE canal_id = ?", (canal_id,))
            if aprovada:
                await self._somar_fidelidade(conn, ticket["guild_id"], ticket["autor_id"], "denuncias", 1)
            return ticket["autor_id"]

    async def decidir_rank(self, canal_id: int, promovido: bool, staff_id: int) -> bool:
        """Grava 'promovido' ou 'recusado' no pedido de rank. False se alguém da staff já decidiu."""
        async with self._tx() as conn:
            return await self._decidir(conn, canal_id, "rank", "promovido" if promovido else "recusado", staff_id)

    async def desfazer_decisao_rank(self, canal_id: int) -> None:
        """Libera o pedido de novo (a promoção foi gravada, mas o Discord recusou dar o cargo)."""
        await self._exec(
            "UPDATE tickets SET avaliacao = NULL, avaliado_por = NULL WHERE canal_id = ? AND categoria = 'rank'", (canal_id,)
        )

    # ------------------------------------------------------------------ pérolas (mural de destaques)
    async def obter_perola(self, guild_id: int, msg_id: int) -> Optional[int]:
        linha = await self._um("SELECT perola_msg_id FROM perolas WHERE guild_id = ? AND msg_id = ?", (guild_id, msg_id))
        return linha["perola_msg_id"] if linha else None

    async def registrar_perola(self, guild_id: int, msg_id: int, perola_msg_id: int) -> bool:
        """Registra a pérola. False se outra chamada já registrou (corrida entre reações)."""
        n = await self._exec(
            "INSERT OR IGNORE INTO perolas (guild_id, msg_id, perola_msg_id, criado_em) VALUES (?, ?, ?, ?)",
            (guild_id, msg_id, perola_msg_id, agora()),
        )
        return n == 1

    # ------------------------------------------------------------------ aniversários
    async def definir_aniversario(self, guild_id: int, user_id: int, dia: Optional[int], mes: Optional[int]) -> None:
        if dia is None or mes is None:
            await self._exec("DELETE FROM aniversarios WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
            return
        await self._exec(
            "INSERT INTO aniversarios (guild_id, user_id, dia, mes) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (guild_id, user_id) DO UPDATE SET dia = excluded.dia, mes = excluded.mes",
            (guild_id, user_id, dia, mes),
        )

    async def marcar_aniversario(self, guild_id: int, user_id: int, dia: int, mes: int) -> bool:
        """Marca só se a pessoa ainda não tem data. False se já tinha (mudar é com um admin)."""
        n = await self._exec(
            "INSERT OR IGNORE INTO aniversarios (guild_id, user_id, dia, mes) VALUES (?, ?, ?, ?)",
            (guild_id, user_id, dia, mes),
        )
        return n == 1

    async def obter_aniversario(self, guild_id: int, user_id: int) -> Optional[tuple[int, int]]:
        linha = await self._um("SELECT dia, mes FROM aniversarios WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
        return (linha["dia"], linha["mes"]) if linha else None

    async def aniversariantes(self, guild_id: int, dia: int, mes: int) -> list[int]:
        linhas = await self._todos(
            "SELECT user_id FROM aniversarios WHERE guild_id = ? AND dia = ? AND mes = ?", (guild_id, dia, mes)
        )
        return [linha["user_id"] for linha in linhas]

    async def todos_aniversarios(self, guild_id: int) -> list[tuple[int, int, int]]:
        """(user_id, dia, mes) em ordem de calendário. Quem chama decide a partir de que data mostrar."""
        linhas = await self._todos(
            "SELECT user_id, dia, mes FROM aniversarios WHERE guild_id = ? ORDER BY mes, dia", (guild_id,)
        )
        return [(linha["user_id"], linha["dia"], linha["mes"]) for linha in linhas]

    # ------------------------------------------------------------------ fidelidade (caminho até Helper)
    @staticmethod
    def _checar_tipo(tipo: str) -> None:
        if tipo not in config.FIDELIDADE_TIPOS:
            raise ValueError(f"tipo de fidelidade inválido: {tipo}")

    async def _somar_fidelidade(self, conn: aiosqlite.Connection, guild_id: int, user_id: int, tipo: str, delta: int) -> int:
        """Soma `delta` (pode ser negativo) sem nunca passar de zero. Retorna o valor novo."""
        self._checar_tipo(tipo)
        await conn.execute(
            "INSERT INTO fidelidade (guild_id, user_id, tipo, quantidade) VALUES (?, ?, ?, MAX(0, ?)) "
            "ON CONFLICT(guild_id, user_id, tipo) DO UPDATE SET quantidade = MAX(0, quantidade + ?)",
            (guild_id, user_id, tipo, delta, delta),
        )
        linha = await self._fetchone(
            conn,
            "SELECT quantidade FROM fidelidade WHERE guild_id = ? AND user_id = ? AND tipo = ?",
            (guild_id, user_id, tipo),
        )
        return linha["quantidade"]

    async def somar_fidelidade(self, guild_id: int, user_id: int, tipo: str, delta: int) -> int:
        async with self._tx() as conn:
            return await self._somar_fidelidade(conn, guild_id, user_id, tipo, delta)

    async def definir_fidelidade(self, guild_id: int, user_id: int, tipo: str, valor: int) -> int:
        self._checar_tipo(tipo)
        valor = max(0, valor)
        await self._exec(
            "INSERT INTO fidelidade (guild_id, user_id, tipo, quantidade) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(guild_id, user_id, tipo) DO UPDATE SET quantidade = excluded.quantidade",
            (guild_id, user_id, tipo, valor),
        )
        return valor

    async def fidelidade(self, guild_id: int, user_id: int) -> dict[str, int]:
        """Contadores da pessoa (todos os tipos, 0 quando não há registro)."""
        linhas = await self._todos(
            "SELECT tipo, quantidade FROM fidelidade WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )
        valores = {tipo: 0 for tipo in config.FIDELIDADE_TIPOS}
        valores.update({linha["tipo"]: linha["quantidade"] for linha in linhas if linha["tipo"] in valores})
        return valores

    async def todas_fidelidades(self, guild_id: int) -> dict[int, dict[str, int]]:
        """user_id -> contadores, só de quem tem algum contador acima de zero."""
        linhas = await self._todos(
            "SELECT user_id, tipo, quantidade FROM fidelidade WHERE guild_id = ? AND quantidade > 0", (guild_id,)
        )
        saida: dict[int, dict[str, int]] = {}
        for linha in linhas:
            if linha["tipo"] in config.FIDELIDADE_TIPOS:
                valores = saida.setdefault(linha["user_id"], {tipo: 0 for tipo in config.FIDELIDADE_TIPOS})
                valores[linha["tipo"]] = linha["quantidade"]
        return saida

    async def xp_de(self, guild_id: int, user_ids: Iterable[int]) -> dict[int, int]:
        """XP de várias pessoas de uma vez (quem não tem perfil fica de fora)."""
        ids = list(dict.fromkeys(user_ids))
        if not ids:
            return {}
        marcas = ",".join("?" * len(ids))
        linhas = await self._todos(
            f"SELECT user_id, xp FROM perfis WHERE guild_id = ? AND user_id IN ({marcas})", (guild_id, *ids)
        )
        return {linha["user_id"]: linha["xp"] for linha in linhas}

    # ---- boas-vindas
    async def registrar_entrada(self, guild_id: int, user_id: int, ts: Optional[int] = None) -> bool:
        """Guarda a entrada (para contar boas-vindas) e limpa as entradas velhas do servidor.

        Quem está voltando (já tinha XP aqui ou já foi saudado numa entrada anterior) não rende boas-vindas: False."""
        ts = agora() if ts is None else ts
        async with self._tx() as conn:
            await conn.execute(
                "DELETE FROM entradas_recentes WHERE guild_id = ? AND entrou_em < ?",
                (guild_id, ts - config.BOAS_VINDAS_JANELA),
            )
            voltando = await self._fetchone(
                conn,
                "SELECT 1 FROM perfis WHERE guild_id = ? AND user_id = ? AND xp > 0 "
                "UNION ALL SELECT 1 FROM boas_vindas_dadas WHERE guild_id = ? AND novato_id = ? LIMIT 1",
                (guild_id, user_id, guild_id, user_id),
            )
            if voltando is not None:
                return False
            await conn.execute(
                "INSERT INTO entradas_recentes (guild_id, user_id, entrou_em) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, user_id) DO UPDATE SET entrou_em = excluded.entrou_em",
                (guild_id, user_id, ts),
            )
        return True

    async def novatos_recentes(self, guild_id: int, desde: int) -> list[int]:
        """Quem entrou a partir de `desde` e ainda não saiu."""
        linhas = await self._todos(
            "SELECT user_id FROM entradas_recentes WHERE guild_id = ? AND entrou_em >= ? ORDER BY entrou_em",
            (guild_id, desde),
        )
        return [linha["user_id"] for linha in linhas]

    async def registrar_boas_vindas(self, guild_id: int, membro_id: int, novato_ids: Iterable[int]) -> int:
        """Conta uma boa-vinda por novato ainda não saudado por esse membro. Retorna quantas contaram."""
        contadas = 0
        async with self._tx() as conn:
            for novato_id in dict.fromkeys(novato_ids):
                if novato_id == membro_id:
                    continue
                entrada = await self._fetchone(
                    conn,
                    "SELECT entrou_em FROM entradas_recentes WHERE guild_id = ? AND user_id = ?",
                    (guild_id, novato_id),
                )
                if entrada is None:
                    continue
                cur = await conn.execute(
                    "INSERT OR IGNORE INTO boas_vindas_dadas (guild_id, membro_id, novato_id, entrada_em, criado_em) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (guild_id, membro_id, novato_id, entrada["entrou_em"], agora()),
                )
                contadas += cur.rowcount
                await cur.close()
            if contadas:
                await self._somar_fidelidade(conn, guild_id, membro_id, "boas_vindas", contadas)
        return contadas

    async def registrar_saida(self, guild_id: int, user_id: int, ts: Optional[int] = None) -> list[int]:
        """Tira a pessoa das entradas recentes. Se ela ficou menos que BOAS_VINDAS_SAIDA_MIN, as boas-vindas
        que recebeu deixam de contar. Retorna quem perdeu uma boa-vinda."""
        ts = agora() if ts is None else ts
        async with self._tx() as conn:
            entrada = await self._fetchone(
                conn, "SELECT entrou_em FROM entradas_recentes WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            if entrada is None:
                return []
            await conn.execute("DELETE FROM entradas_recentes WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
            if ts - entrada["entrou_em"] >= config.BOAS_VINDAS_SAIDA_MIN:
                return []
            linhas = await self._fetchall(
                conn,
                "SELECT membro_id FROM boas_vindas_dadas WHERE guild_id = ? AND novato_id = ? AND entrada_em = ?",
                (guild_id, user_id, entrada["entrou_em"]),
            )
            await conn.execute(
                "DELETE FROM boas_vindas_dadas WHERE guild_id = ? AND novato_id = ? AND entrada_em = ?",
                (guild_id, user_id, entrada["entrou_em"]),
            )
            membros = [linha["membro_id"] for linha in linhas]
            for membro_id in membros:
                await self._somar_fidelidade(conn, guild_id, membro_id, "boas_vindas", -1)
            return membros

    async def ultimas_boas_vindas(self, guild_id: int, membro_id: int, limite: int = 8) -> list[tuple[int, int]]:
        """(novato, quando) das últimas boas-vindas que contaram para o membro (para a staff conferir)."""
        linhas = await self._todos(
            "SELECT novato_id, criado_em FROM boas_vindas_dadas WHERE guild_id = ? AND membro_id = ? "
            "ORDER BY criado_em DESC LIMIT ?",
            (guild_id, membro_id, limite),
        )
        return [(linha["novato_id"], linha["criado_em"]) for linha in linhas]

    # ---- publicações (o histórico fica guardado para a staff conferir)
    async def registrar_publicacao(
        self, guild_id: int, user_id: int, canal_id: int, msg_id: int, ts: Optional[int] = None
    ) -> bool:
        """Conta a publicação: no máximo uma a cada PUBLICACAO_INTERVALO e PUBLICACAO_MAX_DIA em 24 h. True se contou."""
        ts = agora() if ts is None else ts
        async with self._tx() as conn:
            recentes = await self._fetchone(
                conn,
                "SELECT COUNT(*) AS n, MAX(criado_em) AS ultima FROM publicacoes "
                "WHERE guild_id = ? AND user_id = ? AND criado_em > ?",
                (guild_id, user_id, ts - 86400),
            )
            if recentes["n"] >= config.PUBLICACAO_MAX_DIA:
                return False
            if recentes["ultima"] is not None and ts - recentes["ultima"] < config.PUBLICACAO_INTERVALO:
                return False
            cur = await conn.execute(
                "INSERT OR IGNORE INTO publicacoes (guild_id, msg_id, canal_id, user_id, criado_em) VALUES (?, ?, ?, ?, ?)",
                (guild_id, msg_id, canal_id, user_id, ts),
            )
            inseriu = cur.rowcount == 1
            await cur.close()
            if inseriu:
                await self._somar_fidelidade(conn, guild_id, user_id, "publicacoes", 1)
            return inseriu

    async def desfazer_publicacoes(self, guild_id: int, msg_ids: Iterable[int], ts: Optional[int] = None) -> list[int]:
        """Publicações apagadas antes de PUBLICACAO_DESCONTA deixam de contar (uma transação só, mesmo em massa).

        Retorna os autores descontados."""
        ids = list(dict.fromkeys(msg_ids))
        if not ids:
            return []
        ts = agora() if ts is None else ts
        marcas = ",".join("?" * len(ids))
        async with self._tx() as conn:
            linhas = await self._fetchall(
                conn,
                f"SELECT msg_id, user_id FROM publicacoes WHERE guild_id = ? AND criado_em > ? AND msg_id IN ({marcas})",
                (guild_id, ts - config.PUBLICACAO_DESCONTA, *ids),
            )
            for linha in linhas:
                await conn.execute("DELETE FROM publicacoes WHERE guild_id = ? AND msg_id = ?", (guild_id, linha["msg_id"]))
                await self._somar_fidelidade(conn, guild_id, linha["user_id"], "publicacoes", -1)
            return [linha["user_id"] for linha in linhas]

    async def ultimas_publicacoes(self, guild_id: int, user_id: int, limite: int = 8) -> list[tuple[int, int, int]]:
        """(canal, mensagem, quando) das últimas publicações que contaram (para a staff conferir)."""
        linhas = await self._todos(
            "SELECT canal_id, msg_id, criado_em FROM publicacoes WHERE guild_id = ? AND user_id = ? "
            "ORDER BY criado_em DESC LIMIT ?",
            (guild_id, user_id, limite),
        )
        return [(linha["canal_id"], linha["msg_id"], linha["criado_em"]) for linha in linhas]

    # ------------------------------------------------------------------ cérebro (memória da Kiza)
    async def memorias_cerebro(self, guild_id: int, user_id: int, limite: int = 20) -> list[str]:
        linhas = await self._todos(
            "SELECT fato FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?",
            (guild_id, user_id, limite),
        )
        return [linha["fato"] for linha in reversed(linhas)]

    async def lembrar_cerebro(self, guild_id: int, user_id: int, fato: str, maximo: int = 25) -> bool:
        """Guarda um fato (sem duplicar); mantém só os `maximo` mais recentes. True se era novo."""
        async with self._tx() as conn:
            existe = await self._fetchall(
                conn,
                "SELECT 1 FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? AND lower(fato) = lower(?)",
                (guild_id, user_id, fato),
            )
            if existe:
                return False
            await conn.execute(
                "INSERT INTO cerebro_memorias (guild_id, user_id, fato, criado_em) VALUES (?, ?, ?, ?)",
                (guild_id, user_id, fato, agora()),
            )
            await conn.execute(
                "DELETE FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? AND id NOT IN "
                "(SELECT id FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?)",
                (guild_id, user_id, guild_id, user_id, maximo),
            )
            return True

    async def esquecer_cerebro(self, guild_id: int, user_id: int) -> int:
        return await self._exec("DELETE FROM cerebro_memorias WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))

    # ------------------------------------------------------------------ figurinhas
    async def inventario_figurinhas(self, guild_id: int, user_id: int) -> dict[str, int]:
        linhas = await self._todos(
            "SELECT carta_id, quantidade FROM figurinhas WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )
        return {linha["carta_id"]: linha["quantidade"] for linha in linhas}

    async def abrir_figurinha(
        self, guild_id: int, user_id: int, carta_id: str, preco: int, hoje: str, gratis_ligado: bool
    ) -> Optional[dict[str, Any]]:
        """Cobra (ou usa o pacotinho grátis do dia) e entrega a carta, tudo numa transação.

        Retorna None se não deu para pagar. Senão: {nova, quantidade, gratis, saldo}.
        """
        async with self._tx() as conn:
            gratis = False
            if gratis_ligado:
                linha = await self._fetchone(
                    conn, "SELECT dia FROM figurinhas_gratis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
                )
                if linha is None or linha["dia"] != hoje:
                    await conn.execute(
                        "INSERT INTO figurinhas_gratis (guild_id, user_id, dia) VALUES (?, ?, ?) "
                        "ON CONFLICT(guild_id, user_id) DO UPDATE SET dia = excluded.dia",
                        (guild_id, user_id, hoje),
                    )
                    gratis = True
            if gratis:
                await self._garantir(conn, guild_id, user_id)
                perfil = await self._fetchone(
                    conn, "SELECT saldo FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
                )
                saldo = perfil["saldo"]
            else:
                saldo = await self._mov(conn, guild_id, user_id, -preco, "figurinha", carta_id)
                if saldo is None:
                    return None
            atual = await self._fetchone(
                conn,
                "SELECT quantidade FROM figurinhas WHERE guild_id = ? AND user_id = ? AND carta_id = ?",
                (guild_id, user_id, carta_id),
            )
            quantidade = (atual["quantidade"] if atual else 0) + 1
            await conn.execute(
                "INSERT INTO figurinhas (guild_id, user_id, carta_id, quantidade, primeira_em) VALUES (?, ?, ?, 1, ?) "
                "ON CONFLICT(guild_id, user_id, carta_id) DO UPDATE SET quantidade = quantidade + 1",
                (guild_id, user_id, carta_id, agora()),
            )
            return {"nova": atual is None, "quantidade": quantidade, "gratis": gratis, "saldo": saldo}

    async def reivindicar_config(self, guild_id: int, chave: str, novo: str, aceita) -> tuple[bool, Optional[str]]:
        """Lê o valor da config direto do banco e, se `aceita(valor_atual)`, grava `novo` — tudo numa transação exclusiva.

        Serve para duas cópias do bot (deploy novo subindo com o antigo ainda de pé) nunca fazerem a mesma coisa duas vezes.
        Retorna (reivindicou, valor_anterior).
        """
        async with self._tx() as conn:
            linha = await self._fetchone(
                conn, "SELECT valor FROM config_guild WHERE guild_id = ? AND chave = ?", (guild_id, chave)
            )
            atual = linha["valor"] if linha else None
            if not aceita(atual):
                return False, atual
            await conn.execute(
                "INSERT INTO config_guild (guild_id, chave, valor) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, chave) DO UPDATE SET valor = excluded.valor",
                (guild_id, chave, novo),
            )
        self._cfg.pop(guild_id, None)
        return True, atual
