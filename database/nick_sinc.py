"""Banco da Kiza: apelido do Discord sincronizado com o jogo (tabela nick_sinc). Mixin de `Banco`."""
from __future__ import annotations

from typing import Optional

from .util import agora


class NickSincMixin:
    async def nick_linha(self, guild_id: int, user_id: int):
        return await self._um("SELECT * FROM nick_sinc WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))

    async def nick_guardar_dados(self, guild_id: int, user_id: int, cla: str, apelido: str) -> bool:
        """Guarda o clã e o apelido que o jogo mandou. Devolve True se mudou (ou se é a primeira vez)."""
        async with self._tx() as conn:
            antes = await self._fetchone(
                conn, "SELECT cla, apelido FROM nick_sinc WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            if antes is None:
                await conn.execute(
                    "INSERT INTO nick_sinc (guild_id, user_id, cla, apelido, atualizado_em) VALUES (?, ?, ?, ?, ?)",
                    (guild_id, user_id, cla, apelido, agora()),
                )
                return True
            if antes["cla"] == cla and antes["apelido"] == apelido:
                return False
            await conn.execute(
                "UPDATE nick_sinc SET cla = ?, apelido = ?, atualizado_em = ? WHERE guild_id = ? AND user_id = ?",
                (cla, apelido, agora(), guild_id, user_id),
            )
            return True

    async def nick_registrar_aplicado(self, guild_id: int, user_id: int, aplicado: str, original: Optional[str]) -> None:
        """O bot mudou o apelido: guarda o que pôs e, na primeira mudança, o que a pessoa tinha antes (original pode ser None)."""
        await self._exec(
            "INSERT INTO nick_sinc (guild_id, user_id, aplicado, guardou, original, atualizado_em) VALUES (?, ?, ?, 1, ?, ?) "
            "ON CONFLICT (guild_id, user_id) DO UPDATE SET aplicado = excluded.aplicado, "
            "original = CASE WHEN nick_sinc.guardou = 1 THEN nick_sinc.original ELSE excluded.original END, guardou = 1",
            (guild_id, user_id, aplicado, original, agora()),
        )

    async def nick_limpar_aplicado(self, guild_id: int, user_id: int) -> None:
        """Restaurou: o bot não tem mais nada aplicado nem original guardado."""
        await self._exec(
            "UPDATE nick_sinc SET aplicado = '', guardou = 0, original = NULL WHERE guild_id = ? AND user_id = ?",
            (guild_id, user_id),
        )

    async def nick_definir_ligado(self, guild_id: int, user_id: int, ligado: bool) -> None:
        await self._exec(
            "INSERT INTO nick_sinc (guild_id, user_id, ligado, atualizado_em) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (guild_id, user_id) DO UPDATE SET ligado = excluded.ligado",
            (guild_id, user_id, 1 if ligado else 0, agora()),
        )

    async def nick_suspender(self, guild_id: int, user_id: int, ate: int) -> None:
        await self._exec(
            "INSERT INTO nick_sinc (guild_id, user_id, suspenso_ate, atualizado_em) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (guild_id, user_id) DO UPDATE SET suspenso_ate = excluded.suspenso_ate",
            (guild_id, user_id, ate, agora()),
        )

    async def nick_com_dados(self, guild_id: int):
        """Quem tem dados do jogo guardados e sincronia ligada (para 'aplicar a todos')."""
        return await self._todos(
            "SELECT user_id FROM nick_sinc WHERE guild_id = ? AND ligado = 1",
            (guild_id,),
        )

    async def nick_com_aplicado(self, guild_id: int):
        """Quem tem apelido aplicado pelo bot (para restaurar quando o dono desliga a sincronia)."""
        return await self._todos("SELECT user_id FROM nick_sinc WHERE guild_id = ? AND guardou = 1", (guild_id,))

    async def nick_guilds_com_aplicado(self):
        rows = await self._todos("SELECT DISTINCT guild_id FROM nick_sinc WHERE guardou = 1")
        return [r["guild_id"] for r in rows]
