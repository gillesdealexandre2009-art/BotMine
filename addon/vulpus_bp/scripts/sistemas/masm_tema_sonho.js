// @ts-check
// Andar 4: O SONHO. O sonho da Vulpus que esqueceu de acabar: salas brancas e pálidas demais, geometria impossível (pilares que
// flutuam, escadas que não levam a lugar nenhum, portas sozinhas, espelhos, relógios parados, camas desfeitas, cortinas, balanços,
// nuvens com chuva congelada), manchas de aquarela roxo e azul-noite, rachaduras de luz e erros de imagem (blocos de cor trocada,
// obsidiana chorona). No fundo mora O Branco, um vazio que consome a cor de tudo que toca.
import { C } from "./masm_grade.js";
import { AR, anel, centroDe, disco, escada, lustre, sorteio, tapete, livre, arcoDePortal } from "./masm_pecas.js";

/** @typedef {import("./masm_construir.js").Tema} Tema */
/** @typedef {import("./masm_pecas.js").Contexto} Contexto */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */

// ---------------------------------------------------------------- materiais
const BRANCO = "minecraft:white_concrete";
const QUARTZO = "minecraft:smooth_quartz";
const COLUNA_Q = "minecraft:quartz_pillar";
const ENTALHE = "minecraft:chiseled_quartz_block";
const MADEIRA = "minecraft:pale_oak_planks";
const MADEIRA_L = "minecraft:pale_oak_slab";
const TORA = "minecraft:stripped_pale_oak_log";
const CERCA = "minecraft:pale_oak_fence";
const LUZ_ROSA = "minecraft:pearlescent_froglight";
const ALMA = "minecraft:soul_lantern";
const VIDRO = "minecraft:light_gray_stained_glass_pane";
const NOITE = "minecraft:blue_terracotta";
/** manchas de aquarela do chão */
const AQUARELA = ["minecraft:purple_terracotta", "minecraft:light_blue_terracotta", "minecraft:blue_terracotta", "minecraft:magenta_terracotta", "minecraft:purple_concrete", "minecraft:amethyst_block"];
/** cores do erro de imagem */
const GLITCH = ["minecraft:magenta_concrete", "minecraft:cyan_concrete", "minecraft:lime_concrete", "minecraft:purple_concrete", "minecraft:black_concrete", "minecraft:blue_concrete"];
const GLITCH_PO = ["minecraft:magenta_concrete_powder", "minecraft:cyan_concrete_powder", "minecraft:lime_concrete_powder", "minecraft:purple_concrete_powder"];

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BASE = {
  nome: "Sonho",
  parede: [["minecraft:calcite", 4], ["minecraft:quartz_block", 3], [BRANCO, 3], [QUARTZO, 2], ["minecraft:light_gray_concrete", 1], ["minecraft:purple_terracotta", 1]],
  rodape: "minecraft:quartz_bricks",
  friso: ENTALHE,
  pilar: COLUNA_Q,
  topo: ENTALHE,
  piso: [[BRANCO, 3], ["minecraft:white_terracotta", 2], ["minecraft:calcite", 2], [QUARTZO, 2], ["minecraft:light_gray_concrete", 1]],
  pisoCorredor: [["minecraft:calcite", 4], [BRANCO, 3], ["minecraft:white_terracotta", 2], ["minecraft:light_gray_concrete", 1], ["minecraft:white_concrete_powder", 1]],
  borda: "minecraft:purple_terracotta",
  teto: NOITE,
  viga: "minecraft:quartz_slab",
  luz: ALMA,
  vitral: "minecraft:sea_lantern",
  escada: "minecraft:quartz_stairs",
  laje: "minecraft:quartz_slab",
  muro: "minecraft:diorite_wall",
  sujo: "minecraft:white_concrete_powder",
};

/** O vazio do boss: tudo branco, sem cor nenhuma. @type {import("./obras_masmorra_pal.js").Paleta} */
const VAZIO = {
  ...BASE,
  nome: "Vazio",
  parede: [[BRANCO, 6], [QUARTZO, 2], ["minecraft:calcite", 2]],
  rodape: BRANCO,
  friso: BRANCO,
  pilar: QUARTZO,
  piso: [[BRANCO, 4], ["minecraft:snow", 2], ["minecraft:calcite", 1]],
  borda: BRANCO,
  teto: BRANCO,
  sujo: "minecraft:snow",
};

