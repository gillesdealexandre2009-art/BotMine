"""Automod: menção a usuário desconhecido conta (o raid de 50 menções que passou), /limpar aceita até 1000."""
import asyncio
import types

import config
from cogs import automod, moderacao


def test_conta_mencoes_do_texto_mesmo_sem_usuario():
    texto = " ".join(f"<@{1000000000000000 + i}>" for i in range(50))
    assert automod.contar_mencoes(texto) == 50
    assert automod.contar_mencoes("<@!123456789012345678> <@&123456789012345678> oi") == 2
    assert automod.contar_mencoes("@everyone @here") == 2
    assert automod.contar_mencoes("oi, tudo bem?") == 0
    # a mesma pessoa 8 vezes também conta 8
    assert automod.contar_mencoes("<@123456789012345678> " * 8) == 8
    # nunca conta menos do que o Discord resolveu
    assert automod.contar_mencoes("oi", resolvidas=7) == 7


def test_ajuste_novo_existe_e_a_faixa_e_razoavel():
    padrao, minimo, maximo, _ = config.AJUSTES["automod_mencoes_grave"]
    assert minimo <= padrao <= maximo
    assert padrao > config.AJUSTES["automod_mencoes_max"][0]


class _Banco:
    def __init__(self, **valores):
        self.valores = valores

    async def ajuste(self, _guild, chave):
        return self.valores.get(chave, config.AJUSTES[chave][0])


def _mensagem(conteudo, everyone=False):
    return types.SimpleNamespace(
        guild=types.SimpleNamespace(id=1),
        author=types.SimpleNamespace(id=2),
        content=conteudo,
        mentions=[],
        role_mentions=[],
        mention_everyone=everyone,
    )


def _cog(**valores):
    bot = types.SimpleNamespace(banco=_Banco(**valores))
    return automod.Automod(bot)  # type: ignore[arg-type]


def test_raid_de_mencoes_desconhecidas_e_detectado_como_grave():
    cog = _cog()
    texto = " ".join(f"<@{1000000000000000 + i}>" for i in range(50))
    assert asyncio.run(cog._detectar(_mensagem(texto))) == "mencoes_grave"


def test_poucas_mencoes_nao_punem_e_algumas_viram_aviso_simples():
    cog = _cog()
    assert asyncio.run(cog._detectar(_mensagem("oi <@1000000000000001> <@1000000000000002>"))) is None
    seis = " ".join(f"<@{1000000000000000 + i}>" for i in range(6))
    assert asyncio.run(cog._detectar(_mensagem(seis))) == "mencoes"


def test_mencoes_desligado_nao_pune():
    cog = _cog(automod_mencoes=0, automod_antispam=0, automod_convites=0, automod_links=0)
    texto = " ".join(f"<@{1000000000000000 + i}>" for i in range(50))
    assert asyncio.run(cog._detectar(_mensagem(texto))) is None


def test_motivo_mencoes_tem_texto():
    import textos
    assert "mencoes" in textos.AUTOMOD_MOTIVOS


def test_limpar_aceita_ate_1000():
    cmd = moderacao.Moderacao.limpar
    params = {p.name: p for p in cmd.parameters}
    assert params["quantidade"].max_value == 1000
