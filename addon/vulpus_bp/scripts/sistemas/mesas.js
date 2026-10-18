// @ts-check
// Mesas de jogo da feira: xadrez e jogo da velha. A pessoa senta numa almofada (uma entidade-assento invisível que ela
// "monta"), clica na mesa para entrar e a partida começa quando as duas entram. Tem tempo; quem sair da almofada,
// desconectar, fechar o menu na própria vez ou deixar o tempo acabar perde. Só diversão: sem Caudas.
// As regras dos jogos estão em xadrez_motor.js e velha_motor.js; o painel da staff, em feira_staff.js.
import { Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { achadas, esquecerBusca, precisaAplicar } from "../core/entidades.js";
import { manterTexto } from "../core/flutuante.js";
import { grade, Lista } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { INDICE_ALMOFADA, INDICE_TAB_VELHA, INDICE_TAB_XADREZ } from "../textos/props_modelos.js";
import * as textos from "../textos/mesas.js";
import * as velha from "./velha_motor.js";
import * as xadrez from "./xadrez_motor.js";
import { online } from "../core/jogadores.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {"xadrez" | "velha"} Tipo */
/** @typedef {{ x: number, y: number, z: number, d: string, bx: number, by: number, bz: number }} PontoMesa */
/** @typedef {{ x: number, y: number, z: number, d: string, bx: number, by: number, bz: number, yaw: number }} Assento */
/** @typedef {{ tipo: Tipo, mesa?: PontoMesa, a: (Assento | null)[] }} MesaDef */
/** @typedef {{ mesas: Record<string, MesaDef>, vit: Record<string, { n: string, xadrez: number, velha: number }> }} Dados */
/**
 * @typedef {object} Jogo
 * @property {Tipo} tipo
 * @property {{ id: string, nome: string }[]} jogadores  na ordem dos assentos
 * @property {number} turno  índice em jogadores
 * @property {number} token  muda a cada turno (respostas de menus velhos são ignoradas)
 * @property {number} inicioTurno  tick
 * @property {boolean} fim
 * @property {{ t: (velha.Marca | null)[], marcas: velha.Marca[] }} [velha]
 * @property {{ est: xadrez.Estado, cores: xadrez.Cor[], hist: Map<string, number>, relogio: number[], ultimoTick: number, ultimo: string, destaque: number[] }} [xadrez]
 */
/** @typedef {{ id: string, ocupantes: (string | undefined)[], entrou: boolean[], desde: number[], contagem?: number, jogo?: Jogo }} Sessao */

const CHAVE = "vulpus:mesas";
const ENTIDADE_ASSENTO = "vulpus:assento";
const ENTIDADE_PROP = "vulpus:prop";
const TAG_DECO = "vulpus_mesadeco_";
const MAX_MESAS = 8;
const PASSO_MANTER = 100;
const PASSO_MONITOR = 4;
const PASSO_RELOGIO = 10;
/** Ticks depois de sentar em que ainda não se confere se a pessoa continua montada. */
const CARENCIA_SENTAR = 12;
const ALTURA_TEXTO = 1.5;
const RELOGIO_MS_POR_TICK = 50;

/** @type {Dados | undefined} */
let dados;
/** @type {Map<string, Sessao>} */
const sessoes = new Map();
/** @type {Map<string, { mesa: string, idx: number }>} id da pessoa → onde está sentada */
const dePessoa = new Map();

// ------------------------------------------------------------------------------------- dados
/** @param {any} p */
const ehNumero = (p) => typeof p === "number" && Number.isFinite(p);

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {Record<string, MesaDef>} */
  const mesas = {};
  if (s.mesas && typeof s.mesas === "object") {
    for (let i = 1; i <= MAX_MESAS; i++) {
      const m = s.mesas[String(i)];
      if (!m || typeof m !== "object") continue;
      const ponto = (/** @type {any} */ p) => !!p && typeof p.d === "string" && ["x", "y", "z", "bx", "by", "bz"].every((k) => ehNumero(p[k]));
      mesas[String(i)] = {
        tipo: m.tipo === "velha" ? "velha" : "xadrez",
        mesa: ponto(m.mesa) ? m.mesa : undefined,
        a: [0, 1].map((k) => (ponto(m.a?.[k]) ? { ...m.a[k], yaw: ehNumero(m.a[k].yaw) ? m.a[k].yaw : 0 } : null)),
      };
    }
  }
  /** @type {Dados["vit"]} */
  const vit = {};
  if (s.vit && typeof s.vit === "object") {
    for (const [id, v] of Object.entries(s.vit)) {
      const x = /** @type {any} */ (v);
      if (x && typeof x === "object") vit[id] = { n: String(x.n ?? ""), xadrez: Number(x.xadrez) || 0, velha: Number(x.velha) || 0 };
    }
  }
  dados = { mesas, vit };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** @param {string} id */
function sessaoDe(id) {
  let s = sessoes.get(id);
  if (!s) {
    s = { id, ocupantes: [undefined, undefined], entrou: [false, false], desde: [0, 0] };
    sessoes.set(id, s);
  }
  return s;
}

/** @param {string | undefined} id @returns {Player | undefined} */
const pessoa = (id) => (id ? online().find((p) => p.id === id) : undefined);

const nomeJogo = (/** @type {Tipo} */ t) => textos.NOME_JOGO[t];

// --------------------------------------------------------------------------------- assentos
/** @param {string} mesa @param {number} idx */
const tagAssento = (mesa, idx) => `vulpus_assento_${mesa}_${idx}`;
/** @param {string} mesa */
const tagTexto = (mesa) => `vulpus_mesa_${mesa}`;
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];

