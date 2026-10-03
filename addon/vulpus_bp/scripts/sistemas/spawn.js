// @ts-check
// Spawn do servidor: o que a staff marcou ou, sem isso, o spawn padrão do mundo.
import { world } from "@minecraft/server";
import { CHAVE_SPAWN } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { ehStaff } from "../core/permissoes.js";
import { localDe, teleportar } from "../core/teleporte.js";
import { erro, formatarCoords, nomeDimensao, ok, registrarErro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/spawn.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/teleporte.js").Local} Local */

/** O jogo devolve esse y quando o spawn padrão ainda não tem altura definida. */
const Y_INDEFINIDO = 32767;

/**
 * Confere o formato do que veio do mundo (pode ter sido editado à mão).
 * @param {any} valor
 * @returns {valor is Local}
 */
function ehLocal(valor) {
  return (
    !!valor &&
    typeof valor.d === "string" &&
    [valor.x, valor.y, valor.z].every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

/**
 * Spawn padrão do overworld. Sem altura definida, usa o bloco mais alto (precisa do chunk carregado).
 * @returns {Local | undefined}
 */
function spawnPadrao() {
  try {
    const { x, y, z } = world.getDefaultSpawnLocation();
    const d = "minecraft:overworld";
    if (y < Y_INDEFINIDO) return { x: x + 0.5, y, z: z + 0.5, d };
    const topo = world.getDimension(d).getTopmostBlock({ x, z });
    return topo ? { x: x + 0.5, y: topo.location.y + 1, z: z + 0.5, d } : undefined;
  } catch (e) {
    registrarErro("Spawn padrão", e);
    return undefined;
  }
}

/**
 * Spawn em vigor: o salvo pela staff ou o padrão do mundo.
 * @returns {Local | undefined}
 */
function localSpawn() {
  const salvo = lerMundo(CHAVE_SPAWN);
  return ehLocal(salvo) ? salvo : spawnPadrao();
}

/**
 * Teleporta para o spawn (com as regras de teleporte).
 * @param {Player} player
 */
export function irSpawn(player) {
  const destino = localSpawn();
  if (!destino) {
    erro(player, textos.SEM_SPAWN);
    return;
  }
  teleportar(player, destino, { nome: textos.DESTINO });
}

/**
 * Marca o spawn onde o jogador está (posição, dimensão e rotação). Só staff.
 * @param {Player} player
 */
export function definirSpawn(player) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const local = localDe(player);
  salvarMundo(CHAVE_SPAWN, local);
  ok(player, textos.DEFINIDO(formatarCoords(local), nomeDimensao(local.d)));
}

registrarComando({ nome: "spawn", descricao: textos.CMD_SPAWN }, (p) => irSpawn(p));
registrarComando({ nome: "definirspawn", descricao: textos.CMD_DEFINIRSPAWN, staff: true }, (p) => definirSpawn(p));
