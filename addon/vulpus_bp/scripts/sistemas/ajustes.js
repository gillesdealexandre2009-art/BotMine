// @ts-check
// Ajustes de cada jogador: HUD, pedidos de TPA e sons do menu.
import { ICONES } from "../config.js";
import { config, dadosJogador, editarJogador } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { ok } from "../core/util.js";
import * as textos from "../textos/ajustes.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * HUD ligada para o jogador (sem escolha própria, vale o hudPadrao da staff).
 * @param {Player | string} player
 * @returns {boolean}
 */
export function hudLigada(player) {
  return dadosJogador(player).ajustes.hud ?? config().hudPadrao;
}

/** @param {boolean} ligado */
const icone = (ligado) => (ligado ? ICONES.sim : ICONES.nao);

/**
 * Lista de alternâncias; cada clique troca o valor e reabre o menu com o estado novo.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuAjustes(player, voltar) {
  const { tpa, sons } = dadosJogador(player).ajustes;
  const hud = hudLigada(player);
  /** @param {(p: Player) => void} trocar */
  const eReabrir = (trocar) => async (/** @type {Player} */ p) => {
    trocar(p);
    await menuAjustes(p, voltar);
  };
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(
      textos.BOTAO_HUD(hud),
      icone(hud),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.hud = !hud;
        });
        if (hud) p.onScreenDisplay.setActionBar(" ");
        ok(p, textos.HUD_MUDOU(!hud));
      }),
    )
    .botao(
      textos.BOTAO_TPA(tpa),
      icone(tpa),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.tpa = !tpa;
        });
        ok(p, textos.TPA_MUDOU(!tpa));
      }),
    )
    .botao(
      textos.BOTAO_SONS(sons),
      icone(sons),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.sons = !sons;
        });
        ok(p, textos.SONS_MUDOU(!sons));
      }),
    )
    .voltar(voltar)
    .abrir(player);
}
