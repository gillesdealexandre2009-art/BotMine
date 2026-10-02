// @ts-check
// Persistência em propriedades dinâmicas do MUNDO (dá para ler dados de quem está offline).
// Tudo em JSON, com cache em memória e gravação imediata.
import { world } from "@minecraft/server";
import { CHAVE_CONFIG, PADROES, PREFIXO_JOGADOR } from "../config.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {typeof PADROES} Config */

/**
 * @typedef {object} Casa
 * @property {string} nome
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} d  dimension.id
 */

/**
 * @typedef {object} DadosJogador
 * @property {number} v  versão do formato (1)
 * @property {string} nome  último nome visto
 * @property {number} caudas  saldo de Caudas
 * @property {number} tempo  segundos jogados
 * @property {number} primeira  ms da primeira entrada (0 = ainda não entrou)
 * @property {number} ultimaVez  ms da última entrada
 * @property {number} mortes
 * @property {{ dia: string, sequencia: number }} diaria  dia (Brasília, "2026-10-02") da última diária e dias seguidos
 * @property {Casa[]} casas
 * @property {import("./teleporte.js").Local | null} voltar
 * @property {{ hud: boolean | null, tpa: boolean, sons: boolean }} ajustes  hud null = usar config().hudPadrao
 * @property {boolean} recebeuItem
 */

/** Teto por propriedade (o jogo aceita até 32767 caracteres). */
const LIMITE_JSON = 30000;

/** @type {Map<string, DadosJogador>} */
const cache = new Map();
/** @type {Config | undefined} */
let cacheConfig;

/** @returns {DadosJogador} */
function dadosNovos() {
  return {
    v: 1,
    nome: "",
    caudas: 0,
    tempo: 0,
    primeira: 0,
    ultimaVez: 0,
    mortes: 0,
    diaria: { dia: "", sequencia: 0 },
    casas: [],
    voltar: null,
    ajustes: { hud: null, tpa: true, sons: true },
    recebeuItem: false,
  };
}

/** @param {Player | string} alvo */
const idDe = (alvo) => (typeof alvo === "string" ? alvo : alvo.id);

/**
 * Lê um JSON guardado no mundo; undefined se não houver ou estiver corrompido.
 * @param {string} chave
 * @returns {any}
 */
function lerJson(chave) {
  const bruto = world.getDynamicProperty(chave);
  if (typeof bruto !== "string") return undefined;
  try {
    return JSON.parse(bruto);
  } catch (e) {
    console.warn(`[Vulpus] JSON inválido em ${chave}: ${e}`);
    return undefined;
  }
}

/**
 * Grava um valor como JSON no mundo. Acima do limite, avisa no log e não grava.
 * @param {string} chave
 * @param {unknown} valor
 * @returns {boolean} se gravou
 */
function gravarJson(chave, valor) {
  const json = JSON.stringify(valor);
  if (json.length > LIMITE_JSON) {
    console.warn(`[Vulpus] ${chave} tem ${json.length} caracteres (limite ${LIMITE_JSON}); não gravei.`);
    return false;
  }
  world.setDynamicProperty(chave, json);
  return true;
}

/**
 * Junta o que foi lido com os padrões: campos que não existiam ganham o valor padrão.
 * @param {any} lido
 * @returns {DadosJogador}
 */
function completar(lido) {
  const base = dadosNovos();
  if (!lido || typeof lido !== "object") return base;
  return {
    ...base,
    ...lido,
    v: 1,
    diaria: { ...base.diaria, ...lido.diaria },
    ajustes: { ...base.ajustes, ...lido.ajustes },
    casas: Array.isArray(lido.casas) ? lido.casas : base.casas,
  };
}

/**
 * Dados do jogador, do cache (cria os padrões se não houver nada salvo).
 * Com um Player, também atualiza o nome guardado.
 * @param {Player | string} alvo  o jogador ou o id dele
 * @returns {DadosJogador}
 */
