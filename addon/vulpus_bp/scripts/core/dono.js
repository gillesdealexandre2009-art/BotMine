// @ts-check
// Dono do servidor: acima da staff e só para o Painel de Dono (sistemas/dono.js). Dono = nome da conta em
// DONOS (config.js, sem diferenciar maiúsculas) ou id na lista salva no mundo (vulpus:donos). Staff comum não
// é dono. O primeiro dono reivindica (só Operador e só sem nenhum dono); depois, só um dono mexe na lista.
// Toda ação do dono, e toda tentativa de quem não é, vai para o log próprio (vulpus:dono:log, as últimas 200)
// e para o Content Log com o prefixo [Vulpus][Dono].
import { PlayerPermissionLevel } from "@minecraft/server";
import { DONOS } from "../config.js";
import { lerMundo, salvarMundo } from "./db.js";
import { registrarErro } from "./util.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ id: string, nome: string, t: number }} DonoRegistrado  t = ms em que virou dono */

/**
 * @typedef {object} LinhaLogDono
 * @property {number} t  ms
 * @property {string} a  quem pediu (nome)
 * @property {string} x  ação
 * @property {string} al  alvo (jogador, time ou guerra)
 * @property {boolean} ok  deu certo
 * @property {string} m  resultado ou motivo do erro (sem códigos §)
 */

const CHAVE_DONOS = "vulpus:donos";
const CHAVE_LOG = "vulpus:dono:log";
const DONOS_MAXIMO = 20;
const LOG_MAXIMO = 200;
/** Teto do log em caracteres (o db.js não grava acima de 30.000): as linhas mais velhas saem antes. */
const LOG_CARACTERES = 28000;

/** @type {DonoRegistrado[] | undefined} */
let cache;

/**
 * Texto sem códigos § e cortado.
 * @param {unknown} v
 * @param {number} max
 */
const curto = (v, max) => (typeof v === "string" ? v.replace(/§./g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * Donos salvos no mundo (cópia; a config DONOS fica de fora).
 * @returns {DonoRegistrado[]}
 */
export function donosRegistrados() {
  if (!cache) {
    const lido = lerMundo(CHAVE_DONOS, []);
    cache = (Array.isArray(lido) ? lido : [])
      .filter((d) => d && typeof d.id === "string" && d.id !== "")
      .map((d) => ({ id: d.id, nome: curto(d.nome, 32) || "?", t: typeof d.t === "number" && Number.isFinite(d.t) ? d.t : 0 }))
      .slice(0, DONOS_MAXIMO);
  }
  return cache.map((d) => ({ ...d }));
}

/**
 * @param {DonoRegistrado[]} lista
 * @returns {boolean} se gravou
 */
function gravarDonos(lista) {
  try {
    if (!salvarMundo(CHAVE_DONOS, lista)) return false;
  } catch (e) {
    registrarErro("Donos", e);
    return false;
  }
  cache = lista.map((d) => ({ ...d }));
  return true;
}

/**
 * O nome está na config DONOS (sem diferenciar maiúsculas)?
 * @param {string} nome
 */
export function donoPelaConfig(nome) {
  const procurado = nome.toLowerCase();
  return DONOS.some((n) => n.toLowerCase() === procurado);
}

/**
 * É dono? Nome em DONOS ou id na lista do mundo. Staff, operador e tags não contam.
 * Pode ser chamada em modo restrito (só lê).
 * @param {Player} player
 * @returns {boolean}
 */
export function ehDono(player) {
  try {
    if (!player || typeof player.id !== "string") return false;
    return donoPelaConfig(player.name) || donosRegistrados().some((d) => d.id === player.id);
  } catch {
    return false;
  }
}

/**
 * Primeiro dono: só vale se ainda não há nenhum (nem na config) e se quem pede é Operador.
 * @param {Player} player
 * @returns {"ok" | "ja_tem" | "nao_op" | "erro"}
 */
export function reivindicarDono(player) {
  if (DONOS.length || donosRegistrados().length) return "ja_tem";
  let operador = false;
  try {
    operador = player.playerPermissionLevel === PlayerPermissionLevel.Operator;
  } catch {
    operador = false;
  }
  if (!operador) return "nao_op";
  return gravarDonos([{ id: player.id, nome: player.name, t: Date.now() }]) ? "ok" : "erro";
}

/**
 * Um dono adiciona outro (confere de novo quem pede).
 * @param {Player} autor
 * @param {{ id: string, nome: string }} pessoa
 * @returns {"ok" | "sem_permissao" | "ja_e" | "cheio" | "erro"}
 */
export function adicionarDono(autor, pessoa) {
  if (!ehDono(autor)) return "sem_permissao";
  const lista = donosRegistrados();
  if (lista.some((d) => d.id === pessoa.id)) return "ja_e";
  if (lista.length >= DONOS_MAXIMO) return "cheio";
  lista.push({ id: pessoa.id, nome: curto(pessoa.nome, 32) || "?", t: Date.now() });
  return gravarDonos(lista) ? "ok" : "erro";
}

/**
 * Um dono tira outro (ou a si mesmo). O último dono registrado não sai se a config DONOS estiver vazia.
 * @param {Player} autor
 * @param {string} id
 * @returns {"ok" | "sem_permissao" | "nao_e" | "ultimo" | "erro"}
 */
export function removerDono(autor, id) {
  if (!ehDono(autor)) return "sem_permissao";
  const lista = donosRegistrados();
  if (!lista.some((d) => d.id === id)) return "nao_e";
  if (lista.length === 1 && !DONOS.length) return "ultimo";
  return gravarDonos(lista.filter((d) => d.id !== id)) ? "ok" : "erro";
}

/**
 * Registra uma ação do dono (ou a tentativa de quem não é) no log do mundo e no Content Log.
 * @param {string} autor
 * @param {string} acao
 * @param {string} alvo
 * @param {boolean} deuCerto
 * @param {string} [motivo]  resultado, ou por que falhou
 */
export function registrarLogDono(autor, acao, alvo, deuCerto, motivo = "") {
  /** @type {LinhaLogDono} */
  const linha = { t: Date.now(), a: curto(autor, 32) || "?", x: curto(acao, 40), al: curto(alvo, 60), ok: deuCerto, m: curto(motivo, 140) };
  console.warn(`[Vulpus][Dono] ${linha.a} | ${linha.x} | ${linha.al || "-"} | ${deuCerto ? "ok" : "erro"}${linha.m ? ` | ${linha.m}` : ""}`);
  const lista = [linha, ...logDono()].slice(0, LOG_MAXIMO);
  while (lista.length > 1 && JSON.stringify(lista).length > LOG_CARACTERES) lista.pop();
  try {
    salvarMundo(CHAVE_LOG, lista);
  } catch (e) {
    registrarErro("Log do dono", e);
  }
}

/**
 * Log do dono, o mais novo primeiro (linhas quebradas ficam de fora).
 * @returns {LinhaLogDono[]}
 */
export function logDono() {
  const lido = lerMundo(CHAVE_LOG, []);
  return (Array.isArray(lido) ? lido : [])
    .filter((l) => l && typeof l.t === "number" && typeof l.a === "string" && typeof l.x === "string")
    .map((l) => ({ t: l.t, a: l.a, x: l.x, al: typeof l.al === "string" ? l.al : "", ok: l.ok === true, m: typeof l.m === "string" ? l.m : "" }));
}
