// @ts-check
// Telecinese da Varinha Lamento (tipo "gravity gun"): segura e arremessa entidades (inclui jogadores e itens) e blocos.
// Enquanto alguém segura, um laço de 1 tick move o alvo à frente do olhar; sem ninguém segurando e sem blocos voando, nada roda por tick.
// Blocos viram a entidade `vulpus:ecos_bloco` (com o tipo e os estados do bloco original guardados nela) e voltam a ser bloco quando assentam.
import { BlockPermutation, EntityDamageCause, EquipmentSlot, GameMode, ItemStack, system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { online, TAG_SUMIDO } from "../core/jogadores.js";
import { pontoEmZona } from "../core/arg_zona.js";
import { emCombate } from "../core/teleporte.js";
import { registrarErro } from "../core/util.js";
import * as textosEquip from "../textos/ecos_equip.js";
import * as textos from "../textos/ecos_telecinese.js";
import { baseEm, bloqueio } from "./cla_terreno.js";
import { dentroDoIntervalo } from "./intervalo.js";
import { posicaoArmazem } from "./leilao_armazem.js";
import { dentro as dentroDoLobby } from "./lobby.js";
import { emMinigame } from "./mg_estado.js";
import { indiceTextura, blocoPegavel } from "./ecos_bloco_mapa.js";
import { localSpawn } from "./spawn.js";
import { lerArena, naZona } from "./spleef_arena.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {{ p: Player, alvo: Entity, dist: number, dy: number, inicio: number }} Segurada */

export const ITEM_VARINHA = "vulpus:varinha_lamento";
export const ENTIDADE_BLOCO = "vulpus:ecos_bloco";
const DIM_ECOS = "vulpus:ecos";
const ALCANCE = 20;
const DIST_MIN = 3;
const DIST_MAX = 12;
/** Chefes do evento: criaturas vulpus:ecos_* que NÃO podem ser agarradas. */
const CHEFES = new Set(["vulpus:ecos_testemunho", "vulpus:ecos_memoria"]);
/** Nunca agarrados (além do que é vulpus:*). */
const PROIBIDAS = new Set(["minecraft:armor_stand", "minecraft:npc", "minecraft:painting", "minecraft:item_frame", "minecraft:glow_item_frame", "minecraft:lightning_bolt", "minecraft:leash_knot", "minecraft:fishing_hook"]);
const VEICULOS = /(boat|minecart)$/;
/** Dimensões vanilla onde a telecinese vale; mais a do evento. */
const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end", DIM_ECOS];
/** Quanto tempo uma entidade-bloco solta fica sem dono antes de a varredura assentá-la (ticks). */
const ORFA_TICKS = 200;
const PASSO_VARREDURA = 40;
/** Tempo máximo voando antes de assentar à força (ticks). */
const VOO_MAX = 120;

/** @type {Map<string, Segurada>} */
const segurando = new Map();
/** alvo -> quem segura @type {Map<string, string>} */
const seguradoPor = new Map();
/** quem -> tick em que acaba a espera @type {Map<string, number>} */
const cooldownAte = new Map();
/** jogador solto -> tick em que acaba a imunidade @type {Map<string, number>} */
const imuneAte = new Map();
/** jogador -> tick até quando não leva dano de queda @type {Map<string, number>} */
const semQueda = new Map();
/** entidade-bloco -> { e, ativoEm } @type {Map<string, { e: Entity, ativoEm: number }>} */
const blocos = new Map();
/** entidade-bloco solta no ar -> { e, desde, por } @type {Map<string, { e: Entity, desde: number, por: string }>} */
const voando = new Map();
/** @type {number | undefined} */
let laco;

const agoraTick = () => system.currentTick;

// ───────────────────────────── regras

/** @param {Player} p */
const ausente = (p) => p.hasTag(TAG_SUMIDO) || p.getGameMode() === GameMode.Spectator;

/**
 * Posição protegida (sem olhar clã): dimensão do addon, lobby/spawn, zona do mistério, arena do spleef, armazém do leilão, Intervalo.
 * @param {string} dimId
 * @param {Vector3} pos
 */
export function posProtegida(dimId, pos) {
  try {
    if (dimId.startsWith("vulpus:") && dimId !== DIM_ECOS) return true;
    if (dentroDoLobby(dimId, pos)) return true;
    const raio = config().protecaoSpawnRaio;
    if (raio > 0) {
      const s = localSpawn();
      if (s && s.d === dimId && Math.hypot(pos.x - s.x, pos.z - s.z) <= raio) return true;
    }
    const ponto = { x: pos.x, y: pos.y, z: pos.z, d: dimId };
    if (pontoEmZona(ponto) || dentroDoIntervalo(ponto)) return true;
    if (naZona(lerArena(), dimId, pos)) return true;
    const arm = posicaoArmazem();
    if (arm && arm.d === dimId && Math.hypot(pos.x - arm.x, pos.z - arm.z) <= 16) return true;
    return false;
  } catch (e) {
    registrarErro("Ecos: proteção da telecinese", e);
    return true;
  }
}

/**
 * Mesma regra de quebrar/construir, para um bloco: proteção geral e terreno de clã.
 * @param {Player | undefined} p quem mexe (se já saiu, vale a proteção de qualquer base)
 * @param {string} dimId
 * @param {Vector3} pos
 */
function blocoProtegido(p, dimId, pos) {
  if (posProtegida(dimId, pos)) return true;
  try {
    if (p?.isValid) return !!bloqueio(p, dimId, pos, "construir");
    return !!baseEm(dimId, pos.x, pos.z);
  } catch {
    return true;
  }
}

/**
 * Por que este alvo não pode ser agarrado (undefined = pode).
 * @param {Player} p
 * @param {Entity} e
 * @returns {string | undefined}
 */
function recusa(p, e) {
  if (!e.isValid || e === p) return textos.RECUSADO;
  const t = e.typeId;
  if (t.startsWith("vulpus:") && (!t.startsWith("vulpus:ecos_") || CHEFES.has(t))) return textos.RECUSADO;
  if (PROIBIDAS.has(t)) return textos.RECUSADO;
  if (VEICULOS.test(t)) {
    try {
      if ((e.getComponent("minecraft:rideable")?.getRiders().length ?? 0) > 0) return textos.RECUSADO;
    } catch {
      return textos.RECUSADO;
    }
  }
  if (seguradoPor.has(e.id) || segurando.has(e.id)) return textos.RECUSADO;
  const dim = e.dimension.id;
  if (!DIMS.includes(dim)) return textos.PROTEGIDO;
  if (posProtegida(dim, e.location)) return textos.PROTEGIDO;
  if (t === "minecraft:player") {
    const j = /** @type {Player} */ (e);
    if (!config().ecosVaraPegarJogador) return textos.JOGADOR_DESLIGADO;
    if (ausente(j) || emMinigame(j) || emCombate(j)) return textos.RECUSADO;
    if ((imuneAte.get(j.id) ?? 0) > agoraTick()) return textos.IMUNE;
  }
  return undefined;
}

/** @param {Player} p */
function seguraVarinha(p) {
  try {
    return p.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand)?.typeId === ITEM_VARINHA;
  } catch {
    return false;
  }
}

