// @ts-check
// Guerras entre clãs: declarar (com aviso prévio), começar, contar abates, terminar e pagar o baú de guerra.
// Também o PvP dos clãs: fogo amigo desligado entre membros. Os prazos usam Date.now() e ficam salvos no
// mundo (vulpus:cla:guerras): uma guerra continua de onde parou depois de /reload ou de reiniciar.
import { Player, system, world } from "@minecraft/server";
import { SONS } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/clas.js";
import { PREFIXO } from "../textos/geral.js";
import { claDe, claPorId, editarCla, membroDe, moverBanco, pode } from "./cla_dados.js";

/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {"a" | "b"} Lado  a = quem declarou, b = o alvo */

/**
 * @typedef {object} Guerra
 * @property {string} id
 * @property {string} a  id do clã que declarou
 * @property {string} b  id do clã alvo
 * @property {{ a: string, b: string }} tags
 * @property {{ a: string, b: string }} cores
 * @property {number} declarada  ms
 * @property {number} inicio  ms
 * @property {number} fim  ms
 * @property {"aviso" | "ativa"} estado
 * @property {boolean} lembrou  já avisou os dois clãs que falta pouco
 * @property {{ a: number, b: number }} aposta  Caudas de cada lado no baú
 * @property {{ a: number, b: number }} pontos
 * @property {Record<string, { n: number, nome: string, lado: Lado }>} abates  por jogador
 * @property {Record<string, number>} recentes  "matador|vítima" → ms do último abate que contou
 */

/**
 * @typedef {object} GuerraFim
 * @property {string} a
 * @property {string} b
 * @property {{ a: string, b: string }} tags
 * @property {{ a: number, b: number }} pontos
 * @property {Lado | null} vencedor
 * @property {"tempo" | "rendicao" | "staff" | "dissolvido"} motivo
 * @property {number} premio
 * @property {number} fim
 */

/** @typedef {{ guerras: Guerra[], historico: GuerraFim[], recargas: Record<string, number> }} EstadoGuerras */

const CHAVE = "vulpus:cla:guerras";
const HISTORICO_MAXIMO = 20;
/** O mesmo matador só pontua com a mesma vítima uma vez a cada 10 min (sem farm de abate combinado). */
const ANTI_FARM_MS = 10 * 60 * 1000;
/** Aviso aos dois clãs quando faltar isto para começar. */
const LEMBRETE_MS = 10 * 60 * 1000;
const TICKS_CICLO = 100;
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

/** @type {EstadoGuerras | undefined} */
let estado;

/** @param {unknown} v */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** @param {any} v */
const par = (v) => ({ a: num(v?.a), b: num(v?.b) });
/** @param {any} v */
const parTexto = (v) => ({ a: typeof v?.a === "string" ? v.a : "???", b: typeof v?.b === "string" ? v.b : "???" });

/**
 * Abates por jogador lidos do mundo, sem as entradas quebradas.
 * @param {any} v
 * @returns {Guerra["abates"]}
 */
function lerAbates(v) {
  /** @type {Guerra["abates"]} */
  const saida = {};
  if (!v || typeof v !== "object") return saida;
  for (const [id, a] of Object.entries(v)) {
    if (a && (a.lado === "a" || a.lado === "b")) saida[id] = { n: num(a.n), nome: typeof a.nome === "string" ? a.nome : "?", lado: a.lado };
  }
  return saida;
}

/**
 * Lê o estado das guerras (uma vez), descartando o que estiver quebrado.
 * @returns {EstadoGuerras}
 */
