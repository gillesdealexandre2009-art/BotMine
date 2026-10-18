// @ts-check
// Paletas das 5 zonas da masmorra. Cada zona é uma arquitetura: ruínas musgosas (norte), fortaleza de ardósia e cobre (leste),
// templo de prismarinho (sul), cripta de pedra negra (oeste) e o salão sombrio do centro. Listas com peso dão variedade: o
// mesmo muro mistura vários tijolos, e o piso tem borda, padrão e desgaste.

/** @typedef {[string, number][]} Pesos */

/**
 * @typedef {object} Paleta
 * @property {string} nome
 * @property {Pesos} parede  corpo das paredes
 * @property {string} rodape  primeira fiada da parede
 * @property {string} friso  faixa de cima da parede
 * @property {string} pilar
 * @property {string} topo  capitel dos pilares
 * @property {Pesos} piso  piso das salas
 * @property {Pesos} pisoCorredor
 * @property {string} borda  piso encostado nas paredes das salas grandes
 * @property {string} teto
 * @property {string} viga  vigas do teto
 * @property {string} luz  lanterna
 * @property {string} vitral  bloco que brilha escondido (nichos e frisos)
 * @property {string} escada  escada da zona (degraus, arcos, bancos)
 * @property {string} laje
 * @property {string} muro  muretas e grades baixas
 * @property {string} sujo  entulho do chão
 */

