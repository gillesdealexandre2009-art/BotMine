// @ts-check
// Chat de voz por proximidade: manda ao bot a posição de quem tem a conta ligada, de 3 em 3 s (ou na hora em que algo muda), e o bot
// junta quem está perto na mesma sala de voz do Discord. Aqui não há decisão de grupo: só a lista de posições, a marca "livre" e a "zona"
// (lugar especial: minigames, Intervalo, dimensão secreta e mistério têm uma chamada própria cada, com todo mundo do lugar junto).
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
const DIM_MINIGAMES = "vulpus:minigames";

/** Último que foi enviado, por jogador. @type {Map<string, { x: number, y: number, z: number, d: string, livre: boolean, zona: string }>} */
let ultimo = new Map();
let ultimoEnvio = -TICKS_REPETE;
let emVoo = false;

/**
 * Onde a pessoa está para a conversa. Overworld, Nether e End: proximidade normal (zona vazia). Lugares especiais: todo mundo do mesmo
 * lugar fica numa chamada só, sem olhar distância: "vulpus:minigames" (todos os minigames juntos), "vulpus:intervalo", qualquer outra
 * dimensão da Vulpus (a secreta, por exemplo) pelo próprio id, e "misterio" para as regiões do mistério. Quem está sumido (staff)
 * não conversa com ninguém (livre = false, sem zona).
 * @param {import("@minecraft/server").Player} p
 * @returns {{ livre: boolean, zona: string }}
 */
export function situacaoDe(p) {
  try {
    if (p.hasTag(TAG_SUMIDO)) return { livre: false, zona: "" };
    const dim = p.dimension.id;
    if (dim.startsWith("vulpus:")) return { livre: false, zona: dim };
    if (emMinigame(p)) return { livre: false, zona: DIM_MINIGAMES };
    const { x, y, z } = p.location;
    if (pontoEmZona({ x, y, z, d: dim })) return { livre: false, zona: "misterio" };
    return { livre: true, zona: "" };
  } catch {
    return { livre: false, zona: "" };
  }
}

/** @param {import("@minecraft/server").Player} p */
function ponto(p) {
  const { x, y, z } = p.location;
  const { livre, zona } = situacaoDe(p);
  return { id: p.id, nome: p.name, d: p.dimension.id, x: Math.round(x), y: Math.round(y), z: Math.round(z), livre, zona };
}

/**
 * Houve mudança que o bot precisa saber? (alguém entrou ou saiu da lista, trocou de dimensão ou de "livre", ou andou mais que PASSO)
 * @param {ReturnType<typeof ponto>[]} atual
 */
export function mudou(atual, antes = ultimo) {
  if (atual.length !== antes.size) return true;
  for (const a of atual) {
    const b = antes.get(a.id);
    if (!b || b.d !== a.d || b.livre !== a.livre || b.zona !== a.zona) return true;
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
