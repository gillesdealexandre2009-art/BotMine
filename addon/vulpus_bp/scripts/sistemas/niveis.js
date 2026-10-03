// @ts-check
// Níveis e ranks, iguais aos do Discord: XP total guardado, nível calculado (5n² + 50n + 100 por nível).
// XP vem do minuto ativo e da diária (ganchos em caudas.js). Não importa caudas, hud nem identidade.
import { Player, world } from "@minecraft/server";
import { ICONES, SONS } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, todosJogadores } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro, som } from "../core/util.js";
import { G } from "../glyphs.js";
import { JOGADOR_OFFLINE, PREFIXO } from "../textos/geral.js";
import * as textos from "../textos/niveis.js";

/** @typedef {{ indice: number, nivelMinimo: number, nome: string, glyph: string, cor: string }} Rank */
/**
 * @typedef {{ xp: number, nivel: number, xpNoNivel: number, xpParaProximo: number, fracao: number,
 *   rank: Rank, proximoRank: Rank | undefined }} InfoNivel
 */
/** @typedef {(player: Player, antes: InfoNivel, depois: InfoNivel) => void} OuvinteNivel */

const NIVEL_MAXIMO = 1000;
const XP_MAXIMO = 1_000_000_000;
const TOP_RANKING = 10;

/** Tabela de ranks (spec 03, §8.1). */
export const RANKS = Object.freeze(
  /** @type {Rank[]} */ ([
    { indice: 0, nivelMinimo: 0, nome: textos.NOMES_RANK[0], glyph: G.BROTO, cor: "§a" },
    { indice: 1, nivelMinimo: 5, nome: textos.NOMES_RANK[1], glyph: G.RAPOSA, cor: "§6" },
    { indice: 2, nivelMinimo: 10, nome: textos.NOMES_RANK[2], glyph: G.FOLHA, cor: "§e" },
    { indice: 3, nivelMinimo: 15, nome: textos.NOMES_RANK[3], glyph: G.LUA, cor: "§b" },
    { indice: 4, nivelMinimo: 20, nome: textos.NOMES_RANK[4], glyph: G.BRILHO, cor: "§d" },
  ].map((rank) => Object.freeze(rank))),
);

/** @type {OuvinteNivel[]} */
const ouvintes = [];

/**
 * XP para subir do nível n para o n+1.
 * @param {number} nivel
 * @returns {number} 5n² + 50n + 100
 */
export function xpParaSubir(nivel) {
  return 5 * nivel * nivel + 50 * nivel + 100;
}

/**
 * XP total (inteiro entre 0 e o teto).
 * @param {unknown} xp
 */
const xpValido = (xp) => (typeof xp === "number" && Number.isFinite(xp) ? Math.min(XP_MAXIMO, Math.max(0, Math.floor(xp))) : 0);

/**
 * Nível a partir do XP total: começa no 0 e desconta enquanto der.
 * @param {number} xp  total
 * @returns {{ nivel: number, xpNoNivel: number, xpParaProximo: number }}
 */
export function nivelDeXp(xp) {
  let resto = xpValido(xp);
  let nivel = 0;
  while (nivel < NIVEL_MAXIMO && resto >= xpParaSubir(nivel)) {
    resto -= xpParaSubir(nivel);
    nivel++;
  }
  return { nivel, xpNoNivel: resto, xpParaProximo: xpParaSubir(nivel) };
}

/**
 * XP total para chegar no nível (soma dos degraus abaixo dele).
 * @param {number} nivel
 */
function xpAteNivel(nivel) {
  let total = 0;
  for (let n = 0; n < nivel; n++) total += xpParaSubir(n);
  return total;
}

/**
 * @param {number} nivel
 * @returns {Rank}
 */
export function rankDoNivel(nivel) {
  let rank = RANKS[0];
  for (const r of RANKS) if (nivel >= r.nivelMinimo) rank = r;
  return rank;
}

/**
 * Situação de nível de alguém. Vale para offline (id).
 * @param {Player | string} alvo
 * @returns {InfoNivel}
 */
export function infoNivel(alvo) {
  const xp = xpValido(dadosJogador(alvo).xp);
  const { nivel, xpNoNivel, xpParaProximo } = nivelDeXp(xp);
  const rank = rankDoNivel(nivel);
  return {
    xp,
    nivel,
    xpNoNivel,
    xpParaProximo,
    fracao: nivel >= NIVEL_MAXIMO ? 1 : Math.min(1, xpNoNivel / xpParaProximo),
    rank,
    proximoRank: RANKS[rank.indice + 1],
  };
}

/**
 * Avisa quem subiu: mensagem, som e, se trocou de rank, título e aviso para todo mundo.
 * Depois chama os ouvintes de aoSubirNivel. Não lança: o XP já está salvo e quem chamou
 * (o ciclo de presença das Caudas) tem que seguir.
 * @param {Player} player
 * @param {InfoNivel} antes
 * @param {InfoNivel} depois
 */
function avisarSubida(player, antes, depois) {
  try {
    ok(player, textos.SUBIU(depois.nivel));
    som(player, SONS.nivel);
    if (depois.rank.indice !== antes.rank.indice) {
      mostrarTitulo(player, textos.RANK(depois.rank), { subtitulo: textos.SUBTITULO_RANK(depois.rank.nome) });
      world.sendMessage(PREFIXO + textos.ANUNCIO_RANK(player.name, depois.rank));
    }
  } catch (e) {
    registrarErro("Aviso de nível", e);
  }
  for (const ouvinte of ouvintes) {
    try {
      ouvinte(player, antes, depois);
    } catch (e) {
      registrarErro("Ouvinte de nível", e);
    }
  }
}

