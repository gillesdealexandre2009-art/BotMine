// @ts-check
// Aba de Obras da staff: marca o centro, ajusta as medidas e gera a montanha (massiço, trilha, santuário, rio, lago, floresta e a
// Sala dos Portais) e a masmorra subterrânea, bem fundo e separada do mapa, ligada à montanha só pelos portais. Cada obra guarda
// uma cópia de segurança da área antes de mexer, então dá para desfazer; obras antigas, sem cópia, podem ser limpas por nivelamento.
// A geração roda aos poucos (um pedaço por tick, num orçamento de milissegundos), pede carga de área quando precisa e pode ser cancelada.
import { system, world } from "@minecraft/server";
import { CHAVE_SPAWN, ICONES } from "../config.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { emitir } from "../core/efeitos.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { teleportar } from "../core/teleporte.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/obras.js";
import { apagarBackup, restaurarBackup, salvarBackup } from "./obras_backup.js";
import { limparMasmorra, limparMontanha } from "./obras_limpeza.js";
import { LARGURA, PADRAO_MASMORRA, PROFUNDIDADE, K_MAX, K_MIN, esquecerAndares, gerarAndares, posicoes } from "./masm_obra.js";
import { andar as andarGravado } from "./masm_estado.js";
import { definirDimensao, iniciarAndares, portaisDosAndares } from "./masm_jogo.js";
import { gerarMontanha, PADRAO_MONTANHA } from "./obras_montanha.js";
import { construirSalaNaCaixa, problemaDaCaixa } from "./obras_sala_caixa.js";
import { PincelMundo } from "./obras_pincel.js";
import { atualizarPortais, ligarViagens } from "./obras_viagem.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {{ x: number, y: number, z: number }} Ponto */
/** @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa */
/** @typedef {import("./masm_construir.js").ResultadoAndar} ResultadoAndar */
/** @typedef {Record<string, { porta: Ponto, zona: Caixa }>} EntradasAntigas */
/** @typedef {import("./obras_montanha.js").ResultadoMontanha} ResultadoMontanha */
/** @typedef {import("./obras_backup.js").Backup} Backup */

/**
 * @typedef {object} Registro
 * @property {{ x: number, z: number, y: number, d: string } | null} centro  y = chão de referência
 * @property {{ raio: number, altura: number, semente: number, floresta: boolean, lago: boolean, trilha: boolean, densidade: number, feita: boolean, pontos: { topo: Ponto, base: Ponto | null, lago: Ponto | null, nascente: Ponto | null } | null, sala: { entrada: Ponto, fachada: Ponto, portais: { lado: string, zona: Caixa, chegada: Ponto }[] } | null }} montanha
 * @property {{ yPiso: number, decoracao: boolean, feita: boolean, x0: number, z0: number, salas: { id: number, nome: string, x: number, y: number, z: number }[], entradas: EntradasAntigas, rampasAntigas: { porta: Ponto, superficie: Ponto | null }[] }} masmorra
 * @property {{ montanha: Backup | null, masmorra: Backup | null, sala: Backup | null }} backups
 */

const CHAVE = "vulpus:obras";
export const LIMITES = Object.freeze({ raio: [20, 90], altura: [15, 120], densidade: [0, 120], yPiso: [-58, 40] });
/** Milissegundos de trabalho por tick (o servidor tem 50). */
const ORCAMENTO_MS = 12;
/** Ticks esperando uma área carregar antes de seguir sem ela. */
const ESPERA_AREA = 400;
const NOME_AREA = "vulpus_obra";
const DIMENSAO_PADRAO = "minecraft:overworld";

/** @param {unknown} v @param {number} min @param {number} max @param {number} padrao */
function num(v, min, max, padrao) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : padrao;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** @param {unknown} v @returns {Ponto | null} */
function ponto(v) {
  const p = /** @type {any} */ (v);
  return p && typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number" ? { x: p.x, y: p.y, z: p.z } : null;
}

/** @param {unknown} v @returns {Caixa | null} */
function caixaDe(v) {
  const c = /** @type {any} */ (v);
  return c && ["x1", "y1", "z1", "x2", "y2", "z2"].every((k) => typeof c[k] === "number") ? { x1: c.x1, y1: c.y1, z1: c.z1, x2: c.x2, y2: c.y2, z2: c.z2 } : null;
}

/** @param {unknown} v @returns {Backup | null} */
function backupDe(v) {
  const b = /** @type {any} */ (v);
  const caixa = caixaDe(b?.caixa);
  return b && typeof b.prefixo === "string" && /^[a-z0-9_]{1,24}$/.test(b.prefixo) && caixa && typeof b.tile === "number" && typeof b.n === "number"
    ? { prefixo: b.prefixo, caixa, tile: b.tile === 32 ? 32 : 64, n: b.n, falhas: typeof b.falhas === "number" ? b.falhas : 0 }
    : null;
}

