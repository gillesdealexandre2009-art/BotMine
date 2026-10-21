// @ts-check
// Bloco Branco Atravessável (vulpus:branco_atravessavel): sem colisão, o jogo não desenha nada por cima da tela quando a
// câmera entra nele e a pessoa vê o mundo através das faces. Aqui, quando a cabeça de alguém está dentro de um, a tela
// fica toda branca (um fade de câmera renovado a cada ciclo, que não depende do jogo desenhar o interior do bloco, mais uma
// névoa de 0,4 bloco do resource pack) e volta ao normal ao sair.
import { system, world } from "@minecraft/server";
import { online } from "../core/jogadores.js";
import { registrarErro } from "../core/util.js";

const BLOCO = "vulpus:branco_atravessavel";
const NEVOA = "vulpus:nevoa_cegueira_branca";
const ID = "vulpus_branco";
const CICLO = 1;

/** @type {Set<string>} quem está com a tela branca agora */
const dentro = new Set();

/** @param {import("@minecraft/server").Player} p @param {boolean} ligar */
function aplicar(p, ligar) {
  try {
    p.runCommand(ligar ? `fog @s push ${NEVOA} "${ID}"` : `fog @s remove "${ID}"`);
  } catch (e) {
    registrarErro("Bloco branco: névoa", e);
  }
}

/** Tela toda branca; renovado a cada tick enquanto a cabeça estiver dentro (sem rampa, para não piscar). @param {import("@minecraft/server").Player} p */
function clarao(p) {
  try {
    p.camera.fade({ fadeColor: { red: 1, green: 1, blue: 1 }, fadeTime: { fadeInTime: 0, holdTime: 0.12, fadeOutTime: 0.05 } });
  } catch (e) {
    registrarErro("Bloco branco: clarão", e);
  }
}

/** @type {Map<string, { chave: string, ocupa: boolean, tick: number, parado: boolean, visto: number }>} última posição conferida de cada pessoa (parado = sem velocidade; visto = último tick em que olhei) */
const conferido = new Map();
const RECONFERIR = 10;
/** De quantos em quantos ticks se confere quem está parado fora do bloco (quem anda continua todo tick). */
const PASSO_PARADO = 2;

/** O bloco na posição é o atravessável? @param {import("@minecraft/server").Player} p @param {number} x @param {number} y @param {number} z */
function ehBloco(p, x, y, z) {
  try {
    return p.dimension.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) })?.typeId === BLOCO;
  } catch {
    return false;
  }
}

system.runInterval(() => {
  try {
    const agora = system.currentTick;
    for (const p of online()) {
      const reg = conferido.get(p.id);
      // quem está parado (e fora do bloco) só é conferido a cada 2 ticks: metade das leituras de cabeça/velocidade, sem mudar o que se vê
      if (reg && reg.parado && !reg.ocupa && agora - reg.visto < PASSO_PARADO) continue;
      const c = p.getHeadLocation();
      // olha também onde a cabeça vai estar daqui a 2 ticks: o branco já está lá quando a câmera entra (sem o atraso de ver o mundo por dentro)
      let v = { x: 0, y: 0, z: 0 };
      try {
        v = p.getVelocity();
      } catch {
        // sem velocidade: só a posição atual
      }
      const fx = c.x + v.x * 2;
      const fy = c.y + v.y * 2;
      const fz = c.z + v.z * 2;
      const chave = `${Math.floor(c.x)},${Math.floor(c.y)},${Math.floor(c.z)}|${Math.floor(fx)},${Math.floor(fy)},${Math.floor(fz)}`;
      const parado = v.x === 0 && v.y === 0 && v.z === 0;
      const ant = reg;
      let ocupa;
      if (ant && ant.chave === chave && agora - ant.tick < RECONFERIR) {
        ocupa = ant.ocupa; // mesma célula: sem consultar o mundo de novo
      } else {
        ocupa = ehBloco(p, c.x, c.y, c.z) || ehBloco(p, fx, fy, fz);
        conferido.set(p.id, { chave, ocupa, tick: agora, parado, visto: agora });
      }
      const atual = conferido.get(p.id);
      if (atual) {
        atual.parado = parado;
        atual.visto = agora;
      }
      const estava = dentro.has(p.id);
      if (ocupa) clarao(p);
      if (ocupa && !estava) {
        dentro.add(p.id);
        aplicar(p, true);
      } else if (!ocupa && estava) {
        dentro.delete(p.id);
        aplicar(p, false);
      }
    }
  } catch (e) {
    registrarErro("Bloco branco", e);
  }
}, CICLO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  dentro.delete(playerId);
  conferido.delete(playerId);
});

// a névoa branca nunca fica para trás (morte, queda de conexão, /reload)
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  dentro.delete(player.id);
  aplicar(player, false);
});
