// @ts-check
// O telefone do campo de trigo (primeiro contato do mistério): toca para quem chega ao campo, atende ao clicar, a tela escurece, o
// toque some aos poucos e a voz fala as quatro frases do projeto. No fim aparece a "casa corrompida" no menu de casas, que leva ao
// Intervalo. O dono marca o bloco do telefone no painel do mistério (ele costuma ficar junto do prop de telefone).
import { system, world } from "@minecraft/server";
import { dadosJogador, editarJogador, lerMundo, salvarMundo } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { online } from "../core/jogadores.js";
import { erro, formatarCoords, ok, registrarErro } from "../core/util.js";
import * as textos from "../textos/arg.js";
import { capituloAtual } from "./arg.js";
import { pontoChegada } from "./intervalo.js";
import * as sustos from "./pegadinhas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */

const CHAVE = "vulpus:arg_tel";
/** Quem já ouviu a ligação inteira. */
export const TAG_LIGACAO = "vulpus_arg_ligou";
const CAMPO = 7;
/** Alcance do toque (blocos). */
const ALCANCE = 18;
/** Pausa entre dois toques (ticks). */
const CICLO_TOQUE = 70;

/** @type {Ponto | undefined | null} */
let ponto = null;
/** @type {Set<string>} quem está no meio da ligação */
const atendendo = new Set();
/** @type {Map<string, number>} id → tick do último toque */
const ultimoToque = new Map();

/** @returns {Ponto | undefined} */
export function telefoneMarcado() {
  if (ponto !== null) return ponto;
  const p = lerMundo(CHAVE);
  ponto = p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n)) ? { x: p.x, y: p.y, z: p.z, d: p.d } : undefined;
  return ponto;
}

/** O dono marca o bloco do telefone (o que ele está olhando). @param {Player} p */
export function marcarTelefone(p) {
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = p.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) return void erro(p, textos.OLHE_PARA_BLOCO);
  ponto = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  salvarMundo(CHAVE, ponto);
  ok(p, textos.TELEFONE_MARCADO(formatarCoords(b)));
}

/** Tira a ligação e a casa corrompida de alguém (teste do dono e "zerar progresso"). @param {Player} p */
export function zerarLigacao(p) {
  try {
    p.removeTag(TAG_LIGACAO);
  } catch {
    // sem a tag
  }
  atendendo.delete(p.id);
  editarJogador(p, (d) => {
    d.casas = d.casas.filter((c) => c.nome !== textos.CASA_CORROMPIDA);
  });
}

/** @param {Player} p @param {string} texto */
function falar(p, texto) {
  try {
    p.sendMessage(texto);
  } catch (e) {
    registrarErro("ARG: telefone", e);
  }
}

/** Pinga o toque do telefone (dois sinos curtos) para quem está perto e ainda não atendeu. */
function tocar() {
  const t = telefoneMarcado();
  if (!t) return;
  const agora = system.currentTick;
  for (const p of online()) {
    if (atendendo.has(p.id) || p.hasTag(TAG_LIGACAO) || p.dimension.id !== t.d) continue;
    if (capituloAtual(p) !== CAMPO) continue;
    const dist = Math.hypot(p.location.x - t.x, p.location.z - t.z);
    if (dist > ALCANCE || agora - (ultimoToque.get(p.id) ?? -999) < CICLO_TOQUE) continue;
    ultimoToque.set(p.id, agora);
    const pos = { x: t.x + 0.5, y: t.y + 0.5, z: t.z + 0.5 };
    try {
      p.playSound("note.bell", { location: pos, volume: 2, pitch: 1.6 });
      system.runTimeout(() => {
        if (p.isValid) p.playSound("note.bell", { location: pos, volume: 2, pitch: 1.35 });
      }, 5);
    } catch (e) {
      registrarErro("ARG: toque", e);
    }
  }
}
system.runInterval(tocar, 20);

/** Coloca a casa corrompida no menu de casas de quem ouviu a ligação (só uma). @param {Player} p */
export function criarCasaCorrompida(p) {
  if (dadosJogador(p).casas.some((c) => c.nome === textos.CASA_CORROMPIDA)) return;
  const destino = pontoChegada() ?? telefoneMarcado() ?? { x: p.location.x, y: p.location.y, z: p.location.z, d: p.dimension.id };
  editarJogador(p, (d) => {
    d.casas.push({ nome: textos.CASA_CORROMPIDA, x: destino.x, y: destino.y, z: destino.z, d: destino.d });
  });
}

/**
 * A ligação inteira: tela preta, toque que se afasta, quatro frases e o aviso do menu de casas.
 * @param {Player} p
 */
function ligacao(p) {
  if (atendendo.has(p.id)) return;
  atendendo.add(p.id);
  const id = p.id;
  sustos.fade(p, [0, 0, 0], 0.8, (textos.LIGACAO_FIM - 40) / 20 - 1, 1.5);
  // o toque se afasta, como uma ligação atravessando uma distância enorme
  [1, 0.6, 0.35, 0.18, 0.08].forEach((v, k) => sustos.agendar(p, k * 24, () => sustos.tocarNela(p, "note.bell", v, 1.4 - k * 0.1)));
  // a voz gravada (com o chiado de linha já dentro do arquivo)
  sustos.agendar(p, textos.LIGACAO_AUDIO_INICIO, () => sustos.tocarNela(p, textos.SOM_LIGACAO, 1, 1));
  for (const [t, fala] of textos.LIGACAO) sustos.agendar(p, t, () => falar(p, fala));
  sustos.agendar(p, textos.LIGACAO_FIM, () => {
    falar(p, textos.LIGACAO_AVISO);
    sustos.tocarNela(p, "random.orb", 0.5, 0.5);
    try {
      p.addTag(TAG_LIGACAO);
    } catch {
      // sem a tag
    }
    criarCasaCorrompida(p);
    atendendo.delete(id);
  });
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const t = telefoneMarcado();
    if (!t || !ev.isFirstEvent) return;
    const b = ev.block;
    if (b.dimension.id !== t.d || b.location.x !== t.x || b.location.y !== t.y || b.location.z !== t.z) return;
    if (ehDono(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => {
      if (capituloAtual(player) !== CAMPO && !ehDono(player)) return void falar(player, textos.TELEFONE_SO_NO_CAMPO);
      if (player.hasTag(TAG_LIGACAO)) return void falar(player, textos.TELEFONE_MUDO);
      ligacao(player);
    });
  } catch (e) {
    registrarErro("ARG: interação do telefone", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  atendendo.delete(playerId);
  ultimoToque.delete(playerId);
});


