// @ts-check
// Armazém do leilão: cada lote é um baú de 1 bloco salvo como estrutura do mundo (vulpus:ah_<id>),
// imune a /kill, explosão e hopper, e com o NBT inteiro do item. O baú só existe no mapa dentro
// de um único callback síncrono: nenhum tick passa com ele lá. Só leilao.js importa este módulo.
import {
  BlockPermutation,
  StructureSaveMode,
  system,
  TickingAreaError,
  TickingAreaErrorReason,
  world,
} from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import { online } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { msg, registrarErro } from "../core/util.js";
import * as textos from "../textos/leilao.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").ItemStack} ItemStack */
/** @typedef {import("@minecraft/server").Container} Container */
/** @typedef {import("@minecraft/server").Block} Block */
/** @typedef {import("@minecraft/server").BlockPermutation} Permutacao */
/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {{ x: number, y: number, z: number, d: string, bloco: string }} Ponto */
/** @typedef {"ok" | "sem_espaco" | "indisponivel" | "divergente" | "falhou_depois"} ResultadoEntrega */

const CHAVE_PONTO = "vulpus:ah:armazem";
const AREA = "vulpus_armazem";
const BAU = "minecraft:chest";
const PREFIXO_ESTRUTURA = "vulpus:ah_";
/** De quanto em quanto tempo confere se o chunk do ponto já carregou. */
const TICKS_ESPERA_CHUNK = 20;

/** @type {"acordando" | "pronto" | "recusado"} */
let estado = "acordando";
let areaPronta = false;
/** @type {Ponto | undefined} */
let ponto;
/** @type {(() => void)[]} */
const aoPronto = [];
/** @type {((id: string, itens: ItemStack[]) => void)[]} */
const aoResgate = [];

/** Nome da estrutura de um lote. @param {string} id */
export const nomeEstrutura = (id) => PREFIXO_ESTRUTURA + id;

/** @param {Ponto} p */
const posicao = (p) => ({ x: p.x, y: p.y, z: p.z });

/**
 * @param {any} valor
 * @returns {valor is Ponto}
 */
const ehPonto = (valor) =>
  !!valor &&
  typeof valor === "object" &&
  typeof valor.d === "string" &&
  typeof valor.bloco === "string" &&
  [valor.x, valor.y, valor.z].every((n) => Number.isInteger(n));

/**
 * Avisa a staff online (e o Content Log).
 * @param {string} texto
 */
export function avisarStaff(texto) {
  console.warn(`[Vulpus] ${texto.replace(/§./g, "")}`);
  for (const p of online()) if (ehStaff(p)) msg(p, texto);
}

/** @returns {"acordando" | "pronto" | "recusado"} */
export function estadoArmazem() {
  return estado === "pronto" && !armazemPronto() ? "acordando" : estado;
}

/** @returns {boolean} ticking area pronta e chunk carregado */
export function armazemPronto() {
  if (estado !== "pronto" || !areaPronta || !ponto) return false;
  try {
    return world.getDimension(ponto.d).isChunkLoaded(posicao(ponto));
  } catch {
    return false;
  }
}

/** Roda fn quando o armazém ficar pronto pela primeira vez (já pronto: na hora). @param {() => void} fn */
export function aoFicarPronto(fn) {
  aoPronto.push(fn);
  if (estado === "pronto") fn();
}

/**
 * Avisa quando um baú perdido no ponto (servidor caiu no meio) virou a estrutura vulpus:ah_<id>.
 * @param {(id: string, itens: ItemStack[]) => void} fn
 */
export function aoResgatar(fn) {
  aoResgate.push(fn);
}

/** @param {string} nome @returns {boolean} */
export function existe(nome) {
  return world.structureManager.get(nome) !== undefined;
}

/** Só para a staff (Apagar). @param {string} nome @returns {boolean} */
export function apagar(nome) {
  return world.structureManager.delete(nome);
}

/** @param {Player} player @returns {Container | undefined} */
function inventario(player) {
  return player.getComponent("inventory")?.container;
}

