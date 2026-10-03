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

/**
 * @param {{ nome: string, online: boolean, caudas: number, tempo: number, primeira: number,
 *   sequencia: number, mortes: number, casas: number, limiteCasas: number }} info
 */
export const CORPO = (info) =>
  [
    `§6${info.nome} ${info.online ? "§a• online" : "§8• offline"}`,
    "",
    `§7Caudas: §6${formatarNumero(info.caudas)}`,
    `§7Tempo de jogo: §f${formatarTempo(info.tempo)}`,
    `§7Primeira entrada: §f${info.primeira ? formatarData(info.primeira) : "ainda não"}`,
    `§7Diária: §f${info.sequencia} ${info.sequencia === 1 ? "dia seguido" : "dias seguidos"}`,
    `§7Mortes: §f${formatarNumero(info.mortes)}`,
    `§7Casas: §f${info.casas}/${info.limiteCasas}`,
  ].join("\n");
