"""Apelido do Discord igual ao do jogo ([TAG] Apelido): formato, fila, restauração, opt-out, hierarquia e a rota /mc/sync.

Rode com:  pytest -q tests/test_nick_sinc.py
"""
import logging
from types import SimpleNamespace

import discord

from test_ponte_minecraft import AUTH, G, USER_A, USER_B, MembroFalso, montar, rodar, vincular

from cogs_minecraft.nick_sinc import MAX_NICK, NickSinc, abreviar, limpar_parte, montar_apelido, motivo_bloqueio


# ------------------------------------------------------------------ funções puras
def test_formato_com_cla_e_sem_cla():
    assert montar_apelido("RAP", "Raposa", "Conta123") == "[RAP] Raposa"
    assert montar_apelido("rap", "", "Conta123") == "[RAP] Conta123"  # sem apelido: o nome da conta; tag em maiúsculas
    assert montar_apelido("", "Raposa", "Conta123") == "Raposa"
    assert montar_apelido("", "", "Conta123") == "Conta123"
    assert montar_apelido("", "Raposa", "Conta123", sem_cla=False) == ""  # 0 = não mexe em quem não tem clã
    assert montar_apelido("RAP", "Raposa", "Conta123", sem_cla=False) == "[RAP] Raposa"


def test_corte_abrevia_o_apelido_e_nunca_a_tag():
    longo = "A" * 40
    r = montar_apelido("RAP", longo, "x")
    assert len(r) == MAX_NICK and r.startswith("[RAP] ") and r.endswith("…")
    assert len(montar_apelido("", longo, "x")) == MAX_NICK
    r8 = montar_apelido("ABCDEFGHIJ", longo, "x")  # tag maior que o permitido: vira 8, inteira
    assert r8.startswith("[ABCDEFGH] ") and len(r8) == MAX_NICK
    assert abreviar("curto", 10) == "curto" and abreviar("abcdef", 4) == "abc…"


def test_sem_cores_mencoes_links_e_controle():
    assert limpar_parte("§6Rapo§rsa") == "Raposa"
    assert "@" not in limpar_parte("@everyone <@123> oi")
    assert limpar_parte("veja https://x.com/abc agora") == "veja agora"
    assert limpar_parte("site www.exemplo.com") == "site"
    assert limpar_parte("a\nb\x00c​d") == "a b c d"
    assert montar_apelido("", "@@@", "") == ""  # nada sobrou: não mexe
    assert montar_apelido("§c", "", "") == ""


# ------------------------------------------------------------------ cenário com membros falsos
class MembroNick(MembroFalso):
    def __init__(self, user_id, nome, nick=None, top_role=1, bot=False):
        super().__init__(user_id, nome)
        self.nick = nick
        self.top_role = top_role
        self.bot = bot
        self.edicoes: list = []
        self.recusar = False
        self.guild = None

    async def edit(self, nick=None, reason=None):
        if self.recusar:
            raise discord.Forbidden(SimpleNamespace(status=403, reason="x"), "sem permissão")
        self.nick = nick
        self.edicoes.append(nick)


class RespostaFalsa:
    def __init__(self):
        self.respostas = []

    def is_done(self):
        return False

    async def send_message(self, **kw):
        self.respostas.append(kw)


def interacao(guild, membro):
    r = RespostaFalsa()
    return SimpleNamespace(guild=guild, user=membro, response=r, followup=r), r


async def cenario_base(tmp_path, membros, dono=999, permissao=True, cargo_bot=5):
    banco, ponte, cliente, canais = await montar(tmp_path, membros)
    guild = ponte.bot.guilds[0]
    guild.owner_id = dono
    guild.me = SimpleNamespace(top_role=cargo_bot, guild_permissions=SimpleNamespace(manage_nicknames=permissao))
    nick = NickSinc(ponte.bot)  # type: ignore[arg-type]
    ponte.bot.get_cog = lambda nome: nick if nome == "NickSinc" else None
    return banco, ponte, cliente, nick, guild


def sync(chave, cla="", apelido=None):
    corpo = {"id": "mc-1", "nome": "Raposa", "chave": chave, "caudas": 0, "xp": 0, "cla": cla}
    if apelido is not None:
        corpo["apelido"] = apelido
    return corpo


