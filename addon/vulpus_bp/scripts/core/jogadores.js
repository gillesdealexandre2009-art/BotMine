// @ts-check
import { system, world } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Player} Player */

/** Tag de quem está "fora" (sumiço do dono, sistemas/sumico.js): não conta no online nem aparece nas listas. */
export const TAG_SUMIDO = "vulpus_sumido";

/** Jogadores que aparecem para os outros (sem quem está "fora"). */
export function visiveis() {
  return online().filter((p) => !p.hasTag(TAG_SUMIDO));
}

/**
 * Lista de jogadores válidos guardada no tick `tick`. Vale por poucos ticks (muitos sistemas pedem a lista o tempo todo)
 * e é descartada na hora quando alguém entra ou sai.
 */
const VALIDADE_LISTA = 5;
/** @type {{ tick: number, lista: Player[] }} */
let guardada = { tick: -1, lista: [] };

const invalidar = () => {
  guardada = { tick: -1, lista: [] };
  posGuardadas = { tick: -1, lista: [] };
};
world.afterEvents.playerJoin.subscribe(invalidar);
world.afterEvents.playerSpawn.subscribe(invalidar);
world.afterEvents.playerLeave.subscribe(invalidar);

/**
 * Jogadores online (só os válidos). A lista vem de um cache de poucos ticks (um getAllPlayers a cada 5 ticks, não um por
 * chamada) que entrar/sair derruba; é uma cópia, quem chama pode ordenar à vontade.
 * @returns {Player[]}
 */
export function online() {
  const agora = system.currentTick;
  if (guardada.tick < 0 || agora - guardada.tick >= VALIDADE_LISTA || agora < guardada.tick) guardada = { tick: agora, lista: world.getAllPlayers().filter((p) => p.isValid) };
  return guardada.lista.slice();
}

/** @typedef {{ p: Player, id: string, d: string, x: number, y: number, z: number }} PosJogador */
/** @type {{ tick: number, lista: PosJogador[] }} */
let posGuardadas = { tick: -1, lista: [] };

/**
 * Posição (e dimensão) de cada jogador online, lida uma vez por tick e dividida entre todos que pedirem: tira a conta de
 * "quem está perto" do jogo (um getPlayers por consulta) e faz em JS. Não altere os objetos devolvidos.
 * @returns {readonly PosJogador[]}
 */
export function posicoesOnline() {
  const agora = system.currentTick;
  if (posGuardadas.tick === agora) return posGuardadas.lista;
  /** @type {PosJogador[]} */
  const lista = [];
  for (const p of online()) {
    try {
      const l = p.location;
      lista.push({ p, id: p.id, d: p.dimension.id, x: l.x, y: l.y, z: l.z });
    } catch {
      // jogador saindo: ignora
    }
  }
  posGuardadas = { tick: agora, lista };
  return lista;
}

/**
 * Tem alguém a até `raio` blocos (distância 3D, como getPlayers com maxDistance) do ponto, na mesma dimensão?
 * @param {{ x: number, y: number, z: number }} ponto
 * @param {string} dimensao  id da dimensão
 * @param {number} raio
 */
export function alguemPerto(ponto, dimensao, raio) {
  const r2 = raio * raio;
  for (const j of posicoesOnline()) {
    if (j.d !== dimensao) continue;
    const dx = j.x - ponto.x;
    const dy = j.y - ponto.y;
    const dz = j.z - ponto.z;
    if (dx * dx + dy * dy + dz * dz <= r2) return true;
  }
  return false;
}

/**
 * Jogador online pelo nome, sem diferenciar maiúsculas (aceita "@Nome" e "\"Nome\"").
 * @param {string} nome
 * @returns {Player | undefined}
 */
export function porNome(nome) {
  const procurado = nome.trim().replace(/^@/, "").replace(/^"(.*)"$/, "$1").toLowerCase();
  return online().find((p) => p.name.toLowerCase() === procurado);
}

/**
 * Todos online, menos o próprio jogador.
 * @param {Player} player
 * @returns {Player[]}
 */
export function outros(player) {
  return online().filter((p) => p.id !== player.id && !p.hasTag(TAG_SUMIDO));
}

/**
 * @param {string} id
 * @returns {Player | undefined}
 */
export function porId(id) {
  return online().find((p) => p.id === id);
}
