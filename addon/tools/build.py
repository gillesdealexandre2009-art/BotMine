#!/usr/bin/env python3
"""Confere e empacota o addon Vulpus.

Uso:
    python tools/build.py            confere tudo e gera a pasta dist/
    python tools/build.py --sem-ui   pula o verificar_ui.py (mais rápido)

O que é conferido antes de empacotar:
  * todo .json dos packs abre como JSON em UTF-8 sem BOM (e .js/.lang também sem BOM,
    porque os códigos § dependem disso);
  * os manifests: UUIDs, versões e dependências entre BP e RP batem, e as versões dos
    módulos @minecraft/* são as mesmas do package.json; BP e RP não usam versão beta;
  * o pack "Vulpus Chat": usa @minecraft/server na versão beta, o alias @minecraft/server-beta
    do package.json começa com essa versão + ".", não depende do BP nem do RP e a versão é a
    mesma dos outros dois;
  * todo import dos scripts (a partir de scripts/main.js de cada pack com script) aponta para
    um arquivo que existe dentro do próprio pack, e todo módulo @minecraft/* importado está nas
    dependências do manifest;
  * texturas: o item_texture.json aponta para PNGs que existem, o ícone do item existe no
    item_texture.json e todo caminho "textures/vulpus/..." citado no RP ou nos scripts existe;
  * idiomas: languages.json lista arquivos que existem e toda chave usada pelos itens está
    em todos os .lang;
  * glyphs: font/glyph_E2.png e font/glyph_E3.png têm 512x512 (células de 32 px);
  * o verificar_ui.py (se existir) não acusa erro. Se o jogo não estiver instalado, só avisa.

Saída em dist/:
  * Vulpus_BP.mcpack, Vulpus_RP.mcpack e Vulpus_Chat.mcpack: um zip por pack, com o
    manifest.json na raiz;
  * Vulpus.mcaddon: um zip com as pastas vulpus_bp/, vulpus_rp/ e vulpus_chat_bp/ na raiz
    (cada uma com o seu manifest.json). Dois cliques nele e o Minecraft importa os três packs
    de uma vez; importar não ativa nada, e o chat só carrega num mundo com "APIs Beta".

Saída do programa: 0 = pacote gerado, 1 = algo errado (a mensagem diz o quê).
"""
from __future__ import annotations

import argparse
import json
import re
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

ADDON = Path(__file__).resolve().parent.parent
BP = ADDON / "vulpus_bp"
RP = ADDON / "vulpus_rp"
CHAT = ADDON / "vulpus_chat_bp"
PACKS = ((BP, "Vulpus_BP"), (RP, "Vulpus_RP"), (CHAT, "Vulpus_Chat"))
DIST = ADDON / "dist"
VERIFICAR_UI = ADDON / "tools" / "verificar_ui.py"
PACKAGE_JSON = ADDON / "package.json"
CONFIG_JS = BP / "scripts" / "config.js"
ALIAS_BETA = "@minecraft/server-beta"
PREFIXO_ALIAS = "npm:@minecraft/server@"
# Folhas de glyph do RP e o lado exigido em px (spec 03, §4.1).
FOLHAS_GLYPH = {"glyph_E2.png": 512, "glyph_E3.png": 512}
PNG_ASSINATURA = b"\x89PNG\r\n\x1a\n"

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
    for pack, _ in PACKS:
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

    for nome_pack, manifest in (("vulpus_bp", bp), ("vulpus_rp", rp)):
        for d in manifest.get("dependencies", []):
            if "beta" in str(d.get("version", "")):
                r.erro(f"{nome_pack}/manifest.json: {d.get('module_name')} usa versão beta; só o pack do chat pode")

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


