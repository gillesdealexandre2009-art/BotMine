// @ts-check
// Árvores, arbustos, rochedos e troncos caídos da floresta. Cada espécie tem silhueta própria; as folhas só ocupam ar, então
// uma copa nunca come um tronco, uma rocha ou o chão.

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {() => number} Rng */

/**
 * Disco de folhas de raio r (cantos arredondados) na altura y.
 * @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {number} r @param {string} id
 */
function disco(p, x, y, z, r, id) {
  for (let dz = -r; dz <= r; dz++) {
    const meio = Math.floor(Math.sqrt(r * r + 0.7 - dz * dz));
    if (meio < 0) continue;
    p.fill(x - meio, y, z + dz, x + meio, y, z + dz, id, true);
  }
}

/** Carvalho redondo, com um galho de lado às vezes. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng */
export function carvalho(p, x, y, z, rng) {
  const h = 5 + Math.floor(rng() * 3);
  const folha = "minecraft:oak_leaves";
  disco(p, x, y + h - 1, z, 2, folha);
  disco(p, x, y + h, z, 3, folha);
  disco(p, x, y + h + 1, z, 3, folha);
  disco(p, x, y + h + 2, z, 2, folha);
  disco(p, x, y + h + 3, z, 1, folha);
  p.fill(x, y + 1, z, x, y + h + 2, z, "minecraft:oak_log");
  if (rng() < 0.5) {
    const lado = rng() < 0.5 ? 1 : -1;
    const eixoX = rng() < 0.5;
    const bx = x + (eixoX ? lado : 0), bz = z + (eixoX ? 0 : lado);
    p.set(bx, y + h - 1, bz, "minecraft:oak_log");
    disco(p, bx, y + h, bz, 1, folha);
  }
}

/** Bétula esguia. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng */
export function betula(p, x, y, z, rng) {
  const h = 6 + Math.floor(rng() * 3);
  const folha = "minecraft:birch_leaves";
  disco(p, x, y + h - 2, z, 1, folha);
  disco(p, x, y + h - 1, z, 2, folha);
  disco(p, x, y + h, z, 2, folha);
  disco(p, x, y + h + 1, z, 1, folha);
  p.set(x, y + h + 2, z, folha);
  p.fill(x, y + 1, z, x, y + h + 1, z, "minecraft:birch_log");
}

/** Carvalho escuro: copa larga e achatada. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng */
export function carvalhoEscuro(p, x, y, z, rng) {
  const h = 5 + Math.floor(rng() * 2);
  const folha = "minecraft:dark_oak_leaves";
  disco(p, x, y + h - 1, z, 3, folha);
  disco(p, x, y + h, z, 4, folha);
  disco(p, x, y + h + 1, z, 4, folha);
  disco(p, x, y + h + 2, z, 2, folha);
  p.fill(x, y + 1, z, x, y + h + 1, z, "minecraft:dark_oak_log");
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rng() < 0.5) p.set(x + dx, y + h - 1, z + dz, "minecraft:dark_oak_log");
}

/** Cerejeira (sakura): tronco torto e copa rosa larga. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng */
export function cerejeira(p, x, y, z, rng) {
  const h = 4 + Math.floor(rng() * 2);
  const folha = "minecraft:cherry_leaves";
  const inclina = rng() < 0.5 ? 1 : -1;
  p.fill(x, y + 1, z, x, y + h, z, "minecraft:cherry_log");
  p.set(x + inclina, y + h, z, "minecraft:cherry_log");
  p.set(x + inclina, y + h + 1, z, "minecraft:cherry_log");
  const cx = x + inclina;
  disco(p, cx, y + h, z, 3, folha);
  disco(p, cx, y + h + 1, z, 4, folha);
  disco(p, cx, y + h + 2, z, 4, folha);
  disco(p, cx, y + h + 3, z, 3, folha);
  disco(p, cx, y + h + 4, z, 1, folha);
  // galho para o outro lado, com um tufo
  p.set(x - inclina, y + h - 1, z, "minecraft:cherry_log");
  disco(p, x - inclina * 2, y + h, z, 2, folha);
}

/** Pinheiro: cone em camadas, mais alto e fino no alto da serra. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng @param {number} [maxR] */
export function pinheiro(p, x, y, z, rng, maxR = 3) {
  const h = 9 + Math.floor(rng() * 7);
  const topo = y + h;
  p.fill(x, y + 1, z, x, topo, z, "minecraft:spruce_log");
  const folha = "minecraft:spruce_leaves";
  p.set(x, topo + 1, z, folha);
  for (let k = 0; k <= h - 3; k++) {
    const base = Math.floor((k + 1) / 2.3);
    const r = k === 0 ? 1 : Math.min(maxR, base + (k % 2 === 0 ? 0 : 1));
    disco(p, x, topo - k, z, Math.max(1, r), folha);
  }
}

/** Arbusto: bolinha de folhas rente ao chão. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng */
export function arbusto(p, x, y, z, rng) {
  const folha = rng() < 0.3 ? "minecraft:azalea_leaves" : "minecraft:oak_leaves";
  p.set(x, y + 1, z, "minecraft:oak_log");
  disco(p, x, y + 2, z, 1, folha);
  p.set(x, y + 3, z, folha);
}

/** Pedregulho: esfera achatada meio enterrada. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng @param {string[]} blocos */
export function pedregulho(p, x, y, z, rng, blocos) {
  const r = 1 + Math.floor(rng() * 2);
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > r + 0.3) continue;
      const alt = Math.max(1, Math.round((r + 0.5 - d) * 0.9));
      for (let dy = 0; dy < alt; dy++) p.set(x + dx, y + dy, z + dz, blocos[Math.floor(rng() * blocos.length)]);
    }
  }
}

/** Tronco caído. @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {Rng} rng */
export function troncoCaido(p, x, y, z, rng) {
  const eixoX = rng() < 0.5;
  const n = 3 + Math.floor(rng() * 3);
  const tipo = rng() < 0.15 ? "minecraft:birch_log" : "minecraft:spruce_log";
  for (let i = 0; i < n; i++) p.set(x + (eixoX ? i : 0), y + 1, z + (eixoX ? 0 : i), tipo, { pillar_axis: eixoX ? "x" : "z" });
  if (rng() < 0.6) p.set(x + (eixoX ? 1 : 0), y + 2, z + (eixoX ? 0 : 1), rng() < 0.5 ? "minecraft:brown_mushroom" : "minecraft:red_mushroom");
}
