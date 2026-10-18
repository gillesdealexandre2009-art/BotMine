// @ts-check
// Tiro ao alvo: quem entra no posto de tiro recebe um arco emprestado (flechas infinitas); cada flecha
// que bate num bloco Alvo (minecraft:target) vale pontos pela pontaria (mosca, meio, borda) e pela
// distância até o posto. A rodada acaba depois de N disparos: pontos viram Caudas (com limite por dia)
// e entram no placar flutuante do dia e da semana.
import { EnchantmentType, ItemLockMode, ItemStack, Player, PlayerPermissionLevel, system, world } from "@minecraft/server";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { alguemPerto, online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, limitar, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/tiro.js";
import { adicionarCaudas } from "./caudas.js";
import { achadas, esquecerBusca } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string, r: number }} Posto */
/** @typedef {{ x: number, y: number, z: number, d: string }} PontoPlacar */
/** @typedef {{ n: string, dia: string, vd: number, sem: number, vs: number }} Recorde */
/** @typedef {{ x: number, y: number, z: number, d: string, amp: number, yaw: number }} Movel */
/** @typedef {{ posto?: Posto, placar?: PontoPlacar, moveis: Record<string, Movel>, recordes: Record<string, Recorde>, premios: Record<string, { dia: string, g: number, ult?: number }> }} Dados */
/** @typedef {{ tiros: number, acertos: number, pontos: number, inicio: number }} Rodada */

const CHAVE = "vulpus:tiro";
const ALVO = "minecraft:target";
const FLECHA = "minecraft:arrow";
const RAIO_PADRAO = 3;
const RAIO_MAX = 12;
const PASSO = 5;
const PASSO_PLACAR = 200;
const TICKS_FLECHA = 100;
/** Rodada parada por tanto tempo (ticks) é encerrada. */
const TICKS_OCIOSA = 20 * 120;
const TAG_PLACAR = "vulpus_tiro_placar";
const TAG_POSTO = "vulpus_tiro_posto";
/** Entre dois avisos de dica (fora do posto) ou de permissão, em ticks. */
const AVISO_DICA = 100;
/** Distância além do raio em que a pessoa já recebe a dica de onde ficar. */
const PERTO_DO_POSTO = 8;
/** Quantos alvos móveis cabem (cada número tem seu jeito de andar). */
export const ALVOS_MOVEIS = 4;
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const LARANJA = { red: 1, green: 0.5, blue: 0.08 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };

/** @type {Dados | undefined} */
let dados;
/** @type {Map<string, Rodada>} id → rodada em andamento */
const rodadas = new Map();
/** @type {Map<string, number>} id → tick do último disparo contado */
const ultimoTiro = new Map();
/** @type {Map<string, number>} id → tick do último aviso de recarga */
const avisoRecarga = new Map();
/** @type {Map<string, number>} id → tick do último aviso de dica ou de permissão */
const avisoDica = new Map();
/** Entre dois avisos de "espera entre rodadas", em ticks. */
const AVISO_RECARGA = 60;

/**
 * Alvos móveis salvos (um por número, de 1 a 4); o alvo único de versões antigas vira o número 1.
 * @param {any} salvo
 * @param {(p: any) => boolean} ponto
 * @returns {Record<string, Movel>}
 */
