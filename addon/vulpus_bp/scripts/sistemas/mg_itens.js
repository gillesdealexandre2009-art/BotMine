// @ts-check
// Itens dos minigames: criação com nome e encantamentos, os frascos (poções de mentira que dão efeito ao usar, porque a API não
// monta poções), as tabelas de loot do Skywars por nível e os utilitários de moeda do Bedwars (ferro, ouro, diamante, esmeralda).
import { EnchantmentType, ItemStack } from "@minecraft/server";
import { registrarErro } from "../core/util.js";

/** @typedef {{ id: string, min: number, max: number, peso: number, ench?: [string, number][], nome?: string, frasco?: string, especial?: string }} Entrada */
/** @typedef {{ id: string, qtd: number, ench?: [string, number][], nome?: string, frasco?: string, especial?: string }} Sorteado */
/** @typedef {"basico" | "normal" | "op"} TipoBau */
/** @typedef {"suprimento" | "equipamento" | "geral"} FaseBau */

/** Marca (na descrição) dos itens que são frascos. */
export const MARCA_FRASCO = "§8mgfrasco:";
/** Marca dos itens do hub. */
export const MARCA_HUB = "§8mghub:";

/**
 * Cria um item com nome e encantamentos (os que o item não aceitar são ignorados).
 * @param {string} id
 * @param {number} [qtd]
 * @param {{ nome?: string, lore?: string[], ench?: [string, number][] }} [op]
 */
export function criar(id, qtd = 1, op = {}) {
  const it = new ItemStack(id, qtd);
  if (op.nome) it.nameTag = op.nome;
  if (op.lore) it.setLore(op.lore);
  for (const [e, nivel] of op.ench ?? []) {
    try {
      it.getComponent("minecraft:enchantable")?.addEnchantment({ type: new EnchantmentType(e), level: nivel });
    } catch {
      // o item não aceita esse encantamento
    }
  }
  return it;
}

// ---------------------------------------------------------------- frascos
/** @type {Record<string, { nome: string, efeito: string, seg: number, amp: number, cor: string }>} */
export const FRASCOS = {
  velocidade: { nome: "Frasco de Velocidade", efeito: "speed", seg: 30, amp: 1, cor: "§b" },
  pulo: { nome: "Frasco de Pulo", efeito: "jump_boost", seg: 30, amp: 2, cor: "§a" },
  cura: { nome: "Frasco de Cura", efeito: "instant_health", seg: 1, amp: 1, cor: "§c" },
  forca: { nome: "Frasco de Força", efeito: "strength", seg: 20, amp: 0, cor: "§4" },
  invisivel: { nome: "Frasco de Invisibilidade", efeito: "invisibility", seg: 30, amp: 0, cor: "§7" },
  queda: { nome: "Frasco de Queda Lenta", efeito: "slow_falling", seg: 40, amp: 0, cor: "§f" },
  regeneracao: { nome: "Frasco de Regeneração", efeito: "regeneration", seg: 12, amp: 1, cor: "§d" },
  resistencia: { nome: "Frasco de Resistência", efeito: "resistance", seg: 15, amp: 0, cor: "§9" },
};

/** @param {string} chave */
export function frasco(chave) {
  const f = FRASCOS[chave];
  return criar("minecraft:glass_bottle", 1, { nome: `${f.cor}${f.nome}`, lore: [`${MARCA_FRASCO}${chave}`, "§7Use para beber."] });
}

/** A chave do frasco do item, ou undefined. @param {{ getLore?: () => string[] } | undefined} item */
export function chaveDoFrasco(item) {
  const l = item?.getLore?.().find((x) => x.startsWith(MARCA_FRASCO));
  return l ? l.slice(MARCA_FRASCO.length) : undefined;
}

/** Item do hub (votar, sair): trancado no inventário. @param {string} id @param {string} nome @param {string} chave */
export function itemDoHub(id, nome, chave) {
  const it = criar(id, 1, { nome, lore: [`${MARCA_HUB}${chave}`] });
  return it;
}

