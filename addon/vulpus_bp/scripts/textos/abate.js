// @ts-check
// Textos dos efeitos de abate dos Kitsune. Tudo cosmético: não muda nada no combate.
import { ESTILOS_BANDEIRA_INFO } from "./clas.js";

export const TITULO = "Efeito de abate";
/** @param {string} atual */
export const CORPO = (atual) =>
  `§7Quando você vence alguém no PvP, uma cena curta aparece onde a pessoa caiu. A cada abate muda a combinação, então nunca é igual.\n\n` +
  `§7Agora: §f${atual}\n§7É só visual: não dá vantagem e some em poucos segundos.`;
export const SEM_SELO = "Os efeitos de abate são mimo do selo Kitsune. Sem o selo, nada aparece quando você vence.";
export const BOTAO_AUTO = "Automático";
export const DESC_AUTO = "um tema diferente a cada abate";
export const BOTAO_DESLIGADO = "Desligado";
export const DESC_DESLIGADO = "sem efeito quando você vence";
export const BOTAO_PREVIA = "Ver uma prévia";
export const PREVIA_ESPERA = "Calma! Espera um pouquinho para ver outra prévia.";
export const PREVIA_FORA = "Os efeitos de abate estão desligados pela staff no momento.";
export const NOME_AUTO = "Automático (muda a cada abate)";
export const NOME_DESLIGADO = "Desligado";

/** @type {Record<string, string>} */
export const DESCRICOES = {
  caudas: "nove caudas de fogo girando e cortes de luz",
  sakura: "pétalas, flor de cerejeira e redemoinhos rosados",
  lunar: "luas crescentes que cortam o ar e estrelas",
  espirito: "máscara de raposa e chamas azuis",
  brasa: "colunas de fogo e brasas voando",
  aurora: "cortinas de luz verde e ondas coloridas",
  estelar: "estrelas de quatro pontas e chuva de brilho",
  sombra: "gato de sombra com olhos acesos",
  ditadora: "onigiri com orelhinhas, patinhas e brilho roxo",
};

/** @param {string} tema */
export const NOME_TEMA = (tema) => ESTILOS_BANDEIRA_INFO[tema]?.nome ?? tema;
/** @param {string} nome @param {string} desc @param {boolean} atual */
export const BOTAO_OPCAO = (nome, desc, atual) => `${nome}${atual ? " §a✔" : ""}\n§7${desc}`;
/** @param {string} nome */
export const BARRA_ABATE = (nome) => `§e✦ §fAbate §7• §e${nome}`;
/** @param {string} escolha */
export const NOME_ESCOLHA = (escolha) => (escolha === "auto" ? NOME_AUTO : escolha === "off" ? NOME_DESLIGADO : NOME_TEMA(escolha));
