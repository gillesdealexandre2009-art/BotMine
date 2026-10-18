// @ts-check
// Painel da staff do tiro ao alvo (fica em Feira e minigames): posto, raio, placar flutuante, os 4 alvos móveis
// e as configurações.
import { ICONES } from "../config.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/tiro.js";
import * as tiro from "./tiro.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * Painel de um alvo móvel (1 a 4): pôr aqui, ajustar a amplitude e remover.
 * @param {Player} player
 * @param {number} n
 * @param {() => any} voltar
 */
async function menuAlvoMovel(player, n, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuAlvoMovel(player, n, voltar);
  const m = tiro.estadoTiro().moveis[String(n)];
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  await new Lista(textos.TITULO_ALVO(n))
    .texto(textos.CORPO_ALVO(n, m))
    .botao(textos.BOTAO_PONTO_MOVEL, ICONES.spawn, eVolta((p) => tiro.definirMovel(p, n, undefined)))
    .botao(
      textos.BOTAO_AMPLITUDE,
      ICONES.editar,
      eVolta(async (p) => {
        const r = await perguntar(p, textos.BOTAO_AMPLITUDE, [
          { tipo: "numero", rotulo: textos.ROTULO_AMPLITUDE, padrao: m?.amp ?? 4, min: 1, max: tiro.LIMITES_TIRO.ampMax },
        ]);
        if (r && ehStaff(p)) tiro.mudarAmplitude(p, n, r[0]);
      }),
    )
    .botao(textos.BOTAO_REMOVER_MOVEL, ICONES.apagar, eVolta((p) => tiro.removerMovel(p, n)))
    .voltar(voltar)
    .abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]  abre o formulário de configurações do tiro
 */
export async function menuTiroStaff(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuTiroStaff(player, voltar, configurar);
  const e = tiro.estadoTiro();
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };

  const lista = new Lista(textos.TITULO_STAFF)
    .texto(textos.CORPO_STAFF(e))
    .botao(textos.BOTAO_POSTO, ICONES.spawn, eVolta((p) => tiro.definirPosto(p, undefined)))
    .botao(
      textos.BOTAO_RAIO_POSTO,
      ICONES.editar,
      eVolta(async (p) => {
        const r = await perguntar(p, textos.BOTAO_RAIO_POSTO, [
          { tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao: e.posto?.r ?? 3, min: 1, max: tiro.LIMITES_TIRO.raioMax },
        ]);
        if (r && ehStaff(p)) tiro.mudarRaioPosto(p, r[0]);
      }),
    )
    .botao(textos.BOTAO_PLACAR, ICONES.trofeu, eVolta((p) => tiro.definirPlacar(p)));
  for (let n = 1; n <= tiro.LIMITES_TIRO.alvos; n++) {
    lista.botao(textos.BOTAO_ALVO(n, !!e.moveis[String(n)]), ICONES.cacada, (p) => menuAlvoMovel(p, n, aqui));
  }
  if (configurar) lista.botao(textos.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurar(p)));
  lista.botao(
    textos.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textos.BOTAO_REMOVER, texto: textos.CONFIRMAR_REMOVER })) tiro.removerTiro(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}
