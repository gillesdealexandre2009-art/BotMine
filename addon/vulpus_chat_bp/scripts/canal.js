// @ts-check
// Leitura do canal que o pack principal escreve (docs/spec/03_spec_fase2.md §8.5). Só lê, nunca escreve.
import { world } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").ScoreboardObjective} ScoreboardObjective */

/** Versão do formato do canal que este pack entende. */
const VERSAO_CANAL = 1;
const TAG_KITSUNE = "vulpus:kitsune";
const NIVEL_MAXIMO = 1000;
const RANK_MAXIMO = 4;
const CARGO_MAXIMO = 3;

/** @typedef {{ nivel: number, rank: number, cargo: number, kitsune: boolean }} Identidade */

/**
 * Score do participante, ou undefined se ele ainda não tem score (o jogo lança
 * "Failed to resolve identity" em vez de devolver undefined).
 * @param {ScoreboardObjective | undefined} objective
 * @param {Player | string} participante
 */
function lerScore(objective, participante) {
  try {
    return objective?.getScore(participante);
  } catch {
    return undefined;
  }
}

/**
 * Score inteiro do jogador no objective, limitado a 0..maximo. Sem objective ou sem score dá 0.
 * @param {ScoreboardObjective | undefined} objective
 * @param {Player} player
 * @param {number} maximo
 */
function scoreDe(objective, player, maximo) {
  const valor = lerScore(objective, player);
  if (typeof valor !== "number" || !Number.isInteger(valor)) return 0;
  return Math.min(maximo, Math.max(0, valor));
}

/**
 * Identidade do jogador pelo canal, ou undefined se o canal não existe ou está noutra versão
 * (aí o chat fica vanilla). Jogador ainda sem score: nível 0, rank 0, sem cargo.
 * @param {Player} player
 * @returns {Identidade | undefined}
 */
export function lerIdentidade(player) {
  const scoreboard = world.scoreboard;
  const canal = scoreboard.getObjective("vulpus_canal");
  if (!canal || lerScore(canal, "#versao") !== VERSAO_CANAL) return undefined;
  return {
    nivel: scoreDe(scoreboard.getObjective("vulpus_nivel"), player, NIVEL_MAXIMO),
    rank: scoreDe(scoreboard.getObjective("vulpus_rank"), player, RANK_MAXIMO),
    cargo: scoreDe(scoreboard.getObjective("vulpus_cargo"), player, CARGO_MAXIMO),
    kitsune: player.hasTag(TAG_KITSUNE),
  };
}