function lerMoveis(salvo, ponto) {
  /** @type {Record<string, Movel>} */
  const moveis = {};
  const valido = (/** @type {any} */ m) => ponto(m) && Number.isFinite(m.amp) && Number.isFinite(m.yaw);
  if (valido(salvo?.movel)) moveis["1"] = salvo.movel;
  if (salvo?.moveis && typeof salvo.moveis === "object") {
    for (let n = 1; n <= ALVOS_MOVEIS; n++) if (valido(salvo.moveis[n])) moveis[String(n)] = salvo.moveis[n];
  }
  return moveis;
}

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const salvo = lerMundo(CHAVE);
  const ponto = (/** @type {any} */ p) => !!p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => typeof n === "number" && Number.isFinite(n));
  dados = {
    posto: ponto(salvo?.posto) && Number.isFinite(salvo.posto.r) ? salvo.posto : undefined,
    placar: ponto(salvo?.placar) ? salvo.placar : undefined,
    moveis: lerMoveis(salvo, ponto),
    recordes: salvo?.recordes && typeof salvo.recordes === "object" ? salvo.recordes : {},
    premios: salvo?.premios && typeof salvo.premios === "object" ? salvo.premios : {},
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** Semana começando na segunda (1970-01-01 foi quinta). @param {string} dia */
function semanaDe(dia) {
  return Math.floor(Date.parse(`${dia}T00:00:00Z`) / 86_400_000 + 3) / 7 | 0;
}

/**
 * @param {Player} player
 * @param {Posto} posto
 */
function noPosto(player, posto) {
  const { x, y, z } = player.location;
  return player.dimension.id === posto.d && Math.hypot(x - posto.x, z - posto.z) <= posto.r && Math.abs(y - posto.y) <= 4;
}

// ------------------------------------------------------------------------------------- itens

/** @param {string} id  tipo do item @param {string} nome @param {number} qtd */
function criarItem(id, nome, qtd) {
  const item = new ItemStack(id, qtd);
  item.nameTag = nome;
  item.setLore([textos.LORE_ARCO, textos.MARCA]);
  item.lockMode = ItemLockMode.inventory;
  item.keepOnDeath = true;
  return item;
}

function criarArco() {
  const arco = criarItem("minecraft:bow", textos.NOME_ARCO, 1);
  const encantavel = arco.getComponent("minecraft:enchantable");
  for (const [nome, nivel] of /** @type {[string, number][]} */ ([["infinity", 1], ["unbreaking", 3]])) {
    for (const id of [`minecraft:${nome}`, nome]) {
      try {
        encantavel?.addEnchantment({ type: new EnchantmentType(id), level: nivel });
        break;
      } catch (e) {
        if (id === nome) registrarErro(`Tiro: encantar o arco (${nome})`, e);
      }
    }
  }
  return arco;
}

/** @param {import("@minecraft/server").ItemStack | undefined} item */
const ehDaCabana = (item) => !!item && (item.nameTag === textos.NOME_ARCO || item.nameTag === textos.NOME_FLECHA);

/** Tira da pessoa o arco e as flechas da cabana. @param {Player} player */
function limparItens(player) {
  try {
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    for (let i = 0; i < inv.size; i++) {
      if (ehDaCabana(inv.getItem(i))) inv.setItem(i, undefined);
    }
  } catch (e) {
    registrarErro("Tiro: recolher itens", e);
  }
}

/** @param {Player} player */
function entregarItens(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv || inv.emptySlotsCount < 2) return false;
  limparItens(player);
  inv.addItem(criarArco());
  inv.addItem(criarItem(FLECHA, textos.NOME_FLECHA, 1));
  return true;
}

// ------------------------------------------------------------------------------------ rodada

/** @param {Player} player */
function iniciar(player) {
  const cfg = config();
  const faltam = Math.ceil(((lerDados().premios[player.id]?.ult ?? 0) + cfg.tiroRecargaSeg * 1000 - Date.now()) / 1000);
  if (faltam > 0) {
    const agora = system.currentTick;
    if (agora - (avisoRecarga.get(player.id) ?? -Infinity) >= AVISO_RECARGA) {
      avisoRecarga.set(player.id, agora);
      player.onScreenDisplay.setActionBar(textos.RECARGA(faltam));
    }
    return;
  }
  if (!entregarItens(player)) {
    if (system.currentTick - (avisoDica.get(player.id) ?? -Infinity) >= AVISO_DICA) {
      avisoDica.set(player.id, system.currentTick);
      erro(player, textos.INVENTARIO_CHEIO);
    }
    return;
  }
  rodadas.set(player.id, { tiros: 0, acertos: 0, pontos: 0, inicio: system.currentTick });
  ultimoTiro.set(player.id, system.currentTick);
  msg(player, textos.COMECOU(cfg.tiroFlechas, cfg.tiroPertoBlocos, cfg.tiroMedioBlocos));
}

