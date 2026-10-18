"""Apoio por PIX: compra de Kitsune, doações e metas (pagamento só vale uma vez, valores conferidos, prazo somado, ponte e webhook).

Rode com:  pytest -q tests/test_apoio.py
"""
import asyncio
import hashlib
import hmac
import os
import time
from types import SimpleNamespace

import pytest
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

import config
import textos
from database import Banco
from utils import pix as pixmod
from utils.pix import CobrancaPix, MercadoPago, PagamentoPix, PixErro, assinatura_valida, centavos, reais

G, USER_A, USER_B = 1, 111, 222
TOKEN = "segredo-de-teste"
AUTH = {"Authorization": f"Bearer {TOKEN}"}
DIA_MS = 24 * 3600 * 1000


def rodar(cenario_fn):
    return asyncio.run(cenario_fn())


class FalsoPix:
    """Provedor de mentira: o teste "paga" chamando pagar()."""

    configurado = True

    def __init__(self) -> None:
        self.criadas: list[dict] = []
        self.estado: dict[str, PagamentoPix] = {}
        self.falhar = False

    async def criar(self, valor_centavos, descricao, ref, expira_min):
        if self.falhar:
            raise PixErro("provedor fora do ar")
        pid = str(9000 + len(self.criadas))
        self.criadas.append({"id": pid, "valor": valor_centavos, "ref": ref, "descricao": descricao, "expira_min": expira_min})
        self.estado[pid] = PagamentoPix(pid, "pendente", valor_centavos, ref)
        return CobrancaPix(pid, f"00020126PIX{pid}", "")

    async def consultar(self, provedor_id):
        return self.estado[str(provedor_id)]

    async def fechar(self):
        pass

    def pagar(self, pid, valor=None, ref=None, status="aprovado"):
        atual = self.estado[str(pid)]
        self.estado[str(pid)] = PagamentoPix(atual.id, status, atual.valor_centavos if valor is None else valor, atual.ref if ref is None else ref)


class CanalFalso:
    def __init__(self) -> None:
        self.mensagens: list[str] = []

    async def send(self, content=None, **kwargs):
        self.mensagens.append(content)


class MembroFalso:
    def __init__(self, user_id: int, nome: str) -> None:
        self.id, self.display_name, self.name, self.mention = user_id, nome, nome.lower(), f"<@{user_id}>"
        self.roles: list = []
        self.dms: list[str] = []

    async def send(self, texto):
        self.dms.append(texto)

    async def add_roles(self, cargo, reason=None):
        self.roles.append(cargo)


async def montar(tmp_path, membros=(), cogs=None):
    os.environ["MC_BRIDGE_TOKEN"] = TOKEN
    os.environ.pop("MC_GUILD_ID", None)
    from cogs.apoio import Apoio

    banco = Banco(str(tmp_path / "t.db"))
    await banco.conectar()
    por_id = {m.id: m for m in membros}
    cargo = SimpleNamespace(id=config.CARGO_KITSUNE_PADRAO, name="Kitsune")
    guild = SimpleNamespace(id=G, get_member=lambda uid: por_id.get(uid), get_role=lambda rid: cargo if rid == cargo.id else None, channels=[])
    registro: dict = {}
    bot = SimpleNamespace(banco=banco, guilds=[guild], get_guild=lambda _g: guild, get_cog=lambda nome: registro.get(nome))
    provedor = FalsoPix()
    apoio = Apoio(bot, provedor)  # type: ignore[arg-type]
    mural = CanalFalso()

    async def canal_mural(_guild):
        return mural

    apoio._canal_mural = canal_mural  # type: ignore[method-assign]

    async def sem_painel(_guild, forcar=False):
        return None

    apoio.atualizar_painel = sem_painel  # type: ignore[method-assign]
    registro["Apoio"] = apoio
    return banco, apoio, provedor, mural, guild, cargo, registro


# ------------------------------------------------------------------ valores e assinatura
def test_parse_valor():
    from cogs.apoio import parse_valor

    assert parse_valor("10") == 1000 and parse_valor("10,50") == 1050 and parse_valor("R$ 7.5") == 750 and parse_valor("1.234,56") == 123456
    assert parse_valor("0") is None and parse_valor("-5") is None and parse_valor("abc") is None and parse_valor("") is None
    assert parse_valor("10,555") is None and parse_valor("nan") is None and parse_valor("inf") is None


