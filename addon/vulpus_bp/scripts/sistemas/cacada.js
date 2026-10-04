// @ts-check
// Caçada: recompensa (em Caudas) na cabeça de alguém. Quem põe paga o valor + a taxa na hora; quem der o
// golpe final em PvP leva tudo, menos se for do mesmo clã da vítima, de clã aliado ou um dos pagadores.
// Anti-farm: a vítima precisa estar viva há cacadaVidaMin e cada matador coleta da mesma vítima 1 vez a cada
// cacadaRecargaHoras. Cada parte expira em cacadaDuracaoDias e volta para quem pagou (sem a taxa), até offline.
// Paralela à guerra e ao CTF: só lê o clã e os aliados (cla_dados.js), não mexe em pontos.
// Dados no mundo: vulpus:cacada:c:<id da vítima> (uma cabeça), vulpus:cacada (mortes e coletas recentes),
// vulpus:cacada:rank (caçadores) e vulpus:cacada:log. Toda mudança confere tudo de novo e grava antes de
// mexer no saldo, sem await no meio (clique duplo, formulário velho e /reload não duplicam nem perdem Caudas).
import { Player, system, world } from "@minecraft/server";
import { ICONES, PREFIXO_JOGADOR, SONS } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, lerMundo, salvarMundo, todosJogadores } from "../core/db.js";
import { anel, emitir, nuvem } from "../core/efeitos.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { online, porId, porNome } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro, som } from "../core/util.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/cacada.js";
import { adicionarCaudas, adicionarSecaoCaudas, saldo } from "./caudas.js";
import { claDe } from "./cla_dados.js";
import { atualizarIdentidade, registrarMarcaNome } from "./identidade.js";

/** @typedef {{ id: string, nome: string, v: number, t: number }} Pagador  t = ms da última vez que pôs (o prazo da parte conta daí) */
/**
 * @typedef {object} Cabeca
 * @property {number} v  versão do formato (1)
 * @property {string} id  id da vítima
 * @property {string} nome  nome da vítima
 * @property {number} criada  ms da primeira recompensa
 * @property {Pagador[]} pagadores
 * @property {boolean} anunciada  já anunciei que passou de cacadaAnuncio
 */
/** @typedef {{ mortes: Record<string, number>, coletas: Record<string, number> }} Meta  coletas: "matador|vítima" → ms */
/** @typedef {Record<string, { nome: string, total: number, n: number }>} Ranking */
/** @typedef {{ t: number, k: "colocou" | "coletou" | "expirou" | "removeu", a: string, v: string, n: number }} Registro */
/** @typedef {{ id: string, nome: string }} Pessoa */

const PREFIXO = "vulpus:cacada:c:";
const CHAVE_META = "vulpus:cacada";
const CHAVE_RANK = "vulpus:cacada:rank";
const CHAVE_LOG = "vulpus:cacada:log";
/** Tetos (mantêm cada JSON bem abaixo do limite de 30.000 caracteres). */
export const LIMITES = Object.freeze({
  pagadores: 20,
  cabecas: 300,
  total: 100_000_000,
  nome: 32,
  mortes: 150,
  coletas: 300,
  cacadores: 50,
  log: 100,
  logCaracteres: 20000,
  mural: 30,
  historico: 10,
});
const MIN_MS = 60 * 1000;
const HORA_MS = 60 * MIN_MS;
const DIA_MS = 24 * HORA_MS;
/** Mortes mais velhas que isso não interessam (cacadaVidaMin vai até 120). */
const MORTE_GUARDA_MS = 3 * HORA_MS;
const TICKS_EXPIRAR = 600;
const P = Object.freeze({ CHAMA: "minecraft:colored_flame_particle", TOTEM: "minecraft:totem_particle", FAISCA: "minecraft:endrod" });
const VERMELHO = { red: 0.85, green: 0.12, blue: 0.1 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };

/** @type {Map<string, Cabeca>} id da vítima → cabeça (montado do mundo na primeira leitura) */
const cabecas = new Map();
let carregado = false;
/** @type {Meta | undefined} */
let meta;
/** @type {Map<string, number>} id → número do fluxo aberto (o formulário mais novo vale; o velho é recusado) */
const fluxos = new Map();
let proximoFluxo = 1;

// ---------------------------------------------------------------- leitura e validação

