// @ts-check
// Efeitos do teleporte: caudas de fogo de raposa na espera, fade de câmera, estouro na saída e na
// chegada, com tema por destino. Nada aqui pode quebrar o teleporte: toda chamada ao jogo é protegida.
import {
  LocationInUnloadedChunkError,
  LocationOutOfWorldBoundariesError,
  MolangVariableMap,
  system,
} from "@minecraft/server";
import * as textos from "../textos/geral.js";
import { mostrarTitulo } from "./tela.js";
import { registrarErro, som } from "./util.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {import("@minecraft/server").RGB} RGB */

/**
 * Tema do efeito: kitsune (padrão), casa, spawn, voltar ou tpa.
 * @typedef {"kitsune" | "casa" | "spawn" | "voltar" | "tpa"} TemaTeleporte
 */

/**
 * Som com tom e volume: [id, tom, volume].
 * @typedef {[string, number, number]} Nota
 */

/**
 * @typedef {object} Tema
 * @property {RGB[]} cores  cores das caudas de fogo (a cauda 0 é sempre o fogo-fátuo)
 * @property {string} fatuo  partícula da cauda 0
 * @property {RGB} fade  cor da tela no instante do teleporte
 * @property {Nota[]} sons  sons da chegada
 * @property {string} subtitulo
 * @property {string} [titulo]  troca o título (senão é o nome do destino)
 * @property {(dim: Dimension, centro: Vector3) => void} floreio  enfeite do 2º pulso da chegada
 */

const P = Object.freeze({
  CHAMA: "minecraft:colored_flame_particle",
  FATUO: "minecraft:blue_flame_particle",
  ALMA_CHAMA: "minecraft:small_soul_fire_flame",
  ALMA: "minecraft:soul_particle",
  FAISCA: "minecraft:endrod",
  RAJADA: "minecraft:wind_explosion_emitter",
  FUMACA: "minecraft:basic_smoke_particle",
  FUMACA_BRANCA: "minecraft:white_smoke_particle",
  CORACAO: "minecraft:heart_particle",
  PETALA: "minecraft:cherry_leaves_particle",
  TOTEM: "minecraft:totem_particle",
  BRILHO: "minecraft:villager_happy",
});

const S = Object.freeze({
  CARGA: "respawn_anchor.charge",
  SINO: "note.chime",
  PORTAL: "mob.endermen.portal",
  SOPRO: "wind_charge.burst",
  APAGOU: "extinguish.candle",
  RAPOSA: "mob.fox.ambient",
  LAREIRA: "block.campfire.crackle",
  SINO_VILA: "block.bell.hit",
  FOGOS: "firework.twinkle",
  ALMA: "particle.soul_escape",
  ALLAY: "mob.allay.item_given",
});

const LARANJA = { red: 1, green: 0.5, blue: 0.08 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };
const ROSA = { red: 1, green: 0.45, blue: 0.55 };
const CINZA = { red: 0.62, green: 0.66, blue: 0.78 };

/** Raio das caudas em volta do jogador, em blocos. */
const RAIO_CAUDAS = 0.85;
/** Altura que as caudas sobem antes de recomeçar no chão. */
const ALTURA_CAUDAS = 2.1;
/** Ticks de uma volta de subida das caudas. */
const CICLO_SUBIDA = 24;
/** Giro das caudas por tick, em radianos. */
const GIRO_POR_TICK = 0.32;
const MAX_CAUDAS = 5;
/** Partículas por tick no servidor inteiro (somando todos os jogadores). */
const LIMITE_POR_TICK = 96;
/** Quem estiver até esta distância ouve o "puf" de quem sumiu. */
const RAIO_OUVIR = 16;
/** Fade de câmera: entrada (s) com espera, segurar e sair. */
export const TICKS_FADE = 4;
const FADE_ENTRADA = TICKS_FADE / 20;
const FADE_ENTRADA_RAPIDA = 0.05;
const FADE_SEGURA = 0.15;
const FADE_SAIDA = 0.6;
/** Ticks depois do teleporte em que saem os 3 pulsos da chegada. */
const PULSOS_CHEGADA = [4, 9, 15];
const TEMPOS_TITULO = { entrada: 4, fica: 30, saida: 12 };

