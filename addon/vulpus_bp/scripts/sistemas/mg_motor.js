// @ts-check
// Motor dos minigames: fila no hub com votação do jogo, espera longa e contagem, sorteio do mapa, partida (regras de cada jogo
// em mg_jogo_*.js), morte e renascimento, eliminação, vitória, prêmios com teto, resumo, estatísticas por jogo e a reconstrução
// dos mapas. A plataforma (dimensão, guarda-volumes, recuperação) está em mg.js; o mundo fixo (hub, cofres) em mg_arena.js.
import { BlockTypes, EntityDamageCause, EquipmentSlot, GameMode, ItemLockMode, Player, system, world } from "@minecraft/server";
import { config, dadosJogador, lerMundo, salvarMundo } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { manterTexto } from "../core/flutuante.js";
import { porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { emCombate } from "../core/teleporte.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/mg.js";
import * as tj from "../textos/mg_jogos.js";
import { aoAbate } from "./abate.js";
import { adicionarCaudas } from "./caudas.js";
import { ARENA, CAPACIDADE, HUB, MAX_JOGADORES, construirCofres, construirHub, dentroDosCofres, limparArena } from "./mg_arena.js";
import { idsComGuarda, vagasEmUso } from "./mg_cofre.js";
import { emMinigame, marcarFora } from "./mg_estado.js";
import { BEDWARS } from "./mg_jogo_bedwars.js";
import { BRIDGE } from "./mg_jogo_bridge.js";
import { PILARES } from "./mg_jogo_pilares.js";
import { SKYWARS } from "./mg_jogo_skywars.js";
import { MARCA_HUB, chaveDoFrasco, chaveDoHub, FRASCOS, itemDoHub } from "./mg_itens.js";
import { DIM_ID, admitir, dimensaoMg, esperarCarga, ganchos, infoRegistro, liberar, pontoHub, prepararAreas, soltarAreas } from "./mg.js";
import { PincelMundo } from "./obras_pincel.js";

/**
 * @typedef {{ x: number, y: number, z: number }} Ponto
 * @typedef {{ id: string, nome: string, vivo: boolean, kills: number, spawn: number, pos: number, saiu: boolean, equipe: number, renasce: boolean, d: Record<string, any> }} Jogador
 * @typedef {{ ids: string[], nome: string }} Vencedor
 * @typedef {object} Partida
 * @property {"ocioso" | "espera" | "contagem" | "jogando" | "fim" | "reset"} estado
 * @property {Map<string, Jogador>} jog
 * @property {Map<string, string>} votos  id da pessoa → id do jogo
 * @property {Map<string, Map<string, string>>} votosOpc  "jogo:categoria" → (pessoa → opção votada)
 * @property {Record<string, string>} config  opções que venceram para a partida (categoria → opção)
 * @property {Map<string, string>} kits  pessoa → kit escolhido (vale para o jogo que o tem)
 * @property {JogoDef | null} jogo
 * @property {{ id: string, nome: string } | null} mapa
 * @property {any} dados  o que o gerador do mapa devolveu
 * @property {any} extra  estado próprio do jogo
 * @property {boolean} mapaPronto
 * @property {number} seg
 * @property {number} inicio
 * @property {number} relogio
 * @property {number} loop
 * @property {number} iniciais
 * @property {boolean} ocupado
 * @property {Map<string, { id: string, t: number }>} ultimoAtq
 * @property {Map<string, number>} saidas
 * @property {string} fase
 * @property {Map<string, string>} ultimoMapa
 */
/**
 * @typedef {{ id: string, nome: string, desc: string }} Opcao
 * @typedef {{ id: string, titulo: string, desc: string, padrao: string, opcoes: readonly Opcao[] }} Categoria
 * @typedef {{ id: string, nome: string, desc: string }} Kit
 */
/**
 * @typedef {object} JogoDef
 * @property {string} id
 * @property {string} nome
 * @property {string} descricao
 * @property {boolean} equipes
 * @property {readonly { id: string, nome: string }[]} mapas
 * @property {(p: PincelMundo, mapaId: string, rng: () => number) => Generator<any, any, any>} construir
 * @property {readonly Categoria[]} [opcoes]  categorias votáveis (tipo de baú, ritmo dos geradores...)
 * @property {readonly Kit[]} [kits]  kits escolhíveis no hub
 * @property {(dados: any) => number} vagas
 * @property {(P: Partida, api: Api) => void} atribuir
 * @property {(P: Partida, j: Jogador) => Ponto} posInicial
 * @property {(P: Partida, dim: import("@minecraft/server").Dimension, fechar: boolean) => void} [gaiolas]
 * @property {(P: Partida, api: Api) => void} aoIniciar
 * @property {(P: Partida, seg: number, ciclo: number, api: Api) => void} aoPasso
 * @property {(P: Partida, j: Jogador, seg: number, api: Api) => string} barra  texto curto do jogo (serve de base do scoreboard quando não há `hud`)
 * @property {(P: Partida, j: Jogador, seg: number, api: Api) => string[]} [hud]  linhas do scoreboard lateral (até 28 caracteres visíveis cada)
 * @property {(P: Partida, j: Jogador, quemId: string | undefined, motivo: string, api: Api) => "eliminar" | "renascer"} mortal
 * @property {(P: Partida, j: Jogador, api: Api) => void} [aoRenascer]
 * @property {(P: Partida, j: Jogador) => Ponto} [posRenascer]
 * @property {(P: Partida, j: Jogador) => number} [segundosRenascer]
 * @property {(P: Partida, j: Jogador, api: Api) => void} [aoEliminado]
 * @property {(P: Partida, api: Api) => Vencedor | null | undefined} vencedor
 * @property {(P: Partida, api: Api) => Vencedor | null} [desempate]
 * @property {(P: Partida, a: Jogador, b: Jogador) => boolean} [amigos]
 * @property {(P: Partida, j: Jogador, bloco: { x: number, y: number, z: number, typeId: string }, api: Api) => boolean} podeQuebrar
 * @property {(P: Partida, j: Jogador, loc: Ponto, item: any) => boolean} podeColocar
 * @property {(P: Partida, j: Jogador, bloco: any, api: Api) => void} [aoColocou]
 * @property {(P: Partida, j: Jogador, bloco: any, api: Api) => void} [aoQuebrou]
 * @property {(P: Partida, blocos: any[]) => any[]} [explosao]
 * @property {(P: Partida, j: Jogador, item: any, player: Player, api: Api) => boolean} [aoUsarItem]
 * @property {(P: Partida, j: Jogador, bloco: any, player: Player, api: Api) => boolean} [aoInteragirBloco]
 * @property {(j: Jogador) => number} premioExtra
 * @property {(P: Partida) => string[]} resumo
 */
/**
 * @typedef {object} Api
 * @property {() => import("@minecraft/server").Dimension | undefined} dim
 * @property {(id: string) => Player | undefined} porId
 * @property {() => Jogador[]} vivos
 * @property {(p: Player, t: string) => void} msg
 * @property {(p: Player, t: string) => void} erro
 * @property {(p: Player, id: string, o?: any) => void} som
 * @property {(p: Player, t: string, sub: string) => void} titulo
 * @property {(id: string, motivo: string, quemId?: string) => void} matar
 */

const CH_HUB = "vulpus:mg:hub";
const PREFIXO_STATS = "vulpus:mg:s:";
/** Segundos antes do fim da contagem em que o jogo e o mapa são escolhidos (e o mapa começa a ser construído). */
const SEG_TRAVA = 12;
/** Segundos antes do fim em que todos vão para os pontos de partida. */
const SEG_ILHAS = 5;
const ORCAMENTO_MS = 12;
const MIN_DURACAO_PREMIO_S = 60;
const KILLS_PREMIADOS_MAX = 5;
const TICKS_ATAQUE = 200;
const SEGUNDOS_TOP_RESUMO = 3;

/** Os jogos disponíveis. */
/** @type {Map<string, JogoDef>} */
export const JOGOS = new Map([[SKYWARS.id, SKYWARS], [BEDWARS.id, BEDWARS], [PILARES.id, PILARES], [BRIDGE.id, BRIDGE]]);

/** @type {Partida} */
const P = {
  estado: "ocioso", jog: new Map(), votos: new Map(), votosOpc: new Map(), config: {}, kits: new Map(), jogo: null, mapa: null, dados: null, extra: null, mapaPronto: false,
  seg: 0, inicio: 0, relogio: -1, loop: -1, iniciais: 0, ocupado: false, ultimoAtq: new Map(), saidas: new Map(), fase: "", ultimoMapa: new Map(),
};

export const hubPronto = () => lerMundo(CH_HUB, false) === true;

/** Estado inicial depois de carregar o mundo. */
function iniciarEstado() {
  P.estado = config().mgLigado && hubPronto() ? "espera" : "ocioso";
}

const vivos = () => [...P.jog.values()].filter((j) => j.vivo);

// ----------------------------------------------------------------------------------- estatísticas
/** @param {string} id */
function stats(id) {
  const s = /** @type {any} */ (lerMundo(PREFIXO_STATS + id, {}));
  const n = (/** @type {unknown} */ v) => (Number.isFinite(v) ? Math.max(0, Math.floor(/** @type {number} */ (v))) : 0);
  /** @type {Record<string, { j: number, v: number, k: number }>} */
  const g = {};
  for (const [jid, x] of Object.entries(s.g ?? {})) g[jid] = { j: n(/** @type {any} */ (x)?.j), v: n(/** @type {any} */ (x)?.v), k: n(/** @type {any} */ (x)?.k) };
  return { j: n(s.j), v: n(s.v), k: n(s.k), dia: typeof s.dia === "string" ? s.dia : "", cx: n(s.cx), ult: n(s.ult), g };
}

/** @param {string} id @param {ReturnType<typeof stats>} s */
const gravarStats = (id, s) => salvarMundo(PREFIXO_STATS + id, s);

/** Marcas da pessoa (somando os jogos, ou de um só). @param {string} id @param {string} [jogoId] */
export const marcasDe = (id, jogoId) => {
  const s = stats(id);
  const g = jogoId ? s.g[jogoId] ?? { j: 0, v: 0, k: 0 } : s;
  return { vitorias: g.v, partidas: g.j, abates: g.k };
};

/** Maiores vencedores de um jogo (ou de todos), inclusive de quem está offline. @param {string | undefined} jogoId @param {number} n */
export function rankingJogo(jogoId, n) {
  /** @type {{ nome: string, v: number, k: number }[]} */
  const l = [];
  for (const chave of world.getDynamicPropertyIds()) {
    if (!chave.startsWith(PREFIXO_STATS)) continue;
    const id = chave.slice(PREFIXO_STATS.length);
    const s = stats(id);
    const g = jogoId ? s.g[jogoId] ?? { j: 0, v: 0, k: 0 } : s;
    if (g.v <= 0) continue;
    l.push({ nome: dadosJogador(id).nome || "?", v: g.v, k: g.k });
  }
  return l.sort((a, b) => b.v - a.v || b.k - a.k || a.nome.localeCompare(b.nome)).slice(0, Math.max(0, n));
}
export const rankingSkywars = (/** @type {number} */ n) => rankingJogo("skywars", n);

// ----------------------------------------------------------------------------------- estado para os menus
export function estadoPartida() {
  const cfg = config();
  return {
    estado: P.estado,
    n: P.jog.size,
    min: cfg.mgMinJogadores,
    max: Math.min(cfg.mgMaxJogadores, MAX_JOGADORES),
    seg: P.estado === "contagem" ? P.seg : 0,
    jogo: P.jogo?.nome ?? "",
    mapa: P.mapa?.nome ?? "",
  };
}

export const participa = (/** @type {string} */ id) => P.jog.has(id);

export function diagnostico() {
  const r = infoRegistro();
  return {
    registrada: r.registrada,
    erro: r.erro,
    pronta: !!dimensaoMg(),
    hub: hubPronto(),
    arena: hubPronto(),
    cofres: vagasEmUso(),
    capacidade: CAPACIDADE,
    estado: P.estado,
    jogadores: P.jog.size,
    jogos: JOGOS.size,
    mapas: [...JOGOS.values()].reduce((s, j) => s + j.mapas.length, 0),
  };
}

// ----------------------------------------------------------------------------------- votação
/** Votos de cada jogo. */
export function votosPorJogo() {
  /** @type {Map<string, number>} */
  const m = new Map();
  for (const id of JOGOS.keys()) m.set(id, 0);
  for (const v of P.votos.values()) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/** @returns {string} linha curta com os votos (para a barra e o placar do hub) */
function linhaVotos() {
  const v = votosPorJogo();
  return [...JOGOS.values()].map((j) => tj.VOTOS_LINHA(j.nome, v.get(j.id) ?? 0)).join("  §8| ");
}

/** @param {Player} player @param {string} jogoId */
export function votar(player, jogoId) {
  const j = JOGOS.get(jogoId);
  if (!P.jog.has(player.id)) return msg(player, tj.SEM_PARTIDA_PARA_VOTAR);
  if (!j) return;
  if (P.jogo) return erro(player, tj.VOTACAO_FECHADA);
  P.votos.set(player.id, jogoId);
  ok(player, tj.VOTOU(j.nome));
  som(player, "random.orb", { volume: 0.6, pitch: 1.4 });
}

/** Votos de cada opção de uma categoria. @param {string} jogoId @param {string} cat */
function votosDaCategoria(jogoId, cat) {
  /** @type {Map<string, number>} */
  const m = new Map();
  for (const v of P.votosOpc.get(`${jogoId}:${cat}`)?.values() ?? []) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/** @param {Player} player @param {string} jogoId @param {string} cat @param {string} opcao */
export function votarOpcao(player, jogoId, cat, opcao) {
  const j = JOGOS.get(jogoId);
  const c = j?.opcoes?.find((x) => x.id === cat);
  const o = c?.opcoes.find((x) => x.id === opcao);
  if (!P.jog.has(player.id)) return msg(player, tj.SEM_PARTIDA_PARA_VOTAR);
  if (!j || !c || !o) return;
  if (P.jogo) return erro(player, tj.VOTACAO_FECHADA);
  const chave = `${jogoId}:${cat}`;
  let m = P.votosOpc.get(chave);
  if (!m) P.votosOpc.set(chave, (m = new Map()));
  m.set(player.id, opcao);
  ok(player, tj.VOTOU_OPCAO(c.titulo, o.nome));
  som(player, "random.orb", { volume: 0.6, pitch: 1.4 });
}

/** @param {Player} player @param {string} jogoId @param {string} kitId */
export function escolherKit(player, jogoId, kitId) {
  const k = JOGOS.get(jogoId)?.kits?.find((x) => x.id === kitId);
  if (!P.jog.has(player.id)) return msg(player, tj.SEM_PARTIDA_PARA_VOTAR);
  if (!k) return;
  if (P.estado === "jogando" || P.estado === "fim") return erro(player, tj.KIT_FECHADO);
  P.kits.set(player.id, k.id);
  ok(player, tj.KIT_ESCOLHIDO(k.nome));
  som(player, "random.orb", { volume: 0.6, pitch: 1.2 });
}

/** O kit da pessoa para o jogo (o escolhido, se for dele, ou o primeiro da lista). @param {string} id @param {JogoDef} jogo @returns {string} */
export function kitDe(id, jogo) {
  const e = P.kits.get(id);
  return jogo.kits?.some((k) => k.id === e) ? /** @type {string} */ (e) : (jogo.kits?.[0]?.id ?? "");
}

/** @param {Player} player @param {JogoDef} jogo */
async function menuOpcoes(player, jogo) {
  const aqui = () => menuOpcoes(player, jogo);
  const tela = new Lista(tj.TITULO_OPCOES(jogo.nome)).texto(tj.CORPO_OPCOES);
  for (const c of jogo.opcoes ?? []) {
    const v = votosDaCategoria(jogo.id, c.id);
    const meu = P.votosOpc.get(`${jogo.id}:${c.id}`)?.get(player.id);
    tela.botao(`${c.titulo}\n§7${c.opcoes.find((o) => o.id === (meu ?? c.padrao))?.nome ?? ""}${meu ? " §a(seu voto)" : ""}`, undefined, async (p) => {
      const sub = new Lista(c.titulo).texto(`§7${c.desc}\n\n${c.opcoes.map((o) => `${meu === o.id ? "§a✔ " : "§f"}§l${o.nome}§r §8(${v.get(o.id) ?? 0})\n§7${o.desc}`).join("\n\n")}`);
      for (const o of c.opcoes) {
        sub.botao(`${meu === o.id ? "§a✔ " : ""}${o.nome} §8(${v.get(o.id) ?? 0})`, undefined, async (q) => {
          votarOpcao(q, jogo.id, c.id, o.id);
          await aqui();
        });
      }
      await sub.voltar(aqui).abrir(p);
    });
  }
  await tela.voltar(() => menuVotacao(player)).abrir(player);
}

/** @param {Player} player @param {JogoDef} jogo */
async function menuKits(player, jogo) {
  const aqui = () => menuKits(player, jogo);
  const atual = kitDe(player.id, jogo);
  const tela = new Lista(tj.TITULO_KITS(jogo.nome)).texto(tj.CORPO_KITS(jogo.kits?.find((k) => k.id === atual)?.nome ?? "-"));
  for (const k of jogo.kits ?? []) {
    tela.botao(`${k.id === atual ? "§a✔ " : ""}${k.nome}\n§7${k.desc}`, undefined, async (p) => {
      escolherKit(p, jogo.id, k.id);
      await aqui();
    });
  }
  await tela.voltar(() => menuVotacao(player)).abrir(player);
}

/** @param {Player} player */
export async function menuVotacao(player) {
  const aqui = () => menuVotacao(player);
  if (!P.jog.has(player.id)) return msg(player, tj.SEM_PARTIDA_PARA_VOTAR);
  const v = votosPorJogo();
  const meu = P.votos.get(player.id);
  const corpo = tj.CORPO_VOTACAO([...JOGOS.values()].map((j) => tj.LINHA_JOGO(j.nome, j.descricao, v.get(j.id) ?? 0, meu === j.id)).join("\n\n"));
  const tela = new Lista(tj.TITULO_VOTACAO).texto(corpo);
  for (const j of JOGOS.values()) {
    tela.botao(tj.BOTAO_VOTO(j.nome, v.get(j.id) ?? 0, meu === j.id), undefined, async (p) => {
      votar(p, j.id);
      await aqui();
    });
  }
  for (const j of JOGOS.values()) {
    if (j.opcoes?.length) tela.botao(tj.BOTAO_OPCOES(j.nome), undefined, (p) => menuOpcoes(p, j));
    if (j.kits?.length) tela.botao(tj.BOTAO_KITS(j.nome, j.kits.find((k) => k.id === kitDe(player.id, j))?.nome ?? "-"), undefined, (p) => menuKits(p, j));
  }
  await tela.abrir(player);
}

/** Opção vencedora de cada categoria do jogo (empate é sorteado; sem votos, o padrão). @param {JogoDef} jogo @returns {Record<string, string>} */
function escolherOpcoes(jogo) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const c of jogo.opcoes ?? []) {
    const v = votosDaCategoria(jogo.id, c.id);
    const max = Math.max(0, ...v.values());
    const topo = max > 0 ? c.opcoes.filter((o) => (v.get(o.id) ?? 0) === max) : [];
    out[c.id] = topo.length ? topo[Math.floor(Math.random() * topo.length)].id : c.padrao;
  }
  return out;
}

/** Escolhe o jogo mais votado (empate e ninguém votar: sorteio). */
function escolherJogo() {
  const v = votosPorJogo();
  const max = Math.max(...v.values());
  const topo = [...JOGOS.keys()].filter((id) => (v.get(id) ?? 0) === max);
  return /** @type {JogoDef} */ (JOGOS.get(topo[Math.floor(Math.random() * topo.length)]));
}

// ----------------------------------------------------------------------------------- gerador em ticks
/**
 * Roda um gerador aos poucos (um orçamento de milissegundos por tick) numa dimensão.
 * @param {import("@minecraft/server").Dimension} dim
 * @param {(p: PincelMundo) => Generator<any, any, any>} fabricar
 * @param {(ok: boolean, valor: any, falhas: number) => void} aoTerminar
 */
function rodar(dim, fabricar, aoTerminar) {
  const pincel = new PincelMundo(dim);
  const gen = fabricar(pincel);
  const run = system.runInterval(() => {
    try {
      const ini = Date.now();
      while (Date.now() - ini < ORCAMENTO_MS) {
        const r = gen.next();
        if (r.done) {
          system.clearRun(run);
          aoTerminar(true, r.value, pincel.falhas);
          return;
        }
      }
    } catch (e) {
      system.clearRun(run);
      registrarErro("Minigames: construção", e);
      aoTerminar(false, String(e), pincel.falhas);
    }
  }, 1);
}

/** Pontos que precisam estar carregados antes de construir. */
const pontosDaObra = () => [pontoHub(), { x: ARENA.x, y: ARENA.y, z: ARENA.z }, { x: ARENA.x + 60, y: ARENA.y, z: ARENA.z + 60 }, { x: ARENA.x - 60, y: ARENA.y, z: ARENA.z - 60 }];
const pontosDaArena = () => pontosDaObra().slice(1);

/** Semente simples (xorshift) para os mapas variarem sem depender de Math.random no gerador. @param {number} semente */
function sorteador(semente) {
  let s = (semente >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Tipos de entidade que a partida deixa para trás e que nunca devem passar para a próxima. */
const SOBRAS = ["minecraft:item", "minecraft:tnt", "minecraft:xp_orb", "minecraft:arrow", "minecraft:falling_block"];

/** Tira da dimensão toda sobra de partida (itens dos baús quebrados, TNT…). A dimensão só tem o hub e a arena, então vale para ela toda. @param {import("@minecraft/server").Dimension} dim */
function limparItensSoltos(dim) {
  try {
    for (const tipo of SOBRAS) for (const e of dim.getEntities({ type: tipo })) e.remove();
  } catch (e) {
    registrarErro("Minigames: itens soltos", e);
  }
}

/** Limpa agora e de novo logo depois (entidades de chunks recém-carregados aparecem aos poucos). @param {import("@minecraft/server").Dimension} dim */
function varrerSobras(dim) {
  limparItensSoltos(dim);
  for (const t of [10, 40, 100]) system.runTimeout(() => limparItensSoltos(dim), t);
}

/**
 * Constrói o hub e os cofres (tudo = true) ou só monta um mapa para a staff visitar (prévia).
 * @param {Player | undefined} quem  recebe os avisos (staff)
 * @param {boolean} tudo
 * @param {{ jogoId: string, mapaId: string }} [previa]
 */
export async function construir(quem, tudo, previa) {
  if (P.ocupado || P.estado === "jogando" || P.estado === "contagem" || P.estado === "fim" || P.estado === "reset" || P.jog.size > 0) {
    if (quem) erro(quem, textos.OCUPADO);
    return;
  }
  const dim = dimensaoMg();
  if (!dim) {
    if (quem) erro(quem, textos.SEM_DIMENSAO);
    return;
  }
  P.ocupado = true;
  const anterior = P.estado;
  P.estado = "reset";
  if (quem) msg(quem, textos.CONSTRUINDO);
  const areas = await prepararAreas(tudo ? ["hub", "arena"] : ["arena"]);
  const falhou = (/** @type {string} */ m) => {
    soltarAreas();
    P.ocupado = false;
    P.estado = anterior;
    if (quem?.isValid) erro(quem, textos.FALHA_CONSTRUCAO(m));
    registrarErro("Minigames: construção", m);
  };
  if (!areas) return falhou(textos.AREA_NAO_CARREGOU);
  esperarCarga(dim, tudo ? pontosDaObra() : pontosDaArena(), 75, (carregou) => {
    if (!carregou) return falhou(textos.AREA_NAO_CARREGOU);
    const rng = sorteador(Date.now() & 0x7fffffff);
    const jogo = previa ? JOGOS.get(previa.jogoId) : undefined;
    rodar(
      dim,
      function* (p) {
        if (tudo) {
          P.fase = "hub";
          yield* construirHub(p);
          P.fase = "cofres";
          yield* construirCofres(p);
        }
        P.fase = "limpando a arena";
        yield* limparArena(p);
        if (jogo && previa) {
          P.fase = `mapa ${jogo.nome}`;
          return yield* jogo.construir(p, previa.mapaId, rng);
        }
        return undefined;
      },
      (certo, valor, falhas) => {
        P.ocupado = false;
        P.fase = "";
        if (!certo) return falhou(String(valor));
        soltarAreas();
        if (falhas > 60) return falhou(`${falhas} blocos não puderam ser colocados`);
        if (tudo) salvarMundo(CH_HUB, true);
        limparItensSoltos(dim);
        P.estado = config().mgLigado && hubPronto() ? "espera" : "ocioso";
        if (quem?.isValid) ok(quem, tudo ? textos.CONSTRUIDO : textos.ARENA_PRONTA);
      },
    );
  });
  if (quem) {
    const acompanha = system.runInterval(() => {
      if (!P.ocupado || !quem.isValid) return system.clearRun(acompanha);
      quem.onScreenDisplay.setActionBar(`§7Construindo: §f${P.fase || "preparando"}...`);
    }, 20);
  }
}

// ----------------------------------------------------------------------------------- API para os jogos
/** @type {Api} */
const api = {
  dim: dimensaoMg,
  porId,
  vivos,
  msg: (p, t) => msg(p, t),
  erro: (p, t) => erro(p, t),
  som: (p, id, o) => som(p, id, o),
  titulo: (p, t, sub) => mostrarTitulo(p, t, { subtitulo: sub, entrada: 2, fica: 40, saida: 10 }),
  matar: (id, motivo, quemId) => matar(id, motivo, quemId),
};

// ----------------------------------------------------------------------------------- itens do hub
/** A hotbar do hub: votar e sair. @param {Player} p */
function darItensHub(p) {
  try {
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    const votar_ = itemDoHub("minecraft:nether_star", tj.ITEM_VOTAR, "votar");
    const sair_ = itemDoHub("minecraft:red_dye", tj.ITEM_SAIR, "sair");
    for (const it of [votar_, sair_]) {
      it.lockMode = ItemLockMode.inventory;
      it.keepOnDeath = true;
    }
    inv.setItem(0, votar_);
    inv.setItem(8, sair_);
  } catch (e) {
    registrarErro("Minigames: itens do hub", e);
  }
}

// ----------------------------------------------------------------------------------- entrar e sair
/** @param {Player} player @returns {string | undefined} motivo de não poder entrar */
function podeEntrar(player) {
  const cfg = config();
  if (!cfg.mgLigado) return textos.DESLIGADO;
  if (!dimensaoMg()) return textos.SEM_DIMENSAO;
  if (emMinigame(player) || P.jog.has(player.id)) return textos.JA_DENTRO;
  if (P.estado === "ocioso") return textos.ARENA_FECHADA;
  if (P.estado === "reset" || P.estado === "fim") return textos.ARENA_PREPARANDO;
  if (P.estado === "jogando" || (P.estado === "contagem" && P.seg <= SEG_ILHAS + 1) || P.jogo) return textos.EM_ANDAMENTO;
  if (P.jog.size >= Math.min(cfg.mgMaxJogadores, MAX_JOGADORES)) return textos.CHEIO;
  if (player.dimension.id !== "minecraft:overworld") return textos.SO_NO_MUNDO;
  if (emCombate(player)) return textos.EM_COMBATE;
  const espera = Math.ceil(((P.saidas.get(player.id) ?? 0) - Date.now()) / 1000);
  if (espera > 0 && !ehStaff(player)) return textos.ESPERA_SAIDA(espera);
  return undefined;
}

/** @param {Player} player */
export function entrar(player) {
  const motivo = podeEntrar(player);
  if (motivo) return erro(player, motivo);
  /** @type {Jogador} */
  const j = { id: player.id, nome: player.name, vivo: true, kills: 0, spawn: -1, pos: 0, saiu: false, equipe: -1, renasce: false, d: {} };
  P.jog.set(player.id, j);
  msg(player, textos.GUARDANDO);
  admitir(player, (certo, razao) => {
    if (!certo) {
      P.jog.delete(player.id);
      if (player.isValid && razao) erro(player, razao);
      return;
    }
    const cfg = config();
    const max = Math.min(cfg.mgMaxJogadores, MAX_JOGADORES);
    darItensHub(player);
    msg(player, textos.ENTROU(P.jog.size, cfg.mgMinJogadores, max));
    msg(player, tj.DICA_VOTAR);
    for (const outro of P.jog.values()) {
      const p = porId(outro.id);
      if (p && p !== player) msg(p, textos.ENTROU_AVISO(player.name, P.jog.size, max));
    }
    conferirContagem();
  });
}

/** Sair por vontade própria (comando, botão ou portal). @param {Player} player */
export function sair(player) {
  const j = P.jog.get(player.id);
  if (!j) {
    return emMinigame(player) ? liberar(player) : msg(player, textos.NAO_ESTA);
  }
  if (P.estado === "jogando" && j.vivo) {
    P.saidas.set(player.id, Date.now() + config().mgEsperaSaidaSeg * 1000);
    eliminar(player.id, "desistiu", undefined, true);
  } else if (P.estado === "jogando" || P.estado === "fim") {
    // espectador ou depois da partida: só volta
  } else {
    P.saidas.set(player.id, Date.now() + Math.floor(config().mgEsperaSaidaSeg / 3) * 1000);
  }
  retirar(player.id);
  liberar(player, () => conferirContagem());
}

/** Tira a pessoa da partida (sem mexer nas coisas dela). @param {string} id */
function retirar(id) {
  const j = P.jog.get(id);
  if (!j) return;
  P.votos.delete(id);
  for (const m of P.votosOpc.values()) m.delete(id);
  P.kits.delete(id);
  if (P.estado === "espera" || P.estado === "contagem") P.jog.delete(id);
  else j.saiu = true;
  const max = Math.min(config().mgMaxJogadores, MAX_JOGADORES);
  if (P.estado === "espera" || P.estado === "contagem") {
    for (const o of P.jog.values()) {
      const p = porId(o.id);
      if (p) msg(p, textos.SAIU_AVISO(j.nome, P.jog.size, max));
    }
  }
}
ganchos.sair = sair;

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  try {
    const j = P.jog.get(playerId);
    P.ultimoAtq.delete(playerId);
    if (!j) return marcarFora(playerId);
    P.saidas.set(playerId, Date.now() + config().mgEsperaSaidaSeg * 1000);
    if (P.estado === "jogando" && j.vivo) eliminar(playerId, "saiu", undefined, true);
    retirar(playerId);
    marcarFora(playerId); // a marca de coisas guardadas continua: elas voltam na próxima entrada
    if (P.estado === "espera" || P.estado === "contagem") conferirContagem();
    else if (P.estado === "jogando") verificarVitoria();
  } catch (e) {
    registrarErro("Minigames: saída", e);
  }
});

// ----------------------------------------------------------------------------------- espera e contagem
function conferirContagem() {
  const cfg = config();
  const max = Math.min(cfg.mgMaxJogadores, MAX_JOGADORES);
  if (P.estado === "espera" && P.jog.size >= cfg.mgMinJogadores && P.jog.size > 0) {
    P.estado = "contagem";
    P.seg = Math.max(cfg.mgContagemSeg, SEG_TRAVA + 3);
    void prepararAreas(["arena"]);
    for (const j of P.jog.values()) {
      const p = porId(j.id);
      if (p) msg(p, textos.CONTAGEM_INICIA(P.seg));
    }
    P.relogio = system.runInterval(passoContagem, 20);
  } else if (P.estado === "contagem" && P.jog.size < cfg.mgMinJogadores) cancelarContagem();
  // partida cheia: não faz sentido esperar tudo
  if (P.estado === "contagem" && P.jog.size >= max && P.seg > Math.max(cfg.mgCheioSeg, SEG_TRAVA + 3)) {
    P.seg = Math.max(cfg.mgCheioSeg, SEG_TRAVA + 3);
    for (const j of P.jog.values()) {
      const p = porId(j.id);
      if (p) msg(p, tj.CHEIO_ENCURTA(P.seg));
    }
  }
}

function pararRelogio() {
  if (P.relogio >= 0) system.clearRun(P.relogio);
  P.relogio = -1;
}

/** Zera a escolha de jogo e de mapa. */
function limparEscolha() {
  P.jogo = null;
  P.mapa = null;
  P.dados = null;
  P.extra = null;
  P.mapaPronto = false;
}

function cancelarContagem() {
  pararRelogio();
  const dim = dimensaoMg();
  const nasIlhas = P.seg <= SEG_ILHAS;
  P.estado = "espera";
  if (nasIlhas && dim && P.jogo?.gaiolas) P.jogo.gaiolas(P, dim, false);
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (!p) continue;
    msg(p, textos.CONTAGEM_CANCELADA);
    if (nasIlhas && dim) {
      try {
        p.teleport(pontoHub(), { dimension: dim, rotation: { x: 0, y: 0 } });
      } catch (e) {
        registrarErro("Minigames: voltar ao hub", e);
      }
    }
    j.spawn = -1;
    j.equipe = -1;
  }
  limparEscolha();
  system.runTimeout(() => {
    if (P.estado === "espera") soltarAreas(["arena"]);
  }, 40);
}

