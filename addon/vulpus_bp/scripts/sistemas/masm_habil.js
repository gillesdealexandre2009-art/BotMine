// @ts-check
// Habilidades dos inimigos da masmorra. Todo golpe forte avisa antes (anel, linha ou círculo de partículas no chão) para dar tempo de
// desviar, e o dano é escalonado pelo andar e pela dificuldade configurada pela staff (masmDanoPct), então o andar 1 é suave.
// Cada habilidade recebe o inimigo, a pessoa-alvo e os ganchos do jogo (nascer um aliado e registrá-lo na sala).
import { EntityDamageCause, system } from "@minecraft/server";
import { config } from "../core/db.js";
import { emitir } from "../core/efeitos.js";
import { registrarErro, som } from "../core/util.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {{ x: number, y: number, z: number }} Ponto */
/** @typedef {{ t: string, cd: number, id?: string, n?: number }} Habilidade */
/** @typedef {{ nascer: (dim: Dimension, id: string, l: Ponto) => Entity | undefined }} Ganchos  nascer cria o aliado e já o põe na sala do invocador */

/** Habilidades que existem (para testes e para os dados dos inimigos). */
export const TIPOS = Object.freeze([
  "investida", "pisao", "convocar", "uivo", "salto", "onda", "nevoa", "raio", "teleporte", "escudo", "cura",
  "feixe", "salva", "puxar", "anel", "poca", "meteoro", "roubo", "sombra",
]);

/** Recargas por inimigo e habilidade. @type {Map<string, number>} */
const recargas = new Map();

const VERMELHO = { red: 1, green: 0.25, blue: 0.2 };
const ROXO = { red: 0.7, green: 0.3, blue: 1 };
const AMARELO = { red: 1, green: 0.85, blue: 0.2 };

/** Fator de dano do andar (suave no 1, cheio no 5) vezes a dificuldade da staff. @param {number} andar */
export function fatorDano(andar) {
  const pct = Math.max(0, Math.min(300, Number(config().masmDanoPct ?? 60))) / 100;
  return (0.45 + 0.14 * (Math.max(1, Math.min(5, andar)) - 1)) * pct;
}

/** @param {string} chave @param {number} cd segundos @param {number} agora */
function pronta(chave, cd, agora) {
  const t = recargas.get(chave) ?? 0;
  if (agora < t) return false;
  recargas.set(chave, agora + cd * 1000);
  return true;
}

/** @param {Dimension} dim @param {Ponto} c @param {number} raio @param {{ red: number, green: number, blue: number }} cor @param {number} [n] */
function circulo(dim, c, raio, cor, n = 18) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    emitir(dim, "minecraft:colored_flame_particle", { x: c.x + Math.cos(a) * raio, y: c.y + 0.15, z: c.z + Math.sin(a) * raio }, cor);
  }
}

/** Linha de partículas de a até b. @param {Dimension} dim @param {Ponto} a @param {Ponto} b @param {{ red: number, green: number, blue: number }} cor */
function linha(dim, a, b, cor) {
  const d = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const passos = Math.min(24, Math.ceil(d / 0.9));
  for (let i = 1; i <= passos; i++) {
    const t = i / passos;
    emitir(dim, "minecraft:colored_flame_particle", { x: a.x + (b.x - a.x) * t, y: a.y + 1 + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, cor);
  }
}

/** Distância de um ponto ao segmento a-b no plano XZ. @param {Ponto} p @param {Ponto} a @param {Ponto} b */
function distSegmento(p, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z;
  const l2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / l2));
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}

/** Depois de n ticks, roda fn sem deixar o erro escapar. @param {number} ticks @param {() => void} fn */
function depois(ticks, fn) {
  system.runTimeout(() => {
    try {
      fn();
    } catch {
      /* a entidade ou a pessoa saiu */
    }
  }, ticks);
}

/** @param {Player} p @param {Entity} e @param {number} v */
function ferir(p, e, v) {
  if (v > 0) p.applyDamage(v, { cause: EntityDamageCause.entityAttack, damagingEntity: e });
}

