// @ts-check
// Textos do acesso antecipado a cosmético novo (sistemas/cosmetico_antecipado.js e o painel do dono).
import { formatarData } from "../core/util.js";

export const BOTAO_PAINEL = "Cosmético antecipado";
export const TITULO_PAINEL = "Cosmético antecipado";
export const BOTAO_MARCAR = "Marcar um tema como antecipado";
export const TITULO_MARCAR = "Tema antecipado";
export const ROTULO_TEMA = "Qual tema de nome?";
export const ROTULO_DIAS = "Por quantos dias só os Kitsunes usam? (1 a 90; depois todo mundo usa)";
export const SO_DONO = "Só um dono marca cosmético antecipado.";
export const TEMA_INVALIDO = "Esse tema não existe ou é de evento (esses só vão para quem desbloqueia).";
export const DIAS_INVALIDOS = "Escolha de 1 a 90 dias.";
export const NADA = "§7Nenhum tema marcado ainda. Um tema marcado fica só para os Kitsunes até a data e, depois dela, §fqualquer pessoa pode usar§7.";

/** @param {string} nome @param {number} ate */
export const LINHA_ANTECIPADO = (nome, ate) => `§e* ${nome}§7: só Kitsune até §f${formatarData(ate)}§7; depois fica livre para todos`;
/** @param {string} nome @param {number} ate */
export const LINHA_LIVRE = (nome, ate) => `§a* ${nome}§7: livre para todos desde §f${formatarData(ate)}`;
/** @param {string[]} linhas */
export const CORPO_PAINEL = (linhas) =>
  ["§7Aqui você solta um tema de nome novo primeiro para os Kitsunes. Na data marcada ele vira de todo mundo.", "", ...(linhas.length ? linhas : [NADA])].join("\n");

/** @param {string} nome @param {boolean} livre */
export const BOTAO_ITEM = (nome, livre) => `${livre ? "Tirar a marca" : "Cancelar"}: ${nome}\n§7${livre ? "volta a ser só dos Kitsunes" : "sem data: continua só dos Kitsunes"}`;
/** @param {string} nome @param {boolean} livre */
export const CONFIRMAR_CANCELAR = (nome, livre) =>
  livre
    ? `${nome} já está livre para todos. Tirar a marca volta o tema a ser só dos Kitsunes (quem não tem selo e usava deixa de ver a cor). Confirma?`
    : `Cancelar o acesso antecipado de ${nome}? O tema continua só dos Kitsunes, sem data para abrir para todos.`;

/** @param {string} nome @param {number} dias @param {number} ate */
export const MARCADO = (nome, dias, ate) => `${nome}: só Kitsune por ${dias} dia${dias === 1 ? "" : "s"}. Em ${formatarData(ate)} fica livre para todos.`;
/** @param {string} nome */
export const CANCELADO = (nome) => `Marca de ${nome} removida.`;
export const NAO_MARCADO = "Esse tema não está marcado.";

/** Sufixo do botão do tema no menu de cor do nome. @param {number} ate */
export const SELO_NOVO = (ate) => `novo: livre para todos em ${formatarData(ate)}`;
/** @param {number} ate */
export const SELO_LIVRE = (ate) => `liberado para todos desde ${formatarData(ate)}`;
/** Explicação no menu de cor do nome. */
export const DICA_MENU = "§7Temas §enovos§7 ficam só para Kitsunes por um tempo; depois da data, todo mundo pode usar.";
/** @param {string} nome @param {number} ate */
export const SO_KITSUNE_ATE = (nome, ate) => `${nome} é novo e, até ${formatarData(ate)}, só quem tem o selo Kitsune usa. Depois dessa data fica livre para todos.`;