/** Fecha a votação, sorteia o mapa e começa a construí-lo. */
function travarEscolha() {
  const jogo = escolherJogo();
  const antes = P.ultimoMapa.get(jogo.id);
  const opcoes = jogo.mapas.filter((m) => m.id !== antes);
  const mapa = (opcoes.length ? opcoes : jogo.mapas)[Math.floor(Math.random() * (opcoes.length || jogo.mapas.length))];
  P.jogo = jogo;
  P.mapa = mapa;
  P.ultimoMapa.set(jogo.id, mapa.id);
  P.config = escolherOpcoes(jogo);
  const votos = votosPorJogo().get(jogo.id) ?? 0;
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (p) {
      msg(p, tj.JOGO_ESCOLHIDO(jogo.nome, mapa.nome, votos));
      const resumoOpc = (jogo.opcoes ?? []).map((c) => `§f${c.titulo}: §e${c.opcoes.find((o) => o.id === P.config[c.id])?.nome ?? "-"}`).join("§7 · ");
      if (resumoOpc) msg(p, tj.OPCOES_ESCOLHIDAS(resumoOpc));
      mostrarTitulo(p, tj.TITULO_ESCOLHIDO(jogo.nome), { subtitulo: tj.SUB_ESCOLHIDO(mapa.nome), entrada: 5, fica: 50, saida: 10 });
      som(p, "random.levelup", { volume: 0.6, pitch: 1.1 });
    }
  }
  const dim = dimensaoMg();
  if (!dim) return cancelarContagem();
  esperarCarga(dim, pontosDaArena(), 60, (carregou) => {
    if (!carregou || P.estado !== "contagem") return erroDeMapa(textos.AREA_NAO_CARREGOU);
    varrerSobras(dim);
    const rng = sorteador(Date.now() & 0x7fffffff);
    rodar(
      dim,
      function* (p) {
        yield* limparArena(p);
        return yield* jogo.construir(p, mapa.id, rng);
      },
      (certo, valor, falhas) => {
        if (P.estado !== "contagem" || P.jogo !== jogo) return;
        if (!certo || falhas > 60) return erroDeMapa(certo ? `${falhas} blocos falharam` : String(valor));
        varrerSobras(dim);
        P.dados = valor;
        P.mapaPronto = true;
      },
    );
  });
}

