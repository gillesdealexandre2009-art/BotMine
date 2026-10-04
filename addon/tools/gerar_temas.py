"""Gera os temas do painel (Sakura, Lunar e Espírito), os ícones da escolha de tema e a prévia dos 5 temas.

Uso, a partir da pasta addon/:
    python tools/gerar_temas.py            # gera tudo, mas preserva PNGs trocados à mão
    python tools/gerar_temas.py --forcar   # sobrescreve até os PNGs trocados à mão

Saída:
- vulpus_rp/textures/vulpus/ui/<tema>/*.png (+ .json de nineslice), para sakura, lunar e espirito: painel,
  cabecalho, botao (3 estados), fechar (3 estados), divisor, logo (128x128), titulo (130x28) e icone;
- vulpus_rp/textures/vulpus/ui/icone.png e black/icone.png: raposinha de 16x16 da escolha de tema
  (as outras peças do Laranja e do Black continuam com gerar_texturas.py e gerar_glyphs.py);
- docs/previas/temas.png: o Hub montado em cada tema (escala de GUI 2, fonte do jogo) e as peças.

Mesmo estilo das texturas atuais: desenho em baixa resolução, sem antialias, ampliado com NEAREST. Cada PNG
leva a assinatura do gerar_texturas.py; um PNG trocado à mão não é sobrescrito sem --forcar.
"""

from __future__ import annotations

import argparse
import io
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True  # sem __pycache__ dentro de tools/

from gerar_glyphs import (  # noqa: E402
    CINZA_PREVIA,
    MARGEM,
    MEIO,
    Previa,
    TextoJogo,
    _nineslice,
    _tingir,
    default8_do_jogo,
    folha_e2,
    pecas_black,
    titulo,
)
from gerar_texturas import (  # noqa: E402
    ADDON,
    ALFA_PAINEL,
    BRANCO,
    CREME,
    DETALHES_16,
    DETALHES_32,
    ESTADOS_BOTAO,
    ESTADOS_FECHAR,
    RAPOSA_16,
    RAPOSA_32,
    TRANSPARENTE,
    ampliar,
    botao,
    cabecalho,
    caixa,
    contornar,
    divisor,
    espelhar,
    fechar,
    linhas_de,
    logo,
    painel,
    pixel_art,
    raposa,
    rgba,
    salvar_json,
    salvar_png,
)

RP = ADDON / "vulpus_rp"
PASTA_UI = RP / "textures" / "vulpus" / "ui"
PREVIA = ADDON / "docs" / "previas" / "temas.png"
TEXTURAS_JOGO = "resource_packs/vanilla/__brarchive/textures"

# Ordem da escolha em Ajustes e da prévia. Laranja e Black são de todos; os outros, do selo Kitsune.
TEMAS = ("laranja", "black", "sakura", "lunar", "espirito")
NOMES = {"laranja": "Laranja", "black": "Black", "sakura": "Sakura", "lunar": "Lunar", "espirito": "Espirito"}
KITSUNE = ("sakura", "lunar", "espirito")

# ---------------------------------------------------------------- paletas

# Sakura: rosa-cerejeira sobre vinho escuro
ROSA = (242, 121, 170)  # #F279AA
ROSA_ESCURO = (184, 70, 118)  # #B84676
ROSA_MEDIO = (214, 96, 145)
ROSA_CLARO = (255, 184, 214)  # #FFB8D6
ROSA_PALIDO = (255, 224, 237)
VINHO = (110, 36, 70)  # #6E2446
VINHO_CLARO = (140, 50, 90)
FUNDO_SAKURA = (44, 22, 34)  # #2C1622
FUNDO_SAKURA_SOMBRA = (34, 16, 26)
FUNDO_SAKURA_ESCURO = (24, 11, 18)
FUNDO_SAKURA_CLARO = (62, 32, 48)
BORDA_SAKURA = (138, 70, 102)

# Lunar: azul-noite e prata
PRATA = (200, 212, 235)  # #C8D4EB
PRATA_ESCURA = (128, 143, 184)  # #808FB8
PRATA_CLARA = (232, 238, 250)
AZUL = (78, 110, 196)  # #4E6EC4
AZUL_ESCURO = (46, 68, 140)
AZUL_MEDIO = (60, 86, 166)
NOITE = (16, 24, 56)
FUNDO_LUNAR = (20, 26, 50)  # #141A32
FUNDO_LUNAR_SOMBRA = (15, 20, 40)
FUNDO_LUNAR_ESCURO = (10, 14, 30)
FUNDO_LUNAR_CLARO = (34, 44, 80)
BORDA_LUNAR = (70, 86, 140)
LUA_CLARA = (255, 247, 204)  # lua cor de pérola
LUA_SOMBRA = (226, 204, 128)
OLHO_LUNAR = (110, 236, 255)