/** @param {{ getLore?: () => string[] } | undefined} item */
export function chaveDoHub(item) {
  const l = item?.getLore?.().find((x) => x.startsWith(MARCA_HUB));
  return l ? l.slice(MARCA_HUB.length) : undefined;
}

// ---------------------------------------------------------------- itens especiais
export const MARCA_ESPECIAL = "§8mgesp:";

/** @type {Record<string, { id: string, nome: string, desc: string, espera: number }>} */
export const ESPECIAIS = {
  salto: { id: "minecraft:feather", nome: "§bPena de Salto", desc: "Use para dar um impulso para frente e para cima.", espera: 40 },
  ponte: { id: "minecraft:blaze_rod", nome: "§eCajado da Ponte", desc: "Use para erguer uma ponte reta à sua frente (3 cargas).", espera: 20 },
  rastreador: { id: "minecraft:compass", nome: "§cRastreador", desc: "Use para ver a distância e a direção do inimigo mais perto.", espera: 20 },
  bola_fogo: { id: "minecraft:fire_charge", nome: "§6Bola de Fogo", desc: "Use para lançar uma bola de fogo: empurra e derruba blocos postos por jogadores.", espera: 16 },
};

/** Cria o item especial. @param {string} chave @param {number} [qtd] */
export function especial(chave, qtd = 1) {
  const e = ESPECIAIS[chave];
  return criar(e.id, qtd, { nome: e.nome, lore: [`${MARCA_ESPECIAL}${chave}`, `§7${e.desc}`] });
}

/** A chave do item especial, ou undefined. @param {{ getLore?: () => string[] } | undefined} item */
export function chaveEspecial(item) {
  const l = item?.getLore?.().find((x) => x.startsWith(MARCA_ESPECIAL));
  return l ? l.slice(MARCA_ESPECIAL.length) : undefined;
}

