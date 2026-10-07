from cogs.cerebro import fato_aceitavel, limpar_resposta


def test_separa_baloes_e_fatos():
    baloes, fatos = limpar_resposta("kkkk que fofo\naww qual o nome dele?\n#lembrar: tem um gato chamado Pipoca")
    assert baloes == ["kkkk que fofo", "aww qual o nome dele?"]
    assert fatos == ["tem um gato chamado Pipoca"]


def test_limita_baloes_e_tira_prefixo():
    baloes, _ = limpar_resposta("Kiza: a\nb\nc\nd\ne")
    assert baloes == ["a", "b", "c"]


def test_filtra_fato_sensivel():
    assert fato_aceitavel("gosta de morango")
    assert not fato_aceitavel("telefone 11987654321")
    assert not fato_aceitavel("acesse https://x.com")
