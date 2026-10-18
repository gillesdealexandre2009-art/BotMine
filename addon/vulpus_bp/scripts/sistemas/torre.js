// @ts-check
// Torre da Vulpus: desafio de parkour. A staff marca o início (base) e a chegada (a casinha do topo). Quem sai do início e
// sobe começa a contar; cair de volta ao início zera; chegar na casinha termina e paga. Ranking dos melhores tempos num texto
// flutuante no início. Prêmio com espera entre prêmios, limite por dia e bônus de primeira vez/recorde. Voar, planar, criativo,
// teleportar ou atravessar de dimensão anula a subida. Painel da staff: feira_staff.js.
import { GameMode, Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { manterTexto } from "../core/flutuante.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, formatarCoords, limitar, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/torre.js";
import { adicionarCaudas } from "./caudas.js";
import { ganharXp } from "./niveis.js";
import { online } from "../core/jogadores.js";

/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {{ nome: string, melhor: number, vezes: number, dia: string, hoje: number, ult: number }} Registro */
/** @typedef {{ inicio?: Ponto, chegada?: Ponto, jogadores: Record<string, Registro> }} Dados */
/** @typedef {{ t0: number, x: number, y: number, z: number }} Subida */

const CHAVE = "vulpus:torre";
const TAG_TITULO = "vulpus_torre_titulo";
const PASSO = 10;
const PASSO_MANTER = 100;
const ALTURA_TITULO = 3;
/** Pulo máximo (lateral ou para cima) entre duas checagens, em blocos, antes de considerar teleporte; cair não conta. */
const PULO_MAX = 25;
const LIMITE_SUBIDA_MS = 60 * 60 * 1000;
const TOPO_RANKING = 5;

/** @type {Dados | undefined} */
let dados;
/** @type {Map<string, Subida>} */
const subidas = new Map();
/** Quem está dentro da zona de início (pronto para começar a contar). */
const armados = new Set();
let textoAtual = "";

/** @param {any} p @returns {Ponto | undefined} */
function lerPonto(p) {
  return p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n)) ? { x: p.x, y: p.y, z: p.z, d: p.d } : undefined;
}

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {Record<string, Registro>} */
  const jogadores = {};
  if (s.jogadores && typeof s.jogadores === "object") {
    for (const [id, r] of Object.entries(s.jogadores)) {
      const x = /** @type {any} */ (r);
      if (x && typeof x === "object") {
        jogadores[id] = { nome: String(x.nome ?? "?").slice(0, 40), melhor: Number(x.melhor) || 0, vezes: Number(x.vezes) || 0, dia: String(x.dia ?? ""), hoje: Number(x.hoje) || 0, ult: Number(x.ult) || 0 };
      }
    }
  }
  dados = { inicio: lerPonto(s.inicio), chegada: lerPonto(s.chegada), jogadores };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

const pronta = () => !!(config().torreLigada && lerDados().inicio && lerDados().chegada);

