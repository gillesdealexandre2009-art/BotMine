// @ts-check
// Capture the Flag nas guerras de clãs. Cada clã marca a bandeira num pedestal dentro da base
// (cla_terreno.marcarBandeira). Numa guerra ATIVA em que os dois lados tinham bandeira (guerra.ctf), quem já
// era do clã inimigo na declaração encosta na bandeira e pega; leva até a própria bandeira, que precisa estar
// em casa, e captura (+ctfCaptura). Caída: o dono devolve (+ctfDevolver), o inimigo pega de novo, ou ela volta
// sozinha em 30 s. Derrubar quem leva a sua bandeira vale +ctfMatarCarregador. O estado mora na guerra
// (ctf_estado.js, salvo a cada mudança); aqui ficam as regras, os avisos, os efeitos e a entidade
// vulpus:bandeira, que é só o visual: some e volta sem mexer no jogo (é refeita pelo estado).
// Desempenho: o toque (a cada 2 ticks), o feixe e a bandeira seguindo quem leva só rodam com guerra ativa
// com bandeiras; fora disso, só a conferência leve das entidades a cada 2 s.
import { EquipmentSlot, GameMode, Player, system, world } from "@minecraft/server";
import { config } from "../core/db.js";
import { anel, emitir, nuvem } from "../core/efeitos.js";
import { online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { cancelarEspera, registrarBloqueioTeleporte } from "../core/teleporte.js";
import { direcao, erro, msg, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/ctf.js";
import { PREFIXO } from "../textos/geral.js";
import { aoMudarCla, claDe, claPorId, CORES_CLA, ESTILOS_BANDEIRA, membroDe, problemaBandeira, tagPintada, todosClas } from "./cla_dados.js";
import { aoMudarGuerra, avisarClas, ladoDe, lerEstado, salvar } from "./cla_guerra.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").RGB} RGB */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {import("./cla_guerra.js").Guerra} Guerra */
/** @typedef {import("./cla_guerra.js").Lado} Lado */
/** @typedef {import("./ctf_estado.js").Ponto} Ponto */
/** @typedef {import("./ctf_estado.js").EstadoBandeira} EstadoBandeira */
/** @typedef {Guerra & { ctf: import("./ctf_estado.js").Ctf }} GuerraCtf */
/** @typedef {import("../textos/ctf.js").MotivoQueda} MotivoQueda */

/**
 * Resumo de uma bandeira para a sidebar.
 * @typedef {{ estado: "casa" | "recarga" | "roubada" | "caida", quem?: string, segundos?: number }} ResumoBandeira
 */
/**
 * @typedef {object} InfoCtf
 * @property {ResumoBandeira} nossa
 * @property {ResumoBandeira & { tag: string, distancia: number, direcao: string, longe: boolean, levando: boolean }} deles
 *   distância e direção até a bandeira inimiga, ou até a própria se quem vê está levando a inimiga (levando);
 *   longe = o alvo está em outra dimensão
 */

export const TIPO_BANDEIRA = "vulpus:bandeira";
/** Tag de entidade com o id do clã dono da bandeira (vulpus:bandeira:<id>). */
const TAG_CLA = "vulpus:bandeira:";
/**
 * Propriedades da entidade (BP entities/bandeira.json): cor (índice em CORES_CLA; o RP lê), estilo Kitsune
 * (índice em ESTILOS_BANDEIRA + 1; 0 = padrão; o RP troca pano, enfeites e animação) e mini (quem leva).
 */
const PROP_COR = "vulpus:cor";
const PROP_ESTILO = "vulpus:estilo";
const PROP_MINI = "vulpus:mini";
/** Eventos da entidade: encolhe (segue a cabeça de quem leva) e volta ao tamanho normal. */
const EVENTO_MINI = "vulpus:mini";
const EVENTO_NORMAL = "vulpus:normal";
/** @type {readonly Lado[]} */
const LADOS = Object.freeze(["a", "b"]);

/** Encostar: até 1,5 bloco na horizontal, com os pés de 1,5 abaixo a 3 acima da base da bandeira. */
const RAIO_TOQUE = 1.5;
const ABAIXO_TOQUE = 1.5;
const ACIMA_TOQUE = 3;
const TICKS_TOQUE = 2;
const TICKS_VISUAL = 10;
const TICKS_CUIDADO = 20;
const TICKS_SINCRONIA = 40;
/** Aura das bandeiras Kitsune: a cada meio segundo (fora do tick do feixe), só com alguém a até RAIO_AURA blocos. */
const TICKS_AURA = 10;
const RAIO_AURA = 48;
/** No máximo tantas bandeiras com aura por vez (cada uma solta de 2 a 4 partículas). */
const MAX_AURAS = 12;
/** Depois de capturada, a bandeira fica 2 min no pedestal sem poder ser pega. */
export const RECARGA_CAPTURA_MS = 2 * 60 * 1000;
/** Caída e sem ninguém encostar, volta sozinha em 30 s. */
export const VOLTA_SOZINHA_MS = 30 * 1000;
/** Mais que isto entre duas conferências (2 ticks) = teleporte: a bandeira cai onde a pessoa estava. */
const SALTO_MAXIMO = 16;
/** Quanto a bandeira cai procurando o chão antes de ficar onde está. */
const QUEDA_MAXIMA = 64;
/** Altura da bandeira pequena sobre a cabeça de quem leva. */
const SOBRE_CABECA = 0.45;
/** Lentidão leve de quem leva (renovada a cada segundo). */
const TICKS_LENTIDAO = 50;
const ALTURA_FEIXE = 24;
const ALTURA_FEIXE_CAIDA = 14;
const TICKS_ENTRE_AVISOS = 40;
/** Itens que levariam a bandeira longe demais (cancelados enquanto alguém leva). */
const ITENS_PROIBIDOS = new Set(["minecraft:ender_pearl", "minecraft:chorus_fruit", "minecraft:firework_rocket", "minecraft:elytra"]);

