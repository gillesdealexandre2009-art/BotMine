// @ts-check
// Menu de Dúvidas (Q&A): perguntas frequentes organizadas por categoria.
import { ActionFormData } from "@minecraft/server-ui";
import { ICONES } from "../config.js";
import { Lista, mostrar } from "../core/forms.js";
import { CATEGORIAS, CORPO, TITULO } from "../textos/duvidas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../textos/duvidas.js").Pergunta} Pergunta */
/** @typedef {import("../textos/duvidas.js").Categoria} Categoria */

/**
 * Mostra a resposta de uma pergunta.
 * @param {Player} player
 * @param {Pergunta} p
 * @param {() => any} voltar
 */
async function mostrarResposta(player, p, voltar) {
  const form = new ActionFormData().title(p.q).body(`§f${p.a}`).button("Voltar", ICONES.voltarNav);
  const r = await mostrar(player, form);
  if (r?.selection === 0) voltar();
}

/**
 * Lista de perguntas de uma categoria.
 * @param {Player} player
 * @param {Categoria} cat
 * @param {() => any} voltar
 */
async function menuCategoria(player, cat, voltar) {
  const aqui = () => menuCategoria(player, cat, voltar);
  const lista = new Lista(cat.nome).texto(`§7${cat.perguntas.length} perguntas`);
  for (const p of cat.perguntas) {
    lista.botao(p.q, undefined, (pl) => mostrarResposta(pl, p, aqui));
  }
  lista.voltar(voltar);
  await lista.abrir(player);
}

/**
 * Menu principal de dúvidas: lista de categorias.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuDuvidas(player, voltar) {
  const aqui = () => menuDuvidas(player, voltar);
  const lista = new Lista(TITULO).texto(CORPO);
  for (const cat of CATEGORIAS) {
    const icone = ICONES[/** @type {keyof typeof ICONES} */ (cat.icone)];
    lista.botao(`${cat.nome} §8(${cat.perguntas.length})`, icone, (p) => menuCategoria(p, cat, aqui));
  }
  lista.voltar(voltar);
  await lista.abrir(player);
}
