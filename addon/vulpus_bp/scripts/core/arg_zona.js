// @ts-check
// Ponte entre o mistério da Vulpus (sistemas/arg.js) e quem precisa saber se um ponto cai dentro dele (teleporte e casas),
// sem importar o sistema inteiro (evita ciclos de importação).

/** @typedef {{ x: number, y: number, z: number, d: string }} PontoZona */

/** @type {(p: PontoZona) => boolean} */
let detector = () => false;

/** @type {((p: PontoZona) => boolean)[]} */
const extras = [];

/** @param {(p: PontoZona) => boolean} fn */
export function definirDetectorZona(fn) {
  detector = fn;
}

/** Outro sistema (o Intervalo) também tem lugares que "não existem" para o painel. @param {(p: PontoZona) => boolean} fn */
export function adicionarDetectorZona(fn) {
  extras.push(fn);
}

/**
 * Se o ponto está dentro de alguma região do mistério (esse lugar "não existe" para o painel: não vira casa, não recebe
 * teleporte e não entra no /voltar).
 * @param {PontoZona} p
 */
export function pontoEmZona(p) {
  try {
    return detector(p) || extras.some((f) => f(p));
  } catch {
    return false;
  }
}
