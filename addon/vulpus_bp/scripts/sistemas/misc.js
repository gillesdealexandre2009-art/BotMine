// @ts-check
// Miscelânea: a gaveta do menu principal para o que não tem botão próprio: pets (coleção, ativar até 2, guardar), primeiros
// passos e as regras do servidor.
import { ICONES } from "../config.js";
import { Lista } from "../core/forms.js";
import * as textos from "../textos/misc.js";
import { abrirComecar } from "./novato.js";
import { dadosPet } from "./pets_bonus.js";
import { menuColecao } from "./pets.js";
import { menuMinigames } from "./mg_menu.js";
import { menuRegras } from "./regras.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuMisc(player, voltar) {
  const aqui = () => menuMisc(player, voltar);
  const d = dadosPet(player);
  await new Lista(textos.TITULO)
    .texto(textos.CORPO(Object.keys(d.own).length, d.ativos.length, d.fichas))
    .botao(textos.BOTAO_PETS, ICONES.perfil, (p) => menuColecao(p, aqui))
    .botao(textos.BOTAO_MINIGAMES, ICONES.minigames, (p) => menuMinigames(p, aqui))
    .botao(textos.BOTAO_COMECAR, ICONES.nova, (p) => abrirComecar(p))
    .botao(textos.BOTAO_REGRAS, ICONES.regras, (p) => menuRegras(p, aqui))
    .voltar(voltar)
    .abrir(player);
}
