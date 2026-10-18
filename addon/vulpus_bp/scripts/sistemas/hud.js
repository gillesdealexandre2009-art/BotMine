// @ts-check
// Scoreboard lateral: o texto vai no title com FLAG_SIDEBAR e o RP (ui/vulpus/vulpus_hud.json) desenha a
// caixa. A actionbar fica livre para os avisos normais. Protocolo: docs/spec/03_spec_fase2.md §7.
import { system, world } from "@minecraft/server";
import { online, TAG_SUMIDO } from "../core/jogadores.js";
import { filtroLigadoPara } from "../core/filtro_tela.js";
import { tituloLivre } from "../core/tela.js";
import { dadosJogador } from "../core/db.js";
import { direcao, registrarErro } from "../core/util.js";
import * as textos from "../textos/hud.js";
import { hudLigada } from "./ajustes.js";
import { valorCabeca } from "./cacada.js";
import { saldo } from "./caudas.js";
import { claDe, EMBLEMAS, tagPintada } from "./cla_dados.js";
import { guerraDe, ladoDe } from "./cla_guerra.js";
import { infoSidebar } from "./ctf.js";
import { CARGOS, cargoDe, ehKitsune } from "./identidade.js";
import { apelidoDe, nomeExibido, temaNomeDe } from "./kitsune.js";
import { infoNivel } from "./niveis.js";
import { glitchHud } from "./arg.js";
import { glitchHudIntervalo } from "./intervalo.js";
import { linhasHud as linhasMinigame } from "./mg_motor.js";
import { linhaSpleef } from "./spleef.js";

/** @typedef {import("@minecraft/server").Player} Player */

/** Marca do title da sidebar (igual à do vulpus_hud.json; o verificar_ui.py confere). */
export const FLAG_SIDEBAR = "§v§s§b§r";
/** Marcador do filtro de câmera antiga, logo depois de FLAG_SIDEBAR (igual ao do vulpus_filtro.json e do vulpus_hud.json). */
export const FLAG_FILTRO = "§v§f§i§l§r";

/** De quantos em quantos ticks o loop olha cada jogador. */
const TICKS_CICLO = 10;
/** Intervalo mínimo entre dois envios com texto novo. */
const TICKS_ENTRE_ENVIOS = 20;
/** Intervalo mínimo quando só a linha de posição/direção mudou (andando: cada bloco novo seria um title novo). */
const TICKS_ENTRE_ENVIOS_POSICAO = 30;
/** Reenvio do mesmo texto (recupera a caixa depois de um rebuild do HUD, como trocar o GUI scale). */
const TICKS_REENVIO = 200;
/** Quanto tempo o "+N" fica aparecendo depois que o saldo muda. */
const TICKS_MUDANCA = 60;
/** Espera do primeiro envio depois de entrar (cliente carregando). */
const TICKS_PRIMEIRO_ENVIO = 40;
const TEMPOS = { fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20 };

/** @type {Map<string, { texto: string, chave: string, tick: number }>} id → último title enviado (só a flag = desligada); chave = o texto sem a linha de posição */
const enviados = new Map();
/** @type {Map<string, number>} id → tick a partir do qual a sidebar pode enviar */
const esperas = new Map();
/** @type {Map<string, number>} id → saldo no ciclo anterior */
const ultimoSaldo = new Map();
/** @type {Map<string, { valor: number, ate: number }>} id → mudança de saldo em destaque */
const mudancas = new Map();

/**
 * Mudança de saldo desde o ciclo anterior, somada enquanto o destaque estiver valendo.
 * @param {Player} player
 * @param {number} caudas
 */
function mudancaRecente(player, caudas) {
  const antes = ultimoSaldo.get(player.id);
  ultimoSaldo.set(player.id, caudas);
  const atual = mudancas.get(player.id);
  const vigente = atual && atual.ate > system.currentTick ? atual.valor : 0;
  if (antes !== undefined && caudas !== antes) {
    const valor = vigente + caudas - antes;
    mudancas.set(player.id, { valor, ate: system.currentTick + TICKS_MUDANCA });
    return valor;
  }
  if (!vigente) mudancas.delete(player.id);
  return vigente;
}

/**
 * Texto completo do title (flag + 6 a 14 linhas: nome Kitsune, cargo, cabeça a prêmio, Spleef, clã, guerra e
 * bandeiras são opcionais).
 * Cargo, Kitsune e apelido vêm da mesma regra do nameTag.
 * @param {Player} player
 * @param {number} caudas
 * @param {number} mudanca
 * @param {number} quantosOnline
 * @returns {{ texto: string, chave: string }}  chave = o texto sem a linha de posição e direção
 */
