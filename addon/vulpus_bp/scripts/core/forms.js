// @ts-check
// Framework de menus. O RP troca o visual quando o título começa com uma FLAG:
// HUB = menu principal (9 slots fixos) e LISTA = submenus. O ModalFormData fica vanilla.
import { system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
import { ICONES, SONS } from "../config.js";
import * as textos from "../textos/geral.js";
import { limitar, registrarErro, rodarSeguro, som } from "./util.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server-ui").ActionFormResponse} ActionFormResponse */
/** @typedef {import("@minecraft/server-ui").ModalFormResponse} ModalFormResponse */

/** Flags de título: só códigos § válidos e idênticas às do JSON UI (tools/verificar_ui.py confere). */
export const FLAG = Object.freeze({ BASE: "§v§u§l§p", HUB: "§v§u§l§p§0§r", LISTA: "§v§u§l§p§1§r" });

/**
 * @typedef {object} Botao
 * @property {string} texto
 * @property {string} [icone]  caminho da textura (veja ICONES)
 * @property {(p: Player) => any} [acao]  roda depois que o form fecha
 */

/**
 * @typedef {{ tipo: "botao", botao: Botao }
 *   | { tipo: "cabecalho" | "rotulo", texto: string }
 *   | { tipo: "divisor" }} ItemLista
 */

/**
 * Campo de perguntar(). Por tipo:
 * - "texto": rotulo, dica? (placeholder), padrao? (string)
 * - "numero": rotulo, padrao, min, max (digitado num campo de texto)
 * - "alternar": rotulo, padrao (boolean)
 * - "lista": rotulo, opcoes, padrao? (índice)
 * @typedef {object} Campo
 * @property {string} tipo  "texto" | "numero" | "alternar" | "lista"
 * @property {string} rotulo
 * @property {string} [dica]
 * @property {any} [padrao]
 * @property {number} [min]
 * @property {number} [max]
 * @property {string[]} [opcoes]
 */

/** Hub: 0-3 coluna esquerda, 4-7 coluna direita, 8 staff. */
const SLOTS_HUB = 9;
const SLOT_STAFF = 8;
/** Com o chat aberto o jogador fica "ocupado": tenta de novo a cada 10 ticks, por até ~10 s. */
const TICKS_ENTRE_TENTATIVAS = 10;
const TENTATIVAS = 20;

/**
 * @overload
 * @param {Player} player
 * @param {ActionFormData} form
 * @returns {Promise<ActionFormResponse | undefined>}
 */
/**
 * @overload
 * @param {Player} player
 * @param {ModalFormData} form
 * @returns {Promise<ModalFormResponse | undefined>}
 */
/**
 * Mostra o form e espera a resposta, repetindo enquanto o jogador estiver ocupado.
 * Nunca lança: em erro, saída do jogador ou desistência, devolve undefined.
 * @param {Player} player
 * @param {ActionFormData | ModalFormData} form
 * @returns {Promise<ActionFormResponse | ModalFormResponse | undefined>}
 */
export async function mostrar(player, form) {
  try {
    for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
      if (!player.isValid) return undefined;
      const resposta = await form.show(player);
      if (resposta.cancelationReason !== FormCancelationReason.UserBusy) return resposta;
      await system.waitTicks(TICKS_ENTRE_TENTATIVAS);
    }
  } catch (e) {
    if (player.isValid) registrarErro("Form", e);
  }
  return undefined;
}

/**
 * Roda a ação do botão escolhido (com try/catch, inclusive se for async).
 * @param {Player} player
 * @param {Botao | undefined} botao
 * @returns {boolean} se havia um botão
 */
function executar(player, botao) {
  if (!botao) return false;
  if (botao.acao) rodarSeguro(player, `Botão "${botao.texto}"`, botao.acao);
  return true;
}

/** Menu principal: sempre manda 9 botões; slot vazio vai com texto "" e o RP esconde. */
export class Hub {
  constructor() {
    this._titulo = "";
    this._texto = "";
    /** @type {(Botao | undefined)[]} */
    this._slots = Array(SLOTS_HUB).fill(undefined);
  }

  /** @param {string} t */
  titulo(t) {
    this._titulo = t;
    return this;
  }

  /** Texto embaixo da logo. @param {string} t */
  texto(t) {
    this._texto = t;
    return this;
  }

  /**
   * @param {number} indice  0-3 coluna esquerda, 4-7 coluna direita (8 = staff)
   * @param {Botao | undefined} botao  undefined deixa o slot vazio
   */
  slot(indice, botao) {
    if (Number.isInteger(indice) && indice >= 0 && indice < SLOTS_HUB) this._slots[indice] = botao;
    else console.warn(`[Vulpus] Slot do Hub inválido: ${indice}`);
    return this;
  }

  /** Botão de canto da staff; undefined esconde. @param {Botao | undefined} botao */
  staff(botao) {
    return this.slot(SLOT_STAFF, botao);
  }

  /**
   * @param {Player} player
   * @returns {Promise<boolean>} true se clicou em algum botão
   */
  async abrir(player) {
    const form = new ActionFormData().title(FLAG.HUB + this._titulo).body(this._texto);
    for (const botao of this._slots) form.button(botao?.texto ?? "", botao?.icone);
    som(player, SONS.abrir);
    const resposta = await mostrar(player, form);
    return executar(player, resposta?.selection === undefined ? undefined : this._slots[resposta.selection]);
  }
}

/** Submenu em lista rolável. Cabeçalho, rótulo e divisor não contam como botão no selection. */
export class Lista {
  /** @param {string} [titulo] */
  constructor(titulo = "") {
    this._titulo = titulo;
    this._texto = "";
    /** @type {ItemLista[]} */
    this._itens = [];
    /** @type {((p: Player) => any) | undefined} */
    this._voltar = undefined;
  }

