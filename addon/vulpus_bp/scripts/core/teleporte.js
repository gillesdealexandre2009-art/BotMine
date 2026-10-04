// @ts-check
// Teleporte com as regras do servidor: combate, recarga e espera parado (com contagem e efeitos).
import { Player, system, world } from "@minecraft/server";
import { barra } from "../glyphs.js";
import * as textos from "../textos/geral.js";
import { config, editarJogador } from "./db.js";
import * as efeitos from "./efeitos.js";
import { ehStaff } from "./permissoes.js";
import { erro, msg, registrarErro, rodarSeguro } from "./util.js";

/**
 * Um lugar no mundo. d = dimension.id ("minecraft:overworld"...); rx/ry = rotação (opcional).
 * @typedef {{ x: number, y: number, z: number, d: string, rx?: number, ry?: number }} Local
 */

/**
 * @typedef {object} OpcoesTeleporte
 * @property {string} [nome]  nome do destino na mensagem de chegada
 * @property {boolean} [semEspera]  pula a espera parado (combate e recarga continuam valendo)
 * @property {boolean} [salvarVoltar]  guarda a origem em dados.voltar (padrão true)
 * @property {import("./efeitos.js").TemaTeleporte} [tema]  visual e sons do efeito (padrão "kitsune")
 * @property {() => Player | undefined} [parceiro]  quem recebe a visita (TPA): vê o portal e ouve a chegada
 * @property {(p: Player) => void} [aoChegar]
 */

const TICKS_POR_SEGUNDO = 20;
/** Quanto dá para se mexer durante a espera, em blocos. */
const TOLERANCIA_MOVIMENTO = 0.6;
/** De quantos em quantos ticks a espera confere o jogador. */
const PASSO_ESPERA = 2;
/** Quanto tempo o aviso de cancelamento fica na actionbar sem a HUD por cima. */
const TICKS_AVISO_CANCELADO = 3 * TICKS_POR_SEGUNDO;
/** De quantos em quantos ticks a barrinha da actionbar é atualizada. */
const PASSO_BARRA = 4;
/** De quantos em quantos ticks o portal aparece nos pés de quem recebe a visita (TPA). */
const PASSO_PREVIA = 6;
/** Segmentos da barrinha da contagem. */
const SEGMENTOS_BARRA = 10;

/** @type {Map<string, number>} id → tick do último dano dado ou levado em combate */
const ultimoCombate = new Map();
/** @type {Map<string, number>} id → tick do último teleporte (recarga) */
const ultimoTeleporte = new Map();
/** @type {Map<string, number>} id → runInterval da espera em andamento */
const esperas = new Map();
/** @type {Map<string, number>} id → tick até quando o aviso de cancelamento fica na actionbar */
const avisos = new Map();
/** @type {((p: Player) => string | undefined)[]} regras extras de outros sistemas (ex.: quem leva a bandeira) */
const bloqueios = [];

/** @param {number} n */
const arredondar = (n) => Math.round(n * 100) / 100;

/**
 * Regra extra que barra o teleporte do addon (spawn, casas, voltar, TPA, casa do clã): devolve o motivo
 * (texto de erro) ou undefined se pode. Vale no começo e de novo na hora de teleportar.
 * @param {(p: Player) => string | undefined} regra
 */
export function registrarBloqueioTeleporte(regra) {
  bloqueios.push(regra);
}

/**
 * Primeiro motivo de alguma regra extra para barrar o teleporte, ou undefined.
 * @param {Player} player
 */
function bloqueado(player) {
  for (const regra of bloqueios) {
    try {
      const motivo = regra(player);
      if (motivo) return motivo;
    } catch (e) {
      registrarErro("Regra do teleporte", e);
    }
  }
  return undefined;
}

/**
 * Onde o jogador está agora, com a rotação.
 * @param {Player} player
 * @returns {Local}
 */
export function localDe(player) {
  const { x, y, z } = player.location;
  const rotacao = player.getRotation();
  return {
    x: arredondar(x),
    y: arredondar(y),
    z: arredondar(z),
    d: player.dimension.id,
    rx: arredondar(rotacao.x),
    ry: arredondar(rotacao.y),
  };
}

/**
 * Segundos (arredondados para cima) que faltam para `segundos` completarem desde o tick guardado.
 * @param {Map<string, number>} marcas
 * @param {string} id
 * @param {number} segundos
 */
