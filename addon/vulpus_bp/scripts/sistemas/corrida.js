// @ts-check
// Corrida de Raposas: a barraca da feira. Três raposas (uma por faixa) esperam na largada. Clicar no balcão abre a aposta
// (qual raposa e quanto). A primeira aposta abre uma janela de alguns segundos para outras pessoas apostarem; depois a
// contagem, a largada e a corrida: cada raposa muda de ritmo ao acaso (arrancadas, tropeços), levanta poeira e a
// primeira a cruzar a chegada ganha. Todas têm a mesma chance, então o pagamento fica um pouco abaixo de 3x (a banca
// tira Caudas da economia). Tem espera entre apostas e limites de lucro e de perda por dia. Painel: feira_staff.js.
import { Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, limitar, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { INDICES_RAPOSAS } from "../textos/props_modelos.js";
import * as textos from "../textos/corrida.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { achadas, esquecerBusca } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {{ dia: string, ganho: number, perda: number, ult: number }} Registro */
/** @typedef {{ balcao?: Ponto, largadas: (Ponto | null)[], chegada?: Ponto, jogadores: Record<string, Registro>, ultimas: number[], pendentes: Record<string, number> }} Dados */
/** @typedef {{ nome: string, raposa: number, valor: number }} Aposta */

const CHAVE = "vulpus:corrida";
const ENTIDADE = "vulpus:prop";
const TAG_RAPOSA = "vulpus_corrida_raposa_";
const TAG_TITULO = "vulpus_corrida_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;
const ALTURA_TITULO = 2.4;
const ULTIMAS_MAX = 5;
const GRANDE_PREMIO = 150;
const MIN_PISTA = 3;
/** Quem está a até esta distância da largada vê a narração. */
const ALCANCE_NARRACAO = 40;

/** @type {Dados | undefined} */
let dados;
/** @type {"livre" | "apostas" | "correndo"} */
let fase = "livre";
/** @type {Map<string, Aposta>} */
const apostas = new Map();
let fimApostas = 0;
let recuperou = false;

/** @param {any} p */
const ehPonto = (p) => !!p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n));

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {Record<string, Registro>} */
  const jogadores = {};
  if (s.jogadores && typeof s.jogadores === "object") {
    for (const [id, r] of Object.entries(s.jogadores)) {
      const x = /** @type {any} */ (r);
      if (x && typeof x === "object") jogadores[id] = { dia: String(x.dia ?? ""), ganho: Number(x.ganho) || 0, perda: Number(x.perda) || 0, ult: Number(x.ult) || 0 };
    }
  }
  /** @type {Record<string, number>} */
  const pendentes = {};
  if (s.pendentes && typeof s.pendentes === "object") {
    for (const [id, v] of Object.entries(s.pendentes)) if (Number.isFinite(v) && /** @type {number} */ (v) > 0) pendentes[id] = Math.floor(/** @type {number} */ (v));
  }
  const largadas = Array.isArray(s.largadas) ? s.largadas.slice(0, 3).map((c) => (ehPonto(c) ? { x: c.x, y: c.y, z: c.z, d: c.d } : null)) : [];
  while (largadas.length < 3) largadas.push(null);
  dados = {
    balcao: ehPonto(s.balcao) ? { x: s.balcao.x, y: s.balcao.y, z: s.balcao.z, d: s.balcao.d } : undefined,
    largadas,
    chegada: ehPonto(s.chegada) ? { x: s.chegada.x, y: s.chegada.y, z: s.chegada.z, d: s.chegada.d } : undefined,
    jogadores,
    ultimas: Array.isArray(s.ultimas) ? s.ultimas.filter((i) => i === 0 || i === 1 || i === 2).slice(0, ULTIMAS_MAX) : [],
    pendentes,
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/**
 * @param {string} id
 */
function registroDe(id) {
  const d = lerDados();
  const dia = diaBrasilia(Date.now());
  const r = d.jogadores[id] ?? { dia, ganho: 0, perda: 0, ult: 0 };
  if (r.dia !== dia) {
    r.dia = dia;
    r.ganho = 0;
    r.perda = 0;
  }
  d.jogadores[id] = r;
  return r;
}

/** Pista: as três largadas e a chegada, com pelo menos MIN_PISTA blocos. Devolve a direção e o comprimento. @param {Dados} d */
function pista(d) {
  const [a, b, c] = d.largadas;
  const f = d.chegada;
  if (!a || !b || !c || !f || a.d !== f.d || b.d !== f.d || c.d !== f.d) return undefined;
  const dx = f.x - a.x;
  const dz = f.z - a.z;
  const comp = Math.hypot(dx, dz);
  if (comp < MIN_PISTA) return undefined;
  return { dx: dx / comp, dz: dz / comp, comp, yaw: Math.round((Math.atan2(-dx, dz) * 180) / Math.PI), d: f.d };
}

const pronta = () => {
  const d = lerDados();
  return !!d.balcao && !!pista(d);
};

// ------------------------------------------------------------------------------ raposas e título
/** @returns {Entity[]} */
function acharRaposas() {
  return achadas("corrida:raposas", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const dim of DIMENSOES) {
      for (const e of world.getDimension(dim).getEntities({ type: ENTIDADE })) if (e.getTags().some((t) => t.startsWith(TAG_RAPOSA))) achados.push(e);
    }
    return achados;
  });
}

