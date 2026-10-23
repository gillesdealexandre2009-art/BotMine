// @ts-check
// Evento "Ecos dos Ausentes" (Dia de Finados, 2/11/2026): uma dimensão própria que fica aberta por EXATAMENTE 24 h (configurável).
// - Janela: tudo é derivado de datas absolutas (config ecosInicio/ecosFim); o estado antes/aberto/depois fica guardado no mundo só para
//   não repetir avisos depois de um reinício. Abre e fecha sozinho; ao fechar, quem está dentro volta ao spawn (staff e dono podem ficar).
// - Entrada/saída: blocos marcados pela staff (como os registros do Hollow). Morreu lá dentro: reaparece na entrada do Limiar.
// - Objetivos E01 a E13 (textos/ecos_docs.js): blocos marcados abrem as falas; cada objetivo dá Fragmentos de Alma UMA vez por pessoa.
// - Criaturas: pontos de aparição marcados, teto global, reaparecimento lento. Quem causou dano a uma elite/Memória/Testemunho leva o
//   fragmento daquele objetivo quando ela morre (uma vez por pessoa). Nenhuma criatura solta item: fragmento só vem de objetivo.
// Painel da staff em ecos_staff.js; a dimensão e o mapa em ecos_dimensao.js e ecos_mapa.js; textos de interface em textos/ecos.js.
import { ItemStack, Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config, dadosJogador, editarJogador, lerMundo, salvarMundo, todosJogadores } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { Lista } from "../core/forms.js";
import { porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { teleportar } from "../core/teleporte.js";
import { erro, msg, registrarErro, rodarSeguro, som } from "../core/util.js";
import { MENSAGENS, OBJETIVOS, TOTAL_FRAGMENTOS } from "../textos/ecos_docs.js";
import * as textos from "../textos/ecos.js";
import { darConquista } from "./conquistas.js";
import { chegadaEcos, definirFaseFinal, DIM_ECOS, dimEcos, ecosConstruido, emFaseFinal, iniciarLoopsEcos, jogadoresNosEcos, mandarParaSpawn, regiaoDoJogador } from "./ecos_dimensao.js";
import { blocoOlhado } from "./hollow.js";
import { emMinigame } from "./mg_estado.js";

/** @typedef {{ d: string, x: number, y: number, z: number }} Ponto */
/** @typedef {{ t: string, d: string, x: number, y: number, z: number, max: number, obj?: string }} PontoCriatura */
/** @typedef {import("../textos/ecos_docs.js").Objetivo} Objetivo */

export const ITEM_FRAGMENTO = "vulpus:fragmento_alma";
const PREFIXO_AUSENTE = "vulpus:ausente_";
const CHAVE_FASE = "vulpus:ecos:fase";
const CHAVE_PORTAIS = "vulpus:ecos:portais";
const CHAVE_PONTOS = "vulpus:ecos:pontos";
const CHAVE_CRIATURAS = "vulpus:ecos:criaturas";
export const MAX_PONTOS_CRIATURA = 40;
const PASSO_CICLO = 100;
const ABRINDO_TICKS = 10;
const TAG_CRIATURA = "ecos_mob";
/** Tipos de criatura: nome curto → entidade do BP. */
export const CRIATURAS = Object.freeze({
  errante: "vulpus:ecos_errante",
  sentinela: "vulpus:ecos_sentinela",
  memoria: "vulpus:ecos_memoria",
  testemunho: "vulpus:ecos_testemunho",
});
/** Quantas de cada tipo a staff pode pedir em um ponto. */
const MAX_POR_TIPO = Object.freeze({ errante: 6, sentinela: 2, memoria: 1, testemunho: 1 });
export const TIPOS_CRIATURA = /** @type {readonly string[]} */ (Object.keys(CRIATURAS));
/** Objetivos que uma sentinela pode "pagar" (a staff escolhe ao marcar o ponto). */
export const OBJETIVOS_ELITE = Object.freeze(OBJETIVOS.filter((o) => o.tipo === "elite").map((o) => o.id));

/** @param {Player} player */
const staffOuDono = (player) => ehStaff(player) || ehDono(player);
/** @param {string} id */
export const objetivoPorId = (id) => OBJETIVOS.find((o) => o.id === id);

// ------------------------------------------------------------------------------------ dados do mundo (sempre validados ao ler)
/** @param {any} p */
const ehPonto = (p) => !!p && typeof p === "object" && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n));
/** @param {any} p @returns {Ponto} */
const limpo = (p) => ({ d: p.d, x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });
/** @param {{ d: string, x: number, y: number, z: number }} p */
export const chaveBloco = (p) => `${p.d}|${Math.floor(p.x)}|${Math.floor(p.y)}|${Math.floor(p.z)}`;

/** @type {{ entrada?: Ponto, saida?: Ponto } | undefined} */
let portais;
/** @type {Record<string, Ponto> | undefined} */
let pontos;
/** @type {PontoCriatura[] | undefined} */
let criaturas;
/** @type {Map<string, { k: "entrada" | "saida" | "obj", id: string }> | undefined} */
let indice;

/** Esquece o que está em memória (os dados são lidos de novo do mundo). */
export function recarregar() {
  portais = undefined;
  pontos = undefined;
  criaturas = undefined;
  indice = undefined;
}

/** Os dois portais: entrada (no spawn) e saída (dentro da dimensão). */
export function lerPortais() {
  if (portais) return portais;
  const bruto = lerMundo(CHAVE_PORTAIS, {});
  /** @type {{ entrada?: Ponto, saida?: Ponto }} */
  const r = {};
  if (bruto && typeof bruto === "object") {
    if (ehPonto(bruto.entrada)) r.entrada = limpo(bruto.entrada);
    if (ehPonto(bruto.saida)) r.saida = limpo(bruto.saida);
  }
  return (portais = r);
}
/** @param {{ entrada?: Ponto, saida?: Ponto }} novo */
export function salvarPortais(novo) {
  const ok = salvarMundo(CHAVE_PORTAIS, novo);
  recarregar();
  return ok;
}

/** Blocos dos objetivos (id → ponto). Dado quebrado vira "vazio". @returns {Record<string, Ponto>} */
export function lerPontos() {
  if (pontos) return pontos;
  const bruto = lerMundo(CHAVE_PONTOS, {});
  /** @type {Record<string, Ponto>} */
  const r = {};
  const visto = new Set();
  for (const o of OBJETIVOS) {
    const p = bruto && typeof bruto === "object" ? bruto[o.id] : undefined;
    if (!ehPonto(p) || visto.has(chaveBloco(p))) continue;
    visto.add(chaveBloco(p));
    r[o.id] = limpo(p);
  }
  return (pontos = r);
}
/** @param {Record<string, Ponto>} novo */
export function salvarPontos(novo) {
  const ok = salvarMundo(CHAVE_PONTOS, novo);
  recarregar();
  return ok;
}