/** Registro da obra (normalizado: nada vindo do mundo é confiado). @returns {Registro} */
export function registro() {
  const l = /** @type {any} */ (lerMundo(CHAVE, null)) ?? {};
  const m = l.montanha ?? {}, d = l.masmorra ?? {}, bk = l.backups ?? {};
  const c = l.centro;
  const centro = c && typeof c.x === "number" && typeof c.z === "number" && typeof c.y === "number" ? { x: c.x, z: c.z, y: c.y, d: typeof c.d === "string" ? c.d : DIMENSAO_PADRAO } : null;
  const topo = ponto(m.pontos?.topo);
  /** @type {EntradasAntigas} */
  const entradas = {};
  /** @type {Registro["masmorra"]["rampasAntigas"]} */
  const rampasAntigas = [];
  for (const [lado, e] of Object.entries(d.entradas ?? {})) {
    const ee = /** @type {any} */ (e);
    const porta = ponto(ee?.porta);
    if (!porta) continue;
    const zona = caixaDe(ee?.zona);
    if (zona) entradas[lado] = { porta, zona };
    else rampasAntigas.push({ porta, superficie: ponto(ee?.superficie) });
  }
  const salaM = m.sala;
  const portais = (Array.isArray(salaM?.portais) ? salaM.portais : [])
    .map((/** @type {any} */ q) => ({ lado: typeof q?.lado === "string" ? q.lado.slice(0, 12) : "", zona: caixaDe(q?.zona), chegada: ponto(q?.chegada) }))
    .filter((/** @type {any} */ q) => q.lado && q.zona && q.chegada);
  const sala = salaM && ponto(salaM.entrada) && ponto(salaM.fachada) && portais.length ? { entrada: /** @type {Ponto} */ (ponto(salaM.entrada)), fachada: /** @type {Ponto} */ (ponto(salaM.fachada)), portais } : null;
  return {
    centro,
    montanha: {
      raio: num(m.raio, LIMITES.raio[0], LIMITES.raio[1], PADRAO_MONTANHA.raio),
      altura: num(m.altura, LIMITES.altura[0], LIMITES.altura[1], PADRAO_MONTANHA.altura),
      semente: typeof m.semente === "number" ? m.semente | 0 : PADRAO_MONTANHA.semente,
      floresta: m.floresta !== false,
      lago: m.lago !== false,
      trilha: m.trilha !== false,
      densidade: num(m.densidade, LIMITES.densidade[0], LIMITES.densidade[1], PADRAO_MONTANHA.densidade),
      feita: m.feita === true && topo !== null,
      pontos: topo ? { topo, base: ponto(m.pontos?.base), lago: ponto(m.pontos?.lago), nascente: ponto(m.pontos?.nascente) } : null,
      sala,
    },
    masmorra: {
      yPiso: typeof d.yPiso === "number" ? Math.round(d.yPiso) : PADRAO_MASMORRA.yPiso,
      decoracao: d.decoracao !== false,
      feita: d.feita === true && Array.isArray(d.salas),
      x0: typeof d.x0 === "number" ? d.x0 : 0,
      z0: typeof d.z0 === "number" ? d.z0 : 0,
      salas: (Array.isArray(d.salas) ? d.salas : [])
        .filter((/** @type {any} */ s) => s && typeof s.id === "number" && typeof s.nome === "string" && ponto(s))
        .map((/** @type {any} */ s) => ({ id: s.id, nome: s.nome.slice(0, 60), x: s.x, y: s.y, z: s.z })),
      entradas,
      rampasAntigas,
    },
    backups: { montanha: backupDe(bk.montanha), masmorra: backupDe(bk.masmorra), sala: backupDe(bk.sala) },
  };
}

/** @param {Registro} r */
function salvar(r) {
  salvarMundo(CHAVE, r);
}

/** @param {(r: Registro) => void} fn */
function editar(fn) {
  const r = registro();
  fn(r);
  salvar(r);
}

// ---------------------------------------------------------------- portais (as zonas que teleportam)

/** Portais ativos: o grande portal da Sala dos Portais para o andar 1 (e a volta), mais os portais internos entre os andares. @returns {import("./obras_viagem.js").Portal[]} */
export function portaisAtivos() {
  const r = registro();
  const d = r.centro?.d ?? DIMENSAO_PADRAO;
  definirDimensao(d);
  /** @type {import("./obras_viagem.js").Portal[]} */
  const lista = [];
  const sala = r.montanha.sala;
  const a1 = andarGravado(1);
  if (sala && a1) {
    const pt = sala.portais[0];
    const volta = a1.portais.find((q) => q.nome === "volta");
    lista.push({ id: "desce:0", nome: textos.NOME_MASMORRA(1), d, zona: pt.zona, destino: a1.chegada });
    if (volta) lista.push({ id: "sobe:0", nome: textos.NOME_SALA, d, zona: volta.zona, destino: pt.chegada });
  } else if (sala) {
    // obra antiga (masmorra de 26 salas): enquanto não for refeita, os portais antigos continuam valendo
    for (const pt of sala.portais) {
      const e = r.masmorra.entradas[pt.lado];
      if (!e) continue;
      lista.push({ id: `desce:${pt.lado}`, nome: textos.NOME_MASMORRA(1), d, zona: pt.zona, destino: e.porta });
      lista.push({ id: `sobe:${pt.lado}`, nome: textos.NOME_SALA, d, zona: e.zona, destino: pt.chegada });
    }
  }
  return [...lista, ...portaisDosAndares()];
}
ligarViagens(portaisAtivos);

// ---------------------------------------------------------------- execução em ticks

/**
 * @typedef {object} Trabalho
 * @property {string} nome
 * @property {Generator<any, any, any>} gen
 * @property {Dimension} dim
 * @property {string} jogador  id de quem pediu
 * @property {number} inicio  ms
 * @property {{ f: number, t: string }} progresso
 * @property {"rodando" | "esperando"} estado
 * @property {{ x1: number, z1: number, x2: number, z2: number } | null} area
 * @property {number} limite  tick máximo da espera por carga
 * @property {boolean} cancelar
 * @property {number} puladas  quantas áreas não carregaram a tempo
 * @property {boolean} tentouCirculo  já tentou a área de carga em círculo
 * @property {boolean} comAreaAtiva
 * @property {number} ultimoAviso  tick do último aviso na barra
 * @property {PincelMundo} pincel
 * @property {(valor: any) => void} aoTerminar
 */

/** @type {Trabalho | null} */
let trabalho = null;

export function trabalhoAtual() {
  return trabalho ? { nome: trabalho.nome, pct: Math.floor(trabalho.progresso.f * 100), etapa: trabalho.progresso.t, seg: Math.floor((Date.now() - trabalho.inicio) / 1000) } : null;
}

/** @param {Dimension} dim @param {{ x1: number, z1: number, x2: number, z2: number }} a */
function carregada(dim, a) {
  try {
    for (let x = a.x1; ; x = Math.min(x + 16, a.x2)) {
      for (let z = a.z1; ; z = Math.min(z + 16, a.z2)) {
        if (!dim.isChunkLoaded({ x, y: 64, z }) && dim.getBlock({ x, y: 64, z }) === undefined) return false;
        if (z >= a.z2) break;
      }
      if (x >= a.x2) break;
    }
    return true;
  } catch {
    return false;
  }
}

/** @param {Dimension} dim */
function tirarAreaAtiva(dim) {
  try {
    dim.runCommand(`tickingarea remove ${NOME_AREA}`);
  } catch {
    // não existia
  }
}

/**
 * Começa uma obra. Só uma por vez.
 * @param {Player} jogador
 * @param {string} nome
 * @param {Dimension} dim
 * @param {(pincel: PincelMundo, progresso: (f: number, t: string) => void) => Generator<any, any, any>} fabricar
 * @param {(valor: any) => void} aoTerminar
 * @returns {boolean}
 */
