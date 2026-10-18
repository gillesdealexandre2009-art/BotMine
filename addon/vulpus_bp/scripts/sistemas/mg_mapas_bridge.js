// @ts-check
// Mapas do The Bridge: duas ilhas-base nas pontas de uma ponte reta sobre o vazio (eixo X). Cada base tem um poço (gol) de 3x3 com
// moldura e paredes na cor do time e fundo de obsidiana, uma pista de nascimento (onde fica a gaiola), muros e pilares com luz.
// No meio da ponte há uma ilhota com um enfeite. Três temas, sorteados a cada partida.
import { ARENA } from "./mg_arena.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Ponto */
/**
 * @typedef {object} TemaBridge
 * @property {string} id
 * @property {string} nome
 * @property {string} topo
 * @property {string} sub
 * @property {string[]} rocha
 * @property {string} ponte
 * @property {string} faixa
 * @property {string} muro
 * @property {string} pilar
 * @property {string} luz
 * @property {string} deco
 */

/** @type {Record<string, TemaBridge>} */
export const TEMAS_BRIDGE = {
  classico: { id: "classico", nome: "Clássico", topo: "minecraft:smooth_quartz", sub: "minecraft:white_terracotta", rocha: ["minecraft:stone_bricks", "minecraft:andesite"], ponte: "minecraft:quartz_block", faixa: "minecraft:light_gray_terracotta", muro: "minecraft:quartz_bricks", pilar: "minecraft:quartz_pillar", luz: "minecraft:lantern", deco: "minecraft:gold_block" },
  neve: { id: "neve", nome: "Neve", topo: "minecraft:snow", sub: "minecraft:packed_ice", rocha: ["minecraft:packed_ice", "minecraft:blue_ice"], ponte: "minecraft:snow", faixa: "minecraft:light_blue_concrete", muro: "minecraft:packed_ice", pilar: "minecraft:blue_ice", luz: "minecraft:sea_lantern", deco: "minecraft:blue_ice" },
  nether: { id: "nether", nome: "Nether", topo: "minecraft:blackstone", sub: "minecraft:netherrack", rocha: ["minecraft:netherrack", "minecraft:basalt"], ponte: "minecraft:polished_blackstone_bricks", faixa: "minecraft:crimson_planks", muro: "minecraft:nether_brick", pilar: "minecraft:polished_basalt", luz: "minecraft:soul_lantern", deco: "minecraft:crying_obsidian" },
};

export const MAPAS_BRIDGE = Object.freeze(Object.values(TEMAS_BRIDGE).map((t) => ({ id: t.id, nome: t.nome })));

/** Os dois times: azul na ponta de oeste, vermelho na de leste. `rgb` tinge a armadura de couro (0 a 1). */
export const TIMES_BRIDGE = Object.freeze([
  { id: "azul", nome: "Azul", cor: "§9", terracota: "minecraft:blue_terracotta", concreto: "minecraft:blue_concrete", rgb: Object.freeze({ red: 0.15, green: 0.25, blue: 0.85 }) },
  { id: "vermelho", nome: "Vermelho", cor: "§c", terracota: "minecraft:red_terracotta", concreto: "minecraft:red_concrete", rgb: Object.freeze({ red: 0.85, green: 0.12, blue: 0.12 }) },
]);

/** Distância do centro da arena até o centro de cada base. */
export const DIST_BASE = 38;
/** Meia-largura (x) e meia-profundidade (z) da base. */
export const BASE_RX = 8;
export const BASE_RZ = 7;
/** Do centro da base até o centro do poço (para trás), e do centro até o nascimento (para a ponte). */
export const DIST_POCO = 5;
export const DIST_SPAWN = 3;
/** Meia-largura da ponte. */
export const PONTE_R = 2;
/** Limites de construção dos jogadores (a partir do centro da arena). */
export const LIMITE_X = DIST_BASE + BASE_RX + 1;
export const LIMITE_Z = BASE_RZ + 3;

/**
 * Uma base: ilha retangular com cone por baixo, borda na cor do time, poço, pista de nascimento, muros e pilares.
 * @param {Pincel} p
 * @param {TemaBridge} t
 * @param {typeof TIMES_BRIDGE[number]} tm
 * @param {number} cx
 * @param {number} dir  +1 se a ponte fica a leste da base, -1 se a oeste
 * @param {() => number} rng
 */
