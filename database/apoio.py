"""Mixin de `Banco`: pagamentos por PIX (compra de Kitsune e doações) e metas de arrecadação. Dinheiro sempre em centavos.

Regras de segurança: um pagamento só vira "pago" uma vez (atualização condicional no banco), não importa quantas vezes o provedor
avise; o prazo do Kitsune é calculado dentro da mesma transação (soma ao que a pessoa já tem, sem sobrepor compras)."""
from __future__ import annotations

from typing import Any, Optional

from .util import agora

DIA_MS = 24 * 3600 * 1000
# Pagamento que o provedor ainda pode confirmar depois do prazo que a gente mostrou (o banco do pagador demora às vezes).
TOLERANCIA_S = 15 * 60


class ApoioMixin:
    # ------------------------------------------------------------------ pagamentos
    async def pg_criar(
        self,
        guild_id: int,
        user_id: int,
        tipo: str,
        valor_centavos: int,
        ref: str,
        expira_em: int,
        *,
        meses: int = 0,
        meta_id: Optional[int] = None,
        anonimo: bool = False,
        mensagem: str = "",
    ) -> int:
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute(
                "INSERT INTO pagamentos (guild_id, user_id, tipo, valor_centavos, meses, meta_id, anonimo, mensagem, ref, criado_em, expira_em) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (guild_id, user_id, tipo, valor_centavos, meses, meta_id, 1 if anonimo else 0, mensagem[:200], ref, agora(), expira_em),
            )
            novo = cur.lastrowid
            await cur.close()
            return int(novo or 0)

    async def pg_anexar_provedor(self, pg_id: int, provedor_id: str, copia_cola: str, qr_base64: str) -> None:
        await self._exec(  # type: ignore[attr-defined]
            "UPDATE pagamentos SET provedor_id = ?, copia_cola = ?, qr_base64 = ? WHERE id = ?",
            (str(provedor_id), copia_cola, qr_base64, pg_id),
        )

    async def pg_por_id(self, pg_id: int):
        return await self._um("SELECT * FROM pagamentos WHERE id = ?", (pg_id,))  # type: ignore[attr-defined]

    async def pg_por_ref(self, ref: str):
        return await self._um("SELECT * FROM pagamentos WHERE ref = ?", (ref,))  # type: ignore[attr-defined]

    async def pg_por_provedor(self, provedor_id: str):
        return await self._um("SELECT * FROM pagamentos WHERE provedor_id = ?", (str(provedor_id),))  # type: ignore[attr-defined]

    async def pg_pendente_igual(
        self, guild_id: int, user_id: int, tipo: str, valor_centavos: int, meses: int, meta_id: Optional[int]
    ):
        """Cobrança igual ainda válida (a pessoa clicou duas vezes): reaproveita em vez de criar outra."""
        return await self._um(  # type: ignore[attr-defined]
            "SELECT * FROM pagamentos WHERE guild_id = ? AND user_id = ? AND tipo = ? AND valor_centavos = ? AND meses = ? "
            "AND COALESCE(meta_id, 0) = ? AND status = 'pendente' AND expira_em > ? AND provedor_id IS NOT NULL ORDER BY id DESC LIMIT 1",
            (guild_id, user_id, tipo, valor_centavos, meses, meta_id or 0, agora()),
        )

    async def pg_pendentes_da_pessoa(self, guild_id: int, user_id: int) -> int:
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT COUNT(*) AS n FROM pagamentos WHERE guild_id = ? AND user_id = ? AND status = 'pendente' AND expira_em > ?",
            (guild_id, user_id, agora()),
        )
        return int(linha["n"])

    async def pg_a_conferir(self):
        """Pendentes que o provedor ainda pode confirmar (dentro do prazo mais a tolerância)."""
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM pagamentos WHERE status = 'pendente' AND provedor_id IS NOT NULL AND expira_em + ? > ? ORDER BY id",
            (TOLERANCIA_S, agora()),
        )

    async def pg_expirar(self) -> list[Any]:
        """Marca como expirados os pendentes que passaram do prazo e da tolerância. Devolve as linhas afetadas."""
        async with self._tx() as conn:  # type: ignore[attr-defined]
            linhas = await self._fetchall(  # type: ignore[attr-defined]
                conn, "SELECT * FROM pagamentos WHERE status = 'pendente' AND expira_em + ? <= ?", (TOLERANCIA_S, agora())
            )
            if linhas:
                await conn.execute(
                    "UPDATE pagamentos SET status = 'expirado' WHERE status = 'pendente' AND expira_em + ? <= ?", (TOLERANCIA_S, agora())
                )
            return list(linhas)

    async def pg_cancelar(self, pg_id: int, user_id: int) -> bool:
        n = await self._exec(  # type: ignore[attr-defined]
            "UPDATE pagamentos SET status = 'cancelado' WHERE id = ? AND user_id = ? AND status = 'pendente'", (pg_id, user_id)
        )
        return n > 0

    async def pg_marcar_pago(self, pg_id: int, dias_por_mes: int, agora_ms: int):
        """Marca como pago UMA vez (também vale se o PIX entrou depois do prazo). Devolve a linha já paga, ou None se já estava paga,
        foi cancelada ou não existe. Compra de Kitsune: calcula o fim do prazo somando ao que a pessoa já tem (selo atual e compras
        anteriores), na mesma transação."""
        async with self._tx() as conn:  # type: ignore[attr-defined]
            pg = await self._fetchone(conn, "SELECT * FROM pagamentos WHERE id = ?", (pg_id,))  # type: ignore[attr-defined]
            if pg is None or pg["status"] not in ("pendente", "expirado"):
                return None
            kitsune_ate = 0
            if pg["tipo"] == "kitsune":
                atual = await self._fetchone(  # type: ignore[attr-defined]
                    conn,
                    "SELECT ate FROM mc_kitsune WHERE guild_id = ? AND user_id = ? AND ativo = 1",
                    (pg["guild_id"], pg["user_id"]),
                )
                anterior = await self._fetchone(  # type: ignore[attr-defined]
                    conn,
                    "SELECT COALESCE(MAX(kitsune_ate), 0) AS ate FROM pagamentos WHERE guild_id = ? AND user_id = ? "
                    "AND tipo = 'kitsune' AND status = 'pago'",
                    (pg["guild_id"], pg["user_id"]),
                )
                base = max(agora_ms, int(atual["ate"]) if atual is not None else 0, int(anterior["ate"]))
                kitsune_ate = base + max(1, pg["meses"]) * max(1, dias_por_mes) * DIA_MS
            await conn.execute(
                "UPDATE pagamentos SET status = 'pago', pago_em = ?, kitsune_ate = ? WHERE id = ?", (agora(), kitsune_ate, pg_id)
            )
            return await self._fetchone(conn, "SELECT * FROM pagamentos WHERE id = ?", (pg_id,))  # type: ignore[attr-defined]

    async def pg_marcar_aplicado(self, pg_id: int) -> None:
        await self._exec("UPDATE pagamentos SET aplicado = 1 WHERE id = ?", (pg_id,))  # type: ignore[attr-defined]

    async def pg_nao_aplicados(self):
        """Pagos que o Discord ainda não recebeu (o bot caiu no meio): reaplica ao voltar."""
        return await self._todos("SELECT * FROM pagamentos WHERE status = 'pago' AND aplicado = 0 ORDER BY id")  # type: ignore[attr-defined]

    async def pg_kitsune_pendentes_jogo(self, guild_id: int, user_id: int):
        """Compras de Kitsune já pagas que o jogo ainda não confirmou (vão na resposta do sync)."""
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM pagamentos WHERE guild_id = ? AND user_id = ? AND tipo = 'kitsune' AND status = 'pago' "
            "AND jogo_ok = 0 ORDER BY id",
            (guild_id, user_id),
        )

    async def pg_jogo_ok(self, guild_id: int, user_id: int, ids: list[int]) -> int:
        """O jogo confirmou o selo destas compras. Só vale para compras da própria pessoa."""
        total = 0
        for i in ids[:50]:
            total += await self._exec(  # type: ignore[attr-defined]
                "UPDATE pagamentos SET jogo_ok = 1 WHERE id = ? AND guild_id = ? AND user_id = ? AND tipo = 'kitsune' AND status = 'pago'",
                (int(i), guild_id, user_id),
            )
        return total

    async def pg_da_pessoa(self, guild_id: int, user_id: int, limite: int = 10):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM pagamentos WHERE guild_id = ? AND user_id = ? AND status = 'pago' ORDER BY id DESC LIMIT ?",
            (guild_id, user_id, limite),
        )

    async def pg_recentes(self, guild_id: int, limite: int = 15):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM pagamentos WHERE guild_id = ? AND status = 'pago' ORDER BY id DESC LIMIT ?", (guild_id, limite)
        )

    async def pg_total(self, guild_id: int, desde: int = 0, tipo: Optional[str] = None) -> int:
        """Centavos recebidos (pagos) desde o instante `desde` (ts em segundos)."""
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT COALESCE(SUM(valor_centavos), 0) AS t FROM pagamentos WHERE guild_id = ? AND status = 'pago' AND pago_em >= ? "
            "AND (? IS NULL OR tipo = ?)",
            (guild_id, desde, tipo, tipo),
        )
        return int(linha["t"])

    # ------------------------------------------------------------------ metas
    async def meta_criar(
        self,
        guild_id: int,
        titulo: str,
        alvo_centavos: int,
        descricao: str = "",
        prazo: int = 0,
        *,
        imagem: Optional[bytes] = None,
        imagem_tipo: str = "",
        cor: int = 0,
    ) -> int:
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute(
                "INSERT INTO metas (guild_id, titulo, descricao, alvo_centavos, criada_em, prazo, imagem, imagem_tipo, cor) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (guild_id, titulo[:80], descricao[:300], alvo_centavos, agora(), prazo, imagem, imagem_tipo if imagem else "", cor),
            )
            novo = cur.lastrowid
            await cur.close()
            return int(novo or 0)

    async def meta_por_id(self, guild_id: int, meta_id: int):
        return await self._um("SELECT * FROM metas WHERE id = ? AND guild_id = ?", (meta_id, guild_id))  # type: ignore[attr-defined]

    async def metas_ativas(self, guild_id: int):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM metas WHERE guild_id = ? AND encerrada_em = 0 ORDER BY id", (guild_id,)
        )

    async def metas_encerradas(self, guild_id: int, limite: int = 5):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM metas WHERE guild_id = ? AND encerrada_em > 0 ORDER BY encerrada_em DESC, id DESC LIMIT ?",
            (guild_id, limite),
        )

    async def meta_arrecadado(self, meta_id: int) -> int:
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT COALESCE(SUM(valor_centavos), 0) AS t FROM pagamentos WHERE meta_id = ? AND tipo = 'doacao' AND status = 'pago'",
            (meta_id,),
        )
        return int(linha["t"])

    async def meta_apoiadores(self, meta_id: int) -> int:
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT COUNT(DISTINCT user_id) AS n FROM pagamentos WHERE meta_id = ? AND tipo = 'doacao' AND status = 'pago'",
            (meta_id,),
        )
        return int(linha["n"])

    async def meta_editar(
        self,
        guild_id: int,
        meta_id: int,
        *,
        titulo: Optional[str] = None,
        alvo_centavos: Optional[int] = None,
        descricao: Optional[str] = None,
        prazo: Optional[int] = None,
        imagem: Optional[bytes] = None,
        imagem_tipo: str = "",
        limpar_imagem: bool = False,
        cor: Optional[int] = None,
    ) -> bool:
        campos: list[str] = []
        params: list[Any] = []
        for coluna, valor in (
            ("titulo", titulo[:80] if titulo else None),
            ("alvo_centavos", alvo_centavos),
            ("descricao", descricao[:300] if descricao is not None else None),
            ("prazo", prazo),
            ("cor", cor),
        ):
            if valor is not None:
                campos.append(f"{coluna} = ?")
                params.append(valor)
        if limpar_imagem:
            campos += ["imagem = NULL", "imagem_tipo = ''"]
        elif imagem is not None:
            campos += ["imagem = ?", "imagem_tipo = ?"]
            params += [imagem, imagem_tipo]
        if not campos:
            return False
        params += [meta_id, guild_id]
        return (
            await self._exec(  # type: ignore[attr-defined]
                f"UPDATE metas SET {', '.join(campos)} WHERE id = ? AND guild_id = ? AND encerrada_em = 0", params
            )
            > 0
        )

    async def meta_encerrar(self, guild_id: int, meta_id: int, motivo: str) -> bool:
        return (
            await self._exec(  # type: ignore[attr-defined]
                "UPDATE metas SET encerrada_em = ?, motivo_fim = ? WHERE id = ? AND guild_id = ? AND encerrada_em = 0",
                (agora(), motivo, meta_id, guild_id),
            )
            > 0
        )

    async def metas_vencidas(self):
        """Metas ativas cujo prazo já passou (de todos os servidores)."""
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM metas WHERE encerrada_em = 0 AND prazo > 0 AND prazo <= ?", (agora(),)
        )

    async def doacoes_recentes(self, guild_id: int, limite: int = 5):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM pagamentos WHERE guild_id = ? AND tipo = 'doacao' AND status = 'pago' ORDER BY id DESC LIMIT ?",
            (guild_id, limite),
        )
