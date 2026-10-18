import asyncio
import random

from database import Banco
from utils import figurinhas as fig

G, A = 1, 100


def rodar(cenario_fn):
    return asyncio.run(cenario_fn())


async def novo(tmp_path) -> Banco:
    banco = Banco(str(tmp_path / "f.db"))
    await banco.conectar()
    return banco


def test_catalogo_consistente():
    assert len({c.id for c in fig.CATALOGO}) == len(fig.CATALOGO)
    assert len({c.numero for c in fig.CATALOGO}) == len(fig.CATALOGO)
    for c in fig.CATALOGO:
        assert c.raridade in fig.RARIDADES
        assert (fig.CARTAS_DIR / c.arquivo).exists()


def test_sorteio_respeita_raridades_existentes():
    rng = random.Random(1)
    sorteadas = [fig.sortear(rng) for _ in range(500)]
    assert {c.raridade for c in sorteadas} == {"comum", "rara"}
    comuns = sum(1 for c in sorteadas if c.raridade == "comum")
    assert 300 < comuns < 450  # ~78%


def test_desenha_todas_as_cartas():
    for c in fig.CATALOGO:
        dados = fig.desenhar_carta(c)
        assert dados[:4] == b"RIFF" and dados[8:12] == b"WEBP"


def test_abrir_figurinha_gratis_depois_cobra_e_acumula(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.creditar(G, A, 200, "teste")
        r1 = await b.abrir_figurinha(G, A, "kiza_sonolenta", 150, "2026-10-07", True)
        assert r1 == {"nova": True, "quantidade": 1, "gratis": True, "saldo": 200}
        r2 = await b.abrir_figurinha(G, A, "kiza_sonolenta", 150, "2026-10-07", True)  # grátis já usada: cobra
        assert r2["gratis"] is False and r2["nova"] is False and r2["quantidade"] == 2 and r2["saldo"] == 50
        r3 = await b.abrir_figurinha(G, A, "creeper_timido", 150, "2026-10-07", True)  # sem saldo
        assert r3 is None
        assert await b.saldo(G, A) == 50  # nada foi cobrado nem entregue
        assert await b.inventario_figurinhas(G, A) == {"kiza_sonolenta": 2}
        r4 = await b.abrir_figurinha(G, A, "creeper_timido", 150, "2026-10-08", True)  # novo dia: grátis de novo
        assert r4["gratis"] is True and r4["nova"] is True
        await b.fechar()

    rodar(cenario)


def test_sem_gratis_sempre_cobra(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.creditar(G, A, 150, "teste")
        r = await b.abrir_figurinha(G, A, "kiza_sonolenta", 150, "2026-10-07", False)
        assert r["gratis"] is False and r["saldo"] == 0
        assert await b.abrir_figurinha(G, A, "kiza_sonolenta", 150, "2026-10-07", False) is None
        await b.fechar()

    rodar(cenario)


def test_reivindicar_config_so_uma_vez(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        nunca = lambda atual: atual is None  # noqa: E731
        assert await b.reivindicar_config(G, "presenca_x", "2026-10-07", nunca) == (True, None)
        assert await b.reivindicar_config(G, "presenca_x", "2026-10-07", nunca) == (False, "2026-10-07")
        assert await b.get_config(G, "presenca_x") == "2026-10-07"
        # duas "cópias do bot" disputando: só uma ganha
        resultados = await asyncio.gather(*(b.reivindicar_config(G, "presenca_y", "a", nunca) for _ in range(5)))
        assert sum(1 for ok, _ in resultados if ok) == 1
        await b.fechar()

    rodar(cenario)
