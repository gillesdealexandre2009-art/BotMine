// @ts-check
// Mapas do Bedwars: 4 ilhas de time (norte, leste, sul e oeste) separadas por vazio (sem pontes prontas: cada um constrói o seu caminho), 4 ilhas de diamante entre elas e
// a ilha central da esmeralda. Três temas (pradaria, cidadela e deserto), sorteados a cada partida, com pequenas variações. Cada
// ilha de time tem a cama, um gerador de ferro e ouro, uma bancada de loja e um canto livre para a pessoa nascer.
import { ARENA } from "./mg_arena.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Ponto */
/**
 * @typedef {object} TemaBed
 * @property {string} id
 * @property {string} nome
 * @property {string} topo
 * @property {string} sub
 * @property {string[]} rocha
 * @property {string} ponte
 * @property {string} pilar
 * @property {string} topoPilar
 * @property {string} deco
 */

/** @type {Record<string, TemaBed>} */
export const TEMAS_BED = {
  pradaria: { id: "pradaria", nome: "Pradaria", topo: "minecraft:grass_block", sub: "minecraft:dirt", rocha: ["minecraft:stone", "minecraft:cobblestone"], ponte: "minecraft:oak_planks", pilar: "minecraft:oak_log", topoPilar: "minecraft:oak_leaves", deco: "minecraft:poppy" },
  cidadela: { id: "cidadela", nome: "Cidadela", topo: "minecraft:stone_bricks", sub: "minecraft:cobblestone", rocha: ["minecraft:stone", "minecraft:andesite"], ponte: "minecraft:stone_bricks", pilar: "minecraft:stone_brick_wall", topoPilar: "minecraft:lantern", deco: "minecraft:mossy_stone_bricks" },
  deserto: { id: "deserto", nome: "Deserto", topo: "minecraft:sand", sub: "minecraft:sandstone", rocha: ["minecraft:sandstone", "minecraft:cut_sandstone"], ponte: "minecraft:cut_sandstone", pilar: "minecraft:sandstone_wall", topoPilar: "minecraft:lantern", deco: "minecraft:dead_bush" },
};

export const MAPAS_BEDWARS = Object.freeze(Object.values(TEMAS_BED).map((t) => ({ id: t.id, nome: t.nome })));

/** Os 4 times. */
export const TIMES = Object.freeze([
  { id: "vermelho", nome: "Vermelho", cor: "§c", la: "minecraft:red_wool", concreto: "minecraft:red_concrete" },
  { id: "azul", nome: "Azul", cor: "§9", la: "minecraft:blue_wool", concreto: "minecraft:blue_concrete" },
  { id: "verde", nome: "Verde", cor: "§a", la: "minecraft:lime_wool", concreto: "minecraft:lime_concrete" },
  { id: "amarelo", nome: "Amarelo", cor: "§e", la: "minecraft:yellow_wool", concreto: "minecraft:yellow_concrete" },
]);

/** @param {() => number} rng @param {number} a @param {number} b */
const entre = (rng, a, b) => a + rng() * (b - a);

/**
 * Ilha redonda com cone de rocha por baixo.
 * @param {Pincel} p
 * @param {TemaBed} t
 * @param {number} cx
 * @param {number} cz
 * @param {number} raio
 * @param {number} fundo
 * @param {() => number} rng
 * @param {string} [borda]  bloco do anel de fora (cor do time)
 */
function ilha(p, t, cx, cz, raio, fundo, rng, borda) {
  const y = ARENA.y;
  const r = Math.ceil(raio) + 1;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dz) + (rng() - 0.5) * 0.7;
      if (d > raio) continue;
      p.set(cx + dx, y, cz + dz, borda && d > raio - 1.2 ? borda : t.topo);
      p.set(cx + dx, y - 1, cz + dz, t.sub);
      const prof = Math.floor(fundo * (1 - d / raio)) + 1;
      for (let k = 0; k < prof; k++) p.set(cx + dx, y - 2 - k, cz + dz, t.rocha[Math.floor(rng() * t.rocha.length)]);
    }
  }
}

/** Pilar de canto com lanterna. @param {Pincel} p @param {TemaBed} t @param {number} x @param {number} z */
function pilar(p, t, x, z) {
  const y = ARENA.y;
  for (let k = 1; k <= 4; k++) p.set(x, y + k, z, t.pilar);
  p.set(x, y + 5, z, t.topoPilar);
}

/**
 * Constrói o mapa. `equipes[i]` fica com a ilha do ângulo i*90°.
 * @param {Pincel} p
 * @param {string} mapaId
 * @param {() => number} rng
 * @returns {Generator<any, { nome: string, vazio: number, centro: Ponto, equipes: { id: string, nome: string, cor: string, la: string, base: Ponto, spawns: Ponto[], cama: { pe: Ponto, cabeca: Ponto, direcao: number }, gerador: Ponto, loja: Ponto }[], diamantes: Ponto[], esmeraldas: Ponto[] }>}
 */
