"""Gera as texturas da bandeira do Capture the Flag (entidade vulpus:bandeira), o ícone do botão e a prévia.

Uso, a partir da pasta addon/:
    python tools/gerar_bandeira.py            # gera tudo, mas preserva PNGs trocados à mão
    python tools/gerar_bandeira.py --forcar   # sobrescreve até os PNGs trocados à mão

Saída:
- vulpus_rp/textures/vulpus/entidades/bandeira_<cor>.png (64x64), uma por cor de clã, na ordem de
  CORES_CLA (sistemas/cla_dados.js): o render controller escolhe pelo índice (propriedade vulpus:cor).
  Mapa da textura (o mesmo do models/entity/bandeira.geo.json):
    pano 28x16 em (0, 0): coluna 0 encosta no mastro; borda (lados finos do pano) em (30, 0);
    mastro 2x48 em (32, 0) e topo/fundo em (36, 0); pé 4x2 em (40, 0) e 4x4 em (40, 4);
    ponta 3x3 em (46, 0);
- vulpus_rp/textures/vulpus/ui/bandeira.png (16x16): ícone do botão "Marcar a bandeira";
- docs/previas/bandeiras.png: as 12 bandeiras lado a lado (ampliadas).

Desenho pixel a pixel, sem antialias. Cada PNG leva a assinatura do gerar_texturas.py; um PNG trocado à mão
não é sobrescrito sem --forcar.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True  # sem __pycache__ dentro de tools/

from gerar_texturas import salvar_png  # noqa: E402

ADDON = Path(__file__).resolve().parent.parent
RP = ADDON / "vulpus_rp"
PASTA_ENTIDADES = RP / "textures" / "vulpus" / "entidades"
ICONE = RP / "textures" / "vulpus" / "ui" / "bandeira.png"
PREVIA = ADDON / "docs" / "previas" / "bandeiras.png"

# Cores dos códigos § do jogo, na ordem de CORES_CLA (cla_dados.js). Mudou lá, muda aqui.
CORES = [
    ("6", (255, 170, 0)),
    ("e", (255, 255, 85)),
    ("a", (85, 255, 85)),
    ("b", (85, 255, 255)),
    ("c", (255, 85, 85)),
    ("d", (255, 85, 255)),
    ("9", (85, 85, 255)),
    ("5", (170, 0, 170)),
    ("3", (0, 170, 170)),
    ("2", (0, 170, 0)),
    ("f", (255, 255, 255)),
    ("g", (221, 214, 5)),
]

CREME = (255, 244, 230)
GRAFITE = (52, 46, 44)
MADEIRA = (112, 74, 42)
MADEIRA_ESCURA = (84, 54, 30)
OURO = (232, 184, 64)
OURO_CLARO = (255, 222, 120)
OURO_ESCURO = (170, 120, 30)

PANO_L, PANO_A = 28, 16
# Raposinha simétrica (9x8) no meio do pano: X = pelo, O = olho/nariz.
RAPOSA = [
    "X.......X",
    "XX.....XX",
    "XXXXXXXXX",
    "XOXXXXXOX",
    "XXXXXXXXX",
    ".XXXOXXX.",
    "..XXXXX..",
    "...XXX...",
]


def tom(cor: tuple, fator: float) -> tuple:
    """Clareia (>1) ou escurece (<1) uma cor RGB."""
    return tuple(max(0, min(255, round(c * fator))) for c in cor)


def clara(cor: tuple) -> bool:
    return (0.299 * cor[0] + 0.587 * cor[1] + 0.114 * cor[2]) > 200


def pintar_retangulo(img: Image.Image, x: int, y: int, l: int, a: int, cor: tuple) -> None:
    for i in range(x, x + l):
        for j in range(y, y + a):
            img.putpixel((i, j), (*cor, 255))


def textura(cor: tuple) -> Image.Image:
    """Textura 64x64 de uma bandeira na cor do clã."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    borda = tom(cor, 0.62)
    luz = tom(cor, 1.12) if not clara(cor) else cor
    sombra = tom(cor, 0.84)
    # Pano: cor do clã com luz em cima, sombra embaixo e borda escura.
    for x in range(PANO_L):
        for y in range(PANO_A):
            c = luz if y < 5 else sombra if y >= 12 else cor
            if y in (0, PANO_A - 1) or x in (0, PANO_L - 1):
                c = borda
            img.putpixel((x, y), (*c, 255))
    # Faixa fina perto da ponta solta (fica bonita com o pano tremulando).
    for y in range(1, PANO_A - 1):
        img.putpixel((PANO_L - 3, y), (*sombra, 255))
    emblema = GRAFITE if clara(cor) else CREME
    olho = tom(cor, 0.45) if not clara(cor) else tom(cor, 0.7)
    x0 = (PANO_L - len(RAPOSA[0])) // 2
    y0 = (PANO_A - len(RAPOSA)) // 2
    for j, linha in enumerate(RAPOSA):
        for i, ch in enumerate(linha):
            if ch == "X":
                img.putpixel((x0 + i, y0 + j), (*emblema, 255))
            elif ch == "O":
                img.putpixel((x0 + i, y0 + j), (*olho, 255))
    # Lados finos do pano.
    img.putpixel((30, 0), (*borda, 255))
    # Mastro: madeira com anéis dourados a cada 12 px.
    for y in range(48):
        anel = y % 12 == 0
        img.putpixel((32, y), (*(OURO if anel else MADEIRA), 255))
        img.putpixel((33, y), (*(OURO_ESCURO if anel else MADEIRA_ESCURA), 255))
    pintar_retangulo(img, 36, 0, 2, 2, MADEIRA)
    # Pé e ponta dourados.
    pintar_retangulo(img, 40, 0, 4, 2, OURO_ESCURO)
    pintar_retangulo(img, 40, 4, 4, 4, OURO)
    pintar_retangulo(img, 46, 0, 3, 3, OURO)
    img.putpixel((46, 0), (*OURO_CLARO, 255))
    return img


