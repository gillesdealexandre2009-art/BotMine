// @ts-check
// Caudas: saldo, diária com sequência (dia de Brasília), ganho por tempo online com anti-AFK e ranking.
import { Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, todosJogadores } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { emEspera } from "../core/teleporte.js";
import { diaAnterior, diaBrasilia, erro, msAteMeiaNoiteBrasilia, msg, ok, registrarErro } from "../core/util.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/caudas.js";
import { hudLigada } from "./ajustes.js";
import { ganharXpDiaria, ganharXpMinutoAtivo } from "./niveis.js";

/** @typedef {import("../core/db.js").DadosJogador} DadosJogador */

/** Teto do saldo (mantém o JSON e as contas longe de números absurdos). */
const SALDO_MAXIMO = 1_000_000_000;
/** Maior valor que a staff dá ou tira de uma vez. */
export const DAR_MAXIMO = 1_000_000;
const TICKS_POR_MINUTO = 1200;
/** Teto de tempo somado por checagem, em segundos. */
const SEGUNDOS_MAX_POR_CHECAGEM = 90;
/** Anti-AFK: precisa andar mais de 1 bloco ou girar a câmera desde a última checagem. */
const MOVIMENTO_MINIMO = 1;
const GIRO_MINIMO = 2;

/**
 * Estado do tempo online de quem está no jogo (só em memória).
 * @typedef {{ desde: number, pos: import("@minecraft/server").Vector3, dim: string, rot: import("@minecraft/server").Vector2, ativos: number }} Presenca
 */
/** @type {Map<string, Presenca>} */
const presencas = new Map();

/**
 * Saldo de Caudas (vale para quem está offline, pelo id).
 * @param {Player | string} alvo
 * @returns {number}
 */
export function saldo(alvo) {
  return dadosJogador(alvo).caudas;
}

/**
 * Soma (ou tira, com valor negativo) Caudas. O saldo nunca fica negativo.
 * Com motivo e o jogador online, avisa no chat.
 * @param {Player | string} alvo
 * @param {number} valor
 * @param {string} [motivo]  aparece no aviso: "+10 Caudas (da staff)"
 * @returns {number} o novo saldo
 */
export function adicionarCaudas(alvo, valor, motivo) {
  const delta = Number.isFinite(valor) ? Math.trunc(valor) : 0;
  const dados = editarJogador(alvo, (d) => {
    d.caudas = Math.min(SALDO_MAXIMO, Math.max(0, Math.floor(d.caudas) + delta));
  });
  if (motivo && delta !== 0) {
    const player = typeof alvo === "string" ? porId(alvo) : alvo;
    msg(player, textos.SALDO_MUDOU(delta, motivo, dados.caudas));
  }
  return dados.caudas;
}

/**
 * Staff dá (ou tira) Caudas de alguém online, com validação e aviso para os dois.
 * @param {Player} staff
 * @param {Player} alvo
 * @param {number} valor
 * @returns {boolean} se aplicou
 */
export function darCaudas(staff, alvo, valor) {
  if (!Number.isInteger(valor) || valor === 0 || Math.abs(valor) > DAR_MAXIMO) {
    erro(staff, textos.STAFF_VALOR_INVALIDO(DAR_MAXIMO));
    return false;
  }
  if (!alvo.isValid) {
    erro(staff, geral.JOGADOR_OFFLINE);
    return false;
  }
  const novo = adicionarCaudas(alvo, valor, alvo.id === staff.id ? undefined : textos.MOTIVO_STAFF);
  ok(staff, textos.STAFF_DEU(valor, alvo.name, novo));
  return true;
}

/**
 * Dias seguidos que ainda valem: zera se a última diária foi antes de ontem.
 * @param {DadosJogador} dados
 * @param {number} [agora]
 */
export function sequenciaAtual(dados, agora = Date.now()) {
  const hoje = diaBrasilia(agora);
  const { dia, sequencia } = dados.diaria;
  return dia === hoje || dia === diaAnterior(hoje) ? sequencia : 0;
}

/**
 * Prêmio da diária para uma sequência: base + bônus por dia seguido (limitado).
 * @param {number} sequencia  já contando o dia de hoje
 */
