// @ts-check
// Evento de inauguração: 20 Espíritos da Raposa (fogos-fátuos azuis animados) escondidos pelo mapa (5 por parte). Quem clica em todas ganha a cor de nome
// "Céu da inauguração" (do branco ao azul, para sempre, sem precisar de Kitsune) e a conquista "Chegou cedo hein!".
// A staff esconde e remove pelo painel da Feira (feira_staff.js).
import { Player, system, world } from "@minecraft/server";
import { config, dadosJogador, editarJogador, lerMundo, salvarMundo, todosJogadores } from "../core/db.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, formatarCoords, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/inauguracao.js";
import { darConquista } from "./conquistas.js";
import { desbloquearCor } from "./kitsune.js";
import { achadas, esquecerBusca } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */

const CHAVE = "vulpus:inauguracao";
const ENTIDADE = "vulpus:espirito";
const TAG = "vulpus_inaug_";
const TEMA = "inauguracao";
const CONQUISTA = "cheguedo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;

/** @type {Record<string, Ponto> | undefined} */
let itens;

/** @returns {Record<string, Ponto>} */
function lerItens() {
  if (itens) return itens;
  /** @type {Record<string, Ponto>} */
  const saida = {};
  const s = lerMundo(CHAVE)?.itens;
  if (s && typeof s === "object") {
    for (const [k, v] of Object.entries(s)) {
      const n = Number(k);
      const p = /** @type {any} */ (v);
      if (Number.isInteger(n) && n >= 0 && n < textos.TOTAL && p && typeof p.d === "string" && [p.x, p.y, p.z].every((c) => Number.isFinite(c))) saida[k] = { x: p.x, y: p.y, z: p.z, d: p.d };
    }
  }
  itens = saida;
  return itens;
}

function gravar() {
  salvarMundo(CHAVE, { itens: lerItens() });
}

/** @returns {Entity[]} */
function acharEntidades() {
  return achadas("inauguracao:espiritos", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) {
      for (const e of world.getDimension(d).getEntities({ type: ENTIDADE })) if (e.getTags().some((t) => t.startsWith(TAG))) achados.push(e);
    }
    return achados;
  });
}

/** @param {Entity} e @returns {number} -1 se não for uma raposinha do evento */
function slotDe(e) {
  const t = e.getTags().find((x) => x.startsWith(TAG));
  const n = t ? Number(t.slice(TAG.length)) : NaN;
  return Number.isInteger(n) ? n : -1;
}

