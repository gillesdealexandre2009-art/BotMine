"""Gera as texturas do addon Vulpus em pixel art (Pillow).

Uso, a partir da pasta addon/:
    python tools/gerar_texturas.py            # gera tudo, mas preserva PNGs trocados à mão
    python tools/gerar_texturas.py --forcar   # sobrescreve até os PNGs trocados à mão

Saída:
- vulpus_rp/textures/vulpus/ui/*.png (+ .json de nineslice): painel, cabeçalho, botões, fechar, divisor, logo;
- vulpus_rp/textures/vulpus/itens/menu.png e vulpus_rp/textures/item_texture.json;
- vulpus_bp/pack_icon.png e vulpus_rp/pack_icon.png.

Tudo é desenhado pixel a pixel, sem antialias. A logo é PROVISÓRIA: para usar a oficial, troque
vulpus_rp/textures/vulpus/ui/logo.png por uma imagem quadrada com o mesmo nome. Cada PNG gerado
leva uma assinatura interna; um PNG trocado ou editado à mão não é sobrescrito sem --forcar.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, PngImagePlugin

ADDON = Path(__file__).resolve().parent.parent
RP = ADDON / "vulpus_rp"
BP = ADDON / "vulpus_bp"
PASTA_UI = RP / "textures" / "vulpus" / "ui"
PASTA_ITENS = RP / "textures" / "vulpus" / "itens"

MARCA = "Vulpus: gerado por tools/gerar_texturas.py"

# Paleta Vulpus (spec técnica)
LARANJA = (242, 140, 56)  # #F28C38 laranja raposa
LARANJA_ESCURO = (196, 98, 26)  # #C4621A
BRASA = (122, 58, 16)  # #7A3A10
CREME = (255, 244, 230)  # #FFF4E6
FUNDO = (42, 31, 26)  # #2A1F1A
FUNDO_CLARO = (58, 42, 34)  # #3A2A22
BORDA = (138, 90, 54)  # #8A5A36

# Tons derivados, só para luz e sombra
LARANJA_CLARO = (255, 178, 102)
LARANJA_MEDIO = (219, 117, 40)
BRASA_CLARA = (160, 78, 22)
CREME_SOMBRA = (232, 212, 190)
FUNDO_ESCURO = (24, 17, 14)
FUNDO_SOMBRA = (33, 24, 20)
CONTORNO = (52, 26, 12)
OLHO = (34, 20, 14)
BRANCO = (255, 255, 255)
NARIZ_BRILHO = (120, 92, 80)

ALFA_PAINEL = 240
TRANSPARENTE = (0, 0, 0, 0)


def rgba(cor: tuple, alfa: int = 255) -> tuple:
    return (*cor[:3], alfa)


# ---------------------------------------------------------------- ferramentas de desenho


def ampliar(img: Image.Image, fator: int) -> Image.Image:
    """Amplia sem suavizar (cada pixel vira um bloco fator x fator)."""
    return img.resize((img.width * fator, img.height * fator), Image.NEAREST)


def caixa(larg: int, alt: int, recorte: int, camadas: list[tuple], faixas: dict[int, tuple] | None = None) -> Image.Image:
    """Retângulo de cantos recortados, pintado em voltas a partir da borda.

    camadas[i] é a cor da i-ésima volta (a última preenche o miolo). O recorte tira os pixels com
    dx + dy < recorte em cada canto, e as voltas de dentro seguem a diagonal (canto chanfrado por dentro).
    faixas {y: cor} repinta linhas inteiras por dentro do contorno, para luz e sombra.
    """
    img = Image.new("RGBA", (larg, alt), TRANSPARENTE)
    px = img.load()
    for y in range(alt):
        for x in range(larg):
            dx, dy = min(x, larg - 1 - x), min(y, alt - 1 - y)
            if dx + dy < recorte:
                continue
            volta = min(dx, dy, (dx + dy - recorte + 1) // 2)
            px[x, y] = camadas[min(volta, len(camadas) - 1)]
    for y, cor in (faixas or {}).items():
        for x in range(1, larg - 1):
            px[x, y] = rgba(cor)
    return img


def pixel_art(linhas: list[str], cores: dict[str, tuple]) -> Image.Image:
    """Converte desenho em texto (um caractere por pixel, '.' = transparente) em imagem."""
    img = Image.new("RGBA", (len(linhas[0]), len(linhas)), TRANSPARENTE)
    px = img.load()
    for y, linha in enumerate(linhas):
        for x, ch in enumerate(linha):
            if ch != ".":
                px[x, y] = rgba(cores[ch])
    return img


def linhas_de(desenho: str) -> list[str]:
    linhas = desenho.strip("\n").split("\n")
    if any(len(linha) != len(linhas[0]) for linha in linhas):
        raise ValueError("todas as linhas do desenho precisam ter o mesmo tamanho")
    return linhas


def espelhar(metade: str) -> list[str]:
    """Completa um desenho simétrico a partir da metade esquerda."""
    return [linha + linha[::-1] for linha in linhas_de(metade)]


def contornar(img: Image.Image, cor: tuple) -> Image.Image:
    """Contorno de 1 pixel (vizinhança 4) em volta de tudo que não é transparente."""
    saida = img.copy()
    origem, destino = img.load(), saida.load()
    for y in range(img.height):
        for x in range(img.width):
            if origem[x, y][3]:
                continue
            for vx, vy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= vx < img.width and 0 <= vy < img.height and origem[vx, vy][3]:
                    destino[x, y] = rgba(cor)
                    break
    return saida


# ---------------------------------------------------------------- texturas do menu


def painel() -> Image.Image:
    """32x32, nineslice 8: borda laranja de 2px com cantos recortados, sombra interna e fundo translúcido.

    Todo o relevo fica nas 8 voltas fixas da borda; o miolo esticado é liso.
    """
    return caixa(
        32,
        32,
        2,
        [
            rgba(LARANJA_ESCURO),
            rgba(LARANJA),
            rgba(FUNDO_ESCURO, ALFA_PAINEL),
            rgba(FUNDO_SOMBRA, ALFA_PAINEL),
            rgba(FUNDO, ALFA_PAINEL),
        ],
    )


def cabecalho() -> Image.Image:
    """32x16, nineslice 4: faixa do título em laranja escuro, brilho em cima e sombra embaixo."""
    return caixa(32, 16, 1, [rgba(BRASA), rgba(LARANJA_ESCURO)], {1: LARANJA, 2: LARANJA_MEDIO, 14: BRASA_CLARA})


# Botão: contorno, preenchimento, 2 linhas de cima e 2 de baixo (dentro das 4 linhas fixas do nineslice).
# Normal tem luz em cima e sombra embaixo; o pressionado inverte (sombra em cima, luz embaixo).
ESTADOS_BOTAO = {
    "botao": (BORDA, FUNDO_CLARO, ((88, 66, 52), (68, 50, 40)), ((48, 35, 28), FUNDO)),
    "botao_hover": (BRASA, LARANJA, (LARANJA_CLARO, (247, 156, 76)), ((226, 122, 44), LARANJA_ESCURO)),
    "botao_press": (BRASA, LARANJA_ESCURO, ((140, 66, 18), (168, 82, 24)), (LARANJA_ESCURO, LARANJA_MEDIO)),
}


def botao(contorno: tuple, preenchimento: tuple, cima: tuple, baixo: tuple) -> Image.Image:
    """16x16, nineslice 4."""
    faixas = {1: cima[0], 2: cima[1], 13: baixo[0], 14: baixo[1]}
    return caixa(16, 16, 1, [rgba(contorno), rgba(preenchimento)], faixas)


# Fechar: contorno, fundo, cor do X e quanto o X desce (o pressionado "afunda")
ESTADOS_FECHAR = {
    "fechar": (BORDA, FUNDO, CREME, 0),
    "fechar_hover": (LARANJA, FUNDO_CLARO, LARANJA, 0),
    "fechar_press": (BRASA, FUNDO_ESCURO, LARANJA_ESCURO, 1),
}

DESENHO_X = """
##....##
###..###
.######.
..####..
..####..
.######.
###..###
##....##
"""


def fechar(contorno: tuple, fundo: tuple, cor_x: tuple, desce: int) -> Image.Image:
    """16x16: X grosso centralizado num quadrado escuro, com sombra de 1px embaixo do X."""
    img = caixa(16, 16, 1, [rgba(contorno), rgba(fundo)])
    px = img.load()
    traco = {
        (4 + x, 4 + desce + y)
        for y, linha in enumerate(linhas_de(DESENHO_X))
        for x, ch in enumerate(linha)
        if ch == "#"
    }
    for x, y in traco:
        if (x, y + 1) not in traco:
            px[x, y + 1] = rgba(FUNDO_ESCURO)
    for x, y in traco:
        px[x, y] = rgba(cor_x)
    return img


def divisor() -> Image.Image:
    """32x2: linha laranja com sombra embaixo, sumindo nas pontas."""
    img = Image.new("RGBA", (32, 2), TRANSPARENTE)
    px = img.load()
    rampa = (40, 90, 150, 205, 240)
    for x in range(32):
        ponta = min(x, 31 - x)
        alfa = rampa[ponta] if ponta < len(rampa) else 255
        px[x, 0] = rgba(LARANJA, alfa)
        px[x, 1] = rgba(BRASA, alfa * 3 // 4)
    return img


# ---------------------------------------------------------------- raposa (logo, item e ícone do pack)

CORES_RAPOSA = {
    "o": LARANJA,
    "O": LARANJA_CLARO,
    "d": LARANJA_ESCURO,
    "b": BRASA,
    "c": CREME,
    "s": CREME_SOMBRA,
    "e": OLHO,
    "n": OLHO,
    "w": BRANCO,
    "h": NARIZ_BRILHO,
}

# Metade esquerda da cabeça (32x32); a direita é espelhada e o contorno é automático.
# o laranja  O luz  d sombra  b orelha por dentro  c creme  s creme na sombra  e olho  n nariz
RAPOSA_32 = """
................
................
................
.....o..........
.....oo.........
....obbo........
....obbbo.......
....dbbbbo......
...dobbbbbo.....
...dobbbbbbo....
...dobbbbbbbo..O
...docbbbbbcoOOO
...dcccccccooooO
..ddooccccoooooo
..dooooooooooooo
..dooooooooooooo
.ddooooeeooooooo
.dooooeeeeoooooo
.dcoooeeeeoooooo
.cccooooeeoooooo
..cccccooooooooo
...ccccccooooooo
....cccccccooooo
.....scccccccooo
......scccccccoo
........scccccoo
..........sccnnn
...........scnnn
.............snn
................
................
................
"""
# O que não é simétrico: brilho dos dois olhos do mesmo lado e brilho do nariz.
DETALHES_32 = [(7, 17, "w"), (23, 17, "w"), (13, 26, "h")]

# Versão 16x16 para o item do menu.
RAPOSA_16 = """
........
.o......
.oo.....
.obo....
.obbo..o
.obbboOO
.dccoooo
.ddooooo
.dooweoo
.ccoeeoo
.ccccooo
..ccccoo
...sccnn
.....snn
........
........
"""
DETALHES_16 = [(10, 8, "w"), (11, 8, "e")]

# Brilhos do ícone do pack: (x, y, cor, braço) na grade de 44.
BRILHOS_PACK = [(6, 6, CREME, 2), (37, 37, CREME, 2), (38, 9, LARANJA_CLARO, 1), (7, 36, LARANJA_CLARO, 1)]


def raposa(metade: str, detalhes: list[tuple[int, int, str]]) -> Image.Image:
    img = contornar(pixel_art(espelhar(metade), CORES_RAPOSA), CONTORNO)
    px = img.load()
    for x, y, ch in detalhes:
        px[x, y] = rgba(CORES_RAPOSA[ch])
    return img


def logo() -> Image.Image:
    """128x128: emblema provisório (desenho 32x32 ampliado 4x), fundo transparente."""
    return ampliar(raposa(RAPOSA_32, DETALHES_32), 4)


def item_menu() -> Image.Image:
    return raposa(RAPOSA_16, DETALHES_16)


def pack_icon() -> Image.Image:
    """256x256: emblema num medalhão escuro sobre a cor do Vulpus.

    Desenhado numa grade de 44 com pixel de 6 (o mesmo tamanho de pixel da raposa) e cortado no centro.
    """
    n = 44
    base = Image.new("RGBA", (n, n), rgba(LARANJA))
    px = base.load()
    centro = n / 2
    for raio, cor in ((19.5, LARANJA_ESCURO), (18.5, FUNDO_CLARO), (17.5, FUNDO)):
        for y in range(n):
            for x in range(n):
                if (x + 0.5 - centro) ** 2 + (y + 0.5 - centro) ** 2 <= raio**2:
                    px[x, y] = rgba(cor)
    for x, y, cor, braco in BRILHOS_PACK:
        for d in range(-braco, braco + 1):
            px[x + d, y] = px[x, y + d] = rgba(cor)
    base.alpha_composite(raposa(RAPOSA_32, DETALHES_32), (6, 6))
    return ampliar(base, 6).crop((4, 4, 260, 260))


# ---------------------------------------------------------------- gravação


def assinatura(img: Image.Image) -> str:
    return f"{MARCA} {hashlib.sha1(img.convert('RGBA').tobytes()).hexdigest()[:16]}"


def intocado(caminho: Path) -> bool:
    """True se o PNG ainda é exatamente o que este script gerou."""
    try:
        with Image.open(caminho) as img:
            return img.info.get("Comment") == assinatura(img)
    except OSError:
        return False


def salvar_png(img: Image.Image, caminho: Path, forcar: bool) -> str:
    if caminho.exists() and not forcar and not intocado(caminho):
        return "mantido (trocado à mão; use --forcar para sobrescrever)"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    meta = PngImagePlugin.PngInfo()
    meta.add_text("Comment", assinatura(img))
    img.save(caminho, pnginfo=meta, optimize=True)
    return f"{img.width}x{img.height}"


def salvar_json(dados: dict, caminho: Path) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def principal() -> int:
    parser = argparse.ArgumentParser(description="Gera as texturas do addon Vulpus.")
    parser.add_argument("--forcar", action="store_true", help="sobrescreve também os PNGs trocados à mão")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # acentos certos também no Git Bash

    # nome -> (imagem, nineslice_size ou None)
    ui: dict[str, tuple[Image.Image, int | None]] = {
        "painel": (painel(), 8),
        "cabecalho": (cabecalho(), 4),
        **{nome: (botao(*estado), 4) for nome, estado in ESTADOS_BOTAO.items()},
        **{nome: (fechar(*estado), None) for nome, estado in ESTADOS_FECHAR.items()},
        "divisor": (divisor(), None),
        "logo": (logo(), None),
    }
    saidas: list[tuple[Path, str]] = []
    for nome, (img, nineslice) in ui.items():
        caminho = PASTA_UI / f"{nome}.png"
        saidas.append((caminho, salvar_png(img, caminho, args.forcar)))
        if nineslice:
            salvar_json({"nineslice_size": nineslice, "base_size": [img.width, img.height]}, caminho.with_suffix(".json"))

    caminho = PASTA_ITENS / "menu.png"
    saidas.append((caminho, salvar_png(item_menu(), caminho, args.forcar)))
    salvar_json(
        {
            "resource_pack_name": "vulpus",
            "texture_name": "atlas.items",
            "texture_data": {"vulpus_menu": {"textures": "textures/vulpus/itens/menu"}},
        },
        RP / "textures" / "item_texture.json",
    )

    icone = pack_icon()
    for pack in (BP, RP):
        caminho = pack / "pack_icon.png"
        saidas.append((caminho, salvar_png(icone, caminho, args.forcar)))

    for caminho, status in saidas:
        print(f"  {caminho.relative_to(ADDON).as_posix():48} {status}")
    print(f"Texturas prontas ({len(saidas)} PNGs).")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
