"""Banco da Kiza: pérolas, aniversários, fidelidade, cérebro, figurinhas. Mixin de `Banco` (veja database/__init__.py)."""
from __future__ import annotations

from typing import Any, Iterable, Optional

import aiosqlite

import config
from .util import agora


class ComunidadeMixin:
    # ------------------------------------------------------------------ pérolas (mural de destaques)
    async def obter_perola(self, guild_id: int, msg_id: int) -> Optional[int]:
        linha = await self._um("SELECT perola_msg_id FROM perolas WHERE guild_id = ? AND msg_id = ?", (guild_id, msg_id))
        return linha["perola_msg_id"] if linha else None

    async def registrar_perola(self, guild_id: int, msg_id: int, perola_msg_id: int) -> bool:
        """Registra a pérola. False se outra chamada já registrou (corrida entre reações)."""
        n = await self._exec(
            "INSERT OR IGNORE INTO perolas (guild_id, msg_id, perola_msg_id, criado_em) VALUES (?, ?, ?, ?)",
            (guild_id, msg_id, perola_msg_id, agora()),
        )
        return n == 1

    # ------------------------------------------------------------------ aniversários
    async def definir_aniversario(self, guild_id: int, user_id: int, dia: Optional[int], mes: Optional[int]) -> None:
        if dia is None or mes is None:
            await self._exec("DELETE FROM aniversarios WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
            return
        await self._exec(
            "INSERT INTO aniversarios (guild_id, user_id, dia, mes) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (guild_id, user_id) DO UPDATE SET dia = excluded.dia, mes = excluded.mes",
            (guild_id, user_id, dia, mes),
        )

    async def marcar_aniversario(self, guild_id: int, user_id: int, dia: int, mes: int) -> bool:
        """Marca só se a pessoa ainda não tem data. False se já tinha (mudar é com um admin)."""
        n = await self._exec(
            "INSERT OR IGNORE INTO aniversarios (guild_id, user_id, dia, mes) VALUES (?, ?, ?, ?)",
            (guild_id, user_id, dia, mes),
        )
        return n == 1

    async def obter_aniversario(self, guild_id: int, user_id: int) -> Optional[tuple[int, int]]:
        linha = await self._um("SELECT dia, mes FROM aniversarios WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
        return (linha["dia"], linha["mes"]) if linha else None

    async def aniversariantes(self, guild_id: int, dia: int, mes: int) -> list[int]:
        linhas = await self._todos(
            "SELECT user_id FROM aniversarios WHERE guild_id = ? AND dia = ? AND mes = ?", (guild_id, dia, mes)
        )
        return [linha["user_id"] for linha in linhas]

    async def todos_aniversarios(self, guild_id: int) -> list[tuple[int, int, int]]:
        """(user_id, dia, mes) em ordem de calendário. Quem chama decide a partir de que data mostrar."""
        linhas = await self._todos(
            "SELECT user_id, dia, mes FROM aniversarios WHERE guild_id = ? ORDER BY mes, dia", (guild_id,)
        )
        return [(linha["user_id"], linha["dia"], linha["mes"]) for linha in linhas]

    # ------------------------------------------------------------------ fidelidade (caminho até Helper)
    @staticmethod
    def _checar_tipo(tipo: str) -> None:
        if tipo not in config.FIDELIDADE_TIPOS:
            raise ValueError(f"tipo de fidelidade inválido: {tipo}")

    async def _somar_fidelidade(self, conn: aiosqlite.Connection, guild_id: int, user_id: int, tipo: str, delta: int) -> int:
        """Soma `delta` (pode ser negativo) sem nunca passar de zero. Retorna o valor novo."""
        self._checar_tipo(tipo)
        await conn.execute(
            "INSERT INTO fidelidade (guild_id, user_id, tipo, quantidade) VALUES (?, ?, ?, MAX(0, ?)) "
            "ON CONFLICT(guild_id, user_id, tipo) DO UPDATE SET quantidade = MAX(0, quantidade + ?)",
            (guild_id, user_id, tipo, delta, delta),
        )
        linha = await self._fetchone(
            conn,
            "SELECT quantidade FROM fidelidade WHERE guild_id = ? AND user_id = ? AND tipo = ?",
            (guild_id, user_id, tipo),
        )
        return linha["quantidade"]

    async def somar_fidelidade(self, guild_id: int, user_id: int, tipo: str, delta: int) -> int:
        async with self._tx() as conn:
            return await self._somar_fidelidade(conn, guild_id, user_id, tipo, delta)

    async def definir_fidelidade(self, guild_id: int, user_id: int, tipo: str, valor: int) -> int:
        self._checar_tipo(tipo)
        valor = max(0, valor)
        await self._exec(
            "INSERT INTO fidelidade (guild_id, user_id, tipo, quantidade) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(guild_id, user_id, tipo) DO UPDATE SET quantidade = excluded.quantidade",
            (guild_id, user_id, tipo, valor),
        )
        return valor

    async def fidelidade(self, guild_id: int, user_id: int) -> dict[str, int]:
        """Contadores da pessoa (todos os tipos, 0 quando não há registro)."""
        linhas = await self._todos(
            "SELECT tipo, quantidade FROM fidelidade WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )
        valores = {tipo: 0 for tipo in config.FIDELIDADE_TIPOS}
        valores.update({linha["tipo"]: linha["quantidade"] for linha in linhas if linha["tipo"] in valores})
        return valores

    async def todas_fidelidades(self, guild_id: int) -> dict[int, dict[str, int]]:
        """user_id -> contadores, só de quem tem algum contador acima de zero."""
        linhas = await self._todos(
            "SELECT user_id, tipo, quantidade FROM fidelidade WHERE guild_id = ? AND quantidade > 0", (guild_id,)
        )
        saida: dict[int, dict[str, int]] = {}
        for linha in linhas:
            if linha["tipo"] in config.FIDELIDADE_TIPOS:
                valores = saida.setdefault(linha["user_id"], {tipo: 0 for tipo in config.FIDELIDADE_TIPOS})
                valores[linha["tipo"]] = linha["quantidade"]
        return saida

    async def xp_de(self, guild_id: int, user_ids: Iterable[int]) -> dict[int, int]:
        """XP de várias pessoas de uma vez (quem não tem perfil fica de fora)."""
        ids = list(dict.fromkeys(user_ids))
        if not ids:
            return {}
        marcas = ",".join("?" * len(ids))
        linhas = await self._todos(
            f"SELECT user_id, xp FROM perfis WHERE guild_id = ? AND user_id IN ({marcas})", (guild_id, *ids)
        )
        return {linha["user_id"]: linha["xp"] for linha in linhas}

    # ---- boas-vindas
    async def registrar_entrada(self, guild_id: int, user_id: int, ts: Optional[int] = None) -> bool:
        """Guarda a entrada (para contar boas-vindas) e limpa as entradas velhas do servidor.

        Quem está voltando (já tinha XP aqui ou já foi saudado numa entrada anterior) não rende boas-vindas: False."""
        ts = agora() if ts is None else ts
        async with self._tx() as conn:
            await conn.execute(
                "DELETE FROM entradas_recentes WHERE guild_id = ? AND entrou_em < ?",
                (guild_id, ts - config.BOAS_VINDAS_JANELA),
            )
            voltando = await self._fetchone(
                conn,
                "SELECT 1 FROM perfis WHERE guild_id = ? AND user_id = ? AND xp > 0 "
                "UNION ALL SELECT 1 FROM boas_vindas_dadas WHERE guild_id = ? AND novato_id = ? LIMIT 1",
                (guild_id, user_id, guild_id, user_id),
            )
            if voltando is not None:
                return False
            await conn.execute(
                "INSERT INTO entradas_recentes (guild_id, user_id, entrou_em) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, user_id) DO UPDATE SET entrou_em = excluded.entrou_em",
                (guild_id, user_id, ts),
            )
        return True

    async def novatos_recentes(self, guild_id: int, desde: int) -> list[int]:
        """Quem entrou a partir de `desde` e ainda não saiu."""
        linhas = await self._todos(
            "SELECT user_id FROM entradas_recentes WHERE guild_id = ? AND entrou_em >= ? ORDER BY entrou_em",
            (guild_id, desde),
        )
        return [linha["user_id"] for linha in linhas]

    async def registrar_boas_vindas(self, guild_id: int, membro_id: int, novato_ids: Iterable[int]) -> int:
        """Conta uma boa-vinda por novato ainda não saudado por esse membro. Retorna quantas contaram."""
        contadas = 0
        async with self._tx() as conn:
            for novato_id in dict.fromkeys(novato_ids):
                if novato_id == membro_id:
                    continue
                entrada = await self._fetchone(
                    conn,
                    "SELECT entrou_em FROM entradas_recentes WHERE guild_id = ? AND user_id = ?",
                    (guild_id, novato_id),
                )
                if entrada is None:
                    continue
                cur = await conn.execute(
                    "INSERT OR IGNORE INTO boas_vindas_dadas (guild_id, membro_id, novato_id, entrada_em, criado_em) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (guild_id, membro_id, novato_id, entrada["entrou_em"], agora()),
                )
                contadas += cur.rowcount
                await cur.close()
            if contadas:
                await self._somar_fidelidade(conn, guild_id, membro_id, "boas_vindas", contadas)
        return contadas

    async def registrar_saida(self, guild_id: int, user_id: int, ts: Optional[int] = None) -> list[int]:
        """Tira a pessoa das entradas recentes. Se ela ficou menos que BOAS_VINDAS_SAIDA_MIN, as boas-vindas
        que recebeu deixam de contar. Retorna quem perdeu uma boa-vinda."""
        ts = agora() if ts is None else ts
        async with self._tx() as conn:
            entrada = await self._fetchone(
                conn, "SELECT entrou_em FROM entradas_recentes WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
            )
            if entrada is None:
                return []
            await conn.execute("DELETE FROM entradas_recentes WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
            if ts - entrada["entrou_em"] >= config.BOAS_VINDAS_SAIDA_MIN:
                return []
            linhas = await self._fetchall(
                conn,
                "SELECT membro_id FROM boas_vindas_dadas WHERE guild_id = ? AND novato_id = ? AND entrada_em = ?",
                (guild_id, user_id, entrada["entrou_em"]),
            )
            await conn.execute(
                "DELETE FROM boas_vindas_dadas WHERE guild_id = ? AND novato_id = ? AND entrada_em = ?",
                (guild_id, user_id, entrada["entrou_em"]),
            )
            membros = [linha["membro_id"] for linha in linhas]
            for membro_id in membros:
                await self._somar_fidelidade(conn, guild_id, membro_id, "boas_vindas", -1)
            return membros

    async def ultimas_boas_vindas(self, guild_id: int, membro_id: int, limite: int = 8) -> list[tuple[int, int]]:
        """(novato, quando) das últimas boas-vindas que contaram para o membro (para a staff conferir)."""
        linhas = await self._todos(
            "SELECT novato_id, criado_em FROM boas_vindas_dadas WHERE guild_id = ? AND membro_id = ? "
            "ORDER BY criado_em DESC LIMIT ?",
            (guild_id, membro_id, limite),
        )
        return [(linha["novato_id"], linha["criado_em"]) for linha in linhas]

    # ---- publicações (o histórico fica guardado para a staff conferir)
    async def registrar_publicacao(
        self, guild_id: int, user_id: int, canal_id: int, msg_id: int, ts: Optional[int] = None
    ) -> bool:
        """Conta a publicação: no máximo uma a cada PUBLICACAO_INTERVALO e PUBLICACAO_MAX_DIA em 24 h. True se contou."""
        ts = agora() if ts is None else ts
        async with self._tx() as conn:
            recentes = await self._fetchone(
                conn,
                "SELECT COUNT(*) AS n, MAX(criado_em) AS ultima FROM publicacoes "
                "WHERE guild_id = ? AND user_id = ? AND criado_em > ?",
                (guild_id, user_id, ts - 86400),
            )
            if recentes["n"] >= config.PUBLICACAO_MAX_DIA:
                return False
            if recentes["ultima"] is not None and ts - recentes["ultima"] < config.PUBLICACAO_INTERVALO:
                return False
            cur = await conn.execute(
                "INSERT OR IGNORE INTO publicacoes (guild_id, msg_id, canal_id, user_id, criado_em) VALUES (?, ?, ?, ?, ?)",
                (guild_id, msg_id, canal_id, user_id, ts),
            )
            inseriu = cur.rowcount == 1
            await cur.close()
            if inseriu:
                await self._somar_fidelidade(conn, guild_id, user_id, "publicacoes", 1)
            return inseriu

    async def desfazer_publicacoes(self, guild_id: int, msg_ids: Iterable[int], ts: Optional[int] = None) -> list[int]:
        """Publicações apagadas antes de PUBLICACAO_DESCONTA deixam de contar (uma transação só, mesmo em massa).

        Retorna os autores descontados."""
        ids = list(dict.fromkeys(msg_ids))
        if not ids:
            return []
        ts = agora() if ts is None else ts
        marcas = ",".join("?" * len(ids))
        async with self._tx() as conn:
            linhas = await self._fetchall(
                conn,
                f"SELECT msg_id, user_id FROM publicacoes WHERE guild_id = ? AND criado_em > ? AND msg_id IN ({marcas})",
                (guild_id, ts - config.PUBLICACAO_DESCONTA, *ids),
            )
            for linha in linhas:
                await conn.execute("DELETE FROM publicacoes WHERE guild_id = ? AND msg_id = ?", (guild_id, linha["msg_id"]))
                await self._somar_fidelidade(conn, guild_id, linha["user_id"], "publicacoes", -1)
            return [linha["user_id"] for linha in linhas]

    async def ultimas_publicacoes(self, guild_id: int, user_id: int, limite: int = 8) -> list[tuple[int, int, int]]:
        """(canal, mensagem, quando) das últimas publicações que contaram (para a staff conferir)."""
        linhas = await self._todos(
            "SELECT canal_id, msg_id, criado_em FROM publicacoes WHERE guild_id = ? AND user_id = ? "
            "ORDER BY criado_em DESC LIMIT ?",
            (guild_id, user_id, limite),
        )
        return [(linha["canal_id"], linha["msg_id"], linha["criado_em"]) for linha in linhas]

    # ------------------------------------------------------------------ cérebro (memória da Kiza)
    async def memorias_cerebro(self, guild_id: int, user_id: int, limite: int = 20) -> list[str]:
        linhas = await self._todos(
            "SELECT fato FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?",
            (guild_id, user_id, limite),
        )
        return [linha["fato"] for linha in reversed(linhas)]

    async def lembrar_cerebro(self, guild_id: int, user_id: int, fato: str, maximo: int = 25) -> bool:
        """Guarda um fato (sem duplicar); mantém só os `maximo` mais recentes. True se era novo."""
        async with self._tx() as conn:
            existe = await self._fetchall(
                conn,
                "SELECT 1 FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? AND lower(fato) = lower(?)",
                (guild_id, user_id, fato),
            )
            if existe:
                return False
            await conn.execute(
                "INSERT INTO cerebro_memorias (guild_id, user_id, fato, criado_em) VALUES (?, ?, ?, ?)",
                (guild_id, user_id, fato, agora()),
            )
            await conn.execute(
                "DELETE FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? AND id NOT IN "
                "(SELECT id FROM cerebro_memorias WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?)",
                (guild_id, user_id, guild_id, user_id, maximo),
            )
            return True

    async def esquecer_cerebro(self, guild_id: int, user_id: int) -> int:
        return await self._exec("DELETE FROM cerebro_memorias WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))

    # ------------------------------------------------------------------ figurinhas
    async def inventario_figurinhas(self, guild_id: int, user_id: int) -> dict[str, int]:
        linhas = await self._todos(
            "SELECT carta_id, quantidade FROM figurinhas WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )
        return {linha["carta_id"]: linha["quantidade"] for linha in linhas}

    async def abrir_figurinha(
        self, guild_id: int, user_id: int, carta_id: str, preco: int, hoje: str, gratis_ligado: bool
    ) -> Optional[dict[str, Any]]:
        """Cobra (ou usa o pacotinho grátis do dia) e entrega a carta, tudo numa transação.

        Retorna None se não deu para pagar. Senão: {nova, quantidade, gratis, saldo}.
        """
        async with self._tx() as conn:
            gratis = False
            if gratis_ligado:
                linha = await self._fetchone(
                    conn, "SELECT dia FROM figurinhas_gratis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
                )
                if linha is None or linha["dia"] != hoje:
                    await conn.execute(
                        "INSERT INTO figurinhas_gratis (guild_id, user_id, dia) VALUES (?, ?, ?) "
                        "ON CONFLICT(guild_id, user_id) DO UPDATE SET dia = excluded.dia",
                        (guild_id, user_id, hoje),
                    )
                    gratis = True
            if gratis:
                await self._garantir(conn, guild_id, user_id)
                perfil = await self._fetchone(
                    conn, "SELECT saldo FROM perfis WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
                )
                saldo = perfil["saldo"]
            else:
                saldo = await self._mov(conn, guild_id, user_id, -preco, "figurinha", carta_id)
                if saldo is None:
                    return None
            atual = await self._fetchone(
                conn,
                "SELECT quantidade FROM figurinhas WHERE guild_id = ? AND user_id = ? AND carta_id = ?",
                (guild_id, user_id, carta_id),
            )
            quantidade = (atual["quantidade"] if atual else 0) + 1
            await conn.execute(
                "INSERT INTO figurinhas (guild_id, user_id, carta_id, quantidade, primeira_em) VALUES (?, ?, ?, 1, ?) "
                "ON CONFLICT(guild_id, user_id, carta_id) DO UPDATE SET quantidade = quantidade + 1",
                (guild_id, user_id, carta_id, agora()),
            )
            return {"nova": atual is None, "quantidade": quantidade, "gratis": gratis, "saldo": saldo}

    async def reivindicar_config(self, guild_id: int, chave: str, novo: str, aceita) -> tuple[bool, Optional[str]]:
        """Lê o valor da config direto do banco e, se `aceita(valor_atual)`, grava `novo` — tudo numa transação exclusiva.

        Serve para duas cópias do bot (deploy novo subindo com o antigo ainda de pé) nunca fazerem a mesma coisa duas vezes.
        Retorna (reivindicou, valor_anterior).
        """
        async with self._tx() as conn:
            linha = await self._fetchone(
                conn, "SELECT valor FROM config_guild WHERE guild_id = ? AND chave = ?", (guild_id, chave)
            )
            atual = linha["valor"] if linha else None
            if not aceita(atual):
                return False, atual
            await conn.execute(
                "INSERT INTO config_guild (guild_id, chave, valor) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, chave) DO UPDATE SET valor = excluded.valor",
                (guild_id, chave, novo),
            )
        self._cfg.pop(guild_id, None)
        return True, atual
