// @ts-check
// Mundo dos minigames (dimensão vulpus:minigames, vazio): o hub onde se espera, a sala de cofres onde ficam guardadas as coisas
// de quem está jogando, e a arena do Skywars (ilha central, ilhas do meio e 8 ilhas de partida). Só geradores, falando com o
// Pincel (testável sem o jogo). As posições estão aqui para o resto do código usar.

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Ponto */

/** Centro do chão do hub (o bloco do chão fica em y; a pessoa fica em y+1). */
export const HUB = Object.freeze({ x: 0, y: 100, z: 0 });
export const HUB_RAIO = 12;
/** Onde fica o portal de saída (fixo, no fundo do hub, de frente para quem chega). */
export const SAIDA = Object.freeze({ x: HUB.x + 0.5, y: HUB.y + 1, z: HUB.z + 8.5, yaw: 180 });
/** Sala de cofres: cada pessoa ganha dois baús separados (54 espaços) numa grade. */
export const COFRES = Object.freeze({ x0: -24, y: 90, z0: -30, colunas: 12, linhas: 8, passoX: 4, passoZ: 3 });
export const CAPACIDADE = COFRES.colunas * COFRES.linhas;
/** Arena do Skywars: y é o topo das ilhas; abaixo de `vazio` a pessoa cai e é eliminada. */
export const ARENA = Object.freeze({ x: 0, y: 100, z: 110, raio: 62, yMin: 78, yMax: 142, vazio: 80 });
/** Áreas que ficam carregadas (ticking areas): o hub com os cofres e a arena. */
export const AREAS = Object.freeze({
  hub: { from: { x: -48, y: 60, z: -48 }, to: { x: 47, y: 140, z: 16 } },
  arena: { from: { x: -64, y: 60, z: 46 }, to: { x: 63, y: 150, z: 174 } },
});
export const MAX_JOGADORES = 12;

/** Os dois baús de um cofre. @param {number} idx */
export function posCofre(idx) {
  const col = idx % COFRES.colunas, lin = Math.floor(idx / COFRES.colunas);
  const a = { x: COFRES.x0 + col * COFRES.passoX, y: COFRES.y, z: COFRES.z0 + lin * COFRES.passoZ };
  return { a, b: { x: a.x + 2, y: a.y, z: a.z } };
}

/** @param {number} x @param {number} y @param {number} z */
const dentroDosCofres = (x, y, z) => y >= COFRES.y - 1 && y <= COFRES.y + 3 && x >= COFRES.x0 - 2 && x <= COFRES.x0 + COFRES.colunas * COFRES.passoX + 2 && z >= COFRES.z0 - 2 && z <= COFRES.z0 + COFRES.linhas * COFRES.passoZ + 2;
export { dentroDosCofres };

// ---------------------------------------------------------------- hub

/** O hub: disco de pedra com moldura dourada, muro baixo (ninguém cai), pilares com lanternas e um altar no centro. @param {Pincel} p */
export function* construirHub(p) {
  const { x, y, z } = HUB;
  const R = HUB_RAIO;
  p.fill(x - R - 2, y - 3, z - R - 2, x + R + 2, y + 10, z + R + 2, "minecraft:air");
  yield;
  let n = 0;
  for (let dz = -R - 1; dz <= R + 1; dz++) {
    for (let dx = -R - 1; dx <= R + 1; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > R + 0.5) continue;
      const borda = d > R - 1;
      let topo = (dx + dz) % 2 === 0 ? "minecraft:polished_andesite" : "minecraft:stone_bricks";
      if (d <= 3.4) topo = d <= 1.6 ? "minecraft:gold_block" : "minecraft:polished_blackstone_bricks";
      else if (d > 7.4 && d <= 8.4) topo = "minecraft:cut_copper";
      if (borda) topo = "minecraft:gilded_blackstone";
      p.set(x + dx, y, z + dz, topo);
      p.set(x + dx, y - 1, z + dz, "minecraft:stone_bricks");
      p.set(x + dx, y - 2, z + dz, "minecraft:stone_bricks");
      if (d > R - 0.4 && d <= R + 0.5) {
        p.set(x + dx, y + 1, z + dz, "minecraft:stone_brick_wall");
        p.set(x + dx, y + 2, z + dz, "minecraft:stone_brick_wall");
        if ((dx + dz + 100) % 5 === 0) p.set(x + dx, y + 3, z + dz, "minecraft:lantern");
      }
      if (++n % 220 === 0) yield;
    }
  }
  // pilares nos cantos diagonais, com lanterna de alma
  for (const [px, pz] of [[7, 7], [-7, 7], [7, -7], [-7, -7]]) {
    for (let k = 1; k <= 5; k++) p.set(x + px, y + k, z + pz, "minecraft:dark_oak_log");
    p.set(x + px, y + 6, z + pz, "minecraft:soul_lantern");
    p.set(x + px + 1, y + 1, z + pz, "minecraft:soul_campfire");
  }
  // altar baixo com velas, logo atrás da pessoa que chega
  for (let dx = -2; dx <= 2; dx++) p.set(x + dx, y + 1, z - 5, "minecraft:polished_blackstone_slab");
  p.set(x - 2, y + 2, z - 5, "minecraft:candle", { candles: 3, lit: true });
  p.set(x + 2, y + 2, z - 5, "minecraft:candle", { candles: 3, lit: true });
  p.set(x, y + 2, z - 5, "minecraft:crying_obsidian");
  yield;
}