function base(p, t, tm, cx, dir, rng) {
  const y = ARENA.y, cz = ARENA.z;
  // ilha: 5 camadas cheias (o poço precisa de chão) e um cone de rocha por baixo
  for (let k = 0; k < 5; k++) p.fill(cx - BASE_RX, y - k, cz - BASE_RZ, cx + BASE_RX, y - k, cz + BASE_RZ, k === 0 ? t.topo : k === 1 ? t.sub : t.rocha[k % t.rocha.length]);
  for (let k = 5; k <= 8; k++) {
    const s = (k - 4) * 2;
    if (cx - BASE_RX + s > cx + BASE_RX - s) break;
    p.fill(cx - BASE_RX + s, y - k, cz - BASE_RZ + s, cx + BASE_RX - s, y - k, cz + BASE_RZ - s, t.rocha[k % t.rocha.length]);
  }
  // borda do time (fundo e laterais; a frente fica aberta para a ponte)
  const fundo = cx - dir * BASE_RX;
  p.fill(fundo, y, cz - BASE_RZ, fundo, y, cz + BASE_RZ, tm.terracota);
  p.fill(Math.min(fundo, cx + dir * (BASE_RX - 1)), y, cz - BASE_RZ, Math.max(fundo, cx + dir * (BASE_RX - 1)), y, cz - BASE_RZ, tm.terracota);
  p.fill(Math.min(fundo, cx + dir * (BASE_RX - 1)), y, cz + BASE_RZ, Math.max(fundo, cx + dir * (BASE_RX - 1)), y, cz + BASE_RZ, tm.terracota);
  // pista de nascimento: 3x3 na cor do time sob a gaiola
  const sx = cx + dir * DIST_SPAWN;
  p.fill(sx - 1, y, cz - 1, sx + 1, y, cz + 1, tm.terracota);
  // poço: moldura e paredes de concreto, buraco de 3 de fundo, fundo de obsidiana
  const wx = cx - dir * DIST_POCO;
  for (let k = 0; k <= 3; k++) p.fill(wx - 2, y - k, cz - 2, wx + 2, y - k, cz + 2, tm.concreto);
  p.fill(wx - 1, y - 2, cz - 1, wx + 1, y, cz + 1, "minecraft:air");
  p.fill(wx - 1, y - 3, cz - 1, wx + 1, y - 3, cz + 1, "minecraft:obsidian");
  for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    for (let h = 1; h <= 3; h++) p.set(wx + ox, y + h, cz + oz, tm.concreto);
    p.set(wx + ox, y + 4, cz + oz, t.luz);
  }
  // muro do fundo (2 de altura) e muretas baixas nas laterais
  p.fill(fundo, y + 1, cz - BASE_RZ, fundo, y + 2, cz + BASE_RZ, t.muro);
  for (const lado of [-1, 1]) {
    const b = cx + dir * (BASE_RX - 3);
    p.fill(Math.min(fundo, b), y + 1, cz + lado * BASE_RZ, Math.max(fundo, b), y + 1, cz + lado * BASE_RZ, t.muro);
  }
  // pilares da frente, com luz (a altura varia um pouco)
  for (const lado of [-1, 1]) {
    const px = cx + dir * (BASE_RX - 1), pz = cz + lado * (BASE_RZ - 1);
    const alto = 4 + Math.floor(rng() * 2);
    for (let h = 1; h <= alto; h++) p.set(px, y + h, pz, t.pilar);
    p.set(px, y + alto + 1, pz, t.luz);
  }
}

/**
 * Constrói o mapa. `equipes[0]` (azul) fica a oeste, `equipes[1]` (vermelho) a leste.
 * @param {Pincel} p
 * @param {string} mapaId
 * @param {() => number} rng
 * @returns {Generator<any, { nome: string, vazio: number, centro: Ponto, equipes: { id: string, nome: string, cor: string, terracota: string, rgb: { red: number, green: number, blue: number }, dir: number, base: Ponto, spawn: Ponto, poco: Ponto }[] }>}
 */
export function* construirBridge(p, mapaId, rng) {
  const t = TEMAS_BRIDGE[mapaId] ?? TEMAS_BRIDGE.classico;
  const y = ARENA.y, cz = ARENA.z;
  /** @type {any[]} */
  const equipes = [];
  for (let i = 0; i < 2; i++) {
    const tm = TIMES_BRIDGE[i];
    const dir = i === 0 ? 1 : -1;
    const cx = ARENA.x - dir * DIST_BASE;
    base(p, t, tm, cx, dir, rng);
    equipes.push({
      id: tm.id, nome: tm.nome, cor: tm.cor, terracota: tm.terracota, rgb: tm.rgb, dir,
      base: { x: cx, y: y + 1, z: cz },
      spawn: { x: cx + dir * DIST_SPAWN + 0.5, y: y + 1, z: cz + 0.5 },
      poco: { x: cx - dir * DIST_POCO, y, z: cz },
    });
    yield;
  }
  // a ponte: duas camadas, faixas atravessadas de tempos em tempos e postes de luz nas bordas
  const x0 = ARENA.x - DIST_BASE + BASE_RX + 1, x1 = ARENA.x + DIST_BASE - BASE_RX - 1;
  p.fill(x0, y, cz - PONTE_R, x1, y, cz + PONTE_R, t.ponte);
  p.fill(x0, y - 1, cz - PONTE_R, x1, y - 1, cz + PONTE_R, t.sub);
  for (let x = x0; x <= x1; x++) if ((x - ARENA.x) % 6 === 0) p.fill(x, y, cz - PONTE_R, x, y, cz + PONTE_R, t.faixa);
  yield;
  for (const d of [8 + Math.floor(rng() * 4), 20 + Math.floor(rng() * 4)]) {
    for (const sinal of [-1, 1]) {
      for (const lado of [-1, 1]) {
        const x = ARENA.x + sinal * d, z = cz + lado * (PONTE_R + 1);
        p.set(x, y, z, t.ponte);
        p.set(x, y + 1, z, t.pilar);
        p.set(x, y + 2, z, t.luz);
      }
    }
  }
  // o meio: ilhota redonda com um pedestal, um pilar e uma luz
  for (let dz = -5; dz <= 5; dz++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 5.5) continue;
      p.set(ARENA.x + dx, y, cz + dz, d < 3.5 ? t.topo : t.faixa);
      p.set(ARENA.x + dx, y - 1, cz + dz, t.sub);
      if (d < 4.2) p.set(ARENA.x + dx, y - 2, cz + dz, t.rocha[0]);
      if (d < 2.6) p.set(ARENA.x + dx, y - 3, cz + dz, t.rocha[t.rocha.length - 1]);
    }
  }
  p.fill(ARENA.x - 1, y + 1, cz - 1, ARENA.x + 1, y + 1, cz + 1, t.deco);
  for (let h = 2; h <= 5; h++) p.set(ARENA.x, y + h, cz, t.pilar);
  p.set(ARENA.x, y + 6, cz, t.luz);
  yield;
  return { nome: t.nome, vazio: ARENA.vazio, centro: { x: ARENA.x, y: y + 1, z: cz }, equipes };
}
