// @ts-check
// Andar 5: O CORAÇÃO DAS NOVE CAUDAS. O núcleo místico da Vulpus: um santuário kitsune subterrâneo de laca vermelha, ouro e jade,
// com torii, lanternas de pedra, lagos que brilham, a árvore sagrada, raposas de pedra e os nove pedestais (um por cauda).
// No fundo, a arena do boss: um mandala de nove raios e o Coração pulsando, preso por correntes sobre o chão de ouro.
// Grandioso e um pouco triste: alguém lembrou deles.
import { C } from "./masm_grade.js";
import { AR, anel, centroDe, disco, escada, lustre, sorteio, tapete, livre, arcoDePortal } from "./masm_pecas.js";

/** @typedef {import("./masm_construir.js").Tema} Tema */
/** @typedef {import("./masm_pecas.js").Contexto} Contexto */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */

const OURO = "minecraft:gold_block";
const LACA = "minecraft:stripped_crimson_stem";
const TIJOLO = "minecraft:polished_blackstone_bricks";
const POLIDO = "minecraft:polished_blackstone";
const DOURADO = "minecraft:gilded_blackstone";
const QUARTZO = "minecraft:quartz_block";
const VERMELHO = "minecraft:red_concrete";
const LUZ_MAR = "minecraft:sea_lantern";

