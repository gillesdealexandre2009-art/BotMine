// @ts-check
// Mecânicas das Eras (EraMechanics): buffs e debuffs, multiplicadores e prêmios que valem só enquanto a Era oficial os manda. Tudo é
// regra de script, temporária e reversível: efeitos de poção curtos (5 s) que expiram sozinhos, multiplicadores consultados na hora
// (XP, Caudas do tempo online, bônus de venda no leilão) e prêmios com chance e teto por dia. Nada mexe em blocos, terreno,
// entidades, inventário ou construções, e nada que a pessoa já ganhou é tirado quando a Era acaba. Fora do Mundo normal, em
// ambientes especiais (Intervalo, ARG, minigames), em criativo/espectador e em combate, as Eras não mexem em nada.
// A prévia de uma Era é só visual: aqui só vale a Era oficial.
import { GameMode, ItemStack, Player, system, world } from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import { registrarModificadores } from "../core/eras_modificadores.js";
import { online } from "../core/jogadores.js";
import { emCombate } from "../core/teleporte.js";
import { diaBrasilia, msg, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/eras.js";
import { adicionarCaudas } from "./caudas.js";
import { lerEstado, mecanicasValem, situacao } from "./eras_calendario.js";
import { LIMITES } from "./eras_catalogo.js";
import { eventoAtivo } from "./eras_eventos.js";
import { emAmbienteEspecial } from "./eras_visual.js";
import { estaSumido } from "./sumico.js";

/** @typedef {import("./eras_catalogo.js").Perfil} Perfil */
/** @typedef {import("./eras_catalogo.js").Mecanicas} Mecanicas */
/** @typedef {import("./eras_catalogo.js").Condicao} Condicao */

const PASSO_EFEITOS = 40;
const DURACAO_EFEITO = 100;
const PASSO_PULSO = 100;
const CHAVE_DIA = "vulpus:eras:dia";

/** Plantações que contam para o bônus de venda do leilão. */
export const PLANTACOES = new Set([
  "minecraft:wheat", "minecraft:carrot", "minecraft:potato", "minecraft:beetroot", "minecraft:melon_slice", "minecraft:melon_block",
  "minecraft:pumpkin", "minecraft:sweet_berries", "minecraft:glow_berries", "minecraft:nether_wart", "minecraft:sugar_cane",
  "minecraft:cocoa_beans",
]);
/** Plantações que dão prêmio ao colher, com o estado que diz "madura". */
const CULTURAS = /** @type {Record<string, [string, number]>} */ ({
  "minecraft:wheat": ["growth", 7],
  "minecraft:carrots": ["growth", 7],
  "minecraft:potatoes": ["growth", 7],
  "minecraft:beetroot": ["growth", 7],
  "minecraft:nether_wart": ["age", 3],
});
const MINERIO = /(?:_ore|ancient_debris)$/;

// ------------------------------------------------------------------ Era e contexto

/** O acontecimento valendo agora, com os bônus (só se as mecânicas valem). @returns {import("./eras_eventos.js").Evento | undefined} */
export function eventoMecanico() {
  const s = situacao();
  if (!mecanicasValem(s, lerEstado())) return undefined;
  return eventoAtivo(s.numero)?.evento;
}

/** As mecânicas da Era oficial agora, ou undefined se não valem (sem temporada, encerrada ou desligadas). @returns {Mecanicas | undefined} */
export function mecanicasAtuais() {
  const s = situacao();
  if (!mecanicasValem(s, lerEstado()) || !s.era) return undefined;
  return s.era.mecanicas;
}

/** A Era pode mexer nesta pessoa agora? @param {Player} p */
export function elegivel(p) {
  try {
    if (!p.isValid || emAmbienteEspecial(p) || estaSumido(p)) return false;
    const modo = p.getGameMode();
    return modo !== GameMode.Creative && modo !== GameMode.Spectator;
  } catch {
    return false;
  }
}

const FOLHAS_DESLOCAMENTOS = (() => {
  /** @type {[number, number, number][]} */
  const l = [];
  for (const dy of [0, 1, 2, 3]) for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1]]) l.push([dx, dy, dz]);
  return l;
})();

