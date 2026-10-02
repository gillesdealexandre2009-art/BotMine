// @ts-check
// Formatação (tempo, datas de Brasília, coordenadas) e mensagens da Kiza.
import { SONS } from "../config.js";
import { ERRO_INTERNO, PREFIXO } from "../textos/geral.js";
import { dadosJogador } from "./db.js";

/** @typedef {import("@minecraft/server").Player} Player */

const DIA_MS = 24 * 60 * 60 * 1000;
/** Brasília em UTC−3 fixo (sem horário de verão). */
const FUSO_BRASILIA_MS = -3 * 60 * 60 * 1000;
const DIRECOES = ["S", "SO", "O", "NO", "N", "NE", "L", "SE"];
/** @type {Record<string, string>} */
const DIMENSOES = { "minecraft:overworld": "Mundo normal", "minecraft:nether": "Nether", "minecraft:the_end": "End" };

/** @param {number} n */
const doisDigitos = (n) => String(n).padStart(2, "0");

/**
 * "45s", "12min" ou "2h 05min".
 * @param {number} segundos
 */
export function formatarTempo(segundos) {
  const total = Math.max(0, Math.floor(segundos));
  if (total < 60) return `${total}s`;
  const minutos = Math.floor(total / 60);
  if (minutos < 60) return `${minutos}min`;
  return `${Math.floor(minutos / 60)}h ${doisDigitos(minutos % 60)}min`;
}

/**
 * Data em Brasília: "02/10/2026".
 * @param {number} ms
 */
export function formatarData(ms) {
  const data = new Date(ms + FUSO_BRASILIA_MS);
  return `${doisDigitos(data.getUTCDate())}/${doisDigitos(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
}

/**
 * Dia em Brasília: "2026-10-02" (a diária vira à meia-noite de lá).
 * @param {number} ms
 */
export function diaBrasilia(ms) {
  return new Date(ms + FUSO_BRASILIA_MS).toISOString().slice(0, 10);
}

/**
 * "2026-10-02" → "2026-10-01". Texto fora do formato devolve "".
 * @param {string} dia
 */
export function diaAnterior(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return "";
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d) - DIA_MS).toISOString().slice(0, 10);
}

/**
 * Milissegundos até a próxima meia-noite de Brasília.
 * @param {number} ms
 */
export function msAteMeiaNoiteBrasilia(ms) {
  const local = ms + FUSO_BRASILIA_MS;
  return DIA_MS - (((local % DIA_MS) + DIA_MS) % DIA_MS);
}

/**
 * Direção para onde o jogador olha, a partir do yaw (0 = sul, 90 = oeste, 180 = norte, -90 = leste).
 * @param {number} yaw
 * @returns {string} "N", "NE", "L", "SE", "S", "SO", "O" ou "NO"
 */
export function direcao(yaw) {
  return DIRECOES[Math.round((((yaw % 360) + 360) % 360) / 45) % 8];
}

/**
 * "Mundo normal", "Nether" ou "End" (aceita o id com ou sem "minecraft:").
 * @param {string} id
 */
export function nomeDimensao(id) {
  return DIMENSOES[id.includes(":") ? id : `minecraft:${id}`] ?? id;
}

/**
 * Coordenadas de bloco: "120, 64, -30".
 * @param {{ x: number, y: number, z: number }} pos
 */
export function formatarCoords({ x, y, z }) {
  return `${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`;
}

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 */
export function limitar(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Inteiro com ponto de milhar: 1234 → "1.234".
 * @param {number} n
 */
export function formatarNumero(n) {
  const inteiro = Math.round(n);
  const digitos = String(Math.abs(inteiro)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return inteiro < 0 ? `-${digitos}` : digitos;
}

/**
 * Mensagem da Kiza no chat (com o PREFIXO).
 * @param {Player | undefined} player
 * @param {string} texto
 */
export function msg(player, texto) {
  if (!player?.isValid) return;
  player.sendMessage(PREFIXO + texto);
}

/**
 * Mensagem de sucesso, com o som "ok".
 * @param {Player | undefined} player
 * @param {string} texto
 */
export function ok(player, texto) {
  msg(player, texto);
  som(player, SONS.ok);
}

/**
 * Mensagem de erro em §c, com o som de erro.
 * @param {Player | undefined} player
 * @param {string} texto
 */
export function erro(player, texto) {
  msg(player, `§c${texto}`);
  som(player, SONS.erro);
}

/**
 * Som só para o jogador. Fica mudo se ele desligou os sons em Ajustes.
 * @param {Player | undefined} player
 * @param {string} id
 */
export function som(player, id) {
  if (!player?.isValid || !dadosJogador(player).ajustes.sons) return;
  try {
    player.playSound(id);
  } catch (e) {
    registrarErro(`Som ${id}`, e);
  }
}

/**
 * Escreve um erro no Content Log com o prefixo [Vulpus].
 * @param {string} contexto
 * @param {unknown} e
 */
export function registrarErro(contexto, e) {
  const pilha = e instanceof Error && e.stack ? `\n${e.stack}` : "";
  console.warn(`[Vulpus] ${contexto}: ${e}${pilha}`);
}

/**
 * Roda fn(player) sem deixar erro escapar (inclusive de função async): o jogador recebe
 * ERRO_INTERNO e o erro vai para o log.
 * @param {Player} player
 * @param {string} contexto  aparece no log
 * @param {(p: Player) => any} fn
 */
export function rodarSeguro(player, contexto, fn) {
  /** @param {unknown} e */
  const falhou = (e) => {
    registrarErro(contexto, e);
    erro(player, ERRO_INTERNO);
  };
  try {
    const resultado = fn(player);
    if (resultado instanceof Promise) resultado.catch(falhou);
  } catch (e) {
    falhou(e);
  }
}
