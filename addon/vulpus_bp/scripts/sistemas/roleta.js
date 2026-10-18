// @ts-check
// Roleta: a barraca da feira. Uma roda grande e colorida, de pé em cima de um bloco, de 12 fatias numeradas: gira e para com a
// seta vermelha, no topo, na fatia sorteada (cada fatia tem a mesma chance). Cada fatia dá Caudas, XP, um item ou nada, e a staff edita os prêmios pelo painel.
// O custo, a espera e os limites de lucro e de perda por dia seguem o padrão das barracas. Painel: feira_staff.js.
import { ItemStack, ItemTypes, Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, limitar, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { INDICE_ROLETA_BASE, INDICE_ROLETA_RODA } from "../textos/props_modelos.js";
import * as textos from "../textos/roleta.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { ganharXp } from "./niveis.js";
import { achadas, esquecerBusca } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ tipo: string, valor: number, item: string }} Fatia */
/** @typedef {{ dia: string, ganho: number, perda: number, ult: number }} Registro */
/** @typedef {{ x: number, y: number, z: number, d: string, bx: number, by: number, bz: number, yaw: number }} Mesa */
/** @typedef {{ mesa?: Mesa, fatias: Fatia[], atual: number, jogadores: Record<string, Registro>, ultimo?: string }} Dados */

const CHAVE = "vulpus:roleta";
const ENTIDADE = "vulpus:roleta";
const TAG_RODA = "vulpus_roleta_roda";
const TAG_BASE = "vulpus_roleta_base";
const TAG_TITULO = "vulpus_roleta_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const N = 12;
const GRAUS = 360 / N;
const PASSO_MANTER = 100;
/** O texto flutua acima da seta (que está a uns 3,9 blocos do chão da roda). */
const ALTURA_TITULO = 4.6;
/** Altura da seta acima da base, onde ela encosta na roda (para as faíscas e o som). */
const ALTURA_SETA = 3.4;
const GRANDE_PREMIO = 100;

/** @type {Fatia[]} */
const PADRAO = [
  { tipo: "caudas", valor: 150, item: "" },
  { tipo: "nada", valor: 0, item: "" },
  { tipo: "caudas", valor: 10, item: "" },
  { tipo: "nada", valor: 0, item: "" },
  { tipo: "caudas", valor: 30, item: "" },
  { tipo: "nada", valor: 0, item: "" },
  { tipo: "caudas", valor: 10, item: "" },
  { tipo: "caudas", valor: 60, item: "" },
  { tipo: "nada", valor: 0, item: "" },
  { tipo: "caudas", valor: 10, item: "" },
  { tipo: "caudas", valor: 30, item: "" },
  { tipo: "nada", valor: 0, item: "" },
];

/** @type {Dados | undefined} */
let dados;
let girando = false;

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
  const m = s.mesa;
  const lidas = Array.isArray(s.fatias) ? s.fatias : [];
  /** @type {Fatia[]} */
  const fatias = PADRAO.map((p, i) => {
    const f = /** @type {any} */ (lidas[i]);
    if (!f || typeof f !== "object" || !textos.TIPOS.includes(f.tipo)) return { ...p };
    const valor = Number.isFinite(f.valor) ? limitar(Math.floor(f.valor), 0, 100000) : 0;
    return { tipo: f.tipo, valor, item: typeof f.item === "string" ? f.item.slice(0, 64) : "" };
  });
  dados = {
    mesa:
      m && typeof m.d === "string" && [m.x, m.y, m.z, m.bx, m.by, m.bz, m.yaw].every((n) => Number.isFinite(n))
        ? { x: m.x, y: m.y, z: m.z, d: m.d, bx: m.bx, by: m.by, bz: m.bz, yaw: m.yaw }
        : undefined,
    fatias,
    atual: Number.isFinite(s.atual) ? limitar(Math.floor(s.atual), 0, N - 1) : 0,
    jogadores,
    ultimo: typeof s.ultimo === "string" ? s.ultimo.slice(0, 80) : undefined,
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** @param {string} id */
function registroDe(id) {
  const d = lerDados();
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

/** @param {number} a */
const normalizar = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
/** @param {number} a */
const em360 = (a) => ((a % 360) + 360) % 360;

/**
 * Ângulo da roda (propriedade vulpus:ang, que gira o osso da roda) para a fatia k ficar sob a seta, no topo.
 * Os números aumentam em sentido horário a partir do topo. Se a roda do jogo girar para o outro lado, liga "inverter"
 * nas configurações; o "ajuste" desloca tudo em graus.
 * @param {number} k
 */
export function anguloParaFatia(k) {
  const cfg = config();
  return em360((cfg.roletaInverter ? -1 : 1) * GRAUS * k + cfg.roletaAjusteGraus);
}

/** Centro da base: em cima do bloco marcado. @param {Mesa} m */
const centro = (m) => ({ x: m.bx + 0.5, y: m.by + 1, z: m.bz + 0.5 });

/** Onde a seta encosta na roda (para som e faíscas). @param {Mesa} m */
const pontoSeta = (m) => ({ x: m.bx + 0.5, y: m.by + 1 + ALTURA_SETA, z: m.bz + 0.5 });

// ----------------------------------------------------------------------------- roda, seta e título
/** @param {string} tag @returns {Entity[]} */
function acharPorTag(tag) {
  return achadas(`roleta:${tag}`, () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [tag] }));
    return achados;
  });
}

