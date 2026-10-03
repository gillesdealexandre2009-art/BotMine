"""Gera os glyphs e as texturas da fase 2 do addon Vulpus em pixel art (Pillow).

Uso, a partir da pasta addon/:
    python tools/gerar_glyphs.py            # gera tudo, mas preserva PNGs trocados à mão
    python tools/gerar_glyphs.py --forcar   # sobrescreve até os PNGs trocados à mão

Saída:
- vulpus_rp/font/glyph_E2.png (ícones, células de 16 px) e glyph_E3.png (título VULPUS, células de 32 px);
- vulpus_rp/textures/vulpus/ui/titulo.png (130x28, a partir de <repo>/IMGS/minecraft_title.png);
- vulpus_rp/textures/vulpus/ui/black/*.png (+ .json de nineslice): peças do tema Black;
- vulpus_chat_bp/pack_icon.png (ícone do pack com um balão de fala);
- docs/previas/glyphs.png (prévia ampliada, com o código de cada glyph).

A tabela de códigos é fixa (docs/spec/03_spec_fase2.md §4.2) e tem que bater com vulpus_bp/scripts/glyphs.js.
Usa a mesma proteção do gerar_texturas.py: um PNG trocado à mão não é sobrescrito sem --forcar.
"""

from __future__ import annotations

import argparse
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
    DETALHES_16,
    FUNDO_CLARO,
    LARANJA,
    LARANJA_CLARO,
    LARANJA_ESCURO,
    LARANJA_MEDIO,
    OLHO,
    RAPOSA_16,
    TRANSPARENTE,
    ampliar,
    botao,
    caixa,
    contornar,
    fechar,
    linhas_de,
    pixel_art,
    raposa,
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
}

# ---------------------------------------------------------------- desenhos (até 14x14; o contorno escuro é automático)

BROTO = """
..........lll.
.lll.....lgggG
lgggl...lgggGG
lggggG..gggGG.
.gggGGg.ggGG..
..GGGGgggG....
......gG......
......gG......
......gG......
....mmmmmm....
..mmmmmmmmmm..
.mmmmmmmmmmmm.
nnnnnnnnnnnnnn
"""

FOLHA = """
..........oooo
........oorrrr
.......orrrrbR
......orrrrbrR
.....orrrrbrrR
....orrrrbrrRR
...orrrrbrrrR.
...orrrbrrrRR.
..orrrbrrrRR..
..orrbrrrRR...
..orbrrRRR....
..rbRRRR......
..b...........
.b............
"""

LUA = """
....ccccc.....
..cccccaa.....
.ccccaa.......
.cccaa......w.
cccca.........
cccca.........
cccca.........
cccca.....w...
cccca.........
.cccaa........
.ccccaa.......
..cccccaa.....
....ccccc.....
"""

BRILHO = """
......z......
.....yzY.....
.....yzY.....
....yyzYY....
...yyyzYYY...
.yyyyzwzYYYY.
zzzzzwwwzzzzz
.YYYYzwzYYYY.
...YYYzYYY...
....YYzYY....
.....YzY.....
.....YzY.....
......z......
"""

ADMIN = """
z.....zz.....z
yy...yzzy...yy
yzy..yzyy..yyy
yzyy.yyyy.yyyy
yzyyyyyyyyyyyy
yyyyyyyyyyyyyY
YYYYYYYYYYYYYY
YjjYYYjjYYYjjY
YJJYYYJJYYYJJY
ZZZZZZZZZZZZZZ
"""

STAFF = """
bbbbbbbbbbbb
bOOOOOOOcccb
bOooooocccdb
bOoooocccddb
bOooocccdddb
bOoocccddddb
bOocccdddddb
bOcccddddddb
.bccdddddddb
.bcdddddddb.
..bddddddb..
...bddddb...
....bddb....
.....bb.....
"""

HELPER = """
......t......
.....ttt.....
.....twt.....
....twttT....
ttttwttttTTTT
.twttttttTTT.
..ttttttTTT..
...ttttTTT...
..tttTTTTTT..
..ttTT.TTTT..
.ttT.....TTT.
.tT.......TT.
"""

