"""Gera os itens permanentes do evento Ecos dos Ausentes: ícones, camadas de armadura, itens, attachables, receitas, item_texture e .lang.

Uso: python tools/gerar_ecos_itens.py   (idempotente: pode rodar de novo)
IDs permanentes, nunca renomear: vulpus:fragmento_alma, vulpus:ausente_{helmet,chestplate,leggings,boots}, vulpus:varinha_lamento.
"""
import json
import os
import random

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
BP = os.path.join(RAIZ, "vulpus_bp")
RP = os.path.join(RAIZ, "vulpus_rp")

ITENS_TEX = "textures/vulpus/itens"
ARMADURA_TEX = "textures/models/armor"

# Paleta névoa / prata / azul-lilás
SOMBRA = (58, 52, 104)
BASE = (122, 118, 190)
MEIO = (170, 168, 226)
CLARO = (214, 220, 248)
BRILHO = (150, 214, 255)
BRANCO = (244, 248, 255)


def salvar_json(caminho, dado):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        json.dump(dado, f, ensure_ascii=False, indent=2)
        f.write("\n")


def png(caminho, img):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    img.save(caminho)


# ---------------------------------------------------------------- ícones 16x16
def desenhar(mapa, cores):
    """mapa: 16 strings de 16 chars; cores: char -> RGB."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, linha in enumerate(mapa):
        for x, ch in enumerate(linha):
            if ch in cores:
                img.putpixel((x, y), cores[ch] + (255,))
    return img


CORES = {"o": SOMBRA, "b": BASE, "m": MEIO, "c": CLARO, "g": BRILHO, "w": BRANCO}

ICONES = {
    "fragmento_alma": [
        "................",
        ".......gg.......",
        "......gwwg......",
        ".....gwccwg.....",
        ".....owcmco.....",
        "....obwcmmbo....",
        "....obcmmbbo....",
        "....obcmbbso....".replace("s", "o"),
        ".....obmbbo.....",
        ".....obbbbo.....",
        "......obbo......",
        "......oboo......",
        ".......oo.......",
        "..g.........g...",
        "................",
        "................",
    ],
    "ausente_helmet": [
        "................",
        "................",
        "....oooooooo....",
        "...obmmccmmbo...",
        "..obmccwwccmbo..",
        "..obmcmmmmcmbo..",
        "..obmmbbbbmmbo..",
        "..obbo....obbo..",
        "..obbo....obbo..",
        "..oooo....oooo..",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
    "ausente_chestplate": [
        "................",
        "..ooo......ooo..",
        ".obmmo....ommbo.",
        ".obmcmoooomcmbo.",
        ".obmcmbbbbmcmbo.",
        ".oobmcmmmmcmboo.",
        "..obmcgwwgcmbo..",
        "..obmcmwwmcmbo..",
        "..obmmcmmcmmbo..",
        "..obbmmccmmbbo..",
        "..obbbmmmmbbbo..",
        "..oobbbbbbbboo..",
        "...oooooooooo...",
        "................",
        "................",
        "................",
    ],
    "ausente_leggings": [
        "................",
        "...oooooooooo...",
        "..obmmccccmmbo..",
        "..obmcmmmmcmbo..",
        "..obmmbbbbmmbo..",
        "..obmcbooobcmo..".replace("o..", "b.."),
        "..obmco..ocmbo..",
        "..obmbo..obmbo..",
        "..obmbo..obmbo..",
        "..obmbo..obmbo..",
        "..obbbo..obbbo..",
        "..oooo....oooo..",
        "................",
        "................",
        "................",
        "................",
    ],
    "ausente_boots": [
        "................",
        "................",
        "................",
        "................",
        "...ooo....ooo...",
        "..obmbo..obmbo..",
        "..obmbo..obmbo..",
        "..obmbo..obmbo..",
        ".obmmbo..obmmbo.",
        ".obcmmbo.obcmmbo",
        ".obbbbbo.obbbbbo",
        ".ooooooo.ooooooo",
        "................",
        "................",
        "................",
        "................",
    ],
    "varinha_lamento": [
        "..............gg",
        ".............gwwg",
        "............gwccg",
        "...........gwcmg.",
        "..........ogwcg..",
        ".........obmoo...",
        "........obmo.....",
        ".......obmo......",
        "......obmo.......",
        ".....obmo........",
        "....obmo.........",
        "...obmo..........",
        "..obmo...........",
        ".obbo............",
        ".ooo............",
        "................",
    ],
}


def icone(nome):
    mapa = [(l + "." * 16)[:16] for l in ICONES[nome]]
    return desenhar(mapa, CORES)


# ---------------------------------------------------------------- camadas de armadura 64x32
def textura_armadura(camada):
    rnd = random.Random(7 + camada)
    img = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    regioes = [(0, 0, 64, 16), (0, 16, 64, 32)] if camada == 1 else [(0, 16, 40, 32)]
    for (x0, y0, x1, y1) in regioes:
        for y in range(y0, y1):
            for x in range(x0, x1):
                # faixas diagonais suaves de névoa, com ruído
                t = ((x * 3 + y * 5) % 17) / 17.0
                ruido = rnd.random() * 0.25
                v = t * 0.6 + ruido
                if v < 0.25:
                    cor = SOMBRA
                elif v < 0.5:
                    cor = BASE
                elif v < 0.72:
                    cor = MEIO
                else:
                    cor = CLARO
                # contorno de cada "placa" de 8 px
                if x % 8 == 0 or y % 8 == 0:
                    cor = SOMBRA
                elif x % 8 == 1 and y % 8 == 1:
                    cor = BRANCO
                img.putpixel((x, y), cor + (255,))
        # pontos de brilho azul
        for _ in range((x1 - x0) * (y1 - y0) // 40):
            x = rnd.randrange(x0, x1)
            y = rnd.randrange(y0, y1)
            img.putpixel((x, y), BRILHO + (255,))
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
    if grupo:
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
