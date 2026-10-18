// @ts-check
// Quadro de Aventureiros: a Yuki, uma raposinha branca no templo do topo da montanha, dá 3 quests por dia (monstros do mundo
// aberto, minérios e masmorra). A pessoa aceita no quadro, cumpre e volta para entregar. O teto é de 3 quests por pessoa por
// dia (mais um bônus pelas três), então o ganho diário em Caudas tem limite. A staff põe a Yuki pelo menu Mundo e locais.
import { Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { achadas, esquecerBusca } from "../core/entidades.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista } from "../core/forms.js";
import { posicoesOnline } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { diaBrasilia, erro, formatarCoords, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import { INIMIGOS } from "../textos/masm_inimigos_dados.js";
import { participantes } from "./masm_golpes.js";
import { INDICE_PRIMEIRO_VIVO, MODELOS as NOMES_MODELOS } from "../textos/props_modelos.js";
import * as textos from "../textos/aventura.js";
import { adicionarCaudas } from "./caudas.js";
import { ganharXp } from "./niveis.js";
import { darFicha } from "./pets_bonus.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string, yaw: number }} Ponto */
/** @typedef {{ tipo: string, n: number, titulo: string, dica: string, mult: number }} Quest */
/** @typedef {{ dia: string, q: { e: number, p: number }[], bonus: boolean, perfeitos: number }} Estado  e: 0 aberta, 1 em andamento, 2 pronta, 3 entregue */

const CHAVE_NPC = "vulpus:aventura";
const PREFIXO = "vulpus:aq:";
const ENTIDADE = "vulpus:vida";
/** Posição da raposa branca da Yuki entre os modelos animados (vulpus:modelo da entidade vida). */
const MODELO_YUKI = NOMES_MODELOS.indexOf("Raposa branca da Yuki (animada)") - INDICE_PRIMEIRO_VIVO;
const TAG_NPC = "vulpus_aventura_npc";
const TAG_TITULO = "vulpus_aventura_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;
const PASSO_OLHAR = 10;
const RAIO_OLHAR = 7;
const ALTURA_TITULO = 1.25;
const MULT = [1, 1, 1.5];
const MINERIO = /(_ore|ancient_debris)$/;
const BOSSES = new Set(INIMIGOS.filter((i) => i.papel === "boss").map((i) => `vulpus:m_${i.id}`));

/** @type {{ npc?: Ponto } | undefined} */
let dados;

function lerDados() {
  if (dados) return dados;
  const n = /** @type {any} */ (lerMundo(CHAVE_NPC, {}))?.npc;
  dados = { npc: n && typeof n.d === "string" && [n.x, n.y, n.z, n.yaw].every((v) => Number.isFinite(v)) ? { x: n.x, y: n.y, z: n.z, d: n.d, yaw: n.yaw } : undefined };
  return dados;
}

function gravarNpc() {
  salvarMundo(CHAVE_NPC, lerDados());
}

// ------------------------------------------------------------------------------------ quests do dia

/** Número pseudoaleatório estável a partir do texto. @param {string} s */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 1_000_003;
}

/** As 3 quests de um dia (iguais para todo mundo). @param {string} dia @returns {Quest[]} */
export function questsDoDia(dia) {
  const m = textos.MODELOS;
  const masmLigada = config().masmLigada;
  /** @param {readonly any[]} lista @param {string} sal @param {number} mult @returns {Quest} */
  const escolher = (lista, sal, mult) => {
    const q = lista[hash(dia + sal) % lista.length];
    return { tipo: q.tipo, n: q.n, titulo: q.titulo(q.n), dica: q.dica, mult };
  };
  const terceira = masmLigada ? escolher(m.masm, "m", MULT[2]) : escolher(m.caca, "c2", 1);
  return [escolher(m.caca, "c", MULT[0]), escolher(m.mina, "n", MULT[1]), terceira];
}

/** @param {Quest} q */
const caudasDe = (q) => Math.round(config().questCaudas * q.mult);
/** @param {Quest} q */
const xpDe = (q) => Math.round(config().questXp * q.mult);

/** @type {Map<string, Estado>} */
const cache = new Map();

/** Estado da pessoa no dia de hoje (zera na virada). @param {string} id @returns {Estado} */
function estado(id) {
  const dia = diaBrasilia(Date.now());
  let e = cache.get(id);
  if (!e) {
    const s = /** @type {any} */ (lerMundo(PREFIXO + id, {}));
    e = {
      dia: typeof s?.dia === "string" ? s.dia : "",
      q: Array.isArray(s?.q) ? s.q.slice(0, 3).map((x) => ({ e: Number.isFinite(x?.e) ? x.e : 0, p: Number.isFinite(x?.p) ? x.p : 0 })) : [],
      bonus: s?.bonus === true,
      perfeitos: Number.isFinite(s?.perfeitos) ? Math.max(0, Math.floor(s.perfeitos)) : 0,
    };
    cache.set(id, e);
  }
  if (e.dia !== dia || e.q.length !== 3) {
    e.dia = dia;
    e.q = [0, 1, 2].map(() => ({ e: 0, p: 0 }));
    e.bonus = false;
  }
  return e;
}

/** @param {string} id */
function gravar(id) {
  const e = cache.get(id);
  if (e) salvarMundo(PREFIXO + id, e);
}

/**
 * Soma progresso nas quests ativas do tipo, para uma pessoa.
 * @param {Player} player
 * @param {string[]} tipos  tipos de quest que esse evento conta
 */
function contar(player, tipos) {
  if (!config().questLigada) return;
  const e = estado(player.id);
  const quests = questsDoDia(e.dia);
  let mudou = false;
  quests.forEach((q, i) => {
    const s = e.q[i];
    if (s.e !== 1 || !tipos.includes(q.tipo)) return;
    s.p += 1;
    mudou = true;
    if (s.p >= q.n) {
      s.e = 2;
      msg(player, textos.COMPLETOU(q.titulo));
      som(player, "random.levelup", { pitch: 1.1, volume: 0.6 });
    }
  });
  if (mudou) gravar(player.id);
}

/** Quem participou do abate de um inimigo da masmorra. Cada abate só é sorteado uma vez (o registro some depois). @param {import("@minecraft/server").Entity} e */
function participantesDoAbate(e) {
  return participantes(e.id, e.location, e.dimension);
}

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    if (!config().questLigada) return;
    const tipo = deadEntity.typeId;
    if (tipo.startsWith("vulpus:m_")) {
      // masmorra: quem participou do abate (deu dano e está perto) ganha o crédito; o grupo todo conta, quem só passou por perto não
      const tipos = BOSSES.has(tipo) ? ["masm", "guardiao"] : ["masm"];
      for (const p of participantesDoAbate(deadEntity)) contar(p, tipos);
      return;
    }
    const quem = damageSource.damagingEntity;
    if (!(quem instanceof Player) || tipo.startsWith("vulpus:")) return;
    if (deadEntity.getComponent("minecraft:type_family")?.hasTypeFamily("monster")) contar(quem, ["hostil"]);
  } catch (e) {
    registrarErro("Quests: mortes", e);
  }
});