/**
 * Calcula só as condições pedidas (as caras, como folhas e céu, só quando alguma regra precisa).
 * @param {Player} p
 * @param {Set<Condicao>} precisa
 * @returns {Set<Condicao>}
 */
export function condicoesDe(p, precisa) {
  /** @type {Set<Condicao>} */
  const v = new Set(["sempre"]);
  const { x, y, z } = p.location;
  if (precisa.has("dia") || precisa.has("noite")) {
    const t = typeof world.getTimeOfDay === "function" ? world.getTimeOfDay() : 1000;
    if (t >= 13000 && t < 23000) v.add("noite");
    else if (t < 12000) v.add("dia");
  }
  if (precisa.has("ceu") || precisa.has("teto") || precisa.has("caverna")) {
    let ceu = false;
    try {
      const topo = p.dimension.getTopmostBlock({ x: Math.floor(x), z: Math.floor(z) });
      ceu = !topo || topo.location.y <= Math.floor(y);
    } catch {
      ceu = false;
    }
    if (ceu) v.add("ceu");
    else {
      v.add("teto");
      if (y < 50) v.add("caverna");
    }
  }
  if (precisa.has("agua") && p.isInWater) v.add("agua");
  if (precisa.has("altura") && y > 90) v.add("altura");
  if (precisa.has("folhas")) {
    let n = 0;
    for (const [dx, dy, dz] of FOLHAS_DESLOCAMENTOS) {
      try {
        const b = p.dimension.getBlock({ x: Math.floor(x) + dx, y: Math.floor(y) + dy, z: Math.floor(z) + dz });
        if (b?.typeId.includes("leaves")) n++;
      } catch {
        break;
      }
    }
    if (n >= 4) v.add("folhas");
  }
  return v;
}

/** @param {Condicao[] | undefined} quando @param {Set<Condicao>} v */
const vale = (quando, v) => !quando || quando.every((c) => v.has(c));

// ------------------------------------------------------------------ efeitos de poção

/**
 * Aplica o efeito sem rebaixar um mais forte (ou mais longo, do mesmo nível) que a pessoa já tenha de outra fonte.
 * @param {Player} p
 * @param {string} efeito
 * @param {number} nivel
 */
function aplicarEfeito(p, efeito, nivel) {
  try {
    const atual = p.getEffect?.(efeito);
    if (atual && (atual.amplifier > nivel || (atual.amplifier === nivel && atual.duration > DURACAO_EFEITO))) return;
  } catch {
    // sem como conferir: aplica mesmo assim
  }
  p.addEffect(efeito, DURACAO_EFEITO, { amplifier: nivel, showParticles: false });
}

function rodarEfeitos() {
  const m = mecanicasAtuais();
  const lista = [...(m?.efeitos ?? []), ...(eventoMecanico()?.efeitos ?? [])];
  if (lista.length === 0) return;
  /** @type {Set<Condicao>} */
  const precisa = new Set();
  for (const f of lista) for (const c of f.quando) precisa.add(c);
  for (const p of online()) {
    try {
      if (!elegivel(p) || emCombate(p)) continue;
      const v = condicoesDe(p, precisa);
      for (const f of lista) {
        if (vale(f.quando, v)) aplicarEfeito(p, f.efeito, f.nivel);
      }
    } catch (e) {
      registrarErro("Eras: efeitos", e);
    }
  }
}

// ------------------------------------------------------------------ pulso (janela periódica para todos)

/**
 * O pulso da Era está ativo agora? A primeira janela vem depois de um ciclo completo desde o início da Era.
 * @param {number} [agora]
 * @returns {{ nome: string, xp: number, caudas: number, restanteSeg: number, ciclo: number } | undefined}
 */