/** @type {Map<string, MolangVariableMap>} cor → mapa (criado na primeira vez) */
const mapas = new Map();
/** Ids que já falharam uma vez (o log avisa só uma vez por id). */
const falhou = new Set();
let tickOrcamento = -1;
let gastos = 0;

/**
 * Registra a falha de uma partícula, som ou câmera só na primeira vez.
 * @param {string} id
 * @param {unknown} e
 */
function avisarUmaVez(id, e) {
  if (falhou.has(id)) return;
  falhou.add(id);
  registrarErro(`Efeito ${id}`, e);
}

/**
 * Roda um efeito sem deixar erro escapar: o teleporte nunca depende dele.
 * @param {string} nome  aparece no log (uma vez)
 * @param {() => void} fn
 */
function blindado(nome, fn) {
  try {
    fn();
  } catch (e) {
    avisarUmaVez(nome, e);
  }
}

/**
 * Mapa Molang com variable.color (as chamas coloridas) e variable.direction para cima (almas).
 * @param {RGB} cor
 */
function mapaCor(cor) {
  const chave = `${cor.red},${cor.green},${cor.blue}`;
  let mapa = mapas.get(chave);
  if (!mapa) {
    mapa = new MolangVariableMap();
    mapa.setColorRGB("variable.color", cor);
    mapa.setVector3("variable.direction", { x: 0, y: 0.08, z: 0 });
    mapas.set(chave, mapa);
  }
  return mapa;
}

/**
 * Uma partícula, dentro do limite por tick. false = não saiu (limite, chunk não carregado ou id
 * inexistente): quem chama para o laço.
 * @param {Dimension} dim
 * @param {string} id
 * @param {Vector3} pos
 * @param {RGB} [cor]
 * @returns {boolean}
 */
function emitir(dim, id, pos, cor) {
  if (system.currentTick !== tickOrcamento) {
    tickOrcamento = system.currentTick;
    gastos = 0;
  }
  if (gastos >= LIMITE_POR_TICK) return false;
  gastos++;
  try {
    dim.spawnParticle(id, pos, cor ? mapaCor(cor) : undefined);
    return true;
  } catch (e) {
    // Chunk ainda não carregado (comum na chegada) ou fora do mundo não é erro; o resto é aviso.
    const normal = e instanceof LocationInUnloadedChunkError || e instanceof LocationOutOfWorldBoundariesError;
    if (!normal) avisarUmaVez(id, e);
    return false;
  }
}

/**
 * Anel de n partículas na altura y (relativa ao centro).
 * @param {Dimension} dim
 * @param {Vector3} c
 * @param {{ raio: number, n: number, y?: number, giro?: number }} forma
 * @param {string} id
 * @param {RGB[]} [cores]  alterna as cores pelo anel
 * @returns {boolean}
 */
function anel(dim, c, forma, id, cores) {
  const passo = (Math.PI * 2) / forma.n;
  for (let i = 0; i < forma.n; i++) {
    const a = (forma.giro ?? 0) + i * passo;
    const pos = { x: c.x + Math.cos(a) * forma.raio, y: c.y + (forma.y ?? 0), z: c.z + Math.sin(a) * forma.raio };
    if (!emitir(dim, id, pos, cores?.[i % cores.length])) return false;
  }
  return true;
}

/**
 * n partículas espalhadas numa caixa em volta de c (meia largura `largura`, altura de y0 a y0+alto).
 * @param {Dimension} dim
 * @param {Vector3} c
 * @param {{ n: number, largura: number, y0: number, alto: number }} caixa
 * @param {string} id
 * @param {RGB} [cor]
 */
