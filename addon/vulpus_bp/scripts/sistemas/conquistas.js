// @ts-check
// Conquistas: guarda no jogador (vale offline) e devolve a lista pronta para o perfil.
import { Player } from "@minecraft/server";
import { dadosJogador, editarJogador } from "../core/db.js";
import { emitir } from "../core/eventos.js";
import { msg } from "../core/util.js";
import * as textos from "../textos/conquistas.js";

/**
 * @param {Player | string} alvo
 * @param {string} id
 */
export const temConquista = (alvo, id) => dadosJogador(alvo).conquistas.includes(id);

/**
 * Dá a conquista (uma vez só) e avisa quem está online.
 * @param {Player | string} alvo
 * @param {string} id
 * @returns {boolean} se era nova
 */
export function darConquista(alvo, id) {
  if (!textos.CONQUISTAS[id] || temConquista(alvo, id)) return false;
  editarJogador(alvo, (d) => {
    d.conquistas.push(id);
  });
  if (typeof alvo !== "string") msg(alvo, textos.CONQUISTA_NOVA(textos.NOME_CONQUISTA(id)));
  emitir("conquista", { nome: typeof alvo === "string" ? dadosJogador(alvo).nome : alvo.name, conquista: textos.CONQUISTAS[id].nome });
  return true;
}

/**
 * Nomes prontos ("[Chegou cedo hein!]", já com cor) das conquistas da pessoa.
 * @param {Player | string} alvo
 * @returns {string[]}
 */
export const conquistasDe = (alvo) => dadosJogador(alvo).conquistas.map((id) => textos.NOME_CONQUISTA(id)).filter((t) => t !== "");
