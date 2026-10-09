import textos


def test_temas_respondem_conforme_a_mensagem():
    casos = {
        "<@1> como vai?": textos.CONVERSA_COMO_VAI,
        "@Kiza obrigado!": textos.CONVERSA_OBRIGADO,
        "kiza tchau": textos.CONVERSA_TCHAU,
        "Kiza você é linda": textos.CONVERSA_ELOGIO,
        "kiza me conta uma piada": textos.CONVERSA_PIADA,
        "kiza tô com fome": textos.CONVERSA_COMIDA,
        "kiza te amo": textos.CONVERSA_AMOR,
    }
    for msg, lista in casos.items():
        assert textos.resposta_fixa(msg) in lista, msg


def test_sem_tema_usa_generico():
    assert textos.resposta_fixa("kiza xyz") in textos.CONVERSA_MENCAO
    assert textos.resposta_fixa("kiza qual a capital da frança?") in textos.CONVERSA_DUVIDA


def test_listas_sem_repeticao_e_sem_cringe():
    for nome in dir(textos):
        if nome.startswith("CONVERSA_") and nome != "CONVERSA_TEMAS":
            frases = getattr(textos, nome)
            assert len(frases) == len(set(frases)), nome
            for f in frases:
                assert "raposinha" not in f.lower() and "uwu" not in f.lower(), f