/** @returns {Entity[]} */
function todosAssentos() {
  return achadas("mesas:assentos", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE_ASSENTO }));
    return achados;
  });
}

/** @param {string} mesa @param {number} idx */
function acharAssento(mesa, idx) {
  return todosAssentos().find((e) => e.isValid && e.hasTag(tagAssento(mesa, idx)));
}

const alturaAssento = () => config().mesasAssentoAlturaCm / 100;

/** Garante uma entidade-assento por almofada marcada e o texto flutuante de cada mesa. */
function manter() {
  try {
    const d = lerDados();
    const achados = todosAssentos();
    const validas = new Set();
    for (const [id, def] of Object.entries(d.mesas)) {
      def.a.forEach((a, idx) => {
        if (a) validas.add(tagAssento(id, idx));
      });
    }
    for (const e of achados) {
      if (!e.getTags().some((t) => validas.has(t))) e.remove();
    }
    for (const [id, def] of Object.entries(d.mesas)) {
      def.a.forEach((a, idx) => {
        if (!a) return;
        const dim = world.getDimension(a.d);
        const p = { x: a.x, y: a.y + alturaAssento(), z: a.z };
        if (!dim.isChunkLoaded(p)) return;
        const tag = tagAssento(id, idx);
        const mesmos = achados.filter((e) => e.isValid && e.hasTag(tag));
        let ent = mesmos.find((e) => e.dimension.id === dim.id);
        for (const e of mesmos) if (e !== ent) e.remove();
        if (!ent) {
          ent = dim.spawnEntity(ENTIDADE_ASSENTO, p);
          ent.addTag(tag);
          esquecerBusca("mesas:assentos");
        } else if (!precisaAplicar(ent, `${p.x}|${p.y}|${p.z}|${a.yaw}|${sessaoDe(id).ocupantes[idx] ? 1 : 0}`)) {
          return;
        } else if (Math.hypot(ent.location.x - p.x, ent.location.y - p.y, ent.location.z - p.z) > 0.05 && !sessaoDe(id).ocupantes[idx]) {
          ent.teleport(p, { dimension: dim });
        }
        ent.setRotation({ x: 0, y: a.yaw });
      });
      atualizarTexto(id);
    }
    manterDeco(d);
  } catch (e) {
    registrarErro("Mesas: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/**
 * Props decorativos das mesas: o tabuleiro em cima do bloco da mesa (brancas do lado da primeira almofada) e uma
 * almofada em cada assento. Tudo some se a decoração for desligada ou a mesa removida.
 * @param {Dados} d
 */
function manterDeco(d) {
  /** @type {{ tag: string, modelo: number, d: string, x: number, y: number, z: number, yaw: number }[]} */
  const queridos = [];
  if (config().mesasDecoracao) {
    for (const [id, def] of Object.entries(d.mesas)) {
      const yawMesa = def.a[0]?.yaw ?? (def.a[1] ? def.a[1].yaw + 180 : 0);
      if (def.mesa) {
        const modelo = def.tipo === "velha" ? INDICE_TAB_VELHA : INDICE_TAB_XADREZ;
        queridos.push({ tag: `${TAG_DECO}${id}_m`, modelo, d: def.mesa.d, x: def.mesa.x, y: def.mesa.y, z: def.mesa.z, yaw: yawMesa });
      }
      def.a.forEach((a, idx) => {
        if (a) queridos.push({ tag: `${TAG_DECO}${id}_${idx}`, modelo: INDICE_ALMOFADA, d: a.d, x: a.x, y: a.y, z: a.z, yaw: a.yaw });
      });
    }
  }
  const meus = achadas("mesas:deco", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const dim of DIMENSOES) achados.push(...world.getDimension(dim).getEntities({ type: ENTIDADE_PROP }));
    return achados.filter((e) => e.isValid && e.getTags().some((t) => t.startsWith(TAG_DECO)));
  });
  const tags = new Set(queridos.map((q) => q.tag));
  for (const e of meus) if (!e.getTags().some((t) => tags.has(t))) e.remove();
  for (const q of queridos) {
    const dim = world.getDimension(q.d);
    const p = { x: q.x, y: q.y, z: q.z };
    if (!dim.isChunkLoaded(p)) continue;
    const mesmos = meus.filter((e) => e.isValid && e.hasTag(q.tag));
    const achou = mesmos.find((e) => e.dimension.id === dim.id);
    const ent = achou ?? dim.spawnEntity(ENTIDADE_PROP, p);
    if (!achou) esquecerBusca("mesas:deco");
    for (const e of mesmos) if (e !== ent) e.remove();
    if (!ent.hasTag(q.tag)) ent.addTag(q.tag);
    if (!precisaAplicar(ent, `${p.x}|${p.y}|${p.z}|${q.yaw}|${q.modelo}`)) continue;
    if (Math.hypot(ent.location.x - p.x, ent.location.y - p.y, ent.location.z - p.z) > 0.05) ent.teleport(p, { dimension: dim });
    ent.setRotation({ x: 0, y: q.yaw });
    ent.setProperty("vulpus:modelo", q.modelo);
  }
}

/** Vira o assento para a mesa. @param {MesaDef} def */
function recalcularYaw(def) {
  const m = def.mesa;
  if (!m) return;
  for (const a of def.a) {
    if (!a) continue;
    a.yaw = Math.round((Math.atan2(-(m.x - a.x), m.z - a.z) * 180) / Math.PI);
  }
}

// ----------------------------------------------------------------------------- texto da mesa
/** @param {number} ms */
function relogio(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Atualiza o texto flutuante em cima da mesa. @param {string} id */
function atualizarTexto(id) {
  try {
    const def = lerDados().mesas[id];
    if (!def?.mesa || !config().mesasLigadas) {
      manterTexto(tagTexto(id), undefined, "");
      return;
    }
    const s = sessaoDe(id);
    const linhas = [textos.TITULO_FLUTUANTE(nomeJogo(def.tipo))];
    const nomes = s.ocupantes.map((o) => pessoa(o)?.name);
    if (s.jogo && !s.jogo.fim) {
      const j = s.jogo;
      const quem = j.jogadores[j.turno].nome;
      let tempo;
      if (j.xadrez) tempo = relogio(j.xadrez.relogio[j.turno]);
      else tempo = relogio(config().mesasVelhaSeg * 1000 - (system.currentTick - j.inicioTurno) * RELOGIO_MS_POR_TICK);
      linhas.push(textos.FLUT_CONTRA(j.jogadores[0].nome, j.jogadores[1].nome), textos.FLUT_VEZ(quem, tempo));
    } else if (nomes[0] && nomes[1]) linhas.push(textos.FLUT_AMBOS_SENTADOS);
    else if (nomes[0] || nomes[1]) linhas.push(textos.FLUT_ESPERANDO(nomes[0] ?? /** @type {string} */ (nomes[1])));
    else linhas.push(textos.FLUT_LIVRE);
    manterTexto(tagTexto(id), { x: def.mesa.x, y: def.mesa.y + ALTURA_TEXTO, z: def.mesa.z, d: def.mesa.d }, linhas.join(s.jogo && !s.jogo.fim ? "\n" : " §8• "));
  } catch (e) {
    registrarErro("Mesas: texto", e);
  }
}

// ----------------------------------------------------------------------------- sentar e levantar
/**
 * @param {Player} player
 * @param {string} mesaId
 * @param {number} idx
 */
function sentar(player, mesaId, idx) {
  if (!config().mesasLigadas) {
    erro(player, textos.MESAS_FECHADAS);
    return;
  }
  const def = lerDados().mesas[mesaId];
  if (!def?.a[idx]) return;
  if (dePessoa.has(player.id)) {
    erro(player, textos.JA_SENTADO);
    return;
  }
  const s = sessaoDe(mesaId);
  if (pessoa(s.ocupantes[idx])) {
    erro(player, textos.ASSENTO_OCUPADO);
    return;
  }
  const seat = acharAssento(mesaId, idx);
  const montou = seat?.getComponent("minecraft:rideable")?.addRider(player);
  if (!montou) {
    erro(player, textos.NAO_SENTOU);
    return;
  }
  s.ocupantes[idx] = player.id;
  s.entrou[idx] = false;
  s.desde[idx] = system.currentTick;
  dePessoa.set(player.id, { mesa: mesaId, idx });
  msg(player, textos.SENTOU(nomeJogo(def.tipo)));
  som(player, "random.click", { pitch: 1.2, volume: 0.6 });
  atualizarTexto(mesaId);
}

/**
 * A pessoa deixou a almofada (saiu, desconectou, morreu): perde a partida se estava jogando.
 * @param {Sessao} s
 * @param {number} idx
 * @param {string} motivo
 */
function levantou(s, idx, motivo) {
  const id = s.ocupantes[idx];
  s.ocupantes[idx] = undefined;
  s.entrou[idx] = false;
  if (id) dePessoa.delete(id);
  if (s.contagem !== undefined) cancelarContagem(s);
  if (s.jogo && !s.jogo.fim) terminar(s, 1 - idx, motivo);
  atualizarTexto(s.id);
}

/** Confere se todo mundo sentado continua na almofada. */
function vigiar() {
  try {
    const agora = system.currentTick;
    for (const s of sessoes.values()) {
      for (let idx = 0; idx < 2; idx++) {
        const id = s.ocupantes[idx];
        if (!id) continue;
        const p = pessoa(id);
        if (!p) {
          levantou(s, idx, textos.MOTIVO_DESCONECTOU);
          continue;
        }
        if (agora - s.desde[idx] < CARENCIA_SENTAR) continue;
        const montado = p.getComponent("minecraft:riding")?.entityRidingOn;
        const seat = acharAssento(s.id, idx);
        if (!montado || !seat || montado.id !== seat.id) levantou(s, idx, textos.MOTIVO_SAIU);
      }
    }
  } catch (e) {
    registrarErro("Mesas: vigiar", e);
  }
}
system.runInterval(vigiar, PASSO_MONITOR);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  const info = dePessoa.get(playerId);
  if (!info) return;
  const s = sessoes.get(info.mesa);
  if (s) levantou(s, info.idx, textos.MOTIVO_DESCONECTOU);
  dePessoa.delete(playerId);
});

