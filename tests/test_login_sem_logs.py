"""O canal de login fica só com o painel: logins, logouts e vínculos vão para o registro da staff (logs gerais), não para ele.

Rode com:  pytest -q tests/test_login_sem_logs.py
"""
from types import SimpleNamespace

import discord
from test_ponte_minecraft import AUTH, G, CanalFalso, MembroFalso, montar, rodar


def test_registro_de_login_vai_para_os_logs_gerais_e_nunca_para_o_canal_de_login(tmp_path):
    async def cenario():
        ana = MembroFalso(111, "Ana")
        banco, ponte, cliente, canais = await montar(tmp_path, [ana])
        try:
            codigo = (await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json())["codigo"]
            await ponte.vincular_conta(ponte.bot.guilds[0], ana, codigo)  # vínculo (o caminho do comando e do botão)
            await cliente.post("/mc/eventos", json={"eventos": [{"t": "entrada", "nome": "Raposa"}, {"t": "saida", "nome": "Raposa", "sessao": 90}]}, headers=AUTH)
            await ponte.vincular_conta(ponte.bot.guilds[0], ana, "ERRADO")  # código recusado
            return canais
        finally:
            await cliente.close()
            await banco.fechar()

    canais = rodar(cenario)
    assert canais["mc_login"].enviadas == []  # o canal de login não recebe nada
    titulos = [e.title for e in canais["mc_log"].embeds]
    assert "🔗 Conta ligada" in titulos and "🔓 Login" in titulos and "🔒 Logout" in titulos and "⚠️ Código recusado" in titulos
    assert len(canais["mc_chat"].embeds) == 2  # o chat-bridge segue com "entrou" e "saiu"


def test_canal_do_registro_e_o_de_logs_gerais_do_setup_e_sem_ele_nao_registra(tmp_path):
    async def cenario():
        banco, ponte, cliente, _canais = await montar(tmp_path)
        try:
            del ponte.canal_mc  # volta ao método de verdade (o teste trocava por canais falsos)
            canal = CanalFalso()
            ponte._buscar_canal = lambda canal_id: _async(canal if canal_id == 777 else None)  # type: ignore[method-assign]
            sem_config = await ponte.canal_mc(G, "mc_log")
            await banco.set_config(G, "canal_logs_gerais", "777")
            com_config = await ponte.canal_mc(G, "mc_log")
            return sem_config, com_config is canal
        finally:
            await cliente.close()
            await banco.fechar()

    async def _async(valor):
        return valor

    sem_config, com_config = rodar(cenario)
    assert sem_config is None and com_config is True


class CanalTexto(discord.TextChannel):
    """Canal de texto falso com histórico (só o que a limpeza usa)."""

    def __init__(self, mensagens):  # não chama o __init__ do discord.py de propósito
        self._mensagens = mensagens

    async def history(self, limit=100):
        for m in self._mensagens:
            yield m


class MensagemFalsa:
    def __init__(self, msg_id, autor_id, titulo=None):
        self.id = msg_id
        self.author = SimpleNamespace(id=autor_id)
        self.embeds = [SimpleNamespace(title=titulo)] if titulo else []
        self.apagada = False

    async def delete(self):
        self.apagada = True


def test_limpeza_unica_apaga_os_registros_antigos_e_preserva_o_painel(tmp_path):
    async def cenario():
        banco, ponte, cliente, _canais = await montar(tmp_path)
        try:
            ponte.bot.user = SimpleNamespace(id=999)
            painel = MensagemFalsa(1, 999, "🔐 Login da Vulpus")
            velhas = [MensagemFalsa(2, 999, "🔓 Login"), MensagemFalsa(3, 999, "🔗 Conta ligada"), MensagemFalsa(4, 999, "⚠️ Código recusado")]
            de_gente = MensagemFalsa(5, 123, "🔓 Login")  # de outra pessoa: nunca apaga
            outra_do_bot = MensagemFalsa(6, 999, "Algum aviso qualquer")  # do bot, mas não é registro: fica
            canal = CanalTexto([painel, *velhas, de_gente, outra_do_bot])
            await ponte._limpar_canal_login(canal)  # ainda não há painel guardado: não apaga nada
            antes = [m.apagada for m in velhas]
            await banco.set_config(G, "msg_mc_login", "1")
            await ponte._limpar_canal_login(canal)
            depois = [m.apagada for m in velhas]
            marcou = await banco.get_config(G, "mc_login_limpo")
            for m in velhas:
                m.apagada = False
            await ponte._limpar_canal_login(canal)  # já limpou uma vez: não repete
            repetiu = any(m.apagada for m in velhas)
            return antes, depois, painel.apagada, de_gente.apagada, outra_do_bot.apagada, marcou, repetiu
        finally:
            await cliente.close()
            await banco.fechar()

    antes, depois, painel, de_gente, outra, marcou, repetiu = rodar(cenario)
    assert antes == [False, False, False] and depois == [True, True, True]
    assert painel is False and de_gente is False and outra is False
    assert marcou == "1" and repetiu is False