/** As nove caudas: cor do vidro e do concreto de cada uma (fogo, brasa, raio, vento, floresta, água, lua, sonho, luz). */
const NOVE = ["red", "orange", "yellow", "lime", "cyan", "light_blue", "purple", "magenta", "white"];
const conc = (/** @type {string} */ k) => `minecraft:${k}_concrete`;
const vidro = (/** @type {string} */ k) => `minecraft:${k}_stained_glass`;
const tapeteDe = (/** @type {string} */ k) => `minecraft:${k}_carpet`;

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BASE = {
  nome: "Santuário",
  parede: [[TIJOLO, 5], ["minecraft:red_nether_brick", 3], ["minecraft:cracked_polished_blackstone_bricks", 2], ["minecraft:crimson_planks", 2]],
  rodape: POLIDO,
  friso: DOURADO,
  pilar: LACA,
  topo: OURO,
  piso: [[TIJOLO, 4], [POLIDO, 3], ["minecraft:cracked_polished_blackstone_bricks", 1], [DOURADO, 1]],
  pisoCorredor: [[POLIDO, 4], ["minecraft:blackstone", 3], ["minecraft:cracked_polished_blackstone_bricks", 2], ["minecraft:red_nether_brick", 1]],
  borda: "minecraft:red_nether_brick",
  teto: "minecraft:dark_oak_planks",
  viga: "minecraft:crimson_stem",
  luz: "minecraft:lantern",
  vitral: "minecraft:shroomlight",
  escada: "minecraft:polished_blackstone_brick_stairs",
  laje: "minecraft:polished_blackstone_brick_slab",
  muro: "minecraft:polished_blackstone_brick_wall",
  sujo: "minecraft:cracked_polished_blackstone_bricks",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const SALAO = {
  ...BASE,
  nome: "Salão do Coração",
  parede: [[TIJOLO, 4], ["minecraft:crimson_planks", 3], ["minecraft:red_nether_brick", 2], [DOURADO, 2]],
  friso: OURO,
  piso: [[POLIDO, 3], [TIJOLO, 3], [DOURADO, 1]],
  borda: DOURADO,
  teto: "minecraft:dark_oak_planks",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const JADE = {
  ...BASE,
  nome: "Relicário de jade",
  parede: [["minecraft:dark_prismarine", 3], ["minecraft:prismarine_bricks", 2], ["minecraft:warped_planks", 3], [TIJOLO, 1]],
  rodape: POLIDO,
  friso: OURO,
  pilar: "minecraft:stripped_warped_stem",
  piso: [["minecraft:prismarine_bricks", 3], ["minecraft:dark_prismarine", 3], ["minecraft:warped_planks", 1]],
  borda: "minecraft:warped_planks",
  teto: "minecraft:dark_prismarine",
  luz: "minecraft:soul_lantern",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const CORREDOR = {
  ...BASE,
  nome: "Alameda",
  parede: [["minecraft:blackstone", 4], [TIJOLO, 4], ["minecraft:cracked_polished_blackstone_bricks", 2], ["minecraft:red_nether_brick", 1]],
  rodape: POLIDO,
  friso: "minecraft:crimson_planks",
  teto: "minecraft:dark_oak_planks",
};

// ------------------------------------------------------------------ pincel orientado

/**
 * Pincel com eixos locais: lx para a direita, ly para cima, lz para a frente (fx, fz). Só coloca em células de sala.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz
 */
function orientar(c, gx, gz, fx, fz) {
  const rx = -fz, rz = fx;
  /** @type {(lx: number, ly: number, lz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const P = (lx, ly, lz, id, est) => {
    const x = gx + lx * rx + lz * fx, z = gz + lx * rz + lz * fz;
    if (livre(c, x, z)) c.set(x, ly, z, id, est);
  };
  /** @type {(lx1: number, ly1: number, lz1: number, lx2: number, ly2: number, lz2: number, id: string) => void} */
  const F = (lx1, ly1, lz1, lx2, ly2, lz2, id) => {
    for (let ly = ly1; ly <= ly2; ly++) for (let lz = lz1; lz <= lz2; lz++) for (let lx = lx1; lx <= lx2; lx++) P(lx, ly, lz, id);
  };
  /** Escada que sobe no sentido local (a, b). @type {(lx: number, ly: number, lz: number, id: string, a: number, b: number, inv?: boolean) => void} */
  const E = (lx, ly, lz, id, a, b, inv = false) => {
    const x = gx + lx * rx + lz * fx, z = gz + lx * rz + lz * fz;
    escada(c, x, ly, z, id, a * rx + b * fx, a * rz + b * fz, inv);
  };
  return { P, F, E };
}

/** Quadrado de lado direto para o vetor cardinal de maior eixo. @param {number} dx @param {number} dz @returns {[number, number]} */
function cardinal(dx, dz) {
  return Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dz) || 1];
}

// ------------------------------------------------------------------ peças figurativas

/**
 * Torii vermelho: dois pilares com base preta, trave (nuki), viga de cima (kasagi) curvada nas pontas, placa dourada e lanterna.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {"x" | "z"} eixo  direção em que o vão corre @param {number} v  meia-abertura
 * @param {number} [altura]
 */
function torii(c, gx, gz, eixo, v = 2, altura = 0) {
  const ex = eixo === "x" ? 1 : 0, ez = eixo === "z" ? 1 : 0;
  const tk = c.tetoK(gx, gz);
  const h = altura || Math.max(4, Math.min(8, tk - 2));
  /** @type {(l: number, k: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const S = (l, k, id, est) => {
    const x = gx + ex * l, z = gz + ez * l;
    if (livre(c, x, z)) c.set(x, k, z, id, est);
  };
  for (const l of [-v, v]) {
    S(l, 0, POLIDO);
    for (let k = 1; k < h; k++) S(l, k, LACA);
    S(l, 1, "minecraft:crimson_stem");
  }
  for (let l = -v - 1; l <= v + 1; l++) if (Math.abs(l) !== v) S(l, h - 2, "minecraft:crimson_planks");
  for (let l = -v; l <= v; l++) S(l, h - 1, l === 0 ? OURO : POLIDO);
  for (let l = -v - 2; l <= v + 2; l++) S(l, h, "minecraft:crimson_planks");
  if (h + 1 < tk) for (const l of [-v - 2, -v - 1, v + 1, v + 2]) S(l, h + 1, "minecraft:crimson_slab", { "minecraft:vertical_half": "bottom" });
  for (const l of [-v - 2, v + 2]) S(l, h, POLIDO);
  S(0, h - 3, "minecraft:lantern", { hanging: true });
}

/** Lanterna de pedra (tōrō): base, haste, caixa de luz e chapéu. @param {Contexto} c @param {number} gx @param {number} gz @param {boolean} [azul] */
function toro(c, gx, gz, azul = false) {
  if (!livre(c, gx, gz)) return;
  c.set(gx, 0, gz, TIJOLO);
  c.set(gx, 1, gz, "minecraft:polished_blackstone_brick_wall");
  c.set(gx, 2, gz, azul ? "minecraft:soul_lantern" : "minecraft:lantern");
  c.set(gx, 3, gz, "minecraft:polished_blackstone_brick_slab", { "minecraft:vertical_half": "bottom" });
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (livre(c, gx + a, gz + b)) c.bruto(gx + a, 2, gz + b, "minecraft:polished_blackstone_brick_wall");
  c.set(gx, 4, gz, "minecraft:polished_blackstone_button", { facing_direction: 1 });
}

/**
 * Raposa de pedra sentada olhando para (fx, fz): pedestal, corpo de quartzo, babador vermelho com sino de ouro, olhos de ouro e caudas.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz
 * @param {{ corpo?: string, caudas?: string[], juba?: boolean }} [o]
 */
function raposa(c, gx, gz, fx, fz, o = {}) {
  const { P, F } = orientar(c, gx, gz, fx, fz);
  const corpo = o.corpo ?? QUARTZO;
  const caudas = o.caudas ?? ["orange", "red", "yellow"];
  const tk = c.tetoK(gx, gz);
  F(-1, 0, -2, 1, 0, 1, TIJOLO);
  P(0, 0, 1, DOURADO);
  F(-1, 1, -1, 1, 2, 0, corpo);
  P(-1, 1, 1, corpo); P(1, 1, 1, corpo); P(-1, 2, 1, corpo); P(1, 2, 1, corpo);
  P(0, 2, 1, OURO);
  F(-1, 3, 0, 1, 3, 0, corpo);
  F(-1, 3, 1, 1, 3, 1, VERMELHO);
  F(-1, 4, -1, 1, 5, 1, corpo);
  P(0, 4, 2, o.juba ? "minecraft:red_nether_brick" : "minecraft:black_concrete");
  P(-1, 5, 1, OURO); P(1, 5, 1, OURO);
  if (o.juba) {
    P(-2, 4, 0, "minecraft:red_nether_brick"); P(2, 4, 0, "minecraft:red_nether_brick");
    P(-2, 5, 0, "minecraft:red_nether_brick"); P(2, 5, 0, "minecraft:red_nether_brick");
    P(0, 6, 0, "minecraft:red_nether_brick");
  } else if (tk > 6) {
    P(-1, 6, 0, corpo); P(1, 6, 0, corpo);
  }
  // caudas em leque atrás
  const n = caudas.length;
  for (let i = 0; i < n; i++) {
    const lx = i - (n - 1) / 2;
    const topo = 4 - Math.round(Math.abs(lx) * 0.8);
    for (let k = 1; k <= topo; k++) P(lx, k, -2, k === topo ? "minecraft:white_concrete" : conc(caudas[i]));
  }
}

/**
 * Grande raposa guardiã: pedestal largo, corpo imenso e nove caudas coloridas abertas em leque atrás dela.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz
 */
function raposaGrande(c, gx, gz, fx, fz) {
  const { P, F } = orientar(c, gx, gz, fx, fz);
  const tk = c.tetoK(gx, gz);
  const alto = (/** @type {number} */ k) => k <= tk - 1;
  F(-3, 0, -3, 3, 0, 3, TIJOLO);
  F(-3, 0, 3, 3, 0, 3, DOURADO);
  F(-2, 1, -3, 2, 1, 2, POLIDO);
  F(-2, 2, -2, 2, 4, 0, QUARTZO);
  F(-2, 2, -2, 2, 2, 0, "minecraft:quartz_bricks");
  F(-1, 5, -1, 1, 6, 1, QUARTZO);
  // patas dianteiras
  for (const lx of [-1, 1]) F(lx, 2, 1, lx, 4, 2, QUARTZO);
  for (const lx of [-1, 1]) P(lx, 2, 3, QUARTZO);
  // babador vermelho com sino de ouro
  F(-1, 5, 2, 1, 6, 2, VERMELHO);
  P(0, 5, 2, OURO); P(0, 4, 2, OURO);
  // cabeça
  F(-2, 7, -1, 2, 8, 2, QUARTZO);
  F(-1, 7, 3, 1, 7, 3, QUARTZO);
  P(0, 7, 3, "minecraft:black_concrete");
  P(-1, 8, 2, OURO); P(1, 8, 2, OURO);
  P(-2, 7, 2, "minecraft:quartz_bricks"); P(2, 7, 2, "minecraft:quartz_bricks");
  // orelhas com pontas vermelhas
  for (const lx of [-2, 2]) {
    if (alto(9)) P(lx, 9, 0, QUARTZO);
    if (alto(10)) P(lx, 10, 0, VERMELHO);
  }
  // as nove caudas, cada uma de uma cor, com ponta branca
  for (let i = 0; i < 9; i++) {
    const lx = i - 4;
    const topo = 8 - Math.round(Math.abs(lx) * 0.9);
    const base = Math.abs(lx) >= 4 ? 0 : 1;
    for (let k = base; k <= topo; k++) {
      if (!alto(k)) break;
      P(lx, k, -3, k >= topo - 1 ? "minecraft:white_concrete" : conc(NOVE[i]));
    }
  }
}

/** Pequeno pagode: plataforma, quatro colunas de laca, biombos de papel, altar com lanterna e telhado de duas águas em pirâmide. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function pagode(c, gx, gz, fx, fz) {
  const { P, F, E } = orientar(c, gx, gz, fx, fz);
  const tk = c.tetoK(gx, gz);
  const hb = tk >= 10 ? 3 : 2;
  F(-3, 0, -3, 3, 0, 3, TIJOLO);
  F(-2, 0, -2, 2, 0, 2, DOURADO);
  for (const lx of [-1, 0, 1]) E(lx, 0, 4, "minecraft:polished_blackstone_brick_stairs", 0, -1);
  // colunas de laca nos cantos do alpendre e do corpo
  for (const [lx, lz] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) F(lx, 1, lz, lx, hb, lz, LACA);
  // biombos de papel
  for (let k = 1; k <= hb; k++) {
    P(0, k, -1, "minecraft:white_concrete"); P(-1, k, 0, "minecraft:white_concrete"); P(1, k, 0, "minecraft:white_concrete");
    if (k > 1) P(0, k, 1, "minecraft:white_concrete");
  }
  P(0, 1, 0, OURO);
  P(0, 2, 0, "minecraft:soul_lantern");
  // telhado em pirâmide
  const t = hb + 1;
  F(-1, t, -1, 1, t, 1, TIJOLO);
  for (let lz = -3; lz <= 3; lz++) {
    for (let lx = -3; lx <= 3; lx++) {
      const r = Math.max(Math.abs(lx), Math.abs(lz));
      if (r === 3) E(lx, t - 1 + 0, lz, "minecraft:red_nether_brick_stairs", Math.abs(lx) >= Math.abs(lz) ? -Math.sign(lx) : 0, Math.abs(lx) >= Math.abs(lz) ? 0 : -Math.sign(lz));
      else if (r === 2) E(lx, t, lz, "minecraft:polished_blackstone_brick_stairs", Math.abs(lx) >= Math.abs(lz) ? -Math.sign(lx) : 0, Math.abs(lx) >= Math.abs(lz) ? 0 : -Math.sign(lz));
      else if (r === 1 && t + 1 < tk) E(lx, t + 1, lz, "minecraft:red_nether_brick_stairs", Math.abs(lx) >= Math.abs(lz) ? -Math.sign(lx) : 0, Math.abs(lx) >= Math.abs(lz) ? 0 : -Math.sign(lz));
    }
  }
  if (t + 1 < tk) P(0, t + 1, 0, TIJOLO);
  if (t + 2 < tk) P(0, t + 2, 0, OURO);
  if (t + 3 < tk) P(0, t + 3, 0, "minecraft:end_rod", { facing_direction: 1 });
  // lanternas penduradas sob o beiral
  for (const [lx, lz] of [[-3, 0], [3, 0], [0, -3]]) P(lx, hb, lz, "minecraft:lantern", { hanging: true });
}

/**
 * Pedestal de uma cauda: base de pedra negra, coluna da cor, cristal brilhante (núcleo de lanterna do mar e vidro colorido) e tapete.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {number} i  cauda (0 a 8) @param {boolean} [feixe]  coluna de vidro até o teto
 */
function pedestal(c, gx, gz, i, feixe = false) {
  const k = NOVE[i % 9];
  const tk = c.tetoK(gx, gz);
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (!livre(c, gx + dx, gz + dz)) continue;
      const m = Math.max(Math.abs(dx), Math.abs(dz));
      if (m === 2 && Math.abs(dx) + Math.abs(dz) < 4) c.bruto(gx + dx, 0, gz + dz, tapeteDe(k));
      else if (m === 1) c.set(gx + dx, 0, gz + dz, Math.abs(dx) + Math.abs(dz) === 2 ? OURO : TIJOLO);
    }
  }
  if (!livre(c, gx, gz)) return;
  c.set(gx, 0, gz, TIJOLO);
  c.set(gx, 1, gz, conc(k));
  c.set(gx, 2, gz, "minecraft:white_concrete");
  c.set(gx, 3, gz, OURO);
  c.set(gx, 4, gz, LUZ_MAR);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (livre(c, gx + a, gz + b)) c.set(gx + a, 4, gz + b, vidro(k));
  c.set(gx, 5, gz, vidro(k));
  if (feixe) for (let y = 6; y <= tk - 1; y++) c.set(gx, y, gz, vidro(k));
  for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (livre(c, gx + a, gz + b)) c.set(gx + a, 1, gz + b, "minecraft:candle", { candles: 2, lit: true });
}

