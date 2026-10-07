"""Testes do banco: saldo atômico, livro-razão, união, jogos, configuração e tickets.

Rode com:  pytest -q
(Cada teste roda seu cenário com asyncio.run: não precisa de pytest-asyncio.)
"""
import asyncio
import sqlite3

import config
from database import Banco, agora

G, A, B, C = 1, 100, 200, 300


def rodar(cenario_fn):
    return asyncio.run(cenario_fn())


async def novo_banco(tmp_path, nome="t.db") -> Banco:
    banco = Banco(str(tmp_path / nome))
    await banco.conectar()
    return banco


# ------------------------------------------------------------------ infraestrutura
def test_migracoes_idempotentes(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.fechar()
        b = await novo_banco(tmp_path)  # reabrir não reaplica nada
        linhas = await b._todos("SELECT versao FROM schema_versao")
        await b.fechar()
        return [linha["versao"] for linha in linhas]

    assert rodar(cenario) == [1, 2, 3, 4, 5]


def test_backup_consistente(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 77, "teste")
        destino = tmp_path / "bk" / "copia.db"
        await b.backup(str(destino))
        await b.fechar()
        copia = Banco(str(destino))
        await copia.conectar()
        saldo = await copia.saldo(G, A)
        await copia.fechar()
        return saldo

    assert rodar(cenario) == 77


# ------------------------------------------------------------------ economia
def test_debito_atomico_concorrente(tmp_path):
    """20 débitos simultâneos de 10 sobre saldo 100: exatamente 10 passam, saldo termina em 0."""

    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 100, "teste")
        resultados = await asyncio.gather(*[b.debitar(G, A, 10, "teste") for _ in range(20)])
        saldo = await b.saldo(G, A)
        soma = (await b._um("SELECT SUM(valor) AS s FROM transacoes WHERE user_id = ?", (A,)))["s"]
        await b.fechar()
        return sum(r is not None for r in resultados), saldo, soma

    ok, saldo, soma = rodar(cenario)
    assert ok == 10 and saldo == 0 and soma == 0


def test_debito_insuficiente_nao_altera(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 50, "teste")
        r = await b.debitar(G, A, 60, "teste")
        saldo = await b.saldo(G, A)
        n = (await b._um("SELECT COUNT(*) AS n FROM transacoes"))["n"]
        await b.fechar()
        return r, saldo, n

    assert rodar(cenario) == (None, 50, 1)


def test_ledger_imutavel(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 10, "teste")
        erros = 0
        for sql in ("UPDATE transacoes SET valor = 999", "DELETE FROM transacoes"):
            try:
                await b._exec(sql)
            except sqlite3.IntegrityError:
                erros += 1
        await b.fechar()
        return erros

    assert rodar(cenario) == 2


def test_transferencia_conserva_total_e_respeita_saldo(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 100, "teste")
        r1 = await b.transferir(G, A, B, 40)
        r2 = await b.transferir(G, A, B, 100)  # sem saldo
        resultados = await asyncio.gather(*[b.transferir(G, A, C, 30) for _ in range(10)])
        sa, sb, sc = await b.saldo(G, A), await b.saldo(G, B), await b.saldo(G, C)
        await b.fechar()
        return r1, r2, sum(r is not None for r in resultados), sa + sb + sc

    r1, r2, passaram, total = rodar(cenario)
    assert r1 == 60 and r2 is None
    assert passaram == 2  # sobraram 60: dois pagamentos de 30
    assert total == 100


def test_admin_tirar_nunca_negativo(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 30, "teste")
        aplicado, saldo = await b.admin_ajustar(G, A, -500, 1)
        await b.fechar()
        return aplicado, saldo

    assert rodar(cenario) == (-30, 0)


