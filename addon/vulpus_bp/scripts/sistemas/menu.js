// @ts-check
// Menu principal (Hub): logo no meio, 5 botões de cada lado e o canto da staff.
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
import { menuCasas } from "./casas.js";
import { menuCaudas, saldo } from "./caudas.js";
import { menuCla, rotuloHub } from "./clas.js";
import { menuDono } from "./dono.js";
import { selo } from "./identidade.js";
import { menuLeilao, resumoCaixa } from "./leilao.js";
import { nomeVisivel } from "./kitsune.js";
import { infoNivel } from "./niveis.js";
import { menuPerfil } from "./perfil.js";
import { menuRegras } from "./regras.js";
import { irSpawn } from "./spawn.js";
import { menuStaff } from "./staff.js";
import { contarPedidos, menuTpa } from "./tpa.js";
import { irVoltar } from "./voltar.js";

/** @typedef {import("@minecraft/server").Player} Player */

/** Abrir pelo item: ignora cliques repetidos enquanto o menu já está abrindo. */
const ABRINDO_TICKS = 10;
/** @type {Map<string, number>} id → tick do último uso do item */
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
    textos.LINHA_DICA(dica),
  ].join("\n");
}

/**
 * Botão do canto: Staff para a staff (o Painel de Dono fica dentro dela); Dono para quem é dono sem ser staff.
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
 * Abre o menu principal. Os submenus recebem um "voltar" que reabre o Hub.
 * @param {Player} player
 */
export async function abrirMenu(player) {
  const volta = () => abrirMenu(player);
  const pedidos = contarPedidos(player);
  await new Hub()
    .titulo(textos.TITULO)
    .texto(corpo(player))
    .slot(0, { texto: textos.SPAWN, icone: ICONES.spawn, acao: irSpawn })
    .slot(1, { texto: textos.CASAS, icone: ICONES.casas, acao: (p) => menuCasas(p, volta) })
    .slot(2, { texto: textos.TPA(pedidos), icone: ICONES.tpa, acao: (p) => menuTpa(p, volta) })
    .slot(3, { texto: textos.VOLTAR, icone: ICONES.voltar, acao: irVoltar })
    .slot(4, { texto: textos.PERFIL, icone: ICONES.perfil, acao: (p) => menuPerfil(p, volta) })
    .slot(5, { texto: textos.CAUDAS, icone: ICONES.caudas, acao: (p) => menuCaudas(p, volta) })
    .slot(6, { texto: textos.LEILAO(resumoCaixa(player).itens), icone: ICONES.leilao, acao: (p) => menuLeilao(p, volta) })
    .slot(7, { texto: rotuloHub(player), icone: ICONES.cla, acao: (p) => menuCla(p, volta) })
    .slot(8, { texto: textos.AJUSTES, icone: ICONES.ajustes, acao: (p) => menuAjustes(p, volta) })
    .slot(9, { texto: textos.REGRAS, icone: ICONES.regras, acao: (p) => menuRegras(p, volta) })
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
