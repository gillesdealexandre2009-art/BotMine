from cogs.presenca import ids_candidatos, minuto_do_dia


def test_minuto_fixo_por_dia_e_dentro_da_janela():
    a = minuto_do_dia(1, "2026-10-07", "midia", 14, 21)
    assert a == minuto_do_dia(1, "2026-10-07", "midia", 14, 21)
    assert 14 * 60 <= a < 21 * 60
    outros = {minuto_do_dia(1, f"2026-10-{d:02d}", "midia", 14, 21) for d in range(1, 20)}
    assert len(outros) > 5  # varia de um dia para o outro


def test_ids_candidatos():
    assert ids_candidatos("123, 456,x") == [123, 456]
