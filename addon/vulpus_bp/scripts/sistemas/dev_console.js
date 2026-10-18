// @ts-check
// Ferramentas de desenvolvimento, só pelo console do servidor (`scriptevent vulpus:dev <comando>`): constroem o Intervalo e os mapas dos
// minigames sem ninguém online e escrevem o resultado no log, para validar a obra no jogo de verdade (blocos inválidos, falhas, tempo).
// Jogador nenhum consegue usar: o evento só vale quando vem do console (ScriptEventSource.Server).
import { ScriptEventSource, system, world } from "@minecraft/server";
import { dimensaoIntervalo, estadoConstrucao, intervaloConstruido, construirIntervalo, pontoChegada } from "./intervalo.js";
import { PONTOS } from "./intervalo_mapa.js";
import { JOGOS, construir, diagnostico, estadoPartida } from "./mg_motor.js";

/** @param {string} t */
const log = (t) => console.warn(`[DEV] ${t}`);

/** Espera uma condição (confere a cada segundo). @param {() => boolean} cond @param {number} segundos */
async function esperar(cond, segundos) {
  for (let i = 0; i < segundos; i++) {
    if (cond()) return true;
    await new Promise((r) => system.runTimeout(() => r(undefined), 20));
  }
  return cond();
}

async function intervalo() {
  const t0 = Date.now();
  log("Intervalo: começando a construir");
  const comecou = await construirIntervalo(undefined);
  log(`Intervalo: começou=${comecou}`);
  const fim = await esperar(() => !estadoConstrucao().ocupado, 300);
  log(`Intervalo: terminou=${fim} construido=${intervaloConstruido()} em ${Math.round((Date.now() - t0) / 1000)} s reais`);
  const c = pontoChegada();
  const dim = dimensaoIntervalo();
  if (!c || !dim) return log("Intervalo: sem ponto de chegada ou dimensão");
  // a obra solta a área carregada: carrega de novo só para conferir
  const o = { x: c.x - 2.5, y: c.y - 1, z: c.z - 20.5 };
  const gerente = world.tickingAreaManager;
  try {
    gerente.removeTickingArea("vulpus_dev");
  } catch {
    // não existia
  }
  await gerente.createTickingArea("vulpus_dev", { dimension: dim, from: { x: Math.floor(o.x), y: Math.floor(o.y) - 6, z: Math.floor(o.z) }, to: { x: Math.floor(o.x) + 192, y: Math.floor(o.y) + 20, z: Math.floor(o.z) + 40 } });
  log(`Intervalo: área de conferência carregada=${await esperar(() => dim.isChunkLoaded({ x: o.x + 100, y: o.y, z: o.z + 20 }), 60)}`);
  // confere o bloco de cada ponto clicável (o jogo só aceita blocos válidos; ar no lugar de um ponto seria um erro)
  /** @type {Record<string, string[]>} */
  const porTipo = {};
  let vazios = 0;
  for (const p of PONTOS) {
    const b = dim.getBlock({ x: Math.floor(o.x + p.x), y: Math.floor(o.y + p.y), z: Math.floor(o.z + p.z) });
    const id = b?.typeId ?? "(não carregado)";
    (porTipo[p.t] ??= []).push(id);
    if (id === "minecraft:air" || id === "(não carregado)") vazios++;
  }
  log(`Intervalo: ${PONTOS.length} pontos clicáveis, ${vazios} sem bloco`);
  for (const [t, ids] of Object.entries(porTipo)) log(`  ${t}: ${[...new Set(ids)].join(", ")}`);
  try {
    gerente.removeTickingArea("vulpus_dev");
  } catch {
    // já saiu
  }
  log("Intervalo: conferência terminada");
}

async function minigames() {
  const dim = world.getDimension("vulpus:minigames");
  void dim;
  log("Minigames: construindo hub e cofres");
  await construir(undefined, true);
  log(`Minigames: hub/cofres prontos=${await esperar(() => estadoPartida().estado === "espera", 400)}`);
  for (const jogo of JOGOS.values()) {
    for (const mapa of jogo.mapas) {
      const t0 = Date.now();
      await construir(undefined, false, { jogoId: jogo.id, mapaId: mapa.id });
      const pronto = await esperar(() => estadoPartida().estado === "espera", 400);
      log(`Minigames: ${jogo.nome} / ${mapa.nome}: pronto=${pronto} em ${Math.round((Date.now() - t0) / 1000)} s reais`);
    }
  }
  log(`Minigames: diagnóstico ${JSON.stringify(diagnostico())}`);
}

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== "vulpus:dev" || ev.sourceType !== ScriptEventSource.Server) return;
  const cmd = ev.message.trim();
  const rodar = cmd === "intervalo" ? intervalo : cmd === "minigames" ? minigames : undefined;
  if (!rodar) return log(`comando desconhecido: ${cmd}`);
  rodar().catch((e) => log(`erro em ${cmd}: ${e}`));
});
