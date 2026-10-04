// @ts-check
// Textos do menu principal (Hub). O corpo cabe em ~7 linhas estreitas embaixo da logo: dicas curtas.

export const TITULO = "VULPUS";

/** @param {string} nome */
export const SAUDACAO = (nome) => `Que bom te ver na toca, §6${nome}§r!`;
/**
 * Selo + rank + nível, embaixo da saudação.
 * @param {string} selo  glyph pronto (identidade.selo)
 * @param {string} rank  nome do rank
 * @param {string} nivel  já formatado
 */
export const LINHA_RANK = (selo, rank, nivel) => `${selo} §f${rank} §8• §7Nv §f${nivel}`;
/** @param {string} caudas  já formatado */
export const LINHA_CAUDAS = (caudas) => `§6★ §r${caudas} Caudas`;
/** @param {number} quantos */
export const LINHA_ONLINE = (quantos) => `§7${quantos} online agora`;
/** @param {string} dica */
export const LINHA_DICA = (dica) => `§7${dica}`;

/** Sorteadas a cada abertura. Até ~34 caracteres (duas linhas na coluna de ~118px do Hub). */
export const DICAS = [
  "Sem se mexer, o teleporte sai.",
  "Diária todo dia = mais Caudas!",
  "Caiu longe? O Voltar te leva lá.",
  "Briga e teleporte não combinam.",
  "Marque suas casas e viaje fácil.",
  "Muito TPA? Bloqueie em Ajustes.",
  "O placar do lado sai em Ajustes.",
  "Leia as Regras: a toca agradece.",
  "Ficar AFK não rende Caudas.",
  "Sem o item? Use /vulpus:menu.",
  "Cada história vira uma Cauda!",
  "Ativo no jogo = mais XP.",
  "Tema Black? Passa em Ajustes.",
  "Venda e compre no Leilão!",
  "Junte a turma num clã!",
  "Clã forte tem base protegida.",
  "Fale só com o clã: /vulpus:c",
];

// Rótulos dos slots (~70px de largura)
export const SPAWN = "Spawn";
export const CASAS = "Casas";
/** @param {number} pedidos  recebidos e pendentes */
export const TPA = (pedidos) => (pedidos > 0 ? `TPA (${pedidos})` : "TPA");
export const VOLTAR = "Voltar";
export const CAUDAS = "Caudas";
/** @param {number} itens  na caixa de retirada */
export const LEILAO = (itens) => (itens > 0 ? `Leilão (${itens})` : "Leilão");
export const PERFIL = "Perfil";
export const AJUSTES = "Ajustes";
export const REGRAS = "Regras";
export const STAFF = "Staff";

export const CMD_MENU = "Abre o menu do Vulpus";
