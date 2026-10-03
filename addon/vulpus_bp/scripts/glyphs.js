// @ts-check
// Códigos dos glyphs do RP (font/glyph_E2.png e glyph_E3.png). Tabela fixa: docs/spec/03_spec_fase2.md §4.2.

export const G = Object.freeze({
  BROTO: "\uE200",
  RAPOSA: "\uE201",
  FOLHA: "\uE202",
  LUA: "\uE203",
  BRILHO: "\uE204",
  ADMIN: "\uE205",
  STAFF: "\uE206",
  HELPER: "\uE207",
  KITSUNE: "\uE208",
  CAUDAS: "\uE210",
  NIVEL: "\uE211",
  BARRA_CHEIA: "\uE212",
  BARRA_VAZIA: "\uE213",
  ONLINE: "\uE214",
  LOCAL: "\uE215",
  TEMPO: "\uE216",
  LEILAO: "\uE220",
  VENDER: "\uE221",
  COMPRAR: "\uE222",
  CAIXA: "\uE223",
  BUSCA: "\uE224",
  HISTORICO: "\uE225",
  ENCANTADO: "\uE226",
  TITULO: "\uE300\uE301\uE302\uE303\uE304",
});

/**
 * Glyph com as cores originais: "§f" + codigo + "§r". Depois dele, ponha de novo a cor do texto.
 * @param {string} codigo
 * @returns {string}
 */
export function glyph(codigo) {
  return "§f" + codigo + "§r";
}

/**
 * Barra de progresso: round(fracao*segmentos) BARRA_CHEIA + o resto BARRA_VAZIA, já com "§f…§r".
 * fracao fora de 0..1 é limitada.
 * @param {number} fracao
 * @param {number} [segmentos] padrão 10
 * @returns {string}
 */
export function barra(fracao, segmentos = 10) {
  const total = Math.max(0, Math.floor(segmentos));
  const limitada = Number.isFinite(fracao) ? Math.min(1, Math.max(0, fracao)) : 0;
  const cheios = Math.round(limitada * total);
  return glyph(G.BARRA_CHEIA.repeat(cheios) + G.BARRA_VAZIA.repeat(total - cheios));
}
