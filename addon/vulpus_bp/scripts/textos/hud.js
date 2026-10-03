// @ts-check
// Linhas do scoreboard lateral (o título VULPUS é imagem do RP e não vai aqui).
import { formatarNumero, limitar } from "../core/util.js";
import { barra, G, glyph } from "../glyphs.js";

/** @typedef {import("../sistemas/niveis.js").Rank} Rank */

/**
 * @typedef {object} InfoSidebar
 * @property {Rank} rank
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
 * As 6 linhas da sidebar (até 28 caracteres visíveis cada).
 * @param {InfoSidebar} info
 * @returns {string[]}
 */
export const LINHAS = ({ rank, nivel, fracao, caudas, mudanca, online, x, y, z, direcao }) => [
  `${glyph(rank.glyph)} ${rank.cor}${rank.nome}`,
  `§7Nível §f${formatarNumero(nivel)} §8• §7${Math.floor(limitar(fracao, 0, 1) * 100)}%`,
  barra(fracao, 10),
  `${glyph(G.CAUDAS)} §6${formatarNumero(caudas)}${DESTAQUE(mudanca)}`,
  `${glyph(G.ONLINE)} §f${formatarNumero(online)} §7online`,
  `${glyph(G.LOCAL)} §f${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} §7${direcao}`,
];