/**
 * Gasta 1 de durabilidade da varinha na mão (não gasta no criativo). Devolve false se ela se desfez.
 * @param {Player} p
 * @returns {boolean}
 */
export function gastarVarinha(p) {
  if (p.getGameMode() === GameMode.Creative) return true;
  const eq = p.getComponent("minecraft:equippable");
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  if (!eq || item?.typeId !== ITEM_VARINHA) return true;
  const dur = item.getComponent("durability");
  if (!dur) return true;
  dur.damage += 1;
  if (dur.damage >= dur.maxDurability) {
    eq.setEquipment(EquipmentSlot.Mainhand, undefined);
    p.sendMessage(textosEquip.QUEBROU);
    p.playSound("random.break");
    return false;
  }
  eq.setEquipment(EquipmentSlot.Mainhand, item);
  return true;
}

// ───────────────────────────── agarrar

/** @param {Player} p */
export const segurandoAlgo = (p) => segurando.has(p.id);

/**
 * Tenta agarrar o que está na mira. modo 1 = entidades, 2 = blocos.
 * @param {Player} p
 * @param {number} modo
 * @returns {boolean} true se passou a segurar
 */
export function iniciarSegurar(p, modo) {
  const c = config();
  if (segurando.has(p.id)) return true;
  if (!c.ecosEquipLigado || !c.ecosVaraTelecinese) {
    if (c.ecosEquipLigado) p.onScreenDisplay.setActionBar(textos.DESLIGADA);
    return false;
  }
  if (ausente(p) || emMinigame(p)) return false;
  const dim = p.dimension.id;
  if (!DIMS.includes(dim)) return false;
  const agora = agoraTick();
  const ate = cooldownAte.get(p.id) ?? 0;
  if (ate > agora) {
    p.onScreenDisplay.setActionBar(textos.ESPERA(Math.ceil((ate - agora) / 20)));
    return false;
  }
  const iniciada = modo === 2 ? pegarBloco(p) : pegarEntidade(p);
  if (!iniciada) return false;
  gastarVarinha(p);
  garantirLaco();
  return true;
}

