// @ts-check
// Loot da masmorra: sorteio de raridade (pesos por andar e papel) e de recompensa (itens + Caudas). Parte pura: recebe o sorteador.
// O sorteio é por pessoa: cada baú dá algo diferente para cada um, e o mesmo baú não paga duas vezes no mesmo dia.

/** @typedef {"comum" | "incomum" | "raro" | "epico" | "lendario"} Raridade */
/** @typedef {{ id: string, min: number, max: number, nome: string }} Item */

export const ORDEM = /** @type {const} */ (["comum", "incomum", "raro", "epico", "lendario"]);

/** Pesos base de cada raridade; andares mais fundos e papéis mais difíceis puxam para as raras. */
const BASE = { comum: 60, incomum: 26, raro: 10, epico: 3.4, lendario: 0.6 };
const BONUS_PAPEL = /** @type {Record<string, number>} */ ({ comum: 0, tesouro: 1, secreta: 1.5, elite: 1, miniboss: 1.3, boss: 2 });

/**
 * Pesos finais.
 * @param {number} andar 1 a 5
 * @param {string} papel
 * @returns {Record<Raridade, number>}
 */
export function pesos(andar, papel) {
  const b = (andar - 1) * 0.35 + (BONUS_PAPEL[papel] ?? 0);
  return {
    comum: Math.max(8, BASE.comum - b * 12),
    incomum: BASE.incomum + b * 1.5,
    raro: BASE.raro + b * 4,
    epico: BASE.epico + b * 2.4,
    lendario: BASE.lendario + b * 0.8,
  };
}

/**
 * @param {() => number} rng  [0, 1)
 * @param {number} andar
 * @param {string} papel
 * @param {number} [sorte]  % a mais de peso nas raridades raras (pet de sorte)
 * @returns {Raridade}
 */
export function sortearRaridade(rng, andar, papel, sorte = 0) {
  const p = pesos(andar, papel);
  if (sorte > 0) for (const r of /** @type {const} */ (["raro", "epico", "lendario"])) p[r] *= 1 + sorte / 100;
  const total = ORDEM.reduce((s, r) => s + p[r], 0);
  let x = rng() * total;
  for (const r of ORDEM) {
    x -= p[r];
    if (x < 0) return r;
  }
  return "comum";
}

