// @ts-check
// TPA: pedidos para ir até alguém ou chamar alguém, em memória, com prazo e um pedido enviado por vez.
import { system, world } from "@minecraft/server";
import { ICONES, SONS } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { outros, porId } from "../core/jogadores.js";
import { teleportar } from "../core/teleporte.js";
import { erro, msg, ok, registrarErro, som } from "../core/util.js";
import { JOGADOR_OFFLINE } from "../textos/geral.js";
import * as textos from "../textos/tpa.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * "ir": quem pediu vai até o alvo. "trazer": o alvo vem até quem pediu.
 * @typedef {"ir" | "trazer"} TipoPedido
 */

/**
 * @typedef {object} Pedido
 * @property {string} de  id de quem pediu
 * @property {string} deNome
 * @property {string} para  id de quem recebe
 * @property {string} paraNome
 * @property {TipoPedido} tipo
 * @property {number} vence  tick em que o pedido deixa de valer
 */

const TICKS_POR_SEGUNDO = 20;

/** @type {Map<string, Pedido>} id de quem pediu → pedido (um por vez) */
const pedidos = new Map();

/** @param {Pedido} pedido */
const segundosRestantes = (pedido) => Math.max(0, Math.ceil((pedido.vence - system.currentTick) / TICKS_POR_SEGUNDO));

/** @param {Pedido} pedido */
const vigente = (pedido) => pedidos.get(pedido.de) === pedido && system.currentTick < pedido.vence;

/**
 * Pedidos que o jogador recebeu e ainda valem, do mais novo para o mais antigo.
 * @param {Player} player
 * @returns {Pedido[]}
 */
function recebidos(player) {
  return [...pedidos.values()].filter((p) => p.para === player.id && vigente(p)).sort((a, b) => b.vence - a.vence);
}

/**
 * Quantos pedidos recebidos estão esperando resposta (o Hub mostra no botão).
 * @param {Player} player
 * @returns {number}
 */
export function contarPedidos(player) {
  return recebidos(player).length;
}

/**
 * Pedido enviado pelo jogador que ainda vale.
 * @param {Player} player
 */
function enviado(player) {
  const pedido = pedidos.get(player.id);
  return pedido && vigente(pedido) ? pedido : undefined;
}

/**
 * Envia um pedido, conferindo alvo, bloqueio em Ajustes e pedido já pendente.
 * @param {Player} player
 * @param {Player | undefined} alvo
 * @param {TipoPedido} tipo
 */
function enviarPedido(player, alvo, tipo) {
  if (!alvo?.isValid) {
    erro(player, JOGADOR_OFFLINE);
    return;
  }
  if (alvo.id === player.id) {
    erro(player, textos.PARA_SI);
    return;
  }
  if (!dadosJogador(alvo).ajustes.tpa) {
    erro(player, textos.ALVO_BLOQUEADO(alvo.name));
    return;
  }
  const anterior = enviado(player);
  if (anterior) {
    const igual = anterior.para === alvo.id && anterior.tipo === tipo;
    erro(player, igual ? textos.DUPLICADO(alvo.name) : textos.JA_TEM_PEDIDO(anterior.paraNome));
    return;
  }
  const segundos = Math.max(1, Math.floor(config().tpaExpira));
  pedidos.set(player.id, {
    de: player.id,
    deNome: player.name,
    para: alvo.id,
    paraNome: alvo.name,
    tipo,
    vence: system.currentTick + segundos * TICKS_POR_SEGUNDO,
  });
  ok(player, textos.ENVIADO(alvo.name, segundos));
  const vemAte = tipo === "ir";
  msg(alvo, textos.CHEGOU_PEDIDO(player.name, vemAte, segundos));
  som(alvo, SONS.pedido);
  alvo.onScreenDisplay.setActionBar(textos.BARRA_PEDIDO(player.name));
}

/**
 * Aceita: quem viaja passa pelas regras de teleporte. Se não puder viajar agora, o pedido continua.
 * @param {Player} player  quem recebeu o pedido
 * @param {Pedido} pedido
 */
