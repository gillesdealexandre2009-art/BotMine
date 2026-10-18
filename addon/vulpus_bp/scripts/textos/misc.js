// @ts-check
// Textos da Miscelânea (botão do menu principal que guarda pets, primeiros passos e regras).

export const TITULO = "Miscelânea";
/**
 * @param {number} pets
 * @param {number} ativos
 * @param {number} fichas
 */
export const CORPO = (pets, ativos, fichas) =>
  `§7Pets, primeiros passos e as regras do servidor.\n§fPets: §e${pets}§7 · seguindo: §e${ativos}§7 · fichas de cápsula: §d${fichas}`;
export const BOTAO_PETS = "Meus pets";
export const BOTAO_MINIGAMES = "Minigames";
export const BOTAO_COMECAR = "Primeiros passos";
export const BOTAO_ERA = "Era da semana";
export const BOTAO_REGRAS = "Regras do servidor";
