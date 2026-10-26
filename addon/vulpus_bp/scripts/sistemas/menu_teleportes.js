// @ts-check
// Sub-menu Teleportes: Spawn, Casas, TPA e Retornar (último local de morte).
import { ICONES } from "../config.js";
import { Lista } from "../core/forms.js";
import { menuCasas } from "./casas.js";
import { irSpawn } from "./spawn.js";
import { contarPedidos, menuTpa } from "./tpa.js";
import { irVoltar } from "./voltar.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuTeleportes(player, voltar) {
  const aqui = () => menuTeleportes(player, voltar);
  const pedidos = contarPedidos(player);
  await new Lista("Teleportes")
    .texto("§7Vá para onde quiser.")
    .botao("Spawn", ICONES.spawn, irSpawn)
    .botao("Casas", ICONES.casas, (p) => menuCasas(p, aqui))
    .botao(pedidos > 0 ? `TPA (${pedidos})` : "TPA", ICONES.tpa, (p) => menuTpa(p, aqui))
    .botao("Retornar §7(última morte)", ICONES.retornar, irVoltar)
    .voltar(voltar)
    .abrir(player);
}
