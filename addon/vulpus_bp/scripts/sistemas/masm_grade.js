// @ts-check
// Grade de um andar: a partir da planta (masm_plano.js) marca, célula por célula, sala, corredor, porta, passagem secreta e
// parede, com a forma de cada sala (retângulo, oval orgânica, cruz, L, octógono), a distância até a parede e as alturas.
import { fbm } from "./obras_ruido.js";

/** Tipos de célula. */
export const C = Object.freeze({ ROCHA: 0, SALA: 1, CORR: 2, PAREDE: 3, PORTA: 4, SECRETO: 6 });

/** @param {number} t */
export function ehAberto(t) {
  return t === C.SALA || t === C.CORR || t === C.PORTA || t === C.SECRETO;
}

/**
 * Máscara de uma sala: a célula (x, z) faz parte do interior?
 * @param {import("./masm_plano.js").SalaPlano & { forma?: string }} s
 * @param {number} x @param {number} z @param {number} semente
 */
export function dentroDaSala(s, x, z, semente) {
  if (x < s.x || z < s.z || x >= s.x + s.w || z >= s.z + s.h) return false;
  const forma = s.forma ?? "ret";
  const lx = x - s.x, lz = z - s.z;
  const cx = (s.w - 1) / 2, cz = (s.h - 1) / 2;
  switch (forma) {
    case "oval": {
      // caverna: o raio oscila com o ruído, as bordas ficam irregulares
      const ruido = (fbm(x * 0.22 + s.id * 13, z * 0.22, semente + 5, 3) - 0.5) * 0.34;
      const d = Math.hypot((lx - cx) / (s.w / 2), (lz - cz) / (s.h / 2));
      return d <= 0.98 + ruido;
    }
    case "cruz": {
      const bx = Math.floor(s.w / 3), bz = Math.floor(s.h / 3);
      return Math.abs(lx - cx) <= bx / 2 + 0.5 || Math.abs(lz - cz) <= bz / 2 + 0.5;
    }
    case "ele": {
      const cortaX = Math.floor(s.w * 0.45), cortaZ = Math.floor(s.h * 0.45);
      return !(lx >= s.w - cortaX && lz >= s.h - cortaZ);
    }
    case "octo": {
      const c = Math.floor(Math.min(s.w, s.h) / 4);
      const dx = Math.min(lx, s.w - 1 - lx), dz = Math.min(lz, s.h - 1 - lz);
      return dx + dz >= c;
    }
    default:
      return true;
  }
}

/**
 * Grade completa do andar.
 * @param {import("./masm_plano.js").Plano} plano
 * @param {{ semente: number, alturaCorredor: number }} o
 * @returns {Generator<void, { N: number, tipo: Uint8Array, sala: Uint8Array, pal: Uint8Array, alt: Uint8Array, altAdj: Uint8Array, dw: Uint8Array, largura: Uint8Array }, void>}
 */
