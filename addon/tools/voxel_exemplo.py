#!/usr/bin/env python3
# Gera um dump de teste (casa com telhado de escadas, torre, poste com lanterna) no formato vulpus-voxel-1.
# Uso: python voxel_exemplo.py saida.json
import json, sys

paleta, ix, blocos = [], {}, []


def P(nome, est=None):
    k = nome + ("|" + json.dumps(est) if est else "")
    if k not in ix:
        ix[k] = len(paleta)
        paleta.append(k)
    return ix[k]


def fill(x1, y1, z1, x2, y2, z2, nome, est=None):
    i = P(nome, est)
    for z in range(z1, z2 + 1):
        for y in range(y1, y2 + 1):
            blocos.append([x1, y, z, x2, y, z, i])


def set_(x, y, z, nome, est=None):
    blocos.append([x, y, z, x, y, z, P(nome, est)])


fill(0, 0, 0, 40, 0, 40, "minecraft:grass_block")
fill(0, -3, 0, 40, -1, 40, "minecraft:dirt")
# casa 7x5x5 com telhado de escadas
fill(5, 1, 5, 11, 4, 9, "minecraft:white_wool")
fill(6, 1, 6, 10, 4, 8, "minecraft:air")
for y in (1, 4):
    fill(5, y, 5, 5, y, 5, "minecraft:oak_log"); fill(11, y, 5, 11, y, 5, "minecraft:oak_log")
    fill(5, y, 9, 5, y, 9, "minecraft:oak_log"); fill(11, y, 9, 11, y, 9, "minecraft:oak_log")
fill(5, 1, 5, 5, 4, 5, "minecraft:oak_log"); fill(11, 1, 5, 11, 4, 5, "minecraft:oak_log")
fill(5, 1, 9, 5, 4, 9, "minecraft:oak_log"); fill(11, 1, 9, 11, 4, 9, "minecraft:oak_log")
fill(8, 1, 5, 8, 2, 5, "minecraft:air")  # porta
fill(6, 2, 9, 7, 3, 9, "minecraft:glass_pane")
for k in range(4):
    fill(4 + k, 5 + k, 4, 4 + k, 5 + k, 10, "minecraft:stone_brick_stairs", {"weirdo_direction": 0})
    fill(12 - k, 5 + k, 4, 12 - k, 5 + k, 10, "minecraft:stone_brick_stairs", {"weirdo_direction": 1})
fill(8, 9, 4, 8, 9, 10, "minecraft:stone_brick_slab")
# torre de pedra
fill(20, 1, 20, 25, 14, 25, "minecraft:stone_bricks")
fill(21, 1, 21, 24, 14, 24, "minecraft:air")
fill(20, 15, 20, 25, 15, 25, "minecraft:stone_brick_slab", {"minecraft:vertical_half": "bottom"})
for x in (20, 22, 24):
    fill(x, 16, 20, x, 16, 20, "minecraft:stone_brick_wall"); fill(x, 16, 25, x, 16, 25, "minecraft:stone_brick_wall")
set_(22, 8, 20, "minecraft:air"); set_(22, 9, 20, "minecraft:air")
set_(22, 8, 19, "minecraft:lantern", {"hanging": False})
# poste em T com lanterna, canteiro e arvore
fill(30, 1, 10, 30, 5, 10, "minecraft:oak_fence")
fill(30, 5, 10, 32, 5, 10, "minecraft:oak_fence")
set_(32, 4, 10, "minecraft:lantern", {"hanging": True})
fill(14, 1, 12, 18, 1, 12, "minecraft:oak_planks")
fill(15, 2, 12, 17, 2, 12, "minecraft:poppy")
set_(10, 1, 14, "minecraft:candle", {"candles": 2, "lit": True})
fill(33, 1, 25, 33, 4, 25, "minecraft:oak_log"); fill(31, 5, 23, 35, 7, 27, "minecraft:oak_leaves")
fill(27, 1, 30, 29, 1, 32, "minecraft:water")
json.dump({"formato": "vulpus-voxel-1", "paleta": paleta, "blocos": blocos}, open(sys.argv[1] if len(sys.argv) > 1 else "exemplo.json", "w"))