/** O mapa não saiu: cancela a contagem e avisa. @param {string} motivo */
function erroDeMapa(motivo) {
  registrarErro("Minigames: mapa", motivo);
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (p) erro(p, textos.FALHA_CONSTRUCAO(motivo));
  }
  cancelarContagem();
}

function passoContagem() {
  try {
    if (P.estado !== "contagem") return pararRelogio();
    if (P.jog.size < config().mgMinJogadores) return cancelarContagem();
    // o mapa precisa estar pronto antes de ir para os pontos de partida
    if (P.seg <= SEG_ILHAS && !P.mapaPronto) {
      P.seg = SEG_ILHAS;
      return;
    }
    P.seg -= 1;
    if (P.seg === SEG_TRAVA && !P.jogo) travarEscolha();
    if (P.seg === SEG_ILHAS) levarAosPontos();
    if (P.estado !== "contagem") return;
    if (P.seg > 0 && (P.seg <= 5 || P.seg === 10)) {
      for (const j of P.jog.values()) {
        const p = porId(j.id);
        if (!p) continue;
        mostrarTitulo(p, textos.TITULO_CONTAGEM(P.seg), { entrada: 0, fica: 16, saida: 4 });
        som(p, "note.pling", { volume: 0.8, pitch: 0.8 + (5 - Math.min(5, P.seg)) * 0.12 });
      }
    }
    if (P.seg <= 0) iniciar();
  } catch (e) {
    registrarErro("Minigames: contagem", e);
  }
}