# Espírito: roxo com fogo-fátuo azul
VIOLETA = (157, 92, 255)  # #9D5CFF
VIOLETA_ESCURO = (106, 53, 194)  # #6A35C2
VIOLETA_MEDIO = (126, 70, 230)
LILAS = (205, 170, 255)
CIANO = (92, 216, 255)  # #5CD8FF
CIANO_ESCURO = (40, 140, 210)
CIANO_CLARO = (196, 244, 255)
ROXO_NOITE = (40, 18, 74)
FUNDO_ESPIRITO = (30, 16, 48)  # #1E1030
FUNDO_ESPIRITO_SOMBRA = (23, 12, 38)
FUNDO_ESPIRITO_ESCURO = (15, 8, 26)
FUNDO_ESPIRITO_CLARO = (48, 28, 76)
BORDA_ESPIRITO = (96, 60, 150)

# Cor do cabeçalho de seção da Lista em cada tema (o label do JSON UI usa a mesma, em 0..1).
COR_CABECALHO = {
    "laranja": (242, 140, 56),
    "black": (242, 140, 56),
    "sakura": ROSA_CLARO,
    "lunar": PRATA,
    "espirito": CIANO,
}

# ---------------------------------------------------------------- peças do painel

# Por tema: camadas do painel, enfeites dos cantos, cabeçalho, botões, fechar e divisor.
PAINEL = {
    "sakura": [ROSA_ESCURO, ROSA, FUNDO_SAKURA_ESCURO, FUNDO_SAKURA_SOMBRA, FUNDO_SAKURA],
    "lunar": [PRATA_ESCURA, PRATA, FUNDO_LUNAR_ESCURO, FUNDO_LUNAR_SOMBRA, FUNDO_LUNAR],
    "espirito": [VIOLETA_ESCURO, VIOLETA, FUNDO_ESPIRITO_ESCURO, FUNDO_ESPIRITO_SOMBRA, FUNDO_ESPIRITO],
}

# Enfeites nos cantos fixos do nineslice (8 px): (x, y, cor) no canto de cima à esquerda; o conjunto
# "a" vai nos cantos de cima/esquerda e de baixo/direita (espelhado), o "b" nos outros dois.
ENFEITES = {
    "sakura": {  # flor de cerejeira e uma pétala caindo
        "a": [(4, 3, ROSA_CLARO), (3, 4, ROSA_CLARO), (4, 4, ROSA_PALIDO), (5, 4, ROSA_CLARO), (4, 5, ROSA_CLARO),
              (6, 6, ROSA)],
        "b": [(5, 4, ROSA_CLARO), (4, 5, ROSA)],
    },
    "lunar": {  # estrelinhas
        "a": [(4, 3, PRATA), (3, 4, PRATA), (4, 4, BRANCO), (5, 4, PRATA), (4, 5, PRATA), (6, 6, PRATA_ESCURA)],
        "b": [(4, 4, PRATA_CLARA)],
    },
    "espirito": {  # chama de fogo-fátuo
        "a": [(4, 3, CIANO_CLARO), (4, 4, CIANO), (3, 5, CIANO_ESCURO), (4, 5, CIANO), (5, 5, CIANO_ESCURO),
              (6, 3, CIANO_ESCURO)],
        "b": [(4, 4, CIANO), (4, 5, CIANO_ESCURO)],
    },
}

CABECALHO = {
    # (contorno, preenchimento, {linha: cor})
    "sakura": (VINHO, ROSA_ESCURO, {1: ROSA, 2: ROSA_MEDIO, 14: VINHO_CLARO}),
    "lunar": ((14, 20, 46), (34, 48, 100), {1: (92, 116, 190), 2: (58, 78, 146), 13: PRATA, 14: PRATA_ESCURA}),
    "espirito": (ROXO_NOITE, (78, 38, 140), {1: (140, 90, 230), 2: (106, 60, 190), 13: CIANO, 14: CIANO_ESCURO}),
}

