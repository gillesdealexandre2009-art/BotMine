// @ts-check
// Spleef na torre: fila, contagem, partida (pá que quebra a neve na hora e bolas de neve), eliminação, vitória,
// prêmios com limite diário, ranking (com placar flutuante) e recuperação de saída, morte, reinício e /reload.
// A arena (centro, raio, camadas, estado salvo, reset) fica em spleef_arena.js; o painel da staff e o comando
// /vulpus:spleef, em spleef_staff.js. Os itens do jogador nunca são mexidos: só entrego e recolho os do Spleef.
import {
  BlockTypes,
  EnchantmentType,
  EntityDamageCause,
  EquipmentSlot,
  GameMode,
  ItemLockMode,
  ItemStack,
  Player,
  system,
  world,
} from "@minecraft/server";
import { ICONES, SONS } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { Lista } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { cancelarEspera, emCombate, emEspera, registrarBloqueioTeleporte } from "../core/teleporte.js";
import { diaBrasilia, erro, limitar, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { PREFIXO } from "../textos/geral.js";
import * as textos from "../textos/spleef.js";
import { adicionarCaudas, adicionarSecaoCaudas } from "./caudas.js";
import { ganharXp } from "./niveis.js";
import * as arena from "./spleef_arena.js";

/** @typedef {import("@minecraft/server").Block} Block */
/** @typedef {import("@minecraft/server").Container} Container */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {import("@minecraft/server").RGB} RGB */
/** @typedef {import("./spleef_arena.js").Arena} Arena */
/** @typedef {import("./spleef_arena.js").Local} Local */
/** @typedef {"livre" | "contagem" | "preparando" | "jogando" | "fim" | "resetando"} Fase */
/** @typedef {keyof typeof textos.MOTIVOS} Motivo */

/**
 * @typedef {object} Participante
 * @property {string} id
 * @property {string} nome
 * @property {boolean} vivo
 * @property {number} saiuTick  tick em que saiu (0 = ainda em pé)
 * @property {number} posicao  colocação final (1 = vencedor)
 * @property {number} quebrou  blocos quebrados
 * @property {number} proximaBola  tick da próxima bola de neve
 */

/**
 * @typedef {object} Partida
 * @property {string} id
 * @property {number} total  quantas pessoas começaram
 * @property {number} prepararTick  tick do teleporte para a torre
 * @property {number} comecouTick  tick do "VAI!" (0 = ainda na contagem 3-2-1)
 * @property {number} contado  último número da contagem 3-2-1 mostrado
 * @property {number} invasores  tick da última olhada em quem entrou na arena sem jogar
 * @property {Map<string, Participante>} jogadores
 */

/**
 * @typedef {object} Stats
 * @property {string} n  nome
 * @property {number} v  vitórias (só partidas que valem)
 * @property {number} p  partidas
 * @property {number} s  vitórias seguidas agora
 * @property {number} m  melhor sequência
 * @property {number} b  blocos quebrados (total)
 * @property {string} dia  dia (Brasília) do contador de prêmios
 * @property {number} pd  partidas com prêmio nesse dia
 */

const CHAVE_PARTIDA = "vulpus:spleef:partida";
const CHAVE_PENDENTES = "vulpus:spleef:pendentes";
const CHAVE_RECORDES = "vulpus:spleef:recordes";
const PREFIXO_STATS = "vulpus:spleef:j:";
export const ENTIDADE_TEXTO = "vulpus:texto";
const TAG_PLACAR = "vulpus:spleef_placar";
const BOLA = "minecraft:snowball";
const AR = "minecraft:air";
const PA_PADRAO = "minecraft:diamond_shovel";
/** Pás que a staff pode escolher (mesma ordem de textos.FERRAMENTAS). */
export const FERRAMENTAS = Object.freeze([
  "minecraft:wooden_shovel",
  "minecraft:stone_shovel",
  "minecraft:iron_shovel",
  "minecraft:golden_shovel",
  PA_PADRAO,
  "minecraft:netherite_shovel",
]);
const TICKS_SEGUNDO = 20;
/** Conferência da partida e da fila (só roda com fila ou partida). */
const TICKS_PASSO = 4;
/** Conferência de quem pisou na área de espera. */
const TICKS_LOBBY = 20;
/** De quanto em quanto tempo (em passos do lobby) confiro placares flutuantes perdidos. */
const PASSOS_FAXINA_PLACAR = 30;
const RAIO_LOBBY = 2.5;
/** Espera depois do teleporte antes do "3". */
const TICKS_ANTES_CONTAGEM = 20;
const BOLAS_INICIAIS = 4;
const MAX_BOLAS = 16;
/** Jogou de verdade = ficou em pé 20 s depois do "VAI!" ou quebrou 3 blocos. */
const SEGUNDOS_VIVO_PREMIO = 20;
const BLOCOS_PREMIO = 3;
/** Comemoração do vencedor na torre antes de sair e a neve voltar. */
const TICKS_COMEMORACAO = 60;
const TICKS_INVASORES = 20;
/** Mais alto que a camada de cima + 12 conta como fora da torre (voo, pulo de pérola). */
const ACIMA_MAX = 12;
/** Começar falhou (arena não pronta): espera antes de tentar de novo. */
const TICKS_ESPERA_FALHA = 200;
const TICKS_AVISO_STAFF = 6000;
/** Tentativas de 1 s esperando o chunk da arena carregar na hora de começar. */
const TENTATIVAS_CARREGAR = 30;
const MAX_PENDENTES = 200;
/** Por quanto tempo vale a conferência de "arena pronta". */
const TICKS_CACHE_MOTIVO = 100;
/** Recolher os itens de quem acabou de entrar ou renascer (o inventário demora um pouco). */
const TICKS_DEPOIS_SPAWN = 20;
/** Interações com bloco que constroem, quebram ou mudam a torre (além dos itens que são blocos). */
const ITEM_QUE_MEXE = /bucket|flint_and_steel|fire_charge|spawn_egg|armor_stand|end_crystal|boat|minecart|bone_meal|painting|frame|sign|bed|door|banner|seeds|redstone|string|candle|_hoe|_shovel|_axe|lead|brush/;
const AZUL = { red: 0.55, green: 0.85, blue: 1 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };
const BRANCO = { red: 1, green: 1, blue: 1 };
const P_NEVE = "minecraft:snowflake_particle";
const P_FUMACA = "minecraft:white_smoke_particle";
const P_CHAMA = "minecraft:colored_flame_particle";
const P_TOTEM = "minecraft:totem_particle";
const P_FAISCA = "minecraft:endrod";
const P_ESTOURO = "minecraft:large_explosion";
const S_NEVE = "dig.snow";

/** @type {Fase} */
let fase = "livre";
/** @type {string[]} ids na ordem de chegada */
const fila = [];
let fimContagem = 0;
let segundoMostrado = -1;
let esperaAte = 0;
let tentativasCarregar = 0;
let ultimoAvisoStaff = -TICKS_AVISO_STAFF;
/** @type {Partida | undefined} */
let partida;
/** @type {number | undefined} */
let loop;
/** O último reset falhou: não começa partida até a staff repor a neve. */
let neveQuebrada = false;
/** @type {Set<string>} quem está agora na área de espera (convite uma vez por visita) */
const noLobby = new Set();
let passosLobby = 0;
let placarPendente = true;
/** @type {((p: Player, voltar?: () => any) => any) | undefined} */
let abrirStaff;
let cacheMotivo = { tick: -1, valor: "" };

// ------------------------------------------------------------- consultas

/** Configurações do Spleef em vigor, já dentro das faixas. */
export function cfgSpleef() {
  const c = config();
  const minimo = limitar(Math.floor(c.spleefMinimo), 2, 16);
  return {
    ligado: c.spleefLigado,
    minimo,
    maximo: Math.max(minimo, limitar(Math.floor(c.spleefMaximo), 2, 32)),
    contagem: limitar(Math.floor(c.spleefContagem), 3, 120),
    contagemCheia: limitar(Math.floor(c.spleefContagemCheia), 3, 120),
    duracaoMin: limitar(Math.floor(c.spleefDuracaoMin), 1, 30),
    premioVitoria: limitar(Math.floor(c.spleefPremioVitoria), 0, 100000),
    premioParticipar: limitar(Math.floor(c.spleefPremioParticipar), 0, 100000),
    premiosDia: limitar(Math.floor(c.spleefPremiosDia), 0, 100),
    xp: limitar(Math.floor(c.spleefXp), 0, 10000),
    ferramenta: FERRAMENTAS.includes(c.spleefFerramenta) ? c.spleefFerramenta : PA_PADRAO,
    eficiencia: limitar(Math.floor(c.spleefEficiencia), 0, 5),
    bolas: c.spleefBolas,
    recargaBola: limitar(Math.floor(c.spleefRecargaBola), 1, 60),
  };
}

/** @returns {Fase} */
export const faseAtual = () => fase;

/** Partida em andamento (preparando, valendo ou na comemoração). */
export const partidaRodando = () => fase === "preparando" || fase === "jogando" || fase === "fim";

/** Pode mexer na arena (centro, camadas, salvar, resetar)? Não durante partida nem reset. */
export const arenaLivre = () => !partidaRodando() && fase !== "resetando" && !arena.resetEmAndamento();

/** @returns {readonly string[]} */
export const filaAtual = () => fila;

/**
 * Participante em pé numa partida em andamento.
 * @param {string} id
 * @returns {Participante | undefined}
 */
function vivo(id) {
  if (!partida || !partidaRodando()) return undefined;
  const j = partida.jogadores.get(id);
  return j?.vivo ? j : undefined;
}

/** @param {string} id */
export const estaJogando = (id) => vivo(id) !== undefined;

/** @returns {Participante[]} */
function vivos() {
  return partida ? [...partida.jogadores.values()].filter((j) => j.vivo) : [];
}

/** Segundos que faltam na partida valendo. */
function segundosRestantes() {
  if (!partida || !partida.comecouTick) return cfgSpleef().duracaoMin * 60;
  return cfgSpleef().duracaoMin * 60 - (system.currentTick - partida.comecouTick) / TICKS_SEGUNDO;
}

/** Motivo da arena não estar pronta ("" = pronta), guardado por alguns segundos (confere as estruturas). */
export function motivoArena() {
  const agora = system.currentTick;
  if (cacheMotivo.tick >= 0 && agora - cacheMotivo.tick < TICKS_CACHE_MOTIVO) return cacheMotivo.valor;
  const motivo = arena.motivoNaoPronta(arena.lerArena(), {
    centro: textos.NAO_PRONTA_CENTRO,
    camadas: textos.NAO_PRONTA_CAMADAS,
    salvo: textos.NAO_PRONTA_SALVO,
    antigo: textos.NAO_PRONTA_ANTIGO,
    estrutura: textos.NAO_PRONTA_ESTRUTURA,
    saida: textos.NAO_PRONTA_SAIDA,
  });
  cacheMotivo = { tick: agora, valor: motivo || (neveQuebrada ? textos.RESET_FALHOU : "") };
  return cacheMotivo.valor;
}

/** A staff mudou a arena (ou a neve voltou): a próxima consulta confere de novo. */
export function arenaMudou() {
  cacheMotivo = { tick: -1, valor: "" };
}

/** Texto curto da situação da arena (menu). */
function situacao() {
  if (!cfgSpleef().ligado) return textos.SITUACAO_FECHADA;
  if (motivoArena()) return textos.SITUACAO_SEM_ARENA;
  if (fase === "resetando") return textos.SITUACAO_RESETANDO;
  if (fase === "contagem") return textos.SITUACAO_CONTAGEM(Math.max(0, Math.ceil((fimContagem - system.currentTick) / TICKS_SEGUNDO)));
  if (partidaRodando()) return textos.SITUACAO_JOGANDO(vivos().length, segundosRestantes());
  return textos.SITUACAO_LIVRE;
}

/**
 * Linha do Spleef na sidebar: quem joga vê vivos e tempo; quem está na fila vê a posição. null = sem linha.
 * @param {Player} player
 * @returns {string | null}
 */
export function linhaSpleef(player) {
  if (vivo(player.id)) return textos.LINHA_HUD_JOGO(vivos().length, segundosRestantes(), fase !== "preparando");
  const i = fila.indexOf(player.id);
  return i >= 0 ? textos.LINHA_HUD_FILA(i + 1, fila.length) : null;
}

/**
 * Registra quem abre o painel da staff do Spleef (spleef_staff.js; evita import circular).
 * @param {(p: Player, voltar?: () => any) => any} fn
 */
export function aoAbrirStaff(fn) {
  abrirStaff = fn;
}

// ------------------------------------------------------------- itens

/**
 * Item entregue pelo Spleef (tem a marca no lore).
 * @param {ItemStack | undefined} item
 */
function ehItemSpleef(item) {
  if (!item) return false;
  try {
    return item.getLore().includes(textos.MARCA);
  } catch {
    return false;
  }
}

/** @param {ItemStack | undefined} item */
const ehPa = (item) => !!item && FERRAMENTAS.includes(item.typeId) && ehItemSpleef(item);
/** @param {ItemStack | undefined} item */
const ehBola = (item) => !!item && item.typeId === BOLA && ehItemSpleef(item);

/** @param {Player} player @returns {Container | undefined} */
function inventario(player) {
  return player.getComponent("minecraft:inventory")?.container;
}

/**
 * A pá: travada no inventário (não dropa, não vai para baú), fica na morte, com Eficiência.
 * @param {ReturnType<typeof cfgSpleef>} cfg
 */
function criarPa(cfg) {
  const item = new ItemStack(cfg.ferramenta, 1);
  item.nameTag = textos.NOME_PA;
  item.setLore([textos.LORE_PA, textos.MARCA]);
  item.lockMode = ItemLockMode.inventory;
  item.keepOnDeath = true;
  if (cfg.eficiencia > 0) {
    const encantavel = item.getComponent("minecraft:enchantable");
    // O id com e sem "minecraft:" (o jogo aceita um dos dois); sem encanto a pá ainda quebra na hora pelo script.
    for (const id of ["minecraft:efficiency", "efficiency"]) {
      try {
        encantavel?.addEnchantment({ type: new EnchantmentType(id), level: cfg.eficiencia });
        break;
      } catch (e) {
        if (id === "efficiency") registrarErro("Spleef: encantar a pá", e);
      }
    }
  }
  return item;
}

/** @param {number} n */
function criarBolas(n) {
  const item = new ItemStack(BOLA, n);
  item.nameTag = textos.NOME_BOLA;
  item.setLore([textos.LORE_BOLA, textos.MARCA]);
  item.keepOnDeath = true;
  return item;
}

/**
 * Espaços livres que a pessoa precisa para entrar (pá, mais as bolas se ligadas).
 * @param {ReturnType<typeof cfgSpleef>} cfg
 */
const espacosPrecisos = (cfg) => (cfg.bolas ? 2 : 1);

/**
 * Tira do inventário (e da mão secundária) só os itens do Spleef.
 * @param {Player} player
 * @param {boolean} avisar
 * @returns {number} quantos slots esvaziou
 */
export function recolherItens(player, avisar) {
  let n = 0;
  try {
    const inv = inventario(player);
    if (inv) {
      for (let i = 0; i < inv.size; i++) {
        if (ehItemSpleef(inv.getItem(i))) {
          inv.setItem(i);
          n++;
        }
      }
    }
    const equip = player.getComponent("minecraft:equippable");
    if (equip && ehItemSpleef(equip.getEquipment(EquipmentSlot.Offhand))) {
      equip.setEquipment(EquipmentSlot.Offhand);
      n++;
    }
  } catch (e) {
    registrarErro(`Spleef: recolher os itens de ${player.name}`, e);
  }
  if (avisar && n > 0) msg(player, textos.RECOLHI);
  return n;
}

/**
 * @param {Player} player
 * @param {ReturnType<typeof cfgSpleef>} cfg
 */
function entregarItens(player, cfg) {
  const inv = inventario(player);
  if (!inv) return;
  inv.addItem(criarPa(cfg));
  if (cfg.bolas) inv.addItem(criarBolas(BOLAS_INICIAIS));
}

/** @param {Player} player */
function contarBolas(player) {
  const inv = inventario(player);
  let n = 0;
  if (!inv) return n;
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (ehBola(item)) n += item?.amount ?? 0;
  }
  return n;
}

