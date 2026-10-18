// @ts-check
// Itens especiais dos minigames (Skywars "avançado" e Bedwars): Pena de Salto, Cajado da Ponte, Rastreador e Bola de Fogo.
// Cada um é um item comum com uma marca na descrição; o motor chama `usarEspecial` quando a pessoa usa o item.
import { system } from "@minecraft/server";
import { registrarErro } from "../core/util.js";
import { ESPECIAIS, chaveEspecial } from "./mg_itens.js";

/** @typedef {import("@minecraft/server").Player} Player */

const CARGAS = "§8cargas:";
/** @type {Map<string, number>} */
const ultimoUso = new Map();

/** Gasta uma unidade do item na mão. @param {Player} p */
function gastar(p) {
  const inv = p.getComponent("minecraft:inventory")?.container;
  const slot = p.selectedSlotIndex;
  const it = inv?.getItem(slot);
  if (!inv || !it) return;
  if (it.amount <= 1) inv.setItem(slot, undefined);
  else {
    it.amount -= 1;
    inv.setItem(slot, it);
  }
}

/** Direção do olhar nos eixos (a ponte é sempre reta). @param {Player} p */
function eixo(p) {
  const d = p.getViewDirection();
  return Math.abs(d.x) >= Math.abs(d.z) ? { x: Math.sign(d.x) || 1, z: 0 } : { x: 0, z: Math.sign(d.z) || 1 };
}

/**
 * Usa o item especial da mão. Devolve true se o item era um especial (mesmo que esteja em espera).
 * @param {Player} p
 * @param {{ getLore?: () => string[] } | undefined} item
 * @param {{ aoBloco?: (pos: { x: number, y: number, z: number }) => void, inimigos: () => { id: string, nome: string, x: number, y: number, z: number }[], bloco?: string, msg: (p: Player, t: string) => void }} ctx
 */
export function usarEspecial(p, item, ctx) {
  const chave = chaveEspecial(item);
  if (!chave || !ESPECIAIS[chave]) return false;
  const agora = system.currentTick;
  const k = `${p.id}:${chave}`;
  if (agora - (ultimoUso.get(k) ?? -999) < ESPECIAIS[chave].espera) return true;
  ultimoUso.set(k, agora);
  try {
    if (chave === "salto") {
      const d = p.getViewDirection();
      const h = Math.hypot(d.x, d.z) || 1;
      p.applyKnockback({ x: (d.x / h) * 1.6, z: (d.z / h) * 1.6 }, 0.9);
      gastar(p);
      p.dimension.spawnParticle("minecraft:cloud", p.location);
    } else if (chave === "ponte") {
      const e = eixo(p);
      const base = { x: Math.floor(p.location.x), y: Math.floor(p.location.y) - 1, z: Math.floor(p.location.z) };
      let n = 0;
      for (let i = 1; i <= 12; i++) {
        for (const lado of [-1, 0, 1]) {
          const pos = { x: base.x + e.x * i + (e.z !== 0 ? lado : 0), y: base.y, z: base.z + e.z * i + (e.x !== 0 ? lado : 0) };
          const b = p.dimension.getBlock(pos);
          if (b && b.isAir) {
            b.setType(ctx.bloco ?? "minecraft:oak_planks");
            ctx.aoBloco?.(pos);
            n++;
          }
        }
      }
      if (n > 0) gastarCarga(p);
    } else if (chave === "rastreador") {
      const l = p.location;
      let melhor = null;
      let dmin = Infinity;
      for (const o of ctx.inimigos()) {
        const dist = Math.hypot(o.x - l.x, o.z - l.z);
        if (dist < dmin) {
          dmin = dist;
          melhor = o;
        }
      }
      if (!melhor) return true;
      const ang = (Math.atan2(-(melhor.x - l.x), melhor.z - l.z) * 180) / Math.PI;
      const rel = (((ang - p.getRotation().y) % 360) + 540) % 360 - 180;
      const setas = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
      const seta = setas[Math.round(((rel + 360) % 360) / 45) % 8];
      const alt = melhor.y - l.y;
      p.onScreenDisplay.setActionBar(`§c${melhor.nome} §f${seta} §7${Math.round(dmin)} blocos ${alt > 4 ? "§a(acima)" : alt < -4 ? "§e(abaixo)" : ""}`);
    } else if (chave === "bola_fogo") {
      const d = p.getViewDirection();
      const pos = { x: p.location.x + d.x * 1.2, y: p.location.y + 1.5 + d.y * 1.2, z: p.location.z + d.z * 1.2 };
      const bola = p.dimension.spawnEntity("minecraft:fireball", pos);
      const proj = bola.getComponent("minecraft:projectile");
      if (proj) {
        try {
          proj.owner = p;
        } catch {
          // sem dono: o fogo ainda funciona
        }
        proj.shoot({ x: d.x * 1.4, y: d.y * 1.4, z: d.z * 1.4 });
      } else bola.applyImpulse({ x: d.x * 1.2, y: d.y * 1.2, z: d.z * 1.2 });
      gastar(p);
    }
  } catch (e) {
    registrarErro(`Minigames: item especial ${chave}`, e);
  }
  return true;
}

/** A ponte tem 3 cargas, guardadas na descrição; a última gasta o item. @param {Player} p */
function gastarCarga(p) {
  const inv = p.getComponent("minecraft:inventory")?.container;
  const slot = p.selectedSlotIndex;
  const it = inv?.getItem(slot);
  if (!inv || !it) return;
  const lore = it.getLore();
  const i = lore.findIndex((x) => x.startsWith(CARGAS));
  const restam = (i >= 0 ? Number(lore[i].slice(CARGAS.length)) : 3) - 1;
  if (restam <= 0) return inv.setItem(slot, undefined);
  if (i >= 0) lore[i] = `${CARGAS}${restam}`;
  else lore.push(`${CARGAS}${restam}`);
  it.setLore(lore);
  it.nameTag = `§eCajado da Ponte §7(${restam})`;
  inv.setItem(slot, it);
}

// esquece os tempos de espera de vez em quando, para o mapa não crescer
system.runInterval(() => {
  if (ultimoUso.size > 200) ultimoUso.clear();
}, 20 * 60);