/** @param {unknown} v */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** @param {unknown} v @param {number} max */
const texto = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Cabeça lida do mundo, com campo errado consertado; undefined se não sobrar nenhum pagador válido.
 * Pagador repetido é somado; valor fora da faixa ou sem id sai.
 * @param {any} lido
 * @param {string} id
 * @returns {Cabeca | undefined}
 */
function completarCabeca(lido, id) {
  if (!lido || typeof lido !== "object" || !Array.isArray(lido.pagadores)) return undefined;
  /** @type {Map<string, Pagador>} */
  const porPagador = new Map();
  for (const p of lido.pagadores) {
    if (!p || typeof p !== "object" || typeof p.id !== "string" || !p.id || p.id === id) continue;
    const v = Math.floor(num(p.v));
    if (v <= 0 || v > LIMITES.total) continue;
    const antes = porPagador.get(p.id);
    if (antes) antes.v = Math.min(LIMITES.total, antes.v + v);
    else porPagador.set(p.id, { id: p.id, nome: texto(p.nome, LIMITES.nome) || "?", v, t: num(p.t) });
  }
  const pagadores = [...porPagador.values()].slice(0, LIMITES.pagadores);
  if (!pagadores.length) return undefined;
  return {
    v: 1,
    id,
    nome: texto(lido.nome, LIMITES.nome) || dadosJogador(id).nome || "?",
    criada: num(lido.criada) || Math.min(...pagadores.map((p) => p.t)),
    pagadores,
    anunciada: lido.anunciada === true,
  };
}

function carregar() {
  if (carregado) return;
  for (const chave of world.getDynamicPropertyIds()) {
    if (!chave.startsWith(PREFIXO)) continue;
    const id = chave.slice(PREFIXO.length);
    const c = completarCabeca(lerMundo(chave), id);
    if (c) cabecas.set(id, c);
  }
  carregado = true;
}

/**
 * Registro de mortes e coletas recentes (sem o que já passou do prazo).
 * @returns {Meta}
 */
function lerMeta() {
  if (meta) return meta;
  const lido = lerMundo(CHAVE_META, {});
  /** @param {any} obj */
  const mapa = (obj) => {
    /** @type {Record<string, number>} */
    const saida = {};
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) if (typeof v === "number" && Number.isFinite(v)) saida[k] = v;
    }
    return saida;
  };
  meta = { mortes: mapa(lido?.mortes), coletas: mapa(lido?.coletas) };
  return meta;
}

/**
 * Mantém só as entradas mais novas que o prazo e no máximo `max` (as mais recentes).
 * @param {Record<string, number>} mapa
 * @param {number} desde  ms
 * @param {number} max
 */
function podar(mapa, desde, max) {
  const vivas = Object.entries(mapa)
    .filter(([, t]) => t >= desde)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
  return Object.fromEntries(vivas);
}

function salvarMeta() {
  const m = lerMeta();
  const agora = Date.now();
  m.mortes = podar(m.mortes, agora - MORTE_GUARDA_MS, LIMITES.mortes);
  m.coletas = podar(m.coletas, agora - Math.max(0, num(config().cacadaRecargaHoras)) * HORA_MS, LIMITES.coletas);
  salvarMundo(CHAVE_META, m);
}

/** @returns {Ranking} */
function lerRanking() {
  const lido = lerMundo(CHAVE_RANK, {});
  /** @type {Ranking} */
  const saida = {};
  if (!lido || typeof lido !== "object" || Array.isArray(lido)) return saida;
  for (const [id, r] of Object.entries(lido)) {
    if (!r || typeof r !== "object") continue;
    const total = Math.floor(num(r.total));
    if (total > 0) saida[id] = { nome: texto(r.nome, LIMITES.nome) || "?", total, n: Math.max(1, Math.floor(num(r.n))) };
  }
  return saida;
}

/** @returns {Registro[]} o mais novo primeiro */
export function logCacada() {
  const lido = lerMundo(CHAVE_LOG, []);
  if (!Array.isArray(lido)) return [];
  return lido
    .filter((r) => r && typeof r === "object" && ["colocou", "coletou", "expirou", "removeu"].includes(r.k))
    .map((r) => ({ t: num(r.t), k: r.k, a: texto(r.a, LIMITES.nome), v: texto(r.v, LIMITES.nome), n: Math.floor(num(r.n)) }))
    .slice(0, LIMITES.log);
}

/**
 * @param {Registro["k"]} k
 * @param {string} autor
 * @param {string} vitima
 * @param {number} valor
 */
