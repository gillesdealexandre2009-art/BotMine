// @ts-check
// Durabilidade no HUD: linha da mão e da peça de armadura mais gasta na caixa lateral (sistemas/hud.js) e aviso curto no chat
// quando um item está quase quebrando. Não usa a barra de ação nem pausa nada. Cada jogador escolhe em Ajustes
// (ajustes.durabilidade) e a staff desliga tudo em Staff > Configurações > Durabilidade no HUD.
// Só lê o inventário e o equipamento a cada ciclo do HUD (10 ticks) e guarda a última leitura por jogador: sem mudança de
// typeId/dano nada é refeito.
import { EquipmentSlot, GameMode, world } from "@minecraft/server";
import { config, dadosJogador } from "../core/db.js";
import { msg, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/durabilidade.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").ItemStack} ItemStack */
/** @typedef {"tudo" | "armadura" | "alerta" | "desligado"} ModoDurabilidade */
/** @typedef {{ chave: string, nome: string, pct: number, exato: number }} Leitura  pct = % que sobra (inteiro, 1..100 enquanto não quebra); exato = o mesmo sem arredondar */

/** Os modos na ordem do seletor. @type {readonly ModoDurabilidade[]} */
export const MODOS = Object.freeze(["tudo", "armadura", "alerta", "desligado"]);

/** Margem acima do limite do alerta para ele poder avisar de novo (histerese), em pontos percentuais. */
const HISTERESE = 3;

/** Peças vestidas, da cabeça aos pés. */
const PECAS = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];

/** @type {Map<string, { assinatura: string, mao: Leitura | null, pecas: Leitura[] }>} id → última leitura */
const cache = new Map();
/** @type {Map<string, Map<string, number>>} id → (slot|typeId → nível já avisado: 1 = quase quebrando, 2 = crítico) */
const avisados = new Map();

/**
 * Modo escolhido pelo jogador; "desligado" quando a staff desligou a função.
 * @param {Player} player
 * @returns {ModoDurabilidade}
 */
export function modoDurabilidade(player) {
  if (!config().durabilidadeHudLigado) return "desligado";
  return dadosJogador(player).ajustes.durabilidade;
}

/** @param {Player} player */
function modoDeJogo(player) {
  const m = player.getGameMode();
  return m !== GameMode.Creative && m !== GameMode.Spectator;
}

/**
 * Lê durabilidade de um item; null sem componente, sem dano disponível ou com valores inválidos.
 * @param {string} chave
 * @param {ItemStack | undefined} item
 * @returns {Leitura | null}
 */
function ler(chave, item) {
  if (!item) return null;
  try {
    const dur = item.getComponent("minecraft:durability");
    if (!dur) return null;
    const max = dur.maxDurability;
    const dano = dur.damage;
    if (typeof max !== "number" || typeof dano !== "number" || !(max > 0) || dano < 0) return null;
    const exato = Math.max(0, ((max - dano) / max) * 100);
    const pct = dano >= max ? 0 : Math.min(100, Math.max(1, Math.round(exato)));
    return { chave: `${chave}|${item.typeId}`, nome: textos.nomeCurto(item.typeId), pct, exato };
  } catch {
    return null;
  }
}

/**
 * Última leitura do jogador (mão e peças). Refaz as strings só se typeId/dano mudaram.
 * @param {Player} player
 */
function leitura(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  const equip = player.getComponent("minecraft:equippable");
  const slot = player.selectedSlotIndex;
  /** @type {(ItemStack | undefined)[]} */
  const itens = [inv?.getItem(slot), ...PECAS.map((s) => equip?.getEquipment(s))];
  const assinatura = itens
    .map((it) => {
      if (!it) return "-";
      try {
        const dur = it.getComponent("minecraft:durability");
        return dur ? `${it.typeId}:${dur.damage}` : it.typeId;
      } catch {
        return `${it.typeId}:?`; // damage indisponível: o item é ignorado
      }
    })
    .join("|") + `@${slot}`;
  const antes = cache.get(player.id);
  if (antes && antes.assinatura === assinatura) return antes;
  const mao = ler(`m${slot}`, itens[0]);
  const pecas = PECAS.flatMap((s, i) => {
    const l = ler(String(s), itens[i + 1]);
    return l ? [l] : [];
  });
  const novo = { assinatura, mao, pecas };
  cache.set(player.id, novo);
  return novo;
}

