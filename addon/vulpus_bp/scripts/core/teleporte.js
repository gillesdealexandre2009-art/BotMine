// @ts-check
// Teleporte com as regras do servidor: combate, recarga e espera parado (com contagem).
import { Player, system, world } from "@minecraft/server";
import { SONS } from "../config.js";
import * as textos from "../textos/geral.js";
import { config, editarJogador } from "./db.js";
import { ehStaff } from "./permissoes.js";
import { erro, msg, registrarErro, rodarSeguro, som } from "./util.js";

/**
 * Um lugar no mundo. d = dimension.id ("minecraft:overworld"...); rx/ry = rotação (opcional).
 * @typedef {{ x: number, y: number, z: number, d: string, rx?: number, ry?: number }} Local
 */

/**
 * @typedef {object} OpcoesTeleporte
 * @property {string} [nome]  nome do destino na mensagem de chegada
 * @property {boolean} [semEspera]  pula a espera parado (combate e recarga continuam valendo)
 * @property {boolean} [salvarVoltar]  guarda a origem em dados.voltar (padrão true)
 * @property {(p: Player) => void} [aoChegar]
 */

const TICKS_POR_SEGUNDO = 20;
/** Quanto dá para se mexer durante a espera, em blocos. */
const TOLERANCIA_MOVIMENTO = 0.6;
/** De quantos em quantos ticks a espera confere o jogador. */
const PASSO_ESPERA = 2;

/** @type {Map<string, number>} id → tick do último dano dado ou levado em combate */
const ultimoCombate = new Map();
/** @type {Map<string, number>} id → tick do último teleporte (recarga) */
const ultimoTeleporte = new Map();
/** @type {Map<string, number>} id → runInterval da espera em andamento */
const esperas = new Map();

/** @param {number} n */
const arredondar = (n) => Math.round(n * 100) / 100;

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
 * Está numa contagem de teleporte (a HUD pausa).
 * @param {Player} player
 */
export function emEspera(player) {
  return esperas.has(player.id);
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
  player.onScreenDisplay.setActionBar(textos.TP_CANCELADO_BARRA);
  erro(player, motivo);
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
  const recarga = staff ? 0 : segundosRestantes(ultimoTeleporte, player.id, cfg.recargaTeleporte);
  if (recarga > 0) {
    erro(player, textos.TP_RECARGA(recarga));
    return false;
  }
  cancelarEspera(player);
  const espera = staff || opcoes.semEspera ? 0 : Math.max(0, Math.floor(cfg.esperaTeleporte));
  if (espera === 0) return concluir(player, destino, opcoes);
  esperar(player, espera, () => concluir(player, destino, opcoes));
  return true;
}

/**
 * Contagem na actionbar; cancela se o jogador andar ou trocar de dimensão.
 * @param {Player} player
 * @param {number} segundos
 * @param {() => void} aoTerminar
 */
function esperar(player, segundos, aoTerminar) {
  const id = player.id;
  const inicio = player.location;
  const dimensao = player.dimension.id;
  const fim = system.currentTick + segundos * TICKS_POR_SEGUNDO;
  let mostrado = 0;
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
      const faltam = Math.ceil((fim - system.currentTick) / TICKS_POR_SEGUNDO);
      if (faltam <= 0) {
        parar();
        aoTerminar();
      } else if (faltam !== mostrado) {
        mostrado = faltam;
        player.onScreenDisplay.setActionBar(textos.TP_ESPERA(faltam));
        som(player, SONS.contagem);
      }
    } catch (e) {
      parar();
      registrarErro("Espera do teleporte", e);
    }
  }, PASSO_ESPERA);
  esperas.set(id, run);
}

/**
 * Resolve o destino, confere o combate de novo e teleporta (inclusive entre dimensões).
 * @param {Player} player
 * @param {Local | (() => Local | undefined)} destino
 * @param {OpcoesTeleporte} opcoes
 * @returns {boolean} se teleportou
 */
function concluir(player, destino, opcoes) {
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
    const origem = localDe(player);
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
  som(player, SONS.teleporte);
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
