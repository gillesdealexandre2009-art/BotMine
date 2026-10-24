"""Prévia 3D da armadura "Ausentes" vestida em um humanoide Minecraft (renderizador por raios, só numpy + Pillow).

Uso (Python embutido, numpy em C:\\Users\\gille\\vt\\pynum):
  python tools/previa_armadura3d.py                      # depois (arquivos atuais) em docs/previas/armadura3d_depois.png
  python tools/previa_armadura3d.py --antes HEAD         # também gera o "antes" (git show HEAD:...) e um comparativo
  python tools/previa_armadura3d.py --saida X.png --escala 10

Modelo: cabeça 8x8x8, tronco 8x12x4, braços e pernas 4x12x4 (pele simples por baixo). Camada 1 (elmo, peitoral, braços, botas) com
inflate de 1 px; camada 2 (calças: quadril e pernas) com inflate de 0,5 px (valores do `geometry.humanoid.armor.*` do jogo). UV de
armadura 64x32; braço e perna esquerdos são o MESMO retângulo espelhado (mirror), como no jogo. 4 ângulos: frente, 3/4, lado, costas.
"""
import argparse
import io
import os
import subprocess
import sys

sys.path.insert(0, r"C:\Users\gille\vt\pynum")
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
ARM = os.path.join(RAIZ, "vulpus_rp", "textures", "models", "armor")
PREVIAS = os.path.join(RAIZ, "docs", "previas")


# ---------------------------------------------------------------- pele-base simples (64x32, mesmo layout)
def pele_base():
    img = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    px = img.load()
    pele, cabelo, camisa, calca, sapato = (222, 168, 130), (84, 60, 40), (60, 150, 160), (60, 66, 130), (80, 80, 84)

    def preencher(x, y, w, h, cor):
        for j in range(h):
            for i in range(w):
                px[x + i, y + j] = cor + (255,)
    # cabeça: todas as faces cor de pele, cabelo no topo e atrás
    preencher(0, 0, 32, 16, pele)
    preencher(8, 0, 8, 8, cabelo)
    preencher(8, 8, 8, 2, cabelo)
    preencher(0, 8, 8, 2, cabelo)
    preencher(16, 8, 8, 2, cabelo)
    preencher(24, 8, 8, 8, cabelo)
    px[10, 12] = (40, 60, 160, 255)
    px[13, 12] = (40, 60, 160, 255)
    # tronco
    preencher(16, 16, 24, 16, camisa)
    preencher(16, 16, 12, 4, camisa)
    # braços (pele nas pontas)
    preencher(40, 16, 16, 16, camisa)
    preencher(40, 28, 16, 4, pele)
    preencher(44, 16, 4, 4, camisa)
    # pernas
    preencher(0, 16, 16, 16, calca)
    preencher(0, 28, 16, 4, sapato)
    return img


# ---------------------------------------------------------------- caixas
class Caixa:
    def __init__(self, tex, uv, tam, pos, infl, espelho=False):
        self.tex = np.asarray(tex.convert("RGBA"), dtype=np.uint8)
        self.u, self.v = uv
        self.w, self.h, self.d = tam
        x, y, z = pos  # canto mínimo (antes do inflate)
        self.lo = np.array([x - infl, y - infl, z - infl], float)
        self.hi = np.array([x + self.w + infl, y + self.h + infl, z + self.d + infl], float)
        self.espelho = espelho

    def faces(self):
        w, h, d, u, v = self.w, self.h, self.d, self.u, self.v
        return {
            "right": (u, v + d, d, h), "front": (u + d, v + d, w, h), "left": (u + d + w, v + d, d, h),
            "back": (u + 2 * d + w, v + d, w, h), "top": (u + d, v, w, d), "bottom": (u + d + w, v, w, d),
        }

    def amostra(self, pt, eixo, sinal):
        """Cor e alfa no ponto de impacto (n pontos). Convenção: personagem olha +Z, direita dele = -X (esquerda na tela)."""
        n = pt.shape[0]
        dim = self.hi - self.lo
        f = np.clip((pt - self.lo) / dim, 0, 0.9999)  # 0..1 em cada eixo
        fx, fy, fz = f[:, 0], f[:, 1], f[:, 2]
        if eixo == 0:  # lados
            nome = "right" if sinal < 0 else "left"
            fu = fz if sinal < 0 else 1 - fz
            fv = 1 - fy
        elif eixo == 2:
            nome = "front" if sinal > 0 else "back"
            fu = fx if sinal > 0 else 1 - fx
            fv = 1 - fy
        else:
            nome = "top" if sinal > 0 else "bottom"
            fu = fx
            fv = fz if sinal > 0 else 1 - fz
        if self.espelho:
            fu = 1 - fu
            nome = {"right": "left", "left": "right"}.get(nome, nome)
        fx0, fy0, fw, fh = self.faces()[nome]
        tx = (fx0 + np.floor(fu * fw)).astype(int)
        ty = (fy0 + np.floor(fv * fh)).astype(int)
        return self.tex[ty, tx]