/** Árvore sagrada: tronco de cerejeira com cinta vermelha, galhos, copa rosada com lanternas e pétalas no chão. @param {Contexto} c @param {number} gx @param {number} gz @param {number} raio  raio da copa */
function arvore(c, gx, gz, raio) {
  const tk = c.tetoK(gx, gz);
  const topo = Math.min(tk - 1, 10);
  const cy = Math.max(3, topo - 2);
  const folha = "minecraft:cherry_leaves";
  const tronco = "minecraft:cherry_log";
  for (let k = 0; k <= cy; k++) c.set(gx, k, gz, k === 1 ? "minecraft:crimson_hyphae" : tronco);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (livre(c, gx + a, gz + b) && c.hash(gx + a, gz + b, 3) < 0.8) c.set(gx + a, 0, gz + b, tronco);
    if (livre(c, gx + a, gz + b)) c.set(gx + a, cy - 1, gz + b, tronco);
  }
  const ry = Math.max(1.6, Math.min(2.6, topo - cy + 1));
  /** @type {Map<string, number>} */
  const maisBaixa = new Map();
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dz = -raio; dz <= raio; dz++) {
      for (let dx = -raio; dx <= raio; dx++) {
        const q = (dx * dx + dz * dz) / (raio * raio + 0.5) + (dy * dy) / (ry * ry);
        if (q > 1 - c.hash(gx + dx, gz + dz, dy + 11) * 0.3) continue;
        const y = cy + dy;
        if (y > topo || y < 2 || !livre(c, gx + dx, gz + dz)) continue;
        if (dx === 0 && dz === 0 && y <= cy) continue;
        c.set(gx + dx, y, gz + dz, folha, { persistent_bit: true });
        const ch = `${dx},${dz}`;
        if (!maisBaixa.has(ch) || (maisBaixa.get(ch) ?? 0) > y) maisBaixa.set(ch, y);
      }
    }
  }
  for (const [ch, y] of maisBaixa) {
    const [dx, dz] = ch.split(",").map(Number);
    if (y - 1 >= 2 && c.hash(gx + dx, gz + dz, 41) < 0.14 && c.bloco(gx + dx, y - 1, gz + dz) === AR) c.set(gx + dx, y - 1, gz + dz, c.hash(gx + dx, gz + dz, 42) < 0.5 ? "minecraft:lantern" : "minecraft:soul_lantern", { hanging: true });
  }
  for (let dz = -raio - 1; dz <= raio + 1; dz++) for (let dx = -raio - 1; dx <= raio + 1; dx++) {
    if (livre(c, gx + dx, gz + dz) && c.bloco(gx + dx, 0, gz + dz) === AR && c.hash(gx + dx, gz + dz, 51) < 0.35) c.bruto(gx + dx, 0, gz + dz, "minecraft:pink_petals");
  }
}

