"""Inimigos do andar 4: O Sonho (lidos por inimigos_dados.py). Medos de criança num sonho que esqueceu de acabar, e O Branco,
o vazio que consome cor."""

PALIDO = (226, 224, 238)
PALIDO2 = (190, 186, 214)
ROXO = (84, 62, 140)
ROXO_ESC = (44, 30, 84)
NOITE = (28, 24, 58)
BRANCO = (248, 248, 252)

INIMIGOS = [
    {
        # sombra baixinha com olhos grandes demais
        "id": "sombra_crianca", "nome": "Sombra de Criança", "andar": 4, "papel": "comum", "rig": "biped",
        "m": {"cabeca": (7, 7, 6), "corpo": (6, 7, 3), "braco": (2, 8, 2), "perna": (2, 6, 2)},
        "pint": {
            "cabeca": {"cor": NOITE, "cor2": ROXO_ESC, "estilo": "gradiente"},
            "corpo": {"cor": ROXO_ESC, "cor2": NOITE, "estilo": "gradiente"},
            "braco": {"cor": NOITE, "estilo": "liso"},
            "perna": {"cor": NOITE, "estilo": "liso"},
        },
        "olhos": {"cor": (255, 255, 255), "larg": 2, "alt": 3, "sep": 4, "y": 0.4, "boca": (255, 255, 255)},
        "stats": {"vida": 40, "dano": 6, "vel": 0.3, "rush": 1.3},
        "caixa": (0.7, 1.4), "xp": 9, "caudas": 3, "grupo": 3, "hab": [{"t": "teleporte", "cd": 10}],
        "ovo": (44, 30, 84),
    },
    {
        # cobertor que flutua e abafa
        "id": "pesadelo_cobertor", "nome": "Pesadelo-Cobertor", "andar": 4, "papel": "comum", "rig": "flutuante", "voa": True,
        "m": {"corpo": (11, 3, 11), "alto": 10},
        "pint": {"corpo": {"cor": ROXO, "cor2": PALIDO2, "estilo": "tecido"}},
        "olhos": {"cor": (255, 230, 120), "larg": 2, "alt": 1, "sep": 5, "y": 0.5, "boca": (20, 10, 30), "presas": True},
        "extras": [
            ("corpo", (-5.5, 10, -5.5), (2, 1, 2), {"cor": PALIDO, "estilo": "tecido"}),
            ("corpo", (3.5, 10, 3.5), (2, 1, 2), {"cor": PALIDO, "estilo": "tecido"}),
        ],
        "stats": {"vida": 30, "dano": 5, "vel": 0.28},
        "caixa": (1.1, 0.6), "xp": 8, "caudas": 3, "grupo": 3, "hab": [{"t": "nevoa", "cd": 14, "n": 6}],
        "ovo": (84, 62, 140),
    },
    {
        # manequim de vitrine, sorriso pintado, andar travado
        "id": "manequim", "nome": "Manequim do Sonho", "andar": 4, "papel": "comum", "rig": "biped",
        "m": {"cabeca": (6, 7, 6), "corpo": (7, 10, 4), "braco": (2, 11, 2), "perna": (3, 10, 3)},
        "pint": {
            "cabeca": {"cor": PALIDO, "cor2": PALIDO2, "estilo": "osso"},
            "corpo": {"cor": PALIDO2, "cor2": PALIDO, "estilo": "tecido"},
            "braco": {"cor": PALIDO, "estilo": "osso"},
            "perna": {"cor": PALIDO2, "estilo": "osso"},
        },
        "olhos": {"cor": (30, 20, 60), "larg": 1, "alt": 1, "sep": 4, "y": 0.4, "boca": (150, 40, 80)},
        "stats": {"vida": 55, "dano": 7, "vel": 0.22, "kb": 0.4},
        "caixa": (0.7, 2.0), "xp": 10, "caudas": 3, "grupo": 2, "hab": [{"t": "salto", "cd": 9}],
        "ovo": (226, 224, 238),
    },
    {
        # a Dama do Relógio: elite, para o tempo ao redor
        "id": "dama_do_relogio", "nome": "Dama do Relógio", "andar": 4, "papel": "elite", "rig": "biped",
        "m": {"cabeca": (6, 7, 6), "corpo": (8, 11, 4), "braco": (3, 11, 3), "perna": (3, 9, 3)},
        "pint": {
            "cabeca": {"cor": PALIDO, "estilo": "osso"},
            "corpo": {"cor": ROXO, "cor2": (200, 170, 70), "estilo": "metal"},
            "braco": {"cor": ROXO_ESC, "estilo": "tecido"},
            "perna": {"cor": ROXO_ESC, "estilo": "tecido"},
        },
        "olhos": {"cor": (255, 210, 90), "larg": 1, "alt": 2, "sep": 4, "y": 0.38, "boca": (60, 20, 60)},
        "extras": [
            ("corpo", (-3, 9, -3), (6, 6, 1), {"cor": (230, 200, 90), "cor2": (160, 120, 40), "estilo": "metal"}),
            ("cabeca", (-4, 20, -4), (8, 2, 8), {"cor": ROXO_ESC, "estilo": "tecido"}),
        ],
        "stats": {"vida": 160, "dano": 9, "vel": 0.24, "kb": 0.7},
        "caixa": (0.9, 2.5), "xp": 30, "caudas": 8, "grupo": 1, "loot": "elite",
        "hab": [{"t": "raio", "cd": 6}, {"t": "uivo", "cd": 20}, {"t": "escudo", "cd": 25}],
        "ovo": (200, 170, 70),
    },
    {
        # O Branco: o vazio que consome a cor
        "id": "o_branco", "nome": "O Branco", "andar": 4, "papel": "boss", "rig": "bloco", "escala": 2.0, "brilho": True,
        "m": {"corpo": (10, 12, 6), "cabeca": (8, 8, 8), "braco": (4, 14, 4), "base": 8},
        "pint": {
            "corpo": {"cor": BRANCO, "cor2": PALIDO, "estilo": "gradiente", "brilho": True},
            "cabeca": {"cor": BRANCO, "cor2": PALIDO2, "estilo": "liso", "brilho": True},
            "braco": {"cor": PALIDO, "cor2": BRANCO, "estilo": "gradiente", "brilho": True},
            "base": {"cor": PALIDO2, "estilo": "gradiente", "brilho": True},
        },
        "olhos": {"cor": (20, 10, 50), "larg": 2, "alt": 4, "sep": 5, "y": 0.4, "boca": (20, 10, 50)},
        "stats": {"vida": 1300, "dano": 12, "vel": 0.26, "kb": 1.0, "rush": 1.2},
        "caixa": (1.8, 3.4), "xp": 300, "caudas": 120, "grupo": 1, "loot": "boss",
        "hab": [{"t": "nevoa", "cd": 12, "n": 9}, {"t": "raio", "cd": 5}, {"t": "convocar", "cd": 24, "id": "sombra_crianca", "n": 3},
                {"t": "teleporte", "cd": 16}, {"t": "onda", "cd": 14, "n": 8}],
        "ovo": (248, 248, 252),
    },
]