/**
 * Soma XP (inteiro ≥ 0), salva e, se subir de nível com o jogador online, avisa e dispara aoSubirNivel.
 * @param {Player | string} alvo
 * @param {number} quantidade
 * @returns {InfoNivel} o novo estado
 */
export function ganharXp(alvo, quantidade) {
  const antes = infoNivel(alvo);
  const ganho = Number.isFinite(quantidade) ? Math.floor(quantidade) : 0;
  if (ganho <= 0 || antes.xp >= XP_MAXIMO) return antes;
  editarJogador(alvo, (d) => {
    d.xp = Math.min(XP_MAXIMO, antes.xp + ganho);
  });
  const depois = infoNivel(alvo);
  if (depois.nivel > antes.nivel) {
    const player = typeof alvo === "string" ? porId(alvo) : alvo;
    if (player?.isValid) avisarSubida(player, antes, depois);
  }
  return depois;
}

/**
 * Chamado por caudas.js uma vez por minuto ativo.
 * @param {Player} player
 */
export function ganharXpMinutoAtivo(player) {
  ganharXp(player, config().xpPorMinuto);
}

/**
 * Chamado por caudas.resgatarDiaria: XP da diária com um aviso curto.
 * @param {Player} player
 */
export function ganharXpDiaria(player) {
  const xp = Math.floor(config().xpDiaria);
  if (!(xp > 0)) return;
  msg(player, textos.XP_DIARIA(xp));
  ganharXp(player, xp);
}

/**
 * Registra quem quer saber de subida de nível (só de quem está online).
 * @param {OuvinteNivel} fn
 */
export function aoSubirNivel(fn) {
  ouvintes.push(fn);
}

/**
 * Top n por XP, inclusive offline. Empate: ordem alfabética.
 * @param {number} n
 * @returns {{ id: string, nome: string, nivel: number, xp: number }[]}
 */
export function rankingNivel(n) {
  return todosJogadores()
    .map(({ id, dados }) => {
      const xp = xpValido(dados.xp);
      return { id, nome: dados.nome || textos.NOME_DESCONHECIDO, nivel: nivelDeXp(xp).nivel, xp };
    })
    .filter((linha) => linha.xp > 0)
    .sort((a, b) => b.xp - a.xp || a.nome.localeCompare(b.nome))
    .slice(0, Math.max(0, n));
}

/**
 * Menu "Nível": rank, nível, barra, XP e próximo rank; de quem abriu ou, com alvoId, de outra pessoa.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {string} [alvoId]  id do jogador a mostrar (padrão: o próprio)
 */
export async function menuNivel(player, voltar, alvoId) {
  const id = alvoId ?? player.id;
  const proprio = id === player.id;
  const alvoOnline = proprio ? player : porId(id);
  const alvo = alvoOnline ?? id;
  const nome = dadosJogador(alvo).nome || textos.NOME_DESCONHECIDO;
  const info = infoNivel(alvo);
  const aqui = () => menuNivel(player, voltar, alvoId);
  await new Lista(proprio ? textos.TITULO : textos.TITULO_DE(nome))
    .texto(textos.CORPO(info, { nome, online: Boolean(alvoOnline), proprio }))
    .botao(textos.BOTAO_RANKS, ICONES.ranks, (p) => menuRanks(p, aqui, info.rank))
    .botao(textos.BOTAO_RANKING, ICONES.ranking, (p) => menuRanking(p, aqui))
    .botao(textos.BOTAO_COMO_GANHAR, ICONES.nivel, (p) => menuComoGanhar(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Os 5 ranks, com o nível e o XP de cada um.
 * @param {Player} player
 * @param {() => any} voltar
 * @param {Rank} atual  rank de quem está sendo mostrado
 */
async function menuRanks(player, voltar, atual) {
  const linhas = RANKS.map((rank) => textos.RANKS_LINHA(rank, xpAteNivel(rank.nivelMinimo), rank.indice === atual.indice));
  await new Lista(textos.TITULO_RANKS)
    .texto([...linhas, "", textos.RANKS_RODAPE].join("\n"))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Top 10 por XP, com marca de online e a posição de quem abriu.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuRanking(player, voltar) {
  const todos = rankingNivel(Number.MAX_SAFE_INTEGER);
  const conectados = new Set(online().map((p) => p.id));
  const linhas = todos
    .slice(0, TOP_RANKING)
    .map((linha, i) =>
      textos.RANKING_LINHA(i + 1, linha.nome, linha.nivel, rankDoNivel(linha.nivel), {
        online: conectados.has(linha.id),
        voce: linha.id === player.id,
      }),
    );
  const posicao = todos.findIndex((linha) => linha.id === player.id) + 1;
  const corpo = todos.length
    ? [...linhas, "", textos.RANKING_LEGENDA, posicao ? textos.RANKING_SUA_POSICAO(posicao) : textos.RANKING_FORA]
    : [textos.RANKING_VAZIO];
  await new Lista(textos.TITULO_RANKING).texto(corpo.join("\n")).voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuComoGanhar(player, voltar) {
  await new Lista(textos.TITULO_COMO_GANHAR).texto(textos.COMO_GANHAR(config())).voltar(voltar).abrir(player);
}

registrarComando(
  { nome: "nivel", descricao: textos.DESC_NIVEL, parametros: [{ nome: "jogador", tipo: "jogador", opcional: true }] },
  (p, [alvo]) => {
    if (alvo === null) {
      erro(p, JOGADOR_OFFLINE);
      return;
    }
    return menuNivel(p, undefined, alvo instanceof Player ? alvo.id : undefined);
  },
);