/**
 * Fecha a rodada: recolhe os itens, paga as Caudas (limite por dia) e guarda o recorde.
 * @param {Player | string} quem
 */
function encerrar(quem) {
  const id = typeof quem === "string" ? quem : quem.id;
  const rodada = rodadas.get(id);
  rodadas.delete(id);
  ultimoTiro.delete(id);
  const player = typeof quem === "string" ? undefined : quem;
  if (player?.isValid) limparItens(player);
  if (!rodada || rodada.tiros === 0) return;
  const cfg = config();
  const d = lerDados();
  const agora = Date.now();
  const dia = diaBrasilia(agora);
  const sem = semanaDe(dia);
  const nome = player?.name ?? dadosJogador(id).nome ?? textos.NOME_DESCONHECIDO;

  const premio = d.premios[id]?.dia === dia ? d.premios[id] : { dia, g: 0 };
  premio.ult = agora;
  const caudas = Math.max(0, Math.min(Math.floor(rodada.pontos / cfg.tiroPontosPorCauda), cfg.tiroPremioDia - premio.g));
  if (caudas > 0) {
    premio.g += caudas;
    adicionarCaudas(id, caudas, textos.MOTIVO);
  }
  d.premios[id] = premio;

  const r = d.recordes[id] ?? { n: nome, dia, vd: 0, sem, vs: 0 };
  if (r.dia !== dia) {
    r.dia = dia;
    r.vd = 0;
  }
  if (r.sem !== sem) {
    r.sem = sem;
    r.vs = 0;
  }
  r.n = nome;
  const recorde = rodada.pontos > r.vd;
  if (recorde) r.vd = rodada.pontos;
  if (rodada.pontos > r.vs) r.vs = rodada.pontos;
  d.recordes[id] = r;
  gravar();
  atualizarPlacar();

  if (player?.isValid) {
    mostrarTitulo(player, textos.FIM_TITULO, { subtitulo: textos.FIM_SUB(rodada.pontos), entrada: 4, fica: 40, saida: 10 });
    msg(player, textos.FIM_CHAT(rodada.pontos, rodada.acertos, rodada.tiros, caudas, recorde && rodada.pontos > 0));
    som(player, "random.levelup", { pitch: 1.1, volume: 0.8 });
  }
}

/**
 * Pontos de um acerto: o anel (pela distância ao centro do alvo) vezes a distância até o posto.
 * @param {number} desvio  distância do acerto ao centro do alvo, em blocos
 * @param {import("@minecraft/server").Vector3} acerto
 * @param {Posto} posto
 */
function pontuar(desvio, acerto, posto) {
  const cfg = config();
  const anel = desvio < 0.12 ? 3 : desvio < 0.28 ? 2 : 1;
  const longe = Math.hypot(acerto.x - posto.x, acerto.z - posto.z);
  const mult = longe <= cfg.tiroPertoBlocos ? 1 : longe <= cfg.tiroMedioBlocos ? 2 : 3;
  return { pontos: anel * mult, mult, anel: anel === 3 ? textos.ANEL_MOSCA : anel === 2 ? textos.ANEL_MEIO : textos.ANEL_BORDA, mosca: anel === 3 };
}

/**
 * Conta um disparo da rodada: com `alvo` pontua, sem ele é erro. Fecha a rodada no último disparo.
 * @param {Player} player
 * @param {Rodada} rodada
 * @param {{ desvio: number, acerto: import("@minecraft/server").Vector3, centro: import("@minecraft/server").Vector3, dim: import("@minecraft/server").Dimension, bonus: number } | undefined} alvo
 */
