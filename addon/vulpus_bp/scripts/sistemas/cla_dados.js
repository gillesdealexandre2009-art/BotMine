// @ts-check
// Clãs: dados, índices, cargos, permissões, níveis e banco (sem menus nem mensagens para o jogador).
// Fonte da verdade: uma propriedade do mundo por clã (vulpus:cla:c:<id>). Os índices (tag, nome e de
// qual clã cada pessoa é) são montados em memória a partir dela, então nunca ficam fora de sincronia.
// Toda mudança passa por editarCla: edita uma cópia e só troca o clã em memória se gravou.
import { system, world } from "@minecraft/server";
import { NIVEIS_CLA } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { diaBrasilia, registrarErro } from "../core/util.js";
import { pintar, temaValido } from "../cores.js";
import { G } from "../glyphs.js";
import { aoMinutoAtivo } from "./caudas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {"lider" | "vice" | "oficial" | "membro" | "recruta"} CargoCla */
/** @typedef {"construir" | "convidar" | "expulsar" | "promover" | "sacar" | "terreno" | "guerra" | "editar"} Permissao */
/** @typedef {"criacao" | "deposito" | "saque" | "nivel" | "guerra" | "premio" | "devolucao" | "casa" | "base" | "staff"} TipoMov */
/** @typedef {(typeof NIVEIS_CLA)[number]} NivelCla */

/**
 * @typedef {object} Membro
 * @property {string} id
 * @property {string} nome  último nome visto
 * @property {CargoCla} cargo
 * @property {number} desde  ms em que entrou
 * @property {{ dia: string, valor: number }} saque  quanto sacou no dia (Brasília)
 */

/**
 * @typedef {object} Movimento
 * @property {number} t  ms
 * @property {TipoMov} k
 * @property {number} v  + entrou no banco, - saiu
 * @property {string} a  quem fez (nome)
 */

/** @typedef {{ nome: string, x: number, y: number, z: number, d: string, rx?: number, ry?: number }} CasaCla */
/**
 * Centro da base (bloco), quando foi marcada e o raio que ela ganhou (até o do nível, onde couber).
 * @typedef {{ x: number, y: number, z: number, d: string, marcada: number, raio: number }} Base
 */
/** Proteções extras da base, ligadas por quem tem "terreno". */
/** @typedef {{ tnt: boolean, creeper: boolean, explosoes: boolean, entidades: boolean }} ProtecaoBase */

/**
 * @typedef {object} Cla
 * @property {number} v  versão do formato (1)
 * @property {string} id
 * @property {string} nome
 * @property {string} tag  3 caracteres A-Z/0-9
 * @property {string} cor  código § sem o § (um de CORES_CLA)
 * @property {string} tema  tema de cor da tag e do nome (cores.js); "" = só a cor. Só Kitsune escolhe
 * @property {string} temaPor  id do Kitsune que escolheu o tema ("" sem tema): se ele perder o selo, volta a cor
 * @property {number} emblema  índice em EMBLEMAS
 * @property {string} desc
 * @property {number} criado  ms
 * @property {string} dono  id do líder ("" = time sem líder: só o Painel de Dono cria ou deixa assim)
 * @property {Membro[]} membros
 * @property {boolean} aberto  aberto = entra direto; fechado = pede para entrar
 * @property {{ id: string, nome: string, t: number }[]} pedidos  pedidos de entrada (fechado)
 * @property {number} banco  Caudas
 * @property {Movimento[]} extrato  os últimos movimentos, o mais novo primeiro
 * @property {number} xp  XP total do clã
 * @property {number} nivel  1..NIVEIS_CLA.length
 * @property {number} aporte  depositado - sacado (as compras do clã não contam)
 * @property {number} aporteMax  maior aporte já visto: só depósito acima dele vira XP (sem farm de saca e deposita)
 * @property {Base | null} base
 * @property {number} mudancasBase  quantas vezes a base já foi marcada (a primeira é grátis)
 * @property {number} baseMudou  ms da última marcação (a espera para mover vale mesmo se a base foi tirada)
 * @property {ProtecaoBase} protecao
 * @property {CasaCla[]} casas
 * @property {string[]} aliados  ids de clãs
 * @property {string[]} pedidosAlianca  ids de clãs que pediram aliança a este
 * @property {{ id: string, nome: string }[]} confianca  pessoas de fora que constroem na base
 * @property {boolean} acessoAliados  aliados podem abrir portas, baús e botões na base
 * @property {boolean} fogoAmigo  membros podem se ferir
 * @property {Record<Exclude<CargoCla, "lider">, Permissao[]>} perms
 * @property {Record<Exclude<CargoCla, "lider">, number>} limites  saque por dia de cada cargo
 */

