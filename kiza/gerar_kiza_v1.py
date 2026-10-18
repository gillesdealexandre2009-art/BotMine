"""Gera o modelo da Kiza Misuchi (Blockbench) a partir da ficha em C:/Users/gille/OneDrive/Desktop/Arquivos Kiza.

Uso:  python kiza/gerar_kiza.py          (gera Kiza_Misuchi.bbmodel, kiza.png e as prévias em kiza/saida)
Medidas: cabeça 8x8x8, tronco 7, pernas 13, orelhas +5 (ficha "Proporções" e "Lista de partes").
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
PELE_S = rgb("EBC4C4")
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

M = Modelo("Kiza_Misuchi")
M.grupo("Kiza_Misuchi", None, (0, 0, 0))
for nome, pai, pivo in [
    ("Head", "Kiza_Misuchi", (0, 20, 0)),
    ("Body", "Kiza_Misuchi", (0, 13, 0)),
    ("Arms", "Kiza_Misuchi", (0, 20, 0)),
    ("Arm_Right", "Arms", (5.5, 20.5, 0)),
    ("Arm_Left", "Arms", (-5.5, 20.5, 0)),
    ("Legs", "Kiza_Misuchi", (0, 11, 0)),
    ("Leg_Right", "Legs", (2, 11, 0)),
    ("Leg_Left", "Legs", (-2, 11, 0)),
    ("Tail", "Kiza_Misuchi", (0, 12, 4)),
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


# ---------------------------------------------------------------------------- desenhos
ROSTO = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..KKKKK..KKKKK..",
    "..KWBBK..KWBBK..",
    "..KBBBK..KBBBK..",
    "..KBLDK..KBLDK..",
    "..KDDDK..KDDDK..",
    "...KKK....KKK...",
    ".PP...NN.NN..PP.",
    ".......MM.......",
    "................",
]
PAL_ROSTO = {"K": CILIO, "W": BRANCO, "B": AZ, "D": AZ_D, "L": AZ_L, "P": ROSA, "N": ROSA, "M": BOCA, ".": None}
rosto = desenho(ROSTO, PAL_ROSTO, fundo_pintor=pele)

GATO = [
    "W.....W",
    "WW...WW",
    "WWWWWWW",
    "WKWWWKW",
    "WWWPWWW",
    ".WWWWW.",
]
PAL_GATO = {"W": BRANCO, "K": PRETO, "P": ROSA, ".": None}
GATO_CLIPE = [
    "G.....G",
    "GW...WG",
    "GWWWWWG",
    "GWKWKWG",
    "GWWPWWG",
    ".GGGGG.",
]
PAL_GATO_CLIPE = {"W": BRANCO, "K": PRETO, "P": ROSA, "G": CAB_D, ".": None}
XIS = ["K...K", ".K.K.", "..K..", ".K.K.", "K...K"]
PAL_X = {"K": PRETO, ".": None}
PAL_X_BRANCO = {"K": BRANCO, ".": None}
CORACAO = ["PP.PP", "PPPPP", ".PPP.", "..P.."]
PAL_CORACAO = {"P": PRATA, ".": None}


def gato_em(fundo, mapa=GATO, pal=PAL_GATO):
    return desenho(mapa, pal, fundo_pintor=fundo)


def orelha_frente(rim: bool = True, cobertura: float = 1.0):
    """Face da frente da orelha: miolo rosa com borda branca e sombra rosada no fundo."""

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


# ============================================================================ CABEÇA
# Proporção "fofa" da ficha: cabeça grande (8x8x8), corpo pequeno e esguio, pernas finas, mangas em balão.
HB = 18.6  # base da cabeça
HT = HB + 8  # topo da cabeça
H = "Head"
M.cubo("Head_Base", H, (-4, HB, -4), (4, HT, 4), pele, north=rosto)
M.cubo("Neck", H, (-1.3, HB - 1.0, -1.3), (1.3, HB + 0.2, 1.3), pele)

# cabelo: topo, laterais e costas, longo e solto
M.cubo("Hair_Top", H, (-4.8, HT, -4.8), (4.8, HT + 1.3, 5.0), cabelo(1, 1.0))
M.cubo("Hair_Side_R", H, (4, HB + 1.2, -2.8), (5.0, HT + 0.2, 4.4), cabelo(2, 0.55))
M.cubo("Hair_Side_L", H, (-5.0, HB + 1.2, -2.8), (-4, HT + 0.2, 4.4), cabelo(3, 0.55))
M.cubo("Hair_Side_Out_R", H, (5.0, HB + 2.6, -2.0), (5.8, HT - 0.4, 3.8), cabelo(6, 0.5))
M.cubo("Hair_Side_Out_L", H, (-5.8, HB + 2.6, -2.0), (-5.0, HT - 0.4, 3.8), cabelo(7, 0.5))
M.cubo("Hair_Back_Top", H, (-4.8, HB + 2, 3.9), (4.8, HT + 0.2, 5.3), cabelo(4, 0.8))
M.cubo("Hair_Back_Mid", H, (-5.0, HB - 3.0, 4.2), (5.0, HB + 2.2, 5.6), cabelo(5, 0.35))
fundos = [13.2, 12.4, 13.6, 12.2, 13.0, 13.4]
for i in range(6):
    x0 = -5.1 + i * 1.7
    M.cubo(f"Hair_Back_Strand_{i}", H, (x0, fundos[i], 4.7), (x0 + 1.7, HB - 2.6, 6.0), cabelo(10 + i, 0.15))
M.cubo("Hair_Back_Side_R", H, (5.0, 12.6, 2.8), (5.9, HB + 2.6, 5.4), cabelo(20, 0.25))
M.cubo("Hair_Back_Side_L", H, (-5.9, 12.6, 2.8), (-5.0, HB + 2.6, 5.4), cabelo(21, 0.25))

# franja: mechas irregulares que quase chegam aos olhos
bangs = [24.3, 25.0, 23.9, 24.7, 24.0, 24.9, 23.8, 25.0, 24.3]
for i, base_y in enumerate(bangs):
    x0 = -5.0 + i * 1.1111
    z0 = -4.95 if i % 2 == 0 else -4.7
    M.cubo(f"Bangs_{i}", H, (x0, base_y, z0), (x0 + 1.1111, HT + 1.5, -4.05), cabelo(30 + i, 0.45))
# mechas que emolduram o rosto (finas, descem até o peito)
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 3.3, sg * 4.6))
    M.cubo(f"Face_Lock_{lado}", H, (a, 13.0, -5.0), (b, 24.6, -4.3), cabelo(40 + sg, 0.4))
    a, b = sorted((sg * 3.3, sg * 3.9))
    M.cubo(f"Face_Lock_Inner_{lado}", H, (a, 16.0, -4.85), (b, 21.4, -4.4), cabelo(42 + sg, 0.4))
    a, b = sorted((sg * 4.6, sg * 5.8))
    M.cubo(f"Face_Lock_Out_{lado}", H, (a, 14.0, -3.5), (b, HT - 1.2, -2.5), cabelo(44 + sg, 0.4))
# ahoge
M.cubo("Ahoge", H, (-0.4, HT + 1.3, -0.4), (0.4, HT + 2.5, 0.4), cabelo(50, 1.0))
M.cubo("Ahoge_Curl", H, (0.4, HT + 2.0, -0.4), (1.3, HT + 2.7, 0.4), cabelo(51, 1.0))
# laços pretos ao lado das orelhas
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 5.9, sg * 6.4))
    M.cubo(f"Ribbon_{lado}", H, (a, 17.6, -0.5), (b, 23.0, 1.3), moldura(PRETO, GRAF))
    a, b = sorted((sg * 5.9, sg * 6.6))
    M.cubo(f"Ribbon_Knot_{lado}", H, (a, 23.0, -0.8), (b, 24.2, 1.6), moldura(PRETO, GRAF))
# acessórios: grampo em X (lado esquerdo da imagem de frente = +X) e enfeite de gatinho (lado direito)
M.cubo("Clip_X", H, (2.3, 24.9, -5.12), (4.0, 26.6, -5.04), vazio(), north=desenho(XIS, PAL_X))
M.cubo("Clip_Cat", H, (-4.1, 25.3, -5.14), (-2.7, 26.7, -5.06), vazio(), north=desenho(GATO_CLIPE, PAL_GATO_CLIPE))
# orelhas de raposa: altas, escalonadas, com miolo rosa na base
ORELHA = [
    ((0.8, HT - 0.1, -2.0), (4.4, HT + 1.9, 1.7)),
    ((1.2, HT + 1.9, -1.7), (4.3, HT + 3.7, 1.3)),
    ((1.7, HT + 3.7, -1.3), (4.0, HT + 5.1, 0.8)),
    ((2.2, HT + 5.1, -0.9), (3.6, HT + 6.1, 0.4)),
]
for i, (a, b) in enumerate(ORELHA):
    c = M.cubo(f"Ear_R_{i}", H, a, b, pelo(60 + i, 0.3), north=orelha_frente(i < 2, 0.55 if i == 0 else 0.0))
    M.espelhar(c, f"Ear_L_{i}", H)
M.cubo("Ear_Fluff_R", H, (1.6, HT - 0.1, -2.3), (3.8, HT + 2.2, -2.0), pelo(70, 0.6))
M.cubo("Ear_Fluff_L", H, (-3.8, HT - 0.1, -2.3), (-1.6, HT + 2.2, -2.0), pelo(71, 0.6))

# ============================================================================ CORPO
B = "Body"
M.cubo("Torso_Low", B, (-3.0, 11.4, -1.7), (3.0, 15.2, 1.7), preto)
M.cubo("Torso_Chest", B, (-3.4, 15.2, -1.8), (3.4, 18.7, 1.8), preto)
M.cubo("Collar", B, (-2.6, 18.0, -2.2), (2.6, 19.7, 2.2), preto)
M.cubo("Collar_Belt", B, (-2.7, 18.8, -2.25), (2.7, 19.3, 2.25), graf)
M.cubo("Collar_Buckle", B, (-0.6, 18.75, -2.32), (0.6, 19.35, -2.26), prata)
M.cubo("Collar_Emblem", B, (-0.9, 17.7, -2.28), (0.9, 18.6, -2.22), vazio(), north=gato_em(vazio()))
M.cubo("Belt", B, (-3.6, 11.3, -2.0), (3.6, 12.2, 2.0), moldura(PRETO, PRETO_D))
M.cubo("Belt_Buckle", B, (-0.8, 11.35, -2.07), (0.8, 12.15, -2.01), prata)
M.cubo("Shorts", B, (-3.7, 9.4, -2.1), (3.7, 11.6, 2.1), preto)
M.cubo("Shorts_X", B, (1.3, 10.0, -2.16), (2.4, 11.1, -2.1), vazio(), north=desenho(XIS, PAL_X_BRANCO))
# jaqueta branca aberta na frente, curta, com barra em sino
M.cubo("Jacket_Back", B, (-4.0, 12.2, 2.0), (4.0, 18.2, 2.9), pelo(80, 0.45, 0.8))
M.cubo("Jacket_Side_R", B, (3.3, 12.2, -2.0), (4.0, 18.2, 2.0), pelo(81, 0.45, 0.8))
M.cubo("Jacket_Side_L", B, (-4.0, 12.2, -2.0), (-3.3, 18.2, 2.0), pelo(82, 0.45, 0.8))
M.cubo("Jacket_Front_R", B, (1.6, 12.2, -2.9), (4.0, 18.2, -2.0), pelo(83, 0.45, 0.8))
M.cubo("Jacket_Front_L", B, (-4.0, 12.2, -2.9), (-1.6, 18.2, -2.0), pelo(84, 0.45, 0.8))
M.cubo("Jacket_Hem_Back", B, (-4.5, 11.0, 2.2), (4.5, 12.4, 3.3), pelo(86, 0.6, 0.9))
M.cubo("Jacket_Hem_R", B, (4.0, 11.0, -2.2), (4.5, 12.4, 2.2), pelo(87, 0.6, 0.9))
M.cubo("Jacket_Hem_L", B, (-4.5, 11.0, -2.2), (-4.0, 12.4, 2.2), pelo(88, 0.6, 0.9))
M.cubo("Jacket_Hem_Front_R", B, (1.6, 11.0, -3.3), (4.5, 12.4, -2.2), pelo(89, 0.6, 0.9))
M.cubo("Jacket_Hem_Front_L", B, (-4.5, 11.0, -3.3), (-1.6, 12.4, -2.2), pelo(90, 0.6, 0.9))
M.cubo("Jacket_Hood", B, (-3.0, 17.2, 2.9), (3.0, 19.6, 3.5), pelo(85, 0.4, 0.8))
for lado, sg in (("R", 1), ("L", -1)):
    a, b = sorted((sg * 2.3, sg * 3.1))
    M.cubo(f"Jacket_Strap_{lado}", B, (a, 12.6, -2.96), (b, 17.6, -2.9), moldura(PRETO, GRAF))
    a, b = sorted((sg * 2.2, sg * 3.2))
    M.cubo(f"Jacket_Strap_Buckle_{lado}", B, (a, 14.8, -3.0), (b, 15.8, -2.96), prata)
# mochila pequena nas costas
M.cubo("Backpack", B, (-2.0, 11.8, 3.0), (2.0, 16.4, 5.4), branco_liso)
M.cubo("Backpack_Flap", B, (-2.1, 14.8, 3.1), (2.1, 16.6, 5.5), moldura(PRETO, GRAF))
M.cubo("Backpack_Emblem", B, (-1.0, 12.4, 5.42), (1.0, 14.4, 5.48), vazio(), south=gato_em(vazio(), GATO, PAL_GATO))
M.cubo("Backpack_Strap_R", B, (1.0, 12.0, 2.95), (1.7, 16.2, 3.02), moldura(PRETO, GRAF))
M.cubo("Backpack_Strap_L", B, (-1.7, 12.0, 2.95), (-1.0, 16.2, 3.02), moldura(PRETO, GRAF))

# ============================================================================ BRAÇOS
for lado, sg, grupo in (("R", 1, "Arm_Right"), ("L", -1, "Arm_Left")):
    def X(a: float, b: float, sg: int = sg):
        return tuple(sorted((sg * a, sg * b)))

    x0, x1 = X(3.6, 5.6)
    M.cubo(f"Arm_{lado}", grupo, (x0, 12.2, -1.3), (x1, 17.8, 1.3), pele)
    x0, x1 = X(3.3, 6.0)
    M.cubo(f"Sleeve_Upper_{lado}", grupo, (x0, 13.8, -2.0), (x1, 18.2, 2.0), pelo(90 + sg, 0.4, 0.9))
    x0, x1 = X(3.6, 7.8)
    M.cubo(f"Sleeve_Lower_{lado}", grupo, (x0, 9.6, -2.5), (x1, 13.8, 2.5), pelo(92 + sg, 0.45, 0.9))
    x0, x1 = X(4.4, 7.0)
    M.cubo(f"Cuff_{lado}", grupo, (x0, 9.0, -1.9), (x1, 9.8, 1.9), moldura(PRETO, GRAF, GRAF))
    x0, x1 = X(4.9, 6.7)
    M.cubo(f"Hand_{lado}", grupo, (x0, 7.7, -1.0), (x1, 9.1, 1.0), pele)
    x0, x1 = X(7.8, 7.95)
    M.cubo(f"Sleeve_Strap_Side_{lado}", grupo, (x0, 10.4, -0.8), (x1, 13.4, 0.8), moldura(PRETO, GRAF))
    x0, x1 = X(4.2, 7.2)
    M.cubo(f"Sleeve_Strap_Low_{lado}", grupo, (x0, 12.0, -2.6), (x1, 12.8, -2.5), moldura(PRETO, GRAF))
    x0, x1 = X(5.2, 6.2)
    M.cubo(f"Sleeve_Buckle_{lado}", grupo, (x0, 12.05, -2.64), (x1, 12.75, -2.6), prata)
    x0, x1 = X(3.6, 5.6)
    M.cubo(f"Sleeve_Strap_High_{lado}", grupo, (x0, 15.6, -2.06), (x1, 16.4, -2.0), moldura(PRETO, GRAF))

# ============================================================================ PERNAS
SOCK_BRANCA = desenho(
    ["WWWWW", "WWWWW", "KKKKK", "WWWWW", "WWWWW", "KKKKK", "WWWWW"],
    {"W": CAB, "K": GRAF},
)
SOCK_PRETA = preto


def pintor_bota(cor_painel, tipo: str = "cano"):
    """Tênis robusto: parte de cima branca com painéis pretos, língua escura com cadarços claros e bico preto."""

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

    x0, x1 = X(0.3, 3.1)
    M.cubo(f"Leg_{lado}", grupo, (x0, 5.0, -1.4), (x1, 10.6, 1.4), pele)
    x0, x1 = X(0.2, 3.2)
    meia = SOCK_PRETA if sg == 1 else SOCK_BRANCA
    M.cubo(f"Sock_{lado}", grupo, (x0, 4.4, -1.55), (x1, 8.6, 1.55), meia)
    if sg == 1:
        x0, x1 = X(1.0, 2.4)
        M.cubo("Sock_Heart", grupo, (x0, 6.0, -1.6), (x1, 7.2, -1.56), vazio(), north=desenho(CORACAO, PAL_CORACAO))
    x0, x1 = X(0.15, 3.25)
    gy0, gy1 = (8.8, 9.6) if sg == 1 else (9.1, 9.9)
    M.cubo(f"Garter_{lado}", grupo, (x0, gy0, -1.65), (x1, gy1, 1.65), moldura(PRETO, GRAF))
    x0, x1 = X(1.1, 2.1)
    M.cubo(f"Garter_Buckle_{lado}", grupo, (x0, gy0 + 0.05, -1.72), (x1, gy1 - 0.05, -1.65), prata)
    # bota robusta, mas menor
    x0, x1 = X(0.15, 3.25)
    M.cubo(f"Boot_Shaft_{lado}", grupo, (x0, 1.3, -1.75), (x1, 5.0, 1.85), pintor_bota(PRETO, "cano"), up=preto)
    x0, x1 = X(0.1, 3.3)
    M.cubo(f"Boot_Toe_{lado}", grupo, (x0, 1.3, -3.3), (x1, 3.4, -1.75), pintor_bota(PRETO, "bico"), up=preto)
    x0, x1 = X(0.0, 3.4)
    M.cubo(f"Boot_Sole_{lado}", grupo, (x0, 0, -3.5), (x1, 1.4, 2.1), moldura(PRETO, PRETO_D, GRAF))
    x0, x1 = X(1.0, 2.2)
    M.cubo(f"Boot_Charm_{lado}", grupo, (x0, 3.7, -1.81), (x1, 4.8, -1.75), vazio(), north=desenho(GATO, PAL_GATO, fundo_pintor=preto))

# ============================================================================ CAUDA (grande, fofa, em curva suave)
T = "Tail"
N_SEG = 9
for i in range(N_SEG):
    t = i / (N_SEG - 1)
    zc = 3.4 + 13.2 * t
    yc = 12.4 - 9.4 * (t ** 0.85) + 1.4 * max(0.0, t - 0.78) / 0.22
    xc = -1.0 * math.sin(math.pi * t)
    hh = 1.9 + 1.7 * (math.sin(math.pi * min(1.0, t * 1.05)) ** 0.7)
    hw = 1.7 + 1.9 * (math.sin(math.pi * min(1.0, t * 0.95 + 0.04)) ** 0.7)
    cor = pelo(100 + i, 0.55 + 0.03 * i, 0.4)
    M.cubo(f"Tail_{i}", T, (xc - hw, yc - hh, zc - 1.9), (xc + hw, yc + hh, zc + 1.9), cor)
    # tufos laterais deslocados: mechas de pelo que quebram a silhueta
    if 1 <= i <= N_SEG - 2:
        M.cubo(f"Tail_{i}_Tuft_R", T, (xc + hw - 0.4, yc - hh * 0.55, zc - 1.1), (xc + hw + 0.9, yc + hh * 0.55 + 0.3, zc + 2.3), pelo(120 + i, 0.4, 0.4))
        M.cubo(f"Tail_{i}_Tuft_L", T, (xc - hw - 0.9, yc - hh * 0.55 - 0.3, zc - 2.3), (xc - hw + 0.4, yc + hh * 0.55, zc + 1.1), pelo(130 + i, 0.4, 0.4))


# ---------------------------------------------------------------------------- pernas mais longas
# O corpo (cabeça, tronco, braços, cauda) sobe DY; as pernas esticam, e as botas ficam no chão.
DY = 2.2
_SOBE_CAUDA: dict[str, float] = {}
for _c in M.cubos:
    g = _c.grupo
    n = _c.nome
    dy0 = dy1 = 0.0
    if g in ("Head", "Body", "Arm_Right", "Arm_Left"):
        dy0 = dy1 = DY
    elif g == "Tail":
        base = next((v for k, v in _SOBE_CAUDA.items() if n.startswith(k)), 0.0)
        dy0 = dy1 = DY * base
    elif g.startswith("Leg"):
        if n.startswith("Leg_"):
            dy1 = DY
        elif n.startswith("Sock_Heart"):
            dy0 = dy1 = DY * 0.35
        elif n.startswith("Sock_"):
            dy1 = DY * 0.55
        elif n.startswith("Garter"):
            dy0 = dy1 = DY * 0.8
    _c.a = (_c.a[0], _c.a[1] + dy0, _c.a[2])
    _c.b = (_c.b[0], _c.b[1] + dy1, _c.b[2])


def construir() -> Modelo:
    return M


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    atlas = M.montar_atlas(256)
    atlas.save(SAIDA / "kiza.png")
    (SAIDA / "Kiza_Misuchi.bbmodel").write_text(json.dumps(M.bbmodel(), ensure_ascii=False), encoding="utf-8")
    M.folha(14).save(SAIDA / "previa_frente_lado_costas.png")
    for v in ("frente", "costas", "lado"):
        M.renderizar(v, 18).save(SAIDA / f"previa_{v}.png")
    print(f"ok: {len(M.cubos)} cubos, atlas {atlas.width}x{atlas.height}")


if __name__ == "__main__":
    main()