/** Pontos de aparição de criaturas. @returns {PontoCriatura[]} */
export function lerCriaturas() {
  if (criaturas) return criaturas;
  const bruto = lerMundo(CHAVE_CRIATURAS, []);
  /** @type {PontoCriatura[]} */
  const r = [];
  for (const p of Array.isArray(bruto) ? bruto : []) {
    if (!ehPonto(p) || typeof p.t !== "string" || !(p.t in CRIATURAS) || r.length >= MAX_PONTOS_CRIATURA) continue;
    const teto = MAX_POR_TIPO[/** @type {keyof typeof MAX_POR_TIPO} */ (p.t)];
    const max = Number.isFinite(p.max) ? Math.max(1, Math.min(teto, Math.floor(p.max))) : 1;
    /** @type {PontoCriatura} */
    const ponto = { t: p.t, ...limpo(p), max };
    if (p.t === "sentinela" && typeof p.obj === "string" && OBJETIVOS_ELITE.includes(p.obj)) ponto.obj = p.obj;
    r.push(ponto);
  }
  return (criaturas = r);
}
/** Salvar muda a numeração dos pontos: as criaturas vivas somem (voltam pelo ciclo). @param {PontoCriatura[]} novo */
export function salvarCriaturas(novo) {
  const ok = salvarMundo(CHAVE_CRIATURAS, novo);
  recarregar();
  removerCriaturas();
  return ok;
}

/** @returns {Map<string, { k: "entrada" | "saida" | "obj", id: string }>} */
function lerIndice() {
  if (indice) return indice;
  indice = new Map();
  const p = lerPortais();
  if (p.entrada) indice.set(chaveBloco(p.entrada), { k: "entrada", id: "" });
  if (p.saida) indice.set(chaveBloco(p.saida), { k: "saida", id: "" });
  for (const [id, ponto] of Object.entries(lerPontos())) indice.set(chaveBloco(ponto), { k: "obj", id });
  return indice;
}

/** O bloco já serve a outra coisa do evento? Devolve um rótulo ou undefined. @param {Ponto} ponto @param {string} [menos] */
export function usoDoBloco(ponto, menos) {
  const u = lerIndice().get(chaveBloco(ponto));
  if (!u) return undefined;
  const rotulo = u.k === "obj" ? u.id : u.k;
  return rotulo === menos ? undefined : rotulo;
}

// ------------------------------------------------------------------------------------ janela de 24 h
/**
 * Em que pé está o evento: desligado, antes da janela, aberto ou depois dela (início inclusive, fim exclusive: 24 h exatas).
 * @param {number} [agora]
 * @returns {"desligado" | "antes" | "aberto" | "depois"}
 */
export function estadoEcos(agora = Date.now()) {
  const c = config();
  if (!c.ecosLigado) return "desligado";
  if (agora < c.ecosInicio) return "antes";
  if (agora >= c.ecosFim) return "depois";
  return "aberto";
}

/** @typedef {{ fase: string, av: { h1: boolean, m10: boolean, m1: boolean } }} FaseSalva */
/** @returns {FaseSalva} */
function lerFase() {
  const b = lerMundo(CHAVE_FASE, undefined);
  const fases = ["desligado", "antes", "aberto", "depois"];
  return {
    fase: b && fases.includes(b.fase) ? b.fase : "antes",
    av: { h1: b?.av?.h1 === true, m10: b?.av?.m10 === true, m1: b?.av?.m1 === true },
  };
}
/** @param {FaseSalva} f */
const salvarFase = (f) => salvarMundo(CHAVE_FASE, f);

/** O que a pessoa lê do painel: a fase que o mundo guardou (para os testes e o painel). */
export const faseGuardada = () => lerFase().fase;

/** Aviso para quem está na dimensão (chat e actionbar). @param {string} texto */
function avisarDentro(texto) {
  for (const p of jogadoresNosEcos()) {
    try {
      p.sendMessage(texto);
      p.onScreenDisplay.setActionBar(texto);
      som(p, "note.bell", { volume: 0.4, pitch: 0.7 });
    } catch (e) {
      registrarErro("Ecos: aviso", e);
    }
  }
}

/** A janela acabou de abrir: um aviso geral para todos e outro para quem já estiver lá. */
function anunciarAbertura() {
  try {
    world.sendMessage(`${MENSAGENS.aberta}\n${textos.AVISO_GERAL}`);
  } catch (e) {
    registrarErro("Ecos: aviso geral", e);
  }
  avisarDentro(MENSAGENS.aberta);
}

/** A janela fechou (ou foi desligada): despede quem está lá, devolve ao spawn e some com as criaturas. */
function fecharJanela() {
  for (const p of jogadoresNosEcos()) {
    try {
      p.sendMessage(MENSAGENS.encerrada);
    } catch {
      // saiu
    }
  }
  expulsarQuemNaoPode();
  removerCriaturas();
}

/** Quem está na dimensão fora da janela e não é staff/dono volta ao spawn. */
function expulsarQuemNaoPode() {
  if (estadoEcos() === "aberto") return;
  for (const p of jogadoresNosEcos()) {
    if (staffOuDono(p)) continue;
    if (mandarParaSpawn(p)) {
      try {
        p.sendMessage(MENSAGENS.expulso);
      } catch {
        // saiu
      }
    }
  }
}

/** Confere a janela: transições (abre/fecha), avisos de fechamento e expulsões. Barato: só olha datas. @param {number} [agora] */
export function conferirJanela(agora = Date.now()) {
  const st = estadoEcos(agora);
  const reg = lerFase();
  if (reg.fase !== st) {
    const antes = reg.fase;
    reg.fase = st;
    reg.av = { h1: false, m10: false, m1: false };
    salvarFase(reg);
    if (st === "aberto") anunciarAbertura();
    else if (antes === "aberto") fecharJanela();
  }
  if (st === "aberto") {
    const resta = config().ecosFim - agora;
    // marca todos os avisos que já passaram; só o mais urgente é dito (um reinício no meio da janela não repete os antigos)
    const marcos = /** @type {const} */ ([
      ["m1", 60_000, MENSAGENS.fecha1min],
      ["m10", 600_000, MENSAGENS.fecha10min],
      ["h1", 3_600_000, MENSAGENS.fecha1h],
    ]);
    let dizer;
    let mudou = false;
    for (const [chave, limite, texto] of marcos) {
      if (resta <= limite && !reg.av[chave]) {
        reg.av[chave] = true;
        dizer = dizer ?? texto;
        mudou = true;
      }
    }
    if (mudou) {
      salvarFase(reg);
      if (dizer) avisarDentro(dizer);
    }
  } else expulsarQuemNaoPode();
}

