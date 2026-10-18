"""Gera o modelo da Kiza Misuchi (Blockbench), versão 2: reconstrução completa.

Uso:  python kiza/gerar_kiza.py          (gera Kiza_Misuchi.bbmodel e kiza.png em kiza/saida)
Medidas: cabeça 8x8x8, corpo compacto com cintura, pernas esguias, orelhas e cauda com cubos girados (curvas suaves).
Paleta: ficha "Cores por parte" (HEX do texto) conferida com a imagem "Paletas".
"""
from __future__ import annotations

import json
import math
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
    ("Head", "Kiza_Misuchi", (0, 20.4, 0)),
    ("Hair", "Head", (0, 28.4, 0)),
    ("Ears", "Head", (0, 28.4, 0)),
    ("Body", "Kiza_Misuchi", (0, 14, 0)),
    ("Arms", "Kiza_Misuchi", (0, 19, 0)),
    ("Arm_Right", "Arms", (4.2, 18.8, 0)),
    ("Arm_Left", "Arms", (-4.2, 18.8, 0)),
    ("Legs", "Kiza_Misuchi", (0, 11, 0)),
    ("Leg_Right", "Legs", (1.8, 11, 0)),
    ("Leg_Left", "Legs", (-1.8, 11, 0)),
    ("Tail", "Kiza_Misuchi", (0, 13, 3.4)),
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
    """Rosto de anime: olhos grandes com cílios, íris em degradê, pupila e brilhos, blush, nariz e boca pequenos."""
    S = 32
    im = Image.new("RGBA", (S, S), PELE + (255,))
    px = im.load()

    def mistura(x, y, cor, a):
        if 0 <= x < S and 0 <= y < S:
            r, g, b, _ = px[x, y]
            px[x, y] = (int(r + (cor[0] - r) * a), int(g + (cor[1] - g) * a), int(b + (cor[2] - b) * a), 255)

    # sombra da franja na testa
    for y in range(0, 9):
        for x in range(S):
            mistura(x, y, PELE_S, 0.55 * (1 - y / 9))
    # contorno do rosto levemente mais escuro nas bordas
    for y in range(S):
        mistura(0, y, PELE_S, 0.45)
        mistura(S - 1, y, PELE_S, 0.45)
        mistura(1, y, PELE_S, 0.18)
        mistura(S - 2, y, PELE_S, 0.18)
    olhos = ((8.5, 19.0, -1), (23.5, 19.0, 1))  # centro x, centro y, lado (-1 = esquerda da imagem)
    for cx, cy, lado in olhos:
        rx, ry = 3.7, 5.0
        for y in range(S):
            for x in range(S):
                dx = x + 0.5 - cx
                dy = y + 0.5 - cy
                r2 = (dx / rx) ** 2 + (dy / ry) ** 2
                if r2 > 1.0:
                    continue
                t = (dy + ry) / (2 * ry)
                cor = _mix(AZ_L, AZ, t / 0.45) if t < 0.45 else _mix(AZ, AZ_D, (t - 0.45) / 0.55)
                if (dx / 1.6) ** 2 + ((dy - 0.6) / 2.6) ** 2 <= 1.0:
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
                if (x + 0.5 - (cx - 1.2)) ** 2 + (y + 0.5 - (cy - 1.6)) ** 2 <= 2.4:
                    px[x, y] = BRANCO + (255,)
                if (x + 0.5 - (cx + 1.5)) ** 2 + (y + 0.5 - (cy + 2.2)) ** 2 <= 0.9:
                    px[x, y] = BRANCO + (255,)
                if (x + 0.5 - (cx + 0.2)) ** 2 + (y + 0.5 - (cy + 3.3)) ** 2 <= 0.5:
                    px[x, y] = AZ_L + (255,)
        ox = int(cx + lado * 4.3)
        for ddx, ddy in [(0, -3), (lado, -4), (lado * 2, -4)]:
            if 0 <= ox + ddx < S:
                px[ox + ddx, int(cy) + ddy] = CILIO + (255,)
        for x in range(int(cx - 2), int(cx + 3)):
            mistura(x, int(cy + ry), CILIO, 0.55)
        for k in range(-3, 3):
            mistura(int(cx) + k - lado, int(cy - 6.6 + abs(k) * 0.1), SOBRANC, 0.8)
        for y in range(int(cy + 5), int(cy + 9)):
            for x in range(int(cx - 5), int(cx + 6)):
                d = ((x + 0.5 - cx) / 5.0) ** 2 + ((y + 0.5 - (cy + 7)) / 2.2) ** 2
                if d < 1:
                    mistura(x, y, ROSA, 0.55 * (1 - d))
    mistura(15, 24, ROSA_D, 0.55)
    mistura(16, 24, ROSA_D, 0.55)
    for x, y, a in [(13, 27, 0.7), (14, 28, 1.0), (15, 28, 1.0), (16, 28, 1.0), (17, 28, 1.0), (18, 27, 0.7), (14, 29, 0.35), (17, 29, 0.35)]:
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
    """Face da frente da orelha: miolo rosa com borda branca e sombra rosada na base."""

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