function contarDisparo(player, rodada, alvo) {
  const posto = lerDados().posto;
  if (!posto) return;
  const cfg = config();
  rodada.tiros++;
  ultimoTiro.set(player.id, system.currentTick);
  const restam = Math.max(0, cfg.tiroFlechas - rodada.tiros);
  if (alvo) {
    const r = pontuar(alvo.desvio, alvo.acerto, posto);
    const pontos = r.pontos * alvo.bonus;
    rodada.acertos++;
    rodada.pontos += pontos;
    player.onScreenDisplay.setActionBar(textos.ACERTO(pontos, r.anel, r.mult * alvo.bonus, restam));
    som(player, r.mosca ? "random.levelup" : "random.orb", { pitch: r.mosca ? 1.4 : 1, volume: 0.8 });
    efeitos.anel(alvo.dim, alvo.centro, { raio: 0.7, n: r.mosca ? 12 : 6, y: 0 }, "minecraft:colored_flame_particle", [LARANJA, DOURADO]);
    if (r.mosca) efeitos.nuvem(alvo.dim, alvo.centro, { n: 6, largura: 0.6, y0: -0.3, alto: 1 }, "minecraft:endrod");
  } else {
    player.onScreenDisplay.setActionBar(textos.ERROU(restam));
  }
  if (rodada.tiros >= cfg.tiroFlechas) system.run(() => encerrar(player));
}

/**
 * A flecha sai de cena depois de um tempo (ou na hora, se bateu no alvo móvel).
 * @param {Entity} projetil
 * @param {number} ticks
 */
function sumirFlecha(projetil, ticks) {
  system.runTimeout(() => {
    try {
      if (projetil.isValid) projetil.remove();
    } catch {
      // já sumiu
    }
  }, ticks);
}

world.afterEvents.projectileHitBlock.subscribe((ev) => {
  try {
    const player = ev.source;
    if (!(player instanceof Player) || ev.projectile?.typeId !== FLECHA) return;
    const rodada = rodadas.get(player.id);
    if (!rodada || !lerDados().posto) return;
    sumirFlecha(ev.projectile, TICKS_FLECHA);
    const bloco = ev.getBlockHit().block;
    if (bloco.typeId !== ALVO) {
      contarDisparo(player, rodada, undefined);
      return;
    }
    const centro = { x: bloco.location.x + 0.5, y: bloco.location.y + 0.5, z: bloco.location.z + 0.5 };
    // O maior desvio é o eixo da face (0,5); os outros dois dizem o quão longe do centro foi.
    const desvios = [ev.location.x - centro.x, ev.location.y - centro.y, ev.location.z - centro.z].map(Math.abs).sort((a, b) => a - b);
    contarDisparo(player, rodada, { desvio: Math.hypot(desvios[0], desvios[1]), acerto: ev.location, centro, dim: bloco.dimension, bonus: 1 });
  } catch (e) {
    registrarErro("Tiro: flecha no bloco", e);
  }
});

world.afterEvents.projectileHitEntity.subscribe((ev) => {
  try {
    const player = ev.source;
    if (!(player instanceof Player) || ev.projectile?.typeId !== FLECHA) return;
    const alvo = ev.getEntityHit().entity;
    if (alvo?.typeId !== ENTIDADE_ALVO) return;
    const rodada = rodadas.get(player.id);
    const dados = lerDados();
    const slot = slotDe(alvo);
    const movel = slot ? dados.moveis[slot] : undefined;
    if (!rodada || !dados.posto || !slot || !movel) return;
    sumirFlecha(ev.projectile, 1);
    const centro = { x: alvo.location.x, y: alvo.location.y + 0.5, z: alvo.location.z };
    // Lateral do alvo (perpendicular a quem atira) e altura: o "plano" dos anéis.
    const { rx, rz } = eixoLateral(movel);
    const lateral = (ev.location.x - centro.x) * rx + (ev.location.z - centro.z) * rz;
    const desvio = Math.hypot(lateral, ev.location.y - centro.y);
    contarDisparo(player, rodada, { desvio, acerto: ev.location, centro, dim: alvo.dimension, bonus: Math.max(1, config().tiroBonusMovel) + (Number(slot) - 1) });
  } catch (e) {
    registrarErro("Tiro: flecha no alvo móvel", e);
  }
});

// ------------------------------------------------------------------------------ alvos móveis