/**
 * Garante uma entidade com a tag no ponto, com o modelo e a rotação (uma só).
 * @param {string} tag
 * @param {{ x: number, y: number, z: number }} p
 * @param {string} dimId
 * @param {number} modelo
 * @param {number} yaw
 * @param {number} [ang]  ângulo da roda (propriedade vulpus:ang)
 */
function garantir(tag, p, dimId, modelo, yaw, ang) {
  const dim = world.getDimension(dimId);
  if (!dim.isChunkLoaded(p)) return undefined;
  const achados = acharPorTag(tag);
  let ent = achados.find((e) => e.dimension.id === dim.id);
  for (const e of achados) if (e !== ent) e.remove();
  if (!ent) {
    ent = dim.spawnEntity(ENTIDADE, p);
    ent.addTag(tag);
    esquecerBusca(`roleta:${tag}`);
  } else if (Math.hypot(ent.location.x - p.x, ent.location.y - p.y, ent.location.z - p.z) > 0.03) {
    ent.teleport(p, { dimension: dim });
  }
  ent.setProperty("vulpus:modelo", modelo);
  if (ang !== undefined) ent.setProperty("vulpus:ang", ang);
  ent.setRotation({ x: 0, y: yaw });
  return ent;
}

function textoTitulo() {
  return textos.TITULO_FLUTUANTE(config().roletaCusto, lerDados().ultimo);
}

