"""Chat de proximidade: agrupamento com histerese, plano de salas e validação do corpo de /mc/prox."""
import config
from cogs_minecraft.proximidade import Ponto, agrupar, planejar, validar_pontos


def p(x, z=0.0, d="overworld", livre=True, y=64.0):
    return Ponto(d, x, y, z, livre)


def conjuntos(grupos):
    return sorted(sorted(g) for g in grupos)


def test_perto_junta_e_longe_separa():
    g = agrupar({1: p(0), 2: p(10), 3: p(200)}, {}, 24, 32)
    assert conjuntos(g) == [[1, 2], [3]]


def test_cadeia_de_pessoas_forma_um_grupo():
    g = agrupar({1: p(0), 2: p(20), 3: p(40)}, {}, 24, 32)
    assert conjuntos(g) == [[1, 2, 3]]


def test_histerese_mantem_quem_ja_estava_junto():
    pontos = {1: p(0), 2: p(28)}
    assert conjuntos(agrupar(pontos, {}, 24, 32)) == [[1], [2]]
    assert conjuntos(agrupar(pontos, {1: 7, 2: 7}, 24, 32)) == [[1, 2]]
    assert conjuntos(agrupar({1: p(0), 2: p(40)}, {1: 7, 2: 7}, 24, 32)) == [[1], [2]]


def test_dimensao_diferente_e_ambiente_especial_ficam_sozinhos():
    g = agrupar({1: p(0), 2: p(1, d="nether"), 3: p(2, livre=False), 4: p(3, livre=False)}, {}, 24, 32)
    assert conjuntos(g) == [[1], [2], [3], [4]]


def test_planejar_sozinho_vai_para_entrada_e_grupo_ganha_sala_nova():
    alvos = planejar([{1, 2}, {3}], {1: 100, 2: 100, 3: 100}, set(), 100, 10)
    assert alvos[3] == ("entrada", 100)
    assert alvos[1][0] == "nova" and alvos[1] == alvos[2]


def test_planejar_reaproveita_a_sala_onde_a_maioria_ja_esta():
    alvos = planejar([{1, 2, 3}], {1: 201, 2: 201, 3: 100}, {201, 202}, 100, 10)
    assert alvos == {1: ("sala", 201), 2: ("sala", 201), 3: ("sala", 201)}


def test_planejar_duas_turmas_na_mesma_sala_nao_se_misturam():
    alvos = planejar([{1, 2}, {3, 4}], {1: 201, 2: 201, 3: 201, 4: 201}, {201}, 100, 10)
    assert {alvos[1], alvos[2]} != {alvos[3], alvos[4]} or alvos[1] != alvos[3]
    assert alvos[1] == alvos[2] and alvos[3] == alvos[4] and alvos[1] != alvos[3]


def test_planejar_limite_de_salas_manda_o_grupo_para_a_entrada():
    alvos = planejar([{1, 2}], {1: 100, 2: 100}, {201}, 100, 1)
    assert alvos == {1: ("entrada", 100), 2: ("entrada", 100)}


def test_validar_pontos_aceita_o_bom_e_ignora_o_estranho():
    bom = {"id": "abc", "nome": "Rapo", "d": "overworld", "x": 1, "y": 64.5, "z": -3, "livre": True}
    ruins = [
        {"id": "", "nome": "A", "x": 1, "y": 1, "z": 1},
        {"id": "b", "nome": "B", "x": "1", "y": 1, "z": 1},
        {"id": "c", "nome": "C", "x": True, "y": 1, "z": 1},
        {"id": "d", "nome": "D", "x": float("nan"), "y": 1, "z": 1},
        {"id": "e", "nome": "E", "x": 9e9, "y": 1, "z": 1},
        "lixo",
    ]
    saida = validar_pontos({"pos": [bom, *ruins]})
    assert [(i, n) for i, n, _ in saida] == [("abc", "Rapo")]
    assert saida[0][2].livre is True
    assert validar_pontos({"pos": [{**bom, "livre": "sim"}]})[0][2].livre is False
    assert validar_pontos([]) == [] and validar_pontos({"pos": 3}) == []
    assert len(validar_pontos({"pos": [bom] * 500})) == 60


def test_ajustes_da_proximidade_existem():
    a = config.AJUSTES
    assert a["prox_entrar"][0] == 24 and a["prox_sair"][0] == 32 and a["prox_ligada"][0] == 1
    assert a["prox_sair"][0] > a["prox_entrar"][0]
