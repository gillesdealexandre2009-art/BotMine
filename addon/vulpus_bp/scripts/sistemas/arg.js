// @ts-check
// Mistério da Vulpus (ARG). O dono marca regiões (os capítulos do caminho: poço, lago, casa dos livros, caverna da luz,
// corredor e sala branca), o terminal da sala branca e a resposta secreta. Dentro das regiões o scoreboard e as coordenadas
// ficam corrompidos, o clima muda por capítulo e, na sala branca, o HUD some. Sair (tpa, morte, spawn ou andando) volta tudo
// ao normal. Aquele lugar "não existe" para o painel: não vira casa, não recebe teleporte e não entra no /voltar. O terminal
// da sala pede a resposta (guardada só como código); acertar dá a conquista e abre a porta para a SONHE.
import { Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { definirDetectorZona } from "../core/arg_zona.js";
import { definirDetectorFiltro } from "../core/filtro_tela.js";
import { config, dadosJogador, editarJogador, lerMundo, salvarMundo, todosJogadores } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, formatarCoords, ok, registrarErro } from "../core/util.js";
import * as textos from "../textos/arg.js";
import { NEVOAS } from "../textos/nevoas.js";
import { darConquista } from "./conquistas.js";
import * as sustos from "./pegadinhas.js";
import { online } from "../core/jogadores.js";
import { definirPortaFinal, menuIntervaloDono, painelEstragado } from "./intervalo.js";
import { marcarTelefone, zerarLigacao } from "./arg_telefone.js";

/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {{ d: string, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Regiao */
/** @typedef {{ regioes: (Regiao | null)[], nevoas: string[], claros: boolean[], filtros: boolean[], terminal?: Ponto, hash: string, destino?: Ponto, destinoSonhe?: Ponto, frase: string }} Dados */

const CHAVE = "vulpus:arg";
const CONQUISTA = "branco";
const TAG_SONHE = "vulpus:arg_sonhe";
const TAG_SEM_EFEITOS = "vulpus_arg_off";
const ID_NEVOA = "vulpus_arg";
const CICLO = 10;
/** Duração (ticks) da visão noturna da claridade total: longa, porque o jogo faz a tela PISCAR nos últimos 10 s do efeito. */
const DURACAO_CLARIDADE = 4800;
const SALA = 5;
const TREM = 6;
const CAMPO = 7;
const N = textos.CAPITULOS.length;

/** @type {Dados | undefined} */
let dados;
/** @type {Map<string, number>} id → capítulo em que a pessoa está agora (-1 = fora) */
const atual = new Map();
/** @type {Map<string, { i: number, ate: number }>} simulações do dono */
const simulacoes = new Map();
/** @type {Map<string, number>} id → posição na frase do corredor */
const notas = new Map();
/** @type {Map<string, { c1?: Ponto, c2?: Ponto }>} cantos que o dono está marcando (id|capítulo) */
const cantos = new Map();

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {(Regiao | null)[]} */
  const regioes = Array.from({ length: N }, (_, i) => {
    const r = Array.isArray(s.regioes) ? s.regioes[i] : null;
    return r && typeof r.d === "string" && [r.x1, r.y1, r.z1, r.x2, r.y2, r.z2].every((n) => Number.isFinite(n)) ? r : null;
  });
  const ponto = (/** @type {any} */ p) => (p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n)) ? { x: p.x, y: p.y, z: p.z, d: p.d } : undefined);
  const nevoas = Array.from({ length: N }, (_, i) => (Array.isArray(s.nevoas) && typeof s.nevoas[i] === "string" ? s.nevoas[i] : ""));
  // claridade total (visão noturna): padrão ligada na sala, no trem e no campo, desligada nos capítulos escuros
  const claros = Array.from({ length: N }, (_, i) => (Array.isArray(s.claros) && typeof s.claros[i] === "boolean" ? s.claros[i] : i >= SALA));
  // filtro de câmera antiga (grão, vinheta e tom rosado na tela): padrão ligado na sala, no trem e no campo
  const filtros = Array.from({ length: N }, (_, i) => (Array.isArray(s.filtros) && typeof s.filtros[i] === "boolean" ? s.filtros[i] : i >= SALA));
  dados = { regioes, nevoas, claros, filtros, terminal: ponto(s.terminal), hash: typeof s.hash === "string" ? s.hash : "", destino: ponto(s.destino), destinoSonhe: ponto(s.destinoSonhe), frase: typeof s.frase === "string" ? s.frase.slice(0, 40) : "" };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

