// @ts-check
// RTP (teleporte aleatório para o mundo aberto) e portal de saída do lobby. A pessoa aparece lá no
// alto (rtpAltura) sobre um ponto sorteado e desce devagar, protegida: queda lenta, resistência e
// resistência a fogo (nada de procurar chão seguro: os chunks carregam enquanto ela desce).
import { manterTexto } from "../core/flutuante.js";
import { GameMode, Player, system, world } from "@minecraft/server";
import { CHAVE_PORTAL } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { mostrarTitulo } from "../core/tela.js";
import { emCombate, emEspera, teleportar } from "../core/teleporte.js";
import { erro, formatarCoords, limitar, ok, registrarErro, som } from "../core/util.js";
import { barra } from "../glyphs.js";
import * as textos from "../textos/rtp.js";
import { alguemPerto, online, posicoesOnline } from "../core/jogadores.js";

/** @typedef {import("../core/teleporte.js").Local} Local */
/** @typedef {{ x: number, y: number, z: number, d: string, r: number }} Portal */

const OVERWORLD = "minecraft:overworld";
/** Áreas de carregamento que a versão antiga do RTP criava (limpa no começo, se sobraram). */
const PREFIXO_AREA = "vulpus_rtp_";

const RAIO_PADRAO = 2;
const RAIO_MAX = 8;
/** Diferença de altura que ainda conta como "dentro" do portal. */
const ALTURA_PORTAL = 2.5;
const PASSO_PORTAL = 5;
const PASSO_VISUAL = 8;
const VER_PORTAL = 48;
const TICKS_SUBIDA = 50;
const PASSO_DECOLAGEM = 2;
const SEGMENTOS = 10;
/** Depois de uma decolagem que falhou, o portal ignora a pessoa por um tempo. */
const TICKS_RECARGA_PORTAL = 200;

/** Queda: tempo máximo, passo e carência inicial (o teleporte acabou de acontecer). */
const TICKS_QUEDA_MAX = 20 * 300;
const PASSO_QUEDA = 2;
const CARENCIA_QUEDA = 8;
/** A queda lenta e a proteção ficam pelo menos 30 s (o mundo embaixo pode demorar a carregar). */
const TICKS_PROTECAO_MIN = 20 * 30;
/** Abaixo disso ainda sem chão = caiu pelo vazio: sobe de volta. */
const LIMITE_VAZIO = -40;
/** Resistência e resistência a fogo continuam depois de pousar (lava, cacto, o que for). */
const TICKS_PROTECAO_POUSO = 20 * 10;

const LARANJA = { red: 1, green: 0.5, blue: 0.08 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };
const CHAMA = "minecraft:basic_flame_particle";
const FAISCA = "minecraft:endrod";

/** @type {Map<string, () => void>} id → aborta a decolagem */
const decolando = new Map();
/** @type {Map<string, () => void>} id → encerra a queda */
const caindo = new Map();
/** @type {Map<string, number>} id → tick até quando o portal ignora a pessoa */
const ignorados = new Map();

/** @type {Portal | undefined} */
let portal;
let portalCarregado = false;

/**
 * Efeitos de proteção da queda (renovados enquanto ela dura).
 * @param {Player} player
 * @param {number} ticks
 * @param {boolean} comQueda  inclui a queda lenta
 */
function proteger(player, ticks, comQueda) {
  /** @type {import("@minecraft/server").EntityEffectOptions} */
  const opcoes = { amplifier: 4, showParticles: false };
  player.addEffect("resistance", ticks, opcoes);
  player.addEffect("fire_resistance", ticks, { amplifier: 0, showParticles: false });
  if (comQueda) player.addEffect("slow_falling", ticks, { amplifier: 0, showParticles: false });
}

/**
 * Queda protegida depois do RTP: efeitos renovados por no mínimo TICKS_PROTECAO_MIN (dá tempo de o
 * mundo carregar embaixo), rastro de fogo e altitude na actionbar; ao pousar vem um estouro de brasas.
 * Se a pessoa afundar no vazio antes de o chão existir, volta para o alto.
 * @param {Player} player
 * @param {number} altura  Y de onde a pessoa caiu
 */
