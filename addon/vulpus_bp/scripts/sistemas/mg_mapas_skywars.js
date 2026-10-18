// @ts-check
// Mapas do Skywars, gerados na hora e sorteados a cada partida. Cada mapa tem um tema (blocos, árvores, marcas) e o layout varia
// um pouco toda vez (giro, raios, tamanho das ilhas, onde ficam os baús). Os baús não ficam à mostra: cada um vai escondido de
// um jeito (enterrado sob um bloco diferente, dentro de uma cabana, no meio de uma pilha de feno e barris ou no oco de um
// tronco largo) e os do centro ficam dentro de uma pirâmide de pedra com uma parede rachada como pista.
import { ARENA } from "./mg_arena.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Ponto */
/**
 * @typedef {object} TemaSky
 * @property {string} id
 * @property {string} nome
 * @property {string} topo  bloco da superfície
 * @property {string} sub  camada de baixo
 * @property {string[]} rocha  o cone de baixo (sorteado por bloco)
 * @property {string} marca  bloco diferente que cobre um baú enterrado
 * @property {string} parede  paredes das cabanas
 * @property {string} telhado
 * @property {string} tronco
 * @property {string} folha
 * @property {string} pirami  tijolos da pirâmide central
 * @property {string[]} deco  blocos soltos na superfície (flores, cogumelos)
 * @property {"carvalho" | "pinheiro" | "nenhuma"} arvore
 */

/** @type {Record<string, TemaSky>} */
export const TEMAS = {
  floresta: {
    id: "floresta", nome: "Floresta Flutuante",
    topo: "minecraft:grass_block", sub: "minecraft:dirt", rocha: ["minecraft:stone", "minecraft:stone", "minecraft:cobblestone", "minecraft:andesite"],
    marca: "minecraft:coarse_dirt", parede: "minecraft:oak_planks", telhado: "minecraft:oak_slab", tronco: "minecraft:oak_log", folha: "minecraft:oak_leaves",
    pirami: "minecraft:stone_bricks", deco: ["minecraft:poppy", "minecraft:dandelion", "minecraft:red_mushroom"], arvore: "carvalho",
  },
  vulcao: {
    id: "vulcao", nome: "Vulcão Esquecido",
    topo: "minecraft:blackstone", sub: "minecraft:basalt", rocha: ["minecraft:deepslate", "minecraft:blackstone", "minecraft:magma", "minecraft:deepslate"],
    marca: "minecraft:soul_sand", parede: "minecraft:polished_blackstone_bricks", telhado: "minecraft:polished_blackstone_brick_slab", tronco: "minecraft:crimson_stem", folha: "minecraft:nether_wart_block",
    pirami: "minecraft:polished_blackstone_bricks", deco: ["minecraft:crimson_roots", "minecraft:crimson_fungus"], arvore: "nenhuma",
  },
  gelo: {
    id: "gelo", nome: "Gelo Eterno",
    topo: "minecraft:snow", sub: "minecraft:packed_ice", rocha: ["minecraft:stone", "minecraft:packed_ice", "minecraft:ice", "minecraft:stone"],
    marca: "minecraft:blue_ice", parede: "minecraft:spruce_planks", telhado: "minecraft:spruce_slab", tronco: "minecraft:spruce_log", folha: "minecraft:spruce_leaves",
    pirami: "minecraft:stone_bricks", deco: ["minecraft:snow_layer"], arvore: "pinheiro",
  },
};

export const MAPAS_SKYWARS = Object.freeze(Object.values(TEMAS).map((t) => ({ id: t.id, nome: t.nome })));

/** @param {() => number} rng @param {number} a @param {number} b */
const entre = (rng, a, b) => a + rng() * (b - a);
/** @template T @param {T[]} l @param {() => number} rng */
const um = (l, rng) => l[Math.floor(rng() * l.length)];

/**
 * Uma ilha irregular: superfície, camada de baixo e um cone de rocha.
 * @param {Pincel} p
 * @param {TemaSky} t
 * @param {number} cx
 * @param {number} cz
 * @param {number} raio
 * @param {number} fundo
 * @param {() => number} rng
 */
function ilha(p, t, cx, cz, raio, fundo, rng) {
  const y = ARENA.y;
  const r = Math.ceil(raio) + 1;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dz) + (rng() - 0.5) * 1.1;
      if (d > raio) continue;
      p.set(cx + dx, y, cz + dz, t.topo);
      p.set(cx + dx, y - 1, cz + dz, t.sub);
      p.set(cx + dx, y - 2, cz + dz, t.sub);
      const prof = Math.floor(fundo * (1 - d / raio)) + 1;
      for (let k = 0; k < prof; k++) p.set(cx + dx, y - 3 - k, cz + dz, um(t.rocha, rng));
    }
  }
}

