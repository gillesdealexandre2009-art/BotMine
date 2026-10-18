// @ts-check
// Portal dos minigames: uma entidade fixa que a staff põe no lobby (no bloco que olhar). Quem chega perto ou clica entra no
// Skywars; o inventário, a armadura e o XP vão para o guarda-volumes e voltam na saída.
import { system, world } from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { achadas, esquecerBusca } from "../core/entidades.js";
import { manterTexto } from "../core/flutuante.js";
import { posicoesOnline } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, ok, registrarErro, rodarSeguro } from "../core/util.js";
import { INDICE_PRIMEIRO_VIVO, MODELOS as NOMES_MODELOS } from "../textos/props_modelos.js";
import { localSpawn } from "./spawn.js";
import { SAIDA } from "./mg_arena.js";
import { DIM_ID, dimensaoMg } from "./mg.js";
import * as textos from "../textos/mg.js";
import { saiuHa } from "./mg_estado.js";
import { entrar, hubPronto, participa, sair } from "./mg_motor.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ id: number, x: number, y: number, z: number, d: string, yaw: number }} PortalMg */

const CHAVE = "vulpus:mg:portais";
const ENTIDADE = "vulpus:vida";
const TAG = "vulpus_mg_portal";
const TAG_TXT = "vulpus_mg_portal_t";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const MODELO = NOMES_MODELOS.indexOf("Portal dos minigames") - INDICE_PRIMEIRO_VIVO;
const MODELO_SAIDA = NOMES_MODELOS.indexOf("Portal de saída dos minigames") - INDICE_PRIMEIRO_VIVO;
const TAG_SAIDA = "vulpus_mg_saida";
const PASSO_MANTER = 100;
const PASSO_PERTO = 10;
const RAIO_ENTRADA = 1.9;
const ALTURA_TITULO = 4.9;
/** Depois de sair de um minigame, o portal ignora a pessoa por este tempo (e até ela se afastar uma vez). */
const TICKS_APOS_SAIDA = 400;
const MAX_PORTAIS = 4;
const AVISO_ESPERA_TICKS = 80;

/** @type {PortalMg[] | undefined} */
let portais;
let seq = 0;

/** @returns {PortalMg[]} */
function lista() {
  if (portais) return portais;
  const s = /** @type {any} */ (lerMundo(CHAVE, {}));
  seq = Number.isFinite(s?.seq) ? s.seq : 0;
  portais = (Array.isArray(s?.lista) ? s.lista : [])
    .filter((m) => m && typeof m.d === "string" && [m.id, m.x, m.y, m.z, m.yaw].every((n) => Number.isFinite(n)))
    .map((m) => ({ id: m.id, x: m.x, y: m.y, z: m.z, d: m.d, yaw: m.yaw }));
  return portais;
}

function gravar() {
  salvarMundo(CHAVE, { seq, lista: lista() });
}

/** Quantos portais existem (para o painel da staff). */
export const quantosPortais = () => lista().length;

/** Leva a pessoa pelo portal: entra no Skywars e o guarda-volumes guarda tudo o que ela leva. @param {Player} p */
export function usarPortalMg(p) {
  entrar(p);
}

// ------------------------------------------------------------------------------------ a entidade
/** @param {number} id */
const tagDe = (id) => `${TAG}_${id}`;

/** @returns {Entity[]} */
function acharEntidades() {
  return achadas("mg:portais", () => {
    /** @type {Entity[]} */
    const l = [];
    for (const d of DIMENSOES) l.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG] }));
    return l;
  });
}

