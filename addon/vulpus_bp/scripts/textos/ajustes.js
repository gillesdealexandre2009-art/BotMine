// @ts-check
// Textos dos Ajustes (preferências de cada jogador).

export const TITULO = "Ajustes";
export const CORPO = "§7Do seu jeitinho. Toque para trocar:";

/** @param {boolean} ligada */
export const BOTAO_HUD = (ligada) => `HUD na tela: ${ligada ? "§aligada" : "§cdesligada"}`;
/** @param {boolean} aceitando */
export const BOTAO_TPA = (aceitando) => `Pedidos de TPA: ${aceitando ? "§aaceitando" : "§cbloqueados"}`;
/** @param {boolean} ligados */
export const BOTAO_SONS = (ligados) => `Sons do menu: ${ligados ? "§aligados" : "§cdesligados"}`;

/** @param {boolean} ligada */
export const HUD_MUDOU = (ligada) => (ligada ? "HUD ligada! Agora você sabe onde está." : "HUD desligada. Tela limpinha.");
/** @param {boolean} aceitando */
export const TPA_MUDOU = (aceitando) =>
  aceitando ? "Pedidos de TPA liberados de novo." : "Pedidos de TPA bloqueados. Ninguém vai te chamar.";
/** @param {boolean} ligados */
export const SONS_MUDOU = (ligados) => (ligados ? "Sons ligados. Pi-pi-pi!" : "Sons desligados. Silêncio de raposa.");
