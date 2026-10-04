// @ts-check
// Filtro simples de palavrões para nomes escolhidos no jogo (clã, tag e apelido). Compara sem acento,
// sem maiúscula, sem símbolo e desfazendo trocas comuns (4 = a, 3 = e, 0 = o...). Não pega tudo: a staff
// ainda pode trocar a tag ou resetar um apelido.

/** Trechos proibidos em qualquer parte do texto. */
const TRECHOS = [
  "porra", "caralh", "merda", "puta", "puto", "buceta", "boceta", "bucet", "piroca",
  "foder", "fode", "fuder", "cacete", "arromb", "viado", "bicha", "vadia", "corno", "bosta", "punheta",
  "xoxota", "xereca", "otario", "retardad", "macaco", "nazi", "hitler", "fuck", "shit", "bitch", "cunt",
  "dick", "pussy", "nigg", "whore", "slut", "estupr", "pedofil",
];
/** Tags de 3 letras que não podem ser usadas (abreviações de palavrão e de ódio). */
const TAGS = new Set(["FDP", "VSF", "PQP", "TNC", "KCT", "CU", "CUS", "CUU", "PAU", "PUT", "KKK", "SS", "SSS", "NAZ", "FUK", "FUC", "SEX", "XXX", "VTC", "VTM", "BCT", "PNC", "PIK", "ANU", "ANS"]);
/** @type {Record<string, string>} */
const TROCAS = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };

/**
 * Texto reduzido para comparação: sem acento, minúsculo, trocas desfeitas e só letras.
 * @param {string} texto
 */
export function reduzir(texto) {
  return [...texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()]
    .map((c) => TROCAS[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

/**
 * Se o texto tem palavrão (ou é uma tag proibida).
 * @param {string} texto
 * @returns {boolean}
 */
export function temPalavrao(texto) {
  if (TAGS.has(texto.trim().toUpperCase())) return true;
  const limpo = reduzir(texto);
  return TRECHOS.some((t) => limpo.includes(t));
}
