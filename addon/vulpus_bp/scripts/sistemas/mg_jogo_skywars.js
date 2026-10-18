// @ts-check
// Skywars (regras): cada pessoa nasce numa ilha, numa gaiola; os baús escondidos têm 3 níveis; a borda fecha com o tempo e o
// vazio elimina. Último de pé vence. O motor (fila, votação, contagem, eliminação, prêmios) está em mg_motor.js.
import { EntityDamageCause, GameMode, system } from "@minecraft/server";
import { config } from "../core/db.js";
import { registrarErro } from "../core/util.js";
import * as textos from "../textos/mg.js";
import * as tj from "../textos/mg_jogos.js";
import { ARENA, gaiola } from "./mg_arena.js";
import { criar, criarSorteado, especial, frasco, sortearBau } from "./mg_itens.js";
import { usarEspecial } from "./mg_especiais.js";
import { MAPAS_SKYWARS, construirSkywars } from "./mg_mapas_skywars.js";
import { PincelMundo } from "./obras_pincel.js";

/** Kit de partida: o suficiente para fazer a primeira ponte. */
export const KIT = Object.freeze([["minecraft:stone_sword", 1], ["minecraft:stone_pickaxe", 1], ["minecraft:oak_planks", 32], ["minecraft:cooked_beef", 8]]);

/**
 * @typedef {[string, number] | [string, number, { nome?: string, ench?: [string, number][] }]} ItemKit
 *   "@frasco:<chave>" e "@especial:<chave>" no lugar do id criam frascos e itens especiais
 */
/** Todo mundo começa com isto, além do kit. */
const BASE = /** @type {ItemKit[]} */ ([["minecraft:stone_pickaxe", 1], ["minecraft:cooked_beef", 6], ["minecraft:oak_planks", 16]]);

/** Kits escolhidos no hub (a CubeCraft vende os dela por pontos; aqui são todos livres). @type {{ id: string, nome: string, desc: string, itens: ItemKit[] }[]} */
export const KITS = [
  { id: "padrao", nome: "Padrão", desc: "Espada de pedra e mais tábuas.", itens: [["minecraft:stone_sword", 1], ["minecraft:oak_planks", 16]] },
  { id: "construtor", nome: "Construtor", desc: "64 pedras lisas e uma pá.", itens: [["minecraft:cobblestone", 64], ["minecraft:stone_shovel", 1]] },
  { id: "pescador", nome: "Pescador", desc: "Vara de pesca encantada e peixe assado.", itens: [["minecraft:fishing_rod", 1, { ench: [["lure", 2]] }], ["minecraft:cooked_salmon", 8]] },
  { id: "lenhador", nome: "Lenhador", desc: "Machado de pedra e 24 toras.", itens: [["minecraft:stone_axe", 1], ["minecraft:oak_log", 24]] },
  { id: "batedor", nome: "Batedor", desc: "Frascos de velocidade e de pulo.", itens: [["@frasco:velocidade", 2], ["@frasco:pulo", 1], ["minecraft:wooden_sword", 1]] },
  { id: "arqueiro", nome: "Arqueiro", desc: "Arco e 24 flechas.", itens: [["minecraft:bow", 1], ["minecraft:arrow", 24]] },
  { id: "curandeiro", nome: "Curandeiro", desc: "Frascos de cura e de regeneração.", itens: [["@frasco:cura", 2], ["@frasco:regeneracao", 1], ["minecraft:wooden_sword", 1]] },
  { id: "golem", nome: "Golem de Ferro", desc: "Peitoral e botas de ferro.", itens: [["minecraft:iron_chestplate", 1], ["minecraft:iron_boots", 1]] },
  { id: "espadachim", nome: "Espadachim", desc: "Espada de pedra afiada.", itens: [["minecraft:stone_sword", 1, { ench: [["sharpness", 1]] }]] },
  { id: "bombardeiro", nome: "Bombardeiro", desc: "8 TNT e um isqueiro.", itens: [["minecraft:tnt", 8], ["minecraft:flint_and_steel", 1]] },
  { id: "aranha", nome: "Homem-Aranha", desc: "Teias e duas Penas de Salto.", itens: [["minecraft:web", 12], ["@especial:salto", 2]] },
  { id: "enderman", nome: "Enderman", desc: "Ganha uma pérola do Ender a cada 3 minutos.", itens: [["minecraft:stone_sword", 1]] },
  { id: "rastreador", nome: "Caçador", desc: "Um Rastreador que aponta o inimigo mais perto.", itens: [["@especial:rastreador", 1], ["minecraft:wooden_sword", 1]] },
];