function montar(player, caudas, mudanca, quantosOnline) {
  const mg = linhasMinigame(player);
  if (mg) {
    const finais = textos.LINHAS_MINIGAME(mg, caudas, mudanca);
    return { texto: FLAG_SIDEBAR + (filtroLigadoPara(player) ? FLAG_FILTRO : "") + finais.join("\n"), chave: finais.join("\n") };
  }
  const { nivel, fracao, rank } = infoNivel(player);
  const { x, y, z } = player.location;
  const rumo = direcao(player.getRotation().y);
  const cargo = cargoDe(player);
  const cla = claDe(player);
  const guerra = cla ? guerraDe(cla.id) : undefined;
  const lado = guerra && cla ? ladoDe(guerra, cla.id) : undefined;
  const outro = lado === "a" ? "b" : "a";
  const linhas = textos.LINHAS({
    nome: apelidoDe(player) || temaNomeDe(player) ? nomeExibido(player) : null,
    cla:
      cla && dadosJogador(player).ajustes.cla
        ? { emblema: EMBLEMAS[cla.emblema] ?? EMBLEMAS[0], tag: tagPintada(cla), nome: cla.nome }
        : null,
    guerra:
      guerra && lado
        ? {
            ativa: guerra.estado === "ativa",
            nossos: guerra.pontos[lado],
            deles: guerra.pontos[outro],
            tagDeles: guerra.tags[outro],
            minutos: Math.max(0, Math.ceil((guerra.inicio - Date.now()) / 60000)),
          }
        : null,
    ctf: guerra && cla ? infoSidebar(player, cla.id, guerra) : null,
    cabeca: valorCabeca(player.id),
    minigame: linhaSpleef(player),
    rank,
    cargo: cargo ? CARGOS[cargo] : null,
    kitsune: ehKitsune(player),
    nivel,
    fracao,
    caudas,
    mudanca,
    online: quantosOnline,
    x,
    y,
    z,
    direcao: rumo,
  });
  const finais = glitchHudIntervalo(player, glitchHud(player, linhas));
  const local = textos.LINHA_LOCAL(x, y, z, rumo);
  return { texto: FLAG_SIDEBAR + (filtroLigadoPara(player) ? FLAG_FILTRO : "") + finais.join("\n"), chave: finais.filter((l) => l !== local).join("\n") };
}

/**
 * @param {Player} player
 * @param {string} texto
 */
function enviar(player, texto, chave = texto) {
  player.onScreenDisplay.setTitle(texto, TEMPOS);
  enviados.set(player.id, { texto, chave, tick: system.currentTick });
}

/**
 * Um ciclo da sidebar para o jogador: envia só quando mudou, ou no reenvio de segurança.
 * @param {Player} player
 * @param {number} quantosOnline
 */
function atualizar(player, quantosOnline) {
  const agora = system.currentTick;
  const espera = esperas.get(player.id);
  if (espera !== undefined) {
    if (espera > agora) return;
    esperas.delete(player.id);
  }
  const caudas = saldo(player);
  const mudanca = mudancaRecente(player, caudas);
  if (!tituloLivre(player)) return;
  const ultimo = enviados.get(player.id);
  if (!hudLigada(player)) {
    // scoreboard desligado: só a flag (e o marcador do filtro, se ligado, para o filtro continuar sem a caixa)
    const alvo = FLAG_SIDEBAR + (filtroLigadoPara(player) ? FLAG_FILTRO : "");
    if (ultimo ? ultimo.texto !== alvo : alvo !== FLAG_SIDEBAR) enviar(player, alvo);
    else if (ultimo && alvo !== FLAG_SIDEBAR && agora - ultimo.tick >= TICKS_REENVIO) enviar(player, alvo);
    return;
  }
  const { texto, chave } = montar(player, caudas, mudanca, quantosOnline);
  const passou = ultimo ? agora - ultimo.tick : Infinity;
  if (texto === ultimo?.texto) {
    if (passou >= TICKS_REENVIO) enviar(player, texto, chave);
    return;
  }
  const soPosicao = ultimo !== undefined && chave === ultimo.chave;
  if (passou >= (soPosicao ? TICKS_ENTRE_ENVIOS_POSICAO : TICKS_ENTRE_ENVIOS)) enviar(player, texto, chave);
}

system.runInterval(() => {
  const jogadores = online();
  const contagem = jogadores.filter((p) => !p.hasTag(TAG_SUMIDO)).length; // quem está "fora" não conta no online
  for (const player of jogadores) {
    try {
      atualizar(player, contagem);
    } catch (e) {
      registrarErro(`Sidebar de ${player.name}`, e);
    }
  }
}, TICKS_CICLO);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) {
    enviados.delete(player.id);
    esperas.set(player.id, system.currentTick + TICKS_PRIMEIRO_ENVIO);
    return;
  }
  // Respawn: força o reenvio no próximo ciclo, sem perder se a sidebar estava ligada.
  const ultimo = enviados.get(player.id);
  if (ultimo) ultimo.tick = -Infinity;
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  enviados.delete(playerId);
  esperas.delete(playerId);
  ultimoSaldo.delete(playerId);
  mudancas.delete(playerId);
});
