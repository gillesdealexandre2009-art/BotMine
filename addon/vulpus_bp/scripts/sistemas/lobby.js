// @ts-check
// Lobby protegido: dentro do raio marcado pela staff ninguém quebra, constrói, usa baldes e isqueiros,
// explode blocos nem briga; quem está lá também não leva dano nem passa fome. A staff é livre.
import { BlockTypes, Player, system, world } from "@minecraft/server";
import { registrarComando } from "../core/comandos.js";
import { CHAVE_SPAWN } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, limitar, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/lobby.js";
import { online } from "../core/jogadores.js";

/** @typedef {import("@minecraft/server").ItemStack} ItemStack */
/** @typedef {{ x: number, y: number, z: number, d: string, r: number }} Lobby */

const CHAVE_LOBBY = "vulpus:lobby";
const RAIO_PADRAO = 50;
const RAIO_MIN = 5;
const RAIO_MAX = 1000;
const PASSO_PROTECAO = 10;
const TICKS_AVISO = 40;
/** Itens que mudam o mundo sem ser bloco: balde, fogo, ovos, barcos, molduras, adubo, ferramentas. */
const OBRA = /bucket|flint_and_steel|fire_charge|spawn_egg|minecart|boat|_raft$|end_crystal|armor_stand|painting|item_frame|bone_meal|_hoe|_axe|_shovel|lead|name_tag|sign|bed$/;

/** Entidades de decoração que ninguém além da staff mexe nas áreas protegidas (armadura, molduras, quadros). */
const DECORACAO = /^minecraft:(armor_stand|item_frame|glow_item_frame|painting)$/;
/** @type {{ v: Lobby | undefined, ate: number }} */
let cacheSpawn = { v: undefined, ate: -1 };

/** @type {Lobby | undefined} */
let lobby;
let carregado = false;
/** @type {Map<string, number>} */
const ultimoAviso = new Map();

/** @param {unknown} v @returns {v is Lobby} */
function ehLobby(v) {
  const l = /** @type {any} */ (v);
  return !!l && typeof l.d === "string" && [l.x, l.y, l.z, l.r].every((n) => typeof n === "number" && Number.isFinite(n));
}

/** @returns {Lobby | undefined} */
export function lobbyAtual() {
  if (!carregado) {
    carregado = true;
    const salvo = lerMundo(CHAVE_LOBBY);
    lobby = ehLobby(salvo) ? salvo : undefined;
  }
  return lobby;
}

/**
 * Círculo de proteção em volta do spawn marcado pela staff (config protecaoSpawnRaio; 0 = desligado), com o mesmo efeito do lobby:
 * sem quebrar, construir, mexer em armaduras e molduras nem levar dano. Atualizado a cada 5 s.
 * @returns {Lobby | undefined}
 */
function circuloSpawn() {
  const agora = system.currentTick;
  if (agora < cacheSpawn.ate) return cacheSpawn.v;
  /** @type {Lobby | undefined} */
  let v;
  try {
    const raio = config().protecaoSpawnRaio;
    const s = /** @type {any} */ (raio > 0 ? lerMundo(CHAVE_SPAWN) : undefined);
    if (s && typeof s.d === "string" && Number.isFinite(s.x) && Number.isFinite(s.z)) v = { x: s.x, y: Number.isFinite(s.y) ? s.y : 0, z: s.z, d: s.d, r: raio };
  } catch {
    v = undefined;
  }
  cacheSpawn = { v, ate: agora + 100 };
  return v;
}

/**
 * Está dentro do lobby ou do círculo do spawn (círculo no plano, em qualquer altura)?
 * @param {string} dimId
 * @param {{ x: number, z: number }} pos
 */
export function dentro(dimId, pos) {
  for (const l of [lobbyAtual(), circuloSpawn()]) {
    if (l && l.d === dimId && Math.hypot(pos.x - l.x, pos.z - l.z) <= l.r) return true;
  }
  return false;
}

/** A proteção vale para essa pessoa? (a staff é livre) @param {Player} player */
const protegida = (player) => !ehStaff(player);