/** @param {number} i @param {Ponto} largada @param {number} p progresso 0 a 1 */
function pontoDaRaposa(i, largada, p) {
  const t = pista(lerDados());
  if (!t) return { x: largada.x, y: largada.y, z: largada.z };
  return { x: largada.x + t.dx * t.comp * p, y: largada.y, z: largada.z + t.dz * t.comp * p };
}

function textoTitulo() {
  const cfg = config();
  return textos.TITULO_FLUTUANTE(cfg.corridaApostaMin, cfg.corridaApostaMax, cfg.corridaPagamentoPct, lerDados().ultimas, {
    fase,
    seg: Math.max(0, Math.ceil((fimApostas - system.currentTick) / 20)),
    apostas: apostas.size,
  });
}

function manterTitulo() {
  try {
    const d = lerDados();
    const ligada = config().corridaLigada && pronta();
    manterTexto(TAG_TITULO, ligada && d.balcao ? { x: d.balcao.x + 0.5, y: d.balcao.y + ALTURA_TITULO, z: d.balcao.z + 0.5, d: d.balcao.d } : undefined, textoTitulo());
  } catch (e) {
    registrarErro("Corrida: título", e);
  }
}

/** Devolve as apostas de uma corrida que nunca terminou (queda do servidor). */
function recuperarPendentes() {
  const d = lerDados();
  let mudou = false;
  for (const [id, valor] of Object.entries(d.pendentes)) {
    if (apostas.has(id)) continue;
    adicionarCaudas(id, valor);
    delete d.pendentes[id];
    mudou = true;
    const p = world.getAllPlayers().find((x) => x.id === id);
    if (p?.isValid) msg(p, textos.REEMBOLSO);
  }
  if (mudou) gravar();
}

