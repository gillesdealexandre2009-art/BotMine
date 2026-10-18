#!/usr/bin/env python3
"""Baixa sons CC0 (domínio público) do OpenGameArt e converte para .ogg dentro de addon/Sons.

Uso, a partir da pasta addon/:
    python tools/sons_baixar_cc0.py

Só entram itens cuja página mostra a licença CC0 (conferido na hora de escolher); cada pasta ganha um _creditos.txt com
a fonte (CC0 não exige crédito, mas guardamos de onde veio). Precisa do ffmpeg no PATH.
"""
from __future__ import annotations

import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "Sons"
BASE = "https://opengameart.org/sites/default/files/"
UA = {"User-Agent": "Mozilla/5.0 (Vulpus sons)"}

# pasta -> lista de (arquivo no site, nome local, página)
PACOTES = {
    "05_tensao_e_drones": [
        ("Cage%20of%20the%20Cryptid.mp3", "cage_of_the_cryptid", "https://opengameart.org/content/ambience-pack-1-sci-fi-horror"),
        ("Final%20Captain%27s%20Log.mp3", "final_captains_log", "https://opengameart.org/content/ambience-pack-1-sci-fi-horror"),
        ("Infestation%20in%20the%20Control%20Room.mp3", "infestation_control_room", "https://opengameart.org/content/ambience-pack-1-sci-fi-horror"),
        ("The%20Depths%20of%20Hell.mp3", "the_depths_of_hell", "https://opengameart.org/content/ambience-pack-1-sci-fi-horror"),
        ("The%20Surreal%20Truth.mp3", "the_surreal_truth", "https://opengameart.org/content/ambience-pack-1-sci-fi-horror"),
    ],
}
ZIPS = {"05_tensao_e_drones": ("dark_ambiences.zip", "https://opengameart.org/content/dark-ambiences", "dark_ambience")}


def baixar(url: str, destino: Path) -> None:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(destino, "wb") as f:
        f.write(r.read())


def para_ogg(entrada: Path, destino: Path) -> None:
    r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(entrada), "-c:a", "libvorbis", "-q:a", "3", str(destino)], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("ffmpeg falhou: " + r.stderr[-500:])


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main() -> None:
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        for pasta, itens in PACOTES.items():
            destino = RAIZ / pasta
            destino.mkdir(parents=True, exist_ok=True)
            creditos: list[str] = []
            for arquivo, nome, pagina in itens:
                bruto = tmp / urllib.parse.unquote(arquivo)
                baixar(BASE + arquivo, bruto)
                para_ogg(bruto, destino / f"{nome}.ogg")
                creditos.append(f"{nome}.ogg  <- {pagina}  (CC0, domínio público)")
                print("ok:", nome)
            if pasta in ZIPS:
                arquivo, pagina, prefixo = ZIPS[pasta]
                z = tmp / arquivo
                baixar(BASE + arquivo, z)
                with zipfile.ZipFile(z) as zf:
                    for info in zf.infolist():
                        if info.is_dir() or "__MACOSX" in info.filename or Path(info.filename).name.startswith(".") or not info.filename.lower().endswith((".wav", ".mp3", ".ogg", ".flac")):
                            continue
                        bruto = tmp / Path(info.filename).name
                        bruto.write_bytes(zf.read(info))
                        nome = f"{prefixo}_{slug(bruto.stem)}"
                        para_ogg(bruto, destino / f"{nome}.ogg")
                        creditos.append(f"{nome}.ogg  <- {pagina}  (CC0, domínio público)")
                        print("ok:", nome)
            (destino / "_creditos.txt").write_text(
                "Sons baixados do OpenGameArt com licença CC0 (domínio público: uso livre, crédito não é obrigatório).\n"
                "Convertidos para .ogg por tools/sons_baixar_cc0.py.\n\n" + "\n".join(creditos) + "\n",
                encoding="utf-8",
            )


if __name__ == "__main__":
    main()