/** @param {Player} player */
function segurandoPa(player) {
  try {
    return ehPa(inventario(player)?.getItem(player.selectedSlotIndex));
  } catch {
    return false;
  }
}

// ------------------------------------------------------------- fila

/**
 * Por que a pessoa não pode jogar agora ("" = pode).
 * @param {Player} player
 * @param {ReturnType<typeof cfgSpleef>} cfg
 */
function motivoNaoPodeJogar(player, cfg) {
  const modo = player.getGameMode();
  if (modo === GameMode.Creative || modo === GameMode.Spectator) return textos.MODO_ERRADO;
  if (emCombate(player)) return textos.EM_COMBATE;
  const inv = inventario(player);
  const precisa = espacosPrecisos(cfg);
  // Sobra de uma partida anterior (raro) não conta como espaço ocupado: sai antes de entregar.
  if (!inv || inv.emptySlotsCount + contarItensSpleef(inv) < precisa) return textos.SEM_ESPACO(precisa);
  return "";
}

/** @param {Container} inv */
function contarItensSpleef(inv) {
  let n = 0;
  for (let i = 0; i < inv.size; i++) if (ehItemSpleef(inv.getItem(i))) n++;
  return n;
}

/**
 * Entra na fila.
 * @param {Player} player
 * @returns {boolean}
 */
