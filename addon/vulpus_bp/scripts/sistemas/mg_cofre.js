// @ts-check
// Guarda-volumes dos minigames: ao entrar, tudo o que a pessoa leva (inventário, armadura, mão secundária) vai para dois baús
// reais da sala de cofres e o XP é anotado; ao sair, volta. Baú guarda o item inteiro (encantamentos, nome, dados), e os baús
// sobrevivem a reinício. Cada pessoa tem uma marca gravada no mundo ("tem coisas guardadas"): se o jogo ou o servidor cair,
// a devolução acontece na próxima entrada. Nada é apagado do jogador antes de a cópia ser conferida.
import { EquipmentSlot, world, system } from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import { registrarErro } from "../core/util.js";
import { CAPACIDADE, posCofre } from "./mg_arena.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/**
 * @typedef {object} Guarda
 * @property {number} i  vaga do cofre (-1 = ainda nada guardado)
 * @property {{ x: number, y: number, z: number, d: string, rx: number, ry: number }} ret  de onde a pessoa saiu
 * @property {number} xp  XP total que ela tinha
 * @property {string} modo  modo de jogo que ela tinha
 */

const PREFIXO = "vulpus:mg:g:";
const CH_REG = "vulpus:mg:cofres";
/** Ordem dos equipamentos dentro do segundo baú, a partir do espaço 9. */
const EQUIPS = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];
const DIM_ID = "vulpus:minigames";

/** @type {Map<string, Guarda>} */
const cache = new Map();

/** @param {string} id @returns {Guarda | undefined} */
export function guardaDe(id) {
  if (cache.has(id)) return cache.get(id);
  const v = /** @type {any} */ (lerMundo(PREFIXO + id, undefined));
  if (!v || typeof v.i !== "number" || !v.ret || typeof v.ret.d !== "string") return undefined;
  const g = { i: v.i, ret: v.ret, xp: Number(v.xp) || 0, modo: typeof v.modo === "string" ? v.modo : "Survival" };
  cache.set(id, g);
  return g;
}

/** @param {string} id @param {Guarda | undefined} g */
function gravarGuarda(id, g) {
  if (g) cache.set(id, g);
  else cache.delete(id);
  salvarMundo(PREFIXO + id, g);
}

/** Vagas em uso: id da pessoa → vaga. @returns {Record<string, number>} */
function registroVagas() {
  const r = /** @type {any} */ (lerMundo(CH_REG, {}));
  /** @type {Record<string, number>} */
  const ok = {};
  for (const [id, i] of Object.entries(r?.usados ?? {})) if (Number.isInteger(i) && /** @type {number} */ (i) >= 0 && /** @type {number} */ (i) < CAPACIDADE) ok[id] = /** @type {number} */ (i);
  return ok;
}

/** @param {Record<string, number>} usados */
function gravarVagas(usados) {
  salvarMundo(CH_REG, { usados });
}

export const vagasEmUso = () => Object.keys(registroVagas()).length;

/** Quem tem coisas guardadas ou uma saída pendente (ids). */
export function idsComGuarda() {
  return world.getDynamicPropertyIds().filter((k) => k.startsWith(PREFIXO)).map((k) => k.slice(PREFIXO.length));
}

/**
 * Marca que a pessoa está indo para os minigames (ainda nada guardado) e de onde ela veio.
 * @param {Player} player
 */
export function iniciarTransicao(player) {
  const l = player.location;
  const r = player.getRotation();
  gravarGuarda(player.id, {
    i: -1,
    ret: { x: l.x, y: l.y, z: l.z, d: player.dimension.id, rx: r.x, ry: r.y },
    xp: 0,
    modo: String(player.getGameMode()),
  });
}

/** @param {Dimension} dim @param {{ x: number, y: number, z: number }} pos */
function containerEm(dim, pos) {
  const b = dim.getBlock(pos);
  if (!b || b.typeId !== "minecraft:chest") return undefined;
  return b.getComponent("minecraft:inventory")?.container;
}

/** @param {{ typeId: string, amount: number } | undefined} a @param {{ typeId: string, amount: number } | undefined} b */
const mesmo = (a, b) => (!a && !b) || (!!a && !!b && a.typeId === b.typeId && a.amount === b.amount);

/**
 * Passa tudo da pessoa para o cofre e limpa o inventário. Confere a cópia antes de apagar.
 * @param {Player} player
 * @returns {{ ok: boolean, motivo?: string }}
 */
