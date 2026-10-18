// @ts-check
// Ferramentas de decoração dos andares: tudo que as peças de cada tema usam (colunas, discos, lustres, velas, tapetes, baús,
// estalactites, arcos de portal, altar). Cada função só coloca blocos dentro de células de sala (nunca fura corredor nem parede).
import { C } from "./masm_grade.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {Record<string, string | number | boolean>} Estados */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */

/**
 * @typedef {object} Contexto
 * @property {Pincel} p
 * @property {() => number} rng
 * @property {(gx: number) => number} wx
 * @property {(gz: number) => number} wz
 * @property {(k: number) => number} wy
 * @property {(gx: number, k: number, gz: number, id: string, est?: Estados) => void} set  coloca e marca a célula como ocupada (não nasce inimigo ali)
 * @property {(gx: number, k: number, gz: number, id: string, est?: Estados) => void} bruto  coloca sem marcar
 * @property {(gx1: number, k1: number, gz1: number, gx2: number, k2: number, gz2: number, id: string) => void} fill
 * @property {(gx: number, k: number, gz: number) => string | undefined} bloco
 * @property {(gx: number, gz: number) => number} cel
 * @property {(gx: number, gz: number) => boolean} aberto
 * @property {(gx: number, gz: number) => number} salaDe
 * @property {(gx: number, gz: number) => number} dwDe
 * @property {(gx: number, gz: number) => number} altDe
 * @property {(gx: number, gz: number) => number} tetoK
 * @property {(i: number) => import("./obras_masmorra_pal.js").Paleta} pal  paleta pelo índice (0 base, 1 boss, 2 tesouro, 3 corredor)
 * @property {(gx: number, gz: number) => import("./obras_masmorra_pal.js").Paleta} palDe  paleta da célula
 * @property {(a: number, b: number, c: number) => number} hash
 * @property {string} CORRENTE
 * @property {(dx: number, dz: number) => number} dirEscada
 * @property {number} N
 * @property {number} yPiso
 * @property {(gx: number, k: number, gz: number, dir: string, papel: string) => void} bau  baú registrado para o loot por pessoa
 * @property {(zona: { gx: number, gz: number, w: number, d: number }, nome: string) => void} portal  registra uma zona de portal
 * @property {Record<string, any>} meta  dados que o tempo de execução precisa (altar, portais, arena do boss)
 */

export const AR = "minecraft:air";

/** @param {Contexto} c @param {number} gx @param {number} gz */
export const livre = (c, gx, gz) => c.cel(gx, gz) === C.SALA;

/** Pilar de k=0 até o teto, com capitel. @param {Contexto} c @param {number} gx @param {number} gz @param {string} id @param {string} topo */
export function coluna(c, gx, gz, id, topo) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  c.fill(gx, 0, gz, gx, tk - 2, gz, id);
  c.set(gx, tk - 1, gz, topo);
}

/** Disco no nível k. @param {Contexto} c @param {number} cx @param {number} cz @param {number} r @param {number} k @param {string} id */
export function disco(c, cx, cz, r, k, id) {
  for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (Math.hypot(dx, dz) <= r + 0.01 && livre(c, cx + dx, cz + dz)) c.bruto(cx + dx, k, cz + dz, id);
}

/** Anel no nível k. @param {Contexto} c @param {number} cx @param {number} cz @param {number} r1 @param {number} r2 @param {number} k @param {string} id */
export function anel(c, cx, cz, r1, r2, k, id) {
  for (let dz = -Math.ceil(r2); dz <= Math.ceil(r2); dz++) {
    for (let dx = -Math.ceil(r2); dx <= Math.ceil(r2); dx++) {
      const d = Math.hypot(dx, dz);
      if (d >= r1 && d <= r2 && livre(c, cx + dx, cz + dz)) c.bruto(cx + dx, k, cz + dz, id);
    }
  }
}

/** Lustre: corrente do teto e lanternas em volta. @param {Contexto} c @param {number} gx @param {number} gz @param {number} baixo @param {string} luz @param {number} [raio] */
export function lustre(c, gx, gz, baixo, luz, raio = 0) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  if (tk - 1 > baixo) c.fill(gx, baixo + 1, gz, gx, tk - 1, gz, c.CORRENTE);
  c.bruto(gx, baixo, gz, luz, { hanging: true });
  if (raio > 0) {
    for (const [dx, dz] of [[raio, 0], [-raio, 0], [0, raio], [0, -raio]]) {
      if (!livre(c, gx + dx, gz + dz)) continue;
      const t2 = c.tetoK(gx + dx, gz + dz);
      c.bruto(gx + dx, t2 - 1, gz + dz, c.CORRENTE);
      c.bruto(gx + dx, t2 - 2, gz + dz, luz, { hanging: true });
    }
  }
}

