// @ts-check
// Mimos extras do selo Kitsune (só estilo, nenhuma vantagem no jogo): efeito curto de chegada e saída, looks salvos (apelido + cor do
// nome), cor da mensagem no chat (8 fixas) e o atalho do pet de vitrine no Cantinho. Perdeu o selo: os dados ficam guardados, mas
// nada disso vale. A cor da mensagem vai para o pack do chat por uma tag; o texto da mensagem nunca vira código de cor.
import { system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { pontoEmZona } from "../core/arg_zona.js";
import { config, dadosJogador, editarJogador, MAX_LOOKS } from "../core/db.js";
import { confirmar, Lista } from "../core/forms.js";
import { TAG_SUMIDO } from "../core/jogadores.js";
import { emitir, nuvem } from "../core/efeitos.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { pintar, temaValido } from "../cores.js";
import * as textos from "../textos/kitsune_extras.js";
import { avisarMudanca, LETRAS_APELIDO, nomeExibido, podeUsarTema, problemaApelido, temSelo } from "./kitsune.js";
import { emMinigame } from "./mg_estado.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */

/** As 8 cores da mensagem (código § sem o §), na ordem do menu. O pack do chat tem uma cópia desta lista (canal.js). */
export const CORES_MENSAGEM = Object.freeze(["b", "a", "e", "d", "c", "6", "9", "3"]);
/** Prefixo da tag que leva a cor da mensagem ao pack do chat (identidade.js escreve, canal.js lê). */
export const TAG_MSGCOR = "vulpus:msgcor:";

const ESPERA_FX_MS = 20000;

// ---------------------------------------------------------------- chegada e saída

/** Quando a pessoa tocou o último efeito (evita repetir se entrar e sair várias vezes). @type {Map<string, number>} */
const ultimoFx = new Map();

/**
 * O efeito de chegada e saída está ligado para a pessoa (precisa do selo, da opção da staff e da escolha dela).
 * @param {Player} player
 */
export function chegadaLigada(player) {
  return temSelo(player) && config().kitsuneChegadaFx && dadosJogador(player).extras.chegada;
}

/**
 * Pode tocar o efeito aqui e agora? Não em quem está sumido, em minigame, no Intervalo ou em região do mistério (pontoEmZona) e
 * nem nas dimensões vulpus:*.
 * @param {Player} player
 */
function lugarLivre(player) {
  try {
    if (player.hasTag(TAG_SUMIDO) || emMinigame(player)) return false;
    const { x, y, z } = player.location;
    const d = player.dimension.id;
    return !d.startsWith("vulpus:") && !pontoEmZona({ x, y, z, d });
  } catch {
    return false;
  }
}

/**
 * Toca o efeito: um anel de brilho que sobe e uma nuvem leve de pétalas (cerca de 2 s, poucas partículas) e um som suave.
 * @param {string} dimId
 * @param {Vector3} pos
 * @param {boolean} chegada  false = saída (o anel desce)
 */
function tocar(dimId, pos, chegada) {
  let dim;
  try {
    dim = world.getDimension(dimId);
  } catch {
    return;
  }
  const passos = [0, 6, 12, 18, 24];
  passos.forEach((tick, i) => {
    system.runTimeout(() => {
      try {
        const u = chegada ? i / (passos.length - 1) : 1 - i / (passos.length - 1);
        const raio = 0.9 - 0.25 * u;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + i * 0.6;
          if (!emitir(dim, "minecraft:endrod", { x: pos.x + Math.cos(a) * raio, y: pos.y + 0.2 + u * 1.8, z: pos.z + Math.sin(a) * raio })) return;
        }
        if (i === 2) nuvem(dim, pos, { n: 6, largura: 0.8, y0: 0.6, alto: 1.4 }, "minecraft:cherry_leaves_particle");
      } catch (e) {
        registrarErro("Efeito de chegada Kitsune", e);
      }
    }, tick);
  });
  try {
    dim.playSound("note.chime", pos, { volume: 0.5, pitch: chegada ? 1.4 : 0.9 });
  } catch {
    // som recusado: segue sem ele
  }
}

/**
 * Toca (se puder) o efeito de chegada ou saída da pessoa.
 * @param {Player} player
 * @param {boolean} chegada
 * @returns {boolean} se tocou
 */
