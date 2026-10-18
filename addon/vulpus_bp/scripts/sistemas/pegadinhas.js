// @ts-check
// Pegadinhas do dono: sustos e brincadeiras sem dano com os membros, no estilo "From the Fog": sons de alguém minerando,
// andando, abrindo porta ou baú, um Herobrine que aparece longe e some, avisos falsos e efeitos no corpo. Tudo é
// temporário; quem não quer desliga em Ajustes (ou /vulpus:pegadinhas), o que também para tudo na hora. O painel do
// dono abre este menu (dono.js); só dono usa e cada uso vai para o log do dono.
import { BlockPermutation, ItemStack, Player, system, world } from "@minecraft/server";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, lerMundo, salvarMundo } from "../core/db.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { Lista, perguntar } from "../core/forms.js";
import { online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { ICONES } from "../config.js";
import * as textos from "../textos/pegadinhas.js";
import { alternarSumico, estaSumido } from "./sumico.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number }} Pos */

/** Criaturas de susto (todas levam a mesma tag, para a faxina). */
const ENTIDADES = { herobrine: "vulpus:herobrine", sombra: "vulpus:sombra", olhos: "vulpus:olhos", duplo: "vulpus:duplo" };
const TAG_HEROBRINE = "vulpus_herobrine";
const TAG_ANIMAL = "vulpus_pegadinha_animal";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_HEROBRINE = 5;
const EFEITOS = ["nausea", "blindness", "darkness", "slowness", "mining_fatigue", "levitation"];

/** @type {Map<string, Set<number>>} */
const agendas = new Map();
/** @type {Map<string, { ent: Entity, modo: "longe" | "atras" | "frente" | "olhos" | "duplo" | "janela", tipo: "herobrine" | "sombra" | "olhos" | "duplo", inicio: number, olhando: number, passo: number, passoOlhado: number, batida: number, gritou: boolean, correndo?: boolean, nevoa?: boolean }>} */
const herobrines = new Map();

const aleatorio = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a);
const inteiro = (/** @type {number} */ a, /** @type {number} */ b) => Math.floor(aleatorio(a, b + 1));

// ------------------------------------------------------------------------------------ utilidades
/**
 * Roda `fn` daqui a `ticks`, se a pessoa ainda estiver aqui; fica anotado para "parar tudo".
 * @param {Player} alvo
 * @param {number} ticks
 * @param {() => void} fn
 */
function agendar(alvo, ticks, fn) {
  const id = alvo.id;
  const nome = alvo.name;
  const conjunto = agendas.get(id) ?? new Set();
  agendas.set(id, conjunto);
  const run = system.runTimeout(() => {
    conjunto.delete(run);
    try {
      const p = world.getAllPlayers().find((x) => x.id === id);
      if (p?.isValid) fn();
    } catch (e) {
      registrarErro(`Pegadinha (${nome})`, e);
    }
  }, Math.max(0, Math.floor(ticks)));
  conjunto.add(run);
}

/** Ponto a `dist` blocos de quem olha, `graus` para a direita da frente (180 = atrás). @param {Player} alvo @param {number} dist @param {number} graus */
function relativo(alvo, dist, graus) {
  const yaw = ((alvo.getRotation().y + graus) * Math.PI) / 180;
  return { x: alvo.location.x - Math.sin(yaw) * dist, y: alvo.location.y, z: alvo.location.z + Math.cos(yaw) * dist };
}

/** Som só para a vítima, ignora a opção de sons do menu. @param {Player} alvo @param {string} id @param {Pos} pos @param {number} [volume] @param {number} [tom] */
function tocar(alvo, id, pos, volume = 1, tom = 1) {
  try {
    alvo.playSound(id, { location: pos, volume, pitch: tom });
  } catch (e) {
    registrarErro(`Pegadinha: som ${id}`, e);
  }
}

/** Mensagem crua no chat, sem o prefixo da Kiza: as pegadinhas precisam parecer de verdade. @param {Player} alvo @param {string} texto */
function crua(alvo, texto) {
  try {
    alvo.sendMessage(texto);
  } catch (e) {
    registrarErro("Pegadinha: mensagem", e);
  }
}

/** Som que vem "de dentro da cabeça". @param {Player} alvo @param {string} id @param {number} [volume] @param {number} [tom] */
const tocarNela = (alvo, id, volume = 1, tom = 1) => tocar(alvo, id, alvo.location, volume, tom);

/** Barulho do passo conforme o chão. @param {Player} alvo */
function somDoPasso(alvo) {
  try {
    const l = alvo.location;
    const tipo = alvo.dimension.getBlock({ x: Math.floor(l.x), y: Math.floor(l.y) - 1, z: Math.floor(l.z) })?.typeId ?? "";
    if (/grass|dirt|moss|podzol|mycelium/.test(tipo)) return "step.grass";
    if (/sand/.test(tipo)) return "step.sand";
    if (/gravel/.test(tipo)) return "step.gravel";
    if (/plank|log|wood|door|stripped/.test(tipo)) return "step.wood";
    if (/snow/.test(tipo)) return "step.snow";
    return "step.stone";
  } catch {
    return "step.stone";
  }
}

/** Tremida de tela curta. @param {Player} alvo @param {number} [forca] */
function tremer(alvo, forca = 0.25) {
  try {
    alvo.runCommand(`camerashake add @s ${forca} 1.5 positional`);
  } catch {
    // sem o comando: fica só o som
  }
}

/** @param {Player} alvo @param {string} efeito @param {number} ticks @param {number} [nivel] */
function efeito(alvo, efeito, ticks, nivel = 0) {
  try {
    alvo.addEffect(efeito, ticks, { amplifier: nivel, showParticles: false });
  } catch (e) {
    registrarErro(`Pegadinha: efeito ${efeito}`, e);
  }
}

