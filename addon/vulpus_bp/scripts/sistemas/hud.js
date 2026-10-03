// @ts-check
// HUD na actionbar (a cada 1 s): Caudas, coordenadas e direção. Pausa na contagem de teleporte.
import { system, world } from "@minecraft/server";
import { online } from "../core/jogadores.js";
import { emEspera } from "../core/teleporte.js";
import { direcao, registrarErro } from "../core/util.js";
import * as textos from "../textos/hud.js";
import { hudLigada } from "./ajustes.js";
import { saldo } from "./caudas.js";

/** @typedef {import("@minecraft/server").Player} Player */

const TICKS_POR_SEGUNDO = 20;
const TICKS_HUD = TICKS_POR_SEGUNDO;
/** Quanto tempo o "+N" fica aparecendo depois que o saldo muda. */
const TICKS_MUDANCA = 60;

/** @type {Map<string, number>} id → último saldo mostrado */
const ultimoSaldo = new Map();
/** @type {Map<string, { valor: number, ate: number }>} id → mudança de saldo em destaque */
const mudancas = new Map();
/** @type {Map<string, number>} id → tick até quando a HUD fica quieta */
const pausas = new Map();

/**
 * Deixa a actionbar livre por um tempo (para outro aviso aparecer sem a HUD cobrir).
 * @param {Player} player
 * @param {number} segundos
 */
export function pausarHud(player, segundos) {
  pausas.set(player.id, system.currentTick + Math.max(0, segundos) * TICKS_POR_SEGUNDO);
}

/**
 * Mudança de saldo desde a última HUD, somada enquanto o destaque estiver valendo.
 * @param {Player} player
 * @param {number} caudas
 */
function mudancaRecente(player, caudas) {
  const antes = ultimoSaldo.get(player.id);
  ultimoSaldo.set(player.id, caudas);
  const atual = mudancas.get(player.id);
  const vigente = atual && atual.ate > system.currentTick ? atual.valor : 0;
  if (antes !== undefined && caudas !== antes) {
    const valor = vigente + caudas - antes;
    mudancas.set(player.id, { valor, ate: system.currentTick + TICKS_MUDANCA });
    return valor;
  }
  if (!vigente) mudancas.delete(player.id);
  return vigente;
}

/** @param {Player} player */
function mostrarHud(player) {
  const caudas = saldo(player);
  const mudanca = mudancaRecente(player, caudas);
  if (!hudLigada(player) || emEspera(player)) return;
  const pausa = pausas.get(player.id);
  if (pausa !== undefined) {
    if (pausa > system.currentTick) return;
    pausas.delete(player.id);
  }
  const { x, y, z } = player.location;
  const texto = textos.LINHA({ caudas, mudanca, x, y, z, direcao: direcao(player.getRotation().y) });
  player.onScreenDisplay.setActionBar(texto);
}

system.runInterval(() => {
  for (const player of online()) {
    try {
      mostrarHud(player);
    } catch (e) {
      registrarErro(`HUD de ${player.name}`, e);
    }
  }
}, TICKS_HUD);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ultimoSaldo.delete(playerId);
  mudancas.delete(playerId);
  pausas.delete(playerId);
});
