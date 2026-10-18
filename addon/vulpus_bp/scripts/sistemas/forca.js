// @ts-check
// Teste de Força: a barraca da feira. A pessoa clica (ou bate) na plataforma, paga e um marcador dourado começa a subir
// e descer pelo mastro, cada vez mais rápido; clicar de novo para o marcador. Quanto mais alto, maior o prêmio: o topo
// paga bem, o meio devolve as Caudas e o fundo perde. Tem espera entre testes e limites de lucro e de perda por dia.
// O painel da staff está em feira_staff.js.
import { Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import * as textos from "../textos/forca.js";
import { INDICE_MARCADOR_FORCA } from "../textos/props_modelos.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { achadas, esquecerBusca } from "../core/entidades.js";
import { alguemPerto } from "../core/jogadores.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {{ dia: string, ganho: number, perda: number, ult: number }} Registro */
/** @typedef {{ pad?: Ponto, base?: Ponto, topoY?: number, jogadores: Record<string, Registro>, recorde?: { nome: string, pct: number } }} Dados */

const CHAVE = "vulpus:forca";
const ENTIDADE = "vulpus:prop";
const TAG_MARCADOR = "vulpus_forca_marcador";
const TAG_TITULO = "vulpus_forca_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;
const ALTURA_TITULO = 2.4;
/** Faixas do medidor (fração da altura): daqui para cima paga o prêmio do topo, do alto, ou devolve a aposta. */
const FAIXA_TOPO = 0.9;
const FAIXA_ALTO = 0.7;
const FAIXA_MEDIO = 0.45;
/** Velocidade do marcador (fração da altura por tick): começa devagar e acelera até o máximo. */
const VEL_INICIAL = 0.02;
const VEL_MAXIMA = 0.036;
const ACELERACAO = 0.00012;
const TICKS_MAX = 220;
/** Ticks depois de começar em que o clique ainda não para (evita parar sem querer). */
const CARENCIA = 8;
const TICKS_PARADO = 50;

/** @type {Dados | undefined} */
let dados;
/** @type {{ fase: "contagem" | "correndo" | "fim", id: string, nome: string, custo: number } | undefined} */
let jogo;
/** Fração atual do marcador (0 a 1) enquanto corre. */
let fracao = 0;
let tickInicio = 0;
/** @type {(() => void) | undefined} */
let pararAgora;

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
  const rec = s.recorde;
  dados = {
    pad: ehPonto(s.pad) ? { x: s.pad.x, y: s.pad.y, z: s.pad.z, d: s.pad.d } : undefined,
    base: ehPonto(s.base) ? { x: s.base.x, y: s.base.y, z: s.base.z, d: s.base.d } : undefined,
    topoY: Number.isFinite(s.topoY) ? s.topoY : undefined,
    jogadores,
    recorde: rec && typeof rec.nome === "string" && Number.isFinite(rec.pct) ? { nome: rec.nome.slice(0, 32), pct: Math.max(0, Math.min(100, Math.round(rec.pct))) } : undefined,
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/**
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

/** Altura do mastro em blocos (0 se as marcas não servem). @param {Dados} d */
function altura(d) {
  return d.base && d.topoY !== undefined ? Math.max(0, d.topoY - d.base.y) : 0;
}

/** Pronto para jogar: plataforma, base e topo marcados e o topo acima da base. @param {Dados} d */
const completo = (d) => !!d.pad && !!d.base && altura(d) >= 2;

/**
 * Prêmio em múltiplo da aposta para a fração em que parou.
 * @param {number} f
 */
function multiplicador(f) {
  const cfg = config();
  if (f >= FAIXA_TOPO) return cfg.forcaPremioTopo;
  if (f >= FAIXA_ALTO) return cfg.forcaPremioAlto;
  if (f >= FAIXA_MEDIO) return 1;
  return 0;
}

// ---------------------------------------------------------------------------- marcador e título
/** @returns {Entity[]} */
function acharMarcadores() {
  return achadas("forca:marcador", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_MARCADOR] }));
    return achados;
  });
}

