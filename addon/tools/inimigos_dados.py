"""Especificações dos inimigos da masmorra (lidas por gerar_inimigos.py). Andar 1: A Toca."""

PELO_ESC = (58, 40, 52)
PELO_ESC2 = (84, 58, 74)
BRASA = (255, 150, 60)

A1 = [
    {
        "id": "raposa_sombra", "nome": "Raposa-Sombra", "andar": 1, "papel": "comum", "rig": "quad",
        "m": {"corpo": (7, 6, 12), "cabeca": (7, 6, 6), "pata": (2, 5, 2)},
        "pint": {
            "corpo": {"cor": PELO_ESC, "cor2": PELO_ESC2, "estilo": "pelo"},
            "cabeca": {"cor": PELO_ESC2, "cor2": PELO_ESC, "estilo": "pelo"},
            "pata": {"cor": (30, 22, 30), "estilo": "pelo"},
        },
        "olhos": {"cor": (255, 90, 90), "larg": 1, "alt": 1, "sep": 4, "y": 0.4},
        "stats": {"vida": 14, "dano": 3, "vel": 0.34, "rush": 1.3},
        "caixa": (0.7, 0.8), "xp": 4, "caudas": 1, "grupo": 3, "hab": [{"t": "investida", "cd": 8}],
        "ovo": (58, 40, 52),
    },
    {
        "id": "cria_ninho", "nome": "Cria do Ninho", "andar": 1, "papel": "comum", "rig": "quad",
        "m": {"corpo": (5, 4, 7), "cabeca": (5, 4, 4), "pata": (1, 3, 1)},
        "pint": {
            "corpo": {"cor": (210, 120, 60), "cor2": (240, 170, 100), "estilo": "pelo"},
            "cabeca": {"cor": (235, 150, 80), "cor2": (255, 220, 170), "estilo": "pelo"},
            "pata": {"cor": (60, 40, 30), "estilo": "liso"},
        },
        "olhos": {"cor": (30, 20, 20), "larg": 1, "alt": 1, "sep": 3, "y": 0.45},
        "stats": {"vida": 6, "dano": 2, "vel": 0.4, "rush": 1.4},
        "caixa": (0.5, 0.5), "xp": 2, "caudas": 1, "grupo": 5, "hab": [], "ovo": (210, 120, 60),
    },
    {
        "id": "morcego_toca", "nome": "Morcego da Toca", "andar": 1, "papel": "comum", "rig": "flutuante", "voa": True,
        "m": {"corpo": (6, 5, 6), "alto": 8},
        "pint": {"corpo": {"cor": (50, 44, 66), "cor2": (80, 70, 100), "estilo": "pelo"}},
        "olhos": {"cor": (255, 220, 90), "larg": 1, "alt": 1, "sep": 3, "y": 0.4, "boca": (200, 60, 60), "presas": True},
        "stats": {"vida": 8, "dano": 2, "vel": 0.3},
        "caixa": (0.6, 0.6), "xp": 3, "caudas": 1, "grupo": 3, "hab": [], "ovo": (50, 44, 66),
    },
    {
        "id": "guardiao_raiz", "nome": "Guardião de Raiz", "andar": 1, "papel": "elite", "rig": "biped",
        "m": {"cabeca": (6, 6, 6), "corpo": (8, 9, 4), "braco": (3, 10, 3), "perna": (3, 8, 3)},
        "pint": {
            "cabeca": {"cor": (96, 70, 44), "cor2": (66, 48, 30), "estilo": "rocha"},
            "corpo": {"cor": (84, 60, 38), "cor2": (54, 90, 46), "estilo": "folhas"},
            "braco": {"cor": (96, 70, 44), "cor2": (66, 48, 30), "estilo": "rocha"},
            "perna": {"cor": (66, 48, 30), "cor2": (40, 28, 18), "estilo": "rocha"},
        },
        "olhos": {"cor": (255, 200, 80), "larg": 1, "alt": 1, "sep": 3, "y": 0.45},
        "stats": {"vida": 60, "dano": 6, "vel": 0.22, "kb": 0.6},
        "caixa": (0.9, 2.4), "xp": 14, "caudas": 4, "grupo": 1, "hab": [{"t": "pisao", "cd": 10}], "loot": "elite", "ovo": (96, 70, 44),
    },
    {
        "id": "raposa_mae", "nome": "Raposa Mãe", "andar": 1, "papel": "boss", "rig": "quad", "escala": 2.2,
        "m": {"corpo": (8, 7, 14), "cabeca": (8, 7, 7), "pata": (2, 6, 2)},
        "pint": {
            "corpo": {"cor": (230, 120, 50), "cor2": (160, 70, 40), "estilo": "pelo"},
            "cabeca": {"cor": (240, 140, 70), "cor2": (255, 230, 200), "estilo": "pelo"},
            "pata": {"cor": (40, 28, 30), "estilo": "pelo"},
        },
        "olhos": {"cor": (255, 255, 160), "larg": 1, "alt": 1, "sep": 4, "y": 0.4, "boca": (120, 30, 30), "presas": True},
        "stats": {"vida": 400, "dano": 8, "vel": 0.3, "kb": 1.0, "rush": 1.3},
        "caixa": (1.6, 1.8), "xp": 120, "caudas": 60, "grupo": 1,
        "hab": [{"t": "investida", "cd": 9}, {"t": "convocar", "cd": 20, "id": "cria_ninho", "n": 4}, {"t": "uivo", "cd": 25}],
        "loot": "boss", "ovo": (230, 120, 50),
    },
]