// ------------------------------------------------------------------------------ entrar e começar
/**
 * @param {Player} player
 * @param {string} mesaId
 */
async function abrirMesa(player, mesaId) {
  if (!config().mesasLigadas) {
    erro(player, textos.MESAS_FECHADAS);
    return;
  }
  const def = lerDados().mesas[mesaId];
  const info = dePessoa.get(player.id);
  if (!def || !info || info.mesa !== mesaId) {
    erro(player, textos.SENTAR_ANTES);
    return;
  }
  const s = sessaoDe(mesaId);
  const idx = info.idx;
  const lista = new Lista(textos.TITULO_MENU(nomeJogo(def.tipo))).texto(textos.MENU_CORPO);
  if (s.jogo && !s.jogo.fim) {
    lista.botao(textos.BOTAO_DESISTIR, ICONES.sair, () => {
      if (s.jogo && !s.jogo.fim) terminar(s, 1 - idx, textos.MOTIVO_DESISTIU);
    });
  } else {
    lista.botao(textos.BOTAO_ENTRAR, ICONES.sim, (p) => entrar(p, s, idx));
    lista.botao(textos.BOTAO_LEVANTAR, ICONES.sair, () => levantarPessoa(s, idx));
  }
  await lista.abrir(player);
}

/** Pede para o jogo soltar a pessoa da almofada. @param {Sessao} s @param {number} idx */
function levantarPessoa(s, idx) {
  const p = pessoa(s.ocupantes[idx]);
  const seat = acharAssento(s.id, idx);
  if (p && seat) seat.getComponent("minecraft:rideable")?.ejectRider(p);
}

