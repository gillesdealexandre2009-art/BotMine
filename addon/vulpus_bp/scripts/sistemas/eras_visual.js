// @ts-check
// Visual das Eras (VisualController): neblina própria, partículas, sons e fade de transição, só para quem está jogando.
// - A neblina é empurrada por jogador com o id "vulpus_era" (um só id: remove antes de pôr, então nunca acumula, nem depois de
//   /reload ou de reconexão). Ambientes especiais vencem a Era: fora do Mundo normal, no Intervalo, nas regiões do ARG
//   e nos minigames a neblina da Era sai (para o ambiente usar a dele) e volta quando a pessoa sai de lá.
// - Prévia: um jogador pode ver outra Era só para si por 10 minutos, sem mexer em calendário nem histórico.
// - Nada aqui mexe em blocos, entidades, inventário ou terreno.
import { Player, system, world } from "@minecraft/server";
import { pontoEmZona } from "../core/arg_zona.js";
import { online } from "../core/jogadores.js";
import * as efeitos from "../core/efeitos.js";
import { msg, registrarErro, som } from "../core/util.js";
import { ANUNCIO_ERA, ENTRADA_ERA, PREVIA_FIM } from "../textos/eras.js";
import { situacao } from "./eras_calendario.js";
import { eraDe, TOTAL_ERAS } from "./eras_catalogo.js";
import { eventoAtivo } from "./eras_eventos.js";
import { emMinigame } from "./mg_estado.js";
import { estaSumido } from "./sumico.js";

/** @typedef {import("./eras_catalogo.js").Perfil} Perfil */

export const ID_NEVOA = "vulpus_era";
/** Neblina do acontecimento (fica por cima da da Era enquanto ele dura). */
export const ID_NEVOA_EVENTO = "vulpus_era_ev";
const OVERWORLD = "minecraft:overworld";
const PASSO_RECONCILIAR = 40;
const PASSO_AMBIENTE = 20;
const PREVIA_MS = 10 * 60 * 1000;

/** @type {Map<string, number>} id → número da Era cuja neblina está no jogador agora */
const aplicada = new Map();
/** @type {Map<string, { numero: number, ate: number }>} prévias em andamento */
const previas = new Map();
/** @type {Map<string, string>} id → id do acontecimento cuja neblina está no jogador agora ("" = nenhuma) */
const eventoAplicado = new Map();
/** @type {Map<string, number>} id → tick do próximo som ambiente */
const proximoSom = new Map();
/** @type {Map<string, number>} id → tick do próximo som do acontecimento */
const proximoSomEvento = new Map();
/** @type {Set<string>} quem já recebeu a apresentação da Era nesta sessão ("id:era") */
const apresentados = new Set();
/** @type {Set<string>} erros já registrados (uma vez por jogador e tipo) */
const jaAvisou = new Set();

/**
 * @param {string} chave
 * @param {string} contexto
 * @param {unknown} e
 */
function avisarUmaVez(chave, contexto, e) {
  if (jaAvisou.has(chave)) return;
  jaAvisou.add(chave);
  registrarErro(contexto, e);
}

/** Está num ambiente que tem a própria neblina (ou nenhuma) e por isso não recebe a da Era? @param {Player} p */
export function emAmbienteEspecial(p) {
  try {
    if (p.dimension.id !== OVERWORLD) return true;
    const { x, y, z } = p.location;
    if (pontoEmZona({ x, y, z, d: p.dimension.id })) return true;
    return emMinigame(p);
  } catch {
    return false;
  }
}

/** Número da Era oficial agora (0 = não há). */
export function numeroOficial() {
  return situacao().numero;
}

/** Número da Era que esta pessoa vê agora: a prévia dela, ou a oficial. @param {Player} p */
export function numeroVisto(p) {
  const previa = previas.get(p.id);
  if (previa && previa.ate > Date.now()) return previa.numero;
  return numeroOficial();
}

/** Quem está vendo prévia agora. @param {Player} p */
export const temPrevia = (p) => {
  const previa = previas.get(p.id);
  return !!previa && previa.ate > Date.now();
};

