#!/usr/bin/env python3
"""Gera as criaturas de susto das pegadinhas: a Sombra Alta (vulpus:sombra) e os Olhos no escuro (vulpus:olhos).

Uso, a partir da pasta addon/:
    python tools/gerar_terror.py

Saída:
- vulpus_rp/textures/vulpus/entidades/terror.png (16x16): paleta de 1 pixel por cor, linha 0 (preto, quase preto, branco, vermelho escuro).
- vulpus_rp/models/entity/terror.geo.json: geometry.vulpus.sombra (vulto de 2,5 blocos, braços compridos, olhos brancos) e
  geometry.vulpus.olhos (só um par de olhos brancos no ar).
- vulpus_rp/animations/terror.animation.json: a sombra balança a cabeça e os braços; os olhos piscam (query.life_time).
- vulpus_rp/render_controllers/terror.render_controllers.json: ignore_lighting (a sombra é preta e os olhos brilham no escuro).
- vulpus_rp/entity/{sombra,olhos,duplo}.entity.json e vulpus_bp/entities/{sombra,olhos,duplo}.json (imóveis, sem dano; quem
  controla é sistemas/pegadinhas.js). O Duplo usa o modelo e a animação do Herobrine com a skin em cinza (duplo.png).
Unidades: pixels (16 = 1 bloco), origem nos pés da entidade, a frente é o lado norte (-Z).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"

PALETA = {
    "preto": (6, 6, 9, 255),
    "sombra": (22, 22, 28, 255),
    "branco": (255, 255, 255, 255),
    "sangue": (110, 0, 0, 255),
}
INDICE = {nome: i for i, nome in enumerate(PALETA)}
FACES = ["north", "south", "east", "west", "up", "down"]


def cubo(origem: list[float], tamanho: list[float], cor: str) -> dict:
    uv = {f: {"uv": [INDICE[cor], 0], "uv_size": [1, 1]} for f in FACES}
    return {"origin": origem, "size": tamanho, "uv": uv}


def geometria_sombra() -> dict:
    return {
        "description": {
            "identifier": "geometry.vulpus.sombra",
            "texture_width": 16,
            "texture_height": 16,
            "visible_bounds_width": 3,
            "visible_bounds_height": 4,
            "visible_bounds_offset": [0, 1.2, 0],
        },
        "bones": [
            {"name": "tudo", "pivot": [0, 0, 0]},
            {
                "name": "pernas",
                "parent": "tudo",
                "pivot": [0, 16, 0],
                "cubes": [cubo([-3.2, 0, -1.5], [2.6, 16, 3], "preto"), cubo([0.6, 0, -1.5], [2.6, 16, 3], "preto")],
            },
            {"name": "torso", "parent": "tudo", "pivot": [0, 16, 0], "cubes": [cubo([-4, 16, -2], [8, 14, 4], "sombra")]},
            {
                "name": "cabeca",
                "parent": "torso",
                "pivot": [0, 30, 0],
                "cubes": [
                    cubo([-3, 30, -3], [6, 10, 6], "preto"),
                    cubo([-2.3, 35.2, -3.15], [1.7, 1.1, 0.3], "branco"),
                    cubo([0.6, 35.2, -3.15], [1.7, 1.1, 0.3], "branco"),
                    cubo([-1, 32.3, -3.15], [2, 0.5, 0.3], "sangue"),
                ],
            },
            {"name": "braco_esq", "parent": "torso", "pivot": [-5, 29, 0], "cubes": [cubo([-6.2, 6, -1], [2, 23, 2], "preto")]},
            {"name": "braco_dir", "parent": "torso", "pivot": [5, 29, 0], "cubes": [cubo([4.2, 6, -1], [2, 23, 2], "preto")]},
        ],
    }


def geometria_olhos() -> dict:
    return {
        "description": {
            "identifier": "geometry.vulpus.olhos",
            "texture_width": 16,
            "texture_height": 16,
            "visible_bounds_width": 2,
            "visible_bounds_height": 3,
            "visible_bounds_offset": [0, 1, 0],
        },
        "bones": [
            {
                "name": "olhos",
                "pivot": [0, 23, 0],
                "cubes": [cubo([-4, 22.2, -0.3], [2.8, 1.6, 0.6], "branco"), cubo([1.2, 22.2, -0.3], [2.8, 1.6, 0.6], "branco")],
            }
        ],
    }


def animacoes() -> dict:
    return {
        "format_version": "1.8.0",
        "animations": {
            "animation.vulpus.sombra.parada": {
                "loop": True,
                "bones": {
                    "cabeca": {"rotation": [0, "math.sin(query.life_time * 25) * 10", "math.sin(query.life_time * 40) * 7 + 3"]},
                    "braco_esq": {"rotation": ["math.sin(query.life_time * 35) * 5", 0, "-3 + math.sin(query.life_time * 20) * 2"]},
                    "braco_dir": {"rotation": ["math.sin(query.life_time * 35 + 90) * 5", 0, "3 + math.sin(query.life_time * 22) * 2"]},
                    "tudo": {"rotation": [0, 0, "math.sin(query.life_time * 15) * 1.2"]},
                },
            },
            "animation.vulpus.olhos.piscar": {
                "loop": True,
                "bones": {
                    "olhos": {
                        "scale": [1, "1 - math.clamp(math.sin(query.life_time * 90) * 14 - 12.5, 0, 0.95)", 1],
                        "position": [0, "math.sin(query.life_time * 50) * 0.5", 0],
                    }
                },
            },
        },
    }


def controlador() -> dict:
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.terror": {
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.default"],
                "ignore_lighting": True,
            }
        },
    }


def entidade_rp(nome: str, animacao: str) -> dict:
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": f"vulpus:{nome}",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/terror"},
                "geometry": {"default": f"geometry.vulpus.{nome}"},
                "animations": {"anim": f"animation.vulpus.{nome}.{animacao}"},
                "scripts": {"animate": ["anim"]},
                "render_controllers": ["controller.render.vulpus.terror"],
            }
        },
    }


def entidade_bp(nome: str, largura: float, altura: float) -> dict:
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": f"vulpus:{nome}",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
            },
            "components": {
                "minecraft:type_family": {"family": [f"vulpus_{nome}", "inanimate"]},
                "minecraft:collision_box": {"width": largura, "height": altura},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
            },
        },
    }


def textura_duplo() -> Image.Image:
    """O Duplo: a skin do Herobrine em cinza escuro, com os olhos brancos (cabeça, linhas 12-13 do rosto)."""
    skin = Image.open(Path(__file__).resolve().parent / "skins" / "herobrine.png").convert("RGBA")
    saida = Image.new("RGBA", skin.size, (0, 0, 0, 0))
    for y in range(skin.height):
        for x in range(skin.width):
            r, g, b, a = skin.getpixel((x, y))
            if a == 0:
                continue
            cinza = int((r * 0.3 + g * 0.59 + b * 0.11) * 0.38)
            saida.putpixel((x, y), (cinza, cinza, cinza + 4, a))
    for x in (9, 10, 13, 14):
        for y in (12, 13):
            saida.putpixel((x, y), (255, 255, 255, 255))
    return saida


def entidade_rp_duplo() -> dict:
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "vulpus:duplo",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/duplo"},
                "geometry": {"default": "geometry.vulpus.herobrine"},
                "animations": {"parado": "animation.vulpus.herobrine.parado"},
                "scripts": {"animate": ["parado"]},
                "render_controllers": ["controller.render.vulpus.herobrine"],
            }
        },
    }


def salvar_json(caminho: Path, conteudo: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    # RP vai minificado (menos bytes no download e menos para o cliente ler); BP segue legivel.
    texto = json.dumps(conteudo, separators=(",", ":"), ensure_ascii=False) if RP in caminho.parents else json.dumps(conteudo, indent=2, ensure_ascii=False)
    caminho.write_text(texto + "\n", encoding="utf-8")


def main() -> None:
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for nome, cor in PALETA.items():
        img.putpixel((INDICE[nome], 0), cor)
    destino = RP / "textures" / "vulpus" / "entidades" / "terror.png"
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.save(destino)
    salvar_json(RP / "models" / "entity" / "terror.geo.json", {"format_version": "1.16.0", "minecraft:geometry": [geometria_sombra(), geometria_olhos()]})
    salvar_json(RP / "animations" / "terror.animation.json", animacoes())
    salvar_json(RP / "render_controllers" / "terror.render_controllers.json", controlador())
    salvar_json(RP / "entity" / "sombra.entity.json", entidade_rp("sombra", "parada"))
    salvar_json(RP / "entity" / "olhos.entity.json", entidade_rp("olhos", "piscar"))
    salvar_json(BP / "entities" / "sombra.json", entidade_bp("sombra", 0.7, 2.5))
    salvar_json(BP / "entities" / "olhos.json", entidade_bp("olhos", 0.6, 1.8))
    textura_duplo().save(RP / "textures" / "vulpus" / "entidades" / "duplo.png")
    salvar_json(RP / "entity" / "duplo.entity.json", entidade_rp_duplo())
    salvar_json(BP / "entities" / "duplo.json", entidade_bp("duplo", 0.6, 1.8))
    print("Sombra, Olhos e Duplo gerados.")


if __name__ == "__main__":
    main()