/** Todos vão para os pontos de partida do mapa. */
function levarAosPontos() {
  const dim = dimensaoMg();
  const jogo = P.jogo;
  if (!dim || !jogo || !P.dados) return cancelarContagem();
  if (jogo.vagas(P.dados) < P.jog.size) return erroDeMapa("o mapa não tem lugar para todos");
  jogo.atribuir(P, api);
  jogo.gaiolas?.(P, dim, true);
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (!p) continue;
    msg(p, textos.AVISO_ILHAS);
    try {
      const s = jogo.posInicial(P, j);
      p.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: dim, rotation: { x: 0, y: 0 } });
    } catch (e) {
      registrarErro("Minigames: ir ao ponto", e);
    }
  }
}

// ----------------------------------------------------------------------------------- a partida
/** @param {Player} p */
function limparPessoa(p) {
  const inv = p.getComponent("minecraft:inventory")?.container;
  inv?.clearAll();
  const eq = p.getComponent("minecraft:equippable");
  for (const s of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) eq?.setEquipment(s, undefined);
}

function iniciar() {
  pararRelogio();
  const dim = dimensaoMg();
  const jogo = P.jogo;
  if (!dim || !jogo) return cancelarContagem();
  limparItensSoltos(dim);
  jogo.gaiolas?.(P, dim, false);
  P.estado = "jogando";
  P.inicio = system.currentTick;
  P.iniciais = P.jog.size;
  ciclo = 0;
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (!p) {
      j.vivo = false;
      j.saiu = true;
      continue;
    }
    try {
      limparPessoa(p);
      p.setGameMode(GameMode.Survival);
      p.getComponent("minecraft:health")?.resetToMaxValue();
    } catch (e) {
      registrarErro("Minigames: preparar jogador", e);
    }
    mostrarTitulo(p, textos.TITULO_VAI, { subtitulo: `§7${jogo.nome} · ${P.mapa?.nome ?? ""}`, entrada: 2, fica: 30, saida: 10 });
    som(p, "random.levelup", { volume: 0.8 });
  }
  jogo.aoIniciar(P, api);
  P.loop = system.runInterval(passoJogo, 10);
  verificarVitoria();
}

