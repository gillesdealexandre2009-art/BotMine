"""Gera os glyphs e as texturas da fase 2 do addon Vulpus em pixel art (Pillow).

Uso, a partir da pasta addon/:
    python tools/gerar_glyphs.py            # gera tudo, mas preserva PNGs trocados à mão
    python tools/gerar_glyphs.py --forcar   # sobrescreve até os PNGs trocados à mão

Saída:
- vulpus_rp/font/glyph_E2.png (ícones) e glyph_E3.png (título VULPUS), as duas 512x512 com células de 32 px;
- vulpus_rp/textures/vulpus/ui/titulo.png (130x28, a partir de <repo>/IMGS/minecraft_title.png);
- vulpus_rp/textures/vulpus/ui/black/*.png (+ .json de nineslice): peças do tema Black;
- vulpus_chat_bp/pack_icon.png (ícone do pack com um balão de fala);
- docs/previas/glyphs.png (prévia ampliada, com o código de cada glyph, e simulação no tamanho do jogo).

Tamanho no jogo (medido nos prints do dono): numa folha de página privada, 1 texel = 1 px de GUI, qualquer
que seja o tamanho da folha ou da célula (a arte de 16 px saiu com ~16 px de GUI tanto na folha de 256 quanto
na de 512, o dobro da letra). A letra da default8 tem 8 px de GUI (a maiúscula, 7). Por isso cada ícone tem
no máximo 9x9 texels, contorno incluído, como os corações e a comida da HUD vanilla. A célula de 32 é
desenhada centrada na linha de texto: a maiúscula cai nas linhas 12..18 da célula, e a arte centralizada na
vertical (9 de altura: linhas 11..19) fica alinhada com a letra.

A tabela de códigos é fixa (docs/spec/03_spec_fase2.md §4.2) e tem que bater com vulpus_bp/scripts/glyphs.js.
Usa a mesma proteção do gerar_texturas.py: um PNG trocado à mão não é sobrescrito sem --forcar.
"""

from __future__ import annotations

import argparse
import io
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Nem todo Python põe a pasta do script no sys.path (o embutido deste PC não põe).
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True  # sem __pycache__ dentro de tools/

from gerar_texturas import (  # noqa: E402
    ADDON,
    ALFA_PAINEL,
    BORDA,
    BRANCO,
    BRASA,
    BRASA_CLARA,
    CONTORNO,
    CREME,
    CREME_SOMBRA,
    FUNDO_CLARO,
    LARANJA,
    LARANJA_CLARO,
    LARANJA_ESCURO,
    LARANJA_MEDIO,
    OLHO,
    TRANSPARENTE,
    ampliar,
    botao,
    caixa,
    contornar,
    fechar,
    linhas_de,
    pixel_art,
    rgba,
    salvar_json,
    salvar_png,
)

RP = ADDON / "vulpus_rp"
CHAT = ADDON / "vulpus_chat_bp"
PASTA_FONTE = RP / "font"
PASTA_UI = RP / "textures" / "vulpus" / "ui"
PASTA_BLACK = PASTA_UI / "black"
IMAGEM_TITULO = ADDON.parent / "IMGS" / "minecraft_title.png"
PREVIA = ADDON / "docs" / "previas" / "glyphs.png"

# ---------------------------------------------------------------- paleta dos glyphs

# Um caractere por cor; '.' é transparente. As cores da paleta Vulpus vêm do gerar_texturas.py.
CORES = {
    # Vulpus
    "o": LARANJA,
    "O": LARANJA_CLARO,
    "d": LARANJA_ESCURO,
    "b": BRASA,
    "B": BRASA_CLARA,
    "c": CREME,
    "s": CREME_SOMBRA,
    "e": OLHO,
    "k": CONTORNO,
    "w": BRANCO,
    # verdes (broto)
    "l": (142, 224, 106),
    "g": (93, 187, 63),  # #5DBB3F
    "G": (62, 138, 42),  # #3E8A2A
    # terra e madeira
    "m": (139, 90, 48),
    "n": (94, 58, 28),
    "h": BORDA,
    "H": (92, 58, 34),
    # outono
    "r": (226, 85, 43),  # #E2552B
    "R": (160, 50, 26),
    # lua
    "a": (159, 199, 232),  # #9FC7E8
    "A": (110, 152, 192),
    # ouro
    "z": (255, 240, 170),
    "y": (255, 211, 77),  # #FFD34D
    "Y": (224, 161, 0),  # #E0A100
    "Z": (168, 112, 0),
    # joias, helper, kitsune, xp e encanto
    "j": (230, 48, 58),
    "J": (150, 20, 32),
    "t": (79, 224, 176),  # #4FE0B0
    "T": (40, 160, 124),
    "i": (255, 196, 255),
    "p": (244, 127, 255),  # #F47FFF
    "P": (184, 79, 208),  # #B84FD0
    "x": (124, 252, 74),  # #7CFC4A
    "X": (63, 168, 30),  # #3FA81E
    "v": (178, 107, 255),  # #B26BFF
    "V": (120, 60, 200),
    "u": (216, 180, 255),
    # barra de nível
    "f": FUNDO_CLARO,  # #3A2A22
    # pedra (torre do clã)
    "W": (212, 212, 220),
    "q": (160, 160, 170),
    "Q": (108, 108, 120),
}

# ---------------------------------------------------------------- desenhos (até 7x7; o contorno escuro é automático)
#
# Com o contorno de 1 px o ícone fecha em até 9x9 texels, o tamanho dos corações, da armadura e da comida
# da HUD vanilla. No jogo 1 texel = 1 px de GUI, então 9 texels = a altura da letra mais 1 px em cima e
# 1 embaixo. Um '.' cercado de cor vira contorno (furo escuro), como o buraco da etiqueta.

