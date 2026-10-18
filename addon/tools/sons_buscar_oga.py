#!/usr/bin/env python3
"""Busca sons CC0 (domínio público) no OpenGameArt por tema e baixa para addon/Sons/<pasta>, já em .ogg.

Uso, a partir da pasta addon/:
    python tools/sons_buscar_oga.py              (todas as pastas)
    python tools/sons_buscar_oga.py 03 12        (só as pastas que começam com esses números)

Como funciona: para cada pasta há consultas (palavras-chave + tipo: música ou efeito). A busca do site já filtra por licença CC0;
mesmo assim cada página é conferida (selo CC0) antes de baixar. Por página, baixa até N arquivos de áudio (mp3, ogg, wav, flac) ou
abre zips e escolhe os que casam com palavras úteis. Converte tudo para .ogg (música em estéreo, efeitos em mono), pula arquivos
muito grandes e escreve um _creditos.txt em cada pasta. Precisa do ffmpeg no PATH.
"""
from __future__ import annotations

import html
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "Sons"
SITE = "https://opengameart.org"
UA = {"User-Agent": "Mozilla/5.0 (Vulpus sons)"}
MUSICA, EFEITO = 12, 13
EXT_AUDIO = (".mp3", ".ogg", ".wav", ".flac")
LIMITE_BAIXAR_MB = 60
LIMITE_OGG_MB = 6.0

# pasta -> {estéreo, consultas:[(palavras, tipo, páginas, arquivos por página)], max, preferir:[palavras para escolher dentro de zips]}
PLANO = {
    "01_ambiente_dreamcore": {"estereo": True, "max": 14, "consultas": [("dream", MUSICA, 3, 2), ("ethereal", MUSICA, 2, 2), ("ambient+pad", MUSICA, 2, 2), ("peaceful+ambient", MUSICA, 2, 2), ("nostalgia", MUSICA, 2, 2), ("memory", MUSICA, 2, 2), ("calm+piano", MUSICA, 2, 2), ("soft+ambient", MUSICA, 2, 2)]},
    "02_caixa_de_musica": {"estereo": True, "max": 12, "consultas": [("music+box", MUSICA, 2, 4), ("lullaby", MUSICA, 3, 2), ("celesta", MUSICA, 1, 2), ("glockenspiel", MUSICA, 1, 2), ("bells", MUSICA, 2, 2)]},
    "03_elevador_e_shopping": {"estereo": True, "max": 10, "consultas": [("elevator", MUSICA, 2, 2), ("bossa", MUSICA, 1, 2), ("shop", MUSICA, 2, 2), ("lounge", MUSICA, 2, 2), ("smooth+jazz", MUSICA, 2, 2), ("vaporwave", MUSICA, 2, 2), ("muzak", MUSICA, 1, 2)]},
    "04_estatica_e_radio": {"estereo": False, "max": 8, "consultas": [("static", EFEITO, 2, 2), ("radio", EFEITO, 2, 2), ("tv+noise", EFEITO, 1, 2), ("hum", EFEITO, 1, 2)]},
    "05_tensao_e_drones": {"estereo": True, "max": 22, "consultas": [("drone", MUSICA, 2, 2), ("dark+ambient", MUSICA, 3, 2), ("creepy", MUSICA, 2, 2), ("horror+ambient", MUSICA, 2, 2), ("tension", MUSICA, 2, 2), ("eerie", MUSICA, 2, 2)]},
    "06_sustos": {"estereo": False, "max": 12, "consultas": [("scream", EFEITO, 2, 2), ("jump+scare", EFEITO, 2, 2), ("horror+stinger", EFEITO, 2, 2), ("monster", EFEITO, 1, 2), ("ghost", EFEITO, 1, 2)]},
    "07_sala_branca": {"estereo": True, "max": 10, "consultas": [("sine+drone", MUSICA, 1, 2), ("minimal+ambient", MUSICA, 2, 2), ("ambient+loop", MUSICA, 2, 2), ("space+ambient", MUSICA, 2, 2), ("pad", MUSICA, 2, 2)]},
    "08_trem_e_estacao": {"estereo": False, "max": 8, "consultas": [("train", EFEITO, 3, 3), ("railway", EFEITO, 1, 2), ("steam", EFEITO, 1, 2), ("engine", EFEITO, 1, 2), ("train", MUSICA, 2, 2)]},
    "09_campo_de_trigo": {"estereo": True, "max": 14, "consultas": [("wind", EFEITO, 2, 2), ("flute", MUSICA, 2, 2), ("choir", MUSICA, 2, 2), ("meadow", MUSICA, 2, 2), ("pastoral", MUSICA, 2, 2), ("harp", MUSICA, 2, 2), ("nature", MUSICA, 2, 2)]},
    "10_vila_e_lobby": {"estereo": True, "max": 12, "consultas": [("village", MUSICA, 2, 2), ("town", MUSICA, 2, 2), ("peaceful", MUSICA, 2, 2), ("tavern", MUSICA, 1, 2), ("folk", MUSICA, 2, 2)]},
    "10_vila_e_lobby/lofi": {"estereo": True, "max": 14, "consultas": [("lofi", MUSICA, 3, 3), ("lo-fi", MUSICA, 2, 3), ("chill", MUSICA, 3, 2), ("chillhop", MUSICA, 1, 2), ("relax", MUSICA, 2, 2)]},
    "11_feira_e_minigames": {"estereo": True, "max": 14, "consultas": [("carnival", MUSICA, 2, 2), ("fair", MUSICA, 2, 2), ("circus", MUSICA, 1, 2), ("minigame", MUSICA, 1, 2), ("polka", MUSICA, 1, 2), ("calliope", MUSICA, 1, 2), ("happy", MUSICA, 2, 2)]},
    "12_vitoria_e_conquistas": {"estereo": False, "max": 12, "consultas": [("victory", MUSICA, 2, 2), ("fanfare", MUSICA, 1, 2), ("level+up", EFEITO, 2, 4), ("jingle", MUSICA, 1, 2)]},
    "13_efeitos_curtos": {"estereo": False, "max": 18, "consultas": [("ui+click", EFEITO, 2, 4), ("door", EFEITO, 2, 3), ("footsteps", EFEITO, 1, 3), ("bell", EFEITO, 2, 2)], "preferir": ["door", "step", "click", "bell", "chime", "ding", "pop", "open", "close"]},
    "14_vozes_e_sussurros": {"estereo": False, "max": 10, "consultas": [("whisper", EFEITO, 2, 2), ("voice", EFEITO, 2, 2), ("girl+laugh", EFEITO, 1, 2), ("breath", EFEITO, 1, 2), ("child", EFEITO, 1, 2)]},
}


