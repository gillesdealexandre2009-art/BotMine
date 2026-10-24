// @ts-check
// Textos da telecinese da Varinha Lamento (segurar e arremessar).

export const MODOS = ["Raio", "Telecinese: entidades", "Telecinese: blocos"];
/** @param {number} modo */
export const MODO = (modo) => `§dVarinha Lamento: §f${MODOS[modo] ?? MODOS[0]}`;
export const DESLIGADA = "§7A telecinese está desligada.";
/** @param {number} seg */
export const ESPERA = (seg) => `§7A telecinese ainda está se recompondo (${seg}s).`;
export const SEM_ALVO = "§7Nada para agarrar na mira.";
export const SEM_BLOCO = "§7Nenhum bloco na mira.";
export const PROTEGIDO = "§cEsse lugar é protegido.";
export const RECUSADO = "§cIsso não pode ser agarrado.";
export const JOGADOR_DESLIGADO = "§cNão dá para agarrar jogadores agora.";
export const BLOCO_DESLIGADO = "§cNão dá para agarrar blocos agora.";
export const BLOCO_INVALIDO = "§cEsse bloco não pode ser agarrado.";
export const BLOCOS_DEMAIS = "§cJá há blocos demais flutuando.";
export const IMUNE = "§7Essa pessoa acabou de ser solta e está imune.";
/** @param {string} nome */
export const AGARRADO = (nome) => `§d${nome}§f te agarrou.`;
/**
 * Barra de tempo na actionbar.
 * @param {number} restanteSeg
 * @param {number} totalSeg
 */
export const SEGURANDO = (restanteSeg, totalSeg) => {
  const cheias = Math.max(0, Math.min(10, Math.round((restanteSeg / totalSeg) * 10)));
  return `§dTelecinese §f${"█".repeat(cheias)}§8${"█".repeat(10 - cheias)} §f${Math.ceil(restanteSeg)}s`;
};
