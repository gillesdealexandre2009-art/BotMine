// @ts-check
// "Sair" do jogo sem sair (só dono, pelo menu de pegadinhas): aparece para todos a mensagem de que o dono saiu, o scoreboard
// passa a contar uma pessoa a menos, ele fica invisível, sem nome em cima da cabeça e some das listas do addon (ver perfil,
// pedir TPA). Voltar manda a mensagem de que entrou. Limite do jogo: a lista de jogadores do menu de pausa do Minecraft vem do
// servidor e não dá para esconder por script.
import { system, world } from "@minecraft/server";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { online, TAG_SUMIDO } from "../core/jogadores.js";
import { erro, registrarErro } from "../core/util.js";
import { atualizarIdentidade } from "./identidade.js";

const NOME_EFEITO = "invisibility";
const DURACAO = 4800;
const CICLO = 100;

/** Está "fora"? @param {import("@minecraft/server").Player} p */
export function estaSumido(p) {
  try {
    return p.hasTag(TAG_SUMIDO);
  } catch {
    return false;
  }
}

/** Mensagem igual à do jogo ("<nome> saiu do jogo" / "<nome> entrou no jogo"). @param {boolean} saiu @param {string} nome */
function avisoDoJogo(saiu, nome) {
  world.sendMessage({ rawtext: [{ translate: saiu ? "multiplayer.player.left" : "multiplayer.player.joined", with: [nome] }] });
}

/** Invisibilidade sem partículas. @param {import("@minecraft/server").Player} p */
function invisivel(p) {
  try {
    p.addEffect(NOME_EFEITO, DURACAO, { amplifier: 0, showParticles: false });
  } catch (e) {
    registrarErro("Sumiço: invisibilidade", e);
  }
}

/**
 * "Sai" ou "volta". Só dono.
 * @param {import("@minecraft/server").Player} player
 * @returns {boolean | undefined} true = agora está sumido, false = voltou, undefined = não pôde
 */
export function alternarSumico(player) {
  if (!ehDono(player)) {
    erro(player, "Só dono usa isso.");
    return undefined;
  }
  if (estaSumido(player)) {
    player.removeTag(TAG_SUMIDO);
    try {
      player.removeEffect(NOME_EFEITO);
    } catch {
      // sem o efeito
    }
    atualizarIdentidade(player); // o nome volta na hora
    avisoDoJogo(false, player.name);
    registrarLogDono(player.name, "sumiço", "", true, "voltou");
    return false;
  }
  player.addTag(TAG_SUMIDO);
  invisivel(player);
  atualizarIdentidade(player); // com a tag de "fora", o nome fica vazio
  avisoDoJogo(true, player.name);
  registrarLogDono(player.name, "sumiço", "", true, "saiu");
  return true;
}

// a invisibilidade dura pouco: renova enquanto estiver "fora"
system.runInterval(() => {
  try {
    for (const p of online()) if (estaSumido(p)) invisivel(p);
  } catch (e) {
    registrarErro("Sumiço: renovar", e);
  }
}, CICLO);

// ao entrar de verdade no jogo, o estado de "fora" não vale mais (a pessoa voltou de fato)
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn || !estaSumido(player)) return;
  player.removeTag(TAG_SUMIDO);
  try {
    player.removeEffect(NOME_EFEITO);
  } catch {
    // sem o efeito
  }
});
