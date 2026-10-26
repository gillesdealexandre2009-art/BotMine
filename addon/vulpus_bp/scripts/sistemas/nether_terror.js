// @ts-check
// Terror ambiental do Nether: anomalias raras, sons perturbadores e eventos que fazem os jogadores questionarem
// se estão sozinhos. Tudo é passivo — nenhuma anomalia causa dano, destrói construção ou mata jogadores.
// O sistema roda sozinho ao importar; basta a linha no main.js.
import { system, world } from "@minecraft/server";
import { registrarErro } from "../core/util.js";
import * as T from "../textos/nether_terror.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number }} Pos */

// ─────────────────────────────────────────────────────── constantes
const DIM_NETHER = "minecraft:nether";
const OBSERVADOR = "vulpus:observador";
const PEREGRINO = "vulpus:peregrino";
const INTRUSO = "vulpus:intruso";
const ENTIDADES_TERROR = new Set([OBSERVADOR, PEREGRINO, INTRUSO]);
const TAG = "vulpus_nether_terror";

const PASSO = 20;
const PASSO_ENTIDADES = 10;

// ─────────────────────────────────────────────────────── tabela de raridade
/** @type {{ id: string, peso: number, minTempo: number, cdMin: number, cdMax: number }[]} */
const TABELA = [
  { id: "eco_passos", peso: 30, minTempo: 0,    cdMin: 400,  cdMax: 800 },
  { id: "eco_pedra",  peso: 25, minTempo: 0,    cdMin: 400,  cdMax: 800 },
  { id: "eco_porta",  peso: 15, minTempo: 600,  cdMin: 600,  cdMax: 1000 },
  { id: "silencio",   peso: 12, minTempo: 1200, cdMin: 1200, cdMax: 2000 },
  { id: "presenca",   peso: 10, minTempo: 600,  cdMin: 800,  cdMax: 1400 },
  { id: "observador", peso: 5,  minTempo: 2400, cdMin: 2400, cdMax: 4000 },
  { id: "peregrino",  peso: 2,  minTempo: 4800, cdMin: 4000, cdMax: 6000 },
  { id: "intruso",    peso: 1,  minTempo: 9600, cdMin: 8000, cdMax: 12000 },
];
const PESO_TOTAL = TABELA.reduce((s, e) => s + e.peso, 0);

// ─────────────────────────────────────────────────────── estado por jogador
/**
 * @typedef {object} Estado
 * @property {number} entrada       tick em que entrou no nether
 * @property {number} ultimoEvento  tick do último evento
 * @property {string} tipoUltimo    id do último evento
 * @property {number} cooldown      ticks mínimos até o próximo
 * @property {Entity | null} observador
 * @property {Entity | null} peregrino
 * @property {Entity | null} intruso
 * @property {number} observadorTick  tick do spawn
 * @property {number} peregrinoTick
 * @property {number} peregrinoFim     tick em que o peregrino desaparece
 * @property {number} intrusoTick
 * @property {number} intrusoFim       tick em que o intruso desaparece
 * @property {number} observadorOlhou  ticks seguidos sem olhar para o observador
 */
/** @type {Map<string, Estado>} */
const estados = new Map();

function novoEstado() {
  return {
    entrada: system.currentTick,
    ultimoEvento: system.currentTick,
    tipoUltimo: "",
    cooldown: sorteio(200, 600),
    observador: null,
    peregrino: null,
    intruso: null,
    observadorTick: 0,
    peregrinoTick: 0,
    intrusoTick: 0,
    observadorOlhou: 0,
  };
}

// ─────────────────────────────────────────────────────── utilidades
const sorteio = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.floor(Math.random() * (b - a));
const aleatorio = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a);

/** Ponto na direção `graus` a partir da frente do jogador, a `dist` blocos. 0 = frente, 180 = atrás. */
function pontoRelativo(/** @type {Player} */ player, /** @type {number} */ dist, /** @type {number} */ graus) {
  const yaw = ((player.getRotation().y + graus) * Math.PI) / 180;
  const l = player.location;
  return { x: l.x - Math.sin(yaw) * dist, y: l.y, z: l.z + Math.cos(yaw) * dist };
}

/** Ponto atrás do jogador. */
function pontoBehind(/** @type {Player} */ player, /** @type {number} */ dist) {
  return pontoRelativo(player, dist, 180);
}

/** Ponto em ângulo aleatório a `dist` blocos. */
function pontoAleatorio(/** @type {Player} */ player, /** @type {number} */ dist) {
  return pontoRelativo(player, dist, Math.random() * 360);
}

