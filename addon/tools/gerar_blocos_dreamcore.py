#!/usr/bin/env python3
"""Gera os blocos DREAMCORE/liminal (pastéis e texturas de memória) do mistério da Vulpus.

Uso, a partir da pasta addon/:
    python tools/gerar_blocos_dreamcore.py

Saída: texturas 16x16 em vulpus_rp/textures/blocks, JSON em vulpus_bp/blocks, entradas em terrain_texture.json
(preserva as existentes) e nomes nos .lang (acrescenta sem duplicar) + prévia em docs/previas/dreamcore_blocos.png.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"
PREVIA = RAIZ / "docs" / "previas" / "dreamcore_blocos.png"


def hx(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


# ---------- texturas ----------
def liso(cor: str) -> Image.Image:
    return Image.new("RGB", (16, 16), hx(cor))


def papel_listras() -> Image.Image:
    im = liso("#FFF3DC")
    d = ImageDraw.Draw(im)
    for x in range(1, 16, 4):
        d.line([(x, 0), (x, 15)], fill=hx("#FBDCC4"))
    return im


def papel_flores() -> Image.Image:
    im = liso("#FFF3DC")
    flores = [((3, 3), "#FFC9DC"), ((11, 3), "#D9C8FF"), ((7, 11), "#FFC9DC"), ((15, 11), "#D9C8FF"), ((-1, 11), "#D9C8FF")]
    for (cx, cy), cor in flores:
        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            x, y = cx + dx, cy + dy
            if 0 <= x < 16 and 0 <= y < 16:
                im.putpixel((x, y), hx(cor))
        if 0 <= cx < 16:
            im.putpixel((cx, cy), hx("#FFE9A8"))
    return im


def carpete() -> Image.Image:
    bege, teal, rosa, creme = hx("#E6D3B3"), hx("#3FA7A0"), hx("#E58FB0"), hx("#FFF3DC")
    im = Image.new("RGB", (16, 16), bege)
    d = ImageDraw.Draw(im)
    # zigue-zague teal
    for x in range(16):
        y = 2 + abs((x % 8) - 4)
        d.point((x, y), fill=teal)
        d.point((x, y + 8), fill=teal)
    # confetes rosa e creme
    for (x, y) in [(2, 7), (10, 7), (6, 15), (14, 15)]:
        d.point((x, y), fill=rosa)
        d.point((x + 1, y), fill=rosa)
    for (x, y) in [(6, 6), (14, 6), (2, 14), (10, 14)]:
        d.point((x, y), fill=creme)
    # triângulos rosa
    for (x, y) in [(4, 10), (12, 10)]:
        d.polygon([(x, y), (x + 2, y), (x + 1, y - 1)], fill=rosa)
    return im


def azulejo() -> Image.Image:
    im = Image.new("RGB", (16, 16), hx("#FFFFFF"))
    d = ImageDraw.Draw(im)
    for ox in (0, 8):
        for oy in (0, 8):
            d.rectangle([ox + 1, oy + 1, ox + 7, oy + 7], fill=hx("#B8E6EE"))
            d.line([(ox + 1, oy + 1), (ox + 6, oy + 1)], fill=hx("#D4F3F7"))
            d.line([(ox + 7, oy + 2), (ox + 7, oy + 7)], fill=hx("#A2D9E4"))
    return im


def painel() -> Image.Image:
    im = liso("#F4F8FF")
    d = ImageDraw.Draw(im)
    linha = hx("#C9D3E4")
    for p in (0, 8):
        d.line([(p, 0), (p, 15)], fill=linha)
        d.line([(0, p), (15, p)], fill=linha)
    for p in (3, 11):
        d.line([(p, 2), (p, 13)], fill=hx("#FFFFF2"))
    return im


def janela() -> Image.Image:
    topo, base = hx("#9FD0F5"), hx("#E8F5FF")
    im = Image.new("RGB", (16, 16))
    for y in range(16):
        t = y / 15
        c = tuple(round(topo[i] + (base[i] - topo[i]) * t) for i in range(3))
        for x in range(16):
            im.putpixel((x, y), c)
    d = ImageDraw.Draw(im)

    def nuvem(x: int, y: int, w: int) -> None:
        d.rectangle([x, y, x + w, y + 1], fill=(255, 255, 255))
        d.rectangle([x + 1, y - 1, x + w - 1, y - 1], fill=(255, 255, 255))
        d.line([(x, y + 2), (x + w, y + 2)], fill=hx("#EAF4FF"))

    nuvem(2, 4, 5)
    nuvem(9, 9, 5)
    nuvem(10, 2, 3)
    return im


PASTEIS = [
    ("pastel_creme", "Pastel Creme", "Pastel Cream", "#FFF3DC"),
    ("pastel_pessego", "Pastel Pêssego", "Pastel Peach", "#FFD9C2"),
    ("pastel_rosa", "Pastel Rosa-bebê", "Pastel Baby Pink", "#FFD1E6"),
    ("pastel_lilas", "Pastel Lilás", "Pastel Lilac", "#DCCBFF"),
    ("pastel_ceu", "Pastel Azul-céu", "Pastel Sky Blue", "#CFE8FF"),
]

# id, nome pt, nome en, função da textura, emissão, cor do mapa
TEXTURADOS = [
    ("papel_parede_listras", "Papel de Parede Listrado", "Striped Wallpaper", papel_listras, 11, "#FFF3DC"),
    ("papel_parede_flores", "Papel de Parede Florido", "Floral Wallpaper", papel_flores, 11, "#FFF3DC"),
    ("carpete_90s", "Carpete Anos 90", "90s Carpet", carpete, 11, "#E6D3B3"),
    ("azulejo_piscina", "Azulejo de Piscina", "Pool Tile", azulejo, 11, "#B8E6EE"),
    ("painel_fluorescente", "Painel Fluorescente", "Fluorescent Panel", painel, 15, "#F4F8FF"),
    ("janela_ceu", "Janela de Céu", "Sky Window", janela, 15, "#BFE0F8"),
]


def bloco(id_: str, tex: str, emissao: int, mapa: str, atravessavel: bool = False) -> dict:
    comp = {
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:light_emission": emissao,
        "minecraft:material_instances": {"*": {"texture": tex, "render_method": "opaque", "ambient_occlusion": False, "face_dimming": False}},
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.4 if atravessavel else 0.8},
        "minecraft:destructible_by_explosion": {"explosion_resistance": 6},
        "minecraft:map_color": mapa,
    }
    if atravessavel:
        comp["minecraft:collision_box"] = False
    return {
        "format_version": "1.21.100",
        "minecraft:block": {
            "description": {"identifier": f"vulpus:{id_}", "menu_category": {"category": "construction", "group": "minecraft:itemGroup.name.concrete"}},
            "components": comp,
        },
    }


def escrever_lang(arq: Path, itens: list[tuple[str, str]]) -> None:
    texto = arq.read_text(encoding="utf-8") if arq.exists() else ""
    if texto and not texto.endswith("\n"):
        texto += "\n"
    for id_, nome in itens:
        chave = f"tile.vulpus:{id_}.name="
        if chave not in texto:
            texto += f"{chave}{nome}\n"
    arq.write_text(texto, encoding="utf-8")


def main() -> None:
    (RP / "textures" / "blocks").mkdir(parents=True, exist_ok=True)
    (BP / "blocks").mkdir(parents=True, exist_ok=True)
    PREVIA.parent.mkdir(parents=True, exist_ok=True)
    texturas: list[tuple[str, str, Image.Image]] = []  # id, rótulo, imagem
    blocos: list[tuple[str, str, str, dict]] = []  # id, pt, en, json

    for id_, pt, en, cor in PASTEIS:
        texturas.append((id_, pt, liso(cor)))
        blocos.append((id_, pt, en, bloco(id_, f"vulpus_{id_}", 13, cor)))
    for id_, pt, en, fn, em, mapa in TEXTURADOS:
        texturas.append((id_, pt, fn()))
        blocos.append((id_, pt, en, bloco(id_, f"vulpus_{id_}", em, mapa)))
    blocos.append(("pastel_creme_atravessavel", "Pastel Creme Atravessável", "Walk-Through Pastel Cream",
                   bloco("pastel_creme_atravessavel", "vulpus_pastel_creme", 13, "#FFF3DC", True)))

    for id_, _rot, im in texturas:
        im.save(RP / "textures" / "blocks" / f"{id_}.png")
    for id_, _pt, _en, js in blocos:
        (BP / "blocks" / f"{id_}.json").write_text(json.dumps(js, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    arq = RP / "textures" / "terrain_texture.json"
    tt = json.loads(arq.read_text(encoding="utf-8"))
    for id_, _rot, _im in texturas:
        tt["texture_data"][f"vulpus_{id_}"] = {"textures": f"textures/blocks/{id_}"}
    arq.write_text(json.dumps(tt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    escrever_lang(RP / "texts" / "pt_BR.lang", [(i, pt) for i, pt, _e, _j in blocos])
    escrever_lang(RP / "texts" / "en_US.lang", [(i, en) for i, _p, en, _j in blocos])

    # prévia: grade 4 colunas, cada textura ampliada 8x com rótulo
    esc, cols, pad, rot_h = 8, 4, 12, 16
    cel = 16 * esc
    linhas = (len(texturas) + cols - 1) // cols
    img = Image.new("RGB", (cols * (cel + pad) + pad, linhas * (cel + pad + rot_h) + pad), (60, 60, 70))
    d = ImageDraw.Draw(img)
    for n, (id_, rot, im) in enumerate(texturas):
        x = pad + (n % cols) * (cel + pad)
        y = pad + (n // cols) * (cel + pad + rot_h)
        img.paste(im.resize((cel, cel), Image.NEAREST), (x, y))
        d.text((x, y + cel + 2), id_, fill=(240, 240, 240))
    img.save(PREVIA)
    print(f"{len(blocos)} blocos, {len(texturas)} texturas.")


if __name__ == "__main__":
    random.seed(0)
    main()