/** @param {Player} p @param {number} vezes */
function tirarNevoa(p, vezes) {
  for (let i = 0; i < vezes; i++) {
    try {
      const r = p.runCommand(`fog @s remove "${ID_NEVOA}"`);
      if (r && r.successCount === 0) break;
    } catch {
      break; // nada para tirar
    }
  }
}

/** @param {Player} p @param {number} vezes */
function tirarNevoaEvento(p, vezes) {
  for (let i = 0; i < vezes; i++) {
    try {
      const r = p.runCommand(`fog @s remove "${ID_NEVOA_EVENTO}"`);
      if (r && r.successCount === 0) break;
    } catch {
      break;
    }
  }
}

/** O acontecimento que está valendo para a Era oficial agora (visual: vale mesmo com as mecânicas desligadas). */
export function eventoVisual() {
  const s = situacao();
  if (s.fase !== "ativa") return undefined;
  const e = eventoAtivo(s.numero);
  return e ? { ...e, numero: s.numero } : undefined;
}

/**
 * Põe ou tira a neblina do acontecimento por cima da Era. Só vale na Era oficial (a prévia não mostra acontecimento) e fora de ambiente especial.
 * @param {Player} p
 * @param {number} quer  Era que a pessoa está vendo (0 = nenhuma)
 */
function aplicarEvento(p, quer) {
  const ev = quer > 0 ? eventoVisual() : undefined;
  const desejado = ev && ev.numero === quer ? `${eraDe(quer).id}_ev` : "";
  const atual = eventoAplicado.get(p.id) ?? "";
  if (desejado === atual) return;
  if (atual) tirarNevoaEvento(p, 1);
  eventoAplicado.delete(p.id);
  if (!desejado) {
    eventoAplicado.set(p.id, "");
    return;
  }
  try {
    p.runCommand(`fog @s push vulpus:${desejado} "${ID_NEVOA_EVENTO}"`);
  } catch (e) {
    avisarUmaVez(`fogev:${p.id}`, `Eras: neblina do acontecimento ${desejado}`, e);
    return;
  }
  eventoAplicado.set(p.id, desejado);
}

/**
 * Fade de tela da Era (transição ao entrar).
 * @param {Player} p
 * @param {Perfil} era
 */
function transicao(p, era) {
  if (!(era.transicao.seg > 0)) return;
  try {
    p.camera.fade({ fadeColor: era.transicao.cor, fadeTime: { fadeInTime: 0.4, holdTime: 0.25, fadeOutTime: era.transicao.seg } });
  } catch (e) {
    avisarUmaVez(`fade:${p.id}`, "Eras: fade de transição", e);
  }
}

/**
 * Põe a pessoa na Era certa (a oficial ou a prévia), tirando a anterior. Seguro de repetir: se já está certa, não faz nada.
 * @param {Player} p
 * @param {{ comTransicao?: boolean, apresentar?: boolean }} [opcoes]
 */
export function aplicar(p, opcoes = {}) {
  if (!p.isValid) return;
  const quer = emAmbienteEspecial(p) ? 0 : numeroVisto(p);
  const tem = aplicada.get(p.id);
  if (tem === quer) {
    aplicarEvento(p, quer);
    return;
  }
  if (tem === undefined) {
    tirarNevoa(p, 4); // primeira vez nesta sessão: limpa sobra de reconexão ou /reload
    tirarNevoaEvento(p, 2);
  } else if (tem > 0) tirarNevoa(p, 1);
  if (tem !== undefined) {
    tirarNevoaEvento(p, 1);
    eventoAplicado.delete(p.id);
  }
  aplicada.delete(p.id);
  if (quer === 0) {
    aplicada.set(p.id, 0);
    eventoAplicado.set(p.id, "");
    return;
  }
  const era = eraDe(quer);
  try {
    p.runCommand(`fog @s push vulpus:${era.id} "${ID_NEVOA}"`);
  } catch (e) {
    avisarUmaVez(`fog:${p.id}`, `Eras: neblina ${era.id}`, e);
    return; // tenta de novo na próxima conferência
  }
  aplicada.set(p.id, quer);
  proximoSom.delete(p.id);
  aplicarEvento(p, quer);
  if (opcoes.comTransicao && (tem ?? 0) !== quer) transicao(p, era);
  if (opcoes.apresentar) apresentar(p, era);
}

