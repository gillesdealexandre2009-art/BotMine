"""Gera as texturas da bandeira do Capture the Flag (entidade vulpus:bandeira), os estilos Kitsune, os ícones e a prévia.

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
- vulpus_rp/textures/vulpus/entidades/bandeira_k_<estilo>.png (128x128): os 8 estilos Kitsune, na ordem de
  ESTILOS_BANDEIRA (cla_dados.js); o render controller escolhe pela propriedade vulpus:estilo (índice + 1).
  Mapa no comentário da seção "bandeiras Kitsune" (o pano tem 4 quadros de animação);
- vulpus_rp/textures/vulpus/ui/bandeira_<estilo>.png (16x16): ícone de cada estilo no menu do clã;
- vulpus_rp/textures/vulpus/ui/bandeira.png (16x16): ícone do botão "Marcar a bandeira";
- docs/previas/bandeiras.png: as 12 bandeiras das cores e, embaixo, os 8 estilos montados com os 4 quadros.

Desenho pixel a pixel, sem antialias. Cada PNG leva a assinatura do gerar_texturas.py; um PNG trocado à mão
não é sobrescrito sem --forcar.
"""

from __future__ import annotations

import argparse
import colorsys
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

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


# ---------------------------------------------------------------- bandeiras Kitsune (8 estilos)
#
# Textura 128x128 (o dobro da geometria 64x64: cada unidade de UV vira 2x2 px, o pano ganha detalhe).
# Mapa em unidades de UV (multiplique por 2 para o pixel):
#   pano 28x16 em quatro quadros: (0, 0), (0, 16), (0, 32) e (0, 48); borda de cada quadro em (30, 16k);
#   as caudas extras (só Nove Caudas) 9x16 em (50, 16k), lados transparentes em (60, 16k).
#   O render controller "kitsune" desenha só o pano e as caudas e troca de quadro com uv_anim (offset 1/4).
#   Fixos (render controller normal): mastro (32, 0), topo do mastro (36, 0), pé (40, 0) e (40, 4),
#   ponta (46, 0), orelhas (36, 10) frente / (37, 10) lado / (38, 10) cima / (38, 11) baixo,
#   pixel transparente (44, 10), enfeite do topo 7x7 em (36, 16), orbe 2x2 em (36, 26) e (38, 26).
# A ordem de ESTILOS é a de ESTILOS_BANDEIRA (sistemas/cla_dados.js): propriedade vulpus:estilo = índice + 1.

PASTA_UI = RP / "textures" / "vulpus" / "ui"
LADO_K = 128
QUADROS = 4
PW, PH = PANO_L * 2, PANO_A * 2  # pano de um quadro, em pixels
CW, CH = 18, 32  # caudas extras, em pixels


def misturar(a: tuple, b: tuple, t: float) -> tuple:
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def hsv(h: float, s: float, v: float) -> tuple:
    r, g, b = colorsys.hsv_to_rgb(h % 1.0, max(0.0, min(1.0, s)), max(0.0, min(1.0, v)))
    return (round(r * 255), round(g * 255), round(b * 255))


class Tela:
    """Imagem RGBA com escrita protegida pelas bordas e mistura por alfa."""
    def __init__(self, l: int, a: int, fundo: tuple | None = None) -> None:
        self.l, self.a = l, a
        self.img = Image.new("RGBA", (l, a), (*fundo, 255) if fundo else (0, 0, 0, 0))

    def por(self, x: float, y: float, cor: tuple, alfa: float = 1.0) -> None:
        x, y = int(round(x)), int(round(y))
        if not (0 <= x < self.l and 0 <= y < self.a) or alfa <= 0:
            return
        if alfa >= 1:
            self.img.putpixel((x, y), (*cor[:3], 255))
            return
        r, g, b, a = self.img.getpixel((x, y))
        if a == 0:
            self.img.putpixel((x, y), (*cor[:3], round(255 * alfa)))
            return
        self.img.putpixel((x, y), (*misturar((r, g, b), cor, alfa), a))

    def somar(self, x: int, y: int, cor: tuple, forca: float) -> None:
        """Luz somada (brilho): clareia na direção da cor."""
        if not (0 <= x < self.l and 0 <= y < self.a):
            return
        r, g, b, a = self.img.getpixel((x, y))
        novo = tuple(min(255, round(c + k * forca)) for c, k in zip((r, g, b), cor))
        self.img.putpixel((x, y), (*novo, a if a else 255))

    def ret(self, x: int, y: int, l: int, a: int, cor: tuple) -> None:
        for i in range(x, x + l):
            for j in range(y, y + a):
                self.por(i, j, cor)

    def disco(self, cx: float, cy: float, r: float, cor: tuple, alfa: float = 1.0) -> None:
        for j in range(int(cy - r - 1), int(cy + r + 2)):
            for i in range(int(cx - r - 1), int(cx + r + 2)):
                if (i - cx) ** 2 + (j - cy) ** 2 <= r * r:
                    self.por(i, j, cor, alfa)

    def linha(self, x0: float, y0: float, x1: float, y1: float, cor: tuple, alfa: float = 1.0) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n + 1):
            t = k / n
            self.por(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, cor, alfa)

    def mascara(self, padrao: list[str], x0: int, y0: int, cores: dict, escala: int = 1) -> None:
        for j, linha in enumerate(padrao):
            for i, ch in enumerate(linha):
                if ch in cores:
                    self.ret(x0 + i * escala, y0 + j * escala, escala, escala, cores[ch])


