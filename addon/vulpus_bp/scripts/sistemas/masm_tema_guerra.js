// @ts-check
// Andar 3: O CAMPO DE GUERRA. As guerras de clãs e o Capture the Flag da Vulpus, agora um campo de batalha eterno: trincheiras,
// paliçadas, catapultas e balistas quebradas, tendas de campanha, fogueiras, arsenal, mastros de bandeira rasgados em todas as cores
// dos clãs, cercas de estacas, crateras, armaduras em suportes, a mesa de estratégia e a enfermaria. Pedra rústica, madeira escura,
// lã de clã, ferro, fumaça (carvão) e brasas.
import { AR, anel, centroDe, disco, lustre, sorteio, teia, livre, arcoDePortal } from "./masm_pecas.js";
import { C } from "./masm_grade.js";

/** @typedef {import("./masm_construir.js").Tema} Tema */
/** @typedef {import("./masm_pecas.js").Contexto} Contexto */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */

// ---------------------------------------------------------------- materiais
const TORA = "minecraft:dark_oak_log";
const TORA_L = "minecraft:stripped_dark_oak_log";
const TAB = "minecraft:dark_oak_planks";
const LAJE_M = "minecraft:dark_oak_slab";
const ESC_M = "minecraft:dark_oak_stairs";
const CERCA = "minecraft:dark_oak_fence";
const CERCA2 = "minecraft:spruce_fence";
const PONTA = "minecraft:lightning_rod";
const GRADE = "minecraft:iron_bars";
const CINZA = "minecraft:gray_carpet";
const CARVAO = "minecraft:coal_block";
const CORES = ["red", "blue", "yellow", "lime", "purple", "orange", "cyan", "magenta", "white", "pink", "light_blue", "green"];

