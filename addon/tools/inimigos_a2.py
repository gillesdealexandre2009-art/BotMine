"""Inimigos do andar 2: A Feira Esquecida (lidos por inimigos_dados.py). A alegria da feira da Vulpus, distorcida pelo abandono:
bonecos-palhaço, balões que não estouram, cavalinhos de carrossel, o Domador Sombrio e o Mestre da Feira."""

BRANCO = (240, 236, 226)
VERMELHO = (190, 40, 55)
VERMELHO_ESC = (120, 18, 34)
AMARELO = (238, 205, 80)
ROSA = (238, 150, 190)
ROSA_CLARO = (255, 225, 238)
OURO = (240, 200, 70)
OURO_ESC = (180, 135, 40)
PRETO = (26, 22, 30)

INIMIGOS = [
    {
        # sorriso de tinta, cabelo de lã rosa e o nariz que brilha no escuro
        "id": "boneco_palhaco", "nome": "Boneco-Palhaço", "andar": 2, "papel": "comum", "rig": "biped",
        "m": {"cabeca": (6, 6, 6), "corpo": (7, 8, 4), "braco": (2, 8, 2), "perna": (3, 7, 3)},
        "pint": {
            "cabeca": {"cor": BRANCO, "cor2": (225, 218, 205), "estilo": "liso"},
            "corpo": {"cor": VERMELHO, "cor2": AMARELO, "estilo": "listras"},
            "braco": {"cor": AMARELO, "cor2": VERMELHO, "estilo": "listras"},
            "perna": {"cor": ROSA, "cor2": AMARELO, "estilo": "listras"},
        },
        "olhos": {"cor": (255, 200, 40), "larg": 1, "alt": 2, "sep": 3, "y": 0.32, "boca": VERMELHO, "presas": True},
        "extras": [
            # nariz, cabelo de lã, chapéu de festa e gola de babado (ossos: cabeça acima de ybody = 7 + 8 = 15)
            ("cabeca", (-1, 17, -4), (2, 2, 1), {"cor": (255, 70, 60), "estilo": "liso", "brilho": True}),
            ("cabeca", (-5, 17, -2), (2, 4, 4), {"cor": ROSA, "cor2": (210, 110, 160), "estilo": "pelo"}),
            ("cabeca", (3, 17, -2), (2, 4, 4), {"cor": ROSA, "cor2": (210, 110, 160), "estilo": "pelo"}),
            ("cabeca", (-2, 21, -2), (4, 3, 4), {"cor": VERMELHO, "cor2": AMARELO, "estilo": "listras"}),
            ("cabeca", (-1, 24, -1), (2, 2, 2), {"cor": AMARELO, "estilo": "liso", "brilho": True}),
            ("corpo", (-4.5, 14, -3), (9, 2, 6), {"cor": BRANCO, "cor2": (200, 195, 185), "estilo": "tecido"}),
        ],
        "stats": {"vida": 24, "dano": 4, "vel": 0.26, "rush": 1.25},
        "caixa": (0.7, 1.5), "xp": 6, "caudas": 2, "grupo": 3, "hab": [{"t": "salto", "cd": 9}],
        "ovo": (190, 40, 55),
    },
    {
        # balão de gás que subiu e nunca desceu: sorriso esticado demais e um fio balançando
        "id": "balao_fantasma", "nome": "Balão Fantasma", "andar": 2, "papel": "comum", "rig": "flutuante", "voa": True, "brilho": True,
        "m": {"corpo": (8, 10, 8), "alto": 12},
        "pint": {"corpo": {"cor": (240, 120, 170), "cor2": ROSA_CLARO, "estilo": "gradiente"}},
        "olhos": {"cor": (40, 0, 20), "larg": 2, "alt": 2, "sep": 5, "y": 0.33, "boca": (60, 0, 25), "presas": True},
        "extras": [
            ("corpo", (-3, 18, -5), (2, 3, 1), {"cor": (255, 255, 255), "estilo": "liso", "brilho": True}),
            ("corpo", (-1.5, 10, -1.5), (3, 2, 3), {"cor": (190, 70, 120), "estilo": "liso"}),
            ("corpo", (-0.5, 3, -0.5), (1, 7, 1), {"cor": (245, 240, 235), "estilo": "liso"}),
        ],
        "stats": {"vida": 10, "dano": 3, "vel": 0.3},
        "caixa": (0.7, 1.4), "xp": 4, "caudas": 1, "grupo": 3, "hab": [{"t": "investida", "cd": 10}],
        "ovo": (240, 120, 170),
    },
    {
        # cavalinho de carrossel solto da haste: crina rosa, sela vermelha, cascos de latão e olhos acesos
        "id": "cavalinho_carrossel", "nome": "Cavalinho de Carrossel", "andar": 2, "papel": "comum", "rig": "quad",
        "m": {"corpo": (6, 6, 12), "cabeca": (5, 7, 6), "pata": (2, 6, 2)},
        "pint": {
            "corpo": {"cor": BRANCO, "cor2": ROSA, "estilo": "manchas"},
            "cabeca": {"cor": (250, 246, 238), "cor2": ROSA_CLARO, "estilo": "liso"},
            "pata": {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"},
        },
        "olhos": {"cor": (255, 110, 40), "larg": 1, "alt": 2, "sep": 3, "y": 0.3, "boca": (110, 25, 40), "presas": True},
        "extras": [
            # crina, sela, cauda e a haste dourada que o atravessa
            ("cabeca", (-1, 12, -9), (2, 6, 6), {"cor": ROSA, "cor2": (210, 100, 150), "estilo": "pelo"}),
            ("corpo", (-3.5, 12, -3), (7, 1, 5), {"cor": VERMELHO, "cor2": OURO, "estilo": "metal"}),
            ("corpo", (-1, 6, 6), (2, 6, 2), {"cor": ROSA, "cor2": (210, 100, 150), "estilo": "pelo"}),
            ("corpo", (-0.5, 6, -0.5), (1, 22, 1), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
        ],
        "stats": {"vida": 34, "dano": 5, "vel": 0.3, "rush": 1.4},
        "caixa": (0.9, 1.5), "xp": 7, "caudas": 2, "grupo": 2, "hab": [{"t": "investida", "cd": 8}],
        "ovo": (250, 246, 238),
    },
    {
        # o Domador sem leões: casaca vermelha de galões dourados, cartola, rosto de caveira e o chicote que estala
        "id": "domador_sombrio", "nome": "Domador Sombrio", "andar": 2, "papel": "elite", "rig": "biped", "escala": 1.2,
        "m": {"cabeca": (7, 7, 7), "corpo": (9, 10, 5), "braco": (3, 11, 3), "perna": (4, 9, 4)},
        "pint": {
            "cabeca": {"cor": (232, 226, 205), "cor2": (190, 182, 160), "estilo": "osso"},
            "corpo": {"cor": (170, 28, 40), "cor2": (120, 16, 30), "estilo": "tecido"},
            "braco": {"cor": (160, 26, 38), "cor2": (110, 14, 28), "estilo": "tecido"},
            "perna": {"cor": (30, 26, 36), "cor2": (60, 50, 70), "estilo": "liso"},
        },
        "olhos": {"cor": (255, 150, 40), "larg": 1, "alt": 2, "sep": 3, "y": 0.4, "boca": (40, 10, 10), "presas": True},
        "extras": [
            # cartola com faixa, ombreiras douradas, gola, botões e o chicote
            ("cabeca", (-6, 26, -6), (12, 1, 12), {"cor": PRETO, "cor2": (50, 44, 60), "estilo": "liso"}),
            ("cabeca", (-4, 27, -4), (8, 2, 8), {"cor": VERMELHO, "estilo": "liso"}),
            ("cabeca", (-4, 29, -4), (8, 6, 8), {"cor": PRETO, "cor2": (50, 44, 60), "estilo": "liso"}),
            ("braco_e", (4, 20, -2.5), (4, 2, 5), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
            ("braco_d", (-8, 20, -2.5), (4, 2, 5), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
            ("corpo", (-5, 17, -3), (10, 2, 6), {"cor": BRANCO, "cor2": (200, 195, 185), "estilo": "tecido"}),
            ("corpo", (-0.5, 12, -3), (1, 1, 1), {"cor": OURO, "estilo": "metal"}),
            ("corpo", (-0.5, 15, -3), (1, 1, 1), {"cor": OURO, "estilo": "metal"}),
            ("braco_d", (-7, 9, -9), (1, 1, 9), {"cor": (96, 62, 40), "cor2": (60, 38, 26), "estilo": "rocha"}),
        ],
        "stats": {"vida": 170, "dano": 9, "vel": 0.24, "kb": 0.6, "rush": 1.2},
        "caixa": (0.9, 2.0), "xp": 30, "caudas": 12, "grupo": 1,
        "hab": [{"t": "pisao", "cd": 9}, {"t": "convocar", "cd": 24, "id": "cavalinho_carrossel", "n": 2}],
        "loot": "elite", "ovo": (170, 28, 40),
    },
    {
        # o dono da feira: cartola gigante, rosto de máscara branca, sorriso de presas, casaca vermelha, capa e bengala com globo
        "id": "mestre_feira", "nome": "Mestre da Feira", "andar": 2, "papel": "boss", "rig": "biped", "escala": 2.0,
        "m": {"cabeca": (8, 8, 8), "corpo": (10, 12, 5), "braco": (4, 13, 4), "perna": (4, 11, 4)},
        "pint": {
            "cabeca": {"cor": (246, 243, 236), "cor2": (222, 216, 205), "estilo": "liso"},
            "corpo": {"cor": (176, 26, 42), "cor2": (120, 16, 30), "estilo": "tecido"},
            "braco": {"cor": (166, 24, 40), "cor2": (110, 14, 28), "estilo": "tecido"},
            "perna": {"cor": (28, 24, 34), "cor2": (200, 40, 55), "estilo": "listras"},
        },
        "olhos": {"cor": (255, 220, 60), "larg": 2, "alt": 2, "sep": 5, "y": 0.3, "boca": (170, 20, 40), "presas": True},
        "extras": [
            # cartola alta com faixa, nariz que brilha, cabelo de lã, gravata-borboleta, botões, capa, ombreiras e a bengala
            ("cabeca", (-7, 31, -7), (14, 1, 14), {"cor": PRETO, "cor2": (50, 44, 60), "estilo": "liso"}),
            ("cabeca", (-5, 32, -5), (10, 2, 10), {"cor": VERMELHO, "cor2": OURO, "estilo": "listras"}),
            ("cabeca", (-5, 34, -5), (10, 8, 10), {"cor": PRETO, "cor2": (50, 44, 60), "estilo": "liso"}),
            ("cabeca", (-1, 26, -5), (2, 2, 1), {"cor": (255, 70, 60), "estilo": "liso", "brilho": True}),
            ("cabeca", (-7, 26, -2), (3, 5, 5), {"cor": ROSA, "cor2": (210, 110, 160), "estilo": "pelo"}),
            ("cabeca", (4, 26, -2), (3, 5, 5), {"cor": ROSA, "cor2": (210, 110, 160), "estilo": "pelo"}),
            ("corpo", (-3, 20, -3.5), (6, 3, 1), {"cor": VERMELHO, "cor2": AMARELO, "estilo": "listras", "brilho": True}),
            ("corpo", (-0.5, 17, -3), (1, 1, 1), {"cor": OURO, "estilo": "metal"}),
            ("corpo", (-0.5, 14, -3), (1, 1, 1), {"cor": OURO, "estilo": "metal"}),
            ("corpo", (-6, 12, 2.5), (12, 11, 1), {"cor": (100, 10, 28), "cor2": (60, 6, 18), "estilo": "tecido"}),
            ("braco_e", (5, 22, -3), (5, 2, 6), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
            ("braco_d", (-10, 22, -3), (5, 2, 6), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
            ("braco_d", (-8.5, 4, -4), (1, 24, 1), {"cor": OURO, "cor2": OURO_ESC, "estilo": "metal"}),
            ("braco_d", (-9.5, 28, -5), (3, 3, 3), {"cor": (255, 150, 200), "estilo": "brilho", "brilho": True}),
        ],
        "stats": {"vida": 700, "dano": 10, "vel": 0.27, "kb": 1.0, "rush": 1.25},
        "caixa": (1.5, 3.6), "xp": 220, "caudas": 120, "grupo": 1,
        "hab": [
            {"t": "investida", "cd": 10},
            {"t": "onda", "cd": 14, "n": 6},
            {"t": "convocar", "cd": 26, "id": "boneco_palhaco", "n": 3},
            {"t": "convocar", "cd": 32, "id": "balao_fantasma", "n": 4},
            {"t": "teleporte", "cd": 22},
        ],
        "loot": "boss", "ovo": (176, 26, 42),
    },
]
