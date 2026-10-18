// @ts-check
// Jogo da masmorra em tempo de execução: acorda as salas quando alguém chega, controla os inimigos (habilidades, bosses com fases),
// paga o loot por pessoa (baús e abates), dá o Selo da Cauda, guarda o ranking e acolhe quem cai no altar do andar.
// Os andares vêm de masm_estado.js (gravados pela geração). Nada aqui depende de placas: altar e baús são blocos com menu e mensagem.
import { EntityDamageCause, ItemStack, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { config } from "../core/db.js";
import { emitir } from "../core/efeitos.js";
import { mostrar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { pontoEmZona } from "../core/arg_zona.js";
import { participantes } from "./masm_golpes.js";
import { mostrarTitulo } from "../core/tela.js";
import { teleportar } from "../core/teleporte.js";
import { formatarTempo, msg, registrarErro, som } from "../core/util.js";
import { INIMIGOS } from "../textos/masm_inimigos_dados.js";
import * as textos from "../textos/masm.js";
import { adicionarCaudas } from "./caudas.js";
import { usarHabilidade } from "./masm_habil.js";
import { sortearRecompensa } from "./masm_loot.js";
import { bonusSorte, darFicha } from "./pets_bonus.js";
import * as estado from "./masm_estado.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("./masm_construir.js").ResultadoAndar} ResultadoAndar */
/** @typedef {import("./masm_construir.js").SalaResultado} SalaResultado */

const PREFIXO_ENT = "vulpus:m_";
const PASSO = 10;
const REPOUSO_SALA_MS = 8 * 60_000;
const SUMIR_SEM_JOGADOR_MS = 60_000;
const VIDA_RESGATE = 5;

export const DADOS = new Map(INIMIGOS.map((i) => [i.id, i]));

/** @type {string} dimensão onde os andares existem (gravada pela geração) */
let dimId = "minecraft:overworld";
export function definirDimensao(/** @type {string} */ d) {
  dimId = d;
}

/** Estado vivo de cada sala. @type {Map<string, { estado: "dormindo" | "ativa" | "limpa", vivos: Set<string>, desde: number, visto: number, fase: number }>} */
const salas = new Map();
/** Último resgate de cada pessoa (evita repetir no mesmo susto). @type {Map<string, number>} */
const resgates = new Map();
/** Em que andar cada pessoa está (para o título de chegada). @type {Map<string, number>} */
const noAndar = new Map();

/** @param {number} n @param {number} id */
const chaveSala = (n, id) => `${n}:${id}`;

/** Fábrica de aleatório. */
const rng = () => Math.random();

// ---------------------------------------------------------------- localização

/**
 * Em que andar e sala a pessoa está.
 * @param {{ x: number, y: number, z: number }} l
 * @returns {{ andar: ResultadoAndar, sala: SalaResultado | null } | null}
 */
export function onde(l) {
  for (const a of estado.andaresProntos()) {
    if (Math.abs(l.y - a.yPiso) > 14) continue;
    let dentro = false;
    let achada = null;
    for (const s of a.salas) {
      if (l.x >= s.x - 1 && l.x <= s.x + s.w + 1 && l.z >= s.z - 1 && l.z <= s.z + s.h + 1) {
        dentro = true;
        achada = s;
        break;
      }
    }
    if (dentro) return { andar: a, sala: achada };
    // fora das salas mas dentro da caixa do andar (corredores)
    const xs = a.salas.map((s) => s.x), zs = a.salas.map((s) => s.z);
    const x1 = Math.min(...xs) - 4, x2 = Math.max(...a.salas.map((s) => s.x + s.w)) + 4;
    const z1 = Math.min(...zs) - 4, z2 = Math.max(...a.salas.map((s) => s.z + s.h)) + 4;
    if (l.x >= x1 && l.x <= x2 && l.z >= z1 && l.z <= z2) return { andar: a, sala: null };
  }
  return null;
}

// ---------------------------------------------------------------- inimigos

/**
 * Que inimigos nascem num papel de sala do andar.
 * @param {number} andar @param {string} papel
 */
export function composicao(andar, papel) {
  const papelInimigo = papel === "boss" ? "boss" : papel === "miniboss" ? "elite" : papel === "elite" ? "elite" : "comum";
  let lista = INIMIGOS.filter((i) => i.andar === andar && i.papel === papelInimigo);
  if (!lista.length) lista = INIMIGOS.filter((i) => i.andar === andar && i.papel === "comum");
  if (!lista.length) lista = INIMIGOS.filter((i) => i.papel === papelInimigo);
  return lista;
}

/**
 * Quantos inimigos numa sala.
 * @param {string} papel @param {number} nSpawns @param {number} jogadores @param {number} andar
 */
export function quantidade(papel, nSpawns, jogadores, andar) {
  const escala = 1 + 0.5 * (Math.max(1, jogadores) - 1);
  if (papel === "boss") return Math.round((1 + andar * 0.8) * escala);
  if (papel === "miniboss") return Math.max(1, Math.round(escala));
  if (papel === "elite") return Math.max(1, Math.round((0.6 + andar * 0.3) * escala));
  const base = Math.min(nSpawns, 2 + Math.ceil(andar * 0.8));
  return Math.max(2, Math.round(base * escala));
}

/**
 * @param {import("@minecraft/server").Dimension} dim
 * @param {string} id  id do inimigo (sem o prefixo)
 * @param {{ x: number, y: number, z: number }} l
 */
function nascer(dim, id, l) {
  try {
    const e = dim.spawnEntity(PREFIXO_ENT + id, { x: l.x, y: l.y, z: l.z });
    emitir(dim, "minecraft:large_explosion", { x: l.x, y: l.y + 0.5, z: l.z });
    return e;
  } catch (e) {
    registrarErro(`Masmorra: nascer ${id}`, e);
    return undefined;
  }
}

/**
 * Acorda a sala.
 * @param {ResultadoAndar} a @param {SalaResultado} s @param {Player[]} perto
 */
function acordar(a, s, perto) {
  const k = chaveSala(a.andar, s.id);
  const st = salas.get(k) ?? { estado: "dormindo", vivos: new Set(), desde: 0, visto: 0, fase: 0 };
  salas.set(k, st);
  if (st.estado !== "dormindo") return;
  if (!s.spawns.length && s.papel !== "boss") return;
  const dim = world.getDimension(dimId);
  const lista = composicao(a.andar, s.papel);
  if (!lista.length) return;
  const n = quantidade(s.papel, s.spawns.length, perto.length, a.andar);
  const pontos = [...s.spawns];
  if (s.papel === "boss" && a.arena) pontos.unshift([a.arena.x, a.arena.y, a.arena.z]);
  if (!pontos.length) return;
  st.estado = "ativa";
  st.desde = Date.now();
  st.visto = Date.now();
  st.fase = 0;
  for (let i = 0; i < n; i++) {
    const d = s.papel === "boss" && i === 0 ? lista[0] : lista[Math.floor(rng() * lista.length)];
    const pt = s.papel === "boss" && i === 0 ? pontos[0] : pontos[(i + (s.papel === "boss" ? 1 : 0)) % pontos.length];
    // o guardião nasce sozinho; o resto é escolta comum do andar
    let id = d.id;
    if (s.papel === "boss" && i > 0) {
      const esc = INIMIGOS.filter((x) => x.andar === a.andar && x.papel === "comum");
      if (esc.length) id = esc[Math.floor(rng() * esc.length)].id;
    }
    const e = nascer(dim, id, { x: pt[0], y: pt[1], z: pt[2] });
    if (e) st.vivos.add(e.id);
  }
  for (const p of perto) {
    if (s.papel === "boss") {
      mostrarTitulo(p, textos.BOSS_ENTRA(textos.GUARDIOES[a.andar]), { subtitulo: textos.BOSS_SUB });
      som(p, "mob.enderdragon.growl", { volume: 0.5, pitch: 0.7 });
    } else if (s.papel === "elite" || s.papel === "miniboss") {
      mostrarTitulo(p, textos.EMBOSCADA, { subtitulo: textos.EMBOSCADA_SUB, fica: 30 });
    }
  }
}

/** Reconta os vivos da sala. @param {ResultadoAndar} a @param {SalaResultado} s */
function conferirSala(a, s) {
  const k = chaveSala(a.andar, s.id);
  const st = salas.get(k);
  if (!st || st.estado !== "ativa") return;
  for (const id of [...st.vivos]) {
    const e = world.getEntity(id);
    if (!e || !e.isValid) st.vivos.delete(id);
  }
  if (st.vivos.size === 0) {
    st.estado = "limpa";
    st.desde = Date.now();
    for (const p of world.getAllPlayers()) {
      if (p.dimension.id !== dimId) continue;
      const o = onde(p.location);
      if (o && o.andar.andar === a.andar && o.sala?.id === s.id) {
        msg(p, textos.SALA_LIMPA);
        emitir(p.dimension, "minecraft:totem_particle", { x: p.location.x, y: p.location.y + 1, z: p.location.z });
      }
    }
  }
}

/** Some com os inimigos de uma sala e a põe para dormir. @param {ResultadoAndar} a @param {SalaResultado} s */
function dormir(a, s) {
  const st = salas.get(chaveSala(a.andar, s.id));
  if (!st) return;
  for (const id of st.vivos) {
    try {
      const e = world.getEntity(id);
      if (e?.isValid) e.remove();
    } catch {
      /* já foi */
    }
  }
  st.vivos.clear();
  st.estado = "dormindo";
}

// ---------------------------------------------------------------- habilidades (masm_habil.js)

/** Ganchos para as habilidades: nascer um aliado já registrado na sala do invocador. @type {import("./masm_habil.js").Ganchos} */
const ganchos = {
  nascer(dim, id, l) {
    const f = nascer(dim, id, l);
    const o = onde(l);
    if (f && o?.sala) salas.get(chaveSala(o.andar.andar, o.sala.id))?.vivos.add(f.id);
    return f;
  },
};

/** Fases do guardião pela vida. @param {Entity} e */
function atualizarFase(e) {
  const vida = e.getComponent("minecraft:health");
  if (!vida) return;
  const frac = vida.currentValue / vida.effectiveMax;
  const fase = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
  const atual = /** @type {number} */ (e.getProperty("vulpus:fase") ?? 0);
  if (fase > atual) {
    e.setProperty("vulpus:fase", fase);
    const d = DADOS.get(e.typeId.replace(PREFIXO_ENT, ""));
    for (const p of e.dimension.getPlayers({ location: e.location, maxDistance: 30 })) {
      msg(p, textos.BOSS_FASE(d?.nome ?? "O guardião", fase + 1));
      som(p, "mob.wither.spawn", { volume: 0.4, pitch: 1.4 });
    }
    e.addEffect("speed", 20 * 600, { amplifier: fase, showParticles: false });
    e.addEffect("strength", 20 * 600, { amplifier: fase - 1 >= 0 ? fase - 1 : 0, showParticles: false });
  }
}

// ---------------------------------------------------------------- recompensas e progresso

/** Dá a recompensa sorteada para a pessoa (itens + Caudas dentro do teto do dia). @param {Player} p @param {number} andar @param {string} papel @param {string} origem */
export function pagarLoot(p, andar, papel, origem) {
  const r = sortearRecompensa(rng, andar, papel, bonusSorte(p));
  try {
    const item = new ItemStack(r.item.id, r.quantidade);
    const sobra = p.getComponent("minecraft:inventory")?.container?.addItem(item);
    if (sobra) p.dimension.spawnItem(sobra, p.location);
  } catch (e) {
    registrarErro(`Masmorra: item ${r.item.id}`, e);
  }
  const cor = textos.RARIDADES[r.raridade];
  msg(p, textos.BAU_ACHOU(`${cor.cor}${cor.nome}`, `§f${r.quantidade}x ${r.item.nome}`));
  paga(p, r.caudas);
  const raro = r.raridade === "epico" || r.raridade === "lendario";
  som(p, raro ? "random.levelup" : "random.orb", { volume: 0.7 });
  if (raro) emitir(p.dimension, "minecraft:totem_particle", { x: p.location.x, y: p.location.y + 1, z: p.location.z });
  void origem;
}

/** Caudas dentro do teto diário. @param {Player} p @param {number} n */
function paga(p, n) {
  const teto = config().masmCaudasDia;
  const dia = estado.caudasDoDia(p.id);
  const livre = Math.max(0, teto - dia.n);
  if (livre <= 0) {
    if (n > 0) msg(p, textos.TETO_CAUDAS);
    return;
  }
  const v = Math.min(n, livre);
  dia.n += v;
  estado.salvarProgresso(p.id);
  adicionarCaudas(p, v);
  msg(p, textos.CAUDAS_GANHAS(v));
}

/** Morte de inimigo: loot de quem participou, abates e (se for guardião) o Selo. @param {string} tipo @param {{ x: number, y: number, z: number }} l @param {import("@minecraft/server").Dimension} dim */
function aoMorrerInimigo(tipo, l, dim, inimigoId = "") {
  const d = DADOS.get(tipo.replace(PREFIXO_ENT, ""));
  if (!d) return;
  // só participa do abate (Caudas, loot, ranking) quem bateu no inimigo há pouco e está perto: ficar parado ao lado não vale
  const perto = participantes(inimigoId, l, dim);
  for (const p of perto) {
    const pr = estado.progresso(p.id);
    pr.abates[d.andar - 1] = (pr.abates[d.andar - 1] ?? 0) + 1;
    estado.salvarProgresso(p.id);
    if (d.caudas) paga(p, d.caudas);
    if (d.papel === "elite" || d.papel === "boss") pagarLoot(p, d.andar, d.papel, d.id);
    else if (rng() < 0.08) pagarLoot(p, d.andar, "comum", d.id);
    if (d.papel === "boss") concluirAndar(p, d.andar);
  }
  if (d.papel === "boss") {
    for (const p of perto) msg(p, textos.BOSS_CAIU(d.nome));
  }
}

/** Selo da Cauda e marca no ranking. @param {Player} p @param {number} n */
function concluirAndar(p, n) {
  const pr = estado.progresso(p.id);
  const primeiro = !estado.temSelo(p.id, n);
  const t = pr.inicio[n - 1] ? Date.now() - pr.inicio[n - 1] : 0;
  if (primeiro) {
    estado.darSelo(p.id, n);
    darFicha(p, 1, `Selo da Cauda do andar ${n}`);
    mostrarTitulo(p, textos.SELO_TITULO, { subtitulo: n < 5 ? textos.SELO_NOVO(n) : "§7O Coração das Nove Caudas bate de novo." });
    som(p, "random.totem", { volume: 0.8 });
    if (n < 5) msg(p, textos.SELO_NOVO(n));
  }
  if (t > 0) estado.registrarMarca(n, { id: p.id, nome: p.name, t, m: pr.mortes[n - 1] ?? 0 });
  pr.inicio[n - 1] = 0;
  pr.mortes[n - 1] = 0;
  estado.salvarProgresso(p.id);
}

// ---------------------------------------------------------------- altar, baús e portais

/** @param {number} x @param {number} y @param {number} z */
const chaveBloco = (x, y, z) => `${x},${y},${z}`;

/** @returns {Map<string, { tipo: "altar" | "bau", andar: ResultadoAndar, papel: string, indice: number }>} */
function indice() {
  const m = new Map();
  for (const a of estado.andaresProntos()) {
    if (a.altar) m.set(chaveBloco(a.altar.x, a.altar.y, a.altar.z), { tipo: "altar", andar: a, papel: "", indice: 0 });
    a.baus.forEach((b, i) => m.set(chaveBloco(b.x, b.y, b.z), { tipo: "bau", andar: a, papel: b.papel, indice: i }));
  }
  return m;
}
/** @type {ReturnType<typeof indice> | null} */
let cacheIndice = null;
export function recarregarIndice() {
  cacheIndice = null;
}

/** @param {Player} p @param {ResultadoAndar} a @param {string} papel @param {number} i */
function abrirBau(p, a, papel, i) {
  const aberto = estado.bausDoDia(p.id);
  const chave = `${a.andar}:${i}`;
  if (aberto.chaves.includes(chave)) {
    msg(p, textos.BAU_JA_ABERTO);
    som(p, "random.chestclosed");
    return;
  }
  aberto.chaves.push(chave);
  estado.salvarProgresso(p.id);
  som(p, "random.chestopen");
  const n = papel === "boss" ? 3 : papel === "tesouro" || papel === "secreta" ? 2 : 1;
  for (let k = 0; k < n; k++) pagarLoot(p, a.andar, papel, "bau");
}

/** Cura e agrada a pessoa no altar. @param {Player} p */
function curar(p) {
  try {
    const v = p.getComponent("minecraft:health");
    v?.resetToMaxValue();
    p.addEffect("regeneration", 100, { amplifier: 1, showParticles: false });
    msg(p, textos.ALTAR_CURA);
    emitir(p.dimension, "minecraft:heart_particle", { x: p.location.x, y: p.location.y + 1.5, z: p.location.z });
  } catch (e) {
    registrarErro("Masmorra: curar", e);
  }
}

/** Menu do altar. @param {Player} p @param {ResultadoAndar} a */
async function menuAltar(p, a) {
  curar(p);
  const f = new ActionFormData().title(textos.ALTAR_TITULO).body(textos.ALTAR_CORPO(a.andar, estado.contarSelos(p.id)));
  f.button(textos.ALTAR_BOTAO_RANK);
  f.button(textos.ALTAR_BOTAO_PROGRESSO);
  f.button(textos.ALTAR_BOTAO_FECHAR);
  const r = await mostrar(p, f);
  if (!r || r.canceled || !("selection" in r)) return;
  if (r.selection === 0) await menuRanking(p, a.andar);
  else if (r.selection === 1) await menuProgresso(p, a);
}

/** @param {Player} p @param {number} n */
async function menuRanking(p, n) {
  const lista = estado.ranking()[n] ?? [];
  const corpo = lista.length ? lista.map((m, i) => textos.RANK_LINHA(i + 1, m.nome, formatarTempo(Math.round(m.t / 1000)), m.m)).join("\n") : textos.RANK_VAZIO;
  const f = new ActionFormData().title(textos.RANK_TITULO(n)).body(corpo).button(textos.ALTAR_BOTAO_FECHAR);
  await mostrar(p, f);
}

/** @param {Player} p @param {ResultadoAndar} a */
async function menuProgresso(p, a) {
  const pr = estado.progresso(p.id);
  const linhas = [];
  for (let n = 1; n <= estado.ANDARES; n++) linhas.push(textos.PROGRESSO_LINHA(n, estado.temSelo(p.id, n), pr.abates[n - 1] ?? 0));
  const f = new ActionFormData().title(textos.PROGRESSO_TITULO).body(linhas.join("\n")).button(textos.ALTAR_BOTAO_FECHAR);
  await mostrar(p, f);
  void a;
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    if (!cacheIndice) cacheIndice = indice();
    if (!cacheIndice.size) return;
    const b = ev.block;
    const alvo = cacheIndice.get(chaveBloco(b.location.x, b.location.y, b.location.z));
    if (!alvo) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    system.run(() => {
      try {
        if (!p.isValid) return;
        if (alvo.tipo === "altar") void menuAltar(p, alvo.andar);
        else abrirBau(p, alvo.andar, alvo.papel, alvo.indice);
      } catch (e) {
        registrarErro("Masmorra: interação", e);
      }
    });
  } catch (e) {
    registrarErro("Masmorra: interação", e);
  }
});

