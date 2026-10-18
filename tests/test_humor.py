from datetime import datetime

from utils import humor


def test_humor_madrugada_e_chateada():
    h = humor.humor_atual(datetime(2026, 10, 10, 3, 0))  # sábado, 3h
    assert "madrugada" in h and "fim de semana" in h
    assert "emburrada" in humor.humor_atual(datetime(2026, 10, 7, 15, 0), chateada=True)
    assert "emburrada" not in humor.humor_atual(datetime(2026, 10, 7, 15, 0))


def test_humor_do_dia_e_estavel():
    d = datetime(2026, 10, 7, 15, 0)
    assert humor.humor_atual(d) == humor.humor_atual(d)


def test_foi_grosso():
    assert humor.foi_grosso("Você é uma IDIOTA")
    assert not humor.foi_grosso("você é legal")


def test_emoji_reacao():
    assert humor.emoji_reacao("parabéns pelo niver!") in ("🎉", "👏", "🥳")
    assert humor.emoji_reacao("kkkkk") in ("😂", "💀", "😭")
    assert humor.emoji_reacao("bom dia gente") is None


def test_cache_so_para_faq():
    assert humor.precisa_cache("Kiza, como ganho caudas?")
    assert not humor.precisa_cache("kiza, como foi seu dia?")
    assert not humor.precisa_cache("como ganho caudas")  # sem pergunta
    assert humor.chave_cache("<@1> Como ganho CAUDAS?") == humor.chave_cache("kiza como ganho caudas?")