/** @param {Dados} d */
function textoTitulo(d) {
  const cfg = config();
  return textos.TITULO_FLUTUANTE(cfg.forcaCusto, cfg.forcaPremioTopo, d.recorde);
}

/** @param {Ponto} base @param {number} f */
const pontoNaFracao = (base, f, alto = altura(lerDados())) => ({ x: base.x, y: base.y + f * alto, z: base.z });

/** Garante o marcador parado na base e o título flutuante em cima da plataforma. */
function manter() {
  try {
    const d = lerDados();
    const ligada = config().forcaLigada;
    const pronto = ligada && completo(d);
    manterTexto(TAG_TITULO, pronto && d.pad ? { x: d.pad.x + 0.5, y: d.pad.y + ALTURA_TITULO, z: d.pad.z + 0.5, d: d.pad.d } : undefined, textoTitulo(d));
    const achados = acharMarcadores();
    if (!pronto || !d.base) {
      for (const e of achados) e.remove();
      return;
    }
    if (jogo) return;
    const dim = world.getDimension(d.base.d);
    const p = pontoNaFracao(d.base, 0);
    if (!dim.isChunkLoaded(p)) return;
    let ent = achados.find((e) => e.dimension.id === dim.id);
    for (const e of achados) if (e !== ent) e.remove();
    if (!ent) {
      ent = dim.spawnEntity(ENTIDADE, p);
      ent.addTag(TAG_MARCADOR);
      esquecerBusca("forca:marcador");
    } else if (Math.hypot(ent.location.x - p.x, ent.location.y - p.y, ent.location.z - p.z) > 0.05) {
      ent.teleport(p, { dimension: dim });
    }
    ent.setProperty("vulpus:modelo", INDICE_MARCADOR_FORCA);
  } catch (e) {
    registrarErro("Teste de Força: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** Só solta faíscas com alguém a até tantos blocos do marcador. */
const VER_FAISCAS = 64;

/** Parado, o marcador solta faíscas para chamar atenção (e mostrar onde ele fica). */
system.runInterval(() => {
  try {
    if (jogo) return;
    const ent = marcadorVivo();
    if (!ent) return;
    if (!alguemPerto(ent.location, ent.dimension.id, VER_FAISCAS)) return; // sem ninguém por perto, ninguém vê as faíscas
    efeitos.nuvem(ent.dimension, ent.location, { n: 3, largura: 0.4, y0: 0.2, alto: 0.8 }, "minecraft:endrod");
  } catch (e) {
    registrarErro("Teste de Força: faíscas", e);
  }
}, 20);

/** Quem está por perto ouve. @param {Ponto} p @param {string} id @param {number} tom */
function ouvir(p, id, tom) {
  try {
    for (const j of world.getDimension(p.d).getPlayers({ location: p, maxDistance: 24 })) som(j, id, { location: p, pitch: tom, volume: 0.9 });
  } catch (e) {
    registrarErro("Teste de Força: som", e);
  }
}

// ------------------------------------------------------------------------------------- jogo
/**
 * Confere se a pessoa pode jogar agora. Devolve o motivo (texto de erro) ou undefined.
 * @param {Player} player
 */
function motivoDeNao(player) {
  const cfg = config();
  const d = lerDados();
  if (!cfg.forcaLigada || !completo(d)) return textos.JOGO_FECHADO;
  if (jogo) return textos.OCUPADA;
  const r = registroDe(d, player.id);
  const espera = Math.ceil((r.ult + cfg.forcaEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return textos.RECARGA(espera);
  if (r.ganho >= cfg.forcaGanhoMaxDia) return textos.GANHO_MAX;
  if (cfg.forcaPerdaMaxDia - r.perda < cfg.forcaCusto) return textos.PERDA_MAX;
  if (saldo(player) < cfg.forcaCusto) return textos.SEM_CAUDAS(cfg.forcaCusto);
  return undefined;
}

/** O marcador da partida em andamento. */
function marcadorVivo() {
  return acharMarcadores().find((e) => e.isValid);
}

/** @param {Player} player */
function comecar(player) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const d = lerDados();
  const base = /** @type {Ponto} */ (d.base);
  const custo = config().forcaCusto;
  const r = registroDe(d, player.id);
  r.ult = Date.now();
  adicionarCaudas(player, -custo);
  gravar();
  const id = player.id;
  jogo = { fase: "contagem", id, nome: player.name, custo };
  fracao = 0;
  msg(player, textos.COMECOU(custo));
  let n = 3;
  const contar = () => {
    try {
      const p = world.getAllPlayers().find((x) => x.id === id);
      if (!jogo || jogo.id !== id) return;
      if (n > 0) {
        if (p?.isValid) p.onScreenDisplay.setActionBar(textos.CONTAGEM(n));
        ouvir(base, "note.pling", 0.8 + (3 - n) * 0.2);
        n--;
        system.runTimeout(contar, 20);
        return;
      }
      if (p?.isValid) mostrarTitulo(p, textos.VAI, { entrada: 0, fica: 10, saida: 5 });
      ouvir(base, "random.levelup", 1.4);
      correr();
    } catch (e) {
      registrarErro("Teste de Força: contagem", e);
      jogo = undefined;
    }
  };
  contar();
}

/** O marcador sobe e desce até alguém clicar na plataforma (ou o tempo acabar). */
function correr() {
  const d = lerDados();
  const base = /** @type {Ponto} */ (d.base);
  const atual = jogo;
  const ent = marcadorVivo();
  if (!atual || !ent) {
    jogo = undefined;
    return;
  }
  atual.fase = "correndo";
  const dim = world.getDimension(base.d);
  const alto = altura(d);
  let fase = 0;
  let vel = VEL_INICIAL;
  let i = 0;
  tickInicio = system.currentTick;
  let terminou = false;
  const run = system.runInterval(() => {
    try {
      if (terminou) return;
      i++;
      if (!ent.isValid || jogo !== atual) {
        terminou = true;
        system.clearRun(run);
        jogo = undefined;
        return;
      }
      fase += vel;
      vel = Math.min(VEL_MAXIMA, vel + ACELERACAO);
      const m = fase % 2;
      fracao = m < 1 ? m : 2 - m;
      const p = pontoNaFracao(base, fracao, alto);
      ent.teleport(p, { dimension: dim });
      if (i % 2 === 0) efeitos.nuvem(dim, p, { n: 2, largura: 0.3, y0: 0.2, alto: 0.6 }, "minecraft:basic_flame_particle");
      if (i % 5 === 0) ouvir(base, "note.hat", 0.8 + fracao * 1.2);
      if (i % 6 === 0) {
        const jogador = world.getAllPlayers().find((x) => x.id === atual.id);
        if (jogador?.isValid) jogador.onScreenDisplay.setActionBar(textos.BARRA_PARE);
      }
      if (i >= TICKS_MAX) parar();
    } catch (e) {
      terminou = true;
      system.clearRun(run);
      jogo = undefined;
      registrarErro("Teste de Força: marcador", e);
    }
  }, 1);
  const parar = () => {
    if (terminou) return;
    terminou = true;
    system.clearRun(run);
    pararAgora = undefined;
    finalizar(atual, fracao, ent, dim);
  };
  pararAgora = parar;
}

/**
 * Paga (ou não) pelo ponto em que o marcador parou e solta a barraca de novo.
 * @param {{ fase: string, id: string, nome: string, custo: number }} atual
 * @param {number} f
 * @param {Entity} ent
 * @param {import("@minecraft/server").Dimension} dim
 */
function finalizar(atual, f, ent, dim) {
  try {
    atual.fase = "fim";
    const d = lerDados();
    const base = /** @type {Ponto} */ (d.base);
    const pct = Math.round(f * 100);
    const mult = multiplicador(f);
    const premio = Math.floor(atual.custo * mult);
    const r = registroDe(d, atual.id);
    if (premio > 0) adicionarCaudas(atual.id, premio);
    if (premio > atual.custo) r.ganho += premio - atual.custo;
    else if (premio < atual.custo) r.perda += atual.custo - premio;
    let recordeNovo = false;
    if (!d.recorde || pct > d.recorde.pct) {
      d.recorde = { nome: atual.nome, pct };
      recordeNovo = true;
    }
    gravar();
    const p = pontoNaFracao(base, f);
    efeitos.anel(dim, p, { raio: 0.6, n: 12, y: 0 }, "minecraft:basic_flame_particle");
    efeitos.nuvem(dim, p, { n: 8, largura: 0.4, y0: 0, alto: 0.6 }, "minecraft:endrod");
    ouvir(base, mult > 1 ? "random.levelup" : mult === 1 ? "random.orb" : "note.bass", mult > 1 ? 1.2 : 0.9);
    const zona = f >= FAIXA_TOPO ? textos.ZONA_TOPO : f >= FAIXA_ALTO ? textos.ZONA_ALTO : f >= FAIXA_MEDIO ? textos.ZONA_MEDIO : textos.ZONA_BAIXO;
    const jogador = world.getAllPlayers().find((x) => x.id === atual.id);
    if (jogador?.isValid) {
      mostrarTitulo(jogador, textos.TITULO_RESULTADO(pct), { subtitulo: textos.SUB_ZONA(zona), entrada: 2, fica: 40, saida: 10 });
      msg(jogador, textos.CHAT_RESULTADO(pct, premio, atual.custo));
    }
    if (recordeNovo) world.sendMessage(textos.NOVO_RECORDE(atual.nome, pct));
    if (f >= FAIXA_TOPO && premio >= 100) world.sendMessage(textos.GRANDE_VITORIA(atual.nome, premio));
    manterTexto(TAG_TITULO, d.pad ? { x: d.pad.x + 0.5, y: d.pad.y + ALTURA_TITULO, z: d.pad.z + 0.5, d: d.pad.d } : undefined, textoTitulo(d));
    system.runTimeout(() => {
      jogo = undefined;
      manter();
    }, TICKS_PARADO);
  } catch (e) {
    jogo = undefined;
    registrarErro("Teste de Força: resultado", e);
  }
}

/** Alguém clicou ou bateu na plataforma (ou no marcador). @param {Player} player */
function bater(player) {
  const d = lerDados();
  if (!d.pad) return;
  if (!jogo) {
    comecar(player);
    return;
  }
  if (jogo.id !== player.id) {
    erro(player, textos.OCUPADA);
    return;
  }
  if (jogo.fase === "correndo" && system.currentTick - tickInicio >= CARENCIA) pararAgora?.();
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
    if (!mesmoBloco(lerDados().pad, block)) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() => rodarSeguro(player, "Teste de Força", bater));
  } catch (e) {
    registrarErro("Teste de Força: interação", e);
  }
});

// Bater (clique esquerdo) na plataforma também vale, é o "martelo".
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!mesmoBloco(lerDados().pad, ev.block)) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => rodarSeguro(player, "Teste de Força", bater));
  } catch (e) {
    registrarErro("Teste de Força: bater", e);
  }
});