export function dadosJogador(alvo) {
  const id = idDe(alvo);
  let dados = cache.get(id);
  if (!dados) {
    dados = completar(lerJson(PREFIXO_JOGADOR + id));
    cache.set(id, dados);
  }
  if (typeof alvo !== "string" && alvo.isValid && dados.nome !== alvo.name) {
    dados.nome = alvo.name;
    gravarJson(PREFIXO_JOGADOR + id, dados);
  }
  return dados;
}

/**
 * Grava os dados do jogador no mundo.
 * @param {Player | string} alvo
 * @returns {boolean} se gravou
 */
export function salvarJogador(alvo) {
  return gravarJson(PREFIXO_JOGADOR + idDe(alvo), dadosJogador(alvo));
}

/**
 * Aplica fn nos dados do jogador e salva.
 * @param {Player | string} alvo
 * @param {(dados: DadosJogador) => any} fn
 * @returns {DadosJogador}
 */
export function editarJogador(alvo, fn) {
  const dados = dadosJogador(alvo);
  fn(dados);
  salvarJogador(alvo);
  return dados;
}

/**
 * Todos os jogadores com dados salvos, inclusive quem está offline (ranking, staff).
 * @returns {{ id: string, dados: DadosJogador }[]}
 */
export function todosJogadores() {
  return world
    .getDynamicPropertyIds()
    .filter((chave) => chave.startsWith(PREFIXO_JOGADOR))
    .map((chave) => {
      const id = chave.slice(PREFIXO_JOGADOR.length);
      return { id, dados: dadosJogador(id) };
    });
}

/**
 * Só as chaves que existem em PADROES, com o mesmo tipo do padrão.
 * @param {any} valores
 * @returns {Partial<Config>}
 */
function filtrarConfig(valores) {
  /** @type {Record<string, unknown>} */
  const limpo = {};
  if (!valores || typeof valores !== "object") return limpo;
  for (const [chave, padrao] of Object.entries(PADROES)) {
    const valor = valores[chave];
    if (typeof valor !== typeof padrao) continue;
    if (typeof valor === "number" && !Number.isFinite(valor)) continue;
    limpo[chave] = valor;
  }
  return limpo;
}

/**
 * Configurações em vigor: PADROES + o que a staff mudou. Devolve uma cópia.
 * @returns {Config}
 */
export function config() {
  if (!cacheConfig) cacheConfig = { ...PADROES, ...filtrarConfig(lerJson(CHAVE_CONFIG)) };
  return { ...cacheConfig };
}

/**
 * Salva parte das configurações. Chaves desconhecidas ou de tipo errado são ignoradas.
 * @param {Partial<Config>} parcial
 * @returns {Config} a configuração nova
 */
export function salvarConfig(parcial) {
  gravarJson(CHAVE_CONFIG, { ...filtrarConfig(lerJson(CHAVE_CONFIG)), ...filtrarConfig(parcial) });
  cacheConfig = undefined;
  return config();
}

/**
 * Lê um valor JSON guardado no mundo.
 * @param {string} chave
 * @param {any} [padrao]  devolvido se não houver nada (ou se estiver corrompido)
 * @returns {any}
 */
export function lerMundo(chave, padrao) {
  const valor = lerJson(chave);
  return valor === undefined ? padrao : valor;
}

/**
 * Grava um valor como JSON no mundo; undefined apaga a chave.
 * @param {string} chave
 * @param {any} valor
 * @returns {boolean} se gravou
 */
export function salvarMundo(chave, valor) {
  if (chave === CHAVE_CONFIG) cacheConfig = undefined;
  if (chave.startsWith(PREFIXO_JOGADOR)) cache.delete(chave.slice(PREFIXO_JOGADOR.length));
  if (valor === undefined) {
    world.setDynamicProperty(chave, undefined);
    return true;
  }
  return gravarJson(chave, valor);
}
