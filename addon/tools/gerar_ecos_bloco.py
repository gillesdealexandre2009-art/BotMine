"""Gera a entidade-bloco `vulpus:ecos_bloco` (telecinese da Varinha Lamento): entidade do BP, entidade do RP, geometria do cubo e render controller.

A lista de texturas vem de vulpus_bp/scripts/sistemas/ecos_bloco_mapa.js (TEXTURAS): o índice é a propriedade `vulpus:tipo`.
Uso: python tools/gerar_ecos_bloco.py   (idempotente)
"""
import json
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
BP = os.path.join(RAIZ, "vulpus_bp")
RP = os.path.join(RAIZ, "vulpus_rp")


def salvar(caminho, dado):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        json.dump(dado, f, ensure_ascii=False, indent=2)
        f.write("\n")


def ler_texturas():
    with open(os.path.join(BP, "scripts", "sistemas", "ecos_bloco_mapa.js"), encoding="utf-8") as f:
        js = f.read()
    corpo = re.search(r"export const TEXTURAS = \[(.*?)\];", js, re.S).group(1)
    return re.findall(r'"([a-z0-9_]+)"', corpo)


def main():
    tex = ler_texturas()
    n = len(tex)
    salvar(os.path.join(BP, "entities", "ecos_bloco.json"), {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": "vulpus:ecos_bloco",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
                "properties": {
                    "vulpus:tipo": {"type": "int", "range": [0, n - 1], "default": 0, "client_sync": True},
                },
            },
            "components": {
                "minecraft:type_family": {"family": ["vulpus_ecos_bloco", "inanimate"]},
                "minecraft:collision_box": {"width": 0.98, "height": 0.98},
                "minecraft:physics": {"has_gravity": True, "has_collision": True},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
                "minecraft:persistent": {},
            },
        },
    })
    salvar(os.path.join(RP, "entity", "ecos_bloco.entity.json"), {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "vulpus:ecos_bloco",
                "materials": {"default": "entity_alphatest"},
                "textures": {f"t{i}": f"textures/blocks/{nome}" for i, nome in enumerate(tex)},
                "geometry": {"default": "geometry.vulpus.ecos_bloco"},
                "render_controllers": ["controller.render.vulpus.ecos_bloco"],
            }
        },
    })
    face = {"uv": [0, 0], "uv_size": [16, 16]}
    salvar(os.path.join(RP, "models", "entity", "ecos_bloco.geo.json"), {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.vulpus.ecos_bloco",
                "texture_width": 16,
                "texture_height": 16,
                "visible_bounds_width": 2,
                "visible_bounds_height": 2,
                "visible_bounds_offset": [0, 0.5, 0],
            },
            "bones": [{
                "name": "cubo",
                "pivot": [0, 0, 0],
                "cubes": [{
                    "origin": [-8, 0, -8],
                    "size": [16, 16, 16],
                    "uv": {k: dict(face) for k in ("north", "south", "east", "west", "up", "down")},
                }],
            }],
        }],
    })
    salvar(os.path.join(RP, "render_controllers", "ecos_bloco.render_controllers.json"), {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.ecos_bloco": {
                "arrays": {"textures": {"Array.tex": [f"Texture.t{i}" for i in range(n)]}},
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": ["Array.tex[query.property('vulpus:tipo')]"],
            }
        },
    })
    print("ok", n, "texturas")


if __name__ == "__main__":
    main()
