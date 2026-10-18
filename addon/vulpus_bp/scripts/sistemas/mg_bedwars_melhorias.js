// @ts-check
// Melhorias do time do Bedwars (a "loja de upgrades" da CubeCraft): paga com diamantes, vale para o time todo e continua nas
// próximas vidas. Também as armadilhas da base. A loja de itens e as regras do jogo estão em mg_jogo_bedwars.js.
import { EnchantmentType, EquipmentSlot } from "@minecraft/server";
import { ICONES } from "../config.js";
import { Lista } from "../core/forms.js";
import { registrarErro } from "../core/util.js";
import * as tj from "../textos/mg_jogos.js";
import { MOEDAS, contar, retirar } from "./mg_itens.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ P: any, j: any, api: any }} Ctx */

const SLOTS = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
/** Distância (blocos) da base em que a cura age e a armadilha dispara. */
const RAIO_CURA = 14;
const RAIO_ARMADILHA = 11;
const MAX_ARMADILHAS = 3;

/**
 * @typedef {object} Melhoria
 * @property {string} id
 * @property {string} nome
 * @property {number[]} custos  diamantes de cada nível (o tamanho é o nível máximo)
 * @property {string[]} efeitos  o que cada nível faz
 */
/** @type {Melhoria[]} */
export const MELHORIAS = [
  { id: "afi", nome: "Afiação", custos: [8, 16], efeitos: ["Afiação I nas espadas do time", "Afiação II nas espadas do time"] },
  { id: "prot", nome: "Proteção", custos: [5, 10, 20, 30], efeitos: ["Proteção I nas armaduras", "Proteção II", "Proteção III", "Proteção IV"] },
  { id: "forja", nome: "Forja da ilha", custos: [4, 8, 12], efeitos: ["+50% de ferro e ouro", "+100% de ferro e ouro", "Gera esmeraldas na ilha"] },
  { id: "pressa", nome: "Pressa", custos: [4, 8], efeitos: ["Pressa I para o time", "Pressa II para o time"] },
  { id: "vida", nome: "Vida extra", custos: [6], efeitos: ["+2 corações para o time"] },
  { id: "cura", nome: "Cura da base", custos: [3], efeitos: ["Regeneração perto da base"] },
  { id: "rapido", nome: "Renascer rápido", custos: [15], efeitos: ["O time renasce em 2 segundos"] },
];

/** @type {{ id: string, nome: string, desc: string }[]} */
export const ARMADILHAS = [
  { id: "alarme", nome: "É um alarme!", desc: "Avisa o time e deixa o invasor brilhando por 20 s." },
  { id: "cego", nome: "Cegueira e lentidão", desc: "O invasor fica cego e lento por 8 s." },
  { id: "fadiga", nome: "Fadiga de mineração", desc: "O invasor não consegue quebrar blocos direito por 12 s." },
];

/** Estado de melhorias de um time. */
export const melhoriasVazias = () => ({ afi: 0, prot: 0, forja: 0, pressa: 0, vida: 0, cura: 0, rapido: 0 });

/** Multiplicador da velocidade do gerador da ilha pela Forja. @param {any} t */
export const fatorForja = (t) => [1, 1.5, 2, 2][t.up?.forja ?? 0];
/** Segundos para renascer. @param {any} t */
export const segundosParaRenascer = (t) => ((t?.up?.rapido ?? 0) > 0 ? 2 : 5);

/** Adiciona o encantamento se o item não tiver um igual ou melhor. @param {import("@minecraft/server").ItemStack} item @param {string} tipo @param {number} nivel */
function encantar(item, tipo, nivel) {
  try {
    const c = item.getComponent("minecraft:enchantable");
    if (!c) return false;
    const atual = c.getEnchantments().find((/** @type {any} */ e) => String(e.type.id ?? e.type).replace("minecraft:", "") === tipo)?.level ?? 0;
    if (atual >= nivel) return false;
    c.addEnchantment({ type: new EnchantmentType(tipo), level: nivel });
    return true;
  } catch {
    return false;
  }
}