export function efeitoChegada(player, chegada) {
  try {
    if (!player.isValid || !chegadaLigada(player) || !lugarLivre(player)) return false;
    const agora = Date.now();
    if (agora - (ultimoFx.get(player.id) ?? 0) < ESPERA_FX_MS) return false;
    ultimoFx.set(player.id, agora);
    tocar(player.dimension.id, { ...player.location }, chegada);
    return true;
  } catch (e) {
    registrarErro("Efeito de chegada Kitsune", e);
    return false;
  }
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) efeitoChegada(player, true);
});

// Na saída o jogador ainda existe no evento "antes": confere agora e toca no tick seguinte (o "antes" é modo restrito).
world.beforeEvents.playerLeave?.subscribe(({ player }) => {
  try {
    if (!chegadaLigada(player) || !lugarLivre(player)) return;
    const agora = Date.now();
    if (agora - (ultimoFx.get(player.id) ?? 0) < ESPERA_FX_MS) return;
    ultimoFx.set(player.id, agora);
    const dimId = player.dimension.id;
    const pos = { ...player.location };
    system.run(() => tocar(dimId, pos, false));
  } catch (e) {
    registrarErro("Efeito de saída Kitsune", e);
  }
});

/**
 * Liga ou desliga o efeito de chegada e saída da pessoa (guarda a escolha mesmo sem selo).
 * @param {Player} player
 * @returns {boolean} o novo estado
 */
export function alternarChegada(player) {
  const ligado = !dadosJogador(player).extras.chegada;
  editarJogador(player, (d) => {
    d.extras.chegada = ligado;
  });
  ok(player, textos.CHEGADA_MUDOU(ligado));
  return ligado;
}

// ---------------------------------------------------------------- looks salvos

/**
 * Salva o visual atual (apelido próprio + tema do nome) no espaço. Só Kitsune.
 * @param {Player} player
 * @param {number} slot  0 a MAX_LOOKS - 1
 * @returns {boolean}
 */
export function salvarLook(player, slot) {
  if (!temSelo(player)) {
    erro(player, textos.SO_KITSUNE);
    return false;
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_LOOKS) return false;
  const d = dadosJogador(player);
  const apelido = d.apelido && LETRAS_APELIDO.test(d.apelido) ? d.apelido : "";
  const tema = podeUsarTema(player, d.temaNome) ? d.temaNome : "";
  if (apelido === "" && tema === "") {
    erro(player, textos.LOOK_PADRAO);
    return false;
  }
  editarJogador(player, (x) => {
    x.extras.looks[slot] = { apelido, tema };
  });
  ok(player, textos.LOOK_SALVO(slot + 1));
  return true;
}

/**
 * Aplica um look guardado. Sem selo não vale; o apelido passa pelas mesmas regras de sempre (problemaApelido) e a cor precisa estar
 * liberada. Se algo falhar, nada muda.
 * @param {Player} player
 * @param {number} slot
 * @returns {boolean}
 */
export function aplicarLook(player, slot) {
  if (!temSelo(player)) {
    erro(player, textos.SO_KITSUNE);
    return false;
  }
  const look = dadosJogador(player).extras.looks[slot];
  if (!look) {
    erro(player, textos.LOOK_VAZIO);
    return false;
  }
  if (look.apelido !== "") {
    const problema = problemaApelido(look.apelido, player.id);
    if (problema) {
      erro(player, problema);
      return false;
    }
  }
  if (look.tema !== "" && (!temaValido(look.tema) || !podeUsarTema(player, look.tema))) {
    erro(player, textos.LOOK_TEMA_INDISPONIVEL);
    return false;
  }
  editarJogador(player, (d) => {
    d.apelido = look.apelido;
    d.temaNome = look.tema;
  });
  avisarMudanca(player);
  ok(player, textos.LOOK_APLICADO(nomeExibido(player)));
  return true;
}

/**
 * Apaga um look.
 * @param {Player} player
 * @param {number} slot
 */
export function apagarLook(player, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_LOOKS) return false;
  editarJogador(player, (d) => {
    d.extras.looks[slot] = null;
  });
  ok(player, textos.LOOK_APAGADO(slot + 1));
  return true;
}