world.afterEvents.playerBreakBlock.subscribe(({ player, brokenBlockPermutation }) => {
  try {
    if (MINERIO.test(brokenBlockPermutation.type.id)) contar(player, ["minerio"]);
  } catch (e) {
    registrarErro("Quests: minérios", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => cache.delete(playerId));

// ------------------------------------------------------------------------------------ menu

/** @param {Player} player @param {number} i */
function entregar(player, i) {
  const e = estado(player.id);
  const q = questsDoDia(e.dia)[i];
  if (e.q[i].e !== 2) return;
  e.q[i].e = 3;
  const caudas = caudasDe(q);
  const xp = xpDe(q);
  if (caudas > 0) adicionarCaudas(player, caudas, textos.MOTIVO);
  if (xp > 0) ganharXp(player, xp);
  ok(player, textos.ENTREGOU(caudas, xp));
  if (e.q.every((s) => s.e === 3) && !e.bonus) {
    e.bonus = true;
    e.perfeitos += 1;
    if (e.perfeitos % 3 === 0) darFicha(player, 1, "3 dias de quests completas");
    const bonus = config().questBonus;
    if (bonus > 0) {
      adicionarCaudas(player, bonus, textos.MOTIVO_BONUS);
      msg(player, textos.BONUS(bonus));
    }
  }
  gravar(player.id);
}

/** @param {Player} player */
async function quadro(player) {
  if (!config().questLigada) {
    erro(player, textos.DESLIGADO);
    return;
  }
  if (!lerDados().npc) {
    erro(player, textos.FECHADO);
    return;
  }
  const aqui = () => quadro(player);
  const e = estado(player.id);
  const quests = questsDoDia(e.dia);
  const entregues = e.q.filter((s) => s.e === 3).length;
  const tela = new Lista(textos.TITULO).texto([textos.CORPO(player.name), textos.LINHA_BONUS(config().questBonus), textos.LINHA_PROGRESSO(entregues)].filter(Boolean).join("\n\n"));
  quests.forEach((q, i) => {
    const s = e.q[i];
    if (s.e === 0) {
      tela.botao(textos.BOTAO_NOVA(q.titulo, caudasDe(q), xpDe(q)), ICONES.nova, async (p) => {
        const est = estado(p.id);
        if (est.q[i].e === 0) {
          est.q[i].e = 1;
          gravar(p.id);
          ok(p, textos.ACEITOU(q.titulo));
        }
        await aqui();
      });
    } else if (s.e === 1) {
      tela.botao(textos.BOTAO_ATIVA(q.titulo, s.p, q.n), ICONES.buscar, async (p) => {
        await new Lista(textos.TITULO).texto(textos.DETALHE(q.titulo, q.dica, estado(p.id).q[i].p, q.n)).voltar(aqui).abrir(p);
      });
    } else if (s.e === 2) {
      tela.botao(textos.BOTAO_PRONTA(q.titulo), ICONES.sim, async (p) => {
        entregar(p, i);
        await aqui();
      });
    } else tela.botao(textos.BOTAO_ENTREGUE(q.titulo), ICONES.historico, aqui);
  });
  await tela.abrir(player);
}

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE || !ev.target.hasTag(TAG_NPC)) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => rodarSeguro(player, "Quadro de Aventureiros", quadro));
  } catch (e) {
    registrarErro("Quests: interação", e);
  }
});