def icone() -> Image.Image:
    """Ícone 16x16: mastro com a bandeira laranja e a raposinha."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    laranja = CORES[0][1]
    pintar_retangulo(img, 3, 2, 1, 14, MADEIRA)
    pintar_retangulo(img, 2, 1, 3, 1, OURO)
    pintar_retangulo(img, 2, 15, 3, 1, OURO_ESCURO)
    pintar_retangulo(img, 4, 2, 10, 8, tom(laranja, 0.62))
    pintar_retangulo(img, 5, 3, 8, 6, laranja)
    for i, j in ((7, 4), (10, 4), (7, 5), (8, 5), (9, 5), (10, 5), (8, 6), (9, 6), (8, 7), (9, 7)):
        img.putpixel((i, j), (*CREME, 255))
    return img


def previa(texturas: list[Image.Image]) -> Image.Image:
    """As 12 bandeiras (pano e mastro) lado a lado, ampliadas 4x."""
    escala = 3
    larg = PANO_L + 6
    img = Image.new("RGBA", (larg * len(texturas) + 4, 56), (40, 40, 46, 255))
    for n, tex in enumerate(texturas):
        x = 4 + n * larg
        img.alpha_composite(tex.crop((46, 0, 49, 3)), (x - 1, 2))
        img.alpha_composite(tex.crop((32, 0, 34, 48)), (x, 5))
        img.alpha_composite(tex.crop((40, 0, 44, 2)), (x - 1, 52))
        img.alpha_composite(tex.crop((0, 0, PANO_L, PANO_A)), (x + 2, 7))
    return img.resize((img.width * escala, img.height * escala), Image.NEAREST)


def principal() -> int:
    parser = argparse.ArgumentParser(description="Gera as texturas da bandeira (Capture the Flag).")
    parser.add_argument("--forcar", action="store_true", help="sobrescreve também os PNGs trocados à mão")
    args = parser.parse_args()
    saidas = []
    texturas = []
    for codigo, cor in CORES:
        tex = textura(cor)
        texturas.append(tex)
        caminho = PASTA_ENTIDADES / f"bandeira_{codigo}.png"
        saidas.append((caminho, salvar_png(tex, caminho, args.forcar)))
    saidas.append((ICONE, salvar_png(icone(), ICONE, args.forcar)))
    saidas.append((PREVIA, salvar_png(previa(texturas), PREVIA, args.forcar)))
    for caminho, resultado in saidas:
        print(f"  {caminho.relative_to(ADDON).as_posix()}: {resultado}")
    print(f"{len(saidas)} PNGs prontos.")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
