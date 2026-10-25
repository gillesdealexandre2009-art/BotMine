// @ts-check
// Dimensão "Ecos dos Ausentes" (vulpus:ecos): registro, construção do mapa (feita UMA vez, antes do evento, por botão da staff:
// aos poucos, com área de ticking temporária, retomável) e a atmosfera de dentro (fog por região, sons e partículas discretos).
// Quem decide quando abre, quem entra e os objetivos é o sistemas/ecos.js; aqui só há o "lugar".
import { system, world } from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import { erro, ok, registrarErro, som } from "../core/util.js";
import { CAIXA, CHEGADA, construir, FASES_MAPA, MAPA_INTERNO, REG } from "./ecos_mapa_novo.js";
import { PincelMundo, PincelRecortado } from "./obras_pincel.js";
import { localSpawn } from "./spawn.js";
import * as textos from "../textos/ecos.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {{ x: number, y: number, z: number }} Ponto3 */

export const DIM_ECOS = "vulpus:ecos";
const CHAVE_CONSTRUIDO = "vulpus:ecos:construido";
/** etapas já prontas = janela * nº de fases + fase (o plano por janelas trocou a chave: o progresso antigo, por fase, não vale) */
const CHAVE_PROGRESSO = "vulpus:ecos:etapa";
const CHAVE_ORIGEM = "vulpus:ecos:origem";
/** prefixo das áreas de ticking da obra (todas as que começam assim são nossas e se soltam sempre) */
const PREFIXO_AREA = "vulpus_ecos_obra";
/** nomes de versões antigas da obra (3 e 5 fatias), soltos também */
const AREAS_ANTIGAS = ["a", "b", "c", "d", "e"].map((x) => PREFIXO_AREA + "_" + x);
/**
 * A obra roda em JANELAS: faixas de x da CAIXA, uma de cada vez. O mundo tem um limite de chunks de ticking SOMADOS (300 no BDS,
 * contando as áreas dos outros sistemas), e a caixa inteira (mapa + floresta + céu, ~350 chunks) não cabe. Cada janela abre uma
 * só área de ticking (~84 chunks), roda TODAS as fases com o pincel recortado nela, e solta a área antes da próxima.
 */
export const JANELAS = 6;
/** O jogo corta fillBlocks acima de 32768 blocos por chamada. */
const MAX_BLOCOS_FILL = 30000;
const ORIGEM_PADRAO = Object.freeze({ x: 10000, y: 80, z: 10000 });
/** Conferências de atmosfera (ticks). Nada roda se não há ninguém na dimensão. */
const PASSO_FOG = 20;
const PASSO_VISAO = 200;
const PASSO_SOM = 40;
const PASSO_PARTICULAS = 40;

/** Ajustes dos testes (orçamento da construção em ms por tick). */
export const ajustes = { orcamentoMs: 10 };

// ------------------------------------------------------------------------------------ registro da dimensão
let dimensaoRegistrada = false;
let erroDimensao = "";
// A dimensão só pode ser registrada na partida do sistema (startup).
system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
  if (!dimensionRegistry) return;
  try {
    dimensionRegistry.registerCustomDimension(DIM_ECOS);
    dimensaoRegistrada = true;
  } catch (e) {
    erroDimensao = String(e);
  }
});

/** A dimensão, ou undefined se o mundo não a tem. */
export function dimEcos() {
  try {
    return world.getDimension(DIM_ECOS);
  } catch {
    return undefined;
  }
}

/** Para o diagnóstico. */
export const diagnosticoEcos = () => ({ registrada: dimensaoRegistrada, erro: erroDimensao, pronta: !!dimEcos() });

/** @param {Player} p */
export const naDimensao = (p) => p.dimension.id === DIM_ECOS;