// ------------------------------------------------------------------------------------ entrar e sair
/**
 * Pode entrar agora? (Só dentro da janela; staff e dono sempre, para testar.) Já avisa quem não pode.
 * @param {Player} player
 * @param {boolean} [avisar]
 */
export function podeEntrar(player, avisar = true) {
  const st = estadoEcos();
  if (st === "aberto" || staffOuDono(player)) return true;
  if (avisar) msg(player, st === "antes" ? MENSAGENS.antes : st === "depois" ? MENSAGENS.encerrada : textos.DESLIGADO);
  return false;
}

/**
 * Leva a pessoa ao Limiar.
 * @param {Player} player
 * @returns {boolean}
 */
export function entrarNosEcos(player) {
  if (!podeEntrar(player)) return false;
  if (!ecosConstruido() || !dimEcos()) {
    erro(player, textos.NAO_CONSTRUIDO);
    return false;
  }
  if (emMinigame(player)) {
    erro(player, textos.EM_MINIGAME);
    return false;
  }
  return teleportar(player, chegadaEcos(), { nome: textos.NOME_DESTINO, semEspera: true, salvarVoltar: false, tema: "spawn", aoChegar: (p) => conferirPresente(p) });
}

/** Sai por vontade própria: volta ao spawn. @param {Player} player */
export function sairDosEcos(player) {
  if (player.dimension.id !== DIM_ECOS) return false;
  const ok = mandarParaSpawn(player);
  if (ok) msg(player, textos.SAIU);
  return ok;
}

// ------------------------------------------------------------------------------------ presença (primeira chegada, quem entrou por outro meio)
/** @type {Set<string>} quem já foi recebido nesta estadia */
const presentes = new Set();

/** @param {Player} player */
function receber(player) {
  if (!podeEntrar(player, false)) {
    if (mandarParaSpawn(player)) msg(player, MENSAGENS.expulso);
    return;
  }
  const valendo = estadoEcos() === "aberto";
  const primeira = valendo && !dadosJogador(player).ecos.entrou;
  if (valendo) {
    editarJogador(player, (d) => {
      d.ecos.entrou = true;
    });
  }
  try {
    player.onScreenDisplay.setTitle(textos.TITULO_CHEGADA, { subtitle: textos.SUB_CHEGADA, fadeInDuration: 20, stayDuration: 60, fadeOutDuration: 20 });
  } catch (e) {
    registrarErro("Ecos: título", e);
  }
  if (primeira) {
    system.runTimeout(() => {
      if (player.isValid) rodarSeguro(player, "Ecos: prólogo", (p) => prologo(p));
    }, 80);
  }
}

/** A história em duas páginas, na primeira vez. @param {Player} player */
async function prologo(player) {
  await new Lista(textos.TITULO_PROLOGO).texto(`§f${textos.PROLOGO}`).botao(textos.BOTAO_CONTINUAR, ICONES.proxima).abrir(player);
}

/** @param {Player} player */
const conferirPresente = (player) => {
  if (presentes.has(player.id)) return;
  presentes.add(player.id);
  receber(player);
};

world.afterEvents.playerDimensionChange.subscribe(({ player, toDimension }) => {
  try {
    if (toDimension.id === DIM_ECOS) conferirPresente(player);
    else presentes.delete(player.id);
  } catch (e) {
    registrarErro("Ecos: troca de dimensão", e);
  }
});

// ------------------------------------------------------------------------------------ objetivos: falas, enigmas e fragmentos
/** @param {Objetivo} obj @param {{ feitos: string[] }} d */
const requisitosOk = (obj, d) => (obj.requer ?? []).every((r) => d.feitos.includes(r));

/** Quantos fragmentos a pessoa tem registrados no progresso. @param {Player | string} alvo */
export const fragmentosDe = (alvo) => dadosJogador(alvo).ecos.frag;

/**
 * Dá os itens (inventário; se estiver cheio, no chão). Os fragmentos ficam com a pessoa ao morrer (keepOnDeath).
 * @param {Player} player
 * @param {number} n
 */
function darItem(player, n) {
  const item = new ItemStack(ITEM_FRAGMENTO, n);
  item.keepOnDeath = true;
  const inv = player.getComponent("minecraft:inventory")?.container;
  const sobra = inv ? inv.addItem(item) : item;
  if (sobra) {
    player.dimension.spawnItem(sobra, player.location);
    msg(player, textos.FRAGMENTO_CHAO);
  }
}

/**
 * Conclui um objetivo para a pessoa: grava o progresso (uma vez só) e entrega os fragmentos. Fora da janela (staff testando) não conta.
 * @param {Player} player
 * @param {Objetivo} obj
 * @returns {{ tipo: "novo", n: number, total: number } | { tipo: "teste" | "ja" | "erro" }}
 */
export function completarObjetivo(player, obj) {
  if (estadoEcos() !== "aberto") return { tipo: "teste" };
  let novo = false;
  const d = editarJogador(player, (j) => {
    if (j.ecos.feitos.includes(obj.id)) return;
    j.ecos.feitos.push(obj.id);
    j.ecos.frag += obj.fragmentos;
    novo = true;
  }).ecos;
  if (!novo) return { tipo: "ja" };
  try {
    darItem(player, obj.fragmentos);
  } catch (e) {
    registrarErro("Ecos: dar fragmento", e);
    editarJogador(player, (j) => {
      j.ecos.feitos = j.ecos.feitos.filter((x) => x !== obj.id);
      j.ecos.frag = Math.max(0, j.ecos.frag - obj.fragmentos);
    });
    return { tipo: "erro" };
  }
  som(player, "random.levelup", { volume: 0.5, pitch: 1.4 });
  try {
    player.onScreenDisplay.setActionBar(textos.FRAGMENTO_MAIS(obj.fragmentos, d.frag, TOTAL_FRAGMENTOS));
  } catch {
    // saiu
  }
  return { tipo: "novo", n: obj.fragmentos, total: d.frag };
}