export function pulsoAtivo(agora = Date.now()) {
  const s = situacao(agora);
  const m = s.era?.mecanicas;
  if (!m?.pulso || !mecanicasValem(s, lerEstado())) return undefined;
  const ciclo = m.pulso.cadaMin * 60000;
  const passou = agora - s.inicioEra;
  if (passou < ciclo) return undefined;
  const pos = passou % ciclo;
  const dur = m.pulso.duracaoSeg * 1000;
  if (pos >= dur) return undefined;
  return { nome: m.pulso.nome, xp: m.pulso.xp ?? 1, caudas: m.pulso.caudas ?? 1, restanteSeg: Math.ceil((dur - pos) / 1000), ciclo: Math.floor(passou / ciclo) };
}

/** @type {{ era: number, ciclo: number, nome: string } | undefined} */
let anunciado;

function vigiarPulso() {
  try {
    const p = pulsoAtivo();
    if (!p) {
      if (anunciado) {
        for (const j of online()) if (elegivel(j)) msg(j, textos.PULSO_TERMINOU(anunciado.nome));
        anunciado = undefined;
      }
      return;
    }
    const era = situacao().numero;
    if (anunciado && anunciado.era === era && anunciado.ciclo === p.ciclo) return;
    anunciado = { era, ciclo: p.ciclo, nome: p.nome };
    if (p.restanteSeg < 10) return; // o servidor voltou no fim da janela: não vale anunciar
    for (const j of online()) {
      if (!elegivel(j)) continue;
      msg(j, textos.PULSO_COMECOU(p.nome, p.restanteSeg));
      som(j, "random.levelup", { volume: 0.5, pitch: 1.3 });
    }
  } catch (e) {
    registrarErro("Eras: pulso", e);
  }
}

// ------------------------------------------------------------------ multiplicadores (XP, Caudas do tempo, venda)

/** @param {number} n */
const limitar = (n) => Math.min(LIMITES.multMax, Math.max(1, n));

/** @param {Player} p @param {"xp" | "caudasMinuto"} qual */
function multiplicadorDe(p, qual) {
  const m = mecanicasAtuais();
  if (!m || !elegivel(p)) return 1;
  let total = 1;
  const regra = m[qual];
  if (regra) {
    if (!regra.quando) total *= regra.mult;
    else if (vale(regra.quando, condicoesDe(p, new Set(regra.quando)))) total *= regra.mult;
  }
  const pulso = pulsoAtivo();
  if (pulso) total *= qual === "xp" ? pulso.xp : pulso.caudas;
  if (qual === "xp") total *= eventoMecanico()?.xp ?? 1;
  return limitar(total);
}

// ------------------------------------------------------------------ limites por dia

/** @typedef {{ c: number, m: number, a: number, v: number }} Contagem  colheita, minério, abate, bônus de venda pagos hoje */
/** @type {{ dia: string, j: Record<string, Contagem> } | undefined} */
let hoje;

/** @param {string} id @returns {Contagem} */
function contagemDe(id) {
  const dia = diaBrasilia(Date.now());
  if (!hoje || hoje.dia !== dia) {
    const salvo = lerMundo(CHAVE_DIA);
    hoje = salvo && salvo.dia === dia && salvo.j && typeof salvo.j === "object" ? { dia, j: salvo.j } : { dia, j: {} };
  }
  return (hoje.j[id] ??= { c: 0, m: 0, a: 0, v: 0 });
}

function gravarDia() {
  if (hoje) salvarMundo(CHAVE_DIA, hoje);
}

/** Quanto cada prêmio já rendeu hoje a esta pessoa (para o painel do dono e os testes). @param {string} id */
export function contagemHoje(id) {
  return { ...contagemDe(id) };
}

// ------------------------------------------------------------------ prêmios: colheita, minério, abate

/** @param {number} a @param {number} b */
const sorteio = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