KITSUNE = """
.....p.....
.....pp....
....ppp..p.
....pppp.p.
...ppipppP.
..ppiipppP.
..ppiiippPP
.ppiiwiipPP
.ppiwwwipPP
.ppiwwwiPPP
.Ppiwwwipp.
.PPiiwiiPP.
..PPiiiPP..
...PPPPP...
"""

CAUDAS = """
....YYYYYY....
..YYzzyyyyYY..
.YzzyyyyZZZyY.
.YzyyyyZcccZY.
YzyyyyZccccZyY
YzyyyZoocccZyY
YyyyZoooocZyyY
YyyZooooodZyyY
YyyZoooodZyyyY
YyZooooddZyyyY
.YZoddddZyyyZ.
.YZddZZZyyyZZ.
..ZZZYyyyyZZ..
....ZZZZZZ....
"""

NIVEL = """
......l......
.....lxx.....
....lxcxX....
...lxcccxX...
..lxcccccxX..
.lxxxxcxxxxX.
lxxxxxcxxxxxX
.xxxxxcxxxxX.
..xxxxcxxxX..
...xxxxxxX...
....xxxxX....
.....xXX.....
......X......
"""

# Barra de nível: 6x10 exatos, sem o contorno automático (spec §4.2).
BARRA_CHEIA = """
bbbbbb
bOOOOb
boooob
boooob
boooob
boooob
boooob
boooob
bddddb
bbbbbb
"""

BARRA_VAZIA = """
hhhhhh
hffffh
hffffh
hffffh
hffffh
hffffh
hffffh
hffffh
hffffh
hhhhhh
"""

ONLINE = """
........sss...
.......sssss..
...ccc.sssss..
..ccccc.sss...
..ccccck......
..ccccck.sss..
...ccck.sssss.
........sssss.
.ccccccc.ssss.
ccccccccc.sss.
ccccccccc.....
"""

LOCAL = """
...oooo...
.oOOooood.
.oOoccood.
oOocccccod
oOocccccod
oooocccood
.ooooooodd
.oooooood.
..oooood..
...ooodd..
...oood...
....odd...
....od....
"""

TEMPO = """
bbbbbbbbbb
.cssssssc.
.cooooooc.
..coooocs.
...cooc...
....cc....
...csoc...
..cs.ocs..
.cs..ooc..
.cooooooc.
bbbbbbbbbb
"""

LEILAO = """
...yyy........
..yzyyy.......
.yzyyyyY......
yzyyyyYYY.....
yyyyyYYYYY....
.yyyYYYYYh....
..yYYYYY.hh...
...YYYY...hh..
....YY.....hh.
............hH
..mmmmmmmm..HH
.mmmmmmmmmm...
.nnnnnnnnnn...
"""

VENDER = """
..c...........
.c............
.c............
..c...........
...c..OOOOOOO.
....cOooooood.
....Occoooood.
...Oocecooood.
...ooocoooood.
....ooooooood.
.....oooooood.
......ddddddd.
"""

COMPRAR = """
....bbbb....
...b....b...
...b....b...
.hhhhhhhhhh.
.hmmmmmmmmh.
.hmmmmmmmmh.
.hmmmmmmmmh.
hhmmmmmmmmhh
hmmmmmmmmmmh
hmmmmmmmmmmh
hmmmmmmmmmmh
hnnnnnnnnnnh
"""

CAIXA = """
.hhhhhhhhhhhh.
hmmmmmmmmmmmmh
hmmmmmmmmmmmmh
hnnnnnnnnnnnnh
hhhhhyyyyhhhhh
hmmmmyzzYmmmmh
hmmmmyzYYmmmmh
hmmmmmYYmmmmmh
hmmmmmmmmmmmmh
hnnnnnnnnnnnnh
"""

BUSCA = """
...cccc.....
..cssssc....
.csaaaasc...
.csaaaaas...
.saaaaaas...
.saaaaaas...
..saaaas....
...ssssbb...
.......bbb..
........bbb.
.........bbb
..........bb
"""

HISTORICO = """
.ssssssssss..
sccccccccccs.
.cbbbbbbbbc..
.cccccccccc..
.cbbbbbbbc...
.cccccccccc..
.cbbbbbbbbc..
.cccccccccc..
.cbbbbbc.cc..
.cccccccccc..
sccccccccccs.
.ssssssssss..
"""

