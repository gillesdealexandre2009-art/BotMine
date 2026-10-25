// @ts-check
// Modo do chat de cada jogador: global (todos), local (só quem está perto) ou time (só o clã). O modo vive numa tag de
// entidade (vulpus:chat:local / vulpus:chat:time; sem tag = global) que o pack "Vulpus Chat" lê ao distribuir a mensagem.
// O raio do chat local vai pelo canal (vulpus_canal, "#chat_raio", escrito em identidade.js; 0 = desligado).
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { erro, ok } from "../core/util.js";
import * as textos from "../textos/chat_modo.js";
import { tagDe } from "./cla_dados.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {"global" | "local" | "time"} ModoChat */

/** Os modos na ordem do menu. @type {readonly ModoChat[]} */
export const MODOS = Object.freeze(["global", "local", "time"]);
/** Igual a TAG_MODO em vulpus_chat_bp/scripts/canal.js. */
const TAG_MODO = "vulpus:chat:";

/**
 * Modo atual (sem tag = global).
 * @param {Player} player
 * @returns {ModoChat}
 */
export function modoChat(player) {
  const tag = player.getTags().find((t) => t.startsWith(TAG_MODO));
  const nome = tag ? tag.slice(TAG_MODO.length) : "global";
  return nome === "local" || nome === "time" ? nome : "global";
}

/**
 * Troca o modo e avisa. Time pede um clã.
 * @param {Player} player
 * @param {ModoChat} modo
 * @returns {boolean} se mudou
 */
export function definirModoChat(player, modo) {
  if (modo === "time" && !tagDe(player)) {
    erro(player, textos.SEM_TIME);
    return false;
  }
  for (const tag of player.getTags()) if (tag.startsWith(TAG_MODO)) player.removeTag(tag);
  if (modo !== "global") player.addTag(TAG_MODO + modo);
  ok(player, textos.MODO_MUDOU(modo));
  if (modo === "local" && config().chatLocalRaio <= 0) erro(player, textos.LOCAL_DESLIGADO);
  return true;
}

/**
 * Menu: um botão por modo, o atual marcado.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuChat(player, voltar) {
  const atual = modoChat(player);
  const aqui = (/** @type {Player} */ p) => menuChat(p, voltar);
  const lista = new Lista(textos.TITULO).texto(textos.CORPO(atual, config().chatLocalRaio));
  for (const modo of MODOS) {
    lista.botao(textos.BOTAO_MODO(modo, modo === atual), modo === atual ? ICONES.sim : ICONES.nao, async (p) => {
      if (modo !== modoChat(p)) definirModoChat(p, modo);
      await aqui(p);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

registrarComando({ nome: "chat", descricao: textos.DESC_CHAT, parametros: [{ nome: "modo", tipo: "texto", opcional: true }] }, (p, [texto]) => {
  if (texto === undefined || String(texto).trim() === "") return menuChat(p);
  const limpo = String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  const modo = limpo === "clan" || limpo === "cla" ? "time" : limpo;
  if (modo !== "global" && modo !== "local" && modo !== "time") {
    erro(p, textos.MODO_INVALIDO);
    return;
  }
  definirModoChat(p, modo);
});