/** Árvore pequena de enfeite (não esconde baú). @param {Pincel} p @param {TemaSky} t @param {number} x @param {number} z @param {() => number} rng */
function arvore(p, t, x, z, rng) {
  if (t.arvore === "nenhuma") return;
  const y = ARENA.y;
  const h = 4 + Math.floor(rng() * 2);
  for (let k = 1; k <= h; k++) p.set(x, y + k, z, t.tronco);
  if (t.arvore === "pinheiro") {
    for (let k = 0; k < 4; k++) {
      const r = k === 3 ? 0 : 3 - k;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r + 1 && !(dx === 0 && dz === 0 && k < 3)) p.set(x + dx, y + h - 2 + k, z + dz, t.folha);
    }
    return;
  }
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 2; dy++) {
    if (Math.abs(dx) + Math.abs(dz) + dy > 3 || (dx === 0 && dz === 0 && dy < 1)) continue;
    p.set(x + dx, y + h - 1 + dy, z + dz, t.folha);
  }
}

/** Enfeites soltos pela superfície. @param {Pincel} p @param {TemaSky} t @param {number} cx @param {number} cz @param {number} raio @param {() => number} rng */
function enfeitar(p, t, cx, cz, raio, rng) {
  for (let i = 0; i < raio * 2; i++) {
    const a = rng() * Math.PI * 2, d = rng() * (raio - 1);
    p.set(cx + Math.round(Math.cos(a) * d), ARENA.y + 1, cz + Math.round(Math.sin(a) * d), um(t.deco, rng));
  }
}

// ---------------------------------------------------------------- escondijos de baú
/** @typedef {"enterrado" | "cabana" | "pilha" | "tronco"} Estilo */
const ESTILOS = /** @type {Estilo[]} */ (["enterrado", "cabana", "pilha", "tronco"]);

/**
 * Põe um baú escondido num ponto da ilha e devolve a posição dele.
 * @param {Pincel} p
 * @param {TemaSky} t
 * @param {Estilo} estilo
 * @param {number} x
 * @param {number} z
 * @param {() => number} rng
 * @returns {Ponto & { topo: number }}
 */
function esconder(p, t, estilo, x, z, rng) {
  const y = ARENA.y;
  if (estilo === "enterrado") {
    // o baú fica dentro da terra e o bloco de cima é de outro tipo (uma pista para quem repara)
    p.set(x, y - 1, z, "minecraft:chest");
    p.set(x, y, z, t.marca);
    return { x, y: y - 1, z, topo: y + 1 };
  }
  if (estilo === "cabana") {
    // cabana 3x3 com porta aberta virada para um lado qualquer
    const lado = Math.floor(rng() * 4);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const borda = Math.abs(dx) === 1 || Math.abs(dz) === 1;
      p.set(x + dx, y + 1, z + dz, borda ? t.parede : "minecraft:air");
      p.set(x + dx, y + 2, z + dz, borda ? t.parede : "minecraft:air");
      p.set(x + dx, y + 3, z + dz, t.telhado);
    }
    const porta = [[0, -1], [0, 1], [-1, 0], [1, 0]][lado];
    p.set(x + porta[0], y + 1, z + porta[1], "minecraft:air");
    p.set(x + porta[0], y + 2, z + porta[1], "minecraft:air");
    // o baú fica no centro (as paredes o escondem; só se vê entrando pela porta)
    p.set(x, y + 1, z, "minecraft:chest");
    return { x, y: y + 1, z, topo: y + 4 };
  }
  if (estilo === "pilha") {
    // 3x3 de feno e barris com o baú no meio, coberto por cima
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      p.set(x + dx, y + 1, z + dz, rng() < 0.5 ? "minecraft:hay_block" : "minecraft:barrel");
      if (rng() < 0.45) p.set(x + dx, y + 2, z + dz, "minecraft:hay_block");
    }
    p.set(x, y + 1, z, "minecraft:chest");
    p.set(x, y + 2, z, "minecraft:hay_block");
    return { x, y: y + 1, z, topo: y + 3 };
  }
  // tronco: uma árvore grossa e oca; o baú no meio da base, coberto pela madeira e pela copa
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (let k = 1; k <= 4; k++) p.set(x + dx, y + k, z + dz, t.tronco);
  p.set(x, y + 1, z, "minecraft:chest");
  p.set(x, y + 2, z, "minecraft:air");
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 1; dy++) if (Math.abs(dx) + Math.abs(dz) <= 3) p.set(x + dx, y + 5 + dy, z + dz, t.folha);
  return { x, y: y + 1, z, topo: y + 7 };
}

/**
 * A pirâmide do centro: 4 baús do nível 3 e 1 do nível 4 (o lendário) num cômodo de 3x3 cercado por tijolos; um tijolo rachado numa face é a fraqueza.
 * @param {Pincel} p
 * @param {TemaSky} t
 * @param {number} cx
 * @param {number} cz
 * @param {() => number} rng
 * @returns {(Ponto & { t: number, topo: number })[]}
 */
