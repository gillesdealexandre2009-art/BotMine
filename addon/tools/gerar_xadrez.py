#!/usr/bin/env python3
"""Gera as texturas do tabuleiro de xadrez e do jogo da velha das mesas da feira.

Uso, a partir da pasta addon/:
    python tools/gerar_xadrez.py

Saída (vulpus_rp/textures/vulpus/xadrez/):
- <casa>_<peça>_<estado>.png (32x32): uma textura por combinação, que o tabuleiro em grade usa como ícone da casa.
    casa    l (clara) ou d (escura)
    peça    xx (vazia), wp wn wb wr wq wk (brancas), bp bn bb br bq bk (pretas)
    estado  n normal, s selecionada, m destino (bolinha), c captura (borda vermelha), u último lance, x rei em xeque
- velha_vazio.png, velha_x.png, velha_o.png (32x32): as casas do jogo da velha.
- hover.png (32x32): realce transparente quando o mouse passa por cima.
- docs/previas/xadrez.png: folha ampliada para conferir o desenho.
Os desenhos das peças são silhuetas em pixels (SPRITES); o contorno e o sombreado saem sozinhos.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ADDON = Path(__file__).resolve().parent.parent
SAIDA = ADDON / "vulpus_rp" / "textures" / "vulpus" / "xadrez"

CLARA = (238, 238, 210)
ESCURA = (118, 150, 86)
SEL_CLARA = (246, 246, 105)
SEL_ESCURA = (186, 202, 43)
BOLINHA = (20, 85, 30, 120)
CAPTURA = (20, 85, 30, 120)
XEQUE = (225, 60, 50)

BRANCA = {"fill": (255, 249, 232), "sombra": (222, 200, 166), "contorno": (78, 48, 30), "brilho": (255, 255, 255)}
PRETA = {"fill": (74, 70, 90), "sombra": (46, 43, 60), "contorno": (14, 10, 20), "brilho": (132, 126, 156)}

# Peças desenhadas em 128x128 com formas suaves e reduzidas para 32x32 (contorno forte para ler bem em tamanho pequeno).
S = 2  # as coordenadas abaixo são de 64x64; o desenho usa 128x128
PECAS = [f"{c}{t}" for c in "wb" for t in "pnbrqk"]


def poly(d, pts, cor):
    d.polygon([(x * S, y * S) for x, y in pts], fill=cor)


def rect(d, x0, y0, x1, y1, cor, r=3):
    d.rounded_rectangle((x0 * S, y0 * S, x1 * S, y1 * S), radius=r * S, fill=cor)


def disco(d, cx, cy, r, cor):
    d.ellipse(((cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S), fill=cor)


def base(d, cor):
    rect(d, 12, 50, 52, 58, cor, 3)
    rect(d, 17, 44, 47, 51, cor, 3)


def forma(letra: str) -> tuple[Image.Image, list]:
    """Máscara da peça e os detalhes (linhas/furos) que ficam na cor do contorno."""
    m = Image.new("L", (64 * S, 64 * S), 0)
    d = ImageDraw.Draw(m)
    det: list = []  # (tipo, dados)
    if letra == "p":
        disco(d, 32, 17, 8.5, 255)
        rect(d, 26, 24, 38, 30, 255, 2)
        poly(d, [(27, 28), (37, 28), (42, 46), (22, 46)], 255)
        base(d, 255)
    elif letra == "r":
        for x0 in (17, 28, 39):
            rect(d, x0, 8, x0 + 8, 18, 255, 1)
        rect(d, 17, 15, 47, 23, 255, 2)
        poly(d, [(22, 22), (42, 22), (45, 46), (19, 46)], 255)
        base(d, 255)
        det.append(("linha", [(20, 22), (44, 22)]))
    elif letra == "b":
        disco(d, 32, 7, 3.6, 255)
        d.ellipse((23 * S, 9 * S, 41 * S, 34 * S), fill=255)
        rect(d, 22, 31, 42, 37, 255, 2)
        poly(d, [(27, 36), (37, 36), (42, 46), (22, 46)], 255)
        base(d, 255)
        det.append(("linha", [(30, 20), (38, 12)]))
        det.append(("linha", [(23, 36), (41, 36)]))
    elif letra == "n":
        poly(d, [(16, 47), (21, 32), (29, 23), (24, 20), (13, 29), (10, 26), (13, 17), (21, 11), (25, 5), (30, 10), (37, 8), (46, 19), (50, 33), (48, 47)], 255)
        base(d, 255)
        det.append(("ponto", (27, 15, 2.2)))
        det.append(("linha", [(11, 26), (15, 29)]))
    elif letra == "q":
        poly(d, [(14, 17), (21, 36), (24, 14), (32, 33), (40, 14), (43, 36), (50, 17), (47, 46), (17, 46)], 255)
        for cx, cy in ((14, 14), (24, 10), (32, 7), (40, 10), (50, 14)):
            disco(d, cx, cy, 3.6, 255)
        base(d, 255)
        det.append(("linha", [(19, 40), (45, 40)]))
    elif letra == "k":
        rect(d, 29.5, 2, 34.5, 16, 255, 1)
        rect(d, 25, 6, 39, 11, 255, 1)
        d.ellipse((20 * S, 14 * S, 44 * S, 34 * S), fill=255)
        poly(d, [(22, 26), (42, 26), (47, 46), (17, 46)], 255)
        base(d, 255)
        det.append(("linha", [(21, 32), (43, 32)]))
    return m, det


def peca_img(codigo: str) -> Image.Image:
    """A peça (32x32 com contorno, sombra e detalhes) numa imagem transparente."""
    paleta = BRANCA if codigo[0] == "w" else PRETA
    massa, detalhes = forma(codigo[1])
    g = 64 * S
    contorno = massa.filter(ImageFilter.MaxFilter(9))
    img = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    img.paste(Image.new("RGBA", (g, g), paleta["contorno"] + (255,)), mask=contorno)
    img.paste(Image.new("RGBA", (g, g), paleta["fill"] + (255,)), mask=massa)
    # lado direito mais escuro dá volume
    sombra = Image.new("L", (g, g), 0)
    ImageDraw.Draw(sombra).rectangle((38 * S, 0, g, g), fill=255)
    sombra = ImageChops.multiply(sombra, massa)
    img.paste(Image.new("RGBA", (g, g), paleta["sombra"] + (255,)), mask=sombra)
    d = ImageDraw.Draw(img)
    for tipo, dados in detalhes:
        if tipo == "linha":
            d.line([(x * S, y * S) for x, y in dados], fill=paleta["contorno"] + (255,), width=int(1.6 * S))
        else:
            cx, cy, r = dados
            disco(d, cx, cy, r, paleta["contorno"] + (255,))
    return img.resize((32, 32), Image.LANCZOS)


def misturar(base: tuple[int, int, int], cor: tuple[int, int, int], alfa: float) -> tuple[int, int, int]:
    return tuple(int(b * (1 - alfa) + c * alfa) for b, c in zip(base, cor))  # type: ignore[return-value]


def casa_img(clara: bool, codigo: str, estado: str) -> Image.Image:
    """Visual do chess.com: casas verde e creme, amarelo na peça escolhida e no último lance,
    bolinha escura no destino livre, anel nos cantos na captura e brilho vermelho no rei em xeque."""
    base = CLARA if clara else ESCURA
    amarelo = SEL_CLARA if clara else SEL_ESCURA
    img = Image.new("RGBA", (32, 32), base + (255,))
    px = img.load()
    if estado in ("s", "u"):
        img.paste(amarelo + (255,), (0, 0, 32, 32))
    elif estado == "x":
        for y in range(32):
            for x in range(32):
                r = ((x - 15.5) ** 2 + (y - 15.5) ** 2) ** 0.5
                px[x, y] = misturar(base, XEQUE, max(0.0, 1.0 - r / 20)) + (255,)
    if estado == "m":
        ov = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        ImageDraw.Draw(ov).ellipse((10, 10, 21, 21), fill=BOLINHA)
        img.alpha_composite(ov)
    if codigo != "xx":
        img.alpha_composite(peca_img(codigo))
    if estado == "c":  # captura: anel que só aparece nos cantos, como no chess.com
        ov = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        d.ellipse((-3, -3, 34, 34), outline=CAPTURA, width=5)
        img.alpha_composite(ov)
    return img


def velha_img(marca: str | None) -> Image.Image:
    img = Image.new("RGBA", (32, 32), (168, 118, 74, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 31, 31), outline=(80, 50, 32, 255))
    d.rectangle((1, 1, 30, 30), outline=(205, 160, 112, 255))
    if marca == "x":
        for desloc in range(-1, 2):
            d.line((7, 7 + desloc, 24, 24 + desloc), fill=(200, 48, 38, 255), width=2)
            d.line((24, 7 + desloc, 7, 24 + desloc), fill=(200, 48, 38, 255), width=2)
        d.line((7, 7, 24, 24), fill=(255, 130, 110, 255), width=1)
        d.line((24, 7, 7, 24), fill=(255, 130, 110, 255), width=1)
    elif marca == "o":
        d.ellipse((6, 6, 25, 25), outline=(46, 98, 196, 255), width=4)
        d.ellipse((8, 8, 23, 23), outline=(120, 170, 245, 255), width=1)
    return img


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    feitos = 0
    for clara in (True, False):
        c = "l" if clara else "d"
        for codigo in ["xx", *PECAS]:
            estados = ["n", "u"] + (["m"] if codigo == "xx" else ["s", "c"])
            if codigo[1:] == "k":
                estados.append("x")
            for e in estados:
                casa_img(clara, codigo, e).save(SAIDA / f"{c}_{codigo}_{e}.png")
                feitos += 1
    for nome, marca in (("velha_vazio", None), ("velha_x", "x"), ("velha_o", "o")):
        velha_img(marca).save(SAIDA / f"{nome}.png")
    hover = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(hover)
    d.rectangle((0, 0, 31, 31), outline=(255, 255, 255, 230), width=2)
    hover.save(SAIDA / "hover.png")

    # folha de conferência: casas claras e escuras, cada peça e cada estado
    celula = 32 * 2
    folha = Image.new("RGBA", (celula * 12, celula * 8), (50, 50, 60, 255))
    linhas = [
        [("l", "xx", "n"), ("d", "xx", "n"), ("l", "xx", "m"), ("d", "xx", "m"), ("l", "xx", "u"), ("d", "xx", "u")],
        *[[(c, p, "n") for p in PECAS[:6]] for c in "ld"],
        *[[(c, p, "n") for p in PECAS[6:]] for c in "ld"],
        [("l", "wp", "s"), ("d", "bn", "s"), ("l", "wr", "c"), ("d", "bq", "c"), ("l", "wk", "x"), ("d", "bk", "x"), ("l", "wb", "u"), ("d", "bp", "u")],
    ]
    for j, linha in enumerate(linhas):
        for i, (c, p, e) in enumerate(linha):
            folha.alpha_composite(casa_img(c == "l", p, e).resize((celula, celula), Image.LANCZOS), (i * celula, j * celula))
    for i, marca in enumerate((None, "x", "o")):
        folha.alpha_composite(velha_img(marca).resize((celula, celula), Image.LANCZOS), (i * celula, 7 * celula))
    previa = ADDON / "docs" / "previas"
    previa.mkdir(parents=True, exist_ok=True)
    folha.save(previa / "xadrez.png")
    print(f"ok: {feitos} texturas de casa, 3 da velha, hover e prévia")


if __name__ == "__main__":
    main()