// ------------------------------------------------------------------------------------ resposta (só em código)
/** Só letras e números, sem acento, minúsculo. @param {string} s */
export const normalizar = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Código curto da resposta (não é segredo militar: serve para não deixar a palavra à vista). @param {string} s */
export function codigo(s) {
  let a = 0x811c9dc5;
  let b = 5381;
  for (const ch of s) {
    a = Math.imul(a ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    b = (Math.imul(b, 33) + ch.charCodeAt(0)) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

// ------------------------------------------------------------------------------------ regiões
/** @param {Regiao} r @param {Ponto} p */
const dentro = (r, p) =>
  r.d === p.d &&
  p.x >= Math.min(r.x1, r.x2) &&
  p.x <= Math.max(r.x1, r.x2) + 1 &&
  p.y >= Math.min(r.y1, r.y2) &&
  p.y <= Math.max(r.y1, r.y2) + 1 &&
  p.z >= Math.min(r.z1, r.z2) &&
  p.z <= Math.max(r.z1, r.z2) + 1;

/** Capítulo da região que contém o ponto, ou -1. @param {Ponto} p */
function capituloDoPonto(p) {
  if (!config().argLigado) return -1;
  const { regioes } = lerDados();
  for (let i = 0; i < N; i++) {
    const r = regioes[i];
    if (r && dentro(r, p)) return i;
  }
  return -1;
}

definirDetectorZona((p) => capituloDoPonto(p) >= 0);

// barato (roda a cada ciclo do scoreboard): usa o capítulo já guardado pelo ciclo do mistério
definirDetectorFiltro((p) => {
  const i = atual.get(p.id) ?? -1;
  return i >= 0 && !!config().argLigado && !!lerDados().filtros[i];
});

/** Liga/desliga o filtro de câmera antiga de uma região e grava. @param {number} i @returns {boolean} o novo estado */
export function alternarFiltro(i) {
  lerDados().filtros[i] = !lerDados().filtros[i];
  gravar();
  return lerDados().filtros[i];
}

/** @param {Player} player */
function capituloDe(player) {
  const sim = simulacoes.get(player.id);
  if (sim) {
    if (system.currentTick < sim.ate) return sim.i;
    simulacoes.delete(player.id);
  }
  if (player.hasTag(TAG_SEM_EFEITOS)) return -1;
  const l = player.location;
  return capituloDoPonto({ x: l.x, y: l.y, z: l.z, d: player.dimension.id });
}

/** Capítulo em que a pessoa está agora (-1 = fora). @param {Player} player */
export const capituloAtual = (player) => atual.get(player.id) ?? -1;

// ------------------------------------------------------------------------------------ scoreboard corrompido
const GLIFOS_LIXO = "#%&?@!$*0123456789";
const rand = (/** @type {number} */ n) => Math.floor(Math.random() * n);

/** Estraga os números e algumas letras de uma linha, sem mexer nos códigos de cor nem nos glifos. @param {string} linha @param {number} pct */
function corromper(linha, pct) {
  const plano = linha.replace(/§./g, "");
  if (Math.random() < 0.04) return `§4§k${"x".repeat(Math.max(6, Math.min(20, plano.length)))}`;
  const coordenadas = /\d+\s+-?\d+\s+-?\d+/.test(plano);
  const prob = coordenadas ? Math.min(0.85, pct * 3.4) : pct;
  let saida = "";
  let cor = "";
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === "§" && i + 1 < linha.length) {
      const k = linha[i + 1];
      if (k !== "r" && k !== "k") cor = `§${k}`;
      saida += c + k;
      i++;
      continue;
    }
    if (/[0-9A-Za-z]/.test(c) && Math.random() < prob) {
      const r = Math.random();
      if (r < 0.45) saida += GLIFOS_LIXO[rand(GLIFOS_LIXO.length)];
      else if (r < 0.8) saida += `§k${c}§r${cor}`;
      else saida += c === "-" ? "+" : String(rand(10));
      continue;
    }
    if (c === "-" && coordenadas && Math.random() < 0.3) {
      saida += "?";
      continue;
    }
    saida += c;
  }
  return saida;
}

/** Intensidade da corrupção do painel dentro do Intervalo. */
const PCT_PAINEL_INTERVALO = 0.4;

/**
 * Chamado pelo scoreboard (hud.js): dentro do mistério as linhas saem corrompidas e, na sala branca, o HUD some.
 * @param {Player} player
 * @param {string[]} linhas
 * @returns {string[]}
 */
export function glitchHud(player, linhas) {
  // no Intervalo o painel do lado fica sempre estragado (números e letras trocados), para a pessoa não confiar nele
  if (painelEstragado(player)) return linhas.map((l) => corromper(l, PCT_PAINEL_INTERVALO));
  const i = atual.get(player.id) ?? -1;
  if (i < 0) return linhas;
  if (i === SALA || i === CAMPO) return ["§8§o...", i === CAMPO ? "§6§o...trigo..." : "§7§oVocê chegou.", "§8§o..."];
  const pct = Math.max(0, Math.min(1, config().argGlitchPct / 100));
  return linhas.map((l) => corromper(l, pct));
}

// ------------------------------------------------------------------------------------ capítulos
/** @param {Player} p */
const medroso = (p) => dadosJogador(p).ajustes.pegadinhas;

/** @param {Player} p @param {string} texto */
function narrar(p, texto) {
  try {
    p.sendMessage(texto);
  } catch (e) {
    registrarErro("ARG: mensagem", e);
  }
}

/** Id completo da névoa que vale neste capítulo ("" = nenhuma). @param {number} i */
function nevoaDoCapitulo(i) {
  const escolhida = lerDados().nevoas[i];
  if (escolhida === "nenhuma") return "";
  if (NEVOAS.some((n) => n.id === escolhida)) return `vulpus:nevoa_${escolhida}`;
  return i === 1 ? "minecraft:fog_soulsand_valley" : "";
}

/** @param {Player} p @param {string} id id completo da névoa */
function pushNevoa(p, id) {
  try {
    p.runCommand(`fog @s push ${id} "${ID_NEVOA}"`);
  } catch {
    // sem a névoa
  }
}

/** @param {Player} p */
function tirarNevoa(p) {
  try {
    p.runCommand(`fog @s remove "${ID_NEVOA}"`);
  } catch {
    // sem a névoa
  }
}

/** @param {Player} p @param {number} i */
function entrar(p, i) {
  const antes = dadosJogador(p).arg.cap;
  if (i <= antes) {
    editarJogador(p, (d) => {
      d.arg.cap = Math.max(d.arg.cap, i + 1);
    });
  }
  // a primeira vez que chega aqui conta a história; as outras só têm o clima
  if (antes <= i) {
    textos.FALAS[i].forEach((fala, k) => sustos.agendar(p, 40 + k * 90, () => narrar(p, fala)));
  }
  if (i === 0) {
    sustos.fade(p, [0, 0, 0], 0.15, 0.5, 0.5);
    sustos.tocarNela(p, "mob.warden.heartbeat", 1.2, 0.9);
    sustos.tremer(p, 0.2);
  } else if (i === 1) {
    sustos.tocarNela(p, "ambient.cave", 0.8, 0.6);
    if (medroso(p)) sustos.agendar(p, 220, () => sustos.aparecer(p, "olhos", "olhos"));
  } else if (i === 2) {
    if (medroso(p)) sustos.agendar(p, 160, () => sustos.sussurros(p));
  } else if (i === 3) {
    if (medroso(p)) sustos.agendar(p, 70, () => sustos.duplo(p));
  } else if (i === 4) {
    notas.set(p.id, 0);
    sustos.efeito(p, "darkness", 80, 0);
  } else if (i === SALA) {
    sustos.fade(p, [1, 1, 1], 0.1, 1, 1.4);
    sustos.tocarNela(p, "random.levelup", 0.6, 0.5);
  } else if (i === TREM) {
    sustos.tocarNela(p, "minecart.inside", 0.4, 0.8);
  } else if (i === CAMPO) {
    sustos.fade(p, [1, 0.95, 0.8], 0.1, 0.8, 1.6);
    sustos.tocarNela(p, "random.levelup", 0.5, 0.7);
  }
  if (lerDados().claros[i]) sustos.efeito(p, "night_vision", DURACAO_CLARIDADE, 0);
  // a névoa é cuidada por atualizarNevoa (degraus antes de entrar e depois de sair)
}

/** @param {Player} p @param {number} _i */
function sair(p, _i) {
  notas.delete(p.id);
  for (const e of ["darkness", "blindness", "night_vision"]) {
    try {
      p.removeEffect(e);
    } catch {
      // sem o efeito
    }
  }
}

/** Clima contínuo de cada capítulo (roda a cada ciclo). @param {Player} p @param {number} i @param {number} agora */
function ambiente(p, i, agora) {
  const cada = (/** @type {number} */ ticks) => agora % ticks < CICLO;
  // claridade total: renova a visão noturna (sem partículas), para a névoa clara não escurecer à noite
  if (lerDados().claros[i] && cada(200)) sustos.efeito(p, "night_vision", DURACAO_CLARIDADE, 0);
  if (i === 0 && cada(30)) sustos.tocarNela(p, "mob.warden.heartbeat", 0.9, 1);
  else if (i === 1 && cada(220)) sustos.tocarNela(p, "ambient.cave", 0.5, aleatorioTom());
  else if (i === 2) {
    if (cada(90)) sustos.tocar(p, "dig.wood", sustos.relativo(p, 3 + rand(5), rand(360)), 0.6, 0.6);
    if (cada(400) && medroso(p)) sustos.sussurros(p);
  } else if (i === 3 && cada(40)) sustos.tocarNela(p, "mob.warden.heartbeat", 0.8, 1);
  else if (i === TREM) {
    if (cada(40)) sustos.tocarNela(p, "minecart.inside", 0.35, 0.8);
    if (cada(600) && medroso(p)) sustos.sussurros(p);
  } else if (i === CAMPO) {
    if (cada(70)) sustos.tocar(p, "dig.grass", sustos.relativo(p, 2 + rand(6), rand(360)), 0.35, 0.8);
    if (cada(520)) sustos.tocarNela(p, "note.flute", 0.25, 0.7);
  }
  else if (i === 4) {
    if (cada(80)) sustos.efeito(p, "darkness", 60, 0);
    const frase = lerDados().frase;
    if (frase && cada(24)) {
      const k = notas.get(p.id) ?? 0;
      const letra = frase[k % frase.length];
      const idx = letra >= "a" && letra <= "z" ? letra.charCodeAt(0) - 97 : 0;
      sustos.tocarNela(p, "note.harp", 0.7, 0.5 + idx * 0.0577);
      notas.set(p.id, (k + 1) % frase.length);
    }
    if (cada(500) && medroso(p)) sustos.sussurros(p);
  }
}

const aleatorioTom = () => 0.5 + Math.random() * 0.3;

// ------------------------------------------------------------------------------------ névoa em degraus
/** Até quantos blocos fora da região a névoa já começa a fechar (e demora a abrir ao sair). */
const MARGEM_NEVOA = 10;
/** @type {Map<string, { id: string, nivel: number }>} id da pessoa → névoa aplicada agora (id "" = nenhuma) */
const nevoaAplicada = new Map();
/** @type {Map<string, { i: number, ate: number }>} teste da névoa pelo painel do dono */
const nevoaTeste = new Map();

/** Distância (blocos) de um ponto até a caixa da região (0 = dentro). @param {Regiao} r @param {Ponto} p */
function distanciaDaRegiao(r, p) {
  if (r.d !== p.d) return Infinity;
  const folga = (/** @type {number} */ v, /** @type {number} */ a, /** @type {number} */ b) => Math.max(Math.min(a, b) - v, 0, v - (Math.max(a, b) + 1));
  return Math.hypot(folga(p.x, r.x1, r.x2), folga(p.y, r.y1, r.y2), folga(p.z, r.z1, r.z2));
}

/**
 * Que névoa a pessoa deve ter agora: a da região em que está (degrau 3) ou a da região mais próxima, em degraus que fecham aos
 * poucos (1 = 10 a 5 blocos, 2 = 5 a 0 blocos). undefined = nenhuma.
 * @param {Player} p
 * @returns {{ i: number, nivel: number } | undefined}
 */
function nevoaDesejada(p) {
  const dentro = atual.get(p.id) ?? -1;
  if (dentro >= 0) return { i: dentro, nivel: 3 };
  const teste = nevoaTeste.get(p.id);
  if (teste) {
    if (system.currentTick < teste.ate) return { i: teste.i, nivel: 3 };
    nevoaTeste.delete(p.id);
  }
  if (!config().argLigado || p.hasTag(TAG_SEM_EFEITOS)) return undefined;
  const l = p.location;
  const ponto = { x: l.x, y: l.y, z: l.z, d: p.dimension.id };
  /** @type {{ i: number, d: number } | undefined} */
  let melhor;
  lerDados().regioes.forEach((r, i) => {
    if (!r) return;
    const d = distanciaDaRegiao(r, ponto);
    if (d <= MARGEM_NEVOA && (!melhor || d < melhor.d)) melhor = { i, d };
  });
  if (!melhor) return undefined;
  const aplicada = nevoaAplicada.get(p.id);
  // um pouco de folga ao afastar, para o degrau não ficar trocando na beirada
  const folga = aplicada && aplicada.nivel > 0 ? 1 : 0;
  return { i: melhor.i, nivel: melhor.d <= 5 + folga ? 2 : 1 };
}

/** Id da névoa de um capítulo num degrau (só as névoas do pacote têm degraus). @param {number} i @param {number} nivel */
function idDaNevoa(i, nivel) {
  const base = nevoaDoCapitulo(i);
  if (!base) return "";
  if (nivel >= 3) return base;
  return base.startsWith("vulpus:nevoa_") ? `${base}_t${nivel}` : "";
}

/** @param {Player} p */
function atualizarNevoa(p) {
  const quer = nevoaDesejada(p);
  const id = quer ? idDaNevoa(quer.i, quer.nivel) : "";
  const agora = nevoaAplicada.get(p.id);
  if ((agora?.id ?? "") === id) return;
  tirarNevoa(p);
  if (id) pushNevoa(p, id);
  nevoaAplicada.set(p.id, { id, nivel: quer?.nivel ?? 0 });
}

system.runInterval(() => {
  try {
    const agora = system.currentTick;
    for (const p of online()) {
      if (!p.isValid) continue;
      const z = capituloDe(p);
      const antes = atual.get(p.id) ?? -1;
      if (z !== antes) {
        if (antes >= 0) sair(p, antes);
        atual.set(p.id, z);
        if (z >= 0) entrar(p, z);
      }
      if (z >= 0) ambiente(p, z, agora);
      atualizarNevoa(p);
    }
  } catch (e) {
    registrarErro("ARG: ciclo", e);
  }
}, CICLO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  atual.delete(playerId);
  nevoaAplicada.delete(playerId);
  notas.delete(playerId);
  simulacoes.delete(playerId);
});