const PREFIXO = "vulpus:cla:c:";
const CHAVE_SEQ = "vulpus:cla:seq";
const CHAVE_LOG = "vulpus:cla:log";
const LOG_MAXIMO = 40;

/** Do maior para o menor. */
export const CARGOS_CLA = /** @type {readonly CargoCla[]} */ (Object.freeze(["lider", "vice", "oficial", "membro", "recruta"]));
export const PERMISSOES = /** @type {readonly Permissao[]} */ (
  Object.freeze(["construir", "convidar", "expulsar", "promover", "sacar", "terreno", "guerra", "editar"])
);
/** Cores da tag, na ordem em que os níveis liberam (NIVEIS_CLA[].cores). */
export const CORES_CLA = Object.freeze(["6", "e", "a", "b", "c", "d", "9", "5", "3", "2", "f", "g"]);
/** Emblemas do clã, na ordem em que os níveis liberam (NIVEIS_CLA[].emblemas). */
export const EMBLEMAS = Object.freeze([G.ESCUDO, G.BANDEIRA, G.TORRE, G.PATA, G.TROFEU]);

/** Tamanhos e tetos (mantêm o JSON de cada clã bem abaixo do limite de 30.000 caracteres). */
export const LIMITES = Object.freeze({
  nomeMin: 3,
  nomeMax: 24,
  desc: 80,
  extrato: 30,
  pedidos: 15,
  confianca: 10,
  aliados: 3,
  nomeCasa: 16,
});
const BANCO_MAXIMO = 1_000_000_000;
export const VALOR_MAXIMO = 1_000_000;
const PEDIDO_EXPIRA_MS = 3 * 24 * 60 * 60 * 1000;

/** @type {Record<Exclude<CargoCla, "lider">, Permissao[]>} */
const PERMS_PADRAO = {
  vice: ["construir", "convidar", "expulsar", "promover", "sacar", "terreno", "guerra", "editar"],
  oficial: ["construir", "convidar", "expulsar", "sacar"],
  membro: ["construir"],
  recruta: [],
};
/** @type {Record<Exclude<CargoCla, "lider">, number>} */
const LIMITES_PADRAO = { vice: 5000, oficial: 1000, membro: 0, recruta: 0 };

/** @type {Map<string, Cla>} */
const clas = new Map();
/** @type {Map<string, string>} id do jogador → id do clã */
const jogadorCla = new Map();
/** @type {Map<string, string>} TAG → id do clã */
const tagCla = new Map();
/** @type {Map<string, string>} nome normalizado → id do clã */
const nomeCla = new Map();
/** @type {((ids: string[]) => void)[]} */
const ouvintes = [];
let carregado = false;
/** @type {Map<string, number>} XP do minuto ativo esperando gravar (id do clã → XP) */
const xpPendente = new Map();
let gravacaoAgendada = false;

// ---------------------------------------------------------------- leitura e validação

/**
 * @param {unknown} valor
 * @param {number} padrao
 */
