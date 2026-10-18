// @ts-check
// Cara ou Coroa: a barraca da feira. Clicar no balcão abre a aposta (lado e quantia); uma moeda de verdade sobe,
// gira e cai, e o resultado decide quem ganha. Pagamento um pouco abaixo de 2x (a banca tira Caudas da economia),
// espera entre apostas e limites de lucro e de perda por dia. O painel da staff está em feira_staff.js.
import { Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { perguntar } from "../core/forms.js";
import { manterTexto } from "../core/flutuante.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, limitar, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import * as textos from "../textos/moeda.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { achadas, esquecerBusca } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string, yaw?: number }} Ponto */
/** @typedef {{ dia: string, ganho: number, perda: number, ult: number }} Registro */
/** @typedef {{ balcao?: Ponto, jogadores: Record<string, Registro>, ultimos: string[], lado: string }} Dados */

const CHAVE = "vulpus:moeda";
const ENTIDADE = "vulpus:moeda";
const TAG_MOEDA = "vulpus_moeda";
const TAG_TITULO = "vulpus_moeda_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
/** Duração do voo da moeda (ticks) e altura máxima (blocos). */
const TICKS_VOO = 40;
const ALTURA_VOO = 2.4;
const PASSO_MANTER = 100;
const ULTIMOS_MAX = 5;
const GRANDE_PREMIO = 150;
const ALTURA_TITULO = 2.3;
/** A moeda descansa deitada em cima do balcão. */
const ALTURA_REPOUSO = 1.02;

/** @type {Dados | undefined} */
let dados;
let emJogo = false;

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  const b = s.balcao;
  /** @type {Record<string, Registro>} */
  const jogadores = {};
  if (s.jogadores && typeof s.jogadores === "object") {
    for (const [id, r] of Object.entries(s.jogadores)) {
      const x = /** @type {any} */ (r);
      if (x && typeof x === "object") jogadores[id] = { dia: String(x.dia ?? ""), ganho: Number(x.ganho) || 0, perda: Number(x.perda) || 0, ult: Number(x.ult) || 0 };
    }
  }
  dados = {
    balcao: b && typeof b.d === "string" && [b.x, b.y, b.z].every((n) => Number.isFinite(n)) ? { x: b.x, y: b.y, z: b.z, d: b.d, yaw: Number.isFinite(b.yaw) ? b.yaw : 0 } : undefined,
    jogadores,
    ultimos: Array.isArray(s.ultimos) ? s.ultimos.filter((x) => x === "Cara" || x === "Coroa").slice(0, ULTIMOS_MAX) : [],
    lado: s.lado === "coroa" ? "coroa" : "cara",
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/**
 * Registro do dia da pessoa (zera quando o dia vira).
 * @param {Dados} d
 * @param {string} id
 */
function registroDe(d, id) {
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

/** Onde a moeda descansa: em cima do balcão. @param {Ponto} b */
const repouso = (b) => ({ x: b.x + 0.5, y: b.y + ALTURA_REPOUSO, z: b.z + 0.5 });

// ----------------------------------------------------------------------------- moeda e título

/** @returns {Entity[]} */
function acharMoedas() {
  return achadas("moeda:moeda", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_MOEDA] }));
    return achados;
  });
}

/** @param {Dados} d */
function textoTitulo(d) {
  const cfg = config();
  return textos.TITULO_FLUTUANTE(cfg.moedaApostaMin, cfg.moedaApostaMax, cfg.moedaPagamentoPct, d.ultimos);
}

