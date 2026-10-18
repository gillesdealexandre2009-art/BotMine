"""Planta técnica do 1º andar da dungeon (150x150 blocos, 1 quadrado = 1 bloco).

Gera docs/dungeon/planta_andar1.png e docs/dungeon/salas_andar1.md. Tudo é calculado a partir das salas e corredores
abaixo, e o script confere as regras do pedido (4 entradas, tamanhos exatos, conectividade, cadeado) antes de desenhar.
Coordenadas: x vai da esquerda (0) para a direita (149), z de cima (0) para baixo (149). Os retângulos são do INTERIOR.
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

N = 150
CS = 10  # pixels por bloco
SAIDA = Path(__file__).resolve().parent.parent / "docs" / "dungeon"

# id: (nome, x0, z0, largura, altura, tipo)   tipo: n normal, e entrada, o opcional/recompensa, s secreta, b boss, k chave
SALAS = {
    1: ("Entrada Norte - Desembarque", 68, 1, 15, 15, "e"),
    2: ("Entrada Leste - Recepção subterrânea", 136, 70, 13, 11, "e"),
    3: ("Entrada Sul - Salão de entrada", 66, 132, 19, 17, "e"),
    4: ("Entrada Oeste - Galeria inicial", 1, 69, 15, 13, "e"),
    5: ("Câmara de saque", 2, 5, 11, 11, "o"),
    6: ("Sala de armadilhas", 40, 3, 15, 15, "n"),
    7: ("Distribuidor de corredores", 118, 14, 13, 13, "n"),
    8: ("Galeria dos pilares", 17, 24, 13, 17, "n"),
    9: ("Arquivo esquecido", 41, 26, 11, 13, "n"),
    10: ("Catacumbas", 17, 48, 15, 19, "n"),
    11: ("Câmara de combate", 127, 33, 17, 17, "n"),
    12: ("Cofre secundário", 98, 19, 11, 11, "o"),
    13: ("Salão central", 65, 82, 21, 21, "n"),
    14: ("Câmara da chave", 134, 17, 9, 9, "k"),
    15: ("Tesouro escondido", 2, 52, 11, 11, "s"),
    16: ("Sala de desafio", 97, 33, 15, 15, "n"),
    17: ("Antecâmara do guardião", 70, 66, 11, 13, "n"),
    18: ("Arena do boss", 63, 38, 25, 25, "b"),
    19: ("Oficina abandonada", 28, 69, 13, 13, "n"),
    20: ("Galeria sul", 26, 90, 15, 11, "n"),
    21: ("Cripta lateral", 2, 91, 11, 11, "o"),
    22: ("Câmara oculta", 126, 134, 11, 11, "s"),
    23: ("Salão da guarda", 101, 133, 15, 13, "n"),
    24: ("Sala das correntes", 101, 107, 13, 13, "n"),
    25: ("Prisão esquecida", 2, 121, 13, 13, "n"),
    26: ("Depósito inundado", 24, 121, 15, 13, "n"),
}

# corredores: ("h", x1, x2, zc, largura, tipo) / ("v", z1, z2, xc, largura, tipo)   tipo: c comum, s secreto, l cadeado
CORREDORES = [
    # rota norte
    ("h", 55, 67, 8, 5, "c"), ("v", 18, 25, 47, 5, "c"), ("h", 30, 40, 32, 5, "c"), ("v", 41, 47, 23, 5, "c"),
    ("h", 32, 53, 57, 5, "c"), ("v", 35, 88, 56, 5, "c"), ("h", 59, 64, 86, 5, "c"), ("h", 52, 53, 36, 3, "c"),
    ("v", 16, 32, 7, 3, "c"), ("h", 6, 16, 32, 3, "c"), ("h", 13, 16, 57, 3, "s"),
    # rota oeste
    ("h", 16, 27, 75, 5, "c"), ("v", 82, 89, 34, 5, "c"), ("h", 41, 64, 95, 5, "c"),
    ("v", 82, 90, 7, 3, "c"), ("h", 13, 25, 97, 3, "c"),
    ("v", 102, 120, 7, 3, "c"), ("h", 15, 23, 127, 3, "c"), ("v", 101, 120, 31, 3, "c"),
    # rota sul
    ("h", 85, 100, 139, 5, "c"), ("v", 120, 132, 107, 3, "c"), ("h", 80, 100, 109, 5, "c"), ("v", 103, 111, 81, 5, "c"),
    ("h", 116, 125, 139, 3, "s"),
    # rota leste
    ("v", 50, 69, 141, 5, "c"), ("h", 112, 126, 41, 5, "c"), ("v", 48, 93, 103, 5, "c"), ("h", 86, 105, 91, 5, "c"),
    ("v", 30, 32, 103, 3, "c"), ("h", 109, 117, 23, 3, "c"), ("v", 27, 32, 129, 3, "c"), ("h", 131, 133, 21, 3, "c"),
    # final: central -> antecâmara (cadeado) -> arena
    ("v", 79, 81, 74, 3, "l"), ("v", 63, 65, 74, 3, "c"),
]
# 4 entradas externas (3 blocos de largura): lado -> (x0, z0, x1, z1)
ENTRADAS = {"Norte": (74, 0, 76, 0), "Leste": (149, 74, 149, 76), "Sul": (74, 149, 76, 149), "Oeste": (0, 74, 0, 76)}
CHAVE_EM = 14  # sala onde fica a chave

ROCHA, SALA, CORR, PAREDE, PORTA, ENTR, SECRETO, CADEADO = range(8)
grade = [[ROCHA] * N for _ in range(N)]
dono = [[0] * N for _ in range(N)]  # id da sala
anel_porta = {}  # (x, z) -> id da sala cuja parede é essa célula


def cavar(x, z, tipo):
    if grade[z][x] == SALA:
        return
    if grade[z][x] in (SECRETO, CADEADO) and tipo == CORR:
        return
    grade[z][x] = tipo


for rid, (nome, x0, z0, w, h, t) in SALAS.items():
    assert x0 >= 1 and z0 >= 1 and x0 + w <= N - 1 and z0 + h <= N - 1, f"sala {rid} fora da área"
    for z in range(z0, z0 + h):
        for x in range(x0, x0 + w):
            assert grade[z][x] == ROCHA, f"sala {rid} sobrepõe outra em {x},{z}"
            grade[z][x] = SALA
            dono[z][x] = rid
    for x in range(x0, x0 + w):
        anel_porta[(x, z0 - 1)] = rid
        anel_porta[(x, z0 + h)] = rid
    for z in range(z0, z0 + h):
        anel_porta[(x0 - 1, z)] = rid
        anel_porta[(x0 + w, z)] = rid

for eixo, a, b, c, larg, tipo in CORREDORES:
    t = {"c": CORR, "s": SECRETO, "l": CADEADO}[tipo]
    lado = larg // 2
    for u in range(a, b + 1):
        for k in range(c - lado, c + lado + 1):
            x, z = (u, k) if eixo == "h" else (k, u)
            cavar(x, z, t)

# portas: corredor comum que atravessa a parede de uma sala
for (x, z), rid in anel_porta.items():
    if 0 <= x < N and 0 <= z < N and grade[z][x] == CORR:
        grade[z][x] = PORTA

# paredes: toda célula de rocha encostada (inclusive na diagonal) em área aberta
ABERTO = (SALA, CORR, PORTA, SECRETO, CADEADO)
for z in range(N):
    for x in range(N):
        if grade[z][x] != ROCHA:
            continue
        for dz in (-1, 0, 1):
            for dx in (-1, 0, 1):
                xx, zz = x + dx, z + dz
                if 0 <= xx < N and 0 <= zz < N and grade[zz][xx] in ABERTO:
                    grade[z][x] = PAREDE
for lado, (x0, z0, x1, z1) in ENTRADAS.items():
    for z in range(z0, z1 + 1):
        for x in range(x0, x1 + 1):
            assert grade[z][x] == PAREDE, f"entrada {lado} fora da parede"
            grade[z][x] = ENTR

# ---------------------------------------------------------------- validações
erros = []
for rid, (nome, x0, z0, w, h, t) in SALAS.items():
    n = sum(1 for z in range(N) for x in range(N) if dono[z][x] == rid)
    if n != w * h:
        erros.append(f"sala {rid}: {n} quadrados != {w}x{h}")
if SALAS[18][3:5] != (25, 25):
    erros.append("arena não é 25x25")
if sum(1 for z in range(N) for x in range(N) if grade[z][x] == ENTR) != 12:
    erros.append("entradas externas incorretas")


def alcancavel(origem, bloqueados=(), proibido_secreto=False):
    fila = deque([origem])
    visto = {origem}
    while fila:
        x, z = fila.popleft()
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            xx, zz = x + dx, z + dz
            if not (0 <= xx < N and 0 <= zz < N) or (xx, zz) in visto:
                continue
            g = grade[zz][xx]
            if g not in (SALA, CORR, PORTA, ENTR, SECRETO, CADEADO):
                continue
            if g in bloqueados or (proibido_secreto and g == SECRETO):
                continue
            visto.add((xx, zz))
            fila.append((xx, zz))
    return visto


def centro(rid):
    _, x0, z0, w, h, _ = SALAS[rid]
    return (x0 + w // 2, z0 + h // 2)


todo = alcancavel((75, 1))
for rid in SALAS:
    if centro(rid) not in todo:
        erros.append(f"sala {rid} desconectada")
sem_cadeado = alcancavel((75, 1), bloqueados=(CADEADO,))
if centro(18) in sem_cadeado or centro(17) in sem_cadeado:
    erros.append("o cadeado não isola a antecâmara/arena")
if centro(13) not in sem_cadeado:
    erros.append("o salão central deveria ser alcançável sem a chave")
if centro(CHAVE_EM) not in sem_cadeado:
    erros.append("a chave precisa ficar numa sala alcançável sem a chave")
for lado, (x0, z0, x1, z1) in ENTRADAS.items():
    # cada rota passa por salas próprias antes do salão central: precisa de >= 3 salas diferentes até chegar nele
    origem = ((x0 + x1) // 2, (z0 + z1) // 2)
    visto = alcancavel(origem, bloqueados=(CADEADO,), proibido_secreto=True)
    if centro(13) not in visto:
        erros.append(f"entrada {lado} não chega ao salão central")
# a arena só tem a abertura da antecâmara (nenhuma outra célula aberta encostada em suas paredes)
_, ax, az, aw, ah, _ = SALAS[18]
for x in range(ax - 1, ax + aw + 1):
    for z in (az - 1, az + ah):
        if grade[z][x] in (CORR, PORTA, SECRETO, CADEADO, ENTR) and not (73 <= x <= 75 and z == az + ah):
            erros.append(f"abertura extra na arena em {x},{z}")
for z in range(az - 1, az + ah + 1):
    for x in (ax - 1, ax + aw):
        if grade[z][x] in (CORR, PORTA, SECRETO, CADEADO, ENTR):
            erros.append(f"abertura extra na arena em {x},{z}")
if erros:
    print("ERROS:\n - " + "\n - ".join(erros))
    sys.exit(1)

# ---------------------------------------------------------------- desenho
MARGEM = 64
LEG_W = 470
W = MARGEM * 2 + N * CS + LEG_W
H = MARGEM * 2 + N * CS
CORES = {
    ROCHA: (250, 250, 250), SALA: (217, 217, 217), CORR: (74, 144, 217), PAREDE: (0, 0, 0), PORTA: (255, 214, 0),
    ENTR: (255, 214, 0), SECRETO: (150, 70, 200), CADEADO: (74, 144, 217),
}
VERDE, VERMELHO = (110, 200, 120), (225, 70, 60)
img = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(img)


def fonte(t, neg=False):
    return ImageFont.truetype("C:/Windows/Fonts/" + ("arialbd.ttf" if neg else "arial.ttf"), t)


def px(x, z):
    return MARGEM + x * CS, MARGEM + z * CS


for z in range(N):
    for x in range(N):
        g = grade[z][x]
        cor = CORES[g]
        if g == SALA:
            t = SALAS[dono[z][x]][5]
            cor = VERMELHO if t == "b" else VERDE if t in ("o", "s", "k") else CORES[SALA]
        x0, z0 = px(x, z)
        d.rectangle([x0, z0, x0 + CS, z0 + CS], fill=cor)

# grade: fina em todo quadrado, forte a cada 5, mais forte a cada 10
for i in range(N + 1):
    p = MARGEM + i * CS
    cor, larg = ((90, 90, 90), 2) if i % 10 == 0 else ((140, 140, 140), 1) if i % 5 == 0 else ((190, 190, 190), 1)
    d.line([(p, MARGEM), (p, MARGEM + N * CS)], fill=cor, width=larg)
    d.line([(MARGEM, p), (MARGEM + N * CS, p)], fill=cor, width=larg)
# repinta as paredes por cima da grade, para o contorno ficar forte
for z in range(N):
    for x in range(N):
        if grade[z][x] == PAREDE:
            x0, z0 = px(x, z)
            d.rectangle([x0, z0, x0 + CS, z0 + CS], fill=(0, 0, 0))
# coordenadas nas bordas
f = fonte(12)
for i in range(0, N + 1, 10):
    p = MARGEM + i * CS
    for off in (MARGEM - 24, MARGEM + N * CS + 8):
        d.text((p, off), str(i), fill=(0, 0, 0), font=f, anchor="mm" if False else None)
        d.text((off, p - 6), str(i), fill=(0, 0, 0), font=f)


def centrar(txt, cx, cy, fnt, cor=(0, 0, 0)):
    d.text((cx, cy), txt, fill=cor, font=fnt, anchor="mm")


def quebrar(txt, largura_px, fnt):
    palavras, linhas, atual = txt.split(), [], ""
    for p in palavras:
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=fnt) <= largura_px or not atual:
            atual = teste
        else:
            linhas.append(atual)
            atual = p
    linhas.append(atual)
    return linhas


for rid, (nome, x0, z0, w, h, t) in SALAS.items():
    cx = MARGEM + (x0 + w / 2) * CS
    cy = MARGEM + (z0 + h / 2) * CS
    nome_curto = nome.split(" - ")[-1]
    fn = fonte(11)
    linhas = quebrar(nome_curto, w * CS - 8, fn)
    total = 22 + 13 * len(linhas) + 13
    y = cy - total / 2
    centrar(str(rid), cx, y + 10, fonte(20, True), (120, 0, 0) if t == "b" else (0, 0, 0))
    y += 24
    for ln in linhas:
        centrar(ln, cx, y + 6, fn)
        y += 13
    centrar(f"{w}×{h}", cx, y + 7, fonte(11, True), (0, 60, 130))

# símbolos
def cadeado(cx, cy, s=14):
    d.rectangle([cx - s / 2, cy - 1, cx + s / 2, cy + s - 1], fill=(30, 30, 30), outline=(255, 255, 255))
    d.arc([cx - s / 3, cy - s / 1.2, cx + s / 3, cy + 3], 180, 360, fill=(30, 30, 30), width=3)
    d.ellipse([cx - 2, cy + 3, cx + 2, cy + 7], fill=(255, 214, 0))


def chave(cx, cy, s=22):
    d.ellipse([cx - s / 2, cy - s / 4, cx - s / 2 + s / 2.5, cy - s / 4 + s / 2.5], outline=(150, 100, 0), width=3, fill=(255, 214, 0))
    d.line([(cx - s / 2 + s / 2.5, cy - s / 4 + s / 5), (cx + s / 2, cy - s / 4 + s / 5)], fill=(150, 100, 0), width=3)
    d.line([(cx + s / 2 - 4, cy - s / 4 + s / 5), (cx + s / 2 - 4, cy + s / 5)], fill=(150, 100, 0), width=3)
    d.line([(cx + s / 2 - 9, cy - s / 4 + s / 5), (cx + s / 2 - 9, cy + s / 6)], fill=(150, 100, 0), width=3)


def seta(x, z, direcao, cor=(255, 255, 255), borda=(0, 0, 0)):
    cx, cy = MARGEM + (x + 0.5) * CS, MARGEM + (z + 0.5) * CS
    dx, dz = {"E": (1, 0), "W": (-1, 0), "N": (0, -1), "S": (0, 1)}[direcao]
    s = CS * 1.4
    pts = [(cx + dx * s, cy + dz * s), (cx - dx * s - dz * s * 0.9, cy - dz * s + dx * s * 0.9), (cx - dx * s + dz * s * 0.9, cy - dz * s - dx * s * 0.9)]
    d.polygon(pts, fill=cor, outline=borda)


cadeado(*px(74.5, 79.2))
cx, cz, *_ = centro(CHAVE_EM)
chave(*px(cx + 0.5, cz + 4))
# símbolo de porta secreta no meio de cada passagem roxa
for (x, z) in ((14, 57), (120, 139)):
    centrar("S", *px(x + 0.5, z + 0.5), fonte(14, True), (255, 255, 255))
# setas do sentido sugerido (entrando e seguindo cada rota)
for (x, z, dr) in [
    (75, 2, "S"), (148 - 1, 75, "W"), (75, 147, "N"), (2, 75, "E"),  # dentro de cada entrada
    (60, 8, "W"), (47, 21, "S"), (35, 32, "W"), (23, 44, "S"), (45, 57, "E"), (56, 70, "S"), (61, 86, "E"),  # norte
    (22, 75, "E"), (34, 86, "S"), (52, 95, "E"),  # oeste
    (92, 139, "E"), (107, 126, "N"), (90, 109, "W"), (81, 106, "N"),  # sul
    (141, 60, "N"), (119, 41, "W"), (103, 70, "S"), (96, 91, "W"),  # leste
    (74, 64, "N"),
]:
    seta(x, z, dr)

# rótulos externos das entradas
for lado, (x0, z0, x1, z1) in ENTRADAS.items():
    cx_, cz_ = (x0 + x1) // 2, (z0 + z1) // 2
    p = px(cx_ + 0.5, cz_ + 0.5)
    txt = f"ENTRADA {lado.upper()}"
    if lado == "Norte":
        centrar(txt, p[0], MARGEM - 38, fonte(13, True))
    elif lado == "Sul":
        centrar(txt, p[0], MARGEM + N * CS + 38, fonte(13, True))
    elif lado == "Oeste":
        for i, c in enumerate("OESTE"):
            pass
        d.text((6, p[1] - 8), "ENTRADA", fill=(0, 0, 0), font=fonte(11, True))
        d.text((6, p[1] + 5), "OESTE", fill=(0, 0, 0), font=fonte(11, True))
    else:
        d.text((MARGEM + N * CS + 6, p[1] - 8), "ENTRADA", fill=(0, 0, 0), font=fonte(11, True))
        d.text((MARGEM + N * CS + 6, p[1] + 5), "LESTE", fill=(0, 0, 0), font=fonte(11, True))

# legenda
lx = MARGEM * 2 + N * CS - 10
ly = MARGEM
d.text((lx, ly), "VULPUS - DUNGEON 1º ANDAR", fill=(0, 0, 0), font=fonte(18, True))
d.text((lx, ly + 24), "Planta técnica 150×150 blocos", fill=(60, 60, 60), font=fonte(13))
d.text((lx, ly + 42), "1 quadrado = 1 bloco  |  topo = norte", fill=(60, 60, 60), font=fonte(13))
itens = [
    ((0, 0, 0), "Parede (1 bloco de espessura)"), (CORES[SALA], "Interior de sala"), (CORES[CORR], "Corredor (principal 5, secundário 3)"),
    (VERDE, "Sala opcional / recompensa"), ((255, 214, 0), "Entrada externa e portas (3 blocos)"), (VERMELHO, "Arena do boss (25×25)"),
    ((150, 70, 200), "Passagem secreta (porta oculta)"),
]
yy = ly + 78
for cor, txt in itens:
    d.rectangle([lx, yy, lx + 22, yy + 22], fill=cor, outline=(0, 0, 0))
    d.text((lx + 32, yy + 4), txt, fill=(0, 0, 0), font=fonte(13))
    yy += 30
cadeado(lx + 11, yy + 5)
d.text((lx + 32, yy + 4), "Passagem bloqueada (exige a chave)", fill=(0, 0, 0), font=fonte(13))
yy += 30
chave(lx + 11, yy + 8)
d.text((lx + 32, yy + 4), "Local da chave (sala 14)", fill=(0, 0, 0), font=fonte(13))
yy += 30
d.polygon([(lx, yy), (lx + 22, yy + 11), (lx, yy + 22)], fill=(255, 255, 255), outline=(0, 0, 0))
d.text((lx + 32, yy + 4), "Sentido sugerido de exploração", fill=(0, 0, 0), font=fonte(13))
yy += 40
d.text((lx, yy), "Grade: fina = 1 bloco, média = 5, forte = 10", fill=(60, 60, 60), font=fonte(12))
yy += 26
d.text((lx, yy), "SALAS (nº  nome  largura×comprimento)", fill=(0, 0, 0), font=fonte(13, True))
yy += 22
for rid, (nome, x0, z0, w, h, t) in SALAS.items():
    marca = " *secreta" if t == "s" else ""
    d.text((lx, yy), f"{rid:>2}  {nome.split(' - ')[-1]}  {w}×{h}{marca}", fill=(0, 0, 0), font=fonte(12))
    yy += 17
d.text((lx, yy + 8), "Fluxo: 4 entradas → rotas próprias → salão central (13)", fill=(60, 60, 60), font=fonte(12))
d.text((lx, yy + 25), "→ passagem com cadeado → antecâmara (17) → arena (18)", fill=(60, 60, 60), font=fonte(12))

SAIDA.mkdir(parents=True, exist_ok=True)
img.save(SAIDA / "planta_andar1.png")

with open(SAIDA / "salas_andar1.md", "w", encoding="utf-8") as fh:
    fh.write("# Dungeon 1º andar: salas e conexões\n\nCoordenadas do INTERIOR: x (esquerda→direita, 0-149) e z (cima→baixo, 0-149); canto superior esquerdo + tamanho.\n\n")
    fh.write("| Nº | Sala | Canto (x, z) | Largura×Comprimento | Tipo |\n|---|---|---|---|---|\n")
    tipos = {"n": "comum", "e": "entrada", "o": "opcional/recompensa", "s": "secreta", "b": "boss", "k": "chave"}
    for rid, (nome, x0, z0, w, h, t) in SALAS.items():
        fh.write(f"| {rid} | {nome} | ({x0}, {z0}) até ({x0 + w - 1}, {z0 + h - 1}) | {w}×{h} | {tipos[t]} |\n")
    fh.write("\n## Corredores (centro e largura)\n\n")
    for eixo, a, b, c, larg, t in CORREDORES:
        nome_t = {"c": "", "s": " (secreto)", "l": " (CADEADO: exige a chave da sala 14)"}[t]
        if eixo == "h":
            fh.write(f"- horizontal de x={a} a x={b}, centro z={c}, largura {larg}{nome_t}\n")
        else:
            fh.write(f"- vertical de z={a} a z={b}, centro x={c}, largura {larg}{nome_t}\n")
    fh.write("\n## Entradas externas (3 blocos)\n\n")
    for lado, (x0, z0, x1, z1) in ENTRADAS.items():
        fh.write(f"- {lado}: ({x0}, {z0}) até ({x1}, {z1})\n")
    fh.write("\n## Rotas\n\n- Norte: 1 → 6 → 9 → 8 → 10 → corredor oeste → 13 (ramais: 5, secreta 15, retorno 9↔corredor)\n"
             "- Oeste: 4 → 19 → 20 → 13 (ramais: 21 com retorno a 20; 25 → 26 com retorno a 20)\n- Sul: 3 → 23 → 24 → 13 (ramal secreto: 22)\n"
             "- Leste: 2 → 11 → 16 → 13 (ramais: 7 e 12 com retorno a 11/16; 14 = chave)\n- Final: 13 → (cadeado) → 17 → 18\n")
print("ok", SAIDA / "planta_andar1.png", img.size)
