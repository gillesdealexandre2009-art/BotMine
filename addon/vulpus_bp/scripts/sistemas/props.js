// @ts-check
// Props da feira: decoração de verdade (entidade vulpus:prop com modelo próprio: moedas, placas de cada barraca,
// rede, boia, caixote, aljava, alvo, martelo, lenha, lanterna, raposa de pelúcia, banco, barril...). A staff usa a
// Varinha da Feira: clicar num bloco põe o prop escolhido exatamente ali, bater num prop o tira, clicar num prop o gira
// e agachada + clicar no ar troca o modelo. O painel está em feira_staff.js.
import { Direction, ItemLockMode, ItemStack, Player, system, world } from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import { achadas, esquecerBusca, precisaAplicar } from "../core/entidades.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/props.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ id: number, m: number, x: number, y: number, z: number, d: string, yaw: number }} Prop */

const CHAVE = "vulpus:props";
const ENTIDADE = "vulpus:prop";
/** Criaturas animadas (praia e lago): o modelo da lista com índice >= INDICE_PRIMEIRO_VIVO usa esta entidade. */
const ENTIDADE_VIDA = "vulpus:vida";
const ENTIDADES = [ENTIDADE, ENTIDADE_VIDA];
const TAG = "vulpus_prop_";
const ITEM_VARINHA = "minecraft:blaze_rod";
const CHAVE_MODELO = "vulpus:varinha_modelo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const MAX_PROPS = 150;
const PASSO = 100;
const RAIO_PERTO = 5;

/** @type {{ seq: number, lista: Prop[] } | undefined} */
let dados;

function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  const lista = Array.isArray(s.lista) ? s.lista : [];
  dados = {
    seq: Number.isFinite(s.seq) ? s.seq : 0,
    lista: lista
      .filter((p) => p && typeof p.d === "string" && [p.id, p.m, p.x, p.y, p.z, p.yaw].every((n) => Number.isFinite(n)) && p.m >= 0 && p.m < textos.MODELOS.length)
      .map((p) => ({ id: p.id, m: p.m, x: p.x, y: p.y, z: p.z, d: p.d, yaw: p.yaw })),
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** @param {number} id */
const tagDe = (id) => `${TAG}${id}`;

/** Tipo de entidade de um modelo: estático (vulpus:prop) ou animado (vulpus:vida). @param {number} m */
const entidadeDoModelo = (m) => (m >= textos.INDICE_PRIMEIRO_VIVO ? ENTIDADE_VIDA : ENTIDADE);

/** Valor de vulpus:modelo dentro da entidade do tipo certo. @param {number} m */
const modeloNaEntidade = (m) => (m >= textos.INDICE_PRIMEIRO_VIVO ? m - textos.INDICE_PRIMEIRO_VIVO : m);

/** @returns {Entity[]} */
function acharTodos() {
  return achadas("props", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) for (const tipo of ENTIDADES) achados.push(...world.getDimension(d).getEntities({ type: tipo }));
    return achados.filter((e) => e.getTags().some((t) => t.startsWith(TAG)));
  });
}

/** @param {Entity} ent */
function idDe(ent) {
  for (const t of ent.getTags()) if (t.startsWith(TAG)) return Number(t.slice(TAG.length));
  return undefined;
}

/** Garante uma entidade por prop marcado e nenhuma sobrando. */
function manter() {
  try {
    const { lista } = lerDados();
    const achados = acharTodos();
    const ids = new Set(lista.map((p) => p.id));
    for (const e of achados) {
      const id = idDe(e);
      if (id === undefined || !ids.has(id)) e.remove();
    }
    for (const p of lista) {
      const dim = world.getDimension(p.d);
      if (!dim.isChunkLoaded(p)) continue;
      const tipo = entidadeDoModelo(p.m);
      const mesmos = achados.filter((e) => e.isValid && idDe(e) === p.id);
      let ent = mesmos.find((e) => e.dimension.id === dim.id && e.typeId === tipo);
      for (const e of mesmos) if (e !== ent) e.remove(); // sobras e entidade do tipo antigo (o modelo mudou de grupo)
      if (!ent) {
        ent = dim.spawnEntity(tipo, p);
        ent.addTag(tagDe(p.id));
        esquecerBusca("props");
      }
      if (precisaAplicar(ent, `${p.yaw}|${p.m}`)) {
        ent.setRotation({ x: 0, y: p.yaw });
        ent.setProperty("vulpus:modelo", modeloNaEntidade(p.m));
      }
    }
  } catch (e) {
    registrarErro("Props: manter", e);
  }
}
system.runInterval(manter, PASSO);

