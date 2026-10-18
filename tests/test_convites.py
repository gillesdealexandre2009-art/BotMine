"""Convide um amigo: qual convite subiu, quando vale, pagamento uma vez só, teto mensal e entrada repetida."""
import asyncio
import time
from types import SimpleNamespace

import config
from cogs.convites import Convites, achar_convite, avaliar
from database import Banco

G, DONO, AMIGO, OUTRO = 1, 111, 222, 333
HORA = 3600


def rodar(c):
    return asyncio.run(c())


def test_achar_convite_so_com_um_candidato():
    assert achar_convite({"a": 1, "b": 0}, {"a": 1, "b": 1}) == "b"
    assert achar_convite({"a": 1}, {"a": 1}) is None
    assert achar_convite({"a": 1, "b": 0}, {"a": 2, "b": 1}) is None  # dois subiram: ambíguo, ninguém leva
    assert achar_convite({}, {"novo": 1}) == "novo"  # convite criado e usado entre dois retratos


def kw(**o):
    base = dict(nivel=3, tem_mc=True, ainda_no_servidor=True, horas=24, dias=14, nivel_min=3, exige_mc=True)
    base.update(o)
    return base


def test_avaliar():
    t = 1_000_000
    assert avaliar(t, t + 25 * HORA, **kw()) == "ok"
    assert avaliar(t, t + 2 * HORA, **kw()) == "pendente"  # tudo cumprido, mas cedo demais
    assert avaliar(t, t + 25 * HORA, **kw(nivel=2)) == "pendente"
    assert avaliar(t, t + 25 * HORA, **kw(tem_mc=False)) == "pendente"
    assert avaliar(t, t + 25 * HORA, **kw(tem_mc=False, exige_mc=False)) == "ok"
    assert avaliar(t, t + 15 * 24 * HORA, **kw(nivel=0)) == "expirado"
    assert avaliar(t, t + 25 * HORA, **kw(ainda_no_servidor=False)) == "saiu"


class Membro:
    def __init__(self, uid, nome):
        self.id, self.display_name, self.mention = uid, nome, f"<@{uid}>"
        self.dms = []

    async def send(self, texto):
        self.dms.append(texto)


async def montar(tmp_path):
    banco = Banco(str(tmp_path / "t.db"))
    await banco.conectar()
    membros = {DONO: Membro(DONO, "Dono"), AMIGO: Membro(AMIGO, "Amigo"), OUTRO: Membro(OUTRO, "Outro")}
    guild = SimpleNamespace(id=G, get_member=lambda u: membros.get(u))
    bot = SimpleNamespace(banco=banco, guilds=[guild], get_guild=lambda _g: guild)
    return banco, Convites(bot), guild, membros


async def preparar(banco, uid, xp, mc=True):
    await banco.adicionar_xp(G, uid, xp)
    if mc:
        await banco._exec(
            "INSERT INTO mc_vinculos (guild_id, user_id, mc_id, mc_nome, mc_nome_norm, vinculado_em, visto_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (G, uid, f"mc{uid}", f"Jog{uid}", f"jog{uid}", int(time.time()), int(time.time())),
        )


def test_banco_registra_uma_vez_e_fecha_uma_vez(tmp_path):
    async def c():
        banco, _cog, _g, _m = await montar(tmp_path)
        try:
            await banco.convite_salvar(G, DONO, "abc")
            assert await banco.convite_dono(G, "abc") == DONO and await banco.convite_dono(G, "zzz") is None
            assert await banco.convidado_registrar(G, AMIGO, DONO, "abc") is True
            assert await banco.convidado_registrar(G, AMIGO, OUTRO, "xyz") is False  # entrar de novo por outro link não vale
            assert [int(r["convidante_id"]) for r in await banco.convidados_pendentes(G)] == [DONO]
            assert await banco.convidado_fechar(G, AMIGO, "pago") is True
            assert await banco.convidado_fechar(G, AMIGO, "pago") is False
            assert (await banco.convites_stats(G, DONO)) == {"pago": 1}
        finally:
            await banco.fechar()

    rodar(c)


def test_conferir_paga_os_dois_uma_vez_so(tmp_path):
    async def c():
        banco, cog, guild, membros = await montar(tmp_path)
        try:
            await banco.convidado_registrar(G, AMIGO, DONO, "abc")
            await banco._exec("UPDATE convidados SET entrou_em = ?", (int(time.time()) - 30 * HORA,))
            assert await cog.conferir_servidor(guild) == 0  # ainda sem nível nem conta do Minecraft
            await preparar(banco, AMIGO, 10_000)  # xp alto: passa do nível 3
            assert await cog.conferir_servidor(guild) == 1
            assert await cog.conferir_servidor(guild) == 0  # repetir não paga de novo
            premio, novato = config.AJUSTES["convite_premio"][0], config.AJUSTES["convite_premio_novato"][0]
            assert await banco.saldo(G, DONO) == premio and await banco.saldo(G, AMIGO) == novato
            assert membros[DONO].dms and membros[AMIGO].dms
        finally:
            await banco.fechar()

    rodar(c)


def test_teto_mensal_so_paga_o_novato(tmp_path):
    async def c():
        banco, cog, guild, _m = await montar(tmp_path)
        try:
            await preparar(banco, AMIGO, 10_000)
            await preparar(banco, OUTRO, 10_000)
            for u in (AMIGO, OUTRO):
                await banco.convidado_registrar(G, u, DONO, "abc")
            await banco._exec("UPDATE convidados SET entrou_em = ?", (int(time.time()) - 30 * HORA,))
            await banco.set_config(G, "ajuste_convite_teto_mes", "1")
            assert await cog.conferir_servidor(guild) == 2
            assert await banco.saldo(G, DONO) == config.AJUSTES["convite_premio"][0]  # só um dos dois rendeu para quem convidou
            stats = await banco.convites_stats(G, DONO)
            assert stats == {"pago": 1, "teto": 1}
            assert await banco.saldo(G, AMIGO) > 0 and await banco.saldo(G, OUTRO) > 0
        finally:
            await banco.fechar()

    rodar(c)


def test_ajustes_do_convite_existem():
    a = config.AJUSTES
    assert a["convite_premio"][0] == 150 and a["convite_premio_novato"][0] == 75 and a["convite_nivel"][0] == 3
    assert "convites" in config.COGS
