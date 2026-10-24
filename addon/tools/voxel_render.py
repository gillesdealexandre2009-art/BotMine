#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Renderizador 3D de blocos (Minecraft Bedrock) por ray-marching em numpy.

Leia addon/docs/previas/LEIA_voxel_render.md. Resumo:
  python voxel_render.py dump.json --cam 40,12,60 --alvo 80,4,32 --fov 70 --size 1280x720 --nevoa 0xE8D9B0:120 --saida img.png
  python voxel_render.py dump.json --iso --alvo 120,5,30 --caixa 100,-2,5,140,30,55 --saida iso.png
  python voxel_render.py dump.json --orbita 8 --alvo 120,5,30 --cam 140,12,50 --saida orb.png
  python voxel_render.py dump.json --painel paineis_ecos.json --area limiar --saida folha.png

Texturas: pasta do bedrock-samples da Mojang (resource_pack) baixada FORA do repositorio
(padrao C:\\Users\\gille\\vt\\vanilla_blocos\\repo\\resource_pack; mude com --texturas ou VOXEL_TEXTURAS).
Os arquivos dessa pasta sao tratados como dados: so se abrem PNG/TGA/JSON.
"""
import sys, os, json, re, math, time, argparse, hashlib

try:
    import numpy as np
except ImportError:  # numpy fica em uma pasta propria (pip install --target) porque o python embutido nao o traz
    for _p in (os.environ.get("VOXEL_PYNUM"), r"C:\Users\gille\vt\pynum"):
        if _p and os.path.isdir(_p):
            sys.path.insert(0, _p)
    import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
TEX_PADRAO = os.environ.get("VOXEL_TEXTURAS", r"C:\Users\gille\vt\vanilla_blocos\repo\resource_pack")
RP_VULPUS = os.path.join(AQUI, "..", "vulpus_rp")

# ---------------------------------------------------------------------------------------------------------------
# utilidades
# ---------------------------------------------------------------------------------------------------------------

def cor_hex(s, padrao=None):
    if s is None:
        return padrao
    if isinstance(s, (list, tuple)):
        return tuple(float(c) for c in s)
    s = str(s).strip().lower().replace("#", "0x")
    v = int(s, 16) if s.startswith("0x") else int(s, 16) if re.fullmatch(r"[0-9a-f]{6}", s) else int(s)
    return (((v >> 16) & 255) / 255.0, ((v >> 8) & 255) / 255.0, (v & 255) / 255.0)


def json_solto(caminho):
    """JSON da Mojang: tem comentarios // e virgulas sobrando."""
    with open(caminho, encoding="utf-8-sig") as f:
        txt = f.read()
    txt = re.sub(r"^\s*//.*$", "", txt, flags=re.M)
    txt = re.sub(r",(\s*[}\]])", r"\1", txt)
    return json.loads(txt)


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / (np.linalg.norm(v) + 1e-12)


# ---------------------------------------------------------------------------------------------------------------
# texturas
# ---------------------------------------------------------------------------------------------------------------

class Atlas:
    """Guarda cada textura como 16x16 RGBA. Indice 0 = textura 'faltando' (cinza)."""

    def __init__(self, cfg):
        self.cfg = cfg
        self.tex = []
        self.idx = {}
        self.terrain = {}
        self.blocks = {}
        self.faltando = set()
        self.roots = []
        raiz = cfg["texturas"]
        if raiz and os.path.isdir(raiz):
            self.roots.append(raiz)
            try:
                self.terrain.update(json_solto(os.path.join(raiz, "textures", "terrain_texture.json"))["texture_data"])
                b = json_solto(os.path.join(raiz, "blocks.json"))
                self.blocks.update({k: v for k, v in b.items() if isinstance(v, dict)})
            except Exception as e:  # sem JSON os nomes caem no fallback por arquivo
                print("aviso: sem terrain_texture/blocks.json:", e, file=sys.stderr)
        else:
            print("aviso: pasta de texturas nao encontrada (%s): usando texturas procedurais" % raiz, file=sys.stderr)
        rp = os.path.normpath(RP_VULPUS)
        if os.path.isdir(rp):
            self.roots.append(rp)
            try:
                self.terrain.update(json_solto(os.path.join(rp, "textures", "terrain_texture.json"))["texture_data"])
            except Exception:
                pass
        miss = np.full((16, 16, 4), 255, np.uint8)
        miss[..., :3] = 130
        self.tex.append(miss)
        self.idx[("missing",)] = 0

    # -- carga
    def _arquivo(self, caminho):
        for r in self.roots:
            for ext in (".png", ".tga"):
                p = os.path.join(r, caminho + ext)
                if os.path.isfile(p):
                    return p
        return None

    def _imagem(self, caminho):
        p = self._arquivo(caminho)
        if not p:
            return None
        try:
            im = Image.open(p).convert("RGBA")
        except Exception:
            return None
        w, h = im.size
        if h > w:
            im = im.crop((0, 0, w, w))  # animada (tira de quadros): primeiro quadro
        if im.size != (16, 16):
            im = im.resize((16, 16), Image.BOX)
        return np.array(im, np.uint8)

    def _caminho_chave(self, chave, variante=0):
        v = self.terrain.get(chave)
        if v is None:
            return None
        t = v.get("textures")
        if isinstance(t, list):
            t = t[min(variante, len(t) - 1)] if t else None
        if isinstance(t, dict):
            t = t.get("path")
        return t

    def _add(self, key, arr):
        self.tex.append(arr)
        self.idx[key] = len(self.tex) - 1
        return self.idx[key]

    def solido(self, rgb, a=1.0):
        key = ("solido", tuple(round(c, 3) for c in rgb), a)
        if key in self.idx:
            return self.idx[key]
        arr = np.zeros((16, 16, 4), np.uint8)
        arr[..., :3] = np.array(rgb) * 255
        arr[..., 3] = int(a * 255)
        return self._add(key, arr)

    def _tinge(self, arr, tint):
        arr = arr.copy()
        arr[..., :3] = np.clip(arr[..., :3].astype(np.float32) * np.array(tint, np.float32), 0, 255).astype(np.uint8)
        return arr

    def procedural(self, nome):
        key = ("proc", nome)
        if key in self.idx:
            return self.idx[key]
        h = hashlib.md5(nome.encode()).digest()
        base = np.array([90 + h[0] % 90, 90 + h[1] % 90, 90 + h[2] % 90], np.float32)
        rng = np.random.RandomState(h[3])
        ruido = rng.randint(-10, 11, (16, 16, 1)).astype(np.float32)
        arr = np.zeros((16, 16, 4), np.uint8)
        arr[..., :3] = np.clip(base + ruido, 0, 255)
        arr[..., 3] = 255
        return self._add(key, arr)

    def get(self, chave, tint=None, variante=0):
        """chave = nome em terrain_texture.json (ou caminho de arquivo)."""
        if chave is None:
            return 0
        key = ("k", chave, tint if tint is None else tuple(round(c, 3) for c in tint), variante)
        if key in self.idx:
            return self.idx[key]
        if chave == "grass_side" and tint is not None:
            return self._add(key, self._grama_lado(tint))
        caminho = self._caminho_chave(chave, variante) or ("textures/blocks/" + chave)
        arr = self._imagem(caminho)
        if arr is None:
            self.faltando.add(chave)
            self.idx[key] = 0
            return 0
        if tint is not None:
            arr = self._tinge(arr, tint)
        return self._add(key, arr)

    def _grama_lado(self, tint):
        dirt = self._imagem("textures/blocks/dirt")
        franja = self._imagem("textures/blocks/grass_side")
        if dirt is None:
            return self._imagem("textures/blocks/grass_side_carried") or np.full((16, 16, 4), 128, np.uint8)
        if franja is None:
            return dirt
        f = self._tinge(franja, tint)
        a = franja[..., 3:4].astype(np.float32) / 255.0
        out = dirt.copy()
        out[..., :3] = (dirt[..., :3] * (1 - a) + f[..., :3] * a).astype(np.uint8)
        return out

    def bbox(self, i, limiar=40):
        a = self.tex[i][..., 3]
        ys, xs = np.nonzero(a > limiar)
        if len(xs) == 0:
            return (0, 0, 16, 16)
        return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

    def matriz(self):
        atl = np.stack(self.tex).astype(np.float32) / 255.0
        a = atl[..., 3:4]
        soma = a.sum(axis=(1, 2)) + 1e-6
        media = (atl[..., :3] * a).sum(axis=(1, 2)) / soma
        return atl, media.astype(np.float32)


# ---------------------------------------------------------------------------------------------------------------
# modelos de bloco
# ---------------------------------------------------------------------------------------------------------------

K_AIR, K_CUBO, K_ALFA, K_COMPLEXO, K_AGUA = 0, 1, 2, 3, 4
KMAX, QMAX = 10, 8
OPP = {0: 1, 1: 0, 2: 3, 3: 2}
DIRV = {0: (1, 0), 1: (-1, 0), 2: (0, 1), 3: (0, -1)}  # leste, oeste, sul, norte (dx, dz)

EMISSIVOS = [
    (r"^soul_(lantern|torch|fire|campfire)$", 10, (0.35, 0.85, 1.0)),
    (r"^sea_lantern$", 15, (0.75, 1.0, 0.95)),
    (r"lantern$", 15, (1.0, 0.72, 0.33)),
    (r"^redstone_torch$", 7, (1.0, 0.25, 0.15)),
    (r"torch$", 14, (1.0, 0.7, 0.33)),
    (r"^glowstone$", 15, (1.0, 0.85, 0.5)),
    (r"^shroomlight$", 15, (1.0, 0.65, 0.35)),
    (r"^ochre_froglight$", 15, (1.0, 0.8, 0.4)),
    (r"^verdant_froglight$", 15, (0.5, 1.0, 0.6)),
    (r"^pearlescent_froglight$", 15, (0.95, 0.65, 1.0)),
    (r"^end_rod$", 14, (0.92, 0.88, 1.0)),
    (r"campfire$", 15, (1.0, 0.65, 0.3)),
    (r"^fire$", 15, (1.0, 0.6, 0.25)),
    (r"^(lava|flowing_lava)$", 15, (1.0, 0.55, 0.2)),
    (r"^magma$", 3, (1.0, 0.45, 0.2)),
    (r"jack_o_lantern$", 15, (1.0, 0.7, 0.3)),
    (r"^crying_obsidian$", 10, (0.62, 0.3, 1.0)),
    (r"^amethyst_cluster$", 5, (0.7, 0.45, 1.0)),
    (r"^sculk_catalyst$", 6, (0.3, 0.9, 0.9)),
    (r"^beacon$", 15, (0.85, 0.95, 1.0)),
    (r"^lit_redstone_lamp$", 15, (1.0, 0.7, 0.4)),
    (r"^copper_bulb$", 15, (1.0, 0.8, 0.5)),
]

