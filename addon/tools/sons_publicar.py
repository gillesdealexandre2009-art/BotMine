#!/usr/bin/env python3
"""Publica os sons do addon: normaliza as faixas de Sons/ e grava no pack de recursos + lista para os scripts.

Uso, a partir da pasta addon/:
    python tools/sons_publicar.py

Duas fontes:
  1) a playlist 'lobby' (lofi): os .ogg de Sons/10_vila_e_lobby/lofi (ordem de _selecao.txt), até 9 faixas, em
     vulpus_rp/sounds/music/vulpus/lobby_<n>.ogg (como sempre foi);
  2) os ambientes de Sons/_ambientes.json (vila, feira e os capítulos do mistério): cada arquivo usado é publicado UMA vez
     (mesmo que apareça em vários ambientes), como música (sounds/music/vulpus/m_<id>.ogg, estéreo) ou como pontual
     (sounds/vulpus/p_<id>.ogg, MONO, evento 'vulpus.p_<id>' na categoria 'ambient').

Tratamento: corta silêncio nas pontas (menos loops), mede o loudness integrado (EBU R128, ffmpeg ebur128) e aplica ganho linear até
~-18 LUFS (música/camadas) ou ~-16 LUFS (pontuais) com limitador de pico em -1,5 dBTP aprox.; fade-in 2 s e fade-out 3 s nas músicas
que tocam uma vez (loops não têm fade, para emendar); faixas com mais de 5 min são cortadas para ~4 min com fade-out; vorbis q3
(música) e q4 (pontual); arquivos que ficam com mais de 6 MB são rejeitados. Depois faz MERGE (sem apagar entradas de outros) em
music_definitions.json e sound_definitions.json e gera vulpus_bp/scripts/textos/musicas.js (PLAYLISTS.lobby + AMBIENTES) com a
duração real (ffprobe). Créditos ficam em Sons/, não no pack. Precisa do ffmpeg/ffprobe no PATH. Sons/ESCOLHAS.md é escrito à mão:
o porquê de cada escolha. Aqui só se imprime o resumo por ambiente (nº de faixas, MB).
"""
from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ADDON = Path(__file__).resolve().parent.parent
SONS = ADDON / "Sons"
RP = ADDON / "vulpus_rp"
SAIDA_MUSICA = RP / "sounds" / "music" / "vulpus"
SAIDA_PONTUAL = RP / "sounds" / "vulpus"
BP_TEXTO = ADDON / "vulpus_bp" / "scripts" / "textos" / "musicas.js"
AMBIENTES_JSON = SONS / "_ambientes.json"

# playlist -> (pasta de origem, máximo de faixas)
PLAYLISTS = {
    "lobby": (SONS / "10_vila_e_lobby" / "lofi", 9),
}

LUFS = -18
LUFS_PONTUAL = -16
PICO_DB = -1.5
FADE_IN = 2.0
FADE_OUT = 3.0
QUALIDADE = 1  # lobby (lofi): q1 ~ 80 kbps
MAX_LOBBY_S = 170.0  # cada faixa do lobby é cortada (com fade) nesse tamanho
QUALIDADE_AMBIENTE = 0  # padrão das músicas de ambiente (q2 ~ 96 kbps); "q" no JSON troca por faixa (1 = escuras/drones)
QUALIDADE_PONTUAL = 4
CORTE_LONGO = 300.0  # acima disso corta
CORTE_AMBIENTE = 120.0  # música de ambiente acima disso é cortada
DURACAO_AMBIENTE = 105.0  # ... para esse tamanho, com fade
DURACAO_CORTE = 240.0
LIMITE_MB = 6.0
AVISO_MB = 60  # orçamento total do áudio publicado (lobby + ambientes + pontuais)
GANHO_MAX_DB = 24.0
VERSAO_TRATAMENTO = "v2-leve"  # mude para refazer tudo (ex.: ao mexer em loudness, fades ou qualidade)
CACHE = SONS / "_publicado.json"  # o que já foi tratado (para não refazer o que não mudou)


