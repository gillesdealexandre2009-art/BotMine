#!/usr/bin/env python3
"""Analisa objetivamente cada .ogg de addon/Sons (menos _descartados) e grava Sons/_analise.csv.

Uso, a partir da pasta addon/:
    python tools/sons_analisar.py

Por arquivo mede (ffprobe/ffmpeg): duração, canais, loudness integrado (LUFS) e faixa de loudness (LRA) via ebur128, pico
verdadeiro (dBTP), 'brilho' (centroide e rolloff espectrais médios), 'planura' espectral (flatness, perto de 1 = ruído, perto de
0 = tom), 'fluxo' espectral (flux, quanto o timbre muda de um instante ao outro) e a proporção de silêncio (silencedetect).
Junta com o título/fonte de _creditos.txt da pasta. Depois classifica em TAGS por regras simples (os limiares estão em LIMIARES,
logo abaixo, para o dono ajustar):

  escura / neutra / clara   centroide médio: < 1500 Hz / 1500..3000 Hz / > 3000 Hz
  calma / agitada           flux médio <= 0.02 (ou LRA <= 6 e flux <= 0.05) = calma; flux > 0.05 = agitada; resto = mediana
  curta / media / longa     duração < 8 s (pontual) / 8..90 s / > 90 s (música ou camada longa)
  loop                      o nome (ou o título) tem 'loop'
  ruido / tonal / mista     flatness médio > 0.30 / < 0.05 / entre os dois
  quase_silencio            mais de 40% do arquivo em silêncio (< -50 dB por 0,5 s)
  baixo                     loudness integrado < -35 LUFS (precisa ganho)

As tags são só ponto de partida: a escolha por ambiente fica em Sons/_ambientes.json (editável). Precisa de ffmpeg no PATH.
"""
from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ADDON = Path(__file__).resolve().parent.parent
SONS = ADDON / "Sons"
SAIDA = SONS / "_analise.csv"

LIMIARES = {
    "centroide_escuro": 1500.0,
    "centroide_claro": 3000.0,
    "flux_calmo": 0.02,
    "flux_agitado": 0.05,
    "lra_calmo": 6.0,
    "curta_s": 8.0,
    "longa_s": 90.0,
    "ruido": 0.30,
    "tonal": 0.05,
    "silencio_pct": 40.0,
    "baixo_lufs": -35.0,
}

COLUNAS = [
    "arquivo", "pasta", "titulo", "fonte", "duracao_s", "canais", "lufs", "lra", "pico_dbtp", "centroide_hz", "rolloff_hz",
    "flatness", "flux", "silencio_pct", "tags",
]


def rodar(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def sondar(arq: Path) -> tuple[float, int]:
    r = rodar(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "format=duration:stream=channels", "-of", "json", str(arq)])
    try:
        j = json.loads(r.stdout)
        dur, canais = float(j["format"].get("duration", 0) or 0), int(j["streams"][0]["channels"])
    except (ValueError, KeyError, IndexError, json.JSONDecodeError):
        return 0.0, 0
    if dur <= 0:  # alguns .ogg não trazem a duração no cabeçalho: decodifica tudo e lê o último 'time='
        r = rodar(["ffmpeg", "-hide_banner", "-i", str(arq), "-f", "null", "-"])
        t = re.findall(r"time=(\d+):(\d+):([\d.]+)", r.stderr)
        if t:
            h, m, s = t[-1]
            dur = int(h) * 3600 + int(m) * 60 + float(s)
    return dur, canais


def medir(arq: Path) -> dict:
    """Uma passada do ffmpeg: ebur128 + (mono) silencedetect + aspectralstats impressos por ametadata."""
    filtro = (
        "ebur128=peak=true:framelog=quiet,aformat=channel_layouts=mono,silencedetect=n=-50dB:d=0.5,"
        "aspectralstats=measure=centroid+rolloff+flatness+flux,ametadata=mode=print:file=-"
    )
    r = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", str(arq), "-af", filtro, "-f", "null", "-"])
    out, err = r.stdout, r.stderr
    med: dict[str, list[float]] = {"centroid": [], "rolloff": [], "flatness": [], "flux": []}
    for m in re.finditer(r"lavfi\.aspectralstats\.1\.(centroid|rolloff|flatness|flux)=(\S+)", out):
        try:
            med[m.group(1)].append(float(m.group(2)))
        except ValueError:
            pass
    media = lambda v: sum(v) / len(v) if v else 0.0  # noqa: E731
    def pega(padrao: str) -> float:
        m = re.search(padrao, err)
        return float(m.group(1)) if m else float("nan")
    sil = sum(float(x) for x in re.findall(r"silence_duration:\s*([\d.]+)", err))
    # silêncio sem fim registrado (vai até o fim do arquivo)
    ini = re.findall(r"silence_start:\s*([\d.]+)", err)
    fim = re.findall(r"silence_end:\s*([\d.]+)", err)
    return {
        "lufs": pega(r"I:\s*(-?[\d.]+)\s*LUFS"),
        "lra": pega(r"LRA:\s*([\d.]+)\s*LU"),
        "pico": pega(r"Peak:\s*(-?[\d.]+)\s*dBFS"),
        "centroid": media(med["centroid"]),
        "rolloff": media(med["rolloff"]),
        "flatness": media(med["flatness"]),
        "flux": media(med["flux"]),
        "sil_s": sil,
        "sil_aberto": len(ini) > len(fim),
        "sil_ini": float(ini[-1]) if ini else 0.0,
    }