def test_daily_sequencia_e_bonus(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        args = dict(base=100, passo=10, streak_max=7, bonus_pct=0)
        d1 = await b.resgatar_daily(G, A, "2026-01-01", "2025-12-31", **args)
        de_novo = await b.resgatar_daily(G, A, "2026-01-01", "2025-12-31", **args)
        d2 = await b.resgatar_daily(G, A, "2026-01-02", "2026-01-01", **args)
        d3 = await b.resgatar_daily(G, A, "2026-01-05", "2026-01-04", **args)  # pulou dias: reinicia
        d4 = await b.resgatar_daily(G, B, "2026-01-05", "2026-01-04", base=100, passo=10, streak_max=7, bonus_pct=10)
        await b.fechar()
        return d1, de_novo, d2, d3, d4

    d1, de_novo, d2, d3, d4 = rodar(cenario)
    assert d1["valor"] == 100 and d1["streak"] == 1
    assert de_novo is None
    assert d2["valor"] == 110 and d2["streak"] == 2
    assert d3["valor"] == 100 and d3["streak"] == 1
    assert d4["valor"] == 110  # 100 + 10% de bônus


# ------------------------------------------------------------------ união de toca
def test_uniao_cobra_uma_vez_e_aceita(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 5000, "teste")
        futuro = agora() + 3600
        r1 = await b.criar_pedido_uniao(G, A, B, 2000, futuro)
        r2 = await b.criar_pedido_uniao(G, A, B, 2000, futuro)  # repetido: NÃO cobra de novo
        r3 = await b.criar_pedido_uniao(G, A, C, 2000, futuro)  # outro alvo: também não
        saldo_pedido = await b.saldo(G, A)
        aceito = await b.aceitar_uniao(G, B, A)
        pa, pb = await b.obter_perfil(G, A), await b.obter_perfil(G, B)
        saldo_final = await b.saldo(G, A)
        await b.fechar()
        return r1, r2, r3, saldo_pedido, aceito, pa["casado_com"], pb["casado_com"], saldo_final

    r1, r2, r3, saldo_pedido, aceito, ca, cb, saldo_final = rodar(cenario)
    assert (r1, r2, r3) == ("ok", "pedido_existente", "pedido_existente")
    assert saldo_pedido == 3000
    assert aceito == "ok" and ca == B and cb == A
    assert saldo_final == 3000  # o custo foi consumido uma única vez


def test_uniao_devolve_em_recusa_cancelamento_e_expiracao(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        futuro = agora() + 3600
        for quem in (A, B, C):
            await b.creditar(G, quem, 1000, "teste")
        await b.criar_pedido_uniao(G, A, 900, 400, futuro)
        recusado = await b.recusar_uniao(G, 900, A)
        await b.criar_pedido_uniao(G, B, 900, 400, futuro)
        cancelado = await b.cancelar_pedido_uniao(G, B)
        await b.criar_pedido_uniao(G, C, 900, 400, agora() - 1)  # já vencido
        expirados = await b.expirar_pedidos_uniao()
        saldos = [await b.saldo(G, q) for q in (A, B, C)]
        await b.fechar()
        return recusado, cancelado, len(expirados), saldos

    assert rodar(cenario) == (400, 400, 1, [1000, 1000, 1000])


def test_uniao_indisponivel_e_pedidos_concorrentes_reembolsados(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        futuro = agora() + 3600
        for quem in (A, B, C):
            await b.creditar(G, quem, 1000, "teste")
        # A e C pedem B; B aceita A -> o pedido de C cai com reembolso
        await b.criar_pedido_uniao(G, A, B, 300, futuro)
        await b.criar_pedido_uniao(G, C, B, 300, futuro)
        ok = await b.aceitar_uniao(G, B, A)
        saldo_c = await b.saldo(G, C)
        pedido_c = await b.obter_pedido_uniao(G, C)
        # C pede alguém já casado (B) -> recusado antes de cobrar
        alvo_casado = await b.criar_pedido_uniao(G, C, B, 300, futuro)
        # pedido válido, mas o alvo casa antes de aceitar -> 'indisponivel' com reembolso
        await b.criar_pedido_uniao(G, C, 777, 300, futuro)
        await b._exec("UPDATE perfis SET casado_com = 555 WHERE guild_id = ? AND user_id = ?", (G, 777))
        indisponivel = await b.aceitar_uniao(G, 777, C)
        saldo_c_final = await b.saldo(G, C)
        await b.fechar()
        return ok, saldo_c, pedido_c, alvo_casado, indisponivel, saldo_c_final

    ok, saldo_c, pedido_c, alvo_casado, indisponivel, saldo_c_final = rodar(cenario)
    assert ok == "ok" and saldo_c == 1000 and pedido_c is None
    assert alvo_casado == "alvo_casado"
    assert indisponivel == "indisponivel" and saldo_c_final == 1000


def test_desfazer_uniao(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 100, "teste")
        await b.criar_pedido_uniao(G, A, B, 0, agora() + 60)  # custo 0 é válido
        await b.aceitar_uniao(G, B, A)
        parceiro = await b.desfazer_uniao(G, A)
        de_novo = await b.desfazer_uniao(G, A)
        pb = await b.obter_perfil(G, B)
        await b.fechar()
        return parceiro, de_novo, pb["casado_com"]

    assert rodar(cenario) == (B, None, None)


# ------------------------------------------------------------------ jogos
def test_jogo_pagamento_idempotente(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 500, "teste")
        i1 = await b.iniciar_jogo(G, A, "mines", 100)
        i2 = await b.iniciar_jogo(G, A, "mines", 100)
        f1 = await b.finalizar_jogo(G, A, "mines", 250, "mines_premio")
        f2 = await b.finalizar_jogo(G, A, "mines", 250, "mines_premio")  # duplicado: não paga
        saldo = await b.saldo(G, A)
        sem_saldo = await b.iniciar_jogo(G, A, "mines", 10_000)
        await b.fechar()
        return i1, i2, f1, f2, saldo, sem_saldo

    assert rodar(cenario) == ("ok", "em_andamento", 650, None, 650, "saldo")


def test_jogo_pendente_e_reembolsado_no_reinicio(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.creditar(G, A, 500, "teste")
        await b.iniciar_jogo(G, A, "mines", 200)
        assert await b.saldo(G, A) == 300
        reembolsos = await b.reembolsar_jogos_pendentes()
        saldo = await b.saldo(G, A)
        de_novo = await b.reembolsar_jogos_pendentes()
        await b.fechar()
        return reembolsos, saldo, de_novo

    assert rodar(cenario) == ([(G, A, 200)], 500, [])


# ------------------------------------------------------------------ configuração
def test_config_persiste_entre_reinicios(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.set_config(G, "canal_regras", "123")
        await b.definir_ajuste(G, "daily_base", 250)
        await b.definir_cargos_nivel(G, 2, [10, 11])
        await b.definir_cargos_nivel(G, 3, [11])  # 11 muda de nível
        await b.definir_grupo_cargos(G, "cores", [20, 21])
        await b.definir_cargo_xp(G, 10, 30)
        await b.adicionar_regra_canal(G, 5, "reacao_auto", "😂 💀")
        await b.fechar()

        b = await novo_banco(tmp_path)
        resultado = (
            await b.get_config_int(G, "canal_regras"),
            await b.ajuste(G, "daily_base"),
            await b.ajuste(G, "daily_passo"),  # padrão
            await b.ajuste(2, "daily_base"),  # outro servidor: padrão
            await b.cargos_por_nivel(G),
            (await b.grupos_cargos(G))["cores"],
            await b.listar_cargos_xp(G),
            (await b.regras_canal(G))[5],
        )
        await b.set_config(G, "canal_regras", None)
        apagado = await b.get_config_int(G, "canal_regras")
        await b.fechar()
        return resultado, apagado

    (canal, daily, passo, outro, niveis, cores, degraus, regras), apagado = rodar(cenario)
    assert canal == 123 and daily == 250 and passo == config.AJUSTES["daily_passo"][0]
    assert outro == config.AJUSTES["daily_base"][0]
    assert niveis[2] == [10] and niveis[3] == [11]
    assert sorted(cores) == [20, 21] and degraus == [(10, 30)]
    assert regras == {"reacao_auto": "😂 💀"} and apagado is None


# ------------------------------------------------------------------ moderação, xp e tickets
def test_casos_numerados_sem_repeticao(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        numeros = await asyncio.gather(*[b.criar_caso(G, "warn", A, 1, f"m{i}") for i in range(15)])
        outro = await b.criar_caso(2, "warn", A, 1, "outro servidor")
        ativos = await b.contar_avisos_ativos(G, A)
        removido = await b.desativar_aviso(G, numeros[0])
        de_novo = await b.desativar_aviso(G, numeros[0])
        ativos_depois = await b.contar_avisos_ativos(G, A)
        await b.fechar()
        return sorted(numeros), outro, ativos, removido, de_novo, ativos_depois

    numeros, outro, ativos, removido, de_novo, ativos_depois = rodar(cenario)
    assert numeros == list(range(1, 16)) and outro == 1
    assert (ativos, removido, de_novo, ativos_depois) == (15, True, False, 14)


def test_ticket_um_aberto_por_categoria(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        t1 = await b.criar_ticket(G, 1001, A, "duvida")
        t2 = await b.criar_ticket(G, 1002, A, "duvida")  # mesma pessoa e categoria
        t3 = await b.criar_ticket(G, 1003, A, "denuncia")  # outra categoria: ok
        fechou = await b.fechar_ticket(1001)
        t4 = await b.criar_ticket(G, 1004, A, "duvida")  # depois de fechar: ok
        assumiu = await b.assumir_ticket(1003, 9)
        assumiu_de_novo = await b.assumir_ticket(1003, 8)
        await b.fechar()
        return t1 is not None, t2, t3 is not None, fechou, t4 is not None, assumiu, assumiu_de_novo

    assert rodar(cenario) == (True, None, True, True, True, True, False)


def test_xp_e_ranking(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        r1 = await b.adicionar_xp(G, A, 40)
        r2 = await b.adicionar_xp(G, A, 20)
        await b.adicionar_xp(G, B, 500)
        top = [linha["user_id"] for linha in await b.top(G, "xp", 10)]
        pos_a, pos_b = await b.posicao(G, A, "xp"), await b.posicao(G, B, "xp")
        sem_perfil = await b.posicao(G, 999, "xp")
        await b.fechar()
        return r1, r2, top, pos_a, pos_b, sem_perfil

    assert rodar(cenario) == ((0, 40), (40, 60), [B, A], 2, 1, None)


def test_visibilidade_persiste(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.definir_visibilidade(G, 111, "publico")
        await b.definir_visibilidade(G, 222, "staff")
        antes = await b.visibilidades(G)
        await b.definir_visibilidade(G, 111, None)
        depois = await b.visibilidades(G)
        await b.fechar()
        return antes, depois

    antes, depois = rodar(cenario)
    assert antes == {111: "publico", 222: "staff"} and depois == {222: "staff"}


# ------------------------------------------------------------------ vida da toca
def test_recompensa_unica_mesmo_com_cliques_simultaneos(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        resultados = await asyncio.gather(*(b.recompensar_uma_vez(G, "drop:1", u, 50, "drop") for u in (A, B, C)))
        saldos = [await b.saldo(G, u) for u in (A, B, C)]
        repetido = await b.recompensar_uma_vez(G, "drop:1", A, 50, "drop")
        await b.recompensar_uma_vez(G, "drop:2", B, 30, "drop")
        await b.recompensar_uma_vez(G, "qotd:9:100", A, 10, "qotd")
        n_drops = await b.contar_recompensas(G, "drop:")
        await b.fechar()
        return resultados, saldos, repetido, n_drops

    resultados, saldos, repetido, n_drops = rodar(cenario)
    assert sum(r is not None for r in resultados) == 1  # só um leva
    assert sorted(saldos) == [0, 0, 50]
    assert repetido is None
    assert n_drops == 2


def test_perola_registrada_uma_vez(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        primeira = await b.registrar_perola(G, 10, 900)
        segunda = await b.registrar_perola(G, 10, 901)
        guardada = await b.obter_perola(G, 10)
        nada = await b.obter_perola(G, 11)
        await b.fechar()
        return primeira, segunda, guardada, nada

    assert rodar(cenario) == (True, False, 900, None)


def test_aniversarios(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        await b.definir_aniversario(G, A, 5, 3)
        await b.definir_aniversario(G, B, 5, 3)
        await b.definir_aniversario(G, C, 1, 1)
        await b.definir_aniversario(G, A, 6, 3)  # muda a data
        no_dia = await b.aniversariantes(G, 5, 3)
        todos = await b.todos_aniversarios(G)
        await b.definir_aniversario(G, C, None, None)
        sem = await b.obter_aniversario(G, C)
        await b.fechar()
        return no_dia, todos, sem

    no_dia, todos, sem = rodar(cenario)
    assert no_dia == [B]
    assert todos == [(C, 1, 1), (B, 5, 3), (A, 6, 3)]
    assert sem is None


def test_aniversario_so_uma_vez(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        primeira = await b.marcar_aniversario(G, A, 10, 4)
        segunda = await b.marcar_aniversario(G, A, 11, 4)  # tentar trocar para "amanhã"
        data = await b.obter_aniversario(G, A)
        await b.definir_aniversario(G, A, 12, 4)  # correção de admin
        corrigida = await b.obter_aniversario(G, A)
        await b.fechar()
        return primeira, segunda, data, corrigida

    assert rodar(cenario) == (True, False, (10, 4), (12, 4))


def test_ranking_de_bump(tmp_path):
    async def cenario():
        b = await novo_banco(tmp_path)
        for i, u in enumerate((A, B, A, C, A, B)):
            await b.recompensar_uma_vez(G, f"bump:{i}", u, 0, "bump")
        await b.recompensar_uma_vez(G, "drop:x", C, 10, "drop")  # não é bump
        top = await b.top_recompensas(G, "bump:", 2)
        await b.fechar()
        return top

    assert rodar(cenario) == [(A, 3), (B, 2)]
