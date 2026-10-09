"""Acesso ao banco de dados da Kiza (SQLite via aiosqlite).

REGRA DE OURO: este pacote é o ÚNICO que fala com o banco (infra aqui; o resto em mixins por assunto). Os cogs só chamam os métodos
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
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Iterable, Optional

import aiosqlite

from migrations import MIGRACOES

from .comunidade import ComunidadeMixin
from .configuracao import ConfigMixin
from .economia import EconomiaMixin
from .moderacao import ModeracaoMixin
from .util import agora

log = logging.getLogger("kiza.db")


__all__ = ["Banco", "agora"]


class Banco(ConfigMixin, EconomiaMixin, ModeracaoMixin, ComunidadeMixin):
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
