#!/usr/bin/env python3
"""Leitor e extrator dos arquivos .brarchive do Minecraft Bedrock.

O jogo guarda a UI, as texturas e outros recursos dos packs vanilla em
"__brarchive/<pasta>.brarchive". Cada arquivo equivale a uma pasta do pack:
"__brarchive/ui.brarchive" é "ui/" e "__brarchive/ui/settings_sections.brarchive"
é "ui/settings_sections/".

Formato (little-endian):
    cabeçalho de 16 bytes: mágico u64, quantidade u32, versão u32
    índice: quantidade x 256 bytes =
        1 byte com o tamanho do nome, 247 bytes de nome (UTF-8),
        início u32 e tamanho u32 (relativos ao começo dos dados)
    dados: começam em 16 + quantidade * 256

Uso:
    python tools/brarchive.py ARQUIVO.brarchive DESTINO     extrai um arquivo
    python tools/brarchive.py PASTA/__brarchive DESTINO     extrai o pack inteiro
    python tools/brarchive.py --listar ARQUIVO|PASTA        só lista o conteúdo
"""
from __future__ import annotations

import argparse
import struct
import sys
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

MAGICO = 0x267052A0B125277D
VERSAO = 1
CABECALHO = struct.Struct("<QII")
TAM_ENTRADA = 256
TAM_NOME = 247
POSICAO = struct.Struct("<II")
SUFIXO = ".brarchive"


class FormatoInvalido(ValueError):
    """O arquivo não segue o formato .brarchive conhecido."""


@dataclass(frozen=True)
class Entrada:
    nome: str
    inicio: int
    tamanho: int


def _nome_seguro(nome: str, origem: Path) -> str:
    """Normaliza o nome da entrada e recusa caminhos que saiam da pasta de destino."""
    caminho = PurePosixPath(nome.replace("\\", "/"))
    if not nome or caminho.is_absolute() or ".." in caminho.parts:
        raise FormatoInvalido(f"{origem}: nome de entrada inválido: {nome!r}")
    return caminho.as_posix()


def _ler_indice(arquivo, origem: Path) -> list[Entrada]:
    """Lê cabeçalho e índice; o arquivo fica posicionado no começo dos dados."""
    cabecalho = arquivo.read(CABECALHO.size)
    if len(cabecalho) < CABECALHO.size:
        raise FormatoInvalido(f"{origem}: arquivo curto demais")
    magico, quantidade, versao = CABECALHO.unpack(cabecalho)
    if magico != MAGICO:
        raise FormatoInvalido(f"{origem}: número mágico desconhecido 0x{magico:016x}")
    if versao != VERSAO:
        raise FormatoInvalido(f"{origem}: versão {versao} não suportada (esperada {VERSAO})")
    indice = arquivo.read(quantidade * TAM_ENTRADA)
    if len(indice) < quantidade * TAM_ENTRADA:
        raise FormatoInvalido(f"{origem}: índice incompleto")
    entradas = []
    for i in range(quantidade):
        p = i * TAM_ENTRADA
        tam_nome = indice[p]
        if tam_nome > TAM_NOME:
            raise FormatoInvalido(f"{origem}: entrada {i} com nome de {tam_nome} bytes")
        try:
            nome = indice[p + 1:p + 1 + tam_nome].decode("utf-8")
        except UnicodeDecodeError as falha:
            raise FormatoInvalido(f"{origem}: entrada {i} com nome inválido") from falha
        inicio, tamanho = POSICAO.unpack_from(indice, p + 1 + TAM_NOME)
        entradas.append(Entrada(_nome_seguro(nome, origem), inicio, tamanho))
    return entradas


def listar(caminho: str | Path) -> list[Entrada]:
    """Lê só o índice (não carrega os dados)."""
    caminho = Path(caminho)
    with caminho.open("rb") as arquivo:
        return _ler_indice(arquivo, caminho)


def ler(caminho: str | Path) -> dict[str, bytes]:
    """Devolve {nome: conteúdo} de todas as entradas, em memória."""
    caminho = Path(caminho)
    with caminho.open("rb") as arquivo:
        entradas = _ler_indice(arquivo, caminho)
        dados = arquivo.read()
    conteudo = {}
    for entrada in entradas:
        fim = entrada.inicio + entrada.tamanho
        if fim > len(dados):
            raise FormatoInvalido(f"{caminho}: '{entrada.nome}' passa do fim do arquivo")
        conteudo[entrada.nome] = dados[entrada.inicio:fim]
    return conteudo