/** A linha "Fragmento de Alma +N" (ou o aviso de teste/já feito). @param {ReturnType<typeof completarObjetivo>} r */
function linhaResultado(r) {
  if (r.tipo === "novo") return textos.FRAGMENTO_MAIS(r.n, r.total, TOTAL_FRAGMENTOS);
  if (r.tipo === "teste") return textos.SO_TESTE;
  if (r.tipo === "erro") return textos.FRAGMENTO_ERRO;
  return "";
}

/** Falas finais do E13 mudam só na última frase, pela escolha. @param {Objetivo} obj @param {string} escolha */
function falasFimDe(obj, escolha) {
  const fim = [...(obj.falasFim ?? [])];
  if (obj.id === "E13" && fim.length && textos.ULTIMA_FALA[/** @type {keyof typeof textos.ULTIMA_FALA} */ (escolha)]) {
    fim[fim.length - 1] = textos.ULTIMA_FALA[/** @type {keyof typeof textos.ULTIMA_FALA} */ (escolha)];
  }
  return fim;
}

/** Uma página de fala. Devolve se a pessoa clicou em algo (fechar = parar a conversa). @param {Player} player @param {string} quem @param {string} texto @param {string} [botao] */
async function pagina(player, quem, texto, botao = textos.BOTAO_CONTINUAR) {
  return new Lista(quem).texto(`§f${texto}`).botao(botao, ICONES.proxima).abrir(player);
}

/** O objetivo "ainda não": sem dizer o que falta (nada de spoiler). @param {Player} player @param {Objetivo} obj */
async function mostrarAindaNao(player, obj) {
  await new Lista(obj.quem).texto(`§7${textos.AINDA_NAO}`).botao(textos.BOTAO_FECHAR, ICONES.nao).abrir(player);
}

/**
 * Páginas de uma lista de falas; a última leva o texto extra (ex.: "Fragmento de Alma +1").
 * @param {Player} player
 * @param {string} quem
 * @param {string[]} falas
 * @param {string} [extraNaUltima]
 * @returns {Promise<boolean>} false se a pessoa fechou no meio
 */
async function falasEmPaginas(player, quem, falas, extraNaUltima = "") {
  for (let i = 0; i < falas.length; i++) {
    const ultima = i === falas.length - 1;
    const texto = ultima && extraNaUltima ? `${falas[i]}\n\n${extraNaUltima}` : falas[i];
    if (!(await pagina(player, quem, texto, ultima ? textos.BOTAO_FECHAR : textos.BOTAO_CONTINUAR))) return false;
  }
  return true;
}

/** Pode interagir agora? Dentro da janela todos; fora dela só staff/dono (modo teste, sem recompensa). @param {Player} player */
function podeInteragir(player) {
  const st = estadoEcos();
  if (st === "aberto" || staffOuDono(player)) return true;
  msg(player, st === "antes" ? MENSAGENS.antes : st === "depois" ? MENSAGENS.encerrada : textos.DESLIGADO);
  return false;
}

/**
 * Abre um objetivo (bloco marcado). Diálogo/segredo: falas e, ao fim, o fragmento. Enigma: pergunta com opções (errar só dá a pista).
 * Elite: só as falas (o fragmento vem do combate). Memória e Testemunho: abrem a conversa antes da luta.
 * @param {Player} player
 * @param {string} id
 */
export async function abrirObjetivo(player, id) {
  const obj = objetivoPorId(id);
  if (!obj || !podeInteragir(player)) return;
  const d = dadosJogador(player).ecos;
  if (!requisitosOk(obj, d)) return mostrarAindaNao(player, obj);
  const feito = d.feitos.includes(id);
  if (obj.tipo === "memoria" || obj.tipo === "chefe") return conversaComCriatura(player, obj);
  if (feito) {
    const fim = obj.falasFim?.length ? obj.falasFim : [textos.JA_RECOLHEU];
    await falasEmPaginas(player, obj.quem, fim.slice(0, 1), `§7${textos.JA_FEITO}`);
    return;
  }
  if (obj.tipo === "elite") {
    await falasEmPaginas(player, obj.quem, obj.falas);
    return;
  }
  if (obj.tipo === "enigma") return enigma(player, obj);
  // dialogo e segredo
  const fim = obj.falasFim ?? [];
  const n = obj.falas.length;
  for (let i = 0; i < n; i++) {
    const ultima = i === n - 1;
    let texto = obj.falas[i];
    if (ultima && fim.length === 0) {
      texto += `\n\n${linhaResultado(completarObjetivo(player, obj))}`;
      await pagina(player, obj.quem, texto, textos.BOTAO_FECHAR);
      return;
    }
    if (!(await pagina(player, obj.quem, texto))) return;
  }
  const r = completarObjetivo(player, obj);
  await falasEmPaginas(player, obj.quem, fim, linhaResultado(r));
}

/** Enigma: falas, a pergunta e as opções. Errada = só a resposta/pista, pode tentar de novo (sem trava, sem punição). @param {Player} player @param {Objetivo} obj */
async function enigma(player, obj) {
  if (!(await falasEmPaginas(player, obj.quem, obj.falas.slice(0, -1)))) return;
  const ultimaFala = obj.falas[obj.falas.length - 1] ?? "";
  for (;;) {
    const lista = new Lista(obj.quem).texto(`§f${ultimaFala}\n\n§e${obj.pergunta ?? ""}`);
    /** @type {number | undefined} */
    let escolhida;
    (obj.opcoes ?? []).forEach((o, i) => {
      lista.botao(o.texto, ICONES.comandos, () => {
        escolhida = i;
      });
    });
    lista.botao(textos.BOTAO_SAIR_CONVERSA, ICONES.nao);
    await lista.abrir(player);
    const op = escolhida === undefined ? undefined : (obj.opcoes ?? [])[escolhida];
    if (!op) return;
    if (!op.certa) {
      await pagina(player, obj.quem, `${op.resposta ?? ""}\n\n§7${textos.TENTE_DE_NOVO}`, textos.BOTAO_TENTAR_DE_NOVO);
      continue;
    }
    const r = completarObjetivo(player, obj);
    await pagina(player, obj.quem, op.resposta ?? "");
    await falasEmPaginas(player, obj.quem, obj.falasFim ?? [], linhaResultado(r));
    return;
  }
}

/**
 * Conversa com a Memória Partida (E12) ou o Último Testemunho (E13), antes de lutar. As opções do E13 guardam a escolha final;
 * soltar e guardar encerram sem luta, lutar deixa o combate valer. As três dão os mesmos fragmentos. Na E12, as duas respostas
 * certas também concluem (vale lutar ou conversar).
 * @param {Player} player
 * @param {Objetivo} obj
 */
