// @ts-check
// Barreira do mundo: no overworld, ninguém passa de limiteMundo blocos do centro (0, 0) em X ou Z.
// Perto da borda a pessoa recebe um aviso; passando dela, é devolvida para dentro. A staff é livre.
import { Player, system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, registrarErro } from "../core/util.js";
import * as textos from "../textos/limite.js";
import { online } from "../core/jogadores.js";

const OVERWORLD = "minecraft:overworld";
const PASSO = 10;
/** Distância da borda em que o aviso começa. */
const AVISO = 100;
/** Para onde a pessoa volta: um pouco antes da borda, para não ficar travada nela. */
const RECUO = 8;
/** Mínimo entre dois avisos de "chegou na borda", em ticks. */
const INTERVALO_AVISO = 40;

/** @type {Map<string, number>} id → tick do último aviso */
const avisos = new Map();

/**
 * @param {Player} player
 * @param {number} limite
 */
function conferir(player, limite) {
  const { x, y, z } = player.location;
  const alto = Math.max(Math.abs(x), Math.abs(z));
  if (alto < limite - AVISO) return;
  const agora = system.currentTick;
  if (alto <= limite) {
    if (agora - (avisos.get(player.id) ?? -INTERVALO_AVISO) >= INTERVALO_AVISO) {
      avisos.set(player.id, agora);
      player.onScreenDisplay.setActionBar(textos.PERTO(Math.max(0, Math.round(limite - alto))));
    }
    return;
  }
  const dentro = limite - RECUO;
  player.teleport(
    { x: Math.max(-dentro, Math.min(dentro, x)), y, z: Math.max(-dentro, Math.min(dentro, z)) },
    { checkForBlocks: false, keepVelocity: false },
  );
  erro(player, textos.BARREIRA);
}

system.runInterval(() => {
  try {
    const limite = config().limiteMundo;
    for (const player of online()) {
      if (player.dimension.id !== OVERWORLD || ehStaff(player)) continue;
      conferir(player, limite);
    }
  } catch (e) {
    registrarErro("Barreira do mundo", e);
  }
}, PASSO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => avisos.delete(playerId));
