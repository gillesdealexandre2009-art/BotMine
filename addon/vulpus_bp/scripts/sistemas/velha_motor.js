// @ts-check
// Motor do jogo da velha (sem nada do Minecraft). Tabuleiro: 9 casas (0 a 8, da esquerda para a direita, de cima para baixo).

/** @typedef {"X" | "O"} Marca */

export const LINHAS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Tabuleiro vazio. @returns {(Marca | null)[]} */
export const novoTabuleiro = () => Array(9).fill(null);

/**
 * Quem ganhou (e a linha), ou undefined.
 * @param {(Marca | null)[]} t
 */
export function vencedor(t) {
  for (const l of LINHAS) {
    const [a, b, c] = l;
    if (t[a] && t[a] === t[b] && t[a] === t[c]) return { marca: t[a], linha: l };
  }
  return undefined;
}

/** Deu velha (cheio sem vencedor)? @param {(Marca | null)[]} t */
export const empatou = (t) => !vencedor(t) && t.every((c) => c !== null);

/** Casas livres. @param {(Marca | null)[]} t */
export const livres = (t) => t.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);

export const NOMES_CASA = [
  "Canto superior esquerdo",
  "Topo",
  "Canto superior direito",
  "Meio à esquerda",
  "Centro",
  "Meio à direita",
  "Canto inferior esquerdo",
  "Embaixo",
  "Canto inferior direito",
];

/**
 * Tabuleiro em texto com códigos de cor (X vermelho, O azul).
 * @param {(Marca | null)[]} t
 * @param {number[]} [linha]  casas da linha vencedora (ficam verdes)
 */
export function tabuleiroTexto(t, linha = []) {
  const cel = (/** @type {number} */ i) => {
    const c = t[i];
    if (!c) return "§8·";
    return `${linha.includes(i) ? "§a" : c === "X" ? "§c" : "§b"}${c}`;
  };
  return [0, 1, 2].map((l) => `§7   ${cel(l * 3)} §7|§r ${cel(l * 3 + 1)} §7|§r ${cel(l * 3 + 2)}`).join("\n§8   ─┼─┼─\n");
}
