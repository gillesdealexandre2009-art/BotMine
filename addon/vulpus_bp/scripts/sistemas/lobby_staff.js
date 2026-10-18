// @ts-check
// Painel da staff do lobby protegido, do portal de saída e do RTP.
import { ICONES } from "../config.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/lobby.js";
import * as lobby from "./lobby.js";
import * as rtp from "./rtp.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]  abre o formulário de RTP e barreira
 */
export async function menuLobbyStaff(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuLobbyStaff(player, voltar, configurar);
  const l = lobby.lobbyAtual();
  const p = rtp.portalAtual();
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ jogador) => {
    if (!ehStaff(jogador)) return;
    await fn(jogador);
    await aqui();
  };
  /**
   * @param {string} titulo
   * @param {number} padrao
   * @param {number} min
   * @param {number} max
   * @param {(p: Player, n: number) => any} aplicar
   */
  const perguntarRaio = (titulo, padrao, min, max, aplicar) =>
    eVolta(async (jogador) => {
      const r = await perguntar(jogador, titulo, [{ tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao, min, max }]);
      if (r && ehStaff(jogador)) aplicar(jogador, r[0]);
    });

  const lista = new Lista(textos.TITULO_STAFF)
    .texto(textos.CORPO_STAFF(l, p))
    .cabecalho(textos.SECAO_LOBBY)
    .botao(textos.BOTAO_MARCAR_LOBBY, ICONES.spawn, eVolta((j) => lobby.definirLobby(j, undefined)))
    .botao(textos.BOTAO_RAIO_LOBBY, ICONES.editar, perguntarRaio(textos.BOTAO_RAIO_LOBBY, l?.r ?? 50, 5, 1000, lobby.mudarRaio))
    .botao(
      textos.BOTAO_VER_LIMITE,
      ICONES.buscar,
      eVolta((j) => {
        const atual = lobby.lobbyAtual();
        if (atual) lobby.mostrarLimite(atual);
        else erro(j, "Ainda não existe lobby marcado.");
      }),
    )
    .botao(
      textos.BOTAO_REMOVER_LOBBY,
      ICONES.apagar,
      eVolta(async (j) => {
        if (await confirmar(j, { titulo: textos.BOTAO_REMOVER_LOBBY, texto: textos.CONFIRMAR_LOBBY })) lobby.removerLobby(j);
      }),
    )
    .cabecalho(textos.SECAO_PORTAL)
    .botao(textos.BOTAO_MARCAR_PORTAL, ICONES.spawn, eVolta((j) => rtp.definirPortal(j, undefined)))
    .botao(
      textos.BOTAO_RAIO_PORTAL,
      ICONES.editar,
      perguntarRaio(textos.BOTAO_RAIO_PORTAL, p?.r ?? rtp.LIMITES_PORTAL.raioPadrao, 1, rtp.LIMITES_PORTAL.raioMax, rtp.mudarRaioPortal),
    )
    .botao(
      textos.BOTAO_REMOVER_PORTAL,
      ICONES.apagar,
      eVolta(async (j) => {
        if (await confirmar(j, { titulo: textos.BOTAO_REMOVER_PORTAL, texto: textos.CONFIRMAR_PORTAL })) rtp.removerPortal(j);
      }),
    );
  if (configurar) {
    lista.cabecalho(textos.SECAO_RTP).botao(textos.BOTAO_CONFIG_RTP, ICONES.ajustes, eVolta((j) => configurar(j)));
  }
  await lista.voltar(voltar).abrir(player);
}
