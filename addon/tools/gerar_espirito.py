#!/usr/bin/env python3
"""Gera o Espírito da Raposa (vulpus:espirito): o fogo-fátuo azul com orelhas e caudas que fica escondido no Evento de inauguração.

Uso, a partir da pasta addon/:
    python tools/gerar_espirito.py

Saída:
- vulpus_rp/textures/vulpus/entidades/espirito.png (16x16): paleta de 1 pixel por cor, na linha 0 (ver PALETA).
- vulpus_rp/models/entity/espirito.geo.json: ossos "espirito" (raiz) > "corpo", "chamas" e "cauda".
- vulpus_rp/animations/espirito.animation.json: flutua, balança o rosto, gira as chamas e abana as caudas (query.life_time).
- vulpus_rp/render_controllers/espirito.render_controllers.json e vulpus_rp/entity/espirito.entity.json.
- vulpus_bp/entities/espirito.json: a entidade (sem gravidade, imóvel, imune a dano; hitbox 0,7 x 0,9 para ser fácil de clicar).
Unidades: pixels (16 = 1 bloco), origem nos pés da entidade, a frente é o lado norte (-Z).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"

# cor -> índice do pixel na linha 0 da textura
PALETA = {
    "branco": (255, 255, 255, 255),
    "gelo": (205, 236, 255, 255),
    "ciano": (110, 200, 255, 255),
    "azul": (60, 135, 235, 255),
    "profundo": (40, 75, 185, 255),
    "olho": (22, 32, 72, 255),
    "ouro": (255, 215, 100, 255),
}
INDICE = {nome: i for i, nome in enumerate(PALETA)}
FACES = ["north", "south", "east", "west", "up", "down"]


def cubo(origem: list[float], tamanho: list[float], cor: str, inflar: float = 0) -> dict:
    """Cubo com a mesma cor (um pixel da paleta) em todas as faces."""
    uv = {f: {"uv": [INDICE[cor], 0], "uv_size": [1, 1]} for f in FACES}
    c: dict = {"origin": origem, "size": tamanho, "uv": uv}
    if inflar:
        c["inflate"] = inflar
    return c


def corpo() -> list[dict]:
    """Orbe branco com olhos, orelhas de raposa e um brilho dourado na testa."""
    c = [
        cubo([-3, 7, -3], [6, 6, 6], "branco"),
        cubo([-3.5, 7.5, -3.5], [7, 5, 7], "gelo"),  # casca
        cubo([-2.6, 9.4, -3.62], [1.4, 1.6, 0.2], "olho"),  # olhos
        cubo([1.2, 9.4, -3.62], [1.4, 1.6, 0.2], "olho"),
        cubo([-0.5, 7.6, -3.62], [1, 0.8, 0.2], "ouro"),  # focinho
        cubo([-0.5, 11.6, -3.62], [1, 1, 0.2], "ouro"),  # brilho na testa
        # orelhas (ponta mais clara)
        cubo([-3, 13, -1], [2, 3, 2], "azul"),
        cubo([-2.5, 16, -0.5], [1, 1, 1], "branco"),
        cubo([1, 13, -1], [2, 3, 2], "azul"),
        cubo([1.5, 16, -0.5], [1, 1, 1], "branco"),
    ]
    return c


def chamas() -> list[dict]:
    """Quatro chamas pequenas orbitando o orbe (o osso gira e pulsa)."""
    pos = [(6, 8, 0, "ciano"), (-6, 11, 0, "azul"), (0, 9.5, 6, "gelo"), (0, 7, -6, "profundo")]
    return [cubo([x - 1, y - 1, z - 1], [2, 2, 2], cor) for x, y, z, cor in pos]


def cauda() -> list[dict]:
    """Três caudas em leque atrás (lado +Z), cada uma com ponta branca."""
    saida = []
    for dx, cor in ((-3.2, "ciano"), (0, "azul"), (3.2, "ciano")):
        saida.append(cubo([dx - 1.5, 7.5, 3.5], [3, 3, 3], cor))
        saida.append(cubo([dx * 1.5 - 1, 8, 6.5], [2, 2, 2], "gelo"))
        saida.append(cubo([dx * 2 - 0.5, 8.5, 8.5], [1, 1, 1], "branco"))
    return saida


def geometria() -> dict:
    return {
        "description": {
            "identifier": "geometry.vulpus.espirito",
            "texture_width": 16,
            "texture_height": 16,
            "visible_bounds_width": 3,
            "visible_bounds_height": 3,
            "visible_bounds_offset": [0, 0.8, 0],
        },
        "bones": [
            {"name": "espirito", "pivot": [0, 0, 0]},
            {"name": "corpo", "parent": "espirito", "pivot": [0, 10, 0], "cubes": corpo()},
            {"name": "chamas", "parent": "espirito", "pivot": [0, 10, 0], "cubes": chamas()},
            {"name": "cauda", "parent": "espirito", "pivot": [0, 9, 3], "cubes": cauda()},
        ],
    }


def animacao() -> dict:
    return {
        "format_version": "1.8.0",
        "animations": {
            "animation.vulpus.espirito.flutuar": {
                "loop": True,
                "bones": {
                    # sobe e desce devagar
                    "espirito": {"position": [0, "math.sin(query.life_time * 120) * 1.6 + 1.6", 0]},
                    # olha de um lado para o outro e inclina um pouco
                    "corpo": {"rotation": [0, "math.sin(query.life_time * 70) * 28", "math.sin(query.life_time * 110) * 5"]},
                    # as chamas giram em volta e pulsam
                    "chamas": {
                        "rotation": [0, "query.life_time * 140", 0],
                        "scale": "0.85 + math.sin(query.life_time * 320) * 0.25",
                    },
                    # as caudas abanam
                    "cauda": {"rotation": [0, "math.sin(query.life_time * 210) * 20", "math.sin(query.life_time * 150) * 6"]},
                },
            }
        },
    }


def controlador() -> dict:
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.espirito": {
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
                "identifier": "vulpus:espirito",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/espirito"},
                "geometry": {"default": "geometry.vulpus.espirito"},
                "animations": {"flutuar": "animation.vulpus.espirito.flutuar"},
                "scripts": {"animate": ["flutuar"]},
                "render_controllers": ["controller.render.vulpus.espirito"],
            }
        },
    }


def entidade_bp() -> dict:
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": "vulpus:espirito",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
            },
            "components": {
                "minecraft:type_family": {"family": ["vulpus_espirito", "inanimate"]},
                "minecraft:collision_box": {"width": 0.7, "height": 0.9},
                "minecraft:physics": {"has_gravity": False, "has_collision": False},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
                "minecraft:persistent": {},
            },
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
    destino = RP / "textures" / "vulpus" / "entidades" / "espirito.png"
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.save(destino)
    salvar_json(RP / "models" / "entity" / "espirito.geo.json", {"format_version": "1.16.0", "minecraft:geometry": [geometria()]})
    salvar_json(RP / "animations" / "espirito.animation.json", animacao())
    salvar_json(RP / "render_controllers" / "espirito.render_controllers.json", controlador())
    salvar_json(RP / "entity" / "espirito.entity.json", entidade_rp())
    salvar_json(BP / "entities" / "espirito.json", entidade_bp())
    print("Espírito da Raposa gerado.")


if __name__ == "__main__":
    main()
