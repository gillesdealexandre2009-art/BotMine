"""Figurinhas da Kiza: catálogo, sorteio por raridade e desenho da carta (nome, número e selo sobre a arte pronta).

A arte (moldura + ilustração) vem pronta de assets/figurinhas/<arquivo>.webp; aqui só se escreve por cima o que muda
(nome, número, selo de raridade), por código, para nunca sair letra torta. Funções puras: fáceis de testar.
"""
from __future__ import annotations

import io
import math
import random
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

PASTA = Path(__file__).resolve().parent.parent / "assets"
FONTE = PASTA / "fonts" / "Fredoka.ttf"
CARTAS_DIR = PASTA / "figurinhas"


@dataclass(frozen=True)
class Raridade:
    chave: str
    rotulo: str
    emoji: str
    cor: tuple[int, int, int]  # cor do selo e do brilho do texto
    texto: tuple[int, int, int]
    peso: int  # chance relativa no sorteio


RARIDADES = {
    "comum": Raridade("comum", "Comum", "⚪", (92, 104, 140), (240, 243, 250), 78),
    "rara": Raridade("rara", "Rara", "🔵", (30, 112, 236), (200, 232, 255), 22),
}


@dataclass(frozen=True)
class Carta:
    id: str
    numero: int
    nome: str
    raridade: str
    arquivo: str
    selo: tuple[int, int, int]  # centro x, centro y e raio do círculo da moldura
    faixa_nome: tuple[int, int, int, int]  # x1, y1, x2, y2 da área do nome (dentro da faixa)
    caixa_numero: tuple[int, int, int, int]
    descricao: str = ""


# Cada arte foi gerada separadamente, então as caixas variam um pouco de uma carta para outra.
CATALOGO: list[Carta] = [
    Carta("kiza_sonolenta", 1, "Kiza Sonolenta", "comum", "kiza_sonolenta.webp",
          selo=(130, 168, 50), faixa_nome=(215, 1205, 880, 1285), caixa_numero=(865, 1312, 1015, 1378),
          descricao="Dormir até tarde é um esporte, e ela é campeã."),
    Carta("creeper_timido", 2, "Creeper Tímido", "rara", "creeper_timido.webp",
          selo=(155, 168, 62), faixa_nome=(235, 1235, 855, 1305), caixa_numero=(845, 1330, 1012, 1392),
          descricao="Ele só queria um abraço. (Não explode. Hoje.)"),
]
POR_ID = {c.id: c for c in CATALOGO}


def sortear(rng: Optional[random.Random] = None, catalogo: Optional[list[Carta]] = None) -> Carta:
    """Sorteia uma carta: primeiro a raridade (pelos pesos), depois uma carta daquela raridade."""
    rng = rng or random
    catalogo = catalogo if catalogo is not None else CATALOGO
    existentes = [r for r in RARIDADES.values() if any(c.raridade == r.chave for c in catalogo)]
    raridade = rng.choices(existentes, weights=[r.peso for r in existentes])[0]
    return rng.choice([c for c in catalogo if c.raridade == raridade.chave])


@lru_cache(maxsize=8)
def _fonte(tamanho: int) -> ImageFont.FreeTypeFont:
    fonte = ImageFont.truetype(str(FONTE), tamanho)
    try:
        fonte.set_variation_by_axes([600, 100])  # peso seminegrito, largura normal
    except (OSError, AttributeError):  # fonte estática: usa como está
        pass
    return fonte


def _texto_ajustado(d: ImageDraw.ImageDraw, texto: str, caixa: tuple[int, int, int, int], maximo: int, cor, brilho) -> None:
    """Escreve `texto` centralizado na caixa, diminuindo a fonte até caber."""
    x1, y1, x2, y2 = caixa
    largura, altura = x2 - x1, y2 - y1
    tamanho = maximo
    while tamanho > 14:
        fonte = _fonte(tamanho)
        caixa_texto = d.textbbox((0, 0), texto, font=fonte, stroke_width=3)
        if caixa_texto[2] - caixa_texto[0] <= largura and caixa_texto[3] - caixa_texto[1] <= altura:
            break
        tamanho -= 2
    fonte = _fonte(tamanho)
    d.text(((x1 + x2) / 2, (y1 + y2) / 2), texto, font=fonte, fill=cor, anchor="mm", stroke_width=3, stroke_fill=brilho)


def _estrela(d: ImageDraw.ImageDraw, cx: float, cy: float, raio: float, cor, contorno) -> None:
    pontos = []
    for i in range(10):
        r = raio if i % 2 == 0 else raio * 0.45
        a = -math.pi / 2 + i * math.pi / 5
        pontos.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pontos, fill=cor)
    d.line(pontos + [pontos[0]], fill=contorno, width=3, joint="curve")


def desenhar_carta(carta: Carta, qualidade: int = 90) -> bytes:
    """WebP da carta pronta (arte + nome + número + selo)."""
    r = RARIDADES[carta.raridade]
    img = Image.open(CARTAS_DIR / carta.arquivo).convert("RGB")
    d = ImageDraw.Draw(img)
    escuro = (12, 16, 36)

    cx, cy, raio = carta.selo
    _estrela(d, cx, cy, raio * 0.78, r.cor, escuro)

    _texto_ajustado(d, carta.nome, carta.faixa_nome, 68, r.texto, escuro)
    _texto_ajustado(d, f"#{carta.numero:02d}", carta.caixa_numero, 46, r.texto, escuro)

    saida = io.BytesIO()
    img.save(saida, format="WEBP", quality=qualidade, method=4)
    return saida.getvalue()
