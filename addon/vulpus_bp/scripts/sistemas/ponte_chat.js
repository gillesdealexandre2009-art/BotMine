// @ts-check
// Ponte do chat com o Discord (canal 💬・chat-bridge): o que se fala, quem entra e quem sai vão para o canal; o que se escreve
// no canal aparece aqui. Só age com o pack da ponte presente (servidor dedicado) e com "ponteChatLigada".
// Mensagens não são guardadas em disco: se o bot estiver fora do ar, elas esperam na memória (no máximo MAX_FILA) e vão depois.
import { ScriptEventSource, system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { aoEvento } from "../core/eventos.js";
import { chamar, ponteViva } from "../core/ponte_cliente.js";
import { travados } from "../core/ponte_estado.js";
import { porId } from "../core/jogadores.js";
import { registrarErro } from "../core/util.js";
import * as textos from "../textos/vinculo.js";

/** @typedef {{ t: string, [campo: string]: any }} EventoChat  evento para o Discord (os campos de cada tipo estão em cogs_minecraft/ponte.py, validar_evento) */

const TIPOS = new Set(["msg", "entrada", "saida", "morte", "streak", "streak_fim", "nivel", "conquista", "cla_criado", "cla_extinto", "guerra_inicio", "guerra_fim", "hollow_conclusao"]);

const INTERVALO_TICKS = 40;
const MAX_FILA = 150;
const POR_ENVIO = 20;
const ESPERA_MAXIMA_TICKS = 20 * 60;
const MAX_TEXTO = 240;

/** @type {EventoChat[]} */
let fila = [];
let enviando = false;
let cursor = -1;
let falhas = 0;
let proximoTick = 0;
let avisouFalha = false;
/** Mensagens do chat vistas há pouco (pessoa|texto -> tick): o pack do chat e o da ponte podem repassar a mesma. @type {Map<string, number>} */
const vistas = new Map();
let registradas = 0;

const ligada = () => config().ponteChatLigada === true && ponteViva();

/** Tira códigos de cor e quebras de linha de um texto de fora (nada de colorir o chat dos outros). @param {string} t */
const limpar = (t) => t.replace(/§./g, "").replace(/[\r\n]+/g, " ").trim().slice(0, MAX_TEXTO);

/**
 * Põe um evento na fila do Discord.
 * @param {"msg" | "entrada" | "saida"} tipo
 * @param {string} nome
 * @param {string} [texto]
 */
export function anunciar(tipo, nome, texto) {
  anunciarEvento({ t: tipo, nome, texto });
}

/** @param {EventoChat} ev */
function anunciarEvento(ev) {
  if (!config().ponteChatLigada || !TIPOS.has(ev.t)) return;
  if (fila.length >= MAX_FILA) fila.shift();
  fila.push(ev);
}

// tudo que o resto do addon emite (clãs, guerras, conquistas...) segue para o Discord
aoEvento((tipo, dados) => anunciarEvento({ ...dados, t: tipo }));

// O chat (evento beta) é visto pelo pack da ponte, que repassa cada mensagem por script event; quem está com a tela preta não chega aqui.
system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "vulpus:ponte_chat" || ev.sourceType !== ScriptEventSource.Server) return;
  try {
    const m = JSON.parse(ev.message);
    const jogador = typeof m?.i === "string" ? porId(m.i) : undefined;
    if (!jogador || travados.has(jogador.id)) return;
    const texto = limpar(String(m.t ?? ""));
    if (!texto) return;
    const chave = `${jogador.id}|${texto}`;
    const agora = system.currentTick;
    if (agora - (vistas.get(chave) ?? -1000) < 40) return;
    vistas.set(chave, agora);
    if (vistas.size > 200) for (const [k, t] of vistas) if (agora - t > 100) vistas.delete(k);
    if (registradas < 5) {
      registradas++;
      console.warn(`[Vulpus] Ponte do chat: mensagem de ${jogador.name} (${registradas}/5 no log)`);
    }
    anunciar("msg", jogador.name, texto);
  } catch (e) {
    registrarErro("Ponte do chat (mensagem)", e);
  }
});

async function enviar() {
  if (enviando || fila.length === 0 || !ligada()) return;
  enviando = true;
  const lote = fila.splice(0, POR_ENVIO);
  try {
    const r = await chamar("POST", "/mc/eventos", { eventos: lote });
    if (r.status >= 200 && r.status < 300) {
      falhas = 0;
      return;
    }
    // 4xx = o bot recusou o lote (não adianta repetir); o resto (sem rede, 5xx, 503 sem canal) volta para a fila
    if (r.status >= 400 && r.status < 500) return;
    fila = [...lote, ...fila].slice(-MAX_FILA);
    falhar(r.erro ?? `status ${r.status}`);
  } catch (e) {
    registrarErro("Ponte do chat (envio)", e);
  } finally {
    enviando = false;
  }
}

/** @param {string} motivo */
function falhar(motivo) {
  falhas++;
  proximoTick = system.currentTick + Math.min(ESPERA_MAXIMA_TICKS, INTERVALO_TICKS * 2 ** Math.min(falhas, 5));
  if (!avisouFalha) {
    avisouFalha = true;
    console.warn(`[Vulpus] Ponte do chat sem resposta do bot (${motivo}); tentando de novo com espera crescente.`);
  }
}

let buscando = false;
async function buscar() {
  if (buscando || !ligada()) return;
  buscando = true;
  try {
    const r = await chamar("GET", `/mc/chat?desde=${cursor}`);
    if (r.status !== 200 || !r.corpo?.ok) {
      if (r.status !== 403 && r.status !== 401) falhar(r.erro ?? `status ${r.status}`);
      return;
    }
    falhas = 0;
    avisouFalha = false;
    const ultimo = Number(r.corpo.ultimo);
    if (Number.isFinite(ultimo)) cursor = ultimo;
    for (const m of Array.isArray(r.corpo.mensagens) ? r.corpo.mensagens : []) {
      const nome = limpar(String(m?.nome ?? "")).slice(0, 32);
      const texto = limpar(String(m?.texto ?? ""));
      if (nome && texto) world.sendMessage(textos.LINHA_DISCORD(nome, texto));
    }
  } catch (e) {
    registrarErro("Ponte do chat (busca)", e);
  } finally {
    buscando = false;
  }
}

system.runInterval(() => {
  if (system.currentTick < proximoTick) return;
  void enviar();
  void buscar();
}, INTERVALO_TICKS);