export function entrarFila(player) {
  const cfg = cfgSpleef();
  if (!cfg.ligado) {
    erro(player, textos.FECHADO);
    return false;
  }
  if (motivoArena()) {
    erro(player, textos.SEM_ARENA);
    return false;
  }
  if (vivo(player.id)) {
    erro(player, textos.JA_JOGANDO);
    return false;
  }
  if (fila.includes(player.id)) {
    erro(player, textos.JA_NA_FILA);
    return false;
  }
  const motivo = motivoNaoPodeJogar(player, cfg);
  if (motivo) {
    erro(player, motivo);
    return false;
  }
  fila.push(player.id);
  ok(player, partidaRodando() || fase === "resetando" ? textos.ENTROU_FILA_PROXIMA : textos.ENTROU_FILA(fila.length, cfg.minimo));
  garantirLoop();
  return true;
}

/**
 * Sai da fila.
 * @param {Player} player
 * @returns {boolean}
 */
export function sairFila(player) {
  const i = fila.indexOf(player.id);
  if (i < 0) {
    erro(player, textos.NAO_NA_FILA);
    return false;
  }
  fila.splice(i, 1);
  ok(player, textos.SAIU_FILA);
  return true;
}

/**
 * Desiste da partida (conta como eliminação).
 * @param {Player} player
 * @returns {boolean}
 */
export function desistir(player) {
  if (!vivo(player.id) || fase === "fim") return false;
  msg(player, textos.VOCE_DESISTIU);
  eliminarVarios([[player.id, "desistiu"]]);
  return true;
}

/** @param {string} texto */
function avisarFila(texto) {
  for (const id of fila) msg(porId(id), texto);
}

/** @param {string} texto */
function avisarStaff(texto) {
  console.warn(`[Vulpus] ${texto.replace(/§./g, "")}`);
  for (const p of online()) if (ehStaff(p)) msg(p, texto);
}

/** Tira da fila quem saiu do jogo. */
function limparFila() {
  for (let i = fila.length - 1; i >= 0; i--) if (!porId(fila[i])) fila.splice(i, 1);
}

// ------------------------------------------------------------- loop

function garantirLoop() {
  if (loop === undefined) loop = system.runInterval(passo, TICKS_PASSO);
}

function pararLoop() {
  if (loop === undefined) return;
  system.clearRun(loop);
  loop = undefined;
}

function passo() {
  try {
    if (fase === "livre" || fase === "contagem") passoFila();
    else if (fase === "preparando" || fase === "jogando") passoPartida();
  } catch (e) {
    registrarErro("Spleef (passo)", e);
  }
  // Parado de verdade: sem fila e sem partida, nada roda.
  if (fase === "livre" && fila.length === 0) pararLoop();
}

function passoFila() {
  limparFila();
  const cfg = cfgSpleef();
  const agora = system.currentTick;
  if (!cfg.ligado || fila.length < cfg.minimo) {
    if (fase === "contagem") {
      fase = "livre";
      avisarFila(cfg.ligado ? textos.FILA_ESFRIOU(cfg.minimo - fila.length) : textos.FECHADO);
    }
    return;
  }
  if (agora < esperaAte) return;
  if (fase === "livre") {
    fase = "contagem";
    fimContagem = agora + cfg.contagem * TICKS_SEGUNDO;
    segundoMostrado = -1;
    tentativasCarregar = 0;
  }
  if (fila.length >= cfg.maximo) fimContagem = Math.min(fimContagem, agora + cfg.contagemCheia * TICKS_SEGUNDO);
  const faltam = Math.max(0, Math.ceil((fimContagem - agora) / TICKS_SEGUNDO));
  if (faltam !== segundoMostrado && faltam > 0) {
    segundoMostrado = faltam;
    for (const id of fila) {
      const p = porId(id);
      if (!p || emEspera(p)) continue;
      p.onScreenDisplay.setActionBar(textos.BARRA_CONTAGEM(faltam, Math.min(fila.length, cfg.maximo), cfg.maximo));
      if (faltam <= 3) som(p, SONS.spleefConta, { pitch: 0.8, volume: 0.6 });
    }
  }
  if (agora >= fimContagem) comecar();
}

/**
 * Começa a partida com a fila (contagem acabou ou a staff mandou).
 * @returns {boolean} se começou
 */
export function comecar() {
  const agora = system.currentTick;
  const motivo = motivoArena();
  if (motivo) {
    fase = "livre";
    esperaAte = agora + TICKS_ESPERA_FALHA;
    avisarFila(textos.ARENA_INDISPONIVEL);
    if (agora - ultimoAvisoStaff >= TICKS_AVISO_STAFF) {
      ultimoAvisoStaff = agora;
      avisarStaff(textos.AVISO_STAFF_NAO_PRONTA(motivo));
    }
    return false;
  }
  const a = arena.lerArena();
  if (!arena.carregada(a)) {
    arena.garantirArea(a);
    if (++tentativasCarregar > TENTATIVAS_CARREGAR) {
      fase = "livre";
      esperaAte = agora + TICKS_ESPERA_FALHA;
      avisarFila(textos.ARENA_INDISPONIVEL);
      avisarStaff(textos.AVISO_STAFF_NAO_PRONTA(textos.CARREGANDO));
      return false;
    }
    fase = "contagem";
    fimContagem = agora + TICKS_SEGUNDO;
    return false;
  }
  const cfg = cfgSpleef();
  limparFila();
  /** @type {Player[]} */
  const escolhidos = [];
  for (const id of [...fila]) {
    if (escolhidos.length >= cfg.maximo) break;
    const p = porId(id);
    if (!p) continue;
    const problema = motivoNaoPodeJogar(p, cfg);
    if (problema) {
      fila.splice(fila.indexOf(id), 1);
      erro(p, textos.NAO_ENTROU(problema));
      continue;
    }
    escolhidos.push(p);
  }
  if (escolhidos.length < cfg.minimo) {
    fase = "livre";
    esperaAte = agora + 5 * TICKS_SEGUNDO;
    for (const p of escolhidos) msg(p, textos.FALTOU_GENTE);
    return false;
  }
  for (const p of escolhidos) fila.splice(fila.indexOf(p.id), 1);
  partida = {
    id: Date.now().toString(36),
    total: escolhidos.length,
    prepararTick: agora,
    comecouTick: 0,
    contado: 0,
    invasores: 0,
    jogadores: new Map(),
  };
  fase = "preparando";
  const pontos = pontosLargada(a, escolhidos.length);
  escolhidos.forEach((p, i) => {
    recolherItens(p, false);
    /** @type {Participante} */
    const j = { id: p.id, nome: p.name, vivo: true, saiuTick: 0, posicao: 0, quebrou: 0, proximaBola: 0 };
    /** @type {Partida} */ (partida).jogadores.set(p.id, j);
    noLobby.delete(p.id);
    // Um teleporte do addon esperando (spawn, casa) não pode tirar a pessoa da torre depois.
    cancelarEspera(p);
    teleportarComEfeito(p, pontos[i]);
    entregarItens(p, cfg);
    mostrarTitulo(p, textos.TITULO_PREPARA, { subtitulo: textos.SUB_PREPARA(escolhidos.length), entrada: 5, fica: 15, saida: 0 });
  });
  persistir();
  const nomes = escolhidos.map((p) => p.name);
  for (const p of escolhidos) msg(p, textos.COMECOU(nomes));
  garantirLoop();
  return true;
}

/**
 * Lugares da largada: um círculo na camada de cima (ou em volta da entrada marcada), todos olhando para o meio.
 * @param {Arena} a
 * @param {number} n
 * @returns {Local[]}
 */
