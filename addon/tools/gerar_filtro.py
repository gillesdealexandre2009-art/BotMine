#!/usr/bin/env python3
"""Gera as texturas do filtro de câmera antiga (ui/vulpus/vulpus_filtro.json).

Uso, a partir da pasta addon/:
    python tools/gerar_filtro.py

Saída em vulpus_rp/textures/vulpus/ui/: filtro_vinheta.png (256x256, radial branca), filtro_tom.png (4x4 rosa-pêssego),
filtro_ruido_a.png e filtro_ruido_b.png (480x270, ruído fino em tons de cinza).
"""
import math
import random
from pathlib import Path

from PIL import Image

SAIDA = Path(__file__).resolve().parent.parent / "vulpus_rp" / "textures" / "vulpus" / "ui"


def vinheta(n: int = 256) -> Image.Image:
    img = Image.new("RGBA", (n, n))
    c = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            # distância normalizada ao centro (1 = canto); transparente até 0.45, sobe até alpha ~0.5 no canto
            d = math.hypot(x - c, y - c) / (c * math.sqrt(2))
            t = max(0.0, (d - 0.45) / 0.55)
            img.putpixel((x, y), (255, 255, 255, round(min(1.0, t * t) * 128)))
    return img


def ruido(semente: int, largura: int = 480, altura: int = 270) -> Image.Image:
    """Ruído fino em 16:9 (o JSON UI estica a imagem na tela inteira com keep_ratio false, ~3x): cinza médio com variação suave."""
    rnd = random.Random(semente)
    img = Image.new("RGBA", (largura, altura))
    for y in range(altura):
        for x in range(largura):
            v = max(0, min(255, round(rnd.gauss(128, 46))))
            img.putpixel((x, y), (v, v, v, 255))
    return img


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    vinheta().save(SAIDA / "filtro_vinheta.png")
    Image.new("RGBA", (4, 4), (255, 200, 190, 255)).save(SAIDA / "filtro_tom.png")
    ruido(1).save(SAIDA / "filtro_ruido_a.png")
    ruido(2).save(SAIDA / "filtro_ruido_b.png")
    print("ok")


if __name__ == "__main__":
    main()