const P = Object.freeze({
  CHAMA: "minecraft:colored_flame_particle",
  FAISCA: "minecraft:endrod",
  FUMACA: "minecraft:white_smoke_particle",
  TOTEM: "minecraft:totem_particle",
  SAKURA: "minecraft:cherry_leaves_particle",
  ALMA: "minecraft:soul_particle",
  CHAMA_AZUL: "minecraft:blue_flame_particle",
  FOGO: "minecraft:basic_flame_particle",
  LAVA: "minecraft:lava_particle",
  DRAGAO: "minecraft:dragon_breath_trail",
  PORTAL: "minecraft:basic_portal_particle",
});
const SOM = Object.freeze({
  pegou: "beacon.deactivate",
  caiu: "note.bell",
  devolveu: "beacon.activate",
  voltou: "beacon.power",
  captura: "firework.large_blast",
  fogos: ["firework.launch", "firework.twinkle"],
  derrubou: "item.trident.return",
  carregador: "random.levelup",
});

/** Cor de cada código de clã (CORES_CLA) para as partículas. @type {Readonly<Record<string, RGB>>} */
const RGB_COR = Object.freeze({
  6: { red: 1, green: 0.67, blue: 0 },
  e: { red: 1, green: 1, blue: 0.33 },
  a: { red: 0.33, green: 1, blue: 0.33 },
  b: { red: 0.33, green: 1, blue: 1 },
  c: { red: 1, green: 0.33, blue: 0.33 },
  d: { red: 1, green: 0.33, blue: 1 },
  9: { red: 0.33, green: 0.33, blue: 1 },
  5: { red: 0.67, green: 0, blue: 0.67 },
  3: { red: 0, green: 0.67, blue: 0.67 },
  2: { red: 0, green: 0.67, blue: 0 },
  f: { red: 1, green: 1, blue: 1 },
  g: { red: 0.87, green: 0.84, blue: 0.02 },
});

/** @type {Map<string, { guerra: string, lado: Lado, ultimo: Ponto }>} quem leva → a bandeira (lado do dono) e onde estava */
const carregadores = new Map();
/** @type {Map<string, Entity>} id do clã → entidade da bandeira */
const entidades = new Map();
/** @type {Map<string, number>} id → tick do último aviso na actionbar */
const ultimosAvisos = new Map();
/** Erros de loop já registrados (o log avisa uma vez por contexto). */
const jaAvisou = new Set();
let sincroniaMarcada = false;

// ---------------------------------------------------------------- peças

/** Guerras ativas com bandeiras. @returns {GuerraCtf[]} */
function guerrasCtf() {
  return /** @type {GuerraCtf[]} */ (lerEstado().guerras.filter((g) => g.estado === "ativa" && g.ctf));
}

/** @param {string} id */
const guerraPorId = (id) => guerrasCtf().find((g) => g.id === id);
/** @param {Lado} lado @returns {Lado} */
const outro = (lado) => (lado === "a" ? "b" : "a");
/** Meio do bloco do pedestal. @param {Ponto} p @returns {Ponto} */
const centro = (p) => ({ x: p.x + 0.5, y: p.y, z: p.z + 0.5, d: p.d });
/** @param {Player} p @returns {Ponto} */
const pontoDe = (p) => ({ x: p.location.x, y: p.location.y, z: p.location.z, d: p.dimension.id });
/** @param {string} id */
const porId = (id) => online().find((p) => p.id === id);
/** @param {string} cor */
const rgbDe = (cor) => RGB_COR[cor] ?? RGB_COR[6];

/**
 * Registra um erro de loop só na primeira vez.
 * @param {string} contexto
 * @param {unknown} e
 */
function avisarUmaVez(contexto, e) {
  if (jaAvisou.has(contexto)) return;
  jaAvisou.add(contexto);
  registrarErro(contexto, e);
}

/**
 * Aviso curto na actionbar, no máximo 1 a cada 2 s por pessoa.
 * @param {Player} player
 * @param {string} texto
 */
function barra(player, texto) {
  const agora = system.currentTick;
  if (agora - (ultimosAvisos.get(player.id) ?? -Infinity) < TICKS_ENTRE_AVISOS) return;
  ultimosAvisos.set(player.id, agora);
  player.onScreenDisplay.setActionBar(texto);
}

/**
 * Encostou na bandeira: mesma dimensão, perto na horizontal e na altura dela.
 * @param {Player} player
 * @param {Ponto} ponto  base da bandeira
 */
function encostou(player, ponto) {
  if (player.dimension.id !== ponto.d) return false;
  const { x, y, z } = player.location;
  const dy = y - ponto.y;
  return dy >= -ABAIXO_TOQUE && dy <= ACIMA_TOQUE && Math.hypot(x - ponto.x, z - ponto.z) <= RAIO_TOQUE;
}

/**
 * Vivo e jogando (morto na tela de morte e espectador não encostam).
 * @param {Player} player
 */
function ativo(player) {
  try {
    if (player.getGameMode() === GameMode.Spectator) return false;
    const vida = player.getComponent("minecraft:health");
    return !vida || vida.currentValue > 0;
  } catch {
    return false;
  }
}

/**
 * Já era do clã quando a guerra foi declarada (a mesma regra dos abates).
 * @param {Cla} cla
 * @param {string} id
 * @param {Guerra} g
 */
