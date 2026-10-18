// @ts-check
// Canto comunitário: baú de doações com meta (os itens viram Caudas com limite por dia e a meta paga todo
// mundo que ajudou), mural de recados, fogueira da roda (XP para quem conversa junto) e caixa de sugestões.
// As marcações ficam no mundo; o painel da staff está em comunidade_staff.js.
import { BlockTypes, ItemLockMode, ItemTypes, Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { posicoesOnline } from "../core/jogadores.js";
import { temPalavrao } from "../core/filtro.js";
import { Lista, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { diaBrasilia, erro, limitar, ok, registrarErro, rodarSeguro } from "../core/util.js";
import { barra } from "../glyphs.js";
import * as textos from "../textos/comunidade.js";
import { adicionarCaudas } from "./caudas.js";
import { ganharXp } from "./niveis.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {Ponto & { r: number }} PontoRaio */
/** @typedef {{ id: number, nome: string, item: string, alvo: number, atual: number, feita: boolean }} Meta */
/** @typedef {{ n: string, sem: number, vs: number, mid: number, vm: number, dia: string, g: number, ult: number }} Doador */
/** @typedef {{ id: string, n: string, t: string, ts: number }} Recado */
/** @typedef {{ n: string, t: string, ts: number }} Sugestao */
/**
 * @typedef {object} Dados
 * @property {Ponto} [bau]  bloco do baú de doações
 * @property {Ponto} [mural]  bloco do mural
 * @property {Ponto} [placar]  onde fica o texto flutuante da meta
 * @property {PontoRaio} [fogueira]
 * @property {Meta} [meta]
 * @property {number} metaSeq
 * @property {Record<string, Doador>} doadores
 * @property {Recado[]} recados
 * @property {Sugestao[]} sugestoes
 * @property {Record<string, { rec: number, sug: number }>} esperas  ms da última vez de cada pessoa
 * @property {Record<string, { dia: string, xp: number }>} xpDia  XP da fogueira por dia
 */

const CHAVE = "vulpus:comunidade";
const TAG_PLACAR = "vulpus_com_placar";
const TAG_MURAL = "vulpus_com_mural";
const TAG_TITULO_BAU = "vulpus_com_titulo_bau";
const TAG_TITULO_FOGUEIRA = "vulpus_com_titulo_fogueira";
const PASSO_TEXTO = 200;
const RECADOS_MAX = 8;
const RECADOS_NO_MURAL = 5;
const SUGESTOES_MAX = 30;
const SUGESTAO_LETRAS = 200;
const PASSO_FOGUEIRA = 20;
const PASSO_CHAMAS = 40;
const RAIO_FOGUEIRA_PADRAO = 5;
const RAIO_FOGUEIRA_MAX = 30;
const ALTURA_MURAL = 2.2;
const ALTURA_TITULO_BAU = 1.7;
const ALTURA_TITULO_FOGUEIRA = 2.4;
const SEGMENTOS = 10;
const LARANJA = { red: 1, green: 0.5, blue: 0.08 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };

/** @type {Dados | undefined} */
let dados;

/** @param {any} p */
const ehPonto = (p) => !!p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => typeof n === "number" && Number.isFinite(n));

/** Só os itens que são objetos (o mundo pode ter dado estragado). @param {any} v @returns {any[]} */
const lista = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);

