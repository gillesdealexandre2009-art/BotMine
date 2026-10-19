"""Placares: tempo em call, tempo de jogo (total e maior sessão) e montagem dos três quadros."""
import asyncio
from types import SimpleNamespace

import config
from cogs.placares import Placares, duracao, linhas_do_placar
from database import Banco

G = 1


def rodar(c):
    return asyncio.run(c())


def test_duracao_e_linhas():
    assert duracao(45 * 60) == "45min" and duracao(3 * 3600 + 20 * 60) == "3h20" and duracao(2 * 86400 + 5 * 3600) == "2d 5h"
    texto = linhas_do_placar([("A", "3h"), ("B", "2h"), ("C", "1h"), ("D", "30min")])
    assert texto.splitlines()[0].startswith("🥇 A") and texto.splitlines()[2].startswith("🥉 C") and "**4.** D" in texto
    assert "ninguém" in linhas_do_placar([]).lower()


def test_voz_soma_e_ordena(tmp_path):
    async def c():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            await banco.voz_somar(G, [1, 2])
            await banco.voz_somar(G, [1], 5)
            await banco.voz_somar(G, [])
            r = await banco.voz_ranking(G)
            assert [(int(x["user_id"]), int(x["minutos"])) for x in r] == [(1, 6), (2, 1)]
        finally:
            await banco.fechar()

    rodar(c)


def test_tempo_de_jogo_soma_total_e_separa_sessoes(tmp_path):
    async def c():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            t = 1_000_000
            for i in range(5):  # Ana fica 4 min seguidos (5 avisos de 60 s)
                await banco.mc_tempo_registrar(G, [("ana", "Ana")], t + 60 * i)
            await banco.mc_tempo_registrar(G, [("ana", "Ana")], t + 60 * 4 + 3600)  # sumiu 1 h: sessão nova, a hora não conta
            for i in range(1, 3):
                await banco.mc_tempo_registrar(G, [("ana", "Ana")], t + 60 * 4 + 3600 + 60 * i)
            await banco.mc_tempo_registrar(G, [("beto", "Beto")], t)
            await banco.mc_tempo_registrar(G, [("beto", "Beto")], t + 60)
            ana = next(r for r in await banco.mc_tempo_ranking(G, "total_s") if r["nome_norm"] == "ana")
            assert int(ana["total_s"]) == 240 + 120 and int(ana["maior_s"]) == 240
            ordem = [r["nome"] for r in await banco.mc_tempo_ranking(G, "maior_s")]
            assert ordem == ["Ana", "Beto"]
            try:
                await banco.mc_tempo_ranking(G, "x; DROP TABLE mc_tempo")
                raise AssertionError("coluna estranha deveria falhar")
            except ValueError:
                pass
        finally:
            await banco.fechar()

    rodar(c)


class Canal:
    def __init__(self) -> None:
        self.id = config.CANAL_PLACARES_ID
        self.mensagens = []

    async def send(self, **kw):
        self.mensagens.append(kw)
        return SimpleNamespace(id=len(self.mensagens), edit=self._editar)

    async def _editar(self, **kw):
        self.mensagens.append(kw)


def test_montar_mostra_nome_do_discord_para_quem_ligou_a_conta(tmp_path):
    async def c():
        banco = Banco(str(tmp_path / "t.db"))
        await banco.conectar()
        try:
            await banco.voz_somar(G, [10], 90)
            await banco.mc_tempo_registrar(G, [("ana", "Ana"), ("beto", "Beto")], 1000)
            await banco.mc_tempo_registrar(G, [("ana", "Ana"), ("beto", "Beto")], 1060)
            await banco._exec(
                "INSERT INTO mc_vinculos (guild_id, user_id, mc_id, mc_nome, mc_nome_norm, vinculado_em, visto_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (G, 10, "mc10", "Ana", "ana", 1, 1),
            )
            membros = {10: SimpleNamespace(id=10, display_name="AnaDiscord")}
            cargo = SimpleNamespace(members=[membros[10]])
            guild = SimpleNamespace(id=G, get_member=lambda u: membros.get(u), get_role=lambda rid: cargo)
            cog = Placares(SimpleNamespace(banco=banco))  # type: ignore[arg-type]
            e = await cog.montar(guild)  # type: ignore[arg-type]
            assert set(e) == {"voz", "sessao", "total"}
            assert "🦊 AnaDiscord: **1h30**" in e["voz"].description  # Kitsune ganha a raposa do lado do nome
            assert "AnaDiscord" in e["total"].description and "Beto" in e["total"].description
        finally:
            await banco.fechar()

    rodar(c)


def test_config_dos_placares():
    assert "placares" in config.COGS and "placares" in config.CANAIS_CONFIG and config.AJUSTES["placares_ligado"][0] == 1
    assert config.CANAL_PLACARES_ID == 1561554021989359616