function manter() {
  try {
    const d = lerDados();
    const m = d.mesa;
    const ligada = config().roletaLigada && !!m;
    manterTexto(TAG_TITULO, ligada && m ? { x: m.bx + 0.5, y: m.by + 1 + ALTURA_TITULO, z: m.bz + 0.5, d: m.d } : undefined, textoTitulo());
    if (!ligada || !m) {
      for (const e of [...acharPorTag(TAG_RODA), ...acharPorTag(TAG_BASE)]) e.remove();
      return;
    }
    garantir(TAG_BASE, centro(m), m.d, INDICE_ROLETA_BASE, m.yaw);
    if (!girando) garantir(TAG_RODA, centro(m), m.d, INDICE_ROLETA_RODA, m.yaw, anguloParaFatia(d.atual));
  } catch (e) {
    registrarErro("Roleta: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** Quem está perto ouve. @param {Mesa} m @param {string} id @param {number} tom */
function ouvir(m, id, tom) {
  try {
    const c = pontoSeta(m);
    for (const p of world.getDimension(m.d).getPlayers({ location: c, maxDistance: 24 })) som(p, id, { location: c, pitch: tom, volume: 0.7 });
  } catch (e) {
    registrarErro("Roleta: som", e);
  }
}

// ------------------------------------------------------------------------------------- giro
/**
 * Confere se a pessoa pode girar agora. Devolve o motivo (texto de erro) ou undefined.
 * @param {Player} player
 */
function motivoDeNao(player) {
  const cfg = config();
  if (!cfg.roletaLigada || !lerDados().mesa) return textos.JOGO_FECHADO;
  if (girando) return textos.OCUPADA;
  const r = registroDe(player.id);
  const espera = Math.ceil((r.ult + cfg.roletaEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return textos.RECARGA(espera);
  if (r.ganho >= cfg.roletaGanhoMaxDia) return textos.GANHO_MAX;
  if (cfg.roletaPerdaMaxDia - r.perda < cfg.roletaCusto) return textos.PERDA_MAX;
  if (saldo(player) < cfg.roletaCusto) return textos.SEM_CAUDAS(cfg.roletaCusto);
  return undefined;
}

/**
 * Anima o giro até a fatia k (desacelerando) e chama `aoParar`.
 * @param {number} k
 * @param {() => void} aoParar
 */
function animar(k, aoParar) {
  const d = lerDados();
  const m = d.mesa;
  const roda = acharPorTag(TAG_RODA).find((e) => e.isValid);
  if (!m || !roda) {
    d.atual = k;
    aoParar();
    return;
  }
  girando = true;
  const dim = world.getDimension(m.d);
  const angIni = Number(roda.getProperty("vulpus:ang")) || 0;
  const angFim = anguloParaFatia(k);
  const voltas = 3 + Math.floor(Math.random() * 2);
  // o ângulo cresce no giro; o total é a volta até a fatia mais as voltas inteiras
  const total = em360(angFim - angIni) + 360 * voltas;
  const duracao = Math.max(40, Math.floor(config().roletaGiroSeg * 20));
  let i = 0;
  let ultimaMarca = 0;
  const seta = pontoSeta(m);
  const run = system.runInterval(() => {
    try {
      i++;
      if (!roda.isValid) {
        system.clearRun(run);
        girando = false;
        aoParar();
        return;
      }
      const t = Math.min(1, i / duracao);
      const s = 1 - (1 - t) ** 3;
      roda.setProperty("vulpus:ang", em360(angIni + total * s));
      const marca = Math.floor((total * s) / GRAUS);
      if (marca > ultimaMarca) {
        ultimaMarca = marca;
        ouvir(m, "note.hat", 0.8 + 0.8 * (1 - t));
        efeitos.nuvem(dim, seta, { n: 2, largura: 0.12, y0: -0.2, alto: 0.3 }, "minecraft:basic_flame_particle");
      }
      if (t < 1) return;
      system.clearRun(run);
      roda.setProperty("vulpus:ang", angFim);
      d.atual = k;
      girando = false;
      efeitos.anel(dim, seta, { raio: 0.7, n: 16, y: -0.2 }, "minecraft:basic_flame_particle");
      efeitos.nuvem(dim, seta, { n: 8, largura: 0.5, y0: -0.6, alto: 1 }, "minecraft:endrod");
      ouvir(m, "random.orb", 1.2);
      aoParar();
    } catch (e) {
      system.clearRun(run);
      girando = false;
      registrarErro("Roleta: giro", e);
      aoParar();
    }
  }, 1);
}

/**
 * Entrega o prêmio da fatia. Devolve as Caudas dadas (para as contas do dia) e o texto.
 * @param {string} id
 * @param {Fatia} f
 */
function darPremio(id, f) {
  const player = world.getAllPlayers().find((p) => p.id === id);
  if (f.tipo === "caudas") {
    adicionarCaudas(id, f.valor);
    return f.valor;
  }
  if (f.tipo === "xp") {
    ganharXp(player ?? id, f.valor);
    return 0;
  }
  if (f.tipo === "item") {
    if (!player?.isValid) return 0;
    try {
      const item = new ItemStack(f.item, Math.max(1, Math.min(64, f.valor)));
      const inv = player.getComponent("minecraft:inventory")?.container;
      const sobrou = inv ? inv.addItem(item) : item;
      if (sobrou) {
        player.dimension.spawnItem(sobrou, player.location);
        msg(player, textos.SEM_ESPACO_ITEM);
      }
    } catch (e) {
      registrarErro("Roleta: item", e);
      msg(player, textos.ITEM_PERDIDO);
    }
  }
  return 0;
}

/** @param {Player} player */
function girar(player) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const d = lerDados();
  const r = registroDe(player.id);
  r.ult = Date.now();
  adicionarCaudas(player, -cfg.roletaCusto);
  const k = Math.floor(Math.random() * N);
  const id = player.id;
  const nome = player.name;
  const custo = cfg.roletaCusto;
  gravar();
  msg(player, textos.GIRANDO(custo));
  animar(k, () => {
    try {
      const f = d.fatias[k];
      const reg = registroDe(id);
      const caudas = darPremio(id, f);
      const liquido = caudas - custo;
      if (liquido > 0) reg.ganho += liquido;
      else if (liquido < 0) reg.perda += -liquido;
      const desc = textos.DESCRICAO(f);
      d.ultimo = f.tipo === "nada" ? undefined : `${nome}: ${desc}`;
      gravar();
      manter();
      const jogador = world.getAllPlayers().find((p) => p.id === id);
      if (jogador?.isValid) {
        if (f.tipo === "nada") {
          mostrarTitulo(jogador, textos.TITULO_NADA, { subtitulo: textos.SUB_NADA, entrada: 2, fica: 40, saida: 10 });
          msg(jogador, textos.CHAT_NADA);
        } else {
          mostrarTitulo(jogador, textos.TITULO_PREMIO(desc), { subtitulo: textos.SUB_PREMIO(k, desc), entrada: 2, fica: 50, saida: 10 });
          msg(jogador, textos.CHAT_PREMIO(desc));
        }
        som(jogador, f.tipo === "nada" ? "note.bass" : "random.levelup", { pitch: f.tipo === "nada" ? 0.8 : 1.2, volume: 0.8 });
      }
      if (caudas >= GRANDE_PREMIO) world.sendMessage(textos.GRANDE_PREMIO(nome, desc));
    } catch (e) {
      registrarErro("Roleta: prêmio", e);
    }
  });
}

// ------------------------------------------------------------------------------------ menu
/** @param {Player} player */
async function menuPremios(player) {
  const linhas = lerDados().fatias.map((f, k) => textos.LINHA_PREMIO(k, textos.DESCRICAO(f)));
  await new Lista(textos.TITULO_PREMIOS).texto(linhas.join("\n")).voltar((p) => menu(p)).abrir(player);
}

/** @param {Player} player */
async function menu(player) {
  const custo = config().roletaCusto;
  await new Lista(textos.TITULO_MENU)
    .texto(textos.CORPO_MENU(custo))
    .botao(textos.BOTAO_GIRAR(custo), undefined, (p) => girar(p))
    .botao(textos.BOTAO_PREMIOS, undefined, (p) => menuPremios(p))
    .abrir(player);
}

// ------------------------------------------------------------------------------ interações
/**
 * @param {Mesa | undefined} m
 * @param {import("@minecraft/server").Block} bloco
 */
const mesmoBloco = (m, bloco) => !!m && m.d === bloco.dimension.id && m.bx === bloco.location.x && m.by === bloco.location.y && m.bz === bloco.location.z;

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    if (!mesmoBloco(lerDados().mesa, block)) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() => rodarSeguro(player, "Roleta", menu));
  } catch (e) {
    registrarErro("Roleta: interação", e);
  }
});