/** @param {Dimension} dim @param {Ponto} p @returns {Container | undefined} */
function bauEm(dim, p) {
  return dim.getBlock(posicao(p))?.getComponent("inventory")?.container;
}

/**
 * @param {ItemStack} item
 * @param {{ t: string, q: number, n?: string }} esperado
 */
const bate = (item, esperado) =>
  item.typeId === esperado.t && item.amount === esperado.q && (item.nameTag ?? "") === (esperado.n ?? "");

/**
 * Esvazia o baú (a cópia dele já está na estrutura) e põe o bloco original de volta.
 * Nunca lança. @returns {boolean} se o ponto voltou ao normal
 * @param {Dimension} dim @param {Ponto} p @param {Permutacao} original
 */
function fechar(dim, p, original) {
  try {
    bauEm(dim, p)?.clearAll();
    dim.getBlock(posicao(p))?.setPermutation(original);
    return true;
  } catch (e) {
    registrarErro("Leilão: fechar o armazém", e);
    return false;
  }
}

/**
 * Com o ponto pronto, deixa o bloco como registrado: um baú vazio esquecido volta ao normal e
 * um baú com itens (servidor caiu no meio) vira estrutura de resgate.
 * @returns {{ dim: Dimension, p: Ponto, bloco: Block } | undefined} undefined se não dá para usar agora
 */
function pontoUtil() {
  if (!armazemPronto() || !ponto) return undefined;
  const p = ponto;
  const dim = world.getDimension(p.d);
  const bloco = dim.getBlock(posicao(p));
  if (!bloco) return undefined;
  if (bloco.typeId === p.bloco) return { dim, p, bloco };
  const bau = bloco.getComponent("inventory")?.container;
  if (bloco.typeId === BAU && bau) {
    if (bau.emptySlotsCount !== bau.size && !resgatar(dim, p, bau)) return undefined;
    bloco.setPermutation(BlockPermutation.resolve(p.bloco));
    return { dim, p, bloco: dim.getBlock(posicao(p)) ?? bloco };
  }
  if (bau) {
    registrarErro("Leilão", new Error(`o ponto do armazém virou ${bloco.typeId} (com inventário); não mexo`));
    return undefined;
  }
  registrarErro("Leilão", new Error(`o ponto do armazém virou ${bloco.typeId}; voltei para ${p.bloco}`));
  bloco.setPermutation(BlockPermutation.resolve(p.bloco));
  return { dim, p, bloco: dim.getBlock(posicao(p)) ?? bloco };
}

/**
 * Guarda o baú esquecido no ponto como vulpus:ah_rec_<ms base36> e avisa os ouvintes.
 * @param {Dimension} dim @param {Ponto} p @param {Container} bau
 * @returns {boolean} se guardou (e esvaziou o baú)
 */
function resgatar(dim, p, bau) {
  /** @type {ItemStack[]} */
  const itens = [];
  for (let i = 0; i < bau.size; i++) {
    const item = bau.getItem(i);
    if (item) itens.push(item);
  }
  let id = `rec_${Date.now().toString(36)}`;
  for (let n = 1; existe(nomeEstrutura(id)); n++) id = `rec_${Date.now().toString(36)}_${n}`;
  try {
    world.structureManager.createFromWorld(nomeEstrutura(id), dim, posicao(p), posicao(p), {
      includeBlocks: true,
      includeEntities: false,
      saveMode: StructureSaveMode.World,
    });
    if (!existe(nomeEstrutura(id))) throw new Error("a estrutura de resgate não apareceu");
    bau.clearAll();
  } catch (e) {
    registrarErro("Leilão: resgatar o baú do armazém", e);
    return false;
  }
  avisarStaff(textos.AVISO_STAFF_RESGATE(id));
  for (const fn of aoResgate) {
    try {
      fn(id, itens);
    } catch (e) {
      registrarErro("Leilão: aviso de resgate", e);
    }
  }
  return true;
}