def rodar(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def duracao(arq: Path) -> float:
    r = rodar(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(arq)])
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def escolher(pasta: Path, maximo: int) -> list[Path]:
    if not pasta.is_dir():
        return []
    todos = {p.name: p for p in sorted(pasta.glob("*.ogg"), key=lambda p: p.name.lower())}
    selecao = pasta / "_selecao.txt"
    if selecao.is_file():
        ordem = [l.strip() for l in selecao.read_text(encoding="utf-8").splitlines() if l.strip() and not l.strip().startswith("#")]
        achados = [todos[n] for n in ordem if n in todos]
        if achados:
            return achados[:maximo]
    return list(todos.values())[:maximo]


def nome_bonito(arq: Path) -> str:
    base = re.sub(r"[_\-]+", " ", arq.stem).strip()
    base = re.sub(r"\s+", " ", base)
    return (base[:1].upper() + base[1:])[:40] or "Faixa"


# ------------------------------------------------------------------------------------------------ playlist do lobby (lofi)
def tratar(origem: Path, destino: Path) -> bool:
    """Corta silêncio, normaliza e aplica os fades. True se deu certo."""
    corte = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.2"
    filtro1 = f"{corte},areverse,{corte},areverse,loudnorm=I={LUFS}:TP=-1.5:LRA=11"
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "tratado.wav"
        r = rodar(["ffmpeg", "-y", "-v", "error", "-i", str(origem), "-vn", "-ac", "2", "-ar", "44100", "-af", filtro1, str(wav)])
        if r.returncode != 0 or not wav.is_file():
            print(f"  erro (normalizar): {r.stderr.strip()[:200]}")
            return False
        dur = min(duracao(wav), MAX_LOBBY_S)
        if dur < 20:
            print(f"  descartada: só {dur:.1f}s depois de cortar o silêncio")
            return False
        fade = f"atrim=0:{dur:.2f},afade=t=in:st=0:d={FADE_IN},afade=t=out:st={max(0.0, dur - FADE_OUT):.2f}:d={FADE_OUT}"
        destino.parent.mkdir(parents=True, exist_ok=True)
        r = rodar(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", fade, "-ac", "2", "-c:a", "libvorbis", "-q:a", str(QUALIDADE), str(destino)])
        if r.returncode != 0 or not destino.is_file():
            print(f"  erro (codificar): {r.stderr.strip()[:200]}")
            return False
    return True


def mesclar_json(arq: Path, novo: dict, chave: str | None, prefixos: list[str], base: dict) -> None:
    """Junta `novo` ao arquivo existente: troca só as entradas com os prefixos (as desta publicação), mantém o resto."""
    atual = base
    if arq.is_file():
        try:
            atual = json.loads(arq.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            atual = base
    alvo = atual if chave is None else atual.setdefault(chave, {})
    for k in [k for k in alvo if any(k.startswith(p) for p in prefixos) and k not in novo]:
        del alvo[k]
    alvo.update(novo)
    arq.parent.mkdir(parents=True, exist_ok=True)
    arq.write_text(json.dumps(atual, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ------------------------------------------------------------------------------------------------------ ambientes
def lufs_de(arq: Path) -> float | None:
    """Loudness integrado (LUFS) do arquivo; None se curto/silencioso demais para medir."""
    r = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", str(arq), "-af", "ebur128=framelog=quiet", "-f", "null", "-"])
    m = re.findall(r"I:\s*(-?[\d.]+)\s*LUFS", r.stderr)
    if not m:
        return None
    v = float(m[-1])
    return v if v > -69 else None


def pico_de(arq: Path) -> float | None:
    r = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", str(arq), "-af", "astats=metadata=0", "-f", "null", "-"])
    m = re.findall(r"Peak level dB:\s*(-?[\d.]+|-inf)", r.stderr)
    try:
        return max(float(x) for x in m if x != "-inf")
    except ValueError:
        return None


def slug(texto: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", texto.lower()).strip("_")
    return s[:48].strip("_") or "som"


def emendar(entrada: Path, destino: Path, cruzamento: float = 1.5) -> bool:
    """Faz o fim voltar ao começo sem estalo (segunda metade + primeira, com fade cruzado no meio)."""
    meio = duracao(entrada) / 2
    r = rodar(["ffmpeg", "-y", "-v", "error", "-i", str(entrada), "-i", str(entrada), "-filter_complex",
               f"[0:a]atrim=start={meio},asetpts=PTS-STARTPTS[b];[1:a]atrim=end={meio},asetpts=PTS-STARTPTS[a];[b][a]acrossfade=d={cruzamento}:c1=tri:c2=tri[o]",
               "-map", "[o]", str(destino)])
    return r.returncode == 0 and destino.is_file()


def preparar(origem: Path, tmp: Path, canais: int, aparar: bool, filtro: str, cortar: float) -> Path | None:
    """Decodifica para wav 44,1 kHz com o número de canais pedido, cortando silêncio, filtro e duração máxima."""
    partes: list[str] = []
    if aparar:
        corte = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05"
        partes += [corte, "areverse", corte.replace("start_silence=0.05", "start_silence=0.15"), "areverse"]
    if filtro == "abafado":
        partes += ["highpass=f=140", "lowpass=f=2600"]
    if cortar > 0:
        partes += [f"atrim=0:{cortar:.1f}", "asetpts=PTS-STARTPTS"]
    wav = tmp / "base.wav"
    args = ["ffmpeg", "-y", "-v", "error", "-i", str(origem), "-vn", "-ac", str(canais), "-ar", "44100"]
    if partes:
        args += ["-af", ",".join(partes)]
    r = rodar([*args, str(wav)])
    if r.returncode != 0 or not wav.is_file():
        print(f"  erro (decodificar): {r.stderr.strip()[:200]}")
        return None
    return wav


def misturar_camada(base: Path, camada: Path, volume: float, tmp: Path, alvo: float) -> Path | None:
    """Mistura um loop de fundo por baixo (repetido até cobrir a faixa) com o nível relativo `volume` (~ -8 dB * volume)."""
    lm, lc = lufs_de(base), lufs_de(camada)
    if lm is None or lc is None:
        return None
    ganho = (lm - lc) - 8 + 20 * math.log10(max(volume, 0.05))
    dur = duracao(base)
    saida = tmp / "mix.wav"
    r = rodar(["ffmpeg", "-y", "-v", "error", "-i", str(base), "-stream_loop", "-1", "-i", str(camada), "-t", f"{dur:.2f}", "-filter_complex",
               f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume={ganho:.2f}dB[c];[0:a][c]amix=inputs=2:duration=first:normalize=0:dropout_transition=0[o]",
               "-map", "[o]", "-ar", "44100", str(saida)])
    if r.returncode != 0 or not saida.is_file():
        print(f"  erro (camada): {r.stderr.strip()[:200]}")
        return None
    return saida


def tratar_ambiente(origem: Path, destino: Path, tipo: str, op: dict) -> bool:
    """tipo: 'musica' (estéreo) ou 'pontual' (mono). op: loop, filtro, camada, emendar."""
    musica = tipo == "musica"
    loop = bool(op.get("loop"))
    alvo = LUFS if musica else LUFS_PONTUAL
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        dur0 = duracao(origem)
        cortar = float(op.get("max_s", 0)) if musica else 0.0
        if musica and not cortar and not loop and dur0 > CORTE_AMBIENTE:
            cortar = DURACAO_AMBIENTE
        if cortar and dur0 <= cortar:
            cortar = 0.0
        wav = preparar(origem, tmp, 1, aparar=not loop, filtro=op.get("filtro", ""), cortar=cortar)
        if wav is None:
            return False
        if loop and op.get("emendar"):
            seam = tmp / "emendado.wav"
            if not emendar(wav, seam, 2.0):
                print("  erro (emendar)")
                return False
            wav = seam
        camada = op.get("camada")
        if camada:
            arq = SONS / camada["arquivo"]
            if not arq.is_file():
                print(f"  camada ausente: {camada['arquivo']}")
                return False
            mix = misturar_camada(wav, arq, float(camada.get("volume", 1.0)), tmp, alvo)
            if mix is None:
                return False
            wav = mix
        dur = duracao(wav)
        if dur < (0.2 if not musica else 5):
            print(f"  descartada: só {dur:.2f}s depois de tratar")
            return False
        # ganho linear até o alvo de loudness (pontuais curtíssimos: ancora no pico)
        l = lufs_de(wav)
        if l is not None:
            ganho = max(-GANHO_MAX_DB, min(GANHO_MAX_DB, alvo - l))
        else:
            p = pico_de(wav)
            ganho = (-6.0 - p) if p is not None else 0.0
        filtros = [f"volume={ganho:.2f}dB"]
        if musica and not loop:
            filtros += [f"afade=t=in:st=0:d={FADE_IN}", f"afade=t=out:st={max(0.0, dur - FADE_OUT):.2f}:d={FADE_OUT}"]
        elif not musica:
            filtros += ["afade=t=in:st=0:d=0.01", f"afade=t=out:st={max(0.0, dur - 0.08):.2f}:d=0.08"]
        lim = 10 ** (PICO_DB / 20)
        filtros.append(f"alimiter=limit={lim:.3f}:level=disabled:attack=2:release=40")
        destino.parent.mkdir(parents=True, exist_ok=True)
        q = int(op.get("q", QUALIDADE_AMBIENTE)) if musica else QUALIDADE_PONTUAL
        r = rodar(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", ",".join(filtros), "-ac", "1", "-c:a", "libvorbis", "-q:a", str(q), str(destino)])  # ambiente em mono: metade do tamanho
        if r.returncode != 0 or not destino.is_file():
            print(f"  erro (codificar): {r.stderr.strip()[:200]}")
            return False
    mb = destino.stat().st_size / 1048576
    if mb > LIMITE_MB:
        print(f"  rejeitada: {mb:.1f} MB passa do limite de {LIMITE_MB} MB")
        destino.unlink()
        return False
    return True


_cache: dict[str, str] = {}


def com_cache(origem: Path, destino: Path, tipo: str, op: dict) -> bool:
    """tratar_ambiente, mas pula quando a origem, as opções e a versão do tratamento não mudaram desde a última vez."""
    st = origem.stat()
    chave = f"{VERSAO_TRATAMENTO}|{LUFS}|{LUFS_PONTUAL}|{QUALIDADE_AMBIENTE}|{QUALIDADE_PONTUAL}|{st.st_mtime_ns}|{st.st_size}|{tipo}|{json.dumps(op, sort_keys=True)}"
    camada = op.get("camada")
    if camada and (SONS / camada["arquivo"]).is_file():
        chave += f"|{(SONS / camada['arquivo']).stat().st_mtime_ns}"
    if destino.is_file() and _cache.get(destino.name) == chave:
        print("    (já pronto)")
        return True
    if not tratar_ambiente(origem, destino, tipo, op):
        _cache.pop(destino.name, None)
        return False
    _cache[destino.name] = chave
    return True


def publicar_ambientes(cfg: dict) -> tuple[dict, dict, dict, dict]:
    """Publica tudo que está em cfg['ambientes'] (menos o 'lobby' lofi). Devolve (ambientes_js, music_defs, sound_defs, publicados)."""
    if CACHE.is_file():
        try:
            _cache.update(json.loads(CACHE.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            pass
    publicados: dict[tuple, dict] = {}  # chave (tipo, arquivo, opções) -> {id, segundos}
    music_defs: dict = {}
    sound_defs: dict = {}
    pos_arquivo: dict[str, bool] = {}
    usados_ids: set[str] = set()
    saida: dict = {}

    def id_unico(base: str, prefixo: str) -> str:
        n, cand = 2, base
        while f"{prefixo}{cand}" in usados_ids:
            cand = f"{base}_{n}"
            n += 1
        usados_ids.add(f"{prefixo}{cand}")
        return cand

    for chave, amb in cfg.get("ambientes", {}).items():
        print(f"== ambiente {chave}")
        item = {"nome": amb.get("nome", chave), "musicas": [], "pontuais": [], "pausa": amb.get("pausa", [5, 15]),
                "pontualACada": amb.get("pontual_a_cada", [30, 90]), "fade": amb.get("fade", 3)}
        for m in amb.get("musicas", []):
            arq = SONS / m["arquivo"]
            op = {k: m[k] for k in ("loop", "filtro", "camada", "emendar", "max_s", "q") if k in m}
            ch = ("musica", m["arquivo"], json.dumps(op, sort_keys=True))
            if ch not in publicados:
                if not arq.is_file():
                    print(f"  FALTA: {m['arquivo']}")
                    continue
                base = slug(m.get("id") or arq.stem)
                nid = id_unico(base, "vulpus.m_")
                destino = SAIDA_MUSICA / f"m_{nid}.ogg"
                print(f"  música {nid} <- {m['arquivo']}")
                if not com_cache(arq, destino, "musica", op):
                    usados_ids.discard(f"vulpus.m_{nid}")
                    continue
                publicados[ch] = {"id": f"vulpus.m_{nid}", "arquivo": f"m_{nid}", "segundos": round(duracao(destino)), "mb": destino.stat().st_size / 1048576}
                music_defs[f"vulpus.m_{nid}"] = {"event_name": f"music.vulpus.m_{nid}", "min_delay": 0, "max_delay": 0}
                sound_defs[f"music.vulpus.m_{nid}"] = {
                    "category": "ambient",  # categoria "ambient" (não "music"): a música do Minecraft não a interrompe e ela não interrompe a do jogo
                    "sounds": [{"name": f"sounds/music/vulpus/m_{nid}", "stream": True, "volume": 1.0, "is3D": False, "load_on_low_memory": True}],
                }
            if ch not in publicados:
                continue
            p = publicados[ch]
            e = {"id": p["id"], "nome": nome_bonito(arq), "segundos": p["segundos"], "volume": float(m.get("volume", 1.0)), "loop": bool(m.get("loop"))}
            if m.get("loop"):
                e["tempo"] = m.get("tempo", [90, 180])
            item["musicas"].append(e)
        for s in amb.get("pontuais", []):
            arq = SONS / s["arquivo"]
            ch = ("pontual", s["arquivo"], "")
            pos_arquivo[s["arquivo"]] = pos_arquivo.get(s["arquivo"], False) or bool(s.get("posicional"))
            if ch not in publicados:
                if not arq.is_file():
                    print(f"  FALTA: {s['arquivo']}")
                    continue
                nid = id_unico(slug(arq.stem), "vulpus.p_")
                destino = SAIDA_PONTUAL / f"p_{nid}.ogg"
                print(f"  pontual {nid} <- {s['arquivo']}")
                if not com_cache(arq, destino, "pontual", {}):
                    usados_ids.discard(f"vulpus.p_{nid}")
                    continue
                publicados[ch] = {"id": f"vulpus.p_{nid}", "arquivo": f"p_{nid}", "segundos": round(duracao(destino), 1), "mb": destino.stat().st_size / 1048576, "origem": s["arquivo"]}
            if ch not in publicados:
                continue
            p = publicados[ch]
            item["pontuais"].append({
                "id": p["id"], "segundos": p["segundos"], "volume": float(s.get("volume", 1.0)), "peso": float(s.get("peso", 1)),
                "tom": s.get("tom", [1.0, 1.0]), "posicional": bool(s.get("posicional")), "susto": bool(s.get("susto")),
            })
        saida[chave] = item
    # definições dos pontuais (posicional em qualquer ambiente => limites de distância)
    for (tipo, arq, _), p in publicados.items():
        if tipo != "pontual":
            continue
        d = {"category": "ambient", "sounds": [{"name": f"sounds/vulpus/{p['arquivo']}", "volume": 1.0, "load_on_low_memory": True}]}
        if pos_arquivo.get(arq):
            d["max_distance"] = 40
            d["min_distance"] = 2
        sound_defs[p["id"]] = d
    # apaga o que saiu da configuração e grava o cache
    atuais = {f"{p['arquivo']}.ogg" for p in publicados.values()}
    for velho in list(SAIDA_MUSICA.glob("m_*.ogg")) + list(SAIDA_PONTUAL.glob("p_*.ogg")):
        if velho.name not in atuais:
            velho.unlink()
    for k in [k for k in _cache if k not in atuais]:
        del _cache[k]
    CACHE.write_text(json.dumps(_cache, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    return saida, music_defs, sound_defs, publicados


def js_obj(d: dict) -> str:
    """Objeto JS com chaves sem aspas, no estilo do resto do código."""
    return "{ " + ", ".join(f"{k}: {js_literal(v)}" for k, v in d.items()) + " }"


def js_literal(v) -> str:
    return json.dumps(v, ensure_ascii=False)


def main() -> int:
    if len(sys.argv) > 1:  # teste: usa outra pasta para a playlist "lobby"
        PLAYLISTS["lobby"] = (Path(sys.argv[1]), PLAYLISTS["lobby"][1])
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("ffmpeg/ffprobe não encontrados no PATH")
        return 1
    publicadas: dict[str, list[dict]] = {}
    music_defs: dict = {}
    sound_defs: dict = {}
    for lista, (pasta, maximo) in PLAYLISTS.items():
        print(f"== {lista} ({pasta})")
        for velho in SAIDA_MUSICA.glob(f"{lista}_*.ogg"):
            velho.unlink()
        faixas: list[dict] = []
        for arq in escolher(pasta, maximo * 2):
            if len(faixas) >= maximo:
                break
            n = len(faixas) + 1
            print(f" {n}: {arq.name}")
            destino = SAIDA_MUSICA / f"{lista}_{n}.ogg"
            if not tratar(arq, destino):
                continue
            seg = round(duracao(destino))
            faixas.append({"id": f"vulpus.{lista}_{n}", "nome": nome_bonito(arq), "segundos": seg})
        publicadas[lista] = faixas
        for f in faixas:
            n = f["id"].split("_")[-1]
            music_defs[f["id"]] = {"event_name": f"music.{f['id']}", "min_delay": 0, "max_delay": 0}
            sound_defs[f"music.{f['id']}"] = {
                "category": "ambient",  # categoria "ambient" (não "music"): a música do Minecraft não a interrompe e ela não interrompe a do jogo
                "sounds": [{"name": f"sounds/music/vulpus/{lista}_{n}", "stream": True, "volume": 1.0, "is3D": False, "load_on_low_memory": True}],
            }

    ambientes: dict = {}
    publicados: dict = {}
    if AMBIENTES_JSON.is_file():
        cfg = json.loads(AMBIENTES_JSON.read_text(encoding="utf-8"))
        ambientes, md, sd, publicados = publicar_ambientes(cfg)
        music_defs.update(md)
        sound_defs.update(sd)
    # lobby: a playlist lofi vira as músicas do ambiente 'lobby' (volume 1)
    for chave, amb in ambientes.items():
        cfg_amb = (json.loads(AMBIENTES_JSON.read_text(encoding="utf-8")).get("ambientes", {}).get(chave, {}))
        lista = cfg_amb.get("playlist")
        if lista and lista in publicadas:
            amb["musicas"] = [{"id": f["id"], "nome": f["nome"], "segundos": f["segundos"], "volume": 1.0, "loop": False} for f in publicadas[lista]]

    mesclar_json(RP / "sounds" / "music_definitions.json", music_defs, None, ["vulpus.lobby_", "vulpus.m_"], {})
    mesclar_json(RP / "sounds" / "sound_definitions.json", sound_defs, "sound_definitions", ["music.vulpus.lobby_", "music.vulpus.m_", "vulpus.p_"],
                 {"format_version": "1.14.0", "sound_definitions": {}})

    linhas = [
        "// @ts-check",
        "// GERADO por tools/sons_publicar.py — não edite à mão (a configuração fica em Sons/_ambientes.json). Duração real de cada som publicado (segundos).",
        "",
        "/** @type {Record<string, { id: string, nome: string, segundos: number }[]>} */",
        "export const PLAYLISTS = {",
    ]
    for lista, faixas in publicadas.items():
        if not faixas:
            linhas.append(f"  {lista}: [],")
            continue
        linhas.append(f"  {lista}: [")
        for f in faixas:
            linhas.append(f"    {{ id: {js_literal(f['id'])}, nome: {js_literal(f['nome'])}, segundos: {f['segundos']} }},")
        linhas.append("  ],")
    linhas += [
        "};",
        "",
        "/**",
        " * Ambientes sonoros. musicas: faixa (id do `music play`), segundos reais, volume relativo, loop (camada que repete por `tempo` [min,max] s).",
        " * pontuais: som curto (id do playSound) sorteado por peso, volume relativo, tom [min,max], posicional, susto.",
        " * pausa = silêncio entre faixas (s); pontualACada = intervalo entre pontuais (s); fade = fade ao trocar de ambiente (s).",
        " * @typedef {{ id: string, nome: string, segundos: number, volume: number, loop: boolean, tempo?: number[] }} Musica",
        " * @typedef {{ id: string, segundos: number, volume: number, peso: number, tom: number[], posicional: boolean, susto: boolean }} Pontual",
        " * @typedef {{ nome: string, musicas: Musica[], pontuais: Pontual[], pausa: number[], pontualACada: number[], fade: number }} AmbienteSom",
        " * @type {Record<string, AmbienteSom>}",
        " */",
        "export const AMBIENTES = {",
    ]
    for chave, amb in ambientes.items():
        linhas.append(f"  {chave}: {{")
        linhas.append(f"    nome: {js_literal(amb['nome'])},")
        for campo in ("musicas", "pontuais"):
            if not amb[campo]:
                linhas.append(f"    {campo}: [],")
                continue
            linhas.append(f"    {campo}: [")
            for e in amb[campo]:
                linhas.append(f"      {js_obj(e)},")
            linhas.append("    ],")
        linhas.append(f"    pausa: {js_literal(amb['pausa'])},")
        linhas.append(f"    pontualACada: {js_literal(amb['pontualACada'])},")
        linhas.append(f"    fade: {amb['fade']},")
        linhas.append("  },")
    linhas += ["};", ""]
    BP_TEXTO.write_text("\n".join(linhas), encoding="utf-8")

    mb_lobby = sum(p.stat().st_size for p in SAIDA_MUSICA.glob("lobby_*.ogg")) / 1048576
    mb_m = sum(p.stat().st_size for p in SAIDA_MUSICA.glob("m_*.ogg")) / 1048576
    mb_p = sum(p.stat().st_size for p in SAIDA_PONTUAL.glob("p_*.ogg")) / 1048576
    total = mb_lobby + mb_m + mb_p
    print("\nResumo por ambiente (MB contados por ambiente; arquivos compartilhados aparecem em cada um):")
    por_id = {p["id"]: p["mb"] for p in publicados.values()}
    for chave, amb in ambientes.items():
        if chave == "lobby":
            print(f"  {chave:13} {len(amb['musicas'])} músicas (lofi), {mb_lobby:.1f} MB")
            continue
        mbs = sum(por_id.get(e["id"], 0) for e in amb["musicas"] + amb["pontuais"])
        print(f"  {chave:13} {len(amb['musicas'])} músicas, {len(amb['pontuais'])} pontuais, {mbs:.1f} MB")
    print(f"\nTotal: lobby {mb_lobby:.1f} + ambientes {mb_m:.1f} + pontuais {mb_p:.1f} = {total:.1f} MB (orçamento {AVISO_MB} MB)")
    if total > AVISO_MB:
        print(f"AVISO: passou de {AVISO_MB} MB; reduza faixas, tamanho ou qualidade")
    return 0


if __name__ == "__main__":
    sys.exit(main())
