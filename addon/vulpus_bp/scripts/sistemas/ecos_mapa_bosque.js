// @ts-check
// A floresta sem fim em volta do mapa dos Ecos: um anel de ~50 blocos de chão orgânico e árvores que CRESCEM com a distância
// ao mapa jogável (6-10 perto, 12-20 no meio, 28-36 junto à parede do céu), para parecer uma floresta infinita.
// Tudo é função determinística de (x,z): nada de Math.random, retomável por fase, e as árvores vêm de estampas reaproveitadas
// (lista de fills por tipo/tamanho), com copas de oito lados feitas de 3 fills cada.
import { fbm, hash2 } from "./ecos_mapa_base.js";

/** o anel de floresta (chão e árvores), relativo à origem */
export const BOSQUE = Object.freeze({ x1: -53, z1: -53, x2: 356, z2: 128 });
/** a caixa de ar jogável de dentro das paredes: a barreira começa logo depois */
export const LIMITE_BOSQUE = Object.freeze({ x1: -55, z1: -55, x2: 358, z2: 130 });

/** Onde há construção (retângulos) e a arena (círculo). Fora disto, é chão do bosque. */
const RETS = [[0, 0, 240, 65], [70, 66, 166, 75], [241, 26, 250, 40]];
const ARENA = { cx: 272, cz: 33, r: 29 };

/** distância (blocos) de (x,z) à construção mais próxima; 0 = dentro de uma área construída */
export function distPegada(x, z) {
  let d = Infinity;
  for (const [a, b, c, e] of RETS) {
    const dx = Math.max(a - x, 0, x - c), dz = Math.max(b - z, 0, z - e);
    d = Math.min(d, Math.hypot(dx, dz));
  }
  return Math.min(d, Math.max(0, Math.hypot(x - ARENA.cx, z - ARENA.cz) - ARENA.r));
}

/** Altura do chão do bosque: plano junto às áreas, colinas suaves que sobem aos poucos até a parede. */
export function alturaChao(x, z) {
  const d = distPegada(x, z);
  if (d <= 0) return 0;
  const amp = Math.min(1, d / 14) * 2.6;
  const n = fbm(x, z, 901, 26, 3);
  return Math.round(amp * (2 * n - 1)) + Math.floor(d / 30);
}

/** Bloco de cima do chão: musgo-pálido dominante, podzol em manchas, grama e terra grossa em pontos. */
function topoChao(M, x, z) {
  const n = fbm(x, z, 333, 18, 2), m = fbm(x, z, 444, 8, 2);
  if (n < 0.28) return M.podzol;
  if (n < 0.6) return m > 0.72 ? M.terraGrossa : M.musgo;
  if (n < 0.8) return M.grama;
  return M.musgo;
}

/**
 * Chão do bosque, por linhas: colunas vizinhas iguais viram um fill só (terra até h-1, bloco de cima em h).
 * Só preenche o que está vazio (as áreas já construídas ficam como estão).
 */
export function* chaoBosque(H) {
  const { M, S, p, pausa } = H;
  const { x1, z1, x2, z2 } = LIMITE_BOSQUE; // o chão vai até a parede: não sobra vala entre a floresta e a barreira
  for (let z = z1; z <= z2; z++) {
    let ini = x1, hAt = -99, tAt = "";
    const fecha = (xf) => {
      if (hAt === -99) return;
      p.fill(ini, -8, z, xf, hAt - 1, z, M.terra, true);
      p.fill(ini, hAt, z, xf, hAt, z, tAt, true);
    };
    for (let x = x1; x <= x2 + 1; x++) {
      let h = -99, t = "";
      if (x <= x2 && distPegada(x, z) > 0) {
        h = alturaChao(x, z);
        t = topoChao(M, x, z);
      }
      if (h !== hAt || t !== tAt) {
        fecha(x - 1);
        ini = x; hAt = h; tAt = t;
      }
    }
    yield* pausa(500);
  }
  // capim em manchas e flores raras perto das áreas (poucos adereços: o bosque é mais forma que detalhe)
  for (let z = z1; z <= z2; z++) {
    for (let x = x1; x <= x2; x++) {
      const d = distPegada(x, z);
      if (d <= 0) continue;
      const r = hash2(x, z, 77);
      if (r > 0.09) continue;
      const y = alturaChao(x, z) + 1;
      if (d < 22 && r < 0.012) H.flor(x, y, z, [M.bluet, M.lirio, M.margarida][Math.floor(hash2(x, z, 78) * 3)]);
      else if (fbm(x, z, 555, 10, 2) > 0.5) {
        const sup = topoChao(M, x, z);
        if (sup === M.musgo || sup === M.grama || sup === M.podzol) S(x, y, z, M.capim);
      }
    }
    if (z % 2 === 0) yield* pausa(500);
  }
}