function descer(player, altura) {
  const id = player.id;
  caindo.get(id)?.();
  const inicio = system.currentTick;
  let pousou = false;
  const parar = () => {
    system.clearRun(run);
    caindo.delete(id);
    if (!player.isValid) return;
    try {
      player.removeEffect("slow_falling");
    } catch (e) {
      registrarErro("Fim da queda do RTP", e);
    }
  };
  const run = system.runInterval(() => {
    try {
      if (!player.isValid) {
        parar();
        return;
      }
      const decorridos = system.currentTick - inicio;
      const c = player.location;
      if (decorridos > TICKS_QUEDA_MAX || (pousou && decorridos >= TICKS_PROTECAO_MIN)) {
        parar();
        return;
      }
      if (decorridos % 20 === 0) proteger(player, 60, true);
      if (c.y < LIMITE_VAZIO) {
        player.teleport({ x: c.x, y: altura, z: c.z }, { checkForBlocks: false, keepVelocity: false });
        return;
      }
      const noChao = decorridos > CARENCIA_QUEDA && (player.isOnGround || player.isInWater || player.isFlying);
      if (noChao && !pousou) {
        pousou = true;
        proteger(player, TICKS_PROTECAO_POUSO, false);
        if (efeitos.anel(player.dimension, c, { raio: 1.4, n: 14, y: 0.1 }, CHAMA, [LARANJA, DOURADO])) {
          efeitos.nuvem(player.dimension, c, { n: 8, largura: 0.8, y0: 0.3, alto: 1.2 }, FAISCA);
        }
        som(player, "random.orb", { pitch: 1.2, volume: 0.8 });
      }
      if (pousou) return;
      efeitos.anel(player.dimension, c, { raio: 0.7, n: 3, y: 0.2, giro: decorridos * 0.5 }, CHAMA, [LARANJA, DOURADO]);
      player.onScreenDisplay.setActionBar(textos.QUEDA(Math.max(0, Math.round(c.y))));
    } catch (e) {
      registrarErro("Queda do RTP", e);
      parar();
    }
  }, PASSO_QUEDA);
  caindo.set(id, parar);
  // Já na chegada: sem isso o primeiro tick de queda ainda pode machucar.
  try {
    proteger(player, 60, true);
  } catch (e) {
    registrarErro("Proteção do RTP", e);
  }
}

/**
 * Ponto sorteado entre rtpMinimo e rtpMaximo do centro (0, 0), na altura rtpAltura.
 * @returns {Local}
 */
function sortearDestino() {
  const cfg = config();
  const max = Math.max(16, Math.min(Math.max(cfg.rtpMinimo, cfg.rtpMaximo), cfg.limiteMundo - 32));
  const min = Math.max(0, Math.min(cfg.rtpMinimo, cfg.rtpMaximo, max));
  const raio = Math.sqrt(min * min + Math.random() * (max * max - min * min));
  const angulo = Math.random() * Math.PI * 2;
  const y = limitar(Math.floor(cfg.rtpAltura), 100, 318);
  return { x: Math.round(Math.cos(angulo) * raio) + 0.5, y, z: Math.round(Math.sin(angulo) * raio) + 0.5, d: OVERWORLD };
}

/**
 * Leva a pessoa para um ponto sorteado, no alto, e começa a queda protegida.
 * @param {Player} player
 * @param {boolean} semEspera
 * @returns {boolean}
 */
function levar(player, semEspera) {
  const destino = sortearDestino();
  return teleportar(player, destino, {
    nome: textos.DESTINO,
    tema: "rtp",
    semEspera,
    aoChegar: (p) => descer(p, destino.y),
  });
}

/**
 * /rtp: teleporta com as regras de sempre (combate, recarga e espera parado).
 * @param {Player} player
 */
export function rtp(player) {
  if (decolando.has(player.id)) {
    erro(player, textos.JA_PROCURANDO);
    return;
  }
  if (player.dimension.id !== OVERWORLD) {
    erro(player, textos.NA_DIMENSAO);
    return;
  }
  if (emCombate(player)) {
    erro(player, textos.EM_COMBATE);
    return;
  }
  levar(player, false);
}

