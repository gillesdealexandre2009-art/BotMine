// @ts-check
// Marcadores visuais do evento Ecos dos Ausentes, para achar as coisas:
// 1) RÓTULOS flutuantes (entidade vulpus:texto, via core/flutuante.js) sobre cada objetivo marcado: "✦ nome" e o tipo em cinza.
//    Um por objetivo (tag fixa), recriados se sumirem, removidos ao desmarcar e ao fechar a janela.
// 2) FAROL por jogador: coluna fina de partículas (só ele vê, player.spawnParticle) sobre os objetivos que ELE ainda não fez e que já pode
//    fazer (os que pedem outro objetivo antes ficam sem farol, para não entregar o caminho). Perto (ecosFarolDistancia), com orçamento por ciclo.
// 3) MARCADORES DA STAFF (ligados por pessoa no painel, desligados por padrão): portais, pontos de criatura e "falta marcar E05" (nos
//    palcos do mapa), em partículas e numa actionbar curta com o ponto mais perto.
// Nada roda por tick: ciclo de 20 ticks para partículas (só com gente a ver) e de 100 ticks para os rótulos.
import { system, world } from "@minecraft/server";
import { config, dadosJogador } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { manterTexto } from "../core/flutuante.js";
import { ehStaff } from "../core/permissoes.js";
import { registrarErro } from "../core/util.js";
import { OBJETIVOS } from "../textos/ecos_docs.js";
import * as textos from "../textos/ecos.js";
import { estadoEcos, lerCriaturas, lerPontos, lerPortais, ouvintesMarcas } from "./ecos.js";
import { DIM_ECOS, jogadoresNosEcos, origemEcos } from "./ecos_dimensao.js";
import { PALCOS } from "./ecos_mapa_novo.js";

/** @typedef {import("@minecraft/server").Player} Player */

const PROP_STAFF = "vulpus:ecos_marcadores";
const PASSO_VISUAL = 20;
const PASSO_ROTULOS = 100;
/** Altura do texto acima do bloco marcado (o bloco ocupa y..y+1). */
const ALTURA_ROTULO = 1.8;
export const ALTURA_FAROL = 8;
/** Partículas por jogador por ciclo: farol e marcadores da staff. */
export const ORCAMENTO_FAROL = 24;
export const ORCAMENTO_STAFF = 32;
const ALCANCE_STAFF = 64;
const ALCANCE_AVISO_STAFF = 24;
const PART_FAROL = "minecraft:endrod";
const PART_ENTRADA = "minecraft:villager_happy";
const PART_SAIDA = "minecraft:blue_flame_particle";
const PART_CRIATURA = "minecraft:basic_flame_particle";
const PART_FALTA = "minecraft:redstone_ore_dust_particle";

/** @param {string} id */
export const tagRotulo = (id) => `vulpus_ecos_r_${id}`;
/** Segredos não entregam quem são. */
const NOME_RESERVADO = Object.freeze({ E03: "???", E07: "algo escondido", E11: "???", E09: "Sentinela", E10: "Sentinela" });
const TIPO_ROTULO = Object.freeze({ dialogo: "fale", enigma: "enigma", segredo: "segredo", elite: "luta", memoria: "luta", chefe: "luta" });

/** Texto do rótulo (igual para todos): "✦ nome" e o tipo em cinza. @param {import("../textos/ecos_docs.js").Objetivo} obj */
export function textoRotulo(obj) {
  const nome = NOME_RESERVADO[/** @type {keyof typeof NOME_RESERVADO} */ (obj.id)] ?? obj.quem;
  return `§e✦ ${nome}\n§7${TIPO_ROTULO[obj.tipo] ?? "fale"}`;
}

/** @param {Player} p */
const staffOuDono = (p) => ehStaff(p) || ehDono(p);

/** Rótulos e farol existem com a janela aberta, ou antes dela com a staff lá dentro (para conferir a montagem). Depois de fechar, não. */
function ativoAgora() {
  const st = estadoEcos();
  if (st === "aberto") return true;
  if (st === "depois") return false;
  return jogadoresNosEcos().some(staffOuDono);
}