def par(nome: str, grupo_r: str, grupo_l: str, a, b, padrao=None, **faces):
    """Cria o cubo do lado direito (+X) e o espelhado do lado esquerdo."""
    c = M.cubo(nome + "_R", grupo_r, a, b, padrao, **faces)
    e = M.espelhar(c, nome + "_L", grupo_l)
    return c, e


# ============================================================================ CABEÇA
HB = 20.4  # base da cabeça
HT = HB + 8  # topo da cabeça
H = "Head"
HR = "Hair"
M.cubo("Head_Base", H, (-4, HB, -4), (4, HT, 4), pele, north=rosto_pintor).densidade("north", 4)
M.cubo("Neck", H, (-1.3, HB - 1.2, -1.3), (1.3, HB + 0.2, 1.3), pele)

# cabelo: coroa em degraus (não é uma placa), laterais em mechas e costas em camadas
M.cubo("Hair_Crown_1", HR, (-4.7, HT, -4.7), (4.7, HT + 0.7, 4.9), cabelo(1, 1.0))
M.cubo("Hair_Crown_2", HR, (-3.9, HT + 0.7, -3.9), (3.9, HT + 1.4, 4.2), cabelo(2, 1.0))
M.cubo("Hair_Crown_3", HR, (-2.6, HT + 1.4, -2.4), (2.6, HT + 1.9, 3.2), cabelo(3, 1.0))
par("Hair_Temple_A", HR, HR, (3.95, HB + 1.4, -3.4), (5.0, HT + 0.4, 0.2), cabelo(4, 0.5))
par("Hair_Temple_B", HR, HR, (3.95, HB + 0.4, 0.0), (5.2, HT + 0.2, 4.7), cabelo(5, 0.5))
par("Hair_Temple_Out_A", HR, HR, (5.0, HB + 2.4, -2.0), (5.9, HT - 0.8, 1.8), cabelo(6, 0.5))
par("Hair_Temple_Out_B", HR, HR, (5.1, HB + 0.6, 1.6), (6.1, HT - 1.2, 4.9), cabelo(7, 0.5))
M.cubo("Hair_Back_Base", HR, (-4.8, HB + 0.4, 3.9), (4.8, HT + 0.3, 5.3), cabelo(8, 0.9))
longos = [
    (-4.4, 14.2, 5.1, 1.5), (-2.9, 12.6, 5.3, 1.6), (-1.3, 13.4, 5.2, 1.6), (0.3, 12.0, 5.3, 1.6),
    (1.9, 13.0, 5.2, 1.6), (3.3, 12.4, 5.3, 1.6), (4.6, 14.0, 5.1, 1.5),
]
for i, (xc, ybase, z0, larg) in enumerate(longos):
    topo = HB + 0.8
    c = M.cubo(f"Hair_Back_Strand_{i}", HR, (xc - larg / 2, ybase, z0), (xc + larg / 2, topo, z0 + 1.2), cabelo(10 + i, 0.2))
    c.gira("z", 0.9 * xc, (xc, topo, z0))
    M.cubo(f"Hair_Back_Tip_{i}", HR, (xc - larg * 0.3, ybase - 1.4, z0 + 0.2), (xc + larg * 0.3, ybase + 0.2, z0 + 1.2), cabelo(20 + i, 0.2)).gira("z", 1.5 * xc, (xc, ybase, z0))
par("Hair_Back_Side", HR, HR, (4.9, 13.2, 2.6), (6.0, HB + 2.8, 5.2), cabelo(30, 0.3))
for i, (xc, ybase) in enumerate([(-3.6, 15.4), (-1.2, 14.6), (1.2, 15.0), (3.6, 15.6)]):
    M.cubo(f"Hair_Back_Under_{i}", HR, (xc - 1.2, ybase, 3.9), (xc + 1.2, HB + 0.8, 5.0), cabelo(40 + i, 0.2))