/** @param {unknown} v @returns {v is Portal} */
function ehPortal(v) {
  const p = /** @type {any} */ (v);
  return !!p && typeof p.d === "string" && [p.x, p.y, p.z, p.r].every((n) => typeof n === "number" && Number.isFinite(n));
}

/** @returns {Portal | undefined} */
export function portalAtual() {
  if (!portalCarregado) {
    portalCarregado = true;
    const salvo = lerMundo(CHAVE_PORTAL);
    portal = ehPortal(salvo) ? salvo : undefined;
  }
  return portal;
}

/**
 * Marca o portal de saída onde a staff está.
 * @param {Player} player
 * @param {number | undefined} raio
 */
export function definirPortal(player, raio) {
  const r = limitar(Math.floor(raio ?? RAIO_PADRAO), 1, RAIO_MAX);
  const { x, y, z } = player.location;
  /** @type {Portal} */
  const novo = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id, r };
  if (!salvarMundo(CHAVE_PORTAL, novo)) {
    erro(player, "Não consegui salvar o portal. Tenta de novo?");
    return;
  }
  portal = novo;
  portalCarregado = true;
  atualizarTexto();
  ok(player, textos.PORTAL_DEFINIDO(formatarCoords(novo), r));
}

/** @param {Player} player */
export function removerPortal(player) {
  if (!portalAtual()) {
    erro(player, textos.PORTAL_INEXISTENTE);
    return;
  }
  salvarMundo(CHAVE_PORTAL, undefined);
  portal = undefined;
  atualizarTexto();
  ok(player, textos.PORTAL_REMOVIDO);
}

/**
 * Decolagem estilosa: a pessoa sobe em espiral de fogo (caudas, sino, barrinha) e, no fim, fade e
 * chegada lá no alto do mundo aberto, já caindo devagar.
 * @param {Player} player
 */
function decolar(player) {
  const id = player.id;
  const dimensao = player.dimension.id;
  const inicio = system.currentTick;
  let segundo = -1;

  /** @param {string | undefined} motivo  mostra o erro e deixa a pessoa descer devagar */
  const encerrar = (motivo) => {
    system.clearRun(run);
    decolando.delete(id);
    if (!player.isValid) return;
    try {
      player.removeEffect("levitation");
    } catch (e) {
      registrarErro("Fim da decolagem", e);
    }
    if (motivo) {
      ignorados.set(id, system.currentTick + TICKS_RECARGA_PORTAL);
      erro(player, motivo);
    }
  };
  const run = system.runInterval(() => {
    try {
      if (!player.isValid || player.dimension.id !== dimensao) {
        encerrar(undefined);
        return;
      }
      const decorridos = system.currentTick - inicio;
      if (decorridos >= TICKS_SUBIDA) {
        encerrar(undefined);
        player.removeEffect("slow_falling");
        if (!levar(player, true)) {
          ignorados.set(id, system.currentTick + TICKS_RECARGA_PORTAL);
          player.addEffect("slow_falling", 200, { amplifier: 0, showParticles: false });
        }
        return;
      }
      efeitos.passoEspera(player, "rtp", decorridos);
      const atual = Math.floor(decorridos / 20);
      if (atual !== segundo) {
        segundo = atual;
        efeitos.segundoEspera(player, "rtp", atual, decorridos >= TICKS_SUBIDA - 20);
      }
      player.onScreenDisplay.setActionBar(textos.DECOLANDO(barra(decorridos / TICKS_SUBIDA, SEGMENTOS)));
    } catch (e) {
      registrarErro("Decolagem do portal", e);
      encerrar(undefined);
    }
  }, PASSO_DECOLAGEM);
  decolando.set(id, () => encerrar(textos.CANCELADO_DANO));

  player.addEffect("levitation", TICKS_SUBIDA, { amplifier: 2, showParticles: false });
  player.addEffect("slow_falling", TICKS_SUBIDA + 100, { amplifier: 0, showParticles: false });
  efeitos.inicioEspera(player);
  mostrarTitulo(player, textos.SAINDO_TITULO, { subtitulo: textos.SAINDO_SUB, entrada: 4, fica: 30, saida: 10 });
}