/** Câmaras de aquarela (tesouro e secretas): roxo e azul-noite. @type {import("./obras_masmorra_pal.js").Paleta} */
const AQUA = {
  ...BASE,
  nome: "Aquarela",
  parede: [["minecraft:purple_terracotta", 3], ["minecraft:blue_terracotta", 3], ["minecraft:light_blue_terracotta", 1], ["minecraft:magenta_terracotta", 1], ["minecraft:amethyst_block", 1]],
  rodape: "minecraft:purple_concrete",
  friso: "minecraft:amethyst_block",
  pilar: "minecraft:purple_concrete",
  topo: "minecraft:amethyst_block",
  piso: [["minecraft:blue_terracotta", 3], ["minecraft:purple_terracotta", 3], ["minecraft:light_blue_terracotta", 1], ["minecraft:calcite", 1]],
  borda: "minecraft:amethyst_block",
  teto: "minecraft:blue_concrete",
  luz: ALMA,
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const CORREDOR = {
  ...BASE,
  nome: "Corredor do sonho",
  parede: [["minecraft:calcite", 4], [BRANCO, 3], ["minecraft:quartz_block", 2], ["minecraft:light_gray_concrete", 1]],
  rodape: "minecraft:quartz_bricks",
  teto: NOITE,
};

// ---------------------------------------------------------------- ferramentas
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Há espaço livre (células de sala, longe da parede) no retângulo? @param {Contexto} c @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
function cabe(c, x1, z1, x2, z2) {
  for (let z = z1; z <= z2; z++) for (let x = x1; x <= x2; x++) if (!livre(c, x, z) || c.dwDe(x, z) < 2) return false;
  return true;
}

/** retângulos já usados na sala atual (zera em comum) @type {number[][]} */
let usados = [];

/** Acha um lugar livre para uma peça de raio (rx, rz) e o reserva. @param {Contexto} c @param {Sala} s @param {number} rx @param {number} rz @returns {[number, number] | null} */
function achar(c, s, rx, rz) {
  for (let t = 0; t < 50; t++) {
    const [gx, gz] = sorteio(c, s, 2);
    if (!cabe(c, gx - rx, gz - rz, gx + rx, gz + rz)) continue;
    if (usados.some((u) => gx - rx <= u[2] + 1 && gx + rx >= u[0] - 1 && gz - rz <= u[3] + 1 && gz + rz >= u[1] - 1)) continue;
    usados.push([gx - rx, gz - rz, gx + rx, gz + rz]);
    return [gx, gz];
  }
  return null;
}

/**
 * Acha um lugar encostado numa parede reta, de frente para dentro da sala. A peça ocupa `larg` células ao longo da parede
 * (centradas) e `fundo` células para dentro, começando `vao` células depois da parede. Longe de portas e bocas de corredor.
 * Devolve a âncora (centro da fileira junto à parede) e a direção para dentro.
 * @param {Contexto} c @param {Sala} s @param {number} larg  ímpar @param {number} fundo @param {number} [vao]
 * @returns {{ gx: number, gz: number, fx: number, fz: number, rx: number, rz: number } | null}
 */
function junto(c, s, larg, fundo, vao = 0) {
  const hw = larg >> 1;
  for (let t = 0; t < 80; t++) {
    const [gx, gz] = sorteio(c, s, 0);
    const [fx, fz] = DIRS[Math.floor(c.rng() * 4)];
    const rx = -fz, rz = fx;
    let ok = true;
    for (let l = -hw; l <= hw && ok; l++) {
      const bx = gx + rx * l, bz = gz + rz * l;
      // parede atrás (depois do vão) e vão livre
      if (c.aberto(bx - fx * (vao + 1), bz - fz * (vao + 1))) ok = false;
      for (let d = -vao; d < fundo && ok; d++) {
        const x = bx + fx * d, z = bz + fz * d;
        if (!livre(c, x, z)) ok = false;
        else for (const [ax, az] of DIRS) if (c.cel(x + ax, z + az) === C.PORTA || c.cel(x + ax, z + az) === C.CORR) ok = false;
      }
    }
    if (!ok) continue;
    const xs = [gx - hw * Math.abs(rx) - Math.abs(fx) * 0, gx + hw * Math.abs(rx)], zs = [gz - hw * Math.abs(rz), gz + hw * Math.abs(rz)];
    const x1 = Math.min(xs[0], xs[1], gx + fx * (fundo - 1)), x2 = Math.max(xs[0], xs[1], gx + fx * (fundo - 1)), z1 = Math.min(zs[0], zs[1], gz + fz * (fundo - 1)), z2 = Math.max(zs[0], zs[1], gz + fz * (fundo - 1));
    const bx1 = Math.min(x1, gx - fx * vao), bx2 = Math.max(x2, gx - fx * vao), bz1 = Math.min(z1, gz - fz * vao), bz2 = Math.max(z2, gz - fz * vao);
    if (usados.some((u) => bx1 <= u[2] + 1 && bx2 >= u[0] - 1 && bz1 <= u[3] + 1 && bz2 >= u[1] - 1)) continue;
    usados.push([bx1, bz1, bx2, bz2]);
    return { gx, gz, fx, fz, rx, rz };
  }
  return null;
}

/** Reserva um retângulo à mão. @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
const reservar = (x1, z1, x2, z2) => void usados.push([x1, z1, x2, z2]);

/** Direção sorteada. @param {Contexto} c */
const dirAleatoria = (c) => DIRS[Math.floor(c.rng() * 4)];

/** Coloca blocos num sistema local: (lx) à direita, (lz) à frente de (fx, fz). @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function local(c, gx, gz, fx, fz) {
  const rx = -fz, rz = fx;
  return (/** @type {number} */ lx, /** @type {number} */ ly, /** @type {number} */ lz, /** @type {string} */ id, /** @type {Record<string, string | number | boolean> | undefined} */ est = undefined) => {
    const x = gx + lx * rx + lz * fx, z = gz + lx * rz + lz * fz;
    if (livre(c, x, z)) c.set(x, ly, z, id, est);
  };
}

/** Mancha de aquarela no chão: disco irregular de cores que se misturam. @param {Contexto} c @param {number} cx @param {number} cz @param {number} r @param {string[]} [cores] */
function aquarela(c, cx, cz, r, cores = AQUARELA) {
  const base = Math.floor(c.rng() * cores.length);
  for (let dz = -Math.ceil(r) - 1; dz <= Math.ceil(r) + 1; dz++) {
    for (let dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
      const d = Math.hypot(dx, dz) + (c.hash(cx + dx, cz + dz, 21) - 0.5) * 1.6;
      if (d > r || !livre(c, cx + dx, cz + dz)) continue;
      const pick = d < r * 0.45 ? base : c.hash(cx + dx, cz + dz, 22) < 0.5 ? base : (base + 1 + Math.floor(c.hash(cx + dx, cz + dz, 23) * 2)) % cores.length;
      c.bruto(cx + dx, -1, cz + dz, cores[pick]);
    }
  }
}

/** Rachadura de luz no chão: caminhada irregular de froglight rosa. @param {Contexto} c @param {number} gx @param {number} gz @param {number} len */
function rachadura(c, gx, gz, len) {
  let [dx, dz] = dirAleatoria(c);
  let x = gx, z = gz;
  for (let i = 0; i < len; i++) {
    if (livre(c, x, z)) {
      c.bruto(x, -1, z, LUZ_ROSA);
      if (c.rng() < 0.3) {
        const lx = x + dz, lz = z + dx;
        if (livre(c, lx, lz)) c.bruto(lx, -1, lz, c.rng() < 0.5 ? "minecraft:amethyst_block" : "minecraft:calcite");
      }
    }
    if (c.rng() < 0.35) [dx, dz] = c.rng() < 0.5 ? [dz, -dx] : [-dz, dx];
    x += dx;
    z += dz;
  }
}

/** Torre de erro de imagem: cubos de cores trocadas, com "ecos" deslocados e chão em pixels. @param {Contexto} c @param {number} gx @param {number} gz @param {number} h */
function glitch(c, gx, gz, h) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  h = Math.min(h, tk - 2);
  for (let k = 0; k < h; k++) c.set(gx, k, gz, GLITCH[Math.floor(c.hash(gx, gz, 30 + k) * GLITCH.length)]);
  for (let k = 1; k < h; k++) {
    const [ex, ez] = DIRS[Math.floor(c.hash(gx, gz, 40 + k) * 4)];
    if (c.hash(gx, gz, 50 + k) < 0.55 && livre(c, gx + ex, gz + ez)) c.bruto(gx + ex, k + (c.hash(gx, k, 51) < 0.5 ? 1 : 0), gz + ez, GLITCH[Math.floor(c.hash(gx + ex, gz + ez, 52) * GLITCH.length)]);
  }
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (!livre(c, gx + dx, gz + dz) || c.hash(gx + dx, gz + dz, 53) > 0.55 - Math.hypot(dx, dz) * 0.08) continue;
      c.bruto(gx + dx, -1, gz + dz, c.hash(gx + dx, gz + dz, 54) < 0.5 ? GLITCH[Math.floor(c.hash(gx + dx, gz + dz, 55) * GLITCH.length)] : GLITCH_PO[Math.floor(c.hash(gx + dx, gz + dz, 56) * GLITCH_PO.length)]);
    }
  }
}

