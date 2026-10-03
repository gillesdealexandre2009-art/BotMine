// @ts-check
// Títulos normais (fora da sidebar). O slot de title é um só: enquanto um título normal está na
// tela, o jogador fica "ocupado" e a sidebar não envia nada, para não cortar.
import { system, world } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").TitleDisplayOptions} TitleDisplayOptions */

const ENTRADA_PADRAO = 10;
const FICA_PADRAO = 70;
const SAIDA_PADRAO = 20;

/** @type {Map<string, number>} id → tick em que o título normal sai da tela */
const ocupados = new Map();

/**
 * @param {number | undefined} valor
 * @param {number} padrao
 */
const ticks = (valor, padrao) => Math.max(0, Math.floor(valor ?? padrao));

/**
 * Título "normal" (não sidebar). Marca o jogador como ocupado até entrada+fica+saída (ticks),
 * para a sidebar não cortar. Todo título do addon passa por aqui.
 * @param {Player} player
 * @param {string} titulo
 * @param {{ subtitulo?: string, entrada?: number, fica?: number, saida?: number }} [opcoes]  padrão 10/70/20
 */
export function mostrarTitulo(player, titulo, opcoes = {}) {
  if (!player.isValid) return;
  /** @type {TitleDisplayOptions} */
  const tempos = {
    fadeInDuration: ticks(opcoes.entrada, ENTRADA_PADRAO),
    stayDuration: ticks(opcoes.fica, FICA_PADRAO),
    fadeOutDuration: ticks(opcoes.saida, SAIDA_PADRAO),
  };
  if (opcoes.subtitulo !== undefined) tempos.subtitle = opcoes.subtitulo;
  player.onScreenDisplay.setTitle(titulo, tempos);
  // Um título novo substitui o anterior na tela, então o fim é sempre o dele.
  ocupados.set(player.id, system.currentTick + tempos.fadeInDuration + tempos.stayDuration + tempos.fadeOutDuration);
}

/**
 * Se nenhum título normal está na tela.
 * @param {Player} player
 * @returns {boolean}
 */
export function tituloLivre(player) {
  const fim = ocupados.get(player.id);
  if (fim === undefined) return true;
  if (fim > system.currentTick) return false;
  ocupados.delete(player.id);
  return true;
}

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ocupados.delete(playerId);
});