/** O portal em si: anel girando no chão, anel interno e coluna de faíscas, só para quem está perto. */
function desenharPortal() {
  const p = portalAtual();
  if (!p) return;
  try {
    const dim = world.getDimension(p.d);
    const centro = { x: p.x, y: p.y, z: p.z };
    if (!alguemPerto(centro, p.d, VER_PORTAL)) return;
    const giro = system.currentTick * 0.07;
    const cores = [LARANJA, DOURADO];
    if (!efeitos.anel(dim, centro, { raio: p.r, n: 6 + p.r * 4, y: 0.15, giro }, CHAMA, cores)) return;
    if (!efeitos.anel(dim, centro, { raio: p.r * 0.5, n: 6, y: 0.15, giro: -giro * 1.5 }, CHAMA, cores)) return;
    efeitos.nuvem(dim, centro, { n: 3, largura: p.r * 0.35, y0: 0.2, alto: 3.5 }, FAISCA);
  } catch (e) {
    registrarErro("Desenho do portal de saída", e);
  }
}

// ----------------------------------------------------------------------------------- letreiro

/**
 * Letras do letreiro, 5 colunas x 7 linhas (de cima para baixo); "#" é partícula.
 * @type {Record<string, string[]>}
 */
const LETRAS = {
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
};
const PALAVRA = "RTP";
/** Distância entre pontos, em blocos. */
const ESPACO_PONTO = 0.8;
/** Altura da base do letreiro acima do portal e distância do centro até cada face. */
const ALTURA_LETREIRO = 12;
const RAIO_LETREIRO = 9;
const VER_LETREIRO = 96;
const PASSO_LETREIRO = 2;
/** As 4 faces (norte, leste, sul, oeste) apontam para fora, para dar para ler de qualquer lado. */
const FACES = [
  { nx: 0, nz: -1 },
  { nx: 1, nz: 0 },
  { nx: 0, nz: 1 },
  { nx: -1, nz: 0 },
];

/** @type {{ col: number, linha: number }[]} pontos do letreiro (coluna a partir da esquerda, linha de baixo para cima) */
const PONTOS = (() => {
  /** @type {{ col: number, linha: number }[]} */
  const pontos = [];
  let col0 = 0;
  for (const letra of PALAVRA) {
    const grade = LETRAS[letra];
    grade.forEach((linhaTexto, i) => {
      [...linhaTexto].forEach((c, j) => {
        if (c === "#") pontos.push({ col: col0 + j, linha: grade.length - 1 - i });
      });
    });
    col0 += 6;
  }
  return pontos;
})();
const LARGURA_LETREIRO = (PALAVRA.length * 6 - 1) * ESPACO_PONTO;
let faceDaVez = 0;

/** Uma face do letreiro por vez (para não estourar o limite de partículas do tick). */
function desenharLetreiro() {
  const p = portalAtual();
  if (!p) return;
  try {
    const dim = world.getDimension(p.d);
    const base = { x: p.x, y: p.y + ALTURA_LETREIRO, z: p.z };
    // só as faces que alguém consegue ver (de fora e a até VER_LETREIRO blocos): metade das partículas e as letras
    // aparecem com mais frequência para quem olha
    const r2 = VER_LETREIRO * VER_LETREIRO;
    const vistas = FACES.filter((f) =>
      posicoesOnline().some((j) => {
        if (j.d !== p.d) return false;
        const dx = j.x - base.x;
        const dz = j.z - base.z;
        const dy = j.y - base.y;
        return dx * f.nx + dz * f.nz > 0 && dx * dx + dy * dy + dz * dz <= r2;
      }),
    );
    if (vistas.length === 0) return;
    const face = vistas[faceDaVez % vistas.length];
    faceDaVez++;
    // "direita" de quem olha a face de fora: (nz, 0, -nx).
    const rx = face.nz;
    const rz = -face.nx;
    for (const { col, linha } of PONTOS) {
      const u = col * ESPACO_PONTO - LARGURA_LETREIRO / 2;
      const pos = {
        x: base.x + face.nx * RAIO_LETREIRO + rx * u,
        y: base.y + linha * ESPACO_PONTO,
        z: base.z + face.nz * RAIO_LETREIRO + rz * u,
      };
      if (!efeitos.emitir(dim, CHAMA, pos, linha > 3 ? DOURADO : LARANJA)) return;
    }
  } catch (e) {
    registrarErro("Letreiro do portal", e);
  }
}

