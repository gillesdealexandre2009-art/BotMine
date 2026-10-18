"""Gera o modelo da Kiza Misuchi (Blockbench), versão 3: proporções de anime (jovem adulta), corpo com cintura, pernas longas.

Uso:  python kiza/gerar_kiza.py          (gera Kiza_Misuchi.bbmodel e kiza.png em kiza/saida)
Paleta: ficha "Cores por parte" (HEX do texto) conferida com a imagem "Paletas".
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_kiza import Modelo, desenho, fibras, liso, misturar, moldura, rgb, vazio  # noqa: E402

SAIDA = Path(__file__).resolve().parent / "saida"

# ---------------------------------------------------------------------------- paleta
CAB = rgb("F1EDF5")
CAB_S = rgb("D8D5E5")
CAB_D = rgb("B9B7CD")
BRANCO = rgb("FFFFFF")
PELE = rgb("F8DAD7")
PELE_S = rgb("EFC3C3")
ROSA = rgb("EBAFB5")
ROSA_D = rgb("D58F9C")
AZ = rgb("78B9F5")
AZ_D = rgb("3974BA")
AZ_L = rgb("B9D8FF")
PRETO = rgb("24232D")
PRETO_D = rgb("17161E")
GRAF = rgb("403E4B")
PRATA = rgb("777584")
CILIO = rgb("2B2638")
BOCA = rgb("9A5A66")
SOBRANC = rgb("A9A4C0")
PUPILA = rgb("1B2A5C")

M = Modelo("Kiza_Misuchi")
M.grupo("Kiza_Misuchi", None, (0, 0, 0))
for nome, pai, pivo in [
    ("Head", "Kiza_Misuchi", (0, 26.8, 0)),
    ("Face", "Head", (0, 30, -4)),
    ("Hair", "Head", (0, 34.8, 0)),
    ("Ears", "Head", (0, 34.8, 0)),
    ("Body", "Kiza_Misuchi", (0, 18, 0)),
    ("Arms", "Kiza_Misuchi", (0, 25, 0)),
    ("Arm_Right", "Arms", (3.6, 24.8, 0)),
    ("Arm_Left", "Arms", (-3.6, 24.8, 0)),
    ("Hand_Right", "Arm_Right", (5.0, 14.4, 0)),
    ("Hand_Left", "Arm_Left", (-5.0, 14.4, 0)),
    ("Legs", "Kiza_Misuchi", (0, 16.5, 0)),
    ("Leg_Right", "Legs", (1.7, 16.5, 0)),
    ("Leg_Left", "Legs", (-1.7, 16.5, 0)),
    ("Boot_Right", "Leg_Right", (1.7, 6, 0)),
    ("Boot_Left", "Leg_Left", (-1.7, 6, 0)),
    ("Tail", "Kiza_Misuchi", (0, 17.5, 3.0)),
]:
    M.grupo(nome, pai, pivo)

pele = liso(PELE)
preto = liso(PRETO)
graf = liso(GRAF)
prata = liso(PRATA)
branco_liso = liso(CAB)
CAB_MIX = misturar(CAB, CAB_S, 0.3)


def cabelo(semente: int, grad: float = 0.55, forca: float = 1.0):
    return fibras(CAB_MIX, CAB_S, CAB_D, BRANCO, semente, grad, forca)


def pelo(semente: int, grad: float = 0.35, forca: float = 1.0):
    return fibras(CAB, CAB_S, CAB_D, BRANCO, semente, grad, forca, largura_max=3)


# ---------------------------------------------------------------------------- rosto (32x32 texels)
def _mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return (int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t), int(a[2] + (b[2] - a[2]) * t))


def rosto_pintor(w: int, h: int, f: str) -> Image.Image:
    """Rosto de anime: olhos grandes com cílios, íris em degradê, pupila e brilhos, sobrancelhas, blush, nariz e boca."""
    S = 32
    im = Image.new("RGBA", (S, S), PELE + (255,))
    px = im.load()

    def mistura(x, y, cor, a):
        if 0 <= x < S and 0 <= y < S:
            r, g, b, _ = px[x, y]
            px[x, y] = (int(r + (cor[0] - r) * a), int(g + (cor[1] - g) * a), int(b + (cor[2] - b) * a), 255)

    for y in range(0, 8):
        for x in range(S):
            mistura(x, y, PELE_S, 0.5 * (1 - y / 8))
    for y in range(S):
        mistura(0, y, PELE_S, 0.45)
        mistura(S - 1, y, PELE_S, 0.45)
        mistura(1, y, PELE_S, 0.18)
        mistura(S - 2, y, PELE_S, 0.18)
    olhos = ((8.5, 19.5, -1), (23.5, 19.5, 1))
    for cx, cy, lado in olhos:
        rx, ry = 3.5, 4.8
        for y in range(S):
            for x in range(S):
                dx = x + 0.5 - cx
                dy = y + 0.5 - cy
                r2 = (dx / rx) ** 2 + (dy / ry) ** 2
                if r2 > 1.0:
                    continue
                t = (dy + ry) / (2 * ry)
                cor = _mix(AZ_L, AZ, t / 0.45) if t < 0.45 else _mix(AZ, AZ_D, (t - 0.45) / 0.55)
                if (dx / 1.5) ** 2 + ((dy - 0.6) / 2.5) ** 2 <= 1.0:
                    cor = PUPILA
                if dy > ry * 0.45 and r2 < 0.85:
                    cor = _mix(cor, AZ_L, 0.38)
                if dy < -ry * 0.55 or (r2 > 0.78 and dy < 0):
                    cor = CILIO
                if r2 > 0.8 and dy >= 0:
                    cor = _mix(cor, AZ_D, 0.55)
                px[x, y] = cor + (255,)
        for y in range(S):
            for x in range(S):
                if (x + 0.5 - (cx - 1.2)) ** 2 + (y + 0.5 - (cy - 1.6)) ** 2 <= 2.2:
                    px[x, y] = BRANCO + (255,)
                if (x + 0.5 - (cx + 1.4)) ** 2 + (y + 0.5 - (cy + 2.1)) ** 2 <= 0.9:
                    px[x, y] = BRANCO + (255,)
                if (x + 0.5 - (cx + 0.2)) ** 2 + (y + 0.5 - (cy + 3.2)) ** 2 <= 0.5:
                    px[x, y] = AZ_L + (255,)
        ox = int(cx + lado * 4.1)
        for ddx, ddy in [(0, -3), (lado, -4), (lado * 2, -4)]:
            if 0 <= ox + ddx < S:
                px[ox + ddx, int(cy) + ddy] = CILIO + (255,)
        for x in range(int(cx - 2), int(cx + 3)):
            mistura(x, int(cy + ry), CILIO, 0.55)
        for k in range(-3, 3):
            mistura(int(cx) + k - lado, int(cy - 6.4 + abs(k) * 0.12), SOBRANC, 0.85)
        for y in range(int(cy + 5), int(cy + 9)):
            for x in range(int(cx - 5), int(cx + 6)):
                d = ((x + 0.5 - cx) / 5.0) ** 2 + ((y + 0.5 - (cy + 7)) / 2.2) ** 2
                if d < 1:
                    mistura(x, y, ROSA, 0.5 * (1 - d))
    mistura(15, 25, ROSA_D, 0.5)
    mistura(16, 25, ROSA_D, 0.5)
    for x, y, a in [(14, 28, 0.6), (15, 29, 1.0), (16, 29, 1.0), (17, 28, 0.6)]:
        mistura(x, y, BOCA, a)
    if (w, h) != (S, S):
        im = im.resize((w, h), Image.NEAREST)
    return im


GATO = ["W.....W", "WW...WW", "WWWWWWW", "WKWWWKW", "WWWPWWW", ".WWWWW."]
PAL_GATO = {"W": BRANCO, "K": PRETO, "P": ROSA, ".": None}
GATO_CLIPE = ["G.....G", "GW...WG", "GWWWWWG", "GWKWKWG", "GWWPWWG", ".GGGGG."]
PAL_GATO_CLIPE = {"W": BRANCO, "K": PRETO, "P": ROSA, "G": CAB_D, ".": None}
XIS = ["K...K", ".K.K.", "..K..", ".K.K.", "K...K"]
PAL_X = {"K": PRETO, ".": None}
PAL_X_BRANCO = {"K": BRANCO, ".": None}
CORACAO = ["PP.PP", "PPPPP", ".PPP.", "..P.."]
PAL_CORACAO = {"P": PRATA, ".": None}


def gato_em(fundo, mapa=GATO, pal=PAL_GATO):
    return desenho(mapa, pal, fundo_pintor=fundo)


def orelha_frente(rim: bool = True, cobertura: float = 1.0):
    def p(w: int, h: int, f: str) -> Image.Image:
        im = Image.new("RGBA", (w, h), CAB + (255,))
        px = im.load()
        for y in range(h):
            for x in range(w):
                margem = max(1, w // 4) if rim else 0
                if x < margem or x >= w - margem:
                    continue
                t = y / max(1, h - 1)
                if cobertura <= 0 or t < 1 - cobertura:
                    continue
                cor = misturar(ROSA, ROSA_D, 0.55 * (1 - t) if t < 0.5 else 0.2)
                px[x, y] = cor + (255,)
        return im

    return p


def roupa_preta(semente: int = 0, estudes: bool = True):
    """Tecido preto ajustado com costuras de grafite (painéis), barra clara e rebites prateados."""

    def p(w: int, h: int, f: str) -> Image.Image:
        im = Image.new("RGBA", (w, h), PRETO + (255,))
        px = im.load()
        if f in ("up", "down"):
            return im
        rnd = random.Random(semente * 31 + w * 7 + h)
        costuras = [max(1, w // 4), min(w - 2, (3 * w) // 4)] if w >= 8 else []
        for x in costuras:
            for y in range(h):
                px[x, y] = GRAF + (255,)
                if estudes and y % 4 == 1 and f in ("north", "south"):
                    px[x, y] = PRATA + (255,)
        if h >= 6:
            for x in range(w):
                px[x, h - 1] = GRAF + (255,)
        if w >= 6:
            for y in range(h):
                if y % 5 == 2:
                    for x in range(w):
                        if rnd.random() < 0.08:
                            px[x, y] = GRAF + (255,)
        return im

    return p


def pele_testa(w: int, h: int, f: str) -> Image.Image:
    """Pele lisa com sombra suave da franja na testa e nas bordas."""
    im = Image.new("RGBA", (w, h), PELE + (255,))
    px = im.load()
    for y in range(h):
        for x in range(w):
            t = 0.0
            if f == "north":
                t = max(0.0, 1 - y / max(1, h * 0.34)) * 0.5
                if x == 0 or x == w - 1:
                    t = max(t, 0.3)
            if t > 0:
                px[x, y] = _mix(PELE, PELE_S, t) + (255,)
    return im


def olho_pintor(lado: int):
    """Placa do olho (relevo): íris grande em degradê, pupila, cílio superior grosso e brilho inferior. Fora do oval é transparente."""

    def p(w: int, h: int, f: str) -> Image.Image:
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        px = im.load()
        cx, cy = w / 2, h / 2 + 0.3
        rx, ry = w / 2 - 0.3, h / 2 - 0.3
        for y in range(h):
            for x in range(w):
                dx = x + 0.5 - cx
                dy = y + 0.5 - cy
                r2 = (dx / rx) ** 2 + (dy / ry) ** 2
                if r2 > 1.0:
                    continue
                t = (dy + ry) / (2 * ry)
                cor = _mix(AZ_D, AZ, t / 0.5) if t < 0.5 else _mix(AZ, AZ_L, (t - 0.5) / 0.5 * 0.9)
                # anel mais escuro na borda da íris
                if r2 > 0.72:
                    cor = _mix(cor, AZ_D, (r2 - 0.72) / 0.28 * 0.7)
                # pupila
                if (dx / (rx * 0.32)) ** 2 + ((dy - ry * 0.05) / (ry * 0.42)) ** 2 <= 1.0:
                    cor = PUPILA
                # luz de baixo
                if dy > ry * 0.35 and r2 < 0.8:
                    cor = _mix(cor, AZ_L, 0.45)
                # cílio superior grosso e contorno
                if dy < -ry * 0.62 or (r2 > 0.9 and dy < 0):
                    cor = CILIO
                px[x, y] = cor + (255,)
        # brilhos pintados (os cubinhos em relevo reforçam)
        for y in range(h):
            for x in range(w):
                if (x + 0.5 - (cx - rx * 0.32 * lado)) ** 2 + (y + 0.5 - (cy - ry * 0.28)) ** 2 <= (rx * 0.2) ** 2 + 0.5:
                    px[x, y] = BRANCO + (255,)
        return im

    return p


def blush_pintor(w: int, h: int, f: str) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            d = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2
            if d < 1:
                px[x, y] = ROSA + (int(150 * (1 - d)),)
    return im



def par(nome: str, grupo_r: str, grupo_l: str, a, b, padrao=None, **faces):
    c = M.cubo(nome + "_R", grupo_r, a, b, padrao, **faces)
    e = M.espelhar(c, nome + "_L", grupo_l)
    return c, e


# ============================================================================ CABEÇA
HB = 26.8  # base da cabeça
HT = HB + 8  # topo da cabeça (34.8)
H = "Head"
HR = "Hair"
M.cubo("Head_Base", H, (-4, HB + 1.7, -4), (4, HT, 4), pele, north=pele_testa)
M.cubo("Head_Chin", H, (-2.7, HB, -3.6), (2.7, HB + 1.7, 3.6), pele)
M.cubo("Head_Jaw_R", H, (2.7, HB + 0.6, -3.7), (3.9, HB + 1.7, 3.7), pele)
M.cubo("Head_Jaw_L", H, (-3.9, HB + 0.6, -3.7), (-2.7, HB + 1.7, 3.7), pele)
M.cubo("Neck", H, (-1.2, HB - 1.6, -1.2), (1.2, HB + 0.2, 1.2), pele)

# ---------------------------------------------------------------------------- rosto modelado em blocos
F = "Face"
EY0, EY1 = HB + 1.8, HB + 4.7  # olho: 2,9 de altura (grande e redondo)
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 0.85, sg * 3.0))
    # placa do olho em relevo (íris grande); o cílio grosso está pintado nela
    M.cubo(f"Eye_{lado}", F, (a, EY0, -4.24), (b, EY1, -4.0), vazio(), north=olho_pintor(sg)).densidade("north", 8)
    # asinha do cílio no canto externo (fina) e um tracinho no canto interno
    xo = b if sg == 1 else a
    wing = M.cubo(f"Eye_Lash_Wing_{lado}", F, (min(xo - sg * 0.1, xo + sg * 0.5), EY1 - 0.35, -4.28), (max(xo - sg * 0.1, xo + sg * 0.5), EY1 - 0.1, -4.0), preto)
    wing.gira("z", sg * -22, (xo, EY1 - 0.2, -4.15))
    # brilhos em relevo (um grande, um pequeno)
    hx = sg * 1.6
    M.cubo(f"Eye_Spark_Big_{lado}", F, (hx - 0.34, EY1 - 1.05, -4.44), (hx + 0.2, EY1 - 0.5, -4.2), liso(BRANCO))
    M.cubo(f"Eye_Spark_Small_{lado}", F, (sg * 2.45 - 0.17, EY0 + 0.5, -4.4), (sg * 2.45 + 0.17, EY0 + 0.85, -4.2), liso(BRANCO))
    # sobrancelha fina e clara, inclinada (a da direita mais levantada: expressão travessa)
    a2, b2 = sorted((sg * 1.0, sg * 2.9))
    yb = EY1 + 0.45 + (0.14 if sg == 1 else 0.0)
    brow = M.cubo(f"Brow_{lado}", F, (a2, yb, -4.1), (b2, yb + 0.16, -4.0), liso(SOBRANC))
    brow.gira("z", sg * -(7 if sg == 1 else 3), ((a2 + b2) / 2, yb, -4.05))
    # blush em placa translúcida
    a3, b3 = sorted((sg * 1.4, sg * 3.6))
    M.cubo(f"Blush_{lado}", F, (a3, HB + 1.2, -4.08), (b3, HB + 2.0, -4.0), vazio(), north=blush_pintor).densidade("north", 8)
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 2.2, sg * 3.85))
    M.cubo(f"Cheek_{lado}", F, (a, HB + 1.3, -4.1), (b, HB + 3.0, -4.0), pele)
# nariz e boca: sorrisinho de lado (canto direito mais alto)
M.cubo("Nose", F, (-0.2, HB + 1.45, -4.2), (0.2, HB + 1.8, -4.0), liso(ROSA_D))
M.cubo("Mouth_Center", F, (-0.55, HB + 0.62, -4.1), (0.55, HB + 0.88, -4.0), liso(BOCA))
M.cubo("Mouth_Corner_R", F, (0.55, HB + 0.8, -4.1), (0.95, HB + 1.12, -4.0), liso(BOCA))
M.cubo("Mouth_Corner_L", F, (-0.9, HB + 0.75, -4.1), (-0.55, HB + 1.0, -4.0), liso(BOCA))
M.cubo("Mouth_Tip_R", F, (0.95, HB + 1.05, -4.08), (1.2, HB + 1.3, -4.0), liso(BOCA))
M.cubo("Mouth_Tongue", F, (-0.2, HB + 0.5, -4.08), (0.4, HB + 0.64, -4.0), liso(ROSA))

# cabelo: coroa em degraus e mechas separadas (sem placas)
M.cubo("Hair_Crown_1", HR, (-4.6, HT, -4.6), (4.6, HT + 0.7, 4.7), cabelo(1, 1.0))
M.cubo("Hair_Crown_2", HR, (-3.8, HT + 0.7, -3.8), (3.8, HT + 1.4, 4.0), cabelo(2, 1.0))
M.cubo("Hair_Crown_3", HR, (-2.5, HT + 1.4, -2.2), (2.5, HT + 1.9, 3.0), cabelo(3, 1.0))
par("Hair_Temple_A", HR, HR, (3.95, HB + 2.0, -3.2), (4.9, HT + 0.4, 0.0), cabelo(4, 0.5))
par("Hair_Temple_B", HR, HR, (3.95, HB + 0.8, 0.2), (5.0, HT + 0.2, 4.4), cabelo(5, 0.5))
M.cubo("Hair_Back_Base", HR, (-4.6, HB + 1.6, 3.9), (4.6, HT + 0.3, 5.0), cabelo(8, 0.9))
# costas: mechas de comprimentos bem diferentes, em 2 camadas, com folgas entre elas
camada1 = [  # x do centro, base y, largura
    (-4.1, 21.6, 1.3), (-2.7, 19.8, 1.4), (-1.1, 22.4, 1.3), (0.5, 20.4, 1.5), (2.1, 23.0, 1.3), (3.5, 20.6, 1.4), (4.6, 22.2, 1.1),
]
for i, (xc, ybase, larg) in enumerate(camada1):
    topo = HB + 2.0
    c = M.cubo(f"Hair_Back_Strand_{i}", HR, (xc - larg / 2, ybase, 5.0), (xc + larg / 2, topo, 6.0), cabelo(10 + i, 0.15))
    c.gira("z", 0.8 * xc, (xc, topo, 5.0))
    M.cubo(f"Hair_Back_Tip_{i}", HR, (xc - larg * 0.28, ybase - 1.6, 5.1), (xc + larg * 0.28, ybase + 0.2, 6.0), cabelo(20 + i, 0.15)).gira("z", 1.4 * xc, (xc, ybase, 5.0))
camada2 = [(-3.3, 23.8, 1.6), (-0.4, 24.4, 1.7), (2.6, 24.0, 1.6)]
for i, (xc, ybase, larg) in enumerate(camada2):
    M.cubo(f"Hair_Back_Under_{i}", HR, (xc - larg / 2, ybase, 4.0), (xc + larg / 2, HB + 2.0, 5.0), cabelo(40 + i, 0.2))
par("Hair_Back_Side", HR, HR, (4.6, 22.0, 2.8), (5.5, HB + 3.0, 5.0), cabelo(30, 0.3))
# mechas de ombro: duas por lado, finas, caem à frente do ombro
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 4.5, sg * 5.4))
    c = M.cubo(f"Hair_Shoulder_{lado}", HR, (a, 21.4, 0.6), (b, HB + 1.2, 2.2), cabelo(60 + sg, 0.3))
    c.gira("z", sg * 3, ((a + b) / 2, HB + 1.2, 1.4))

# franja: mechas separadas e sobrepostas; o centro é mais curto (deixa ver as sobrancelhas)
desc = [4.6, 4.2, 3.0, 2.4, 2.1, 1.9, 2.1, 2.4, 3.0, 4.2, 4.6]  # quanto cada mecha desce abaixo do topo
for i, d in enumerate(desc):
    x0 = -4.9 + i * 0.89
    z0 = -4.95 if i % 2 == 0 else -4.7
    c = M.cubo(f"Bangs_{i}", HR, (x0, HT - d, z0), (x0 + 0.89, HT + 1.5, -4.05), cabelo(50 + i, 0.5))
    c.gira("z", (i - 5) * 0.8, (x0 + 0.45, HT + 1.5, z0))
for i, d in enumerate([2.0, 1.6, 1.4, 1.6, 2.0]):
    x0 = -4.4 + i * 1.76
    M.cubo(f"Bangs_Under_{i}", HR, (x0, HT - d, -4.5), (x0 + 1.76, HT + 1.4, -3.9), cabelo(70 + i, 0.5))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 3.8, sg * 4.8))
    c = M.cubo(f"Face_Lock_{lado}", HR, (a, 21.2, -5.0), (b, HT - 2.2, -4.35), cabelo(80 + sg, 0.4))
    c.gira("z", -sg * 1.5, ((a + b) / 2, HT - 2.2, -5.0))
    a, b = sorted((sg * 3.4, sg * 3.95))
    M.cubo(f"Face_Lock_Inner_{lado}", HR, (a, 24.0, -4.85), (b, HT - 3.6, -4.4), cabelo(82 + sg, 0.4))
    a, b = sorted((sg * 4.8, sg * 5.7))
    c = M.cubo(f"Face_Lock_Out_{lado}", HR, (a, 22.6, -3.6), (b, HT - 1.4, -2.6), cabelo(84 + sg, 0.4))
    c.gira("z", sg * 3.0, ((a + b) / 2, HT - 1.4, -3.1))
M.cubo("Ahoge", HR, (-0.35, HT + 1.9, -0.4), (0.35, HT + 3.1, 0.4), cabelo(90, 1.0)).gira("z", -8, (0, HT + 1.9, 0))
M.cubo("Ahoge_Curl", HR, (0.2, HT + 2.8, -0.4), (1.2, HT + 3.4, 0.4), cabelo(91, 1.0))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 5.6, sg * 6.1))
    M.cubo(f"Ribbon_{lado}", HR, (a, HB + 1.0, -0.5), (b, HT - 2.6, 1.3), moldura(PRETO, GRAF))
    a, b = sorted((sg * 5.6, sg * 6.3))
    M.cubo(f"Ribbon_Knot_{lado}", HR, (a, HT - 2.6, -0.8), (b, HT - 1.4, 1.6), moldura(PRETO, GRAF))
M.cubo("Clip_X", HR, (2.2, HT - 2.4, -5.12), (3.9, HT - 0.7, -5.04), vazio(), north=desenho(XIS, PAL_X))
M.cubo("Clip_Cat", HR, (-4.1, HT - 2.0, -5.14), (-2.7, HT - 0.6, -5.06), vazio(), north=desenho(GATO_CLIPE, PAL_GATO_CLIPE))

# orelhas de raposa
E = "Ears"
ORELHA = [
    (3.4, 3.5, HT - 0.1, HT + 1.9, -0.1),
    (2.9, 2.9, HT + 1.9, HT + 3.7, -0.1),
    (2.2, 2.2, HT + 3.7, HT + 5.1, -0.1),
    (1.3, 1.3, HT + 5.1, HT + 6.1, -0.1),
]
XC = 2.7
for i, (w, d, y0, y1, dz) in enumerate(ORELHA):
    c = M.cubo(f"Ear_R_{i}", E, (XC - w / 2, y0, dz - d / 2), (XC + w / 2, y1, dz + d / 2), pelo(100 + i, 0.3), north=orelha_frente(i < 2, 0.6 if i == 0 else 0.0))
    c.gira("z", -9, (XC, HT - 0.1, 0))
    M.espelhar(c, f"Ear_L_{i}", E)
for lado, sg in (("R", 1), ("L", -1)):
    M.cubo(f"Ear_Fluff_{lado}", E, (sg * XC - 1.0, HT - 0.1, -1.9), (sg * XC + 1.0, HT + 2.0, -1.6), pelo(110 + sg, 0.6))

# ============================================================================ CORPO (cintura bem marcada)
B = "Body"
M.cubo("Torso_Chest", B, (-2.9, 21.0, -1.7), (2.9, 24.8, 1.7), roupa_preta(1))
M.cubo("Torso_Waist", B, (-2.3, 18.4, -1.4), (2.3, 21.0, 1.4), roupa_preta(2))
M.cubo("Torso_Hips", B, (-3.1, 16.4, -1.8), (3.1, 18.4, 1.8), roupa_preta(3))
M.cubo("Collar", B, (-2.2, 24.8, -1.9), (2.2, 26.9, 1.9), roupa_preta(4, False))
M.cubo("Collar_Belt", B, (-2.3, 25.8, -1.95), (2.3, 26.4, 1.95), graf)
M.cubo("Collar_Buckle", B, (-0.5, 25.75, -2.02), (0.5, 26.45, -1.96), prata)
M.cubo("Collar_Emblem", B, (-0.9, 24.5, -1.98), (0.9, 25.6, -1.92), vazio(), north=gato_em(vazio()))
M.cubo("Corset_Lace", B, (-1.7, 21.2, -1.76), (1.7, 24.4, -1.7), moldura(PRETO, GRAF, PRATA))
M.cubo("Belt", B, (-2.6, 18.0, -1.65), (2.6, 18.9, 1.65), moldura(PRETO, PRETO_D))
M.cubo("Belt_Buckle", B, (-0.8, 18.05, -1.73), (0.8, 18.85, -1.67), prata)
M.cubo("Shorts", B, (-3.3, 14.8, -2.0), (3.3, 17.2, 2.0), roupa_preta(5))
M.cubo("Shorts_Flare", B, (-3.5, 14.8, -2.2), (3.5, 15.7, 2.2), moldura(PRETO, GRAF))
M.cubo("Shorts_X", B, (1.1, 15.4, -2.26), (2.2, 16.5, -2.2), vazio(), north=desenho(XIS, PAL_X_BRANCO))
# jaqueta branca curta e aberta: ombros estreitos, afina na cintura, barra em sino
par("Jacket_Shoulder", B, B, (1.6, 22.6, -2.1), (3.3, 25.2, 2.1), pelo(120, 0.4, 0.8))
M.cubo("Jacket_Back_Yoke", B, (-1.7, 22.6, 1.3), (1.7, 25.2, 2.1), pelo(119, 0.4, 0.8))
M.cubo("Jacket_Back", B, (-2.9, 18.0, 1.8), (2.9, 22.6, 2.6), pelo(121, 0.45, 0.8))
M.cubo("Jacket_Hem_Back", B, (-3.9, 16.8, 2.0), (3.9, 18.2, 3.0), pelo(122, 0.6, 0.9))
par("Jacket_Panel", B, B, (1.4, 18.2, -2.5), (3.0, 22.6, -1.8), pelo(123, 0.45, 0.8))
par("Jacket_Hem_Front", B, B, (1.4, 16.8, -3.0), (3.9, 18.4, -2.0), pelo(125, 0.6, 0.9))
par("Jacket_Hem_Side", B, B, (3.0, 16.8, -2.0), (3.9, 18.4, 2.0), pelo(127, 0.6, 0.9))
par("Jacket_Side", B, B, (2.9, 18.4, -1.8), (3.2, 22.6, 1.8), pelo(129, 0.45, 0.8))
M.cubo("Jacket_Hood", B, (-2.6, 23.2, 2.5), (2.6, 25.6, 3.2), pelo(131, 0.4, 0.8))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 1.9, sg * 2.5))
    M.cubo(f"Jacket_Strap_{lado}", B, (a, 18.4, -2.56), (b, 22.8, -2.5), moldura(PRETO, GRAF))
    a, b = sorted((sg * 1.8, sg * 2.6))
    M.cubo(f"Jacket_Strap_Buckle_{lado}", B, (a, 20.0, -2.6), (b, 21.0, -2.56), prata)
# mochila pequena nas costas
M.cubo("Backpack", B, (-1.8, 17.2, 2.9), (1.8, 21.6, 5.0), branco_liso)
M.cubo("Backpack_Flap", B, (-1.9, 20.2, 3.0), (1.9, 21.8, 5.1), moldura(PRETO, GRAF))
M.cubo("Backpack_Emblem", B, (-0.9, 17.8, 5.02), (0.9, 19.6, 5.08), vazio(), south=gato_em(vazio(), GATO, PAL_GATO))
M.cubo("Backpack_Strap_R", B, (0.9, 17.4, 2.85), (1.5, 21.4, 2.92), moldura(PRETO, GRAF))
M.cubo("Backpack_Strap_L", B, (-1.5, 17.4, 2.85), (-0.9, 21.4, 2.92), moldura(PRETO, GRAF))

# ============================================================================ BRAÇOS (finos; mangas em balão mais curtas)
for lado, sg, grupo, gm in (("R", 1, "Arm_Right", "Hand_Right"), ("L", -1, "Arm_Left", "Hand_Left")):
    def X(a: float, b: float, sg: int = sg):
        return tuple(sorted((sg * a, sg * b)))

    x0, x1 = X(3.1, 4.7)
    M.cubo(f"Arm_{lado}", grupo, (x0, 16.4, -0.9), (x1, 24.6, 0.9), pele)
    x0, x1 = X(3.0, 4.9)
    M.cubo(f"Sleeve_Upper_{lado}", grupo, (x0, 22.0, -1.5), (x1, 25.4, 1.5), pelo(140 + sg, 0.4, 0.9))
    x0, x1 = X(3.1, 5.9)
    M.cubo(f"Sleeve_Lower_{lado}", grupo, (x0, 16.4, -2.0), (x1, 22.2, 2.0), pelo(142 + sg, 0.45, 0.9))
    x0, x1 = X(3.5, 5.5)
    M.cubo(f"Cuff_{lado}", grupo, (x0, 15.6, -1.4), (x1, 16.5, 1.4), moldura(PRETO, GRAF, GRAF))
    x0, x1 = X(3.8, 5.2)
    M.cubo(f"Hand_{lado}", gm, (x0, 13.8, -0.7), (x1, 15.7, 0.7), pele)
    x0, x1 = X(5.9, 6.05)
    M.cubo(f"Sleeve_Strap_Side_{lado}", grupo, (x0, 17.4, -0.7), (x1, 20.6, 0.7), moldura(PRETO, GRAF))
    x0, x1 = X(3.4, 5.6)
    M.cubo(f"Sleeve_Strap_Low_{lado}", grupo, (x0, 18.2, -2.1), (x1, 19.0, -2.0), moldura(PRETO, GRAF))
    x0, x1 = X(4.1, 4.9)
    M.cubo(f"Sleeve_Buckle_{lado}", grupo, (x0, 18.25, -2.14), (x1, 18.95, -2.1), prata)

# ============================================================================ PERNAS (longas e finas) E BOTAS EM CAMADAS
SOCK_BRANCA = desenho(["WWWWW", "WWWWW", "KKKKK", "WWWWW", "WWWWW", "KKKKK", "WWWWW"], {"W": CAB, "K": GRAF})
SOCK_PRETA = preto


def bota_painel(tipo: str):
    """Camadas da bota: entressola branca, cano branco com língua e cadarços, cano alto preto com tira, bico preto."""

    def p(w: int, h: int, f: str) -> Image.Image:
        d0 = {"entressola": CAB_S, "cano": CAB, "boca": PRETO, "bico": CAB, "capa": PRETO}[tipo]
        im = Image.new("RGBA", (w, h), d0 + (255,))
        px = im.load()
        d = ImageDraw.Draw(im)
        if f in ("up", "down"):
            d.rectangle((0, 0, w - 1, h - 1), fill=(PRETO if tipo in ("boca", "capa") else CAB_S) + (255,))
            return im
        if tipo == "cano" and f == "north":
            for y in range(h):
                for x in range(w // 2 - 1, w // 2 + 1):
                    px[x, y] = (PRETO if y % 2 == 0 else CAB_S) + (255,)
            for y in range(1, h, 2):
                d.line((1, y, w - 2, y), fill=CAB_D + (255,))
        elif tipo == "cano":
            x0, x1 = int(w * 0.18), int(w * 0.82)
            d.rectangle((x0, int(h * 0.25), x1, int(h * 0.7)), fill=PRETO + (255,))
        elif tipo == "boca" and f in ("north", "east", "west"):
            d.line((0, h - 1, w - 1, h - 1), fill=GRAF + (255,))
        elif tipo == "bico":
            d.line((0, h - 1, w - 1, h - 1), fill=CAB_D + (255,))
        return im

    return p


for lado, sg, grupo, gb in (("R", 1, "Leg_Right", "Boot_Right"), ("L", -1, "Leg_Left", "Boot_Left")):
    def X(a: float, b: float, sg: int = sg):
        return tuple(sorted((sg * a, sg * b)))

    meia = SOCK_PRETA if sg == 1 else SOCK_BRANCA
    # pele (coxa e panturrilha) e meia em dois degraus: panturrilha fina, coxa um pouco mais larga
    x0, x1 = X(0.35, 3.05)
    M.cubo(f"Thigh_{lado}", grupo, (x0, 12.0, -1.45), (x1, 16.6, 1.45), pele)
    x0, x1 = X(0.5, 2.9)
    M.cubo(f"Calf_{lado}", grupo, (x0, 6.0, -1.2), (x1, 12.2, 1.2), pele)
    x0, x1 = X(0.5, 2.9)
    M.cubo(f"Sock_Low_{lado}", grupo, (x0, 6.0, -1.32), (x1, 9.6, 1.32), meia)
    x0, x1 = X(0.4, 3.0)
    M.cubo(f"Sock_Up_{lado}", grupo, (x0, 9.6, -1.5), (x1, 12.6, 1.5), meia)
    if sg == 1:
        x0, x1 = X(0.95, 2.35)
        M.cubo("Sock_Heart", grupo, (x0, 9.9, -1.56), (x1, 11.2, -1.52), vazio(), north=desenho(CORACAO, PAL_CORACAO))
    x0, x1 = X(0.3, 3.1)
    gy0, gy1 = (13.0, 13.9) if sg == 1 else (13.4, 14.3)
    M.cubo(f"Garter_{lado}", grupo, (x0, gy0, -1.6), (x1, gy1, 1.6), moldura(PRETO, GRAF))
    x0, x1 = X(1.1, 2.0)
    M.cubo(f"Garter_Buckle_{lado}", grupo, (x0, gy0 + 0.05, -1.67), (x1, gy1 - 0.05, -1.6), prata)
    # bota: sola, entressola, cano, boca preta com tira, bico, capa do bico
    x0, x1 = X(0.1, 3.3)
    M.cubo(f"Boot_Sole_{lado}", gb, (x0, 0, -3.6), (x1, 1.4, 2.1), moldura(PRETO, PRETO_D, GRAF))
    x0, x1 = X(0.15, 3.25)
    M.cubo(f"Boot_Midsole_{lado}", gb, (x0, 1.4, -3.5), (x1, 2.1, 2.0), bota_painel("entressola"), up=preto)
    x0, x1 = X(0.35, 3.05)
    M.cubo(f"Boot_Shaft_{lado}", gb, (x0, 2.1, -1.7), (x1, 5.4, 1.8), bota_painel("cano"), up=preto)
    x0, x1 = X(0.25, 3.15)
    M.cubo(f"Boot_Cuff_{lado}", gb, (x0, 5.4, -1.8), (x1, 6.4, 1.9), bota_painel("boca"), up=preto)
    x0, x1 = X(0.3, 3.1)
    M.cubo(f"Boot_Toe_{lado}", gb, (x0, 2.1, -3.3), (x1, 3.9, -1.7), bota_painel("bico"), up=preto)
    x0, x1 = X(0.35, 3.05)
    M.cubo(f"Boot_Toecap_{lado}", gb, (x0, 2.1, -3.45), (x1, 3.2, -3.2), bota_painel("capa"), up=preto)
    x0, x1 = X(1.0, 2.2)
    M.cubo(f"Boot_Strap_{lado}", gb, (x0 - 0.05, 4.2, -1.78), (x1 + 0.05, 5.0, -1.7), prata)
    M.cubo(f"Boot_Charm_{lado}", gb, (x0, 2.9, -1.76), (x1, 4.0, -1.7), vazio(), north=desenho(GATO, PAL_GATO, fundo_pintor=preto))

# ============================================================================ CAUDA (fofa: miolo fino + tufos de pelo em volta)
T = "Tail"
N_SEG = 9
R_ARCO = 11.5
FI_FIM = 100.0
rnd = random.Random(11)


def ponto_arco(t: float):
    fi = math.radians(FI_FIM * t)
    z = 3.2 + R_ARCO * math.sin(fi)
    y = 17.8 - R_ARCO * (1 - math.cos(fi)) * 0.95
    return y, z, FI_FIM * t


def raio_cauda(t: float) -> float:
    """Volume concentrado no centro (pico perto de 40%) e afinando até a ponta."""
    return (1.5 + 2.1 * (math.sin(math.pi * min(1.0, 0.08 + 0.80 * t)) ** 0.8)) * (1 - 0.45 * t ** 2)


# miolo: poucas peças finas, só para não deixar buracos
for i in range(N_SEG):
    t = i / (N_SEG - 1)
    yc, zc, ang = ponto_arco(t)
    r = raio_cauda(t) * 0.85
    xc = -0.4 * math.sin(math.pi * t)
    c = M.cubo(f"Tail_Core_{i}", T, (xc - r, yc - r, zc - 2.0), (xc + r, yc + r, zc + 2.0), pelo(150 + i, 0.55 + 0.03 * i, 0.4))
    c.gira("x", ang, (xc, yc, zc))
# tufos: cubos pequenos em volta do miolo, tamanhos e posições variados (silhueta felpuda, sem "leque")
n_tufos = 64
for k in range(n_tufos):
    t = 0.03 + 0.97 * (k / (n_tufos - 1)) + rnd.uniform(-0.015, 0.015)
    t = max(0.0, min(1.0, t))
    yc, zc, ang = ponto_arco(t)
    r = raio_cauda(t)
    th = rnd.uniform(0, 2 * math.pi)
    # deslocamento no plano da seção (x lateral e "espessura" perpendicular ao arco)
    dx = math.cos(th) * r * rnd.uniform(0.4, 0.95)
    dn = math.sin(th) * r * rnd.uniform(0.4, 0.95)
    a_r = math.radians(ang)
    # normal ao arco no plano y-z: gira (0, 1) pelo ângulo da tangente
    ny, nz = math.cos(a_r), math.sin(a_r)
    cy = yc + ny * dn
    cz = zc + nz * dn
    cx = -0.4 * math.sin(math.pi * t) + dx
    tam = rnd.uniform(2.1, 3.3) * (1 - 0.3 * t)
    cor = pelo(200 + k, 0.45 + 0.4 * (max(0.0, -dn) / max(0.1, r)), 0.5)
    c = M.cubo(f"Tail_Tuft_{k}", T, (cx - tam / 2, cy - tam / 2, cz - tam / 2), (cx + tam / 2, cy + tam / 2, cz + tam / 2), cor)
    c.gira("x", ang + rnd.uniform(-14, 14), (cx, cy, cz))
# ponta clara e afilada
yc, zc, ang = ponto_arco(1.0)
M.cubo("Tail_Tip", T, (-0.8, yc - 1.0, zc + 0.6), (0.8, yc + 1.0, zc + 2.8), pelo(260, 0.1, 0.3)).gira("x", ang, (0, yc, zc))


# ---------------------------------------------------------------------------- inflate (volume macio sem mexer no UV)
INFLA = [
    ("Hair_Crown", 0.15), ("Hair_Back_Strand", 0.12), ("Hair_Back_Tip", 0.10), ("Hair_Back_Under", 0.12), ("Hair_Back_Base", 0.1),
    ("Hair_Back_Side", 0.12), ("Hair_Temple", 0.12), ("Hair_Shoulder", 0.1), ("Bangs", 0.1), ("Face_Lock", 0.1), ("Ahoge", 0.05),
    ("Ear_R", 0.12), ("Ear_L", 0.12), ("Ear_Fluff", 0.08),
    ("Tail_Core", 0.12), ("Tail_Tuft", 0.18), ("Tail_Tip", 0.1),
    ("Sleeve_Upper", 0.18), ("Sleeve_Lower", 0.22), ("Cuff", 0.05),
    ("Jacket_Hem", 0.12), ("Jacket_Back", 0.08), ("Jacket_Shoulder", 0.12), ("Jacket_Panel", 0.08), ("Jacket_Hood", 0.1),
    ("Cheek", 0.1), ("Eye_R", 0.04), ("Eye_L", 0.04), ("Head_Chin", 0.05),
    ("Sock_Up", 0.06), ("Thigh", 0.05), ("Boot_Shaft", 0.06), ("Boot_Toe", 0.06),
]
for _c in M.cubos:
    for _prefixo, _v in INFLA:
        if _c.nome.startswith(_prefixo):
            _c.infla = _v
            break


def construir() -> Modelo:
    return M


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    atlas = M.montar_atlas(256)
    atlas.save(SAIDA / "kiza.png")
    (SAIDA / "Kiza_Misuchi.bbmodel").write_text(json.dumps(M.bbmodel(), ensure_ascii=False), encoding="utf-8")
    print(f"ok: {len(M.cubos)} cubos, atlas {atlas.width}x{atlas.height}")


if __name__ == "__main__":
    main()