async def esvaziar(nick):
    """Processa tudo que está na fila, ignorando os intervalos."""
    n = 0
    while nick._fila:
        n += 1
        assert await nick.processar_proximo(agora=1e12)
    return n


def test_sync_muda_o_apelido_guarda_o_original_e_so_reaplica_com_mudanca(tmp_path):
    async def cenario():
        ana = MembroNick(USER_A, "Ana", nick="Aninha")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana])
        try:
            await vincular(banco, cliente, USER_A)
            r = await cliente.post("/mc/sync", json=sync("a1", "RAP", "Raposa Ana"), headers=AUTH)
            assert r.status == 200
            assert ana.nick == "Aninha"  # fora da requisição: só na fila
            assert list(nick._fila) == [USER_A]
            await esvaziar(nick)
            primeiro = ana.nick
            await cliente.post("/mc/sync", json=sync("a2", "RAP", "Raposa Ana"), headers=AUTH)
            sem_mudanca = list(nick._fila)  # nada mudou: nada na fila
            await cliente.post("/mc/sync", json=sync("a3", "", "Raposa Ana"), headers=AUTH)  # saiu do clã
            await esvaziar(nick)
            linha = await banco.nick_linha(G, USER_A)
            return primeiro, sem_mudanca, ana.nick, ana.edicoes, linha["original"], linha["aplicado"]
        finally:
            await cliente.close()
            await banco.fechar()

    primeiro, sem_mudanca, final, edicoes, original, aplicado = rodar(cenario)
    assert primeiro == "[RAP] Raposa Ana" and sem_mudanca == []
    assert final == "Raposa Ana" and edicoes == ["[RAP] Raposa Ana", "Raposa Ana"]
    assert original == "Aninha" and aplicado == "Raposa Ana"  # o original é o de ANTES da primeira mudança


def test_corpo_sem_os_campos_novos_nao_mexe(tmp_path):
    async def cenario():
        ana = MembroNick(USER_A, "Ana")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana])
        try:
            await vincular(banco, cliente, USER_A)
            r = await cliente.post("/mc/sync", json={"id": "mc-1", "nome": "Raposa", "chave": "z", "caudas": 0, "xp": 0}, headers=AUTH)
            return r.status, dict(nick._fila)
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == (200, {})


def test_login_reaplica_sem_mudanca_e_a_briga_so_registra(tmp_path):
    async def cenario():
        ana = MembroNick(USER_A, "Ana")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana])
        try:
            await vincular(banco, cliente, USER_A)
            await cliente.post("/mc/sync", json=sync("b1", "RAP", ""), headers=AUTH)
            await esvaziar(nick)
            ana.nick = "Meu jeito"  # a pessoa mudou sozinha
            await nick.on_member_update(SimpleNamespace(nick="[RAP] Raposa"), ana)  # só registra
            await cliente.post("/mc/sync", json=sync("b2", "RAP", ""), headers=AUTH)
            sem_briga = (list(nick._fila), ana.nick)
            await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)  # entrou no jogo
            await cliente.post("/mc/sync", json=sync("b3", "RAP", ""), headers=AUTH)
            enfileirou = list(nick._fila)
            await esvaziar(nick)
            return sem_briga, enfileirou, ana.nick
        finally:
            await cliente.close()
            await banco.fechar()

    sem_briga, enfileirou, final = rodar(cenario)
    assert sem_briga == ([], "Meu jeito")
    assert enfileirou == [USER_A] and final == "[RAP] Raposa"


def test_intervalo_minimo_por_pessoa_e_fila_lenta(tmp_path):
    async def cenario():
        ana, beto = MembroNick(USER_A, "Ana"), MembroNick(USER_B, "Beto")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana, beto])
        try:
            await vincular(banco, cliente, USER_A)
            await nick.receber(G, USER_A, "RAP", "")
            await nick.receber(G, USER_B, "", "")  # sem vínculo: o processamento não faz nada
            a = await nick.processar_proximo(agora=1e12)  # um item por chamada
            b = await nick.processar_proximo(agora=1e12)
            await nick.receber(G, USER_A, "AAA", "")  # mudou de novo logo depois
            due = nick._fila[USER_A][1]
            ultimo = nick._ultimo[USER_A]
            antes = await nick.processar_proximo(agora=ultimo + 5)  # antes dos 30 s: não faz
            depois = await nick.processar_proximo(agora=ultimo + 31)
            return a, b, due - ultimo, antes, depois, ana.edicoes
        finally:
            await cliente.close()
            await banco.fechar()

    a, b, espera, antes, depois, edicoes = rodar(cenario)
    assert a is True and b is True
    assert espera >= 30 and antes is False and depois is True
    assert edicoes == ["[RAP] Raposa", "[AAA] Raposa"]


