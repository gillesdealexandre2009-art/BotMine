"""Fidelidade (caminho até Helper): banco e funções puras.

Rode com:  pytest -q
"""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import discord

import config
import database
from cogs.fidelidade import (
    conta_como_publicacao,
    conta_nova,
    dias_no_servidor,
    eh_saudacao,
    faltando,
    ids_canais,
    novatos_saudados,
    progresso,
)
from database import Banco
from migrations import MIGRACOES
from utils.helpers import permissoes_perigosas

G, A, B, C, N1, N2 = 1, 100, 200, 300, 900, 901
T = 1_000_000  # um "agora" fixo para os testes


def rodar(cenario_fn):
    return asyncio.run(cenario_fn())


async def novo_banco(tmp_path, nome="f.db") -> Banco:
    banco = Banco(str(tmp_path / nome))
    await banco.conectar()
    return banco


# ------------------------------------------------------------------ funções puras
def test_saudacao_sem_acento_nem_maiuscula():
    for texto in ("Bem-vindo!!", "seja BEM VINDA", "boas-vindas, raposa", "Boas Vindas", "bemvinde 🦊"):
        assert eh_saudacao(texto), texto
    for texto in ("oi", "", None, "vindo de longe", "bom dia"):
        assert not eh_saudacao(texto), texto


def test_novatos_saudados_marcando_ou_dizendo_bem_vindo():
    novatos = [N1, N2]
    assert novatos_saudados("oi!", {N1}, novatos) == [N1]  # marcou um: só ele
    assert novatos_saudados("bem-vindos!", set(), novatos) == [N1, N2]  # sem marcar: todos os recentes
    assert novatos_saudados("bem-vindo", {A}, novatos) == [N1, N2]  # marcou alguém que não é novato
    assert novatos_saudados("kkk", set(), novatos) == []
    assert novatos_saudados("bem-vindo", set(), []) == []
    # "bem-vindos" sem marcar ninguém vale só para os últimos que chegaram (anti-farm com várias contas)
    muitos = list(range(1, 11))
    assert novatos_saudados("bem-vindos!", set(), muitos) == muitos[-config.BOAS_VINDAS_GENERICA_MAX:]
    assert novatos_saudados("oi", {1, 2, 3, 4, 5}, muitos) == [1, 2, 3, 4, 5]  # marcando, vale para todos os marcados


def test_conta_nova_nao_rende_boas_vindas():
    agora = datetime(2026, 10, 3, tzinfo=timezone.utc)
    dias = config.BOAS_VINDAS_CONTA_MIN_DIAS
    assert conta_nova(agora - timedelta(days=dias) + timedelta(seconds=1), agora)
    assert not conta_nova(agora - timedelta(days=dias), agora)


def test_cargo_helper_perigoso():
    assert permissoes_perigosas(discord.Permissions(kick_members=True, moderate_members=True)) == []
    assert permissoes_perigosas(discord.Permissions(administrator=True, manage_roles=True)) == [
        "Administrador",
        "Gerenciar Cargos",
    ]


def test_requisitos_e_progresso():
    metas = {"bumps": 10, "boas_vindas": 15, "denuncias": 2, "publicacoes": 5, "nivel": 5}
    tudo = {"bumps": 12, "boas_vindas": 15, "denuncias": 2, "publicacoes": 9, "nivel": 7}
    assert faltando(tudo, metas) == {} and progresso(tudo, metas) == 100
    metade = {"bumps": 5, "boas_vindas": 15, "denuncias": 1, "publicacoes": 5, "nivel": 5}
    assert faltando(metade, metas) == {"bumps": 5, "denuncias": 1}
    assert progresso(metade, metas) == 80  # (0,5 + 1 + 0,5 + 1 + 1) / 5
    assert progresso({}, metas) == 0
    assert faltando({}, {"bumps": 0}) == {} and progresso({}, {"bumps": 0}) == 100  # meta 0 = não exige


