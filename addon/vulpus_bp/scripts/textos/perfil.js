// @ts-check
// Textos do Perfil.
import { formatarData, formatarNumero, formatarTempo } from "../core/util.js";

export const TITULO = "Perfil";
/** @param {string} nome */
export const TITULO_DE = (nome) => `Perfil de ${nome}`;
export const TITULO_OUTROS = "Ver outro jogador";
export const BOTAO_OUTRO = "Ver outro jogador";
export const SO_VOCE = "§7Só você na toca agora. Chama a galera!";
export const ESCOLHA = "§7Quem você quer espiar?";
export const DESC_PERFIL = "Mostra o seu perfil (ou o de alguém online)";

/** @typedef {import("../sistemas/niveis.js").Rank} Rank */
/** @typedef {import("../sistemas/identidade.js").InfoCargo} InfoCargo */

/**
 * @param {{ nome: string, online: boolean, selo: string, rank: Rank, nivel: number, xpNoNivel: number,
 *   xpParaProximo: number, cargo: InfoCargo | null, kitsune: boolean, caudas: number, tempo: number,
 *   primeira: number, sequencia: number, mortes: number, casas: number, limiteCasas: number }} info
 */
export const CORPO = (info) =>
  [
    `§6${info.nome} ${info.online ? "§a• online" : "§8• offline"}`,
    "",
    `${info.selo} ${info.rank.cor}${info.rank.nome}`,
    `§7Nível §f${formatarNumero(info.nivel)} §8• §f${formatarNumero(info.xpNoNivel)}§7/${formatarNumero(info.xpParaProximo)} XP`,
    ...(info.cargo ? [`§7Cargo: ${info.cargo.cor}${info.cargo.nome}`] : []),
    ...(info.kitsune ? ["§dKitsune: §7apoia a toca no Discord"] : []),
    "",
    `§7Caudas: §6${formatarNumero(info.caudas)}`,
    `§7Tempo de jogo: §f${formatarTempo(info.tempo)}`,
    `§7Primeira entrada: §f${info.primeira ? formatarData(info.primeira) : "ainda não"}`,
    `§7Diária: §f${info.sequencia} ${info.sequencia === 1 ? "dia seguido" : "dias seguidos"}`,
    `§7Mortes: §f${formatarNumero(info.mortes)}`,
    `§7Casas: §f${info.casas}/${info.limiteCasas}`,
  ].join("\n");
