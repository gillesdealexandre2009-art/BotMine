// @ts-check
// Mistério ambiental do End: o End não é hostil — é indiferente. A dimensão parece não reconhecer que o jogador
// existe. Sons raros, distorções breves, silêncios que duram demais e o Desalinhado (uma imitação defeituosa de
// Enderman que observa sem olhos). Tudo é raro, espaçado e nunca punitivo: nenhum evento causa dano.
import { system, world } from "@minecraft/server";
import { registrarErro } from "../core/util.js";
import * as T from "../textos/end_misterio.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {{ x: number, y: number, z: number }} Pos */

// ──────────────────────────────────────────────────────────────── constantes
const DIM_END = "minecraft:the_end";
const DESALINHADO = "vulpus:desalinhado";
const TAG = "vulpus_end_misterio";
const CICLO = 40;
const CICLO_DESALINHADO = 10;

const aleatorio = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a);
const inteiro = (/** @type {number} */ a, /** @type {number} */ b) => Math.floor(aleatorio(a, b + 1));

// ──────────────────────────────────────────────────────────────── tabela de raridade
/** @typedef {{ id: string, peso: number, minTempo: number, cooldownMin: number, cooldownMax: number }} Evento */
/** @type {Evento[]} */
const EVENTOS = [
  { id: "eco_distante",      peso: 20, minTempo: 0,    cooldownMin: 600,  cooldownMax: 1000 },
  { id: "vazio_responde",    peso: 25, minTempo: 600,  cooldownMin: 800,  cooldownMax: 1400 },
  { id: "realidade_falha",   peso: 20, minTempo: 1200, cooldownMin: 1000, cooldownMax: 1800 },
  { id: "silencio_profundo", peso: 15, minTempo: 600,  cooldownMin: 1200, cooldownMax: 2000 },
  { id: "desalinhado",       peso: 5,  minTempo: 6000, cooldownMin: 6000, cooldownMax: 10000 },
];
const PESO_TOTAL = EVENTOS.reduce((s, e) => s + e.peso, 0);

// ──────────────────────────────────────────────────────────────── estado por jogador
/**
 * @typedef {object} Estado
 * @property {number} entrada          tick da primeira detecção no End
 * @property {number} ultimoEvento     tick do último evento
 * @property {string} tipoUltimo
 * @property {number} cooldown         ticks até o próximo sorteio
 * @property {Entity|null} desalinhado entidade ativa (no máximo 1)
 * @property {number} desalinhadoFim   tick em que despawna automaticamente
 * @property {number} desalinhadoSom   próximo tick para o som sutil do Desalinhado
 * @property {number} naoOlhando       ticks acumulados sem olhar pro Desalinhado
 * @property {{ x: number, z: number, tick: number }[]} pontosVazio  posições onde o vazio respondeu
 * @property {Pos} ultimaPos           para detectar deslocamento
 */

/** @type {Map<string, Estado>} */
const estados = new Map();

/** @param {number} tick @returns {Estado} */
function novoEstado(tick) {
  return {
    entrada: tick,
    ultimoEvento: tick,
    tipoUltimo: "",
    cooldown: inteiro(400, 800),
    desalinhado: null,
    desalinhadoFim: 0,
    desalinhadoSom: 0,
    naoOlhando: 0,
    pontosVazio: [],
    ultimaPos: { x: 0, y: 0, z: 0 },
  };
}

// ──────────────────────────────────────────────────────────────── helpers

/** Distância horizontal² entre dois pontos. */
const distH2 = (/** @type {Pos} */ a, /** @type {Pos} */ b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

/** O jogador está olhando para a posição? (dot product do vetor de visão × direção até o ponto) */
function olhandoPara(/** @type {Player} */ player, /** @type {Pos} */ pos) {
  try {
    const dir = player.getViewDirection();
    const dx = pos.x - player.location.x;
    const dy = pos.y - (player.location.y + 1.62);
    const dz = pos.z - player.location.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.1) return true;
    const dot = (dir.x * dx + dir.y * dy + dir.z * dz) / len;
    return dot > 0.85;
  } catch {
    return false;
  }
}

/** Ponto aleatório a uma distância do jogador (horizontal). */
function pontoAleatorio(/** @type {Player} */ player, /** @type {number} */ minDist, /** @type {number} */ maxDist) {
  const ang = Math.random() * Math.PI * 2;
  const dist = aleatorio(minDist, maxDist);
  return {
    x: player.location.x + Math.cos(ang) * dist,
    y: player.location.y,
    z: player.location.z + Math.sin(ang) * dist,
  };
}

