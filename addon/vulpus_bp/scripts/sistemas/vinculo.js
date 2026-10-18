// @ts-check
// Vínculo com o Discord. No servidor com a ponte, quem não ligou a conta fica com a tela preta, parado e com um código na tela; o
// código vale para /minecraft vincular no Discord. Depois de ligar, as Caudas e o XP passam a ser os mesmos do Discord.
//
// Permanência: o vínculo fica gravado no jogador (dados.vinculo) E no banco do bot (reconhece por id e, se o id mudar, pelo nome).
// Quem já está ligado entra mesmo com o bot fora do ar. Só vale o bloqueio quando o pack da ponte existe (mundo no cliente,
// sem servidor, nunca trava) e "vinculoObrigatorio" está ligado (painel da staff: Config).
//
// Soma de Caudas e XP (Discord é a verdade): o jogo guarda os totais que o Discord devolveu na última vez (sync.baseC/baseX) e
// manda só a diferença, com uma chave única por envio. O envio fica anotado em sync.pend ANTES de sair; se a resposta se perder,
// o mesmo envio é repetido com a mesma chave e o Discord não soma duas vezes. A primeira soma de uma conta nova manda o total
// do jogo inteiro (base 0): essa é a fusão das duas contas.
import { InputPermissionCategory, Player, system, world } from "@minecraft/server";
import { config, dadosJogador, editarJogador } from "../core/db.js";
import { online } from "../core/jogadores.js";
import { chamar, ponteViva } from "../core/ponte_cliente.js";
import { desmarcarTravado, marcarTravado, travados } from "../core/ponte_estado.js";
import { formatarNumero, registrarErro } from "../core/util.js";
import * as textos from "../textos/vinculo.js";
import { nivelDeXp } from "./niveis.js";
import { emitir } from "../core/eventos.js";
import { expiracaoDe } from "./kitsune_tempo.js";
import { temSelo } from "./kitsune.js";

/**
 * @typedef {object} Estado
 * @property {"novo" | "consultando" | "travado" | "livre"} fase
 * @property {string} [codigo]
 * @property {boolean} [indisponivel]  o bot não respondeu na última consulta
 * @property {number} proxima  tick da próxima consulta
 * @property {boolean} anunciado  a entrada já foi para o Discord nesta sessão
 * @property {number} entrouEm  ms em que a sessão começou (para a duração no logout)
 * @property {number} proximaSoma  tick da próxima soma de Caudas e XP
 * @property {boolean} somando
 */

const CICLO_TICKS = 20;
const CONSULTA_TRAVADO_TICKS = 100;
const CONSULTA_FALHA_TICKS = 200;
const DURACAO_EFEITO = 120;

/** @type {Map<string, Estado>} */
const estados = new Map();

const gateAtivo = () => ponteViva() && config().vinculoObrigatorio === true;

/** @param {string} id @returns {Estado} */
function estadoDe(id) {
  let e = estados.get(id);
  if (!e) {
    e = { fase: "novo", proxima: 0, anunciado: false, entrouEm: Date.now(), proximaSoma: 0, somando: false };
    estados.set(id, e);
  }
  return e;
}

const novaChave = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;

// ------------------------------------------------------------------------------------ tela preta
/** @param {Player} p @param {boolean} livre */
function permitirMovimento(p, livre) {
  try {
    p.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, livre);
  } catch (e) {
    registrarErro("Vínculo: permissão de movimento", e);
  }
}

/** Reaplica a tela preta, o travamento e o código (a cada ciclo: o fade só dura alguns segundos). @param {Player} p @param {Estado} e */
function aplicarTravamento(p, e) {
  permitirMovimento(p, false);
  try {
    p.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 0.2, holdTime: 3, fadeOutTime: 0 } });
    p.addEffect("resistance", DURACAO_EFEITO, { amplifier: 255, showParticles: false });
    p.addEffect("slowness", DURACAO_EFEITO, { amplifier: 255, showParticles: false });
    if (e.codigo && !e.indisponivel) {
      p.onScreenDisplay.setTitle(textos.TITULO_CODIGO(e.codigo), { subtitle: textos.SUBTITULO_CODIGO, fadeInDuration: 0, stayDuration: 60, fadeOutDuration: 0 });
      p.onScreenDisplay.setActionBar(textos.BARRA_CODIGO(e.codigo));
    } else {
      p.onScreenDisplay.setTitle(textos.TITULO_INDISPONIVEL, { subtitle: textos.SUBTITULO_INDISPONIVEL, fadeInDuration: 0, stayDuration: 60, fadeOutDuration: 0 });
      p.onScreenDisplay.setActionBar(textos.BARRA_INDISPONIVEL);
    }
  } catch (err) {
    registrarErro("Vínculo: tela preta", err);
  }
}

