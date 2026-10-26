// @ts-check
// Sub-menu Atividades: Caçada, Minigames e Pets.
import { ICONES } from "../config.js";
import { Lista } from "../core/forms.js";
import { menuCacada } from "./cacada.js";
import { menuMinigames } from "./mg_menu.js";
import { dadosPet } from "./pets_bonus.js";
import { menuColecao } from "./pets.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuAtividades(player, voltar) {
  const aqui = () => menuAtividades(player, voltar);
  const d = dadosPet(player);
  await new Lista("Atividades")
    .texto(`§7Explore, caçe e divirta-se!\n§fPets: §e${Object.keys(d.own).length}§7 · fichas: §d${d.fichas}`)
    .botao("Caçada", ICONES.cacada, (p) => menuCacada(p, aqui))
    .botao("Minigames", ICONES.minigames, (p) => menuMinigames(p, aqui))
    .botao("Meus pets", ICONES.perfil, (p) => menuColecao(p, aqui))
    .voltar(voltar)
    .abrir(player);
}