const veterano = (cla, id, g) => (membroDe(cla, id)?.desde ?? Infinity) <= g.declarada;

/**
 * Onde a bandeira está agora: no pedestal, no chão ou com quem leva.
 * @param {EstadoBandeira} b
 * @returns {Ponto}
 */
export function ondeEsta(b) {
  if (b.estado === "caida" && b.chao) return b.chao;
  if (b.estado === "roubada") {
    const c = carregadores.get(b.por);
    if (c) return c.ultimo;
  }
  return centro(b.pos);
}

/**
 * Se a pessoa está levando uma bandeira agora.
 * @param {Player | string} alvo
 */
export function carregando(alvo) {
  return carregadores.has(typeof alvo === "string" ? alvo : alvo.id);
}

/**
 * Chão embaixo de onde a bandeira caiu. null = vazio, lava ou fora do mundo (volta na hora para o pedestal).
 * Num chunk que não carregou, ela fica onde caiu.
 * @param {Ponto} onde
 * @returns {Ponto | null}
 */
function acharChao(onde) {
  /** @type {Dimension} */
  let dim;
  try {
    dim = world.getDimension(onde.d);
  } catch {
    return null;
  }
  const { min, max } = dim.heightRange;
  if (![onde.x, onde.y, onde.z].every(Number.isFinite) || onde.y < min) return null;
  const x = Math.floor(onde.x);
  const z = Math.floor(onde.z);
  let y = Math.min(Math.floor(onde.y), max - 1);
  for (let i = 0; i <= QUEDA_MAXIMA && y >= min; i++, y--) {
    let bloco;
    try {
      bloco = dim.getBlock({ x, y, z });
    } catch {
      bloco = undefined;
    }
    if (!bloco) return { ...onde };
    if (bloco.typeId.includes("lava")) return null;
    if (!bloco.isAir) return { x: x + 0.5, y: i === 0 ? Math.max(y, onde.y) : y + 1, z: z + 0.5, d: onde.d };
  }
  return y < min ? null : { ...onde };
}

// ---------------------------------------------------------------- regras

/**
 * Pega a bandeira do lado `lado` (quem pega é do outro lado).
 * @param {GuerraCtf} g
 * @param {Lado} lado
 * @param {Player} player
 */
function pegar(g, lado, player) {
  if (!tirarElytra(player)) {
    barra(player, textos.TIRE_ELYTRA);
    return;
  }
  const b = g.ctf[lado];
  b.estado = "roubada";
  b.por = player.id;
  b.porNome = player.name;
  b.chao = null;
  b.desde = Date.now();
  carregadores.set(player.id, { guerra: g.id, lado, ultimo: pontoDe(player) });
  salvar();
  cancelarEspera(player, textos.TP_BLOQUEADO);
  avisarClas([g.a, g.b], textos.PEGOU(g, lado, player.name), SOM.pegou);
  mostrarTitulo(player, textos.TITULO_PEGOU, { subtitulo: textos.SUBTITULO_PEGOU(g, outro(lado)), entrada: 4, fica: 40, saida: 10 });
  cuidar(player);
  ajustarEntidade(g[lado], { ponto: pontoDe(player), mini: true });
}

/**
 * A bandeira volta ao pedestal (sem aviso: quem chama avisa e salva).
 * @param {GuerraCtf} g
 * @param {Lado} lado
 * @param {number} [recarga]  ms até quando não pode ser pega
 */
function voltar(g, lado, recarga = 0) {
  const b = g.ctf[lado];
  if (b.por && carregadores.get(b.por)?.guerra === g.id) carregadores.delete(b.por);
  b.estado = "casa";
  b.por = "";
  b.porNome = "";
  b.chao = null;
  b.desde = Date.now();
  if (recarga) b.recarga = recarga;
  pedirSincronia();
}

/**
 * Quem levava perdeu a bandeira: ela cai no chão (ou volta, se caiu no vazio ou na lava).
 * @param {GuerraCtf} g
 * @param {Lado} lado
 * @param {MotivoQueda} motivo
 * @param {Ponto} onde
 */
function soltar(g, lado, motivo, onde) {
  const b = g.ctf[lado];
  if (b.estado !== "roubada") return;
  const nome = b.porNome;
  carregadores.delete(b.por);
  const chao = acharChao(onde);
  if (!chao) {
    voltar(g, lado);
    salvar();
    avisarClas([g.a, g.b], textos.VOLTOU_ABISMO(g, lado), SOM.voltou);
    return;
  }
  b.estado = "caida";
  b.por = "";
  b.chao = chao;
  b.desde = Date.now();
  salvar();
  avisarClas([g.a, g.b], textos.CAIU(g, lado, nome, motivo, VOLTA_SOZINHA_MS / 1000), SOM.caiu);
  pedirSincronia();
}

/**
 * Alguém do clã dono encostou na própria bandeira caída: volta ao pedestal e rende ctfDevolver.
 * @param {GuerraCtf} g
 * @param {Lado} lado
 * @param {Player} player
 */
function devolver(g, lado, player) {
  const n = Math.max(0, Math.floor(config().ctfDevolver));
  voltar(g, lado);
  g.pontos[lado] += n;
  salvar();
  avisarClas([g.a, g.b], textos.DEVOLVEU(g, lado, player.name, n), SOM.devolveu);
  const dim = player.dimension;
  anel(dim, centro(g.ctf[lado].pos), { raio: 0.8, n: 10, y: 0.2 }, P.CHAMA, [rgbDe(corDe(g, lado))]);
}