/**
 * Lago elíptico: água luminosa com fundo de lanternas do mar, carpas (blocos laranja e brancos no fundo), vitórias-régias, ilhotas com
 * lanterna e borda de pedra lavrada. "lava" faz um lago de magma.
 * @param {Contexto} c @param {number} cx @param {number} cz @param {number} rx @param {number} rz @param {"agua" | "lava"} [liq]
 */
function lago(c, cx, cz, rx, rz, liq = "agua") {
  const R = Math.ceil(Math.max(rx, rz)) + 2;
  for (let dz = -R; dz <= R; dz++) {
    for (let dx = -R; dx <= R; dx++) {
      const gx = cx + dx, gz = cz + dz;
      if (!livre(c, gx, gz)) continue;
      const q = (dx / rx) ** 2 + (dz / rz) ** 2;
      if (q <= 1 && c.dwDe(gx, gz) >= 2) {
        const h = c.hash(gx, gz, 61);
        if (liq === "agua") {
          c.set(gx, -1, gz, "minecraft:water");
          c.bruto(gx, -2, gz, h < 0.3 ? LUZ_MAR : h < 0.36 ? "minecraft:orange_concrete" : h < 0.4 ? "minecraft:white_concrete" : "minecraft:dark_prismarine");
          if (q < 0.8 && c.hash(gx, gz, 62) < 0.13) c.bruto(gx, 0, gz, "minecraft:waterlily");
        } else {
          c.set(gx, -1, gz, "minecraft:lava");
          c.bruto(gx, -2, gz, "minecraft:magma");
        }
      } else if (q <= 1.55) {
        c.bruto(gx, -1, gz, q < 1.25 ? "minecraft:chiseled_polished_blackstone" : c.hash(gx, gz, 63) < 0.3 ? OURO : TIJOLO);
      }
    }
  }
  // ilhotas com lanterna
  if (liq === "agua") {
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const gx = cx + dx, gz = cz + dz;
      const q = (dx / rx) ** 2 + (dz / rz) ** 2;
      if (livre(c, gx, gz) && q > 0.25 && q < 0.75 && c.hash(gx, gz, 64) < 0.045) {
        c.set(gx, -1, gz, TIJOLO);
        c.set(gx, 0, gz, c.hash(gx, gz, 65) < 0.5 ? "minecraft:lantern" : "minecraft:soul_lantern");
      }
    }
  }
}

/**
 * Ponte de laca sobre um lago: tabuado, corrimão, postes com lanterna e escadas nas pontas.
 * @param {Contexto} c @param {number} cx @param {number} cz @param {"x" | "z"} eixo  sentido da travessia @param {number} meio  meio-comprimento
 */
function ponte(c, cx, cz, eixo, meio) {
  const ex = eixo === "x" ? 1 : 0, ez = 1 - ex;
  for (let l = -meio; l <= meio; l++) {
    for (let w = -2; w <= 2; w++) {
      const gx = cx + ex * l + ez * w, gz = cz + ez * l + ex * w;
      if (!livre(c, gx, gz)) continue;
      if (Math.abs(l) === meio) {
        if (Math.abs(w) <= 1) escada(c, gx, 0, gz, "minecraft:crimson_stairs", -ex * Math.sign(l), -ez * Math.sign(l));
        continue;
      }
      c.set(gx, 0, gz, Math.abs(w) === 2 ? "minecraft:stripped_crimson_stem" : "minecraft:crimson_planks");
      if (Math.abs(w) === 2) {
        const poste = Math.abs(l) === meio - 1 || l === 0;
        c.set(gx, 1, gz, poste ? LACA : "minecraft:crimson_fence");
        if (poste) {
          c.set(gx, 2, gz, "minecraft:crimson_fence");
          c.set(gx, 3, gz, "minecraft:lantern");
        }
      }
    }
  }
}

/** Mesinha de oferenda com bolo e velas: alguém lembrou. @param {Contexto} c @param {number} gx @param {number} gz */
function oferenda(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  c.set(gx, 0, gz, TIJOLO);
  c.set(gx, 1, gz, "minecraft:cake");
  for (const [a, b] of [[-1, 0], [1, 0]]) if (livre(c, gx + a, gz + b)) c.set(gx + a, 0, gz + b, "minecraft:red_candle", { candles: 3, lit: true });
  if (livre(c, gx, gz + 1)) c.set(gx, 0, gz + 1, "minecraft:polished_blackstone_brick_slab", { "minecraft:vertical_half": "bottom" });
}

/** Pilar de laca com base de pedra e capitel de ouro, do chão ao teto. @param {Contexto} c @param {number} gx @param {number} gz */
function pilarLaca(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  c.set(gx, 0, gz, TIJOLO);
  c.fill(gx, 1, gz, gx, tk - 2, gz, LACA);
  c.set(gx, 1, gz, "minecraft:crimson_stem");
  c.set(gx, tk - 2, gz, OURO);
  c.set(gx, tk - 1, gz, "minecraft:chiseled_polished_blackstone");
}

/** Lustre de lanternas de comprimento variado. @param {Contexto} c @param {number} gx @param {number} gz @param {number} desce @param {boolean} [azul] */
function pendurar(c, gx, gz, desce, azul = false) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  lustre(c, gx, gz, Math.max(2, tk - 1 - desce), azul ? "minecraft:soul_lantern" : "minecraft:lantern");
}

/** Portas da sala: células de porta coladas na sala. @param {Contexto} c @param {Sala} s @returns {[number, number][]} */
function portasDe(c, s) {
  /** @type {[number, number][]} */
  const out = [];
  for (let gz = s.z - 2; gz < s.z + s.h + 2; gz++) for (let gx = s.x - 2; gx < s.x + s.w + 2; gx++) if (c.cel(gx, gz) === C.PORTA) out.push([gx, gz]);
  return out;
}

