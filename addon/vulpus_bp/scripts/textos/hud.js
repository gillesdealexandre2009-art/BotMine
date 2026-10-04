// @ts-check
// Linhas do scoreboard lateral (o título VULPUS é imagem do RP e não vai aqui).
import { formatarNumero, limitar } from "../core/util.js";
import { barra, G, glyph } from "../glyphs.js";

/** @typedef {import("../sistemas/niveis.js").Rank} Rank */
/** @typedef {import("../sistemas/identidade.js").InfoCargo} InfoCargo */

/**
 * @typedef {object} InfoSidebar
 * @property {string | null} nome  nome já pintado (só com apelido ou tema Kitsune; null = sem a linha)
 * @property {{ emblema: string, tag: string, nome: string } | null} cla  tag já pintada; null = sem a linha
 * @property {{ ativa: boolean, nossos: number, deles: number, tagDeles: string, minutos: number } | null} guerra
 * @property {Rank} rank
 * @property {InfoCargo | null} cargo  Admin, Staff ou Helper; null = sem cargo
 * @property {boolean} kitsune  selo Kitsune (booster)
 * @property {number} nivel
 * @property {number} fracao  progresso no nível, 0..1
 * @property {number} caudas
 * @property {number} mudanca  ganho (ou perda) recente de Caudas; 0 = nada em destaque
 * @property {number} online
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} direcao  "N", "NE"...
 */

/**
 * "+5" verde ou "-5" vermelho; vazio sem mudança.
 * @param {number} mudanca
 */
const DESTAQUE = (mudanca) =>
  mudanca > 0 ? ` §a+${formatarNumero(mudanca)}` : mudanca < 0 ? ` §c${formatarNumero(mudanca)}` : "";

/**
 * Selo Kitsune no fim da primeira linha; vazio sem ele.
 * @param {boolean} kitsune
 */
const KITSUNE = (kitsune) => (kitsune ? ` ${glyph(G.KITSUNE)}` : "");

/** Nome do clã cortado para a linha caber em 28 caracteres visíveis. */
const NOME_CLA_MAX = 16;

/**
 * Linha do clã: emblema, [TAG] e o nome (cortado).
 * @param {{ emblema: string, tag: string, nome: string }} cla
 */
const LINHA_CLA = (cla) =>
  `${glyph(cla.emblema)} §8[${cla.tag}§8] §f${[...cla.nome].length > NOME_CLA_MAX ? `${[...cla.nome].slice(0, NOME_CLA_MAX - 2).join("")}..` : cla.nome}`;

/**
 * Linha da guerra: placar quando valendo, ou quanto falta para começar.
 * @param {{ ativa: boolean, nossos: number, deles: number, tagDeles: string, minutos: number }} g
 */
const LINHA_GUERRA = (g) =>
  g.ativa
    ? `${glyph(G.GUERRA)} §cGUERRA §f${g.nossos} §7x §f${g.deles} §8[§7${g.tagDeles}§8]`
    : `${glyph(G.GUERRA)} §eGuerra em ${g.minutos}min §8[§7${g.tagDeles}§8]`;

/**
 * As linhas da sidebar (até 28 caracteres visíveis cada): 6 fixas, mais nome Kitsune e cargo em cima e
 * clã e guerra embaixo (até 10).
 * @param {InfoSidebar} info
 * @returns {string[]}
 */
export const LINHAS = ({ nome, cla, guerra, rank, cargo, kitsune, nivel, fracao, caudas, mudanca, online, x, y, z, direcao }) => [
  ...(nome ? [nome] : []),
  ...(cargo ? [`${glyph(cargo.glyph)} ${cargo.cor}${cargo.nome}${KITSUNE(kitsune)}`] : []),
  `${glyph(rank.glyph)} ${rank.cor}${rank.nome}${cargo ? "" : KITSUNE(kitsune)}`,
  `§7Nível §f${formatarNumero(nivel)} §8• §7${Math.floor(limitar(fracao, 0, 1) * 100)}%`,
  barra(fracao, 10),
  `${glyph(G.CAUDAS)} §6${formatarNumero(caudas)}${DESTAQUE(mudanca)}`,
  `${glyph(G.ONLINE)} §f${formatarNumero(online)} §7online`,
  `${glyph(G.LOCAL)} §f${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} §7${direcao}`,
  ...(cla ? [LINHA_CLA(cla)] : []),
  ...(guerra ? [LINHA_GUERRA(guerra)] : []),
];