// O marcador é uma entidade e pode "roubar" o clique: vale como se fosse na plataforma.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE || !ev.target.hasTag(TAG_MARCADOR)) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => rodarSeguro(player, "Teste de Força", bater));
  } catch (e) {
    registrarErro("Teste de Força: marcador", e);
  }
});

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  try {
    if (!(damagingEntity instanceof Player) || hitEntity.typeId !== ENTIDADE || !hitEntity.hasTag(TAG_MARCADOR)) return;
    const player = damagingEntity;
    rodarSeguro(player, "Teste de Força", bater);
  } catch (e) {
    registrarErro("Teste de Força: bater no marcador", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  if (jogo?.id === playerId && jogo.fase === "correndo") pararAgora?.();
});

// ------------------------------------------------------------------------------ painel da staff
/** Estado para o painel da staff. */
export function estadoForca() {
  const d = lerDados();
  return { pad: !!d.pad, base: !!d.base, topo: d.topoY !== undefined, emJogo: !!jogo, recorde: d.recorde };
}

/**
 * Onde a staff olha: bloco, ponto exato da mira e a direção da face.
 * @param {Player} player
 */
function olhado(player) {
  try {
    const hit = player.getBlockFromViewDirection({ maxDistance: 8 });
    if (!hit?.block) return undefined;
    return { b: hit.block, fl: hit.faceLocation ?? { x: 0.5, y: 0.5, z: 0.5 }, face: String(hit.face) };
  } catch {
    return undefined;
  }
}

