"""Inimigos do andar 3: O Campo de Guerra (lidos por inimigos_dados.py). Os soldados que morreram nas guerras de clãs e no Capture the
Flag da Vulpus e nunca deixaram o campo: soldados fantasmas, arqueiros, cães de guerra, o Porta-Estandarte e o General Sem Bandeira."""

# paleta fantasma: pele de névoa azul-acinzentada, ferro velho, madeira escura e os tecidos dos clãs
NEVOA = (176, 198, 214)
NEVOA_ESC = (112, 134, 156)
NEVOA_FUNDO = (64, 78, 98)
FERRO = (122, 126, 136)
FERRO_ESC = (72, 76, 88)
FERRO_VELHO = (96, 82, 74)
FERRUGEM = (132, 72, 44)
MADEIRA = (84, 58, 36)
MADEIRA_ESC = (52, 36, 24)
VERMELHO = (178, 42, 44)
VERMELHO_ESC = (104, 22, 30)
AZUL = (52, 84, 186)
AZUL_ESC = (28, 48, 118)
AMARELO = (226, 192, 52)
VERDE = (84, 158, 52)
PRETO = (24, 22, 28)
OSSO = (222, 216, 196)
BRASA = (255, 126, 40)
OLHO_GELO = (150, 230, 255)

INIMIGOS = [
    {
        # soldado de infantaria com tabardo vermelho: elmo com nasal e pluma, escudo do clã no braço e a espada em riste
        "id": "soldado_fantasma", "nome": "Soldado Fantasma", "andar": 3, "papel": "comum", "rig": "biped",
        "m": {"cabeca": (6, 6, 6), "corpo": (8, 10, 4), "braco": (3, 10, 3), "perna": (3, 9, 3)},
        "pint": {
            "cabeca": {"cor": NEVOA, "cor2": NEVOA_ESC, "estilo": "liso"},
            "corpo": {"cor": FERRO, "cor2": FERRO_ESC, "estilo": "metal"},
            "braco": {"cor": NEVOA_ESC, "cor2": NEVOA_FUNDO, "estilo": "tecido"},
            "perna": {"cor": NEVOA, "cor2": NEVOA_FUNDO, "estilo": "gradiente"},
        },
        "olhos": {"cor": OLHO_GELO, "larg": 1, "alt": 1, "sep": 3, "y": 0.5},
        "extras": [
            # elmo, nasal e pluma de crina (cabeça vai de y=19 a 25)
            ("cabeca", (-3.5, 22, -3.5), (7, 3.5, 7), {"cor": FERRO, "cor2": FERRO_ESC, "estilo": "metal"}),
            ("cabeca", (-0.5, 19.5, -3.9), (1, 3.5, 0.8), {"cor": FERRO, "cor2": FERRO_ESC, "estilo": "metal"}),
            ("cabeca", (-0.5, 25.5, -3), (1, 3, 6), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "pelo"}),
            # tabardo do clã e cinto
            ("corpo", (-3, 9.5, -2.6), (6, 8, 0.7), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("corpo", (-4.4, 9, -2.4), (8.8, 1.4, 4.8), {"cor": MADEIRA_ESC, "cor2": FERRO_VELHO, "estilo": "metal"}),
            # escudo redondo no braço esquerdo e espada no direito
            ("braco_e", (6.6, 11, -4), (1.2, 9, 8), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("braco_e", (6.2, 10.4, -4.6), (0.8, 10.2, 1), {"cor": FERRO_ESC, "estilo": "metal"}),
            ("braco_d", (-5.2, 10.4, -12), (1.2, 1.2, 10), {"cor": FERRO, "cor2": FERRO_ESC, "estilo": "metal"}),
            ("braco_d", (-6.2, 9.8, -3), (3.2, 2.4, 1), {"cor": MADEIRA, "estilo": "liso"}),
        ],
        "stats": {"vida": 36, "dano": 5, "vel": 0.27, "rush": 1.25, "kb": 0.2},
        "caixa": (0.7, 1.7), "xp": 8, "caudas": 2, "grupo": 3, "hab": [{"t": "escudo", "cd": 16}],
        "ovo": (178, 42, 44),
    },
    {
        # arqueira de capuz azul: capuz de tecido, aljava de flechas nas costas e o arco longo preso ao braço
        "id": "arqueiro_fantasma", "nome": "Arqueiro Fantasma", "andar": 3, "papel": "comum", "rig": "biped",
        "m": {"cabeca": (6, 6, 6), "corpo": (7, 10, 4), "braco": (2, 10, 2), "perna": (3, 9, 3)},
        "pint": {
            "cabeca": {"cor": NEVOA, "cor2": NEVOA_ESC, "estilo": "liso"},
            "corpo": {"cor": AZUL_ESC, "cor2": AZUL, "estilo": "tecido"},
            "braco": {"cor": AZUL_ESC, "cor2": NEVOA_FUNDO, "estilo": "tecido"},
            "perna": {"cor": NEVOA_ESC, "cor2": NEVOA_FUNDO, "estilo": "gradiente"},
        },
        "olhos": {"cor": OLHO_GELO, "larg": 1, "alt": 1, "sep": 3, "y": 0.5},
        "extras": [
            # capuz que cobre a testa e cai pelas costas
            ("cabeca", (-3.6, 22, -3.6), (7.2, 3.4, 7.2), {"cor": AZUL, "cor2": AZUL_ESC, "estilo": "tecido"}),
            ("cabeca", (-3.6, 19, 2.4), (7.2, 6, 1.2), {"cor": AZUL_ESC, "cor2": AZUL, "estilo": "tecido"}),
            ("cabeca", (-1, 25.4, -1.5), (2, 2, 3), {"cor": AZUL_ESC, "estilo": "liso"}),
            # bandoleira, aljava e flechas
            ("corpo", (-3.8, 9.4, -2.5), (7.6, 1.4, 5), {"cor": MADEIRA, "cor2": MADEIRA_ESC, "estilo": "tecido"}),
            ("corpo", (-2.6, 9, 2.1), (3, 10, 2), {"cor": MADEIRA, "cor2": MADEIRA_ESC, "estilo": "tecido"}),
            ("corpo", (-2.2, 18.6, 2.4), (0.8, 3, 0.8), {"cor": OSSO, "estilo": "liso"}),
            ("corpo", (-0.6, 18.6, 2.4), (0.8, 2.4, 0.8), {"cor": OSSO, "estilo": "liso"}),
            ("corpo", (0.8, 18.6, 2.4), (0.8, 3, 0.8), {"cor": VERMELHO, "estilo": "liso"}),
            # arco no braço esquerdo (haste curva em três cubos) e a corda
            ("braco_e", (5.2, 8, -9), (1, 7, 1.4), {"cor": MADEIRA, "cor2": MADEIRA_ESC, "estilo": "rocha"}),
            ("braco_e", (5.2, 14.5, -8.3), (1, 7, 1.4), {"cor": MADEIRA, "cor2": MADEIRA_ESC, "estilo": "rocha"}),
            ("braco_e", (5.2, 11, -10), (1, 5, 1.4), {"cor": MADEIRA_ESC, "estilo": "liso"}),
            ("braco_e", (5.5, 8.6, -8.3), (0.4, 11, 0.4), {"cor": OSSO, "estilo": "liso"}),
        ],
        "stats": {"vida": 24, "dano": 4, "vel": 0.24, "kb": 0.0},
        "ataque": "distancia", "projetil": "minecraft:arrow", "intervalo": 2.4, "raio_tiro": 16, "alcance": 24,
        "caixa": (0.6, 1.7), "xp": 8, "caudas": 2, "grupo": 3, "hab": [{"t": "salto", "cd": 9}],
        "ovo": (52, 84, 186), "som": "mob.skeleton.say",
    },
    {
        # cão de guerra: pelagem de fuligem, cicatrizes, coleira de espetos de ferro e manta de clã
        "id": "cao_de_guerra", "nome": "Cão de Guerra", "andar": 3, "papel": "comum", "rig": "quad",
        "m": {"corpo": (6, 6, 12), "cabeca": (5, 5, 6), "pata": (2, 5, 2)},
        "pint": {
            "corpo": {"cor": (52, 46, 50), "cor2": (88, 70, 62), "estilo": "pelo"},
            "cabeca": {"cor": (62, 54, 56), "cor2": (110, 86, 72), "estilo": "pelo"},
            "pata": {"cor": (30, 26, 30), "cor2": (62, 54, 56), "estilo": "pelo"},
        },
        "olhos": {"cor": BRASA, "larg": 1, "alt": 1, "sep": 3, "y": 0.4, "boca": (150, 40, 40), "presas": True},
        "extras": [
            # coleira com espetos, manta do clã, orelhas rasgadas e cauda em riste
            ("cabeca", (-3, 6.8, -6.4), (6, 6.4, 2), {"cor": FERRO_VELHO, "cor2": FERRO_ESC, "estilo": "metal"}),
            ("cabeca", (-2.5, 13, -6), (1, 1.6, 1), {"cor": FERRO, "estilo": "metal"}),
            ("cabeca", (1.5, 13, -6), (1, 1.6, 1), {"cor": FERRO, "estilo": "metal"}),
            ("cabeca", (-0.5, 13, -6), (1, 1.8, 1), {"cor": FERRO, "estilo": "metal"}),
            ("corpo", (-3.6, 11, -3.5), (7.2, 0.9, 7), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("cabeca", (-2.6, 12.6, -8), (1.6, 2.6, 1.4), {"cor": (30, 26, 30), "estilo": "pelo"}),
            ("cabeca", (1.0, 12.6, -8), (1.6, 2.6, 1.4), {"cor": (30, 26, 30), "estilo": "pelo"}),
            ("corpo", (-0.6, 8.5, 5.8), (1.2, 1.2, 4), {"cor": (52, 46, 50), "cor2": (88, 70, 62), "estilo": "pelo"}),
        ],
        "stats": {"vida": 22, "dano": 5, "vel": 0.36, "rush": 1.35},
        "caixa": (0.7, 0.9), "xp": 7, "caudas": 2, "grupo": 3, "hab": [{"t": "investida", "cd": 7}, {"t": "uivo", "cd": 30}],
        "ovo": (52, 46, 50), "som": "mob.wolf.growl",
    },
    {
        # o porta-estandarte do clã: armadura pesada, o mastro nas costas com o pano rasgado e a pluma de comando
        "id": "porta_estandarte", "nome": "Porta-Estandarte", "andar": 3, "papel": "elite", "rig": "biped",
        "m": {"cabeca": (7, 7, 7), "corpo": (10, 11, 5), "braco": (4, 11, 4), "perna": (4, 10, 4)},
        "pint": {
            "cabeca": {"cor": NEVOA, "cor2": NEVOA_ESC, "estilo": "liso"},
            "corpo": {"cor": FERRO, "cor2": FERRO_ESC, "estilo": "metal"},
            "braco": {"cor": FERRO, "cor2": FERRO_VELHO, "estilo": "metal"},
            "perna": {"cor": FERRO_ESC, "cor2": FERRO_VELHO, "estilo": "metal"},
        },
        "olhos": {"cor": OLHO_GELO, "larg": 1, "alt": 1, "sep": 4, "y": 0.5},
        "extras": [
            # elmo fechado com crista, ombreiras e peitoral do clã (cabeça de y=21 a 28)
            ("cabeca", (-4, 25, -4), (8, 3.6, 8), {"cor": FERRO, "cor2": FERRO_ESC, "estilo": "metal"}),
            ("cabeca", (-0.6, 28.4, -3.5), (1.2, 3.2, 7), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "pelo"}),
            ("cabeca", (-0.6, 21, -4.5), (1.2, 4.6, 1), {"cor": FERRO_ESC, "estilo": "metal"}),
            ("braco_e", (4.6, 20, -3.6), (5.6, 3.4, 7.2), {"cor": FERRO, "cor2": FERRUGEM, "estilo": "metal"}),
            ("braco_d", (-10.2, 20, -3.6), (5.6, 3.4, 7.2), {"cor": FERRO, "cor2": FERRUGEM, "estilo": "metal"}),
            ("corpo", (-4, 11, -3.1), (8, 9, 0.9), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("corpo", (-5.4, 10, -2.9), (10.8, 1.6, 5.8), {"cor": MADEIRA_ESC, "cor2": FERRO_VELHO, "estilo": "metal"}),
            # o mastro na mão direita (sobe de y=8 a 44) com o pano rasgado e farrapos
            ("braco_d", (-8.2, 8, -4.2), (1.6, 36, 1.6), {"cor": MADEIRA, "cor2": MADEIRA_ESC, "estilo": "rocha"}),
            ("braco_d", (-8.2, 44, -4.2), (1.6, 3, 1.6), {"cor": FERRO, "estilo": "metal"}),
            ("braco_d", (-22, 32, -3.6), (14, 12, 0.6), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("braco_d", (-19, 28, -3.4), (4, 4, 0.6), {"cor": PRETO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("braco_d", (-12, 27, -3.4), (3, 5, 0.6), {"cor": VERMELHO_ESC, "estilo": "tecido"}),
        ],
        "stats": {"vida": 140, "dano": 9, "vel": 0.24, "kb": 0.7},
        "caixa": (0.9, 2.1), "xp": 40, "caudas": 12, "grupo": 1,
        "hab": [{"t": "convocar", "cd": 18, "id": "soldado_fantasma", "n": 2}, {"t": "pisao", "cd": 10}, {"t": "escudo", "cd": 26}],
        "loot": "elite", "ovo": (178, 42, 44),
    },
    {
        # o general que perdeu o campo e a bandeira: armadura enferrujada com colchas de todos os clãs costuradas no peito,
        # manto rasgado, chifres, escudo-torre e um mastro quebrado, sem pano, que ele nunca largou
        "id": "general_sem_bandeira", "nome": "General Sem Bandeira", "andar": 3, "papel": "boss", "rig": "biped", "escala": 1.7, "atlas": 256,
        "m": {"cabeca": (7, 7, 7), "corpo": (10, 12, 5), "braco": (4, 12, 4), "perna": (4, 11, 4)},
        "pint": {
            "cabeca": {"cor": NEVOA, "cor2": NEVOA_ESC, "estilo": "liso"},
            "corpo": {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"},
            "braco": {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"},
            "perna": {"cor": FERRO_ESC, "cor2": FERRUGEM, "estilo": "metal"},
        },
        "olhos": {"cor": BRASA, "larg": 2, "alt": 1, "sep": 4, "y": 0.5},
        "extras": [
            # elmo de general: viseira, chifres de osso e pluma preta em farrapos (cabeça de y=23 a 30)
            ("cabeca", (-4, 27.5, -4), (8, 3.6, 8), {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"}),
            ("cabeca", (-4, 22, -4), (8, 2.6, 8), {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"}),
            ("cabeca", (-6.4, 28, -1.2), (2.6, 5.4, 2.4), {"cor": OSSO, "cor2": (170, 160, 140), "estilo": "osso"}),
            ("cabeca", (3.8, 28, -1.2), (2.6, 5.4, 2.4), {"cor": OSSO, "cor2": (170, 160, 140), "estilo": "osso"}),
            ("cabeca", (-1, 31, -3), (2, 4, 7), {"cor": PRETO, "cor2": VERMELHO_ESC, "estilo": "pelo"}),
            # ombreiras e cinto
            ("braco_e", (4.6, 30, -4), (6.4, 4, 8), {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"}),
            ("braco_d", (-11, 30, -4), (6.4, 4, 8), {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"}),
            ("corpo", (-5.6, 11.5, -3.1), (11.2, 2, 6.2), {"cor": MADEIRA_ESC, "cor2": AMARELO, "estilo": "metal"}),
            # colchas dos clãs costuradas no peitoral (um pedaço de cada bandeira perdida)
            ("corpo", (-4.6, 15.5, -3.1), (4.6, 6.5, 0.8), {"cor": VERMELHO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("corpo", (0.2, 17.5, -3.1), (4.4, 6, 0.8), {"cor": AZUL, "cor2": AZUL_ESC, "estilo": "tecido"}),
            ("corpo", (-3, 13.2, -3.1), (3.4, 3, 0.8), {"cor": AMARELO, "cor2": (170, 140, 30), "estilo": "tecido"}),
            ("corpo", (1.4, 13.6, -3.1), (3.2, 3.4, 0.8), {"cor": VERDE, "cor2": (50, 100, 34), "estilo": "tecido"}),
            # manto rasgado nas costas
            ("corpo", (-6, 9, 2.6), (12, 20, 1.2), {"cor": VERMELHO_ESC, "cor2": (60, 12, 22), "estilo": "tecido"}),
            ("corpo", (-6, 4, 2.6), (3.4, 5, 1.2), {"cor": VERMELHO_ESC, "cor2": (60, 12, 22), "estilo": "tecido"}),
            ("corpo", (-1, 1.5, 2.6), (3.6, 7.5, 1.2), {"cor": VERMELHO_ESC, "cor2": (60, 12, 22), "estilo": "tecido"}),
            ("corpo", (3.6, 5, 2.6), (2.4, 4, 1.2), {"cor": PRETO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            # escudo-torre no braço esquerdo, com a caveira do general
            ("braco_e", (9.2, 8, -6.5), (2, 20, 13), {"cor": (84, 84, 96), "cor2": FERRUGEM, "estilo": "metal"}),
            ("braco_e", (11, 14, -2.5), (0.7, 8, 5), {"cor": OSSO, "cor2": (170, 160, 140), "estilo": "osso"}),
            # mastro quebrado na mão direita, sem bandeira, só farrapos pretos
            ("braco_d", (-8.2, 6, -4.2), (1.8, 38, 1.8), {"cor": MADEIRA, "cor2": MADEIRA_ESC, "estilo": "rocha"}),
            ("braco_d", (-8.4, 44, -4.4), (2.2, 5, 2.2), {"cor": FERRO, "cor2": FERRUGEM, "estilo": "metal"}),
            ("braco_d", (-13.4, 36, -3.7), (5.2, 7, 0.6), {"cor": PRETO, "cor2": VERMELHO_ESC, "estilo": "tecido"}),
            ("braco_d", (-11.4, 29, -3.7), (3, 5, 0.6), {"cor": PRETO, "estilo": "liso"}),
        ],
        "stats": {"vida": 1000, "dano": 14, "vel": 0.27, "kb": 1.0, "rush": 1.3},
        "caixa": (1.2, 3.2), "xp": 400, "caudas": 220, "grupo": 1,
        "hab": [
            {"t": "investida", "cd": 9}, {"t": "pisao", "cd": 11}, {"t": "onda", "cd": 16, "n": 8},
            {"t": "convocar", "cd": 24, "id": "soldado_fantasma", "n": 3}, {"t": "convocar", "cd": 32, "id": "cao_de_guerra", "n": 2},
            {"t": "uivo", "cd": 28}, {"t": "escudo", "cd": 30},
        ],
        "loot": "boss", "ovo": (84, 84, 96), "som": "mob.wither.ambient",
    },
]