/** Mapa só com valores que são objetos. @param {any} v @returns {Record<string, any>} */
function apenasObjetos(v) {
  /** @type {Record<string, any>} */
  const r = {};
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (x && typeof x === "object") r[k] = x;
  return r;
}

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  const meta = s.meta;
  dados = {
    bau: ehPonto(s.bau) ? s.bau : undefined,
    mural: ehPonto(s.mural) ? s.mural : undefined,
    placar: ehPonto(s.placar) ? s.placar : undefined,
    fogueira: ehPonto(s.fogueira) && Number.isFinite(s.fogueira.r) ? s.fogueira : undefined,
    meta:
      meta && typeof meta.item === "string" && [meta.id, meta.alvo, meta.atual].every((n) => Number.isFinite(n))
        ? { id: meta.id, nome: String(meta.nome ?? ""), item: meta.item, alvo: meta.alvo, atual: meta.atual, feita: !!meta.feita }
        : undefined,
    metaSeq: Number.isFinite(s.metaSeq) ? s.metaSeq : 0,
    doadores: apenasObjetos(s.doadores),
    recados: lista(s.recados).filter((r) => typeof r.id === "string" && typeof r.t === "string" && Number.isFinite(r.ts)).map((r) => ({ id: r.id, n: String(r.n ?? ""), t: r.t, ts: r.ts })),
    sugestoes: lista(s.sugestoes).filter((x) => typeof x.t === "string" && Number.isFinite(x.ts)).map((x) => ({ n: String(x.n ?? ""), t: x.t, ts: x.ts })),
    esperas: apenasObjetos(s.esperas),
    xpDia: apenasObjetos(s.xpDia),
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

const semanaAtual = () => semanaDe(diaBrasilia(Date.now()));

/** @param {string} id */
const nomeItem = (id) => id.replace(/^minecraft:/, "").replace(/_/g, " ");

/** Texto da pessoa sem códigos de cor e com espaços arrumados. @param {string} bruto @param {number} max */
const limpar = (bruto, max) => bruto.replace(/§./g, "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * O registro de doador da pessoa, com o dia e a semana em dia.
 * @param {Dados} d
 * @param {Player} player
 * @returns {Doador}
 */
function doadorDe(d, player) {
  const dia = diaBrasilia(Date.now());
  const sem = semanaAtual();
  const r = d.doadores[player.id] ?? { n: player.name, sem, vs: 0, mid: 0, vm: 0, dia, g: 0, ult: 0 };
  r.n = player.name;
  if (r.sem !== sem) {
    r.sem = sem;
    r.vs = 0;
  }
  if (r.dia !== dia) {
    r.dia = dia;
    r.g = 0;
  }
  d.doadores[player.id] = r;
  return r;
}

// ------------------------------------------------------------------------------------ itens

/**
 * @param {Player} player
 * @param {string} id
 */
function contar(player, id) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && it.typeId === id && it.lockMode === ItemLockMode.none) n += it.amount;
  }
  return n;
}

/**
 * Tira até `qtd` do item do inventário. Devolve quantos tirou.
 * @param {Player} player
 * @param {string} id
 * @param {number} qtd
 */
function retirar(player, id, qtd) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return 0;
  let falta = qtd;
  for (let i = 0; i < inv.size && falta > 0; i++) {
    const it = inv.getItem(i);
    if (!it || it.typeId !== id || it.lockMode !== ItemLockMode.none) continue;
    const tira = Math.min(falta, it.amount);
    if (tira === it.amount) inv.setItem(i, undefined);
    else {
      it.amount -= tira;
      inv.setItem(i, it);
    }
    falta -= tira;
  }
  return qtd - falta;
}

// ----------------------------------------------------------------------------------- doações

/**
 * @param {Dados} d
 * @param {number} [n]
 */