// a névoa do mistério nunca fica para trás
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  tirarNevoa(player);
  nevoaAplicada.delete(player.id);
});

// ------------------------------------------------------------------------------------ terminal
const TENTATIVAS = () => Math.max(1, Math.floor(config().argTentativas));

/** @param {Player} player */
function abrirPorta(player) {
  const d = lerDados().destino;
  if (!d) {
    narrar(player, textos.SEM_PORTA);
    return;
  }
  narrar(player, textos.FRASE_PORTA);
  sustos.agendar(player, 60, () => {
    sustos.fade(player, [1, 1, 1], 0.5, 0.8, 0.8);
    sustos.agendar(player, 14, () => {
      try {
        player.teleport({ x: d.x, y: d.y, z: d.z }, { dimension: world.getDimension(d.d) });
      } catch (e) {
        registrarErro("ARG: porta", e);
      }
    });
  });
}

/** Destino da porta final (a SONHE), marcado pelo dono. */
export const destinoSonhe = () => lerDados().destinoSonhe;

/**
 * A porta dos nomes do Intervalo se abriu: leva a pessoa à SONHE (ou avisa que ela ainda dorme).
 * @param {Player} player
 */
export function abrirPortaSonhe(player) {
  const d = lerDados().destinoSonhe;
  try {
    player.addTag(TAG_SONHE);
  } catch {
    // sem a tag
  }
  if (!d) {
    narrar(player, textos.SEM_PORTA_SONHE);
    return;
  }
  narrar(player, textos.FRASE_PORTA_SONHE);
  sustos.agendar(player, 60, () => {
    sustos.fade(player, [1, 1, 1], 0.5, 0.8, 0.8);
    sustos.agendar(player, 14, () => {
      try {
        player.teleport({ x: d.x, y: d.y, z: d.z }, { dimension: world.getDimension(d.d) });
      } catch (e) {
        registrarErro("ARG: porta final", e);
      }
    });
  });
}

