// @ts-check
// Pool de itens do Pillars of Fortune: o que cada jogador pode receber a cada rodada, com peso por raridade. Tudo aqui tem uso
// numa partida (blocos para construir, armas, armaduras, comida, projéteis, baldes, frascos e itens especiais).
import { criarSorteado } from "./mg_itens.js";

/** @typedef {import("./mg_itens.js").Entrada} Entrada */
/** @typedef {import("./mg_itens.js").Sorteado} Sorteado */

/**
 * O motor remove da dimensão toda entidade que não esteja em PERMITIDOS (mg_motor.js), e o projétil do Sopro de Vento e o foguete
 * de fogos ainda não estão lá. Enquanto não entrarem, esses itens ficariam mortos: só entram na pool com esta chave ligada.
 */
export const PROJETEIS_EXTRAS = true;

/** @type {Entrada[]} */
export const POOL = [];

/** @param {string} id @param {number} min @param {number} max @param {number} peso @param {Partial<Entrada>} [extra] */
const add = (id, min, max, peso, extra = {}) => void POOL.push({ id: id.includes(":") ? id : `minecraft:${id}`, min, max, peso, ...extra });

// ---------------------------------------------------------------- blocos
for (const m of ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry"]) add(`${m}_log`, 8, 16, 1.6);
for (const m of ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak"]) add(`${m}_planks`, 16, 32, 2.2);
for (const b of ["stone", "cobblestone", "stone_bricks", "andesite", "diorite", "granite", "deepslate", "sandstone", "red_sandstone", "brick_block", "netherrack", "end_stone", "blackstone", "prismarine"]) add(b, 16, 32, 1.8);
add("obsidian", 2, 4, 0.8);
add("glass", 12, 24, 1.6);
add("glass_pane", 12, 24, 0.6);
for (const c of ["white", "red", "blue", "green", "yellow", "black", "orange", "purple"]) add(`${c}_wool`, 12, 24, 1.2);
for (const c of ["white", "red", "blue", "cyan", "lime", "brown"]) add(`${c}_terracotta`, 12, 24, 0.9);
for (const c of ["white", "red", "blue", "magenta", "yellow", "gray"]) add(`${c}_concrete`, 12, 24, 0.9);
for (const [b, n, p] of [["iron_block", 2, 0.8], ["gold_block", 2, 0.7], ["copper_block", 3, 0.7], ["coal_block", 3, 0.7], ["lapis_block", 3, 0.6], ["redstone_block", 3, 0.6], ["diamond_block", 1, 0.3], ["emerald_block", 1, 0.3]]) add(String(b), Number(n), Number(n) + 2, Number(p));
add("hay_block", 4, 8, 1.2);
add("slime", 2, 4, 0.8);
add("tnt", 2, 5, 1.4);
add("scaffolding", 8, 16, 0.9);
add("ladder", 8, 16, 0.9);
add("web", 3, 6, 1.4);
add("bone_block", 8, 16, 0.6);
add("sea_lantern", 4, 8, 0.4);

// ---------------------------------------------------------------- ferramentas e armas
/** [material, peso] */
const MATERIAIS = /** @type {[string, number][]} */ ([["wooden", 3], ["stone", 3], ["golden", 2], ["iron", 2], ["diamond", 1], ["netherite", 0.35]]);
for (const [m, w] of MATERIAIS) {
  const nivel = m === "wooden" || m === "stone" ? 1 : m === "iron" || m === "golden" ? 2 : 3;
  add(`${m}_sword`, 1, 1, w);
  add(`${m}_sword`, 1, 1, w * 0.4, { ench: [["sharpness", nivel]] });
  add(`${m}_sword`, 1, 1, w * 0.3, { ench: [["knockback", 2]], nome: "§eEspada do Empurrão" });
  add(`${m}_axe`, 1, 1, w * 0.8);
  add(`${m}_axe`, 1, 1, w * 0.3, { ench: [["sharpness", nivel], ["efficiency", nivel]] });
  add(`${m}_pickaxe`, 1, 1, w * 0.7);
  add(`${m}_pickaxe`, 1, 1, w * 0.3, { ench: [["efficiency", nivel + 1]] });
  add(`${m}_shovel`, 1, 1, w * 0.5);
  add(`${m}_shovel`, 1, 1, w * 0.25, { ench: [["efficiency", nivel + 1]] });
}
add("stick", 1, 1, 1.2, { nome: "§eBastão do Empurrão", ench: [["knockback", 2]] });
add("stick", 1, 1, 0.5, { nome: "§6Bastão do Grande Empurrão", ench: [["knockback", 4]] });
add("trident", 1, 1, 0.5);
add("trident", 1, 1, 0.3, { ench: [["loyalty", 2]] });

// ---------------------------------------------------------------- armaduras
const PECAS = ["helmet", "chestplate", "leggings", "boots"];
for (const [m, w] of /** @type {[string, number][]} */ ([["leather", 2.5], ["chainmail", 1.8], ["golden", 1.6], ["iron", 1.6], ["diamond", 0.8], ["netherite", 0.3]])) {
  for (const pc of PECAS) {
    add(`${m}_${pc}`, 1, 1, w);
    add(`${m}_${pc}`, 1, 1, w * 0.4, { ench: [["protection", m === "leather" || m === "chainmail" ? 2 : 3]] });
  }
}
add("iron_boots", 1, 1, 0.5, { ench: [["feather_falling", 4]] });
add("diamond_boots", 1, 1, 0.3, { ench: [["feather_falling", 4], ["protection", 2]] });
add("iron_chestplate", 1, 1, 0.4, { ench: [["thorns", 2]] });
add("turtle_helmet", 1, 1, 0.5);
add("shield", 1, 1, 1.5);
add("totem_of_undying", 1, 1, 0.5);
add("elytra", 1, 1, 0.3);

// ---------------------------------------------------------------- comida
for (const [c, a, b, w] of /** @type {[string, number, number, number][]} */ ([
  ["bread", 3, 6, 2.5], ["cooked_beef", 3, 6, 2.5], ["cooked_porkchop", 3, 6, 2.2], ["cooked_chicken", 3, 6, 2], ["cooked_mutton", 3, 6, 1.6],
  ["cooked_salmon", 3, 6, 1.5], ["cooked_cod", 3, 6, 1.2], ["cooked_rabbit", 2, 4, 1], ["baked_potato", 4, 8, 1.5], ["apple", 2, 4, 1.8],
  ["golden_carrot", 3, 6, 1.4], ["pumpkin_pie", 2, 4, 1], ["cookie", 8, 16, 0.6], ["melon_slice", 6, 12, 0.6], ["sweet_berries", 6, 12, 0.5],
  ["dried_kelp", 8, 16, 0.4], ["honey_bottle", 1, 2, 0.7],
])) add(c, a, b, w);
add("golden_apple", 1, 2, 1.4);
add("enchanted_golden_apple", 1, 1, 0.35);
add("mushroom_stew", 1, 1, 0.8);
add("rabbit_stew", 1, 1, 0.6);
add("beetroot_soup", 1, 1, 0.6);

// ---------------------------------------------------------------- projéteis
add("snowball", 8, 16, 1.8);
add("egg", 6, 12, 1.2);
add("ender_pearl", 1, 2, 1.2);
add("bow", 1, 1, 1.5);
add("bow", 1, 1, 0.5, { ench: [["power", 2]] });
add("bow", 1, 1, 0.4, { ench: [["punch", 2]] });
add("bow", 1, 1, 0.3, { ench: [["flame", 1]] });
add("crossbow", 1, 1, 0.9);
add("crossbow", 1, 1, 0.3, { ench: [["quick_charge", 2]] });
add("arrow", 8, 16, 2);
add("fishing_rod", 1, 1, 1);
add("fishing_rod", 1, 1, 0.4, { ench: [["lure", 3]] });
if (PROJETEIS_EXTRAS) {
  add("wind_charge", 3, 6, 1);
  add("firework_rocket", 3, 6, 0.7);
}

// ---------------------------------------------------------------- baldes e utilidades
add("water_bucket", 1, 1, 1.5);
add("lava_bucket", 1, 1, 0.8);
add("powder_snow_bucket", 1, 1, 0.6);
add("flint_and_steel", 1, 1, 0.5);

// ---------------------------------------------------------------- frascos e especiais
for (const [f, w] of /** @type {[string, number][]} */ ([["velocidade", 1], ["pulo", 1], ["cura", 1.2], ["forca", 0.7], ["invisivel", 0.7], ["queda", 1], ["regeneracao", 0.9], ["resistencia", 0.7]])) {
  add("glass_bottle", 1, 1, w, { frasco: f });
}
add("feather", 1, 2, 1.4, { especial: "salto" });
add("blaze_rod", 1, 1, 0.9, { especial: "ponte" });
add("compass", 1, 1, 0.8, { especial: "rastreador" });
add("fire_charge", 1, 3, 1, { especial: "bola_fogo" });

/**
 * Sorteia um item da pool (peso por raridade).
 * @param {() => number} rng
 * @param {readonly Entrada[]} [pool]
 * @returns {Sorteado}
 */
export function sortearItem(rng, pool = POOL) {
  const total = pool.reduce((s, e) => s + e.peso, 0);
  let r = rng() * total;
  let e = pool[pool.length - 1];
  for (const x of pool) {
    r -= x.peso;
    if (r < 0) {
      e = x;
      break;
    }
  }
  return { id: e.id, qtd: e.min + Math.floor(rng() * (e.max - e.min + 1)), ench: e.ench, nome: e.nome, frasco: e.frasco, especial: e.especial };
}

/** Nome para o aviso do item recebido. @param {Sorteado} s */
export function nomeDoItem(s) {
  if (s.nome) return s.nome.replace(/§./g, "");
  const base = s.id.replace("minecraft:", "").replace(/_/g, " ");
  return s.frasco ? `frasco (${s.frasco})` : s.especial ? `${base} especial` : base;
}

export { criarSorteado };
