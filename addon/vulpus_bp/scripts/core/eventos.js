// @ts-check
// Barramento de eventos importantes da Vulpus (clãs, guerras, conquistas...). Quem emite não precisa saber quem escuta:
// hoje a ponte com o Discord (sistemas/ponte_chat.js) é a única que ouve.
import { registrarErro } from "./util.js";

/** @typedef {(tipo: string, dados: Record<string, any>) => void} OuvinteEvento */

/** @type {OuvinteEvento[]} */
const ouvintes = [];

/**
 * Anuncia que algo importante aconteceu. Nunca lança.
 * @param {string} tipo  nome do evento (os tipos da ponte estão em cogs_minecraft/embeds.py, TIPOS_EVENTO)
 * @param {Record<string, any>} [dados]
 */
export function emitir(tipo, dados = {}) {
  for (const fn of ouvintes) {
    try {
      fn(tipo, dados);
    } catch (e) {
      registrarErro(`Evento ${tipo}`, e);
    }
  }
}

/** @param {OuvinteEvento} fn */
export function aoEvento(fn) {
  ouvintes.push(fn);
}
