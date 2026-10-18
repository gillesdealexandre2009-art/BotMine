"""Mixin de `Banco`: programa "Convide um amigo" (link pessoal por pessoa e quem entrou por cada link).

Cada pessoa entra uma vez só em `convidados` (chave guild + convidado): sair e voltar por outro link não vale de novo.
Um convite só vira "pago" uma vez (atualização condicional), não importa quantas vezes a conferência rode."""
from __future__ import annotations

from typing import Optional

from .util import agora


class ConvitesMixin:
    async def convite_do_usuario(self, guild_id: int, user_id: int):
        return await self._um("SELECT * FROM convites WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))  # type: ignore[attr-defined]

    async def convite_salvar(self, guild_id: int, user_id: int, codigo: str) -> None:
        await self._exec(  # type: ignore[attr-defined]
            "INSERT INTO convites (guild_id, user_id, codigo, criado_em) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (guild_id, user_id) DO UPDATE SET codigo = excluded.codigo, criado_em = excluded.criado_em",
            (guild_id, user_id, codigo, agora()),
        )

    async def convite_dono(self, guild_id: int, codigo: str) -> Optional[int]:
        linha = await self._um("SELECT user_id FROM convites WHERE guild_id = ? AND codigo = ?", (guild_id, codigo))  # type: ignore[attr-defined]
        return int(linha["user_id"]) if linha else None

    async def convidado_registrar(self, guild_id: int, convidado_id: int, convidante_id: int, codigo: str, status: str = "pendente") -> bool:
        """True se é a primeira vez que essa pessoa entra por um convite (as seguintes são ignoradas)."""
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute(
                "INSERT OR IGNORE INTO convidados (guild_id, convidado_id, convidante_id, codigo, entrou_em, status) VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, convidado_id, convidante_id, codigo, agora(), status),
            )
            inseriu = cur.rowcount == 1
            await cur.close()
            return inseriu

    async def convidados_pendentes(self, guild_id: int):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM convidados WHERE guild_id = ? AND status = 'pendente'", (guild_id,)
        )

    async def convidado_fechar(self, guild_id: int, convidado_id: int, status: str) -> bool:
        """Sai de 'pendente' para `status`, uma vez só. False se já tinha sido fechado por outra conferência."""
        n = await self._exec(  # type: ignore[attr-defined]
            "UPDATE convidados SET status = ?, fechado_em = ? WHERE guild_id = ? AND convidado_id = ? AND status = 'pendente'",
            (status, agora(), guild_id, convidado_id),
        )
        return n == 1

    async def convites_pagos_no_mes(self, guild_id: int, convidante_id: int, desde: int) -> int:
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT COUNT(*) AS n FROM convidados WHERE guild_id = ? AND convidante_id = ? AND status = 'pago' AND fechado_em >= ?",
            (guild_id, convidante_id, desde),
        )
        return int(linha["n"])

    async def convites_stats(self, guild_id: int, convidante_id: int) -> dict[str, int]:
        linhas = await self._todos(  # type: ignore[attr-defined]
            "SELECT status, COUNT(*) AS n FROM convidados WHERE guild_id = ? AND convidante_id = ? GROUP BY status",
            (guild_id, convidante_id),
        )
        return {linha["status"]: int(linha["n"]) for linha in linhas}

    async def convites_ranking(self, guild_id: int, limite: int = 10):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT convidante_id, COUNT(*) AS pagos FROM convidados WHERE guild_id = ? AND status = 'pago' "
            "GROUP BY convidante_id ORDER BY pagos DESC, convidante_id LIMIT ?",
            (guild_id, limite),
        )