/** Verifica se há chão sólido numa posição (varrendo 10 blocos para baixo). */
function temChaoEm(/** @type {Dimension} */ dim, /** @type {Pos} */ pos) {
  try {
    for (let dy = 0; dy >= -10; dy--) {
      const bloco = dim.getBlock({ x: Math.floor(pos.x), y: Math.floor(pos.y) + dy, z: Math.floor(pos.z) });
      if (bloco && !bloco.isAir && !bloco.isLiquid) {
        return { x: pos.x, y: Math.floor(pos.y) + dy + 1, z: pos.z };
      }
    }
  } catch {
    // chunk não carregado
  }
  return null;
}

/** Ângulo em graus do jogador até a posição (para rotação Y da entidade). */
function anguloAte(/** @type {Pos} */ de, /** @type {Pos} */ para) {
  const dx = para.x - de.x;
  const dz = para.z - de.z;
  return (-Math.atan2(dx, dz) * 180) / Math.PI;
}

/** Som direto no jogador (ignora ajustes — sons ambientais da dimensão). */
function tocar(/** @type {Player} */ p, /** @type {string} */ id, /** @type {Partial<{ location: Pos, volume: number, pitch: number }>} */ opts) {
  try {
    p.playSound(id, opts);
  } catch {
    // jogador saindo
  }
}

// ──────────────────────────────────────────────────────────────── limpeza
function limpar(/** @type {string} */ playerId) {
  const e = estados.get(playerId);
  if (!e) return;
  try {
    if (e.desalinhado?.isValid) e.desalinhado.remove();
  } catch {
    // já foi
  }
  estados.delete(playerId);
}

function limparEntidadesOrfas() {
  try {
    const dim = world.getDimension(DIM_END);
    for (const ent of dim.getEntities({ type: DESALINHADO })) {
      if (!ent.hasTag(TAG)) { try { ent.remove(); } catch { /* */ } continue; }
      let pertence = false;
      for (const [, e] of estados) {
        if (e.desalinhado === ent) { pertence = true; break; }
      }
      if (!pertence) try { ent.remove(); } catch { /* */ }
    }
  } catch {
    // dimensão sem chunks carregados
  }
}

world.afterEvents.playerLeave.subscribe(({ playerId }) => limpar(playerId));

// ──────────────────────────────────────────────────────────────── eventos

function eventoEcoDistante(/** @type {Player} */ player) {
  const ang = Math.random() * Math.PI * 2;
  const dist = aleatorio(20, 40);
  const loc = {
    x: player.location.x + Math.cos(ang) * dist,
    y: player.location.y,
    z: player.location.z + Math.sin(ang) * dist,
  };
  const sons = ["ambient.cave", "mob.enderman.idle"];
  const som = sons[inteiro(0, sons.length - 1)];
  tocar(player, som, { location: loc, volume: aleatorio(0.08, 0.15), pitch: aleatorio(0.4, 0.6) });
}

function eventoVazioResponde(/** @type {Player} */ player, /** @type {Estado} */ est) {
  const loc = player.location;
  const perto = est.pontosVazio.some((p) => (p.x - loc.x) ** 2 + (p.z - loc.z) ** 2 < 900);
  if (perto && distH2(loc, est.ultimaPos) < 900) return false;

  const ang1 = Math.random() * Math.PI * 2;
  const dist1 = aleatorio(15, 25);
  const pos1 = { x: loc.x + Math.cos(ang1) * dist1, y: loc.y, z: loc.z + Math.sin(ang1) * dist1 };
  tocar(player, "ambient.cave", { location: pos1, volume: 0.15, pitch: aleatorio(0.45, 0.55) });

  const id = player.id;
  const atraso = inteiro(60, 100);
  system.runTimeout(() => {
    try {
      const p = world.getAllPlayers().find((x) => x.id === id);
      if (!p?.isValid || p.dimension.id !== DIM_END) return;
      const ang2 = ang1 + aleatorio(1.5, 3.0);
      const dist2 = aleatorio(20, 35);
      const pos2 = { x: p.location.x + Math.cos(ang2) * dist2, y: p.location.y, z: p.location.z + Math.sin(ang2) * dist2 };
      tocar(p, "ambient.cave", { location: pos2, volume: 0.12, pitch: aleatorio(0.5, 0.65) });
    } catch {
      // saiu
    }
  }, atraso);

  est.pontosVazio.push({ x: loc.x, z: loc.z, tick: system.currentTick });
  if (est.pontosVazio.length > 5) est.pontosVazio.shift();
  est.ultimaPos = { x: loc.x, y: loc.y, z: loc.z };
  return true;
}