function pontosLargada(a, n) {
  const centro = a.topo ?? { x: a.cx + 0.5, y: arena.yTopo(a) + 1, z: a.cz + 0.5, d: a.d };
  const folga = a.raio - 1.5 - arena.distancia(a, centro.x, centro.z);
  const raio = n <= 1 ? 0 : Math.max(0, Math.min(a.raio * 0.6, folga));
  const giro = Math.random() * Math.PI * 2;
  return Array.from({ length: n }, (_, i) => {
    const ang = giro + (i * Math.PI * 2) / n;
    const x = centro.x + Math.cos(ang) * raio;
    const z = centro.z + Math.sin(ang) * raio;
    // Olhar para o meio: o yaw do jogo é 0 para o sul (+z) e 90 para o oeste (-x).
    const ry = Math.round((Math.atan2(-(centro.x - x), centro.z - z) * 180) / Math.PI);
    return { x, y: centro.y, z, d: a.d, rx: 0, ry: raio > 0 ? ry : 0 };
  });
}

/**
 * Teleporte na hora com o efeito do addon (fade, estouro na origem), sem a espera nem a recarga.
 * @param {Player} player
 * @param {Local | null | undefined} destino
 * @returns {boolean}
 */
function teleportarComEfeito(player, destino) {
  if (!destino || !player.isValid) return false;
  try {
    const dimOrigem = player.dimension;
    const posOrigem = player.location;
    efeitos.preparar(player, "kitsune", true);
    /** @type {import("@minecraft/server").TeleportOptions} */
    const opcoes = {
      dimension: world.getDimension(destino.d),
      checkForBlocks: false,
      keepVelocity: false,
      forceProvidedPositionOnDimensionChange: true,
    };
    if (destino.rx !== undefined && destino.ry !== undefined) opcoes.rotation = { x: destino.rx, y: destino.ry };
    player.teleport({ x: destino.x, y: destino.y, z: destino.z }, opcoes);
    efeitos.saida(player, dimOrigem, posOrigem, "kitsune");
    return true;
  } catch (e) {
    registrarErro(`Spleef: teleportar ${player.name}`, e);
    return false;
  }
}

/** Para onde vai quem sai da partida. @param {Arena} a */
const destinoSaida = (a) => a.saida ?? a.lobby;

/**
 * Leva alguém para a saída, sem convite do lobby logo em seguida.
 * @param {Player} player
 * @param {Arena} a
 */
function mandarParaSaida(player, a) {
  try {
    player.extinguishFire(false);
  } catch {
    // Sem fogo (ou mock): nada a apagar.
  }
  noLobby.add(player.id);
  teleportarComEfeito(player, destinoSaida(a));
}

function persistir() {
  if (!partida) return;
  salvarMundo(CHAVE_PARTIDA, {
    id: partida.id,
    jogadores: [...partida.jogadores.keys()],
    vivos: vivos().map((j) => j.id),
    t: Date.now(),
  });
}

/** @returns {string[]} */
function lerPendentes() {
  const lido = lerMundo(CHAVE_PENDENTES, []);
  return Array.isArray(lido) ? lido.filter((id) => typeof id === "string").slice(-MAX_PENDENTES) : [];
}

/** @param {string} id */
function adicionarPendente(id) {
  const lista = lerPendentes();
  if (!lista.includes(id)) salvarMundo(CHAVE_PENDENTES, [...lista, id].slice(-MAX_PENDENTES));
}

// ------------------------------------------------------------- partida

function passoPartida() {
  if (!partida) {
    fase = "livre";
    return;
  }
  const agora = system.currentTick;
  const a = arena.lerArena();
  if (fase === "preparando") contagemLargada(agora);
  /** @type {[string, Motivo][]} */
  const caidos = [];
  for (const j of vivos()) {
    const p = porId(j.id);
    const motivo = p ? motivoEliminacao(a, p) : "saiu";
    if (motivo) caidos.push([j.id, motivo]);
  }
  if (caidos.length) eliminarVarios(caidos);
  if (fase !== "jogando" || !partida) return;
  if (segundosRestantes() <= 0) {
    terminar({ empatados: vivos().map((j) => j.id) });
    return;
  }
  const cfg = cfgSpleef();
  if (cfg.bolas) recarregarBolas(agora, cfg);
  if (agora - partida.invasores >= TICKS_INVASORES) {
    partida.invasores = agora;
    tirarInvasores(a);
  }
}

/**
 * 3, 2, 1 e "VAI!" com títulos e sons; no "VAI!" a quebra libera.
 * @param {number} agora
 */
function contagemLargada(agora) {
  if (!partida) return;
  const decorrido = agora - partida.prepararTick - TICKS_ANTES_CONTAGEM;
  if (decorrido < 0) return;
  const numero = 3 - Math.floor(decorrido / TICKS_SEGUNDO);
  if (numero >= 1) {
    if (numero === partida.contado) return;
    partida.contado = numero;
    for (const j of vivos()) {
      const p = porId(j.id);
      if (!p) continue;
      mostrarTitulo(p, textos.TITULO_CONTA(numero), { subtitulo: textos.SUB_CONTA, entrada: 0, fica: 18, saida: 2 });
      som(p, SONS.spleefConta, { pitch: 1 + (3 - numero) * 0.25, volume: 1 });
    }
    return;
  }
  fase = "jogando";
  partida.comecouTick = agora;
  const cfg = cfgSpleef();
  for (const j of vivos()) {
    j.proximaBola = agora + cfg.recargaBola * TICKS_SEGUNDO;
    const p = porId(j.id);
    if (!p) continue;
    mostrarTitulo(p, textos.TITULO_VAI, { subtitulo: textos.SUB_VAI, entrada: 0, fica: 25, saida: 10 });
    som(p, SONS.spleefVai, { pitch: 1.4, volume: 0.8 });
  }
}

/**
 * Por que este jogador sai agora (undefined = continua).
 * @param {Arena} a
 * @param {Player} p
 * @returns {Motivo | undefined}
 */
function motivoEliminacao(a, p) {
  if (p.dimension.id !== a.d) return "dimensao";
  const modo = p.getGameMode();
  if (modo === GameMode.Creative || modo === GameMode.Spectator) return "modo";
  const { x, y, z } = p.location;
  if (y < arena.yMin(a) - 0.5) return "caiu";
  if (arena.distancia(a, x, z) > a.raio + arena.FOLGA_JOGADOR || y > arena.yTopo(a) + ACIMA_MAX) return "fora";
  try {
    const pes = p.dimension.getBlock({ x, y, z });
    if (pes && /lava/.test(pes.typeId)) return "lava";
    // Em pé em cima de algo fora do círculo (parede, parapeito da janela): saiu da arena.
    if (p.isOnGround) {
      const chao = p.dimension.getBlock({ x, y: y - 0.05, z });
      if (chao && !chao.isAir && !chao.isLiquid && !arena.ehBlocoCamada(a, chao) && !arena.noCirculo(a, chao.location)) return "fora";
    }
  } catch {
    // Chunk indisponível: decide na próxima conferência.
  }
  return undefined;
}

/**
 * Elimina vários de uma vez (mesma conferência). Se todos os que restavam caíram juntos, empatam entre si.
 * @param {[string, Motivo][]} caidos
 */
function eliminarVarios(caidos) {
  if (!partida) return;
  const restavam = vivos().length;
  const ids = caidos.map(([id]) => id);
  for (const [id, motivo] of caidos) eliminar(id, motivo);
  persistir();
  const sobraram = vivos();
  if (fase === "preparando" && sobraram.length < 2) cancelar();
  else if (fase === "jogando" && sobraram.length === 1) terminar({ vencedor: sobraram[0].id });
  else if (fase === "jogando" && sobraram.length === 0) terminar({ empatados: restavam === ids.length ? ids : [] });
}

/**
 * Tira alguém da partida: mensagem para a arena, efeito no lugar, pá e bolas de volta, teleporte para a saída.
 * @param {string} id
 * @param {Motivo} motivo
 */
function eliminar(id, motivo) {
  const j = partida?.jogadores.get(id);
  if (!partida || !j || !j.vivo) return;
  const a = arena.lerArena();
  j.vivo = false;
  j.saiuTick = system.currentTick;
  const p = porId(id);
  if (fase === "fim") {
    // Saiu na comemoração: sem anúncio, só tira da torre.
    if (!p) adicionarPendente(id);
    else if (motivo !== "saiu") {
      recolherItens(p, false);
      if (motivo !== "morreu") mandarParaSaida(p, a);
    }
    return;
  }
  const restam = vivos().length;
  j.posicao = restam + 1;
  const texto = textos.ELIMINOU(j.nome, textos.MOTIVOS[motivo], restam);
  for (const outro of partida.jogadores.values()) msg(porId(outro.id), texto);
  if (!p) {
    adicionarPendente(id);
    return;
  }
  efeitoEliminacao(p, a);
  recolherItens(p, false);
  // Quem morreu renasce sozinho; os outros vão para a saída.
  if (motivo !== "morreu") mandarParaSaida(p, a);
  mostrarTitulo(p, textos.TITULO_ELIMINADO, { subtitulo: textos.SUB_ELIMINADO(j.posicao, partida.total), entrada: 4, fica: 40, saida: 12 });
}

