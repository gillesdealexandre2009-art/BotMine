// @ts-check
// Textos do TPA. Os de erro já saem em §c (§e destaca e §c volta à cor).

export const TITULO = "TPA";
/** @param {number} segundos */
export const INTRO = (segundos) => `Viaje até alguém ou chame alguém até você.\n§7Pedidos valem por ${segundos}s.`;
/**
 * @param {string} nome
 * @param {number} segundos
 */
export const MEU_PEDIDO = (nome, segundos) => `§7Seu pedido para §6${nome}§7 vence em §e${segundos}s§7.`;
export const BLOQUEADO_AVISO = "§7Você está com os pedidos bloqueados (veja Ajustes).";

// Botões
export const IR = "Ir até alguém";
export const TRAZER = "Chamar alguém até mim";
/** @param {number} n */
export const RECEBIDOS = (n) => `Pedidos recebidos (${n})`;
export const CANCELAR = "Cancelar meu pedido";

// Escolher jogador
export const TITULO_IR = "Ir até alguém";
export const TITULO_TRAZER = "Chamar até mim";
export const ESCOLHA = "Escolha quem vai receber o pedido:";
export const NINGUEM = "Só tem você por aqui agora. Chama a galera!";
/** @param {string} nome */
export const JOGADOR_BLOQUEADO = (nome) => `${nome}\n§7não aceita TPA agora`;

// Pedidos recebidos
export const TITULO_RECEBIDOS = "Pedidos recebidos";
export const SEM_RECEBIDOS_TEXTO = "Nenhum pedido por enquanto.";
export const VARIOS_RECEBIDOS = "Você tem mais de um pedido. Escolha qual responder:";
/**
 * @param {string} nome
 * @param {boolean} vemAte  true = a pessoa quer vir até você
 * @param {number} segundos
 */
export const BOTAO_PEDIDO = (nome, vemAte, segundos) =>
  `${nome}\n§7${vemAte ? "quer vir até você" : "te chama até lá"} • ${segundos}s`;
/**
 * @param {string} nome
 * @param {boolean} vemAte
 */
export const DETALHE_PEDIDO = (nome, vemAte) =>
  vemAte ? `§6${nome}§r quer vir até você.` : `§6${nome}§r quer que você vá até lá.`;
export const ACEITAR = "Aceitar";
export const RECUSAR = "Recusar";

// Avisos para quem recebe
/**
 * @param {string} nome
 * @param {boolean} vemAte
 * @param {number} segundos
 */
export const CHEGOU_PEDIDO = (nome, vemAte, segundos) =>
  `§6${nome}§r ${vemAte ? "quer vir até você" : "te chama até lá"}! ` +
  `Aceite no menu ou com §e/vulpus:tpaceitar§r (recuse com §e/vulpus:tpanegar§r). Vale por ${segundos}s.`;
/** @param {string} nome */
export const BARRA_PEDIDO = (nome) => `§6» §fPedido de TPA de §e${nome}§f • §e/vulpus:tpaceitar §6«`;

// Erros
export const PARA_SI = "Pedir TPA para você mesmo? Nem minhas caudas fazem esse truque.";
/** @param {string} nome */
export const ALVO_BLOQUEADO = (nome) => `§e${nome}§c não está aceitando pedidos de TPA agora.`;
/** @param {string} nome */
export const DUPLICADO = (nome) => `Você já mandou esse pedido para §e${nome}§c. Espera a resposta!`;
/** @param {string} nome */
export const JA_TEM_PEDIDO = (nome) => `Você já tem um pedido esperando §e${nome}§c. Cancele no menu TPA para mandar outro.`;
export const SEM_PEDIDOS = "Você não tem pedidos de TPA pendentes.";
/** @param {string} nome */
export const SEM_PEDIDO_DE = (nome) => `Não tenho pedido de §e${nome}§c para você.`;
export const NAO_VALE_MAIS = "Esse pedido não vale mais (venceu ou foi cancelado).";
/** @param {string} nome */
export const ALVO_SAIU = (nome) => `§e${nome}§c saiu do jogo, então o pedido caiu.`;
/** @param {string} nome */
export const NAO_PODE_VIAJAR = (nome) => `§e${nome}§c não pode viajar agora. O pedido continua valendo.`;
export const SEM_PEDIDO_ENVIADO = "Você não tem pedido enviado para cancelar.";

// Respostas
/**
 * @param {string} nome
 * @param {number} segundos
 */
export const ENVIADO = (nome, segundos) => `§aPedido enviado para §6${nome}§a. Vale por ${segundos}s.`;
/** @param {string} nome */
export const ACEITO = (nome) => `§aVocê aceitou o pedido de §6${nome}§a.`;
/** @param {string} nome */
export const ACEITOU_SEU = (nome) => `§a§6${nome}§a aceitou seu pedido!`;
/** @param {string} nome */
export const RECUSADO = (nome) => `§7Você recusou o pedido de §6${nome}§7.`;
/** @param {string} nome */
export const RECUSOU_SEU = (nome) => `§e${nome}§7 recusou seu pedido.`;
/** @param {string} nome */
export const CANCELADO = (nome) => `§7Pedido para §6${nome}§7 cancelado.`;
/** @param {string} nome */
export const CANCELOU_SEU = (nome) => `§e${nome}§7 cancelou o pedido de TPA.`;
/** @param {string} nome */
export const EXPIROU = (nome) => `§7Seu pedido para §6${nome}§7 venceu sem resposta.`;
/** @param {string} nome */
export const SAIU_DO_JOGO = (nome) => `§e${nome}§7 saiu do jogo; o pedido de TPA caiu.`;

export const CMD_TPA = "Pede para ir até alguém";
export const CMD_TPAQUI = "Pede para alguém vir até você";
export const CMD_TPACEITAR = "Aceita um pedido de TPA";
export const CMD_TPANEGAR = "Recusa um pedido de TPA";
