// @ts-check
// Viagem pelos portais da Sala dos Portais (na montanha) e das entradas da masmorra (lá embaixo). Entrar na zona de um portal
// teleporta a pessoa para o outro lado, com espera entre usos para não se entrar e sair com facilidade (a staff é livre).
import { system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { emitir } from "../core/efeitos.js";
import { ehStaff } from "../core/permissoes.js";
import { teleportar } from "../core/teleporte.js";
import { erro, msg, registrarErro } from "../core/util.js";
import { emMinigame } from "./mg_estado.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa */

/**
 * @typedef {object} Portal
 * @property {string} id
 * @property {string} nome  nome do destino
 * @property {string} d  dimensão
 * @property {Caixa} zona
 * @property {{ x: number, y: number, z: number }} destino
 * @property {(p: Player) => string | null} [permite]  texto do motivo para barrar essa pessoa (null = pode)
 * @property {boolean} [semEspera]  sem a espera entre usos (portais internos da masmorra)
 */

/** @type {Map<string, number>} id → ms do último uso */
const usos = new Map();
const PASSO = 5;
const ROXO = { red: 0.6, green: 0.25, blue: 1 };

/** @type {(() => Portal[]) | null} */
let fonte = null;
/** @type {Portal[]} */
let cache = [];
let cacheTick = -999;

/** @param {() => Portal[]} f */
export function ligarViagens(f) {
  fonte = f;
}

/** Força a releitura dos portais (depois de gerar ou apagar uma obra). */
export function atualizarPortais() {
  cacheTick = -999;
}

/** Pessoa dentro da zona? @param {Player} p @param {Caixa} z */
export function dentroDaZona(p, z) {
  const { x, y, z: zz } = p.location;
  return x >= z.x1 - 0.2 && x <= z.x2 + 1.2 && zz >= z.z1 - 0.2 && zz <= z.z2 + 1.2 && y >= z.y1 - 1 && y <= z.y2 + 1;
}

/** @param {string} id @param {number} agora */
function restante(id, agora) {
  const espera = config().portalEsperaSeg * 1000;
  const t = usos.get(id);
  return t === undefined ? 0 : Math.max(0, t + espera - agora);
}

/** Leva a pessoa pelo portal (ou explica por que não). @param {Player} p @param {Portal} portal */
export function usarPortal(p, portal) {
  const agora = Date.now();
  const chave = `${p.id}:${portal.id}`;
  const barrado = emMinigame(p) ? "§cVocê está em um minigame. Use §f/vulpus:sairminigame§c para sair antes." : (portal.permite?.(p) ?? null);
  if (barrado) {
    const aviso = usos.get(`${chave}:aviso`) ?? 0;
    if (agora - aviso > 3000) {
      usos.set(`${chave}:aviso`, agora);
      erro(p, barrado);
    }
    return;
  }
  const falta = ehStaff(p) || portal.semEspera ? 0 : restante(chave, agora);
  if (falta > 0) {
    // avisa no máximo a cada 3 s para não lotar o chat
    const aviso = usos.get(`${chave}:aviso`) ?? 0;
    if (agora - aviso > 3000) {
      usos.set(`${chave}:aviso`, agora);
      erro(p, `O portal ainda está se recompondo. Espere ${Math.ceil(falta / 1000)}s.`);
    }
    return;
  }
  usos.set(chave, agora);
  // os dois lados dividem a espera: quem entrou também fica sem sair de imediato
  usos.set(`${p.id}:${portal.id.startsWith("sobe") ? portal.id.replace("sobe", "desce") : portal.id.replace("desce", "sobe")}`, agora);
  const ok = teleportar(p, { ...portal.destino, d: portal.d }, { nome: portal.nome, semEspera: true, tema: "spawn", salvarVoltar: false });
  if (!ok) usos.delete(chave);
}

system.runInterval(() => {
  try {
    if (!fonte) return;
    const agora = system.currentTick;
    if (agora - cacheTick > 100) {
      cache = fonte();
      cacheTick = agora;
    }
    if (!cache.length) return;
    const jogadores = world.getAllPlayers();
    if (!jogadores.length) return;
    for (const portal of cache) {
      let perto = false;
      for (const p of jogadores) {
        if (p.dimension.id !== portal.d) continue;
        const dx = p.location.x - portal.zona.x1, dz = p.location.z - portal.zona.z1;
        if (Math.abs(dx) < 48 && Math.abs(dz) < 48) perto = true;
        if (dentroDaZona(p, portal.zona)) usarPortal(p, portal);
      }
      if (perto && agora % 10 === 0) {
        const dim = world.getDimension(portal.d);
        const z = portal.zona;
        for (let i = 0; i < 5; i++) {
          emitir(dim, "minecraft:colored_flame_particle", {
            x: z.x1 + Math.random() * (z.x2 - z.x1 + 1),
            y: z.y1 + Math.random() * (z.y2 - z.y1 + 1),
            z: z.z1 + Math.random() * (z.z2 - z.z1 + 1),
          }, ROXO);
        }
      }
    }
  } catch (e) {
    registrarErro("Obras: portais", e);
  }
}, PASSO);

void msg;
