// @ts-check
// Pillars of Fortune (regras): cada pessoa começa no topo de um pilar 1x1 sobre o vazio e, de tempos em tempos, recebe um item
// aleatório. Quem cai é eliminado; o último de pé vence. Opções votáveis: jeito de entregar os itens (normal, equilibrado,
// embaralhado, trocador) e modo do mapa (normal, lava subindo, blocos frágeis). O motor (fila, votação, prêmios) é mg_motor.js.
import { config } from "../core/db.js";
import { registrarErro } from "../core/util.js";
import * as tp from "../textos/mg_pilares.js";
import * as tj from "../textos/mg_jogos.js";
import { ARENA } from "./mg_arena.js";
import { usarEspecial } from "./mg_especiais.js";
import { criarSorteado, dar } from "./mg_itens.js";
import { MAPAS_PILARES, VAGAS_PILARES, construirPilares } from "./mg_mapas_pilares.js";
import { nomeDoItem, sortearItem } from "./mg_pilares_itens.js";
import { PincelMundo } from "./obras_pincel.js";

/** Intervalos fixos (segundos). */
const EMBARALHA_SEG = 20;
const TROCA_MIN_SEG = 25;
const TROCA_MAX_SEG = 40;
/** Quanto tempo parado antes de o bloco frágil sumir (passos de meio segundo). */
const FRAGIL_PASSOS = 6;
/** Camada de pedra sob a lava (impede a lava de escorrer pelo vazio) e primeiro nível da lava. */
const Y_CHAO_LAVA = 82;
const Y_LAVA_INICIO = 83;
const Y_LAVA_MAX = ARENA.yMax - 2;
/** Quanto tempo o item recebido fica na barra (s). */
const SEG_AVISO_ITEM = 4;

/** @type {import("./mg_motor.js").Categoria[]} */
export const OPCOES = [
  {
    id: "itens", titulo: tp.PF_CAT_ITENS, desc: tp.PF_CAT_ITENS_DESC, padrao: "normal",
    opcoes: [
      { id: "normal", ...tp.PF_ITENS_NORMAL },
      { id: "equilibrado", ...tp.PF_ITENS_EQUILIBRADO },
      { id: "embaralhado", ...tp.PF_ITENS_EMBARALHADO },
      { id: "trocador", ...tp.PF_ITENS_TROCADOR },
    ],
  },
  {
    id: "mapa_modo", titulo: tp.PF_CAT_MAPA, desc: tp.PF_CAT_MAPA_DESC, padrao: "normal",
    opcoes: [
      { id: "normal", ...tp.PF_MAPA_NORMAL },
      { id: "lava", ...tp.PF_MAPA_LAVA },
      { id: "fragil", ...tp.PF_MAPA_FRAGIL },
    ],
  },
];

/** @param {number} s */
const tempoTexto = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** @param {number} x @param {number} y @param {number} z */
const dentroDaArena = (x, y, z) => Math.abs(x - ARENA.x) <= ARENA.raio && Math.abs(z - ARENA.z) <= ARENA.raio && y >= ARENA.yMin && y <= ARENA.yMax;

/** @param {any} P @param {any} api @param {(p: import("@minecraft/server").Player, j: any) => void} fn */
function paraCadaVivo(P, api, fn) {
  for (const j of api.vivos()) {
    const p = api.porId(j.id);
    if (p) fn(p, j);
  }
}

/** Entrega um item (o que não couber cai aos pés) e guarda o nome para a barra. @param {any} P @param {any} api @param {import("@minecraft/server").Player} p @param {any} j @param {import("./mg_itens.js").Sorteado} s @param {number} seg */
function entregar(P, api, p, j, s, seg) {
  dar(p, criarSorteado(s));
  j.d.pf = { nome: nomeDoItem(s), ate: seg + SEG_AVISO_ITEM };
  api.som(p, "random.pop", { volume: 0.35, pitch: 1.3 });
}

/** A rodada de itens: cada um o seu, ou todos o mesmo no modo equilibrado. @param {any} P @param {any} api @param {number} seg */
function rodadaDeItens(P, api, seg) {
  const equilibrado = P.config?.itens === "equilibrado";
  const mesmo = equilibrado ? sortearItem(Math.random) : undefined;
  paraCadaVivo(P, api, (p, j) => entregar(P, api, p, j, mesmo ?? sortearItem(Math.random), seg));
}

/** Troca a hotbar inteira de cada vivo por itens aleatórios. @param {any} P @param {any} api */
function embaralhar(P, api) {
  paraCadaVivo(P, api, (p) => {
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    for (let i = 0; i < 9; i++) inv.setItem(i, criarSorteado(sortearItem(Math.random)));
    api.msg(p, tp.PF_EMBARALHOU);
    api.som(p, "random.levelup", { volume: 0.5, pitch: 1.4 });
  });
}