function topDoadores(d, n = 3) {
  const sem = semanaAtual();
  return Object.values(d.doadores)
    .filter((x) => x.sem === sem && x.vs > 0)
    .sort((a, b) => b.vs - a.vs)
    .slice(0, n);
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function mostrarRanking(player, voltar) {
  const top = topDoadores(lerDados(), 5);
  const lista = top.length ? top.map((x, i) => textos.PLACAR_LINHA(i + 1, x.n || textos.NOME_DESCONHECIDO, x.vs)).join("\n") : textos.RANKING_VAZIO;
  await new Lista(textos.TITULO_BAU).texto(textos.RANKING_CORPO(lista)).voltar(voltar).abrir(player);
}

/** @param {Player} player */
async function abrirBau(player) {
  const cfg = config();
  if (!cfg.comLigado) {
    erro(player, textos.SEM_BAU_ATIVO);
    return;
  }
  const d = lerDados();
  const meta = d.meta;
  const lista = new Lista(textos.TITULO_BAU);
  if (!meta) {
    await lista.texto(textos.SEM_META).botao(textos.BOTAO_RANKING, ICONES.trofeu, (p) => mostrarRanking(p, () => abrirBau(p))).abrir(player);
    return;
  }
  const doador = doadorDe(d, player);
  const corpo = [
    textos.META_CORPO(meta.nome, nomeItem(meta.item), barra(meta.alvo ? meta.atual / meta.alvo : 0, SEGMENTOS), meta.atual, meta.alvo, meta.feita),
    textos.MEUS_NUMEROS(doador.mid === meta.id ? doador.vm : 0, doador.g, cfg.comDoacaoMaxDia),
  ].join("\n\n");
  lista.texto(corpo);
  if (!meta.feita) {
    const tenho = contar(player, meta.item);
    if (tenho > 0) lista.botao(textos.BOTAO_DOAR_TUDO(tenho), ICONES.sim, (p) => doar(p, tenho));
    lista.botao(textos.BOTAO_DOAR_QTD, ICONES.editar, async (p) => {
      const r = await perguntar(p, textos.BOTAO_DOAR_QTD, [
        { tipo: "numero", rotulo: textos.ROTULO_QTD, padrao: Math.min(tenho, 64) || 1, min: 1, max: Math.max(1, tenho) },
      ]);
      if (r) doar(p, r[0]);
    });
  }
  lista.botao(textos.BOTAO_RANKING, ICONES.trofeu, (p) => mostrarRanking(p, () => abrirBau(p)));
  await lista.abrir(player);
}

/**
 * Doa `qtd` do item da meta (no máximo o que falta e o que a pessoa tem).
 * @param {Player} player
 * @param {number} qtd
 */
function doar(player, qtd) {
  const cfg = config();
  const d = lerDados();
  const meta = d.meta;
  if (!meta || meta.feita) {
    erro(player, textos.META_FECHADA);
    return;
  }
  const doador = doadorDe(d, player);
  const agora = Date.now();
  const espera = Math.ceil((doador.ult + cfg.comDoacaoEsperaSeg * 1000 - agora) / 1000);
  if (espera > 0) {
    erro(player, textos.ESPERA_DOACAO(espera));
    return;
  }
  const quer = Math.min(Math.floor(qtd), meta.alvo - meta.atual, contar(player, meta.item));
  const n = quer > 0 ? retirar(player, meta.item, quer) : 0;
  if (n <= 0) {
    erro(player, textos.SEM_ITENS);
    return;
  }
  meta.atual += n;
  doador.vs += n;
  if (doador.mid !== meta.id) {
    doador.mid = meta.id;
    doador.vm = 0;
  }
  doador.vm += n;
  doador.ult = agora;
  const caudas = Math.max(0, Math.min(Math.floor(n / cfg.comItensPorCauda), cfg.comDoacaoMaxDia - doador.g));
  if (caudas > 0) {
    doador.g += caudas;
    adicionarCaudas(player, caudas);
  }
  ok(player, textos.DOOU(n, nomeItem(meta.item), caudas));
  if (meta.atual >= meta.alvo) concluirMeta(d, meta);
  gravar();
  atualizarTextos();
}

/**
 * Fecha a meta: paga cada doador (mesmo offline) e avisa o servidor inteiro.
 * @param {Dados} d
 * @param {Meta} meta
 */
function concluirMeta(d, meta) {
  meta.feita = true;
  const premio = config().comMetaPremio;
  if (premio > 0) {
    for (const [id, x] of Object.entries(d.doadores)) {
      if (x.mid === meta.id && x.vm > 0) adicionarCaudas(id, premio, textos.MOTIVO_META);
    }
  }
  world.sendMessage(textos.META_BATIDA(meta.nome, premio));
  const bau = d.bau;
  if (!bau) return;
  try {
    const dim = world.getDimension(bau.d);
    const centro = { x: bau.x + 0.5, y: bau.y + 1, z: bau.z + 0.5 };
    efeitos.anel(dim, centro, { raio: 1.5, n: 16, y: 0 }, "minecraft:colored_flame_particle", [LARANJA, DOURADO]);
    efeitos.nuvem(dim, centro, { n: 12, largura: 1, y0: 0, alto: 2 }, "minecraft:endrod");
  } catch (e) {
    registrarErro("Comunidade: efeito da meta", e);
  }
}

// -------------------------------------------------------------------------------------- mural

/** Recados ainda dentro da validade, do mais novo para o mais velho. @param {Dados} d */
function recadosVivos(d) {
  const limite = Date.now() - config().comRecadoHoras * 3_600_000;
  d.recados = d.recados.filter((r) => r.ts > limite).sort((a, b) => b.ts - a.ts);
  return d.recados;
}

/** @param {Player} player */
async function abrirMural(player) {
  const d = lerDados();
  const recados = recadosVivos(d);
  const corpo = recados.length ? recados.map((r) => textos.MURAL_LINHA(r.t, r.n)).join("\n") : textos.NENHUM_RECADO;
  await new Lista(textos.TITULO_MURAL)
    .texto(corpo)
    .botao(textos.BOTAO_DEIXAR_RECADO, ICONES.editar, (p) => deixarRecado(p))
    .abrir(player);
}

/** Minutos que faltam para a pessoa poder usar de novo (0 = pode). @param {number} ultimo @param {number} min */
const faltamMin = (ultimo, min) => Math.max(0, Math.ceil((ultimo + min * 60_000 - Date.now()) / 60_000));

/** @param {Player} player */
async function deixarRecado(player) {
  const cfg = config();
  const d = lerDados();
  const espera = faltamMin(d.esperas[player.id]?.rec ?? 0, cfg.comRecadoEsperaMin);
  if (espera > 0) {
    erro(player, textos.ESPERA_RECADO(espera));
    return;
  }
  const r = await perguntar(player, textos.TITULO_MURAL, [{ tipo: "texto", rotulo: textos.ROTULO_RECADO, dica: textos.DICA_RECADO, padrao: "" }]);
  if (!r) return;
  const texto = limpar(String(r[0]), cfg.comRecadoMax);
  if (!texto) {
    erro(player, textos.RECADO_VAZIO);
    return;
  }
  if (temPalavrao(texto)) {
    erro(player, textos.RECADO_PALAVRAO);
    return;
  }
  d.recados = d.recados.filter((x) => x.id !== player.id);
  d.recados.push({ id: player.id, n: player.name, t: texto, ts: Date.now() });
  d.recados = recadosVivos(d).slice(0, RECADOS_MAX);
  d.esperas[player.id] = { rec: Date.now(), sug: d.esperas[player.id]?.sug ?? 0 };
  gravar();
  atualizarTextos();
  ok(player, textos.RECADO_OK);
}

// ---------------------------------------------------------------------------------- sugestões

/** @param {Player} player */
export async function enviarSugestao(player) {
  const cfg = config();
  const d = lerDados();
  const espera = faltamMin(d.esperas[player.id]?.sug ?? 0, cfg.comSugestaoEsperaMin);
  if (espera > 0) {
    erro(player, textos.ESPERA_SUGESTAO(espera));
    return;
  }
  const r = await perguntar(player, textos.TITULO_SUGESTAO, [{ tipo: "texto", rotulo: textos.ROTULO_SUGESTAO, dica: textos.DICA_SUGESTAO, padrao: "" }]);
  if (!r) return;
  const texto = limpar(String(r[0]), SUGESTAO_LETRAS);
  if (!texto) {
    erro(player, textos.SUGESTAO_VAZIA);
    return;
  }
  if (temPalavrao(texto)) {
    erro(player, textos.SUGESTAO_PALAVRAO);
    return;
  }
  d.sugestoes.push({ n: player.name, t: texto, ts: Date.now() });
  if (d.sugestoes.length > SUGESTOES_MAX) d.sugestoes.splice(0, d.sugestoes.length - SUGESTOES_MAX);
  d.esperas[player.id] = { rec: d.esperas[player.id]?.rec ?? 0, sug: Date.now() };
  gravar();
  ok(player, textos.SUGESTAO_OK);
}

// ------------------------------------------------------------------------------------ textos

function textoPlacar() {
  const d = lerDados();
  const meta = d.meta;
  const linhas = [textos.PLACAR_TITULO];
  if (meta) {
    linhas.push(`§e${meta.nome}`, `${barra(meta.alvo ? meta.atual / meta.alvo : 0, SEGMENTOS)} §e${meta.atual}§7/${meta.alvo} §f${nomeItem(meta.item)}`);
  } else linhas.push(textos.PLACAR_SEM_META);
  linhas.push(textos.PLACAR_DOADORES);
  const top = topDoadores(d);
  if (top.length) top.forEach((x, i) => linhas.push(textos.PLACAR_LINHA(i + 1, x.n || textos.NOME_DESCONHECIDO, x.vs)));
  else linhas.push(textos.PLACAR_VAZIO);
  return linhas.join("\n");
}

function textoMural() {
  const recados = recadosVivos(lerDados()).slice(0, RECADOS_NO_MURAL);
  return [textos.MURAL_TITULO, ...(recados.length ? recados.map((r) => textos.MURAL_LINHA(r.t, r.n)) : [textos.MURAL_VAZIO])].join("\n");
}

/** Atualiza (ou tira) o placar e o texto do mural. */
function atualizarTextos() {
  try {
    const d = lerDados();
    manterTexto(TAG_PLACAR, d.placar, textoPlacar());
    manterTexto(TAG_TITULO_BAU, d.bau ? { x: d.bau.x + 0.5, y: d.bau.y + ALTURA_TITULO_BAU, z: d.bau.z + 0.5, d: d.bau.d } : undefined, textos.TITULO_FLUTUANTE_BAU);
    manterTexto(TAG_TITULO_FOGUEIRA, d.fogueira ? { x: d.fogueira.x, y: d.fogueira.y + ALTURA_TITULO_FOGUEIRA, z: d.fogueira.z, d: d.fogueira.d } : undefined, textos.TITULO_FLUTUANTE_FOGUEIRA);
    manterTexto(TAG_MURAL, d.mural ? { x: d.mural.x + 0.5, y: d.mural.y + ALTURA_MURAL, z: d.mural.z + 0.5, d: d.mural.d } : undefined, textoMural());
  } catch (e) {
    registrarErro("Comunidade: textos flutuantes", e);
  }
}
system.runInterval(() => {
  if (config().comLigado) atualizarTextos();
}, PASSO_TEXTO);

// ----------------------------------------------------------------------------------- fogueira

/** @type {Map<string, string>} id → posição e olhar na última rodada (quem não mexe nada não conta) */
const ultimaPose = new Map();
let ultimaRodada = 0;

/** @param {Player} player */
function pose(player) {
  const { x, y, z } = player.location;
  const r = player.getRotation();
  return [x, y, z, r.x, r.y].map((n) => Math.round(n * 2)).join(",");
}

function rodarFogueira() {
  const cfg = config();
  const d = lerDados();
  const f = d.fogueira;
  if (!cfg.comLigado || !f) return;
  const dim = world.getDimension(f.d);
  const perto = posicoesOnline()
    .filter((j) => j.d === f.d && Math.hypot(j.x - f.x, j.y - f.y, j.z - f.z) <= f.r && Math.hypot(j.x - f.x, j.z - f.z) <= f.r)
    .map((j) => j.p)
    .filter((p) => String(p.getGameMode()) !== "Spectator");
  const agora = system.currentTick;
  if (perto.length && agora % PASSO_CHAMAS < PASSO_FOGUEIRA) {
    efeitos.nuvem(dim, { x: f.x, y: f.y, z: f.z }, { n: 4, largura: 0.4, y0: 0, alto: 1 }, "minecraft:basic_flame_particle");
  }
  if (agora - ultimaRodada < cfg.comFogueiraSeg * 20) return;
  ultimaRodada = agora;
  const ativos = perto.filter((p) => {
    const atual = pose(p);
    const mexeu = ultimaPose.get(p.id) !== atual;
    ultimaPose.set(p.id, atual);
    return mexeu;
  });
  if (ativos.length < 2) return;
  const bonus = Math.min(ativos.length - 2, cfg.comFogueiraXp * 2);
  const dia = diaBrasilia(Date.now());
  for (const p of ativos) {
    const reg = d.xpDia[p.id]?.dia === dia ? d.xpDia[p.id] : { dia, xp: 0 };
    const xp = Math.min(cfg.comFogueiraXp + bonus, cfg.comFogueiraMaxDia - reg.xp);
    d.xpDia[p.id] = reg;
    if (xp <= 0) continue;
    reg.xp += xp;
    ganharXp(p, xp);
    p.onScreenDisplay.setActionBar(textos.FOGUEIRA_XP(xp, ativos.length));
  }
  gravar();
}
system.runInterval(() => {
  try {
    rodarFogueira();
  } catch (e) {
    registrarErro("Comunidade: fogueira", e);
  }
}, PASSO_FOGUEIRA);

// ------------------------------------------------------------------------------- interações

/**
 * @param {Ponto | undefined} p
 * @param {import("@minecraft/server").Block} bloco
 */
const mesmoBloco = (p, bloco) =>
  !!p && p.d === bloco.dimension.id && p.x === bloco.location.x && p.y === bloco.location.y && p.z === bloco.location.z;

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    const d = lerDados();
    const eBau = mesmoBloco(d.bau, block);
    const eMural = mesmoBloco(d.mural, block);
    if (!eBau && !eMural) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() => rodarSeguro(player, eBau ? "Baú comunitário" : "Mural", eBau ? abrirBau : abrirMural));
  } catch (e) {
    registrarErro("Comunidade: interação", e);
  }
});

