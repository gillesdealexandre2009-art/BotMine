#!/usr/bin/env python3
"""Confere e empacota o addon Vulpus.

Uso:
    python tools/build.py            confere tudo e gera a pasta dist/
    python tools/build.py --sem-ui   pula o verificar_ui.py (mais rápido)

O que é conferido antes de empacotar:
  * todo .json dos packs abre como JSON em UTF-8 sem BOM (e .js/.lang também sem BOM,
    porque os códigos § dependem disso);
  * os manifests: UUIDs, versões e dependências entre BP e RP batem, e as versões dos
    módulos @minecraft/* são as mesmas do package.json;
  * todo import dos scripts (a partir de scripts/main.js) aponta para um arquivo que existe,
    e todo módulo @minecraft/* importado está nas dependências do manifest;
  * texturas: o item_texture.json aponta para PNGs que existem, o ícone do item existe no
    item_texture.json e todo caminho "textures/vulpus/..." citado no RP ou nos scripts existe;
  * idiomas: languages.json lista arquivos que existem e toda chave usada pelos itens está
    em todos os .lang;
  * o verificar_ui.py (se existir) não acusa erro. Se o jogo não estiver instalado, só avisa.

Saída em dist/:
  * Vulpus_BP.mcpack e Vulpus_RP.mcpack: um zip por pack, com o manifest.json na raiz;
  * Vulpus.mcaddon: um zip com as pastas vulpus_bp/ e vulpus_rp/ na raiz (cada uma com o
    seu manifest.json). Dois cliques nele e o Minecraft importa os dois packs de uma vez.

Saída do programa: 0 = pacote gerado, 1 = algo errado (a mensagem diz o quê).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ADDON = Path(__file__).resolve().parent.parent
BP = ADDON / "vulpus_bp"
RP = ADDON / "vulpus_rp"
DIST = ADDON / "dist"
VERIFICAR_UI = ADDON / "tools" / "verificar_ui.py"
PACKAGE_JSON = ADDON / "package.json"
CONFIG_JS = BP / "scripts" / "config.js"

BOM = b"\xef\xbb\xbf"
IGNORAR = {"__pycache__", ".DS_Store", "Thumbs.db"}
# Data fixa nos zips: o mesmo código gera sempre o mesmo pacote.
DATA_ZIP = (2026, 1, 1, 0, 0, 0)

RE_IMPORT = re.compile(r"""(?:^|[\s;])(?:import|export)\s*(?:[\w*{}\s,$]+\s*from\s*)?["']([^"']+)["']""", re.M)
RE_IMPORT_DINAMICO = re.compile(r"""import\(\s*["']([^"']+)["']\s*\)""")
RE_TEXTURA_RP = re.compile(r"""["'](textures/vulpus/[\w/.-]+)["']""")


class Relatorio:
    """Junta os erros e avisos para mostrar tudo de uma vez."""

    def __init__(self) -> None:
        self.erros: list[str] = []
        self.avisos: list[str] = []

    def erro(self, texto: str) -> None:
        self.erros.append(texto)

    def aviso(self, texto: str) -> None:
        self.avisos.append(texto)


def rel(caminho: Path) -> str:
    """Caminho relativo à pasta addon, com barras normais."""
    try:
        return caminho.relative_to(ADDON).as_posix()
    except ValueError:
        return str(caminho)


def arquivos(pasta: Path) -> list[Path]:
    """Arquivos de um pack, sem lixo de sistema, em ordem estável."""
    return sorted(
        p for p in pasta.rglob("*")
        if p.is_file() and not any(parte in IGNORAR for parte in p.relative_to(pasta).parts)
    )


def ler_json(caminho: Path, r: Relatorio):
    """Abre um JSON exigindo UTF-8 sem BOM. Devolve None (e anota o erro) se falhar."""
    bruto = caminho.read_bytes()
    if bruto.startswith(BOM):
        r.erro(f"{rel(caminho)}: está com BOM; salve como UTF-8 sem BOM")
        bruto = bruto[len(BOM):]
    try:
        return json.loads(bruto.decode("utf-8"))
    except UnicodeDecodeError as e:
        r.erro(f"{rel(caminho)}: não é UTF-8 ({e})")
    except json.JSONDecodeError as e:
        r.erro(f"{rel(caminho)}: JSON inválido na linha {e.lineno}, coluna {e.colno}: {e.msg}")
    return None


def conferir_arquivos(r: Relatorio) -> dict[Path, object]:
    """Valida encoding e JSON de todos os arquivos de texto dos packs."""
    jsons: dict[Path, object] = {}
    for pack in (BP, RP):
        if not (pack / "manifest.json").is_file():
            r.erro(f"{rel(pack)}/manifest.json não existe")
        for arq in arquivos(pack):
            if arq.suffix == ".json":
                dados = ler_json(arq, r)
                if dados is not None:
                    jsons[arq] = dados
            elif arq.suffix in {".js", ".lang"}:
                bruto = arq.read_bytes()
                if bruto.startswith(BOM):
                    r.erro(f"{rel(arq)}: está com BOM; salve como UTF-8 sem BOM")
                try:
                    bruto.decode("utf-8")
                except UnicodeDecodeError as e:
                    r.erro(f"{rel(arq)}: não é UTF-8 ({e})")
    return jsons


def conferir_manifests(jsons: dict[Path, object], r: Relatorio) -> dict[str, str]:
    """Confere a ligação BP <-> RP e as versões. Devolve {módulo @minecraft: versão} do BP."""
    bp = jsons.get(BP / "manifest.json")
    rp = jsons.get(RP / "manifest.json")
    if not isinstance(bp, dict) or not isinstance(rp, dict):
        return {}
    modulos: dict[str, str] = {}
    try:
        bp_header, rp_header = bp["header"], rp["header"]
        deps_bp = bp.get("dependencies", [])
        deps_rp = rp.get("dependencies", [])
        if not any(d.get("uuid") == rp_header["uuid"] and d.get("version") == rp_header["version"] for d in deps_bp):
            r.erro("vulpus_bp/manifest.json: falta a dependência do RP com o uuid e a versão do header do RP")
        if not any(d.get("uuid") == bp_header["uuid"] and d.get("version") == bp_header["version"] for d in deps_rp):
            r.erro("vulpus_rp/manifest.json: falta a dependência do BP com o uuid e a versão do header do BP")
        if bp_header["version"] != rp_header["version"]:
            r.erro("os manifests do BP e do RP estão com versões diferentes")
        uuids = [bp_header["uuid"], rp_header["uuid"]] + [m["uuid"] for m in bp["modules"] + rp["modules"]]
        if len(set(uuids)) != len(uuids):
            r.erro("há UUID repetido entre os manifests")
        scripts = [m for m in bp["modules"] if m.get("type") == "script"]
        for m in scripts:
            entrada = BP / m.get("entry", "")
            if not entrada.is_file():
                r.erro(f"vulpus_bp/manifest.json: a entrada do script ({m.get('entry')}) não existe")
        for d in deps_bp:
            if "module_name" in d:
                modulos[d["module_name"]] = d["version"]
    except (KeyError, TypeError) as e:
        r.erro(f"manifest incompleto: falta {e}")
        return modulos

    versao_addon = ".".join(str(n) for n in bp_header["version"])
    if CONFIG_JS.is_file():
        achou = re.search(r"""VERSAO\s*=\s*["']([^"']+)["']""", CONFIG_JS.read_text(encoding="utf-8"))
        if achou and achou.group(1) != versao_addon:
            r.erro(f"config.js diz VERSAO {achou.group(1)}, mas o manifest diz {versao_addon}")

    if PACKAGE_JSON.is_file():
        dev = ler_json(PACKAGE_JSON, r) or {}
        dev = dev.get("devDependencies", {}) if isinstance(dev, dict) else {}
        for nome, versao in modulos.items():
            if nome in dev and dev[nome] != versao:
                r.erro(f"package.json usa {nome} {dev[nome]}, mas o manifest pede {versao}")
    return modulos


def conferir_scripts(modulos: dict[str, str], r: Relatorio) -> None:
    """Segue os imports a partir de main.js e confere que todo arquivo existe."""
    pasta = BP / "scripts"
    main = pasta / "main.js"
    if not main.is_file():
        r.erro("vulpus_bp/scripts/main.js não existe")
        return
    vistos: set[Path] = set()
    fila = [main]
    while fila:
        atual = fila.pop()
        if atual in vistos:
            continue
        vistos.add(atual)
        texto = atual.read_text(encoding="utf-8", errors="replace")
        alvos = RE_IMPORT.findall(texto) + RE_IMPORT_DINAMICO.findall(texto)
        for alvo in alvos:
            if alvo.startswith("@minecraft/"):
                if alvo not in modulos:
                    r.erro(f"{rel(atual)} importa {alvo}, que não está nas dependências do manifest do BP")
                continue
            if not alvo.startswith("."):
                r.erro(f"{rel(atual)} importa '{alvo}': só caminhos relativos ou @minecraft/* funcionam no jogo")
                continue
            if not alvo.endswith(".js"):
                r.erro(f"{rel(atual)} importa '{alvo}' sem a extensão .js (o jogo exige)")
                continue
            destino = (atual.parent / alvo).resolve()
            if not destino.is_file():
                r.erro(f"{rel(atual)} importa '{alvo}', mas {rel(destino)} não existe (sistema ainda não feito?)")
            else:
                fila.append(destino)
    soltos = sorted(p for p in pasta.rglob("*.js") if p.resolve() not in vistos)
    for solto in soltos:
        r.aviso(f"{rel(solto)} não é importado por ninguém (vai no pacote, mas não roda)")


def conferir_texturas(jsons: dict[Path, object], r: Relatorio) -> None:
    """Confere as texturas próprias citadas no RP, nos itens e nos scripts."""
    atlas = jsons.get(RP / "textures" / "item_texture.json")
    nomes_atlas: set[str] = set()
    if isinstance(atlas, dict):
        for nome, dados in atlas.get("texture_data", {}).items():
            nomes_atlas.add(nome)
            caminhos = dados.get("textures") if isinstance(dados, dict) else None
            for caminho in caminhos if isinstance(caminhos, list) else [caminhos]:
                if isinstance(caminho, str) and not (RP / f"{caminho}.png").is_file():
                    r.erro(f"item_texture.json: '{nome}' aponta para {caminho}.png, que não existe no RP")
    else:
        r.erro("vulpus_rp/textures/item_texture.json não existe ou é inválido")

    for arq, dados in jsons.items():
        if arq.parent != BP / "items" or not isinstance(dados, dict):
            continue
        comps = dados.get("minecraft:item", {}).get("components", {})
        icone = comps.get("minecraft:icon")
        nome = icone.get("textures", {}).get("default") if isinstance(icone, dict) else icone
        if not nome:
            r.erro(f"{rel(arq)}: o item não tem minecraft:icon")
        elif nome not in nomes_atlas:
            r.erro(f"{rel(arq)}: o ícone '{nome}' não está no item_texture.json")

    citados: dict[str, Path] = {}
    for arq in arquivos(RP / "ui") + arquivos(BP / "scripts"):
        if arq.suffix in {".json", ".js"}:
            for caminho in RE_TEXTURA_RP.findall(arq.read_text(encoding="utf-8", errors="replace")):
                citados.setdefault(caminho, arq)
    for caminho, origem in sorted(citados.items()):
        if not any((RP / f"{caminho}{ext}").is_file() for ext in (".png", ".tga", ".jpg", "")):
            r.erro(f"{rel(origem)} usa {caminho}, mas a textura não existe no RP")


def conferir_idiomas(jsons: dict[Path, object], r: Relatorio) -> None:
    """Confere languages.json, os .lang e as chaves usadas pelos itens."""
    pasta = RP / "texts"
    idiomas = jsons.get(pasta / "languages.json")
    if not isinstance(idiomas, list) or not idiomas:
        r.erro("vulpus_rp/texts/languages.json não existe ou está vazio")
        return
    chaves_por_idioma: dict[str, set[str]] = {}
    for idioma in idiomas:
        arq = pasta / f"{idioma}.lang"
        if not arq.is_file():
            r.erro(f"languages.json cita {idioma}, mas {rel(arq)} não existe")
            continue
        chaves: set[str] = set()
        for n, linha in enumerate(arq.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            linha = linha.split("\t##")[0].strip()
            if not linha or linha.startswith("##"):
                continue
            if "=" not in linha:
                r.erro(f"{rel(arq)}, linha {n}: falta o '=' (formato chave=texto)")
                continue
            chave = linha.split("=", 1)[0]
            if chave in chaves:
                r.erro(f"{rel(arq)}, linha {n}: a chave {chave} aparece duas vezes")
            chaves.add(chave)
        chaves_por_idioma[idioma] = chaves

    for arq, dados in jsons.items():
        if arq.parent != BP / "items" or not isinstance(dados, dict):
            continue
        nome = dados.get("minecraft:item", {}).get("components", {}).get("minecraft:display_name", {})
        chave = nome.get("value") if isinstance(nome, dict) else None
        if not chave:
            continue
        for idioma, chaves in chaves_por_idioma.items():
            if chave not in chaves:
                r.erro(f"{rel(arq)} usa a chave {chave}, que falta em {idioma}.lang")


def rodar_verificar_ui(r: Relatorio) -> None:
    """Roda o verificar_ui.py. Código 2 = jogo não encontrado: só avisa."""
    if not VERIFICAR_UI.is_file():
        r.aviso("tools/verificar_ui.py não existe; o JSON UI não foi conferido")
        return
    print("» Conferindo o JSON UI (verificar_ui.py)...", flush=True)
    resultado = subprocess.run([sys.executable, str(VERIFICAR_UI)], cwd=ADDON)
    if resultado.returncode == 2:
        r.aviso("verificar_ui.py não achou a UI do jogo instalado; o JSON UI não foi conferido")
    elif resultado.returncode != 0:
        r.erro("verificar_ui.py achou erros no JSON UI (veja acima)")


def zipar(destino: Path, entradas: list[tuple[Path, Path]]) -> None:
    """Grava um zip com (arquivo no disco, caminho dentro do zip)."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporario = destino.with_suffix(destino.suffix + ".tmp")
    with zipfile.ZipFile(temporario, "w", zipfile.ZIP_DEFLATED) as zf:
        for origem, interno in entradas:
            info = zipfile.ZipInfo(interno.as_posix(), DATA_ZIP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zf.writestr(info, origem.read_bytes())
    temporario.replace(destino)


def empacotar() -> list[Path]:
    """Gera os dois .mcpack e o .mcaddon em dist/."""
    saidas = []
    tudo: list[tuple[Path, Path]] = []
    for pack, nome in ((BP, "Vulpus_BP"), (RP, "Vulpus_RP")):
        entradas = [(arq, arq.relative_to(pack)) for arq in arquivos(pack)]
        zipar(DIST / f"{nome}.mcpack", entradas)
        saidas.append(DIST / f"{nome}.mcpack")
        tudo += [(arq, Path(pack.name) / interno) for arq, interno in entradas]
    zipar(DIST / "Vulpus.mcaddon", tudo)
    saidas.append(DIST / "Vulpus.mcaddon")
    return saidas


def main(argv: list[str] | None = None) -> int:
    for fluxo in (sys.stdout, sys.stderr):
        if hasattr(fluxo, "reconfigure"):
            fluxo.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Confere e empacota o addon Vulpus em dist/.")
    parser.add_argument("--sem-ui", action="store_true", help="não roda o verificar_ui.py")
    args = parser.parse_args(argv)

    r = Relatorio()
    jsons = conferir_arquivos(r)
    modulos = conferir_manifests(jsons, r)
    conferir_scripts(modulos, r)
    conferir_texturas(jsons, r)
    conferir_idiomas(jsons, r)
    if not args.sem_ui:
        rodar_verificar_ui(r)

    for aviso in r.avisos:
        print(f"  aviso: {aviso}")
    if r.erros:
        print(f"\n✖ Build parado: {len(r.erros)} erro(s).")
        for e in r.erros:
            print(f"  ✖ {e}")
        return 1

    saidas = empacotar()
    print(f"\n✔ Tudo certo ({len(jsons)} JSON conferidos). Gerado em dist/:")
    for saida in saidas:
        print(f"  • {saida.name} ({saida.stat().st_size / 1024:.0f} KB)")
    print("Para instalar: dois cliques em dist/Vulpus.mcaddon.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
