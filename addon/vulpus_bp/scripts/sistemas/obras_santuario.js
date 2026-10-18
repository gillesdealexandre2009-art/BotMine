// @ts-check
// Santuário Kitsune do pico: praça de pedra, honden de telhado em camadas com estátua de raposa, tōrō (lanternas de pedra),
// bacia de purificação, cerejeira e torii. Os mesmos portais e lanternas se repetem ao longo da trilha. Tudo é desenhado num
// referencial local (frente = lado de onde a trilha chega) e girado para o mundo.
import { carvalho, cerejeira } from "./obras_arvores.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */

const B = Object.freeze({
  TIJOLO: "minecraft:stone_bricks",
  RACHADO: "minecraft:cracked_stone_bricks",
  MUSGOSO: "minecraft:mossy_stone_bricks",
  CINZELADO: "minecraft:chiseled_stone_bricks",
  LISA: "minecraft:smooth_stone",
  ANDESITO: "minecraft:polished_andesite",
  MURO: "minecraft:stone_brick_wall",
  LAJE: "minecraft:stone_brick_slab",
  ESCADA: "minecraft:stone_brick_stairs",
  VERMELHO: "minecraft:red_concrete",
  PRETO: "minecraft:black_concrete",
  BRANCO: "minecraft:white_concrete",
  LARANJA: "minecraft:orange_concrete",
  TABUA: "minecraft:dark_oak_planks",
  CERCA: "minecraft:dark_oak_fence",
  TELHA: "minecraft:polished_blackstone_bricks",
  TELHA_ESCADA: "minecraft:polished_blackstone_brick_stairs",
  TELHA_LAJE: "minecraft:polished_blackstone_brick_slab",
  LANTERNA: "minecraft:lantern",
  CORRENTE_ALVO: "minecraft:iron_chain",
  OURO: "minecraft:gold_block",
  AGUA: "minecraft:water",
  AR: "minecraft:air",
  GRAMA: "minecraft:grass_block",
  TERRA: "minecraft:dirt",
});

/**
 * Referencial local: lz cresce para a frente (de onde a trilha chega) e lx para a direita de quem olha de frente.
 * @param {number} cx @param {number} cz @param {number} y  nível do chão do platô
 * @param {{ dx: number, dz: number }} frente
 */
export function quadro(cx, cz, y, frente) {
  const fx = frente.dx, fz = frente.dz;
  const rx = -fz, rz = fx;
  const mx = (/** @type {number} */ lx, /** @type {number} */ lz) => cx + lx * rx + lz * fx;
  const mz = (/** @type {number} */ lx, /** @type {number} */ lz) => cz + lx * rz + lz * fz;
  /** weirdo_direction da escada que sobe no sentido local (alx, alz) @param {number} alx @param {number} alz */
  const dir = (alx, alz) => {
    const wx = alx * rx + alz * fx, wz = alx * rz + alz * fz;
    return wx > 0 ? 0 : wx < 0 ? 1 : wz > 0 ? 2 : 3;
  };
  return { cx, cz, y, mx, mz, dir };
}

/** @typedef {ReturnType<typeof quadro>} Quadro */

/** @param {Pincel} p @param {Quadro} q @param {number} lx @param {number} ly @param {number} lz @param {string} id @param {Record<string, string | number | boolean>} [est] */
function por(p, q, lx, ly, lz, id, est) {
  p.set(q.mx(lx, lz), q.y + ly, q.mz(lx, lz), id, est);
}

/** @param {Pincel} p @param {Quadro} q @param {number} lx1 @param {number} ly1 @param {number} lz1 @param {number} lx2 @param {number} ly2 @param {number} lz2 @param {string} id */
function caixa(p, q, lx1, ly1, lz1, lx2, ly2, lz2, id) {
  const xa = q.mx(lx1, lz1), xb = q.mx(lx2, lz2), za = q.mz(lx1, lz1), zb = q.mz(lx2, lz2);
  p.fill(Math.min(xa, xb), q.y + ly1, Math.min(za, zb), Math.max(xa, xb), q.y + ly2, Math.max(za, zb), id);
}

