"""Testes da ponte com o Minecraft: vínculo, sincronização idempotente, chat, eventos em embeds, painéis e segurança das rotas.

Rode com:  pytest -q tests/test_ponte_minecraft.py
"""
import asyncio
import os
from types import SimpleNamespace
from typing import Optional

import discord
from aiohttp.test_utils import TestClient, TestServer

from database import Banco, agora

G, USER_A, USER_B = 1, 111, 222
TOKEN = "segredo-de-teste"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


class CanalFalso:
    def __init__(self) -> None:
        self.enviadas: list[tuple[Optional[str], Optional[discord.Embed], object]] = []

    async def send(self, content=None, embed=None, **kwargs):
        self.enviadas.append((content, embed, kwargs.get("allowed_mentions")))

    @property
    def textos(self) -> list[str]:
        return [c for c, _e, _m in self.enviadas if c is not None]

    @property
    def embeds(self) -> list[discord.Embed]:
        return [e for _c, e, _m in self.enviadas if e is not None]


class MembroFalso:
    def __init__(self, user_id: int, nome: str) -> None:
        self.id = user_id
        self.display_name = nome
        self.name = nome.lower()
        self.mention = f"<@{user_id}>"
        self.display_avatar = SimpleNamespace(url=f"https://cdn.exemplo/{user_id}.png")


def rodar(cenario_fn):
    return asyncio.run(cenario_fn())


async def montar(tmp_path, membros=()):
    os.environ["MC_BRIDGE_TOKEN"] = TOKEN
    os.environ.pop("MC_GUILD_ID", None)
    from cogs_minecraft.ponte import Ponte

    banco = Banco(str(tmp_path / "t.db"))
    await banco.conectar()
    por_id = {m.id: m for m in membros}
    guild = SimpleNamespace(id=G, get_member=lambda uid: por_id.get(uid))
    bot = SimpleNamespace(
        banco=banco,
        guilds=[guild],
        get_guild=lambda _gid: guild,
        get_cog=lambda _nome: None,
    )
    ponte = Ponte(bot)  # type: ignore[arg-type]
    canais = {chave: CanalFalso() for chave in ("mc_chat", "mc_ip", "mc_historico", "mc_login", "mc_log")}

    async def canal_mc(_gid, chave):
        return canais[chave]

    ponte.canal_mc = canal_mc  # type: ignore[method-assign]
    cliente = TestClient(TestServer(ponte.criar_app()))
    await cliente.start_server()
    return banco, ponte, cliente, canais


async def vincular(banco, cliente, user_id, mc_id="mc-1", nome="Raposa"):
    r = await cliente.post("/mc/vinculo", json={"id": mc_id, "nome": nome}, headers=AUTH)
    dados = await r.json()
    assert dados["vinculado"] is False
    resultado, _ = await banco.mc_vincular(G, user_id, dados["codigo"])
    assert resultado == "ok"