const ENTIDADE_ALVO = "vulpus:alvo";
const TAG_ALVO = "vulpus_tiro_alvo";
const PASSO_MOVEL = 100;
const VER_MOVEL = 96;
/** Velocidade de cada número em relação à configurada: 1 normal, 2 e 3 mais rápidos, 4 rápido e subindo e descendo. */
const VELOCIDADE_ALVO = [1, 1.5, 2, 2];
/** O alvo 4 sobe e desce BOB blocos para cada lado, num ciclo de CICLO_BOB ticks (suave, nada frenético). */
const BOB = 0.6;
const CICLO_BOB = 70;

/** Número (1 a 4) do alvo, pela tag da entidade. @param {Entity} ent */
function slotDe(ent) {
  for (const tag of ent.getTags()) {
    const m = /^vulpus_tiro_alvo_([1-4])$/.exec(tag);
    if (m) return m[1];
  }
  return undefined;
}

/**
 * Eixo lateral (para onde o alvo vai e volta): perpendicular à direção alvo → posto.
 * @param {Movel} m
 */
function eixoLateral(m) {
  // yaw 0 olha para +z; olhando na direção (fx, fz) = (-sin yaw, cos yaw), a lateral é (cos yaw, sin yaw).
  const rad = (m.yaw * Math.PI) / 180;
  return { rx: Math.cos(rad), rz: Math.sin(rad) };
}

/** @returns {Entity[]} */
function acharAlvos() {
  return achadas("tiro:alvos", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE_ALVO }));
    return achados.filter((e) => e.getTags().some((t) => t.startsWith(TAG_ALVO)));
  });
}

/** Garante uma (e só uma) entidade por alvo marcado, e nenhuma para os que não existem mais. */
function manterAlvos() {
  try {
    const moveis = lerDados().moveis;
    const achados = acharAlvos();
    for (const e of achados) {
      const n = slotDe(e);
      if (!n || !moveis[n]) e.remove();
    }
    for (let i = 1; i <= ALVOS_MOVEIS; i++) {
      const n = String(i);
      const m = moveis[n];
      if (!m) continue;
      const dim = world.getDimension(m.d);
      if (!dim.isChunkLoaded(m)) continue;
      const mesmos = achados.filter((e) => e.isValid && slotDe(e) === n);
      let ent = mesmos.find((e) => e.dimension.id === dim.id);
      for (const e of mesmos) if (e !== ent) e.remove();
      if (!ent) {
        ent = dim.spawnEntity(ENTIDADE_ALVO, m);
        ent.addTag(`${TAG_ALVO}_${n}`);
        esquecerBusca("tiro:alvos");
        ent.nameTag = textos.NOME_MOVEL(i);
      }
      ent.setRotation({ x: 0, y: m.yaw });
      ent.setProperty("vulpus:palito", i === ALVOS_MOVEIS);
      alvosVivos.set(n, ent);
    }
  } catch (e) {
    registrarErro("Tiro: manter os alvos móveis", e);
  }
}

/** @type {Map<string, Entity>} número do alvo → entidade (guardada para não procurar a cada tick) */
const alvosVivos = new Map();
/** @type {Map<string, number>} número do alvo → 0 = ninguém perto (parado), 1 = anda todo tick, SALTO_LONGE = anda espaçado (reavaliado a cada CICLO_PERTO ticks) */
const alvoAtivo = new Map();
/** @type {Map<string, string>} número do alvo → última posição lateral/vertical enviada (evita teleporte igual ao anterior) */
const ultimaPosAlvo = new Map();
/** De quantos em quantos ticks se confere se há alguém perto dos alvos (parados, não custam nada). */
const CICLO_PERTO = 10;
/** Até esta distância o alvo anda todo tick; daí até VER_MOVEL, a cada SALTO_LONGE ticks (de longe não se nota). */
const VER_DETALHE = 64;
const SALTO_LONGE = 3;
let proximaConferencia = 0;
let proximaBusca = 0;