/**
 * Cria o prop no ponto (modelo = índice de textos.MODELOS; yaw = para onde a frente olha).
 * @param {Player} player
 * @param {number} modelo
 * @param {{ x: number, y: number, z: number, d: string }} ponto
 * @param {number} yaw
 */
function criar(player, modelo, ponto, yaw) {
  const d = lerDados();
  if (d.lista.length >= MAX_PROPS) {
    erro(player, textos.LIMITE(MAX_PROPS));
    return;
  }
  const m = Math.max(0, Math.min(textos.MODELOS.length - 1, Math.floor(modelo)));
  d.seq += 1;
  const r = (/** @type {number} */ n) => Math.round(n * 100) / 100;
  d.lista.push({ id: d.seq, m, x: r(ponto.x), y: r(ponto.y), z: r(ponto.z), d: ponto.d, yaw: Math.round((((yaw % 360) + 360) % 360)) });
  gravar();
  manter();
  ok(player, textos.POSTO(textos.MODELOS[m], formatarCoords(ponto)));
}

/** O prop olha para quem o pôs: yaw do jogador + 180 graus. @param {Player} player */
const yawDeFrenteParaMim = (player) => player.getRotation().y + 180;

/**
 * Põe um prop onde a staff está olhando (em cima do bloco) ou, sem bloco, nos pés dela.
 * @param {Player} player
 * @param {number} modelo
 */
export function porProp(player, modelo) {
  /** @type {{ x: number, y: number, z: number, d: string }} */
  let ponto = { x: player.location.x, y: player.location.y, z: player.location.z, d: player.dimension.id };
  try {
    const hit = player.getBlockFromViewDirection({ maxDistance: 8 });
    const b = hit?.block;
    if (b) ponto = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5, d: b.dimension.id };
  } catch {
    // sem bloco no caminho: usa os pés
  }
  criar(player, modelo, ponto, yawDeFrenteParaMim(player));
}

/** O prop mais perto da pessoa, até RAIO_PERTO blocos. @param {Player} player */
function maisPerto(player) {
  const { x, y, z } = player.location;
  let melhor;
  let dist = RAIO_PERTO;
  for (const p of lerDados().lista) {
    if (p.d !== player.dimension.id) continue;
    const dd = Math.hypot(p.x - x, p.y - y, p.z - z);
    if (dd <= dist) {
      dist = dd;
      melhor = p;
    }
  }
  return melhor;
}

/** @param {number} id */
function girarPorId(id) {
  const p = lerDados().lista.find((x) => x.id === id);
  if (!p) return false;
  p.yaw = (p.yaw + 45) % 360;
  gravar();
  manter();
  return true;
}

/** @param {number} id */
function removerPorId(id) {
  const d = lerDados();
  const antes = d.lista.length;
  d.lista = d.lista.filter((x) => x.id !== id);
  if (d.lista.length === antes) return false;
  gravar();
  manter();
  return true;
}

/** @param {Player} player */
export function girarProximo(player) {
  const p = maisPerto(player);
  if (!p || !girarPorId(p.id)) {
    erro(player, textos.NENHUM_PERTO);
    return;
  }
  ok(player, textos.GIRADO);
}

/**
 * Troca o modelo do prop mais próximo (de estático para animado e vice-versa também: a entidade antiga some e nasce a nova).
 * @param {Player} player
 * @param {number} modelo
 */
export function trocarModeloProximo(player, modelo) {
  const p = maisPerto(player);
  if (!p) {
    erro(player, textos.NENHUM_PERTO);
    return;
  }
  p.m = Math.max(0, Math.min(textos.MODELOS.length - 1, Math.floor(modelo)));
  gravar();
  manter();
  ok(player, textos.TROCADO(textos.MODELOS[p.m]));
}

/** @param {Player} player */
export function removerProximo(player) {
  const p = maisPerto(player);
  if (!p || !removerPorId(p.id)) {
    erro(player, textos.NENHUM_PERTO);
    return;
  }
  ok(player, textos.REMOVIDO);
}

/** @param {Player} player */
export function removerTodosProps(player) {
  lerDados().lista = [];
  gravar();
  manter();
  ok(player, textos.TODOS_REMOVIDOS);
}

export const quantosProps = () => lerDados().lista.length;

/**
 * Posições dos props de um modelo (índice de textos.MODELOS), para os sistemas que reagem a eles (ex.: a flor dourada).
 * Devolve a lista guardada, sem copiar: não altere os objetos.
 * @param {number} indice
 * @returns {{ x: number, y: number, z: number, d: string, id: number }[]}
 */
export function propsDoModelo(indice) {
  return lerDados().lista.filter((p) => p.m === indice);
}

// ----------------------------------------------------------------------------------- varinha

