"""Prévias 3D (perspectiva) do modelo: corpo inteiro em várias vistas, rosto e cauda. Uso: python kiza/previas.py"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_kiza as g  # noqa: E402
import render3d as r  # noqa: E402

SAIDA = Path(__file__).resolve().parent / "saida"


def juntar(imagens: list[Image.Image], destino: Path) -> None:
    larg = sum(i.width for i in imagens)
    out = Image.new("RGBA", (larg, max(i.height for i in imagens)))
    x = 0
    for i in imagens:
        out.paste(i, (x, 0))
        x += i.width
    out.save(destino)


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    M = g.M
    M.montar_atlas(256)
    alvo = (0, 21.0, 0)
    corpo = [r.renderizar(M, r.camera(az, el, d, alvo), alvo, 420, 600, 40) for az, el, d in [(0, -4, 95), (38, 6, 95), (90, 4, 95), (180, 8, 98)]]
    juntar(corpo, SAIDA / "corpo.png")
    rosto_alvo = (0, 31.0, 0)
    rosto = [r.renderizar(M, r.camera(az, el, d, rosto_alvo), rosto_alvo, 520, 520, 36) for az, el, d in [(0, 0, 38), (30, 4, 38), (90, 2, 40)]]
    juntar(rosto, SAIDA / "rosto.png")
    cauda_alvo = (0, 11, 9)
    cauda = [r.renderizar(M, r.camera(az, el, d, cauda_alvo), cauda_alvo, 520, 420, 40) for az, el, d in [(90, 8, 55), (150, 18, 55), (200, 30, 50)]]
    juntar(cauda, SAIDA / "cauda.png")
    print("ok")


if __name__ == "__main__":
    main()
