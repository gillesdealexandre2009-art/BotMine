// @ts-check
// Textos dos Ajustes (preferências de cada jogador).
import { G, glyph } from "../glyphs.js";

/** @typedef {import("../core/db.js").Tema} Tema */

export const TITULO = "Ajustes";
export const CORPO = "§7Do seu jeitinho. Toque para trocar:";

/** @param {boolean} ligada */
export const BOTAO_HUD = (ligada) => `Scoreboard lateral: ${ligada ? "§aligada" : "§cdesligada"}`;
/** Nome de cada tema do painel, já com a cor. @type {Readonly<Record<Tema, string>>} */
export const NOME_TEMA = Object.freeze({
  laranja: "§6Laranja",
  black: "§fBlack",
  sakura: "§dSakura",
  lunar: "§bLunar",
  espirito: "§uEspírito",
});
/** @type {Readonly<Record<Tema, string>>} */
const DESCRICAO_TEMA = Object.freeze({
  laranja: "Cor de raposa, o clássico",
  black: "Preto com brilho laranja",
  sakura: "Cerejeira e pétalas",
  lunar: "Noite, prata e lua",
  espirito: "Nove caudas de fogo-fátuo",
});
/** @param {Tema} tema */
export const BOTAO_TEMA = (tema) => `Tema do menu: ${NOME_TEMA[tema]}`;
/** @param {boolean} aceitando */
export const BOTAO_TPA = (aceitando) => `Pedidos de TPA: ${aceitando ? "§aaceitando" : "§cbloqueados"}`;
/** @param {boolean} ligada */
export const BOTAO_CLA = (ligada) => `Clã no placar: ${ligada ? "§aaparece" : "§cescondido"}`;
export const BOTAO_KITSUNE = "Cantinho Kitsune";
export const TITULO_CANTO = "Cantinho Kitsune";
export const CANTO_INTRO = "§7Tudo o que o selo Kitsune libera, num lugar só.";
/** @param {boolean} tem */
const marca = (tem) => (tem ? "§a✔" : "§c✘");
/**
 * @param {boolean} tem
 * @param {number} lote
 * @param {boolean} escondidos
 */
export const CANTO_LISTA = (tem, lote, escondidos) =>
  [
    `${marca(tem)} §fApelido e cor do nome §7(inclusive os animados, por nível)`,
    `${marca(tem)} §fTemas do painel: Sakura, Lunar e Espírito`,
    `${marca(tem)} §fEfeito de abate à sua escolha`,
    `${marca(tem)} §fClã: tema e estilo da bandeira`,
    `${marca(tem)} §fCápsulas de pet: abrir §e${lote}§f de uma vez`,
    `${marca(tem)} §fEsconder os pets sem perder os bônus${tem ? ` §7(agora: ${escondidos ? "escondidos" : "visíveis"})` : ""}`,
  ].join("\n");
export const CANTO_SEM_SELO = "\n\n§7Você ainda não tem o selo. Apoie o servidor no Discord (booster) para liberar tudo isso.";
export const BOTAO_CANTO_VISUAL = "Apelido e cor do nome";
export const BOTAO_CANTO_ABATE = "Efeito de abate";
export const BOTAO_CANTO_PAINEL = "Tema do painel";
/** @param {boolean} escondidos */
export const BOTAO_CANTO_PETS = (escondidos) => (escondidos ? "Mostrar meus pets" : "Esconder meus pets");
export const BOTAO_CANTO_PETS_COLECAO = "Minha coleção de pets";
export const BLOQUEADO_KITSUNE = "§7Isso é exclusivo de quem tem o selo Kitsune.";
/** @param {boolean} ligados */
export const BOTAO_SONS = (ligados) => `Sons do menu: ${ligados ? "§aligados" : "§cdesligados"}`;

/** @param {boolean} ligada */
export const HUD_MUDOU = (ligada) =>
  ligada ? "Placar do lado ligado! Tudo à vista." : "Placar do lado desligado. Tela limpinha.";
/** @type {Readonly<Record<Tema, string>>} */
const TEMA_NOVO = Object.freeze({
  laranja: "Tema §6Laranja§r de volta. Cor de raposa!",
  black: "Tema §fBlack§r! Elegante igual raposa à noite.",
  sakura: "Tema §dSakura§r! Choveu pétala de cerejeira na toca.",
  lunar: "Tema §bLunar§r! A lua acendeu os olhos da raposa.",
  espirito: "Tema §uEspírito§r! Nove caudas de fogo-fátuo, que chique.",
});
/** @param {Tema} tema */
export const TEMA_MUDOU = (tema) => TEMA_NOVO[tema];

// Escolha do tema do painel
export const TITULO_TEMAS = "Tema do menu";
/** @param {boolean} kitsune  tem o selo */
export const CORPO_TEMAS = (kitsune) =>
  kitsune
    ? `§7Escolha o visual do painel. Os 5 são seus: valeu por apoiar a toca! ${glyph(G.KITSUNE)}`
    : `§7Escolha o visual do painel. Muda só o menu, nada no jogo.\nOs com ${glyph(G.KITSUNE)}§7 são mimo do selo Kitsune.`;
/**
 * Botão da escolha: nome e descrição; o atual ganha ✔ e o travado mostra o selo Kitsune.
 * @param {Tema} tema
 * @param {boolean} atual
 * @param {boolean} livre  pode usar
 */
export const BOTAO_ESCOLHA_TEMA = (tema, atual, livre) =>
  livre
    ? `${NOME_TEMA[tema]}${atual ? " §a✔" : ""}\n§7${DESCRICAO_TEMA[tema]}`
    : `§8${NOME_TEMA[tema].slice(2)} ${glyph(G.KITSUNE)}\n§7Selo Kitsune`;
export const TITULO_TEMA_KITSUNE = "Tema Kitsune";
export const TEMA_SO_KITSUNE =
  "§7Os temas §dSakura§7, §bLunar§7 e §uEspírito§7 são mimos de quem apoia a toca no Discord (selo Kitsune).\n\n" +
  "§fÉ só visual: não muda nada no jogo. Quer saber mais? Pergunta para a staff!";
/** @param {boolean} aceitando */
export const TPA_MUDOU = (aceitando) =>
  aceitando ? "Pedidos de TPA liberados de novo." : "Pedidos de TPA bloqueados. Ninguém vai te chamar.";
/** @param {boolean} ligados */
export const SONS_MUDOU = (ligados) => (ligados ? "Sons ligados. Pi-pi-pi!" : "Sons desligados. Silêncio de raposa.");

/** @param {boolean} ligada */
/** @param {boolean} ligadas */
export const BOTAO_PEGADINHAS = (ligadas) => `Pegadinhas do dono: ${ligadas ? "§aligadas" : "§cdesligadas"}`;
/** @param {boolean} ligadas */
export const PEGADINHAS_MUDOU = (ligadas) => (ligadas ? "Pegadinhas ligadas. Cuidado com o Herobrine!" : "Pegadinhas desligadas e paradas. Ninguém te assusta mais.");
/** @param {boolean} ligada */
export const BOTAO_MUSICA = (ligada) => `Música e sons de ambiente: ${ligada ? "§aligada" : "§cdesligada"}`;
/** @param {boolean} ligada */
export const MUSICA_MUDOU = (ligada) => (ligada ? "Música e sons de ambiente ligados. Aproveite a calma." : "Música e sons de ambiente desligados.");
export const CLA_MUDOU = (ligada) => (ligada ? "O clã volta a aparecer no placar." : "Clã escondido do placar.");

export const DESC_HUD = "Liga ou desliga o placar do lado da tela";
