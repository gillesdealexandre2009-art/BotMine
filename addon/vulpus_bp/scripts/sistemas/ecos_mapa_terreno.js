// @ts-check
// Terreno orgânico dos Ecos: relevo de baixa frequência (colinas suaves nas bordas), manchas de solo e tufos de capim
// em manchas, sempre por ruído determinístico (nada de Math.random). As alturas são inteiras; os adereços usam alt(x, z).
import { fbm, suave, hash2 } from "./ecos_mapa_base.js";

/**
 * Altura de uma colina elíptica com pico deslocado e contorno com ruído (perfil em S).
 * @param {number} x @param {number} z @param {{ cx: number, cz: number, rx: number, rz: number, H: number, seed: number, desloc?: number }} c
 */
export function colinaAlt(x, z, c) {
  const u = (x - c.cx) / c.rx, v = (z - c.cz) / c.rz;
  const wob = 0.85 + 0.3 * fbm(x, z, c.seed, 10, 2);
  const d = Math.hypot(u - (c.desloc ?? 0.15), v) / wob;
  if (d >= 1) return 0;
  const t = suave(suave(1 - d));
  return c.H * t + (fbm(x, z, c.seed + 7, 6, 2) - 0.5) * 0.9 * Math.sin(Math.PI * Math.min(1, (1 - d) * 1.5));
}

/**
 * Pinta o solo de uma região por colunas: `alt(x, z)` dá a altura (>=0). Cada coluna recebe terra até alt-1 e o topo.
 * `topo(x, z, alt, inclinacao)` devolve o bloco de cima. Agrupa colunas vizinhas iguais num só fill.
 */
export function* solo(H, x1, z1, x2, z2, alt, topo, terra) {
  const { F, pausa } = H;
  for (let z = z1; z <= z2; z++) {
    let ini = x1, hAtual = -1, topoAtual = "";
    const fecha = (xf) => {
      if (hAtual < 0) return;
      if (hAtual > 0) F(ini, 0, z, xf, hAtual - 1, z, terra);
      F(ini, hAtual, z, xf, hAtual, z, topoAtual);
    };
    for (let x = x1; x <= x2 + 1; x++) {
      let h = -1, t = "";
      if (x <= x2) {
        h = Math.max(0, Math.round(alt(x, z)));
        const inc = Math.max(Math.abs(h - Math.round(alt(x + 1, z))), Math.abs(h - Math.round(alt(x, z + 1))), Math.abs(h - Math.round(alt(x - 1, z))), Math.abs(h - Math.round(alt(x, z - 1))));
        t = topo(x, z, h, inc);
      }
      if (h !== hAtual || t !== topoAtual) {
        fecha(x - 1);
        ini = x; hAtual = h; topoAtual = t;
      }
    }
    if (z % 4 === 0) yield* pausa(300);
  }
}

/**
 * Tufos de capim e flores em manchas (limiar de ruído), dentro de retângulos, fora das exclusões e sobre solo de terra/musgo.
 * @param {any} H @param {number[][]} zonas [x1,z1,x2,z2] @param {number[][]} exclusoes @param {(x:number,z:number)=>number} alt
 */
export function tufos(H, zonas, exclusoes, alt, seed, { limiar = 0.62, flor = 0.12, apoio = "", flores = [] } = {}) {
  const { M, S } = H;
  const fl = flores.length ? flores : [M.dente, M.bluet, M.margarida];
  const fora = (x, z) => exclusoes.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d);
  for (const [x1, z1, x2, z2] of zonas) {
    for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
      if (fora(x, z)) continue;
      const n = fbm(x, z, seed, 7, 2);
      if (n < limiar) continue;
      const y = Math.max(0, Math.round(alt(x, z))) + 1;
      const r = hash2(x, z, seed + 3);
      if (r < flor) H.flor(x, y, z, fl[Math.floor((r / flor) * fl.length) % fl.length]);
      else if (r < 0.7) { if (apoio) S(x, y - 1, z, apoio); S(x, y, z, M.capim); }
    }
  }
}