function lerEstado() {
  if (estado) return estado;
  const lido = lerMundo(CHAVE, {});
  const bruto = lido && typeof lido === "object" ? lido : {};
  /** @type {Guerra[]} */
  const guerras = (Array.isArray(bruto.guerras) ? bruto.guerras : [])
    .filter((g) => g && typeof g.id === "string" && typeof g.a === "string" && typeof g.b === "string" && g.a !== g.b)
    .map((g) => ({
      id: g.id,
      a: g.a,
      b: g.b,
      tags: parTexto(g.tags),
      cores: parTexto(g.cores),
      declarada: num(g.declarada),
      inicio: num(g.inicio),
      fim: num(g.fim),
      estado: g.estado === "ativa" ? "ativa" : "aviso",
      lembrou: g.lembrou === true,
      aposta: par(g.aposta),
      pontos: par(g.pontos),
      abates: lerAbates(g.abates),
      recentes: g.recentes && typeof g.recentes === "object" ? g.recentes : {},
    }));
  estado = {
    guerras,
    historico: (Array.isArray(bruto.historico) ? bruto.historico : [])
      .filter((h) => h && typeof h.a === "string" && typeof h.b === "string")
      .map((h) => ({
        a: h.a,
        b: h.b,
        tags: parTexto(h.tags),
        pontos: par(h.pontos),
        vencedor: h.vencedor === "a" || h.vencedor === "b" ? h.vencedor : null,
        motivo: ["tempo", "rendicao", "staff", "dissolvido"].includes(h.motivo) ? h.motivo : "tempo",
        premio: num(h.premio),
        fim: num(h.fim),
      }))
      .slice(0, HISTORICO_MAXIMO),
    recargas: bruto.recargas && typeof bruto.recargas === "object" ? bruto.recargas : {},
  };
  return estado;
}

/** Grava o estado; tira recargas vencidas e abates recentes velhos antes. */
function salvar() {
  const e = lerEstado();
  const agora = Date.now();
  const recarga = Math.max(0, config().recargaGuerraDias) * DIA_MS;
  for (const [chave, quando] of Object.entries(e.recargas)) if (agora - num(quando) > recarga) delete e.recargas[chave];
  for (const g of e.guerras) {
    for (const [chave, quando] of Object.entries(g.recentes)) if (agora - num(quando) > ANTI_FARM_MS) delete g.recentes[chave];
  }
  try {
    salvarMundo(CHAVE, e);
  } catch (err) {
    registrarErro("Gravar guerras", err);
  }
}

/** @param {string} a @param {string} b */
const chavePar = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Lado do clã na guerra (ou undefined se não está nela).
 * @param {Guerra} g
 * @param {string} claId
 * @returns {Lado | undefined}
 */
export function ladoDe(g, claId) {
  return g.a === claId ? "a" : g.b === claId ? "b" : undefined;
}

/** @param {Lado} lado @returns {Lado} */
const outroLado = (lado) => (lado === "a" ? "b" : "a");

/**
 * A guerra (em aviso ou ativa) de um clã, se houver: um clã só entra numa guerra por vez.
 * @param {string} claId
 * @returns {Guerra | undefined}
 */
export function guerraDe(claId) {
  return lerEstado().guerras.find((g) => g.a === claId || g.b === claId);
}

/** Todas as guerras em andamento (aviso ou ativa). @returns {Guerra[]} */
export function guerrasAtuais() {
  return [...lerEstado().guerras];
}

/**
 * Os dois clãs estão em guerra valendo agora (a proteção da base cai só entre eles).
 * @param {string} claA
 * @param {string} claB
 */
export function emGuerraAtiva(claA, claB) {
  return lerEstado().guerras.some(
    (g) => g.estado === "ativa" && ((g.a === claA && g.b === claB) || (g.a === claB && g.b === claA)),
  );
}

/**
 * Guerras que já terminaram do clã (as mais recentes primeiro).
 * @param {string} claId
 * @returns {GuerraFim[]}
 */
export function historicoDe(claId) {
  return lerEstado().historico.filter((h) => h.a === claId || h.b === claId);
}

/**
 * Ms que faltam para o par poder guerrear de novo (0 = liberado).
 * @param {string} a
 * @param {string} b
 */
export function recargaPar(a, b) {
  const fim = num(lerEstado().recargas[chavePar(a, b)]);
  const resto = fim + Math.max(0, config().recargaGuerraDias) * DIA_MS - Date.now();
  return fim && resto > 0 ? resto : 0;
}

/**
 * Por que o clã não pode declarar guerra ao alvo agora (texto pronto), ou undefined se pode.
 * @param {Cla} cla
 * @param {Cla} alvo
 * @returns {string | undefined}
 */
