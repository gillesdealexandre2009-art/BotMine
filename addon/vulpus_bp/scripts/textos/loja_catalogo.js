// @ts-check
// Catálogo da Loja: itens com preço fixo de compra (jogador compra da loja) e venda (loja paga ao jogador).
// Preço de venda < compra = dreno de Caudas. Só itens vanilla sem NBT especial.

/**
 * @typedef {object} ItemLoja
 * @property {string} id       typeId do Minecraft
 * @property {string} nome     nome curto em português
 * @property {string} categoria  "blocos"|"ferramentas"|"armas"|"armaduras"|"comida"|"pocoes"|"outros"
 * @property {number} compra   preço para o jogador comprar 1 unidade
 * @property {number} venda    preço que a loja paga por 1 unidade
 */

/** @type {readonly ItemLoja[]} */
export const CATALOGO = Object.freeze([
  // ── Blocos comuns
  { id: "minecraft:cobblestone",         nome: "Pedregulho",       categoria: "blocos", compra: 2,   venda: 1 },
  { id: "minecraft:dirt",                nome: "Terra",            categoria: "blocos", compra: 2,   venda: 1 },
  { id: "minecraft:sand",                nome: "Areia",            categoria: "blocos", compra: 3,   venda: 1 },
  { id: "minecraft:gravel",              nome: "Cascalho",         categoria: "blocos", compra: 3,   venda: 1 },
  { id: "minecraft:stone",               nome: "Pedra",            categoria: "blocos", compra: 3,   venda: 1 },
  { id: "minecraft:oak_log",             nome: "Tronco de Carvalho", categoria: "blocos", compra: 4, venda: 2 },
  { id: "minecraft:spruce_log",          nome: "Tronco de Pinheiro", categoria: "blocos", compra: 4, venda: 2 },
  { id: "minecraft:birch_log",           nome: "Tronco de Bétula", categoria: "blocos", compra: 4,   venda: 2 },
  { id: "minecraft:oak_planks",          nome: "Tábuas de Carvalho", categoria: "blocos", compra: 3, venda: 1 },
  { id: "minecraft:glass",               nome: "Vidro",            categoria: "blocos", compra: 5,   venda: 2 },
  { id: "minecraft:bricks",              nome: "Tijolos",          categoria: "blocos", compra: 8,   venda: 4 },
  { id: "minecraft:obsidian",            nome: "Obsidiana",        categoria: "blocos", compra: 25,  venda: 12 },
  { id: "minecraft:glowstone",           nome: "Pedra Luminosa",   categoria: "blocos", compra: 12,  venda: 5 },
  { id: "minecraft:quartz_block",        nome: "Bloco de Quartzo", categoria: "blocos", compra: 10,  venda: 4 },

  // ── Minérios e materiais
  { id: "minecraft:coal",                nome: "Carvão",           categoria: "outros", compra: 3,   venda: 1 },
  { id: "minecraft:raw_iron",            nome: "Ferro Bruto",      categoria: "outros", compra: 8,   venda: 4 },
  { id: "minecraft:iron_ingot",          nome: "Barra de Ferro",   categoria: "outros", compra: 15,  venda: 7 },
  { id: "minecraft:raw_gold",            nome: "Ouro Bruto",       categoria: "outros", compra: 12,  venda: 6 },
  { id: "minecraft:gold_ingot",          nome: "Barra de Ouro",    categoria: "outros", compra: 25,  venda: 12 },
  { id: "minecraft:diamond",             nome: "Diamante",         categoria: "outros", compra: 80,  venda: 40 },
  { id: "minecraft:emerald",             nome: "Esmeralda",        categoria: "outros", compra: 50,  venda: 25 },
  { id: "minecraft:lapis_lazuli",        nome: "Lápis-Lazúli",     categoria: "outros", compra: 5,   venda: 2 },
  { id: "minecraft:redstone",            nome: "Redstone",         categoria: "outros", compra: 4,   venda: 2 },
  { id: "minecraft:copper_ingot",        nome: "Barra de Cobre",   categoria: "outros", compra: 6,   venda: 3 },
  { id: "minecraft:amethyst_shard",      nome: "Fragmento de Ametista", categoria: "outros", compra: 8, venda: 3 },
  { id: "minecraft:netherite_scrap",     nome: "Fragmento de Netherita", categoria: "outros", compra: 200, venda: 100 },

  // ── Ferramentas (ferro)
  { id: "minecraft:iron_pickaxe",        nome: "Picareta de Ferro",  categoria: "ferramentas", compra: 30, venda: 12 },
  { id: "minecraft:iron_axe",            nome: "Machado de Ferro",   categoria: "ferramentas", compra: 28, venda: 11 },
  { id: "minecraft:iron_shovel",         nome: "Pá de Ferro",        categoria: "ferramentas", compra: 18, venda: 7 },
  { id: "minecraft:iron_hoe",            nome: "Enxada de Ferro",    categoria: "ferramentas", compra: 16, venda: 6 },
  { id: "minecraft:shears",              nome: "Tesoura",            categoria: "ferramentas", compra: 15, venda: 6 },
  { id: "minecraft:flint_and_steel",     nome: "Isqueiro",           categoria: "ferramentas", compra: 12, venda: 5 },
  { id: "minecraft:fishing_rod",         nome: "Vara de Pesca",      categoria: "ferramentas", compra: 15, venda: 6 },
  { id: "minecraft:bucket",              nome: "Balde",              categoria: "ferramentas", compra: 20, venda: 8 },

  // ── Armas
  { id: "minecraft:iron_sword",          nome: "Espada de Ferro",    categoria: "armas", compra: 25, venda: 10 },
  { id: "minecraft:bow",                 nome: "Arco",               categoria: "armas", compra: 20, venda: 8 },
  { id: "minecraft:crossbow",            nome: "Besta",              categoria: "armas", compra: 22, venda: 9 },
  { id: "minecraft:arrow",               nome: "Flecha",             categoria: "armas", compra: 2,  venda: 1 },
  { id: "minecraft:shield",              nome: "Escudo",             categoria: "armas", compra: 18, venda: 7 },

  // ── Armaduras
  { id: "minecraft:iron_helmet",         nome: "Capacete de Ferro",    categoria: "armaduras", compra: 30, venda: 12 },
  { id: "minecraft:iron_chestplate",     nome: "Peitoral de Ferro",    categoria: "armaduras", compra: 50, venda: 20 },
  { id: "minecraft:iron_leggings",       nome: "Calças de Ferro",      categoria: "armaduras", compra: 42, venda: 17 },
  { id: "minecraft:iron_boots",          nome: "Botas de Ferro",       categoria: "armaduras", compra: 25, venda: 10 },

  // ── Comida
  { id: "minecraft:bread",               nome: "Pão",               categoria: "comida", compra: 4,  venda: 2 },
  { id: "minecraft:cooked_beef",         nome: "Bife",              categoria: "comida", compra: 6,  venda: 3 },
  { id: "minecraft:cooked_porkchop",     nome: "Costeleta Assada",  categoria: "comida", compra: 6,  venda: 3 },
  { id: "minecraft:golden_apple",        nome: "Maçã Dourada",      categoria: "comida", compra: 60, venda: 30 },
  { id: "minecraft:cooked_chicken",      nome: "Frango Assado",     categoria: "comida", compra: 4,  venda: 2 },
  { id: "minecraft:cooked_salmon",       nome: "Salmão Assado",     categoria: "comida", compra: 5,  venda: 2 },
  { id: "minecraft:apple",               nome: "Maçã",              categoria: "comida", compra: 3,  venda: 1 },
  { id: "minecraft:cake",                nome: "Bolo",              categoria: "comida", compra: 15, venda: 6 },

  // ── Poções
  { id: "minecraft:potion",              nome: "Poção (qualquer)",   categoria: "pocoes", compra: 20, venda: 8 },
  { id: "minecraft:glass_bottle",        nome: "Frasco de Vidro",    categoria: "pocoes", compra: 3,  venda: 1 },
  { id: "minecraft:blaze_rod",           nome: "Bastão de Blaze",    categoria: "pocoes", compra: 15, venda: 7 },
  { id: "minecraft:nether_wart",         nome: "Fungo do Nether",    categoria: "pocoes", compra: 5,  venda: 2 },
]);

/** Indexa o catálogo por typeId. @type {ReadonlyMap<string, ItemLoja>} */
export const POR_ID = new Map(CATALOGO.map((item) => [item.id, item]));

/** @type {readonly string[]} */
export const CATEGORIAS = Object.freeze([...new Set(CATALOGO.map((i) => i.categoria))]);