/** Portais internos: o "desce" de cada andar só abre com o Selo. @returns {import("./obras_viagem.js").Portal[]} */
export function portaisDosAndares() {
  const lista = [];
  const todos = estado.andaresProntos();
  for (const a of todos) {
    for (const pt of a.portais) {
      if (pt.nome === "desce") {
        const prox = todos.find((x) => x.andar === a.andar + 1);
        if (!prox) continue;
        lista.push({
          id: `masm:desce:${a.andar}`, nome: textos.NOMES_ANDAR[a.andar + 1], d: dimId, zona: pt.zona, destino: prox.chegada, semEspera: true,
          permite: (/** @type {Player} */ p) => (ehStaff(p) || estado.temSelo(p.id, a.andar) ? null : textos.SEM_SELO(a.andar)),
        });
      } else if (pt.nome === "volta") {
        const ant = todos.find((x) => x.andar === a.andar - 1);
        if (!ant) continue; // o do andar 1 é ligado pela Sala dos Portais (obras.js)
        const pd = ant.portais.find((q) => q.nome === "desce");
        lista.push({ id: `masm:volta:${a.andar}`, nome: textos.NOMES_ANDAR[a.andar - 1], d: dimId, zona: pt.zona, destino: pd ? pd.chegada : ant.chegada, semEspera: true });
      }
    }
  }
  return lista;
}