export function* prepararGradeGen(plano, o) {
  const N = plano.N;
  const tipo = new Uint8Array(N * N);
  const sala = new Uint8Array(N * N);
  const pal = new Uint8Array(N * N);
  const alt = new Uint8Array(N * N);
  const altAdj = new Uint8Array(N * N);
  const dw = new Uint8Array(N * N);
  const largura = new Uint8Array(N * N);
  const i = (/** @type {number} */ x, /** @type {number} */ z) => z * N + x;
  /** paleta por papel: 0 base, 1 boss, 2 tesouro e secreta, 3 corredor */
  const palDe = (/** @type {string} */ papel) => (papel === "boss" ? 1 : papel === "tesouro" || papel === "secreta" ? 2 : 0);
  for (const s of plano.salas) {
    for (let z = s.z; z < s.z + s.h; z++) {
      for (let x = s.x; x < s.x + s.w; x++) {
        if (!dentroDaSala(s, x, z, o.semente)) continue;
        tipo[i(x, z)] = C.SALA;
        sala[i(x, z)] = s.id;
        pal[i(x, z)] = palDe(s.papel);
        alt[i(x, z)] = s.alt;
      }
    }
    yield;
  }
  for (const c of plano.corredores) {
    const t = c.tipo === "s" ? C.SECRETO : C.CORR;
    const lado = Math.floor(c.larg / 2);
    for (let u = c.a; u <= c.b; u++) {
      for (let k = c.c - lado; k <= c.c + lado; k++) {
        const x = c.eixo === "h" ? u : k, z = c.eixo === "h" ? k : u;
        if (x < 1 || z < 1 || x >= N - 1 || z >= N - 1) continue;
        const idx = i(x, z);
        if (tipo[idx] === C.SALA) continue;
        if (tipo[idx] === C.SECRETO && t === C.CORR) continue;
        tipo[idx] = t;
        pal[idx] = 3;
        alt[idx] = o.alturaCorredor;
        largura[idx] = Math.max(largura[idx], c.larg);
      }
    }
  }
  yield;
  // portas: corredor encostado numa sala
  for (let z = 1; z < N - 1; z++) {
    for (let x = 1; x < N - 1; x++) {
      if (tipo[i(x, z)] !== C.CORR) continue;
      if (tipo[i(x + 1, z)] === C.SALA || tipo[i(x - 1, z)] === C.SALA || tipo[i(x, z + 1)] === C.SALA || tipo[i(x, z - 1)] === C.SALA) tipo[i(x, z)] = C.PORTA;
    }
  }
  // paredes: rocha encostada (inclusive na diagonal) em área aberta
  for (let z = 0; z < N; z++) {
    if (z % 6 === 0) yield;
    for (let x = 0; x < N; x++) {
      if (tipo[i(x, z)] !== C.ROCHA) continue;
      let encosta = false;
      for (let dz = -1; dz <= 1 && !encosta; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, zz = z + dz;
          if (xx >= 0 && xx < N && zz >= 0 && zz < N && ehAberto(tipo[i(xx, zz)])) {
            encosta = true;
            break;
          }
        }
      }
      if (encosta) tipo[i(x, z)] = C.PAREDE;
    }
  }
  // distância até a parede (4 vizinhos), por busca em largura a partir das células fechadas
  const fila = [];
  const visto = new Uint8Array(N * N);
  for (let idx = 0; idx < N * N; idx++) {
    if (!ehAberto(tipo[idx])) {
      visto[idx] = 1;
      fila.push(idx);
    }
  }
  for (let q = 0; q < fila.length; q++) {
    if (q % 3000 === 0) yield;
    const idx = fila[q];
    const x = idx % N, z = (idx / N) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, zz = z + dz;
      if (xx < 0 || zz < 0 || xx >= N || zz >= N) continue;
      const j = i(xx, zz);
      if (visto[j]) continue;
      visto[j] = 1;
      dw[j] = Math.min(255, (ehAberto(tipo[idx]) ? dw[idx] : 0) + 1);
      fila.push(j);
    }
  }
  // altura vizinha e paleta das paredes
  for (let z = 0; z < N; z++) {
    if (z % 12 === 0) yield;
    for (let x = 0; x < N; x++) {
      const idx = i(x, z);
      if (ehAberto(tipo[idx])) continue;
      let m = 0, p = -1;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, zz = z + dz;
          if (xx < 0 || zz < 0 || xx >= N || zz >= N) continue;
          const j = i(xx, zz);
          if (ehAberto(tipo[j])) {
            m = Math.max(m, alt[j]);
            if (p < 0 || tipo[j] === C.SALA) p = pal[j];
          }
        }
      }
      altAdj[idx] = m;
      if (p >= 0) pal[idx] = p;
    }
  }
  return { N, tipo, sala, pal, alt, altAdj, dw, largura };
}

/** Versão de uma vez só (testes e prévias). @param {import("./masm_plano.js").Plano} plano @param {{ semente: number, alturaCorredor: number }} o */
export function prepararGrade(plano, o) {
  const g = prepararGradeGen(plano, o);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