/** Retorna true se o jogador está olhando na direção de `pos` (dot product > limiar). */
function olhandoPara(/** @type {Player} */ player, /** @type {Pos} */ pos) {
  try {
    const dir = player.getViewDirection();
    const l = player.location;
    const dx = pos.x - l.x, dy = pos.y - (l.y + 1.62), dz = pos.z - l.z;
    const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (mag < 0.1) return true;
    const dot = (dir.x * dx + dir.y * dy + dir.z * dz) / mag;
    return dot > 0.92;
  } catch {
    return false;
  }
}

/** Rotação Y para que a entidade olhe de `from` para `to`. */
function yawPara(/** @type {Pos} */ from, /** @type {Pos} */ to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  return (-Math.atan2(dx, dz) * 180) / Math.PI;
}

/** Som direto no jogador (ignora ajuste "sons" — faz parte da dimensão). */
function tocar(/** @type {Player} */ player, /** @type {string} */ id, /** @type {Partial<{location: Pos, volume: number, pitch: number}>} */ opcoes) {
  try {
    player.playSound(id, opcoes);
  } catch (e) {
    registrarErro("Nether terror: som " + id, e);
  }
}

/** Tenta spawnar entidade, retorna null se falhar. */
function spawnar(/** @type {string} */ tipo, /** @type {Pos} */ pos) {
  try {
    const dim = world.getDimension(DIM_NETHER);
    const e = dim.spawnEntity(tipo, pos);
    e.addTag(TAG);
    return e;
  } catch (err) {
    registrarErro("Nether terror: spawn " + tipo, err);
    return null;
  }
}

/** Remove entidade com segurança. */
function remover(/** @type {Entity | null} */ e) {
  try {
    if (e?.isValid) e.remove();
  } catch {
    // já removida
  }
}

/** Tem entidade ativa para esse jogador? */
function temEntidadeAtiva(/** @type {Estado} */ est) {
  return (est.observador?.isValid) || (est.peregrino?.isValid) || (est.intruso?.isValid);
}

/** Limpa todas as entidades de um jogador. */
function limparEntidades(/** @type {string} */ playerId) {
  const est = estados.get(playerId);
  if (!est) return;
  remover(est.observador);
  remover(est.peregrino);
  remover(est.intruso);
  est.observador = null;
  est.peregrino = null;
  est.intruso = null;
}

// ─────────────────────────────────────────────────────── eventos sonoros

function eventoPassos(/** @type {Player} */ player) {
  const n = sorteio(3, 7);
  const dist = aleatorio(5, 12);
  const pos = pontoBehind(player, dist);
  for (let i = 0; i < n; i++) {
    system.runTimeout(() => {
      try {
        if (!player.isValid) return;
        const p = pontoBehind(player, dist + i * 0.6);
        tocar(player, "mob.zombie.step", { location: p, volume: 0.15, pitch: aleatorio(0.7, 0.9) });
      } catch { /* saiu */ }
    }, i * sorteio(4, 8));
  }
  if (Math.random() < 0.3) {
    for (let i = 0; i < 2; i++) {
      system.runTimeout(() => {
        try {
          if (!player.isValid) return;
          tocar(player, "mob.zombie.step", { location: pontoBehind(player, dist + (n + i) * 0.6), volume: 0.12, pitch: aleatorio(0.65, 0.85) });
        } catch { /* saiu */ }
      }, (n + i) * sorteio(5, 9));
    }
  }
}

function eventoPedra(/** @type {Player} */ player) {
  const lado = Math.random() < 0.5 ? 90 : -90;
  const dist = aleatorio(8, 20);
  const pos = pontoRelativo(player, dist, lado);
  const n = sorteio(2, 4);
  for (let i = 0; i < n; i++) {
    system.runTimeout(() => {
      try {
        if (!player.isValid) return;
        const som = Math.random() < 0.5 ? "dig.stone" : "dig.gravel";
        tocar(player, som, { location: pos, volume: 0.2, pitch: aleatorio(0.8, 1.1) });
      } catch { /* saiu */ }
    }, i * sorteio(3, 6));
  }
}

function eventoPorta(/** @type {Player} */ player) {
  const dist = aleatorio(10, 15);
  const pos = pontoAleatorio(player, dist);
  const som = Math.random() < 0.5 ? "random.door_open" : "random.chestopen";
  tocar(player, som, { location: pos, volume: 0.18, pitch: aleatorio(0.8, 1.0) });
}

function eventoSilencio(/** @type {Player} */ player) {
  try {
    const duracao = sorteio(60, 100);
    player.addEffect("darkness", duracao, { amplifier: 0, showParticles: false });
  } catch (e) {
    registrarErro("Nether terror: silêncio", e);
  }
}

function eventoPresenca(/** @type {Player} */ player) {
  const dist = aleatorio(5, 10);
  const graus = aleatorio(-60, 60);
  const pos = pontoRelativo(player, dist, graus);
  tocar(player, "ambient.cave", { location: pos, volume: 0.2, pitch: aleatorio(0.7, 0.9) });
  const atraso = sorteio(40, 60);
  system.runTimeout(() => {
    try {
      if (!player.isValid) return;
      tocar(player, "mob.enderman.stare", { location: pos, volume: 0.08, pitch: aleatorio(0.5, 0.7) });
    } catch { /* saiu */ }
  }, atraso);
}

