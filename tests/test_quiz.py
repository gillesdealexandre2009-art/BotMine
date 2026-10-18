import asyncio
from types import SimpleNamespace

from cogs.quiz import pagar
from database import Banco
from utils import quizdata

G, A = 1, 100


def test_perguntas_validas():
    for pergunta, opcoes, certa in quizdata.PERGUNTAS:
        assert pergunta.endswith("?") and 0 <= certa < len(opcoes) and len(set(opcoes)) == len(opcoes)
        assert all(len(o) <= 80 for o in opcoes)
    assert len({p for p, _, _ in quizdata.PERGUNTAS}) == len(quizdata.PERGUNTAS)


def test_forca_logica():
    assert quizdata.normalizar("  á ") == "A"
    assert quizdata.mascarar("ZUMBI", {"Z", "B"}) == "Z ▢ ▢ B ▢"
    assert quizdata.venceu("ZUMBI", set("ZUMBI")) and not quizdata.venceu("ZUMBI", {"Z"})
    assert all(p.isalpha() and p == p.upper() for p in quizdata.PALAVRAS_FORCA)
    assert len(quizdata.FORCA_BONECO) == quizdata.MAX_ERROS + 1


def test_pagar_respeita_limite_diario(tmp_path):
    async def cenario():
        b = Banco(str(tmp_path / "q.db"))
        await b.conectar()
        cog = SimpleNamespace(bot=SimpleNamespace(banco=b))
        await b.definir_ajuste(G, "quiz_max_dia", 2)
        r1 = await pagar(cog, G, A, "quiz", "quiz_premio", "quiz_max_dia", "m1")
        r1b = await pagar(cog, G, A, "quiz", "quiz_premio", "quiz_max_dia", "m1")  # mesma mensagem: não paga de novo
        r2 = await pagar(cog, G, A, "quiz", "quiz_premio", "quiz_max_dia", "m2")
        r3 = await pagar(cog, G, A, "quiz", "quiz_premio", "quiz_max_dia", "m3")
        saldo = await b.saldo(G, A)
        await b.fechar()
        return r1, r1b, r2, r3, saldo

    r1, r1b, r2, r3, saldo = asyncio.run(cenario())
    assert r1 == (15, False) and r1b == (0, False) and r2 == (15, False) and r3 == (0, True)
    assert saldo == 30
