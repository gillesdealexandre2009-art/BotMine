// @ts-check
// The Bridge (regras): dois times (azul e vermelho) em ilhas nas pontas de uma ponte sobre o vazio. Entrar no poço do time inimigo
// vale 1 ponto; a cada ponto todos voltam às gaiolas com o kit completo. Morte e queda no vazio sempre renascem na própria base.
// Vence quem chegar primeiro à meta votada. Só se quebra o que os jogadores colocaram. O motor está em mg_motor.js.
import { EquipmentSlot, system } from "@minecraft/server";
import { config } from "../core/db.js";
import { registrarErro } from "../core/util.js";
import * as tb from "../textos/mg_bridge.js";
import { ARENA, gaiola } from "./mg_arena.js";
import { contar, criar, dar } from "./mg_itens.js";
import { LIMITE_X, LIMITE_Z, MAPAS_BRIDGE, construirBridge } from "./mg_mapas_bridge.js";
import { PincelMundo } from "./obras_pincel.js";

const chave = (/** @type {{ x: number, y: number, z: number }} */ l) => `${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;
/** @param {number} s */
const tempoTexto = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Segundos que a flecha leva para voltar quando acaba. */
const SEG_FLECHA = 4;
/** Ticks de gaiola fechada a cada ponto (~3 s). */
const TICKS_GAIOLA = 70;
/** Os cantos da gaiola onde cada pessoa do time nasce (até 4 por time). */
const DESLOCAMENTOS = [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]];
const PECAS = /** @type {[string, EquipmentSlot][]} */ ([
  ["minecraft:leather_helmet", EquipmentSlot.Head], ["minecraft:leather_chestplate", EquipmentSlot.Chest],
  ["minecraft:leather_leggings", EquipmentSlot.Legs], ["minecraft:leather_boots", EquipmentSlot.Feet],
]);

/** Kits escolhidos no hub. */
export const KITS = Object.entries(tb.BR_KITS).map(([id, k]) => ({ id, nome: k.nome, desc: k.desc }));

/** Opções votáveis. @type {import("./mg_motor.js").Categoria[]} */
export const OPCOES = [
  {
    id: "meta", titulo: tb.BR_META_TITULO, padrao: "5", desc: tb.BR_META_DESC,
    opcoes: Object.entries(tb.BR_META_OPCOES).map(([id, o]) => ({ id, nome: o.nome, desc: o.desc })),
  },
];

/** @param {any} P @param {string} id */
const kitDe = (P, id) => KITS.find((k) => k.id === P.kits?.get(id)) ?? KITS[0];

/** Está dentro do poço (as 3x3 colunas do buraco, do chão para baixo)? @param {{ poco: { x: number, y: number, z: number } }} t @param {{ x: number, y: number, z: number }} l */
export function noPoco(t, l) {
  const x = Math.floor(l.x), z = Math.floor(l.z);
  return x >= t.poco.x - 1 && x <= t.poco.x + 1 && z >= t.poco.z - 1 && z <= t.poco.z + 1 && l.y < t.poco.y + 0.9 && l.y > t.poco.y - 8;
}

/** Onde a pessoa nasce: o ponto da base do time, num canto da gaiola. @param {any} P @param {import("./mg_motor.js").Jogador} j */
function pontoDe(P, j) {
  const s = P.dados.equipes[j.equipe].spawn;
  const d = DESLOCAMENTOS[Math.max(0, j.spawn) % DESLOCAMENTOS.length];
  return { x: s.x + d[0], y: s.y, z: s.z + d[1] };
}

/** Gaiola de vidro nas duas bases (fechar = true) ou a retira. @type {NonNullable<import("./mg_motor.js").JogoDef["gaiolas"]>} */
function gaiolas(P, dim, fechar) {
  const pincel = new PincelMundo(dim);
  for (const e of P.dados.equipes) gaiola(pincel, e.spawn, fechar);
}

/** Armadura de couro tingida na cor do time. @param {import("@minecraft/server").Player} p @param {any} time */
function vestir(p, time) {
  const eq = p.getComponent("minecraft:equippable");
  for (const [id, slot] of PECAS) {
    const it = criar(id);
    try {
      const tinta = /** @type {any} */ (it.getComponent("minecraft:dyeable"));
      if (tinta) tinta.color = { ...time.rgb };
    } catch {
      // sem tinta: fica o couro normal
    }
    eq?.setEquipment(slot, it);
  }
}

/** Esvazia o inventário e a armadura da pessoa. @param {import("@minecraft/server").Player} p */
function esvaziar(p) {
  p.getComponent("minecraft:inventory")?.container?.clearAll();
  const eq = p.getComponent("minecraft:equippable");
  for (const s of [...PECAS.map((x) => x[1]), EquipmentSlot.Offhand]) eq?.setEquipment(s, undefined);
}

/** Kit completo de quem nasce, renasce ou volta à gaiola. @param {any} P @param {import("./mg_motor.js").Jogador} j @param {import("@minecraft/server").Player} p */
function darKit(P, j, p) {
  const time = P.dados.equipes[j.equipe];
  const kit = kitDe(P, j.id).id;
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (!inv) return;
  const espada = kit === "guerreiro" ? criar("minecraft:iron_sword", 1, { ench: [["sharpness", 1]] }) : kit === "corredor" || kit === "ninja" ? criar("minecraft:stone_sword") : criar("minecraft:iron_sword");
  const itens = [
    espada,
    criar("minecraft:bow"),
    criar("minecraft:iron_pickaxe", 1, { ench: [["efficiency", kit === "minerador" ? 3 : 1]] }),
    criar(time.terracota, kit === "minerador" ? 96 : 64),
    criar("minecraft:golden_apple", 2),
  ];
  if (kit === "ninja") itens.push(criar("minecraft:stick", 1, { nome: tb.BR_ITEM_BASTAO, ench: [["knockback", 2]] }), criar("minecraft:ender_pearl"));
  itens.push(criar("minecraft:arrow"));
  itens.forEach((it, i) => inv.setItem(i, it));
  vestir(p, time);
}

/** Placar em texto. @param {any} P */
const placar = (P) => tb.BR_PLACAR(P.extra.pontos[0], P.extra.pontos[1]);

/** Todos voltam às gaiolas, com kit novo, e a partida segue depois de ~3 s. @param {any} P @param {import("./mg_motor.js").Api} api */
function novaRodada(P, api) {
  const x = P.extra;
  const dim = api.dim();
  x.rodada += 1;
  const r = x.rodada;
  x.livreEm = system.currentTick + TICKS_GAIOLA;
  x.flecha.clear();
  for (const j of api.vivos()) {
    const p = api.porId(j.id);
    if (!p) continue;
    api.msg(p, tb.BR_VOLTANDO);
    if (j.renasce) continue; // quem está esperando renascer volta sozinho (com kit) para a mesma base
    try {
      const s = pontoDe(P, j);
      p.teleport(s, { dimension: dim ?? p.dimension, rotation: { x: 0, y: 0 } });
      esvaziar(p);
      darKit(P, j, p);
      p.getComponent("minecraft:health")?.resetToMaxValue();
      p.extinguishFire();
    } catch (e) {
      registrarErro("Bridge: nova rodada", e);
    }
  }
  if (!dim) return;
  gaiolas(P, dim, true);
  system.runTimeout(() => {
    try {
      if (P.estado === "jogando" && P.extra === x && x.rodada === r) gaiolas(P, dim, false);
    } catch (e) {
      registrarErro("Bridge: abrir gaiolas", e);
    }
  }, TICKS_GAIOLA);
}

/** Um ponto para o time de quem entrou no poço inimigo. @param {any} P @param {import("./mg_motor.js").Jogador} j @param {import("./mg_motor.js").Api} api */
function marcar(P, j, api) {
  const x = P.extra;
  const t = P.dados.equipes[j.equipe];
  x.pontos[j.equipe] += 1;
  j.d.pontos = (j.d.pontos ?? 0) + 1;
  const final = x.pontos[j.equipe] >= x.meta;
  for (const o of P.jog.values()) {
    const p = api.porId(o.id);
    if (!p) continue;
    api.titulo(p, tb.BR_TITULO_PONTO(t.cor, t.nome), tb.BR_SUB_PONTO(j.nome, placar(P)));
    api.msg(p, tb.BR_AVISO_PONTO(j.nome, t.cor, t.nome, placar(P)));
    api.som(p, o.equipe === j.equipe ? "random.levelup" : "mob.wither.hurt", { volume: 0.8, pitch: o.equipe === j.equipe ? 1.3 : 0.9 });
  }
  if (final) {
    // o motor só confere a vitória depois de uma morte/eliminação: este "matar" fecha a partida
    x.fim = true;
    api.matar(j.id, "meta");
    return;
  }
  novaRodada(P, api);
}

/** @type {import("./mg_motor.js").JogoDef} */
export const BRIDGE = {
  id: "bridge",
  nome: "The Bridge",
  descricao: tb.BR_DESC,
  equipes: true,
  mapas: MAPAS_BRIDGE,
  opcoes: OPCOES,
  kits: KITS.map(({ id, nome, desc }) => ({ id, nome, desc })),
  construir: (p, mapaId, rng) => construirBridge(p, mapaId, rng),
  vagas: () => 8,

  atribuir(P) {
    const lista = [...P.jog.values()];
    lista.forEach((j, i) => {
      j.equipe = i % 2;
      j.spawn = Math.floor(i / 2);
    });
    P.extra = {
      times: P.dados.equipes.map((/** @type {any} */ e, /** @type {number} */ i) => ({ ...e, membros: lista.filter((j) => j.equipe === i).map((j) => j.id) })),
      pontos: [0, 0],
      meta: Number(P.config?.meta) || 5,
      marc: new Set(),
      flecha: new Map(),
      rodada: 0,
      livreEm: 0,
      fim: false,
    };
  },
  posInicial: (P, j) => pontoDe(P, j),
  gaiolas,

  aoIniciar(P, api) {
    P.extra.livreEm = 0;
    for (const j of P.jog.values()) {
      const p = api.porId(j.id);
      if (!p) continue;
      const t = P.dados.equipes[j.equipe];
      darKit(P, j, p);
      api.titulo(p, tb.BR_TITULO_TIME(t.cor, t.nome), tb.BR_SUB_TIME(P.extra.meta));
      api.msg(p, tb.BR_VOCE_TIME(t.cor, t.nome));
      api.msg(p, tb.BR_KIT(kitDe(P, j.id).nome));
    }
  },

  aoPasso(P, seg, ciclo, api) {
    const x = P.extra;
    if (!x || x.fim) return;
    const travado = system.currentTick < x.livreEm;
    for (const j of api.vivos()) {
      if (j.renasce) continue;
      const p = api.porId(j.id);
      if (!p) continue;
      try {
        if (kitDe(P, j.id).id === "corredor") p.addEffect("speed", 60, { amplifier: 0, showParticles: false });
        // a flecha volta sozinha, uma de cada vez, quando acaba
        if (contar(p, "minecraft:arrow") > 0 || contar(p, "minecraft:bow") === 0) x.flecha.delete(j.id);
        else if (!x.flecha.has(j.id)) x.flecha.set(j.id, seg);
        else if (seg - x.flecha.get(j.id) >= SEG_FLECHA) {
          x.flecha.delete(j.id);
          dar(p, criar("minecraft:arrow"));
        }
        if (travado) continue;
        const l = p.location;
        if (noPoco(P.dados.equipes[j.equipe], l)) {
          // o próprio poço não pontua e não tem saída: volta para a base
          p.teleport(pontoDe(P, j), { rotation: { x: 0, y: 0 } });
          api.msg(p, tb.BR_POCO_PROPRIO);
          continue;
        }
        const inimigo = P.dados.equipes[1 - j.equipe];
        if (inimigo && noPoco(inimigo, l)) return marcar(P, j, api);
      } catch (e) {
        registrarErro("Bridge: passo", e);
      }
    }
    void ciclo;
  },

  hud(P, j, seg) {
    const t = P.dados.equipes[j.equipe];
    const [a, b] = P.dados.equipes;
    const pts = (/** @type {number} */ i) => P.extra.pontos?.[i] ?? 0;
    return [
      "§b§lTHE BRIDGE",
      `${a.cor}${a.nome} §f${pts(0)} §8x §f${pts(1)} ${b.cor}${b.nome}`,
      `§7Meta §f${P.extra.meta} §7pontos`,
      `§7Você é ${t.cor}${t.nome}`,
      `§7Seus pontos §f${j.d.pontos ?? 0}`,
      `§7Abates §c${j.kills}`,
      `§7Tempo §f${tempoTexto(seg)}`,
    ];
  },

  barra(P, j, seg) {
    const t = P.dados.equipes[j.equipe];
    return tb.BR_BARRA(`${t.cor}${t.nome}`, placar(P), P.extra.meta, j.kills, tempoTexto(seg));
  },

  /** Morte e queda no vazio sempre renascem na própria base, com tudo de novo. */
  mortal(P, j, quemId, motivo, api) {
    const p = api.porId(j.id);
    if (p && motivo !== "meta") esvaziar(p);
    void quemId;
    return "renascer";
  },
  aoRenascer(P, j, api) {
    const p = api.porId(j.id);
    if (!p) return;
    esvaziar(p);
    darKit(P, j, p);
  },
  posRenascer: (P, j) => pontoDe(P, j),
  segundosRenascer: () => config().mgBridgeRespawnSeg,

  vencedor(P) {
    const x = P.extra;
    if (!x) return undefined;
    for (let i = 0; i < 2; i++) if (x.pontos[i] >= x.meta) return { ids: x.times[i].membros, nome: `${x.times[i].cor}Time ${x.times[i].nome}` };
    const vivos = (/** @type {number} */ i) => [...P.jog.values()].filter((j) => j.equipe === i && j.vivo).length;
    for (let i = 0; i < 2; i++) {
      if (!x.times[i].membros.length || vivos(i) > 0) continue;
      const o = 1 - i;
      if (!x.times[o].membros.length || !vivos(o)) return null;
      return { ids: x.times[o].membros, nome: `${x.times[o].cor}Time ${x.times[o].nome}` };
    }
    return undefined;
  },
  desempate(P) {
    const [a, b] = P.extra.pontos;
    if (a === b) return null;
    const t = P.extra.times[a > b ? 0 : 1];
    return { ids: t.membros, nome: `${t.cor}Time ${t.nome}` };
  },
  amigos: (P, a, b) => a.equipe === b.equipe,

  /** Só na área da ponte e das bases, e nunca nos poços nem nas gaiolas. */
  podeColocar(P, j, loc) {
    if (Math.abs(loc.x - ARENA.x) > LIMITE_X || Math.abs(loc.z - ARENA.z) > LIMITE_Z || loc.y < ARENA.y - 3 || loc.y > ARENA.y + 10) return false;
    const x = Math.floor(loc.x), z = Math.floor(loc.z), y = Math.floor(loc.y);
    for (const e of P.dados.equipes) {
      if (x >= e.poco.x - 1 && x <= e.poco.x + 1 && z >= e.poco.z - 1 && z <= e.poco.z + 1) return false;
      const sx = Math.floor(e.spawn.x), sz = Math.floor(e.spawn.z);
      if (Math.abs(x - sx) <= 2 && Math.abs(z - sz) <= 2 && y <= e.spawn.y + 2) return false;
    }
    return true;
  },
  aoColocou(P, j, bloco) {
    P.extra.marc.add(chave(bloco));
  },
  podeQuebrar(P, j, bloco, api) {
    if (P.extra.marc.has(chave(bloco))) return true;
    const p = api.porId(j.id);
    if (p) api.msg(p, tb.BR_SO_SEUS_BLOCOS);
    return false;
  },
  aoQuebrou(P, j, bloco) {
    P.extra.marc.delete(chave(bloco));
  },
  explosao(P, blocos) {
    return blocos.filter((b) => P.extra.marc.has(chave(b.location ?? b)));
  },

  premioExtra: (j) => Math.min(3, j.d.pontos ?? 0),
  resumo(P) {
    const l = [...P.jog.values()].filter((j) => (j.d.pontos ?? 0) > 0).sort((a, b) => b.d.pontos - a.d.pontos);
    return [tb.BR_RESUMO_PLACAR(placar(P)), ...l.slice(0, 3).map((j) => tb.BR_RESUMO_PONTOS(j.nome, j.d.pontos))];
  },
};