def ruido(semente: int):
    """Ruído de valor 2D suave (0..1), determinístico."""
    rnd = random.Random(semente)
    grade = [[rnd.random() for _ in range(64)] for _ in range(64)]

    def f(x: float, y: float) -> float:
        x0, y0 = math.floor(x), math.floor(y)
        tx, ty = x - x0, y - y0
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        g = lambda i, j: grade[j % 64][i % 64]  # noqa: E731
        a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * tx
        b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * tx
        return a + (b - a) * ty

    return f


def fundo(cima: tuple, baixo: tuple, perto: tuple | None = None) -> Tela:
    """Pano com degradê vertical (e, opcional, horizontal a partir do mastro)."""
    t = Tela(PW, PH)
    for y in range(PH):
        base = misturar(cima, baixo, y / (PH - 1))
        for x in range(PW):
            c = misturar(perto, base, min(1, x / (PW * 0.55))) if perto else base
            t.por(x, y, c)
    return t


def moldura(t: Tela, escura: tuple, friso: tuple) -> None:
    """Borda escura de 1 px e um friso fino por dentro (o lado do mastro também)."""
    for x in range(PW):
        t.por(x, 0, escura)
        t.por(x, PH - 1, escura)
        t.por(x, 2, friso, 0.85)
        t.por(x, PH - 3, friso, 0.85)
    for y in range(PH):
        t.por(0, y, escura)
        t.por(PW - 1, y, escura)
    for y in range(2, PH - 2):
        t.por(2, y, friso, 0.85)


RAPOSA_GRANDE = [
    "X.........X",
    "XX.......XX",
    "XWX.....XWX",
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "XOOXXXXXOOX",
    "XXXXXXXXXXX",
    ".XXXXNXXXX.",
    "..XXXXXXX..",
    "...XXXXX...",
    "....XXX....",
]


def raposa(t: Tela, x0: int, y0: int, pelo: tuple, olho: tuple, dentro: tuple | None = None, escala: int = 1) -> None:
    t.mascara(RAPOSA_GRANDE, x0, y0, {"X": pelo, "W": dentro or pelo, "O": olho, "N": olho}, escala)


# ---------------------------------------------------------------- cada estilo: pano(k), caudas(k), enfeite

def cauda(t: Tela, x0: float, y0: float, ang: float, comp: float, achata: float, curva: float, fase: float,
          contorno: tuple, corpo: tuple, ponta: tuple, grossura: float = 3.0) -> None:
    """Cauda fofa de raposa: grossa no meio, ponta redonda clara, curvando para um lado."""
    passos = int(comp * 2)
    pontos = []
    for s in range(passos + 1):
        u = s / passos
        dx = math.cos(ang) * comp * u
        dy = math.sin(ang) * comp * u * achata
        nx, ny = -math.sin(ang), math.cos(ang) * achata
        dobra = curva * u * u + math.sin(fase + u * 3.2) * 0.9 * u
        pontos.append((x0 + dx + nx * dobra, y0 + dy + ny * dobra, 0.9 + grossura * math.sin(math.pi * (0.22 + 0.72 * u)), u))
    for x, y, r, _u in pontos:
        t.disco(x, y, r + 0.9, contorno)
    for x, y, r, u in pontos:
        t.disco(x, y, r, ponta if u > 0.7 else misturar(corpo, ponta, max(0.0, (u - 0.55) / 0.15)) if u > 0.55 else corpo)


