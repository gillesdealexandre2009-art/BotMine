// @ts-check
// Textos do menu principal (Hub).

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

/** Sorteadas a cada abertura. Até ~34 caracteres. */
export const DICAS = [
  "Abra cápsulas de pet no lobby!",
  "Sem se mexer, o teleporte sai.",
  "Diária todo dia = mais Caudas!",
  "Perdeu itens? Use Retornar!",
  "Briga e teleporte não combinam.",
  "Marque suas casas e viaje fácil.",
  "Muito TPA? Bloqueie em Ajustes.",
  "O placar do lado sai em Ajustes.",
  "Leia as Regras: a toca agradece.",
  "Ficar AFK não rende Caudas.",
  "Sem o item? Use /vulpus:menu.",
  "Cada história vira uma Cauda!",
  "Ativo no jogo = mais XP.",
  "Troque o tema do menu em Ajustes.",
  "Compre e venda na Loja!",
  "Junte a turma num clã!",
  "Clã forte tem base protegida.",
  "Fale só com o clã: /vulpus:c",
  "Dúvida? Veja o menu Dúvidas!",
];

// Rótulos dos slots do Hub
export const TELEPORTES = "Teleportes";
export const PERFIL = "Perfil";
export const MERCADO = "Mercado";
export const ATIVIDADES = "Atividades";
/** @param {number} pedidos */
export const LEILAO = (pedidos) => (pedidos > 0 ? `Mercado (${pedidos})` : "Mercado");
export const AJUSTES = "Ajustes";
export const SERVIDOR = "Servidor";
export const DUVIDAS = "Dúvidas";
export const STAFF = "Staff";
export const DONO = "Dono";

export const LINHA_NOVATO = "§eNovo por aqui? §7Use §f/vulpus:comecar §7e ganhe Caudas com as missões.";

export const CMD_MENU = "Abre o menu do Vulpus";
