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
import random
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


def textura(nome: str, c: dict) -> None:
    """Ruído de pixels nas cores da paleta, olhos na frente da cabeça (padrão de pele do jogo) e pontinhos de detalhe."""
    rng = random.Random(nome)
    w, h = c["tex"]
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b = rng.choice(c["base"])
            v = rng.randint(-6, 6)
            px[x, y] = (max(0, min(255, r + v)), max(0, min(255, g + v)), max(0, min(255, b + v)), 255)
    # pontos de detalhe (velas, brilho) espalhados
    for _ in range((w * h) // 40):
        px[rng.randrange(w), rng.randrange(h)] = (*c["detalhe"], 255)
    # frente da cabeça: (8,8) a (15,15) em qualquer pele humanoide
    olho = (*c["olhos"], 255)
    escuro = (12, 12, 16, 255)
    for x in (9, 10, 13, 14):
        px[x, 11] = olho
    for x in (10, 11, 12, 13):
        px[x, 14] = escuro
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