BROTO = """
gl...lg
Ggl.lgG
.GgGgG.
...G...
..mGm..
.mmmmm.
nnnnnnn
"""

RAPOSA = """
o.....o
ob...bo
ooooooo
oeoooeo
ccooocc
.ccccc.
..cec..
"""

FOLHA = """
....rrO
..rrrbr
.rrrbrR
.rrbrRR
.rbrRR.
.bRRR..
b......
"""

LUA = """
.ccc...
cca....
ca.....
ca...w.
ca.....
cca....
.ccc...
"""

BRILHO = """
...y...
...y...
..yzY..
yyzwzYY
..YzY..
...Y...
...Y...
"""

ADMIN = """
z..z..z
yy.y.yy
yyyyyyy
yjyjyjy
YYYYYYY
ZZZZZZZ
"""

STAFF = """
Ooooocc
Ooooccd
oooccdd
ooccddd
.ccddd.
..cdd..
...d...
"""

HELPER = """
...t...
..ttt..
ttwttTT
.tttTT.
..tTT..
.tT.TT.
.T...T.
"""

KITSUNE = """
...p...
..pp...
..ppp.p
.ppippP
ppiwipP
piwwwiP
.PiwiP.
"""

CAUDAS = """
.yyyyy.
yzyyycY
yyyyocY
yyyooYY
yyooyYY
yodyYYY
.YYYYY.
"""

NIVEL = """
...x...
..xcx..
.xcccX.
xxxcxXX
.xxcxX.
..xxX..
...X...
"""

# Barra de nível: 4x7 exatos (a altura da maiúscula), sem o contorno automático. A coluna 0 é a divisória;
# como o avanço do glyph vai até a última coluna com pixel, os segmentos encostam e formam a barra.
BARRA_CHEIA = """
bbbb
bOOO
booo
booo
booo
bddd
bbbb
"""

BARRA_VAZIA = """
hhhh
hfff
hfff
hfff
hfff
hfff
hhhh
"""

ONLINE = """
.ccs.xx
.ccs.xX
.......
.ccs...
cccss..
cccss..
cccss..
"""

LOCAL = """
.ooo.
oOooo
oocod
ooood
.ood.
..d..
"""

TEMPO = """
bbbbbbb
.coooc.
..coc..
...o...
..coc..
.coooc.
bbbbbbb
"""

LEILAO = """
..zy...
.yyyY..
.yyyYY.
..myYYZ
.mm.YZ.
mn.....
n......
"""

VENDER = """
..OOOOO
.Oooooo
Oo.oood
.oooood
..ddddd
"""

COMPRAR = """
..nnn..
.n...n.
mmmmmmm
hmmmmmn
hmmmmmn
hmmmmmn
nnnnnnn
"""

CAIXA = """
hhhhhhh
mmmmmmm
nnnynnn
mmmYmmm
mmmmmmm
nnnnnnn
"""

BUSCA = """
.ccc...
cwaac..
caaac..
caaac..
.cccb..
....bb.
.....bb
"""

HISTORICO = """
ccccs.
cbbcss
cccccc
cbbbbc
cccccc
cbbbbc
cccccc
"""

ENCANTADO = """
.u.....
uvV....
.V...u.
....uvV
..u..V.
.uvV...
..V....
"""

# Clãs (linha 3 da folha E2): emblemas liberados por nível e as espadas da guerra.
ESCUDO = """
Ooocood
ooocood
ccccccc
ooocood
.oocod.
..ocd..
...c...
"""

BANDEIRA = """
mOOOOOO
moocoo.
mdddddd
m......
m......
m......
nn.....
"""

TORRE = """
W.W.W.W
WWWWWWQ
.qqqqQ.
.qqnqQ.
.qqqqQ.
.qnnqQ.
QqnnqQQ
"""

PATA = """
.oo.oo.
.oo.oo.
.......
o.ooo.o
.ooooo.
.ooooo.
..o.o..
"""

TROFEU = """
yyyyyyy
yzyyyYy
.yyyyY.
..yYY..
...Y...
..yYY..
.ZZZZZ.
"""

GUERRA = """
c.....c
.c...c.
..c.c..
...c...
.Yc.cY.
.mY.Ym.
m.....m
"""

# (linha, coluna) na folha E2 -> nome da constante em glyphs.js
ICONES: dict[tuple[int, int], str] = {
    (0, 0): "BROTO",
    (0, 1): "RAPOSA",
    (0, 2): "FOLHA",
    (0, 3): "LUA",
    (0, 4): "BRILHO",
    (0, 5): "ADMIN",
    (0, 6): "STAFF",
    (0, 7): "HELPER",
    (0, 8): "KITSUNE",
    (1, 0): "CAUDAS",
    (1, 1): "NIVEL",
    (1, 2): "BARRA_CHEIA",
    (1, 3): "BARRA_VAZIA",
    (1, 4): "ONLINE",
    (1, 5): "LOCAL",
    (1, 6): "TEMPO",
    (2, 0): "LEILAO",
    (2, 1): "VENDER",
    (2, 2): "COMPRAR",
    (2, 3): "CAIXA",
    (2, 4): "BUSCA",
    (2, 5): "HISTORICO",
    (2, 6): "ENCANTADO",
    (3, 0): "ESCUDO",
    (3, 1): "BANDEIRA",
    (3, 2): "TORRE",
    (3, 3): "PATA",
    (3, 4): "TROFEU",
    (3, 5): "GUERRA",
}

