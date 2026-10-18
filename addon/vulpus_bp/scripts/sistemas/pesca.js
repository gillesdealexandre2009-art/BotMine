// @ts-check
// Pescaria: a barraca da feira. Peixinhos de enfeite nadam no tanque. No balcão a pessoa paga, recebe a Vara da
// Pescaria (travada no inventário) e algumas iscas por um tempo. Clicar com a vara lança a linha na água; depois de
// um tempo o peixe morde (aviso, som e a boia afunda) e ela tem um instante para clicar de novo e puxar. Cada peixe
// tem espécie (com raridade), tamanho em cm e valor em Caudas. Espécies novas entram no álbum (completar paga um
// prêmio único) e o maior peixe do dia aparece no título. Tem espera entre pescarias e limites de lucro e de perda
// por dia. O painel da staff está em feira_staff.js.
import { ItemLockMode, ItemStack, Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista } from "../core/forms.js";
import { alguemPerto, online } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { INDICE_BOIA_PESCA, INDICE_PEIXE_DOURADO, INDICE_PEIXE_LARANJA, INDICE_PEIXE_PRATA } from "../textos/props_modelos.js";
import * as textos from "../textos/pesca.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { achadas, esquecerBuscas, precisaAplicar } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {{ n: number, max: number }} Registro de uma espécie no álbum */
/** @typedef {{ dia: string, ganho: number, perda: number, ult: number, album: Record<string, { n: number, max: number }>, completo: boolean }} Pessoa */
/** @typedef {{ d: string, x1: number, z1: number, x2: number, z2: number, y: number }} Tanque */
/** @typedef {{ balcao?: Ponto, cantos: (Ponto | null)[], tanque?: Tanque, jogadores: Record<string, Pessoa>, recorde?: { dia: string, nome: string, especie: string, cm: number } }} Dados */
/**
 * @typedef {object} Sessao
 * @property {string} id
 * @property {string} nome
 * @property {number} fim  tick em que a pescaria acaba
 * @property {number} iscas
 * @property {number} custo
 * @property {"livre" | "espera" | "mordeu" | "luta"} estado
 * @property {Entity} [boia]
 * @property {number} mordeEm  tick em que o peixe morde
 * @property {number} janelaFim  tick limite para puxar
 * @property {number} pescados
 * @property {number} recebido  Caudas recebidas nesta pescaria
 * @property {number} ultimoClique
 * @property {number} prog  luta: progresso de puxar (0 a 1)
 * @property {number} forteAte  luta: tick até o peixe puxar forte
 * @property {number} proxForte  luta: tick da próxima puxada forte
 * @property {number} lutaFim  luta: tick limite
 * @property {number} bloqueioAte  tick até o próximo lançamento (cliques que sobraram da luta não lançam sem querer)
 * @property {{ esp: (typeof textos.ESPECIES)[number], t: number }} [alvo]  o peixe que está na linha
 */

const CHAVE = "vulpus:pesca";
const ENTIDADE = "vulpus:prop";
const ITEM_VARA = "minecraft:fishing_rod";
const TAG_PEIXE = "vulpus_pesca_peixe_";
const TAG_BOIA = "vulpus_pesca_boia_";
const TAG_TITULO = "vulpus_pesca_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;
const PASSO_PULSO = 2;
/** De quantos em quantos ticks os peixinhos dão um passo (o mesmo deslocamento por tick, só mais espaçado). */
const PASSO_NADAR = 3;
const ALTURA_TITULO = 2.4;
/** Tempo (ticks) que a pessoa tem para puxar depois da mordida. */
const JANELA_PUXAR = 32;
const ESPERA_MIN = 40;
const ESPERA_MAX = 130;
const DEBOUNCE = 6;
/** Tempo máximo da luta (ticks) e o intervalo mínimo entre cliques que puxam. */
const LUTA_MAX = 260;
const DEBOUNCE_LUTA = 1;
/** Depois de uma luta, os cliques que sobraram não lançam a linha por este tempo (ticks). */
const PAUSA_POS_LUTA = 30;
const MODELOS_PEIXE = [INDICE_PEIXE_PRATA, INDICE_PEIXE_LARANJA, INDICE_PEIXE_DOURADO];
const ESPECIES_ALBUM = textos.ESPECIES.filter((e) => e.album);

/** @type {Dados | undefined} */
let dados;
/** @type {Map<string, Sessao>} */
const sessoes = new Map();
/** @type {Map<string, { x: number, z: number, tx: number, tz: number, vel: number, yaw: number, fase: number, alvoBoia?: boolean }>} */
const nadando = new Map();

