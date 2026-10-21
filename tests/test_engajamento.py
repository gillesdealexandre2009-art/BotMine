"""Testes do sistema de engajamento: marcar_ativo, inativos, XP por voz.

Rode com:  pytest tests/test_engajamento.py -q
"""
import asyncio
import time

from database import Banco, agora

G, A, B, C = 1, 100, 200, 300


def rodar(fn):
    return asyncio.run(fn())


async def novo_banco(tmp_path, nome="eng.db") -> Banco:
    banco = Banco(str(tmp_path / nome))
    await banco.conectar()
    return banco


def test_marcar_ativo_registra_timestamp(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.marcar_ativo(G, A, ts=5000)
        rows = await b._todos(
            "SELECT ativo_em FROM perfis WHERE guild_id = ? AND user_id = ?", (G, A)
        )
        await b.fechar()
        return rows[0]["ativo_em"]

    assert rodar(cenario) == 5000


def test_marcar_ativo_nao_retrocede(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.marcar_ativo(G, A, ts=9000)
        await b.marcar_ativo(G, A, ts=3000)
        rows = await b._todos(
            "SELECT ativo_em FROM perfis WHERE guild_id = ? AND user_id = ?", (G, A)
        )
        await b.fechar()
        return rows[0]["ativo_em"]

    assert rodar(cenario) == 9000


def test_inativos_retorna_quem_passou_do_limite(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.marcar_ativo(G, A, ts=1000)
        await b.marcar_ativo(G, B, ts=5000)
        await b.marcar_ativo(G, C, ts=9000)
        resultado = await b.inativos(G, antes_de=6000)
        await b.fechar()
        return [r["user_id"] for r in resultado]

    ids = rodar(cenario)
    assert A in ids
    assert B in ids
    assert C not in ids


def test_inativos_ignora_quem_nunca_foi_ativo(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 10, "teste")
        resultado = await b.inativos(G, antes_de=99999)
        await b.fechar()
        return resultado

    assert rodar(cenario) == []


def test_xp_voz_acumula_com_adicionar_xp(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        antes, depois = await b.adicionar_xp(G, A, 6)
        antes2, depois2 = await b.adicionar_xp(G, A, 6)
        await b.fechar()
        return antes, depois, antes2, depois2

    a1, d1, a2, d2 = rodar(cenario)
    assert a1 == 0
    assert d1 == 6
    assert a2 == 6
    assert d2 == 12