/** Lã de uma cor. @param {string} cor */
const la = (cor) => `minecraft:${cor}_wool`;
/** Tapete de uma cor. @param {string} cor */
const tp = (cor) => `minecraft:${cor}_carpet`;
/** Cor de clã sorteada por semente. @param {number} n */
const corDe = (n) => CORES[Math.abs(Math.floor(n)) % CORES.length];

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BASE = {
  nome: "Campo de Guerra",
  parede: [["minecraft:stone_bricks", 4], ["minecraft:cobblestone", 3], ["minecraft:cracked_stone_bricks", 2], ["minecraft:andesite", 2], ["minecraft:mossy_cobblestone", 1], [TAB, 1]],
  rodape: "minecraft:cobblestone",
  friso: TORA_L,
  pilar: TORA,
  topo: TAB,
  piso: [["minecraft:coarse_dirt", 4], ["minecraft:gravel", 2], ["minecraft:podzol", 2], ["minecraft:cobblestone", 2], ["minecraft:tuff", 1], ["minecraft:mud", 1], ["minecraft:blackstone", 1]],
  pisoCorredor: [["minecraft:coarse_dirt", 4], ["minecraft:gravel", 3], ["minecraft:cobblestone", 2], ["minecraft:podzol", 1]],
  borda: "minecraft:cobblestone",
  teto: "minecraft:blackstone",
  viga: TORA,
  luz: "minecraft:lantern",
  vitral: "minecraft:shroomlight",
  escada: "minecraft:stone_stairs",
  laje: "minecraft:cobblestone_slab",
  muro: "minecraft:cobblestone_wall",
  sujo: "minecraft:coal_block",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const ARENA = {
  ...BASE,
  nome: "Arena do General",
  parede: [["minecraft:polished_blackstone_bricks", 4], ["minecraft:cracked_polished_blackstone_bricks", 3], ["minecraft:blackstone", 2], ["minecraft:stone_bricks", 2], ["minecraft:chiseled_polished_blackstone", 1]],
  rodape: "minecraft:blackstone",
  friso: "minecraft:gilded_blackstone",
  pilar: "minecraft:polished_blackstone",
  topo: "minecraft:chiseled_polished_blackstone",
  piso: [["minecraft:blackstone", 3], ["minecraft:polished_blackstone", 3], ["minecraft:cracked_polished_blackstone_bricks", 2], ["minecraft:coarse_dirt", 2], ["minecraft:basalt", 1]],
  borda: "minecraft:polished_blackstone_bricks",
  teto: "minecraft:polished_blackstone",
  luz: "minecraft:soul_lantern",
  escada: "minecraft:polished_blackstone_brick_stairs",
  laje: "minecraft:polished_blackstone_brick_slab",
  muro: "minecraft:polished_blackstone_brick_wall",
  sujo: "minecraft:blackstone",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const INTENDENCIA = {
  ...BASE,
  nome: "Intendência",
  parede: [[TAB, 4], ["minecraft:spruce_planks", 3], ["minecraft:stone_bricks", 2], ["minecraft:cobblestone", 1]],
  rodape: "minecraft:stone_bricks",
  friso: TORA_L,
  piso: [[TAB, 3], ["minecraft:spruce_planks", 3], ["minecraft:coarse_dirt", 2], ["minecraft:hay_block", 1]],
  borda: "minecraft:spruce_planks",
  teto: "minecraft:spruce_planks",
  luz: "minecraft:lantern",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const TRINCHEIRA = {
  ...BASE,
  nome: "Trincheira",
  parede: [["minecraft:coarse_dirt", 5], ["minecraft:cobblestone", 2], [TAB, 2], ["minecraft:mossy_cobblestone", 1], ["minecraft:packed_mud", 1]],
  rodape: "minecraft:coarse_dirt",
  friso: TORA,
  teto: "minecraft:coarse_dirt",
};

// ---------------------------------------------------------------- ferramentas locais

/** @type {[number, number][]} */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Quadro local: (lx, lz) em relação a um ponto, com a frente apontando para (fx, fz). Tudo que uma peça coloca passa pelo quadro,
 * então a peça gira inteira. Só escreve em células de sala.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz
 */
function quadro(c, gx, gz, fx, fz) {
  const rx = -fz, rz = fx;
  /** @type {(lx: number, lz: number) => [number, number]} */
  const pos = (lx, lz) => [gx + lx * rx + lz * fx, gz + lx * rz + lz * fz];
  /** @type {(lx: number, ly: number, lz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const P = (lx, ly, lz, id, est) => {
    const [x, z] = pos(lx, lz);
    if (livre(c, x, z)) c.set(x, ly, z, id, est);
  };
  /** @type {(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, id: string) => void} */
  const F = (x1, y1, z1, x2, y2, z2, id) => {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) P(x, y, z, id);
  };
  /** Escada subindo no sentido local (ax, az). @type {(lx: number, ly: number, lz: number, id: string, ax: number, az: number, inv?: boolean) => void} */
  const E = (lx, ly, lz, id, ax, az, inv = false) => {
    const wx = ax * rx + az * fx, wz = ax * rz + az * fz;
    P(lx, ly, lz, id, { weirdo_direction: c.dirEscada(wx, wz), upside_down_bit: inv });
  };
  /** Eixo de toras: ao longo de z local ou de x local. @param {"x" | "z"} a */
  const eixo = (a) => {
    const alongZ = fx !== 0 ? "x" : "z";
    const alongX = fx !== 0 ? "z" : "x";
    return a === "z" ? alongZ : alongX;
  };
  /** Cardinal para onde olha o bloco (frente local +z => (fx, fz)). @param {number} ax @param {number} az */
  const card = (ax, az) => {
    const wx = ax * rx + az * fx, wz = ax * rz + az * fz;
    return wx > 0 ? "east" : wx < 0 ? "west" : wz > 0 ? "south" : "north";
  };
  /** Cabe? Todas as células do retângulo local são vazias de sala, longe de portas e corredores. */
  const cabe = (/** @type {number} */ x1, /** @type {number} */ x2, /** @type {number} */ z1, /** @type {number} */ z2, /** @type {number} */ alt) => {
    for (let lz = z1; lz <= z2; lz++) {
      for (let lx = x1; lx <= x2; lx++) {
        const [x, z] = pos(lx, lz);
        if (!livre(c, x, z) || c.bloco(x, 0, z) !== AR || c.bloco(x, -1, z) === AR || c.tetoK(x, z) < alt) return false;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (c.aberto(x + dx, z + dz) && c.cel(x + dx, z + dz) !== C.SALA) return false;
      }
    }
    return true;
  };
  return { P, F, E, eixo, card, cabe, pos, fx, fz };
}

/** @typedef {ReturnType<typeof quadro>} Q */
/** @typedef {{ nome: string, x: [number, number], z: [number, number], alt: number, f: (c: Contexto, q: Q, h: number, gx: number, gz: number) => void }} Peca */

/** Tenta colocar uma peça em algum ponto da sala. @param {Contexto} c @param {Sala} s @param {Peca} peca @param {number} [margem] */
function colocar(c, s, peca, margem = 1) {
  for (let t = 0; t < 18; t++) {
    const [gx, gz] = sorteio(c, s, margem);
    const [fx, fz] = DIRS[Math.floor(c.rng() * 4)];
    const q = quadro(c, gx, gz, fx, fz);
    if (!q.cabe(peca.x[0], peca.x[1], peca.z[0], peca.z[1], peca.alt)) continue;
    peca.f(c, q, c.hash(gx, gz, 11), gx, gz);
    return true;
  }
  return false;
}

/** Entulho e brasas pelo chão: cinzas, carvão, ossos, teias, tonéis. @param {Contexto} c @param {Sala} s @param {number} [dens] */
function sujeira(c, s, dens = 1) {
  const n = Math.round(((s.w * s.h) / 14) * dens);
  for (let i = 0; i < n; i++) {
    const [gx, gz] = sorteio(c, s, 1);
    if (!livre(c, gx, gz) || c.bloco(gx, 0, gz) !== AR) continue;
    const r = c.hash(gx, gz, 21);
    if (r < 0.4) c.bruto(gx, 0, gz, CINZA);
    else if (r < 0.55) c.set(gx, 0, gz, CARVAO);
    else if (r < 0.68) c.bruto(gx, 0, gz, tp(corDe(c.hash(gx, gz, 22) * 12)));
    else if (r < 0.78) c.set(gx, 0, gz, "minecraft:bone_block");
    else if (r < 0.86) c.set(gx, 0, gz, "minecraft:skeleton_skull");
    else if (r < 0.94) c.set(gx, 0, gz, "minecraft:cobblestone_slab", { "minecraft:vertical_half": "bottom" });
    else c.set(gx, 0, gz, PONTA);
  }
  for (let i = 0; i < Math.round((s.w * s.h) / 40); i++) {
    const [gx, gz] = sorteio(c, s, 1);
    teia(c, gx, c.tetoK(gx, gz) - 1, gz);
  }
}

// ---------------------------------------------------------------- peças figurativas

/** Pano de bandeira rasgado a partir do mastro em (gx, gz), estendido na direção (dx, dz). As fiadas encurtam, têm furos e farrapos. @param {Contexto} c @param {number} gx @param {number} gz @param {number} alto @param {number} dx @param {number} dz @param {string} cor @param {string} cor2 @param {number} larg @param {number} h */
function bandeira(c, gx, gz, alto, dx, dz, cor, cor2, larg, h) {
  const filas = Math.max(3, Math.round(alto * 0.6));
  const sem = Math.floor(h * 977);
  for (let j = 0; j < filas; j++) {
    const k = alto - j;
    if (k < 2) break;
    const comp = Math.max(1, larg - Math.floor(j * 0.7) - (c.hash(sem, j, 51) < 0.35 ? 1 : 0));
    const faixa = j === filas - 1 ? "black" : j % 3 === 1 ? cor2 : cor;
    for (let i = 1; i <= comp; i++) {
      if (c.hash(sem + i, k, 31) < 0.1 + j * 0.03) continue;
      const x = gx + dx * i, z = gz + dz * i;
      if (livre(c, x, z)) c.set(x, k, z, la(faixa));
    }
    // farrapo pendurado na ponta
    const fx = gx + dx * comp, fz = gz + dz * comp;
    if (j < filas - 1 && c.hash(sem, k, 52) < 0.5 && livre(c, fx, fz)) c.set(fx, k - 1, fz, la(cor));
  }
}

/** Mastro de bandeira de um clã: base de pedra, haste de cerca, ponta e o pano rasgado (ou o conjunto tombado). @param {Contexto} c @param {number} gx @param {number} gz @param {number} alto @param {string} cor @param {string} cor2 @param {number} dx @param {number} dz @param {number} larg @param {number} h */
function mastro(c, gx, gz, alto, cor, cor2, dx, dz, larg, h) {
  if (!livre(c, gx, gz)) return;
  c.set(gx, 0, gz, "minecraft:cobblestone");
  for (const [a, b] of DIRS) if (c.hash(gx + a * 3, gz + b * 3, 3) < 0.55 && livre(c, gx + a, gz + b) && c.bloco(gx + a, 0, gz + b) === AR) c.set(gx + a, 0, gz + b, c.hash(gx + a, gz + b, 4) < 0.5 ? "minecraft:cobblestone_slab" : "minecraft:mossy_cobblestone", { "minecraft:vertical_half": "bottom" });
  const meio = Math.min(2, alto - 1);
  c.fill(gx, 1, gz, gx, meio, gz, TORA);
  if (alto > meio) c.fill(gx, meio + 1, gz, gx, alto, gz, h < 0.6 ? CERCA : CERCA2);
  c.set(gx, alto + 1, gz, PONTA);
  bandeira(c, gx, gz, alto, dx, dz, cor, cor2, larg, h);
}

/** Mastro de bandeira rasgada, de pé, ou tombado com o pano estendido. @type {Peca} */
const MASTRO = {
  nome: "mastro",
  x: [-1, 1], z: [-1, 1], alt: 5,
  f(c, q, h, gx, gz) {
    const cor = corDe(h * 12), cor2 = corDe(h * 12 + 5);
    if (h < 0.2) {
      // tombado: haste no chão e o pano estendido
      q.P(0, 0, 0, "minecraft:cobblestone");
      q.F(0, 0, -1, 0, 0, 1, CERCA);
      q.P(1, 0, 1, la(cor));
      q.P(1, 0, 0, la(cor));
      q.P(1, 0, -1, tp(cor));
      q.P(-1, 0, 1, tp(cor2));
      q.P(0, 1, 1, "minecraft:skeleton_skull");
      return;
    }
    const [dx, dz] = DIRS[Math.floor(h * 977) % 4];
    mastro(c, gx, gz, Math.min(c.tetoK(gx, gz) - 2, 5), cor, cor2, dx, dz, 3, h);
  },
};

/** Catapulta de cerco, de pé ou quebrada. @type {Peca} */
const CATAPULTA = {
  nome: "catapulta",
  x: [-2, 2], z: [-3, 4], alt: 7,
  f(c, q, h) {
    const quebrada = h < 0.45;
    // rodas (cruz de toras com cubo)
    for (const lx of [-2, 2]) {
      if (quebrada && lx === 2 && h < 0.25) {
        q.P(lx, 0, 0, TORA_L);
        q.P(lx, 0, 2, TORA);
        continue;
      }
      q.P(lx, 1, 0, "minecraft:iron_block");
      for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) q.P(lx, 1 + a, b, TORA);
    }
    // chassi
    q.F(-1, 1, 0, 1, 1, 0, TORA_L);
    q.F(-1, 1, -3, 1, 1, -1, TAB);
    q.F(-1, 1, 1, 1, 1, 3, quebrada ? LAJE_M : TAB);
    for (const lx of [-1, 1]) {
      q.F(lx, 2, -3, lx, 2, -1, CERCA);
      q.F(lx, 2, 0, lx, 3, 0, TORA);
    }
    q.P(0, 3, 0, TORA_L);
    q.P(0, 2, 3, "minecraft:barrel", { facing_direction: 1 });
    q.P(1, 2, 2, "minecraft:cobblestone");
    q.P(-1, 2, 2, "minecraft:blackstone");
    // o braço
    q.E(0, 2, -2, ESC_M, 0, 1);
    q.E(0, 3, -1, ESC_M, 0, 1);
    q.P(0, 3, 0, TORA_L);
    if (!quebrada && c.tetoK(...q.pos(0, 2)) >= 7) {
      q.E(0, 4, 1, ESC_M, 0, 1);
      q.E(0, 5, 2, ESC_M, 0, 1);
      q.P(0, 5, 3, "minecraft:cauldron");
      q.P(0, 6, 3, "minecraft:blackstone");
      q.P(0, 3, -3, c.CORRENTE, { pillar_axis: "y" });
      q.P(0, 2, -3, "minecraft:cobblestone");
    } else {
      // braço partido caído no chão e munição espalhada
      q.P(0, 2, 2, ESC_M, { weirdo_direction: c.dirEscada(q.fx, q.fz), upside_down_bit: true });
      q.F(0, 2, 3, 0, 2, 3, CERCA);
      q.P(1, 0, 4, "minecraft:blackstone");
      q.P(-1, 0, 4, "minecraft:cobblestone");
      q.P(0, 0, 4, "minecraft:cauldron");
    }
    // pilha de munição
    for (const [a, b] of [[-2, 3], [-2, 4], [-1, 4]]) q.P(a, 0, b, "minecraft:cobblestone");
    q.P(-2, 1, 3, "minecraft:stone");
  },
};

/** Balista montada sobre um cavalete. @type {Peca} */
const BALISTA = {
  nome: "balista",
  x: [-2, 2], z: [-2, 2], alt: 4,
  f(c, q, h) {
    q.F(-1, 0, -1, 1, 0, 1, LAJE_M);
    q.P(0, 0, 0, TAB);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) q.P(a, 0, b, TORA);
    q.F(0, 1, 0, 0, 2, 0, TORA_L);
    // trilho e arcos
    q.F(0, 3, -1, 0, 3, 2, TAB);
    q.F(0, 4, -1, 0, 4, 2, GRADE);
    const rota = h < 0.35;
    q.F(-2, 3, 1, -1, 3, 1, CERCA);
    q.P(-2, 3, 0, CERCA);
    if (!rota) {
      q.F(1, 3, 1, 2, 3, 1, CERCA);
      q.P(2, 3, 0, CERCA);
      for (let lx = -1; lx <= 1; lx++) q.P(lx, 3, 0, c.CORRENTE, { pillar_axis: q.eixo("x") });
    } else {
      q.P(1, 0, 2, CERCA);
      q.P(2, 0, 1, TAB);
    }
    // virotes no chão e barril
    q.P(2, 0, -2, "minecraft:barrel", { facing_direction: 1 });
    q.P(-2, 0, -2, PONTA);
    q.P(1, 0, -2, PONTA);
    q.P(-2, 0, 2, GRADE);
  },
};