function aceitar(player, pedido) {
  if (!vigente(pedido)) {
    erro(player, textos.NAO_VALE_MAIS);
    return;
  }
  const quemPediu = porId(pedido.de);
  if (!quemPediu) {
    pedidos.delete(pedido.de);
    erro(player, textos.ALVO_SAIU(pedido.deNome));
    return;
  }
  const [viajante, anfitriao] = pedido.tipo === "ir" ? [quemPediu, player] : [player, quemPediu];
  const idAnfitriao = anfitriao.id;
  // Posição do anfitrião lida na chegada (ele pode andar durante a espera); se sair, cancela.
  const destino = () => {
    const alvo = porId(idAnfitriao);
    if (!alvo) return undefined;
    const { x, y, z } = alvo.location;
    return { x, y, z, d: alvo.dimension.id };
  };
  if (!teleportar(viajante, destino, { nome: anfitriao.name })) {
    if (viajante.id !== player.id) erro(player, textos.NAO_PODE_VIAJAR(viajante.name));
    return;
  }
  pedidos.delete(pedido.de);
  ok(player, textos.ACEITO(quemPediu.name));
  msg(quemPediu, textos.ACEITOU_SEU(player.name));
}

/**
 * @param {Player} player  quem recebeu o pedido
 * @param {Pedido} pedido
 */
function recusar(player, pedido) {
  if (!vigente(pedido)) {
    erro(player, textos.NAO_VALE_MAIS);
    return;
  }
  pedidos.delete(pedido.de);
  msg(player, textos.RECUSADO(pedido.deNome));
  msg(porId(pedido.de), textos.RECUSOU_SEU(player.name));
}

/** @param {Player} player */
function cancelarEnviado(player) {
  const pedido = enviado(player);
  if (!pedido) {
    erro(player, textos.SEM_PEDIDO_ENVIADO);
    return;
  }
  pedidos.delete(player.id);
  msg(player, textos.CANCELADO(pedido.paraNome));
  msg(porId(pedido.para), textos.CANCELOU_SEU(player.name));
}

/**
 * Lista de jogadores online para mandar um pedido.
 * @param {Player} player
 * @param {TipoPedido} tipo
 * @param {() => any} voltarTpa
 */
async function escolherJogador(player, tipo, voltarTpa) {
  const candidatos = outros(player);
  const lista = new Lista(tipo === "ir" ? textos.TITULO_IR : textos.TITULO_TRAZER).texto(
    candidatos.length ? textos.ESCOLHA : textos.NINGUEM,
  );
  for (const alvo of candidatos) {
    const rotulo = dadosJogador(alvo).ajustes.tpa ? alvo.name : textos.JOGADOR_BLOQUEADO(alvo.name);
    lista.botao(rotulo, ICONES.jogador, () => enviarPedido(player, alvo, tipo));
  }
  await lista.voltar(voltarTpa).abrir(player);
}

/**
 * Aceitar ou recusar um pedido.
 * @param {Player} player
 * @param {Pedido} pedido
 * @param {() => any} voltarPedidos
 */
async function responderPedido(player, pedido, voltarPedidos) {
  if (!vigente(pedido)) {
    erro(player, textos.NAO_VALE_MAIS);
    return voltarPedidos();
  }
  await new Lista(pedido.deNome)
    .texto(textos.DETALHE_PEDIDO(pedido.deNome, pedido.tipo === "ir"))
    .botao(textos.ACEITAR, ICONES.sim, () => aceitar(player, pedido))
    .botao(textos.RECUSAR, ICONES.nao, () => recusar(player, pedido))
    .voltar(voltarPedidos)
    .abrir(player);
}

/**
 * Pedidos recebidos que ainda valem.
 * @param {Player} player
 * @param {(() => any) | undefined} voltar
 * @param {string} [aviso]  texto do topo (padrão: nada ou "nenhum pedido")
 */
async function menuRecebidos(player, voltar, aviso) {
  const reabrir = () => menuRecebidos(player, voltar);
  const lista = recebidos(player);
  const menu = new Lista(textos.TITULO_RECEBIDOS).texto(aviso ?? (lista.length ? "" : textos.SEM_RECEBIDOS_TEXTO));
  for (const pedido of lista) {
    const rotulo = textos.BOTAO_PEDIDO(pedido.deNome, pedido.tipo === "ir", segundosRestantes(pedido));
    menu.botao(rotulo, ICONES.jogador, () => responderPedido(player, pedido, reabrir));
  }
  await menu.voltar(voltar).abrir(player);
}

