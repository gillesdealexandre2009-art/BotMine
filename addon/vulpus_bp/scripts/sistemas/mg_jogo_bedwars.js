// @ts-check
// Bedwars (regras): times de até 2 em ilhas, cada uma com uma cama, um gerador de ferro e ouro e uma bancada de loja. Enquanto a
// cama existe, quem morre renasce; sem cama, a morte é definitiva. Diamantes e esmeralda nascem nas ilhas do meio e do centro.
// Só se quebra o que os jogadores colocaram (e as camas dos outros). O motor está em mg_motor.js.
import { EquipmentSlot, ItemStack, system } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config } from "../core/db.js";
import { Lista } from "../core/forms.js";
import * as efeitos from "../core/efeitos.js";
import { registrarErro } from "../core/util.js";
import * as tj from "../textos/mg_jogos.js";
import { ARENA } from "./mg_arena.js";
import { MARCA_HUB, MOEDAS, contar, criar, dar, especial, frasco, retirar } from "./mg_itens.js";
import { usarEspecial } from "./mg_especiais.js";
import { aplicarEquipamento, efeitosDoTime, fatorForja, melhoriasVazias, menuArmadilhas, menuMelhorias, segundosParaRenascer, vigiarArmadilhas } from "./mg_bedwars_melhorias.js";
import { MAPAS_BEDWARS, TIMES, construirBedwars } from "./mg_mapas_bedwars.js";

/** @typedef {import("./mg_mapas_bedwars.js").Ponto} Ponto */
/** Marca do item da loja na descrição. */
export const MARCA_LOJA = `${MARCA_HUB}loja`;

