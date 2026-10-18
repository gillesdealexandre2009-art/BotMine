// @ts-check
// Textos da Torre da Vulpus (desafio de parkour: sobe do início até a casinha do topo).

/**
 * @param {string[]} linhas  ranking já formatado
 * @param {number} caudas
 */
export const TITULO_FLUTUANTE = (linhas, caudas) =>
  ["§6§lTORRE DA VULPUS", "§7Chegue na casinha do topo!", `§7Prêmio: §e${caudas} Caudas §7e XP`, "", "§eMelhores tempos", ...(linhas.length ? linhas : ["§8ninguém chegou ainda"])].join("\n");
/** @param {number} pos @param {string} nome @param {string} tempo */
export const LINHA_RANKING = (pos, nome, tempo) => `§f${pos}. §7${nome} §8- §a${tempo}`;

/** @param {string} tempo @param {number} pct */
export const BARRA = (tempo, pct) => `§6Torre §f${tempo} §8| §7altura §e${pct}%`;
export const BARRA_PRONTO = "§6Torre: §fsuba até a casinha do topo!";
export const CAIU = "§cVocê caiu da torre! Volte ao início para tentar de novo.";
export const ANULADA = "§cSubida anulada: na torre vale só subir no braço (sem voar, teleportar ou modo criativo).";
export const LONGE = "§7Você se afastou da torre; a subida foi cancelada.";
export const COMECOU = "§eSubida começou! O tempo está correndo.";

/** @param {string} tempo */
export const TITULO_CHEGADA = (tempo) => `§6§lVOCÊ CHEGOU!`;
/** @param {string} tempo */
export const SUB_CHEGADA = (tempo) => `§7tempo: §a${tempo}`;
/** @param {string} tempo @param {boolean} recorde */
export const MSG_TEMPO = (tempo, recorde) => `§aVocê chegou ao topo em §e${tempo}§a${recorde ? " §d(novo recorde pessoal!)" : ""}.`;
/** @param {number} caudas @param {number} xp @param {number} primeira @param {number} recorde */
export const MSG_PREMIO = (caudas, xp, primeira, recorde) =>
  `§aPrêmio: §e+${caudas} Caudas §ae §b+${xp} XP${primeira > 0 ? ` §6(inclui bônus de primeira vez: +${primeira})` : ""}${recorde > 0 ? ` §d(bônus de recorde: +${recorde})` : ""}§a.`;
/** @param {number} min */
export const SEM_PREMIO_ESPERA = (min) => `§7Sem prêmio desta vez: espere mais ${min} min entre prêmios.`;
export const SEM_PREMIO_DIA = "§7Sem prêmio desta vez: você já recebeu o máximo de prêmios da torre hoje. O tempo conta para o ranking.";
export const SEM_PREMIO_RAPIDO = "§7Tempo muito curto para valer prêmio. O tempo não foi registrado.";
/** @param {string} nome @param {string} tempo */
export const AVISO_RECORDE = (nome, tempo) => `§6${nome} §etomou o topo do ranking da Torre: §a${tempo}§e!`;
export const FECHADA = "A Torre da Vulpus está fechada no momento.";

// painel da staff
export const TITULO_STAFF = "Torre da Vulpus (staff)";
export const BOTAO_STAFF = "Torre da Vulpus";
export const BOTAO_INICIO = "Marcar o início (onde você está pisando)";
export const BOTAO_CHEGADA = "Marcar a chegada (onde você está pisando, na casinha)";
export const BOTAO_CONFIG = "Configurações da Torre";
export const BOTAO_ZERAR = "Zerar o ranking e os prêmios";
export const BOTAO_REMOVER = "Remover a Torre";
export const CONFIRMAR_ZERAR = "Apagar todos os tempos e histórico de prêmios da torre?";
export const CONFIRMAR_REMOVER = "Remover início, chegada e texto da torre? (o ranking é mantido)";
/** @param {string} onde */
export const INICIO_MARCADO = (onde) => `§aInício da torre marcado em §e${onde}§a. Quem sair daqui e subir começa a contar.`;
/** @param {string} onde */
export const CHEGADA_MARCADA = (onde) => `§aChegada marcada em §e${onde}§a. Quem chegar a poucos blocos daqui, vindo do início, vence.`;
export const ZERADO = "§aRanking da torre zerado.";
export const REMOVIDA = "§aTorre removida.";
/** @param {{ inicio: boolean, chegada: boolean, subindo: number, chegadas: number }} e */
export const CORPO_STAFF = (e) =>
  [
    "§7Desafio: da marca de início até a de chegada (a casinha do topo). Cronômetro, ranking de tempos e prêmio com espera e limite por dia. Voar, teleportar ou modo criativo anulam a subida.",
    "",
    `§fInício: ${e.inicio ? "§amarcado" : "§cnão marcado"}`,
    `§fChegada: ${e.chegada ? "§amarcada" : "§cnão marcada"}`,
    `§fSubindo agora: §7${e.subindo}`,
    `§fChegadas registradas: §7${e.chegadas}`,
  ].join("\n");