/**
 * Puf de neve e fumaça onde a pessoa caiu, com som para quem está na partida.
 * @param {Player} p
 * @param {Arena} a
 */
function efeitoEliminacao(p, a) {
  try {
    const dim = p.dimension;
    const c = p.location;
    if (efeitos.emitir(dim, P_ESTOURO, { x: c.x, y: c.y + 1, z: c.z })) {
      efeitos.nuvem(dim, c, { n: 10, largura: 0.8, y0: 0.2, alto: 1.8 }, P_NEVE);
      efeitos.nuvem(dim, c, { n: 4, largura: 0.5, y0: 0.5, alto: 1 }, P_FUMACA);
    }
    for (const outro of partida?.jogadores.values() ?? []) {
      const q = porId(outro.id);
      if (q && q.dimension.id === a.d) som(q, SONS.spleefCaiu, { pitch: 0.7, volume: 0.9 });
    }
  } catch (e) {
    registrarErro("Spleef: efeito de eliminação", e);
  }
}

/**
 * Bolas de neve: uma nova a cada recarga, até MAX_BOLAS.
 * @param {number} agora
 * @param {ReturnType<typeof cfgSpleef>} cfg
 */
function recarregarBolas(agora, cfg) {
  for (const j of vivos()) {
    if (agora < j.proximaBola) continue;
    j.proximaBola = agora + cfg.recargaBola * TICKS_SEGUNDO;
    const p = porId(j.id);
    if (!p || contarBolas(p) >= MAX_BOLAS) continue;
    inventario(p)?.addItem(criarBolas(1));
  }
}

/**
 * Quem está na arena sem estar jogando (fora do criativo e do espectador) vai para a espera.
 * @param {Arena} a
 * @param {string} [aviso]  mensagem para quem foi tirado
 */
function tirarInvasores(a, aviso = textos.INVASOR) {
  const dim = world.getDimension(a.d);
  const centro = { x: a.cx + 0.5, y: (arena.yTopo(a) + arena.yMin(a)) / 2, z: a.cz + 0.5 };
  const alcance = a.raio + 4 + (arena.yTopo(a) - arena.yMin(a)) / 2;
  for (const p of dim.getPlayers({ location: centro, maxDistance: alcance })) {
    if (vivo(p.id) || !arena.noCilindro(a, a.d, p.location)) continue;
    const modo = p.getGameMode();
    if (modo === GameMode.Creative || modo === GameMode.Spectator) continue;
    teleportarComEfeito(p, a.lobby ?? a.saida);
    noLobby.add(p.id);
    msg(p, aviso);
  }
}

/**
 * Fim da partida: prêmios, ranking, anúncio, comemoração e, depois, saída de quem ficou e a neve de volta.
 * @param {{ vencedor?: string, empatados?: string[], semPremio?: boolean, anuncio?: string }} fim
 */
function terminar(fim) {
  if (!partida || fase === "fim" || fase === "resetando") return;
  const p = partida;
  const agora = system.currentTick;
  fase = "fim";
  const segundos = p.comecouTick ? (agora - p.comecouTick) / TICKS_SEGUNDO : 0;
  const vencedor = fim.vencedor ? p.jogadores.get(fim.vencedor) : undefined;
  if (vencedor) vencedor.posicao = 1;
  const empatados = (fim.empatados ?? []).map((id) => p.jogadores.get(id)).filter((j) => !!j);
  /** @type {string[]} */
  let recordes = [];
  if (!fim.semPremio) recordes = premiar(p, vencedor?.id, agora, segundos);
  const nomesEmpate = empatados.map((j) => j?.nome ?? "");
  const anuncio = fim.anuncio
    ? fim.anuncio
    : vencedor
      ? textos.ANUNCIO_VITORIA(vencedor.nome, p.total, segundos)
      : nomesEmpate.length
        ? textos.ANUNCIO_EMPATE(nomesEmpate)
        : textos.ANUNCIO_SEM_VENCEDOR;
  world.sendMessage(PREFIXO + anuncio);
  if (vencedor) {
    const st = lerStats(vencedor.id);
    if (st.s >= 3) world.sendMessage(PREFIXO + `§f${vencedor.nome}§r: ${textos.SEQUENCIA(st.s)}`);
  }
  for (const r of recordes) world.sendMessage(PREFIXO + textos.RECORDE_NOVO(r));
  for (const q of publicoDaArena(p)) {
    if (vencedor && q.id === vencedor.id) {
      mostrarTitulo(q, textos.TITULO_VOCE_VENCEU, { subtitulo: textos.SUB_VOCE_VENCEU(p.total), entrada: 5, fica: 50, saida: 15 });
    } else if (vencedor) {
      mostrarTitulo(q, textos.TITULO_VITORIA(vencedor.nome), { subtitulo: textos.SUB_VITORIA, entrada: 5, fica: 50, saida: 15 });
    } else if (nomesEmpate.length) {
      mostrarTitulo(q, textos.TITULO_EMPATE, { subtitulo: textos.SUB_EMPATE(nomesEmpate), entrada: 5, fica: 50, saida: 15 });
    }
  }
  const quem = vencedor ? porId(vencedor.id) : undefined;
  if (quem && !fim.semPremio) comemorar(quem);
  system.runTimeout(encerrar, vencedor && !fim.semPremio ? TICKS_COMEMORACAO : TICKS_SEGUNDO);
}

/**
 * Quem vê o fim: todos da partida (online) e quem está perto da torre.
 * @param {Partida} p
 * @returns {Player[]}
 */
function publicoDaArena(p) {
  const a = arena.lerArena();
  /** @type {Map<string, Player>} */
  const mapa = new Map();
  for (const j of p.jogadores.values()) {
    const q = porId(j.id);
    if (q) mapa.set(q.id, q);
  }
  try {
    const centro = { x: a.cx + 0.5, y: arena.yTopo(a), z: a.cz + 0.5 };
    for (const q of world.getDimension(a.d).getPlayers({ location: centro, maxDistance: a.raio + 24 })) mapa.set(q.id, q);
  } catch (e) {
    registrarErro("Spleef: quem está perto da torre", e);
  }
  return [...mapa.values()];
}

/**
 * Fogos de neve e ouro em volta de quem venceu, em 3 pulsos.
 * @param {Player} player
 */
function comemorar(player) {
  /** @param {number} i */
  const pulso = (i) => () => {
    try {
      if (!player.isValid) return;
      const dim = player.dimension;
      const c = player.location;
      /** @type {RGB[]} */
      const cores = [DOURADO, AZUL, BRANCO];
      if (efeitos.anel(dim, c, { raio: 1.2 + i * 0.6, n: 14, y: 0.1 + i * 0.4, giro: i }, P_CHAMA, cores)) {
        efeitos.nuvem(dim, c, { n: 10, largura: 1 + i * 0.4, y0: 1.5, alto: 1.5 }, P_TOTEM);
        efeitos.nuvem(dim, c, { n: 6, largura: 0.8, y0: 2.2, alto: 1 }, P_FAISCA);
      }
      for (const q of dim.getPlayers({ location: c, maxDistance: 32 })) {
        som(q, i === 0 ? SONS.spleefFogosSobe : SONS.spleefFogos, { location: c, pitch: 0.9 + i * 0.15, volume: 1 });
        if (i === 2) som(q, SONS.spleefBrilho, { location: c, pitch: 1, volume: 0.8 });
      }
    } catch (e) {
      registrarErro("Spleef: comemoração", e);
    }
  };
  for (let i = 0; i < 3; i++) system.runTimeout(pulso(i), 1 + i * 12);
}

/** Quem ficou em pé sai da torre, a neve volta e a fila pode seguir. */
function encerrar() {
  const a = arena.lerArena();
  if (partida) {
    for (const j of vivos()) {
      j.vivo = false;
      j.saiuTick = system.currentTick;
      const q = porId(j.id);
      if (q) {
        recolherItens(q, false);
        mandarParaSaida(q, a);
      } else adicionarPendente(j.id);
    }
    persistir();
  }
  repor();
}

/** A partida acabou de verdade: reset da neve e fila liberada. */
function repor() {
  fase = "resetando";
  esvaziarArena();
  arena
    .resetar()
    .then((n) => {
      neveQuebrada = n === undefined && arena.lerArena().camadas.length > 0;
      arenaMudou();
      if (neveQuebrada) avisarStaff(textos.RESET_FALHOU);
    })
    .catch((e) => {
      neveQuebrada = true;
      arenaMudou();
      registrarErro("Spleef: repor a neve", e);
    })
    .finally(() => {
      salvarMundo(CHAVE_PARTIDA, undefined);
      partida = undefined;
      fase = "livre";
      atualizarPlacar();
      garantirLoop();
    });
}

