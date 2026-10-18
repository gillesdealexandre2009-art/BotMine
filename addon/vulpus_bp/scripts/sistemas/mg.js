// @ts-check
// Plataforma dos minigames: a dimensão própria (vulpus:minigames, vazio), as áreas sempre carregadas, a entrada com guarda-volumes,
// a saída que devolve tudo e a recuperação de quem saiu no meio (queda do jogo ou do servidor). Os jogos (mg_skywars.js) usam isto.
import { GameMode, system, world } from "@minecraft/server";
import { registrarComando } from "../core/comandos.js";
import { registrarBloqueioTeleporte } from "../core/teleporte.js";
import { erro, msg, registrarErro } from "../core/util.js";
import * as textos from "../textos/mg.js";
import { AREAS, HUB, posCofre } from "./mg_arena.js";
import { devolverItens, guardaDe, guardarItens, iniciarTransicao, limparGuarda } from "./mg_cofre.js";
import { emMinigame, marcarDentro, marcarFora, registrarSaida } from "./mg_estado.js";
import { localSpawn } from "./spawn.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */

export const DIM_ID = "vulpus:minigames";

let registrada = false;
let erroRegistro = "";
// A dimensão só pode ser registrada na partida do sistema (startup). Fica no vazio (gerador "void").
system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
  if (!dimensionRegistry) return;
  try {
    dimensionRegistry.registerCustomDimension(DIM_ID);
    registrada = true;
  } catch (e) {
    erroRegistro = String(e);
  }
});

/** A dimensão dos minigames, ou undefined se o mundo não a tem. */
export function dimensaoMg() {
  try {
    return world.getDimension(DIM_ID);
  } catch {
    return undefined;
  }
}

export const infoRegistro = () => ({ registrada, erro: erroRegistro });

/** Ponto de chegada no hub. */
export const pontoHub = () => ({ x: HUB.x + 0.5, y: HUB.y + 1, z: HUB.z + 0.5 });

/** As áreas que podem ser mantidas carregadas (ticking areas), só enquanto precisam. */
const NOMES_AREAS = /** @type {const} */ ({ hub: "vulpus_mg_hub", arena: "vulpus_mg_arena" });

/**
 * Cria, se ainda não existem, as áreas carregadas pedidas. Elas só existem durante uma construção ou uma partida: deixar tudo
 * carregado o tempo todo deixava a abertura do mundo lenta. Devolve false se algo falhou.
 * @param {("hub" | "arena")[]} quais
 * @returns {Promise<boolean>}
 */
export async function prepararAreas(quais = ["hub", "arena"]) {
  const dim = dimensaoMg();
  if (!dim) return false;
  const gerente = world.tickingAreaManager;
  for (const q of quais) {
    const nome = NOMES_AREAS[q];
    const a = AREAS[q];
    try {
      if (gerente.getTickingArea(nome)) continue;
      await gerente.createTickingArea(nome, { dimension: dim, from: a.from, to: a.to });
    } catch (e) {
      registrarErro(`Minigames: área ${nome}`, e);
      return false;
    }
  }
  return true;
}

/**
 * Solta as áreas carregadas (o que estiver nelas descarrega quando ninguém está perto).
 * @param {("hub" | "arena")[]} quais
 */
export function soltarAreas(quais = ["hub", "arena"]) {
  const gerente = world.tickingAreaManager;
  for (const q of quais) {
    try {
      if (gerente.getTickingArea(NOMES_AREAS[q])) gerente.removeTickingArea(NOMES_AREAS[q]);
    } catch (e) {
      registrarErro(`Minigames: soltar área ${q}`, e);
    }
  }
}

/**
 * Espera os pontos estarem carregados (confere a cada 4 ticks).
 * @param {Dimension} dim
 * @param {{ x: number, y: number, z: number }[]} pontos
 * @param {number} tentativas
 * @param {(ok: boolean) => void} aoFim
 */
export function esperarCarga(dim, pontos, tentativas, aoFim) {
  let n = 0;
  const confere = () => {
    let ok = false;
    try {
      ok = pontos.every((p) => dim.isChunkLoaded(p) && !!dim.getBlock(p));
    } catch {
      ok = false;
    }
    if (ok) return aoFim(true);
    if (++n >= tentativas) return aoFim(false);
    system.runTimeout(confere, 4);
  };
  confere();
}

/** @param {Player} player @param {Dimension} dim */
function irAoHub(player, dim) {
  try {
    player.teleport(pontoHub(), { dimension: dim, rotation: { x: 0, y: 0 } });
  } catch (e) {
    registrarErro("Minigames: ir ao hub", e);
  }
}

/** A pessoa vai para o modo do minigame: aventura, sem efeitos, vida e fome cheias. @param {Player} player */
export function prepararParaMinigame(player) {
  try {
    player.setGameMode(GameMode.Adventure);
    for (const e of player.getEffects?.() ?? []) player.removeEffect(e.typeId);
    player.getComponent("minecraft:health")?.resetToMaxValue();
    player.addEffect("saturation", 20 * 600, { amplifier: 0, showParticles: false });
    player.extinguishFire?.();
  } catch (e) {
    registrarErro("Minigames: preparar", e);
  }
}

