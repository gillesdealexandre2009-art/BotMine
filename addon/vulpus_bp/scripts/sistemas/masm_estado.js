// @ts-check
// Dados da masmorra no mundo: os andares gerados (um valor por andar, para ficar abaixo do limite de 30.000 caracteres),
// o progresso de cada pessoa (Selos, abates, baús do dia, Caudas do dia, relógio) e o ranking de cada andar.
import { lerMundo, salvarMundo } from "../core/db.js";
import { diaBrasilia } from "../core/util.js";

/** @typedef {import("./masm_construir.js").ResultadoAndar} ResultadoAndar */

export const ANDARES = 5;
const CH_ANDAR = "vulpus:masm:a:";
const CH_JOGADOR = "vulpus:masm:j:";
const CH_RANK = "vulpus:masm:rank";
export const RANK_MAX = 10;

/** @type {Map<number, ResultadoAndar | null>} */
const cacheAndar = new Map();

/** Arredonda os pontos de nascimento para o dado ficar pequeno. @param {ResultadoAndar} a */
function compactar(a) {
  return { ...a, salas: a.salas.map((s) => ({ ...s, spawns: s.spawns.map(([x, y, z]) => [Math.round(x * 2) / 2, y, Math.round(z * 2) / 2]) })) };
}

/** @param {number} n 1 a 5 @returns {ResultadoAndar | null} */
export function andar(n) {
  if (!cacheAndar.has(n)) cacheAndar.set(n, lerMundo(CH_ANDAR + n, null));
  return cacheAndar.get(n) ?? null;
}

/** @param {number} n @param {ResultadoAndar | null} a */
export function gravarAndar(n, a) {
  cacheAndar.set(n, a);
  salvarMundo(CH_ANDAR + n, a ? compactar(a) : undefined);
}

export function andaresProntos() {
  const lista = [];
  for (let n = 1; n <= ANDARES; n++) {
    const a = andar(n);
    if (a) lista.push(a);
  }
  return lista;
}

/**
 * @typedef {object} Progresso
 * @property {number} selos  máscara de bits: bit (n-1) = Selo do andar n
 * @property {number[]} abates  por andar
 * @property {{ dia: string, chaves: string[] }} baus
 * @property {{ dia: string, n: number }} caudas
 * @property {number[]} inicio  ms em que começou o andar (0 = não começou)
 * @property {number[]} mortes  por andar, na tentativa atual
 */

/** @returns {Progresso} */
const novo = () => ({ selos: 0, abates: [0, 0, 0, 0, 0], baus: { dia: "", chaves: [] }, caudas: { dia: "", n: 0 }, inicio: [0, 0, 0, 0, 0], mortes: [0, 0, 0, 0, 0] });

/** @type {Map<string, Progresso>} */
const cacheJ = new Map();

/** @param {string} id @returns {Progresso} */
export function progresso(id) {
  let p = cacheJ.get(id);
  if (!p) {
    p = { ...novo(), ...lerMundo(CH_JOGADOR + id, {}) };
    cacheJ.set(id, p);
  }
  return p;
}

/** @param {string} id */
export function salvarProgresso(id) {
  const p = cacheJ.get(id);
  if (p) salvarMundo(CH_JOGADOR + id, p);
}

/** @param {string} id @param {number} n */
export const temSelo = (id, n) => (progresso(id).selos & (1 << (n - 1))) !== 0;

/** @param {string} id @param {number} n */
export function darSelo(id, n) {
  progresso(id).selos |= 1 << (n - 1);
  salvarProgresso(id);
}

/** Quantos Selos a pessoa tem. @param {string} id */
export function contarSelos(id) {
  let n = 0;
  for (let i = 1; i <= ANDARES; i++) if (temSelo(id, i)) n++;
  return n;
}

/** Baús abertos hoje (zera na virada do dia, no horário de Brasília). @param {string} id @param {number} [agora] */
export function bausDoDia(id, agora = Date.now()) {
  const p = progresso(id);
  const dia = diaBrasilia(agora);
  if (p.baus.dia !== dia) p.baus = { dia, chaves: [] };
  return p.baus;
}

/** Caudas ganhas hoje na masmorra. @param {string} id @param {number} [agora] */
export function caudasDoDia(id, agora = Date.now()) {
  const p = progresso(id);
  const dia = diaBrasilia(agora);
  if (p.caudas.dia !== dia) p.caudas = { dia, n: 0 };
  return p.caudas;
}

/** @typedef {{ id: string, nome: string, t: number, m: number }} Marca  t = ms gastos até derrotar o guardião */

/** @returns {Record<string, Marca[]>} */
export function ranking() {
  return lerMundo(CH_RANK, {});
}

/**
 * Registra a marca (guarda só a melhor de cada pessoa) e devolve a posição, ou 0 se ficou fora do top.
 * @param {number} n
 * @param {Marca} marca
 */
export function registrarMarca(n, marca) {
  const r = ranking();
  const lista = r[n] ?? [];
  const i = lista.findIndex((x) => x.id === marca.id);
  if (i >= 0) {
    if (lista[i].t <= marca.t) return lista.findIndex((x) => x.id === marca.id) + 1;
    lista.splice(i, 1);
  }
  lista.push(marca);
  lista.sort((a, b) => a.t - b.t);
  r[n] = lista.slice(0, RANK_MAX);
  salvarMundo(CH_RANK, r);
  return r[n].findIndex((x) => x.id === marca.id) + 1;
}

/** Só para testes. */
export function limparCache() {
  cacheAndar.clear();
  cacheJ.clear();
}