# franja: mechas separadas, sobrepostas, de comprimentos diferentes
bangs = [25.6, 24.9, 25.8, 25.2, 24.6, 25.4, 24.8, 25.6, 25.0, 25.9, 25.4]
for i, base_y in enumerate(bangs):
    x0 = -4.9 + i * 0.89
    z0 = -4.95 if i % 2 == 0 else -4.7
    c = M.cubo(f"Bangs_{i}", HR, (x0, base_y, z0), (x0 + 0.89, HT + 1.5, -4.05), cabelo(50 + i, 0.5))
    c.gira("z", (i - 5) * 0.8, (x0 + 0.45, HT + 1.5, z0))
for i, base_y in enumerate([26.2, 25.7, 26.4, 25.6, 26.3]):
    x0 = -4.4 + i * 1.76
    M.cubo(f"Bangs_Under_{i}", HR, (x0, base_y, -4.5), (x0 + 1.76, HT + 1.4, -3.9), cabelo(70 + i, 0.5))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 3.45, sg * 4.55))
    c = M.cubo(f"Face_Lock_{lado}", HR, (a, 14.6, -5.0), (b, 25.0, -4.35), cabelo(80 + sg, 0.4))
    c.gira("z", -sg * 1.5, ((a + b) / 2, 25.0, -5.0))
    a, b = sorted((sg * 3.2, sg * 3.85))
    M.cubo(f"Face_Lock_Inner_{lado}", HR, (a, 18.0, -4.85), (b, 23.4, -4.4), cabelo(82 + sg, 0.4))
    a, b = sorted((sg * 4.6, sg * 5.7))
    c = M.cubo(f"Face_Lock_Out_{lado}", HR, (a, 16.0, -3.6), (b, HT - 1.4, -2.6), cabelo(84 + sg, 0.4))
    c.gira("z", sg * 3.0, ((a + b) / 2, HT - 1.4, -3.1))
M.cubo("Ahoge", HR, (-0.35, HT + 1.9, -0.4), (0.35, HT + 3.1, 0.4), cabelo(90, 1.0)).gira("z", -8, (0, HT + 1.9, 0))
M.cubo("Ahoge_Curl", HR, (0.2, HT + 2.8, -0.4), (1.2, HT + 3.4, 0.4), cabelo(91, 1.0))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 6.0, sg * 6.5))
    M.cubo(f"Ribbon_{lado}", HR, (a, 18.4, -0.5), (b, 24.0, 1.3), moldura(PRETO, GRAF))
    a, b = sorted((sg * 6.0, sg * 6.7))
    M.cubo(f"Ribbon_Knot_{lado}", HR, (a, 24.0, -0.8), (b, 25.2, 1.6), moldura(PRETO, GRAF))
M.cubo("Clip_X", HR, (2.2, 26.0, -5.12), (3.9, 27.7, -5.04), vazio(), north=desenho(XIS, PAL_X))
M.cubo("Clip_Cat", HR, (-4.1, 26.4, -5.14), (-2.7, 27.8, -5.06), vazio(), north=desenho(GATO_CLIPE, PAL_GATO_CLIPE))

# orelhas de raposa: quatro camadas inclinadas para fora, miolo rosa na base
E = "Ears"
ORELHA = [
    (3.6, 3.7, HT - 0.1, HT + 1.9, -0.1),
    (3.1, 3.1, HT + 1.9, HT + 3.7, -0.1),
    (2.3, 2.3, HT + 3.7, HT + 5.1, -0.1),
    (1.4, 1.4, HT + 5.1, HT + 6.1, -0.1),
]
XC = 2.75
for i, (w, d, y0, y1, dz) in enumerate(ORELHA):
    c = M.cubo(f"Ear_R_{i}", E, (XC - w / 2, y0, dz - d / 2), (XC + w / 2, y1, dz + d / 2), pelo(100 + i, 0.3), north=orelha_frente(i < 2, 0.6 if i == 0 else 0.0))
    c.gira("z", -9, (XC, HT - 0.1, 0))
    M.espelhar(c, f"Ear_L_{i}", E)
for lado, sg in (("R", 1), ("L", -1)):
    M.cubo(f"Ear_Fluff_{lado}", E, (sg * XC - 1.0, HT - 0.1, -2.0), (sg * XC + 1.0, HT + 2.0, -1.7), pelo(110 + sg, 0.6))