PLANTAS = re.compile(r"^(poppy|dandelion|allium|azure_bluet|cornflower|wither_rose|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|lily_of_the_valley|blue_orchid|torchflower|short_grass|tall_grass|fern|large_fern|deadbush|dead_bush|short_dry_grass|tall_dry_grass|brown_mushroom|red_mushroom|sweet_berry_bush|firefly_bush|bush|sapling|.*_sapling|.*propagule|double_plant|yellow_flower|red_flower|reeds|sugar_cane|cobweb|web|hanging_roots|pale_hanging_moss|seagrass|nether_sprouts|crimson_roots|warped_roots|spore_blossom|peony|rose_bush|lilac|sunflower|pink_petals|wildflowers|leaf_litter|cactus_flower|eyeblossom|open_eyeblossom|closed_eyeblossom)$")
ALFA_CUBO = re.compile(r"(^glass$|stained_glass$|tinted_glass$|^ice$|^slime$|^honey_block$|^frosted_ice$)")
FOLHA_TINTA = re.compile(r"^(oak|jungle|acacia|dark_oak|mangrove)_leaves$")


def estados_de(s):
    if not s:
        return {}
    if isinstance(s, dict):
        return s
    return json.loads(s)


def hb(d, y0, y1):
    return {0: (.5, y0, 0, 1, y1, 1), 1: (0, y0, 0, .5, y1, 1), 2: (0, y0, .5, 1, y1, 1), 3: (0, y0, 0, 1, y1, .5)}[d]


def inter(a, b):
    return (max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2]), min(a[3], b[3]), min(a[4], b[4]), min(a[5], b[5]))


def caixas_escada(d, cima, forma):
    laje = (0, .5, 0, 1, 1, 1) if cima else (0, 0, 0, 1, .5, 1)
    y0, y1 = (0, .5) if cima else (.5, 1)
    bx = [laje]
    if forma[0] == "s":
        bx.append(hb(d, y0, y1))
    elif forma[0] == "o":
        bx.append(inter(hb(d, y0, y1), hb(forma[1], y0, y1)))
    else:
        bx.append(hb(d, y0, y1))
        bx.append(inter(hb(OPP[d], y0, y1), hb(forma[1], y0, y1)))
    return bx