function registrar(k, autor, vitima, valor) {
  const novo = { t: Date.now(), k, a: autor.slice(0, LIMITES.nome), v: vitima.slice(0, LIMITES.nome), n: valor };
  const log = [novo, ...logCacada()].slice(0, LIMITES.log);
  while (log.length > 1 && JSON.stringify(log).length > LIMITES.logCaracteres) log.pop();
  salvarMundo(CHAVE_LOG, log);
}

// ---------------------------------------------------------------- consultas

/** @param {Cabeca} c */
export const totalDe = (c) => c.pagadores.reduce((s, p) => s + p.v, 0);

/** @param {string} id @returns {Cabeca | undefined} */
export function cabecaDe(id) {
  carregar();
  return cabecas.get(id);
}

/**
 * Quanto vale a cabeça de alguém agora (0 = nada).
 * @param {string} id
 */
export function valorCabeca(id) {
  const c = cabecaDe(id);
  return c ? totalDe(c) : 0;
}

/** Cabeças a prêmio, da mais valiosa para a menor (empate: a mais antiga). @returns {Cabeca[]} */
export function cabecasAtivas() {
  carregar();
  return [...cabecas.values()].sort((a, b) => totalDe(b) - totalDe(a) || a.criada - b.criada);
}

/**
 * Em quantas cabeças a pessoa tem parte (o limite de recompensas ativas).
 * @param {string} id
 */
export function ativasDe(id) {
  carregar();
  let n = 0;
  for (const c of cabecas.values()) if (c.pagadores.some((p) => p.id === id)) n++;
  return n;
}

/**
 * Taxa (arredondada para cima) e o que sai do saldo.
 * @param {number} valor
 */
export function custoDe(valor) {
  const taxa = Math.ceil((valor * Math.max(0, num(config().cacadaTaxaPct))) / 100);
  return { taxa, custo: valor + taxa };
}

/** ms de duração de cada parte. */
const duracaoMs = () => Math.max(1, num(config().cacadaDuracaoDias)) * DIA_MS;

/**
 * Quanto falta para a parte mais antiga voltar para quem pagou.
 * @param {Cabeca} c
 * @param {number} [agora]
 */
export function msAteExpirar(c, agora = Date.now()) {
  return Math.max(0, Math.min(...c.pagadores.map((p) => p.t)) + duracaoMs() - agora);
}

/**
 * Pessoa registrada pelo nome: online primeiro, depois quem já entrou na toca.
 * @param {string} bruto
 * @returns {Pessoa | undefined}
 */
export function acharPessoa(bruto) {
  const nome = String(bruto ?? "").trim().replace(/^@/, "").replace(/^"(.*)"$/, "$1");
  if (!nome) return undefined;
  const conectado = porNome(nome);
  if (conectado) return { id: conectado.id, nome: conectado.name };
  const procurado = nome.toLowerCase();
  const registrado = todosJogadores().find((j) => j.dados.primeira > 0 && j.dados.nome.toLowerCase() === procurado);
  return registrado ? { id: registrado.id, nome: registrado.dados.nome } : undefined;
}

/** @param {string} id */
const registrado = (id) => !!porId(id) || (world.getDynamicProperty(PREFIXO_JOGADOR + id) !== undefined && dadosJogador(id).primeira > 0);

// ---------------------------------------------------------------- gravação

/**
 * Grava a cabeça (ou apaga, sem pagadores) e só então troca a memória.
 * @param {string} id
 * @param {Cabeca | undefined} c
 * @returns {boolean} se gravou
 */
function gravar(id, c) {
  carregar();
  if (!c || !c.pagadores.length) {
    salvarMundo(PREFIXO + id, undefined);
    cabecas.delete(id);
  } else {
    if (!salvarMundo(PREFIXO + id, c)) return false;
    cabecas.set(id, c);
  }
  atualizarNome(id);
  return true;
}

/** @param {string} id */
function atualizarNome(id) {
  const p = porId(id);
  if (!p) return;
  try {
    atualizarIdentidade(p);
  } catch (e) {
    registrarErro("Caçada: nameTag", e);
  }
}

/** @param {Cabeca} c @returns {Cabeca} */
const copiar = (c) => ({ ...c, pagadores: c.pagadores.map((p) => ({ ...p })) });

// ---------------------------------------------------------------- fluxos (formulário velho)

/**
 * Abre um fluxo novo para a pessoa: o anterior (formulário ainda aberto, clique duplo) deixa de valer.
 * @param {Player} player
 */
export function novoFluxo(player) {
  const n = proximoFluxo++;
  fluxos.set(player.id, n);
  return n;
}

