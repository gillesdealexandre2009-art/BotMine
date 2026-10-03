// @ts-check
// Textos dos Ajustes (preferências de cada jogador).

/** @typedef {import("../core/db.js").Tema} Tema */

export const TITULO = "Ajustes";
export const CORPO = "§7Do seu jeitinho. Toque para trocar:";

/** @param {boolean} ligada */
export const BOTAO_HUD = (ligada) => `Scoreboard lateral: ${ligada ? "§aligada" : "§cdesligada"}`;
/** @param {Tema} tema */
export const BOTAO_TEMA = (tema) => `Tema do menu: ${tema === "black" ? "§fBlack" : "§6Laranja"}`;
/** @param {boolean} aceitando */
export const BOTAO_TPA = (aceitando) => `Pedidos de TPA: ${aceitando ? "§aaceitando" : "§cbloqueados"}`;
/** @param {boolean} ligados */
export const BOTAO_SONS = (ligados) => `Sons do menu: ${ligados ? "§aligados" : "§cdesligados"}`;

/** @param {boolean} ligada */
export const HUD_MUDOU = (ligada) =>
  ligada ? "Placar do lado ligado! Tudo à vista." : "Placar do lado desligado. Tela limpinha.";
/** @param {Tema} tema */
export const TEMA_MUDOU = (tema) =>
  tema === "black" ? "Tema §fBlack§r! Elegante igual raposa à noite." : "Tema §6Laranja§r de volta. Cor de raposa!";
/** @param {boolean} aceitando */
export const TPA_MUDOU = (aceitando) =>
  aceitando ? "Pedidos de TPA liberados de novo." : "Pedidos de TPA bloqueados. Ninguém vai te chamar.";
/** @param {boolean} ligados */
export const SONS_MUDOU = (ligados) => (ligados ? "Sons ligados. Pi-pi-pi!" : "Sons desligados. Silêncio de raposa.");

export const DESC_HUD = "Liga ou desliga o placar do lado da tela";
