// @ts-check
// Sub-menu Mercado: Loja (preços fixos) e Leilão (itens premium entre jogadores).
import { ICONES } from "../config.js";
import { Lista } from "../core/forms.js";
import { formatarNumero } from "../core/util.js";
import { saldo } from "./caudas.js";
import { menuLeilao, resumoCaixa } from "./leilao.js";
import { menuLoja } from "./loja.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuMercado(player, voltar) {
  const aqui = () => menuMercado(player, voltar);
  const caixa = resumoCaixa(player);
  const itensNaCaixa = caixa.itens > 0 ? ` §e(${caixa.itens})` : "";
  await new Lista("Mercado")
    .texto(`§6★ §r${formatarNumero(saldo(player))} Caudas\n§7Compre e venda na toca.`)
    .botao("Loja §7(preços fixos)", ICONES.comprar, (p) => menuLoja(p, aqui))
    .botao(`Leilão${itensNaCaixa} §7(entre jogadores)`, ICONES.leilao, (p) => menuLeilao(p, aqui))
    .voltar(voltar)
    .abrir(player);
}