/** Aplica Afiação e Proteção do time ao que a pessoa está usando. @param {Player} p @param {any} t */
export function aplicarEquipamento(p, t) {
  try {
    const up = t.up ?? melhoriasVazias();
    const eq = p.getComponent("minecraft:equippable");
    if (up.prot > 0) {
      for (const s of SLOTS) {
        const it = eq?.getEquipment(s);
        if (it && encantar(it, "protection", up.prot)) eq?.setEquipment(s, it);
      }
    }
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (inv && up.afi > 0) {
      for (let i = 0; i < inv.size; i++) {
        const it = inv.getItem(i);
        if (it && it.typeId.endsWith("_sword") && encantar(it, "sharpness", up.afi)) inv.setItem(i, it);
      }
    }
  } catch (e) {
    registrarErro("Bedwars: aplicar melhorias", e);
  }
}

/** Efeitos contínuos do time (pressa, vida extra, cura perto da base): chamado todo segundo. @param {any} P @param {any} api */
export function efeitosDoTime(P, api) {
  for (const j of P.jog.values()) {
    if (!j.vivo || j.renasce) continue;
    const t = P.extra.times[j.equipe];
    const up = t?.up;
    if (!up) continue;
    const p = api.porId(j.id);
    if (!p) continue;
    try {
      if (up.pressa > 0) p.addEffect("haste", 60, { amplifier: up.pressa - 1, showParticles: false });
      if (up.vida > 0) p.addEffect("health_boost", 60, { amplifier: 0, showParticles: false });
      if (up.cura > 0 && Math.hypot(p.location.x - t.base.x, p.location.z - t.base.z) < RAIO_CURA) p.addEffect("regeneration", 60, { amplifier: 0, showParticles: false });
    } catch (e) {
      registrarErro("Bedwars: efeitos do time", e);
    }
  }
}

/** Dispara a primeira armadilha de cada time quando um inimigo chega à base. @param {any} P @param {any} api */
export function vigiarArmadilhas(P, api) {
  for (const [idx, t] of P.extra.times.entries()) {
    if (!t.ativa || !t.armadilhas?.length) continue;
    const invasores = [];
    for (const j of P.jog.values()) {
      if (!j.vivo || j.renasce || j.equipe === idx) continue;
      const p = api.porId(j.id);
      if (p && Math.hypot(p.location.x - t.base.x, p.location.z - t.base.z) < RAIO_ARMADILHA && Math.abs(p.location.y - t.base.y) < 9) invasores.push(p);
    }
    if (!invasores.length) continue;
    const id = t.armadilhas.shift();
    for (const p of invasores) {
      try {
        if (id === "alarme") p.addEffect("glowing", 400, { amplifier: 0, showParticles: false });
        else if (id === "cego") {
          p.addEffect("blindness", 160, { amplifier: 0, showParticles: false });
          p.addEffect("slowness", 160, { amplifier: 1, showParticles: false });
        } else if (id === "fadiga") p.addEffect("mining_fatigue", 240, { amplifier: 1, showParticles: false });
        api.msg(p, tj.BW_PISOU_ARMADILHA);
      } catch (e) {
        registrarErro("Bedwars: armadilha", e);
      }
    }
    for (const m of t.membros) {
      const p = api.porId(m);
      if (!p) continue;
      api.titulo(p, tj.BW_ARMADILHA_DISPAROU, tj.BW_ARMADILHA_SUB(ARMADILHAS.find((a) => a.id === id)?.nome ?? ""));
      api.som(p, "note.pling", { volume: 1, pitch: 0.7 });
    }
  }
}

/** Avisa todos do time com uma mensagem. @param {any} P @param {any} api @param {any} t @param {string} texto */
function avisarTime(P, api, t, texto) {
  for (const m of t.membros) {
    const p = api.porId(m);
    if (p) api.msg(p, texto);
  }
}

/**
 * Compra um nível de melhoria com diamantes.
 * @param {Player} p
 * @param {Ctx} ctx
 * @param {Melhoria} m
 */