function nuvem(dim, c, caixa, id, cor) {
  for (let i = 0; i < caixa.n; i++) {
    const pos = {
      x: c.x + (Math.random() * 2 - 1) * caixa.largura,
      y: c.y + caixa.y0 + Math.random() * caixa.alto,
      z: c.z + (Math.random() * 2 - 1) * caixa.largura,
    };
    if (!emitir(dim, id, pos, cor)) return false;
  }
  return true;
}

/**
 * Toca uma lista de notas para o jogador (respeita o ajuste de sons).
 * @param {Player | undefined} player
 * @param {Nota[]} notas
 */
function tocar(player, notas) {
  for (const [id, pitch, volume] of notas) som(player, id, { pitch, volume });
}

/** @type {Record<TemaTeleporte, Tema>} */
const TEMAS = {
  kitsune: {
    cores: [LARANJA, DOURADO],
    fatuo: P.FATUO,
    fade: { red: 0.3, green: 0.11, blue: 0.02 },
    sons: [[S.PORTAL, 0.9, 0.7], [S.RAPOSA, 1.3, 0.8]],
    subtitulo: textos.TP_SUB_KITSUNE,
    floreio: (dim, c) => {
      nuvem(dim, c, { n: 6, largura: 0.7, y0: 0.8, alto: 1.2 }, P.FAISCA);
    },
  },
  casa: {
    cores: [LARANJA, ROSA],
    fatuo: P.FATUO,
    fade: { red: 0.32, green: 0.12, blue: 0.06 },
    sons: [[S.LAREIRA, 1, 1], [S.RAPOSA, 1.4, 0.8]],
    subtitulo: textos.TP_SUB_CASA,
    floreio: (dim, c) => {
      if (anel(dim, c, { raio: 0.7, n: 4, y: 2.2, giro: 0.4 }, P.CORACAO)) {
        nuvem(dim, c, { n: 8, largura: 1.4, y0: 2.4, alto: 0.8 }, P.PETALA);
      }
    },
  },
  spawn: {
    cores: [DOURADO, LARANJA],
    fatuo: P.FATUO,
    fade: { red: 0.55, green: 0.38, blue: 0.1 },
    sons: [[S.SINO_VILA, 1, 0.9], [S.FOGOS, 1.2, 0.7], [S.RAPOSA, 1.2, 0.8]],
    subtitulo: textos.TP_SUB_SPAWN,
    floreio: (dim, c) => {
      if (anel(dim, c, { raio: 2, n: 16, y: 0.1 }, P.CHAMA, [DOURADO, LARANJA])) {
        nuvem(dim, c, { n: 18, largura: 0.3, y0: 1, alto: 0.6 }, P.TOTEM);
      }
    },
  },
  voltar: {
    cores: [CINZA, CINZA],
    fatuo: P.ALMA_CHAMA,
    fade: { red: 0.08, green: 0.09, blue: 0.12 },
    sons: [[S.ALMA, 1, 1], [S.PORTAL, 0.7, 0.6]],
    titulo: textos.TP_TITULO_VOLTAR,
    subtitulo: textos.TP_SUB_VOLTAR,
    floreio: (dim, c) => {
      if (anel(dim, c, { raio: 1, n: 8, y: 0.2 }, P.ALMA_CHAMA)) {
        // A alma só sobe com variable.direction (vem no mapa de cor).
        nuvem(dim, c, { n: 5, largura: 0.8, y0: 0.4, alto: 1.4 }, P.ALMA, CINZA);
      }
    },
  },
  tpa: {
    cores: [LARANJA, DOURADO],
    fatuo: P.FATUO,
    fade: { red: 0.3, green: 0.11, blue: 0.02 },
    sons: [[S.ALLAY, 1.1, 0.9], [S.RAPOSA, 1.3, 0.8]],
    subtitulo: textos.TP_SUB_TPA,
    floreio: (dim, c) => {
      if (nuvem(dim, c, { n: 6, largura: 0.8, y0: 0.5, alto: 1.5 }, P.BRILHO)) {
        anel(dim, c, { raio: 0.5, n: 2, y: 2.2 }, P.CORACAO);
      }
    },
  },
};

