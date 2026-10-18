// @ts-check
// Textos do jogo da masmorra (altares, inimigos, bosses, loot, ranking). Nada de placas: tudo vem por menu, título e mensagem.
import { formatarNumero } from "../core/util.js";

export const NOMES_ANDAR = Object.freeze(["", "A Toca", "A Feira Esquecida", "O Campo de Guerra", "O Sonho", "O Coração das Nove Caudas"]);
export const GUARDIOES = Object.freeze(["", "Raposa Mãe", "Mestre da Feira", "General Sem Bandeira", "O Branco", "Nove Caudas"]);

export const RARIDADES = Object.freeze({
  comum: { nome: "Comum", cor: "§7" },
  incomum: { nome: "Incomum", cor: "§a" },
  raro: { nome: "Raro", cor: "§9" },
  epico: { nome: "Épico", cor: "§d" },
  lendario: { nome: "Lendário", cor: "§6" },
});

/** @param {number} n */
export const TITULO_ANDAR = (n) => `§6§l${NOMES_ANDAR[n]}`;
/** @param {number} n */
export const SUBTITULO_ANDAR = (n) => `§7Andar ${n} de 5 · guardião: §f${GUARDIOES[n]}`;

export const ALTAR_TITULO = "§l§6Altar da Lembrança";
/** @param {number} andar @param {number} selos */
export const ALTAR_CORPO = (andar, selos) =>
  `§7${NOMES_ANDAR[andar]}\n\n§fA luz da Kiza ainda queima aqui. §7Alguém lembrou de nós.\n\n§fSelos conquistados: §e${selos}§7/5`;
export const ALTAR_BOTAO_RANK = "Ranking deste andar";
export const ALTAR_BOTAO_PROGRESSO = "Meu progresso";
export const ALTAR_BOTAO_DESCANSO = "Voltar ao altar";
export const ALTAR_BOTAO_SAIR = "Sair da masmorra";
export const ALTAR_BOTAO_FECHAR = "Fechar";
export const ALTAR_CURA = "§aA luz da Kiza cura suas feridas.";

/** @param {number} andar */
export const SEM_SELO = (andar) => `§cO portal não responde. §7Derrote §f${GUARDIOES[andar]} §7para conquistar o Selo da Cauda.`;
/** @param {number} andar */
export const SELO_NOVO = (andar) => `§6Selo da Cauda conquistado! §7O portal para o andar ${andar + 1} se abriu para você.`;
export const SELO_TITULO = "§6§lSelo da Cauda";
/** @param {string} nome */
export const BOSS_CAIU = (nome) => `§6${nome} §7foi derrotado!`;
/** @param {string} nome */
export const BOSS_ENTRA = (nome) => `§c§l${nome}`;
export const BOSS_SUB = "§7O guardião desperta...";
export const BOSS_FASE = (/** @type {string} */ nome, /** @type {number} */ f) => `§c${nome} §7entra na fase ${f}!`;

export const MORTE_VOLTA = "§7A luz da Kiza te trouxe de volta ao altar. Seus itens estão com você.";
export const SALA_LIMPA = "§aSala limpa.";
export const EMBOSCADA = "§cÉ uma emboscada!";
export const EMBOSCADA_SUB = "§7algo se mexe nas sombras";

export const BAU_JA_ABERTO = "§7Você já levou o que era seu deste baú hoje.";
/** @param {string} raridade @param {string} item */
export const BAU_ACHOU = (raridade, item) => `§7Você encontrou: ${item} §7(${raridade}§7)`;
/** @param {number} n */
export const CAUDAS_GANHAS = (n) => `§e+${formatarNumero(n)} Caudas §7(masmorra)`;
export const TETO_CAUDAS = "§7Você já ganhou o máximo de Caudas da masmorra por hoje. O loot continua valendo.";

export const RANK_TITULO = (/** @type {number} */ n) => `§l§6Ranking · ${NOMES_ANDAR[n]}`;
export const RANK_VAZIO = "§7Ninguém derrotou o guardião deste andar ainda. Seja a primeira pessoa!";
/** @param {number} pos @param {string} nome @param {string} tempo @param {number} mortes */
export const RANK_LINHA = (pos, nome, tempo, mortes) => `§e${pos}. §f${nome} §7— §a${tempo} §7(${mortes} morte${mortes === 1 ? "" : "s"})`;
export const PROGRESSO_TITULO = "§l§6Meu progresso";
/** @param {number} n @param {boolean} selo @param {number} abates */
export const PROGRESSO_LINHA = (n, selo, abates) => `${selo ? "§a✔" : "§8✘"} §f${NOMES_ANDAR[n]} §7— ${abates} inimigo${abates === 1 ? "" : "s"} abatido${abates === 1 ? "" : "s"}`;
export const SEM_DADOS = "§cA masmorra ainda não foi gerada. Peça à staff.";
export const NAO_PODE = "§cVocê não pode usar isso agora.";