export async function conversaComCriatura(player, obj) {
  if (!podeInteragir(player)) return;
  const d0 = dadosJogador(player).ecos;
  if (!requisitosOk(obj, d0)) return mostrarAindaNao(player, obj);
  if (d0.feitos.includes(obj.id)) {
    await falasEmPaginas(player, obj.quem, falasFimDe(obj, d0.escolha).slice(-1), `§7${textos.JA_FEITO}`);
    return;
  }
  if (!(await falasEmPaginas(player, obj.quem, obj.falas.slice(0, -1)))) return;
  const ultimaFala = obj.falas[obj.falas.length - 1] ?? "";
  for (;;) {
    const lista = new Lista(obj.quem).texto(`§f${ultimaFala}\n\n§e${obj.pergunta ?? ""}`);
    /** @type {number | undefined} */
    let escolhida;
    (obj.opcoes ?? []).forEach((o, i) => {
      lista.botao(o.texto, ICONES.comandos, () => {
        escolhida = i;
      });
    });
    lista.botao(textos.BOTAO_SAIR_CONVERSA, ICONES.nao);
    await lista.abrir(player);
    const i = escolhida;
    const op = i === undefined ? undefined : (obj.opcoes ?? [])[i];
    if (!op || i === undefined) return;
    if (obj.id === "E12") {
      if (!op.certa) {
        await pagina(player, obj.quem, `${op.resposta ?? ""}\n\n§7${textos.TENTE_DE_NOVO}`, textos.BOTAO_TENTAR_DE_NOVO);
        continue;
      }
      const r = completarObjetivo(player, obj);
      await pagina(player, obj.quem, op.resposta ?? "");
      await falasEmPaginas(player, obj.quem, obj.falasFim ?? [], linhaResultado(r));
      return;
    }
    // E13: 0 soltar, 1 guardar, 2 lutar
    const escolha = i === 0 ? "soltar" : i === 1 ? "guardar" : "lutar";
    if (estadoEcos() === "aberto") {
      editarJogador(player, (j) => {
        if (!j.ecos.feitos.includes(obj.id)) j.ecos.escolha = escolha;
      });
    }
    if (escolha === "lutar") {
      await pagina(player, obj.quem, `${op.resposta ?? ""}\n\n§7${textos.LUTAR_AVISO}`, textos.BOTAO_FECHAR);
      return;
    }
    const r = completarObjetivo(player, obj);
    if (r.tipo === "novo") concederSelo(player, escolha);
    await pagina(player, obj.quem, op.resposta ?? "");
    await falasEmPaginas(player, obj.quem, falasFimDe(obj, escolha), linhaResultado(r));
    return;
  }
}

/** O selo "Ecos dos Ausentes", com o título pela escolha final. @param {Player} player @param {string} escolha */
function concederSelo(player, escolha) {
  darConquista(player, `ecos_${escolha}`);
}

// ------------------------------------------------------------------------------------ interação com os blocos marcados
/** @type {Map<string, number>} */
const ultimaAbertura = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    if (!ev.isFirstEvent) return;
    const b = ev.block;
    const mapa = lerIndice();
    if (mapa.size === 0) return;
    const uso = mapa.get(chaveBloco({ d: b.dimension.id, x: b.location.x, y: b.location.y, z: b.location.z }));
    if (!uso) return;
    if (ev.player.isSneaking && staffOuDono(ev.player)) return; // a staff agachada mexe no bloco normalmente
    ev.cancel = true;
    const player = ev.player;
    const agora = system.currentTick;
    if (agora - (ultimaAbertura.get(player.id) ?? -1e9) < ABRINDO_TICKS) return;
    ultimaAbertura.set(player.id, agora);
    system.run(() => {
      if (!player.isValid) return;
      rodarSeguro(player, "Ecos: bloco marcado", (p) => {
        if (uso.k === "entrada") return void entrarNosEcos(p);
        if (uso.k === "saida") return void sairDosEcos(p);
        return abrirObjetivo(p, uso.id);
      });
    });
  } catch (e) {
    registrarErro("Ecos: interação", e);
  }
});

// Memória Partida e Último Testemunho: clicar abre a conversa antes da luta.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    const t = ev.target.typeId;
    if (t !== CRIATURAS.memoria && t !== CRIATURAS.testemunho) return;
    ev.cancel = true;
    const player = ev.player;
    const agora = system.currentTick;
    if (agora - (ultimaAbertura.get(player.id) ?? -1e9) < ABRINDO_TICKS) return;
    ultimaAbertura.set(player.id, agora);
    const obj = objetivoPorId(t === CRIATURAS.memoria ? "E12" : "E13");
    if (!obj) return;
    system.run(() => {
      if (player.isValid) rodarSeguro(player, "Ecos: conversa", (p) => conversaComCriatura(p, obj));
    });
  } catch (e) {
    registrarErro("Ecos: interação com criatura", e);
  }
});

// ------------------------------------------------------------------------------------ criaturas
/**
 * @typedef {object} Viva
 * @property {import("@minecraft/server").Entity} entidade
 * @property {string} tipo
 * @property {number} ponto  índice do ponto de aparição (-1 = invocada, não reaparece)
 * @property {string} [obj]  objetivo que a morte paga (sentinela)
 * @property {Map<string, number>} dano  jogador → dano causado
 * @property {boolean} fase2
 */
/** @type {Map<string, Viva>} entidade → registro (só na memória: ao ligar o mundo todas somem e o ciclo as refaz) */
const vivas = new Map();
/** Quando cada ponto pode gerar de novo (tick). @type {Map<number, number>} */
const proximoSpawn = new Map();
const NOMES_CRIATURA = Object.freeze({ errante: "§8Eco Errante", sentinela: "§bSentinela da Cripta", memoria: "§dMemória Partida", testemunho: "§6O Último Testemunho" });
const FORMAS_MEMORIA = Object.freeze(["§dMemória Partida", "§bMemória Partida", "§eMemória Partida", "§fMemória Partida"]);
const PARTICULAS_MEMORIA = Object.freeze(["minecraft:endrod", "minecraft:basic_smoke_particle", "minecraft:totem_particle", "minecraft:basic_flame_particle"]);

/** Quantas criaturas estão vivas. */
export const totalVivas = () => {
  for (const [id, v] of vivas) if (!v.entidade.isValid) vivas.delete(id);
  return vivas.size;
};
/** @param {string} tipo */
const vivasDoTipo = (tipo) => [...vivas.values()].filter((v) => v.tipo === tipo && v.entidade.isValid);