/** Garante as três raposas paradas na largada e o título. */
function manter() {
  try {
    if (!recuperou) {
      recuperou = true;
      recuperarPendentes();
    }
    manterTitulo();
    const d = lerDados();
    const t = pista(d);
    const achadas = acharRaposas();
    if (!config().corridaLigada || !t) {
      for (const e of achadas) e.remove();
      return;
    }
    if (fase === "correndo") return;
    for (let i = 0; i < 3; i++) {
      const l = d.largadas[i];
      if (!l) continue;
      const dim = world.getDimension(l.d);
      if (!dim.isChunkLoaded(l)) continue;
      const tag = `${TAG_RAPOSA}${i}`;
      const mesmas = achadas.filter((e) => e.isValid && e.hasTag(tag));
      let ent = mesmas.find((e) => e.dimension.id === dim.id);
      for (const e of mesmas) if (e !== ent) e.remove();
      if (!ent) {
        ent = dim.spawnEntity(ENTIDADE, l);
        ent.addTag(tag);
        esquecerBusca("corrida:raposas");
      } else if (Math.hypot(ent.location.x - l.x, ent.location.y - l.y, ent.location.z - l.z) > 0.05) {
        ent.teleport(l, { dimension: dim });
      }
      ent.setRotation({ x: 0, y: t.yaw });
      ent.setProperty("vulpus:modelo", INDICES_RAPOSAS[i]);
    }
  } catch (e) {
    registrarErro("Corrida: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);
system.runInterval(() => {
  if (fase !== "livre") manterTitulo();
}, 20);

/** Quem está perto da largada recebe a narração e o som. @param {(p: Player) => void} fn */
function paraPerto(fn) {
  try {
    const l = lerDados().largadas[0];
    if (!l) return;
    for (const p of world.getDimension(l.d).getPlayers({ location: l, maxDistance: ALCANCE_NARRACAO })) fn(p);
  } catch (e) {
    registrarErro("Corrida: narração", e);
  }
}

// ------------------------------------------------------------------------------------- apostas
/**
 * Confere se a pessoa pode apostar agora. Devolve o motivo (texto de erro) ou undefined.
 * @param {Player} player
 */
function motivoDeNao(player) {
  const cfg = config();
  if (!cfg.corridaLigada || !pronta()) return textos.JOGO_FECHADO;
  if (fase === "correndo") return textos.EM_ANDAMENTO;
  if (apostas.has(player.id)) return textos.JA_APOSTOU;
  const r = registroDe(player.id);
  const espera = Math.ceil((r.ult + cfg.corridaEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return textos.RECARGA(espera);
  if (r.ganho >= cfg.corridaGanhoMaxDia) return textos.GANHO_MAX;
  if (cfg.corridaPerdaMaxDia - r.perda < cfg.corridaApostaMin) return textos.PERDA_MAX;
  if (saldo(player) < cfg.corridaApostaMin) return textos.SEM_CAUDAS(cfg.corridaApostaMin);
  return undefined;
}

/** @param {Player} player */
async function abrirAposta(player) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const r = registroDe(player.id);
  const minimo = cfg.corridaApostaMin;
  const maximo = Math.max(minimo, Math.min(cfg.corridaApostaMax, saldo(player), cfg.corridaPerdaMaxDia - r.perda));
  const resp = await perguntar(player, textos.TITULO_APOSTA, [
    { tipo: "lista", rotulo: textos.ROTULO_RAPOSA, opcoes: [0, 1, 2].map((i) => textos.OPCAO_RAPOSA(i)), padrao: 0 },
    { tipo: "numero", rotulo: textos.ROTULO_VALOR, padrao: minimo, min: minimo, max: maximo },
  ]);
  if (!resp) return;
  apostar(player, resp[0], resp[1]);
}

/**
 * @param {Player} player
 * @param {number} raposa
 * @param {number} valorPedido
 */
function apostar(player, raposa, valorPedido) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const r = registroDe(player.id);
  const maximo = Math.max(cfg.corridaApostaMin, Math.min(cfg.corridaApostaMax, saldo(player), cfg.corridaPerdaMaxDia - r.perda));
  const valor = limitar(Math.floor(valorPedido), cfg.corridaApostaMin, maximo);
  if (saldo(player) < valor) {
    erro(player, textos.SEM_CAUDAS(valor));
    return;
  }
  const i = limitar(Math.floor(raposa), 0, 2);
  adicionarCaudas(player, -valor);
  apostas.set(player.id, { nome: player.name, raposa: i, valor });
  const d = lerDados();
  d.pendentes[player.id] = valor;
  gravar();
  if (fase === "livre") {
    fase = "apostas";
    fimApostas = system.currentTick + Math.max(5, cfg.corridaApostasSeg) * 20;
    system.runTimeout(() => {
      if (fase === "apostas" && apostas.size > 0) iniciarCorrida();
    }, Math.max(5, cfg.corridaApostasSeg) * 20);
  }
  const seg = Math.max(0, Math.ceil((fimApostas - system.currentTick) / 20));
  msg(player, textos.APOSTOU(valor, i, seg));
  som(player, "random.orb", { pitch: 1.2, volume: 0.8 });
  paraPerto((p) => {
    if (p.id !== player.id) msg(p, textos.OUTRO_APOSTOU(player.name, i));
  });
  manterTitulo();
}

// -------------------------------------------------------------------------------------- corrida
/**
 * Contagem, largada e corrida. Sem apostas (teste da staff) roda do mesmo jeito.
 * @param {(vencedora: number) => void} [aoFim]
 */
function iniciarCorrida(aoFim) {
  try {
    const d = lerDados();
    const t = pista(d);
    if (!t || fase === "correndo") {
      if (apostas.size === 0) fase = "livre";
      return;
    }
    fase = "correndo";
    manterTitulo();
    let n = 3;
    const contar = () => {
      try {
        if (n > 0) {
          paraPerto((p) => {
            p.onScreenDisplay.setActionBar(textos.CONTAGEM(n));
            som(p, "note.pling", { pitch: 0.8 + (3 - n) * 0.25, volume: 0.7 });
          });
          n--;
          system.runTimeout(contar, 20);
          return;
        }
        paraPerto((p) => {
          p.onScreenDisplay.setActionBar(textos.LARGADA);
          som(p, "random.levelup", { pitch: 1.5, volume: 0.8 });
        });
        correr(aoFim);
      } catch (e) {
        registrarErro("Corrida: contagem", e);
        encerrarComReembolso();
      }
    };
    contar();
  } catch (e) {
    registrarErro("Corrida: iniciar", e);
    encerrarComReembolso();
  }
}

/** Algo deu errado: devolve as apostas e libera a pista. */
function encerrarComReembolso() {
  for (const [id, a] of apostas) {
    adicionarCaudas(id, a.valor);
    const p = world.getAllPlayers().find((x) => x.id === id);
    if (p?.isValid) msg(p, textos.REEMBOLSO);
  }
  apostas.clear();
  lerDados().pendentes = {};
  gravar();
  fase = "livre";
  manter();
}

/** @param {(vencedora: number) => void} [aoFim] */
function correr(aoFim) {
  const d = lerDados();
  const t = pista(d);
  const cfg = config();
  const ents = [0, 1, 2].map((i) => acharRaposas().find((e) => e.isValid && e.hasTag(`${TAG_RAPOSA}${i}`)));
  if (!t || ents.some((e) => !e)) {
    encerrarComReembolso();
    return;
  }
  const dim = world.getDimension(t.d);
  const duracao = Math.max(5, cfg.corridaDuracaoSeg) * 20;
  /** Cada raposa muda de ritmo ao acaso: todas têm a mesma distribuição, então a chance de ganhar é igual. */
  const estado = [0, 1, 2].map(() => ({ p: 0, ritmo: 1, ate: 0, fim: false }));
  let tick = 0;
  let lider = -1;
  let vencedora = -1;
  let acabouEm = 0;
  const run = system.runInterval(() => {
    try {
      tick++;
      for (let i = 0; i < 3; i++) {
        const e = estado[i];
        const ent = ents[i];
        if (!ent?.isValid) {
          system.clearRun(run);
          encerrarComReembolso();
          return;
        }
        if (!e.fim) {
          if (tick >= e.ate) {
            const sorte = Math.random();
            e.ritmo = sorte < 0.12 ? 0.35 : sorte < 0.3 ? 1.7 : 0.6 + Math.random() * 0.9;
            e.ate = tick + 12 + Math.floor(Math.random() * 28);
          }
          e.p = Math.min(1, e.p + (e.ritmo / duracao) * 1.03);
          if (e.p >= 1) {
            e.fim = true;
            if (vencedora < 0) {
              vencedora = i;
              acabouEm = tick + 60;
              anunciar(vencedora, aoFim);
            }
          }
        }
        const l = /** @type {Ponto} */ (d.largadas[i]);
        const base = pontoDaRaposa(i, l, e.p);
        const salto = e.fim ? (i === vencedora ? Math.abs(Math.sin(tick * 0.5)) * 0.5 : 0) : Math.abs(Math.sin(tick * 0.9)) * 0.12;
        ent.teleport({ x: base.x, y: base.y + salto, z: base.z }, { dimension: dim });
        ent.setProperty("vulpus:modelo", INDICES_RAPOSAS[i] + (e.fim ? 0 : Math.floor(tick / 3) % 2));
        if (!e.fim && tick % 2 === 0) {
          efeitos.nuvem(dim, { x: base.x - t.dx * 0.6, y: base.y, z: base.z - t.dz * 0.6 }, { n: 1, largura: 0.15, y0: 0.05, alto: 0.2 }, "minecraft:basic_smoke_particle");
          if (e.ritmo > 1.5) efeitos.nuvem(dim, { x: base.x, y: base.y, z: base.z }, { n: 1, largura: 0.2, y0: 0.3, alto: 0.3 }, "minecraft:basic_flame_particle");
        }
      }
      if (tick % 20 === 0 && vencedora < 0) {
        let na = 0;
        for (let i = 1; i < 3; i++) if (estado[i].p > estado[na].p) na = i;
        if (na !== lider) {
          lider = na;
          paraPerto((p) => p.onScreenDisplay.setActionBar(textos.NA_FRENTE(na)));
        }
      }
      if (vencedora >= 0 && (estado.every((e) => e.fim) || tick >= acabouEm)) {
        system.clearRun(run);
        for (let i = 0; i < 3; i++) {
          const ent = ents[i];
          const l = /** @type {Ponto} */ (d.largadas[i]);
          if (ent?.isValid) {
            ent.teleport(l, { dimension: dim });
            ent.setProperty("vulpus:modelo", INDICES_RAPOSAS[i]);
          }
        }
        fase = "livre";
        manter();
      }
    } catch (e) {
      system.clearRun(run);
      registrarErro("Corrida: correr", e);
      encerrarComReembolso();
    }
  }, 1);
}

/**
 * A raposa cruzou a chegada: festa e pagamento das apostas.
 * @param {number} vencedora
 * @param {(vencedora: number) => void} [aoFim]
 */
function anunciar(vencedora, aoFim) {
  try {
    const d = lerDados();
    const cfg = config();
    const t = pista(d);
    const l = d.largadas[vencedora];
    if (t && l) {
      const dim = world.getDimension(t.d);
      const fim = pontoDaRaposa(vencedora, l, 1);
      efeitos.anel(dim, fim, { raio: 1, n: 20, y: 0.3 }, "minecraft:basic_flame_particle");
      efeitos.nuvem(dim, fim, { n: 12, largura: 0.6, y0: 0.5, alto: 1.2 }, "minecraft:endrod");
    }
    paraPerto((p) => {
      p.onScreenDisplay.setActionBar(textos.VENCEDORA(vencedora));
      som(p, "random.levelup", { pitch: 1.1, volume: 0.9 });
    });
    d.ultimas.unshift(vencedora);
    d.ultimas.length = Math.min(d.ultimas.length, ULTIMAS_MAX);
    for (const [id, a] of apostas) {
      const r = registroDe(id);
      r.ult = Date.now();
      const venceu = a.raposa === vencedora;
      const premio = Math.floor((a.valor * cfg.corridaPagamentoPct) / 100);
      if (venceu) {
        adicionarCaudas(id, premio);
        r.ganho += premio - a.valor;
      } else r.perda += a.valor;
      const p = world.getAllPlayers().find((x) => x.id === id);
      if (p?.isValid) {
        mostrarTitulo(p, venceu ? textos.TITULO_GANHOU(vencedora, premio) : textos.TITULO_PERDEU(vencedora), {
          subtitulo: venceu ? textos.SUB_GANHOU(premio) : textos.SUB_PERDEU(a.valor),
          entrada: 2,
          fica: 50,
          saida: 10,
        });
        msg(p, venceu ? textos.CHAT_GANHOU(vencedora, a.valor, premio) : textos.CHAT_PERDEU(vencedora, a.valor));
        som(p, venceu ? "random.levelup" : "note.bass", { pitch: venceu ? 1.2 : 0.8, volume: 0.8 });
      }
      if (venceu && premio >= GRANDE_PREMIO) world.sendMessage(textos.GRANDE_VITORIA(a.nome, vencedora, premio));
    }
    apostas.clear();
    d.pendentes = {};
    gravar();
    manterTitulo();
    aoFim?.(vencedora);
  } catch (e) {
    registrarErro("Corrida: pagamento", e);
  }
}

// ------------------------------------------------------------------------------ interações
/**
 * @param {Ponto | undefined} p
 * @param {import("@minecraft/server").Block} bloco
 */
const mesmoBloco = (p, bloco) =>
  !!p && p.d === bloco.dimension.id && p.x === bloco.location.x && p.y === bloco.location.y && p.z === bloco.location.z;

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    if (!mesmoBloco(lerDados().balcao, block)) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() => rodarSeguro(player, "Corrida", abrirAposta));
  } catch (e) {
    registrarErro("Corrida: interação", e);
  }
});

