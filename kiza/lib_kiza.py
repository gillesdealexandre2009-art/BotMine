"""Biblioteca para montar o modelo da Kiza: cubos com textura pintada por código, atlas, exportação .bbmodel e prévias.

Convenções (iguais às do Blockbench / Bedrock):
- 1 unidade = 1 px do modelo; Y para cima; a frente da personagem é o lado -Z (face "north").
- Em cada face (N, S, L, O) a textura é lida da esquerda para a direita e de cima para baixo vista DE FORA.
  north: esquerda = +X; south: esquerda = -X; east (+X): esquerda = +Z; west (-X): esquerda = -Z.
- Face "up": a borda de baixo da imagem é o lado norte (frente) e a esquerda é +X.
"""
from __future__ import annotations

import base64
import io
import json
import random
import uuid as _uuid
import zlib
from dataclasses import dataclass, field
from typing import Callable

from PIL import Image, ImageDraw

DENSIDADE = 2  # texels por unidade do modelo
FACES = ("north", "east", "south", "west", "up", "down")

Cor = tuple[int, int, int]
Pintor = Callable[[int, int, str], Image.Image]


def rgb(hexa: str) -> Cor:
    hexa = hexa.lstrip("#")
    return (int(hexa[0:2], 16), int(hexa[2:4], 16), int(hexa[4:6], 16))


def misturar(a: Cor, b: Cor, t: float) -> Cor:
    return (int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t), int(a[2] + (b[2] - a[2]) * t))


@dataclass
class Cubo:
    nome: str
    grupo: str
    a: tuple[float, float, float]
    b: tuple[float, float, float]
    pintores: dict[str, Pintor] = field(default_factory=dict)
    padrao: Pintor | None = None
    uuid: str = field(default_factory=lambda: str(_uuid.uuid4()))
    uv: dict[str, tuple[int, int, int, int]] = field(default_factory=dict)
    eixo: str = ""  # rotação de um eixo só ('x', 'y' ou 'z'), em graus, em torno do pivô
    ang: float = 0.0
    pivo: tuple[float, float, float] | None = None
    dens: dict[str, int] = field(default_factory=dict)  # texels por unidade de faces específicas
    infla: float = 0.0  # 'inflate' do Blockbench: engorda o cubo nos seis lados sem mexer no UV

    def gira(self, eixo: str, ang: float, pivo: tuple[float, float, float] | None = None) -> "Cubo":
        self.eixo, self.ang, self.pivo = eixo, ang, pivo
        return self

    def densidade(self, face: str, d: int) -> "Cubo":
        self.dens[face] = d
        return self

    @property
    def ea(self) -> tuple[float, float, float]:
        return (self.a[0] - self.infla, self.a[1] - self.infla, self.a[2] - self.infla)

    @property
    def eb(self) -> tuple[float, float, float]:
        return (self.b[0] + self.infla, self.b[1] + self.infla, self.b[2] + self.infla)

    @property
    def centro(self) -> tuple[float, float, float]:
        return ((self.a[0] + self.b[0]) / 2, (self.a[1] + self.b[1]) / 2, (self.a[2] + self.b[2]) / 2)

    def pivo_efetivo(self) -> tuple[float, float, float]:
        return self.pivo if self.pivo is not None else self.centro

    @property
    def tamanho(self) -> tuple[float, float, float]:
        return (self.b[0] - self.a[0], self.b[1] - self.a[1], self.b[2] - self.a[2])

    def dim_face(self, face: str) -> tuple[int, int]:
        dx, dy, dz = self.tamanho
        if face in ("north", "south"):
            u, v = dx, dy
        elif face in ("east", "west"):
            u, v = dz, dy
        else:
            u, v = dx, dz
        d = self.dens.get(face, DENSIDADE)
        return max(1, round(u * d)), max(1, round(v * d))

    def pintor(self, face: str) -> Pintor:
        p = self.pintores.get(face) or self.padrao
        if p is None:
            raise ValueError(f"{self.nome}: sem pintor para {face}")
        return p