function segundosRestantes(marcas, id, segundos) {
  const inicio = marcas.get(id);
  if (inicio === undefined) return 0;
  const resto = inicio + segundos * TICKS_POR_SEGUNDO - system.currentTick;
  return resto > 0 ? Math.ceil(resto / TICKS_POR_SEGUNDO) : 0;
}

/** @param {Player} player */
const restanteCombate = (player) => segundosRestantes(ultimoCombate, player.id, config().combateSegundos);

/**
 * Deu ou levou dano de alguma entidade nos últimos combateSegundos.
 * @param {Player} player
 */
export function emCombate(player) {
  return restanteCombate(player) > 0;
}

/**
 * Marca o começo de um combate (só vale para jogadores).
 * @param {import("@minecraft/server").Entity} entity
 */
export function marcarCombate(entity) {
  if (entity instanceof Player) ultimoCombate.set(entity.id, system.currentTick);
}

/**
 * Está numa contagem de teleporte ou acabou de ver o aviso de cancelamento (a HUD pausa).
 * @param {Player} player
 */
export function emEspera(player) {
  if (esperas.has(player.id)) return true;
  const aviso = avisos.get(player.id);
  if (aviso === undefined) return false;
  if (aviso > system.currentTick) return true;
  avisos.delete(player.id);
  return false;
}

/**
 * Para a espera do jogador. Com motivo, avisa na actionbar e no chat.
 * @param {Player} player
 * @param {string} [motivo]
 */
export function cancelarEspera(player, motivo) {
  const run = esperas.get(player.id);
  if (run === undefined) return;
  system.clearRun(run);
  esperas.delete(player.id);
  if (!motivo || !player.isValid) return;
  avisos.set(player.id, system.currentTick + TICKS_AVISO_CANCELADO);
  player.onScreenDisplay.setActionBar(textos.TP_CANCELADO_BARRA);
  erro(player, motivo);
  efeitos.cancelado(player);
}

/**
 * Teleporta seguindo as regras: bloqueia em combate e na recarga e espera o jogador ficar parado
 * (staff pula a espera e a recarga). Uma espera nova cancela a anterior.
 * @param {Player} player
 * @param {Local | (() => Local | undefined)} destino  função = resolvida na hora (undefined cancela)
 * @param {OpcoesTeleporte} [opcoes]
 * @returns {boolean} true se teleportou ou se a espera começou
 */
export function teleportar(player, destino, opcoes = {}) {
  if (!player.isValid) return false;
  const cfg = config();
  const staff = ehStaff(player);
  const combate = restanteCombate(player);
  if (combate > 0) {
    erro(player, textos.TP_COMBATE(combate));
    return false;
  }
  const motivo = bloqueado(player);
  if (motivo) {
    erro(player, motivo);
    return false;
  }
  const recarga = staff ? 0 : segundosRestantes(ultimoTeleporte, player.id, cfg.recargaTeleporte);
  if (recarga > 0) {
    erro(player, textos.TP_RECARGA(recarga));
    return false;
  }
  cancelarEspera(player);
  const espera = staff || opcoes.semEspera ? 0 : Math.max(0, Math.floor(cfg.esperaTeleporte));
  if (espera === 0) return concluir(player, destino, opcoes);
  esperar(player, espera, opcoes, () => concluir(player, destino, opcoes, true));
  return true;
}

/**
 * Contagem na actionbar (com barrinha) e as caudas de fogo; cancela se o jogador andar ou trocar
 * de dimensão. Pouco antes do fim a tela começa o fade.
 * @param {Player} player
 * @param {number} segundos
 * @param {OpcoesTeleporte} opcoes
 * @param {() => void} aoTerminar
 */
