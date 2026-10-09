from utils import missoes as ms


def test_missoes_do_dia_estaveis_e_diferentes_por_dia():
    a = ms.missoes_do_dia(1, 740000)
    assert a == ms.missoes_do_dia(1, 740000)
    assert len(a) == ms.POR_DIA == len({m.id for m in a})
    assert any(ms.missoes_do_dia(1, 740000 + d) != a for d in range(1, 10))


def test_catalogo():
    assert len(ms.POR_ID) == len(ms.CATALOGO)
    assert all(m.meta > 0 for m in ms.CATALOGO)