class Modelo:
    def __init__(self, nome: str) -> None:
        self.nome = nome
        self.cubos: list[Cubo] = []
        self.grupos: dict[str, tuple[str | None, tuple[float, float, float]]] = {}  # nome -> (pai, pivô)

    def grupo(self, nome: str, pai: str | None, pivo: tuple[float, float, float] = (0, 0, 0)) -> None:
        self.grupos[nome] = (pai, pivo)

    def cubo(self, nome: str, grupo: str, a: tuple[float, float, float], b: tuple[float, float, float], padrao: Pintor | None = None, **faces: Pintor) -> Cubo:
        x0, x1 = sorted((a[0], b[0]))
        y0, y1 = sorted((a[1], b[1]))
        z0, z1 = sorted((a[2], b[2]))
        c = Cubo(nome, grupo, (x0, y0, z0), (x1, y1, z1), dict(faces), padrao)
        self.cubos.append(c)
        return c

    def espelhar(self, c: Cubo, nome: str, grupo: str, **trocas: Pintor) -> Cubo:
        """Cópia espelhada em X (o lado esquerdo da personagem), com pintores opcionais por face."""
        n = Cubo(nome, grupo, (-c.b[0], c.a[1], c.a[2]), (-c.a[0], c.b[1], c.b[2]), dict(c.pintores), c.padrao)
        n.eixo = c.eixo
        n.ang = -c.ang if c.eixo in ("y", "z") else c.ang
        n.pivo = (-c.pivo[0], c.pivo[1], c.pivo[2]) if c.pivo is not None else None
        n.dens = dict(c.dens)
        n.infla = c.infla
        # leste e oeste trocam de lugar: a face de fora continua sendo a de fora
        antigos = dict(c.pintores)
        if "east" in antigos or "west" in antigos:
            n.pintores.pop("east", None)
            n.pintores.pop("west", None)
            if "east" in antigos:
                n.pintores["west"] = antigos["east"]
            if "west" in antigos:
                n.pintores["east"] = antigos["west"]
        n.pintores.update(trocas)
        self.cubos.append(n)
        return n

    # ------------------------------------------------------------------------- atlas
    def montar_atlas(self, largura: int = 256) -> Image.Image:
        itens: list[tuple[Cubo, str, int, int]] = []
        for c in self.cubos:
            for f in FACES:
                w, h = c.dim_face(f)
                itens.append((c, f, w, h))
        itens.sort(key=lambda t: (-t[3], -t[2]))
        while True:
            x = y = linha = 0
            pos: list[tuple[Cubo, str, int, int, int, int]] = []
            ok = True
            for c, f, w, h in itens:
                if x + w + 1 > largura:
                    x = 0
                    y += linha + 1
                    linha = 0
                pos.append((c, f, x, y, w, h))
                x += w + 1
                linha = max(linha, h)
            altura = y + linha + 1
            if altura > largura:
                largura *= 2
                ok = False
            if ok:
                break
        atlas = Image.new("RGBA", (largura, largura), (0, 0, 0, 0))
        for c, f, px, py, w, h in pos:
            im = c.pintor(f)(w, h, f)
            if im.size != (w, h):
                im = im.resize((w, h), Image.NEAREST)
            atlas.paste(im, (px, py))
            c.uv[f] = (px, py, px + w, py + h)
        self.atlas = atlas
        return atlas

    # ------------------------------------------------------------------- exportação
    def bbmodel(self) -> dict:
        atlas = self.atlas
        buf = io.BytesIO()
        atlas.save(buf, "PNG")
        fonte = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        elementos = []
        for c in self.cubos:
            faces = {}
            for f in FACES:
                u0, v0, u1, v1 = c.uv[f]
                faces[f] = {"uv": [u0, v0, u1, v1], "texture": 0}
            elementos.append(
                {
                    "name": c.nome,
                    "box_uv": False,
                    "rescale": False,
                    "locked": False,
                    "render_order": "default",
                    "allow_mirror_modeling": False,
                    "from": list(c.a),
                    "to": list(c.b),
                    "autouv": 0,
                    "color": 0,
                    "inflate": c.infla,
                    "origin": [round(v, 4) for v in c.pivo_efetivo()],
                    "faces": faces,
                    "type": "cube",
                    "uuid": c.uuid,
                }
            )
            if c.eixo and abs(c.ang) > 1e-6:
                elementos[-1]["rotation"] = [c.ang if c.eixo == "x" else 0, c.ang if c.eixo == "y" else 0, c.ang if c.eixo == "z" else 0]

        def construir(nome: str) -> dict:
            pai, pivo = self.grupos[nome]
            filhos: list = [construir(g) for g, (p, _) in self.grupos.items() if p == nome]
            filhos += [c.uuid for c in self.cubos if c.grupo == nome]
            return {
                "name": nome,
                "origin": list(pivo),
                "color": 0,
                "uuid": str(_uuid.uuid4()),
                "export": True,
                "mirror_uv": False,
                "isOpen": True,
                "locked": False,
                "visibility": True,
                "autouv": 0,
                "children": filhos,
            }

        raizes = [n for n, (p, _) in self.grupos.items() if p is None]
        return {
            "meta": {"format_version": "4.10", "model_format": "free", "box_uv": False},
            "name": self.nome,
            "model_identifier": "",
            "visible_box": [1, 1, 0],
            "variable_placeholders": "",
            "variable_placeholder_buttons": [],
            "timeline_setups": [],
            "unhandled_root_fields": {},
            "resolution": {"width": atlas.width, "height": atlas.height},
            "elements": elementos,
            "outliner": [construir(r) for r in raizes],
            "textures": [
                {
                    "path": "",
                    "name": "kiza.png",
                    "folder": "",
                    "namespace": "",
                    "id": "0",
                    "particle": False,
                    "visible": True,
                    "mode": "bitmap",
                    "saved": False,
                    "uuid": str(_uuid.uuid4()),
                    "relative_path": "",
                    "source": fonte,
                }
            ],
            "animations": [],
            "animation_controllers": [],
        }

    # ---------------------------------------------------------------------- prévias
    def _recorte(self, c: Cubo, face: str) -> Image.Image:
        return self.atlas.crop(c.uv[face])

    def renderizar(self, vista: str, escala: int = 14, fundo: tuple[int, int, int, int] = (188, 194, 214, 255)) -> Image.Image:
        """Vista ortográfica: 'frente' (câmera em -Z), 'costas' (+Z), 'lado' (câmera em -X, personagem olha para a esquerda)
        ou 'lado_dir' (câmera em +X, olha para a direita)."""
        xs = [c.a[0] for c in self.cubos] + [c.b[0] for c in self.cubos]
        ys = [c.a[1] for c in self.cubos] + [c.b[1] for c in self.cubos]
        zs = [c.a[2] for c in self.cubos] + [c.b[2] for c in self.cubos]
        margem = 2
        faces: list[tuple[float, Cubo, str]] = []
        if vista == "frente":
            lado = "north"
            ancho = (min(xs), max(xs))
            sx = lambda x, z: (ancho[1] - x)
            prof = lambda c: c.a[2]
            ordem_desc = True
        elif vista == "costas":
            lado = "south"
            ancho = (min(xs), max(xs))
            sx = lambda x, z: (x - ancho[0])
            prof = lambda c: c.b[2]
            ordem_desc = False
        elif vista == "lado":
            lado = "west"
            ancho = (min(zs), max(zs))
            sx = lambda x, z: (z - ancho[0])
            prof = lambda c: c.a[0]
            ordem_desc = True
        elif vista == "lado_dir":
            lado = "east"
            ancho = (min(zs), max(zs))
            sx = lambda x, z: (ancho[1] - z)
            prof = lambda c: c.b[0]
            ordem_desc = False
        else:
            raise ValueError(vista)
        larg = int((ancho[1] - ancho[0] + 2 * margem) * escala)
        alt = int((max(ys) - min(ys) + 2 * margem) * escala)
        img = Image.new("RGBA", (larg, alt), fundo)
        # chão
        d = ImageDraw.Draw(img)
        chao = int((max(ys) - 0 + margem) * escala)
        d.line((0, chao, larg, chao), fill=(190, 194, 210, 255), width=2)
        itens = []
        for c in self.cubos:
            itens.append((prof(c), c))
        itens.sort(key=lambda t: t[0], reverse=ordem_desc)
        for _, c in itens:
            tex = self._recorte(c, lado)
            if vista in ("frente", "costas"):
                x0, x1 = c.a[0], c.b[0]
                if vista == "frente":
                    e0, e1 = sx(x1, 0), sx(x0, 0)
                else:
                    e0, e1 = sx(x0, 0), sx(x1, 0)
            else:
                z0, z1 = c.a[2], c.b[2]
                if vista == "lado":
                    e0, e1 = sx(0, z0), sx(0, z1)
                else:
                    e0, e1 = sx(0, z1), sx(0, z0)
            px0 = int(round((e0 + margem) * escala))
            px1 = int(round((e1 + margem) * escala))
            py0 = int(round((max(ys) - c.b[1] + margem) * escala))
            py1 = int(round((max(ys) - c.a[1] + margem) * escala))
            w, h = max(1, px1 - px0), max(1, py1 - py0)
            tex = tex.resize((w, h), Image.NEAREST)
            img.alpha_composite(tex, (px0, py0)) if tex.mode == "RGBA" else img.paste(tex, (px0, py0))
        return img

    def folha(self, escala: int = 14) -> Image.Image:
        vistas = [self.renderizar(v, escala) for v in ("frente", "lado", "costas")]
        larg = sum(v.width for v in vistas) + 20 * (len(vistas) + 1)
        alt = max(v.height for v in vistas) + 40
        folha = Image.new("RGBA", (larg, alt), (188, 194, 214, 255))
        x = 20
        for v in vistas:
            folha.alpha_composite(v, (x, 20))
            x += v.width + 20
        return folha