def test_reais_e_centavos():
    assert reais(1500) == "R$ 15,00" and reais(5) == "R$ 0,05" and reais(123456) == "R$ 1.234,56"
    assert centavos(15.0) == 1500 and centavos("7.50") == 750 and centavos(0.1 + 0.2) == 30


def test_assinatura_do_webhook():
    segredo, rid, ts, data_id = "s3gredo", "req-1", "1700000000", "123456"
    v1 = hmac.new(segredo.encode(), f"id:{data_id};request-id:{rid};ts:{ts};".encode(), hashlib.sha256).hexdigest()
    assert assinatura_valida(segredo, f"ts={ts},v1={v1}", rid, data_id)
    assert not assinatura_valida(segredo, f"ts={ts},v1={v1}", rid, "999") and not assinatura_valida("outro", f"ts={ts},v1={v1}", rid, data_id)
    assert not assinatura_valida(segredo, "lixo", rid, data_id) and not assinatura_valida(segredo, "", rid, data_id)


# ------------------------------------------------------------------ banco
def test_pagamento_so_vale_uma_vez_e_o_prazo_soma(tmp_path):
    async def cenario():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            agora_ms = int(time.time() * 1000)
            a = await banco.pg_criar(G, USER_A, "kitsune", 1500, "REF-A", int(time.time()) + 1800, meses=1)
            b = await banco.pg_criar(G, USER_A, "kitsune", 4500, "REF-B", int(time.time()) + 1800, meses=3)
            pago_a = await banco.pg_marcar_pago(a, 30, agora_ms)
            de_novo = await banco.pg_marcar_pago(a, 30, agora_ms)
            pago_b = await banco.pg_marcar_pago(b, 30, agora_ms)
            # quem já tem selo ativo com prazo no futuro soma em cima dele
            await banco.mc_kitsune_registrar(G, USER_B, True, agora_ms + 10 * DIA_MS)
            c = await banco.pg_criar(G, USER_B, "kitsune", 1500, "REF-C", int(time.time()) + 1800, meses=1)
            pago_c = await banco.pg_marcar_pago(c, 30, agora_ms)
            return pago_a, de_novo, pago_b, pago_c, agora_ms
        finally:
            await banco.fechar()

    pago_a, de_novo, pago_b, pago_c, agora_ms = rodar(cenario)
    assert pago_a["status"] == "pago" and de_novo is None
    assert abs(pago_a["kitsune_ate"] - (agora_ms + 30 * DIA_MS)) < 5000
    assert pago_b["kitsune_ate"] == pago_a["kitsune_ate"] + 90 * DIA_MS  # a segunda compra começa onde a primeira acaba
    assert abs(pago_c["kitsune_ate"] - (agora_ms + 40 * DIA_MS)) < 5000  # 10 dias que já tinha + 30


def test_pagamento_atrasado_ainda_vale_mas_cancelado_nao(tmp_path):
    async def cenario():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            expira = int(time.time()) - 3600
            a = await banco.pg_criar(G, USER_A, "doacao", 1000, "REF-A", expira)
            b = await banco.pg_criar(G, USER_A, "doacao", 1000, "REF-B", expira)
            await banco.pg_anexar_provedor(a, "1", "x", "")
            await banco.pg_anexar_provedor(b, "2", "y", "")
            expirados = await banco.pg_expirar()
            atrasado = await banco.pg_marcar_pago(a, 30, 0)  # o PIX caiu depois do prazo: vale
            await banco._exec("UPDATE pagamentos SET status = 'cancelado' WHERE id = ?", (b,))
            cancelado = await banco.pg_marcar_pago(b, 30, 0)
            return len(expirados), atrasado, cancelado
        finally:
            await banco.fechar()

    n, atrasado, cancelado = rodar(cenario)
    assert n == 2 and atrasado["status"] == "pago" and cancelado is None