// ------------------------------------------------------------------------------------ rótulos
let rotulosExistem = true; // começa "sujo": a primeira passada limpa o que sobrou de antes de um reinício

function removerRotulos() {
  if (!rotulosExistem) return;
  rotulosExistem = false;
  for (const o of OBJETIVOS) {
    try {
      manterTexto(tagRotulo(o.id), undefined, "");
    } catch (e) {
      registrarErro("Ecos: remover rótulo", e);
    }
  }
}

/**
 * Cria, atualiza ou remove os rótulos conforme os objetivos marcados (sem duplicar: uma tag por objetivo).
 * @param {boolean} [forcar]  roda mesmo sem ninguém na dimensão (usado ao marcar/desmarcar)
 */
export function sincronizarRotulos(forcar = false) {
  if (!config().ecosRotulos || !ativoAgora()) return removerRotulos();
  if (!forcar && jogadoresNosEcos().length === 0) return;
  rotulosExistem = true;
  const pontos = lerPontos();
  for (const o of OBJETIVOS) {
    const p = pontos[o.id];
    try {
      manterTexto(tagRotulo(o.id), p ? { x: p.x + 0.5, y: p.y + ALTURA_ROTULO, z: p.z + 0.5, d: p.d } : undefined, textoRotulo(o));
    } catch (e) {
      registrarErro("Ecos: rótulo", e);
    }
  }
}

ouvintesMarcas.push(() => sincronizarRotulos(true));
system.runInterval(() => {
  try {
    sincronizarRotulos();
  } catch (e) {
    registrarErro("Ecos: ciclo dos rótulos", e);
  }
}, PASSO_ROTULOS);

// ------------------------------------------------------------------------------------ partículas
/** @param {Player} p @param {string} id @param {{ x: number, y: number, z: number }} loc */
function particula(p, id, loc) {
  try {
    p.spawnParticle(id, loc);
  } catch {
    try {
      p.spawnParticle(PART_FAROL, loc);
    } catch {
      // chunk descarregado ou jogador saindo
    }
  }
}

/**
 * Coluna de partículas sobre um bloco; devolve quantas gastou do orçamento.
 * @param {Player} p
 * @param {string} id
 * @param {{ x: number, y: number, z: number }} base
 * @param {number} altura
 * @param {number} passo
 * @param {number} orcamento
 */
function coluna(p, id, base, altura, passo, orcamento) {
  let n = 0;
  for (let h = 1.2; h < altura + 1.2 && n < orcamento; h += passo) {
    particula(p, id, { x: base.x + 0.5, y: base.y + h, z: base.z + 0.5 });
    n++;
  }
  return n;
}

/** Farol de quem ainda não fez: só os objetivos já liberados para essa pessoa, perto, do mais perto ao mais longe. @param {Player} p */
function farol(p) {
  const feitos = dadosJogador(p).ecos.feitos;
  const dist = config().ecosFarolDistancia;
  const l = p.location;
  const pontos = lerPontos();
  /** @type {{ d: number, p: { x: number, y: number, z: number } }[]} */
  const cand = [];
  for (const o of OBJETIVOS) {
    const pt = pontos[o.id];
    if (!pt || pt.d !== p.dimension.id || feitos.includes(o.id)) continue;
    if (!(o.requer ?? []).every((r) => feitos.includes(r))) continue;
    const d = Math.hypot(pt.x + 0.5 - l.x, pt.y - l.y, pt.z + 0.5 - l.z);
    if (d <= dist) cand.push({ d, p: pt });
  }
  cand.sort((a, b) => a.d - b.d);
  let sobra = ORCAMENTO_FAROL;
  for (const c of cand) {
    if (sobra <= 0) break;
    sobra -= coluna(p, PART_FAROL, c.p, ALTURA_FAROL, 1, sobra);
  }
}

// ------------------------------------------------------------------------------------ marcadores da staff
/** @type {Set<string>} quem está com os marcadores ligados (lido da propriedade do jogador) */
const ligados = new Set();

/** @param {Player} p */
export const marcadoresLigados = (p) => ligados.has(p.id);

