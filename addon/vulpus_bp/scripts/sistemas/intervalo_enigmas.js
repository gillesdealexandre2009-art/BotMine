// @ts-check
// O Intervalo: progresso de cada pessoa (propriedade dinâmica própria) e a lógica pura dos enigmas 4 a 8 da bíblia (ordem dos mapas,
// válvula da raia 4, painéis da Casa de Máquinas, fita da Estação e porta dos nomes). Nada aqui toca em blocos nem em telas: é o que
// os testes conferem sem o jogo.
import { world } from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import * as T from "../textos/intervalo.js";

const PREFIXO = "vulpus:intervalo:";
export const ENIGMAS_N = 5;

// ------------------------------------------------------------------------------------ nomes e respostas (só em código)
/** Só letras e números, sem acento, minúsculo (igual ao do mistério da Vulpus). @param {string} s */
export const normalizar = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Código curto de um texto (para a resposta não ficar à vista no estado salvo). @param {string} s */
export function codigo(s) {
  let a = 0x2c9277b5;
  let b = 7919;
  for (const ch of s) {
    a = Math.imul(a ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    b = (Math.imul(b, 31) + ch.charCodeAt(0)) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

/** Os códigos dos quatro nomes e o da palavra da fita (o estado salvo guarda só "bit lembrado"). */
export const COD_NOMES = T.NOMES.map((n) => codigo(normalizar(n)));
export const COD_FITA = codigo(normalizar(T.PALAVRA_FITA));

// ------------------------------------------------------------------------------------ progresso por pessoa
/**
 * v: versão · e: já entrou · r: bits das regiões visitadas · n: bits dos nomes lembrados · l: bits dos registros lidos (R-1 = bit 0)
 * z: bits dos enigmas resolvidos (4 = bit 0) · f: concluiu · c: resolveu o enigma 6 em dupla · d: nível da dica de cada enigma (0-3)
 * t: segundos passados dentro de cada região (as dicas sozinhas contam daqui)
 * @typedef {{ v: number, e: number, r: number, n: number, l: number, z: number, f: number, c: number, d: number[], t: number[] }} Prog
 */

/** @type {Map<string, Prog>} */
const cache = new Map();

/** @param {any} s @returns {Prog} */
function normalizarProg(s) {
  const num = (/** @type {any} */ v, /** @type {number} */ max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  const lista = (/** @type {any} */ v, /** @type {number} */ max) => Array.from({ length: ENIGMAS_N }, (_, i) => (Array.isArray(v) ? num(v[i], max) : 0));
  return {
    v: 1,
    e: num(s?.e, 1),
    r: num(s?.r, 31),
    n: num(s?.n, 15),
    l: num(s?.l, 1023),
    z: num(s?.z, 31),
    f: num(s?.f, 1),
    c: num(s?.c, 1),
    d: lista(s?.d, 3),
    t: lista(s?.t, 86400),
  };
}

/** Progresso de uma pessoa (a mesma cópia em memória, que se grava com `salvar`). @param {string} id */
export function prog(id) {
  let p = cache.get(id);
  if (!p) {
    p = normalizarProg(lerMundo(PREFIXO + id));
    cache.set(id, p);
  }
  return p;
}

/** @param {string} id */
export function salvar(id) {
  salvarMundo(PREFIXO + id, prog(id));
}

/** Primeira vez que a pessoa entra? Marca e grava. @param {string} id */
export function marcarEntrou(id) {
  const p = prog(id);
  if (p.e) return false;
  p.e = 1;
  salvar(id);
  return true;
}

/** @param {string} id @param {number} regiao @returns {boolean} true se era a primeira vez nessa região */
export function marcarRegiao(id, regiao) {
  const p = prog(id);
  const bit = 1 << regiao;
  if (p.r & bit) return false;
  p.r |= bit;
  salvar(id);
  return true;
}

/** Marca um registro (1 a 10) como lido. Reler é sempre permitido (R11). @param {string} id @param {number} n @returns {boolean} true se era a primeira leitura */
export function lerRegistro(id, n) {
  const p = prog(id);
  const bit = 1 << (n - 1);
  if (p.l & bit) return false;
  p.l |= bit;
  salvar(id);
  return true;
}
export const registroLido = (/** @type {string} */ id, /** @type {number} */ n) => (prog(id).l & (1 << (n - 1))) !== 0;
export const quantosRegistros = (/** @type {string} */ id) => contarBits(prog(id).l);

/** @param {number} v */
function contarBits(v) {
  let n = 0;
  for (let x = v; x; x >>= 1) n += x & 1;
  return n;
}

/** Guarda um nome (índice em T.NOMES). @param {string} id @param {number} i @returns {boolean} true se era novo */
export function lembrarNome(id, i) {
  const p = prog(id);
  const bit = 1 << i;
  if (p.n & bit) return false;
  p.n |= bit;
  salvar(id);
  return true;
}
export const nomesLembrados = (/** @type {string} */ id) => contarBits(prog(id).n);
export const sabeNome = (/** @type {string} */ id, /** @type {number} */ i) => (prog(id).n & (1 << i)) !== 0;

/** @param {string} id @param {number} k enigma 0-4 (o 4 ao 8 da bíblia) */
export const resolvido = (id, k) => (prog(id).z & (1 << k)) !== 0;

/** @param {string} id @param {number} k @returns {boolean} true se era a primeira vez */
export function resolver(id, k) {
  const p = prog(id);
  const bit = 1 << k;
  if (p.z & bit) return false;
  p.z |= bit;
  salvar(id);
  return true;
}

/** @param {string} id */
export function concluir(id) {
  const p = prog(id);
  if (p.f) return false;
  p.f = 1;
  salvar(id);
  return true;
}

/** @param {string} id */
export const concluiu = (id) => prog(id).f === 1;

/** Marca que o enigma 6 foi resolvido em dupla (libera o livro com final, R-7). @param {string} id */
export function marcarDupla(id) {
  const p = prog(id);
  if (p.c) return;
  p.c = 1;
  salvar(id);
}
export const resolveuEmDupla = (/** @type {string} */ id) => prog(id).c === 1;

// ------------------------------------------------------------------------------------ dicas (3 por enigma)
/** @param {string} id @param {number} k */
export const nivelDica = (id, k) => prog(id).d[k];

/** Mostra a próxima dica (no máximo 3). @param {string} id @param {number} k @returns {number} o nível novo */
export function subirDica(id, k) {
  const p = prog(id);
  if (p.d[k] >= 3) return 3;
  p.d[k]++;
  salvar(id);
  return p.d[k];
}

/** Dicas já liberadas, em texto. @param {string} id @param {number} k */
export function dicasLiberadas(id, k) {
  return T.ENIGMAS[k].dicas.slice(0, nivelDica(id, k));
}

/**
 * Soma tempo dentro da região; devolve o novo nível da dica sozinha se subiu (0 = não subiu). A dica sozinha só vale enquanto o enigma
 * da região não foi resolvido.
 * @param {string} id @param {number} k  região/enigma 0-4 @param {number} segundos @param {number} minutosPorDica  0 = desligado
 * @returns {number}
 */
export function somarTempo(id, k, segundos, minutosPorDica) {
  const p = prog(id);
  if (resolvido(id, k)) return 0;
  p.t[k] += segundos;
  let subiu = 0;
  if (minutosPorDica > 0) {
    const alvo = Math.min(3, Math.floor(p.t[k] / (minutosPorDica * 60)));
    if (alvo > p.d[k]) {
      p.d[k] = alvo;
      subiu = alvo;
    }
  }
  salvar(id);
  return subiu;
}

// ------------------------------------------------------------------------------------ enigma 4: ordem dos mapas
/** @param {number[]} ordem salas, na ordem posta pela pessoa @returns {"certa" | "errada" | "repetida"} */
export function conferirMapas(ordem) {
  if (new Set(ordem).size !== ordem.length) return "repetida";
  return ordem.length === T.ORDEM_MAPAS.length && ordem.every((s, i) => s === T.ORDEM_MAPAS[i]) ? "certa" : "errada";
}

// ------------------------------------------------------------------------------------ enigma 6: painéis em salas separadas
/**
 * Estado dos painéis (um só para o prédio, na memória: quem gira e quem confirma pode ser pessoas diferentes).
 * @type {{ passo: number, quem: Set<string>, ultimo: number, armadoAte: number }}
 */
const painel6 = { passo: 0, quem: new Set(), ultimo: 0, armadoAte: 0 };
/** Sem girar o interruptor seguinte por tanto tempo (ms), a sequência recomeça. */
const PACIENCIA_MS = 90000;

export function reiniciarPainel6() {
  painel6.passo = 0;
  painel6.quem.clear();
  painel6.ultimo = 0;
  painel6.armadoAte = 0;
}
export const estadoPainel6 = () => ({ passo: painel6.passo, armado: painel6.armadoAte > 0, quem: [...painel6.quem] });

/**
 * Gira o interruptor k (1 a 4).
 * @param {string} id @param {number} k @param {number} agora ms @param {number} janelaMs  quanto o painel espera a confirmação
 * @returns {"certo" | "errado" | "armado" | "ja"}
 */
export function girarInterruptor(id, k, agora, janelaMs) {
  if (painel6.armadoAte > 0) {
    if (agora < painel6.armadoAte) return "ja";
    reiniciarPainel6();
  }
  if (painel6.passo > 0 && agora - painel6.ultimo > PACIENCIA_MS) reiniciarPainel6();
  if (k !== T.ORDEM_INTERRUPTORES[painel6.passo]) {
    reiniciarPainel6();
    return "errado";
  }
  painel6.passo++;
  painel6.quem.add(id);
  painel6.ultimo = agora;
  if (painel6.passo >= T.ORDEM_INTERRUPTORES.length) {
    painel6.armadoAte = agora + janelaMs;
    return "armado";
  }
  return "certo";
}

/**
 * Confirma no painel das luzes. Quem girou e quem confirmou resolvem juntos; se foram pessoas diferentes, é em dupla.
 * @param {string} id @param {number} agora ms
 * @returns {{ res: "sem" | "tarde" | "ok", todos: string[], dupla: boolean }}
 */
export function confirmarLuzes(id, agora) {
  if (painel6.armadoAte === 0) return { res: "sem", todos: [], dupla: false };
  if (agora >= painel6.armadoAte) {
    reiniciarPainel6();
    return { res: "tarde", todos: [], dupla: false };
  }
  const todos = [...new Set([id, ...painel6.quem])];
  const dupla = todos.length > 1;
  reiniciarPainel6();
  return { res: "ok", todos, dupla };
}

// ------------------------------------------------------------------------------------ enigma 7: a fita
/** @param {string} texto */
export const acertouFita = (texto) => codigo(normalizar(texto)) === COD_FITA;

// ------------------------------------------------------------------------------------ enigma 8: a porta dos nomes
/**
 * Confere os nomes digitados: qualquer ordem, sem acento nem maiúsculas, e vários nomes no mesmo campo. Só vale o nome que a pessoa já encontrou no prédio.
 * @param {string} id
 * @param {string[]} digitados
 * @returns {{ certos: number[], naoVistos: number[], completo: boolean }} índices (em T.NOMES) reconhecidos; naoVistos = certos que a pessoa ainda não encontrou no prédio
 */
export function conferirNomes(id, digitados) {
  const certos = new Set();
  const naoVistos = new Set();
  // cada campo pode trazer mais de um nome ("Tomás e Marta") ou o nome com sobrenome/enfeite ("Beto, o menino"): vale cada palavra
  for (const d of digitados) {
    const palavras = d.split(/[^\p{L}\p{N}]+/u).map(normalizar).filter(Boolean);
    for (const n of [normalizar(d), ...palavras]) {
      const i = COD_NOMES.indexOf(codigo(n));
      if (i < 0) continue;
      if (sabeNome(id, i)) certos.add(i);
      else naoVistos.add(i);
    }
  }
  return { certos: [...certos], naoVistos: [...naoVistos], completo: certos.size === COD_NOMES.length };
}

// ------------------------------------------------------------------------------------ zerar e contar
/** @param {string} id */
export function zerar(id) {
  cache.delete(id);
  salvarMundo(PREFIXO + id, undefined);
}

/** Apaga o progresso de todos. @returns {number} quantos */
export function zerarTodos() {
  let n = 0;
  for (const chave of world.getDynamicPropertyIds()) {
    if (!chave.startsWith(PREFIXO)) continue;
    salvarMundo(chave, undefined);
    n++;
  }
  cache.clear();
  reiniciarPainel6();
  return n;
}

/** @returns {{ comecaram: number, concluiram: number }} */
export function estatisticas() {
  let comecaram = 0, concluiram = 0;
  for (const chave of world.getDynamicPropertyIds()) {
    if (!chave.startsWith(PREFIXO)) continue;
    const p = prog(chave.slice(PREFIXO.length));
    if (p.e) comecaram++;
    if (p.f) concluiram++;
  }
  return { comecaram, concluiram };
}