/**
 * @param {Player} player
 * @param {Sessao} s
 * @param {number} idx
 */
function entrar(player, s, idx) {
  if (s.ocupantes[idx] !== player.id || s.jogo) return;
  s.entrou[idx] = true;
  msg(player, textos.ENTROU);
  const outro = pessoa(s.ocupantes[1 - idx]);
  if (outro) msg(outro, textos.OUTRO_ENTROU(player.name));
  tentarIniciar(s);
}

/** @param {Sessao} s */
function tentarIniciar(s) {
  if (s.jogo || s.contagem !== undefined) return;
  if (!s.entrou[0] || !s.entrou[1] || !pessoa(s.ocupantes[0]) || !pessoa(s.ocupantes[1])) return;
  const total = Math.max(0, Math.floor(config().mesasContagemSeg));
  if (total === 0) {
    criarJogo(s);
    return;
  }
  s.contagem = total;
  const avisar = () => {
    for (const id of s.ocupantes) {
      const p = pessoa(id);
      if (p) p.onScreenDisplay.setActionBar(textos.CONTAGEM(/** @type {number} */ (s.contagem)));
    }
  };
  avisar();
  const run = system.runInterval(() => {
    if (s.contagem === undefined) {
      system.clearRun(run);
      return;
    }
    s.contagem -= 1;
    if (s.contagem > 0) {
      avisar();
      return;
    }
    system.clearRun(run);
    s.contagem = undefined;
    criarJogo(s);
  }, 20);
  contagens.set(s.id, run);
}

/** @type {Map<string, number>} */
const contagens = new Map();

/** @param {Sessao} s */
function cancelarContagem(s) {
  const run = contagens.get(s.id);
  if (run !== undefined) system.clearRun(run);
  contagens.delete(s.id);
  s.contagem = undefined;
  for (const id of s.ocupantes) {
    const p = pessoa(id);
    if (p) msg(p, textos.CONTAGEM_CANCELADA);
  }
}

/** @param {Sessao} s */
function criarJogo(s) {
  const def = lerDados().mesas[s.id];
  const p0 = pessoa(s.ocupantes[0]);
  const p1 = pessoa(s.ocupantes[1]);
  if (!def || !p0 || !p1) return;
  const agora = system.currentTick;
  const inverter = Math.random() < 0.5;
  /** @type {Jogo} */
  const jogo = {
    tipo: def.tipo,
    jogadores: [
      { id: p0.id, nome: p0.name },
      { id: p1.id, nome: p1.name },
    ],
    turno: 0,
    token: 0,
    inicioTurno: agora,
    fim: false,
  };
  if (def.tipo === "velha") {
    const marcas = /** @type {velha.Marca[]} */ (inverter ? ["O", "X"] : ["X", "O"]);
    jogo.velha = { t: velha.novoTabuleiro(), marcas };
    jogo.turno = marcas.indexOf("X");
  } else {
    const cores = /** @type {xadrez.Cor[]} */ (inverter ? ["b", "w"] : ["w", "b"]);
    const est = xadrez.novoEstado();
    const ms = Math.max(1, config().mesasXadrezMin) * 60_000;
    jogo.xadrez = { est, cores, hist: new Map([[xadrez.chavePosicao(est), 1]]), relogio: [ms, ms], ultimoTick: agora, ultimo: "", destaque: [] };
    jogo.turno = cores.indexOf("w");
  }
  s.jogo = jogo;
  [p0, p1].forEach((p, i) => {
    const outro = jogo.jogadores[1 - i].nome;
    const marca = jogo.velha ? jogo.velha.marcas[i] : jogo.xadrez?.cores[i] === "w" ? textos.BRANCAS : textos.PRETAS;
    msg(p, textos.COMECOU(nomeJogo(def.tipo), outro, marca));
    som(p, "random.levelup", { pitch: 1.1, volume: 0.7 });
  });
  iniciarTurno(s);
}