/** Marca que a pessoa já viu o anúncio desta Era (o anúncio da troca já mostrou), para a apresentação não repetir. @param {Player} p @param {Perfil} era */
export function marcarApresentada(p, era) {
  apresentados.add(`${p.id}:${era.id}`);
}

/** A pessoa já viu o anúncio desta Era nesta sessão? @param {Player} p @param {Perfil} era */
export const jaApresentada = (p, era) => apresentados.has(`${p.id}:${era.id}`);

/** Mostra o nome da Era uma vez por sessão. @param {Player} p @param {Perfil} era */
function apresentar(p, era) {
  const chave = `${p.id}:${era.id}`;
  if (apresentados.has(chave)) return;
  apresentados.add(chave);
  try {
    p.onScreenDisplay.setActionBar(ENTRADA_ERA(era));
    for (const l of ANUNCIO_ERA(era)) msg(p, l);
  } catch (e) {
    avisarUmaVez(`apresentar:${p.id}`, "Eras: apresentação", e);
  }
}

/** Reconcilia todo mundo que está online. @param {{ comTransicao?: boolean }} [opcoes] */
export function atualizarTodos(opcoes = {}) {
  for (const p of online()) aplicar(p, opcoes);
}

/**
 * Prévia só para esta pessoa.
 * @param {Player} p
 * @param {number} numero  1 a 20
 */
export function definirPrevia(p, numero) {
  if (!Number.isInteger(numero) || numero < 1 || numero > TOTAL_ERAS) return false;
  previas.set(p.id, { numero, ate: Date.now() + PREVIA_MS });
  aplicar(p, { comTransicao: true });
  return true;
}

/** Tira a prévia e volta à Era oficial. @param {Player} p @returns {boolean} se havia prévia */
export function limparPrevia(p) {
  const havia = temPrevia(p);
  previas.delete(p.id);
  aplicar(p, { comTransicao: true });
  return havia;
}

/** Tira a neblina da Era (e a do acontecimento) de todo mundo e esquece o que estava aplicado. */
export function limparTodos() {
  for (const p of online()) {
    if (aplicada.get(p.id)) tirarNevoa(p, 1);
    if (eventoAplicado.get(p.id)) tirarNevoaEvento(p, 1);
  }
  aplicada.clear();
  eventoAplicado.clear();
}

// ------------------------------------------------------------------ ambiente (partículas, sons e piscadas)

/** @param {number} a @param {number} b */
const entre = (a, b) => a + Math.random() * (b - a);

/** @param {Player} p @param {Perfil} era */
function particulasEra(p, era) {
  const { x, y, z } = p.location;
  const dim = p.dimension;
  for (const esp of era.particulas) {
    for (let i = 0; i < esp.n; i++) {
      if (Math.random() > esp.chance) continue;
      const ang = Math.random() * Math.PI * 2;
      const dist = esp.aoLonge ? entre(10, esp.raio) : Math.sqrt(Math.random()) * esp.raio;
      const pos = { x: x + Math.cos(ang) * dist, y: y + entre(esp.alturaMin, esp.alturaMax), z: z + Math.sin(ang) * dist };
      if (!efeitos.emitir(dim, esp.id, pos, esp.cor)) return;
    }
  }
}

/** @param {Player} p @param {Perfil} era */
function sonsAmbiente(p, era) {
  if (era.sons.length === 0) return;
  const agora = system.currentTick;
  const quando = proximoSom.get(p.id);
  if (quando === undefined) {
    proximoSom.set(p.id, agora + Math.floor(entre(era.intervaloSom[0], era.intervaloSom[1]) * 20 * Math.random() + 100));
    return;
  }
  if (agora < quando) return;
  const s = era.sons[Math.floor(Math.random() * era.sons.length)];
  som(p, s.id, { volume: s.volume, pitch: s.pitch });
  proximoSom.set(p.id, agora + Math.floor(entre(era.intervaloSom[0], era.intervaloSom[1]) * 20));
}

