// @ts-check
// Boas-vindas: título na primeira entrada, "que bom te ver de novo" nas outras e o item do menu
// sempre no inventário (travado, fica na morte).
import { ItemLockMode, ItemStack, system, world } from "@minecraft/server";
import { ITEM_MENU } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { dadosJogador, editarJogador } from "../core/db.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import * as textos from "../textos/boas_vindas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {"entregue" | "tinha" | "cheio"} ResultadoItem */

/** Espera o cliente terminar de carregar antes do título (no tick da entrada ele não aparece). */
const TICKS_ATE_SAUDAR = 40;
/** Título: entrada, permanência e saída, em ticks. */
const TEMPOS_TITULO = { entrada: 10, fica: 80, saida: 20 };

/**
 * Tem algum item do menu no inventário.
 * @param {import("@minecraft/server").Container} inventario
 */
function temItem(inventario) {
  for (let i = 0; i < inventario.size; i++) {
    if (inventario.getItem(i)?.typeId === ITEM_MENU) return true;
  }
  return false;
}

/**
 * Entrega o item do menu se não houver um no inventário. Avisa quando entrega ou quando falta espaço.
 * @param {Player} player
 * @returns {ResultadoItem}
 */
export function garantirItem(player) {
  const inventario = player.getComponent("minecraft:inventory")?.container;
  if (!inventario?.isValid) return "cheio";
  if (temItem(inventario)) return "tinha";
  const item = new ItemStack(ITEM_MENU, 1);
  item.lockMode = ItemLockMode.inventory;
  item.keepOnDeath = true;
  item.setLore([textos.LORE_ITEM]);
  if (inventario.addItem(item)) {
    erro(player, textos.ITEM_SEM_ESPACO);
    return "cheio";
  }
  editarJogador(player, (d) => {
    d.recebeuItem = true;
  });
  msg(player, textos.ITEM_ENTREGUE);
  return "entregue";
}

/**
 * Entrada no mundo: registra as datas, saúda e confere o item.
 * @param {Player} player
 */
function receber(player) {
  const agora = Date.now();
  const primeiraVez = !dadosJogador(player).primeira;
  editarJogador(player, (d) => {
    if (primeiraVez) d.primeira = agora;
    d.ultimaVez = agora;
  });
  if (primeiraVez) {
    mostrarTitulo(player, textos.TITULO_PRIMEIRA, { ...TEMPOS_TITULO, subtitulo: textos.SUBTITULO_PRIMEIRA(player.name) });
    msg(player, textos.CHAT_PRIMEIRA(player.name));
  } else player.onScreenDisplay.setActionBar(textos.BARRA_RETORNO(player.name));
  garantirItem(player);
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  system.runTimeout(() => {
    if (!player.isValid) return;
    try {
      if (initialSpawn) receber(player);
      else garantirItem(player);
    } catch (e) {
      registrarErro("Boas-vindas", e);
    }
  }, initialSpawn ? TICKS_ATE_SAUDAR : 1);
});

registrarComando({ nome: "item", descricao: textos.DESC_ITEM }, (p) => {
  if (garantirItem(p) === "tinha") ok(p, textos.ITEM_JA_TEM);
});
