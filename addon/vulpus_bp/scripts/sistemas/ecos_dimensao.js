// @ts-check
// Dimensão "Ecos dos Ausentes". Registra a dimensão customizada, controla construção,
// entrada/saída de jogadores e efeitos por região (fog, som, etc.).
// Segue o mesmo padrão do Intervalo: dimensão void, construção procedural, guarda-volumes.

import { system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { PincelMundo } from "./obras_pincel.js";
import { CAIXA, construir, PONTOS, REG } from "./ecos_mapa.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */

// ───────────────────────────────────────────── constantes
export const DIM_ECOS = "vulpus:ecos";
const CHAVE_CONSTRUIDO = "vulpus:ecos:construido";
const CHAVE_ORIGEM = "vulpus:ecos:origem";
const ORCAMENTO_MS = 10;
const AREA_TICKING = "vulpus_ecos_build";

const ORIGEM_PADRAO = { x: 10000, y: 80, z: 10000 };

// ───────────────────────────────────────────── registro da dimensão
system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
  dimensionRegistry.registerCustomDimension(DIM_ECOS);
});

// ───────────────────────────────────────────── estado de construção
/** @type {{ ocupado: boolean, fase: string, pct: number }} */
const cons = { ocupado: false, fase: "", pct: 0 };

export const estadoConstrucao = () => ({ ...cons });
export const ecosConstruido = () => !!lerMundo(CHAVE_CONSTRUIDO, false);

/** @returns {{ x: number, y: number, z: number }} */
export function origemEcos() {
  return lerMundo(CHAVE_ORIGEM, ORIGEM_PADRAO);
}

// ───────────────────────────────────────────── construção procedural

/**
 * Inicia a construção da dimensão Ecos dos Ausentes.
 * @param {Player} [quem] staff que disparou
 * @returns {Promise<boolean>}
 */
export async function construirEcos(quem) {
  if (cons.ocupado) return false;
  cons.ocupado = true;
  cons.fase = "Preparando";
  cons.pct = 0;

  const o = origemEcos();
  const dim = world.getDimension(DIM_ECOS);

  // Área de ticking para manter chunks carregados durante a construção
  try { dim.runCommand(`tickingarea remove ${AREA_TICKING}`); } catch { /* não existia */ }
  try {
    dim.runCommand(
      `tickingarea add ${o.x + CAIXA.x1} ${o.y + CAIXA.y1} ${o.z + CAIXA.z1} ` +
      `${o.x + CAIXA.x2} ${o.y + CAIXA.y2} ${o.z + CAIXA.z2} ${AREA_TICKING} true`,
    );
  } catch {
    // Área muito grande — usar circle
    const cx = o.x + Math.floor((CAIXA.x1 + CAIXA.x2) / 2);
    const cz = o.z + Math.floor((CAIXA.z1 + CAIXA.z2) / 2);
    try { dim.runCommand(`tickingarea add circle ${cx} ${o.y} ${cz} 10 ${AREA_TICKING} true`); } catch { /* ok */ }
  }

  // Esperar chunks carregarem
  await new Promise((r) => system.runTimeout(() => r(undefined), 200));

  return new Promise((resolve) => {
    rodar(dim, o, (p, progresso) => construir(p, progresso), () => {
      salvarMundo(CHAVE_CONSTRUIDO, true);
      try { dim.runCommand(`tickingarea remove ${AREA_TICKING}`); } catch { /* ok */ }
      cons.ocupado = false;
      cons.fase = "Concluído";
      cons.pct = 1;
      resolve(true);
    });
  });
}

/**
 * @param {Dimension} dim
 * @param {{ x: number, y: number, z: number }} o
 * @param {(p: import("./obras_pincel.js").Pincel, progresso: (f: number, txt: string) => void) => Generator} fabricar
 * @param {() => void} aoTerminar
 */
function rodar(dim, o, fabricar, aoTerminar) {
  const pincel = new PincelMundo(dim);

  // Wrapper que soma a origem a todas as coordenadas
  /** @type {import("./obras_pincel.js").Pincel} */
  const proxy = {
    fill: (x1, y1, z1, x2, y2, z2, id) => pincel.fill(o.x + x1, o.y + y1, o.z + z1, o.x + x2, o.y + y2, o.z + z2, id),
    set: (x, y, z, id, est) => pincel.set(o.x + x, o.y + y, o.z + z, id, est),
    id: (x, y, z) => pincel.id(o.x + x, o.y + y, o.z + z),
    superficie: (x, z) => pincel.superficie(o.x + x, o.z + z),
    existe: (id) => pincel.existe(id),
    placa: (x, y, z, linhas) => pincel.placa(o.x + x, o.y + y, o.z + z, linhas),
    get ops() { return pincel.ops; },
    set ops(v) { pincel.ops = v; },
    get falhas() { return pincel.falhas; },
    get semChao() { return pincel.semChao; },
    get primeiraFalha() { return pincel.primeiraFalha; },
  };

  const progresso = (/** @type {number} */ f, /** @type {string} */ txt) => {
    cons.pct = f;
    cons.fase = txt;
  };

  const gen = fabricar(proxy, progresso);
  const tick = system.runInterval(() => {
    const t0 = Date.now();
    try {
      while (Date.now() - t0 < ORCAMENTO_MS) {
        const r = gen.next();
        if (r.done) { system.clearRun(tick); aoTerminar(); return; }
      }
    } catch (e) {
      console.warn(`[ECOS] erro na construção: ${e}`);
    }
  }, 1);
}