# ============================================================================ CORPO (cintura definida)
B = "Body"
M.cubo("Torso_Chest", B, (-3.2, 15.8, -1.8), (3.2, 19.0, 1.8), preto)
M.cubo("Torso_Waist", B, (-2.5, 13.6, -1.5), (2.5, 15.8, 1.5), preto)
M.cubo("Torso_Hips", B, (-3.3, 11.8, -1.9), (3.3, 13.6, 1.9), preto)
M.cubo("Collar", B, (-2.4, 19.0, -2.0), (2.4, 20.8, 2.0), preto)
M.cubo("Collar_Belt", B, (-2.5, 19.9, -2.05), (2.5, 20.4, 2.05), graf)
M.cubo("Collar_Buckle", B, (-0.55, 19.85, -2.12), (0.55, 20.45, -2.06), prata)
M.cubo("Collar_Emblem", B, (-0.9, 18.8, -2.08), (0.9, 19.7, -2.02), vazio(), north=gato_em(vazio()))
M.cubo("Belt", B, (-2.8, 13.2, -1.7), (2.8, 14.1, 1.7), moldura(PRETO, PRETO_D))
M.cubo("Belt_Buckle", B, (-0.8, 13.25, -1.78), (0.8, 14.05, -1.72), prata)
M.cubo("Shorts", B, (-3.6, 10.2, -2.1), (3.6, 12.4, 2.1), preto)
M.cubo("Shorts_Flare", B, (-3.8, 10.2, -2.3), (3.8, 11.0, 2.3), moldura(PRETO, GRAF))
M.cubo("Shorts_X", B, (1.2, 10.6, -2.36), (2.3, 11.7, -2.3), vazio(), north=desenho(XIS, PAL_X_BRANCO))
M.cubo("Jacket_Shoulders", B, (-3.9, 16.6, -2.4), (3.9, 19.2, 2.4), pelo(120, 0.4, 0.8))
M.cubo("Jacket_Back", B, (-3.3, 12.4, 1.9), (3.3, 16.8, 2.8), pelo(121, 0.45, 0.8))
M.cubo("Jacket_Hem_Back", B, (-4.3, 11.4, 2.1), (4.3, 12.6, 3.3), pelo(122, 0.6, 0.9))
par("Jacket_Panel", B, B, (1.5, 12.6, -2.7), (3.5, 16.8, -1.9), pelo(123, 0.45, 0.8))
par("Jacket_Hem_Front", B, B, (1.5, 11.4, -3.3), (4.3, 12.8, -2.2), pelo(125, 0.6, 0.9))
par("Jacket_Hem_Side", B, B, (3.5, 11.4, -2.2), (4.3, 12.8, 2.2), pelo(127, 0.6, 0.9))
par("Jacket_Side", B, B, (3.2, 12.8, -1.9), (3.6, 16.8, 1.9), pelo(129, 0.45, 0.8))
M.cubo("Jacket_Hood", B, (-2.8, 17.6, 2.8), (2.8, 20.0, 3.5), pelo(131, 0.4, 0.8))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 2.2, sg * 2.9))
    M.cubo(f"Jacket_Strap_{lado}", B, (a, 12.8, -2.76), (b, 17.0, -2.7), moldura(PRETO, GRAF))
    a, b = sorted((sg * 2.1, sg * 3.0))
    M.cubo(f"Jacket_Strap_Buckle_{lado}", B, (a, 14.4, -2.8), (b, 15.4, -2.76), prata)
M.cubo("Backpack", B, (-1.9, 12.2, 3.0), (1.9, 16.6, 5.2), branco_liso)
M.cubo("Backpack_Flap", B, (-2.0, 15.2, 3.1), (2.0, 16.8, 5.3), moldura(PRETO, GRAF))
M.cubo("Backpack_Emblem", B, (-0.9, 12.8, 5.22), (0.9, 14.6, 5.28), vazio(), south=gato_em(vazio(), GATO, PAL_GATO))
M.cubo("Backpack_Strap_R", B, (1.0, 12.4, 2.95), (1.6, 16.4, 3.02), moldura(PRETO, GRAF))
M.cubo("Backpack_Strap_L", B, (-1.6, 12.4, 2.95), (-1.0, 16.4, 3.02), moldura(PRETO, GRAF))