function esperar(player, segundos, opcoes, aoTerminar) {
  const id = player.id;
  const inicio = player.location;
  const dimensao = player.dimension.id;
  const comeco = system.currentTick;
  const total = segundos * TICKS_POR_SEGUNDO;
  const fim = comeco + total;
  let mostrado = 0;
  let ultimaBarra = -PASSO_BARRA;
  let ultimaPrevia = -PASSO_PREVIA;
  let preparado = false;
  const parar = () => {
    system.clearRun(run);
    esperas.delete(id);
  };
  const run = system.runInterval(() => {
    try {
      if (!player.isValid) {
        parar();
        return;
      }
      const { x, y, z } = player.location;
      const andou = Math.hypot(x - inicio.x, y - inicio.y, z - inicio.z) > TOLERANCIA_MOVIMENTO;
      if (andou || player.dimension.id !== dimensao) {
        cancelarEspera(player, textos.TP_CANCELADO_ANDOU);
        return;
      }
      const agora = system.currentTick;
      const faltam = Math.ceil((fim - agora) / TICKS_POR_SEGUNDO);
      if (faltam <= 0) {
        parar();
        aoTerminar();
        return;
      }
      const decorridos = agora - comeco;
      const virouSegundo = faltam !== mostrado;
      if (virouSegundo) {
        mostrado = faltam;
        efeitos.segundoEspera(player, opcoes.tema, segundos - faltam, faltam === 1);
      }
      if (virouSegundo || decorridos - ultimaBarra >= PASSO_BARRA) {
        ultimaBarra = decorridos;
        player.onScreenDisplay.setActionBar(textos.TP_ESPERA(faltam, barra(decorridos / total, SEGMENTOS_BARRA)));
      }
      efeitos.passoEspera(player, opcoes.tema, decorridos);
      if (opcoes.parceiro && decorridos - ultimaPrevia >= PASSO_PREVIA) {
        ultimaPrevia = decorridos;
        const parceiro = opcoes.parceiro();
        if (parceiro) efeitos.previaParceiro(parceiro, decorridos);
      }
      if (!preparado && fim - agora <= efeitos.TICKS_FADE) {
        preparado = true;
        efeitos.preparar(player, opcoes.tema, false);
      }
    } catch (e) {
      parar();
      registrarErro("Espera do teleporte", e);
    }
  }, PASSO_ESPERA);
  esperas.set(id, run);
  efeitos.inicioEspera(player);
}

/**
 * Resolve o destino, confere o combate de novo e teleporta (inclusive entre dimensões), com o
 * estouro na origem e o efeito de chegada.
 * @param {Player} player
 * @param {Local | (() => Local | undefined)} destino
 * @param {OpcoesTeleporte} opcoes
 * @param {boolean} [preparado]  o fade já começou na espera
 * @returns {boolean} se teleportou
 */
function concluir(player, destino, opcoes, preparado = false) {
  if (!player.isValid) return false;
  try {
    const alvo = typeof destino === "function" ? destino() : destino;
    if (!alvo) {
      erro(player, textos.TP_SEM_DESTINO);
      return false;
    }
    const combate = restanteCombate(player);
    if (combate > 0) {
      erro(player, textos.TP_COMBATE(combate));
      return false;
    }
    const motivo = bloqueado(player);
    if (motivo) {
      erro(player, motivo);
      return false;
    }
    const origem = localDe(player);
    const dimOrigem = player.dimension;
    const posOrigem = player.location;
    if (!preparado) efeitos.preparar(player, opcoes.tema, true);
    /** @type {import("@minecraft/server").TeleportOptions} */
    const opcoesTp = {
      dimension: world.getDimension(alvo.d),
      checkForBlocks: false,
      keepVelocity: false,
      // Entre dimensões, usa a posição pedida em vez de o jogo procurar outro lugar.
      forceProvidedPositionOnDimensionChange: true,
    };
    if (alvo.rx != null && alvo.ry != null) opcoesTp.rotation = { x: alvo.rx, y: alvo.ry };
    player.teleport({ x: alvo.x, y: alvo.y, z: alvo.z }, opcoesTp);
    ultimoTeleporte.set(player.id, system.currentTick);
    efeitos.saida(player, dimOrigem, posOrigem, opcoes.tema);
    if (opcoes.salvarVoltar !== false) {
      editarJogador(player, (dados) => {
        dados.voltar = origem;
      });
    }
  } catch (e) {
    registrarErro("Teleporte", e);
    erro(player, textos.TP_FALHOU);
    return false;
  }
  efeitos.chegada(player, opcoes.tema, { nome: opcoes.nome, parceiro: opcoes.parceiro?.() });
  msg(player, textos.TP_CHEGOU(opcoes.nome));
  const aoChegar = opcoes.aoChegar;
  if (aoChegar) rodarSeguro(player, "Chegada do teleporte", aoChegar);
  return true;
}

// Dano cancela a espera; dano de/para entidade marca combate dos jogadores envolvidos.
world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource }) => {
  const atacante = damageSource.damagingEntity;
  if (hurtEntity instanceof Player) {
    cancelarEspera(hurtEntity, textos.TP_CANCELADO_DANO);
    if (atacante) marcarCombate(hurtEntity);
  }
  if (atacante && atacante.id !== hurtEntity.id) marcarCombate(atacante);
});
