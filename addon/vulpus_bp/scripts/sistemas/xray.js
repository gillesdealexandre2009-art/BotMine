// @ts-check
// Detecção de xray: não mexe em blocos nem pune. Cada pessoa tem uma janela de tempo com os blocos que quebrou; se nela
// os minérios raros (diamante, esmeralda, detritos antigos) passam do mínimo e da porcentagem configurados, a staff online
// recebe um aviso e o caso entra no log. A staff e quem está no criativo não contam.
import { GameMode, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { online } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { Lista } from "../core/forms.js";
import { erro, formatarCoords, registrarErro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/xray.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ t: number, n: string, o: number, b: number, l: string }} AlertaXray */

const RARO = new Set([
  "minecraft:diamond_ore",
  "minecraft:deepslate_diamond_ore",
  "minecraft:emerald_ore",
  "minecraft:deepslate_emerald_ore",
  "minecraft:ancient_debris",
]);
const CHAVE_LOG = "vulpus:xray_log";
const LOG_MAXIMO = 40;
/** Para a memória não crescer: no máximo isso de quebras guardadas por pessoa. */
const MAX_QUEBRAS = 800;
/** Mínimo de blocos quebrados na janela para a porcentagem fazer sentido. */
const MINIMO_BLOCOS = 30;
/** Depois de avisar sobre alguém, fica esse tempo sem avisar de novo (ms). */
const ESPERA_AVISO = 5 * 60 * 1000;
const DIMENSOES = new Set(["minecraft:overworld", "minecraft:nether"]);

/** @type {Map<string, { t: number, raro: boolean }[]>} id → quebras recentes */
const quebras = new Map();
/** @type {Map<string, number>} id → quando foi o último aviso */
const avisados = new Map();

/** @returns {AlertaXray[]} */
export function alertasXray() {
  const lido = lerMundo(CHAVE_LOG, []);
  return (Array.isArray(lido) ? lido : []).filter((a) => a && typeof a.t === "number" && typeof a.n === "string");
}

/** @param {AlertaXray} alerta */
function guardar(alerta) {
  try {
    salvarMundo(CHAVE_LOG, [alerta, ...alertasXray()].slice(0, LOG_MAXIMO));
  } catch (e) {
    registrarErro("Xray: log", e);
  }
}

/**
 * Registra uma quebra e devolve os totais da janela.
 * @param {string} id
 * @param {boolean} raro
 * @param {number} agora
 * @param {number} janelaMs
 */
export function registrarQuebra(id, raro, agora, janelaMs) {
  const lista = quebras.get(id) ?? [];
  lista.push({ t: agora, raro });
  while (lista.length && (agora - lista[0].t > janelaMs || lista.length > MAX_QUEBRAS)) lista.shift();
  quebras.set(id, lista);
  return { blocos: lista.length, minerios: lista.filter((q) => q.raro).length };
}

/**
 * Passou do limite? (porcentagem de minérios raros entre os blocos quebrados)
 * @param {{ blocos: number, minerios: number }} tot
 * @param {number} minimo
 * @param {number} pct
 */
export function suspeito(tot, minimo, pct) {
  return tot.minerios >= minimo && tot.blocos >= MINIMO_BLOCOS && (tot.minerios / tot.blocos) * 100 >= pct;
}

world.afterEvents.playerBreakBlock.subscribe(({ player, block, brokenBlockPermutation, dimension }) => {
  try {
    const cfg = config();
    if (!cfg.xrayLigado || !DIMENSOES.has(dimension.id) || ehStaff(player)) return;
    if (player.getGameMode() === GameMode.Creative) return;
    const agora = Date.now();
    const raro = RARO.has(brokenBlockPermutation.type.id);
    const tot = registrarQuebra(player.id, raro, agora, cfg.xrayJanelaMin * 60000);
    if (!raro || !suspeito(tot, cfg.xrayMinerios, cfg.xrayPct)) return;
    if (agora - (avisados.get(player.id) ?? 0) < ESPERA_AVISO) return;
    avisados.set(player.id, agora);
    const onde = `${dimension.id.replace("minecraft:", "")} ${formatarCoords(block.location)}`;
    guardar({ t: agora, n: player.name, o: tot.minerios, b: tot.blocos, l: onde });
    console.warn(`[Vulpus][Xray] ${player.name} | ${tot.minerios} minérios em ${tot.blocos} blocos | ${onde}`);
    const aviso = textos.AVISO_STAFF(player.name, tot.minerios, tot.blocos, cfg.xrayJanelaMin, onde);
    for (const p of online()) if (ehStaff(p)) p.sendMessage(aviso);
  } catch (e) {
    registrarErro("Xray: quebra", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  quebras.delete(playerId);
  avisados.delete(playerId);
});

// limpeza leve: quem parou de minerar não precisa ficar na memória
system.runInterval(() => {
  try {
    const limite = Date.now() - config().xrayJanelaMin * 60000;
    for (const [id, lista] of quebras) if (!lista.length || lista[lista.length - 1].t < limite) quebras.delete(id);
  } catch (e) {
    registrarErro("Xray: limpeza", e);
  }
}, 1200);

/**
 * Painel da staff: ajustar a detecção e ver os alertas.
 * @param {Player} player
 * @param {(p: Player) => Promise<any>} configurar  abre o formulário das configurações
 */
export async function menuXrayStaff(player, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuXrayStaff(player, configurar);
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(textos.BOTAO_CONFIG, "", async (p) => {
      if (!ehStaff(p)) return;
      await configurar(p);
      await aqui();
    })
    .botao(textos.BOTAO_ALERTAS, "", async (p) => {
      if (!ehStaff(p)) return;
      const lista = alertasXray();
      await new Lista(textos.TITULO_ALERTAS)
        .texto(lista.length ? lista.map(textos.LINHA_ALERTA).join("\n") : textos.ALERTAS_VAZIO)
        .voltar(aqui)
        .abrir(p);
    })
    .abrir(player);
}