class Modelos:
    def __init__(self, atlas, cfg):
        self.at = atlas
        self.cfg = cfg
        self.lista = []
        self.chave = {}
        self.nao_mapeados = set()
        self.novo({"kind": K_AIR, "nome": "air"})

    def novo(self, m):
        m.setdefault("ftex", [0] * 6)
        m.setdefault("boxes", [])
        m.setdefault("quads", [])
        m.setdefault("emit", 0.0)
        m.setdefault("emit_cor", (1.0, 1.0, 1.0))
        m.setdefault("luz_bloqueia", False)
        m.setdefault("ao", False)
        m.setdefault("fam", None)
        m.setdefault("escada", None)
        m.setdefault("folha", False)
        self.lista.append(m)
        return len(self.lista) - 1

    # -- texturas por nome de bloco
    def _spec(self, nome):
        b = self.at.blocks
        cands = [nome]
        base = re.sub(r"_(stairs|slab|wall|fence_gate|fence|pressure_plate|button|trapdoor|door)$", "", nome)
        if base != nome:
            alt = {"stone_brick": ["stone_bricks", "stonebrick"], "brick": ["brick_block", "bricks"], "smooth_stone": ["smooth_stone"], "wooden": ["planks"], "mossy_stone_brick": ["mossy_stone_bricks"], "nether_brick": ["nether_brick"], "end_stone_brick": ["end_bricks", "end_stone_bricks"], "polished_blackstone_brick": ["polished_blackstone_bricks"], "deepslate_brick": ["deepslate_bricks"], "deepslate_tile": ["deepslate_tiles"], "tuff_brick": ["tuff_bricks"], "mud_brick": ["mud_bricks"], "cut_sandstone": ["cut_sandstone"], "normal_stone": ["stone"], "stone": ["stone"], "quartz": ["quartz_block"], "red_nether_brick": ["red_nether_bricks", "red_nether_brick"], "prismarine_brick": ["prismarine_bricks"], "cut_copper": ["cut_copper"], "bamboo_mosaic": ["bamboo_mosaic"], "resin_brick": ["resin_bricks"]}
            cands += alt.get(base, []) + [base, base + "s", base + "_planks", base + "_block"]
        cands += [nome + "_block", nome.replace("_block", "")]
        ALIAS = {"cobweb": "web", "flowering_azalea_leaves": "azalea_leaves_flowered", "flowering_azalea": "flowering_azalea"}
        cands.insert(0, ALIAS.get(nome, nome))
        for c in cands:
            if c in b:
                return b[c], c
        for c in cands:
            if c in self.at.terrain:
                return {"textures": c}, c
        return None, None

    def tint_de(self, nome, chave, face):
        c = self.cfg
        if nome == "grass_block" and chave in ("grass_top", "grass_side"):
            return c["grama"]
        if chave in ("tallgrass", "fern", "tall_grass_bottom", "tall_grass_top", "large_fern_bottom", "large_fern_top", "reeds", "double_plant_grass_bottom", "double_plant_grass_top"):
            return c["grama"]
        if FOLHA_TINTA.match(nome):
            return c["folhas"]
        if nome.startswith("spruce_leaves"):
            return (0.38, 0.6, 0.38)
        if nome.startswith("birch_leaves"):
            return (0.5, 0.65, 0.33)
        if nome in ("vine", "waterlily", "lily_pad"):
            return c["folhas"]
        return None

    def faces6(self, nome, est=None, variante=None):
        """6 indices de textura (-x,+x,-y,+y,-z,+z). None se nao houver mapeamento."""
        spec, achado = self._spec(nome)
        if spec is None:
            return None
        t = spec.get("textures")
        if isinstance(t, str):
            t = {"_all": t}
        if not isinstance(t, dict) or not t:
            return None
        lado = t.get("side", t.get("_all", next(iter(t.values()))))
        ordem = [t.get("west", lado), t.get("east", lado), t.get("down", t.get("_all", lado)), t.get("up", t.get("_all", lado)), t.get("north", lado), t.get("south", lado)]
        out = []
        for i, k in enumerate(ordem):
            var = variante
            if var is None:
                var = 0
                if nome.endswith("_leaves") or nome.startswith("azalea_leaves"):
                    var = 0 if self.cfg["hojas_vazadas"] else 9  # 9 = ultima (a versao opaca)
            out.append(self.at.get(k, self.tint_de(nome, k, i), var))
        return out

    def uma_textura(self, nome, preferir=("side", "up", "_all")):
        spec, _ = self._spec(nome)
        if spec is None:
            return None
        t = spec.get("textures")
        if isinstance(t, str):
            return t
        if isinstance(t, dict):
            for k in preferir:
                if k in t:
                    return t[k]
            return next(iter(t.values()))
        return None

    # -- construtores
    def indice(self, nome, est=None, forma=None, conn=None):
        est = est or {}
        k = (nome, json.dumps(est, sort_keys=True), forma, conn)
        i = self.chave.get(k)
        if i is None:
            i = self._construir(nome, est, forma, conn)
            self.chave[k] = i
        return i

    def _emissivo(self, nome, est):
        for rx, nivel, cor in EMISSIVOS:
            if re.search(rx, nome):
                if "lantern" in nome and "sea" not in nome and "jack" not in nome and False:
                    pass
                return nivel / 15.0, cor
        if re.search(r"candle$", nome) and est.get("lit"):
            return min(15, 3 * (int(est.get("candles", 0)) + 1)) / 15.0, (1.0, 0.72, 0.35)
        return 0.0, (1, 1, 1)

    def _construir(self, nome, est, forma, conn):
        short = nome.split(":", 1)[1] if ":" in nome else nome
        ns = nome.split(":", 1)[0] if ":" in nome else "minecraft"
        em, em_cor = self._emissivo(short, est)
        m = self._modelo(short, ns, est, forma, conn)
        if m is None:
            return 0
        m["nome"] = short
        if em > 0:
            m["emit"], m["emit_cor"] = em, em_cor
        return self.novo(m)

    def _tex_or_proc(self, short, est=None):
        f = self.faces6(short, est)
        if f is None:
            self.nao_mapeados.add(short)
            return [self.at.procedural(short)] * 6
        return f

    def _sprite(self, tex, largura=None, altura=None, cx=0.5, cz=0.5, pendurado=False, y_base=0.0, forca_bbox=None):
        """Dois planos em cruz (+) com a imagem recortada pela caixa dos pixels visiveis."""
        x0, y0, x1, y1 = forca_bbox or self.at.bbox(tex)
        w = (largura if largura is not None else (x1 - x0) / 16.0)
        h = (altura if altura is not None else (y1 - y0) / 16.0)
        tuv = (x0 / 16.0, x1 / 16.0, (16 - y1) / 16.0, (16 - y0) / 16.0)
        yb = (1.0 - h) if pendurado else y_base
        return [(0, cx, cz - w / 2, cz + w / 2, yb, yb + h, tex, tuv), (2, cz, cx - w / 2, cx + w / 2, yb, yb + h, tex, tuv)]

    def _modelo(self, n, ns, est, forma, conn):
        c = self.cfg
        if n in ("air", "cave_air", "void_air", "barrier", "light_block", "structure_void", "border_block", "allow", "deny") or n.startswith("light_block"):
            return None
        if ns != "minecraft":
            t = self.at.get(n.replace(ns + ":", ""), None)
            if t == 0:
                t = self.at.procedural(nome_full(ns, n))
            return {"kind": K_CUBO, "ftex": [t] * 6, "luz_bloqueia": True, "ao": True}
        # ---- liquidos
        if n in ("water", "flowing_water"):
            return {"kind": K_AGUA}
        if n in ("lava", "flowing_lava"):
            t = self.at.get("lava_still") or self.at.solido((1, .5, .1))
            return {"kind": K_CUBO, "ftex": [t] * 6, "luz_bloqueia": True}
        # ---- degraus
        if n.endswith("_stairs"):
            f = self._tex_or_proc(n.replace("_stairs", ""), est) if self._spec(n)[0] is None else self._tex_or_proc(n, est)
            d = int(est.get("weirdo_direction", 0))
            cima = bool(est.get("upside_down_bit", False))
            forma = forma or ("s",)
            return {"kind": K_COMPLEXO, "boxes": [(b, f) for b in caixas_escada(d, cima, forma)], "luz_bloqueia": True, "escada": (d, cima)}
        if n.endswith("_slab") and "double" not in n:
            f = self._tex_or_proc(n, est)
            alto = est.get("minecraft:vertical_half", "bottom") == "top" or est.get("top_slot_bit", False)
            b = (0, .5, 0, 1, 1, 1) if alto else (0, 0, 0, 1, .5, 1)
            return {"kind": K_COMPLEXO, "boxes": [(b, f)], "luz_bloqueia": True}
        if n.endswith("_double_slab"):
            f = self._tex_or_proc(n.replace("_double_slab", "_slab"), est)
            return {"kind": K_CUBO, "ftex": f, "luz_bloqueia": True, "ao": True}
        # ---- conexoes (muro, cerca, vidraca)
        if n.endswith("_wall"):
            f = self._tex_or_proc(n, est)
            mk = conn or 0
            n_, e_, s_, w_ = bool(mk & 1), bool(mk & 2), bool(mk & 4), bool(mk & 8)
            reto = (n_ and s_ and not e_ and not w_) or (e_ and w_ and not n_ and not s_)
            bx = []
            if not reto or not (n_ or e_ or s_ or w_):
                bx.append((4 / 16, 0, 4 / 16, 12 / 16, 1, 12 / 16))
            if n_: bx.append((5 / 16, 0, 0, 11 / 16, 14 / 16, 9 / 16))
            if s_: bx.append((5 / 16, 0, 7 / 16, 11 / 16, 14 / 16, 1))
            if e_: bx.append((7 / 16, 0, 5 / 16, 1, 14 / 16, 11 / 16))
            if w_: bx.append((0, 0, 5 / 16, 9 / 16, 14 / 16, 11 / 16))
            return {"kind": K_COMPLEXO, "boxes": [(b, f) for b in bx], "fam": "wall"}
        if n.endswith("_fence") and "gate" not in n:
            f = self._tex_or_proc(n, est)
            mk = conn or 0
            bx = [(6 / 16, 0, 6 / 16, 10 / 16, 1, 10 / 16)]
            for yy in ((6 / 16, 9 / 16), (12 / 16, 15 / 16)):
                if mk & 1: bx.append((7 / 16, yy[0], 0, 9 / 16, yy[1], 6 / 16))
                if mk & 4: bx.append((7 / 16, yy[0], 10 / 16, 9 / 16, yy[1], 1))
                if mk & 2: bx.append((10 / 16, yy[0], 7 / 16, 1, yy[1], 9 / 16))
                if mk & 8: bx.append((0, yy[0], 7 / 16, 6 / 16, yy[1], 9 / 16))
            return {"kind": K_COMPLEXO, "boxes": [(b, f) for b in bx], "fam": "fence"}
        if n.endswith("_fence_gate"):
            f = self._tex_or_proc(n, est)
            d = int(est.get("direction", 0))
            if d in (0, 2):
                bx = [(0, 5 / 16, 7 / 16, 2 / 16, 1, 9 / 16), (14 / 16, 5 / 16, 7 / 16, 1, 1, 9 / 16), (2 / 16, 6 / 16, 7 / 16, 14 / 16, 15 / 16, 9 / 16)]
            else:
                bx = [(7 / 16, 5 / 16, 0, 9 / 16, 1, 2 / 16), (7 / 16, 5 / 16, 14 / 16, 9 / 16, 1, 1), (7 / 16, 6 / 16, 2 / 16, 9 / 16, 15 / 16, 14 / 16)]
            return {"kind": K_COMPLEXO, "boxes": [(b, f) for b in bx], "fam": "gate"}
        if n.endswith("glass_pane") or n == "iron_bars" or n.endswith("_pane"):
            f = self._tex_or_proc(n, est)
            if n == "iron_bars":
                f = [self.at.get("iron_bars")] * 6
            mk = conn or 0
            bx = [(7 / 16, 0, 7 / 16, 9 / 16, 1, 9 / 16)]
            if mk & 1: bx.append((7 / 16, 0, 0, 9 / 16, 1, 7 / 16))
            if mk & 4: bx.append((7 / 16, 0, 9 / 16, 9 / 16, 1, 1))
            if mk & 2: bx.append((9 / 16, 0, 7 / 16, 1, 1, 9 / 16))
            if mk & 8: bx.append((0, 0, 7 / 16, 7 / 16, 1, 9 / 16))
            return {"kind": K_COMPLEXO, "boxes": [(b, f) for b in bx], "fam": "pane"}
        # ---- iluminacao e miudezas (sprites)
        if n.endswith("lantern") and "sea" not in n and "jack" not in n:
            t = self.at.get(self.uma_textura(n) or n)
            pend = bool(est.get("hanging", False))
            return {"kind": K_COMPLEXO, "quads": self._sprite(t, pendurado=pend)}
        if n.endswith("torch") and "flower" not in n:
            t = self.at.get(self.uma_textura(n) or "torch_on")
            return {"kind": K_COMPLEXO, "quads": self._sprite(t)}
        if n.endswith("candle"):
            ch = self.uma_textura(n) or "candle"
            t = self.at.get(ch, None, 1 if est.get("lit") else 0)
            qt = int(est.get("candles", 0)) + 1
            pos = {1: [(.5, .5)], 2: [(.35, .45), (.65, .55)], 3: [(.3, .35), (.65, .45), (.45, .7)], 4: [(.3, .3), (.7, .3), (.3, .7), (.7, .7)]}[min(qt, 4)]
            quads = []
            for (px, pz) in pos:
                quads += self._sprite(t, largura=2 / 16, altura=6 / 16, cx=px, cz=pz)
            return {"kind": K_COMPLEXO, "quads": quads[:QMAX]}
        if n in ("iron_chain", "chain"):
            t = self.at.get("iron_chain") if "iron_chain" in self.at.terrain else 0
            if t == 0:
                t = self.at.get("chain1")
            eixo = est.get("pillar_axis", "y")
            if eixo == "y":
                return {"kind": K_COMPLEXO, "quads": self._sprite(t, altura=1.0)}
            cor = self.at.solido((0.18, 0.2, 0.24))
            b = (0, 6.5 / 16, 6.5 / 16, 1, 9.5 / 16, 9.5 / 16) if eixo == "x" else (6.5 / 16, 6.5 / 16, 0, 9.5 / 16, 9.5 / 16, 1)
            return {"kind": K_COMPLEXO, "boxes": [(b, [cor] * 6)]}
        if n == "end_rod":
            br = self.at.solido((0.97, 0.94, 1.0))
            return {"kind": K_COMPLEXO, "boxes": [((6 / 16, 0, 6 / 16, 10 / 16, 1 / 16, 10 / 16), [br] * 6), ((7 / 16, 1 / 16, 7 / 16, 9 / 16, 1, 9 / 16), [br] * 6)]}
        if n in ("flower_pot",):
            t = self.at.get("flower_pot")
            return {"kind": K_COMPLEXO, "quads": self._sprite(t)}
        if n in ("soul_fire", "fire"):
            t = self.at.get("soul_fire_0" if n == "soul_fire" else "fire_0")
            return {"kind": K_COMPLEXO, "quads": [(3, 0, 0, 1, 0, 1, t, (0, 1, 0, 1)), (4, 0, 0, 1, 0, 1, t, (0, 1, 0, 1))]}
        if n.startswith("amethyst_cluster") or n.endswith("_amethyst_bud"):
            t = self.at.get(n if n != "amethyst_cluster" else "amethyst_cluster")
            return {"kind": K_COMPLEXO, "quads": self._sprite(t)}
        if PLANTAS.match(n):
            ch = self.uma_textura(n) or n
            if n in ("cobweb", "web"):
                ch = "web"
            alto = bool(est.get("upper_block_bit", False))
            spec, _ = self._spec(n)
            if spec and isinstance(spec.get("textures"), dict):
                tt = spec["textures"]
                ch = tt.get("up" if alto else "down", tt.get("side", ch)) if ("up" in tt or "down" in tt) else tt.get("side", ch)
            t = self.at.get(ch, self.tint_de(n, ch, 0))
            if t == 0:
                t = self.at.get("flower_" + n)
            if t == 0:
                self.nao_mapeados.add(n)
                t = self.at.procedural(n)
            return {"kind": K_COMPLEXO, "quads": [(3, 0, 0, 1, 0, 1, t, (0, 1, 0, 1)), (4, 0, 0, 1, 0, 1, t, (0, 1, 0, 1))]}
        # ---- placas finas
        if n.endswith("_carpet"):
            f = self._tex_or_proc(n.replace("_carpet", "_wool") if self._spec(n)[0] is None else n, est)
            if n == "pale_moss_carpet":
                f = [self.at.get("pale_moss_block")] * 6
            return {"kind": K_COMPLEXO, "boxes": [((0, 0, 0, 1, 1 / 16, 1), f)]}
        if n == "snow_layer":
            f = self._tex_or_proc("snow", est)
            h = (int(est.get("height", 0)) + 1) / 8.0
            return {"kind": K_COMPLEXO, "boxes": [((0, 0, 0, 1, h, 1), f)]}
        if n.endswith("_pressure_plate"):
            f = self._tex_or_proc(n, est)
            return {"kind": K_COMPLEXO, "boxes": [((1 / 16, 0, 1 / 16, 15 / 16, 1 / 16, 15 / 16), f)]}
        if n.endswith("_trapdoor"):
            f = self._tex_or_proc(n, est)
            alto = bool(est.get("upside_down_bit", False))
            if est.get("open_bit"):
                d = int(est.get("direction", 0))
                b = {0: (0, 0, 0, 3 / 16, 1, 1), 1: (13 / 16, 0, 0, 1, 1, 1), 2: (0, 0, 0, 1, 1, 3 / 16), 3: (0, 0, 13 / 16, 1, 1, 1)}[d]
            else:
                b = (0, 13 / 16, 0, 1, 1, 1) if alto else (0, 0, 0, 1, 3 / 16, 1)
            return {"kind": K_COMPLEXO, "boxes": [(b, f)]}
        if n.endswith("_door"):
            f = self._tex_or_proc(n, est)
            d = int(est.get("direction", 0))
            aberta = bool(est.get("open_bit", False))
            lado = (d + (1 if aberta else 0)) % 4
            b = {0: (0, 0, 0, 3 / 16, 1, 1), 1: (0, 0, 0, 1, 1, 3 / 16), 2: (13 / 16, 0, 0, 1, 1, 1), 3: (0, 0, 13 / 16, 1, 1, 1)}[lado]
            return {"kind": K_COMPLEXO, "boxes": [(b, f)]}
        if n.endswith("_button"):
            f = self._tex_or_proc(n, est)
            return {"kind": K_COMPLEXO, "boxes": [((5 / 16, 0, 6 / 16, 11 / 16, 2 / 16, 10 / 16), f)]}
        if n == "dirt_path" or n == "grass_path":
            f = self.faces6("grass_path") or [self.at.get("grass_path_side")] * 6
            return {"kind": K_COMPLEXO, "boxes": [((0, 0, 0, 1, 15 / 16, 1), f)], "luz_bloqueia": True}
        if n == "cauldron":
            f = self._tex_or_proc(n)
            return {"kind": K_COMPLEXO, "boxes": [((0, 0, 0, 1, 14 / 16, 1), f)], "luz_bloqueia": True}
        if n == "lectern":
            f = self._tex_or_proc(n)
            return {"kind": K_COMPLEXO, "boxes": [((0, 0, 0, 1, 14 / 16, 1), f)], "luz_bloqueia": True}
        if n.endswith("_sign") or n.endswith("_hanging_sign"):
            f = [self.at.solido((0.65, 0.5, 0.33))] * 6
            return {"kind": K_COMPLEXO, "boxes": [((2 / 16, 4 / 16, 14 / 16, 14 / 16, 12 / 16, 1), f)]}
        if n == "ladder":
            d = int(est.get("facing_direction", 2))
            t = self.at.get("ladder")
            pos = {2: (2, 1 - 1 / 16), 3: (2, 1 / 16), 4: (0, 1 - 1 / 16), 5: (0, 1 / 16)}.get(d, (2, 1 - 1 / 16))
            return {"kind": K_COMPLEXO, "quads": [(pos[0], pos[1], 0, 1, 0, 1, t, (0, 1, 0, 1))]}
        # ---- cubos
        if n.endswith("_log") or n.endswith("_wood") or n.endswith("_stem") or n in ("hay_block", "bone_block", "basalt", "polished_basalt", "muddy_mangrove_roots"):
            f = list(self._tex_or_proc(n, est))
            eixo = est.get("pillar_axis", "y")
            if eixo != "y":
                top = f[3]
                side = f[0]
                if eixo == "x":
                    f = [top, top, side, side, side, side]
                else:
                    f = [side, side, side, side, top, top]
            return {"kind": K_CUBO, "ftex": f, "luz_bloqueia": True, "ao": True}
        f = self._tex_or_proc(n, est)
        if n == "water":
            return {"kind": K_AGUA}
        if ALFA_CUBO.search(n):
            return {"kind": K_ALFA, "ftex": f}
        folha = n.endswith("_leaves") or n.startswith("azalea_leaves")
        if folha and c["hojas_vazadas"]:
            return {"kind": K_ALFA, "ftex": f, "folha": True}
        return {"kind": K_CUBO, "ftex": f, "luz_bloqueia": not folha, "ao": True, "folha": folha}


