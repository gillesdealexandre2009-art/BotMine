#!/usr/bin/env python3
"""Instala o addon Vulpus no Minecraft deste computador, no modo de desenvolvimento.

Uso:
    python tools/instalar_dev.py                          copia os packs para as pastas de desenvolvimento
    python tools/instalar_dev.py --mundo "Testes Claude"  também ativa os dois packs nesse mundo
    python tools/instalar_dev.py --simular                só mostra o que faria, sem mexer em nada

O que faz:
  * acha a pasta com.mojang: primeiro a da versão nova do jogo (GDK)
      %APPDATA%\\Minecraft Bedrock\\Users\\Shared\\games\\com.mojang
    e, se não houver, a da versão antiga (UWP)
      %LOCALAPPDATA%\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang
  * apaga e recria só development_behavior_packs\\Vulpus_BP e development_resource_packs\\Vulpus_RP;
  * com --mundo, acha o mundo pelo nome (levelname.txt), guarda uma cópia .bak de
    world_behavior_packs.json e world_resource_packs.json e adiciona os dois packs, sem repetir.

Feche o mundo antes de rodar. Saída: 0 = certo, 1 = algo deu errado (a mensagem diz o quê).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

ADDON = Path(__file__).resolve().parent.parent
PACKS = (
    # (pasta no projeto, pasta de desenvolvimento, nome no jogo, arquivo do mundo)
    (ADDON / "vulpus_bp", "development_behavior_packs", "Vulpus_BP", "world_behavior_packs.json"),
    (ADDON / "vulpus_rp", "development_resource_packs", "Vulpus_RP", "world_resource_packs.json"),
)
IGNORAR = shutil.ignore_patterns("__pycache__", ".DS_Store", "Thumbs.db")


def pastas_mojang() -> list[Path]:
    """Pastas com.mojang candidatas, na ordem de preferência."""
    candidatas = []
    appdata = os.environ.get("APPDATA")
    local = os.environ.get("LOCALAPPDATA")
    if appdata:
        candidatas.append(Path(appdata) / "Minecraft Bedrock" / "Users" / "Shared" / "games" / "com.mojang")
    if local:
        candidatas.append(
            Path(local) / "Packages" / "Microsoft.MinecraftUWP_8wekyb3d8bbwe" / "LocalState" / "games" / "com.mojang"
        )
    return candidatas


def pastas_de_mundos() -> list[Path]:
    """Pastas minecraftWorlds de todos os usuários (GDK) e da versão UWP."""
    pastas = []
    appdata = os.environ.get("APPDATA")
    if appdata:
        pastas += sorted((Path(appdata) / "Minecraft Bedrock" / "Users").glob("*/games/com.mojang/minecraftWorlds"))
    pastas += [p / "minecraftWorlds" for p in pastas_mojang()[1:]]
    return [p for p in pastas if p.is_dir()]


def ler_manifest(pack: Path) -> dict:
    with open(pack / "manifest.json", encoding="utf-8-sig") as f:
        return json.load(f)


def achar_mundo(nome: str) -> list[Path]:
    """Mundos cujo levelname.txt (ou nome da pasta) bate com o nome, sem ligar para maiúsculas."""
    alvo = nome.strip().casefold()
    achados = []
    for pasta in pastas_de_mundos():
        for mundo in sorted(pasta.iterdir()):
            arquivo = mundo / "levelname.txt"
            if not arquivo.is_file():
                continue
            titulo = arquivo.read_text(encoding="utf-8", errors="replace").strip()
            if titulo.casefold() == alvo or mundo.name.casefold() == alvo:
                achados.append(mundo)
    return achados


def copiar_packs(mojang: Path, simular: bool) -> None:
    for origem, tipo, nome, _ in PACKS:
        destino = mojang / tipo / nome
        if destino.exists():
            print(f"  • apagar {destino}")
        print(f"  • copiar {origem.name} -> {destino}")
        if simular:
            continue
        if destino.exists():
            shutil.rmtree(destino)
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(origem, destino, ignore=IGNORAR)


def ativar_no_mundo(mundo: Path, simular: bool) -> None:
    """Põe os dois packs na lista do mundo, com backup e sem duplicar."""
    for origem, _, _, nome_arquivo in PACKS:
        header = ler_manifest(origem)["header"]
        entrada = {"pack_id": header["uuid"], "version": header["version"]}
        arquivo = mundo / nome_arquivo
        lista = []
        if arquivo.is_file():
            texto = arquivo.read_text(encoding="utf-8-sig").strip()
            lista = json.loads(texto) if texto else []
            if not isinstance(lista, list):
                raise ValueError(f"{arquivo} não tem uma lista de packs")
        atual = next((e for e in lista if isinstance(e, dict) and e.get("pack_id") == entrada["pack_id"]), None)
        if atual == entrada:
            print(f"  • {nome_arquivo}: o pack já está ativo, nada a fazer")
            continue
        if atual is not None:
            print(f"  • {nome_arquivo}: atualizar a versão do pack para {entrada['version']}")
            atual["version"] = entrada["version"]
        else:
            print(f"  • {nome_arquivo}: adicionar {json.dumps(entrada)}")
            lista.append(entrada)
        if arquivo.is_file():
            print(f"    (cópia de segurança em {arquivo.name}.bak)")
        if simular:
            continue
        if arquivo.is_file():
            shutil.copy2(arquivo, arquivo.with_name(arquivo.name + ".bak"))
        arquivo.write_text(json.dumps(lista, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    for fluxo in (sys.stdout, sys.stderr):
        if hasattr(fluxo, "reconfigure"):
            fluxo.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Instala o addon Vulpus nas pastas de desenvolvimento do jogo.")
    parser.add_argument("--mundo", metavar="NOME", help="nome do mundo onde ativar os dois packs")
    parser.add_argument("--simular", action="store_true", help="só mostra o que faria")
    args = parser.parse_args(argv)

    for origem, *_ in PACKS:
        if not (origem / "manifest.json").is_file():
            print(f"✖ Falta {origem.name}/manifest.json. Rode isto de dentro do projeto do addon.")
            return 1

    mojang = next((p for p in pastas_mojang() if p.is_dir()), None)
    if mojang is None:
        print("✖ Não achei a pasta do Minecraft. Abra o jogo uma vez e tente de novo.")
        for p in pastas_mojang():
            print(f"  procurei em: {p}")
        return 1

    mundo = None
    if args.mundo:
        mundos = achar_mundo(args.mundo)
        if not mundos:
            print(f'✖ Não achei nenhum mundo chamado "{args.mundo}". Confira o nome na lista de mundos do jogo.')
            return 1
        if len(mundos) > 1:
            print(f'✖ Há {len(mundos)} mundos chamados "{args.mundo}". Use o nome da pasta no lugar do nome:')
            for m in mundos:
                print(f"  • {m.name}  ({m})")
            return 1
        mundo = mundos[0]

    aviso = " (simulação: nada será alterado)" if args.simular else ""
    print(f"Minecraft em {mojang}{aviso}")
    try:
        copiar_packs(mojang, args.simular)
        if mundo is not None:
            print(f'Mundo "{args.mundo}" em {mundo}')
            ativar_no_mundo(mundo, args.simular)
    except (OSError, ValueError) as e:
        print(f"✖ Não deu certo: {e}")
        print("  Se o jogo estiver aberto, feche o mundo (ou o jogo) e tente de novo.")
        return 1

    if args.simular:
        print("✔ Simulação pronta. Rode sem --simular para valer.")
    else:
        print("✔ Pronto! Abra (ou reabra) o mundo para carregar a versão nova.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