// ----------------------------------------------------------------------------------- as vezes
/** @param {Sessao} s */
function iniciarTurno(s) {
  const jogo = s.jogo;
  if (!jogo || jogo.fim) return;
  jogo.token += 1;
  jogo.inicioTurno = system.currentTick;
  if (jogo.xadrez) jogo.xadrez.ultimoTick = system.currentTick;
  atualizarTexto(s.id);
  const p = pessoa(jogo.jogadores[jogo.turno].id);
  if (p) {
    msg(p, textos.SUA_VEZ);
    som(p, "note.pling", { pitch: 1.4, volume: 0.6 });
  }
  const token = jogo.token;
  pedirJogada(s, token).catch((e) => registrarErro("Mesas: pedir jogada", e));
}

/**
 * Abre um menu e devolve o valor do botão escolhido (undefined = fechou o menu).
 * @template T
 * @param {Player} p
 * @param {string} titulo
 * @param {string} corpo
 * @param {{ texto: string, valor: T, icone?: string }[]} opcoes
 * @returns {Promise<{ valor: T } | undefined>}
 */
async function escolher(p, titulo, corpo, opcoes) {
  /** @type {{ valor: T } | undefined} */
  let escolhido;
  const lista = new Lista(titulo).texto(corpo);
  for (const o of opcoes) {
    lista.botao(o.texto, o.icone ?? ICONES.nova, () => {
      escolhido = { valor: o.valor };
    });
  }
  const clicou = await lista.abrir(p);
  return clicou ? escolhido : undefined;
}

const PASTA_TEX = "textures/vulpus/xadrez/";
const BOTAO_EXTRA_XADREZ = 64;
const BOTAO_EXTRA_VELHA = 9;

/**
 * Textura da casa do tabuleiro (casa clara/escura + peça + realce).
 * @param {number} casa  0 = a8 … 63 = h1
 * @param {string | null} peca  letra da peça (maiúscula = branca) ou null
 * @param {string} estado  n s m c u x
 */
function texturaCasa(casa, peca, estado) {
  const clara = (Math.floor(casa / 8) + (casa % 8)) % 2 === 0;
  const codigo = peca ? (peca === peca.toUpperCase() ? "w" : "b") + peca.toLowerCase() : "xx";
  return `${PASTA_TEX}${clara ? "l" : "d"}_${codigo}_${estado}`;
}

/**
 * Pede a jogada de quem tem a vez. Fechar o menu é derrota.
 * @param {Sessao} s
 * @param {number} token
 */
async function pedirJogada(s, token) {
  const jogo = s.jogo;
  if (!jogo) return;
  const idx = jogo.turno;
  const p = pessoa(jogo.jogadores[idx].id);
  if (!p) return;
  const valido = () => s.jogo === jogo && !jogo.fim && jogo.token === token;
  if (jogo.velha) {
    const v = jogo.velha;
    const marca = v.marcas[idx];
    const icones = v.t.map((c) => `${PASTA_TEX}${c === "X" ? "velha_x" : c === "O" ? "velha_o" : "velha_vazio"}`);
    for (;;) {
      const r = await grade(p, {
        flag: "VELHINHA",
        titulo: textos.TITULO_VELHA,
        corpo: textos.CORPO_VELHA(marca, config().mesasVelhaSeg),
        icones,
        extra: textos.BOTAO_DESISTIR_CURTO,
      });
      if (!valido()) return;
      if (r === undefined) terminar(s, 1 - idx, textos.MOTIVO_FECHOU);
      else if (r === BOTAO_EXTRA_VELHA) terminar(s, 1 - idx, textos.MOTIVO_DESISTIU);
      else if (v.t[r] !== null) continue;
      else jogarVelha(s, idx, r);
      return;
    }
  }
  const x = jogo.xadrez;
  if (!x) return;
  const cor = x.cores[idx];
  const nomeCor = cor === "w" ? textos.BRANCAS : textos.PRETAS;
  const legais = xadrez.lancesLegais(x.est);
  /** @type {Map<number, xadrez.Lance[]>} */
  const porOrigem = new Map();
  for (const m of legais) porOrigem.set(m.de, [...(porOrigem.get(m.de) ?? []), m]);
  const xeque = xadrez.emXeque(x.est, cor);
  const casaRei = x.est.t.indexOf(cor === "w" ? "K" : "k");
  /** @type {number | null} */
  let sel = null;
  for (;;) {
    const lancesSel = sel === null ? [] : (porOrigem.get(sel) ?? []);
    const destinos = new Map(lancesSel.map((m) => [m.para, m]));
    // a visão das pretas é girada: a posição k da grade mostra a casa 63 - k
    const casaDe = (/** @type {number} */ k) => (cor === "w" ? k : 63 - k);
    const icones = [];
    for (let k = 0; k < 64; k++) {
      const c = casaDe(k);
      const peca = x.est.t[c];
      let estado = "n";
      if (c === sel) estado = "s";
      else if (destinos.has(c)) estado = peca ? "c" : "m";
      else if (xeque && c === casaRei) estado = "x";
      else if (x.destaque.includes(c)) estado = "u";
      if (!peca && estado !== "n" && estado !== "m" && estado !== "u") estado = "n";
      icones.push(texturaCasa(c, peca, estado));
    }
    const dica = sel === null ? textos.DICA_ESCOLHA : textos.DICA_DESTINO;
    const r = await grade(p, {
      flag: "TABULEIRO",
      titulo: textos.TITULO_XADREZ,
      corpo: textos.CORPO_GRADE_XADREZ(nomeCor, xeque ? textos.AVISO_XEQUE : dica, x.ultimo ? textos.ULTIMO_LANCE(x.ultimo) : ""),
      icones,
      extra: textos.BOTAO_DESISTIR_CURTO,
    });
    if (!valido()) return;
    if (r === undefined) {
      terminar(s, 1 - idx, textos.MOTIVO_FECHOU);
      return;
    }
    if (r === BOTAO_EXTRA_XADREZ) {
      terminar(s, 1 - idx, textos.MOTIVO_DESISTIU);
      return;
    }
    const c = casaDe(r);
    const alvo = destinos.get(c);
    if (sel !== null && alvo) {
      const opcoes = lancesSel.filter((m) => m.para === c);
      let lance = opcoes[0];
      if (opcoes.length > 1) {
        const r2 = await escolher(
          p,
          textos.TITULO_PROMOCAO,
          textos.CORPO_PROMOCAO,
          opcoes.map((m) => ({ texto: xadrez.nomePeca(/** @type {string} */ (m.promo)), valor: m, icone: ICONES.nova })),
        );
        if (!valido()) return;
        if (!r2) {
          terminar(s, 1 - idx, textos.MOTIVO_FECHOU);
          return;
        }
        lance = r2.valor;
      }
      jogarXadrez(s, idx, lance);
      return;
    }
    if (c === sel) sel = null;
    else if (porOrigem.has(c)) sel = c;
  }
}