/** @param {Entity} e @param {Player} p @param {number} f força */
function empurrar(e, p, f) {
  const dx = p.location.x - e.location.x, dz = p.location.z - e.location.z;
  const d = Math.hypot(dx, dz) || 1;
  p.applyKnockback({ x: (dx / d) * f, z: (dz / d) * f }, 0.35);
}

/** Pessoas vivas num raio. @param {Dimension} dim @param {Ponto} c @param {number} r */
const perto = (dim, c, r) => dim.getPlayers({ location: c, maxDistance: r });

/**
 * Usa a habilidade se a recarga permitir.
 * @param {Entity} e @param {Player} alvo @param {Habilidade} h @param {number} agora @param {number} andar @param {Ganchos} g
 */
export function usarHabilidade(e, alvo, h, agora, andar, g) {
  const chave = `${e.id}:${h.t}`;
  if (!pronta(chave, h.cd, agora)) return;
  const dim = e.dimension;
  const l = { x: e.location.x, y: e.location.y, z: e.location.z };
  const dx = alvo.location.x - l.x, dz = alvo.location.z - l.z;
  const d = Math.hypot(dx, dz) || 1;
  const F = fatorDano(andar);
  const cancelar = () => recargas.set(chave, 0);
  try {
    switch (h.t) {
      case "investida":
        if (d < 4 || d > 14) return cancelar();
        circulo(dim, l, 1.2, AMARELO, 8);
        depois(8, () => {
          e.applyKnockback({ x: (dx / d) * 2, z: (dz / d) * 2 }, 0.2);
        });
        break;
      case "salto":
        if (d < 5 || d > 16) return cancelar();
        e.applyKnockback({ x: (dx / d) * 1.6, z: (dz / d) * 1.6 }, 0.85);
        break;
      case "pisao": {
        circulo(dim, l, 4, VERMELHO);
        depois(16, () => {
          const c = e.location;
          emitir(dim, "minecraft:large_explosion", { x: c.x, y: c.y + 0.3, z: c.z });
          for (const p of perto(dim, c, 4.2)) {
            if (p.location.y > c.y + 1.3) continue;
            ferir(p, e, 3.5 * F);
            empurrar(e, p, 0.6);
          }
        });
        break;
      }
      case "onda": {
        const r = h.n ?? 7;
        circulo(dim, l, r, VERMELHO, 26);
        depois(20, () => {
          const c = e.location;
          emitir(dim, "minecraft:large_explosion", { x: c.x, y: c.y + 0.2, z: c.z });
          for (const p of perto(dim, c, r)) {
            if (p.location.y > c.y + 1.2) continue;
            ferir(p, e, 4 * F);
            empurrar(e, p, 0.5);
          }
        });
        break;
      }
      case "raio": {
        const pos = { x: alvo.location.x, y: alvo.location.y, z: alvo.location.z };
        circulo(dim, pos, 2, AMARELO, 12);
        depois(24, () => {
          emitir(dim, "minecraft:large_explosion", pos);
          for (const p of perto(dim, pos, 2.2)) ferir(p, e, 4.5 * F);
        });
        break;
      }
      case "meteoro": {
        const n = h.n ?? 3;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 2 + Math.random() * 4;
          const pos = { x: alvo.location.x + Math.cos(a) * r, y: alvo.location.y, z: alvo.location.z + Math.sin(a) * r };
          depois(i * 6, () => circulo(dim, pos, 2.2, VERMELHO, 14));
          depois(30 + i * 6, () => {
            emitir(dim, "minecraft:large_explosion", pos);
            for (const p of perto(dim, pos, 2.4)) ferir(p, e, 5 * F);
          });
        }
        break;
      }
      case "feixe":
      case "salva": {
        if (d > 22) return cancelar();
        const tiros = h.t === "salva" ? 3 : 1;
        for (let i = 0; i < tiros; i++) {
          depois(i * 9, () => {
            const o = e.location;
            const a0 = Math.atan2(alvo.location.z - o.z, alvo.location.x - o.x) + (tiros > 1 ? (i - 1) * 0.22 : 0);
            const fim = { x: o.x + Math.cos(a0) * Math.min(20, d + 4), y: o.y, z: o.z + Math.sin(a0) * Math.min(20, d + 4) };
            linha(dim, o, fim, ROXO);
            depois(12, () => {
              linha(dim, e.location, fim, VERMELHO);
              for (const p of perto(dim, e.location, 24)) if (distSegmento(p.location, e.location, fim) < 1.1) ferir(p, e, 3 * F);
            });
          });
        }
        break;
      }
      case "puxar": {
        if (d < 5 || d > 16) return cancelar();
        linha(dim, l, alvo.location, ROXO);
        alvo.applyKnockback({ x: (-dx / d) * 1.5, z: (-dz / d) * 1.5 }, 0.25);
        alvo.addEffect("slowness", 40, { amplifier: 1, showParticles: false });
        som(alvo, "mob.guardian.attack_loop", { volume: 0.4 });
        break;
      }
      case "anel": {
        for (let k = 1; k <= 3; k++) {
          depois(k * 10, () => {
            const c = e.location;
            circulo(dim, c, k * 3, VERMELHO, 12 + k * 6);
            for (const p of perto(dim, c, k * 3 + 0.9)) {
              const dd = Math.hypot(p.location.x - c.x, p.location.z - c.z);
              if (dd >= k * 3 - 0.9 && p.location.y <= c.y + 1.1) {
                ferir(p, e, 2.5 * F);
                empurrar(e, p, 0.35);
              }
            }
          });
        }
        break;
      }
      case "poca": {
        const pos = { x: alvo.location.x, y: alvo.location.y, z: alvo.location.z };
        for (let t = 0; t < 8; t++) {
          depois(t * 10, () => {
            circulo(dim, pos, 2.5, ROXO, 14);
            for (const p of perto(dim, pos, 2.5)) {
              p.addEffect("poison", 30, { amplifier: 0, showParticles: false });
              p.addEffect("slowness", 20, { amplifier: 0, showParticles: false });
            }
          });
        }
        break;
      }
      case "nevoa":
        for (const p of perto(dim, l, h.n ?? 8)) {
          p.addEffect("blindness", 30, { amplifier: 0, showParticles: false });
          p.addEffect("poison", 50, { amplifier: 0 });
        }
        circulo(dim, l, h.n ?? 8, ROXO, 24);
        break;
      case "roubo":
        if (d > 3.2) return cancelar();
        ferir(alvo, e, 2.5 * F);
        e.addEffect("regeneration", 40, { amplifier: 2, showParticles: true });
        break;
      case "sombra":
        e.addEffect("invisibility", 60, { amplifier: 0, showParticles: false });
        e.addEffect("speed", 60, { amplifier: 2, showParticles: false });
        break;
      case "teleporte":
        if (d < 6) return cancelar();
        emitir(dim, "minecraft:large_explosion", { x: l.x, y: l.y + 0.5, z: l.z });
        e.teleport({ x: alvo.location.x - (dx / d) * 2, y: alvo.location.y, z: alvo.location.z - (dz / d) * 2 });
        break;
      case "escudo":
        e.addEffect("resistance", 80, { amplifier: 3, showParticles: true });
        break;
      case "cura":
        for (const a of dim.getEntities({ families: ["vulpus_inimigo"], location: l, maxDistance: 10 })) a.addEffect("regeneration", 60, { amplifier: 2 });
        break;
      case "convocar":
        for (let i = 0; i < (h.n ?? 3); i++) {
          const ang = (i / (h.n ?? 3)) * Math.PI * 2;
          const f = g.nascer(dim, h.id ?? "cria_ninho", { x: l.x + Math.cos(ang) * 3, y: l.y, z: l.z + Math.sin(ang) * 3 });
          void f;
        }
        break;
      case "uivo":
        for (const p of perto(dim, l, 18)) {
          p.addEffect("slowness", 50, { amplifier: 0, showParticles: false });
          p.addEffect("weakness", 80, { amplifier: 0, showParticles: false });
          som(p, "mob.wolf.howl", { volume: 1, pitch: 0.7 });
        }
        circulo(dim, l, 6, AMARELO, 18);
        break;
      default:
        break;
    }
  } catch (err) {
    registrarErro(`Masmorra: habilidade ${h.t}`, err);
  }
}
