// @ts-check
// Telecinese de blocos: qual textura (vanilla) a entidade-bloco `vulpus:ecos_bloco` usa para cada tipo de bloco, e quais blocos
// NÃO dá para pegar (guardam dados que a entidade não preserva). A ordem de TEXTURAS é o valor da propriedade `vulpus:tipo`
// e tem que bater com vulpus_rp/render_controllers/ecos_bloco.render_controllers.json e vulpus_rp/entity/ecos_bloco.entity.json
// (tools/gerar_ecos_bloco.py gera os dois a partir daqui: não editar à mão).

/** Texturas vanilla (textures/blocks/<nome>); o índice é o `vulpus:tipo`. O 0 é a pedra, usada de reserva. */
export const TEXTURAS = [
  "stone", "dirt", "grass_side_carried", "sand", "gravel", "cobblestone",
  "planks_oak", "planks_spruce", "planks_birch", "planks_jungle", "planks_acacia", "planks_big_oak",
  "log_oak", "log_spruce", "log_birch", "brick", "stonebrick", "glass",
  "wool_colored_white", "wool_colored_red", "wool_colored_blue", "wool_colored_green", "wool_colored_yellow", "wool_colored_black",
  "snow", "ice", "sandstone_normal", "netherrack", "obsidian", "clay",
  "hardened_clay_stained_white", "stone_granite", "stone_diorite", "stone_andesite", "coal_ore", "iron_ore",
  "gold_ore", "diamond_ore", "coal_block", "iron_block", "gold_block", "diamond_block",
  "end_stone", "soul_sand", "glowstone", "sea_lantern", "red_sand", "hay_block_side", "quartz_block_side", "nether_brick",
];

/** @type {[RegExp, string][]} regra (sobre o id sem "minecraft:") -> textura */
const REGRAS = [
  [/^(stone|smooth_stone|stone_slab|stone_stairs)$/, "stone"],
  [/^(dirt|coarse_dirt|rooted_dirt|farmland|dirt_path|podzol|mud)$/, "dirt"],
  [/^(grass_block|grass_path|mycelium)$/, "grass_side_carried"],
  [/^sand$/, "sand"],
  [/^red_sand$/, "red_sand"],
  [/^gravel$/, "gravel"],
  [/^(cobblestone|mossy_cobblestone|cobblestone_wall)$/, "cobblestone"],
  [/^oak_planks$/, "planks_oak"],
  [/^spruce_planks$/, "planks_spruce"],
  [/^birch_planks$/, "planks_birch"],
  [/^jungle_planks$/, "planks_jungle"],
  [/^acacia_planks$/, "planks_acacia"],
  [/^dark_oak_planks$/, "planks_big_oak"],
  [/^(oak_log|oak_wood|stripped_oak_log|stripped_oak_wood)$/, "log_oak"],
  [/^(spruce_log|spruce_wood|stripped_spruce_log)$/, "log_spruce"],
  [/^(birch_log|birch_wood|stripped_birch_log)$/, "log_birch"],
  [/^(bricks|brick_block)$/, "brick"],
  [/^(stone_bricks|stonebrick|mossy_stone_bricks|cracked_stone_bricks)$/, "stonebrick"],
  [/^(glass|tinted_glass)$/, "glass"],
  [/^white_wool$/, "wool_colored_white"],
  [/^red_wool$/, "wool_colored_red"],
  [/^blue_wool$/, "wool_colored_blue"],
  [/^green_wool$/, "wool_colored_green"],
  [/^yellow_wool$/, "wool_colored_yellow"],
  [/^black_wool$/, "wool_colored_black"],
  [/_wool$/, "wool_colored_white"],
  [/^(snow|powder_snow)$/, "snow"],
  [/^(ice|packed_ice|blue_ice)$/, "ice"],
  [/^(sandstone|smooth_sandstone|cut_sandstone|chiseled_sandstone)$/, "sandstone_normal"],
  [/^(netherrack|crimson_nylium|warped_nylium)$/, "netherrack"],
  [/^obsidian$/, "obsidian"],
  [/^crying_obsidian$/, "obsidian"],
  [/^clay$/, "clay"],
  [/^(terracotta|hardened_clay)$/, "hardened_clay_stained_white"],
  [/_terracotta$/, "hardened_clay_stained_white"],
  [/^granite$/, "stone_granite"],
  [/^diorite$/, "stone_diorite"],
  [/^andesite$/, "stone_andesite"],
  [/^coal_ore$/, "coal_ore"],
  [/^iron_ore$/, "iron_ore"],
  [/^gold_ore$/, "gold_ore"],
  [/^diamond_ore$/, "diamond_ore"],
  [/^coal_block$/, "coal_block"],
  [/^iron_block$/, "iron_block"],
  [/^gold_block$/, "gold_block"],
  [/^diamond_block$/, "diamond_block"],
  [/^end_stone$/, "end_stone"],
  [/^(soul_sand|soul_soil)$/, "soul_sand"],
  [/^glowstone$/, "glowstone"],
  [/^sea_lantern$/, "sea_lantern"],
  [/^hay_block$/, "hay_block_side"],
  [/^(quartz_block|smooth_quartz|chiseled_quartz_block|quartz_bricks)$/, "quartz_block_side"],
  [/^(nether_bricks|red_nether_bricks)$/, "nether_brick"],
];