/** @param {TemaTeleporte | undefined} tema */
const temaDe = (tema) => TEMAS[tema ?? "kitsune"] ?? TEMAS.kitsune;

/**
 * Começo da espera: o som de carga.
 * @param {Player} player
 */
export function inicioEspera(player) {
  blindado("inicioEspera", () => {
    tocar(player, [[S.CARGA, 1.4, 0.5]]);
  });
}

/**
 * A cada passo da espera: as caudas de fogo sobem em espiral em volta do jogador. Nasce uma
 * cauda nova a cada segundo (de 2 até MAX_CAUDAS).
 * @param {Player} player
 * @param {TemaTeleporte | undefined} tema
 * @param {number} decorridos  ticks desde o começo da espera
 */
export function passoEspera(player, tema, decorridos) {
  blindado("passoEspera", () => {
    const t = temaDe(tema);
    const dim = player.dimension;
    const c = player.location;
    const caudas = Math.min(MAX_CAUDAS, 2 + Math.floor(decorridos / 20));
    const altura = ((decorridos % CICLO_SUBIDA) / CICLO_SUBIDA) * ALTURA_CAUDAS;
    const base = decorridos * GIRO_POR_TICK;
    for (let i = 0; i < caudas; i++) {
      const a = base + (i * Math.PI * 2) / caudas;
      const pos = { x: c.x + Math.cos(a) * RAIO_CAUDAS, y: c.y + altura, z: c.z + Math.sin(a) * RAIO_CAUDAS };
      const ok = i === 0 ? emitir(dim, t.fatuo, pos) : emitir(dim, P.CHAMA, pos, t.cores[i % t.cores.length]);
      if (!ok) return;
    }
  });
}

/**
 * Virada de segundo na espera: selo de fogo no chão e um sino que sobe de tom.
 * @param {Player} player
 * @param {TemaTeleporte | undefined} tema
 * @param {number} segundo  0 no primeiro segundo, 1 no segundo...
 * @param {boolean} ultimo  é o último segundo (ganha faíscas)
 */
export function segundoEspera(player, tema, segundo, ultimo) {
  blindado("segundoEspera", () => {
    const t = temaDe(tema);
    tocar(player, [[S.SINO, Math.min(2, 0.8 + segundo * 0.2), 0.8]]);
    const dim = player.dimension;
    const c = player.location;
    if (!anel(dim, c, { raio: 1.15, n: 10, y: 0.05, giro: segundo * 0.3 }, P.CHAMA, t.cores)) return;
    if (ultimo) nuvem(dim, c, { n: 4, largura: 0.6, y0: 0.3, alto: 1.6 }, P.FAISCA);
  });
}

/**
 * Prévia na outra ponta (TPA): um portalzinho de fogo nos pés de quem recebe a visita.
 * @param {Player} parceiro
 * @param {number} decorridos
 */
export function previaParceiro(parceiro, decorridos) {
  blindado("previaParceiro", () => {
    const forma = { raio: 0.6, n: 4, y: 0.05, giro: decorridos * GIRO_POR_TICK };
    anel(parceiro.dimension, parceiro.location, forma, P.CHAMA, TEMAS.tpa.cores);
  });
}

/**
 * Pouco antes do teleporte: a tela pinta da cor do tema e o "vush". Sem espera, o fade entra quase
 * na hora.
 * @param {Player} player
 * @param {TemaTeleporte | undefined} tema
 * @param {boolean} rapido
 */
export function preparar(player, tema, rapido) {
  blindado("preparar", () => {
    const t = temaDe(tema);
    const entrada = rapido ? FADE_ENTRADA_RAPIDA : FADE_ENTRADA;
    tocar(player, [[S.SOPRO, 1.3, 0.6]]);
    player.camera.fade({
      fadeColor: t.fade,
      fadeTime: { fadeInTime: entrada, holdTime: FADE_SEGURA, fadeOutTime: FADE_SAIDA },
    });
  });
}

