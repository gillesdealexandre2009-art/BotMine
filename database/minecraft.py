"""Banco da Kiza: ponte com o Minecraft (vínculo das contas, códigos, soma idempotente de Caudas e XP, fila do chat).
Mixin de `Banco` (veja database/__init__.py)."""
from __future__ import annotations

from typing import Any, Optional

from .util import agora


class MinecraftMixin:
    @staticmethod
    def norm_mc(nome: str) -> str:
        """Nome de jogador sem caixa nem espaços repetidos (a chave de comparação entre Discord e jogo)."""
        return " ".join(str(nome).casefold().split())

    async def mc_vinculo_de_jogador(self, guild_id: int, mc_id: str, nome: str):
        """Vínculo do jogador: pelo id e, se o id mudou (mundo copiado, outro servidor), pelo nome.

        Quando acha pelo nome com id diferente, atualiza o id e o nome: o vínculo (e o saldo, que é do Discord) não se perdem."""
        norm = self.norm_mc(nome)
        async with self._tx() as conn:
            linha = await self._fetchone(
                conn, "SELECT * FROM mc_vinculos WHERE guild_id = ? AND mc_id = ?", (guild_id, mc_id)
            )
            if linha is None and norm:
                linha = await self._fetchone(
                    conn, "SELECT * FROM mc_vinculos WHERE guild_id = ? AND mc_nome_norm = ?", (guild_id, norm)
                )
            if linha is None:
                return None
            if linha["mc_id"] != mc_id or linha["mc_nome_norm"] != norm:
                novo_nome = nome if norm else linha["mc_nome"]
                novo_norm = norm or linha["mc_nome_norm"]
                # só troca de nome se ninguém mais usa o novo; o id novo nunca colide (é de um jogador novo).
                livre = await self._fetchone(
                    conn,
                    "SELECT 1 FROM mc_vinculos WHERE guild_id = ? AND mc_nome_norm = ? AND user_id != ?",
                    (guild_id, novo_norm, linha["user_id"]),
                )
                if livre is not None:
                    novo_nome, novo_norm = linha["mc_nome"], linha["mc_nome_norm"]
                outro_id = await self._fetchone(
                    conn,
                    "SELECT 1 FROM mc_vinculos WHERE guild_id = ? AND mc_id = ? AND user_id != ?",
                    (guild_id, mc_id, linha["user_id"]),
                )
                id_final = linha["mc_id"] if outro_id is not None else mc_id
                await conn.execute(
                    "UPDATE mc_vinculos SET mc_id = ?, mc_nome = ?, mc_nome_norm = ?, visto_em = ? "
                    "WHERE guild_id = ? AND user_id = ?",
                    (id_final, novo_nome, novo_norm, agora(), guild_id, linha["user_id"]),
                )
                await conn.execute(
                    "UPDATE perfis SET minecraft_uuid = ? WHERE guild_id = ? AND user_id = ?",
                    (id_final, guild_id, linha["user_id"]),
                )
                await conn.execute(
                    "INSERT INTO mc_historico (guild_id, user_id, mc_id, mc_nome, evento, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
                    (guild_id, linha["user_id"], id_final, novo_nome, "atualizado", agora()),
                )
            else:
                await conn.execute(
                    "UPDATE mc_vinculos SET visto_em = ? WHERE guild_id = ? AND user_id = ?",
                    (agora(), guild_id, linha["user_id"]),
                )
            return await self._fetchone(
                conn, "SELECT * FROM mc_vinculos WHERE guild_id = ? AND user_id = ?", (guild_id, linha["user_id"])
            )

    async def mc_vinculo_por_nome(self, guild_id: int, nome: str):
        """Vínculo pelo nome do jogador (só leitura: para enfeitar mensagens, não muda nada)."""
        return await self._um(
            "SELECT * FROM mc_vinculos WHERE guild_id = ? AND mc_nome_norm = ?", (guild_id, self.norm_mc(nome))
        )

    async def mc_vinculo_de_usuario(self, guild_id: int, user_id: int):
        return await self._um("SELECT * FROM mc_vinculos WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))

    async def mc_criar_codigo(self, guild_id: int, mc_id: str, nome: str, ttl: int, codigo_novo: str) -> tuple[str, int]:
        """Código de vínculo do jogador. Se ainda há um vivo, devolve o mesmo (a tela não troca o código a cada consulta)."""
        ts = agora()
        norm = self.norm_mc(nome)
        async with self._tx() as conn:
            await conn.execute("DELETE FROM mc_codigos WHERE guild_id = ? AND expira_em <= ?", (guild_id, ts))
            vivo = await self._fetchone(
                conn, "SELECT codigo, expira_em FROM mc_codigos WHERE guild_id = ? AND mc_id = ?", (guild_id, mc_id)
            )
            if vivo is not None:
                return vivo["codigo"], vivo["expira_em"]
            await conn.execute(
                "INSERT INTO mc_codigos (guild_id, codigo, mc_id, mc_nome, mc_nome_norm, criado_em, expira_em) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (guild_id, codigo_novo, mc_id, nome, norm, ts, ts + ttl),
            )
            return codigo_novo, ts + ttl

    async def mc_codigo_existe(self, guild_id: int, codigo: str) -> bool:
        return await self._um("SELECT 1 FROM mc_codigos WHERE guild_id = ? AND codigo = ?", (guild_id, codigo)) is not None

    async def mc_vincular(self, guild_id: int, user_id: int, codigo: str) -> tuple[str, Optional[str]]:
        """Consome o código e liga a conta. Retorna (resultado, nome do jogador).

        Resultados: "ok", "codigo_invalido" (não existe ou venceu), "ja_vinculado" (a pessoa já tem outra conta do jogo),
        "conta_em_uso" (a conta do jogo já é de outra pessoa)."""
        ts = agora()
        codigo = codigo.strip().upper()
        async with self._tx() as conn:
            linha = await self._fetchone(
                conn,
                "SELECT * FROM mc_codigos WHERE guild_id = ? AND codigo = ? AND expira_em > ?",
                (guild_id, codigo, ts),
            )
            if linha is None:
                return "codigo_invalido", None
            do_usuario = await self._fetchone(
                conn, "SELECT mc_nome FROM mc_vinculos WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            if do_usuario is not None:
                return "ja_vinculado", do_usuario["mc_nome"]
            da_conta = await self._fetchone(
                conn,
                "SELECT 1 FROM mc_vinculos WHERE guild_id = ? AND (mc_id = ? OR mc_nome_norm = ?)",
                (guild_id, linha["mc_id"], linha["mc_nome_norm"]),
            )
            if da_conta is not None:
                return "conta_em_uso", linha["mc_nome"]
            await self._garantir(conn, guild_id, user_id)
            await conn.execute(
                "INSERT INTO mc_vinculos (guild_id, user_id, mc_id, mc_nome, mc_nome_norm, vinculado_em, visto_em) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (guild_id, user_id, linha["mc_id"], linha["mc_nome"], linha["mc_nome_norm"], ts, ts),
            )
            await conn.execute(
                "UPDATE perfis SET minecraft_uuid = ? WHERE guild_id = ? AND user_id = ?", (linha["mc_id"], guild_id, user_id)
            )
            await conn.execute("DELETE FROM mc_codigos WHERE guild_id = ? AND codigo = ?", (guild_id, codigo))
            await conn.execute(
                "INSERT INTO mc_historico (guild_id, user_id, mc_id, mc_nome, evento, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, user_id, linha["mc_id"], linha["mc_nome"], "vinculado", ts),
            )
            return "ok", linha["mc_nome"]

    async def mc_desvincular(self, guild_id: int, user_id: int) -> Optional[str]:
        """Desliga a conta (o saldo e o XP ficam no Discord). Retorna o nome do jogador que estava ligado."""
        async with self._tx() as conn:
            linha = await self._fetchone(
                conn, "SELECT * FROM mc_vinculos WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            if linha is None:
                return None
            await conn.execute("DELETE FROM mc_vinculos WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
            await conn.execute(
                "UPDATE perfis SET minecraft_uuid = NULL WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            await conn.execute(
                "INSERT INTO mc_historico (guild_id, user_id, mc_id, mc_nome, evento, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, user_id, linha["mc_id"], linha["mc_nome"], "desvinculado", agora()),
            )
            return linha["mc_nome"]

    async def mc_aplicar_sync(
        self, guild_id: int, user_id: int, mc_id: str, chave: str, d_caudas: int, d_xp: int
    ) -> dict[str, int]:
        """Soma a diferença que o jogo mandou e devolve o saldo e o XP do Discord (a verdade).

        Idempotente por (mc_id, chave). Débito maior que o saldo leva o saldo a zero (o jogo já deixou a pessoa gastar);
        o XP nunca fica negativo. Cada mudança de saldo entra no livro-razão (transacoes)."""
        async with self._tx() as conn:
            visto = await self._fetchone(
                conn,
                "SELECT saldo_apos, xp_apos FROM mc_sync WHERE guild_id = ? AND mc_id = ? AND chave = ?",
                (guild_id, mc_id, chave),
            )
            if visto is not None:
                perfil = await self._fetchone(
                    conn, "SELECT saldo, xp FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
                )
                return {"saldo": perfil["saldo"], "xp": perfil["xp"], "repetido": 1, "xp_antes": perfil["xp"]}
            await self._garantir(conn, guild_id, user_id)
            perfil = await self._fetchone(
                conn, "SELECT saldo, xp FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            xp_antes = perfil["xp"]
            valor = d_caudas if d_caudas >= 0 else -min(-d_caudas, perfil["saldo"])
            saldo = perfil["saldo"]
            if valor != 0:
                saldo = await self._mov(conn, guild_id, user_id, valor, "minecraft", chave)  # type: ignore[assignment]
            xp = max(0, xp_antes + d_xp)
            if xp != xp_antes:
                await conn.execute("UPDATE perfis SET xp = ? WHERE guild_id = ? AND user_id = ?", (xp, guild_id, user_id))
            await conn.execute(
                "INSERT INTO mc_sync (guild_id, mc_id, chave, user_id, d_caudas, d_xp, saldo_apos, xp_apos, criado_em) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (guild_id, mc_id, chave, user_id, d_caudas, d_xp, saldo, xp, agora()),
            )
            return {"saldo": saldo, "xp": xp, "repetido": 0, "xp_antes": xp_antes}

    async def mc_chat_enfileirar(self, guild_id: int, nome: str, texto: str, limite: int = 200) -> int:
        """Guarda uma mensagem do Discord para o jogo buscar. Mantém só as últimas `limite` (e nada com mais de 1 h)."""
        ts = agora()
        async with self._tx() as conn:
            cur = await conn.execute(
                "INSERT INTO mc_chat (guild_id, nome, texto, criado_em) VALUES (?, ?, ?, ?)", (guild_id, nome, texto, ts)
            )
            novo = cur.lastrowid
            await cur.close()
            await conn.execute("DELETE FROM mc_chat WHERE guild_id = ? AND criado_em < ?", (guild_id, ts - 3600))
            await conn.execute(
                "DELETE FROM mc_chat WHERE guild_id = ? AND id <= ?", (guild_id, (novo or 0) - limite)
            )
            return novo or 0

    async def mc_chat_ultimo(self, guild_id: int) -> int:
        linha = await self._um("SELECT COALESCE(MAX(id), 0) AS m FROM mc_chat WHERE guild_id = ?", (guild_id,))
        return linha["m"]

    async def mc_chat_desde(self, guild_id: int, desde: int, limite: int = 20) -> list[dict[str, Any]]:
        linhas = await self._todos(
            "SELECT id, nome, texto FROM mc_chat WHERE guild_id = ? AND id > ? ORDER BY id LIMIT ?",
            (guild_id, desde, limite),
        )
        return [{"id": linha["id"], "nome": linha["nome"], "texto": linha["texto"]} for linha in linhas]

    # ---- Kitsune controlado pelo jogo
    async def mc_kitsune_registrar(self, guild_id: int, user_id: int, ativo: bool, ate: int):
        """Guarda o que o jogo diz do selo Kitsune da pessoa. Devolve (antes, depois): `antes` é None na primeira vez."""
        async with self._tx() as conn:
            antes = await self._fetchone(
                conn, "SELECT ativo, ate FROM mc_kitsune WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            await conn.execute(
                "INSERT INTO mc_kitsune (guild_id, user_id, ativo, ate, atualizado_em) VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT (guild_id, user_id) DO UPDATE SET ativo = excluded.ativo, ate = excluded.ate, "
                "atualizado_em = excluded.atualizado_em",
                (guild_id, user_id, 1 if ativo else 0, max(0, int(ate)), agora()),
            )
            return (dict(antes) if antes is not None else None), {"ativo": bool(ativo), "ate": max(0, int(ate))}

    async def mc_kitsune_de(self, guild_id: int, user_id: int):
        return await self._um("SELECT * FROM mc_kitsune WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))

    async def mc_kitsune_lista(self, guild_id: int):
        return await self._todos("SELECT * FROM mc_kitsune WHERE guild_id = ? ORDER BY ativo DESC, ate", (guild_id,))

    async def mc_kitsune_vencidos(self, agora_ms: int):
        """Selos com prazo que já passaram e ainda constam como ativos (de todos os servidores)."""
        return await self._todos("SELECT guild_id, user_id FROM mc_kitsune WHERE ativo = 1 AND ate > 0 AND ate <= ?", (agora_ms,))

    async def mc_vinculos_lista(self, guild_id: int):
        return await self._todos("SELECT user_id, mc_nome FROM mc_vinculos WHERE guild_id = ?", (guild_id,))