world.afterEvents.playerBreakBlock.subscribe(({ player, block, brokenBlockPermutation }) => {
  try {
    const m = mecanicasAtuais();
    if (!m || (!m.colheita && !m.minerio) || !elegivel(player)) return;
    const tipo = brokenBlockPermutation.type.id;
    const c = contagemDe(player.id);
    const cultura = CULTURAS[tipo];
    if (m.colheita && cultura && Number(/** @type {any} */ (brokenBlockPermutation).getState(cultura[0])) >= cultura[1]) {
      const chance = Math.min(0.95, m.colheita.chance * (eventoMecanico()?.colheitaX ?? 1));
      if (c.c >= m.colheita.tetoDia || Math.random() >= chance) return;
      const [id, minimo, maximo] = m.colheita.premios[Math.floor(Math.random() * m.colheita.premios.length)];
      const qtd = sorteio(minimo, maximo);
      const { x, y, z } = block.location;
      block.dimension.spawnItem(new ItemStack(id, qtd), { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
      c.c++;
      gravarDia();
      msg(player, textos.PREMIO_COLHEITA(qtd, textos.NOME_ITEM(id)));
      som(player, "random.orb", { volume: 0.6, pitch: 1.4 });
      return;
    }
    if (m.minerio && MINERIO.test(tipo)) {
      const chance = Math.min(0.95, m.minerio.chance * (eventoMecanico()?.minerioX ?? 1));
      if (c.m >= m.minerio.tetoDia || Math.random() >= chance) return;
      adicionarCaudas(player, m.minerio.caudas);
      c.m++;
      gravarDia();
      msg(player, textos.PREMIO_MINERIO(m.minerio.caudas));
      som(player, "random.orb", { volume: 0.6, pitch: 1.2 });
    }
  } catch (e) {
    registrarErro("Eras: prêmio de quebra", e);
  }
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    const m = mecanicasAtuais();
    if (!m?.abate) return;
    const quem = damageSource.damagingEntity;
    if (!(quem instanceof Player) || !elegivel(quem)) return;
    if (deadEntity instanceof Player || deadEntity.typeId.startsWith("vulpus:")) return;
    if (!deadEntity.getComponent("minecraft:type_family")?.hasTypeFamily("monster")) return;
    if (m.abate.quando && !vale(m.abate.quando, condicoesDe(quem, new Set(m.abate.quando)))) return;
    const c = contagemDe(quem.id);
    if (c.a >= m.abate.tetoDia) return;
    const caudas = Math.floor(m.abate.caudas * (eventoMecanico()?.abateX ?? 1));
    adicionarCaudas(quem, caudas);
    c.a++;
    gravarDia();
    msg(quem, textos.PREMIO_ABATE(caudas));
  } catch (e) {
    registrarErro("Eras: prêmio de abate", e);
  }
});

/**
 * Bônus de venda no leilão: só plantações, pago em Caudas (nunca duplica itens), com teto por venda, por item e por dia do vendedor.
 * @param {string} vendedorId
 * @param {string} itemTipo
 * @param {number} liquido
 * @param {number} quantidade
 */
function bonusVenda(vendedorId, itemTipo, liquido, quantidade) {
  const m = mecanicasAtuais();
  if (!m?.venda || !PLANTACOES.has(itemTipo) || !(liquido > 0)) return 0;
  const c = contagemDe(vendedorId);
  const restante = m.venda.tetoDia - c.v;
  const bonus = Math.min(Math.floor(liquido * (m.venda.mult - 1)), m.venda.teto, Math.max(0, quantidade) * m.venda.porItem, restante);
  if (!(bonus > 0)) return 0;
  c.v += bonus;
  gravarDia();
  return bonus;
}

registrarModificadores({
  xp: (p) => multiplicadorDe(p, "xp"),
  caudasMinuto: (p) => multiplicadorDe(p, "caudasMinuto"),
  bonusVenda,
});

system.runInterval(rodarEfeitos, PASSO_EFEITOS);
system.runInterval(vigiarPulso, PASSO_PULSO);