/** @param {number} s */
const tempoTexto = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
let ciclo = 0;

function passoJogo() {
  try {
    if (P.estado !== "jogando" || !P.jogo) {
      if (P.loop >= 0) system.clearRun(P.loop);
      P.loop = -1;
      return;
    }
    ciclo++;
    const cfg = config();
    const seg = (system.currentTick - P.inicio) / 20;
    P.jogo.aoPasso(P, seg, ciclo, api);
    if (P.estado !== "jogando") return;
    verificarVitoria(); // jogos como o Bridge decidem o vencedor por pontos, sem ninguém morrer
    for (const j of vivos()) {
      const p = porId(j.id);
      if (!p) {
        eliminar(j.id, "saiu", undefined, true);
        continue;
      }
      if (j.renasce) continue;
      if (p.location.y < (P.dados?.vazio ?? ARENA.vazio)) {
        const rec = P.ultimoAtq.get(j.id);
        matar(j.id, "vazio", rec && system.currentTick - rec.t <= TICKS_ATAQUE ? rec.id : undefined);
        continue;
      }
    }
    if (P.estado === "jogando" && seg >= cfg.mgLimiteSeg) encerrar(P.jogo.desempate?.(P, api) ?? desempatePadrao());
  } catch (e) {
    registrarErro("Minigames: partida", e);
  }
}

/** No limite de tempo: vence quem tem mais abates entre os vivos (empate = sem vencedor). @returns {Vencedor | null} */
function desempatePadrao() {
  const v = vivos().sort((a, b) => b.kills - a.kills);
  return v.length && (v.length === 1 || v[0].kills > v[1].kills) ? { ids: [v[0].id], nome: v[0].nome } : null;
}

/**
 * Alguém morreu (golpe fatal ou vazio): o jogo decide se renasce ou é eliminado.
 * @param {string} id
 * @param {string} motivo
 * @param {string} [quemId]
 */
function matar(id, motivo, quemId) {
  const j = P.jog.get(id);
  if (!j || !j.vivo || j.renasce || P.estado !== "jogando" || !P.jogo) return;
  // o golpe fatal é cancelado (não há morte de verdade), então o efeito de abate é chamado aqui
  try {
    const q = quemId ? porId(quemId) : undefined, v = porId(id);
    if (q && v && q.id !== v.id) aoAbate(q, v);
  } catch (e) {
    registrarErro("Minigames: efeito de abate", e);
  }
  const decisao = P.jogo.mortal(P, j, quemId, motivo, api);
  if (decisao === "renascer") renascer(id, motivo, quemId);
  else eliminar(id, motivo, quemId);
}

/**
 * Espera e volta para a base (jogos com respawn).
 * @param {string} id
 * @param {string} motivo
 * @param {string} [quemId]
 */
function renascer(id, motivo, quemId) {
  const jogo = P.jogo;
  const j = P.jog.get(id);
  const p = porId(id);
  const dim = dimensaoMg();
  if (!j || !jogo || !p || !dim) return;
  j.renasce = true;
  const assassino = quemId ? P.jog.get(quemId) : undefined;
  if (assassino && assassino.vivo && assassino.id !== id) {
    assassino.kills += 1;
    const q = porId(assassino.id);
    if (q) som(q, "random.orb", { volume: 0.8, pitch: 1.5 });
  }
  void motivo;
  const espera = jogo.segundosRenascer?.(P, j) ?? 5;
  const alto = jogo.posRenascer?.(P, j) ?? pontoHub();
  try {
    p.setGameMode(GameMode.Spectator);
    p.teleport({ x: alto.x, y: alto.y + 14, z: alto.z }, { dimension: dim });
  } catch (e) {
    registrarErro("Minigames: esperar renascer", e);
  }
  let resta = espera;
  const run = system.runInterval(() => {
    try {
      const q = porId(id);
      if (!q || P.estado !== "jogando" || !j.vivo) return system.clearRun(run);
      if (resta > 0) {
        mostrarTitulo(q, tj.BW_TITULO_MORREU, { subtitulo: tj.BW_RENASCE(resta), entrada: 0, fica: 22, saida: 0 });
        resta--;
        return;
      }
      system.clearRun(run);
      j.renasce = false;
      const ponto = jogo.posRenascer?.(P, j) ?? pontoHub();
      q.teleport({ x: ponto.x, y: ponto.y, z: ponto.z }, { dimension: dim, rotation: { x: 0, y: 0 } });
      q.setGameMode(GameMode.Survival);
      q.getComponent("minecraft:health")?.resetToMaxValue();
      q.addEffect("resistance", 60, { amplifier: 4, showParticles: false });
      jogo.aoRenascer?.(P, j, api);
      som(q, "mob.endermen.portal", { volume: 0.5 });
    } catch (e) {
      system.clearRun(run);
      registrarErro("Minigames: renascer", e);
    }
  }, 20);
  system.run(verificarVitoria);
}