/** Antes da neve voltar, quem ficou dentro da arena (sem ser criativo/espectador) sai, para não ficar preso. */
function esvaziarArena() {
  try {
    const a = arena.lerArena();
    if (a.temCentro && a.camadas.length) tirarInvasores(a, textos.ANTES_DO_RESET);
  } catch (e) {
    registrarErro("Spleef: esvaziar a arena", e);
  }
}

/** Partida que nem começou (faltou gente na contagem 3-2-1): ninguém perde nada e quem ficou volta para a fila. */
function cancelar() {
  if (!partida) return;
  const a = arena.lerArena();
  fase = "fim";
  const sobraram = vivos();
  for (const j of partida.jogadores.values()) msg(porId(j.id), textos.CANCELADA);
  for (const j of sobraram) {
    j.vivo = false;
    const q = porId(j.id);
    if (!q) continue;
    recolherItens(q, false);
    mandarParaSaida(q, a);
    if (!fila.includes(q.id)) fila.unshift(q.id);
  }
  persistir();
  repor();
}

/**
 * A staff encerra a partida (sem prêmios).
 * @returns {boolean}
 */
export function encerrarPelaStaff() {
  if (!partidaRodando() || fase === "fim") return false;
  terminar({ semPremio: true, anuncio: textos.ENCERRADA_STAFF });
  return true;
}

/**
 * Staff: começa já com quem está na fila (pula o resto da contagem).
 * @returns {boolean}
 */
export function comecarJa() {
  if (fase !== "livre" && fase !== "contagem") return false;
  limparFila();
  if (fila.length < 2) return false;
  esperaAte = 0;
  return comecar();
}

/**
 * Staff: repor a neve agora (sem partida).
 * @returns {Promise<number | undefined>}
 */
export async function resetarPelaStaff() {
  if (!arenaLivre()) return undefined;
  fase = "resetando";
  esvaziarArena();
  try {
    const n = await arena.resetar();
    if (n !== undefined) neveQuebrada = false;
    arenaMudou();
    return n;
  } finally {
    fase = "livre";
    garantirLoop();
  }
}

// ------------------------------------------------------------- prêmios, ranking e recordes

/**
 * @param {any} lido
 * @returns {Stats}
 */
function completarStats(lido) {
  const o = lido && typeof lido === "object" ? lido : {};
  /** @param {any} n */
  const num = (n) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  return {
    n: typeof o.n === "string" ? o.n.slice(0, 32) : "",
    v: num(o.v),
    p: num(o.p),
    s: num(o.s),
    m: num(o.m),
    b: num(o.b),
    dia: typeof o.dia === "string" ? o.dia : "",
    pd: num(o.pd),
  };
}

/**
 * Estatísticas do Spleef de alguém (também offline).
 * @param {string} id
 * @returns {Stats}
 */
export function lerStats(id) {
  return completarStats(lerMundo(PREFIXO_STATS + id));
}

/**
 * Prêmios de hoje que ainda valem para a pessoa.
 * @param {string} id
 */
export function premiosRestantes(id) {
  const st = lerStats(id);
  const usados = st.dia === diaBrasilia(Date.now()) ? st.pd : 0;
  return Math.max(0, cfgSpleef().premiosDia - usados);
}

/**
 * @typedef {{ rapida: { n: string, s: number } | null, blocos: { n: string, q: number } | null, sequencia: { n: string, q: number } | null }} Recordes
 */

/** @returns {Recordes} */
export function lerRecordes() {
  const r = lerMundo(CHAVE_RECORDES, {});
  const o = r && typeof r === "object" ? r : {};
  /** @param {any} v @param {"s" | "q"} campo */
  const um = (v, campo) =>
    v && typeof v === "object" && typeof v.n === "string" && typeof v[campo] === "number" && Number.isFinite(v[campo]) ? v : null;
  return { rapida: um(o.rapida, "s"), blocos: um(o.blocos, "q"), sequencia: um(o.sequencia, "q") };
}

/**
 * Prêmios (com o limite diário), estatísticas e recordes. Uma partida só "vale" com pelo menos 2 pessoas que
 * jogaram de verdade (ficaram em pé 20 s depois do "VAI!" ou quebraram 3 blocos): sem isso, ninguém ganha nada
 * e a vitória não entra no ranking.
 * @param {Partida} p
 * @param {string | undefined} vencedorId
 * @param {number} agora
 * @param {number} segundos
 * @returns {string[]} recordes novos
 */
function premiar(p, vencedorId, agora, segundos) {
  const cfg = cfgSpleef();
  /** @param {Participante} j */
  const deVerdade = (j) => {
    const fim = j.saiuTick || agora;
    const emPe = p.comecouTick ? (fim - p.comecouTick) / TICKS_SEGUNDO : 0;
    return emPe >= SEGUNDOS_VIVO_PREMIO || j.quebrou >= BLOCOS_PREMIO;
  };
  const lista = [...p.jogadores.values()];
  const valida = lista.filter(deVerdade).length >= 2;
  const hoje = diaBrasilia(Date.now());
  const rec = lerRecordes();
  /** @type {string[]} */
  const novos = [];
  for (const j of lista) {
    const st = lerStats(j.id);
    st.n = j.nome;
    if (st.dia !== hoje) {
      st.dia = hoje;
      st.pd = 0;
    }
    st.p++;
    st.b += j.quebrou;
    const venceu = j.id === vencedorId;
    if (venceu && valida) {
      st.v++;
      st.s++;
      st.m = Math.max(st.m, st.s);
    } else if (!venceu) st.s = 0;
    const ganha = valida && deVerdade(j) && st.pd < cfg.premiosDia;
    if (ganha) st.pd++;
    salvarMundo(PREFIXO_STATS + j.id, st);
    const q = porId(j.id);
    if (ganha) {
      const premio = venceu ? cfg.premioVitoria : cfg.premioParticipar;
      if (premio > 0) adicionarCaudas(j.id, premio, venceu ? textos.MOTIVO_VITORIA : textos.MOTIVO_PARTICIPAR);
      if (cfg.xp > 0) {
        ganharXp(j.id, cfg.xp);
        msg(q, textos.XP_GANHO(cfg.xp));
      }
    } else if (!valida) msg(q, textos.SEM_PREMIO_CURTA);
    else if (!deVerdade(j)) msg(q, textos.SEM_PREMIO_PARADO);
    else if (cfg.premiosDia > 0) msg(q, textos.SEM_PREMIO_LIMITE(cfg.premiosDia));
    if (!valida) continue;
    if (venceu && segundos > 0 && (!rec.rapida || segundos < rec.rapida.s)) {
      rec.rapida = { n: j.nome, s: Math.round(segundos) };
      novos.push(textos.RECORDE_RAPIDA);
    }
    if (j.quebrou > 0 && (!rec.blocos || j.quebrou > rec.blocos.q)) {
      rec.blocos = { n: j.nome, q: j.quebrou };
      if (!novos.includes(textos.RECORDE_BLOCOS)) novos.push(textos.RECORDE_BLOCOS);
    }
    if (venceu && st.m >= 2 && (!rec.sequencia || st.m > rec.sequencia.q)) {
      rec.sequencia = { n: j.nome, q: st.m };
      novos.push(textos.RECORDE_SEQUENCIA);
    }
  }
  if (novos.length) salvarMundo(CHAVE_RECORDES, rec);
  return novos;
}

/**
 * Todos com estatística, do melhor para o pior (vitórias, depois melhor sequência, depois menos partidas).
 * @returns {{ id: string, st: Stats }[]}
 */
export function ranking() {
  return world
    .getDynamicPropertyIds()
    .filter((k) => k.startsWith(PREFIXO_STATS))
    .map((k) => ({ id: k.slice(PREFIXO_STATS.length), st: lerStats(k.slice(PREFIXO_STATS.length)) }))
    .filter((l) => l.st.v > 0)
    .sort((a, b) => b.st.v - a.st.v || b.st.m - a.st.m || a.st.p - b.st.p || a.st.n.localeCompare(b.st.n));
}

/** Texto do placar flutuante (top 5). */
function textoPlacar() {
  const top = ranking().slice(0, 5);
  const linhas = top.length
    ? top.map((l, i) => textos.PLACAR_LINHA(i + 1, l.st.n || textos.NOME_DESCONHECIDO, l.st.v))
    : [textos.PLACAR_VAZIO];
  return [textos.PLACAR_TITULO, ...linhas].join("\n");
}

