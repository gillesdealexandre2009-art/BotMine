// @ts-check
// Sala dos Portais dentro de uma caixa marcada pela staff (dois cantos): o salão se ajusta ao tamanho, com abóbada, piso de
// medalhão, canais de água, pilares, lustres e, no fundo, o Portão Kitsune: moldura de obsidiana chorona e ouro com orelhas
// de raposa no alto e nove "caudas" de lanternas penduradas. Dos dois lados do portão ficam os relicários dos andares
// (Toca, Feira, Guerra, Sonho). A entrada abre para o lado escolhido.
import { arbusto } from "./obras_arvores.js";
import { quadro, raposa, toro } from "./obras_santuario.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa */
/** @typedef {import("./obras_portal_sala.js").ResultadoSala} ResultadoSala */
/** @typedef {"N" | "S" | "L" | "O"} Lado  lado da caixa onde fica a entrada */

export const MIN_LARGURA = 15;
export const MIN_PROFUNDIDADE = 14;
export const MIN_ALTURA = 10;

const T = Object.freeze({
  TIJOLO: "minecraft:stone_bricks",
  MUSGOSO: "minecraft:mossy_stone_bricks",
  RACHADO: "minecraft:cracked_stone_bricks",
  PRETA: "minecraft:polished_blackstone",
  PRETA_TIJOLO: "minecraft:polished_blackstone_bricks",
  DOURADA: "minecraft:gilded_blackstone",
  OBS: "minecraft:crying_obsidian",
  VERMELHO: "minecraft:red_concrete",
  PRETO: "minecraft:black_concrete",
  BRANCO: "minecraft:white_concrete",
  VIGA: "minecraft:dark_oak_planks",
  AR: "minecraft:air",
  LANTERNA: "minecraft:lantern",
  ALMA: "minecraft:soul_lantern",
  CORRENTE: "minecraft:iron_chain",
  OURO: "minecraft:gold_block",
});

const LARGURA_PORTAO = 3; // meia largura do vão: 7 blocos

/**
 * Valida a caixa e diz o que está errado (ou undefined se serve).
 * @param {Caixa} c
 * @param {Lado} lado
 */
export function problemaDaCaixa(c, lado) {
  const dx = c.x2 - c.x1 + 1, dz = c.z2 - c.z1 + 1, h = c.y2 - c.y1;
  const larg = lado === "N" || lado === "S" ? dx : dz;
  const prof = lado === "N" || lado === "S" ? dz : dx;
  if (larg < MIN_LARGURA) return `largura ${larg} (mínimo ${MIN_LARGURA}) no sentido da entrada`;
  if (prof < MIN_PROFUNDIDADE + 1) return `profundidade ${prof} (mínimo ${MIN_PROFUNDIDADE + 1})`;
  if (h < MIN_ALTURA) return `altura ${h} acima do piso (mínimo ${MIN_ALTURA})`;
  if (dx * dz * (h + 1) > 120_000) return "caixa grande demais (máximo de uns 120 mil blocos)";
  return undefined;
}

/**
 * Constrói a sala na caixa. O piso fica na camada de baixo da caixa (y1) e o teto na de cima (y2).
 * @param {Pincel} p
 * @param {Caixa} c
 * @param {Lado} lado
 * @param {() => number} rng
 * @returns {Generator<any, ResultadoSala>}
 */
