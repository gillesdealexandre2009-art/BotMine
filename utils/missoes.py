"""Missões diárias: o catálogo e o sorteio do dia (puros, fáceis de testar)."""
from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class Missao:
    id: str
    titulo: str
    fonte: str  # "msgs" | "resp" | "reac" (contadores na memória) ou "quiz" | "forca" (lidos do livro de recompensas)
    meta: int


CATALOGO = [
    Missao("msgs20", "Converse no servidor", "msgs", 20),
    Missao("msgs50", "Bata um papo longo", "msgs", 50),
    Missao("resp5", "Responda a 5 mensagens de outras pessoas", "resp", 5),
    Missao("reac6", "Reaja a 6 mensagens", "reac", 6),
    Missao("quiz1", "Acerte uma pergunta do /quiz", "quiz", 1),
    Missao("forca1", "Vença uma partida de /forca", "forca", 1),
]
POR_ID = {m.id: m for m in CATALOGO}
POR_DIA = 3


def missoes_do_dia(guild_id: int, dia_ordinal: int) -> list[Missao]:
    """As mesmas 3 missões para todo mundo do servidor naquele dia (sorteio fixo pela data)."""
    return random.Random(guild_id * 100003 + dia_ordinal).sample(CATALOGO, POR_DIA)
