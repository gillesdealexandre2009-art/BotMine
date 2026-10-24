"""Gera os itens permanentes do evento Ecos dos Ausentes: ícones, camadas de armadura, itens, attachables, receitas, item_texture e .lang.

Uso: python tools/gerar_ecos_itens.py   (idempotente: pode rodar de novo)
IDs permanentes, nunca renomear: vulpus:fragmento_alma, vulpus:ausente_{helmet,chestplate,leggings,boots}, vulpus:varinha_lamento.
"""
import json
import os

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
BP = os.path.join(RAIZ, "vulpus_bp")
RP = os.path.join(RAIZ, "vulpus_rp")

ITENS_TEX = "textures/vulpus/itens"
ARMADURA_TEX = "textures/models/armor"

def salvar_json(caminho, dado):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        json.dump(dado, f, ensure_ascii=False, indent=2)
        f.write("\n")


def png(caminho, img):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    img.save(caminho)



# ---------------------------------------------------------------- ícones 16x16
# ---------------------------------------------------------------- paleta "pedra-lunar"
# pérola (luz, base, sombra, sombra funda), ouro pálido, lavanda, ciano de alma, madeira pálida
PAL = {
    "o": (34, 30, 64),
    "W": (255, 255, 255),
    "l": (246, 246, 255), "p": (214, 216, 242), "s": (160, 162, 208), "t": (112, 108, 166),
    "G": (252, 238, 188), "g": (214, 190, 132), "h": (148, 122, 86),
    "u": (166, 154, 218), "v": (122, 110, 184), "V": (78, 68, 136),
    "w": (226, 253, 255), "k": (104, 222, 242), "c": (44, 138, 182),
    "z": (222, 208, 200), "y": (176, 156, 156), "x": (116, 96, 110),
    "5": (190, 170, 236), "6": (150, 128, 214),
    "n": (88, 88, 150), "N": (110, 108, 172), "m": (70, 68, 128), "P": (244, 245, 254),
}
# tom mais escuro para a metade direita (a luz vem do canto superior esquerdo)
ESCURECE = {"l": "p", "p": "s", "s": "t", "G": "g", "g": "h", "u": "v", "v": "V", "z": "y", "y": "x", "5": "6", "N": "n", "n": "m"}
OUTLINE = PAL["o"]


def _mapa_para_img(linhas, y0=0, espelhar=False):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for dy, linha in enumerate(linhas):
        y = y0 + dy
        if espelhar:
            esq = (linha + "." * 8)[:8]
            dir_ = "".join(ESCURECE.get(ch, ch) for ch in reversed(esq))
            linha = esq + dir_
        for x, ch in enumerate((linha + "." * 16)[:16]):
            if ch in PAL and 0 <= y < 16:
                img.putpixel((x, y), PAL[ch] + (255,))
    return img


def contorno(img):
    """Contorno escuro de 1 px (vizinhança de 4) em volta de todo pixel opaco."""
    out = img.copy()
    for y in range(16):
        for x in range(16):
            if img.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and img.getpixel((nx, ny))[3] == 255 and img.getpixel((nx, ny))[:3] != OUTLINE:
                        out.putpixel((x, y), OUTLINE + (255,))
                        break
    return out


def halo(img, cores=("w", "k", "c", "W"), raio=2):
    """Brilho suave (alpha baixo) em volta dos pixels de cristal."""
    alvo = {PAL[c] for c in cores}
    base = img.copy()
    pts = [(x, y) for y in range(16) for x in range(16) if img.getpixel((x, y))[3] == 255 and img.getpixel((x, y))[:3] in alvo]
    for y in range(16):
        for x in range(16):
            if base.getpixel((x, y))[3] != 0:
                continue
            d = min((max(abs(x - px), abs(y - py)) for px, py in pts), default=99)
            if d == 1:
                img.putpixel((x, y), (150, 235, 255, 70))
            elif d == 2 and raio >= 2:
                img.putpixel((x, y), (150, 235, 255, 32))
    return img