/**
 * Quem leva a bandeira inimiga encostou na própria bandeira em casa: captura.
 * @param {GuerraCtf} g
 * @param {Lado} meu  lado de quem capturou
 * @param {Player} player
 */
function capturar(g, meu, player) {
  const lado = outro(meu);
  const n = Math.max(0, Math.floor(config().ctfCaptura));
  voltar(g, lado, Date.now() + RECARGA_CAPTURA_MS);
  g.pontos[meu] += n;
  g.ctf.capturas[meu]++;
  salvar();
  avisarClas([g.a, g.b], textos.CAPTUROU(g, meu, player.name, n), SOM.captura);
  const global = PREFIXO + textos.CAPTURA_GLOBAL(g, meu, player.name);
  for (const p of online()) {
    const cla = claDe(p);
    if (cla?.id !== g.a && cla?.id !== g.b) p.sendMessage(global);
  }
  mostrarTitulo(player, textos.TITULO_CAPTURA, { subtitulo: textos.SUBTITULO_CAPTURA(n) });
  som(player, SOM.carregador);
  fogos(player.dimension, centro(g.ctf[meu].pos), rgbDe(corDe(g, meu)), g);
}

/**
 * Morte de quem levava: a bandeira cai ali; se quem derrubou é do clã dono, rende ctfMatarCarregador
 * (por evento, sem o anti-farm dos abates; o abate normal conta à parte em cla_guerra.js).
 * @param {Player} vitima
 * @param {Player | undefined} matador
 */
function aoMorrer(vitima, matador) {
  const c = carregadores.get(vitima.id);
  if (!c) return;
  const g = guerraPorId(c.guerra);
  if (!g) {
    carregadores.delete(vitima.id);
    return;
  }
  const claM = matador && matador.id !== vitima.id ? claDe(matador) : undefined;
  if (matador && claM && claM.id === g[c.lado] && veterano(claM, matador.id, g)) {
    const n = Math.max(0, Math.floor(config().ctfMatarCarregador));
    g.pontos[c.lado] += n;
    avisarClas([g.a, g.b], textos.DERRUBOU_CARREGADOR(g, c.lado, matador.name, vitima.name, n), SOM.derrubou);
  }
  soltar(g, c.lado, "morreu", pontoDe(vitima));
}

/**
 * Tira a elytra do peito para o inventário (com bandeira não plana). false = não tinha onde guardar.
 * @param {Player} player
 */
function tirarElytra(player) {
  try {
    const equip = player.getComponent("minecraft:equippable");
    const peito = equip?.getEquipment(EquipmentSlot.Chest);
    if (!equip || peito?.typeId !== "minecraft:elytra") return true;
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv || inv.emptySlotsCount === 0) return false;
    equip.setEquipment(EquipmentSlot.Chest, undefined);
    const sobra = inv.addItem(peito);
    if (sobra) {
      equip.setEquipment(EquipmentSlot.Chest, sobra);
      return false;
    }
    msg(player, textos.ELYTRA_GUARDADA);
    return true;
  } catch (e) {
    avisarUmaVez("Bandeira: elytra", e);
    return true;
  }
}

/**
 * Lentidão leve em quem leva (renovada a cada segundo; some sozinha depois).
 * @param {Player} player
 */
function cuidar(player) {
  try {
    player.addEffect("slowness", TICKS_LENTIDAO, { amplifier: 0, showParticles: false });
  } catch (e) {
    avisarUmaVez("Bandeira: lentidão", e);
  }
}

/** @param {Guerra} g @param {Lado} lado */
const corDe = (g, lado) => claPorId(g[lado])?.cor ?? g.cores[lado];

// ---------------------------------------------------------------- ciclos

/** Toque nas bandeiras e o estado de cada uma (a cada 2 ticks, só com guerra de bandeiras). */
function cicloToque() {
  const guerras = guerrasCtf();
  if (!guerras.length) {
    carregadores.clear();
    return;
  }
  const agora = Date.now();
  const jogadores = online();
  for (const g of guerras) {
    for (const lado of LADOS) conferir(g, lado, jogadores, agora);
    for (const p of jogadores) toque(g, p, agora);
  }
}

/**
 * Bandeira caída que passou do tempo volta; quem leva e sumiu, trocou de dimensão ou teleportou perde.
 * @param {GuerraCtf} g
 * @param {Lado} lado
 * @param {Player[]} jogadores
 * @param {number} agora
 */
function conferir(g, lado, jogadores, agora) {
  const b = g.ctf[lado];
  if (b.estado === "caida") {
    if (agora - b.desde < VOLTA_SOZINHA_MS) return;
    voltar(g, lado);
    salvar();
    avisarClas([g.a, g.b], textos.VOLTOU_SOZINHA(g, lado), SOM.voltou);
    return;
  }
  if (b.estado !== "roubada") return;
  const c = carregadores.get(b.por);
  const p = jogadores.find((x) => x.id === b.por);
  if (!c || !p) {
    soltar(g, lado, "saiu", c?.ultimo ?? centro(b.pos));
    return;
  }
  if (p.dimension.id !== b.pos.d) {
    soltar(g, lado, "dimensao", c.ultimo);
    return;
  }
  const { x, y, z } = p.location;
  if (Math.hypot(x - c.ultimo.x, y - c.ultimo.y, z - c.ultimo.z) > SALTO_MAXIMO) {
    soltar(g, lado, "salto", c.ultimo);
    return;
  }
  c.ultimo = pontoDe(p);
}

/**
 * O que acontece quando alguém de um dos clãs encosta numa bandeira.
 * @param {GuerraCtf} g
 * @param {Player} p
 * @param {number} agora
 */