// a porta dos nomes do Intervalo chama a porta final (a SONHE)
definirPortaFinal(abrirPortaSonhe);

/** @param {Player} player */
function acertou(player) {
  editarJogador(player, (d) => {
    d.arg.fim = true;
    d.arg.tent = 0;
    d.arg.ate = 0;
  });
  darConquista(player, CONQUISTA);
  textos.ACERTOU.forEach((l, k) => sustos.agendar(player, k * 55, () => narrar(player, l)));
  sustos.agendar(player, 20, () => {
    mostrarTitulo(player, textos.TITULO_FIM, { subtitulo: textos.SUB_FIM, entrada: 10, fica: 80, saida: 30 });
    sustos.tocarNela(player, "random.levelup", 1, 0.6);
  });
  sustos.agendar(player, textos.ACERTOU.length * 55 + 20, () => abrirPorta(player));
}

/** @param {Player} player */
async function terminal(player) {
  if (!config().argLigado) return;
  const cfg = lerDados();
  const dj = dadosJogador(player).arg;
  if (capituloDe(player) !== SALA || dj.cap < SALA + 1) {
    narrar(player, textos.SO_NA_SALA);
    return;
  }
  if (dj.fim) {
    narrar(player, textos.JA_PASSOU);
    abrirPorta(player);
    return;
  }
  if (dj.ate > Date.now()) {
    narrar(player, textos.BLOQUEADO(Math.max(1, Math.ceil((dj.ate - Date.now()) / 60000))));
    return;
  }
  if (!cfg.hash) {
    narrar(player, textos.SO_NA_SALA);
    return;
  }
  const r = await perguntar(player, textos.TITULO_TERMINAL, [{ tipo: "texto", rotulo: textos.ROTULO_TERMINAL, dica: textos.DICA_TERMINAL }]);
  if (!r || typeof r[0] !== "string") return;
  if (codigo(normalizar(r[0])) === cfg.hash) {
    acertou(player);
    return;
  }
  const max = TENTATIVAS();
  const feitas = dj.tent + 1;
  if (feitas >= max) {
    editarJogador(player, (d) => {
      d.arg.tent = 0;
      d.arg.ate = Date.now() + Math.max(0, config().argEsperaMin) * 60000;
    });
    narrar(player, textos.ERROU_FIM);
    sustos.tocarNela(player, "mob.warden.heartbeat", 1.4, 0.8);
  } else {
    editarJogador(player, (d) => {
      d.arg.tent = feitas;
    });
    narrar(player, textos.ERROU(max - feitas));
    sustos.tocarNela(player, "note.bass", 1, 0.5);
  }
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const t = lerDados().terminal;
    if (!t || !ev.isFirstEvent) return;
    const b = ev.block;
    if (b.dimension.id !== t.d || b.location.x !== t.x || b.location.y !== t.y || b.location.z !== t.z) return;
    if (ehDono(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => {
      terminal(player).catch((e) => registrarErro("ARG: terminal", e));
    });
  } catch (e) {
    registrarErro("ARG: interação", e);
  }
});