/** @param {Player} p */
function pegarEntidade(p) {
  /** @type {{ entity: Entity, distance: number } | undefined} */
  let alvo;
  try {
    for (const h of p.getEntitiesFromViewDirection({ maxDistance: ALCANCE })) {
      const t = h.entity.typeId;
      if (!h.entity.isValid) continue;
      if (t.startsWith("vulpus:") && !t.startsWith("vulpus:ecos_")) continue;
      alvo = h;
      break;
    }
  } catch (e) {
    registrarErro("Ecos: mira da telecinese", e);
  }
  if (!alvo) {
    p.onScreenDisplay.setActionBar(textos.SEM_ALVO);
    return false;
  }
  const motivo = recusa(p, alvo.entity);
  if (motivo) {
    p.onScreenDisplay.setActionBar(motivo);
    return false;
  }
  segurar(p, alvo.entity, alvo.distance);
  return true;
}

/** @param {Player} p */
function pegarBloco(p) {
  const c = config();
  if (!c.ecosVaraPegarBloco) {
    p.onScreenDisplay.setActionBar(textos.BLOCO_DESLIGADO);
    return false;
  }
  /** @type {import("@minecraft/server").Block | undefined} */
  let bloco;
  try {
    bloco = p.getBlockFromViewDirection({ maxDistance: ALCANCE, includeLiquidBlocks: false, includePassableBlocks: false })?.block;
  } catch (e) {
    registrarErro("Ecos: mira de blocos", e);
  }
  if (!bloco) {
    p.onScreenDisplay.setActionBar(textos.SEM_BLOCO);
    return false;
  }
  let inventario = false;
  try {
    inventario = !!bloco.getComponent("minecraft:inventory");
  } catch {
    inventario = false;
  }
  if (bloco.isAir || bloco.isLiquid || inventario || !blocoPegavel(bloco.typeId)) {
    p.onScreenDisplay.setActionBar(textos.BLOCO_INVALIDO);
    return false;
  }
  const dimId = bloco.dimension.id;
  if (!DIMS.includes(dimId) || blocoProtegido(p, dimId, bloco.location)) {
    p.onScreenDisplay.setActionBar(textos.PROTEGIDO);
    return false;
  }
  podarBlocos();
  if (blocos.size >= c.ecosVaraBlocosMax) {
    p.onScreenDisplay.setActionBar(textos.BLOCOS_DEMAIS);
    return false;
  }
  const loc = bloco.location;
  const tipo = bloco.typeId;
  const estados = bloco.permutation.getAllStates();
  /** @type {Entity | undefined} */
  let ent;
  try {
    ent = bloco.dimension.spawnEntity(ENTIDADE_BLOCO, { x: loc.x + 0.5, y: loc.y, z: loc.z + 0.5 });
    ent.setDynamicProperty("vulpus:b_tipo", tipo);
    ent.setDynamicProperty("vulpus:b_estados", JSON.stringify(estados));
    ent.setProperty("vulpus:tipo", indiceTextura(tipo));
    bloco.setType("minecraft:air");
  } catch (e) {
    registrarErro("Ecos: criar entidade-bloco", e);
    try {
      ent?.remove();
    } catch {
      // some sozinha
    }
    return false;
  }
  blocos.set(ent.id, { e: ent, ativoEm: agoraTick() });
  const o = p.getHeadLocation();
  const dist = Math.hypot(loc.x + 0.5 - o.x, loc.y + 0.5 - o.y, loc.z + 0.5 - o.z);
  segurar(p, ent, dist);
  return true;
}

/**
 * @param {Player} p
 * @param {Entity} alvo
 * @param {number} distancia
 */
