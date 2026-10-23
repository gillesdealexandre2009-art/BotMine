#!/usr/bin/env python3
"""Gera as criaturas do evento "Ecos dos Ausentes": texturas (Pillow, geradas por script) e as definições de entidade (BP e RP).

Usa geometria e animações do próprio jogo (zombie e skeleton), só com texturas novas. Comportamento simples: perseguir e bater
corpo a corpo. Sem explosão, sem quebrar blocos, sem soltar item e sem XP (tabela de loot vazia): o fragmento de alma só vem dos
objetivos (sistemas/ecos.js). Quem as faz aparecer é o script, em pontos marcados pela staff.

Uso, a partir da pasta addon/:
    python tools/gerar_ecos_criaturas.py

Saída:
- vulpus_rp/textures/vulpus/entidades/ecos_<nome>.png
- vulpus_rp/entity/ecos_<nome>.entity.json (cliente)
- vulpus_bp/entities/ecos_<nome>.json (servidor)
- vulpus_bp/loot_tables/vulpus/ecos_vazio.json
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"

# nome: (geometria do jogo, largura x altura da textura, escala, render controller, vida, dano, velocidade, alcance, paleta, olhos, detalhe)
CRIATURAS = {
    "errante": dict(
        geo="geometry.zombie.v1.8", tex=(64, 64), escala=1.0, brilho=False, vida=20, dano=3, vel=0.23, alcance=24,
        base=[(58, 66, 82), (66, 76, 94), (50, 58, 74), (72, 82, 100)], olhos=(150, 235, 255), detalhe=(110, 130, 160),
        nome="Eco Errante",
    ),
    "sentinela": dict(
        geo="geometry.skeleton.v1.8", tex=(64, 32), escala=1.2, brilho=False, vida=60, dano=5, vel=0.25, alcance=28,
        base=[(176, 170, 150), (160, 154, 134), (190, 184, 164), (140, 134, 118)], olhos=(120, 230, 255), detalhe=(255, 170, 60),
        nome="Sentinela da Cripta",
    ),
    "memoria": dict(
        geo="geometry.zombie.v1.8", tex=(64, 64), escala=1.05, brilho=True, vida=80, dano=5, vel=0.27, alcance=28,
        base=[(150, 110, 190), (130, 100, 180), (170, 130, 205), (110, 90, 165)], olhos=(255, 245, 190), detalhe=(240, 190, 255),
        nome="Memória Partida",
    ),
    "testemunho": dict(
        geo="geometry.zombie.v1.8", tex=(64, 64), escala=2.2, brilho=True, vida=300, dano=8, vel=0.22, alcance=40,
        base=[(30, 28, 34), (38, 34, 42), (24, 22, 28), (46, 40, 50)], olhos=(255, 205, 80), detalhe=(255, 190, 70),
        nome="O Último Testemunho",
    ),
}

ANIMACOES = {
    "base_pose": "animation.humanoid.base_pose",
    "look_at_target": "animation.humanoid.look_at_target.default",
    "move": "animation.humanoid.move.v1.0",
    "attack": "animation.humanoid.attack.rotations",
}


# ---------------------------------------------------------------- arte das skins (pixel a pixel, sem ruído)
def _caixa_uv(u, v, w, h, d):
    """Origem UV e tamanho de cada face de uma caixa (padrão de pele humanoide do jogo)."""
    return {
        "top": (u + d, v, w, d), "bottom": (u + d + w, v, w, d),
        "right": (u, v + d, d, h), "front": (u + d, v + d, w, h),
        "left": (u + d + w, v + d, d, h), "back": (u + 2 * d + w, v + d, w, h),
    }


def _flip(linhas):
    return [l[::-1] for l in linhas]


class Pele:
    def __init__(self, w, h, paleta):
        self.img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.pal = paleta

    def caixa(self, u, v, w, h, d, faces):
        pos = _caixa_uv(u, v, w, h, d)
        for nome, linhas in faces.items():
            x0, y0, fw, fh = pos[nome]
            assert len(linhas) == fh and all(len(l) == fw for l in linhas), (nome, fw, fh, linhas)
            for fy, l in enumerate(linhas):
                for fx, ch in enumerate(l):
                    if ch in self.pal:
                        c = self.pal[ch]
                        self.img.putpixel((x0 + fx, y0 + fy), c if len(c) == 4 else c + (255,))

    def copiar(self, caixa_orig, destino):
        self.img.paste(self.img.crop(caixa_orig), destino)


# ---- Errante: espírito de manto esfarrapado cinza-lavanda, capuz escuro, rosto vazio, dois olhos ciano
PAL_ERRANTE = {
    "d": (34, 32, 54), "h": (54, 52, 80), "H": (88, 84, 120), "v": (14, 12, 24), "V": (30, 26, 48),
    "e": (214, 254, 255), "f": (84, 190, 220),
    "r": (104, 100, 138), "R": (138, 134, 172), "s": (72, 68, 104), "q": (50, 48, 80), "b": (152, 148, 186),
    "F": (186, 182, 214), "P": (224, 222, 242), "p": (172, 170, 202), "c": (124, 214, 238),
}


def errante():
    p = Pele(64, 64, PAL_ERRANTE)
    lado = ["dHHHHHHd", "hhhhhhhH", "hhdhhhhH", "hhdhhdhH", "hhdhhdhH", "hhdhhdhH", "hdhhhdhH", "ddhhddhh"]
    p.caixa(0, 0, 8, 8, 8, {
        "top": ["dhhhhhhd", "hHHHHHHh", "hHHhhHHh", "hHhhhhHh", "hHhhhhHh", "hHHhhHHh", "hHHHHHHh", "dhhhhhhd"],
        "bottom": ["dddddddd"] * 8,
        "front": ["dHHHHHHd", "HhVvvVhh", "HVvvvvVh", "HVvvvvVh", "HVevveVh", "HVfvvfVh", "HhVvvVhd", "dhhVVhhd"],
        "right": lado, "left": _flip(lado),
        "back": ["dHHHHHHd", "hhhhdhhh", "hhhhdhhh", "hdhhdhdh", "hdhhdhdh", "hdhhdhdh", "hdhhhhdh", "dddhhddd"],
    })
    p.caixa(16, 16, 8, 12, 4, {
        "top": ["hhhhhhhh", "RRRRRRRR", "Rrrrrrrr", "ssssssss"],
        "bottom": ["qqqqqqqq"] * 4,
        "front": ["RRRRrrrs", "Rrrrrrrs", "Rrrrrrrs", "Rrrccrrs", "Rrsrrsrs", "Rrsrrsrs", "bbbqqbbb", "Rrsrrsrs",
                  "Rrsrrsss", "Rrsrrsss", "rrsrrsss", "ssqssqqq"],
        "right": ["RRrs", "Rrrs", "Rrsr", "Rrsr", "Rrsr", "Rrsr", "bbbb", "Rrsr", "Rrss", "Rrss", "rrss", "ssqq"],
        "left": ["srrR", "srrR", "rsrR", "rsrR", "rsrR", "rsrR", "bbbb", "rsrR", "ssrR", "ssrR", "ssrr", "qqss"],
        "back": ["hhhhhhhh", "hddhhddh", "rrsrrsrr", "rrsrrsrr", "rsrrrrsr", "rsrrrrsr", "bbbqqbbb", "rrsrrsrr",
                 "rsrrrrsr", "rsrrrrsr", "rrsrrsrr", "sqssqsqs"],
    })
    braco = ["RRrr", "Rrrs", "Rrrs", "Rrss", "Rrss", "Rrss", "rrss", "rrss", "FrFs", "PPPp", "PPpp", "pppp"]
    p.caixa(40, 16, 4, 12, 4, {
        "top": ["RRRR", "Rrrr", "rrrs", "ssss"], "bottom": ["PPPP", "PPPp", "PPpp", "pppp"],
        "front": braco, "right": [l.replace("FrFs", "FFrs") for l in braco],
        "left": [l.replace("FrFs", "sFrF") for l in _flip(braco)], "back": [l.replace("FrFs", "FsFF") for l in braco],
    })
    perna = {
        "top": ["ssss"] * 4, "bottom": ["qqqq"] * 4,
        "front": ["Rrrs"] * 8 + ["srrr", "FrrF", "FFrF", "F.F."],
        "right": ["Rrrs"] * 8 + ["srrr", "rFrr", "FrFF", ".FF."],
        "left": ["srrR"] * 8 + ["rrrs", "rrFr", "FFrF", "FF.F"],
        "back": ["rsrr"] * 8 + ["rrsr", "FrrF", "rFFr", "F.FF"],
    }
    p.caixa(0, 16, 4, 12, 4, perna)
    p.copiar((40, 16, 56, 32), (32, 48))
    p.copiar((0, 16, 16, 32), (16, 48))
    return p.img


# ---- Sentinela da Cripta: armadura antiga de ardósia azulada, juntas douradas pálidas, runas ciano, elmo fechado
PAL_SENT = {
    "s": (38, 48, 72), "a": (66, 82, 114), "b": (98, 118, 152), "B": (140, 160, 192), "v": (22, 28, 46),
    "G": (246, 230, 170), "g": (206, 182, 124), "h": (140, 118, 78),
    "c": (50, 150, 190), "k": (120, 228, 248), "w": (224, 254, 255),
}
_ESC = {"B": "b", "b": "a", "a": "s", "G": "g", "g": "h"}


def _esc(linhas):
    return ["".join(_ESC.get(c, c) for c in l) for l in linhas]


def sentinela():
    p = Pele(64, 32, PAL_SENT)
    lado = ["BBbbbbba", "baaaaaaa", "GGGGGGGh", "baaaaaas", "aaaaaakc", "baaaaaas", "aaBaaasa", "saaaassa"]
    p.caixa(0, 0, 8, 8, 8, {
        "top": ["abbbbbbs", "abbGgbbs", "abbGgbbs", "abbGgbbs", "abbGgbbs", "abbGgbbs", "abbGgbbs", "assGgsss"],
        "bottom": ["ssssssss"] * 8,
        "front": ["BBbbbbab", "bbaaaaas", "GGGGGggh", "asvvvvsa", "akkwwkka", "asvvvvsa", "absasbas", "sasssass"],
        "right": lado, "left": _flip(_esc(lado)),
        "back": ["BBbbbbab", "bbaaaaas", "GGGGGggh", "aaabbaas", "aaabbaas", "aaackaas", "aaabbaas", "saaassas"],
    })
    cs = ["BbbbbbaS", "GgGGGGgh", "abaccasa", "abckkcsa", "abkwwksa", "abckkcsa", "abaccasa", "bbbaaaas",
          "bssssssa", "baaaaaas", "GGgkkgGh", "ssassass"]
    lado_c = ["Bbba", "GggH", "baas", "baas", "baas", "baas", "baas", "baas", "bsss", "baas", "GgGh", "ssas"]
    p.caixa(16, 16, 8, 12, 4, {
        "top": ["BbbbbbbS", "GGGGGGGh", "baaaaaas", "sssssssa"], "bottom": ["ssssssss"] * 4,
        "front": cs, "right": lado_c, "left": _flip(_esc(lado_c)),
        "back": ["BbbbbbaS", "GgGGGGgh", "aaabbaas", "aaabbaas", "aaackaas", "aaabbaas", "aaabbaas", "bbbaaaas",
                 "bssssssa", "baaaaaas", "GGgggggh", "ssassass"],
    })
    braco = ["Bb", "GG", "ba", "ba", "aa", "Gg", "ba", "ba", "aa", "hg", "bs", "ss"]
    p.caixa(40, 16, 2, 12, 2, {
        "top": ["Bb", "bb"], "bottom": ["ss", "ss"], "front": braco, "right": _esc(braco), "left": _esc(_esc(braco)), "back": _esc(braco),
    })
    perna = ["ba", "ba", "aa", "aa", "ba", "Gk", "ba", "aa", "aa", "hg", "ss", "ss"]
    p.caixa(0, 16, 2, 12, 2, {
        "top": ["bb", "bb"], "bottom": ["ss", "ss"], "front": perna, "right": _esc(perna), "left": _esc(_esc(perna)), "back": _esc(perna),
    })
    return p.img


# ---- Memória Partida: figura clara de pérola e lilás, rosto triste, vela acesa, faixas deslocadas e fendas
PAL_MEM = {
    "M": (244, 240, 255), "m": (212, 204, 246), "n": (176, 158, 224), "N": (146, 126, 202), "L": (194, 164, 238),
    "e": (92, 80, 146), "t": (184, 238, 255),
    "C": (255, 246, 222), "D": (232, 218, 188), "y": (255, 214, 96), "Y": (255, 246, 176),
}


def memoria():
    p = Pele(64, 64, PAL_MEM)
    lado = ["MMMMMMMm", "mmmmmmmm", "mmmmmmmn", "mmmmmmmn", "LLLLmmmm", "mmmmLLLL", "mmmmmmmn", "nnnmmmmn"]
    p.caixa(0, 0, 8, 8, 8, {
        "top": ["MMMMMMMM", "MMMmmMMM", "MMmmmmMM", "MMmmmmMM", "MMmmmmMM", "MMmmmmMM", "MMMmmMMM", "MMMMMMMM"],
        "bottom": ["nnnnnnnn"] * 8,
        "front": ["MMMMMMMm", "MmmmmmmN", "mmNmmNmm", "mNmmmmNm", "mmemmemm", "mmemmemm", "mmtmmmmm", "mmmeemmm"],
        "right": lado, "left": _flip(lado),
        "back": ["MMMMMMMm", "Mmmmmmmn", "mmmmmmmn", "mmmmmmmn", "LLLLLmmm", "mmmLLLLL", "mmmmmmmn", "nnnnnnnn"],
    })
    p.caixa(16, 16, 8, 12, 4, {
        "top": ["MMMMMMMM", "MMmmmmMM", "MmmmmmmM", "mmmmmmmm"], "bottom": ["LLLLLLLL"] * 4,
        "front": ["MMMMMMmm", "MmmmmmmN", "mmmYmmmn", "mmmymmmn", "mmmCDmmn", "mmmCDmmn", "mmmCDmmN", "........",
                  "LnmmmmmN", "nmmmmmMN", "LnmmmmmN", "nnmmmmnN"],
        "right": ["MMMm", "mmmn", "mmmn", "mmmn", "mmmn", "mmmn", "mmmn", "....", "Lmmn", "nmmn", "Lmmn", "nnmn"],
        "left": ["mMMM", "nmmm", "nmmm", "nmmm", "nmmm", "nmmm", "nmmm", "....", "nmmL", "nmmn", "nmmL", "nmnn"],
        "back": ["MMMMMMmm", "Mmmmmmmn", "mmmmmmmn", "mmmmmmmn", "mmmnnmmn", "mmmnnmmn", "mmmmmmmn", "........",
                 "LnmmmmmN", "nmmmmmMN", "LnmmmmmN", "nnmmmmnN"],
    })
    braco = ["MMmm", "Mmmn", "Mmmn", "Mmmn", "mmmn", "mmmn", "....", "LLLn", "MMMm", "MMmm", "MMmm", "Mmmm"]
    p.caixa(40, 16, 4, 12, 4, {
        "top": ["MMMM", "Mmmm", "mmmn", "nnnn"], "bottom": ["MMMM", "MMMm", "MMmm", "mmmm"],
        "front": braco, "right": braco, "left": _flip(braco), "back": [l.replace("LLLn", "nLLL") for l in braco],
    })
    perna = {
        "top": ["nnnn"] * 4, "bottom": ["LLLL"] * 4,
        "front": ["Mmmn", "Mmmn", "Mmmn", "Mmmn", "nnnn", "LLLL", "LLLn", "LLmn", "LLmn", "LLmn", "LmLn", "L.L."],
        "right": ["Mmmn", "Mmmn", "Mmmn", "Mmmn", "nnnn", "LLLL", "LLLn", "LLmn", "LLmn", "LLmn", "LmLn", ".L.L"],
        "left": ["nmmM", "nmmM", "nmmM", "nmmM", "nnnn", "LLLL", "nLLL", "nmLL", "nmLL", "nmLL", "nLmL", "L.L."],
        "back": ["mmmn", "mmmn", "mmmn", "mmmn", "nnnn", "LLLL", "LLLn", "LLmn", "LLmn", "LLmn", "LmLn", ".LL."],
    }
    p.caixa(0, 16, 4, 12, 4, perna)
    p.copiar((40, 16, 56, 32), (32, 48))
    p.copiar((0, 16, 16, 32), (16, 48))
    return p.img


# ---- Último Testemunho: manto branco-pérola cheio de velas, rosto sem boca, olhos dourados mansos, aura azul pálida
PAL_TEST = {
    "W": (250, 246, 255), "w": (232, 228, 250), "u": (206, 206, 240), "U": (170, 178, 226),
    "A": (170, 208, 255), "a": (214, 232, 255),
    "G": (255, 214, 110), "H": (255, 238, 170), "g": (222, 186, 102),
    "C": (238, 222, 190), "D": (206, 186, 150), "y": (255, 198, 60), "Y": (255, 240, 150),
}


def testemunho():
    p = Pele(64, 64, PAL_TEST)
    lado = ["AuwwwwuA", "AgGGGGGg", "wWWWWWWw", "wWWWWWWw", "wWWWWWWu", "wWWWWWWw", "wWWWWWWw", "AwwWWwwA"]
    p.caixa(0, 0, 8, 8, 8, {
        "top": ["AwwwwwwA", "wWWWWWWw", "wWWWWWWw", "wWWgGWWw", "wWWGgWWw", "wWWWWWWw", "wWWWWWWw", "AwwwwwwA"],
        "bottom": ["uuuuuuuu"] * 8,
        "front": ["AuwwwwuA", "AgGHHGgA", "wWWWWWWw", "wuuWWuuw", "uGGuuGGu", "uHGuuGHu", "wWWWWWWw", "AwwWWwwA"],
        "right": lado, "left": _flip(lado),
        "back": ["AuwwwwuA", "AgGGGGgA", "wWWWWWWw", "wWWWWWWw", "wWWuuWWw", "wWWWWWWw", "wWWWWWWw", "AuuWWuuA"],
    })
    p.caixa(16, 16, 8, 12, 4, {
        "top": ["AwwwwwwA", "wgGGGGgw", "wWWWWWWw", "uuuuuuuu"], "bottom": ["uuuuuuuu"] * 4,
        "front": ["AwwWWwwA", "wgGGGGgw", "AWWWWWWA", "AWWGGWWA", "AWGHHGWA", "AWWGGWWA", "aWuWWuWa", "aWuWWuWa",
                  "WyWWWyWW", "CDWyWCDW", "CDWCDCDW", "gggggggg"],
        "right": ["AwwW", "wgGg", "AWWW", "AWWW", "AWWW", "AWWu", "AWuW", "aWuW", "WyWW", "WCDW", "WCDW", "gggg"],
        "left": ["WwwA", "gGgw", "WWWA", "WWWA", "WWWA", "uWWA", "WuWA", "WuWa", "WWyW", "WDCW", "WDCW", "gggg"],
        "back": ["AwwWWwwA", "wgGGGGgw", "AWWWWWWA", "AWWGGWWA", "AWGHHGWA", "AWWGGWWA", "aWuWWuWa", "aWuWWuWa",
                 "WWyWWyWW", "WDCWWDCW", "WDCWWDCW", "gggggggg"],
    })
    braco = ["WyWA", "WCDA", "WCDA", "wWWA", "wuWA", "wuWA", "wUWA", "wuWA", "gggg", "WwWA", "WwWA", "uuuu"]
    p.caixa(40, 16, 4, 12, 4, {
        "top": ["wyWw", "wCDw", "wWWw", "uuuu"], "bottom": ["WWWW", "WwwW", "wwww", "uuuu"],
        "front": braco, "right": [l.replace("WyWA", "AyWW").replace("WCDA", "ACDW") for l in braco],
        "left": _flip(braco), "back": [l.replace("WyWA", "WWyA").replace("WCDA", "WWCA") for l in braco],
    })
    perna = {
        "top": ["uuuu"] * 4, "bottom": ["gggg"] * 4,
        "front": ["wuWW", "wuWW", "wuWW", "wUWW", "wuWW", "wuWW", "WWyW", "yWyW", "CWCW", "CWCW", "gGgG", "uuuu"],
        "right": ["wuWA", "wuWA", "wuWA", "wUWA", "wuWA", "wuWA", "WyWA", "WCWA", "WCWA", "WWWA", "gGgG", "uuuu"],
        "left": ["AWuw", "AWuw", "AWuw", "AWUw", "AWuw", "AWuw", "AWyW", "AWCW", "AWCW", "AWWW", "GgGg", "uuuu"],
        "back": ["wuWW", "wuWW", "wUWW", "wuWW", "wuWW", "wuWW", "WyWW", "WCyW", "WCCW", "WWCW", "gGgG", "uuuu"],
    }
    p.caixa(0, 16, 4, 12, 4, perna)
    p.copiar((40, 16, 56, 32), (32, 48))
    p.copiar((0, 16, 16, 32), (16, 48))
    return p.img


PINTORES = {"errante": errante, "sentinela": sentinela, "memoria": memoria, "testemunho": testemunho}


def textura(nome: str, c: dict) -> None:
    """Skins pintadas pixel a pixel (sem ruído); os desenhos estão nas funções de PINTORES."""
    img = PINTORES[nome]()
    assert img.size == c["tex"], (nome, img.size, c["tex"])
    img.save(RP / "textures" / "vulpus" / "entidades" / f"ecos_{nome}.png")


def cliente(nome: str, c: dict) -> dict:
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": f"vulpus:ecos_{nome}",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": f"textures/vulpus/entidades/ecos_{nome}"},
                "geometry": {"default": c["geo"]},
                "animations": ANIMACOES,
                "scripts": {
                    "pre_animation": [
                        "variable.tcos0 = (math.cos(query.modified_distance_moved * 38.17) * query.modified_move_speed) * 57.3;",
                    ],
                    "scale": str(c["escala"]),
                    "animate": [
                        "base_pose",
                        {"look_at_target": "query.is_alive"},
                        {"move": "query.is_alive"},
                        {"attack": "variable.attack_time > 0"},
                    ],
                },
                "render_controllers": ["controller.render.vulpus.m_brilho" if c["brilho"] else "controller.render.vulpus.m_padrao"],
            }
        },
    }


def servidor(nome: str, c: dict) -> dict:
    comp = {
        "minecraft:type_family": {"family": ["vulpus_ecos"]},
        "minecraft:health": {"value": c["vida"], "max": c["vida"]},
        "minecraft:collision_box": {"width": 0.6, "height": 1.9},
        "minecraft:movement": {"value": c["vel"]},
        "minecraft:physics": {},
        "minecraft:knockback_resistance": {"value": 0.6 if nome == "testemunho" else 0.2},
        "minecraft:follow_range": {"value": c["alcance"], "max": 64},
        "minecraft:nameable": {"allow_name_tag_renaming": False},
        "minecraft:attack": {"damage": c["dano"]},
        "minecraft:fire_immune": {},
        # sem drops e sem XP: o fragmento de alma só vem dos objetivos
        "minecraft:loot": {"table": "loot_tables/vulpus/ecos_vazio.json"},
        "minecraft:navigation.walk": {
            "can_path_over_water": False, "avoid_water": True, "can_pass_doors": False, "can_break_doors": False, "avoid_damage_blocks": True,
        },
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": False, "reselect_targets": True,
            "entity_types": [{"filters": {"test": "is_family", "subject": "other", "value": "player"}, "max_dist": c["alcance"]}],
        },
        "minecraft:behavior.melee_attack": {"priority": 3, "speed_multiplier": 1.1, "track_target": True, "reach_multiplier": 1.0},
        "minecraft:behavior.random_stroll": {"priority": 6},
        "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 10},
        "minecraft:behavior.random_look_around": {"priority": 8},
    }
    if c["escala"] != 1.0:
        comp["minecraft:scale"] = {"value": c["escala"]}
    if nome == "testemunho":
        comp["minecraft:boss"] = {"hud_range": 60, "name": c["nome"], "should_darken_sky": False}
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {"identifier": f"vulpus:ecos_{nome}", "is_spawnable": False, "is_summonable": True, "is_experimental": False},
            "components": comp,
        },
    }


def gravar(caminho: Path, dados: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    (RP / "textures" / "vulpus" / "entidades").mkdir(parents=True, exist_ok=True)
    for nome, c in CRIATURAS.items():
        textura(nome, c)
        gravar(RP / "entity" / f"ecos_{nome}.entity.json", cliente(nome, c))
        gravar(BP / "entities" / f"ecos_{nome}.json", servidor(nome, c))
    gravar(BP / "loot_tables" / "vulpus" / "ecos_vazio.json", {"pools": []})
    print("criaturas dos Ecos geradas:", ", ".join(CRIATURAS))


if __name__ == "__main__":
    main()
