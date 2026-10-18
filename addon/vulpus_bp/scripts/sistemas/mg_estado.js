// @ts-check
// Quem está em um minigame agora (ou a caminho dele). Módulo minúsculo, sem dependências, para qualquer sistema perguntar
// "essa pessoa está em partida?" sem criar ciclo de importação (pets, portais, teleportes).

/** @type {Set<string>} */
const dentro = new Set();

/** @param {{ id: string }} p */
export const emMinigame = (p) => dentro.has(p.id);

/** @param {string} id */
export const marcarDentro = (id) => void dentro.add(id);

/** @param {string} id */
export const marcarFora = (id) => void dentro.delete(id);

export const idsDentro = () => [...dentro];

/** @type {Map<string, number>} */
const saidas = new Map();

/** Anota que a pessoa acabou de sair de um minigame (o portal do lobby não a puxa de volta). @param {string} id @param {number} tick */
export const registrarSaida = (id, tick) => void saidas.set(id, tick);

/** Ticks desde a última saída de um minigame (muito grande se nunca saiu). @param {string} id @param {number} tick */
export const saiuHa = (id, tick) => tick - (saidas.get(id) ?? -1e9);