// ------------------------------------------------------------------------------------ painel do dono
export function estadoArg() {
  const d = lerDados();
  const jogadores = todosJogadores();
  return {
    regioes: d.regioes.filter(Boolean).length,
    terminal: !!d.terminal,
    resposta: !!d.hash,
    destino: !!d.destino,
    comecaram: jogadores.filter((j) => j.dados.arg.cap > 0).length,
    passaram: jogadores.filter((j) => j.dados.arg.fim).length,
  };
}

/** @param {Player} p */
const soDono = (p) => {
  if (ehDono(p)) return true;
  erro(p, "Só dono mexe no mistério.");
  return false;
};

/** @param {Player} player @param {() => any} [voltar] */
export async function menuArg(player, voltar) {
  if (!soDono(player)) return;
  const aqui = () => menuArg(player, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!soDono(p)) return;
    await fn(p);
    await aqui();
  };
  const efeitosLigados = !player.hasTag(TAG_SEM_EFEITOS);
  await new Lista(textos.TITULO_PAINEL)
    .texto(textos.CORPO_PAINEL(estadoArg()))
    .botao(textos.BOTAO_REGIOES, ICONES.spawn, (p) => menuRegioes(p, aqui))
    .botao(textos.BOTAO_TERMINAL, ICONES.spawn, eVolta((p) => marcarTerminal(p)))
    .botao(textos.BOTAO_RESPOSTA, ICONES.apelido, eVolta((p) => definirResposta(p)))
    .botao(textos.BOTAO_DESTINO, ICONES.spawn, eVolta((p) => marcarDestino(p)))
    .botao(textos.BOTAO_DESTINO_LIMPAR, ICONES.nao, eVolta((p) => limparDestino(p)))
    .botao(textos.BOTAO_TELEFONE, ICONES.spawn, eVolta((p) => marcarTelefone(p)))
    .botao(textos.BOTAO_DESTINO_SONHE, ICONES.spawn, eVolta((p) => marcarDestinoSonhe(p)))
    .botao(textos.BOTAO_DESTINO_SONHE_LIMPAR, ICONES.nao, eVolta((p) => limparDestinoSonhe(p)))
    .botao(textos.BOTAO_INTERVALO, ICONES.mundo, (p) => menuIntervaloDono(p, aqui))
    .botao(textos.BOTAO_REENVIAR_LIGACAO, ICONES.nao, eVolta((p) => {
      zerarLigacao(p);
      ok(p, textos.LIGACAO_ZERADA);
    }))
    .botao(textos.BOTAO_FRASE, ICONES.apelido, eVolta((p) => definirFrase(p)))
    .botao(textos.BOTAO_PROGRESSO, ICONES.perfil, (p) => menuProgresso(p, aqui))
    .botao(textos.BOTAO_SIMULAR, ICONES.spawn, (p) => menuSimular(p, aqui))
    .botao(
      textos.BOTAO_EFEITOS_EM_MIM(efeitosLigados),
      ICONES.ajustes,
      eVolta((p) => {
        if (p.hasTag(TAG_SEM_EFEITOS)) p.removeTag(TAG_SEM_EFEITOS);
        else p.addTag(TAG_SEM_EFEITOS);
      }),
    )
    .voltar(voltar)
    .abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuRegioes(player, voltar) {
  if (!soDono(player)) return;
  const aqui = () => menuRegioes(player, voltar);
  const lista = new Lista(textos.TITULO_REGIOES);
  textos.CAPITULOS.forEach((c, i) => lista.botao(textos.BOTAO_REGIAO(c.nome, !!lerDados().regioes[i]), ICONES.spawn, (p) => menuRegiao(p, i, aqui)));
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {number} i @param {() => any} voltar */
async function menuRegiao(player, i, voltar) {
  if (!soDono(player)) return;
  const aqui = () => menuRegiao(player, i, voltar);
  const nome = textos.CAPITULOS[i].nome;
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!soDono(p)) return;
    await fn(p);
    await aqui();
  };
  await new Lista(textos.TITULO_REGIAO(nome))
    .botao(textos.BOTAO_CANTO1, ICONES.spawn, eVolta((p) => marcarCanto(p, i, 1)))
    .botao(textos.BOTAO_CANTO2, ICONES.spawn, eVolta((p) => marcarCanto(p, i, 2)))
    .botao(
      textos.BOTAO_CAIXA,
      ICONES.spawn,
      eVolta(async (p) => {
        const r = await perguntar(p, nome, [
          { tipo: "numero", rotulo: textos.ROTULO_RAIO_XZ, padrao: 8, min: 1, max: 200 },
          { tipo: "numero", rotulo: textos.ROTULO_RAIO_Y, padrao: 6, min: 1, max: 200 },
        ]);
        if (r) caixaEmVolta(p, i, Number(r[0]), Number(r[1]));
      }),
    )
    .botao(textos.BOTAO_NEVOA(nomeDaNevoa(lerDados().nevoas[i])), ICONES.ajustes, (p) => menuNevoa(p, i, aqui))
    .botao(
      textos.BOTAO_CLARIDADE(lerDados().claros[i]),
      ICONES.ajustes,
      eVolta((p) => {
        lerDados().claros[i] = !lerDados().claros[i];
        gravar();
        ok(p, textos.CLARIDADE_MUDOU(lerDados().claros[i]));
      }),
    )
    .botao(
      textos.BOTAO_FILTRO(lerDados().filtros[i]),
      ICONES.ajustes,
      eVolta((p) => ok(p, textos.FILTRO_MUDOU(alternarFiltro(i)))),
    )
    .botao(textos.BOTAO_REMOVER_REGIAO, ICONES.nao, eVolta((p) => removerRegiao(p, i)))
    .voltar(voltar)
    .abrir(player);
}

