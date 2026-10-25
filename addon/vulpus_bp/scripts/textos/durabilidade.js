// @ts-check
// Textos da durabilidade no HUD (caixa lateral, alerta no chat e seletor em Ajustes).

/** Nome curto por parte final do id (pt-BR). A ordem importa: o primeiro que casa vale. @type {readonly (readonly [RegExp, string])[]} */
const NOMES = Object.freeze([
  [/(^|_)pickaxe$/, "Picareta"],
  [/(^|_)sword$/, "Espada"],
  [/(^|_)axe$/, "Machado"],
  [/(^|_)shovel$/, "Pá"],
  [/(^|_)hoe$/, "Enxada"],
  [/crossbow$/, "Besta"],
  [/(^|_)bow$/, "Arco"],
  [/trident$/, "Tridente"],
  [/shield$/, "Escudo"],
  [/elytra$/, "Elytra"],
  [/fishing_rod$/, "Vara"],
  [/on_a_stick$/, "Vara"],
  [/shears$/, "Tesoura"],
  [/flint_and_steel$/, "Isqueiro"],
  [/mace$/, "Maça"],
  [/brush$/, "Pincel"],
  [/helmet$/, "Capacete"],
  [/chestplate$/, "Peitoral"],
  [/leggings$/, "Calça"],
  [/boots$/, "Botas"],
  [/wolf_armor$/, "Armadura"],
  [/varinha_lamento$/, "Varinha"],
]);

/** Nome curto para a linha (até 12 caracteres). @param {string} typeId */
export function nomeCurto(typeId) {
  const base = typeId.includes(":") ? typeId.slice(typeId.indexOf(":") + 1) : typeId;
  for (const [re, nome] of NOMES) if (re.test(base)) return nome;
  const livre = base.replace(/_/g, " ");
  const bonito = livre.charAt(0).toUpperCase() + livre.slice(1);
  return [...bonito].length > 12 ? [...bonito].slice(0, 12).join("").trimEnd() : bonito;
}

/**
 * Linha do HUD: "Picareta 82%" (nome cinza, % na cor da faixa).
 * @param {string} nome
 * @param {number} pct
 * @param {string} cor
 */
export const LINHA = (nome, pct, cor) => `§7${nome} ${cor}${pct}%`;

/**
 * Aviso no chat.
 * @param {string} nome
 * @param {number} pct
 * @param {boolean} critico
 */
export const ALERTA = (nome, pct, critico) =>
  critico ? `§c${nome} está quase quebrando (${pct}%)! Conserte já.` : `§e${nome} está gastando (${pct}%). Hora de consertar.`;

/** Rótulo e botão de cada modo do seletor (Ajustes). @type {Readonly<Record<string, string>>} */
export const NOME_MODO = Object.freeze({
  tudo: "§aMão e armadura",
  armadura: "§eSó armadura",
  alerta: "§bSó alerta",
  desligado: "§cDesligado",
});
/** @param {string} modo */
export const BOTAO_DURABILIDADE = (modo) => `Durabilidade no HUD: ${NOME_MODO[modo] ?? modo}`;
/** @param {string} modo */
export const DURABILIDADE_MUDOU = (modo) =>
  ({
    tudo: "Durabilidade: mão e armadura no placar, mais o aviso de quase quebrar.",
    armadura: "Durabilidade: só a armadura no placar (e o aviso de quase quebrar das peças).",
    alerta: "Durabilidade: sem linhas no placar, só o aviso de quase quebrar.",
    desligado: "Durabilidade desligada: sem linhas e sem aviso.",
  })[modo] ?? "";