// ------------------------------------------------------------------------------------ árvores
const TAMANHOS = [6, 8, 10, 12, 15, 18, 22, 26, 30, 34, 36];
const quantiza = (h) => TAMANHOS.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a));
/** altura-alvo por distância à construção: [d, H] (interpolado) */
const CURVA = [[3, 6], [12, 10], [14, 12], [28, 20], [38, 30], [46, 36]];
function alvoAltura(d) {
  if (d <= CURVA[0][0]) return CURVA[0][1];
  for (let i = 1; i < CURVA.length; i++) {
    if (d <= CURVA[i][0]) {
      const [d0, h0] = CURVA[i - 1], [d1, h1] = CURVA[i];
      return h0 + ((h1 - h0) * (d - d0)) / (d1 - d0);
    }
  }
  return CURVA[CURVA.length - 1][1];
}

/** @typedef {[number, number, number, number, number, number, number]} Op  caixa relativa ao pé do tronco + 0 tronco / 1 folha */
/** @type {Map<string, { ops: Op[], raio: number }>} */
const estampas = new Map();

/** copa de oito lados (3 fills): disco de raio R com os cantos cortados */
function octogono(o, cx, cz, y1, y2, R) {
  if (R <= 1) { o.push([cx - R, y1, cz - R, cx + R, y2, cz + R, 1]); return; }
  o.push([cx - R, y1, cz - R + 2, cx + R, y2, cz + R - 2, 1]);
  o.push([cx - R + 2, y1, cz - R, cx + R - 2, y2, cz + R, 1]);
  o.push([cx - R + 1, y1, cz - R + 1, cx + R - 1, y2, cz + R - 1, 1]);
}

/** @param {number} tipo 0 carvalho escuro, 1 pálida (tronco curvo), 2 abeto, 3 morta @param {number} h */
function criaEstampa(tipo, h) {
  /** @type {Op[]} */
  const o = [];
  const tr = (x1, y1, z1, x2, y2, z2) => o.push([x1, y1, z1, x2, y2, z2, 0]);
  const R = Math.round(3 + h / 6);
  let raio = R;
  if (tipo === 0) {
    const grosso = h >= 18;
    tr(0, 0, 0, grosso ? 1 : 0, h, grosso ? 1 : 0);
    if (grosso) tr(-1, 0, 0, -1, 1, 0), tr(2, 0, 1, 2, 1, 1), tr(0, 0, -1, 0, 1, -1);
    const c = 0, t = h;
    if (h >= 12) octogono(o, c, c, t - 7, t - 6, Math.round(R * 0.55));
    octogono(o, c, c, Math.max(2, t - 4), t - 3, R);
    octogono(o, c, c, t - 2, t - 1, Math.round(R * 0.8));
    octogono(o, c, c, t, t + 1, Math.round(R * 0.5));
  } else if (tipo === 1) {
    const a = Math.floor(h * 0.35), b = Math.floor(h * 0.7);
    tr(0, 0, 0, 0, a, 0);
    tr(0, a, 0, 1, a, 0);
    tr(1, a, 0, 1, b, 0);
    tr(1, b, 0, 1, b, 1);
    tr(1, b, 1, 1, h, 1);
    const t = h;
    octogono(o, 1, 1, Math.max(2, t - 3), t - 2, R);
    octogono(o, 1, 1, t - 1, t, Math.round(R * 0.65));
    const dx = Math.round(R * 0.7);
    octogono(o, 1 + dx, 1, Math.max(3, t - 7), t - 5, Math.max(2, Math.round(R * 0.6)));
    tr(1, b, 1, 1 + dx - 1, b, 1); // galho até o lóbulo lateral
    raio = R + dx;
  } else if (tipo === 2) {
    tr(0, 0, 0, 0, h, 0);
    const y0 = Math.max(2, Math.floor(h * 0.22)), Rm = 2 + h / 6;
    for (let y = y0; y <= h - 1; y += 3) {
      const r = Math.max(1, Math.round(Rm * (1 - (y - y0) / (h - y0 + 2))) + 1);
      octogono(o, 0, 0, y, y + 1, r);
    }
    o.push([0, h, 0, 0, h + 2, 0, 1]);
    raio = Math.round(Rm) + 1;
  } else {
    const grosso = h >= 22;
    tr(0, 0, 0, grosso ? 1 : 0, h, grosso ? 1 : 0);
    const L = Math.max(3, Math.round(h / 7));
    const y1 = Math.floor(h * 0.55), y2 = Math.floor(h * 0.75);
    for (let i = 1; i <= L; i++) tr(i + (grosso ? 1 : 0), y1 + Math.floor(i * 0.7), 0, i + (grosso ? 1 : 0), y1 + Math.floor(i * 0.7), 0);
    for (let i = 1; i <= Math.max(2, L - 1); i++) tr(0, y2 + Math.floor(i * 0.6), i + (grosso ? 1 : 0), 0, y2 + Math.floor(i * 0.6), i + (grosso ? 1 : 0));
    for (let i = 1; i <= 2; i++) tr(-i, y1 - 1 + i, 0, -i, y1 - 1 + i, 0);
    raio = L + 2;
  }
  return { ops: o, raio };
}