/**
 * Liga ou desliga os marcadores só para esta pessoa (staff e dono; fica gravado nela).
 * @param {Player} p
 * @returns {boolean | undefined} novo estado, ou undefined se não pode
 */
export function alternarMarcadores(p) {
  if (!staffOuDono(p)) return undefined;
  const novo = !ligados.has(p.id);
  if (novo) ligados.add(p.id);
  else ligados.delete(p.id);
  try {
    p.setDynamicProperty(PROP_STAFF, novo ? true : undefined);
  } catch (e) {
    registrarErro("Ecos: gravar marcadores", e);
  }
  return novo;
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  try {
    if (initialSpawn && player.getDynamicProperty(PROP_STAFF) === true && staffOuDono(player)) ligados.add(player.id);
  } catch {
    // sem propriedade: desligado
  }
});
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ligados.delete(playerId);
  vistos.delete(playerId);
});

const NOME_TIPO = Object.freeze({ errante: "Errante", sentinela: "Sentinela", memoria: "Memória", testemunho: "Testemunho" });

/** Pontos que a staff vê, em coordenadas do mundo. @returns {{ x: number, y: number, z: number, d: string, texto: string, part: string }[]} */
function pontosDaStaff() {
  const r = [];
  const portais = lerPortais();
  if (portais.entrada) r.push({ ...portais.entrada, texto: "Entrada", part: PART_ENTRADA });
  if (portais.saida) r.push({ ...portais.saida, texto: "Saída", part: PART_SAIDA });
  for (const c of lerCriaturas()) {
    r.push({ x: c.x, y: c.y, z: c.z, d: c.d, texto: `${NOME_TIPO[/** @type {keyof typeof NOME_TIPO} */ (c.t)] ?? c.t}${c.obj ? `→${c.obj}` : ` x${c.max}`}`, part: PART_CRIATURA });
  }
  const marcados = lerPontos();
  const o = origemEcos();
  for (const pal of PALCOS) {
    if (marcados[pal.id]) continue;
    r.push({ x: o.x + pal.x, y: o.y + pal.y, z: o.z + pal.z, d: DIM_ECOS, texto: `falta marcar ${pal.id}`, part: PART_FALTA });
  }
  return r;
}

/** @param {Player} p */
function marcadoresStaff(p) {
  const l = p.location;
  const aqui = pontosDaStaff()
    .filter((m) => m.d === p.dimension.id)
    .map((m) => ({ m, d: Math.hypot(m.x + 0.5 - l.x, m.y - l.y, m.z + 0.5 - l.z) }))
    .filter((c) => c.d <= ALCANCE_STAFF)
    .sort((a, b) => a.d - b.d);
  let sobra = ORCAMENTO_STAFF;
  for (const c of aqui) {
    if (sobra <= 0) break;
    sobra -= coluna(p, c.m.part, c.m, 6, 1.5, sobra);
  }
  const perto = aqui[0];
  if (perto && perto.d <= ALCANCE_AVISO_STAFF) {
    try {
      p.onScreenDisplay.setActionBar(textos.MARCADOR_PERTO(perto.m.texto));
    } catch {
      // saindo
    }
  }
}

// ------------------------------------------------------------------------------------ ciclo visual
/** @type {Set<string>} quem já estava na dimensão no ciclo anterior (a chegada pede os rótulos na hora) */
const vistos = new Set();

system.runInterval(() => {
  try {
    const dentro = jogadoresNosEcos();
    const agora = new Set(dentro.map((p) => p.id));
    let chegou = false;
    for (const id of agora) if (!vistos.has(id)) chegou = true;
    vistos.clear();
    for (const id of agora) vistos.add(id);
    if (chegou) sincronizarRotulos();
    const c = config();
    if (c.ecosFarol && dentro.length > 0 && ativoAgora()) for (const p of dentro) farol(p);
    if (ligados.size > 0) {
      for (const p of world.getAllPlayers()) if (ligados.has(p.id) && staffOuDono(p)) marcadoresStaff(p);
    }
  } catch (e) {
    registrarErro("Ecos: ciclo visual", e);
  }
}, PASSO_VISUAL);