/** Quem está lá dentro agora (só pergunta à dimensão, não ao mundo todo). @returns {Player[]} */
export function jogadoresNosEcos() {
  try {
    return dimEcos()?.getPlayers() ?? [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------------------------ origem e chegada
export const ecosConstruido = () => lerMundo(CHAVE_CONSTRUIDO, false) === true;

/** Quantas fases do mapa já estão prontas (para retomar). */
export function fasesProntas() {
  const n = lerMundo(CHAVE_PROGRESSO, 0);
  return Number.isInteger(n) && n >= 0 && n <= etapasTotais() ? n : 0;
}

/** Total de etapas da obra (janelas x fases). */
export const etapasTotais = () => JANELAS * FASES_MAPA.length;

/** As janelas da obra: faixas de x (relativas à origem) que cobrem a CAIXA, com a caixa inteira em z. @returns {{ x1: number, x2: number, z1: number, z2: number }[]} */
export function janelasDaObra() {
  const w = Math.ceil((CAIXA.x2 - CAIXA.x1 + 1) / JANELAS);
  return Array.from({ length: JANELAS }, (_, i) => ({ x1: CAIXA.x1 + i * w, x2: Math.min(CAIXA.x2, CAIXA.x1 + (i + 1) * w - 1), z1: CAIXA.z1, z2: CAIXA.z2 }));
}

/** @returns {Ponto3} */
export function origemEcos() {
  const o = lerMundo(CHAVE_ORIGEM, ORIGEM_PADRAO);
  return o && [o.x, o.y, o.z].every((n) => Number.isInteger(n)) ? { x: o.x, y: o.y, z: o.z } : { ...ORIGEM_PADRAO };
}

/** Onde a pessoa aparece ao entrar: o Limiar (coordenadas do mapa). @returns {{ x: number, y: number, z: number, d: string, ry: number }} */
export function chegadaEcos() {
  const o = origemEcos();
  return { x: o.x + CHEGADA.x + 0.5, y: o.y + CHEGADA.y, z: o.z + CHEGADA.z + 0.5, d: DIM_ECOS, ry: -90 };
}

/** Posição relativa ao mapa (para as marcações em coordenadas do mapa, se um dia precisar). @param {Ponto3} p */
export const relativoAoMapa = (p) => {
  const o = origemEcos();
  return { x: Math.floor(p.x) - o.x, y: Math.floor(p.y) - o.y, z: Math.floor(p.z) - o.z };
};

/**
 * @param {Player} player
 * @returns {typeof REG[number] | undefined}
 */
export function regiaoDoJogador(player) {
  if (!naDimensao(player)) return undefined;
  const { x, z } = relativoAoMapa(player.location);
  const reg = REG.find((r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2);
  // as passagens entre as áreas (dentro do mapa original) não são "bosque"
  if (reg?.id === "bosque" && x >= MAPA_INTERNO.x1 && x <= MAPA_INTERNO.x2 && z >= MAPA_INTERNO.z1 && z <= MAPA_INTERNO.z2) return undefined;
  return reg;
}

/** Devolve uma pessoa ao spawn do mundo (sem as regras de teleporte: é uma saída forçada). @param {Player} player */
export function mandarParaSpawn(player) {
  try {
    const s = localSpawn();
    if (s) player.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension(s.d) });
    else {
      const d = world.getDefaultSpawnLocation();
      player.teleport({ x: d.x + 0.5, y: Math.max(d.y, 64), z: d.z + 0.5 }, { dimension: world.getDimension("minecraft:overworld") });
    }
    return true;
  } catch (e) {
    registrarErro("Ecos: mandar para o spawn", e);
    return false;
  }
}

// ------------------------------------------------------------------------------------ construção
/** @type {{ ocupado: boolean, fase: string, pct: number, falhas: number }} */
const cons = { ocupado: false, fase: "", pct: 0, falhas: 0 };

/** Estado para o painel e os testes. */
export const estadoConstrucao = () => ({
  ocupado: cons.ocupado,
  fase: cons.fase,
  pct: Math.round(cons.pct * 100),
  falhas: cons.falhas,
  prontas: fasesProntas(),
  total: etapasTotais(),
  construido: ecosConstruido(),
});

/** chunks que uma caixa ocupa (o limite do mundo é em chunks somados) @param {{ x1: number, x2: number, z1: number, z2: number }} f @param {Ponto3} o */
const chunksDa = (f, o) => (Math.floor((o.x + f.x2) / 16) - Math.floor((o.x + f.x1) / 16) + 1) * (Math.floor((o.z + f.z2) / 16) - Math.floor((o.z + f.z1) / 16) + 1);

/** @param {{ x1: number, x2: number, z1: number, z2: number }} f @param {Ponto3} o */
const caixaDaArea = (f, o) => ({
  from: { x: o.x + f.x1, y: Math.max(-64, o.y + CAIXA.y1 - 1), z: o.z + f.z1 },
  to: { x: o.x + f.x2, y: Math.min(319, o.y + CAIXA.y2 + 1), z: o.z + f.z2 },
});

/**
 * Abre UMA área de ticking para a faixa. Nunca lança: devolve o motivo (e se foi o limite de chunks).
 * @param {Dimension} dim @param {Ponto3} o @param {{ x1: number, x2: number, z1: number, z2: number }} faixa
 * @returns {Promise<{ ok: boolean, limite: boolean, erro: string, chunks: number }>}
 */
async function abrirArea(dim, o, faixa) {
  const g = world.tickingAreaManager;
  const chunks = chunksDa(faixa, o);
  const caixa = caixaDaArea(faixa, o);
  try {
    // quando o jogo sabe responder, pergunta antes (o erro de limite só aparece depois de pedir)
    const temCapacidade = /** @type {any} */ (g).hasCapacity;
    if (typeof temCapacidade === "function" && !temCapacidade.call(g, { dimension: dim, ...caixa })) {
      const max = /** @type {any} */ (g).maxChunkCount;
      return { ok: false, limite: true, erro: "sem capacidade para " + chunks + " chunks (limite de " + (max ?? "?") + " somados no mundo)", chunks };
    }
  } catch {
    // sem a pergunta: o pedido de verdade decide
  }
  try {
    await g.createTickingArea(PREFIXO_AREA + "_" + Math.abs(faixa.x1), { dimension: dim, ...caixa });
    return { ok: true, limite: false, erro: "", chunks };
  } catch (e) {
    const msg = String(e);
    return { ok: false, limite: /limit|OverChunkLimit|capacity/i.test(msg), erro: msg, chunks };
  }
}

/** Solta as áreas de ticking da obra (também ao ligar o mundo e antes de cada janela: elas sobrevivem a um reinício). */
export function soltarAreas() {
  const g = world.tickingAreaManager;
  /** @type {Set<string>} */
  const nomes = new Set(AREAS_ANTIGAS);
  try {
    for (const a of /** @type {any} */ (g).getAllTickingAreas?.() ?? []) if (String(a.identifier).startsWith(PREFIXO_AREA)) nomes.add(a.identifier);
  } catch (e) {
    registrarErro("Ecos: listar áreas de ticking", e);
  }
  for (const nome of nomes) {
    try {
      if (g.getTickingArea(nome)) g.removeTickingArea(nome);
    } catch (e) {
      registrarErro("Ecos: soltar " + nome, e);
    }
  }
}
world.afterEvents.worldLoad.subscribe(() => {
  (erroDimensao ? console.warn : console.log)("[Vulpus] Ecos: dimensão " + (dimEcos() ? "disponível" : "indisponível") + (erroDimensao ? " (" + erroDimensao + ")" : ""));
  if (!dimEcos()) return;
  if (!cons.ocupado) soltarAreas();
});

/** @param {Dimension} dim @param {Ponto3[]} pontos @param {number} tentativas @param {(ok: boolean) => void} aoFim */
function esperarCarga(dim, pontos, tentativas, aoFim) {
  let n = 0;
  const confere = () => {
    let pronto = false;
    try {
      pronto = pontos.every((p) => dim.isChunkLoaded(p) && !!dim.getBlock(p));
    } catch {
      pronto = false;
    }
    if (pronto) return aoFim(true);
    if (++n >= tentativas) return aoFim(false);
    system.runTimeout(confere, 4);
  };
  confere();
}

/** Preenche em pedaços de até MAX_BLOCOS_FILL blocos. */
function preencher(/** @type {PincelMundo} */ pincel, x1, y1, z1, x2, y2, z2, id, soAr, estados = undefined) {
  const [xa, xb] = [Math.min(x1, x2), Math.max(x1, x2)];
  const [ya, yb] = [Math.min(y1, y2), Math.max(y1, y2)];
  const [za, zb] = [Math.min(z1, z2), Math.max(z1, z2)];
  const dx = xb - xa + 1, dy = yb - ya + 1, dz = zb - za + 1;
  if (dx * dy * dz <= MAX_BLOCOS_FILL) return pincel.fill(xa, ya, za, xb, yb, zb, id, soAr, estados);
  if (dx >= dy && dx >= dz) {
    const m = xa + (dx >> 1) - 1;
    preencher(pincel, xa, ya, za, m, yb, zb, id, soAr, estados);
    preencher(pincel, m + 1, ya, za, xb, yb, zb, id, soAr, estados);
  } else if (dz >= dy) {
    const m = za + (dz >> 1) - 1;
    preencher(pincel, xa, ya, za, xb, yb, m, id, soAr, estados);
    preencher(pincel, xa, ya, m + 1, xb, yb, zb, id, soAr, estados);
  } else {
    const m = ya + (dy >> 1) - 1;
    preencher(pincel, xa, ya, za, xb, m, zb, id, soAr, estados);
    preencher(pincel, xa, m + 1, za, xb, yb, zb, id, soAr, estados);
  }
}

/** Pincel com a origem somada (o mapa é escrito em coordenadas relativas). @param {PincelMundo} pincel @param {Ponto3} o @returns {import("./obras_pincel.js").Pincel} */
function pincelComOrigem(pincel, o) {
  /** @type {any} */
  const proxy = {
    fill: (x1, y1, z1, x2, y2, z2, id, soAr, estados) => preencher(pincel, o.x + x1, o.y + y1, o.z + z1, o.x + x2, o.y + y2, o.z + z2, id, soAr, estados),
    set: (x, y, z, id, est) => pincel.set(o.x + x, o.y + y, o.z + z, id, est),
    id: (x, y, z) => pincel.id(o.x + x, o.y + y, o.z + z),
    superficie: (x, z) => pincel.superficie(o.x + x, o.z + z),
    existe: (id) => pincel.existe(id),
    placa: (x, y, z, linhas) => pincel.placa(o.x + x, o.y + y, o.z + z, linhas),
    get ops() {
      return pincel.ops;
    },
    set ops(v) {
      pincel.ops = v;
    },
  };
  return proxy;
}

/** Quem está na dimensão sai antes de mexer no chão dela. */
function retirarQuemEstaDentro() {
  for (const p of jogadoresNosEcos()) mandarParaSpawn(p);
}

/**
 * Constrói (ou retoma) o mapa, aos poucos. Só a staff chama (painel), nunca na abertura do evento nem a cada tick.
 * @param {Player | undefined} quem recebe os avisos
 * @param {{ refazer?: boolean }} [opcoes]  refazer = começa do zero (limpa tudo); o painel só oferece ao dono, com confirmação dupla
 * @returns {Promise<boolean>} se começou
 */
export async function construirEcos(quem, opcoes = {}) {
  if (cons.ocupado) {
    if (quem) erro(quem, textos.JA_CONSTRUINDO);
    return false;
  }
  const dim = dimEcos();
  if (!dim) {
    if (quem) erro(quem, textos.SEM_DIMENSAO);
    return false;
  }
  if (!opcoes.refazer && ecosConstruido()) {
    if (quem) erro(quem, textos.JA_CONSTRUIDO);
    return false;
  }
  cons.ocupado = true;
  cons.fase = textos.FASE_PREPARANDO;
  cons.pct = 0;
  cons.falhas = 0;
  const o = origemEcos();
  if (opcoes.refazer) salvarMundo(CHAVE_PROGRESSO, 0);
  const desde = fasesProntas();
  salvarMundo(CHAVE_CONSTRUIDO, false);
  retirarQuemEstaDentro();
  if (quem) ok(quem, desde > 0 ? textos.RETOMANDO(desde, etapasTotais()) : textos.CONSTRUINDO);

  /** @param {string} motivo */
  const falhou = (motivo) => {
    soltarAreas();
    cons.ocupado = false;
    cons.fase = "";
    registrarErro("Ecos: construção", motivo);
    if (quem?.isValid) erro(quem, textos.FALHA_CONSTRUCAO(motivo));
  };

  if (quem) {
    const acompanha = system.runInterval(() => {
      if (!cons.ocupado || !quem.isValid) return system.clearRun(acompanha);
      try {
        quem.onScreenDisplay.setActionBar(textos.CONSTRUINDO_FASE(cons.fase || textos.FASE_PREPARANDO, Math.round(cons.pct * 100)));
      } catch {
        // a pessoa saiu
      }
    }, 20);
  }
  executarJanelas(dim, o, desde, quem, falhou).catch((e) => falhou(String(e)));
  return true;
}

/** Roda o gerador respeitando o orçamento de ms por tick. @param {Generator<any, void, any>} gen @returns {Promise<void>} */
function rodar(gen) {
  return new Promise((resolve, reject) => {
    const run = system.runInterval(() => {
      try {
        const ini = Date.now();
        while (Date.now() - ini < ajustes.orcamentoMs) {
          if (gen.next().done) {
            system.clearRun(run);
            resolve();
            return;
          }
        }
      } catch (e) {
        system.clearRun(run);
        reject(e);
      }
    }, 1);
  });
}

/** @param {Dimension} dim @param {Ponto3} o @param {{ x1: number, x2: number, z1: number, z2: number }} faixa @returns {Promise<boolean>} */
const carregar = (dim, o, faixa) => {
  const c = caixaDaArea(faixa, o);
  const ponto = { x: Math.floor((c.from.x + c.to.x) / 2), y: o.y, z: Math.floor((c.from.z + c.to.z) / 2) };
  return new Promise((resolve) => esperarCarga(dim, [ponto], 75, resolve));
};

/** Divide a faixa em n pedaços de x. @param {{ x1: number, x2: number, z1: number, z2: number }} f @param {number} n */
function dividir(f, n) {
  const w = Math.ceil((f.x2 - f.x1 + 1) / n);
  return Array.from({ length: n }, (_, i) => ({ x1: f.x1 + i * w, x2: Math.min(f.x2, f.x1 + (i + 1) * w - 1), z1: f.z1, z2: f.z2 })).filter((p) => p.x1 <= p.x2);
}

/**
 * A obra por janelas: janela a janela (faixas de x), abre só a área de ticking dela, roda todas as fases recortadas nela e solta.
 * O progresso salvo é janela * fases + fase; se o servidor reiniciar, "continuar" volta de onde parou. Se o jogo recusar a área por
 * limite de chunks, avisa com precisão e repete a janela em pedaços menores (cada pedaço com a sua área, um de cada vez).
 * @param {Dimension} dim @param {Ponto3} o @param {number} desde @param {Player | undefined} quem @param {(m: string) => void} falhou
 */
async function executarJanelas(dim, o, desde, quem, falhou) {
  const pincel = new PincelMundo(dim);
  const base = pincelComOrigem(pincel, o);
  const janelas = janelasDaObra();
  const NF = FASES_MAPA.length;
  for (let w = Math.floor(desde / NF); w < janelas.length; w++) {
    const f0 = Math.max(0, desde - w * NF);
    let partes = 1;
    for (;;) {
      const pedacos = dividir(janelas[w], partes);
      let estourou = false;
      for (let k = 0; k < pedacos.length; k++) {
        soltarAreas(); // nada sobra de uma tentativa ou janela anterior
        const ab = await abrirArea(dim, o, pedacos[k]);
        if (!ab.ok) {
          soltarAreas();
          if (ab.limite && partes < 8) {
            if (quem?.isValid) erro(quem, textos.LIMITE_TICKING(ab.chunks, ab.erro, partes * 2));
            registrarErro("Ecos: limite de ticking", `${ab.erro} (janela ${w + 1}/${janelas.length}, ${ab.chunks} chunks)`);
            estourou = true;
            break;
          }
          return falhou(ab.limite ? textos.LIMITE_TICKING_FIM(ab.chunks, ab.erro) : `${textos.AREA_NAO_CARREGOU} (${ab.erro})`);
        }
        if (!(await carregar(dim, o, pedacos[k]))) {
          soltarAreas();
          return falhou(textos.AREA_NAO_CARREGOU);
        }
        const ultimo = k === pedacos.length - 1;
        const gen = construir(
          new PincelRecortado(base, pedacos[k]),
          (f, txt) => {
            cons.pct = (w + (k + f) / pedacos.length) / janelas.length;
            cons.fase = `${txt} (${w + 1}/${janelas.length})`;
          },
          f0,
          (n) => {
            if (ultimo) salvarMundo(CHAVE_PROGRESSO, w * NF + n);
          },
        );
        await rodar(gen);
        soltarAreas();
      }
      if (!estourou) break;
      partes *= 2;
    }
  }
  cons.falhas = pincel.falhas;
  salvarMundo(CHAVE_CONSTRUIDO, true);
  salvarMundo(CHAVE_PROGRESSO, etapasTotais());
  if (pincel.falhas > 0) registrarErro("Ecos: blocos que não puderam ser colocados", `${pincel.falhas} (primeira: ${pincel.primeiraFalha})`);
  soltarAreas();
  system.runTimeout(() => {
    cons.ocupado = false;
    cons.fase = "";
    cons.pct = 1;
    if (quem?.isValid) ok(quem, textos.CONSTRUIDO(pincel.falhas));
  }, 40);
}

// ------------------------------------------------------------------------------------ atmosfera: fog por região
/** Fog da fase final do Testemunho (mais pesado, só na arena). */
let faseFinal = false;
/** @param {boolean} v */
export function definirFaseFinal(v) {
  faseFinal = v;
}
export const emFaseFinal = () => faseFinal;

/** @type {Map<string, string>} jogador → último fog aplicado */
const fogAtual = new Map();
/** @type {Set<string>} quem recebeu a visão noturna daqui */
const comVisao = new Set();

/** @param {typeof REG[number]} reg */
const fogDaRegiao = (reg) => (reg.id === "arena" && !faseFinal ? `${reg.fog}_t2` : reg.fog);

/** @param {Player} player */
function tirarFog(player) {
  try {
    player.runCommand(`fog @s remove "vulpus_ecos"`);
  } catch {
    // jogador saindo
  }
}

function atualizarFog() {
  const dentro = jogadoresNosEcos();
  const ids = new Set(dentro.map((p) => p.id));
  // quem saiu perde o fog e a visão noturna
  for (const id of [...fogAtual.keys()]) {
    if (ids.has(id)) continue;
    fogAtual.delete(id);
    const p = world.getAllPlayers().find((x) => x.id === id);
    if (p) tirarFog(p);
  }
  for (const id of [...comVisao]) {
    if (ids.has(id)) continue;
    comVisao.delete(id);
    try {
      world.getAllPlayers().find((x) => x.id === id)?.removeEffect("night_vision");
    } catch {
      // saiu
    }
  }
  for (const player of dentro) {
    const reg = regiaoDoJogador(player);
    if (!reg) continue;
    const alvo = fogDaRegiao(reg);
    if (fogAtual.get(player.id) === alvo) continue;
    fogAtual.set(player.id, alvo);
    tirarFog(player);
    try {
      player.runCommand(`fog @s push ${alvo} "vulpus_ecos"`);
    } catch (e) {
      registrarErro("Ecos: fog", e);
    }
  }
}

function atualizarVisao() {
  for (const player of jogadoresNosEcos()) {
    try {
      player.addEffect("night_vision", 400, { amplifier: 0, showParticles: false });
      comVisao.add(player.id);
    } catch {
      // saiu
    }
  }
}

// ------------------------------------------------------------------------------------ atmosfera: sons e partículas
/** Sons só do jogo (nada de terceiros), baixos e espaçados. */
const SOM_CAVERNA = "ambient.cave";
const SOM_LAMENTO = "mob.vex.ambient";
/** @type {Map<string, { caverna: number, lamento: number }>} jogador → próximo tick de cada som */
const proximoSom = new Map();
/** @param {number} min @param {number} max */
const sorteio = (min, max) => min + Math.floor(Math.random() * (max - min));

function somAmbiente() {
  const agora = system.currentTick;
  for (const player of jogadoresNosEcos()) {
    let e = proximoSom.get(player.id);
    if (!e) proximoSom.set(player.id, (e = { caverna: agora + sorteio(100, 400), lamento: agora + sorteio(400, 1200) }));
    const l = player.location;
    if (agora >= e.caverna) {
      e.caverna = agora + sorteio(700, 1600);
      som(player, SOM_CAVERNA, { volume: 0.25, pitch: 0.8 + Math.random() * 0.3 });
    }
    // lamentadores: só o som, de longe (não há entidade)
    if (agora >= e.lamento) {
      e.lamento = agora + sorteio(1000, 2600);
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 14;
      som(player, SOM_LAMENTO, { volume: 0.18, pitch: 0.5 + Math.random() * 0.2, location: { x: l.x + Math.cos(ang) * dist, y: l.y, z: l.z + Math.sin(ang) * dist } });
    }
  }
}

function particulasLeves() {
  for (const player of jogadoresNosEcos()) {
    try {
      const l = player.location;
      const reg = regiaoDoJogador(player);
      const id = reg?.id === "arena" && faseFinal ? "minecraft:basic_flame_particle" : "minecraft:endrod";
      for (let i = 0; i < 2; i++) {
        player.dimension.spawnParticle(id, { x: l.x + (Math.random() - 0.5) * 10, y: l.y + 0.5 + Math.random() * 2.5, z: l.z + (Math.random() - 0.5) * 10 });
      }
      // camada baixa por região (poucas partículas, perto do chão): alma rasteira no Limiar, vaga-lumes na Vila, pó roxo no Arquivo
      const baixa = { limiar: "minecraft:sculk_soul_particle", vila: "minecraft:firefly_particle", arquivo: "minecraft:obsidian_glow_dust_particle" }[reg?.id ?? ""];
      if (baixa) {
        for (let i = 0; i < 2; i++) {
          player.dimension.spawnParticle(baixa, { x: l.x + (Math.random() - 0.5) * 16, y: l.y + 0.1 + Math.random() * 1.2, z: l.z + (Math.random() - 0.5) * 16 });
        }
      }
    } catch {
      // chunk descarregado ou jogador saindo
    }
  }
}

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  fogAtual.delete(playerId);
  comVisao.delete(playerId);
  proximoSom.delete(playerId);
});

