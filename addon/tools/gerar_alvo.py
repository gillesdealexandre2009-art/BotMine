#!/usr/bin/env python3
"""Gera a textura do alvo móvel do tiro ao alvo (entidade vulpus:alvo).

Uso, a partir da pasta addon/:
    python tools/gerar_alvo.py

Saída: vulpus_rp/textures/vulpus/entidades/alvo.png (32x32). Mapa (o mesmo de models/entity/alvo.geo.json):
frente 16x16 em (0, 0), costas 16x16 em (16, 0) e, embaixo (linhas 16 a 31), madeira escura para as bordas.
Anéis em laranja e creme, mosca dourada.
"""
from pathlib import Path

from PIL import Image

SAIDA = Path(__file__).resolve().parent.parent / "vulpus_rp" / "textures" / "vulpus" / "entidades" / "alvo.png"

CREME = (255, 236, 205, 255)
LARANJA = (240, 120, 30, 255)
VERMELHO = (200, 40, 30, 255)
OURO = (255, 200, 60, 255)
BORDA = (70, 40, 25, 255)
MADEIRA = (96, 62, 38, 255)


def anel(x: int, y: int) -> tuple:
    """Cor do pixel (x, y) de um alvo 16x16 com anéis concêntricos."""
    d = max(abs(x - 7.5), abs(y - 7.5))
    if d >= 7:
        return BORDA
    if d >= 5.5:
        return CREME
    if d >= 3.5:
        return LARANJA
    if d >= 1.5:
        return CREME
    return OURO if d < 1 else VERMELHO


def main() -> None:
    img = Image.new("RGBA", (32, 32), MADEIRA)
    for y in range(16):
        for x in range(16):
            cor = anel(x, y)
            img.putpixel((x, y), cor)
            img.putpixel((16 + x, y), cor)
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    img.save(SAIDA)
    print(f"ok: {SAIDA}")


if __name__ == "__main__":
    main()
