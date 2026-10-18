// @ts-check
// Ruído e o relevo da montanha. Tudo determinístico: a mesma semente dá sempre a mesma montanha.

/** Gerador pseudoaleatório pequeno (mulberry32). @param {number} semente */
export function criarRng(semente) {
  let a = semente | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {number} ix @param {number} iz @param {number} semente */
function hash(ix, iz, semente) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(semente, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruído de valor suave em [0, 1]. @param {number} x @param {number} z @param {number} semente */
export function ruido(x, z, semente) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, semente), b = hash(ix + 1, iz, semente), c = hash(ix, iz + 1, semente), d = hash(ix + 1, iz + 1, semente);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Soma de oitavas, em [0, 1]. @param {number} x @param {number} z @param {number} semente @param {number} [oitavas] */
export function fbm(x, z, semente, oitavas = 4) {
  let soma = 0, amp = 0.5, freq = 1, total = 0;
  for (let i = 0; i < oitavas; i++) {
    soma += ruido(x * freq, z * freq, semente + i * 101) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return soma / total;
}

/** @param {number} v */
const lim01 = (v) => Math.max(0, Math.min(1, v));

/**
 * @typedef {object} ParamsMontanha
 * @property {number} cx  centro X
 * @property {number} cz  centro Z
 * @property {number} raio  raio da base (blocos)
 * @property {number} altura  altura do pico acima do chão (blocos)
 * @property {number} semente
 */

/**
 * Relevo: altura (acima do chão de referência) de cada coluna dentro do raio. O pico é exatamente `altura`.
 * @param {ParamsMontanha} p
 */
export function campoMontanha(p) {
  const { cx, cz, raio: R, altura: H, semente } = p;
  const lado = R * 2 + 3;
  const alt = new Float32Array(lado * lado);
  const sx = cx - R - 1, sz = cz - R - 1;
  let maximo = 0, mx = cx, mz = cz;
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const x = sx + i, z = sz + j;
      // distorce a posição para a base não ser um círculo perfeito
      const wx = x + (fbm(x * 0.02, z * 0.02, semente + 7, 3) - 0.5) * R * 0.34;
      const wz = z + (fbm(x * 0.02 + 40, z * 0.02 + 40, semente + 9, 3) - 0.5) * R * 0.34;
      const d = Math.hypot(wx - cx, wz - cz) / R;
      if (d >= 1) continue;
      const t = 1 - d;
      const base = Math.pow(t, 1.3) * (0.5 + 0.5 * t);
      const n1 = fbm(x * 0.035, z * 0.035, semente + 11, 4);
      const n2 = fbm(x * 0.11, z * 0.11, semente + 13, 3);
      const crista = 1 - Math.abs(2 * fbm(x * 0.05, z * 0.05, semente + 17, 3) - 1);
      const pico = Math.exp(-Math.pow(d / 0.17, 2));
      const h = base * (0.74 + 0.5 * n1) + 0.2 * crista * Math.pow(base, 0.85) + 0.06 * n2 * base + 0.3 * pico;
      alt[j * lado + i] = h;
      if (h > maximo) {
        maximo = h;
        mx = x;
        mz = z;
      }
    }
  }
  const escala = maximo > 0 ? H / maximo : 0;
  for (let k = 0; k < alt.length; k++) alt[k] = alt[k] * escala;
  return {
    ...p,
    lado,
    sx,
    sz,
    /** Altura (decimal) da coluna; fora do raio = 0. @param {number} x @param {number} z */
    alturaEm(x, z) {
      const i = x - sx, j = z - sz;
      if (i < 0 || j < 0 || i >= lado || j >= lado) return 0;
      return alt[j * lado + i];
    },
    /** Altura inteira da coluna. @param {number} x @param {number} z */
    h(x, z) {
      return Math.round(this.alturaEm(x, z));
    },
    pico: { x: mx, z: mz, h: H },
  };
}

/** @typedef {ReturnType<typeof campoMontanha>} Campo */

/**
 * Inclinação: maior diferença de altura para as 4 colunas vizinhas.
 * @param {Campo} campo
 * @param {number} x
 * @param {number} z
 */
export function inclinacao(campo, x, z) {
  const h = campo.h(x, z);
  return Math.max(Math.abs(h - campo.h(x + 1, z)), Math.abs(h - campo.h(x - 1, z)), Math.abs(h - campo.h(x, z + 1)), Math.abs(h - campo.h(x, z - 1)));
}

export { lim01 };