def pano_caudas(k: int) -> Tela:
    t = fundo((236, 104, 30), (176, 46, 22), (250, 150, 50))
    # Brilho em diagonal passando pelo pano (um quadro por vez).
    for y in range(PH):
        for x in range(PW):
            d = (x + y - k * 18) % 72
            if d < 5:
                t.somar(x, y, (255, 220, 160), 0.22 * (1 - abs(d - 2) / 3))
    dourado, branco, contorno = (255, 196, 120), (255, 252, 244), (150, 40, 14)
    # Nove caudas em leque atrás da raposa; as pontas balançam de quadro em quadro.
    for i in (0, 8, 1, 7, 2, 6, 3, 5, 4):
        ang = math.radians(-68 + i * 17)
        comp = 40 * (1 - 0.45 * abs(math.sin(ang)))
        cauda(t, 12, 16, ang, comp, 0.78, -2.0, k * math.pi / 2 + i, contorno, dourado, branco, 1.9)
    # Cabeça branca com contorno escuro, para destacar das caudas.
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        t.mascara(RAPOSA_GRANDE, 4 + dx, 10 + dy, {"X": contorno, "W": contorno, "O": contorno, "N": contorno})
    raposa(t, 4, 10, branco, (200, 40, 24), (255, 150, 110))
    moldura(t, (96, 22, 12), (255, 214, 110))
    return t


def caudas_caudas(k: int) -> Tela:
    t = Tela(CW, CH)
    for i, y0 in enumerate((6, 16, 26)):
        cauda(t, -1, y0, math.radians((-8, 0, 8)[i]), 17, 1.0, -1.5, k * math.pi / 2 + i * 1.3,
              (150, 40, 14), (240, 122, 40), (255, 250, 240), 2.9)
    return t


def enfeite_caudas() -> Tela:
    """Máscara de raposa (kitsune men)."""
    t = Tela(14, 14)
    mascara = [
        "W............W",
        "WW..........WW",
        "WOW........WOW",
        "WOOWWWWWWWWOOW",
        "WWWWWWWWWWWWWW",
        "WRRWWWWWWWWRRW",
        "WWKKWWWWWWKKWW",
        "WWWWRWWWWRWWWW",
        ".WWWWWWWWWWWW.",
        ".WWWWRRRRWWWW.",
        "..WWWWWWWWWW..",
        "...WWWKKWWW...",
        "....WWWWWW....",
        ".....WWWW.....",
    ]
    t.mascara(mascara, 0, 0, {"W": (255, 248, 238), "O": (240, 120, 36), "R": (220, 40, 30), "K": (40, 20, 20)})
    return t


def pano_sakura(k: int) -> Tela:
    t = fundo((255, 222, 232), (238, 150, 186))
    moldura(t, (150, 54, 96), (255, 255, 255))
    galho, flor, miolo, clara = (92, 52, 46), (255, 128, 172), (255, 226, 120), (255, 236, 244)
    # Galho atravessando o pano.
    pontos = [(4, 27), (14, 22), (24, 19), (34, 13), (44, 9), (53, 7)]
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:]):
        t.linha(x0, y0, x1, y1, galho)
        t.linha(x0, y0 + 1, x1, y1 + 1, galho)
    t.linha(24, 19, 29, 25, galho)
    t.linha(34, 13, 38, 18, galho)

    def flor5(cx: int, cy: int) -> None:
        for dx, dy in ((0, -2), (2, -1), (1, 2), (-1, 2), (-2, -1)):
            t.disco(cx + dx, cy + dy, 1.3, flor)
        t.por(cx, cy, miolo)

    for cx, cy in ((14, 20), (26, 17), (29, 25), (37, 12), (38, 19), (46, 8), (8, 25)):
        flor5(cx, cy)
    # Pétalas caindo (descem e andam para a ponta solta a cada quadro).
    rnd = random.Random(7)
    for _ in range(16):
        x0, y0 = rnd.randrange(4, PW - 4), rnd.randrange(3, PH - 3)
        x = 4 + (x0 + k * 5) % (PW - 8)
        y = 3 + (y0 + k * 7) % (PH - 6)
        t.por(x, y, clara)
        t.por(x + 1, y, flor)
    raposa(t, 42, 18, (226, 108, 150), (255, 222, 232))
    return t


def enfeite_sakura() -> Tela:
    t = Tela(14, 14)
    for dx, dy in ((0, -3.4), (3.3, -1.1), (2.0, 2.8), (-2.0, 2.8), (-3.3, -1.1)):
        t.disco(6.5 + dx, 6.5 + dy, 2.6, (255, 150, 190))
        t.disco(6.5 + dx * 1.15, 6.5 + dy * 1.15, 1.0, (255, 214, 230))
    t.disco(6.5, 6.5, 1.6, (255, 226, 120))
    t.por(6, 6, (230, 120, 60))
    return t