def _juntar():
    """Andares 2 a 5 ficam em inimigos_a2.py ... inimigos_a5.py (lista A2..A5 em cada)."""
    import importlib

    todos = list(A1)
    for n in range(2, 6):
        try:
            todos += importlib.import_module(f"inimigos_a{n}").INIMIGOS
        except ModuleNotFoundError:
            pass
    return todos


# Habilidades de cada inimigo (substituem o campo "hab" dos arquivos de andar): ataques variados, sempre com aviso no chão.
# Tipos: investida pisao convocar uivo salto onda nevoa raio teleporte escudo cura feixe salva puxar anel poca meteoro roubo sombra
HAB = {
    # andar 1: A Toca (suave: poucos golpes, bem avisados)
    "raposa_sombra": [{"t": "investida", "cd": 10}],
    "cria_ninho": [],
    "morcego_toca": [{"t": "roubo", "cd": 9}],
    "guardiao_raiz": [{"t": "pisao", "cd": 12}, {"t": "puxar", "cd": 18}],
    "raposa_mae": [{"t": "investida", "cd": 10}, {"t": "convocar", "cd": 24, "id": "cria_ninho", "n": 3}, {"t": "anel", "cd": 15}, {"t": "uivo", "cd": 30}, {"t": "salva", "cd": 20}],
    # andar 2: A Feira Esquecida
    "boneco_palhaco": [{"t": "salto", "cd": 9}, {"t": "poca", "cd": 18}],
    "balao_fantasma": [{"t": "feixe", "cd": 10}],
    "cavalinho_carrossel": [{"t": "investida", "cd": 8}, {"t": "anel", "cd": 16}],
    "domador_sombrio": [{"t": "pisao", "cd": 10}, {"t": "convocar", "cd": 20, "id": "cavalinho_carrossel", "n": 2}, {"t": "puxar", "cd": 14}],
    "mestre_feira": [{"t": "investida", "cd": 9}, {"t": "onda", "cd": 13, "n": 7}, {"t": "convocar", "cd": 22, "id": "boneco_palhaco", "n": 2}, {"t": "meteoro", "cd": 18}, {"t": "teleporte", "cd": 16}],
    # andar 3: O Campo de Guerra
    "soldado_fantasma": [{"t": "investida", "cd": 9}, {"t": "escudo", "cd": 20}],
    "arqueiro_fantasma": [{"t": "feixe", "cd": 7}, {"t": "salva", "cd": 16}],
    "cao_de_guerra": [{"t": "salto", "cd": 8}, {"t": "roubo", "cd": 8}],
    "porta_estandarte": [{"t": "cura", "cd": 16}, {"t": "pisao", "cd": 11}, {"t": "convocar", "cd": 22, "id": "soldado_fantasma", "n": 2}],
    "general_sem_bandeira": [{"t": "investida", "cd": 8}, {"t": "onda", "cd": 12, "n": 8}, {"t": "salva", "cd": 14}, {"t": "convocar", "cd": 26, "id": "soldado_fantasma", "n": 3}, {"t": "meteoro", "cd": 20}, {"t": "escudo", "cd": 24}],
    # andar 4: O Sonho
    "sombra_crianca": [{"t": "sombra", "cd": 12}, {"t": "teleporte", "cd": 11}],
    "pesadelo_cobertor": [{"t": "nevoa", "cd": 14, "n": 6}, {"t": "poca", "cd": 18}],
    "manequim": [{"t": "salto", "cd": 9}, {"t": "puxar", "cd": 15}],
    "dama_do_relogio": [{"t": "raio", "cd": 6}, {"t": "anel", "cd": 14}, {"t": "escudo", "cd": 24}],
    "o_branco": [{"t": "nevoa", "cd": 12, "n": 9}, {"t": "raio", "cd": 5}, {"t": "convocar", "cd": 26, "id": "sombra_crianca", "n": 3}, {"t": "teleporte", "cd": 16}, {"t": "meteoro", "cd": 16}, {"t": "onda", "cd": 14, "n": 8}],
    # andar 5: O Coração das Nove Caudas
    "kitsune_espirito": [{"t": "investida", "cd": 8}, {"t": "teleporte", "cd": 12}, {"t": "roubo", "cd": 9}],
    "fogo_fatuo": [{"t": "feixe", "cd": 8}, {"t": "poca", "cd": 16}],
    "komainu": [{"t": "pisao", "cd": 9}, {"t": "escudo", "cd": 20}, {"t": "onda", "cd": 15, "n": 6}],
    "miko_corrompida": [{"t": "raio", "cd": 5}, {"t": "convocar", "cd": 22, "id": "fogo_fatuo", "n": 3}, {"t": "cura", "cd": 18}, {"t": "salva", "cd": 14}],
    "nove_caudas": [{"t": "investida", "cd": 8}, {"t": "onda", "cd": 12, "n": 9}, {"t": "salva", "cd": 10}, {"t": "meteoro", "cd": 14, "n": 4}, {"t": "convocar", "cd": 24, "id": "kitsune_espirito", "n": 3}, {"t": "teleporte", "cd": 15}, {"t": "anel", "cd": 13}, {"t": "uivo", "cd": 28}],
}

INIMIGOS = _juntar()
for _e in INIMIGOS:
    if _e["id"] in HAB:
        _e["hab"] = HAB[_e["id"]]