/**
 * @param {Sessao} s
 * @param {number} idx
 * @param {number} casa
 */
function jogarVelha(s, idx, casa) {
  const jogo = s.jogo;
  const v = jogo?.velha;
  if (!jogo || !v || v.t[casa] !== null) return;
  v.t[casa] = v.marcas[idx];
  const w = velha.vencedor(v.t);
  if (w) {
    terminar(s, idx, textos.MOTIVO_LINHA, w.linha);
    return;
  }
  if (velha.empatou(v.t)) {
    terminar(s, null, textos.EMPATE_VELHA);
    return;
  }
  jogo.turno = 1 - idx;
  iniciarTurno(s);
}

/**
 * @param {Sessao} s
 * @param {number} idx
 * @param {xadrez.Lance} lance
 */
function jogarXadrez(s, idx, lance) {
  const jogo = s.jogo;
  const x = jogo?.xadrez;
  if (!jogo || !x) return;
  x.relogio[idx] -= (system.currentTick - x.ultimoTick) * RELOGIO_MS_POR_TICK;
  const extra = lance.roque ? (lance.roque === "K" ? "roque pequeno" : "roque grande") : lance.cap ? "captura" : "";
  x.ultimo = textos.DESCRICAO_LANCE(xadrez.nomePeca(lance.peca), xadrez.nomeCasa(lance.de), xadrez.nomeCasa(lance.para), extra);
  x.est = xadrez.aplicar(x.est, lance);
  x.destaque = [lance.de, lance.para];
  const chave = xadrez.chavePosicao(x.est);
  const vezes = (x.hist.get(chave) ?? 0) + 1;
  x.hist.set(chave, vezes);
  const fim = xadrez.situacao(x.est);
  if (fim?.fim === "mate") terminar(s, idx, textos.MOTIVO_MATE);
  else if (fim?.fim === "afogamento") terminar(s, null, textos.EMPATE_AFOGAMENTO);
  else if (fim?.fim === "material") terminar(s, null, textos.EMPATE_MATERIAL);
  else if (fim?.fim === "50") terminar(s, null, textos.EMPATE_50);
  else if (vezes >= 3) terminar(s, null, textos.EMPATE_REPETICAO);
  else {
    jogo.turno = 1 - idx;
    iniciarTurno(s);
  }
}

// --------------------------------------------------------------------------------- relógio
/** Tempo: a cada passo confere o relógio e mostra o tempo na barra de cada jogador. */
/** @type {Map<string, { texto: string, tick: number }>} id → última barra enviada pelo cronômetro */
const barras = new Map();
/** A barra de ação some em ~3 s: o mesmo texto só é reenviado depois de tantos ticks. */
const TICKS_REENVIO_BARRA = 40;

/** Barra de ação do cronômetro: só envia se o texto mudou ou se está na hora de renovar. @param {Player | undefined} p @param {string} texto */
function barraDoJogo(p, texto) {
  if (!p) return;
  const agora = system.currentTick;
  const ultima = barras.get(p.id);
  if (ultima && ultima.texto === texto && agora - ultima.tick < TICKS_REENVIO_BARRA) return;
  barras.set(p.id, { texto, tick: agora });
  p.onScreenDisplay.setActionBar(texto);
}

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  barras.delete(playerId);
});