export function guardarItens(player) {
  const dim = world.getDimension(DIM_ID);
  const g = guardaDe(player.id);
  if (!g) return { ok: false, motivo: "sem registro de saída" };
  if (g.i >= 0) return { ok: true };
  const usados = registroVagas();
  const ocupadas = new Set(Object.values(usados));
  let idx = -1;
  for (let i = 0; i < CAPACIDADE; i++) {
    if (ocupadas.has(i)) continue;
    const { a, b } = posCofre(i);
    const ca = containerEm(dim, a), cb = containerEm(dim, b);
    if (!ca || !cb) continue;
    // só serve um cofre vazio (nunca mistura com coisa de outra pessoa)
    if (ca.emptySlotsCount !== ca.size || cb.emptySlotsCount !== cb.size) continue;
    idx = i;
    break;
  }
  if (idx < 0) return { ok: false, motivo: "sem cofre livre" };
  const { a, b } = posCofre(idx);
  const ca = /** @type {import("@minecraft/server").Container} */ (containerEm(dim, a));
  const cb = /** @type {import("@minecraft/server").Container} */ (containerEm(dim, b));
  const inv = player.getComponent("minecraft:inventory")?.container;
  const eq = player.getComponent("minecraft:equippable");
  if (!inv) return { ok: false, motivo: "sem inventário" };
  try {
    for (let s = 0; s < 36; s++) {
      const it = inv.getItem(s);
      if (!it) continue;
      if (s < 27) ca.setItem(s, it);
      else cb.setItem(s - 27, it);
    }
    EQUIPS.forEach((slot, k) => {
      const it = eq?.getEquipment(slot);
      if (it) cb.setItem(9 + k, it);
    });
    // confere o que foi copiado
    for (let s = 0; s < 36; s++) {
      const copia = s < 27 ? ca.getItem(s) : cb.getItem(s - 27);
      if (!mesmo(inv.getItem(s), copia)) throw new Error(`espaço ${s} não conferiu`);
    }
    EQUIPS.forEach((slot, k) => {
      if (!mesmo(eq?.getEquipment(slot), cb.getItem(9 + k))) throw new Error(`equipamento ${k} não conferiu`);
    });
  } catch (e) {
    registrarErro("Minigames: guardar itens", e);
    for (let s = 0; s < 27; s++) ca.setItem(s, undefined);
    for (let s = 0; s < 27; s++) cb.setItem(s, undefined);
    return { ok: false, motivo: "a cópia não conferiu" };
  }
  // cópia conferida: agora sim limpa a pessoa
  inv.clearAll();
  for (const slot of EQUIPS) eq?.setEquipment(slot, undefined);
  // o cliente às vezes continua mostrando a armadura e o escudo depois de tirados: limpa de novo daqui a pouco (só equipamento,
  // para não apagar os itens do hub que a pessoa já recebeu)
  for (const t of [10, 40, 100]) {
    system.runTimeout(() => {
      try {
        if (!player.isValid || guardaDe(player.id)?.i !== idx) return;
        const e2 = player.getComponent("minecraft:equippable");
        for (const slot of EQUIPS) if (e2?.getEquipment(slot)) e2.setEquipment(slot, undefined);
      } catch {
        // saiu na hora
      }
    }, t);
  }
  g.xp = typeof player.getTotalXp === "function" ? player.getTotalXp() : 0;
  g.i = idx;
  usados[player.id] = idx;
  gravarVagas(usados);
  gravarGuarda(player.id, g);
  try {
    player.resetLevel();
  } catch {
    // sem XP para zerar
  }
  return { ok: true };
}

/**
 * Devolve tudo ao jogador (a pessoa precisa estar perto do hub, com a sala de cofres carregada) e libera a vaga.
 * @param {Player} player
 * @returns {{ ok: boolean, motivo?: string }}
 */
export function devolverItens(player) {
  const g = guardaDe(player.id);
  if (!g) return { ok: true };
  if (g.i < 0) return { ok: true };
  const dim = world.getDimension(DIM_ID);
  const { a, b } = posCofre(g.i);
  const ca = containerEm(dim, a), cb = containerEm(dim, b);
  if (!ca || !cb) return { ok: false, motivo: "a sala de cofres não está carregada" };
  const inv = player.getComponent("minecraft:inventory")?.container;
  const eq = player.getComponent("minecraft:equippable");
  if (!inv) return { ok: false, motivo: "sem inventário" };
  // o que sobrou do kit sai antes
  inv.clearAll();
  for (const slot of EQUIPS) eq?.setEquipment(slot, undefined);
  for (let s = 0; s < 36; s++) {
    const it = s < 27 ? ca.getItem(s) : cb.getItem(s - 27);
    if (it) inv.setItem(s, it);
  }
  EQUIPS.forEach((slot, k) => {
    const it = cb.getItem(9 + k);
    if (it) eq?.setEquipment(slot, it);
  });
  try {
    player.resetLevel();
    if (g.xp > 0) player.addExperience(g.xp);
  } catch {
    // sem XP para devolver
  }
  for (let s = 0; s < 27; s++) ca.setItem(s, undefined);
  for (let s = 0; s < 27; s++) cb.setItem(s, undefined);
  const usados = registroVagas();
  delete usados[player.id];
  gravarVagas(usados);
  g.i = -1;
  gravarGuarda(player.id, g);
  return { ok: true };
}

/** Apaga a marca da pessoa (depois de ela ter voltado). @param {string} id */
export function limparGuarda(id) {
  gravarGuarda(id, undefined);
}