export function iniciarObra(jogador, nome, dim, fabricar, aoTerminar) {
  if (trabalho) {
    erro(jogador, textos.OCUPADO);
    return false;
  }
  const pincel = new PincelMundo(dim);
  /** @type {Trabalho} */
  const t = {
    nome, dim, pincel, aoTerminar,
    gen: /** @type {any} */ (null),
    jogador: jogador.id, inicio: Date.now(), progresso: { f: 0, t: "Começando" }, estado: "rodando", area: null,
    limite: 0, cancelar: false, puladas: 0, tentouCirculo: false, comAreaAtiva: false, ultimoAviso: -999,
  };
  t.gen = fabricar(pincel, (f, txt) => {
    t.progresso = { f: Math.max(0, Math.min(1, f)), t: txt };
  });
  trabalho = t;
  msg(jogador, textos.COMECOU(nome));
  return true;
}

export function cancelarObra() {
  if (trabalho) trabalho.cancelar = true;
}

/** @param {Trabalho} t @param {string} [erroTexto] */
function terminar(t, erroTexto) {
  if (t.comAreaAtiva) tirarAreaAtiva(t.dim);
  trabalho = null;
  atualizarPortais();
  const quem = world.getAllPlayers().find((p) => p.id === t.jogador);
  const seg = Math.round((Date.now() - t.inicio) / 1000);
  if (erroTexto) {
    if (quem) erro(quem, textos.FALHOU(t.nome, erroTexto));
    console.warn(`[Vulpus][Obras] ${t.nome} parou: ${erroTexto}`);
    return;
  }
  if (t.cancelar) {
    if (quem) msg(quem, textos.CANCELADO(t.nome));
    return;
  }
  const incompleta = t.puladas > 0 || t.pincel.semChao > 50;
  if (incompleta) {
    if (quem) erro(quem, textos.INCOMPLETA(t.nome, t.puladas, t.pincel.semChao));
  } else if (quem) ok(quem, textos.TERMINOU(t.nome, seg, t.pincel.falhas, t.pincel.primeiraFalha));
  console.warn(`[Vulpus][Obras] ${t.nome} pronta em ${seg}s, ${t.pincel.ops} operações, ${t.pincel.falhas} falha(s), ${t.puladas} área(s) puladas, ${t.pincel.semChao} coluna(s) sem terreno${t.pincel.primeiraFalha ? ` (${t.pincel.primeiraFalha})` : ""}`);
}

/** Um passo do orçamento do tick. @param {Trabalho} t */
function passo(t) {
  if (t.cancelar) {
    try {
      t.gen.return(undefined);
    } catch {
      // gerador já terminado
    }
    terminar(t);
    return;
  }
  const agora = system.currentTick;
  if (t.estado === "esperando" && t.area) {
    if (carregada(t.dim, t.area)) t.estado = "rodando";
    else if (agora >= t.limite) {
      t.puladas++;
      t.estado = "rodando";
    } else {
      t.progresso = { f: t.progresso.f, t: textos.ESPERANDO_CARGA };
      // se o jogo não carregou pela área retangular, tenta uma área em círculo no mesmo lugar
      if (!t.tentouCirculo && agora >= t.limite - ESPERA_AREA + 80) {
        t.tentouCirculo = true;
        const a = t.area;
        const cx = Math.round((a.x1 + a.x2) / 2), cz = Math.round((a.z1 + a.z2) / 2);
        const raio = Math.min(4, Math.max(1, Math.ceil(Math.hypot(a.x2 - a.x1, a.z2 - a.z1) / 32)));
        try {
          t.dim.runCommand(`tickingarea remove ${NOME_AREA}`);
        } catch {
          // não existia
        }
        try {
          t.dim.runCommand(`tickingarea add circle ${cx} 64 ${cz} ${raio} ${NOME_AREA} true`);
          t.comAreaAtiva = true;
        } catch (e) {
          registrarErro("Obras: área de carga em círculo", e);
        }
      }
      return;
    }
  }
  const t0 = Date.now();
  while (Date.now() - t0 < ORCAMENTO_MS) {
    const r = t.gen.next();
    if (r.done) {
      try {
        t.aoTerminar(r.value);
      } catch (e) {
        registrarErro("Obras: registrar resultado", e);
      }
      terminar(t);
      return;
    }
    const v = r.value;
    if (v && typeof v === "object" && v.area) {
      if (carregada(t.dim, v.area)) continue;
      // a área não está carregada: pede uma área de carga (uma por vez) e espera
      t.area = v.area;
      try {
        if (t.comAreaAtiva) tirarAreaAtiva(t.dim);
        const res = t.dim.runCommand(`tickingarea add ${v.area.x1} 64 ${v.area.z1} ${v.area.x2} 64 ${v.area.z2} ${NOME_AREA} true`);
        t.comAreaAtiva = true;
        if (res.successCount === 0) console.warn(`[Vulpus][Obras] o jogo recusou a área de carga ${JSON.stringify(v.area)}`);
        t.tentouCirculo = false;
      } catch (e) {
        registrarErro("Obras: área de carga", e);
      }
      t.estado = "esperando";
      t.limite = agora + ESPERA_AREA;
      break;
    }
  }
}

system.runInterval(() => {
  const t = trabalho;
  if (!t) return;
  try {
    passo(t);
    if (trabalho === t && system.currentTick - t.ultimoAviso >= 40) {
      t.ultimoAviso = system.currentTick;
      const quem = world.getAllPlayers().find((p) => p.id === t.jogador);
      if (quem) quem.onScreenDisplay.setActionBar(textos.BARRA(t.nome, Math.floor(t.progresso.f * 100), t.progresso.t));
    }
  } catch (e) {
    registrarErro("Obras: execução", e);
    terminar(t, e instanceof Error ? e.message : String(e));
  }
}, 1);

// ---------------------------------------------------------------- ações

/** @param {Player} p */
function exigirStaff(p) {
  if (ehStaff(p)) return true;
  erro(p, SO_STAFF);
  return false;
}

/** @param {Player} p */
function exigirDono(p) {
  if (ehDono(p)) return true;
  erro(p, textos.SO_DONO);
  return false;
}

/**
 * Marca o centro da obra onde a pessoa está (o chão de referência é o bloco sólido sob ela).
 * @param {Player} p
 */
