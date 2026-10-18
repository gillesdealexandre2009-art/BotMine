// @ts-check
// Os temas dos 5 andares, de cima (mais fácil) para baixo (final).
import { TEMA_CORACAO } from "./masm_tema_coracao.js";
import { TEMA_FEIRA } from "./masm_tema_feira.js";
import { TEMA_GUERRA } from "./masm_tema_guerra.js";
import { TEMA_SONHO } from "./masm_tema_sonho.js";
import { TEMA_TOCA } from "./masm_tema_toca.js";

/** @typedef {import("./masm_construir.js").Tema} Tema */

/** @type {Tema[]} */
export const TEMAS = [TEMA_TOCA, TEMA_FEIRA, TEMA_GUERRA, TEMA_SONHO, TEMA_CORACAO];
