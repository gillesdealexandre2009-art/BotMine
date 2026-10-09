"""Banco da Kiza: perfis, XP, economia (livro-razão), união de toca e jogos. Mixin de `Banco` (veja database/__init__.py)."""
from __future__ import annotations

from typing import Optional

import aiosqlite

from .util import agora


class EconomiaMixin:
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