# ------------------------------------------------------------------------------ pintores
def liso(cor: Cor, a: int = 255) -> Pintor:
    def p(w: int, h: int, f: str) -> Image.Image:
        return Image.new("RGBA", (w, h), cor + (a,))

    return p


def vazio() -> Pintor:
    def p(w: int, h: int, f: str) -> Image.Image:
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))

    return p


def fibras(base: Cor, sombra: Cor, fundo: Cor, brilho: Cor, semente: int = 1, grad: float = 0.55, forca: float = 1.0, largura_max: int = 2) -> Pintor:
    """Cabelo, pelo e mangas: mechas verticais em tons alternados, mais sombra para baixo."""

    def p(w: int, h: int, f: str) -> Image.Image:
        im = Image.new("RGBA", (w, h), base + (255,))
        px = im.load()
        rnd = random.Random(semente * 7919 + zlib.crc32(f.encode()) % 1000 + w * 31 + h)
        x = 0
        while x < w:
            larg = rnd.randint(1, largura_max)
            t = rnd.random()
            tom = base
            if t < 0.42:
                tom = sombra
            elif t > 0.9:
                tom = brilho
            comp = rnd.randint(min(h, max(2, h // 2)), h)
            for dx in range(larg):
                if x + dx >= w:
                    break
                for y in range(h):
                    cor = tom
                    # a mecha termina antes do fim: o resto fica com a cor base mais escura
                    if y >= comp:
                        cor = misturar(base, sombra, 0.5)
                    if f in ("north", "south", "east", "west"):
                        k = y / max(1, h - 1)
                        if k > grad:
                            cor = misturar(cor, sombra if k < 0.92 else fundo, min(1.0, (k - grad) / (1 - grad)) * 0.85 * forca)
                    px[x + dx, y] = cor + (255,)
            x += larg
        if f == "down":
            im = Image.new("RGBA", (w, h), sombra + (255,))
        return im

    return p


def moldura(base: Cor, borda: Cor, listras: Cor | None = None) -> Pintor:
    def p(w: int, h: int, f: str) -> Image.Image:
        im = Image.new("RGBA", (w, h), base + (255,))
        d = ImageDraw.Draw(im)
        if w > 2 and h > 2:
            d.rectangle((0, 0, w - 1, h - 1), outline=borda + (255,))
        if listras and h > 4:
            for y in range(2, h - 1, 3):
                d.line((1, y, w - 2, y), fill=listras + (255,))
        return im

    return p


def desenho(mapa: list[str], paleta: dict[str, Cor | None], fundo: Cor | None = None, fundo_pintor: Pintor | None = None) -> Pintor:
    """Pixel art por texto: cada caractere é uma cor da paleta ('.' = fundo). O mapa é escalado para a face."""

    def p(w: int, h: int, f: str) -> Image.Image:
        if fundo_pintor is not None:
            base = fundo_pintor(w, h, f)
        else:
            base = Image.new("RGBA", (w, h), (fundo + (255,)) if fundo else (0, 0, 0, 0))
        mh, mw = len(mapa), len(mapa[0])
        im = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
        px = im.load()
        for y, linha in enumerate(mapa):
            for x, ch in enumerate(linha):
                c = paleta.get(ch)
                if c is not None:
                    px[x, y] = c + (255,)
        if (mw, mh) != (w, h):
            im = im.resize((w, h), Image.NEAREST)
        base.alpha_composite(im)
        return base

    return p