function toque(g, p, agora) {
  const cla = claDe(p);
  const meu = cla ? ladoDe(g, cla.id) : undefined;
  if (!cla || !meu) return;
  const minha = g.ctf[meu];
  const deles = g.ctf[outro(meu)];
  if (carregadores.get(p.id)?.guerra === g.id) {
    if (minha.estado === "casa" && encostou(p, centro(minha.pos)) && ativo(p)) capturar(g, meu, p);
    else if (minha.estado === "caida" && minha.chao && encostou(p, minha.chao) && ativo(p)) devolver(g, meu, p);
    return;
  }
  const naMinha = minha.estado === "caida" && !!minha.chao && encostou(p, minha.chao);
  const naDeles = deles.estado === "casa" ? encostou(p, centro(deles.pos)) : deles.estado === "caida" && !!deles.chao && encostou(p, deles.chao);
  if ((!naMinha && !naDeles) || !ativo(p)) return;
  if (!veterano(cla, p.id, g)) {
    barra(p, textos.NOVATO_BARRA);
    return;
  }
  if (naMinha) {
    devolver(g, meu, p);
    return;
  }
  if (deles.estado === "casa" && agora < deles.recarga) {
    barra(p, textos.RECARGA_BARRA(Math.ceil((deles.recarga - agora) / 1000)));
    return;
  }
  pegar(g, outro(meu), p);
}

/** A bandeira pequena segue a cabeça de quem leva (todo tick, só com alguém levando). */
function seguir() {
  if (!carregadores.size) return;
  for (const [id, c] of carregadores) {
    const g = guerraPorId(c.guerra);
    const ent = g ? entidades.get(g[c.lado]) : undefined;
    const p = ent?.isValid ? porId(id) : undefined;
    if (!ent || !p) continue;
    try {
      const cabeca = p.getHeadLocation();
      ent.teleport({ x: cabeca.x, y: cabeca.y + SOBRE_CABECA, z: cabeca.z }, { dimension: p.dimension });
    } catch (e) {
      avisarUmaVez("Bandeira seguindo", e);
    }
  }
}

/** Lentidão e elytra de quem leva (a cada segundo). */
function cuidarDosCarregadores() {
  for (const [id, c] of [...carregadores]) {
    const p = porId(id);
    if (!p) continue;
    cuidar(p);
    if (tirarElytra(p)) continue;
    const g = guerraPorId(c.guerra);
    if (g) soltar(g, c.lado, "elytra", pontoDe(p));
  }
}

/** Feixe de cada bandeira, fantasma no pedestal vazio e o brilho em volta de quem leva. */
function cicloVisual() {
  for (const g of guerrasCtf()) {
    for (const lado of LADOS) {
      const b = g.ctf[lado];
      const cor = rgbDe(corDe(g, lado));
      /** @type {Dimension} */
      let dim;
      try {
        dim = world.getDimension(b.pos.d);
      } catch {
        continue;
      }
      const casa = centro(b.pos);
      if (b.estado === "casa") feixe(dim, casa, cor, ALTURA_FEIXE, Date.now() < b.recarga);
      else nuvem(dim, casa, { n: 4, largura: 0.15, y0: 0.3, alto: 2.8 }, P.FUMACA);
      if (b.estado === "caida" && b.chao) feixe(dim, b.chao, cor, ALTURA_FEIXE_CAIDA, false);
      if (b.estado === "roubada") {
        const p = porId(b.por);
        if (p) anel(p.dimension, p.location, { raio: 0.7, n: 6, y: 1, giro: system.currentTick * 0.2 }, P.CHAMA, [cor]);
      }
    }
  }
}

/**
 * Coluna de partículas subindo da bandeira (o "farol"); em recarga, fumaça em vez da cor.
 * @param {Dimension} dim
 * @param {Vector3} c
 * @param {RGB} cor
 * @param {number} altura
 * @param {boolean} recarga
 */
function feixe(dim, c, cor, altura, recarga) {
  for (let y = 3.4; y <= 3.4 + altura; y += 1.5) {
    if (!emitir(dim, recarga ? P.FUMACA : P.CHAMA, { x: c.x, y: c.y + y, z: c.z }, recarga ? undefined : cor)) return;
  }
  emitir(dim, P.FAISCA, { x: c.x, y: c.y + 3.6 + altura, z: c.z });
}

/**
 * Fogos da captura no pedestal de quem capturou: anel na cor do clã, totem subindo e o som para os dois clãs.
 * @param {Dimension} dim
 * @param {Vector3} c
 * @param {RGB} cor
 * @param {Guerra} g
 */
function fogos(dim, c, cor, g) {
  if (anel(dim, c, { raio: 1.6, n: 16, y: 0.2 }, P.CHAMA, [cor])) {
    if (nuvem(dim, c, { n: 18, largura: 0.6, y0: 1, alto: 3 }, P.TOTEM)) anel(dim, c, { raio: 0.9, n: 8, y: 3.4 }, P.FAISCA);
  }
  for (const p of online()) {
    const cla = claDe(p);
    if (cla?.id === g.a || cla?.id === g.b) for (const id of SOM.fogos) som(p, id);
  }
}

// ---------------------------------------------------------------- entidades (visual)

/**
 * Onde a entidade de cada clã deve estar. Fora de guerra: no pedestal (se a bandeira vale). Na guerra:
 * no pedestal, no chão ou com quem leva (mini).
 * @returns {Map<string, { ponto: Ponto, mini: boolean }>}
 */