  /** Texto do topo. @param {string} t */
  texto(t) {
    this._texto = t;
    return this;
  }

  /**
   * @param {string} texto
   * @param {string} [icone]
   * @param {(p: Player) => any} [acao]
   */
  botao(texto, icone, acao) {
    this._itens.push({ tipo: "botao", botao: { texto, icone, acao } });
    return this;
  }

  /** @param {string} t */
  cabecalho(t) {
    this._itens.push({ tipo: "cabecalho", texto: t });
    return this;
  }

  /** @param {string} t */
  rotulo(t) {
    this._itens.push({ tipo: "rotulo", texto: t });
    return this;
  }

  divisor() {
    this._itens.push({ tipo: "divisor" });
    return this;
  }

  /**
   * Botão "Voltar" no fim da lista. Com undefined (menu aberto direto por comando), não aparece.
   * @param {((p: Player) => any) | undefined} acao
   */
  voltar(acao) {
    this._voltar = acao;
    return this;
  }

  /**
   * @param {Player} player
   * @returns {Promise<boolean>} true se clicou em algum botão
   */
  async abrir(player) {
    const form = new ActionFormData().title(FLAG.LISTA + this._titulo).body(this._texto);
    /** @type {Botao[]} Só os botões, na ordem do selection. */
    const botoes = [];
    for (const item of this._itens) {
      if (item.tipo === "botao") {
        form.button(item.botao.texto, item.botao.icone);
        botoes.push(item.botao);
      } else if (item.tipo === "divisor") form.divider();
      else if (item.tipo === "cabecalho") form.header(item.texto);
      else form.label(item.texto);
    }
    if (this._voltar) {
      form.button(textos.VOLTAR, ICONES.voltarNav);
      botoes.push({ texto: textos.VOLTAR, acao: this._voltar });
    }
    som(player, SONS.abrir);
    const resposta = await mostrar(player, form);
    return executar(player, resposta?.selection === undefined ? undefined : botoes[resposta.selection]);
  }
}

/**
 * Pergunta de sim ou não numa Lista. Fechar (X/ESC) conta como não.
 * @param {Player} player
 * @param {{ titulo: string, texto: string, sim?: string, nao?: string }} opcoes
 * @returns {Promise<boolean>}
 */
export async function confirmar(player, { titulo, texto, sim = textos.SIM, nao = textos.NAO }) {
  let aceitou = false;
  await new Lista(titulo)
    .texto(texto)
    .botao(sim, ICONES.sim, () => {
      aceitou = true;
    })
    .botao(nao, ICONES.nao)
    .abrir(player);
  return aceitou;
}

/**
 * Formulário vanilla (ModalFormData). Devolve os valores já convertidos, na ordem dos campos:
 * texto → string sem espaços nas pontas; numero → inteiro entre min e max (inválido = padrao);
 * alternar → boolean; lista → índice escolhido. Se fechar ou falhar: undefined.
 * @param {Player} player
 * @param {string} titulo
 * @param {Campo[]} campos
 * @returns {Promise<any[] | undefined>}
 */
export async function perguntar(player, titulo, campos) {
  const form = new ModalFormData().title(titulo).submitButton(textos.CONFIRMAR);
  for (const campo of campos) adicionarCampo(form, campo);
  const resposta = await mostrar(player, form);
  const valores = resposta?.canceled ? undefined : resposta?.formValues;
  if (!valores) return undefined;
  return campos.map((campo, i) => converterCampo(campo, valores[i]));
}

/**
 * @param {ModalFormData} form
 * @param {Campo} campo
 */
function adicionarCampo(form, campo) {
  switch (campo.tipo) {
    case "texto":
      form.textField(campo.rotulo, campo.dica ?? "", { defaultValue: String(campo.padrao ?? "") });
      break;
    case "numero": {
      const temFaixa = campo.min !== undefined && campo.max !== undefined;
      const rotulo = temFaixa ? `${campo.rotulo} §7(${campo.min} a ${campo.max})` : campo.rotulo;
      form.textField(rotulo, temFaixa ? `${campo.min} a ${campo.max}` : "", { defaultValue: String(campo.padrao ?? "") });
      break;
    }
    case "alternar":
      form.toggle(campo.rotulo, { defaultValue: campo.padrao === true });
      break;
    case "lista":
      form.dropdown(campo.rotulo, campo.opcoes ?? [], { defaultValueIndex: campo.padrao ?? 0 });
      break;
    default:
      throw new Error(`Campo de tipo desconhecido: ${campo.tipo}`);
  }
}

/**
 * @param {Campo} campo
 * @param {boolean | number | string | undefined} valor
 */
function converterCampo(campo, valor) {
  switch (campo.tipo) {
    case "texto":
      return String(valor ?? "").trim();
    case "numero":
      return lerNumero(campo, valor);
    case "alternar":
      return valor === true;
    case "lista":
      return typeof valor === "number" ? valor : (campo.padrao ?? 0);
    default:
      return valor;
  }
}

/**
 * Número digitado no jeito brasileiro ("1.000", "2,5"), arredondado e limitado a min/max.
 * @param {Campo} campo
 * @param {boolean | number | string | undefined} valor
 */
function lerNumero(campo, valor) {
  const texto = String(valor ?? "")
    .replace(/[.\s_]/g, "")
    .replace(",", ".");
  const numero = Number(texto);
  if (texto === "" || !Number.isFinite(numero)) return campo.padrao;
  return limitar(Math.round(numero), campo.min ?? -Infinity, campo.max ?? Infinity);
}