// ------------------------------------------------------------------ o tema

/** @type {Tema} */
export const TEMA_CORACAO = {
  id: "coracao",
  nome: "O Coração das Nove Caudas",
  rocha: "minecraft:blackstone",
  paletas: [BASE, SALAO, JADE, CORREDOR],
  alturaCorredor: 5,
  abobada: 2,
  forma: (s) => (s.papel === "boss" || s.papel === "entrada" || s.papel === "miniboss" || s.papel === "descanso" ? "oval" : "ret"),
  vela: "minecraft:red_candle",
  comum(c, s) {
    const boss = s.papel === "boss";
    // forro de madeira escura com vigas de laca em grade (kōshi) e lanternas nos cruzamentos
    if (!boss && s.w >= 9) {
      for (let gz = s.z + 2; gz < s.z + s.h - 1; gz++) {
        for (let gx = s.x + 2; gx < s.x + s.w - 1; gx++) {
          if (!livre(c, gx, gz) || c.dwDe(gx, gz) < 2) continue;
          const nx = (gx - s.x) % 6 === 3, nz = (gz - s.z) % 6 === 3;
          if (nx || nz) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, nx && nz ? OURO : LACA);
          if (nx && nz && c.hash(gx, gz, 13) < 0.75) pendurar(c, gx, gz, 2 + Math.floor(c.hash(gx, gz, 14) * 3), c.hash(gx, gz, 15) < 0.25);
        }
      }
    }
    // pilares de laca encostados nas paredes (o chefe ganha os dele na peça)
    if (!boss && s.w * s.h >= 80) {
      for (let gz = s.z + 2; gz < s.z + s.h - 1; gz++) for (let gx = s.x + 2; gx < s.x + s.w - 1; gx++) {
        if (livre(c, gx, gz) && c.dwDe(gx, gz) === 2 && ((gx - s.x) + (gz - s.z)) % 5 === 0) pilarLaca(c, gx, gz);
      }
    }
    // fogos-fátuos: bastões de luz soltos no ar e lanternas azuis nas alturas
    const area = s.w * s.h;
    for (let i = 0; i < Math.round(area / 22); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (livre(c, gx, gz)) {
        const tk = c.tetoK(gx, gz);
        const y = 2 + Math.floor(c.rng() * Math.max(1, tk - 4));
        if (c.bloco(gx, y, gz) === AR) c.bruto(gx, y, gz, "minecraft:end_rod", { facing_direction: 1 });
      }
    }
    for (let i = 0; i < Math.round(area / 40); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      pendurar(c, gx, gz, 1 + Math.floor(c.rng() * 4), true);
    }
    // pétalas caídas e tufos de musgo luminoso no chão
    for (let i = 0; i < Math.round(area / 16); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.bruto(gx, 0, gz, c.hash(gx, gz, 17) < 0.8 ? "minecraft:pink_petals" : "minecraft:moss_carpet");
    }
    // faixas vermelhas com borla de ouro penduradas junto às paredes
    for (let i = 0; i < Math.round(area / 50); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (livre(c, gx, gz) && c.dwDe(gx, gz) === 1) {
        const tk = c.tetoK(gx, gz);
        c.bruto(gx, tk - 1, gz, VERMELHO);
        c.bruto(gx, tk - 2, gz, VERMELHO);
        c.bruto(gx, tk - 3, gz, OURO);
      }
    }
  },
  pecas: {
    entrada(c, s) {
      // portal do santuário: piso de mosaico, torii sobre o altar, lanternas de pedra, raposas guardiãs e uma oferenda esquecida
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 6.5, -1, POLIDO);
      anel(c, cx, cz, 5.5, 6.5, -1, DOURADO);
      anel(c, cx, cz, 3.5, 4.5, -1, "minecraft:red_nether_brick");
      disco(c, cx, cz, 2.5, -1, TIJOLO);
      // altar de obsidiana chorona
      const hz = Math.max(2, (s.h >> 1) - 1);
      const ax = cx, az = cz - Math.min(3, hz);
      c.fill(ax - 1, 0, az - 1, ax + 1, 0, az + 1, TIJOLO);
      c.fill(ax, 0, az, ax, 0, az, OURO);
      for (const [dx, dz, fx, fz] of [[0, 2, 0, -1], [0, -2, 0, 1], [2, 0, -1, 0], [-2, 0, 1, 0]]) for (const o of [-1, 0, 1]) escada(c, dx === 0 ? ax + o : ax + dx, 0, dx === 0 ? az + dz : az + o, "minecraft:polished_blackstone_brick_stairs", fx, fz);
      c.set(ax, 1, az, "minecraft:crying_obsidian");
      c.set(ax, 2, az, "minecraft:soul_lantern");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(ax + dx, 1, az + dz, "minecraft:red_candle", { candles: 2, lit: true });
      c.meta.altar = { x: c.wx(ax), y: c.wy(1), z: c.wz(az) };
      // torii sobre o altar e um segundo, menor, na chegada
      torii(c, cx, cz + 1, "x", 2);
      // arco de volta, à direita
      const zona = arcoDePortal(c, cx + 4, cz, "z", { pilar: LACA, topo: OURO, brilho: DOURADO, luz: "minecraft:soul_lantern" });
      c.portal(zona, "volta");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), volta: { x: c.wx(cx + 1) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 } };
      c.meta.chegada = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 };
      // tapete vermelho com friso dourado da chegada ao altar
      tapete(c, cx - 1, cz - 2, cx + 1, cz + 3, "minecraft:red_carpet");
      tapete(c, cx, cz - 2, cx, cz + 3, "minecraft:yellow_carpet");
      // raposas guardiãs e lanternas de pedra em volta
      raposa(c, cx - 4, az, 1, 0);
      raposa(c, cx + 4, az, -1, 0);
      for (const [dx, dz] of [[-3, 2], [3, 2], [-3, -1], [3, -1]]) toro(c, cx + dx, cz + dz, dx < 0);
      oferenda(c, cx - 5, cz + 3);
      pendurar(c, cx, cz, 4);
      pendurar(c, cx - 3, cz + 3, 3, true);
    },
    combate(c, s) {
      const { x: cx, z: cz } = centroDe(s);
      const v = Math.floor(c.hash(s.x, s.z, 11) * 5);
      const menor = Math.min(s.w, s.h);
      if (v === 0) {
        // jardim do lago: lago de água luminosa com ponte, ilhotas e uma cerejeira numa margem
        const rz = Math.max(2.6, Math.min(4.5, menor / 2 - 3));
        lago(c, cx, cz, rz + 1.5, rz);
        ponte(c, cx, cz, "z", Math.ceil(rz) + 2);
        if (menor >= 13) arvore(c, s.x + 3, s.z + 3, 2);
        for (const [dx, dz] of [[-1, -1], [1, 1]]) toro(c, cx + dx * (Math.floor(s.w / 2) - 2), cz + dz * (Math.floor(s.h / 2) - 2), dx < 0);
      } else if (v === 1) {
        // alameda de torii: três arcos em fila, lanternas de pedra dos lados e raposas ao fundo
        const horiz = s.w >= s.h;
        for (let i = -1; i <= 1; i++) torii(c, horiz ? cx + i * 5 : cx, horiz ? cz : cz + i * 5, horiz ? "z" : "x", 2);
        for (let i = -1; i <= 1; i++) for (const l of [-3, 3]) toro(c, horiz ? cx + i * 5 + (i === 0 ? 2 : 2) : cx + l, horiz ? cz + l : cz + i * 5 + 2, l < 0);
        if (horiz) tapete(c, s.x + 2, cz - 1, s.x + s.w - 3, cz + 1, "minecraft:red_carpet");
        else tapete(c, cx - 1, s.z + 2, cx + 1, s.z + s.h - 3, "minecraft:red_carpet");
        const [fx, fz] = horiz ? [1, 0] : [0, 1];
        raposa(c, horiz ? s.x + 3 : cx - 3, horiz ? cz - 3 : s.z + 3, fx, fz);
        raposa(c, horiz ? s.x + 3 : cx + 3, horiz ? cz + 3 : s.z + 3, fx, fz);
      } else if (v === 2) {
        // pátio do pagode: pagode no meio, praça de duas cores e lanternas de pedra nos cantos
        disco(c, cx, cz, 5.5, -1, DOURADO);
        anel(c, cx, cz, 4.5, 5.5, -1, "minecraft:red_nether_brick");
        const [fx, fz] = [[0, 1], [1, 0], [0, -1], [-1, 0]][Math.floor(c.hash(s.x, s.z, 12) * 4)];
        pagode(c, cx, cz, fx, fz);
        for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) toro(c, cx + dx, cz + dz, (dx + dz) % 2 === 0);
      } else if (v === 3) {
        // pátio das raposas: quatro raposas em volta de um braseiro de fogo azul, tapete em cruz
        tapete(c, cx - 1, s.z + 2, cx + 1, s.z + s.h - 3, "minecraft:red_carpet");
        tapete(c, s.x + 2, cz - 1, s.x + s.w - 3, cz + 1, "minecraft:red_carpet");
        disco(c, cx, cz, 2.2, -1, OURO);
        c.set(cx, 0, cz, TIJOLO);
        c.set(cx, 1, cz, "minecraft:soul_campfire");
        for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) c.set(cx + dx, 0, cz + dz, "minecraft:soul_lantern");
        const r = Math.min(5, Math.floor(menor / 2) - 2);
        raposa(c, cx, cz - r, 0, 1);
        raposa(c, cx, cz + r, 0, -1);
        raposa(c, cx - r, cz, 1, 0);
        raposa(c, cx + r, cz, -1, 0);
      } else {
        // fenda de lava: um rio de magma cortando a sala, com duas pontes de laca e braseiros
        const horiz = s.w >= s.h;
        for (let l = -Math.floor((horiz ? s.h : s.w) / 2) + 1; l < Math.floor((horiz ? s.h : s.w) / 2); l++) {
          for (let w = -1; w <= 1; w++) {
            const gx = horiz ? cx + w : cx + l, gz = horiz ? cz + l : cz + w;
            if (livre(c, gx, gz) && c.dwDe(gx, gz) >= 2) {
              c.set(gx, -1, gz, "minecraft:lava");
              c.bruto(gx, -2, gz, "minecraft:magma");
            }
          }
          for (const w of [-2, 2]) {
            const gx = horiz ? cx + w : cx + l, gz = horiz ? cz + l : cz + w;
            if (livre(c, gx, gz)) c.bruto(gx, -1, gz, "minecraft:chiseled_polished_blackstone");
          }
        }
        for (const b of [-3, 3]) {
          for (let w = -2; w <= 2; w++) {
            const gx = horiz ? cx + w : cx + b, gz = horiz ? cz + b : cz + w;
            if (!livre(c, gx, gz)) continue;
            c.set(gx, 0, gz, Math.abs(w) === 2 ? LACA : "minecraft:crimson_planks");
            if (Math.abs(w) === 2) c.set(gx, 1, gz, "minecraft:crimson_fence");
          }
        }
        for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) toro(c, cx + dx, cz + dz, dx < 0);
        raposa(c, horiz ? cx - 4 : cx, horiz ? cz : cz - 4, horiz ? 1 : 0, horiz ? 0 : 1, { corpo: "minecraft:smooth_quartz", caudas: ["red", "orange", "yellow"] });
      }
    },
    armadilha(c, s) {
      // salão dos mosaicos: placas de ouro no piso xadrez, lanternas de pedra e cortinas de lanternas azuis
      const { x: cx, z: cz } = centroDe(s);
      for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
        if (!livre(c, cx + dx, cz + dz)) continue;
        c.bruto(cx + dx, -1, cz + dz, (dx + dz) % 2 === 0 ? "minecraft:red_nether_brick" : DOURADO);
      }
      for (let dz = -3; dz <= 3; dz += 2) for (let dx = -3; dx <= 3; dx += 2) if (livre(c, cx + dx, cz + dz)) {
        c.set(cx + dx, -1, cz + dz, "minecraft:cracked_polished_blackstone_bricks");
        c.set(cx + dx, 0, cz + dz, "minecraft:light_weighted_pressure_plate");
      }
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) toro(c, cx + dx, cz + dz, true);
      for (let i = 0; i < 10; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        pendurar(c, gx, gz, 1 + Math.floor(c.rng() * 5), true);
      }
      for (let i = 0; i < 8; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, "minecraft:pointed_dripstone", { dripstone_thickness: "tip", hanging: true });
      }
      raposa(c, cx, s.z + 2, 0, 1);
    },
    elite(c, s) {
      // sala do guardião komainu: tablado de mosaico, quatro cães-leão de pedra, o baú no centro e braseiros
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 5.5, -1, "minecraft:red_nether_brick");
      anel(c, cx, cz, 4.5, 5.5, -1, DOURADO);
      disco(c, cx, cz, 3.2, -1, POLIDO);
      for (const [dx, dz] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        c.set(cx + dx, 0, cz + dz, "minecraft:polished_blackstone_brick_slab", { "minecraft:vertical_half": "bottom" });
      }
      c.set(cx, 0, cz, TIJOLO);
      c.bau(cx, 1, cz, "south", "elite");
      const pedra = "minecraft:polished_deepslate";
      raposa(c, cx - 5, cz, 1, 0, { corpo: pedra, juba: true, caudas: [] });
      raposa(c, cx + 5, cz, -1, 0, { corpo: pedra, juba: true, caudas: [] });
      raposa(c, cx, cz - 5, 0, 1, { corpo: pedra, juba: true, caudas: [] });
      raposa(c, cx, cz + 5, 0, -1, { corpo: pedra, juba: true, caudas: [] });
      for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) toro(c, cx + dx, cz + dz, false);
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) c.set(cx + dx, 0, cz + dz, "minecraft:soul_campfire");
    },
    miniboss(c, s) {
      // câmara da chave: mandala de quatro cores, anel de colunas de laca, lago de oferendas e a chave num pedestal de ouro
      const { x: cx, z: cz } = centroDe(s);
      const R = Math.min(s.w, s.h) / 2 - 2;
      disco(c, cx, cz, R, -1, POLIDO);
      for (let dz = -Math.ceil(R); dz <= Math.ceil(R); dz++) for (let dx = -Math.ceil(R); dx <= Math.ceil(R); dx++) {
        const r = Math.hypot(dx, dz);
        if (r > R || !livre(c, cx + dx, cz + dz)) continue;
        if (Math.abs(r - 3) < 0.55) c.bruto(cx + dx, -1, cz + dz, OURO);
        else if (Math.abs(r - R + 0.8) < 0.5) c.bruto(cx + dx, -1, cz + dz, "minecraft:red_nether_brick");
        else if (Math.abs(dx) < 1 || Math.abs(dz) < 1) c.bruto(cx + dx, -1, cz + dz, conc(NOVE[(dx > 0 ? 0 : 2) + (dz > 0 ? 1 : 0) + (Math.abs(dx) < 1 ? 4 : 0)]));
      }
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        pilarLaca(c, cx + Math.round(Math.cos(a) * (R - 2)), cz + Math.round(Math.sin(a) * (R - 2)));
      }
      // centro: a chave sobre um altar de ouro, cercada de fogos-fátuos
      const kx = cx + Math.round(R - 3);
      c.fill(kx - 1, 0, cz - 1, kx + 1, 0, cz + 1, TIJOLO);
      c.set(kx, 0, cz, OURO);
      c.bau(kx, 1, cz, "west", "chave");
      c.set(kx, 2, cz, "minecraft:soul_lantern");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(kx + dx, 1, cz + dz, "minecraft:red_candle", { candles: 3, lit: true });
      raposa(c, kx + 1, cz - 3, -1, 0);
      raposa(c, kx + 1, cz + 3, -1, 0);
      for (const dz of [-3, 3]) toro(c, cx - Math.round(R) + 3, cz + dz, dz < 0);
    },
    boss(c, s) {
      // salão do Coração: mandala de nove raios, nove pedestais, a grande raposa de nove caudas e o Coração pulsando no ar
      const { x: cx, z: cz } = centroDe(s);
      const raio = Math.min(s.w, s.h) / 2;
      const R = Math.round(raio - 3.5);
      const portas = portasDe(c, s);
      // lado do fundo: o mais longe das portas
      let melhor = [0, -1], pontos = -1;
      for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
        const px = cx + dx * raio, pz = cz + dz * raio;
        const d = portas.length ? Math.min(...portas.map(([a, b]) => Math.hypot(a - px, b - pz))) : 99;
        if (d > pontos) { pontos = d; melhor = [dx, dz]; }
      }
      const fundo = Math.atan2(melhor[1], melhor[0]);
      /** @type {number[]} */
      const angulos = [];
      for (let i = 0; i < 9; i++) angulos.push(fundo + (33 + i * (294 / 8)) * (Math.PI / 180));
      // piso: mandala (aneis de ouro e nove raios das cores das caudas)
      for (let dz = -Math.ceil(raio); dz <= Math.ceil(raio); dz++) {
        for (let dx = -Math.ceil(raio); dx <= Math.ceil(raio); dx++) {
          const gx = cx + dx, gz = cz + dz;
          if (!livre(c, gx, gz)) continue;
          const r = Math.hypot(dx, dz);
          const a = Math.atan2(dz, dx);
          if (r <= 3) { c.bruto(gx, -1, gz, OURO); continue; }
          if (r <= 3.9) { c.bruto(gx, -1, gz, r <= 3.5 ? "minecraft:red_nether_brick" : POLIDO); continue; }
          let cor = "";
          for (let i = 0; i < 9; i++) {
            const d = Math.atan2(Math.sin(a - angulos[i]), Math.cos(a - angulos[i]));
            if (Math.abs(d) < Math.PI / 2 && r * Math.abs(Math.sin(d)) < 0.9 && r < R + 0.5) cor = conc(NOVE[i]);
          }
          if (cor) c.bruto(gx, -1, gz, cor);
          else if (Math.abs(r - R * 0.62) < 0.6) c.bruto(gx, -1, gz, OURO);
          else if (r > raio - 2 && r < raio - 1) c.bruto(gx, -1, gz, (gx + gz) % 2 === 0 ? "minecraft:red_nether_brick" : DOURADO);
        }
      }
      // os nove pedestais, com feixes de vidro até o teto, e pilares de laca entre eles
      for (let i = 0; i < 9; i++) {
        const px = Math.round(cx + Math.cos(angulos[i]) * R), pz = Math.round(cz + Math.sin(angulos[i]) * R);
        if (portas.some(([a, b]) => Math.hypot(a - px, b - pz) < 3.5)) continue;
        pedestal(c, px, pz, i, true);
        if (i < 8) {
          const m = (angulos[i] + angulos[i + 1]) / 2;
          pilarLaca(c, Math.round(cx + Math.cos(m) * (R + 1.5)), Math.round(cz + Math.sin(m) * (R + 1.5)));
        }
      }
      // grande raposa ao fundo, de frente para o centro
      const gx0 = Math.round(cx + melhor[0] * (raio - 4.5)), gz0 = Math.round(cz + melhor[1] * (raio - 4.5));
      raposaGrande(c, gx0, gz0, -melhor[0], -melhor[1]);
      // o Coração: esfera de luz presa por correntes sobre o centro, com nove cristais em órbita
      const yc = 7;
      const tk = c.tetoK(cx, cz);
      for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (r > 2.45 || yc + dy >= tk - 1) continue;
        const h = c.hash(cx + dx + dy * 7, cz + dz, 71);
        c.bruto(cx + dx, yc + dy, cz + dz, r < 1.5 ? "minecraft:glowstone" : h < 0.55 ? "minecraft:shroomlight" : h < 0.8 ? "minecraft:glowstone" : OURO);
      }
      for (let y = yc + 3; y <= tk - 1; y++) c.bruto(cx, y, cz, c.CORRENTE);
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) for (let y = yc + 2; y <= tk - 1; y++) c.bruto(cx + dx, y, cz + dz, c.CORRENTE);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const ox = cx + Math.round(Math.cos(a) * 4.4), oz = cz + Math.round(Math.sin(a) * 4.4);
        const oy = yc - 1 + Math.round(Math.sin(a * 2) * 1.2);
        c.bruto(ox, oy, oz, LUZ_MAR);
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) c.bruto(ox + dx, oy + dy, oz + dz, vidro(NOVE[i]));
      }
      // rosa de ouro no teto, em cima do Coração
      for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
        const r = Math.hypot(dx, dz);
        if (r <= 4 && livre(c, cx + dx, cz + dz)) c.bruto(cx + dx, c.tetoK(cx + dx, cz + dz), cz + dz, r <= 1.5 ? OURO : r <= 2.6 ? "minecraft:red_nether_brick" : r <= 3.2 ? OURO : "minecraft:crimson_planks");
      }
      // raios de laca no teto ligando a rosa às paredes e lustres entre os pedestais
      for (let i = 0; i < 9; i++) {
        for (let r = 5; r < raio - 1; r++) {
          const gx = Math.round(cx + Math.cos(angulos[i]) * r), gz = Math.round(cz + Math.sin(angulos[i]) * r);
          if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, r % 3 === 0 ? OURO : LACA);
        }
        const m = angulos[i] + Math.PI / 9;
        pendurar(c, Math.round(cx + Math.cos(m) * R * 0.62), Math.round(cz + Math.sin(m) * R * 0.62), 3 + (i % 3), i % 2 === 0);
      }
      // lanternas de pedra e braseiros ao longo do muro, e pétalas que caem do Coração
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.15;
        const gx = Math.round(cx + Math.cos(a) * (raio - 2)), gz = Math.round(cz + Math.sin(a) * (raio - 2));
        if (!portas.some(([p, q]) => Math.hypot(p - gx, q - gz) < 3) && Math.hypot(gx - gx0, gz - gz0) > 6) toro(c, gx, gz, i % 2 === 0);
      }
      c.meta.extra = { ...(c.meta.extra ?? {}), coracao: { x: c.wx(cx) + 0.5, y: c.wy(yc), z: c.wz(cz) + 0.5 } };
      c.meta.arena = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz) + 0.5, raio: raio - 2, sala: s.id };
    },
    tesouro(c, s) {
      // relicário de jade: dois baús, pilhas de ouro, pedestais coloridos, uma raposa guardiã e cristais de ametista
      const { x: cx, z: cz } = centroDe(s);
      tapete(c, cx - 1, cz - 1, cx + 1, cz + 3, "minecraft:red_carpet");
      for (const dx of [-3, 3]) {
        c.fill(cx + dx - 1, 0, cz + 2, cx + dx + 1, 0, cz + 2, OURO);
        c.bau(cx + dx, 1, cz + 2, "north", "tesouro");
      }
      for (const [dx, dz] of [[-2, -2], [2, -2]]) {
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) c.set(cx + dx + a, 0, cz + dz + b, OURO);
        c.set(cx + dx, 1, cz + dz, OURO);
        c.set(cx + dx + 1, 1, cz + dz + 1, "minecraft:emerald_block");
      }
      pedestal(c, cx, cz - 2, Math.floor(c.hash(s.x, s.z, 3) * 9));
      raposa(c, cx - 4, cz - 1, 1, 0, { caudas: ["lime", "cyan", "white"] });
      for (let i = 0; i < 8; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, "minecraft:amethyst_cluster", { facing_direction: 1 });
      }
    },
    secreta(c, s) {
      this.tesouro(c, s);
      const { x: cx, z: cz } = centroDe(s);
      c.bau(cx, 1, cz + 1, "north", "tesouro");
      c.fill(cx - 1, 0, cz + 1, cx + 1, 0, cz + 1, OURO);
    },
    descanso(c, s) {
      // jardim da árvore sagrada: cerejeira no centro num canteiro de musgo, lagoa com ilhotas, bancos e fogo azul. A vida volta aos poucos aqui.
      const { x: cx, z: cz } = centroDe(s);
      const r = Math.min(s.w, s.h) / 2 - 1;
      disco(c, cx, cz, r, -1, "minecraft:moss_block");
      anel(c, cx, cz, r - 1, r, -1, TIJOLO);
      disco(c, cx, cz, 3.5, -1, "minecraft:grass_block");
      anel(c, cx, cz, 3.5, 4.6, -1, DOURADO);
      arvore(c, cx, cz, Math.max(2, Math.min(4, Math.floor(r) - 2)));
      for (let i = 0; i < 24; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR && c.bloco(gx, -1, gz) !== TIJOLO) c.set(gx, 0, gz, ["minecraft:azure_bluet", "minecraft:pink_tulip", "minecraft:cornflower", "minecraft:short_grass", "minecraft:lily_of_the_valley"][Math.floor(c.rng() * 5)]);
      }
      // bancos de pedra voltados para a árvore e lanternas de pedra
      for (const [dx, dz, fx, fz] of [[4, 0, -1, 0], [-4, 0, 1, 0], [0, 4, 0, -1], [0, -4, 0, 1]]) escada(c, cx + dx, 0, cz + dz, "minecraft:polished_blackstone_brick_stairs", fx, fz);
      for (const [dx, dz] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) toro(c, cx + dx, cz + dz, dx < 0);
      raposa(c, cx, cz - Math.max(5, Math.floor(r) - 1), 0, 1);
      c.set(cx + 1, 0, cz + 2, "minecraft:soul_campfire");
      c.meta.extra = { ...(c.meta.extra ?? {}), descanso: s.id };
    },
  },
  extras(c, plano) {
    // fogos-fátuos azuis soltos nos corredores
    for (let gz = 0; gz < c.N; gz++) for (let gx = 0; gx < c.N; gx++) {
      if (c.cel(gx, gz) === C.CORR && c.hash(gx, gz, 91) < 0.012 && c.bloco(gx, 2, gz) === AR) c.bruto(gx, 2, gz, "minecraft:end_rod", { facing_direction: 1 });
    }
    void plano;
  },
};