DESENHOS = {
    "BROTO": BROTO,
    "RAPOSA": RAPOSA,
    "FOLHA": FOLHA,
    "LUA": LUA,
    "BRILHO": BRILHO,
    "ADMIN": ADMIN,
    "STAFF": STAFF,
    "HELPER": HELPER,
    "KITSUNE": KITSUNE,
    "CAUDAS": CAUDAS,
    "NIVEL": NIVEL,
    "BARRA_CHEIA": BARRA_CHEIA,
    "BARRA_VAZIA": BARRA_VAZIA,
    "ONLINE": ONLINE,
    "LOCAL": LOCAL,
    "TEMPO": TEMPO,
    "LEILAO": LEILAO,
    "VENDER": VENDER,
    "COMPRAR": COMPRAR,
    "CAIXA": CAIXA,
    "BUSCA": BUSCA,
    "HISTORICO": HISTORICO,
    "ENCANTADO": ENCANTADO,
    "ESCUDO": ESCUDO,
    "BANDEIRA": BANDEIRA,
    "TORRE": TORRE,
    "PATA": PATA,
    "TROFEU": TROFEU,
    "GUERRA": GUERRA,
}

SEM_CONTORNO = {"BARRA_CHEIA", "BARRA_VAZIA"}
GLYPHS_JS = ADDON / "vulpus_bp" / "scripts" / "glyphs.js"

CELULA_E2 = 32
CELULA_E3 = 32
MAX_ICONE = 9  # lado máximo da arte de um ícone, contorno incluído (texels = px de GUI)
FATIAS_TITULO = 5
ALFA_LARGURA = 20  # ~8 %: marca a largura exata da fatia sem aparecer


def arte(nome: str) -> Image.Image:
    """Desenho do glyph já com contorno (a barra de nível não leva contorno)."""
    img = pixel_art(linhas_de(DESENHOS[nome]), CORES)
    img = img if nome in SEM_CONTORNO else contornar(_com_margem(img), CONTORNO)
    caixa_arte = img.getbbox()
    if caixa_arte is None or max(caixa_arte[2] - caixa_arte[0], caixa_arte[3] - caixa_arte[1]) > MAX_ICONE:
        raise ValueError(f"{nome}: a arte precisa ter de 1 a {MAX_ICONE} texels de lado, com o contorno")
    return img


def _com_margem(img: Image.Image) -> Image.Image:
    """Abre 1 px de folga em volta, para o contorno não ser cortado."""
    saida = Image.new("RGBA", (img.width + 2, img.height + 2), TRANSPARENTE)
    saida.alpha_composite(img, (1, 1))
    return saida