/** Tenda de campanha em A, com listras de clã e interior mobiliado. @type {Peca} */
const TENDA = {
  nome: "tenda",
  x: [-3, 3], z: [-3, 3], alt: 5,
  f(c, q, h) {
    const A = corDe(h * 12), B = h > 0.5 ? "white" : corDe(h * 12 + 7);
    for (let lz = -2; lz <= 2; lz++) {
      const cor = lz % 2 === 0 ? A : B;
      for (const [lx, ly] of [[-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]]) {
        const rasgo = c.hash(lz + Math.floor(h * 311), lx * 3 + ly, 8) < 0.07 && ly >= 1;
        if (rasgo) continue;
        q.P(lx, ly, lz, la(cor));
      }
    }
    // fundo fechado e frente aberta com abas
    q.F(-1, 0, -2, 1, 0, -2, la(A));
    q.P(0, 1, -2, la(A));
    q.P(-1, 0, 2, tp(B));
    q.P(1, 0, 2, tp(B));
    // estacas e cordas
    for (const [a, b] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) q.F(a, 0, b, a, 1, b, CERCA);
    q.P(0, 3, 2, CERCA);
    q.P(0, 4, 2, la(A));
    q.P(0, 3, -2, CERCA);
    // interior: enxerga como acampamento de verdade
    q.F(0, 0, -1, 0, 0, 0, la("white"));
    q.P(0, 1, 0, "minecraft:lantern", { hanging: true });
    q.P(1, 0, -1, "minecraft:barrel", { facing_direction: 1 });
    q.P(-1, 0, -1, "minecraft:chest", { "minecraft:cardinal_direction": q.card(1, 0) });
    q.P(0, 0, 1, tp("red"));
    q.P(-1, 0, 0, "minecraft:candle", { candles: 2, lit: true });
    // entulho
    q.P(2, 0, 3, "minecraft:hay_block");
    q.P(-2, 0, 3, "minecraft:skeleton_skull");
  },
};

/** Torre de vigia de madeira, com telhado e escada. @type {Peca} */
const TORRE = {
  nome: "torre",
  x: [-1, 1], z: [-3, 2], alt: 6,
  f(c, q) {
    for (const lz of [0, 2]) for (const lx of [-1, 1]) q.F(lx, 0, lz, lx, 1, lz, TORA);
    q.F(-1, 2, 0, 1, 2, 2, TAB);
    q.F(-1, 1, 1, -1, 1, 1, CERCA);
    q.F(1, 1, 1, 1, 1, 1, CERCA);
    q.P(0, 1, 1, "minecraft:cobblestone");
    // escada de acesso
    q.E(0, 0, -3, ESC_M, 0, 1);
    q.E(0, 1, -2, ESC_M, 0, 1);
    q.E(0, 2, -1, ESC_M, 0, 1);
    // guarda-corpo, postes e telhado
    for (const [lx, lz] of [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, 2], [1, 2], [0, 2]]) q.P(lx, 3, lz, CERCA);
    for (const [lx, lz] of [[-1, 0], [1, 0], [-1, 2], [1, 2]]) q.P(lx, 4, lz, TORA);
    q.F(-1, 5, 0, 1, 5, 2, LAJE_M);
    q.P(0, 5, 1, la("red"));
    q.P(0, 4, 1, "minecraft:lantern", { hanging: true });
    q.P(0, 3, 1, "minecraft:barrel", { facing_direction: 1 });
    q.P(0, 3, 2, "minecraft:skeleton_skull");
  },
};

/** Mesa de estratégia: mapa em miniatura com peões de clã, mapas, cadeiras e lustre. @type {Peca} */
const MESA = {
  nome: "mesa",
  x: [-3, 3], z: [-3, 3], alt: 5,
  f(c, q, h, gx, gz) {
    const terreno = ["minecraft:green_terracotta", "minecraft:lime_terracotta", "minecraft:brown_terracotta", "minecraft:light_blue_terracotta", "minecraft:gray_terracotta", "minecraft:yellow_terracotta"];
    for (let lz = -1; lz <= 1; lz++) for (let lx = -2; lx <= 2; lx++) {
      const borda = Math.abs(lx) === 2 || Math.abs(lz) === 1;
      q.P(lx, 0, lz, borda ? TAB : terreno[Math.floor(c.hash(lx + gx, lz + gz, 5) * terreno.length)]);
    }
    q.F(-2, 0, -1, -2, 0, -1, TORA);
    q.F(2, 0, 1, 2, 0, 1, TORA);
    q.P(-2, 0, 1, TORA);
    q.P(2, 0, -1, TORA);
    // peões: velas de duas cores (exércitos) e uma caveira (o general)
    q.P(-1, 1, 0, "minecraft:red_candle", { candles: 3, lit: false });
    q.P(0, 1, 0, "minecraft:blue_candle", { candles: 2, lit: false });
    q.P(1, 1, 0, "minecraft:yellow_candle", { candles: 1, lit: true });
    q.P(1, 1, -1, "minecraft:red_candle", { candles: 2, lit: false });
    q.P(-1, 1, 1, "minecraft:blue_candle", { candles: 1, lit: false });
    q.P(0, 1, -1, "minecraft:skeleton_skull");
    // cadeiras, estante de mapas e lectern
    q.E(-3, 0, 0, ESC_M, 1, 0);
    q.E(3, 0, 0, ESC_M, -1, 0);
    q.E(0, 0, 2, ESC_M, 0, -1);
    q.P(0, 0, -3, "minecraft:lectern", { "minecraft:cardinal_direction": q.card(0, 1) });
    q.P(-2, 0, -3, "minecraft:cartography_table");
    q.P(2, 0, -3, "minecraft:bookshelf");
    q.P(2, 1, -3, "minecraft:bookshelf");
    q.P(-3, 0, -3, "minecraft:barrel", { facing_direction: 1 });
    q.P(3, 0, 3, CERCA);
    q.P(3, 1, 3, "minecraft:lantern");
    lustre(c, ...q.pos(0, 0), c.tetoK(...q.pos(0, 0)) - 3, "minecraft:lantern", 0);
  },
};