/** @param {Player} p */
const pontoDe = (p) => ({ x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z), d: p.dimension.id });

/** @param {Player} p @param {number} i @param {1 | 2} qual */
function marcarCanto(p, i, qual) {
  const chave = `${p.id}|${i}`;
  const par = cantos.get(chave) ?? {};
  const pt = pontoDe(p);
  if (qual === 1) par.c1 = pt;
  else par.c2 = pt;
  cantos.set(chave, par);
  ok(p, textos.CANTO_MARCADO(textos.CAPITULOS[i].nome, formatarCoords(pt)));
  if (par.c1 && par.c2 && par.c1.d === par.c2.d) {
    lerDados().regioes[i] = { d: par.c1.d, x1: par.c1.x, y1: par.c1.y, z1: par.c1.z, x2: par.c2.x, y2: par.c2.y, z2: par.c2.z };
    gravar();
    cantos.delete(chave);
    ok(p, textos.REGIAO_PRONTA(textos.CAPITULOS[i].nome));
  }
}

/** @param {Player} p @param {number} i @param {number} rxz @param {number} ry */
function caixaEmVolta(p, i, rxz, ry) {
  const c = pontoDe(p);
  lerDados().regioes[i] = { d: c.d, x1: c.x - rxz, y1: c.y - ry, z1: c.z - rxz, x2: c.x + rxz, y2: c.y + ry, z2: c.z + rxz };
  gravar();
  ok(p, textos.REGIAO_PRONTA(textos.CAPITULOS[i].nome));
}

