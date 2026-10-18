#!/usr/bin/env python3
"""Gera o Herobrine das pegadinhas (vulpus:herobrine): humanoide parado, de olhos brancos, que brilha no escuro.

Uso, a partir da pasta addon/:
    python tools/gerar_herobrine.py

Entrada: tools/skins/herobrine.png (skin clássica 64x64 do dono: braços de 4 px).
Saída:
- vulpus_rp/textures/vulpus/entidades/herobrine.png: cópia da skin.
- vulpus_rp/models/entity/herobrine.geo.json: modelo humanoide 64x64 (cabeça, camada de chapéu, corpo, jaqueta, braços, mangas, pernas, calças).
- vulpus_rp/animations/herobrine.animation.json: respira, cabeça torta que vagueia, braços balançando e tranco ocasional (query.life_time).
- vulpus_rp/render_controllers/herobrine.render_controllers.json: ignore_lighting (aparece mesmo no escuro, é o que assusta).
- vulpus_rp/entity/herobrine.entity.json e vulpus_bp/entities/herobrine.json (imóvel, sem dano; quem controla é sistemas/pegadinhas.js).
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"
SKIN = Path(__file__).resolve().parent / "skins" / "herobrine.png"


def cubo(origem: list[float], tamanho: list[float], uv: list[int], inflar: float = 0) -> dict:
    c: dict = {"origin": origem, "size": tamanho, "uv": uv}
    if inflar:
        c["inflate"] = inflar
    return c


def geometria() -> dict:
    ossos = [
        {"name": "head", "pivot": [0, 24, 0], "cubes": [cubo([-4, 24, -4], [8, 8, 8], [0, 0])]},
        {"name": "hat", "parent": "head", "pivot": [0, 24, 0], "cubes": [cubo([-4, 24, -4], [8, 8, 8], [32, 0], 0.5)]},
        {"name": "body", "pivot": [0, 24, 0], "cubes": [cubo([-4, 12, -2], [8, 12, 4], [16, 16])]},
        {"name": "jacket", "parent": "body", "pivot": [0, 24, 0], "cubes": [cubo([-4, 12, -2], [8, 12, 4], [16, 32], 0.25)]},
        {"name": "rightArm", "pivot": [-5, 22, 0], "cubes": [cubo([-8, 12, -2], [4, 12, 4], [40, 16])]},
        {"name": "rightSleeve", "parent": "rightArm", "pivot": [-5, 22, 0], "cubes": [cubo([-8, 12, -2], [4, 12, 4], [40, 32], 0.25)]},
        {"name": "leftArm", "pivot": [5, 22, 0], "cubes": [cubo([4, 12, -2], [4, 12, 4], [32, 48])]},
        {"name": "leftSleeve", "parent": "leftArm", "pivot": [5, 22, 0], "cubes": [cubo([4, 12, -2], [4, 12, 4], [48, 48], 0.25)]},
        {"name": "rightLeg", "pivot": [-1.9, 12, 0], "cubes": [cubo([-3.9, 0, -2], [4, 12, 4], [0, 16])]},
        {"name": "rightPants", "parent": "rightLeg", "pivot": [-1.9, 12, 0], "cubes": [cubo([-3.9, 0, -2], [4, 12, 4], [0, 32], 0.25)]},
        {"name": "leftLeg", "pivot": [1.9, 12, 0], "cubes": [cubo([-0.1, 0, -2], [4, 12, 4], [16, 48])]},
        {"name": "leftPants", "parent": "leftLeg", "pivot": [1.9, 12, 0], "cubes": [cubo([-0.1, 0, -2], [4, 12, 4], [0, 48], 0.25)]},
    ]
    for osso in ossos:
        osso.setdefault("parent", "todo")
    ossos.insert(0, {"name": "todo", "pivot": [0, 0, 0]})
    return {
        "description": {
            "identifier": "geometry.vulpus.herobrine",
            "texture_width": 64,
            "texture_height": 64,
            "visible_bounds_width": 2,
            "visible_bounds_height": 3,
            "visible_bounds_offset": [0, 1, 0],
        },
        "bones": ossos,
    }


def animacao() -> dict:
    """Parado, mas vivo e errado: respira, a cabeça pende torta e vagueia, os braços balançam um pouco e, de vez em quando,
    o corpo dá um tranco (glitch)."""
    glitch = "(math.sin(query.life_time * 131) > 0.985 ? math.sin(query.life_time * 1700)"
    return {
        "format_version": "1.8.0",
        "animations": {
            "animation.vulpus.herobrine.parado": {
                "loop": True,
                "bones": {
                    "todo": {"position": [f"{glitch} * 1.6 : 0)", 0, f"{glitch} * 0.8 : 0)"]},
                    "head": {
                        "rotation": [
                            "6 + math.sin(query.life_time * 18) * 2.5",
                            f"math.sin(query.life_time * 11) * 16 + {glitch} * 30 : 0)",
                            "-10 + math.sin(query.life_time * 23) * 4",
                        ]
                    },
                    "body": {"rotation": [1.5, 0, "math.sin(query.life_time * 14) * 1.4"], "scale": [1, "1 + math.sin(query.life_time * 80) * 0.012", 1]},
                    "rightArm": {"rotation": ["math.sin(query.life_time * 30) * 3 + 3", 0, "4 + math.sin(query.life_time * 17) * 2"]},
                    "leftArm": {"rotation": ["math.sin(query.life_time * 27 + 90) * 3 + 3", 0, "-4 - math.sin(query.life_time * 19) * 2"]},
                },
            }
        },
    }


def controlador() -> dict:
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.herobrine": {
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.default"],
                "ignore_lighting": True,
            }
        },
    }


def entidade_rp() -> dict:
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "vulpus:herobrine",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/herobrine"},
                "geometry": {"default": "geometry.vulpus.herobrine"},
                "animations": {"parado": "animation.vulpus.herobrine.parado"},
                "scripts": {"animate": ["parado"]},
                "render_controllers": ["controller.render.vulpus.herobrine"],
            }
        },
    }


def entidade_bp() -> dict:
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": "vulpus:herobrine",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
            },
            "components": {
                "minecraft:type_family": {"family": ["vulpus_herobrine", "inanimate"]},
                "minecraft:collision_box": {"width": 0.6, "height": 1.8},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
            },
        },
    }


def salvar_json(caminho: Path, conteudo: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    # RP vai minificado (menos bytes no download e menos para o cliente ler); BP segue legivel.
    texto = json.dumps(conteudo, separators=(",", ":"), ensure_ascii=False) if RP in caminho.parents else json.dumps(conteudo, indent=2, ensure_ascii=False)
    caminho.write_text(texto + "\n", encoding="utf-8")


def main() -> None:
    destino = RP / "textures" / "vulpus" / "entidades" / "herobrine.png"
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SKIN, destino)
    salvar_json(RP / "models" / "entity" / "herobrine.geo.json", {"format_version": "1.16.0", "minecraft:geometry": [geometria()]})
    salvar_json(RP / "animations" / "herobrine.animation.json", animacao())
    salvar_json(RP / "render_controllers" / "herobrine.render_controllers.json", controlador())
    salvar_json(RP / "entity" / "herobrine.entity.json", entidade_rp())
    salvar_json(BP / "entities" / "herobrine.json", entidade_bp())
    print("Herobrine gerado.")


if __name__ == "__main__":
    main()
