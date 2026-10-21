// @ts-check
// Leitura do canal que o pack principal escreve: scoreboard (docs/spec/03_spec_fase2.md §8.5) e as tags de
// entidade do clã e do visual Kitsune (docs/spec/04_spec_clas.md). Só lê, nunca escreve.
import { world } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").ScoreboardObjective} ScoreboardObjective */

/** Versão do formato do canal que este pack entende. */
const VERSAO_CANAL = 1;
const TAG_KITSUNE = "vulpus:kitsune";
const NIVEL_MAXIMO = 1000;
const RANK_MAXIMO = 4;
const CARGO_MAXIMO = 3;
/** "vulpus:cla:ABC:6" ou "vulpus:cla:ABC:6:pordosol" */
const TAG_CLA = /^vulpus:cla:([A-Z0-9]{3}):([0-9a-g])(?::([a-z]{1,16}))?$/;
const TAG_NOME = "vulpus:nome:";
const TAG_TEMA = /^vulpus:tema:([a-z]{1,16})$/;
/** "vulpus:msgcor:b": cor da mensagem do Kitsune (só uma das CORES_MENSAGEM vale; qualquer outra coisa é ignorada). */
const TAG_MSGCOR = /^vulpus:msgcor:([0-9a-g])$/;
/** As 8 cores que o Kitsune escolhe para a mensagem (cópia de CORES_MENSAGEM em vulpus_bp/scripts/sistemas/kitsune_extras.js). */
const CORES_MENSAGEM = Object.freeze(["b", "a", "e", "d", "c", "6", "9", "3"]);
const APELIDO_MAX = 16;
/** Letras do apelido (cópia de LETRAS_APELIDO em vulpus_bp/scripts/sistemas/kitsune.js): latino, números, espaço e _ . - */
const LETRAS_APELIDO = /^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]+$/;

/**
 * cla = tag, cor e tema do clã (null sem clã); o tema do nome e o apelido valem quando o addon pôs a tag (selo Kitsune, tema de evento
 * ou tema liberado para todos, ou apelido de um dono; "" = nenhum); msgCor = cor da mensagem (só com o selo; "" = branco).
 * @typedef {{ nivel: number, rank: number, cargo: number, kitsune: boolean,
 *   cla: { tag: string, cor: string, tema: string } | null, apelido: string, tema: string, msgCor: string }} Identidade
 */

/**
 * Score do participante, ou undefined se ele ainda não tem score (o jogo lança
 * "Failed to resolve identity" em vez de devolver undefined).
 * @param {ScoreboardObjective | undefined} objective
 * @param {Player | string} participante
 */
function lerScore(objective, participante) {
  try {
    return objective?.getScore(participante);
  } catch {
    return undefined;
  }
}

/**
 * Score inteiro do jogador no objective, limitado a 0..maximo. Sem objective ou sem score dá 0.
 * @param {ScoreboardObjective | undefined} objective
 * @param {Player} player
 * @param {number} maximo
 */
function scoreDe(objective, player, maximo) {
  const valor = lerScore(objective, player);
  if (typeof valor !== "number" || !Number.isInteger(valor)) return 0;
  return Math.min(maximo, Math.max(0, valor));
}

/**
 * Identidade do jogador pelo canal, ou undefined se o canal não existe ou está noutra versão
 * (aí o chat fica vanilla). Jogador ainda sem score: nível 0, rank 0, sem cargo.
 * @param {Player} player
 * @returns {Identidade | undefined}
 */
export function lerIdentidade(player) {
  const scoreboard = world.scoreboard;
  const canal = scoreboard.getObjective("vulpus_canal");
  if (!canal || lerScore(canal, "#versao") !== VERSAO_CANAL) return undefined;
  const kitsune = player.hasTag(TAG_KITSUNE);
  return {
    nivel: scoreDe(scoreboard.getObjective("vulpus_nivel"), player, NIVEL_MAXIMO),
    rank: scoreDe(scoreboard.getObjective("vulpus_rank"), player, RANK_MAXIMO),
    cargo: scoreDe(scoreboard.getObjective("vulpus_cargo"), player, CARGO_MAXIMO),
    kitsune,
    ...lerTags(player.getTags(), kitsune),
  };
}

/**
 * Clã, apelido e tema pelas tags de entidade. Apelido estranho (símbolos, § ou grande demais) é ignorado.
 * @param {string[]} tags
 * @param {boolean} kitsune
 * @returns {{ cla: { tag: string, cor: string, tema: string } | null, apelido: string, tema: string, msgCor: string }}
 */
export function lerTags(tags, kitsune) {
  /** @type {{ cla: { tag: string, cor: string, tema: string } | null, apelido: string, tema: string, msgCor: string }} */
  const saida = { cla: null, apelido: "", tema: "", msgCor: "" };
  for (const tag of tags) {
    const cla = TAG_CLA.exec(tag);
    if (cla) saida.cla = { tag: cla[1], cor: cla[2], tema: cla[3] ?? "" };
    // O apelido vale sem selo também: o addon só põe a tag quando é de um dono (sem selo) ou de quem tem o selo.
    if (tag.startsWith(TAG_NOME)) saida.apelido = decodificar(tag.slice(TAG_NOME.length));
    // O tema também vale sem selo (de evento, ou liberado para todos): o addon só põe a tag de quem pode usar.
    const tema = TAG_TEMA.exec(tag);
    if (tema) saida.tema = tema[1];
    // A cor da mensagem é só do selo e só entre as fixas: o texto de quem fala nunca vira código de cor.
    const cor = TAG_MSGCOR.exec(tag);
    if (cor && kitsune && CORES_MENSAGEM.includes(cor[1])) saida.msgCor = cor[1];
  }
  return saida;
}

/**
 * Apelido gravado com encodeURIComponent; "" se não for um apelido válido.
 * @param {string} codificado
 */
function decodificar(codificado) {
  try {
    const nome = decodeURIComponent(codificado);
    return [...nome].length <= APELIDO_MAX && LETRAS_APELIDO.test(nome) ? nome : "";
  } catch {
    return "";
  }
}
