"""Gera os assets dos efeitos de abate Kitsune: 9 texturas (um tema por estilo de bandeira) e o modelo/animação/entidade.

Cada textura é um atlas 128x128 com as peças que o script combina a cada abate (lâmina, espírito, selo, pilar, clarão e
4 orbitais). Uso: python tools/gerar_abate.py  (grava no resource pack e em docs/previas/abates.png)
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
TEX = RP / "textures" / "vulpus" / "entidades"
PREVIA = RAIZ / "docs" / "previas" / "abates.png"
TEMAS = ["caudas", "sakura", "lunar", "espirito", "brasa", "aurora", "estelar", "sombra", "ditadora"]
SS = 4  # supersampling para as formas

# regiões do atlas (x, y, largura, altura)
R_LAMINA = (0, 0, 48, 48)
R_ESPIRITO = (48, 0, 48, 48)
R_ORBITAIS = [(96, 0, 12, 12), (112, 0, 12, 12), (96, 16, 12, 12), (112, 16, 12, 12)]
R_SELO = (0, 48, 56, 56)
R_PILAR = (60, 48, 24, 64)
R_CLARAO = (88, 48, 40, 40)


def hexa(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


# rampas: borda escura -> miolo claro (as faixas saem da erosão da máscara)
PALETAS = {
    "caudas": dict(rampa=["#7a1f08", "#c2400c", "#ff7a1f", "#ffb347", "#fff1d6"], acento="#ffffff", alt=["#ff7a1f", "#fff1d6"]),
    "sakura": dict(rampa=["#a8325e", "#e2678f", "#ff9ec0", "#ffd0e0", "#fff5f8"], acento="#fff5f8", alt=["#ff9ec0", "#fff5f8"]),
    "lunar": dict(rampa=["#1b1450", "#3d3490", "#7468d8", "#bdb6ff", "#f4f1ff"], acento="#f4f1ff", alt=["#bdb6ff", "#ffffff"]),
    "espirito": dict(rampa=["#0a3a7a", "#1769c9", "#3fa6ff", "#9fdcff", "#f0fbff"], acento="#f0fbff", alt=["#3fa6ff", "#f0fbff"]),
    "brasa": dict(rampa=["#6a0d05", "#c1260b", "#ff5a14", "#ffb02e", "#fff3a0"], acento="#fff3a0", alt=["#ff5a14", "#ffb02e"]),
    "aurora": dict(rampa=["#0d5c52", "#18a889", "#3ee8a2", "#9bffc9", "#e9fff4"], acento="#e9fff4", alt=["#3ee8a2", "#d36bff"]),
    "estelar": dict(rampa=["#4a2a86", "#8a5ad6", "#d7a9ff", "#ffe08a", "#fffbe6"], acento="#fffbe6", alt=["#ffd34d", "#d7a9ff"]),
    "sombra": dict(rampa=["#1a0830", "#43157d", "#7b2fd1", "#c27bff", "#f6dcff"], acento="#f6dcff", alt=["#7b2fd1", "#f6dcff"]),
    "ditadora": dict(rampa=["#4b2a8a", "#7d52d0", "#b894ff", "#ffe27a", "#fffbe0"], acento="#fffbe0", alt=["#b894ff", "#ffe27a"]),
}


def ss_mask(w, h, desenhar):
    """Máscara 'L' w x h desenhada em alta resolução (desenhar recebe o ImageDraw e o fator) e reduzida com corte duro."""
    m = Image.new("L", (w * SS, h * SS), 0)
    desenhar(ImageDraw.Draw(m), SS)
    m = m.resize((w, h), Image.LANCZOS)
    return m.point(lambda v: 255 if v >= 128 else 0)


def colorir(mascara, rampa, niveis=None):
    """Pinta pela distância da borda: erosões sucessivas dão as faixas da rampa."""
    cores = [hexa(c) for c in rampa]
    w, h = mascara.size
    saida = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    nivel = [[-1] * w for _ in range(h)]
    atual = mascara
    n = len(cores)
    for k in range(n):
        px = atual.load()
        for y in range(h):
            for x in range(w):
                if px[x, y] >= 128:
                    nivel[y][x] = k
        atual = atual.filter(ImageFilter.MinFilter(3))
    sp = saida.load()
    for y in range(h):
        for x in range(w):
            if nivel[y][x] >= 0:
                sp[x, y] = cores[min(nivel[y][x], n - 1)]
    return saida


def colar(atlas, img, regiao):
    atlas.alpha_composite(img, (regiao[0], regiao[1]))


def elipse(d, f, cx, cy, rx, ry, v=255):
    d.ellipse([(cx - rx) * f, (cy - ry) * f, (cx + rx) * f, (cy + ry) * f], fill=v)


def poligono(d, f, pts, v=255):
    d.polygon([(x * f, y * f) for x, y in pts], fill=v)


def rotacionar(pts, ang, cx, cy):
    c, s = math.cos(ang), math.sin(ang)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


def ponto(img, x, y, cor):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), cor)


# ------------------------------------------------------------------ formas pequenas (orbitais e enfeites)
def forma_pequena(nome, tam, rampa):
    """Sprite tam x tam de um motivo (pétala, estrela, chama, brasa...)."""
    c = tam / 2

    def d_petala(d, f):
        pts = [(c, 0.5), (tam - 1.5, c - 1), (c + 1, tam - 0.5), (1.5, c)]
        elipse(d, f, c, c, tam * 0.28, tam * 0.46)

    def d_estrela(d, f):
        poligono(d, f, [(c, 0), (c + 1.3, c - 1.3), (tam, c), (c + 1.3, c + 1.3), (c, tam), (c - 1.3, c + 1.3), (0, c), (c - 1.3, c - 1.3)])

    def d_chama(d, f):
        poligono(d, f, [(c, 0), (c + 2.6, c - 0.5), (c + 3.2, c + 2), (c, tam), (c - 3.2, c + 2), (c - 2.4, c - 0.5)])
        elipse(d, f, c, c + 2, 3.2, 3.4)

    def d_brasa(d, f):
        elipse(d, f, c, c, tam * 0.36, tam * 0.36)

    def d_gota(d, f):
        poligono(d, f, [(c, 0), (c + 2.6, c + 1), (c, tam), (c - 2.6, c + 1)])
        elipse(d, f, c, c + 2, 2.8, 3)

    def d_lua(d, f):
        elipse(d, f, c, c, tam * 0.45, tam * 0.45)
        elipse(d, f, c + 2.2, c - 1.2, tam * 0.4, tam * 0.4, 0)

    def d_pata(d, f):
        elipse(d, f, c, c + 2.2, 3.2, 2.6)
        for dx, dy, r in ((-3.2, -0.6, 1.3), (-1.1, -2.6, 1.3), (1.4, -2.6, 1.3), (3.4, -0.6, 1.3)):
            elipse(d, f, c + dx, c + dy, r, r + 0.3)

    def d_onigiri(d, f):
        poligono(d, f, [(c, 0.5), (tam - 0.7, tam - 1.2), (0.7, tam - 1.2)])

    def d_olho(d, f):
        elipse(d, f, c, c, tam * 0.46, tam * 0.24)

    def d_fita(d, f):
        for i in range(14):
            x = 0.5 + i * (tam - 1) / 13
            y = c + math.sin(i * 0.7) * 2.2
            elipse(d, f, x, y, 1.3, 1.3)

    formas = dict(petala=d_petala, estrela=d_estrela, chama=d_chama, brasa=d_brasa, gota=d_gota, lua=d_lua, pata=d_pata,
                  onigiri=d_onigiri, olho=d_olho, fita=d_fita)
    mask = ss_mask(tam, tam, formas[nome])
    return colorir(mask, rampa)


MOTIVOS_ORBITAL = {
    "caudas": ["chama", "estrela"],
    "sakura": ["petala", "petala"],
    "lunar": ["estrela", "lua"],
    "espirito": ["chama", "gota"],
    "brasa": ["brasa", "chama"],
    "aurora": ["fita", "estrela"],
    "estelar": ["estrela", "estrela"],
    "sombra": ["olho", "gota"],
    "ditadora": ["pata", "onigiri"],
}


# ------------------------------------------------------------------ lâmina: arco de corte
def desenhar_lamina(tema, rng):
    p = PALETAS[tema]
    w, h = R_LAMINA[2], R_LAMINA[3]

    def d(dr, f):
        elipse(dr, f, 24, 24, 23, 23)
        elipse(dr, f, 31.5, 16.5, 21, 21, 0)

    m = ss_mask(w, h, d)
    img = colorir(m, p["rampa"])
    # enfeites do tema ao longo do arco
    forma = MOTIVOS_ORBITAL[tema][0]
    for i in range(4):
        a = math.radians(120 + i * 38 + rng.uniform(-5, 5))
        r = rng.uniform(26, 30)
        x, y = int(24 + math.cos(a) * r), int(24 + math.sin(a) * r)
        pq = forma_pequena(forma, 7, [p["alt"][0], p["alt"][1], p["acento"], p["acento"]])
        img.alpha_composite(pq, (max(0, min(w - 7, x - 3)), max(0, min(h - 7, y - 3))))
    return img


# ------------------------------------------------------------------ espírito: criatura/símbolo do tema (48x48)
def desenhar_espirito(tema, rng):
    p = PALETAS[tema]
    w = h = 48

    if tema == "caudas":  # leque de nove caudas
        def d(dr, f):
            for i in range(9):
                ang = math.radians(-168 + i * 19.5)
                comp = 31 if i % 2 == 0 else 25
                pts = []
                for k in range(0, 21):
                    t = k / 20
                    larg = math.sin(t * math.pi) ** 0.8 * 2.7 * (1.2 - 0.4 * t)
                    pts.append((t * comp, -larg))
                for k in reversed(range(0, 21)):
                    t = k / 20
                    larg = math.sin(t * math.pi) ** 0.8 * 2.7 * (1.2 - 0.4 * t)
                    pts.append((t * comp, larg))
                pts = rotacionar([(24 + x, 41 + y) for x, y in pts], ang, 24, 41)
                poligono(dr, f, pts)
            elipse(dr, f, 24, 41, 5, 4.5)
            poligono(dr, f, [(18, 40), (19, 33), (24, 37), (29, 33), (30, 40)])
    elif tema == "sakura":  # flor de cerejeira
        def d(dr, f):
            for i in range(5):
                a = math.radians(-90 + i * 72)
                elipse(dr, f, 24 + math.cos(a) * 11.5, 24 + math.sin(a) * 11.5, 9.5, 9.5)
            elipse(dr, f, 24, 24, 6, 6)
            for i in range(5):  # sulcos entre as pétalas
                a = math.radians(-90 + 36 + i * 72)
                dr.line([(24 * f, 24 * f), ((24 + math.cos(a) * 26) * f, (24 + math.sin(a) * 26) * f)], fill=0, width=int(1.3 * f))
            elipse(dr, f, 24, 24, 3.2, 3.2, 255)
    elif tema == "lunar":  # lua grande com estrela
        def d(dr, f):
            elipse(dr, f, 22, 25, 19, 19)
            elipse(dr, f, 31, 19, 16, 16, 0)
            poligono(dr, f, [(38, 6), (39.3, 11), (44, 12.5), (39.3, 14), (38, 19), (36.7, 14), (32, 12.5), (36.7, 11)])
    elif tema == "espirito":  # máscara de raposa em chamas azuis
        def d(dr, f):
            poligono(dr, f, [(6, 6), (17, 14), (31, 14), (42, 6), (41, 24), (24, 45), (7, 24)])
            for dx in (-1, 1):  # chamas do cabelo
                poligono(dr, f, [(24 + dx * 14, 14), (24 + dx * 19, 3), (24 + dx * 9, 11)])
            poligono(dr, f, [(24, 12), (27, 2), (21, 2)])
    elif tema == "brasa":  # chama grande de três línguas
        def d(dr, f):
            elipse(dr, f, 24, 31, 14, 14)
            poligono(dr, f, [(24, 1), (31, 15), (38, 28), (10, 28), (17, 15)])
            poligono(dr, f, [(11, 12), (15, 24), (7, 32)])
            poligono(dr, f, [(37, 12), (33, 24), (41, 32)])
    elif tema == "aurora":  # cortinas de aurora
        def d(dr, f):
            for k, off in enumerate((-12, 0, 12)):
                pts = []
                for i in range(24):
                    y = 2 + i * 1.9
                    pts.append((24 + off + math.sin(i * 0.5 + k) * 5 - 3.2, y))
                for i in reversed(range(24)):
                    y = 2 + i * 1.9
                    pts.append((24 + off + math.sin(i * 0.5 + k) * 5 + 3.2, y))
                poligono(dr, f, pts)
    elif tema == "estelar":  # estrela de quatro pontas e satélites
        def d(dr, f):
            poligono(dr, f, [(24, 1), (28, 20), (47, 24), (28, 28), (24, 47), (20, 28), (1, 24), (20, 20)])
            for (x, y) in ((9, 9), (39, 8), (8, 39), (40, 40)):
                poligono(dr, f, [(x, y - 4), (x + 1.4, y - 1.4), (x + 4, y), (x + 1.4, y + 1.4), (x, y + 4), (x - 1.4, y + 1.4), (x - 4, y), (x - 1.4, y - 1.4)])
    elif tema == "sombra":  # cabeça de gato de sombra
        def d(dr, f):
            elipse(dr, f, 24, 28, 19, 15)
            poligono(dr, f, [(5, 22), (8, 3), (20, 15)])
            poligono(dr, f, [(43, 22), (40, 3), (28, 15)])
            for dx in (-1, 1):
                poligono(dr, f, [(24 + dx * 16, 40), (24 + dx * 21, 47), (24 + dx * 10, 43)])
            poligono(dr, f, [(24, 41), (27, 47), (21, 47)])
    else:  # ditadora: onigiri com orelhinhas de gato
        def d(dr, f):
            poligono(dr, f, [(24, 12), (42, 42), (6, 42)])
            elipse(dr, f, 24, 30, 15, 12)
            poligono(dr, f, [(10, 24), (11, 6), (22, 14)])
            poligono(dr, f, [(38, 24), (37, 6), (26, 14)])

    m = ss_mask(w, h, d)
    img = colorir(m, p["rampa"])
    px = img.load()
    acento, claro = hexa(p["acento"]), hexa(p["rampa"][-1])
    # olhos e detalhes que cada criatura precisa
    if tema == "espirito":
        escuro = hexa(p["rampa"][0])
        for ox in (-9, 9):
            for dx in range(-3, 4):
                for dy in range(0, 3):
                    if abs(dx) + 2 * dy <= 4:
                        ponto(img, 24 + ox + dx, 22 + dy, escuro)
            ponto(img, 24 + ox, 22, acento)
    elif tema == "sombra":
        for ox in (-8, 8):
            for dx in range(-3, 4):
                for dy in range(-1, 2):
                    if abs(dx) + 2 * abs(dy) <= 4:
                        ponto(img, 24 + ox + dx, 27 + dy, hexa("#ff6bd6") if abs(dy) < 1 else hexa("#ffd1f2"))
    elif tema == "ditadora":
        nori = hexa("#2a1a4a")
        for y in range(36, 43):
            for x in range(8, 41):
                if px[x, y][3] > 0 and y >= 37:
                    px[x, y] = nori
        for (x, y) in ((19, 27), (29, 27)):
            for dy in range(0, 3):
                ponto(img, x, y + dy, nori)
        for x in range(22, 27):
            ponto(img, x, 31 + (0 if x in (22, 26) else 1), nori)
        pa = forma_pequena("pata", 8, ["#4b2a8a", "#7d52d0", "#b894ff", "#ffe27a"])
        img.alpha_composite(pa, (17, 14))
    elif tema == "lunar":
        pass
    return img


# ------------------------------------------------------------------ selo (círculo mágico, visto de cima, 56x56)
def desenhar_selo(tema, rng):
    p = PALETAS[tema]
    n = R_SELO[2]
    c = n / 2
    n_pontas = {"caudas": 9, "sakura": 5, "lunar": 8, "espirito": 6, "brasa": 12, "aurora": 7, "estelar": 8, "sombra": 6, "ditadora": 9}[tema]

    def d(dr, f):
        elipse(dr, f, c, c, 27.5, 27.5)
        elipse(dr, f, c, c, 25.2, 25.2, 0)
        elipse(dr, f, c, c, 19.5, 19.5)
        elipse(dr, f, c, c, 17.4, 17.4, 0)
        for i in range(n_pontas):  # marcas entre os anéis
            a = math.radians(i * 360 / n_pontas)
            poligono(dr, f, rotacionar([(c + 19, c - 1.2), (c + 25, c - 2.2), (c + 25, c + 2.2), (c + 19, c + 1.2)], a, c, c))
        # estrela central
        for i in range(n_pontas):
            a = math.radians(i * 360 / n_pontas + 90)
            poligono(dr, f, rotacionar([(c, c - 15), (c + 2.2, c - 4), (c - 2.2, c - 4)], a, c, c))
        elipse(dr, f, c, c, 3.4, 3.4)

    m = ss_mask(n, n, d)
    img = colorir(m, p["rampa"][1:] if len(p["rampa"]) > 4 else p["rampa"])
    return img


# ------------------------------------------------------------------ pilar de luz (24x64)
def desenhar_pilar(tema, rng):
    p = PALETAS[tema]
    w, h = R_PILAR[2], R_PILAR[3]

    def d(dr, f):
        pts = [(12, 0)]
        for i in range(0, 17):
            y = i * 4
            larg = 11.5 - (1 - i / 16) * 7  # afina no topo
            pts.append((12 + larg + (1.5 if i % 2 else 0), y))
        for i in reversed(range(0, 17)):
            y = i * 4
            larg = 11.5 - (1 - i / 16) * 7
            pts.append((12 - larg - (1.5 if i % 2 else 0), y))
        poligono(dr, f, pts)

    m = ss_mask(w, h, d)
    img = colorir(m, p["rampa"])
    pq = forma_pequena(MOTIVOS_ORBITAL[tema][1], 6, [p["alt"][0], p["alt"][1], p["acento"], p["acento"]])
    for k in range(5):
        img.alpha_composite(pq, (rng.randint(1, 16), 4 + k * 12))
    return img


# ------------------------------------------------------------------ clarão (estouro de luz, 40x40)
def desenhar_clarao(tema, rng):
    p = PALETAS[tema]
    n = R_CLARAO[2]
    c = n / 2

    def d(dr, f):
        for i in range(8):
            a = math.radians(i * 45 + 22.5)
            comp = 19.5 if i % 2 == 0 else 13
            poligono(dr, f, rotacionar([(c, c - comp), (c + 3.2, c), (c - 3.2, c)], a, c, c))
        elipse(dr, f, c, c, 8.5, 8.5)

    return colorir(ss_mask(n, n, d), p["rampa"])


def atlas(tema):
    rng = random.Random(f"abate-{tema}")
    p = PALETAS[tema]
    a = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    colar(a, desenhar_lamina(tema, rng), R_LAMINA)
    colar(a, desenhar_espirito(tema, rng), R_ESPIRITO)
    formas = MOTIVOS_ORBITAL[tema]
    for i, reg in enumerate(R_ORBITAIS):
        rampa = p["rampa"] if i % 2 == 0 else p["rampa"][::-1] if False else [p["rampa"][0], p["alt"][0], p["alt"][1], p["acento"]]
        colar(a, forma_pequena(formas[i // 2 % 2] if i < 2 else formas[(i + 1) % 2], 12, rampa), reg)
    colar(a, desenhar_selo(tema, rng), R_SELO)
    colar(a, desenhar_pilar(tema, rng), R_PILAR)
    colar(a, desenhar_clarao(tema, rng), R_CLARAO)
    return a


# ------------------------------------------------------------------ geometria, animação, entidade, render controller
def plano(origem, tam, uv_pos, uv_tam, rot=None):
    cubo = {
        "origin": origem,
        "size": [tam[0], tam[1], 0.1],
        "uv": {
            "north": {"uv": uv_pos, "uv_size": uv_tam},
            "south": {"uv": uv_pos, "uv_size": uv_tam},
        },
    }
    return cubo


def geometria():
    ossos = [{"name": "raiz", "pivot": [0, 0, 0]}]

    def osso(nome, pai, pivot, cubos=None, rot=None):
        o = {"name": nome, "parent": pai, "pivot": pivot}
        if rot:
            o["rotation"] = rot
        if cubos:
            o["cubes"] = cubos
        ossos.append(o)

    # f0 lâmina
    osso("f0_raiz", "raiz", [0, 24, 0], [plano([-24, 0, -0.05], [48, 48], [0, 0], [48, 48])])
    # f1 selo (disco deitado)
    osso("f1_raiz", "raiz", [0, 0, 0], [{
        "origin": [-28, 0, -28], "size": [56, 0.1, 56],
        "uv": {"up": {"uv": [0, 48], "uv_size": [56, 56]}, "down": {"uv": [0, 104], "uv_size": [56, -56]}},
    }])
    # f2 pilar (dois planos cruzados)
    osso("f2_raiz", "raiz", [0, 0, 0])
    osso("f2_a", "f2_raiz", [0, 0, 0], [plano([-12, 0, -0.05], [24, 64], [60, 48], [24, 64])])
    osso("f2_b", "f2_raiz", [0, 0, 0], [plano([-12, 0, -0.05], [24, 64], [60, 48], [24, 64])], rot=[0, 90, 0])
    # f3 espírito
    osso("f3_raiz", "raiz", [0, 0, 0])
    osso("f3_corpo", "f3_raiz", [0, 24, 0], [plano([-24, 0, -0.05], [48, 48], [48, 0], [48, 48])])
    # f4 orbitais
    osso("f4_raiz", "raiz", [0, 0, 0])
    for i in range(1, 7):
        osso(f"f4_o{i}", "f4_raiz", [0, 0, 0])
        uv = R_ORBITAIS[(i - 1) % 4]
        osso(f"f4_s{i}", f"f4_o{i}", [0, 0, 0], [plano([-6, -6, -0.05], [12, 12], [uv[0], uv[1]], [12, 12])])
        osso(f"f4_t{i}", f"f4_s{i}", [0, 0, 0], [plano([-6, -6, -0.05], [12, 12], [uv[0], uv[1]], [12, 12])], rot=[0, 90, 0])
    # f5 clarão
    osso("f5_raiz", "raiz", [0, 24, 0], [plano([-20, 4, -0.05], [40, 40], [88, 48], [40, 40])])
    osso("f5_b", "f5_raiz", [0, 24, 0], [plano([-20, 4, -0.05], [40, 40], [88, 48], [40, 40])], rot=[0, 90, 0])
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.vulpus.abate",
                "texture_width": 128,
                "texture_height": 128,
                "visible_bounds_width": 8,
                "visible_bounds_height": 8,
                "visible_bounds_offset": [0, 2, 0],
            },
            "bones": ossos,
        }],
    }


def T():
    return "query.life_time"


def rampa(a, b):
    return f"math.clamp(({T()} - {a}) / ({b} - {a}), 0, 1)"


def suave(a, b):  # sobe rápido e desacelera
    return f"(1 - math.pow(1 - {rampa(a, b)}, 3))"


def some(a, b):  # 1 até a, depois cai até 0 em b
    return f"(1 - {rampa(a, b)})"


V = "query.property('vulpus:var')"
SENT = f"(math.mod({V}, 2) == 0 ? 1 : -1)"
VEL = f"(1 + 0.5 * math.floor({V} / 2))"
TAM = "(0.8 + 0.2 * query.property('vulpus:tam'))"


def animacoes():
    an = {}
    esc = f"math.max(0.001, {TAM} * {suave(0, 0.16)} * {some(1.5, 2.1)})"
    an["animation.vulpus.abate.f0"] = {"loop": True, "bones": {"f0_raiz": {
        "scale": [esc, esc, esc],
        "rotation": [f"-20 + {V} * 10", 0, f"(-70 + 140 * {suave(0, 0.45)}) * {SENT}"],
        "position": [0, f"6 + 10 * {suave(0, 1.2)}", 0],
    }}}
    es1 = f"math.max(0.001, {TAM} * {suave(0, 0.3)} * {some(1.6, 2.2)} * (1 + 0.06 * math.sin({T()} * 400)))"
    an["animation.vulpus.abate.f1"] = {"loop": True, "bones": {"f1_raiz": {
        "scale": [es1, 1, es1],
        "rotation": [0, f"{T()} * 110 * {SENT} * {VEL}", 0],
        "position": [0, f"1 + 34 * {suave(0, 2.0)}", 0],
    }}}
    exz = f"math.max(0.001, {TAM} * (0.25 + 0.75 * {suave(0, 0.25)}) * {some(1.3, 2.0)})"
    ey = f"math.max(0.001, {TAM} * {suave(0, 0.22)} * (1 + 0.08 * math.sin({T()} * 420)))"
    an["animation.vulpus.abate.f2"] = {"loop": True, "bones": {"f2_raiz": {
        "scale": [exz, ey, exz],
        "rotation": [0, f"{T()} * 170 * {SENT} * {VEL}", 0],
    }}}
    es3 = f"math.max(0.001, {TAM} * {suave(0, 0.2)} * {some(1.5, 2.2)})"
    an["animation.vulpus.abate.f3"] = {"loop": True, "bones": {
        "f3_raiz": {"rotation": [0, f"{V} * 90 + 30", 0]},
        "f3_corpo": {
            "scale": [es3, es3, es3],
            "position": [f"-40 + 110 * {suave(0, 1.4)}", f"6 + 8 * math.sin({T()} * 180) + 14 * {suave(0, 1.4)}", 0],
            "rotation": [0, 0, f"math.sin({T()} * 220) * 6"],
        },
    }}
    bones = {}
    for i in range(1, 7):
        fase = i * 60
        bones[f"f4_o{i}"] = {"rotation": [0, f"{fase} + {T()} * (300 + 40 * {i}) * {SENT} * {VEL}", 0]}
        pulso = f"math.max(0.001, {TAM} * {suave(0, 0.15)} * {some(1.6, 2.3)} * (0.85 + 0.25 * math.sin({T()} * 300 + {i * 50})))"
        bones[f"f4_s{i}"] = {
            "position": [f"10 + 22 * {suave(0, 1.6)}", f"4 + {(i % 3) * 6} + 36 * {suave(0, 2.0)}", 0],
            "scale": [pulso, pulso, pulso],
        }
    an["animation.vulpus.abate.f4"] = {"loop": True, "bones": bones}
    ec = f"math.max(0.001, {TAM} * (0.4 + 1.2 * {suave(0, 0.15)}) * {some(0.15, 0.55)})"
    an["animation.vulpus.abate.f5"] = {"loop": True, "bones": {"f5_raiz": {"scale": [ec, ec, ec], "rotation": [0, 0, f"{T()} * 200"]}}}
    return {"format_version": "1.8.0", "animations": an}


def entidade_rp():
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {"description": {
            "identifier": "vulpus:abate",
            "materials": {"default": "entity_alphatest"},
            "textures": {t: f"textures/vulpus/entidades/abate_{t}" for t in TEMAS},
            "geometry": {"default": "geometry.vulpus.abate"},
            "animations": {f"f{i}": f"animation.vulpus.abate.f{i}" for i in range(6)},
            "scripts": {"animate": [{f"f{i}": f"query.property('vulpus:forma') == {i}"} for i in range(6)]},
            "render_controllers": ["controller.render.vulpus.abate"],
        }},
    }


def render_controller():
    return {
        "format_version": "1.8.0",
        "render_controllers": {"controller.render.vulpus.abate": {
            "arrays": {"textures": {"Array.temas": [f"Texture.{t}" for t in TEMAS]}},
            "geometry": "Geometry.default",
            "materials": [{"*": "Material.default"}],
            "textures": ["Array.temas[math.clamp(query.property('vulpus:tema'), 0, 8)]"],
            "part_visibility": [{"*": False}, {"raiz": True}] + [{f"f{i}_*": f"query.property('vulpus:forma') == {i}"} for i in range(6)],
            "ignore_lighting": True,
        }},
    }


def entidade_bp():
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": "vulpus:abate",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
                "properties": {
                    "vulpus:tema": {"type": "int", "range": [0, 8], "default": 0, "client_sync": True},
                    "vulpus:forma": {"type": "int", "range": [0, 5], "default": 0, "client_sync": True},
                    "vulpus:var": {"type": "int", "range": [0, 3], "default": 0, "client_sync": True},
                    "vulpus:tam": {"type": "int", "range": [0, 2], "default": 1, "client_sync": True},
                },
            },
            "component_groups": {
                "vulpus:vida": {"minecraft:timer": {"time": [3.2, 3.2], "looping": False, "time_down_event": {"event": "vulpus:sumir", "target": "self"}}},
                "vulpus:somindo": {"minecraft:instant_despawn": {}},
            },
            "components": {
                "minecraft:type_family": {"family": ["vulpus_abate", "inanimate"]},
                "minecraft:collision_box": {"width": 0.01, "height": 0.01},
                "minecraft:physics": {"has_gravity": False, "has_collision": False},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
            },
            "events": {
                "minecraft:entity_spawned": {"add": {"component_groups": ["vulpus:vida"]}},
                "vulpus:sumir": {"add": {"component_groups": ["vulpus:somindo"]}},
            },
        },
    }


def gravar(caminho, dado):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    TEX.mkdir(parents=True, exist_ok=True)
    imagens = {}
    for t in TEMAS:
        a = atlas(t)
        a.save(TEX / f"abate_{t}.png")
        imagens[t] = a
    gravar(RP / "models" / "entity" / "abate.geo.json", geometria())
    gravar(RP / "animations" / "abate.animation.json", animacoes())
    gravar(RP / "entity" / "abate.entity.json", entidade_rp())
    gravar(RP / "render_controllers" / "abate.render_controllers.json", render_controller())
    gravar(RAIZ / "vulpus_bp" / "entities" / "abate.json", entidade_bp())
    # prévia: cada atlas em 4x, 3 por linha, sobre fundo escuro
    esc = 3
    PREVIA.parent.mkdir(parents=True, exist_ok=True)
    folha = Image.new("RGBA", (3 * 128 * esc + 40, 3 * 128 * esc + 40), (28, 28, 40, 255))
    for i, t in enumerate(TEMAS):
        im = imagens[t].resize((128 * esc, 128 * esc), Image.NEAREST)
        folha.alpha_composite(im, (10 + (i % 3) * (128 * esc + 10), 10 + (i // 3) * (128 * esc + 10)))
    folha.convert("RGB").save(PREVIA)
    print("ok", len(TEMAS), "texturas;", PREVIA)


if __name__ == "__main__":
    sys.exit(main())
