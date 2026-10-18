// @ts-check
// Textos da detecção de xray.

/** @typedef {import("../sistemas/xray.js").AlertaXray} AlertaXray */
import { formatarData } from "../core/util.js";

/**
 * @param {string} nome
 * @param {number} minerios
 * @param {number} blocos
 * @param {number} minutos
 * @param {string} onde
 */
export const AVISO_STAFF = (nome, minerios, blocos, minutos, onde) =>
  `§6[Xray?] §f${nome} §7quebrou §e${minerios} §7minérios raros em §e${blocos} §7blocos (últimos ${minutos} min) em §f${onde}§7. Pode ser só sorte: confira antes de punir.`;
export const TITULO = "Alerta de xray";
export const BOTAO_ALERTAS = "Ver alertas";
export const BOTAO_CONFIG = "Ajustar a detecção";
export const CORPO = "§7Só avisa a staff, não pune nem muda blocos. Conta diamante, esmeralda e detritos antigos em relação a todos os blocos quebrados.";
export const TITULO_ALERTAS = "Alertas de xray";
export const ALERTAS_VAZIO = "§7Nenhum alerta ainda.";
/** @param {AlertaXray} a */
export const LINHA_ALERTA = (a) =>
  `§8${formatarData(a.t)} ${new Date(a.t - 3 * 3600000).toISOString().slice(11, 16)} §f${a.n} §7${a.o} minérios/${a.b} blocos §8(${a.l})`;