export function comprarMelhoria(p, ctx, m) {
  const { P, j, api } = ctx;
  const t = P.extra.times[j.equipe];
  const nivel = t.up[m.id];
  if (nivel >= m.custos.length) return api.msg(p, tj.BW_MELHORIA_MAXIMA);
  const custo = m.custos[nivel];
  if (contar(p, MOEDAS.diamante.id) < custo) return api.erro(p, tj.BW_SEM_MOEDA(`${custo} Diamante`));
  retirar(p, MOEDAS.diamante.id, custo);
  t.up[m.id] = nivel + 1;
  avisarTime(P, api, t, tj.BW_MELHORIA_COMPRADA(p.name, m.nome, m.efeitos[nivel]));
  for (const id of t.membros) {
    const q = api.porId(id);
    if (q) aplicarEquipamento(q, t);
  }
  api.som(p, "random.levelup", { volume: 0.7, pitch: 1.2 });
}

/**
 * Compra uma armadilha (entra na fila do time; cada uma custa mais que a anterior).
 * @param {Player} p
 * @param {Ctx} ctx
 * @param {{ id: string, nome: string }} a
 */
export function comprarArmadilha(p, ctx, a) {
  const { P, j, api } = ctx;
  const t = P.extra.times[j.equipe];
  if (t.armadilhas.length >= MAX_ARMADILHAS) return api.erro(p, tj.BW_FILA_CHEIA);
  const custo = 1 + t.armadilhas.length;
  if (contar(p, MOEDAS.diamante.id) < custo) return api.erro(p, tj.BW_SEM_MOEDA(`${custo} Diamante`));
  retirar(p, MOEDAS.diamante.id, custo);
  t.armadilhas.push(a.id);
  avisarTime(P, api, t, tj.BW_ARMADILHA_COMPRADA(p.name, a.nome, t.armadilhas.length));
  api.som(p, "random.orb", { volume: 0.7, pitch: 0.9 });
}

/**
 * Menu das melhorias do time.
 * @param {Player} player
 * @param {Ctx} ctx
 * @param {() => any} voltar
 */
export async function menuMelhorias(player, ctx, voltar) {
  const t = ctx.P.extra?.times?.[ctx.j.equipe];
  if (!t) return;
  const aqui = () => menuMelhorias(player, ctx, voltar);
  const tela = new Lista(tj.BW_MELHORIAS_TITULO).texto(tj.BW_MELHORIAS_CORPO(contar(player, MOEDAS.diamante.id)));
  for (const m of MELHORIAS) {
    const nivel = t.up[m.id];
    const cheio = nivel >= m.custos.length;
    tela.botao(`${m.nome} §8${nivel}/${m.custos.length}\n${cheio ? "§aNível máximo" : `§b${m.custos[nivel]} diamantes §7· ${m.efeitos[nivel]}`}`, ICONES.nova, async (p) => {
      comprarMelhoria(p, ctx, m);
      await aqui();
    });
  }
  await tela.voltar(voltar).abrir(player);
}

/**
 * Menu das armadilhas do time.
 * @param {Player} player
 * @param {Ctx} ctx
 * @param {() => any} voltar
 */
export async function menuArmadilhas(player, ctx, voltar) {
  const t = ctx.P.extra?.times?.[ctx.j.equipe];
  if (!t) return;
  const aqui = () => menuArmadilhas(player, ctx, voltar);
  const fila = t.armadilhas.map((/** @type {string} */ id) => ARMADILHAS.find((a) => a.id === id)?.nome ?? id).join("§7, §f") || "nenhuma";
  const custo = 1 + t.armadilhas.length;
  const tela = new Lista(tj.BW_ARMADILHAS_TITULO).texto(tj.BW_ARMADILHAS_CORPO(fila, custo, MAX_ARMADILHAS, contar(player, MOEDAS.diamante.id)));
  for (const a of ARMADILHAS) {
    tela.botao(`${a.nome}\n§b${custo} diamante${custo > 1 ? "s" : ""} §7· ${a.desc}`, ICONES.nova, async (p) => {
      comprarArmadilha(p, ctx, a);
      await aqui();
    });
  }
  await tela.voltar(voltar).abrir(player);
}