// ─────────────────────────────────────────────────────── eventos com entidade

function eventoObservador(/** @type {Player} */ player, /** @type {Estado} */ est) {
  if (temEntidadeAtiva(est)) return false;
  const dist = aleatorio(30, 50);
  const pos = pontoAleatorio(player, dist);
  pos.y = player.location.y;
  const e = spawnar(OBSERVADOR, pos);
  if (!e) return false;
  try {
    const ry = yawPara(pos, player.location);
    e.teleport(pos, { rotation: { x: 0, y: ry } });
  } catch { /* ok */ }
  est.observador = e;
  est.observadorTick = system.currentTick;
  est.observadorOlhou = 0;
  return true;
}

function eventoPeregrino(/** @type {Player} */ player, /** @type {Estado} */ est) {
  if (temEntidadeAtiva(est)) return false;
  const dist = aleatorio(40, 60);
  const pos = pontoAleatorio(player, dist);
  pos.y = player.location.y;
  const e = spawnar(PEREGRINO, pos);
  if (!e) return false;
  try {
    const ry = yawPara(pos, player.location) + 180;
    e.teleport(pos, { rotation: { x: 0, y: ry } });
  } catch { /* ok */ }
  est.peregrino = e;
  est.peregrinoTick = system.currentTick;
  est.peregrinoFim = system.currentTick + sorteio(400, 600);
  return true;
}

function eventoIntruso(/** @type {Player} */ player, /** @type {Estado} */ est) {
  if (temEntidadeAtiva(est)) return false;
  const dist = aleatorio(15, 25);
  const pos = pontoAleatorio(player, dist);
  pos.y = player.location.y;
  const e = spawnar(INTRUSO, pos);
  if (!e) return false;
  try {
    const ry = yawPara(pos, player.location);
    e.teleport(pos, { rotation: { x: 0, y: ry } });
  } catch { /* ok */ }
  est.intruso = e;
  est.intrusoTick = system.currentTick;
  est.intrusoFim = system.currentTick + sorteio(600, 1200);
  return true;
}

// ─────────────────────────────────────────────────────── despachar evento
/** @returns {boolean} se o evento rodou */
function despacharEvento(/** @type {string} */ id, /** @type {Player} */ player, /** @type {Estado} */ est) {
  switch (id) {
    case "eco_passos": eventoPassos(player); return true;
    case "eco_pedra":  eventoPedra(player);  return true;
    case "eco_porta":  eventoPorta(player);  return true;
    case "silencio":   eventoSilencio(player); return true;
    case "presenca":   eventoPresenca(player); return true;
    case "observador": return eventoObservador(player, est);
    case "peregrino":  return eventoPeregrino(player, est);
    case "intruso":    return eventoIntruso(player, est);
    default: return false;
  }
}

// ─────────────────────────────────────────────────────── seleção de evento
function sortearEvento(/** @type {number} */ tempoNether, /** @type {string} */ ultimoTipo) {
  const elegíveis = TABELA.filter((e) => tempoNether >= e.minTempo && e.id !== ultimoTipo);
  if (elegíveis.length === 0) return null;
  const pesoTotal = elegíveis.reduce((s, e) => s + e.peso, 0);
  let roll = Math.random() * pesoTotal;
  for (const e of elegíveis) {
    roll -= e.peso;
    if (roll <= 0) return e;
  }
  return elegíveis[elegíveis.length - 1];
}

// ─────────────────────────────────────────────────────── loop principal
function loopPrincipal() {
  const agora = system.currentTick;
  /** @type {Set<string>} */
  let idsNoNether;
  try {
    const dim = world.getDimension(DIM_NETHER);
    const jogadores = dim.getPlayers();
    idsNoNether = new Set(jogadores.map((p) => p.id));

    // limpa quem saiu
    for (const [id, est] of estados) {
      if (idsNoNether.has(id)) continue;
      limparEntidades(id);
      estados.delete(id);
    }

    for (const player of jogadores) {
      if (!player.isValid) continue;
      let est = estados.get(player.id);
      if (!est) {
        est = novoEstado();
        estados.set(player.id, est);
      }

      // cooldown
      if (agora - est.ultimoEvento < est.cooldown) continue;

      // chance de NÃO acontecer nada neste ciclo (65% de chance de pular — mantém a incerteza)
      if (Math.random() < 0.65) {
        est.ultimoEvento = agora;
        est.cooldown = sorteio(100, 300);
        continue;
      }

      const tempoNether = agora - est.entrada;
      const ev = sortearEvento(tempoNether, est.tipoUltimo);
      if (!ev) continue;

      if (despacharEvento(ev.id, player, est)) {
        est.ultimoEvento = agora;
        est.tipoUltimo = ev.id;
        est.cooldown = sorteio(ev.cdMin, ev.cdMax);
        historico.push({ evento: ev.id, jogador: player.name, tick: agora });
        if (historico.length > MAX_HISTORICO) historico.shift();
      }
    }
  } catch (e) {
    registrarErro("Nether terror: loop", e);
  }
}