function segurar(p, alvo, distancia) {
  const compacto = alvo.typeId === "minecraft:item" || alvo.typeId === ENTIDADE_BLOCO;
  segurando.set(p.id, { p, alvo, dist: Math.max(DIST_MIN, Math.min(DIST_MAX, distancia)), dy: compacto ? 0.5 : 1, inicio: agoraTick() });
  seguradoPor.set(alvo.id, p.id);
  const b = blocos.get(alvo.id);
  if (b) b.ativoEm = agoraTick();
  voando.delete(alvo.id);
  try {
    if (alvo.typeId === "minecraft:player") {
      const j = /** @type {Player} */ (alvo);
      j.sendMessage(textos.AGARRADO(p.name));
      semQueda.set(j.id, agoraTick() + 40);
    }
    p.dimension.playSound("mob.evocation_illager.prepare_summon", p.location, { volume: 0.7, pitch: 1.5 });
  } catch (e) {
    registrarErro("Ecos: efeitos de agarrar", e);
  }
}

// ───────────────────────────── soltar

/**
 * Solta o que a pessoa segura. arremessar = com impulso; sem isso, só larga.
 * @param {string} holderId
 * @param {boolean} arremessar
 * @returns {boolean} true se segurava algo
 */
export function soltar(holderId, arremessar) {
  const s = segurando.get(holderId);
  if (!s) return false;
  segurando.delete(holderId);
  seguradoPor.delete(s.alvo.id);
  const c = config();
  const agora = agoraTick();
  cooldownAte.set(holderId, agora + Math.round(c.ecosVaraCooldownSeg * 20));
  const { p, alvo } = s;
  try {
    if (alvo.isValid) {
      if (arremessar && p.isValid && c.ecosVaraForca > 0) lancar(p, alvo, c.ecosVaraForca);
      if (alvo.typeId === "minecraft:player") {
        const j = /** @type {Player} */ (alvo);
        imuneAte.set(j.id, agora + Math.round(c.ecosVaraImunidadeSeg * 20));
        if (c.ecosVaraQuedaSeg > 0) {
          const ticks = Math.round(c.ecosVaraQuedaSeg * 20);
          semQueda.set(j.id, agora + ticks);
          j.addEffect("slow_falling", ticks, { amplifier: 0, showParticles: false });
        } else {
          semQueda.set(j.id, agora + 20);
        }
      }
      if (alvo.typeId === ENTIDADE_BLOCO) {
        voando.set(alvo.id, { e: alvo, desde: agora, por: holderId });
        const b = blocos.get(alvo.id);
        if (b) b.ativoEm = agora;
      }
    }
    if (p.isValid) {
      p.onScreenDisplay.setActionBar("§7...");
      p.dimension.playSound(arremessar ? "mob.ghast.fireball" : "mob.endermen.portal", p.location, { volume: 0.6, pitch: arremessar ? 1.6 : 1.2 });
    }
  } catch (e) {
    registrarErro("Ecos: soltar", e);
  }
  return true;
}

/**
 * @param {Player} p
 * @param {Entity} alvo
 * @param {number} forca
 */
function lancar(p, alvo, forca) {
  const d = p.getViewDirection();
  try {
    alvo.clearVelocity();
  } catch {
    // jogadores não aceitam
  }
  if (alvo.typeId === "minecraft:item" || alvo.typeId === ENTIDADE_BLOCO) {
    alvo.applyImpulse({ x: d.x * forca * 0.4, y: d.y * forca * 0.4 + 0.1, z: d.z * forca * 0.4 });
  } else {
    alvo.applyKnockback({ x: d.x * forca, z: d.z * forca }, Math.max(0.2, d.y * forca * 0.6 + 0.25));
  }
}

// ───────────────────────────── laço

function garantirLaco() {
  if (laco !== undefined) return;
  laco = system.runInterval(passo, 1);
}

function pararLacoSeOcioso() {
  if (laco !== undefined && segurando.size === 0 && voando.size === 0) {
    system.clearRun(laco);
    laco = undefined;
  }
}

function passo() {
  try {
    const agora = agoraTick();
    const maxTicks = Math.round(config().ecosVaraSegurarMaxSeg * 20);
    for (const [id, s] of [...segurando]) {
      try {
        segurarUm(id, s, agora, maxTicks);
      } catch (e) {
        registrarErro("Ecos: segurando", e);
        soltar(id, false);
      }
    }
    if (agora % 2 === 0) for (const [id, v] of [...voando]) voarUm(id, v, agora);
  } catch (e) {
    registrarErro("Ecos: laço da telecinese", e);
  }
  pararLacoSeOcioso();
}

