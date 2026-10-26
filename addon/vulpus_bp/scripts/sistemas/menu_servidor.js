// @ts-check
// Sub-menu Servidor: Eras, Regras e Código de resgate.
import { ICONES } from "../config.js";
import { Lista } from "../core/forms.js";
import { menuEra } from "./eras.js";
import { menuRegras } from "./regras.js";
import { resgatarCodigoSeguro } from "./codigo.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuServidor(player, voltar) {
  const aqui = () => menuServidor(player, voltar);
  await new Lista("Servidor")
    .texto("§7Informações e novidades da toca.")
    .botao("Era da semana", ICONES.tempo, (p) => menuEra(p, aqui))
    .botao("Regras", ICONES.regras, (p) => menuRegras(p, aqui))
    .botao("Resgatar código", ICONES.caudas, (p) => resgatarCodigoSeguro(p))
    .voltar(voltar)
    .abrir(player);
}