# Botão: contorno, preenchimento, 2 linhas de cima e 2 de baixo (mesma ordem do gerar_texturas.py).
BOTOES = {
    "sakura": {
        "botao": (BORDA_SAKURA, FUNDO_SAKURA_CLARO, ((92, 52, 72), (74, 40, 58)), ((50, 25, 38), FUNDO_SAKURA)),
        "botao_hover": (VINHO, ROSA, (ROSA_CLARO, (248, 150, 190)), ((226, 106, 156), ROSA_ESCURO)),
        "botao_press": (VINHO, ROSA_ESCURO, ((150, 52, 94), (168, 62, 106)), (ROSA_ESCURO, ROSA_MEDIO)),
    },
    "lunar": {
        "botao": (BORDA_LUNAR, FUNDO_LUNAR_CLARO, ((56, 70, 118), (44, 56, 98)), ((24, 32, 60), FUNDO_LUNAR)),
        "botao_hover": ((30, 44, 96), AZUL, ((150, 176, 236), (112, 142, 220)), ((64, 94, 180), AZUL_ESCURO)),
        "botao_press": (NOITE, AZUL_ESCURO, ((30, 44, 100), (38, 54, 116)), (AZUL_ESCURO, AZUL_MEDIO)),
    },
    "espirito": {
        "botao": (BORDA_ESPIRITO, FUNDO_ESPIRITO_CLARO, ((72, 46, 108), (58, 36, 90)), ((34, 20, 54), FUNDO_ESPIRITO)),
        "botao_hover": (CIANO_ESCURO, VIOLETA, ((196, 160, 255), (176, 130, 255)), (VIOLETA_MEDIO, VIOLETA_ESCURO)),
        "botao_press": (ROXO_NOITE, VIOLETA_ESCURO, ((70, 32, 140), (84, 40, 160)), (VIOLETA_ESCURO, VIOLETA_MEDIO)),
    },
}

# Fechar: contorno, fundo, cor do X e quanto o X desce.
FECHAR = {
    "sakura": {
        "fechar": (BORDA_SAKURA, FUNDO_SAKURA, ROSA_PALIDO, 0),
        "fechar_hover": (ROSA, FUNDO_SAKURA_CLARO, ROSA, 0),
        "fechar_press": (VINHO, FUNDO_SAKURA_ESCURO, ROSA_ESCURO, 1),
    },
    "lunar": {
        "fechar": (BORDA_LUNAR, FUNDO_LUNAR, PRATA_CLARA, 0),
        "fechar_hover": (PRATA, FUNDO_LUNAR_CLARO, PRATA, 0),
        "fechar_press": (NOITE, FUNDO_LUNAR_ESCURO, PRATA_ESCURA, 1),
    },
    "espirito": {
        "fechar": (BORDA_ESPIRITO, FUNDO_ESPIRITO, LILAS, 0),
        "fechar_hover": (CIANO, FUNDO_ESPIRITO_CLARO, CIANO, 0),
        "fechar_press": (ROXO_NOITE, FUNDO_ESPIRITO_ESCURO, CIANO_ESCURO, 1),
    },
}

# Divisor: (linha, sombra)
DIVISOR = {"sakura": (ROSA, VINHO), "lunar": (PRATA, NOITE), "espirito": (CIANO, ROXO_NOITE)}


def painel_tema(tema: str) -> Image.Image:
    """32x32, nineslice 8: as camadas do painel laranja nas cores do tema e enfeites nos 4 cantos fixos."""
    camadas = PAINEL[tema]
    img = caixa(32, 32, 2, [rgba(camadas[0]), rgba(camadas[1])] + [rgba(c, ALFA_PAINEL) for c in camadas[2:]])
    px = img.load()
    for conjunto, cantos in (("a", ((False, False), (True, True))), ("b", ((True, False), (False, True)))):
        for x, y, cor in ENFEITES[tema][conjunto]:
            for espelha_x, espelha_y in cantos:
                px[31 - x if espelha_x else x, 31 - y if espelha_y else y] = rgba(cor)
    return img


def cabecalho_tema(tema: str) -> Image.Image:
    """32x16, nineslice 4."""
    contorno, preenchimento, faixas = CABECALHO[tema]
    return caixa(32, 16, 1, [rgba(contorno), rgba(preenchimento)], faixas)