/** @param {any} p */
const ehPonto = (p) => !!p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n));

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {Record<string, Pessoa>} */
  const jogadores = {};
  if (s.jogadores && typeof s.jogadores === "object") {
    for (const [id, r] of Object.entries(s.jogadores)) {
      const x = /** @type {any} */ (r);
      if (!x || typeof x !== "object") continue;
      /** @type {Record<string, { n: number, max: number }>} */
      const album = {};
      if (x.album && typeof x.album === "object") {
        for (const [esp, v] of Object.entries(x.album)) {
          const a = /** @type {any} */ (v);
          if (textos.ESPECIES.some((e) => e.id === esp) && a && Number.isFinite(a.n) && a.n > 0) album[esp] = { n: Math.floor(a.n), max: Number(a.max) || 0 };
        }
      }
      jogadores[id] = { dia: String(x.dia ?? ""), ganho: Number(x.ganho) || 0, perda: Number(x.perda) || 0, ult: Number(x.ult) || 0, album, completo: x.completo === true };
    }
  }
  const cantos = Array.isArray(s.cantos) ? s.cantos.slice(0, 2).map((c) => (ehPonto(c) ? { x: c.x, y: c.y, z: c.z, d: c.d } : null)) : [];
  while (cantos.length < 2) cantos.push(null);
  const t = s.tanque;
  const rec = s.recorde;
  dados = {
    balcao: ehPonto(s.balcao) ? { x: s.balcao.x, y: s.balcao.y, z: s.balcao.z, d: s.balcao.d } : undefined,
    cantos,
    tanque: t && typeof t.d === "string" && [t.x1, t.z1, t.x2, t.z2, t.y].every((n) => Number.isFinite(n)) ? { d: t.d, x1: t.x1, z1: t.z1, x2: t.x2, z2: t.z2, y: t.y } : undefined,
    jogadores,
    recorde: rec && typeof rec.nome === "string" && Number.isFinite(rec.cm) ? { dia: String(rec.dia ?? ""), nome: rec.nome.slice(0, 32), especie: String(rec.especie ?? "").slice(0, 32), cm: Math.floor(rec.cm) } : undefined,
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** @param {string} id */
function pessoaDe(id) {
  const d = lerDados();
  const dia = diaBrasilia(Date.now());
  const r = d.jogadores[id] ?? { dia, ganho: 0, perda: 0, ult: 0, album: {}, completo: false };
  if (r.dia !== dia) {
    r.dia = dia;
    r.ganho = 0;
    r.perda = 0;
  }
  d.jogadores[id] = r;
  return r;
}

/** Maior peixe de hoje (some quando o dia vira). */
function recordeDeHoje() {
  const r = lerDados().recorde;
  return r && r.dia === diaBrasilia(Date.now()) ? { nome: r.nome, especie: r.especie, cm: r.cm } : undefined;
}

/** Tanque pronto: os dois cantos e a água definida. @param {Dados} d */
const pronto = (d) => !!d.tanque && !!d.balcao;

// ----------------------------------------------------------------------------- peixes e título
/** @returns {Entity[]} */
function acharPorTag(/** @type {string} */ prefixo) {
  return achadas(`pesca:${prefixo}`, () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const dim of DIMENSOES) {
      for (const e of world.getDimension(dim).getEntities({ type: ENTIDADE })) if (e.getTags().some((t) => t.startsWith(prefixo))) achados.push(e);
    }
    return achados;
  });
}

/** @param {Entity} e @param {string} prefixo */
const tagDe = (e, prefixo) => e.getTags().find((t) => t.startsWith(prefixo)) ?? "";

/** @param {Tanque} t */
function pontoNoTanque(t) {
  return { x: t.x1 + 0.4 + Math.random() * Math.max(0.1, t.x2 - t.x1 - 0.8), z: t.z1 + 0.4 + Math.random() * Math.max(0.1, t.z2 - t.z1 - 0.8) };
}