/** Sala de cofres: piso de pedra e dois baús por vaga. Nunca troca um baú que já existe (podem estar cheios). @param {Pincel} p */
export function* construirCofres(p) {
  const c = COFRES;
  p.fill(c.x0 - 2, c.y - 1, c.z0 - 2, c.x0 + c.colunas * c.passoX + 2, c.y - 1, c.z0 + c.linhas * c.passoZ + 1, "minecraft:stone");
  p.fill(c.x0 - 2, c.y, c.z0 - 2, c.x0 + c.colunas * c.passoX + 2, c.y + 3, c.z0 + c.linhas * c.passoZ + 1, "minecraft:air", true);
  yield;
  for (let i = 0; i < CAPACIDADE; i++) {
    const { a, b } = posCofre(i);
    for (const q of [a, b]) if (p.id(q.x, q.y, q.z) !== "minecraft:chest") p.set(q.x, q.y, q.z, "minecraft:chest");
    if (i % 24 === 23) yield;
  }
}

// ---------------------------------------------------------------- arena

/** Apaga a arena inteira (do chão ao teto, camada por camada) e os itens soltos ficam por conta de quem chama. @param {Pincel} p */
export function* limparArena(p) {
  const r = ARENA.raio + 2;
  for (let y = ARENA.yMin; y <= ARENA.yMax; y++) {
    p.fill(ARENA.x - r, y, ARENA.z - r, ARENA.x + r, y, ARENA.z + r, "minecraft:air");
    if (y % 6 === 0) yield;
  }
}

/**
 * Uma ilha: topo de grama, terra e um cone de pedra por baixo (irregular).
 * @param {Pincel} p
 * @param {number} cx
 * @param {number} cz
 * @param {number} raio
 * @param {number} fundo  profundidade do cone
 * @param {() => number} rng
 */
function ilha(p, cx, cz, raio, fundo, rng) {
  const y = ARENA.y;
  const r = Math.ceil(raio) + 1;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dz) + (rng() - 0.5) * 0.9;
      if (d > raio) continue;
      p.set(cx + dx, y, cz + dz, "minecraft:grass_block");
      p.set(cx + dx, y - 1, cz + dz, "minecraft:dirt");
      const prof = Math.floor(fundo * (1 - d / raio)) + 1;
      p.set(cx + dx, y - 2, cz + dz, "minecraft:dirt");
      for (let k = 0; k < prof; k++) p.set(cx + dx, y - 3 - k, cz + dz, rng() < 0.12 ? "minecraft:cobblestone" : "minecraft:stone");
    }
  }
}

/**
 * Constrói as ilhas. Devolve os pontos de partida e os baús (com o nível de cada um: 1 ilha de partida, 2 ilhas do meio,
 * 3 centro).
 * @param {Pincel} p
 * @param {() => number} rng
 * @returns {Generator<any, { spawns: Ponto[], baus: (Ponto & { t: number })[] }>}
 */
export function* construirArena(p, rng) {
  const y = ARENA.y;
  /** @type {Ponto[]} */
  const spawns = [];
  /** @type {(Ponto & { t: number })[]} */
  const baus = [];
  // centro: ilha grande com um pedestal dourado e 4 baús do nível 3
  ilha(p, ARENA.x, ARENA.z, 8, 8, rng);
  p.set(ARENA.x, y + 1, ARENA.z, "minecraft:gold_block");
  p.set(ARENA.x, y + 2, ARENA.z, "minecraft:lantern");
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
    p.set(ARENA.x + dx, y + 1, ARENA.z + dz, "minecraft:chest");
    baus.push({ x: ARENA.x + dx, y: y + 1, z: ARENA.z + dz, t: 3 });
  }
  yield;
  // ilhas do meio: 8 ilhas pequenas, 1 baú do nível 2 cada
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * Math.PI) / 4;
    const cx = ARENA.x + Math.round(Math.cos(a) * 24), cz = ARENA.z + Math.round(Math.sin(a) * 24);
    ilha(p, cx, cz, 3.6, 4, rng);
    p.set(cx, y + 1, cz, "minecraft:chest");
    baus.push({ x: cx, y: y + 1, z: cz, t: 2 });
    yield;
  }
  // ilhas de partida: 8 ilhas médias, 2 baús do nível 1 cada, e o ponto de partida no meio
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const cx = ARENA.x + Math.round(Math.cos(a) * 42), cz = ARENA.z + Math.round(Math.sin(a) * 42);
    ilha(p, cx, cz, 5, 6, rng);
    const tx = -Math.round(Math.sin(a)), tz = Math.round(Math.cos(a));
    for (const s of [-1, 1]) {
      const bx = cx + (Math.abs(tx) > 0 ? s * 3 * Math.sign(tx) : 0), bz = cz + (Math.abs(tz) > 0 ? s * 3 * Math.sign(tz) : 0);
      p.set(bx, y + 1, bz, "minecraft:chest");
      baus.push({ x: bx, y: y + 1, z: bz, t: 1 });
    }
    spawns.push({ x: cx + 0.5, y: y + 1, z: cz + 0.5 });
    yield;
  }
  return { spawns, baus };
}

/** Gaiola de vidro em volta de um ponto de partida (fechar = true) ou a retira. @param {Pincel} p @param {Ponto} s @param {boolean} fechar */
export function gaiola(p, s, fechar) {
  const x = Math.floor(s.x), z = Math.floor(s.z), y = Math.floor(s.y);
  if (!fechar) {
    p.fill(x - 2, y, z - 2, x + 2, y + 2, z + 2, "minecraft:air");
    return;
  }
  p.fill(x - 2, y, z - 2, x + 2, y + 2, z + 2, "minecraft:glass");
  p.fill(x - 1, y, z - 1, x + 1, y + 1, z + 1, "minecraft:air");
}
