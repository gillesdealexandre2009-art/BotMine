// @ts-check
// Andar 2: A FEIRA ESQUECIDA. A feira da comunidade Vulpus (barracas, cara-ou-coroa, tendas listradas, balões, lanternas, carrossel,
// bilheteria, palco) agora abandonada e assombrada: a alegria ficou ligada por anos e virou outra coisa. Rosa, amarelo, vermelho e
// branco desbotados, teto de lona listrada, luz de festa que não apaga, confete e poeira por cima de tudo.
import { AR, anel, centroDe, disco, escada, sorteio, teia, livre, arcoDePortal } from "./masm_pecas.js";

/** @typedef {import("./masm_construir.js").Tema} Tema */
/** @typedef {import("./masm_pecas.js").Contexto} Contexto */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */

// ---------------------------------------------------------------- materiais
const LV = "minecraft:red_wool", LB = "minecraft:white_wool", LA = "minecraft:yellow_wool", LR = "minecraft:pink_wool";
const CV = "minecraft:red_concrete", CB = "minecraft:white_concrete", CA = "minecraft:yellow_concrete", CR = "minecraft:pink_concrete", CN = "minecraft:black_concrete";
const TV = "minecraft:red_terracotta", TB = "minecraft:white_terracotta", TA = "minecraft:yellow_terracotta", TR = "minecraft:pink_terracotta";
const TABUA = "minecraft:spruce_planks", TABUA2 = "minecraft:dark_oak_planks", CERCA = "minecraft:spruce_fence";
const OURO = "minecraft:gold_block";
const GLOBO_ROSA = "minecraft:pearlescent_froglight", GLOBO_AMARELO = "minecraft:ochre_froglight";
const PANOS = [LV, LB, LA, LR];
const BANDEIRAS = ["minecraft:red_stained_glass_pane", "minecraft:yellow_stained_glass_pane", "minecraft:pink_stained_glass_pane", "minecraft:white_stained_glass_pane"];
const CONFETES = ["minecraft:red_carpet", "minecraft:yellow_carpet", "minecraft:pink_carpet", "minecraft:white_carpet", "minecraft:light_blue_carpet", "minecraft:orange_carpet"];

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BASE = {
  nome: "Tenda",
  parede: [[TB, 3], [TR, 3], [TV, 2], [TA, 1], [TABUA, 1]],
  rodape: TABUA2,
  friso: CV,
  pilar: "minecraft:stripped_spruce_log",
  topo: CA,
  piso: [[TB, 3], [TV, 3], [TR, 1], [TA, 1]],
  pisoCorredor: [[TABUA, 3], [TABUA2, 2], ["minecraft:spruce_log", 1], ["minecraft:gray_terracotta", 1]],
  borda: TA,
  teto: LB,
  viga: TABUA2,
  luz: "minecraft:lantern",
  vitral: "minecraft:glowstone",
  escada: "minecraft:spruce_stairs",
  laje: "minecraft:spruce_slab",
  muro: "minecraft:red_nether_brick_wall",
  sujo: "minecraft:gray_concrete",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const PICADEIRO = {
  ...BASE,
  nome: "Picadeiro",
  parede: [[TV, 4], [TB, 2], [TABUA2, 2], ["minecraft:crimson_planks", 1]],
  rodape: "minecraft:crimson_planks",
  friso: OURO,
  pilar: "minecraft:stripped_crimson_stem",
  piso: [[TV, 3], [TB, 3], [TA, 1]],
  borda: CA,
  teto: LV,
  luz: "minecraft:soul_lantern",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BILHETERIA = {
  ...BASE,
  nome: "Bilheteria",
  parede: [[TA, 4], [TB, 2], [TABUA, 2], ["minecraft:yellow_concrete", 1]],
  rodape: TABUA2,
  friso: OURO,
  pilar: "minecraft:stripped_birch_log",
  piso: [[TA, 3], [TB, 3], ["minecraft:gold_block", 1], [TR, 1]],
  borda: "minecraft:smooth_quartz",
  teto: LA,
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BASTIDORES = {
  ...BASE,
  nome: "Bastidores",
  parede: [[TABUA2, 4], ["minecraft:gray_terracotta", 2], [TV, 1], ["minecraft:spruce_planks", 2]],
  rodape: "minecraft:spruce_planks",
  friso: "minecraft:dark_oak_log",
  pilar: "minecraft:stripped_dark_oak_log",
  topo: TABUA,
  teto: "minecraft:dark_oak_planks",
};

// ---------------------------------------------------------------- referencial local de uma peça
/**
 * Referencial local: ponto (gx, gz) é a origem, (fx, fz) é a frente (+lz) e lx corre para a direita. Todas as funções param em
 * célula que não é de sala e abaixo do teto, então a peça nunca fura parede.
 * @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz
 */
function ref(c, gx, gz, fx, fz) {
  const rx = -fz, rz = fx;
  const X = (/** @type {number} */ lx, /** @type {number} */ lz) => gx + lx * rx + lz * fx;
  const Z = (/** @type {number} */ lx, /** @type {number} */ lz) => gz + lx * rz + lz * fz;
  /** @type {(lx: number, k: number, lz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const P = (lx, k, lz, id, est) => {
    const x = X(lx, lz), z = Z(lx, lz);
    if (livre(c, x, z) && k < c.tetoK(x, z)) c.set(x, k, z, id, est);
  };
  /** @type {(lx1: number, k1: number, lz1: number, lx2: number, k2: number, lz2: number, id: string) => void} */
  const F = (lx1, k1, lz1, lx2, k2, lz2, id) => {
    for (let k = Math.min(k1, k2); k <= Math.max(k1, k2); k++) for (let lz = Math.min(lz1, lz2); lz <= Math.max(lz1, lz2); lz++) for (let lx = Math.min(lx1, lx2); lx <= Math.max(lx1, lx2); lx++) P(lx, k, lz, id);
  };
  /** Escada que sobe no sentido local (alx, alz). */
  const S = (/** @type {number} */ lx, /** @type {number} */ k, /** @type {number} */ lz, /** @type {string} */ id, /** @type {number} */ alx, /** @type {number} */ alz, inv = false) =>
    P(lx, k, lz, id, { weirdo_direction: c.dirEscada(alx * rx + alz * fx, alx * rz + alz * fz), upside_down_bit: inv });
  /** Laje (meio bloco). */
  const L = (/** @type {number} */ lx, /** @type {number} */ k, /** @type {number} */ lz, /** @type {string} */ id, topo = false) => P(lx, k, lz, id, { "minecraft:vertical_half": topo ? "top" : "bottom" });
  return { P, F, S, L, X, Z };
}

/** Direção cardinal (nome do baú) de uma frente. @param {number} fx @param {number} fz */
const cardeal = (fx, fz) => (fz > 0 ? "south" : fz < 0 ? "north" : fx > 0 ? "east" : "west");

/** Setor angular (0..n-1) de um ponto em volta de um centro. @param {number} dx @param {number} dz @param {number} n */
const setor = (dx, dz, n) => Math.floor(((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2)) * n) % n;

/** Eixo dominante entre dois pontos, apontando de A para B. @param {number} ax @param {number} az @param {number} bx @param {number} bz @returns {[number, number]} */
const rumo = (ax, az, bx, bz) => (Math.abs(bx - ax) >= Math.abs(bz - az) ? [Math.sign(bx - ax) || 1, 0] : [0, Math.sign(bz - az) || 1]);

/** Globo de luz pendurado numa corrente (luz de festa que nunca apagou). @param {Contexto} c @param {number} gx @param {number} gz @param {number} baixo @param {string} luz */
function globo(c, gx, gz, baixo, luz) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  if (tk - 1 > baixo) c.fill(gx, baixo + 1, gz, gx, tk - 1, gz, c.CORRENTE);
  c.bruto(gx, baixo, gz, luz);
}

/** Poste listrado de vermelho e branco com tampa dourada. @param {Contexto} c @param {number} gx @param {number} gz @param {number} [alto] */
function poste(c, gx, gz, alto = 0) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  const topo = alto > 0 ? Math.min(alto, tk - 2) : tk - 2;
  for (let k = 0; k <= topo; k++) c.set(gx, k, gz, k % 2 ? CB : CV);
  c.set(gx, topo + 1, gz, OURO);
}

/** Linha de bandeirolas entre dois pontos alinhados (curva no meio). @param {Contexto} c @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 @param {number} sal */
function bandeirolas(c, x1, z1, x2, z2, sal) {
  const n = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
  for (let i = 0; i <= n; i++) {
    const gx = x1 + Math.sign(x2 - x1) * i, gz = z1 + Math.sign(z2 - z1) * i;
    if (!livre(c, gx, gz)) continue;
    const t = n ? i / n : 0;
    const queda = Math.sin(t * Math.PI) > 0.75 ? 2 : Math.sin(t * Math.PI) > 0.35 ? 1 : 0;
    if (c.hash(gx, gz, 31 + sal) < 0.08) continue; // bandeirola caída
    c.bruto(gx, c.tetoK(gx, gz) - 1 - queda, gz, BANDEIRAS[(i + sal) & 3]);
  }
}

/** Acha o ponto junto a uma parede da sala (lado 0 norte, 1 sul, 2 oeste, 3 leste), de costas para ela. @param {Contexto} c @param {Sala} s @param {number} lado @param {number} off */
function encostar(c, s, lado, off) {
  const { x: cx, z: cz } = centroDe(s);
  const [fx, fz] = [[0, 1], [0, -1], [1, 0], [-1, 0]][lado];
  let gx = lado < 2 ? cx + off : lado === 2 ? s.x : s.x + s.w - 1;
  let gz = lado < 2 ? (lado === 0 ? s.z : s.z + s.h - 1) : cz + off;
  for (let i = 0; i < 9; i++) {
    if (livre(c, gx, gz) && c.dwDe(gx, gz) >= 2) return { gx, gz, fx, fz };
    gx += fx;
    gz += fz;
  }
  return null;
}

// ---------------------------------------------------------------- peças figurativas

/** Barraca de feira: balcão, toldo listrado e prêmios. tipos: tiro, ursos, coroa, doces. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz @param {string} tipo */
function barraca(c, gx, gz, fx, fz, tipo) {
  const { P, F, L } = ref(c, gx, gz, fx, fz);
  const alto = tipo === "coroa" ? 5 : 4;
  F(-2, -1, 0, 2, -1, 2, TABUA);
  // painel do fundo em listras de tecido e tábua
  for (let lx = -2; lx <= 2; lx++) F(lx, 0, 0, lx, alto - 1, 0, lx & 1 ? TB : TR);
  // postes e toldo
  for (const lx of [-2, 2]) for (const lz of [0, 2]) F(lx, 0, lz, lx, alto - 1, lz, CERCA);
  for (let lz = 0; lz <= 3; lz++) for (let lx = -2; lx <= 2; lx++) P(lx, alto, lz, (lx + 2) & 1 ? LB : LV);
  for (let lx = -2; lx <= 2; lx += 2) P(lx, alto - 1, 3, LV);
  P(0, alto - 1, 1, "minecraft:lantern", { hanging: true });
  // balcão
  for (let lx = -1; lx <= 1; lx++) P(lx, 0, 2, lx === 0 ? TABUA2 : TABUA);
  if (tipo === "tiro") {
    // alvos no fundo, patinhos de lata e um urso de prêmio
    for (const lx of [-1, 0, 1]) P(lx, 2, 0, "minecraft:target");
    for (const lx of [-1, 1]) {
      P(lx, 0, 1, CA);
      P(lx, 1, 1, CA);
      P(lx, 1, 2, "minecraft:orange_concrete");
    }
    F(0, 0, 1, 0, 1, 1, "minecraft:brown_wool");
    P(0, 2, 1, "minecraft:brown_wool");
    P(-1, 1, 0, CV);
    P(1, 1, 0, CV);
  } else if (tipo === "ursos") {
    // prateleira de pelúcias
    const cor = [LR, LB, LA];
    for (let i = 0; i < 3; i++) {
      const lx = i - 1;
      F(lx, 0, 1, lx, 1, 1, cor[i]);
      P(lx, 2, 1, cor[(i + 1) % 3]);
      P(lx, 3, 1, "minecraft:white_carpet");
      L(lx, 1, 2, "minecraft:spruce_slab");
    }
    P(-1, 1, 0, "minecraft:flower_pot");
    P(1, 1, 0, "minecraft:flower_pot");
  } else if (tipo === "coroa") {
    // a moeda de Cara ou Coroa em pé atrás do balcão
    for (let k = 1; k <= 3; k++) for (let lx = -1; lx <= 1; lx++) P(lx, k, 1, k === 2 && lx === 0 ? "minecraft:raw_gold_block" : lx === 0 || k === 2 ? OURO : CA);
    P(0, 0, 1, TABUA2);
    P(0, 4, 1, OURO);
    P(-1, 4, 1, CA);
    P(1, 4, 1, CA);
  } else {
    // doces: hastes com algodão-doce e maçãs do amor
    for (let lx = -1; lx <= 1; lx++) {
      P(lx, 1, 2, "minecraft:end_rod");
      P(lx, 2, 2, lx === 0 ? LR : lx < 0 ? LV : LB);
    }
    P(0, 0, 1, "minecraft:cauldron");
    P(-1, 0, 1, "minecraft:barrel", { facing_direction: 1 });
    P(1, 0, 1, LR);
    P(1, 1, 1, "minecraft:pink_carpet");
  }
  P(2, 0, 3, "minecraft:web");
  if (c.hash(gx, gz, 61) < 0.5) P(-2, alto - 1, 0, "minecraft:web");
}

/** Cavalinho de carrossel (de lado, olhando para a frente local). @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz @param {number} k @param {string} cor */
function cavalinho(c, gx, gz, fx, fz, k, cor) {
  const { P } = ref(c, gx, gz, fx, fz);
  for (let lz = -1; lz <= 1; lz++) P(0, k, lz, cor);
  P(0, k + 1, 1, cor);
  P(0, k + 1, 2, cor);
  P(0, k, 2, cor);
  P(0, k + 2, 1, LR);
  P(0, k + 1, 0, "minecraft:red_carpet");
  P(0, k, -2, LR);
  P(0, k - 1, -2, LR);
}

/** Carrossel de verdade: plataforma de setores, mastro com globo, cavalinhos nas hastes e o toldo em cone. @param {Contexto} c @param {number} cx @param {number} cz @param {number} r */
function carrossel(c, cx, cz, r) {
  const R = Math.ceil(r) + 1;
  for (let dz = -R; dz <= R; dz++) {
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > r + 0.2 || !livre(c, cx + dx, cz + dz)) continue;
      const s16 = setor(dx, dz, 12);
      c.set(cx + dx, 0, cz + dz, d > r - 0.9 ? TA : s16 & 1 ? TV : TB);
      // toldo em cone: três degraus de lona listrada
      const lona = setor(dx, dz, 16) & 1 ? LV : LB;
      if (d <= r + 0.2) c.set(cx + dx, 5, cz + dz, lona);
      if (d <= r * 0.66) c.set(cx + dx, 6, cz + dz, lona);
      if (d <= r * 0.3) c.set(cx + dx, 7, cz + dz, lona === LV ? LA : LV);
      if (d > r - 0.9 && d <= r + 0.2 && (Math.round(d * 7 + setor(dx, dz, 24)) & 1) === 0) c.set(cx + dx, 4, cz + dz, LA);
    }
  }
  // mastro listrado e globo de luz
  for (let k = 1; k <= 3; k++) c.set(cx, k, cz, k & 1 ? CB : CV);
  c.set(cx, 4, cz, GLOBO_ROSA);
  disco(c, cx, cz, 1.3, 0, TA);
  c.set(cx, 0, cz, OURO);
  // cavalinhos, um deles quebrado (mastro sem cavalo)
  const quebrado = Math.floor(c.hash(cx, cz, 5) * (r < 3.6 ? 4 : 6));
  const nCav = r < 3.6 ? 4 : 6, rCav = Math.max(1.8, r - 1.6);
  for (let i = 0; i < nCav; i++) {
    const a = (i * Math.PI * 2) / nCav + 0.8;
    const px = cx + Math.round(Math.cos(a) * rCav), pz = cz + Math.round(Math.sin(a) * rCav);
    if (!livre(c, px, pz)) continue;
    for (let k = 1; k <= 4; k++) c.set(px, k, pz, "minecraft:end_rod");
    if (i === quebrado) {
      c.set(px, 1, pz, LR);
      continue;
    }
    const [tx, tz] = rumo(0, 0, -Math.sin(a), Math.cos(a));
    cavalinho(c, px, pz, tx, tz, 2, i & 1 ? LB : LA);
  }
  // luminárias penduradas na borda
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const lx = cx + Math.round(Math.cos(a) * (r - 0.4)), lz = cz + Math.round(Math.sin(a) * (r - 0.4));
    if (livre(c, lx, lz)) c.set(lx, 3, lz, GLOBO_AMARELO);
  }
}