ENCANTADO = """
..u.........
.uvV........
..V.....u...
.......uvV..
........V...
....u.......
...uvV......
....V.......
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
}

DESENHOS = {
    "BROTO": BROTO,
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
}

SEM_CONTORNO = {"BARRA_CHEIA", "BARRA_VAZIA"}
GLYPHS_JS = ADDON / "vulpus_bp" / "scripts" / "glyphs.js"

CELULA_E2 = 16
CELULA_E3 = 32
FATIAS_TITULO = 5
ALFA_LARGURA = 20  # ~8 %: marca a largura exata da fatia sem aparecer


def arte(nome: str) -> Image.Image:
    """Desenho do glyph já com contorno (RAPOSA é a logo em miniatura do gerar_texturas.py)."""
    if nome == "RAPOSA":
        return raposa(RAPOSA_16, DETALHES_16)
    img = pixel_art(linhas_de(DESENHOS[nome]), CORES)
    return img if nome in SEM_CONTORNO else contornar(_com_margem(img), CONTORNO)


def _com_margem(img: Image.Image) -> Image.Image:
    """Abre 1 px de folga em volta, para o contorno não ser cortado."""
    saida = Image.new("RGBA", (img.width + 2, img.height + 2), TRANSPARENTE)
    saida.alpha_composite(img, (1, 1))
    return saida


def na_celula(img: Image.Image, celula: int) -> Image.Image:
    """Recorta a arte e encosta à esquerda (x = 0), centralizada na vertical."""
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
    folha = Image.new("RGBA", (16 * CELULA_E2, 16 * CELULA_E2), TRANSPARENTE)
    for (linha, coluna), nome in ICONES.items():
        folha.alpha_composite(na_celula(arte(nome), CELULA_E2), (coluna * CELULA_E2, linha * CELULA_E2))
    return folha


# ---------------------------------------------------------------- título VULPUS

LARGURA_TITULO, ALTURA_TITULO = 130, 28
CORTE_ALFA = 110  # alfa médio a partir do qual o pixel reduzido fica opaco


def titulo() -> Image.Image:
    """130x28: a arte de IMGS/minecraft_title.png reduzida por média de área, centralizada e sem distorção.

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
    escala = min(LARGURA_TITULO / fonte.width, ALTURA_TITULO / fonte.height)
    larg, alt = max(1, round(fonte.width * escala)), max(1, round(fonte.height * escala))
    reduzida = fonte.resize((larg, alt), Image.BOX)
    px = reduzida.load()
    for y in range(alt):
        for x in range(larg):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= CORTE_ALFA else TRANSPARENTE
    saida = Image.new("RGBA", (LARGURA_TITULO, ALTURA_TITULO), TRANSPARENTE)
    saida.alpha_composite(reduzida, ((LARGURA_TITULO - larg) // 2, (ALTURA_TITULO - alt) // 2))
    return saida


def folha_e3(img_titulo: Image.Image) -> Image.Image:
    """Título em 5 fatias de 26 px, cada uma numa célula de 32 px (x = 0, y = 2..29)."""
    folha = Image.new("RGBA", (16 * CELULA_E3, 16 * CELULA_E3), TRANSPARENTE)
    largura = LARGURA_TITULO // FATIAS_TITULO
    topo = (CELULA_E3 - ALTURA_TITULO) // 2
    for i in range(FATIAS_TITULO):
        fatia = img_titulo.crop((i * largura, 0, (i + 1) * largura, ALTURA_TITULO))
        px = fatia.load()
        for x in (0, largura - 1):
            if not any(px[x, y][3] for y in range(ALTURA_TITULO)):
                px[x, ALTURA_TITULO // 2] = rgba(CONTORNO, ALFA_LARGURA)
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
MARGEM = 12

# Linhas de exemplo da sidebar (glyph, texto), só para a prévia.
EXEMPLO_SIDEBAR = [
    ("LUA", "Raposa Lunar"),
    ("NIVEL", "Nv 17"),
    ("CAUDAS", "1.250 +5"),
    ("ONLINE", "7 online"),
    ("LOCAL", "120 64 -30 NE"),
]


class Previa:
    """Folha de contato montada de cima para baixo; cada bloco avança o cursor y."""

    def __init__(self, largura: int) -> None:
        self.largura = largura
        self.img = Image.new("RGBA", (largura, 3000), FUNDO_PREVIA)
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

    def final(self) -> Image.Image:
        return self.img.crop((0, 0, self.largura, self.y))


def _celula(e2: Image.Image, nome: str) -> Image.Image:
    linha, coluna = next(pos for pos, n in ICONES.items() if n == nome)
    return e2.crop((coluna * CELULA_E2, linha * CELULA_E2, (coluna + 1) * CELULA_E2, (linha + 1) * CELULA_E2))


def _barra(e2: Image.Image, cheios: int) -> Image.Image:
    """Barra de 10 segmentos colados (no jogo pode haver 1 px de espaço entre eles)."""
    img = Image.new("RGBA", (6 * 10, CELULA_E2), TRANSPARENTE)
    for i in range(10):
        segmento = _celula(e2, "BARRA_CHEIA" if i < cheios else "BARRA_VAZIA").crop((0, 0, 6, CELULA_E2))
        img.alpha_composite(segmento, (i * 6, 0))
    return img


def previa(e2: Image.Image, img_titulo: Image.Image, e3: Image.Image, black: dict[str, tuple[Image.Image, int | None]]) -> Image.Image:
    """Glyphs a 4x com o código, em tamanho de texto, numa sidebar de exemplo, o título e as peças Black."""
    zoom = 4
    passo = CELULA_E2 * zoom + 22
    p = Previa(2 * MARGEM + 9 * passo)

    p.titulo_bloco("glyph_E2.png  (4x; o xadrez mostra a celula de 16 px)")
    for linha in range(3):
        for (l, coluna), nome in ICONES.items():
            if l != linha:
                continue
            x = MARGEM + coluna * passo
            p.colar(ampliar(_celula(e2, nome), zoom), x, p.y, xadrez=True)
            p.texto(x, p.y + CELULA_E2 * zoom + 2, f"E2{linha:X}{coluna:X}")
            p.texto(x, p.y + CELULA_E2 * zoom + 15, nome.lower(), cor=CINZA_PREVIA)
        p.y += CELULA_E2 * zoom + 38

    p.titulo_bloco("tamanho de texto (1x e 2x)")
    for fator in (1, 2):
        x = MARGEM
        for nome in ICONES.values():
            if nome.startswith("BARRA"):
                continue
            celula = _celula(e2, nome)
            largura = ((celula.getbbox() or (0, 0, CELULA_E2, 0))[2] + 3) * fator
            if x + largura > p.largura - MARGEM:
                x = MARGEM
                p.y += CELULA_E2 * fator + 6
            p.colar(ampliar(celula, fator), x, p.y)
            x += largura
        p.y += CELULA_E2 * fator + 10

    p.titulo_bloco("sidebar de exemplo (aproximada), no painel laranja e no preto")
    painel_laranja = Image.open(PASTA_UI / "painel.png").convert("RGBA")
    for coluna, painel in enumerate((painel_laranja, black["painel"][0])):
        x0 = MARGEM + coluna * 360
        caixa_sb = _nineslice(painel, 8, 170, 104)
        p.colar(ampliar(caixa_sb, 2), x0, p.y)
        p.colar(img_titulo.resize((65, 14), Image.NEAREST).resize((130, 28), Image.NEAREST), x0 + 40, p.y + 14)
        for i, (nome, texto) in enumerate(EXEMPLO_SIDEBAR):
            yl = p.y + 50 + i * 26
            p.colar(ampliar(_celula(e2, nome), 1), x0 + 18, yl + 2)
            p.texto(x0 + 40, yl, texto, grande=True)
            if nome == "NIVEL":
                p.colar(ampliar(_barra(e2, 6), 1), x0 + 100, yl + 2)
    p.y += 104 * 2 + 14

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
        p.colar(ampliar(e3.crop((i * CELULA_E3, 0, (i + 1) * CELULA_E3, CELULA_E3)), 2), x, p.y, xadrez=True)
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
    e3 = folha_e3(img_titulo)
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
    gravar(previa(e2, img_titulo, e3, black), PREVIA)

    for caminho, status in saidas:
        print(f"  {caminho.relative_to(ADDON).as_posix():48} {status}")
    print(f"Glyphs e texturas prontos ({len(saidas)} PNGs).")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