// ---------------------------------------------------------------- loot do Skywars
/** @type {Record<1 | 2 | 3 | 4, Entrada[]>} */
export const LOOT = {
  // ilhas de partida: o básico para começar
  1: [
    { id: "minecraft:oak_planks", min: 16, max: 32, peso: 4 },
    { id: "minecraft:cobblestone", min: 16, max: 32, peso: 4 },
    { id: "minecraft:white_wool", min: 12, max: 24, peso: 2 },
    { id: "minecraft:bread", min: 3, max: 6, peso: 3 },
    { id: "minecraft:cooked_chicken", min: 2, max: 4, peso: 2 },
    { id: "minecraft:apple", min: 2, max: 4, peso: 1 },
    { id: "minecraft:stone_sword", min: 1, max: 1, peso: 3 },
    { id: "minecraft:wooden_sword", min: 1, max: 1, peso: 2, ench: [["knockback", 1]] },
    { id: "minecraft:stone_axe", min: 1, max: 1, peso: 2 },
    { id: "minecraft:leather_helmet", min: 1, max: 1, peso: 2 },
    { id: "minecraft:leather_chestplate", min: 1, max: 1, peso: 2 },
    { id: "minecraft:chainmail_boots", min: 1, max: 1, peso: 2 },
    { id: "minecraft:golden_leggings", min: 1, max: 1, peso: 1 },
    { id: "minecraft:snowball", min: 8, max: 16, peso: 2 },
    { id: "minecraft:egg", min: 6, max: 12, peso: 1 },
    { id: "minecraft:web", min: 2, max: 4, peso: 2 },
    { id: "minecraft:fishing_rod", min: 1, max: 1, peso: 1 },
    { id: "minecraft:oak_log", min: 6, max: 12, peso: 2 },
    { id: "minecraft:stick", min: 1, max: 1, peso: 1, nome: "§eBastão do Empurrão", ench: [["knockback", 2]] },
  ],
  // ilhas do meio: equipamento de ferro, arco, itens de utilidade
  2: [
    { id: "minecraft:iron_sword", min: 1, max: 1, peso: 3 },
    { id: "minecraft:iron_sword", min: 1, max: 1, peso: 1, ench: [["sharpness", 1]] },
    { id: "minecraft:iron_helmet", min: 1, max: 1, peso: 2 },
    { id: "minecraft:iron_chestplate", min: 1, max: 1, peso: 2 },
    { id: "minecraft:iron_leggings", min: 1, max: 1, peso: 2 },
    { id: "minecraft:iron_boots", min: 1, max: 1, peso: 2 },
    { id: "minecraft:chainmail_chestplate", min: 1, max: 1, peso: 1, ench: [["protection", 1]] },
    { id: "minecraft:bow", min: 1, max: 1, peso: 2 },
    { id: "minecraft:bow", min: 1, max: 1, peso: 1, ench: [["punch", 1]] },
    { id: "minecraft:arrow", min: 12, max: 20, peso: 3 },
    { id: "minecraft:crossbow", min: 1, max: 1, peso: 1 },
    { id: "minecraft:shield", min: 1, max: 1, peso: 2 },
    { id: "minecraft:water_bucket", min: 1, max: 1, peso: 2 },
    { id: "minecraft:ender_pearl", min: 1, max: 1, peso: 2 },
    { id: "minecraft:golden_apple", min: 1, max: 2, peso: 2 },
    { id: "minecraft:cooked_beef", min: 5, max: 8, peso: 2 },
    { id: "minecraft:oak_planks", min: 24, max: 48, peso: 2 },
    { id: "minecraft:web", min: 3, max: 6, peso: 2 },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "velocidade" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "pulo" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "cura" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "queda" },
    { id: "minecraft:stick", min: 1, max: 1, peso: 1, nome: "§eBastão do Empurrão", ench: [["knockback", 2]] },
  ],
  // centro: o melhor equipamento, encantado, e os brinquedos de maluco
  3: [
    { id: "minecraft:diamond_sword", min: 1, max: 1, peso: 2 },
    { id: "minecraft:diamond_sword", min: 1, max: 1, peso: 1, ench: [["sharpness", 2], ["fire_aspect", 1]] },
    { id: "minecraft:diamond_helmet", min: 1, max: 1, peso: 1, ench: [["protection", 1]] },
    { id: "minecraft:diamond_chestplate", min: 1, max: 1, peso: 1, ench: [["protection", 1]] },
    { id: "minecraft:diamond_leggings", min: 1, max: 1, peso: 1 },
    { id: "minecraft:diamond_boots", min: 1, max: 1, peso: 1, ench: [["feather_falling", 2]] },
    { id: "minecraft:iron_chestplate", min: 1, max: 1, peso: 2, ench: [["protection", 2]] },
    { id: "minecraft:bow", min: 1, max: 1, peso: 2, ench: [["power", 2]] },
    { id: "minecraft:arrow", min: 16, max: 24, peso: 2 },
    { id: "minecraft:ender_pearl", min: 2, max: 3, peso: 2 },
    { id: "minecraft:golden_apple", min: 2, max: 3, peso: 2 },
    { id: "minecraft:enchanted_golden_apple", min: 1, max: 1, peso: 1 },
    { id: "minecraft:water_bucket", min: 1, max: 1, peso: 1 },
    { id: "minecraft:lava_bucket", min: 1, max: 1, peso: 1 },
    { id: "minecraft:tnt", min: 3, max: 6, peso: 2 },
    { id: "minecraft:flint_and_steel", min: 1, max: 1, peso: 1 },
    { id: "minecraft:cooked_beef", min: 8, max: 12, peso: 2 },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "forca" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "invisivel" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "regeneracao" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 1, frasco: "resistencia" },
    { id: "minecraft:elytra", min: 1, max: 1, peso: 1 },
    { id: "minecraft:totem_of_undying", min: 1, max: 1, peso: 1 },
  ],
  // baú lendário do centro da pirâmide: o melhor do mapa, uma vez por partida (não reabastece)
  4: [
    { id: "minecraft:diamond_sword", min: 1, max: 1, peso: 3, ench: [["sharpness", 3], ["fire_aspect", 1]] },
    { id: "minecraft:diamond_helmet", min: 1, max: 1, peso: 2, ench: [["protection", 3]] },
    { id: "minecraft:diamond_chestplate", min: 1, max: 1, peso: 2, ench: [["protection", 3]] },
    { id: "minecraft:diamond_leggings", min: 1, max: 1, peso: 2, ench: [["protection", 3]] },
    { id: "minecraft:diamond_boots", min: 1, max: 1, peso: 2, ench: [["protection", 3], ["feather_falling", 3]] },
    { id: "minecraft:bow", min: 1, max: 1, peso: 2, ench: [["power", 4], ["punch", 1], ["flame", 1]] },
    { id: "minecraft:arrow", min: 24, max: 32, peso: 2 },
    { id: "minecraft:ender_pearl", min: 3, max: 4, peso: 2 },
    { id: "minecraft:enchanted_golden_apple", min: 1, max: 2, peso: 2 },
    { id: "minecraft:golden_apple", min: 4, max: 6, peso: 2 },
    { id: "minecraft:totem_of_undying", min: 1, max: 1, peso: 2 },
    { id: "minecraft:elytra", min: 1, max: 1, peso: 1 },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 2, frasco: "forca" },
    { id: "minecraft:glass_bottle", min: 1, max: 1, peso: 2, frasco: "resistencia" },
  ],
};

