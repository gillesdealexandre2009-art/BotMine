// @ts-check
// Textos do minigame The Bridge: descrição, opções votáveis, kits, avisos de jogo e resumo.

export const BR_DESC = "Duas bases nas pontas de uma longa ponte sobre o vazio. Entre no poço do outro time para marcar; a cada ponto todos voltam às gaiolas. Quem morre ou cai renasce na própria base. Vence quem chegar primeiro à meta.";

// ---------------------------------------------------------------- opções e kits
export const BR_META_TITULO = "Pontos para vencer";
export const BR_META_DESC = "Quantos pontos o time precisa fazer para ganhar a partida.";
export const BR_META_OPCOES = Object.freeze({
  3: { nome: "3 pontos", desc: "Partida rápida." },
  5: { nome: "5 pontos", desc: "A medida de sempre." },
  10: { nome: "10 pontos", desc: "Partida longa e disputada." },
});
export const BR_KITS = Object.freeze({
  guerreiro: { nome: "Guerreiro", desc: "Espada de ferro com Afiação I." },
  corredor: { nome: "Corredor", desc: "Velocidade I o tempo todo e espada de pedra." },
  minerador: { nome: "Minerador", desc: "Picareta com Eficiência III e 96 blocos." },
  ninja: { nome: "Ninja", desc: "Bastão de Empurrão II, uma pérola do Ender e espada de pedra." },
});

// ---------------------------------------------------------------- itens
export const BR_ITEM_BASTAO = "§eBastão do Empurrão";

// ---------------------------------------------------------------- partida
/** @param {string} cor @param {string} nome */
export const BR_VOCE_TIME = (cor, nome) => `§fVocê é do time ${cor}§l${nome}`;
/** @param {string} cor @param {string} nome */
export const BR_TITULO_TIME = (cor, nome) => `${cor}§lTime ${nome}`;
/** @param {number} meta */
export const BR_SUB_TIME = (meta) => `§7Entre no poço inimigo! Meta: §f${meta} §7pontos`;
/** @param {string} kit */
export const BR_KIT = (kit) => `§7Seu kit: §f${kit}§7.`;
/** @param {string} cor @param {string} nome */
export const BR_TITULO_PONTO = (cor, nome) => `${cor}§l+1 ${nome}`;
/** @param {string} quem @param {string} placar */
export const BR_SUB_PONTO = (quem, placar) => `§f${quem} §7marcou! ${placar}`;
/** @param {string} quem @param {string} cor @param {string} nome @param {string} placar */
export const BR_AVISO_PONTO = (quem, cor, nome, placar) => `§6§l✦ §r§f${quem} §7marcou para o time ${cor}${nome}§7! ${placar}`;
export const BR_VOLTANDO = "§7Todos voltam às bases. Prepare-se!";
export const BR_POCO_PROPRIO = "§cEsse é o SEU poço! Entre no poço do outro time.";
/** @param {number} a @param {number} b */
export const BR_PLACAR = (a, b) => `§9Azul §f${a} §8x §f${b} §cVermelho`;
/** @param {string} time @param {string} placar @param {number} meta @param {number} kills @param {string} tempo */
export const BR_BARRA = (time, placar, meta, kills, tempo) => `${time}  §8| ${placar}  §8| §7Meta §f${meta}  §8| §fAbates: §c${kills}  §8| §7${tempo}`;
export const BR_SO_SEUS_BLOCOS = "§cAqui só dá para quebrar os blocos que os jogadores colocaram.";

// ---------------------------------------------------------------- resumo
/** @param {string} nome @param {number} n */
export const BR_RESUMO_PONTOS = (nome, n) => `§f${nome} §8» §7marcou §f${n} ponto${n === 1 ? "" : "s"}`;
/** @param {string} placar */
export const BR_RESUMO_PLACAR = (placar) => `§7Placar final: ${placar}`;
