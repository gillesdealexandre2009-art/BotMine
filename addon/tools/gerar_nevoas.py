#!/usr/bin/env python3
"""Gera as névoas da Vulpus (fog definido pelo resource pack, usado pelo mistério da Vulpus em sistemas/arg.js).

Uso, a partir da pasta addon/:
    python tools/gerar_nevoas.py

Saída:
- vulpus_rp/fogs/<id>.json: uma definição de fog por névoa (identifier vulpus:<id>), distância fixa em todas as direções
  (fog_start/fog_end em blocos) e cor. O jogo aplica com /fog @s push vulpus:<id> "<id do usuário>".
- vulpus_bp/scripts/textos/nevoas.js: a lista (id, nome para o painel, texto de ajuda), na mesma ordem.
Para esconder paredes e teto: use uma névoa cujo fog_end seja MENOR que a distância até eles (ex.: "Densa" tem 5 blocos; um
campo com teto a 12 blocos de altura e paredes a 20 do centro some por completo com a "Trigo").
"""
from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"

# id, nome, cor, início, fim, ajuda
NEVOAS = [
    ("trigo", "Trigo (dourada, bem fechada)", "#ecdfb4", 1.0, 13.0, "Branco-dourada. Some com paredes e teto a mais de uns 13 blocos."),
    ("branca", "Branca (muito fechada)", "#ffffff", 0.0, 8.0, "Branco puro; a sala branca sem fim."),
    ("densa", "Densa (quase cega)", "#d6d6d6", 0.0, 4.5, "Só se vê a poucos blocos; esconde até paredes próximas."),
    ("azul", "Azulada (sonho frio)", "#8fa6c8", 0.0, 14.0, "Azul-acinzentada, como um sonho gelado."),
    ("vermelha", "Vermelha (opressiva)", "#6e1818", 0.0, 10.0, "Vermelho escuro, pesada."),
    ("negra", "Negra (escuridão)", "#08080c", 0.0, 7.0, "O escuro engole tudo depois de 7 blocos."),
    ("leve", "Leve (só um véu)", "#cfd8e6", 12.0, 48.0, "Um véu discreto, sem esconder as construções."),
    ("pessego", "Pêssego (quente, memória)", "#FFD9C2", 0.0, 22.0, "Pêssego quente, memória antiga."),
    ("lilas", "Lilás (sonho suave)", "#D9C8FF", 0.0, 22.0, "Lilás suave de sonho."),
    ("creme", "Creme (fim de tarde)", "#FFF3DC", 0.0, 18.0, "Creme claro, luz de fim de tarde."),
    ("rosa", "Rosa-bebê (doce)", "#FFD1E6", 0.0, 20.0, "Rosa-bebê."),
    ("ceu", "Céu (azul claro, nuvem)", "#CFE8FF", 0.0, 24.0, "Céu azul claro, nuvem."),
    ("nevoeiro", "Neblina branca (dreamcore)", "#F7F5FA", 3.0, 30.0, "Branco-perolado suave: o lugar some devagar ao longe, como num sonho."),
]

# começo e fim de uma névoa "quase invisível", de onde os degraus de transição partem
DIST_INI = 60.0
DIST_FIM = 120.0

# névoas internas (não aparecem no painel): id, cor, início, fim
INTERNAS = [
    ("cegueira_branca", "#ffffff", 0.0, 0.4),  # dentro do Bloco Branco Atravessável: a tela toda fica branca
]


def definicao(id_: str, cor: str, inicio: float, fim: float) -> dict:
    ar = {"fog_start": inicio, "fog_end": fim, "fog_color": cor, "render_distance_type": "fixed"}
    # na água e na lava mantém algo parecido, mas um pouco mais fechado
    sob = {"fog_start": 0.0, "fog_end": max(4.0, min(fim, 12.0)), "fog_color": cor, "render_distance_type": "fixed"}
    return {
        "format_version": "1.16.100",
        "minecraft:fog_settings": {
            "description": {"identifier": f"vulpus:{id_}"},
            "distance": {"air": ar, "water": sob, "lava": sob, "lava_resistance": sob, "weather": ar},
        },
    }


def textos_js() -> str:
    linhas = ["// @ts-check", "// GERADO por addon/tools/gerar_nevoas.py: não edite à mão. Névoas do resource pack (vulpus_rp/fogs).", ""]
    linhas.append("/** @type {readonly { id: string, nome: string, ajuda: string }[]} */")
    linhas.append("export const NEVOAS = [")
    for id_, nome, _cor, _i, _f, ajuda in NEVOAS:
        linhas.append(f"  {{ id: {json.dumps(id_)}, nome: {json.dumps(nome, ensure_ascii=False)}, ajuda: {json.dumps(ajuda, ensure_ascii=False)} }},")
    linhas.append("];")
    linhas.append("")
    linhas.append("/** @param {string} id */")
    linhas.append("export const nevoaValida = (id) => NEVOAS.some((n) => n.id === id);")
    linhas.append("")
    return "\n".join(linhas)


def main() -> None:
    pasta = RP / "fogs"
    pasta.mkdir(parents=True, exist_ok=True)
    for id_, _nome, cor, inicio, fim, _ajuda in NEVOAS:
        (pasta / f"nevoa_{id_}.json").write_text(json.dumps(definicao(f"nevoa_{id_}", cor, inicio, fim), separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    # degraus de transição (_t1 e _t2): o mistério os usa um pouco ANTES de a pessoa entrar na região e na saída, para a névoa
    # fechar e abrir em etapas em vez de aparecer ou sumir de uma vez. Interpolação geométrica a partir de uma névoa distante.
    for id_, _nome, cor, inicio, fim, _ajuda in NEVOAS:
        for sufixo, f in (("t1", 0.35), ("t2", 0.7)):
            fim_t = DIST_FIM * (fim / DIST_FIM) ** f
            ini_t = min(DIST_INI + (inicio - DIST_INI) * f, fim_t - 2.0)
            (pasta / f"nevoa_{id_}_{sufixo}.json").write_text(json.dumps(definicao(f"nevoa_{id_}_{sufixo}", cor, round(ini_t, 1), round(fim_t, 1)), separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    for id_, cor, inicio, fim in INTERNAS:
        (pasta / f"nevoa_{id_}.json").write_text(json.dumps(definicao(f"nevoa_{id_}", cor, inicio, fim), separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    (BP / "scripts" / "textos" / "nevoas.js").write_text(textos_js(), encoding="utf-8")
    print(f"{len(NEVOAS)} névoas geradas (cada uma com 2 degraus de transição), mais {len(INTERNAS)} interna(s).")


if __name__ == "__main__":
    main()