/** @param {ItemStack | undefined} item */
function ehObra(item) {
  if (!item) return false;
  return BlockTypes.get(item.typeId) !== undefined || OBRA.test(item.typeId);
}

/**
 * Cancela o evento e avisa na actionbar (o evento roda em modo restrito: o aviso vai no próximo tick).
 * @param {{ cancel: boolean }} ev
 * @param {Player} player
 * @param {boolean} [avisar]
 */
function barrar(ev, player, avisar = true) {
  ev.cancel = true;
  if (!avisar) return;
  const agora = system.currentTick;
  if (agora - (ultimoAviso.get(player.id) ?? -TICKS_AVISO) < TICKS_AVISO) return;
  ultimoAviso.set(player.id, agora);
  system.run(() => {
    if (!player.isValid) return;
    player.onScreenDisplay.setActionBar(textos.PROTEGIDO);
    som(player, "note.bass", { pitch: 0.8, volume: 0.6 });
  });
}

/**
 * Marca o círculo da proteção com chamas laranjas por alguns segundos.
 * @param {Lobby} l
 */
export function mostrarLimite(l) {
  const dim = world.getDimension(l.d);
  const n = Math.min(90, Math.max(24, Math.round(l.r * 1.5)));
  const cores = [
    { red: 1, green: 0.5, blue: 0.08 },
    { red: 1, green: 0.78, blue: 0.22 },
  ];
  let vezes = 0;
  const run = system.runInterval(() => {
    try {
      if (++vezes > 12) {
        system.clearRun(run);
        return;
      }
      const alvo = dim.getPlayers({ location: { x: l.x, y: l.y, z: l.z }, maxDistance: l.r + 40 })[0];
      const y = alvo ? alvo.location.y : l.y;
      efeitos.anel(dim, { x: l.x, y, z: l.z }, { raio: l.r, n, y: 0.2, giro: vezes * 0.1 }, "minecraft:colored_flame_particle", cores);
    } catch (e) {
      system.clearRun(run);
      registrarErro("Limite do lobby", e);
    }
  }, 10);
}

/**
 * @param {Player} player
 * @param {number | undefined} raio
 */
export function definirLobby(player, raio) {
  const r = limitar(Math.floor(raio ?? lobbyAtual()?.r ?? RAIO_PADRAO), RAIO_MIN, RAIO_MAX);
  const { x, y, z } = player.location;
  /** @type {Lobby} */
  const novo = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id, r };
  if (!salvarMundo(CHAVE_LOBBY, novo)) {
    erro(player, "Não consegui salvar o lobby. Tenta de novo?");
    return;
  }
  lobby = novo;
  carregado = true;
  ok(player, textos.LOBBY_DEFINIDO(formatarCoords(novo), r));
  mostrarLimite(novo);
}

/**
 * @param {Player} player
 * @param {number} raio
 */
export function mudarRaio(player, raio) {
  const l = lobbyAtual();
  if (!l) {
    erro(player, textos.SEM_LOBBY);
    return;
  }
  const r = limitar(Math.floor(raio), RAIO_MIN, RAIO_MAX);
  /** @type {Lobby} */
  const novo = { ...l, r };
  salvarMundo(CHAVE_LOBBY, novo);
  lobby = novo;
  ok(player, textos.RAIO_DEFINIDO(r));
  mostrarLimite(novo);
}

/** @param {Player} player */
export function removerLobby(player) {
  if (!lobbyAtual()) {
    erro(player, textos.SEM_LOBBY);
    return;
  }
  salvarMundo(CHAVE_LOBBY, undefined);
  lobby = undefined;
  ok(player, textos.LOBBY_REMOVIDO);
}

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (protegida(ev.player) && dentro(ev.dimension.id, ev.block.location)) barrar(ev, ev.player);
  } catch (e) {
    registrarErro("Lobby (quebrar)", e);
  }
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block, itemStack } = ev;
    if (!ehObra(itemStack) || !protegida(player) || !dentro(block.dimension.id, block.location)) return;
    barrar(ev, player, ev.isFirstEvent);
  } catch (e) {
    registrarErro("Lobby (construir)", e);
  }
});

