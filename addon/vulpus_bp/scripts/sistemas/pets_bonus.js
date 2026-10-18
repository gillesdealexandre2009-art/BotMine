// @ts-check
// Dados e regras dos pets (sem nada do jogo além do banco): coleção por pessoa, fichas, sorteio com garantia, evolução e os
// bônus que outros sistemas consultam (XP e sorte da masmorra). Quem faz o pet aparecer e seguir é pets.js.
import { world } from "@minecraft/server";
import { config, dadosJogador, lerMundo, salvarMundo } from "../core/db.js";
import { diaBrasilia, msg } from "../core/util.js";
import { PETS, RARIDADES } from "../textos/pets.js";
import { MODELOS } from "../textos/props_modelos.js";
import { emMinigame } from "./mg_estado.js";
import * as textos from "../textos/pets.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {typeof PETS[number]} Pet */
/**
 * @typedef {object} DadosPet
 * @property {Record<string, [number, number]>} own  id do pet → [nível, fragmentos]
 * @property {string[]} ativos  ids dos pets que seguem a pessoa (até petMaxAtivos)
 * @property {boolean} esconder  esconde os pets (o bônus continua; só Kitsune pode ligar)
 * @property {number} fichas
 * @property {number} ab  aberturas no total
 * @property {number} pr  aberturas desde o último raro ou melhor
 * @property {number} pl  aberturas desde o último lendário
 * @property {string} dia
 * @property {number} hoje  aberturas hoje
 * @property {number} ult  ms da última abertura
 */

const PREFIXO = "vulpus:pet:";
export const NIVEL_MAX = 4;
/** Reforço do bônus por nível (1 a 4). */
export const MULT_NIVEL = [1, 1.3, 1.6, 2];
/** Fragmentos para sair do nível n (índice n-1) para o seguinte. */
export const CUSTO_NIVEL = [6, 15, 30];
/** Fragmentos que um pet repetido dá, por raridade. */
export const FRAGMENTOS = /** @type {Record<string, number>} */ ({ comum: 2, incomum: 3, raro: 6, lendario: 15, insano: 25, divino: 40, absoluto: 70 });
/** Pesos do sorteio. */
const PESOS = /** @type {Record<string, number>} */ ({ comum: 55, incomum: 25, raro: 13, lendario: 5, insano: 1.5, divino: 0.4, absoluto: 0.1 });
const ORDEM = ["comum", "incomum", "raro", "lendario", "insano", "divino", "absoluto"];
/** Pets que já têm modelo instalado (o pet sem modelo não sai na cápsula até o pacote de texturas chegar). */
const disponiveis = () => PETS.filter((p) => MODELOS.includes(`Pet: ${p.nome}`));

/** Índice da raridade na ordem (0 = comum). @param {string} rar */
export const nivelRaridade = (rar) => Math.max(0, ORDEM.indexOf(rar));
const IDX_RARO = 2, IDX_LENDARIO = 3;

/** @type {Map<string, DadosPet>} */
const cache = new Map();

/** @param {unknown} v @returns {DadosPet} */
function normalizar(v) {
  const s = /** @type {any} */ (v) ?? {};
  /** @type {DadosPet["own"]} */
  const own = {};
  for (const [id, x] of Object.entries(s.own ?? {})) {
    if (!PETS.some((p) => p.id === id) || !Array.isArray(x)) continue;
    own[id] = [Math.max(1, Math.min(NIVEL_MAX, Math.floor(Number(x[0]) || 1))), Math.max(0, Math.floor(Number(x[1]) || 0))];
  }
  const n = (/** @type {unknown} */ q) => (Number.isFinite(q) ? Math.max(0, Math.floor(/** @type {number} */ (q))) : 0);
  return {
    own,
    ativos: [...new Set([...(Array.isArray(s.ativos) ? s.ativos : []), ...(typeof s.ativo === "string" ? [s.ativo] : [])])].filter((i) => typeof i === "string" && own[i]).slice(0, 4),
    esconder: s.esconder === true,
    fichas: n(s.fichas),
    ab: n(s.ab),
    pr: n(s.pr),
    pl: n(s.pl),
    dia: typeof s.dia === "string" ? s.dia : "",
    hoje: n(s.hoje),
    ult: n(s.ult),
  };
}

