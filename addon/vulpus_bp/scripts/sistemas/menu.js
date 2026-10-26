// @ts-check
// Menu principal (Hub): logo no meio, slots ao redor. Reorganizado em categorias.
import { system, world } from "@minecraft/server";
import { ICONES, ITEM_MENU } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { Hub } from "../core/forms.js";
import { online } from "../core/jogadores.js";
import { ehDono } from "../core/dono.js";
import { ehStaff } from "../core/permissoes.js";
import { formatarNumero, rodarSeguro } from "../core/util.js";
import * as textos from "../textos/menu.js";
import { menuAjustes } from "./ajustes.js";
import { saldo } from "./caudas.js";
import { menuCla, rotuloHub } from "./clas.js";
import { menuDono } from "./dono.js";
import { selo } from "./identidade.js";
import { nomeVisivel } from "./kitsune.js";
import { infoNivel } from "./niveis.js";
import { marcarMenu, ehNovato } from "./novato.js";
import { menuStaff } from "./staff.js";
import { menuTeleportes } from "./menu_teleportes.js";
import { menuMercado } from "./menu_mercado.js";
import { menuAtividades } from "./menu_atividades.js";
import { menuServidor } from "./menu_servidor.js";
import { menuDuvidas } from "./duvidas.js";
import { menuPerfil } from "./perfil.js";

/** @typedef {import("@minecraft/server").Player} Player */

const ABRINDO_TICKS = 10;
/** @type {Map<string, number>} */
const ultimoUso = new Map();

/** @param {Player} player */
function corpo(player) {
  const dica = textos.DICAS[Math.floor(Math.random() * textos.DICAS.length)];
  const { rank, nivel } = infoNivel(player);
  return [
    textos.SAUDACAO(nomeVisivel(player)),
    textos.LINHA_RANK(selo(player), rank.nome, formatarNumero(nivel)),
    textos.LINHA_CAUDAS(formatarNumero(saldo(player))),
    textos.LINHA_ONLINE(online().length),
    ...(ehNovato(player) ? [textos.LINHA_NOVATO] : []),
    textos.LINHA_DICA(dica),
  ].join("\n");
}

/**
 * @param {Player} player
 * @param {() => any} volta
 * @returns {import("../core/forms.js").Botao | undefined}
 */
function cantoHub(player, volta) {
  if (ehStaff(player)) return { texto: textos.STAFF, icone: ICONES.staff, acao: (p) => menuStaff(p, volta) };
  if (ehDono(player)) return { texto: textos.DONO, icone: ICONES.dono, acao: (p) => menuDono(p, volta) };
  return undefined;
}

/**
 * Abre o menu principal.
 * @param {Player} player
 */
export async function abrirMenu(player) {
  const volta = () => abrirMenu(player);
  marcarMenu(player);
  await new Hub()
    .titulo(textos.TITULO)
    .texto(corpo(player))
    .slot(0, { texto: textos.TELEPORTES, icone: ICONES.teleportes, acao: (p) => menuTeleportes(p, volta) })
    .slot(1, { texto: textos.PERFIL, icone: ICONES.perfil, acao: (p) => menuPerfil(p, volta) })
    .slot(2, { texto: textos.MERCADO, icone: ICONES.mercado, acao: (p) => menuMercado(p, volta) })
    .slot(3, { texto: textos.ATIVIDADES, icone: ICONES.atividades, acao: (p) => menuAtividades(p, volta) })
    .slot(4, { texto: rotuloHub(player), icone: ICONES.claHub, acao: (p) => menuCla(p, volta) })
    .slot(5, { texto: textos.SERVIDOR, icone: ICONES.servidor, acao: (p) => menuServidor(p, volta) })
    .slot(6, { texto: textos.AJUSTES, icone: ICONES.ajustes, acao: (p) => menuAjustes(p, volta) })
    .slot(8, { texto: textos.DUVIDAS, icone: ICONES.duvidas, acao: (p) => menuDuvidas(p, volta) })
    .staff(cantoHub(player, volta))
    .abrir(player);
}

registrarComando({ nome: "menu", descricao: textos.CMD_MENU }, (p) => abrirMenu(p));

world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
  if (itemStack.typeId !== ITEM_MENU) return;
  const agora = system.currentTick;
  const anterior = ultimoUso.get(source.id);
  if (anterior !== undefined && agora - anterior < ABRINDO_TICKS) return;
  ultimoUso.set(source.id, agora);
  rodarSeguro(source, "Item do menu", abrirMenu);
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => ultimoUso.delete(playerId));