/**
 * Põe (ou atualiza, ou tira) o placar flutuante: uma entidade vulpus:texto invisível, só com o nome.
 * @returns {boolean} se conseguiu (chunk carregado)
 */
export function atualizarPlacar() {
  try {
    const a = arena.lerArena();
    /** @type {import("@minecraft/server").Entity[]} */
    const achados = [];
    for (const d of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
      achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE_TEXTO, tags: [TAG_PLACAR] }));
    }
    if (!a.placar) {
      for (const e of achados) e.remove();
      placarPendente = false;
      return true;
    }
    const pos = { x: a.placar.x, y: a.placar.y, z: a.placar.z };
    const dim = world.getDimension(a.placar.d);
    if (!dim.isChunkLoaded(pos)) {
      placarPendente = true;
      return false;
    }
    let ent = achados.find((e) => e.dimension.id === dim.id);
    for (const e of achados) if (e !== ent) e.remove();
    if (!ent) {
      ent = dim.spawnEntity(ENTIDADE_TEXTO, pos);
      ent.addTag(TAG_PLACAR);
    } else ent.teleport(pos, { dimension: dim });
    ent.nameTag = textoPlacar();
    placarPendente = false;
    return true;
  } catch (e) {
    placarPendente = true;
    registrarErro("Spleef: placar flutuante", e);
    return false;
  }
}

/** Placar perdido (de uma posição antiga que carregou agora): sai. */
function faxinaPlacar() {
  const a = arena.lerArena();
  for (const d of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
    for (const e of world.getDimension(d).getEntities({ type: ENTIDADE_TEXTO, tags: [TAG_PLACAR] })) {
      const p = a.placar;
      const certo = p && e.dimension.id === p.d && Math.hypot(e.location.x - p.x, e.location.y - p.y, e.location.z - p.z) < 1;
      if (!certo) e.remove();
    }
  }
}

// ------------------------------------------------------------- quebra

/**
 * Quebra um bloco de camada (ar, neve voando e o som). Só com partida valendo e só neve das camadas.
 * @param {Block | undefined} bloco
 * @param {Participante} j
 */
function quebrar(bloco, j) {
  if (fase !== "jogando" || !bloco || !j.vivo) return;
  const a = arena.lerArena();
  if (!arena.ehBlocoCamada(a, bloco)) return;
  const dim = bloco.dimension;
  const { x, y, z } = bloco.location;
  const c = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
  bloco.setType(AR);
  j.quebrou++;
  efeitos.nuvem(dim, { x: c.x, y: c.y - 0.5, z: c.z }, { n: 4, largura: 0.45, y0: 0.2, alto: 0.7 }, P_NEVE);
  try {
    dim.playSound(S_NEVE, c, { volume: 0.8 });
  } catch (e) {
    registrarErro("Spleef: som da neve", e);
  }
}

/**
 * Um item usado num bloco pode construir ou mudar a torre (bloco, balde, isqueiro, enxada...)?
 * @param {ItemStack | undefined} item
 */
function itemMexe(item) {
  if (!item) return false;
  return ITEM_QUE_MEXE.test(item.typeId) || BlockTypes.get(item.typeId) !== undefined;
}

/**
 * O que quem joga pode usar na partida: a bola do Spleef e comida.
 * @param {ItemStack | undefined} item
 */
function usoLivre(item) {
  if (!item) return false;
  try {
    return ehBola(item) || item.hasTag("minecraft:is_food");
  } catch {
    return false;
  }
}

/**
 * Staff no criativo pode editar a torre fora da partida. Modo restrito: só lê.
 * @param {Player} player
 */
function podeEditar(player) {
  return !partidaRodando() && ehStaff(player) && player.getGameMode() === GameMode.Creative;
}

/**
 * Bloco vizinho na face clicada (onde um bloco novo iria parar).
 * @param {Vector3} pos
 * @param {string} face
 */
function vizinho(pos, face) {
  /** @type {Record<string, Vector3>} */
  const passos = {
    Up: { x: 0, y: 1, z: 0 },
    Down: { x: 0, y: -1, z: 0 },
    North: { x: 0, y: 0, z: -1 },
    South: { x: 0, y: 0, z: 1 },
    East: { x: 1, y: 0, z: 0 },
    West: { x: -1, y: 0, z: 0 },
  };
  const d = passos[face] ?? { x: 0, y: 0, z: 0 };
  return { x: pos.x + d.x, y: pos.y + d.y, z: pos.z + d.z };
}

// ------------------------------------------------------------- menus de quem joga

/**
 * Menu do Spleef: fila, como jogar, ranking e recordes.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuSpleef(player, voltar) {
  const cfg = cfgSpleef();
  const aqui = () => menuSpleef(player, voltar);
  const posicao = fila.indexOf(player.id) + 1;
  const jogando = estaJogando(player.id);
  const lista = new Lista(textos.TITULO).texto(
    textos.CORPO({
      situacao: situacao(),
      fila: fila.length,
      minimo: cfg.minimo,
      maximo: cfg.maximo,
      voce: jogando ? "jogando" : posicao ? "fila" : "nada",
      posicao,
      stats: lerStats(player.id),
      premiosRestantes: premiosRestantes(player.id),
      premioVitoria: cfg.premioVitoria,
      premioParticipar: cfg.premioParticipar,
    }),
  );
  if (jogando) lista.botao(textos.BOTAO_DESISTIR, ICONES.sair, (p) => desistir(p));
  else if (posicao) lista.botao(textos.BOTAO_SAIR, ICONES.nao, (p) => sairFila(p));
  else lista.botao(textos.BOTAO_ENTRAR, ICONES.spleef, (p) => entrarFila(p));
  lista
    .botao(textos.BOTAO_COMO, ICONES.lore, (p) => menuComoJogar(p, aqui))
    .botao(textos.BOTAO_RANKING, ICONES.ranking, (p) => menuRanking(p, aqui))
    .botao(textos.BOTAO_RECORDES, ICONES.trofeu, (p) => menuRecordes(p, aqui));
  const staff = abrirStaff;
  if (staff && ehStaff(player)) lista.botao(textos.BOTAO_STAFF, ICONES.staff, (p) => staff(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuComoJogar(player, voltar) {
  const cfg = cfgSpleef();
  await new Lista(textos.TITULO_COMO)
    .texto(
      textos.COMO_JOGAR({
        minimo: cfg.minimo,
        duracaoMin: cfg.duracaoMin,
        bolas: cfg.bolas,
        recargaBola: cfg.recargaBola,
        premioVitoria: cfg.premioVitoria,
        premioParticipar: cfg.premioParticipar,
        premiosDia: cfg.premiosDia,
      }),
    )
    .voltar(voltar)
    .abrir(player);
}

/**
 * Top 10 de vitórias e a posição de quem abriu.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuRanking(player, voltar) {
  const todos = ranking();
  const linhas = todos
    .slice(0, 10)
    .map((l, i) => textos.RANKING_LINHA(i + 1, l.st.n || textos.NOME_DESCONHECIDO, l.st.v, l.st.p, l.id === player.id));
  const posicao = todos.findIndex((l) => l.id === player.id) + 1;
  const corpo = todos.length ? [...linhas, "", posicao ? textos.RANKING_SUA(posicao) : textos.RANKING_FORA] : [textos.RANKING_VAZIO];
  await new Lista(textos.TITULO_RANKING).texto(corpo.join("\n")).voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
async function menuRecordes(player, voltar) {
  await new Lista(textos.TITULO_RECORDES).texto(textos.RECORDES(lerRecordes())).voltar(voltar).abrir(player);
}

/**
 * Convite de quem pisou na área de espera.
 * @param {Player} player
 */
async function convidar(player) {
  await new Lista(textos.TITULO_CONVITE)
    .texto(textos.CONVITE)
    .botao(textos.BOTAO_ENTRAR, ICONES.spleef, (p) => entrarFila(p))
    .botao(textos.BOTAO_COMO, ICONES.lore, (p) => menuComoJogar(p, () => convidar(p)))
    .botao(textos.BOTAO_AGORA_NAO, ICONES.nao)
    .abrir(player);
}