/** @type {Record<string, Paleta>} */
export const PALETAS = {
  norte: {
    nome: "Ruínas musgosas",
    parede: [["minecraft:stone_bricks", 5], ["minecraft:mossy_stone_bricks", 4], ["minecraft:cracked_stone_bricks", 2], ["minecraft:mossy_cobblestone", 1]],
    rodape: "minecraft:mossy_cobblestone",
    friso: "minecraft:chiseled_stone_bricks",
    pilar: "minecraft:stone_bricks",
    topo: "minecraft:chiseled_stone_bricks",
    piso: [["minecraft:mossy_stone_bricks", 3], ["minecraft:stone_bricks", 3], ["minecraft:moss_block", 1], ["minecraft:cobblestone", 1], ["minecraft:cracked_stone_bricks", 1]],
    pisoCorredor: [["minecraft:stone_bricks", 4], ["minecraft:mossy_cobblestone", 2], ["minecraft:cobblestone", 2], ["minecraft:gravel", 1]],
    borda: "minecraft:chiseled_stone_bricks",
    teto: "minecraft:stone_bricks",
    viga: "minecraft:dark_oak_planks",
    luz: "minecraft:lantern",
    vitral: "minecraft:shroomlight",
    escada: "minecraft:stone_brick_stairs",
    laje: "minecraft:stone_brick_slab",
    muro: "minecraft:mossy_stone_brick_wall",
    sujo: "minecraft:mossy_cobblestone",
  },
  leste: {
    nome: "Fortaleza de ardósia e cobre",
    parede: [["minecraft:deepslate_bricks", 5], ["minecraft:cracked_deepslate_bricks", 2], ["minecraft:tuff_bricks", 2], ["minecraft:polished_deepslate", 1]],
    rodape: "minecraft:polished_deepslate",
    friso: "minecraft:weathered_cut_copper",
    pilar: "minecraft:polished_deepslate",
    topo: "minecraft:chiseled_deepslate",
    piso: [["minecraft:deepslate_tiles", 4], ["minecraft:polished_deepslate", 3], ["minecraft:cracked_deepslate_tiles", 1], ["minecraft:tuff_bricks", 1]],
    pisoCorredor: [["minecraft:deepslate_bricks", 3], ["minecraft:polished_deepslate", 3], ["minecraft:tuff_bricks", 1]],
    borda: "minecraft:exposed_cut_copper",
    teto: "minecraft:deepslate_bricks",
    viga: "minecraft:oxidized_cut_copper",
    luz: "minecraft:lantern",
    vitral: "minecraft:ochre_froglight",
    escada: "minecraft:deepslate_brick_stairs",
    laje: "minecraft:deepslate_brick_slab",
    muro: "minecraft:deepslate_brick_wall",
    sujo: "minecraft:cobbled_deepslate",
  },
  sul: {
    nome: "Templo de prismarinho",
    parede: [["minecraft:prismarine_bricks", 5], ["minecraft:prismarine", 2], ["minecraft:dark_prismarine", 2], ["minecraft:stone_bricks", 1]],
    rodape: "minecraft:dark_prismarine",
    friso: "minecraft:prismarine_bricks",
    pilar: "minecraft:dark_prismarine",
    topo: "minecraft:sea_lantern",
    piso: [["minecraft:prismarine_bricks", 3], ["minecraft:prismarine", 2], ["minecraft:dark_prismarine", 2], ["minecraft:stone_bricks", 1]],
    pisoCorredor: [["minecraft:prismarine_bricks", 3], ["minecraft:dark_prismarine", 3], ["minecraft:prismarine", 1]],
    borda: "minecraft:dark_prismarine",
    teto: "minecraft:dark_prismarine",
    viga: "minecraft:prismarine_bricks",
    luz: "minecraft:soul_lantern",
    vitral: "minecraft:sea_lantern",
    escada: "minecraft:prismarine_brick_stairs",
    laje: "minecraft:prismarine_brick_slab",
    muro: "minecraft:prismarine_wall",
    sujo: "minecraft:prismarine",
  },
  oeste: {
    nome: "Cripta de pedra negra",
    parede: [["minecraft:deepslate_bricks", 3], ["minecraft:cracked_deepslate_bricks", 2], ["minecraft:blackstone", 2], ["minecraft:polished_blackstone_bricks", 3], ["minecraft:cobbled_deepslate", 1]],
    rodape: "minecraft:polished_blackstone",
    friso: "minecraft:chiseled_polished_blackstone",
    pilar: "minecraft:polished_blackstone_bricks",
    topo: "minecraft:chiseled_polished_blackstone",
    piso: [["minecraft:polished_blackstone", 3], ["minecraft:blackstone", 2], ["minecraft:cracked_polished_blackstone_bricks", 2], ["minecraft:soul_soil", 1]],
    pisoCorredor: [["minecraft:polished_blackstone_bricks", 3], ["minecraft:blackstone", 2], ["minecraft:cracked_polished_blackstone_bricks", 1]],
    borda: "minecraft:chiseled_polished_blackstone",
    teto: "minecraft:polished_blackstone_bricks",
    viga: "minecraft:dark_oak_planks",
    luz: "minecraft:soul_lantern",
    vitral: "minecraft:soul_lantern",
    escada: "minecraft:polished_blackstone_brick_stairs",
    laje: "minecraft:polished_blackstone_brick_slab",
    muro: "minecraft:polished_blackstone_brick_wall",
    sujo: "minecraft:cobbled_deepslate",
  },
  centro: {
    nome: "Salão sombrio",
    parede: [["minecraft:polished_blackstone_bricks", 5], ["minecraft:blackstone", 2], ["minecraft:chiseled_polished_blackstone", 1], ["minecraft:cracked_polished_blackstone_bricks", 1]],
    rodape: "minecraft:polished_blackstone",
    friso: "minecraft:gilded_blackstone",
    pilar: "minecraft:polished_blackstone_bricks",
    topo: "minecraft:chiseled_polished_blackstone",
    piso: [["minecraft:polished_blackstone_bricks", 3], ["minecraft:polished_blackstone", 2], ["minecraft:blackstone", 1]],
    pisoCorredor: [["minecraft:polished_blackstone_bricks", 3], ["minecraft:polished_blackstone", 2]],
    borda: "minecraft:gilded_blackstone",
    teto: "minecraft:polished_blackstone_bricks",
    viga: "minecraft:crying_obsidian",
    luz: "minecraft:soul_lantern",
    vitral: "minecraft:crying_obsidian",
    escada: "minecraft:polished_blackstone_brick_stairs",
    laje: "minecraft:polished_blackstone_brick_slab",
    muro: "minecraft:polished_blackstone_brick_wall",
    sujo: "minecraft:blackstone",
  },
};

/**
 * Hash 3D estável em [0, 1).
 * @param {number} a @param {number} b @param {number} c
 */
export function hash3(a, b, c) {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Sorteio com peso, determinístico pela posição.
 * @param {Pesos} lista @param {number} r  em [0, 1)
 */
export function escolher(lista, r) {
  let total = 0;
  for (const [, w] of lista) total += w;
  let v = r * total;
  for (const [id, w] of lista) {
    v -= w;
    if (v < 0) return id;
  }
  return lista[0][0];
}