def divisor_tema(tema: str) -> Image.Image:
    """32x2: linha do tema com sombra embaixo, sumindo nas pontas (como o laranja)."""
    linha, sombra = DIVISOR[tema]
    img = Image.new("RGBA", (32, 2), TRANSPARENTE)
    px = img.load()
    rampa = (40, 90, 150, 205, 240)
    for x in range(32):
        ponta = min(x, 31 - x)
        alfa = rampa[ponta] if ponta < len(rampa) else 255
        px[x, 0] = rgba(linha, alfa)
        px[x, 1] = rgba(sombra, alfa * 3 // 4)
    return img


# ---------------------------------------------------------------- raposas de cada tema

# Papéis do desenho da raposa (gerar_texturas.py): o pelo, O luz, d sombra, b orelha por dentro, c creme,
# s creme na sombra, e olho, n nariz, w brilho, h brilho do nariz; + contorno.
PELAGENS = {
    "laranja": None,  # a raposa original
    "black": {
        "o": (58, 52, 52), "O": (92, 84, 82), "d": (38, 34, 34), "b": (196, 98, 26), "c": CREME,
        "s": (232, 212, 190), "e": (242, 140, 56), "n": (14, 10, 10), "w": BRANCO, "h": (90, 80, 76),
        "contorno": (196, 98, 26),
    },
    "sakura": {
        "o": (232, 118, 166), "O": (250, 170, 204), "d": (194, 78, 130), "b": (120, 34, 74), "c": (255, 250, 252),
        "s": (240, 210, 224), "e": (70, 20, 44), "n": (100, 30, 62), "w": BRANCO, "h": (176, 104, 138),
        "contorno": (92, 24, 56),
    },
    "lunar": {
        "o": (172, 188, 226), "O": (224, 232, 250), "d": (118, 136, 188), "b": (36, 52, 108), "c": (246, 249, 255),
        "s": (198, 210, 236), "e": OLHO_LUNAR, "n": (26, 32, 66), "w": BRANCO, "h": (90, 104, 150),
        "contorno": (14, 18, 44),
    },
    "espirito": {
        "o": (204, 182, 255), "O": (236, 226, 255), "d": (160, 126, 236), "b": (70, 28, 132), "c": (250, 247, 255),
        "s": (218, 208, 244), "e": CIANO, "n": (40, 18, 74), "w": BRANCO, "h": (130, 100, 180),
        "contorno": (24, 8, 46),
    },
}


def raposa_pintada(metade: str, detalhes: list[tuple[int, int, str]], tema: str) -> Image.Image:
    """A raposa do gerar_texturas.py com a pelagem do tema (laranja = a original)."""
    pelagem = PELAGENS[tema]
    if pelagem is None:
        return raposa(metade, detalhes)
    img = contornar(pixel_art(espelhar(metade), pelagem), pelagem["contorno"])
    px = img.load()
    for x, y, ch in detalhes:
        px[x, y] = rgba(pelagem[ch])
    return img


def colar_arte(base: Image.Image, desenho: str, cores: dict[str, tuple], x: int, y: int) -> None:
    base.alpha_composite(pixel_art(linhas_de(desenho), cores), (x, y))


# Sakura: flor de cerejeira (5 pétalas e miolo), flor pequena e pétala solta.
FLOR = """
...PP...
..PPPP..
PP.pp.PP
PPPyyPPP
.PPyyPP.
..PppP..
PPP..PPP
.PP..PP.
"""
FLOR_PEQUENA = """
.PPP.
PPpPP
PpypP
PPpPP
.P.P.
"""
PETALA = """
.p
pP
"""
PETALA_VIRADA = """
p.
Pp
"""
CORES_FLOR = {"p": ROSA, "P": ROSA_PALIDO, "y": (255, 214, 120)}

# Lunar: lua crescente e brilho de estrela.
LUA = """
...LLL..
.LLll...
.Lll....
Lll.....
Lll.....
Lll.....
Lll.....
.Lll....
.LLll...
...LLL..
"""
ESTRELA = """
.e.
eEe
.e.
"""
CORES_LUA = {"L": LUA_SOMBRA, "l": LUA_CLARA, "e": PRATA, "E": BRANCO}


def logo_sakura() -> Image.Image:
    """32x32: raposa cor de cerejeira com flores de cerejeira na orelha e pétalas caindo."""
    img = raposa_pintada(RAPOSA_32, DETALHES_32, "sakura")
    flores = Image.new("RGBA", (32, 32), TRANSPARENTE)
    colar_arte(flores, FLOR, CORES_FLOR, 3, 7)
    colar_arte(flores, FLOR_PEQUENA, CORES_FLOR, 22, 9)
    colar_arte(flores, PETALA, CORES_FLOR, 1, 25)
    colar_arte(flores, PETALA, CORES_FLOR, 28, 27)
    colar_arte(flores, PETALA_VIRADA, CORES_FLOR, 25, 1)
    img.alpha_composite(contornar(flores, PELAGENS["sakura"]["contorno"]))
    return img


def logo_lunar() -> Image.Image:
    """32x32: raposa prateada de olhos brilhantes com a lua crescente entre as orelhas."""
    img = raposa_pintada(RAPOSA_32, DETALHES_32, "lunar")
    px = img.load()
    # olhos acesos: o brilho dos dois olhos ganha um halo claro
    for x, y in ((7, 17), (23, 17), (8, 16), (24, 16)):
        px[x, y] = rgba(BRANCO)
    ceu = Image.new("RGBA", (32, 32), TRANSPARENTE)
    colar_arte(ceu, LUA, CORES_LUA, 12, 0)
    colar_arte(ceu, ESTRELA, CORES_LUA, 20, 2)
    colar_arte(ceu, ESTRELA, CORES_LUA, 0, 22)
    colar_arte(ceu, ESTRELA, CORES_LUA, 28, 24)
    img.alpha_composite(contornar(ceu, PELAGENS["lunar"]["contorno"]))
    return img


# Cor da cauda pelo ponto do comprimento (0 = base, 1 = ponta): roxo no corpo, fogo azul e branco na ponta.
DEGRADE_CAUDA = [(0.0, (84, 40, 168)), (0.45, (110, 60, 212)), (0.62, (142, 100, 250)), (0.74, (104, 164, 255)),
                 (0.84, CIANO), (0.93, CIANO_CLARO)]


def cauda(angulo: float, comprimento: float, base: tuple[float, float], curva: float) -> Image.Image:
    """32x32: uma cauda em gota (larga no meio, ponta fina e curvada para fora), sem contorno."""
    img = Image.new("RGBA", (32, 32), TRANSPARENTE)
    px = img.load()
    passos = 80
    pontos = []
    for k in range(passos + 1):
        s = k / passos
        direcao = math.radians(angulo) + curva * s * s
        x = base[0] + math.cos(direcao) * comprimento * s
        y = base[1] - math.sin(direcao) * comprimento * s
        raio = 1.0 + 1.6 * math.sin(s / 0.6 * math.pi / 2) if s < 0.6 else 2.6 * ((1 - s) / 0.4) ** 0.8 + 0.3
        pontos.append((x, y, raio, s))
    for yy in range(32):
        for xx in range(32):
            alcance = [s for x, y, raio, s in pontos if math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= raio]
            if alcance:
                ponta = max(alcance)
                px[xx, yy] = rgba(next(cor for limite, cor in reversed(DEGRADE_CAUDA) if ponta >= limite))
    return img


def caudas_em_chama(n: int = 9) -> Image.Image:
    """32x32: leque de n caudas atrás da cabeça, cada uma com contorno; as do meio ficam por cima."""
    contorno = PELAGENS["espirito"]["contorno"]
    img = Image.new("RGBA", (32, 32), TRANSPARENTE)
    abertura = 150
    angulos = [90 + abertura / 2 - i * abertura / (n - 1) for i in range(n)]
    meio = (n - 1) / 2
    for i in sorted(range(n), key=lambda i: -abs(i - meio)):
        lado = 1 if i < meio else -1 if i > meio else 0
        img.alpha_composite(contornar(cauda(angulos[i], 17, (15.5, 24.5), 0.35 * lado), contorno))
    return img


# Espírito: chamas soltas de fogo-fátuo (kitsunebi).
CHAMA = """
.C.
.cC
cCc
cCc
.c.
"""
CORES_CHAMA = {"c": CIANO, "C": CIANO_CLARO}


def logo_espirito() -> Image.Image:
    """32x32: raposinha lilás de olhos azuis na frente de um leque de nove caudas em chama."""
    contorno = PELAGENS["espirito"]["contorno"]
    img = caudas_em_chama()
    img.alpha_composite(raposa_pintada(RAPOSA_16, DETALHES_16, "espirito"), (8, 17))
    chamas = Image.new("RGBA", (32, 32), TRANSPARENTE)
    colar_arte(chamas, CHAMA, CORES_CHAMA, 1, 25)
    colar_arte(chamas, CHAMA, CORES_CHAMA, 28, 25)
    img.alpha_composite(contornar(chamas, contorno))
    return img


def logo_tema(tema: str) -> Image.Image:
    """128x128 (desenho 32x32 ampliado 4x), fundo transparente."""
    desenho = {"sakura": logo_sakura, "lunar": logo_lunar, "espirito": logo_espirito}[tema]()
    return ampliar(desenho, 4)


def icone_tema(tema: str) -> Image.Image:
    """16x16: a raposinha do item do menu com a pelagem do tema (botão da escolha em Ajustes)."""
    return raposa_pintada(RAPOSA_16, DETALHES_16, tema)


# ---------------------------------------------------------------- título VULPUS

# Degradê do título por tema, do contorno escuro ao brilho (troca o dourado do original pelo brilho).
DEGRADE_TITULO = {
    "sakura": [(64, 14, 40), (132, 40, 84), (208, 92, 146), (255, 176, 210), (255, 236, 244)],
    "lunar": [(12, 18, 44), (52, 70, 128), (126, 146, 200), (206, 218, 244), (252, 253, 255)],
    "espirito": [(26, 8, 52), (86, 40, 168), (142, 96, 255), (120, 210, 255), (218, 248, 255)],
}


def titulo_tema(tema: str, original: Image.Image) -> Image.Image:
    """O título VULPUS recolorido: cada pixel vai para o degradê do tema pela luminosidade."""
    saida = original.copy()
    px = saida.load()
    valores = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b, a in original.getdata() if a]
    menor, maior = min(valores), max(valores)
    degrade = DEGRADE_TITULO[tema]
    for y in range(saida.height):
        for x in range(saida.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            t = (0.299 * r + 0.587 * g + 0.114 * b - menor) / max(1.0, maior - menor)
            pos = t * (len(degrade) - 1)
            i = min(len(degrade) - 2, int(pos))
            f = pos - i
            cor = tuple(round(c0 + (c1 - c0) * f) for c0, c1 in zip(degrade[i], degrade[i + 1]))
            px[x, y] = (*cor, 255)
    return saida


# ---------------------------------------------------------------- conjunto de cada tema


def pecas_tema(tema: str, img_titulo: Image.Image) -> dict[str, tuple[Image.Image, int | None]]:
    """nome -> (imagem, nineslice_size ou None), com os mesmos nomes e tamanhos das peças laranja."""
    return {
        "painel": (painel_tema(tema), 8),
        "cabecalho": (cabecalho_tema(tema), 4),
        **{nome: (botao(*estado), 4) for nome, estado in BOTOES[tema].items()},
        **{nome: (fechar(*estado), None) for nome, estado in FECHAR[tema].items()},
        "divisor": (divisor_tema(tema), None),
        "logo": (logo_tema(tema), None),
        "titulo": (titulo_tema(tema, img_titulo), None),
        "icone": (icone_tema(tema), None),
    }


def todas_as_pecas(img_titulo: Image.Image) -> dict[str, dict[str, Image.Image]]:
    """Peças dos 5 temas para a prévia (Laranja e Black como os outros scripts geram)."""
    laranja = {
        "painel": painel(), "cabecalho": cabecalho(),
        **{nome: botao(*estado) for nome, estado in ESTADOS_BOTAO.items()},
        **{nome: fechar(*estado) for nome, estado in ESTADOS_FECHAR.items()},
        "divisor": divisor(), "logo": logo(), "titulo": img_titulo, "icone": icone_tema("laranja"),
    }
    black = {nome: img for nome, (img, _) in pecas_black().items()}
    black.update({"logo": laranja["logo"], "titulo": img_titulo, "icone": icone_tema("black")})
    pecas = {"laranja": laranja, "black": black}
    for tema in KITSUNE:
        pecas[tema] = {nome: img for nome, (img, _) in pecas_tema(tema, img_titulo).items()}
    return pecas


# ---------------------------------------------------------------- prévia: o Hub montado em cada tema

HUB_GUI = (330, 210)
SLOTS_PREVIA = [
    ("Spawn", "items/compass_item"), ("Casas", "items/bed_red"), ("TPA", "items/ender_pearl"),
    ("Voltar", "items/totem"), ("Perfil", "items/name_tag"),
    ("Caudas", "items/gold_nugget"), ("Leilao", "items/gold_ingot"), ("Cla", "items/banner_pattern"),
    ("Ajustes", "ui/gear"), ("Regras", "items/book_writable"),
]
TEXTO_HUB = [
    "Que bom te ver na",
    "toca, §6Luiz§r!",
    " §fRaposa Lunar §8- §7Nv §f17",
    "§r1.250 Caudas",
    "§77 online agora",
    "§7Diaria todo dia =",
    "§7mais Caudas!",
]


class Icones:
    """Ícones vanilla lidos do jogo instalado (quadrado em branco se não achar)."""

    def __init__(self) -> None:
        self.arquivos: dict[str, bytes] = {}
        import brarchive
        from verificar_ui import pastas_do_jogo

        for pasta in pastas_do_jogo(None):
            for nome in ("items", "ui"):
                caminho = pasta / TEXTURAS_JOGO / f"{nome}.brarchive"
                if caminho.is_file():
                    for arquivo, dados in brarchive.ler(caminho).items():
                        self.arquivos[f"{nome}/{arquivo}"] = dados
            break

    def __call__(self, caminho: str, lado: int) -> Image.Image:
        dados = self.arquivos.get(caminho + ".png")
        if dados is None:
            return Image.new("RGBA", (lado, lado), (90, 90, 90, 255))
        img = Image.open(io.BytesIO(dados)).convert("RGBA")
        img = img.crop((0, 0, img.width, img.width))  # tiras animadas: só o 1º quadro
        return img.resize((lado, lado), Image.NEAREST)


def esticar(peca: Image.Image, n: int, larg: int, alt: int) -> Image.Image:
    """Nineslice na escala da prévia (cantos de n px de GUI viram n * MEIO)."""
    return _nineslice(ampliar(peca, MEIO), n * MEIO, larg * MEIO, alt * MEIO)


def colar_texto(base: Image.Image, img: Image.Image, x: int, y: int) -> None:
    base.alpha_composite(img, (x, y))


def hub_previa(pecas: dict[str, Image.Image], jogo: TextoJogo, icones: Icones, hover: int) -> Image.Image:
    """O Hub como o vulpus_menu.json monta (330x210 de GUI), em escala de GUI 2."""
    larg, alt = HUB_GUI
    img = Image.new("RGBA", (larg * MEIO, alt * MEIO), TRANSPARENTE)
    img.alpha_composite(esticar(pecas["painel"], 8, larg, alt))
    img.alpha_composite(esticar(pecas["cabecalho"], 4, larg - 4, 24), (2 * MEIO, 2 * MEIO))
    img.alpha_composite(pecas["titulo"].resize((97 * MEIO, 21 * MEIO), Image.NEAREST), (((larg - 97) // 2 + 1) * MEIO, 3 * MEIO))
    img.alpha_composite(ampliar(pecas["fechar"], MEIO), ((larg - 6 - 16) * MEIO, 6 * MEIO))
    img.alpha_composite(esticar(pecas["botao"], 4, 20, 20), (6 * MEIO, 4 * MEIO))
    img.alpha_composite(icones("ui/permissions_op_crown", 16 * MEIO), (8 * MEIO, 6 * MEIO))
    creme = tuple(CREME)
    topo, x_esq, x_dir = 28, 8, larg - 8 - 92
    for i, (rotulo, icone) in enumerate(SLOTS_PREVIA):
        x = x_esq if i < 5 else x_dir
        y = topo + (i % 5) * 31
        estado = "botao_hover" if i == hover else "botao"
        img.alpha_composite(esticar(pecas[estado], 4, 92, 27), (x * MEIO, y * MEIO))
        img.alpha_composite(icones(icone, 18 * MEIO), ((x + 7) * MEIO, (y + 4) * MEIO + MEIO // 2))
        texto = _tingir(jogo.render(rotulo), creme)
        colar_texto(img, texto, (x + 28) * MEIO, (y + 9) * MEIO - jogo.folga())
    centro = larg // 2
    linhas = [_tingir(jogo.render(linha), creme) for linha in TEXTO_HUB]
    altura_texto = len(linhas) * 10
    y_logo = topo + (151 - (60 + 4 + altura_texto)) // 2
    img.alpha_composite(pecas["logo"].resize((60 * MEIO, 60 * MEIO), Image.NEAREST), ((centro - 30) * MEIO, y_logo * MEIO))
    y = y_logo + 64
    for linha in linhas:
        colar_texto(img, linha, centro * MEIO - linha.width // 2, y * MEIO - jogo.folga())
        y += 10
    return img


def lista_previa(pecas: dict[str, Image.Image], jogo: TextoJogo, cor_cabecalho: tuple, icones: Icones) -> Image.Image:
    """Pedaço da Lista (270 de largura): cabeçalho de seção, divisor e dois botões (um em hover)."""
    larg, alt = 270, 118
    img = Image.new("RGBA", (larg * MEIO, alt * MEIO), TRANSPARENTE)
    img.alpha_composite(esticar(pecas["painel"], 8, larg, alt))
    img.alpha_composite(esticar(pecas["cabecalho"], 4, larg - 4, 24), (2 * MEIO, 2 * MEIO))
    nome = _tingir(jogo.render("Ajustes"), tuple(CREME))
    colar_texto(img, nome, (larg * MEIO - nome.width) // 2, 9 * MEIO - jogo.folga())
    img.alpha_composite(ampliar(pecas["fechar_hover"], MEIO), ((larg - 6 - 16) * MEIO, 6 * MEIO))
    cab = _tingir(jogo.render("Tema do menu"), cor_cabecalho)
    colar_texto(img, cab, 10 * MEIO, 35 * MEIO - jogo.folga())
    img.alpha_composite(pecas["divisor"].resize(((larg - 20) * MEIO, 2 * MEIO), Image.NEAREST), (10 * MEIO, 47 * MEIO))
    for i, (rotulo, estado) in enumerate((("Tema: Sakura", "botao_hover"), ("Pedidos de TPA", "botao_press"))):
        y = 54 + i * 32
        img.alpha_composite(esticar(pecas[estado], 4, larg - 16, 30), (8 * MEIO, y * MEIO))
        icone = pecas["icone"] if i == 0 else icones("ui/gear", 16)
        img.alpha_composite(icone.resize((20 * MEIO, 20 * MEIO), Image.NEAREST), (13 * MEIO, (y + 5) * MEIO))
        texto = _tingir(jogo.render(rotulo), tuple(CREME))
        colar_texto(img, texto, 40 * MEIO, (y + 10) * MEIO - jogo.folga())
    return img


# Peças soltas ao lado do Hub, ampliadas 3x: (legenda, peça).
TIRAS = [("normal", "botao"), ("hover", "botao_hover"), ("press", "botao_press"), ("icone", "icone"),
         ("X", "fechar"), ("X hover", "fechar_hover"), ("X press", "fechar_press")]


def previa(pecas: dict[str, dict[str, Image.Image]], default8: Image.Image, e2: Image.Image) -> Image.Image:
    jogo = TextoJogo(default8, {0xE2: e2})
    icones = Icones()
    p = Previa(2 * (HUB_GUI[0] * MEIO) + 3 * MARGEM + 40)
    for n, tema in enumerate(TEMAS):
        dono = "selo Kitsune" if tema in KITSUNE else "todos"
        p.titulo_bloco(f"{NOMES[tema]}  ({dono})   Hub em escala de GUI 2, com um botao em hover; ao lado, um pedaco da Lista")
        hub = hub_previa(pecas[tema], jogo, icones, hover=1 + n % 4)
        lista = lista_previa(pecas[tema], jogo, COR_CABECALHO[tema], icones)
        p.colar(hub, MARGEM, p.y)
        x0 = MARGEM * 2 + hub.width
        p.colar(lista, x0, p.y)
        y = p.y + lista.height + 10
        p.texto(x0, y, "logo (1x)", cor=CINZA_PREVIA)
        p.colar(pecas[tema]["logo"], x0, y + 14, xadrez=True)
        for i, (rotulo, nome) in enumerate(TIRAS):
            x = x0 + 128 + 16 + (i % 4) * 64
            yy = y + (i // 4) * 70
            p.texto(x, yy, rotulo, cor=CINZA_PREVIA)
            p.colar(ampliar(pecas[tema][nome], 3), x, yy + 14, xadrez=True)
        p.y += hub.height + 2 * MARGEM
    return p.final()


# ---------------------------------------------------------------- gravação


def principal() -> int:
    parser = argparse.ArgumentParser(description="Gera os temas do painel do addon Vulpus.")
    parser.add_argument("--forcar", action="store_true", help="sobrescreve também os PNGs trocados à mão")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # acentos certos também no Git Bash

    saidas: list[tuple[Path, str]] = []

    def gravar(img: Image.Image, caminho: Path) -> None:
        saidas.append((caminho, salvar_png(img, caminho, args.forcar)))

    img_titulo = titulo()
    for tema in KITSUNE:
        for nome, (peca, nineslice) in pecas_tema(tema, img_titulo).items():
            caminho = PASTA_UI / tema / f"{nome}.png"
            gravar(peca, caminho)
            if nineslice:
                salvar_json({"nineslice_size": nineslice, "base_size": [peca.width, peca.height]},
                            caminho.with_suffix(".json"))
    gravar(icone_tema("laranja"), PASTA_UI / "icone.png")
    gravar(icone_tema("black"), PASTA_UI / "black" / "icone.png")

    default8 = default8_do_jogo()
    if default8 is None:
        saidas.append((PREVIA, "mantido (jogo não encontrado: falta a fonte default8 para a prévia)"))
    else:
        gravar(previa(todas_as_pecas(img_titulo), default8, folha_e2()), PREVIA)

    for caminho, status in saidas:
        print(f"  {caminho.relative_to(ADDON).as_posix():48} {status}")
    print(f"Temas prontos ({len(saidas)} PNGs).")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
