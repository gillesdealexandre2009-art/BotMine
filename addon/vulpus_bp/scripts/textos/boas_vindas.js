// @ts-check
// Textos da primeira entrada, do retorno e do item do menu.

export const TITULO_PRIMEIRA = "§6Vulpus";
/** @param {string} nome */
export const SUBTITULO_PRIMEIRA = (nome) => `§fQue bom te ver na toca, §e${nome}§f!`;
/** @param {string} nome */
export const CHAT_PRIMEIRA = (nome) =>
  `Oi, §e${nome}§r! Eu sou a Kiza, a raposa que cuida desta toca. ` +
  "Use o §6Menu do Vulpus§r no seu inventário (ou §e/vulpus:menu§r) para ver tudo o que dá para fazer.";
/** @param {string} nome */
export const BARRA_RETORNO = (nome) => `§6Que bom te ver de novo, §e${nome}§6!`;

export const LORE_ITEM = "§7Use para abrir o menu";
export const ITEM_ENTREGUE = "Coloquei o §6Menu do Vulpus§r no seu inventário.";
export const ITEM_JA_TEM = "Você já tem o §6Menu do Vulpus§r. Dá uma olhadinha no inventário!";
export const ITEM_SEM_ESPACO = "Seu inventário está lotado! Abre um espacinho e usa §e/vulpus:item§c.";
export const DESC_ITEM = "Devolve o item do menu, se você não tiver";