/** Opções votáveis. @type {import("./mg_motor.js").Categoria[]} */
export const OPCOES = [
  {
    id: "bau", titulo: "Tipo de baú", padrao: "normal", desc: "Quão bom é o conteúdo dos baús.",
    opcoes: [
      { id: "basico", nome: "Básico", desc: "Equipamento fraco, bom para partidas longas e de pontaria." },
      { id: "normal", nome: "Normal", desc: "O equilíbrio de sempre." },
      { id: "op", nome: "Overpowered", desc: "Mais itens, equipamento forte, maçãs e pérolas." },
    ],
  },
  {
    id: "itens", titulo: "Itens", padrao: "normal", desc: "Os itens especiais (Pena de Salto, Cajado da Ponte, Rastreador, Bola de Fogo) entram na tabela?",
    opcoes: [
      { id: "normal", nome: "Normais", desc: "Só os itens comuns." },
      { id: "avancado", nome: "Avançados", desc: "Soma os itens especiais à tabela normal." },
    ],
  },
];

/** Cria o item de um kit. @param {ItemKit} k */
function itemDoKit(k) {
  const [id, n] = k;
  const op = k[2];
  if (id.startsWith("@frasco:")) return (() => { const f = frasco(id.slice(8)); f.amount = n; return f; })();
  if (id.startsWith("@especial:")) return especial(id.slice(10), n);
  return criar(id, n, op);
}

/** @param {any} P @param {string} id */
const kitDe = (P, id) => KITS.find((k) => k.id === P.kits?.get(id)) ?? KITS[0];

/** Enche (ou reabastece) os baús do mapa. O lendário do centro só é enchido uma vez. @param {any} P @param {any} api @param {"suprimento" | "equipamento" | "geral"} [fase] @param {boolean} [primeira] */
function encher(P, api, fase, primeira = true) {
  const dim = api.dim();
  if (!dim) return;
  const tipo = P.config?.bau ?? "normal";
  const avancado = P.config?.itens === "avancado";
  for (const b of P.dados.baus) {
    if (b.t === 4 && !primeira) continue;
    try {
      const cont = dim.getBlock(b)?.getComponent("minecraft:inventory")?.container;
      if (!cont) continue;
      cont.clearAll();
      const slots = Array.from({ length: cont.size }, (_, i) => i).sort(() => Math.random() - 0.5);
      sortearBau(/** @type {1 | 2 | 3 | 4} */ (b.t), Math.random, { tipo, avancado, fase: primeira ? undefined : fase }).forEach((it, k) => cont.setItem(slots[k], criarSorteado(it)));
    } catch (e) {
      registrarErro("Skywars: encher baú", e);
    }
  }
}

/** Reabastecimento em fases (suprimentos, equipamento, geral) e a pérola do Enderman. @param {any} P @param {number} seg @param {any} api */
function eventos(P, seg, api) {
  const cada = config().mgRefillSeg;
  const t = Math.floor(seg);
  const todos = () => [...P.jog.values()].map((/** @type {any} */ j) => api.porId(j.id)).filter(Boolean);
  if (cada > 0 && t > 0) {
    if (cada - (t % cada) === 10) for (const p of todos()) api.msg(p, tj.SW_REFILL_AVISO);
    if (t % cada === 0) {
      const n = t / cada;
      const fase = n === 1 ? "suprimento" : n === 2 ? "equipamento" : "geral";
      encher(P, api, fase, false);
      for (const p of todos()) {
        api.msg(p, tj.SW_REFILL(tj.SW_FASES[fase]));
        api.som(p, "random.levelup", { volume: 0.6, pitch: 0.8 });
      }
    }
  }
  if (t > 0 && t % 180 === 0) {
    for (const j of P.jog.values()) {
      if (!j.vivo || kitDe(P, j.id).id !== "enderman") continue;
      const p = api.porId(j.id);
      if (!p) continue;
      p.getComponent("minecraft:inventory")?.container?.addItem(criar("minecraft:ender_pearl", 1));
      api.msg(p, tj.SW_PEROLA);
    }
  }
}

/** Raio atual da borda. @param {number} segundos desde o começo */
export function raioBorda(segundos) {
  const cfg = config();
  const t = (segundos - cfg.mgBordaInicioSeg) / Math.max(1, cfg.mgBordaDuracaoSeg);
  const u = Math.max(0, Math.min(1, t));
  return ARENA.raio + (14 - ARENA.raio) * u;
}

/** @param {number} s */
const tempoTexto = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** @param {number} x @param {number} y @param {number} z */
const dentroDaArena = (x, y, z) => Math.abs(x - ARENA.x) <= ARENA.raio && Math.abs(z - ARENA.z) <= ARENA.raio && y >= ARENA.yMin && y <= ARENA.yMax;

let avisouBorda = false;

/** Um brilho discreto sobre cada baú ainda fechado, só para quem passa por perto: os baús são escondidos, mas dá para achar. @param {any} P @param {any} api */
function cintilar(P, api) {
  const dim = api.dim();
  if (!dim) return;
  const perto = api.vivos().map((j) => api.porId(j.id)).filter(Boolean).map((p) => p.location);
  if (!perto.length) return;
  for (const b of P.dados.baus) {
    if (!perto.some((l) => Math.abs(l.x - b.x) < 12 && Math.abs(l.z - b.z) < 12 && Math.abs(l.y - b.y) < 14)) continue;
    try {
      if (dim.getBlock(b)?.typeId !== "minecraft:chest") continue;
      dim.spawnParticle("minecraft:endrod", { x: b.x + 0.5, y: (b.topo ?? b.y + 2) + 0.4, z: b.z + 0.5 });
    } catch {
      // chunk descarregado: sem brilho agora
    }
  }
}

