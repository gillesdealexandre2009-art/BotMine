// @ts-check
// Ajustes de cada jogador: scoreboard lateral (e a linha do clã nela), tema do painel (5; 3 do selo
// Kitsune), pedidos de TPA, sons do menu e o visual Kitsune.
// Não importa hud.js: a sidebar percebe a troca sozinha no próximo ciclo.
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, TEMAS_MENU } from "../core/db.js";
import { Lista, podeUsarTema, temaDoPainel } from "../core/forms.js";
import { ok } from "../core/util.js";
import * as textos from "../textos/ajustes.js";
import { menuKitsune } from "./kitsune.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/db.js").Tema} Tema */

/** Raposinha de cada tema na escolha. @type {Readonly<Record<Tema, string>>} */
const ICONE_TEMA = Object.freeze({
  laranja: ICONES.temaLaranja,
  black: ICONES.temaBlack,
  sakura: ICONES.temaSakura,
  lunar: ICONES.temaLunar,
  espirito: ICONES.temaEspirito,
});

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
 * Escolha do tema do painel: os 5, com os de Kitsune travados (cadeado) para quem não tem o selo.
 * Escolher reabre a lista já no tema novo; o travado explica que é cosmético de quem apoia no Discord.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuTemas(player, voltar) {
  const atual = temaDoPainel(player);
  const aqui = (/** @type {Player} */ p) => menuTemas(p, voltar);
  const lista = new Lista(textos.TITULO_TEMAS).texto(textos.CORPO_TEMAS(podeUsarTema(player, "sakura")));
  for (const tema of TEMAS_MENU) {
    const livre = podeUsarTema(player, tema);
    lista.botao(textos.BOTAO_ESCOLHA_TEMA(tema, tema === atual, livre), livre ? ICONE_TEMA[tema] : ICONES.cadeado, async (p) => {
      if (!podeUsarTema(p, tema)) {
        await new Lista(textos.TITULO_TEMA_KITSUNE).texto(textos.TEMA_SO_KITSUNE).voltar(aqui).abrir(p);
        return;
      }
      if (tema !== temaDoPainel(p)) {
        editarJogador(p, (d) => {
          d.ajustes.tema = tema;
        });
        ok(p, textos.TEMA_MUDOU(tema));
      }
      await aqui(p);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Lista de alternâncias; cada clique troca o valor e reabre o menu com o estado novo
 * (o tema abre a escolha, que já reabre no tema novo).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuAjustes(player, voltar) {
  const { tpa, sons, cla } = dadosJogador(player).ajustes;
  const tema = temaDoPainel(player);
  const hud = hudLigada(player);
  /** @param {(p: Player) => void} trocar */
  const eReabrir = (trocar) => async (/** @type {Player} */ p) => {
    trocar(p);
    await menuAjustes(p, voltar);
  };
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(textos.BOTAO_HUD(hud), icone(hud), eReabrir(alternarHud))
    .botao(textos.BOTAO_TEMA(tema), ICONE_TEMA[tema], (p) => menuTemas(p, () => menuAjustes(p, voltar)))
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
