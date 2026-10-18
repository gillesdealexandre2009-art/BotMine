// @ts-check
// Geração dos 5 andares da masmorra: cada andar é uma planta (masm_plano.js) construída com o tema dele (masm_temas.js), lado a lado
// na mesma profundidade (separados por rocha). Grava cada andar no mundo (masm_estado.js) para o jogo (masm_jogo.js) ler.
import { K_MAX, K_MIN, construirAndar } from "./masm_construir.js";
import { aplicarFormas, melhorPlano } from "./masm_plano.js";
import { ANDARES, gravarAndar } from "./masm_estado.js";
import { TEMAS } from "./masm_temas.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {import("./masm_construir.js").ResultadoAndar} ResultadoAndar */

export const PADRAO_MASMORRA = Object.freeze({ yPiso: -50, decoracao: true });
export { K_MAX, K_MIN };

/** Tamanho da grade e número de salas de cada andar (cresce com a dificuldade). */
export const CONFIG_ANDARES = Object.freeze([
  { N: 100, salas: 11 },
  { N: 110, salas: 13 },
  { N: 120, salas: 15 },
  { N: 130, salas: 17 },
  { N: 150, salas: 19 },
]);
/** Rocha entre dois andares vizinhos. */
export const FOLGA = 20;
/** Maior lado de grade (a profundidade, em Z, que a obra ocupa). */
export const PROFUNDIDADE = Math.max(...CONFIG_ANDARES.map((c) => c.N));
/** Largura total em X de todos os andares. */
export const LARGURA = CONFIG_ANDARES.reduce((s, c) => s + c.N, 0) + FOLGA * (CONFIG_ANDARES.length - 1);

/** Canto noroeste de cada andar. @param {number} x0 @param {number} z0 */
export function posicoes(x0, z0) {
  let x = x0;
  return CONFIG_ANDARES.map((c, i) => {
    const r = { andar: i + 1, x0: x, z0, N: c.N };
    x += c.N + FOLGA;
    return r;
  });
}

/**
 * Constrói os 5 andares em sequência e guarda cada um.
 * @param {Pincel} p
 * @param {{ x0: number, z0: number, yPiso: number, decoracao: boolean, semente: number }} o
 * @param {(f: number, t: string) => void} prog
 * @returns {Generator<any, ResultadoAndar[]>}
 */
export function* gerarAndares(p, o, prog) {
  const pos = posicoes(o.x0, o.z0);
  /** @type {ResultadoAndar[]} */
  const feitos = [];
  for (let i = 0; i < ANDARES; i++) {
    const cfg = CONFIG_ANDARES[i], tema = TEMAS[i];
    const plano = melhorPlano({ N: cfg.N, salas: cfg.salas, semente: (o.semente + (i + 1) * 7919) | 0 });
    aplicarFormas(plano, tema.forma);
    const nome = `Andar ${i + 1} · ${tema.nome}`;
    const res = yield* construirAndar(p, { x0: pos[i].x0, z0: pos[i].z0, yPiso: o.yPiso, andar: i + 1, decoracao: o.decoracao, semente: (o.semente + (i + 1) * 31) | 0 }, tema, plano, (f, t) => prog((i + f) / ANDARES, `${nome}: ${t}`));
    gravarAndar(i + 1, res);
    feitos.push(res);
    yield;
  }
  return feitos;
}

/** Apaga o que o jogo sabe dos andares (depois de desfazer a obra). */
export function esquecerAndares() {
  for (let i = 1; i <= ANDARES; i++) gravarAndar(i, null);
}