// ------------------------------------------------------------------------------------ sem monstros nem bichos naturais
/** Passivos que o jogo gera sozinho; aldeão, gato, golem etc. ficam. */
const PASSIVOS = /^minecraft:(sheep|cow|pig|chicken|horse|donkey|mule|rabbit|llama|trader_llama|goat|bat|squid|glow_squid|cod|salmon|tropical_fish|pufferfish|turtle|panda|fox|parrot|axolotl|frog|tadpole|mooshroom|camel|sniffer|armadillo|polar_bear|strider|happy_ghast)$/;
const PASSO_INTRUSOS = 100;

/**
 * É um bicho que o jogo gerou e que não pertence aos Ecos? Tudo do mod (vulpus:*, incluindo as criaturas do evento) fica;
 * monstro (família monster) e animal passivo vão embora.
 * @param {import("@minecraft/server").Entity} e
 */
export function ehIntruso(e) {
  try {
    const id = e.typeId;
    if (id.startsWith("vulpus:") || id === "minecraft:player" || id === "minecraft:item" || id === "minecraft:armor_stand") return false;
    if (PASSIVOS.test(id)) return true;
    return e.matches({ families: ["monster"] });
  } catch {
    return false;
  }
}

/** Remove os intrusos já presentes na dimensão (só chunks carregados). */
export function limparIntrusos() {
  const dim = dimEcos();
  if (!dim) return 0;
  let n = 0;
  try {
    for (const e of dim.getEntities()) {
      if (!ehIntruso(e)) continue;
      e.remove();
      n++;
    }
  } catch (e) {
    registrarErro("Ecos: limpar intrusos", e);
  }
  return n;
}

// nascimento natural: sai na hora (só quem nasce na dimensão dos Ecos)
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  try {
    if (entity.dimension.id !== DIM_ECOS || !ehIntruso(entity)) return;
    entity.remove();
  } catch {
    // já saiu
  }
});
// ao ligar o mundo
world.afterEvents.worldLoad.subscribe(() => {
  system.runTimeout(() => limparIntrusos(), 100);
});

let loopsIniciados = false;
/** Liga os ciclos de atmosfera (uma vez). Cada um começa conferindo se alguém está na dimensão. */
export function iniciarLoopsEcos() {
  if (loopsIniciados) return;
  loopsIniciados = true;
  system.runInterval(atualizarFog, PASSO_FOG);
  // varredura leve: só olha a dimensão se há alguém nela
  system.runInterval(() => {
    if (jogadoresNosEcos().length > 0) limparIntrusos();
  }, PASSO_INTRUSOS);
  system.runInterval(atualizarVisao, PASSO_VISAO);
  system.runInterval(somAmbiente, PASSO_SOM);
  system.runInterval(particulasLeves, PASSO_PARTICULAS);
}