/** Fogueira de acampamento com espeto, troncos de sentar e panela. @type {Peca} */
const FOGUEIRA = {
  nome: "fogueira",
  x: [-3, 3], z: [-3, 3], alt: 4,
  f(c, q, h) {
    q.P(0, 0, 0, "minecraft:campfire");
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 1], [0, -1]]) q.P(a, 0, b, "minecraft:cobblestone");
    q.P(-2, 0, 0, "minecraft:cobblestone");
    q.F(1, 0, 0, 1, 1, 0, CERCA);
    q.F(-1, 0, 0, -1, 1, 0, CERCA);
    q.P(0, 1, 0, CERCA);
    q.P(0, 1, -1, "minecraft:cauldron");
    // troncos para sentar e rolos de dormir
    q.P(-3, 0, 1, "minecraft:stripped_spruce_log", { pillar_axis: q.eixo("z") });
    q.P(-3, 0, 2, "minecraft:stripped_spruce_log", { pillar_axis: q.eixo("z") });
    q.P(3, 0, -1, "minecraft:stripped_spruce_log", { pillar_axis: q.eixo("z") });
    q.P(3, 0, -2, "minecraft:stripped_spruce_log", { pillar_axis: q.eixo("z") });
    q.E(1, 0, 3, ESC_M, 0, -1);
    q.E(-1, 0, 3, ESC_M, 0, -1);
    q.P(2, 0, 2, tp(corDe(h * 12)));
    q.P(3, 0, 2, tp(corDe(h * 12)));
    q.P(2, 0, 3, la("white"));
    q.P(-2, 0, -3, "minecraft:barrel", { facing_direction: 1 });
    q.P(2, 0, -3, "minecraft:hay_block");
  },
};

/** Armadura em suporte: peitoral de ferro, elmo de forja, ombros e pluma de clã. @type {Peca} */
const ARMADURA = {
  nome: "armadura",
  x: [-1, 1], z: [0, 1], alt: 5,
  f(c, q, h) {
    const cor = corDe(h * 12);
    q.F(0, 0, 0, 0, 0, 0, "minecraft:cobblestone_wall");
    if (h < 0.7) {
      q.P(0, 1, 0, "minecraft:iron_block");
      q.P(-1, 1, 0, GRADE);
      q.P(1, 1, 0, GRADE);
      q.P(0, 2, 0, "minecraft:blast_furnace", { "minecraft:cardinal_direction": q.card(0, 1) });
      q.P(0, 3, 0, la(cor));
      q.P(0, 1, 1, tp(cor));
      q.P(0, 0, 1, PONTA);
    } else {
      // caída: peças de ferro no chão
      q.P(0, 1, 0, "minecraft:blast_furnace", { "minecraft:cardinal_direction": q.card(1, 0) });
      q.P(1, 0, 0, "minecraft:iron_block");
      q.P(-1, 0, 1, GRADE);
      q.P(0, 0, 1, tp(cor));
    }
  },
};

/** Estante de armas: lanças, espadas e escudos pendurados, bigorna e pedra de amolar. @type {Peca} */
const ARSENAL = {
  nome: "arsenal",
  x: [-2, 2], z: [0, 1], alt: 5,
  f(c, q, h) {
    for (const lx of [-2, 2]) q.F(lx, 0, 0, lx, 3, 0, TORA);
    q.F(-1, 3, 0, 1, 3, 0, TORA_L);
    q.F(-1, 1, 0, 1, 1, 0, CERCA);
    // armas penduradas: espadas (barras), lanças (haste com ponta) e escudos (lã de clã)
    q.P(-1, 2, 0, GRADE);
    q.P(-1, 0, 0, GRADE);
    q.F(0, 0, 0, 0, 2, 0, CERCA);
    q.P(0, 3, 0, PONTA);
    q.P(1, 2, 0, la(corDe(h * 12)));
    q.P(1, 0, 0, la(corDe(h * 12 + 3)));
    q.P(-1, 0, 1, "minecraft:grindstone", { attachment: "standing", direction: 0 });
    q.P(1, 0, 1, "minecraft:anvil", { "minecraft:cardinal_direction": q.card(1, 0) });
    q.P(2, 0, 1, "minecraft:barrel", { facing_direction: 1 });
    q.P(-2, 0, 1, "minecraft:smithing_table");
  },
};

/** Boneco de treino e alvo de arco. @type {Peca} */
const BONECO = {
  nome: "boneco",
  x: [-1, 1], z: [-1, 1], alt: 4,
  f(c, q, h) {
    if (h < 0.5) {
      q.F(0, 0, 0, 0, 1, 0, CERCA);
      q.P(0, 2, 0, "minecraft:hay_block");
      q.P(0, 3, 0, "minecraft:carved_pumpkin", { "minecraft:cardinal_direction": q.card(0, 1) });
      q.P(-1, 2, 0, CERCA);
      q.P(1, 2, 0, CERCA);
      q.P(0, 2, 1, PONTA);
    } else {
      q.F(0, 0, 0, 0, 0, 0, CERCA);
      q.P(0, 1, 0, "minecraft:target");
      q.P(0, 0, 1, GRADE);
      q.P(1, 0, 1, GRADE);
      q.P(-1, 0, 0, "minecraft:hay_block");
    }
    q.P(0, 0, -1, "minecraft:hay_block");
  },
};

/** Cerca de estacas: fiada de estacas pontudas com travessa e arame farpado (teia). @type {Peca} */
const ESTACAS = {
  nome: "estacas",
  x: [-3, 3], z: [0, 0], alt: 4,
  f(c, q, h) {
    for (let lx = -3; lx <= 3; lx++) {
      if (c.hash(lx + Math.floor(h * 977), 3, 17) < 0.14) {
        q.P(lx, 0, 0, "minecraft:cobblestone_slab", { "minecraft:vertical_half": "bottom" });
        continue;
      }
      const alt = 1 + Math.floor(c.hash(lx + Math.floor(h * 977), 5, 17) * 2);
      q.F(lx, 0, 0, lx, alt, 0, lx % 2 ? CERCA : CERCA2);
      q.P(lx, alt + 1, 0, PONTA);
    }
    q.F(-3, 1, 0, 3, 1, 0, CERCA);
    for (const lx of [-2, 0, 2]) if (c.hash(lx, Math.floor(h * 977), 9) < 0.7) q.P(lx, 2, 0, "minecraft:web");
  },
};

/** Cavalo de frisa: três cruzetas de madeira com pontas, em fila. @type {Peca} */
const FRISA = {
  nome: "frisa",
  x: [-2, 2], z: [-1, 1], alt: 4,
  f(c, q, h) {
    for (const lx of [-2, 0, 2]) {
      q.F(lx, 0, 0, lx, 2, 0, TORA);
      q.P(lx, 1, -1, CERCA);
      q.P(lx, 1, 1, CERCA);
      q.P(lx, 2, -1, PONTA);
      q.P(lx, 2, 1, PONTA);
      q.P(lx, 0, -1, c.hash(lx, h * 99, 3) < 0.5 ? GRADE : AR);
      q.P(lx, 0, 1, GRADE);
    }
    q.F(-2, 1, 0, 2, 1, 0, CERCA);
  },
};

