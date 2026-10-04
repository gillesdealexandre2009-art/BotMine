// @ts-check
// Ajustes de cada jogador: scoreboard lateral (e a linha do clã nela), tema do menu, pedidos de TPA,
// sons do menu e o visual Kitsune.
// Não importa hud.js: a sidebar percebe a troca sozinha no próximo ciclo.
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { ok } from "../core/util.js";
import * as textos from "../textos/ajustes.js";
import { menuKitsune } from "./kitsune.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * Scoreboard lateral ligada para o jogador (sem escolha própria, vale o hudPadrao da staff).
 * @param {Player | string} player
 * @returns {boolean}
 */
export function hudLigada(player) {
  return dadosJogador(player).ajustes.hud ?? config().hudPadrao;
}

/**
 * Liga ou desliga a scoreboard lateral e avisa.
 * @param {Player} player
 */
function alternarHud(player) {
  const ligada = !hudLigada(player);
  editarJogador(player, (d) => {
    d.ajustes.hud = ligada;
  });
  ok(player, textos.HUD_MUDOU(ligada));
}

/** @param {boolean} ligado */
const icone = (ligado) => (ligado ? ICONES.sim : ICONES.nao);

/**
 * Lista de alternâncias; cada clique troca o valor e reabre o menu com o estado novo
 * (a troca de tema já reabre no tema novo).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuAjustes(player, voltar) {
  const { tpa, sons, tema, cla } = dadosJogador(player).ajustes;
  const hud = hudLigada(player);
  /** @param {(p: Player) => void} trocar */
  const eReabrir = (trocar) => async (/** @type {Player} */ p) => {
    trocar(p);
    await menuAjustes(p, voltar);
  };
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(textos.BOTAO_HUD(hud), icone(hud), eReabrir(alternarHud))
    .botao(
      textos.BOTAO_TEMA(tema),
      ICONES.tema,
      eReabrir((p) => {
        const novo = tema === "black" ? "laranja" : "black";
        editarJogador(p, (d) => {
          d.ajustes.tema = novo;
        });
        ok(p, textos.TEMA_MUDOU(novo));
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
    .botao(
      textos.BOTAO_CLA(cla),
      icone(cla),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.cla = !cla;
        });
        ok(p, textos.CLA_MUDOU(!cla));
      }),
    )
    .botao(textos.BOTAO_KITSUNE, ICONES.kitsune, (p) => menuKitsune(p, () => menuAjustes(p, voltar)))
    .voltar(voltar)
    .abrir(player);
}

registrarComando({ nome: "hud", descricao: textos.DESC_HUD }, (p) => alternarHud(p));