def test_dias_no_servidor():
    agora = discord.utils.utcnow()
    assert dias_no_servidor(None) == 0
    assert dias_no_servidor(SimpleNamespace(joined_at=None)) == 0
    assert dias_no_servidor(SimpleNamespace(joined_at=agora - timedelta(days=31, hours=2))) == 31
    assert dias_no_servidor(SimpleNamespace(joined_at=agora + timedelta(minutes=1))) == 0  # relógio adiantado
    metas = {"dias": 30}
    assert faltando({"dias": 12}, metas) == {"dias": 18} and faltando({"dias": 30}, metas) == {}


def test_ids_canais():
    assert ids_canais("1,22, 333") == {1, 22, 333}
    assert ids_canais("") == set() and ids_canais(None) == set()
    assert ids_canais("1,,abc,2") == {1, 2}


def _msg(conteudo="", anexos=()):
    return SimpleNamespace(content=conteudo, attachments=[SimpleNamespace(**a) for a in anexos])


def test_o_que_conta_como_publicacao():
    assert conta_como_publicacao(_msg(anexos=[{"content_type": "image/png", "filename": "a.png"}]))
    assert conta_como_publicacao(_msg(anexos=[{"content_type": "video/mp4", "filename": "v.mp4"}]))
    assert conta_como_publicacao(_msg(anexos=[{"content_type": None, "filename": "FOTO.JPG"}]))
    assert conta_como_publicacao(_msg("olha isso https://youtu.be/x"))
    assert not conta_como_publicacao(_msg("só texto"))
    assert not conta_como_publicacao(_msg(anexos=[{"content_type": "text/plain", "filename": "log.txt"}]))


# ------------------------------------------------------------------ banco
def test_migracao_importa_bumps_antigos(tmp_path, monkeypatch):
    async def cenario():
        monkeypatch.setattr(database, "MIGRACOES", MIGRACOES[:3])
        b = await novo_banco(tmp_path)
        for i, u in enumerate((A, A, B)):
            await b.recompensar_uma_vez(G, f"bump:{i}", u, 0, "bump")
        await b.recompensar_uma_vez(G, "drop:1", C, 10, "drop")
        await b.fechar()
        monkeypatch.setattr(database, "MIGRACOES", MIGRACOES)
        b = await novo_banco(tmp_path)
        versoes = [linha["versao"] for linha in await b._todos("SELECT versao FROM schema_versao")]
        resultado = (await b.fidelidade(G, A))["bumps"], (await b.fidelidade(G, B))["bumps"], await b.fidelidade(G, C)
        await b.fechar()
        return versoes, resultado

    versoes, (a, b, c) = rodar(cenario)
    assert versoes == [1, 2, 3, 4]
    assert (a, b) == (2, 1)
    assert c == {tipo: 0 for tipo in config.FIDELIDADE_TIPOS}