function alvosDasEntidades() {
  /** @type {Map<string, { ponto: Ponto, mini: boolean }>} */
  const alvos = new Map();
  for (const cla of todosClas()) if (cla.bandeira && !problemaBandeira(cla)) alvos.set(cla.id, { ponto: centro(cla.bandeira), mini: false });
  for (const g of guerrasCtf()) {
    for (const lado of LADOS) {
      if (!claPorId(g[lado])) continue;
      const b = g.ctf[lado];
      alvos.set(g[lado], { ponto: ondeEsta(b), mini: b.estado === "roubada" && carregadores.has(b.por) });
    }
  }
  return alvos;
}

/** @param {Entity} e @returns {string | undefined} id do clã guardado na tag */
function claIdDe(e) {
  try {
    return e.getTags().find((t) => t.startsWith(TAG_CLA))?.slice(TAG_CLA.length);
  } catch {
    return undefined;
  }
}

/** @param {Entity} e */
function removerEntidade(e) {
  try {
    if (e.isValid) e.remove();
  } catch (err) {
    avisarUmaVez("Bandeira: remover entidade", err);
  }
}

/**
 * Cria (se o chunk estiver carregado), move e pinta a entidade da bandeira de um clã.
 * @param {string} claId
 * @param {{ ponto: Ponto, mini: boolean }} alvo
 */
function ajustarEntidade(claId, alvo) {
  const cla = claPorId(claId);
  if (!cla) return;
  try {
    const dim = world.getDimension(alvo.ponto.d);
    let e = entidades.get(claId);
    if (!e?.isValid) {
      if (!dim.isChunkLoaded(alvo.ponto)) return;
      e = dim.spawnEntity(TIPO_BANDEIRA, alvo.ponto, { initialPersistence: true });
      e.addTag(TAG_CLA + claId);
      entidades.set(claId, e);
    }
    const { x, y, z } = e.location;
    if (!alvo.mini && (e.dimension.id !== alvo.ponto.d || Math.hypot(x - alvo.ponto.x, y - alvo.ponto.y, z - alvo.ponto.z) > 0.3)) {
      e.teleport({ x: alvo.ponto.x, y: alvo.ponto.y, z: alvo.ponto.z }, { dimension: dim });
    }
    const cor = Math.max(0, CORES_CLA.indexOf(cla.cor));
    if (e.getProperty(PROP_COR) !== cor) e.setProperty(PROP_COR, cor);
    const estilo = estiloDe(cla);
    if (e.getProperty(PROP_ESTILO) !== estilo) e.setProperty(PROP_ESTILO, estilo);
    if (e.getProperty(PROP_MINI) !== alvo.mini) {
      e.setProperty(PROP_MINI, alvo.mini);
      e.triggerEvent(alvo.mini ? EVENTO_MINI : EVENTO_NORMAL);
    }
    const nome = alvo.mini ? "" : textos.NOME_ENTIDADE(tagPintada(cla));
    if (e.nameTag !== nome) e.nameTag = nome;
  } catch (err) {
    avisarUmaVez("Bandeira: entidade", err);
  }
}

/**
 * Confere as entidades: adota as que já existem (depois de /reload), tira repetidas e as de clã sem bandeira,
 * cria as que faltam e põe cada uma no lugar.
 */
function sincronizar() {
  const alvos = alvosDasEntidades();
  const dimensoes = new Set(["minecraft:overworld", ...[...alvos.values()].map((a) => a.ponto.d)]);
  for (const d of dimensoes) {
    /** @type {Entity[]} */
    let lista;
    try {
      lista = world.getDimension(d).getEntities({ type: TIPO_BANDEIRA });
    } catch {
      continue;
    }
    for (const e of lista) {
      const claId = claIdDe(e);
      const atual = claId ? entidades.get(claId) : undefined;
      if (!claId || !alvos.has(claId) || (atual?.isValid && atual.id !== e.id)) removerEntidade(e);
      else entidades.set(claId, e);
    }
  }
  for (const [claId, e] of [...entidades]) {
    if (alvos.has(claId) && e.isValid) continue;
    if (!alvos.has(claId)) removerEntidade(e);
    entidades.delete(claId);
  }
  for (const [claId, alvo] of alvos) ajustarEntidade(claId, alvo);
}

/** Confere as entidades no próximo tick (uma vez, mesmo com vários pedidos). */
function pedirSincronia() {
  if (sincroniaMarcada) return;
  sincroniaMarcada = true;
  system.run(() => {
    sincroniaMarcada = false;
    rodar("Bandeiras: entidades", sincronizar);
  });
}

/**
 * @param {string} contexto
 * @param {() => void} fn
 */
function rodar(contexto, fn) {
  try {
    fn();
  } catch (e) {
    avisarUmaVez(contexto, e);
  }
}

// ---------------------------------------------------------------- aura das bandeiras Kitsune

/** Valor da propriedade vulpus:estilo do clã (0 = bandeira padrão). @param {Cla} cla */
export const estiloDe = (cla) => (cla.estiloBandeira ? ESTILOS_BANDEIRA.indexOf(cla.estiloBandeira) + 1 : 0);

/** @param {number} r @param {number} g @param {number} b @returns {RGB} */
const rgb = (r, g, b) => ({ red: r, green: g, blue: b });
const COR_AURA = Object.freeze({
  laranja: rgb(1, 0.55, 0.15),
  creme: rgb(1, 0.92, 0.8),
  rosa: rgb(1, 0.6, 0.75),
  prata: rgb(0.78, 0.82, 1),
  azul: rgb(0.35, 0.7, 1),
  ouro: rgb(1, 0.82, 0.3),
  branco: rgb(1, 1, 1),
  violeta: rgb(0.45, 0.15, 0.7),
});
/**
 * Ponto num círculo em volta do mastro.
 * @param {Vector3} c
 * @param {number} ang
 * @param {number} raio
 * @param {number} y
 * @returns {Vector3}
 */
