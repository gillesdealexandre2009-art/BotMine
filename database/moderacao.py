"""Banco da Kiza: moderação (casos), tickets e resumo da semana. Mixin de `Banco` (veja database/__init__.py)."""
from __future__ import annotations

import sqlite3
from typing import Any, Optional

import aiosqlite

from .util import agora


class ModeracaoMixin:
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

    # ------------------------------------------------------------------ resumo da semana (staff)
    async def resumo_semana(self, guild_id: int, desde: int) -> dict[str, Any]:
        """Números da semana para a staff: casos por tipo, quem mais moderou, tickets e recompensas por tipo."""
        casos = await self._todos(
            "SELECT tipo, COUNT(*) AS n FROM casos WHERE guild_id = ? AND criado_em >= ? GROUP BY tipo ORDER BY n DESC",
            (guild_id, desde),
        )
        mods = await self._todos(
            "SELECT mod_id, COUNT(*) AS n FROM casos WHERE guild_id = ? AND criado_em >= ? "
            "GROUP BY mod_id ORDER BY n DESC LIMIT 3",
            (guild_id, desde),
        )
        abertos = await self._um(
            "SELECT COUNT(*) AS n FROM tickets WHERE guild_id = ? AND criado_em >= ?", (guild_id, desde)
        )
        fechados = await self._um(
            "SELECT COUNT(*) AS n FROM tickets WHERE guild_id = ? AND fechado_em >= ?", (guild_id, desde)
        )
        pendentes = await self._um("SELECT COUNT(*) AS n FROM tickets WHERE guild_id = ? AND status = 'aberto'", (guild_id,))
        ajudantes = await self._todos(
            "SELECT assumido_por, COUNT(*) AS n FROM tickets WHERE guild_id = ? AND assumido_por IS NOT NULL "
            "AND criado_em >= ? GROUP BY assumido_por ORDER BY n DESC LIMIT 3",
            (guild_id, desde),
        )
        recompensas = await self._todos(
            "SELECT substr(chave, 1, instr(chave || ':', ':') - 1) AS tipo, COUNT(*) AS n, SUM(valor) AS total "
            "FROM recompensas_unicas WHERE guild_id = ? AND criado_em >= ? GROUP BY tipo ORDER BY n DESC",
            (guild_id, desde),
        )
        return {
            "casos": [(c["tipo"], c["n"]) for c in casos],
            "mods": [(m["mod_id"], m["n"]) for m in mods],
            "tickets_abertos": abertos["n"],
            "tickets_fechados": fechados["n"],
            "tickets_pendentes": pendentes["n"],
            "ajudantes": [(a["assumido_por"], a["n"]) for a in ajudantes],
            "recompensas": [(r["tipo"], r["n"], r["total"] or 0) for r in recompensas],
        }