const numero = (valor, padrao) => (typeof valor === "number" && Number.isFinite(valor) ? valor : padrao);
/** @param {unknown} valor @param {number} padrao */
const inteiro = (valor, padrao) => Math.max(0, Math.floor(numero(valor, padrao)));
/** @param {unknown} valor @param {number} max */
const texto = (valor, max) => (typeof valor === "string" ? valor.slice(0, max) : "");
/** @param {any} v */
const ehPosicao = (v) =>
  !!v && typeof v === "object" && typeof v.d === "string" && [v.x, v.y, v.z].every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Letras aceitas em nomes escolhidos no jogo: alfabeto latino (com os acentos do português), números,
 * espaço e _ ' . -. Letras de outros alfabetos ficam de fora (o "а" cirílico imitaria o "a").
 */
export const LETRAS_NOME = /^[A-Za-z0-9À-ÖØ-öø-ÿ _'.-]+$/;

/**
 * Chave para comparar nomes de clã: sem acento, sem maiúscula e só letras e números ("Raposas-da Lua",
 * "raposas da lua" e "RaposasDaLua" são o mesmo nome).
 * @param {string} nome
 */
export function normalizar(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** @param {unknown} cargo @returns {cargo is CargoCla} */
const ehCargo = (cargo) => typeof cargo === "string" && CARGOS_CLA.includes(/** @type {CargoCla} */ (cargo));

/**
 * Junta o que foi lido com os padrões; undefined se faltar o essencial (id, nome, tag ou membros).
 * @param {any} lido
 * @param {string} id
 * @returns {Cla | undefined}
 */
function completarCla(lido, id) {
  if (!lido || typeof lido !== "object" || typeof lido.nome !== "string" || typeof lido.tag !== "string") return undefined;
  /** @type {Membro[]} */
  const membros = [];
  const vistos = new Set();
  for (const m of Array.isArray(lido.membros) ? lido.membros : []) {
    if (!m || typeof m.id !== "string" || vistos.has(m.id)) continue;
    vistos.add(m.id);
    const saque = m.saque && typeof m.saque === "object" ? m.saque : {};
    membros.push({
      id: m.id,
      nome: texto(m.nome, 32) || "?",
      cargo: ehCargo(m.cargo) ? m.cargo : "membro",
      desde: numero(m.desde, 0),
      saque: { dia: typeof saque.dia === "string" ? saque.dia : "", valor: inteiro(saque.valor, 0) },
    });
  }
  // dono "" = sem líder de propósito (Painel de Dono): pode até ficar sem membros, e ninguém é Líder.
  const semLider = lido.dono === "";
  if (!membros.length && !semLider) return undefined;
  // Exatamente um líder: o dono, se ainda for membro; senão quem tiver o maior cargo.
  let dono = semLider ? "" : typeof lido.dono === "string" && vistos.has(lido.dono) ? lido.dono : undefined;
  if (dono === undefined) {
    const ordenados = [...membros].sort((a, b) => CARGOS_CLA.indexOf(a.cargo) - CARGOS_CLA.indexOf(b.cargo) || a.desde - b.desde);
    dono = ordenados[0].id;
  }
  for (const m of membros) {
    if (m.id === dono) m.cargo = "lider";
    else if (m.cargo === "lider") m.cargo = "vice";
  }
  const perms = lido.perms && typeof lido.perms === "object" ? lido.perms : {};
  const limites = lido.limites && typeof lido.limites === "object" ? lido.limites : {};
  /** @type {Cla["perms"]} */
  const permsOk = { vice: [], oficial: [], membro: [], recruta: [] };
  /** @type {Cla["limites"]} */
  const limitesOk = { vice: 0, oficial: 0, membro: 0, recruta: 0 };
  for (const cargo of /** @type {const} */ (["vice", "oficial", "membro", "recruta"])) {
    permsOk[cargo] = Array.isArray(perms[cargo])
      ? PERMISSOES.filter((p) => perms[cargo].includes(p))
      : [...PERMS_PADRAO[cargo]];
    limitesOk[cargo] = Math.min(VALOR_MAXIMO, inteiro(limites[cargo], LIMITES_PADRAO[cargo]));
  }
  const nivel = Math.min(NIVEIS_CLA.length, Math.max(1, Math.floor(numero(lido.nivel, 1))));
  const base = ehPosicao(lido.base)
    ? {
        x: Math.floor(lido.base.x),
        y: Math.floor(lido.base.y),
        z: Math.floor(lido.base.z),
        d: lido.base.d,
        marcada: numero(lido.base.marcada, 0),
        raio: Math.min(defNivel(nivel).raio, Math.max(1, Math.floor(numero(lido.base.raio, defNivel(nivel).raio)))),
      }
    : null;
  const protecao = lido.protecao && typeof lido.protecao === "object" ? lido.protecao : {};
  const listaIds = (/** @type {unknown} */ v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x !== id) : []);
  return {
    v: 1,
    id,
    nome: lido.nome.slice(0, LIMITES.nomeMax),
    tag: lido.tag.toUpperCase().slice(0, 3),
    cor: CORES_CLA.includes(lido.cor) ? lido.cor : CORES_CLA[0],
    tema: temaValido(lido.tema) ? lido.tema : "",
    temaPor: temaValido(lido.tema) && typeof lido.temaPor === "string" ? lido.temaPor : "",
    emblema: Math.min(EMBLEMAS.length - 1, inteiro(lido.emblema, 0)),
    desc: texto(lido.desc, LIMITES.desc),
    criado: numero(lido.criado, 0),
    dono,
    membros,
    aberto: lido.aberto === true,
    pedidos: (Array.isArray(lido.pedidos) ? lido.pedidos : [])
      .filter((p) => p && typeof p.id === "string" && !vistos.has(p.id))
      .map((p) => ({ id: p.id, nome: texto(p.nome, 32) || "?", t: numero(p.t, 0) }))
      .slice(0, LIMITES.pedidos),
    banco: Math.min(BANCO_MAXIMO, inteiro(lido.banco, 0)),
    extrato: (Array.isArray(lido.extrato) ? lido.extrato : [])
      .filter((m) => m && typeof m.k === "string")
      .map((m) => ({ t: numero(m.t, 0), k: m.k, v: Math.trunc(numero(m.v, 0)), a: texto(m.a, 32) }))
      .slice(0, LIMITES.extrato),
    xp: Math.min(BANCO_MAXIMO, inteiro(lido.xp, 0)),
    nivel,
    aporte: Math.trunc(numero(lido.aporte, 0)),
    aporteMax: Math.trunc(numero(lido.aporteMax, 0)),
    base,
    mudancasBase: inteiro(lido.mudancasBase, base ? 1 : 0),
    baseMudou: numero(lido.baseMudou, base?.marcada ?? 0),
    protecao: {
      tnt: protecao.tnt !== false,
      creeper: protecao.creeper !== false,
      explosoes: protecao.explosoes !== false,
      entidades: protecao.entidades !== false,
    },
    casas: (Array.isArray(lido.casas) ? lido.casas : [])
      .filter((c) => ehPosicao(c) && typeof c.nome === "string" && c.nome !== "")
      .map((c) => ({ nome: c.nome.slice(0, LIMITES.nomeCasa), x: c.x, y: c.y, z: c.z, d: c.d, rx: c.rx, ry: c.ry }))
      .slice(0, NIVEIS_CLA[NIVEIS_CLA.length - 1].casas),
    aliados: listaIds(lido.aliados).slice(0, LIMITES.aliados),
    pedidosAlianca: listaIds(lido.pedidosAlianca).slice(0, LIMITES.pedidos),
    confianca: (Array.isArray(lido.confianca) ? lido.confianca : [])
      .filter((c) => c && typeof c.id === "string" && !vistos.has(c.id))
      .map((c) => ({ id: c.id, nome: texto(c.nome, 32) || "?" }))
      .slice(0, LIMITES.confianca),
    acessoAliados: lido.acessoAliados === true,
    fogoAmigo: lido.fogoAmigo === true,
    perms: permsOk,
    limites: limitesOk,
  };
}

/** Monta os índices de novo (poucos clãs: barato). Conflito vindo de dado corrompido fica no log. */
function reindexar() {
  jogadorCla.clear();
  tagCla.clear();
  nomeCla.clear();
  const ordem = [...clas.values()].sort((a, b) => a.criado - b.criado || a.id.localeCompare(b.id));
  for (const cla of ordem) {
    if (tagCla.has(cla.tag)) registrarErro("Clãs", `tag ${cla.tag} repetida (${cla.id}); a staff precisa trocar`);
    else tagCla.set(cla.tag, cla.id);
    const nome = normalizar(cla.nome);
    if (nome && !nomeCla.has(nome)) nomeCla.set(nome, cla.id);
    for (const m of cla.membros) {
      if (jogadorCla.has(m.id)) registrarErro("Clãs", `${m.nome} aparece em dois clãs; vale o mais antigo`);
      else jogadorCla.set(m.id, cla.id);
    }
  }
}

/** Lê todos os clãs do mundo (uma vez). Clã ilegível vai para o log e fica de fora. */
function carregar() {
  if (carregado) return;
  clas.clear();
  for (const chave of world.getDynamicPropertyIds()) {
    if (!chave.startsWith(PREFIXO)) continue;
    const id = chave.slice(PREFIXO.length);
    const cla = completarCla(lerMundo(chave), id);
    if (cla) clas.set(id, cla);
    else registrarErro("Clãs", `${chave} ilegível; ficou de fora (o dado continua salvo)`);
  }
  carregado = true;
  reindexar();
}

// ---------------------------------------------------------------- consultas

/** Todos os clãs (objetos só para leitura: mude com editarCla). @returns {Cla[]} */
export function todosClas() {
  carregar();
  return [...clas.values()];
}

/** @param {string} id @returns {Cla | undefined} */
export function claPorId(id) {
  carregar();
  return clas.get(id);
}

/** @param {string} tag @returns {Cla | undefined} */
export function claPorTag(tag) {
  carregar();
  const id = tagCla.get(tag.trim().toUpperCase());
  return id ? clas.get(id) : undefined;
}

/**
 * Clã de alguém (vale offline, pelo id).
 * @param {Player | string} alvo
 * @returns {Cla | undefined}
 */
export function claDe(alvo) {
  carregar();
  const id = jogadorCla.get(typeof alvo === "string" ? alvo : alvo.id);
  return id ? clas.get(id) : undefined;
}

/**
 * @param {Cla} cla
 * @param {string} id
 * @returns {Membro | undefined}
 */
export function membroDe(cla, id) {
  return cla.membros.find((m) => m.id === id);
}

/**
 * Tag, cor e tema de quem é de um clã (para o nameTag e o chat); null sem clã.
 * @param {Player | string} alvo
 * @returns {{ tag: string, cor: string, tema: string } | null}
 */
export function tagDe(alvo) {
  const cla = claDe(alvo);
  return cla ? { tag: cla.tag, cor: cla.cor, tema: cla.tema } : null;
}

/**
 * Se a pessoa tem a permissão no clã (o líder pode tudo).
 * @param {Cla} cla
 * @param {string} id
 * @param {Permissao} permissao
 */
export function pode(cla, id, permissao) {
  const membro = membroDe(cla, id);
  if (!membro) return false;
  return membro.cargo === "lider" || cla.perms[membro.cargo].includes(permissao);
}

/**
 * true se o cargo a é maior que o b.
 * @param {CargoCla} a
 * @param {CargoCla} b
 */
export function acima(a, b) {
  return CARGOS_CLA.indexOf(a) < CARGOS_CLA.indexOf(b);
}

/** @param {number} nivel 1..NIVEIS_CLA.length @returns {NivelCla} */
export function defNivel(nivel) {
  return NIVEIS_CLA[Math.min(NIVEIS_CLA.length, Math.max(1, Math.floor(nivel))) - 1];
}

/**
 * Situação de nível do clã: o nível atual, o próximo (se houver) e o progresso de XP até ele.
 * @param {Cla} cla
 */
export function infoNivelCla(cla) {
  const atual = defNivel(cla.nivel);
  const proximo = cla.nivel < NIVEIS_CLA.length ? defNivel(cla.nivel + 1) : undefined;
  const fracao = proximo ? Math.min(1, cla.xp / Math.max(1, proximo.xp)) : 1;
  return { atual, proximo, fracao, xpPronto: !!proximo && cla.xp >= proximo.xp, bancoPronto: !!proximo && cla.banco >= proximo.custo };
}

/**
 * Tag pintada (tema ou cor), sem colchetes e sem §r no fim.
 * @param {{ tag: string, cor: string, tema: string }} cla
 */
export function tagPintada(cla) {
  return pintar(cla.tag, cla.tema) ?? `§${cla.cor}${cla.tag}`;
}

/**
 * Nome pintado (tema ou cor), sem §r no fim.
 * @param {{ nome: string, cor: string, tema: string }} cla
 */
export function nomePintado(cla) {
  return pintar(cla.nome, cla.tema) ?? `§${cla.cor}${cla.nome}`;
}

/** Pedidos de entrada ainda válidos (3 dias). @param {Cla} cla */
export function pedidosValidos(cla) {
  const limite = Date.now() - PEDIDO_EXPIRA_MS;
  return cla.pedidos.filter((p) => p.t > limite);
}

/** Quanto ainda dá para sacar hoje (Infinity para o líder). @param {Cla} cla @param {string} id */
export function saqueDisponivel(cla, id) {
  const membro = membroDe(cla, id);
  if (!membro) return 0;
  if (membro.cargo === "lider") return Infinity;
  if (!cla.perms[membro.cargo].includes("sacar")) return 0;
  const usado = membro.saque.dia === diaBrasilia(Date.now()) ? membro.saque.valor : 0;
  const livre = cla.limites[membro.cargo] - usado;
  return Number.isFinite(livre) ? Math.max(0, livre) : 0;
}

/**
 * Por que o nome não serve (undefined se servir). Nome igual ao de outro clã não vale.
 * @param {string} nome  já limpo
 * @param {string} [exceto]  id do clã que está sendo renomeado
 * @param {(texto: string) => boolean} [proibido]  filtro de palavrões
 * @returns {"curto" | "longo" | "simbolo" | "repetido" | "proibido" | undefined}
 */
export function problemaNome(nome, exceto, proibido) {
  carregar();
  const tamanho = [...nome].length;
  if (tamanho < LIMITES.nomeMin) return "curto";
  if (tamanho > LIMITES.nomeMax) return "longo";
  if (!LETRAS_NOME.test(nome) || normalizar(nome).length < 2) return "simbolo";
  if (proibido?.(nome)) return "proibido";
  const dono = nomeCla.get(normalizar(nome));
  if (dono && dono !== exceto) return "repetido";
  return undefined;
}

/**
 * Por que a tag não serve (undefined se servir).
 * @param {string} tag  já em maiúsculas
 * @param {string} [exceto]
 * @param {(texto: string) => boolean} [proibido]
 * @returns {"formato" | "repetida" | "proibido" | undefined}
 */
export function problemaTag(tag, exceto, proibido) {
  carregar();
  if (!/^[A-Z0-9]{3}$/.test(tag)) return "formato";
  if (proibido?.(tag)) return "proibido";
  const dono = tagCla.get(tag);
  if (dono && dono !== exceto) return "repetida";
  return undefined;
}

// ---------------------------------------------------------------- escrita

/**
 * Avisa quem quer saber que clãs mudaram (nameTag, chat, sidebar, cache das bases).
 * @param {string[]} ids  pessoas afetadas
 */
function notificar(ids) {
  for (const ouvinte of ouvintes) {
    try {
      ouvinte(ids);
    } catch (e) {
      registrarErro("Ouvinte de clã", e);
    }
  }
}

/**
 * Registra quem quer saber de mudanças (recebe os ids das pessoas afetadas).
 * @param {(ids: string[]) => void} fn
 */
export function aoMudarCla(fn) {
  ouvintes.push(fn);
}

/**
 * Edita uma cópia do clã e só troca o clã em memória se a gravação deu certo. fn pode devolver false
 * para desistir sem gravar.
 * @param {string} id
 * @param {(cla: Cla) => any} fn
 * @param {boolean} [avisar]  false para mudanças que não mexem em nome, tag ou membros (XP)
 * @returns {Cla | undefined} o clã novo, ou undefined se não existe, se desistiu ou se não gravou
 */
export function editarCla(id, fn, avisar = true) {
  carregar();
  const atual = clas.get(id);
  if (!atual) return undefined;
  /** @type {Cla} */
  const copia = JSON.parse(JSON.stringify(atual));
  if (fn(copia) === false) return undefined;
  copia.extrato = copia.extrato.slice(0, LIMITES.extrato);
  copia.pedidos = copia.pedidos.slice(-LIMITES.pedidos);
  if (!gravar(copia)) return undefined;
  clas.set(id, copia);
  if (avisar) {
    reindexar();
    notificar([...new Set([...atual.membros, ...copia.membros].map((m) => m.id))]);
  }
  return copia;
}

/**
 * @param {Cla} cla
 * @returns {boolean} se gravou
 */
function gravar(cla) {
  try {
    return salvarMundo(PREFIXO + cla.id, cla);
  } catch (e) {
    registrarErro(`Gravar clã ${cla.tag}`, e);
    return false;
  }
}

/**
 * Cria o clã com o fundador como líder (sem cobrar: quem chama cobra antes).
 * @param {{ id: string, nome: string } | null} fundador  null = sem líder e sem membros (só o Painel de Dono)
 * @param {{ nome: string, tag: string, cor: string }} dados
 * @returns {Cla | undefined} undefined se não gravou
 */
export function novoCla(fundador, dados) {
  carregar();
  const seq = inteiro(lerMundo(CHAVE_SEQ, 1), 1);
  let n = Math.max(1, seq);
  while (clas.has(n.toString(36)) || world.getDynamicProperty(PREFIXO + n.toString(36)) !== undefined) n++;
  const id = n.toString(36);
  const agora = Date.now();
  const cla = completarCla(
    {
      nome: dados.nome,
      tag: dados.tag,
      cor: dados.cor,
      criado: agora,
      dono: fundador ? fundador.id : "",
      membros: fundador ? [{ id: fundador.id, nome: fundador.nome, cargo: "lider", desde: agora }] : [],
      aberto: false,
    },
    id,
  );
  if (!cla || !gravar(cla)) return undefined;
  salvarMundo(CHAVE_SEQ, n + 1);
  clas.set(id, cla);
  reindexar();
  notificar(fundador ? [fundador.id] : []);
  return cla;
}

/**
 * Apaga o clã e tira o id dele das alianças dos outros. Não mexe no banco (quem chama decide).
 * @param {string} id
 * @returns {Cla | undefined} o clã apagado
 */
export function apagarCla(id) {
  carregar();
  const cla = clas.get(id);
  if (!cla) return undefined;
  for (const outro of clas.values()) {
    if (outro.id !== id && (outro.aliados.includes(id) || outro.pedidosAlianca.includes(id))) {
      editarCla(outro.id, (c) => {
        c.aliados = c.aliados.filter((a) => a !== id);
        c.pedidosAlianca = c.pedidosAlianca.filter((a) => a !== id);
      });
    }
  }
  try {
    salvarMundo(PREFIXO + id, undefined);
  } catch (e) {
    registrarErro(`Apagar clã ${cla.tag}`, e);
    return undefined;
  }
  clas.delete(id);
  reindexar();
  notificar(cla.membros.map((m) => m.id));
  return cla;
}

/**
 * Movimento no banco (positivo entra, negativo sai) dentro de um editarCla. Não deixa ficar negativo
 * nem passar do teto: devolve false nesses casos (a edição inteira é desfeita).
 * @param {Cla} cla  a cópia em edição
 * @param {TipoMov} tipo
 * @param {number} valor
 * @param {string} autor
 * @returns {boolean}
 */
export function moverBanco(cla, tipo, valor, autor) {
  const v = Math.trunc(valor);
  if (!Number.isFinite(v) || v === 0) return false;
  const novo = cla.banco + v;
  if (novo < 0 || novo > BANCO_MAXIMO) return false;
  cla.banco = novo;
  cla.extrato.unshift({ t: Date.now(), k: tipo, v, a: autor });
  return true;
}

/**
 * Soma XP ao clã (gravação agrupada: uma por clã, no próximo tick).
 * @param {string} claId
 * @param {number} xp
 */
export function ganharXpCla(claId, xp) {
  const valor = Math.floor(xp);
  if (!(valor > 0)) return;
  xpPendente.set(claId, (xpPendente.get(claId) ?? 0) + valor);
  if (gravacaoAgendada) return;
  gravacaoAgendada = true;
  system.run(gravarXpPendente);
}

/** Grava o XP acumulado de cada clã de uma vez. */
function gravarXpPendente() {
  gravacaoAgendada = false;
  const pendentes = [...xpPendente];
  xpPendente.clear();
  for (const [claId, xp] of pendentes) {
    editarCla(
      claId,
      (c) => {
        c.xp = Math.min(BANCO_MAXIMO, c.xp + xp);
      },
      false,
    );
  }
}

/**
 * Depósito de Caudas que conta como XP: só a parte que passa do maior aporte já visto.
 * @param {Cla} cla  a cópia em edição
 * @param {number} valor  depositado (+) ou sacado (-)
 */
export function registrarAporte(cla, valor) {
  cla.aporte += Math.trunc(valor);
  if (cla.aporte <= cla.aporteMax) return;
  const novo = cla.aporte - cla.aporteMax;
  cla.aporteMax = cla.aporte;
  const xp = Math.floor(novo / Math.max(1, config().claCaudasPorXp));
  cla.xp = Math.min(BANCO_MAXIMO, cla.xp + xp);
}

/**
 * Registro das ações da staff nos clãs (bypass, remover, trocar tag, encerrar guerra): os últimos 40.
 * @param {string} autor
 * @param {string} acao
 */
export function registrarLog(autor, acao) {
  const lido = lerMundo(CHAVE_LOG, []);
  const lista = Array.isArray(lido) ? lido : [];
  lista.unshift({ t: Date.now(), a: autor.slice(0, 32), x: acao.slice(0, 120) });
  try {
    salvarMundo(CHAVE_LOG, lista.slice(0, LOG_MAXIMO));
  } catch (e) {
    registrarErro("Log dos clãs", e);
  }
}

/** @returns {{ t: number, a: string, x: string }[]} o mais novo primeiro */
export function logStaff() {
  const lido = lerMundo(CHAVE_LOG, []);
  return (Array.isArray(lido) ? lido : []).filter((l) => l && typeof l.x === "string" && typeof l.a === "string");
}

/** Lê os clãs assim que o mundo carrega (e deixa os índices prontos). */
export function iniciarClas() {
  try {
    carregar();
  } catch (e) {
    registrarErro("Carregar clãs", e);
  }
}

// XP do clã: cada minuto ativo de um membro (o mesmo anti-AFK das Caudas).
aoMinutoAtivo((player) => {
  const cla = claDe(player);
  if (cla) ganharXpCla(cla.id, config().claXpPorMinuto);
});