def na_celula(img: Image.Image, celula: int) -> Image.Image:
    """Recorta a arte e encosta à esquerda (x = 0), centralizada na vertical.

    O jogo desenha a célula de 32 centrada na linha de texto: a maiúscula cai nas linhas 12..18 da célula
    e a letra inteira (com a perna do "g") nas 12..19. Centralizada, uma arte de 9 ocupa as linhas 11..19,
    uma de 8 as 12..19 e uma de 7 (a barra) as 12..18, alinhadas com a letra.
    """
    caixa_arte = img.getbbox()
    if caixa_arte is None:
        raise ValueError("glyph vazio")
    recorte = img.crop(caixa_arte)
    if recorte.width > celula or recorte.height > celula:
        raise ValueError(f"glyph de {recorte.width}x{recorte.height} não cabe na célula de {celula}")
    saida = Image.new("RGBA", (celula, celula), TRANSPARENTE)
    saida.alpha_composite(recorte, (0, (celula - recorte.height) // 2))
    return saida


def conferir_glyphs_js() -> None:
    """Garante que glyphs.js e ICONES usam os mesmos códigos (0xE200 + linha*16 + coluna)."""
    texto = GLYPHS_JS.read_text(encoding="utf-8")
    codigos = {nome: codigo.upper() for nome, codigo in re.findall(r'(\w+): "\\uE2([0-9A-Fa-f]{2})"', texto)}
    esperados = {nome: f"{linha:X}{coluna:X}" for (linha, coluna), nome in ICONES.items()}
    diferentes = {nome for nome in esperados.keys() | codigos.keys() if esperados.get(nome) != codigos.get(nome)}
    if diferentes:
        raise ValueError(f"glyphs.js não bate com a tabela deste script: {', '.join(sorted(diferentes))}")


def folha_e2() -> Image.Image:
    """Folha de ícones, 512x512 com células de 32."""
    folha = Image.new("RGBA", (16 * CELULA_E2, 16 * CELULA_E2), TRANSPARENTE)
    for (linha, coluna), nome in ICONES.items():
        folha.alpha_composite(na_celula(arte(nome), CELULA_E2), (coluna * CELULA_E2, linha * CELULA_E2))
    return folha


# ---------------------------------------------------------------- título VULPUS

LARGURA_TITULO, ALTURA_TITULO = 130, 28
# Título do chat (folha E3): 11 texels = 11 px de GUI, ~1,5x a altura da maiúscula (7), em 5 fatias de 11.
LARGURA_TITULO_CHAT, ALTURA_TITULO_CHAT = 55, 11
CORTE_ALFA = 110  # alfa médio a partir do qual o pixel reduzido fica opaco


def titulo(largura: int = LARGURA_TITULO, altura: int = ALTURA_TITULO) -> Image.Image:
    """largura x altura (padrão 130x28): a arte de IMGS/minecraft_title.png reduzida por média de área, centralizada e sem distorção.

    A arte original tem letras inclinadas fora de uma grade de pixels, então amostrar o centro de cada
    "pixel" gera degraus. A média de área guarda o degradê dourado; o alfa vira 0 ou 255 para a borda
    continuar nítida.
    """
    with Image.open(IMAGEM_TITULO) as original:
        fonte = original.convert("RGBA")
    caixa_arte = fonte.getbbox()
    if caixa_arte is None:
        raise ValueError(f"{IMAGEM_TITULO} está vazia")
    fonte = fonte.crop(caixa_arte)
    escala = min(largura / fonte.width, altura / fonte.height)
    larg, alt = max(1, round(fonte.width * escala)), max(1, round(fonte.height * escala))
    reduzida = fonte.resize((larg, alt), Image.BOX)
    px = reduzida.load()
    for y in range(alt):
        for x in range(larg):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= CORTE_ALFA else TRANSPARENTE
    saida = Image.new("RGBA", (largura, altura), TRANSPARENTE)
    saida.alpha_composite(reduzida, ((largura - larg) // 2, (altura - alt) // 2))
    return saida


def folha_e3(img_titulo: Image.Image) -> Image.Image:
    """Título do chat (55x11) em 5 fatias de 11 px, cada uma numa célula de 32 px (x = 0, y = 10..20)."""
    folha = Image.new("RGBA", (16 * CELULA_E3, 16 * CELULA_E3), TRANSPARENTE)
    largura, altura = img_titulo.width // FATIAS_TITULO, img_titulo.height
    topo = (CELULA_E3 - altura) // 2
    for i in range(FATIAS_TITULO):
        fatia = img_titulo.crop((i * largura, 0, (i + 1) * largura, altura))
        px = fatia.load()
        for x in (0, largura - 1):
            if not any(px[x, y][3] for y in range(altura)):
                px[x, altura // 2] = rgba(CONTORNO, ALFA_LARGURA)
        folha.alpha_composite(fatia, (i * CELULA_E3, topo))
    return folha


# ---------------------------------------------------------------- tema Black

PRETO = (16, 16, 16)  # #101010
PRETO_CLARO = (28, 28, 28)  # #1C1C1C
PRETO_SOMBRA = (8, 8, 8)  # #080808
PRETO_MEIO = (12, 12, 12)
PRETO_LUZ = (42, 42, 42)
PRETO_LUZ_2 = (34, 34, 34)
MARROM_HOVER = (42, 26, 14)  # #2A1A0E

# Botão: contorno, preenchimento, 2 linhas de cima e 2 de baixo (mesma ordem do gerar_texturas.py).
ESTADOS_BOTAO_BLACK = {
    "botao": (LARANJA_ESCURO, PRETO_CLARO, (PRETO_LUZ, PRETO_LUZ_2), ((22, 22, 22), PRETO)),
    "botao_hover": (LARANJA, MARROM_HOVER, ((74, 44, 20), (58, 35, 17)), ((34, 21, 11), (28, 17, 9))),
    "botao_press": (BRASA, LARANJA_ESCURO, ((140, 66, 18), (168, 82, 24)), (LARANJA_ESCURO, LARANJA_MEDIO)),
}

# Fechar: contorno, fundo, cor do X e quanto o X desce.
ESTADOS_FECHAR_BLACK = {
    "fechar": (LARANJA_ESCURO, PRETO_CLARO, CREME, 0),
    "fechar_hover": (LARANJA, MARROM_HOVER, LARANJA, 0),
    "fechar_press": (LARANJA_ESCURO, PRETO_SOMBRA, LARANJA_ESCURO, 1),
}


def painel_black() -> Image.Image:
    """32x32, nineslice 8: preto translúcido, borda laranja de 2 px e cantos recortados."""
    return caixa(
        32,
        32,
        2,
        [
            rgba(LARANJA_ESCURO),
            rgba(LARANJA),
            rgba(PRETO_SOMBRA, ALFA_PAINEL),
            rgba(PRETO_MEIO, ALFA_PAINEL),
            rgba(PRETO, ALFA_PAINEL),
        ],
    )


def cabecalho_black() -> Image.Image:
    """32x16, nineslice 4: faixa preta com brilho discreto em cima e linha laranja de 2 px embaixo."""
    return caixa(32, 16, 1, [rgba(PRETO_SOMBRA), rgba(PRETO_CLARO)], {1: PRETO_LUZ, 13: LARANJA, 14: LARANJA_ESCURO})


def divisor_black() -> Image.Image:
    """32x2: linha laranja suave, sumindo nas pontas."""
    img = Image.new("RGBA", (32, 2), TRANSPARENTE)
    px = img.load()
    rampa = (30, 70, 120, 165, 195)
    for x in range(32):
        ponta = min(x, 31 - x)
        alfa = rampa[ponta] if ponta < len(rampa) else 210
        px[x, 0] = rgba(LARANJA, alfa)
        px[x, 1] = rgba(PRETO_SOMBRA, alfa * 3 // 4)
    return img


def pecas_black() -> dict[str, tuple[Image.Image, int | None]]:
    """nome -> (imagem, nineslice_size ou None), com os mesmos nomes e tamanhos das peças laranja."""
    return {
        "painel": (painel_black(), 8),
        "cabecalho": (cabecalho_black(), 4),
        **{nome: (botao(*estado), 4) for nome, estado in ESTADOS_BOTAO_BLACK.items()},
        **{nome: (fechar(*estado), None) for nome, estado in ESTADOS_FECHAR_BLACK.items()},
        "divisor": (divisor_black(), None),
    }


# ---------------------------------------------------------------- ícone do pack do chat

BALAO = """
.cccccccccccc.
cccccccccccccc
cceecceecceecc
cceecceecceecc
cccccccccccccc
sccccccccccccs
.ssssssssscss.
.........css..
.........cs...
........cs....
"""


def pack_icon_chat() -> Image.Image:
    """256x256: o pack_icon do RP (o que estiver lá, gerado ou oficial) com um balão de fala no canto."""
    with Image.open(RP / "pack_icon.png") as original:
        base = original.convert("RGBA").resize((256, 256), Image.NEAREST)
    balao = contornar(_com_margem(pixel_art(linhas_de(BALAO), CORES)), CONTORNO)
    balao = ampliar(contornar(_com_margem(balao), CREME), 6)  # pixel de 6, como a raposa do ícone
    base.alpha_composite(balao, (256 - balao.width - 6, 256 - balao.height - 6))
    return base


# ---------------------------------------------------------------- prévia


FUNDO_PREVIA = (30, 28, 36, 255)
TEXTO_PREVIA = (230, 220, 205, 255)
CINZA_PREVIA = (150, 140, 135, 255)
CEU_PREVIA = (104, 140, 188, 255)  # fundo "do mundo" atrás da sidebar simulada
CHAT_PREVIA = (0, 0, 0, 110)  # fundo translúcido da linha do chat
MARGEM = 12

# Simulação no tamanho do jogo: tudo é montado em meios pixels de GUI (um pixel da default8 e um texel de
# glyph valem 2x2) e depois ampliado pela escala de GUI dividida por 2.
MEIO = 2
LETRA_GUI = 8  # célula da default8, em px de GUI
LINHA_GUI = 10  # altura de uma linha de label, em px de GUI
ESPACO_GUI = 4  # avanço do espaço na default8
FONTE_JOGO = "resource_packs/vanilla/__brarchive/font.brarchive"
CORES_PARAGRAFO = {
    "0": (0, 0, 0), "1": (0, 0, 170), "2": (0, 170, 0), "3": (0, 170, 170),
    "4": (170, 0, 0), "5": (170, 0, 170), "6": (255, 170, 0), "7": (170, 170, 170),
    "8": (85, 85, 85), "9": (85, 85, 255), "a": (85, 255, 85), "b": (85, 255, 255),
    "c": (255, 85, 85), "d": (255, 85, 255), "e": (255, 255, 85), "f": (255, 255, 255),
}  # fmt: skip
TROCAS_CP437 = {"•": "∙"}  # o "•" não está na default8 (no jogo vem de outra folha); na prévia, um ponto


def default8_do_jogo() -> Image.Image | None:
    """A fonte default8.png lida do font.brarchive do jogo instalado (None se o jogo não for achado)."""
    import brarchive
    from verificar_ui import pastas_do_jogo

    for pasta in pastas_do_jogo(None):
        arquivo = pasta / FONTE_JOGO
        if arquivo.is_file():
            dados = brarchive.ler(arquivo).get("default8.png")
            if dados:
                return Image.open(io.BytesIO(dados)).convert("RGBA")
    return None


def _tingir(img: Image.Image, cor: tuple[int, int, int], escurecer: int = 1) -> Image.Image:
    """Multiplica a imagem pela cor (como o § faz no jogo); escurecer=4 dá a cor da sombra."""
    r, g, b, a = img.split()
    canais = [c.point(lambda v, k=k: v * k // (255 * escurecer)) for c, k in zip((r, g, b), cor)]
    return Image.merge("RGBA", (*canais, a))


class TextoJogo:
    """Label do jogo simulado: default8, cores §, sombra de 1 px e glyphs das folhas E2/E3.

    Modelo (o do docstring do módulo): 1 texel do glyph = 1 px de GUI, qualquer que seja a resolução da
    folha; a célula do glyph fica centrada na célula de 8 px da letra; o avanço do glyph vai até a última
    coluna com pixel, sem espaço extra.
    """

    def __init__(self, default8: Image.Image, folhas: dict[int, Image.Image]) -> None:
        self.default8 = default8
        self.folhas = folhas  # byte alto do código (0xE2, 0xE3) -> folha

    def _letra(self, ch: str) -> tuple[Image.Image | None, int]:
        """Letra em meios px e o avanço em meios px."""
        if ch == " ":
            return None, ESPACO_GUI * MEIO
        ch = TROCAS_CP437.get(ch, ch)
        try:
            indice = ord(ch) if 32 <= ord(ch) < 127 else ch.encode("cp437")[0]
        except UnicodeEncodeError:
            indice = ord("?")
        lado = self.default8.width // 16
        linha, coluna = divmod(indice, 16)
        celula = self.default8.crop((coluna * lado, linha * lado, (coluna + 1) * lado, (linha + 1) * lado))
        direita = (celula.getbbox() or (0, 0, 0, 0))[2]
        return ampliar(celula, MEIO), (direita + 1) * MEIO

    def _glyph(self, ch: str) -> tuple[Image.Image, int]:
        """Célula do glyph em meios px (1 texel = 1 px de GUI), o avanço e o recuo para cima em meios px."""
        folha = self.folhas[ord(ch) >> 8]
        lado = folha.width // 16
        linha, coluna = divmod(ord(ch) & 0xFF, 16)
        celula = folha.crop((coluna * lado, linha * lado, (coluna + 1) * lado, (linha + 1) * lado))
        direita = (celula.getbbox() or (0, 0, 0, 0))[2]
        return ampliar(celula, MEIO), direita * MEIO, (lado - LETRA_GUI) // 2 * MEIO

    def folga(self) -> int:
        """Quanto a célula do glyph passa da célula da letra, em cima e embaixo (meios px)."""
        return max(0, *((folha.width // 16 - LETRA_GUI) // 2 * MEIO for folha in self.folhas.values()))

    def render(self, texto: str) -> Image.Image:
        """Imagem transparente em meios px; a 1ª linha de letras começa em y = folga()."""
        folga = self.folga()
        linhas = texto.split("\n")
        pecas: list[tuple[Image.Image, int, int, tuple[int, int, int]]] = []
        largura = 0
        for n, linha in enumerate(linhas):
            x, y0, cor, i = 0, folga + n * LINHA_GUI * MEIO, CORES_PARAGRAFO["f"], 0
            while i < len(linha):
                ch = linha[i]
                if ch == "§" and i + 1 < len(linha):
                    codigo = linha[i + 1]
                    cor = CORES_PARAGRAFO["f"] if codigo == "r" else CORES_PARAGRAFO.get(codigo, cor)
                    i += 2
                    continue
                if (ord(ch) >> 8) in self.folhas:
                    img, avanco, recuo = self._glyph(ch)
                    pecas.append((img, x, y0 - recuo, cor))
                else:
                    img, avanco = self._letra(ch)
                    if img is not None:
                        pecas.append((img, x, y0, cor))
                x += avanco
                i += 1
            largura = max(largura, x)
        saida = Image.new("RGBA", (largura + MEIO, len(linhas) * LINHA_GUI * MEIO + 2 * folga), TRANSPARENTE)
        for img, x, y, cor in pecas:  # sombra primeiro, 1 px de GUI para baixo e para a direita
            saida.alpha_composite(_tingir(img, cor, 4), (x + MEIO, y + MEIO))
        for img, x, y, cor in pecas:
            saida.alpha_composite(_tingir(img, cor), (x, y))
        return saida


class Previa:
    """Folha de contato montada de cima para baixo; cada bloco avança o cursor y."""

    def __init__(self, largura: int) -> None:
        self.largura = largura
        self.img = Image.new("RGBA", (largura, 4000), FUNDO_PREVIA)
        self.desenho = ImageDraw.Draw(self.img)
        self.fonte = ImageFont.load_default(size=11)
        self.fonte_grande = ImageFont.load_default(size=14)
        self.y = MARGEM

    def texto(self, x: int, y: int, texto: str, grande: bool = False, cor: tuple = TEXTO_PREVIA) -> None:
        self.desenho.text((x, y), texto, fill=cor, font=self.fonte_grande if grande else self.fonte)

    def titulo_bloco(self, texto: str) -> None:
        self.texto(MARGEM, self.y, texto, grande=True)
        self.y += 24

    def colar(self, img: Image.Image, x: int, y: int, xadrez: bool = False) -> None:
        if xadrez:
            self.img.alpha_composite(_xadrez(img.width, img.height), (x, y))
        self.img.alpha_composite(img, (x, y))

    def em_fluxo(self, itens: list[tuple[str, Image.Image]], espaco: int = 24) -> None:
        """Cola as imagens lado a lado (com a legenda em cima), quebrando a linha quando não cabem."""
        x, altura = MARGEM, 0
        for legenda, img in itens:
            if x > MARGEM and x + img.width > self.largura - MARGEM:
                x, self.y, altura = MARGEM, self.y + altura + espaco, 0
            topo = 16 if legenda else 0
            if legenda:
                self.texto(x, self.y, legenda, cor=CINZA_PREVIA)
            self.colar(img, x, self.y + topo)
            x += img.width + espaco
            altura = max(altura, img.height + topo)
        self.y += altura + espaco

    def final(self) -> Image.Image:
        return self.img.crop((0, 0, self.largura, self.y))


def _celula(e2: Image.Image, nome: str) -> Image.Image:
    linha, coluna = next(pos for pos, n in ICONES.items() if n == nome)
    return e2.crop((coluna * CELULA_E2, linha * CELULA_E2, (coluna + 1) * CELULA_E2, (linha + 1) * CELULA_E2))


def _g(nome: str) -> str:
    """Igual ao glyph() do glyphs.js: "§f" + código + "§r"."""
    linha, coluna = next(pos for pos, n in ICONES.items() if n == nome)
    return "§f" + chr(0xE200 + linha * 16 + coluna) + "§r"


def _barra_texto(cheios: int) -> str:
    """Igual ao barra() do glyphs.js, com 10 segmentos."""
    return "§f" + _g("BARRA_CHEIA")[2] * cheios + _g("BARRA_VAZIA")[2] * (10 - cheios) + "§r"


def _linhas_sidebar(cargo: tuple[str, str, str] | None, kitsune: bool) -> str:
    """Mesmo formato do textos/hud.js, com valores de exemplo. cargo = (glyph, cor, nome)."""
    selo_k = f" {_g('KITSUNE')}" if kitsune else ""
    linhas = [f"{_g(cargo[0])} {cargo[1]}{cargo[2]}{selo_k}"] if cargo else []
    linhas += [
        f"{_g('LUA')} §bRaposa Lunar{'' if cargo else selo_k}",
        "§7Nível §f17 §8• §742%",
        _barra_texto(4),
        f"{_g('CAUDAS')} §61.250 §a+5",
        f"{_g('ONLINE')} §f7 §7online",
        f"{_g('LOCAL')} §f120 64 -30 §7NE",
    ]
    return "\n".join(linhas)


def _sidebar(jogo: TextoJogo, painel: Image.Image, img_titulo: Image.Image, texto: str) -> Image.Image:
    """A caixa do vulpus_hud.json em meios px: painel (conteúdo + 12x10), título 65x14, 4 px e o label."""
    rotulo = jogo.render(texto)
    folga = jogo.folga()
    larg_rotulo = min(max(112 * MEIO, rotulo.width), 170 * MEIO)
    larg = larg_rotulo + 12 * MEIO
    alt = (14 + 4 + 10) * MEIO + rotulo.height - 2 * folga
    fundo = ampliar(_nineslice(painel, 8, larg // MEIO, alt // MEIO), MEIO)
    fundo.putalpha(fundo.getchannel("A").point(lambda v: v * 9 // 10))
    caixa_sb = Image.new("RGBA", (larg, alt + 2 * folga), TRANSPARENTE)
    caixa_sb.alpha_composite(fundo, (0, folga))
    titulo_sb = ampliar(img_titulo.resize((65, 14), Image.NEAREST), MEIO)
    caixa_sb.alpha_composite(titulo_sb, (6 * MEIO + (larg_rotulo - titulo_sb.width) // 2, folga + 5 * MEIO))
    caixa_sb.alpha_composite(rotulo, (6 * MEIO, (5 + 14 + 4) * MEIO))
    return caixa_sb


def _no_fundo(img: Image.Image, cor: tuple, margem: int = 6) -> Image.Image:
    saida = Image.new("RGBA", (img.width + 2 * margem, img.height + 2 * margem), CEU_PREVIA)
    saida.alpha_composite(Image.new("RGBA", saida.size, cor))
    saida.alpha_composite(img, (margem, margem))
    return saida


def previa(
    e2: Image.Image,
    img_titulo: Image.Image,
    e3: Image.Image,
    black: dict[str, tuple[Image.Image, int | None]],
    default8: Image.Image,
) -> Image.Image:
    """Células E2 ampliadas com o código, simulação no tamanho do jogo, o título e as peças Black."""
    zoom = 3
    passo = CELULA_E2 * zoom + 22
    p = Previa(2 * MARGEM + 12 * passo)

    p.titulo_bloco("glyph_E2.png  (3x; celula de 32 texels; a faixa clara e a maiuscula da linha de texto, 12..18)")
    for linha in sorted({l for l, _ in ICONES}):
        for (l, coluna), nome in ICONES.items():
            if l != linha:
                continue
            x = MARGEM + coluna * passo
            p.colar(ampliar(_com_guia(_celula(e2, nome)), zoom), x, p.y)
            p.texto(x, p.y + CELULA_E2 * zoom + 2, f"E2{linha:X}{coluna:X}")
            p.texto(x, p.y + CELULA_E2 * zoom + 15, nome.lower(), cor=CINZA_PREVIA)
        p.y += CELULA_E2 * zoom + 38

    jogo = TextoJogo(default8, {0xE2: e2, 0xE3: e3})
    todos = " ".join(_g(nome) for nome in ICONES.values() if nome not in SEM_CONTORNO)
    exemplo = "\n".join(
        [
            f"{_g('BROTO')} §aFilhote  {_g('ADMIN')} §cAdmin {_g('KITSUNE')}  §fHg",
            f"{_g('CAUDAS')} §61.250 §a+5  {_g('ONLINE')} §f7 §7online  {_g('NIVEL')} §f17 {_barra_texto(4)}",
            f"{_g('LOCAL')} §f120 64 -30 §7NE  {_g('LEILAO')} {_g('CAIXA')} {_g('BUSCA')} §fLeilao",
            todos,
        ]
    )
    p.titulo_bloco("no tamanho do jogo (fonte default8; 1 texel de glyph = 1 px de GUI, celula centrada na linha)")
    p.em_fluxo(
        [
            (f"escala de GUI {escala}", ampliar(_no_fundo(jogo.render(exemplo), CEU_PREVIA), escala // MEIO))
            for escala in (2, 4)
        ]
    )

    p.titulo_bloco("sidebar no tamanho do jogo: sem cargo e Admin com Kitsune")
    painel = Image.open(PASTA_UI / "painel.png").convert("RGBA")
    sem_cargo = _sidebar(jogo, painel, img_titulo, _linhas_sidebar(None, False))
    admin = _sidebar(jogo, painel, img_titulo, _linhas_sidebar(("ADMIN", "§c", "Admin"), True))
    p.em_fluxo(
        [
            (f"{nome}, escala de GUI {escala}", ampliar(_no_fundo(caixa_sb, CEU_PREVIA, 8), escala // MEIO))
            for nome, caixa_sb, escala in (("sem cargo", sem_cargo, 2), ("Admin", admin, 2), ("Admin", admin, 4))
        ]
    )

    p.titulo_bloco("chat no tamanho do jogo: titulo VULPUS (E3) e selos")
    titulo_chat = "§f" + "".join(chr(0xE300 + i) for i in range(FATIAS_TITULO)) + "§r"
    chat = "\n".join(
        [
            f"{titulo_chat} §6Bem-vinda a toca!",
            f"{_g('ADMIN')} §c[12] §fDani §7» §foi, gente",
            f"{_g('BROTO')} §a[0] §fNovata §7» §fcheguei",
        ]
    )
    p.em_fluxo(
        [(f"escala de GUI {escala}", ampliar(_no_fundo(jogo.render(chat), CHAT_PREVIA), escala // MEIO)) for escala in (2, 4)]
    )

    p.titulo_bloco("titulo.png 130x28 (3x, 1x, 97x21 do Hub e 65x14 da sidebar)")
    p.colar(ampliar(img_titulo, 3), MARGEM, p.y, xadrez=True)
    x = MARGEM + 130 * 3 + 20
    p.colar(img_titulo, x, p.y)
    p.colar(img_titulo.resize((97, 21), Image.NEAREST), x, p.y + 36)
    p.colar(img_titulo.resize((65, 14), Image.NEAREST), x, p.y + 66)
    p.y += 28 * 3 + 12

    p.titulo_bloco("glyph_E3.png: as 5 fatias (2x)")
    for i in range(FATIAS_TITULO):
        x = MARGEM + i * (CELULA_E3 * 2 + 14)
        p.colar(ampliar(_com_guia(e3.crop((i * CELULA_E3, 0, (i + 1) * CELULA_E3, CELULA_E3))), 2), x, p.y)
        p.texto(x, p.y + CELULA_E3 * 2 + 2, f"E30{i}")
    p.y += CELULA_E3 * 2 + 24

    p.titulo_bloco("tema Black (4x)")
    x, altura_linha = MARGEM, 0
    for nome, (peca, nineslice) in black.items():
        ampliada = ampliar(peca, 4)
        if x + ampliada.width > p.largura - MARGEM:
            x, p.y, altura_linha = MARGEM, p.y + altura_linha + 30, 0
        p.colar(ampliada, x, p.y, xadrez=True)
        p.texto(x, p.y + ampliada.height + 2, nome + (f" (ns {nineslice})" if nineslice else ""), cor=CINZA_PREVIA)
        x += max(ampliada.width, 96) + 20
        altura_linha = max(altura_linha, ampliada.height)
    p.y += altura_linha + 30

    p.titulo_bloco("botoes Black esticados (2x)")
    for i, nome in enumerate(("botao", "botao_hover", "botao_press")):
        x = MARGEM + i * 200
        p.colar(ampliar(_nineslice(black[nome][0], 4, 92, 34), 2), x, p.y)
        p.texto(x + 60, p.y + 25, "Caudas", grande=True)
    p.y += 34 * 2 + MARGEM
    return p.final()


def _com_guia(celula: Image.Image) -> Image.Image:
    """Célula sobre xadrez de 4 texels, com a faixa da maiúscula (linhas 12..18) mais clara."""
    fundo = Image.new("RGBA", celula.size, (52, 50, 60, 255))
    desenho = ImageDraw.Draw(fundo)
    for y in range(0, celula.height, 4):
        for x in range(0, celula.width, 4):
            if (x // 4 + y // 4) % 2:
                desenho.rectangle((x, y, x + 3, y + 3), fill=(62, 60, 72, 255))
    fundo.alpha_composite(Image.new("RGBA", (celula.width, 7), (255, 255, 255, 28)), (0, 12))
    fundo.alpha_composite(celula)
    return fundo


def _xadrez(larg: int, alt: int) -> Image.Image:
    img = Image.new("RGBA", (larg, alt), (52, 50, 60, 255))
    desenho = ImageDraw.Draw(img)
    for y in range(0, alt, 8):
        for x in range(0, larg, 8):
            if (x // 8 + y // 8) % 2:
                desenho.rectangle((x, y, x + 7, y + 7), fill=(62, 60, 72, 255))
    return img


def _nineslice(peca: Image.Image, n: int, larg: int, alt: int) -> Image.Image:
    """Estica uma peça como o nineslice do jogo (cantos fixos de n px), só para a prévia."""
    saida = Image.new("RGBA", (larg, alt), TRANSPARENTE)
    xs = [(0, n, 0, n), (n, peca.width - n, n, larg - n), (peca.width - n, peca.width, larg - n, larg)]
    ys = [(0, n, 0, n), (n, peca.height - n, n, alt - n), (peca.height - n, peca.height, alt - n, alt)]
    for x0, x1, dx0, dx1 in xs:
        for y0, y1, dy0, dy1 in ys:
            parte = peca.crop((x0, y0, x1, y1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST)
            saida.alpha_composite(parte, (dx0, dy0))
    return saida


# ---------------------------------------------------------------- gravação


def principal() -> int:
    parser = argparse.ArgumentParser(description="Gera os glyphs e as texturas da fase 2 do addon Vulpus.")
    parser.add_argument("--forcar", action="store_true", help="sobrescreve também os PNGs trocados à mão")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # acentos certos também no Git Bash

    saidas: list[tuple[Path, str]] = []

    def gravar(img: Image.Image, caminho: Path) -> None:
        saidas.append((caminho, salvar_png(img, caminho, args.forcar)))

    conferir_glyphs_js()
    e2 = folha_e2()
    img_titulo = titulo()
    e3 = folha_e3(titulo(LARGURA_TITULO_CHAT, ALTURA_TITULO_CHAT))
    black = pecas_black()

    gravar(e2, PASTA_FONTE / "glyph_E2.png")
    gravar(e3, PASTA_FONTE / "glyph_E3.png")
    gravar(img_titulo, PASTA_UI / "titulo.png")
    for nome, (peca, nineslice) in black.items():
        caminho = PASTA_BLACK / f"{nome}.png"
        gravar(peca, caminho)
        if nineslice:
            salvar_json({"nineslice_size": nineslice, "base_size": [peca.width, peca.height]}, caminho.with_suffix(".json"))
    gravar(pack_icon_chat(), CHAT / "pack_icon.png")
    default8 = default8_do_jogo()
    if default8 is None:
        saidas.append((PREVIA, "mantido (jogo não encontrado: falta a fonte default8 para a simulação)"))
    else:
        gravar(previa(e2, img_titulo, e3, black, default8), PREVIA)

    for caminho, status in saidas:
        print(f"  {caminho.relative_to(ADDON).as_posix():48} {status}")
    print(f"Glyphs e texturas prontos ({len(saidas)} PNGs).")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
