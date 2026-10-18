"""Inimigos do andar 5: O Coração das Nove Caudas (lidos por inimigos_dados.py). O santuário kitsune no fundo da Vulpus e o
guardião final, Nove Caudas."""

OURO = (240, 200, 70)
OURO_ESC = (176, 128, 36)
LACA = (176, 30, 40)
LACA_ESC = (110, 16, 28)
JADE = (70, 170, 130)
JADE_ESC = (36, 110, 86)
FOGO = (90, 170, 255)
BRANCO = (246, 242, 232)

CORES_CAUDAS = [(255, 80, 60), (255, 170, 50), (250, 235, 80), (120, 220, 90), (70, 200, 190),
                (80, 150, 255), (150, 100, 255), (230, 110, 220), (250, 250, 250)]

INIMIGOS = [
    {
        # raposa-espírito de chamas azuis
        "id": "kitsune_espirito", "nome": "Kitsune-Espírito", "andar": 5, "papel": "comum", "rig": "quad",
        "m": {"corpo": (6, 6, 12), "cabeca": (6, 6, 6), "pata": (2, 6, 2)},
        "pint": {
            "corpo": {"cor": BRANCO, "cor2": (190, 220, 255), "estilo": "pelo"},
            "cabeca": {"cor": BRANCO, "cor2": (190, 220, 255), "estilo": "pelo"},
            "pata": {"cor": (60, 70, 120), "estilo": "pelo"},
        },
        "olhos": {"cor": FOGO, "larg": 1, "alt": 1, "sep": 4, "y": 0.4, "boca": LACA, "presas": True},
        "extras": [("corpo", (-1.5, 6, 6), (3, 3, 8), {"cor": FOGO, "estilo": "brilho", "brilho": True})],
        "stats": {"vida": 70, "dano": 8, "vel": 0.36, "rush": 1.4},
        "caixa": (0.8, 1.2), "xp": 14, "caudas": 4, "grupo": 3, "hab": [{"t": "investida", "cd": 7}, {"t": "teleporte", "cd": 12}],
        "ovo": (190, 220, 255),
    },
    {
        # fogo-fátuo
        "id": "fogo_fatuo", "nome": "Fogo-Fátuo", "andar": 5, "papel": "comum", "rig": "flutuante", "voa": True, "brilho": True,
        "m": {"corpo": (6, 6, 6), "alto": 8},
        "pint": {"corpo": {"cor": FOGO, "cor2": (255, 255, 255), "estilo": "brilho", "brilho": True}},
        "olhos": {"cor": (20, 40, 100), "larg": 1, "alt": 2, "sep": 3, "y": 0.4},
        "stats": {"vida": 40, "dano": 7, "vel": 0.32},
        "caixa": (0.6, 0.6), "xp": 12, "caudas": 4, "grupo": 4, "hab": [{"t": "raio", "cd": 9}],
        "ovo": FOGO,
    },
    {
        # komainu de pedra
        "id": "komainu", "nome": "Guardião Komainu", "andar": 5, "papel": "comum", "rig": "quad",
        "m": {"corpo": (8, 8, 12), "cabeca": (7, 7, 6), "pata": (3, 6, 3)},
        "pint": {
            "corpo": {"cor": (150, 150, 158), "cor2": (110, 110, 120), "estilo": "rocha"},
            "cabeca": {"cor": (160, 160, 168), "cor2": (110, 110, 120), "estilo": "rocha"},
            "pata": {"cor": (120, 120, 130), "estilo": "rocha"},
        },
        "olhos": {"cor": LACA, "larg": 1, "alt": 1, "sep": 4, "y": 0.4, "boca": (40, 40, 50), "presas": True},
        "extras": [("cabeca", (-3, 14, -3), (6, 1, 6), {"cor": JADE, "cor2": JADE_ESC, "estilo": "folhas"})],
        "stats": {"vida": 110, "dano": 10, "vel": 0.24, "kb": 0.8},
        "caixa": (1.0, 1.4), "xp": 18, "caudas": 5, "grupo": 2, "hab": [{"t": "pisao", "cd": 9}, {"t": "escudo", "cd": 20}],
        "ovo": (150, 150, 158),
    },
    {
        # sacerdotisa corrompida
        "id": "miko_corrompida", "nome": "Miko Corrompida", "andar": 5, "papel": "elite", "rig": "biped",
        "m": {"cabeca": (6, 7, 6), "corpo": (8, 11, 4), "braco": (3, 11, 3), "perna": (3, 9, 3)},
        "pint": {
            "cabeca": {"cor": BRANCO, "estilo": "liso"},
            "corpo": {"cor": BRANCO, "cor2": LACA, "estilo": "listras"},
            "braco": {"cor": BRANCO, "cor2": LACA, "estilo": "tecido"},
            "perna": {"cor": LACA, "cor2": LACA_ESC, "estilo": "tecido"},
        },
        "olhos": {"cor": FOGO, "larg": 1, "alt": 2, "sep": 4, "y": 0.38, "boca": LACA},
        "extras": [
            ("cabeca", (-4, 21, -3), (8, 2, 6), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
            ("corpo", (-2, 17, -3), (4, 1, 1), {"cor": OURO, "estilo": "metal"}),
        ],
        "stats": {"vida": 240, "dano": 11, "vel": 0.26, "kb": 0.7},
        "caixa": (0.9, 2.5), "xp": 40, "caudas": 10, "grupo": 1, "loot": "elite",
        "hab": [{"t": "raio", "cd": 5}, {"t": "convocar", "cd": 22, "id": "fogo_fatuo", "n": 3}, {"t": "cura", "cd": 18}],
        "ovo": LACA,
    },
    {
        # Nove Caudas: raposa colossal de ouro, com nove caudas de cores diferentes
        "id": "nove_caudas", "nome": "Nove Caudas", "andar": 5, "papel": "boss", "rig": "quad", "escala": 2.4, "brilho": True,
        "m": {"corpo": (9, 8, 16), "cabeca": (8, 8, 8), "pata": (3, 8, 3)},
        "pint": {
            "corpo": {"cor": OURO, "cor2": (255, 240, 170), "estilo": "pelo", "brilho": True},
            "cabeca": {"cor": (255, 230, 140), "cor2": BRANCO, "estilo": "pelo", "brilho": True},
            "pata": {"cor": OURO_ESC, "estilo": "pelo"},
        },
        "olhos": {"cor": LACA, "larg": 2, "alt": 1, "sep": 5, "y": 0.4, "boca": LACA_ESC, "presas": True},
        "extras": [
            ("corpo", (-4 + i * 1.0, 8 + (i % 3) * 2, 8), (1.6, 1.6, 9 + (i % 2) * 2), {"cor": c, "estilo": "brilho", "brilho": True})
            for i, c in enumerate(CORES_CAUDAS)
        ],
        "stats": {"vida": 2200, "dano": 14, "vel": 0.3, "kb": 1.0, "rush": 1.3},
        "caixa": (2.0, 2.6), "xp": 600, "caudas": 250, "grupo": 1, "loot": "boss",
        "hab": [{"t": "investida", "cd": 8}, {"t": "onda", "cd": 12, "n": 9}, {"t": "raio", "cd": 4},
                {"t": "convocar", "cd": 22, "id": "kitsune_espirito", "n": 3}, {"t": "teleporte", "cd": 15}, {"t": "uivo", "cd": 26}],
        "ovo": OURO,
    },
]