// ---------------------------------------------------------------- laço principal

/** @param {Player} p */
function resgatar(p, a) {
  const agora = Date.now();
  if (agora - (resgates.get(p.id) ?? 0) < 4000) return;
  resgates.set(p.id, agora);
  const pr = estado.progresso(p.id);
  pr.mortes[a.andar - 1] = (pr.mortes[a.andar - 1] ?? 0) + 1;
  estado.salvarProgresso(p.id);
  p.getComponent("minecraft:health")?.resetToMaxValue();
  p.addEffect("resistance", 100, { amplifier: 4, showParticles: false });
  p.addEffect("blindness", 30, { amplifier: 0, showParticles: false });
  p.extinguishFire?.();
  const c = a.chegada;
  teleportar(p, { x: c.x, y: c.y, z: c.z, d: dimId }, { semEspera: true, tema: "spawn", salvarVoltar: false });
  msg(p, textos.MORTE_VOLTA);
}

/** @type {Map<string, { andar: number, desde: number }>} quem acabou de cruzar a caixa de um andar (só vale depois de uns segundos) */
const chegando = new Map();
/** Quanto tempo a pessoa precisa ficar num andar para ele valer (túneis e poços que só cruzam a caixa do andar não contam). */
const PRESENCA_TICKS = 50;

