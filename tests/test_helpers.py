"""Testes das funções puras (durações, XP, texto, matemática do Mines)."""
import math

import config
from utils.helpers import formatar_duracao, formatar_moeda, nivel_por_xp, parse_duracao, slug, xp_para_subir
from utils.jogos import multiplicador, probabilidade_seguras


def test_parse_duracao():
    assert parse_duracao("10m") == 600
    assert parse_duracao("1h30m") == 5400
    assert parse_duracao(" 2 d ") == 172800
    assert parse_duracao("1w") == 604800
    for invalido in ("", "abc", "10", "0m", "10x", "m10", "1h 30"):
        assert parse_duracao(invalido) is None, invalido


def test_formatar_duracao():
    assert formatar_duracao(5400) == "1h 30min"
    assert formatar_duracao(0) == "0s"
    assert formatar_duracao(86400 + 61) == "1d 1min 1s"


def test_nivel_por_xp_e_consistente():
    assert nivel_por_xp(0) == (0, 0, xp_para_subir(0))
    nivel, dentro, necessario = nivel_por_xp(xp_para_subir(0))
    assert (nivel, dentro) == (1, 0)
    anterior = -1
    for xp in range(0, 20000, 137):
        n, dentro, necessario = nivel_por_xp(xp)
        assert n >= anterior and 0 <= dentro < necessario
        anterior = n


def test_slug():
    assert slug("Fulâno da Silva!") == "fulano-da-silva"
    assert slug("🦊🦊") == "usuario"
    assert len(slug("a" * 100, 16)) <= 16


def test_formatar_moeda_singular_e_plural():
    assert formatar_moeda(1).endswith(config.MOEDA_SINGULAR)
    assert formatar_moeda(1500).startswith("1.500")
    assert formatar_moeda(2).endswith(config.MOEDA_NOME)


def test_mines_retorno_esperado_respeita_margem():
    """P(acertar k casas) x multiplicador(k) == 1 - margem, para qualquer k e nº de minas."""
    for minas in range(1, 9):
        seguras = config.MINES_CASAS - minas
        for k in range(1, seguras + 1):
            esperado = probabilidade_seguras(minas, k) * multiplicador(minas, k)
            assert math.isclose(esperado, 1 - config.MINES_MARGEM_CASA, rel_tol=1e-9)
    assert multiplicador(3, 0) == 1.0