/** Itens do modo Avançado: somam-se à tabela normal (a CubeCraft chama de "advanced"). Valem do nível 2 em diante; o nível 3 tem mais. */
/** @type {Record<2 | 3, Entrada[]>} */
export const LOOT_AVANCADO = {
  2: [
    { id: "minecraft:feather", min: 1, max: 2, peso: 2, especial: "salto" },
    { id: "minecraft:compass", min: 1, max: 1, peso: 2, especial: "rastreador" },
    { id: "minecraft:blaze_rod", min: 1, max: 1, peso: 1, especial: "ponte" },
    { id: "minecraft:fire_charge", min: 1, max: 2, peso: 1, especial: "bola_fogo" },
    { id: "minecraft:wind_charge", min: 3, max: 6, peso: 1 },
  ],
  3: [
    { id: "minecraft:feather", min: 2, max: 3, peso: 2, especial: "salto" },
    { id: "minecraft:blaze_rod", min: 1, max: 1, peso: 2, especial: "ponte" },
    { id: "minecraft:fire_charge", min: 2, max: 3, peso: 2, especial: "bola_fogo" },
    { id: "minecraft:compass", min: 1, max: 1, peso: 1, especial: "rastreador" },
    { id: "minecraft:wind_charge", min: 6, max: 10, peso: 2 },
    { id: "minecraft:trident", min: 1, max: 1, peso: 1, ench: [["loyalty", 1]] },
  ],
};

/** Peças de equipamento (o resto é suprimento: blocos, comida, projéteis, baldes). */
const EQUIPAMENTO = /sword|_axe|helmet|chestplate|leggings|boots|bow|crossbow|shield|trident|mace|totem|elytra|pearl/;
/** @param {Entrada} e */
const ehEquipamento = (e) => EQUIPAMENTO.test(e.id) || !!e.especial;

/** Itens diferentes por baú, por nível. */
export const ITENS_POR_BAU = { 1: 7, 2: 7, 3: 7, 4: 8 };