/**
 * Índice de textura (`vulpus:tipo`) de um bloco. Sem regra, é 0 (pedra).
 * @param {string} typeId
 * @returns {number}
 */
export function indiceTextura(typeId) {
  const id = typeId.replace(/^minecraft:/, "");
  for (const [re, tex] of REGRAS) {
    if (re.test(id)) {
      const i = TEXTURAS.indexOf(tex);
      return i < 0 ? 0 : i;
    }
  }
  return 0;
}

/** Blocos que não dá para pegar (inventário, dados, ligação com outros blocos, ou quebram o mundo). Lista por trecho do id. */
const PROIBIDOS = [
  "air", "bedrock", "barrier", "light_block", "command_block", "structure_block", "structure_void", "jigsaw", "allow", "deny", "border_block",
  "chest", "barrel", "hopper", "furnace", "smoker", "blast_furnace", "dispenser", "dropper", "brewing_stand", "shulker_box", "ender_chest",
  "lectern", "jukebox", "chiseled_bookshelf", "decorated_pot", "crafter", "beacon", "conduit", "enchanting_table", "bell", "campfire",
  "sign", "hanging_sign", "skull", "head", "spawner", "vault", "bed", "door", "banner", "cauldron", "flower_pot", "item_frame",
  "portal", "end_gateway", "end_portal", "piston", "sticky_piston", "moving_block", "pistonarmcollision", "observer", "comparator", "repeater",
  "redstone", "lever", "button", "pressure_plate", "tripwire", "rail", "torch", "candle", "frame", "pot", "sapling", "sculk_sensor",
  "sculk_shrieker", "sculk_catalyst", "trapdoor", "fence_gate", "ladder", "vine", "lava", "water", "fire", "snow_layer", "carpet", "grindstone",
  "stonecutter", "loom", "cartography_table", "smithing_table", "fletching_table", "anvil", "trial", "respawn_anchor", "lodestone", "end_rod",
  "chain", "scaffolding", "cake", "turtle_egg", "sniffer_egg", "frog_spawn", "tnt", "monster_egg", "infested",
];

/**
 * Dá para pegar este bloco com a telecinese?
 * @param {string} typeId
 */
export function blocoPegavel(typeId) {
  const id = typeId.replace(/^minecraft:/, "");
  if (!id || id === "lantern" || id === "soul_lantern") return false;
  return !PROIBIDOS.some((p) => id === p || id.includes(p));
}
