"""Evento de Halloween "O Último Outono de Hollow": conclusões, cargo exclusivo e comandos da staff.

Rode com:  pytest -q tests/test_halloween.py
"""
from types import SimpleNamespace

import discord

import config
from test_kitsune_ponte import CargoFalso, MembroComCargos, RespostaFalsa
from test_ponte_minecraft import AUTH, G, USER_A, USER_B, montar, rodar, vincular

CARGO_HALLOWEEN = 777


async def montar_halloween(tmp_path, quem, configurar=True):
    cargo = CargoFalso(CARGO_HALLOWEEN)
    membros = [MembroComCargos(uid, nome, cargo, tem) for uid, nome, tem in quem]
    banco, ponte, cliente, canais = await montar(tmp_path, membros)
    ponte.bot.guilds[0].get_role = lambda rid: cargo if rid == CARGO_HALLOWEEN else None
    if configurar:
        await banco.set_config(G, "cargo_halloween", str(CARGO_HALLOWEEN))
    return banco, ponte, cliente, canais, cargo, membros


def evento(nome="Raposa", posicao=1):
    return {"t": "hollow_conclusao", "nome": nome, "posicao": posicao}


async def mandar(cliente, *eventos):
    r = await cliente.post("/mc/eventos", json={"eventos": list(eventos)}, headers=AUTH)
    return r.status, await r.json()


def test_validar_evento_hollow():
    from cogs_minecraft.ponte import validar_evento

    assert validar_evento(evento("Raposa", 3)) == {"t": "hollow_conclusao", "nome": "Raposa", "posicao": 3}
    assert validar_evento(evento("", 1)) is None
    assert validar_evento(evento("Raposa", 0)) is None
    assert validar_evento({"t": "hollow_conclusao", "nome": "Raposa"}) is None
    assert validar_evento({"t": "hollow_inicio"}) == {"t": "hollow_inicio"}


def test_embeds_do_hollow_sem_spoiler():
    from cogs_minecraft import embeds

    ctx = embeds.Contexto()
    (chave, _texto, e), = embeds.montar_evento(evento("Raposa", 2), ctx)
    assert chave == "mc_chat" and "Raposa" in e.description and "nº 2" in e.description and "Último Outono de Hollow" in e.description
    (chave2, _t, e2), = embeds.montar_evento({"t": "hollow_inicio"}, ctx)
    assert chave2 == "mc_chat" and e2.title


def test_conclusao_registra_da_o_cargo_e_avisa_uma_vez(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana,) = await montar_halloween(tmp_path, [(USER_A, "Ana", False)])
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            s1, d1 = await mandar(cliente, evento("Raposa", 1))
            s2, d2 = await mandar(cliente, evento("raposa", 5))  # repetido (outra caixa): nada muda
            lista = await banco.hollow_lista(G)
            return s1, d1, s2, d2, [(r["nome"], r["posicao"], r["user_id"]) for r in lista], ana.trocas, len(canais["mc_chat"].enviadas)
        finally:
            await cliente.close()
            await banco.fechar()

    s1, d1, s2, d2, lista, trocas, avisos = rodar(cenario)
    assert (s1, d1["enviados"], s2, d2["enviados"]) == (200, 1, 200, 0)
    assert lista == [("Raposa", 1, USER_A)]
    assert trocas == ["deu"]  # só deu uma vez, e a segunda não mexeu
    assert avisos == 1


def test_conclusao_sem_vinculo_ou_sem_cargo_configurado_nao_quebra(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana,) = await montar_halloween(tmp_path, [(USER_A, "Ana", False)], configurar=False)
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            r1 = await mandar(cliente, evento("Raposa", 1))  # vinculada, mas cargo não configurado
            r2 = await mandar(cliente, evento("Estranho", 2))  # sem vínculo
            lista = await banco.hollow_lista(G)
            return r1, r2, [(r["nome"], r["user_id"]) for r in lista], ana.trocas
        finally:
            await cliente.close()
            await banco.fechar()

    r1, r2, lista, trocas = rodar(cenario)
    assert r1[0] == 200 and r2[0] == 200
    assert lista == [("Raposa", USER_A), ("Estranho", None)] and trocas == []


def test_falta_de_permissao_para_dar_o_cargo_nao_quebra_a_ponte(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana,) = await montar_halloween(tmp_path, [(USER_A, "Ana", False)])

        async def negado(cargo, reason=None):
            raise discord.HTTPException(SimpleNamespace(status=403, reason="Forbidden"), "Missing Permissions")

        ana.add_roles = negado
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            status, dados = await mandar(cliente, evento("Raposa", 1))
            return status, dados, len(await banco.hollow_lista(G))
        finally:
            await cliente.close()
            await banco.fechar()

    status, dados, n = rodar(cenario)
    assert status == 200 and dados["enviados"] == 1 and n == 1


def test_comando_dar_e_idempotente(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (staff, ana) = await montar_halloween(tmp_path, [(USER_B, "Staff", False), (USER_A, "Ana", False)])
        try:
            respostas: list[dict] = []
            inter = SimpleNamespace(guild=ponte.bot.guilds[0], user=staff, response=RespostaFalsa(respostas), followup=None)
            await ponte.halloween_dar.callback(ponte, inter, ana)  # type: ignore[arg-type]
            await ponte.halloween_dar.callback(ponte, inter, ana)  # type: ignore[arg-type]
            return respostas, ana.trocas
        finally:
            await cliente.close()
            await banco.fechar()

    respostas, trocas = rodar(cenario)
    assert trocas == ["deu"]
    assert "recebeu" in respostas[0]["content"] and "já tinha" in respostas[1]["content"]


def test_comando_dar_sem_cargo_configurado_avisa(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (staff, ana) = await montar_halloween(
            tmp_path, [(USER_B, "Staff", False), (USER_A, "Ana", False)], configurar=False
        )
        try:
            respostas: list[dict] = []
            inter = SimpleNamespace(guild=ponte.bot.guilds[0], user=staff, response=RespostaFalsa(respostas), followup=None)
            await ponte.halloween_dar.callback(ponte, inter, ana)  # type: ignore[arg-type]
            return respostas, ana.trocas
        finally:
            await cliente.close()
            await banco.fechar()

    respostas, trocas = rodar(cenario)
    assert trocas == [] and "/setup" in respostas[0]["content"]


def test_comando_vencedores_lista_em_ordem(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (staff,) = await montar_halloween(tmp_path, [(USER_B, "Staff", False)])
        try:
            await banco.hollow_registrar(G, "Lobo", 2)
            await banco.hollow_registrar(G, "Raposa", 1, USER_A)
            respostas: list[dict] = []
            inter = SimpleNamespace(guild=ponte.bot.guilds[0], user=staff, response=RespostaFalsa(respostas), followup=None)
            await ponte.halloween_vencedores.callback(ponte, inter)  # type: ignore[arg-type]
            vazio = await banco.hollow_lista(G + 1)
            return respostas, vazio
        finally:
            await cliente.close()
            await banco.fechar()

    respostas, vazio = rodar(cenario)
    texto = respostas[0]["embed"].description
    assert texto.index("Raposa") < texto.index("Lobo") and f"<@{USER_A}>" in texto and vazio == []


def test_cargo_halloween_aparece_no_setup():
    assert "halloween" in config.CARGOS_BASE
    assert len(config.CARGOS_BASE) <= 25
