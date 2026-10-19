"""Mimos dos Kitsunes: nome de sala, opções de votação, voto (um por pessoa, troca, encerramento) e mural."""
import asyncio
import time

import config
from cogs.kitsune_extras import embed_votacao, nome_de_sala_valido, nomes_do_mural, opcoes_da_votacao
from database import Banco

G = 1


def rodar(c):
    return asyncio.run(c())


def test_nome_de_sala_valido():
    assert nome_de_sala_valido("  Toca   da  @everyone  ") == "Toca da everyone"
    assert nome_de_sala_valido("a" * 100) == "a" * 40
    assert nome_de_sala_valido(" @ # ") is None and nome_de_sala_valido("") is None


def test_opcoes_da_votacao():
    assert opcoes_da_votacao("Sim; Não ;sim; ; Talvez") == ["Sim", "Não", "Talvez"]  # sem repetir (ignora caixa) e sem vazias
    assert opcoes_da_votacao("só uma") == ["só uma"]
    assert len(opcoes_da_votacao("x" * 200)[0]) == 60


def test_embed_da_votacao_mostra_porcentagens_e_o_fim():
    e = embed_votacao("Qual tema?", ["A", "B"], {0: 3, 1: 1}, int(time.time()) + 100, False)
    assert "75%" in e.description and "25%" in e.description and "4 voto" in e.footer.text and "Só **Kitsunes**" in e.description
    assert "encerrada" in embed_votacao("x", ["A", "B"], {}, 1, True).description.lower()
    assert "0%" in embed_votacao("x", ["A", "B"], {}, 1, False).description  # sem voto não divide por zero


def test_voto_um_por_pessoa_troca_e_encerra(tmp_path):
    async def c():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            vid = await banco.votacao_criar(G, 5, "T", ["A", "B"], 9, int(time.time()) + 3600)
            assert await banco.votar(vid, 1, 0) == "ok"
            assert await banco.votar(vid, 1, 0) == "igual"
            assert await banco.votar(vid, 1, 1) == "mudou"
            assert await banco.votar(vid, 2, 1) == "ok"
            assert await banco.votar(vid, 3, 7) == "inexistente"  # opção que não existe
            assert await banco.votar(999, 3, 0) == "inexistente"
            assert await banco.votos_contagem(vid) == {1: 2}
            assert await banco.votacao_encerrar(vid) is True and await banco.votacao_encerrar(vid) is False
            assert await banco.votar(vid, 4, 0) == "encerrada"
            vencida = await banco.votacao_criar(G, 5, "V", ["A", "B"], 9, int(time.time()) - 10)
            assert [int(v["id"]) for v in await banco.votacoes_vencidas()] == [vencida]
            assert await banco.votar(vencida, 1, 0) == "encerrada"  # passou do prazo mesmo sem o relógio fechar
        finally:
            await banco.fechar()

    rodar(c)


def test_mural_corta_a_lista():
    assert "Ainda não" in nomes_do_mural([])
    texto = nomes_do_mural([f"n{i}" for i in range(70)])
    assert texto.count("🦊") == 60 and "e mais 10" in texto


def test_config_dos_mimos():
    assert "kitsune_extras" in config.COGS and config.AJUSTES["kitsune_sala_max"][0] == 10 and config.AJUSTES["kitsune_sala_ligada"][0] == 1
