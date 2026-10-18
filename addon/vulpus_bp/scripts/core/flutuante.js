// @ts-check
// Texto flutuante: uma entidade vulpus:texto invisível só com o nome (o jogo mostra o nome acima dela).
// Desempenho: a entidade de cada tag fica guardada (só se procura de novo se ela sumiu, ou de tempos em tempos para
// limpar sobras), o texto/nome só é escrito quando muda e a distância dos jogadores é calculada em JS com as posições
// lidas uma vez por tick, em vez de um getPlayers por entidade.
import { system, world } from "@minecraft/server";
import { config } from "./db.js";
import { posicoesOnline } from "./jogadores.js";

/** @typedef {import("@minecraft/server").Entity} Entity */

const ENTIDADE_TEXTO = "vulpus:texto";
const PROP_TEXTO = "vulpus:texto_real";
const PASSO_ALCANCE = 20;
/** Ticks entre buscas completas (sobras, duplicatas, entidades de antes do reinício) para uma mesma tag. */
const REVISAO = 1200;
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end", "vulpus:minigames", "vulpus:intervalo"];
/** As dimensões que existem neste mundo (as dos minigames e do Intervalo podem faltar). */
function dimensoes() {
  /** @type {import("@minecraft/server").Dimension[]} */
  const l = [];
  for (const d of DIMENSOES) {
    try {
      l.push(world.getDimension(d));
    } catch {
      // dimensão ausente neste mundo
    }
  }
  return l;
}

/**
 * @typedef {object} Reg
 * @property {Entity} ent
 * @property {string} texto  último texto guardado na propriedade da entidade
 * @property {string | undefined} aplicado  último nome (nameTag) escrito
 * @property {{ x: number, y: number, z: number }} loc
 * @property {string} dim  id da dimensão onde a entidade está
 */
/** @type {Map<string, Reg>} id da entidade → registro (todas as que este módulo conhece) */
const regs = new Map();
/** @type {Map<string, { id: string, chave: string, revisar: number }>} tag → entidade escolhida e quando rebuscar */
const porTag = new Map();
/** @type {Map<string, number>} tag sem ponto → tick em que se conferiu que não há entidade */
const vazios = new Map();

/**
 * @param {Reg} reg
 * @param {number} raio
 * @param {readonly { d: string, x: number, y: number, z: number }[]} jogadores
 */
function aplicar(reg, raio, jogadores) {
  let visivel = reg.texto;
  if (raio > 0) {
    let perto = false;
    const dim = reg.dim;
    const r2 = raio * raio;
    for (const j of jogadores) {
      if (j.d !== dim) continue;
      const dx = j.x - reg.loc.x;
      const dy = j.y - reg.loc.y;
      const dz = j.z - reg.loc.z;
      if (dx * dx + dy * dy + dz * dz <= r2) {
        perto = true;
        break;
      }
    }
    if (!perto) visivel = "";
  }
  if (reg.aplicado === visivel) return;
  if (reg.ent.nameTag !== visivel) reg.ent.nameTag = visivel;
  reg.aplicado = visivel;
}

/**
 * Guarda a entidade, grava o texto na propriedade (só se mudou) e aplica a regra da distância.
 * @param {Entity} ent
 * @param {string} texto
 * @param {boolean} relerLocal
 */
function definir(ent, texto, relerLocal) {
  let reg = regs.get(ent.id);
  if (!reg || reg.ent !== ent) {
    reg = { ent, texto: "", aplicado: undefined, loc: ent.location, dim: ent.dimension.id };
    regs.set(ent.id, reg);
    reg.texto = /** @type {string} */ (ent.getDynamicProperty(PROP_TEXTO) ?? "");
  } else if (relerLocal) {
    reg.loc = ent.location;
    reg.dim = ent.dimension.id;
  }
  if (reg.texto !== texto) {
    ent.setDynamicProperty(PROP_TEXTO, texto);
    reg.texto = texto;
    reg.aplicado = undefined;
  }
  aplicar(reg, config().textoAlcance, posicoesOnline());
}

/** @param {Entity} e */
function esquecer(e) {
  try {
    regs.delete(e.id);
  } catch {
    // entidade já inválida
  }
}