/**
 * Elimina alguém da partida de vez.
 * @param {string} id
 * @param {string} motivo  "vazio", "desistiu", "saiu", "borda", "morto" ou "morto_por"
 * @param {string} [matouId]
 * @param {boolean} [semEspectar]  não vira espectador (saiu ou desistiu: vai embora)
 */
export function eliminar(id, motivo, matouId, semEspectar = false) {
  const j = P.jog.get(id);
  if (!j || !j.vivo || P.estado !== "jogando") return;
  j.pos = vivos().length;
  j.vivo = false;
  j.renasce = false;
  const dim = dimensaoMg();
  const p = porId(id);
  const assassino = matouId ? P.jog.get(matouId) : undefined;
  if (assassino && assassino.vivo && assassino.id !== id) assassino.kills += 1;
  let como = textos.COMO_MORTO;
  if (motivo === "vazio") como = textos.COMO_VAZIO;
  else if (motivo === "desistiu") como = textos.COMO_DESISTIU;
  else if (motivo === "saiu") como = textos.COMO_SAIU;
  else if (motivo === "borda") como = textos.COMO_BORDA;
  else if (motivo === "lava") como = textos.COMO_LAVA;
  if (assassino && assassino.id !== id) como = textos.COMO_MATOU(assassino.nome);
  for (const o of P.jog.values()) {
    const q = porId(o.id);
    if (q) msg(q, textos.ELIMINADO(j.nome, como));
  }
  if (p?.isValid && dim) {
    soltarItens(p, dim);
    if (!semEspectar) {
      try {
        p.setGameMode(GameMode.Spectator);
        p.teleport({ x: ARENA.x + 0.5, y: ARENA.y + 22, z: ARENA.z + 0.5 }, { dimension: dim });
      } catch (e) {
        registrarErro("Minigames: espectador", e);
      }
      mostrarTitulo(p, textos.TITULO_ELIMINADO, { subtitulo: textos.SUB_ELIMINADO(j.pos), entrada: 2, fica: 50, saida: 10 });
      som(p, "mob.wither.hurt", { volume: 0.6 });
    }
  }
  try {
    P.jogo?.aoEliminado?.(P, j, api);
  } catch (e) {
    registrarErro("Minigames: aoEliminado", e);
  }
  system.run(verificarVitoria);
}

/** O que a pessoa tinha na arena cai no chão onde ela estava. @param {Player} p @param {import("@minecraft/server").Dimension} dim */
function soltarItens(p, dim) {
  try {
    const l = p.location;
    const inv = p.getComponent("minecraft:inventory")?.container;
    if (inv) {
      for (let s = 0; s < inv.size; s++) {
        const it = inv.getItem(s);
        if (it && !chaveDoHub(it)) dim.spawnItem(it, l);
      }
      inv.clearAll();
    }
    const eq = p.getComponent("minecraft:equippable");
    for (const slot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) {
      const it = eq?.getEquipment(slot);
      if (it) dim.spawnItem(it, l);
      eq?.setEquipment(slot, undefined);
    }
  } catch (e) {
    registrarErro("Minigames: soltar itens", e);
  }
}

function verificarVitoria() {
  if (P.estado !== "jogando" || !P.jogo) return;
  const v = P.jogo.vencedor(P, api);
  if (v !== undefined) encerrar(v);
}

/**
 * Fim da partida: anuncia, premia (com teto), grava as marcas, mostra o resumo e, depois de alguns segundos, devolve todo mundo.
 * @param {Vencedor | null} vencedor
 */
function encerrar(vencedor) {
  if (P.estado !== "jogando") return;
  P.estado = "fim";
  if (P.loop >= 0) system.clearRun(P.loop);
  P.loop = -1;
  const jogo = /** @type {JogoDef} */ (P.jogo);
  const duracao = (system.currentTick - P.inicio) / 20;
  const dim = dimensaoMg();
  const ganhou = new Set(vencedor?.ids ?? []);
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (!p) continue;
    if (vencedor) {
      msg(p, textos.ANUNCIO_VENCEDOR(vencedor.nome));
      if (ganhou.has(j.id)) {
        mostrarTitulo(p, textos.TITULO_VENCEU, { subtitulo: textos.SUB_VENCEU, entrada: 5, fica: 80, saida: 15 });
        som(p, "random.totem", { volume: 0.9 });
        if (dim) for (let k = 0; k < 3; k++) system.runTimeout(() => foguete(p), k * 12);
      }
    } else msg(p, textos.EMPATE);
    msg(p, textos.VOLTANDO);
  }
  resumo(jogo, vencedor, duracao);
  const cfg = config();
  for (const j of P.jog.values()) {
    const s = stats(j.id);
    s.j += 1;
    s.k += j.kills;
    const g = s.g[jogo.id] ?? { j: 0, v: 0, k: 0 };
    g.j += 1;
    g.k += j.kills;
    if (ganhou.has(j.id)) {
      s.v += 1;
      g.v += 1;
    }
    s.g[jogo.id] = g;
    premiar(porId(j.id), j, s, ganhou.has(j.id), duracao, cfg, jogo);
    gravarStats(j.id, s);
  }
  system.runTimeout(() => voltarAoHub(), 20 * 8);
}

/** Resumo no chat para todo mundo. @param {JogoDef} jogo @param {Vencedor | null} vencedor @param {number} duracao */
function resumo(jogo, vencedor, duracao) {
  const linhas = [tj.RESUMO_TITULO];
  if (vencedor) linhas.push(tj.RESUMO_VENCEDOR(vencedor.nome));
  const top = [...P.jog.values()].filter((j) => j.kills > 0).sort((a, b) => b.kills - a.kills).slice(0, SEGUNDOS_TOP_RESUMO);
  top.forEach((j, i) => linhas.push(tj.RESUMO_TOP(i + 1, j.nome, j.kills)));
  linhas.push(...jogo.resumo(P));
  linhas.push(tj.RESUMO_DURACAO(tempoTexto(duracao)));
  const texto = linhas.join("\n");
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (p) msg(p, texto);
  }
}

/** @param {Player} p */
function foguete(p) {
  try {
    if (!p.isValid) return;
    const l = p.location;
    for (let i = 0; i < 12; i++) p.dimension.spawnParticle("minecraft:totem_particle", { x: l.x + (Math.random() - 0.5) * 3, y: l.y + 1 + Math.random() * 2, z: l.z + (Math.random() - 0.5) * 3 });
  } catch {
    // sem partícula: segue
  }
}

/**
 * Paga Caudas com as travas: mínimo de jogadores, duração mínima, teto diário e espera entre prêmios.
 * @param {Player | undefined} p
 * @param {Jogador} j
 * @param {ReturnType<typeof stats>} s
 * @param {boolean} venceu
 * @param {number} duracao
 * @param {ReturnType<typeof config>} cfg
 * @param {JogoDef} jogo
 */