/**
 * @param {string} id
 * @param {Segurada} s
 * @param {number} agora
 * @param {number} maxTicks
 */
function segurarUm(id, s, agora, maxTicks) {
  const { p, alvo } = s;
  const c = config();
  if (!p.isValid || !alvo.isValid || !c.ecosEquipLigado || !c.ecosVaraTelecinese || ausente(p) || emMinigame(p) || !seguraVarinha(p)) {
    soltar(id, false);
    return;
  }
  if (alvo.dimension.id !== p.dimension.id) {
    soltar(id, false);
    return;
  }
  const dec = agora - s.inicio;
  if (dec >= maxTicks) {
    soltar(id, false);
    return;
  }
  if (dec % 10 === 9 && posProtegida(alvo.dimension.id, alvo.location)) {
    p.onScreenDisplay.setActionBar(textos.PROTEGIDO);
    soltar(id, false);
    return;
  }
  if (dec % 60 === 59 && !gastarVarinha(p)) {
    soltar(id, false);
    return;
  }
  const o = p.getHeadLocation();
  const d = p.getViewDirection();
  const alvoPos = { x: o.x + d.x * s.dist, y: o.y + d.y * s.dist - s.dy, z: o.z + d.z * s.dist };
  alvo.teleport(alvoPos);
  try {
    alvo.clearVelocity();
  } catch {
    // jogadores não aceitam
  }
  if (alvo.typeId === "minecraft:player") semQueda.set(alvo.id, agora + 40);
  const b = blocos.get(alvo.id);
  if (b) b.ativoEm = agora;
  if (agora % 3 === 0) fio(p, o, d, alvoPos);
  if (agora % 5 === 0) p.onScreenDisplay.setActionBar(textos.SEGURANDO((maxTicks - dec) / 20, maxTicks / 20));
}

/**
 * Três pontinhos de luz entre a varinha e o alvo.
 * @param {Player} p
 * @param {Vector3} o
 * @param {Vector3} d
 * @param {Vector3} alvo
 */
function fio(p, o, d, alvo) {
  try {
    const dim = p.dimension;
    const ini = { x: o.x + d.x * 0.8, y: o.y - 0.25 + d.y * 0.8, z: o.z + d.z * 0.8 };
    for (const t of [0.3, 0.6, 0.9]) {
      dim.spawnParticle("minecraft:endrod", { x: ini.x + (alvo.x - ini.x) * t, y: ini.y + (alvo.y + 0.5 - ini.y) * t, z: ini.z + (alvo.z - ini.z) * t });
    }
  } catch {
    // partícula é só enfeite
  }
}

/**
 * Entidade-bloco solta: assenta quando para (ou depois de um tempo).
 * @param {string} id
 * @param {{ e: Entity, desde: number, por: string }} v
 * @param {number} agora
 */
function voarUm(id, v, agora) {
  const e = v.e;
  if (!e.isValid) {
    voando.delete(id);
    blocos.delete(id);
    return;
  }
  const dec = agora - v.desde;
  if (dec < 6) return;
  let parou = false;
  let sabe = false;
  try {
    if (typeof e.isOnGround === "boolean") {
      sabe = true;
      parou = e.isOnGround;
    }
    const vel = e.getVelocity?.();
    if (vel) {
      sabe = true;
      parou = parou || Math.hypot(vel.x, vel.y, vel.z) < 0.03;
    }
  } catch {
    sabe = false;
  }
  if (parou || dec >= VOO_MAX || (!sabe && dec >= 20)) assentar(e, v.por);
}

// ───────────────────────────── assentar entidade-bloco

/**
 * Vira bloco de novo no ar livre mais próximo (se a posição for permitida); senão derruba como item.
 * @param {Entity} ent
 * @param {string} [porId] quem arremessou (a regra de clã é a dessa pessoa, se ainda estiver aqui)
 */
