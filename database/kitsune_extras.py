"""Mixin de `Banco`: votações leves dos Kitsunes (só quem tem o selo vota; um voto por pessoa, que pode mudar até o fim)."""
from __future__ import annotations

import json
from typing import Optional

from .util import agora


class KitsuneExtrasMixin:
    async def votacao_criar(self, guild_id: int, canal_id: int, titulo: str, opcoes: list[str], criada_por: int, encerra_em: int) -> int:
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute(
                "INSERT INTO votacoes (guild_id, canal_id, titulo, opcoes, criada_por, criada_em, encerra_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (guild_id, canal_id, titulo, json.dumps(opcoes, ensure_ascii=False), criada_por, agora(), encerra_em),
            )
            novo = cur.lastrowid
            await cur.close()
            return int(novo or 0)

    async def votacao_mensagem(self, votacao_id: int, mensagem_id: int) -> None:
        await self._exec("UPDATE votacoes SET mensagem_id = ? WHERE id = ?", (mensagem_id, votacao_id))  # type: ignore[attr-defined]

    async def votacao_obter(self, votacao_id: int):
        return await self._um("SELECT * FROM votacoes WHERE id = ?", (votacao_id,))  # type: ignore[attr-defined]

    async def votar(self, votacao_id: int, user_id: int, opcao: int) -> str:
        """'ok' (voto novo), 'mudou' (trocou de opção), 'igual', 'encerrada' ou 'inexistente'. Tudo na mesma transação."""
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute("SELECT opcoes, encerra_em, encerrada FROM votacoes WHERE id = ?", (votacao_id,))
            v = await cur.fetchone()
            await cur.close()
            if v is None:
                return "inexistente"
            if int(v["encerrada"]) or int(v["encerra_em"]) <= agora():
                return "encerrada"
            if not 0 <= opcao < len(json.loads(v["opcoes"])):
                return "inexistente"
            cur = await conn.execute("SELECT opcao FROM votos WHERE votacao_id = ? AND user_id = ?", (votacao_id, user_id))
            antes = await cur.fetchone()
            await cur.close()
            if antes is not None and int(antes["opcao"]) == opcao:
                return "igual"
            await conn.execute(
                "INSERT INTO votos (votacao_id, user_id, opcao) VALUES (?, ?, ?) "
                "ON CONFLICT (votacao_id, user_id) DO UPDATE SET opcao = excluded.opcao",
                (votacao_id, user_id, opcao),
            )
            return "ok" if antes is None else "mudou"

    async def votos_contagem(self, votacao_id: int) -> dict[int, int]:
        linhas = await self._todos(  # type: ignore[attr-defined]
            "SELECT opcao, COUNT(*) AS n FROM votos WHERE votacao_id = ? GROUP BY opcao", (votacao_id,)
        )
        return {int(r["opcao"]): int(r["n"]) for r in linhas}

    async def votacoes_vencidas(self, ts: Optional[int] = None):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM votacoes WHERE encerrada = 0 AND encerra_em <= ?", (agora() if ts is None else ts,)
        )

    async def votacao_encerrar(self, votacao_id: int) -> bool:
        """Fecha uma vez só. False se já estava fechada."""
        n = await self._exec("UPDATE votacoes SET encerrada = 1 WHERE id = ? AND encerrada = 0", (votacao_id,))  # type: ignore[attr-defined]
        return n == 1