export function impedimentoGuerra(cla, alvo) {
  const cfg = config();
  if (alvo.id === cla.id) return textos.GUERRA_SI_MESMO;
  if (cla.aliados.includes(alvo.id)) return textos.GUERRA_ALIADO;
  if (guerraDe(cla.id)) return textos.GUERRA_JA_EM_GUERRA;
  if (guerraDe(alvo.id)) return textos.GUERRA_ALVO_OCUPADO(alvo.tag);
  const nivelMin = Math.max(1, cfg.guerraNivelMinimo);
  if (cla.nivel < nivelMin || alvo.nivel < nivelMin) return textos.GUERRA_NIVEL(nivelMin);
  const membrosMin = Math.max(1, cfg.guerraMembrosMinimos);
  if (cla.membros.length < membrosMin || alvo.membros.length < membrosMin) return textos.GUERRA_MEMBROS(membrosMin);
  const recarga = recargaPar(cla.id, alvo.id);
  if (recarga > 0) return textos.GUERRA_RECARGA(Math.ceil(recarga / 1000));
  if (cla.banco < Math.max(0, cfg.custoGuerra)) return textos.GUERRA_SEM_BANCO(Math.max(0, cfg.custoGuerra));
  return undefined;
}

/**
 * Manda uma mensagem (e um som, opcional) para quem está online nos clãs.
 * @param {string[]} claIds
 * @param {string} texto
 * @param {string} [idSom]
 */
function avisarClas(claIds, texto, idSom) {
  for (const p of online()) {
    const cla = claDe(p);
    if (!cla || !claIds.includes(cla.id)) continue;
    msg(p, texto);
    if (idSom) som(p, idSom);
  }
}

/**
 * Declara guerra (quem chama já confirmou). Cobra a aposta do banco e marca o começo depois do aviso.
 * @param {Player} player
 * @param {string} alvoId
 * @returns {boolean}
 */
export function declararGuerra(player, alvoId) {
  const cla = claDe(player);
  const alvo = claPorId(alvoId);
  if (!cla) return falhar(player, textos.SEM_CLA);
  if (!pode(cla, player.id, "guerra")) return falhar(player, textos.SEM_PERMISSAO);
  if (!alvo) return falhar(player, textos.CLA_SUMIU);
  const impedimento = impedimentoGuerra(cla, alvo);
  if (impedimento) return falhar(player, impedimento);
  const cfg = config();
  const aposta = Math.max(0, Math.floor(cfg.custoGuerra));
  if (aposta > 0 && !editarCla(cla.id, (c) => moverBanco(c, "guerra", -aposta, player.name))) return falhar(player, textos.BANCO_FALHOU);
  const agora = Date.now();
  const inicio = agora + Math.max(0, cfg.guerraAvisoMin) * 60 * 1000;
  /** @type {Guerra} */
  const guerra = {
    id: agora.toString(36),
    a: cla.id,
    b: alvo.id,
    tags: { a: cla.tag, b: alvo.tag },
    cores: { a: cla.cor, b: alvo.cor },
    declarada: agora,
    inicio,
    fim: inicio + Math.max(1, cfg.duracaoGuerraHoras) * HORA_MS,
    estado: "aviso",
    lembrou: false,
    aposta: { a: aposta, b: 0 },
    pontos: { a: 0, b: 0 },
    abates: {},
    recentes: {},
  };
  lerEstado().guerras.push(guerra);
  salvar();
  world.sendMessage(PREFIXO + textos.GUERRA_DECLARADA(guerra, Math.round((inicio - agora) / 60000)));
  avisarClas([cla.id, alvo.id], textos.GUERRA_REGRAS(aposta), SONS.pedido);
  if (inicio <= agora) iniciar(guerra);
  return true;
}

/**
 * @param {Player} player
 * @param {string} texto
 * @returns {false}
 */
function falhar(player, texto) {
  erro(player, texto);
  return false;
}

/**
 * Começa a guerra: o alvo põe a parte dele no baú (o que tiver no banco, até a aposta) e todo mundo é avisado.
 * @param {Guerra} g
 */