/** Tira todas as criaturas da dimensão (fechamento, edição dos pontos, ligar o mundo). */
export function removerCriaturas() {
  try {
    for (const v of vivas.values()) if (v.entidade.isValid) v.entidade.remove();
    vivas.clear();
    proximoSpawn.clear();
    definirFaseFinal(false);
    const dim = dimEcos();
    if (!dim) return;
    for (const e of dim.getEntities({ tags: [TAG_CRIATURA] })) {
      try {
        e.remove();
      } catch {
        // já saiu
      }
    }
  } catch (e) {
    registrarErro("Ecos: remover criaturas", e);
  }
}

/** Criaturas só trabalham dentro da janela, ou quando a staff está lá testando. */
function criaturasAtivas() {
  if (estadoEcos() === "aberto") return true;
  return jogadoresNosEcos().some(staffOuDono);
}

/** @param {PontoCriatura} pt */
function gerar(pt, i) {
  const dim = dimEcos();
  if (!dim) return;
  const tipo = /** @type {keyof typeof CRIATURAS} */ (pt.t);
  const local = { x: pt.x + 0.5 + (Math.random() - 0.5) * 2, y: pt.y + 1, z: pt.z + 0.5 + (Math.random() - 0.5) * 2 };
  const e = dim.spawnEntity(CRIATURAS[tipo], local);
  e.addTag(TAG_CRIATURA);
  try {
    e.nameTag = NOMES_CRIATURA[tipo];
  } catch {
    // sem nome: tudo bem
  }
  vivas.set(e.id, { entidade: e, tipo, ponto: i, obj: pt.obj, dano: new Map(), fase2: false });
}

/** Um ciclo: gera onde falta (respeitando o teto e a espera), arruma órfãs, anima a Memória. Só roda com gente na dimensão. */
function cicloCriaturas() {
  const dentro = jogadoresNosEcos();
  if (dentro.length === 0) return;
  const dim = dimEcos();
  if (!dim) return;
  if (!criaturasAtivas()) {
    if (vivas.size > 0) removerCriaturas();
    return;
  }
  const agora = system.currentTick;
  // órfãs (de antes de um reinício) não têm registro: saem
  try {
    for (const e of dim.getEntities({ tags: [TAG_CRIATURA] })) if (!vivas.has(e.id)) e.remove();
  } catch (e) {
    registrarErro("Ecos: varrer órfãs", e);
  }
  const teto = Math.max(0, Math.floor(config().ecosTetoCriaturas));
  const pontosC = lerCriaturas();
  pontosC.forEach((pt, i) => {
    if (totalVivas() >= teto) return;
    if ((proximoSpawn.get(i) ?? 0) > agora) return;
    // só onde há gente por perto (a dimensão é grande e o resto fica quieto)
    const perto = dentro.some((p) => Math.abs(p.location.x - pt.x) < 64 && Math.abs(p.location.z - pt.z) < 64 && Math.abs(p.location.y - pt.y) < 40);
    if (!perto) return;
    const vivasAqui = [...vivas.values()].filter((v) => v.ponto === i && v.entidade.isValid).length;
    if (vivasAqui >= pt.max) return;
    try {
      gerar(pt, i);
      proximoSpawn.set(i, agora + 40);
    } catch (e) {
      proximoSpawn.set(i, agora + 200);
      registrarErro("Ecos: gerar criatura", e);
    }
  });
  // a fase final acaba se o Testemunho não está mais lá
  if (emFaseFinal() && vivasDoTipo("testemunho").length === 0) definirFaseFinal(false);
  // Memória Partida muda de forma (só nome e partículas)
  for (const v of vivasDoTipo("memoria")) {
    try {
      const k = Math.floor(Math.random() * FORMAS_MEMORIA.length);
      v.entidade.nameTag = FORMAS_MEMORIA[k];
      const l = v.entidade.location;
      dim.spawnParticle(PARTICULAS_MEMORIA[k], { x: l.x, y: l.y + 1, z: l.z });
    } catch {
      // descarregada
    }
  }
}

/** @param {import("@minecraft/server").Entity} e */
function vidaRestante(e) {
  try {
    const h = e.getComponent("minecraft:health");
    if (!h) return 1;
    const max = /** @type {any} */ (h).effectiveMax || 1;
    return h.currentValue / max;
  } catch {
    return 1;
  }
}

/** Fase 2 do Testemunho: invoca 2 errantes, o fog pesa e o nome muda. @param {Viva} v */
function entrarFase2(v) {
  v.fase2 = true;
  definirFaseFinal(true);
  const dim = dimEcos();
  if (!dim || !v.entidade.isValid) return;
  const l = v.entidade.location;
  try {
    v.entidade.nameTag = "§c§lO Último Testemunho";
  } catch {
    // ok
  }
  for (let k = 0; k < 2; k++) {
    try {
      const e = dim.spawnEntity(CRIATURAS.errante, { x: l.x + (k === 0 ? 3 : -3), y: l.y, z: l.z + 1 });
      e.addTag(TAG_CRIATURA);
      e.nameTag = NOMES_CRIATURA.errante;
      vivas.set(e.id, { entidade: e, tipo: "errante", ponto: -1, dano: new Map(), fase2: false });
    } catch (e) {
      registrarErro("Ecos: invocar errante", e);
    }
  }
  try {
    for (let k = 0; k < 16; k++) dim.spawnParticle("minecraft:basic_flame_particle", { x: l.x + (Math.random() - 0.5) * 4, y: l.y + Math.random() * 3, z: l.z + (Math.random() - 0.5) * 4 });
  } catch {
    // ok
  }
  avisarDentro(textos.FASE_DOIS);
}

/** @param {Viva} v @param {Player} atacante @param {number} dano */
function registrarDano(v, atacante, dano) {
  v.dano.set(atacante.id, (v.dano.get(atacante.id) ?? 0) + Math.max(0, dano));
}

world.afterEvents.entityHurt.subscribe((ev) => {
  try {
    const alvo = ev.hurtEntity;
    const v = vivas.get(alvo.id);
    if (v) {
      const quem = ev.damageSource?.damagingEntity;
      if (quem instanceof Player) registrarDano(v, quem, ev.damage);
      if (v.tipo === "testemunho" && !v.fase2 && vidaRestante(alvo) <= 0.5) entrarFase2(v);
      return;
    }
    if (alvo instanceof Player && alvo.dimension.id === DIM_ECOS) {
      // foto do que vale proteger, tirada enquanto a pessoa está viva (se este golpe a matou, vale a foto anterior)
      const h = alvo.getComponent("minecraft:health");
      if (!h || h.currentValue > 0) tirarFoto(alvo);
    }
  } catch (e) {
    registrarErro("Ecos: dano", e);
  }
});

