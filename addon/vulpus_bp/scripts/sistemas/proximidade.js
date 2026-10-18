// @ts-check
// Chat de voz por proximidade: manda ao bot a posição de quem tem a conta ligada, de 3 em 3 s (ou na hora em que algo muda), e o bot
// junta quem está perto na mesma sala de voz do Discord. Aqui não há decisão de grupo: só a lista de posições e a marca "livre"
// (false em minigame, no Intervalo, nas regiões do mistério, em outra dimensão ou sumido: lá a pessoa volta para a sala de entrada).
// Só age com o pack da ponte (servidor dedicado) e com "proximidadeLigada".
import { system } from "@minecraft/server";
import { config, dadosJogador } from "../core/db.js";
import { TAG_SUMIDO, online } from "../core/jogadores.js";
import { chamar, ponteViva } from "../core/ponte_cliente.js";
import { travados } from "../core/ponte_estado.js";
import { registrarErro } from "../core/util.js";
import { pontoEmZona } from "../core/arg_zona.js";
import { emMinigame } from "./mg_estado.js";

const TICKS_VERIFICA = 60;
/** Sem mudança relevante, ainda assim manda a cada tantos ticks (o bot usa isso como "o jogo está vivo"). */
const TICKS_REPETE = 20 * 15;
/** Quanto alguém precisa andar (blocos) para valer um envio novo. */
const PASSO = 3;
const MAX_JOGADORES = 60;

/** Último que foi enviado, por jogador. @type {Map<string, { x: number, y: number, z: number, d: string, livre: boolean }>} */
let ultimo = new Map();
let ultimoEnvio = -TICKS_REPETE;
let emVoo = false;

/**
 * Pode conversar por proximidade aqui? Overworld, Nether e End valem (o bot só junta quem está na MESMA dimensão); ficam de fora as
 * dimensões da Vulpus (Intervalo, minigames...), os minigames, as regiões do mistério e quem está sumido.
 * @param {import("@minecraft/server").Player} p
 */
export function podeConversar(p) {
  try {
    if (p.hasTag(TAG_SUMIDO) || p.dimension.id.startsWith("vulpus:") || emMinigame(p)) return false;
    const { x, y, z } = p.location;
    return !pontoEmZona({ x, y, z, d: p.dimension.id });
  } catch {
    return false;
  }
}

/** @param {import("@minecraft/server").Player} p */
function ponto(p) {
  const { x, y, z } = p.location;
  const livre = podeConversar(p);
  return { id: p.id, nome: p.name, d: p.dimension.id, x: Math.round(x), y: Math.round(y), z: Math.round(z), livre };
}

/**
 * Houve mudança que o bot precisa saber? (alguém entrou ou saiu da lista, trocou de dimensão ou de "livre", ou andou mais que PASSO)
 * @param {ReturnType<typeof ponto>[]} atual
 */
export function mudou(atual, antes = ultimo) {
  if (atual.length !== antes.size) return true;
  for (const a of atual) {
    const b = antes.get(a.id);
    if (!b || b.d !== a.d || b.livre !== a.livre) return true;
    if (Math.abs(b.x - a.x) >= PASSO || Math.abs(b.y - a.y) >= PASSO || Math.abs(b.z - a.z) >= PASSO) return true;
  }
  return false;
}

async function enviar() {
  if (emVoo || !config().proximidadeLigada || !ponteViva()) return;
  /** @type {ReturnType<typeof ponto>[]} */
  const atual = [];
  for (const p of online()) {
    if (atual.length >= MAX_JOGADORES) break;
    try {
      if (travados.has(p.id) || !dadosJogador(p).vinculo) continue;
      atual.push(ponto(p));
    } catch {
      /* jogador saindo: pula */
    }
  }
  const agora = system.currentTick;
  if (!mudou(atual) && agora - ultimoEnvio < TICKS_REPETE) return;
  if (atual.length === 0 && ultimo.size === 0) return;
  emVoo = true;
  try {
    const r = await chamar("POST", "/mc/prox", { pos: atual });
    if (r.status === 200) {
      ultimo = new Map(atual.map((a) => [a.id, a]));
      ultimoEnvio = agora;
    }
  } catch (e) {
    registrarErro("Proximidade: envio", e);
  } finally {
    emVoo = false;
  }
}

system.runInterval(() => void enviar(), TICKS_VERIFICA);