/** A cada tick os alvos vão e voltam (seno: devagar nas pontas), só se alguém está por perto. */
function moverAlvos() {
  const moveis = lerDados().moveis;
  const numeros = Object.keys(moveis);
  if (!numeros.length) return;
  try {
    const agora = system.currentTick;
    if (agora >= proximaConferencia) {
      proximaConferencia = agora + CICLO_PERTO;
      for (const n of numeros) {
        const m = moveis[n];
        alvoAtivo.set(n, alguemPerto(m, m.d, VER_DETALHE) ? 1 : alguemPerto(m, m.d, VER_MOVEL) ? SALTO_LONGE : 0);
      }
    }
    const v = Math.max(1, config().tiroAlvoVelocidade);
    for (const n of numeros) {
      const ritmo = alvoAtivo.get(n) ?? 0;
      if (!ritmo || (ritmo > 1 && agora % ritmo !== 0)) continue;
      const m = moveis[n];
      let ent = alvosVivos.get(n);
      if (!ent?.isValid) {
        // Sumiu (chunk descarregado, morreu): procura de novo, no máximo a cada 20 ticks.
        if (agora < proximaBusca) continue;
        proximaBusca = agora + 20;
        for (const e of acharAlvos()) {
          const k = slotDe(e);
          if (k) alvosVivos.set(k, e);
        }
        ent = alvosVivos.get(n);
        if (!ent?.isValid) continue;
      }
      if (ent.dimension.id !== m.d) continue;
      const i = Number(n);
      const t = agora + i * 37;
      const deslocamento = Math.sin((t * v * VELOCIDADE_ALVO[i - 1]) / (20 * m.amp)) * m.amp;
      const altura = i === ALVOS_MOVEIS ? Math.sin((t * Math.PI * 2) / CICLO_BOB) * BOB : 0;
      const { rx, rz } = eixoLateral(m);
      const destino = { x: m.x + rx * deslocamento, y: m.y + altura, z: m.z + rz * deslocamento };
      const chave = `${destino.x.toFixed(3)}|${destino.y.toFixed(3)}|${destino.z.toFixed(3)}`;
      if (ultimaPosAlvo.get(n) === chave) continue;
      ultimaPosAlvo.set(n, chave);
      ent.teleport(destino, { dimension: ent.dimension });
    }
  } catch (e) {
    registrarErro("Tiro: mover os alvos", e);
  }
}
system.runInterval(manterAlvos, PASSO_MOVEL);
system.runInterval(moverAlvos, 1);

/**
 * Mensagem na actionbar com recarga (não repete a cada passo).
 * @param {Player} player
 * @param {string} texto
 */
function dica(player, texto) {
  const agora = system.currentTick;
  if (agora - (avisoDica.get(player.id) ?? -Infinity) < AVISO_DICA) return;
  avisoDica.set(player.id, agora);
  player.onScreenDisplay.setActionBar(texto);
}

/**
 * Quem chega perto do posto, mas ainda fora do círculo, recebe a dica de onde ficar.
 * @param {Player} player
 * @param {Posto} posto
 */
function dicaDePerto(player, posto) {
  if (player.dimension.id !== posto.d) return;
  const { x, z } = player.location;
  if (Math.hypot(x - posto.x, z - posto.z) <= posto.r + PERTO_DO_POSTO) dica(player, textos.DICA_FORA);
}

// Entra no posto = começa a rodada; sai (ou fica parado demais) = termina.
system.runInterval(() => {
  try {
    const posto = lerDados().posto;
    const ligado = config().tiroLigado;
    if (!rodadas.size && !(posto && ligado)) return; // sem posto ligado e sem rodada: nada a conferir
    for (const player of online()) {
      const rodada = rodadas.get(player.id);
      const dentro = !!posto && ligado && noPosto(player, posto);
      if (rodada && (!dentro || system.currentTick - (ultimoTiro.get(player.id) ?? 0) > TICKS_OCIOSA)) encerrar(player);
      else if (!rodada && dentro) {
        if (player.playerPermissionLevel === PlayerPermissionLevel.Visitor) dica(player, textos.VISITANTE);
        else iniciar(player);
      } else if (!rodada && posto && ligado) dicaDePerto(player, posto);
    }
  } catch (e) {
    registrarErro("Tiro: posto", e);
  }
}, PASSO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  if (rodadas.has(playerId)) encerrar(playerId);
});