world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    const player = ev.source;
    if (!ehObra(ev.itemStack) || !protegida(player) || !dentro(player.dimension.id, player.location)) return;
    barrar(ev, player);
  } catch (e) {
    registrarErro("Lobby (usar item)", e);
  }
});

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    const { player, target } = ev;
    if (target instanceof Player) return;
    // armaduras, molduras e quadros: nem com a mão vazia (trocar a armadura é o que o pessoal fazia); o resto só com item de obra
    if (!DECORACAO.test(target.typeId) && !ehObra(ev.itemStack)) return;
    if (protegida(player) && dentro(target.dimension.id, target.location)) barrar(ev, player);
  } catch (e) {
    registrarErro("Lobby (entidade)", e);
  }
});

// Sem briga: jogador não machuca jogador dentro do lobby (o resto do dano é absorvido pela resistência).
world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    const alvo = ev.hurtEntity;
    if (!(alvo instanceof Player)) {
      // bater (ou atirar) em armadura, moldura ou quadro: só a staff derruba. Os alvos do Tiro ao Alvo não são desses tipos.
      if (DECORACAO.test(alvo.typeId) && dentro(alvo.dimension.id, alvo.location)) {
        const quem = ev.damageSource.damagingEntity;
        if (!(quem instanceof Player) || protegida(quem)) ev.cancel = true;
      }
      return;
    }
    const atacante = ev.damageSource.damagingEntity;
    if (atacante instanceof Player && dentro(alvo.dimension.id, alvo.location)) ev.cancel = true;
  } catch (e) {
    registrarErro("Lobby (dano)", e);
  }
});

// Explosão não leva bloco do lobby.
world.beforeEvents.explosion.subscribe((ev) => {
  try {
    const l = lobbyAtual();
    if (!l || ev.dimension.id !== l.d) return;
    const blocos = ev.getImpactedBlocks();
    const livres = blocos.filter((b) => !dentro(l.d, b.location));
    if (livres.length !== blocos.length) ev.setImpactedBlocks(livres);
  } catch (e) {
    registrarErro("Lobby (explosão)", e);
  }
});

// Quem está no lobby não leva dano nem passa fome.
system.runInterval(() => {
  try {
    if (!lobbyAtual()) return;
    for (const player of online()) {
      if (!protegida(player) || !dentro(player.dimension.id, player.location)) continue;
      player.addEffect("resistance", PASSO_PROTECAO * 4, { amplifier: 4, showParticles: false });
      player.addEffect("saturation", PASSO_PROTECAO * 4, { amplifier: 0, showParticles: false });
    }
  } catch (e) {
    registrarErro("Lobby (proteção)", e);
  }
}, PASSO_PROTECAO);

// Nenhum bicho nasce no lobby (natural, ovo, reprodução), exceto os do próprio addon (vulpus:...), como NPCs.
world.afterEvents.entitySpawn.subscribe(({ entity, cause }) => {
  try {
    if (String(cause) !== "Spawned" && String(cause) !== "Born") return;
    if (!lobbyAtual() || !entity.isValid || entity.typeId.startsWith("vulpus:")) return;
    if (!dentro(entity.dimension.id, entity.location)) return;
    if (entity.getComponent("minecraft:type_family")?.hasTypeFamily("mob")) entity.remove();
  } catch (e) {
    registrarErro("Lobby (bichos)", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => ultimoAviso.delete(playerId));

registrarComando(
  {
    nome: "definirlobby",
    descricao: textos.CMD_DEFINIRLOBBY,
    staff: true,
    parametros: [{ nome: "raio", tipo: "inteiro", opcional: true }],
  },
  (p, [raio]) => definirLobby(p, raio),
);
registrarComando(
  { nome: "raiolobby", descricao: textos.CMD_RAIOLOBBY, staff: true, parametros: [{ nome: "raio", tipo: "inteiro" }] },
  (p, [raio]) => mudarRaio(p, raio),
);
registrarComando({ nome: "removerlobby", descricao: textos.CMD_REMOVERLOBBY, staff: true }, (p) => removerLobby(p));