function laco() {
  const agora = Date.now();
  const jogadores = world.getAllPlayers().filter((p) => p.dimension.id === dimId);
  if (!jogadores.length) return;
  const andares = estado.andaresProntos();
  if (!andares.length) return;
  /** @type {Set<string>} */
  const vistas = new Set();
  for (const p of jogadores) {
    const l = p.location;
    const o = onde(l);
    // o caminho secreto (poço e túnel do mistério) passa por dentro da caixa de um andar: lá não vale nada do andar. Nos corredores,
    // só conta quem está na altura do piso (quem cruza por cima ou por baixo não entrou na masmorra).
    const cruzando = !o || pontoEmZona({ x: l.x, y: l.y, z: l.z, d: p.dimension.id }) || (!o.sala && Math.abs(l.y - o.andar.yPiso) > 8);
    if (cruzando) {
      noAndar.delete(p.id);
      chegando.delete(p.id);
      continue;
    }
    const a = o.andar;
    if (noAndar.get(p.id) !== a.andar) {
      const c = chegando.get(p.id);
      if (!c || c.andar !== a.andar) {
        chegando.set(p.id, { andar: a.andar, desde: system.currentTick });
        continue;
      }
      if (system.currentTick - c.desde < PRESENCA_TICKS) continue;
      chegando.delete(p.id);
    }
    if (noAndar.get(p.id) !== a.andar) {
      noAndar.set(p.id, a.andar);
      mostrarTitulo(p, textos.TITULO_ANDAR(a.andar), { subtitulo: textos.SUBTITULO_ANDAR(a.andar) });
      const pr = estado.progresso(p.id);
      if (!pr.inicio[a.andar - 1]) {
        pr.inicio[a.andar - 1] = agora;
        estado.salvarProgresso(p.id);
      }
    }
    const vida = p.getComponent("minecraft:health");
    if (vida && vida.currentValue <= VIDA_RESGATE && !ehStaff(p)) resgatar(p, a);
    if (o.sala) {
      const k = chaveSala(a.andar, o.sala.id);
      vistas.add(k);
      const st = salas.get(k);
      if (st) st.visto = agora;
      if (!st || st.estado === "dormindo") {
        const papel = o.sala.papel;
        if (papel !== "entrada" && papel !== "descanso" && papel !== "tesouro" && papel !== "secreta") {
          const vizinhos = jogadores.filter((q) => Math.hypot(q.location.x - p.location.x, q.location.z - p.location.z) < 24);
          acordar(a, o.sala, vizinhos);
        }
      } else if (st.estado === "limpa" && agora - st.desde > REPOUSO_SALA_MS) {
        st.estado = "dormindo";
      }
    }
  }
  // inimigos: habilidades e fases
  const dim = world.getDimension(dimId);
  for (const p of jogadores) {
    let ents;
    try {
      ents = dim.getEntities({ families: ["vulpus_inimigo"], location: p.location, maxDistance: 28 });
    } catch {
      continue;
    }
    for (const e of ents) {
      const d = DADOS.get(e.typeId.replace(PREFIXO_ENT, ""));
      if (!d) continue;
      if (d.papel === "boss") atualizarFase(e);
      if (!d.hab.length) continue;
      const alvo = dim.getPlayers({ location: e.location, maxDistance: 16, closest: 1 })[0];
      if (!alvo) continue;
      for (const h of d.hab) usarHabilidade(e, alvo, h, agora, d.andar, ganchos);
    }
  }
  // salas ativas: conferir, e dormir as que ficaram sem ninguém
  for (const a of andares) {
    for (const s of a.salas) {
      const st = salas.get(chaveSala(a.andar, s.id));
      if (!st || st.estado !== "ativa") continue;
      conferirSala(a, s);
      if (st.estado === "ativa" && !vistas.has(chaveSala(a.andar, s.id)) && agora - st.visto > SUMIR_SEM_JOGADOR_MS) dormir(a, s);
    }
  }
}

system.runInterval(() => {
  try {
    if (!config().masmLigada) return;
    laco();
  } catch (e) {
    registrarErro("Masmorra: laço", e);
  }
}, PASSO);

world.afterEvents.entityDie.subscribe((ev) => {
  try {
    const e = ev.deadEntity;
    if (!e.typeId.startsWith(PREFIXO_ENT)) return;
    aoMorrerInimigo(e.typeId, e.location, e.dimension, e.id);
  } catch (err) {
    registrarErro("Masmorra: abate", err);
  }
});

/** Quem renasceu dentro de um andar (morte que passou do resgate) volta ao altar. */
world.afterEvents.playerSpawn.subscribe((ev) => {
  try {
    if (ev.initialSpawn) return;
    const p = ev.player;
    const o = onde(p.location);
    if (o) system.runTimeout(() => p.isValid && resgatar(p, o.andar), 5);
  } catch (e) {
    registrarErro("Masmorra: renascer", e);
  }
});

/** Para o orquestrador: liga os portais e reindexa. */
export function iniciarAndares() {
  recarregarIndice();
  salas.clear();
}