def test_metas_ciclo_de_vida(tmp_path):
    async def cenario():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            m = await banco.meta_criar(G, "Host de novembro", 10000, "para pagar a host", 0)
            v = await banco.meta_criar(G, "Vencida", 5000, "", int(time.time()) - 5)
            ativas = [x["titulo"] for x in await banco.metas_ativas(G)]
            vencidas = [x["id"] for x in await banco.metas_vencidas()]
            for i, (user, valor) in enumerate([(USER_A, 3000), (USER_A, 2000), (USER_B, 1500)]):
                pid = await banco.pg_criar(G, user, "doacao", valor, f"R{i}", int(time.time()) + 600, meta_id=m)
                await banco.pg_marcar_pago(pid, 30, 0)
            pendente = await banco.pg_criar(G, USER_B, "doacao", 9999, "RP", int(time.time()) + 600, meta_id=m)
            arrecadado, apoiadores = await banco.meta_arrecadado(m), await banco.meta_apoiadores(m)
            editou = await banco.meta_editar(G, m, titulo="Host", alvo_centavos=20000)
            nada = await banco.meta_editar(G, m)
            encerrou = await banco.meta_encerrar(G, m, "encerrada")
            de_novo = await banco.meta_encerrar(G, m, "encerrada")
            edita_encerrada = await banco.meta_editar(G, m, titulo="X")
            depois = [x["titulo"] for x in await banco.metas_ativas(G)]
            return ativas, vencidas, v, arrecadado, apoiadores, editou, nada, encerrou, de_novo, edita_encerrada, depois, pendente
        finally:
            await banco.fechar()

    ativas, vencidas, v, arrecadado, apoiadores, editou, nada, encerrou, de_novo, edita_enc, depois, _ = rodar(cenario)
    assert ativas == ["Host de novembro", "Vencida"] and vencidas == [v]
    assert arrecadado == 6500 and apoiadores == 2  # o pendente não conta
    assert editou and not nada and encerrou and not de_novo and not edita_enc
    assert depois == ["Vencida"]


# ------------------------------------------------------------------ cobrança
def test_cobranca_cria_reaproveita_e_limita(tmp_path):
    async def cenario():
        banco, apoio, prov, *_ = await montar(tmp_path)
        try:
            e1, pg1 = await apoio.cobrar(G, USER_A, "kitsune", 1500, "Kitsune 1", meses=1)
            e2, pg2 = await apoio.cobrar(G, USER_A, "kitsune", 1500, "Kitsune 1", meses=1)  # clicou de novo: mesma cobrança
            outras = [await apoio.cobrar(G, USER_A, "doacao", 500 + i, "Doacao") for i in range(3)]
            return e1, pg1, e2, pg2, outras, prov.criadas
        finally:
            await banco.fechar()

    e1, pg1, e2, pg2, outras, criadas = rodar(cenario)
    assert e1 == "ok" and e2 == "ok" and pg1["id"] == pg2["id"] and pg1["copia_cola"].startswith("00020126PIX")
    assert pg1["valor_centavos"] == 1500 and pg1["status"] == "pendente" and pg1["ref"].startswith("KZ")
    assert [o[0] for o in outras] == ["ok", "ok", "muitos"]  # no máximo 3 cobranças esperando por pessoa
    assert len(criadas) == 3 and criadas[0]["expira_min"] == config.AJUSTES["pix_validade_min"][0]


def test_provedor_fora_do_ar_nao_deixa_cobranca_pendurada(tmp_path):
    async def cenario():
        banco, apoio, prov, *_ = await montar(tmp_path)
        try:
            prov.falhar = True
            estado, _ = await apoio.cobrar(G, USER_A, "doacao", 1000, "Doacao")
            pendentes = await banco.pg_pendentes_da_pessoa(G, USER_A)
            return estado, pendentes
        finally:
            await banco.fechar()

    assert rodar(cenario) == ("erro", 0)