/**
 * Menu do TPA.
 * @param {Player} player
 * @param {(() => any)} [voltar]
 */
export async function menuTpa(player, voltar) {
  const reabrir = () => menuTpa(player, voltar);
  const meu = enviado(player);
  const corpo = [textos.INTRO(Math.max(1, Math.floor(config().tpaExpira)))];
  if (meu) corpo.push(textos.MEU_PEDIDO(meu.paraNome, segundosRestantes(meu)));
  if (!dadosJogador(player).ajustes.tpa) corpo.push(textos.BLOQUEADO_AVISO);
  const lista = new Lista(textos.TITULO)
    .texto(corpo.join("\n"))
    .botao(textos.IR, ICONES.tpa, () => escolherJogador(player, "ir", reabrir))
    .botao(textos.TRAZER, ICONES.online, () => escolherJogador(player, "trazer", reabrir))
    .botao(textos.RECEBIDOS(contarPedidos(player)), ICONES.jogador, () => menuRecebidos(player, reabrir));
  if (meu) lista.botao(textos.CANCELAR, ICONES.nao, () => cancelarEnviado(player));
  await lista.voltar(voltar).abrir(player);
}

/**
 * /tpaceitar e /tpanegar: com nome, responde àquela pessoa; sem nome, ao único pedido
 * (com vários, abre a lista para escolher).
 * @param {Player} player
 * @param {Player | null | undefined} de  null = o nome digitado não achou ninguém online
 * @param {boolean} aceita
 */
function responderPorComando(player, de, aceita) {
  if (de === null) {
    erro(player, JOGADOR_OFFLINE);
    return;
  }
  const lista = recebidos(player);
  const pedido = de ? lista.find((p) => p.de === de.id) : lista.length === 1 ? lista[0] : undefined;
  if (pedido) return aceita ? aceitar(player, pedido) : recusar(player, pedido);
  if (de) erro(player, textos.SEM_PEDIDO_DE(de.name));
  else if (!lista.length) erro(player, textos.SEM_PEDIDOS);
  else return menuRecebidos(player, undefined, textos.VARIOS_RECEBIDOS);
}

/** @type {import("../core/comandos.js").ParametroComando[]} */
const ALVO = [{ nome: "jogador", tipo: "jogador" }];
/** @type {import("../core/comandos.js").ParametroComando[]} */
const ALVO_OPCIONAL = [{ nome: "jogador", tipo: "jogador", opcional: true }];

registrarComando({ nome: "tpa", descricao: textos.CMD_TPA, parametros: ALVO }, (p, [alvo]) => enviarPedido(p, alvo, "ir"));
registrarComando({ nome: "tpaqui", descricao: textos.CMD_TPAQUI, parametros: ALVO }, (p, [alvo]) =>
  enviarPedido(p, alvo, "trazer"),
);
registrarComando({ nome: "tpaceitar", descricao: textos.CMD_TPACEITAR, parametros: ALVO_OPCIONAL }, (p, [de]) =>
  responderPorComando(p, de, true),
);
registrarComando({ nome: "tpanegar", descricao: textos.CMD_TPANEGAR, parametros: ALVO_OPCIONAL }, (p, [de]) =>
  responderPorComando(p, de, false),
);

// Vencimento: a cada segundo, tira os pedidos vencidos e avisa quem pediu.
system.runInterval(() => {
  for (const pedido of [...pedidos.values()]) {
    if (system.currentTick < pedido.vence) continue;
    pedidos.delete(pedido.de);
    try {
      msg(porId(pedido.de), textos.EXPIROU(pedido.paraNome));
    } catch (e) {
      registrarErro("Vencimento do TPA", e);
    }
  }
}, TICKS_POR_SEGUNDO);

// Quem sai leva junto os pedidos dele, enviados e recebidos.
world.afterEvents.playerLeave.subscribe(({ playerId, playerName }) => {
  for (const pedido of [...pedidos.values()]) {
    if (pedido.de !== playerId && pedido.para !== playerId) continue;
    pedidos.delete(pedido.de);
    const outroLado = pedido.de === playerId ? pedido.para : pedido.de;
    msg(porId(outroLado), textos.SAIU_DO_JOGO(playerName));
  }
});
