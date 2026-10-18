// @ts-check
// GERADO por tools/gerar_inimigos.py (edite lá). Inimigos da masmorra: estatísticas, habilidades e recompensas.
/** @type {readonly { id: string, nome: string, andar: number, papel: string, vida: number, dano: number, vel: number, xp: number, caudas: number, hab: any[], loot: string, grupo: number, altura: number, som: string }[]} */
export const INIMIGOS = Object.freeze([
  {
    "id": "raposa_sombra",
    "nome": "Raposa-Sombra",
    "andar": 1,
    "papel": "comum",
    "vida": 14,
    "dano": 3,
    "vel": 0.34,
    "xp": 4,
    "caudas": 1,
    "hab": [
      {
        "t": "investida",
        "cd": 10
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 0.8,
    "som": "mob.zombie.say"
  },
  {
    "id": "cria_ninho",
    "nome": "Cria do Ninho",
    "andar": 1,
    "papel": "comum",
    "vida": 6,
    "dano": 2,
    "vel": 0.4,
    "xp": 2,
    "caudas": 1,
    "hab": [],
    "loot": "comum",
    "grupo": 5,
    "altura": 0.5,
    "som": "mob.zombie.say"
  },
  {
    "id": "morcego_toca",
    "nome": "Morcego da Toca",
    "andar": 1,
    "papel": "comum",
    "vida": 8,
    "dano": 2,
    "vel": 0.3,
    "xp": 3,
    "caudas": 1,
    "hab": [
      {
        "t": "roubo",
        "cd": 9
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 0.6,
    "som": "mob.zombie.say"
  },
  {
    "id": "guardiao_raiz",
    "nome": "Guardião de Raiz",
    "andar": 1,
    "papel": "elite",
    "vida": 60,
    "dano": 6,
    "vel": 0.22,
    "xp": 14,
    "caudas": 4,
    "hab": [
      {
        "t": "pisao",
        "cd": 12
      },
      {
        "t": "puxar",
        "cd": 18
      }
    ],
    "loot": "elite",
    "grupo": 1,
    "altura": 2.4,
    "som": "mob.zombie.say"
  },
  {
    "id": "raposa_mae",
    "nome": "Raposa Mãe",
    "andar": 1,
    "papel": "boss",
    "vida": 400,
    "dano": 8,
    "vel": 0.3,
    "xp": 120,
    "caudas": 60,
    "hab": [
      {
        "t": "investida",
        "cd": 10
      },
      {
        "t": "convocar",
        "cd": 24,
        "id": "cria_ninho",
        "n": 3
      },
      {
        "t": "anel",
        "cd": 15
      },
      {
        "t": "uivo",
        "cd": 30
      },
      {
        "t": "salva",
        "cd": 20
      }
    ],
    "loot": "boss",
    "grupo": 1,
    "altura": 1.8,
    "som": "mob.zombie.say"
  },
  {
    "id": "boneco_palhaco",
    "nome": "Boneco-Palhaço",
    "andar": 2,
    "papel": "comum",
    "vida": 24,
    "dano": 4,
    "vel": 0.26,
    "xp": 6,
    "caudas": 2,
    "hab": [
      {
        "t": "salto",
        "cd": 9
      },
      {
        "t": "poca",
        "cd": 18
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 1.5,
    "som": "mob.zombie.say"
  },
  {
    "id": "balao_fantasma",
    "nome": "Balão Fantasma",
    "andar": 2,
    "papel": "comum",
    "vida": 10,
    "dano": 3,
    "vel": 0.3,
    "xp": 4,
    "caudas": 1,
    "hab": [
      {
        "t": "feixe",
        "cd": 10
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 1.4,
    "som": "mob.zombie.say"
  },
  {
    "id": "cavalinho_carrossel",
    "nome": "Cavalinho de Carrossel",
    "andar": 2,
    "papel": "comum",
    "vida": 34,
    "dano": 5,
    "vel": 0.3,
    "xp": 7,
    "caudas": 2,
    "hab": [
      {
        "t": "investida",
        "cd": 8
      },
      {
        "t": "anel",
        "cd": 16
      }
    ],
    "loot": "comum",
    "grupo": 2,
    "altura": 1.5,
    "som": "mob.zombie.say"
  },
  {
    "id": "domador_sombrio",
    "nome": "Domador Sombrio",
    "andar": 2,
    "papel": "elite",
    "vida": 170,
    "dano": 9,
    "vel": 0.24,
    "xp": 30,
    "caudas": 12,
    "hab": [
      {
        "t": "pisao",
        "cd": 10
      },
      {
        "t": "convocar",
        "cd": 20,
        "id": "cavalinho_carrossel",
        "n": 2
      },
      {
        "t": "puxar",
        "cd": 14
      }
    ],
    "loot": "elite",
    "grupo": 1,
    "altura": 2.0,
    "som": "mob.zombie.say"
  },
  {
    "id": "mestre_feira",
    "nome": "Mestre da Feira",
    "andar": 2,
    "papel": "boss",
    "vida": 700,
    "dano": 10,
    "vel": 0.27,
    "xp": 220,
    "caudas": 120,
    "hab": [
      {
        "t": "investida",
        "cd": 9
      },
      {
        "t": "onda",
        "cd": 13,
        "n": 7
      },
      {
        "t": "convocar",
        "cd": 22,
        "id": "boneco_palhaco",
        "n": 2
      },
      {
        "t": "meteoro",
        "cd": 18
      },
      {
        "t": "teleporte",
        "cd": 16
      }
    ],
    "loot": "boss",
    "grupo": 1,
    "altura": 3.6,
    "som": "mob.zombie.say"
  },
  {
    "id": "soldado_fantasma",
    "nome": "Soldado Fantasma",
    "andar": 3,
    "papel": "comum",
    "vida": 36,
    "dano": 5,
    "vel": 0.27,
    "xp": 8,
    "caudas": 2,
    "hab": [
      {
        "t": "investida",
        "cd": 9
      },
      {
        "t": "escudo",
        "cd": 20
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 1.7,
    "som": "mob.zombie.say"
  },
  {
    "id": "arqueiro_fantasma",
    "nome": "Arqueiro Fantasma",
    "andar": 3,
    "papel": "comum",
    "vida": 24,
    "dano": 4,
    "vel": 0.24,
    "xp": 8,
    "caudas": 2,
    "hab": [
      {
        "t": "feixe",
        "cd": 7
      },
      {
        "t": "salva",
        "cd": 16
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 1.7,
    "som": "mob.skeleton.say"
  },
  {
    "id": "cao_de_guerra",
    "nome": "Cão de Guerra",
    "andar": 3,
    "papel": "comum",
    "vida": 22,
    "dano": 5,
    "vel": 0.36,
    "xp": 7,
    "caudas": 2,
    "hab": [
      {
        "t": "salto",
        "cd": 8
      },
      {
        "t": "roubo",
        "cd": 8
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 0.9,
    "som": "mob.wolf.growl"
  },
  {
    "id": "porta_estandarte",
    "nome": "Porta-Estandarte",
    "andar": 3,
    "papel": "elite",
    "vida": 140,
    "dano": 9,
    "vel": 0.24,
    "xp": 40,
    "caudas": 12,
    "hab": [
      {
        "t": "cura",
        "cd": 16
      },
      {
        "t": "pisao",
        "cd": 11
      },
      {
        "t": "convocar",
        "cd": 22,
        "id": "soldado_fantasma",
        "n": 2
      }
    ],
    "loot": "elite",
    "grupo": 1,
    "altura": 2.1,
    "som": "mob.zombie.say"
  },
  {
    "id": "general_sem_bandeira",
    "nome": "General Sem Bandeira",
    "andar": 3,
    "papel": "boss",
    "vida": 1000,
    "dano": 14,
    "vel": 0.27,
    "xp": 400,
    "caudas": 220,
    "hab": [
      {
        "t": "investida",
        "cd": 8
      },
      {
        "t": "onda",
        "cd": 12,
        "n": 8
      },
      {
        "t": "salva",
        "cd": 14
      },
      {
        "t": "convocar",
        "cd": 26,
        "id": "soldado_fantasma",
        "n": 3
      },
      {
        "t": "meteoro",
        "cd": 20
      },
      {
        "t": "escudo",
        "cd": 24
      }
    ],
    "loot": "boss",
    "grupo": 1,
    "altura": 3.2,
    "som": "mob.wither.ambient"
  },
  {
    "id": "sombra_crianca",
    "nome": "Sombra de Criança",
    "andar": 4,
    "papel": "comum",
    "vida": 40,
    "dano": 6,
    "vel": 0.3,
    "xp": 9,
    "caudas": 3,
    "hab": [
      {
        "t": "sombra",
        "cd": 12
      },
      {
        "t": "teleporte",
        "cd": 11
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 1.4,
    "som": "mob.zombie.say"
  },
  {
    "id": "pesadelo_cobertor",
    "nome": "Pesadelo-Cobertor",
    "andar": 4,
    "papel": "comum",
    "vida": 30,
    "dano": 5,
    "vel": 0.28,
    "xp": 8,
    "caudas": 3,
    "hab": [
      {
        "t": "nevoa",
        "cd": 14,
        "n": 6
      },
      {
        "t": "poca",
        "cd": 18
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 0.6,
    "som": "mob.zombie.say"
  },
  {
    "id": "manequim",
    "nome": "Manequim do Sonho",
    "andar": 4,
    "papel": "comum",
    "vida": 55,
    "dano": 7,
    "vel": 0.22,
    "xp": 10,
    "caudas": 3,
    "hab": [
      {
        "t": "salto",
        "cd": 9
      },
      {
        "t": "puxar",
        "cd": 15
      }
    ],
    "loot": "comum",
    "grupo": 2,
    "altura": 2.0,
    "som": "mob.zombie.say"
  },
  {
    "id": "dama_do_relogio",
    "nome": "Dama do Relógio",
    "andar": 4,
    "papel": "elite",
    "vida": 160,
    "dano": 9,
    "vel": 0.24,
    "xp": 30,
    "caudas": 8,
    "hab": [
      {
        "t": "raio",
        "cd": 6
      },
      {
        "t": "anel",
        "cd": 14
      },
      {
        "t": "escudo",
        "cd": 24
      }
    ],
    "loot": "elite",
    "grupo": 1,
    "altura": 2.5,
    "som": "mob.zombie.say"
  },
  {
    "id": "o_branco",
    "nome": "O Branco",
    "andar": 4,
    "papel": "boss",
    "vida": 1300,
    "dano": 12,
    "vel": 0.26,
    "xp": 300,
    "caudas": 120,
    "hab": [
      {
        "t": "nevoa",
        "cd": 12,
        "n": 9
      },
      {
        "t": "raio",
        "cd": 5
      },
      {
        "t": "convocar",
        "cd": 26,
        "id": "sombra_crianca",
        "n": 3
      },
      {
        "t": "teleporte",
        "cd": 16
      },
      {
        "t": "meteoro",
        "cd": 16
      },
      {
        "t": "onda",
        "cd": 14,
        "n": 8
      }
    ],
    "loot": "boss",
    "grupo": 1,
    "altura": 3.4,
    "som": "mob.zombie.say"
  },
  {
    "id": "kitsune_espirito",
    "nome": "Kitsune-Espírito",
    "andar": 5,
    "papel": "comum",
    "vida": 70,
    "dano": 8,
    "vel": 0.36,
    "xp": 14,
    "caudas": 4,
    "hab": [
      {
        "t": "investida",
        "cd": 8
      },
      {
        "t": "teleporte",
        "cd": 12
      },
      {
        "t": "roubo",
        "cd": 9
      }
    ],
    "loot": "comum",
    "grupo": 3,
    "altura": 1.2,
    "som": "mob.zombie.say"
  },
  {
    "id": "fogo_fatuo",
    "nome": "Fogo-Fátuo",
    "andar": 5,
    "papel": "comum",
    "vida": 40,
    "dano": 7,
    "vel": 0.32,
    "xp": 12,
    "caudas": 4,
    "hab": [
      {
        "t": "feixe",
        "cd": 8
      },
      {
        "t": "poca",
        "cd": 16
      }
    ],
    "loot": "comum",
    "grupo": 4,
    "altura": 0.6,
    "som": "mob.zombie.say"
  },
  {
    "id": "komainu",
    "nome": "Guardião Komainu",
    "andar": 5,
    "papel": "comum",
    "vida": 110,
    "dano": 10,
    "vel": 0.24,
    "xp": 18,
    "caudas": 5,
    "hab": [
      {
        "t": "pisao",
        "cd": 9
      },
      {
        "t": "escudo",
        "cd": 20
      },
      {
        "t": "onda",
        "cd": 15,
        "n": 6
      }
    ],
    "loot": "comum",
    "grupo": 2,
    "altura": 1.4,
    "som": "mob.zombie.say"
  },
  {
    "id": "miko_corrompida",
    "nome": "Miko Corrompida",
    "andar": 5,
    "papel": "elite",
    "vida": 240,
    "dano": 11,
    "vel": 0.26,
    "xp": 40,
    "caudas": 10,
    "hab": [
      {
        "t": "raio",
        "cd": 5
      },
      {
        "t": "convocar",
        "cd": 22,
        "id": "fogo_fatuo",
        "n": 3
      },
      {
        "t": "cura",
        "cd": 18
      },
      {
        "t": "salva",
        "cd": 14
      }
    ],
    "loot": "elite",
    "grupo": 1,
    "altura": 2.5,
    "som": "mob.zombie.say"
  },
  {
    "id": "nove_caudas",
    "nome": "Nove Caudas",
    "andar": 5,
    "papel": "boss",
    "vida": 2200,
    "dano": 14,
    "vel": 0.3,
    "xp": 600,
    "caudas": 250,
    "hab": [
      {
        "t": "investida",
        "cd": 8
      },
      {
        "t": "onda",
        "cd": 12,
        "n": 9
      },
      {
        "t": "salva",
        "cd": 10
      },
      {
        "t": "meteoro",
        "cd": 14,
        "n": 4
      },
      {
        "t": "convocar",
        "cd": 24,
        "id": "kitsune_espirito",
        "n": 3
      },
      {
        "t": "teleporte",
        "cd": 15
      },
      {
        "t": "anel",
        "cd": 13
      },
      {
        "t": "uivo",
        "cd": 28
      }
    ],
    "loot": "boss",
    "grupo": 1,
    "altura": 2.6,
    "som": "mob.zombie.say"
  }
]);