/** Os vivos trocam de lugar: cada um vai para onde estava o seguinte numa ordem sorteada. @param {any} P @param {any} api */
function trocarLugares(P, api) {
  const ps = api.vivos().map((/** @type {any} */ j) => api.porId(j.id)).filter(Boolean);
  if (ps.length < 2) return;
  ps.sort(() => Math.random() - 0.5);
  const locs = ps.map((/** @type {any} */ p) => ({ x: p.location.x, y: p.location.y, z: p.location.z }));
  ps.forEach((/** @type {any} */ p, i) => {
    try {
      p.teleport(locs[(i + 1) % ps.length]);
      api.msg(p, tp.PF_TROCOU);
      api.som(p, "mob.endermen.portal", { volume: 0.5 });
    } catch (e) {
      registrarErro("Pilares: trocar lugares", e);
    }
  });
}

/** Sobe a lava mais uma camada (só dentro do raio dos pilares). @param {any} P @param {any} api */
function subirLava(P, api) {
  const dim = api.dim();
  if (!dim) return;
  const e = P.extra;
  if (e.lavaNivel >= Y_LAVA_MAX) return;
  e.lavaNivel += 1;
  const r = Math.ceil(P.dados.raio) + 5;
  new PincelMundo(dim).fill(ARENA.x - r, e.lavaNivel, ARENA.z - r, ARENA.x + r, e.lavaNivel, ARENA.z + r, "minecraft:lava", true);
}

