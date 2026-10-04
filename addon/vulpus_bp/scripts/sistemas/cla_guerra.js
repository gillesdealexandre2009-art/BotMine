// @ts-check
// Guerras entre clãs: declarar (com aviso prévio), começar, contar abates (anti-farm por vítima, sequências
// de 3/5/10, cabeça do líder), terminar, anunciar o Caçador (quem mais abateu) e pagar o baú de guerra.
// Também o PvP dos clãs: fogo amigo desligado entre membros. Os prazos usam Date.now() e ficam salvos no
// mundo (vulpus:cla:guerras): uma guerra continua de onde parou depois de /reload ou de reiniciar.
// As bandeiras (Capture the Flag) ficam em ctf.js: aqui só a exigência para declarar, o estado guardado
// na guerra (ctf_estado.js) e o aviso de começo e fim (aoMudarGuerra).
import { Player, system, world } from "@minecraft/server";
import { SONS } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/clas.js";
import { PREFIXO } from "../textos/geral.js";
import { claDe, claPorId, editarCla, membroDe, moverBanco, pode, problemaBandeira } from "./cla_dados.js";
import { lerCtf, prepararCtf } from "./ctf_estado.js";

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
 * @property {Record<string, { n: number, nome: string, lado: Lado, t: number }>} abates  por jogador (t = ms do último)
 * @property {Record<string, number>} recentes  id da vítima → ms da última vez que ela rendeu ponto
 * @property {Record<string, number>} seq  abates seguidos de cada pessoa (zera quando ela morre)
 * @property {Record<string, number>} cabecas  id do líder → ms da última recompensa pela cabeça dele
 * @property {boolean} [forcada]  começada pelo Painel de Dono (sem aviso, sem custo e sem baú)
 * @property {import("./ctf_estado.js").Ctf | null} [ctf]  bandeiras (Capture the Flag); null = só abates
 */

/**
 * @typedef {object} GuerraFim
 * @property {string} id  o mesmo da Guerra ("" em histórico antigo)
 * @property {string} a
 * @property {string} b
 * @property {{ a: string, b: string }} tags
 * @property {{ a: number, b: number }} pontos
 * @property {Lado | null} vencedor
 * @property {"tempo" | "rendicao" | "staff" | "dissolvido" | "dono" | "cancelada"} motivo  dono/cancelada = Painel de Dono
 * @property {number} premio
 * @property {number} fim
 * @property {{ nome: string, n: number, lado: Lado } | null} cacador  quem mais abateu (o "Caçador" da guerra)
 * @property {boolean} forcada  começada pelo Painel de Dono
 * @property {boolean} porDono  vencedor definido pelo dono depois do fim (o baú não é pago de novo)
 * @property {{ a: number, b: number } | null} capturas  bandeiras capturadas por lado (null = guerra sem CTF)
 */

/** @typedef {{ guerras: Guerra[], historico: GuerraFim[], recargas: Record<string, number> }} EstadoGuerras */

const CHAVE = "vulpus:cla:guerras";
const HISTORICO_MAXIMO = 20;
/** Abates seguidos (sem morrer) que viram anúncio e ponto extra. */
export const MARCOS_SEQUENCIA = Object.freeze([3, 5, 10]);
/** Aviso aos dois clãs quando faltar isto para começar. */
const LEMBRETE_MS = 10 * 60 * 1000;
const TICKS_CICLO = 100;
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
/** A cabeça do mesmo líder só vale recompensa uma vez por hora. */
const CABECA_MS = HORA_MS;

/** @type {EstadoGuerras | undefined} */
let estado;
/** Quem quer saber quando uma guerra começa (comecou) ou termina (terminou): as bandeiras (ctf.js). */
const ouvintes = { comecou: /** @type {((g: Guerra) => void)[]} */ ([]), terminou: /** @type {((g: Guerra) => void)[]} */ ([]) };

/**
 * Registra quem quer saber do começo ou do fim de uma guerra.
 * @param {"comecou" | "terminou"} quando
 * @param {(g: Guerra) => void} fn
 */
export function aoMudarGuerra(quando, fn) {
  ouvintes[quando].push(fn);
}

