"""Kitsune controlado pelo jogo: o servidor de Minecraft manda o estado do selo e o cargo do Discord só espelha.

Rode com:  pytest -q tests/test_kitsune_ponte.py
"""
import time
from types import SimpleNamespace

from test_ponte_minecraft import AUTH, G, USER_A, USER_B, MembroFalso, montar, rodar, vincular

CARGO_KITSUNE = 1550348302065860649


class CargoFalso:
    def __init__(self, role_id: int) -> None:
        self.id = role_id
        self.members: list = []


class MembroComCargos(MembroFalso):
    def __init__(self, user_id: int, nome: str, cargo: CargoFalso, tem: bool = False) -> None:
        super().__init__(user_id, nome)
        self.cargo = cargo
        self.roles = [cargo] if tem else []
        self.trocas: list[str] = []
        if tem:
            cargo.members.append(self)

    def get_role(self, role_id):
        return self.cargo if self.cargo in self.roles and role_id == self.cargo.id else None

    async def add_roles(self, cargo, reason=None):
        self.roles.append(cargo)
        cargo.members.append(self)
        self.trocas.append("deu")

    async def remove_roles(self, cargo, reason=None):
        self.roles.remove(cargo)
        cargo.members.remove(self)
        self.trocas.append("tirou")


async def montar_kitsune(tmp_path, quem):
    """Servidor falso com o cargo Kitsune e as pessoas indicadas (id, nome, já tem o cargo)."""
    cargo = CargoFalso(CARGO_KITSUNE)
    membros = [MembroComCargos(uid, nome, cargo, tem) for uid, nome, tem in quem]
    banco, ponte, cliente, canais = await montar(tmp_path, membros)
    ponte.bot.guilds[0].get_role = lambda rid: cargo if rid == CARGO_KITSUNE else None
    for m in membros:
        m.guild = ponte.bot.guilds[0]
    return banco, ponte, cliente, canais, cargo, membros


def agora_ms() -> int:
    return int(time.time() * 1000)


def corpo_sync(chave, kitsune=None):
    corpo = {"id": "mc-1", "nome": "Raposa", "chave": chave, "caudas": 0, "xp": 0}
    if kitsune is not None:
        corpo["kitsune"] = kitsune
    return corpo


class RespostaFalsa:
    def __init__(self, respostas):
        self.respostas = respostas

    def is_done(self):
        return False

    async def send_message(self, **kw):
        self.respostas.append(kw)


def test_kitsune_do_jogo_da_e_tira_o_cargo_e_avisa_o_historico(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana,) = await montar_kitsune(tmp_path, [(USER_A, "Ana", False)])
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            futuro = agora_ms() + 24 * 3600 * 1000
            a = (await cliente.post("/mc/sync", json=corpo_sync("k1", {"ativo": True, "ate": futuro}), headers=AUTH)).status
            depois_de_dar = [m.id for m in cargo.members]
            await cliente.post("/mc/sync", json=corpo_sync("k2", {"ativo": True, "ate": futuro}), headers=AUTH)  # igual: não avisa de novo
            await cliente.post("/mc/sync", json=corpo_sync("k3", {"ativo": False, "ate": 0}), headers=AUTH)  # o dono tirou no jogo
            return a, depois_de_dar, ana.trocas, [m.id for m in cargo.members], canais["mc_historico"].embeds, await banco.mc_kitsune_de(G, USER_A)
        finally:
            await cliente.close()
            await banco.fechar()

    a, depois_de_dar, trocas, depois_de_tirar, historico, estado = rodar(cenario)
    assert a == 200 and depois_de_dar == [USER_A] and depois_de_tirar == []
    assert trocas == ["deu", "tirou"]
    assert [e.title for e in historico] == ["🦊 Novo Kitsune", "🍂 Fim do Kitsune"]
    assert "Raposa" in historico[0].description and "<t:" in historico[0].description  # prazo com data do Discord
    assert "não é mais Kitsune" in historico[1].description
    assert not estado["ativo"]


def test_kitsune_sem_prazo_e_dado_invalido_nao_mexe_no_cargo(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana,) = await montar_kitsune(tmp_path, [(USER_A, "Ana", False)])
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            estranhos = [None, "sim", {"ativo": "sim"}, {"ativo": True, "ate": -5}, {"ativo": True, "ate": "amanhã"}, {"ativo": True, "ate": float("nan")}]
            for i, selo in enumerate(estranhos):
                await cliente.post("/mc/sync", json=corpo_sync(f"x{i}", selo), headers=AUTH)
            sem_mudar = list(cargo.members)
            await cliente.post("/mc/sync", json=corpo_sync("ok", {"ativo": True, "ate": 0}), headers=AUTH)  # sem prazo
            return sem_mudar, [m.id for m in cargo.members], canais["mc_historico"].embeds
        finally:
            await cliente.close()
            await banco.fechar()

    sem_mudar, com_selo, historico = rodar(cenario)
    assert sem_mudar == [] and com_selo == [USER_A]
    assert "sem prazo" in historico[0].description