// Quem entrou com o arco do posto no inventário (queda do servidor, /reload) o perde ao reaparecer.
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  if (!rodadas.has(player.id)) limparItens(player);
});
system.runTimeout(() => {
  for (const player of world.getPlayers()) if (!rodadas.has(player.id)) limparItens(player);
}, 40);

// ------------------------------------------------------------------------------------- placar

/**
 * @param {(r: Recorde) => number} valor
 * @param {boolean} hoje
 */
function topo(valor, hoje) {
  const dia = diaBrasilia(Date.now());
  const sem = semanaDe(dia);
  return Object.values(lerDados().recordes)
    .filter((r) => (hoje ? r.dia === dia : r.sem === sem) && valor(r) > 0)
    .sort((a, b) => valor(b) - valor(a))
    .slice(0, 3);
}

function textoPlacar() {
  const linhas = (/** @type {Recorde[]} */ lista, /** @type {(r: Recorde) => number} */ valor) =>
    lista.length ? lista.map((r, i) => textos.PLACAR_LINHA(i + 1, r.n || textos.NOME_DESCONHECIDO, valor(r))) : [textos.PLACAR_VAZIO];
  const hoje = (/** @type {Recorde} */ r) => r.vd;
  const semana = (/** @type {Recorde} */ r) => r.vs;
  return [textos.PLACAR_TITULO, textos.PLACAR_HOJE, ...linhas(topo(hoje, true), hoje), textos.PLACAR_SEMANA, ...linhas(topo(semana, false), semana)].join("\n");
}

/** Título flutuante em cima do posto (para saber onde ficar). */
function manterTituloPosto() {
  try {
    const posto = lerDados().posto;
    const ponto = posto && config().tiroLigado ? { x: posto.x, y: posto.y + 2.4, z: posto.z, d: posto.d } : undefined;
    manterTexto(TAG_POSTO, ponto, textos.TITULO_POSTO);
  } catch (e) {
    registrarErro("Tiro: título do posto", e);
  }
}

/** Põe, move, atualiza ou tira o placar flutuante (entidade vulpus:texto só com o nome). */
function atualizarPlacar() {
  manterTituloPosto();
  try {
    manterTexto(TAG_PLACAR, lerDados().placar, textoPlacar());
  } catch (e) {
    registrarErro("Tiro: placar flutuante", e);
  }
}
system.runInterval(atualizarPlacar, PASSO_PLACAR);

// ------------------------------------------------------------------------------------ comandos

/**
 * @param {Player} player
 * @param {number | undefined} raio
 */
export function definirPosto(player, raio) {
  const d = lerDados();
  const r = limitar(Math.floor(raio ?? d.posto?.r ?? RAIO_PADRAO), 1, RAIO_MAX);
  const { x, y, z } = player.location;
  d.posto = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id, r };
  gravar();
  atualizarPlacar();
  ok(player, textos.POSTO_DEFINIDO(formatarCoords(d.posto), r));
}