/** Trecho de trincheira: vala com sacos de areia, tábuas e degraus nas pontas. @type {Peca} */
const TRINCHEIRA_PECA = {
  nome: "trincheira",
  x: [-2, 2], z: [-4, 4], alt: 4,
  f(c, q, h) {
    const mad = h < 0.5 ? TAB : "minecraft:spruce_planks";
    for (let lz = -3; lz <= 3; lz++) {
      const ponta = Math.abs(lz) === 3;
      if (ponta) q.E(0, -1, lz, ESC_M, 0, Math.sign(lz));
      else q.P(0, -1, lz, AR);
      q.P(0, -2, lz, ponta || lz % 2 ? "minecraft:cobblestone" : mad);
      if (ponta) continue;
      // parapeito de sacos de areia dos dois lados
      for (const lx of [-1, 1]) {
        const r = c.hash(lz + lx * 5, Math.floor(h * 977), 6);
        q.P(lx, -1, lz, "minecraft:coarse_dirt");
        q.P(lx, 0, lz, r < 0.4 ? "minecraft:brown_wool" : r < 0.7 ? "minecraft:light_gray_wool" : r < 0.85 ? "minecraft:hay_block" : "minecraft:cobblestone");
      }
    }
    // escoras de madeira e uma tocha
    for (const lz of [-2, 0, 2]) for (const lx of [-1, 1]) if (c.hash(lz, lx + 3, Math.floor(h * 977)) < 0.4) q.P(lx, 1, lz, CERCA);
    q.P(-1, 1, 0, "minecraft:lantern");
    q.P(2, 0, -1, "minecraft:barrel", { facing_direction: 1 });
  },
};

/** Muro de pedra em ruínas: canto de forte com ameias, brechas e entulho em rampa. @type {Peca} */
const RUINA = {
  nome: "ruina",
  x: [-3, 3], z: [-3, 3], alt: 6,
  f(c, q, h) {
    const mats = ["minecraft:stone_bricks", "minecraft:cracked_stone_bricks", "minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:stone_bricks"];
    /** @type {(lx: number, lz: number, alt: number) => void} */
    const torre = (lx, lz, alt) => {
      for (let k = 0; k < alt; k++) q.P(lx, k, lz, mats[Math.floor(c.hash(lx + 3 * k, lz + Math.floor(h * 977), 4) * mats.length)]);
      q.P(lx, alt, lz, c.hash(lx, lz, 8) < 0.5 ? "minecraft:cobblestone_slab" : AR, { "minecraft:vertical_half": "bottom" });
    };
    for (let lx = -3; lx <= 3; lx++) {
      const r = c.hash(lx + Math.floor(h * 977), 2, 12);
      // ameias: alturas alternadas, com brechas
      const alt = r < 0.2 ? 1 : r < 0.5 ? 3 : 4 - (Math.abs(lx) % 2);
      torre(lx, -3, alt);
    }
    for (let lz = -2; lz <= 1; lz++) {
      const r = c.hash(lz + Math.floor(h * 977), 7, 13);
      torre(-3, lz, r < 0.25 ? 1 : r < 0.5 ? 3 : 4 - (Math.abs(lz) % 2));
    }
    torre(-3, -3, 5);
    q.P(-3, 5, -3, PONTA);
    // rampa de entulho
    for (const [lx, lz, e] of [[-2, -2, 2], [-1, -2, 1], [-2, -1, 1], [0, -2, 1]]) q.F(lx, 0, lz, lx, e - 1, lz, "minecraft:cobblestone");
    q.E(-1, 1, -2, "minecraft:stone_stairs", 1, 0);
    q.E(0, 1, -2, "minecraft:stone_stairs", 1, 0, true);
    q.P(1, 0, -2, "minecraft:cobblestone_slab", { "minecraft:vertical_half": "bottom" });
    q.P(-1, 0, -1, "minecraft:mossy_cobblestone");
    q.P(2, 0, -2, "minecraft:skeleton_skull");
    // estandarte caído sobre os escombros
    q.P(-2, 2, -2, la(corDe(h * 12)));
    q.P(-1, 2, -2, tp(corDe(h * 12)));
    q.P(0, 1, -1, tp(corDe(h * 12 + 4)));
  },
};

/** Carroça de suprimentos tombada: bancada, uma roda, barris e fardos. @type {Peca} */
const CARROCA = {
  nome: "carroca",
  x: [-2, 2], z: [-2, 2], alt: 4,
  f(c, q, h) {
    q.F(-1, 1, -1, 1, 1, 1, TAB);
    q.F(-1, 2, -1, -1, 2, 1, CERCA);
    q.F(1, 2, -1, 1, 2, 1, CERCA);
    q.P(0, 2, 1, "minecraft:barrel", { facing_direction: 1 });
    q.P(0, 2, -1, la("white"));
    q.P(0, 2, 0, "minecraft:hay_block");
    q.F(-1, 0, 0, -1, 0, 0, TORA_L);
    q.F(1, 0, 0, 1, 0, 0, TORA_L);
    q.P(-2, 0, 0, TORA);
    q.P(-2, 1, 0, "minecraft:iron_block");
    q.P(-2, 2, 0, TORA);
    q.P(-2, 1, 1, TORA);
    q.P(-2, 1, -1, TORA);
    // a outra roda está solta no chão
    q.P(2, 0, 0, TORA);
    q.P(2, 0, 1, TORA);
    q.P(2, 0, -1, TORA);
    // timão partido
    q.F(0, 0, -2, 0, 0, -2, CERCA);
    q.P(1, 0, -2, CERCA);
    q.P(0, 0, 2, "minecraft:barrel", { facing_direction: 1 });
    q.P(1, 0, 2, "minecraft:hay_block");
    q.P(-1, 0, 2, tp(corDe(h * 12)));
  },
};

/** Cama de campanha (enfermaria): maca de madeira, lençol e travesseiro. @type {Peca} */
const MACA = {
  nome: "maca",
  x: [-1, 1], z: [0, 2], alt: 3,
  f(c, q, h) {
    const sangue = h < 0.5;
    q.F(0, 0, 0, 0, 0, 1, la("white"));
    q.P(0, 1, 0, tp("white"));
    q.P(0, 1, 1, sangue ? tp("red") : tp("white"));
    q.P(-1, 0, 1, CERCA);
    q.P(1, 0, 1, "minecraft:barrel", { facing_direction: 1 });
    q.P(1, 1, 1, "minecraft:candle", { candles: 1, lit: true });
    q.P(0, 0, 2, "minecraft:white_carpet");
  },
};

/** Pira de caídos: pilha de toras e feno com caveiras e fumaça. @type {Peca} */
const PIRA = {
  nome: "pira",
  x: [-2, 2], z: [-2, 2], alt: 4,
  f(c, q, h) {
    q.F(-1, 0, -1, 1, 0, 1, "minecraft:hay_block");
    q.F(-1, 1, -1, 1, 1, 1, TORA);
    q.P(0, 2, 0, "minecraft:soul_campfire");
    q.P(-1, 2, 0, "minecraft:skeleton_skull");
    q.P(1, 2, -1, "minecraft:skeleton_skull");
    q.P(0, 2, 1, "minecraft:bone_block");
    for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) q.P(a, 0, b, c.hash(a, b, Math.floor(h * 977)) < 0.5 ? "minecraft:bone_block" : "minecraft:skeleton_skull");
    for (const [a, b] of [[2, 2], [-2, -2], [-2, 2], [2, -2]]) q.P(a, 0, b, la(corDe(a * 3 + b + h * 12)));
  },
};

/** Cratera de impacto: poço de cinzas e carvão com borda de terra revolvida. @param {Contexto} c @param {number} cx @param {number} cz @param {number} r */
function cratera(c, cx, cz, r) {
  for (let dz = -Math.ceil(r) - 1; dz <= Math.ceil(r) + 1; dz++) {
    for (let dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
      const x = cx + dx, z = cz + dz;
      if (!livre(c, x, z) || c.dwDe(x, z) < 2) continue;
      const d = Math.hypot(dx, dz);
      if (d <= r - 0.6) {
        c.set(x, -1, z, AR);
        c.bruto(x, -2, z, c.hash(x, z, 4) < 0.5 ? "minecraft:blackstone" : c.hash(x, z, 5) < 0.5 ? CARVAO : "minecraft:basalt");
      } else if (d <= r + 0.6) {
        c.bruto(x, -1, z, c.hash(x, z, 6) < 0.5 ? "minecraft:coarse_dirt" : "minecraft:gravel");
        if (c.hash(x, z, 7) < 0.3 && c.bloco(x, 0, z) === AR) c.set(x, 0, z, "minecraft:cobblestone");
      }
    }
  }
}