def nome_full(ns, n):
    return n if ":" in n else ns + ":" + n


# ---------------------------------------------------------------------------------------------------------------
# dump -> grade
# ---------------------------------------------------------------------------------------------------------------

def ler_dump(caminho):
    """Retorna (paleta [(nome, estados)], lista de caixas [(x1,y1,z1,x2,y2,z2,idx)], meta)."""
    with open(caminho, encoding="utf-8") as f:
        d = json.load(f)
    meta = {}
    paleta, caixas = [], []
    if isinstance(d, dict) and "blocos" in d and "paleta" in d:
        meta = {k: v for k, v in d.items() if k not in ("blocos", "paleta")}
        for p in d["paleta"]:
            if isinstance(p, dict):
                paleta.append((p["id"], p.get("estados") or {}))
            elif "|" in p:
                a, b = p.split("|", 1)
                paleta.append((a, json.loads(b)))
            elif "[" in p and p.endswith("]"):
                a, b = p[:-1].split("[", 1)
                paleta.append((a, {k.strip().strip('"'): _val(v) for k, v in (x.split("=") for x in b.split(",") if "=" in x)}))
            else:
                paleta.append((p, {}))
        for b in d["blocos"]:
            if len(b) == 4:
                caixas.append((b[0], b[1], b[2], b[0], b[1], b[2], b[3]))
            elif len(b) == 7:
                caixas.append(tuple(b))
            else:
                raise ValueError("entrada de blocos invalida: %r" % (b,))
    else:
        lista = d["blocos"] if isinstance(d, dict) else d
        meta = {k: v for k, v in d.items() if k != "blocos"} if isinstance(d, dict) else {}
        mapa = {}
        for b in lista:
            est = b.get("estados") or b.get("states") or {}
            k = (b["id"], json.dumps(est, sort_keys=True))
            if k not in mapa:
                mapa[k] = len(paleta)
                paleta.append((b["id"], est))
            caixas.append((b["x"], b["y"], b["z"], b.get("x2", b["x"]), b.get("y2", b["y"]), b.get("z2", b["z"]), mapa[k]))
    return paleta, caixas, meta


def _val(v):
    v = v.strip().strip('"')
    if v in ("true", "false"):
        return v == "true"
    try:
        return int(v)
    except ValueError:
        return v


PAD = 2


class Cena:
    pass