function premioDiaria(sequencia) {
  const cfg = config();
  const diasBonus = Math.min(Math.max(0, sequencia - 1), Math.max(0, cfg.diariaBonusMax));
  return Math.max(0, cfg.diariaBase + cfg.diariaBonusDia * diasBonus);
}

/**
 * Situação da diária agora.
 * @param {DadosJogador} dados
 */
function infoDiaria(dados) {
  const agora = Date.now();
  const hoje = diaBrasilia(agora);
  // ">=" protege contra relógio voltando no tempo (não dá diária dupla).
  const disponivel = !(dados.diaria.dia >= hoje);
  const proxima = disponivel ? sequenciaAtual(dados, agora) + 1 : dados.diaria.sequencia;
  return { hoje, disponivel, proxima, msAteLiberar: msAteMeiaNoiteBrasilia(agora) };
}

/**
 * Pega a recompensa diária.
 * @param {Player} player
 * @returns {boolean} se recebeu
 */
export function resgatarDiaria(player) {
  const dados = dadosJogador(player);
  const info = infoDiaria(dados);
  if (!info.disponivel) {
    erro(player, textos.DIARIA_JA_PEGOU(info.msAteLiberar));
    return false;
  }
  const perdeu = dados.diaria.sequencia > 1 && info.proxima === 1;
  const premio = premioDiaria(info.proxima);
  editarJogador(player, (d) => {
    d.diaria = { dia: info.hoje, sequencia: info.proxima };
  });
  const novo = adicionarCaudas(player, premio);
  ganharXpDiaria(player);
  ok(player, textos.DIARIA_OK(premio, info.proxima, novo));
  if (perdeu) msg(player, textos.DIARIA_PERDEU);
  return true;
}

/**
 * Top n por saldo, inclusive quem está offline. Empate: ordem alfabética.
 * @param {number} n
 * @returns {{ id: string, nome: string, caudas: number }[]}
 */
export function ranking(n) {
  return todosJogadores()
    .map(({ id, dados }) => ({ id, nome: dados.nome || textos.NOME_DESCONHECIDO, caudas: dados.caudas }))
    .filter((linha) => linha.caudas > 0)
    .sort((a, b) => b.caudas - a.caudas || a.nome.localeCompare(b.nome))
    .slice(0, Math.max(0, n));
}

/**
 * Menu de Caudas: saldo, sequência, diária, ranking e como ganhar.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuCaudas(player, voltar) {
  const dados = dadosJogador(player);
  const info = infoDiaria(dados);
  const aqui = () => menuCaudas(player, voltar);
  await new Lista(textos.TITULO)
    .texto(
      textos.CORPO({
        saldo: dados.caudas,
        sequencia: sequenciaAtual(dados),
        disponivel: info.disponivel,
        msAteLiberar: info.msAteLiberar,
        premio: premioDiaria(info.proxima),
      }),
    )
    .botao(info.disponivel ? textos.BOTAO_DIARIA : textos.BOTAO_DIARIA_PEGA, ICONES.diaria, async (p) => {
      resgatarDiaria(p);
      await aqui();
    })
    .botao(textos.BOTAO_RANKING, ICONES.ranking, (p) => menuRanking(p, aqui))
    .botao(textos.BOTAO_COMO_GANHAR, ICONES.tempo, (p) => menuComoGanhar(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Top 10 com marca de online e a posição de quem abriu.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuRanking(player, voltar) {
  const todos = ranking(Number.MAX_SAFE_INTEGER);
  const conectados = new Set(online().map((p) => p.id));
  const linhas = todos
    .slice(0, 10)
    .map((linha, i) =>
      textos.RANKING_LINHA(i + 1, linha.nome, linha.caudas, { online: conectados.has(linha.id), voce: linha.id === player.id }),
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

/**
 * Marca o ponto de partida da próxima checagem de tempo online.
 * @param {Player} player
 * @param {number} [ativos]  minutos ativos já acumulados para o próximo pagamento
 */
