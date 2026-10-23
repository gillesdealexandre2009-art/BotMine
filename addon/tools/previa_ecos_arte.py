"""Prévias ampliadas (nearest, 8x) da arte do evento Ecos dos Ausentes, sem abrir o jogo.

Uso, a partir de addon/:  python tools/previa_ecos_arte.py
Saída em docs/previas/: ecos_arte_icones.png, ecos_arte_armadura.png, ecos_arte_<criatura>.png, ecos_arte_criaturas.png
Lê as texturas já geradas (rode antes gerar_ecos_itens.py e gerar_ecos_criaturas.py). "Antes" vem do git (HEAD), se houver.
"""
import io
import os
import subprocess

from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
RP = os.path.join(RAIZ, "vulpus_rp")
OUT = os.path.join(RAIZ, "docs", "previas")
Z = 8
ICONES = ["fragmento_alma", "ausente_helmet", "ausente_chestplate", "ausente_leggings", "ausente_boots", "varinha_lamento"]
CRIATURAS = {  # nome: (largura, altura da textura, braço/perna fino?)
    "errante": (64, 64, False), "sentinela": (64, 32, True), "memoria": (64, 64, False), "testemunho": (64, 64, False),
}


def abrir(rel):
    return Image.open(os.path.join(RP, rel)).convert("RGBA")


def antes(rel):
    """Versão do HEAD (arte anterior), ou None."""
    try:
        b = subprocess.run(["git", "show", "HEAD:addon/vulpus_rp/" + rel], cwd=RAIZ, capture_output=True, check=True).stdout
        return Image.open(io.BytesIO(b)).convert("RGBA")
    except Exception:
        return None