/**
 * Onde o jogador estava: rajada, anel de fogo e o "puf" para quem está perto.
 * @param {Player} player  quem sumiu (não ouve o próprio puf)
 * @param {Dimension} dim
 * @param {Vector3} c
 * @param {TemaTeleporte | undefined} tema
 */
export function saida(player, dim, c, tema) {
  blindado("saida", () => {
    const t = temaDe(tema);
    if (emitir(dim, P.RAJADA, { x: c.x, y: c.y + 1, z: c.z })) {
      if (anel(dim, c, { raio: 0.6, n: 12, y: 1 }, P.CHAMA, t.cores)) {
        nuvem(dim, c, { n: 4, largura: 0.5, y0: 0.5, alto: 1.5 }, P.FAISCA);
      }
    }
    try {
      for (const outro of dim.getPlayers({ location: c, maxDistance: RAIO_OUVIR })) {
        if (outro.id !== player.id) som(outro, S.PORTAL, { location: c, pitch: 1.2, volume: 0.8 });
      }
    } catch (e) {
      avisarUmaVez("getPlayers", e);
    }
  });
}

/**
 * Chegada em 3 pulsos (o chunk do destino pode demorar um pouco): anel e coluna de fogo com o
 * título, o enfeite do tema e faíscas. Quem recebe a visita (TPA) ouve a chegada.
 * @param {Player} player
 * @param {TemaTeleporte | undefined} tema
 * @param {{ nome?: string, parceiro?: Player }} [extra]
 */
export function chegada(player, tema, extra = {}) {
  blindado("chegada", () => {
    const t = temaDe(tema);
    /** @param {(dim: Dimension, c: Vector3) => void} fn */
    const pulso = (fn) => () => {
      try {
        if (player.isValid) fn(player.dimension, player.location);
      } catch (e) {
        registrarErro("Chegada do teleporte (efeito)", e);
      }
    };
    system.runTimeout(
      pulso((dim, c) => {
        tocar(player, t.sons);
        if (extra.parceiro?.isValid) tocar(extra.parceiro, [[S.ALLAY, 1.3, 0.8]]);
        mostrarTitulo(player, t.titulo ?? textos.TP_TITULO(extra.nome), { ...TEMPOS_TITULO, subtitulo: t.subtitulo });
        if (!anel(dim, c, { raio: 1.2, n: 14, y: 0.05 }, P.CHAMA, t.cores)) return;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.1;
          const pos = { x: c.x + Math.cos(a) * 0.35, y: c.y + i * 0.35, z: c.z + Math.sin(a) * 0.35 };
          if (!(i % 2 ? emitir(dim, P.CHAMA, pos, t.cores[0]) : emitir(dim, t.fatuo, pos))) return;
        }
      }),
      PULSOS_CHEGADA[0],
    );
    system.runTimeout(pulso((dim, c) => t.floreio(dim, c)), PULSOS_CHEGADA[1]);
    system.runTimeout(
      pulso((dim, c) => {
        nuvem(dim, c, { n: 5, largura: 0.6, y0: 1.6, alto: 0.6 }, P.FAISCA);
      }),
      PULSOS_CHEGADA[2],
    );
  });
}

/**
 * Espera cancelada: a chama apaga num puf de fumaça, com som de vela soprada.
 * @param {Player} player
 */
export function cancelado(player) {
  blindado("cancelado", () => {
    const dim = player.dimension;
    const c = player.location;
    if (emitir(dim, P.FUMACA_BRANCA, { x: c.x, y: c.y + 1, z: c.z })) {
      anel(dim, c, { raio: 0.7, n: 8, y: 0.6 }, P.FUMACA);
    }
    tocar(player, [[S.APAGOU, 0.8, 1]]);
  });
}