/** Garante a moeda parada no balcão (uma só) e o título flutuante em cima dela. */
function manter() {
  try {
    const d = lerDados();
    const b = d.balcao;
    const ligada = config().moedaLigada;
    manterTexto(TAG_TITULO, b && ligada ? { x: b.x + 0.5, y: b.y + ALTURA_TITULO, z: b.z + 0.5, d: b.d } : undefined, textoTitulo(d));
    const achados = acharMoedas();
    if (!b || !ligada) {
      for (const e of achados) e.remove();
      return;
    }
    if (emJogo) return;
    const dim = world.getDimension(b.d);
    const p = repouso(b);
    if (!dim.isChunkLoaded(p)) return;
    let ent = achados.find((e) => e.dimension.id === dim.id);
    for (const e of achados) if (e !== ent) e.remove();
    if (!ent) {
      ent = dim.spawnEntity(ENTIDADE, p);
      ent.addTag(TAG_MOEDA);
      esquecerBusca("moeda:moeda");
    } else if (Math.hypot(ent.location.x - p.x, ent.location.y - p.y, ent.location.z - p.z) > 0.05) {
      ent.teleport(p, { dimension: dim });
    }
    ent.setRotation({ x: 0, y: b.yaw ?? 0 });
    ent.setProperty("vulpus:giro", false);
    ent.setProperty("vulpus:coroa", d.lado === "coroa");
  } catch (e) {
    registrarErro("Cara ou Coroa: manter a moeda", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/**
 * A moeda sobe girando, desce e para mostrando o resultado. Chama `aoPousar` quando termina.
 * @param {string} resultado  "cara" ou "coroa"
 * @param {() => void} aoPousar
 */
function voar(resultado, aoPousar) {
  const d = lerDados();
  const b = d.balcao;
  const ent = b ? acharMoedas().find((e) => e.isValid) : undefined;
  if (!b || !ent) {
    aoPousar();
    return;
  }
  const dim = world.getDimension(b.d);
  const base = repouso(b);
  ent.setProperty("vulpus:giro", true);
  const ouvir = (/** @type {string} */ id, /** @type {number} */ tom) => {
    try {
      for (const p of dim.getPlayers({ location: base, maxDistance: 24 })) som(p, id, { location: base, pitch: tom, volume: 0.9 });
    } catch (e) {
      registrarErro("Cara ou Coroa: som", e);
    }
  };
  ouvir("random.pop", 1.4);
  let i = 0;
  const run = system.runInterval(() => {
    try {
      i++;
      if (!ent.isValid) {
        system.clearRun(run);
        aoPousar();
        return;
      }
      const t = Math.min(1, i / TICKS_VOO);
      const y = base.y + ALTURA_VOO * 4 * t * (1 - t);
      ent.teleport({ x: base.x, y, z: base.z }, { dimension: dim });
      if (i % 3 === 0) efeitos.nuvem(dim, { x: base.x, y, z: base.z }, { n: 2, largura: 0.2, y0: 0, alto: 0.3 }, "minecraft:endrod");
      if (i < TICKS_VOO) return;
      system.clearRun(run);
      ent.teleport(base, { dimension: dim });
      ent.setProperty("vulpus:giro", false);
      ent.setProperty("vulpus:coroa", resultado === "coroa");
      efeitos.anel(dim, base, { raio: 0.5, n: 10, y: 0.1 }, "minecraft:basic_flame_particle");
      efeitos.nuvem(dim, base, { n: 6, largura: 0.3, y0: 0.1, alto: 0.6 }, "minecraft:endrod");
      ouvir("random.orb", 1.2);
      aoPousar();
    } catch (e) {
      system.clearRun(run);
      registrarErro("Cara ou Coroa: voo", e);
      aoPousar();
    }
  }, 1);
}

// ------------------------------------------------------------------------------------- jogo

const nomeLado = (/** @type {string} */ l) => (l === "coroa" ? "Coroa" : "Cara");

/**
 * Confere se a pessoa pode apostar agora. Devolve o motivo (texto de erro) ou undefined.
 * @param {Player} player
 */
function motivoDeNao(player) {
  const cfg = config();
  const d = lerDados();
  if (!cfg.moedaLigada || !d.balcao) return textos.JOGO_FECHADO;
  if (emJogo) return textos.OCUPADA;
  const r = registroDe(d, player.id);
  const espera = Math.ceil((r.ult + cfg.moedaEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return textos.RECARGA(espera);
  if (r.ganho >= cfg.moedaGanhoMaxDia) return textos.GANHO_MAX;
  if (cfg.moedaPerdaMaxDia - r.perda < cfg.moedaApostaMin) return textos.PERDA_MAX;
  if (saldo(player) < cfg.moedaApostaMin) return textos.SEM_CAUDAS(cfg.moedaApostaMin);
  return undefined;
}

/** @param {Player} player */
async function abrirJogo(player) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const r = registroDe(lerDados(), player.id);
  const minimo = cfg.moedaApostaMin;
  const maximo = Math.max(minimo, Math.min(cfg.moedaApostaMax, saldo(player), cfg.moedaPerdaMaxDia - r.perda));
  const resp = await perguntar(player, textos.TITULO, [
    { tipo: "lista", rotulo: textos.ROTULO_LADO, opcoes: textos.LADOS, padrao: 0 },
    { tipo: "numero", rotulo: textos.ROTULO_APOSTA, padrao: minimo, min: minimo, max: maximo },
  ]);
  if (!resp) return;
  jogar(player, resp[0] === 1 ? "coroa" : "cara", resp[1]);
}

/**
 * Cobra a aposta, sorteia o lado e solta a moeda; no pouso paga (ou não).
 * @param {Player} player
 * @param {string} escolha
 * @param {number} apostaPedida
 */
function jogar(player, escolha, apostaPedida) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const d = lerDados();
  const r = registroDe(d, player.id);
  const maximo = Math.max(cfg.moedaApostaMin, Math.min(cfg.moedaApostaMax, saldo(player), cfg.moedaPerdaMaxDia - r.perda));
  const aposta = limitar(Math.floor(apostaPedida), cfg.moedaApostaMin, maximo);
  if (saldo(player) < aposta) {
    erro(player, textos.SEM_CAUDAS(aposta));
    return;
  }
  emJogo = true;
  system.runTimeout(() => {
    emJogo = false;
  }, TICKS_VOO + 100);
  r.ult = Date.now();
  adicionarCaudas(player, -aposta);
  gravar();
  const resultado = Math.random() < 0.5 ? "cara" : "coroa";
  msg(player, textos.GIRANDO(aposta, nomeLado(escolha)));
  const id = player.id;
  const nome = player.name;
  voar(resultado, () => finalizar(id, nome, escolha, aposta, resultado));
}

/**
 * @param {string} id
 * @param {string} nome
 * @param {string} escolha
 * @param {number} aposta
 * @param {string} resultado
 */
function finalizar(id, nome, escolha, aposta, resultado) {
  try {
    const cfg = config();
    const d = lerDados();
    const r = registroDe(d, id);
    const venceu = escolha === resultado;
    const premio = Math.floor((aposta * cfg.moedaPagamentoPct) / 100);
    if (venceu) {
      adicionarCaudas(id, premio);
      r.ganho += premio - aposta;
    } else r.perda += aposta;
    d.ultimos.unshift(nomeLado(resultado));
    d.ultimos.length = Math.min(d.ultimos.length, ULTIMOS_MAX);
    d.lado = resultado;
    gravar();
    manter();
    const player = world.getAllPlayers().find((p) => p.id === id);
    if (player?.isValid) {
      mostrarTitulo(player, textos.TITULO_RESULTADO(nomeLado(resultado), venceu), {
        subtitulo: venceu ? textos.SUB_GANHOU(premio) : textos.SUB_PERDEU(aposta),
        entrada: 2,
        fica: 40,
        saida: 10,
      });
      msg(player, venceu ? textos.CHAT_GANHOU(nomeLado(resultado), premio, premio - aposta) : textos.CHAT_PERDEU(nomeLado(resultado), aposta));
      som(player, venceu ? "random.levelup" : "note.bass", { pitch: venceu ? 1.2 : 0.8, volume: 0.8 });
    }
    if (venceu && premio >= GRANDE_PREMIO) world.sendMessage(textos.GRANDE_VITORIA(nome, premio));
  } finally {
    emJogo = false;
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
    system.run(() => rodarSeguro(player, "Cara ou Coroa", abrirJogo));
  } catch (e) {
    registrarErro("Cara ou Coroa: interação", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!mesmoBloco(lerDados().balcao, ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Cara ou Coroa: quebrar", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff

/** Estado para o painel da staff. */
export function estadoMoeda() {
  const d = lerDados();
  return { balcao: !!d.balcao, ultimos: [...d.ultimos], emJogo };
}

/** @param {Player} player */
export function marcarBalcao(player) {
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = player.getBlockFromViewDirection({ maxDistance: 8 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  // A moeda fica de frente para quem a marcou (a staff se põe onde o cliente fica).
  const yaw = Math.round((Math.atan2(-(player.location.x - (b.x + 0.5)), player.location.z - (b.z + 0.5)) * 180) / Math.PI);
  lerDados().balcao = { x: b.x, y: b.y, z: b.z, d: b.dimension.id, yaw };
  gravar();
  manter();
  ok(player, textos.BALCAO_MARCADO(formatarCoords(b)));
}

/** Gira a moeda de teste, sem aposta e sem prêmio. @param {Player} player */
export function testarGiro(player) {
  if (!lerDados().balcao) {
    erro(player, textos.SEM_BALCAO);
    return;
  }
  if (emJogo) {
    erro(player, textos.OCUPADA);
    return;
  }
  emJogo = true;
  system.runTimeout(() => {
    emJogo = false;
  }, TICKS_VOO + 100);
  const resultado = Math.random() < 0.5 ? "cara" : "coroa";
  voar(resultado, () => {
    const d = lerDados();
    d.lado = resultado;
    gravar();
    emJogo = false;
    manter();
    if (player.isValid) msg(player, `§6Teste §8» §fDeu §e${nomeLado(resultado)}§f.`);
  });
}

/** @param {Player} player */
export function removerMoeda(player) {
  const d = lerDados();
  d.balcao = undefined;
  gravar();
  manter();
  ok(player, textos.REMOVIDO);
}