/** Quem pisou na área de espera recebe o convite (uma vez por visita). */
function passoLobby() {
  const a = arena.lerArena();
  if (++passosLobby >= PASSOS_FAXINA_PLACAR) {
    passosLobby = 0;
    faxinaPlacar();
  }
  if (placarPendente) atualizarPlacar();
  const lobby = a.lobby;
  if (!lobby || !cfgSpleef().ligado || motivoArena()) {
    noLobby.clear();
    return;
  }
  /** @type {Set<string>} */
  const perto = new Set();
  for (const p of world.getDimension(lobby.d).getPlayers({ location: lobby, maxDistance: RAIO_LOBBY })) {
    const { x, y, z } = p.location;
    if (Math.hypot(x - lobby.x, y - lobby.y, z - lobby.z) > RAIO_LOBBY) continue;
    perto.add(p.id);
    if (noLobby.has(p.id)) continue;
    noLobby.add(p.id);
    if (!fila.includes(p.id) && !vivo(p.id)) rodarSeguro(p, "Spleef: convite", convidar);
  }
  for (const id of [...noLobby]) if (!perto.has(id)) noLobby.delete(id);
}

// ------------------------------------------------------------- reinício e /reload

/**
 * Partida que ficou "aberta" (servidor caiu ou /reload): encerra sem prêmios, tira todo mundo da torre e repõe a neve.
 * @param {any} aberta
 */
function recuperar(aberta) {
  const ids = Array.isArray(aberta?.jogadores) ? aberta.jogadores.filter((id) => typeof id === "string") : [];
  const emPe = Array.isArray(aberta?.vivos) ? aberta.vivos.filter((id) => typeof id === "string") : [];
  const a = arena.lerArena();
  for (const id of ids) {
    const p = porId(id);
    if (!p) {
      if (emPe.includes(id)) adicionarPendente(id);
      continue;
    }
    recolherItens(p, true);
    if (emPe.includes(id)) {
      mandarParaSaida(p, a);
      msg(p, textos.VOLTOU_FORA);
    }
  }
  avisarStaff(textos.AVISO_STAFF_RECARGA);
  partida = undefined;
  repor();
}

/**
 * Quem entra ou renasce: some com pá e bolas que sobraram e, se saiu no meio de uma partida, vai para a saída.
 * @param {Player} player
 */
function aoAparecer(player) {
  if (!player.isValid || vivo(player.id)) return;
  recolherItens(player, true);
  const pendentes = lerPendentes();
  if (!pendentes.includes(player.id)) return;
  salvarMundo(
    CHAVE_PENDENTES,
    pendentes.filter((id) => id !== player.id),
  );
  if (mandarParaSaidaSeNaTorre(player)) msg(player, textos.VOLTOU_FORA);
}

/**
 * Leva para a saída quem está dentro da torre (ou em cima da neve). Quem já saiu dela fica onde está.
 * @param {Player} player
 * @returns {boolean} se levou
 */
function mandarParaSaidaSeNaTorre(player) {
  const a = arena.lerArena();
  if (!arena.naZona(a, player.dimension.id, player.location)) return false;
  mandarParaSaida(player, a);
  return true;
}

// ------------------------------------------------------------- eventos

registrarBloqueioTeleporte((p) => (vivo(p.id) ? textos.TP_BLOQUEADO : undefined));

adicionarSecaoCaudas({
  titulo: textos.SECAO,
  botoes: [{ texto: () => textos.BOTAO_CAUDAS(fila.length, partidaRodando()), icone: ICONES.spleef, abrir: menuSpleef }],
});

// Quebrar com a mão do jogo: a neve das camadas vira ar pelo script (sem dropar bolas); o resto da torre não quebra.
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    const a = arena.lerArena();
    const { player, block } = ev;
    if (!arena.naZona(a, ev.dimension.id, block.location)) return;
    const j = vivo(player.id);
    if (j && fase === "jogando" && arena.ehBlocoCamada(a, block)) {
      ev.cancel = true;
      const dim = block.dimension;
      const pos = block.location;
      system.run(() => quebrar(dim.getBlock(pos), j));
      return;
    }
    if (podeEditar(player)) return;
    ev.cancel = true;
    system.run(() => {
      if (player.isValid && !emEspera(player)) player.onScreenDisplay.setActionBar(textos.PROTEGIDO);
    });
  } catch (e) {
    registrarErro("Spleef: proteção (quebrar)", e);
  }
});

// Bater na neve com a pá do Spleef quebra na hora.
world.afterEvents.entityHitBlock.subscribe(({ damagingEntity, hitBlock }) => {
  try {
    if (!(damagingEntity instanceof Player) || fase !== "jogando") return;
    const j = vivo(damagingEntity.id);
    if (j && segurandoPa(damagingEntity)) quebrar(hitBlock, j);
  } catch (e) {
    registrarErro("Spleef: bater na neve", e);
  }
});

// Bola de neve de quem joga quebra o bloco de camada que acertar.
world.afterEvents.projectileHitBlock.subscribe((ev) => {
  try {
    if (fase !== "jogando" || ev.projectile?.typeId !== BOLA || !(ev.source instanceof Player)) return;
    const j = vivo(ev.source.id);
    if (j) quebrar(ev.getBlockHit().block, j);
  } catch (e) {
    registrarErro("Spleef: bola de neve", e);
  }
});

// Colocar bloco, balde, isqueiro... na torre: só a staff no criativo, fora da partida. Quem joga não abre nada.
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    if (vivo(player.id)) {
      // Jogar a bola ou comer olhando para o chão também passa por aqui: só isso é liberado.
      if (!usoLivre(ev.itemStack)) ev.cancel = true;
      return;
    }
    if (!itemMexe(ev.itemStack) || podeEditar(player)) return;
    const a = arena.lerArena();
    const dim = block.dimension.id;
    if (arena.naZona(a, dim, block.location) || arena.naZona(a, dim, vizinho(block.location, ev.blockFace))) ev.cancel = true;
  } catch (e) {
    registrarErro("Spleef: proteção (interagir)", e);
  }
});

// Quem joga não entrega nada a bichos, suportes ou molduras (a pá não sai do inventário).
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (vivo(ev.player.id)) ev.cancel = true;
  } catch (e) {
    registrarErro("Spleef: interagir com entidade na partida", e);
  }
});

// Na partida, só a bola do Spleef e comida: nada de pérola, fruta do coro, foguete, balde, carga de vento...
world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    if (vivo(ev.source.id) && !usoLivre(ev.itemStack)) ev.cancel = true;
  } catch (e) {
    registrarErro("Spleef: usar item na partida", e);
  }
});

// Ninguém se machuca na partida (queda, lava, golpe). A bola de neve de outro jogador da partida empurra sem dano.
world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    const alvo = ev.hurtEntity;
    if (!(alvo instanceof Player) || !vivo(alvo.id)) return;
    const fonte = ev.damageSource;
    const atirador = fonte.damagingEntity;
    if (fonte.cause === EntityDamageCause.projectile && atirador instanceof Player && vivo(atirador.id)) {
      ev.damage = 0;
      return;
    }
    ev.cancel = true;
  } catch (e) {
    registrarErro("Spleef: dano na partida", e);
  }
});

// Explosão perto da torre não quebra parede nem neve (dentro ou fora da partida).
world.beforeEvents.explosion.subscribe((ev) => {
  try {
    const a = arena.lerArena();
    if (!a.temCentro || !a.camadas.length || ev.dimension.id !== a.d) return;
    const blocos = ev.getImpactedBlocks();
    const fora = blocos.filter((b) => !arena.naZona(a, a.d, b.location));
    if (fora.length !== blocos.length) ev.setImpactedBlocks(fora);
  } catch (e) {
    registrarErro("Spleef: proteção (explosão)", e);
  }
});

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  try {
    if (deadEntity instanceof Player && vivo(deadEntity.id)) eliminarVarios([[deadEntity.id, "morreu"]]);
  } catch (e) {
    registrarErro("Spleef: morte na partida", e);
  }
});

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  system.runTimeout(() => {
    if (player.isValid) rodarSeguro(player, "Spleef: entrar/renascer", aoAparecer);
  }, TICKS_DEPOIS_SPAWN);
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  try {
    noLobby.delete(playerId);
    const i = fila.indexOf(playerId);
    if (i >= 0) fila.splice(i, 1);
    if (vivo(playerId)) eliminarVarios([[playerId, "saiu"]]);
  } catch (e) {
    registrarErro("Spleef: saída do jogo", e);
  }
});

world.afterEvents.worldLoad.subscribe(() => {
  try {
    const a = arena.lerArena();
    if (a.temCentro) arena.garantirArea(a);
    const aberta = lerMundo(CHAVE_PARTIDA);
    if (aberta && typeof aberta === "object") recuperar(aberta);
  } catch (e) {
    registrarErro("Spleef: recuperar a partida aberta", e);
  }
  system.runInterval(() => {
    try {
      passoLobby();
    } catch (e) {
      registrarErro("Spleef: área de espera", e);
    }
  }, TICKS_LOBBY);
});