/**
 * Leva a pessoa ao hub e guarda o que ela leva. `pronto(ok, motivo)` diz se deu certo; se não deu, ela já voltou para onde estava
 * e nada foi mexido.
 * @param {Player} player
 * @param {(ok: boolean, motivo?: string) => void} pronto
 */
export function admitir(player, pronto) {
  const dim = dimensaoMg();
  if (!dim) return pronto(false, textos.SEM_DIMENSAO);
  iniciarTransicao(player);
  marcarDentro(player.id);
  irAoHub(player, dim);
  /** @param {string} motivo */
  const falhou = (motivo) => {
    liberar(player, () => pronto(false, textos.COFRE_FALHOU(motivo)));
  };
  esperarCarga(dim, [pontoHub(), posCofre(0).a], 30, (carregou) => {
    if (!player.isValid) return; // a marca fica gravada e a devolução acontece na próxima entrada
    if (!carregou) return falhou("a área não carregou");
    const r = guardarItens(player);
    if (!r.ok) return falhou(r.motivo ?? "erro");
    prepararParaMinigame(player);
    pronto(true);
  });
}

/** Quem marcou o ponto de renascimento numa cama dos minigames volta a renascer no mundo comum. @param {Player} p */
export function limparSpawnMg(p) {
  try {
    const sp = p.getSpawnPoint?.();
    if (sp && sp.dimension.id === DIM_ID) p.setSpawnPoint(undefined);
  } catch {
    // sem ponto marcado: nada a limpar
  }
}

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  if (player.dimension.id !== DIM_ID) limparSpawnMg(player);
});

/**
 * Devolve as coisas, o modo de jogo e leva a pessoa de volta para onde ela estava. Serve também para quem ficou preso.
 * @param {Player} player
 * @param {(ok: boolean, motivo?: string) => void} [pronto]
 */
export function liberar(player, pronto) {
  const g = guardaDe(player.id);
  const dim = dimensaoMg();
  const finalizar = () => {
    if (!player.isValid) return;
    try {
      player.getComponent("minecraft:health")?.resetToMaxValue();
      for (const e of player.getEffects?.() ?? []) player.removeEffect(e.typeId);
      player.setGameMode(/** @type {any} */ (GameMode)[g?.modo ?? "Survival"] ?? GameMode.Survival);
      const r = g?.ret;
      if (r && world.getDimension(r.d)) player.teleport({ x: r.x, y: r.y, z: r.z }, { dimension: world.getDimension(r.d), rotation: { x: r.rx, y: r.ry } });
      else {
        const s = localSpawn();
        if (s) player.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension(s.d) });
      }
    } catch (e) {
      registrarErro("Minigames: voltar", e);
    }
    limparSpawnMg(player);
    limparGuarda(player.id);
    marcarFora(player.id);
    registrarSaida(player.id, system.currentTick);
    msg(player, textos.VOLTOU);
    pronto?.(true);
  };
  if (!g || g.i < 0 || !dim) return finalizar();
  // as coisas estão nos cofres: a pessoa precisa estar perto do hub, com a sala carregada
  if (player.dimension.id !== DIM_ID || Math.hypot(player.location.x - HUB.x, player.location.z - HUB.z) > 40) irAoHub(player, dim);
  esperarCarga(dim, [pontoHub(), posCofre(g.i).a], 40, (ok) => {
    if (!player.isValid) return;
    if (!ok) {
      erro(player, "Não consegui devolver suas coisas agora. Tente /vulpus:sairminigame de novo em instantes.");
      return pronto?.(false, "área não carregou");
    }
    const r = devolverItens(player);
    if (!r.ok) {
      erro(player, `Não consegui devolver suas coisas (${r.motivo}). Avise a staff; elas continuam guardadas.`);
      return pronto?.(false, r.motivo);
    }
    finalizar();
  });
}

// Quem entrou no jogo com coisas guardadas (saiu no meio de um minigame, queda do jogo ou do servidor) recebe tudo de volta.
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    try {
      recuperar(player);
    } catch (e) {
      registrarErro("Minigames: recuperar", e);
    }
  }, 60);
});

/** @param {Player} player */
export function recuperar(player) {
  if (!player.isValid || emMinigame(player)) return;
  const g = guardaDe(player.id);
  if (g) {
    msg(player, textos.RECUPERANDO);
    marcarDentro(player.id);
    liberar(player);
    return;
  }
  // sem marca, mas parada na dimensão dos minigames: volta para o spawn do mundo
  if (player.dimension.id === DIM_ID) {
    const s = localSpawn();
    if (s) player.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension(s.d) });
  }
}

// Em minigame não dá para usar /home, /tpa, /spawn, /rtp, /voltar nem os portais.
registrarBloqueioTeleporte((p) => (emMinigame(p) ? textos.TP_BLOQUEADO : undefined));

/** O jogo registra aqui o que o comando de sair faz. */
export const ganchos = { sair: /** @type {(p: Player) => void} */ (() => {}) };

registrarComando({ nome: "sairminigame", descricao: textos.CMD_SAIR }, (p) => ganchos.sair(p));