// A roda e a base são entidades (com hitbox grande) e recebem o clique: valem como o bloco.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE || !(ev.target.hasTag(TAG_RODA) || ev.target.hasTag(TAG_BASE))) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => rodarSeguro(player, "Roleta", menu));
  } catch (e) {
    registrarErro("Roleta: roda", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!mesmoBloco(lerDados().mesa, ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Roleta: quebrar", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
/** Estado para o painel da staff. */
export function estadoRoleta() {
  const d = lerDados();
  return { marcada: !!d.mesa, girando, ultimo: d.ultimo };
}

/** Fatias atuais (cópia), para o painel editar. */
export const fatiasAtuais = () => lerDados().fatias.map((f) => ({ ...f }));

/** @param {Player} player */
export function marcarRoleta(player) {
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = player.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  if (girando) {
    erro(player, textos.OCUPADA);
    return;
  }
  const cx = b.x + 0.5;
  const cz = b.z + 0.5;
  // a roda fica de frente para quem marcou (a frente do modelo olha na direção do yaw)
  const yaw = Math.round((Math.atan2(-(player.location.x - cx), player.location.z - cz) * 180) / Math.PI);
  lerDados().mesa = { x: cx, y: b.y + 1, z: cz, d: b.dimension.id, bx: b.x, by: b.y, bz: b.z, yaw };
  gravar();
  manter();
  ok(player, textos.MARCADA(formatarCoords(b)));
}

/**
 * Muda o que uma fatia dá.
 * @param {Player} player
 * @param {number} k
 * @param {number} tipoIdx  índice em textos.TIPOS
 * @param {number} valor
 * @param {string} item
 * @returns {boolean}
 */
export function definirFatia(player, k, tipoIdx, valor, item) {
  const tipo = textos.TIPOS[tipoIdx] ?? "nada";
  let id = item.trim();
  if (tipo === "item") {
    if (id && !id.includes(":")) id = `minecraft:${id}`;
    if (!id || !ItemTypes.get(id)) {
      erro(player, textos.ITEM_INVALIDO);
      return false;
    }
  }
  const f = lerDados().fatias[limitar(Math.floor(k), 0, N - 1)];
  f.tipo = tipo;
  f.valor = tipo === "nada" ? 0 : limitar(Math.floor(valor), 0, 100000);
  f.item = tipo === "item" ? id : "";
  gravar();
  ok(player, textos.FATIA_SALVA(k, textos.DESCRICAO(f)));
  return true;
}

/** @param {Player} player */
export function restaurarFatias(player) {
  lerDados().fatias = PADRAO.map((p) => ({ ...p }));
  gravar();
  ok(player, textos.PREMIOS_RESTAURADOS);
}

/** Gira até a fatia 3, sem custo nem prêmio, para conferir se a seta alinha (e se o sentido está certo). @param {Player} player */
export function testarAlinhamento(player) {
  if (!lerDados().mesa) {
    erro(player, textos.SEM_ROLETA);
    return;
  }
  if (girando) {
    erro(player, textos.OCUPADA);
    return;
  }
  msg(player, textos.TESTE_ALINHAMENTO);
  animar(2, () => {
    gravar();
    manter();
  });
}

/** @param {Player} player */
export function removerRoleta(player) {
  lerDados().mesa = undefined;
  gravar();
  manter();
  ok(player, textos.REMOVIDO);
}