def creditos(pasta: Path) -> dict[str, tuple[str, str]]:
    """nome do arquivo -> (título, fonte) lendo _creditos.txt (linhas 'arq  <- Título  URL (licença)' ou 'arq  <- URL (licença)')."""
    saida: dict[str, tuple[str, str]] = {}
    arq = pasta / "_creditos.txt"
    if not arq.is_file():
        return saida
    for l in arq.read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r"^(\S+\.ogg)\s+<-\s+(.*)$", l.strip())
        if not m:
            continue
        resto = m.group(2)
        u = re.search(r"https?://\S+", resto)
        url = u.group(0) if u else ""
        titulo = resto[: u.start()].strip() if u else resto.strip()
        saida[m.group(1)] = (titulo, url)
    return saida


def classificar(a: dict) -> list[str]:
    L = LIMIARES
    tags: list[str] = []
    c, d = a["centroide_hz"], a["duracao_s"]
    tags.append("escura" if c < L["centroide_escuro"] else "clara" if c > L["centroide_claro"] else "neutra")
    fx, lra = a["flux"], a["lra"]
    if fx <= L["flux_calmo"] or (lra == lra and lra <= L["lra_calmo"] and fx <= L["flux_agitado"]):
        tags.append("calma")
    elif fx > L["flux_agitado"]:
        tags.append("agitada")
    else:
        tags.append("mediana")
    tags.append("curta" if d < L["curta_s"] else "longa" if d > L["longa_s"] else "media")
    if "loop" in a["arquivo"].lower() or "loop" in a["titulo"].lower():
        tags.append("loop")
    f = a["flatness"]
    tags.append("ruido" if f > L["ruido"] else "tonal" if f < L["tonal"] else "mista")
    if a["silencio_pct"] > L["silencio_pct"]:
        tags.append("quase_silencio")
    if a["lufs"] == a["lufs"] and a["lufs"] < L["baixo_lufs"]:
        tags.append("baixo")
    return tags


def analisar(arq: Path, cred: dict[str, tuple[str, str]]) -> dict:
    dur, canais = sondar(arq)
    m = medir(arq)
    sil = m["sil_s"] + (max(0.0, dur - m["sil_ini"]) if m["sil_aberto"] else 0.0)
    titulo, fonte = cred.get(arq.name, ("", ""))
    if not titulo and arq.parent.name != "lofi":
        titulo = "(sintético, tools/sons_gerar.py)" if not fonte else ""
    a = {
        "arquivo": arq.relative_to(SONS).as_posix(),
        "pasta": arq.parent.name,
        "titulo": titulo,
        "fonte": fonte,
        "duracao_s": round(dur, 2),
        "canais": canais,
        "lufs": round(m["lufs"], 1),
        "lra": round(m["lra"], 1),
        "pico_dbtp": round(m["pico"], 1),
        "centroide_hz": round(m["centroid"]),
        "rolloff_hz": round(m["rolloff"]),
        "flatness": round(m["flatness"], 3),
        "flux": round(m["flux"], 3),
        "silencio_pct": round(100 * sil / dur, 1) if dur else 0.0,
    }
    a["tags"] = " ".join(classificar(a))
    return a


def listar() -> list[Path]:
    achados = []
    for p in sorted(SONS.rglob("*.ogg")):
        rel = p.relative_to(SONS).parts
        if rel[0].startswith("_"):
            continue
        achados.append(p)
    return achados


def main() -> int:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("ffmpeg/ffprobe não encontrados no PATH")
        return 1
    arqs = listar()
    cache: dict[Path, dict[str, tuple[str, str]]] = {}
    for a in arqs:
        cache.setdefault(a.parent, creditos(a.parent))
    print(f"analisando {len(arqs)} arquivos...")
    with ThreadPoolExecutor(max_workers=6) as ex:
        linhas = list(ex.map(lambda a: analisar(a, cache[a.parent]), arqs))
    with SAIDA.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUNAS, delimiter=";")
        w.writeheader()
        w.writerows(linhas)
    print(f"gravado {SAIDA} ({len(linhas)} linhas)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
