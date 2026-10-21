"""Mixin de `Banco`: conclusões do evento de Halloween "O Último Outono de Hollow" (uma por jogador, a primeira vale)."""
from __future__ import annotations

from typing import Optional

from .util import agora


class HalloweenMixin:
    async def hollow_registrar(self, guild_id: int, nome: str, posicao: int, user_id: Optional[int] = None) -> bool:
        """Guarda a conclusão. True se era nova; repetida (mesmo jogador) não muda nada, só completa o user_id que faltava."""
        norm = self.norm_mc(nome)  # type: ignore[attr-defined]
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute(
                "INSERT OR IGNORE INTO hollow_conclusoes (guild_id, nome_norm, nome, posicao, quando, user_id) VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, norm, nome, posicao, agora(), user_id),
            )
            nova = cur.rowcount > 0
            await cur.close()
            if not nova and user_id is not None:
                await conn.execute(
                    "UPDATE hollow_conclusoes SET user_id = ? WHERE guild_id = ? AND nome_norm = ? AND user_id IS NULL",
                    (user_id, guild_id, norm),
                )
        return nova

    async def hollow_lista(self, guild_id: int, limite: int = 50):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM hollow_conclusoes WHERE guild_id = ? ORDER BY posicao, quando LIMIT ?", (guild_id, limite)
        )
