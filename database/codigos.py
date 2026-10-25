"""Mixin de `Banco`: feedback do servidor e códigos de resgate de Caudas.

Um código rende Caudas uma vez por pessoa (`codigos_usos`), respeita validade, limite de usos e dono (o código do feedback é pessoal).
O resgate é uma única transação: confere tudo, grava o uso e credita pela MESMA economia (`_mov`, com registro em `transacoes`).
Anti-brute-force: 5 tentativas erradas por pessoa a cada 10 minutos (vale para o Discord e para o jogo, é o mesmo banco)."""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Optional

from .util import agora

ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sem 0/O/1/I
PREFIXO = "VULPUS"
MAX_ERROS = 5
JANELA_ERROS = 600
VALIDADE_FEEDBACK_DIAS = 90
CARACTERES_MIN_FEEDBACK = 20
CAUDAS_FEEDBACK = 1000
DIAS_NOVO_FEEDBACK = 30


def gerar_codigo() -> str:
    """VULPUS-XXXX-XXXX, legível (sem 0/O/1/I)."""
    sorteio = "".join(secrets.choice(ALFABETO) for _ in range(8))
    return f"{PREFIXO}-{sorteio[:4]}-{sorteio[4:]}"


def normalizar_codigo(bruto: str) -> str:
    """Maiúsculas, sem espaços nas pontas; espaços e _ viram -."""
    return "-".join(bruto.strip().upper().replace("_", " ").split())[:40]


@dataclass(frozen=True)
class ResultadoCodigo:
    """status: ok, nao_existe, inativo, expirou, esgotado, ja_usou, nao_e_seu, muitas, sem_vinculo."""

    status: str
    caudas: int = 0
    saldo: int = 0

    @property
    def ok(self) -> bool:
        return self.status == "ok"


