// @ts-check
// Andar 1: A TOCA. Onde a Vulpus começou: um sistema de cavernas de raízes, musgo e lanternas, a primeira luz da Kiza no abrigo,
// filhotes de raposa travessos e, no fundo, o Ninho da Raposa Mãe. Salas ovais orgânicas, tetos baixos de raiz, luz quente.
import { AR, anel, barril, centroDe, coluna, disco, escada, estalactite, lustre, sorteio, tapete, teia, vela, livre, arcoDePortal } from "./masm_pecas.js";

/** @typedef {import("./masm_construir.js").Tema} Tema */
/** @typedef {import("./masm_pecas.js").Contexto} Contexto */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */

const MUSGO = "minecraft:moss_block";
const TERRA = "minecraft:coarse_dirt";
const FENO = "minecraft:hay_block";

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const BASE = {
  nome: "Toca",
  parede: [["minecraft:coarse_dirt", 4], ["minecraft:dirt_with_roots", 3], ["minecraft:packed_mud", 2], ["minecraft:mud_bricks", 2], ["minecraft:mossy_cobblestone", 1]],
  rodape: "minecraft:mud_bricks",
  friso: "minecraft:mangrove_roots",
  pilar: "minecraft:stripped_mangrove_log",
  topo: "minecraft:mangrove_planks",
  piso: [[MUSGO, 4], [TERRA, 3], ["minecraft:podzol", 2], ["minecraft:mud", 1], ["minecraft:grass_block", 2], ["minecraft:dirt_with_roots", 1]],
  pisoCorredor: [[TERRA, 4], ["minecraft:podzol", 2], ["minecraft:gravel", 1], ["minecraft:mud", 1]],
  borda: MUSGO,
  teto: "minecraft:dirt_with_roots",
  viga: "minecraft:mangrove_roots",
  luz: "minecraft:lantern",
  vitral: "minecraft:shroomlight",
  escada: "minecraft:mud_brick_stairs",
  laje: "minecraft:mud_brick_slab",
  muro: "minecraft:mud_brick_wall",
  sujo: "minecraft:mossy_cobblestone",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const NINHO = {
  ...BASE,
  nome: "Ninho",
  parede: [["minecraft:packed_mud", 3], ["minecraft:dirt_with_roots", 3], [TERRA, 2], [FENO, 1]],
  rodape: "minecraft:packed_mud",
  piso: [[FENO, 3], [TERRA, 3], ["minecraft:podzol", 2], ["minecraft:bone_block", 1]],
  borda: FENO,
  teto: "minecraft:dirt_with_roots",
  luz: "minecraft:lantern",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const TESOURO = {
  ...BASE,
  nome: "Esconderijo",
  parede: [["minecraft:calcite", 3], ["minecraft:amethyst_block", 2], [MUSGO, 2], ["minecraft:smooth_basalt", 1]],
  rodape: "minecraft:smooth_basalt",
  friso: "minecraft:amethyst_block",
  piso: [[MUSGO, 3], ["minecraft:calcite", 2], ["minecraft:amethyst_block", 1]],
  borda: "minecraft:amethyst_block",
  teto: "minecraft:calcite",
  luz: "minecraft:soul_lantern",
};

/** @type {import("./obras_masmorra_pal.js").Paleta} */
const CORREDOR = {
  ...BASE,
  nome: "Túnel",
  parede: [["minecraft:coarse_dirt", 5], ["minecraft:dirt_with_roots", 4], ["minecraft:packed_mud", 1], ["minecraft:mossy_cobblestone", 1]],
  rodape: "minecraft:coarse_dirt",
  friso: "minecraft:mangrove_roots",
  teto: "minecraft:dirt_with_roots",
};

/** Raposinha de concreto sentada, olhando para (fx, fz). @param {Contexto} c @param {number} gx @param {number} gz @param {number} fx @param {number} fz */
function raposinha(c, gx, gz, fx, fz) {
  const rx = -fz, rz = fx;
  const P = (/** @type {number} */ lx, /** @type {number} */ ly, /** @type {number} */ lz, /** @type {string} */ id) => {
    const x = gx + lx * rx + lz * fx, z = gz + lx * rz + lz * fz;
    if (livre(c, x, z)) c.set(x, ly, z, id);
  };
  const L = "minecraft:orange_concrete", B = "minecraft:white_concrete", N = "minecraft:black_concrete";
  P(0, 0, 0, L); P(0, 0, -1, L); P(0, 1, 0, B); P(0, 1, -1, L);
  P(0, 2, 0, L); P(0, 2, 1, B); P(0, 3, 1, N); P(-1, 3, 0, N); P(1, 3, 0, N);
  P(-1, 4, -1, L); P(1, 4, -1, L); P(-1, 5, -1, N); P(1, 5, -1, N);
  P(-1, 2, 0, B); P(1, 2, 0, B); P(-1, 3, -1, L); P(1, 3, -1, L);
  P(0, 0, -2, L); P(0, 1, -3, L); P(0, 2, -3, B);
}

/** Pilar de raiz do chão ao teto (tronco com raízes na base). @param {Contexto} c @param {number} gx @param {number} gz */
function raiz(c, gx, gz) {
  if (!livre(c, gx, gz)) return;
  const tk = c.tetoK(gx, gz);
  c.fill(gx, 0, gz, gx, tk - 1, gz, "minecraft:mangrove_log");
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (livre(c, gx + a, gz + b) && c.hash(gx + a, gz + b, 5) < 0.7) c.set(gx + a, 0, gz + b, "minecraft:mangrove_roots");
  for (const [a, b] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) if (livre(c, gx + a, gz + b) && c.hash(gx, gz, a * 3 + b) < 0.5) c.set(gx + a, tk - 1, gz + b, "minecraft:mangrove_roots");
}

/** Monte de terra (3x3 que sobe). @param {Contexto} c @param {number} gx @param {number} gz @param {string} [id] */
function monte(c, gx, gz, id = TERRA) {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (livre(c, gx + dx, gz + dz) && !(Math.abs(dx) + Math.abs(dz) === 2 && c.hash(gx + dx, gz + dz, 9) < 0.5)) c.set(gx + dx, 0, gz + dz, id);
  if (livre(c, gx, gz)) c.set(gx, 1, gz, id);
}

/** @type {Tema} */
export const TEMA_TOCA = {
  id: "toca",
  nome: "A Toca",
  rocha: "minecraft:dirt",
  paletas: [BASE, NINHO, TESOURO, CORREDOR],
  alturaCorredor: 5,
  abobada: 2,
  forma: (s) => (s.papel === "boss" || s.papel === "entrada" ? "oval" : s.w * s.h > 120 ? "oval" : "ret"),
  vela: "minecraft:candle",
  comum(c, s) {
    // raízes e cogumelos luminosos pendurados, tufos de musgo no chão, lanternas penduradas por correntes
    const nRaiz = Math.round((s.w * s.h) / 14);
    for (let i = 0; i < nRaiz; i++) {
      const [gx, gz] = sorteio(c, s, 0);
      if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, "minecraft:hanging_roots");
    }
    for (let i = 0; i < Math.round((s.w * s.h) / 28); i++) {
      const [gx, gz] = sorteio(c, s, 0);
      if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz), gz, "minecraft:shroomlight");
    }
    for (let i = 0; i < Math.round((s.w * s.h) / 20); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.bruto(gx, 0, gz, c.hash(gx, gz, 3) < 0.5 ? "minecraft:moss_carpet" : "minecraft:short_grass");
    }
    for (let i = 0; i < Math.round((s.w * s.h) / 60); i++) {
      const [gx, gz] = sorteio(c, s, 1);
      if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, c.hash(gx, gz, 4) < 0.5 ? "minecraft:brown_mushroom" : "minecraft:red_mushroom");
    }
    const cc = centroDe(s);
    const passo = s.w >= 15 ? 6 : 5;
    for (let gz = s.z + 2; gz < s.z + s.h - 1; gz += passo) for (let gx = s.x + 2; gx < s.x + s.w - 1; gx += passo) if (livre(c, gx, gz) && (gx !== cc.x || gz !== cc.z)) lustre(c, gx, gz, c.tetoK(gx, gz) - 3, c.palDe(gx, gz).luz);
    for (let i = 0; i < 3; i++) {
      const [gx, gz] = sorteio(c, s, 1);
      estalactite(c, gx, gz);
    }
  },
  pecas: {
    entrada(c, s) {
      // abrigo da Kiza: a primeira luz (um cacho de lanternas sobre um toco), altar, arco de volta, bancos de tora
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 5.5, -1, MUSGO);
      anel(c, cx, cz, 5.5, 6.5, -1, "minecraft:podzol");
      // toco da luz da Kiza
      c.fill(cx - 3, 0, cz, cx - 3, 1, cz, "minecraft:mangrove_log");
      c.set(cx - 3, 2, cz, "minecraft:lantern");
      c.set(cx - 4, 0, cz, "minecraft:mangrove_roots");
      c.set(cx - 2, 0, cz, "minecraft:mangrove_roots");
      for (const [dx, dz] of [[-3, 1], [-3, -1]]) c.set(cx + dx, 0, cz + dz, "minecraft:candle", { candles: 3, lit: true });
      lustre(c, cx - 3, cz, c.tetoK(cx - 3, cz) - 3, "minecraft:lantern", 2);
      // altar (bloco interativo): pedestal de tijolo de lama com obsidiana chorona
      const ax = cx, az = cz - 3;
      c.fill(ax - 1, 0, az - 1, ax + 1, 0, az + 1, "minecraft:mud_bricks");
      for (const [dx, dz, fx, fz] of [[0, 2, 0, -1], [0, -2, 0, 1], [2, 0, -1, 0], [-2, 0, 1, 0]]) for (const o of [-1, 0, 1]) escada(c, dx === 0 ? ax + o : ax + dx, 0, dx === 0 ? az + dz : az + o, "minecraft:mud_brick_stairs", fx, fz);
      c.set(ax, 1, az, "minecraft:crying_obsidian");
      c.set(ax, 2, az, "minecraft:soul_lantern");
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.set(ax + dx, 1, az + dz, "minecraft:candle", { candles: 2, lit: true });
      c.meta.altar = { x: c.wx(ax), y: c.wy(1), z: c.wz(az) };
      // arco de volta, à direita
      const zona = arcoDePortal(c, cx + 4, cz, "z", { pilar: "minecraft:stripped_mangrove_log", topo: "minecraft:mangrove_planks", brilho: "minecraft:gilded_blackstone", luz: "minecraft:soul_lantern" });
      c.portal(zona, "volta");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), volta: { x: c.wx(cx + 1) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 } };
      c.meta.chegada = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz + 2) + 0.5 };
      // bancos de tora e raposas de guarda
      for (const dz of [-3, 3]) for (const dx of [-5, 5]) if (livre(c, cx + dx, cz + dz)) escada(c, cx + dx, 0, cz + dz, "minecraft:mud_brick_stairs", dx < 0 ? 1 : -1, 0);
      raposinha(c, cx + 2, cz - 5, 0, 1);
      raposinha(c, cx - 2, cz - 5, 0, 1);
      tapete(c, cx - 1, cz, cx + 1, cz + 3, "minecraft:moss_carpet");
    },
    combate(c, s) {
      // toca de raízes: pilares de raiz, montes de terra, poças de lama
      for (let i = 0; i < 3 + Math.floor((s.w * s.h) / 70); i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (c.dwDe(gx, gz) >= 3) raiz(c, gx, gz);
      }
      for (let i = 0; i < 3; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        monte(c, gx, gz, c.hash(gx, gz, 1) < 0.5 ? TERRA : "minecraft:podzol");
      }
      for (let i = 0; i < 2; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        disco(c, gx, gz, 1.5, -1, "minecraft:mud");
      }
    },
    armadilha(c, s) {
      // emboscada: piso com placas de pressão no meio e teias nas bordas
      const { x: cx, z: cz } = centroDe(s);
      for (let dz = -3; dz <= 3; dz += 2) for (let dx = -3; dx <= 3; dx += 2) if (livre(c, cx + dx, cz + dz)) {
        c.set(cx + dx, -1, cz + dz, "minecraft:cracked_deepslate_tiles");
        c.set(cx + dx, 0, cz + dz, "minecraft:stone_pressure_plate");
      }
      for (let i = 0; i < 14; i++) {
        const [gx, gz] = sorteio(c, s, 0);
        teia(c, gx, c.tetoK(gx, gz) - 1, gz);
      }
      for (let i = 0; i < 4; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (c.dwDe(gx, gz) >= 3) raiz(c, gx, gz);
      }
    },
    elite(c, s) {
      // covil: ninho de feno, ossos, crânios e a toca escura
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 3.2, -1, FENO);
      disco(c, cx, cz, 2, 0, FENO);
      for (let i = 0; i < 10; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, c.hash(gx, gz, 2) < 0.6 ? "minecraft:bone_block" : "minecraft:skeleton_skull");
      }
      for (let i = 0; i < 4; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (c.dwDe(gx, gz) >= 3 && (Math.abs(gx - cx) > 3 || Math.abs(gz - cz) > 3)) raiz(c, gx, gz);
      }
      c.bau(cx, 1, cz, "south", "elite");
    },
    miniboss(c, s) {
      // câmara do Guardião Antigo: um grande tronco de raízes no centro, anel de musgo e a chave da toca
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, 6.5, -1, MUSGO);
      anel(c, cx, cz, 6.5, 7.5, -1, "minecraft:podzol");
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) c.fill(cx + dx, 0, cz + dz, cx + dx, c.tetoK(cx, cz) - 1, cz + dz, "minecraft:mangrove_log");
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const gx = cx + Math.round(Math.cos(a) * 3), gz = cz + Math.round(Math.sin(a) * 3);
        if (livre(c, gx, gz)) {
          c.fill(gx, 0, gz, gx, 1 + (i % 2), gz, "minecraft:mangrove_roots");
          c.set(cx + Math.round(Math.cos(a) * 2), 0, cz + Math.round(Math.sin(a) * 2), "minecraft:mangrove_roots");
        }
      }
      c.bau(cx + 5, 0, cz, "west", "chave");
      c.set(cx + 5, 1, cz, "minecraft:soul_lantern");
      for (const [dx, dz] of [[-6, -3], [-6, 3], [6, -3], [6, 3]]) raiz(c, cx + dx, cz + dz);
    },
    boss(c, s) {
      // o Ninho da Raposa Mãe
      const { x: cx, z: cz } = centroDe(s);
      const raio = Math.min(s.w, s.h) / 2;
      disco(c, cx, cz, 5.5, -1, FENO);
      disco(c, cx, cz, 3.5, 0, FENO);
      disco(c, cx, cz, 1.8, 1, FENO);
      anel(c, cx, cz, 5.5, 6.5, -1, "minecraft:podzol");
      for (let i = 0; i < 14; i++) {
        const a = (i * Math.PI * 2) / 14 + 0.2;
        const gx = cx + Math.round(Math.cos(a) * (raio - 3)), gz = cz + Math.round(Math.sin(a) * (raio - 3));
        if (i % 2 === 0) raiz(c, gx, gz);
        else monte(c, gx, gz, i % 4 === 1 ? FENO : TERRA);
      }
      for (let i = 0; i < 14; i++) {
        const [gx, gz] = sorteio(c, s, 2);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR && c.dwDe(gx, gz) >= 3) c.set(gx, 0, gz, c.hash(gx, gz, 3) < 0.7 ? "minecraft:bone_block" : "minecraft:skeleton_skull");
      }
      for (let i = 0; i < 12; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz)) c.bruto(gx, c.tetoK(gx, gz) - 1, gz, "minecraft:hanging_roots");
      }
      for (let i = 0; i < 8; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        estalactite(c, gx, gz);
      }
      // portal para o andar 2 ao fundo, de frente para o ninho
      const zona = arcoDePortal(c, cx, s.z + 3, "x", { pilar: "minecraft:stripped_mangrove_log", topo: "minecraft:mangrove_planks", brilho: "minecraft:gilded_blackstone", luz: "minecraft:soul_lantern" });
      c.portal(zona, "desce");
      c.meta.chegadas = { ...(c.meta.chegadas ?? {}), desce: { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(s.z + 7) + 0.5 } };
      c.meta.arena = { x: c.wx(cx) + 0.5, y: c.wy(0), z: c.wz(cz) + 0.5, raio: raio - 2, sala: s.id };
    },
    tesouro(c, s) {
      // esconderijo dos filhotes: brinquedos de osso e feno, geodo de ametista, baús
      const { x: cx, z: cz } = centroDe(s);
      for (let i = 0; i < 10; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, "minecraft:amethyst_cluster", { facing_direction: 1 });
      }
      monte(c, cx, cz, FENO);
      c.bau(cx - 2, 0, cz + 2, "north", "tesouro");
      c.bau(cx + 2, 0, cz + 2, "north", "tesouro");
      vela(c, cx, cz + 2, 3, "minecraft:purple_candle");
      for (let i = 0; i < 6; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, "minecraft:bone_block");
      }
    },
    secreta(c, s) {
      this.tesouro(c, s);
      const { x: cx, z: cz } = centroDe(s);
      c.bau(cx, 0, cz - 2, "south", "tesouro");
    },
    descanso(c, s) {
      // clareira da Kiza: grama, flores, fogueira e bancos. Aqui a vida volta aos poucos (regra no tempo de execução)
      const { x: cx, z: cz } = centroDe(s);
      disco(c, cx, cz, Math.min(s.w, s.h) / 2 - 1, -1, "minecraft:grass_block");
      for (let i = 0; i < 30; i++) {
        const [gx, gz] = sorteio(c, s, 1);
        if (livre(c, gx, gz) && c.bloco(gx, 0, gz) === AR) c.set(gx, 0, gz, ["minecraft:dandelion", "minecraft:poppy", "minecraft:cornflower", "minecraft:short_grass", "minecraft:azure_bluet"][Math.floor(c.rng() * 5)]);
      }
      c.set(cx, 0, cz, "minecraft:campfire");
      for (const [dx, dz, fx, fz] of [[2, 0, -1, 0], [-2, 0, 1, 0], [0, 2, 0, -1], [0, -2, 0, 1]]) escada(c, cx + dx, 0, cz + dz, "minecraft:mud_brick_stairs", fx, fz);
      raposinha(c, cx, cz - 4, 0, 1);
      c.meta.extra = { ...(c.meta.extra ?? {}), descanso: s.id };
    },
  },
};

void barril;
void coluna;