def montar(camada1, camada2, base, pecas=("head", "chest", "legs", "feet")):
    cx = []
    # base: pele-base sem inflate
    cx.append(Caixa(base, (0, 0), (8, 8, 8), (-4, 24, -4), 0))
    cx.append(Caixa(base, (16, 16), (8, 12, 4), (-4, 12, -2), 0))
    cx.append(Caixa(base, (40, 16), (4, 12, 4), (-8, 12, -2), 0))
    cx.append(Caixa(base, (40, 16), (4, 12, 4), (4, 12, -2), 0, True))
    cx.append(Caixa(base, (0, 16), (4, 12, 4), (-4, 0, -2), 0))
    cx.append(Caixa(base, (0, 16), (4, 12, 4), (0, 0, -2), 0, True))
    if camada1 is not None:
        if "head" in pecas:
            cx.append(Caixa(camada1, (0, 0), (8, 8, 8), (-4, 24, -4), 1.0))
        if "chest" in pecas:
            cx.append(Caixa(camada1, (16, 16), (8, 12, 4), (-4, 12, -2), 1.0))
            cx.append(Caixa(camada1, (40, 16), (4, 12, 4), (-8, 12, -2), 1.0))
            cx.append(Caixa(camada1, (40, 16), (4, 12, 4), (4, 12, -2), 1.0, True))
        if "feet" in pecas:
            cx.append(Caixa(camada1, (0, 16), (4, 12, 4), (-4, 0, -2), 1.0))
            cx.append(Caixa(camada1, (0, 16), (4, 12, 4), (0, 0, -2), 1.0, True))
    if camada2 is not None and "legs" in pecas:
        cx.append(Caixa(camada2, (16, 16), (8, 12, 4), (-4, 12, -2), 0.5))
        cx.append(Caixa(camada2, (0, 16), (4, 12, 4), (-4, 0, -2), 0.5))
        cx.append(Caixa(camada2, (0, 16), (4, 12, 4), (0, 0, -2), 0.5, True))
    return cx