const roda = (c, ang, raio, y) => ({ x: c.x + Math.cos(ang) * raio, y: c.y + y, z: c.z + Math.sin(ang) * raio });
/**
 * Ponto ao acaso perto do mastro.
 * @param {Vector3} c
 * @param {number} raio
 * @param {number} y0
 * @param {number} alto
 */
const acaso = (c, raio, y0, alto) => roda(c, Math.random() * Math.PI * 2, Math.random() * raio, y0 + Math.random() * alto);

/**
 * Receita de cada estilo (n = número da rodada, sobe a cada TICKS_AURA). Leve: de 2 a 4 partículas por rodada.
 * @type {Record<string, (dim: Dimension, c: Vector3, n: number) => void>}
 */
const AURAS = {
  // Nove caudas de chama girando em volta (3 por rodada, revezando).
  caudas: (dim, c, n) => {
    for (let i = n % 3; i < 9; i += 3) {
      const ang = n * 0.35 + (i * Math.PI * 2) / 9;
      emitir(dim, P.CHAMA, roda(c, ang, 1.1, 2.2 + Math.sin(ang * 2) * 0.3), i % 2 ? COR_AURA.creme : COR_AURA.laranja);
    }
  },
  // Pétalas caindo de cima e um brilho rosa.
  sakura: (dim, c) => {
    emitir(dim, P.SAKURA, acaso(c, 1.3, 3.2, 0.6));
    emitir(dim, P.SAKURA, acaso(c, 1.3, 3.2, 0.6));
    emitir(dim, P.CHAMA, acaso(c, 1, 1.6, 1.4), COR_AURA.rosa);
  },
  // Faíscas prateadas em órbita e uma no topo, perto da lua.
  lunar: (dim, c, n) => {
    emitir(dim, P.FAISCA, roda(c, n * 0.5, 1, 2.6));
    emitir(dim, P.CHAMA, acaso(c, 1.2, 1.4, 1.8), COR_AURA.prata);
    if (n % 2 === 0) emitir(dim, P.FAISCA, { x: c.x, y: c.y + 3.9, z: c.z });
  },
  // Fogo-fátuo azul: duas chamas azuis em órbita e uma alma subindo.
  espirito: (dim, c, n) => {
    emitir(dim, P.CHAMA_AZUL, roda(c, n * 0.6, 0.9, 1.4 + Math.sin(n * 0.4) * 0.6));
    emitir(dim, P.CHAMA_AZUL, roda(c, n * 0.6 + Math.PI, 0.9, 2.2 + Math.cos(n * 0.4) * 0.6));
    if (n % 2 === 0) emitir(dim, P.ALMA, acaso(c, 0.8, 0.6, 2), COR_AURA.azul);
  },
  // Chamas na base e, de vez em quando, uma brasa pulando.
  brasa: (dim, c, n) => {
    emitir(dim, P.FOGO, roda(c, n * 0.9, 0.45, 0.15));
    emitir(dim, P.FOGO, roda(c, n * 0.9 + Math.PI, 0.45, 0.15));
    if (n % 4 === 0) emitir(dim, P.LAVA, { x: c.x, y: c.y + 1.2, z: c.z });
  },
  // Faixa de luz no alto que muda de cor (verde, azul, violeta).
  aurora: (dim, c, n) => {
    for (let i = 0; i < 3; i++) {
      const h = ((n * 0.03 + i * 0.08) % 1) * Math.PI * 2;
      const cor = rgb(0.3 + 0.5 * Math.max(0, Math.sin(h + 2)), 0.6 + 0.4 * Math.sin(h), 0.7 + 0.3 * Math.cos(h));
      emitir(dim, P.CHAMA, roda(c, n * 0.25 + i * 0.7, 1.2, 3.5 + Math.sin(n * 0.3 + i) * 0.2), cor);
    }
  },
  // Estrelas piscando em volta e uma faísca no alto.
  estelar: (dim, c, n) => {
    emitir(dim, P.CHAMA, acaso(c, 1.5, 1.2, 2.4), COR_AURA.ouro);
    emitir(dim, P.CHAMA, acaso(c, 1.5, 1.2, 2.4), COR_AURA.branco);
    if (n % 3 === 0) emitir(dim, P.FAISCA, acaso(c, 0.6, 3.6, 0.4));
  },
  // Fumaça roxa escura rodando embaixo e um fiapo de portal.
  sombra: (dim, c, n) => {
    emitir(dim, P.CHAMA, roda(c, n * 0.4, 0.8, 0.4 + (n % 5) * 0.4), COR_AURA.violeta);
    emitir(dim, P.DRAGAO, acaso(c, 0.9, 0.2, 0.6));
    if (n % 2 === 0) emitir(dim, P.PORTAL, acaso(c, 0.9, 1, 2));
  },
};

let rodadaAura = 0;

/** Aura de cada bandeira Kitsune parada (no pedestal ou no chão) com alguém por perto. */
function cicloAura() {
  rodadaAura++;
  const jogadores = online();
  let feitas = 0;
  for (const [claId, e] of entidades) {
    if (feitas >= MAX_AURAS) return;
    const cla = claPorId(claId);
    const receita = cla?.estiloBandeira ? AURAS[cla.estiloBandeira] : undefined;
    if (!receita || !e.isValid || e.getProperty(PROP_MINI) === true) continue;
    const c = e.location;
    const d = e.dimension.id;
    const perto = jogadores.some((p) => p.dimension.id === d && Math.hypot(p.location.x - c.x, p.location.y - c.y, p.location.z - c.z) <= RAIO_AURA);
    if (!perto) continue;
    feitas++;
    receita(e.dimension, c, rodadaAura);
  }
}