/** Itens por andar e raridade (ids vanilla). @type {Record<number, Record<Raridade, Item[]>>} */
export const TABELA = {
  1: {
    comum: [{ id: "minecraft:bread", min: 3, max: 6, nome: "Pão" }, { id: "minecraft:torch", min: 8, max: 16, nome: "Tochas" }, { id: "minecraft:arrow", min: 6, max: 14, nome: "Flechas" }],
    incomum: [{ id: "minecraft:iron_ingot", min: 3, max: 7, nome: "Barras de ferro" }, { id: "minecraft:golden_carrot", min: 3, max: 6, nome: "Cenouras douradas" }],
    raro: [{ id: "minecraft:gold_ingot", min: 4, max: 9, nome: "Barras de ouro" }, { id: "minecraft:experience_bottle", min: 3, max: 8, nome: "Frascos de experiência" }],
    epico: [{ id: "minecraft:diamond", min: 1, max: 3, nome: "Diamantes" }, { id: "minecraft:enchanted_golden_apple", min: 1, max: 1, nome: "Maçã dourada encantada" }],
    lendario: [{ id: "minecraft:netherite_scrap", min: 1, max: 2, nome: "Fragmentos de netherite" }, { id: "minecraft:totem_of_undying", min: 1, max: 1, nome: "Totem da imortalidade" }],
  },
  2: {
    comum: [{ id: "minecraft:cookie", min: 6, max: 12, nome: "Biscoitos" }, { id: "minecraft:sugar", min: 6, max: 12, nome: "Açúcar" }, { id: "minecraft:paper", min: 4, max: 8, nome: "Papéis" }],
    incomum: [{ id: "minecraft:iron_ingot", min: 4, max: 9, nome: "Barras de ferro" }, { id: "minecraft:cake", min: 1, max: 1, nome: "Bolo" }],
    raro: [{ id: "minecraft:emerald", min: 3, max: 8, nome: "Esmeraldas" }, { id: "minecraft:firework_rocket", min: 4, max: 10, nome: "Fogos de artifício" }],
    epico: [{ id: "minecraft:diamond", min: 2, max: 4, nome: "Diamantes" }, { id: "minecraft:golden_apple", min: 2, max: 3, nome: "Maçãs douradas" }],
    lendario: [{ id: "minecraft:elytra", min: 1, max: 1, nome: "Élitros" }, { id: "minecraft:totem_of_undying", min: 1, max: 1, nome: "Totem da imortalidade" }],
  },
  3: {
    comum: [{ id: "minecraft:cooked_beef", min: 4, max: 8, nome: "Bifes" }, { id: "minecraft:arrow", min: 12, max: 24, nome: "Flechas" }, { id: "minecraft:white_wool", min: 8, max: 16, nome: "Lã" }],
    incomum: [{ id: "minecraft:iron_ingot", min: 6, max: 12, nome: "Barras de ferro" }, { id: "minecraft:shield", min: 1, max: 1, nome: "Escudo" }],
    raro: [{ id: "minecraft:diamond", min: 1, max: 3, nome: "Diamantes" }, { id: "minecraft:crossbow", min: 1, max: 1, nome: "Besta" }],
    epico: [{ id: "minecraft:diamond", min: 3, max: 5, nome: "Diamantes" }, { id: "minecraft:enchanted_golden_apple", min: 1, max: 2, nome: "Maçãs douradas encantadas" }],
    lendario: [{ id: "minecraft:netherite_ingot", min: 1, max: 1, nome: "Barra de netherite" }, { id: "minecraft:totem_of_undying", min: 1, max: 2, nome: "Totens" }],
  },
  4: {
    comum: [{ id: "minecraft:glowstone_dust", min: 6, max: 12, nome: "Pó de glowstone" }, { id: "minecraft:amethyst_shard", min: 4, max: 8, nome: "Fragmentos de ametista" }, { id: "minecraft:white_dye", min: 6, max: 12, nome: "Corante branco" }],
    incomum: [{ id: "minecraft:ender_pearl", min: 2, max: 4, nome: "Pérolas do Ender" }, { id: "minecraft:lapis_lazuli", min: 8, max: 16, nome: "Lápis-lazúli" }],
    raro: [{ id: "minecraft:diamond", min: 2, max: 4, nome: "Diamantes" }, { id: "minecraft:ender_eye", min: 2, max: 4, nome: "Olhos do Ender" }],
    epico: [{ id: "minecraft:netherite_scrap", min: 1, max: 2, nome: "Fragmentos de netherite" }, { id: "minecraft:diamond", min: 4, max: 6, nome: "Diamantes" }],
    lendario: [{ id: "minecraft:netherite_ingot", min: 1, max: 2, nome: "Barras de netherite" }, { id: "minecraft:nether_star", min: 1, max: 1, nome: "Estrela do Nether" }],
  },
  5: {
    comum: [{ id: "minecraft:golden_apple", min: 1, max: 2, nome: "Maçãs douradas" }, { id: "minecraft:experience_bottle", min: 6, max: 12, nome: "Frascos de experiência" }, { id: "minecraft:blaze_powder", min: 6, max: 12, nome: "Pó de chama" }],
    incomum: [{ id: "minecraft:diamond", min: 2, max: 4, nome: "Diamantes" }, { id: "minecraft:ender_pearl", min: 3, max: 6, nome: "Pérolas do Ender" }],
    raro: [{ id: "minecraft:netherite_scrap", min: 1, max: 2, nome: "Fragmentos de netherite" }, { id: "minecraft:enchanted_golden_apple", min: 1, max: 2, nome: "Maçãs douradas encantadas" }],
    epico: [{ id: "minecraft:netherite_ingot", min: 1, max: 1, nome: "Barra de netherite" }, { id: "minecraft:totem_of_undying", min: 1, max: 2, nome: "Totens" }],
    lendario: [{ id: "minecraft:nether_star", min: 1, max: 2, nome: "Estrelas do Nether" }, { id: "minecraft:netherite_ingot", min: 2, max: 3, nome: "Barras de netherite" }],
  },
};

/** Caudas pagas por baú, por raridade (multiplicadas pelo andar). */
export const CAUDAS_BAU = { comum: 2, incomum: 4, raro: 8, epico: 16, lendario: 40 };

/**
 * Recompensa de um baú ou de um inimigo.
 * @param {() => number} rng
 * @param {number} andar
 * @param {string} papel
 * @param {number} [sorte]
 * @returns {{ raridade: Raridade, item: Item, quantidade: number, caudas: number }}
 */
export function sortearRecompensa(rng, andar, papel, sorte = 0) {
  const raridade = sortearRaridade(rng, andar, papel, sorte);
  const lista = TABELA[andar]?.[raridade] ?? TABELA[1][raridade];
  const item = lista[Math.floor(rng() * lista.length)];
  const quantidade = item.min + Math.floor(rng() * (item.max - item.min + 1));
  return { raridade, item, quantidade, caudas: CAUDAS_BAU[raridade] * andar };
}