# ---------------------------------------------------------------- cenário (céu laranja/azul, grama)
def grama(x, z):
    ix, iz = np.floor(x * 1.0).astype(int), np.floor(z * 1.0).astype(int)
    # 16 px por bloco: textura de grama procedural determinística
    px, pz = np.floor(x).astype(int), np.floor(z).astype(int)
    h = ((px * 73856093) ^ (pz * 19349663) ^ ((px // 16) * 83492791)) & 255
    base = np.array([92, 140, 56], float)
    v = (h / 255.0 - 0.5) * 46
    return np.clip(base[None, :] + v[:, None] * np.array([0.8, 1.0, 0.6])[None, :], 0, 255)


def ceu(t):
    topo = np.array([112, 142, 210], float)
    hor = np.array([236, 164, 96], float)
    return topo[None, :] * (1 - t[:, None]) + hor[None, :] * t[:, None]


def renderizar(caixas, yaw_graus, escala, larg=34, alt=40, pitch_graus=12.0):
    W, H = int(larg * escala), int(alt * escala)
    yaw, pit = np.radians(yaw_graus), np.radians(pitch_graus)
    # câmera ortográfica: eixos da tela no espaço do mundo (personagem olha +Z; câmera em frente, girando em torno do eixo Y)
    ry = np.array([[np.cos(yaw), 0, np.sin(yaw)], [0, 1, 0], [-np.sin(yaw), 0, np.cos(yaw)]])
    rx = np.array([[1, 0, 0], [0, np.cos(pit), np.sin(pit)], [0, -np.sin(pit), np.cos(pit)]])
    rot = ry @ rx
    direita, cima, tras = rot[:, 0], rot[:, 1], rot[:, 2]  # tras = da cena para a câmera
    dirraio = -tras
    xs = (np.arange(W) + 0.5) / escala - larg / 2
    ys = alt * 0.47 - (np.arange(H) + 0.5) / escala
    X, Y = np.meshgrid(xs, ys)
    centro = np.array([0, 16.0, 0])
    orig = centro[None, None, :] + X[..., None] * direita + Y[..., None] * cima - 80 * dirraio
    orig = orig.reshape(-1, 3)
    n = orig.shape[0]
    d = np.tile(dirraio, (n, 1))
    melhor = np.full(n, np.inf)
    cor = np.zeros((n, 3))
    # céu e chão
    tsky = np.clip((np.arange(H) / H), 0, 1)[:, None].repeat(W, 1).reshape(-1)
    cor[:] = ceu(tsky)
    with np.errstate(divide="ignore", invalid="ignore"):
        tchao = (0 - orig[:, 1]) / d[:, 1]
    ok = (tchao > 0) & np.isfinite(tchao)
    pt = orig + d * tchao[:, None]
    cg = grama(pt[:, 0] * 1.0, pt[:, 2] * 1.0)
    # faixa de terra (caminho) à direita para parecer com as capturas
    terra = (pt[:, 0] > 14) & (pt[:, 0] < 40)
    cg[terra] = np.array([150, 112, 66]) + (cg[terra][:, :1] - 92) * 0.5
    cor[ok] = cg[ok] * 0.95
    melhor[ok] = tchao[ok]
    # sombra suave sob o personagem
    r2 = (pt[:, 0] ** 2 + pt[:, 2] ** 2)
    sombra = ok & (r2 < 36)
    cor[sombra] *= (0.72 + 0.28 * (r2[sombra] / 36.0))[:, None]
    for cx in caixas:
        with np.errstate(divide="ignore", invalid="ignore"):
            t1 = (cx.lo[None, :] - orig) / d
            t2 = (cx.hi[None, :] - orig) / d
        tmin = np.minimum(t1, t2)
        tmax = np.maximum(t1, t2)
        tn = tmin.max(1)
        tf = tmax.min(1)
        eixo = tmin.argmax(1)
        acerto = (tn < tf) & (tn > 0) & (tn < melhor)
        for e in range(3):
            sel = acerto & (eixo == e)
            if not sel.any():
                continue
            idx = np.nonzero(sel)[0]
            ponto = orig[idx] + d[idx] * tn[idx][:, None]
            sinal = -np.sign(d[idx, e])  # normal aponta contra o raio
            for s in (-1, 1):
                m = sinal == s
                if not m.any():
                    continue
                ii = idx[m]
                amostra = cx.amostra(ponto[m], e, s)
                visivel = amostra[:, 3] >= 128
                if not visivel.any():
                    continue
                jj = ii[visivel]
                sombra_face = {0: 0.74, 1: 1.0 if s > 0 else 0.5, 2: 0.88 if s > 0 else 0.8}[e]
                # luz vem do mundo: faces voltadas ao lado da câmera ficam mais claras
                cor[jj] = amostra[visivel, :3].astype(float) * sombra_face
                melhor[jj] = tn[jj]
    img = np.clip(cor, 0, 255).astype(np.uint8).reshape(H, W, 3)
    return Image.fromarray(img)


ANGULOS = [("frente", 0), ("3/4", 40), ("lado", 90), ("costas", 180)]


def conjunto(arq1, arq2, escala, pecas=("head", "chest", "legs", "feet"), rotulo=None):
    base = pele_base()
    c1 = Image.open(arq1).convert("RGBA") if arq1 else None
    c2 = Image.open(arq2).convert("RGBA") if arq2 else None
    caixas = montar(c1, c2, base, pecas)
    quadros = [renderizar(caixas, ang, escala) for _, ang in ANGULOS]
    w, h = quadros[0].size
    folha = Image.new("RGB", (w * len(quadros), h), (20, 20, 28))
    for i, q in enumerate(quadros):
        folha.paste(q, (i * w, 0))
    return folha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default=os.path.join(PREVIAS, "armadura3d_depois.png"))
    ap.add_argument("--antes", help="referência git (ex.: HEAD): gera também o 'antes' e o comparativo")
    ap.add_argument("--escala", type=int, default=10)
    a = ap.parse_args()
    os.makedirs(PREVIAS, exist_ok=True)
    depois = conjunto(os.path.join(ARM, "ausente_1.png"), os.path.join(ARM, "ausente_2.png"), a.escala)
    depois.save(a.saida)
    print(a.saida)
    if a.antes:
        arqs = []
        for n in ("ausente_1.png", "ausente_2.png"):
            dados = subprocess.check_output(["git", "show", f"{a.antes}:addon/vulpus_rp/textures/models/armor/{n}"], cwd=RAIZ)
            arqs.append(io.BytesIO(dados))
        antes = conjunto(arqs[0], arqs[1], a.escala)
        antes_out = os.path.join(PREVIAS, "armadura3d_antes.png")
        antes.save(antes_out)
        comp = Image.new("RGB", (antes.width, antes.height * 2 + 6), (255, 255, 255))
        comp.paste(antes, (0, 0))
        comp.paste(depois, (0, antes.height + 6))
        comp.save(os.path.join(PREVIAS, "armadura3d_antes_depois.png"))
        print(antes_out)


if __name__ == "__main__":
    main()