// ---------------------------------------------------------------- sidebar e menus

/**
 * Situação de uma bandeira para a sidebar.
 * @param {EstadoBandeira} b
 * @param {number} agora
 * @returns {ResumoBandeira}
 */
function resumo(b, agora) {
  if (b.estado === "roubada") return { estado: "roubada", quem: b.porNome };
  if (b.estado === "caida") return { estado: "caida", segundos: Math.max(0, Math.ceil((VOLTA_SOZINHA_MS - (agora - b.desde)) / 1000)) };
  if (agora < b.recarga) return { estado: "recarga", segundos: Math.ceil((b.recarga - agora) / 1000) };
  return { estado: "casa" };
}

/**
 * As duas linhas das bandeiras na sidebar (null fora de guerra ativa com bandeiras): a nossa e a inimiga,
 * com distância e direção (N, NE, L...) até ela.
 * @param {Player} player
 * @param {string} claId
 * @param {Guerra} g
 * @returns {InfoCtf | null}
 */
export function infoSidebar(player, claId, g) {
  const lado = ladoDe(g, claId);
  if (g.estado !== "ativa" || !g.ctf || !lado) return null;
  const agora = Date.now();
  const deles = g.ctf[outro(lado)];
  // Quem leva a bandeira inimiga vê o caminho de casa (a própria bandeira); os outros, onde a inimiga está.
  const levando = deles.estado === "roubada" && deles.por === player.id;
  const alvo = levando ? centro(g.ctf[lado].pos) : ondeEsta(deles);
  const dx = alvo.x - player.location.x;
  const dz = alvo.z - player.location.z;
  return {
    nossa: resumo(g.ctf[lado], agora),
    deles: {
      ...resumo(deles, agora),
      tag: g.tags[outro(lado)],
      distancia: Math.round(Math.hypot(dx, dz)),
      direcao: direcao((Math.atan2(-dx, dz) * 180) / Math.PI),
      longe: player.dimension.id !== alvo.d,
      levando,
    },
  };
}

// ---------------------------------------------------------------- eventos

registrarBloqueioTeleporte((p) => (carregadores.has(p.id) ? textos.TP_BLOQUEADO : undefined));

aoMudarGuerra("comecou", (g) => {
  avisarClas([g.a, g.b], textos.CTF_LIGADO(g));
  pedirSincronia();
});

aoMudarGuerra("terminou", (g) => {
  const ctf = g.ctf;
  if (!ctf) return;
  const fora = LADOS.some((l) => ctf[l].estado !== "casa");
  for (const lado of LADOS) voltar(/** @type {GuerraCtf} */ (g), lado);
  for (const [id, c] of [...carregadores]) if (c.guerra === g.id) carregadores.delete(id);
  if (fora) avisarClas([g.a, g.b], textos.VOLTARAM_NO_FIM(g));
});

aoMudarCla(() => pedirSincronia());

system.runInterval(() => rodar("Bandeiras: seguir", seguir), 1);
system.runInterval(() => rodar("Bandeiras: toque", cicloToque), TICKS_TOQUE);
system.runInterval(() => rodar("Bandeiras: visual", cicloVisual), TICKS_VISUAL);
system.runInterval(() => rodar("Bandeiras: quem leva", cuidarDosCarregadores), TICKS_CUIDADO);
system.runInterval(() => rodar("Bandeiras: entidades", sincronizar), TICKS_SINCRONIA);
// Meio ciclo depois do feixe, para as duas coisas não disputarem o limite de partículas do mesmo tick.
system.runTimeout(() => system.runInterval(() => rodar("Bandeiras: aura", cicloAura), TICKS_AURA), TICKS_AURA / 2);

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    const matador = damageSource.damagingEntity;
    if (deadEntity instanceof Player) aoMorrer(deadEntity, matador instanceof Player ? matador : undefined);
  } catch (e) {
    registrarErro("Bandeira: morte de quem leva", e);
  }
});

world.afterEvents.playerDimensionChange.subscribe(({ player, fromDimension, fromLocation }) => {
  try {
    const c = carregadores.get(player.id);
    const g = c && guerraPorId(c.guerra);
    if (c && g) soltar(g, c.lado, "dimensao", { x: fromLocation.x, y: fromLocation.y, z: fromLocation.z, d: fromDimension.id });
  } catch (e) {
    registrarErro("Bandeira: troca de dimensão", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ultimosAvisos.delete(playerId);
  try {
    const c = carregadores.get(playerId);
    if (!c) return;
    const g = guerraPorId(c.guerra);
    if (g) soltar(g, c.lado, "saiu", c.ultimo);
    else carregadores.delete(playerId);
  } catch (e) {
    registrarErro("Bandeira: saída de quem leva", e);
  }
});

// Pérola, fruta do coro, fogos e elytra não valem com a bandeira (modo restrito: só cancela; o aviso vai depois).
world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    if (!carregadores.has(ev.source.id) || !ITENS_PROIBIDOS.has(ev.itemStack.typeId)) return;
    ev.cancel = true;
    const p = ev.source;
    system.run(() => {
      if (p.isValid) erro(p, textos.ITEM_BLOQUEADO);
    });
  } catch (e) {
    registrarErro("Bandeira: item proibido", e);
  }
});