function manter() {
  try {
    const d = lerDados();
    const cfg = config();
    const ligada = cfg.pescaLigada && pronto(d);
    manterTexto(
      TAG_TITULO,
      ligada && d.balcao ? { x: d.balcao.x + 0.5, y: d.balcao.y + ALTURA_TITULO, z: d.balcao.z + 0.5, d: d.balcao.d } : undefined,
      textos.TITULO_FLUTUANTE(cfg.pescaCusto, cfg.pescaIscas, recordeDeHoje()),
    );
    const peixes = acharPorTag(TAG_PEIXE);
    const quer = ligada && d.tanque ? Math.max(0, Math.floor(cfg.pescaPeixes)) : 0;
    for (const e of peixes) {
      const n = Number(tagDe(e, TAG_PEIXE).slice(TAG_PEIXE.length));
      if (!Number.isFinite(n) || n >= quer) {
        nadando.delete(tagDe(e, TAG_PEIXE));
        peixesVivos.delete(tagDe(e, TAG_PEIXE));
        e.remove();
      }
    }
    const t = d.tanque;
    if (!t || quer === 0) return;
    const dim = world.getDimension(t.d);
    if (!dim.isChunkLoaded({ x: t.x1, y: t.y, z: t.z1 })) return;
    for (let i = 0; i < quer; i++) {
      const tag = `${TAG_PEIXE}${i}`;
      const mesmos = peixes.filter((e) => e.isValid && e.hasTag(tag));
      let ent = mesmos.find((e) => e.dimension.id === dim.id);
      for (const e of mesmos) if (e !== ent) e.remove();
      const estado = nadando.get(tag);
      if (!ent) {
        const p = pontoNoTanque(t);
        ent = dim.spawnEntity(ENTIDADE, { x: p.x, y: t.y - 0.4, z: p.z });
        ent.addTag(tag);
        esquecerBuscas("pesca:");
        nadando.set(tag, { x: p.x, z: p.z, tx: p.x, tz: p.z, vel: 0.03 + Math.random() * 0.03, yaw: 0, fase: Math.random() * 6 });
      } else if (!estado) {
        nadando.set(tag, { x: ent.location.x, z: ent.location.z, tx: ent.location.x, tz: ent.location.z, vel: 0.03 + Math.random() * 0.03, yaw: 0, fase: Math.random() * 6 });
      }
      if (precisaAplicar(ent, String(MODELOS_PEIXE[i % MODELOS_PEIXE.length]))) ent.setProperty("vulpus:modelo", MODELOS_PEIXE[i % MODELOS_PEIXE.length]);
      peixesVivos.set(tag, ent);
    }
  } catch (e) {
    registrarErro("Pescaria: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** Tanque novo: os peixinhos antigos saem e nascem de novo no lugar certo. */
function reiniciarPeixes() {
  for (const e of acharPorTag(TAG_PEIXE)) e.remove();
  nadando.clear();
  peixesVivos.clear();
}

/** @type {Map<string, Entity>} tag do peixe → entidade (guardada: não se procura a cada pulso) */
const peixesVivos = new Map();
/**
 * Os peixes só nadam com alguém a até VER_PEIXES blocos do tanque (de longe ninguém vê; ao chegar, eles retomam de onde
 * estavam). Entre VER_DETALHE e VER_PEIXES (já longe, difícil de notar) o passo é maior e mais espaçado (SALTO_LONGE vezes).
 */
const VER_PEIXES = 96;
const VER_DETALHE = 40;
const SALTO_LONGE = 3;
const CICLO_PERTO = 10;
/** 0 = ninguém perto (parados), 1 = nadando a cada pulso, SALTO_LONGE = nadando espaçado. */
let peixesAtivos = 0;
let proximaConferencia = 0;
let proximaBusca = 0;

/** Os peixinhos nadam sozinhos pelo tanque; o que está na mordida vai até a boia. */
function nadar() {
  try {
    const d = lerDados();
    const t = d.tanque;
    if (!t) return;
    const agora = system.currentTick;
    if (agora >= proximaConferencia) {
      proximaConferencia = agora + CICLO_PERTO;
      const centro = { x: (t.x1 + t.x2) / 2, y: t.y, z: (t.z1 + t.z2) / 2 };
      peixesAtivos = alguemPerto(centro, t.d, VER_DETALHE) ? 1 : alguemPerto(centro, t.d, VER_PEIXES) ? SALTO_LONGE : 0;
    }
    if (!peixesAtivos) return;
    if (peixesAtivos > 1 && Math.floor(agora / PASSO_NADAR) % peixesAtivos !== 0) return;
    const salto = peixesAtivos;
    if ([...peixesVivos.values()].some((e) => !e.isValid) && agora >= proximaBusca) {
      // Algum sumiu (chunk descarregado): procura de novo, no máximo a cada 20 ticks.
      proximaBusca = agora + 20;
      for (const e of acharPorTag(TAG_PEIXE)) peixesVivos.set(tagDe(e, TAG_PEIXE), e);
    }
    const dim = world.getDimension(t.d);
    for (const [tag, e] of peixesVivos) {
      const f = nadando.get(tag);
      if (!f || !e.isValid) continue;
      let dx = f.tx - f.x;
      let dz = f.tz - f.z;
      let dist = Math.hypot(dx, dz);
      if (dist < 0.25) {
        if (f.alvoBoia) {
          dx = 0;
          dz = 0;
          dist = 0;
        } else {
          const p = pontoNoTanque(t);
          f.tx = p.x;
          f.tz = p.z;
          f.vel = 0.03 + Math.random() * 0.03;
          dx = f.tx - f.x;
          dz = f.tz - f.z;
          dist = Math.hypot(dx, dz);
        }
      }
      if (dist > 0) {
        const passo = Math.min(dist, (f.alvoBoia ? 0.14 : f.vel) * PASSO_NADAR * salto);
        f.x += (dx / dist) * passo;
        f.z += (dz / dist) * passo;
        const yaw = Math.round((Math.atan2(-dx, dz) * 180) / Math.PI);
        if (Math.abs(yaw - f.yaw) > 4) {
          f.yaw = yaw;
          e.setRotation({ x: 0, y: yaw });
        }
      }
      f.fase += 0.15 * salto;
      e.teleport({ x: f.x, y: t.y - 0.4 + Math.sin(f.fase) * 0.06, z: f.z }, { dimension: dim });
    }
  } catch (e) {
    registrarErro("Pescaria: peixes", e);
  }
}
system.runInterval(nadar, PASSO_NADAR);

// ------------------------------------------------------------------------------------- vara
/** @param {import("@minecraft/server").ItemStack | undefined} item */
const ehVara = (item) => !!item && item.typeId === ITEM_VARA && item.nameTag === textos.NOME_VARA;

/** Tira a Vara da Pescaria do inventário. @param {Player} player */
function recolherVara(player) {
  try {
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    for (let i = 0; i < inv.size; i++) if (ehVara(inv.getItem(i))) inv.setItem(i, undefined);
  } catch (e) {
    registrarErro("Pescaria: recolher a vara", e);
  }
}

/** @param {Player} player */
function darVara(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (!inv) return false;
  const item = new ItemStack(ITEM_VARA, 1);
  item.nameTag = textos.NOME_VARA;
  item.setLore([...textos.LORE_VARA]);
  item.lockMode = ItemLockMode.inventory;
  item.keepOnDeath = false;
  return !inv.addItem(item);
}

// ------------------------------------------------------------------------------------- jogo
/**
 * Confere se a pessoa pode comprar uma pescaria agora. Devolve o motivo (texto de erro) ou undefined.
 * @param {Player} player
 */
function motivoDeNao(player) {
  const cfg = config();
  const d = lerDados();
  if (!cfg.pescaLigada || !pronto(d)) return textos.JOGO_FECHADO;
  if (sessoes.has(player.id)) return textos.JA_PESCANDO;
  const r = pessoaDe(player.id);
  const espera = Math.ceil((r.ult + cfg.pescaEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return textos.RECARGA(espera);
  if (r.ganho >= cfg.pescaGanhoMaxDia) return textos.GANHO_MAX;
  if (cfg.pescaPerdaMaxDia - r.perda < cfg.pescaCusto) return textos.PERDA_MAX;
  if (saldo(player) < cfg.pescaCusto) return textos.SEM_CAUDAS(cfg.pescaCusto);
  return undefined;
}

/** @param {Player} player */
function comprar(player) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  if (!darVara(player)) {
    erro(player, textos.SEM_ESPACO);
    return;
  }
  adicionarCaudas(player, -cfg.pescaCusto);
  /** @type {Sessao} */
  const s = {
    id: player.id,
    nome: player.name,
    fim: system.currentTick + Math.max(1, cfg.pescaMinutos) * 1200,
    iscas: Math.max(1, cfg.pescaIscas),
    custo: cfg.pescaCusto,
    estado: "livre",
    mordeEm: 0,
    janelaFim: 0,
    pescados: 0,
    recebido: 0,
    ultimoClique: 0,
    prog: 0,
    forteAte: 0,
    proxForte: 0,
    lutaFim: 0,
    bloqueioAte: 0,
  };
  sessoes.set(player.id, s);
  msg(player, textos.COMECOU(s.custo, s.iscas, Math.max(1, cfg.pescaMinutos)));
  som(player, "random.levelup", { pitch: 1.3, volume: 0.7 });
}

/** @param {Sessao} s */
function tirarBoia(s) {
  try {
    if (s.boia?.isValid) s.boia.remove();
  } catch (e) {
    registrarErro("Pescaria: tirar a boia", e);
  }
  s.boia = undefined;
  for (const f of nadando.values()) f.alvoBoia = false;
}

/**
 * Acaba a pescaria: tira a boia e a vara e fecha as contas do dia.
 * @param {Sessao} s
 * @param {string} [aviso]
 */
function encerrar(s, aviso) {
  if (sessoes.get(s.id) !== s) return;
  sessoes.delete(s.id);
  tirarBoia(s);
  const p = online().find((x) => x.id === s.id);
  if (p?.isValid) recolherVara(p);
  const r = pessoaDe(s.id);
  r.ult = Date.now();
  const liquido = s.recebido - s.custo;
  if (liquido > 0) r.ganho += liquido;
  else if (liquido < 0) r.perda += -liquido;
  gravar();
  if (p?.isValid) {
    if (aviso) msg(p, aviso);
    msg(p, textos.FIM(s.pescados, s.recebido, s.custo));
  }
}

/** Pesos sorteiam a espécie. */
function sortearEspecie() {
  const total = textos.ESPECIES.reduce((n, e) => n + e.peso, 0);
  let x = Math.random() * total;
  for (const e of textos.ESPECIES) {
    x -= e.peso;
    if (x < 0) return e;
  }
  return textos.ESPECIES[1];
}

/** Sorteia o peixe da mordida: espécie e tamanho (média de dois sorteios: os do meio são mais comuns). */
function sortearPeixe() {
  return { esp: sortearEspecie(), t: (Math.random() + Math.random()) / 2 };
}

/** @param {Sessao} s @param {Player} player @param {{ esp: (typeof textos.ESPECIES)[number], t: number }} peixe */
function pegarPeixe(s, player, peixe) {
  const { esp, t } = peixe;
  const cm = Math.round(esp.min + (esp.max - esp.min) * t);
  const premio = esp.valor > 0 ? Math.max(1, Math.round(esp.valor * (0.6 + 0.8 * t))) : 0;
  const r = pessoaDe(s.id);
  const antes = r.album[esp.id];
  const nova = !antes;
  const maiorAntes = antes?.max ?? 0;
  r.album[esp.id] = { n: (antes?.n ?? 0) + 1, max: Math.max(maiorAntes, cm) };
  if (premio > 0) adicionarCaudas(s.id, premio);
  s.recebido += premio;
  s.pescados += 1;
  // recorde do dia (só peixe de verdade, não a bota)
  const dia = diaBrasilia(Date.now());
  const d = lerDados();
  let recorde = false;
  if (esp.album && (!d.recorde || d.recorde.dia !== dia || cm > d.recorde.cm)) {
    d.recorde = { dia, nome: s.nome, especie: esp.nome, cm };
    recorde = true;
  }
  // álbum completo: prêmio único
  let albumCompleto = false;
  if (!r.completo && ESPECIES_ALBUM.every((e) => (r.album[e.id]?.n ?? 0) > 0)) {
    r.completo = true;
    albumCompleto = true;
    adicionarCaudas(s.id, config().pescaPremioAlbum);
    s.recebido += config().pescaPremioAlbum;
  }
  gravar();
  const p = player;
  if (p.isValid) {
    mostrarTitulo(p, textos.TITULO_PEGOU(esp.cor, esp.nome), {
      subtitulo: nova && esp.album ? `${textos.SUB_PEGOU(cm, premio)} §8• ${textos.NOVA_ESPECIE}` : cm > maiorAntes && maiorAntes > 0 ? `${textos.SUB_PEGOU(cm, premio)} §8• ${textos.NOVO_MAIOR(cm)}` : textos.SUB_PEGOU(cm, premio),
      entrada: 2,
      fica: 50,
      saida: 10,
    });
    msg(p, textos.PEGOU(`${esp.cor}${esp.nome}`, cm, premio));
    if (albumCompleto) msg(p, textos.ALBUM_COMPLETO_VOCE(config().pescaPremioAlbum));
    som(p, esp.valor >= 12 ? "random.levelup" : esp.valor > 0 ? "random.orb" : "note.bass", { pitch: esp.valor >= 12 ? 1.3 : 1, volume: 0.8 });
  }
  if (recorde) world.sendMessage(textos.RECORDE_DO_DIA(s.nome, esp.nome, cm));
  if (albumCompleto) world.sendMessage(textos.ALBUM_COMPLETO(s.nome, config().pescaPremioAlbum));
  manter();
}

/** Onde a boia fica: o ponto do tanque mirado. @param {Player} player */
function miraNoTanque(player) {
  const t = lerDados().tanque;
  if (!t) return undefined;
  try {
    const hit = player.getBlockFromViewDirection({ maxDistance: 16, includeLiquidBlocks: true });
    if (!hit?.block) return undefined;
    const x = hit.block.location.x + (hit.faceLocation?.x ?? 0.5);
    const z = hit.block.location.z + (hit.faceLocation?.z ?? 0.5);
    if (hit.block.dimension.id !== t.d || x < t.x1 || x > t.x2 || z < t.z1 || z > t.z2) return undefined;
    return { x, y: t.y, z };
  } catch {
    return undefined;
  }
}

/** @param {Sessao} s @param {Player} player */
function lancar(s, player) {
  if (s.iscas <= 0) {
    encerrar(s, textos.SEM_ISCAS_AGORA);
    return;
  }
  const t = lerDados().tanque;
  const alvo = miraNoTanque(player);
  if (!t || !alvo) {
    msg(player, textos.MIRE_NA_AGUA);
    return;
  }
  const dim = world.getDimension(t.d);
  s.iscas -= 1;
  const boia = dim.spawnEntity(ENTIDADE, alvo);
  boia.addTag(`${TAG_BOIA}${s.id}`);
  esquecerBuscas("pesca:");
  boia.setProperty("vulpus:modelo", INDICE_BOIA_PESCA);
  s.boia = boia;
  s.estado = "espera";
  s.mordeEm = system.currentTick + ESPERA_MIN + Math.floor(Math.random() * (ESPERA_MAX - ESPERA_MIN));
  efeitos.anel(dim, alvo, { raio: 0.5, n: 10, y: 0 }, "minecraft:water_splash_particle");
  som(player, "random.splash", { location: alvo, pitch: 1.2, volume: 0.8 });
  msg(player, textos.LANCOU(s.iscas));
  player.onScreenDisplay.setActionBar(textos.BARRA_AGUARDE);
}

/** O peixe morde: a boia afunda e o peixe mais perto vem até ela. @param {Sessao} s */
function morder(s) {
  const t = lerDados().tanque;
  const boia = s.boia;
  if (!t || !boia?.isValid) {
    s.estado = "livre";
    return;
  }
  s.estado = "mordeu";
  s.alvo = sortearPeixe();
  s.janelaFim = system.currentTick + JANELA_PUXAR;
  const dim = world.getDimension(t.d);
  const p = boia.location;
  boia.teleport({ x: p.x, y: t.y - 0.25, z: p.z }, { dimension: dim });
  efeitos.anel(dim, { x: p.x, y: t.y, z: p.z }, { raio: 0.6, n: 14, y: 0 }, "minecraft:water_splash_particle");
  efeitos.nuvem(dim, { x: p.x, y: t.y, z: p.z }, { n: 6, largura: 0.3, y0: 0, alto: 0.6 }, "minecraft:bubble_particle");
  let perto;
  let menor = Infinity;
  for (const f of nadando.values()) {
    const dist = Math.hypot(f.x - p.x, f.z - p.z);
    if (dist < menor) {
      menor = dist;
      perto = f;
    }
  }
  if (perto) {
    perto.alvoBoia = true;
    perto.tx = p.x;
    perto.tz = p.z;
  }
  const jogador = online().find((x) => x.id === s.id);
  if (jogador?.isValid) {
    jogador.onScreenDisplay.setActionBar(textos.BARRA_MORDEU);
    som(jogador, "random.orb", { location: p, pitch: 0.7, volume: 1 });
    som(jogador, "note.pling", { pitch: 1.8, volume: 0.8 });
  }
}

/** Clique com a vara na mão. @param {Player} player */
function usarVara(player) {
  const s = sessoes.get(player.id);
  if (!s) {
    recolherVara(player);
    erro(player, textos.VARA_SEM_SESSAO);
    return;
  }
  if (system.currentTick - s.ultimoClique < (s.estado === "luta" ? DEBOUNCE_LUTA : DEBOUNCE)) return;
  s.ultimoClique = system.currentTick;
  if (system.currentTick >= s.fim) {
    encerrar(s, textos.FIM_TEMPO);
    return;
  }
  if (s.estado === "livre") {
    if (system.currentTick < s.bloqueioAte) return;
    lancar(s, player);
    return;
  }
  if (s.estado === "espera") {
    tirarBoia(s);
    s.estado = "livre";
    msg(player, textos.PUXOU_CEDO);
    som(player, "note.bass", { pitch: 0.8, volume: 0.7 });
    return;
  }
  if (s.estado === "mordeu") {
    iniciarLuta(s, player);
    return;
  }
  // luta: cada clique puxa um pouco (quanto mais forte o peixe, mais cliques precisa)
  s.prog = Math.min(1, s.prog + 1 / Math.max(1, s.alvo?.esp.cliques ?? 5));
  som(player, "random.click", { pitch: 1.2 + s.prog * 0.8, volume: 0.5 });
  const boia = s.boia;
  if (boia?.isValid) efeitos.nuvem(boia.dimension, boia.location, { n: 2, largura: 0.3, y0: 0, alto: 0.3 }, "minecraft:water_splash_particle");
  if (s.prog >= 1) vencerLuta(s, player);
}

/** O peixe mordeu e a pessoa puxou a tempo: começa o cabo de guerra. @param {Sessao} s @param {Player} player */
function iniciarLuta(s, player) {
  const agora = system.currentTick;
  s.estado = "luta";
  s.prog = 0.35;
  s.lutaFim = agora + LUTA_MAX;
  s.proxForte = agora + 30 + Math.floor(Math.random() * 20);
  s.forteAte = 0;
  const boia = s.boia;
  if (boia?.isValid) efeitos.anel(boia.dimension, boia.location, { raio: 0.7, n: 16, y: 0 }, "minecraft:water_splash_particle");
  msg(player, textos.FISGOU);
  som(player, "random.splash", { pitch: 0.9, volume: 1 });
}

/** Puxou tudo: o peixe sai da água. @param {Sessao} s @param {Player} player */
function vencerLuta(s, player) {
  const boia = s.boia;
  if (boia?.isValid) {
    efeitos.nuvem(boia.dimension, boia.location, { n: 14, largura: 0.6, y0: 0.2, alto: 1 }, "minecraft:water_splash_particle");
    efeitos.anel(boia.dimension, boia.location, { raio: 0.9, n: 18, y: 0.1 }, "minecraft:water_splash_particle");
  }
  tirarBoia(s);
  s.estado = "livre";
  s.bloqueioAte = system.currentTick + PAUSA_POS_LUTA;
  const peixe = s.alvo ?? sortearPeixe();
  s.alvo = undefined;
  pegarPeixe(s, player, peixe);
  if (s.iscas <= 0 && sessoes.get(s.id) === s) encerrar(s, textos.SEM_ISCAS_AGORA);
}

/** O peixe ganhou: solta a linha. @param {Sessao} s @param {Player} player */
function perderLuta(s, player) {
  tirarBoia(s);
  s.estado = "livre";
  s.bloqueioAte = system.currentTick + PAUSA_POS_LUTA;
  s.alvo = undefined;
  msg(player, textos.ESCAPOU_LUTA);
  som(player, "note.bass", { pitch: 0.7, volume: 0.8 });
  if (s.iscas <= 0) encerrar(s, textos.SEM_ISCAS_AGORA);
}

/** A luta a cada instante: o peixe puxa de volta, tem arrancadas fortes e a água espirra. @param {Sessao} s @param {Player} player @param {number} agora */
function passoDaLuta(s, player, agora) {
  const boia = s.boia;
  const t = lerDados().tanque;
  const esp = s.alvo?.esp ?? textos.ESPECIES[2];
  if (agora >= s.proxForte && agora >= s.forteAte) {
    s.forteAte = agora + 18 + Math.floor(Math.random() * 8);
    s.proxForte = s.forteAte + 24 + Math.floor(Math.random() * 30);
    som(player, "mob.guardian.hit", { pitch: 1.4, volume: 0.6 });
  }
  const forte = agora < s.forteAte;
  s.prog = Math.max(0, s.prog - esp.puxo * (forte ? 2.4 : 1));
  if (boia?.isValid && t) {
    const p = boia.location;
    // o peixe arrasta a boia de um lado para o outro (mais agitado quando puxa forte)
    const ang = agora * (forte ? 0.9 : 0.5);
    const raio = forte ? 0.25 : 0.12;
    const x = Math.max(t.x1 + 0.3, Math.min(t.x2 - 0.3, p.x + Math.cos(ang) * raio));
    const z = Math.max(t.z1 + 0.3, Math.min(t.z2 - 0.3, p.z + Math.sin(ang) * raio));
    boia.teleport({ x, y: t.y - (forte ? 0.2 : 0.1), z }, { dimension: boia.dimension });
    efeitos.nuvem(boia.dimension, { x, y: t.y, z }, { n: forte ? 4 : 2, largura: 0.35, y0: 0, alto: 0.4 }, "minecraft:water_splash_particle");
    if (agora % 6 === 0) efeitos.nuvem(boia.dimension, { x, y: t.y, z }, { n: 3, largura: 0.3, y0: 0, alto: 0.3 }, "minecraft:bubble_particle");
    if (forte && agora % 4 === 0) efeitos.anel(boia.dimension, { x, y: t.y, z }, { raio: 0.5, n: 8, y: 0 }, "minecraft:water_splash_particle");
  }
  if (agora % 6 === 0) som(player, "random.splash", { location: boia?.location, pitch: forte ? 0.7 : 1, volume: 0.5 });
  player.onScreenDisplay.setActionBar(textos.BARRA_LUTA(s.prog, forte));
  if (s.prog <= 0 || agora >= s.lutaFim) perderLuta(s, player);
}

/** A cada instante: tempo, mordidas, peixe que escapa e quem saiu. */
function pulso() {
  try {
    const agora = system.currentTick;
    for (const s of [...sessoes.values()]) {
      const p = online().find((x) => x.id === s.id);
      if (!p?.isValid) {
        encerrar(s);
        continue;
      }
      if (agora >= s.fim) {
        encerrar(s, textos.FIM_TEMPO);
        continue;
      }
      if (s.estado === "espera") {
        if (agora >= s.mordeEm) morder(s);
        else if (s.boia?.isValid && agora % 12 === 0) {
          efeitos.anel(s.boia.dimension, s.boia.location, { raio: 0.3, n: 5, y: 0 }, "minecraft:water_splash_particle");
        }
      } else if (s.estado === "luta") {
        passoDaLuta(s, p, agora);
      } else if (s.estado === "mordeu") {
        if (agora >= s.janelaFim) {
          tirarBoia(s);
          s.estado = "livre";
          msg(p, textos.ESCAPOU);
          som(p, "note.bass", { pitch: 0.7, volume: 0.7 });
          if (s.iscas <= 0) encerrar(s, textos.SEM_ISCAS_AGORA);
        } else if (agora % 6 === 0 && s.boia?.isValid) {
          p.onScreenDisplay.setActionBar(textos.BARRA_MORDEU);
          efeitos.nuvem(s.boia.dimension, s.boia.location, { n: 3, largura: 0.3, y0: 0, alto: 0.4 }, "minecraft:bubble_particle");
        }
      }
    }
  } catch (e) {
    registrarErro("Pescaria: pulso", e);
  }
}
system.runInterval(pulso, PASSO_PULSO);

// ------------------------------------------------------------------------------------ menus
/** @param {Player} player */
async function menuAlbum(player) {
  const r = pessoaDe(player.id);
  const feitas = ESPECIES_ALBUM.filter((e) => (r.album[e.id]?.n ?? 0) > 0).length;
  const linhas = textos.ESPECIES.map((e) => {
    const a = r.album[e.id];
    return a ? textos.LINHA_ALBUM(e.cor, e.nome, e.raridade, a.n, a.max) : textos.LINHA_ALBUM_VAZIA(e.raridade);
  });
  await new Lista(textos.TITULO_ALBUM)
    .texto([textos.CORPO_ALBUM_TOPO(feitas, ESPECIES_ALBUM.length, r.completo, config().pescaPremioAlbum), "", ...linhas].join("\n"))
    .voltar((p) => menuBalcao(p))
    .abrir(player);
}

/** @param {Player} player */
async function menuBalcao(player) {
  const cfg = config();
  const r = pessoaDe(player.id);
  const feitas = ESPECIES_ALBUM.filter((e) => (r.album[e.id]?.n ?? 0) > 0).length;
  const lista = new Lista(textos.TITULO_MENU).texto(textos.CORPO_MENU(cfg.pescaCusto, cfg.pescaIscas, cfg.pescaMinutos, feitas, ESPECIES_ALBUM.length));
  const sessao = sessoes.get(player.id);
  if (sessao) lista.botao(textos.BOTAO_TERMINAR, undefined, () => encerrar(sessao, undefined));
  else lista.botao(textos.BOTAO_PESCAR(cfg.pescaCusto), undefined, (p) => comprar(p));
  lista.botao(textos.BOTAO_ALBUM, undefined, (p) => menuAlbum(p));
  await lista.abrir(player);
}

// ------------------------------------------------------------------------------ interações
/**
 * @param {Ponto | undefined} p
 * @param {import("@minecraft/server").Block} bloco
 */
const mesmoBloco = (p, bloco) =>
  !!p && p.d === bloco.dimension.id && p.x === bloco.location.x && p.y === bloco.location.y && p.z === bloco.location.z;

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    if (ehVara(ev.itemStack)) {
      ev.cancel = true;
      return;
    }
    if (!mesmoBloco(lerDados().balcao, block)) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() => rodarSeguro(player, "Pescaria", menuBalcao));
  } catch (e) {
    registrarErro("Pescaria: interação", e);
  }
});