def test_contadores_nunca_negativos_e_tipo_valido(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        um = await b.somar_fidelidade(G, A, "bumps", 3)
        dois = await b.somar_fidelidade(G, A, "bumps", -5)
        tres = await b.definir_fidelidade(G, A, "publicacoes", 7)
        quatro = await b.definir_fidelidade(G, B, "boas_vindas", -2)
        todos = await b.todas_fidelidades(G)
        try:
            await b.somar_fidelidade(G, A, "inventado", 1)
            invalido = False
        except ValueError:
            invalido = True
        await b.fechar()
        return um, dois, tres, quatro, todos, invalido

    um, dois, tres, quatro, todos, invalido = rodar(cenario)
    assert (um, dois, tres, quatro) == (3, 0, 7, 0)
    assert list(todos) == [A] and todos[A]["publicacoes"] == 7  # só quem tem algo acima de zero
    assert invalido


def test_boas_vindas_uma_por_par_e_janela(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.registrar_entrada(G, N1, ts=T)
        await b.registrar_entrada(G, N2, ts=T + 60)
        recentes = await b.novatos_recentes(G, T)
        r1 = await b.registrar_boas_vindas(G, A, [N1, N2])
        r2 = await b.registrar_boas_vindas(G, A, [N1, N2])  # de novo: nada
        r3 = await b.registrar_boas_vindas(G, B, [N1, B])  # outra pessoa conta; ela mesma não
        r4 = await b.registrar_boas_vindas(G, C, [12345])  # não entrou: não conta
        fora = await b.novatos_recentes(G, T + 61)
        # entrada nova bem depois limpa as velhas
        await b.registrar_entrada(G, 777, ts=T + config.BOAS_VINDAS_JANELA + 100)
        depois = await b.novatos_recentes(G, 0)
        valores = (await b.fidelidade(G, A))["boas_vindas"], (await b.fidelidade(G, B))["boas_vindas"]
        await b.fechar()
        return recentes, (r1, r2, r3, r4), fora, depois, valores

    recentes, contagens, fora, depois, valores = rodar(cenario)
    assert recentes == [N1, N2]
    assert contagens == (2, 0, 1, 0)
    assert fora == []
    assert depois == [777]
    assert valores == (2, 1)


def test_quem_volta_nao_rende_boas_vindas(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.adicionar_xp(G, N1, 10)  # já tinha conversado aqui antes
        r1 = await b.registrar_entrada(G, N1, ts=T)
        r2 = await b.registrar_entrada(G, N2, ts=T)
        await b.registrar_boas_vindas(G, A, [N2])
        await b.registrar_saida(G, N2, ts=T + config.BOAS_VINDAS_SAIDA_MIN + 5)  # ficou: a boa-vinda vale
        r3 = await b.registrar_entrada(G, N2, ts=T + 600)  # volta: já foi saudado antes
        recentes = await b.novatos_recentes(G, 0)
        r4 = await b.registrar_boas_vindas(G, B, [N1, N2])
        await b.fechar()
        return (r1, r2, r3), recentes, r4

    entradas, recentes, contadas = rodar(cenario)
    assert entradas == (False, True, False)
    assert recentes == [] and contadas == 0


def test_novato_que_sai_rapido_nao_rende_boas_vindas(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.registrar_entrada(G, N1, ts=T)
        await b.registrar_entrada(G, N2, ts=T)
        await b.registrar_boas_vindas(G, A, [N1, N2])
        await b.registrar_boas_vindas(G, B, [N1])
        rapido = await b.registrar_saida(G, N1, ts=T + config.BOAS_VINDAS_SAIDA_MIN - 1)
        demorado = await b.registrar_saida(G, N2, ts=T + config.BOAS_VINDAS_SAIDA_MIN + 5)
        de_novo = await b.registrar_saida(G, N2, ts=T + 999)  # já saiu: nada
        valores = (await b.fidelidade(G, A))["boas_vindas"], (await b.fidelidade(G, B))["boas_vindas"]
        recentes = await b.novatos_recentes(G, 0)
        await b.fechar()
        return sorted(rapido), demorado, de_novo, valores, recentes

    rapido, demorado, de_novo, valores, recentes = rodar(cenario)
    assert rapido == [A, B]
    assert demorado == [] and de_novo == []
    assert valores == (1, 0)  # A ficou só com a do N2
    assert recentes == []


def test_publicacao_limite_e_desconto(tmp_path):
    K = 50  # canal
    INTERV = config.PUBLICACAO_INTERVALO

    async def cenario():
        b = await novo_banco(tmp_path)
        p1 = await b.registrar_publicacao(G, A, K, 1, ts=T)
        p2 = await b.registrar_publicacao(G, A, K, 2, ts=T + 60)  # antes do intervalo: não conta
        p3 = await b.registrar_publicacao(G, B, K, 3, ts=T + 60)  # outra pessoa: conta
        p4 = await b.registrar_publicacao(G, A, K, 4, ts=T + INTERV)
        p5 = await b.registrar_publicacao(G, A, K, 4, ts=T + 3 * INTERV)  # mesma msg: não
        p6 = await b.registrar_publicacao(G, A, K, 6, ts=T + 3 * INTERV)  # teto de 24 h já batido
        # apagar dentro da janela desconta (mesmo apagando várias de uma vez); depois dela, não
        d1 = await b.desfazer_publicacoes(G, [4, 999], ts=T + INTERV + 10)
        d2 = await b.desfazer_publicacoes(G, [3], ts=T + 60 + config.PUBLICACAO_DESCONTA)
        d3 = await b.desfazer_publicacoes(G, [], ts=T)
        p7 = await b.registrar_publicacao(G, A, K, 7, ts=T + 86400 + 1)  # dia seguinte: conta de novo
        historico = await b.ultimas_publicacoes(G, A)
        valores = (await b.fidelidade(G, A))["publicacoes"], (await b.fidelidade(G, B))["publicacoes"]
        await b.fechar()
        return (p1, p2, p3, p4, p5, p6, p7), (d1, d2, d3), historico, valores

    registros, descontos, historico, valores = rodar(cenario)
    assert registros == (True, False, True, True, False, False, True)
    assert descontos == ([A], [], [])
    assert historico == [(K, 7, T + 86400 + 1), (K, 1, T)]  # o histórico fica para a staff conferir
    assert valores == (2, 1)


def test_denuncia_aprovada_conta_uma_vez(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.criar_ticket(G, 5001, A, "denuncia")
        await b.criar_ticket(G, 5002, A, "duvida")
        await b.criar_ticket(G, 5003, B, "denuncia")
        r1 = await b.avaliar_denuncia(5001, True, 9)
        r2 = await b.avaliar_denuncia(5001, True, 8)  # segundo clique: nada
        r3 = await b.avaliar_denuncia(5002, True, 9)  # não é denúncia
        r4 = await b.avaliar_denuncia(5003, False, 9)  # rejeitada: não conta
        r5 = await b.avaliar_denuncia(5003, True, 9)  # já avaliada
        ticket = await b.obter_ticket_por_canal(5001)
        valores = (await b.fidelidade(G, A))["denuncias"], (await b.fidelidade(G, B))["denuncias"]
        await b.fechar()
        return (r1, r2, r3, r4, r5), (ticket["avaliacao"], ticket["avaliado_por"]), valores

    resultados, avaliacao, valores = rodar(cenario)
    assert resultados == (A, None, None, B, None)
    assert avaliacao == ("aprovada", 9)
    assert valores == (1, 0)


def test_pedido_de_rank_decidido_uma_vez(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.criar_ticket(G, 6001, A, "rank")
        await b.criar_ticket(G, 6002, A, "denuncia")
        r1 = await b.decidir_rank(6001, True, 9)
        r2 = await b.decidir_rank(6001, False, 8)  # outro clique: já decidido
        r3 = await b.decidir_rank(6002, True, 9)  # não é pedido de rank
        await b.desfazer_decisao_rank(6001)  # o Discord recusou o cargo: libera de novo
        r4 = await b.decidir_rank(6001, False, 8)
        ticket = await b.obter_ticket_por_canal(6001)
        await b.fechar()
        return (r1, r2, r3, r4), (ticket["avaliacao"], ticket["avaliado_por"])

    assert rodar(cenario) == ((True, False, False, True), ("recusado", 8))


def test_bump_pago_soma_fidelidade_junto(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        r1 = await b.recompensar_uma_vez(G, "bump:1", A, 30, "bump", fidelidade="bumps")
        r2 = await b.recompensar_uma_vez(G, "bump:1", A, 30, "bump", fidelidade="bumps")  # DISBOARD editou
        bumps = (await b.fidelidade(G, A))["bumps"]
        await b.fechar()
        return r1, r2, bumps

    assert rodar(cenario) == (30, None, 1)


def test_xp_de_varias_pessoas(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.adicionar_xp(G, A, 40)
        await b.adicionar_xp(G, B, 7)
        xp = await b.xp_de(G, [A, B, C])
        vazio = await b.xp_de(G, [])
        await b.fechar()
        return xp, vazio

    assert rodar(cenario) == ({A: 40, B: 7}, {})