function cronometro() {
  try {
    const agora = system.currentTick;
    for (const s of sessoes.values()) {
      const jogo = s.jogo;
      if (!jogo || jogo.fim) continue;
      const idx = jogo.turno;
      if (jogo.xadrez) {
        const x = jogo.xadrez;
        x.relogio[idx] -= (agora - x.ultimoTick) * RELOGIO_MS_POR_TICK;
        x.ultimoTick = agora;
        if (x.relogio[idx] <= 0) {
          terminar(s, 1 - idx, textos.MOTIVO_TEMPO);
          continue;
        }
        jogo.jogadores.forEach((j, i) => {
          const p = pessoa(j.id);
          const rival = 1 - i;
          barraDoJogo(p, textos.BARRA_XADREZ(relogio(x.relogio[i]), relogio(x.relogio[rival]), jogo.turno === i));
        });
      } else if (jogo.velha) {
        const restante = config().mesasVelhaSeg * 1000 - (agora - jogo.inicioTurno) * RELOGIO_MS_POR_TICK;
        if (restante <= 0) {
          terminar(s, 1 - idx, textos.MOTIVO_TEMPO);
          continue;
        }
        jogo.jogadores.forEach((j, i) => {
          const p = pessoa(j.id);
          const vez = jogo.turno === i ? textos.SUA_VEZ : textos.VEZ_DO_OUTRO(jogo.jogadores[idx].nome);
          barraDoJogo(p, textos.BARRA_VELHA(vez, relogio(restante)));
        });
      }
      if (agora % 20 < PASSO_RELOGIO) atualizarTexto(s.id);
    }
  } catch (e) {
    registrarErro("Mesas: cronômetro", e);
  }
}
system.runInterval(cronometro, PASSO_RELOGIO);

// ------------------------------------------------------------------------------------- fim
/**
 * Encerra a partida. `vencedor` null = empate.
 * @param {Sessao} s
 * @param {number | null} vencedor  índice em jogadores
 * @param {string} motivo  de quem perdeu (com vencedor) ou do empate
 * @param {number[]} [linha]
 */
function terminar(s, vencedor, motivo, linha) {
  const jogo = s.jogo;
  if (!jogo || jogo.fim) return;
  jogo.fim = true;
  const nome = nomeJogo(jogo.tipo);
  const ps = jogo.jogadores.map((j) => pessoa(j.id));
  if (vencedor === null) {
    for (const p of ps) {
      if (!p) continue;
      msg(p, textos.EMPATE(nome, motivo));
      mostrarTitulo(p, textos.TITULO_EMPATE, { entrada: 2, fica: 40, saida: 10 });
    }
  } else {
    const perdedor = 1 - vencedor;
    const d = lerDados();
    const id = jogo.jogadores[vencedor].id;
    const reg = d.vit[id] ?? { n: jogo.jogadores[vencedor].nome, xadrez: 0, velha: 0 };
    reg.n = jogo.jogadores[vencedor].nome;
    reg[jogo.tipo] += 1;
    d.vit[id] = reg;
    gravar();
    const linhaTexto = jogo.velha && linha ? `\n${velha.tabuleiroTexto(jogo.velha.t, linha)}` : "";
    for (const p of ps) {
      if (!p) continue;
      msg(p, textos.PERDEU_POR(jogo.jogadores[perdedor].nome, motivo));
      msg(p, textos.VITORIA(jogo.jogadores[vencedor].nome, nome) + linhaTexto);
    }
    const pv = ps[vencedor];
    if (pv) {
      mostrarTitulo(pv, textos.TITULO_VENCEU, { subtitulo: textos.SUB_VITORIAS(reg[jogo.tipo]), entrada: 2, fica: 50, saida: 10 });
      som(pv, "random.levelup", { pitch: 1.2, volume: 0.9 });
    }
    const pp = ps[perdedor];
    if (pp) mostrarTitulo(pp, textos.TITULO_PERDEU, { entrada: 2, fica: 40, saida: 10 });
  }
  try {
    const def = lerDados().mesas[s.id];
    if (def?.mesa) {
      const dim = world.getDimension(def.mesa.d);
      const c = { x: def.mesa.x, y: def.mesa.y + 1, z: def.mesa.z };
      efeitos.anel(dim, c, { raio: 0.9, n: 10, y: 0 }, "minecraft:basic_flame_particle");
      efeitos.nuvem(dim, c, { n: 6, largura: 0.5, y0: 0, alto: 1 }, "minecraft:endrod");
    }
  } catch (e) {
    registrarErro("Mesas: efeito do fim", e);
  }
  s.jogo = undefined;
  s.entrou = [false, false];
  atualizarTexto(s.id);
}

// ------------------------------------------------------------------------------ interações
/**
 * @param {import("@minecraft/server").Block} bloco
 * @returns {{ mesa: string, tipo: "mesa" | "assento", idx: number } | undefined}
 */