function eventoRealidadeFalha(/** @type {Player} */ player) {
  try {
    player.addEffect("darkness", 40, { amplifier: 0, showParticles: false });
  } catch {
    // efeito não aplicou
  }
  try {
    const loc = player.location;
    const dim = player.dimension;
    const particulas = ["minecraft:basic_flame_particle", "minecraft:lava_particle", "minecraft:falling_dust_scaffolding_particle"];
    const tipo = particulas[inteiro(0, particulas.length - 1)];
    for (let i = 0; i < inteiro(4, 6); i++) {
      dim.spawnParticle(tipo, {
        x: loc.x + aleatorio(-3, 3),
        y: loc.y + aleatorio(0.5, 3),
        z: loc.z + aleatorio(-3, 3),
      });
    }
  } catch {
    // chunk issue
  }
}

function eventoSilencioProfundo(/** @type {Player} */ player) {
  tocar(player, "mob.guardian.elder.curse", { volume: 0.08, pitch: aleatorio(0.25, 0.35) });
  try {
    const duracao = inteiro(100, 160);
    player.addEffect("darkness", duracao, { amplifier: 0, showParticles: false });
  } catch {
    // efeito não aplicou
  }
}

/** @returns {boolean} se o spawn foi bem-sucedido */
function eventoDesalinhado(/** @type {Player} */ player, /** @type {Estado} */ est) {
  if (est.desalinhado?.isValid) return false;

  const dim = player.dimension;
  let tentativas = 8;
  /** @type {Pos|null} */
  let spawnPos = null;
  while (tentativas-- > 0 && !spawnPos) {
    const candidato = pontoAleatorio(player, 35, 55);
    spawnPos = temChaoEm(dim, candidato);
  }
  if (!spawnPos) return false;

  try {
    const ent = dim.spawnEntity(DESALINHADO, spawnPos);
    ent.addTag(TAG);
    const ry = anguloAte(spawnPos, player.location);
    ent.teleport(spawnPos, { rotation: { x: 0, y: ry } });
    est.desalinhado = ent;
    est.desalinhadoFim = system.currentTick + inteiro(800, 1200);
    est.desalinhadoSom = system.currentTick + 200;
    est.naoOlhando = 0;
    return true;
  } catch (e) {
    registrarErro("End: spawn Desalinhado", e);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────── loop do Desalinhado
function atualizarDesalinhado(/** @type {Player} */ player, /** @type {Estado} */ est) {
  const ent = est.desalinhado;
  if (!ent?.isValid) { est.desalinhado = null; return; }

  const agora = system.currentTick;
  const loc = ent.location;
  const pLoc = player.location;
  const distSq = distH2(loc, pLoc);

  // auto-remove por tempo
  if (agora >= est.desalinhadoFim) {
    tocar(player, "mob.enderman.portal", { location: loc, volume: 0.15, pitch: 0.6 });
    try { ent.remove(); } catch { /* */ }
    est.desalinhado = null;
    return;
  }

  // jogador se aproximou demais — desaparece
  if (distSq < 25) {
    tocar(player, "mob.enderman.portal", { location: loc, volume: 0.12, pitch: 0.5 });
    try { ent.remove(); } catch { /* */ }
    est.desalinhado = null;
    return;
  }

  // som sutil periódico
  if (agora >= est.desalinhadoSom) {
    tocar(player, "mob.enderman.idle", { location: loc, volume: 0.05, pitch: 0.5 });
    est.desalinhadoSom = agora + 200;
  }

  // olhar: se o jogador NÃO está olhando, ele se aproxima lentamente
  if (olhandoPara(player, loc)) {
    est.naoOlhando = 0;
    // está sendo observado — não se move, apenas reorienta para encarar
    try {
      const ry = anguloAte(loc, pLoc);
      ent.teleport(loc, { rotation: { x: 0, y: ry } });
    } catch { /* */ }
  } else {
    est.naoOlhando += CICLO_DESALINHADO;

    // se não está olhando há mais de 3 segundos e está a mais de 10 blocos: se aproxima
    if (est.naoOlhando > 60 && distSq > 100) {
      const dist = Math.sqrt(distSq);
      const passo = aleatorio(5, 10);
      const fator = Math.min(passo / dist, 0.5);
      const nx = loc.x + (pLoc.x - loc.x) * fator;
      const nz = loc.z + (pLoc.z - loc.z) * fator;
      const novaPos = temChaoEm(player.dimension, { x: nx, y: loc.y + 5, z: nz });
      if (novaPos) {
        try {
          const ry = anguloAte(novaPos, pLoc);
          ent.teleport(novaPos, { rotation: { x: 0, y: ry } });
        } catch { /* */ }
      }
      est.naoOlhando = 0;
    }
  }
}

// ──────────────────────────────────────────────────────────────── loop principal
function ciclo() {
  const agora = system.currentTick;
  /** @type {Player[]} */
  let dentro;
  try {
    dentro = world.getDimension(DIM_END).getPlayers();
  } catch {
    return;
  }
  if (dentro.length === 0) {
    if (estados.size > 0) {
      for (const id of [...estados.keys()]) limpar(id);
    }
    return;
  }

  const idsPresentes = new Set(dentro.map((p) => p.id));
  for (const id of [...estados.keys()]) {
    if (!idsPresentes.has(id)) limpar(id);
  }

  for (const player of dentro) {
    try {
      if (!player.isValid) continue;
      let est = estados.get(player.id);
      if (!est) {
        est = novoEstado(agora);
        est.ultimaPos = { ...player.location };
        estados.set(player.id, est);
      }

      // cooldown
      est.cooldown -= CICLO;
      if (est.cooldown > 0) continue;

      const tempoNoEnd = agora - est.entrada;

      // sortear evento
      const elegíveis = EVENTOS.filter((ev) => tempoNoEnd >= ev.minTempo);
      if (elegíveis.length === 0) { est.cooldown = 100; continue; }

      const pesoEleg = elegíveis.reduce((s, e) => s + e.peso, 0);
      let rolagem = Math.random() * pesoEleg;
      /** @type {Evento|null} */
      let escolhido = null;
      for (const ev of elegíveis) {
        rolagem -= ev.peso;
        if (rolagem <= 0) { escolhido = ev; break; }
      }
      if (!escolhido) { est.cooldown = 200; continue; }

      // chance de nada acontecer (40%) — o End é mais silencioso
      if (Math.random() < 0.4) {
        est.cooldown = inteiro(200, 400);
        continue;
      }

      let executou = true;
      switch (escolhido.id) {
        case "eco_distante":
          eventoEcoDistante(player);
          break;
        case "vazio_responde":
          executou = eventoVazioResponde(player, est) !== false;
          break;
        case "realidade_falha":
          eventoRealidadeFalha(player);
          break;
        case "silencio_profundo":
          eventoSilencioProfundo(player);
          break;
        case "desalinhado":
          executou = eventoDesalinhado(player, est);
          break;
      }

      if (executou) {
        est.ultimoEvento = agora;
        est.tipoUltimo = escolhido.id;
        est.cooldown = inteiro(escolhido.cooldownMin, escolhido.cooldownMax);
      } else {
        est.cooldown = inteiro(100, 300);
      }
    } catch (e) {
      registrarErro("End: ciclo jogador", e);
    }
  }
}

// loop separado para o Desalinhado (mais frequente, precisa de responsividade)
function cicloDesalinhado() {
  for (const [playerId, est] of estados) {
    if (!est.desalinhado?.isValid) { est.desalinhado = null; continue; }
    try {
      const player = world.getAllPlayers().find((p) => p.id === playerId);
      if (!player?.isValid || player.dimension.id !== DIM_END) {
        try { est.desalinhado.remove(); } catch { /* */ }
        est.desalinhado = null;
        continue;
      }
      atualizarDesalinhado(player, est);
    } catch (e) {
      registrarErro("End: ciclo Desalinhado", e);
    }
  }
}

// ──────────────────────────────────────────────────────────────── entidade estranha que não deveria existir
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  try {
    if (entity.typeId === DESALINHADO && entity.dimension.id === DIM_END && !entity.hasTag(TAG)) entity.remove();
  } catch {
    // já saiu
  }
});

// ──────────────────────────────────────────────────────────────── inicialização
system.runInterval(ciclo, CICLO);
system.runInterval(cicloDesalinhado, CICLO_DESALINHADO);
system.runInterval(limparEntidadesOrfas, 600);

console.log(T.LOG_INICIO);
