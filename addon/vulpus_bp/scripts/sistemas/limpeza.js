// @ts-check
// Limpeza automática: de tempos em tempos (padrão 30 min, nas horas cheias de Brasília) avisa no chat e na actionbar
// (30 s, 10 s e uma contagem lenta de 5 a 0) e remove os itens soltos no chão e os mobs hostis das dimensões vanilla.
// Nunca mexe em dimensões vulpus:*, em entidades vulpus:*, em itens com nome/lore/trava, em mobs nomeados, domesticados,
// chefes, nem em quem está a menos de 8 blocos de uma pessoa. O trabalho sai em lotes para não dar pico.
// Painel: Staff > Configurações > Limpeza automática (limpeza_staff.js). Textos em textos/limpeza.js.
import { system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { pontoEmZona } from "../core/arg_zona.js";
import { online } from "../core/jogadores.js";
import { registrarErro, som } from "../core/util.js";
import { PREFIXO } from "../textos/geral.js";
import * as textos from "../textos/limpeza.js";
import { posicaoArmazem } from "./leilao_armazem.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ e: Entity, tipo: "item" | "mob" }} Alvo */
/** @typedef {"aviso" | "imediato"} ModoManual */

/** Dimensões onde se limpa. As vulpus:* (lobby, minigames, Intervalo, Masmorra) ficam de fora de propósito. */
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const CHEFES = new Set(["minecraft:ender_dragon", "minecraft:wither", "minecraft:warden", "minecraft:elder_guardian"]);
const CHAVE_ULTIMA = "vulpus:limpeza:ultima";

const MINUTO = 60 * 1000;
const FUSO_BRASILIA_MS = -3 * 60 * MINUTO;
const DIA_MS = 24 * 60 * MINUTO;
/** Linha do tempo (em ticks desde o aviso de 30 s): 10 s aos 400, "5" aos 500, depois um número a cada 30 ticks, 0 aos 650. */
const TICK_AVISO_10 = 400;
const TICK_CONTAGEM_5 = 500;
const PASSO_CONTAGEM = 30;
const TICK_FIM = TICK_CONTAGEM_5 + 5 * PASSO_CONTAGEM;
/** A limpeza acontece na hora marcada: o aviso de 30 s começa tantos ms antes. */
const ANTECEDENCIA_MS = (TICK_FIM / 20) * 1000;
const ESPERA_SEM_JOGADORES_MS = 5 * MINUTO;
const LOTE = 40;
const DIST_JOGADOR = 8;
const DIST_ARMAZEM = 16;
const CHECAGEM_TICKS = 20;

/** @type {number | undefined} ms da próxima limpeza (a hora marcada, não o início do aviso) */
let proxima;
/** Intervalo (min) com que `proxima` foi calculada. */
let intervaloUsado = 0;
/** Limpeza em andamento (aviso, contagem ou remoção). */
let andando = false;
/** @type {number | undefined} */
let tarefa;

// ------------------------------------------------------------------------------------ agenda (relógio de parede)
/**
 * Próxima hora marcada depois de `ms`: múltiplos do intervalo contados da meia-noite de Brasília (30 min = :00 e :30).
 * O último passo do dia termina à meia-noite.
 * @param {number} ms
 * @param {number} intervaloMin
 */
export function proximoSlot(ms, intervaloMin) {
  const passo = Math.max(1, Math.floor(intervaloMin)) * MINUTO;
  const local = ms + FUSO_BRASILIA_MS;
  const inicioDia = Math.floor(local / DIA_MS) * DIA_MS;
  const k = Math.floor((local - inicioDia) / passo) + 1;
  return Math.min(inicioDia + k * passo, inicioDia + DIA_MS) - FUSO_BRASILIA_MS;
}

/**
 * Se a hora cai perto do reinício do servidor (00:00 e 12:00 de Brasília; a hospedagem avisa às HH:55): de HH:55 a HH:05.
 * @param {number} ms
 */
export function emJanelaReinicio(ms) {
  const minuto = Math.floor((((ms + FUSO_BRASILIA_MS) % DIA_MS) + DIA_MS) % DIA_MS / MINUTO);
  return minuto >= 23 * 60 + 55 || minuto <= 5 || (minuto >= 11 * 60 + 55 && minuto <= 12 * 60 + 5);
}

/** "HH:MM" em Brasília. @param {number} ms */
export function formatarHora(ms) {
  const d = new Date(ms + FUSO_BRASILIA_MS);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Calcula de novo a próxima hora se o intervalo mudou ou se ainda não existe. Nunca começa um aviso já em curso. */
function conferirAgenda() {
  const intervalo = config().limpezaIntervaloMin;
  if (proxima !== undefined && intervaloUsado === intervalo) return;
  intervaloUsado = intervalo;
  proxima = proximoSlot(Date.now() + ANTECEDENCIA_MS, intervalo);
}

/** Quando é a próxima limpeza agendada (ms). */
export function proximaLimpeza() {
  conferirAgenda();
  return /** @type {number} */ (proxima);
}

/** Se há uma limpeza acontecendo agora. */
export const limpezaAndando = () => andando;

/** Última limpeza feita: { t, itens, mobs } ou undefined. */
export function ultimaLimpeza() {
  const u = lerMundo(CHAVE_ULTIMA);
  if (!u || typeof u.t !== "number" || typeof u.itens !== "number" || typeof u.mobs !== "number") return undefined;
  return /** @type {{ t: number, itens: number, mobs: number }} */ (u);
}

// ------------------------------------------------------------------------------------ o que pode ser removido
/**
 * @param {Entity} e
 * @returns {{ x: number, y: number, z: number, d: string } | undefined}
 */
function ponto(e) {
  try {
    const l = e.location;
    return { x: l.x, y: l.y, z: l.z, d: e.dimension.id };
  } catch {
    return undefined;
  }
}

/** Se o ponto está na zona do mistério ou perto do baú do armazém do leilão. @param {{ x: number, y: number, z: number, d: string }} p */
function emAreaProtegida(p) {
  if (pontoEmZona(p)) return true;
  const a = posicaoArmazem();
  return !!a && a.d === p.d && Math.hypot(a.x - p.x, a.z - p.z) <= DIST_ARMAZEM;
}

/**
 * Item solto que pode sumir (e quantos itens tem). Item ilegível, nomeado, com lore, travado ou do addon fica.
 * @param {Entity} e
 * @returns {number} quantidade, ou 0 se deve ficar
 */
function itemRemovivel(e) {
  const p = ponto(e);
  if (!p || emAreaProtegida(p)) return 0;
  const pilha = e.getComponent("minecraft:item")?.itemStack;
  if (!pilha || pilha.typeId.startsWith("vulpus:")) return 0;
  if (pilha.nameTag || pilha.getLore().length > 0 || pilha.lockMode !== "none") return 0;
  return Math.max(1, pilha.amount);
}

/**
 * Mob hostil que pode sumir.
 * @param {Entity} e
 */
function mobRemovivel(e) {
  if (e.typeId.startsWith("vulpus:") || CHEFES.has(e.typeId) || e.nameTag) return false;
  if (e.getTags().some((t) => t.startsWith("vulpus"))) return false;
  if (e.getComponent("minecraft:is_tamed")) return false;
  const p = ponto(e);
  return !!p && !emAreaProtegida(p);
}

/** Alguma pessoa a menos de 8 blocos (na mesma dimensão). @param {Entity} e @param {readonly import("@minecraft/server").Player[]} jogadores */
function pertoDeAlguem(e, jogadores) {
  const l = e.location;
  const d = e.dimension.id;
  return jogadores.some((j) => {
    try {
      return j.isValid && j.dimension.id === d && Math.hypot(j.location.x - l.x, j.location.y - l.y, j.location.z - l.z) <= DIST_JOGADOR;
    } catch {
      return true;
    }
  });
}

/**
 * Junta o que será removido (só em chunks carregados: getEntities já cobre).
 * @param {{ itens: boolean, mobs: boolean }} c
 * @returns {Alvo[]}
 */
function coletar(c) {
  /** @type {Alvo[]} */
  const alvos = [];
  for (const id of DIMENSOES) {
    try {
      const dim = world.getDimension(id);
      if (c.itens) {
        for (const e of dim.getEntities({ type: "minecraft:item" })) {
          try {
            if (itemRemovivel(e) > 0) alvos.push({ e, tipo: "item" });
          } catch {
            // ilegível: fica
          }
        }
      }
      if (c.mobs) {
        for (const e of dim.getEntities({ families: ["monster"] })) {
          try {
            if (mobRemovivel(e)) alvos.push({ e, tipo: "mob" });
          } catch {
            // ilegível: fica
          }
        }
      }
    } catch (e) {
      registrarErro(`Limpeza (${id})`, e);
    }
  }
  return alvos;
}

// ------------------------------------------------------------------------------------ execução
/** Remove a fila em lotes de 40 por tick e, no fim, conta o resultado. @param {Alvo[]} fila */
function removerEmLotes(fila) {
  let itens = 0;
  let mobs = 0;
  let i = 0;
  const id = system.runInterval(() => {
    try {
      const jogadores = world.getAllPlayers();
      for (const fim = Math.min(fila.length, i + LOTE); i < fim; i++) {
        const { e, tipo } = fila[i];
        try {
          if (!e.isValid) continue;
          if (tipo === "mob" && pertoDeAlguem(e, jogadores)) continue;
          const qtd = tipo === "item" ? itemRemovivel(e) : 1;
          if (qtd === 0) continue;
          e.remove();
          if (tipo === "item") itens += qtd;
          else mobs++;
        } catch (err) {
          registrarErro("Limpeza (remover)", err);
        }
      }
      if (i < fila.length) return;
    } catch (err) {
      registrarErro("Limpeza (lote)", err);
    }
    system.clearRun(id);
    terminar(itens, mobs);
  }, 1);
}

/** @param {number} itens @param {number} mobs */
function terminar(itens, mobs) {
  try {
    salvarMundo(CHAVE_ULTIMA, { t: Date.now(), itens, mobs });
  } catch (e) {
    registrarErro("Limpeza (salvar)", e);
  }
  try {
    world.sendMessage(PREFIXO + textos.RESULTADO(itens, mobs));
  } catch (e) {
    registrarErro("Limpeza (resultado)", e);
  }
  andando = false;
  tarefa = undefined;
  proxima = proximoSlot(Date.now() + ANTECEDENCIA_MS, config().limpezaIntervaloMin);
  intervaloUsado = config().limpezaIntervaloMin;
}

/** Executa a limpeza de verdade (os itens e mobs são lidos agora, não no aviso). */
function executar() {
  try {
    const c = config();
    removerEmLotes(coletar({ itens: c.limpezaItens, mobs: c.limpezaMobs }));
  } catch (e) {
    registrarErro("Limpeza", e);
    terminar(0, 0);
  }
}

/**
 * Mostra um texto curto na actionbar de todos (com um som suave).
 * @param {string} texto
 * @param {string} [som_]  id do som
 */
function mostrar(texto, som_ = "note.hat") {
  for (const p of online()) {
    try {
      p.onScreenDisplay.setActionBar(texto);
    } catch (e) {
      registrarErro("Limpeza (actionbar)", e);
    }
    som(p, som_, { volume: 0.5 });
  }
}

/** @param {string} texto */
function avisarChat(texto) {
  try {
    world.sendMessage(PREFIXO + texto);
  } catch (e) {
    registrarErro("Limpeza (aviso)", e);
  }
}

/**
 * Roda a linha do tempo a partir de `inicio` (ticks). `cancelavel`: a limpeza agendada some se a staff a desligar no meio.
 * @param {number} inicio
 * @param {boolean} cancelavel
 */
function comecar(inicio, cancelavel) {
  andando = true;
  let n = inicio;
  const passo = () => {
    try {
      if (cancelavel && !config().limpezaLigada) {
        if (tarefa !== undefined) system.clearRun(tarefa);
        andando = false;
        tarefa = undefined;
        proxima = proximoSlot(Date.now() + ANTECEDENCIA_MS, config().limpezaIntervaloMin);
        return;
      }
      if (n === 0) {
        avisarChat(textos.AVISO_30);
        mostrar(textos.AVISO_30, "note.hat");
      } else if (n === TICK_AVISO_10) {
        avisarChat(textos.AVISO_10);
        mostrar(textos.AVISO_10, "note.hat");
      } else if (n >= TICK_CONTAGEM_5 && (n - TICK_CONTAGEM_5) % PASSO_CONTAGEM === 0) {
        const falta = 5 - (n - TICK_CONTAGEM_5) / PASSO_CONTAGEM;
        mostrar(textos.CONTAGEM(falta), falta === 0 ? "note.pling" : "note.hat");
        if (falta === 0) {
          if (tarefa !== undefined) system.clearRun(tarefa);
          tarefa = undefined;
          executar();
          return;
        }
      }
      n++;
    } catch (e) {
      registrarErro("Limpeza (aviso)", e);
      n++;
    }
  };
  tarefa = system.runInterval(passo, 1);
}

/**
 * Limpeza pedida pela staff: com aviso de 10 s ("aviso") ou imediata, sem aviso ("imediato", só dono).
 * Não mexe na agenda. @param {ModoManual} modo
 * @returns {"ok" | "andando" | "nada"}
 */
export function limparAgora(modo) {
  if (andando) return "andando";
  const c = config();
  if (!c.limpezaItens && !c.limpezaMobs) return "nada";
  if (modo === "imediato") {
    andando = true;
    executar();
  } else comecar(TICK_AVISO_10, false);
  return "ok";
}

// ------------------------------------------------------------------------------------ agenda
system.runInterval(() => {
  try {
    if (andando) return;
    conferirAgenda();
    const agora = Date.now();
    const marcada = /** @type {number} */ (proxima);
    if (agora < marcada - ANTECEDENCIA_MS) return;
    const c = config();
    const seguinte = () => {
      proxima = proximoSlot(Math.max(agora, marcada) + ANTECEDENCIA_MS, c.limpezaIntervaloMin);
    };
    // Perdeu a hora (servidor travado): pula em vez de avisar fora de tempo. Desligada ou perto do reinício: também pula.
    if (agora > marcada || !c.limpezaLigada || (!c.limpezaItens && !c.limpezaMobs) || emJanelaReinicio(marcada)) return seguinte();
    if (online().length === 0) {
      proxima = agora + ESPERA_SEM_JOGADORES_MS;
      return;
    }
    comecar(0, true);
  } catch (e) {
    registrarErro("Limpeza (agenda)", e);
  }
}, CHECAGEM_TICKS);