const PECAS_CAMPO = [MASTRO, CATAPULTA, TENDA, TORRE, FOGUEIRA, BALISTA, ARSENAL, RUINA, CARROCA, TRINCHEIRA_PECA, ESTACAS, FRISA, ARMADURA, BONECO, PIRA, MASTRO];

// ---------------------------------------------------------------- tema

/** Estandarte de clã pendurado na parede (nos blocos da parede): haste de tora no alto, pano de duas cores e a barra de baixo rasgada. (dx, dz) aponta da célula livre para a parede. @param {Contexto} c @param {number} gx @param {number} gz @param {number} dx @param {number} dz @param {number} h @param {number} larg @param {number} kTopo @param {number} kBase */
function estandarteParede(c, gx, gz, dx, dz, h, larg = 3, kTopo = 4, kBase = 1) {
  const ax = dz !== 0 ? 1 : 0, az = dx !== 0 ? 1 : 0;
  const A = corDe(h * 12), B = h > 0.5 ? "black" : corDe(h * 12 + 5);
  const padrao = Math.floor(h * 977) % 4;
  const meio = (larg - 1) / 2;
  for (let i = -meio; i <= meio; i++) {
    const x = gx + dx + ax * i, z = gz + dz + az * i;
    if (c.cel(x, z) !== C.PAREDE) continue;
    for (let k = kTopo; k >= kBase; k--) {
      const prof = (kTopo - k) / Math.max(1, kTopo - kBase);
      if (k === kTopo) {
        c.bruto(x, k, z, TORA_L);
        continue;
      }
      // rasgado: a metade de baixo perde pedaços e a última fiada vira farrapo
      if (prof > 0.55 && c.hash(x * 3 + k, z, 41) < (prof - 0.4) * 0.9) continue;
      let cor = A;
      if (padrao === 0 && (kTopo - k) % 3 === 1) cor = B;
      else if (padrao === 1 && i === 0) cor = B;
      else if (padrao === 2 && (i + k) % 2 === 0) cor = B;
      else if (padrao === 3 && (Math.abs(i) === meio || k === kTopo - 1)) cor = "black";
      if (k === kBase) cor = "black";
      c.bruto(x, k, z, la(cor));
    }
  }
}

/** Embaralha uma lista com o rng do contexto. @template T @param {Contexto} c @param {T[]} lista */
function embaralhar(c, lista) {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(c.rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

/** Braseiro de pedra: muretinha com fogueira em cima. @param {Contexto} c @param {number} gx @param {number} gz */
function braseiro(c, gx, gz) {
  if (!livre(c, gx, gz) || c.bloco(gx, 0, gz) !== AR) return;
  c.set(gx, 0, gz, "minecraft:cobblestone_wall");
  c.set(gx, 1, gz, "minecraft:campfire");
}

/** Lança cravada no chão (haste e ponta) ou espada (barras). @param {Contexto} c @param {number} gx @param {number} gz */
function lanca(c, gx, gz) {
  if (!livre(c, gx, gz) || c.bloco(gx, 0, gz) !== AR) return;
  const lanc = c.hash(gx, gz, 80) < 0.55;
  c.bruto(gx, 0, gz, lanc ? CERCA : GRADE);
  c.bruto(gx, 1, gz, lanc ? CERCA : GRADE);
  c.bruto(gx, 2, gz, lanc ? PONTA : GRADE);
}

/** Piso em disco com anel e roda de cores dos clãs. @param {Contexto} c @param {number} cx @param {number} cz @param {number} r @param {string} miolo @param {string} anelId @param {boolean} [roda] */
function pisoRedondo(c, cx, cz, r, miolo, anelId, roda = true) {
  disco(c, cx, cz, r, -1, miolo);
  anel(c, cx, cz, r - 1.2, r, -1, anelId);
  if (roda) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      const gx = cx + Math.round(Math.cos(a) * (r - 0.8)), gz = cz + Math.round(Math.sin(a) * (r - 0.8));
      if (livre(c, gx, gz)) c.bruto(gx, -1, gz, `minecraft:${CORES[i]}_concrete`);
    }
  }
}