function iniciar(g) {
  const alvo = claPorId(g.b);
  const aposta = Math.max(0, Math.floor(config().custoGuerra));
  const parte = alvo ? Math.min(alvo.banco, aposta) : 0;
  if (parte > 0 && editarCla(g.b, (c) => moverBanco(c, "guerra", -parte, textos.AUTOR_GUERRA))) g.aposta.b = parte;
  g.estado = "ativa";
  salvar();
  world.sendMessage(PREFIXO + textos.GUERRA_COMECOU(g));
  for (const p of online()) {
    const cla = claDe(p);
    if (!cla || (cla.id !== g.a && cla.id !== g.b)) continue;
    som(p, SONS.guerra);
    mostrarTitulo(p, textos.TITULO_GUERRA, { subtitulo: textos.SUBTITULO_GUERRA(g) });
  }
}

/**
 * Termina a guerra e paga o baú: o vencedor leva tudo; no empate (ou se a staff encerrar) cada um recebe a sua parte.
 * @param {Guerra} g
 * @param {GuerraFim["motivo"]} motivo
 * @param {Lado | null} [vencedor]  sem passar, vence quem tiver mais pontos
 */
function terminar(g, motivo, vencedor) {
  const e = lerEstado();
  const i = e.guerras.indexOf(g);
  if (i < 0) return;
  e.guerras.splice(i, 1);
  const lado = vencedor !== undefined ? vencedor : g.pontos.a > g.pontos.b ? "a" : g.pontos.b > g.pontos.a ? "b" : null;
  const total = g.aposta.a + g.aposta.b;
  /** @param {Lado} quem @param {number} valor @param {import("./cla_dados.js").TipoMov} tipo */
  const pagar = (quem, valor, tipo) => {
    if (valor <= 0 || !claPorId(g[quem])) return;
    if (!editarCla(g[quem], (c) => moverBanco(c, tipo, valor, textos.AUTOR_GUERRA))) {
      registrarErro("Guerra", `não consegui pagar ${valor} Caudas ao clã ${g.tags[quem]}`);
    }
  };
  if (lado) pagar(lado, total, "premio");
  else {
    pagar("a", g.aposta.a, "devolucao");
    pagar("b", g.aposta.b, "devolucao");
  }
  e.historico.unshift({ a: g.a, b: g.b, tags: g.tags, pontos: g.pontos, vencedor: lado, motivo, premio: lado ? total : 0, fim: Date.now() });
  e.historico = e.historico.slice(0, HISTORICO_MAXIMO);
  e.recargas[chavePar(g.a, g.b)] = Date.now();
  salvar();
  world.sendMessage(PREFIXO + textos.GUERRA_TERMINOU(g, lado, motivo, lado ? total : 0));
}

/**
 * Rendição do clã de quem pediu (quem chama já confirmou): o outro lado vence e leva o baú.
 * @param {Player} player
 * @returns {boolean}
 */
export function renderSe(player) {
  const cla = claDe(player);
  if (!cla) return falhar(player, textos.SEM_CLA);
  if (!pode(cla, player.id, "guerra")) return falhar(player, textos.SEM_PERMISSAO);
  const g = guerraDe(cla.id);
  const lado = g && ladoDe(g, cla.id);
  if (!g || !lado) return falhar(player, textos.SEM_GUERRA);
  terminar(g, "rendicao", outroLado(lado));
  return true;
}

/**
 * O clã vai sumir (dissolvido ou removido pela staff): conta como rendição.
 * @param {string} claId
 */
export function encerrarGuerrasDe(claId) {
  const g = guerraDe(claId);
  const lado = g && ladoDe(g, claId);
  if (g && lado) terminar(g, "dissolvido", outroLado(lado));
}

/**
 * Staff encerra sem vencedor: cada clã recebe de volta a sua parte do baú.
 * @param {Player} staff
 * @param {string} guerraId
 * @returns {boolean}
 */
export function encerrarPelaStaff(staff, guerraId) {
  const g = lerEstado().guerras.find((x) => x.id === guerraId);
  if (!g) return falhar(staff, textos.SEM_GUERRA);
  terminar(g, "staff", null);
  ok(staff, textos.STAFF_GUERRA_ENCERRADA(g.tags.a, g.tags.b));
  return true;
}

