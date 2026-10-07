"""Rabiscos da Kiza: transforma uma lista de formas simples (JSON feito pela IA) num desenho "de caderno".

Só formas básicas (linha, retângulo, elipse, polígono, texto) com limites rígidos, porque o JSON vem de um modelo.
O traço é tremido de propósito: cada contorno é desenhado duas vezes com um pequeno desvio.
"""
from __future__ import annotations

import io
import json
import math
import random
import re
import unicodedata
from typing import Any, Optional

from PIL import Image, ImageDraw, ImageFont

LARGURA, ALTURA = 800, 600
ESCALA = 2  # desenha em 2x e reduz: serrilhado some
MAX_ITENS = 150
MAX_PONTOS = 60
RE_COR = re.compile(r"^#[0-9a-fA-F]{6}$")
FUNDO_PADRAO = "#fffdf5"
TRACO_PADRAO = "#3a3a4a"


def _fonte(tam: int) -> tuple[ImageFont.FreeTypeFont | ImageFont.ImageFont, bool]:
    """(fonte, aceita_acentos). Tenta fontes comuns com acento; senão a padrão do Pillow (sem acento)."""
    for nome in ("DejaVuSans.ttf", "arial.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(nome, tam), True
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=tam), False
    except TypeError:  # Pillow antigo: sem tamanho
        return ImageFont.load_default(), False


def _sem_acento(txt: str) -> str:
    return unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode()


def extrair_json(bruto: str) -> Optional[dict]:
    """Pega o objeto JSON da resposta (o modelo às vezes embrulha em ```). Se vier cortado, aproveita os itens completos."""
    ini = bruto.find("{")
    if ini < 0:
        return None
    fim = bruto.rfind("}")
    candidatos = [bruto[ini : fim + 1]] if fim > ini else []
    corte = bruto.rfind("},")  # resposta cortada no meio de um item: fecha depois do último item inteiro
    if corte > ini:
        candidatos.append(bruto[ini : corte + 1] + "]}")
    for texto in candidatos:
        try:
            dados = json.loads(texto)
        except ValueError:
            continue
        if isinstance(dados, dict):
            return dados
    return None


def _num(v: Any, minimo: float, maximo: float, padrao: float) -> float:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return padrao
    if math.isnan(n) or math.isinf(n):
        return padrao
    return max(minimo, min(maximo, n))


def _cor(v: Any, padrao: Optional[str]) -> Optional[str]:
    return v if isinstance(v, str) and RE_COR.match(v) else padrao


def _pontos(v: Any) -> list[tuple[float, float]]:
    if not isinstance(v, list):
        return []
    saida = []
    for p in v[:MAX_PONTOS]:
        if isinstance(p, (list, tuple)) and len(p) == 2:
            saida.append((_num(p[0], 0, LARGURA, 0), _num(p[1], 0, ALTURA, 0)))
    return saida


def _tremer(pts: list[tuple[float, float]], rng: random.Random, fechar: bool) -> list[tuple[float, float]]:
    """Quebra cada segmento em pedaços e desvia um pouquinho, como mão livre."""
    if fechar and pts:
        pts = pts + [pts[0]]
    saida: list[tuple[float, float]] = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        passos = max(1, int(math.hypot(x2 - x1, y2 - y1) / 18))
        for i in range(passos):
            t = i / passos
            saida.append((x1 + (x2 - x1) * t + rng.uniform(-1.8, 1.8), y1 + (y2 - y1) * t + rng.uniform(-1.8, 1.8)))
    if pts:
        saida.append((pts[-1][0] + rng.uniform(-1.5, 1.5), pts[-1][1] + rng.uniform(-1.5, 1.5)))
    return saida


def _elipse_pts(x: float, y: float, w: float, h: float) -> list[tuple[float, float]]:
    cx, cy = x + w / 2, y + h / 2
    return [(cx + math.cos(a) * w / 2, cy + math.sin(a) * h / 2) for a in (i * math.tau / 28 for i in range(28))]


def desenhar(spec: dict, semente: Optional[int] = None) -> bytes:
    """PNG (bytes) do rabisco descrito em `spec`. Entradas inválidas são ignoradas, nunca quebram."""
    rng = random.Random(semente)
    img = Image.new("RGB", (LARGURA * ESCALA, ALTURA * ESCALA), _cor(spec.get("fundo"), FUNDO_PADRAO))
    d = ImageDraw.Draw(img)
    itens = spec.get("itens")
    itens = itens[:MAX_ITENS] if isinstance(itens, list) else []

    def esc(pts):
        return [(x * ESCALA, y * ESCALA) for x, y in pts]

    for item in itens:
        if not isinstance(item, dict):
            continue
        tipo = item.get("t")
        cor = _cor(item.get("cor"), TRACO_PADRAO) or TRACO_PADRAO
        preench = _cor(item.get("preench"), None)
        grossura = int(_num(item.get("e"), 1, 8, 3)) * ESCALA
        if tipo == "texto":
            txt = str(item.get("txt", ""))[:60]
            tam = int(_num(item.get("tam"), 12, 48, 22)) * ESCALA
            fonte, acentos = _fonte(tam)
            if not acentos:
                txt = _sem_acento(txt)
            d.text(
                (_num(item.get("x"), 0, LARGURA, 0) * ESCALA, _num(item.get("y"), 0, ALTURA, 0) * ESCALA),
                txt, fill=cor, font=fonte,
            )
            continue
        if tipo == "linha":
            pts, fechar = _pontos(item.get("pts")), False
        elif tipo == "poli":
            pts, fechar = _pontos(item.get("pts")), True
        elif tipo in ("ret", "elipse"):
            x, y = _num(item.get("x"), 0, LARGURA, 0), _num(item.get("y"), 0, ALTURA, 0)
            w, h = _num(item.get("w"), 1, LARGURA, 10), _num(item.get("h"), 1, ALTURA, 10)
            pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)] if tipo == "ret" else _elipse_pts(x, y, w, h)
            fechar = True
        else:
            continue
        if len(pts) < 2:
            continue
        if fechar and preench and len(pts) >= 3:
            d.polygon(esc(pts), fill=preench)
        for _ in range(2):  # duas passadas desencontradas = cara de caneta no caderno
            d.line(esc(_tremer(pts, rng, fechar)), fill=cor, width=grossura, joint="curve")

    img = img.resize((LARGURA, ALTURA), Image.LANCZOS)
    saida = io.BytesIO()
    img.save(saida, format="PNG", optimize=True)
    return saida.getvalue()
