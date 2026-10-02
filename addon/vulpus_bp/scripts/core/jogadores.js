// @ts-check
import { world } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * Jogadores online (só os válidos).
 * @returns {Player[]}
 */
export function online() {
  return world.getAllPlayers().filter((p) => p.isValid);
}

/**
 * Jogador online pelo nome, sem diferenciar maiúsculas (aceita "@Nome" e "\"Nome\"").
 * @param {string} nome
 * @returns {Player | undefined}
 */
export function porNome(nome) {
  const procurado = nome.trim().replace(/^@/, "").replace(/^"(.*)"$/, "$1").toLowerCase();
  return online().find((p) => p.name.toLowerCase() === procurado);
}

/**
 * Todos online, menos o próprio jogador.
 * @param {Player} player
 * @returns {Player[]}
 */
export function outros(player) {
  return online().filter((p) => p.id !== player.id);
}

/**
 * @param {string} id
 * @returns {Player | undefined}
 */
export function porId(id) {
  return online().find((p) => p.id === id);
}