def test_hierarquia_dono_bot_cargo_e_permissao(tmp_path):
    async def cenario():
        dono = MembroNick(USER_A, "Dono", top_role=1)
        alto = MembroNick(USER_B, "Alto", top_role=5)
        robo = MembroNick(333, "Robo", bot=True)
        livre = MembroNick(444, "Livre", top_role=1)
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [dono, alto, robo, livre], dono=USER_A, cargo_bot=5)
        try:
            motivos = [motivo_bloqueio(guild, m) for m in (dono, alto, robo, livre)]
            guild.me.guild_permissions.manage_nicknames = False
            sem_perm = motivo_bloqueio(guild, livre)
            guild.me.guild_permissions.manage_nicknames = True
            return motivos, sem_perm
        finally:
            await cliente.close()
            await banco.fechar()

    motivos, sem_perm = rodar(cenario)
    assert motivos == ["dono", "cargo", "bot", None] and sem_perm == "permissao"


def test_processar_nao_edita_quem_nao_pode(tmp_path):
    async def cenario():
        alto = MembroNick(USER_A, "Alto", top_role=9)
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [alto], cargo_bot=5)
        try:
            await vincular(banco, cliente, USER_A)
            await nick.receber(G, USER_A, "RAP", "")
            await esvaziar(nick)
            return alto.edicoes, (await banco.nick_linha(G, USER_A))["guardou"]
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == ([], 0)


def test_forbidden_registra_uma_vez_e_suspende_por_24h(tmp_path, caplog):
    async def cenario():
        ana = MembroNick(USER_A, "Ana")
        ana.recusar = True
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana])
        try:
            await vincular(banco, cliente, USER_A)
            await nick.receber(G, USER_A, "RAP", "")
            await esvaziar(nick)
            linha = await banco.nick_linha(G, USER_A)
            enfileirou = await nick.receber(G, USER_A, "XYZ", "")  # suspensa: nem entra na fila
            nick._avisou.add(USER_A)
            return linha, enfileirou
        finally:
            await cliente.close()
            await banco.fechar()

    with caplog.at_level(logging.WARNING, logger="kiza.minecraft"):
        linha, enfileirou = rodar(cenario)
    import time

    assert int(linha["suspenso_ate"]) > time.time() + 23 * 3600 and linha["guardou"] == 0
    assert enfileirou is False
    assert len([r for r in caplog.records if "Sem permissão" in r.getMessage()]) == 1


def test_desvincular_restaura_e_nao_desfaz_escolha_da_pessoa(tmp_path):
    async def cenario():
        ana, beto = MembroNick(USER_A, "Ana", nick="Aninha"), MembroNick(USER_B, "Beto")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana, beto])
        try:
            await vincular(banco, cliente, USER_A)
            await nick.receber(G, USER_A, "RAP", "Raposa Ana")
            await esvaziar(nick)
            aplicado = ana.nick
            await banco.mc_desvincular(G, USER_A)
            await nick.ao_desvincular(guild, USER_A)
            restaurado = ana.nick
            # Beto: não tinha apelido; depois do bot, mudou sozinho; ao restaurar o que ele escolheu fica
            await vincular(banco, cliente, USER_B, "mc-2", "Beto")
            await nick.receber(G, USER_B, "", "")
            await esvaziar(nick)
            beto.nick = "Escolhi eu"
            await nick.ao_desvincular(guild, USER_B)
            return aplicado, restaurado, beto.nick, (await banco.nick_linha(G, USER_B))["guardou"]
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == ("[RAP] Raposa Ana", "Aninha", "Escolhi eu", 0)


def test_sem_apelido_antes_volta_para_nenhum(tmp_path):
    async def cenario():
        ana = MembroNick(USER_A, "Ana", nick=None)
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana])
        try:
            await vincular(banco, cliente, USER_A)
            await nick.receber(G, USER_A, "RAP", "")
            await esvaziar(nick)
            await nick.ao_desvincular(guild, USER_A)
            return ana.nick
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) is None