/** Tira a tela preta e devolve o movimento. @param {Player} p */
function soltar(p) {
  permitirMovimento(p, true);
  try {
    p.camera.fade({ fadeColor: { red: 0, green: 0, blue: 0 }, fadeTime: { fadeInTime: 0, holdTime: 0, fadeOutTime: 1.5 } });
    p.removeEffect("resistance");
    p.removeEffect("slowness");
    p.onScreenDisplay.setTitle("", { fadeInDuration: 0, stayDuration: 0, fadeOutDuration: 0 });
    p.onScreenDisplay.setActionBar("");
  } catch (err) {
    registrarErro("Vínculo: soltar", err);
  }
}

// ------------------------------------------------------------------------------------ máquina de estados
/** @param {Player} p @param {Estado} e @param {boolean} primeiraVez */
function liberar(p, e, primeiraVez) {
  const estavaTravado = e.fase === "travado" || travados.has(p.id);
  e.fase = "livre";
  e.codigo = undefined;
  desmarcarTravado(p);
  if (estavaTravado) soltar(p);
  if (!e.anunciado) {
    e.anunciado = true;
    emitir("entrada", { nome: p.name });
  }
  e.proximaSoma = 0; // soma já no próximo ciclo (a primeira é a fusão)
  if (primeiraVez && p.isValid) {
    const d = dadosJogador(p);
    p.sendMessage(textos.BEM_VINDO(d.vinculo?.nome ?? ""));
  }
}

/** @param {Player} p @param {Estado} e */
function travar(p, e) {
  e.fase = "travado";
  marcarTravado(p);
  aplicarTravamento(p, e);
}

/**
 * Pergunta ao bot se a conta está ligada (e pede o código se não estiver).
 * @param {Player} p
 * @param {Estado} e
 */
async function consultar(p, e) {
  const id = p.id;
  const nome = p.name;
  const antes = e.fase;
  e.fase = antes === "novo" ? "consultando" : antes;
  const r = await chamar("POST", "/mc/vinculo", { id, nome });
  if (!p.isValid) return;
  const d = dadosJogador(p);
  if (r.status === 200 && r.corpo?.ok && r.corpo.vinculado === true) {
    const discordId = String(r.corpo.discord_id ?? "");
    const discordNome = String(r.corpo.discord_nome ?? "");
    const novo = !d.vinculo || d.vinculo.discordId !== discordId;
    editarJogador(p, (x) => {
      if (novo) {
        // outra conta do Discord (ou a primeira): a fusão manda o total do jogo de novo
        x.sync = { baseC: 0, baseX: 0, pend: null };
      }
      x.vinculo = { discordId, nome: discordNome, desde: x.vinculo?.desde || Date.now(), mcId: id };
    });
    e.indisponivel = false;
    liberar(p, e, antes === "travado" || antes === "consultando" || novo);
    return;
  }
  if (r.status === 200 && r.corpo?.ok && r.corpo.vinculado === false) {
    if (d.vinculo) {
      // a staff desvinculou: o jogo também esquece (as Caudas e o XP ficam como estão)
      editarJogador(p, (x) => {
        x.vinculo = null;
        x.sync = { baseC: 0, baseX: 0, pend: null };
      });
      p.sendMessage(textos.DESVINCULADO);
    }
    e.codigo = String(r.corpo.codigo ?? "");
    e.indisponivel = false;
    travar(p, e);
    e.proxima = system.currentTick + CONSULTA_TRAVADO_TICKS;
    return;
  }
  // o bot não respondeu: quem já tem vínculo guardado entra; quem não tem fica esperando (e tenta de novo)
  if (d.vinculo) {
    liberar(p, e, false);
    return;
  }
  e.indisponivel = true;
  travar(p, e);
  e.proxima = system.currentTick + CONSULTA_FALHA_TICKS;
}

/** @param {Player} p */
function avaliar(p) {
  const e = estadoDe(p.id);
  if (!gateAtivo()) {
    if (e.fase === "travado") {
      e.fase = "novo";
      desmarcarTravado(p);
      soltar(p);
    }
    // sem ponte nem obrigatoriedade, quem já está ligado ainda soma; quem não está, nada
    if (e.fase === "novo" && dadosJogador(p).vinculo) e.fase = "livre";
    return;
  }
  const agora = system.currentTick;
  switch (e.fase) {
    case "novo": {
      const d = dadosJogador(p);
      if (d.vinculo) {
        // já está ligado: entra na hora e confere com o bot sem travar ninguém
        e.fase = "livre";
        liberar(p, e, false);
        void consultar(p, e).catch((err) => registrarErro("Vínculo: conferência", err));
      } else {
        void consultar(p, e).catch((err) => registrarErro("Vínculo: consulta", err));
      }
      return;
    }
    case "travado":
      aplicarTravamento(p, e);
      if (agora >= e.proxima) {
        e.proxima = agora + CONSULTA_TRAVADO_TICKS;
        void consultar(p, e).catch((err) => registrarErro("Vínculo: consulta", err));
      }
      return;
    default:
  }
}