def test_kitsune_com_prazo_vencido_perde_o_cargo_mesmo_offline(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana,) = await montar_kitsune(tmp_path, [(USER_A, "Ana", True)])
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            await banco.mc_kitsune_registrar(G, USER_A, True, agora_ms() - 1000)  # o prazo passou há 1 s e o jogo não avisou
            await ponte.vencer_kitsune.coro(ponte)
            estado = await banco.mc_kitsune_de(G, USER_A)
            return [m.id for m in cargo.members], bool(estado["ativo"]), canais["mc_historico"].embeds
        finally:
            await cliente.close()
            await banco.fechar()

    membros, ativo, historico = rodar(cenario)
    assert membros == [] and ativo is False
    assert historico and "acabou" in historico[0].description


def test_cargo_kitsune_so_pelo_jogo_reverte_mexida_na_mao(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana, bia, cris) = await montar_kitsune(
            tmp_path, [(USER_A, "Ana", False), (USER_B, "Bia", True), (333, "Cris", False)]
        )
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            await banco.mc_kitsune_registrar(G, USER_A, False, 0)  # o jogo diz: Ana NÃO é Kitsune
            # alguém dá o cargo à Ana na mão: volta
            await ana.add_roles(cargo)
            ana.trocas.clear()
            ponte._mexendo.clear()
            await ponte.on_member_update(SimpleNamespace(get_role=lambda _r: None), ana)  # type: ignore[arg-type]
            # a Bia nunca ligou conta (o jogo não disse nada): o cargo dela não é mexido
            bia.roles.clear()
            await ponte.on_member_update(SimpleNamespace(get_role=lambda _r: cargo), bia)  # type: ignore[arg-type]
            # o que o próprio bot muda não é desfeito
            await banco.mc_kitsune_registrar(G, USER_A, True, 0)
            ponte._mexendo[ana.id] = 10**12
            ana.roles.clear()
            await ponte.on_member_update(SimpleNamespace(get_role=lambda _r: cargo), ana)  # type: ignore[arg-type]
            return ana.trocas, bia.trocas, [m.id for m in cargo.members]
        finally:
            await cliente.close()
            await banco.fechar()

    trocas_ana, trocas_bia, com_cargo = rodar(cenario)
    assert trocas_ana == ["tirou"]  # só a mexida na mão da Ana foi desfeita
    assert trocas_bia == []
    assert USER_A not in com_cargo


def test_status_traz_os_selos_com_prazo_de_quem_esta_offline(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana, bia) = await montar_kitsune(tmp_path, [(USER_A, "Ana", False), (USER_B, "Bia", False)])
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")  # a Ana ligou; a Bia não
            ate = agora_ms() + 5 * 24 * 3600 * 1000
            lista = [{"nome": "Raposa", "ate": ate}, {"nome": "Fulano", "ate": ate}, {"nome": "x", "ate": "?"}, "lixo"]
            r = await cliente.post("/mc/status", json={"online": [], "kitsunes": lista}, headers=AUTH)
            primeira = [m.id for m in cargo.members]
            await cliente.post("/mc/status", json={"online": [], "kitsunes": [{"nome": "Raposa", "ate": ate}]}, headers=AUTH)  # igual: não avisa de novo
            return r.status, primeira, canais["mc_historico"].embeds
        finally:
            await cliente.close()
            await banco.fechar()

    status, primeira, historico = rodar(cenario)
    assert status == 200 and primeira == [USER_A]  # só quem ligou a conta ganha o cargo
    assert len(historico) == 1


def test_comando_kitsune_mostra_quem_tem_selo_e_quem_so_tem_cargo(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais, cargo, (ana, bia, cris) = await montar_kitsune(
            tmp_path, [(USER_A, "Ana", True), (USER_B, "Bia", True), (333, "Cris", True)]
        )
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            await vincular(banco, cliente, USER_B, "mc-2", "Lobo")
            await banco.mc_kitsune_registrar(G, USER_A, True, agora_ms() + 3 * 24 * 3600 * 1000)  # Ana: selo com prazo
            await banco.mc_kitsune_registrar(G, USER_B, False, 0)  # Bia: ligou, mas sem selo no jogo
            respostas: list[dict] = []  # Cris: tem o cargo e nunca ligou a conta
            interacao = SimpleNamespace(guild=ponte.bot.guilds[0], user=ana, response=RespostaFalsa(respostas), followup=None)
            await ponte.kitsune.callback(ponte, interacao)  # type: ignore[arg-type]
            return respostas
        finally:
            await cliente.close()
            await banco.fechar()

    respostas = rodar(cenario)
    campos = {c.name: c.value for c in respostas[0]["embed"].fields}
    com = [v for k, v in campos.items() if k.startswith("✅")][0]
    so_cargo = [v for k, v in campos.items() if k.startswith("⚠️")][0]
    assert "<@111>" in com and "Raposa" in com and "<t:" in com
    assert "<@222>" in so_cargo and "sem selo" in so_cargo and "Lobo" in so_cargo
    assert "<@333>" in so_cargo and "não ligou a conta" in so_cargo
    assert respostas[0]["ephemeral"] is True