/** Roda-gigante parcial: aro quebrado, raios, cabines e apoio. Gira no plano local lx/k. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function rodaGigante(c, gx, gz, fx, fz) {
  const { P, F } = ref(c, gx, gz, fx, fz);
  const cy = 3, R = 2.75;
  const quebra = c.hash(gx, gz, 8) * Math.PI * 2;
  for (let k = 0; k <= 6; k++) {
    for (let lx = -3; lx <= 3; lx++) {
      const d = Math.hypot(lx, k - cy);
      if (d < R - 0.6 || d > R + 0.5) continue;
      const a = Math.atan2(k - cy, lx);
      const dif = Math.abs(Math.atan2(Math.sin(a - quebra), Math.cos(a - quebra)));
      if (dif < 0.55) continue; // pedaço que se foi
      P(lx, k, 0, (Math.round((a + Math.PI) * 4) & 1) === 0 ? CV : CA);
    }
  }
  // raios e eixo
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    P(i, cy, 0, "minecraft:iron_bars");
    P(0, cy + i, 0, "minecraft:iron_bars");
  }
  P(1, cy + 1, 0, "minecraft:iron_bars");
  P(-1, cy - 1, 0, "minecraft:iron_bars");
  P(0, cy, 0, OURO);
  F(0, cy, -1, 0, cy, 1, OURO);
  // cabines penduradas em quatro pontos
  for (const [lx, k, cor] of /** @type {[number, number, string][]} */ ([[-3, cy, LR], [3, cy, LA], [0, cy + 3, LB], [0, cy - 3, LV]])) {
    const d = Math.hypot(lx, k - cy);
    const a = Math.atan2(k - cy, lx);
    const dif = Math.abs(Math.atan2(Math.sin(a - quebra), Math.cos(a - quebra)));
    if (dif < 0.55 || d < 2) continue;
    P(lx, k - 1, 0, cor);
    P(lx, k - 2, 0, cor);
    P(lx, k - 3 < 0 ? 0 : k - 2, 0, cor);
  }
  // apoio em A atrás do aro
  for (let i = 0; i <= 3; i++) {
    P(-i, cy - i, 1, "minecraft:stripped_spruce_log");
    P(i, cy - i, 1, "minecraft:stripped_spruce_log");
  }
  F(-3, 0, 1, 3, 0, 1, TABUA2);
  P(0, cy, 1, "minecraft:stripped_spruce_log");
  // lâmpadas no aro
  P(2, cy + 2, 0, GLOBO_AMARELO);
  P(-2, cy + 2, 0, GLOBO_ROSA);
}