// ------------------------------------------------------------------------------------ soma de Caudas e XP
/**
 * Uma rodada de soma para um jogador (pelo id: também roda quando ele acabou de sair).
 * @param {string} id
 * @param {string} nome
 * @returns {Promise<boolean>} true se o Discord confirmou
 */
/**
 * Estado do selo Kitsune de quem está online (a tag) e o fim do prazo (0 = sem prazo). Guardado por id para a última soma, de quem acabou de sair.
 * @type {Map<string, { ativo: boolean, ate: number }>}
 */
const selos = new Map();

/** @param {Player} p */
function lerSelo(p) {
  const estado = { ativo: temSelo(p), ate: expiracaoDe(p.id) ?? 0 };
  selos.set(p.id, estado);
  return estado;
}

async function somar(id, nome) {
  const d0 = dadosJogador(id);
  if (!d0.vinculo) return false;
  let pend = d0.sync.pend;
  if (!pend) {
    pend = { chave: novaChave(), c: d0.caudas - d0.sync.baseC, x: d0.xp - d0.sync.baseX, sc: d0.caudas, sx: d0.xp };
    const guardar = pend;
    editarJogador(id, (x) => {
      x.sync.pend = guardar;
    });
  }
  const envio = pend;
  const r = await chamar("POST", "/mc/sync", { id, nome, chave: envio.chave, caudas: envio.c, xp: envio.x, kitsune: selos.get(id) });
  if (r.status === 200 && r.corpo?.ok && Number.isFinite(r.corpo.saldo) && Number.isFinite(r.corpo.xp)) {
    const saldo = Math.max(0, Math.floor(r.corpo.saldo));
    const xp = Math.max(0, Math.floor(r.corpo.xp));
    editarJogador(id, (x) => {
      // o que o jogador ganhou ou gastou enquanto a resposta vinha continua valendo, por cima do total do Discord
      x.caudas = Math.max(0, saldo + (x.caudas - envio.sc));
      x.xp = Math.max(0, xp + (x.xp - envio.sx));
      x.sync = { baseC: saldo, baseX: xp, pend: null };
    });
    return true;
  }
  if (r.status === 403 && r.corpo?.erro === "nao_vinculado") {
    // o bot não conhece mais o vínculo: o jogo esquece, e o ciclo trava de novo
    editarJogador(id, (x) => {
      x.vinculo = null;
      x.sync = { baseC: 0, baseX: 0, pend: null };
    });
    const e = estados.get(id);
    if (e) e.fase = "novo";
  }
  return false; // sem resposta: o mesmo envio (mesma chave) será repetido
}

/** @param {Player} p @param {Estado} e */
function agendarSoma(p, e) {
  if (e.somando || e.fase !== "livre" || !dadosJogador(p).vinculo || !ponteViva()) return;
  if (system.currentTick < e.proximaSoma) return;
  e.somando = true;
  const primeira = dadosJogador(p).sync.baseC === 0 && dadosJogador(p).sync.baseX === 0 && !dadosJogador(p).sync.pend;
  const nome = p.name;
  lerSelo(p);
  somar(p.id, nome)
    .then((deu) => {
      if (deu && primeira && p.isValid) {
        const d = dadosJogador(p);
        p.sendMessage(textos.SOMADO(formatarNumero(d.caudas), nivelDeXp(d.xp).nivel));
      }
    })
    .catch((err) => registrarErro("Vínculo: soma", err))
    .finally(() => {
      e.somando = false;
      e.proximaSoma = system.currentTick + Math.max(10, Math.floor(config().vinculoSyncSeg)) * 20;
    });
}

// ------------------------------------------------------------------------------------ ganchos
system.runInterval(() => {
  for (const p of online()) {
    try {
      avaliar(p);
      agendarSoma(p, estadoDe(p.id));
    } catch (e) {
      registrarErro("Vínculo", e);
    }
  }
}, CICLO_TICKS);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  // entrou de novo: começa do zero (permissões e tela voltam ao normal antes de decidir)
  estados.delete(player.id);
  desmarcarTravado(player);
  permitirMovimento(player, true);
});

world.afterEvents.playerLeave.subscribe(({ playerId, playerName }) => {
  const e = estados.get(playerId);
  estados.delete(playerId);
  travados.delete(playerId);
  if (e?.anunciado) emitir("saida", { nome: playerName, sessao: Math.floor((Date.now() - e.entrouEm) / 1000) });
  // última soma: leva para o Discord o que foi ganho desde a anterior (se falhar, o envio fica anotado e sai na volta)
  if (ponteViva() && dadosJogador(playerId).vinculo) void somar(playerId, playerName).catch((err) => registrarErro("Vínculo: soma ao sair", err));
});
