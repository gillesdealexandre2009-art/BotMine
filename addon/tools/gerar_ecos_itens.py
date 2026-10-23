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
}
# tom mais escuro para a metade direita (a luz vem do canto superior esquerdo)
ESCURECE = {"l": "p", "p": "s", "s": "t", "G": "g", "g": "h", "u": "v", "v": "V", "z": "y", "y": "x", "5": "6"}
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
    "ausente_helmet": (2, [
        "......Gg",
        "....llGg",
        "...lllGg",
        "..llppGg",
        "..GGGgwk",
        "..lpsoVV",
        "..lpsoVk",
        "..lssoVV",
        "..lssoVV",
        "...ssooo",
    ]),
    "ausente_chestplate": (2, [
        ".llppp..",
        ".llppsGg",
        "llllppsG",
        "llppopGw",
        "lppsopGk",
        "ppssoGkc",
        "ppssopsg",
        "GGggoGGg",
        "....opss",
        "....ssst",
    ]),
    "ausente_leggings": (2, [
        ".GGGGGwk",
        ".llppssp",
        ".lppsssp",
        ".lppssp.",
        ".lpssp..",
        ".lGGgGp.",
        ".lpssp..",
        ".lpssp..",
        ".lpssp..",
        ".ussvp..",
        ".GGgggg.",
    ]),
    "ausente_boots": (3, [
        "..GGGG..",
        "..lppsv.",
        "..lpksv.",
        "..lpssv.",
        "..lpssv.",
        ".llppsv.",
        ".lppssV.",
        ".lGGgGv.",
        ".VVVVVV.",
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
def caixa(u, v, w, h, d):
    """Retângulos UV de uma caixa humanoide (padrão de pele/armadura do jogo)."""
    return {
        "top": (u + d, v), "bottom": (u + d + w, v),
        "right": (u, v + d), "front": (u + d, v + d), "left": (u + d + w, v + d), "back": (u + 2 * d + w, v + d),
    }


def _pintar(img, x, y, linhas):
    for dy, linha in enumerate(linhas):
        for dx, ch in enumerate(linha):
            if ch in PAL:
                img.putpixel((x + dx, y + dy), PAL[ch] + (255,))


def _espelha(linhas):
    return ["".join(ESCURECE.get(c, c) for c in reversed(l)) for l in linhas]


def _caixa_pintar(img, u, v, w, h, d, faces):
    pos = caixa(u, v, w, h, d)
    for nome, linhas in faces.items():
        _pintar(img, pos[nome][0], pos[nome][1], linhas)


def _cabeca(img):
    topo = ["slpGgpst", "pllGgllp", "plpGgplp", "plpGgplp", "plpGgplp", "plpGgplp", "pllGgllp", "spsGgsst"]
    frente = ["llllllps", "lppppsss", "GGGwkGGg", "lp.kc.sp", "lp.Gg.sp", "ls.Gg.st", "ps....st", "........"]
    lado = ["pllllllp", "psppppps", "GGGGGGGG", "vvvppppp", "vVvvppps", "vVvVppss", "uvVvpss.", "gGgGgGg."]
    costas = ["pllllllp", "ppppppps", "GGGGGGGG", "uvvVvvVV", "uvvVvvVV", "vvVVvVVV", "VvVVVVVt", "gGg.gGg."]
    fundo = ["VVVVVVVV"] * 8
    _caixa_pintar(img, 0, 0, 8, 8, 8, {"top": topo, "bottom": fundo, "right": lado, "front": frente, "left": _espelha(lado), "back": costas})
    img.paste(img.crop((0, 0, 32, 16)), (32, 0))


def _corpo(img, camada):
    cloth = ["uvvGgvVV", "uvvGgvVV", "vvVGgVVV", "vvVggVVV", "VVVtVVtt"]
    if camada == 1:
        frente = ["lGGGGGGs", "lppGGpss", "lpGwkGss", "lpGkcGss", "lppGGpss", "lppppsst", "GgGggGgh"] + cloth
        costas = ["lGGGGGGs", "lppGgpss", "lppGgpss", "lppkcpss", "lppGgpss", "lppppsst", "GgGggGgh"] + cloth
        lado = ["lGGs", "lpps", "lpps", "lpps", "lpps", "lpss", "GgGh", "vuvV", "uvvV", "vvuV", "vVvV", "VvVV"]
        topo = ["pGGGGGGs", "puvvvvVs", "pvVVVVvs", "pppppsss"]
    else:
        vazio = ["........"] * 7
        frente = vazio + ["lGGwkGGs", "lpGkcGss", "lppGGpss", "lpvuVvss", "uvVvvVvV"]
        costas = vazio + ["lGGGgGGs", "lppGgpss", "lppGgpss", "lpvuVvss", "uvVvvVvV"]
        lado = ["...."] * 7 + ["GgGg", "lpps", "lpps", "lvvV", "uvvV"]
        topo = ["........"] * 4
    _caixa_pintar(img, 16, 16, 8, 12, 4, {
        "top": topo, "bottom": ["VvVvVvVv"] * 4, "right": lado, "front": frente, "left": _espelha(lado), "back": costas,
    })


def _braco(img):
    frente = ["lpps", "lpps", "lpss", "GgGg", "uvvV", "uvvV", "vvVV", "vvVV", "lpps", "lpss", "GgGg", "gghh"]
    fora = list(frente)
    fora[1] = "lwks"
    fora[2] = "lkcs"
    _caixa_pintar(img, 40, 16, 4, 12, 4, {
        "top": ["llps", "lpps", "ppss", "psst"], "bottom": ["GgGg", "gggg", "gghh", "hhhh"],
        "right": fora, "front": frente, "left": _espelha(frente), "back": _espelha(frente),
    })


def _perna(img, camada):
    if camada == 1:
        v = ["...."] * 6
        frente = v + ["uvvV", "GgGg", "lpps", "lwks", "llps", "VVVV"]
        outro = v + ["uvvV", "GgGg", "lpps", "lpss", "lpss", "VVVV"]
        topo = ["...."] * 4
        fundo = ["vVVV", "VVVV", "VVVV", "VVVt"]
    else:
        frente = ["lpps", "lpps", "lpss", "lpss", "GgGg", "lpps", "lwks", "lpss", "GgGg", "uvvV", "uvvV", "vvVV"]
        outro = list(frente)
        outro[5] = "lpss"
        topo = ["lppp", "lpps", "ppss", "psst"]
        fundo = ["VVVV"] * 4
    _caixa_pintar(img, 0, 16, 4, 12, 4, {
        "top": topo, "bottom": fundo, "right": outro, "front": frente, "left": _espelha(outro), "back": _espelha(outro),
    })


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
