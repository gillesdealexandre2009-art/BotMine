// @ts-check
// Flor dourada: o prop animado que enfeita a entrada da casa do mistério. Quando alguém chega perto, ela "responde": uma
// rajada de brilho dourado sobe da flor, toca um sininho só para a pessoa e uma fala sombria e doce aparece no chat
// (crua, sem o prefixo da Kiza) e na barra de ação. Cada pessoa tem a sua espera por flor e ouve as falas em ordem.
// Tudo configurável no painel da staff (florLigada, florRaio, florEsperaSeg, florFalas).
import { system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { posicoesOnline } from "../core/jogadores.js";
import { registrarErro, som } from "../core/util.js";
import * as textos from "../textos/flor.js";
import { INDICE_FLOR_DOURADA } from "../textos/props_modelos.js";
import { propsDoModelo } from "./props.js";

/** @typedef {import("@minecraft/server").Player} Player */

const PASSO = 10;
/** A fala fica na barra de ação por ~4 s (a barra some sozinha em 2 s, então é repetida). */
const REPETICOES_BARRA = 4;
const TICKS_ENTRE_BARRAS = 20;
/** Partículas tentadas em ordem: a primeira que o jogo aceitar vale. */
const PARTICULAS = ["minecraft:villager_happy", "minecraft:endrod", "minecraft:crop_growth_emitter"];
/** Rajadas que sobem da flor: [ticks depois, altura acima da base, partículas]. */
const RAJADAS = [
  [0, 0.4, 6],
  [4, 0.9, 6],
  [8, 1.4, 5],
];

/** Fim da espera (tick) de cada par pessoa|flor. @type {Map<string, number>} */
const esperas = new Map();
/** Próxima fala (índice) de cada pessoa. @type {Map<string, number>} */
const proximaFala = new Map();

/** Falas da configuração: separadas por "|", sem vazias; sem nenhuma, as padrão. */
function falasConfig() {
  const lista = config()
    .florFalas.split(textos.SEPARADOR_FALAS)
    .map((f) => f.trim())
    .filter((f) => f !== "")
    .map((f) => (f.startsWith("§") ? f : textos.ESTILO_FALA + f));
  return lista.length ? lista : textos.FALAS_PADRAO;
}

/**
 * Rajada de brilho dourado subindo da flor (todos que olham veem).
 * @param {{ x: number, y: number, z: number, d: string }} flor
 */
function brilhar(flor) {
  for (const [atraso, altura, quantas] of RAJADAS) {
    const solta = () => {
      try {
        const dim = world.getDimension(flor.d);
        for (let i = 0; i < quantas; i++) {
          const local = { x: flor.x + (Math.random() - 0.5) * 0.8, y: flor.y + altura + Math.random() * 0.3, z: flor.z + (Math.random() - 0.5) * 0.8 };
          for (const id of PARTICULAS) {
            try {
              dim.spawnParticle(id, local);
              break;
            } catch {
              // partícula que esta versão não conhece: tenta a próxima
            }
          }
        }
      } catch (e) {
        registrarErro("Flor: brilho", e);
      }
    };
    if (atraso === 0) solta();
    else system.runTimeout(solta, atraso);
  }
}

/**
 * Mostra a fala: chat cru e barra de ação por ~4 s.
 * @param {Player} player
 * @param {string} fala
 */
function falar(player, fala) {
  player.sendMessage(fala);
  for (let i = 0; i < REPETICOES_BARRA; i++) {
    const mostra = () => {
      try {
        if (player.isValid) player.onScreenDisplay.setActionBar(fala);
      } catch {
        // pessoa saindo
      }
    };
    if (i === 0) mostra();
    else system.runTimeout(mostra, i * TICKS_ENTRE_BARRAS);
  }
}

/**
 * @param {Player} player
 * @param {{ x: number, y: number, z: number, d: string }} flor
 */
function reagir(player, flor) {
  const falas = falasConfig();
  const indice = (proximaFala.get(player.id) ?? 0) % falas.length;
  proximaFala.set(player.id, indice + 1);
  brilhar(flor);
  som(player, "random.orb", { pitch: 1.9, volume: 0.35 });
  system.runTimeout(() => som(player, "note.chime", { pitch: 2, volume: 0.25 }), 6);
  falar(player, falas[indice]);
}

system.runInterval(() => {
  try {
    const cfg = config();
    if (!cfg.florLigada) return;
    const flores = propsDoModelo(INDICE_FLOR_DOURADA);
    if (!flores.length) return;
    const jogadores = posicoesOnline();
    if (!jogadores.length) return;
    const agora = system.currentTick;
    const r2 = cfg.florRaio * cfg.florRaio;
    for (const f of flores) {
      for (const j of jogadores) {
        if (j.d !== f.d) continue;
        const dx = j.x - f.x;
        const dy = j.y - f.y;
        const dz = j.z - f.z;
        if (dx * dx + dy * dy + dz * dz > r2) continue;
        const chave = `${j.id}|${f.id}`;
        if (agora < (esperas.get(chave) ?? 0)) continue;
        esperas.set(chave, agora + Math.max(0, cfg.florEsperaSeg) * 20);
        if (j.p.isValid) reagir(j.p, f);
      }
    }
  } catch (e) {
    registrarErro("Flor: chegar perto", e);
  }
}, PASSO);

// quem sai esquece as esperas e a fala em que estava (a lista não cresce para sempre)
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  proximaFala.delete(playerId);
  for (const chave of esperas.keys()) if (chave.startsWith(`${playerId}|`)) esperas.delete(chave);
});