/**
 * Tira o item do slot do jogador e grava como estrutura. Síncrono. Antes de mover, chama conferir(item);
 * false aborta sem tocar em nada. Em qualquer falha depois de mover, devolve o item ao mesmo slot
 * (ou addItem, ou spawnItem nos pés) e restaura o bloco.
 * @param {Player} player
 * @param {number} slot
 * @param {string} nome
 * @param {(item: ItemStack) => boolean} conferir
 * @returns {boolean} se a estrutura existe e o slot ficou vazio
 */
export function guardar(player, slot, nome, conferir) {
  const inv = inventario(player);
  const local = inv && pontoUtil();
  if (!inv || !local) return false;
  if (existe(nome)) {
    registrarErro("Leilão", new Error(`a estrutura ${nome} já existe; não sobrescrevo`));
    return false;
  }
  const { dim, p, bloco } = local;
  const original = bloco.permutation;
  let movido = false;
  let salvo = false;
  try {
    bloco.setType(BAU);
    const bau = bauEm(dim, p);
    if (!bau || bau.emptySlotsCount !== bau.size) throw new Error("o baú do armazém não abriu vazio");
    const item = inv.getItem(slot);
    if (!item || !conferir(item)) return false;
    // Marcado antes: se moveItem lançar no meio, o item pode já estar no baú e precisa voltar.
    movido = true;
    inv.moveItem(slot, 0, bau);
    const noBau = bau.getItem(0);
    if (!noBau || inv.getItem(slot) || !bate(noBau, { t: item.typeId, q: item.amount, n: item.nameTag })) {
      throw new Error("o item não chegou inteiro ao baú");
    }
    world.structureManager.createFromWorld(nome, dim, posicao(p), posicao(p), {
      includeBlocks: true,
      includeEntities: false,
      saveMode: StructureSaveMode.World,
    });
    salvo = existe(nome);
    if (!salvo) throw new Error("a estrutura não apareceu depois de criada");
    return true;
  } catch (e) {
    registrarErro(`Leilão: guardar ${nome}`, e);
    return false;
  } finally {
    // Sem estrutura, o item volta para a pessoa. Se nem isso der, o baú fica no mapa com o item
    // e o resgate da próxima operação guarda tudo para a staff conferir.
    const podeFechar = !movido || salvo || devolver(player, inv, slot, dim, p, nome);
    if (podeFechar) fechar(dim, p, original);
  }
}

/**
 * Devolve ao jogador o item que estava indo para o baú (guardar falhou antes da estrutura).
 * @param {Player} player @param {Container} inv @param {number} slot
 * @param {Dimension} dim @param {Ponto} p @param {string} nome
 * @returns {boolean} se o item saiu do baú
 */
function devolver(player, inv, slot, dim, p, nome) {
  try {
    if (existe(nome)) world.structureManager.delete(nome);
    const bau = bauEm(dim, p);
    const item = bau?.getItem(0);
    if (!bau || !item) return true;
    if (!inv.getItem(slot)) {
      bau.moveItem(0, slot, inv);
      return true;
    }
    bau.setItem(0);
    const sobra = inv.addItem(item);
    if (sobra) player.dimension.spawnItem(sobra, player.location);
    return true;
  } catch (e) {
    registrarErro(`Leilão: devolver o item de ${nome}`, e);
    return false;
  }
}

/**
 * Coloca a estrutura, confere typeId/amount/nameTag com o esperado, move para firstEmptySlot do jogador e apaga a estrutura.
 * Se a estrutura não apagar depois que o item chegou, o resultado continua "ok" (ela fica órfã, sem lote apontando).
 * Só lança antes de tirar o item da estrutura (jogador inválido, ponto ou estrutura ilegíveis).
 * @param {Player} player
 * @param {string} nome
 * @param {{ t: string, q: number, n?: string }} esperado
 * @returns {ResultadoEntrega}
 */