/** @type {Tema} */
export const TEMA_GUERRA = {
  id: "guerra",
  nome: "O Campo de Guerra",
  rocha: "minecraft:deepslate",
  paletas: [BASE, ARENA, INTENDENCIA, TRINCHEIRA],
  alturaCorredor: 5,
  abobada: 1,
  forma: (s, i) => {
    if (s.papel === "boss" || s.papel === "entrada" || s.papel === "miniboss") return "octo";
    if (s.papel === "tesouro" || s.papel === "secreta" || s.papel === "descanso") return "ret";
    if (s.w * s.h > 140) return i % 3 === 0 ? "cruz" : i % 3 === 1 ? "ele" : "ret";
    return "ret";
  },
  vela: "minecraft:red_candle",
  comum(c, s) {
    const tkMeio = c.tetoK(s.x + (s.w >> 1), s.z + (s.h >> 1));
    // vigas de tora cruzando o teto, com faixas de pano de um clã penduradas em intervalos
    if (s.w >= 9 && s.h >= 9 && tkMeio >= 6) {
      let linha = 0;
      for (let gz = s.z + 3; gz < s.z + s.h - 2; gz += 6) {
        const cor = corDe(s.id * 3 + linha++);
        for (let gx = s.x; gx < s.x + s.w; gx++) {
          if (!livre(c, gx, gz)) continue;
          const tk = c.tetoK(gx, gz);
          c.bruto(gx, tk - 1, gz, TORA, { pillar_axis: "x" });
          if ((gx - s.x) % 4 === 2 && c.dwDe(gx, gz) >= 2) {
            const len = 2 + (c.hash(gx, gz, 33) < 0.5 ? 1 : 0);
            for (let k = 2; k < 2 + len; k++) c.bruto(gx, tk - k, gz, la(k === 1 + len ? "black" : cor));
          }
        }
      }
    }
    // estandartes de clã e braseiros ao longo das paredes
    for (let gz = s.z; gz < s.z + s.h; gz++) {
      for (let gx = s.x; gx < s.x + s.w; gx++) {
        if (!livre(c, gx, gz) || c.dwDe(gx, gz) !== 1) continue;
        for (const [dx, dz] of DIRS) {
          if (c.cel(gx + dx, gz + dz) !== C.PAREDE) continue;
          const h = c.hash(gx, gz, 61);
          const alt = c.altDe(gx, gz);
          if ((gx * 5 + gz * 3) % 7 === 0 && h < 0.7 && alt >= 6) {
            const largo = alt >= 9;
            estandarteParede(c, gx, gz, dx, dz, h, largo ? 5 : 3, Math.min(alt - 3, largo ? 9 : 4), largo ? 2 : 1);
          } else if ((gx * 3 + gz * 5) % 9 === 0) braseiro(c, gx, gz);
          break;
        }
      }
    }
    // lanternas penduradas por correntes
    const passo = s.w >= 15 ? 6 : 5;
    const cc = centroDe(s);
    for (let gz = s.z + 2; gz < s.z + s.h - 1; gz += passo) {
      for (let gx = s.x + 2; gx < s.x + s.w - 1; gx += passo) {
        if (!livre(c, gx, gz) || (gx === cc.x && gz === cc.z)) continue;
        const tk = c.tetoK(gx, gz);
        lustre(c, gx, gz, tk > 9 ? 6 : tk - 3, c.palDe(gx, gz).luz);
      }
    }
  },
  pecas: {
    entrada(c, s) {
      // acampamento de chegada: a rosa dos clãs no chão, altar entre mastros de clã, arco de volta, tenda ao fundo e braseiros
      const { x: cx, z: cz } = centroDe(s);
      pisoRedondo(c, cx, cz, 5.8, "minecraft:stone_bricks", "minecraft:polished_andesite");
      anel(c, cx, cz, 5.8, 6.8, -1, "minecraft:coarse_dirt");
      // altar de pedra e obsidiana chorona
      const ax = cx, az = cz - 3;
      c.fill(ax - 1, 0, az - 1, ax + 1, 0, az + 1, "minecraft:stone_bricks");
      for (const [dx, dz, fx, fz] of [[0, 2, 0, -1], [0, -2, 0, 1], [2, 0, -1, 0], [-2, 0, 1, 0]]) {
        for (const o of [-1, 0, 1]) {
          const x = dx === 0 ? ax + o : ax + dx, z = dx === 0 ? az + dz : az + o;
          if (livre(c, x, z)) c.set(x, 0, z, "minecraft:stone_brick_stairs", { weirdo_direction: c.dirEscada(fx, fz), upside_down_bit: false });
        }
      }
      c.set(ax, 1, az, "minecraft:crying_obsidian");
      c.set(ax, 2, az, "minecraft:soul_lantern");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(ax + dx, 1, az + dz, "minecraft:red_candle", { candles: 2, lit: true });
      c.meta.altar = { x: c.wx(ax), y: c.wy(1), z: c.wz(az) };
      // mastros dos clãs flanqueando o altar
      for (const [dx, dz, cor, cor2] of /** @type {[number, number, string, string][]} */ ([[-3, -5, "red", "white"], [3, -5, "blue", "white"], [-5, -1, "yellow", "black"], [5, -4, "lime", "black"]])) {
        const gx = cx + dx, gz = cz + dz;
        if (livre(c, gx, gz)) mastro(c, gx, gz, Math.min(c.tetoK(gx, gz) - 2, 6), cor, cor2, dx < 0 ? -1 : 1, 0, 3, 0.7);
      }
      // arco de volta, à direita
      const zona = arcoDePortal(c, cx + 4, cz, "z", { pilar: TORA_L, topo: TAB, brilho: "minecraft:gilded_blackstone", luz: "minecraft:soul_lantern" });
      c.portal(zona, "volta");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), volta: { x: c.wx(cx + 1) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 } };
      c.meta.chegada = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 };
      // tenda de campanha ao fundo, aberta para a roda, e braseiros nos cantos da roda
      const sul = quadro(c, cx, cz + 7, 0, -1);
      if (sul.cabe(-3, 3, -3, 3, 5)) TENDA.f(c, sul, 0.15, cx, cz + 7);
      for (const [dx, dz] of [[-5, 3], [5, 3], [-5, -5], [5, -5]]) braseiro(c, cx + dx, cz + dz);
      for (const [dx, dz, fx, fz] of [[-2, 4, 0, -1], [2, 4, 0, -1]]) {
        if (livre(c, cx + dx, cz + dz)) c.set(cx + dx, 0, cz + dz, "minecraft:stone_brick_stairs", { weirdo_direction: c.dirEscada(fx, fz), upside_down_bit: false });
      }
      for (const peca of [ARSENAL, ESTACAS, BONECO]) colocar(c, s, peca, 2);
      sujeira(c, s, 0.4);
    },
    combate(c, s) {
      // peças figurativas variadas, sorteadas sem repetir até a sala ficar bem composta
      const n = 3 + Math.floor((s.w * s.h) / 50);
      let ok = 0;
      for (const peca of embaralhar(c, PECAS_CAMPO)) {
        if (ok >= n) break;
        if (colocar(c, s, peca)) ok++;
      }
      for (let i = 0; i < 2; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (c.dwDe(gx, gz) >= 3) cratera(c, gx, gz, 1.5 + c.rng() * 1.2);
      }
      sujeira(c, s);
    },
    armadilha(c, s) {
      // campo minado: placas de pressão escondidas entre cercas de estacas e crateras
      const { x: cx, z: cz } = centroDe(s);
      for (let dz = -3; dz <= 3; dz += 2) {
        for (let dx = -3; dx <= 3; dx += 2) {
          if (!livre(c, cx + dx, cz + dz)) continue;
          c.set(cx + dx, -1, cz + dz, "minecraft:blackstone");
          c.set(cx + dx, 0, cz + dz, "minecraft:stone_pressure_plate");
        }
      }
      for (const peca of [ESTACAS, FRISA, ARMADURA, MASTRO, ESTACAS, BONECO]) colocar(c, s, peca, 2);
      for (let i = 0; i < 3; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (c.dwDe(gx, gz) >= 3 && Math.hypot(gx - cx, gz - cz) > 4.5) cratera(c, gx, gz, 1.3 + c.rng());
      }
      for (let i = 0; i < 12; i++) {
        const [gx, gz] = sorteio(c, s, 0);
        teia(c, gx, c.tetoK(gx, gz) - 1, gz);
      }
      sujeira(c, s, 0.8);
    },
    elite(c, s) {
      // posto de comando saqueado: tablado de pedra com o baú, armaduras nos cantos, arsenal e peças de campanha
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 3.6, -1, "minecraft:stone_bricks");
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (livre(c, cx + dx, cz + dz)) c.set(cx + dx, 0, cz + dz, "minecraft:stone_bricks");
      for (const [dx, dz, fx, fz] of [[0, 2, 0, -1], [0, -2, 0, 1], [2, 0, -1, 0], [-2, 0, 1, 0]]) {
        for (const o of [-1, 0, 1]) {
          const x = dx === 0 ? cx + o : cx + dx, z = dx === 0 ? cz + dz : cz + o;
          if (livre(c, x, z)) c.set(x, 0, z, "minecraft:stone_brick_stairs", { weirdo_direction: c.dirEscada(fx, fz), upside_down_bit: false });
        }
      }
      c.bau(cx, 1, cz, "south", "elite");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(cx + dx, 1, cz + dz, "minecraft:red_candle", { candles: 3, lit: true });
      for (const [dx, dz, cor] of /** @type {[number, number, string][]} */ ([[-3, -3, "red"], [3, -3, "blue"], [-3, 3, "yellow"], [3, 3, "purple"]])) {
        const q = quadro(c, cx + dx, cz + dz, 0, 1);
        q.P(0, 0, 0, "minecraft:cobblestone_wall");
        q.P(0, 1, 0, "minecraft:iron_block");
        q.P(-1, 1, 0, GRADE);
        q.P(1, 1, 0, GRADE);
        q.P(0, 2, 0, "minecraft:blast_furnace", { "minecraft:cardinal_direction": dz < 0 ? "south" : "north" });
        q.P(0, 3, 0, la(cor));
      }
      for (const peca of embaralhar(c, [ARSENAL, MASTRO, TENDA, ESTACAS, CATAPULTA, CARROCA])) colocar(c, s, peca, 2);
      sujeira(c, s, 0.7);
    },
    miniboss(c, s) {
      // posto do capitão: um mastro enorme de duas faces no centro, base de pedra, armaduras, braseiros e a chave
      const { x: cx, z: cz } = centroDe(s);
      const comp = s.w >= s.h;
      const dx = comp ? 1 : 0, dz = comp ? 0 : 1;
      const raio = Math.min(s.w, s.h) / 2 - 0.4;
      pisoRedondo(c, cx, cz, raio, "minecraft:polished_andesite", "minecraft:cobblestone", false);
      const tk = c.tetoK(cx, cz);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (livre(c, cx + a, cz + b)) c.set(cx + a, 0, cz + b, "minecraft:stone_stairs", { weirdo_direction: c.dirEscada(-a, -b), upside_down_bit: false });
      }
      for (const [a, b] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) if (livre(c, cx + a, cz + b)) c.set(cx + a, 0, cz + b, "minecraft:cobblestone_slab", { "minecraft:vertical_half": "bottom" });
      c.set(cx, 0, cz, "minecraft:stone_bricks");
      const alto = Math.min(tk - 2, 8);
      c.fill(cx, 1, cz, cx, 3, cz, TORA);
      c.fill(cx, 4, cz, cx, alto, cz, CERCA);
      c.set(cx, alto + 1, cz, PONTA);
      bandeira(c, cx, cz, alto, dx, dz, "red", "white", 4, 0.3);
      bandeira(c, cx, cz, alto, -dx, -dz, "blue", "white", 4, 0.8);
      for (const [a, b] of [[3, 1], [-3, -1], [3, -1], [-3, 1]]) braseiro(c, cx + (comp ? a : b), cz + (comp ? b : a));
      for (const sinal of [1, -1]) {
        const q = quadro(c, cx + (comp ? 0 : 2 * sinal), cz + (comp ? 2 * sinal : 0), comp ? 0 : -sinal, comp ? -sinal : 0);
        ARMADURA.f(c, q, 0.1, 0, 0);
      }
      c.bau(cx + (comp ? 3 : 0), 0, cz + (comp ? 0 : 3), comp ? "west" : "north", "chave");
      c.set(cx + (comp ? 3 : 0), 1, cz + (comp ? 0 : 3), "minecraft:soul_lantern");
      sujeira(c, s, 0.3);
    },
    boss(c, s) {
      // o campo final do General: arena de pedra escura, fileiras de mastros de clã em cada lado, estandartes gigantes, crateras e lanças cravadas
      const { x: cx, z: cz } = centroDe(s);
      const comp = s.w >= s.h;
      const ux = comp ? 1 : 0, uz = comp ? 0 : 1;
      const meio = (comp ? s.w : s.h) >> 1;
      const tk = c.tetoK(cx, cz);
      const raio = Math.min(s.w, s.h) / 2;
      pisoRedondo(c, cx, cz, 3.4, "minecraft:polished_blackstone", "minecraft:gilded_blackstone");
      disco(c, cx, cz, 1.6, -1, "minecraft:cracked_polished_blackstone_bricks");
      const q = quadro(c, cx, cz, ux, uz);
      // fileiras de mastros nas duas laterais: um clã diferente em cada um, o pano apontando para o fundo da sala
      let n = 0;
      for (const lz of [-3, 1, 5]) {
        if (Math.abs(lz) >= meio - 1) continue;
        for (const lx of [-3, 3]) {
          const [gx, gz] = q.pos(lx, lz);
          if (!livre(c, gx, gz) || c.dwDe(gx, gz) < 1) continue;
          mastro(c, gx, gz, tk - 3, corDe(n * 2), n % 2 ? "black" : "white", ux, uz, 3, 0.5 + n * 0.04);
          n++;
        }
      }
      // estandarte-mestre partido: tora caída ao fundo com o pano em farrapos
      const fim = Math.min(meio - 2, 5);
      for (let lx = -2; lx <= 2; lx++) q.P(lx, 0, fim, lx % 2 ? TORA : TORA_L, { pillar_axis: q.eixo("x") });
      q.P(3, 0, fim, "minecraft:cobblestone");
      for (let lx = -2; lx <= 2; lx++) {
        if (c.hash(lx, 1, 55) < 0.2) continue;
        q.P(lx, 0, fim - 1, tp("red"));
        if (c.hash(lx, 2, 55) < 0.6) q.P(lx, 0, fim - 2, tp(lx % 2 ? "black" : "red"));
      }
      // braseiros, lanças cravadas e crateras
      for (const [lx, lz] of [[-3, -1], [3, -1], [-3, 3], [3, 3]]) braseiro(c, ...q.pos(lx, lz));
      for (let i = 0; i < 14; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (Math.hypot(gx - cx, gz - cz) > 3.8) lanca(c, gx, gz);
      }
      for (let i = 0; i < 2; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (c.dwDe(gx, gz) >= 3 && Math.hypot(gx - cx, gz - cz) > 5) cratera(c, gx, gz, 1.2 + c.rng() * 0.6);
      }
      // lustre de lanternas das almas sobre o general
      lustre(c, cx, cz, tk - 5, "minecraft:soul_lantern", 2);
      // portal para o andar 2 na ponta da sala, de frente para a arena
      const zona = comp
        ? arcoDePortal(c, s.x + 2, cz, "z", { pilar: TORA_L, topo: TAB, brilho: "minecraft:gilded_blackstone", luz: "minecraft:soul_lantern" })
        : arcoDePortal(c, cx, s.z + 2, "x", { pilar: TORA_L, topo: TAB, brilho: "minecraft:gilded_blackstone", luz: "minecraft:soul_lantern" });
      c.portal(zona, "desce");
      const ch = comp ? { x: c.wx(s.x + 6) + 0.5, z: c.wz(cz) + 0.5 } : { x: c.wx(cx) + 0.5, z: c.wz(s.z + 6) + 0.5 };
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), desce: { x: ch.x, y: c.wy(0), z: ch.z } };
      c.meta.arena = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz) + 0.5, raio: raio - 2, sala: s.id };
      sujeira(c, s, 0.3);
    },
    tesouro(c, s) {
      // intendência: tenda de suprimentos com baús, fardos, barris e sacas
      const { x: cx, z: cz } = centroDe(s);
      for (const dz of [-2, 2]) {
        for (let dx = -2; dx <= 2; dx++) if (livre(c, cx + dx, cz + dz) && c.hash(dx, dz, 15) < 0.8) c.set(cx + dx, 0, cz + dz, c.hash(dx, dz, 16) < 0.5 ? "minecraft:barrel" : "minecraft:hay_block");
      }
      c.bau(cx - 2, 0, cz, "east", "tesouro");
      c.bau(cx + 2, 0, cz, "west", "tesouro");
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.set(cx + dx, 0, cz + dz, tp("red"));
      c.set(cx, 0, cz, "minecraft:red_candle", { candles: 3, lit: true });
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
        if (!livre(c, cx + dx, cz + dz)) continue;
        c.fill(cx + dx, 0, cz + dz, cx + dx, dx > 0 ? 1 : 0, cz + dz, "minecraft:barrel");
      }
      for (const [dx, dz] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) if (livre(c, cx + dx, cz + dz)) c.set(cx + dx, 0, cz + dz, la(corDe(dx * 2 + dz + 6)));
      lustre(c, cx, cz, c.tetoK(cx, cz) - 3, "minecraft:lantern", 2);
      colocar(c, s, CARROCA, 1);
      sujeira(c, s, 0.4);
    },
    secreta(c, s) {
      this.tesouro(c, s);
      const { x: cx, z: cz } = centroDe(s);
      c.bau(cx, 0, cz - 3, "south", "tesouro");
      c.set(cx, 0, cz - 4, "minecraft:soul_lantern");
    },
    descanso(c, s) {
      // enfermaria de campanha: macas, lençóis, fogueira com panela, poções e cruzes de caídos. A vida volta aos poucos (regra no tempo de execução)
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, Math.min(s.w, s.h) / 2 - 1, -1, "minecraft:podzol");
      anel(c, cx, cz, 0.5, 2.5, -1, "minecraft:cobblestone");
      c.set(cx, 0, cz, "minecraft:campfire");
      for (const dx of [-1, 1]) {
        c.set(cx + dx, 0, cz, CERCA);
        c.set(cx + dx, 1, cz, CERCA);
      }
      c.set(cx, 1, cz, CERCA);
      c.set(cx, 0, cz + 1, "minecraft:cauldron");
      for (const [dx, dz, fx, fz] of [[2, 1, -1, 0], [-2, 1, 1, 0]]) MACA.f(c, quadro(c, cx + dx, cz + dz, fx, fz), dx > 0 ? 0.2 : 0.7, 0, 0);
      for (const [dx, dz] of [[-4, -1], [4, -1]]) MACA.f(c, quadro(c, cx + dx, cz + dz, dx < 0 ? 1 : -1, 0), (dx + dz) % 2 ? 0.3 : 0.8, 0, 0);
      c.set(cx - 2, 0, cz - 2, "minecraft:brewing_stand");
      c.set(cx - 1, 0, cz - 2, "minecraft:composter");
      c.set(cx + 1, 0, cz - 2, "minecraft:barrel", { facing_direction: 1 });
      c.set(cx + 2, 0, cz - 2, "minecraft:white_candle", { candles: 3, lit: true });
      // cruzes de caídos na fileira do fundo
      for (let i = -2; i <= 2; i++) {
        const gx = cx + i * 2, gz = cz + Math.min(2, (s.h >> 1) - 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR && c.dwDe(gx, gz) >= 1) {
          c.set(gx, 0, gz, "minecraft:cobblestone");
          c.set(gx, 1, gz, CERCA);
          c.set(gx, 2, gz, "minecraft:skeleton_skull");
        }
      }
      for (const peca of [MASTRO, FOGUEIRA]) colocar(c, s, peca, 1);
      sujeira(c, s, 0.3);
      c.meta.extra = { ...(c.meta.extra ?? {}), descanso: s.id };
    },
  },
};