/**
 * Consome o fluxo: true só para o mais novo, e uma vez só.
 * @param {Player} player
 * @param {number} n
 */
function usarFluxo(player, n) {
  if (fluxos.get(player.id) !== n) return false;
  fluxos.delete(player.id);
  return true;
}

// ---------------------------------------------------------------- pôr recompensa

/**
 * Por que a pessoa não pode pôr `valor` na cabeça do alvo agora; undefined se pode.
 * @param {Player} player
 * @param {Pessoa} alvo
 * @param {number} valor
 * @returns {string | undefined}
 */
export function problemaColocar(player, alvo, valor) {
  const cfg = config();
  if (!cfg.cacadaLigada) return textos.FECHADA;
  if (alvo.id === player.id) return textos.PROPRIA;
  const min = Math.max(1, Math.floor(cfg.cacadaMinimo));
  const max = Math.max(min, Math.floor(cfg.cacadaMaximo));
  if (!Number.isInteger(valor) || valor < min || valor > max) return textos.VALOR_INVALIDO(min, max);
  if (!registrado(alvo.id)) return textos.SEM_REGISTRO;
  const c = cabecaDe(alvo.id);
  const jaPaga = !!c?.pagadores.some((p) => p.id === player.id);
  const limite = Math.max(1, Math.floor(cfg.cacadaLimite));
  if (!jaPaga && ativasDe(player.id) >= limite) return textos.LIMITE(limite);
  if (!c && cabecas.size >= LIMITES.cabecas) return textos.MURAL_CHEIO;
  if (c && !jaPaga && c.pagadores.length >= LIMITES.pagadores) return textos.PAGADORES_CHEIO;
  if ((c ? totalDe(c) : 0) + valor > LIMITES.total) return textos.TETO;
  const { custo } = custoDe(valor);
  if (saldo(player) < custo) return textos.SEM_SALDO(custo);
  return undefined;
}

/**
 * Põe a recompensa: confere tudo de novo, grava a cabeça e só então tira do saldo (valor + taxa).
 * @param {Player} player
 * @param {Pessoa} alvo
 * @param {number} valor
 * @param {{ custo?: number, fluxo?: number }} [visto]  o custo mostrado na confirmação e o fluxo dela
 * @returns {boolean}
 */
export function colocarRecompensa(player, alvo, valor, visto = {}) {
  if (visto.fluxo !== undefined && !usarFluxo(player, visto.fluxo)) return falhar(player, textos.VELHO);
  const problema = problemaColocar(player, alvo, valor);
  if (problema) return falhar(player, problema);
  const { custo } = custoDe(valor);
  if (visto.custo !== undefined && visto.custo !== custo) return falhar(player, textos.MUDOU);
  const agora = Date.now();
  const antes = cabecaDe(alvo.id);
  const c = antes ? copiar(antes) : { v: 1, id: alvo.id, nome: alvo.nome, criada: agora, pagadores: [], anunciada: false };
  c.nome = alvo.nome.slice(0, LIMITES.nome);
  const minha = c.pagadores.find((p) => p.id === player.id);
  if (minha) {
    minha.v += valor;
    minha.t = agora;
    minha.nome = player.name;
  } else c.pagadores.push({ id: player.id, nome: player.name.slice(0, LIMITES.nome), v: valor, t: agora });
  const total = totalDe(c);
  const limiar = Math.max(0, Math.floor(config().cacadaAnuncio));
  const anunciar = limiar > 0 && !c.anunciada && total >= limiar;
  if (anunciar) c.anunciada = true;
  if (!gravar(alvo.id, c)) return falhar(player, geral.ERRO_INTERNO);
  adicionarCaudas(player, -custo);
  registrar("colocou", player.name, c.nome, valor);
  ok(player, textos.COLOCOU(c.nome, valor, total, custo));
  const vitima = porId(alvo.id);
  if (vitima) {
    msg(vitima, textos.AVISO_VITIMA(total));
    som(vitima, SONS.cacada);
  }
  if (anunciar) anunciarTodos(textos.ANUNCIO_SUBIU(c.nome, total), SONS.cacada);
  return true;
}

/**
 * @param {Player} player
 * @param {string} texto
 * @returns {false}
 */
function falhar(player, texto) {
  erro(player, texto);
  return false;
}

/**
 * @param {string} texto
 * @param {string} idSom
 */
function anunciarTodos(texto, idSom) {
  for (const p of online()) {
    msg(p, texto);
    som(p, idSom);
  }
}