/** Palhaço de concreto sentado, de olhos que brilham. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function palhaco(c, gx, gz, fx, fz) {
  const { P, F } = ref(c, gx, gz, fx, fz);
  // pedestal
  F(-2, 0, -2, 2, 0, 2, "minecraft:polished_andesite");
  F(-1, 0, -2, 1, 0, 2, "minecraft:smooth_stone");
  // pernas esticadas e sapatões
  P(-1, 1, 1, CA);
  P(1, 1, 1, CR);
  P(-1, 1, 2, CV);
  P(1, 1, 2, CV);
  P(-1, 1, 3, CV);
  P(1, 1, 3, CV);
  // tronco bipartido
  for (let k = 1; k <= 2; k++) for (let lz = -1; lz <= 0; lz++) {
    P(-1, k, lz, CV);
    P(0, k, lz, CB);
    P(1, k, lz, CA);
  }
  P(0, 2, 1, CN);
  P(0, 1, 1, CB);
  // braços apoiados nos joelhos
  for (const lx of [-2, 2]) {
    P(lx, 2, -1, lx < 0 ? CV : CA);
    P(lx, 2, 0, lx < 0 ? CV : CA);
    P(lx, 1, 1, CB);
  }
  // gola, cabeça, nariz, olhos
  F(-1, 3, -1, 1, 3, 0, LB);
  F(-1, 4, -1, 1, 5, 0, CB);
  P(0, 4, 1, CV);
  P(-1, 4, 1, CV);
  P(1, 4, 1, CV);
  P(-1, 5, 0, GLOBO_AMARELO);
  P(1, 5, 0, GLOBO_AMARELO);
  P(0, 5, 0, CB);
  P(0, 4, 0, CV);
  for (const lx of [-2, 2]) {
    P(lx, 5, -1, LR);
    P(lx, 5, 0, LR);
    P(lx, 4, 0, LR);
  }
  // chapéu pontudo listrado
  F(-1, 6, -1, 1, 6, 0, CV);
  P(0, 7, -1, CB);
  // rachaduras e teia
  if (c.hash(gx, gz, 17) < 0.7) P(1, 4, 0, "minecraft:cracked_stone_bricks");
  P(2, 3, -1, "minecraft:web");
}

/** Árvore de balões: mastro com um cacho que escapou até o teto, fios e balões murchos no chão. @param {Contexto} c @param {number} gx @param {number} gz */
function arvoreBaloes(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  const topo = tk - 4;
  disco(c, gx, gz, 1.2, 0, "minecraft:hay_block");
  c.set(gx, 0, gz, "minecraft:spruce_log");
  for (let k = 1; k <= topo; k++) c.set(gx, k, gz, k % 2 ? CERCA : "minecraft:stripped_spruce_log");
  // cacho de balões coloridos (esfera aberta) com fios de corrente
  let n = 0;
  for (let dy = -1; dy <= 2; dy++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dz, dy - 0.5) > 2.3 || (dx === 0 && dz === 0 && dy <= 0)) continue;
        const x = gx + dx, z = gz + dz, k = topo + 1 + dy;
        if (!livre(c, x, z) || k >= c.tetoK(x, z)) continue;
        const h = c.hash(x, z, 40 + k);
        if (h < 0.28) continue;
        const luz = h > 0.93;
        c.set(x, k, z, luz ? (h > 0.97 ? GLOBO_ROSA : GLOBO_AMARELO) : PANOS[Math.floor(h * 40) & 3]);
        if (dy === -1 && h > 0.6 && n < 5) {
          c.bruto(x, k - 1, z, c.CORRENTE);
          n++;
        }
      }
    }
  }
  // balões que murcharam no chão
  for (let i = 0; i < 6; i++) {
    const a = c.hash(gx, gz, 70 + i) * Math.PI * 2, d = 1.8 + c.hash(gx, gz, 80 + i) * 1.8;
    const x = gx + Math.round(Math.cos(a) * d), z = gz + Math.round(Math.sin(a) * d);
    if (livre(c, x, z) && c.bloco(x, 0, z) === AR) c.set(x, 0, z, ["minecraft:pink_carpet", "minecraft:red_carpet", "minecraft:yellow_carpet", "minecraft:white_carpet"][i & 3]);
  }
}