/** Garante cada portal no lugar, com o modelo e o texto em cima. */
function manter() {
  try {
    let achados = acharEntidades();
    const ids = new Set(lista().map((m) => m.id));
    for (const e of achados) {
      const id = Number(e.getTags().find((t) => t.startsWith(`${TAG}_`))?.slice(TAG.length + 1));
      if (!ids.has(id)) {
        e.remove();
        achados = achados.filter((x) => x !== e);
      }
    }
    for (const m of lista()) {
      manterTexto(`${TAG_TXT}_${m.id}`, { x: m.x, y: m.y + ALTURA_TITULO, z: m.z, d: m.d }, textos.PORTAL_TITULO);
      const dim = world.getDimension(m.d);
      if (!dim.isChunkLoaded(m)) continue;
      const mesmas = achados.filter((e) => e.hasTag(tagDe(m.id)));
      let ent = mesmas.find((e) => e.dimension.id === dim.id);
      for (const e of mesmas) if (e !== ent) e.remove();
      if (!ent) {
        ent = dim.spawnEntity(ENTIDADE, m);
        ent.addTag(TAG);
        ent.addTag(tagDe(m.id));
        ent.setRotation({ x: 0, y: m.yaw });
        esquecerBusca("mg:portais");
      } else if (Math.hypot(ent.location.x - m.x, ent.location.y - m.y, ent.location.z - m.z) > 0.05) ent.teleport(m, { dimension: dim });
      ent.setProperty("vulpus:modelo", MODELO);
    }
  } catch (e) {
    registrarErro("Portal dos minigames: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** Garante o portal de saída no hub (automático: não depende da staff pôr). */
function manterSaida() {
  try {
    const dim = dimensaoMg();
    if (!dim || !hubPronto()) return;
    manterTexto("vulpus_mg_saida_t", { x: SAIDA.x, y: SAIDA.y + ALTURA_TITULO, z: SAIDA.z, d: DIM_ID }, textos.SAIDA_TITULO);
    if (!dim.isChunkLoaded(SAIDA)) return;
    const todas = dim.getEntities({ type: ENTIDADE, tags: [TAG_SAIDA] });
    let ent = todas[0];
    for (const e of todas.slice(1)) e.remove();
    if (!ent) {
      ent = dim.spawnEntity(ENTIDADE, SAIDA);
      ent.addTag(TAG_SAIDA);
      ent.setRotation({ x: 0, y: SAIDA.yaw });
    }
    ent.setProperty("vulpus:modelo", MODELO_SAIDA);
  } catch (e) {
    registrarErro("Portal de saída: manter", e);
  }
}
system.runInterval(manterSaida, PASSO_MANTER);

/** Quem usa a saída: sai da partida (sem multa no hub) e volta com tudo. @param {Player} p */
export function usarSaida(p) {
  if (participa(p.id)) return sair(p);
  // não estava em partida (staff passeando): volta ao spawn do mundo
  const s = localSpawn();
  if (!s) return;
  try {
    p.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension(s.d) });
    ok(p, textos.SAIDA_NADA);
  } catch (e) {
    registrarErro("Portal de saída: voltar", e);
  }
}

/** @type {Map<string, number>} */
const ultimo = new Map();
/** Quem já usou o portal (ou acabou de voltar) e precisa se afastar antes de ele puxar de novo. @type {Set<string>} */
const desarmados = new Set();
/** @type {Set<string>} */
const desarmadosSaida = new Set();

// Chegar perto do portal já entra (com aviso, no máximo a cada 4 s, para quem leva coisas).
system.runInterval(() => {
  try {
    const l = lista();
    if (!l.length) return;
    const agora = system.currentTick;
    for (const j of posicoesOnline()) {
      // afastou-se: o portal volta a valer para ela
      if (desarmados.has(j.id) && l.every((m) => j.d !== m.d || Math.hypot(j.x - m.x, j.z - m.z) > RAIO_ENTRADA + 1.5)) desarmados.delete(j.id);
      for (const m of l) {
        if (j.d !== m.d || Math.abs(j.y - m.y) > 2.6 || Math.hypot(j.x - m.x, j.z - m.z) > RAIO_ENTRADA) continue;
        if (saiuHa(j.id, agora) < TICKS_APOS_SAIDA) desarmados.add(j.id);
        if (desarmados.has(j.id)) break;
        if (agora - (ultimo.get(j.id) ?? -AVISO_ESPERA_TICKS) < AVISO_ESPERA_TICKS) break;
        ultimo.set(j.id, agora);
        desarmados.add(j.id);
        const p = j.p;
        rodarSeguro(p, "Portal dos minigames", usarPortalMg);
        break;
      }
    }
    for (const j of posicoesOnline()) {
      if (j.d !== DIM_ID) continue;
      const perto = Math.abs(j.y - SAIDA.y) <= 2.6 && Math.hypot(j.x - SAIDA.x, j.z - SAIDA.z) <= RAIO_ENTRADA;
      if (!perto) {
        desarmadosSaida.delete(j.id);
        continue;
      }
      if (desarmadosSaida.has(j.id) || agora - (ultimo.get(`s:${j.id}`) ?? -AVISO_ESPERA_TICKS) < AVISO_ESPERA_TICKS) continue;
      ultimo.set(`s:${j.id}`, agora);
      desarmadosSaida.add(j.id);
      rodarSeguro(j.p, "Portal de saída", usarSaida);
    }
    // faíscas azuis quando tem gente por perto
    if (system.currentTick % 40 < PASSO_PERTO) {
      for (const m of l) {
        const perto = posicoesOnline().find((j) => j.d === m.d && Math.hypot(j.x - m.x, j.z - m.z) < 16);
        if (perto) efeitos.nuvem(perto.p.dimension, { x: m.x, y: m.y, z: m.z }, { n: 2, largura: 0.9, y0: 0.2, alto: 2.2 }, "minecraft:endrod");
      }
    }
  } catch (e) {
    registrarErro("Portal dos minigames: chegada", e);
  }
}, PASSO_PERTO);

// Clicar no portal também vale.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE) return;
    const saida = ev.target.hasTag(TAG_SAIDA);
    if (!saida && !ev.target.hasTag(TAG)) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const p = ev.player;
    system.run(() => rodarSeguro(p, saida ? "Portal de saída" : "Portal dos minigames", saida ? usarSaida : usarPortalMg));
  } catch (e) {
    registrarErro("Portal dos minigames: clique", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ultimo.delete(playerId);
  ultimo.delete(`s:${playerId}`);
  desarmados.delete(playerId);
  desarmadosSaida.delete(playerId);
});

// ------------------------------------------------------------------------------------ staff
/** Põe um portal no bloco que a staff olha. @param {Player} player */
export function marcarPortalMg(player) {
  if (lista().length >= MAX_PORTAIS) return erro(player, textos.PORTAL_LIMITE(MAX_PORTAIS));
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = player.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) return erro(player, textos.PORTAL_OLHE);
  const x = b.x + 0.5, z = b.z + 0.5;
  const yaw = Math.round((Math.atan2(-(player.location.x - x), player.location.z - z) * 180) / Math.PI);
  criarPortalMg({ x, y: b.y + 1, z, d: b.dimension.id, yaw });
  ok(player, textos.PORTAL_POSTO(formatarCoords(b)));
}

/** @param {{ x: number, y: number, z: number, d: string, yaw: number }} p */
export function criarPortalMg(p) {
  lista().push({ id: ++seq, ...p });
  gravar();
  manter();
}

/** Tira todos os portais. @param {Player} player */
export function removerPortaisMg(player) {
  const antigos = lista().map((m) => m.id);
  portais = [];
  gravar();
  manter();
  for (const id of antigos) manterTexto(`${TAG_TXT}_${id}`, undefined, "");
  ok(player, textos.PORTAL_REMOVIDOS);
}