/** Primeiro chão firme com 2 blocos de ar em cima, por perto da altura `y0`. @param {Player} alvo @param {number} x @param {number} z */
function chaoEm(alvo, x, z) {
  const dim = alvo.dimension;
  const y0 = Math.floor(alvo.location.y);
  for (let dy = 4; dy >= -8; dy--) {
    try {
      const b = dim.getBlock({ x: Math.floor(x), y: y0 + dy, z: Math.floor(z) });
      const c1 = dim.getBlock({ x: Math.floor(x), y: y0 + dy + 1, z: Math.floor(z) });
      const c2 = dim.getBlock({ x: Math.floor(x), y: y0 + dy + 2, z: Math.floor(z) });
      if (b && c1 && c2 && !b.isAir && !b.isLiquid && c1.isAir && c2.isAir) return y0 + dy + 1;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Para tudo o que está rolando com essa pessoa. @param {Player | string} alvo */
export function pararTudo(alvo) {
  const id = typeof alvo === "string" ? alvo : alvo.id;
  for (const run of agendas.get(id) ?? []) system.clearRun(run);
  agendas.delete(id);
  const h = herobrines.get(id);
  if (h) {
    try {
      if (h.ent.isValid) h.ent.remove();
    } catch {
      // já se foi
    }
    herobrines.delete(id);
  }
  restaurarLuzes(id);
  restaurarPortas(id);
  restaurarPlacas(id);
  const p = typeof alvo === "string" ? world.getAllPlayers().find((x) => x.id === alvo) : alvo;
  tirarNevoa(p);
  if (p?.isValid) {
    try {
      p.runCommand("stopsound @s record.11");
    } catch {
      // sem o disco
    }
    for (const e of EFEITOS) {
      try {
        p.removeEffect(e);
      } catch {
        // sem o efeito
      }
    }
  }
}

// ------------------------------------------------------------------------------------ sons
/** @param {Player} alvo */
function minerar(alvo) {
  const base = relativo(alvo, aleatorio(7, 12), aleatorio(0, 360));
  let t = 10;
  const golpes = inteiro(6, 9);
  for (let i = 0; i < golpes; i++) {
    const tipo = i % 4 === 3 ? "dig.gravel" : "dig.stone";
    agendar(alvo, t, () => tocar(alvo, tipo, { x: base.x, y: base.y + aleatorio(-1, 1), z: base.z }, 1.1, aleatorio(0.9, 1.1)));
    t += inteiro(8, 17);
  }
  agendar(alvo, t + 6, () => tocar(alvo, "random.pop", base, 0.8, 0.8));
}

/** @param {Player} alvo */
function passos(alvo) {
  const lado = aleatorio(-25, 25);
  let t = 0;
  for (let dist = 12; dist > 3; dist -= 0.9) {
    const d = dist;
    agendar(alvo, t, () => tocar(alvo, somDoPasso(alvo), relativo(alvo, d, 180 + lado), 0.9, aleatorio(0.85, 1)));
    t += 9;
  }
}

/** @param {Player} alvo */
function tunel(alvo) {
  const base = relativo(alvo, aleatorio(2, 5), aleatorio(0, 360));
  let t = 6;
  for (let i = 0; i < 7; i++) {
    const tipo = i % 2 ? "dig.gravel" : "dig.stone";
    agendar(alvo, t, () => tocar(alvo, tipo, { x: base.x, y: base.y - 4, z: base.z }, 1, aleatorio(0.8, 1)));
    t += inteiro(10, 18);
  }
}

/** @param {Player} alvo */
function construir(alvo) {
  const base = relativo(alvo, aleatorio(6, 11), aleatorio(0, 360));
  const sons = ["dig.wood", "dig.stone", "dig.grass", "dig.wood", "dig.stone"];
  let t = 8;
  for (let i = 0; i < 9; i++) {
    const tipo = sons[i % sons.length];
    agendar(alvo, t, () => tocar(alvo, tipo, { x: base.x + aleatorio(-2, 2), y: base.y, z: base.z + aleatorio(-2, 2) }, 1, aleatorio(0.95, 1.15)));
    t += inteiro(5, 11);
  }
}

/** @param {Player} alvo */
function porta(alvo) {
  const p = relativo(alvo, aleatorio(4, 7), inteiro(0, 1) ? 110 : -110);
  tocar(alvo, "random.door_open", p, 1, 0.95);
  agendar(alvo, inteiro(20, 40), () => tocar(alvo, "random.door_close", p, 1, 0.95));
}

/** @param {Player} alvo */
function bau(alvo) {
  const p = relativo(alvo, aleatorio(4, 8), aleatorio(0, 360));
  tocar(alvo, "random.chestopen", p, 1, 0.9);
  agendar(alvo, inteiro(40, 70), () => tocar(alvo, "random.chestclosed", p, 1, 0.9));
}

/** @param {Player} alvo */
function creeper(alvo) {
  tocar(alvo, "mob.creeper.say", relativo(alvo, 1.8, 180), 1, 0.9);
}

/** @param {Player} alvo */
function zumbi(alvo) {
  const p = relativo(alvo, aleatorio(14, 20), aleatorio(0, 360));
  tocar(alvo, "mob.zombie.say", p, 1, aleatorio(0.7, 0.9));
  agendar(alvo, inteiro(45, 90), () => tocar(alvo, "mob.zombie.say", p, 0.8, aleatorio(0.7, 0.9)));
}

/** @param {Player} alvo */
function explosao(alvo) {
  const p = relativo(alvo, aleatorio(22, 30), aleatorio(0, 360));
  tocar(alvo, "random.explode", p, 2, 0.8);
  agendar(alvo, 4, () => tremer(alvo, 0.2));
}

/** @param {Player} alvo */
function flecha(alvo) {
  let t = 0;
  for (let i = 0; i < 3; i++) {
    agendar(alvo, t, () => {
      const p = relativo(alvo, aleatorio(10, 16), aleatorio(0, 360));
      tocar(alvo, "random.bow", p, 1, aleatorio(0.9, 1.1));
      agendar(alvo, 8, () => tocar(alvo, "random.bowhit", relativo(alvo, aleatorio(1, 3), aleatorio(0, 360)), 1, aleatorio(0.9, 1.1)));
    });
    t += inteiro(25, 45);
  }
}

/** @param {Player} alvo */
function tnt(alvo) {
  const p = relativo(alvo, 3, 160);
  tocar(alvo, "random.fuse", p, 1, 1);
  agendar(alvo, 50, () => {
    tocar(alvo, "random.explode", p, 2, 1);
    tremer(alvo, 0.5);
    try {
      alvo.dimension.spawnParticle("minecraft:huge_explosion_emitter", p);
    } catch {
      // partícula não existe: fica o estrondo
    }
  });
}

/** @param {Player} alvo */
function coracao(alvo) {
  for (let i = 0; i < 8; i++) agendar(alvo, i * 32, () => tocarNela(alvo, "mob.warden.heartbeat", 1, 1));
}

/** @param {Player} alvo */
function caverna(alvo) {
  for (let i = 0; i < 3; i++) agendar(alvo, i * inteiro(50, 90), () => tocarNela(alvo, "ambient.cave", 1, aleatorio(0.9, 1.1)));
}

// ------------------------------------------------------------------------------------ Herobrine
/** @typedef {"longe" | "atras" | "frente" | "olhos"} ModoCriatura */
/** @typedef {"herobrine" | "sombra" | "olhos"} TipoCriatura */

/**
 * Faz uma criatura de susto aparecer perto da pessoa.
 * "longe": parada a ~22 blocos, olhando; se aproxima quando a pessoa desvia o olhar e grita se for olhada de perto.
 * "atras": a 3,5 blocos, nas costas; grita se a pessoa se virar. "frente": na cara, grito imediato.
 * "olhos": só um par de olhos brancos no escuro, piscando; some quando alguém chega perto ou encara.
 * @param {Player} alvo
 * @param {ModoCriatura} modo
 * @param {TipoCriatura} [tipo]
 */
function aparecer(alvo, modo, tipo = "herobrine") {
  if (herobrines.has(alvo.id)) sumir(alvo.id, alvo, true);
  const lado = inteiro(0, 1) ? 1 : -1;
  const graus = modo === "atras" ? aleatorio(165, 195) : modo === "frente" ? aleatorio(-15, 15) : modo === "olhos" ? aleatorio(-70, 70) : lado * aleatorio(60, 100);
  const dist = modo === "atras" ? 3.5 : modo === "frente" ? 2.6 : modo === "olhos" ? aleatorio(9, 14) : aleatorio(15, 21);
  const p = relativo(alvo, dist, graus);
  const y = chaoEm(alvo, p.x, p.z);
  if (y === undefined) return false;
  const ponto = { x: Math.floor(p.x) + 0.5, y, z: Math.floor(p.z) + 0.5 };
  const ent = alvo.dimension.spawnEntity(ENTIDADES[tipo], ponto);
  ent.addTag(TAG_HEROBRINE);
  const agora = system.currentTick;
  herobrines.set(alvo.id, { ent, modo, tipo, inicio: agora, olhando: 0, passo: agora + 30, passoOlhado: agora + 70, batida: agora, gritou: false });
  if (modo === "longe") {
    // ele "já estava lá": a tela pisca no escuro e, no canto do olho, aparece uma silhueta no meio da névoa
    fade(alvo, [0, 0, 0], 0.05, 0.12, 0.2);
    efeito(alvo, "darkness", 40, 0);
    tocarNela(alvo, "ambient.cave", 1, 0.7);
    nevoa(alvo, 45, "minecraft:fog_soulsand_valley");
    const h = herobrines.get(alvo.id);
    if (h) h.nevoa = true;
  } else if (modo === "atras") {
    tocarNela(alvo, "ambient.cave", 0.5, 0.6);
  } else if (modo === "olhos") {
    tocar(alvo, "mob.vex.ambient", ponto, 0.5, 0.4);
  }
  return true;
}

/** Tira a criatura (com um sonzinho e fumaça). @param {string} id @param {Player | undefined} alvo @param {boolean} [quieto] */
function sumir(id, alvo, quieto = false) {
  const h = herobrines.get(id);
  if (!h) return;
  herobrines.delete(id);
  try {
    if (h.ent.isValid) {
      if (h.nevoa) tirarNevoa(alvo);
      if (alvo?.isValid && !quieto) tocar(alvo, h.tipo === "olhos" ? "mob.vex.ambient" : "mob.endermen.portal", h.ent.location, 0.8, 0.5);
      if (!quieto && h.tipo !== "olhos") {
        try {
          h.ent.dimension.spawnParticle("minecraft:large_explosion", h.ent.location);
        } catch {
          // sem partícula
        }
      }
      h.ent.remove();
    }
  } catch {
    // já se foi
  }
}

/** Clarão: a tela vai a uma cor e volta. @param {Player} alvo @param {[number, number, number]} cor @param {number} entra @param {number} fica @param {number} sai */
function fade(alvo, cor, entra, fica, sai) {
  try {
    alvo.camera.fade({ fadeColor: { red: cor[0], green: cor[1], blue: cor[2] }, fadeTime: { fadeInTime: entra, holdTime: fica, fadeOutTime: sai } });
  } catch (e) {
    registrarErro("Pegadinha: fade", e);
  }
}

/**
 * O grito: ele dispara em cima da pessoa (em 0,5 s vai do chão a centímetros do rosto e fica ali um instante), com grito, clarão branco, tela
 * tremendo e apagão, e some.
 * @param {string} id @param {Player | undefined} alvo
 */
function jumpscare(id, alvo) {
  const h = herobrines.get(id);
  if (!h || h.correndo) return;
  h.gritou = true;
  h.correndo = true;
  if (!alvo?.isValid) {
    sumir(id, alvo, true);
    return;
  }
  const sombra = h.tipo === "sombra";
  tocarNela(alvo, sombra ? "mob.ghast.scream" : "mob.endermen.scream", 2, sombra ? 0.45 : 0.5);
  efeito(alvo, "darkness", 80, 0);
  const rumo = [3.2, 2.1, 1.3, 0.8];
  rumo.forEach((d, i) => {
    system.runTimeout(() => {
      try {
        if (!h.ent.isValid || !alvo.isValid) return;
        const v = alvo.getViewDirection();
        const l = alvo.location;
        h.ent.teleport({ x: l.x + v.x * d, y: l.y, z: l.z + v.z * d });
        h.ent.setRotation({ x: 0, y: Math.round((Math.atan2(v.x, -v.z) * 180) / Math.PI) });
        if (i === 2) tremer(alvo, 0.8);
      } catch {
        // alvo saiu
      }
    }, i * 3);
  });
  system.runTimeout(() => {
    if (alvo.isValid) {
      tocarNela(alvo, sombra ? "mob.warden.roar" : "mob.ghast.scream", 1.6, 0.55);
      fade(alvo, [1, 1, 1], 0.02, 0.15, 0.5);
      efeito(alvo, "blindness", 16, 0);
    }
    sumir(id, alvo, true);
  }, 17);
}

/** Dá um passo em direção à vítima (só quando ela não está olhando). @param {Player} alvo @param {{ ent: Entity }} h @param {number} passo */
function aproximar(alvo, h, passo) {
  const e = h.ent.location;
  const l = alvo.location;
  const dist = Math.hypot(l.x - e.x, l.z - e.z) || 1;
  const nx = e.x + ((l.x - e.x) / dist) * passo;
  const nz = e.z + ((l.z - e.z) / dist) * passo;
  const y = chaoEm(alvo, nx, nz) ?? e.y;
  const ponto = { x: nx, y, z: nz };
  h.ent.teleport(ponto);
  tocar(alvo, somDoPasso(alvo), ponto, 0.7, aleatorio(0.7, 0.85));
}

system.runInterval(() => {
  try {
    for (const [id, h] of [...herobrines]) {
      const alvo = world.getAllPlayers().find((p) => p.id === id);
      if (!alvo?.isValid || !h.ent.isValid || h.ent.dimension.id !== alvo.dimension.id) {
        sumir(id, alvo, true);
        continue;
      }
      if (h.correndo) continue;
      const e = h.ent.location;
      const l = alvo.location;
      const dx = e.x - l.x;
      const dz = e.z - l.z;
      const dist = Math.hypot(dx, dz);
      // vira o rosto para a vítima
      const yaw = Math.round((Math.atan2(-(l.x - e.x), l.z - e.z) * 180) / Math.PI);
      h.ent.setRotation({ x: 0, y: yaw });
      // a vítima está olhando para ele?
      const v = alvo.getViewDirection();
      const dot = dist > 0 ? (v.x * dx + v.z * dz) / (Math.hypot(v.x, v.z) * dist || 1) : 1;
      const olhando = dot > 0.85;
      h.olhando = olhando ? h.olhando + PASSO_HEROBRINE : 0;
      const agora = system.currentTick;
      const vivo = agora - h.inicio;
      // coração batendo, mais forte quanto mais perto
      if (h.modo !== "frente" && h.modo !== "olhos" && h.modo !== "duplo" && h.modo !== "janela" && agora >= h.batida) {
        h.batida = agora + 36;
        tocarNela(alvo, "mob.warden.heartbeat", 0.5 + (1 - Math.min(dist, 24) / 24) * 1.5, 1);
      }
      if (h.modo === "frente") {
        if (vivo >= 8) jumpscare(id, alvo);
      } else if (h.modo === "atras") {
        if (dot > 0.5) jumpscare(id, alvo);
        else if (vivo > 100) sumir(id, alvo, true);
      } else if (h.modo === "olhos") {
        if (dist <= 5 || h.olhando >= 40 || vivo > 260) sumir(id, alvo);
      } else if (h.modo === "duplo") {
        if (h.olhando >= 10) {
          tocar(alvo, "mob.vex.ambient", e, 1, 0.35);
          sumir(id, alvo, true);
        } else if (dist < 8 || vivo > 400) sumir(id, alvo, true);
      } else if (h.modo === "janela") {
        if (dist <= 4 || vivo > 120) sumir(id, alvo, true);
      } else {
        if (dist < 14 && agora % 60 < PASSO_HEROBRINE) tocar(alvo, "mob.vex.ambient", e, 1, 0.4);
        if (dist <= 3.2 || (olhando && dist <= 6)) jumpscare(id, alvo);
        else if (vivo > config().pegadinhaHerobrineSeg * 20 || (h.olhando >= 140 && dist > 8)) sumir(id, alvo);
        else if (!olhando && agora >= h.passo) {
          // quando ela desvia o olhar, ele dá passos rápidos e longos
          h.passo = agora + inteiro(12, 24);
          aproximar(alvo, h, aleatorio(1.8, 2.8));
        } else if (olhando && dist > 10 && agora >= h.passoOlhado) {
          // mesmo sendo olhado, ele vai chegando aos poucos (um pulinho de cada vez)
          h.passoOlhado = agora + inteiro(45, 75);
          aproximar(alvo, h, 1);
        }
      }
    }
  } catch (e) {
    registrarErro("Pegadinhas: criaturas", e);
  }
}, PASSO_HEROBRINE);

// ------------------------------------------------------------------------------------ mais sons
/** Sussurros girando em volta da cabeça. @param {Player} alvo */
function sussurros(alvo) {
  const sentido = inteiro(0, 1) ? 1 : -1;
  for (let i = 0; i < 14; i++) {
    agendar(alvo, i * 10, () => {
      const p = relativo(alvo, 1.7, i * 38 * sentido);
      tocar(alvo, "mob.vex.ambient", { x: p.x, y: p.y + 1.5, z: p.z }, 0.9, 0.5);
    });
  }
}

/** Sino ao longe, três badaladas. @param {Player} alvo */
function sino(alvo) {
  const p = relativo(alvo, 28, aleatorio(0, 360));
  for (let i = 0; i < 3; i++) agendar(alvo, i * 70, () => tocar(alvo, "block.bell.hit", p, 2, 0.6));
}

/** O disco 11, com chiado de fita, vindo de algum lugar. @param {Player} alvo */
function disco(alvo) {
  const p = relativo(alvo, 16, aleatorio(0, 360));
  tocar(alvo, "record.11", p, 2, 0.9);
  agendar(alvo, 260, () => {
    try {
      alvo.runCommand("stopsound @s record.11");
    } catch {
      // o som acaba sozinho
    }
  });
}

/** Grito bem longe. @param {Player} alvo */
function gritoDistante(alvo) {
  const p = relativo(alvo, 38, aleatorio(0, 360));
  tocar(alvo, "mob.ghast.scream", p, 2, 0.6);
  agendar(alvo, 50, () => tocarNela(alvo, "ambient.cave", 0.8, 0.7));
}

/** Choro de ghast, longe. @param {Player} alvo */
function choroGhast(alvo) {
  const p = relativo(alvo, 30, aleatorio(0, 360));
  for (let i = 0; i < 3; i++) agendar(alvo, i * 55, () => tocar(alvo, "mob.ghast.moan", p, 2, 0.7));
}

/** Tremor: o chão estremece e cai pedra de algum lugar. @param {Player} alvo */
function tremor(alvo) {
  tocarNela(alvo, "random.explode", 1, 0.5);
  for (let i = 0; i < 5; i++) {
    agendar(alvo, i * 22, () => {
      tremer(alvo, 0.35);
      const p = relativo(alvo, aleatorio(3, 8), aleatorio(0, 360));
      tocar(alvo, "dig.stone", { x: p.x, y: p.y + 3, z: p.z }, 1.2, aleatorio(0.6, 0.9));
    });
  }
}

/** Um Warden se aproximando no escuro: escuridão pulsando, coração acelerando e o rugido. @param {Player} alvo */
function warden(alvo) {
  const fases = ["mob.warden.nearby_close", "mob.warden.nearby_close", "mob.warden.nearby_closer", "mob.warden.nearby_closer", "mob.warden.nearby_closest", "mob.warden.nearby_closest"];
  let t = 0;
  fases.forEach((som, i) => {
    agendar(alvo, t, () => {
      tocar(alvo, som, relativo(alvo, 8 - i, aleatorio(0, 360)), 1.2, 1);
      efeito(alvo, "darkness", 45, 0);
      tocarNela(alvo, "mob.warden.heartbeat", 1 + i * 0.2, 1);
      if (i >= 3) tremer(alvo, 0.15 + i * 0.05);
    });
    t += 64 - i * 8;
  });
  agendar(alvo, t + 30, () => {
    tocar(alvo, "mob.warden.roar", relativo(alvo, 9, aleatorio(0, 360)), 2, 1);
    tremer(alvo, 0.6);
  });
}

// ------------------------------------------------------------------------------------ ambiente de verdade (sempre devolvido)
/** Luzes pequenas que a pegadinha apaga e depois devolve (nada de bloco inteiro). */
const LUZES = /torch|lantern|candle|end_rod/;
const CHAVE_LUZES = "vulpus:pegadinha_luzes";
/** @typedef {{ d: string, x: number, y: number, z: number, tipo: string, estados: Record<string, string | number | boolean> }} LuzApagada */
/** @type {Map<string, LuzApagada[]>} */
const luzesApagadas = new Map();
/** @typedef {{ d: string, x: number, y: number, z: number, aberta: boolean }} PortaMexida */
/** @type {Map<string, PortaMexida[]>} */
const portasMexidas = new Map();

function guardarLuzes() {
  try {
    salvarMundo(CHAVE_LUZES, [...luzesApagadas.values()].flat());
  } catch (e) {
    registrarErro("Pegadinhas: guardar luzes", e);
  }
}

/** Devolve as luzes (de uma pessoa ou, sem id, todas); as que estão em chunk descarregado ficam para depois. @param {string} [id] */
function restaurarLuzes(id) {
  for (const [dono, lista] of [...luzesApagadas]) {
    if (id !== undefined && dono !== id) continue;
    const faltam = lista.filter((l) => {
      try {
        const dim = world.getDimension(l.d);
        const b = dim.getBlock({ x: l.x, y: l.y, z: l.z });
        if (!b) return true;
        b.setPermutation(BlockPermutation.resolve(l.tipo, l.estados));
        return false;
      } catch {
        return true;
      }
    });
    if (faltam.length) luzesApagadas.set(dono, faltam);
    else luzesApagadas.delete(dono);
  }
  guardarLuzes();
}

/** Apaga tochas, lanternas e velas por perto e devolve depois. Devolve quantas apagou. @param {Player} alvo @param {number} [raio] @param {number} [segundos] */
function apagarLuzes(alvo, raio = 10, segundos = 25) {
  const dim = alvo.dimension;
  const cx = Math.floor(alvo.location.x);
  const cy = Math.floor(alvo.location.y);
  const cz = Math.floor(alvo.location.z);
  /** @type {LuzApagada[]} */
  const achadas = [];
  for (let dx = -raio; dx <= raio && achadas.length < 60; dx++) {
    for (let dz = -raio; dz <= raio && achadas.length < 60; dz++) {
      for (let dy = -4; dy <= 6; dy++) {
        let b;
        try {
          b = dim.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
        } catch {
          continue;
        }
        if (!b || !LUZES.test(b.typeId) || /cake/.test(b.typeId)) continue;
        achadas.push({ d: dim.id, x: b.x, y: b.y, z: b.z, tipo: b.typeId, estados: /** @type {any} */ (b.permutation.getAllStates()) });
      }
    }
  }
  if (achadas.length === 0) return 0;
  const antes = luzesApagadas.get(alvo.id) ?? [];
  luzesApagadas.set(alvo.id, [...antes, ...achadas]);
  guardarLuzes();
  for (const l of achadas) {
    try {
      dim.getBlock({ x: l.x, y: l.y, z: l.z })?.setType("minecraft:air");
    } catch (e) {
      registrarErro("Pegadinhas: apagar luz", e);
    }
  }
  tocarNela(alvo, "random.fizz", 1, 0.8);
  const id = alvo.id;
  system.runTimeout(() => restaurarLuzes(id), segundos * 20);
  return achadas.length;
}

/** Devolve as portas ao estado de antes. @param {string} [id] */
function restaurarPortas(id) {
  for (const [dono, lista] of [...portasMexidas]) {
    if (id !== undefined && dono !== id) continue;
    for (const p of lista) {
      try {
        const b = world.getDimension(p.d).getBlock({ x: p.x, y: p.y, z: p.z });
        if (b && /door|gate|lever/.test(b.typeId)) b.setPermutation(b.permutation.withState("open_bit", p.aberta));
      } catch {
        // chunk descarregado: a porta fica como está
      }
    }
    portasMexidas.delete(dono);
  }
}

/** Portas por perto abrindo e batendo sozinhas (voltam ao que eram). @param {Player} alvo */
function portasBatendo(alvo) {
  const dim = alvo.dimension;
  const cx = Math.floor(alvo.location.x);
  const cy = Math.floor(alvo.location.y);
  const cz = Math.floor(alvo.location.z);
  /** @type {PortaMexida[]} */
  const portas = [];
  for (let dx = -9; dx <= 9 && portas.length < 12; dx++) {
    for (let dz = -9; dz <= 9 && portas.length < 12; dz++) {
      for (let dy = -2; dy <= 3; dy++) {
        let b;
        try {
          b = dim.getBlock({ x: cx + dx, y: cy + dy, z: cz + dz });
        } catch {
          continue;
        }
        if (!b || !/_door$|^minecraft:(wooden|iron)_door$/.test(b.typeId) || b.permutation.getState("upper_block_bit") === true) continue;
        portas.push({ d: dim.id, x: b.x, y: b.y, z: b.z, aberta: b.permutation.getState("open_bit") === true });
      }
    }
  }
  if (portas.length === 0) {
    // sem porta de verdade por perto: fica o barulho
    porta(alvo);
    return;
  }
  portasMexidas.set(alvo.id, [...(portasMexidas.get(alvo.id) ?? []), ...portas]);
  /** @param {boolean} abrir */
  const girar = (abrir) => {
    for (const p of portas) {
      try {
        for (const dy of [0, 1]) {
          const b = dim.getBlock({ x: p.x, y: p.y + dy, z: p.z });
          if (b && /door/.test(b.typeId)) b.setPermutation(b.permutation.withState("open_bit", abrir ? !p.aberta : p.aberta));
        }
        tocar(alvo, abrir ? "random.door_open" : "random.door_close", { x: p.x + 0.5, y: p.y, z: p.z + 0.5 }, 1.2, aleatorio(0.85, 1));
      } catch {
        // porta sumiu
      }
    }
  };
  const id = alvo.id;
  for (const [t, abrir] of /** @type {[number, boolean][]} */ ([[0, true], [12, false], [34, true], [46, false], [80, true], [90, false]])) {
    system.runTimeout(() => girar(abrir), t);
  }
  system.runTimeout(() => restaurarPortas(id), 110);
}

/** Névoa pesada em volta (some sozinha; vermelha por padrão). @param {Player} alvo @param {number} [segundos] @param {string} [fogId] */
function nevoa(alvo, segundos = 25, fogId = "minecraft:fog_hell") {
  tirarNevoa(alvo);
  try {
    alvo.runCommand(`fog @s push ${fogId} "vulpus_pegadinha"`);
  } catch (e) {
    registrarErro("Pegadinha: névoa", e);
    return;
  }
  tocarNela(alvo, "ambient.cave", 0.8, 0.6);
  const id = alvo.id;
  system.runTimeout(() => tirarNevoa(world.getAllPlayers().find((p) => p.id === id)), segundos * 20);
}

/** @param {Player | undefined} p */
function tirarNevoa(p) {
  if (!p?.isValid) return;
  try {
    p.runCommand('fog @s remove "vulpus_pegadinha"');
  } catch {
    // sem a névoa
  }
}

/** Apagão: a tela escurece, as luzes se apagam e o escuro pesa. @param {Player} alvo */
function blecaute(alvo) {
  fade(alvo, [0, 0, 0], 0.4, 2.2, 0.8);
  efeito(alvo, "darkness", 120, 0);
  tocarNela(alvo, "random.fizz", 1, 0.6);
  apagarLuzes(alvo);
  agendar(alvo, 30, () => caverna(alvo));
  agendar(alvo, 60, () => coracao(alvo));
}

/** Flash branco e trovão. @param {Player} alvo */
function flash(alvo) {
  fade(alvo, [1, 1, 1], 0.02, 0.1, 0.5);
  tocarNela(alvo, "ambient.weather.lightning.impact", 2, 0.9);
  tremer(alvo, 0.3);
}

// ------------------------------------------------------------------------------------ mais telas e chat falsos
/** Letras embaralhadas (§k pega o resto). @param {number} n */
const lixo = (n) => Array.from({ length: n }, () => "abcdefghijklmnopqrstuvwxyz"[inteiro(0, 25)]).join("");

/** Chama o nome da pessoa, cada vez mais perto. @param {Player} alvo */
function chamando(alvo) {
  const nome = alvo.name;
  agendar(alvo, 0, () => crua(alvo, `§8§o...${nome}...`));
  agendar(alvo, 50, () => {
    crua(alvo, `§7§o${nome}...`);
    sussurros(alvo);
  });
  agendar(alvo, 120, () => crua(alvo, `§c§k||§r §4§l${nome}§r §c§k||`));
}

/** Mensagens de um remetente corrompido. @param {Player} alvo */
function corrompido(alvo) {
  const falas = ["eu vejo você", "olhe para trás", "você não está sozinho", "ele está atrás de você", "corra"];
  for (let i = 0; i < 4; i++) {
    agendar(alvo, i * 45, () => {
      crua(alvo, `§8<§k${lixo(inteiro(6, 10))}§r§8> §4§o${falas[inteiro(0, falas.length - 1)]}`);
      tocarNela(alvo, "note.bass", 0.8, 0.5 + i * 0.1);
    });
  }
}

/** Contagem regressiva vermelha que termina com o Herobrine na cara. @param {Player} alvo */
function contagem(alvo) {
  for (let n = 5; n >= 1; n--) {
    const k = n;
    agendar(alvo, (5 - n) * 22, () => {
      mostrarTitulo(alvo, `§4§l${k}`, { entrada: 0, fica: 16, saida: 3 });
      tocarNela(alvo, "mob.warden.heartbeat", 1 + (5 - k) * 0.25, 1);
    });
  }
  agendar(alvo, 5 * 22 + 6, () => aparecer(alvo, "frente", "herobrine"));
}

// ------------------------------------------------------------------------------------ perseguidor e combos
/** Um som qualquer de "tem alguém aqui", para entremear. @param {Player} alvo */
function somAleatorio(alvo) {
  const f = [passos, minerar, tunel, porta, caverna, sussurros, sino, zumbi, gritoDistante, choroGhast, bau][inteiro(0, 10)];
  f(alvo);
}

/**
 * Perseguidor: por alguns minutos, ele reaparece de vez em quando (Herobrine, olhos ou sombra) com sons entre as visitas.
 * @param {Player} alvo
 * @param {number} [minutos]
 */
function perseguidor(alvo, minutos = 3) {
  const fim = system.currentTick + minutos * 1200;
  const ciclo = () => {
    if (system.currentTick >= fim) return;
    const r = Math.random();
    if (!herobrines.has(alvo.id)) {
      if (r < 0.5) aparecer(alvo, "longe", "herobrine");
      else if (r < 0.8) aparecer(alvo, "olhos", "olhos");
      else aparecer(alvo, "longe", "sombra");
    }
    agendar(alvo, inteiro(120, 260), () => somAleatorio(alvo));
    agendar(alvo, inteiro(450, 900), ciclo);
  };
  agendar(alvo, inteiro(100, 300), ciclo);
}

/** Pesadelo (~1 min 30 s): névoa, olhos, sussurros, apagão, sombra e um susto final. @param {Player} alvo */
function pesadelo(alvo) {
  nevoa(alvo, 70);
  agendar(alvo, 20, () => crua(alvo, textos.ENTROU));
  agendar(alvo, 120, () => aparecer(alvo, "olhos", "olhos"));
  agendar(alvo, 260, () => sussurros(alvo));
  agendar(alvo, 440, () => blecaute(alvo));
  agendar(alvo, 640, () => aparecer(alvo, "longe", "sombra"));
  agendar(alvo, 1000, () => chamando(alvo));
  agendar(alvo, 1240, () => corrompido(alvo));
  agendar(alvo, 1500, () => aparecer(alvo, "atras", "herobrine"));
  agendar(alvo, 1700, () => aparecer(alvo, "frente", "herobrine"));
  agendar(alvo, 1800, () => crua(alvo, textos.SAIU));
}

// ------------------------------------------------------------------------------------ duplo e silhueta
/** O Duplo: uma figura cinza, com o nome da pessoa, parada ao longe; some se ela olha. @param {Player} alvo */
function duplo(alvo) {
  if (herobrines.has(alvo.id)) sumir(alvo.id, alvo, true);
  const p = relativo(alvo, aleatorio(14, 20), aleatorio(-55, 55));
  const y = chaoEm(alvo, p.x, p.z);
  if (y === undefined) return false;
  const ent = alvo.dimension.spawnEntity(ENTIDADES.duplo, { x: Math.floor(p.x) + 0.5, y, z: Math.floor(p.z) + 0.5 });
  ent.addTag(TAG_HEROBRINE);
  ent.nameTag = alvo.name;
  const agora = system.currentTick;
  herobrines.set(alvo.id, { ent, modo: "duplo", tipo: "duplo", inicio: agora, olhando: 0, passo: agora, passoOlhado: agora, batida: agora, gritou: false });
  tocarNela(alvo, "mob.vex.ambient", 0.6, 0.4);
  return true;
}

/** Silhueta alta atrás de um vidro (janela) por perto. Devolve false se não há vidro. @param {Player} alvo */
function silhueta(alvo) {
  if (herobrines.has(alvo.id)) sumir(alvo.id, alvo, true);
  const dim = alvo.dimension;
  const l = alvo.location;
  let melhor;
  let dMelhor = Infinity;
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      const d = Math.hypot(dx, dz);
      if (d < 4 || d > 10 || d >= dMelhor) continue;
      for (let dy = -1; dy <= 3; dy++) {
        let b;
        try {
          b = dim.getBlock({ x: Math.floor(l.x) + dx, y: Math.floor(l.y) + dy, z: Math.floor(l.z) + dz });
        } catch {
          continue;
        }
        if (!b || !/glass/.test(b.typeId)) continue;
        // do outro lado do vidro (afastando da pessoa) tem que caber alguém
        const nx = dx / d;
        const nz = dz / d;
        const px = b.x + 0.5 + nx * 1.6;
        const pz = b.z + 0.5 + nz * 1.6;
        const y = chaoEm(alvo, px, pz);
        if (y === undefined || Math.abs(y - Math.floor(l.y)) > 2) continue;
        melhor = { x: Math.floor(px) + 0.5, y, z: Math.floor(pz) + 0.5 };
        dMelhor = d;
        break;
      }
    }
  }
  if (!melhor) return false;
  const ent = dim.spawnEntity(ENTIDADES.sombra, melhor);
  ent.addTag(TAG_HEROBRINE);
  const agora = system.currentTick;
  herobrines.set(alvo.id, { ent, modo: "janela", tipo: "sombra", inicio: agora, olhando: 0, passo: agora, passoOlhado: agora, batida: agora, gritou: false });
  tocarNela(alvo, "ambient.cave", 0.6, 0.6);
  return true;
}

// ------------------------------------------------------------------------------------ mais sons e rastros
/** Música de caixinha que desafina e acaba no meio. @param {Player} alvo */
function caixaMusica(alvo) {
  const base = relativo(alvo, aleatorio(10, 14), aleatorio(0, 360));
  const melodia = [0, 3, 7, 12, 10, 7, 3, 0, 3, 7, 10, 12, 15, 12, 10, 7, 8, 7, 3, 2, 0, -2];
  let t = 0;
  melodia.forEach((nota, i) => {
    const desafina = 1 - i * 0.004;
    const tom = Math.min(2, 0.62 * 2 ** (nota / 12) * desafina);
    agendar(alvo, t, () => tocar(alvo, "note.chime", base, 1.4, tom));
    t += 7 + Math.floor(i / 6) * 2;
  });
  agendar(alvo, t + 20, () => tocar(alvo, "note.chime", base, 1.2, 0.5));
}

/** Pregos de caixão: batidas lentas, de baixo da terra. @param {Player} alvo */
function pregos(alvo) {
  const p = relativo(alvo, aleatorio(2, 6), aleatorio(0, 360));
  for (let i = 0; i < 7; i++) agendar(alvo, i * 14 + (i > 3 ? 14 : 0), () => tocar(alvo, "dig.wood", { x: p.x, y: p.y - 2, z: p.z }, 1.4, 0.55));
}

/** Vidro quebrando em outro cômodo. @param {Player} alvo */
function vidroQuebrando(alvo) {
  const p = relativo(alvo, aleatorio(9, 15), aleatorio(0, 360));
  tocar(alvo, "random.glass", p, 2, aleatorio(0.8, 1));
  agendar(alvo, 40, () => tocar(alvo, "dig.stone", p, 0.6, 0.7));
}

/** Tenta a primeira partícula que existir. @param {Player} alvo @param {string[]} ids @param {Pos} pos */
function particula(alvo, ids, pos) {
  for (const id of ids) {
    try {
      alvo.dimension.spawnParticle(id, pos);
      return;
    } catch {
      // esse id não existe: tenta o seguinte
    }
  }
}

/** Pegadas de fumaça aparecendo atrás, uma a uma, até parar do lado. @param {Player} alvo */
function pegadas(alvo) {
  const lado = aleatorio(-25, 25);
  let t = 0;
  for (let dist = 9; dist > 1.4; dist -= 0.8) {
    const d = dist;
    const k = Math.round(t / 8);
    agendar(alvo, t, () => {
      const p = relativo(alvo, d, 180 + lado + (k % 2 ? 6 : -6));
      const y = chaoEm(alvo, p.x, p.z) ?? p.y;
      tocar(alvo, somDoPasso(alvo), p, 0.8, aleatorio(0.85, 1));
      particula(alvo, ["minecraft:basic_smoke_particle", "minecraft:smoke_particle"], { x: p.x, y: y + 0.1, z: p.z });
    });
    t += 8;
  }
}

/** Poças e gotas vermelhas no chão, só visuais. @param {Player} alvo */
function sangue(alvo) {
  const c = relativo(alvo, aleatorio(3, 6), aleatorio(-40, 40));
  for (let i = 0; i < 24; i++) {
    agendar(alvo, i * 5, () => {
      const x = c.x + aleatorio(-0.8, 0.8);
      const z = c.z + aleatorio(-0.8, 0.8);
      const y = chaoEm(alvo, x, z) ?? c.y;
      particula(alvo, ["minecraft:redstone_ore_dust_particle", "minecraft:crit_emitter"], { x, y: y + 0.05, z });
      if (i % 6 === 0) tocar(alvo, "dig.gravel", { x, y, z }, 0.5, 0.6);
    });
  }
}

// ------------------------------------------------------------------------------------ poltergeist e placas
const CHAVE_PLACAS = "vulpus:pegadinha_placas";
/** @typedef {{ d: string, x: number, y: number, z: number, texto: string }} PlacaMexida */
/** @type {Map<string, PlacaMexida[]>} */
const placasMexidas = new Map();
const FRASES_PLACA = ["ELE ESTÁ AQUI", "OLHE PARA TRÁS", "NÃO SAIA DAÍ", "EU VEJO VOCÊ", "CORRA"];

function guardarPlacas() {
  try {
    salvarMundo(CHAVE_PLACAS, [...placasMexidas.values()].flat());
  } catch (e) {
    registrarErro("Pegadinhas: guardar placas", e);
  }
}

/** Devolve o texto das placas (de uma pessoa ou de todas). @param {string} [id] */
function restaurarPlacas(id) {
  for (const [dono, lista] of [...placasMexidas]) {
    if (id !== undefined && dono !== id) continue;
    const faltam = lista.filter((pl) => {
      try {
        const b = world.getDimension(pl.d).getBlock({ x: pl.x, y: pl.y, z: pl.z });
        const sinal = b?.getComponent("minecraft:sign");
        if (!sinal) return !b;
        sinal.setText(pl.texto);
        return false;
      } catch {
        return true;
      }
    });
    if (faltam.length) placasMexidas.set(dono, faltam);
    else placasMexidas.delete(dono);
  }
  guardarPlacas();
}

/** Placas por perto mudam de texto por um tempo e depois voltam. @param {Player} alvo @param {number} [segundos] */
function placaAssombrada(alvo, segundos = 22) {
  const dim = alvo.dimension;
  const l = alvo.location;
  /** @type {PlacaMexida[]} */
  const achadas = [];
  for (let dx = -12; dx <= 12 && achadas.length < 5; dx++) {
    for (let dz = -12; dz <= 12 && achadas.length < 5; dz++) {
      for (let dy = -3; dy <= 4; dy++) {
        let b;
        try {
          b = dim.getBlock({ x: Math.floor(l.x) + dx, y: Math.floor(l.y) + dy, z: Math.floor(l.z) + dz });
        } catch {
          continue;
        }
        if (!b || !/sign/.test(b.typeId)) continue;
        const sinal = b.getComponent("minecraft:sign");
        if (!sinal) continue;
        const texto = sinal.getText() ?? "";
        achadas.push({ d: dim.id, x: b.x, y: b.y, z: b.z, texto: typeof texto === "string" ? texto : "" });
      }
    }
  }
  if (achadas.length === 0) return false;
  placasMexidas.set(alvo.id, [...(placasMexidas.get(alvo.id) ?? []), ...achadas]);
  guardarPlacas();
  const frase = FRASES_PLACA[inteiro(0, FRASES_PLACA.length - 1)];
  for (const pl of achadas) {
    try {
      dim.getBlock({ x: pl.x, y: pl.y, z: pl.z })?.getComponent("minecraft:sign")?.setText(`§4${frase}`);
    } catch (e) {
      registrarErro("Pegadinha: placa", e);
    }
  }
  tocarNela(alvo, "random.click", 1, 0.5);
  const id = alvo.id;
  system.runTimeout(() => restaurarPlacas(id), segundos * 20);
  return true;
}

/** Alçapões, portões, alavancas e portas se mexendo sozinhos (voltam ao que eram). @param {Player} alvo */
function poltergeist(alvo) {
  const dim = alvo.dimension;
  const l = alvo.location;
  /** @type {PortaMexida[]} */
  const coisas = [];
  for (let dx = -9; dx <= 9 && coisas.length < 16; dx++) {
    for (let dz = -9; dz <= 9 && coisas.length < 16; dz++) {
      for (let dy = -2; dy <= 3; dy++) {
        let b;
        try {
          b = dim.getBlock({ x: Math.floor(l.x) + dx, y: Math.floor(l.y) + dy, z: Math.floor(l.z) + dz });
        } catch {
          continue;
        }
        if (!b || !/trapdoor|fence_gate|lever|_door$/.test(b.typeId) || b.permutation.getState("upper_block_bit") === true) continue;
        const aberta = b.permutation.getState("open_bit");
        if (typeof aberta !== "boolean") continue;
        coisas.push({ d: dim.id, x: b.x, y: b.y, z: b.z, aberta });
        // a metade de cima da porta também precisa voltar
        if (/_door$/.test(b.typeId)) {
          const cima = dim.getBlock({ x: b.x, y: b.y + 1, z: b.z });
          const ab2 = cima?.permutation.getState("open_bit");
          if (cima && typeof ab2 === "boolean") coisas.push({ d: dim.id, x: b.x, y: b.y + 1, z: b.z, aberta: ab2 });
        }
      }
    }
  }
  if (coisas.length === 0) {
    tocar(alvo, "random.click", relativo(alvo, 4, aleatorio(0, 360)), 1, 0.6);
    return false;
  }
  portasMexidas.set(alvo.id, [...(portasMexidas.get(alvo.id) ?? []), ...coisas]);
  const id = alvo.id;
  for (let i = 0; i < 9; i++) {
    system.runTimeout(() => {
      const c = coisas[inteiro(0, coisas.length - 1)];
      try {
        const b = world.getDimension(c.d).getBlock({ x: c.x, y: c.y, z: c.z });
        if (!b) return;
        const agora = b.permutation.getState("open_bit") === true;
        b.setPermutation(b.permutation.withState("open_bit", !agora));
        const som = /lever/.test(b.typeId) ? "random.click" : !agora ? "random.door_open" : "random.door_close";
        const p = world.getAllPlayers().find((x) => x.id === id);
        if (p?.isValid) tocar(p, som, { x: c.x + 0.5, y: c.y, z: c.z + 0.5 }, 1.2, aleatorio(0.8, 1));
      } catch {
        // bloco sumiu
      }
    }, i * 14 + inteiro(0, 8));
  }
  system.runTimeout(() => restaurarPortas(id), 9 * 14 + 40);
  return true;
}

// ------------------------------------------------------------------------------------ itens e telas
/** Um papel com um recado no inventário (pode ser jogado fora). @param {Player} alvo */
function carta(alvo) {
  try {
    const item = new ItemStack("minecraft:paper", 1);
    item.nameTag = "§4§oCarta";
    item.setLore(["§8§oeu estava na sua casa", "§c§oolhe para trás", "§4§k||||§r §7Herobrine §4§k||||"]);
    const inv = alvo.getComponent("minecraft:inventory")?.container;
    if (!inv) return false;
    if (inv.emptySlotsCount === 0) return false;
    inv.addItem(item);
    tocarNela(alvo, "random.pop", 1, 0.5);
    agendar(alvo, 20, () => crua(alvo, "§8§o...o que é isso no seu inventário?"));
    return true;
  } catch (e) {
    registrarErro("Pegadinha: carta", e);
    return false;
  }
}

/** "Conexão perdida" de mentira: a tela escurece e volta. @param {Player} alvo */
function desconexao(alvo) {
  fade(alvo, [0, 0, 0], 0.1, 3.2, 0.5);
  mostrarTitulo(alvo, "§c§lConexão perdida", { subtitulo: "§7Internal Exception: java.io.IOException: Connection reset", entrada: 2, fica: 60, saida: 5 });
  agendar(alvo, 90, () => alvo.onScreenDisplay.setActionBar("§8§o...reconectado"));
}

/** Reinício falso do servidor que dá errado de um jeito estranho. @param {Player} alvo */
function reinicio(alvo) {
  agendar(alvo, 0, () => crua(alvo, "§e[Servidor] §cO servidor vai reiniciar em 10 segundos."));
  agendar(alvo, 80, () => crua(alvo, "§e[Servidor] §cReiniciando..."));
  agendar(alvo, 140, () => {
    crua(alvo, "§4§kXXXXXXXX§r §cfalha de segmentação (núcleo despejado)");
    tremer(alvo, 0.3);
    tocarNela(alvo, "random.explode", 0.6, 0.5);
  });
  agendar(alvo, 190, () => fade(alvo, [0, 0, 0], 0.2, 1.8, 0.6));
  agendar(alvo, 260, () => crua(alvo, "§8§o...você ainda está aí?"));
}

// ------------------------------------------------------------------------------------ combos novos
/** Casa assombrada: coisas mexendo, luzes apagando, sussurros, placas e o duplo. @param {Player} alvo */
function casaAssombrada(alvo) {
  agendar(alvo, 0, () => poltergeist(alvo));
  agendar(alvo, 100, () => caixaMusica(alvo));
  agendar(alvo, 260, () => placaAssombrada(alvo));
  agendar(alvo, 340, () => blecaute(alvo));
  agendar(alvo, 520, () => sussurros(alvo));
  agendar(alvo, 640, () => pregos(alvo));
  agendar(alvo, 760, () => silhueta(alvo) || duplo(alvo));
  agendar(alvo, 1000, () => pegadas(alvo));
  agendar(alvo, 1180, () => aparecer(alvo, "atras", "herobrine"));
}

/**
 * Visita solitária: espera a pessoa ficar sozinha sob um teto (uma construção) e só então manda a visita. Dura até 12
 * minutos; se ela nunca ficar sozinha, não acontece nada.
 * @param {Player} alvo
 */
function visitaSolitaria(alvo) {
  const fim = system.currentTick + 12 * 1200;
  const checar = () => {
    if (system.currentTick >= fim) return;
    const l = alvo.location;
    const sozinha = world.getAllPlayers().every((p) => p.id === alvo.id || p.dimension.id !== alvo.dimension.id || Math.hypot(p.location.x - l.x, p.location.z - l.z) > 40);
    let coberta = false;
    try {
      const topo = alvo.dimension.getTopmostBlock({ x: Math.floor(l.x), z: Math.floor(l.z) });
      coberta = !!topo && topo.y > l.y + 2;
    } catch {
      coberta = false;
    }
    if (sozinha && coberta) {
      sussurros(alvo);
      agendar(alvo, 140, () => caixaMusica(alvo));
      agendar(alvo, 400, () => aparecer(alvo, "olhos", "olhos"));
      agendar(alvo, 700, () => pegadas(alvo));
      agendar(alvo, 900, () => aparecer(alvo, "atras", "herobrine"));
      return;
    }
    agendar(alvo, 100, checar);
  };
  agendar(alvo, 100, checar);
}

// ------------------------------------------------------------------------------------ telas e chat falsos
/** @param {Player} alvo @param {string} quem @param {string} texto */
const falaFalsa = (alvo, quem, texto) => crua(alvo, textos.FALA(quem, texto));

/** @param {Player} alvo */
function ban(alvo) {
  mostrarTitulo(alvo, textos.BAN_TITULO, { subtitulo: textos.BAN_SUB, entrada: 0, fica: 90, saida: 10 });
  tocarNela(alvo, "random.anvil_land", 1, 0.7);
  agendar(alvo, 110, () => mostrarTitulo(alvo, textos.BAN_FIM_TITULO, { subtitulo: textos.BAN_FIM_SUB, entrada: 5, fica: 40, saida: 10 }));
}

/** @param {Player} alvo */
function fechando(alvo) {
  for (let n = 5; n >= 1; n--) {
    const k = n;
    agendar(alvo, (5 - n) * 20, () => {
      alvo.onScreenDisplay.setActionBar(textos.FECHANDO(k));
      tocarNela(alvo, "note.bass", 0.8, 0.8 + (5 - k) * 0.05);
    });
  }
  agendar(alvo, 100, () => alvo.onScreenDisplay.setActionBar(textos.FECHANDO_FIM));
}

/** @param {Player} alvo */
function inventario(alvo) {
  crua(alvo, textos.INVENTARIO);
  tocarNela(alvo, "random.break", 1, 0.8);
  agendar(alvo, 120, () => msg(alvo, textos.INVENTARIO_FIM));
}

// ------------------------------------------------------------------------------------ corpo
/** @param {Player} alvo */
function lancar(alvo) {
  efeito(alvo, "levitation", 22, 18);
  agendar(alvo, 22, () => efeito(alvo, "slow_falling", 400, 0));
  tocarNela(alvo, "random.pop", 1, 0.6);
}

/** @param {Player} alvo */
function congelar(alvo) {
  efeito(alvo, "slowness", 100, 254);
  efeito(alvo, "mining_fatigue", 100, 4);
  tocarNela(alvo, "random.glass", 1, 0.6);
}

/** @param {Player} alvo */
function tontura(alvo) {
  efeito(alvo, "nausea", 200, 1);
}

/** @param {Player} alvo */
function escuridao(alvo) {
  efeito(alvo, "darkness", 160, 0);
  coracao(alvo);
}

/** @param {Player} alvo */
function piscar(alvo) {
  for (let i = 0; i < 4; i++) {
    agendar(alvo, i * inteiro(25, 40), () => {
      efeito(alvo, "blindness", 12, 0);
      tocarNela(alvo, "random.click", 0.8, 0.7);
    });
  }
}

/** @param {Player} alvo */
function raio(alvo) {
  tocarNela(alvo, "ambient.weather.lightning.impact", 2, 1);
  efeito(alvo, "blindness", 8, 0);
  agendar(alvo, 3, () => tremer(alvo, 0.3));
}

/** @param {Player} alvo */
function chuva(alvo) {
  const l = alvo.location;
  const dim = alvo.dimension;
  const bichos = [];
  for (let i = 0; i < 8; i++) {
    try {
      const b = dim.spawnEntity(i % 3 === 0 ? "minecraft:chicken" : "minecraft:sheep", { x: l.x + aleatorio(-3, 3), y: l.y + aleatorio(9, 13), z: l.z + aleatorio(-3, 3) });
      b.addTag(TAG_ANIMAL);
      bichos.push(b);
    } catch (e) {
      registrarErro("Pegadinha: chuva de bichos", e);
    }
  }
  system.runTimeout(() => {
    for (const b of bichos) {
      try {
        if (b.isValid) b.remove();
      } catch {
        // já sumiu
      }
    }
  }, 300);
}

// ------------------------------------------------------------------------------------ combos
/** Noite do Herobrine: ~45 s de tensão que juntam vários sustos. @param {Player} alvo */
function noite(alvo) {
  agendar(alvo, 0, () => crua(alvo, textos.ENTROU));
  agendar(alvo, 60, () => caverna(alvo));
  agendar(alvo, 200, () => minerar(alvo));
  agendar(alvo, 380, () => passos(alvo));
  agendar(alvo, 560, () => porta(alvo));
  agendar(alvo, 640, () => aparecer(alvo, "longe"));
  agendar(alvo, 860, () => falaFalsa(alvo, "Herobrine", textos.FALAS_HEROBRINE[inteiro(0, textos.FALAS_HEROBRINE.length - 1)]));
  agendar(alvo, 920, () => escuridao(alvo));
  agendar(alvo, 1000, () => aparecer(alvo, "atras"));
  agendar(alvo, 1180, () => crua(alvo, textos.SAIU));
}

// ------------------------------------------------------------------------------------ catálogo
/** @type {Record<string, (alvo: Player) => any>} */
const ACOES = {
  minerar,
  passos,
  tunel,
  construir,
  porta,
  bau,
  creeper,
  zumbi,
  explosao,
  flecha,
  tnt,
  coracao,
  caverna,
  longe: (a) => aparecer(a, "longe"),
  atras: (a) => aparecer(a, "atras"),
  frente: (a) => aparecer(a, "frente"),
  sombraLonge: (a) => aparecer(a, "longe", "sombra"),
  sombraAtras: (a) => aparecer(a, "atras", "sombra"),
  sombraFrente: (a) => aparecer(a, "frente", "sombra"),
  olhos: (a) => aparecer(a, "olhos", "olhos"),
  sussurros,
  sino,
  disco,
  gritoDistante,
  choroGhast,
  tremor,
  warden,
  blecaute,
  luzes: (a) => {
    apagarLuzes(a);
  },
  portasBatendo,
  nevoa: (a) => nevoa(a),
  flash,
  chamando,
  corrompido,
  contagem,
  perseguidor: (a) => perseguidor(a),
  pesadelo,
  duplo,
  silhueta,
  caixaMusica,
  pregos,
  vidroQuebrando,
  pegadas,
  sangue,
  poltergeist,
  placaAssombrada: (a) => placaAssombrada(a),
  carta,
  desconexao,
  reinicio,
  casaAssombrada,
  visitaSolitaria,
  entrou: (a) => crua(a, textos.ENTROU),
  saiu: (a) => crua(a, textos.SAIU),
  ban,
  fechando,
  inventario,
  morte: (a) => crua(a, textos.MORTE_FALSA(a.name)),
  lancar,
  congelar,
  tontura,
  escuridao,
  piscar,
  raio,
  chuva,
  noite,
};

/** Categorias do menu: título, ids das ações (as que pedem texto ficam no próprio menu). */
const CATEGORIAS = [
  { titulo: textos.CAT_SONS, ids: ["minerar", "passos", "tunel", "construir", "porta", "bau", "creeper", "zumbi", "explosao", "flecha", "tnt", "coracao", "caverna", "sussurros", "sino", "disco", "gritoDistante", "choroGhast", "tremor", "warden", "caixaMusica", "pregos", "vidroQuebrando", "pegadas", "sangue"] },
  { titulo: textos.CAT_APARICOES, ids: ["longe", "atras", "frente", "sombraLonge", "sombraAtras", "sombraFrente", "olhos", "duplo", "silhueta"] },
  { titulo: textos.CAT_AMBIENTE, ids: ["blecaute", "luzes", "portasBatendo", "poltergeist", "placaAssombrada", "nevoa", "flash"] },
  { titulo: textos.CAT_FALSOS, ids: ["entrou", "saiu", "fala", "chamando", "corrompido", "contagem", "desconexao", "reinicio", "carta", "ban", "fechando", "inventario", "morte"] },
  { titulo: textos.CAT_CORPO, ids: ["lancar", "congelar", "tontura", "escuridao", "piscar", "raio", "chuva"] },
  { titulo: textos.CAT_COMBOS, ids: ["noite", "pesadelo", "perseguidor", "casaAssombrada", "visitaSolitaria"] },
];

/** @param {Player} p */
const querPegadinha = (p) => dadosJogador(p).ajustes.pegadinhas;

/**
 * Roda uma pegadinha em quem aceita; devolve em quantos rodou.
 * @param {Player} autor
 * @param {Player[]} alvos
 * @param {string} id
 * @param {string} [extra]  texto livre (fala falsa)
 */
export function executar(autor, alvos, id, extra) {
  if (!ehDono(autor)) {
    registrarLogDono(autor.name, `pegadinha ${id}`, "", false, textos.SO_DONO);
    erro(autor, textos.SO_DONO);
    return 0;
  }
  if (!config().pegadinhasLigadas) {
    erro(autor, textos.FECHADO);
    return 0;
  }
  const quem = alvos.filter((p) => p.isValid && querPegadinha(p));
  if (quem.length === 0) {
    erro(autor, textos.SEM_ALVO);
    return 0;
  }
  let feitas = 0;
  for (const p of quem) {
    try {
      if (id === "fala") falaFalsa(p, extra?.split("\n")[0] ?? "Herobrine", extra?.split("\n")[1] ?? "");
      else if (ACOES[id]) {
        const r = ACOES[id](p);
        if (r === false) {
          erro(autor, textos.SEM_CHAO);
          continue;
        }
      } else continue;
      feitas++;
    } catch (e) {
      registrarErro(`Pegadinha ${id}`, e);
    }
  }
  registrarLogDono(autor.name, `pegadinha ${id}`, quem.length === 1 ? quem[0].name : `${quem.length} pessoas`, feitas > 0);
  if (feitas > 0) ok(autor, textos.MANDADA(quem.length === 1 ? quem[0].name : `${quem.length} pessoas`));
  return feitas;
}

// ------------------------------------------------------------------------------------ menus
/** @param {Player} player @param {() => any} [voltar] */
export async function menuPegadinhas(player, voltar) {
  if (!ehDono(player)) {
    erro(player, textos.SO_DONO);
    return;
  }
  if (!config().pegadinhasLigadas) {
    erro(player, textos.FECHADO);
    return;
  }
  const aqui = () => menuPegadinhas(player, voltar);
  const todos = online();
  const lista = new Lista(textos.TITULO).texto(textos.CORPO_ALVO(todos.length));
  lista.botao(textos.BOTAO_SUMIR(estaSumido(player)), ICONES.nao, async (p) => {
    const agora = alternarSumico(p);
    if (agora !== undefined) ok(p, agora ? textos.SUMIU : textos.VOLTOU);
    await aqui();
  });
  lista.botao(textos.BOTAO_TODOS(todos.length), ICONES.online, (p) => categorias(p, todos, "todo mundo", aqui));
  for (const alvo of [...todos].sort((a, b) => a.name.localeCompare(b.name))) {
    const id = alvo.id;
    lista.botao(textos.BOTAO_JOGADOR(alvo.name, alvo.id === player.id, querPegadinha(alvo)), ICONES.jogador, (p) => {
      const atual = world.getAllPlayers().find((x) => x.id === id);
      if (!atual?.isValid) return aqui();
      return categorias(p, [atual], atual.name, aqui);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {Player[]} alvos @param {string} rotulo @param {() => any} voltar */
async function categorias(player, alvos, rotulo, voltar) {
  const aqui = () => categorias(player, alvos, rotulo, voltar);
  const lista = new Lista(textos.TITULO_CATEGORIAS(rotulo)).texto(textos.CORPO_CATEGORIAS);
  for (const cat of CATEGORIAS) lista.botao(cat.titulo, ICONES.spawn, (p) => acoesDaCategoria(p, alvos, rotulo, cat, aqui));
  lista.botao(textos.BOTAO_PARAR, ICONES.nao, (p) => {
    for (const a of alvos) pararTudo(a);
    ok(p, textos.PARADO);
    return aqui();
  });
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {Player[]} alvos @param {string} rotulo @param {{ titulo: string, ids: string[] }} cat @param {() => any} voltar */
async function acoesDaCategoria(player, alvos, rotulo, cat, voltar) {
  const aqui = () => acoesDaCategoria(player, alvos, rotulo, cat, voltar);
  const lista = new Lista(cat.titulo).texto(textos.CORPO_CATEGORIAS);
  for (const id of cat.ids) {
    lista.botao(textos.NOMES[/** @type {keyof typeof textos.NOMES} */ (id)] ?? id, ICONES.spawn, async (p) => {
      if (id === "fala") {
        const r = await perguntar(p, textos.TITULO_FALA, [
          { tipo: "texto", rotulo: textos.ROTULO_QUEM, padrao: "Herobrine" },
          { tipo: "texto", rotulo: textos.ROTULO_TEXTO, padrao: textos.FALAS_HEROBRINE[0] },
        ]);
        if (r && r[1]) executar(p, alvos, "fala", `${String(r[0] || "Herobrine").slice(0, 24)}\n${String(r[1]).slice(0, 120)}`);
      } else {
        executar(p, alvos, id);
      }
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ------------------------------------------------------------------------------------ opção de quem recebe
/** Liga ou desliga as pegadinhas da própria pessoa (desligar também para tudo na hora). @param {Player} player */
export function alternarPegadinhas(player) {
  const agora = !dadosJogador(player).ajustes.pegadinhas;
  editarJogador(player, (d) => {
    d.ajustes.pegadinhas = agora;
  });
  if (!agora) pararTudo(player);
  return agora;
}

registrarComando({ nome: "pegadinhas", descricao: "Liga ou desliga as pegadinhas do dono com você (desligar para tudo na hora)" }, (p) => {
  const ligadas = alternarPegadinhas(p);
  msg(p, ligadas ? "§aPegadinhas ligadas. Cuidado com o Herobrine!" : "§aPegadinhas desligadas e paradas. Ninguém te assusta mais.");
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => pararTudo(playerId));
world.afterEvents.playerDimensionChange?.subscribe(({ player }) => {
  if (herobrines.has(player.id)) pararTudo(player);
});

world.afterEvents.playerSpawn?.subscribe(({ player }) => tirarNevoa(player));

// luzes que ficaram apagadas antes de uma queda ou /reload voltam assim que o chunk carregar
system.runTimeout(() => {
  try {
    const restos = lerMundo(CHAVE_LUZES, []);
    if (Array.isArray(restos) && restos.length) {
      luzesApagadas.set("restos", restos);
      const tentar = system.runInterval(() => {
        restaurarLuzes("restos");
        if (!luzesApagadas.has("restos")) system.clearRun(tentar);
      }, 200);
    }
    const placas = lerMundo(CHAVE_PLACAS, []);
    if (Array.isArray(placas) && placas.length) {
      placasMexidas.set("restos", placas);
      const tentar2 = system.runInterval(() => {
        restaurarPlacas("restos");
        if (!placasMexidas.has("restos")) system.clearRun(tentar2);
      }, 200);
    }
  } catch (e) {
    registrarErro("Pegadinhas: luzes pendentes", e);
  }
}, 20);

// faxina ao ligar: Herobrines e bichos que sobraram de antes de um /reload ou queda
system.runTimeout(() => {
  try {
    for (const d of DIMENSOES) {
      for (const e of world.getDimension(d).getEntities({ tags: [TAG_HEROBRINE] })) e.remove();
      for (const e of world.getDimension(d).getEntities({ tags: [TAG_ANIMAL] })) e.remove();
    }
  } catch (e) {
    registrarErro("Pegadinhas: faxina", e);
  }
}, 40);

// usados pelo mistério da Vulpus (arg.js)
export { aparecer, duplo, sussurros, fade, efeito, tocar, tocarNela, tremer, relativo, agendar };