/** @param {Pincel} p @param {Quadro} q @param {number} ly @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
function anelTelhado(p, q, ly, x1, z1, x2, z2) {
  caixa(p, q, x1, ly, z1, x2, ly, z2, B.TELHA);
  for (let lx = x1 + 1; lx <= x2 - 1; lx++) {
    por(p, q, lx, ly, z1, B.TELHA_ESCADA, { weirdo_direction: q.dir(0, 1), upside_down_bit: false });
    por(p, q, lx, ly, z2, B.TELHA_ESCADA, { weirdo_direction: q.dir(0, -1), upside_down_bit: false });
  }
  for (let lz = z1 + 1; lz <= z2 - 1; lz++) {
    por(p, q, x1, ly, lz, B.TELHA_ESCADA, { weirdo_direction: q.dir(1, 0), upside_down_bit: false });
    por(p, q, x2, ly, lz, B.TELHA_ESCADA, { weirdo_direction: q.dir(-1, 0), upside_down_bit: false });
  }
  // a parte de dentro volta a ser bloco cheio
  if (x2 - x1 > 2 && z2 - z1 > 2) caixa(p, q, x1 + 1, ly, z1 + 1, x2 - 1, ly, z2 - 1, B.TELHA);
}

/** Raposa sentada de concreto, olhando para a frente. @param {Pincel} p @param {Quadro} q @param {number} lx @param {number} lz @param {number} ly */
export function raposa(p, q, lx, lz, ly) {
  // corpo
  caixa(p, q, lx - 1, ly, lz - 1, lx + 1, ly + 1, lz, B.LARANJA);
  por(p, q, lx, ly, lz, B.BRANCO);
  por(p, q, lx, ly + 1, lz, B.BRANCO);
  // cabeça
  caixa(p, q, lx - 1, ly + 2, lz - 1, lx + 1, ly + 3, lz, B.LARANJA);
  por(p, q, lx - 1, ly + 2, lz, B.BRANCO);
  por(p, q, lx + 1, ly + 2, lz, B.BRANCO);
  por(p, q, lx, ly + 2, lz + 1, B.BRANCO);
  por(p, q, lx, ly + 3, lz + 1, B.PRETO); // focinho
  por(p, q, lx - 1, ly + 3, lz, B.PRETO);
  por(p, q, lx + 1, ly + 3, lz, B.PRETO);
  // orelhas
  for (const sx of [-1, 1]) {
    por(p, q, lx + sx, ly + 4, lz - 1, B.LARANJA);
    por(p, q, lx + sx, ly + 5, lz - 1, B.PRETO);
  }
  // cauda enrolada
  por(p, q, lx, ly, lz - 2, B.LARANJA);
  por(p, q, lx, ly + 1, lz - 3, B.LARANJA);
  por(p, q, lx, ly + 2, lz - 3, B.LARANJA);
  por(p, q, lx, ly + 3, lz - 3, B.BRANCO);
}

/** Lanterna de pedra (tōrō). @param {Pincel} p @param {number} x @param {number} y @param {number} z */
export function toro(p, x, y, z) {
  p.set(x, y, z, B.TIJOLO);
  p.set(x, y + 1, z, B.MURO);
  p.set(x, y + 2, z, B.LAJE, { "minecraft:vertical_half": "bottom" });
  p.set(x, y + 3, z, B.LANTERNA);
  p.set(x, y + 4, z, B.LAJE, { "minecraft:vertical_half": "bottom" });
}

/**
 * Portal torii. eixo = direção em que as vigas correm. chaoEm devolve o nível do terreno de cada pilar (para a fundação).
 * @param {Pincel} p @param {number} x @param {number} z @param {number} y  nível da trilha no centro do portal
 * @param {"x" | "z"} eixo @param {(x: number, z: number) => number} chaoEm @param {boolean} [grande]
 */
export function torii(p, x, z, y, eixo, chaoEm, grande = false) {
  const w = grande ? 4 : 3, alto = grande ? 8 : 6;
  const lado = (/** @type {number} */ t) => (eixo === "x" ? [x + t, z] : [x, z + t]);
  for (const t of [-w, w]) {
    const [px, pz] = lado(t);
    const base = Math.min(chaoEm(px, pz), y);
    p.fill(px, base, pz, px, y, pz, B.TIJOLO);
    p.fill(px, y + 1, pz, px, y + alto - 1, pz, B.VERMELHO);
    p.set(px, y + 1, pz, B.PRETO);
  }
  for (let t = -w; t <= w; t++) {
    const [px, pz] = lado(t);
    p.set(px, y + alto - 2, pz, B.VERMELHO); // viga baixa (nuki)
  }
  for (let t = -w - 1; t <= w + 1; t++) {
    const [px, pz] = lado(t);
    p.set(px, y + alto, pz, B.PRETO); // viga alta (kasagi)
    if (Math.abs(t) >= w) p.set(px, y + alto + 1, pz, B.PRETO);
  }
  const [mx, mz] = lado(0);
  p.set(mx, y + alto - 1, mz, B.PRETO); // placa do centro
}

/**
 * Honden, praça e adornos. y = nível do chão do platô (já é bloco sólido).
 * @param {Pincel} p @param {number} cx @param {number} cz @param {number} y @param {{ dx: number, dz: number }} frente @param {() => number} rng
 */