world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    if (!ehVara(ev.itemStack)) return;
    ev.cancel = true;
    const player = ev.source;
    system.run(() => rodarSeguro(player, "Pescaria", usarVara));
  } catch (e) {
    registrarErro("Pescaria: vara", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!mesmoBloco(lerDados().balcao, ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Pescaria: quebrar", e);
  }
});

// Quem entra com uma vara de uma pescaria que já acabou (queda do servidor, por exemplo) fica sem ela.
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  try {
    if (initialSpawn && !sessoes.has(player.id)) recolherVara(player);
  } catch (e) {
    registrarErro("Pescaria: entrada", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
/** Estado para o painel da staff. */
export function estadoPesca() {
  const d = lerDados();
  return {
    balcao: !!d.balcao,
    canto1: !!d.cantos[0],
    canto2: !!d.cantos[1],
    tanque: !!d.tanque,
    sessoes: sessoes.size,
    peixes: nadando.size,
    recorde: recordeDeHoje(),
  };
}

/** @param {Player} player */
function olhado(player) {
  try {
    const hit = player.getBlockFromViewDirection({ maxDistance: 10, includeLiquidBlocks: true });
    return hit?.block;
  } catch {
    return undefined;
  }
}

/** @param {Player} player */
export function marcarBalcao(player) {
  const b = olhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  lerDados().balcao = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  gravar();
  manter();
  ok(player, textos.BALCAO_MARCADO(formatarCoords(b)));
}

/** Os dois cantos opostos definem a caixa de água: peixes nadam dentro dela. @param {Player} player @param {number} n */
export function marcarCanto(player, n) {
  const b = olhado(player);
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  const d = lerDados();
  d.cantos[n - 1] = { x: b.x, y: b.y, z: b.z, d: b.dimension.id };
  const [a, c] = d.cantos;
  if (a && c && a.d === c.d) {
    d.tanque = { d: a.d, x1: Math.min(a.x, c.x), z1: Math.min(a.z, c.z), x2: Math.max(a.x, c.x) + 1, z2: Math.max(a.z, c.z) + 1, y: Math.max(a.y, c.y) + 0.85 };
    gravar();
    reiniciarPeixes();
    manter();
    ok(player, textos.TANQUE_PRONTO);
    return;
  }
  gravar();
  ok(player, textos.CANTO_MARCADO(n));
}

/** @param {Player} player */
export function removerPesca(player) {
  const d = lerDados();
  for (const s of [...sessoes.values()]) encerrar(s);
  d.balcao = undefined;
  d.cantos = [null, null];
  d.tanque = undefined;
  gravar();
  nadando.clear();
  manter();
  ok(player, textos.REMOVIDO);
}

