// @ts-check
// Busca de entidades com memória. Vários sistemas "mantêm" suas entidades (props, mesas, roleta, moeda...) procurando-as
// com getEntities nas três dimensões a cada 100 ticks, mesmo quando nada mudou. Aqui o resultado de cada busca fica
// guardado: vale enquanto todas as entidades achadas continuam válidas e o prazo não venceu (o prazo serve para achar
// repetidas e sobras). Quem cria uma entidade avisa com esquecerBusca(chave), para a próxima busca enxergá-la.
import { system } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Entity} Entity */

/** Ticks até uma busca guardada ser refeita mesmo sem nada ter mudado (sobras e repetidas). */
export const PRAZO_BUSCA = 600;

/** @type {Map<string, { t: number, lista: Entity[] }>} */
const guardadas = new Map();

/**
 * Entidades de uma busca, do cache ou de `buscar`.
 * @param {string} chave  identifica a busca (ex.: "roleta:vulpus_roleta_roda")
 * @param {() => Entity[]} buscar  a busca de verdade (getEntities nas dimensões)
 * @param {number} [prazo]  ticks de validade
 * @returns {Entity[]} uma cópia: quem chama pode alterar a lista
 */
export function achadas(chave, buscar, prazo = PRAZO_BUSCA) {
  const agora = system.currentTick;
  const g = guardadas.get(chave);
  if (g && agora >= g.t && agora - g.t < prazo && g.lista.every((e) => e.isValid)) return g.lista.slice();
  const lista = buscar();
  guardadas.set(chave, { t: agora, lista });
  return lista.slice();
}

/**
 * Descarta a busca guardada (depois de criar ou mover uma entidade que ela deveria achar).
 * @param {string} chave
 */
export function esquecerBusca(chave) {
  guardadas.delete(chave);
}

/** @type {Map<string, { k: string, t: number }>} id da entidade → último estado aplicado (rotação, modelo...) */
const aplicados = new Map();
/** Ticks até se reaplicar o estado mesmo sem mudança (conserta alteração externa). */
const PRAZO_APLICAR = 1200;

/**
 * Diz se o estado `k` (ex.: "yaw|modelo") ainda precisa ser escrito na entidade: não precisa se foi o último escrito
 * há menos de PRAZO_APLICAR ticks. Já registra `k` como aplicado quando devolve true.
 * @param {Entity} ent
 * @param {string} k
 */
export function precisaAplicar(ent, k) {
  const agora = system.currentTick;
  const id = ent.id;
  const g = aplicados.get(id);
  if (g && g.k === k && agora >= g.t && agora - g.t < PRAZO_APLICAR) return false;
  if (aplicados.size > 600) {
    for (const [i, v] of aplicados) if (agora - v.t >= PRAZO_APLICAR * 2) aplicados.delete(i);
  }
  aplicados.set(id, { k, t: agora });
  return true;
}

/**
 * Descarta todas as buscas guardadas cuja chave começa com `prefixo` (um sistema que tem várias buscas e cria entidades).
 * @param {string} prefixo
 */
export function esquecerBuscas(prefixo) {
  for (const k of [...guardadas.keys()]) if (k.startsWith(prefixo)) guardadas.delete(k);
}