# metades esquerdas (8 colunas); a direita é espelhada e escurecida
ICONES_MET = {
    # mesmos materiais da armadura vestida: base ardósia azul-violeta (n/N/m), placas pérola, ouro só em borda, gema ciano
    "ausente_helmet": (2, [
        "......Gg",
        "....pppG",
        "...pPpps",
        "..GGGGGG",
        "..noookn",
        "..nooooo",
        "..psnnps",
        "..pstnns",
        "..nnn...",
    ]),
    "ausente_chestplate": (2, [
        "pppn...n",
        "pPpnnppn",
        "psnnnpwk",
        "pnNnnpkc",
        ".nNnnpps",
        ".nnnnnps",
        ".GGGGGkc",
        ".nnnppss",
        "..nnnpss",
        "...nnnnn",
    ]),
    "ausente_leggings": (2, [
        ".GGGGGGG",
        ".nNnnppn",
        ".nnnnpsn",
        ".nnnnppn",
        ".nNnnnn.",
        ".ppsnn..",
        ".psksn..",
        ".ppsnn..",
        ".nNnnn..",
        ".nnnnn..",
        ".GGGGG..",
    ]),
    "ausente_boots": (3, [
        "..GGGG..",
        "..nnNnn.",
        "..npsnn.",
        "..npsnn.",
        "..nnnnn.",
        ".nnNnnn.",
        ".ppsknn.",
        ".ppsssn.",
        ".ooooon.",
    ]),
}

# desenhos completos (16x16); contorno e halo são automáticos
ICONES_FULL = {
    "fragmento_alma": [
        "................",
        "................",
        "......ww........",
        ".....wWwk.......",
        ".....wWwkc......",
        "....uwwwkkc.....",
        "....uwwkkkc.....",
        "....5wkkkcV.....",
        "....5ukkkcV.....",
        ".....5ukkcV.....",
        ".....5ukcVV.....",
        "......5ucV......",
        "......66V.......",
        ".......6........",
        "................",
        "................",
    ],
    "varinha_lamento": [
        "................",
        "..........wk....",
        ".........wWkk...",
        ".........wkkc...",
        "..........wkcc...",
        "..........kc....",
        ".........GgGg...",
        "........hGgg....",
        ".......zyh......",
        "......zxy.......",
        ".....zyx........",
        "....zyx.........",
        "...gzx..........",
        "..GgGg..........",
        "..ghgh..........",
        "................",
    ],
}
ICONES = list(ICONES_MET) + list(ICONES_FULL)


def icone(nome):
    if nome in ICONES_MET:
        y0, linhas = ICONES_MET[nome]
        img = _mapa_para_img(linhas, y0, espelhar=True)
    else:
        img = _mapa_para_img(ICONES_FULL[nome])
    img = contorno(img)
    if nome in ("fragmento_alma", "varinha_lamento"):
        img = halo(img)
    return img


# ---------------------------------------------------------------- camadas de armadura 64x32
# Projeto (ver evento-ecos/02-equipamentos.md): base escura e fria (ardósia azul-violeta) como "roupa de baixo"; placas pequenas de
# pérola/prata só onde há proteção; contorno escuro de 1 px entre placas; luz no canto superior esquerdo (3 tons por placa);
# ouro pálido só em 1 px de borda; gema ciano minúscula. Nada de área lisa > 3x3 e nenhuma faixa larga.
def caixa(u, v, w, h, d):
    """Retângulos UV de uma caixa humanoide (padrão de pele/armadura do jogo)."""
    return {
        "top": (u + d, v), "bottom": (u + d + w, v),
        "right": (u, v + d), "front": (u + d, v + d), "left": (u + d + w, v + d), "back": (u + 2 * d + w, v + d),
    }


CORES = {
    "o": (38, 34, 76),                               # contorno
    "n": (88, 88, 150), "N": (110, 108, 172), "m": (70, 68, 128),   # tecido: base, luz, sombra
    "P": (244, 245, 254), "p": (216, 220, 246), "s": (166, 170, 216), "t": (114, 112, 172),  # pérola: brilho, luz, meio, sombra
    "G": (250, 236, 186), "g": (206, 182, 126), "h": (150, 124, 88),                      # ouro pálido
    "w": (226, 253, 255), "k": (104, 222, 242), "c": (44, 138, 182),                      # gema ciano
}
MATS = {"perola": ("p", "s", "t"), "ouro": ("G", "g", "h"), "gema": ("w", "k", "c")}