/** Garante uma raposinha por ponto marcado (e nenhuma se o evento está desligado). */
function manter() {
  try {
    const ligado = config().inauguracaoLigada;
    /** @type {Set<number>} */
    const presentes = new Set();
    for (const e of acharEntidades()) {
      const s = slotDe(e);
      const ponto = lerItens()[String(s)];
      if (!ligado || !ponto || presentes.has(s)) {
        e.remove();
        continue;
      }
      presentes.add(s);
      if (e.dimension.id !== ponto.d || Math.hypot(e.location.x - ponto.x, e.location.y - ponto.y, e.location.z - ponto.z) > 0.05) e.teleport(ponto, { dimension: world.getDimension(ponto.d) });
    }
    if (!ligado) return;
    for (const [k, p] of Object.entries(lerItens())) {
      const s = Number(k);
      if (presentes.has(s)) continue;
      const dim = world.getDimension(p.d);
      if (!dim.isChunkLoaded(p)) continue;
      const e = dim.spawnEntity(ENTIDADE, p);
      e.addTag(TAG + s);
      esquecerBusca("inauguracao:espiritos");
    }
  } catch (e) {
    registrarErro("Inauguração: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** @param {Player} player @param {number} slot */
function achou(player, slot) {
  const d = dadosJogador(player);
  if (d.inauguracao.includes(slot)) {
    msg(player, textos.JA_ACHOU(d.inauguracao.length, textos.TOTAL));
    som(player, "note.bass");
    return;
  }
  editarJogador(player, (x) => {
    x.inauguracao.push(slot);
  });
  const n = dadosJogador(player).inauguracao.length;
  som(player, "random.orb");
  msg(player, textos.ACHOU(n, textos.TOTAL));
  player.onScreenDisplay.setActionBar(textos.BARRA_ACHOU(n, textos.TOTAL));
  if (n >= textos.TOTAL) concluir(player);
}

/** @param {Player} player */
function concluir(player) {
  // sem tema em uso: já deixa o novo; o desbloqueio vem depois para os ouvintes do visual verem os dois
  if (dadosJogador(player).temaNome === "") {
    editarJogador(player, (d) => {
      d.temaNome = TEMA;
    });
  }
  desbloquearCor(player, TEMA);
  darConquista(player, CONQUISTA);
  mostrarTitulo(player, textos.TITULO_FIM, { subtitulo: textos.SUB_FIM, entrada: 5, fica: 80, saida: 20 });
  som(player, "random.levelup");
  msg(player, textos.MSG_FIM);
  for (const p of world.getAllPlayers()) if (p.id !== player.id) msg(p, textos.ANUNCIO_FIM(player.name));
}

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE) return;
    const slot = slotDe(ev.target);
    if (slot < 0) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => {
      try {
        if (!config().inauguracaoLigada) msg(player, textos.FECHADO);
        else achou(player, slot);
      } catch (e) {
        registrarErro("Inauguração: achou", e);
      }
    });
  } catch (e) {
    registrarErro("Inauguração: interação", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
export function estadoInauguracao() {
  const jogadores = todosJogadores();
  return {
    marcadas: Object.keys(lerItens()).length,
    completaram: jogadores.filter((j) => j.dados.coresExtras.includes(TEMA)).length,
    achando: jogadores.filter((j) => j.dados.inauguracao.length > 0 && !j.dados.coresExtras.includes(TEMA)).length,
  };
}

/** Quantas já estão escondidas em cada parte. */
export const usadasPorParte = () =>
  Array.from({ length: textos.PARTES }, (_, parte) => {
    let n = 0;
    for (let s = parte * textos.POR_PARTE; s < (parte + 1) * textos.POR_PARTE; s++) if (lerItens()[String(s)]) n++;
    return n;
  });

/** Lista dos pontos marcados, em ordem. @returns {{ slot: number, ponto: Ponto, onde: string }[]} */
export const listarItens = () =>
  Object.entries(lerItens())
    .map(([k, p]) => ({ slot: Number(k), ponto: p, onde: formatarCoords(p) }))
    .sort((a, b) => a.slot - b.slot);

/** @param {Player} player @param {number} parte */
export function esconder(player, parte) {
  const livre = Array.from({ length: textos.POR_PARTE }, (_, i) => parte * textos.POR_PARTE + i).find((s) => !lerItens()[String(s)]);
  if (livre === undefined) {
    erro(player, textos.PARTE_CHEIA);
    return;
  }
  const l = player.location;
  const p = { x: Math.round(l.x * 2) / 2, y: Math.round(l.y * 2) / 2, z: Math.round(l.z * 2) / 2, d: player.dimension.id };
  lerItens()[String(livre)] = p;
  gravar();
  manter();
  ok(player, textos.MARCADA(livre, formatarCoords(p)));
}

/** @param {Player} player @param {number} slot */
export function removerItem(player, slot) {
  delete lerItens()[String(slot)];
  gravar();
  manter();
  ok(player, textos.REMOVIDA(slot));
}

/** @param {Player} player */
export function removerTodos(player) {
  itens = {};
  gravar();
  manter();
  ok(player, textos.REMOVIDAS_TODAS);
}

/** @param {Player} player */
export function zerarProgresso(player) {
  for (const j of todosJogadores()) {
    if (j.dados.inauguracao.length > 0) {
      editarJogador(j.id, (d) => {
        d.inauguracao = [];
      });
    }
  }
  ok(player, textos.ZERADO);
}

/** @param {Player} player @param {number} slot */
export function irAte(player, slot) {
  const p = lerItens()[String(slot)];
  if (!p) return;
  player.teleport({ x: p.x, y: p.y + 1, z: p.z }, { dimension: world.getDimension(p.d) });
}
