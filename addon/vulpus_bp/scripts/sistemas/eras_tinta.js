// @ts-check
// Tinta de cor na tela durante as Eras: um tom suave por cima de tudo e as bordas escurecidas (ou clareadas), na cor de cada Era. É o que
// mais muda a sensação de cara. O RP (ui/vulpus/vulpus_era.json, gerado por tools/gerar_ui_eras.mjs) desenha a tinta quando o texto do
// placar traz a marca da Era (FLAG_ERA_TINTA); por isso só aparece para quem está com o placar ligado, e a staff liga e desliga em
// Config > Eras ("erasTinta"; começa desligada para conferir o visual antes). Aqui só há DADOS e a marca.
import { config } from "../core/db.js";

/** @typedef {import("@minecraft/server").Player} Player */
import { FLAG_ERA_TINTA, TINTAS } from "./eras_tinta_dados.js";

export { FLAG_ERA_TINTA, TINTAS, TODAS_AS_MARCAS } from "./eras_tinta_dados.js";

/** @type {(p: Player) => number} Era que a pessoa vê agora (0 = nenhuma); quem sabe é eras_visual.js, que se registra aqui. */
let fonte = () => 0;

/** @param {(p: Player) => number} fn */
export function definirFonteTinta(fn) {
  fonte = fn;
}

/**
 * A marca para o placar desta pessoa agora: vazia se a tinta está desligada, se não há Era para ela ou se ela está em ambiente especial.
 * @param {Player} player
 * @returns {string}
 */
export function marcaTinta(player) {
  try {
    if (!config().erasTinta) return "";
    const n = fonte(player);
    return Number.isInteger(n) && n >= 1 && n <= TINTAS.length ? FLAG_ERA_TINTA(n) : "";
  } catch {
    return "";
  }
}