/** Cor da porcentagem: verde acima de 50, amarelo de 20 a 50, vermelho abaixo de 20. @param {number} pct */
export const corDaFaixa = (pct) => (pct > 50 ? "§a" : pct >= 20 ? "§e" : "§c");

/**
 * Linhas de durabilidade para a caixa lateral (0, 1 ou 2): a mão e a peça vestida mais gasta abaixo do limite.
 * Vazio para criativo/espectador e conforme o modo. Só o HUD normal chama isto.
 * @param {Player} player
 * @returns {string[]}
 */
export function linhasDurabilidade(player) {
  const modo = modoDurabilidade(player);
  if (modo === "desligado" || modo === "alerta" || !modoDeJogo(player)) {
    cache.delete(player.id);
    return [];
  }
  const l = leitura(player);
  const linhas = [];
  if (modo === "tudo" && l.mao) linhas.push(textos.LINHA(l.mao.nome, l.mao.pct, corDaFaixa(l.mao.pct)));
  const limite = config().durabilidadeArmaduraLimite;
  let pior = null;
  for (const p of l.pecas) if (p.pct < limite && (!pior || p.exato < pior.exato)) pior = p;
  if (pior) linhas.push(textos.LINHA(pior.nome, pior.pct, corDaFaixa(pior.pct)));
  return linhas;
}

/**
 * Avisa no chat (uma vez por item/peça e por faixa) quando algo está quase quebrando. Chamado a cada ciclo do HUD,
 * mesmo com o HUD desligado. Não faz nada em criativo/espectador, com a função ou o alerta desligados.
 * @param {Player} player
 */
export function verificarAlerta(player) {
  const modo = modoDurabilidade(player);
  const limite = config().durabilidadeAlertaLimite;
  if (modo === "desligado" || !modoDeJogo(player)) {
    cache.delete(player.id);
    avisados.delete(player.id);
    return;
  }
  if (limite <= 0) return; // alerta desligado pela staff (a memória dos avisos fica, para não repetir tudo ao religar)
  const l = leitura(player);
  let mapa = avisados.get(player.id);
  // "Só armadura" alerta só das peças vestidas; "Mão e armadura" e "Só alerta" alertam das duas coisas
  const lista = modo === "armadura" ? l.pecas : l.mao ? [l.mao, ...l.pecas] : l.pecas;
  const critico = Math.max(1, Math.floor(limite / 3));
  for (const it of lista) {
    const nivel = it.exato < critico ? 2 : it.exato < limite ? 1 : 0;
    const dito = mapa?.get(it.chave) ?? 0;
    if (nivel > dito) {
      if (!mapa) avisados.set(player.id, (mapa = new Map()));
      mapa.set(it.chave, nivel);
      msg(player, textos.ALERTA(it.nome, it.pct, nivel === 2));
      som(player, "note.bass", { volume: 0.4, pitch: nivel === 2 ? 0.7 : 1 });
    } else if (dito && it.exato >= limite + HISTERESE) {
      mapa?.delete(it.chave);
    } else if (dito === 2 && it.exato >= critico + HISTERESE) {
      mapa?.set(it.chave, 1);
    }
  }
}

/**
 * Chamado pelo loop do HUD: o alerta nunca derruba o ciclo.
 * @param {Player} player
 */
export function cicloAlerta(player) {
  try {
    verificarAlerta(player);
  } catch (e) {
    registrarErro(`Alerta de durabilidade de ${player.name}`, e);
  }
}

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  cache.delete(playerId);
  avisados.delete(playerId);
});
