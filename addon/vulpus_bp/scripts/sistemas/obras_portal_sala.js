// @ts-check
// Sala dos Portais: um salão escavado na encosta da montanha, de frente para a trilha. No fundo fica o grande portal da masmorra
// (leva ao andar 1, A Toca, lá embaixo, por teleporte). Quem sai da masmorra volta
// por aqui. Não há escada: a masmorra é um lugar separado, fundo, e não se entra e sai com facilidade.
import { quadro, raposa, toro, torii } from "./obras_santuario.js";
import { arbusto } from "./obras_arvores.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa */

/**
 * @typedef {object} ResultadoSala
 * @property {{ lado: string, zona: Caixa, chegada: { x: number, y: number, z: number } }[]} portais
 * @property {{ x: number, y: number, z: number }} entrada  onde se chega à sala (junto à porta)
 * @property {{ x: number, y: number, z: number }} fachada  na frente da porta, do lado de fora
 */


const T = Object.freeze({
  TIJOLO: "minecraft:stone_bricks",
  MUSGOSO: "minecraft:mossy_stone_bricks",
  RACHADO: "minecraft:cracked_stone_bricks",
  CINZELADO: "minecraft:chiseled_stone_bricks",
  PRETA: "minecraft:polished_blackstone",
  PRETA_TIJOLO: "minecraft:polished_blackstone_bricks",
  DOURADA: "minecraft:gilded_blackstone",
  OBS: "minecraft:crying_obsidian",
  VERMELHO: "minecraft:red_concrete",
  PRETO: "minecraft:black_concrete",
  VIGA: "minecraft:dark_oak_planks",
  AR: "minecraft:air",
  LANTERNA: "minecraft:lantern",
  ALMA: "minecraft:soul_lantern",
});

/**
 * Constrói a sala dos portais.
 * @param {Pincel} p
 * @param {{ x: number, z: number, y: number, dx: number, dz: number }} portal  ponto da trilha na porta e sentido para dentro
 * @param {number} y  nível (bloco do piso) da porta
 * @param {(x: number, z: number) => number} chaoEm  altura do terreno de uma coluna (para as fundações da fachada)
 * @param {() => number} rng
 * @returns {Generator<any, ResultadoSala>}
 */
