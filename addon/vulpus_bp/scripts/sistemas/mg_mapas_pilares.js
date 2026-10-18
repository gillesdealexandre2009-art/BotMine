// @ts-check
// Mapas do Pillars of Fortune: 12 pilares 1x1 em círculo sobre o vazio, com um espigão decorado no centro. Três temas, sorteados a
// cada partida; o raio do círculo e o giro mudam toda vez.
import * as tp from "../textos/mg_pilares.js";
import { ARENA } from "./mg_arena.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Ponto */
/**
 * @typedef {object} TemaPilar
 * @property {string} id
 * @property {string} coluna  o corpo do pilar
 * @property {string} faixa  faixa decorativa a cada 6 blocos
 * @property {string} topo  bloco onde a pessoa pisa
 * @property {string} pe  base alargada
 * @property {string} luz  luz sobre a base
 * @property {string} centro  espigão central
 */

/** Altura do topo dos pilares (a pessoa pisa em TOPO + 1) e da base. O vazio mata abaixo de ARENA.vazio (80). */
export const TOPO = 128;
export const BASE = 84;
export const VAGAS_PILARES = 12;

/** @type {Record<string, TemaPilar>} */
export const TEMAS_PILARES = {
  vazio: { id: "vazio", coluna: "minecraft:blackstone", faixa: "minecraft:polished_blackstone_bricks", topo: "minecraft:crying_obsidian", pe: "minecraft:gilded_blackstone", luz: "minecraft:soul_lantern", centro: "minecraft:deepslate_bricks" },
  fim: { id: "fim", coluna: "minecraft:end_bricks", faixa: "minecraft:purpur_pillar", topo: "minecraft:purpur_block", pe: "minecraft:end_stone", luz: "minecraft:end_rod", centro: "minecraft:purpur_pillar" },
  mundo: { id: "mundo", coluna: "minecraft:stone", faixa: "minecraft:mossy_stone_bricks", topo: "minecraft:grass_block", pe: "minecraft:mossy_cobblestone", luz: "minecraft:lantern", centro: "minecraft:mossy_cobblestone" },
};

export const MAPAS_PILARES = Object.freeze(Object.values(TEMAS_PILARES).map((t) => ({ id: t.id, nome: tp.PF_MAPAS[t.id] ?? t.id })));

/** Um pilar: coluna, faixas, topo e pé com luzes. @param {Pincel} p @param {TemaPilar} t @param {number} cx @param {number} cz */
function pilar(p, t, cx, cz) {
  p.fill(cx, BASE, cz, cx, TOPO - 1, cz, t.coluna);
  for (let y = BASE + 5; y < TOPO; y += 6) p.set(cx, y, cz, t.faixa);
  p.set(cx, TOPO, cz, t.topo);
  p.fill(cx - 1, BASE, cz - 1, cx + 1, BASE, cz + 1, t.pe);
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.set(cx + dx, BASE + 1, cz + dz, t.luz);
}

/** O espigão central: coluna, plataforma de 3x3 com luzes e lanternas penduradas em correntes. @param {Pincel} p @param {TemaPilar} t */
function espigao(p, t) {
  const { x, z } = ARENA;
  const alto = TOPO - 14;
  p.fill(x, BASE, z, x, alto, z, t.centro);
  p.fill(x - 1, alto, z - 1, x + 1, alto, z + 1, t.faixa);
  p.set(x, alto + 1, z, "minecraft:end_rod");
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    p.set(x + dx, alto - 1, z + dz, "minecraft:iron_chain");
    p.set(x + dx, alto - 2, z + dz, "minecraft:lantern", { hanging: true });
  }
}

/**
 * Constrói um mapa do Pillars of Fortune.
 * @param {Pincel} p
 * @param {string} mapaId
 * @param {() => number} rng
 * @returns {Generator<any, { spawns: Ponto[], vazio: number, nome: string, raio: number, fundo: number, topo: number }>}
 */
export function* construirPilares(p, mapaId, rng) {
  const t = TEMAS_PILARES[mapaId] ?? TEMAS_PILARES.vazio;
  const raio = 16 + Math.round(rng() * 6);
  const giro = rng() * Math.PI * 2;
  /** @type {Ponto[]} */
  const spawns = [];
  for (let k = 0; k < VAGAS_PILARES; k++) {
    const a = giro + (k * Math.PI * 2) / VAGAS_PILARES;
    const cx = ARENA.x + Math.round(Math.cos(a) * raio), cz = ARENA.z + Math.round(Math.sin(a) * raio);
    pilar(p, t, cx, cz);
    spawns.push({ x: cx + 0.5, y: TOPO + 1, z: cz + 0.5 });
    if (k % 3 === 2) yield;
  }
  espigao(p, t);
  yield;
  return { spawns, vazio: ARENA.vazio, nome: tp.PF_MAPAS[t.id] ?? t.id, raio, fundo: BASE, topo: TOPO };
}