export function santuario(p, cx, cz, y, frente, rng) {
  const q = quadro(cx, cz, y, frente);
  // ---- praça circular de raio 8
  for (let lz = -9; lz <= 9; lz++) {
    for (let lx = -9; lx <= 9; lx++) {
      const d = Math.hypot(lx, lz);
      if (d > 8.3) continue;
      /** @type {string} */
      let id = B.LISA;
      if (d >= 6.6) id = B.TIJOLO;
      else if (Math.abs(lx) <= 1 && lz >= 1) id = B.ANDESITO;
      else if ((Math.abs(lx) + Math.abs(lz)) % 5 === 0 && d > 2 && d < 6) id = B.CINZELADO;
      const r = rng();
      if (id === B.TIJOLO) id = r < 0.18 ? B.RACHADO : r < 0.34 ? B.MUSGOSO : id;
      por(p, q, lx, 0, lz, id);
      // limpa a folhagem e o que estiver em cima
      for (let k = 1; k <= 3; k++) por(p, q, lx, k, lz, B.AR);
    }
  }
  // mureta nas bordas, com o vão da entrada
  for (let lz = -10; lz <= 10; lz++) {
    for (let lx = -10; lx <= 10; lx++) {
      const d = Math.hypot(lx, lz);
      if (d < 8.3 || d > 9.3) continue;
      if (Math.abs(lx) <= 2 && lz >= 2) continue;
      por(p, q, lx, 1, lz, B.MURO);
    }
  }

  // ---- honden: pódio, piso, pilares, paredes, vigas, telhado em camadas
  caixa(p, q, -4, 1, -7, 4, 1, 0, B.TIJOLO);
  for (let lx = -2; lx <= 2; lx++) por(p, q, lx, 1, 1, B.ESCADA, { weirdo_direction: q.dir(0, -1), upside_down_bit: false });
  caixa(p, q, -3, 1, -6, 3, 1, -1, B.TABUA);
  caixa(p, q, -3, 2, -6, 3, 5, -6, B.BRANCO);
  caixa(p, q, -3, 2, -6, -3, 5, -2, B.BRANCO);
  caixa(p, q, 3, 2, -6, 3, 5, -2, B.BRANCO);
  for (const [lx, lz] of [[-3, -1], [-1, -1], [1, -1], [3, -1], [-3, -6], [3, -6], [0, -6], [-3, -3], [3, -3]]) caixa(p, q, lx, 2, lz, lx, 6, lz, B.VERMELHO);
  for (const lx of [-2, 2]) por(p, q, lx, 2, -1, B.CERCA);
  // vigas pretas em volta, no alto
  caixa(p, q, -3, 6, -6, 3, 6, -6, B.PRETO);
  caixa(p, q, -3, 6, -1, 3, 6, -1, B.PRETO);
  caixa(p, q, -3, 6, -6, -3, 6, -1, B.PRETO);
  caixa(p, q, 3, 6, -6, 3, 6, -1, B.PRETO);
  // telhado: 4 camadas que vão fechando
  anelTelhado(p, q, 7, -5, -8, 5, 1);
  anelTelhado(p, q, 8, -4, -7, 4, 0);
  anelTelhado(p, q, 9, -3, -6, 3, -1);
  anelTelhado(p, q, 10, -2, -5, 2, -2);
  caixa(p, q, -1, 11, -4, 1, 11, -3, B.TELHA_LAJE);
  por(p, q, 0, 12, -3, B.OURO);
  por(p, q, 0, 13, -3, B.LANTERNA);
  // interior: altar com a estátua e lanternas penduradas
  caixa(p, q, -1, 2, -5, 1, 2, -4, B.ANDESITO);
  raposa(p, q, 0, -4, 3);
  for (const lx of [-2, 2]) {
    por(p, q, lx, 6, -3, B.CORRENTE_ALVO);
    por(p, q, lx, 5, -3, B.LANTERNA, { hanging: true });
  }

  // ---- guardiãs da escada
  for (const lx of [-6, 6]) {
    caixa(p, q, lx - 1, 1, 1, lx + 1, 2, 3, B.TIJOLO);
    raposa(p, q, lx, 2, 3);
  }
  // ---- tōrō ao longo da entrada
  for (const [lx, lz] of [[-3, 4], [3, 4], [-3, 7], [3, 7]]) {
    const x = q.mx(lx, lz), z = q.mz(lx, lz);
    toro(p, x, y + 1, z);
  }
  // ---- bacia de purificação
  caixa(p, q, -7, 1, 4, -5, 1, 6, B.TIJOLO);
  por(p, q, -6, 1, 5, B.AGUA);
  // ---- cerejeira no canto de trás
  const tx = q.mx(6, -3), tz = q.mz(6, -3);
  p.set(tx, y, tz, B.GRAMA);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(tx + a, y, tz + b, B.GRAMA);
  cerejeira(p, tx, y, tz, rng);
  const ox = q.mx(-6, -4), oz = q.mz(-6, -4);
  p.set(ox, y, oz, B.GRAMA);
  carvalho(p, ox, y, oz, rng);
  // ---- portal grande na entrada da praça
  torii(p, q.mx(0, 9), q.mz(0, 9), y, frente.dx === 0 ? "x" : "z", () => y - 3, true);
}

/**
 * Tabuleiro de ponte (uma coluna). @param {Pincel} p @param {number} x @param {number} y @param {number} z @param {boolean} corrimao
 */
export function colunaDePonte(p, x, y, z, corrimao) {
  p.fill(x, y + 1, z, x, y + 3, z, B.AR);
  p.set(x, y, z, B.TABUA);
  if (corrimao) {
    p.set(x, y + 1, z, B.CERCA);
  }
}