/**
 * Sorteia os itens de um baú, sem repetir a mesma entrada. O tipo de baú da votação mexe no nível (básico desce um, overpowered
 * sobe um e traz 2 itens a mais), o modo avançado soma os itens especiais e a fase do reabastecimento filtra o que sai.
 * @param {1 | 2 | 3 | 4} nivel
 * @param {() => number} rng
 * @param {{ tipo?: TipoBau, avancado?: boolean, fase?: FaseBau }} [op]
 * @returns {Sorteado[]}
 */
export function sortearBau(nivel, rng, op = {}) {
  const tipo = op.tipo ?? "normal";
  const efetivo = /** @type {1 | 2 | 3 | 4} */ (nivel === 4 ? 4 : Math.max(1, Math.min(3, nivel + (tipo === "basico" ? -1 : tipo === "op" ? 1 : 0))));
  let pool = [...LOOT[efetivo]];
  if (op.avancado && efetivo >= 2 && efetivo <= 3) pool.push(...LOOT_AVANCADO[/** @type {2 | 3} */ (efetivo)]);
  if (op.fase === "suprimento") pool = pool.filter((e) => !ehEquipamento(e));
  else if (op.fase === "equipamento") pool = pool.filter((e) => ehEquipamento(e));
  const quantos = ITENS_POR_BAU[efetivo] + (tipo === "op" && nivel !== 4 ? 2 : 0) - (tipo === "basico" && nivel !== 4 ? 1 : 0);
  /** @type {Sorteado[]} */
  const itens = [];
  for (let k = 0; k < quantos && pool.length; k++) {
    const total = pool.reduce((s, x) => s + x.peso, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].peso;
      if (r < 0) break;
    }
    const e = pool.splice(idx, 1)[0];
    itens.push({ id: e.id, qtd: e.min + Math.floor(rng() * (e.max - e.min + 1)), ench: e.ench, nome: e.nome, frasco: e.frasco, especial: e.especial });
  }
  return itens;
}

/** Cria o item sorteado. @param {Sorteado} s */
export function criarSorteado(s) {
  if (s.frasco) return frasco(s.frasco);
  if (s.especial) return especial(s.especial, s.qtd);
  return criar(s.id, s.qtd, { nome: s.nome, ench: s.ench });
}

// ---------------------------------------------------------------- moedas do Bedwars
export const MOEDAS = Object.freeze({
  ferro: { id: "minecraft:iron_ingot", nome: "Ferro", cor: "§f" },
  ouro: { id: "minecraft:gold_ingot", nome: "Ouro", cor: "§6" },
  diamante: { id: "minecraft:diamond", nome: "Diamante", cor: "§b" },
  esmeralda: { id: "minecraft:emerald", nome: "Esmeralda", cor: "§a" },
});

/** Quantos de um item a pessoa tem. @param {import("@minecraft/server").Player} p @param {string} id */
export function contar(p, id) {
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && it.typeId === id) n += it.amount;
  }
  return n;
}

/** Tira até `qtd` do item. Devolve quantos tirou. @param {import("@minecraft/server").Player} p @param {string} id @param {number} qtd */
export function retirar(p, id, qtd) {
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let falta = qtd;
  for (let i = 0; i < inv.size && falta > 0; i++) {
    const it = inv.getItem(i);
    if (!it || it.typeId !== id) continue;
    const tira = Math.min(falta, it.amount);
    if (tira === it.amount) inv.setItem(i, undefined);
    else {
      it.amount -= tira;
      inv.setItem(i, it);
    }
    falta -= tira;
  }
  return qtd - falta;
}

/** Dá o item (o que não couber cai aos pés). @param {import("@minecraft/server").Player} p @param {ItemStack} item */
export function dar(p, item) {
  try {
    const sobra = p.getComponent("minecraft:inventory")?.container?.addItem(item);
    if (sobra) p.dimension.spawnItem(sobra, p.location);
  } catch (e) {
    registrarErro("Minigames: dar item", e);
  }
}