/**
 * Põe, move, atualiza ou tira o texto marcado com `tag`. Sem ponto, remove; sem chunk carregado, tenta depois.
 * @param {string} tag
 * @param {{ x: number, y: number, z: number, d: string } | undefined} ponto
 * @param {string} texto
 * @param {number} [alcance]  (sem uso: vale a configuração textoAlcance; 0 = sempre visível)
 */
export function manterTexto(tag, ponto, texto, alcance) {
  const agora = system.currentTick;
  const guardado = porTag.get(tag);
  if (!ponto) {
    if (!guardado) {
      const visto = vazios.get(tag);
      if (visto !== undefined && agora - visto < REVISAO) return;
    }
    porTag.delete(tag);
    for (const dm of dimensoes()) {
      for (const e of dm.getEntities({ type: ENTIDADE_TEXTO, tags: [tag] })) {
        esquecer(e);
        e.remove();
      }
    }
    vazios.set(tag, agora);
    return;
  }
  vazios.delete(tag);
  const chave = `${ponto.d}|${ponto.x}|${ponto.y}|${ponto.z}`;
  // Caminho rápido: a entidade guardada continua viva, no mesmo ponto, e ainda não é hora de revisar.
  if (guardado && guardado.chave === chave && agora < guardado.revisar) {
    const reg = regs.get(guardado.id);
    if (reg?.ent.isValid) {
      definir(reg.ent, texto, false);
      return;
    }
  }
  /** @type {Entity[]} */
  const achados = [];
  for (const dm of dimensoes()) achados.push(...dm.getEntities({ type: ENTIDADE_TEXTO, tags: [tag] }));
  const dim = world.getDimension(ponto.d);
  if (!dim.isChunkLoaded(ponto)) return;
  let ent = achados.find((e) => e.dimension.id === dim.id);
  for (const e of achados) {
    if (e !== ent) {
      esquecer(e);
      e.remove();
    }
  }
  if (!ent) {
    ent = dim.spawnEntity(ENTIDADE_TEXTO, ponto);
    ent.addTag(tag);
  } else if (Math.hypot(ent.location.x - ponto.x, ent.location.y - ponto.y, ent.location.z - ponto.z) > 0.1) {
    ent.teleport(ponto, { dimension: dim });
  }
  definir(ent, texto, true);
  porTag.set(tag, { id: ent.id, chave, revisar: agora + REVISAO });
}

/**
 * Põe o texto numa entidade vulpus:texto que o sistema de quem chama já criou e move (placares, portais): passa a valer a
 * regra da distância, como em manterTexto.
 * @param {Entity} ent
 * @param {string} texto
 * @param {number} [alcance]  (sem uso: vale a configuração textoAlcance)
 */
export function textoNaEntidade(ent, texto, alcance) {
  definir(ent, texto, true);
}

/** Entidades vulpus:texto que ainda não estão no registro (de antes do reinício, ou de uma tag que ninguém mais mantém). */
function descobrir() {
  for (const dm of dimensoes()) {
    for (const ent of dm.getEntities({ type: ENTIDADE_TEXTO })) {
      if (regs.has(ent.id)) continue;
      const texto = ent.getDynamicProperty(PROP_TEXTO);
      if (typeof texto !== "string") continue;
      regs.set(ent.id, { ent, texto, aplicado: undefined, loc: ent.location, dim: ent.dimension.id });
    }
  }
}

let proximaDescoberta = 0;

// Todos os textos flutuantes (mesas, moeda, canto comunitário) aparecem e somem com a distância, mesmo que quem os
// criou só os atualize de vez em quando.
system.runInterval(() => {
  try {
    const agora = system.currentTick;
    if (agora >= proximaDescoberta) {
      proximaDescoberta = agora + REVISAO / 2;
      descobrir();
    }
    if (regs.size === 0) return;
    const raio = config().textoAlcance;
    const jogadores = raio > 0 ? posicoesOnline() : [];
    for (const [id, reg] of regs) {
      if (!reg.ent.isValid) {
        regs.delete(id);
        continue;
      }
      aplicar(reg, raio, jogadores);
    }
  } catch (e) {
    console.warn(`[Vulpus] Texto flutuante: ${e}`);
  }
}, PASSO_ALCANCE);
