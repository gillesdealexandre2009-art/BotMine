// @ts-check
// Painel da staff das zonas de música: marcar (com raio), mostrar o limite e remover a zona da feira e da vila.
import { ICONES } from "../config.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/musica.js";
import { mostrarLimite } from "./lobby.js";
import { ZONAS_IDS, ZONA_RAIO, definirZona, removerZona, resumoZonas, zonaDe } from "./musica.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]  abre o formulário de volume, fade e sons pontuais
 */
export async function menuMusicaStaff(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuMusicaStaff(player, voltar, configurar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ jogador) => {
    if (!ehStaff(jogador)) return;
    await fn(jogador);
    await aqui();
  };
  const lista = new Lista(textos.TITULO_ZONAS).texto(`${textos.CORPO_ZONAS}\n\n${resumoZonas()}`);
  for (const id of ZONAS_IDS) {
    const zona = zonaDe(id);
    lista
      .cabecalho(textos.SECAO_ZONA(id))
      .botao(
        textos.BOTAO_MARCAR,
        ICONES.spawn,
        eVolta(async (j) => {
          const r = await perguntar(j, textos.BOTAO_MARCAR, [
            { tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao: zonaDe(id)?.r ?? ZONA_RAIO.padrao, min: ZONA_RAIO.min, max: ZONA_RAIO.max },
          ]);
          if (r && ehStaff(j)) definirZona(j, id, r[0]);
        }),
      );
    if (zona) {
      lista
        .botao(
          textos.BOTAO_VER,
          ICONES.buscar,
          eVolta(() => {
            const atual = zonaDe(id);
            if (atual) mostrarLimite(atual);
          }),
        )
        .botao(
          textos.BOTAO_REMOVER,
          ICONES.apagar,
          eVolta(async (j) => {
            if (await confirmar(j, { titulo: textos.BOTAO_REMOVER, texto: textos.CONFIRMAR_REMOVER(id) })) removerZona(j, id);
          }),
        );
    }
  }
  if (configurar) lista.cabecalho(textos.SECAO_CONFIG).botao(textos.BOTAO_CONFIG_MUSICA, ICONES.ajustes, eVolta((j) => configurar(j)));
  await lista.voltar(voltar).abrir(player);
}