/** Caixa de surpresa: caixa aberta com mola e a cabeça do bobo saltando. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function caixaSurpresa(c, gx, gz, fx, fz) {
  const { P, F, S } = ref(c, gx, gz, fx, fz);
  F(-1, 0, -1, 1, 1, 1, CV);
  for (let lx = -1; lx <= 1; lx++) P(lx, 1, 1, lx === 0 ? CB : CA);
  F(-1, 1, -1, 1, 1, -1, CA);
  P(0, 1, 0, AR);
  // tampa aberta, de lado
  S(-2, 1, 0, "minecraft:red_nether_brick_stairs", -1, 0, true);
  S(2, 1, 0, "minecraft:red_nether_brick_stairs", 1, 0, true);
  // mola e cabeça
  for (let k = 1; k <= 3; k++) P(0, k, 0, k % 2 ? "minecraft:iron_bars" : c.CORRENTE);
  F(-1, 4, 0, 1, 5, 0, CB);
  P(0, 4, 1, CV);
  P(-1, 5, 1, GLOBO_AMARELO);
  P(1, 5, 1, GLOBO_AMARELO);
  P(0, 6, 0, CV);
}

/** Cavalinho de brinquedo caído de lado, com pernas para cima. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function cavaloCaido(c, gx, gz, fx, fz) {
  const { P, F } = ref(c, gx, gz, fx, fz);
  F(0, 0, -1, 1, 0, 1, LB);
  P(0, 0, 2, LB);
  P(0, 1, 2, LB);
  P(1, 0, 2, LR);
  P(0, 0, -2, LR);
  for (const [lx, lz] of [[0, -1], [1, -1], [0, 1], [1, 1]]) {
    P(lx, 1, lz, "minecraft:end_rod");
  }
  P(1, 1, 0, "minecraft:red_carpet");
  P(-1, 0, 0, "minecraft:white_carpet");
}

/** Carrinho de pipoca com cúpula de vidro e toldo. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function carrinhoPipoca(c, gx, gz, fx, fz) {
  const { P, F } = ref(c, gx, gz, fx, fz);
  F(-1, 0, 0, 1, 0, 1, CV);
  for (let lx = -1; lx <= 1; lx++) F(lx, 1, 0, lx, 1, 1, lx & 1 ? CB : CV);
  F(-1, 2, 0, 1, 2, 1, "minecraft:glass");
  F(0, 2, 0, 0, 2, 0, LB);
  P(-1, 2, 0, LB);
  P(1, 2, 0, LA);
  for (const lx of [-2, 2]) F(lx, 0, 0, lx, 2, 0, CERCA);
  for (let lz = -1; lz <= 2; lz++) for (let lx = -2; lx <= 2; lx++) P(lx, 3, lz, (lx + lz) & 1 ? LV : LB);
  P(0, 4, 0, GLOBO_AMARELO);
  for (const lx of [-2, 2]) P(lx, 0, 1, CN);
  P(0, 0, 2, CERCA);
  // pipoca espalhada
  for (const [lx, lz] of [[-1, 3], [1, 2], [0, 4], [-2, 3]]) P(lx, 0, lz, c.hash(gx + lx, gz + lz, 5) < 0.5 ? "minecraft:white_carpet" : "minecraft:yellow_carpet");
}

/** Espelhos de feira em zigue-zague: molduras douradas com vidro rachado. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function espelhos(c, gx, gz, fx, fz) {
  const { P, F } = ref(c, gx, gz, fx, fz);
  for (let i = 0; i < 2; i++) {
    const lx0 = -4 + i * 4, lz = i * 2;
    F(lx0, 0, lz, lx0 + 3, 0, lz, TABUA2);
    F(lx0, 1, lz, lx0, 4, lz, "minecraft:stripped_spruce_log");
    F(lx0 + 3, 1, lz, lx0 + 3, 4, lz, "minecraft:stripped_spruce_log");
    F(lx0, 5, lz, lx0 + 3, 5, lz, OURO);
    for (let lx = lx0 + 1; lx <= lx0 + 2; lx++) {
      for (let k = 1; k <= 4; k++) {
        const h = c.hash(c.wx(0) + lx, k, lz + i);
        P(lx, k, lz, h < 0.14 ? AR : i ? "minecraft:pink_stained_glass_pane" : "minecraft:white_stained_glass_pane");
      }
    }
    P(lx0 + 1, 6, lz, i ? GLOBO_ROSA : GLOBO_AMARELO);
    P(lx0 + 2, 0, lz + 1, i ? LR : LA);
  }
}

/** Mesa de festa: toalha, bolo mordido e velas que nunca apagaram, bancos dos dois lados. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function mesaFesta(c, gx, gz, fx, fz) {
  const { P, F, S } = ref(c, gx, gz, fx, fz);
  F(-1, 0, 0, 1, 0, 1, TABUA);
  P(-1, 1, 0, "minecraft:red_carpet");
  P(-1, 1, 1, "minecraft:red_carpet");
  P(1, 1, 0, "minecraft:white_carpet");
  P(1, 1, 1, "minecraft:white_carpet");
  P(0, 1, 0, "minecraft:cake", { bite_counter: 2 });
  P(0, 1, 1, "minecraft:pink_candle", { candles: 2, lit: true });
  for (let lx = -1; lx <= 1; lx++) {
    S(lx, 0, -1, "minecraft:spruce_stairs", 0, -1);
    S(lx, 0, 2, "minecraft:spruce_stairs", 0, 1);
  }
}

/** Bilheteria: guichê com janela, balcão, relógio de luz e toldo; o interior fica aberto atrás. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function bilheteria(c, gx, gz, fx, fz) {
  const { P, F, S } = ref(c, gx, gz, fx, fz);
  F(-2, -1, -1, 2, -1, 2, TABUA2);
  // paredes: fundo, laterais e frente com janela
  F(-2, 0, -1, 2, 3, -1, TA);
  F(-2, 0, -1, -2, 3, 2, TA);
  F(2, 0, -1, 2, 3, 2, TA);
  F(-2, 0, 2, 2, 3, 2, TV);
  F(-1, 1, 2, 1, 2, 2, "minecraft:glass");
  F(-1, 3, 2, 1, 3, 2, TB);
  P(0, 0, 2, AR);
  F(-1, 0, 2, 1, 0, 2, TABUA2);
  // telhado em degraus listrados
  for (let lx = -3; lx <= 3; lx++) {
    P(lx, 4, 2, lx & 1 ? LB : LV);
    for (let lz = -1; lz <= 1; lz++) P(lx, 4, lz, lx & 1 ? LB : LV);
  }
  for (let lx = -2; lx <= 2; lx++) P(lx, 5, 0, lx & 1 ? LB : LV);
  P(0, 6, 0, OURO);
  // balcão externo, lanterna e fila de cordas
  for (let lx = -2; lx <= 2; lx++) S(lx, 0, 3, "minecraft:spruce_stairs", 0, 1);
  P(-3, 0, 3, CERCA);
  P(3, 0, 3, CERCA);
  P(-3, 1, 3, "minecraft:lantern");
  P(3, 1, 3, "minecraft:lantern");
  // interior: cadeira, caixa e lanterna
  S(0, 0, 0, "minecraft:dark_oak_stairs", 0, -1);
  P(-1, 0, 0, "minecraft:barrel", { facing_direction: 1 });
  P(1, 0, 0, "minecraft:soul_lantern");
  P(0, 3, 0, "minecraft:lantern", { hanging: true });
}

/** Cortinas de palco: panos vermelhos do teto ao chão, com franja dourada. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz @param {number} vao */
function cortinas(c, gx, gz, fx, fz, vao) {
  const { P, F } = ref(c, gx, gz, fx, fz);
  for (let lx = -vao - 4; lx <= vao + 4; lx++) {
    const l = Math.abs(lx);
    if (l < vao) continue;
    const x = gx + lx * -fz, z = gz + lx * fx;
    if (!livre(c, x, z)) continue;
    const tk = c.tetoK(x, z);
    const dobra = ((l - vao) & 1) === 0;
    const topo = l - vao > 3 ? tk - 1 : tk - 1 - ((l - vao) % 2 === 1 ? 1 : 0);
    F(lx, 0, 0, lx, topo - 1, 0, dobra ? LV : "minecraft:red_terracotta");
    P(lx, topo, 0, OURO);
    if (c.hash(x, z, 3) < 0.2) P(lx, 1, 0, AR);
  }
}

