"""Mensagens do jogo no chat-bridge aparecem como se o jogador tivesse falado (webhook): nome do jogador e foto do Discord só para
Kitsune (os outros ganham uma cara cinza). Sem webhook, vale a linha normal da Kiza.

Rode com:  pytest -q tests/test_chat_como_jogador.py
"""
import time

import discord
from test_ponte_minecraft import AUTH, G, USER_A, USER_B, MembroFalso, montar, rodar, vincular

import config
from cogs_minecraft.ponte import Ponte


class WebhookFalso:
    def __init__(self, falha=None) -> None:
        self.enviadas: list[dict] = []
        self.falha = falha

    async def send(self, **kw):
        if self.falha is not None:
            raise self.falha
        self.enviadas.append(kw)


def com_webhook(ponte, webhook):
    async def _webhook(_gid):
        return webhook

    ponte._webhook_do_chat = _webhook  # type: ignore[method-assign]


def agora_ms() -> int:
    return int(time.time() * 1000)


def msg(nome, texto):
    return {"eventos": [{"t": "msg", "nome": nome, "texto": texto}]}


def test_kitsune_fala_com_a_foto_do_discord_e_os_outros_com_a_cara_cinza(tmp_path):
    async def cenario():
        ana, bia = MembroFalso(USER_A, "Ana Luz"), MembroFalso(USER_B, "Bia")
        banco, ponte, cliente, canais = await montar(tmp_path, [ana, bia])
        wh = WebhookFalso()
        com_webhook(ponte, wh)
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")  # Ana: Kitsune
            await vincular(banco, cliente, USER_B, "mc-2", "Lobo")  # Bia: ligou, mas não é Kitsune
            await banco.mc_kitsune_registrar(G, USER_A, True, agora_ms() + 3600_000)
            await cliente.post("/mc/eventos", json=msg("Raposa", "oi pessoal"), headers=AUTH)
            await cliente.post("/mc/eventos", json=msg("Lobo", "e aí"), headers=AUTH)
            await cliente.post("/mc/eventos", json=msg("SemConta", "sou novo"), headers=AUTH)  # não ligou: nem fala no jogo, mas o bot aguenta
            await banco.mc_kitsune_registrar(G, USER_A, True, agora_ms() - 1)  # o selo da Ana venceu
            await cliente.post("/mc/eventos", json=msg("Raposa", "acabou"), headers=AUTH)
            return wh.enviadas, canais["mc_chat"].enviadas
        finally:
            await cliente.close()
            await banco.fechar()

    enviadas, no_canal = rodar(cenario)
    assert [e["username"] for e in enviadas] == ["Raposa", "Lobo", "SemConta", "Raposa"]
    assert [e["content"] for e in enviadas] == ["oi pessoal", "e aí", "sou novo", "acabou"]
    assert enviadas[0]["avatar_url"] == "https://cdn.exemplo/111.png"  # Kitsune: a foto do Discord
    assert enviadas[1]["avatar_url"] == config.MC_AVATAR_PADRAO  # ligou a conta, mas sem selo: cara cinza
    assert enviadas[2]["avatar_url"] == config.MC_AVATAR_PADRAO  # sem conta: cara cinza
    assert enviadas[3]["avatar_url"] == config.MC_AVATAR_PADRAO  # selo vencido: volta para a cara cinza
    assert all(not e["allowed_mentions"].everyone and not e["allowed_mentions"].users and not e["allowed_mentions"].roles for e in enviadas)
    assert no_canal == []  # nada foi postado pela Kiza: foi tudo "falado" pelos jogadores


def test_a_cara_cinza_aponta_para_o_site():
    assert config.MC_AVATAR_PADRAO.endswith("/img/jogador-cinza.png") and config.MC_AVATAR_PADRAO.startswith("https://")


def test_mencoes_no_texto_sao_neutralizadas(tmp_path):
    async def cenario():
        banco, ponte, cliente, _canais = await montar(tmp_path)
        wh = WebhookFalso()
        com_webhook(ponte, wh)
        try:
            await cliente.post("/mc/eventos", json=msg("Lobo", "oi @everyone e <@123456789012345678>"), headers=AUTH)
            return wh.enviadas[0]["content"]
        finally:
            await cliente.close()
            await banco.fechar()

    texto = rodar(cenario)
    assert "@everyone" not in texto and "<@123456789012345678>" not in texto


def test_sem_webhook_ou_se_o_discord_recusar_a_kiza_posta_a_linha_normal(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais = await montar(tmp_path)
        try:
            com_webhook(ponte, None)  # sem permissão para criar o webhook
            await cliente.post("/mc/eventos", json=msg("Lobo", "primeira"), headers=AUTH)
            recusa = discord.HTTPException(type("R", (), {"status": 400, "reason": "Bad Request"})(), "nome inválido")
            com_webhook(ponte, WebhookFalso(falha=recusa))
            r = await cliente.post("/mc/eventos", json=msg("Lobo", "segunda"), headers=AUTH)
            return canais["mc_chat"].textos, (await r.json())["enviados"]
        finally:
            await cliente.close()
            await banco.fechar()

    textos_enviados, enviados = rodar(cenario)
    assert textos_enviados == ["**Lobo** » primeira", "**Lobo** » segunda"] and enviados == 1


def test_webhook_apagado_e_criado_de_novo_na_proxima_mensagem(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais = await montar(tmp_path)
        try:
            ponte._webhooks[G] = WebhookFalso(falha=discord.NotFound(type("R", (), {"status": 404, "reason": "Not Found"})(), "sumiu"))  # type: ignore[assignment]
            await cliente.post("/mc/eventos", json=msg("Lobo", "x"), headers=AUTH)
            return G in ponte._webhooks, canais["mc_chat"].textos
        finally:
            await cliente.close()
            await banco.fechar()

    ainda_guardado, textos_enviados = rodar(cenario)
    assert ainda_guardado is False  # esqueceu o webhook apagado (a próxima mensagem cria outro)
    assert textos_enviados == ["**Lobo** » x"]  # e a mensagem não se perdeu


def test_nome_de_exibicao_respeita_as_regras_do_discord():
    f = Ponte.nome_de_exibicao
    assert f("Lobo") == "Lobo"
    assert "discord" not in f("MeuDiscordBot").lower().replace("​", "") or "​" in f("MeuDiscordBot")
    for nome in ("discord", "Clyde", "xDISCORDx", "everyone", "here"):
        quebrado = f(nome)
        assert "​" in quebrado and quebrado.replace("​", "") == nome  # só ganha um espaço invisível, nada some
        assert nome.lower() not in quebrado.lower()
    assert len(f("a" * 200)) <= 81
    assert len(f("x")) >= 2 and len(f("")) >= 2