/** Dados de pets da pessoa (o dia de hoje já conferido). @param {Player | string} alvo @returns {DadosPet} */
export function dadosPet(alvo) {
  const id = typeof alvo === "string" ? alvo : alvo.id;
  let d = cache.get(id);
  if (!d) {
    d = normalizar(lerMundo(PREFIXO + id, {}));
    cache.set(id, d);
  }
  const dia = diaBrasilia(Date.now());
  if (d.dia !== dia) {
    d.dia = dia;
    d.hoje = 0;
  }
  return d;
}

/** @param {Player | string} alvo */
export function salvarPet(alvo) {
  const id = typeof alvo === "string" ? alvo : alvo.id;
  const d = cache.get(id);
  if (d) salvarMundo(PREFIXO + id, d);
}

/** Libera da memória (quando a pessoa sai). @param {string} id */
export function esquecerPet(id) {
  cache.delete(id);
}

/** @param {string} id */
export const petPorId = (id) => PETS.find((p) => p.id === id);

/**
 * Os pets equipados (até petMaxAtivos) com o nível de cada um.
 * @param {Player | string} alvo
 * @returns {{ pet: Pet, nivel: number }[]}
 */
export function petsAtivos(alvo) {
  const d = dadosPet(alvo);
  /** @type {{ pet: Pet, nivel: number }[]} */
  const lista = [];
  for (const id of d.ativos.slice(0, config().petMaxAtivos)) {
    const pet = petPorId(id);
    if (pet && d.own[id]) lista.push({ pet, nivel: d.own[id][0] });
  }
  return lista;
}

/** Fator de força dos bônus: o nível do pet vezes o ajuste da staff (petBonusPct, 100 = padrão). @param {number} nivel */
export const forca = (nivel) => MULT_NIVEL[Math.max(1, Math.min(NIVEL_MAX, nivel)) - 1] * (config().petBonusPct / 100);

/** Multiplicador de XP da pessoa (1 = sem pet com bônus de XP). @param {Player} player */
export function multiplicadorXp(player) {
  if (!config().petsLigados || emMinigame(player)) return 1;
  return 1 + petsAtivos(player).reduce((t, a) => t + (a.pet.xp * forca(a.nivel)) / 100, 0);
}

/** Bônus de sorte da masmorra, em % (0 = nenhum). @param {Player} player */
export function bonusSorte(player) {
  if (!config().petsLigados || emMinigame(player)) return 0;
  return petsAtivos(player).reduce((t, a) => t + a.pet.sorte * forca(a.nivel), 0);
}

/**
 * Dá fichas de cápsula e avisa.
 * @param {Player | string} alvo
 * @param {number} n
 * @param {string} motivo
 */
export function darFicha(alvo, n, motivo) {
  const d = dadosPet(alvo);
  d.fichas += n;
  salvarPet(alvo);
  if (typeof alvo !== "string") msg(alvo, textos.FICHA_GANHA(n, motivo));
}

/**
 * Sorteia a raridade e o pet, com garantia: raro ou melhor a cada `pityR` aberturas sem sair e lendário ou melhor a cada `pityL`.
 * Atualiza só os contadores de garantia em `d`.
 * @param {DadosPet} d
 * @param {() => number} rng
 * @param {number} pityR
 * @param {number} pityL
 * @returns {Pet}
 */