/** @param {Player} p @param {import("./eras_eventos.js").Evento} ev */
function ambienteDoEvento(p, ev) {
  const { x, y, z } = p.location;
  for (const esp of ev.particulas) {
    for (let i = 0; i < esp.n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = esp.aoLonge ? entre(10, esp.raio) : Math.sqrt(Math.random()) * esp.raio;
      const pos = { x: x + Math.cos(ang) * dist, y: y + entre(esp.alturaMin, esp.alturaMax), z: z + Math.sin(ang) * dist };
      if (!efeitos.emitir(p.dimension, esp.id, pos, esp.cor)) break;
    }
  }
  if (ev.som) {
    const agora = system.currentTick;
    const quando = proximoSomEvento.get(p.id) ?? 0;
    if (agora >= quando) {
      som(p, ev.som.id, { volume: ev.som.volume, pitch: ev.som.pitch });
      proximoSomEvento.set(p.id, agora + Math.floor(entre(8, 16) * 20));
    }
  }
  if (ev.flash && Math.random() <= ev.flash.chance) {
    try {
      p.camera.fade({ fadeColor: ev.flash.cor, fadeTime: { fadeInTime: 0.03, holdTime: 0.04, fadeOutTime: 0.12 } });
    } catch (e) {
      avisarUmaVez(`flashev:${p.id}`, "Eras: piscada do acontecimento", e);
    }
  }
}

/** @param {Player} p @param {Perfil} era */
function piscada(p, era) {
  if (!era.flash || Math.random() > era.flash.chance) return;
  try {
    p.camera.fade({ fadeColor: era.flash.cor, fadeTime: { fadeInTime: 0.03, holdTime: 0.04, fadeOutTime: 0.12 } });
  } catch (e) {
    avisarUmaVez(`flash:${p.id}`, "Eras: piscada de tela", e);
  }
}

function ambiente() {
  for (const p of online()) {
    try {
      if (aplicada.get(p.id) !== numeroVistoAplicado(p)) continue;
      const n = aplicada.get(p.id) ?? 0;
      if (n === 0 || estaSumido(p)) continue;
      const era = eraDe(n);
      particulasEra(p, era);
      sonsAmbiente(p, era);
      piscada(p, era);
      const ev = eventoVisual();
      if (ev && ev.numero === n) ambienteDoEvento(p, ev.evento);
    } catch (e) {
      avisarUmaVez(`ambiente:${p.id}`, "Eras: ambiente", e);
    }
  }
}

/** A Era que deveria estar aplicada agora (0 em ambiente especial). @param {Player} p */
const numeroVistoAplicado = (p) => (emAmbienteEspecial(p) ? 0 : numeroVisto(p));

function reconciliar() {
  const agora = Date.now();
  for (const [id, previa] of [...previas]) {
    if (previa.ate > agora) continue;
    previas.delete(id);
    const p = online().find((j) => j.id === id);
    if (p) msg(p, PREVIA_FIM);
  }
  for (const p of online()) {
    try {
      aplicar(p, { comTransicao: true });
    } catch (e) {
      avisarUmaVez(`reconciliar:${p.id}`, "Eras: reconciliar", e);
    }
  }
}

system.runInterval(reconciliar, PASSO_RECONCILIAR);
system.runInterval(ambiente, PASSO_AMBIENTE);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  // espera a pessoa assentar no mundo antes de empurrar a neblina
  system.runTimeout(() => aplicar(player, { apresentar: true }), 40);
});
world.afterEvents.playerDimensionChange.subscribe(({ player }) => {
  system.runTimeout(() => aplicar(player), 10);
});
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  aplicada.delete(playerId);
  previas.delete(playerId);
  proximoSom.delete(playerId);
  proximoSomEvento.delete(playerId);
  eventoAplicado.delete(playerId);
  for (const k of [...apresentados]) if (k.startsWith(`${playerId}:`)) apresentados.delete(k);
  for (const k of [...jaAvisou]) if (k.endsWith(`:${playerId}`)) jaAvisou.delete(k);
});