// Clicar numa raposa também abre a aposta.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE || !ev.target.getTags().some((t) => t.startsWith(TAG_RAPOSA))) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => rodarSeguro(player, "Corrida", abrirAposta));
  } catch (e) {
    registrarErro("Corrida: raposa", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!mesmoBloco(lerDados().balcao, ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Corrida: quebrar", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
/** Estado para o painel da staff. */
export function estadoCorrida() {
  const d = lerDados();
  return { balcao: !!d.balcao, largadas: d.largadas.map((l) => !!l), chegada: !!d.chegada, pista: !!pista(d), fase };
}

/** @param {Player} player */
function olhado(player) {
  try {
    return player.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    return undefined;
  }
}

/** @param {Player} player */
export function marcarBalcao(player) {
  const b = olhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().balcao = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  gravar();
  manter();
  ok(player, textos.BALCAO_MARCADO(formatarCoords(b)));
}

/** Largada de uma faixa: o centro do bloco olhado, na altura do topo dele. @param {Player} player @param {number} n 1 a 3 */
export function marcarLargada(player, n) {
  const b = olhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  if (fase !== "livre") {
    erro(player, textos.OCUPADA);
    return;
  }
  lerDados().largadas[n - 1] = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5, d: b.dimension.id };
  gravar();
  manter();
  ok(player, pista(lerDados()) ? textos.PISTA_PRONTA : textos.LARGADA_MARCADA(n));
}

/** @param {Player} player */
export function marcarChegada(player) {
  const b = olhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  if (fase !== "livre") {
    erro(player, textos.OCUPADA);
    return;
  }
  lerDados().chegada = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5, d: b.dimension.id };
  gravar();
  manter();
  ok(player, pista(lerDados()) ? textos.PISTA_PRONTA : textos.CHEGADA_MARCADA);
}

/** Uma corrida de teste, sem apostas nem prêmio. @param {Player} player */
export function testarCorrida(player) {
  if (!pronta()) {
    erro(player, textos.SEM_PISTA);
    return;
  }
  if (fase !== "livre") {
    erro(player, textos.OCUPADA);
    return;
  }
  iniciarCorrida((v) => {
    if (player.isValid) msg(player, `§6Teste §8» §fVenceu a ${textos.NOME_COLORIDO(v)}§f.`);
  });
}

/** @param {Player} player */
export function removerCorrida(player) {
  encerrarComReembolso();
  const d = lerDados();
  d.balcao = undefined;
  d.largadas = [null, null, null];
  d.chegada = undefined;
  gravar();
  manter();
  ok(player, textos.REMOVIDO);
}
