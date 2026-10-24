// @ts-check
// Equipamento permanente "Ecos dos Ausentes": varinha Lamento (raio espectral) e bônus do conjunto completo "Passo dos Ausentes"
// (sem dano de queda e um brilho discreto). Os itens em si são data-driven (vulpus_bp/items, recipes) e continuam existindo e valendo
// no leilão mesmo com o evento desligado: aqui só ficam as habilidades, que a staff liga/desliga em ecosEquipLigado.
import { EntityDamageCause, EquipmentSlot, GameMode, system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { online, TAG_SUMIDO } from "../core/jogadores.js";
import { msg, registrarErro } from "../core/util.js";
import * as textos from "../textos/ecos_equip.js";
import { emMinigame } from "./mg_estado.js";
import * as telecinese from "./ecos_telecinese.js";
import * as textosTele from "../textos/ecos_telecinese.js";

/** @typedef {import("@minecraft/server").Player} Player */

export const ITEM_FRAGMENTO = "vulpus:fragmento_alma";
export const ITEM_VARINHA = "vulpus:varinha_lamento";
export const PECAS = {
  [EquipmentSlot.Head]: "vulpus:ausente_helmet",
  [EquipmentSlot.Chest]: "vulpus:ausente_chestplate",
  [EquipmentSlot.Legs]: "vulpus:ausente_leggings",
  [EquipmentSlot.Feet]: "vulpus:ausente_boots",
};
/** Dimensão do evento, onde a varinha vale mesmo sendo "vulpus:*". */
const DIM_ECOS = "vulpus:ecos";
export const ALCANCE = 20;
/** De quantos em quantos ticks o brilho do conjunto é conferido (nada roda a cada tick). */
const VARREDURA_TICKS = 40;
/** Entidades que o raio ignora (nem tudo que existe no mundo é "mob"). */
const IGNORAR = ["minecraft:item", "minecraft:xp_orb", "minecraft:armor_stand", "minecraft:npc", "minecraft:painting", "minecraft:arrow", "minecraft:boat"];

/** Último tick de uso da varinha por jogador. @type {Map<string, number>} */
const ultimoUso = new Map();
/** Último tick em que o uso da varinha foi tratado (itemUse e itemStartUse chegam juntos). @type {Map<string, number>} */
const ultimoClique = new Map();
const PROP_MODO = "vulpus:varinha_modo";

/** @param {Player} p */
const forDoJogoNormal = (p) => {
  const dim = p.dimension.id;
  return !(dim.startsWith("vulpus:") && dim !== DIM_ECOS);
};

/** @param {Player} p */
const ausente = (p) => p.hasTag(TAG_SUMIDO) || p.getGameMode() === GameMode.Spectator;

/**
 * O conjunto completo está vestido?
 * @param {Player} p
 */
export function temConjunto(p) {
  const eq = p.getComponent("minecraft:equippable");
  if (!eq) return false;
  for (const [slot, id] of Object.entries(PECAS)) if (eq.getEquipment(/** @type {any} */ (slot))?.typeId !== id) return false;
  return true;
}

/** O bônus vale para esta pessoa agora? @param {Player} p */
function bonusAtivo(p) {
  const c = config();
  return c.ecosEquipLigado && c.ecosBonusConjunto && !ausente(p) && !emMinigame(p) && forDoJogoNormal(p) && temConjunto(p);
}

/**
 * Dispara o raio da varinha. Devolve true se o raio saiu.
 * @param {Player} p
 * @returns {boolean}
 */
export function usarVarinha(p) {
  const c = config();
  if (!c.ecosEquipLigado || ausente(p)) return false;
  if (emMinigame(p)) {
    msg(p, textos.MINIGAME);
    return false;
  }
  if (!forDoJogoNormal(p)) {
    msg(p, textos.DIMENSAO);
    return false;
  }
  const agora = system.currentTick;
  const espera = Math.round(c.ecosVaraRecargaSeg * 20);
  const ultimo = ultimoUso.get(p.id);
  if (ultimo !== undefined && agora >= ultimo && agora - ultimo < espera) {
    p.onScreenDisplay.setActionBar(textos.RECARGA(Math.ceil((espera - (agora - ultimo)) / 20)));
    return false;
  }
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  if (!eq || item?.typeId !== ITEM_VARINHA) return false;
  ultimoUso.set(p.id, agora);

  const origem = p.getHeadLocation();
  const dir = p.getViewDirection();
  const dim = p.dimension;
  /** @type {{ entity: import("@minecraft/server").Entity, distance: number } | undefined} */
  let alvo;
  let sohJogador = false;
  try {
    for (const h of p.getEntitiesFromViewDirection({ maxDistance: ALCANCE, excludeTypes: IGNORAR })) {
      const t = h.entity.typeId;
      if (!h.entity.isValid) continue;
      if (t === "minecraft:player" && !c.ecosVaraPvp) {
        sohJogador = true;
        continue;
      }
      if (t.startsWith("vulpus:") && !t.startsWith("vulpus:ecos_")) continue;
      alvo = h;
      break;
    }
  } catch (e) {
    registrarErro("Ecos: raio da varinha", e);
  }
  const alcance = alvo ? alvo.distance : ALCANCE;
  try {
    for (let d = 1.5; d <= alcance; d += 1) {
      dim.spawnParticle("minecraft:endrod", { x: origem.x + dir.x * d, y: origem.y - 0.15 + dir.y * d, z: origem.z + dir.z * d });
    }
    dim.playSound("mob.vex.charge", origem, { volume: 0.8, pitch: 1.4 });
  } catch (e) {
    registrarErro("Ecos: efeitos da varinha", e);
  }
  if (!alvo) p.onScreenDisplay.setActionBar(sohJogador ? textos.SO_JOGADOR : textos.SEM_ALVO);
  if (alvo) {
    try {
      alvo.entity.applyDamage(c.ecosVaraDano, { cause: EntityDamageCause.magic, damagingEntity: p });
      const l = alvo.entity.location;
      dim.spawnParticle("minecraft:basic_crit_particle", { x: l.x, y: l.y + 1, z: l.z });
    } catch (e) {
      registrarErro("Ecos: dano da varinha", e);
    }
  }
  telecinese.gastarVarinha(p);
  return true;
}

/** Modo da varinha (0 = raio, 1 = telecinese de entidades, 2 = de blocos), guardado em cada jogador. @param {Player} p */
export function modoVarinha(p) {
  const m = p.getDynamicProperty(PROP_MODO);
  return m === 1 || m === 2 ? m : 0;
}

/** Passa para o próximo modo e mostra na actionbar. @param {Player} p */
export function alternarModo(p) {
  const proximo = (modoVarinha(p) + 1) % 3;
  p.setDynamicProperty(PROP_MODO, proximo);
  p.onScreenDisplay.setActionBar(textosTele.MODO(proximo));
  p.playSound("random.click");
  return proximo;
}

/**
 * Uso da varinha (clique direito ou começo do segurar): agachado troca de modo; senão faz o que o modo manda.
 * @param {Player} p
 */
export function usarVarinhaPorModo(p) {
  const agora = system.currentTick;
  if (ultimoClique.get(p.id) === agora) return;
  ultimoClique.set(p.id, agora);
  if (ausente(p)) return;
  if (p.isSneaking) {
    alternarModo(p);
    return;
  }
  const modo = modoVarinha(p);
  if (modo === 0) usarVarinha(p);
  else if (config().ecosEquipLigado && !emMinigame(p) && forDoJogoNormal(p)) telecinese.iniciarSegurar(p, modo);
}

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
  try {
    if (itemStack?.typeId !== ITEM_VARINHA || source?.typeId !== "minecraft:player") return;
    usarVarinhaPorModo(source);
  } catch (e) {
    registrarErro("Ecos: uso da varinha", e);
  }
});

