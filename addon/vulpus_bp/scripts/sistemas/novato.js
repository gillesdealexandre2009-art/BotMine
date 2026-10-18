// @ts-check
// Primeiros passos: reconhece quem acabou de chegar e mostra missões de apresentação (abrir o menu, diária, casa, clã,
// masmorra, Raposa Mãe). Tudo é lido dos sistemas que já existem, sem contador novo. Cada missão paga Caudas uma vez só
// por pessoa (não se repete, então não precisa de teto diário). Quem passou da janela de dias não é incomodado.
import { system, world } from "@minecraft/server";
import { ITEM_MENU } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, lerMundo, salvarMundo } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { msg, registrarErro, som } from "../core/util.js";
import { barra } from "../glyphs.js";
import * as textos from "../textos/novato.js";
import { adicionarCaudas } from "./caudas.js";
import { claDe } from "./cla_dados.js";
import { darConquista } from "./conquistas.js";
import { progresso, temSelo } from "./masm_estado.js";
import { darFicha } from "./pets_bonus.js";
import { irSpawn } from "./spawn.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ m: number, fim: boolean, a: boolean }} Estado  m = máscara das missões já pagas; a = já viu a chegada */

const PREFIXO = "vulpus:nv:";
const PASSO = 100;
const ENTRE_LEMBRETES = 3600;
const ESPERA_CHEGADA = 220;
const DIA_MS = 86_400_000;
const CONQUISTA = "passos";

/** @type {Map<string, Estado>} */
const cache = new Map();
/** @type {Map<string, number>} */
const lembrou = new Map();
/** Quem abriu o menu nesta sessão (missão do menu). */
const abriuMenu = new Set();

/** @param {string} id @returns {Estado} */
function estado(id) {
  let e = cache.get(id);
  if (!e) {
    const s = /** @type {any} */ (lerMundo(PREFIXO + id, {}));
    e = { m: Number.isFinite(s?.m) ? s.m : 0, fim: s?.fim === true, a: s?.a === true };
    cache.set(id, e);
  }
  return e;
}

/** @param {string} id */
function gravar(id) {
  const e = cache.get(id);
  if (e) salvarMundo(PREFIXO + id, e);
}

/** Chamado quando a pessoa abre o menu principal (item ou comando). @param {Player} player */
export function marcarMenu(player) {
  abriuMenu.add(player.id);
  system.run(() => conferir(player));
}

/**
 * @param {string} id
 * @param {Player} player
 */
function cumpriu(id, player) {
  switch (id) {
    case "menu":
      return abriuMenu.has(player.id);
    case "diaria":
      return dadosJogador(player).diaria.dia !== "";
    case "casa":
      return dadosJogador(player).casas.length > 0;
    case "cla":
      return !!claDe(player);
    case "masmorra": {
      const p = progresso(player.id);
      return p.selos > 0 || p.inicio.some((t) => t > 0);
    }
    case "guardiao":
      return temSelo(player.id, 1);
    default:
      return false;
  }
}

/** Ainda está na janela dos primeiros passos? @param {Player} player */
export function ehNovato(player) {
  const cfg = config();
  if (!cfg.novatoLigado || estado(player.id).fim) return false;
  const primeira = dadosJogador(player).primeira;
  return primeira > 0 && Date.now() - primeira < cfg.novatoDias * DIA_MS;
}

/**
 * Confere as missões e paga as que acabaram de ser cumpridas.
 * @param {Player} player
 */
function conferir(player) {
  if (!player.isValid || !ehNovato(player)) return;
  const cfg = config();
  const e = estado(player.id);
  let mudou = false;
  textos.MISSOES.forEach((m, i) => {
    const bit = 1 << i;
    if (e.m & bit || !cumpriu(m.id, player)) return;
    e.m |= bit;
    mudou = true;
    if (cfg.novatoCaudas > 0) adicionarCaudas(player, cfg.novatoCaudas);
    msg(player, textos.MISSAO_FEITA(m.nome, cfg.novatoCaudas));
    som(player, "random.levelup", { pitch: 1.2, volume: 0.6 });
  });
  if (e.m === (1 << textos.MISSOES.length) - 1 && !e.fim) {
    e.fim = true;
    mudou = true;
    if (cfg.novatoBonus > 0) adicionarCaudas(player, cfg.novatoBonus);
    darConquista(player, CONQUISTA);
    darFicha(player, 1, "primeiros passos completos");
    mostrarTitulo(player, textos.TITULO_FINAL, { subtitulo: textos.SUBTITULO_FINAL });
    msg(player, textos.FINAL_FEITO(cfg.novatoBonus));
  }
  if (mudou) gravar(player.id);
}

/**
 * Tela dos primeiros passos.
 * @param {Player} player
 */
export async function abrirComecar(player) {
  conferir(player);
  const e = estado(player.id);
  const total = textos.MISSOES.length;
  const feitas = textos.MISSOES.filter((_, i) => e.m & (1 << i)).length;
  const proxima = textos.MISSOES.find((_, i) => !(e.m & (1 << i)));
  const linhas = [textos.CORPO(feitas, total, barra(feitas / total, 10)), ""];
  for (const [i, m] of textos.MISSOES.entries()) linhas.push(e.m & (1 << i) ? textos.FEITA(m.nome) : textos.PENDENTE(m.nome));
  linhas.push("", proxima ? textos.PROXIMA(proxima.dica) : textos.TUDO_FEITO);
  await new Lista(textos.TITULO).texto(linhas.join("\n")).botao(textos.BOTAO_SPAWN, undefined, irSpawn).abrir(player);
}

registrarComando({ nome: "comecar", descricao: textos.CMD_COMECAR }, (p) => abrirComecar(p));

// Quem entra pela primeira vez vê o título dos primeiros passos depois do de boas-vindas.
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    try {
      if (!player.isValid || !ehNovato(player)) return;
      const e = estado(player.id);
      if (e.a) return;
      e.a = true;
      gravar(player.id);
      mostrarTitulo(player, textos.TITULO_CHEGADA, { subtitulo: textos.SUBTITULO_CHEGADA(player.name) });
    } catch (err) {
      registrarErro("Primeiros passos (chegada)", err);
    }
  }, ESPERA_CHEGADA);
});

// Usar o item do menu conta como abrir o menu.
world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
  if (itemStack.typeId === ITEM_MENU) abriuMenu.add(source.id);
});

// De tempos em tempos confere as missões de quem está na janela e lembra a próxima.
system.runInterval(() => {
  try {
    const agora = system.currentTick;
    for (const p of online()) {
      if (!ehNovato(p)) continue;
      conferir(p);
      const e = estado(p.id);
      if (e.fim || agora - (lembrou.get(p.id) ?? 0) < ENTRE_LEMBRETES) continue;
      lembrou.set(p.id, agora);
      const proxima = textos.MISSOES.find((_, i) => !(e.m & (1 << i)));
      if (proxima) p.onScreenDisplay.setActionBar(textos.LEMBRETE(proxima.nome, proxima.dica));
    }
  } catch (e) {
    registrarErro("Primeiros passos", e);
  }
}, PASSO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  abriuMenu.delete(playerId);
  lembrou.delete(playerId);
  cache.delete(playerId);
});