def test_optout_da_pessoa_ligar_desligar_ver(tmp_path):
    async def cenario():
        ana = MembroNick(USER_A, "Ana", nick="Aninha")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana])
        try:
            sem_conta, r0 = interacao(guild, ana)
            await NickSinc.ligar.callback(nick, sem_conta)
            await vincular(banco, cliente, USER_A)
            await cliente.post("/mc/sync", json=sync("c1", "RAP", ""), headers=AUTH)
            await esvaziar(nick)
            ver, rv = interacao(guild, ana)
            await NickSinc.ver.callback(nick, ver)
            des, rd = interacao(guild, ana)
            await NickSinc.desligar.callback(nick, des)
            depois_de_desligar = ana.nick
            enfileirou = await nick.receber(G, USER_A, "XYZ", "")  # desligada: o jogo muda e nada acontece
            des2, rd2 = interacao(guild, ana)
            await NickSinc.desligar.callback(nick, des2)
            lig, rl = interacao(guild, ana)
            await NickSinc.ligar.callback(nick, lig)
            await esvaziar(nick)
            return r0.respostas, rv.respostas, rd.respostas, depois_de_desligar, enfileirou, rd2.respostas, rl.respostas, ana.nick
        finally:
            await cliente.close()
            await banco.fechar()

    r0, rv, rd, depois, enfileirou, rd2, rl, final = rodar(cenario)
    assert "vincular" in r0[0]["content"]
    assert "ligada" in rv[0]["embed"].description and "[RAP] Raposa" in rv[0]["embed"].description and "Aninha" in rv[0]["embed"].description
    assert rd[0]["ephemeral"] is True and depois == "Aninha" and enfileirou is False
    assert "já tinha desligado" in rd2[0]["content"]
    assert rl[0]["ephemeral"] is True and final == "[XYZ] Raposa"  # voltou a sincronizar, com os dados mais novos


def test_dono_desliga_a_sincronia_restaura_todos_e_sem_cla_zero(tmp_path):
    async def cenario():
        ana, beto = MembroNick(USER_A, "Ana", nick="Aninha"), MembroNick(USER_B, "Beto")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana, beto])
        try:
            await vincular(banco, cliente, USER_A)
            await vincular(banco, cliente, USER_B, "mc-2", "Beto")
            await nick.receber(G, USER_A, "RAP", "")
            await nick.receber(G, USER_B, "", "")
            await esvaziar(nick)
            ligados = (ana.nick, beto.nick)
            todos = await nick.aplicar_todos(G)
            await esvaziar(nick)
            await banco.definir_ajuste(G, "nick_sinc_ligado", 0)
            await nick.varrer.coro(nick)
            fila = sorted(a for _g, _d, a in nick._fila.values())
            await esvaziar(nick)
            desligado = (ana.nick, beto.nick)
            nao_entra = await nick.receber(G, USER_A, "NOV", "")
            return ligados, todos, fila, desligado, nao_entra, await nick.aplicar_todos(G)
        finally:
            await cliente.close()
            await banco.fechar()

    ligados, todos, fila, desligado, nao_entra, todos_off = rodar(cenario)
    assert ligados == ("[RAP] Raposa", "Beto") and todos == 2
    assert fila == ["restaurar", "restaurar"] and desligado == ("Aninha", None)
    assert nao_entra is False and todos_off == 0


def test_sem_cla_zero_so_mexe_em_quem_tem_cla(tmp_path):
    async def cenario():
        ana, beto = MembroNick(USER_A, "Ana"), MembroNick(USER_B, "Beto")
        banco, ponte, cliente, nick, guild = await cenario_base(tmp_path, [ana, beto])
        try:
            await banco.definir_ajuste(G, "nick_sinc_sem_cla", 0)
            await vincular(banco, cliente, USER_A)
            await vincular(banco, cliente, USER_B, "mc-2", "Beto")
            await nick.receber(G, USER_A, "RAP", "")
            await nick.receber(G, USER_B, "", "")
            await esvaziar(nick)
            com_cla = (ana.nick, beto.nick)
            await nick.receber(G, USER_A, "", "")  # saiu do clã: volta ao que tinha
            await esvaziar(nick)
            return com_cla, ana.nick
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == (("[RAP] Raposa", None), None)