class CodigosMixin:
    # ------------------------------------------------------------------ códigos
    async def codigo_criar(
        self,
        guild_id: int,
        caudas: int,
        *,
        codigo: Optional[str] = None,
        usos_max: int = 1,
        dias_validade: int = 0,
        criado_por: int = 0,
        motivo: str = "",
        dono_id: int = 0,
    ) -> Optional[str]:
        """Cria o código (gera um se vier vazio). None se o código pedido já existe."""
        if caudas <= 0:
            raise ValueError("caudas deve ser positivo")
        async with self._tx() as conn:  # type: ignore[attr-defined]
            return await self._codigo_inserir(conn, guild_id, caudas, codigo, usos_max, dias_validade, criado_por, motivo, dono_id)

    async def _codigo_inserir(
        self, conn, guild_id: int, caudas: int, codigo: Optional[str], usos_max: int, dias_validade: int, criado_por: int, motivo: str, dono_id: int
    ) -> Optional[str]:
        agora_ = agora()
        expira = agora_ + dias_validade * 86400 if dias_validade > 0 else 0
        tentativas = 1 if codigo else 20
        for _ in range(tentativas):
            candidato = normalizar_codigo(codigo) if codigo else gerar_codigo()
            cur = await conn.execute(
                "INSERT OR IGNORE INTO codigos (codigo, guild_id, caudas, usos_max, expira_em, criado_por, criado_em, motivo, dono_id) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (candidato, guild_id, caudas, max(0, usos_max), expira, criado_por, agora_, motivo[:200], dono_id),
            )
            inseriu = cur.rowcount == 1
            await cur.close()
            if inseriu:
                return candidato
        return None

    async def codigo_obter(self, codigo: str):
        return await self._um("SELECT * FROM codigos WHERE codigo = ?", (normalizar_codigo(codigo),))  # type: ignore[attr-defined]

    async def codigo_listar(self, guild_id: int, limite: int = 10, deslocar: int = 0):
        """Ativos (e ainda válidos) primeiro, depois os demais; mais novos primeiro."""
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM codigos WHERE guild_id = ? ORDER BY "
            "(ativo = 1 AND (expira_em = 0 OR expira_em > ?) AND (usos_max = 0 OR usos < usos_max)) DESC, criado_em DESC, codigo LIMIT ? OFFSET ?",
            (guild_id, agora(), limite, deslocar),
        )

    async def codigo_contar(self, guild_id: int) -> int:
        linha = await self._um("SELECT COUNT(*) AS n FROM codigos WHERE guild_id = ?", (guild_id,))  # type: ignore[attr-defined]
        return int(linha["n"])

    async def codigo_desativar(self, guild_id: int, codigo: str) -> bool:
        n = await self._exec(  # type: ignore[attr-defined]
            "UPDATE codigos SET ativo = 0 WHERE guild_id = ? AND codigo = ? AND ativo = 1", (guild_id, normalizar_codigo(codigo))
        )
        return n == 1

    async def codigo_usos(self, codigo: str):
        return await self._todos(  # type: ignore[attr-defined]
            "SELECT * FROM codigos_usos WHERE codigo = ? ORDER BY quando", (normalizar_codigo(codigo),)
        )

    # ------------------------------------------------------------------ resgate
    async def codigo_erros_recentes(self, user_id: int) -> int:
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT COUNT(*) AS n FROM codigos_tentativas WHERE user_id = ? AND quando > ?", (user_id, agora() - JANELA_ERROS)
        )
        return int(linha["n"])

    async def resgatar_codigo(self, guild_id: int, user_id: int, mc_nome: str, codigo: str) -> ResultadoCodigo:
        """Resgata atomicamente. Sem conta de Minecraft ligada (`mc_nome` vazio) não gasta o código nem conta como erro."""
        if not (mc_nome or "").strip():
            return ResultadoCodigo("sem_vinculo")
        cod = normalizar_codigo(codigo)
        agora_ = agora()
        async with self._tx() as conn:  # type: ignore[attr-defined]
            await conn.execute("DELETE FROM codigos_tentativas WHERE quando <= ?", (agora_ - JANELA_ERROS,))
            erros = await self._fetchone(  # type: ignore[attr-defined]
                conn, "SELECT COUNT(*) AS n FROM codigos_tentativas WHERE user_id = ?", (user_id,)
            )
            if erros["n"] >= MAX_ERROS:
                return ResultadoCodigo("muitas")
            linha = await self._fetchone(conn, "SELECT * FROM codigos WHERE codigo = ? AND guild_id = ?", (cod, guild_id))  # type: ignore[attr-defined]
            status = "ok"
            if linha is None:
                status = "nao_existe"
            elif linha["dono_id"] and linha["dono_id"] != user_id:
                status = "nao_existe"  # não revela que o código existe nem de quem é
            elif not linha["ativo"]:
                status = "inativo"
            elif linha["expira_em"] and linha["expira_em"] <= agora_:
                status = "expirou"
            elif await self._fetchone(  # type: ignore[attr-defined]
                conn, "SELECT 1 FROM codigos_usos WHERE codigo = ? AND user_id = ?", (cod, user_id)
            ):
                status = "ja_usou"
            elif linha["usos_max"] and linha["usos"] >= linha["usos_max"]:
                status = "esgotado"
            if status != "ok":
                if status == "nao_existe":
                    await conn.execute("INSERT INTO codigos_tentativas (user_id, quando) VALUES (?, ?)", (user_id, agora_))
                return ResultadoCodigo(status)
            # um UPDATE condicional garante o limite de usos mesmo com pedidos simultâneos
            cur = await conn.execute(
                "UPDATE codigos SET usos = usos + 1 WHERE codigo = ? AND (usos_max = 0 OR usos < usos_max)", (cod,)
            )
            afetadas = cur.rowcount
            await cur.close()
            if afetadas != 1:
                return ResultadoCodigo("esgotado")
            await conn.execute(
                "INSERT INTO codigos_usos (codigo, user_id, mc_nome, quando) VALUES (?, ?, ?, ?)", (cod, user_id, mc_nome[:40], agora_)
            )
            saldo = await self._mov(conn, guild_id, user_id, int(linha["caudas"]), "codigo", cod)  # type: ignore[attr-defined]
            return ResultadoCodigo("ok", int(linha["caudas"]), int(saldo))

    # ------------------------------------------------------------------ feedback
    async def feedback_ultimo(self, guild_id: int, user_id: int):
        return await self._um(  # type: ignore[attr-defined]
            "SELECT * FROM feedbacks WHERE guild_id = ? AND user_id = ? ORDER BY criado_em DESC, id DESC LIMIT 1", (guild_id, user_id)
        )

    async def feedback_ja_ganhou_codigo(self, guild_id: int, user_id: int) -> bool:
        linha = await self._um(  # type: ignore[attr-defined]
            "SELECT 1 FROM feedbacks WHERE guild_id = ? AND user_id = ? AND codigo IS NOT NULL LIMIT 1", (guild_id, user_id)
        )
        return linha is not None

    async def feedback_registrar(self, guild_id: int, user_id: int, nota: int, texto: str, melhorar: str) -> int:
        """Grava o feedback (sem código: a staff entrega depois da avaliação no DISBOARD). Retorna o id."""
        async with self._tx() as conn:  # type: ignore[attr-defined]
            cur = await conn.execute(
                "INSERT INTO feedbacks (guild_id, user_id, nota, texto, melhorar, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, user_id, nota, texto, melhorar, agora()),
            )
            novo_id = cur.lastrowid
            await cur.close()
            return int(novo_id)

    async def feedback_pendente(self, guild_id: int, user_id: int):
        """Feedback mais recente que ainda espera código (e não foi recusado). None se a pessoa já recebeu um código antes."""
        if await self.feedback_ja_ganhou_codigo(guild_id, user_id):
            return None
        return await self._um(  # type: ignore[attr-defined]
            "SELECT * FROM feedbacks WHERE guild_id = ? AND user_id = ? AND codigo IS NULL AND recusado_em = 0 "
            "ORDER BY criado_em DESC, id DESC LIMIT 1",
            (guild_id, user_id),
        )

    async def feedback_entregar(
        self, guild_id: int, user_id: int, staff_id: int, caudas: int = CAUDAS_FEEDBACK
    ) -> Optional[tuple[str, bool]]:
        """Entrega o código pessoal (1 uso, só deste usuário, 90 dias). Segunda chamada devolve o MESMO código.
        Retorna (código, novo) ou None se a pessoa nunca mandou feedback."""
        async with self._tx() as conn:  # type: ignore[attr-defined]
            antigo = await self._fetchone(  # type: ignore[attr-defined]
                conn,
                "SELECT codigo FROM feedbacks WHERE guild_id = ? AND user_id = ? AND codigo IS NOT NULL ORDER BY id LIMIT 1",
                (guild_id, user_id),
            )
            if antigo is not None:
                return antigo["codigo"], False
            fb = await self._fetchone(  # type: ignore[attr-defined]
                conn,
                "SELECT id FROM feedbacks WHERE guild_id = ? AND user_id = ? ORDER BY criado_em DESC, id DESC LIMIT 1",
                (guild_id, user_id),
            )
            if fb is None:
                return None
            codigo = await self._codigo_inserir(
                conn, guild_id, caudas, None, 1, VALIDADE_FEEDBACK_DIAS, staff_id, f"Feedback de {user_id}", user_id
            )
            await conn.execute(
                "UPDATE feedbacks SET codigo = ?, codigo_entregue_em = ?, entregue_por = ? WHERE id = ?",
                (codigo, agora(), staff_id, fb["id"]),
            )
            return str(codigo), True

    async def feedback_recusar(self, guild_id: int, user_id: int) -> int:
        """Marca os feedbacks pendentes como recusados. Retorna quantos."""
        return await self._exec(  # type: ignore[attr-defined]
            "UPDATE feedbacks SET recusado_em = ? WHERE guild_id = ? AND user_id = ? AND codigo IS NULL AND recusado_em = 0",
            (agora(), guild_id, user_id),
        )