// ------------------------------------------------------------------------------------ a Yuki

/** @returns {Entity[]} */
function acharNpc() {
  return achadas("aventura:npc", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_NPC] }));
    return achados;
  });
}

/** @type {Entity | undefined} */
let npcVivo;
/** @type {number | undefined} */
let yawAplicado;
let ciclos = 0;

/** Garante a Yuki no ponto, com o modelo certo, e o texto em cima dela. */
function manter() {
  try {
    const n = lerDados().npc;
    const ligado = config().questLigada && !!n;
    manterTexto(TAG_TITULO, ligado && n ? { x: n.x, y: n.y + ALTURA_TITULO, z: n.z, d: n.d } : undefined, textos.TITULO_FLUTUANTE);
    const achados = npcVivo?.isValid && ciclos++ % 6 !== 0 ? [npcVivo] : acharNpc();
    if (!ligado || !n) {
      for (const e of achados) e.remove();
      npcVivo = undefined;
      return;
    }
    const dim = world.getDimension(n.d);
    if (!dim.isChunkLoaded(n)) return;
    let ent = achados.find((e) => e.dimension.id === dim.id);
    for (const e of achados) if (e !== ent) e.remove();
    if (!ent) {
      ent = dim.spawnEntity(ENTIDADE, n);
      ent.addTag(TAG_NPC);
      esquecerBusca("aventura:npc");
      ent.setRotation({ x: 0, y: n.yaw });
    } else if (Math.hypot(ent.location.x - n.x, ent.location.y - n.y, ent.location.z - n.z) > 0.05) {
      ent.teleport(n, { dimension: dim });
    }
    ent.setProperty("vulpus:modelo", MODELO_YUKI);
    if (npcVivo !== ent) yawAplicado = undefined;
    npcVivo = ent;
  } catch (e) {
    registrarErro("Yuki: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

// A Yuki vira o rosto para quem chega e solta faíscas azuis quando tem gente por perto.
system.runInterval(() => {
  try {
    const n = lerDados().npc;
    if (!n || !config().questLigada) return;
    const ent = npcVivo?.isValid ? npcVivo : acharNpc().find((e) => e.isValid);
    if (!ent) return;
    if (ent !== npcVivo) {
      npcVivo = ent;
      yawAplicado = undefined;
    }
    let alvo;
    let melhor = Infinity;
    for (const j of posicoesOnline()) {
      if (j.d !== n.d || Math.hypot(j.x - n.x, j.y - n.y, j.z - n.z) > RAIO_OLHAR) continue;
      const d = Math.hypot(j.x - n.x, j.z - n.z);
      if (d < melhor) {
        melhor = d;
        alvo = j;
      }
    }
    const yaw = alvo ? Math.round((Math.atan2(-(alvo.x - n.x), alvo.z - n.z) * 180) / Math.PI) : n.yaw;
    const atual = yawAplicado ?? (ent.getRotation()?.y ?? 0);
    if (Math.abs(atual - yaw) > 3) {
      ent.setRotation({ x: 0, y: yaw });
      yawAplicado = yaw;
    } else yawAplicado = atual;
    if (alvo && system.currentTick % 40 < PASSO_OLHAR) {
      efeitos.nuvem(ent.dimension, { x: n.x, y: n.y, z: n.z }, { n: 2, largura: 0.5, y0: 0.2, alto: 1 }, "minecraft:endrod");
    }
  } catch (e) {
    registrarErro("Yuki: olhar", e);
  }
}, PASSO_OLHAR);

// ------------------------------------------------------------------------------ painel da staff

/** @param {Player} player */
function marcar(player) {
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = player.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  const x = b.x + 0.5;
  const z = b.z + 0.5;
  const yaw = Math.round((Math.atan2(-(player.location.x - x), player.location.z - z) * 180) / Math.PI);
  lerDados().npc = { x, y: b.y + 1, z, d: b.dimension.id, yaw };
  gravarNpc();
  manter();
  ok(player, textos.MARCADA(formatarCoords(b)));
}

/** @param {Player} player */
function remover(player) {
  lerDados().npc = undefined;
  gravarNpc();
  manter();
  ok(player, textos.REMOVIDA);
}

/**
 * Menu da staff da Yuki.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]
 */
export async function menuAventuraStaff(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuAventuraStaff(player, voltar, configurar);
  const n = lerDados().npc;
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const tela = new Lista(textos.TITULO_STAFF)
    .texto(textos.CORPO_STAFF(!!n, n ? formatarCoords(n) : ""))
    .botao(textos.BOTAO_MARCAR, ICONES.spawn, eVolta(marcar));
  if (n) tela.botao(textos.BOTAO_REMOVER, ICONES.apagar, eVolta(remover));
  if (configurar) tela.botao(textos.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurar(p)));
  await tela.voltar(voltar).abrir(player);
}