/** Obsidiana chorona: monte no chão e uma gota roxa que pinga do teto. @param {Contexto} c @param {number} gx @param {number} gz */
function chorona(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) if (livre(c, gx + dx, gz + dz)) c.set(gx + dx, 0, gz + dz, dx + dz === 0 ? "minecraft:obsidian" : "minecraft:crying_obsidian");
  c.set(gx, 1, gz, "minecraft:crying_obsidian");
  const tk = c.tetoK(gx, gz);
  c.bruto(gx, tk, gz, "minecraft:crying_obsidian");
  c.bruto(gx, tk - 1, gz, "minecraft:crying_obsidian");
  c.bruto(gx, tk - 2, gz, "minecraft:amethyst_cluster", { facing_direction: 0 });
  c.bruto(gx, tk - 3, gz, "minecraft:purple_stained_glass_pane");
}

/** Pilar que flutua em pedaços, com sombra no chão e cacos em volta. @param {Contexto} c @param {number} gx @param {number} gz */
function pilarFlutuante(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  let k = 2;
  while (k < tk - 1) {
    const len = 2 + Math.floor(c.hash(gx, gz, k) * 3);
    for (let i = 0; i < len && k < tk - 1; i++, k++) c.bruto(gx, k, gz, i === 0 || i === len - 1 ? ENTALHE : COLUNA_Q);
    k += 1;
  }
  c.bruto(gx, -1, gz, "minecraft:light_gray_concrete");
  for (let i = 0; i < 3; i++) {
    const [dx, dz] = DIRS[Math.floor(c.hash(gx, gz, 60 + i) * 4)];
    if (livre(c, gx + dx, gz + dz)) c.bruto(gx + dx, 2 + Math.floor(c.hash(gx, gz, 70 + i) * Math.max(1, tk - 5)), gz + dz, c.hash(gx, gz, 80 + i) < 0.6 ? "minecraft:calcite" : "minecraft:quartz_block");
  }
}

/** Escada que sobe em degraus soltos e termina numa porta sozinha no ar. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function escadaPraNada(c, gx, gz, fx, fz, nMax = 5) {
  const tk = c.tetoK(gx, gz);
  const n = Math.min(nMax, tk - 5);
  if (n < 2) return;
  for (let i = 0; i <= n; i++) if (!livre(c, gx + fx * i, gz + fz * i)) return;
  for (let i = 0; i < n; i++) escada(c, gx + fx * i, i, gz + fz * i, "minecraft:quartz_stairs", fx, fz);
  const px = gx + fx * n, pz = gz + fz * n;
  c.set(px, n - 1, pz, "minecraft:quartz_block");
  const rx = -fz, rz = fx;
  for (const l of [-1, 1]) {
    if (!livre(c, px + rx * l, pz + rz * l)) continue;
    c.set(px + rx * l, n - 1, pz + rz * l, "minecraft:quartz_slab", { "minecraft:vertical_half": "top" });
    for (let k = n; k <= n + 2; k++) c.set(px + rx * l, k, pz + rz * l, COLUNA_Q);
  }
  for (const l of [-1, 0, 1]) c.set(px + rx * l, n + 2, pz + rz * l, ENTALHE);
  c.set(px, n, pz, "minecraft:pale_oak_door", { upper_block_bit: false });
  c.set(px, n + 1, pz, "minecraft:pale_oak_door", { upper_block_bit: true });
  c.bruto(px, n + 3, pz, ALMA);
}

/** Escada em espiral solta em volta de um mastro, que sobe até o teto e não leva a lugar nenhum. @param {Contexto} c @param {number} gx @param {number} gz */
function espiral(c, gx, gz) {
  if (!cabe(c, gx - 1, gz - 1, gx + 1, gz + 1)) return;
  const tk = c.tetoK(gx, gz);
  c.fill(gx, 0, gz, gx, tk - 1, gz, TORA);
  const anelPos = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const n = Math.min(2 * (tk - 3), 17);
  for (let i = 0; i < n; i++) {
    const [dx, dz] = anelPos[i % 8];
    c.set(gx + dx, i >> 1, gz + dz, "minecraft:smooth_quartz_slab", { "minecraft:vertical_half": i % 2 === 0 ? "bottom" : "top" });
  }
  c.bruto(gx, tk - 2, gz, ENTALHE);
}

/** Porta sozinha: batente de quartzo no meio do nada, com luz vazando pelo chão. @param {Contexto} c @param {number} gx @param {number} gz @param {"x" | "z"} eixo */
function portaSozinha(c, gx, gz, eixo) {
  const dx = eixo === "x" ? 1 : 0, dz = eixo === "z" ? 1 : 0;
  for (const l of [-1, 0, 1]) if (!livre(c, gx + dx * l, gz + dz * l)) return;
  for (const l of [-1, 1]) for (let k = 0; k <= 2; k++) c.set(gx + dx * l, k, gz + dz * l, k === 2 ? ENTALHE : COLUNA_Q);
  c.set(gx, 2, gz, ENTALHE);
  c.set(gx, 0, gz, "minecraft:pale_oak_door", { upper_block_bit: false, open_bit: c.hash(gx, gz, 90) < 0.4 });
  c.set(gx, 1, gz, "minecraft:pale_oak_door", { upper_block_bit: true, open_bit: c.hash(gx, gz, 90) < 0.4 });
  c.bruto(gx, 3, gz, ALMA);
  c.bruto(gx, -1, gz, LUZ_ROSA);
}

/** Espelho alto de moldura de quartzo. @param {Contexto} c @param {number} gx @param {number} gz @param {"x" | "z"} eixo */
function espelho(c, gx, gz, eixo) {
  const dx = eixo === "x" ? 1 : 0, dz = eixo === "z" ? 1 : 0;
  for (let l = -2; l <= 2; l++) if (!livre(c, gx + dx * l, gz + dz * l)) return;
  const tk = c.tetoK(gx, gz);
  const alto = Math.min(5, tk - 2);
  for (const l of [-2, 2]) for (let k = 0; k <= alto; k++) c.set(gx + dx * l, k, gz + dz * l, k === 0 || k === alto ? ENTALHE : COLUNA_Q);
  for (let l = -1; l <= 1; l++) {
    c.set(gx + dx * l, 0, gz + dz * l, "minecraft:quartz_slab");
    c.set(gx + dx * l, alto, gz + dz * l, ENTALHE);
    for (let k = 1; k < alto; k++) {
      // rachaduras: alguns vidros faltam
      if (c.hash(gx + dx * l, gz + dz * l, 100 + k) < 0.1) continue;
      c.set(gx + dx * l, k, gz + dz * l, c.hash(gx + dx * l, k, gz + dz * l) < 0.2 ? "minecraft:light_blue_stained_glass_pane" : VIDRO);
    }
  }
  c.bruto(gx, alto + 1, gz, ALMA);
}

