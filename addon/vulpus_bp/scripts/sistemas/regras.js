// @ts-check
// Regras: regras do servidor, comandos, a lenda de Kiza (capítulos) e o link do Discord.
import { ICONES } from "../config.js";
import { config } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { ok } from "../core/util.js";
import * as textos from "../textos/regras.js";

/** @typedef {import("@minecraft/server").Player} Player */

/** @param {[string, string][]} linhas */
const listaComandos = (linhas) => linhas.map(([comando, uso]) => `§e${comando} §8» §f${uso}`);

/**
 * Índice das páginas de regras.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuRegras(player, voltar) {
  const aqui = () => menuRegras(player, voltar);
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(textos.BOTAO_REGRAS, ICONES.regras, (p) => paginaRegras(p, aqui))
    .botao(textos.BOTAO_COMANDOS, ICONES.comandos, (p) => paginaComandos(p, aqui))
    .botao(textos.BOTAO_LENDA, ICONES.lore, (p) => menuLenda(p, aqui))
    .botao(textos.BOTAO_DISCORD, ICONES.discord, (p) => paginaDiscord(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function paginaRegras(player, voltar) {
  const corpo = [
    textos.REGRAS_INTRO,
    ...textos.REGRAS.map(([titulo, texto]) => `\n§6${titulo}\n§f${texto}`),
    "",
    textos.REGRAS_RODAPE,
  ];
  await new Lista(textos.TITULO_REGRAS).texto(corpo.join("\n")).voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function paginaComandos(player, voltar) {
  const corpo = [textos.COMANDOS_INTRO, "", ...listaComandos(textos.COMANDOS)];
  if (ehStaff(player)) corpo.push("", textos.COMANDOS_STAFF_TITULO, ...listaComandos(textos.COMANDOS_STAFF));
  await new Lista(textos.TITULO_COMANDOS).texto(corpo.join("\n")).voltar(voltar).abrir(player);
}

/**
 * Índice dos capítulos da lenda.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuLenda(player, voltar) {
  const aqui = () => menuLenda(player, voltar);
  const lista = new Lista(textos.TITULO_LENDA).texto(textos.LENDA_INTRO);
  textos.CAPITULOS.forEach((capitulo, i) => lista.botao(capitulo.titulo, ICONES.lore, (p) => capituloLenda(p, i, aqui)));
  await lista.rotulo(textos.LENDA_RODAPE).voltar(voltar).abrir(player);
}

/**
 * Um capítulo, com atalho para o próximo.
 * @param {Player} player
 * @param {number} indice
 * @param {() => any} voltar  volta para o índice da lenda
 */
async function capituloLenda(player, indice, voltar) {
  const capitulo = textos.CAPITULOS[indice];
  const lista = new Lista(textos.TITULO_LENDA).texto(`§6${capitulo.titulo}\n\n§f${capitulo.texto}`);
  if (indice + 1 < textos.CAPITULOS.length) {
    lista.botao(textos.BOTAO_PROXIMO, ICONES.lore, (p) => capituloLenda(p, indice + 1, voltar));
  } else lista.rotulo(textos.LENDA_RODAPE);
  await lista.voltar(voltar).abrir(player);
}

/**
 * Link do Discord configurado pela staff (linkDiscord).
 * @param {Player} player
 * @param {() => any} voltar
 */
async function paginaDiscord(player, voltar) {
  const link = config().linkDiscord.trim();
  const lista = new Lista(textos.TITULO_DISCORD).texto(link ? textos.DISCORD_COM_LINK(link) : textos.DISCORD_SEM_LINK);
  if (link) lista.botao(textos.BOTAO_LINK_CHAT, ICONES.comandos, (p) => ok(p, textos.LINK_NO_CHAT(link)));
  await lista.voltar(voltar).abrir(player);
}