export function sortearPet(d, rng, pityR, pityL) {
  const disp = disponiveis();
  /** Sorteia uma raridade pelos pesos, só entre as de índice >= minimo. @param {number} minimo */
  const sorteia = (minimo) => {
    const tem = ORDEM.filter((q) => disp.some((x) => x.rar === q));
    const faixa = tem.filter((q) => ORDEM.indexOf(q) >= minimo);
    if (!faixa.length) faixa.push(tem[tem.length - 1] ?? "comum");
    let x = rng() * faixa.reduce((t, q) => t + PESOS[q], 0);
    for (const q of faixa) {
      x -= PESOS[q];
      if (x < 0) return q;
    }
    return faixa[0];
  };
  // garantias: lendário ou melhor a cada `pityL` aberturas sem sair, raro ou melhor a cada `pityR`
  const rar = sorteia(d.pl + 1 >= pityL ? IDX_LENDARIO : d.pr + 1 >= pityR ? IDX_RARO : 0);
  const lista = disp.filter((p) => p.rar === rar);
  const pet = lista[Math.floor(rng() * lista.length)] ?? disp[0];
  d.ab += 1;
  d.pr = nivelRaridade(pet.rar) >= IDX_RARO ? 0 : d.pr + 1;
  d.pl = nivelRaridade(pet.rar) >= IDX_LENDARIO ? 0 : d.pl + 1;
  return pet;
}

/**
 * Põe o pet na coleção. Novo entra no nível 1; repetido vira fragmentos.
 * @param {DadosPet} d
 * @param {Pet} pet
 * @returns {{ novo: boolean, fragmentos: number }}
 */
export function receberPet(d, pet) {
  const atual = d.own[pet.id];
  if (!atual) {
    d.own[pet.id] = [1, 0];
    if (d.ativos.length < config().petMaxAtivos) d.ativos.push(pet.id);
    return { novo: true, fragmentos: 0 };
  }
  const f = FRAGMENTOS[pet.rar] ?? 1;
  atual[1] += f;
  return { novo: false, fragmentos: f };
}

/** Custo em fragmentos para o próximo nível (0 = nível máximo). @param {number} nivel */
export const custoEvolucao = (nivel) => (nivel >= NIVEL_MAX ? 0 : CUSTO_NIVEL[nivel - 1]);

/**
 * Evolui o pet se houver fragmentos.
 * @param {DadosPet} d
 * @param {string} id
 * @returns {number} o novo nível, ou 0 se não deu
 */
export function evoluir(d, id) {
  const x = d.own[id];
  if (!x) return 0;
  const custo = custoEvolucao(x[0]);
  if (custo <= 0 || x[1] < custo) return 0;
  x[1] -= custo;
  x[0] += 1;
  return x[0];
}

/** Cor e nome da raridade. @param {string} rar */
export const raridade = (rar) => /** @type {{ nome: string, cor: string }} */ (/** @type {any} */ (RARIDADES)[rar] ?? RARIDADES.comum);

/**
 * Maiores coleções, inclusive de quem está offline: mais pets, depois mais lendários, depois soma de níveis.
 * @param {number} n
 * @returns {{ nome: string, pets: number, lendarios: number, niveis: number }[]}
 */
export function rankingPets(n) {
  /** @type {{ nome: string, pets: number, lendarios: number, niveis: number }[]} */
  const linhas = [];
  for (const chave of world.getDynamicPropertyIds()) {
    if (!chave.startsWith(PREFIXO)) continue;
    const d = normalizar(lerMundo(chave, {}));
    const ids = Object.keys(d.own);
    if (!ids.length) continue;
    linhas.push({
      nome: dadosJogador(chave.slice(PREFIXO.length)).nome || "?",
      pets: ids.length,
      lendarios: ids.filter((i) => nivelRaridade(petPorId(i)?.rar ?? "") >= IDX_LENDARIO && !!petPorId(i)).length,
      niveis: ids.reduce((t, i) => t + d.own[i][0], 0),
    });
  }
  return linhas.sort((a, b) => b.pets - a.pets || b.lendarios - a.lendarios || b.niveis - a.niveis || a.nome.localeCompare(b.nome)).slice(0, Math.max(0, n));
}