/** @param {Player} player */
export function definirPlacar(player) {
  const { x, y, z } = player.location;
  lerDados().placar = { x: Math.round(x * 10) / 10, y: Math.round((y + 1.8) * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id };
  gravar();
  atualizarPlacar();
  ok(player, textos.PLACAR_DEFINIDO);
}

/** @param {Player} player */
export function removerTiro(player) {
  const d = lerDados();
  if (!d.posto && !d.placar && !Object.keys(d.moveis).length) {
    erro(player, textos.SEM_POSTO);
    return;
  }
  for (const id of [...rodadas.keys()]) encerrar(id);
  d.posto = undefined;
  d.placar = undefined;
  d.moveis = {};
  manterAlvos();
  gravar();
  atualizarPlacar();
  ok(player, textos.TIRO_REMOVIDO);
}

registrarComando(
  {
    nome: "definirtiro",
    descricao: textos.CMD_DEFINIRTIRO,
    staff: true,
    parametros: [{ nome: "raio", tipo: "inteiro", opcional: true }],
  },
  (p, [raio]) => definirPosto(p, raio),
);
registrarComando({ nome: "placartiro", descricao: textos.CMD_PLACARTIRO, staff: true }, (p) => definirPlacar(p));
registrarComando({ nome: "removertiro", descricao: textos.CMD_REMOVERTIRO, staff: true }, (p) => removerTiro(p));

/**
 * Põe o alvo móvel `slot` (1 a 4) onde a staff está, olhando para o posto, indo e voltando `amplitude` blocos.
 * @param {Player} player
 * @param {number} slot
 * @param {number | undefined} amplitude
 */
export function definirMovel(player, slot, amplitude) {
  const d = lerDados();
  if (!d.posto) {
    erro(player, textos.SEM_POSTO_MOVEL);
    return;
  }
  const n = limitar(Math.floor(slot), 1, ALVOS_MOVEIS);
  const amp = limitar(Math.floor(amplitude ?? d.moveis[n]?.amp ?? 4), 1, 30);
  const { x, y, z } = player.location;
  const fx = d.posto.x - x;
  const fz = d.posto.z - z;
  const yaw = Math.round((Math.atan2(-fx, fz) * 180) / Math.PI);
  d.moveis[String(n)] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id, amp, yaw };
  gravar();
  manterAlvos();
  ok(player, textos.MOVEL_DEFINIDO(n, amp));
}

/**
 * Tira só o alvo móvel `slot`.
 * @param {Player} player
 * @param {number} slot
 */
export function removerMovel(player, slot) {
  const d = lerDados();
  const n = String(limitar(Math.floor(slot), 1, ALVOS_MOVEIS));
  if (!d.moveis[n]) {
    erro(player, textos.SEM_MOVEL(Number(n)));
    return;
  }
  delete d.moveis[n];
  gravar();
  manterAlvos();
  ok(player, textos.MOVEL_REMOVIDO(Number(n)));
}

registrarComando(
  {
    nome: "alvomovel",
    descricao: textos.CMD_ALVOMOVEL,
    staff: true,
    parametros: [
      { nome: "alvo", tipo: "inteiro", opcional: true },
      { nome: "amplitude", tipo: "inteiro", opcional: true },
    ],
  },
  (p, [alvo, amp]) => definirMovel(p, alvo ?? 1, amp),
);

/** Marcações atuais do tiro ao alvo (para o painel da staff). */
export function estadoTiro() {
  const d = lerDados();
  return { posto: d.posto, placar: d.placar, moveis: d.moveis };
}

/**
 * Muda só o raio do posto (sem mudar o lugar).
 * @param {Player} player
 * @param {number} raio
 */
export function mudarRaioPosto(player, raio) {
  const d = lerDados();
  if (!d.posto) {
    erro(player, textos.SEM_POSTO);
    return;
  }
  d.posto.r = limitar(Math.floor(raio), 1, RAIO_MAX);
  gravar();
  ok(player, textos.RAIO_POSTO(d.posto.r));
}

/**
 * Muda só a amplitude do alvo móvel `slot` (sem mudar o lugar).
 * @param {Player} player
 * @param {number} slot
 * @param {number} amplitude
 */
export function mudarAmplitude(player, slot, amplitude) {
  const d = lerDados();
  const n = String(limitar(Math.floor(slot), 1, ALVOS_MOVEIS));
  const m = d.moveis[n];
  if (!m) {
    erro(player, textos.SEM_MOVEL(Number(n)));
    return;
  }
  m.amp = limitar(Math.floor(amplitude), 1, 30);
  gravar();
  ok(player, textos.MOVEL_DEFINIDO(Number(n), m.amp));
}

export const LIMITES_TIRO = Object.freeze({ raioMax: RAIO_MAX, ampMax: 30, alvos: ALVOS_MOVEIS });