def pegar(url: str, binario: bool = False, limite_mb: float = LIMITE_BAIXAR_MB):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        tam = r.headers.get("Content-Length")
        if tam and int(tam) > limite_mb * 1_000_000:
            raise ValueError(f"grande demais ({int(tam) / 1e6:.0f} MB)")
        dados = r.read()
    return dados if binario else dados.decode("utf-8", "replace")


def slugs_da_busca(palavras: str, tipo: int, paginas: int) -> list[str]:
    achados: list[str] = []
    for pg in range(paginas):
        url = f"{SITE}/art-search-advanced?keys={palavras}&field_art_type_tid%5B%5D={tipo}&field_art_licenses_tid%5B%5D=4&sort_by=count&sort_order=DESC&page={pg}"
        try:
            pagina = pegar(url)
        except Exception as e:  # noqa: BLE001
            print("  busca falhou:", e)
            break
        for s in re.findall(r'href="/content/([^"#?]+)"', pagina):
            if s not in achados and s not in ("faq", "submit-art") and not s.startswith("october-"):
                achados.append(s)
    return achados


def slug_texto(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:48] or "som"


def para_ogg(entrada: Path, destino: Path, estereo: bool) -> bool:
    r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(entrada), "-ac", "2" if estereo else "1", "-ar", "44100", "-c:a", "libvorbis", "-q:a", "3", str(destino)], capture_output=True, text=True)
    if r.returncode != 0:
        return False
    if destino.stat().st_size > LIMITE_OGG_MB * 1_000_000:
        destino.unlink()
        return False
    return True


