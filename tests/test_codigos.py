"""Feedback e códigos de resgate: geração, regras do resgate, anti-brute-force, formulário e rota do jogo."""
import asyncio
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from cogs.feedback import (  # noqa: E402
    Feedback,
    codigo_valido,
    estado_do_codigo,
    ler_nota,
    mensagem_do_resultado,
    texto_longo_o_bastante,
)
from database import Banco  # noqa: E402
from database.codigos import ALFABETO, ResultadoCodigo, gerar_codigo, normalizar_codigo  # noqa: E402

G, A, B, STAFF = 1, 111, 222, 999


def rodar(c):
    return asyncio.run(c())


async def novo(tmp_path):
    b = Banco(str(tmp_path / "c.db"))
    await b.conectar()
    return b


# ------------------------------------------------------------------ funções puras
def test_gerar_codigo_legivel_e_unico():
    codigos = {gerar_codigo() for _ in range(200)}
    assert len(codigos) == 200
    for c in codigos:
        prefixo, x, y = c.split("-")
        assert prefixo == "VULPUS" and len(x) == len(y) == 4
        assert all(ch in ALFABETO for ch in x + y)
        assert not set("01OI") & set(x + y)


def test_normalizar_e_validar():
    assert normalizar_codigo("  vulpus abcd_efgh ") == "VULPUS-ABCD-EFGH"
    assert codigo_valido("VULPUS-ABCD-EFGH") and codigo_valido("NATAL")
    assert not codigo_valido("a b") and not codigo_valido("ab") and not codigo_valido("x" * 41) and not codigo_valido("A@B#C")


def test_nota_e_tamanho_do_feedback():
    assert [ler_nota(x) for x in ("1", " 5 ", "0", "6", "a", "", "10")] == [1, 5, None, None, None, None, None]
    assert not texto_longo_o_bastante("muito curto")
    assert not texto_longo_o_bastante("a  " * 5)  # espaços não contam
    assert texto_longo_o_bastante("gostei muito do servidor, parabéns")


def test_mensagens_do_resultado():
    assert mensagem_do_resultado(ResultadoCodigo("ok", 1000, 5000)) == "+1.000 Caudas! Resgate feito."
    for status in ("nao_existe", "inativo", "expirou", "esgotado", "ja_usou", "muitas", "sem_vinculo"):
        assert mensagem_do_resultado(ResultadoCodigo(status))