export function* construirSalaDosPortais(p, portal, y, chaoEm, rng) {
  const frente = { dx: -portal.dx, dz: -portal.dz };
  const q = quadro(portal.x, portal.z, y, frente);
  const ponto = (/** @type {number} */ lx, /** @type {number} */ lz) => ({ x: q.mx(lx, lz), z: q.mz(lx, lz) });
  /** @type {(lx: number, ly: number, lz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const por = (lx, ly, lz, id, est) => p.set(q.mx(lx, lz), y + ly, q.mz(lx, lz), id, est);
  const caixa = (/** @type {number} */ lx1, /** @type {number} */ ly1, /** @type {number} */ lz1, /** @type {number} */ lx2, /** @type {number} */ ly2, /** @type {number} */ lz2, /** @type {string} */ id) => {
    const xa = q.mx(lx1, lz1), xb = q.mx(lx2, lz2), za = q.mz(lx1, lz1), zb = q.mz(lx2, lz2);
    p.fill(Math.min(xa, xb), y + ly1, Math.min(za, zb), Math.max(xa, xb), y + ly2, Math.max(za, zb), id);
  };

  const c0 = ponto(0, -9);
  yield { area: { x1: c0.x - 22, z1: c0.z - 22, x2: c0.x + 22, z2: c0.z + 22 } };

  // 1) casca de tijolo e interior escavado (parede do fundo com 2 de espessura para os nichos dos portais)
  caixa(-11, 0, -18, 11, 15, 0, T.TIJOLO);
  // teto em abóbada: o centro sobe até 13 de altura, em degraus suaves, e a casca de tijolo acompanha por cima
  for (let lx = -10; lx <= 10; lx++) caixa(lx, 1, -16, lx, 9 + Math.floor((10 - Math.abs(lx)) / 2.5), -1, T.AR);
  yield;
  // envelhece a casca: tijolos com musgo e rachados em alguns pontos das paredes
  for (let i = 0; i < 260; i++) {
    const lx = -10 + Math.floor(rng() * 21), ly = 1 + Math.floor(rng() * 8);
    const lado = rng() < 0.5;
    const lz = lado ? -16 : -1;
    // fundo e frente
    if (rng() < 0.5) por(lx, ly, lz === -1 ? 0 : -17, rng() < 0.6 ? T.MUSGOSO : T.RACHADO);
    // paredes laterais
    por(rng() < 0.5 ? -11 : 11, ly, -1 - Math.floor(rng() * 16), rng() < 0.6 ? T.MUSGOSO : T.RACHADO);
  }

  // 2) piso: pedra negra com moldura dourada, tapete vermelho com bordas amarelas da porta até os portais
  for (let lz = -16; lz <= -1; lz++) {
    for (let lx = -10; lx <= 10; lx++) {
      const borda = Math.abs(lx) === 10 || lz === -16 || lz === -1;
      por(lx, 0, lz, borda ? T.DOURADA : (lx + lz) % 2 === 0 ? T.PRETA_TIJOLO : T.PRETA);
    }
  }
  for (let lz = -15; lz <= -2; lz++) {
    for (const lx of [-1, 0, 1]) por(lx, 1, lz, "minecraft:red_carpet");
    for (const lx of [-2, 2]) por(lx, 1, lz, "minecraft:yellow_carpet");
  }

  // 3) varanda: um corredor de 5 blocos que liga a trilha à porta do salão, e a porta com batentes vermelhos e verga preta
  caixa(-4, 0, 1, 4, 8, 5, T.TIJOLO);
  caixa(-3, 1, 1, 3, 7, 5, T.AR);
  for (let lz = 1; lz <= 5; lz++) {
    for (let lx = -3; lx <= 3; lx++) por(lx, 0, lz, lz % 2 === 0 ? T.PRETA_TIJOLO : T.PRETA);
    if (lz % 2 === 1) {
      por(-3, 6, lz, T.LANTERNA, { hanging: true });
      por(3, 6, lz, T.LANTERNA, { hanging: true });
    }
  }
  caixa(-3, 1, 0, 3, 6, 0, T.AR);
  for (const lx of [-4, 4]) caixa(lx, 1, 0, lx, 7, 0, T.VERMELHO);
  caixa(-5, 7, 0, 5, 7, 0, T.PRETO);
  caixa(-6, 8, 0, 6, 8, 0, T.PRETO);
  por(0, 7, 0, T.DOURADA);
  yield;

  // 4) pilares laterais, vigas de teto e lanternas penduradas
  for (const lz of [-4, -8, -12]) {
    for (const lx of [-10, 10]) {
      caixa(lx, 1, lz, lx, 8, lz, T.VERMELHO);
      por(lx, 9, lz, T.PRETO);
    }
    caixa(-10, 9, lz, 10, 9, lz, T.VIGA);
    for (const lx of [-5, 5]) {
      por(lx, 8, lz, "minecraft:iron_chain");
      por(lx, 7, lz, T.LANTERNA, { hanging: true });
    }
  }
  for (const lz of [-6, -10, -14]) for (const lx of [-8, 0, 8]) por(lx, 9, lz, T.ALMA, { hanging: true });
  for (const [lx, lz] of [[-8, -8], [8, -8], [-8, -3], [8, -3]]) por(lx, 1, lz, "minecraft:soul_campfire");

  // 4b) abóbada: nervuras de madeira, vitrais de luz, lanternas grandes e o desenho do piso
  for (const lz of [-3, -7, -11, -15]) {
    for (let lx = -10; lx <= 10; lx++) {
      const topo = 9 + Math.floor((10 - Math.abs(lx)) / 2.5);
      por(lx, topo, lz, lx % 5 === 0 ? T.VERMELHO : T.VIGA);
    }
    por(0, 12, lz, T.LANTERNA, { hanging: true });
    por(0, 11, lz, "minecraft:iron_chain");
  }
  // lustres de ferro e lanternas de alma sobre o corredor central
  for (const lz of [-5, -9, -13]) {
    por(0, 13, lz, "minecraft:iron_chain");
    por(0, 12, lz, "minecraft:iron_chain");
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) por(dx, 11, lz + dz, dx === 0 && dz === 0 ? T.ALMA : T.LANTERNA, { hanging: true });
  }
  // medalhão no piso: anel dourado com o miolo vermelho (a Kiza guarda o centro)
  for (let dz = -5; dz <= 5; dz++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 4.6) continue;
      const lz = -9 + dz;
      por(dx, 1, lz, "minecraft:air"); // o tapete abre espaço para o medalhão
      if (d <= 1.5) por(dx, 0, lz, "minecraft:red_concrete");
      else if (d <= 2.6) por(dx, 0, lz, "minecraft:gilded_blackstone");
      else if (d <= 3.4) por(dx, 0, lz, "minecraft:polished_blackstone_bricks");
      else if (d <= 4.6) por(dx, 0, lz, "minecraft:gold_block");
    }
  }
  // canais de água com vitórias-régias dos dois lados do tapete
  for (let lz = -15; lz <= -3; lz++) {
    if (Math.abs(lz + 9) <= 5) continue;
    for (const lx of [-5, -4, 4, 5]) {
      por(lx, -1, lz, "minecraft:stone_bricks");
      por(lx, 0, lz, "minecraft:water");
      if (((lx + lz) % 3 + 3) % 3 === 0) por(lx, 1, lz, "minecraft:waterlily");
    }
    for (const lx of [-6, 6]) por(lx, 0, lz, "minecraft:polished_blackstone_brick_slab", { "minecraft:vertical_half": "top" });
  }
  // guardiãs de raposa nos nichos laterais, cerejeiras em canteiros e braseiros
  for (const lx of [-8, 8]) {
    caixa(lx - 1, 0, -15, lx + 1, 0, -13, "minecraft:moss_block");
    arbusto(p, q.mx(lx, -14), y, q.mz(lx, -14), rng);
    arbusto(p, q.mx(lx + 1, -13), y, q.mz(lx + 1, -13), rng);
    raposa(p, q, lx, -5, 1);
  }
  for (const lz of [-3, -7, -11]) for (const lx of [-9, 9]) {
    por(lx, 1, lz, "minecraft:soul_lantern");
    por(lx, 5, lz, T.LANTERNA);
  }

  // 5) o grande portal, no meio da parede do fundo (5 de largura, moldura de obsidiana chorona e ouro); nos dois lados, nichos
  //    de lembrança com velas, sem placas: a sala se explica sozinha (o título aparece ao chegar à masmorra)
  /** @type {ResultadoSala["portais"]} */
  const portais = [];
  const W = 2;
  caixa(-W, 1, -17, W, 5, -17, T.AR);
  caixa(-W, 1, -18, W, 5, -18, T.OBS);
  caixa(-W, 0, -17, W, 0, -17, T.DOURADA);
  for (const lx of [-W - 1, W + 1]) caixa(lx, 1, -17, lx, 7, -16, T.OBS);
  caixa(-W - 1, 7, -17, W + 1, 7, -16, T.DOURADA);
  caixa(-W, 6, -17, W, 6, -17, T.PRETA_TIJOLO);
  for (const lx of [-W, 0, W]) por(lx, 5, -16, T.ALMA, { hanging: true });
  for (const lx of [-W - 1, W + 1]) por(lx, 8, -16, T.LANTERNA);
  // nichos de lembrança
  for (const cx of [-8, 8]) {
    const grande = true;
    caixa(cx - 1, 1, -17, cx + 1, 4, -17, T.AR);
    caixa(cx - 1, 1, -18, cx + 1, 4, -18, T.PRETA_TIJOLO);
    caixa(cx - 1, 0, -17, cx + 1, 0, -17, T.PRETA);
    for (const lx of [cx - 2, cx + 2]) caixa(lx, 1, -17, lx, 5, -16, T.PRETA_TIJOLO);
    caixa(cx - 2, 5, -17, cx + 2, 5, -16, T.DOURADA);
    if (grande) {
      por(cx, 1, -17, "minecraft:candle", { candles: 3, lit: true });
      por(cx - 1, 1, -17, "minecraft:candle", { candles: 2, lit: true });
      por(cx + 1, 1, -17, "minecraft:candle", { candles: 2, lit: true });
      por(cx, 4, -17, T.ALMA, { hanging: true });
    } else {
      por(cx, 1, -17, "minecraft:soul_campfire");
      por(cx, 4, -17, T.LANTERNA, { hanging: true });
    }
  }
  // zona de teleporte: os 5 blocos do portal, do chão até a altura da cabeça
  const xa = q.mx(-W, -17), xb = q.mx(W, -17), za = q.mz(-W, -17), zb = q.mz(W, -17);
  const chegada = ponto(0, -13);
  portais.push({
    lado: "A Toca",
    zona: { x1: Math.min(xa, xb), y1: y + 1, z1: Math.min(za, zb), x2: Math.max(xa, xb), y2: y + 4, z2: Math.max(za, zb) },
    chegada: { x: chegada.x + 0.5, y: y + 1, z: chegada.z + 0.5 },
  });
  // tapete cerimonial até o portal e fogueiras de alma ladeando
  for (let lz = -16; lz <= -4; lz++) for (const lx of [-W, 0, W]) if (lx === 0 || Math.abs(lz) % 2 === 0) por(lx, 0, lz, lx === 0 ? T.VERMELHO : T.DOURADA);
  yield;

  // 6) guardiãs de raposa na entrada, torii e lanternas de pedra do lado de fora
  for (const lx of [-6, 6]) {
    caixa(lx - 1, 1, -4, lx + 1, 2, -2, T.TIJOLO);
    raposa(p, q, lx, -3, 3);
  }
  const eixo = frente.dx === 0 ? "x" : "z";
  const f2 = ponto(0, 6);
  torii(p, f2.x, f2.z, y, eixo, chaoEm, true);
  for (const lx of [-6, 6]) {
    const t = ponto(lx, 6);
    toro(p, t.x, y + 1, t.z);
  }
  const ent = ponto(0, -3);
  const fach = ponto(0, 8);
  return {
    portais,
    entrada: { x: ent.x + 0.5, y: y + 1, z: ent.z + 0.5 },
    fachada: { x: fach.x + 0.5, y: y + 1, z: fach.z + 0.5 },
  };
}