function piramide(p, t, cx, cz, rng) {
  const y = ARENA.y;
  /** @type {(Ponto & { t: number, topo: number })[]} */
  const baus = [];
  const camadas = [7, 5, 3, 1];
  camadas.forEach((s, i) => {
    const m = (s - 1) / 2;
    for (let dz = -m; dz <= m; dz++) for (let dx = -m; dx <= m; dx++) p.set(cx + dx, y + 1 + i, cz + dz, t.pirami);
  });
  // cômodo oco no meio das duas primeiras camadas
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) p.set(cx + dx, y + 1, cz + dz, "minecraft:air");
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    p.set(cx + dx, y + 1, cz + dz, "minecraft:chest");
    baus.push({ x: cx + dx, y: y + 1, z: cz + dz, t: 3, topo: y + 6 });
  }
  // o baú lendário no meio (4 baús em volta, uma porta e um brilho dourado no teto)
  p.set(cx, y + 1, cz, "minecraft:chest");
  baus.push({ x: cx, y: y + 1, z: cz, t: 4, topo: y + 6 });
  // a entrada: uma porta de 2 de altura numa das faces (sorteada); de lá dá para alcançar os 4 baús
  const face = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rng() * 4)];
  p.set(cx + face[0] * 2, y + 1, cz + face[1] * 2, "minecraft:air");
  p.set(cx + face[0] * 2, y + 2, cz + face[1] * 2, "minecraft:air");
  p.set(cx + face[0] * 3, y + 1, cz + face[1] * 3, "minecraft:air");
  p.set(cx + face[0] * 3, y + 2, cz + face[1] * 3, "minecraft:air");
  p.set(cx, y + 5, cz, "minecraft:lantern");
  return baus;
}

/**
 * Constrói um mapa do Skywars.
 * @param {Pincel} p
 * @param {string} mapaId
 * @param {() => number} rng
 * @returns {Generator<any, { spawns: Ponto[], baus: (Ponto & { t: number, topo?: number })[], vazio: number, nome: string }>}
 */
export function* construirSkywars(p, mapaId, rng) {
  const t = TEMAS[mapaId] ?? TEMAS.floresta;
  const y = ARENA.y;
  /** @type {Ponto[]} */
  const spawns = [];
  /** @type {(Ponto & { t: number, topo?: number })[]} */
  const baus = [];
  const giro = rng() * Math.PI * 2;
  // centro
  const raioCentro = entre(rng, 8, 10);
  ilha(p, t, ARENA.x, ARENA.z, raioCentro, 8, rng);
  enfeitar(p, t, ARENA.x, ARENA.z, raioCentro, rng);
  yield;
  baus.push(...piramide(p, t, ARENA.x, ARENA.z, rng));
  for (let k = 0; k < 4; k++) {
    const a = giro + (k * Math.PI) / 2 + Math.PI / 4;
    arvore(p, t, ARENA.x + Math.round(Math.cos(a) * (raioCentro - 2)), ARENA.z + Math.round(Math.sin(a) * (raioCentro - 2)), rng);
  }
  yield;
  // ilhas do meio: 8, com 1 baú escondido cada
  const raioMeio = entre(rng, 22, 26);
  for (let k = 0; k < 8; k++) {
    const a = giro + ((k + 0.5) * Math.PI) / 4;
    const cx = ARENA.x + Math.round(Math.cos(a) * raioMeio), cz = ARENA.z + Math.round(Math.sin(a) * raioMeio);
    const r = entre(rng, 4, 5.2);
    ilha(p, t, cx, cz, r, 5, rng);
    enfeitar(p, t, cx, cz, r, rng);
    const b = esconder(p, t, um(ESTILOS, rng), cx, cz, rng);
    baus.push({ ...b, t: 2 });
    yield;
  }
  // ilhas de partida: 8, 2 baús escondidos cada e o ponto de partida no meio de uma clareira
  const raioBorda = entre(rng, 40, 44);
  for (let k = 0; k < 8; k++) {
    const a = giro + (k * Math.PI) / 4;
    const cx = ARENA.x + Math.round(Math.cos(a) * raioBorda), cz = ARENA.z + Math.round(Math.sin(a) * raioBorda);
    const r = entre(rng, 6, 7);
    ilha(p, t, cx, cz, r, 7, rng);
    enfeitar(p, t, cx, cz, r - 1, rng);
    // a clareira do ponto de partida fica livre (antes dos esconderijos, para não apagar paredes de cabanas)
    p.fill(cx - 2, y + 1, cz - 2, cx + 2, y + 4, cz + 2, "minecraft:air");
    const tx = -Math.sin(a), tz = Math.cos(a);
    for (const s of [-1, 1]) {
      const bx = cx + Math.round(tx * s * 4.2), bz = cz + Math.round(tz * s * 4.2);
      baus.push({ ...esconder(p, t, um(ESTILOS, rng), bx, bz, rng), t: 1 });
    }
    arvore(p, t, cx + Math.round(-Math.cos(a) * 4), cz + Math.round(-Math.sin(a) * 4), rng);
    spawns.push({ x: cx + 0.5, y: y + 1, z: cz + 0.5 });
    yield;
  }
  return { spawns, baus, vazio: ARENA.vazio, nome: t.nome };
}