# ------------------------------------------------------------------ banco
def test_resgate_credita_na_economia_e_so_uma_vez(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        cod = await b.codigo_criar(G, 300, codigo="natal", usos_max=0, criado_por=STAFF, motivo="teste")
        r1 = await b.resgatar_codigo(G, A, "Raposa", "natal")
        r2 = await b.resgatar_codigo(G, A, "Raposa", "NATAL")
        r3 = await b.resgatar_codigo(G, B, "Lobo", " natal ")  # ilimitado: outra pessoa pode
        razao = await b._todos("SELECT tipo, valor, ref FROM transacoes WHERE user_id = ?", (A,))
        usos = await b.codigo_usos("natal")
        saldo = await b.saldo(G, A)
        linha = await b.codigo_obter("NATAL")
        await b.fechar()
        return cod, r1, r2, r3, [(x["tipo"], x["valor"], x["ref"]) for x in razao], len(usos), saldo, linha["usos"]

    cod, r1, r2, r3, razao, n_usos, saldo, usos = rodar(cenario)
    assert cod == "NATAL"
    assert r1 == ResultadoCodigo("ok", 300, 300) and r2.status == "ja_usou" and r3.ok
    assert razao == [("codigo", 300, "NATAL")] and n_usos == 2 and saldo == 300 and usos == 2


def test_validacoes_do_resgate(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.codigo_criar(G, 10, codigo="UM", usos_max=1)
        await b.codigo_criar(G, 10, codigo="OFF")
        await b.codigo_desativar(G, "off")
        await b.codigo_criar(G, 10, codigo="VELHO", dias_validade=1)
        await b._exec("UPDATE codigos SET expira_em = ? WHERE codigo = 'VELHO'", (int(time.time()) - 5,))
        await b.codigo_criar(G, 10, codigo="PESSOAL", dono_id=A)
        sem_mc = await b.resgatar_codigo(G, A, "", "UM")
        primeiro = await b.resgatar_codigo(G, A, "Raposa", "UM")
        esgotado = await b.resgatar_codigo(G, B, "Lobo", "um")
        off = await b.resgatar_codigo(G, B, "Lobo", "OFF")
        velho = await b.resgatar_codigo(G, B, "Lobo", "VELHO")
        alheio = await b.resgatar_codigo(G, B, "Lobo", "PESSOAL")
        dono = await b.resgatar_codigo(G, A, "Raposa", "PESSOAL")
        outra_guild = await b.resgatar_codigo(2, B, "Lobo", "UM")
        duplicado = await b.codigo_criar(G, 5, codigo="um")
        await b.fechar()
        return [x.status for x in (sem_mc, primeiro, esgotado, off, velho, alheio, dono, outra_guild)], duplicado

    status, duplicado = rodar(cenario)
    assert status == ["sem_vinculo", "ok", "esgotado", "inativo", "expirou", "nao_existe", "ok", "nao_existe"]
    assert duplicado is None


def test_limite_de_usos_nao_estoura(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.codigo_criar(G, 10, codigo="DOIS", usos_max=2)
        rs = await asyncio.gather(*(b.resgatar_codigo(G, 100 + i, f"J{i}", "DOIS") for i in range(5)))
        usos = (await b.codigo_obter("DOIS"))["usos"]
        await b.fechar()
        return [r.status for r in rs], usos

    status, usos = rodar(cenario)
    assert status.count("ok") == 2 and status.count("esgotado") == 3 and usos == 2


def test_cinco_erros_bloqueiam_ate_o_certo(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.codigo_criar(G, 10, codigo="CERTO", usos_max=0)
        erros = [(await b.resgatar_codigo(G, A, "R", f"ERRADO{i}")).status for i in range(5)]
        bloqueado = await b.resgatar_codigo(G, A, "R", "CERTO")
        outro = await b.resgatar_codigo(G, B, "L", "CERTO")  # o limite é por pessoa
        await b._exec("UPDATE codigos_tentativas SET quando = quando - 700")  # passaram 10 min
        liberado = await b.resgatar_codigo(G, A, "R", "CERTO")
        await b.fechar()
        return erros, bloqueado.status, outro.status, liberado.status

    erros, bloqueado, outro, liberado = rodar(cenario)
    assert erros == ["nao_existe"] * 5 and bloqueado == "muitas" and outro == "ok" and liberado == "ok"


def test_listagem_ativos_primeiro(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.codigo_criar(G, 1, codigo="VELHO-OFF")
        await b.codigo_desativar(G, "VELHO-OFF")
        await b.codigo_criar(G, 2, codigo="ATIVO")
        linhas = await b.codigo_listar(G, 10)
        total = await b.codigo_contar(G)
        pag2 = await b.codigo_listar(G, 1, 1)
        await b.fechar()
        return [x["codigo"] for x in linhas], total, [x["codigo"] for x in pag2], [estado_do_codigo(x, int(time.time())) for x in linhas]

    ordem, total, pag2, estados = rodar(cenario)
    assert ordem == ["ATIVO", "VELHO-OFF"] and total == 2 and pag2 == ["VELHO-OFF"] and estados == ["🟢", "⛔"]


def test_feedback_so_gera_codigo_quando_a_staff_entrega(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        sem_feedback = await b.feedback_entregar(G, A, STAFF)
        fid = await b.feedback_registrar(G, A, 5, "gostei muito de tudo aqui", "")
        ja_antes = await b.feedback_ja_ganhou_codigo(G, A)
        pendente = await b.feedback_pendente(G, A)
        sem_codigo_ainda = (await b.codigo_contar(G))
        cod, novo_ = await b.feedback_entregar(G, A, STAFF)
        cod2, novo2 = await b.feedback_entregar(G, A, STAFF)  # segunda tentativa: o mesmo código
        total_codigos = await b.codigo_contar(G)
        linha = await b.codigo_obter(cod)
        fb = await b.feedback_ultimo(G, A)
        ja = await b.feedback_ja_ganhou_codigo(G, A)
        pendente_depois = await b.feedback_pendente(G, A)
        alheio = await b.resgatar_codigo(G, B, "Lobo", cod)
        meu = await b.resgatar_codigo(G, A, "Raposa", cod)
        await b.fechar()
        return (sem_feedback, fid, ja_antes, pendente is not None, sem_codigo_ainda, cod, novo_, cod2, novo2, total_codigos,
                dict(linha), dict(fb), ja, pendente_depois, alheio.status, meu)

    (sem_feedback, fid, ja_antes, tem_pendente, sem_codigo_ainda, cod, novo_, cod2, novo2, total, linha, fb, ja, pendente_depois, alheio, meu) = rodar(cenario)
    assert sem_feedback is None and fid == 1 and not ja_antes and tem_pendente and sem_codigo_ainda == 0
    assert cod.startswith("VULPUS-") and novo_ is True and cod2 == cod and novo2 is False and total == 1
    assert linha["caudas"] == 1000 and linha["usos_max"] == 1 and linha["dono_id"] == A
    assert 89 * 86400 < linha["expira_em"] - int(time.time()) <= 90 * 86400
    assert fb["codigo"] == cod and fb["entregue_por"] == STAFF and fb["codigo_entregue_em"] > 0
    assert ja and pendente_depois is None
    assert alheio == "nao_existe" and meu == ResultadoCodigo("ok", 1000, 1000)


def test_recusar_tira_o_pedido_e_novo_feedback_volta_a_ser_pendente(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.feedback_registrar(G, A, 3, "feedback bem longo para passar", "")
        n = await b.feedback_recusar(G, A)
        pendente = await b.feedback_pendente(G, A)
        await b.feedback_registrar(G, A, 4, "outro feedback bem longo depois", "")
        de_novo = await b.feedback_pendente(G, A)
        await b.fechar()
        return n, pendente, de_novo is not None

    assert rodar(cenario) == (1, None, True)


# ------------------------------------------------------------------ formulário (cog)
class Resposta:
    def __init__(self):
        self.mensagens = []
        self.adiada = False

    async def send_message(self, conteudo=None, **kw):
        self.mensagens.append(conteudo)

    async def defer(self, **kw):
        self.adiada = True


def interacao(uid, nome="Ana"):
    usuario = SimpleNamespace(
        id=uid, display_name=nome, name=nome.lower(), mention=f"<@{uid}>", display_avatar=SimpleNamespace(url="https://x/a.png")
    )
    resposta = Resposta()
    seguintes = []

    async def enviar(conteudo=None, **kw):
        seguintes.append((conteudo, kw))

    return SimpleNamespace(guild=SimpleNamespace(id=G), user=usuario, response=resposta, followup=SimpleNamespace(send=enviar)), resposta, seguintes


class CanalFake:
    def __init__(self):
        self.enviadas = []

    async def send(self, **kw):
        self.enviadas.append(kw)


def test_formulario_valida_posta_no_canal_e_nao_entrega_codigo(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        canal = CanalFake()
        bot = SimpleNamespace(banco=b)
        cog = Feedback(bot)  # type: ignore[arg-type]

        async def canal_feedbacks(_guild):
            return canal

        cog.canal_feedbacks = canal_feedbacks  # type: ignore[method-assign]
        longo = "gostei muito do servidor, a comunidade é ótima"
        i1, r1, _ = interacao(A)
        await cog.receber(i1, "9", longo, "")  # nota inválida
        i2, r2, _ = interacao(A)
        await cog.receber(i2, "5", "curto", "")  # curto
        i3, r3, s3 = interacao(A)
        await cog.receber(i3, "5", longo, "mais eventos")  # ok
        i4, r4, _ = interacao(A)
        await cog.receber(i4, "5", longo, "")  # 60 s de espera
        cog._ultimo_envio.clear()
        i5, r5, _ = interacao(A)
        await cog.receber(i5, "5", longo, "")  # já mandou: só depois de 30 dias
        await b._exec("UPDATE feedbacks SET criado_em = criado_em - ?", (31 * 86400,))
        cog._ultimo_envio.clear()
        i6, r6, s6 = interacao(A)
        await cog.receber(i6, "4", longo, "")  # sem código entregue ainda: mesma resposta com o botão do tíquete
        await b.feedback_entregar(G, A, STAFF)
        await b._exec("UPDATE feedbacks SET criado_em = criado_em - ?", (31 * 86400,))
        cog._ultimo_envio.clear()
        i7, r7, s7 = interacao(A)
        await cog.receber(i7, "4", longo, "")  # quem já recebeu código: agradece e só
        n = (await b._um("SELECT COUNT(*) AS n FROM feedbacks"))["n"]
        codigos = await b.codigo_contar(G)
        await b.fechar()
        return [r.mensagens for r in (r1, r2, r4, r5)], s3, s6, s7, n, codigos, canal.enviadas

    msgs, s3, s6, s7, n, codigos, enviadas = rodar(cenario)
    assert "1 a 5" in msgs[0][0] and "20" in msgs[1][0] and "segundos" in msgs[2][0] and "outro" in msgs[3][0]
    texto3, kw3 = s3[0]
    assert "disboard.org/pt-br/server/1549268882416734238" in texto3 and "1.000" in texto3 and "depois" in texto3
    assert "receber feedback saldo" in texto3 and "VULPUS-" not in texto3 and kw3["ephemeral"] and kw3["view"] is not None
    assert "VULPUS-" not in s6[0][0]
    assert "já recebeu" in s7[0][0] and "view" not in s7[0][1]
    assert n == 3 and codigos == 1
    assert len(enviadas) == 3
    e = enviadas[0]["embed"]
    campos = {f.name: f.value for f in e.fields}
    assert campos["Autor"] == f"<@{A}>" and "⭐⭐⭐⭐⭐" in campos["Nota"] and campos["O que melhorar"] == "mais eventos" and "Data" in campos
    assert "gostei muito" in e.description
    assert enviadas[0]["allowed_mentions"].everyone is False and not enviadas[0]["allowed_mentions"].users


def test_checar_ticket_de_feedback(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        cog = Feedback(SimpleNamespace(banco=b))  # type: ignore[arg-type]

        async def painel(_g):
            return None

        cog.canal_painel = painel  # type: ignore[method-assign]
        guild = SimpleNamespace(id=G)
        pessoa = SimpleNamespace(id=A)
        sem = await cog.checar_ticket(guild, pessoa)
        await b.feedback_registrar(G, A, 5, "feedback longo o bastante aqui", "")
        pode = await cog.checar_ticket(guild, pessoa)
        await b.feedback_entregar(G, A, STAFF)
        recebeu = await cog.checar_ticket(guild, pessoa)
        await b.fechar()
        return sem, pode, recebeu

    sem, pode, recebeu = rodar(cenario)
    assert "ainda não mandou" in sem and pode is None and "já recebeu" in recebeu


def test_categoria_de_ticket_e_canais_fixos():
    import config

    assert ("feedback", "Receber feedback saldo") == next((c[0], c[1]) for c in config.CATEGORIAS_TICKET if c[0] == "feedback")
    assert config.CANAL_FEEDBACKS_ID == 1563968537796550727 and config.CANAL_DAR_FEEDBACK_ID == 1563967949344211054
    assert all(len(b) <= 25 for b in config.blocos_de_canais()) and len(config.CANAIS_CONFIG) <= 50


# ------------------------------------------------------------------ rota do jogo
def test_rota_codigo_do_jogo(tmp_path):
    from test_ponte_minecraft import AUTH, montar, vincular

    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            await banco.codigo_criar(G, 1000, codigo="VULPUS-TEST-1234")
            corpo = {"id": "mc-1", "nome": "Raposa", "codigo": "vulpus-test-1234"}
            sem_vinculo = await cliente.post("/mc/codigo", json=corpo, headers=AUTH)
            sem_vinculo_dados = await sem_vinculo.json()
            await vincular(banco, cliente, A)
            ruim = await (await cliente.post("/mc/codigo", json={**corpo, "codigo": "NADA"}, headers=AUTH)).json()
            ok = await (await cliente.post("/mc/codigo", json=corpo, headers=AUTH)).json()
            de_novo = await (await cliente.post("/mc/codigo", json=corpo, headers=AUTH)).json()
            sem_token = await cliente.post("/mc/codigo", json=corpo)
            saldo = await banco.saldo(G, A)
            return sem_vinculo.status, sem_vinculo_dados, ruim, ok, de_novo, sem_token.status, saldo
        finally:
            await cliente.close()
            await banco.fechar()

    status, sem_vinculo, ruim, ok, de_novo, sem_token, saldo = rodar(cenario)
    assert status == 403 and sem_vinculo["erro"] == "nao_vinculado" and "vincular" in sem_vinculo["mensagem"]
    assert ruim["ok"] is False and ruim["status"] == "nao_existe"
    assert ok["ok"] is True and ok["caudas"] == 1000 and "+1.000" in ok["mensagem"]
    assert de_novo["ok"] is False and de_novo["status"] == "ja_usou"
    assert sem_token == 401 and saldo == 1000


@pytest.mark.parametrize("corpo", [{"id": "mc-1", "nome": "Raposa"}, {"nome": "Raposa", "codigo": "x"}])
def test_rota_codigo_dados_invalidos(tmp_path, corpo):
    from test_ponte_minecraft import AUTH, montar

    async def cenario():
        banco, ponte, cliente, _ = await montar(tmp_path)
        try:
            r = await cliente.post("/mc/codigo", json=corpo, headers=AUTH)
            return r.status
        finally:
            await cliente.close()
            await banco.fechar()

    assert rodar(cenario) in (200, 400)


# ------------------------------------------------------------------ /setup: canais em blocos e ajustes
def test_canais_do_setup_em_blocos_e_novas_funcoes():
    import config
    from cogs.configuracao import SECAO_CLASSES, dividir_linhas

    blocos = config.blocos_de_canais()
    assert len(blocos) == 2 and all(len(b) <= 25 for b in blocos)
    assert sum(len(b) for b in blocos) == len(config.CANAIS_CONFIG) == len({k for b in blocos for k, _ in b})
    for chave in ("feedback", "feedbacks", "changelog_mc", "placares", "doacoes"):
        assert chave in config.CANAIS_CONFIG
    assert "ajustes" in SECAO_CLASSES
    # a listagem cabe na embed mesmo com tudo "não configurado" (descrição < 4096 e campos < 1024)
    linhas = [f"❌ **{r}** — *não configurado*" for r in config.CANAIS_CONFIG.values()]
    partes = dividir_linhas(linhas)
    assert len(partes[0]) < 4096 and all(len(x) < 1024 for x in partes[1:])
    muitas = dividir_linhas(["x" * 300] * 30)  # força a divisão em campos
    assert len(muitas) > 1 and len(muitas[0]) <= 3800 and all(len(x) <= 1000 for x in muitas[1:])


def test_ajustes_do_feedback_e_dos_codigos_existem():
    import config

    a = config.AJUSTES
    esperados = {
        "feedback_ligado": 1, "feedback_caudas": 1000, "feedback_codigo_dias": 90, "feedback_min_caracteres": 20,
        "feedback_espera_seg": 60, "feedback_dias_novo": 30, "codigo_erros_max": 5, "codigo_erros_janela_min": 10,
    }
    for chave, padrao in esperados.items():
        assert a[chave][0] == padrao and chave in config.AJUSTES_NO_SETUP
    assert a["feedback_caudas"][1:3] == (0, 100000)


def test_ajustes_mudam_o_codigo_e_o_limite_de_erros(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        await b.definir_ajuste(G, "feedback_caudas", 250)
        await b.definir_ajuste(G, "feedback_codigo_dias", 7)
        await b.definir_ajuste(G, "codigo_erros_max", 2)
        await b.feedback_registrar(G, A, 5, "feedback longo o bastante aqui", "")
        cod, _ = await b.feedback_entregar(G, A, STAFF)
        linha = await b.codigo_obter(cod)
        erros = [(await b.resgatar_codigo(G, B, "L", f"X{i}")).status for i in range(3)]
        await b.definir_ajuste(G, "codigo_erros_janela_min", 1)
        await b._exec("UPDATE codigos_tentativas SET quando = quando - 120")  # fora da janela de 1 min
        liberado = await b.resgatar_codigo(G, A, "R", cod)
        await b.fechar()
        return dict(linha), erros, liberado

    linha, erros, liberado = rodar(cenario)
    assert linha["caudas"] == 250 and 6 * 86400 < linha["expira_em"] - int(time.time()) <= 7 * 86400
    assert erros == ["nao_existe", "nao_existe", "muitas"] and liberado == ResultadoCodigo("ok", 250, 250)


def test_ajustes_do_formulario(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        cog = Feedback(SimpleNamespace(banco=b))  # type: ignore[arg-type]
        enviadas = []

        async def canal_feedbacks(_g):
            return None

        cog.canal_feedbacks = canal_feedbacks  # type: ignore[method-assign]
        await b.definir_ajuste(G, "feedback_min_caracteres", 40)
        i1, r1, _ = interacao(A)
        await cog.receber(i1, "5", "texto de uns trinta caracteres", "")  # < 40
        await b.definir_ajuste(G, "feedback_min_caracteres", 20)
        await b.definir_ajuste(G, "feedback_espera_seg", 0)
        await b.definir_ajuste(G, "feedback_dias_novo", 0)
        for _ in range(2):  # sem espera e sem dias: dois seguidos passam
            i, r, s = interacao(A)
            await cog.receber(i, "5", "texto de uns trinta caracteres", "")
            enviadas.append(len(s))
        await b.definir_ajuste(G, "feedback_ligado", 0)
        i3, r3, _ = interacao(A)
        await cog.receber(i3, "5", "texto de uns trinta caracteres", "")
        n = (await b._um("SELECT COUNT(*) AS n FROM feedbacks"))["n"]
        await b.fechar()
        return r1.mensagens, enviadas, r3.mensagens, n

    curto, enviadas, desligado, n = rodar(cenario)
    assert "40" in curto[0] and enviadas == [1, 1] and "desligado" in desligado[0] and n == 2


def test_secoes_do_setup_montam_os_menus_nas_linhas_certas(tmp_path):
    from cogs.configuracao import SecaoAjustes, SecaoCanais

    async def cenario():
        b = await novo(tmp_path)
        cog = SimpleNamespace(bot=SimpleNamespace(banco=b))
        guild = SimpleNamespace(id=G)
        canais = SecaoCanais(cog, 1, guild)  # type: ignore[arg-type]
        ajustes = SecaoAjustes(cog, 1, guild)  # type: ignore[arg-type]
        e1, e2 = await canais.construir_embed(), await ajustes.construir_embed()
        # escolher no 2º menu tira a marca do 1º
        primeiro, segundo = canais.menus
        alvo = segundo.options[0].value
        primeiro.options[0].default = True
        for menu in canais.menus:
            for op in menu.options:
                op.default = op.value == alvo
        await b.fechar()
        return canais, ajustes, e1, e2, primeiro, segundo

    canais, ajustes, e1, e2, primeiro, segundo = rodar(cenario)
    assert [m.row for m in canais.menus] == [0, 3] and len(canais.menus[0].options) == 25 and len(canais.menus[1].options) == 5
    assert len(e1.description) < 4096 and len(e1) < 6000 and len(e2.description) < 4096
    assert not any(o.default for o in primeiro.options) and segundo.options[0].default
    assert len(ajustes.children[0].options) == 8
    import config

    texto = "\n".join(f"`{k}` = **{v[0]}** *(padrão {v[0]})* — {v[3]}" for k, v in config.AJUSTES.items())
    from cogs.configuracao import dividir_linhas

    assert all(len(x) < 4096 for x in dividir_linhas(texto.split("\n"), 3800, 3800))  # /ajustes ver divide em mensagens