def pano_lunar(k: int) -> Tela:
    t = fundo((16, 20, 58), (44, 30, 92))
    moldura(t, (8, 8, 26), (206, 214, 236))
    prata, luz = (232, 238, 255), (150, 170, 230)
    cx, cy = 30, 15
    halo = (11, 12, 13, 12)[k]
    for y in range(PH):
        for x in range(PW):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if 9 < d < halo + 2:
                t.somar(x, y, luz, 0.28 * (1 - (d - 9) / (halo - 7)))
    t.disco(cx, cy, 9, prata)
    t.disco(cx + 5, cy - 3, 8.2, misturar((16, 20, 58), (44, 30, 92), 0.35))
    # Crateras leves na lua.
    for x, y in ((24, 12), (25, 19), (27, 22)):
        t.por(x, y, (196, 204, 232))
    rnd = random.Random(11)
    for i in range(18):
        x, y = rnd.randrange(5, PW - 3), rnd.randrange(4, PH - 4)
        if ((x - cx) ** 2 + (y - cy) ** 2) < 150:
            continue
        brilha = (i + k) % 4 == 0
        t.por(x, y, (255, 255, 255) if brilha else (150, 160, 210))
        if brilha:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                t.por(x + dx, y + dy, (170, 180, 230), 0.7)
    raposa(t, 6, 19, (10, 12, 34), (120, 140, 220))
    return t


def enfeite_lunar() -> Tela:
    t = Tela(14, 14)
    t.disco(6.5, 6.5, 6.2, (236, 240, 255))
    t.disco(9.3, 4.6, 5.4, (0, 0, 0))
    for y in range(14):
        for x in range(14):
            r, g, b, a = t.img.getpixel((x, y))
            if (r, g, b) == (0, 0, 0):
                t.img.putpixel((x, y), (0, 0, 0, 0))
    t.por(3, 8, (196, 204, 232))
    t.por(5, 11, (196, 204, 232))
    return t


def chama(t: Tela, cx: float, base: float, alto: float, larg: float, fase: float, cores: list[tuple], semente: int) -> None:
    """Chama em gota (fogo-fátuo ou brasa): redonda embaixo, ponta que balança em cima."""
    f = ruido(semente)
    for j in range(int(base - alto) - 1, int(base) + 2):
        u = (base - j) / alto  # 0 embaixo, 1 na ponta
        if u < -0.2 or u > 1.05:
            continue
        meia = larg * (math.sqrt(max(0.0, 1 - ((u - 0.25) / 0.8) ** 2)) if u > 0.25 else math.sqrt(max(0.0, 1 - ((0.25 - u) / 0.45) ** 2)))
        meia *= 0.85 + 0.3 * f(j * 0.3, fase)
        centro = cx + math.sin(u * 2.4 + fase) * u * larg * 0.6
        for i in range(int(centro - meia) - 1, int(centro + meia) + 2):
            d = abs(i - centro) / max(0.6, meia)
            if d > 1:
                continue
            nivel = d * 0.6 + u * 0.55
            cor = cores[0] if nivel > 0.8 else cores[1] if nivel > 0.5 else cores[2]
            t.por(i, j, cor)


def pano_espirito(k: int) -> Tela:
    t = fundo((10, 36, 60), (5, 14, 32))
    rnd = random.Random(5)
    for i in range(22):
        x, y = rnd.randrange(4, PW - 3), rnd.randrange(4, PH - 4)
        y = 4 + (y - k * 2) % (PH - 8)
        t.por(x, y, (70, 150, 230), 0.6 if (i + k) % 3 else 1.0)
    cores = [(30, 96, 236), (110, 200, 255), (232, 250, 255)]
    chamas = ((9, 27, 11, 3.0), (20, 25, 17, 4.4), (33, 27, 19, 4.9), (46, 25, 15, 4.0), (52, 14, 7, 2.0), (27, 10, 6, 1.8))
    for n, (cx, base, alto, larg) in enumerate(chamas):
        for y in range(int(base - alto), int(base) + 3):
            for x in range(int(cx - larg * 2), int(cx + larg * 2) + 1):
                d = ((x - cx) ** 2 + ((y - base + alto * 0.35) * 0.7) ** 2) ** 0.5
                if d < larg * 2.2:
                    t.somar(x, y, (40, 110, 220), 0.12 * (1 - d / (larg * 2.2)))
        chama(t, cx, base, alto, larg, k * 1.57 + n * 1.1, cores, 40 + n)
    moldura(t, (2, 8, 18), (100, 206, 255))
    return t


def enfeite_espirito() -> Tela:
    t = Tela(14, 14)
    chama(t, 6.5, 12.5, 12, 4.2, 0.8, [(40, 110, 240), (120, 206, 255), (236, 250, 255)], 3)
    return t


