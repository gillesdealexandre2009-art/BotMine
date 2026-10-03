#!/usr/bin/env python3
"""Confere o JSON UI do Vulpus (vulpus_rp/ui) contra a UI vanilla do Minecraft Bedrock.

Uso:
    python tools/verificar_ui.py                    extrai a UI do jogo instalado para uma pasta temporária
    python tools/verificar_ui.py --vanilla PASTA    usa uma UI vanilla já extraída (a pasta "ui")
    python tools/verificar_ui.py --jogo PASTA       pasta "data" de outra instalação do jogo

O que é conferido:
  * os ganchos dos arquivos vanilla: ui/server_form.json (long_form.bindings e
    main_screen_content.controls, sem mexer no ModalForm) e ui/hud_screen.json (root_panel.controls
    com a sidebar e hud_title_text.bindings), só modifications, sem $var;
  * toda referência @namespace.elemento, herança, alvo de factory e $scrolling_content existe;
  * as variáveis $ passadas para templates vanilla existem na cadeia do template e as variáveis
    usadas no vulpus_menu e no vulpus_hud têm valor (respeitando "ignored");
  * propriedades e valores (anchor, type, binding_type...) são os que a vanilla usa;
  * expressões de binding só com = not and or - + e sempre lendo uma #propriedade que o controle
    (ou o source_control_name) recebe por binding ou property_bag;
  * collection_name / collection_index no lugar certo, sem índice repetido em cada variante, o Hub
    com os slots 0..10, e todo botão que dispara button.form_button_click tem collection_details
    no próprio botão;
  * a factory da lista tem os mesmos tipos de entrada (button/label/header/divider) da vanilla;
  * foco: focus_identifier sem repetição e focus_change_* apontando para ids da mesma variante;
  * temas: as 4 variantes do root (hub/lista × laranja/black) usam as peças da pasta certa, e os
    gates avaliados com títulos de exemplo mostram uma variante só (ou o form vanilla);
  * sidebar: o protocolo do title (flag, "Preserve Title Texts") avaliado com textos de exemplo;
  * texturas: as do RP existem (e o .json de nineslice bate com o PNG), as vanilla existem no jogo
    (inclui os ícones de vulpus_bp/scripts/config.js e o item_texture.json);
  * as flags e tokens do JSON são idênticos aos de core/forms.js (FLAG) e sistemas/hud.js
    (FLAG_SIDEBAR), e os tokens não se confundem com as flags;
  * avisa se o server_form.json ou o hud_screen.json vanilla mudou desde a 1.26.52.

Saída: 0 = tudo certo (pode ter avisos), 1 = há erros, 2 = UI vanilla indisponível (jogo não encontrado).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import string
import struct
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import brarchive  # noqa: E402

ADDON = Path(__file__).resolve().parent.parent
RP = ADDON / "vulpus_rp"
PASTA_UI = RP / "ui"
FORMS_JS = ADDON / "vulpus_bp" / "scripts" / "core" / "forms.js"
HUD_JS = ADDON / "vulpus_bp" / "scripts" / "sistemas" / "hud.js"
CONFIG_JS = ADDON / "vulpus_bp" / "scripts" / "config.js"
ITEM_TEXTURE = RP / "textures" / "item_texture.json"

NS_MENU, NS_HUD = "vulpus_menu", "vulpus_hud"
# namespace nosso -> (arquivo, definição de onde o jogo monta a árvore)
RAIZES = {NS_MENU: ("vulpus/vulpus_menu.json", "root"), NS_HUD: ("vulpus/vulpus_hud.json", "sidebar")}
COLECAO = "form_buttons"
CLIQUE = "button.form_button_click"
# arquivo vanilla -> {elemento: único array que o gancho pode receber}
GANCHOS = {
    "server_form.json": {"long_form": "bindings", "main_screen_content": "controls"},
    "hud_screen.json": {"root_panel": "controls", "hud_title_text": "bindings"},
}
# gancho de bindings -> binding global que o gate lê
GATES_VANILLA = {"long_form": "#title_text", "hud_title_text": "#hud_title_text_string"}
FACTORY_FORM = "server_form_factory"
SIDEBAR_HUD = f"{NS_HUD}.sidebar"
LISTA_VANILLA = "long_form_dynamic_buttons_panel"
OPERACOES_INSERCAO = {"insert_back", "insert_front"}
# sha256 do JSON canônico (canonico()) na versão de referência; não depende da formatação do arquivo.
# (o sha256 do hud_screen.json bruto extraído da 1.26.52 é f3f23990abf0fec947e4e5b490729e3718eb424ad63a56462cd8ac6eec3fcbf6)
HASHES_VANILLA = {
    "server_form.json": "f8107d7f13409256db4dab898987b4ce840e72ffc65f6ca26e0f03290cc6e64d",
    "hud_screen.json": "aba333df5d58ac36c7dcc6a0596e946b1883da089529d0c9dcf6516b09f756a6",
}
VERSAO_REFERENCIA = "1.26.52"
PREFIXO_TEXTURAS_RP = "textures/vulpus/"
PASTA_LARANJA = "textures/vulpus/ui/"
PASTA_BLACK = "textures/vulpus/ui/black/"
TITULO_IMAGEM = "textures/vulpus/ui/titulo"
# peças que mudam com o tema (variável $vp_<peça> e textura <pasta><peça>)
PECAS_TEMA = ("painel", "cabecalho", "botao", "botao_hover", "botao_press",
              "fechar", "fechar_hover", "fechar_press", "divisor")
# variantes do root: nome -> (flag de layout, tema Black)
VARIANTES = {"hub_laranja": ("HUB", False), "hub_black": ("HUB", True),
             "lista_laranja": ("LISTA", False), "lista_black": ("LISTA", True)}
SLOTS_HUB = 11
EXTENSOES_TEXTURA = (".png", ".tga", ".jpg", ".jpeg")
PACKS_VANILLA = ("vanilla", "vanilla_base")
JOGO_PASTA = "XboxGames/Minecraft for Windows/Content/data"
PARAR_FOCO = "FOCUS_OVERRIDE_STOP"
DIRECOES_FOCO = ("focus_change_left", "focus_change_right", "focus_change_up", "focus_change_down")
FLAGS_FORMS = ("BASE", "HUB", "LISTA", "TEMA_BLACK")
TOKENS = ("TEMA_BLACK", "SIDEBAR")
# arquivo nosso -> família de flags que ele pode usar
FAMILIA_FLAGS = {"server_form.json": "menu", "vulpus/vulpus_menu.json": "menu",
                 "hud_screen.json": "hud", "vulpus/vulpus_hud.json": "hud"}
# família -> flags dos scripts que o JSON dela usa
FAMILIAS = {"menu": FLAGS_FORMS, "hud": ("SIDEBAR",)}

SAIDA_OK, SAIDA_ERRO, SAIDA_SEM_VANILLA = 0, 1, 2

VARIAVEL = re.compile(r"\$[A-Za-z_][A-Za-z0-9_]*")
REF_DEF = re.compile(r"^@?([a-z_][a-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$")
TEXTURA = re.compile(r"^textures/[A-Za-z0-9_./-]+$")
LITERAL_JS = r""""(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`$]*`"""
TEXTURA_JS = re.compile(r"""["'`](textures/[A-Za-z0-9_./-]+)["'`]""")
FLAG_VALIDA = re.compile(r"^(?:§[0-9a-v])+$")
TOKEN_EXPR = re.compile(
    r"\s*(?:(?P<abre>\()|(?P<fecha>\))|(?P<texto>'[^']*')|(?P<prop>#[A-Za-z0-9_.]+)"
    r"|(?P<var>\$[A-Za-z_][A-Za-z0-9_]*)|(?P<palavra>not|and|or)\b|(?P<op>[=+-])"
    r"|(?P<num>\d+(?:\.\d+)?)|(?P<outro>\S))"
)

# Valores oficiais (bedrock-schemas, forms/ui/ui_element.form.json); somam-se aos que a vanilla usa.
ENUMS = {
    "anchor_from": {"top_left", "top_middle", "top_right", "left_middle", "center",
                    "right_middle", "bottom_left", "bottom_middle", "bottom_right"},
    "anchor_to": {"top_left", "top_middle", "top_right", "left_middle", "center",
                  "right_middle", "bottom_left", "bottom_middle", "bottom_right"},
    "orientation": {"horizontal", "vertical"},
    "text_alignment": {"left", "center", "right"},
    "font_type": {"default", "smooth", "rune", "unicode", "MinecraftTen"},
    "font_size": {"small", "normal", "large", "extra_large"},
    "binding_type": {"global", "collection", "collection_details", "view", "none"},
    "binding_condition": {"always", "visible", "once", "always_when_visible", "visibility_changed", "none"},
    "mapping_type": {"pressed", "double_pressed", "global", "focused"},
    "type": set(),
}


class Relatorio:
    def __init__(self) -> None:
        self.erros: list[str] = []
        self.avisos: list[str] = []

    def erro(self, onde: str, texto: str) -> None:
        self.erros.append(f"{onde}: {texto}" if onde else texto)

    def aviso(self, onde: str, texto: str) -> None:
        self.avisos.append(f"{onde}: {texto}" if onde else texto)


# ---------------------------------------------------------------- leitura

def sem_comentarios(texto: str) -> str:
    """Tira comentários // e /* */ fora de strings (o jogo aceita, o json do Python não)."""
    saida, i, n, em_string = [], 0, len(texto), False
    while i < n:
        c = texto[i]
        if em_string:
            saida.append(c)
            if c == "\\" and i + 1 < n:
                saida.append(texto[i + 1])
                i += 2
                continue
            em_string = c != '"'
            i += 1
        elif c == '"':
            em_string = True
            saida.append(c)
            i += 1
        elif texto.startswith("//", i):
            fim = texto.find("\n", i)
            i = n if fim < 0 else fim
        elif texto.startswith("/*", i):
            fim = texto.find("*/", i + 2)
            i = n if fim < 0 else fim + 2
        else:
            saida.append(c)
            i += 1
    return "".join(saida)