/** Modelo que a varinha da pessoa põe (guardado na própria pessoa). @param {Player} player */
export function modeloDa(player) {
  const v = player.getDynamicProperty(CHAVE_MODELO);
  return typeof v === "number" && v >= 0 && v < textos.MODELOS.length ? v : 0;
}

/**
 * @param {Player} player
 * @param {number} modelo
 */
export function escolherModelo(player, modelo) {
  const m = Math.max(0, Math.min(textos.MODELOS.length - 1, Math.floor(modelo)));
  player.setDynamicProperty(CHAVE_MODELO, m);
  return m;
}

/** @param {import("@minecraft/server").ItemStack | undefined} item */
const ehVarinha = (item) => !!item && item.typeId === ITEM_VARINHA && item.nameTag === textos.NOME_VARINHA;

/** A pessoa está com a varinha na mão? @param {Player} player */
function segurandoVarinha(player) {
  try {
    return ehVarinha(player.getComponent("minecraft:inventory")?.container?.getItem(player.selectedSlotIndex));
  } catch {
    return false;
  }
}

/** Entrega a Varinha da Feira (travada no inventário, fica na morte). @param {Player} player */
export function darVarinha(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return;
  for (let i = 0; i < inv.size; i++) {
    if (ehVarinha(inv.getItem(i))) {
      msg(player, textos.VARINHA_JA_TEM);
      return;
    }
  }
  const item = new ItemStack(ITEM_VARINHA, 1);
  item.nameTag = textos.NOME_VARINHA;
  item.setLore(textos.LORE_VARINHA);
  item.lockMode = ItemLockMode.inventory;
  item.keepOnDeath = true;
  if (inv.addItem(item)) {
    erro(player, textos.SEM_ESPACO);
    return;
  }
  ok(player, textos.VARINHA_DADA);
}

/** Yaw para a frente do prop olhar para fora da face clicada. @param {string} face @param {Player} player */
function yawDaFace(face, player) {
  switch (face) {
    case Direction.North:
      return 180;
    case Direction.East:
      return 270;
    case Direction.West:
      return 90;
    case Direction.South:
      return 0;
    default:
      return yawDeFrenteParaMim(player);
  }
}

// Clicar num bloco com a varinha: o prop nasce no ponto exato clicado (modo restrito: só cancela e agenda).
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block, blockFace, faceLocation } = ev;
    if (!ehVarinha(ev.itemStack) || !ehStaff(player)) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const base = block.location;
    const dim = block.dimension.id;
    system.run(() => {
      if (!player.isValid) return;
      if (blockFace === Direction.Down) {
        erro(player, textos.SO_TOPO_E_LADOS);
        return;
      }
      const ponto = { x: base.x + faceLocation.x, y: base.y + faceLocation.y, z: base.z + faceLocation.z, d: dim };
      criar(player, modeloDa(player), ponto, yawDaFace(blockFace, player));
    });
  } catch (e) {
    registrarErro("Props: varinha no bloco", e);
  }
});

// Agachada + clicar no ar: troca o modelo da varinha. Sem agachar, só mostra o modelo atual.
world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    const player = ev.source;
    if (!ehVarinha(ev.itemStack) || !ehStaff(player)) return;
    ev.cancel = true;
    system.run(() => {
      if (!player.isValid) return;
      const novo = player.isSneaking ? escolherModelo(player, (modeloDa(player) + 1) % textos.MODELOS.length) : modeloDa(player);
      player.onScreenDisplay.setActionBar(textos.MODELO_ATUAL(textos.MODELOS[novo]));
      som(player, "random.click", { pitch: 1.3, volume: 0.6 });
    });
  } catch (e) {
    registrarErro("Props: varinha no ar", e);
  }
});

// Clicar com o direito num prop: gira 45 graus.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    const { player, target } = ev;
    if (!ENTIDADES.includes(target.typeId) || !ehVarinha(ev.itemStack) || !ehStaff(player)) return;
    ev.cancel = true;
    const id = idDe(target);
    if (id === undefined) return;
    system.run(() => {
      if (girarPorId(id) && player.isValid) som(player, "random.click", { pitch: 1.1, volume: 0.6 });
    });
  } catch (e) {
    registrarErro("Props: varinha girando", e);
  }
});

// Bater num prop com a varinha: ele some.
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  try {
    if (!(damagingEntity instanceof Player) || !ENTIDADES.includes(hitEntity.typeId)) return;
    if (!ehStaff(damagingEntity) || !segurandoVarinha(damagingEntity)) return;
    const id = idDe(hitEntity);
    if (id === undefined) return;
    if (removerPorId(id)) {
      som(damagingEntity, "random.pop", { pitch: 1.2, volume: 0.8 });
      damagingEntity.onScreenDisplay.setActionBar(textos.REMOVIDO);
    }
  } catch (e) {
    registrarErro("Props: varinha batendo", e);
  }
});
