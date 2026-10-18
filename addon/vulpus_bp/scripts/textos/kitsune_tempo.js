// @ts-check
// Textos do selo Kitsune com prazo (dado pelo dono).
import { formatarData } from "../core/util.js";

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

/**
 * "12 dias", "1 dia e 3 h", "5 h" ou "menos de 1 h".
 * @param {number} ms
 */
export function restante(ms) {
  const m = Math.max(0, ms);
  const dias = Math.floor(m / DIA_MS);
  const horas = Math.floor((m % DIA_MS) / HORA_MS);
  if (dias >= 2) return `${dias} dias`;
  if (dias === 1) return horas > 0 ? `1 dia e ${horas} h` : "1 dia";
  if (horas >= 1) return `${horas} h`;
  return "menos de 1 h";
}

/** @param {number} ate */
export const VALE_ATE = (ate) => `até ${formatarData(ate)}`;

/** @param {number} ate */
export const AVISO_COMPRA = (ate) => `§6Kitsune §8» §7Seu pagamento foi confirmado! Você é Kitsune até §f${formatarData(ate)}§7. Obrigada por ajudar a toca! §6🦊`;

export const SO_DONO = "Só um dono pode dar o selo Kitsune.";
export const DIAS_INVALIDOS = "Escolha de 1 a 365 dias.";
/** @param {string} nome */
export const JA_PERMANENTE = (nome) => `${nome} já tem o selo Kitsune do Discord (sem prazo). Não precisa de prazo.`;
/** @param {string} nome */
export const NAO_ACHADA = (nome) => `Não achei ninguém chamado "${nome}".`;
/** @param {string} nome */
export const NAO_TEM = (nome) => `${nome} não tem selo Kitsune com prazo.`;

/** @param {string} nome @param {number} dias @param {number} ate @param {boolean} prorrogou */
export const DONO_OK = (nome, dias, ate, prorrogou) =>
  `${prorrogou ? "Prazo de" : "Selo Kitsune para"} ${nome}: +${dias} dia${dias === 1 ? "" : "s"}. Vale ${VALE_ATE(ate)}.`;
/** @param {number} dias @param {number} ate @param {boolean} prorrogou */
export const AVISO_DADO = (dias, ate, prorrogou) =>
  `§d✦ §f${prorrogou ? "Seu selo §dKitsune §ffoi prorrogado" : "Você ganhou o selo §dKitsune"} (+${dias} dia${dias === 1 ? "" : "s"})! Vale ${VALE_ATE(ate)}. Use §e/apelido§f para mudar o nome e a cor.`;
/** @param {string} nome */
export const TIRADO_DONO = (nome) => `Selo Kitsune com prazo de ${nome} removido.`;
export const AVISO_TIRADO = "§d✦ §fSeu selo Kitsune com prazo foi encerrado.";
export const AVISO_EXPIROU = "§d✦ §fSeu selo §dKitsune §ftemporário acabou. Obrigado por fazer parte da toca! Quer continuar? Fale com a staff.";
/** @param {number} ms @param {number} ate */
export const AVISO_RESTANTE = (ms, ate) => `§d✦ §7Seu selo Kitsune expira em §f${restante(ms)} §7(${VALE_ATE(ate)}).`;
/** @param {number} ms @param {number} ate */
export const LINHA_MENU = (ms, ate) => `§dSelo Kitsune temporário: §fexpira em ${restante(ms)} §7(${VALE_ATE(ate)})`;

// Painel de Dono
export const BOTAO_PAINEL = "Kitsune com prazo";
export const TITULO_PAINEL = "Kitsune com prazo";
export const BOTAO_DAR = "Dar Kitsune com prazo";
export const BOTAO_TIRAR = "Tirar o Kitsune de alguém";
export const TITULO_DAR = "Dar Kitsune";
export const ROTULO_JOGADOR = "Quem? (nome da conta)";
export const ROTULO_DIAS = "Por quantos dias? (1 a 365; somam ao prazo que já tem)";
/** @param {{ nome: string, ate: number }[]} lista @param {number} agora */
export const CORPO_PAINEL = (lista, agora) =>
  [
    "§7O selo Kitsune dá apelido e cor do nome (só visual). Com prazo, ele some sozinho quando acaba e o membro vê quando expira.",
    "",
    lista.length ? "§fCom selo agora:" : "§8Ninguém tem selo com prazo.",
    ...lista.map((c) => `§7- §f${c.nome} §8» §7expira em ${restante(c.ate - agora)} (${VALE_ATE(c.ate)})`),
  ].join("\n");
