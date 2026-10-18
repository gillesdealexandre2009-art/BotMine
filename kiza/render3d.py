"""Renderizador 3D simples (perspectiva, z-buffer, textura por face) para conferir o modelo como o Blockbench mostra."""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

SOMBRA = {"up": 1.0, "down": 0.55, "north": 0.82, "south": 0.82, "east": 0.68, "west": 0.68}


def _sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def _cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def _dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def _norm(a):
    n = math.sqrt(_dot(a, a)) or 1
    return (a[0] / n, a[1] / n, a[2] / n)


def cantos(c, face):
    """Quatro cantos da face (esq-cima, dir-cima, dir-baixo, esq-baixo) vista de fora, com a convenção do Blockbench."""
    x0, y0, z0 = c.ea
    x1, y1, z1 = c.eb
    if face == "north":  # visto de -Z: esquerda = +X
        return [(x1, y1, z0), (x0, y1, z0), (x0, y0, z0), (x1, y0, z0)]
    if face == "south":  # visto de +Z: esquerda = -X
        return [(x0, y1, z1), (x1, y1, z1), (x1, y0, z1), (x0, y0, z1)]
    if face == "east":  # visto de +X: esquerda = +Z
        return [(x1, y1, z1), (x1, y1, z0), (x1, y0, z0), (x1, y0, z1)]
    if face == "west":  # visto de -X: esquerda = -Z
        return [(x0, y1, z0), (x0, y1, z1), (x0, y0, z1), (x0, y0, z0)]
    if face == "up":  # de cima, norte embaixo da imagem, esquerda = +X
        return [(x1, y1, z1), (x0, y1, z1), (x0, y1, z0), (x1, y1, z0)]
    # down: norte em cima da imagem, esquerda = +X
    return [(x1, y0, z0), (x0, y0, z0), (x0, y0, z1), (x1, y0, z1)]


def normal(face):
    return {"north": (0, 0, -1), "south": (0, 0, 1), "east": (1, 0, 0), "west": (-1, 0, 0), "up": (0, 1, 0), "down": (0, -1, 0)}[face]


def gira_ponto(p, eixo, ang, pivo):
    if not eixo or abs(ang) < 1e-9:
        return p
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    x, y, z = p[0] - pivo[0], p[1] - pivo[1], p[2] - pivo[2]
    if eixo == "x":
        y, z = y * ca - z * sa, y * sa + z * ca
    elif eixo == "y":
        x, z = x * ca + z * sa, -x * sa + z * ca
    else:
        x, y = x * ca - y * sa, x * sa + y * ca
    return (x + pivo[0], y + pivo[1], z + pivo[2])


def gira_vetor(v, eixo, ang):
    return gira_ponto(v, eixo, ang, (0, 0, 0))


def renderizar(modelo, cam, alvo, largura=420, altura=520, fov=40, fundo=(24, 26, 30, 255)):
    atlas = modelo.atlas.convert("RGBA")
    aw, ah = atlas.size
    apx = atlas.load()
    img = Image.new("RGBA", (largura, altura), fundo)
    px = img.load()
    zb = [[1e18] * largura for _ in range(altura)]
    f = _norm(_sub(alvo, cam))
    r = _norm(_cross(f, (0, 1, 0)))
    u = _cross(r, f)
    foco = (altura / 2) / math.tan(math.radians(fov) / 2)

    def proj(p):
        d = _sub(p, cam)
        z = _dot(d, f)
        x = _dot(d, r)
        y = _dot(d, u)
        return (largura / 2 + foco * x / z, altura / 2 - foco * y / z, z)

    for c in modelo.cubos:
        for face in ("north", "south", "east", "west", "up", "down"):
            n = normal(face)
            ea, eb = c.ea, c.eb
            cen = ((ea[0] + eb[0]) / 2 + n[0] * (eb[0] - ea[0]) / 2, (ea[1] + eb[1]) / 2 + n[1] * (eb[1] - ea[1]) / 2, (ea[2] + eb[2]) / 2 + n[2] * (eb[2] - ea[2]) / 2)
            piv = c.pivo_efetivo()
            cen = gira_ponto(cen, c.eixo, c.ang, piv)
            n = gira_vetor(n, c.eixo, c.ang)
            if _dot(n, _sub(cam, cen)) <= 0:
                continue
            cs = [gira_ponto(q, c.eixo, c.ang, piv) for q in cantos(c, face)]
            pr = [proj(p) for p in cs]
            if any(p[2] <= 0.1 for p in pr):
                continue
            u0, v0, u1, v1 = c.uv[face]
            uvs = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
            sh = SOMBRA[face]
            for tri in ((0, 1, 2), (0, 2, 3)):
                (xa, ya, za), (xb, yb, zb_), (xc, yc, zc) = pr[tri[0]], pr[tri[1]], pr[tri[2]]
                den = (yb - yc) * (xa - xc) + (xc - xb) * (ya - yc)
                if abs(den) < 1e-9:
                    continue
                minx = max(0, int(math.floor(min(xa, xb, xc))))
                maxx = min(largura - 1, int(math.ceil(max(xa, xb, xc))))
                miny = max(0, int(math.floor(min(ya, yb, yc))))
                maxy = min(altura - 1, int(math.ceil(max(ya, yb, yc))))
                for y in range(miny, maxy + 1):
                    for x in range(minx, maxx + 1):
                        w0 = ((yb - yc) * (x + 0.5 - xc) + (xc - xb) * (y + 0.5 - yc)) / den
                        w1 = ((yc - ya) * (x + 0.5 - xc) + (xa - xc) * (y + 0.5 - yc)) / den
                        w2 = 1 - w0 - w1
                        if w0 < -1e-6 or w1 < -1e-6 or w2 < -1e-6:
                            continue
                        z = 1 / (w0 / za + w1 / zb_ + w2 / zc)
                        if z >= zb[y][x] - 1e-4:
                            continue
                        # textura com correção de perspectiva
                        iu = (w0 * uvs[tri[0]][0] / za + w1 * uvs[tri[1]][0] / zb_ + w2 * uvs[tri[2]][0] / zc) * z
                        iv = (w0 * uvs[tri[0]][1] / za + w1 * uvs[tri[1]][1] / zb_ + w2 * uvs[tri[2]][1] / zc) * z
                        tx = min(aw - 1, max(0, int(iu)))
                        ty = min(ah - 1, max(0, int(iv)))
                        col = apx[tx, ty]
                        if col[3] < 128:
                            continue
                        zb[y][x] = z
                        px[x, y] = (int(col[0] * sh), int(col[1] * sh), int(col[2] * sh), 255)
    return img


def camera(az_graus, el_graus, dist, alvo=(0, 17, 0)):
    """Câmera orbitando o alvo: az 0 = olhando para a frente da personagem (câmera em -Z)."""
    az = math.radians(az_graus)
    el = math.radians(el_graus)
    x = alvo[0] + dist * math.sin(az) * math.cos(el)
    z = alvo[2] - dist * math.cos(az) * math.cos(el)
    y = alvo[1] + dist * math.sin(el)
    return (x, y, z)
