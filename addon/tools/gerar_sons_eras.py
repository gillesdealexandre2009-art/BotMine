#!/usr/bin/env python3
"""Gera o fundo sonoro contínuo de cada Era (sintético, 100% nosso: sem direitos autorais) com o ffmpeg.

Uso, a partir da pasta addon/:
    python tools/gerar_sons_eras.py            (gera as 20 e atualiza sound_definitions.json)
    python tools/gerar_sons_eras.py 04 12      (só as Eras 4 e 12)

Saída: vulpus_rp/sounds/vulpus/era_NN.ogg (mono, 22,05 kHz, Vorbis q1, ~24 s, ~130 KB cada: as 20 juntas ficam abaixo de 3 MB) e as
entradas vulpus.era_NN em vulpus_rp/sounds/sound_definitions.json (as outras entradas não são mexidas). Cada arquivo é um loop sem
estalo (a emenda é feita em volta do meio do arquivo) com 1 s de fade nas pontas: o jogo repete a cada 23 s, então o fim de um
entra no começo do outro como um fundo único. Precisa do ffmpeg no PATH.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "vulpus_rp" / "sounds"
PASTA = RAIZ / "vulpus"
SR = 22050
DURACAO = 26  # fonte; sai com DURACAO - CRUZ segundos
CRUZ = 2
FADE = 1
QUALIDADE = 1


def ffmpeg(*args: str) -> None:
    r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("ffmpeg falhou:\n" + r.stderr[-1500:])


ALVO_DB = -23.0  # volume médio de todos os fundos (assim nenhum Era é muito mais alta que as outras)


def volume_medio(arq: Path) -> float:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(arq), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    for linha in r.stderr.splitlines():
        if "mean_volume" in linha:
            return float(linha.split("mean_volume:")[1].split("dB")[0])
    return ALVO_DB


def ruido(cor: str, filtros: str, amp: float = 0.6) -> str:
    """Fonte de ruído (white, pink, brown) com uma cadeia de filtros."""
    return f"anoisesrc=d={DURACAO}:c={cor}:r={SR}:a={amp},{filtros}"


def tons(notas: list[tuple[float, float]], modulacao: float = 0.1, fundo: float = 0.55) -> str:
    """Pad de senoides (frequência, ganho) com respiração lenta (a frequência de modulação tem ciclos inteiros no loop)."""
    soma = "+".join(f"{g}*sin(2*PI*{f}*t)" for f, g in notas)
    return f"aevalsrc='({soma})*({fundo}+{round(1 - fundo, 2)}*sin(2*PI*{modulacao}*t))*0.25':s={SR}:d={DURACAO}"


def pulsos(freq: float, periodo: float, queda: float, ganho: float = 0.9) -> str:
    """Batida grave periódica (coração, trem, sino surdo)."""
    return f"aevalsrc='{ganho}*sin(2*PI*{freq}*t)*exp(-{queda}*mod(t,{periodo}))':s={SR}:d={DURACAO}"


def misturar(*fontes: tuple[str, float]) -> list[str]:
    """Argumentos do ffmpeg que misturam várias fontes lavfi com ganhos."""
    args: list[str] = []
    for fonte, _ in fontes:
        args += ["-f", "lavfi", "-i", fonte]
    pesos = " ".join(str(g) for _, g in fontes)
    entradas = "".join(f"[{i}:a]" for i in range(len(fontes)))
    args += ["-filter_complex", f"{entradas}amix=inputs={len(fontes)}:weights='{pesos}':normalize=0[m]", "-map", "[m]"]
    return args


# receitas por Era: lista de (fonte, ganho). Frequências de modulação em múltiplos de 1/26 s para fechar ciclos no loop.
VENTO_SUAVE = ruido("brown", "lowpass=f=700,highpass=f=60,tremolo=f=0.115:d=0.55")
RECEITAS: dict[str, list[tuple[str, float]]] = {
    # 01: floresta viva: vento leve, folhas (ruído agudo) e um pad quente
    "01": [(VENTO_SUAVE, 0.7), (ruido("pink", "highpass=f=3500,lowpass=f=7000,tremolo=f=0.23:d=0.8", 0.25), 0.35), (tons([(196, 1), (293.7, 0.6)], 0.077), 0.4)],
    # 02: outono: ventania com folhas secas
    "02": [(ruido("brown", "lowpass=f=900,highpass=f=80,tremolo=f=0.153:d=0.7"), 0.8), (ruido("white", "bandpass=f=2800:w=1800,tremolo=f=0.31:d=0.9", 0.18), 0.35)],
    # 03: grilos noturnos e um pad azul
    "03": [(ruido("white", "bandpass=f=4600:w=240,tremolo=f=15:d=1", 0.5), 0.45), (ruido("brown", "lowpass=f=260", 0.5), 0.5), (tons([(110, 1), (164.8, 0.5)], 0.077), 0.35)],
    # 04: inverno: vento frio e longo
    "04": [(ruido("brown", "lowpass=f=1100,highpass=f=180,tremolo=f=0.1:d=0.7"), 0.8), (ruido("white", "bandpass=f=5200:w=1500,tremolo=f=0.115:d=0.9", 0.12), 0.25)],
    # 05: primavera: pad claro e brisa, melancólico
    "05": [(tons([(261.6, 1), (329.6, 0.7), (392, 0.5)], 0.077), 0.55), (ruido("pink", "highpass=f=2500,lowpass=f=6000,tremolo=f=0.19:d=0.8", 0.2), 0.3)],
    # 06: sonho: drone etéreo largo
    "06": [(tons([(98, 1), (147, 0.8), (196.4, 0.6), (294.2, 0.4)], 0.058, 0.35), 0.8), (ruido("pink", "lowpass=f=1800,tremolo=f=0.1:d=0.7", 0.25), 0.3)],
    # 07: jardim impossível: pad lilás com brilhos agudos
    "07": [(tons([(220, 1), (277.2, 0.8), (329.6, 0.6), (440.6, 0.3)], 0.096), 0.6), (ruido("white", "bandpass=f=6200:w=900,tremolo=f=0.35:d=1", 0.1), 0.25)],
    # 08: floresta que observa: grave, vento por entre árvores, um zumbido
    "08": [(ruido("brown", "lowpass=f=500,highpass=f=50,tremolo=f=0.1:d=0.8"), 0.9), (tons([(73.4, 1), (110.2, 0.4)], 0.115, 0.4), 0.5), (ruido("pink", "bandpass=f=1500:w=500,tremolo=f=0.27:d=0.9", 0.12), 0.3)],
    # 09: corredor: zumbido de lâmpada e ar parado
    "09": [(tons([(120, 1), (240, 0.35), (360, 0.18)], 0.038, 0.85), 0.5), (ruido("pink", "lowpass=f=400", 0.2), 0.3)],
    # 10: campo de trigo: vento seco e pad quente
    "10": [(ruido("brown", "lowpass=f=800,highpass=f=70,tremolo=f=0.115:d=0.6"), 0.7), (ruido("pink", "highpass=f=4000,lowpass=f=8000,tremolo=f=0.31:d=0.9", 0.15), 0.3), (tons([(174.6, 1), (261.6, 0.6)], 0.077), 0.35)],
    # 11: coisas esquecidas: ar pesado, grave e gasto
    "11": [(ruido("brown", "lowpass=f=420,highpass=f=40,tremolo=f=0.1:d=0.6"), 0.9), (ruido("pink", "bandpass=f=900:w=300,tremolo=f=0.19:d=0.9", 0.1), 0.3)],
    # 12: lua rubra: batida grave e zumbido
    "12": [(pulsos(52, 1.3, 9), 0.95), (tons([(55, 1), (82.4, 0.5)], 0.077, 0.5), 0.55), (ruido("brown", "lowpass=f=300", 0.5), 0.5)],
    # 13: erro de realidade: estática e hum instável
    "13": [(ruido("white", "bandpass=f=3200:w=2200,tremolo=f=7:d=1", 0.25), 0.35), (tons([(50, 1), (100, 0.7), (150, 0.4)], 0.115, 0.3), 0.55)],
    # 14: vila vazia: vento e um pad vazio
    "14": [(ruido("brown", "lowpass=f=650,highpass=f=90,tremolo=f=0.1:d=0.6"), 0.75), (tons([(146.8, 1), (220, 0.5)], 0.058), 0.35)],
    # 15: flor dourada: caixinha de música abafada (pulsos agudos) e pad escuro
    "15": [(tons([(130.8, 1), (196, 0.6)], 0.058, 0.4), 0.55), (pulsos(523, 2.6, 6, 0.35), 0.4), (ruido("brown", "lowpass=f=300", 0.4), 0.35)],
    # 16: sala branca: quase nada, só um hum fino
    "16": [(tons([(440, 1), (660, 0.3)], 0.038, 0.9), 0.18)],
    # 17: mar sem estrelas: ondas longas
    "17": [(ruido("pink", "lowpass=f=1300,highpass=f=70,tremolo=f=0.153:d=0.85"), 0.85), (tons([(65.4, 1), (98, 0.5)], 0.077, 0.4), 0.5)],
    # 18: véu: drone dourado rachado
    "18": [(tons([(87.3, 1), (130.8, 0.6), (174.6, 0.5), (233, 0.25)], 0.096, 0.3), 0.7), (ruido("white", "bandpass=f=5000:w=2500,tremolo=f=5.5:d=1", 0.1), 0.25)],
    # 19: tudo o que restou: mistura macia de pads e brisa
    "19": [(tons([(164.8, 1), (246.9, 0.7), (329.6, 0.5)], 0.077), 0.5), (ruido("brown", "lowpass=f=700,tremolo=f=0.115:d=0.6"), 0.5), (ruido("pink", "highpass=f=3500,tremolo=f=0.23:d=0.8", 0.12), 0.25)],
    # 20: a passagem: coro (pad aberto) subindo e descendo devagar
    "20": [(tons([(130.8, 1), (196, 0.8), (261.6, 0.7), (392, 0.5), (523.2, 0.3)], 0.077, 0.3), 0.8), (ruido("pink", "lowpass=f=2200,tremolo=f=0.1:d=0.7", 0.2), 0.3)],
}


def gerar(num: str) -> Path:
    PASTA.mkdir(parents=True, exist_ok=True)
    destino = PASTA / f"era_{num}.ogg"
    with tempfile.TemporaryDirectory() as t:
        bruto = Path(t) / "bruto.wav"
        ffmpeg(*misturar(*RECEITAS[num]), "-t", str(DURACAO), "-ar", str(SR), "-ac", "1", str(bruto))
        # emenda: segunda metade + primeira metade, com fade cruzado no encontro
        meio = DURACAO / 2
        emendado = Path(t) / "loop.wav"
        ffmpeg(
            "-i", str(bruto), "-i", str(bruto),
            "-filter_complex",
            f"[0:a]atrim=start={meio},asetpts=PTS-STARTPTS[b];[1:a]atrim=end={meio},asetpts=PTS-STARTPTS[a];[b][a]acrossfade=d={CRUZ}:c1=tri:c2=tri[o]",
            "-map", "[o]", str(emendado),
        )
        tamanho = DURACAO - CRUZ
        ganho = max(-12.0, min(18.0, ALVO_DB - volume_medio(emendado)))
        ffmpeg(
            "-i", str(emendado),
            "-af", f"volume={ganho:.1f}dB,alimiter=limit=0.89,afade=t=in:d={FADE},afade=t=out:st={tamanho - FADE}:d={FADE}",
            "-ac", "1", "-ar", str(SR), "-c:a", "libvorbis", "-q:a", str(QUALIDADE), str(destino),
        )
    return destino


def definir(numeros: list[str]) -> None:
    arq = RAIZ / "sound_definitions.json"
    dados = json.loads(arq.read_text(encoding="utf-8-sig"))
    defs = dados["sound_definitions"]
    for n in numeros:
        defs[f"vulpus.era_{n}"] = {
            "category": "ambient",
            "sounds": [{"name": f"sounds/vulpus/era_{n}", "volume": 1, "load_on_low_memory": True}],
            "max_distance": 64,
            "min_distance": 48,
        }
    arq.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    quais = sys.argv[1:] or sorted(RECEITAS)
    total = 0
    for n in quais:
        n = n.zfill(2)
        arq = gerar(n)
        total += arq.stat().st_size
        print(f"era_{n}.ogg {arq.stat().st_size / 1024:.0f} KB")
    definir([n.zfill(2) for n in quais])
    print(f"total {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