def extrair(caminho: str | Path, destino: str | Path) -> list[Path]:
    """Extrai um .brarchive para a pasta destino e devolve os arquivos gravados."""
    destino = Path(destino)
    gravados = []
    for nome, conteudo in ler(caminho).items():
        alvo = destino / nome
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_bytes(conteudo)
        gravados.append(alvo)
    return gravados


def arquivos_do_pacote(pasta_brarchive: str | Path) -> Iterator[tuple[str, Path]]:
    """Percorre um "__brarchive" e devolve (pasta equivalente no pack, arquivo .brarchive)."""
    pasta_brarchive = Path(pasta_brarchive)
    for arquivo in sorted(pasta_brarchive.rglob("*" + SUFIXO)):
        relativo = arquivo.relative_to(pasta_brarchive).as_posix()
        yield relativo[:-len(SUFIXO)], arquivo


def _dentro(pasta: str, prefixo: str) -> bool:
    return not prefixo or pasta == prefixo or pasta.startswith(prefixo + "/")


def extrair_pacote(pasta_brarchive: str | Path, destino: str | Path, prefixo: str = "") -> int:
    """Extrai todos os .brarchive de um pack (só os da pasta "prefixo", se dada). Devolve o total."""
    total = 0
    prefixo = prefixo.strip("/")
    for pasta, arquivo in arquivos_do_pacote(pasta_brarchive):
        if _dentro(pasta, prefixo):
            total += len(extrair(arquivo, Path(destino) / pasta))
    return total


def indice_do_pacote(pasta_pack: str | Path, prefixo: str = "") -> set[str]:
    """Caminhos (relativos ao pack, com "/") dos arquivos soltos e dos que estão nos .brarchive.

    Com "prefixo" (ex.: "textures"), só olha essa pasta do pack.
    """
    pasta_pack = Path(pasta_pack)
    prefixo = prefixo.strip("/")
    caminhos = set()
    pasta_brarchive = pasta_pack / "__brarchive"
    if pasta_brarchive.is_dir():
        for pasta, arquivo in arquivos_do_pacote(pasta_brarchive):
            if _dentro(pasta, prefixo):
                caminhos.update(f"{pasta}/{entrada.nome}" for entrada in listar(arquivo))
    soltos = pasta_pack / prefixo if prefixo else pasta_pack
    if soltos.is_dir():
        for arquivo in soltos.rglob("*"):
            if arquivo.is_file() and pasta_brarchive not in arquivo.parents:
                caminhos.add(arquivo.relative_to(pasta_pack).as_posix())
    return caminhos


def main(argv: list[str] | None = None) -> int:
    for fluxo in (sys.stdout, sys.stderr):
        if hasattr(fluxo, "reconfigure"):
            fluxo.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Extrai arquivos .brarchive do Minecraft Bedrock.")
    parser.add_argument("origem", type=Path, help="arquivo .brarchive ou pasta __brarchive")
    parser.add_argument("destino", type=Path, nargs="?", help="pasta de saída")
    parser.add_argument("--listar", action="store_true", help="só lista as entradas")
    args = parser.parse_args(argv)

    try:
        if args.listar:
            if args.origem.is_dir():
                for pasta, arquivo in arquivos_do_pacote(args.origem):
                    for entrada in listar(arquivo):
                        print(f"{pasta}/{entrada.nome}\t{entrada.tamanho}")
            else:
                for entrada in listar(args.origem):
                    print(f"{entrada.nome}\t{entrada.tamanho}")
            return 0
        if args.destino is None:
            parser.error("informe a pasta de destino (ou use --listar)")
        if args.origem.is_dir():
            total = extrair_pacote(args.origem, args.destino)
        else:
            total = len(extrair(args.origem, args.destino))
    except (OSError, FormatoInvalido) as erro:
        print(f"erro: {erro}", file=sys.stderr)
        return 1
    print(f"{total} arquivos -> {args.destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
