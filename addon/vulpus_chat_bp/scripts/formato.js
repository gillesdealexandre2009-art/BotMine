// @ts-check
// Montagem da linha do chat e saneamento da mensagem.
// Cópia própria das tabelas da spec (docs/spec/03_spec_fase2.md §4.2, §8.1 e §8.2) e dos temas de cor
// (vulpus_bp/scripts/cores.js, spec 04): packs não compartilham módulos. Mudou lá, mude aqui.

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

/** Temas de cor (cópia de cores.js do BP, só o que pinta). */
/** @type {Readonly<Record<string, { cores: string[], modo: "degrade" | "ciclo" }>>} */
const TEMAS_COR = Object.freeze({
  rosa: { cores: ["d"], modo: "degrade" },
  ciano: { cores: ["b"], modo: "degrade" },
  verde: { cores: ["a"], modo: "degrade" },
  amarelo: { cores: ["e"], modo: "degrade" },
  vermelho: { cores: ["c"], modo: "degrade" },
  roxo: { cores: ["5"], modo: "degrade" },
  pordosol: { cores: ["e", "6", "c", "d"], modo: "degrade" },
  oceano: { cores: ["b", "3", "9"], modo: "degrade" },
  sakura: { cores: ["f", "d", "5"], modo: "degrade" },
  lava: { cores: ["e", "6", "c", "4"], modo: "degrade" },
  aurora: { cores: ["a", "b", "d"], modo: "degrade" },
  floresta: { cores: ["a", "2"], modo: "degrade" },
  arcoiris: { cores: ["c", "6", "e", "a", "b", "9", "d"], modo: "ciclo" },
  gelo: { cores: ["f", "b", "3"], modo: "degrade" },
  ouro: { cores: ["g", "e", "6"], modo: "degrade" },
  ametista: { cores: ["d", "5"], modo: "degrade" },
  lunar: { cores: ["f", "7", "b"], modo: "degrade" },
  brasa: { cores: ["6", "c", "4"], modo: "degrade" },
});

/**
 * Pinta o texto com o tema (igual ao pintar() do BP). Tema desconhecido: undefined.
 * @param {string} texto
 * @param {string} temaId
 * @returns {string | undefined}
 */
export function pintar(texto, temaId) {
  if (!Object.prototype.hasOwnProperty.call(TEMAS_COR, temaId)) return undefined;
  const { cores, modo } = TEMAS_COR[temaId];
  const letras = [...texto];
  let saida = "";
  let anterior = "";
  letras.forEach((letra, i) => {
    const cor = modo === "ciclo" ? cores[i % cores.length] : cores[Math.min(cores.length - 1, Math.floor((i * cores.length) / letras.length))];
    if (cor !== anterior) saida += `§${cor}`;
    anterior = cor;
    saida += letra;
  });
  return saida;
}

/**
 * Tira glyphs colados e quebras de linha. Devolve "" se não sobrou nada além de espaço.
 * @param {string} mensagem
 */
export function sanear(mensagem) {
  const limpa = mensagem.replace(USO_PRIVADO, "").replace(QUEBRA_LINHA, " ");
  return limpa.trim() === "" ? "" : limpa;
}

/**
 * "{selo}[ {kitsune}] §8[§e{nivel}§8] [§8[{TAG}§8] ]{nome}§8 » §f{mensagem}" (spec 03 §10.2 + spec 04).
 * O cargo substitui o rank no selo e pinta o nome; sem cargo, o nome fica branco. O apelido e o tema
 * Kitsune trocam o nome e a cor dele; a tag do clã vem com a cor (ou o tema) do clã.
 * @param {string} nome  nome da conta
 * @param {Identidade} identidade
 * @param {string} mensagem já saneada
 */
export function montarLinha(nome, identidade, mensagem) {
  const cargo = CARGOS[identidade.cargo];
  const selo = glyph(cargo ? cargo.glyph : GLYPH_RANK[identidade.rank]);
  const kitsune = identidade.kitsune ? ` ${glyph(G.KITSUNE)}` : "";
  const corNome = cargo ? cargo.cor : "§f";
  const visivel = identidade.apelido || nome;
  const nomeFinal = pintar(visivel, identidade.tema) ?? corNome + visivel;
  const cla = identidade.cla
    ? `§8[${pintar(identidade.cla.tag, identidade.cla.tema) ?? `§${identidade.cla.cor}${identidade.cla.tag}`}§8] `
    : "";
  return `${selo}${kitsune} §8[§e${identidade.nivel}§8] ${cla}${nomeFinal}§8 » §f${mensagem}`;
}
