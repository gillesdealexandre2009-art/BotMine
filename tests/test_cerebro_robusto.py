import asyncio
import time
from types import SimpleNamespace

import textos
from cogs.cerebro import Cerebro, limpar_resposta, sem_cringe


def novo_cerebro() -> Cerebro:
    return Cerebro(SimpleNamespace())


def test_sem_cringe():
    assert sem_cringe("oi *abana a cauda* tudo bem?") == "oi tudo bem?"
    assert sem_cringe("oi, raposinha, e aí") == "oi, e aí"
    assert "uwu" not in sem_cringe("que fofo uwu")
    assert sem_cringe("isso é **importante**") == "isso é **importante**"  # negrito de verdade não some


def test_limpar_resposta_aplica_sem_cringe_e_descarta_balao_vazio():
    baloes, fatos = limpar_resposta("*ri*\noi, raposinha!\n#lembrar: tem um gato chamado Pipoca")
    assert baloes == ["oi!"] and fatos == ["tem um gato chamado Pipoca"]


def test_pausa_por_limite():
    c = novo_cerebro()
    assert not c._pausado("chat")
    c._pausas["chat"] = time.monotonic() + 30
    assert c._pausado("chat") and not c._pausado("desenho")
    c._pausas["chat"] = time.monotonic() - 1
    assert not c._pausado("chat")


def test_cache_reaproveita_faq_e_nao_guarda_memoria_alheia():
    c = novo_cerebro()
    chamadas = []

    async def falsa(sistema, conversa, *a, **k):
        chamadas.append(1)
        return "ganha com /daily, drops e bump\n#lembrar: gosta de caudas"

    c._chamar_api = falsa  # type: ignore[method-assign]
    msg = SimpleNamespace(clean_content="Kiza, como ganho caudas?")

    async def cenario():
        a = await c._com_cache(msg, "ctx")
        b = await c._com_cache(SimpleNamespace(clean_content="kiza como ganho CAUDAS?"), "ctx")
        return a, b

    a, b = asyncio.run(cenario())
    assert len(chamadas) == 1 and c.metricas["cache"] == 1
    assert "#lembrar" in a and "#lembrar" not in b  # a memória de uma pessoa não vaza para a outra


def test_papo_nao_vai_para_o_cache():
    c = novo_cerebro()
    n = []

    async def falsa(sistema, conversa, *a, **k):
        n.append(1)
        return "tô bem"

    c._chamar_api = falsa  # type: ignore[method-assign]

    async def cenario():
        for _ in range(2):
            await c._com_cache(SimpleNamespace(clean_content="kiza como foi seu dia?"), "ctx")

    asyncio.run(cenario())
    assert len(n) == 2


def test_resumo_status_sem_chave(monkeypatch):
    import config

    monkeypatch.setattr(config, "CEREBRO_API_KEY", "")
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "")
    assert "desligado" in novo_cerebro().resumo_status()


def test_resposta_fixa_nao_repete_em_sequencia():
    textos._RECENTES.clear()
    vistas = [textos.resposta_fixa("kiza tchau") for _ in range(len(textos.CONVERSA_TCHAU))]
    assert len(set(vistas)) == len(textos.CONVERSA_TCHAU)  # esgota a lista antes de repetir