class Face:
    def __init__(self, img, x0, y0, w, h):
        self.img, self.x0, self.y0, self.w, self.h = img, x0, y0, w, h
        self.placa = set()

    def px(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.img.putpixel((self.x0 + x, self.y0 + y), CORES[ch] + (255,))

    def tecido(self, y_ini=0, y_fim=None, desloc=0):
        """Tecido quase liso: luz na coluna da esquerda, sombra contínua na da direita e 1 dobra vertical marcada."""
        dobra = (self.w * 5) // 8 if self.w >= 8 else (2 if self.w == 4 else -1)
        for y in range(y_ini, self.h if y_fim is None else y_fim):
            for x in range(self.w):
                self.px(x, y, "N" if x == 0 else "m" if x == self.w - 1 or x == dobra else "n")

    def preencher(self, x, y, w, h, ch):
        for j in range(h):
            for i in range(w):
                self.px(x + i, y + j, ch)

    def forma(self, x, y, linhas, mat="perola"):
        """Placa a partir de máscara ('#'); contorno de 1 px só sobre tecido; luz no canto superior esquerdo."""
        hi, meio, lo = MATS[mat]
        m = {(x + i, y + j) for j, l in enumerate(linhas) for i, ch in enumerate(l) if ch == "#"}
        for (px_, py_) in m:
            for dx, dy in ((1, 0), (0, 1)):   # contorno só no lado da sombra (direita/baixo): define sem escurecer tudo
                q = (px_ + dx, py_ + dy)
                if q not in m and q not in self.placa and 0 <= q[0] < self.w and 0 <= q[1] < self.h:
                    self.px(q[0], q[1], "o")
        for (px_, py_) in m:
            tl = (px_ - 1, py_) not in m or (px_, py_ - 1) not in m
            br = (px_ + 1, py_) not in m or (px_, py_ + 1) not in m
            self.px(px_, py_, hi if tl and not br else lo if br and not tl else meio)
        self.placa |= m
        return m

    def rect(self, x, y, w, h, mat="perola"):
        return self.forma(x, y, ["#" * w] * h, mat)

    def limpar(self, y_ini, y_fim=None):
        for y in range(y_ini, self.h if y_fim is None else y_fim):
            for x in range(self.w):
                self.img.putpixel((self.x0 + x, self.y0 + y), (0, 0, 0, 0))


def _faces(img, u, v, w, h, d):
    return {n: Face(img, x, y, (d if n in ("right", "left") else w), (d if n in ("top", "bottom") else h))
            for n, (x, y) in caixa(u, v, w, h, d).items()}


def _cabeca(img):
    f = _faces(img, 0, 0, 8, 8, 8)
    for fc in f.values():
        fc.tecido()
    # frente: testa de placa (1 px de ouro), viseira escura lisa com 2 olhos de alma, queixeiras
    fr = f["front"]
    fr.rect(0, 0, 8, 2)
    fr.preencher(0, 0, 8, 1, "G")
    fr.preencher(0, 2, 8, 3, "o")
    fr.px(2, 3, "k")
    fr.px(5, 3, "k")
    fr.rect(0, 5, 2, 3)
    fr.rect(6, 5, 2, 3)
    # lado direito: testa + proteção de orelha com gema; lado esquerdo: testa + corrente de ouro com pingente
    d_ = f["right"]
    d_.rect(0, 0, 8, 2)
    d_.preencher(0, 0, 8, 1, "G")
    d_.rect(2, 3, 4, 3)
    d_.px(3, 4, "k")
    e_ = f["left"]
    e_.rect(0, 0, 8, 2)
    e_.preencher(0, 0, 8, 1, "G")
    e_.preencher(2, 3, 1, 3, "G")
    e_.px(2, 6, "k")
    e_.rect(4, 3, 3, 3)
    # costas: testa e nuca
    c = f["back"]
    c.rect(0, 0, 8, 2)
    c.preencher(0, 0, 8, 1, "G")
    c.rect(1, 3, 6, 4)
    c.px(3, 4, "k")
    # topo: crista fina (2 px) com ponta de ouro
    t = f["top"]
    t.forma(3, 0, ["##"] * 8)
    t.preencher(3, 0, 2, 2, "G")
    f["bottom"].preencher(0, 0, 8, 8, "m")
    img.paste(img.crop((0, 0, 32, 16)), (32, 0))


def _corpo(img, camada):
    f = _faces(img, 16, 16, 8, 12, 4)
    if camada == 1:
        for fc in f.values():
            fc.tecido(0, 9)
        fr = f["front"]
        fr.rect(0, 0, 3, 2)
        fr.rect(5, 0, 3, 2)
        fr.rect(3, 1, 2, 6)
        fr.px(3, 2, "w")
        fr.px(4, 2, "k")
        fr.px(3, 3, "k")
        fr.px(4, 3, "c")
        for i in range(3):   # faixa diagonal de ouro (assimetria), curta e contínua, até o cinto
            fr.px(i, 3 + i, "g")
        fr.rect(0, 8, 8, 1, "ouro")
        fr.px(3, 8, "k")
        fr.px(4, 8, "k")
        co = f["back"]
        co.rect(0, 0, 3, 2)
        co.rect(5, 0, 3, 2)
        co.rect(3, 1, 2, 6)
        co.px(3, 3, "k")
        for i in range(3):
            co.px(7 - i, 3 + i, "g")
        co.rect(0, 8, 8, 1, "ouro")
        d_ = f["right"]
        d_.rect(0, 1, 3, 4)
        d_.px(1, 2, "k")
        d_.rect(0, 8, 4, 1, "ouro")
        e_ = f["left"]
        e_.rect(1, 2, 3, 3)
        e_.rect(0, 8, 4, 1, "ouro")
        f["top"].rect(1, 1, 6, 2, "ouro")
        for n in ("front", "back", "right", "left"):
            f[n].limpar(9)
        f["bottom"].limpar(0)
    else:
        # camada 2: só o quadril (por baixo da cintura da camada 1)
        for n in ("front", "back", "right", "left"):
            f[n].tecido(9, 12)
        f["front"].rect(1, 9, 2, 3)
        f["front"].rect(5, 9, 2, 3)
        f["back"].rect(1, 9, 6, 2)
        f["right"].rect(1, 9, 2, 3)
        f["left"].rect(1, 9, 2, 3)
        f["bottom"].preencher(0, 0, 8, 4, "m")


def _braco(img):
    f = _faces(img, 40, 16, 4, 12, 4)
    for fc in f.values():
        fc.tecido()
    ou = f["right"]   # lado de fora: ombreira angular com gema, braçadeira
    ou.forma(0, 0, ["####", "####", "###.", "##.."])
    ou.preencher(0, 0, 4, 1, "G")
    ou.px(1, 1, "k")
    for n in ("front", "back"):
        fc = f[n]
        fc.forma(0, 0, ["####", "####", ".##."])
        fc.preencher(0, 0, 4, 1, "G")
    f["left"].forma(0, 0, ["####", "####"])
    f["left"].preencher(0, 0, 4, 1, "G")
    tp = f["top"]
    tp.rect(0, 0, 4, 4)
    tp.px(1, 1, "k")
    for fc in (ou, f["front"], f["back"], f["left"]):
        fc.preencher(0, 10, 4, 1, "g")
        fc.preencher(0, 11, 4, 1, "m")
    f["bottom"].preencher(0, 0, 4, 4, "o")


def _perna(img, camada):
    f = _faces(img, 0, 16, 4, 12, 4)
    if camada == 1:
        # botas: só da canela para baixo (linhas 6 a 11); o resto fica vazio para a calça aparecer
        for n in ("front", "back", "right", "left"):
            fc = f[n]
            fc.tecido(6, 12)
            fc.preencher(0, 6, 4, 1, "G")
            fc.preencher(0, 11, 4, 1, "o")
        fr = f["front"]
        fr.rect(0, 8, 4, 2)
        fr.px(1, 8, "k")
        f["right"].rect(1, 8, 2, 2)
        f["left"].rect(1, 8, 2, 2)
        f["bottom"].preencher(0, 0, 4, 4, "o")
    else:
        for n in ("front", "back", "right", "left"):
            f[n].tecido()
        fr = f["front"]
        fr.forma(0, 3, [".##.", "####", "####"])
        fr.preencher(1, 3, 2, 1, "G")
        fr.px(1, 4, "k")
        fr.px(2, 4, "k")
        fr.rect(1, 7, 2, 4)
        fr.preencher(1, 7, 2, 1, "g")
        for n in ("right", "left"):
            f[n].rect(1, 3, 2, 3)
            f[n].rect(1, 8, 2, 3)
        f["top"].preencher(0, 0, 4, 4, "m")
        f["bottom"].preencher(0, 0, 4, 4, "m")


def textura_armadura(camada):
    img = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    if camada == 1:
        _cabeca(img)
        _braco(img)
    _corpo(img, camada)
    _perna(img, camada)
    return img


# ---------------------------------------------------------------- definição dos itens
PECAS = [
    # id, slot, proteção, durabilidade (netherita +25%), slot de encantamento, grupo, geometria, variável, camada, fragmentos, padrão
    ("ausente_helmet", "slot.armor.head", 3, 509, "armor_head", "itemGroup.name.helmet", "helmet", "helmet_layer_visible", 1, 5, ["F.F", "FFF"]),
    ("ausente_chestplate", "slot.armor.chest", 8, 740, "armor_torso", "itemGroup.name.chestplate", "chestplate", "chest_layer_visible", 1, 9, ["FFF", "FFF", "FFF"]),
    ("ausente_leggings", "slot.armor.legs", 6, 694, "armor_legs", "itemGroup.name.leggings", "leggings", "leg_layer_visible", 2, 7, ["FFF", "FF.", "F.F"]),
    ("ausente_boots", "slot.armor.feet", 3, 601, "armor_feet", "itemGroup.name.boots", "boots", "boot_layer_visible", 1, 5, [".F.", "F.F", "F.F"]),
]
VARINHA_DUR = 400
VARINHA_PADRAO = [".FF", "FFF", "FFF"]

NOMES = {
    "fragmento_alma": ("Fragmento de Alma", "Soul Fragment", "Um eco solidificado de quem partiu.", "A solidified echo of those who left."),
    "ausente_helmet": ("Elmo dos Ausentes", "Helm of the Absent", "Conjunto Passo dos Ausentes.", "Step of the Absent set."),
    "ausente_chestplate": ("Peitoral dos Ausentes", "Chestplate of the Absent", "Conjunto Passo dos Ausentes.", "Step of the Absent set."),
    "ausente_leggings": ("Calças dos Ausentes", "Leggings of the Absent", "Conjunto Passo dos Ausentes.", "Step of the Absent set."),
    "ausente_boots": ("Botas dos Ausentes", "Boots of the Absent", "Conjunto Passo dos Ausentes.", "Step of the Absent set."),
    "varinha_lamento": ("Varinha Lamento", "Wand of Lament", "Dispara um raio espectral.", "Fires a spectral beam."),
}


def item_base(nome, extra, categoria="equipment", grupo=None):
    d = {"identifier": f"vulpus:{nome}", "menu_category": {"category": categoria}}
    if False and grupo:  # o BDS exigia namespace no group; sem group (ver commit 1afe20e)
        d["menu_category"]["group"] = grupo
    comp = {
        "minecraft:icon": {"textures": {"default": f"vulpus_{nome}"}},
        "minecraft:display_name": {"value": f"item.vulpus:{nome}.name"},
    }
    comp.update(extra)
    return {"format_version": "1.21.60", "minecraft:item": {"description": d, "components": comp}}


def main():
    # ícones e camadas
    for nome in ICONES:
        png(os.path.join(RP, ITENS_TEX, nome + ".png"), icone(nome))
    png(os.path.join(RP, ARMADURA_TEX, "ausente_1.png"), textura_armadura(1))
    png(os.path.join(RP, ARMADURA_TEX, "ausente_2.png"), textura_armadura(2))

    # itens
    salvar_json(os.path.join(BP, "items", "fragmento_alma.json"), item_base("fragmento_alma", {
        "minecraft:max_stack_size": 64,
        "minecraft:glint": True,
    }, "items"))
    salvar_json(os.path.join(BP, "items", "varinha_lamento.json"), item_base("varinha_lamento", {
        "minecraft:max_stack_size": 1,
        "minecraft:glint": True,
        "minecraft:hand_equipped": True,
        "minecraft:use_modifiers": {"use_duration": 3600, "movement_modifier": 1.0},
        "minecraft:durability": {"max_durability": VARINHA_DUR},
        "minecraft:damage": 1,
        "minecraft:repairable": {"repair_items": [{"items": ["vulpus:fragmento_alma"], "repair_amount": "query.max_durability * 0.25"}]},
        "minecraft:tags": {"tags": ["vulpus:ecos_varinha"]},
    }, "equipment", "itemGroup.name.sword"))
    for (nome, slot, prot, dur, ench, grupo, geo, var, camada, qtd, padrao) in PECAS:
        salvar_json(os.path.join(BP, "items", nome + ".json"), item_base(nome, {
            "minecraft:max_stack_size": 1,
            "minecraft:glint": True,
            "minecraft:wearable": {"slot": slot, "protection": prot},
            "minecraft:durability": {"max_durability": dur},
            "minecraft:enchantable": {"slot": ench, "value": 15},
            "minecraft:repairable": {"repair_items": [{"items": ["vulpus:fragmento_alma"], "repair_amount": "query.max_durability * 0.25"}]},
            "minecraft:tags": {"tags": ["minecraft:is_armor", "vulpus:ecos_conjunto"]},
        }, "equipment", grupo))
        # attachable (geometria vanilla de armadura)
        salvar_json(os.path.join(RP, "attachables", nome + ".json"), {
            "format_version": "1.10.0",
            "minecraft:attachable": {
                "description": {
                    "identifier": f"vulpus:{nome}",
                    "materials": {"default": "armor", "enchanted": "armor_enchanted"},
                    "textures": {"default": f"{ARMADURA_TEX}/ausente_{camada}", "enchanted": "textures/misc/enchanted_actor_glint"},
                    "geometry": {"default": f"geometry.humanoid.armor.{geo}"},
                    "scripts": {"parent_setup": f"variable.{var} = 0.0;"},
                    "render_controllers": ["controller.render.armor"],
                }
            },
        })
        salvar_json(os.path.join(BP, "recipes", f"{nome}.json"), receita(nome, padrao))
    salvar_json(os.path.join(BP, "recipes", "varinha_lamento.json"), receita("varinha_lamento", VARINHA_PADRAO))

    # item_texture.json
    caminho = os.path.join(RP, "textures", "item_texture.json")
    with open(caminho, encoding="utf-8") as f:
        tex = json.load(f)
    for nome in ICONES:
        tex["texture_data"][f"vulpus_{nome}"] = {"textures": f"{ITENS_TEX}/{nome}"}
    salvar_json(caminho, tex)

    # .lang
    for arq, i_nome, i_desc in (("pt_BR.lang", 0, 2), ("en_US.lang", 1, 3)):
        caminho = os.path.join(RP, "texts", arq)
        with open(caminho, encoding="utf-8") as f:
            linhas = [l for l in f.read().splitlines() if not l.startswith("item.vulpus:fragmento_alma") and not l.startswith("item.vulpus:ausente_") and not l.startswith("item.vulpus:varinha_lamento")]
        for nome, t in NOMES.items():
            linhas.append(f"item.vulpus:{nome}.name=§d{t[i_nome]}")
        with open(caminho, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(linhas) + "\n")
    print("ok")


def receita(nome, padrao):
    qtd = sum(l.count("F") for l in padrao)
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"vulpus:{nome}"},
            "tags": ["crafting_table"],
            "pattern": [l.replace(".", " ") for l in padrao],
            "key": {"F": {"item": "vulpus:fragmento_alma"}},
            "unlock": [{"item": "vulpus:fragmento_alma"}],
            "result": {"item": f"vulpus:{nome}", "count": 1},
        },
    }


if __name__ == "__main__":
    main()