function premiar(p, j, s, venceu, duracao, cfg, jogo) {
  if (!p || j.saiu) return;
  const base = (venceu ? cfg.mgPremioVitoria : 0) + cfg.mgPremioKill * Math.min(j.kills, KILLS_PREMIADOS_MAX) + cfg.mgPremioCama * jogo.premioExtra(j);
  if (base <= 0) return;
  if (P.iniciais < cfg.mgMinPremio) return void msg(p, textos.SEM_PREMIO_POUCOS(cfg.mgMinPremio));
  if (duracao < MIN_DURACAO_PREMIO_S) return void msg(p, textos.SEM_PREMIO_CURTA);
  const hoje = diaBrasilia(Date.now());
  if (s.dia !== hoje) {
    s.dia = hoje;
    s.cx = 0;
  }
  const espera = Math.ceil((s.ult + cfg.mgRecargaPremioSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return void msg(p, textos.SEM_PREMIO_ESPERA(espera));
  const resta = cfg.mgCaudasDia - s.cx;
  if (resta <= 0) return void msg(p, textos.SEM_PREMIO_TETO);
  const pago = Math.min(base, resta);
  s.cx += pago;
  s.ult = Date.now();
  adicionarCaudas(p, pago);
  msg(p, textos.PREMIO(pago, venceu ? textos.MOTIVO_VITORIA : textos.MOTIVO_ABATES));
}

/**
 * Depois da partida ninguém sai da dimensão: todo mundo volta ao hub, de aventura e com a hotbar de votar/sair, e a espera
 * recomeça (a próxima contagem já começa se houver gente). Só o botão, o portal ou o comando tiram a pessoa do minigame.
 */
function voltarAoHub() {
  const dim = dimensaoMg();
  if (!dim || P.estado !== "fim") return devolverTodos();
  for (const j of [...P.jog.values()]) {
    const p = porId(j.id);
    if (j.saiu || !p || !p.isValid) {
      P.jog.delete(j.id);
      continue;
    }
    try {
      p.setGameMode(GameMode.Adventure);
      limparPessoa(p);
      p.getComponent("minecraft:health")?.resetToMaxValue();
      for (const e of p.getEffects()) p.removeEffect(e.typeId);
      p.extinguishFire();
      p.teleport(pontoHub(), { dimension: dim, rotation: { x: 0, y: 0 } });
      darItensHub(p);
      msg(p, tj.NO_HUB_DEPOIS);
    } catch (e) {
      registrarErro("Minigames: voltar ao hub", e);
    }
    Object.assign(j, { vivo: true, kills: 0, spawn: -1, pos: 0, equipe: -1, renasce: false, d: {} });
  }
  P.votos.clear();
  P.votosOpc.clear();
  P.ultimoAtq.clear();
  limparEscolha();
  limparItensSoltos(dim);
  for (const t of [10, 40]) system.runTimeout(() => dimensaoMg() && limparItensSoltos(/** @type {any} */ (dimensaoMg())), t);
  P.estado = config().mgLigado && hubPronto() ? "espera" : "ocioso";
  system.runTimeout(() => {
    if (P.estado === "espera") soltarAreas(["arena"]);
  }, 40);
  if (!P.jog.size) soltarAreas();
  conferirContagem();
}

/** Devolve todo mundo (coisas, modo, lugar) e então solta a arena. */
function devolverTodos() {
  const ids = [...P.jog.keys()];
  let pendentes = ids.length;
  let seguiu = false;
  const seguir = () => {
    if (seguiu) return;
    seguiu = true;
    P.jog.clear();
    P.votos.clear();
    P.votosOpc.clear();
  P.votosOpc.clear();
    P.ultimoAtq.clear();
    limparEscolha();
    const dim = dimensaoMg();
    if (dim) limparItensSoltos(dim);
    for (const t of [10, 40]) system.runTimeout(() => dimensaoMg() && limparItensSoltos(/** @type {any} */ (dimensaoMg())), t);
    soltarAreas();
    P.estado = config().mgLigado && hubPronto() ? "espera" : "ocioso";
  };
  if (!pendentes) return seguir();
  for (const id of ids) {
    const p = porId(id);
    if (!p) {
      pendentes--;
      continue;
    }
    liberar(p, () => {
      if (--pendentes <= 0) seguir();
    });
  }
  if (pendentes <= 0) seguir();
  system.runTimeout(seguir, 20 * 25);
}

// ----------------------------------------------------------------------------------- staff
/** Força o início da contagem (e a encurta) com quem estiver esperando. @param {Player} quem */
export function forcarInicio(quem) {
  if (P.estado === "espera" && P.jog.size > 0) {
    P.estado = "contagem";
    P.seg = SEG_TRAVA + 6;
    void prepararAreas(["arena"]);
    P.relogio = system.runInterval(passoContagem, 20);
    ok(quem, textos.FORCADO);
    return;
  }
  if (P.estado === "contagem") {
    P.seg = Math.min(P.seg, SEG_TRAVA + 3);
    ok(quem, textos.FORCADO);
    return;
  }
  erro(quem, textos.NADA_PARA_FORCAR);
}

/** Encerra tudo, sem prêmio, e devolve todo mundo. @param {Player} quem */
export function encerrarStaff(quem) {
  if (P.estado === "ocioso" || P.estado === "reset") return erro(quem, textos.NAO_ESTA);
  pararRelogio();
  if (P.loop >= 0) system.clearRun(P.loop);
  P.loop = -1;
  ciclo = 0;
  for (const j of P.jog.values()) {
    const p = porId(j.id);
    if (p) msg(p, textos.ENCERRADA_STAFF);
  }
  P.estado = "fim";
  const ids = [...P.jog.keys()];
  let pendentes = ids.length;
  const fim = () => {
    P.jog.clear();
    P.votos.clear();
    P.votosOpc.clear();
  P.votosOpc.clear();
    limparEscolha();
    soltarAreas();
    P.estado = config().mgLigado && hubPronto() ? "espera" : "ocioso";
  };
  if (!pendentes) fim();
  for (const id of ids) {
    const p = porId(id);
    if (!p) {
      if (--pendentes <= 0) fim();
      continue;
    }
    liberar(p, () => {
      if (--pendentes <= 0) fim();
    });
  }
  ok(quem, textos.ENCERRADO);
}

/** Devolve as coisas de quem está online e ficou preso fora de uma partida. @param {Player} quem */
export function devolverPresos(quem) {
  const presos = idsComGuarda().map((id) => porId(id)).filter((p) => p && !P.jog.has(p.id));
  if (!presos.length) return msg(quem, textos.NINGUEM_PRESO);
  for (const p of presos) liberar(/** @type {Player} */ (p));
  ok(quem, textos.DEVOLVIDOS(presos.length));
}

// ----------------------------------------------------------------------------------- regras do jogo
/** @param {Player} p */
const edicaoLivre = (p) => ehStaff(p) && !P.jog.has(p.id) && String(p.getGameMode()) === "Creative";

/** @param {Player} p @returns {Jogador | undefined} */
const meu = (p) => P.jog.get(p.id);

/** Dano: hub, gaiola, espectador e amigos não levam dano; o golpe fatal vira morte ou eliminação (ninguém "morre" de verdade). */
world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    const alvo = ev.hurtEntity;
    if (!(alvo instanceof Player)) return;
    const j = P.jog.get(alvo.id);
    if (!j) return;
    if (P.estado !== "jogando" || !j.vivo || j.renasce || !P.jogo) {
      ev.cancel = true;
      return;
    }
    const ataque = ev.damageSource.damagingEntity;
    let atacanteId;
    if (ataque instanceof Player && ataque.id !== alvo.id) {
      const a = P.jog.get(ataque.id);
      if (!a || !a.vivo || a.renasce || P.jogo.amigos?.(P, a, j)) {
        ev.cancel = true;
        return;
      }
      atacanteId = ataque.id;
      P.ultimoAtq.set(alvo.id, { id: ataque.id, t: system.currentTick });
    }
    const vida = alvo.getComponent("minecraft:health");
    if (vida && vida.currentValue - ev.damage <= 0) {
      ev.cancel = true;
      const rec = P.ultimoAtq.get(alvo.id);
      const quem = atacanteId ?? (rec && system.currentTick - rec.t <= TICKS_ATAQUE ? rec.id : undefined);
      const motivo = ev.damageSource.cause === EntityDamageCause.magic ? "borda" : quem ? "morto_por" : "morto";
      system.run(() => matar(alvo.id, motivo, quem));
    }
  } catch (e) {
    registrarErro("Minigames: dano", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    const p = ev.player;
    if (ev.dimension.id !== DIM_ID) return;
    if (edicaoLivre(p)) return;
    const j = meu(p);
    const b = ev.block;
    if (!j || P.estado !== "jogando" || !j.vivo || j.renasce || !P.jogo || !P.jogo.podeQuebrar(P, j, { x: b.location.x, y: b.location.y, z: b.location.z, typeId: b.typeId }, api)) ev.cancel = true;
  } catch (e) {
    registrarErro("Minigames: quebrar", e);
  }
});

world.afterEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (ev.dimension.id !== DIM_ID || P.estado !== "jogando" || !P.jogo) return;
    const j = meu(ev.player);
    if (!j) return;
    const l = ev.block.location;
    P.jogo.aoQuebrou?.(P, j, { x: l.x, y: l.y, z: l.z, typeId: ev.brokenBlockPermutation.type.id }, api);
    system.run(verificarVitoria);
  } catch (e) {
    registrarErro("Minigames: quebrou", e);
  }
});

/** Direção de cada face (para saber onde o bloco vai nascer). */
const FACE = /** @type {Record<string, [number, number, number]>} */ ({ Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] });

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const p = ev.player;
    const b = ev.block;
    if (b.dimension.id !== DIM_ID) return;
    const livre = edicaoLivre(p);
    if (!livre && dentroDosCofres(b.location.x, b.location.y, b.location.z)) {
      ev.cancel = true;
      return;
    }
    if (livre) return;
    const j = meu(p);
    if (!j || P.estado !== "jogando" || !j.vivo || j.renasce || !P.jogo) {
      ev.cancel = true;
      return;
    }
    // cama é só de enfeite/objetivo: dormir nela mudaria o ponto de renascimento da pessoa no mundo
    if (/(?:^|:)bed$/.test(b.typeId)) {
      ev.cancel = true;
      return;
    }
    const bl = { x: b.location.x, y: b.location.y, z: b.location.z, typeId: b.typeId };
    if (ev.isFirstEvent && P.jogo.aoInteragirBloco?.(P, j, bl, p, api)) {
      ev.cancel = true;
      return;
    }
    const item = ev.itemStack;
    if (item && BlockTypes.get(item.typeId)) {
      const f = FACE[String(ev.blockFace)] ?? [0, 0, 0];
      const onde = { x: b.location.x + f[0], y: b.location.y + f[1], z: b.location.z + f[2] };
      if (!P.jogo.podeColocar(P, j, onde, item)) ev.cancel = true;
    }
  } catch (e) {
    registrarErro("Minigames: interação", e);
  }
});