def montar_cena(dump, cfg, caixa=None, ymax=None):
    t0 = time.time()
    paleta, caixas, meta = ler_dump(dump)
    at = Atlas(cfg)
    md = Modelos(at, cfg)
    base = []
    for (nome, est) in paleta:
        nome = nome if ":" in nome else "minecraft:" + nome
        base.append(md.indice(nome, estados_de(est)))
    base = np.array(base, dtype=np.int32)
    ar = np.array([b for b in caixas], dtype=np.int64)
    if len(ar) == 0:
        raise SystemExit("dump vazio")
    nao_ar = base[ar[:, 6]] != 0
    lo = np.minimum(ar[nao_ar][:, 0:3], ar[nao_ar][:, 3:6]).min(axis=0) if nao_ar.any() else np.zeros(3, np.int64)
    hi = np.maximum(ar[nao_ar][:, 0:3], ar[nao_ar][:, 3:6]).max(axis=0) if nao_ar.any() else np.zeros(3, np.int64)
    if caixa is not None:
        lo = np.maximum(lo, np.array(caixa[:3], np.int64))
        hi = np.minimum(hi, np.array(caixa[3:], np.int64))
    if ymax is not None:
        hi[1] = min(hi[1], ymax)
    lo = lo - 0
    dims = (hi - lo + 1 + 2 * PAD).astype(np.int64)
    X, Y, Z = (int(v) for v in dims)
    if X * Y * Z > 120_000_000:
        raise SystemExit("regiao grande demais (%d x %d x %d): use --caixa" % (X, Y, Z))
    G = np.zeros((X, Y, Z), np.uint16)
    for (x1, y1, z1, x2, y2, z2, i) in ar:
        xa, xb = min(x1, x2), max(x1, x2)
        ya, yb = min(y1, y2), max(y1, y2)
        za, zb = min(z1, z2), max(z1, z2)
        xa, ya, za = max(xa, lo[0]), max(ya, lo[1]), max(za, lo[2])
        xb, yb, zb = min(xb, hi[0]), min(yb, hi[1]), min(zb, hi[2])
        if xa > xb or ya > yb or za > zb:
            continue
        G[xa - lo[0] + PAD:xb - lo[0] + PAD + 1, ya - lo[1] + PAD:yb - lo[1] + PAD + 1, za - lo[2] + PAD:zb - lo[2] + PAD + 1] = base[i]
    # as paletas do dump viram indices de modelo; nomes -> modelo
    n_base = len(md.lista)
    G0 = G.copy()
    # variantes dependentes da vizinhanca
    fam_arr = np.array([m["fam"] or "" for m in md.lista])
    kind_arr = np.array([m["kind"] for m in md.lista])
    solido_arr = np.array([(m["kind"] == K_CUBO and not m["folha"]) or m["kind"] == K_ALFA and "glass" in m.get("nome", "") for m in md.lista])
    nome_arr = [m.get("nome", "") for m in md.lista]
    # cerca/muro/vidraca
    for fam in ("fence", "wall", "pane"):
        bases = [i for i, m in enumerate(md.lista) if m["fam"] == fam]
        if not bases:
            continue
        if fam == "fence":
            ok = np.array([(m["kind"] == K_CUBO and not m["folha"]) or m["fam"] in ("fence", "gate") for m in md.lista])
        elif fam == "wall":
            ok = np.array([(m["kind"] == K_CUBO and not m["folha"]) or m["fam"] in ("wall", "gate") for m in md.lista])
        else:
            ok = np.array([(m["kind"] == K_CUBO and not m["folha"]) or m["fam"] == "pane" or (m["kind"] == K_ALFA and "glass" in m.get("nome", "")) for m in md.lista])
        for b in bases:
            nome_b = md.lista[b]["nome"]
            cel = np.argwhere(G0 == b)
            if len(cel) == 0:
                continue
            xs, ys, zs = cel[:, 0], cel[:, 1], cel[:, 2]
            mk = np.zeros(len(cel), np.int32)
            for bit, (dx, dz) in ((1, (0, -1)), (2, (1, 0)), (4, (0, 1)), (8, (-1, 0))):
                viz = G0[np.clip(xs + dx, 0, X - 1), ys, np.clip(zs + dz, 0, Z - 1)]
                mk |= np.where(ok[viz], bit, 0)
            est_b = estados_base(md, b)
            for m_ in np.unique(mk):
                sel = mk == m_
                ni = md.indice("minecraft:" + nome_b, est_b, None, int(m_))
                G[xs[sel], ys[sel], zs[sel]] = ni
    # degraus com quinas
    info_esc = {i: m["escada"] for i, m in enumerate(md.lista) if m["escada"] is not None}
    if info_esc:
        tab = np.full(len(md.lista), -1, np.int32)
        half = np.zeros(len(md.lista), np.int32)
        for i, (d, cima) in info_esc.items():
            tab[i] = d
            half[i] = 1 if cima else 0
        for b, (d, cima) in info_esc.items():
            cel = np.argwhere(G0 == b)
            nome_b = md.lista[b]["nome"]
            est_b = estados_base(md, b)
            for (x, y, z) in cel:
                forma = ("s",)
                dx, dz = DIRV[d]
                f = G0[min(max(x + dx, 0), X - 1), y, min(max(z + dz, 0), Z - 1)]
                fd = tab[f]
                if fd >= 0 and half[f] == half[b] and (fd // 2) != (d // 2):
                    vizi = G0[min(max(x + DIRV[OPP[fd]][0], 0), X - 1), y, min(max(z + DIRV[OPP[fd]][1], 0), Z - 1)]
                    if not (tab[vizi] == d and half[vizi] == half[b]):
                        forma = ("o", int(fd))
                if forma[0] == "s":
                    bk = G0[min(max(x - dx, 0), X - 1), y, min(max(z - dz, 0), Z - 1)]
                    bd = tab[bk]
                    if bd >= 0 and half[bk] == half[b] and (bd // 2) != (d // 2):
                        vizi = G0[min(max(x + DIRV[int(bd)][0], 0), X - 1), y, min(max(z + DIRV[int(bd)][1], 0), Z - 1)]
                        if not (tab[vizi] == d and half[vizi] == half[b]):
                            forma = ("i", int(bd))
                if forma[0] != "s":
                    G[x, y, z] = md.indice("minecraft:" + nome_b, est_b, forma, None)
    return finalizar_cena(G, md, at, cfg, lo - PAD, t0)


def estados_base(md, idx):
    m = md.lista[idx]
    for k, i in md.chave.items():
        if i == idx:
            return json.loads(k[1])
    return {}


def finalizar_cena(G, md, at, cfg, origem, t0):
    sc = Cena()
    sc.G = G
    sc.dims = G.shape
    sc.origem = np.array(origem, np.int64)  # coordenada de mundo da celula (0,0,0) da grade
    P = len(md.lista)
    sc.nome_modelo = [m.get("nome", "") for m in md.lista]
    sc.KIND = np.array([m["kind"] for m in md.lista], np.uint8)
    sc.FTEX = np.array([m["ftex"] for m in md.lista], np.int32).reshape(P, 6)
    em = np.array([m["emit"] for m in md.lista], np.float32)
    sc.EMITL = em
    sc.EMITC = np.array([m["emit_cor"] for m in md.lista], np.float32)
    sc.NBOX = np.array([len(m["boxes"]) for m in md.lista], np.int32)
    sc.BOX = np.zeros((P, KMAX, 6), np.float32)
    sc.BTEX = np.zeros((P, KMAX, 6), np.int32)
    sc.NQUAD = np.array([len(m["quads"]) for m in md.lista], np.int32)
    sc.QAX = np.zeros((P, QMAX), np.int32)
    sc.QF = np.zeros((P, QMAX, 5), np.float32)  # pos,u0,u1,y0,y1
    sc.QTEX = np.zeros((P, QMAX), np.int32)
    sc.QUV = np.zeros((P, QMAX, 4), np.float32)
    for i, m in enumerate(md.lista):
        for k, (b, tx) in enumerate(m["boxes"][:KMAX]):
            sc.BOX[i, k] = b
            sc.BTEX[i, k] = tx
        for q, (ax, pos, u0, u1, y0, y1, tx, tuv) in enumerate(m["quads"][:QMAX]):
            sc.QAX[i, q] = ax
            sc.QF[i, q] = (pos, u0, u1, y0, y1)
            sc.QTEX[i, q] = tx
            sc.QUV[i, q] = tuv
    sc.AOSOL = np.array([m["ao"] for m in md.lista], bool)
    sc.LUZ_BLOQ = np.array([m["luz_bloqueia"] for m in md.lista], bool)
    sc.PARCIAL = np.array([m["kind"] == K_COMPLEXO and m["luz_bloqueia"] for m in md.lista], bool)
    sc.ATL, sc.AVG = at.matriz()
    sc.faltando = sorted(at.faltando)
    sc.nao_mapeados = sorted(md.nao_mapeados)
    sc.cfg = cfg
    calcular_luz(sc)
    sc.t_montar = time.time() - t0
    return sc


# ---------------------------------------------------------------------------------------------------------------
# luz
# ---------------------------------------------------------------------------------------------------------------

def _espalha(L, pas, dec):
    out = L.copy()
    for ax in (1, 2, 3):
        a = tuple(slice(0, -1) if i == ax else slice(None) for i in range(4))
        b = tuple(slice(1, None) if i == ax else slice(None) for i in range(4))
        pa = tuple(slice(0, -1) if i == ax - 1 else slice(None) for i in range(3))
        pb = tuple(slice(1, None) if i == ax - 1 else slice(None) for i in range(3))
        np.maximum(out[b], (L[a] - dec) * pas[pb], out=out[b])
        np.maximum(out[a], (L[b] - dec) * pas[pa], out=out[a])
    return out


def calcular_luz(sc):
    G, cfg = sc.G, sc.cfg
    X, Y, Z = G.shape
    bloq = sc.LUZ_BLOQ[G]
    pas = (~bloq).astype(np.float32)
    # luz de blocos (colorida)
    L = np.zeros((3, X, Y, Z), np.float32)
    em = sc.EMITL[G]
    if em.max() > 0:
        for c in range(3):
            L[c] = em * sc.EMITC[G][..., c] if False else em * sc.EMITC[:, c][G]
        for _ in range(15):
            n = _espalha(L, pas, 1.0 / 15.0)
            if np.array_equal(n, L):
                break
            L = n
    # luz do ceu
    acima = np.cumsum(bloq[:, ::-1, :], axis=1)[:, ::-1, :]  # bloqueios do y atual para cima (inclusive)
    aberto = (acima == 0).astype(np.float32)
    S = aberto[None] * pas[None]
    for _ in range(15):
        n = _espalha(S, pas, 1.0 / 12.0)
        if np.array_equal(n, S):
            break
        S = n
    cor_ceu = np.array(cfg["luz_ceu"], np.float32)
    luz = L.transpose(1, 2, 3, 0) + S[0][..., None] * cor_ceu * cfg["sol"]
    # suaviza (7 pontos ponderados pela passagem)
    w = pas[..., None]
    num = luz * w * 2.0
    den = w * 2.0
    for ax in range(3):
        for sh in (1, -1):
            lz = np.roll(luz, sh, axis=ax)
            wz = np.roll(w, sh, axis=ax)
            num += lz * wz
            den += wz
    suave = num / np.maximum(den, 1e-6)
    luz = np.where(pas[..., None] > 0, suave, luz)
    # celulas parciais (degraus/lajes): pega o maior das vizinhas
    parc = sc.PARCIAL[G]
    if parc.any():
        mx = np.zeros_like(luz)
        for ax in range(3):
            for sh in (1, -1):
                mx = np.maximum(mx, np.roll(luz, sh, axis=ax))
        luz = np.where(parc[..., None], mx * 0.92, luz)
    sc.LUZ = luz.reshape(-1, 3).astype(np.float32)
    sc.OPACO = (sc.AOSOL[G]).reshape(-1)
    sc.Gf = G.reshape(-1).astype(np.int32)


# ---------------------------------------------------------------------------------------------------------------
# camera
# ---------------------------------------------------------------------------------------------------------------

def raios_perspectiva(cam, alvo, fov, W, H, ss=1):
    w, h = W * ss, H * ss
    f = unit(np.array(alvo, np.float64) - np.array(cam, np.float64))
    dir_dir = unit(np.cross(f, [0, 1, 0])) if abs(f[1]) < 0.999 else np.array([1.0, 0, 0])
    up = np.cross(dir_dir, f)
    th = math.tan(math.radians(fov) / 2)
    asp = w / h
    xs = ((np.arange(w) + .5) / w * 2 - 1) * asp * th
    ys = (1 - (np.arange(h) + .5) / h * 2) * th
    XX, YY = np.meshgrid(xs, ys)
    D = f[None, None] + dir_dir[None, None] * XX[..., None] + up[None, None] * YY[..., None]
    D = D / np.linalg.norm(D, axis=2, keepdims=True)
    D = D.reshape(-1, 3).astype(np.float32)
    O = np.tile(np.array(cam, np.float32), (len(D), 1))
    return O, D


def raios_iso(alvo, az_graus, elev_graus, caixa_mundo, W, H, ss=1, zoom=1.0):
    w, h = W * ss, H * ss
    az = math.radians(az_graus)
    el = math.radians(elev_graus)
    c = np.array([math.cos(el) * math.cos(az), math.sin(el), math.cos(el) * math.sin(az)])
    f = -c
    right = unit(np.cross(f, [0, 1, 0]))
    up = np.cross(right, f)
    lo = np.array(caixa_mundo[:3], np.float64)
    hi = np.array(caixa_mundo[3:], np.float64) + 1
    cantos = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
    rel = cantos - np.array(alvo, np.float64)
    a = np.abs(rel @ right).max()
    b = np.abs(rel @ up).max()
    asp = w / h
    meio_w = max(a, b * asp) * 1.04 / zoom
    meio_h = meio_w / asp
    diag = np.linalg.norm(hi - lo)
    xs = ((np.arange(w) + .5) / w * 2 - 1) * meio_w
    ys = (1 - (np.arange(h) + .5) / h * 2) * meio_h
    XX, YY = np.meshgrid(xs, ys)
    centro = np.array(alvo, np.float64) - f * (diag / 2 + 2)
    O = centro[None, None] + right[None, None] * XX[..., None] + up[None, None] * YY[..., None]
    O = O.reshape(-1, 3).astype(np.float32)
    D = np.tile(f.astype(np.float32), (len(O), 1))
    return O, D


# ---------------------------------------------------------------------------------------------------------------
# traçado
# ---------------------------------------------------------------------------------------------------------------

DIRF = np.array([0.66, 0.66, 0.46, 1.0, 0.82, 0.82, 0.9], np.float32)  # -x,+x,-y,+y,-z,+z, quad


def texel(sc, tex, px, py, t, mip0):
    c = sc.ATL[tex, py, px]
    if mip0 > 0:
        w = np.clip((t - mip0) / (mip0 * 1.5), 0, 1)[:, None] * 0.85
        c = np.concatenate([c[:, :3] * (1 - w) + sc.AVG[tex] * w, c[:, 3:4]], axis=1)
    return c


def uv_face(face, lx, ly, lz):
    u = np.where(face == 0, lz, np.where(face == 1, 1 - lz, np.where(face == 4, 1 - lx, lx)))
    py = np.where((face >= 2) & (face <= 3), lz, 1 - ly)
    px = np.minimum((u * 16).astype(np.int32), 15)
    py = np.minimum((py * 16).astype(np.int32), 15)
    return np.clip(px, 0, 15), np.clip(py, 0, 15)


def ao_eixo(sc, aflat, d1, d2, t1, t2):
    op = sc.OPACO
    g = sc.Gf
    def s(off):
        return op[aflat + off].astype(np.float32)
    res = {}
    for s1 in (-1, 1):
        for s2 in (-1, 1):
            a = s(s1 * d1)
            b = s(s2 * d2)
            c = s(s1 * d1 + s2 * d2)
            v = np.where((a > 0) & (b > 0), 0.0, 3.0 - (a + b + c)) / 3.0
            res[(s1, s2)] = v
    w1 = t1
    w2 = t2
    return (res[(-1, -1)] * (1 - w1) * (1 - w2) + res[(1, -1)] * w1 * (1 - w2) + res[(-1, 1)] * (1 - w1) * w2 + res[(1, 1)] * w1 * w2)


def trace(sc, O, D, fog, far, W, H, ver=False):
    cfg = sc.cfg
    N = len(D)
    X, Y, Z = sc.dims
    SX, SY, SZ = Y * Z, Z, 1
    C = np.zeros((N, 3), np.float32)
    T = np.ones(N, np.float32)
    E = np.zeros((N, 3), np.float32)
    endk = np.zeros(N, np.int8)
    fog_cor = np.array(fog["cor"], np.float32)
    f_ini, f_fim = fog["ini"], fog["fim"]
    amb = cfg["ambiente"]
    lmax = 1.18
    agua = np.array(cfg["agua"], np.float32)
    kagua = cfg["agua_densidade"]

    inv = 1.0 / np.where(np.abs(D) < 1e-8, np.float32(1e-8) * np.where(D < 0, -1, 1), D)
    lo = np.zeros(3, np.float32)
    hi = np.array([X, Y, Z], np.float32)
    t1 = (lo[None] - O) * inv
    t2 = (hi[None] - O) * inv
    tn = np.minimum(t1, t2).max(axis=1)
    tf = np.maximum(t1, t2).min(axis=1)
    t0 = np.maximum(tn, 0)
    ok = (tf > t0) & (t0 < far)
    pid = np.flatnonzero(ok).astype(np.int32)
    n = len(pid)
    Oa = O[pid]
    Da = D[pid]
    ia = inv[pid]
    P0 = Oa + Da * (t0[pid] + 1e-4)[:, None]
    cell = np.floor(P0).astype(np.int32)
    cell[:, 0] = np.clip(cell[:, 0], 0, X - 1)
    cell[:, 1] = np.clip(cell[:, 1], 0, Y - 1)
    cell[:, 2] = np.clip(cell[:, 2], 0, Z - 1)
    stp = np.where(Da >= 0, 1, -1).astype(np.int32)
    td = np.abs(ia)
    tm = ((cell + (stp > 0)) - Oa) * ia
    S = {
        "pid": pid, "ox": Oa[:, 0].copy(), "oy": Oa[:, 1].copy(), "oz": Oa[:, 2].copy(),
        "dx": Da[:, 0].copy(), "dy": Da[:, 1].copy(), "dz": Da[:, 2].copy(),
        "tdx": td[:, 0].copy(), "tdy": td[:, 1].copy(), "tdz": td[:, 2].copy(),
        "tmx": tm[:, 0].copy(), "tmy": tm[:, 1].copy(), "tmz": tm[:, 2].copy(),
        "cx": cell[:, 0].copy(), "cy": cell[:, 1].copy(), "cz": cell[:, 2].copy(),
        "sx": stp[:, 0].copy(), "sy": stp[:, 1].copy(), "sz": stp[:, 2].copy(),
        "wt": np.full(n, -1.0, np.float32), "alive": np.ones(n, bool),
    }
    del Oa, Da, ia, P0, cell, stp, td, tm
    mip0 = cfg["mip"]
    it = 0

    def fogf(t):
        return np.clip((t - f_ini) / max(f_fim - f_ini, 1e-3), 0, 1).astype(np.float32)

    def comp(ii, rgb, a, emis=None):
        p = S["pid"][ii]
        tp = T[p]
        w = (a * tp)[:, None]
        C[p] += rgb * w
        if emis is not None:
            E[p] += emis * w
        T[p] = tp * (1 - a)
        fim = T[p] < 0.03
        if fim.any():
            S["alive"][ii[fim]] = False
            T[p[fim]] = 0

    def luz_em(flat):
        return np.clip(amb + sc.LUZ[flat], 0, lmax)

    def agua_frag(ii, tfim, flat_luz):
        seg = np.maximum(tfim - S["wt"][ii], 0)
        a = 1 - np.exp(-kagua * seg)
        lz = luz_em(flat_luz)
        rgb = agua[None] * lz * 0.95
        f = fogf(tfim)[:, None]
        rgb = rgb * (1 - f) + fog_cor[None] * f
        comp(ii, rgb, a)

    while True:
        n = len(S["cx"])
        if n == 0 or not S["alive"].any():
            break
        it += 1
        tmx, tmy, tmz = S["tmx"], S["tmy"], S["tmz"]
        mx = (tmx <= tmy) & (tmx <= tmz)
        my = (~mx) & (tmy <= tmz)
        mz = ~(mx | my)
        tent = np.where(mx, tmx, np.where(my, tmy, tmz))
        np.add(S["tmx"], S["tdx"], out=S["tmx"], where=mx)
        np.add(S["tmy"], S["tdy"], out=S["tmy"], where=my)
        np.add(S["tmz"], S["tdz"], out=S["tmz"], where=mz)
        np.add(S["cx"], S["sx"], out=S["cx"], where=mx)
        np.add(S["cy"], S["sy"], out=S["cy"], where=my)
        np.add(S["cz"], S["sz"], out=S["cz"], where=mz)
        cx, cy, cz = S["cx"], S["cy"], S["cz"]
        alive = S["alive"]
        fuera = (cx < 0) | (cx >= X) | (cy < 0) | (cy >= Y) | (cz < 0) | (cz >= Z)
        longe = tent >= far
        fin = alive & (fuera | longe)
        if fin.any():
            ii = np.flatnonzero(fin & (S["wt"] >= 0))
            if len(ii):
                stride = np.where(mx[ii], SX, np.where(my[ii], SY, SZ))
                stp_i = np.where(mx[ii], S["sx"][ii], np.where(my[ii], S["sy"][ii], S["sz"][ii]))
                fl = (np.clip(cx[ii], 0, X - 1) * Y + np.clip(cy[ii], 0, Y - 1)) * Z + np.clip(cz[ii], 0, Z - 1) - stride * stp_i
                agua_frag(ii, np.minimum(tent[ii], far), np.clip(fl, 0, X * Y * Z - 1))
            jj = np.flatnonzero(fin & longe & ~fuera)
            endk[S["pid"][jj]] = 1
            alive &= ~fin
        flat = (np.clip(cx, 0, X - 1) * Y + np.clip(cy, 0, Y - 1)) * Z + np.clip(cz, 0, Z - 1)
        v = sc.Gf[flat]
        kind = sc.KIND[v]
        # saida da agua
        wt = S["wt"]
        sai = alive & (wt >= 0) & (kind != K_AGUA)
        if sai.any():
            ii = np.flatnonzero(sai)
            stride = np.where(mx[ii], SX, np.where(my[ii], SY, SZ))
            stp_i = np.where(mx[ii], S["sx"][ii], np.where(my[ii], S["sy"][ii], S["sz"][ii]))
            agua_frag(ii, tent[ii], flat[ii] - stride * stp_i)
            wt[ii] = -1.0
        ent = alive & (kind == K_AGUA) & (wt < 0)
        if ent.any():
            ii = np.flatnonzero(ent)
            wt[ii] = tent[ii]
            stride = np.where(mx[ii], SX, np.where(my[ii], SY, SZ))
            stp_i = np.where(mx[ii], S["sx"][ii], np.where(my[ii], S["sy"][ii], S["sz"][ii]))
            fl = flat[ii] - stride * stp_i
            lz = luz_em(fl)
            rgb = agua[None] * lz * 1.05
            f = fogf(tent[ii])[:, None]
            rgb = rgb * (1 - f) + fog_cor[None] * f
            comp(ii, rgb, np.full(len(ii), cfg["agua_superficie"], np.float32))
        # ---- cubos e cubos com alfa
        sel = np.flatnonzero(alive & ((kind == K_CUBO) | (kind == K_ALFA)))
        if len(sel):
            vs = v[sel]
            t = tent[sel]
            mxs, mys = mx[sel], my[sel]
            sxs, sys_, szs = S["sx"][sel], S["sy"][sel], S["sz"][sel]
            hx = S["ox"][sel] + S["dx"][sel] * t - cx[sel]
            hy = S["oy"][sel] + S["dy"][sel] * t - cy[sel]
            hz = S["oz"][sel] + S["dz"][sel] * t - cz[sel]
            lx, ly, lz_ = np.clip(hx, 0, 1), np.clip(hy, 0, 1), np.clip(hz, 0, 1)
            face = np.where(mxs, (sxs < 0).astype(np.int32), np.where(mys, 2 + (sys_ < 0).astype(np.int32), 4 + (szs < 0).astype(np.int32)))
            stride = np.where(mxs, SX, np.where(mys, SY, SZ))
            stp_s = np.where(mxs, sxs, np.where(mys, sys_, szs))
            aflat = np.clip(flat[sel] - stride * stp_s, 0, X * Y * Z - 1)
            ks = kind[sel]
            skip = (ks == K_ALFA) & (sc.Gf[aflat] == vs)
            tex = sc.FTEX[vs, face]
            px, py = uv_face(face, lx, ly, lz_)
            tx = texel(sc, tex, px, py, t, mip0)
            a = np.where(ks == K_ALFA, tx[:, 3], 1.0).astype(np.float32)
            a = np.where(skip, 0.0, a)
            # ambient occlusion so em cubos opacos
            ao = np.ones(len(sel), np.float32)
            solid = (ks == K_CUBO) & sc.AOSOL[vs]
            if solid.any() and cfg["ao"] > 0:
                for ax, (d1, d2, c1, c2) in enumerate(((SY, SZ, ly, lz_), (SX, SZ, lx, lz_), (SX, SY, lx, ly))):
                    mm = np.flatnonzero(solid & ((mxs, mys, ~(mxs | mys))[ax]))
                    if len(mm):
                        ao[mm] = ao_eixo(sc, aflat[mm], d1, d2, c1[mm], c2[mm])
                ao = 1.0 - cfg["ao"] * (1.0 - ao)
            lzv = luz_em(aflat)
            el = sc.EMITL[vs]
            emis = el > 0
            sh = (DIRF[face] * ao)[:, None] * lzv
            col = tx[:, :3]
            rgb = col * sh
            if emis.any():
                bril = np.maximum(sh, (0.85 + 0.35 * el)[:, None])
                rgb = np.where(emis[:, None], col * bril, rgb)
            f = fogf(t)[:, None]
            rgb = rgb * (1 - f) + fog_cor[None] * f
            em_c = np.where(emis[:, None], sc.EMITC[vs] * el[:, None] * (1 - f), 0)
            keep = a > 0.01
            if keep.any():
                ii = sel[keep]
                comp(ii, rgb[keep], a[keep], em_c[keep])
        # ---- modelos complexos (caixas e planos)
        sel = np.flatnonzero(alive & (kind == K_COMPLEXO))
        if len(sel):
            complexos(sc, S, sel, v, tent, flat, mip0, fogf, fog_cor, luz_em, comp)
        # compacta
        alive = S["alive"]
        if (~alive).sum() > 0.1 * len(alive) or not alive.any():
            for k in list(S.keys()):
                S[k] = S[k][alive]
        if ver and it % 20 == 0:
            print("  it %d: %d raios vivos" % (it, int(S["alive"].sum())), file=sys.stderr)
    return C, T, E, endk


def complexos(sc, S, sel, v, tent, flat, mip0, fogf, fog_cor, luz_em, comp):
    vs = v[sel]
    n = len(sel)
    ox, oy, oz = S["ox"][sel], S["oy"][sel], S["oz"][sel]
    dx, dy, dz = S["dx"][sel], S["dy"][sel], S["dz"][sel]
    cx, cy, cz = S["cx"][sel].astype(np.float32), S["cy"][sel].astype(np.float32), S["cz"][sel].astype(np.float32)
    ts = tent[sel]
    sd = lambda a: np.where(np.abs(a) < 1e-8, np.float32(1e-8), a)
    ix, iy, iz = 1.0 / sd(dx), 1.0 / sd(dy), 1.0 / sd(dz)
    best_t = np.full(n, np.inf, np.float32)
    best_rgb = np.zeros((n, 3), np.float32)
    best_a = np.zeros(n, np.float32)
    best_face = np.full(n, 6, np.int32)
    nb = sc.NBOX[vs]
    nq = sc.NQUAD[vs]
    for k in range(KMAX):
        ii = np.flatnonzero(nb > k)
        if len(ii) == 0:
            break
        B = sc.BOX[vs[ii], k]
        a1x = (B[:, 0] + cx[ii] - ox[ii]) * ix[ii]; a2x = (B[:, 3] + cx[ii] - ox[ii]) * ix[ii]
        a1y = (B[:, 1] + cy[ii] - oy[ii]) * iy[ii]; a2y = (B[:, 4] + cy[ii] - oy[ii]) * iy[ii]
        a1z = (B[:, 2] + cz[ii] - oz[ii]) * iz[ii]; a2z = (B[:, 5] + cz[ii] - oz[ii]) * iz[ii]
        mnx, mxx = np.minimum(a1x, a2x), np.maximum(a1x, a2x)
        mny, mxy = np.minimum(a1y, a2y), np.maximum(a1y, a2y)
        mnz, mxz = np.minimum(a1z, a2z), np.maximum(a1z, a2z)
        tn = np.maximum(np.maximum(mnx, mny), mnz)
        tf = np.minimum(np.minimum(mxx, mxy), mxz)
        ok = (tn <= tf) & (tf > ts[ii] - 1e-4) & (tn < best_t[ii])
        jj = np.flatnonzero(ok)
        if len(jj) == 0:
            continue
        g = ii[jj]
        tt = np.maximum(tn[jj], ts[g])
        axx = (mnx[jj] >= mny[jj]) & (mnx[jj] >= mnz[jj])
        axy = (~axx) & (mny[jj] >= mnz[jj])
        face = np.where(axx, np.where(dx[g] > 0, 0, 1), np.where(axy, np.where(dy[g] > 0, 2, 3), np.where(dz[g] > 0, 4, 5))).astype(np.int32)
        lx = np.clip(ox[g] + dx[g] * tt - cx[g], 0, 1)
        ly = np.clip(oy[g] + dy[g] * tt - cy[g], 0, 1)
        lz = np.clip(oz[g] + dz[g] * tt - cz[g], 0, 1)
        tex = sc.BTEX[vs[g], k][np.arange(len(g)), face]
        px, py = uv_face(face, lx, ly, lz)
        tx = texel(sc, tex, px, py, tt, mip0)
        val = tx[:, 3] > 0.04
        g2 = g[val]
        best_t[g2] = tt[val]
        best_rgb[g2] = tx[val, :3]
        best_a[g2] = tx[val, 3]
        best_face[g2] = face[val]
    for q in range(QMAX):
        ii = np.flatnonzero(nq > q)
        if len(ii) == 0:
            break
        ax = sc.QAX[vs[ii], q]
        F = sc.QF[vs[ii], q]  # pos,u0,u1,y0,y1
        lxo = ox[ii] - cx[ii]
        lyo = oy[ii] - cy[ii]
        lzo = oz[ii] - cz[ii]
        with np.errstate(divide="ignore", invalid="ignore"):
            t_x = (F[:, 0] - lxo) / sd(dx[ii])
            t_z = (F[:, 0] - lzo) / sd(dz[ii])
            t_d3 = -((lxo - lzo)) / sd(dx[ii] - dz[ii])
            t_d4 = (1 - lxo - lzo) / sd(dx[ii] + dz[ii])
        tq = np.where(ax == 0, t_x, np.where(ax == 2, t_z, np.where(ax == 3, t_d3, t_d4)))
        hx = lxo + dx[ii] * tq
        hy = lyo + dy[ii] * tq
        hz = lzo + dz[ii] * tq
        u = np.where(ax == 0, hz, hx)
        ok = (tq > ts[ii] - 1e-4) & (tq < best_t[ii])
        ok &= (hy >= F[:, 3]) & (hy <= F[:, 4])
        ok &= np.where(ax <= 2, (u >= F[:, 1]) & (u <= F[:, 2]), (hx >= 0) & (hx <= 1) & (hz >= 0) & (hz <= 1))
        jj = np.flatnonzero(ok)
        if len(jj) == 0:
            continue
        g = ii[jj]
        uu = (u[jj] - F[jj, 1]) / np.maximum(F[jj, 2] - F[jj, 1], 1e-6)
        vv = (hy[jj] - F[jj, 3]) / np.maximum(F[jj, 4] - F[jj, 3], 1e-6)
        uv = sc.QUV[vs[g], q]
        su = uv[:, 0] + uu * (uv[:, 1] - uv[:, 0])
        sv = uv[:, 2] + vv * (uv[:, 3] - uv[:, 2])
        px = np.clip((su * 16).astype(np.int32), 0, 15)
        py = np.clip(((1 - sv) * 16).astype(np.int32), 0, 15)
        tex = sc.QTEX[vs[g], q]
        tx = texel(sc, tex, px, py, tq[jj], mip0)
        val = tx[:, 3] > 0.35
        g2 = g[val]
        best_t[g2] = tq[jj][val]
        best_rgb[g2] = tx[val, :3]
        best_a[g2] = 1.0
        best_face[g2] = 6
    hit = np.flatnonzero(np.isfinite(best_t))
    if len(hit) == 0:
        return
    vs_h = vs[hit]
    lz = luz_em(flat[sel][hit])
    face = best_face[hit]
    el = sc.EMITL[vs_h]
    emis = el > 0
    sh = DIRF[face][:, None] * lz
    rgb = best_rgb[hit] * sh
    if emis.any():
        bril = np.maximum(sh, (0.85 + 0.35 * el)[:, None])
        rgb = np.where(emis[:, None], best_rgb[hit] * bril, rgb)
    t = best_t[hit]
    f = fogf(t)[:, None]
    rgb = rgb * (1 - f) + fog_cor[None] * f
    em_c = np.where(emis[:, None], sc.EMITC[vs_h] * el[:, None] * (1 - f), 0)
    comp(sel[hit], rgb, best_a[hit], em_c)


# ---------------------------------------------------------------------------------------------------------------
# imagem final
# ---------------------------------------------------------------------------------------------------------------

def box_blur(img, r):
    if r < 1:
        return img
    for eixo in (0, 1):
        p = np.pad(img, [(r, r) if i == eixo else (0, 0) for i in range(3)], mode="edge")
        c = np.cumsum(p, axis=eixo, dtype=np.float64)
        z = np.zeros_like(np.take(c, [0], axis=eixo))
        c = np.concatenate([z, c], axis=eixo)
        n = img.shape[eixo]
        a = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=eixo)
        b = np.take(c, np.arange(0, n), axis=eixo)
        img = ((a - b) / (2 * r + 1)).astype(np.float32)
    return img


def compor(sc, C, T, E, endk, D, W, H, ss, fog, cfg):
    fog_cor = np.array(fog["cor"], np.float32)
    ceu = np.array(cfg["ceu"] if cfg["ceu"] is not None else fog["cor"], np.float32)
    dy = D[:, 1]
    g = np.clip((dy - 0.0) / 0.6, 0, 1)[:, None]
    g = g * g * (3 - 2 * g)
    ceu_d = fog_cor[None] * (1 - g) + ceu[None] * g
    bg = np.where((endk == 1)[:, None], fog_cor[None], ceu_d)
    img = C + T[:, None] * bg
    img = img.reshape(H * ss, W * ss, 3)
    em = E.reshape(H * ss, W * ss, 3)
    if cfg["brilho"] > 0 and em.max() > 0:
        r = max(2, (W * ss) // 160)
        b = box_blur(box_blur(em, r), r) * 0.5 + box_blur(box_blur(em, r * 3), r * 3) * 0.9 + box_blur(box_blur(em, r * 8), r * 8) * 1.4
        img = img + b * cfg["brilho"]
    img = np.clip(img, 0, 1)
    img = img ** (1.0 / cfg["gama"])
    im = Image.fromarray((img * 255 + 0.5).astype(np.uint8))
    if ss > 1:
        im = im.resize((W, H), Image.BOX)
    return im


# ---------------------------------------------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------------------------------------------

def parse_nevoa(s, padrao_cor):
    if not s:
        return {"cor": padrao_cor, "ini": 1e9, "fim": 1e9 + 1, "ativa": False}
    p = str(s).split(":")
    cor = cor_hex(p[0])
    fim = float(p[1]) if len(p) > 1 else 120.0
    ini = float(p[2]) if len(p) > 2 else fim * 0.25
    return {"cor": cor, "ini": ini, "fim": fim, "ativa": True}


def vetor(s):
    if isinstance(s, (list, tuple)):
        return [float(x) for x in s]
    return [float(x) for x in str(s).split(",")]


def config_base(a):
    return {
        "texturas": a.texturas,
        "grama": cor_hex(a.tinta_grama), "folhas": cor_hex(a.tinta_folhas), "agua": cor_hex(a.agua),
        "agua_densidade": 0.55, "agua_superficie": 0.28,
        "hojas_vazadas": a.folhas_vazadas, "ambiente": a.ambiente, "sol": a.sol, "luz_ceu": cor_hex(a.luz_ceu),
        "ao": a.ao, "mip": a.mip, "brilho": a.brilho, "gama": a.gama,
        "ceu": cor_hex(a.ceu) if a.ceu else None,
    }


def renderizar(sc, cam_cfg, cfg, W, H, ss, ver=False):
    """cam_cfg: dict com cam, alvo, fov, iso, rot, elev, zoom, nevoa, longe, ceu..."""
    cfg = dict(cfg)
    for k in ("ambiente", "sol", "brilho", "ao", "gama"):
        if k in cam_cfg and cam_cfg[k] is not None:
            cfg[k] = float(cam_cfg[k])
    if cam_cfg.get("ceu"):
        cfg["ceu"] = cor_hex(cam_cfg["ceu"])
    sc.cfg = cfg
    fog = parse_nevoa(cam_cfg.get("nevoa"), cor_hex(cam_cfg.get("ceu") or "0xE8D9B0"))
    o = sc.origem
    if cam_cfg.get("iso"):
        alvo = np.array(vetor(cam_cfg["alvo"])) - o
        cx = cam_cfg.get("caixa_mundo")
        if cx is None:
            cx = (o[0] + PAD, o[1] + PAD, o[2] + PAD, o[0] + sc.dims[0] - PAD - 1, o[1] + sc.dims[1] - PAD - 1, o[2] + sc.dims[2] - PAD - 1)
        cx_l = np.array(cx, np.float64)
        cx_l[:3] -= o
        cx_l[3:] -= o
        az = 45.0 + 90.0 * float(cam_cfg.get("rot", 0)) + float(cam_cfg.get("az", 0))
        O, D = raios_iso(alvo, az, float(cam_cfg.get("elev", 30.0)), cx_l, W, H, ss, float(cam_cfg.get("zoom", 1.0)))
        diag = np.linalg.norm(cx_l[3:] - cx_l[:3]) + 4
        far = float(cam_cfg.get("longe", diag * 2 + 10))
        if fog["ativa"]:
            pass
    else:
        cam = np.array(vetor(cam_cfg["cam"])) - o
        if "yaw" in cam_cfg:  # yaw 0 = leste (+x), 90 = sul (+z), 270 = norte; pitch > 0 olha para baixo (como no jogo)
            yw, pt = math.radians(float(cam_cfg["yaw"])), math.radians(float(cam_cfg.get("pitch", 0)))
            alvo = cam + np.array([math.cos(yw) * math.cos(pt), -math.sin(pt), math.sin(yw) * math.cos(pt)])
        else:
            alvo = np.array(vetor(cam_cfg["alvo"])) - o
        O, D = raios_perspectiva(cam, alvo, float(cam_cfg.get("fov", 70)), W, H, ss)
        far = float(cam_cfg.get("longe", fog["fim"] if fog["ativa"] else 300))
    t0 = time.time()
    gf0 = sc.Gf
    cm, ym = cam_cfg.get("caixa_mundo"), cam_cfg.get("ymax")
    if cm is not None or ym is not None:  # recorte por vista: o que fica fora da caixa (ou acima de ymax) some
        g = sc.Gf.reshape(sc.dims).copy()
        lo_ = np.array(cm[:3], np.int64) - o if cm is not None else np.array([-10**9] * 3)
        hi_ = np.array(cm[3:], np.int64) - o if cm is not None else np.array([10**9] * 3)
        if ym is not None:
            hi_[1] = min(hi_[1], int(ym) - o[1])
        for ax in range(3):
            n_ = sc.dims[ax]
            idx = np.arange(n_)
            fora = (idx < lo_[ax]) | (idx > hi_[ax])
            sl = [slice(None)] * 3
            sl[ax] = fora
            g[tuple(sl)] = 0
        sc.Gf = g.reshape(-1)
    try:
        C, T, E, endk = trace(sc, O, D, fog, far, W * ss, H * ss, ver)
    finally:
        sc.Gf = gf0
    im = compor(sc, C, T, E, endk, D, W, H, ss, fog, cfg)
    return im, time.time() - t0


def titulo(im, texto):
    d = ImageDraw.Draw(im)
    fonte = ImageFont.load_default()
    d.rectangle((0, 0, 8 + 7 * len(texto), 14), fill=(0, 0, 0))
    d.text((4, 2), texto, fill=(255, 255, 255), font=fonte)
    return im


def folha_contato(ims, nomes, colunas):
    w, h = ims[0].size
    linhas = (len(ims) + colunas - 1) // colunas
    F = Image.new("RGB", (w * colunas + 4 * (colunas + 1), h * linhas + 4 * (linhas + 1)), (20, 20, 24))
    for i, (im, nm) in enumerate(zip(ims, nomes)):
        im = titulo(im.copy(), nm)
        F.paste(im, (4 + (i % colunas) * (w + 4), 4 + (i // colunas) * (h + 4)))
    return F


def main():
    ap = argparse.ArgumentParser(description="Renderizador 3D de blocos (ver addon/docs/previas/LEIA_voxel_render.md)")
    ap.add_argument("dump")
    ap.add_argument("--cam"); ap.add_argument("--alvo"); ap.add_argument("--fov", type=float, default=70)
    ap.add_argument("--size", default="1280x720"); ap.add_argument("--ss", type=int, default=1, help="supersampling (2 = mais suave, 4x mais lento)")
    ap.add_argument("--nevoa", help="cor:fim[:inicio]  ex. 0xE8D9B0:120:30"); ap.add_argument("--ceu", help="cor do alto do ceu (padrao = cor da nevoa)")
    ap.add_argument("--saida", default="saida.png")
    ap.add_argument("--iso", action="store_true"); ap.add_argument("--rot", type=float, default=0, help="iso: 0..3 (giro de 90 graus)"); ap.add_argument("--elev", type=float, default=30); ap.add_argument("--zoom", type=float, default=1.0)
    ap.add_argument("--orbita", type=int, default=0); ap.add_argument("--raio", type=float, default=0, help="orbita: raio (0 = distancia cam-alvo)")
    ap.add_argument("--painel"); ap.add_argument("--area", help="painel: nome(s) da area, separados por virgula"); ap.add_argument("--colunas", type=int, default=3)
    ap.add_argument("--caixa", help="x1,y1,z1,x2,y2,z2: recorta o dump"); ap.add_argument("--ymax", type=int, help="esconde tudo acima desse y (corte de telhado)")
    ap.add_argument("--texturas", default=TEX_PADRAO)
    ap.add_argument("--tinta-grama", default="0x9DB56B"); ap.add_argument("--tinta-folhas", default="0x8FA861"); ap.add_argument("--agua", default="0x3F76E4")
    ap.add_argument("--folhas-vazadas", action="store_true")
    ap.add_argument("--ambiente", type=float, default=0.28, help="luz minima (0..1)"); ap.add_argument("--sol", type=float, default=0.8, help="forca da luz do ceu (0 = noite/subsolo)")
    ap.add_argument("--luz-ceu", default="0xFFFFFF")
    ap.add_argument("--ao", type=float, default=0.55); ap.add_argument("--mip", type=float, default=28.0); ap.add_argument("--brilho", type=float, default=0.55); ap.add_argument("--gama", type=float, default=1.0)
    ap.add_argument("--verbose", action="store_true")
    a = ap.parse_args()
    cfg = config_base(a)
    W, H = (int(x) for x in a.size.lower().split("x"))
    caixa = [int(float(x)) for x in a.caixa.split(",")] if a.caixa else None
    t0 = time.time()
    sc = montar_cena(a.dump, cfg, caixa, a.ymax)
    print("cena montada em %.1fs: grade %s, %d modelos" % (sc.t_montar, "x".join(str(d) for d in sc.dims), len(sc.KIND)), file=sys.stderr)
    if sc.faltando:
        print("texturas nao achadas:", ", ".join(sc.faltando), file=sys.stderr)
    if sc.nao_mapeados:
        print("blocos sem mapeamento (cor procedural):", ", ".join(sc.nao_mapeados), file=sys.stderr)
    base = {"nevoa": a.nevoa, "ceu": a.ceu, "fov": a.fov, "iso": a.iso, "rot": a.rot, "elev": a.elev, "zoom": a.zoom}
    saida = a.saida
    if a.painel:
        spec = json.load(open(a.painel, encoding="utf-8"))
        areas = spec["areas"] if "areas" in spec else {"_": spec}
        pedidas = a.area.split(",") if a.area else list(areas.keys())
        for nm in pedidas:
            ar = areas[nm]
            glob = dict(spec.get("global", {}))
            glob.update({k: v for k, v in ar.items() if k != "vistas"})
            ims, nomes, tempos = [], [], []
            pw, ph = (int(x) for x in str(glob.get("tile", "640x360")).split("x"))
            for vi in ar["vistas"]:
                cc = dict(base)
                cc.update(glob)
                cc.update(vi)
                cc.pop("tile", None)
                cfg_v = dict(cfg)
                im, dt = renderizar(sc, cc, cfg_v, pw, ph, int(cc.get("ss", a.ss)), a.verbose)
                ims.append(im); nomes.append(vi.get("nome", "vista")); tempos.append(dt)
                print("  %s/%s %.1fs" % (nm, nomes[-1], dt), file=sys.stderr)
            F = folha_contato(ims, nomes, int(glob.get("colunas", a.colunas)))
            dst = saida if len(pedidas) == 1 else saida.replace(".png", "_%s.png" % nm)
            if len(pedidas) > 1 and "{area}" in saida:
                dst = saida.replace("{area}", nm)
            F.save(dst)
            print("folha:", dst, "(%.1fs de render)" % sum(tempos))
        return
    if not a.alvo:
        ap.error("--alvo e obrigatorio")
    if a.orbita:
        cam = np.array(vetor(a.cam)); alvo = np.array(vetor(a.alvo))
        rel = cam - alvo
        raio = a.raio or math.hypot(rel[0], rel[2])
        ang0 = math.atan2(rel[2], rel[0])
        ims, nomes = [], []
        for i in range(a.orbita):
            ang = ang0 + 2 * math.pi * i / a.orbita
            cc = dict(base)
            cc["alvo"] = list(alvo)
            if a.iso:
                cc["az"] = 360.0 * i / a.orbita
                cc["caixa_mundo"] = caixa
            else:
                cc["cam"] = [alvo[0] + raio * math.cos(ang), cam[1], alvo[2] + raio * math.sin(ang)]
            im, dt = renderizar(sc, cc, cfg, W, H, a.ss, a.verbose)
            fn = saida.replace(".png", "_%03d.png" % i)
            im.save(fn)
            ims.append(im); nomes.append("orbita %d/%d" % (i + 1, a.orbita))
            print("quadro", fn, "%.1fs" % dt)
        pw, ph = max(320, W // 2), max(180, H // 2)
        folha_contato([i.resize((pw, ph), Image.LANCZOS) for i in ims], nomes, min(4, a.orbita)).save(saida.replace(".png", "_folha.png"))
        return
    cc = dict(base)
    cc["alvo"] = a.alvo
    if a.iso:
        cc["caixa_mundo"] = caixa
    else:
        if not a.cam:
            ap.error("--cam e obrigatorio sem --iso")
        cc["cam"] = a.cam
    im, dt = renderizar(sc, cc, cfg, W, H, a.ss, a.verbose)
    im.save(saida)
    print("%s  render %.1fs (total %.1fs)" % (saida, dt, time.time() - t0))


if __name__ == "__main__":
    main()
