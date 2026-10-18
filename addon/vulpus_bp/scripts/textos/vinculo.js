// @ts-check
// Textos do vínculo com o Discord e da ponte do chat.

export const TITULO_CODIGO = (/** @type {string} */ codigo) => `§l§f${codigo}`;
export const SUBTITULO_CODIGO = "§eNo Discord, use §f/minecraft vincular";
export const BARRA_CODIGO = (/** @type {string} */ codigo) => `§7Ligue sua conta: §f/minecraft vincular §7código §f${codigo}`;
export const TITULO_INDISPONIVEL = "§c...";
export const SUBTITULO_INDISPONIVEL = "§7Não consegui falar com o Discord. Tentando de novo...";
export const BARRA_INDISPONIVEL = "§7Sem conexão com o Discord agora. Tentando de novo...";
export const BEM_VINDO = (/** @type {string} */ discord) => `§aConta ligada a §f${discord || "seu Discord"}§a! Suas Caudas e seu XP agora são os mesmos no jogo e no Discord.`;
export const SOMADO = (/** @type {string} */ caudas, /** @type {number} */ nivel) => `§7Suas contas foram unidas: §f${caudas} §7Caudas, nível §f${nivel}§7.`;
export const CHAT_TRAVADO = "§cLigue sua conta do Discord para conversar: use o código da tela.";
export const DESVINCULADO = "§eSua conta do Discord foi desvinculada. Ligue de novo para continuar jogando.";

/** Linha de uma mensagem que veio do Discord. */
export const LINHA_DISCORD = (/** @type {string} */ nome, /** @type {string} */ texto) => `§9[Discord] §f${nome}§7 » §f${texto}`;
