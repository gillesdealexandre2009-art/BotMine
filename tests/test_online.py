"""/online: lista de quem está jogando, com menção para quem ligou a conta, e o aviso de servidor fora do ar."""
import time

from cogs_minecraft.embeds import montar_online


def test_online_lista_com_mencao_para_quem_ligou():
    agora = time.time()
    status = {"online": ["Rapo", "Harry"], "max": 20, "ts": agora}
    e = montar_online(status, agora, {"Rapo": "<@1>"})
    assert "2/20" in e.description and "• Rapo (<@1>)" in e.description and "• Harry" in e.description


def test_online_vazio_e_fora_do_ar():
    agora = time.time()
    assert "0/20" in montar_online({"online": [], "max": 20, "ts": agora}, agora).description
    assert "fora do ar" in montar_online({"online": ["A"], "max": 20, "ts": agora - 10_000}, agora).description
    assert "fora do ar" in montar_online(None, agora).description