/** @type {import("./mg_motor.js").JogoDef} */
export const SKYWARS = {
  id: "skywars",
  nome: "Skywars",
  descricao: tj.SW_DESC,
  equipes: false,
  mapas: MAPAS_SKYWARS,
  opcoes: OPCOES,
  kits: KITS.map(({ id, nome, desc }) => ({ id, nome, desc })),
  construir: (p, mapaId, rng) => construirSkywars(p, mapaId, rng),
  vagas: (dados) => dados.spawns.length,

  atribuir(P) {
    let i = 0;
    for (const j of P.jog.values()) {
      j.spawn = i++;
      j.equipe = -1;
    }
    avisouBorda = false;
  },
  posInicial: (P, j) => P.dados.spawns[j.spawn],
  gaiolas(P, dim, fechar) {
    const pincel = new PincelMundo(dim);
    for (const s of P.dados.spawns) gaiola(pincel, s, fechar);
  },

  aoIniciar(P, api) {
    encher(P, api, undefined, true);
    for (const j of P.jog.values()) {
      const p = api.porId(j.id);
      if (!p) continue;
      const inv = p.getComponent("minecraft:inventory")?.container;
      const kit = kitDe(P, j.id);
      for (const k of [...BASE, ...kit.itens]) inv?.addItem(itemDoKit(k));
      api.msg(p, tj.SW_KIT(kit.nome));
      api.msg(p, textos.ABRE_BAUS);
    }
  },

  aoPasso(P, seg, ciclo, api) {
    const cfg = config();
    if (seg >= cfg.mgBordaInicioSeg && !avisouBorda) {
      avisouBorda = true;
      for (const j of P.jog.values()) {
        const p = api.porId(j.id);
        if (p) {
          api.msg(p, textos.BORDA_COMECA);
          api.som(p, "mob.wither.spawn", { volume: 0.5 });
        }
      }
    }
    cintilar(P, api);
    eventos(P, seg, api);
    const raio = raioBorda(seg);
    for (const j of api.vivos()) {
      const p = api.porId(j.id);
      if (!p) continue;
      const l = p.location;
      if (Math.hypot(l.x - ARENA.x, l.z - ARENA.z) > raio && ciclo % 2 === 0) {
        try {
          p.applyDamage(cfg.mgDanoBorda, { cause: EntityDamageCause.magic });
        } catch (e) {
          registrarErro("Skywars: dano da borda", e);
        }
      }
    }
  },

  barra(P, j, seg, api) {
    const cfg = config();
    const raio = raioBorda(seg);
    return textos.BARRA_JOGO(api.vivos().length, j.kills, tempoTexto(seg), seg >= cfg.mgBordaInicioSeg ? textos.BORDA_BARRA(Math.round(raio)) : "");
  },

  aoUsarItem(P, j, item, player, api) {
    return usarEspecial(player, item, {
      inimigos: () => api.vivos().filter((o) => o.id !== j.id).map((o) => ({ id: o.id, nome: o.nome, ...(api.porId(o.id)?.location ?? { x: 0, y: 0, z: 0 }) })),
      msg: api.msg,
    });
  },

  hud(P, j, seg, api) {
    const cfg = config();
    const cada = cfg.mgRefillSeg;
    const l = ["§b§lSKYWARS", ...tj.HUD_GERAL(api.vivos().length, j.kills, tempoTexto(seg))];
    if (cada > 0) l.push(`§7Baús em §e${tempoTexto(cada - (Math.floor(seg) % cada))}`);
    l.push(seg >= cfg.mgBordaInicioSeg ? `§cBorda §f${Math.round(raioBorda(seg))} §7blocos` : `§7Borda em §f${tempoTexto(cfg.mgBordaInicioSeg - seg)}`);
    return l;
  },

  mortal: () => "eliminar",
  vencedor(P, api) {
    const v = api.vivos();
    if (v.length > 1) return undefined;
    return v.length === 1 ? { ids: [v[0].id], nome: v[0].nome } : null;
  },
  desempate(P, api) {
    const v = api.vivos().sort((a, b) => b.kills - a.kills);
    return v.length && (v.length === 1 || v[0].kills > v[1].kills) ? { ids: [v[0].id], nome: v[0].nome } : null;
  },

  podeQuebrar: (P, j, bloco) => dentroDaArena(bloco.x, bloco.y, bloco.z),
  podeColocar: (P, j, loc) => dentroDaArena(loc.x, loc.y, loc.z),
  premioExtra: () => 0,
  resumo: () => [],
};

void GameMode;
void system;