/** Blocos frágeis: o bloco sob os pés de quem fica parado some. @param {any} P @param {any} api */
function fragilizar(P, api) {
  const dim = api.dim();
  if (!dim) return;
  const pincel = new PincelMundo(dim);
  paraCadaVivo(P, api, (p, j) => {
    const l = p.location;
    const x = Math.floor(l.x), y = Math.floor(l.y - 0.05), z = Math.floor(l.z);
    const bloco = dim.getBlock({ x, y, z });
    if (!bloco || bloco.typeId === "minecraft:air") {
      P.extra.parado.delete(j.id);
      return;
    }
    const chave = `${x},${y},${z}`;
    const antes = P.extra.parado.get(j.id);
    const n = antes?.chave === chave ? antes.n + 1 : 1;
    if (n >= FRAGIL_PASSOS) {
      pincel.set(x, y, z, "minecraft:air");
      dim.spawnParticle?.("minecraft:large_explosion", { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
      api.som(p, "dig.gravel", { volume: 0.6, pitch: 0.8 });
      P.extra.parado.delete(j.id);
      return;
    }
    if (n === FRAGIL_PASSOS - 2) api.som(p, "random.click", { volume: 0.4, pitch: 0.7 });
    P.extra.parado.set(j.id, { chave, n });
  });
}

/**
 * Gaiola justa com o pilar: o topo é 1x1, então o vidro fica colado (só a coluna do jogador fica livre) e ninguém consegue sair da
 * borda antes da largada. A gaiola de 5x5 dos outros jogos deixaria um vão sem chão em volta.
 * @param {import("./obras_pincel.js").Pincel} p @param {{ x: number, y: number, z: number }} s @param {boolean} fechar
 */
function gaiolaDoPilar(p, s, fechar) {
  const x = Math.floor(s.x), z = Math.floor(s.z), y = Math.floor(s.y);
  if (!fechar) {
    p.fill(x - 1, y, z - 1, x + 1, y + 2, z + 1, "minecraft:air");
    return;
  }
  p.fill(x - 1, y, z - 1, x + 1, y + 2, z + 1, "minecraft:glass");
  p.fill(x, y, z, x, y + 1, z, "minecraft:air");
}

/** @type {import("./mg_motor.js").JogoDef} */
export const PILARES = {
  id: "pilares",
  nome: "Pillars of Fortune",
  descricao: tp.PF_DESC,
  equipes: false,
  mapas: MAPAS_PILARES,
  opcoes: OPCOES,
  construir: (p, mapaId, rng) => construirPilares(p, mapaId, rng),
  vagas: (dados) => Math.min(VAGAS_PILARES, dados.spawns.length),

  atribuir(P) {
    const jogadores = [...P.jog.values()].sort(() => Math.random() - 0.5);
    const giro = Math.floor(Math.random() * VAGAS_PILARES);
    jogadores.forEach((j, i) => {
      j.spawn = (Math.floor((i * VAGAS_PILARES) / jogadores.length) + giro) % VAGAS_PILARES;
      j.equipe = -1;
    });
  },
  posInicial: (P, j) => P.dados.spawns[j.spawn],
  gaiolas(P, dim, fechar) {
    const pincel = new PincelMundo(dim);
    for (const s of P.dados.spawns) gaiolaDoPilar(pincel, s, fechar);
  },

  aoIniciar(P, api) {
    const cfg = config();
    P.extra = { prox: 0, embaralha: EMBARALHA_SEG, troca: 0, avisouTroca: false, lavaNivel: Y_LAVA_INICIO - 1, lavaProx: 0, parado: new Map() };
    P.extra.troca = TROCA_MIN_SEG + Math.random() * (TROCA_MAX_SEG - TROCA_MIN_SEG);
    const modo = P.config?.mapa_modo ?? "normal";
    if (modo === "lava") {
      const dim = api.dim();
      if (dim) {
        const r = Math.ceil(P.dados.raio) + 6;
        new PincelMundo(dim).fill(ARENA.x - r, Y_CHAO_LAVA, ARENA.z - r, ARENA.x + r, Y_CHAO_LAVA, ARENA.z + r, "minecraft:blackstone");
      }
      subirLava(P, api);
      P.extra.lavaProx = Math.max(5, cfg.mgPilaresLavaSeg);
    }
    paraCadaVivo(P, api, (p) => {
      api.msg(p, tp.PF_INICIO(cfg.mgPilaresSeg));
      if (modo === "lava") api.msg(p, tp.PF_LAVA_AVISO(P.extra.lavaNivel));
      if (modo === "fragil") api.msg(p, tp.PF_FRAGIL_AVISO);
    });
  },

  aoPasso(P, seg, ciclo, api) {
    const e = P.extra;
    if (!e) return;
    const cfg = config();
    const modo = P.config?.mapa_modo ?? "normal";
    const itens = P.config?.itens ?? "normal";
    try {
      // itens do intervalo
      if (seg >= e.prox) {
        e.prox = seg + Math.max(2, cfg.mgPilaresSeg);
        rodadaDeItens(P, api, seg);
      }
      if (itens === "embaralhado" && seg >= e.embaralha) {
        e.embaralha = seg + EMBARALHA_SEG;
        embaralhar(P, api);
      }
      if (itens === "trocador") {
        if (!e.avisouTroca && seg >= e.troca - 3) {
          e.avisouTroca = true;
          paraCadaVivo(P, api, (p) => {
            api.msg(p, tp.PF_TROCA_AVISO);
            api.som(p, "note.pling", { volume: 0.6, pitch: 0.6 });
          });
        }
        if (seg >= e.troca) {
          trocarLugares(P, api);
          e.avisouTroca = false;
          e.troca = seg + TROCA_MIN_SEG + Math.random() * (TROCA_MAX_SEG - TROCA_MIN_SEG);
        }
      }
      if (modo === "lava") {
        if (seg >= e.lavaProx) {
          e.lavaProx = seg + Math.max(5, cfg.mgPilaresLavaSeg);
          subirLava(P, api);
          if (e.lavaNivel % 4 === 0) paraCadaVivo(P, api, (p) => api.msg(p, tp.PF_LAVA_NIVEL(e.lavaNivel)));
        }
        for (const j of api.vivos()) {
          const p = api.porId(j.id);
          if (p && p.location.y < e.lavaNivel + 1) api.matar(j.id, "lava");
        }
      }
      if (modo === "fragil") fragilizar(P, api);
    } catch (err) {
      registrarErro("Pilares: passo", err);
    }
    void ciclo;
  },

  hud(P, j, seg, api) {
    const e = P.extra;
    const prox = e ? Math.max(0, Math.ceil(e.prox - seg)) : 0;
    const l = ["§d§lPILLARS OF FORTUNE", ...tj.HUD_GERAL(api.vivos().length, j.kills, tempoTexto(seg)), `§7Próximo item §e${prox}s`];
    if (P.config?.mapa_modo === "lava" && e) l.push(`§cLava no nível §f${e.lavaNivel}`);
    if (j.d.pf && seg < j.d.pf.ate) l.push(`§7Recebeu §f${j.d.pf.nome}`);
    return l;
  },

  barra(P, j, seg, api) {
    const e = P.extra;
    const prox = e ? Math.max(0, Math.ceil(e.prox - seg)) : 0;
    const recebido = j.d.pf && seg < j.d.pf.ate ? `§7+ §f${j.d.pf.nome}` : "";
    const lava = P.config?.mapa_modo === "lava" && e ? tp.PF_BARRA_LAVA(e.lavaNivel) : "";
    return tp.PF_BARRA(api.vivos().length, j.kills, tempoTexto(seg), prox, [lava, recebido].filter(Boolean).join("  "));
  },

  aoUsarItem(P, j, item, player, api) {
    return usarEspecial(player, item, {
      inimigos: () => api.vivos().filter((o) => o.id !== j.id).map((o) => ({ id: o.id, nome: o.nome, ...(api.porId(o.id)?.location ?? { x: 0, y: 0, z: 0 }) })),
      msg: api.msg,
    });
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