// --------------------------------------------------------------------------- texto flutuante

/** Marca a entidade do texto do portal (o placar do Spleef usa outra tag). */
const TAG_TEXTO_PORTAL = "vulpus_portal_texto";
const ENTIDADE_TEXTO = "vulpus:texto";
const ALTURA_TEXTO = 4.2;
const PASSO_TEXTO = 100;
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

/**
 * Põe, move ou tira o texto flutuante do portal (uma entidade vulpus:texto só com o nome).
 * Sem chunk carregado, tenta de novo no próximo passo.
 */
function atualizarTexto() {
  try {
    const p = portalAtual();
    manterTexto(TAG_TEXTO_PORTAL, p ? { x: p.x, y: p.y + ALTURA_TEXTO, z: p.z, d: p.d } : undefined, textos.PORTAL_TEXTO);
  } catch (e) {
    registrarErro("Texto do portal de saída", e);
  }
}

function conferirPortal() {
  const p = portalAtual();
  if (!p) return;
  const agora = system.currentTick;
  for (const player of online()) {
    if (player.dimension.id !== p.d) continue;
    if (decolando.has(player.id) || caindo.has(player.id)) continue;
    if ((ignorados.get(player.id) ?? 0) > agora) continue;
    const { x, y, z } = player.location;
    if (Math.hypot(x - p.x, z - p.z) > p.r || Math.abs(y - p.y) > ALTURA_PORTAL) continue;
    if (player.getGameMode() === GameMode.Spectator || emEspera(player)) continue;
    if (emCombate(player)) {
      ignorados.set(player.id, agora + TICKS_RECARGA_PORTAL);
      erro(player, textos.CANCELADO_COMBATE);
      continue;
    }
    try {
      decolar(player);
    } catch (e) {
      registrarErro("Início da decolagem", e);
    }
  }
}

system.runInterval(conferirPortal, PASSO_PORTAL);
system.runInterval(desenharPortal, PASSO_VISUAL);
system.runInterval(desenharLetreiro, PASSO_LETREIRO);
system.runInterval(atualizarTexto, PASSO_TEXTO);

world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
  if (hurtEntity instanceof Player) decolando.get(hurtEntity.id)?.();
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  caindo.get(playerId)?.();
  decolando.get(playerId)?.();
  ignorados.delete(playerId);
});

// Áreas de carregamento que sobraram da versão antiga do RTP (que procurava chão seguro).
system.runTimeout(() => {
  const dim = world.getDimension(OVERWORLD);
  for (let i = 1; i <= 80; i++) {
    try {
      dim.runCommand(`tickingarea remove ${PREFIXO_AREA}${i}`);
    } catch {
      // não existe: é o normal
    }
  }
}, 40);

registrarComando({ nome: "rtp", descricao: textos.CMD_RTP }, (p) => rtp(p));
registrarComando(
  {
    nome: "definirportal",
    descricao: textos.CMD_DEFINIRPORTAL,
    staff: true,
    parametros: [{ nome: "raio", tipo: "inteiro", opcional: true }],
  },
  (p, [raio]) => definirPortal(p, raio),
);
registrarComando({ nome: "removerportal", descricao: textos.CMD_REMOVERPORTAL, staff: true }, (p) => removerPortal(p));

/**
 * Muda só o raio do portal de saída (sem mudar o lugar).
 * @param {Player} player
 * @param {number} raio
 */
export function mudarRaioPortal(player, raio) {
  const p = portalAtual();
  if (!p) {
    erro(player, textos.PORTAL_INEXISTENTE);
    return;
  }
  const r = limitar(Math.floor(raio), 1, RAIO_MAX);
  /** @type {Portal} */
  const novo = { ...p, r };
  salvarMundo(CHAVE_PORTAL, novo);
  portal = novo;
  ok(player, textos.PORTAL_RAIO(r));
}

export const LIMITES_PORTAL = Object.freeze({ raioMax: RAIO_MAX, raioPadrao: RAIO_PADRAO });
