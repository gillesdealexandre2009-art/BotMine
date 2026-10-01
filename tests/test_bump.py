"""Detecção do bump do DISBOARD, com o formato real da resposta (copiado de uma mensagem do servidor)."""
from types import SimpleNamespace

from cogs.bump import DISBOARD_ID, eh_bump_ok, quem_bumpou

IMAGEM_OK = "https://disboard.org/images/bot-command-image-bump.png"


def mensagem(autor_id, imagem, usuario=None):
    embeds = [SimpleNamespace(image=SimpleNamespace(url=imagem) if imagem else None)]
    meta = SimpleNamespace(user=usuario) if usuario else None
    return SimpleNamespace(author=SimpleNamespace(id=autor_id), embeds=embeds, interaction_metadata=meta)


def test_bump_ok_em_qualquer_idioma():
    assert eh_bump_ok(mensagem(DISBOARD_ID, IMAGEM_OK))


def test_ignora_erro_de_cooldown_e_outros_bots():
    assert not eh_bump_ok(mensagem(DISBOARD_ID, None))  # "espere X minutos" vem sem a imagem
    assert not eh_bump_ok(mensagem(DISBOARD_ID, "https://disboard.org/images/outra.png"))
    assert not eh_bump_ok(mensagem(123, IMAGEM_OK))  # alguém imitando o embed


def test_quem_bumpou_vem_da_interacao():
    pessoa = SimpleNamespace(id=42)
    assert quem_bumpou(mensagem(DISBOARD_ID, IMAGEM_OK, pessoa)) is pessoa
