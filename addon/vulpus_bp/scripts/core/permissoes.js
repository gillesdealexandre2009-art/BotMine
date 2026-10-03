// @ts-check
import { CommandPermissionLevel, PlayerPermissionLevel } from "@minecraft/server";
import { TAG_ADMIN, TAG_STAFF } from "../config.js";

/**
 * Staff = operador, nível de comando de operador ou as tags vulpus:staff e vulpus:admin.
 * Helper (vulpus:helper) é só selo e não conta.
 * Pode ser chamada em modo restrito (só lê propriedades).
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean}
 */
export function ehStaff(player) {
  try {
    return (
      player.playerPermissionLevel === PlayerPermissionLevel.Operator ||
      player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors ||
      player.hasTag(TAG_STAFF) ||
      player.hasTag(TAG_ADMIN)
    );
  } catch {
    return false;
  }
}