def carregar_json(caminho: Path):
    return json.loads(sem_comentarios(caminho.read_bytes().decode("utf-8-sig")))


def canonico(dados) -> str:
    return json.dumps(dados, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def separar(chave: str) -> tuple[str, str | None]:
    """"nome@ns.base" -> ("nome", "ns.base"); "nome" -> ("nome", None)."""
    nome, arroba, base = chave.partition("@")
    return nome, (base if arroba else None)


def alvos_de_factory(fabrica) -> dict[str, str]:
    """{tipo de entrada: alvo} de uma factory (control_ids ou control_name)."""
    if not isinstance(fabrica, dict):
        return {}
    alvos = {tipo: alvo for tipo, alvo in (fabrica.get("control_ids") or {}).items() if isinstance(alvo, str)}
    if isinstance(fabrica.get("control_name"), str):
        alvos[fabrica.get("name", "")] = fabrica["control_name"]
    return alvos


def referencia_do_alvo(alvo: str) -> str:
    """"@ns.def" e "ns.def" valem como estão; "nome@ns.def" vira "ns.def"."""
    return separar(alvo)[1] if "@" in alvo[1:] else alvo


def textos(valor):
    """Todas as strings dentro de um valor JSON (chaves de dicionário incluídas)."""
    if isinstance(valor, str):
        yield valor
    elif isinstance(valor, dict):
        for chave, item in valor.items():
            yield chave
            yield from textos(item)
    elif isinstance(valor, list):
        for item in valor:
            yield from textos(item)


def dicionarios(valor):
    if isinstance(valor, dict):
        yield valor
        for item in valor.values():
            yield from dicionarios(item)
    elif isinstance(valor, list):
        for item in valor:
            yield from dicionarios(item)


# ---------------------------------------------------------------- catálogo de definições

@dataclass(frozen=True)
class Definicao:
    ns: str
    nome: str
    chave: str
    corpo: dict

    @property
    def base(self) -> str | None:
        return separar(self.chave)[1]


class Catalogo:
    def __init__(self) -> None:
        self.defs: dict[tuple[str, str], Definicao] = {}
        self.arquivos: dict[str, dict] = {}
        self.globais: set[str] = set()
        self.propriedades: set[str] = set()
        self.valores: dict[str, set[str]] = {chave: set() for chave in ENUMS}
        self._vars_template: dict[tuple[str, str], set[str]] = {}

    @property
    def namespaces(self) -> set[str]:
        return {ns for ns, _ in self.defs}

    def adicionar(self, dados: dict) -> None:
        ns = dados.get("namespace")
        if not isinstance(ns, str):
            return
        for chave, corpo in dados.items():
            if chave != "namespace" and isinstance(corpo, dict):
                nome, _ = separar(chave)
                self.defs.setdefault((ns, nome), Definicao(ns, nome, chave, corpo))

    def registrar_uso(self, dados: dict) -> None:
        """Guarda as propriedades e os valores enumerados que a vanilla usa (base para achar erros de digitação)."""
        for item in dicionarios(dados):
            for chave, valor in item.items():
                if chave.startswith(("$", "#")) or "@" in chave:
                    continue
                self.propriedades.add(chave)
                if chave in self.valores and isinstance(valor, str) and not valor.startswith("$"):
                    self.valores[chave].add(valor)

    def achar(self, ref: str | None, ns_atual: str) -> Definicao | None:
        if not ref or ref.startswith("$"):
            return None
        ns, ponto, nome = ref.lstrip("@").rpartition(".")
        return self.defs.get((ns if ponto else ns_atual, nome))

    def cadeia(self, definicao: Definicao) -> list[Definicao]:
        """A definição e suas bases, da mais derivada para a mais básica."""
        itens, vistos = [], set()
        atual: Definicao | None = definicao
        while atual and (atual.ns, atual.nome) not in vistos:
            vistos.add((atual.ns, atual.nome))
            itens.append(atual)
            atual = self.achar(atual.base, atual.ns)
        return itens

    def propriedade(self, definicao: Definicao | None, chave: str):
        for item in self.cadeia(definicao) if definicao else []:
            if chave in item.corpo:
                return item.corpo[chave]
        return None

    def variaveis_template(self, definicao: Definicao) -> set[str]:
        """Variáveis citadas no template vanilla, nas bases dele e nos filhos que ele monta."""
        chave = (definicao.ns, definicao.nome)
        if chave not in self._vars_template:
            achadas: set[str] = set()
            pendentes, vistos = [definicao], set()
            while pendentes:
                atual = pendentes.pop()
                if (atual.ns, atual.nome) in vistos:
                    continue
                vistos.add((atual.ns, atual.nome))
                for texto in textos({atual.chave: atual.corpo}):
                    achadas.update(VARIAVEL.findall(texto))
                for item in dicionarios(atual.corpo):
                    for sub in item.get("controls", []) if isinstance(item.get("controls"), list) else []:
                        for chave_filho in sub if isinstance(sub, dict) else {}:
                            filho = self.achar(separar(chave_filho)[1], atual.ns)
                            if filho:
                                pendentes.append(filho)
                base = self.achar(atual.base, atual.ns)
                if base:
                    pendentes.append(base)
            self._vars_template[chave] = achadas
        return self._vars_template[chave]


def carregar_vanilla(pasta: Path) -> Catalogo:
    catalogo = Catalogo()
    for arquivo in sorted(pasta.rglob("*.json")):
        rel = arquivo.relative_to(pasta).as_posix()
        try:
            dados = carregar_json(arquivo)
        except (ValueError, UnicodeDecodeError):
            continue
        if not isinstance(dados, dict):
            continue
        if rel == "_global_variables.json":
            catalogo.globais = {chave.split("|")[0] for chave in dados}
            continue
        if rel == "_ui_defs.json":
            continue
        catalogo.arquivos[rel] = dados
        catalogo.adicionar(dados)
        catalogo.registrar_uso(dados)
    return catalogo


# ---------------------------------------------------------------- origem da vanilla

def unidades_locais() -> list[str]:
    """Letras das unidades fixas (pula rede e removíveis, que podem travar a busca)."""
    if sys.platform != "win32":
        return []
    import ctypes
    kernel = ctypes.windll.kernel32
    mascara = kernel.GetLogicalDrives()
    letras = [letra for i, letra in enumerate(string.ascii_uppercase) if mascara >> i & 1]
    return [letra for letra in letras if kernel.GetDriveTypeW(f"{letra}:\\") == 3]


def pastas_do_jogo(explicita: Path | None) -> list[Path]:
    if explicita:
        return [explicita] if (explicita / "resource_packs" / "vanilla").is_dir() else []
    candidatas = (Path(f"{letra}:/") / JOGO_PASTA for letra in unidades_locais())
    return [pasta for pasta in candidatas if (pasta / "resource_packs" / "vanilla").is_dir()]


def extrair_ui_do_jogo(jogo: Path, destino: Path) -> Path:
    arquivos = jogo / "resource_packs" / "vanilla" / "__brarchive"
    brarchive.extrair_pacote(arquivos, destino, prefixo="ui")
    return destino / "ui"


def indice_de_texturas(pasta_vanilla: Path | None, jogo: Path | None) -> set[str] | None:
    """Caminhos "textures/..." disponíveis na vanilla (pasta extraída e/ou jogo instalado)."""
    caminhos: set[str] = set()
    achou = False
    if pasta_vanilla is not None and (pasta_vanilla.parent / "textures").is_dir():
        achou = True
        raiz = pasta_vanilla.parent
        caminhos.update(p.relative_to(raiz).as_posix() for p in (raiz / "textures").rglob("*") if p.is_file())
    if jogo is not None:
        for pack in PACKS_VANILLA:
            pasta = jogo / "resource_packs" / pack
            if pasta.is_dir():
                achou = True
                caminhos.update(brarchive.indice_do_pacote(pasta, prefixo="textures"))
    return caminhos if achou else None


# ---------------------------------------------------------------- nossos arquivos

@dataclass
class ArquivoUI:
    rel: str
    dados: dict


@dataclass
class No:
    """Um controle declarado num arquivo nosso (definição de topo, filho inline ou controle inserido)."""
    arquivo: str
    caminho: str
    chave: str
    corpo: dict
    ns: str
    topo: bool

    @property
    def base(self) -> str | None:
        return separar(self.chave)[1]


def nos_de(corpo: dict, arquivo: str, ns: str, caminho: str):
    for entrada in corpo.get("controls", []) if isinstance(corpo.get("controls"), list) else []:
        if not isinstance(entrada, dict):
            continue
        for chave, filho in entrada.items():
            if isinstance(filho, dict):
                sub = f"{caminho}/{separar(chave)[0]}"
                yield No(arquivo, sub, chave, filho, ns, False)
                yield from nos_de(filho, arquivo, ns, sub)


def todos_os_nos(arquivos: list[ArquivoUI]):
    for arq in arquivos:
        ns = arq.dados.get("namespace", "")
        for chave, corpo in arq.dados.items():
            if chave == "namespace" or not isinstance(corpo, dict):
                continue
            nome = separar(chave)[0]
            if ns in RAIZES:
                yield No(arq.rel, nome, chave, corpo, ns, True)
                yield from nos_de(corpo, arq.rel, ns, nome)
            for indice, mod in enumerate(corpo.get("modifications", []) or []):
                if isinstance(mod, dict) and mod.get("array_name") == "controls":
                    caminho = f"{nome}.modifications[{indice}]"
                    yield from nos_de({"controls": mod.get("value", [])}, arq.rel, ns, caminho)


def carregar_nossos(cat: Catalogo, rel: Relatorio) -> list[ArquivoUI]:
    arquivos = []
    if not PASTA_UI.is_dir():
        rel.erro("vulpus_rp/ui", "pasta não encontrada")
        return arquivos
    lista_defs: list[str] = []
    for caminho in sorted(PASTA_UI.rglob("*.json")):
        nome = caminho.relative_to(PASTA_UI).as_posix()
        bruto = caminho.read_bytes()
        if bruto.startswith(b"\xef\xbb\xbf"):
            rel.erro(nome, "arquivo com BOM (salve em UTF-8 sem BOM, os § das flags dependem disso)")
        try:
            dados = json.loads(sem_comentarios(bruto.decode("utf-8-sig")))
        except (ValueError, UnicodeDecodeError) as falha:
            rel.erro(nome, f"JSON inválido: {falha}")
            continue
        if nome == "_ui_defs.json":
            itens = dados.get("ui_defs") if isinstance(dados, dict) else None
            if not isinstance(itens, list) or not all(isinstance(i, str) for i in itens):
                rel.erro(nome, 'esperado {"ui_defs": ["ui/..."]}')
            else:
                lista_defs = itens
            continue
        if nome == "_global_variables.json":
            if isinstance(dados, dict):
                cat.globais.update(chave.split("|")[0] for chave in dados)
            continue
        if not isinstance(dados, dict) or not isinstance(dados.get("namespace"), str):
            rel.erro(nome, 'falta "namespace"')
            continue
        arquivos.append(ArquivoUI(nome, dados))

    for arq in arquivos:
        ns = arq.dados["namespace"]
        if arq.rel in cat.arquivos:
            ns_vanilla = cat.arquivos[arq.rel].get("namespace")
            if ns != ns_vanilla:
                rel.erro(arq.rel, f'namespace "{ns}" diferente do vanilla "{ns_vanilla}"')
            if f"ui/{arq.rel}" in lista_defs:
                rel.aviso("_ui_defs.json", f"ui/{arq.rel} é caminho vanilla e não precisa ser listado")
        else:
            if ns in cat.namespaces:
                rel.erro(arq.rel, f'namespace "{ns}" já existe na vanilla')
            if f"ui/{arq.rel}" not in lista_defs:
                rel.erro("_ui_defs.json", f"ui/{arq.rel} não está listado (o jogo não carrega)")
    for item in lista_defs:
        if not (RP / item).is_file():
            rel.erro("_ui_defs.json", f"{item} não existe")
    for arq in arquivos:
        if arq.rel not in cat.arquivos:
            cat.adicionar(arq.dados)
    return arquivos


# ---------------------------------------------------------------- ganchos dos arquivos vanilla

def checar_ganchos(cat: Catalogo, arquivos: list[ArquivoUI], rel: Relatorio) -> None:
    for arq in arquivos:
        if arq.rel in cat.arquivos and arq.rel not in GANCHOS:
            rel.erro(arq.rel, "arquivo com caminho vanilla sem gancho previsto (troca a tela vanilla inteira)")
    for nome_arquivo, permitidos in GANCHOS.items():
        arq = next((a for a in arquivos if a.rel == nome_arquivo), None)
        if arq is None:
            rel.erro(nome_arquivo, "não encontrado (sem ele o menu ou a sidebar nunca aparecem)")
            continue
        ns = arq.dados["namespace"]
        for chave, corpo in arq.dados.items():
            if chave == "namespace":
                continue
            onde = f"{nome_arquivo}: {chave}"
            if chave not in permitidos:
                extra = " (o ModalForm fica vanilla)" if nome_arquivo == "server_form.json" else ""
                rel.erro(onde, f"só são permitidos os ganchos {' e '.join(permitidos)}{extra}")
                continue
            vanilla = cat.achar(f"{ns}.{chave}", ns)
            if vanilla is None:
                rel.erro(onde, f"não existe mais no {nome_arquivo} vanilla")
                continue
            if not isinstance(corpo, dict) or set(corpo) != {"modifications"} or not isinstance(
                    corpo["modifications"], list):
                rel.erro(onde, 'o gancho deve ter só "modifications" (uma lista)')
                continue
            for indice, mod in enumerate(corpo["modifications"]):
                checar_modificacao(cat, nome_arquivo, vanilla, mod, f"{onde}.modifications[{indice}]", rel)
        for chave in permitidos:
            if chave not in arq.dados:
                rel.erro(nome_arquivo, f"falta o gancho {chave}")


def checar_modificacao(cat: Catalogo, arquivo: str, vanilla: Definicao, mod, onde: str, rel: Relatorio) -> None:
    if not isinstance(mod, dict):
        rel.erro(onde, "modificação inválida")
        return
    esperado = GANCHOS[arquivo][vanilla.nome]
    if mod.get("array_name") != esperado:
        rel.erro(onde, f'em {vanilla.nome} só se insere em "{esperado}"')
    if mod.get("operation") not in OPERACOES_INSERCAO:
        rel.erro(onde, f'operação "{mod.get("operation")}" não permitida (use insert_back)')
    valor = mod.get("value")
    if not isinstance(valor, list) or not valor:
        rel.erro(onde, '"value" deve ser uma lista não vazia')
        return
    if any("$" in texto for texto in textos(valor)):
        rel.erro(onde, "não use $var dentro do valor das modifications (só literais)")
    array = mod.get("array_name")
    herdado = any(array in item.corpo for item in cat.cadeia(vanilla)[1:])
    if array not in vanilla.corpo and herdado:
        rel.erro(onde, f"{vanilla.nome} só herda '{array}': inserir cria um array novo que apaga o herdado")

    if esperado == "bindings":
        gate = GATES_VANILLA[vanilla.nome]
        gates = [b for b in valor if isinstance(b, dict) and b.get("binding_type") == "view"
                 and b.get("target_property_name") == "#visible"]
        if {"binding_name": gate} not in valor or len(gates) != 1:
            rel.erro(onde, f"esperado {gate} e um único binding view para #visible")
    elif vanilla.nome == "main_screen_content":
        checar_factory_principal(cat, vanilla, valor, onde, rel)
    else:
        chaves = [chave for entrada in valor if isinstance(entrada, dict) for chave in entrada]
        if len(chaves) != 1 or separar(chaves[0])[1] != SIDEBAR_HUD or valor[0][chaves[0]] != {}:
            rel.erro(onde, f'esperado só {{ "vulpus_sidebar@{SIDEBAR_HUD}": {{}} }}')


def checar_factory_principal(cat: Catalogo, vanilla: Definicao, valor: list, onde: str, rel: Relatorio) -> None:
    ids_vanilla = None
    for entrada in vanilla.corpo.get("controls", []):
        for chave, corpo in entrada.items() if isinstance(entrada, dict) else []:
            if separar(chave)[0] == FACTORY_FORM and isinstance(corpo, dict):
                ids_vanilla = corpo.get("control_ids")
    if not isinstance(ids_vanilla, dict) or "long_form" not in ids_vanilla:
        rel.erro(onde, f"a vanilla não tem mais {FACTORY_FORM} com long_form: o gancho precisa ser revisto")
        return
    fabricas = [corpo.get("factory") for entrada in valor if isinstance(entrada, dict)
                for corpo in entrada.values() if isinstance(corpo, dict) and isinstance(corpo.get("factory"), dict)]
    if len(fabricas) != 1 or fabricas[0].get("name") != FACTORY_FORM:
        rel.erro(onde, f'esperada uma factory "{FACTORY_FORM}"')
        return
    ids = fabricas[0].get("control_ids") or {}
    if "long_form" not in ids:
        rel.erro(onde, "a factory precisa mapear long_form")
    if "custom_form" in ids:
        rel.erro(onde, "não mapeie custom_form (o ModalForm fica 100% vanilla)")
    for chave in set(ids) - set(ids_vanilla):
        rel.erro(onde, f'"{chave}" não é um tipo da {FACTORY_FORM} vanilla')


# ---------------------------------------------------------------- referências, propriedades e expressões

def checar_referencias(cat: Catalogo, nos: list[No], rel: Relatorio) -> None:
    for no in nos:
        onde = f"{no.arquivo}: {no.caminho}"
        if no.base and not no.base.startswith("$") and cat.achar(no.base, no.ns) is None:
            rel.erro(onde, f'herda de "{no.base}", que não existe')
        if no.topo and "collection_index" in no.corpo:
            rel.erro(onde, "collection_index só vale onde o controle é usado (entrada de controls), não na definição")
        for alvo in alvos_de_factory(no.corpo.get("factory")).values():
            if cat.achar(referencia_do_alvo(alvo), no.ns) is None:
                rel.erro(onde, f'factory aponta para "{alvo}", que não existe')
        for chave, valor in no.corpo.items():
            if chave.startswith("$") and isinstance(valor, str):
                achado = REF_DEF.match(valor)
                if achado and achado.group(1) in cat.namespaces and cat.achar(valor, no.ns) is None:
                    rel.erro(onde, f'{chave} aponta para "{valor}", que não existe')


def checar_variaveis_de_templates(cat: Catalogo, nos: list[No], rel: Relatorio) -> None:
    for no in nos:
        base = cat.achar(no.base, no.ns)
        if base is None or base.ns in RAIZES:
            continue
        conhecidas = cat.variaveis_template(base)
        for chave in no.corpo:
            if chave.startswith("$") and chave.split("|")[0] not in conhecidas:
                rel.erro(f"{no.arquivo}: {no.caminho}",
                         f"{chave.split('|')[0]} não existe em {base.ns}.{base.nome} (nem nas bases e filhos)")


def propriedades_de(corpo: dict):
    """(chave, valor) das propriedades de um controle e das listas/objetos dentro dele (bindings, factory...)."""
    for chave, valor in corpo.items():
        if chave.startswith("$") or chave == "controls":
            continue
        yield chave, valor
        if chave == "property_bag":
            continue
        itens = valor if isinstance(valor, list) else [valor] if isinstance(valor, dict) else []
        for item in itens:
            if isinstance(item, dict):
                yield from ((k, v) for k, v in item.items() if not k.startswith("$") and k != "control_ids")


def checar_propriedades(cat: Catalogo, nos: list[No], arquivos: list[ArquivoUI], rel: Relatorio) -> None:
    tipos = cat.valores["type"] | {"panel", "stack_panel", "image", "label", "button", "grid", "factory"}

    def conferir(onde: str, chave: str, valor) -> None:
        if chave not in cat.propriedades:
            rel.aviso(onde, f'propriedade "{chave}" não aparece na UI vanilla (erro de digitação?)')
        permitidos = tipos if chave == "type" else ENUMS.get(chave, set()) | cat.valores.get(chave, set())
        if chave in ENUMS and isinstance(valor, str) and not valor.startswith("$") and valor not in permitidos:
            rel.erro(onde, f'{chave} "{valor}" não é um valor válido')

    for no in nos:
        for chave, valor in propriedades_de(no.corpo):
            conferir(f"{no.arquivo}: {no.caminho}", chave, valor)
    for arq in arquivos:
        for nome, corpo in arq.dados.items():
            for mod in corpo.get("modifications", []) if isinstance(corpo, dict) else []:
                if isinstance(mod, dict) and mod.get("array_name") == "bindings":
                    for binding in mod.get("value", []):
                        for chave, valor in binding.items() if isinstance(binding, dict) else []:
                            conferir(f"{arq.rel}: {nome}.modifications", chave, valor)


def checar_expressoes(arquivos: list[ArquivoUI], rel: Relatorio) -> dict[str, set[str]]:
    """Confere todo binding view e devolve, por arquivo, os textos entre aspas usados nas expressões."""
    literais: dict[str, set[str]] = {}
    for arq in arquivos:
        do_arquivo = literais.setdefault(arq.rel, set())
        for item in dicionarios(arq.dados):
            if item.get("binding_type") != "view":
                continue
            expr = item.get("source_property_name")
            onde = f"{arq.rel}: binding para {item.get('target_property_name')}"
            if not isinstance(expr, str) or not item.get("target_property_name"):
                rel.erro(onde, "binding view precisa de source_property_name e target_property_name")
                continue
            do_arquivo.update(analisar_expressao(expr, onde, rel))
    return literais


def tokenizar(expr: str) -> list[tuple[str, str]]:
    tokens, pos = [], 0
    while pos < len(expr):
        achado = TOKEN_EXPR.match(expr, pos)
        if not achado or achado.end() == pos:
            break
        pos = achado.end()
        if achado.lastgroup:
            tokens.append((achado.lastgroup, achado.group(achado.lastgroup)))
    return tokens


class ErroExpressao(ValueError):
    pass


def avaliar(expr, valores: dict):
    """Avalia uma expressão como o jogo (texto - texto tira as ocorrências; not vale só para o termo seguinte).

    valores dá o valor de cada #propriedade e $variável lida; bool e número passam direto.
    """
    if not isinstance(expr, str):
        return expr
    tokens = tokenizar(expr)
    pos = 0

    def olhar() -> tuple[str | None, str | None]:
        return tokens[pos] if pos < len(tokens) else (None, None)

    def comer() -> tuple[str, str]:
        nonlocal pos
        if pos >= len(tokens):
            raise ErroExpressao(f"expressão incompleta: {expr}")
        pos += 1
        return tokens[pos - 1]

    def termo():
        tipo, valor = comer()
        if tipo == "abre":
            resultado = ou()
            if comer()[0] != "fecha":
                raise ErroExpressao(f"falta ')': {expr}")
            return resultado
        if (tipo, valor) == ("palavra", "not"):
            return not termo()
        if tipo == "texto":
            return valor[1:-1]
        if tipo == "num":
            return float(valor)
        if tipo in ("prop", "var"):
            if valor not in valores:
                raise ErroExpressao(f"{valor} sem valor em {expr}")
            return valores[valor]
        raise ErroExpressao(f'"{valor}" inesperado em {expr}')

    def soma():
        resultado = termo()
        while olhar()[0] == "op" and olhar()[1] in "+-":
            operador, direita = comer()[1], termo()
            if isinstance(resultado, str) and isinstance(direita, str):
                resultado = resultado + direita if operador == "+" else resultado.replace(direita, "")
            elif isinstance(resultado, (int, float)) and isinstance(direita, (int, float)):
                resultado = resultado + direita if operador == "+" else resultado - direita
            else:
                raise ErroExpressao(f"tipos misturados em {expr}")
        return resultado

    def igual():
        resultado = soma()
        while olhar() == ("op", "="):
            comer()
            resultado = resultado == soma()
        return resultado

    def e():
        resultado = igual()
        while olhar() == ("palavra", "and"):
            comer()
            direita = igual()
            resultado = bool(resultado) and bool(direita)
        return resultado

    def ou():
        resultado = e()
        while olhar() == ("palavra", "or"):
            comer()
            direita = e()
            resultado = bool(resultado) or bool(direita)
        return resultado

    resultado = ou()
    if pos != len(tokens):
        raise ErroExpressao(f"sobrou texto em {expr}")
    return resultado


def analisar_expressao(expr: str, onde: str, rel: Relatorio) -> set[str]:
    tokens = tokenizar(expr)
    profundidade = 0
    for tipo, valor in tokens:
        if tipo == "outro":
            rel.erro(onde, f'"{valor}" não é permitido em expressão (use só = not and or - +): {expr}')
        elif tipo == "abre":
            profundidade += 1
        elif tipo == "fecha":
            profundidade -= 1
            if profundidade < 0:
                break
        elif tipo == "var":
            rel.aviso(onde, f"variável {valor} dentro de expressão; prefira literais: {expr}")
    if profundidade != 0:
        rel.erro(onde, f"parênteses desbalanceados: {expr}")
    if not any(tipo == "prop" for tipo, _ in tokens):
        rel.erro(onde, f"a expressão não lê nenhuma #propriedade (o jogo descarta os bindings do controle): {expr}")
    for (tipo_a, valor_a), (tipo_b, valor_b) in zip(tokens, tokens[1:]):
        if ("texto", "''") in ((tipo_a, valor_a), (tipo_b, valor_b)) and "+" in (valor_a, valor_b):
            rel.erro(onde, f"'' + #x derruba o cliente: {expr}")
    return {valor[1:-1] for tipo, valor in tokens if tipo == "texto"}


def checar_nomes_do_motor(cat: Catalogo, arquivos: list[ArquivoUI], rel: Relatorio) -> None:
    """Bindings e botões do motor que usamos precisam continuar existindo na vanilla."""
    server_form = canonico(cat.arquivos.get("server_form.json", {}))
    tudo = None
    for arq in arquivos:
        for item in dicionarios(arq.dados):
            nomes = [item.get("binding_name")] if item.get("binding_type") != "view" else []
            nomes += [item.get("from_button_id"), item.get("to_button_id")]
            for nome in nomes:
                if not isinstance(nome, str) or not nome.startswith(("#", "button.")):
                    continue
                if nome.startswith("#form_") or nome in ("#title_text", CLIQUE):
                    if f'"{nome}"' not in server_form:
                        rel.erro(arq.rel, f"{nome} não aparece mais no server_form.json vanilla")
                    continue
                if tudo is None:
                    tudo = "\n".join(canonico(dados) for dados in cat.arquivos.values())
                if f'"{nome}"' not in tudo:
                    rel.erro(arq.rel, f"{nome} não aparece em nenhum arquivo da UI vanilla")


def checar_fabricas(cat: Catalogo, nos: list[No], rel: Relatorio) -> None:
    """A lista por factory precisa espelhar a long_form_dynamic_buttons_panel vanilla."""
    vanilla = cat.achar(f"server_form.{LISTA_VANILLA}", "server_form")
    fab_vanilla = vanilla.corpo.get("factory") if vanilla else None
    if not isinstance(fab_vanilla, dict):
        rel.erro("server_form.json (vanilla)", f"{LISTA_VANILLA} mudou: não tem mais factory")
        return
    tipos_vanilla = set(fab_vanilla.get("control_ids") or {})
    binding_vanilla = next((b.get("binding_name") for b in vanilla.corpo.get("bindings", [])
                            if b.get("binding_name_override") == "#collection_length"), None)
    for no in nos:
        fabrica = no.corpo.get("factory")
        if not isinstance(fabrica, dict) or no.corpo.get("collection_name") != COLECAO:
            continue
        onde = f"{no.arquivo}: {no.caminho}"
        if fabrica.get("name") != fab_vanilla.get("name"):
            rel.erro(onde, f'a factory deve se chamar "{fab_vanilla.get("name")}" como na vanilla')
        tipos = set(fabrica.get("control_ids") or {})
        if tipos != tipos_vanilla:
            rel.erro(onde, f"tipos de entrada {sorted(tipos)} diferentes da vanilla {sorted(tipos_vanilla)}")
        meus = {b.get("binding_name") for b in no.corpo.get("bindings", [])
                if isinstance(b, dict) and b.get("binding_name_override") == "#collection_length"}
        if binding_vanilla not in meus:
            rel.erro(onde, f"#collection_length deve vir de {binding_vanilla} (como na vanilla)")


# ---------------------------------------------------------------- árvores efetivas (menu e sidebar)

@dataclass
class Instancia:
    nome: str
    caminho: str
    props: dict
    escopo: dict
    base_vanilla: Definicao | None
    fabrica: bool
    ignorado: bool = False
    filhos: list[Instancia] = field(default_factory=list)

    def todas(self):
        """A instância e as descendentes, sem as ignoradas."""
        if self.ignorado:
            return
        yield self
        for filho in self.filhos:
            yield from filho.todas()


class Arvore:
    """Monta a árvore como o jogo monta: bases nossas mescladas, variáveis resolvidas, células das factories."""

    def __init__(self, cat: Catalogo, rel: Relatorio, ns: str, arquivo: str) -> None:
        self.cat = cat
        self.rel = rel
        self.ns = ns
        self.arquivo = arquivo
        self.usadas: set[str] = set()
        self.texturas: dict[str, str] = {}

    def onde(self, caminho: str) -> str:
        return f"{self.arquivo}: {caminho}"

    def resolver(self, valor, escopo: dict, onde: str):
        for _ in range(8):
            if not (isinstance(valor, str) and VARIAVEL.fullmatch(valor)):
                return valor
            if valor in escopo:
                valor = escopo[valor]
            elif valor in self.cat.globais:
                return None
            else:
                self.rel.erro(onde, f"variável {valor} usada sem valor")
                return None
        return valor

    def ignorado(self, valor, escopo: dict, onde: str) -> bool:
        if valor is None:
            return False
        try:
            return bool(avaliar(self.resolver(valor, escopo, onde), escopo))
        except ErroExpressao as falha:
            self.rel.erro(onde, f"ignored: {falha}")
            return False

    def montar(self, chave: str, corpo: dict, escopo_pai: dict, caminho: str, pilha: tuple = (),
               fabrica: bool = False) -> Instancia:
        niveis, base_vanilla = [corpo], None
        ref, ns = separar(chave)[1], self.ns
        onde = self.onde(caminho)
        while ref:
            definicao = self.cat.achar(ref, ns)
            if definicao is None:
                break
            if definicao.ns != self.ns:
                base_vanilla = definicao
                break
            if definicao.nome in pilha:
                self.rel.erro(onde, "herança circular")
                break
            pilha += (definicao.nome,)
            self.usadas.add(definicao.nome)
            niveis.append(definicao.corpo)
            ref, ns = definicao.base, definicao.ns
        niveis_escopo = niveis + ([d.corpo for d in self.cat.cadeia(base_vanilla)] if base_vanilla else [])
        escopo = self.escopo(escopo_pai, niveis_escopo)
        props: dict = {}
        for nivel in reversed(niveis):
            props.update(nivel)
        controles = props.pop("controls", None)
        nome = separar(chave)[0]
        if self.ignorado(props.get("ignored"), escopo, onde):
            return Instancia(nome, caminho, props, escopo, base_vanilla, fabrica, ignorado=True)
        for chave_prop, valor in list(props.items()):
            if not chave_prop.startswith("$"):
                props[chave_prop] = self.resolver(valor, escopo, onde)
                if chave_prop == "texture" and isinstance(props[chave_prop], str):
                    self.texturas.setdefault(props[chave_prop], onde)
        inst = Instancia(nome, caminho, props, escopo, base_vanilla, fabrica)
        for entrada in controles if isinstance(controles, list) else []:
            for chave_filho, corpo_filho in entrada.items() if isinstance(entrada, dict) else []:
                if isinstance(corpo_filho, dict):
                    sub = f"{caminho}/{separar(chave_filho)[0]}"
                    inst.filhos.append(self.montar(chave_filho, corpo_filho, escopo, sub, pilha))
        self.celulas(inst, pilha)
        return inst

    def celulas(self, inst: Instancia, pilha: tuple) -> None:
        """Filhos que o jogo cria fora de "controls": células de factory e o $scrolling_content.

        Célula de factory não herda as variáveis de quem a contém: só recebe as globais e as
        listadas em "factory_variables" (é assim que a vanilla passa $icon_color e afins).
        """
        fabrica = inst.props.get("factory")
        escopo_celula: dict = {}
        if isinstance(fabrica, dict):
            for nome in fabrica.get("factory_variables") or []:
                if nome in inst.escopo:
                    escopo_celula[nome] = inst.escopo[nome]
                elif nome not in self.cat.globais:
                    self.rel.erro(self.onde(inst.caminho), f"factory_variables passa {nome}, que não tem valor aqui")
        for tipo, alvo in alvos_de_factory(fabrica).items():
            definicao = self.cat.achar(referencia_do_alvo(alvo), self.ns)
            if definicao and definicao.ns == self.ns:
                inst.filhos.append(self.montar(f"{tipo}@{self.ns}.{definicao.nome}", {}, escopo_celula,
                                               f"{inst.caminho}/<{tipo}>", pilha, fabrica=True))
        if inst.base_vanilla:
            for nome in sorted({chave.split("|")[0] for chave in inst.props if chave.startswith("$")}):
                valor = inst.escopo.get(nome)
                achado = REF_DEF.match(valor) if isinstance(valor, str) else None
                if achado and achado.group(1) == self.ns:
                    inst.filhos.append(self.montar(f"conteudo@{valor}", {}, inst.escopo,
                                                   f"{inst.caminho}/<{nome}>", pilha))

    def escopo(self, pai: dict, niveis: list[dict]) -> dict:
        proprios: dict = {}
        padroes: dict = {}
        for nivel in niveis:
            for chave, valor in nivel.items():
                if chave.startswith("$"):
                    nome, _, sufixo = chave.partition("|")
                    (padroes if sufixo == "default" else proprios).setdefault(nome, valor)
        escopo = dict(pai)
        for nome, valor in proprios.items():
            escopo[nome] = pai.get(valor, valor) if isinstance(valor, str) else valor
        for nome, valor in padroes.items():
            escopo.setdefault(nome, pai.get(valor, valor) if isinstance(valor, str) else valor)
        return escopo

    def efetivo(self, inst: Instancia, chave: str):
        """Propriedade da instância ou, se não houver, da base vanilla (com as variáveis resolvidas)."""
        if chave in inst.props:
            return inst.props[chave]
        valor = self.cat.propriedade(inst.base_vanilla, chave)
        return self.resolver(valor, inst.escopo, self.onde(inst.caminho)) if valor else valor


def checar_arvores(cat: Catalogo, arquivos: list[ArquivoUI], flags: dict[str, str], rel: Relatorio) -> dict[str, str]:
    """Monta o menu e a sidebar a partir das raízes e confere tudo o que depende da árvore. Devolve as texturas."""
    texturas: dict[str, str] = {}
    for ns, (nome_arquivo, nome_raiz) in RAIZES.items():
        arq = next((a for a in arquivos if a.rel == nome_arquivo), None)
        if arq is None or arq.dados.get("namespace") != ns or not isinstance(arq.dados.get(nome_raiz), dict):
            rel.erro(nome_arquivo, f'falta o namespace "{ns}" com a definição {nome_raiz}')
            continue
        arvore = Arvore(cat, rel, ns, nome_arquivo)
        arvore.usadas.add(nome_raiz)
        raiz = arvore.montar(nome_raiz, arq.dados[nome_raiz], {}, nome_raiz)
        menu = ns == NS_MENU
        indices = checar_instancias(arvore, raiz.filhos if menu else [raiz], rel)
        for nome in sorted({separar(k)[0] for k in arq.dados if k != "namespace"} - arvore.usadas):
            rel.aviso(nome_arquivo, f"definição {nome} não é usada")
        for textura, origem in arvore.texturas.items():
            texturas.setdefault(textura, origem)
        if menu:
            checar_variantes(arvore, raiz, indices, rel)
            simular_menu(arvore, raiz, arquivos, flags, rel)
        else:
            simular_sidebar(arvore, raiz, arquivos, flags, rel)
    return texturas


def recebidas(arvore: Arvore, inst: Instancia) -> set[str]:
    """#propriedades que o controle tem: property_bag e bindings que não são view."""
    nomes = set(inst.props.get("property_bag") or {})
    bindings = arvore.efetivo(inst, "bindings")
    for binding in bindings if isinstance(bindings, list) else []:
        if isinstance(binding, dict) and binding.get("binding_type") != "view":
            nome = binding.get("binding_name_override") or binding.get("binding_name")
            if nome:
                nomes.add(nome)
    return nomes


def checar_leituras(arvore: Arvore, inst: Instancia, pai: Instancia | None, rel: Relatorio) -> None:
    """Todo #x lido por um binding view existe no controle de onde ele lê (o próprio ou source_control_name)."""
    bindings = arvore.efetivo(inst, "bindings")
    onde = arvore.onde(inst.caminho)
    for binding in bindings if isinstance(bindings, list) else []:
        if not isinstance(binding, dict) or binding.get("binding_type") != "view":
            continue
        fonte, nome_fonte = inst, binding.get("source_control_name")
        if nome_fonte:
            if binding.get("resolve_sibling_scope"):
                candidatas = [irma for irma in (pai.filhos if pai else []) if irma is not inst and not irma.ignorado]
            else:
                candidatas = [d for filho in inst.filhos for d in filho.todas()]
            fonte = next((c for c in candidatas if c.nome == nome_fonte), None)
            if fonte is None:
                escopo = "irmão" if binding.get("resolve_sibling_scope") else "descendente"
                rel.erro(onde, f'source_control_name "{nome_fonte}" não é {escopo} deste controle')
                continue
        tem = recebidas(arvore, fonte)
        lidas = {valor for tipo, valor in tokenizar(str(binding.get("source_property_name"))) if tipo == "prop"}
        for valor in sorted(lidas - tem):
            rel.erro(onde, f"o binding view lê {valor}, mas {fonte.nome} não recebe {valor} (falta o binding)")


def checar_instancias(arvore: Arvore, unidades: list[Instancia], rel: Relatorio) -> dict[str, set[int]]:
    """Coleção, botões, leituras e foco. Cada unidade (variante do menu) tem índices e foco próprios, e
    focus_identifier não repete em lugar nenhum (as variantes existem ao mesmo tempo). Devolve os índices."""
    focos: dict[str, str] = {}
    indices_por_unidade: dict[str, set[int]] = {}
    for unidade in unidades:
        indices: dict[int, str] = {}
        focos_da_unidade: set[str] = set()
        mudancas: list[tuple[str, str, str]] = []

        def visitar(inst: Instancia, pai: Instancia | None, indexado: bool) -> None:
            if inst.ignorado:
                return
            onde = arvore.onde(inst.caminho)
            tipo = arvore.efetivo(inst, "type")
            if "collection_name" in inst.props and tipo not in ("stack_panel", "grid", "collection_panel"):
                rel.erro(onde, f"collection_name só vale em stack_panel/grid (aqui é {tipo})")
            if "collection_index" in inst.props:
                colecao_pai = arvore.efetivo(pai, "collection_name") if pai else None
                if pai is None or arvore.efetivo(pai, "type") not in ("stack_panel", "grid") or not colecao_pai:
                    rel.erro(onde, "collection_index precisa estar dentro de um stack_panel/grid com collection_name")
                elif colecao_pai == COLECAO:
                    indice = inst.props["collection_index"]
                    if indice in indices:
                        rel.erro(onde, f"collection_index {indice} repetido (já usado em {indices[indice]})")
                    indices[indice] = inst.caminho
                indexado = True
            if tipo == "button":
                checar_botao(arvore, inst, indexado, onde, rel)
            checar_leituras(arvore, inst, pai, rel)
            foco = arvore.efetivo(inst, "focus_identifier")
            if foco:
                if foco in focos:
                    rel.erro(onde, f'focus_identifier "{foco}" repetido (já usado em {focos[foco]})')
                focos[foco] = inst.caminho
                focos_da_unidade.add(foco)
            for direcao in DIRECOES_FOCO:
                alvo = arvore.efetivo(inst, direcao)
                if alvo and alvo != PARAR_FOCO:
                    mudancas.append((onde, direcao, alvo))
            if eh_gate_de_titulo(arvore.efetivo(inst, "bindings")) and (
                    inst.props.get("property_bag") or {}).get("#visible") is not False:
                rel.aviso(onde, 'gate pelo título sem property_bag {"#visible": false} (pisca 1 frame)')
            for filho in inst.filhos:
                visitar(filho, inst, indexado or filho.fabrica)

        visitar(unidade, None, False)
        for onde, direcao, alvo in mudancas:
            if alvo not in focos_da_unidade:
                rel.erro(onde, f'{direcao} aponta para "{alvo}", que não é focus_identifier desta variante')
        indices_por_unidade[unidade.nome] = set(indices)
    return indices_por_unidade


def eh_gate_de_titulo(bindings) -> bool:
    """Binding view que liga/desliga o controle conforme o título do form."""
    return isinstance(bindings, list) and any(
        isinstance(b, dict) and b.get("binding_type") == "view" and b.get("target_property_name") == "#visible"
        and "#title_text" in str(b.get("source_property_name")) for b in bindings)


def checar_botao(arvore: Arvore, inst: Instancia, indexado: bool, onde: str, rel: Relatorio) -> None:
    mapeamentos = arvore.efetivo(inst, "button_mappings")
    destinos = {m.get("to_button_id") for m in mapeamentos if isinstance(m, dict)} if isinstance(
        mapeamentos, list) else set()
    destinos.add(inst.escopo.get("$pressed_button_name"))
    if CLIQUE not in destinos:
        return
    bindings = arvore.efetivo(inst, "bindings")
    tem_detalhes = isinstance(bindings, list) and any(
        isinstance(b, dict) and b.get("binding_type") == "collection_details"
        and b.get("binding_collection_name") == COLECAO for b in bindings)
    if not tem_detalhes:
        rel.erro(onde, "botão de form sem collection_details no próprio botão (o clique volta canceled)")
    if not indexado:
        rel.erro(onde, "botão de form sem collection_index acima (lê sempre a entrada 0)")


def binding_view(arvore: Arvore, inst: Instancia, alvo: str) -> dict | None:
    bindings = arvore.efetivo(inst, "bindings")
    return next((b for b in bindings if isinstance(b, dict) and b.get("binding_type") == "view"
                 and b.get("target_property_name") == alvo), None) if isinstance(bindings, list) else None


def rotulos_de_titulo(arvore: Arvore, inst: Instancia) -> list[tuple[Instancia, str]]:
    """Labels (não ignorados) cujo #text sai de uma expressão sobre o título do form."""
    achados = []
    for sub in inst.todas():
        binding = binding_view(arvore, sub, "#text")
        if binding and "#title_text" in str(binding.get("source_property_name")):
            achados.append((sub, binding["source_property_name"]))
    return achados


def checar_variantes(arvore: Arvore, raiz: Instancia, indices: dict[str, set[int]], rel: Relatorio) -> None:
    """As 4 variantes do root: peças do tema da pasta certa, Hub com 11 slots e título em imagem."""
    onde_raiz = arvore.onde(raiz.caminho)
    nomes = [filho.nome for filho in raiz.filhos]
    if sorted(nomes) != sorted(VARIANTES):
        rel.erro(onde_raiz, f"o root deve ter as variantes {', '.join(VARIANTES)} (tem {', '.join(nomes)})")
    pecas: dict[str, set[str]] = {}
    for inst in raiz.filhos:
        if inst.nome not in VARIANTES or inst.ignorado:
            continue
        layout, black = VARIANTES[inst.nome]
        onde = arvore.onde(inst.caminho)
        pasta = PASTA_BLACK if black else PASTA_LARANJA
        usadas: set[str] = set()
        for sub in inst.todas():
            textura = sub.props.get("texture")
            for peca in PECAS_TEMA:
                if textura in (PASTA_LARANJA + peca, PASTA_BLACK + peca):
                    usadas.add(peca)
                    if textura != pasta + peca:
                        rel.erro(arvore.onde(sub.caminho), f"{inst.nome} usa {textura} (esperado {pasta + peca})")
        pecas[inst.nome] = usadas
        rotulos = rotulos_de_titulo(arvore, inst)
        if layout == "HUB":
            if indices.get(inst.nome) != set(range(SLOTS_HUB)):
                rel.erro(onde, f"o Hub precisa dos collection_index 0..{SLOTS_HUB - 1}, sem faltar nenhum"
                               f" (tem {sorted(indices.get(inst.nome, set()))})")
            if not any(sub.props.get("texture") == TITULO_IMAGEM for sub in inst.todas()):
                rel.erro(onde, f"o Hub não mostra a imagem {TITULO_IMAGEM}")
            if rotulos:
                rel.erro(onde, "o Hub ainda mostra o título em texto (o label deve ficar ignored)")
        elif len(rotulos) != 1:
            rel.erro(onde, f"a Lista deve ter um label de título (tem {len(rotulos)})")
    for laranja, black in (("hub_laranja", "hub_black"), ("lista_laranja", "lista_black")):
        if laranja in pecas and black in pecas and pecas[laranja] != pecas[black]:
            rel.erro(onde_raiz, f"{laranja} e {black} usam peças diferentes: {sorted(pecas[laranja] ^ pecas[black])}")


def gate_do_gancho(arquivos: list[ArquivoUI], nome_arquivo: str, elemento: str) -> str | None:
    arq = next((a for a in arquivos if a.rel == nome_arquivo), None)
    corpo = arq.dados.get(elemento) if arq else None
    for mod in corpo.get("modifications", []) if isinstance(corpo, dict) else []:
        for binding in mod.get("value", []) if isinstance(mod, dict) else []:
            if (isinstance(binding, dict) and binding.get("binding_type") == "view"
                    and binding.get("target_property_name") == "#visible"):
                return binding.get("source_property_name")
    return None


def visivel_com(arvore: Arvore, inst: Instancia, valores: dict) -> bool:
    """Visibilidade do controle pelo gate de #visible; sem gate, vale o property_bag (padrão visível)."""
    gate = binding_view(arvore, inst, "#visible")
    if gate is None:
        return (inst.props.get("property_bag") or {}).get("#visible") is not False
    return bool(avaliar(gate.get("source_property_name"), valores))


def simular_menu(arvore: Arvore, raiz: Instancia, arquivos: list[ArquivoUI], flags: dict[str, str],
                 rel: Relatorio) -> None:
    """Avalia os gates com títulos de exemplo: uma variante só (ou o form vanilla) e o título limpo."""
    if any(nome not in flags for nome in FLAGS_FORMS):
        rel.aviso("gates", "FLAG de forms.js incompleta: gates do menu não simulados")
        return
    base, hub, lista, black = (flags[nome] for nome in FLAGS_FORMS)
    casos = [
        (hub + "Menu", "hub_laranja", None),
        (hub + black + "Menu", "hub_black", None),
        (lista + "Casas", "lista_laranja", "Casas"),
        (lista + black + "Casas", "lista_black", "Casas"),
        (base + "Outro", "lista_laranja", "Outro"),
        (base + black + "Outro", "lista_black", "Outro"),
        ("Nova casa", None, None),
        ("", None, None),
    ]
    vanilla = gate_do_gancho(arquivos, "server_form.json", "long_form")
    variantes = [inst for inst in raiz.filhos if inst.nome in VARIANTES and not inst.ignorado]
    for titulo, esperada, texto in casos:
        valores = {"#title_text": titulo}
        exemplo = repr(titulo)
        try:
            visiveis = [inst.nome for inst in variantes if visivel_com(arvore, inst, valores)]
            if vanilla is not None and bool(avaliar(vanilla, valores)) != (esperada is None):
                rel.erro("gates", f"título {exemplo}: o form vanilla deveria {'aparecer' if esperada is None else 'sumir'}")
            if visiveis != ([esperada] if esperada else []):
                rel.erro("gates", f"título {exemplo}: aparece {visiveis or 'nada'}, esperado {esperada or 'nada'}")
            if esperada and texto is not None:
                inst = next(i for i in variantes if i.nome == esperada)
                for rotulo, expr in rotulos_de_titulo(arvore, inst):
                    mostrado = avaliar(expr, valores)
                    if mostrado != texto:
                        rel.erro(arvore.onde(rotulo.caminho), f"título {exemplo} mostra {mostrado!r}, esperado {texto!r}")
        except ErroExpressao as falha:
            rel.erro("gates", f"título {exemplo}: {falha}")


def simular_sidebar(arvore: Arvore, raiz: Instancia, arquivos: list[ArquivoUI], flags: dict[str, str],
                    rel: Relatorio) -> None:
    """Simula "Preserve Title Texts": a caixa mostra o último title com a flag e ignora os titles normais.

    Modelo: todo binding é avaliado quando o controle nasce; depois, o de visibility_changed só copia o
    title quando a visibilidade do painel de dados muda.
    """
    flag = flags.get("SIDEBAR")
    if flag is None:
        rel.aviso("sidebar", "FLAG_SIDEBAR de hud.js indisponível: sidebar não simulada")
        return
    pais = {id(filho): inst for inst in raiz.todas() for filho in inst.filhos}
    caixa = texto = None
    for inst in raiz.todas():
        for binding in arvore.efetivo(inst, "bindings") or []:
            if isinstance(binding, dict) and binding.get("binding_type") == "view" and binding.get("source_control_name"):
                if binding.get("target_property_name") == "#visible" and binding.get("resolve_sibling_scope"):
                    caixa = (inst, binding)
                elif binding.get("target_property_name") == "#text":
                    texto = (inst, binding)
    if caixa is None or texto is None:
        rel.erro(arvore.onde(raiz.caminho), "faltam a caixa (visível pela irmã de dados) e o label (texto pelo filho de dados)")
        return
    if (caixa[0].props.get("property_bag") or {}).get("#visible") is not False:
        rel.aviso(arvore.onde(caixa[0].caminho), 'caixa sem property_bag {"#visible": false} (pisca 1 frame)')

    def fonte(par) -> Instancia | None:
        inst, binding = par
        if binding.get("resolve_sibling_scope"):
            candidatas = pais[id(inst)].filhos if id(inst) in pais else []
        else:
            candidatas = [d for filho in inst.filhos for d in filho.todas()]
        return next((c for c in candidatas if c.nome == binding["source_control_name"]), None)

    titulo_vanilla = gate_do_gancho(arquivos, "hud_screen.json", "hud_title_text")
    sequencias = [
        ("", [(flag + "A\nB", "A\nB"), ("Subiu de nível!", "A\nB"), ("", "A\nB"), (flag + "C", "C"),
              (flag + "C", "C"), (flag, None), ("Oi", None), (flag + "D", "D")]),
        (flag + "X", [(flag + "X", "X"), ("Oi", "X")]),
        # HUD remontado (GUI scale) com um title normal no ar: a caixa não pode mostrar esse title
        ("Subiu de nível!", [("Subiu de nível!", None), (flag + "E", "E")]),
    ]
    preparados = {}
    for par in (caixa, texto):
        dados = fonte(par)
        preparado = preparar_dados(arvore, dados, rel) if dados else None
        if preparado is None:
            return
        preparados[id(par[0])] = preparado
    for inicial, passos in sequencias:
        try:
            estados = {chave: SimuladorDados(copia, gate, inicial) for chave, (copia, gate) in preparados.items()}
        except ErroExpressao as falha:
            rel.erro("sidebar", str(falha))
            return
        for titulo, esperado in passos:
            exemplo = repr(titulo)
            try:
                for par in (caixa, texto):
                    estados[id(par[0])].receber(titulo)
                visivel = avaliar(caixa[1]["source_property_name"],
                                  {"#preserved_text": estados[id(caixa[0])].preservado})
                mostrado = avaliar(texto[1]["source_property_name"],
                                   {"#preserved_text": estados[id(texto[0])].preservado})
                if bool(visivel) != (esperado is not None):
                    rel.erro("sidebar", f"title {exemplo}: a caixa deveria {'aparecer' if esperado else 'sumir'}")
                elif esperado is not None and mostrado != esperado:
                    rel.erro("sidebar", f"title {exemplo}: mostra {mostrado!r}, esperado {esperado!r}")
                if titulo_vanilla is not None and bool(avaliar(
                        titulo_vanilla, {"#hud_title_text_string": titulo})) != (flag not in titulo):
                    rel.erro("sidebar", f"title {exemplo}: o title vanilla deveria {'sumir' if flag in titulo else 'aparecer'}")
            except ErroExpressao as falha:
                rel.erro("sidebar", f"title {exemplo}: {falha}")
                return


def preparar_dados(arvore: Arvore, inst: Instancia, rel: Relatorio) -> tuple[dict, str] | None:
    """(binding que copia o title para #preserved_text, gate de #visible) do painel de dados."""
    bindings = arvore.efetivo(inst, "bindings")
    copia = next((b for b in bindings if isinstance(b, dict) and b.get("binding_name_override") == "#preserved_text"
                  and b.get("binding_condition") == "visibility_changed"), None) if isinstance(bindings, list) else None
    gate = (binding_view(arvore, inst, "#visible") or {}).get("source_property_name")
    if copia is None or not isinstance(gate, str):
        rel.erro(arvore.onde(inst.caminho), "dados sem a cópia visibility_changed para #preserved_text ou sem o gate")
        return None
    return copia, gate


class SimuladorDados:
    """Painel de dados da sidebar: guarda em #preserved_text o title do momento em que a visibilidade muda."""

    def __init__(self, copia: dict, gate: str, titulo: str) -> None:
        self.origem = copia.get("binding_name")
        self.gate = gate
        self.preservado = titulo
        self.visivel = bool(avaliar(gate, self.valores(titulo)))

    def valores(self, titulo: str) -> dict:
        return {self.origem: titulo, "#preserved_text": self.preservado}

    def receber(self, titulo: str) -> None:
        for _ in range(4):
            visivel = bool(avaliar(self.gate, self.valores(titulo)))
            if visivel == self.visivel:
                return
            self.visivel = visivel
            self.preservado = titulo
        raise ErroExpressao("o painel de dados não estabiliza (pisca sem parar)")


# ---------------------------------------------------------------- texturas

def dimensoes_png(caminho: Path) -> tuple[int, int, int] | None:
    cabeca = caminho.read_bytes()[:26]
    if len(cabeca) < 26 or cabeca[:8] != b"\x89PNG\r\n\x1a\n" or cabeca[12:16] != b"IHDR":
        return None
    largura, altura = struct.unpack(">II", cabeca[16:24])
    return largura, altura, cabeca[25]


def arquivo_textura(raiz: Path, textura: str) -> Path | None:
    for extensao in ("",) + EXTENSOES_TEXTURA:
        caminho = raiz / (textura + extensao)
        if caminho.is_file():
            return caminho
    return None


def checar_nineslice(png: Path, rel: Relatorio) -> None:
    irmao = png.with_suffix(".json")
    onde = png.relative_to(ADDON).as_posix()
    dims = dimensoes_png(png) if png.suffix == ".png" else None
    if png.suffix == ".png" and dims is None:
        rel.erro(onde, "PNG inválido")
        return
    if dims and dims[2] != 6:
        rel.aviso(onde, "PNG não é RGBA")
    if not irmao.is_file():
        return
    try:
        dados = carregar_json(irmao)
    except (ValueError, UnicodeDecodeError) as falha:
        rel.erro(irmao.relative_to(ADDON).as_posix(), f"JSON inválido: {falha}")
        return
    onde = irmao.relative_to(ADDON).as_posix()
    base, fatia = dados.get("base_size"), dados.get("nineslice_size")
    if isinstance(base, int):
        base = [base, base]
    if isinstance(fatia, int):
        fatia = [fatia] * 4
    if not (isinstance(base, list) and len(base) == 2 and isinstance(fatia, list) and len(fatia) == 4):
        rel.erro(onde, 'esperado {"nineslice_size": N ou [e, c, d, b], "base_size": [L, A]}')
        return
    if dims and list(base) != [dims[0], dims[1]]:
        rel.erro(onde, f"base_size {base} diferente do PNG ({dims[0]}x{dims[1]})")
    if fatia[0] + fatia[2] >= base[0] or fatia[1] + fatia[3] >= base[1]:
        rel.erro(onde, f"nineslice_size {fatia} não cabe em {base}")


def checar_texturas(referencias: dict[str, str], vanilla: set[str] | None, rel: Relatorio) -> None:
    pasta_rp = RP / PREFIXO_TEXTURAS_RP.rstrip("/")
    sem_texturas_rp = not pasta_rp.is_dir()
    if sem_texturas_rp:
        rel.aviso("texturas", f"{pasta_rp.relative_to(ADDON).as_posix()} ainda não existe"
                  " (rode tools/gerar_texturas.py)")
    sem_vanilla_avisado = False
    minusculas = {caminho.lower(): caminho for caminho in vanilla} if vanilla else {}
    for textura, origem in sorted(referencias.items()):
        arquivo = arquivo_textura(RP, textura)
        if arquivo:
            checar_nineslice(arquivo, rel)
            continue
        if textura.startswith(PREFIXO_TEXTURAS_RP):
            if not sem_texturas_rp:
                rel.erro(origem, f"textura {textura} não existe no RP")
            continue
        if vanilla is None:
            if not sem_vanilla_avisado:
                rel.aviso("texturas", "texturas vanilla não conferidas (jogo não encontrado)")
                sem_vanilla_avisado = True
            continue
        candidatos = [textura + ext for ext in ("",) + EXTENSOES_TEXTURA]
        if any(c in vanilla for c in candidatos):
            continue
        parecido = next((minusculas[c.lower()] for c in candidatos if c.lower() in minusculas), None)
        if parecido:
            rel.aviso(origem, f"textura {textura} só existe com outra caixa: {parecido}")
        else:
            rel.erro(origem, f"textura vanilla {textura} não existe no jogo")


def texturas_de_scripts_e_atlas(rel: Relatorio) -> dict[str, str]:
    referencias: dict[str, str] = {}
    if CONFIG_JS.is_file():
        for textura in TEXTURA_JS.findall(CONFIG_JS.read_text(encoding="utf-8-sig")):
            referencias.setdefault(textura, "vulpus_bp/scripts/config.js")
    else:
        rel.aviso("config.js", "vulpus_bp/scripts/config.js ainda não existe (ícones não conferidos)")
    if ITEM_TEXTURE.is_file():
        try:
            dados = carregar_json(ITEM_TEXTURE)
        except (ValueError, UnicodeDecodeError) as falha:
            rel.erro("vulpus_rp/textures/item_texture.json", f"JSON inválido: {falha}")
        else:
            for texto in textos(dados.get("texture_data", {}) if isinstance(dados, dict) else {}):
                if TEXTURA.match(texto):
                    referencias.setdefault(texto, "vulpus_rp/textures/item_texture.json")
    return referencias


# ---------------------------------------------------------------- flags e versão

def ler_string_js(literal: str) -> str:
    aspas, miolo = literal[0], literal[1:-1]
    if aspas == "`":
        return miolo
    if aspas == "'":
        miolo = miolo.replace("\\'", "'").replace('"', '\\"')
    miolo = re.sub(r"\\x([0-9a-fA-F]{2})", r"\\u00\1", miolo)
    return json.loads(f'"{miolo}"')


def ler_js(caminho: Path, rel: Relatorio) -> str | None:
    if not caminho.is_file():
        rel.aviso(caminho.name, f"{caminho.relative_to(ADDON).as_posix()} ainda não existe (flags não conferidas)")
        return None
    bruto = caminho.read_bytes()
    if bruto.startswith(b"\xef\xbb\xbf"):
        rel.erro(caminho.name, "arquivo com BOM (salve em UTF-8 sem BOM)")
    return bruto.decode("utf-8-sig")


def flags_do_script(rel: Relatorio) -> dict[str, str]:
    """FLAG de core/forms.js (BASE, HUB, LISTA, TEMA_BLACK) e FLAG_SIDEBAR de sistemas/hud.js (como SIDEBAR)."""
    flags: dict[str, str] = {}
    texto = ler_js(FORMS_JS, rel)
    if texto is not None:
        bloco = re.search(r"\bFLAG\s*=\s*(?:Object\.freeze\(\s*)?\{(.*?)\}", texto, re.S)
        if not bloco:
            rel.erro("forms.js", f"não achei a constante FLAG = {{ {', '.join(FLAGS_FORMS)} }}")
        else:
            pares = re.findall(rf"(\w+)\s*:\s*({LITERAL_JS})", bloco.group(1))
            flags.update({nome: ler_string_js(literal) for nome, literal in pares if nome in FLAGS_FORMS})
            faltam = [nome for nome in FLAGS_FORMS if nome not in flags]
            if faltam:
                rel.erro("forms.js", f"FLAG sem {', '.join(faltam)}")
    texto = ler_js(HUD_JS, rel)
    if texto is not None:
        achado = re.search(rf"\bexport\s+const\s+FLAG_SIDEBAR\s*=\s*({LITERAL_JS})", texto)
        if achado:
            flags["SIDEBAR"] = ler_string_js(achado.group(1))
        else:
            rel.erro("hud.js", 'não achei export const FLAG_SIDEBAR = "..."')
    return flags


def checar_flags(literais: dict[str, set[str]], flags: dict[str, str], rel: Relatorio) -> None:
    usadas: dict[str, set[str]] = {familia: set() for familia in FAMILIAS}
    for arquivo, do_arquivo in sorted(literais.items()):
        com_codigo = {texto for texto in do_arquivo if "§" in texto}
        for texto in sorted(com_codigo):
            if not FLAG_VALIDA.match(texto):
                rel.erro(arquivo, f"'{texto}' tem caractere que não é código § válido")
        familia = FAMILIA_FLAGS.get(arquivo)
        if familia is None:
            if com_codigo:
                rel.erro(arquivo, "usa flags § mas não tem família em FAMILIA_FLAGS (verificar_ui.py)")
            continue
        usadas[familia] |= com_codigo

    base = flags.get("BASE")
    for nome in ("HUB", "LISTA"):
        valor = flags.get(nome)
        if valor is not None and base is not None and not (
                valor.startswith(base) and valor.endswith("§r") and FLAG_VALIDA.match(valor)):
            rel.erro("forms.js", f"FLAG.{nome} deve começar com FLAG.BASE e terminar em §r")
    if flags.get("HUB") is not None and flags.get("HUB") == flags.get("LISTA"):
        rel.erro("forms.js", "FLAG.HUB e FLAG.LISTA são iguais")
    for token in TOKENS:
        valor = flags.get(token)
        if valor is None:
            continue
        arquivo, nome_js = ("hud.js", "FLAG_SIDEBAR") if token == "SIDEBAR" else ("forms.js", f"FLAG.{token}")
        if not (FLAG_VALIDA.match(valor) and valor.endswith("§r")) or (base is not None and valor.startswith(base)):
            rel.erro(arquivo, f"{nome_js} deve ter só códigos §, terminar em §r e não começar com FLAG.BASE")
        for outro, valor_outro in flags.items():
            if outro != token and (valor in valor_outro or valor_outro in valor):
                rel.erro(arquivo, f"{nome_js} se confunde com {outro} (um contém o outro)")

    for familia, nomes in FAMILIAS.items():
        esperadas = {flags[nome] for nome in nomes if nome in flags}
        if all(nome in flags for nome in nomes):
            for texto in sorted(usadas[familia] - esperadas):
                rel.erro("flags", f"'{texto}' está no JSON ({familia}) mas não nos scripts")
        for texto in sorted(esperadas - usadas[familia]):
            rel.erro("flags", f"'{texto}' está nos scripts mas o JSON ({familia}) não usa")


def checar_versao(cat: Catalogo, rel: Relatorio) -> dict[str, bool]:
    """Para cada arquivo vanilla com gancho: se ele continua igual ao da versão de referência."""
    iguais: dict[str, bool] = {}
    for nome, esperado in HASHES_VANILLA.items():
        dados = cat.arquivos.get(nome)
        if dados is None:
            rel.erro("vanilla", f"{nome} não encontrado na UI vanilla")
            iguais[nome] = False
            continue
        iguais[nome] = hashlib.sha256(canonico(dados).encode("utf-8")).hexdigest() == esperado
        if not iguais[nome]:
            rel.aviso("vanilla", f"{nome} mudou desde a {VERSAO_REFERENCIA}: revise os ganchos e teste no jogo")
    return iguais


# ---------------------------------------------------------------- principal

def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Confere o JSON UI do Vulpus contra a UI vanilla do Bedrock.")
    parser.add_argument("--vanilla", type=Path, help='pasta "ui" vanilla já extraída')
    parser.add_argument("--jogo", type=Path, help='pasta "data" do jogo (padrão: XboxGames em qualquer unidade)')
    args = parser.parse_args(argv)

    jogos = pastas_do_jogo(args.jogo)
    jogo = jogos[0] if jogos else None
    with tempfile.TemporaryDirectory(prefix="vulpus_ui_") as temporaria:
        if args.vanilla:
            pasta_vanilla, origem = args.vanilla, str(args.vanilla)
            if not (pasta_vanilla / "server_form.json").is_file():
                print(f"UI vanilla indisponível: {pasta_vanilla} não tem server_form.json")
                return SAIDA_SEM_VANILLA
        elif jogo:
            try:
                pasta_vanilla = extrair_ui_do_jogo(jogo, Path(temporaria))
            except (OSError, brarchive.FormatoInvalido) as falha:
                print(f"UI vanilla indisponível: não consegui extrair do jogo ({falha})")
                return SAIDA_SEM_VANILLA
            origem = f"jogo instalado em {jogo}"
        else:
            print("UI vanilla indisponível: jogo não encontrado. Use --vanilla PASTA ou --jogo PASTA.")
            return SAIDA_SEM_VANILLA
        cat = carregar_vanilla(pasta_vanilla)
        texturas_vanilla = indice_de_texturas(pasta_vanilla if args.vanilla else None, jogo)

    rel = Relatorio()
    iguais = checar_versao(cat, rel)
    arquivos = carregar_nossos(cat, rel)
    nos = list(todos_os_nos(arquivos))
    checar_ganchos(cat, arquivos, rel)
    checar_referencias(cat, nos, rel)
    checar_variaveis_de_templates(cat, nos, rel)
    checar_propriedades(cat, nos, arquivos, rel)
    literais = checar_expressoes(arquivos, rel)
    checar_nomes_do_motor(cat, arquivos, rel)
    checar_fabricas(cat, nos, rel)
    flags = flags_do_script(rel)
    referencias = checar_arvores(cat, arquivos, flags, rel)
    for arq in arquivos:
        for texto in textos(arq.dados):
            if TEXTURA.match(texto):
                referencias.setdefault(texto, arq.rel)
    for textura, origem_ref in texturas_de_scripts_e_atlas(rel).items():
        referencias.setdefault(textura, origem_ref)
    checar_texturas(referencias, texturas_vanilla, rel)
    checar_flags(literais, flags, rel)

    print("Vulpus » verificação do JSON UI")
    print(f"UI vanilla: {origem}")
    for nome, igual in iguais.items():
        print(f"{nome} vanilla {'igual ao' if igual else 'DIFERENTE do'} da {VERSAO_REFERENCIA}")
    print(f"Conferidos: {len(arquivos)} arquivos, {len(nos)} controles, {len(referencias)} texturas")
    for texto in rel.avisos:
        print(f"  AVISO  {texto}")
    for texto in rel.erros:
        print(f"  ERRO   {texto}")
    print(f"Resultado: {len(rel.erros)} erro(s), {len(rel.avisos)} aviso(s)")
    return SAIDA_ERRO if rel.erros else SAIDA_OK


if __name__ == "__main__":
    sys.exit(main())
