// @ts-check
// Textos do RTP e do portal de saída do lobby.

export const DESTINO = "Mundo aberto";
export const CMD_RTP = "Te leva para um lugar aleatório do mundo aberto";
export const CMD_DEFINIRPORTAL = "Marca o portal de saída do lobby onde você está (staff)";
export const CMD_REMOVERPORTAL = "Remove o portal de saída do lobby (staff)";

export const JA_PROCURANDO = "Calma, raposinha! Já estou te levando.";
export const EM_COMBATE = "No meio da briga não dá! Termina a luta antes.";
export const NA_DIMENSAO = "O RTP só funciona no mundo comum (Overworld). Volta pra lá primeiro!";

export const SAINDO_TITULO = "§bSaindo do lobby";
export const SAINDO_SUB = "§7Segura firme nas caudas!";
/** @param {string} barra */
export const DECOLANDO = (barra) => `§bDecolando §8» ${barra}`;
export const CANCELADO_DANO = "Ai! Você levou dano, então cancelei a saída.";
export const CANCELADO_COMBATE = "No meio da briga não dá de sair do lobby!";

/**
 * @param {string} coords
 * @param {number} raio
 */
export const PORTAL_DEFINIDO = (coords, raio) => `§aPortal de saída marcado em §e${coords}§a (raio ${raio}).`;
export const PORTAL_REMOVIDO = "§aPortal de saída removido.";
export const PORTAL_INEXISTENTE = "Não existe portal de saída marcado.";

/** Texto flutuante em cima do portal (duas linhas). */
export const PORTAL_TEXTO = "§6§l✦ PORTAL DO MUNDO ABERTO ✦\n§7Pise aqui para sair do lobby\n§e/vulpus:rtp §7a qualquer hora";

export const PREPARANDO = "§eProcurando um lugar seguro... §7os chunks estão carregando";

/** @param {number} blocos */
export const QUEDA = (blocos) => `§6Altitude §8» §e${blocos} blocos §8| §7caindo devagar, protegida pelas caudas`;

/** @param {number} raio */
export const PORTAL_RAIO = (raio) => `§aRaio do portal agora é de §e${raio}§a blocos.`;