/** Relógio de pêndulo parado. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function relogio(c, gx, gz, fx, fz) {
  const P = local(c, gx, gz, fx, fz);
  P(0, 0, 0, "minecraft:pale_oak_stairs", { weirdo_direction: c.dirEscada(fx, fz), upside_down_bit: false });
  P(0, 1, 0, MADEIRA);
  P(0, 2, 0, "minecraft:white_glazed_terracotta");
  P(0, 3, 0, MADEIRA);
  P(0, 4, 0, TORA);
  P(0, 5, 0, MADEIRA_L, { "minecraft:vertical_half": "bottom" });
  P(-1, 0, 0, "minecraft:pale_oak_slab");
  P(1, 0, 0, "minecraft:pale_oak_slab");
  P(0, 6, 0, "minecraft:white_candle", { candles: 0, lit: false });
  P(0, 0, 1, c.CORRENTE);
}

/** Cama de casal desfeita: cabeceira, travesseiros, cobertor azul que escorre no chão. @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz @param {number} [W] @param {number} [L] */
function cama(c, gx, gz, fx, fz, W = 2, L = 3) {
  const P = local(c, gx, gz, fx, fz);
  for (let lx = 0; lx < W; lx++) {
    for (let lz = 0; lz < L; lz++) {
      P(lx, 0, lz, MADEIRA);
      P(lx, 1, lz, lz === 0 ? "minecraft:white_wool" : lz === 1 ? "minecraft:white_wool" : lx % 2 === 0 ? "minecraft:light_blue_wool" : "minecraft:light_blue_wool");
    }
    for (let k = 0; k <= 2; k++) P(lx, k, -1, MADEIRA);
    P(lx, 3, -1, MADEIRA_L, { "minecraft:vertical_half": "bottom" });
    P(lx, 0, L, MADEIRA_L, { "minecraft:vertical_half": "bottom" });
  }
  for (const lx of [-1, W]) {
    for (let k = 0; k <= 3; k++) P(lx, k, -1, TORA);
    P(lx, 0, L, TORA);
    P(lx, 4, -1, "minecraft:white_candle", { candles: 1, lit: true });
  }
  P(W, 0, L - 1, "minecraft:light_blue_carpet");
  P(W, 0, L - 2, "minecraft:light_blue_carpet");
  P(0, 2, 0, "minecraft:light_gray_carpet");
  P(Math.max(0, W - 1), 2, 0, "minecraft:white_carpet");
  P(Math.floor(W / 2), 2, L - 1, "minecraft:light_blue_carpet");
}

/** Ursinho de pelúcia sentado, olhando para (fx, fz). @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function ursinho(c, gx, gz, fx, fz) {
  const P = local(c, gx, gz, fx, fz);
  const L = "minecraft:pink_wool", B = "minecraft:white_wool", N = "minecraft:black_concrete";
  P(-1, 0, 0, L); P(1, 0, 0, L); P(-1, 0, 1, B); P(1, 0, 1, B);
  P(0, 0, 0, L); P(0, 1, 0, L); P(-1, 1, 0, L); P(1, 1, 0, L);
  P(0, 1, 1, "minecraft:purple_wool");
  P(-1, 2, 0, L); P(0, 2, 0, L); P(1, 2, 0, L);
  P(-1, 3, 0, L); P(1, 3, 0, L);
  P(-1, 2, 1, N); P(1, 2, 1, N); P(0, 2, 1, B);
}

/** Mesa de chá baixa posta para os ursinhos, com bolo de vela e cadeiras. @param {Contexto} c @param {number} gx @param {number} gz */
function mesaDeCha(c, gx, gz) {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) c.set(gx + dx, 0, gz + dz, "minecraft:pale_oak_slab", { "minecraft:vertical_half": "bottom" });
  c.set(gx, 1, gz, "minecraft:white_candle_cake", { lit: true });
  c.set(gx - 1, 1, gz - 1, "minecraft:flower_pot");
  c.set(gx + 1, 1, gz + 1, "minecraft:flower_pot");
  c.set(gx + 1, 1, gz - 1, "minecraft:closed_eyeblossom");
  ursinho(c, gx - 3, gz, 1, 0);
  ursinho(c, gx + 3, gz, -1, 0);
  tapete(c, gx - 1, gz + 2, gx + 1, gz + 3, "minecraft:purple_carpet");
  c.set(gx, 0, gz + 3, "minecraft:white_candle", { candles: 2, lit: true });
}

/** Balanço de corrente pendurado do teto. @param {Contexto} c @param {number} gx @param {number} gz @param {"x" | "z"} eixo */
function balanco(c, gx, gz, eixo) {
  const dx = eixo === "x" ? 1 : 0, dz = eixo === "z" ? 1 : 0;
  if (!livre(c, gx, gz) || !livre(c, gx + dx, gz + dz)) return;
  const tk = c.tetoK(gx, gz);
  for (const l of [0, 1]) {
    c.fill(gx + dx * l, 2, gz + dz * l, gx + dx * l, tk - 1, gz + dz * l, c.CORRENTE);
    c.set(gx + dx * l, 1, gz + dz * l, MADEIRA_L, { "minecraft:vertical_half": "bottom" });
  }
}

/** Nuvem de lã (elipsoide irregular), com chuva congelada pingando por baixo. @param {Contexto} c @param {number} cx @param {number} cz @param {number} k @param {number} rx @param {number} rz */
function nuvem(c, cx, cz, k, rx, rz) {
  const ry = 1.6;
  const tk = c.tetoK(cx, cz);
  if (k + 2 > tk - 2) return;
  for (let dz = -rz - 1; dz <= rz + 1; dz++) {
    for (let dx = -rx - 1; dx <= rx + 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const r = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2 + (c.hash(cx + dx, cz + dz, 110 + dy) - 0.5) * 0.5;
        if (r > 1 || !livre(c, cx + dx, cz + dz)) continue;
        c.bruto(cx + dx, k + dy, cz + dz, dy < 0 ? (c.hash(cx + dx, cz + dz, 120) < 0.6 ? "minecraft:light_gray_wool" : "minecraft:light_blue_wool") : "minecraft:white_wool");
      }
    }
  }
  // chuva congelada: fios de gotas em segmentos, e uma ponta de pingadeira
  for (let i = 0; i < 4; i++) {
    const gx = cx + Math.round((c.hash(cx, cz, 130 + i) - 0.5) * 2 * (rx - 1)), gz = cz + Math.round((c.hash(cx, cz, 140 + i) - 0.5) * 2 * (rz - 1));
    if (!livre(c, gx, gz) || c.bloco(gx, k - 1, gz) === undefined) continue;
    const alto = Math.max(1, k - 2 - Math.floor(c.hash(gx, gz, 150) * 2));
    for (let kk = k - 2; kk >= Math.max(1, alto - 2) && kk >= 1; kk -= 2) c.bruto(gx, kk, gz, "minecraft:light_blue_stained_glass_pane");
    c.bruto(gx, k - 1, gz, "minecraft:pointed_dripstone", { dripstone_thickness: "tip", hanging: true });
  }
}