# ============================================================================ BRAÇOS
for lado, sg, grupo in (("R", 1, "Arm_Right"), ("L", -1, "Arm_Left")):
    def X(a: float, b: float, sg: int = sg):
        return tuple(sorted((sg * a, sg * b)))

    x0, x1 = X(3.4, 5.2)
    M.cubo(f"Arm_{lado}", grupo, (x0, 12.6, -1.1), (x1, 18.8, 1.1), pele)
    x0, x1 = X(3.3, 5.6)
    M.cubo(f"Sleeve_Upper_{lado}", grupo, (x0, 15.6, -1.9), (x1, 19.2, 1.9), pelo(140 + sg, 0.4, 0.9))
    x0, x1 = X(3.4, 7.4)
    M.cubo(f"Sleeve_Lower_{lado}", grupo, (x0, 10.6, -2.5), (x1, 15.8, 2.5), pelo(142 + sg, 0.45, 0.9))
    x0, x1 = X(4.0, 6.8)
    M.cubo(f"Cuff_{lado}", grupo, (x0, 9.8, -1.8), (x1, 10.7, 1.8), moldura(PRETO, GRAF, GRAF))
    x0, x1 = X(4.5, 6.3)
    M.cubo(f"Hand_{lado}", grupo, (x0, 8.4, -0.9), (x1, 9.9, 0.9), pele)
    x0, x1 = X(7.4, 7.55)
    M.cubo(f"Sleeve_Strap_Side_{lado}", grupo, (x0, 11.4, -0.8), (x1, 14.6, 0.8), moldura(PRETO, GRAF))
    x0, x1 = X(4.0, 6.9)
    M.cubo(f"Sleeve_Strap_Low_{lado}", grupo, (x0, 12.6, -2.6), (x1, 13.4, -2.5), moldura(PRETO, GRAF))
    x0, x1 = X(5.0, 5.9)
    M.cubo(f"Sleeve_Buckle_{lado}", grupo, (x0, 12.65, -2.64), (x1, 13.35, -2.6), prata)

# ============================================================================ PERNAS
SOCK_BRANCA = desenho(["WWWWW", "WWWWW", "KKKKK", "WWWWW", "WWWWW", "KKKKK", "WWWWW"], {"W": CAB, "K": GRAF})
SOCK_PRETA = preto