export function assentar(ent, porId) {
  voando.delete(ent.id);
  blocos.delete(ent.id);
  seguradoPor.delete(ent.id);
  if (!ent.isValid) return;
  const tipo = /** @type {string | undefined} */ (ent.getDynamicProperty("vulpus:b_tipo"));
  /** @type {Record<string, string | number | boolean>} */
  let estados = {};
  try {
    estados = JSON.parse(String(ent.getDynamicProperty("vulpus:b_estados") ?? "{}"));
  } catch {
    estados = {};
  }
  const dim = ent.dimension;
  const l = ent.location;
  const por = porId ? online().find((j) => j.id === porId) : undefined;
  let feito = false;
  try {
    if (tipo) {
      const cx = Math.floor(l.x);
      const cy = Math.floor(l.y + 0.25);
      const cz = Math.floor(l.z);
      /** @type {Vector3[]} */
      const candidatos = [{ x: cx, y: cy, z: cz }];
      for (let dy = 1; dy <= 3; dy++) candidatos.push({ x: cx, y: cy + dy, z: cz });
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) candidatos.push({ x: cx + dx, y: cy, z: cz + dz }, { x: cx + dx, y: cy + 1, z: cz + dz });
      for (const c of candidatos) {
        const b = dim.getBlock(c);
        if (!b || !b.isAir) continue;
        if (blocoProtegido(por, dim.id, c)) continue;
        try {
          b.setPermutation(BlockPermutation.resolve(tipo, estados));
        } catch {
          b.setType(tipo);
        }
        feito = true;
        break;
      }
    }
  } catch (e) {
    registrarErro("Ecos: assentar bloco", e);
  }
  if (!feito && tipo) {
    try {
      dim.spawnItem(new ItemStack(tipo, 1), { x: l.x, y: l.y + 0.5, z: l.z });
    } catch {
      // bloco sem item: se perde (melhor que ficar para sempre)
    }
  }
  try {
    ent.remove();
  } catch (e) {
    registrarErro("Ecos: remover entidade-bloco", e);
  }
}

/** Tira do controle as entidades-bloco que já não existem. */
function podarBlocos() {
  for (const [id, b] of [...blocos]) if (!b.e.isValid) blocos.delete(id);
}

// ───────────────────────────── varredura de órfãs

system.runInterval(() => {
  try {
    if (blocos.size === 0) return;
    const agora = agoraTick();
    for (const [id, b] of [...blocos]) {
      if (!b.e.isValid) {
        blocos.delete(id);
        continue;
      }
      if (seguradoPor.has(id) || voando.has(id)) continue;
      if (agora - b.ativoEm > ORFA_TICKS) assentar(b.e);
    }
  } catch (e) {
    registrarErro("Ecos: varredura de blocos órfãos", e);
  }
}, PASSO_VARREDURA);

/** Ao carregar o mundo, as entidades-bloco que sobraram (reinício) entram na varredura. */
function reencontrar() {
  try {
    for (const d of DIMS) {
      let dim;
      try {
        dim = world.getDimension(d);
      } catch {
        continue;
      }
      for (const e of dim.getEntities({ type: ENTIDADE_BLOCO })) if (!blocos.has(e.id)) blocos.set(e.id, { e, ativoEm: agoraTick() });
    }
  } catch (e) {
    registrarErro("Ecos: reencontrar blocos", e);
  }
}
world.afterEvents.worldLoad.subscribe(reencontrar);

// ───────────────────────────── eventos

/** @param {{ source?: any, itemStack?: any }} ev */
const eventoSoltar = (ev) => {
  try {
    if (ev.itemStack?.typeId !== ITEM_VARINHA || !ev.source) return;
    soltar(ev.source.id, true);
  } catch (e) {
    registrarErro("Ecos: soltar pelo botão", e);
  }
};
world.afterEvents.itemStopUse.subscribe(eventoSoltar);
world.afterEvents.itemReleaseUse.subscribe(eventoSoltar);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  try {
    soltar(playerId, false);
    for (const [id, s] of [...segurando]) if (s.alvo.id === playerId) soltar(id, false);
    cooldownAte.delete(playerId);
    imuneAte.delete(playerId);
    semQueda.delete(playerId);
  } catch (e) {
    registrarErro("Ecos: jogador saiu", e);
  }
});

// Quem foi agarrado e arremessado não morre só de cair.
world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    if (ev.damageSource.cause !== EntityDamageCause.fall) return;
    const ate = semQueda.get(ev.hurtEntity.id);
    if (ate !== undefined && ate > agoraTick()) ev.cancel = true;
  } catch (e) {
    registrarErro("Ecos: queda da telecinese", e);
  }
});

/** Para testes e painéis. */
export const estado = () => ({ segurando: segurando.size, blocos: blocos.size, voando: voando.size });