/** @param {string} face */
const normal = (face) => ({ x: face === "East" ? 1 : face === "West" ? -1 : 0, z: face === "South" ? 1 : face === "North" ? -1 : 0 });

/** @param {Player} player */
export function marcarPlataforma(player) {
  const o = olhado(player);
  if (!o) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().pad = { x: o.b.x, y: o.b.y, z: o.b.z, d: o.b.dimension.id };
  gravar();
  manter();
  ok(player, textos.PAD_MARCADO(formatarCoords(o.b)));
}

/** O marcador sobe pela frente do mastro: o ponto da mira empurrado um pouco para fora da face. @param {Player} player */
export function marcarBase(player) {
  const o = olhado(player);
  if (!o) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  const n = normal(o.face);
  const d = lerDados();
  d.base = { x: o.b.x + o.fl.x + n.x * 0.5, y: o.b.y + o.fl.y, z: o.b.z + o.fl.z + n.z * 0.5, d: o.b.dimension.id };
  if (d.topoY !== undefined && d.topoY <= d.base.y) d.topoY = undefined;
  gravar();
  manter();
  ok(player, textos.BASE_MARCADA);
}

/** @param {Player} player */
export function marcarTopo(player) {
  const o = olhado(player);
  if (!o) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().topoY = o.b.y + o.fl.y;
  gravar();
  manter();
  ok(player, textos.TOPO_MARCADO);
}

