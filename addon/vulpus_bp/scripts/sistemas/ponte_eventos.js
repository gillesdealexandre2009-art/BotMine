// @ts-check
// Eventos do jogo para o Discord: mortes, sequência de abates (killstreak), subida de nível e o status do servidor.
// Minigames ficam de fora: lá a morte faz parte da partida (e tem placar próprio). Mortes e abates que contam são os do mundo.
import { EntityDamageCause, Player, system, world } from "@minecraft/server";
import { aoEvento, emitir } from "../core/eventos.js";
import { online } from "../core/jogadores.js";
import { chamar, ponteViva } from "../core/ponte_cliente.js";
import { travados } from "../core/ponte_estado.js";
import { nomeDimensao, registrarErro } from "../core/util.js";
import { config } from "../core/db.js";
import { listar as selosComPrazo } from "./kitsune_tempo.js";
import { emMinigame } from "./mg_estado.js";
import { aoSubirNivel } from "./niveis.js";

const DIM_MINIGAMES = "vulpus:minigames";
/** Sequências que viram anúncio: 3, 5, 7, 10 e depois de 5 em 5. */
const MARCOS = Object.freeze([3, 5, 7, 10]);
const TICKS_STATUS = 20 * 60;

/** Abates seguidos sem morrer de cada jogador (só do mundo, fora dos minigames). @type {Map<string, number>} */
const sequencias = new Map();

/** @param {import("@minecraft/server").Entity} e */
const nosMinigames = (e) => {
  try {
    return e.dimension.id === DIM_MINIGAMES || (e instanceof Player && emMinigame(e));
  } catch {
    return false;
  }
};

/** @param {number} n */
export const ehMarco = (n) => MARCOS.includes(n) || (n > 10 && n % 5 === 0);

/** Causa do dano em uma palavra que o bot entende. @param {string | undefined} causa */
export function causaDaMorte(causa) {
  if (!causa) return "outro";
  switch (causa) {
    case EntityDamageCause.fall:
    case EntityDamageCause.flyIntoWall:
      return "queda";
    case EntityDamageCause.lava:
      return "lava";
    case EntityDamageCause.fire:
    case EntityDamageCause.fireTick:
      return "fogo";
    case EntityDamageCause.drowning:
      return "afogou";
    case EntityDamageCause.void:
      return "vazio";
    case EntityDamageCause.blockExplosion:
    case EntityDamageCause.entityExplosion:
      return "explosao";
    case EntityDamageCause.starve:
      return "fome";
    case EntityDamageCause.suffocation:
      return "sufocou";
    case EntityDamageCause.lightning:
      return "raio";
    case EntityDamageCause.freezing:
      return "frio";
    case EntityDamageCause.magic:
    case EntityDamageCause.wither:
      return "magia";
    default:
      return "outro";
  }
}

/** Nome legível de um bicho a partir do id ("minecraft:zombie_villager" vira "Zombie Villager"). @param {string} typeId */
function nomeDoBicho(typeId) {
  return typeId
    .replace(/^.*:/, "")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    if (!(deadEntity instanceof Player) || nosMinigames(deadEntity)) return;
    const vitima = deadEntity;
    const causador = damageSource.damagingEntity;
    // flecha e afins: o dono do projétil é quem abateu
    const matador = causador instanceof Player ? causador : undefined;
    const antes = sequencias.get(vitima.id) ?? 0;
    sequencias.delete(vitima.id);
    /** @type {Record<string, any>} */
    const ev = { nome: vitima.name, causa: causaDaMorte(damageSource.cause) };
    if (matador && matador.id !== vitima.id) {
      ev.matador_tipo = "jogador";
      ev.matador = matador.name;
    } else if (causador && !(causador instanceof Player)) {
      ev.matador_tipo = "mob";
      ev.matador = nomeDoBicho(causador.typeId);
    }
    const dim = vitima.dimension.id;
    if (dim !== "minecraft:overworld") ev.local = nomeDimensao(dim);
    emitir("morte", ev);
    if (!matador || matador.id === vitima.id || nosMinigames(matador)) return;
    if (antes >= 3) emitir("streak_fim", { nome: matador.name, vitima: vitima.name, n: antes });
    const n = (sequencias.get(matador.id) ?? 0) + 1;
    sequencias.set(matador.id, n);
    if (ehMarco(n)) emitir("streak", { nome: matador.name, n });
  } catch (e) {
    registrarErro("Ponte: morte", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  sequencias.delete(playerId);
});

aoSubirNivel((player, antes, depois) => {
  if (depois.nivel > antes.nivel) emitir("nivel", { nome: player.name, nivel: depois.nivel, rank: depois.rank.nome });
});

// ---- status do servidor: o painel do ip-e-porta mostra quem está jogando
let statusEmVoo = false;
async function enviarStatus() {
  if (statusEmVoo || !ponteViva() || !config().ponteChatLigada) return;
  statusEmVoo = true;
  try {
    const nomes = online()
      .filter((p) => !travados.has(p.id))
      .map((p) => p.name);
    // os selos Kitsune com prazo vão junto (também de quem está offline): o cargo do Discord segue o jogo
    await chamar("POST", "/mc/status", { online: nomes, kitsunes: selosComPrazo().map((c) => ({ nome: c.nome, ate: c.ate })) });
  } catch (e) {
    registrarErro("Ponte: status", e);
  } finally {
    statusEmVoo = false;
  }
}
// quando alguém entra ou sai, o painel e o contador do Discord mudam na hora (sem esperar o minuto cheio)
aoEvento((tipo) => {
  if (tipo === "entrada" || tipo === "saida") system.runTimeout(() => void enviarStatus(), 20);
});
system.runTimeout(() => void enviarStatus(), 200);
system.runInterval(() => void enviarStatus(), TICKS_STATUS);