/**
 * Menu "Meus looks".
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuLooks(player, voltar) {
  const aqui = () => menuLooks(player, voltar);
  const looks = dadosJogador(player).extras.looks;
  const tem = temSelo(player);
  const lista = new Lista(textos.TITULO_LOOKS).texto(textos.CORPO_LOOKS(MAX_LOOKS) + (tem ? "" : `\n\n${textos.LOOKS_SEM_SELO}`));
  for (let i = 0; i < MAX_LOOKS; i++) {
    const look = looks[i];
    if (!look) {
      lista.botao(textos.BOTAO_LOOK_VAZIO(i + 1), ICONES.nova, async (p) => {
        salvarLook(p, i);
        await aqui();
      });
      continue;
    }
    const nome = look.apelido || player.name;
    lista.botao(textos.BOTAO_LOOK(i + 1, (look.tema && pintar(nome, look.tema)) || nome, look.tema), ICONES.apelido, (p) => menuLook(p, i, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Um look guardado: aplicar, sobrescrever ou apagar.
 * @param {Player} player
 * @param {number} slot
 * @param {() => any} voltar
 */
async function menuLook(player, slot, voltar) {
  const look = dadosJogador(player).extras.looks[slot];
  if (!look) return voltar();
  const nome = look.apelido || player.name;
  const lista = new Lista(textos.TITULO_LOOK(slot + 1)).texto(textos.CORPO_LOOK((look.tema && pintar(nome, look.tema)) || nome, look.apelido, look.tema));
  lista.botao(textos.BOTAO_APLICAR, ICONES.sim, async (p) => {
    aplicarLook(p, slot);
    await voltar();
  });
  lista.botao(textos.BOTAO_SOBRESCREVER, ICONES.nova, async (p) => {
    salvarLook(p, slot);
    await voltar();
  });
  lista.botao(textos.BOTAO_APAGAR, ICONES.apagar, async (p) => {
    if (await confirmar(p, { titulo: textos.TITULO_LOOK(slot + 1), texto: textos.CONFIRMAR_APAGAR })) apagarLook(p, slot);
    await voltar();
  });
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- cor da mensagem

/**
 * Cor da mensagem em uso ("" sem selo, sem escolha ou com valor fora das 8 fixas).
 * @param {Player} player
 */
export function corMensagemDe(player) {
  if (!temSelo(player)) return "";
  const cor = dadosJogador(player).extras.msgCor;
  return CORES_MENSAGEM.includes(cor) ? cor : "";
}

/**
 * Escolhe a cor da mensagem entre as 8 fixas ("" volta ao branco). Só Kitsune.
 * @param {Player} player
 * @param {string} cor
 * @returns {boolean}
 */
export function definirCorMensagem(player, cor) {
  if (!temSelo(player)) {
    erro(player, textos.SO_KITSUNE);
    return false;
  }
  if (cor !== "" && !CORES_MENSAGEM.includes(cor)) return false;
  editarJogador(player, (d) => {
    d.extras.msgCor = cor;
  });
  avisarMudanca(player);
  msg(player, cor ? textos.COR_MSG_OK(`§${cor}${/** @type {any} */ (textos.NOMES_COR_MSG)[cor]}§r`) : textos.COR_MSG_TIRADA);
  return true;
}

/**
 * Menu da cor da mensagem.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuCorMensagem(player, voltar) {
  if (!temSelo(player)) {
    erro(player, textos.SO_KITSUNE);
    return voltar?.();
  }
  const aqui = () => menuCorMensagem(player, voltar);
  const atual = corMensagemDe(player);
  const lista = new Lista(textos.TITULO_COR_MSG).texto(textos.CORPO_COR_MSG);
  lista.botao(textos.BOTAO_COR_PADRAO(atual === ""), ICONES.nao, async (p) => {
    definirCorMensagem(p, "");
    await aqui();
  });
  for (const cor of CORES_MENSAGEM) {
    lista.botao(textos.BOTAO_COR_ITEM(cor, /** @type {any} */ (textos.NOMES_COR_MSG)[cor], cor === atual), ICONES.tema, async (p) => {
      definirCorMensagem(p, cor);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Rótulo da cor atual para o botão do Cantinho.
 * @param {Player} player
 */
export function nomeCorMensagem(player) {
  const cor = corMensagemDe(player);
  return cor ? `§${cor}${/** @type {any} */ (textos.NOMES_COR_MSG)[cor]}§r` : "";
}