def pintor_bota(tipo: str = "cano"):
    """Tênis robusto: cima branco com painéis pretos, língua escura, cadarços claros e bico preto."""

    def p(w: int, h: int, f: str) -> Image.Image:
        im = Image.new("RGBA", (w, h), CAB + (255,))
        px = im.load()
        d = ImageDraw.Draw(im)
        if f in ("up", "down"):
            d.rectangle((0, 0, w - 1, h - 1), fill=PRETO + (255,))
            return im
        for y in range(h):
            for x in range(w):
                if y >= h - 1:
                    px[x, y] = CAB_S + (255,)
        if tipo == "cano":
            d.rectangle((0, 0, w - 1, max(0, h // 5)), fill=PRETO + (255,))
            if f == "north":
                for y in range(h // 5 + 1, h):
                    for x in range(w // 2 - 1, w // 2 + 1):
                        px[x, y] = (PRETO if y % 2 == 0 else CAB_S) + (255,)
                for y in range(h // 5 + 2, h, 2):
                    d.line((1, y, w - 2, y), fill=CAB_D + (255,))
            else:
                x0, x1 = int(w * 0.2), int(w * 0.8)
                y0, y1 = int(h * 0.4), int(h * 0.85)
                d.rectangle((x0, y0, x1, y1), fill=PRETO + (255,))
                if x1 - x0 > 3:
                    d.line((x0 + 1, (y0 + y1) // 2, x1 - 1, (y0 + y1) // 2), fill=GRAF + (255,))
        else:
            d.rectangle((0, max(0, h - 3), w - 1, h - 1), fill=PRETO + (255,))
            if f == "north":
                d.rectangle((1, 0, w - 2, 1), fill=GRAF + (255,))
        return im

    return p


for lado, sg, grupo in (("R", 1, "Leg_Right"), ("L", -1, "Leg_Left")):
    def X(a: float, b: float, sg: int = sg):
        return tuple(sorted((sg * a, sg * b)))

    x0, x1 = X(0.35, 3.15)
    M.cubo(f"Thigh_{lado}", grupo, (x0, 8.6, -1.45), (x1, 10.8, 1.45), pele)
    x0, x1 = X(0.5, 2.95)
    M.cubo(f"Calf_{lado}", grupo, (x0, 4.6, -1.25), (x1, 8.8, 1.25), pele)
    x0, x1 = X(0.4, 3.05)
    meia = SOCK_PRETA if sg == 1 else SOCK_BRANCA
    M.cubo(f"Sock_{lado}", grupo, (x0, 4.4, -1.4), (x1, 8.8, 1.4), meia)
    if sg == 1:
        x0, x1 = X(1.0, 2.4)
        M.cubo("Sock_Heart", grupo, (x0, 6.0, -1.46), (x1, 7.2, -1.42), vazio(), north=desenho(CORACAO, PAL_CORACAO))
    x0, x1 = X(0.3, 3.2)
    gy0, gy1 = (9.0, 9.8) if sg == 1 else (9.3, 10.1)
    M.cubo(f"Garter_{lado}", grupo, (x0, gy0, -1.6), (x1, gy1, 1.6), moldura(PRETO, GRAF))
    x0, x1 = X(1.1, 2.1)
    M.cubo(f"Garter_Buckle_{lado}", grupo, (x0, gy0 + 0.05, -1.67), (x1, gy1 - 0.05, -1.6), prata)
    x0, x1 = X(0.3, 3.2)
    M.cubo(f"Boot_Shaft_{lado}", grupo, (x0, 1.4, -1.7), (x1, 5.0, 1.8), pintor_bota("cano"), up=preto)
    x0, x1 = X(0.25, 3.25)
    M.cubo(f"Boot_Toe_{lado}", grupo, (x0, 1.4, -3.2), (x1, 3.4, -1.7), pintor_bota("bico"), up=preto)
    x0, x1 = X(0.15, 3.35)
    M.cubo(f"Boot_Sole_{lado}", grupo, (x0, 0, -3.4), (x1, 1.5, 2.0), moldura(PRETO, PRETO_D, GRAF))
    x0, x1 = X(1.0, 2.2)
    M.cubo(f"Boot_Charm_{lado}", grupo, (x0, 3.7, -1.76), (x1, 4.8, -1.7), vazio(), north=desenho(GATO, PAL_GATO, fundo_pintor=preto))

# ============================================================================ CAUDA (arco macio, grossa e fofa)
T = "Tail"
N_SEG = 9
R_ARCO = 10.5
FI_FIM = 108.0  # graus de curva: sai para trás e termina apontando para baixo/trás
pontos = []
for i in range(N_SEG):
    t = i / (N_SEG - 1)
    fi = math.radians(FI_FIM * t)
    z = 3.4 + R_ARCO * math.sin(fi)
    y = 12.8 - R_ARCO * (1 - math.cos(fi)) * 0.95
    pontos.append((t, y, z, FI_FIM * t))
for i, (t, yc, zc, ang) in enumerate(pontos):
    comp = 4.6
    env = math.sin(math.pi * min(1.0, 0.12 + 0.88 * t)) ** 0.6  # estreita na base e na ponta, larga no meio
    hh = 2.5 + 2.8 * env  # espessura (na direção da curva)
    hw = 2.2 + 2.3 * env  # largura lateral
    xc = -0.6 * math.sin(math.pi * t)
    cor = pelo(150 + i, 0.5 + 0.03 * i, 0.4)
    c = M.cubo(f"Tail_{i}", T, (xc - hw, yc - hh, zc - comp / 2), (xc + hw, yc + hh, zc + comp / 2), cor)
    c.gira("x", ang, (xc, yc, zc))
    if 1 <= i <= N_SEG - 2:
        c2 = M.cubo(f"Tail_{i}_Tuft_R", T, (xc + hw - 0.4, yc - hh * 0.65, zc - comp * 0.35), (xc + hw + 1.1, yc + hh * 0.65, zc + comp * 0.5), pelo(170 + i, 0.4, 0.4))
        c2.gira("x", ang + 8, (xc + hw, yc, zc))
        c3 = M.cubo(f"Tail_{i}_Tuft_L", T, (xc - hw - 1.1, yc - hh * 0.65, zc - comp * 0.5), (xc - hw + 0.4, yc + hh * 0.65, zc + comp * 0.35), pelo(180 + i, 0.4, 0.4))
        c3.gira("x", ang - 8, (xc - hw, yc, zc))
        if i % 2 == 0:
            c4 = M.cubo(f"Tail_{i}_Tuft_Out", T, (xc - 0.9, yc + hh - 0.3, zc - comp * 0.3), (xc + 0.9, yc + hh + 0.9, zc + comp * 0.4), pelo(200 + i, 0.4, 0.4))
            c4.gira("x", ang, (xc, yc, zc))


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