def conferir_chat(jsons: dict[Path, object], r: Relatorio) -> dict[str, str]:
    """Confere o manifest do pack do chat. Devolve {módulo @minecraft: versão} dele."""
    chat = jsons.get(CHAT / "manifest.json")
    bp = jsons.get(BP / "manifest.json")
    rp = jsons.get(RP / "manifest.json")
    if not isinstance(chat, dict):
        return {}
    modulos: dict[str, str] = {}
    try:
        header = chat["header"]
        for d in chat.get("dependencies", []):
            if "module_name" in d:
                modulos[d["module_name"]] = d["version"]
            elif "uuid" in d:
                r.erro("vulpus_chat_bp/manifest.json: o chat não pode depender do BP nem do RP (tire a dependência por uuid)")
        uuids = [header["uuid"]] + [m["uuid"] for m in chat["modules"]]
        outros: list[str] = []
        for manifest in (bp, rp):
            if isinstance(manifest, dict):
                outros += [manifest["header"]["uuid"]] + [m["uuid"] for m in manifest["modules"]]
        if len(set(uuids)) != len(uuids) or set(uuids) & set(outros):
            r.erro("vulpus_chat_bp/manifest.json: UUID repetido (com ele mesmo ou com o BP/RP)")
        if isinstance(bp, dict) and header["version"] != bp["header"]["version"]:
            r.erro("o manifest do chat está com versão diferente da do BP")
        for m in chat["modules"]:
            if m.get("type") == "script" and not (CHAT / m.get("entry", "")).is_file():
                r.erro(f"vulpus_chat_bp/manifest.json: a entrada do script ({m.get('entry')}) não existe")
    except (KeyError, TypeError) as e:
        r.erro(f"vulpus_chat_bp/manifest.json incompleto: falta {e}")
        return modulos

    versao = modulos.get("@minecraft/server", "")
    if "beta" not in versao:
        r.erro(f"vulpus_chat_bp/manifest.json: @minecraft/server deveria ser beta (está '{versao}')")
    dev = (ler_json(PACKAGE_JSON, r) or {}) if PACKAGE_JSON.is_file() else {}
    alias = dev.get("devDependencies", {}).get(ALIAS_BETA, "") if isinstance(dev, dict) else ""
    if not alias.startswith(PREFIXO_ALIAS + versao + "."):
        r.erro(
            f"package.json: {ALIAS_BETA} ('{alias}') não bate com o manifest do chat ({versao}); "
            f"use {PREFIXO_ALIAS}{versao}.<versão do jogo>-stable"
        )
    return modulos


def conferir_scripts(pack: Path, modulos: dict[str, str], r: Relatorio) -> None:
    """Segue os imports a partir de scripts/main.js e confere que todo arquivo existe no pack."""
    pasta = pack / "scripts"
    main = pasta / "main.js"
    if not main.is_file():
        r.erro(f"{rel(main)} não existe")
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
                    r.erro(f"{rel(atual)} importa {alvo}, que não está nas dependências do manifest de {pack.name}")
                continue
            if not alvo.startswith("."):
                r.erro(f"{rel(atual)} importa '{alvo}': só caminhos relativos ou @minecraft/* funcionam no jogo")
                continue
            if not alvo.endswith(".js"):
                r.erro(f"{rel(atual)} importa '{alvo}' sem a extensão .js (o jogo exige)")
                continue
            destino = (atual.parent / alvo).resolve()
            if not destino.is_relative_to(pasta.resolve()):
                r.erro(f"{rel(atual)} importa '{alvo}', fora de {rel(pasta)} (packs não compartilham módulos)")
            elif not destino.is_file():
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


def tamanho_png(caminho: Path) -> tuple[int, int] | None:
    """Largura e altura lidas do cabeçalho IHDR; None se não for PNG."""
    cabeca = caminho.read_bytes()[:24]
    if len(cabeca) < 24 or not cabeca.startswith(PNG_ASSINATURA) or cabeca[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", cabeca[16:24])


def conferir_glyphs(r: Relatorio) -> None:
    """As folhas de glyph existem e têm o tamanho certo."""
    for nome, lado in FOLHAS_GLYPH.items():
        arq = RP / "font" / nome
        if not arq.is_file():
            r.erro(f"{rel(arq)} não existe (rode python tools/gerar_glyphs.py)")
            continue
        tamanho = tamanho_png(arq)
        if tamanho != (lado, lado):
            r.erro(f"{rel(arq)} tem {tamanho}, mas precisa ter {lado}x{lado}")


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
    """Gera os três .mcpack e o .mcaddon em dist/."""
    saidas = []
    tudo: list[tuple[Path, Path]] = []
    for pack, nome in PACKS:
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
    conferir_scripts(BP, modulos, r)
    conferir_scripts(CHAT, conferir_chat(jsons, r), r)
    conferir_texturas(jsons, r)
    conferir_idiomas(jsons, r)
    conferir_glyphs(r)
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
    print("Para instalar: dois cliques em dist/Vulpus.mcaddon (o chat só liga num mundo com APIs Beta).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