// Sem dano de queda com o conjunto completo (só confere a roupa quando a queda acontece de verdade).
world.afterEvents.itemStartUse.subscribe(({ source, itemStack }) => {
  try {
    if (itemStack?.typeId !== ITEM_VARINHA || source?.typeId !== "minecraft:player") return;
    usarVarinhaPorModo(source);
  } catch (e) {
    registrarErro("Ecos: começo do uso da varinha", e);
  }
});

world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    if (ev.damageSource.cause !== EntityDamageCause.fall) return;
    const p = ev.hurtEntity;
    if (p.typeId !== "minecraft:player") return;
    if (bonusAtivo(/** @type {Player} */ (p))) ev.cancel = true;
  } catch (e) {
    registrarErro("Ecos: queda do conjunto", e);
  }
});

// Brilho discreto de quem veste o conjunto completo, a cada 2 s; desligado, não toca em ninguém.
system.runInterval(() => {
  try {
    if (!config().ecosEquipLigado || !config().ecosBonusConjunto) return;
    for (const p of online()) {
      if (!p.isValid || !bonusAtivo(p)) continue;
      const l = p.location;
      p.dimension.spawnParticle("minecraft:endrod", { x: l.x + (Math.random() - 0.5) * 0.8, y: l.y + 0.2 + Math.random() * 1.4, z: l.z + (Math.random() - 0.5) * 0.8 });
    }
  } catch (e) {
    registrarErro("Ecos: brilho do conjunto", e);
  }
}, VARREDURA_TICKS);

world.afterEvents.playerLeave.subscribe(({ playerId }) => void ultimoUso.delete(playerId));