/** @param {"comecou" | "terminou"} quando @param {Guerra} g */
function notificar(quando, g) {
  for (const fn of ouvintes[quando]) {
    try {
      fn(g);
    } catch (e) {
      registrarErro(`Guerra (${quando})`, e);
    }
  }
}

/** @param {unknown} v */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** @param {any} v */
const par = (v) => ({ a: num(v?.a), b: num(v?.b) });
/** @param {any} v */
const parTexto = (v) => ({ a: typeof v?.a === "string" ? v.a : "???", b: typeof v?.b === "string" ? v.b : "???" });
/**
 * Mapa id → número lido do mundo, sem as entradas quebradas.
 * @param {any} v
 * @returns {Record<string, number>}
 */
function lerNumeros(v) {
  /** @type {Record<string, number>} */
  const saida = {};
  if (!v || typeof v !== "object") return saida;
  for (const [id, n] of Object.entries(v)) if (typeof n === "number" && Number.isFinite(n)) saida[id] = n;
  return saida;
}
/** Janela do anti-farm: a mesma vítima só rende ponto uma vez nesse tempo (para qualquer matador). */
const antiFarmMs = () => Math.max(0, num(config().guerraAntiFarmMin)) * 60 * 1000;

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
    if (a && (a.lado === "a" || a.lado === "b")) saida[id] = { n: num(a.n), nome: typeof a.nome === "string" ? a.nome : "?", lado: a.lado, t: num(a.t) };
  }
  return saida;
}

/**
 * Lê o estado das guerras (uma vez), descartando o que estiver quebrado.
 * @returns {EstadoGuerras}
 */
export function lerEstado() {
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
      recentes: lerNumeros(g.recentes),
      seq: lerNumeros(g.seq),
      cabecas: lerNumeros(g.cabecas),
      forcada: g.forcada === true,
      ctf: lerCtf(g.ctf),
    }));
  estado = {
    guerras,
    historico: (Array.isArray(bruto.historico) ? bruto.historico : [])
      .filter((h) => h && typeof h.a === "string" && typeof h.b === "string")
      .map((h) => ({
        id: typeof h.id === "string" ? h.id : "",
        a: h.a,
        b: h.b,
        tags: parTexto(h.tags),
        pontos: par(h.pontos),
        vencedor: h.vencedor === "a" || h.vencedor === "b" ? h.vencedor : null,
        motivo: ["tempo", "rendicao", "staff", "dissolvido", "dono", "cancelada"].includes(h.motivo) ? h.motivo : "tempo",
        premio: num(h.premio),
        fim: num(h.fim),
        cacador:
          h.cacador && typeof h.cacador.nome === "string" && (h.cacador.lado === "a" || h.cacador.lado === "b")
            ? { nome: h.cacador.nome, n: num(h.cacador.n), lado: h.cacador.lado }
            : null,
        forcada: h.forcada === true,
        porDono: h.porDono === true,
        capturas: h.capturas && typeof h.capturas === "object" ? par(h.capturas) : null,
      }))
      .slice(0, HISTORICO_MAXIMO),
    recargas: bruto.recargas && typeof bruto.recargas === "object" ? bruto.recargas : {},
  };
  return estado;
}