def xadrez(w, h, a=(52, 50, 64), b=(62, 60, 76), n=8):
    im = Image.new("RGBA", (w, h), a)
    d = ImageDraw.Draw(im)
    for y in range(0, h, n):
        for x in range(0, w, n):
            if (x // n + y // n) % 2:
                d.rectangle([x, y, x + n - 1, y + n - 1], fill=b)
    return im


def sobre(fundo, img, pos, z=Z):
    g = img.resize((img.width * z, img.height * z), Image.NEAREST)
    fundo.alpha_composite(g, pos)


def previa_icones():
    cel = 16 * Z + 16
    im = Image.new("RGBA", (cel * len(ICONES), cel * 3 + 16), (24, 22, 34, 255))
    d = ImageDraw.Draw(im)
    for i, n in enumerate(ICONES):
        rel = f"textures/vulpus/itens/{n}.png"
        for j, (src, fundo) in enumerate(((antes(rel), (60, 58, 70)), (abrir(rel), (60, 58, 70)), (abrir(rel), (198, 198, 198)))):
            x, y = i * cel + 8, j * cel + 8
            d.rectangle([x - 4, y - 4, x + 16 * Z + 3, y + 16 * Z + 3], fill=fundo + (255,))
            if src is not None:
                sobre(im, src, (x, y))
    # tamanho real (1x e 2x) no rodapé
    for i, n in enumerate(ICONES):
        im.alpha_composite(abrir(f"textures/vulpus/itens/{n}.png"), (i * cel + 8, cel * 3 + 8 - 8 + 8))
    im.save(os.path.join(OUT, "ecos_arte_icones.png"))


def _bloco(img, box, z=1):
    return img.crop(box)


def figura(skin, tipo, vista, fino=False, camadas=()):
    """Monta frente ou costas (1x) a partir do UV: cabeça, tronco, braços e pernas."""
    aw = 2 if fino else 4
    ox = 0 if vista == "frente" else 1  # costas
    cab = skin.crop((8, 8, 16, 16)) if vista == "frente" else skin.crop((24, 8, 32, 16))
    cor = skin.crop((20, 20, 28, 32)) if vista == "frente" else skin.crop((32, 20, 40, 32))
    if fino:
        br = skin.crop((42, 18, 44, 30)) if vista == "frente" else skin.crop((46, 18, 48, 30))
        pe = skin.crop((2, 18, 4, 30)) if vista == "frente" else skin.crop((6, 18, 8, 30))
    else:
        br = skin.crop((44, 20, 48, 32)) if vista == "frente" else skin.crop((52, 20, 56, 32))
        pe = skin.crop((4, 20, 8, 32)) if vista == "frente" else skin.crop((12, 20, 16, 32))
    W, H = 8 + 2 * aw, 32
    f = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f.alpha_composite(cab, (aw, 0))
    f.alpha_composite(cor, (aw, 8))
    f.alpha_composite(br, (0, 8))
    f.alpha_composite(br, (aw + 8, 8))
    xs = (aw + 2, aw + 4) if fino else (aw, aw + 4)
    for x in xs:
        f.alpha_composite(pe, (x, 20))
    return f


def previa_criatura(nome):
    w, h, fino = CRIATURAS[nome]
    skin = abrir(f"textures/vulpus/entidades/ecos_{nome}.png")
    ant = antes(f"textures/vulpus/entidades/ecos_{nome}.png")
    fr, co = figura(skin, nome, "frente", fino), figura(skin, nome, "costas", fino)
    z = 12
    fw, fh = fr.width * z, fr.height * z
    larg = max(w * 6, fw * 2 + 90) + 40
    im = Image.new("RGBA", (larg + 6 * 0 + (w * 4 if False else 0), fh + h * 6 + 60), (30, 28, 40, 255))
    d = ImageDraw.Draw(im)
    fundo = xadrez(fw * 2 + 60, fh + 20, (70, 70, 86), (80, 80, 98), 16)
    im.alpha_composite(fundo, (10, 10))
    sobre(im, fr, (30, 20), z)
    sobre(im, co, (30 + fw + 20, 20), z)
    # uv completo ampliado, com a versão anterior ao lado
    y0 = fh + 40
    uv = xadrez(w * 6, h * 6, (70, 70, 86), (80, 80, 98), 12)
    im.alpha_composite(uv, (10, y0))
    sobre(im, skin, (10, y0), 6)
    if ant is not None:
        x0 = 10 + w * 6 + 10
        if x0 + w * 3 <= im.width:
            sobre(im, ant, (x0, y0), 3)
    im.save(os.path.join(OUT, f"ecos_arte_{nome}.png"))
    return fr, co, ant


def previa_armadura():
    from PIL import ImageChops
    l1, l2 = abrir("textures/models/armor/ausente_1.png"), abrir("textures/models/armor/ausente_2.png")
    a1, a2 = antes("textures/models/armor/ausente_1.png"), antes("textures/models/armor/ausente_2.png")
    z = 8
    im = Image.new("RGBA", (64 * z * 2 + 30, 32 * z * 2 + 30 + 560), (24, 22, 34, 255))
    for j, (arm, ant) in enumerate(((l1, a1), (l2, a2))):
        for i, src in enumerate((ant, arm)):
            x, y = 10 + i * (64 * z + 10), 10 + j * (32 * z + 10)
            im.alpha_composite(xadrez(64 * z, 32 * z, (70, 70, 86), (80, 80, 98), 16), (x, y))
            if src is not None:
                sobre(im, src, (x, y), z)
    # figura vestida: pele neutra + camadas, frente e costas
    pele = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    for box in ((0, 0, 32, 16), (16, 16, 40, 32), (40, 16, 56, 32), (0, 16, 16, 32)):
        pele.paste(Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (196, 162, 140, 255)), box[:2])
    base = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    for src in (pele, l2, l1):
        base.alpha_composite(src)
    # troca de pele por cinza escuro onde nenhuma camada pinta, para a armadura ler melhor
    fr, co = figura(base, "", "frente"), figura(base, "", "costas")
    z2 = 16
    y0 = 32 * z * 2 + 30
    im.alpha_composite(xadrez(fr.width * z2 * 2 + 60, fr.height * z2 + 20, (70, 70, 86), (80, 80, 98), 16), (10, y0 - 0))
    sobre(im, fr, (30, y0 + 10), z2)
    sobre(im, co, (30 + fr.width * z2 + 30, y0 + 10), z2)
    # recortes das 4 peças em escala 1 ao lado
    im.save(os.path.join(OUT, "ecos_arte_armadura.png"))


def main():
    os.makedirs(OUT, exist_ok=True)
    previa_icones()
    previa_armadura()
    figs = [previa_criatura(n) for n in CRIATURAS]
    # montagem das quatro criaturas lado a lado (frente), na proporção do jogo (testemunho 2.2x, sentinela 1.2x)
    esc = {"errante": 1.0, "sentinela": 1.2, "memoria": 1.05, "testemunho": 2.2}
    z = 6
    im = Image.new("RGBA", (900, int(32 * 2.2 * z) + 30), (30, 28, 40, 255))
    im.alpha_composite(xadrez(im.width, im.height, (46, 44, 60), (52, 50, 68), 24))
    x = 20
    for (nome, (fr, co, _)) in zip(CRIATURAS, figs):
        s = esc[nome] * z
        g = fr.resize((int(fr.width * s), int(fr.height * s)), Image.NEAREST)
        im.alpha_composite(g, (x, im.height - 15 - g.height))
        x += g.width + 30
    im.save(os.path.join(OUT, "ecos_arte_criaturas.png"))
    print("previas em", OUT)


if __name__ == "__main__":
    main()
