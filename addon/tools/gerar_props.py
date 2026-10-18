#!/usr/bin/env python3
"""Gera a textura e os modelos da moeda do Cara ou Coroa (vulpus:moeda) e dos props da feira (vulpus:prop).

Uso, a partir da pasta addon/:
    python tools/gerar_props.py

Saída:
- vulpus_rp/textures/vulpus/entidades/props.png (128x128): atlas único.
    (0, 0) cara 16x16   (16, 0) coroa 16x16   (32, 0) alvo 16x16
    placas 64x24 a partir de (0, 32) (ver PLACAS)
    amostras de cor 8x8 a partir de (64, 0), 8 por linha (ver AMOSTRAS); a "vazio" é transparente.
- vulpus_rp/models/entity/moeda.geo.json: a moeda deitada no balcão (ossos "disco" e "disco_coroa", com aro).
- vulpus_rp/models/entity/prop.geo.json: um osso por modelo de prop (ver MODELOS).
- vulpus_rp/render_controllers/moeda.render_controllers.json: o osso de cada modelo liga pela propriedade vulpus:modelo.
- vulpus_bp/entities/prop.json: faixa da propriedade vulpus:modelo.
- vulpus_bp/scripts/textos/props_modelos.js: os nomes dos modelos, na mesma ordem; depois dos estáticos vêm os animados
  (vulpus:vida, de gerar_vida.py), a partir de INDICE_PRIMEIRO_VIVO.
- docs/previas/props.png: o atlas ampliado, para conferir o desenho.
Unidades dos modelos: pixels (16 = 1 bloco), origem nos pés da entidade, a frente é o lado norte (-Z).
Para criar um prop novo: escreva uma função que devolve os cubos, acrescente em MODELOS e rode este script.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar_vida import NOMES_VIVOS  # noqa: E402

ADDON = Path(__file__).resolve().parent.parent
RP = ADDON / "vulpus_rp"
BP = ADDON / "vulpus_bp"
LARGURA, ALTURA = 128, 288

AMOSTRAS: dict[str, tuple[int, int, int, int]] = {
    "ouro": (255, 200, 60, 255),
    "ouro_esc": (200, 140, 30, 255),
    "ouro_claro": (255, 232, 150, 255),
    "madeira": (120, 78, 48, 255),
    "madeira_esc": (80, 50, 32, 255),
    "madeira_clara": (168, 118, 74, 255),
    "saco": (176, 136, 84, 255),
    "saco_esc": (124, 92, 56, 255),
    "creme": (255, 236, 205, 255),
    "laranja": (240, 120, 30, 255),
    "ferrugem": (170, 70, 25, 255),
    "ameixa": (96, 44, 74, 255),
    "vermelho": (200, 40, 30, 255),
    "branco": (250, 250, 250, 255),
    "preto": (30, 26, 34, 255),
    "vazio": (0, 0, 0, 0),
    "prata": (200, 205, 215, 255),
    "azul": (90, 140, 190, 255),
    "azul_esc": (60, 100, 150, 255),
    "rosa": (240, 150, 160, 255),
    "cinza": (130, 130, 140, 255),
    "bege": (222, 196, 150, 255),
    "verde": (80, 140, 70, 255),
    "palha": (225, 200, 100, 255),
    "xad_claro": (238, 238, 210, 255),
    "xad_escuro": (118, 150, 86, 255),
    "marfim": (255, 246, 225, 255),
    "ebano": (54, 50, 68, 255),
    # as quatro últimas vagas da linha y=24 (as placas começam em y=32): não acrescente mais amostras sem ampliar o atlas
    "areia": (238, 212, 150, 255),
    "turquesa": (50, 185, 185, 255),
    "verde_escuro": (40, 100, 55, 255),
    "coral": (245, 110, 90, 255),
}
NOMES = list(AMOSTRAS)
COR = {
    "O": AMOSTRAS["laranja"],
    "W": AMOSTRAS["creme"],
    "K": AMOSTRAS["preto"],
    "N": AMOSTRAS["ouro_esc"],
    "R": AMOSTRAS["vermelho"],
}

RAPOSA = [
    "..O......O..",
    ".OOO....OOO.",
    ".OOOO..OOOO.",
    ".OOOOOOOOOO.",
    ".OOOOOOOOOO.",
    ".OKOOOOOOKO.",
    ".OOOOOOOOOO.",
    "..OWWOOWWO..",
    "...OWWWWO...",
    "....OWWO....",
    ".....KK.....",
    "............",
]
COROA = [
    "............",
    ".N...NN...N.",
    ".NN..NN..NN.",
    ".NNN.NN.NNN.",
    ".NNNNNNNNNN.",
    ".NNNNNNNNNN.",
    ".NRNNRRNNRN.",
    ".NNNNNNNNNN.",
    ".NNNNNNNNNN.",
    "............",
    "............",
    "............",
]

# placas: (linhas de texto), na ordem das posições abaixo
PLACAS = [("CARA OU", "COROA"), ("PESCARIA",), ("TIRO AO", "ALVO"), ("TESTE DE", "FORÇA"), ("FEIRA DO", "VULPUS"), ("ROLETA",)]
POSICOES_PLACA = [(0, 32), (64, 32), (0, 56), (64, 56), (0, 80), (64, 80)]


def pos_amostra(nome: str) -> tuple[int, int]:
    i = NOMES.index(nome)
    return 64 + (i % 8) * 8, (i // 8) * 8


def disco(img: Image.Image, x0: int, desenho: list[str]) -> None:
    """Moeda redonda 16x16 em (x0, 0) com o desenho 12x12 no meio."""
    d = ImageDraw.Draw(img)
    for y in range(16):
        for x in range(16):
            r = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            if r > 7.9:
                continue
            cor = AMOSTRAS["ouro_esc"] if r >= 6.7 else AMOSTRAS["ouro"]
            if r < 6.7 and (x + y) < 9:
                cor = AMOSTRAS["ouro_claro"]
            d.point((x0 + x, y), fill=cor)
    for j, linha in enumerate(desenho):
        for i, c in enumerate(linha):
            if c in COR:
                d.point((x0 + 2 + i, 2 + j), fill=COR[c])


def alvo(img: Image.Image, x0: int) -> None:
    """Alvo 16x16 com anéis brancos e vermelhos."""
    d = ImageDraw.Draw(img)
    for y in range(16):
        for x in range(16):
            r = max(abs(x - 7.5), abs(y - 7.5))
            if r >= 7:
                cor = AMOSTRAS["preto"]
            elif r >= 5.5:
                cor = AMOSTRAS["branco"]
            elif r >= 3.5:
                cor = AMOSTRAS["vermelho"]
            elif r >= 1.5:
                cor = AMOSTRAS["branco"]
            else:
                cor = AMOSTRAS["vermelho"]
            d.point((x0 + x, y), fill=cor)


def placa(img: Image.Image, x0: int, y0: int, linhas: tuple[str, ...]) -> None:
    d = ImageDraw.Draw(img)
    d.rectangle((x0, y0, x0 + 63, y0 + 23), fill=AMOSTRAS["madeira_clara"])
    d.rectangle((x0, y0, x0 + 63, y0 + 23), outline=AMOSTRAS["madeira_esc"])
    d.rectangle((x0 + 2, y0 + 2, x0 + 61, y0 + 21), outline=AMOSTRAS["madeira"])
    try:
        fonte = ImageFont.load_default(size=9)
    except TypeError:
        fonte = ImageFont.load_default()
    # texto sem suavização: desenha numa máscara e liga só os pixels fortes
    mascara = Image.new("L", (64, 24), 0)
    dm = ImageDraw.Draw(mascara)
    ys = (1, 10) if len(linhas) == 2 else (7,)
    cedilhas = []
    for texto, y in zip(linhas, ys):
        if "Ç" in texto:  # a fonte não tem Ç: desenha C e põe a cedilha à mão
            i = texto.index("Ç")
            texto = texto.replace("Ç", "C")
            x_c = (64 - dm.textlength(texto, font=fonte)) / 2 + dm.textlength(texto[:i], font=fonte)
            cedilhas.append((int(x_c + dm.textlength("C", font=fonte) / 2), y + 10))
        largura = dm.textlength(texto, font=fonte)
        dm.text(((64 - largura) / 2, y), texto, font=fonte, fill=255)
    for y in range(24):
        for x in range(64):
            if mascara.getpixel((x, y)) > 110:
                img.putpixel((x0 + x, y0 + y), AMOSTRAS["madeira_esc"])
    for cx, cy in cedilhas:
        img.putpixel((x0 + cx, y0 + cy), AMOSTRAS["madeira_esc"])
        img.putpixel((x0 + cx - 1, y0 + cy + 1), AMOSTRAS["madeira_esc"])


# Roleta: roda vertical de 12 fatias numeradas (fatia 1 no topo, sentido horário), 96x96 em (0, 192) do atlas.
RODA_POS = (0, 192)
RODA_TAM = 96
RODA_CORES = [
    (240, 80, 50), (250, 140, 30), (250, 215, 40), (170, 220, 50), (50, 190, 90), (40, 185, 170),
    (90, 200, 235), (60, 110, 225), (80, 70, 200), (150, 70, 200), (215, 70, 190), (240, 100, 150),
]


def roda_roleta(img: Image.Image) -> None:
    x0, y0 = RODA_POS
    c = (RODA_TAM - 1) / 2
    R = RODA_TAM / 2 - 0.5
    for y in range(RODA_TAM):
        for x in range(RODA_TAM):
            dx, dy = x - c, y - c
            r = (dx * dx + dy * dy) ** 0.5
            if r > R:
                continue
            ang = (math.degrees(math.atan2(dx, -dy)) + 360) % 360
            k = int(((ang + 15) % 360) // 30)
            cor = RODA_CORES[k]
            dist_borda = (ang + 15) % 30
            if min(dist_borda, 30 - dist_borda) * math.pi / 180 * r < 0.9 and r > 8:
                cor = (255, 252, 245)
            # luz suave: mais clara perto do centro
            if r > 8:
                t = (r - 8) / (R - 8)
                cor = tuple(min(255, int(v + 28 * (1 - t))) for v in cor)
            if r > R - 3.2:
                cor = (200, 140, 30)
            elif r > R - 5.2:
                cor = (255, 232, 150)
            if r < 8:
                cor = (200, 140, 30) if r > 6 else (255, 232, 150)
            img.putpixel((x0 + x, y0 + y), cor + (255,))
    # números 1 a 12, em pé, brancos com contorno escuro
    try:
        fonte = ImageFont.load_default(size=14)
    except TypeError:
        fonte = ImageFont.load_default()
    d = ImageDraw.Draw(img)
    for k in range(12):
        ang = math.radians(30 * k)
        cx = x0 + c + math.sin(ang) * R * 0.64
        cy = y0 + c - math.cos(ang) * R * 0.64
        texto = str(k + 1)
        larg = d.textlength(texto, font=fonte)
        px, py = cx - larg / 2, cy - 7.5
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            d.text((px + ox, py + oy), texto, font=fonte, fill=(40, 30, 50, 255))
        d.text((px, py), texto, font=fonte, fill=(255, 255, 255, 255))


def textura() -> Image.Image:
    img = Image.new("RGBA", (LARGURA, ALTURA), (0, 0, 0, 0))
    disco(img, 0, RAPOSA)
    disco(img, 16, COROA)
    alvo(img, 32)
    for (x0, y0), linhas in zip(POSICOES_PLACA, PLACAS):
        placa(img, x0, y0, linhas)
    roda_roleta(img)
    d = ImageDraw.Draw(img)
    for nome, cor in AMOSTRAS.items():
        x, y = pos_amostra(nome)
        d.rectangle((x, y, x + 7, y + 7), fill=cor)
    return img


# ------------------------------------------------------------------------------------- modelos
def face_cor(nome: str) -> dict:
    x, y = pos_amostra(nome)
    return {"uv": [x, y], "uv_size": [8, 8]}


def cubo(origem: list[float], tamanho: list[float], cor: str = "ouro", **faces: dict) -> dict:
    """Cubo de uma cor só; `faces` troca o UV de faces específicas (north, south, east, west, up, down)."""
    uv = {lado: face_cor(cor) for lado in ("north", "south", "east", "west", "up", "down")}
    uv.update(faces)
    return {"origin": origem, "size": tamanho, "uv": uv}


def face_disco(x0: int) -> dict:
    return {"uv": [x0, 0], "uv_size": [16, 16]}


VAZIO = face_cor("vazio")
LADOS_FINOS = ("east", "west", "up", "down")


def celulas_do_anel(r_ext: float, r_int: float) -> list[tuple[int, int, int]]:
    """Quadradinhos 1x1 cujo centro cai entre r_int e r_ext, juntados em corridas por linha: (x, linha, largura).
    O anel fica sem frestas porque os quadradinhos vizinhos se tocam pelos lados."""
    corridas: list[tuple[int, int, int]] = []
    n = int(r_ext) + 1
    for linha in range(-n, n):
        x = -n
        while x < n:
            if r_int <= ((x + 0.5) ** 2 + (linha + 0.5) ** 2) ** 0.5 <= r_ext:
                ini_x = x
                while x < n and r_int <= ((x + 0.5) ** 2 + (linha + 0.5) ** 2) ** 0.5 <= r_ext:
                    x += 1
                corridas.append((ini_x, linha, x - ini_x))
            else:
                x += 1
    return corridas


def aro_deitado(espessura: float) -> list[dict]:
    """Aro dourado em volta da moeda deitada: fecha o vão entre a face de cima e a de baixo. As faces de cima e de
    baixo do aro são transparentes, só o lado de fora aparece."""
    topo_baixo = {"up": VAZIO, "down": VAZIO}
    return [cubo([x, 0, z], [larg, espessura, 1], "ouro_esc", **topo_baixo) for x, z, larg in celulas_do_anel(7.9, 6.7)]


def aro_em_pe(centro_y: float, meia_espessura: float) -> list[dict]:
    """Aro dourado em volta da moeda em pé (raio 8): as faces da frente e de trás são transparentes."""
    frente_tras = {"north": VAZIO, "south": VAZIO}
    return [
        cubo([x, centro_y + z, -meia_espessura], [larg, 1, 2 * meia_espessura], "ouro_esc", **frente_tras)
        for x, z, larg in celulas_do_anel(7.9, 6.7)
    ]


def geometria_moeda() -> dict:
    """Moeda deitada no balcão (a que sobe girando e cai). O osso "disco" tem a cara em cima e a coroa embaixo e é o
    que gira no voo; o osso "disco_coroa" é o mesmo disco com a coroa virada para cima (o render controller liga um
    ou o outro). Um aro dourado fecha o vão entre as duas faces."""
    t = 1.5
    transparente = {lado: VAZIO for lado in ("north", "south", "east", "west")}

    def disco_com(cima: int, baixo: int) -> list[dict]:
        return [cubo([-8, 0, -8], [16, t, 16], up=face_disco(cima), down=face_disco(baixo), **transparente)] + aro_deitado(t)

    return {
        "description": {
            "identifier": "geometry.vulpus.moeda",
            "texture_width": LARGURA,
            "texture_height": ALTURA,
            "visible_bounds_width": 2,
            "visible_bounds_height": 4,
            "visible_bounds_offset": [0, 1, 0],
        },
        "bones": [
            {"name": "disco", "pivot": [0, 0.75, 0], "cubes": disco_com(0, 16)},
            {"name": "disco_coroa", "pivot": [0, 0.75, 0], "cubes": disco_com(16, 0)},
        ],
    }


def tabua(slot: int, largura: float = 28, altura: float = 14, y: float = 14) -> dict:
    """Tábua de placa com o texto do slot nas duas faces."""
    x0, y0 = POSICOES_PLACA[slot]
    texto = {"uv": [x0, y0], "uv_size": [64, 24]}
    madeira = {lado: face_cor("madeira_esc") for lado in LADOS_FINOS}
    return {"origin": [-largura / 2, y, -0.75], "size": [largura, altura, 1.5], "uv": {"north": texto, "south": texto, **madeira}}


def placa_com_postes(slot: int, largura: float = 28) -> list[dict]:
    meio = largura / 2
    return [
        tabua(slot, largura),
        cubo([-meio + 1, 0, -0.75], [2, 14, 1.5], "madeira_esc"),
        cubo([meio - 3, 0, -0.75], [2, 14, 1.5], "madeira_esc"),
    ]


# ---- cada função devolve os cubos de um modelo
def m_pilha() -> list[dict]:
    return [
        cubo([-3, 0, -3], [6, 1.2, 6], "ouro"),
        cubo([-2.7, 1.2, -2.7], [6, 1.2, 6], "ouro_esc"),
        cubo([-3.2, 2.4, -3], [6, 1.2, 6], "ouro"),
        cubo([-3, 3.6, -2.8], [6, 1.2, 6], "ouro_claro"),
        cubo([4.5, 0, -1], [5, 1.2, 5], "ouro"),
    ]


def m_saco() -> list[dict]:
    return [
        cubo([-4, 0, -4], [8, 7, 8], "saco"),
        cubo([-3, 7, -3], [6, 2, 6], "saco_esc"),
        cubo([-1.5, 9, -1.5], [3, 1.2, 3], "ferrugem"),
        cubo([4.5, 0, -1], [4, 1.2, 4], "ouro"),
    ]


def m_bandeirinhas() -> list[dict]:
    cores = ["laranja", "creme", "ouro", "ferrugem"]
    cubos = [cubo([-24, 0, -0.25], [48, 0.5, 0.5], "madeira_esc")]
    for i in range(8):
        x = -21 + i * 6
        cor = cores[i % 4]
        cubos.append(cubo([x - 2, -3, -0.25], [4, 3, 0.5], cor))
        cubos.append(cubo([x - 1, -5, -0.25], [2, 2, 0.5], cor))
    return cubos


def m_moedao() -> list[dict]:
    """Moeda gigante em pé: duas faces coladas (sem vão) e um aro dourado sem frestas em volta."""
    transparente = {lado: VAZIO for lado in LADOS_FINOS}
    discos = [
        cubo([-8, 16, -0.8], [16, 16, 0.8], north=face_disco(0), south=VAZIO, **transparente),
        cubo([-8, 16, 0], [16, 16, 0.8], south=face_disco(16), north=VAZIO, **transparente),
    ]
    return discos + aro_em_pe(24, 0.8)


def m_boia() -> list[dict]:
    """Boia salva-vidas: anel de peças vermelhas e brancas, em pé."""
    t = 2.5
    return [
        cubo([-3, 11, -t / 2], [6, 3, t], "vermelho"),
        cubo([3, 9, -t / 2], [3.5, 3.5, t], "branco"),
        cubo([6, 4, -t / 2], [3, 5, t], "vermelho"),
        cubo([3, 0.5, -t / 2], [3.5, 3.5, t], "branco"),
        cubo([-3, 0, -t / 2], [6, 3, t], "vermelho"),
        cubo([-6.5, 0.5, -t / 2], [3.5, 3.5, t], "branco"),
        cubo([-9, 4, -t / 2], [3, 5, t], "vermelho"),
        cubo([-6.5, 9, -t / 2], [3.5, 3.5, t], "branco"),
    ]


def m_caixa_peixes() -> list[dict]:
    cubos = [cubo([-6, 0, -4], [12, 7, 8], "madeira_clara")]
    for x, z in ((-6, -4), (4.5, -4), (-6, 2.5), (4.5, 2.5)):
        cubos.append(cubo([x, 0, z], [1.5, 7.2, 1.5], "madeira_esc"))
    cubos += [
        cubo([-5, 7, -2.5], [4, 1.5, 2], "prata"),
        cubo([-1, 7, -2.5], [1.5, 2.2, 2], "azul"),
        cubo([0.5, 7, 0.5], [4, 1.5, 2], "prata"),
        cubo([4.5, 7, 0.5], [1.5, 2.2, 2], "azul_esc"),
        cubo([-3, 7, 2], [3.5, 1.5, 2], "rosa"),
    ]
    return cubos


def m_rede() -> list[dict]:
    cubos = [cubo([-10, 20, -0.5], [20, 1, 1], "madeira_esc")]
    for i in range(6):
        cubos.append(cubo([-8.75 + i * 3.5, 4, -0.25], [0.5, 16, 0.5], "bege"))
    for i in range(4):
        cubos.append(cubo([-9, 6 + i * 4, -0.25], [18, 0.5, 0.5], "bege"))
    cubos += [
        cubo([-9.5, 2.5, -0.9], [2, 2, 1.8], "vermelho"),
        cubo([7.5, 2.5, -0.9], [2, 2, 1.8], "vermelho"),
        cubo([-3, 7, -1], [4, 1.5, 2], "prata"),
        cubo([1, 7, -1], [1.5, 2, 2], "azul"),
    ]
    return cubos


def m_aljava() -> list[dict]:
    return [
        cubo([-3, 0, -2], [6, 12, 4], "ferrugem"),
        cubo([-3.2, 5.5, -2.2], [6.4, 1.5, 4.4], "madeira_esc"),
        cubo([-2, 12, -1], [0.8, 6, 0.8], "madeira_clara"),
        cubo([0.5, 12, 0], [0.8, 7, 0.8], "madeira_clara"),
        cubo([-0.8, 12, 0.6], [0.8, 5, 0.8], "madeira_clara"),
        cubo([-2.5, 17, -1.3], [1.8, 2.5, 0.4], "branco"),
        cubo([0, 18, -0.3], [1.8, 2.5, 0.4], "vermelho"),
        cubo([-1.3, 16, 0.3], [1.8, 2.5, 0.4], "branco"),
    ]


def m_alvo_cavalete() -> list[dict]:
    alvo_uv = {"uv": [32, 0], "uv_size": [16, 16]}
    placa_alvo = {
        "origin": [-7, 6, -1.5],
        "size": [14, 14, 1.5],
        "uv": {"north": alvo_uv, "south": face_cor("madeira_clara"), **{lado: face_cor("madeira_esc") for lado in LADOS_FINOS}},
    }
    return [
        cubo([-6, 0, -0.5], [1.5, 16, 1.5], "madeira_esc"),
        cubo([4.5, 0, -0.5], [1.5, 16, 1.5], "madeira_esc"),
        cubo([-0.75, 0, 1.2], [1.5, 14, 1.5], "madeira"),
        placa_alvo,
    ]


def m_martelo() -> list[dict]:
    return [
        cubo([-1, 0, -1], [2, 20, 2], "madeira"),
        cubo([-6, 20, -3], [12, 7, 6], "madeira_clara"),
        cubo([-8, 20, -3.2], [2, 7, 6.4], "ferrugem"),
        cubo([6, 20, -3.2], [2, 7, 6.4], "ferrugem"),
        cubo([-1.2, 19.6, -1.2], [2.4, 1.2, 2.4], "ouro_esc"),
    ]


def m_lenha() -> list[dict]:
    ponta = {"north": face_cor("madeira_clara"), "south": face_cor("madeira_clara")}
    return [
        cubo([-5.5, 0, -8], [5, 5, 16], "madeira", **ponta),
        cubo([-0.2, 0, -8], [5, 5, 16], "madeira", **ponta),
        cubo([-3, 5, -8], [5, 5, 16], "madeira_esc", **ponta),
    ]


def m_lanterna_papel() -> list[dict]:
    return [
        cubo([-0.75, 0, -0.75], [1.5, 24, 1.5], "madeira"),
        cubo([-2.5, 31.5, -2.5], [5, 1.5, 5], "ferrugem"),
        cubo([-4, 22, -4], [8, 9.5, 8], "laranja"),
        cubo([-4.2, 26, -4.2], [8.4, 1.5, 8.4], "ouro"),
        cubo([-2.5, 20.5, -2.5], [5, 1.5, 5], "ferrugem"),
        cubo([-0.5, 16, -0.5], [1, 4.5, 1], "ouro"),
    ]


def m_raposa() -> list[dict]:
    return [
        cubo([-4, 0, -3], [8, 6, 7], "laranja"),
        cubo([-3, 0, -3.3], [6, 4, 0.4], "creme"),
        cubo([-4, 6, -3.5], [8, 7, 7], "laranja"),
        cubo([-2, 6, -4.5], [4, 3, 1.5], "creme"),
        cubo([-0.75, 8, -4.9], [1.5, 1, 0.6], "preto"),
        cubo([-3, 9.5, -3.9], [1.4, 1.4, 0.4], "preto"),
        cubo([1.6, 9.5, -3.9], [1.4, 1.4, 0.4], "preto"),
        cubo([-4, 13, -2.5], [2.5, 3.5, 2], "laranja"),
        cubo([1.5, 13, -2.5], [2.5, 3.5, 2], "laranja"),
        cubo([-3.3, 13, -2.7], [1, 2, 0.4], "creme"),
        cubo([2.3, 13, -2.7], [1, 2, 0.4], "creme"),
        cubo([-1.5, 0, 4], [3, 3, 5], "laranja"),
        cubo([-1.5, 0, 9], [3, 3, 2.5], "branco"),
    ]


def m_banco() -> list[dict]:
    return [
        cubo([-10, 6, -3], [20, 2, 6], "madeira_clara"),
        cubo([-9, 0, -2.5], [2, 6, 5], "madeira_esc"),
        cubo([7, 0, -2.5], [2, 6, 5], "madeira_esc"),
    ]


def m_barril() -> list[dict]:
    return [
        cubo([-4.5, 0, -4.5], [9, 11, 9], "madeira"),
        cubo([-4.8, 2, -4.8], [9.6, 1.4, 9.6], "cinza"),
        cubo([-4.8, 7, -4.8], [9.6, 1.4, 9.6], "cinza"),
        cubo([-3.5, 11, -3.5], [7, 0.6, 7], "madeira_clara"),
    ]


# ---------------------------------------------------------------------------- mesas de jogo
# Tabuleiros e almofada para as mesas (sistemas/mesas.js põe sozinho). As brancas ficam no lado +z do modelo; a entidade
# gira para o lado da pessoa sentada na primeira almofada.
def peca_xadrez(tipo: str, cx: float, cz: float, cor: str) -> list[dict]:
    y0 = 2.05
    c = lambda x, y, z, w, h, d: cubo([cx + x, y0 + y, cz + z], [w, h, d], cor)  # noqa: E731
    base = c(-0.55, 0, -0.55, 1.1, 0.3, 1.1)
    if tipo == "p":
        return [base, c(-0.3, 0.3, -0.3, 0.6, 0.7, 0.6), c(-0.4, 1.0, -0.4, 0.8, 0.6, 0.8)]
    if tipo == "r":
        return [base, c(-0.45, 0.3, -0.45, 0.9, 1.2, 0.9), c(-0.55, 1.5, -0.55, 1.1, 0.5, 1.1), c(-0.2, 2.0, -0.2, 0.4, 0.2, 0.4)]
    if tipo == "n":
        return [base, c(-0.4, 0.3, -0.4, 0.8, 1.1, 0.8), c(-0.35, 1.4, -0.75, 0.7, 0.7, 1.3), c(-0.3, 2.1, 0.0, 0.6, 0.3, 0.3)]
    if tipo == "b":
        return [base, c(-0.35, 0.3, -0.35, 0.7, 1.2, 0.7), c(-0.45, 1.5, -0.45, 0.9, 0.7, 0.9), c(-0.15, 2.2, -0.15, 0.3, 0.3, 0.3)]
    if tipo == "q":
        return [base, c(-0.4, 0.3, -0.4, 0.8, 1.5, 0.8), c(-0.6, 1.8, -0.6, 1.2, 0.5, 1.2), c(-0.25, 2.3, -0.25, 0.5, 0.4, 0.5)]
    return [  # rei
        base,
        c(-0.4, 0.3, -0.4, 0.8, 1.6, 0.8),
        c(-0.6, 1.9, -0.6, 1.2, 0.4, 1.2),
        c(-0.15, 2.3, -0.15, 0.3, 0.9, 0.3),
        c(-0.4, 2.7, -0.15, 0.8, 0.3, 0.3),
    ]


def m_tabuleiro_xadrez() -> list[dict]:
    cubos = [
        cubo([-8, 0, -8], [16, 1.6, 16], "madeira_esc"),
        cubo([-6.92, 1.6, -6.92], [13.84, 0.4, 13.84], "xad_escuro"),  # um fiapo menor: evita faces no mesmo plano (pisca)
    ]
    passo = 1.75
    for r in range(8):
        for f in range(8):
            if (f + r) % 2 == 1:  # a1 é escura
                cubos.append(cubo([-7 + f * passo, 1.6, 7 - (r + 1) * passo], [passo, 0.45, passo], "xad_claro"))
    ordem = ["r", "n", "b", "q", "k", "b", "n", "r"]
    for f in range(8):
        cx = -7 + (f + 0.5) * passo
        cubos += peca_xadrez(ordem[f], cx, 7 - 0.5 * passo, "marfim")
        cubos += peca_xadrez("p", cx, 7 - 1.5 * passo, "marfim")
        cubos += peca_xadrez("p", cx, 7 - 6.5 * passo, "ebano")
        cubos += peca_xadrez(ordem[f], cx, 7 - 7.5 * passo, "ebano")
    return cubos


def m_tabuleiro_velha() -> list[dict]:
    cubos = [
        cubo([-8, 0, -8], [16, 1.6, 16], "madeira_clara"),
        cubo([-6.95, 1.6, -6.95], [13.9, 0.3, 13.9], "bege"),
    ]
    for pos in (-2.5, 2.1):
        cubos.append(cubo([pos, 1.9, -7], [0.4, 0.3, 14], "madeira_esc"))
        cubos.append(cubo([-7, 1.9, pos], [14, 0.3, 0.4], "madeira_esc"))

    def marca_x(cx: float, cz: float) -> list[dict]:
        out = []
        for ang in (45, -45):
            out.append({**cubo([cx - 1.7, 1.9, cz - 0.3], [3.4, 0.5, 0.6], "vermelho"), "pivot": [cx, 2.0, cz], "rotation": [0, ang, 0]})
        return out

    def marca_o(cx: float, cz: float) -> list[dict]:
        return [
            cubo([cx - 1.5, 1.9, cz - 1.5], [3, 0.5, 0.6], "azul"),
            cubo([cx - 1.5, 1.9, cz + 0.9], [3, 0.5, 0.6], "azul"),
            cubo([cx - 1.5, 1.9, cz - 0.9], [0.6, 0.5, 1.8], "azul"),
            cubo([cx + 0.9, 1.9, cz - 0.9], [0.6, 0.5, 1.8], "azul"),
        ]

    cel = 14 / 3
    centro = lambda i: -7 + (i + 0.5) * cel  # noqa: E731
    cubos += marca_x(centro(0), centro(0)) + marca_x(centro(1), centro(1)) + marca_x(centro(2), centro(0))
    cubos += marca_o(centro(1), centro(0)) + marca_o(centro(0), centro(2)) + marca_o(centro(2), centro(1))
    return cubos


def m_almofada() -> list[dict]:
    cubos = [
        cubo([-5, 0, -5], [10, 2, 10], "ameixa"),
        cubo([-4.5, 2, -4.5], [9, 0.6, 9], "laranja"),
        cubo([-1, 2.6, -1], [2, 0.5, 2], "ouro"),
    ]
    for sx in (-6, 4):
        for sz in (-6, 4):
            cubos.append(cubo([sx, 0, sz], [2, 1.2, 2], "ouro_esc"))
    return cubos


def m_marcador_forca() -> list[dict]:
    """Marcador do Teste de Força: bola dourada grande com abas vermelhas (o povo adorou, parece um foguete)."""
    return [
        cubo([-6, 0, -6], [12, 12, 12], "ouro"),
        cubo([-5, 12, -5], [10, 2, 10], "ouro_claro"),
        cubo([-12, 4, -2], [24, 4, 4], "vermelho"),
        cubo([-2, 4, -12], [4, 4, 24], "vermelho"),
        cubo([-3, 14, -3], [6, 4, 6], "branco"),
        cubo([-1.5, 18, -1.5], [3, 4, 3], "vermelho"),
    ]


def peixe(cor: str, barbatana: str) -> list[dict]:
    """Peixinho de enfeite do tanque da Pescaria (a cabeça fica do lado -z, para onde a entidade olha)."""
    return [
        cubo([-1.5, 0, -4], [3, 3.5, 7], cor),
        cubo([-0.5, 0.5, 3], [1, 2.5, 3], cor),
        cubo([-0.25, 3.5, -1], [0.5, 1.5, 3], barbatana),
        cubo([-1.75, 2, -3.5], [0.5, 0.9, 0.9], "preto"),
        cubo([1.25, 2, -3.5], [0.5, 0.9, 0.9], "preto"),
    ]


def m_boia_pesca() -> list[dict]:
    return [
        cubo([-1.5, 0, -1.5], [3, 3, 3], "branco"),
        cubo([-1.5, 3, -1.5], [3, 2, 3], "vermelho"),
        cubo([-0.25, 5, -0.25], [0.5, 3, 0.5], "preto"),
    ]


def raposa_corrida(cor: str, pose: int) -> list[dict]:
    """Raposa de corrida (uma por faixa). Duas poses de pata: o script alterna entre elas e parece que corre."""
    frente, tras = (-1.0, 1.0) if pose == 0 else (1.0, -1.0)
    return [
        cubo([-2.5, 3, -4], [5, 4, 9], cor),
        cubo([-2, 2.6, -3.5], [4, 0.6, 8], "creme"),
        cubo([-2.25, 4.5, -8.5], [4.5, 4, 4], cor),
        cubo([-1, 4.5, -10.5], [2, 2, 2.5], "creme"),
        cubo([-0.5, 5.6, -10.9], [1, 1, 0.5], "preto"),
        cubo([-1.9, 6.6, -8.7], [0.8, 0.8, 0.4], "preto"),
        cubo([1.1, 6.6, -8.7], [0.8, 0.8, 0.4], "preto"),
        cubo([-2.25, 8.5, -6.5], [1.5, 2, 1], cor),
        cubo([0.75, 8.5, -6.5], [1.5, 2, 1], cor),
        cubo([-1.5, 4, 5], [3, 3, 6], cor),
        cubo([-1.5, 4, 11], [3, 3, 2.5], "branco"),
        cubo([-2.5, 0, -3.5 + frente], [1.6, 3.2, 1.6], "preto"),
        cubo([0.9, 0, -3.5 - frente], [1.6, 3.2, 1.6], "preto"),
        cubo([-2.5, 0, 2.5 + tras], [1.6, 3.2, 1.6], "preto"),
        cubo([0.9, 0, 2.5 - tras], [1.6, 3.2, 1.6], "preto"),
    ]


def inclinado(c: dict, graus: float, pivo: list[float]) -> dict:
    """Cubo girado em torno do eixo z (Bedrock: rotation + pivot)."""
    c["rotation"] = [0, 0, graus]
    c["pivot"] = pivo
    return c


def m_roleta_roda() -> list[dict]:
    """Roda vertical de 42 de diâmetro, centro em (0, 38, 0). A textura aparece nas duas faces; o resto é transparente."""
    face = {"uv": [RODA_POS[0], RODA_POS[1]], "uv_size": [RODA_TAM, RODA_TAM]}
    return [
        cubo([-21, 17, -1], [42, 42, 2], "ouro", north=face, south=face, east=VAZIO, west=VAZIO, up=VAZIO, down=VAZIO),
        cubo([-3, 35, -1.8], [6, 6, 3.6], "ouro"),
        cubo([-0.8, 33.4, -2.4], [1.6, 9.2, 1], "ouro_claro"),
        cubo([-4.6, 37.2, -2.4], [9.2, 1.6, 1], "ouro_claro"),
    ]


def m_roleta_base() -> list[dict]:
    """Suporte de madeira com placa, escoras, pontas douradas e a seta vermelha no topo."""
    x0, y0 = POSICOES_PLACA[5]
    texto = {"uv": [x0, y0], "uv_size": [64, 24]}
    madeira_clara = {lado: face_cor("madeira_clara") for lado in LADOS_FINOS}
    return [
        cubo([-20, 0, -12], [40, 3, 24], "madeira"),
        cubo([-20.5, 2.4, -12.5], [41, 1.2, 25], "madeira_clara"),
        cubo([-2, 3, 1.1], [4, 36, 3], "madeira_esc"),
        inclinado(cubo([-1.2, 3, 1.4], [2.4, 28, 2.4], "madeira"), 33, [0, 3, 2.6]),
        inclinado(cubo([-1.2, 3, 1.4], [2.4, 28, 2.4], "madeira"), -33, [0, 3, 2.6]),
        {"origin": [-14, 3.6, -12.4], "size": [28, 9, 1.2], "uv": {"north": texto, "south": texto, **madeira_clara}},
        cubo([-19, 3.6, -11], [3.2, 3.2, 3.2], "ouro"),
        cubo([15.8, 3.6, -11], [3.2, 3.2, 3.2], "ouro"),
        cubo([-19, 3.6, 8], [3.2, 3.2, 3.2], "ouro"),
        cubo([15.8, 3.6, 8], [3.2, 3.2, 3.2], "ouro"),
        # haste que segura a seta e a seta (a ponta aponta para baixo, para dentro da roda)
        cubo([-0.8, 36, 2.6], [1.6, 28.4, 1.6], "madeira_esc"),
        cubo([-0.8, 63, -3.4], [1.6, 1.8, 7.6], "madeira_esc"),
        cubo([-3.4, 59.2, -3.4], [6.8, 2.4, 2.4], "vermelho"),
        cubo([-2.4, 57.2, -3.4], [4.8, 2.2, 2.4], "vermelho"),
        cubo([-1.3, 55.4, -3.4], [2.6, 2, 2.4], "vermelho"),
        cubo([-0.6, 54.2, -3.4], [1.2, 1.4, 2.4], "vermelho"),
        cubo([-1, 61.4, -3.4], [2, 1.7, 2.4], "ouro"),
    ]


def m_copo() -> list[dict]:
    """Copo de plástico vermelho virado para baixo, com uma faixa branca."""
    return [
        cubo([-4, 0, -4], [8, 1.2, 8], "vermelho"),
        cubo([-3.6, 1.2, -3.6], [7.2, 2.8, 7.2], "vermelho"),
        cubo([-3.7, 4, -3.7], [7.4, 1, 7.4], "branco"),
        cubo([-3.1, 5, -3.1], [6.2, 3, 6.2], "vermelho"),
        cubo([-2.6, 8, -2.6], [5.2, 1, 5.2], "vermelho"),
        cubo([-2.2, 9, -2.2], [4.4, 0.4, 4.4], "ferrugem"),
    ]


def m_bolinha() -> list[dict]:
    return [
        cubo([-1.6, 0, -1.6], [3.2, 3.2, 3.2], "ouro"),
        cubo([-1.0, 3.2, -1.0], [2.0, 0.6, 2.0], "ouro_claro"),
        cubo([-1.9, 0.9, -0.8], [0.4, 1.4, 1.6], "ouro_esc"),
    ]


# ---------------------------------------------------------------------------- praia e lago
def faixas(x: float, y: float, z: float, larg: float, alt: float, prof: float, cores: list[str], eixo: str = "x") -> list[dict]:
    """Bloco dividido em faixas de cores alternadas ao longo do eixo x ou z."""
    n = len(cores)
    if eixo == "x":
        return [cubo([x + i * larg / n, y, z], [larg / n, alt, prof], c) for i, c in enumerate(cores)]
    return [cubo([x, y, z + i * prof / n], [larg, alt, prof / n], c) for i, c in enumerate(cores)]


def girado_y(c: dict, graus: float) -> dict:
    """Cubo girado em torno do eixo y que passa pela origem do modelo."""
    c["rotation"] = [0, graus, 0]
    c["pivot"] = [0, 0, 0]
    return c


def guarda_sol(cor: str) -> list[dict]:
    """Guarda-sol de mastro de madeira e copa em camadas listradas, levemente torto na areia."""
    camadas = [(21.5, 28), (22.7, 22), (23.9, 15), (25.1, 8)]
    pecas = [cubo([-0.75, 0, -0.75], [1.5, 24, 1.5], "madeira_clara")]
    for y, larg in camadas:
        pecas += faixas(-larg / 2, y, -larg / 2, larg, 1.2, larg, [cor, "branco", cor, "branco", cor])
    pecas.append(cubo([-0.5, 26.3, -0.5], [1, 2.4, 1], "ouro_esc"))
    return [inclinado(c, 6, [0, 0, 0]) for c in pecas] + [cubo([-3.5, 0, -3.5], [7, 1.2, 7], "areia"), cubo([-2, 1.2, -2], [4, 0.8, 4], "areia")]


def m_espreguicadeira() -> list[dict]:
    """Espreguiçadeira vista de lado: pés para o lado -x, encosto em degraus (voxel) subindo para o lado +x."""
    cubos = [
        cubo([-13, 3, -4.5], [26, 1, 1.2], "madeira"),
        cubo([-13, 3, 3.3], [26, 1, 1.2], "madeira"),
        cubo([-12.5, 0, -4.5], [1.2, 3, 1.2], "madeira_esc"),
        cubo([-12.5, 0, 3.3], [1.2, 3, 1.2], "madeira_esc"),
        cubo([10.5, 0, -4.5], [1.2, 3, 1.2], "madeira_esc"),
        cubo([10.5, 0, 3.3], [1.2, 3, 1.2], "madeira_esc"),
        cubo([4, 3.2, -0.6], [1.2, 6, 1.2], "madeira"),
    ]
    cubos += faixas(-11, 4, -3.5, 14, 1.5, 7, ["azul", "branco", "azul", "branco", "azul", "branco", "azul"])
    for i, cor in enumerate(["branco", "azul", "branco", "azul"]):
        cubos.append(cubo([3 + 2.5 * i, 4 + 1.8 * i, -3.5], [3, 2, 7], cor))
    return cubos


def m_castelo_areia() -> list[dict]:
    cubos = [cubo([-10, 0, -10], [20, 1.5, 20], "areia"), cubo([-8, 1.5, -8], [16, 1, 16], "bege")]
    for tx in (-9, 5):
        for tz in (-9, 5):
            cubos.append(cubo([tx, 1.5, tz], [4, 8, 4], "areia"))
            cubos.append(cubo([tx - 0.3, 9.5, tz - 0.3], [4.6, 1, 4.6], "bege"))
            for mx, mz in ((0, 0), (2.6, 0), (0, 2.6), (2.6, 2.6)):
                cubos.append(cubo([tx - 0.3 + mx, 10.5, tz - 0.3 + mz], [2, 1.4, 2], "areia"))
    cubos += [
        cubo([-5, 2.5, -8], [10, 4, 2], "areia"),
        cubo([-5, 2.5, 6], [10, 4, 2], "areia"),
        cubo([-8, 2.5, -5], [2, 4, 10], "areia"),
        cubo([6, 2.5, -5], [2, 4, 10], "areia"),
        cubo([-4, 2.5, -4], [8, 10, 8], "bege"),
        cubo([-4.4, 12.5, -4.4], [8.8, 1.2, 8.8], "areia"),
        cubo([-1.5, 2.5, -4.2], [3, 4.5, 0.4], "madeira_esc"),
        cubo([-0.4, 14, -0.4], [0.8, 7, 0.8], "madeira_esc"),
        cubo([0.4, 18, -0.25], [4.5, 3, 0.5], "vermelho"),
        cubo([-2.5, 5, -4.2], [0.9, 1.3, 0.4], "madeira_esc"),
        cubo([1.6, 5, -4.2], [0.9, 1.3, 0.4], "madeira_esc"),
    ]
    return cubos


def m_prancha_surf() -> list[dict]:
    """Prancha de surf turquesa espetada num montinho de areia, inclinada."""
    prancha = [
        cubo([-3.2, 2, -0.8], [6.4, 24, 1.6], "turquesa"),
        cubo([-2.2, 26, -0.8], [4.4, 1.8, 1.6], "turquesa"),
        cubo([-1.2, 27.8, -0.8], [2.4, 1.2, 1.6], "turquesa"),
        cubo([-0.7, 2, -0.9], [1.4, 24, 1.8], "branco"),
        cubo([-3.3, 17, -0.9], [6.6, 3, 1.8], "coral"),
        cubo([-3.3, 12, -0.9], [6.6, 1.2, 1.8], "ouro"),
    ]
    areia = [
        cubo([-6, 0, -6], [12, 1.5, 12], "areia"),
        cubo([-4, 1.5, -4], [8, 1.5, 8], "areia"),
        cubo([-2.6, 3, -2.6], [5.2, 1, 5.2], "areia"),
    ]
    return [inclinado(c, 7, [0, 2, 0]) for c in prancha] + areia


def m_barquinho() -> list[dict]:
    """Barquinho de pesca de madeira, de lado (proa para +x), com banco, remo e um peixe."""
    cubos = [
        cubo([-12, 0, -4], [24, 1.5, 8], "madeira_esc"),
        cubo([-14, 1.5, -5], [28, 2, 10], "madeira"),
        cubo([-16, 3.5, -6], [32, 2, 1.5], "madeira_clara"),
        cubo([-16, 3.5, 4.5], [32, 2, 1.5], "madeira_clara"),
        cubo([-16, 3.5, -4.5], [1.5, 2, 9], "madeira_clara"),
        cubo([14.5, 3.5, -4.5], [1.5, 2, 9], "madeira_clara"),
        cubo([16, 3.5, -2.5], [2.5, 2, 5], "madeira_clara"),
        cubo([18.5, 3.5, -1], [1.5, 2.5, 2], "madeira_clara"),
        cubo([-2, 3.5, -4.5], [1, 3, 9], "madeira_esc"),
        cubo([-3.5, 6, -4.5], [4, 1.2, 9], "madeira_clara"),
        cubo([7, 6, -10], [1, 1, 15], "madeira_clara"),
        cubo([6.5, 5.8, -13], [2, 1.4, 3.5], "madeira_esc"),
        cubo([-12, 3.5, -2], [3, 1.2, 4], "bege"),
        cubo([-9, 3.5, 0], [4, 1.5, 2], "prata"),
        cubo([-5.5, 3.5, 0], [1.5, 2.2, 2], "azul"),
        cubo([-15.5, 5.5, -1], [1, 3, 2], "vermelho"),
    ]
    return cubos


def m_bola_praia() -> list[dict]:
    """Bola de praia: cinco faixas coloridas, cada uma um octógono feito de dois blocos."""
    cores = ["vermelho", "branco", "azul", "branco", "ouro"]
    cubos = []
    for i, cor in enumerate(cores):
        x = -5 + 2 * i
        if i in (0, len(cores) - 1):
            cubos.append(cubo([x, 1, -2.5], [2, 8, 5], cor))
            cubos.append(cubo([x, 2.5, -4], [2, 5, 8], cor))
        else:
            cubos.append(cubo([x, 0, -3], [2, 10, 6], cor))
            cubos.append(cubo([x, 2, -5], [2, 6, 10], cor))
    cubos.append(cubo([-0.6, 10, -0.6], [1.2, 0.5, 1.2], "ouro_esc"))
    return cubos


def m_toalha_caixa() -> list[dict]:
    cubos = faixas(-12, 0, -9, 24, 0.6, 18, ["coral", "branco", "coral", "branco", "coral", "branco"], eixo="z")
    cubos += [
        cubo([-12.4, 0, -9.4], [0.4, 0.6, 18.8], "branco"),
        cubo([3, 0.6, -4], [9, 7, 6], "azul"),
        cubo([2.8, 7.6, -4.2], [9.4, 1.4, 6.4], "branco"),
        cubo([4.5, 9, -2], [6, 1, 1.6], "cinza"),
        cubo([3, 3, -4.1], [9, 1.2, 0.2], "branco"),
        cubo([-9, 0.6, -3], [2.8, 0.8, 6], "ouro"),
        cubo([-5.5, 0.6, -3], [2.8, 0.8, 6], "ouro"),
        cubo([-9, 1.4, -1.5], [1, 0.5, 3], "coral"),
        cubo([-5.5, 1.4, -1.5], [1, 0.5, 3], "coral"),
    ]
    return cubos


def m_estrela_mar() -> list[dict]:
    cubos = [cubo([-2.2, 0, -2.2], [4.4, 1.6, 4.4], "coral")]
    for k in range(5):
        ang = k * 72
        cubos.append(girado_y(cubo([-1.3, 0, -7], [2.6, 1.2, 5.6], "coral"), ang))
        cubos.append(girado_y(cubo([-0.4, 1.2, -6.2], [0.8, 0.3, 0.8], "creme"), ang))
        cubos.append(girado_y(cubo([-0.4, 1.2, -3.8], [0.8, 0.3, 0.8], "creme"), ang))
    cubos.append(cubo([-0.6, 1.6, -0.6], [1.2, 0.3, 1.2], "ouro"))
    return cubos


def m_lirio_dagua() -> list[dict]:
    return [
        cubo([-7, 0, -4], [14, 0.8, 8], "verde"),
        cubo([-4, 0, -7], [8, 0.8, 14], "verde"),
        cubo([-6, 0, -6], [12, 0.8, 12], "verde"),
        cubo([-0.3, 0.8, -5.5], [0.6, 0.2, 5], "verde_escuro"),
        cubo([-5, 0.8, -0.3], [3.5, 0.2, 0.6], "verde_escuro"),
        cubo([1.5, 0.8, -0.3], [3.5, 0.2, 0.6], "verde_escuro"),
        cubo([4, 0, 3], [5, 0.8, 5], "verde_escuro"),
        cubo([-1, 0.8, -1], [2, 3.4, 2], "ouro"),
        cubo([-1.6, 0.8, -4.2], [3.2, 2.2, 3], "rosa"),
        cubo([-1.6, 0.8, 1.2], [3.2, 2.2, 3], "rosa"),
        cubo([-4.2, 0.8, -1.6], [3, 2.2, 3.2], "rosa"),
        cubo([1.2, 0.8, -1.6], [3, 2.2, 3.2], "rosa"),
        cubo([-1.2, 3, -3.4], [2.4, 2.2, 2.2], "branco"),
        cubo([-1.2, 3, 1.2], [2.4, 2.2, 2.2], "branco"),
        cubo([-3.4, 3, -1.2], [2.2, 2.2, 2.4], "branco"),
        cubo([1.2, 3, -1.2], [2.2, 2.2, 2.4], "branco"),
        cubo([-0.8, 4.2, -0.8], [1.6, 1, 1.6], "ouro_claro"),
    ]


def m_sapo() -> list[dict]:
    pernas = [
        cubo([-3.9, 0, -1.8], [1.4, 2.6, 1.4], "verde"),
        cubo([-5, 0.4, 1.4], [2, 3, 3.6], "verde"),
        cubo([-5.6, 0, -0.6], [2.8, 0.8, 3.2], "verde_escuro"),
    ]
    espelho = [cubo([-(c["origin"][0] + c["size"][0]), c["origin"][1], c["origin"][2]], c["size"], "verde" if i < 2 else "verde_escuro") for i, c in enumerate(pernas)]
    return pernas + espelho + [
        cubo([-3.2, 0, -2], [6.4, 4, 6.5], "verde"),
        cubo([-2.4, 0.6, -2.1], [4.8, 2.6, 0.4], "bege"),
        cubo([-3, 2.8, -5], [6, 3.2, 3.5], "verde"),
        cubo([-2.6, 3.4, -5.1], [5.2, 0.35, 0.2], "verde_escuro"),
        cubo([-1.7, 4, 0.2], [1.6, 0.3, 1.6], "verde_escuro"),
        cubo([0.6, 4, 2.2], [1.4, 0.3, 1.4], "verde_escuro"),
        cubo([-0.6, 4, 3.6], [1.2, 0.3, 1.2], "verde_escuro"),
        cubo([1, 5.8, -4.6], [2.2, 2.2, 2.2], "ouro"),
        cubo([-3.2, 5.8, -4.6], [2.2, 2.2, 2.2], "ouro"),
        cubo([1.6, 6.2, -4.7], [1, 1.5, 0.2], "preto"),
        cubo([-2.6, 6.2, -4.7], [1, 1.5, 0.2], "preto"),
    ]


def m_lanterna_flutuante() -> list[dict]:
    return [
        cubo([-6, 0, -6], [12, 1.2, 12], "madeira_clara"),
        cubo([-5.5, 1.2, -5.5], [11, 0.8, 11], "madeira_esc"),
        cubo([-4.5, 2, -4.5], [9, 2.5, 9], "laranja"),
        cubo([-4, 4.5, -4], [8, 7, 8], "creme"),
        cubo([-4.5, 11.5, -4.5], [9, 2, 9], "laranja"),
        cubo([-5.5, 13.5, -5.5], [11, 1.2, 11], "madeira_clara"),
        cubo([-3, 14.7, -3], [6, 1.2, 6], "madeira_esc"),
        cubo([-0.6, 15.9, -0.6], [1.2, 1.2, 1.2], "ouro"),
        cubo([-1.8, 6, -4.1], [3.6, 4, 0.2], "ouro_claro"),
        cubo([-1.8, 6, 3.9], [3.6, 4, 0.2], "ouro_claro"),
        cubo([-4.1, 6, -1.8], [0.2, 4, 3.6], "ouro_claro"),
        cubo([3.9, 6, -1.8], [0.2, 4, 3.6], "ouro_claro"),
    ]


# nome do osso, nome para o painel, função que devolve os cubos
MODELOS = [
    ("pilha", "Pilha de moedas", m_pilha),
    ("saco", "Saco de moedas", m_saco),
    ("placa_moeda", "Placa Cara ou Coroa", lambda: placa_com_postes(0)),
    ("bandeirinhas", "Bandeirinhas de festa", m_bandeirinhas),
    ("moedao", "Moeda gigante giratória", m_moedao),
    ("placa_pesca", "Placa Pescaria", lambda: placa_com_postes(1)),
    ("placa_tiro", "Placa Tiro ao alvo", lambda: placa_com_postes(2)),
    ("placa_forca", "Placa Teste de Força", lambda: placa_com_postes(3)),
    ("letreiro", "Letreiro Feira do Vulpus (grande)", lambda: placa_com_postes(4, 40)),
    ("boia", "Boia salva-vidas", m_boia),
    ("caixa_peixes", "Caixote de peixes", m_caixa_peixes),
    ("rede", "Rede de pesca pendurada", m_rede),
    ("aljava", "Aljava com flechas", m_aljava),
    ("alvo", "Alvo de treino em cavalete", m_alvo_cavalete),
    ("martelo", "Martelo gigante", m_martelo),
    ("lenha", "Pilha de lenha", m_lenha),
    ("lanterna", "Lanterna de papel no poste", m_lanterna_papel),
    ("raposa", "Raposa de pelúcia", m_raposa),
    ("banco", "Banco de madeira", m_banco),
    ("barril", "Barril", m_barril),
    ("tabuleiro_xadrez", "Tabuleiro de xadrez (com peças)", m_tabuleiro_xadrez),
    ("tabuleiro_velha", "Tabuleiro do jogo da velha", m_tabuleiro_velha),
    ("almofada", "Almofada de mesa", m_almofada),
    ("marcador_forca", "Marcador do Teste de Força", m_marcador_forca),
    ("peixe_prata", "Peixinho prateado", lambda: peixe("prata", "azul")),
    ("peixe_laranja", "Peixinho laranja", lambda: peixe("laranja", "ferrugem")),
    ("peixe_dourado", "Peixinho dourado", lambda: peixe("ouro", "ouro_esc")),
    ("boia_pesca", "Boia de pescaria", m_boia_pesca),
    ("raposa_vermelha_a", "Raposa de corrida vermelha (pose A)", lambda: raposa_corrida("vermelho", 0)),
    ("raposa_vermelha_b", "Raposa de corrida vermelha (pose B)", lambda: raposa_corrida("vermelho", 1)),
    ("raposa_amarela_a", "Raposa de corrida amarela (pose A)", lambda: raposa_corrida("ouro", 0)),
    ("raposa_amarela_b", "Raposa de corrida amarela (pose B)", lambda: raposa_corrida("ouro", 1)),
    ("raposa_verde_a", "Raposa de corrida verde (pose A)", lambda: raposa_corrida("verde", 0)),
    ("raposa_verde_b", "Raposa de corrida verde (pose B)", lambda: raposa_corrida("verde", 1)),
    ("roleta_roda", "Roda da roleta (gira)", m_roleta_roda),
    ("roleta_base", "Base da roleta com a seta", m_roleta_base),
    ("copo", "Copo (jogo do copo)", m_copo),
    ("bolinha", "Bolinha do jogo do copo", m_bolinha),
    # praia e lago (novos modelos sempre no fim da lista: os índices já salvos não mudam)
    ("guarda_sol_vermelho", "Guarda-sol vermelho", lambda: guarda_sol("vermelho")),
    ("guarda_sol_azul", "Guarda-sol azul", lambda: guarda_sol("azul")),
    ("guarda_sol_amarelo", "Guarda-sol amarelo", lambda: guarda_sol("ouro")),
    ("espreguicadeira", "Espreguiçadeira", m_espreguicadeira),
    ("castelo_areia", "Castelo de areia", m_castelo_areia),
    ("prancha_surf", "Prancha de surf na areia", m_prancha_surf),
    ("barquinho", "Barquinho de pesca", m_barquinho),
    ("bola_praia", "Bola de praia", m_bola_praia),
    ("toalha_caixa", "Toalha de praia com caixa térmica", m_toalha_caixa),
    ("estrela_mar", "Estrela-do-mar", m_estrela_mar),
    ("lirio_dagua", "Lírio d'água (estático)", m_lirio_dagua),
    ("sapo", "Sapo (estático)", m_sapo),
    ("lanterna_flutuante", "Lanterna de papel flutuante (estática)", m_lanterna_flutuante),
]
INDICE_MOEDAO = [m[0] for m in MODELOS].index("moedao")
INDICE_TAB_XADREZ = [m[0] for m in MODELOS].index("tabuleiro_xadrez")
INDICE_TAB_VELHA = [m[0] for m in MODELOS].index("tabuleiro_velha")
INDICE_ALMOFADA = [m[0] for m in MODELOS].index("almofada")
INDICE_MARCADOR_FORCA = [m[0] for m in MODELOS].index("marcador_forca")
INDICE_PEIXE_PRATA = [m[0] for m in MODELOS].index("peixe_prata")
INDICE_PEIXE_LARANJA = [m[0] for m in MODELOS].index("peixe_laranja")
INDICE_PEIXE_DOURADO = [m[0] for m in MODELOS].index("peixe_dourado")
INDICE_BOIA_PESCA = [m[0] for m in MODELOS].index("boia_pesca")
INDICE_ROLETA_RODA = [m[0] for m in MODELOS].index("roleta_roda")
INDICE_ROLETA_BASE = [m[0] for m in MODELOS].index("roleta_base")
INDICE_COPO = [m[0] for m in MODELOS].index("copo")
INDICE_RAPOSA_PELUCIA = [m[0] for m in MODELOS].index("raposa")
INDICE_BOLINHA = [m[0] for m in MODELOS].index("bolinha")
INDICE_FLOR_DOURADA = len(MODELOS) + [n for n, _ in NOMES_VIVOS].index("flor")  # animados vêm depois dos estáticos

def indice_vivo(nome: str) -> int:
    return len(MODELOS) + [n for n, _ in NOMES_VIVOS].index(nome)


# props de lembrança (dreamcore), todos animados (vulpus:vida)
INDICES_DREAMCORE = {
    "BALAO_ROSA": indice_vivo("balao_rosa"),
    "BALAO_AZUL": indice_vivo("balao_azul"),
    "BALAO_CREME": indice_vivo("balao_creme"),
    "TV_ESTATICA": indice_vivo("tv_estatica"),
    "URSO": indice_vivo("urso"),
    "TELEFONE": indice_vivo("telefone"),
    "CADEIRA": indice_vivo("cadeira"),
    "ABAJUR": indice_vivo("abajur"),
    "PATO": indice_vivo("pato"),
    "CARROSSEL": indice_vivo("carrossel"),
}
INDICE_RAPOSA_VERMELHA =[m[0] for m in MODELOS].index("raposa_vermelha_a")
INDICE_RAPOSA_AMARELA = [m[0] for m in MODELOS].index("raposa_amarela_a")
INDICE_RAPOSA_VERDE = [m[0] for m in MODELOS].index("raposa_verde_a")


def geometria_prop() -> dict:
    ossos = []
    for nome, _, fabrica in MODELOS:
        pivo = [0, 24, 0] if nome == "moedao" else [0, 38, 0] if nome == "roleta_roda" else [0, 0, 0]
        ossos.append({"name": nome, "pivot": pivo, "cubes": fabrica()})
    return {
        "description": {
            "identifier": "geometry.vulpus.prop",
            "texture_width": LARGURA,
            "texture_height": ALTURA,
            "visible_bounds_width": 6,
            "visible_bounds_height": 6,
            "visible_bounds_offset": [0, 2, 0],
        },
        "bones": ossos,
    }


def salvar_json(caminho: Path, conteudo: dict) -> None:
    # RP vai minificado (menos bytes no download e menos para o cliente ler); BP segue legivel.
    texto = json.dumps(conteudo, separators=(",", ":"), ensure_ascii=False) if RP in caminho.parents else json.dumps(conteudo, indent=2, ensure_ascii=False)
    caminho.write_text(texto + "\n", encoding="utf-8")


def salvar_geometria(caminho: Path, geometria: dict) -> None:
    salvar_json(caminho, {"format_version": "1.16.0", "minecraft:geometry": [geometria]})


def controladores() -> dict:
    visibilidade: list[dict] = [{"*": False}]
    for i, (nome, _, _) in enumerate(MODELOS):
        visibilidade.append({nome: f"query.property('vulpus:modelo') == {i}"})
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.moeda": {
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.default"],
                "part_visibility": [
                    {"*": True},
                    {"disco": "query.property('vulpus:giro') || !query.property('vulpus:coroa')"},
                    {"disco_coroa": "!query.property('vulpus:giro') && query.property('vulpus:coroa')"},
                ],
                "ignore_lighting": True,
            },
            "controller.render.vulpus.prop": {
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.default"],
                "part_visibility": visibilidade,
            },
        },
    }


def entidade_prop_bp() -> dict:
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": "vulpus:prop",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
                "properties": {"vulpus:modelo": {"type": "int", "range": [0, len(MODELOS) - 1], "default": 0, "client_sync": True}},
            },
            "components": {
                "minecraft:type_family": {"family": ["vulpus_prop", "inanimate"]},
                "minecraft:collision_box": {"width": 0.4, "height": 0.4},
                "minecraft:physics": {"has_gravity": False, "has_collision": False},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
                "minecraft:persistent": {},
            },
        },
    }


def entidade_roleta_bp() -> dict:
    """Entidade da roleta: igual ao prop, mas com a hitbox da roda inteira e o ângulo da roda como propriedade."""
    e = entidade_prop_bp()
    d = e["minecraft:entity"]["description"]
    d["identifier"] = "vulpus:roleta"
    d["properties"]["vulpus:ang"] = {"type": "float", "range": [0.0, 360.0], "default": 0.0, "client_sync": True}
    e["minecraft:entity"]["components"]["minecraft:collision_box"] = {"width": 2.6, "height": 4.4}
    e["minecraft:entity"]["components"]["minecraft:type_family"] = {"family": ["vulpus_roleta", "inanimate"]}
    return e


def entidade_roleta_rp() -> dict:
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "vulpus:roleta",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/props"},
                "geometry": {"default": "geometry.vulpus.prop"},
                "animations": {"roda": "animation.vulpus.roleta.roda"},
                "scripts": {"animate": [{"roda": f"query.property('vulpus:modelo') == {INDICE_ROLETA_RODA}"}]},
                "render_controllers": ["controller.render.vulpus.prop"],
            }
        },
    }


def entidade_npc_bp() -> dict:
    """Entidade de NPC (provisória): igual ao prop, mas com hitbox de gente para ser fácil de clicar."""
    e = entidade_prop_bp()
    e["minecraft:entity"]["description"]["identifier"] = "vulpus:npc"
    e["minecraft:entity"]["components"]["minecraft:collision_box"] = {"width": 1.0, "height": 1.8}
    e["minecraft:entity"]["components"]["minecraft:type_family"] = {"family": ["vulpus_npc", "inanimate"]}
    return e


def entidade_npc_rp() -> dict:
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "vulpus:npc",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/props"},
                "geometry": {"default": "geometry.vulpus.prop"},
                "render_controllers": ["controller.render.vulpus.prop"],
            }
        },
    }


def animacao_roleta() -> dict:
    return {
        "format_version": "1.8.0",
        "animations": {
            "animation.vulpus.roleta.roda": {
                "loop": True,
                "bones": {"roleta_roda": {"rotation": [0, 0, "query.property('vulpus:ang')"]}},
            }
        },
    }


def modelos_js() -> str:
    nomes = ",\n".join(f"  {json.dumps(n, ensure_ascii=False)}" for _, n, _ in MODELOS)
    vivos = ",\n".join(f"  {json.dumps(n, ensure_ascii=False)}" for _, n in NOMES_VIVOS)
    return (
        "// @ts-check\n"
        "// GERADO por addon/tools/gerar_props.py: não edite à mão. Nomes dos modelos de prop, na ordem de vulpus:modelo;\n"
        "// depois dos estáticos (vulpus:prop) vêm os animados (vulpus:vida, modelo = índice - INDICE_PRIMEIRO_VIVO).\n\n"
        f"export const MODELOS = [\n{nomes},\n{vivos},\n];\n\n"
        f"export const INDICE_PRIMEIRO_VIVO = {len(MODELOS)};\n"
        f"export const INDICE_MOEDAO = {INDICE_MOEDAO};\n"
        f"export const INDICE_TAB_XADREZ = {INDICE_TAB_XADREZ};\n"
        f"export const INDICE_TAB_VELHA = {INDICE_TAB_VELHA};\n"
        f"export const INDICE_ALMOFADA = {INDICE_ALMOFADA};\n"
        f"export const INDICE_MARCADOR_FORCA = {INDICE_MARCADOR_FORCA};\n"
        f"export const INDICE_PEIXE_PRATA = {INDICE_PEIXE_PRATA};\n"
        f"export const INDICE_PEIXE_LARANJA = {INDICE_PEIXE_LARANJA};\n"
        f"export const INDICE_PEIXE_DOURADO = {INDICE_PEIXE_DOURADO};\n"
        f"export const INDICE_BOIA_PESCA = {INDICE_BOIA_PESCA};\n"
        f"export const INDICE_ROLETA_RODA = {INDICE_ROLETA_RODA};\n"
        f"export const INDICE_ROLETA_BASE = {INDICE_ROLETA_BASE};\n"
        f"export const INDICE_COPO = {INDICE_COPO};\n"
        f"export const INDICE_RAPOSA_PELUCIA = {INDICE_RAPOSA_PELUCIA};\n"
        f"export const INDICE_BOLINHA = {INDICE_BOLINHA};\n"
        f"export const INDICE_FLOR_DOURADA = {INDICE_FLOR_DOURADA};\n"
        f"export const INDICES_RAPOSAS = [{INDICE_RAPOSA_VERMELHA}, {INDICE_RAPOSA_AMARELA}, {INDICE_RAPOSA_VERDE}];\n"
        + "".join(f"export const INDICE_{k} = {v};\n" for k, v in INDICES_DREAMCORE.items())
        + f"export const INDICES_BALOES = [{INDICES_DREAMCORE['BALAO_ROSA']}, {INDICES_DREAMCORE['BALAO_AZUL']}, {INDICES_DREAMCORE['BALAO_CREME']}];\n"
    )


def main() -> None:
    saida = RP / "textures" / "vulpus" / "entidades"
    saida.mkdir(parents=True, exist_ok=True)
    img = textura()
    img.save(saida / "props.png")
    salvar_geometria(RP / "models" / "entity" / "moeda.geo.json", geometria_moeda())
    salvar_geometria(RP / "models" / "entity" / "prop.geo.json", geometria_prop())
    salvar_json(RP / "render_controllers" / "moeda.render_controllers.json", controladores())
    salvar_json(BP / "entities" / "prop.json", entidade_prop_bp())
    salvar_json(BP / "entities" / "roleta.json", entidade_roleta_bp())
    salvar_json(BP / "entities" / "npc.json", entidade_npc_bp())
    salvar_json(RP / "entity" / "npc.entity.json", entidade_npc_rp())
    salvar_json(RP / "entity" / "roleta.entity.json", entidade_roleta_rp())
    salvar_json(RP / "animations" / "roleta.animation.json", animacao_roleta())
    (BP / "scripts" / "textos" / "props_modelos.js").write_text(modelos_js(), encoding="utf-8")
    ampliada = img.resize((LARGURA * 5, ALTURA * 5), Image.NEAREST)
    fundo = Image.new("RGBA", ampliada.size, (60, 60, 70, 255))
    fundo.alpha_composite(ampliada)
    previa_dir = ADDON / "docs" / "previas"
    previa_dir.mkdir(parents=True, exist_ok=True)
    fundo.save(previa_dir / "props.png")
    print(f"ok: {len(MODELOS)} modelos, props.png e arquivos gerados")


if __name__ == "__main__":
    main()