// ---------------------------------------------------------------- tema
/** @type {Tema} */
export const TEMA_FEIRA = {
  id: "feira",
  nome: "A Feira Esquecida",
  rocha: "minecraft:deepslate",
  paletas: [BASE, PICADEIRO, BILHETERIA, BASTIDORES],
  alturaCorredor: 5,
  abobada: 1,
  forma: (s) => (s.papel === "boss" ? "oval" : s.papel === "miniboss" ? "octo" : s.papel === "elite" ? "oval" : s.papel === "entrada" ? "ret" : s.w * s.h > 170 && s.id % 2 === 0 ? "cruz" : "ret"),
  vela: "minecraft:pink_candle",
  comum(c, s) {
    const cc = centroDe(s);
    // teto de lona listrada em setores, com rasgos
    for (let gz = s.z; gz < s.z + s.h; gz++) {
      for (let gx = s.x; gx < s.x + s.w; gx++) {
        if (c.salaDe(gx, gz) !== s.id) continue;
        const tk = c.tetoK(gx, gz);
        const h = c.hash(gx, gz, 21);
        const lona = setor(gx - cc.x, gz - cc.z, 20) & 1 ? LV : LB;
        c.bruto(gx, tk, gz, h < 0.04 ? "minecraft:gray_wool" : h > 0.985 ? LA : lona);
      }
    }
    // luz de festa: globos coloridos pendurados por correntes (alguns queimados, outros ainda piscando de tão velhos)
    const passo = s.w >= 15 ? 5 : 4;
    for (let gz = s.z + 2; gz < s.z + s.h - 1; gz += passo) {
      for (let gx = s.x + 2; gx < s.x + s.w - 1; gx += passo) {
        if (!livre(c, gx, gz)) continue;
        const h = c.hash(gx, gz, 22);
        globo(c, gx, gz, c.tetoK(gx, gz) - 3 - (h > 0.6 ? 1 : 0), h < 0.4 ? GLOBO_ROSA : h < 0.8 ? GLOBO_AMARELO : c.palDe(gx, gz).luz === "minecraft:lantern" ? "minecraft:lantern" : GLOBO_AMARELO);
      }
    }
    // bandeirolas de ponta a ponta
    const sal = s.id;
    for (let gz = s.z + 3; gz < s.z + s.h - 2; gz += 6) {
      let x1 = -1;
      for (let gx = s.x; gx <= s.x + s.w; gx++) {
        const ok = gx < s.x + s.w && livre(c, gx, gz) && c.salaDe(gx, gz) === s.id;
        if (ok && x1 < 0) x1 = gx;
        if (!ok && x1 >= 0) {
          if (gx - 1 - x1 >= 5) bandeirolas(c, x1 + 1, gz, gx - 2, gz, sal + gz);
          x1 = -1;
        }
      }
    }
    // postes listrados nos cantos
    const mx = Math.max(2, s.w >> 3), mz = Math.max(2, s.h >> 3);
    for (const [gx, gz] of [[s.x + mx, s.z + mz], [s.x + s.w - 1 - mx, s.z + mz], [s.x + mx, s.z + s.h - 1 - mz], [s.x + s.w - 1 - mx, s.z + s.h - 1 - mz]]) {
      if (c.hash(gx, gz, 24) < 0.7 && c.dwDe(gx, gz) >= 2) poste(c, gx, gz, 3);
    }
    // confete e poeira no chão, balões no teto
    for (let i = 0; i < Math.round((s.w * s.h) / 5); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.bruto(gx, 0, gz, c.hash(gx, gz, 26) < 0.25 ? "minecraft:gray_carpet" : CONFETES[Math.floor(c.rng() * CONFETES.length)]);
    }
    for (let i = 0; i < Math.round((s.w * s.h) / 40); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (!livre(c, gx, gz)) continue;
      const tk = c.tetoK(gx, gz);
      const cor = PANOS[Math.floor(c.rng() * 4)];
      c.bruto(gx, tk - 1, gz, cor);
      if (c.rng() < 0.6) c.bruto(gx, tk - 2, gz, cor);
      for (let k = 1; k <= 3; k++) c.bruto(gx, tk - 2 - k, gz, c.CORRENTE);
    }
    for (let i = 0; i < Math.round((s.w * s.h) / 24); i++) {
      const [gx, gz] = sorteio(c, s, 0);
      teia(c, gx, c.tetoK(gx, gz) - 1, gz);
    }
  },
  pecas: {
    entrada(c, s) {
      // portão da feira: arco de balões sobre o altar (pedestal de bilheteria), postes listrados e o arco de volta
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 5.5, -1, TA);
      anel(c, cx, cz, 4.5, 5.5, -1, TV);
      anel(c, cx, cz, 2.5, 3.5, -1, TB);
      const ax = cx, az = cz - 3;
      c.fill(ax - 1, 0, az - 1, ax + 1, 0, az + 1, CB);
      for (const [dx, dz, fx, fz] of [[0, 2, 0, -1], [0, -2, 0, 1], [2, 0, -1, 0], [-2, 0, 1, 0]]) for (const o of [-1, 0, 1]) escada(c, dx === 0 ? ax + o : ax + dx, 0, dx === 0 ? az + dz : az + o, "minecraft:red_nether_brick_stairs", fx, fz);
      c.set(ax, 1, az, "minecraft:crying_obsidian");
      c.set(ax, 2, az, "minecraft:soul_lantern");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(ax + dx, 1, az + dz, "minecraft:pink_candle", { candles: 2, lit: true });
      c.meta.altar = { x: c.wx(ax), y: c.wy(1), z: c.wz(az) };
      // arco de volta, à direita
      const zona = arcoDePortal(c, cx + 4, cz, "z", { pilar: "minecraft:stripped_spruce_log", topo: CA, brilho: OURO, luz: "minecraft:soul_lantern" });
      c.portal(zona, "volta");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), volta: { x: c.wx(cx + 1) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 } };
      c.meta.chegada = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 };
      // arco de balões atrás de quem chega
      const ar = ref(c, cx, cz + 4, 0, -1);
      for (let k = 0; k <= 5; k++) {
        for (let lx = -3; lx <= 3; lx++) {
          const d = Math.hypot(lx, k + 0.4);
          if (d < 2.4 || d > 3.5) continue;
          ar.P(lx, k, 0, PANOS[(lx + k + 8) & 3]);
        }
      }
      ar.P(0, 3, 0, GLOBO_ROSA);
      for (const lx of [-3, 3]) ar.F(lx, 0, 0, lx, 0, 0, OURO);
      poste(c, cx - 5, cz + 3, 4);
      poste(c, cx + 5, cz + 4, 4);
      barraca(c, cx - 5, cz - 1, 1, 0, "coroa");
      tapeteVermelho(c, cx, cz);
    },
    combate(c, s) {
      combateFeira(c, s);
    },
    armadilha(c, s) {
      // amarelinha da morte: placas de pressão disfarçadas de casas do jogo, caixas de surpresa e balões demais no teto
      const { x: cx, z: cz } = centroDe(s);
      for (let dz = -3; dz <= 3; dz += 2) {
        for (let dx = -3; dx <= 3; dx += 2) {
          if (!livre(c, cx + dx, cz + dz)) continue;
          c.set(cx + dx, -1, cz + dz, ((dx + dz) >> 1) & 1 ? CA : CR);
          c.set(cx + dx, 0, cz + dz, "minecraft:stone_pressure_plate");
        }
      }
      caixaSurpresa(c, cx - 5, cz, 1, 0);
      caixaSurpresa(c, cx + 5, cz, -1, 0);
      for (let i = 0; i < 26; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (!livre(c, gx, gz)) continue;
        const tk = c.tetoK(gx, gz);
        c.bruto(gx, tk - 1, gz, PANOS[i & 3]);
        c.bruto(gx, tk - 2, gz, c.CORRENTE);
      }
      arvoreBaloes(c, cx, cz + 6);
    },
    elite(c, s) {
      // jaula do domador: arena de serragem, grade de ferro com aberturas e pedestal listrado com o prêmio
      const { x: cx, z: cz } = centroDe(s);
      const R = Math.max(3, Math.min(4.6, Math.min(s.w, s.h) / 2 - 1.4));
      disco(c, cx, cz, R - 0.4, -1, TA);
      anel(c, cx, cz, R - 0.4, R + 0.6, -1, TV);
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI * 2) / 48;
        const gx = cx + Math.round(Math.cos(a) * R), gz = cz + Math.round(Math.sin(a) * R);
        const aberta = i % 12 === 0 || i % 12 === 1 || i % 12 === 11;
        if (!livre(c, gx, gz) || aberta) continue;
        c.fill(gx, 0, gz, gx, 3, gz, "minecraft:iron_bars");
        c.set(gx, 4, gz, i & 1 ? CV : CB);
      }
      disco(c, cx, cz, 1.4, 0, CB);
      disco(c, cx, cz, 0.6, 0, CV);
      c.bau(cx, 1, cz, "south", "elite");
      c.set(cx - 1, 1, cz, "minecraft:skeleton_skull");
      for (const [dx, dz] of [[-2, -2], [2, 2], [2, -2], [-2, 2]]) if (livre(c, cx + dx, cz + dz)) c.set(cx + dx, 0, cz + dz, c.hash(cx + dx, cz + dz, 2) < 0.5 ? "minecraft:bone_block" : "minecraft:skeleton_skull");
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) globo(c, cx + dx * Math.round(R + 0.6), cz + dz * Math.round(R + 0.6), c.tetoK(cx, cz) - 3, GLOBO_ROSA);
    },
    miniboss(c, s) {
      // o grande carrossel da feira; o prêmio da chave fica na barraca de pelúcias
      const { x: cx, z: cz } = centroDe(s);
      const r = Math.max(3, Math.min(4.7, Math.min(s.w, s.h) / 2 - 1.3));
      carrossel(c, cx, cz, r);
      // o prêmio da chave: baú na borda da plataforma, entre duas luminárias
      const bx = cx + Math.round(r - 0.9);
      c.bau(bx, 1, cz, "west", "chave");
      c.set(bx, 2, cz, "minecraft:soul_lantern");
      for (const dz of [-2, 2]) if (livre(c, bx, cz + dz)) c.set(bx, 1, cz + dz, "minecraft:pink_candle", { candles: 3, lit: true });
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) poste(c, cx + dx * Math.round(r + 1.6), cz + dz * Math.round(r + 1.6), 4);
    },
    boss(c, s) {
      // o picadeiro do Mestre da Feira: arena de setores, palco com cortinas e portal ao fundo
      const { x: cx, z: cz } = centroDe(s);
      const raio = Math.min(s.w, s.h) / 2;
      const ra = Math.max(2.5, Math.min(raio - 2.5, 7));
      for (let dz = -Math.ceil(ra); dz <= Math.ceil(ra); dz++) {
        for (let dx = -Math.ceil(ra); dx <= Math.ceil(ra); dx++) {
          const d = Math.hypot(dx, dz);
          if (d > ra + 0.2 || !livre(c, cx + dx, cz + dz)) continue;
          c.bruto(cx + dx, -1, cz + dz, d > ra - 0.9 ? CA : d < 1.2 ? OURO : setor(dx, dz, 12) & 1 ? TV : TB);
        }
      }
      anel(c, cx, cz, ra + 0.4, ra + 1.4, -1, TV);
      // mastros da lona: postes listrados do chão ao teto nas diagonais
      const dm = Math.max(3, Math.round((raio - 1.6) * 0.72));
      for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) poste(c, cx + qx * dm, cz + qz * dm, 0);
      // arquibancada (só em salas grandes): bancos em volta, com palhaços de concreto assistindo
      if (raio >= 7) {
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12 + 0.26;
          const bx = cx + Math.round(Math.cos(a) * (ra + 2)), bz = cz + Math.round(Math.sin(a) * (ra + 2));
          if (!livre(c, bx, bz) || c.dwDe(bx, bz) < 2) continue;
          const [fx, fz] = rumo(bx, bz, cx, cz);
          if (i % 4 === 1) palhaco(c, bx, bz, fx, fz);
          else if (i % 4 === 3) globo(c, bx, bz, c.tetoK(bx, bz) - 3, GLOBO_ROSA);
          else escada(c, bx, 0, bz, "minecraft:red_nether_brick_stairs", -fx, -fz);
        }
      }
      // holofotes e o grande lustre central
      const rh = Math.max(2, Math.min(4, Math.round(ra)));
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const gx = cx + Math.round(Math.cos(a) * rh), gz = cz + Math.round(Math.sin(a) * rh);
        globo(c, gx, gz, c.tetoK(gx, gz) - 4, i & 1 ? GLOBO_ROSA : GLOBO_AMARELO);
      }
      globo(c, cx, cz, c.tetoK(cx, cz) - 6, GLOBO_AMARELO);
      for (let k = c.tetoK(cx, cz) - 5; k <= c.tetoK(cx, cz) - 4; k++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.bruto(cx + dx, k, cz + dz, k & 1 ? LV : LB);
      for (let i = 0; i < 20; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (!livre(c, gx, gz) || c.bloco(gx, 0, gz) !== AR) continue;
        c.bruto(gx, 0, gz, ["minecraft:pink_carpet", "minecraft:red_carpet", "minecraft:white_carpet"][i % 3]);
      }
      // palco ao fundo, com cortinas e o arco de descida
      const pz = s.z + 3;
      for (let dz = 0; dz <= 3; dz++) for (let dx = -4; dx <= 4; dx++) if (livre(c, cx + dx, s.z + dz)) c.bruto(cx + dx, -1, s.z + dz, dz === 3 ? CA : TABUA2);
      cortinas(c, cx, s.z + 1, 0, 1, 3);
      const zona = arcoDePortal(c, cx, pz, "x", { pilar: "minecraft:stripped_crimson_stem", topo: OURO, brilho: "minecraft:crying_obsidian", luz: "minecraft:soul_lantern" });
      c.portal(zona, "desce");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), desce: { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(s.z + 7) + 0.5 } };
      c.meta.arena = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz) + 0.5, raio: raio - 2, sala: s.id };
    },
    tesouro(c, s) {
      // a bilheteria: guichê com os baús do caixa, moedas douradas e fila de cordas
      const { x: cx, z: cz } = centroDe(s);
      bilheteria(c, cx, cz - 2, 0, 1);
      c.bau(cx - 1, 0, cz - 2, "south", "tesouro");
      c.bau(cx + 1, 0, cz - 2, "south", "tesouro");
      for (let i = 0; i < 10; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, i % 3 === 0 ? "minecraft:gold_block" : "minecraft:yellow_carpet");
      }
      for (const dx of [-3, 3]) poste(c, cx + dx, cz + 3, 3);
    },
    secreta(c, s) {
      this.tesouro(c, s);
      const { x: cx, z: cz } = centroDe(s);
      c.bau(cx, 0, cz + 3, "north", "tesouro");
    },
    descanso(c, s) {
      // canto do piquenique: fogueira sob um cacho de balões, mesa de festa, tenda de lona e a barraca de cara ou coroa
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, Math.min(s.w, s.h) / 2 - 1, -1, TB);
      anel(c, cx, cz, 2.5, 3.5, -1, TA);
      c.set(cx, 0, cz, "minecraft:campfire");
      for (const [dx, dz, fx, fz] of [[2, 0, -1, 0], [-2, 0, 1, 0], [0, 2, 0, -1], [0, -2, 0, 1]]) escada(c, cx + dx, 0, cz + dz, "minecraft:spruce_stairs", -fx, -fz);
      mesaFesta(c, cx + 4, cz - 1, -1, 0);
      const a = encostar(c, s, 1, 2);
      if (a) barraca(c, a.gx, a.gz, a.fx, a.fz, "coroa");
      const b = encostar(c, s, 0, -2);
      if (b) barraca(c, b.gx, b.gz, b.fx, b.fz, "doces");
      for (let i = 0; i < 8; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, ["minecraft:dandelion", "minecraft:poppy", "minecraft:pink_tulip"][i % 3]);
      }
      globo(c, cx, cz, c.tetoK(cx, cz) - 3, GLOBO_AMARELO);
      c.meta.extra = { ...(c.meta.extra ?? {}), descanso: s.id };
    },
  },
};