def processar_pagina(slug: str, pasta: Path, cfg: dict, tmp: Path, por_pagina: int, creditos: list[str], feitos: list[str]) -> None:
    url = f"{SITE}/content/{slug}"
    try:
        pagina = pegar(url)
    except Exception as e:  # noqa: BLE001
        print("  pagina falhou:", slug, e)
        return
    if "cc0.png" not in pagina and "CC0" not in pagina:
        print("  pulando (sem CC0):", slug)
        return
    titulo = html.unescape(re.sub(r"<[^>]+>", "", (re.search(r"<title>([^<]*)", pagina) or [None, slug])[1])).split("|")[0].strip()
    arquivos = [urllib.parse.unquote(m) for m in dict.fromkeys(re.findall(r'href="(https://opengameart\.org/sites/default/files/[^"]+\.(?:mp3|ogg|wav|flac|zip))"', pagina, re.I))]
    usados = 0
    for link in arquivos:
        if usados >= por_pagina or len(feitos) >= cfg["max"]:
            break
        nome_arq = Path(link).name
        try:
            dados = pegar(urllib.parse.quote(link, safe=":/%"), True)
        except Exception as e:  # noqa: BLE001
            print("  pulou", nome_arq, "-", e)
            continue
        brutos: list[Path] = []
        if nome_arq.lower().endswith(".zip"):
            z = tmp / nome_arq
            z.write_bytes(dados)
            try:
                with zipfile.ZipFile(z) as zf:
                    candidatos = [i for i in zf.infolist() if not i.is_dir() and "__MACOSX" not in i.filename and not Path(i.filename).name.startswith(".") and i.filename.lower().endswith(EXT_AUDIO)]
                    pref = cfg.get("preferir")
                    if pref:
                        candidatos = [i for i in candidatos if any(p in i.filename.lower() for p in pref)] or candidatos
                    for info in candidatos[: max(1, por_pagina - usados)]:
                        b = tmp / Path(info.filename).name
                        b.write_bytes(zf.read(info))
                        brutos.append(b)
            except zipfile.BadZipFile:
                continue
        else:
            b = tmp / nome_arq
            b.write_bytes(dados)
            brutos.append(b)
        for b in brutos:
            if len(feitos) >= cfg["max"]:
                break
            nome = f"{slug_texto(slug)[:24]}_{slug_texto(b.stem)}"[:56]
            destino = pasta / f"{nome}.ogg"
            if destino.exists():
                continue
            if para_ogg(b, destino, cfg["estereo"]):
                feitos.append(nome)
                usados += 1
                creditos.append(f"{nome}.ogg  <- {titulo}  {url}  (CC0, domínio público)")
                print("  ok:", nome, f"({destino.stat().st_size // 1024} KB)")
            else:
                print("  pulou (conversão/tamanho):", b.name)


def main() -> None:
    quais = sys.argv[1:]
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        for nome, cfg in PLANO.items():
            if quais and not any(nome.startswith(q) for q in quais):
                continue
            pasta = RAIZ / nome
            pasta.mkdir(parents=True, exist_ok=True)
            print("==", nome)
            creditos: list[str] = []
            feitos: list[str] = [p.stem for p in pasta.glob("*.ogg")]
            for palavras, tipo, paginas, por_pagina in cfg["consultas"]:
                if len(feitos) >= cfg["max"]:
                    break
                for slug in slugs_da_busca(palavras, tipo, paginas):
                    if len(feitos) >= cfg["max"]:
                        break
                    processar_pagina(slug, pasta, cfg, tmp, por_pagina, creditos, feitos)
            if creditos:
                antigo = (pasta / "_creditos.txt").read_text(encoding="utf-8") if (pasta / "_creditos.txt").exists() else (
                    "Sons do OpenGameArt com licença CC0 (domínio público: uso livre, crédito não é obrigatório).\nBaixados por tools/sons_buscar_oga.py.\n\n"
                )
                (pasta / "_creditos.txt").write_text(antigo.rstrip("\n") + "\n" + "\n".join(creditos) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