/** Vela(s) no chão. @param {Contexto} c @param {number} gx @param {number} gz @param {number} n @param {string} id */
export function vela(c, gx, gz, n, id) {
  if (livre(c, gx, gz)) c.set(gx, 0, gz, id, { candles: Math.max(0, Math.min(3, n - 1)), lit: true });
}

/** Tapete numa região. @param {Contexto} c @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 @param {string} id */
export function tapete(c, x1, z1, x2, z2, id) {
  for (let gz = z1; gz <= z2; gz++) for (let gx = x1; gx <= x2; gx++) if (livre(c, gx, gz)) c.bruto(gx, 0, gz, id);
}

/** Escada no sentido (ax, az). @param {Contexto} c @param {number} gx @param {number} k @param {number} gz @param {string} id @param {number} ax @param {number} az @param {boolean} [invertida] */
export function escada(c, gx, k, gz, id, ax, az, invertida = false) {
  if (livre(c, gx, gz)) c.set(gx, k, gz, id, { weirdo_direction: c.dirEscada(ax, az), upside_down_bit: invertida });
}

/** Barril em pé. @param {Contexto} c @param {number} gx @param {number} gz @param {number} [k] */
export function barril(c, gx, gz, k = 0) {
  if (livre(c, gx, gz)) c.set(gx, k, gz, "minecraft:barrel", { facing_direction: 1 });
}

/** Teia no ar. @param {Contexto} c @param {number} gx @param {number} k @param {number} gz */
export function teia(c, gx, k, gz) {
  if (livre(c, gx, gz)) c.bruto(gx, k, gz, "minecraft:web");
}

/** Estalactite pendurada do teto. @param {Contexto} c @param {number} gx @param {number} gz */
export function estalactite(c, gx, gz) {
  if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, "minecraft:pointed_dripstone", { dripstone_thickness: "tip", hanging: true });
}

/** Posição aleatória dentro da sala que seja célula de sala. @param {Contexto} c @param {Sala} s @param {number} [margem] @returns {[number, number]} */
export function sorteio(c, s, margem = 1) {
  for (let t = 0; t < 30; t++) {
    const gx = s.x + margem + Math.floor(c.rng() * Math.max(1, s.w - 2 * margem)), gz = s.z + margem + Math.floor(c.rng() * Math.max(1, s.h - 2 * margem));
    if (c.salaDe(gx, gz) === s.id) return [gx, gz];
  }
  return [s.x + (s.w >> 1), s.z + (s.h >> 1)];
}

/** Centro da sala. @param {Sala} s */
export const centroDe = (s) => ({ x: s.x + (s.w >> 1), z: s.z + (s.h >> 1) });

/** Sarcófago 3x2 (ou 2x3) com tampa e caveira. @param {Contexto} c @param {number} gx @param {number} gz @param {boolean} eixoX @param {string} base @param {string} laje */
export function sarcofago(c, gx, gz, eixoX, base, laje) {
  const w = eixoX ? 3 : 2, h = eixoX ? 2 : 3;
  for (let dz = 0; dz < h; dz++) {
    for (let dx = 0; dx < w; dx++) {
      if (!livre(c, gx + dx, gz + dz)) continue;
      c.set(gx + dx, 0, gz + dz, base);
      c.set(gx + dx, 1, gz + dz, laje, { "minecraft:vertical_half": "bottom" });
    }
  }
  if (livre(c, gx, gz)) c.set(gx, 2, gz, "minecraft:skeleton_skull");
}

/**
 * Arco de portal solto na sala: dois pilares e uma verga, com a abertura de 3 células ao longo de z (eixo "z") ou de x.
 * Devolve a zona (em células da grade) que teleporta.
 * @param {Contexto} c @param {number} gx @param {number} gz  centro da abertura
 * @param {"x" | "z"} eixo  direção ao longo da qual as 3 células da abertura se alinham
 * @param {{ pilar: string, topo: string, brilho: string, luz: string }} mat
 */
export function arcoDePortal(c, gx, gz, eixo, mat) {
  const dx = eixo === "x" ? 1 : 0, dz = eixo === "z" ? 1 : 0;
  for (const l of [-2, 2]) {
    const px = gx + dx * l, pz = gz + dz * l;
    c.fill(px, 0, pz, px, 4, pz, mat.pilar);
    c.set(px, 5, pz, mat.topo);
  }
  for (let l = -2; l <= 2; l++) c.set(gx + dx * l, 5, gz + dz * l, mat.topo);
  for (let l = -1; l <= 1; l++) {
    const px = gx + dx * l, pz = gz + dz * l;
    c.fill(px, 0, pz, px, 4, pz, AR);
    c.set(px, -1, pz, mat.brilho);
    c.set(px, 4, pz, mat.pilar);
  }
  c.bruto(gx, 3, gz, mat.luz, { hanging: true });
  return { gx: gx - dx, gz: gz - dz, w: dx ? 3 : 1, d: dz ? 3 : 1 };
}
