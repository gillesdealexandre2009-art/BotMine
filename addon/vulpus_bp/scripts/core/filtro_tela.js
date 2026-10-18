// @ts-check
// Ponte entre o mistério (sistemas/arg.js) e o scoreboard (sistemas/hud.js) para o filtro de câmera antiga,
// sem importar um sistema no outro (evita ciclos de importação).

/** @typedef {import("@minecraft/server").Player} Player */

/** @type {(p: Player) => boolean} */
let detector = () => false;

/** @type {((p: Player) => boolean)[]} */
const extras = [];

/** @param {(p: Player) => boolean} fn */
export function definirDetectorFiltro(fn) {
  detector = fn;
}

/** Outro sistema (o Intervalo) liga o filtro nas regiões dele. @param {(p: Player) => boolean} fn */
export function adicionarDetectorFiltro(fn) {
  extras.push(fn);
}

/** Se o filtro de câmera antiga está ligado para a pessoa agora. @param {Player} player */
export function filtroLigadoPara(player) {
  try {
    return detector(player) || extras.some((f) => f(player));
  } catch {
    return false;
  }
}