/** Cortina de tule presa numa vara de madeira pálida, com uma poça de tecido no chão. Parte de (gx, gz) e segue o passo (dx, dz). @param {Contexto} c @param {number} gx @param {number} gz @param {number} dx @param {number} dz @param {number} larg */
function cortina(c, gx, gz, dx, dz, larg) {
  for (let l = 0; l < larg; l++) {
    const x = gx + dx * l, z = gz + dz * l;
    if (!livre(c, x, z)) continue;
    const tk = c.tetoK(x, z);
    c.bruto(x, tk - 1, z, CERCA);
    const pregas = l % 3 === 1;
    const fim = pregas ? 1 : 0;
    for (let k = tk - 2; k >= fim + 1; k--) c.bruto(x, k, z, pregas ? "minecraft:white_wool" : "minecraft:white_stained_glass_pane");
    if (!pregas) c.bruto(x, 0, z, "minecraft:white_carpet");
    else c.bruto(x, 0, z, "minecraft:white_wool");
  }
}

/** Lampião de rua de madeira pálida, com lanterna de alma. @param {Contexto} c @param {number} gx @param {number} gz */
function lampiao(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  c.set(gx, 0, gz, "minecraft:smooth_quartz_slab", { "minecraft:vertical_half": "bottom" });
  for (let k = 0; k <= 3; k++) c.set(gx, k, gz, k === 0 ? CERCA : CERCA);
  c.set(gx, 4, gz, ALMA);
}

/** Vitrine de vidro com uma chama de alma dentro de um pedestal. @param {Contexto} c @param {number} gx @param {number} gz */
function vitrine(c, gx, gz) {
  if (!cabe(c, gx - 1, gz - 1, gx + 1, gz + 1)) return;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) c.set(gx + dx, 0, gz + dz, dx === 0 && dz === 0 ? QUARTZO : "minecraft:quartz_slab");
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dz === 0) continue;
      for (let k = 1; k <= 3; k++) c.set(gx + dx, k, gz + dz, "minecraft:light_blue_stained_glass");
    }
  }
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) c.set(gx + dx, 4, gz + dz, "minecraft:purple_stained_glass");
  c.set(gx, 1, gz, ALMA);
  c.set(gx, 2, gz, "minecraft:amethyst_cluster", { facing_direction: 1 });
}

/** Cacho de vaga-lumes e lanternas penduradas em alturas diferentes. @param {Contexto} c @param {Sala} s @param {number} n */
function vagalumes(c, s, n) {
  for (let i = 0; i < n; i++) {
    const [gx, gz] = sorteio(c, s, 1);
    if (!livre(c, gx, gz)) continue;
    const tk = c.tetoK(gx, gz);
    if (tk < 5) continue;
    c.bruto(gx, 2 + Math.floor(c.rng() * Math.max(1, tk - 4)), gz, "minecraft:end_rod", { facing_direction: 1 });
  }
}

/** Caixa de música: jukebox em pedestal com mantas de nuvem. @param {Contexto} c @param {number} gx @param {number} gz */
function caixaDeMusica(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  c.set(gx, 0, gz, QUARTZO);
  c.set(gx, 1, gz, "minecraft:jukebox");
  c.set(gx, 2, gz, "minecraft:purple_candle", { candles: 2, lit: true });
  for (const [dx, dz] of DIRS) if (livre(c, gx + dx, gz + dz)) c.set(gx + dx, 0, gz + dz, "minecraft:quartz_slab", { "minecraft:vertical_half": "bottom" });
}

// ---------------------------------------------------------------- cenas das salas de combate
/** @type {((c: Contexto, s: Sala) => void)[]} */
const CENAS = [
  // 0: quarto abandonado: cama desfeita, relógio parado, mesa de chá, cortinas
  (c, s) => {
    const a = achar(c, s, 2, 3);
    if (a) {
      const [fx, fz] = dirAleatoria(c);
      cama(c, a[0] - fz * 0 - 0, a[1] - 1, fx, fz);
    }
    const r = achar(c, s, 1, 1);
    if (r) { const [fx, fz] = dirAleatoria(c); relogio(c, r[0], r[1], fx, fz); }
    const m = achar(c, s, 4, 3);
    if (m) mesaDeCha(c, m[0], m[1]);
    const t = achar(c, s, 3, 1);
    if (t) cortina(c, t[0] - 2, t[1], 1, 0, 5);
  },
  // 1: escadaria impossível
  (c, s) => {
    const e = achar(c, s, 1, 1);
    if (e) espiral(c, e[0], e[1]);
    const [fx, fz] = dirAleatoria(c);
    const n = achar(c, s, 3, 3);
    if (n) escadaPraNada(c, n[0] - fx * 2, n[1] - fz * 2, fx, fz);
    for (let i = 0; i < 4; i++) { const p = achar(c, s, 1, 1); if (p) pilarFlutuante(c, p[0], p[1]); }
  },
  // 2: salão dos espelhos
  (c, s) => {
    for (let i = 0; i < 3; i++) {
      const a = achar(c, s, 2, 1);
      if (a) espelho(c, a[0], a[1], c.rng() < 0.5 ? "x" : "z");
    }
    for (let i = 0; i < 2; i++) { const p = achar(c, s, 1, 1); if (p) pilarFlutuante(c, p[0], p[1]); }
    const d = achar(c, s, 1, 1);
    if (d) portaSozinha(c, d[0], d[1], c.rng() < 0.5 ? "x" : "z");
  },
  // 3: céu invertido: nuvens, chuva congelada, balanços
  (c, s) => {
    for (let i = 0; i < 3; i++) {
      const a = achar(c, s, 3, 3);
      if (a) nuvem(c, a[0], a[1], 4 + (i % 2), 2 + (i % 2), 2);
    }
    for (let i = 0; i < 2; i++) {
      const b = achar(c, s, 1, 0);
      if (b) balanco(c, b[0], b[1], "x");
    }
    const l = achar(c, s, 0, 0);
    if (l) lampiao(c, l[0], l[1]);
  },
  // 4: erro de imagem: torres de cores trocadas, obsidiana chorona, rachaduras de luz
  (c, s) => {
    for (let i = 0; i < 3 + Math.floor((s.w * s.h) / 80); i++) {
      const g = achar(c, s, 1, 1);
      if (g) glitch(c, g[0], g[1], 3 + Math.floor(c.rng() * 3));
    }
    for (let i = 0; i < 2; i++) { const o = achar(c, s, 1, 1); if (o) chorona(c, o[0], o[1]); }
    const [gx, gz] = sorteio(c, s, 2);
    rachadura(c, gx, gz, 10 + Math.floor(c.rng() * 8));
  },
  // 5: sala do relógio e das portas: portas sozinhas e espelhos
  (c, s) => {
    for (let i = 0; i < 3; i++) {
      const d = achar(c, s, 1, 1);
      if (d) portaSozinha(c, d[0], d[1], i % 2 === 0 ? "x" : "z");
    }
    const r = achar(c, s, 1, 1);
    if (r) { const [fx, fz] = dirAleatoria(c); relogio(c, r[0], r[1], fx, fz); }
    const p = achar(c, s, 1, 1);
    if (p) pilarFlutuante(c, p[0], p[1]);
    const e = achar(c, s, 2, 1);
    if (e) espelho(c, e[0], e[1], "x");
  },
];

