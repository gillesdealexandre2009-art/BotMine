// @ts-check
// Montagem da linha do chat e saneamento da mensagem.
// Cópia própria das tabelas da spec (docs/spec/03_spec_fase2.md §4.2, §8.1 e §8.2): packs não compartilham módulos.

/** @typedef {import("./canal.js").Identidade} Identidade */

/** Códigos dos glyphs do RP usados no chat (tabela 4.2). */
const G = Object.freeze({
  BROTO: "\uE200", RAPOSA: "\uE201", FOLHA: "\uE202", LUA: "\uE203", BRILHO: "\uE204",
  ADMIN: "\uE205", STAFF: "\uE206", HELPER: "\uE207", KITSUNE: "\uE208",
});

/** Glyph do rank pelo índice (tabela 8.1): Filhote, Raposinha, Raposa Andarilha, Raposa Lunar, Raposa de Nove Caudas. */
const GLYPH_RANK = Object.freeze([G.BROTO, G.RAPOSA, G.FOLHA, G.LUA, G.BRILHO]);

/** Cargos pelo código do canal (tabela 8.2): 1 helper, 2 staff, 3 admin. */
/** @type {Readonly<Record<number, { glyph: string, cor: string }>>} */
const CARGOS = Object.freeze({
  1: { glyph: G.HELPER, cor: "§a" },
  2: { glyph: G.STAFF, cor: "§6" },
  3: { glyph: G.ADMIN, cor: "§c" },
});

/** Faixa de uso privado do BMP, onde moram os glyphs (ninguém falsifica selo pelo chat). */
const USO_PRIVADO = /[\uE000-\uF8FF]/g;
const QUEBRA_LINHA = /[\r\n]+/g;

/** Glyph com as cores originais. @param {string} codigo */
const glyph = (codigo) => `§f${codigo}§r`;

/**
 * Tira glyphs colados e quebras de linha. Devolve "" se não sobrou nada além de espaço.
 * @param {string} mensagem
 */
export function sanear(mensagem) {
  const limpa = mensagem.replace(USO_PRIVADO, "").replace(QUEBRA_LINHA, " ");
  return limpa.trim() === "" ? "" : limpa;
}

/**
 * "{selo}[ {kitsune}] §8[§e{nivel}§8] {corNome}{nome}§8 » §f{mensagem}" (spec §10.2).
 * O cargo substitui o rank no selo e pinta o nome; sem cargo, o nome fica branco.
 * @param {string} nome
 * @param {Identidade} identidade
 * @param {string} mensagem já saneada
 */
export function montarLinha(nome, identidade, mensagem) {
  const cargo = CARGOS[identidade.cargo];
  const selo = glyph(cargo ? cargo.glyph : GLYPH_RANK[identidade.rank]);
  const kitsune = identidade.kitsune ? ` ${glyph(G.KITSUNE)}` : "";
  const corNome = cargo ? cargo.cor : "§f";
  return `${selo}${kitsune} §8[§e${identidade.nivel}§8] ${corNome}${nome}§8 » §f${mensagem}`;
}