/** "3:25" ou "1:02:07". @param {number} ms */
function formatarCrono(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const s = t % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const dois = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${m}:${dois(s)}`;
}

/** @param {string} id */
function registroDe(id, nome = "?") {
  const d = lerDados();
  const dia = diaBrasilia(Date.now());
  const r = d.jogadores[id] ?? { nome, melhor: 0, vezes: 0, dia, hoje: 0, ult: 0 };
  r.nome = nome;
  if (r.dia !== dia) {
    r.dia = dia;
    r.hoje = 0;
  }
  d.jogadores[id] = r;
  return r;
}

function ranking() {
  return Object.values(lerDados().jogadores)
    .filter((r) => r.melhor > 0)
    .sort((a, b) => a.melhor - b.melhor)
    .slice(0, TOPO_RANKING);
}

function texto() {
  const linhas = ranking().map((r, i) => textos.LINHA_RANKING(i + 1, r.nome, formatarCrono(r.melhor)));
  return textos.TITULO_FLUTUANTE(linhas, config().torreCaudas);
}

function manter() {
  try {
    const i = lerDados().inicio;
    textoAtual = texto();
    manterTexto(TAG_TITULO, config().torreLigada && i ? { x: i.x, y: i.y + ALTURA_TITULO, z: i.z, d: i.d } : undefined, textoAtual);
  } catch (e) {
    registrarErro("Torre: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** @param {Player} p */
function modoValido(p) {
  try {
    const m = p.getGameMode();
    return m === GameMode.Survival || m === GameMode.Adventure;
  } catch {
    return true;
  }
}

/** @param {Player} p */
function trapaceando(p) {
  try {
    if (!modoValido(p)) return true;
    if (p.isFlying || p.isGliding) return true;
  } catch {
    // propriedade indisponível: não conta como trapaça
  }
  return false;
}

/** @param {Player} player @param {number} ms */
function chegou(player, ms) {
  const cfg = config();
  const d = lerDados();
  if (ms < cfg.torreTempoMinSeg * 1000) {
    msg(player, textos.SEM_PREMIO_RAPIDO);
    return;
  }
  const r = registroDe(player.id, player.name);
  const antesRecorde = r.melhor;
  const recorde = r.melhor === 0 || ms < r.melhor;
  const primeira = r.vezes === 0;
  const topoAntes = ranking()[0];
  if (recorde) r.melhor = ms;
  const agora = Date.now();
  const tempo = formatarCrono(ms);
  mostrarTitulo(player, textos.TITULO_CHEGADA(tempo), { subtitulo: textos.SUB_CHEGADA(tempo), entrada: 5, fica: 70, saida: 20 });
  som(player, "random.levelup");
  msg(player, textos.MSG_TEMPO(tempo, recorde && antesRecorde > 0));

  const esperaMs = cfg.torreEsperaMin * 60000;
  if (r.hoje >= cfg.torreMaxDia) {
    msg(player, textos.SEM_PREMIO_DIA);
  } else if (!primeira && r.ult && agora - r.ult < esperaMs) {
    msg(player, textos.SEM_PREMIO_ESPERA(Math.max(1, Math.ceil((esperaMs - (agora - r.ult)) / 60000))));
  } else {
    const bonusPrimeira = primeira ? cfg.torrePrimeiraCaudas : 0;
    const bonusRecorde = recorde && antesRecorde > 0 ? cfg.torreRecordeCaudas : 0;
    const caudas = cfg.torreCaudas + bonusPrimeira + bonusRecorde;
    const xp = cfg.torreXp + (primeira ? cfg.torrePrimeiraXp : 0);
    if (caudas > 0) adicionarCaudas(player, caudas);
    if (xp > 0) ganharXp(player, xp);
    r.hoje += 1;
    r.ult = agora;
    msg(player, textos.MSG_PREMIO(caudas, xp, bonusPrimeira, bonusRecorde));
  }
  r.vezes += 1;
  gravar();
  const topo = ranking()[0];
  if (recorde && topo && topo.nome === player.name && (!topoAntes || topoAntes.nome !== player.name)) {
    for (const p of world.getAllPlayers()) if (p.id !== player.id) msg(p, textos.AVISO_RECORDE(player.name, tempo));
  }
  manter();
}

system.runInterval(() => {
  try {
    if (!pronta()) {
      subidas.clear();
      armados.clear();
      return;
    }
    const cfg = config();
    const { inicio, chegada } = lerDados();
    if (!inicio || !chegada) return;
    const total = Math.max(1, chegada.y - inicio.y);
    for (const p of online()) {
      if (!p.isValid) continue;
      const loc = p.location;
      const subida = subidas.get(p.id);
      if (p.dimension.id !== inicio.d) {
        if (subida) {
          subidas.delete(p.id);
          msg(p, textos.LONGE);
        }
        armados.delete(p.id);
        continue;
      }
      const hInicio = Math.hypot(loc.x - inicio.x, loc.z - inicio.z);
      const baixo = loc.y <= inicio.y + 2.5 && loc.y >= inicio.y - 4;
      if (!subida) {
        if (hInicio <= cfg.torreRaioInicio && baixo && !trapaceando(p)) {
          if (!armados.has(p.id)) {
            armados.add(p.id);
            p.onScreenDisplay.setActionBar(textos.BARRA_PRONTO);
          }
        } else if (armados.has(p.id) && hInicio > cfg.torreRaioInicio) {
          armados.delete(p.id);
          if (!trapaceando(p)) {
            subidas.set(p.id, { t0: Date.now(), x: loc.x, y: loc.y, z: loc.z });
            msg(p, textos.COMECOU);
          }
        }
        continue;
      }
      // subida em andamento
      if (trapaceando(p) || Math.hypot(loc.x - subida.x, Math.max(0, loc.y - subida.y), loc.z - subida.z) > PULO_MAX) {
        subidas.delete(p.id);
        msg(p, textos.ANULADA);
        continue;
      }
      subida.x = loc.x;
      subida.y = loc.y;
      subida.z = loc.z;
      const ms = Date.now() - subida.t0;
      const hChegada = Math.hypot(loc.x - chegada.x, loc.z - chegada.z);
      if (hChegada <= cfg.torreRaioChegada && Math.abs(loc.y - chegada.y) <= 3) {
        subidas.delete(p.id);
        chegou(p, ms);
        continue;
      }
      if (hInicio <= cfg.torreRaioInicio + 1 && baixo) {
        subidas.delete(p.id);
        armados.add(p.id);
        msg(p, textos.CAIU);
        continue;
      }
      if (ms > LIMITE_SUBIDA_MS || Math.hypot(loc.x - inicio.x, loc.z - inicio.z) > cfg.torreRaioMax || loc.y < inicio.y - 6) {
        subidas.delete(p.id);
        msg(p, textos.LONGE);
        continue;
      }
      const pct = limitar(Math.round(((loc.y - inicio.y) / total) * 100), 0, 100);
      p.onScreenDisplay.setActionBar(textos.BARRA(formatarCrono(ms), pct));
    }
  } catch (e) {
    registrarErro("Torre: acompanhar", e);
  }
}, PASSO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  subidas.delete(playerId);
  armados.delete(playerId);
});

// ------------------------------------------------------------------------------ painel da staff
export function estadoTorre() {
  const d = lerDados();
  return { inicio: !!d.inicio, chegada: !!d.chegada, subindo: subidas.size, chegadas: Object.values(d.jogadores).reduce((s, r) => s + r.vezes, 0) };
}

/** @param {Player} player */
function pontoDoPe(player) {
  const l = player.location;
  return { x: Math.floor(l.x) + 0.5, y: Math.floor(l.y), z: Math.floor(l.z) + 0.5, d: player.dimension.id };
}

/** @param {Player} player */
export function marcarInicio(player) {
  const p = pontoDoPe(player);
  lerDados().inicio = p;
  subidas.clear();
  armados.clear();
  gravar();
  manter();
  ok(player, textos.INICIO_MARCADO(formatarCoords(p)));
}

/** @param {Player} player */
export function marcarChegada(player) {
  const p = pontoDoPe(player);
  lerDados().chegada = p;
  subidas.clear();
  gravar();
  ok(player, textos.CHEGADA_MARCADA(formatarCoords(p)));
}

/** @param {Player} player */
export function zerarTorre(player) {
  lerDados().jogadores = {};
  gravar();
  manter();
  ok(player, textos.ZERADO);
}

/** @param {Player} player */
export function removerTorre(player) {
  const d = lerDados();
  d.inicio = undefined;
  d.chegada = undefined;
  subidas.clear();
  armados.clear();
  gravar();
  manter();
  ok(player, textos.REMOVIDA);
}