function procurarBloco(bloco) {
  const { x, y, z } = bloco.location;
  const dim = bloco.dimension.id;
  for (const [id, def] of Object.entries(lerDados().mesas)) {
    const m = def.mesa;
    if (m && m.d === dim && m.bx === x && m.by === y && m.bz === z) return { mesa: id, tipo: "mesa", idx: 0 };
    for (let i = 0; i < 2; i++) {
      const a = def.a[i];
      if (a && a.d === dim && a.bx === x && a.by === y && a.bz === z) return { mesa: id, tipo: "assento", idx: i };
    }
  }
  return undefined;
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    const achado = procurarBloco(block);
    if (!achado) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() =>
      rodarSeguro(player, "Mesas", (p) => (achado.tipo === "mesa" ? abrirMesa(p, achado.mesa) : sentar(p, achado.mesa, achado.idx))),
    );
  } catch (e) {
    registrarErro("Mesas: interação", e);
  }
});

/**
 * Mesa e almofada que um prop decorativo ou um assento representa (o clique cai na entidade, não no bloco).
 * @param {Entity} ent
 * @returns {{ mesa: string, tipo: "mesa" | "assento", idx: number } | undefined}
 */
function acharPorEntidade(ent) {
  for (const t of ent.getTags()) {
    const deco = /^vulpus_mesadeco_(\d+)_(m|\d)$/.exec(t);
    if (deco) return deco[2] === "m" ? { mesa: deco[1], tipo: "mesa", idx: 0 } : { mesa: deco[1], tipo: "assento", idx: Number(deco[2]) };
    const assento = /^vulpus_assento_(\d+)_(\d)$/.exec(t);
    if (assento) return { mesa: assento[1], tipo: "assento", idx: Number(assento[2]) };
  }
  return undefined;
}

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    const { player, target } = ev;
    if (target.typeId !== ENTIDADE_PROP && target.typeId !== ENTIDADE_ASSENTO) return;
    const achado = acharPorEntidade(target);
    if (!achado) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    system.run(() =>
      rodarSeguro(player, "Mesas", (p) => (achado.tipo === "mesa" ? abrirMesa(p, achado.mesa) : sentar(p, achado.mesa, achado.idx))),
    );
  } catch (e) {
    registrarErro("Mesas: interação com a entidade", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!procurarBloco(ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Mesas: quebrar", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
/** @param {string} id */
export function mesaEmUso(id) {
  const s = sessoes.get(id);
  return !!s && (!!s.jogo || s.ocupantes.some((o) => !!pessoa(o)));
}

/** Resumo de cada mesa para o painel. */
export function estadoMesas() {
  const d = lerDados();
  return Array.from({ length: MAX_MESAS }, (_, i) => {
    const id = String(i + 1);
    const def = d.mesas[id];
    return { id, existe: !!def, tipo: def?.tipo ?? "xadrez", mesa: !!def?.mesa, assentos: def ? def.a.filter(Boolean).length : 0, a1: !!def?.a[0], a2: !!def?.a[1] };
  });
}

/** @param {string} id */
function garantir(id) {
  const d = lerDados();
  d.mesas[id] ??= { tipo: "xadrez", a: [null, null] };
  return d.mesas[id];
}

/**
 * O ponto para onde a staff olha (bloco e onde a vista bate nele).
 * @param {Player} player
 */
function olhado(player) {
  try {
    const hit = player.getBlockFromViewDirection({ maxDistance: 8 });
    if (!hit?.block) return undefined;
    return { b: hit.block, fy: hit.faceLocation?.y ?? 1, face: String(hit.face) };
  } catch {
    return undefined;
  }
}

/** @param {Player} player @param {string} id @param {Tipo} tipo */
export function definirTipo(player, id, tipo) {
  if (mesaEmUso(id)) {
    erro(player, textos.MESA_EM_USO);
    return;
  }
  garantir(id).tipo = tipo;
  gravar();
  manter();
  ok(player, textos.TIPO_TROCADO);
}

/** @param {Player} player @param {string} id */
export function marcarMesa(player, id) {
  const o = olhado(player);
  if (!o) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  if (mesaEmUso(id)) {
    erro(player, textos.MESA_EM_USO);
    return;
  }
  const def = garantir(id);
  const { b } = o;
  def.mesa = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5, d: b.dimension.id, bx: b.x, by: b.y, bz: b.z };
  recalcularYaw(def);
  gravar();
  manter();
  ok(player, textos.MESA_MARCADA);
}

/** @param {Player} player @param {string} id @param {number} idx */
export function marcarAssento(player, id, idx) {
  const o = olhado(player);
  if (!o) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  if (mesaEmUso(id)) {
    erro(player, textos.MESA_EM_USO);
    return;
  }
  const def = garantir(id);
  const { b, fy } = o;
  const topo = o.face === "Up" ? fy : 1;
  def.a[idx] = { x: b.x + 0.5, y: b.y + topo, z: b.z + 0.5, d: b.dimension.id, bx: b.x, by: b.y, bz: b.z, yaw: 0 };
  recalcularYaw(def);
  gravar();
  manter();
  ok(player, textos.ASSENTO_MARCADO(idx + 1));
}

/** @param {Player} player @param {string} id */
export function removerMesa(player, id) {
  if (mesaEmUso(id)) {
    erro(player, textos.MESA_EM_USO);
    return;
  }
  delete lerDados().mesas[id];
  sessoes.delete(id);
  manterTexto(tagTexto(id), undefined, "");
  gravar();
  manter();
  ok(player, textos.MESA_REMOVIDA);
}

export const TIPOS_DE_MESA = /** @type {Tipo[]} */ (["xadrez", "velha"]);