function estampa(tipo, h) {
  const k = tipo + ":" + h;
  let e = estampas.get(k);
  if (!e) estampas.set(k, (e = criaEstampa(tipo, h)));
  return e;
}

/** passes de grade: tamanho da célula e faixa de distância que ele cobre (mais denso perto, mais largo longe) */
const PASSES = [
  { c: 4, dmin: 3.5, dmax: 15 },
  { c: 6, dmin: 15, dmax: 36 },
  { c: 9, dmin: 36, dmax: 999 },
];

/**
 * Planta as árvores cujo tronco cai em x1..x2 (uma fatia da caixa, para a obra ser retomável).
 * @param {*} H @param {number} x1 @param {number} x2
 */
export function* arvores(H, x1, x2) {
  const { M, F, p, pausa } = H;
  const tipos = [
    { log: M.escura.log, folha: M.folhaEscura },
    { log: M.palida.log, folha: M.folhaPalida },
    { log: M.abeto.log, folha: M.folhaAbeto },
    { log: M.escura.log, folha: M.folhaEscura },
  ];
  const { x1: a1, z1: b1, x2: a2, z2: b2 } = LIMITE_BOSQUE;
  for (let ip = 0; ip < PASSES.length; ip++) {
    const { c, dmin, dmax } = PASSES[ip];
    const gx1 = Math.floor(x1 / c), gx2 = Math.floor(x2 / c);
    for (let gz = Math.floor(b1 / c); gz <= Math.floor(b2 / c); gz++) {
      for (let gx = gx1; gx <= gx2; gx++) {
        const x = gx * c + Math.floor(hash2(gx, gz, 11 + ip) * c);
        const z = gz * c + Math.floor(hash2(gx, gz, 21 + ip) * c);
        if (x < x1 || x > x2 || x < a1 || x > a2 || z < b1 || z > b2) continue;
        const d = distPegada(x, z);
        if (d < dmin || d >= dmax) continue;
        const r = hash2(x, z, 31);
        const alvo = alvoAltura(d) * (0.88 + 0.24 * hash2(x, z, 41));
        const h = quantiza(Math.max(6, Math.min(36, alvo)));
        const tipo = r < 0.3 ? 0 : r < 0.6 ? 1 : r < 0.85 ? 2 : 3;
        const e = estampa(tipo, h);
        if (x - e.raio < a1 || x + e.raio > a2 || z - e.raio < b1 || z + e.raio > b2) continue;
        if (d < e.raio - 1) continue; // a copa não passa por cima da área jogável
        const y0 = alturaChao(x, z) + 1;
        const giro = Math.floor(hash2(x, z, 51) * 4);
        const t = tipos[tipo];
        for (const [ax, ay, az, bx, by, bz, k] of e.ops) {
          let ux = ax, vx = bx, uz = az, vz = bz;
          if (giro & 1) [ux, uz, vx, vz] = [uz, ux, vz, vx];
          if (giro & 2) [ux, vx] = [-vx, -ux];
          const xa = x + Math.min(ux, vx), xb = x + Math.max(ux, vx), za = z + Math.min(uz, vz), zb = z + Math.max(uz, vz);
          if (k === 0) F(xa, y0 + ay, za, xb, y0 + by, zb, t.log);
          else p.fill(xa, y0 + ay, za, xb, y0 + by, zb, t.folha, true, { persistent_bit: true });
        }
        yield* pausa(500);
      }
    }
  }
}

/** Fatias de x para as fases do bosque (4 fases). */
export const FATIAS_BOSQUE = (() => {
  const { x1, x2 } = LIMITE_BOSQUE;
  const n = 4, w = Math.ceil((x2 - x1 + 1) / n);
  return Array.from({ length: n }, (_, i) => [x1 + i * w, Math.min(x2, x1 + (i + 1) * w - 1)]);
})();