// ---------------------------------------------------------------- coletar

/**
 * Quem deu o golpe final: o jogador, ou quem atirou o projétil.
 * @param {import("@minecraft/server").EntityDamageSource} fonte
 * @returns {Player | undefined}
 */
function matadorDe(fonte) {
  if (fonte.damagingEntity instanceof Player) return fonte.damagingEntity;
  try {
    const dono = fonte.damagingProjectile?.getComponent("minecraft:projectile")?.owner;
    return dono instanceof Player ? dono : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Por que a morte não paga a recompensa (texto para quem matou), ou undefined se paga.
 * @param {Cabeca} c
 * @param {Player} vitima
 * @param {Player} matador
 * @param {number | undefined} morteAnterior  ms
 * @param {number} agora
 */
function porQueNaoPaga(c, vitima, matador, morteAnterior, agora) {
  const claV = claDe(vitima.id);
  const claM = claDe(matador.id);
  if (claV && claM && claV.id === claM.id) return textos.NAO_MESMO_CLA;
  if (claV && claM && (claV.aliados.includes(claM.id) || claM.aliados.includes(claV.id))) return textos.NAO_ALIADO;
  if (c.pagadores.some((p) => p.id === matador.id)) return textos.NAO_PAGADOR;
  const cfg = config();
  const vida = Math.max(0, num(cfg.cacadaVidaMin)) * MIN_MS;
  if (morteAnterior !== undefined && agora - morteAnterior < vida) return textos.NAO_RECENTE(vida - (agora - morteAnterior));
  const recarga = Math.max(0, num(cfg.cacadaRecargaHoras)) * HORA_MS;
  const ultima = lerMeta().coletas[`${matador.id}|${vitima.id}`];
  if (ultima !== undefined && agora - ultima < recarga) return textos.NAO_RECARGA(recarga - (agora - ultima));
  return undefined;
}

/**
 * Morte de jogador: guarda a hora (vida mínima) e, se a cabeça tem recompensa e quem matou pode cobrar, paga tudo.
 * @param {Player} vitima
 * @param {Player | undefined} matador
 */
function aoMorrer(vitima, matador) {
  const agora = Date.now();
  const m = lerMeta();
  const morteAnterior = m.mortes[vitima.id];
  m.mortes[vitima.id] = agora;
  const c = cabecaDe(vitima.id);
  if (!c || !matador || matador.id === vitima.id) {
    salvarMeta();
    return;
  }
  const motivo = porQueNaoPaga(c, vitima, matador, morteAnterior, agora);
  if (motivo) {
    salvarMeta();
    erro(matador, motivo);
    return;
  }
  const total = totalDe(c);
  // Primeiro tira do mural (apagar não falha por tamanho), depois paga: a mesma cabeça nunca paga duas vezes.
  if (!gravar(vitima.id, undefined)) return;
  m.coletas[`${matador.id}|${vitima.id}`] = agora;
  salvarMeta();
  adicionarCaudas(matador, total);
  const ranking = lerRanking();
  const antes = ranking[matador.id];
  ranking[matador.id] = { nome: matador.name.slice(0, LIMITES.nome), total: (antes?.total ?? 0) + total, n: (antes?.n ?? 0) + 1 };
  salvarMundo(CHAVE_RANK, Object.fromEntries(Object.entries(ranking).sort((a, b) => b[1].total - a[1].total).slice(0, LIMITES.cacadores)));
  registrar("coletou", matador.name, vitima.name, total);
  anunciarTodos(textos.ANUNCIO_CACOU(matador.name, vitima.name, total), SONS.cacada);
  mostrarTitulo(matador, textos.TITULO_CACOU, { subtitulo: textos.SUB_CACOU(total), entrada: 5, fica: 50, saida: 15 });
  som(matador, SONS.cacou);
  for (const p of c.pagadores) {
    const pagador = porId(p.id);
    if (pagador) msg(pagador, textos.PAGADOR_CACOU(vitima.name));
  }
  efeitoCacada(vitima, matador);
}

/**
 * Chamas vermelhas onde a vítima caiu e um estouro dourado em quem caçou (nunca quebra a coleta).
 * @param {Player} vitima
 * @param {Player} matador
 */
function efeitoCacada(vitima, matador) {
  try {
    const c = vitima.location;
    if (anel(vitima.dimension, c, { raio: 1.2, n: 14, y: 0.3 }, P.CHAMA, [VERMELHO])) {
      anel(vitima.dimension, c, { raio: 0.7, n: 8, y: 1.2 }, P.CHAMA, [VERMELHO]);
    }
    if (matador.isValid) {
      const m = matador.location;
      if (nuvem(matador.dimension, m, { n: 16, largura: 0.6, y0: 0.4, alto: 1.8 }, P.TOTEM)) {
        emitir(matador.dimension, P.FAISCA, { x: m.x, y: m.y + 2.4, z: m.z });
        anel(matador.dimension, m, { raio: 0.9, n: 10, y: 0.1 }, P.CHAMA, [DOURADO]);
      }
    }
  } catch (e) {
    registrarErro("Caçada: efeito", e);
  }
}

// ---------------------------------------------------------------- expirar e staff

/**
 * Devolve (sem a taxa) as partes que passaram do prazo. Grava a cabeça antes de devolver.
 * @param {number} [agora]
 * @returns {number} quantas partes voltaram
 */
export function expirar(agora = Date.now()) {
  const prazo = duracaoMs();
  let n = 0;
  for (const c of cabecasAtivas()) {
    const vencidas = c.pagadores.filter((p) => agora - p.t >= prazo);
    if (!vencidas.length) continue;
    const nova = copiar(c);
    nova.pagadores = nova.pagadores.filter((p) => agora - p.t < prazo);
    if (totalDe(nova) < Math.max(0, Math.floor(config().cacadaAnuncio))) nova.anunciada = false;
    if (!gravar(c.id, nova.pagadores.length ? nova : undefined)) continue;
    for (const p of vencidas) {
      adicionarCaudas(p.id, p.v, textos.MOTIVO_EXPIROU);
      registrar("expirou", p.nome, c.nome, p.v);
      n++;
    }
  }
  return n;
}

/**
 * Staff tira a cabeça do mural e devolve tudo a quem pagou (sem a taxa).
 * @param {Player} staff
 * @param {string} vitimaId
 * @returns {boolean}
 */
export function removerRecompensa(staff, vitimaId) {
  if (!ehStaff(staff)) return falhar(staff, geral.SO_STAFF);
  const c = cabecaDe(vitimaId);
  if (!c) return falhar(staff, textos.JA_NAO_EXISTE);
  const total = totalDe(c);
  if (!gravar(vitimaId, undefined)) return falhar(staff, geral.ERRO_INTERNO);
  for (const p of c.pagadores) adicionarCaudas(p.id, p.v, textos.MOTIVO_REMOVIDA);
  registrar("removeu", staff.name, c.nome, total);
  ok(staff, textos.REMOVEU(c.nome, total, c.pagadores.length));
  return true;
}

// ---------------------------------------------------------------- menus

/**
 * Mural: a sua cabeça, as cabeças a prêmio (da mais valiosa), pôr recompensa, ranking, histórico e regras.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuCacada(player, voltar) {
  const aqui = () => menuCacada(player, voltar);
  const cfg = config();
  const ativas = cabecasAtivas();
  const conectados = new Set(online().map((p) => p.id));
  const agora = Date.now();
  const lista = new Lista(textos.TITULO).texto(
    textos.CORPO({
      minha: valorCabeca(player.id),
      ativas: ativasDe(player.id),
      limite: Math.max(1, Math.floor(cfg.cacadaLimite)),
      ligada: cfg.cacadaLigada,
    }),
  );
  if (cfg.cacadaLigada) lista.botao(textos.BOTAO_COLOCAR, ICONES.cacada, (p) => fluxoColocar(p, aqui));
  lista
    .botao(textos.BOTAO_CACADORES, ICONES.ranking, (p) => menuCacadores(p, aqui))
    .botao(textos.BOTAO_HISTORICO, ICONES.historico, (p) => menuHistorico(p, aqui))
    .botao(textos.BOTAO_COMO, ICONES.lore, (p) => new Lista(textos.BOTAO_COMO).texto(textos.COMO(config())).voltar(aqui).abrir(p));
  lista.cabecalho(textos.CABECALHO_CABECAS);
  if (!ativas.length) lista.rotulo(textos.MURAL_VAZIO);
  for (const c of ativas.slice(0, LIMITES.mural)) {
    const id = c.id;
    lista.botao(
      textos.BOTAO_CABECA({
        nome: c.nome,
        total: totalDe(c),
        online: conectados.has(id),
        voce: id === player.id,
        msExpira: msAteExpirar(c, agora),
      }),
      ICONES.cabeca,
      (p) => menuCabeca(p, id, aqui),
    );
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Ficha de uma cabeça (os pagadores ficam em segredo; cada um vê a própria parte).
 * @param {Player} player
 * @param {string} id
 * @param {() => any} voltar
 */
async function menuCabeca(player, id, voltar) {
  const c = cabecaDe(id);
  if (!c) {
    msg(player, textos.JA_NAO_EXISTE);
    return voltar();
  }
  const aqui = () => menuCabeca(player, id, voltar);
  const lista = new Lista(textos.TITULO_CABECA(c.nome)).texto(
    textos.CORPO_CABECA({
      nome: c.nome,
      total: totalDe(c),
      pagadores: c.pagadores.length,
      criada: c.criada,
      msExpira: msAteExpirar(c),
      minha: c.pagadores.find((p) => p.id === player.id)?.v ?? 0,
      online: !!porId(id),
      voce: id === player.id,
    }),
  );
  if (id !== player.id && config().cacadaLigada) {
    const alvo = { id, nome: c.nome };
    lista.botao(textos.BOTAO_AUMENTAR, ICONES.cacada, (p) => fluxoValor(p, alvo, aqui, novoFluxo(p)));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Escolher a cabeça: quem está online, ou procurar pelo nome (vale offline).
 * @param {Player} player
 * @param {() => any} voltar
 */
async function fluxoColocar(player, voltar) {
  const fluxo = novoFluxo(player);
  const pessoas = online()
    .filter((p) => p.id !== player.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const lista = new Lista(textos.TITULO_ESCOLHER).texto(pessoas.length ? textos.ESCOLHER_CORPO : textos.NINGUEM_ONLINE);
  lista.botao(textos.BOTAO_PROCURAR, ICONES.buscar, async (p) => {
    const r = await perguntar(p, textos.TITULO_PROCURAR, [{ tipo: "texto", rotulo: textos.ROTULO_NOME, dica: textos.DICA_NOME }]);
    if (!r || !r[0]) return voltar();
    const alvo = acharPessoa(r[0]);
    if (!alvo) {
      erro(p, textos.NAO_ACHEI);
      return voltar();
    }
    await fluxoValor(p, alvo, voltar, fluxo);
  });
  for (const pessoa of pessoas) {
    const alvo = { id: pessoa.id, nome: pessoa.name };
    const valor = valorCabeca(pessoa.id);
    const rotulo = valor ? `${pessoa.name} §8» §6${textos.curto(valor)}` : pessoa.name;
    lista.botao(rotulo, ICONES.jogador, (p) => fluxoValor(p, alvo, voltar, fluxo));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Valor e confirmação; a recompensa só sai se este ainda for o formulário mais novo da pessoa.
 * @param {Player} player
 * @param {Pessoa} alvo
 * @param {() => any} voltar
 * @param {number} fluxo
 */
async function fluxoValor(player, alvo, voltar, fluxo) {
  const cfg = config();
  const min = Math.max(1, Math.floor(cfg.cacadaMinimo));
  const max = Math.max(min, Math.floor(cfg.cacadaMaximo));
  if (alvo.id === player.id) {
    erro(player, textos.PROPRIA);
    return voltar();
  }
  const r = await perguntar(player, textos.TITULO_VALOR(alvo.nome), [
    { tipo: "numero", rotulo: textos.ROTULO_VALOR(Math.max(0, num(cfg.cacadaTaxaPct))), padrao: min, min, max },
  ]);
  if (!r) return voltar();
  await confirmarRecompensa(player, alvo, r[0], fluxo);
  await voltar();
}

/**
 * Mostra o custo (valor + taxa) e põe a recompensa se a pessoa confirmar.
 * @param {Player} player
 * @param {Pessoa} alvo
 * @param {number} valor
 * @param {number} fluxo
 * @returns {Promise<boolean>}
 */
async function confirmarRecompensa(player, alvo, valor, fluxo) {
  const problema = problemaColocar(player, alvo, valor);
  if (problema) return falhar(player, problema);
  const { taxa, custo } = custoDe(valor);
  const dias = Math.max(1, num(config().cacadaDuracaoDias));
  const certo = await confirmar(player, {
    titulo: textos.TITULO_CONFIRMAR,
    texto: textos.CONFIRMAR({ nome: alvo.nome, valor, taxa, custo, saldo: saldo(player), dias }),
    sim: textos.BOTAO_PAGAR,
  });
  if (!certo) return false;
  return colocarRecompensa(player, alvo, valor, { custo, fluxo });
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuCacadores(player, voltar) {
  const linhas = Object.entries(lerRanking())
    .sort((a, b) => b[1].total - a[1].total || a[1].nome.localeCompare(b[1].nome))
    .slice(0, 10)
    .map(([id, r], i) => textos.CACADOR_LINHA(i + 1, r.nome, r.total, r.n, id === player.id));
  await new Lista(textos.TITULO_CACADORES).texto(linhas.length ? linhas.join("\n") : textos.CACADORES_VAZIO).voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuHistorico(player, voltar) {
  const linhas = logCacada()
    .filter((r) => r.k === "coletou")
    .slice(0, LIMITES.historico)
    .map(textos.HISTORICO_LINHA);
  await new Lista(textos.TITULO_HISTORICO).texto(linhas.length ? linhas.join("\n") : textos.HISTORICO_VAZIO).voltar(voltar).abrir(player);
}

/**
 * Painel da staff: cada cabeça com quem pagou (tirar devolve tudo) e o log.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuCacadaStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuCacadaStaff(player, voltar);
  const ativas = cabecasAtivas();
  const lista = new Lista(textos.TITULO_STAFF)
    .texto(textos.STAFF_CORPO(ativas.length))
    .botao(textos.BOTAO_LOG, ICONES.historico, async (p) => {
      const log = logCacada().slice(0, 40);
      await new Lista(textos.TITULO_LOG).texto(log.length ? log.map(textos.LOG_LINHA).join("\n") : textos.LOG_VAZIO).voltar(aqui).abrir(p);
    });
  for (const c of ativas) {
    const id = c.id;
    lista.botao(`${c.nome} §8» §6${textos.curto(totalDe(c))}`, ICONES.cabeca, async (p) => {
      const atual = cabecaDe(id);
      if (!atual || !ehStaff(p)) return aqui();
      await new Lista(textos.TITULO_STAFF)
        .texto(textos.STAFF_CABECA(atual.nome, totalDe(atual), atual.pagadores))
        .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (q) => {
          if (await confirmar(q, { titulo: textos.BOTAO_REMOVER, texto: textos.CONFIRMAR_REMOVER(atual.nome) })) removerRecompensa(q, id);
          await aqui();
        })
        .voltar(aqui)
        .abrir(p);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- ganchos, eventos e comandos

adicionarSecaoCaudas({
  titulo: textos.SECAO,
  botoes: [{ texto: () => textos.BOTAO_MURAL(cabecasAtivas().length), icone: ICONES.mural, abrir: menuCacada }],
});

// Caveira e valor curto numa linha em cima do nameTag de quem tem a cabeça a prêmio.
registrarMarcaNome((player) => {
  const valor = valorCabeca(player.id);
  return valor > 0 ? `${textos.CAVEIRA} §c${textos.curto(valor)}` : "";
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    if (deadEntity instanceof Player) aoMorrer(deadEntity, matadorDe(damageSource));
  } catch (e) {
    registrarErro("Caçada: morte", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  fluxos.delete(playerId);
});

system.runInterval(() => {
  try {
    expirar();
  } catch (e) {
    registrarErro("Caçada: prazo", e);
  }
}, TICKS_EXPIRAR);

registrarComando({ nome: "cacada", descricao: textos.DESC_CACADA }, (p) => menuCacada(p));
registrarComando(
  {
    nome: "recompensa",
    descricao: textos.DESC_RECOMPENSA,
    parametros: [
      { nome: "jogador", tipo: "texto" },
      { nome: "valor", tipo: "inteiro" },
    ],
  },
  async (p, [nome, valor]) => {
    const alvo = acharPessoa(nome);
    if (!alvo) {
      erro(p, textos.NAO_ACHEI);
      return;
    }
    await confirmarRecompensa(p, alvo, valor, novoFluxo(p));
  },
);
registrarComando(
  { nome: "tirarrecompensa", descricao: textos.DESC_TIRAR, staff: true, parametros: [{ nome: "jogador", tipo: "texto" }] },
  (p, [nome]) => {
    const alvo = acharPessoa(nome);
    const c = alvo ? cabecaDe(alvo.id) : cabecasAtivas().find((x) => x.nome.toLowerCase() === String(nome).trim().toLowerCase());
    if (!c) {
      erro(p, textos.JA_NAO_EXISTE);
      return;
    }
    removerRecompensa(p, c.id);
  },
);