/** Morreu uma criatura: reaparecimento lento e crédito para quem causou dano. */
world.afterEvents.entityDie.subscribe((ev) => {
  try {
    const morto = ev.deadEntity;
    if (morto instanceof Player) return void aoMorrerJogador(morto);
    const v = vivas.get(morto.id);
    if (!v) return;
    vivas.delete(morto.id);
    if (v.ponto >= 0) proximoSpawn.set(v.ponto, system.currentTick + Math.max(10, config().ecosReaparecerSeg) * 20);
    if (v.tipo === "testemunho") definirFaseFinal(false);
    creditarMorte(v);
  } catch (e) {
    registrarErro("Ecos: morte de criatura", e);
  }
});

/** Objetivo que a morte da criatura paga. @param {Viva} v */
function objetivoDaMorte(v) {
  if (v.tipo === "sentinela") return v.obj;
  if (v.tipo === "memoria") return "E12";
  if (v.tipo === "testemunho") return "E13";
  return undefined;
}

/**
 * Quem causou pelo menos `ecosDanoMin` de dano leva o fragmento do objetivo (uma vez por pessoa, só dentro da janela).
 * @param {Viva} v
 */
function creditarMorte(v) {
  const id = objetivoDaMorte(v);
  const obj = id ? objetivoPorId(id) : undefined;
  if (!obj) return;
  if (estadoEcos() !== "aberto") return;
  const minimo = config().ecosDanoMin;
  for (const [pid, dano] of v.dano) {
    if (dano < minimo) continue;
    const p = porId(pid);
    if (!p?.isValid) continue;
    rodarSeguro(p, "Ecos: crédito da criatura", (pl) => darCreditoDaLuta(pl, obj));
  }
}

/** @param {Player} player @param {Objetivo} obj */
function darCreditoDaLuta(player, obj) {
  const d = dadosJogador(player).ecos;
  if (!requisitosOk(obj, d)) return void msg(player, textos.AINDA_NAO);
  if (d.feitos.includes(obj.id)) return;
  if (obj.id === "E13" && d.escolha === "") {
    editarJogador(player, (j) => {
      j.ecos.escolha = "lutar";
    });
  }
  const r = completarObjetivo(player, obj);
  if (r.tipo !== "novo") return;
  const escolha = dadosJogador(player).ecos.escolha || "lutar";
  if (obj.id === "E13") concederSelo(player, escolha);
  for (const linha of falasFimDe(obj, escolha)) msg(player, `§f${linha}`);
  msg(player, textos.FRAGMENTO_MAIS(r.n, r.total, TOTAL_FRAGMENTOS));
}

// ------------------------------------------------------------------------------------ morte lá dentro: reaparece no Limiar e guarda os fragmentos
/** @type {Set<string>} quem morreu nos Ecos e ainda não reapareceu */
const morreuAqui = new Set();
/** @type {Map<string, Map<string, number>>} jogador → (item protegido → quantidade) na última foto */
const fotos = new Map();
/** @type {Map<string, { x: number, y: number, z: number }>} */
const localDaMorte = new Map();

/** Itens que a pessoa não pode perder ao morrer lá dentro. @param {string} id */
const protegido = (id) => id === ITEM_FRAGMENTO || id.startsWith(PREFIXO_AUSENTE);

/** @param {Player} player @returns {Map<string, number>} */
function contarProtegidos(player) {
  /** @type {Map<string, number>} */
  const m = new Map();
  const soma = (/** @type {ItemStack | undefined} */ it) => {
    if (it && protegido(it.typeId)) m.set(it.typeId, (m.get(it.typeId) ?? 0) + it.amount);
  };
  try {
    const c = player.getComponent("minecraft:inventory")?.container;
    if (c) for (let i = 0; i < c.size; i++) soma(c.getItem(i));
  } catch {
    // ok
  }
  try {
    const eq = player.getComponent("minecraft:equippable");
    if (eq) for (const slot of ["Head", "Chest", "Legs", "Feet", "Offhand"]) soma(eq.getEquipment(/** @type {any} */ (slot)));
  } catch {
    // ok
  }
  return m;
}

/** @param {Player} player */
function tirarFoto(player) {
  const m = contarProtegidos(player);
  if (m.size === 0) fotos.delete(player.id);
  else fotos.set(player.id, m);
}

/** @param {Player} player */
function aoMorrerJogador(player) {
  if (player.dimension?.id !== DIM_ECOS) return;
  morreuAqui.add(player.id);
  const l = player.location;
  localDaMorte.set(player.id, { x: l.x, y: l.y, z: l.z });
  // o que caiu no chão de fragmento/equipamento é recolhido: a pessoa recebe de volta ao reaparecer
  const foto = fotos.get(player.id);
  if (foto && foto.size > 0) system.runTimeout(() => varrerDrops(localDaMorte.get(player.id) ?? l), 10);
}

/** @param {{ x: number, y: number, z: number }} onde */
function varrerDrops(onde) {
  try {
    const dim = dimEcos();
    if (!dim) return;
    for (const e of dim.getEntities({ type: "minecraft:item", location: onde, maxDistance: 10 })) {
      const it = /** @type {any} */ (e.getComponent("minecraft:item"))?.itemStack;
      if (it && protegido(it.typeId)) e.remove();
    }
  } catch (e) {
    registrarErro("Ecos: varrer itens da morte", e);
  }
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  try {
    if (initialSpawn) {
      morreuAqui.delete(player.id);
      presentes.delete(player.id);
      return;
    }
    if (!morreuAqui.delete(player.id)) return;
    const foto = fotos.get(player.id);
    fotos.delete(player.id);
    const onde = localDaMorte.get(player.id);
    localDaMorte.delete(player.id);
    system.run(() => {
      if (!player.isValid) return;
      if (foto) devolverProtegidos(player, foto);
      if (onde) varrerDrops(onde);
      if (podeEntrar(player, false) && ecosConstruido()) {
        const c = chegadaEcos();
        try {
          player.teleport({ x: c.x, y: c.y, z: c.z }, { dimension: world.getDimension(DIM_ECOS), rotation: { x: 0, y: c.ry }, keepVelocity: false });
          presentes.add(player.id);
          msg(player, textos.REAPARECEU);
        } catch (e) {
          registrarErro("Ecos: reaparecer no Limiar", e);
        }
      }
    });
  } catch (e) {
    registrarErro("Ecos: reaparecer", e);
  }
});