// O baú e o mural não são quebrados por quem não é staff.
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    const d = lerDados();
    if (!mesmoBloco(d.bau, ev.block) && !mesmoBloco(d.mural, ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Comunidade: quebrar", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => ultimaPose.delete(playerId));

registrarComando({ nome: "recado", descricao: textos.CMD_RECADO }, (p) => deixarRecado(p));
registrarComando({ nome: "sugestao", descricao: textos.CMD_SUGESTAO }, (p) => enviarSugestao(p));

// ------------------------------------------------------------------------------ painel da staff

/** Marcações e números para o painel da staff. */
export function estadoComunidade() {
  const d = lerDados();
  return {
    bau: !!d.bau,
    mural: !!d.mural,
    fogueira: !!d.fogueira,
    placar: !!d.placar,
    meta: d.meta,
    sugestoes: d.sugestoes.length,
    raioFogueira: d.fogueira?.r ?? RAIO_FOGUEIRA_PADRAO,
  };
}

export const LIMITES_COMUNIDADE = Object.freeze({ raioFogueiraMax: RAIO_FOGUEIRA_MAX });

/** O bloco para onde a staff está olhando. @param {Player} player */
function blocoOlhado(player) {
  try {
    return player.getBlockFromViewDirection({ maxDistance: 8 })?.block;
  } catch {
    return undefined;
  }
}

/** @param {Player} player */
export function marcarBau(player) {
  const b = blocoOlhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().bau = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  gravar();
  atualizarTextos();
  ok(player, textos.BLOCO_MARCADO(`${b.x}, ${b.y}, ${b.z}`));
}

/** @param {Player} player */
export function marcarMural(player) {
  const b = blocoOlhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().mural = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  gravar();
  atualizarTextos();
  ok(player, textos.MURAL_MARCADO);
}

/**
 * Marca a fogueira onde a staff está (mantém o raio se já existir).
 * @param {Player} player
 */
export function marcarFogueira(player) {
  const d = lerDados();
  const { x, y, z } = player.location;
  d.fogueira = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id, r: d.fogueira?.r ?? RAIO_FOGUEIRA_PADRAO };
  gravar();
  atualizarTextos();
  ok(player, textos.FOGUEIRA_MARCADA);
}

/**
 * @param {Player} player
 * @param {number} raio
 */
export function raioFogueira(player, raio) {
  const d = lerDados();
  if (!d.fogueira) {
    marcarFogueira(player);
  }
  if (d.fogueira) {
    d.fogueira.r = limitar(Math.floor(raio), 1, RAIO_FOGUEIRA_MAX);
    gravar();
    ok(player, textos.FOGUEIRA_MARCADA);
  }
}

/** @param {Player} player */
export function marcarPlacar(player) {
  const { x, y, z } = player.location;
  lerDados().placar = { x: Math.round(x * 10) / 10, y: Math.round((y + 1.8) * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id };
  gravar();
  atualizarTextos();
  ok(player, textos.PLACAR_MARCADO);
}

/**
 * Abre uma meta nova (a anterior, se houver, é substituída; os recordes semanais ficam).
 * @param {Player} player
 * @param {string} nome
 * @param {string} item
 * @param {number} alvo
 */
export function novaMeta(player, nome, item, alvo) {
  const id = item.includes(":") ? item : `minecraft:${item}`;
  if (!ItemTypes.get(id) && !BlockTypes.get(id)) {
    erro(player, textos.META_ITEM_INVALIDO);
    return;
  }
  const d = lerDados();
  d.metaSeq += 1;
  d.meta = { id: d.metaSeq, nome: limpar(nome, 40) || "Meta da comunidade", item: id, alvo: Math.max(1, Math.floor(alvo)), atual: 0, feita: false };
  gravar();
  atualizarTextos();
  ok(player, textos.META_NOVA);
}

/** @param {Player} player */
export function encerrarMeta(player) {
  const d = lerDados();
  d.meta = undefined;
  gravar();
  atualizarTextos();
  ok(player, textos.META_ENCERRADA);
}

/** Sugestões recebidas, as mais novas primeiro. */
export function listarSugestoes() {
  return [...lerDados().sugestoes].reverse();
}

/** @param {Player} player */
export function apagarSugestoes(player) {
  lerDados().sugestoes = [];
  gravar();
  ok(player, textos.SEM_SUGESTOES);
}

/** @param {Player} player */
export function removerTudoComunidade(player) {
  const d = lerDados();
  d.bau = undefined;
  d.mural = undefined;
  d.fogueira = undefined;
  d.placar = undefined;
  d.meta = undefined;
  gravar();
  atualizarTextos();
  ok(player, textos.TUDO_REMOVIDO);
}

/** O item na mão da pessoa, para sugerir no formulário da meta. @param {Player} player */
export function itemNaMao(player) {
  try {
    return player.getComponent("minecraft:inventory")?.container?.getItem(player.selectedSlotIndex)?.typeId ?? "minecraft:oak_log";
  } catch {
    return "minecraft:oak_log";
  }
}