/** Grava o estado; tira recargas vencidas, vítimas e cabeças fora da janela antes. */
export function salvar() {
  const e = lerEstado();
  const agora = Date.now();
  const recarga = Math.max(0, config().recargaGuerraDias) * DIA_MS;
  const janela = antiFarmMs();
  for (const [chave, quando] of Object.entries(e.recargas)) if (agora - num(quando) > recarga) delete e.recargas[chave];
  for (const g of e.guerras) {
    for (const [chave, quando] of Object.entries(g.recentes)) if (agora - num(quando) > janela) delete g.recentes[chave];
    for (const [chave, quando] of Object.entries(g.cabecas)) if (agora - num(quando) > CABECA_MS) delete g.cabecas[chave];
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
  // Capture the Flag: as duas bandeiras precisam estar marcadas (e dentro da base) antes de declarar.
  if (problemaBandeira(cla)) return textos.GUERRA_SEM_BANDEIRA;
  if (problemaBandeira(alvo)) return textos.GUERRA_ALVO_SEM_BANDEIRA(alvo.tag);
  return undefined;
}

/**
 * Manda uma mensagem (e um som, opcional) para quem está online nos clãs.
 * @param {string[]} claIds
 * @param {string} texto
 * @param {string} [idSom]
 */
export function avisarClas(claIds, texto, idSom) {
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
    seq: {},
    cabecas: {},
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
 * A forçada pelo dono não tem baú.
 * @param {Guerra} g
 */
export function iniciar(g) {
  const alvo = claPorId(g.b);
  const aposta = g.forcada ? 0 : Math.max(0, Math.floor(config().custoGuerra));
  const parte = alvo ? Math.min(alvo.banco, aposta) : 0;
  if (parte > 0 && editarCla(g.b, (c) => moverBanco(c, "guerra", -parte, textos.AUTOR_GUERRA))) g.aposta.b = parte;
  g.estado = "ativa";
  // As bandeiras ficam onde estavam agora (sem as duas, a guerra é só de abates: forçada pelo dono).
  g.ctf = prepararCtf(g.a, g.b);
  salvar();
  world.sendMessage(PREFIXO + textos.GUERRA_COMECOU(g));
  for (const p of online()) {
    const cla = claDe(p);
    if (!cla || (cla.id !== g.a && cla.id !== g.b)) continue;
    som(p, SONS.guerra);
    mostrarTitulo(p, textos.TITULO_GUERRA, { subtitulo: textos.SUBTITULO_GUERRA(g) });
  }
  notificar("comecou", g);
}

/**
 * Termina a guerra e paga o baú: o vencedor leva tudo; no empate (ou se a staff encerrar) cada um recebe a sua parte.
 * Só uma vez: a guerra sai da lista antes de pagar, e uma que já saiu não faz nada.
 * @param {Guerra} g
 * @param {GuerraFim["motivo"]} motivo
 * @param {Lado | null} [vencedor]  sem passar, vence quem tiver mais pontos
 * @returns {boolean} se terminou agora (false = já tinha terminado)
 */
export function terminar(g, motivo, vencedor) {
  const e = lerEstado();
  const i = e.guerras.indexOf(g);
  if (i < 0) return false;
  e.guerras.splice(i, 1);
  // Bandeiras de volta aos pedestais e quem levava perde o status (qualquer fim: tempo, staff, dono...).
  notificar("terminou", g);
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
  const cacador = cacadorDe(g);
  e.historico.unshift({
    id: g.id,
    a: g.a,
    b: g.b,
    tags: g.tags,
    pontos: g.pontos,
    vencedor: lado,
    motivo,
    premio: lado ? total : 0,
    fim: Date.now(),
    cacador: cacador ? { nome: cacador.nome, n: cacador.n, lado: cacador.lado } : null,
    forcada: g.forcada === true,
    porDono: false,
    capturas: g.ctf ? { a: g.ctf.capturas.a, b: g.ctf.capturas.b } : null,
  });
  e.historico = e.historico.slice(0, HISTORICO_MAXIMO);
  e.recargas[chavePar(g.a, g.b)] = Date.now();
  salvar();
  world.sendMessage(PREFIXO + textos.GUERRA_TERMINOU(g, lado, motivo, lado ? total : 0));
  if (!cacador) return true;
  world.sendMessage(PREFIXO + textos.CACADOR(g, cacador.nome, cacador.lado, cacador.n));
  const quem = online().find((p) => p.id === cacador.id);
  if (quem) {
    som(quem, SONS.nivel);
    mostrarTitulo(quem, textos.TITULO_CACADOR, { subtitulo: textos.SUBTITULO_CACADOR(g, cacador.n) });
  }
  return true;
}

/**
 * O "Caçador" da guerra: quem mais abateu (no empate, quem chegou lá primeiro). null sem abates.
 * @param {Guerra} g
 * @returns {{ id: string, nome: string, n: number, lado: Lado } | null}
 */
export function cacadorDe(g) {
  /** @type {{ id: string, nome: string, n: number, lado: Lado, t: number } | null} */
  let melhor = null;
  for (const [id, x] of Object.entries(g.abates)) {
    if (x.n > 0 && (!melhor || x.n > melhor.n || (x.n === melhor.n && x.t < melhor.t))) melhor = { id, ...x };
  }
  return melhor && { id: melhor.id, nome: melhor.nome, n: melhor.n, lado: melhor.lado };
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
 * Morte de alguém de um clã em guerra ativa: o abate (se foi o inimigo) e o fim da sequência de quem morreu.
 * @param {Player} vitima
 * @param {Player | undefined} matador
 */
function aoMorrer(vitima, matador) {
  const claV = claDe(vitima);
  if (!claV) return;
  const g = lerEstado().guerras.find((x) => x.estado === "ativa" && ladoDe(x, claV.id));
  if (!g) return;
  const claM = matador && matador.id !== vitima.id ? claDe(matador) : undefined;
  const ladoM = claM && claM.id !== claV.id ? ladoDe(g, claM.id) : undefined;
  let mudou = !!(matador && claM && ladoM && contarAbate(g, vitima, claV, matador, claM, ladoM));
  // Qualquer morte (inimigo, monstro, queda) encerra a sequência de quem morreu.
  const seq = g.seq[vitima.id] ?? 0;
  if (seq > 0) {
    delete g.seq[vitima.id];
    mudou = true;
    if (seq >= MARCOS_SEQUENCIA[0]) avisarClas([g.a, g.b], textos.SEQUENCIA_FIM(vitima.name, seq, ladoM && matador ? matador.name : undefined));
  }
  if (mudou) salvar();
}

/**
 * Abate entre clãs em guerra: 1 ponto para o clã de quem abateu, mais os extras (sequência e cabeça do
 * líder). Anti-farm: a mesma vítima só rende ponto uma vez por janela, seja quem for o matador do outro clã.
 * @param {Guerra} g
 * @param {Player} vitima
 * @param {Cla} claV
 * @param {Player} matador
 * @param {Cla} claM
 * @param {Lado} lado  do matador
 * @returns {boolean} se o abate contou
 */
function contarAbate(g, vitima, claV, matador, claM, lado) {
  // Só vale entre quem já era do clã quando a guerra foi declarada: conta reserva que entra num clã
  // aberto no meio da guerra para morrer em loop não vira ponto.
  const desde = (/** @type {Cla} */ c, /** @type {Player} */ p) => membroDe(c, p.id)?.desde ?? Infinity;
  if (desde(claM, matador) > g.declarada || desde(claV, vitima) > g.declarada) {
    msg(matador, textos.ABATE_NOVATO);
    return false;
  }
  const agora = Date.now();
  const janela = antiFarmMs();
  const passou = agora - num(g.recentes[vitima.id]);
  if (passou < janela) {
    msg(matador, textos.ABATE_REPETIDO(vitima.name, Math.max(1, Math.ceil((janela - passou) / 60000))));
    return false;
  }
  const cfg = config();
  g.recentes[vitima.id] = agora;
  g.pontos[lado]++;
  const antes = g.abates[matador.id];
  g.abates[matador.id] = { n: (antes?.n ?? 0) + 1, nome: matador.name, lado, t: agora };
  const seq = (g.seq[matador.id] ?? 0) + 1;
  g.seq[matador.id] = seq;
  /** @type {string[]} */
  const extras = [];
  if (MARCOS_SEQUENCIA.includes(seq)) {
    const bonus = Math.max(0, Math.floor(num(cfg.guerraBonusSequencia)));
    g.pontos[lado] += bonus;
    extras.push(textos.SEQUENCIA(claM.tag, matador.name, seq, bonus));
  }
  if (claV.dono === vitima.id && agora - num(g.cabecas[vitima.id]) >= CABECA_MS) {
    const bonus = Math.max(0, Math.floor(num(cfg.guerraBonusLider)));
    g.cabecas[vitima.id] = agora;
    g.pontos[lado] += bonus;
    extras.push(textos.CABECA_LIDER(claM.tag, matador.name, vitima.name, bonus));
  }
  avisarClas([g.a, g.b], textos.ABATE(g, claM.tag, matador.name, vitima.name));
  for (const texto of extras) avisarClas([g.a, g.b], texto, SONS.guerra);
  return true;
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
    if (deadEntity instanceof Player) aoMorrer(deadEntity, matador instanceof Player ? matador : undefined);
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