def pano_brasa(k: int) -> Tela:
    t = fundo((34, 8, 8), (84, 18, 10))
    moldura(t, (16, 4, 2), (255, 156, 44))
    f = ruido(21)
    for x in range(3, PW - 1):
        h = 9 + 9 * f(x * 0.22, k * 0.9) + 4 * math.sin(x * 0.5 + k * 1.7)
        for j in range(int(h)):
            y = PH - 2 - j
            u = j / max(1, h)
            cor = misturar((255, 236, 140), (255, 140, 30), u * 1.4) if u < 0.7 else misturar((255, 140, 30), (190, 34, 18), (u - 0.7) / 0.3)
            t.por(x, y, cor)
    rnd = random.Random(9)
    for _ in range(14):
        x, y = rnd.randrange(4, PW - 3), rnd.randrange(3, PH - 10)
        y = 3 + (y - k * 4) % (PH - 12)
        t.por(x, y, (255, 200, 80))
    raposa(t, 22, 10, (28, 6, 4), (255, 190, 60))
    return t


def enfeite_brasa() -> Tela:
    t = Tela(14, 14)
    chama(t, 6.5, 12.5, 12, 4.6, 2.1, [(210, 40, 20), (255, 140, 30), (255, 236, 140)], 8)
    return t


def pano_aurora(k: int) -> Tela:
    t = fundo((6, 10, 32), (14, 30, 52))
    rnd = random.Random(3)
    for _ in range(14):
        t.por(rnd.randrange(4, PW - 3), rnd.randrange(4, PH - 10), (200, 210, 255))
    fase = k * math.pi / 2
    for x in range(PW):
        meio = 11 + 4 * math.sin(x * 0.17 + fase) + 1.5 * math.sin(x * 0.41 - fase)
        h = 0.36 + 0.2 * math.sin(x * 0.07 + fase * 0.5) + 0.08 * k
        cor = hsv(h, 0.75, 1.0)
        for y in range(int(meio - 9), int(meio + 4)):
            u = (meio + 4 - y) / 13
            t.somar(x, y, cor, 0.95 * math.sin(math.pi * min(1, u)) ** 1.5)
    # Morro escuro com a raposa olhando o céu.
    for x in range(PW):
        alto = 4 + 2.2 * math.sin(x * 0.12 + 1)
        for j in range(int(alto)):
            t.por(x, PH - 1 - j, (8, 14, 24))
    t.mascara(RAPOSA, 40, PH - 12, {"X": (8, 14, 24), "O": (140, 255, 222)})
    moldura(t, (4, 6, 16), (140, 255, 222))
    return t


def enfeite_aurora() -> Tela:
    t = Tela(14, 14)
    for y in range(14):
        for x in range(14):
            if abs(x - 6.5) + abs(y - 6.5) * 0.8 <= 6.2:
                cor = hsv(0.38 + (y / 13) * 0.42, 0.7, 1.0)
                t.por(x, y, misturar(cor, (255, 255, 255), 0.35 if x + y < 11 else 0))
    return t


def estrela4(t: Tela, cx: int, cy: int, raio: int, cor: tuple, miolo: tuple) -> None:
    for d in range(-raio, raio + 1):
        a = 1 - abs(d) / (raio + 1)
        t.por(cx + d, cy, cor, a + 0.2)
        t.por(cx, cy + d, cor, a + 0.2)
    for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        t.por(cx + dx, cy + dy, cor, 0.6)
    t.por(cx, cy, miolo)


def pano_estelar(k: int) -> Tela:
    t = fundo((30, 12, 62), (10, 6, 30))
    f = ruido(13)
    for y in range(PH):
        for x in range(PW):
            n = f(x * 0.09, y * 0.12)
            if n > 0.55:
                t.somar(x, y, (200, 90, 200), (n - 0.55) * 0.9)
    rnd = random.Random(17)
    for i in range(34):
        x, y = rnd.randrange(4, PW - 3), rnd.randrange(4, PH - 4)
        forte = (i * 7 + k * 3) % 5 == 0
        t.por(x, y, (255, 255, 255) if forte else (150, 140, 220))
        if forte:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                t.por(x + dx, y + dy, (190, 180, 255), 0.6)
    # Constelação da raposa (orelhas, bochechas, focinho).
    pontos = [(7, 6), (10, 13), (15, 17), (20, 13), (23, 6), (19, 10), (11, 10)]
    for a, b in zip(pontos, pontos[1:] + pontos[:1]):
        t.linha(*a, *b, (130, 120, 210), 0.55)
    for x, y in pontos:
        t.por(x, y, (255, 246, 200))
    estrela4(t, 41, 15, (6, 8, 7, 8)[k], (255, 214, 90), (255, 255, 255))
    moldura(t, (8, 4, 20), (255, 214, 90))
    return t