export function* construirBedwars(p, mapaId, rng) {
  const t = TEMAS_BED[mapaId] ?? TEMAS_BED.pradaria;
  const y = ARENA.y;
  const raioBase = Math.round(entre(rng, 36, 40));
  const centro = { x: ARENA.x, y: y + 1, z: ARENA.z };
  /** @type {Ponto[]} */
  const diamantes = [];
  // centro: a ilha da esmeralda
  ilha(p, t, ARENA.x, ARENA.z, 8, 7, rng);
  p.fill(ARENA.x - 1, y + 1, ARENA.z - 1, ARENA.x + 1, y + 1, ARENA.z + 1, "minecraft:emerald_block");
  p.set(ARENA.x, y + 2, ARENA.z, "minecraft:beacon");
  for (const [dx, dz] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) pilar(p, t, ARENA.x + dx, ARENA.z + dz);
  yield;
  /** @type {any[]} */
  const equipes = [];
  for (let i = 0; i < 4; i++) {
    const tm = TIMES[i];
    const ang = (i * Math.PI) / 2;
    const dx = Math.round(Math.cos(ang)), dz = Math.round(Math.sin(ang));
    const cx = ARENA.x + dx * raioBase, cz = ARENA.z + dz * raioBase;
    ilha(p, t, cx, cz, 7.2, 7, rng, tm.la);
    // o gerador: pedestal de ferro com o ponto de queda dos itens por cima
    p.set(cx, y + 1, cz, "minecraft:iron_block");
    p.set(cx, y + 2, cz, "minecraft:air");
    // a cama (2 blocos) no lado do centro, orientada ao longo da ponte
    const bx = cx - dx * 3, bz = cz - dz * 3;
    // direção do bloco da cama: 0 = +z, 1 = -x, 2 = -z, 3 = +x (a cabeça fica para esse lado)
    const direcao = dx !== 0 ? (dx > 0 ? 1 : 3) : dz > 0 ? 2 : 0;
    const vetor = [[0, 1], [-1, 0], [0, -1], [1, 0]][direcao];
    const pe = { x: bx, y: y + 1, z: bz };
    const cabeca = { x: bx + vetor[0], y: y + 1, z: bz + vetor[1] };
    colocarCama(p, { pe, cabeca, direcao });
    // a loja: uma bancada (mesa de trabalho) ao lado do gerador
    const tx = -dz, tz = dx;
    const loja = { x: cx + tx * 3, y: y + 1, z: cz + tz * 3 };
    p.set(loja.x, loja.y, loja.z, "minecraft:crafting_table");
    p.set(loja.x, loja.y + 1, loja.z, "minecraft:lantern");
    // pilares nos cantos (sem ponte: o caminho até o meio é feito com blocos)
    for (const [ox, oz] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) pilar(p, t, cx + ox, cz + oz);
    // pontos de nascimento: um de cada lado do gerador
    const spawns = [{ x: cx + 0.5 - tx * 2, y: y + 1, z: cz + 0.5 - tz * 2 }, { x: cx + 0.5 + dx * 2, y: y + 1, z: cz + 0.5 + dz * 2 }];
    equipes.push({
      id: tm.id, nome: tm.nome, cor: tm.cor, la: tm.la,
      base: { x: cx, y: y + 1, z: cz }, spawns, cama: { pe, cabeca, direcao }, gerador: { x: cx + 0.5, y: y + 2.2, z: cz + 0.5 }, loja,
    });
    yield;
  }
  // ilhas de diamante entre as bases
  for (let k = 0; k < 4; k++) {
    const ang = (k * Math.PI) / 2 + Math.PI / 4;
    const r = Math.round(raioBase * 0.62);
    const cx = ARENA.x + Math.round(Math.cos(ang) * r), cz = ARENA.z + Math.round(Math.sin(ang) * r);
    ilha(p, t, cx, cz, 3.6, 4, rng);
    p.set(cx, y + 1, cz, "minecraft:diamond_block");
    diamantes.push({ x: cx + 0.5, y: y + 2.2, z: cz + 0.5 });
    yield;
  }
  return { nome: t.nome, vazio: ARENA.vazio, centro, equipes, diamantes, esmeraldas: [{ x: ARENA.x + 0.5, y: y + 3.2, z: ARENA.z + 0.5 }] };
}

/**
 * Coloca a cama de um time (os dois blocos).
 * @param {Pincel} p
 * @param {{ pe: Ponto, cabeca: Ponto, direcao: number }} c
 */
export function colocarCama(p, c) {
  p.set(c.pe.x, c.pe.y, c.pe.z, "minecraft:bed", { direction: c.direcao, head_piece_bit: false });
  p.set(c.cabeca.x, c.cabeca.y, c.cabeca.z, "minecraft:bed", { direction: c.direcao, head_piece_bit: true });
}
