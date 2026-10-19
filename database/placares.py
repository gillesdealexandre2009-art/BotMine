"""Mixin de `Banco`: tempo em call (qualquer sala de voz) e tempo de jogo no Minecraft, para os placares do canal #placares.

Tempo de jogo: o jogo avisa quem está online a cada minuto (/mc/status). Cada aviso soma o tempo desde o anterior à pessoa; se passou
tempo demais entre dois avisos (servidor caiu, ela saiu e voltou), começa uma sessão nova. A "maior sessão" é a maior sequência assim."""
from __future__ import annotations

from typing import Iterable

from .util import agora

# Mais que isto entre dois avisos de status = a sessão acabou (o status chega a cada 60 s; sobra folga para um atraso).
LACUNA_SESSAO_S = 240


class PlacaresMixin:
    # ------------------------------------------------------------------ voz
    async def voz_somar(self, guild_id: int, user_ids: Iterable[int], minutos: int = 1) -> None:
        ids = list(user_ids)
        if not ids:
            return
        async with self._tx() as conn:  # type: ignore[attr-defined]
            for uid in ids:
                await conn.execute(
                    "INSERT INTO voz_tempo (guild_id, user_id, minutos) VALUES (?, ?, ?) "
                    "ON CONFLICT (guild_id, user_id) DO UPDATE SET minutos = minutos + excluded.minutos",
                    (guild_id, uid, minutos),
                )

    async def voz_ranking(self, guild_id: int, limite: int = 10):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT user_id, minutos FROM voz_tempo WHERE guild_id = ? AND minutos > 0 ORDER BY minutos DESC, user_id LIMIT ?",
            (guild_id, limite),
        )

    # ------------------------------------------------------------------ jogo
    async def mc_tempo_registrar(self, guild_id: int, nomes: Iterable[tuple[str, str]], agora_s: int | None = None) -> None:
        """`nomes`: (nome normalizado, nome como aparece) de quem está online agora."""
        ts = agora() if agora_s is None else agora_s
        async with self._tx() as conn:  # type: ignore[attr-defined]
            for norm, nome in nomes:
                cur = await conn.execute(
                    "SELECT total_s, sessao_s, maior_s, visto_em FROM mc_tempo WHERE guild_id = ? AND nome_norm = ?", (guild_id, norm)
                )
                linha = await cur.fetchone()
                await cur.close()
                if linha is None:
                    await conn.execute(
                        "INSERT INTO mc_tempo (guild_id, nome_norm, nome, total_s, sessao_s, maior_s, visto_em) VALUES (?, ?, ?, 0, 0, 0, ?)",
                        (guild_id, norm, nome, ts),
                    )
                    continue
                total, sessao, maior, visto = (int(linha[k]) for k in ("total_s", "sessao_s", "maior_s", "visto_em"))
                lacuna = ts - visto
                if 0 <= lacuna <= LACUNA_SESSAO_S:
                    total += lacuna
                    sessao += lacuna
                else:
                    sessao = 0  # sessão nova (ou relógio voltou): não soma o intervalo, que ninguém sabe se a pessoa estava lá
                maior = max(maior, sessao)
                await conn.execute(
                    "UPDATE mc_tempo SET nome = ?, total_s = ?, sessao_s = ?, maior_s = ?, visto_em = ? WHERE guild_id = ? AND nome_norm = ?",
                    (nome, total, sessao, maior, ts, guild_id, norm),
                )

    async def mc_tempo_ranking(self, guild_id: int, coluna: str, limite: int = 10):
        if coluna not in {"total_s", "maior_s"}:
            raise ValueError("coluna inválida")
        return await self._todos(  # type: ignore[attr-defined]
            f"SELECT nome_norm, nome, total_s, maior_s FROM mc_tempo WHERE guild_id = ? AND {coluna} > 0 ORDER BY {coluna} DESC, nome_norm LIMIT ?",
            (guild_id, limite),
        )