export function* construirSalaNaCaixa(p, c, lado, rng) {
  const y = c.y1;
  const H = c.y2 - c.y1;
  const cx = Math.floor((c.x1 + c.x2) / 2), cz = Math.floor((c.z1 + c.z2) / 2);
  const largX = c.x2 - c.x1 + 1, largZ = c.z2 - c.z1 + 1;
  /** @type {{ dx: number, dz: number }} */
  let frente;
  let px = cx, pz = cz, D, larg;
  if (lado === "N") { frente = { dx: 0, dz: -1 }; pz = c.z1; D = c.z2 - c.z1; larg = largX; }
  else if (lado === "S") { frente = { dx: 0, dz: 1 }; pz = c.z2; D = c.z2 - c.z1; larg = largX; }
  else if (lado === "L") { frente = { dx: 1, dz: 0 }; px = c.x2; D = c.x2 - c.x1; larg = largZ; }
  else { frente = { dx: -1, dz: 0 }; px = c.x1; D = c.x2 - c.x1; larg = largZ; }
  const hw = Math.floor((larg - 1) / 2);
  const q = quadro(px, pz, y, frente);
  /** @type {(lx: number, ly: number, lz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const por = (lx, ly, lz, id, est) => p.set(q.mx(lx, lz), y + ly, q.mz(lx, lz), id, est);
  const caixa = (/** @type {number} */ lx1, /** @type {number} */ ly1, /** @type {number} */ lz1, /** @type {number} */ lx2, /** @type {number} */ ly2, /** @type {number} */ lz2, /** @type {string} */ id) => {
    const xa = q.mx(lx1, lz1), xb = q.mx(lx2, lz2), za = q.mz(lx1, lz1), zb = q.mz(lx2, lz2);
    p.fill(Math.min(xa, xb), y + ly1, Math.min(za, zb), Math.max(xa, xb), y + ly2, Math.max(za, zb), id);
  };
  yield { area: { x1: c.x1 - 4, z1: c.z1 - 4, x2: c.x2 + 4, z2: c.z2 + 4 } };

  // altura do forro (abóbada): mais alto no meio do salão
  const hMin = Math.max(5, Math.floor(H * 0.5));
  const topo = (/** @type {number} */ lx) => hMin + Math.floor((H - 1 - hMin) * (1 - (Math.abs(lx) / hw) ** 2));
  const meio = -Math.floor(D / 2);
  const fundo = -(D - 2); // fileira do portal, a um bloco da parede do fundo (a parede de fora fica limpa)

  // 1) limpa a caixa inteira e levanta a casca: piso, paredes e teto de tijolo; o forro acompanha a abóbada
  caixa(-hw, 0, -D, hw, H, 0, T.AR);
  yield;
  caixa(-hw, 0, -D, hw, 0, 0, T.TIJOLO);
  caixa(-hw, 0, -D, -hw, H, 0, T.TIJOLO);
  caixa(hw, 0, -D, hw, H, 0, T.TIJOLO);
  caixa(-hw, 0, -D, hw, H, -D, T.TIJOLO);
  caixa(-hw, 0, 0, hw, H, 0, T.TIJOLO);
  for (let lx = -hw; lx <= hw; lx++) caixa(lx, topo(lx) + 1, -D, lx, H, 0, T.TIJOLO);
  yield;
  // envelhece: musgo e rachaduras nas paredes
  for (let i = 0; i < 40 + hw * D; i++) {
    const ly = 1 + Math.floor(rng() * Math.max(1, hMin - 1));
    const m = rng() < 0.6 ? T.MUSGOSO : T.RACHADO;
    const r = rng();
    if (r < 0.34) por(-hw + Math.floor(rng() * (2 * hw + 1)), ly, -D, m);
    else if (r < 0.5) por(-hw + Math.floor(rng() * (2 * hw + 1)), ly, 0, m);
    else por(rng() < 0.5 ? -hw : hw, ly, -Math.floor(rng() * (D + 1)), m);
  }
  yield;

  // 2) piso: xadrez de pedra negra com moldura dourada; tapete vermelho com bordas amarelas; medalhão no centro; canais
  for (let lz = -D + 1; lz <= -1; lz++) {
    for (let lx = -hw + 1; lx <= hw - 1; lx++) {
      const borda = Math.abs(lx) === hw - 1 || lz === -D + 1 || lz === -1;
      por(lx, 0, lz, borda ? T.DOURADA : (lx + lz) % 2 === 0 ? T.PRETA_TIJOLO : T.PRETA);
    }
  }
  for (let lz = -D + 4; lz <= -2; lz++) {
    for (const lx of [-1, 0, 1]) por(lx, 1, lz, "minecraft:red_carpet");
    for (const lx of [-2, 2]) por(lx, 1, lz, "minecraft:yellow_carpet");
  }
  const raioMed = Math.min(4.6, hw - 3.2, D / 2 - 2);
  if (raioMed >= 3) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > raioMed) continue;
        por(dx, 1, meio + dz, T.AR);
        if (d <= 1.5) por(dx, 0, meio + dz, T.VERMELHO);
        else if (d <= 2.6) por(dx, 0, meio + dz, T.DOURADA);
        else if (d <= 3.4) por(dx, 0, meio + dz, T.PRETA_TIJOLO);
        else por(dx, 0, meio + dz, T.OURO);
      }
    }
  }
  if (hw >= 9) {
    // canais com vitórias-régias dos dois lados do tapete, de fora do medalhão ao portão, com borda de tijolo
    /** @type {[number, number][]} */
    const trechos = raioMed >= 3 ? [[-D + 6, Math.ceil(meio - raioMed) - 2], [Math.floor(meio + raioMed) + 2, -3]] : [[-D + 6, -3]];
    for (const [za, zb] of trechos) {
      if (zb - za < 2) continue;
      for (const s of [-1, 1]) {
        caixa(s * 3, 1, za - 1, s * 6, 1, zb + 1, T.PRETA_TIJOLO);
        for (let lz = za; lz <= zb; lz++) {
          for (const lx of [4, 5]) {
            por(s * lx, 1, lz, "minecraft:water");
            if (((lx + lz) % 3 + 3) % 3 === 0) por(s * lx, 2, lz, "minecraft:waterlily");
          }
          por(s * 3, 1, lz, T.PRETA_TIJOLO);
          por(s * 6, 1, lz, T.PRETA_TIJOLO);
        }
      }
    }
  }
  yield;

  // 3) entrada: vão de 5 de largura com batentes vermelhos e verga preta; patamar de pedra e lanternas do lado de fora
  caixa(-2, 1, 0, 2, 5, 0, T.AR);
  for (const lx of [-3, 3]) caixa(lx, 1, 0, lx, 6, 0, T.VERMELHO);
  caixa(-4, 6, 0, 4, 6, 0, T.PRETO);
  caixa(-3, 7, 0, 3, 7, 0, T.PRETO);
  por(0, 6, 0, T.DOURADA);
  caixa(-3, 0, 1, 3, 0, 3, T.PRETA_TIJOLO);
  for (const lx of [-4, 4]) toro(p, q.mx(lx, 2), y + 1, q.mz(lx, 2));
  for (const lx of [-2, 2]) por(lx, 5, 1, T.LANTERNA, { hanging: true });

  // 4) pilares vermelhos, nervuras de madeira na abóbada, lustres e lanternas
  const passos = [];
  for (let lz = -4; lz >= -D + 4; lz -= 4) passos.push(lz);
  for (const lz of passos) {
    for (const s of [-1, 1]) {
      const lx = s * (hw - 1);
      caixa(lx, 1, lz, lx, topo(lx) - 1, lz, T.VERMELHO);
      por(lx, topo(lx), lz, T.PRETO);
    }
    for (let lx = -hw + 1; lx <= hw - 1; lx++) por(lx, topo(lx), lz, lx % 5 === 0 ? T.VERMELHO : T.VIGA);
    for (const s of [-1, 1]) {
      const lx = s * Math.max(3, Math.floor(hw / 2));
      por(lx, topo(lx) - 1, lz, T.CORRENTE);
      por(lx, topo(lx) - 2, lz, T.LANTERNA, { hanging: true });
    }
  }
  for (const lz of passos.map((v) => v - 2)) {
    if (lz < -D + 2) continue;
    const t = topo(0);
    for (let k = 1; k <= 2; k++) por(0, t - k + 1, lz, T.CORRENTE);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) por(dx, t - 2, lz + dz, dx === 0 && dz === 0 ? T.ALMA : T.LANTERNA, { hanging: true });
  }
  for (const [lx, lz] of [[-(hw - 3), -3], [hw - 3, -3], [-(hw - 3), fundo + 3], [hw - 3, fundo + 3]]) por(lx, 1, lz, "minecraft:soul_campfire");
  yield;

  // 5) o Portão Kitsune, encostado na parede do fundo: moldura de obsidiana chorona e ouro, orelhas de raposa no alto
  const W = LARGURA_PORTAO;
  const altoVao = Math.min(6, topo(0) - 4);
  caixa(-W, 1, fundo, W, altoVao, fundo, T.AR);
  caixa(-W, 1, fundo - 0, W, altoVao, -(D - 1), T.AR);
  caixa(-W, 1, -(D - 1), W, altoVao, -(D - 1), T.OBS); // fundo do vão: parede de obsidiana chorona
  caixa(-W, 0, fundo, W, 0, fundo, T.DOURADA);
  for (const lx of [-W - 1, W + 1]) {
    caixa(lx, 1, fundo - 1, lx, altoVao + 2, fundo, T.OBS);
    por(lx, altoVao + 3, fundo, T.DOURADA);
  }
  caixa(-W - 1, altoVao + 1, fundo - 1, W + 1, altoVao + 2, fundo, T.DOURADA);
  caixa(-W, altoVao + 1, fundo, W, altoVao + 1, fundo, T.PRETA_TIJOLO);
  // orelhas de raposa em degraus, vermelhas por fora e pretas por dentro
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const ly = altoVao + 3 + k;
      for (let lx = 3 - 0; lx <= 5 - k; lx++) {
        const ax = s * lx;
        if (Math.abs(ax) >= hw || ly >= topo(ax)) continue;
        por(ax, ly, fundo, lx === 3 ? T.PRETO : T.VERMELHO);
        por(ax, ly, fundo - 1, T.VERMELHO);
      }
    }
  }
  if (altoVao + 3 < topo(0)) {
    por(0, altoVao + 3, fundo, T.OURO);
    por(0, altoVao + 4 < topo(0) ? altoVao + 4 : altoVao + 3, fundo, T.DOURADA);
  }
  for (const lx of [-W, 0, W]) por(lx, altoVao, fundo + 1, T.ALMA, { hanging: true });
  // nove caudas: correntes com lanternas em leque sobre o portão
  for (let i = 0; i < 9; i++) {
    const lx = -8 + 2 * i;
    if (Math.abs(lx) >= hw - 1) continue;
    const t = topo(lx);
    const comp = 2 + (i % 3);
    for (let k = 1; k <= comp; k++) por(lx, t - k, fundo + 2, T.CORRENTE);
    por(lx, t - comp - 1, fundo + 2, i % 2 === 0 ? T.ALMA : T.LANTERNA, { hanging: true });
  }
  yield;

  // 6) relicários dos andares dos dois lados do portão (os que couberem)
  const posicoes = [7, 9].filter((v) => v <= hw - 1);
  /** @type {((lx: number) => void)[]} */
  const reliquias = [
    (lx) => { // A Toca
      caixa(lx - 1, 0, fundo - 0, lx + 1, 0, fundo, "minecraft:moss_block");
      por(lx, 1, fundo, "minecraft:flowering_azalea");
      por(lx - 1, 1, fundo, "minecraft:brown_candle", { candles: 3, lit: true });
      por(lx + 1, 1, fundo, "minecraft:mossy_cobblestone");
    },
    (lx) => { // A Feira
      for (let k = 1; k <= 4; k++) por(lx, k, fundo, k % 2 ? T.VERMELHO : T.BRANCO);
      por(lx, 5, fundo, T.OURO);
      por(lx - 1, 1, fundo, "minecraft:yellow_candle", { candles: 2, lit: true });
      por(lx + 1, 1, fundo, "minecraft:red_candle", { candles: 2, lit: true });
    },
    (lx) => { // O Campo de Guerra
      por(lx, 1, fundo, "minecraft:iron_block");
      por(lx, 2, fundo, "minecraft:anvil");
      por(lx - 1, 1, fundo, "minecraft:red_nether_brick");
      por(lx + 1, 1, fundo, "minecraft:red_nether_brick");
      por(lx - 1, 2, fundo, "minecraft:iron_bars");
      por(lx + 1, 2, fundo, "minecraft:iron_bars");
    },
    (lx) => { // O Sonho
      for (let k = 1; k <= 3; k++) por(lx, k, fundo, T.BRANCO);
      por(lx, 4, fundo, "minecraft:amethyst_cluster");
      por(lx - 1, 1, fundo, "minecraft:end_rod");
      por(lx + 1, 1, fundo, "minecraft:end_rod");
    },
  ];
  /** @type {number[]} */
  const ordem = [];
  for (const v of posicoes) ordem.push(-v, v);
  ordem.forEach((lx, i) => {
    caixa(lx - 1, 0, fundo, lx + 1, 0, fundo, T.PRETA_TIJOLO);
    caixa(lx - 2, 0, fundo - 0, lx - 2, 2, fundo, T.PRETA_TIJOLO);
    caixa(lx + 2, 0, fundo, lx + 2, 2, fundo, T.PRETA_TIJOLO);
    reliquias[i % reliquias.length](lx);
    por(lx, topo(lx) - 1, fundo + 1, T.ALMA, { hanging: true });
  });

  // 7) guardiãs de raposa, canteiros de musgo com arbustos e lanternas de alma ao longo das paredes
  for (const s of [-1, 1]) {
    const lx = s * Math.max(4, hw - 3);
    caixa(lx - 1, 0, -D + 2, lx + 1, 0, -D + 4, "minecraft:moss_block");
    if (ordem.length === 0) arbusto(p, q.mx(lx, -D + 3), y, q.mz(lx, -D + 3), rng);
    if (hw >= 8) raposa(p, q, s * (hw - 3), -4, 1);
    for (let lz = -3; lz >= -D + 3; lz -= 4) {
      por(s * (hw - 2), 1, lz, "minecraft:soul_lantern");
      por(s * (hw - 1), 4, lz - 2, T.LANTERNA);
    }
  }
  for (const s of [-1, 1]) {
    const lx = s * (hw - 3);
    arbusto(p, q.mx(lx, meio), y, q.mz(lx, meio), rng);
    caixa(lx - 1, 0, meio - 1, lx + 1, 0, meio + 1, "minecraft:moss_block");
  }
  yield;

  // resultado: zona de teleporte (o vão do portão, duas fileiras de fundo), chegada na frente e pontos de visita
  const xa = q.mx(-W, fundo), xb = q.mx(W, fundo - 0), za = q.mz(-W, fundo), zb = q.mz(W, fundo);
  const xc = q.mx(-W, fundo + 1), zc = q.mz(W, fundo + 1);
  const chegada = (() => { const lzC = Math.min(-2, fundo + 6); return { x: q.mx(0, lzC) + 0.5, y: y + 1, z: q.mz(0, lzC) + 0.5 }; })();
  const ent = q.mx(0, -2), entz = q.mz(0, -2);
  const fa = q.mx(0, 4), faz = q.mz(0, 4);
  return {
    portais: [
      {
        lado: "A Toca",
        zona: { x1: Math.min(xa, xb, xc), y1: y + 1, z1: Math.min(za, zb, zc), x2: Math.max(xa, xb, xc), y2: y + 4, z2: Math.max(za, zb, zc) },
        chegada,
      },
    ],
    entrada: { x: ent + 0.5, y: y + 1, z: entz + 0.5 },
    fachada: { x: fa + 0.5, y: y + 1, z: faz + 0.5 },
  };
}
