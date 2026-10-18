// @ts-check
// Quem deu dano em cada inimigo da masmorra, e quando: só quem participou do abate recebe o crédito (Caudas, loot, quests). Ficar
// parado perto de quem luta não vale. Módulo pequeno, sem dependências do resto da masmorra, para o laço da masmorra e as quests usarem.
import { Player, system, world } from "@minecraft/server";
import { config } from "../core/db.js";

/** @type {Map<string, Map<string, number>>} id do inimigo → (id da pessoa → tick do último golpe) */
const golpes = new Map();

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource }) => {
  try {
    if (!hurtEntity.typeId.startsWith("vulpus:m_")) return;
    const quem = damageSource.damagingEntity;
    if (!(quem instanceof Player)) return;
    let m = golpes.get(hurtEntity.id);
    if (!m) golpes.set(hurtEntity.id, (m = new Map()));
    m.set(quem.id, system.currentTick);
  } catch {
    // sem registro: o abate só não rende crédito a ninguém por golpe
  }
});

/**
 * Quem participou do abate: bateu no inimigo há pouco tempo (masmCreditoSeg) e estava a até masmRaioCredito blocos quando ele morreu.
 * O registro do inimigo some logo depois.
 * @param {string} inimigoId
 * @param {{ x: number, y: number, z: number }} local
 * @param {import("@minecraft/server").Dimension} dim
 * @returns {Player[]}
 */
export function participantes(inimigoId, local, dim) {
  const m = golpes.get(inimigoId);
  // o registro só some um instante depois: a masmorra e as quests perguntam no mesmo tick
  system.runTimeout(() => golpes.delete(inimigoId), 2);
  if (!m) return [];
  const cfg = config();
  const limite = system.currentTick - cfg.masmCreditoSeg * 20;
  const raio = cfg.masmRaioCredito;
  return dim
    .getPlayers({ location: local, maxDistance: raio })
    .filter((p) => m.has(p.id) && /** @type {number} */ (m.get(p.id)) >= limite && Math.hypot(p.location.x - local.x, p.location.y - local.y, p.location.z - local.z) <= raio);
}

// inimigos que sumiram sem morrer (despawn) não deixam registro para sempre
system.runInterval(() => {
  const limite = system.currentTick - 20 * 300;
  for (const [id, m] of golpes) {
    for (const [p, t] of m) if (t < limite) m.delete(p);
    if (!m.size) golpes.delete(id);
  }
}, 20 * 60);
