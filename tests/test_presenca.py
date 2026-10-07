from cogs.presenca import ids_candidatos, minuto_do_dia


def test_minuto_fixo_por_dia_e_dentro_da_janela():
    a = minuto_do_dia(1, "2026-10-07", "midia", 14, 21)
    assert a == minuto_do_dia(1, "2026-10-07", "midia", 14, 21)
    assert 14 * 60 <= a < 21 * 60
    outros = {minuto_do_dia(1, f"2026-10-{d:02d}", "midia", 14, 21) for d in range(1, 20)}
    assert len(outros) > 5  # varia de um dia para o outro


def test_ids_candidatos():
    assert ids_candidatos("123, 456,x") == [123, 456]


def test_agenda_10_dias_sem_duplicar_e_com_retry(tmp_path):
    import asyncio
    from datetime import datetime
    from types import SimpleNamespace

    from cogs.presenca import Presenca
    from database import Banco
    from utils.helpers import TZ

    async def cenario():
        banco = Banco(str(tmp_path / "p.db"))
        await banco.conectar()
        cerebro = SimpleNamespace(ativo=lambda g: _sempre())
        bot = SimpleNamespace(banco=banco, get_cog=lambda n: cerebro, user=SimpleNamespace(id=1))
        p = Presenca.__new__(Presenca)
        p.bot = bot
        chamadas = {"midia": 0, "pub": 0, "lore": 0}
        resultado = {"midia": True}

        async def midia(g):
            chamadas["midia"] += 1
            return resultado["midia"]

        async def pub(g):
            chamadas["pub"] += 1
            return True

        async def lore(g):
            chamadas["lore"] += 1
            return True

        async def sem_canal(g):
            return None

        p.postar_midia, p.postar_publicacoes, p.postar_lore = midia, pub, lore
        p._canal_midia = sem_canal
        guild = SimpleNamespace(id=1)

        def dia(d):
            return datetime(2026, 10, d, 20, 59, tzinfo=TZ)

        await banco.set_config(1, "presenca_midia_data", "2026-10-07")  # nome antigo: já postou hoje
        await p._tique(guild, dia(7))
        await p._tique(guild, dia(7))
        assert chamadas["midia"] == 0  # reiniciar/repetir o tique não posta de novo
        await p._tique(guild, dia(16))
        assert chamadas["midia"] == 0  # 9 dias: ainda não
        resultado["midia"] = False
        await p._tique(guild, dia(17))  # 10 dias: tenta e falha -> devolve o período
        await p._tique(guild, dia(17))
        assert chamadas["midia"] == 2
        resultado["midia"] = True
        await p._tique(guild, dia(17))
        await p._tique(guild, dia(17))
        assert chamadas["midia"] == 3  # sucesso e depois nunca mais no mesmo ciclo
        assert await banco.get_config(1, "presenca_midia_ultimo") == "2026-10-17"
        assert chamadas["lore"] == 1  # lore só uma vez por mês
        await banco.fechar()

    asyncio.run(cenario())


async def _sempre():
    return True