/** Faixa de carpete vermelho do portão até o altar. @param {Contexto} c @param {number} cx @param {number} cz */
function tapeteVermelho(c, cx, cz) {
  for (let gz = cz - 6; gz <= cz + 4; gz++) for (let gx = cx - 1; gx <= cx + 1; gx++) if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.bruto(gx, 0, gz, gx === cx ? "minecraft:red_carpet" : "minecraft:yellow_carpet");
}

/** Sala de combate comum: duas barracas nas paredes, uma peça central e brinquedos quebrados espalhados, variando pelo hash da sala. @param {Contexto} c @param {Sala} s */
function combateFeira(c, s) {
  const { x: cx, z: cz } = centroDe(s);
  const menor = Math.min(s.w, s.h);
  const h = (/** @type {number} */ n) => c.hash(s.id, s.w + n, 100 + n);
  const tipos = ["tiro", "ursos", "coroa", "doces"];
  const lado0 = Math.floor(h(1) * 4);
  // barracas nas paredes (duas, três em salas grandes)
  const n = menor >= 15 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const lado = (lado0 + i * (i === 1 ? 2 : 1)) % 4;
    const off = Math.round((h(10 + i) - 0.5) * Math.max(0, (lado < 2 ? s.w : s.h) - 11));
    const pos = encostar(c, s, lado, off);
    if (!pos) continue;
    const q = h(20 + i);
    if (q < 0.18 && menor >= 11) carrinhoPipoca(c, pos.gx, pos.gz, pos.fx, pos.fz);
    else if (q < 0.34) espelhos(c, pos.gx, pos.gz, pos.fx, pos.fz);
    else barraca(c, pos.gx, pos.gz, pos.fx, pos.fz, tipos[(Math.floor(h(30 + i) * 4) + i) % 4]);
  }
  // peça central
  const centro = h(2);
  if (menor >= 13 && centro < 0.3) rodaGigante(c, cx, cz - 1, 0, 1);
  else if (centro < 0.55) palhaco(c, cx, cz, h(3) < 0.5 ? 0 : 1, h(3) < 0.5 ? 1 : 0);
  else if (centro < 0.8) arvoreBaloes(c, cx, cz);
  else {
    mesaFesta(c, cx, cz, 0, 1);
    arvoreBaloes(c, cx + 4, cz + 3);
  }
  // brinquedos quebrados nos cantos livres
  const cantos = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let i = 0; i < 2; i++) {
    const [qx, qz] = cantos[(Math.floor(h(40) * 4) + i * 2 + 1) % 4];
    const gx = cx + qx * Math.max(3, (s.w >> 1) - 3), gz = cz + qz * Math.max(3, (s.h >> 1) - 3);
    if (!livre(c, gx, gz)) continue;
    if (h(50 + i) < 0.5) cavaloCaido(c, gx, gz, i ? 0 : 1, i ? 1 : 0);
    else caixaSurpresa(c, gx, gz, -qx || 1, 0);
  }
}

/** Peças soltas (para pré-visualização isolada). */
export const PECAS_FEIRA = { barraca, carrossel, rodaGigante, palhaco, arvoreBaloes, caixaSurpresa, cavaloCaido, carrinhoPipoca, espelhos, mesaFesta, bilheteria, cortinas, poste, globo };