/** O que pode existir na dimensão dos minigames; o resto (zumbis, esqueletos…) some assim que nasce. */
const PERMITIDOS = new Set(["minecraft:item", "minecraft:tnt", "minecraft:xp_orb", "minecraft:arrow", "minecraft:snowball", "minecraft:egg", "minecraft:ender_pearl", "minecraft:fireball", "minecraft:small_fireball", "minecraft:fishing_hook", "minecraft:falling_block", "minecraft:thrown_trident", "minecraft:lightning_bolt", "minecraft:wind_charge_projectile", "minecraft:fireworks_rocket"]);
world.afterEvents.entitySpawn.subscribe((ev) => {
  try {
    const e = ev.entity;
    if (!e.isValid || e.dimension.id !== DIM_ID) return;
    if (e.typeId.startsWith("vulpus:") || PERMITIDOS.has(e.typeId)) return;
    e.remove();
  } catch {}
});

world.afterEvents.playerPlaceBlock.subscribe((ev) => {
  try {
    if (ev.block.dimension.id !== DIM_ID || P.estado !== "jogando" || !P.jogo) return;
    const j = meu(ev.player);
    if (!j) return;
    const l = ev.block.location;
    const bl = { x: l.x, y: l.y, z: l.z, typeId: ev.block.typeId };
    if (ev.block.typeId === "minecraft:tnt") {
      // TNT colocado já acende
      ev.block.setType("minecraft:air");
      ev.block.dimension.spawnEntity("minecraft:tnt", { x: l.x + 0.5, y: l.y, z: l.z + 0.5 });
      return;
    }
    P.jogo.aoColocou?.(P, j, bl, api);
  } catch (e) {
    registrarErro("Minigames: colocou", e);
  }
});

// Explosões: o jogo pode proteger o mapa (no Bedwars só caem os blocos dos jogadores).
world.beforeEvents.explosion.subscribe((ev) => {
  try {
    if (ev.dimension.id !== DIM_ID || P.estado !== "jogando" || !P.jogo?.explosao) return;
    ev.setImpactedBlocks(P.jogo.explosao(P, ev.getImpactedBlocks()));
  } catch (e) {
    registrarErro("Minigames: explosão", e);
  }
});

/** Usar um item: hotbar do hub, frascos e itens especiais de cada jogo. */
world.afterEvents.itemUse.subscribe((ev) => {
  try {
    const player = ev.source;
    const item = ev.itemStack;
    const j = P.jog.get(player.id);
    if (!j) return;
    const hub = chaveDoHub(item);
    if (hub === "votar") return void system.run(() => menuVotacao(player));
    if (hub === "sair") return void system.run(() => sair(player));
    if (P.estado !== "jogando" || !j.vivo || j.renasce || !P.jogo) return;
    if (P.jogo.aoUsarItem?.(P, j, item, player, api)) return;
    const f = chaveDoFrasco(item);
    if (f && FRASCOS[f]) beber(player, f);
  } catch (e) {
    registrarErro("Minigames: usar item", e);
  }
});

/** Bebe um frasco: aplica o efeito e gasta uma unidade. @param {Player} player @param {string} chave */
function beber(player, chave) {
  const f = FRASCOS[chave];
  try {
    player.addEffect(f.efeito, f.seg * 20, { amplifier: f.amp, showParticles: true });
    const inv = player.getComponent("minecraft:inventory")?.container;
    const slot = player.selectedSlotIndex;
    const it = inv?.getItem(slot);
    if (inv && it && chaveDoFrasco(it) === chave) {
      if (it.amount <= 1) inv.setItem(slot, undefined);
      else {
        it.amount -= 1;
        inv.setItem(slot, it);
      }
    }
    som(player, "random.drink", { volume: 0.8 });
  } catch (e) {
    registrarErro("Minigames: frasco", e);
  }
}

// ----------------------------------------------------------------------------------- hub: placar, barra de espera e partida do mundo
system.runInterval(() => {
  try {
    if (!hubPronto() || !dimensaoMg()) return;
    const e = estadoPartida();
    const linhas = [textos.TITULO_HUB, textos.ESTADOS[e.estado] ?? "", `§f${e.n}§7/${e.max} jogadores`];
    if (e.jogo) linhas.push(`§b${e.jogo} §7· §f${e.mapa}`);
    else if (e.n > 0) linhas.push(linhaVotos());
    manterTexto("vulpus_mg_titulo", { x: HUB.x + 0.5, y: HUB.y + 4, z: HUB.z + 0.5, d: DIM_ID }, linhas.join("\n"));
  } catch (e) {
    registrarErro("Minigames: placar do hub", e);
  }
}, 40);

/** Corta a linha no limite do scoreboard, sem deixar código de cor pela metade. @param {string} t @param {number} [max] */
function cortar(t, max = 28) {
  let n = 0;
  let out = "";
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "§") {
      out += t.slice(i, i + 2);
      i++;
      continue;
    }
    if (n >= max) break;
    out += t[i];
    n++;
  }
  return out;
}

/**
 * As linhas do scoreboard lateral de quem está nos minigames (null = fora deles): fila e votos no hub, ou o placar do jogo.
 * @param {Player} p
 * @returns {string[] | null}
 */
export function linhasHud(p) {
  const j = P.jog.get(p.id);
  if (!j || p.dimension.id !== DIM_ID) return null;
  try {
    const cfg = config();
    const max = Math.min(cfg.mgMaxJogadores, MAX_JOGADORES);
    if (P.estado === "jogando" && P.jogo && !j.saiu) {
      const seg = (system.currentTick - P.inicio) / 20;
      if (P.jogo.hud) return P.jogo.hud(P, j, seg, api).map((l) => cortar(l));
      const partes = P.jogo.barra(P, j, seg, api).split(/\s*§8\|\s*/).filter((x) => x.trim().length);
      return [`§b§l${P.jogo.nome.toUpperCase()}`, ...partes].map((l) => cortar(l));
    }
    if (P.estado === "fim") return [tj.HUD_TITULO, "§7Fim da partida", tj.HUD_JOGO(P.jogo?.nome ?? "-")];
    /** @type {string[]} */
    const l = [tj.HUD_TITULO, tj.HUD_JOGADORES(P.jog.size, cfg.mgMinJogadores, max)];
    if (P.estado === "contagem") l.push(tj.HUD_INICIO(P.seg));
    else l.push(tj.HUD_AGUARDANDO(Math.max(0, cfg.mgMinJogadores - P.jog.size)));
    if (P.jogo) {
      l.push(tj.HUD_JOGO(P.jogo.nome), tj.HUD_MAPA(P.mapa?.nome ?? "-"));
    } else {
      l.push(tj.HUD_VOTE);
      const v = votosPorJogo();
      for (const g of JOGOS.values()) l.push(tj.HUD_VOTO(g.nome, v.get(g.id) ?? 0, P.votos.get(p.id) === g.id));
    }
    return l.map((x) => cortar(x));
  } catch (e) {
    registrarErro("Minigames: scoreboard", e);
    return null;
  }
}

// A barra de quem espera no hub: tempo, jogadores e votos (agora no scoreboard lateral).
system.runInterval(() => {
  try {
    if (P.estado !== "espera" && P.estado !== "contagem") return;
    const cfg = config();
    const max = Math.min(cfg.mgMaxJogadores, MAX_JOGADORES);
    for (const j of P.jog.values()) {
      const p = porId(j.id);
      if (!p || p.dimension.id !== DIM_ID) continue;
      const texto = P.estado === "contagem" ? tj.BARRA_ESPERA(P.seg, P.jog.size, cfg.mgMinJogadores, max, P.jogo ? `§b${P.jogo.nome}` : linhaVotos()) : tj.BARRA_AGUARDANDO(P.jog.size, cfg.mgMinJogadores, max, linhaVotos());
      void texto;
    }
  } catch (e) {
    registrarErro("Minigames: barra de espera", e);
  }
}, 20);

world.afterEvents.worldLoad.subscribe(() => {
  try {
    iniciarEstado();
    const r = infoRegistro();
    (r.erro ? console.warn : console.log)(`[Vulpus] Minigames: dimensão ${dimensaoMg() ? "disponível" : "indisponível"}${r.erro ? ` (${r.erro})` : ""}; estado ${P.estado}`);
    soltarAreas(); // áreas de versões antigas ficavam sempre carregadas e atrasavam a abertura do mundo
  } catch (e) {
    registrarErro("Minigames: início", e);
  }
});

// Para o teste e o diagnóstico.
export const _estado = P;
void MARCA_HUB;