// ─────────────────────────────────────────────────────── loop de entidades
function loopEntidades() {
  const agora = system.currentTick;
  for (const [playerId, est] of estados) {
    let player;
    try {
      player = world.getAllPlayers().find((p) => p.id === playerId);
    } catch { continue; }
    if (!player?.isValid) {
      limparEntidades(playerId);
      estados.delete(playerId);
      continue;
    }

    // ── Observador: desaparece quando não está sendo olhado por > 2s ou depois de 15s
    if (est.observador?.isValid) {
      const idade = agora - est.observadorTick;
      if (idade > 300) {
        tocar(player, "mob.enderman.portal", { location: est.observador.location, volume: 0.15, pitch: aleatorio(0.6, 0.8) });
        remover(est.observador);
        est.observador = null;
      } else if (!olhandoPara(player, est.observador.location)) {
        est.observadorOlhou += PASSO_ENTIDADES;
        if (est.observadorOlhou > 40) {
          tocar(player, "mob.enderman.portal", { location: est.observador.location, volume: 0.1, pitch: aleatorio(0.5, 0.7) });
          remover(est.observador);
          est.observador = null;
        }
      } else {
        est.observadorOlhou = 0;
      }
    } else if (est.observador) {
      est.observador = null;
    }

    // ── Peregrino: caminha para longe, some depois de 20-30s ou > 80 blocos
    if (est.peregrino?.isValid) {
      const loc = est.peregrino.location;
      const pl = player.location;
      const dx = loc.x - pl.x, dz = loc.z - pl.z;
      const distSq = dx * dx + dz * dz;

      if (agora > est.peregrinoFim || distSq > 6400) {
        remover(est.peregrino);
        est.peregrino = null;
      } else {
        try {
          const mag = Math.sqrt(distSq) || 1;
          const nx = dx / mag, nz = dz / mag;
          const passo = aleatorio(1, 2);
          const novaPos = { x: loc.x + nx * passo, y: loc.y, z: loc.z + nz * passo };
          const ry = yawPara(loc, pl) + 180;
          est.peregrino.teleport(novaPos, { rotation: { x: 0, y: ry } });
        } catch {
          remover(est.peregrino);
          est.peregrino = null;
        }
      }
    } else if (est.peregrino) {
      est.peregrino = null;
    }

    // ── Intruso: não se move, som de batida cardíaca, some depois de 30-60s
    if (est.intruso?.isValid) {
      const idade = agora - est.intrusoTick;

      if (agora > est.intrusoFim) {
        remover(est.intruso);
        est.intruso = null;
      } else if (idade % 100 < PASSO_ENTIDADES) {
        try {
          tocar(player, "mob.warden.heartbeat", { location: est.intruso.location, volume: 0.1, pitch: aleatorio(0.5, 0.7) });
        } catch { /* saiu */ }
      }
    } else if (est.intruso) {
      est.intruso = null;
    }
  }
}

// ─────────────────────────────────────────────────────── limpeza ao sair
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  limparEntidades(playerId);
  estados.delete(playerId);
});

// entidades de terror que nascem sem a tag são espúrias (não deveriam existir sem o sistema)
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  try {
    if (ENTIDADES_TERROR.has(entity.typeId) && !entity.hasTag(TAG)) entity.remove();
  } catch { /* já saiu */ }
});

// ao ligar o mundo, limpa entidades de terror que sobreviveram a um reinício
world.afterEvents.worldLoad.subscribe(() => {
  system.runTimeout(() => {
    try {
      for (const e of world.getDimension(DIM_NETHER).getEntities()) {
        if (ENTIDADES_TERROR.has(e.typeId)) e.remove();
      }
    } catch { /* dimensão não carregada */ }
  }, 100);
  console.log(T.LOG + ": iniciado");
});

// ─────────────────────────────────────────────────────── iniciar ciclos
system.runInterval(loopPrincipal, PASSO);
system.runInterval(loopEntidades, PASSO_ENTIDADES);

// ─────────────────────────────────────────────────────── diagnóstico (exportado para o painel da staff)
/** @type {{ evento: string, jogador: string, tick: number }[]} */
const historico = [];
const MAX_HISTORICO = 20;

export function diagnosticoNetherTerror() {
  return {
    jogadores: estados.size,
    historico: historico.slice(-10),
  };
}