export function entregar(player, nome, esperado) {
  const inv = inventario(player);
  if (!inv || inv.emptySlotsCount < 1) return "sem_espaco";
  const local = pontoUtil();
  if (!local) return "indisponivel";
  if (!existe(nome)) return "divergente";
  const { dim, p, bloco } = local;
  const original = bloco.permutation;
  let movido = false;
  try {
    world.structureManager.place(nome, dim, posicao(p), { includeEntities: false });
    const bau = bauEm(dim, p);
    const item = bau?.getItem(0);
    // Um lote é sempre 1 item no slot 0; baú com mais coisa (resgate) não sai por aqui, senão o resto sumiria.
    if (!bau || !item || !bate(item, esperado) || bau.emptySlotsCount !== bau.size - 1) {
      registrarErro("Leilão", new Error(`${nome} não bate com o anúncio (${item?.typeId} x${item?.amount})`));
      fechar(dim, p, original);
      return "divergente";
    }
    const destino = inv.firstEmptySlot();
    if (destino === undefined) {
      return fechar(dim, p, original) ? "sem_espaco" : "divergente";
    }
    // Marcado antes: se moveItem lançar no meio, o item pode já estar com o jogador (vai para conferir).
    movido = true;
    bau.moveItem(0, destino, inv);
    const chegou = inv.getItem(destino);
    if (!chegou || !bate(chegou, esperado) || bau.getItem(0)) throw new Error("a entrega ficou pela metade");
  } catch (e) {
    registrarErro(`Leilão: entregar ${nome}`, e);
    if (movido) {
      fechar(dim, p, original);
      return "falhou_depois";
    }
    return fechar(dim, p, original) ? "indisponivel" : "divergente";
  }
  fechar(dim, p, original);
  try {
    if (!world.structureManager.delete(nome)) throw new Error("delete devolveu false");
  } catch (e) {
    registrarErro(`Leilão: a estrutura ${nome} ficou órfã depois da entrega`, e);
  }
  return "ok";
}

/**
 * Registra o ponto (primeira vez) e confere o bloco. Precisa do chunk carregado.
 * @param {Ponto} alvo
 * @returns {boolean} se terminou (pronto ou recusado); false = tentar de novo depois
 */
function preparar(alvo) {
  const dim = world.getDimension(alvo.d);
  if (!dim.isChunkLoaded(posicao(alvo))) return false;
  const bloco = dim.getBlock(posicao(alvo));
  if (!bloco) return false;
  if (!ehPonto(lerMundo(CHAVE_PONTO))) {
    if (bloco.getComponent("inventory")) {
      estado = "recusado";
      avisarStaff(textos.AVISO_STAFF_RECUSADO);
      return true;
    }
    salvarMundo(CHAVE_PONTO, { ...posicao(alvo), d: alvo.d, bloco: bloco.typeId });
  }
  ponto = lerMundo(CHAVE_PONTO);
  estado = "pronto";
  if (!pontoUtil()) registrarErro("Leilão", new Error("o ponto do armazém não ficou utilizável"));
  for (const fn of aoPronto) {
    try {
      fn();
    } catch (e) {
      registrarErro("Leilão: armazém pronto", e);
    }
  }
  return true;
}

/** Cria a ticking area do ponto e espera o chunk carregar para preparar. */
function iniciar() {
  const registrado = lerMundo(CHAVE_PONTO);
  const dim = world.getDimension(ehPonto(registrado) ? registrado.d : "minecraft:overworld");
  /** @type {Ponto} */
  const alvo = ehPonto(registrado) ? registrado : { x: 0, y: dim.heightRange.min, z: 0, d: dim.id, bloco: "" };
  const aguardar = () => {
    areaPronta = true;
    const id = system.runInterval(() => {
      try {
        if (preparar(alvo)) system.clearRun(id);
      } catch (e) {
        system.clearRun(id);
        registrarErro("Leilão: preparar o armazém", e);
      }
    }, TICKS_ESPERA_CHUNK);
  };
  world.tickingAreaManager
    .createTickingArea(AREA, { dimension: dim, from: posicao(alvo), to: posicao(alvo) })
    .then(aguardar, (e) => {
      if (e instanceof TickingAreaError && e.reason === TickingAreaErrorReason.IdentifierAlreadyExists) aguardar();
      else registrarErro("Leilão: ticking area do armazém", e);
    });
}

world.afterEvents.worldLoad.subscribe(() => {
  try {
    iniciar();
  } catch (e) {
    registrarErro("Leilão: iniciar o armazém", e);
  }
});