# ------------------------------------------------------------------ segurança
def test_rotas_exigem_o_token(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            sem = await cliente.get("/mc/saude")
            errado = await cliente.get("/mc/saude", headers={"Authorization": "Bearer outro"})
            sem_bearer = await cliente.get("/mc/saude", headers={"Authorization": TOKEN})
            certo = await cliente.get("/mc/saude", headers=AUTH)
            return sem.status, errado.status, sem_bearer.status, certo.status
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == (401, 401, 401, 200)


def test_json_e_jogador_invalidos(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            ruim = await cliente.post("/mc/vinculo", data="não é json", headers=AUTH)
            sem_nome = await cliente.post("/mc/vinculo", json={"id": "1", "nome": ""}, headers=AUTH)
            lista = await cliente.post("/mc/vinculo", json=[1, 2], headers=AUTH)
            return ruim.status, sem_nome.status, lista.status
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) == (400, 400, 400)


# ------------------------------------------------------------------ vínculo
def test_vinculo_codigo_estavel_e_consumido_uma_vez(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            r1 = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            r2 = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            errado = await banco.mc_vincular(G, USER_A, "ZZZZZZ")
            certo = await banco.mc_vincular(G, USER_A, r1["codigo"].lower())  # minúsculas valem
            de_novo = await banco.mc_vincular(G, USER_B, r1["codigo"])
            r3 = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            return r1, r2, errado, certo, de_novo, r3
        finally:
            await cliente.close()
            await banco.fechar()

    r1, r2, errado, certo, de_novo, r3 = rodar(cenario)
    assert r1["vinculado"] is False and len(r1["codigo"]) == 6 and r1["codigo"] == r2["codigo"]
    assert errado == ("codigo_invalido", None)
    assert certo == ("ok", "Raposa")
    assert de_novo == ("codigo_invalido", None)  # o código foi consumido
    assert r3["vinculado"] is True and r3["discord_id"] == str(USER_A)


def test_codigo_vencido_nao_vale_e_gera_outro(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            r1 = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            await banco._exec("UPDATE mc_codigos SET expira_em = ?", (agora() - 1,))
            vencido = await banco.mc_vincular(G, USER_A, r1["codigo"])
            r2 = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            return vencido, r2
        finally:
            await cliente.close()
            await banco.fechar()

    vencido, r2 = rodar(cenario)
    assert vencido == ("codigo_invalido", None)
    assert r2["vinculado"] is False and r2["codigo"] != "" and r2["expira_em"] > agora()


def test_uma_conta_por_pessoa_e_uma_pessoa_por_conta(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            # a mesma pessoa tenta ligar uma segunda conta
            r = await (await cliente.post("/mc/vinculo", json={"id": "mc-2", "nome": "Outra"}, headers=AUTH)).json()
            ja = await banco.mc_vincular(G, USER_A, r["codigo"])
            # a conta que já é da primeira pessoa é reconhecida pelo nome (sem caixa), mesmo com id diferente
            r2 = await (await cliente.post("/mc/vinculo", json={"id": "mc-9", "nome": "raposa"}, headers=AUTH)).json()
            return ja, r2
        finally:
            await cliente.close()
            await banco.fechar()

    ja, r2 = rodar(cenario)
    assert ja == ("ja_vinculado", "Raposa")
    assert r2["vinculado"] is True


def test_id_novo_com_o_mesmo_nome_mantem_o_vinculo(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A, "mc-velho", "Raposa")
            r = await (await cliente.post("/mc/vinculo", json={"id": "mc-novo", "nome": "Raposa"}, headers=AUTH)).json()
            linha = await banco.mc_vinculo_de_usuario(G, USER_A)
            perfil = await banco.obter_perfil(G, USER_A)
            historico = await banco._todos("SELECT evento FROM mc_historico ORDER BY id")
            # e mudar o nome da conta (renomear no Xbox) mantendo o id também funciona
            r2 = await (await cliente.post("/mc/vinculo", json={"id": "mc-novo", "nome": "Raposa Nova"}, headers=AUTH)).json()
            linha2 = await banco.mc_vinculo_de_usuario(G, USER_A)
            return r, linha["mc_id"], perfil["minecraft_uuid"], [h["evento"] for h in historico], r2, linha2["mc_nome"]
        finally:
            await cliente.close()
            await banco.fechar()

    r, mc_id, uuid, historico, r2, nome = rodar(cenario)
    assert r["vinculado"] is True and mc_id == "mc-novo" and uuid == "mc-novo"
    assert historico == ["vinculado", "atualizado"]
    assert r2["vinculado"] is True and nome == "Raposa Nova"


def test_desvincular_guarda_historico_e_o_saldo(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A)
            await banco.creditar(G, USER_A, 300, "teste")
            nome = await banco.mc_desvincular(G, USER_A)
            de_novo = await banco.mc_desvincular(G, USER_A)
            r = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            sync = await cliente.post("/mc/sync", json={"id": "mc-1", "nome": "Raposa", "chave": "a", "caudas": 1, "xp": 0}, headers=AUTH)
            historico = await banco._todos("SELECT evento FROM mc_historico ORDER BY id")
            return nome, de_novo, r["vinculado"], sync.status, await banco.saldo(G, USER_A), [h["evento"] for h in historico]
        finally:
            await cliente.close()
            await banco.fechar()

    nome, de_novo, vinculado, status, saldo, historico = rodar(cenario)
    assert nome == "Raposa" and de_novo is None and vinculado is False and status == 403
    assert saldo == 300
    assert historico == ["vinculado", "desvinculado"]


# ------------------------------------------------------------------ sincronização
async def sync(cliente, chave, caudas, xp, mc_id="mc-1", nome="Raposa"):
    r = await cliente.post("/mc/sync", json={"id": mc_id, "nome": nome, "chave": chave, "caudas": caudas, "xp": xp}, headers=AUTH)
    return r.status, await r.json()


def test_sync_funde_soma_uma_vez_e_devolve_o_total(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await banco.creditar(G, USER_A, 500, "teste")
            await banco.adicionar_xp(G, USER_A, 200)
            await vincular(banco, cliente, USER_A)
            # a primeira sincronização manda o total do jogo: é a fusão (a soma dos dois lados)
            fusao = await sync(cliente, "k1", 7028, 1000)
            repetida = await sync(cliente, "k1", 7028, 1000)  # resposta perdida: reenviar a mesma chave não soma de novo
            depois = await sync(cliente, "k2", 10, 5)
            # o Discord ganhou algo no meio: o jogo sabe na próxima conversa
            await banco.creditar(G, USER_A, 100, "daily")
            sem_mudanca = await sync(cliente, "k3", 0, 0)
            razao = await banco._todos("SELECT tipo, valor FROM transacoes WHERE user_id = ? ORDER BY id", (USER_A,))
            return fusao, repetida, depois, sem_mudanca, [(r["tipo"], r["valor"]) for r in razao]
        finally:
            await cliente.close()
            await banco.fechar()

    fusao, repetida, depois, sem_mudanca, razao = rodar(cenario)
    assert fusao == (200, {"ok": True, "saldo": 7528, "xp": 1200})
    assert repetida == (200, {"ok": True, "saldo": 7528, "xp": 1200})
    assert depois[1]["saldo"] == 7538 and depois[1]["xp"] == 1205
    assert sem_mudanca[1]["saldo"] == 7638  # os 100 do Discord chegam ao jogo
    assert razao == [("teste", 500), ("minecraft", 7028), ("minecraft", 10), ("daily", 100)]


def test_sync_debito_maior_que_o_saldo_zera_e_xp_nao_fica_negativo(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A)
            await sync(cliente, "k1", 50, 30)
            return await sync(cliente, "k2", -500, -999)
        finally:
            await cliente.close()
            await banco.fechar()

    status, corpo = rodar(cenario)
    assert status == 200 and corpo["saldo"] == 0 and corpo["xp"] == 0


def test_sync_valida_os_dados(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A)
            ruins = [
                await sync(cliente, "", 1, 1),
                await sync(cliente, "k", "muito", 1),
                await sync(cliente, "k", 10**12, 1),  # além do teto por envio
                await sync(cliente, "k", True, 1),
            ]
            nao_vinculado = await sync(cliente, "k", 1, 1, mc_id="mc-x", nome="Desconhecido")
            return [s for s, _ in ruins], nao_vinculado, await banco.saldo(G, USER_A)
        finally:
            await cliente.close()
            await banco.fechar()

    ruins, nao_vinculado, saldo = rodar(cenario)
    assert ruins == [400, 400, 400, 400]
    assert nao_vinculado[0] == 403 and nao_vinculado[1]["erro"] == "nao_vinculado"
    assert saldo == 0


def test_sync_pelo_nome_quando_o_id_mudou(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A, "mc-velho", "Raposa")
            await sync(cliente, "k1", 100, 0, mc_id="mc-velho")
            novo = await sync(cliente, "k2", 5, 0, mc_id="mc-novo")  # mundo copiado: id novo, mesmo nome
            return novo, await banco.saldo(G, USER_A)
        finally:
            await cliente.close()
            await banco.fechar()

    novo, saldo = rodar(cenario)
    assert novo[0] == 200 and saldo == 105


# ------------------------------------------------------------------ chat e eventos
def test_mensagens_do_jogo_sem_mencoes_nem_codigos_de_cor(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais = await montar(tmp_path)
        try:
            r = await cliente.post(
                "/mc/eventos",
                json={
                    "eventos": [
                        {"t": "msg", "nome": "Raposa", "texto": "§aoi @everyone <@123456789012345678> **negrito**\nlinha dois"},
                        {"t": "msg", "nome": "Raposa", "texto": "   "},
                        {"t": "msg", "nome": "a_b*c", "texto": "x" * 1000},
                        {"t": "outra", "nome": "Raposa"},
                        {"t": "msg", "texto": "sem nome"},
                        "lixo",
                    ]
                },
                headers=AUTH,
            )
            return r.status, await r.json(), canais["mc_chat"]
        finally:
            await cliente.close()
            await banco.fechar()

    status, corpo, chat = rodar(cenario)
    assert status == 200 and corpo["enviados"] == 2
    primeiro = chat.textos[0]
    assert primeiro.startswith("**Raposa** » oi ") and "**negrito** linha dois" in primeiro
    assert "@everyone" not in primeiro and "<@123456789012345678>" not in primeiro  # menções neutralizadas
    assert chat.textos[1].startswith("**a\\_b\\*c** » ") and len(chat.textos[1]) < 300
    assert all(m is not None and not m.everyone and not m.users and not m.roles for _c, _e, m in chat.enviadas)


def test_eventos_vao_para_os_canais_certos_com_embeds(tmp_path):
    async def cenario():
        banco, ponte, cliente, canais = await montar(tmp_path)
        try:
            eventos = [
                {"t": "entrada", "nome": "Raposa"},
                {"t": "saida", "nome": "Raposa", "sessao": 3725},
                {"t": "morte", "nome": "Raposa", "causa": "queda"},
                {"t": "morte", "nome": "Raposa", "causa": "entityAttack", "matador_tipo": "jogador", "matador": "Lobo", "local": "Overworld"},
                {"t": "morte", "nome": "Raposa", "causa": "x", "matador_tipo": "mob", "matador": "um Zumbi"},
                {"t": "streak", "nome": "Lobo", "n": 5},
                {"t": "streak_fim", "nome": "Lobo", "vitima": "Raposa", "n": 7},
                {"t": "nivel", "nome": "Lobo", "nivel": 15, "rank": "Raposa Lunar"},
                {"t": "conquista", "nome": "Lobo", "conquista": "Chegou cedo hein!"},
                {"t": "cla_criado", "cla_tag": "VUL", "cla_nome": "Vulpus", "fundador": "Lobo"},
                {"t": "cla_extinto", "cla_tag": "VUL", "cla_nome": "Vulpus", "dias": 12, "membros": 3},
                {"t": "guerra_inicio", "a": "VUL", "b": "RAP", "aposta": 500, "ctf": True},
                {"t": "guerra_fim", "a": "VUL", "b": "RAP", "pa": 12, "pb": 9, "vencedor": "VUL", "motivo": "tempo", "premio": 1000, "cacador": "Lobo", "cacador_n": 8, "capturas_a": 2, "capturas_b": 1},
                {"t": "guerra_fim", "a": "VUL", "b": "RAP", "pa": 3, "pb": 3, "vencedor": "", "motivo": "staff"},
            ]
            r = await cliente.post("/mc/eventos", json={"eventos": eventos}, headers=AUTH)
            return r.status, canais
        finally:
            await cliente.close()
            await banco.fechar()

    status, canais = rodar(cenario)
    assert status == 200
    chat, hist, login = canais["mc_chat"].embeds, canais["mc_historico"].embeds, canais["mc_log"].embeds
    # chat: entrada, saída, 3 mortes, streak, fim da sequência, nível, conquista
    assert len(chat) == 9 and len(hist) == 5 and len(login) == 2
    assert "entrou" in chat[0].title and "saiu" in chat[1].title and "1h 02min" in chat[1].description
    assert "**Lobo**" in chat[3].description and "Overworld" in chat[3].description
    assert "Zumbi" in chat[4].description
    assert "**5**" in chat[5].description and "**7**" in chat[6].description and "Raposa" in chat[6].description
    assert "15" in chat[7].description and "Raposa Lunar" in chat[7].description
    assert "Chegou cedo hein!" in chat[8].description
    assert "[VUL]" in hist[0].description and "Lobo" in hist[0].description
    assert "12" in hist[1].description and "3" in hist[1].description
    assert "500" in hist[2].description and "Capture a bandeira" in hist[2].description
    assert "**12 × 9**" in hist[3].description and "Lobo" in hist[3].description and "tempo" in hist[3].description
    assert "empataram" in hist[4].description
    assert "Login" in login[0].title and "Logout" in login[1].title
    for e in chat + hist + login:
        assert len(e) <= 6000 and e.footer.text


def test_guerra_fim_placar_na_ordem_do_vencedor():
    from cogs_minecraft import embeds

    ev = {"t": "guerra_fim", "a": "VUL", "b": "RAP", "pa": 5, "pb": 11, "vencedor": "RAP", "motivo": "tempo", "premio": 0, "cacador": "", "cacador_n": 0, "capturas_a": 0, "capturas_b": 0}
    venceu = embeds.montar_guerra_fim(ev, embeds.Contexto())
    assert "**[RAP]** venceu **[VUL]** por **11 × 5**" in venceu.description


def test_eventos_com_conta_ligada_usam_o_discord_da_pessoa(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana Luz")
        banco, ponte, cliente, canais = await montar(tmp_path, [ana])
        try:
            await vincular(banco, cliente, USER_A, "mc-1", "Raposa")
            await banco.creditar(G, USER_A, 321, "teste")
            await banco.adicionar_xp(G, USER_A, 1500)
            await cliente.post("/mc/eventos", json={"eventos": [{"t": "entrada", "nome": "raposa"}, {"t": "morte", "nome": "Raposa", "causa": "lava"}]}, headers=AUTH)
            return canais
        finally:
            await cliente.close()
            await banco.fechar()

    canais = rodar(cenario)
    login = canais["mc_log"].embeds
    assert "<@111>" in login[-1].description and login[-1].author.icon_url == "https://cdn.exemplo/111.png"
    campos = {c.name: c.value for c in login[-1].fields}
    assert campos["Nível"] != "" and "321" in campos["Caudas"]
    morte = canais["mc_chat"].embeds[-1]
    assert morte.author.name == "Raposa" and morte.author.icon_url == "https://cdn.exemplo/111.png"


def test_validar_evento_limpa_e_recusa():
    from cogs_minecraft.ponte import validar_evento

    assert validar_evento({"t": "inexistente", "nome": "x"}) is None
    assert validar_evento({"t": "morte"}) is None  # sem nome
    assert validar_evento({"t": "streak", "nome": "x", "n": 1}) is None  # sequência de 1 não é sequência
    assert validar_evento({"t": "cla_criado", "cla_tag": "", "cla_nome": "x"}) is None
    ev = validar_evento({"t": "morte", "nome": "§cRaposa\n", "causa": "Cai Do Alto!", "matador_tipo": "?", "matador": "§4Zumbi", "local": "A" * 100})
    assert ev == {"t": "morte", "nome": "Raposa", "causa": "outro", "matador_tipo": "", "matador": "Zumbi", "local": "A" * 40}
    ev = validar_evento({"t": "saida", "nome": "Ana", "sessao": 10**12})
    assert ev["sessao"] == 0  # além do teto vira 0, nunca estoura
    ev = validar_evento({"t": "guerra_fim", "a": "VUL", "b": "RAP", "pa": -5, "pb": "x", "premio": True})
    assert ev["pa"] == 0 and ev["pb"] == 0 and ev["premio"] == 0


def test_status_alimenta_o_painel_do_ip(tmp_path):
    from cogs_minecraft import embeds

    async def cenario():
        banco, ponte, cliente, canais = await montar(tmp_path)
        try:
            ruim = await cliente.post("/mc/status", json={"online": "x"}, headers=AUTH)
            ok = await cliente.post("/mc/status", json={"online": ["Ana", "§cLobo", ""], "max": 8}, headers=AUTH)
            salvo = await banco.get_config(G, "mc_status")
            return ruim.status, ok.status, ponte.status, salvo
        finally:
            await cliente.close()
            await banco.fechar()

    ruim, ok, status, salvo = rodar(cenario)
    assert ruim == 400 and ok == 200
    assert status["online"] == ["Ana", "Lobo"] and status["max"] == 8
    assert "Lobo" in salvo
    agora_ = status["ts"]
    on = embeds.montar_painel_ip(status, agora_ + 10)
    texto = " ".join([on.description or ""] + [f"{c.name} {c.value}" for c in on.fields])
    assert "plus-01.bedhosting.com.br" in texto and "vulpus.bedrock.net.br" in texto and texto.count("27151") >= 2
    assert "Online" in texto and "2/8" in texto and "Ana" in texto and "/minecraft vincular" in texto
    off = embeds.montar_painel_ip(status, agora_ + 100000)
    assert "Fora do ar" in " ".join(c.value for c in off.fields) and off.color != on.color
    vazio = embeds.montar_painel_ip({"online": [], "max": 8, "ts": agora_}, agora_)
    assert "Ninguém" in " ".join(c.value for c in vazio.fields)
    assert embeds.montar_painel_ip(None, agora_).fields  # sem status nenhum, mostra fora do ar sem erro
    for e in (on, off, vazio):
        assert len(e) < 6000 and all(len(c.value) <= 1024 for c in e.fields)


def test_painel_de_login_e_ajuda():
    from cogs_minecraft import embeds

    e = embeds.montar_painel_login("<#1>")
    texto = " ".join([e.title or "", e.description or ""] + [c.value for c in e.fields])
    assert "Vincular conta" in texto and "<#1>" in texto and "plus-01.bedhosting.com.br" in texto
    assert len(e) < 6000 and all(len(c.value) <= 1024 for c in e.fields)
    assert "código" in (embeds.montar_ajuda_login().description or "")


def test_vincular_pelo_botao_ou_comando_avisa_o_canal_de_login(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana Luz")
        banco, ponte, cliente, canais = await montar(tmp_path, [ana])
        respostas: list[dict] = []

        class Resposta:
            def is_done(self):
                return False

            async def send_message(self, **kw):
                respostas.append(kw)

        interacao = SimpleNamespace(guild=ponte.bot.guilds[0], user=ana, response=Resposta(), followup=None)
        try:
            r = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            await ponte.responder_vinculo(interacao, "ZZZZZZ")  # errado
            await ponte.responder_vinculo(interacao, r["codigo"])  # certo (como no modal)
            await ponte.responder_vinculo(interacao, "ABCDEF")  # já ligada: o código nem é consumido
            return respostas, canais["mc_log"].embeds
        finally:
            await cliente.close()
            await banco.fechar()

    respostas, login = rodar(cenario)
    assert [r["embed"].title for r in respostas] == ["⚠️ Não deu", "🦊 Conta ligada!", "⚠️ Não deu"]
    assert all(r["ephemeral"] is True for r in respostas)
    assert "Raposa" in respostas[1]["embed"].description
    titulos = [e.title for e in login]
    assert "⚠️ Código recusado" in titulos and "🔗 Conta ligada" in titulos
    vinc = [e for e in login if e.title == "🔗 Conta ligada"][0]
    assert vinc.author.icon_url == "https://cdn.exemplo/111.png" and "Raposa" in vinc.description


def test_codigos_recusados_em_sequencia_bloqueiam_e_o_canal_nao_enche(tmp_path):
    async def cenario():
        ana = MembroFalso(USER_A, "Ana Luz")
        banco, ponte, cliente, canais = await montar(tmp_path, [ana])
        try:
            resultados = [(await ponte.vincular_conta(ponte.bot.guilds[0], ana, f"ERRADO{i}"))[0] for i in range(7)]  # type: ignore[arg-type]
            return resultados, canais["mc_log"].embeds
        finally:
            await cliente.close()
            await banco.fechar()

    resultados, login = rodar(cenario)
    assert resultados == ["codigo_invalido"] * 5 + ["muitas"] * 2
    assert len(login) == 1  # um aviso por minuto, não um por tentativa


def test_chat_do_discord_para_o_jogo(tmp_path):
    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            marcador = await (await cliente.get("/mc/chat?desde=-1", headers=AUTH)).json()
            canal = SimpleNamespace(id=1549284652483616850)
            guild = SimpleNamespace(id=G)
            autor = SimpleNamespace(bot=False, display_name="Ana §cVermelha", name="ana")
            msg = SimpleNamespace(author=autor, guild=guild, channel=canal, clean_content="oi\npessoal", attachments=[])
            await ponte.on_message(msg)  # type: ignore[arg-type]
            msg_anexo = SimpleNamespace(author=autor, guild=guild, channel=canal, clean_content="", attachments=[1])
            await ponte.on_message(msg_anexo)  # type: ignore[arg-type]
            # bot, outro canal e mensagem vazia são ignorados
            await ponte.on_message(SimpleNamespace(author=SimpleNamespace(bot=True), guild=guild, channel=canal, clean_content="x", attachments=[]))  # type: ignore[arg-type]
            await ponte.on_message(SimpleNamespace(author=autor, guild=guild, channel=SimpleNamespace(id=5), clean_content="x", attachments=[]))  # type: ignore[arg-type]
            await ponte.on_message(SimpleNamespace(author=autor, guild=guild, channel=canal, clean_content="  ", attachments=[]))  # type: ignore[arg-type]
            primeiro = await (await cliente.get(f"/mc/chat?desde={marcador['ultimo']}", headers=AUTH)).json()
            de_novo = await (await cliente.get(f"/mc/chat?desde={primeiro['ultimo']}", headers=AUTH)).json()
            ruim = await cliente.get("/mc/chat?desde=abc", headers=AUTH)
            return marcador, primeiro, de_novo, ruim.status
        finally:
            await cliente.close()
            await banco.fechar()

    marcador, primeiro, de_novo, ruim = rodar(cenario)
    assert marcador == {"ok": True, "ultimo": 0, "mensagens": []}
    assert [m["texto"] for m in primeiro["mensagens"]] == ["oi pessoal", "[anexo]"]
    assert primeiro["mensagens"][0]["nome"] == "Ana Vermelha"
    assert de_novo["mensagens"] == [] and de_novo["ultimo"] == primeiro["ultimo"]
    assert ruim == 400


def test_fila_do_chat_tem_teto(tmp_path):
    async def cenario():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            for i in range(30):
                await banco.mc_chat_enfileirar(G, "x", f"m{i}", limite=10)
            todas = await banco.mc_chat_desde(G, 0, limite=100)
            return [m["texto"] for m in todas]
        finally:
            await banco.fechar()

    textos_fila = rodar(cenario)
    assert textos_fila == [f"m{i}" for i in range(20, 30)]


def test_canais_da_ponte_no_setup_e_padroes():
    import config

    assert len(config.CANAIS_CONFIG) <= 25  # o menu de seleção do Discord aceita no máximo 25 opções
    for chave in ("mc_chat", "mc_ip", "mc_historico", "mc_login"):
        assert chave in config.CANAIS_CONFIG and isinstance(config.MC_CANAIS_PADRAO[chave], int)
    assert [s[1] for s in config.MC_SERVIDORES] == ["plus-01.bedhosting.com.br", "vulpus.bedrock.net.br"]
    assert all(s[2] == 27151 for s in config.MC_SERVIDORES)


def test_painel_do_ip_tem_o_link_de_entrada_rapida_e_a_imagem():
    from cogs_minecraft import embeds

    assert embeds.link_servidor("principal") == "minecraft://?addExternalServer=VULPUS|plus-01.bedhosting.com.br:27151"
    assert embeds.link_servidor("alternativo") == "minecraft://?addExternalServer=VULPUS-ALT|vulpus.bedrock.net.br:27151"
    e = embeds.montar_painel_ip({"online": ["Ana"], "max": 8, "ts": 1000.0}, 1000.0, "<#1>", "ip.webp")
    rapido = [c for c in e.fields if c.name == "⚡ Entrada rápida"][0].value
    assert "](minecraft://" not in rapido  # o Discord não deixa clicar em minecraft://: nada de link em markdown quebrado
    assert "```\nminecraft://?addExternalServer=VULPUS|plus-01.bedhosting.com.br:27151\n```" in rapido  # só para copiar
    # o que se clica são botões https que levam à página /entrar do site, que abre o Minecraft
    botoes = embeds.botoes_ip()
    assert botoes[0] == ("Abrir no Minecraft", "https://site-production-f47b.up.railway.app/entrar/")
    assert botoes[1] == ("Servidor alternativo", "https://site-production-f47b.up.railway.app/entrar/?s=alt")
    from cogs_minecraft.ponte import PainelIpView

    async def montar_view():
        return PainelIpView()

    view = rodar(montar_view)
    assert [(b.label, b.url) for b in view.children] == botoes and all(b.style == discord.ButtonStyle.link for b in view.children)
    assert e.image.url == "attachment://ip.webp"
    sem = embeds.montar_painel_ip(None, 0.0)
    assert sem.image.url is None  # sem arquivo de banner o painel sai sem imagem, sem erro
    assert all(len(c.value) <= 1024 for c in e.fields) and len(e) < 6000


def test_a_arte_do_painel_do_ip_existe_nos_banners():
    from utils.helpers import arquivo_banner

    arquivo = arquivo_banner("ip")
    assert arquivo is not None and arquivo.filename == "ip.webp"


def test_contador_de_jogadores_no_nome_do_canal(tmp_path):
    from cogs_minecraft import embeds

    assert embeds.nome_canal_online({"online": ["A", "B"], "max": 8, "ts": 100.0}, 110.0) == "🟢 Online | (2) 🦊"
    assert embeds.nome_canal_online({"online": [], "max": 8, "ts": 100.0}, 110.0) == "🟢 Online | (0) 🦊"
    assert embeds.nome_canal_online({"online": ["A"], "max": 8, "ts": 100.0}, 100000.0) == "🔴 Offline | (0) 🦊"
    assert embeds.nome_canal_online(None, 5.0) == "🔴 Offline | (0) 🦊"

    class CanalNome:
        def __init__(self) -> None:
            self.name = "🔴 Offline | (0) 🦊"
            self.trocas: list[str] = []

        async def edit(self, name, reason=None):
            self.name = name
            self.trocas.append(name)

    async def cenario():
        banco, ponte, cliente, canais = await montar(tmp_path)
        canal = CanalNome()

        async def canal_mc(_gid, chave):
            return canal

        ponte.canal_mc = canal_mc  # type: ignore[method-assign]
        try:
            ponte.status = {"online": ["Ana", "Lobo"], "max": 8, "ts": 1000.0}
            a = await ponte.atualizar_contador(agora=1010.0, relogio=10_000.0)  # primeira troca: na hora
            b = await ponte.atualizar_contador(agora=1010.0, relogio=10_001.0)  # nada mudou: não mexe
            ponte.status = {"online": ["Ana", "Lobo", "Bia"], "max": 8, "ts": 1060.0}
            c = await ponte.atualizar_contador(agora=1070.0, relogio=10_020.0)  # mudou: a segunda troca da janela também é na hora
            ponte.status = {"online": ["Ana"], "max": 8, "ts": 1100.0}
            d = await ponte.atualizar_contador(agora=1110.0, relogio=10_100.0)  # a janela (2 em 10 min) encheu: espera
            e = await ponte.atualizar_contador(agora=1110.0, relogio=10_000.0 + 601.0)  # a primeira saiu da janela: troca
            return (a, b, c, d, e), canal.trocas
        finally:
            await cliente.close()
            await banco.fechar()

    (a, b, c, d, e), trocas = rodar(cenario)
    assert (a, b, c, d, e) == (True, False, True, False, True)
    assert trocas == ["🟢 Online | (2) 🦊", "🟢 Online | (3) 🦊", "🟢 Online | (1) 🦊"]


def test_changelog_fala_do_cargo_sugestor_e_o_faq_tambem():
    import config
    import textos

    assert config.CARGO_SUGESTOR_ID == 1561367707914604594 and "mc_online" in config.CANAIS_CONFIG
    assert config.MC_CANAIS_PADRAO["mc_online"] == 1561364244505829396
    valores = {"moeda": config.MOEDA_NOME, "sugestor": "<@&1561367707914604594>"}
    versao, _titulo, itens = textos.CHANGELOG[0]
    assert versao == "1.10.0"
    texto = "\n".join(i.format(**valores) for i in itens)
    assert "<@&1561367707914604594>" in texto and "sugeriu algo útil" in texto and "quantas pessoas estão jogando" in texto
    faq = [v for p, v in textos.DUVIDAS_CAMPOS if "Sugestor" in p]
    assert faq and "<@&1561367707914604594>" in faq[0].format(**valores, ip="#ip", login="#login", tickets="#t", chat="#c", regras="#r", cargos="#cg", duvidas="#d")


def test_vinculo_avisa_se_a_fusao_ja_aconteceu(tmp_path):
    """Se o jogo perder a anotação do vínculo (reinício, dados novos), o bot avisa `ja_somou` e o jogo não funde de novo."""

    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await vincular(banco, cliente, USER_A)
            antes = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            await sync(cliente, "k1", 30, 0)
            depois = await (await cliente.post("/mc/vinculo", json={"id": "mc-1", "nome": "Raposa"}, headers=AUTH)).json()
            return antes, depois
        finally:
            await cliente.close()
            await banco.fechar()

    antes, depois = rodar(cenario)
    assert antes["ja_somou"] is False and depois["ja_somou"] is True