// ───────────────────────────────────────────── entrada e saída de jogadores

/**
 * Teleporta o jogador para a dimensão Ecos e guarda o inventário.
 * @param {Player} player
 */
export function entrarNosEcos(player) {
  if (!ecosConstruido()) return false;
  const o = origemEcos();
  const spawn = PONTOS.find((pt) => pt.t === "spawn");
  const destX = o.x + (spawn?.x ?? 10);
  const destY = o.y + (spawn?.y ?? 1);
  const destZ = o.z + (spawn?.z ?? 28);
  player.teleport({ x: destX, y: destY, z: destZ }, { dimension: world.getDimension(DIM_ECOS) });
  return true;
}

/**
 * Devolve o jogador ao spawn do Overworld.
 * @param {Player} player
 */
export function sairDosEcos(player) {
  const ow = world.getDimension("minecraft:overworld");
  const spawnLocal = world.getDefaultSpawnLocation();
  player.teleport({ x: spawnLocal.x, y: spawnLocal.y + 1, z: spawnLocal.z }, { dimension: ow });
}

// ───────────────────────────────────────────── fog por região

/**
 * @param {Player} player
 * @returns {typeof REG[number] | undefined}
 */
export function regiaoDoJogador(player) {
  if (player.dimension.id !== DIM_ECOS) return undefined;
  const o = origemEcos();
  const rx = Math.floor(player.location.x) - o.x;
  const rz = Math.floor(player.location.z) - o.z;
  return REG.find((r) => rx >= r.x1 && rx <= r.x2 && rz >= r.z1 && rz <= r.z2);
}

/** @type {Map<string, string>} jogador -> último fog aplicado */
const fogAtual = new Map();

function atualizarFog() {
  for (const player of world.getAllPlayers()) {
    if (player.dimension.id !== DIM_ECOS) {
      if (fogAtual.has(player.id)) {
        try { player.runCommand(`fog @s remove "vulpus_ecos"`); } catch { /* ok */ }
        fogAtual.delete(player.id);
      }
      continue;
    }
    const reg = regiaoDoJogador(player);
    if (!reg) continue;
    const fogAnterior = fogAtual.get(player.id);
    if (fogAnterior === reg.fog) continue;

    try { player.runCommand(`fog @s remove "vulpus_ecos"`); } catch { /* ok */ }
    // Transição suave: primeiro _t2 (mais leve), depois o fog cheio
    try { player.runCommand(`fog @s push ${reg.fog}_t2 "vulpus_ecos"`); } catch { /* ok */ }
    const fogFinal = reg.fog;
    const pid = player.id;
    system.runTimeout(() => {
      try {
        const p2 = world.getAllPlayers().find((pl) => pl.id === pid);
        if (p2) {
          p2.runCommand(`fog @s remove "vulpus_ecos"`);
          p2.runCommand(`fog @s push ${fogFinal} "vulpus_ecos"`);
        }
      } catch { /* jogador saiu */ }
    }, 30);
    fogAtual.set(player.id, reg.fog);
  }
}

// Night vision para atmosfera escura
function atualizarVisao() {
  for (const player of world.getAllPlayers()) {
    if (player.dimension.id !== DIM_ECOS) continue;
    try { player.addEffect("night_vision", 4800, { amplifier: 0, showParticles: false }); } catch { /* ok */ }
  }
}

// ───────────────────────────────────────────── sons ambiente por região

/** @type {Map<string, number>} jogador -> último tick de som */
const ultimoSom = new Map();

const SONS_REGIAO = {
  limiar: { som: "ambient.cave", intervalo: 280 },
  vila: { som: "ambient.cave", intervalo: 400 },
  arquivo: { som: "ambient.cave", intervalo: 200 },
  arena: { som: "ambient.cave", intervalo: 160 },
};

function somAmbiente() {
  const tick = system.currentTick;
  for (const player of world.getAllPlayers()) {
    if (player.dimension.id !== DIM_ECOS) continue;
    const reg = regiaoDoJogador(player);
    if (!reg) continue;
    const cfg = SONS_REGIAO[reg.id];
    if (!cfg) continue;
    const ultimo = ultimoSom.get(player.id) ?? 0;
    if (tick - ultimo < cfg.intervalo) continue;
    ultimoSom.set(player.id, tick);
    try {
      const rx = (Math.random() - 0.5) * 16;
      const rz = (Math.random() - 0.5) * 16;
      player.dimension.runCommand(
        `playsound ${cfg.som} @a[name="${player.name}"] ${player.location.x + rx} ${player.location.y} ${player.location.z + rz} 0.4`,
      );
    } catch { /* ok */ }
  }
}

// ───────────────────────────────────────────── loops de runtime

let loopsIniciados = false;

export function iniciarLoopsEcos() {
  if (loopsIniciados) return;
  loopsIniciados = true;
  system.runInterval(atualizarFog, 20);
  system.runInterval(atualizarVisao, 200);
  system.runInterval(somAmbiente, 20);
}

// Limpar estado quando jogador sai
world.afterEvents.playerLeave.subscribe((ev) => {
  fogAtual.delete(ev.playerId);
  ultimoSom.delete(ev.playerId);
});