/** Devolve o que faltar do que a pessoa tinha na foto (fragmentos e equipamentos dos Ausentes). @param {Player} player @param {Map<string, number>} foto */
function devolverProtegidos(player, foto) {
  const agora = contarProtegidos(player);
  for (const [id, quanto] of foto) {
    const falta = quanto - (agora.get(id) ?? 0);
    if (falta <= 0) continue;
    try {
      let resta = falta;
      while (resta > 0) {
        const n = Math.min(resta, 64);
        const item = new ItemStack(id, n);
        item.keepOnDeath = true;
        const inv = player.getComponent("minecraft:inventory")?.container;
        const sobra = inv ? inv.addItem(item) : item;
        if (sobra) player.dimension.spawnItem(sobra, player.location);
        resta -= n;
      }
      msg(player, textos.FRAGMENTOS_DEVOLVIDOS);
    } catch (e) {
      registrarErro("Ecos: devolver fragmentos", e);
    }
  }
}

// ------------------------------------------------------------------------------------ ciclo geral
function ciclo() {
  try {
    conferirJanela();
    const dentro = jogadoresNosEcos();
    const ids = new Set(dentro.map((p) => p.id));
    for (const id of [...presentes]) if (!ids.has(id)) presentes.delete(id);
    for (const p of dentro) conferirPresente(p);
    // foto periódica (só de quem tem o que proteger)
    for (const p of dentro) tirarFoto(p);
    cicloCriaturas();
  } catch (e) {
    registrarErro("Ecos: ciclo", e);
  }
}

system.runInterval(ciclo, PASSO_CICLO);
iniciarLoopsEcos();

world.afterEvents.worldLoad.subscribe(() => {
  recarregar();
  removerCriaturas();
  conferirJanela();
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  presentes.delete(playerId);
  ultimaAbertura.delete(playerId);
  fotos.delete(playerId);
  localDaMorte.delete(playerId);
  morreuAqui.delete(playerId);
  for (const v of vivas.values()) v.dano.delete(playerId);
});

// ------------------------------------------------------------------------------------ marcar (usado pelo painel da staff)
/** @param {Player} player @param {string} texto */
function falha(player, texto) {
  erro(player, texto);
  return false;
}

/**
 * @param {Player} player
 * @returns {{ ponto: Ponto } | { erro: string }}
 */
function pontoOlhado(player) {
  const bloco = blocoOlhado(player);
  if (!bloco) return { erro: textos.SEM_BLOCO };
  if (bloco.isAir) return { erro: textos.BLOCO_AR };
  return { ponto: { d: bloco.dimension.id, x: bloco.location.x, y: bloco.location.y, z: bloco.location.z } };
}

/**
 * Marca o bloco olhado como entrada ou saída.
 * @param {Player} player
 * @param {"entrada" | "saida"} qual
 */
export function marcarPortalOlhando(player, qual) {
  if (!staffOuDono(player)) return false;
  const r = pontoOlhado(player);
  if ("erro" in r) return falha(player, r.erro);
  const uso = usoDoBloco(r.ponto, qual);
  if (uso) return falha(player, textos.BLOCO_EM_USO(uso));
  salvarPortais({ ...lerPortais(), [qual]: r.ponto });
  msg(player, textos.PORTAL_MARCADO(qual));
  return true;
}

/** @param {Player} player @param {"entrada" | "saida"} qual */
export function removerPortal(player, qual) {
  if (!staffOuDono(player)) return false;
  const p = { ...lerPortais() };
  delete p[qual];
  salvarPortais(p);
  return true;
}

/** Marca o bloco olhado como o lar de um objetivo (um bloco por objetivo). @param {Player} player @param {string} id */
export function marcarObjetivoOlhando(player, id) {
  if (!staffOuDono(player) || !objetivoPorId(id)) return false;
  const r = pontoOlhado(player);
  if ("erro" in r) return falha(player, r.erro);
  const uso = usoDoBloco(r.ponto, id);
  if (uso) return falha(player, textos.BLOCO_EM_USO(uso));
  salvarPontos({ ...lerPontos(), [id]: r.ponto });
  msg(player, textos.OBJETIVO_MARCADO(id));
  return true;
}

/** @param {Player} player @param {string} id */
export function removerObjetivo(player, id) {
  if (!staffOuDono(player)) return false;
  const { [id]: _fora, ...resto } = lerPontos();
  salvarPontos(resto);
  return true;
}

/**
 * Marca o ponto onde a staff está (pés) como ponto de aparição.
 * @param {Player} player
 * @param {string} tipo
 * @param {number} max
 * @param {string} [obj]
 */
export function adicionarPontoCriatura(player, tipo, max, obj) {
  if (!staffOuDono(player)) return false;
  if (!(tipo in CRIATURAS)) return false;
  const lista = lerCriaturas();
  if (lista.length >= MAX_PONTOS_CRIATURA) return falha(player, textos.PONTOS_LIMITE);
  const l = player.location;
  /** @type {PontoCriatura} */
  const ponto = { t: tipo, d: player.dimension.id, x: Math.floor(l.x), y: Math.floor(l.y) - 1, z: Math.floor(l.z), max };
  if (tipo === "sentinela" && obj && OBJETIVOS_ELITE.includes(obj)) ponto.obj = obj;
  salvarCriaturas([...lista, ponto]);
  return true;
}

/** @param {Player} player @param {number} i */
export function removerPontoCriatura(player, i) {
  if (!staffOuDono(player)) return false;
  const lista = lerCriaturas();
  if (!lista[i]) return false;
  salvarCriaturas(lista.filter((_, k) => k !== i));
  return true;
}

// ------------------------------------------------------------------------------------ números para o painel
/** Quantas pessoas já entraram e quantos fragmentos foram distribuídos (a soma dos progressos). */
export function estatisticas() {
  let entraram = 0;
  let fragmentos = 0;
  let concluiram = 0;
  for (const { dados } of todosJogadores()) {
    const e = dados.ecos;
    if (e.entrou) entraram++;
    fragmentos += e.frag;
    if (e.feitos.includes("E13")) concluiram++;
  }
  return { entraram, fragmentos, concluiram };
}

/**
 * Apaga o progresso do evento de uma pessoa (para testes). Só o dono pede. Fragmentos que já estão no inventário ficam.
 * @param {string} id
 */
export function resetarProgresso(id) {
  editarJogador(id, (d) => {
    d.ecos = { feitos: [], frag: 0, escolha: "", entrou: false };
    d.conquistas = d.conquistas.filter((c) => !c.startsWith("ecos_"));
  });
}
// a região atual (para o painel e os testes)
export { regiaoDoJogador };