/** @param {Player} p @param {number} i */
function removerRegiao(p, i) {
  lerDados().regioes[i] = null;
  gravar();
  ok(p, textos.REGIAO_REMOVIDA(textos.CAPITULOS[i].nome));
}

/** @param {Player} p */
function marcarTerminal(p) {
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = p.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) {
    erro(p, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().terminal = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  gravar();
  ok(p, textos.TERMINAL_MARCADO(formatarCoords(b)));
}

/** @param {Player} p */
async function definirResposta(p) {
  const r = await perguntar(p, textos.TITULO_RESPOSTA, [{ tipo: "texto", rotulo: textos.ROTULO_RESPOSTA, dica: "" }]);
  if (!r) return;
  const n = normalizar(String(r[0] ?? ""));
  if (!n) {
    erro(p, textos.RESPOSTA_VAZIA);
    return;
  }
  lerDados().hash = codigo(n);
  gravar();
  ok(p, textos.RESPOSTA_GRAVADA);
}

/** @param {Player} p */
function marcarDestino(p) {
  const pt = pontoDe(p);
  lerDados().destino = { x: pt.x + 0.5, y: pt.y, z: pt.z + 0.5, d: pt.d };
  gravar();
  ok(p, textos.DESTINO_MARCADO(formatarCoords(pt)));
}

/** @param {Player} p */
function marcarDestinoSonhe(p) {
  const pt = pontoDe(p);
  lerDados().destinoSonhe = { x: pt.x + 0.5, y: pt.y, z: pt.z + 0.5, d: pt.d };
  gravar();
  ok(p, textos.DESTINO_SONHE_MARCADO(formatarCoords(pt)));
}

/** @param {Player} p */
function limparDestinoSonhe(p) {
  lerDados().destinoSonhe = undefined;
  gravar();
  ok(p, textos.DESTINO_SONHE_LIMPO);
}

/** @param {Player} p */
function limparDestino(p) {
  lerDados().destino = undefined;
  gravar();
  ok(p, textos.DESTINO_LIMPO);
}

/** @param {Player} p */
async function definirFrase(p) {
  const r = await perguntar(p, textos.TITULO_FRASE, [{ tipo: "texto", rotulo: textos.ROTULO_FRASE, dica: "", padrao: lerDados().frase }]);
  if (!r) return;
  lerDados().frase = normalizar(String(r[0] ?? "")).slice(0, 40);
  gravar();
  ok(p, textos.FRASE_GRAVADA);
}

/** @param {Player} player @param {() => any} voltar */
async function menuProgresso(player, voltar) {
  if (!soDono(player)) return;
  const jogadores = todosJogadores().filter((j) => j.dados.arg.cap > 0).sort((a, b) => b.dados.arg.cap - a.dados.arg.cap);
  const corpo = jogadores.length ? jogadores.map((j) => textos.LINHA_PROGRESSO(j.dados.nome || "?", j.dados.arg.cap, j.dados.arg.fim)).join("\n") : textos.SEM_PROGRESSO;
  await new Lista(textos.TITULO_PROGRESSO)
    .texto(corpo)
    .botao(textos.BOTAO_ZERAR_TODOS, ICONES.nao, async (p) => {
      if (!soDono(p)) return;
      if (await confirmar(p, { titulo: textos.BOTAO_ZERAR_TODOS, texto: textos.CONFIRMAR_ZERAR })) zerarTodos(p);
      await menuProgresso(p, voltar);
    })
    .voltar(voltar)
    .abrir(player);
}

/** @param {Player} p */
function zerarTodos(p) {
  for (const j of todosJogadores()) {
    if (j.dados.arg.cap > 0 || j.dados.arg.fim || j.dados.arg.tent > 0) {
      editarJogador(j.id, (d) => {
        d.arg = { cap: 0, tent: 0, ate: 0, fim: false };
      });
    }
  }
  ok(p, textos.ZERADO);
}

/** @param {Player} player @param {() => any} voltar */
async function menuSimular(player, voltar) {
  if (!soDono(player)) return;
  const lista = new Lista(textos.BOTAO_SIMULAR);
  textos.CAPITULOS.forEach((c, i) =>
    lista.botao(c.nome, ICONES.spawn, (p) => {
      if (!soDono(p)) return;
      simulacoes.set(p.id, { i, ate: system.currentTick + 1200 });
      ok(p, textos.SIMULANDO(c.nome));
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/** @param {string} id */
function nomeDaNevoa(id) {
  if (id === "nenhuma") return textos.NEVOA_NENHUMA;
  return NEVOAS.find((n) => n.id === id)?.nome ?? textos.NEVOA_PADRAO;
}

/** @param {Player} player @param {number} i @param {() => any} voltar */
async function menuNevoa(player, i, voltar) {
  if (!soDono(player)) return;
  const aqui = () => menuNevoa(player, i, voltar);
  const atual = lerDados().nevoas[i];
  /** @param {string} id */
  const escolher = (id) => async (/** @type {Player} */ p) => {
    if (!soDono(p)) return;
    lerDados().nevoas[i] = id;
    gravar();
    ok(p, textos.NEVOA_DEFINIDA(nomeDaNevoa(id)));
    await aqui();
  };
  const lista = new Lista(textos.TITULO_NEVOA)
    .texto(textos.CORPO_NEVOA)
    .botao(`${textos.NEVOA_PADRAO}${atual === "" ? " §a✔" : ""}`, ICONES.ajustes, escolher(""))
    .botao(`${textos.NEVOA_NENHUMA}${atual === "nenhuma" ? " §a✔" : ""}`, ICONES.ajustes, escolher("nenhuma"));
  for (const n of NEVOAS) lista.botao(textos.BOTAO_NEVOA_OPCAO(n.nome, n.ajuda, atual === n.id), ICONES.ajustes, escolher(n.id));
  lista.botao(textos.BOTAO_NEVOA_TESTE, ICONES.spawn, async (p) => {
    if (!soDono(p)) return;
    nevoaTeste.set(p.id, { i, ate: system.currentTick + 600 });
    atualizarNevoa(p);
    ok(p, textos.NEVOA_TESTANDO);
    await aqui();
  });
  await lista.voltar(voltar).abrir(player);
}