def enfeite_estelar() -> Tela:
    t = Tela(14, 14)
    for d in range(-6, 7):
        larg = max(0, 2 - abs(d) // 2)
        for e in range(-larg, larg + 1):
            t.por(6.5 + d, 6.5 + e, (255, 210, 80))
            t.por(6.5 + e, 6.5 + d, (255, 210, 80))
    t.disco(6.5, 6.5, 1.6, (255, 250, 220))
    return t


def pano_sombra(k: int) -> Tela:
    t = fundo((22, 8, 32), (8, 4, 14))
    f = ruido(31)
    for y in range(PH):
        for x in range(PW):
            n = f((x - k * 7) * 0.11, y * 0.16) * 0.7 + f((x - k * 3) * 0.23, y * 0.3 + 5) * 0.3
            if n > 0.48:
                t.por(x, y, misturar((54, 20, 86), (118, 54, 176), (n - 0.48) * 2.2), min(1, (n - 0.48) * 3))
    brilho = (0.7, 0.85, 1.0, 0.85)[k]
    roxo = misturar((90, 30, 150), (226, 160, 255), brilho)
    # Cabeça de raposa só em contorno de fumaça (orelhas e queixo) com os olhos acesos.
    contorno = (126, 56, 190)
    for a, b in (((13, 12), (16, 3)), ((16, 3), (22, 9)), ((34, 9), (40, 3)), ((40, 3), (43, 12)),
                 ((13, 12), (15, 20)), ((43, 12), (41, 20)), ((15, 20), (28, 28)), ((41, 20), (28, 28))):
        t.linha(*a, *b, contorno, 0.75)
    olho = [
        "X.....",
        "XXXX..",
        ".XXWWX",
        "..XXX.",
    ]
    for (x0, padrao) in ((15, olho), (30, [linha[::-1] for linha in olho])):
        for y in range(9, 21):
            for x in range(x0 - 2, x0 + 14):
                d = ((x - x0 - 6) ** 2 + ((y - 15) * 1.6) ** 2) ** 0.5
                if d < 7:
                    t.somar(x, y, (150, 60, 230), 0.2 * brilho * (1 - d / 7))
        t.mascara(padrao, x0, 11, {"X": roxo, "W": (255, 244, 255)}, 2)
    t.por(28, 24, roxo)
    moldura(t, (4, 2, 8), (156, 64, 226))
    return t


def enfeite_sombra() -> Tela:
    t = Tela(14, 14)
    t.disco(6.5, 6.5, 6.2, (156, 70, 230))
    t.disco(6.5, 6.5, 4.9, (20, 8, 30))
    t.disco(8.2, 5.2, 4.6, (0, 0, 0))
    for y in range(14):
        for x in range(14):
            if t.img.getpixel((x, y))[:3] == (0, 0, 0):
                t.img.putpixel((x, y), (0, 0, 0, 0))
    t.ret(5, 6, 2, 2, (230, 170, 255))
    return t


def sem_caudas(_k: int) -> Tela:
    return Tela(CW, CH)


# id, nome, pano(quadro), caudas(quadro), enfeite, (mastro, mastro escuro, anel, anel escuro), (orelha, ponta, dentro), orbe
ESTILOS = [
    ("caudas", "Nove Caudas", pano_caudas, caudas_caudas, enfeite_caudas,
     ((196, 40, 30), (146, 24, 18), (255, 204, 80), (190, 130, 30)), ((240, 120, 36), (60, 24, 18), (255, 240, 220)), ((255, 220, 120), (255, 150, 40))),
    ("sakura", "Sakura", pano_sakura, sem_caudas, enfeite_sakura,
     ((236, 214, 204), (190, 160, 150), (255, 150, 190), (210, 100, 140)), ((255, 170, 200), (150, 54, 96), (255, 236, 244)), ((255, 220, 236), (255, 150, 190))),
    ("lunar", "Lunar", pano_lunar, sem_caudas, enfeite_lunar,
     ((60, 64, 94), (38, 40, 62), (214, 222, 242), (140, 150, 180)), ((206, 214, 236), (40, 44, 80), (240, 244, 255)), ((240, 244, 255), (170, 186, 236))),
    ("espirito", "Espírito", pano_espirito, sem_caudas, enfeite_espirito,
     ((36, 40, 62), (24, 26, 42), (110, 210, 255), (40, 120, 200)), ((120, 200, 255), (20, 50, 100), (220, 244, 255)), ((236, 250, 255), (90, 180, 255))),
    ("brasa", "Brasa", pano_brasa, sem_caudas, enfeite_brasa,
     ((54, 30, 26), (34, 20, 16), (255, 150, 40), (190, 80, 20)), ((220, 70, 30), (40, 10, 6), (255, 190, 90)), ((255, 236, 140), (255, 120, 30))),
    ("aurora", "Aurora", pano_aurora, sem_caudas, enfeite_aurora,
     ((40, 60, 82), (28, 40, 58), (140, 255, 220), (60, 170, 160)), ((120, 230, 200), (20, 50, 70), (220, 255, 246)), ((200, 255, 236), (120, 140, 255))),
    ("estelar", "Estelar", pano_estelar, sem_caudas, enfeite_estelar,
     ((42, 30, 72), (26, 20, 48), (255, 214, 90), (180, 130, 40)), ((255, 214, 90), (60, 40, 90), (255, 246, 210)), ((255, 252, 230), (255, 200, 70))),
    ("sombra", "Sombra", pano_sombra, sem_caudas, enfeite_sombra,
     ((32, 20, 42), (18, 12, 26), (156, 64, 226), (90, 30, 140)), ((90, 40, 130), (14, 6, 20), (200, 140, 255)), ((230, 180, 255), (140, 60, 220))),
]


def textura_kitsune(estilo: tuple) -> Image.Image:
    """Textura 128x128 de um estilo (mapa no comentário do começo da seção)."""
    _id, _nome, pano, caudas, enfeite, mastro, orelha, orbe = estilo
    img = Image.new("RGBA", (LADO_K, LADO_K), (0, 0, 0, 0))
    for k in range(QUADROS):
        quadro = pano(k).img
        img.alpha_composite(quadro, (0, 32 * k))
        borda = quadro.getpixel((0, 0))
        for i in range(2):
            for j in range(2):
                img.putpixel((60 + i, 32 * k + j), borda)
        img.alpha_composite(caudas(k).img, (100, 32 * k))
    t = Tela(LADO_K, LADO_K)
    t.img = img
    cor, escura, anel, anel_escuro = mastro
    for y in range(96):
        e_anel = y % 24 < 2
        t.ret(64, y, 2, 1, anel if e_anel else cor)
        t.ret(66, y, 2, 1, anel_escuro if e_anel else escura)
    t.ret(72, 0, 4, 4, cor)
    t.ret(80, 0, 8, 4, anel_escuro)
    t.ret(80, 8, 8, 8, anel)
    t.ret(92, 0, 6, 6, anel)
    t.ret(92, 0, 2, 2, misturar(anel, (255, 255, 255), 0.5))
    pelo, ponta, dentro = orelha
    # Orelhas: frente (72, 20) 2x4 com o miolo claro, lado (74, 20), cima (76, 20) e baixo (76, 22).
    t.ret(72, 20, 2, 4, pelo)
    t.ret(72, 20, 2, 1, ponta)
    t.por(73, 22, dentro)
    t.por(72, 23, dentro)
    t.ret(74, 20, 2, 4, pelo)
    t.ret(74, 20, 2, 1, ponta)
    t.ret(76, 20, 2, 2, ponta)
    t.ret(76, 22, 2, 2, pelo)
    img.alpha_composite(enfeite().img, (72, 32))
    claro, forte = orbe
    t.ret(72, 52, 4, 4, forte)
    t.ret(73, 53, 2, 2, claro)
    t.ret(76, 52, 4, 4, claro)
    return img


def icone_estilo(estilo: tuple) -> Image.Image:
    """Ícone 16x16 do botão de cada estilo: o enfeite do topo."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    img.alpha_composite(estilo[4]().img, (1, 1))
    return img


def vista_kitsune(tex: Image.Image, estilo: tuple, quadro: int) -> Image.Image:
    """Bandeira montada de frente (como no jogo, sem o tremular), em pixels da textura 2x."""
    img = Image.new("RGBA", (92, 130), (0, 0, 0, 0))
    base_y = 128  # pé
    x_mastro = 8
    img.alpha_composite(tex.crop((64, 0, 68, 96)), (x_mastro - 2, base_y - 96))
    img.alpha_composite(tex.crop((80, 0, 88, 4)), (x_mastro - 4, base_y - 4))
    img.alpha_composite(tex.crop((92, 0, 98, 6)), (x_mastro - 3, base_y - 102))
    orelha = tex.crop((72, 20, 74, 24))
    img.alpha_composite(orelha, (x_mastro - 3, base_y - 106))
    img.alpha_composite(orelha, (x_mastro + 1, base_y - 106))
    img.alpha_composite(tex.crop((72, 32, 86, 46)), (x_mastro - 7, base_y - 126))
    if estilo[0] in ("espirito", "brasa", "estelar"):
        img.alpha_composite(tex.crop((72, 52, 76, 56)), (x_mastro + 9, base_y - 104))
    topo_pano = base_y - 92
    img.alpha_composite(tex.crop((0, 32 * quadro, PW, 32 * quadro + PH)), (x_mastro + 2, topo_pano))
    img.alpha_composite(tex.crop((100, 32 * quadro, 100 + CW, 32 * quadro + CH)), (x_mastro + 2 + PW, topo_pano))
    return img


def previa(texturas: list[Image.Image], kitsune: list[tuple[tuple, Image.Image]]) -> Image.Image:
    """Em cima as 12 bandeiras das cores; embaixo os 8 estilos Kitsune montados, com os 4 quadros do pano."""
    larg = PANO_L + 6
    cores = Image.new("RGBA", (larg * len(texturas) + 4, 56), (40, 40, 46, 255))
    for n, tex in enumerate(texturas):
        x = 4 + n * larg
        cores.alpha_composite(tex.crop((46, 0, 49, 3)), (x - 1, 2))
        cores.alpha_composite(tex.crop((32, 0, 34, 48)), (x, 5))
        cores.alpha_composite(tex.crop((40, 0, 44, 2)), (x - 1, 52))
        cores.alpha_composite(tex.crop((0, 0, PANO_L, PANO_A)), (x + 2, 7))
    cores = cores.resize((cores.width * 4, cores.height * 4), Image.NEAREST)
    try:
        fonte = ImageFont.truetype("arial.ttf", 10)
    except OSError:  # fora do Windows: a fonte embutida do Pillow
        fonte = ImageFont.load_default()
    celula_l, celula_a = 104, 192
    colunas = 4
    linhas = (len(kitsune) + colunas - 1) // colunas
    estilos = Image.new("RGBA", (celula_l * colunas + 8, celula_a * linhas + 6), (28, 26, 36, 255))
    desenho = ImageDraw.Draw(estilos)
    for n, (estilo, tex) in enumerate(kitsune):
        x0 = 8 + (n % colunas) * celula_l
        y0 = 4 + (n // colunas) * celula_a
        desenho.text((x0, y0), estilo[1], fill=(255, 236, 214, 255), font=fonte)
        estilos.alpha_composite(vista_kitsune(tex, estilo, 0), (x0, y0 + 14))
        # Os 4 quadros do pano (a animação), pela metade, em 2x2.
        for k in range(QUADROS):
            quadro = tex.crop((0, 32 * k, PW, 32 * k + PH)).resize((PW // 2, PH // 2), Image.NEAREST)
            estilos.alpha_composite(quadro, (x0 + (k % 2) * (PW // 2 + 2), y0 + 150 + (k // 2) * (PH // 2 + 2)))
    estilos = estilos.resize((estilos.width * 4, estilos.height * 4), Image.NEAREST)
    largura = max(cores.width, estilos.width)
    img = Image.new("RGBA", (largura, cores.height + estilos.height), (28, 26, 36, 255))
    img.alpha_composite(cores, (0, 0))
    img.alpha_composite(estilos, (0, cores.height))
    return img


def principal() -> int:
    parser = argparse.ArgumentParser(description="Gera as texturas da bandeira (Capture the Flag).")
    parser.add_argument("--forcar", action="store_true", help="sobrescreve também os PNGs trocados à mão")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    saidas = []
    texturas = []
    for codigo, cor in CORES:
        tex = textura(cor)
        texturas.append(tex)
        caminho = PASTA_ENTIDADES / f"bandeira_{codigo}.png"
        saidas.append((caminho, salvar_png(tex, caminho, args.forcar)))
    kitsune = []
    for estilo in ESTILOS:
        tex = textura_kitsune(estilo)
        kitsune.append((estilo, tex))
        caminho = PASTA_ENTIDADES / f"bandeira_k_{estilo[0]}.png"
        saidas.append((caminho, salvar_png(tex, caminho, args.forcar)))
        icone_k = PASTA_UI / f"bandeira_{estilo[0]}.png"
        saidas.append((icone_k, salvar_png(icone_estilo(estilo), icone_k, args.forcar)))
    saidas.append((ICONE, salvar_png(icone(), ICONE, args.forcar)))
    saidas.append((PREVIA, salvar_png(previa(texturas, kitsune), PREVIA, args.forcar)))
    for caminho, resultado in saidas:
        print(f"  {caminho.relative_to(ADDON).as_posix()}: {resultado}")
    print(f"{len(saidas)} PNGs prontos.")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