export function marcarCentro(p) {
  if (!exigirStaff(p)) return;
  const x = Math.floor(p.location.x), z = Math.floor(p.location.z);
  const sup = new PincelMundo(p.dimension).superficie(x, z);
  if (!sup) {
    erro(p, textos.SEM_CHAO);
    return;
  }
  editar((r) => {
    r.centro = { x, z, y: sup.y, d: p.dimension.id };
  });
  ok(p, textos.CENTRO_OK(x, z, sup.y));
}

/** Semente: o que a pessoa digitou, ou uma sorteada. @param {string} texto */
function sementeDe(texto) {
  const n = Number(String(texto).replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n | 0 : Math.floor(Math.random() * 2000000000) + 1;
}

/** @param {Player} p */
async function medidasMontanha(p) {
  if (!exigirDono(p)) return;
  const r = registro().montanha;
  const v = await perguntar(p, textos.TITULO_MONTANHA, [
    { tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao: r.raio, min: LIMITES.raio[0], max: LIMITES.raio[1] },
    { tipo: "numero", rotulo: textos.ROTULO_ALTURA, padrao: r.altura, min: LIMITES.altura[0], max: LIMITES.altura[1] },
    { tipo: "texto", rotulo: textos.ROTULO_SEMENTE, dica: "0", padrao: String(r.semente) },
    { tipo: "alternar", rotulo: textos.ROTULO_FLORESTA, padrao: r.floresta },
    { tipo: "numero", rotulo: textos.ROTULO_DENSIDADE, padrao: r.densidade, min: LIMITES.densidade[0], max: LIMITES.densidade[1] },
    { tipo: "alternar", rotulo: textos.ROTULO_LAGO, padrao: r.lago },
    { tipo: "alternar", rotulo: textos.ROTULO_TRILHA, padrao: r.trilha },
  ]);
  if (!v || !ehDono(p)) return;
  editar((reg) => {
    reg.montanha.raio = v[0];
    reg.montanha.altura = v[1];
    reg.montanha.semente = sementeDe(v[2]);
    reg.montanha.floresta = v[3];
    reg.montanha.densidade = v[4];
    reg.montanha.lago = v[5];
    reg.montanha.trilha = v[6];
  });
  ok(p, textos.MEDIDAS_OK);
}

/** @param {Player} p */
async function medidasMasmorra(p) {
  if (!exigirDono(p)) return;
  const r = registro().masmorra;
  const v = await perguntar(p, textos.TITULO_MASMORRA, [
    { tipo: "numero", rotulo: textos.ROTULO_PISO, padrao: r.yPiso, min: LIMITES.yPiso[0], max: LIMITES.yPiso[1] },
    { tipo: "alternar", rotulo: textos.ROTULO_DECORACAO, padrao: r.decoracao },
  ]);
  if (!v || !ehDono(p)) return;
  editar((reg) => {
    reg.masmorra.yPiso = v[0];
    reg.masmorra.decoracao = v[1];
  });
  ok(p, textos.MEDIDAS_OK);
}

/** Spawn do mundo (marcado pela staff ou o padrão) no mesmo mundo da obra, ou undefined. @param {string} d */
function rumoSpawn(d) {
  const salvo = /** @type {any} */ (lerMundo(CHAVE_SPAWN));
  if (salvo && salvo.d === d && Number.isFinite(salvo.x) && Number.isFinite(salvo.z)) return { x: salvo.x, z: salvo.z };
  try {
    const { x, z } = world.getDefaultSpawnLocation();
    return d === DIMENSAO_PADRAO && Number.isFinite(x) && Number.isFinite(z) ? { x, z } : undefined;
  } catch {
    return undefined;
  }
}

/** @param {Registro} r */
function opcoesMontanha(r) {
  const c = /** @type {NonNullable<Registro["centro"]>} */ (r.centro);
  return { rumo: rumoSpawn(c.d), cx: c.x, cz: c.z, baseY: c.y, raio: r.montanha.raio, altura: r.montanha.altura, semente: r.montanha.semente, floresta: r.montanha.floresta, lago: r.montanha.lago, trilha: r.montanha.trilha, densidade: r.montanha.densidade };
}

/** @param {Registro} r */
function opcoesMasmorra(r) {
  const c = /** @type {NonNullable<Registro["centro"]>} */ (r.centro);
  return { x0: c.x - 75, z0: c.z - 75, yPiso: r.masmorra.yPiso, decoracao: r.masmorra.decoracao, semente: r.montanha.semente, dim: c.d };
}

/** Caixa da cópia de segurança de cada obra. @param {Registro} r @returns {{ montanha: Caixa, masmorra: Caixa }} */
export function caixasDeBackup(r) {
  const c = /** @type {NonNullable<Registro["centro"]>} */ (r.centro);
  const meio = r.montanha.raio + Math.round(r.montanha.raio * 0.5) + 12;
  return {
    montanha: { x1: c.x - meio, y1: Math.max(-64, c.y - 8), z1: c.z - meio, x2: c.x + meio, y2: Math.min(319, c.y + r.montanha.altura + 36), z2: c.z + meio },
    masmorra: { x1: c.x - 75 - 3, y1: Math.max(-64, r.masmorra.yPiso + K_MIN), z1: c.z - 75 - 3, x2: c.x - 75 + LARGURA + 3, y2: Math.min(319, r.masmorra.yPiso + K_MAX + 1), z2: c.z - 75 + PROFUNDIDADE + 3 },
  };
}

/** Roda etapas em sequência, repartindo o progresso pelo peso. @param {{ peso: number, run: (prog: (f: number, t: string) => void, pincel: PincelMundo) => Generator<any, any, any> }[]} etapas @param {(f: number, t: string) => void} prog @param {PincelMundo} pincel */
function* rodarEtapas(etapas, prog, pincel) {
  const total = etapas.reduce((s, e) => s + e.peso, 0);
  let acc = 0;
  for (const e of etapas) {
    const a = acc / total, b = (acc + e.peso) / total;
    yield* e.run((f, t) => prog(a + f * (b - a), t), pincel);
    acc += e.peso;
  }
}

/**
 * Pergunta e começa a gerar. quem: "montanha", "masmorra" ou "tudo". Se a obra já existe com backup, o terreno original volta primeiro.
 * @param {Player} p
 * @param {"montanha" | "masmorra" | "tudo"} quem
 */
export async function gerar(p, quem) {
  if (!exigirDono(p)) return;
  const r = registro();
  if (!r.centro) {
    erro(p, textos.SEM_CENTRO);
    return;
  }
  if (trabalho) {
    erro(p, textos.OCUPADO);
    return;
  }
  const c = r.centro;
  if (quem !== "montanha" && r.masmorra.yPiso + K_MAX + 6 > c.y) {
    erro(p, textos.PISO_ALTO(c.y));
    return;
  }
  if (quem !== "masmorra" && r.montanha.feita && !r.backups.montanha) {
    erro(p, textos.TEM_SEM_BACKUP("montanha"));
    return;
  }
  if (quem !== "montanha" && r.masmorra.feita && !r.backups.masmorra) {
    erro(p, textos.TEM_SEM_BACKUP("masmorra"));
    return;
  }
  const dim = world.getDimension(c.d);
  const nome = quem === "montanha" ? "montanha" : quem === "masmorra" ? "masmorra" : "montanha e masmorra";
  const resumo = [
    ...(quem !== "masmorra" ? [textos.RESUMO_MONTANHA(r.montanha.raio, r.montanha.altura, c.x, c.z)] : []),
    ...(quem !== "montanha" ? [textos.RESUMO_MASMORRA(r.masmorra.yPiso, c.x, c.z)] : []),
  ].join("\n");
  if (!(await confirmar(p, { titulo: textos.CONFIRMAR_TITULO(nome), texto: textos.CONFIRMAR_TEXTO(resumo) }))) return;
  if (!ehDono(p) || trabalho) return;
  const om = opcoesMontanha(r), od = opcoesMasmorra(r);
  const caixas = caixasDeBackup(r);
  /** @type {Parameters<typeof rodarEtapas>[0]} */
  const etapas = [];
  if (quem !== "masmorra") {
    const antigo = r.backups.montanha;
    if (antigo) etapas.push({ peso: 1, run: function* (prog, pincel) {
      yield* restaurarBackup(dim, antigo, prog);
      editar((x) => {
        x.backups.montanha = null;
        x.montanha.feita = false;
      });
    } });
    etapas.push({ peso: 1, run: function* (prog, pincel) {
      const bk = yield* salvarBackup(dim, "montanha", caixas.montanha, prog);
      editar((x) => {
        x.backups.montanha = bk;
      });
    } });
    etapas.push({ peso: 8, run: function* (prog, pincel) {
      const res = yield* gerarMontanha(pincel, om, prog);
      guardarMontanha(res);
    } });
  }
  if (quem !== "montanha") {
    const antigo = r.backups.masmorra;
    if (antigo) etapas.push({ peso: 1, run: function* (prog, pincel) {
      yield* restaurarBackup(dim, antigo, prog);
      editar((x) => {
        x.backups.masmorra = null;
        x.masmorra.feita = false;
      });
    } });
    etapas.push({ peso: 1, run: function* (prog, pincel) {
      const bk = yield* salvarBackup(dim, "masmorra", caixas.masmorra, prog);
      editar((x) => {
        x.backups.masmorra = bk;
      });
    } });
    etapas.push({ peso: 8, run: function* (prog, pincel) {
      const res = yield* gerarAndares(pincel, od, prog);
      guardarMasmorra(res, od);
    } });
  }
  const comecou = iniciarObra(p, nome, dim, (pincel, progresso) => rodarEtapas(etapas, progresso, pincel), () => {
    registrarLogDono(p.name, `obras: gerar ${nome}`, `${c.x}, ${c.z}`, true);
    if (quem !== "masmorra" && !registro().montanha.sala && p.isValid) erro(p, textos.SEM_SALA);
  });
  if (comecou) registrarLogDono(p.name, `obras: iniciar ${nome}`, `${c.x}, ${c.z}`, true);
}

/** @param {ResultadoMontanha} res */
function guardarMontanha(res) {
  editar((r) => {
    r.montanha.feita = true;
    r.montanha.pontos = { topo: res.topo, base: res.base, lago: res.lago, nascente: res.nascente };
    r.montanha.sala = res.sala;
  });
}

/** @param {ResultadoAndar[]} res @param {ReturnType<typeof opcoesMasmorra>} o */
function guardarMasmorra(res, o) {
  const pos = posicoes(o.x0, o.z0);
  editar((r) => {
    r.masmorra.feita = true;
    r.masmorra.yPiso = o.yPiso;
    r.masmorra.x0 = o.x0;
    r.masmorra.z0 = o.z0;
    r.masmorra.salas = res.flatMap((a) => a.salas.map((s) => ({ id: a.andar * 100 + s.id, nome: `Andar ${a.andar} · ${s.papel}`, x: Math.round(s.centro.x), y: s.y, z: Math.round(s.centro.z) })));
    r.masmorra.entradas = {};
    r.masmorra.rampasAntigas = [];
  });
  void pos;
  definirDimensao(o.dim);
  iniciarAndares();
}

/**
 * Desfaz a montanha e/ou a masmorra: devolve o terreno original pela cópia de segurança; sem cópia, nivela.
 * @param {Player} p
 * @param {"montanha" | "masmorra" | "tudo"} quem
 */
export async function desfazer(p, quem) {
  if (!exigirDono(p)) return;
  const r = registro();
  if (!r.centro) {
    erro(p, textos.SEM_CENTRO);
    return;
  }
  if (trabalho) {
    erro(p, textos.OCUPADO);
    return;
  }
  const c = r.centro;
  const querMontanha = quem !== "masmorra" && (r.montanha.feita || r.backups.montanha);
  const querMasmorra = quem !== "montanha" && (r.masmorra.feita || r.backups.masmorra);
  if (!querMontanha && !querMasmorra) {
    erro(p, textos.NADA_A_DESFAZER);
    return;
  }
  const dim = world.getDimension(c.d);
  const modo = (/** @type {Backup | null} */ b) => (b ? textos.MODO_BACKUP : textos.MODO_NIVELAR);
  const resumo = [
    ...(querMontanha ? [textos.RESUMO_DESFAZER("montanha", modo(r.backups.montanha))] : []),
    ...(querMasmorra ? [textos.RESUMO_DESFAZER("masmorra", modo(r.backups.masmorra))] : []),
  ].join("\n");
  if (!(await confirmar(p, { titulo: textos.CONFIRMAR_DESFAZER, texto: textos.CONFIRMAR_DESFAZER_TEXTO(resumo) }))) return;
  if (!ehDono(p) || trabalho) return;
  const caixas = caixasDeBackup(r);
  void caixas;
  /** @type {Parameters<typeof rodarEtapas>[0]} */
  const etapas = [];
  if (querMasmorra) {
    etapas.push({ peso: 1, run: function* (prog, pincel) {
      const b = r.backups.masmorra;
      if (b) yield* restaurarBackup(dim, b, prog);
      else {
        yield* limparMasmorra(pincel, { x0: r.masmorra.x0, z0: r.masmorra.z0, yPiso: r.masmorra.yPiso, baseY: c.y, rampas: r.masmorra.rampasAntigas }, prog);
      }
      editar((x) => {
        x.backups.masmorra = null;
        x.masmorra.feita = false;
        x.masmorra.salas = [];
        x.masmorra.entradas = {};
        x.masmorra.rampasAntigas = [];
      });
      esquecerAndares();
      iniciarAndares();
    } });
  }
  if (querMontanha) {
    etapas.push({ peso: 1, run: function* (prog, pincel) {
      const b = r.backups.montanha;
      if (b) yield* restaurarBackup(dim, b, prog);
      else yield* limparMontanha(pincel, { cx: c.x, cz: c.z, baseY: c.y, raio: r.montanha.raio, altura: r.montanha.altura, lago: r.montanha.pontos?.lago ?? null }, prog);
      editar((x) => {
        x.backups.montanha = null;
        x.montanha.feita = false;
        x.montanha.pontos = null;
        x.montanha.sala = null;
      });
    } });
  }
  const nome = quem === "tudo" ? "desfazer tudo" : `desfazer ${quem}`;
  const comecou = iniciarObra(p, nome, dim, (pincel, progresso) => rodarEtapas(etapas, progresso, pincel), () => {
    registrarLogDono(p.name, `obras: ${nome}`, `${c.x}, ${c.z}`, true);
  });
  if (comecou) registrarLogDono(p.name, `obras: iniciar ${nome}`, `${c.x}, ${c.z}`, true);
}

// ---------------------------------------------------------------- teleportes

/**
 * Destinos de teleporte da obra, em grupos.
 * @param {Registro} r
 * @returns {{ titulo: string, itens: { nome: string, local: { x: number, y: number, z: number, d: string } }[] }[]}
 */
export function destinos(r) {
  const d = r.centro?.d ?? DIMENSAO_PADRAO;
  /** @param {Ponto} p @param {number} [dy] */
  const L = (p, dy = 0) => ({ x: p.x, y: p.y + dy, z: p.z, d });
  /** @type {{ titulo: string, itens: { nome: string, local: { x: number, y: number, z: number, d: string } }[] }[]} */
  const grupos = [];
  const sup = [];
  if (r.centro) sup.push({ nome: textos.TP_CENTRO, local: { x: r.centro.x + 0.5, y: r.centro.y + 1, z: r.centro.z + 0.5, d } });
  if (r.montanha.pontos) {
    sup.push({ nome: textos.TP_TOPO, local: L(r.montanha.pontos.topo) });
    if (r.montanha.pontos.base) sup.push({ nome: textos.TP_TRILHA, local: L(r.montanha.pontos.base) });
    if (r.montanha.pontos.lago) sup.push({ nome: textos.TP_LAGO, local: L(r.montanha.pontos.lago) });
    if (r.montanha.pontos.nascente) sup.push({ nome: textos.TP_NASCENTE, local: L(r.montanha.pontos.nascente) });
  }
  if (r.montanha.sala) {
    sup.push({ nome: textos.TP_FACHADA, local: L(r.montanha.sala.fachada) });
    sup.push({ nome: textos.TP_SALA_PORTAIS, local: L(r.montanha.sala.entrada) });
  }
  if (sup.length) grupos.push({ titulo: textos.TP_SUPERFICIE, itens: sup });
  for (let n = 1; n <= 5; n++) {
    const a = andarGravado(n);
    if (!a) continue;
    const itens = [{ nome: textos.TP_ANDAR_CHEGADA(n), local: { x: a.chegada.x, y: a.chegada.y, z: a.chegada.z, d } }];
    if (a.arena) itens.push({ nome: textos.TP_ANDAR_BOSS(n), local: { x: a.arena.x, y: a.arena.y, z: a.arena.z, d } });
    for (const s of a.salas) itens.push({ nome: textos.TP_SALA(s.id, `${s.papel}`), local: { x: s.centro.x, y: s.centro.y, z: s.centro.z, d } });
    grupos.push({ titulo: textos.TP_ANDAR(n), itens });
  }
  return grupos;
}

/** @param {Player} p @param {{ nome: string, local: { x: number, y: number, z: number, d: string } }} item */
export function irPara(p, item) {
  if (!exigirStaff(p)) return;
  if (p.dimension.id !== item.local.d) {
    erro(p, textos.TP_DIM);
    return;
  }
  teleportar(p, item.local, { nome: textos.TP_OK(item.nome), semEspera: true, tema: "rtp" });
}

// ---------------------------------------------------------------- ver a área

/** @param {Player} p */
export function verLimites(p) {
  const r = registro();
  if (!r.centro) {
    erro(p, textos.SEM_CENTRO);
    return;
  }
  const c = r.centro;
  const dim = world.getDimension(c.d);
  const R = r.montanha.raio;
  let tick = 0;
  const id = system.runInterval(() => {
    tick++;
    try {
      const fase = tick % 4;
      for (let i = fase; i < 180; i += 4) {
        const a = (i / 180) * Math.PI * 2;
        emitir(dim, "minecraft:endrod", { x: c.x + 0.5 + Math.cos(a) * R, y: c.y + 2, z: c.z + 0.5 + Math.sin(a) * R });
      }
      for (let i = fase; i < 150; i += 4) {
        for (const [x, z] of [[c.x - 75 + i, c.z - 75], [c.x - 75 + i, c.z + 74], [c.x - 75, c.z - 75 + i], [c.x + 74, c.z - 75 + i]]) {
          emitir(dim, "minecraft:basic_flame_particle", { x: x + 0.5, y: c.y + 1.5, z: z + 0.5 });
        }
      }
      // a masmorra (5 andares) lá embaixo: a mesma faixa de Z, andares lado a lado
      for (const a of posicoes(c.x - 75, c.z - 75)) {
        for (let i = fase; i < a.N; i += 6) emitir(dim, "minecraft:basic_flame_particle", { x: a.x0 + i + 0.5, y: c.y + 1.5, z: a.z0 + 0.5 });
      }
    } catch (e) {
      registrarErro("Obras: limites", e);
    }
    if (tick > 60) system.clearRun(id);
  }, 5);
  ok(p, textos.VER_LIMITES_OK);
}

// ---------------------------------------------------------------- Sala dos Portais por cantos

/** @type {Map<string, { c1?: { x: number, y: number, z: number, d: string }, c2?: { x: number, y: number, z: number, d: string } }>} */
const cantos = new Map();

/**
 * @param {Player} p
 * @param {number} n
 */
function marcarCanto(p, n) {
  if (!exigirDono(p)) return;
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = p.getBlockFromViewDirection({ maxDistance: 20 })?.block;
  } catch {
    b = undefined;
  }
  const pos = b ? { x: b.x, y: b.y, z: b.z } : { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
  const e = cantos.get(p.id) ?? {};
  e[n === 1 ? "c1" : "c2"] = { ...pos, d: p.dimension.id };
  cantos.set(p.id, e);
  ok(p, textos.CANTO_OK(n, `${pos.x}, ${pos.y}, ${pos.z}`));
}

/** A caixa dos dois cantos, ou undefined. @param {string} id */
function caixaDosCantos(id) {
  const e = cantos.get(id);
  if (!e?.c1 || !e.c2 || e.c1.d !== e.c2.d) return undefined;
  return {
    d: e.c1.d,
    caixa: { x1: Math.min(e.c1.x, e.c2.x), y1: Math.min(e.c1.y, e.c2.y), z1: Math.min(e.c1.z, e.c2.z), x2: Math.max(e.c1.x, e.c2.x), y2: Math.max(e.c1.y, e.c2.y), z2: Math.max(e.c1.z, e.c2.z) },
  };
}

/** @param {Player} p */
function mostrarCaixa(p) {
  const k = caixaDosCantos(p.id);
  if (!k) {
    erro(p, textos.FALTAM_CANTOS);
    return;
  }
  const { caixa: c } = k;
  const dim = world.getDimension(k.d);
  let vezes = 0;
  const run = system.runInterval(() => {
    try {
      if (++vezes > 12 || !p.isValid) {
        system.clearRun(run);
        return;
      }
      for (const x of [c.x1, c.x2 + 1]) for (const y of [c.y1, c.y2 + 1]) for (let z = c.z1; z <= c.z2 + 1; z += 2) emitir(dim, "minecraft:endrod", { x, y, z });
      for (const z of [c.z1, c.z2 + 1]) for (const y of [c.y1, c.y2 + 1]) for (let x = c.x1; x <= c.x2 + 1; x += 2) emitir(dim, "minecraft:endrod", { x, y, z });
      for (const x of [c.x1, c.x2 + 1]) for (const z of [c.z1, c.z2 + 1]) for (let y = c.y1; y <= c.y2 + 1; y += 2) emitir(dim, "minecraft:endrod", { x, y, z });
    } catch (e) {
      system.clearRun(run);
      registrarErro("Obras: caixa da sala", e);
    }
  }, 10);
}

/** @param {Player} p */
async function construirSala(p) {
  if (!exigirDono(p)) return;
  const k = caixaDosCantos(p.id);
  if (!k) {
    erro(p, textos.FALTAM_CANTOS);
    return;
  }
  const r = registro();
  if (k.d !== (r.centro?.d ?? DIMENSAO_PADRAO)) {
    erro(p, textos.OUTRA_DIMENSAO);
    return;
  }
  if (trabalho) {
    erro(p, textos.OCUPADO);
    return;
  }
  const escolha = await perguntar(p, textos.TITULO_SALA, [{ tipo: "lista", rotulo: textos.ROTULO_LADO, opcoes: [...textos.LADOS], padrao: 0 }]);
  if (!escolha || !ehDono(p)) return;
  const lado = /** @type {import("./obras_sala_caixa.js").Lado} */ (["N", "S", "L", "O"][escolha[0]] ?? "N");
  const { caixa } = k;
  const problema = problemaDaCaixa(caixa, lado);
  if (problema) {
    erro(p, textos.CAIXA_RUIM(problema));
    return;
  }
  const tam = `${caixa.x2 - caixa.x1 + 1}×${caixa.y2 - caixa.y1 + 1}×${caixa.z2 - caixa.z1 + 1}`;
  if (!(await confirmar(p, { titulo: textos.TITULO_SALA, texto: textos.CONFIRMAR_SALA(tam, textos.LADOS[escolha[0]].split(" ")[0]) }))) return;
  if (!ehDono(p) || trabalho) return;
  const dim = world.getDimension(k.d);
  let s = ((r.montanha.semente ^ (caixa.x1 * 73856093) ^ (caixa.z1 * 19349663)) >>> 0) || 1;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const margem = { x1: caixa.x1 - 5, y1: Math.max(-64, caixa.y1 - 1), z1: caixa.z1 - 5, x2: caixa.x2 + 5, y2: Math.min(319, caixa.y2 + 2), z2: caixa.z2 + 5 };
  /** @type {Parameters<typeof rodarEtapas>[0]} */
  const etapas = [];
  const antigo = r.backups.sala;
  if (antigo) {
    etapas.push({ peso: 1, run: function* () {
      apagarBackup(antigo);
      editar((x) => {
        x.backups.sala = null;
      });
    } });
  }
  etapas.push({ peso: 2, run: function* (prog) {
    const bk = yield* salvarBackup(dim, "sala", margem, prog);
    editar((x) => {
      x.backups.sala = bk;
    });
  } });
  etapas.push({ peso: 5, run: function* (prog, pincel) {
    prog(0.1, "Construindo a Sala dos Portais");
    const res = yield* construirSalaNaCaixa(pincel, caixa, lado, rng);
    editar((x) => {
      x.montanha.sala = res;
    });
    atualizarPortais();
    prog(1, "Pronto");
  } });
  const comecou = iniciarObra(p, "Sala dos Portais", dim, (pincel, progresso) => rodarEtapas(etapas, progresso, pincel), () => {
    registrarLogDono(p.name, "obras: sala dos portais", `${caixa.x1}, ${caixa.y1}, ${caixa.z1}`, true);
    if (p.isValid) ok(p, textos.SALA_PRONTA);
  });
  if (comecou) registrarLogDono(p.name, "obras: iniciar sala dos portais", `${caixa.x1}, ${caixa.y1}, ${caixa.z1}`, true);
}

/** @param {Player} p */
async function desfazerSala(p) {
  if (!exigirDono(p)) return;
  const r = registro();
  const bk = r.backups.sala;
  if (!bk) {
    erro(p, textos.SEM_COPIA_SALA);
    return;
  }
  if (trabalho) {
    erro(p, textos.OCUPADO);
    return;
  }
  if (!(await confirmar(p, { titulo: textos.BOTAO_DESFAZER_SALA, texto: textos.CONFIRMAR_DESFAZER_SALA })) || !ehDono(p) || trabalho) return;
  const dim = world.getDimension(r.centro?.d ?? DIMENSAO_PADRAO);
  /** @type {Parameters<typeof rodarEtapas>[0]} */
  const etapas = [{ peso: 1, run: function* (prog) {
    yield* restaurarBackup(dim, bk, prog);
    editar((x) => {
      x.backups.sala = null;
      x.montanha.sala = null;
    });
    atualizarPortais();
  } }];
  iniciarObra(p, "desfazer a sala dos portais", dim, (pincel, progresso) => rodarEtapas(etapas, progresso, pincel), () => {
    registrarLogDono(p.name, "obras: desfazer sala dos portais", "", true);
  });
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuSala(player, voltar) {
  if (!exigirDono(player)) return;
  const aqui = () => menuSala(player, voltar);
  const e = cantos.get(player.id);
  const fmt = (/** @type {{ x: number, y: number, z: number } | undefined} */ c) => (c ? `${c.x}, ${c.y}, ${c.z}` : textos.NAO_MARCADO);
  const k = caixaDosCantos(player.id);
  const tam = k ? `${k.caixa.x2 - k.caixa.x1 + 1}×${k.caixa.y2 - k.caixa.y1 + 1}×${k.caixa.z2 - k.caixa.z1 + 1}` : "";
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textos.TITULO_SALA)
    .texto(textos.CORPO_SALA(fmt(e?.c1), fmt(e?.c2), tam, registro().backups.sala !== null))
    .botao(textos.BOTAO_CANTO1, ICONES.spawn, eVolta((p) => marcarCanto(p, 1)))
    .botao(textos.BOTAO_CANTO2, ICONES.spawn, eVolta((p) => marcarCanto(p, 2)))
    .botao(textos.BOTAO_VER_CAIXA, ICONES.buscar, eVolta((p) => mostrarCaixa(p)))
    .botao(textos.BOTAO_CONSTRUIR_SALA, ICONES.nova, eVolta((p) => construirSala(p)));
  if (registro().backups.sala) lista.botao(textos.BOTAO_DESFAZER_SALA, ICONES.apagar, eVolta((p) => desfazerSala(p)));
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- menus

/** @returns {{ centro: string, montanha: string, masmorra: string, trabalho: string }} */
function resumoEstado() {
  const r = registro();
  const t = trabalhoAtual();
  return {
    centro: r.centro ? textos.CENTRO_MARCADO(r.centro.x, r.centro.z, r.centro.y) : textos.CENTRO_NENHUM,
    montanha: r.montanha.feita ? textos.MONTANHA_FEITA(r.montanha.raio, r.montanha.altura, r.backups.montanha !== null) : textos.NAO_FEITA,
    masmorra: r.masmorra.feita ? textos.MASMORRA_FEITA(r.masmorra.yPiso, r.backups.masmorra !== null) : textos.NAO_FEITA,
    trabalho: t ? textos.BARRA(t.nome, t.pct, t.etapa) : "",
  };
}

/**
 * Aba de Obras.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuObras(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuObras(player, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textos.TITULO)
    .texto(textos.CORPO(resumoEstado()))
    .botao(textos.BOTAO_CENTRO, ICONES.spawn, eVolta((p) => marcarCentro(p)))
    .botao(textos.BOTAO_VER_LIMITES, ICONES.buscar, eVolta((p) => verLimites(p)));
  if (ehDono(player)) lista.botao(textos.BOTAO_SALA, ICONES.nova, (p) => menuSala(p, aqui));
  // Gerar, desfazer, medidas e esquecer ficam fora do menu: a montanha e a masmorra estão prontas e ninguém mexe nelas por aqui.
  lista
    .botao(textos.BOTAO_TELEPORTES, ICONES.tpa, (p) => menuTeleportes(p, aqui))
    .botao(textos.BOTAO_ANDAMENTO, ICONES.historico, (p) => menuAndamento(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuDesfazer(player, voltar) {
  if (!exigirDono(player)) return;
  const r = registro();
  const aqui = () => menuDesfazer(player, voltar);
  const lista = new Lista(textos.TITULO_DESFAZER).texto(textos.CORPO_DESFAZER(r.backups.montanha !== null, r.backups.masmorra !== null));
  for (const [quem, nome] of /** @type {const} */ ([["montanha", textos.BOTAO_DESFAZER_MONTANHA], ["masmorra", textos.BOTAO_DESFAZER_MASMORRA], ["tudo", textos.BOTAO_DESFAZER_TUDO]])) {
    lista.botao(nome, ICONES.apagar, async (p) => {
      await desfazer(p, quem);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuTeleportes(player, voltar) {
  if (!exigirStaff(player)) return;
  const grupos = destinos(registro());
  const lista = new Lista(textos.TITULO_TELEPORTES);
  if (!grupos.length) lista.texto(textos.TP_SEM_OBRA);
  for (const g of grupos) {
    lista.cabecalho(g.titulo);
    for (const item of g.itens) lista.botao(item.nome, ICONES.tpa, (p) => irPara(p, item));
  }
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuAndamento(player, voltar) {
  if (!exigirStaff(player)) return;
  const t = trabalhoAtual();
  const aqui = () => menuAndamento(player, voltar);
  const lista = new Lista(textos.TITULO).texto(t ? textos.ANDAMENTO(t.nome, t.pct, t.etapa, t.seg) : textos.ANDAMENTO_NADA);
  if (t && ehDono(player)) {
    lista.botao(textos.BOTAO_CANCELAR, ICONES.nao, async (p) => {
      if (ehDono(p) && (await confirmar(p, { titulo: textos.BOTAO_CANCELAR, texto: textos.CONFIRMAR_CANCELAR }))) cancelarObra();
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}