# ------------------------------------------------------------------ pagamento confirmado
def test_kitsune_pago_libera_uma_vez_so(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana")
        banco, apoio, prov, mural, guild, cargo, _ = await montar(tmp_path, [ana])
        try:
            _, pg = await apoio.cobrar(G, USER_A, "kitsune", 3 * 1500, "Kitsune 3", meses=3)
            antes = await apoio.conferir(pg)
            prov.pagar(pg["provedor_id"])
            # o webhook, o laço e o botão "já paguei" chegam todos juntos
            resultados = await asyncio.gather(*[apoio.conferir(pg) for _ in range(6)])
            depois = await apoio.conferir(pg)
            linha = await banco.pg_por_id(pg["id"])
            selo = await banco.mc_kitsune_de(G, USER_A)
            return antes, resultados, depois, linha, selo, ana, mural, cargo
        finally:
            await banco.fechar()

    antes, resultados, depois, linha, selo, ana, mural, cargo = rodar(cenario)
    assert antes == "pendente" and depois == "ja"
    assert resultados.count("pago") == 1 and set(resultados) <= {"pago", "ja", "ocupado"}
    assert linha["status"] == "pago" and linha["aplicado"] == 1 and linha["jogo_ok"] == 0
    assert selo["ativo"] == 1 and int(selo["ate"]) == int(linha["kitsune_ate"])
    assert ana.roles == [cargo]  # o cargo foi dado uma vez
    assert len(ana.dms) == 1 and "Kitsune" in ana.dms[0] and "vincular" in ana.dms[0]  # sem conta ligada, avisa como ligar
    assert len(mural.mensagens) == 1 and "virou Kitsune" in mural.mensagens[0]


def test_valor_ou_referencia_errados_nao_liberam_nada(tmp_path):
    async def cenario():
        banco, apoio, prov, mural, *_ = await montar(tmp_path)
        try:
            _, pg = await apoio.cobrar(G, USER_A, "kitsune", 1500, "Kitsune", meses=1)
            prov.pagar(pg["provedor_id"], valor=100)  # pagou só R$ 1,00
            menor = await apoio.conferir(pg)
            prov.pagar(pg["provedor_id"], valor=1500, ref="OUTRA-COISA")
            trocada = await apoio.conferir(pg)
            return menor, trocada, (await banco.pg_por_id(pg["id"]))["status"], await banco.mc_kitsune_de(G, USER_A)
        finally:
            await banco.fechar()

    menor, trocada, status, selo = rodar(cenario)
    assert menor == "valor" and trocada == "ref" and status == "pendente" and selo is None


def test_recusado_cancela_e_devolvido_avisa_a_staff(tmp_path):
    async def cenario():
        banco, apoio, prov, *_ = await montar(tmp_path)
        avisos: list[str] = []

        async def avisar(_gid, texto):
            avisos.append(texto)

        apoio._avisar_staff = avisar  # type: ignore[method-assign]
        try:
            _, a = await apoio.cobrar(G, USER_A, "doacao", 1000, "D")
            prov.pagar(a["provedor_id"], status="recusado")
            recusado = await apoio.conferir(a)
            _, b = await apoio.cobrar(G, USER_B, "doacao", 2000, "D")
            prov.pagar(b["provedor_id"])
            await apoio.conferir(b)
            prov.pagar(b["provedor_id"], status="devolvido")
            devolvido = await apoio.conferir(await banco.pg_por_id(b["id"]))
            return recusado, (await banco.pg_por_id(a["id"]))["status"], devolvido, avisos
        finally:
            await banco.fechar()

    recusado, status_a, devolvido, avisos = rodar(cenario)
    assert recusado == "cancelado" and status_a == "cancelado" and devolvido == "devolvido"
    assert len(avisos) == 1 and "devolvido" in avisos[0]


def test_doacao_vai_para_a_meta_e_fecha_quando_bate(tmp_path):
    async def cenario():
        ana, bia = MembroFalso(USER_A, "Ana"), MembroFalso(USER_B, "Bia")
        banco, apoio, prov, mural, *_ = await montar(tmp_path, [ana, bia])
        try:
            meta = await banco.meta_criar(G, "Host de novembro", 3000, "", 0)
            destino = await apoio.meta_destino(G, None)
            _, a = await apoio.cobrar(G, USER_A, "doacao", 2000, "D", meta_id=destino, mensagem="força!")
            prov.pagar(a["provedor_id"])
            await apoio.conferir(a)
            meio = (await banco.meta_por_id(G, meta))["encerrada_em"]
            _, b = await apoio.cobrar(G, USER_B, "doacao", 1000, "D", meta_id=destino, anonimo=True)
            prov.pagar(b["provedor_id"])
            await apoio.conferir(b)
            fim = await banco.meta_por_id(G, meta)
            depois = await apoio.meta_destino(G, meta)  # a meta já fechou: doação nova vai como geral
            return destino == meta, meio, fim, depois, mural.mensagens, ana.dms, bia.dms
        finally:
            await banco.fechar()

    destino_ok, meio, fim, depois, mural, dms_a, dms_b = rodar(cenario)
    assert destino_ok and meio == 0 and fim["encerrada_em"] > 0 and fim["motivo_fim"] == "concluida" and depois is None
    assert "Ana" in mural[0] and "R$ 20,00" in mural[0] and "força!" in mural[0] and "Host de novembro" in mural[0]
    assert "Bia" not in mural[1] and textos.APOIO_ANONIMO in mural[1]  # anônimo não aparece no mural
    assert any("Meta batida" in m for m in mural)
    assert "R$ 20,00" in dms_a[0] and "R$ 10,00" in dms_b[0]


def test_nao_aplicado_e_reaplicado_depois_de_cair(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana")
        banco, apoio, prov, mural, *_ = await montar(tmp_path, [ana])
        try:
            _, pg = await apoio.cobrar(G, USER_A, "doacao", 1000, "D")
            await banco.pg_marcar_pago(pg["id"], 30, 0)  # o bot caiu logo depois de marcar como pago
            pendentes = [p["id"] for p in await banco.pg_nao_aplicados()]
            for p in await banco.pg_nao_aplicados():
                await apoio.aplicar(p)
            return pendentes, await banco.pg_nao_aplicados(), mural.mensagens
        finally:
            await banco.fechar()

    pendentes, depois, mural = rodar(cenario)
    assert len(pendentes) == 1 and depois == [] and len(mural) == 1


# ------------------------------------------------------------------ ponte: webhook e entrega do Kitsune no jogo
async def montar_ponte(tmp_path, membros=()):
    from cogs_minecraft.ponte import Ponte

    banco, apoio, prov, mural, guild, cargo, registro = await montar(tmp_path, membros)
    ponte = Ponte(apoio.bot)  # type: ignore[arg-type]
    registro["Ponte"] = ponte
    canal = CanalFalso()

    async def canal_mc(_gid, _chave):
        return canal

    ponte.canal_mc = canal_mc  # type: ignore[method-assign]
    cliente = TestClient(TestServer(ponte.criar_app()))
    await cliente.start_server()
    return banco, apoio, prov, mural, cliente, ponte


def test_webhook_confere_na_api_e_nao_precisa_do_token(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana")
        banco, apoio, prov, mural, cliente, _ = await montar_ponte(tmp_path, [ana])
        try:
            _, pg = await apoio.cobrar(G, USER_A, "doacao", 1000, "D")
            falso = await cliente.post("/pix/webhook", json={"type": "payment", "data": {"id": pg["provedor_id"]}})  # ninguém pagou
            await asyncio.sleep(0.05)
            ainda = (await banco.pg_por_id(pg["id"]))["status"]
            prov.pagar(pg["provedor_id"])
            real = await cliente.post("/pix/webhook", json={"type": "payment", "data": {"id": pg["provedor_id"]}})
            await asyncio.sleep(0.1)
            ignorado = await cliente.post("/pix/webhook", json={"type": "plan", "data": {"id": "1"}})
            lixo = await cliente.post("/pix/webhook", data="não é json")
            desconhecido = await cliente.post("/pix/webhook", json={"type": "payment", "data": {"id": "55555"}})
            await asyncio.sleep(0.05)
            return falso.status, ainda, real.status, (await banco.pg_por_id(pg["id"]))["status"], ignorado.status, lixo.status, desconhecido.status
        finally:
            await cliente.close()
            await banco.fechar()

    falso, ainda, real, status, ignorado, lixo, desconhecido = rodar(cenario)
    assert falso == 200 and ainda == "pendente"  # um aviso por si só não credita nada
    assert real == 200 and status == "pago"
    assert ignorado == 200 and lixo == 200 and desconhecido == 200


def test_webhook_com_segredo_exige_assinatura(tmp_path):
    async def cenario():
        os.environ["MERCADOPAGO_WEBHOOK_SECRET"] = "s3gredo"
        banco, apoio, prov, mural, cliente, _ = await montar_ponte(tmp_path, [MembroFalso(USER_A, "Ana")])
        try:
            _, pg = await apoio.cobrar(G, USER_A, "doacao", 1000, "D")
            prov.pagar(pg["provedor_id"])
            sem = await cliente.post("/pix/webhook", json={"type": "payment", "data": {"id": pg["provedor_id"]}})
            ts, rid = "1700000000", "r1"
            v1 = hmac.new(b"s3gredo", f"id:{pg['provedor_id']};request-id:{rid};ts:{ts};".encode(), hashlib.sha256).hexdigest()
            com = await cliente.post(
                "/pix/webhook", json={"type": "payment", "data": {"id": pg["provedor_id"]}},
                headers={"x-signature": f"ts={ts},v1={v1}", "x-request-id": rid})
            await asyncio.sleep(0.1)
            return sem.status, com.status, (await banco.pg_por_id(pg["id"]))["status"]
        finally:
            os.environ.pop("MERCADOPAGO_WEBHOOK_SECRET", None)
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == (401, 200, "pago")


def test_sync_entrega_o_kitsune_comprado_ao_jogo(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana")
        banco, apoio, prov, mural, cliente, ponte = await montar_ponte(tmp_path, [ana])
        try:
            r = await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)
            await banco.mc_vincular(G, USER_A, (await r.json())["codigo"])
            _, pg = await apoio.cobrar(G, USER_A, "kitsune", 3000, "K", meses=2)
            prov.pagar(pg["provedor_id"])
            await apoio.conferir(pg)
            selo_jogo = {"ativo": False, "ate": 0}  # o jogo ainda não sabe da compra
            sync = lambda chave, extra=None: cliente.post(  # noqa: E731
                "/mc/sync", json={"id": "mc-1", "nome": "Raposa", "chave": chave, "caudas": 0, "xp": 0, "kitsune": selo_jogo, **(extra or {})}, headers=AUTH)
            r1 = await (await sync("k1")).json()
            selo_depois_sync1 = await banco.mc_kitsune_de(G, USER_A)  # o estado velho do jogo NÃO tirou o selo comprado
            r2 = await (await sync("k2")).json()  # o jogo não confirmou: manda de novo
            selo_jogo.update({"ativo": True, "ate": r1["kitsune_conceder"][0]["ate"]})
            r3 = await (await sync("k3", {"kitsune_ok": [pg["id"]]})).json()
            linha = await banco.pg_por_id(pg["id"])
            r4 = await (await sync("k4")).json()
            alheio = await cliente.post(  # confirmar compra de outra pessoa não vale
                "/mc/sync", json={"id": "mc-1", "nome": "Raposa", "chave": "k5", "caudas": 0, "xp": 0, "kitsune_ok": [9999, "x", True]}, headers=AUTH)
            return r1, selo_depois_sync1, r2, r3, linha, r4, alheio.status
        finally:
            await cliente.close()
            await banco.fechar()

    r1, selo, r2, r3, linha, r4, alheio = rodar(cenario)
    assert len(r1["kitsune_conceder"]) == 1 and r1["kitsune_conceder"][0]["ate"] == r2["kitsune_conceder"][0]["ate"]
    assert selo["ativo"] == 1 and int(selo["ate"]) == r1["kitsune_conceder"][0]["ate"]
    assert "kitsune_conceder" not in r3 and linha["jogo_ok"] == 1 and "kitsune_conceder" not in r4
    assert alheio == 200


def test_sem_ponte_o_apoio_ainda_confere_por_polling(tmp_path):
    async def cenario():
        banco, apoio, prov, *_ = await montar(tmp_path, [MembroFalso(USER_A, "Ana")])
        try:
            _, pg = await apoio.cobrar(G, USER_A, "doacao", 1000, "D")
            prov.pagar(pg["provedor_id"])
            for p in await banco.pg_a_conferir():  # é o que o laço de 15 s faz
                await apoio.conferir(p)
            return (await banco.pg_por_id(pg["id"]))["status"]
        finally:
            await banco.fechar()

    assert rodar(cenario) == "pago"


# ------------------------------------------------------------------ textos e configuração
def test_boost_nao_da_mais_kitsune():
    assert "boost" not in textos.KITSUNE_DESC.lower()
    faq = " ".join(v for p, v in textos.DUVIDAS_CAMPOS if "Kitsune" in p)
    assert "PIX" in faq and "Boost não dá Kitsune" in faq
    assert any("Boost não dá mais Kitsune" in i for i in textos.CHANGELOG[0][2]) and textos.CHANGELOG[0][0] == config.VERSAO


def test_configuracao_do_apoio():
    a = config.AJUSTES
    assert a["kitsune_preco"][0] == 15 and a["kitsune_dias_mes"][0] == 30 and a["doacao_min"][0] == 5 and a["apoio_ligado"][0] == 1
    assert config.KITSUNE_MESES == (1, 3, 6, 12) and "apoio" in config.COGS and "doacoes" in config.CANAIS_CONFIG and "apoiador" in config.CARGOS_BASE


# ------------------------------------------------------------------ provedor (Mercado Pago) contra um servidor de mentira
def test_mercado_pago_cria_e_consulta(tmp_path, monkeypatch):
    pedidos: list[dict] = []

    async def criar(request):
        corpo = await request.json()
        pedidos.append({"corpo": corpo, "auth": request.headers.get("Authorization"), "idem": request.headers.get("X-Idempotency-Key")})
        if corpo["transaction_amount"] > 1000:
            return web.json_response({"message": "valor alto"}, status=400)
        return web.json_response({"id": 777, "status": "pending", "point_of_interaction": {"transaction_data": {"qr_code": "000201PIX", "qr_code_base64": "QUJD"}}}, status=201)

    async def ver(request):
        if request.match_info["pid"] == "777":
            return web.json_response({"id": 777, "status": "approved", "transaction_amount": 15.0, "external_reference": "KZREF"})
        return web.json_response({"message": "nao existe"}, status=404)

    async def cenario():
        app = web.Application()
        app.add_routes([web.post("/v1/payments", criar), web.get("/v1/payments/{pid}", ver)])
        servidor = TestServer(app)
        await servidor.start_server()
        monkeypatch.setattr(pixmod, "API", f"http://127.0.0.1:{servidor.port}")
        monkeypatch.setenv("PUBLIC_BASE_URL", "https://bot.exemplo/")
        mp = MercadoPago("token-de-teste")
        try:
            cobranca = await mp.criar(1500, "Kitsune", "KZREF", 30)
            pagamento = await mp.consultar("777")
            erros = []
            for fn in (lambda: mp.criar(200000, "x", "KZ2", 30), lambda: mp.consultar("1")):
                try:
                    await fn()
                except PixErro as e:
                    erros.append(str(e))
            return cobranca, pagamento, erros, None
        finally:
            await mp.fechar()
            await servidor.close()

    cobranca, pagamento, erros, _ = rodar(cenario)
    assert cobranca == CobrancaPix("777", "000201PIX", "QUJD")
    assert pagamento == PagamentoPix("777", "aprovado", 1500, "KZREF")
    assert len(erros) == 2 and "HTTP 400" in erros[0] and "HTTP 404" in erros[1]
    corpo = pedidos[0]["corpo"]
    assert corpo["transaction_amount"] == 15.0 and corpo["payment_method_id"] == "pix" and corpo["external_reference"] == "KZREF"
    assert corpo["notification_url"] == "https://bot.exemplo/pix/webhook" and pedidos[0]["auth"] == "Bearer token-de-teste" and pedidos[0]["idem"] == "KZREF"
    assert corpo["date_of_expiration"].endswith("-03:00")


def test_sem_chave_o_pix_nao_liga():
    async def cenario():
        mp = MercadoPago("")
        assert not mp.configurado
        with pytest.raises(pixmod.PixNaoConfigurado):
            await mp.criar(1500, "x", "r", 30)
        with pytest.raises(pixmod.PixNaoConfigurado):
            await mp.consultar("1")

    rodar(cenario)


# ------------------------------------------------------------------ API de Orders (a nova do Mercado Pago)
def test_mercado_pago_orders_cria_consulta_e_cai_para_payments(monkeypatch):
    pedidos: list[dict] = []
    estados = {"ORD1": ("processed", "accredited"), "ORD2": ("action_required", "waiting_transfer"), "ORD3": ("expired", "expired"),
               "ORD4": ("refunded", "refunded"), "ORD5": ("processed", "pending")}

    async def criar_ordem(request):
        corpo = await request.json()
        pedidos.append({"corpo": corpo, "idem": request.headers.get("X-Idempotency-Key"), "auth": request.headers.get("Authorization")})
        if corpo["external_reference"] == "NEGADO":
            return web.json_response({"message": "sem acesso"}, status=403)
        return web.json_response({"id": "ORD1", "status": "action_required", "transactions": {"payments": [{"id": "PAY1", "payment_method": {
            "id": "pix", "type": "bank_transfer", "qr_code": "000201ORDERS", "qr_code_base64": "QUJD"}}]}}, status=201)

    async def ver_ordem(request):
        oid = request.match_info["oid"]
        if oid not in estados:
            return web.Response(text="nao encontrado", status=404)
        status, detalhe = estados[oid]
        return web.json_response({"id": oid, "status": status, "status_detail": detalhe, "total_amount": "15.00", "external_reference": "KZREF",
                                  "transactions": {"payments": [{"id": "PAY1", "status": status, "status_detail": detalhe, "amount": "15.00"}]}})

    async def criar_pagamento(request):
        return web.json_response({"id": 321, "status": "pending", "point_of_interaction": {"transaction_data": {"qr_code": "000201PAYMENTS", "qr_code_base64": ""}}}, status=201)

    async def cenario():
        app = web.Application()
        app.add_routes([web.post("/v1/orders", criar_ordem), web.get("/v1/orders/{oid}", ver_ordem), web.post("/v1/payments", criar_pagamento)])
        servidor = TestServer(app)
        await servidor.start_server()
        monkeypatch.setattr(pixmod, "API", f"http://127.0.0.1:{servidor.port}")
        mp = MercadoPago("token")
        try:
            cobranca = await mp.criar(1500, "Kitsune", "KZREF", 10)
            status = {oid: (await mp.consultar(oid)).status for oid in estados}
            completo = await mp.consultar("ORD1")
            caiu = await mp.criar(1500, "x", "NEGADO", 30)  # a API nova recusou: tenta a antiga
            return cobranca, status, completo, caiu
        finally:
            await mp.fechar()
            await servidor.close()

    cobranca, status, completo, caiu = rodar(cenario)
    assert cobranca == CobrancaPix("ORD1", "000201ORDERS", "QUJD")
    corpo = pedidos[0]["corpo"]
    assert corpo["type"] == "online" and corpo["total_amount"] == "15.00" and corpo["processing_mode"] == "automatic"
    assert corpo["external_reference"] == "KZREF" and corpo["payer"]["email"]
    assert corpo["transactions"]["payments"][0] == {"amount": "15.00", "payment_method": {"id": "pix", "type": "bank_transfer"}, "expiration_time": "PT30M"}
    assert pedidos[0]["idem"] == "KZREF" and pedidos[0]["auth"] == "Bearer token"
    assert status == {"ORD1": "aprovado", "ORD2": "pendente", "ORD3": "cancelado", "ORD4": "devolvido", "ORD5": "pendente"}
    assert completo == PagamentoPix("ORD1", "aprovado", 1500, "KZREF")
    assert caiu == CobrancaPix("321", "000201PAYMENTS", "")


def test_webhook_aceita_pedido_da_api_de_orders(tmp_path):
    async def cenario():
        banco, apoio, prov, mural, cliente, _ = await montar_ponte(tmp_path, [MembroFalso(USER_A, "Ana")])
        try:
            _, pg = await apoio.cobrar(G, USER_A, "doacao", 1000, "D")
            await banco._exec("UPDATE pagamentos SET provedor_id = 'ORD01ABC' WHERE id = ?", (pg["id"],))
            prov.estado["ORD01ABC"] = PagamentoPix("ORD01ABC", "aprovado", 1000, pg["ref"])
            r = await cliente.post("/pix/webhook", json={"type": "order", "action": "order.processed", "data": {"id": "ORD01ABC"}})
            await asyncio.sleep(0.1)
            lixo = await cliente.post("/pix/webhook", json={"type": "order", "data": {"id": "../../x"}})
            return r.status, (await banco.pg_por_id(pg["id"]))["status"], lixo.status
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == (200, "pago", 200)
