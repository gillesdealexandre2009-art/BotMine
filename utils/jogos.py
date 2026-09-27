"""Matemática dos jogos (funções puras, fáceis de testar)."""
from __future__ import annotations

import math

import config


def probabilidade_seguras(minas: int, reveladas: int) -> float:
    """Chance de as primeiras `reveladas` casas escolhidas serem todas seguras."""
    seguras = config.MINES_CASAS - minas
    if reveladas <= 0:
        return 1.0
    if reveladas > seguras:
        return 0.0
    return math.comb(seguras, reveladas) / math.comb(config.MINES_CASAS, reveladas)


def multiplicador(minas: int, reveladas: int) -> float:
    """Multiplicador justo (1 / probabilidade) menos a margem da casa. 1.0 se nada foi revelado."""
    if reveladas <= 0:
        return 1.0
    return (1 - config.MINES_MARGEM_CASA) / probabilidade_seguras(minas, reveladas)