/**
 * Staff mudou a tag de um clã: atualiza as guerras em andamento.
 * @param {string} claId
 * @param {string} tag
 */
export function trocarTagNasGuerras(claId, tag) {
  let mudou = false;
  for (const g of lerEstado().guerras) {
    const lado = ladoDe(g, claId);
    if (lado) {
      g.tags[lado] = tag;
      mudou = true;
    }
  }
  if (mudou) salvar();
}

/** Ciclo das guerras: lembrete, começo e fim pelos horários salvos. */
function ciclo() {
  const agora = Date.now();
  for (const g of [...lerEstado().guerras]) {
    if (!claPorId(g.a) || !claPorId(g.b)) {
      const sobrou = claPorId(g.a) ? "a" : claPorId(g.b) ? "b" : null;
      terminar(g, "dissolvido", sobrou);
      continue;
    }
    if (g.estado === "aviso") {
      if (!g.lembrou && g.inicio - agora <= LEMBRETE_MS && g.inicio > agora) {
        g.lembrou = true;
        salvar();
        avisarClas([g.a, g.b], textos.GUERRA_LEMBRETE(g, Math.ceil((g.inicio - agora) / 60000)));
      }
      if (agora >= g.inicio) iniciar(g);
    } else if (agora >= g.fim) terminar(g, "tempo");
  }
}

/**
 * Abate entre clãs em guerra: um ponto para o clã de quem abateu (com o anti-farm por par).
 * @param {Player} vitima
 * @param {Player} matador
 */
function contarAbate(vitima, matador) {
  const claM = claDe(matador);
  const claV = claDe(vitima);
  if (!claM || !claV || claM.id === claV.id) return;
  const g = lerEstado().guerras.find((x) => x.estado === "ativa" && ladoDe(x, claM.id) && ladoDe(x, claV.id));
  const lado = g && ladoDe(g, claM.id);
  if (!g || !lado) return;
  // Só vale entre quem já era do clã quando a guerra foi declarada: conta reserva que entra num clã
  // aberto no meio da guerra para morrer em loop não vira ponto.
  const desde = (/** @type {Cla} */ c, /** @type {Player} */ p) => membroDe(c, p.id)?.desde ?? Infinity;
  if (desde(claM, matador) > g.declarada || desde(claV, vitima) > g.declarada) {
    msg(matador, textos.ABATE_NOVATO);
    return;
  }
  const agora = Date.now();
  const chave = `${matador.id}|${vitima.id}`;
  if (agora - num(g.recentes[chave]) < ANTI_FARM_MS) {
    msg(matador, textos.ABATE_REPETIDO);
    return;
  }
  g.recentes[chave] = agora;
  g.pontos[lado]++;
  const antes = g.abates[matador.id];
  g.abates[matador.id] = { n: (antes?.n ?? 0) + 1, nome: matador.name, lado };
  salvar();
  avisarClas([g.a, g.b], textos.ABATE(g, claM.tag, matador.name, vitima.name));
}

system.runInterval(() => {
  try {
    ciclo();
  } catch (e) {
    registrarErro("Ciclo das guerras", e);
  }
}, TICKS_CICLO);

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    const matador = damageSource.damagingEntity;
    if (deadEntity instanceof Player && matador instanceof Player && matador.id !== deadEntity.id) contarAbate(deadEntity, matador);
  } catch (e) {
    registrarErro("Abate de guerra", e);
  }
});

// Fogo amigo: quem é do mesmo clã não se fere (a não ser que o clã ligue o fogo amigo). Modo restrito: só lê.
world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    const vitima = ev.hurtEntity;
    const atacante = ev.damageSource.damagingEntity;
    if (!(vitima instanceof Player) || !(atacante instanceof Player) || atacante.id === vitima.id) return;
    const cla = claDe(vitima);
    if (cla && !cla.fogoAmigo && claDe(atacante)?.id === cla.id) ev.cancel = true;
  } catch (e) {
    registrarErro("Fogo amigo", e);
  }
});
