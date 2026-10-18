from cogs.cerebro import fato_aceitavel, limpar_resposta


def test_separa_baloes_e_fatos():
    baloes, fatos = limpar_resposta("kkkk que fofo\naww qual o nome dele?\n#lembrar: tem um gato chamado Pipoca")
    assert baloes == ["kkkk que fofo", "aww qual o nome dele?"]
    assert fatos == ["tem um gato chamado Pipoca"]


def test_limita_baloes_e_tira_prefixo():
    baloes, _ = limpar_resposta("Kiza: a\nb\nc\nd\ne")
    assert baloes == ["a", "b", "c", "d"]


def test_filtra_fato_sensivel():
    assert fato_aceitavel("gosta de morango")
    assert not fato_aceitavel("telefone 11987654321")
    assert not fato_aceitavel("acesse https://x.com")


def _msg(texto, autor="Fulano"):
    from types import SimpleNamespace

    return SimpleNamespace(clean_content=texto, author=SimpleNamespace(display_name=autor))


def test_pediu_kope():
    from cogs.cerebro import pediu_kope

    assert pediu_kope(_msg("@Kiza desenha o kope"))
    assert pediu_kope(_msg("faz um desenho do K O P E"))
    assert pediu_kope(_msg("desenha o @★ | K O P E ¿ [CMSP]"))
    assert pediu_kope(_msg("me desenha", autor="★ | K O P E ¿ [CMSP]"))  # o próprio Kope
    assert not pediu_kope(_msg("me desenha", autor="Lheo"))
    assert not pediu_kope(_msg("desenha uma casa na árvore"))
    assert not pediu_kope(_msg("desenha o kopeck"))


def test_retratos_do_kope_existem():
    from cogs.cerebro import CHADS

    assert all(p.exists() for p in CHADS) and len(CHADS) == 2