/** @param {number} s */
const tempoTexto = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** @param {number} x @param {number} y @param {number} z */
const dentroDaArena = (x, y, z) => Math.abs(x - ARENA.x) <= ARENA.raio && Math.abs(z - ARENA.z) <= ARENA.raio && y >= ARENA.yMin && y <= ARENA.yMax;
const chave = (/** @type {{ x: number, y: number, z: number }} */ l) => `${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;

// ---------------------------------------------------------------- loja
const ARMADURAS = [
  null,
  { pecas: ["minecraft:chainmail_helmet", "minecraft:chainmail_chestplate", "minecraft:chainmail_leggings", "minecraft:chainmail_boots"], nome: "Cota de malha" },
  { pecas: ["minecraft:iron_helmet", "minecraft:iron_chestplate", "minecraft:iron_leggings", "minecraft:iron_boots"], nome: "Armadura de ferro" },
  { pecas: ["minecraft:diamond_helmet", "minecraft:diamond_chestplate", "minecraft:diamond_leggings", "minecraft:diamond_boots"], nome: "Armadura de diamante" },
];
const BASE = ["minecraft:leather_helmet", "minecraft:leather_chestplate", "minecraft:leather_leggings", "minecraft:leather_boots"];
const SLOTS = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];

/**
 * @typedef {object} ItemLoja
 * @property {string} nome
 * @property {[keyof typeof MOEDAS, number]} preco
 * @property {(time: typeof TIMES[number]) => ItemStack} [dar]
 * @property {number} [armadura]  nível de armadura (1 a 3), em vez de item
 */
/** @type {{ nome: string, icone: string, itens: ItemLoja[] }[]} */
export const LOJA = [
  {
    nome: "Blocos", icone: ICONES.casas,
    itens: [
      { nome: "Lã do time ×16", preco: ["ferro", 4], dar: (t) => criar(t.la, 16) },
      { nome: "Tábuas ×16", preco: ["ferro", 8], dar: () => criar("minecraft:oak_planks", 16) },
      { nome: "Pedra do End ×12", preco: ["ferro", 24], dar: () => criar("minecraft:end_stone", 12) },
      { nome: "Obsidiana ×4", preco: ["esmeralda", 4], dar: () => criar("minecraft:obsidian", 4) },
      { nome: "Teia ×2", preco: ["ferro", 8], dar: () => criar("minecraft:web", 2) },
    ],
  },
  {
    nome: "Armas", icone: ICONES.cacada,
    itens: [
      { nome: "Espada de pedra", preco: ["ferro", 10], dar: () => criar("minecraft:stone_sword") },
      { nome: "Espada de ferro", preco: ["ouro", 7], dar: () => criar("minecraft:iron_sword") },
      { nome: "Espada de diamante", preco: ["esmeralda", 4], dar: () => criar("minecraft:diamond_sword") },
      { nome: "Arco", preco: ["ouro", 12], dar: () => criar("minecraft:bow") },
      { nome: "Flechas ×8", preco: ["ouro", 2], dar: () => criar("minecraft:arrow", 8) },
      { nome: "Bastão do Empurrão", preco: ["ouro", 5], dar: () => criar("minecraft:stick", 1, { nome: "§eBastão do Empurrão", ench: [["knockback", 2]] }) },
    ],
  },
  {
    nome: "Armaduras", icone: ICONES.staff,
    itens: [
      { nome: "Cota de malha", preco: ["ferro", 40], armadura: 1 },
      { nome: "Armadura de ferro", preco: ["ouro", 12], armadura: 2 },
      { nome: "Armadura de diamante", preco: ["esmeralda", 6], armadura: 3 },
    ],
  },
  {
    nome: "Ferramentas", icone: ICONES.editar,
    itens: [
      { nome: "Picareta de pedra", preco: ["ferro", 10], dar: () => criar("minecraft:stone_pickaxe") },
      { nome: "Machado de pedra", preco: ["ferro", 10], dar: () => criar("minecraft:stone_axe") },
      { nome: "Tesoura", preco: ["ferro", 20], dar: () => criar("minecraft:shears") },
    ],
  },
  {
    nome: "Comida", icone: ICONES.sim,
    itens: [
      { nome: "Pão ×6", preco: ["ferro", 3], dar: () => criar("minecraft:bread", 6) },
      { nome: "Carne assada ×4", preco: ["ferro", 8], dar: () => criar("minecraft:cooked_beef", 4) },
      { nome: "Cenoura dourada ×3", preco: ["ouro", 2], dar: () => criar("minecraft:golden_carrot", 3) },
      { nome: "Maçã dourada", preco: ["ouro", 3], dar: () => criar("minecraft:golden_apple") },
    ],
  },
  {
    nome: "Poções", icone: ICONES.nova,
    itens: [
      { nome: "Frasco de Regeneração", preco: ["diamante", 4], dar: () => frasco("regeneracao") },
      { nome: "Frasco de Força", preco: ["diamante", 6], dar: () => frasco("forca") },
      { nome: "Frasco de Resistência", preco: ["diamante", 6], dar: () => frasco("resistencia") },
      { nome: "Frasco de Invisibilidade", preco: ["diamante", 8], dar: () => frasco("invisivel") },
      { nome: "Frasco de Velocidade", preco: ["esmeralda", 1], dar: () => frasco("velocidade") },
      { nome: "Frasco de Pulo", preco: ["esmeralda", 1], dar: () => frasco("pulo") },
      { nome: "Frasco de Cura", preco: ["ouro", 6], dar: () => frasco("cura") },
    ],
  },
  {
    nome: "Utilidades", icone: ICONES.nova,
    itens: [
      { nome: "TNT", preco: ["ouro", 4], dar: () => criar("minecraft:tnt") },
      { nome: "Pérola do Ender", preco: ["esmeralda", 4], dar: () => criar("minecraft:ender_pearl") },
      { nome: "Balde de água", preco: ["ouro", 3], dar: () => criar("minecraft:water_bucket") },
      { nome: "Bola de neve ×8", preco: ["ferro", 12], dar: () => criar("minecraft:snowball", 8) },
      { nome: "Bola de Fogo", preco: ["ferro", 40], dar: () => especial("bola_fogo") },
      { nome: "Cajado da Ponte", preco: ["esmeralda", 2], dar: () => especial("ponte") },
      { nome: "Pena de Salto", preco: ["esmeralda", 1], dar: () => especial("salto") },
      { nome: "Rastreador", preco: ["ouro", 8], dar: () => especial("rastreador") },
    ],
  },
];

/**
 * Equipa as 4 peças (couro de base, ou a armadura comprada).
 * @param {import("@minecraft/server").Player} p
 * @param {number} nivel
 */
function vestir(p, nivel) {
  const eq = p.getComponent("minecraft:equippable");
  const peças = ARMADURAS[nivel]?.pecas ?? BASE;
  SLOTS.forEach((s, i) => eq?.setEquipment(s, criar(peças[i])));
}

/** Kit de quem nasce ou renasce: espada de madeira, a loja e a armadura já comprada. @param {import("@minecraft/server").Player} p @param {number} armadura */
function darKit(p, armadura) {
  dar(p, criar("minecraft:wooden_sword"));
  dar(p, criar("minecraft:bread", 3));
  dar(p, criar("minecraft:emerald", 1, { nome: tj.BW_LOJA_ITEM, lore: [MARCA_LOJA, "§7Compre equipamento com ferro, ouro, diamante e esmeralda."] }));
  vestir(p, armadura);
}

/**
 * Abre a loja para a pessoa (categorias; cada compra reabre a categoria).
 * @param {import("@minecraft/server").Player} player
 * @param {{ P: any, j: any, api: any }} ctx
 * @param {number} [cat]
 */
export async function menuLoja(player, ctx, cat) {
  const { P, j } = ctx;
  const time = P.extra?.times?.[j.equipe];
  if (!time) return;
  const corpo = tj.BW_LOJA_CORPO(contar(player, MOEDAS.ferro.id), contar(player, MOEDAS.ouro.id), contar(player, MOEDAS.diamante.id), contar(player, MOEDAS.esmeralda.id));
  if (cat === undefined) {
    const tela = new Lista(tj.BW_LOJA_TITULO).texto(corpo);
    LOJA.forEach((c, i) => tela.botao(c.nome, c.icone, (p) => menuLoja(p, ctx, i)));
    tela.botao(tj.BW_BOTAO_MELHORIAS, ICONES.sim, (p) => menuMelhorias(p, ctx, () => menuLoja(p, ctx)));
    tela.botao(tj.BW_BOTAO_ARMADILHAS, ICONES.apagar, (p) => menuArmadilhas(p, ctx, () => menuLoja(p, ctx)));
    await tela.abrir(player);
    return;
  }
  const c = LOJA[cat];
  const tela = new Lista(`${tj.BW_LOJA_TITULO}: ${c.nome}`).texto(corpo);
  for (const it of c.itens) {
    const m = MOEDAS[it.preco[0]];
    tela.botao(`${it.nome}\n${m.cor}${it.preco[1]} ${m.nome}`, c.icone, async (p) => {
      comprar(p, ctx, it, time);
      await menuLoja(p, ctx, cat);
    });
  }
  await tela.voltar((p) => menuLoja(p, ctx)).abrir(player);
}

/**
 * Compra um item: confere a moeda, cobra e entrega (armadura é equipada na hora e fica para as próximas vidas).
 * @param {import("@minecraft/server").Player} p
 * @param {{ P: any, j: any, api: any }} ctx
 * @param {ItemLoja} it
 * @param {typeof TIMES[number]} time
 */
export function comprar(p, ctx, it, time) {
  const m = MOEDAS[it.preco[0]];
  if (it.armadura && (ctx.P.extra.armaduras.get(ctx.j.id) ?? 0) >= it.armadura) return ctx.api.msg(p, tj.BW_JA_TEM);
  if (contar(p, m.id) < it.preco[1]) return ctx.api.erro(p, tj.BW_SEM_MOEDA(`${it.preco[1]} ${m.nome}`));
  if (it.armadura) {
    const atual = ctx.P.extra.armaduras.get(ctx.j.id) ?? 0;
    if (atual >= it.armadura) return ctx.api.msg(p, tj.BW_JA_TEM);
    retirar(p, m.id, it.preco[1]);
    ctx.P.extra.armaduras.set(ctx.j.id, it.armadura);
    vestir(p, it.armadura);
  } else if (it.dar) {
    retirar(p, m.id, it.preco[1]);
    dar(p, it.dar(time));
  }
  aplicarEquipamento(p, ctx.P.extra.times[ctx.j.equipe]);
  ctx.api.msg(p, tj.BW_COMPROU(it.nome));
  ctx.api.som(p, "random.orb", { volume: 0.6, pitch: 1.3 });
}

// ---------------------------------------------------------------- geradores
/** Solta itens no gerador, sem encher o chão. @param {import("@minecraft/server").Dimension} dim @param {Ponto} pos @param {string} id @param {number} n */
function soltar(dim, pos, id, n) {
  try {
    if (dim.getEntities({ type: "minecraft:item", location: pos, maxDistance: 3 }).length >= 40) return;
    dim.spawnItem(new ItemStack(id, n), pos);
  } catch (e) {
    registrarErro("Bedwars: gerador", e);
  }
}

/** @type {import("./mg_motor.js").JogoDef} */
export const BEDWARS = {
  id: "bedwars",
  nome: "Bedwars",
  descricao: tj.BW_DESC,
  equipes: true,
  mapas: MAPAS_BEDWARS,
  opcoes: [
    {
      id: "ritmo", titulo: "Ritmo dos geradores", padrao: "normal", desc: "Quão rápido nascem ferro, ouro, diamante e esmeralda.",
      opcoes: [
        { id: "normal", nome: "Normal", desc: "O ritmo de sempre." },
        { id: "rapido", nome: "Rápido", desc: "Todos os geradores nascem em dobro: partidas mais ágeis e cheias de combate." },
      ],
    },
  ],
  construir: (p, mapaId, rng) => construirBedwars(p, mapaId, rng),
  vagas: () => 8,

  atribuir(P, api) {
    const lista = [...P.jog.values()];
    const nt = Math.max(1, Math.min(4, lista.length));
    lista.forEach((j, i) => {
      j.equipe = i % nt;
      j.spawn = Math.floor(i / nt) % 2;
    });
    P.extra = {
      times: P.dados.equipes.map((/** @type {any} */ e, /** @type {number} */ i) => ({ ...e, ativa: i < nt, camaViva: i < nt, up: melhoriasVazias(), armadilhas: [], acc: { ferro: 0, ouro: 0, esm: 0 }, membros: lista.filter((j) => j.equipe === i).map((j) => j.id) })),
      marc: new Set(),
      armaduras: new Map(),
      avisoDiamante: false,
      avisoEsmeralda: false,
      nivelDiamante: 1,
      nivelEsmeralda: 1,
      acc: { diamante: 0, esmeralda: 0 },
      morteSubita: false,
    };
    void api;
  },
  posInicial: (P, j) => P.extra.times[j.equipe].spawns[j.spawn],

  aoIniciar(P, api) {
    const dim = api.dim();
    // times sem ninguém: tira a cama e o gerador não funciona
    if (dim) {
      for (const t of P.extra.times) {
        if (t.ativa) continue;
        try {
          dim.setBlockType(t.cama.pe, "minecraft:air");
          dim.setBlockType(t.cama.cabeca, "minecraft:air");
        } catch (e) {
          registrarErro("Bedwars: tirar cama", e);
        }
      }
    }
    for (const j of P.jog.values()) {
      const p = api.porId(j.id);
      if (!p) continue;
      const t = P.extra.times[j.equipe];
      darKit(p, 0);
      api.titulo(p, tj.BW_TITULO_TIME(t.cor, t.nome), tj.BW_SUB_TIME);
      api.msg(p, tj.BW_VOCE_TIME(t.cor, t.nome));
    }
  },

  aoPasso(P, seg, ciclo, api) {
    const dim = api.dim();
    if (!dim) return;
    const cfg = config();
    const ritmo = P.config?.ritmo === "rapido" ? 2 : 1;
    const x = P.extra;
    const todos = () => [...P.jog.values()].map((j) => api.porId(j.id)).filter((p) => !!p);
    // geradores das ilhas: a Forja acelera; no nível 3 a ilha também gera esmeraldas
    for (const t of x.times) {
      if (!t.ativa) continue;
      t.acc.ferro += (fatorForja(t) * ritmo) / 2;
      t.acc.ouro += (fatorForja(t) * ritmo) / 8;
      if ((t.up?.forja ?? 0) >= 3) t.acc.esm += ritmo / 50;
      for (const [chave, moeda] of [["ferro", MOEDAS.ferro.id], ["ouro", MOEDAS.ouro.id], ["esm", MOEDAS.esmeralda.id]]) {
        while (t.acc[chave] >= 1) {
          t.acc[chave] -= 1;
          soltar(dim, t.gerador, moeda, 1);
        }
      }
    }
    // níveis dos geradores do meio, ao longo da partida
    /** @type {[number, "nivelDiamante" | "nivelEsmeralda", number][]} */
    const marcos = [[360, "nivelDiamante", 2], [720, "nivelDiamante", 3], [480, "nivelEsmeralda", 2], [840, "nivelEsmeralda", 3]];
    for (const [quando, campo, nivel] of marcos) {
      if (seg >= quando && x[campo] < nivel) {
        x[campo] = nivel;
        for (const p of todos()) {
          api.msg(p, campo === "nivelDiamante" ? tj.BW_GER_DIAMANTE(nivel) : tj.BW_GER_ESMERALDA(nivel));
          api.som(p, "random.levelup", { volume: 0.5, pitch: 0.7 });
        }
      }
    }
    if (seg >= 60) {
      x.acc.diamante += ritmo / [60, 40, 25][x.nivelDiamante - 1];
      while (x.acc.diamante >= 1) {
        x.acc.diamante -= 1;
        for (const d of P.dados.diamantes) soltar(dim, d, MOEDAS.diamante.id, 1);
      }
      if (!x.avisoDiamante) {
        x.avisoDiamante = true;
        for (const p of todos()) api.msg(p, tj.BW_EVENTO_DIAMANTE);
      }
    }
    if (seg >= 110) {
      x.acc.esmeralda += ritmo / [110, 80, 55][x.nivelEsmeralda - 1];
      while (x.acc.esmeralda >= 1) {
        x.acc.esmeralda -= 1;
        for (const e of P.dados.esmeraldas) soltar(dim, e, MOEDAS.esmeralda.id, 1);
      }
      if (!x.avisoEsmeralda) {
        x.avisoEsmeralda = true;
        for (const p of todos()) api.msg(p, tj.BW_EVENTO_ESMERALDA);
      }
    }
    // morte súbita: todas as camas somem
    if (!x.morteSubita && seg >= cfg.mgBwCamasSeg) {
      x.morteSubita = true;
      for (const t of x.times) {
        if (!t.camaViva) continue;
        t.camaViva = false;
        try {
          dim.setBlockType(t.cama.pe, "minecraft:air");
          dim.setBlockType(t.cama.cabeca, "minecraft:air");
        } catch {
          // a cama já tinha sumido
        }
      }
      for (const p of todos()) {
        api.msg(p, tj.BW_CAMAS_SUMIRAM);
        api.titulo(p, tj.BW_TITULO_MORTE_SUBITA, tj.BW_SUB_MORTE_SUBITA);
        api.som(p, "mob.wither.spawn", { volume: 0.6, pitch: 0.8 });
      }
    }
    efeitosDoTime(P, api);
    vigiarArmadilhas(P, api);
    if (ciclo % 4 === 0) {
      for (const g of [...P.dados.diamantes, ...P.dados.esmeraldas]) efeitos.nuvem(dim, g, { n: 1, largura: 0.4, y0: 0, alto: 1.2 }, "minecraft:endrod");
    }
  },

  barra(P, j, seg) {
    const t = P.extra.times[j.equipe];
    const camas = P.extra.times.filter((/** @type {any} */ x) => x.ativa).map((/** @type {any} */ x) => `${x.camaViva ? x.cor : "§8"}■`).join(" ");
    return tj.BW_BARRA(`${t.cor}${t.nome}`, tj.BW_CAMAS_VIVAS(camas), j.kills, tempoTexto(seg));
  },

  hud(P, j, seg, api) {
    const t = P.extra.times[j.equipe];
    const camas = P.extra.times.filter((/** @type {any} */ x) => x.ativa).map((/** @type {any} */ x) => `${x.camaViva ? x.cor : "§8"}■`).join(" ");
    const cfg = config();
    /** @type {[number, string][]} */
    const marcos = [[360, "Diamante II"], [480, "Esmeralda II"], [720, "Diamante III"], [840, "Esmeralda III"], [cfg.mgBwCamasSeg, "§cMorte súbita"]];
    const prox = marcos.filter(([q]) => q > seg).sort((a, b) => a[0] - b[0])[0];
    const l = [`${t.cor}§lTime ${t.nome}`, `§7Camas ${camas}`, `§7Abates §c${j.kills}`, `§7Tempo §f${tempoTexto(seg)}`];
    if (prox) l.push(`§7${prox[1]} §f${tempoTexto(prox[0] - seg)}`);
    const ups = Object.values(t.up ?? {}).reduce((a, b) => a + (b ? 1 : 0), 0);
    if (ups) l.push(`§7Melhorias §b${ups}`);
    void api;
    return l;
  },

  /** Quem morre perde tudo: os recursos vão para quem matou. Com cama renasce; sem cama, acabou. */
  mortal(P, j, quemId, motivo, api) {
    const p = api.porId(j.id);
    const t = P.extra.times[j.equipe];
    if (p) {
      const matador = quemId ? api.porId(quemId) : undefined;
      const inv = p.getComponent("minecraft:inventory")?.container;
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const it = inv.getItem(i);
          if (!it) continue;
          if (matador && Object.values(MOEDAS).some((m) => m.id === it.typeId)) dar(matador, it);
        }
        inv.clearAll();
      }
      const eq = p.getComponent("minecraft:equippable");
      for (const s of [...SLOTS, EquipmentSlot.Offhand]) eq?.setEquipment(s, undefined);
    }
    void motivo;
    return t.camaViva ? "renascer" : "eliminar";
  },
  aoRenascer(P, j, api) {
    const p = api.porId(j.id);
    if (!p) return;
    darKit(p, P.extra.armaduras.get(j.id) ?? 0);
    aplicarEquipamento(p, P.extra.times[j.equipe]);
  },
  posRenascer: (P, j) => P.extra.times[j.equipe].spawns[Math.floor(Math.random() * 2)],
  segundosRenascer: (P, j) => segundosParaRenascer(P.extra.times[j.equipe]),

  aoEliminado(P, j, api) {
    const t = P.extra.times[j.equipe];
    const vivosDoTime = [...P.jog.values()].filter((x) => x.equipe === j.equipe && x.vivo);
    if (!vivosDoTime.length && t.ativa && !t.eliminado) {
      t.eliminado = true;
      for (const o of P.jog.values()) {
        const p = api.porId(o.id);
        if (p) api.msg(p, tj.BW_TIME_ELIMINADO(t.cor, t.nome));
      }
    }
  },

  vencedor(P) {
    const vivas = P.extra.times.filter((/** @type {any} */ t) => t.ativa && [...P.jog.values()].some((j) => j.equipe === P.extra.times.indexOf(t) && j.vivo));
    if (vivas.length > 1) return undefined;
    if (!vivas.length) return null;
    const t = vivas[0];
    return { ids: t.membros, nome: `${t.cor}Time ${t.nome}` };
  },
  desempate(P) {
    const ativas = P.extra.times.filter((/** @type {any} */ t) => t.ativa && !t.eliminado);
    const comCama = ativas.filter((/** @type {any} */ t) => t.camaViva);
    const pool = comCama.length ? comCama : ativas;
    if (pool.length === 1) return { ids: pool[0].membros, nome: `${pool[0].cor}Time ${pool[0].nome}` };
    return null;
  },
  amigos: (P, a, b) => a.equipe === b.equipe,

  podeColocar(P, j, loc) {
    return dentroDaArena(loc.x, loc.y, loc.z);
  },
  aoColocou(P, j, bloco) {
    P.extra.marc.add(chave(bloco));
  },
  podeQuebrar(P, j, bloco, api) {
    if (bloco.typeId === "minecraft:bed") {
      const t = P.extra.times.find((/** @type {any} */ x) => chave(x.cama.pe) === chave(bloco) || chave(x.cama.cabeca) === chave(bloco));
      if (t && P.extra.times.indexOf(t) === j.equipe) {
        const p = api.porId(j.id);
        if (p) api.msg(p, tj.BW_CAMA_PROPRIA);
        return false;
      }
      return true;
    }
    if (P.extra.marc.has(chave(bloco))) return true;
    const p = api.porId(j.id);
    if (p) api.msg(p, tj.BW_SO_SEUS_BLOCOS);
    return false;
  },
  aoQuebrou(P, j, bloco, api) {
    if (bloco.typeId === "minecraft:bed") {
      const idx = P.extra.times.findIndex((/** @type {any} */ x) => chave(x.cama.pe) === chave(bloco) || chave(x.cama.cabeca) === chave(bloco));
      const t = P.extra.times[idx];
      if (!t || !t.camaViva) return;
      t.camaViva = false;
      j.d.camas = (j.d.camas ?? 0) + 1;
      const dim = api.dim();
      try {
        dim?.setBlockType(t.cama.pe, "minecraft:air");
        dim?.setBlockType(t.cama.cabeca, "minecraft:air");
      } catch {
        // a cama já caiu junto
      }
      for (const o of P.jog.values()) {
        const p = api.porId(o.id);
        if (!p) continue;
        api.msg(p, tj.BW_CAMA_QUEBRADA(t.cor, t.nome));
        api.som(p, "mob.enderdragon.growl", { volume: 0.5, pitch: 1.2 });
        if (o.equipe === idx) api.titulo(p, tj.BW_SUA_CAMA, "");
      }
      return;
    }
    P.extra.marc.delete(chave(bloco));
  },
  explosao(P, blocos) {
    return blocos.filter((b) => P.extra.marc.has(chave(b.location ?? b)));
  },

  aoUsarItem(P, j, item, player, api) {
    if (item.getLore?.().includes(MARCA_LOJA)) {
      system.run(() => void menuLoja(player, { P, j, api })); // o evento é só leitura: abre a tela no tick seguinte
      return true;
    }
    const t = P.extra.times[j.equipe];
    return usarEspecial(player, item, {
      aoBloco: (pos) => P.extra.marc.add(chave(pos)),
      bloco: t.la,
      inimigos: () => api.vivos().filter((o) => o.equipe !== j.equipe).map((o) => ({ id: o.id, nome: o.nome, ...(api.porId(o.id)?.location ?? { x: 0, y: 0, z: 0 }) })),
      msg: api.msg,
    });
  },
  aoInteragirBloco(P, j, bloco, player, api) {
    if (bloco.typeId !== "minecraft:crafting_table") return false;
    system.run(() => void menuLoja(player, { P, j, api })); // o evento é só leitura: abre a tela no tick seguinte
    return true;
  },

  premioExtra: (j) => Math.min(3, j.d.camas ?? 0),
  resumo(P) {
    return [...P.jog.values()].filter((j) => (j.d.camas ?? 0) > 0).map((j) => `§f${j.nome} §8» ${tj.BW_RESUMO_CAMAS(j.d.camas)}`);
  },
};

void system;
