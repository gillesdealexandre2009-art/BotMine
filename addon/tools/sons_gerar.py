#!/usr/bin/env python3
"""Gera sons sintéticos (ffmpeg) para as pastas de addon/Sons: ambientes dreamcore, estática, drones, caixa de música etc.

Uso, a partir da pasta addon/:
    python tools/sons_gerar.py            (gera tudo)
    python tools/sons_gerar.py caixa      (só o que tiver "caixa" no nome)

Todos saem em .ogg (Vorbis), em addon/Sons/<pasta>/. Os loops foram feitos para emendar sem estalo: ou têm ciclos inteiros
(sons de tom puro) ou passam pelo truque de emenda (o fim vira o começo, com fade cruzado). Sons sintéticos são 100% nossos:
sem direitos autorais.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "Sons"
FFMPEG = "ffmpeg"
SR = 44100


def rodar(args: list[str]) -> None:
    r = subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("ffmpeg falhou:\n" + r.stderr[-1500:])


def saida(pasta: str, nome: str) -> Path:
    destino = RAIZ / pasta
    destino.mkdir(parents=True, exist_ok=True)
    return destino / f"{nome}.ogg"


def para_ogg(entrada: Path, destino: Path, canais: int = 1, qualidade: int = 4) -> None:
    rodar(["-i", str(entrada), "-ac", str(canais), "-ar", str(SR), "-c:a", "libvorbis", "-q:a", str(qualidade), str(destino)])


def emendar_loop(entrada: Path, destino: Path, cruzamento: float = 1.5) -> None:
    """Truque de loop sem estalo: toca a segunda metade, depois a primeira, com fade cruzado no meio. O fim do arquivo
    continua exatamente no começo."""
    # duração
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(entrada)], capture_output=True, text=True)
    total = float(r.stdout.strip())
    meio = total / 2
    rodar([
        "-i", str(entrada), "-i", str(entrada),
        "-filter_complex",
        f"[0:a]atrim=start={meio},asetpts=PTS-STARTPTS[b];[1:a]atrim=end={meio},asetpts=PTS-STARTPTS[a];[b][a]acrossfade=d={cruzamento}:c1=tri:c2=tri[o]",
        "-map", "[o]", str(destino),
    ])


def gerar_wav(tmp: Path, nome: str, args: list[str]) -> Path:
    p = tmp / f"{nome}.wav"
    rodar([*args, "-ar", str(SR), str(p)])
    return p


# ---------------------------------------------------------------------------------------------- sons
def estatica_loop(tmp: Path) -> None:
    w = gerar_wav(tmp, "estatica", ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.35:duration=24:sample_rate={SR}:seed=7", "-af", "highpass=f=700,lowpass=f=9500,volume=0.8,tremolo=f=11:d=0.18"])
    l = tmp / "estatica_l.wav"
    emendar_loop(w, l)
    para_ogg(l, saida("04_estatica_e_radio", "estatica_tv_loop"))


def zumbido_lampada(tmp: Path) -> None:
    # frequências inteiras em 12 s e tremolo 0,25 Hz: fecha em ciclos inteiros
    expr = "0.5*sin(2*PI*120*t)+0.28*sin(2*PI*240*t)+0.14*sin(2*PI*360*t)+0.07*sin(2*PI*480*t)"
    w = gerar_wav(tmp, "zumbido", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=12:s={SR}", "-af", "tremolo=f=0.25:d=0.25,volume=0.5"])
    para_ogg(w, saida("04_estatica_e_radio", "zumbido_lampada_loop"))


def radio_fora_de_sintonia(tmp: Path) -> None:
    ruido = ["-f", "lavfi", "-i", f"anoisesrc=color=white:amplitude=0.18:duration=14:sample_rate={SR}:seed=3"]
    tom = ["-f", "lavfi", "-i", f"aevalsrc='0.25*sin(2*PI*(260*t+22*t*t))*(0.5+0.5*sin(2*PI*0.4*t))':d=14:s={SR}"]
    p = tmp / "radio.wav"
    rodar([*ruido, *tom, "-filter_complex", "[0:a]bandpass=f=2400:width_type=h:w=2400[n];[n][1:a]amix=inputs=2:normalize=0,tremolo=f=5:d=0.35,volume=0.8[o]", "-map", "[o]", "-ar", str(SR), str(p)])
    para_ogg(p, saida("04_estatica_e_radio", "radio_fora_de_sintonia"))


def drone_branco(tmp: Path) -> None:
    # acorde de sétima maior (lá2, dó#3, mi3, sol#3) e oitavas suaves; 20 s fecha em ciclos inteiros
    expr = "0.30*sin(2*PI*110*t)+0.22*sin(2*PI*138.6*t)+0.22*sin(2*PI*164.8*t)+0.16*sin(2*PI*207.7*t)+0.10*sin(2*PI*220*t)+0.08*sin(2*PI*329.6*t)+0.05*sin(2*PI*415.4*t)"
    w = gerar_wav(tmp, "drone", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=20:s={SR}:c=stereo", "-af", "tremolo=f=0.1:d=0.35,chorus=0.5:0.9:50:0.4:0.25:2,volume=0.55"])
    para_ogg(w, saida("07_sala_branca", "drone_branco_loop"), canais=2)
    shutil_copia(saida("07_sala_branca", "drone_branco_loop"), saida("01_ambiente_dreamcore", "drone_pastel_loop"))


def tom_puro(tmp: Path) -> None:
    expr = "0.45*sin(2*PI*432*t)+0.12*sin(2*PI*864*t)+0.05*sin(2*PI*1296*t)"
    w = gerar_wav(tmp, "tom", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=20:s={SR}", "-af", "tremolo=f=0.2:d=0.3,volume=0.5"])
    para_ogg(w, saida("07_sala_branca", "tom_puro_loop"))


def vento_trigo(tmp: Path) -> None:
    def lado(seed: int) -> list[str]:
        return ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.6:duration=32:sample_rate={SR}:seed={seed}"]
    p = tmp / "vento.wav"
    rodar([*lado(11), *lado(12), "-filter_complex", "[0:a]bandpass=f=900:width_type=h:w=1400,tremolo=f=0.13:d=0.7[l];[1:a]bandpass=f=1100:width_type=h:w=1500,tremolo=f=0.17:d=0.7[r];[l][r]join=inputs=2:channel_layout=stereo,volume=0.9[o]", "-map", "[o]", "-ar", str(SR), str(p)])
    l = tmp / "vento_l.wav"
    emendar_loop(p, l, 2.5)
    para_ogg(l, saida("09_campo_de_trigo", "vento_no_trigo_loop"), canais=2)


def coral_distante(tmp: Path) -> None:
    # vozes sintéticas suaves (senos com vibrato) em acorde aberto, 20 s com ciclos inteiros
    nota = lambda f, a: f"{a}*sin(2*PI*{f}*t+0.4*sin(2*PI*5*t))"  # noqa: E731
    expr = "+".join([nota(220, 0.2), nota(277.2, 0.16), nota(329.6, 0.16), nota(440, 0.1), nota(554.4, 0.07)])
    w = gerar_wav(tmp, "coral", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=20:s={SR}:c=stereo", "-af", "lowpass=f=2600,tremolo=f=0.15:d=0.4,aecho=0.8:0.7:380|620:0.35|0.22,volume=0.5"])
    para_ogg(w, saida("09_campo_de_trigo", "coral_distante_loop"), canais=2)


def batida_coracao(tmp: Path) -> None:
    pulso = "exp(-22*mod(t,1))*sin(2*PI*58*t)+0.7*exp(-22*mod(t-0.3,1))*sin(2*PI*52*t)*gt(mod(t,1),0.3)"
    w = gerar_wav(tmp, "batida", ["-f", "lavfi", "-i", f"aevalsrc='0.8*({pulso})':d=10:s={SR}", "-af", "lowpass=f=140,volume=1.2"])
    para_ogg(w, saida("05_tensao_e_drones", "batimento_coracao_loop"))


def trilho_trem(tmp: Path) -> None:
    rumble = ["-f", "lavfi", "-i", f"anoisesrc=color=brown:amplitude=0.7:duration=16:sample_rate={SR}:seed=5"]
    # dois "tá-tá" por segundo (cliques dos trilhos): 8 repetições de 2 s
    clique = "(exp(-60*mod(t,1))*sin(2*PI*180*t)+0.7*exp(-60*mod(t-0.32,1))*sin(2*PI*210*t)*gt(mod(t,1),0.32))"
    ruido = ["-f", "lavfi", "-i", f"aevalsrc='0.55*{clique}':d=16:s={SR}"]
    p = tmp / "trem.wav"
    rodar([*rumble, *ruido, "-filter_complex", "[0:a]lowpass=f=160,volume=0.5[r];[r][1:a]amix=inputs=2:normalize=0,volume=1.0[o]", "-map", "[o]", "-ar", str(SR), str(p)])
    l = tmp / "trem_l.wav"
    emendar_loop(p, l, 1.0)
    para_ogg(l, saida("08_trem_e_estacao", "trilho_trem_loop"))


def ding_suave(tmp: Path) -> None:
    expr = "(0.5*sin(2*PI*880*t)+0.22*sin(2*PI*1760*t)+0.12*sin(2*PI*2217*t))*exp(-2.2*t)"
    w = gerar_wav(tmp, "ding", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=3:s={SR}", "-af", "volume=0.8"])
    para_ogg(w, saida("13_efeitos_curtos", "ding_suave"))


def susto_grave(tmp: Path) -> None:
    expr = "0.9*exp(-2.2*t)*sin(2*PI*(95*t-30*t*t)+0.3)"
    tom = ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=2.2:s={SR}"]
    ruido = ["-f", "lavfi", "-i", f"anoisesrc=color=brown:amplitude=0.6:duration=2.2:sample_rate={SR}:seed=9"]
    p = tmp / "susto.wav"
    rodar([*tom, *ruido, "-filter_complex", "[1:a]afade=t=out:st=0.05:d=1.8,volume=0.8[n];[0:a][n]amix=inputs=2:normalize=0,lowpass=f=1800,volume=1.2[o]", "-map", "[o]", "-ar", str(SR), str(p)])
    para_ogg(p, saida("06_sustos", "golpe_grave_susto"))


def sussurro_ar(tmp: Path) -> None:
    w = gerar_wav(tmp, "sussurro", ["-f", "lavfi", "-i", f"anoisesrc=color=white:amplitude=0.5:duration=14:sample_rate={SR}:seed=21", "-af", "bandpass=f=3400:width_type=h:w=3000,tremolo=f=3:d=0.9,volume=0.7"])
    l = tmp / "sussurro_l.wav"
    emendar_loop(w, l, 1.5)
    para_ogg(l, saida("14_vozes_e_sussurros", "respiro_sussurrado_loop"))


def caixa_de_musica(tmp: Path) -> None:
    """Uma cantiga de ninar original, em lá menor pentatônica, que desafina e desacelera, como uma caixinha ficando sem corda."""
    # graus em semitons a partir de lá4 (440 Hz): frase de 12 notas, repetida desafinando
    frase = [0, 3, 7, 12, 10, 7, 3, 5, 7, 3, 0, -2]
    notas = []
    t = 0.0
    for volta in range(3):
        for i, st in enumerate(frase):
            desafino = 1 - 0.012 * volta - 0.0025 * i * volta
            freq = 440 * (2 ** (st / 12)) * desafino
            notas.append((t, freq, 0.9 - 0.18 * volta))
            t += 0.42 + 0.06 * volta + (0.18 if i == len(frase) - 1 else 0)
    duracao = t + 2.5
    entradas: list[str] = []
    filtros: list[str] = []
    for n, (inicio, freq, vol) in enumerate(notas):
        env = f"aevalsrc='{vol}*(sin(2*PI*{freq:.2f}*t)+0.35*sin(2*PI*{freq * 2:.2f}*t)+0.15*sin(2*PI*{freq * 3.01:.2f}*t))*exp(-3.2*t)':d=2.2:s={SR}"
        entradas += ["-f", "lavfi", "-i", env]
        atraso = int(inicio * 1000)
        filtros.append(f"[{n}:a]adelay={atraso}|{atraso}[n{n}]")
    mix = "".join(f"[n{n}]" for n in range(len(notas))) + f"amix=inputs={len(notas)}:normalize=0,aecho=0.7:0.5:90:0.25,lowpass=f=5200,volume=0.35,atrim=0:{duracao:.2f}[o]"
    p = tmp / "caixa.wav"
    rodar([*entradas, "-filter_complex", ";".join(filtros) + ";" + mix, "-map", "[o]", "-ar", str(SR), str(p)])
    para_ogg(p, saida("02_caixa_de_musica", "caixa_de_ninar_desafinando"))


def apito_trem(tmp: Path) -> None:
    """Apito grave de trem antigo: dois tons juntos (sol3 e si3), entrada e saída lentas."""
    expr = "(0.45*sin(2*PI*196*t)+0.4*sin(2*PI*246.9*t)+0.15*sin(2*PI*392*t))*min(1,t/0.25)*min(1,(2.8-t)/0.6)"
    w = gerar_wav(tmp, "apito", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=2.8:s={SR}", "-af", "tremolo=f=6:d=0.08,aecho=0.8:0.6:140|260:0.3|0.18,lowpass=f=2400,volume=0.7"])
    para_ogg(w, saida("08_trem_e_estacao", "apito_de_trem_distante"))


def vagao_rangendo(tmp: Path) -> None:
    """Madeira e metal rangendo: ruído filtrado com varredura lenta e batidas graves de vagão."""
    ruido = ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.5:duration=10:sample_rate={SR}:seed=33"]
    p = tmp / "rangido.wav"
    rodar([*ruido, "-af", "bandpass=f=700:width_type=h:w=500,tremolo=f=0.7:d=0.9,vibrato=f=0.3:d=0.4,volume=0.9", "-ar", str(SR), str(p)])
    l = tmp / "rangido_l.wav"
    emendar_loop(p, l, 1.5)
    para_ogg(l, saida("08_trem_e_estacao", "vagao_rangendo_loop"))


def shutil_copia(a: Path, b: Path) -> None:
    b.parent.mkdir(parents=True, exist_ok=True)
    b.write_bytes(a.read_bytes())


# ------------------------------------------------------------------------------ variações parametrizadas
# Os geradores abaixo existem para o repertório não repetir: o mesmo "instrumento" em tons, andamentos, sementes e timbres
# diferentes. Cada um grava vários arquivos. Pontuais (curtos) saem em mono; camadas e músicas em estéreo.

def pentatonica(base: float, graus: list[int]) -> list[float]:
    """Frequências de uma escala pentatônica maior a partir de `base` (graus em passos da escala: 0..4, +5 = oitava acima)."""
    semitons = [0, 2, 4, 7, 9]
    return [base * 2 ** ((semitons[g % 5] + 12 * (g // 5)) / 12) for g in graus]


def sequencia(tmp: Path, nome: str, notas: list[tuple[float, float, float]], timbre, duracao: float, pos: str, pasta: str,
              canais: int = 1, qualidade: int = 4, vida: float = 3.0) -> None:
    """Toca uma lista de notas (início s, frequência Hz, volume) com `timbre(f, a)` -> expressão em t, mistura e grava .ogg."""
    entradas: list[str] = []
    filtros: list[str] = []
    for n, (inicio, freq, vol) in enumerate(notas):
        entradas += ["-f", "lavfi", "-i", f"aevalsrc='{timbre(freq, vol)}':d={vida}:s={SR}"]
        atraso = int(inicio * 1000)
        filtros.append(f"[{n}:a]adelay={atraso}|{atraso}[n{n}]")
    mix = "".join(f"[n{n}]" for n in range(len(notas))) + f"amix=inputs={len(notas)}:normalize=0,{pos},atrim=0:{duracao:.2f}[o]"
    p = Path(tempfile.mkdtemp(dir=tmp)) / "seq.wav"
    rodar([*entradas, "-filter_complex", ";".join(filtros) + ";" + mix, "-map", "[o]", "-ar", str(SR), str(p)])
    para_ogg(p, saida(pasta, nome), canais=canais, qualidade=qualidade)


def timbre_caixa(f: float, a: float) -> str:
    return f"{a}*(sin(2*PI*{f:.2f}*t)+0.35*sin(2*PI*{f * 2:.2f}*t)+0.15*sin(2*PI*{f * 3.01:.2f}*t))*exp(-3.2*t)"


def timbre_sino(f: float, a: float, brilho: float = 1.0, queda: float = 1.1) -> str:
    # parciais inarmônicos de sino; `brilho` aumenta os agudos, `queda` é o quanto demora a apagar
    return (f"{a}*(sin(2*PI*{f:.2f}*t)*exp(-{queda}*t)+{0.45 * brilho:.2f}*sin(2*PI*{f * 2.76:.2f}*t)*exp(-{queda * 1.9:.2f}*t)"
            f"+{0.2 * brilho:.2f}*sin(2*PI*{f * 5.4:.2f}*t)*exp(-{queda * 3.2:.2f}*t))")


def caixa_variacoes(tmp: Path) -> None:
    """Três caixinhas de música novas: tons, andamentos e 'defeitos' diferentes (todas ficam sem corda no fim)."""
    def tocar(nome: str, base: float, frase: list[int], passo: float, voltas: int, desafino: float, lentidao: float, pulos: int = 0, pausa_fim: float = 0.3) -> None:
        notas: list[tuple[float, float, float]] = []
        t = 0.0
        for volta in range(voltas):
            for i, st in enumerate(frase):
                # alguns "dentes quebrados": notas que somam
                if pulos and volta >= 1 and (i * 7 + volta * 3) % pulos == 0:
                    t += passo
                    continue
                freq = base * 2 ** (st / 12) * (1 - desafino * volta - 0.002 * i * volta)
                notas.append((t, freq, max(0.2, 0.9 - 0.15 * volta)))
                t += passo + lentidao * volta + (pausa_fim if i == len(frase) - 1 else 0)
        sequencia(tmp, nome, notas, timbre_caixa, t + 2.5, "aecho=0.7:0.5:90:0.25,lowpass=f=5200,volume=0.35", "02_caixa_de_musica")
    # ré menor pentatônica, lenta
    tocar("caixa_ninar_re_lenta", 293.66, [0, 3, 7, 10, 7, 3, 5, 3, 0, -2, 0, 3, 7], 0.62, 4, 0.010, 0.05)
    # valsa (3 por compasso, acento no primeiro) com notas faltando
    tocar("caixa_valsa_estranha", 329.63, [0, 7, 7, 3, 7, 7, 5, 8, 8, 7, 3, 3, 0, 7, 7, 10, 7, 7], 0.34, 3, 0.014, 0.06, pulos=5, pausa_fim=0.5)
    # sol maior alta e doce, de dois em dois, que se arrasta
    tocar("caixa_doce_arrastada", 392.0, [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 12, 11, 7, 4], 0.46, 4, 0.006, 0.08)


def vento_variacoes(tmp: Path) -> None:
    """Ventos em loop com semente e timbre diferentes: trigal 2 e 3, e um mais grave e vazio para o lago."""
    def vento(nome: str, pasta: str, seeds: tuple[int, int], fe: int, fd: int, la: int, tr: tuple[float, float], dur: int, vol: float, cruz: float) -> None:
        def lado(seed: int) -> list[str]:
            return ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.6:duration={dur}:sample_rate={SR}:seed={seed}"]
        p = tmp / f"{nome}.wav"
        rodar([*lado(seeds[0]), *lado(seeds[1]), "-filter_complex",
               f"[0:a]bandpass=f={fe}:width_type=h:w={la},tremolo=f={tr[0]}:d=0.75[l];[1:a]bandpass=f={fd}:width_type=h:w={la},tremolo=f={tr[1]}:d=0.75[r];"
               f"[l][r]join=inputs=2:channel_layout=stereo,volume={vol}[o]", "-map", "[o]", "-ar", str(SR), str(p)])
        l = tmp / f"{nome}_l.wav"
        emendar_loop(p, l, cruz)
        para_ogg(l, saida(pasta, nome), canais=2)
    vento("vento_trigo_2", "09_campo_de_trigo", (41, 42), 700, 820, 1000, (0.1, 0.12), 36, 1.0, 3.0)
    vento("vento_trigo_3", "09_campo_de_trigo", (51, 52), 1500, 1700, 1800, (0.21, 0.26), 28, 0.8, 2.0)
    vento("vento_lago_loop", "01_ambiente_dreamcore", (61, 62), 420, 520, 700, (0.1, 0.13), 40, 1.1, 3.5)


def agua_lago(tmp: Path) -> None:
    """Marolas lentas de água parada (ruído rosa filtrado com ondulação), loop."""
    def lado(seed: int) -> list[str]:
        return ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.6:duration=36:sample_rate={SR}:seed={seed}"]
    p = tmp / "agua.wav"
    rodar([*lado(71), *lado(72), "-filter_complex",
           "[0:a]bandpass=f=1400:width_type=h:w=2600,tremolo=f=0.31:d=0.8[l];[1:a]bandpass=f=1900:width_type=h:w=2800,tremolo=f=0.27:d=0.8[r];"
           "[l][r]join=inputs=2:channel_layout=stereo,lowpass=f=4200,volume=0.7[o]", "-map", "[o]", "-ar", str(SR), str(p)])
    l = tmp / "agua_l.wav"
    emendar_loop(p, l, 3.0)
    para_ogg(l, saida("01_ambiente_dreamcore", "agua_lago_loop"), canais=2)


def acordes_loop(tmp: Path, nome: str, pasta: str, notas: list[tuple[float, float]], dur: int, lfo: float, vol: float, canais: int = 2, par: float = 0.0) -> None:
    """Drone de acorde que fecha em ciclos inteiros: frequências arredondadas para múltiplos de 1/12 Hz, `dur` múltiplo de 12 s.
    `par` desafina o canal direito (múltiplo de 1/12 Hz) para criar batimento lento entre os ouvidos."""
    arr = lambda f: round(f * 12) / 12  # noqa: E731
    def soma(deslocar: float) -> str:
        return "+".join(f"{a}*sin(2*PI*{arr(f) + (deslocar if i % 2 else 0):.4f}*t+{i * 1.3:.2f})" for i, (f, a) in enumerate(notas))
    lfo = round(lfo * 12) / 12
    esq = f"({soma(0.0)})*(0.75+0.25*sin(2*PI*{lfo:.4f}*t))"
    dir_ = f"({soma(par)})*(0.75+0.25*sin(2*PI*{lfo:.4f}*t+1.0))"
    expr = f"{esq}|{dir_}" if canais == 2 else esq
    w = gerar_wav(tmp, nome, ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d={dur}:s={SR}:c={'stereo' if canais == 2 else 'mono'}", "-af", f"volume={vol}"])
    para_ogg(w, saida(pasta, nome), canais=canais, qualidade=3)


def drones_variacoes(tmp: Path) -> None:
    """Drones de acordes diferentes: aglomerado menor, quintas vazias, trítono e sub-graves de caverna; e pads brancos lídios."""
    A = acordes_loop
    # tensão (05): cada um com um "clima" harmônico
    A(tmp, "drone_grave_1_segunda_menor", "05_tensao_e_drones", [(55, 0.45), (58.27, 0.4), (110, 0.2), (116.5, 0.12), (164.8, 0.06)], 24, 0.25, 0.8, par=0.25)
    A(tmp, "drone_grave_2_quinta_vazia", "05_tensao_e_drones", [(49, 0.5), (73.4, 0.38), (98, 0.22), (147, 0.1), (196, 0.05)], 24, 0.1667, 0.8, par=0.1667)
    A(tmp, "drone_grave_3_tritono", "05_tensao_e_drones", [(65.4, 0.45), (92.5, 0.38), (130.8, 0.2), (185, 0.12), (261.6, 0.05)], 24, 0.25, 0.8, par=0.333)
    A(tmp, "drone_grave_4_menor_sombrio", "05_tensao_e_drones", [(43.65, 0.5), (65.4, 0.3), (87.3, 0.3), (103.8, 0.22), (130.8, 0.1), (207.7, 0.04)], 36, 0.0833, 0.8, par=0.0833)
    # caverna: sub-graves quase só sentidos
    A(tmp, "drone_caverna_1_sub", "05_tensao_e_drones", [(36.7, 0.6), (55, 0.35), (73.4, 0.18), (110, 0.07)], 36, 0.0833, 0.9, par=0.0833)
    A(tmp, "drone_caverna_2_eco", "05_tensao_e_drones", [(41.2, 0.55), (61.7, 0.3), (82.4, 0.22), (123.5, 0.08), (246.9, 0.03)], 24, 0.1667, 0.9, par=0.1667)
    # sala branca: pads lídios, doces e imóveis
    A(tmp, "pad_branco_1_fa_lidio", "07_sala_branca", [(174.6, 0.3), (220, 0.24), (261.6, 0.22), (329.6, 0.14), (370.0, 0.08), (523.3, 0.05)], 24, 0.0833, 0.7, par=0.25)
    A(tmp, "pad_branco_2_re_lidio", "07_sala_branca", [(146.8, 0.3), (185, 0.24), (220, 0.22), (277.2, 0.14), (311.1, 0.08), (440, 0.05)], 36, 0.0833, 0.7, par=0.1667)
    A(tmp, "pad_branco_3_sol_aberto", "07_sala_branca", [(196, 0.3), (293.7, 0.25), (392, 0.2), (493.9, 0.12), (587.3, 0.07), (784, 0.04)], 24, 0.1667, 0.7, par=0.333)
    # corredor: zumbido fluorescente com sub grave, em dois tons de rede elétrica
    A(tmp, "zumbido_corredor_loop", "05_tensao_e_drones", [(60, 0.35), (120, 0.4), (180, 0.22), (240, 0.12), (300, 0.06), (40, 0.25)], 24, 0.1667, 0.7, canais=2, par=0.25)


def pontuais_graves(tmp: Path) -> None:
    """Golpes graves e batidas distantes (sustos): três formatos, afinações e quedas diferentes."""
    def golpe(nome: str, f0: float, quedaf: float, decai: float, dur: float, extra: str = "") -> None:
        expr = f"0.9*exp(-{decai}*t)*sin(2*PI*({f0}*t-{quedaf}*t*t)+0.3){extra}"
        tom = ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d={dur}:s={SR}"]
        ruido = ["-f", "lavfi", "-i", f"anoisesrc=color=brown:amplitude=0.6:duration={dur}:sample_rate={SR}:seed={int(f0)}"]
        p = tmp / f"{nome}.wav"
        rodar([*tom, *ruido, "-filter_complex", f"[1:a]afade=t=out:st=0.05:d={dur * 0.8:.2f},volume=0.7[n];[0:a][n]amix=inputs=2:normalize=0,lowpass=f=1500,volume=1.2[o]", "-map", "[o]", "-ar", str(SR), str(p)])
        para_ogg(p, saida("06_sustos", nome))
    golpe("golpe_grave_2_fundo", 70, 18, 1.6, 2.8)
    golpe("golpe_grave_3_metalico", 130, 40, 2.8, 2.4, "+0.25*exp(-4*t)*sin(2*PI*311*t)+0.15*exp(-5*t)*sin(2*PI*733*t)")
    golpe("golpe_grave_4_surdo", 52, 10, 3.5, 1.8)
    # porta batendo ao longe: pancada de madeira com eco
    expr = "exp(-26*t)*sin(2*PI*(160*t-120*t*t))+0.4*exp(-14*t)*sin(2*PI*95*t)"
    w = gerar_wav(tmp, "batida", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=2.4:s={SR}", "-af", "lowpass=f=900,aecho=0.7:0.6:240|470:0.45|0.25,volume=1.3"])
    para_ogg(w, saida("06_sustos", "batida_porta_ao_longe"))


def pontuais_agua_madeira(tmp: Path) -> None:
    """Gotas de água em ambiente úmido, rangidos de madeira e passos distantes."""
    for n, (f0, df, eco) in enumerate([(780, 900, "aecho=0.6:0.55:210|390:0.45|0.3"), (1150, 1300, "aecho=0.6:0.55:160|320:0.4|0.25"), (560, 600, "aecho=0.6:0.6:260|540:0.5|0.32")], 1):
        expr = f"0.8*exp(-38*t)*sin(2*PI*({f0}*t+{df}*t*t))"
        w = gerar_wav(tmp, f"gota{n}", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=2.4:s={SR}", "-af", f"{eco},lowpass=f=6000,volume=1.0"])
        para_ogg(w, saida("13_efeitos_curtos", f"gota_agua_{n}"))
    for n, (fc, lar, trem, dur) in enumerate([(520, 380, 9, 2.2), (850, 600, 14, 1.7), (1250, 800, 21, 2.8)], 1):
        w = gerar_wav(tmp, f"rang{n}", ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.8:duration={dur}:sample_rate={SR}:seed={80 + n}",
                                       "-af", f"bandpass=f={fc}:width_type=h:w={lar},tremolo=f={trem}:d=1.0,vibrato=f=0.9:d=0.6,afade=t=in:d={dur * 0.35:.2f},afade=t=out:st={dur * 0.5:.2f}:d={dur * 0.5:.2f},aecho=0.7:0.5:130:0.3,volume=1.4"])
        para_ogg(w, saida("13_efeitos_curtos", f"rangido_madeira_{n}"))
    for n, (passo, f0, nsteps) in enumerate([(0.62, 78, 5), (0.5, 95, 7)], 1):
        dur = passo * nsteps + 1.2
        expr = f"exp(-36*mod(t,{passo}))*sin(2*PI*({f0}+8*random(0))*t)*lt(t,{passo * nsteps})"
        w = gerar_wav(tmp, f"passos{n}", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d={dur:.2f}:s={SR}", "-af", "lowpass=f=420,aecho=0.7:0.5:200|410:0.4|0.2,volume=1.3"])
        para_ogg(w, saida("13_efeitos_curtos", f"passos_distantes_{n}"))
    # lâmpada fluorescente falhando: zumbido com cortes
    for n, (gate, dur) in enumerate([("gt(sin(2*PI*9*t)*sin(2*PI*5.3*t+1),0.15)", 2.6), ("gt(sin(2*PI*17*t)+sin(2*PI*3.1*t),0.4)", 2.0)], 1):
        expr = f"({gate})*(0.5*sin(2*PI*120*t)+0.28*sin(2*PI*240*t)+0.12*sin(2*PI*360*t))*min(1,t/0.1)*min(1,({dur}-t)/0.3)"
        w = gerar_wav(tmp, f"lamp{n}", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d={dur}:s={SR}", "-af", "volume=0.9"])
        para_ogg(w, saida("13_efeitos_curtos", f"lampada_falhando_{n}"))


def pontuais_sussurros_radio(tmp: Path) -> None:
    """Sussurros curtos (ruído sibilante em 'sílabas') e rajadas de estática de rádio."""
    padroes = [[(0.2, 0.35), (0.7, 0.3), (1.2, 0.5)], [(0.1, 0.25), (0.45, 0.2), (0.8, 0.3), (1.3, 0.25), (1.75, 0.45)], [(0.3, 0.7), (1.3, 0.55)]]
    bandas = [(3200, 2800), (2600, 2200), (4200, 3000)]
    for n, (pat, (fc, lar)) in enumerate(zip(padroes, bandas), 1):
        env = "+".join(f"sin(PI*min(max((t-{i:.2f})/{d:.2f},0),1))" for i, d in pat)
        dur = pat[-1][0] + pat[-1][1] + 0.9
        w = gerar_wav(tmp, f"suss{n}", ["-f", "lavfi", "-i", f"aevalsrc='(random(0)-0.5)*({env})':d={dur:.2f}:s={SR}", "-af", f"bandpass=f={fc}:width_type=h:w={lar},aecho=0.7:0.5:120|230:0.35|0.2,volume=1.6"])
        para_ogg(w, saida("14_vozes_e_sussurros", f"sussurro_curto_{n}"))
    for n, (dur, f0, trem, seed) in enumerate([(0.9, 1800, 24, 91), (1.6, 900, 9, 92), (2.4, 2600, 15, 93)], 1):
        ruido = ["-f", "lavfi", "-i", f"anoisesrc=color=white:amplitude=0.4:duration={dur}:sample_rate={SR}:seed={seed}"]
        apito = ["-f", "lavfi", "-i", f"aevalsrc='0.2*sin(2*PI*({f0}*t+300*t*t))*(0.5+0.5*sin(2*PI*{trem / 3}*t))':d={dur}:s={SR}"]
        p = tmp / f"rajada{n}.wav"
        rodar([*ruido, *apito, "-filter_complex", f"[0:a]bandpass=f={f0}:width_type=h:w=3000,tremolo=f={trem}:d=0.6[n];[n][1:a]amix=inputs=2:normalize=0,afade=t=in:d=0.05,afade=t=out:st={dur * 0.7:.2f}:d={dur * 0.3:.2f},volume=0.9[o]", "-map", "[o]", "-ar", str(SR), str(p)])
        para_ogg(p, saida("04_estatica_e_radio", f"estatica_rajada_{n}"))


def pontuais_sinos_aves(tmp: Path) -> None:
    """Sinos suaves em escalas pentatônicas (campo, vila, sala branca), sinos brilhantes de feira, flautas distantes e passarinhos."""
    import random
    def toque(nome: str, pasta: str, base: float, graus: list[int], passo: float, queda: float, brilho: float, pos: str, dur: float, vol: float = 0.5) -> None:
        freqs = pentatonica(base, graus)
        notas = [(i * passo, f, vol) for i, f in enumerate(freqs)]
        sequencia(tmp, nome, notas, lambda f, a: timbre_sino(f, a, brilho, queda), dur, pos, pasta, vida=dur)
    # campo/sala: lentos e macios
    toque("sino_suave_1", "09_campo_de_trigo", 523.25, [0, 2, 4], 1.1, 1.0, 0.7, "aecho=0.8:0.6:420|700:0.35|0.22,lowpass=f=4800", 6.0)
    toque("sino_suave_2", "09_campo_de_trigo", 392.0, [2, 1, 3, 0], 1.4, 0.9, 0.6, "aecho=0.8:0.6:500|800:0.35|0.22,lowpass=f=4200", 7.5)
    toque("sino_suave_3", "07_sala_branca", 659.25, [0, 4, 2], 1.7, 0.8, 0.5, "aecho=0.8:0.7:600|900:0.4|0.3,lowpass=f=5200", 8.0, 0.4)
    toque("sino_suave_4", "07_sala_branca", 440.0, [4, 2], 2.2, 0.7, 0.4, "aecho=0.8:0.7:700|1100:0.4|0.3,lowpass=f=3800", 8.0, 0.4)
    # vila: sinos de torre, mais graves e cheios
    toque("sino_vila_1", "10_vila_e_lobby", 261.63, [0, 0, 0], 2.2, 0.55, 1.0, "aecho=0.8:0.6:380|610:0.3|0.2,lowpass=f=3600", 9.0, 0.6)
    toque("sino_vila_2", "10_vila_e_lobby", 329.63, [2, 0], 1.8, 0.6, 0.9, "aecho=0.8:0.6:380|610:0.3|0.2,lowpass=f=3600", 7.0, 0.6)
    # feira: cristalinos e rápidos
    toque("sino_feira_1", "11_feira_e_minigames", 1046.5, [0, 2, 4, 5, 3], 0.18, 2.4, 1.2, "aecho=0.7:0.5:80|160:0.3|0.2", 3.5, 0.45)
    toque("sino_feira_2", "11_feira_e_minigames", 880.0, [4, 2, 3, 0], 0.22, 2.2, 1.1, "aecho=0.7:0.5:90|180:0.3|0.2", 3.5, 0.45)
    toque("sino_estacao_1", "08_trem_e_estacao", 523.25, [0, 0, 0], 1.3, 1.4, 0.8, "aecho=0.8:0.7:260|520:0.35|0.22,lowpass=f=3000", 6.0, 0.5)
    # flautas distantes: sobem e descem na pentatônica, com sopro e vibrato
    def flauta(nome: str, base: float, graus: list[int], passo: float, dur: float) -> None:
        freqs = pentatonica(base, graus)
        notas = [(i * passo, f, 0.5) for i, f in enumerate(freqs)]
        tb = lambda f, a: f"{a}*(sin(2*PI*{f:.2f}*t+0.02*sin(2*PI*5*t))+0.12*sin(2*PI*{f * 2:.2f}*t))*min(1,t/0.12)*exp(-0.9*t)"  # noqa: E731
        sequencia(tmp, nome, notas, tb, dur, "lowpass=f=3200,aecho=0.8:0.7:520|880:0.45|0.3", "09_campo_de_trigo", vida=3.0)
    flauta("flauta_distante_1", 392.0, [0, 2, 4, 3, 1], 0.9, 6.5)
    flauta("flauta_distante_2", 349.23, [2, 4, 5, 4, 2, 0], 0.75, 6.5)
    flauta("flauta_distante_3", 440.0, [4, 3, 1, 2], 1.1, 6.5)
    # passarinhos: grupos de pios com a frequência subindo
    for n, (f0, df, per, npios, seed) in enumerate([(3200, 3000, 0.16, 4, 1), (2600, 4400, 0.21, 3, 2), (4000, -1500, 0.12, 6, 3)], 1):
        r = random.Random(seed)
        dur = per * npios + 1.0
        expr = (f"lt(t,{per * npios})*lt(mod(t,{per}),0.09)*sin(2*PI*({f0 + r.randint(0, 300)}*mod(t,{per})+{df / (2 * 0.09)}*mod(t,{per})*mod(t,{per})))"
                f"*sin(PI*min(mod(t,{per})/0.09,1))")
        w = gerar_wav(tmp, f"ave{n}", ["-f", "lavfi", "-i", f"aevalsrc='0.55*{expr}':d={dur:.2f}:s={SR}", "-af", "aecho=0.7:0.5:140|300:0.3|0.18,volume=0.8"])
        para_ogg(w, saida("10_vila_e_lobby", f"passaro_{n}"))
    # pops de feira
    for n, (f0, df) in enumerate([(420, 1400), (600, 1800)], 1):
        expr = f"0.8*exp(-26*t)*sin(2*PI*({f0}*t+{df}*t*t))"
        w = gerar_wav(tmp, f"pop{n}", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=0.4:s={SR}", "-af", "aecho=0.6:0.4:70:0.25"])
        para_ogg(w, saida("11_feira_e_minigames", f"pop_bolha_{n}"))


def pontuais_trem(tmp: Path) -> None:
    """Mais apitos (outros tons), buzina em dois toques e batidas de vagão."""
    for n, (fs, dur, lento) in enumerate([((146.8, 185.0, 293.7), 3.6, 0.35), ((220.0, 277.2, 330.0), 2.4, 0.2)], 2):
        a, b, c = fs
        expr = f"(0.45*sin(2*PI*{a}*t)+0.4*sin(2*PI*{b}*t)+0.15*sin(2*PI*{c}*t))*min(1,t/{lento})*min(1,({dur}-t)/0.7)"
        w = gerar_wav(tmp, f"apito{n}", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d={dur}:s={SR}", "-af", "tremolo=f=5:d=0.08,aecho=0.8:0.6:160|300:0.3|0.18,lowpass=f=2200,volume=0.7"])
        para_ogg(w, saida("08_trem_e_estacao", f"apito_de_trem_distante_{n}"))
    expr = "(0.5*sin(2*PI*174.6*t)+0.4*sin(2*PI*220*t))*(min(1,t/0.05)*min(1,(0.7-t)/0.12)*lt(t,0.7)+min(1,(t-1.0)/0.05)*min(1,(2.2-t)/0.4)*gt(t,1.0))"
    w = gerar_wav(tmp, "buzina", ["-f", "lavfi", "-i", f"aevalsrc='{expr}':d=3.0:s={SR}", "-af", "aecho=0.8:0.6:180|330:0.3|0.2,lowpass=f=2000,volume=0.7"])
    para_ogg(w, saida("08_trem_e_estacao", "buzina_dois_toques"))
    for n, (p, f1, f2) in enumerate([(0.34, 130, 150), (0.27, 150, 175)], 1):
        clique = f"exp(-70*mod(t,{p * 2}))*sin(2*PI*{f1}*t)+0.8*exp(-70*mod(t-{p},{p * 2}))*sin(2*PI*{f2}*t)*gt(mod(t,{p * 2}),{p})"
        w = gerar_wav(tmp, f"clack{n}", ["-f", "lavfi", "-i", f"aevalsrc='0.7*({clique})*lt(t,{p * 6})':d={p * 6 + 0.8:.2f}:s={SR}", "-af", "lowpass=f=700,aecho=0.7:0.5:150:0.3,volume=1.4"])
        para_ogg(w, saida("08_trem_e_estacao", f"clack_vagao_{n}"))


def pontuais_vento(tmp: Path) -> None:
    """Rajadas de vento (curtas, sobem e somem): três timbres, para campo e lago."""
    for n, (fc, lar, dur, seed) in enumerate([(600, 900, 5.0, 101), (1100, 1500, 4.0, 102), (380, 600, 6.5, 103)], 1):
        w = gerar_wav(tmp, f"rajada_vento{n}", ["-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.7:duration={dur}:sample_rate={SR}:seed={seed}",
                                               "-af", f"bandpass=f={fc}:width_type=h:w={lar},tremolo=f=0.6:d=0.5,afade=t=in:d={dur * 0.45:.2f},afade=t=out:st={dur * 0.45:.2f}:d={dur * 0.55:.2f},volume=1.2"])
        para_ogg(w, saida("09_campo_de_trigo", f"vento_rajada_{n}"))


GERADORES = [
    pontuais_vento,
    estatica_loop, zumbido_lampada, radio_fora_de_sintonia, drone_branco, tom_puro, vento_trigo, coral_distante,
    batida_coracao, trilho_trem, apito_trem, vagao_rangendo, ding_suave, susto_grave, sussurro_ar, caixa_de_musica,
    caixa_variacoes, vento_variacoes, agua_lago, drones_variacoes, pontuais_graves, pontuais_agua_madeira,
    pontuais_sussurros_radio, pontuais_sinos_aves, pontuais_trem,
]


def main() -> None:
    filtro = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        for g in GERADORES:
            if filtro and filtro not in g.__name__:
                continue
            g(tmp)
            print("ok:", g.__name__)
    (RAIZ / "_gerados_sinteticos.txt").write_text(
        "Os arquivos criados por tools/sons_gerar.py são sintéticos, feitos por código (ffmpeg): sem direitos autorais, uso livre.\n"
        "Para refazer: python tools/sons_gerar.py (ou só um grupo: python tools/sons_gerar.py caixa_variacoes)\n"
        "Variações do repertório (ambientes sonoros): caixa_variacoes, vento_variacoes, agua_lago, drones_variacoes, pontuais_graves, pontuais_agua_madeira,\n"
        "pontuais_sussurros_radio, pontuais_sinos_aves, pontuais_trem, pontuais_vento. Veja Sons/ESCOLHAS.md e Sons/_ambientes.json.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