function iniciarPresenca(player, ativos = 0) {
  presencas.set(player.id, {
    desde: Date.now(),
    pos: player.location,
    dim: player.dimension.id,
    rot: player.getRotation(),
    ativos,
  });
}

/**
 * Segundos reais desde a última checagem, com teto (servidor travado não vira tempo de jogo).
 * @param {Presenca} antes
 */
function segundosDesde(antes) {
  return Math.min(SEGUNDOS_MAX_POR_CHECAGEM, Math.max(0, Math.round((Date.now() - antes.desde) / 1000)));
}

/**
 * Se mexeu (andou mais de 1 bloco, trocou de dimensão ou girou a câmera) desde a última checagem.
 * @param {Presenca} antes
 * @param {Player} player
 */
function seMexeu(antes, player) {
  const { x, y, z } = player.location;
  const rot = player.getRotation();
  const andou = Math.hypot(x - antes.pos.x, y - antes.pos.y, z - antes.pos.z) > MOVIMENTO_MINIMO;
  const girou = Math.abs(rot.x - antes.rot.x) > GIRO_MINIMO || Math.abs(rot.y - antes.rot.y) > GIRO_MINIMO;
  return andou || girou || player.dimension.id !== antes.dim;
}

/**
 * Checagem de 1 minuto: soma o tempo de jogo e, a cada intervaloCaudasMin minutos ativos, paga Caudas.
 * @param {Player} player
 */
function checarPresenca(player) {
  const antes = presencas.get(player.id);
  if (!antes) {
    iniciarPresenca(player);
    return;
  }
  const segundos = segundosDesde(antes);
  const ativo = seMexeu(antes, player);
  const ativos = antes.ativos + (ativo ? 1 : 0);
  editarJogador(player, (d) => {
    d.tempo += segundos;
  });
  if (ativo) ganharXpMinutoAtivo(player);
  const cfg = config();
  const pagar = ativos >= Math.max(1, Math.floor(cfg.intervaloCaudasMin));
  iniciarPresenca(player, pagar ? 0 : ativos);
  if (!pagar) return;
  const ganho = Math.max(0, Math.floor(cfg.caudasPorIntervalo));
  if (ganho === 0) return;
  adicionarCaudas(player, ganho);
  // Com a HUD ligada o "+N" aparece nela; sem HUD, avisa direto na actionbar (menos na contagem do teleporte).
  if (!hudLigada(player) && !emEspera(player)) player.onScreenDisplay.setActionBar(textos.GANHO_TEMPO_BARRA(ganho));
}

/**
 * Soma o pedaço de tempo que faltou (desde a última checagem) de quem saiu.
 * @param {string} id
 */
function encerrarPresenca(id) {
  const antes = presencas.get(id);
  presencas.delete(id);
  if (!antes) return;
  const segundos = segundosDesde(antes);
  if (segundos > 0) {
    editarJogador(id, (d) => {
      d.tempo += segundos;
    });
  }
}

system.runInterval(() => {
  for (const player of online()) {
    try {
      checarPresenca(player);
    } catch (e) {
      registrarErro(`Tempo online de ${player.name}`, e);
    }
  }
}, TICKS_POR_MINUTO);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  try {
    iniciarPresenca(player);
  } catch (e) {
    registrarErro("Início do tempo online", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  try {
    encerrarPresenca(playerId);
  } catch (e) {
    registrarErro("Fim do tempo online", e);
  }
});

registrarComando({ nome: "caudas", descricao: textos.DESC_CAUDAS }, (p) => menuCaudas(p));
registrarComando({ nome: "diaria", descricao: textos.DESC_DIARIA }, (p) => resgatarDiaria(p));
registrarComando(
  {
    nome: "darcaudas",
    descricao: textos.DESC_DARCAUDAS,
    staff: true,
    parametros: [
      { nome: "jogador", tipo: "jogador" },
      { nome: "valor", tipo: "inteiro" },
    ],
  },
  (p, [alvo, valor]) => {
    if (!(alvo instanceof Player)) {
      erro(p, geral.JOGADOR_OFFLINE);
      return;
    }
    darCaudas(p, alvo, valor);
  },
);