/** Sobe e desce o marcador uma vez, sem custo nem prêmio. @param {Player} player */
export function testarMarcador(player) {
  const d = lerDados();
  if (!completo(d) || !d.base) {
    erro(player, textos.SEM_MARCAS);
    return;
  }
  if (jogo) {
    erro(player, textos.OCUPADA);
    return;
  }
  const ent = marcadorVivo();
  if (!ent) return;
  const base = d.base;
  const dim = world.getDimension(base.d);
  const alto = altura(d);
  const atual = { fase: "teste", id: player.id, nome: player.name, custo: 0 };
  jogo = /** @type {any} */ (atual);
  let i = 0;
  const total = 60;
  const run = system.runInterval(() => {
    try {
      i++;
      const t = i / total;
      const f = t < 0.5 ? t * 2 : 2 - t * 2;
      if (ent.isValid) ent.teleport(pontoNaFracao(base, f, alto), { dimension: dim });
      if (i < total && ent.isValid) return;
      system.clearRun(run);
      if (jogo === atual) jogo = undefined;
      manter();
    } catch (e) {
      system.clearRun(run);
      if (jogo === atual) jogo = undefined;
      registrarErro("Teste de Força: teste", e);
    }
  }, 1);
}

/** @param {Player} player */
export function removerForca(player) {
  const d = lerDados();
  d.pad = undefined;
  d.base = undefined;
  d.topoY = undefined;
  gravar();
  manter();
  ok(player, textos.REMOVIDO);
}