/** @param {Contexto} c @param {Sala} s */
function cenaDe(c, s) {
  const peq = s.w * s.h < 70;
  const i = Math.floor(c.hash(s.x, s.z, 11) * (peq ? 3 : CENAS.length));
  CENAS[peq ? [0, 4, 5][i] : i](c, s);
}

/** @type {Tema} */
export const TEMA_SONHO = {
  id: "sonho",
  nome: "O Sonho",
  rocha: "minecraft:deepslate",
  paletas: [BASE, VAZIO, AQUA, CORREDOR],
  alturaCorredor: 5,
  abobada: 1,
  forma: (s, i) => (s.papel === "boss" ? "oval" : s.papel === "entrada" ? "octo" : s.papel === "miniboss" ? "cruz" : s.papel === "tesouro" || s.papel === "secreta" || s.papel === "descanso" ? "oval" : ["ret", "ele", "octo", "ret", "cruz"][i % 5]),
  vela: "minecraft:white_candle",
  comum(c, s) {
    usados = [];
    const area = s.w * s.h;
    // estrelas no teto noturno e musgo pálido pendurado
    for (let i = 0; i < Math.round(area / 22); i++) {
      const [gx, gz] = sorteio(c, s, 0);
      if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz), gz, c.rng() < 0.7 ? "minecraft:sea_lantern" : "minecraft:amethyst_block");
    }
    for (let i = 0; i < Math.round(area / 14); i++) {
      const [gx, gz] = sorteio(c, s, 0);
      if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, "minecraft:pale_hanging_moss");
    }
    // lanternas de alma penduradas, cada uma numa altura
    const cc = centroDe(s);
    const passo = s.w >= 15 ? 6 : 5;
    for (let gz = s.z + 2; gz < s.z + s.h - 1; gz += passo) {
      for (let gx = s.x + 2; gx < s.x + s.w - 1; gx += passo) {
        if (livre(c, gx, gz) && (gx !== cc.x || gz !== cc.z) && c.dwDe(gx, gz) >= 2) lustre(c, gx, gz, c.tetoK(gx, gz) - 3 - Math.floor(c.hash(gx, gz, 8) * 3), ALMA);
      }
    }
    vagalumes(c, s, Math.round(area / 30));
    // aquarela e rachaduras no chão
    for (let i = 0; i < 1 + Math.floor(area / 90); i++) {
      const [gx, gz] = sorteio(c, s, 2);
      aquarela(c, gx, gz, 1.5 + c.rng() * 2);
    }
    if (c.rng() < 0.5) {
      const [gx, gz] = sorteio(c, s, 2);
      rachadura(c, gx, gz, 6 + Math.floor(c.rng() * 8));
    }
  },
  pecas: {
    entrada(c, s) {
      // o quarto de onde se acorda: anel de aquarela no chão, altar de obsidiana chorona, cama desfeita, relógio parado, cortinas
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 6.5, -1, QUARTZO);
      anel(c, cx, cz, 4.5, 6.5, -1, "minecraft:purple_terracotta");
      anel(c, cx, cz, 5.2, 5.9, -1, "minecraft:light_blue_terracotta");
      anel(c, cx, cz, 2.6, 3.2, -1, "minecraft:white_terracotta");
      // altar
      const ax = cx, az = cz - 3;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) c.set(ax + dx, 0, az + dz, "minecraft:quartz_bricks");
      for (const [dx, dz, fx, fz] of [[0, 2, 0, -1], [0, -2, 0, 1], [2, 0, -1, 0], [-2, 0, 1, 0]]) for (const o of [-1, 0, 1]) escada(c, dx === 0 ? ax + o : ax + dx, 0, dx === 0 ? az + dz : az + o, "minecraft:quartz_stairs", fx, fz);
      c.set(ax, 1, az, "minecraft:crying_obsidian");
      c.set(ax, 2, az, ALMA);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(ax + dx, 1, az + dz, "minecraft:white_candle", { candles: 2, lit: true });
      // halo de vaga-lumes em volta do altar
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const hx = ax + Math.round(Math.cos(a) * 2), hz = az + Math.round(Math.sin(a) * 2);
        if (livre(c, hx, hz)) c.bruto(hx, 3 + (i % 3), hz, "minecraft:end_rod", { facing_direction: 1 });
      }
      c.meta.altar = { x: c.wx(ax), y: c.wy(1), z: c.wz(az) };
      // arco de volta, à direita
      const zona = arcoDePortal(c, cx + 4, cz, "z", { pilar: COLUNA_Q, topo: ENTALHE, brilho: LUZ_ROSA, luz: ALMA });
      c.portal(zona, "volta");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), volta: { x: c.wx(cx + 1) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 } };
      c.meta.chegada = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 };
      // cama desfeita à esquerda, ursinho esquecido, relógio parado no fundo
      cama(c, cx - 6, cz + 1, 1, 0, 2, 4);
      ursinho(c, cx - 4, cz + 3, 1, 0);
      c.set(cx - 7, 0, cz - 1, "minecraft:white_candle", { candles: 3, lit: true });
      relogio(c, cx - 5, cz - 4, 0, 1);
      relogio(c, cx + 5, cz - 4, 0, 1);
      cortina(c, cx - 2, cz + 6, 1, 0, 5);
      // tapete de nuvem e espelho rachado
      tapete(c, cx - 1, cz, cx + 1, cz + 3, "minecraft:light_gray_carpet");
      if (cabe(c, cx + 3, cz + 4, cx + 7, cz + 6)) espelho(c, cx + 5, cz + 5, "x");
      pilarFlutuante(c, cx - 6, cz - 6);
      pilarFlutuante(c, cx + 6, cz + 6);
      rachadura(c, cx + 1, cz + 3, 12);
    },
    combate(c, s) {
      cenaDe(c, s);
    },
    armadilha(c, s) {
      // amarelinha do pesadelo: tabuleiro de quadros pretos e brancos com placas de pressão, portas sozinhas e espelhos
      for (let gz = s.z; gz < s.z + s.h; gz++) {
        for (let gx = s.x; gx < s.x + s.w; gx++) {
          if (!livre(c, gx, gz) || c.dwDe(gx, gz) < 2) continue;
          c.bruto(gx, -1, gz, (gx + gz) % 2 === 0 ? BRANCO : "minecraft:black_concrete");
          if ((gx + gz) % 2 === 1 && c.hash(gx, gz, 17) < 0.18) {
            c.bruto(gx, -1, gz, "minecraft:cracked_deepslate_tiles");
            c.set(gx, 0, gz, "minecraft:stone_pressure_plate");
          }
        }
      }
      for (let i = 0; i < 2; i++) { const d = achar(c, s, 1, 1); if (d) portaSozinha(c, d[0], d[1], i % 2 === 0 ? "x" : "z"); }
      for (let i = 0; i < 3; i++) { const p = achar(c, s, 1, 1); if (p) pilarFlutuante(c, p[0], p[1]); }
      const e = achar(c, s, 2, 1);
      if (e) espelho(c, e[0], e[1], "x");
      for (let i = 0; i < 2; i++) { const g = achar(c, s, 1, 1); if (g) glitch(c, g[0], g[1], 3); }
    },
    elite(c, s) {
      // quarto de brinquedos do pesadelo: cama enorme, berço com móbile, torres de blocos de criança, ursinhos
      const { x: cx, z: cz } = centroDe(s);
      let ok = false;
      if (cabe(c, cx - 3, cz - 4, cx + 3, cz + 3)) {
        cama(c, cx - 1, cz - 3, 0, 1, 3, 4);
        // monte de cobertores
        for (const [dx, dz, h] of [[0, 1, 2], [1, 2, 1], [-1, 2, 2], [1, 1, 1]]) c.set(cx + dx, 2 + h - 1, cz - 3 + dz, h === 2 ? "minecraft:light_blue_wool" : "minecraft:white_wool");
        ok = true;
      }
      reservar(cx - 3, cz - 4, cx + 3, cz + 3);
      void ok;
      // berço: grade de cerca com colchão e móbile
      const b = achar(c, s, 2, 2);
      if (b) {
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) === 1 || Math.abs(dz) === 1) { c.set(b[0] + dx, 0, b[1] + dz, CERCA); c.set(b[0] + dx, 1, b[1] + dz, CERCA); }
          else c.set(b[0], 0, b[1], "minecraft:white_wool");
        }
        c.set(b[0], 1, b[1], "minecraft:pink_carpet");
        const tk = c.tetoK(b[0], b[1]);
        lustre(c, b[0], b[1], Math.max(4, tk - 4), "minecraft:soul_lantern", 1);
      }
      // blocos de brinquedo empilhados
      for (let i = 0; i < 3; i++) {
        const t = achar(c, s, 1, 1);
        if (!t) continue;
        const cores = ["minecraft:red_concrete", "minecraft:blue_concrete", "minecraft:yellow_concrete", "minecraft:lime_concrete"];
        c.set(t[0], 0, t[1], cores[i % 4]);
        c.set(t[0] + 1, 0, t[1], cores[(i + 1) % 4]);
        c.set(t[0], 1, t[1], cores[(i + 2) % 4]);
      }
      for (let i = 0; i < 2; i++) { const u = achar(c, s, 1, 1); if (u) { const [fx, fz] = dirAleatoria(c); ursinho(c, u[0], u[1], fx, fz); } }
      for (let i = 0; i < 2; i++) { const p = achar(c, s, 1, 1); if (p) pilarFlutuante(c, p[0], p[1]); }
      const g = achar(c, s, 1, 1);
      if (g) chorona(c, g[0], g[1]);
      const baus = achar(c, s, 0, 0);
      if (baus) c.bau(baus[0], 0, baus[1], "south", "elite");
      else c.bau(cx, 0, cz + 4, "south", "elite");
    },
    miniboss(c, s) {
      // a Sala do Relógio Parado: mostrador gigante no chão com os ponteiros em 10 para as 3, pêndulo no teto, a chave num pedestal
      const { x: cx, z: cz } = centroDe(s);
      const r = Math.min(7.5, Math.min(s.w, s.h) / 2 - 0.5);
      disco(c, cx, cz, r, -1, BRANCO);
      anel(c, cx, cz, r - 0.8, r, -1, "minecraft:black_concrete");
      for (let h = 0; h < 12; h++) {
        const a = (h * Math.PI) / 6;
        const gx = cx + Math.round(Math.cos(a) * (r - 1.8)), gz = cz + Math.round(Math.sin(a) * (r - 1.8));
        if (livre(c, gx, gz)) c.bruto(gx, -1, gz, h % 3 === 0 ? "minecraft:purple_concrete" : "minecraft:black_concrete");
      }
      // ponteiros: uma linha comprida e uma curta, em 10:10
      /** @param {number} ang @param {number} len @param {string} id */
      const ponteiro = (ang, len, id) => {
        for (let i = 0; i <= len; i++) {
          const gx = cx + Math.round(Math.cos(ang) * i), gz = cz + Math.round(Math.sin(ang) * i);
          if (livre(c, gx, gz)) c.bruto(gx, -1, gz, id);
        }
      };
      ponteiro(-Math.PI * 0.83, r - 3.5, "minecraft:black_concrete");
      ponteiro(-Math.PI * 0.33, r - 2, "minecraft:purple_concrete");
      // pêndulo: corrente do teto e um disco no meio, parado no ar
      const tk = c.tetoK(cx, cz);
      c.fill(cx, 3, cz, cx, tk - 1, cz, c.CORRENTE);
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]]) if (livre(c, cx + dx, cz + dz) && Math.abs(dx) + Math.abs(dz) < 2) c.set(cx + dx, 2, cz + dz, dx === 0 && dz === 0 ? "minecraft:gold_block" : "minecraft:white_concrete");
      c.set(cx, 1, cz, "minecraft:gold_block");
      // pedestal da chave
      const px = cx + Math.round(r) - 1;
      c.set(px, 0, cz, QUARTZO);
      c.bau(px, 1, cz, "west", "chave");
      c.set(px, 2, cz, ALMA);
      for (const dz of [-1, 1]) c.set(px, 0, cz + dz, "minecraft:quartz_slab", { "minecraft:vertical_half": "bottom" });
      // espelhos e pilares quebrados em volta
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const ex = cx + dx * Math.round(r + 1), ez = cz + dz * Math.round(r + 1);
        if (dx !== 1) espelho(c, ex, ez, dx === 0 ? "x" : "z");
      }
      for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) pilarFlutuante(c, cx + dx, cz + dz);
      reservar(cx - 8, cz - 8, cx + 8, cz + 8);
    },
    boss(c, s) {
      // o Vazio Branco: tudo sem cor no meio, aquarela esmaecida nas bordas, raios de luz, espelhos, buraco branco no teto
      const { x: cx, z: cz } = centroDe(s);
      const raio = Math.min(s.w, s.h) / 2;
      for (let gz = s.z; gz < s.z + s.h; gz++) {
        for (let gx = s.x; gx < s.x + s.w; gx++) {
          if (!livre(c, gx, gz)) continue;
          const d = Math.hypot(gx - cx, gz - cz);
          const t = Math.max(0, Math.min(1, (d - 4) / Math.max(1, raio - 5)));
          if (c.hash(gx, gz, 24) < t * t * 0.85) c.bruto(gx, -1, gz, AQUARELA[Math.floor(c.hash(gx, gz, 25) * 4)]);
        }
      }
      disco(c, cx, cz, 3.3, -1, "minecraft:snow");
      anel(c, cx, cz, 3.3, 4.3, -1, "minecraft:calcite");
      // raios de luz saindo do centro
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.2;
        for (let d = 4; d < raio - 1; d++) {
          if (c.hash(i, d, 26) < 0.25) continue;
          const gx = cx + Math.round(Math.cos(a) * d + (c.hash(i, d, 27) - 0.5)), gz = cz + Math.round(Math.sin(a) * d + (c.hash(i, d, 28) - 0.5));
          if (livre(c, gx, gz)) c.bruto(gx, -1, gz, c.hash(i, d, 29) < 0.8 ? LUZ_ROSA : "minecraft:amethyst_block");
        }
      }
      // pilares flutuando em anel e espelhos nos quatro cantos
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI * 2) / 10 + 0.3;
        pilarFlutuante(c, cx + Math.round(Math.cos(a) * (raio - 3)), cz + Math.round(Math.sin(a) * (raio - 3)));
      }
      for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const ex = cx + dx * Math.round(raio - 5), ez = cz + dz * Math.round(raio - 5);
        if (dz !== -1) espelho(c, ex, ez, dx === 0 ? "x" : "z");
      }
      // buraco branco no teto: disco de concreto com núcleo de luz e anel de lanternas
      const tk = c.tetoK(cx, cz);
      for (let dz = -6; dz <= 6; dz++) {
        for (let dx = -6; dx <= 6; dx++) {
          const d = Math.hypot(dx, dz);
          if (d > 6 || !livre(c, cx + dx, cz + dz)) continue;
          c.bruto(cx + dx, tk, cz + dz, d < 2.5 ? "minecraft:sea_lantern" : d > 5 ? "minecraft:amethyst_block" : BRANCO);
        }
      }
      // estilhaços brancos pendurados no ar
      for (let i = 0; i < 9; i++) {
        const a = c.hash(i, s.id, 31) * Math.PI * 2, d = 4 + c.hash(i, s.id, 32) * (raio - 6);
        const gx = cx + Math.round(Math.cos(a) * d), gz = cz + Math.round(Math.sin(a) * d), k = 5 + Math.floor(c.hash(i, s.id, 33) * (tk - 8));
        for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]) if (livre(c, gx + dx, gz + dz)) c.bruto(gx + dx, k + dy, gz + dz, i % 3 === 0 ? "minecraft:calcite" : BRANCO);
      }
      for (let i = 0; i < 3; i++) glitch(c, cx + Math.round(Math.cos(i * 2.1 + 0.8) * (raio - 2)), cz + Math.round(Math.sin(i * 2.1 + 0.8) * (raio - 2)), 4);
      chorona(c, cx - Math.round(raio - 2), cz + 2);
      chorona(c, cx + Math.round(raio - 2), cz - 2);
      // portal para o andar 5 ao fundo
      const zona = arcoDePortal(c, cx, s.z + 3, "x", { pilar: COLUNA_Q, topo: ENTALHE, brilho: LUZ_ROSA, luz: ALMA });
      c.portal(zona, "desce");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), desce: { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(s.z + 7) + 0.5 } };
      c.meta.arena = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz) + 0.5, raio: raio - 2, sala: s.id };
    },
    tesouro(c, s) {
      // o baú de brinquedos: aquarela por todo lado, caixa de música, vitrine, nuvem com chuva congelada, cacho de ametistas
      const { x: cx, z: cz } = centroDe(s);
      aquarela(c, cx, cz, Math.min(s.w, s.h) / 2 - 1.5);
      for (let i = 0; i < 12; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, "minecraft:amethyst_cluster", { facing_direction: 1 });
      }
      caixaDeMusica(c, cx, cz);
      c.bau(cx - 2, 0, cz + 2, "north", "tesouro");
      c.bau(cx + 2, 0, cz + 2, "north", "tesouro");
      const [a, b] = [cx - 3, cz - 3];
      nuvem(c, a, b, 4, 2, 2);
      balanco(c, cx + 2, cz - 3, "x");
      ursinho(c, cx, cz + 4, 0, -1);
      for (const dz of [2]) for (const dx of [-3, 3]) if (livre(c, cx + dx, cz + dz)) c.set(cx + dx, 0, cz + dz, "minecraft:purple_candle", { candles: 3, lit: true });
    },
    secreta(c, s) {
      this.tesouro(c, s);
      const { x: cx, z: cz } = centroDe(s);
      c.bau(cx, 0, cz - 2, "south", "tesouro");
      const d = achar(c, s, 1, 1);
      if (d) portaSozinha(c, d[0], d[1], "x");
    },
    descanso(c, s) {
      // quarto de dormir: cama arrumada, mesa de chá com os ursinhos, lampião, balanço e flores pálidas. A vida volta aos poucos aqui.
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, Math.min(s.w, s.h) / 2 - 1, -1, "minecraft:white_terracotta");
      anel(c, cx, cz, 1.5, 2.3, -1, "minecraft:light_blue_terracotta");
      for (let i = 0; i < 26; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, ["minecraft:oxeye_daisy", "minecraft:white_tulip", "minecraft:allium", "minecraft:lily_of_the_valley", "minecraft:azure_bluet", "minecraft:closed_eyeblossom"][Math.floor(c.rng() * 6)]);
      }
      c.set(cx, 0, cz, "minecraft:soul_campfire");
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.set(cx + dx, 0, cz + dz, "minecraft:light_gray_wool");
      lampiao(c, cx + 3, cz - 3);
      lampiao(c, cx - 3, cz - 3);
      if (cabe(c, cx - 2, cz - 6, cx + 2, cz - 4)) cama(c, cx - 1, cz - 6, 0, 1, 2, 3);
      if (cabe(c, cx + 3, cz + 1, cx + 6, cz + 4)) ursinho(c, cx + 4, cz + 2, -1, 0);
      balanco(c, cx - 4, cz + 3, "x");
      usados = [];
      c.meta.extra = { ...(c.meta.extra ?? {}), descanso: s.id };
    },
  },
  extras(c, plano) {
    // corredores: musgo pálido pendurado, fendas de luz no chão e uma vela
    for (const co of plano.corredores) {
      if (co.tipo !== "c") continue;
      for (let u = co.a + 1; u <= co.b - 1; u++) {
        const gx = co.eixo === "h" ? u : co.c, gz = co.eixo === "h" ? co.c : u;
        if (c.cel(gx, gz) !== C.CORR) continue;
        const h = c.hash(gx, gz, 200);
        if (h < 0.12) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, "minecraft:pale_hanging_moss");
        else if (h < 0.17) c.bruto(gx, -1, gz, LUZ_ROSA);
        else if (h < 0.2) c.bruto(gx, c.tetoK(gx, gz), gz, "minecraft:sea_lantern");
      }
    }
  },
};
