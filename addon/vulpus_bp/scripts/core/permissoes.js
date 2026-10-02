// @ts-check
import { CommandPermissionLevel, PlayerPermissionLevel } from "@minecraft/server";
import { TAG_STAFF } from "../config.js";

/**
 * Staff = operador, nível de comando de operador ou a tag vulpus:staff.
 * Pode ser chamada em modo restrito (só lê propriedades).
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean}
 */
export function ehStaff(player) {
  try {
    return (
      player.playerPermissionLevel === PlayerPermissionLevel.Operator ||
      player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors ||
      player.hasTag(TAG_STAFF)
    );
  } catch {
    return false;
  }
}
