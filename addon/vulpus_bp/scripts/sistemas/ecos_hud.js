// @ts-check
// Dados do scoreboard dentro da dimensão do Ecos dos Ausentes (vulpus:ecos): área atual, tempo restante da janela, fragmentos e
// objetivos. Quem desenha o texto é textos/hud.js (LINHAS_ECOS) e quem envia é sistemas/hud.js. Cache por jogador, recalculado a cada
// 20 ticks (a região e o inventário não precisam ser lidos a cada ciclo do HUD).
import { system, world } from "@minecraft/server";
import { config, dadosJogador } from "../core/db.js";
import { OBJETIVOS, TOTAL_FRAGMENTOS } from "../textos/ecos_docs.js";
import { estadoEcos, ITEM_FRAGMENTO } from "./ecos.js";
import { naDimensao, regiaoDoJogador } from "./ecos_dimensao.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../textos/hud.js").InfoEcos} InfoEcos */

const TICKS_CACHE = 20;
/** @type {Map<string, { tick: number, area: string, bolsa: number }>} */
const cache = new Map();

/** Quantos fragmentos de alma há no inventário. @param {Player} player */
function fragmentosNaBolsa(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && it.typeId === ITEM_FRAGMENTO) n += it.amount;
  }
  return n;
}

/**
 * Informações da sidebar do Ecos; null fora da dimensão.
 * @param {Player} player
 * @returns {InfoEcos | null}
 */
export function infoEcosHud(player) {
  if (!naDimensao(player)) {
    cache.delete(player.id);
    return null;
  }
  const agora = system.currentTick;
  let c = cache.get(player.id);
  if (!c || agora - c.tick >= TICKS_CACHE) {
    c = { tick: agora, area: regiaoDoJogador(player)?.nome ?? "", bolsa: fragmentosNaBolsa(player) };
    cache.set(player.id, c);
  }
  const d = dadosJogador(player).ecos;
  return {
    area: c.area,
    restanteMs: estadoEcos() === "aberto" ? Math.max(0, config().ecosFim - Date.now()) : null,
    fragmentos: d.frag,
    totalFragmentos: TOTAL_FRAGMENTOS,
    bolsa: c.bolsa,
    objetivos: d.feitos.length,
    totalObjetivos: OBJETIVOS.length,
  };
}

world.afterEvents.playerLeave.subscribe(({ playerId }) => cache.delete(playerId));
