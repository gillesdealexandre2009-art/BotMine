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


def test_feedback_gera_um_codigo_pessoal(tmp_path):
    async def cenario():
        b = await novo(tmp_path)
        fid, cod = await b.feedback_registrar(G, A, 5, "gostei muito de tudo aqui", "", com_codigo=True)
        linha = await b.codigo_obter(cod)
        ja = await b.feedback_ja_ganhou_codigo(G, A)
        outro_ja = await b.feedback_ja_ganhou_codigo(G, B)
        alheio = await b.resgatar_codigo(G, B, "Lobo", cod)
        meu = await b.resgatar_codigo(G, A, "Raposa", cod)
        _, sem = await b.feedback_registrar(G, A, 4, "outro feedback bem longo", "x", com_codigo=False)
        await b.fechar()
        return fid, cod, dict(linha), ja, outro_ja, alheio.status, meu, sem

    fid, cod, linha, ja, outro_ja, alheio, meu, sem = rodar(cenario)
    assert fid == 1 and cod.startswith("VULPUS-")
    assert linha["caudas"] == 1000 and linha["usos_max"] == 1 and linha["dono_id"] == A
    assert 89 * 86400 < linha["expira_em"] - int(time.time()) <= 90 * 86400
    assert ja and not outro_ja and alheio == "nao_existe" and meu == ResultadoCodigo("ok", 1000, 1000) and sem is None


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


def test_formulario_valida_e_entrega_codigo(tmp_path, monkeypatch):
    async def cenario():
        b = await novo(tmp_path)
        bot = SimpleNamespace(banco=b)
        cog = Feedback(bot)  # type: ignore[arg-type]
        avisos = []

        async def log(bot_, guild, chave, **kw):
            avisos.append((chave, kw["embed"]))
            return chave == "logs_gerais"  # "sugestoes" não existe: cai para os logs gerais

        monkeypatch.setattr("cogs.feedback.enviar_log", log)
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
        await cog.receber(i6, "4", longo, "")  # sem novo código
        i7, r7, s7 = interacao(B)
        cog._ultimo_envio.clear()
        await cog.receber(i7, "3", longo, "")  # outra pessoa: código novo
        codigos = await b._todos("SELECT codigo, dono_id FROM codigos ORDER BY criado_em, rowid")
        n = (await b._um("SELECT COUNT(*) AS n FROM feedbacks"))["n"]
        await b.fechar()
        return [r.mensagens for r in (r1, r2, r4, r5)], s3, s6, s7, [(c["dono_id"]) for c in codigos], n, avisos

    msgs, s3, s6, s7, donos, n, avisos = rodar(cenario)
    assert "1 a 5" in msgs[0][0] and "20" in msgs[1][0] and "segundos" in msgs[2][0] and "outro" in msgs[3][0]
    texto3 = s3[0][0]
    assert "disboard.org/pt-br/server/1549268882416734238" in texto3 and "1.000" in texto3 and "VULPUS-" in texto3 and s3[0][1]["ephemeral"]
    assert "VULPUS-" not in s6[0][0] and "VULPUS-" in s7[0][0]
    assert donos == [A, B] and n == 3
    assert [a[0] for a in avisos] == ["sugestoes", "logs_gerais"] * 3
    assert all(a[1].fields[1].value.startswith("<@") for a in avisos)


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
