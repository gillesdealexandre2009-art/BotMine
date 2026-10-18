// @ts-check
// Jogo do Copo: a barraca da feira. Três copos iguais ficam em cima do balcão. A pessoa aposta, a bolinha aparece embaixo
// de um copo, os copos se embaralham (trocam de lugar passando um na frente do outro) e ela escolhe, pelo menu ou
// clicando num copo, qual tem a bolinha. Acertar paga um pouco menos que 2x; quanto mais trocas e mais rápidas, mais
// difícil. Tem espera entre rodadas e limites de lucro e de perda por dia. Painel da staff: feira_staff.js.
import { Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { diaBrasilia, erro, formatarCoords, limitar, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { INDICE_BOLINHA, INDICE_COPO } from "../textos/props_modelos.js";
import * as textos from "../textos/copos.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { achadas, esquecerBuscas } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ dia: string, ganho: number, perda: number, ult: number }} Registro */
/** @typedef {{ x: number, y: number, z: number, d: string, bx: number, by: number, bz: number, yaw: number }} Balcao */
/** @typedef {{ balcao?: Balcao, jogadores: Record<string, Registro>, ultimo?: string, pendentes: Record<string, number> }} Dados */
/**
 * @typedef {object} Jogo
 * @property {string} id
 * @property {string} nome
 * @property {number} valor
 * @property {"embaralhando" | "escolher"} fase
 * @property {number[]} pos  slot em que está cada copo (índice = copo)
 * @property {number} bola  copo que cobre a bolinha
 * @property {number} fim  tick limite para escolher
 * @property {boolean} aposta  false = rodada de teste da staff
 */

const CHAVE = "vulpus:copos";
const ENTIDADE = "vulpus:prop";
const TAG_COPO = "vulpus_copo_";
const TAG_BOLA = "vulpus_copo_bola";
const TAG_TITULO = "vulpus_copo_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;
const ALTURA_TITULO = 2.1;
/** Ticks para escolher depois do embaralhado. */
const TEMPO_ESCOLHER = 400;
/** Ticks de folga depois da última troca, para os copos pararem na tela antes de abrir o menu. */
const TEMPO_ASSENTAR = 14;
const GRANDE_PREMIO = 100;

/** @type {Dados | undefined} */
let dados;
/** @type {Jogo | undefined} */
let jogo;
let recuperou = false;

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {Record<string, Registro>} */
  const jogadores = {};
  if (s.jogadores && typeof s.jogadores === "object") {
    for (const [id, r] of Object.entries(s.jogadores)) {
      const x = /** @type {any} */ (r);
      if (x && typeof x === "object") jogadores[id] = { dia: String(x.dia ?? ""), ganho: Number(x.ganho) || 0, perda: Number(x.perda) || 0, ult: Number(x.ult) || 0 };
    }
  }
  /** @type {Record<string, number>} */
  const pendentes = {};
  if (s.pendentes && typeof s.pendentes === "object") {
    for (const [id, v] of Object.entries(s.pendentes)) if (Number.isFinite(v) && /** @type {number} */ (v) > 0) pendentes[id] = Math.floor(/** @type {number} */ (v));
  }
  const b = s.balcao;
  dados = {
    balcao:
      b && typeof b.d === "string" && [b.x, b.y, b.z, b.bx, b.by, b.bz, b.yaw].every((n) => Number.isFinite(n))
        ? { x: b.x, y: b.y, z: b.z, d: b.d, bx: b.bx, by: b.by, bz: b.bz, yaw: b.yaw }
        : undefined,
    jogadores,
    ultimo: typeof s.ultimo === "string" ? s.ultimo.slice(0, 80) : undefined,
    pendentes,
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** @param {string} id */
function registroDe(id) {
  const d = lerDados();
  const dia = diaBrasilia(Date.now());
  const r = d.jogadores[id] ?? { dia, ganho: 0, perda: 0, ult: 0 };
  if (r.dia !== dia) {
    r.dia = dia;
    r.ganho = 0;
    r.perda = 0;
  }
  d.jogadores[id] = r;
  return r;
}

/**
 * Posição de um slot (0 = esquerda de quem joga, 1 = meio, 2 = direita). A frente do balcão olha para quem marcou.
 * @param {Balcao} b
 * @param {number} slot
 */
function pontoDoSlot(b, slot) {
  const a = (b.yaw * Math.PI) / 180;
  const dir = { x: Math.cos(a), z: Math.sin(a) }; // direita de quem joga (olhando para o balcão)
  const esp = config().copoEspacoCm / 100;
  return { x: b.bx + 0.5 + dir.x * (slot - 1) * esp, y: b.by + 1, z: b.bz + 0.5 + dir.z * (slot - 1) * esp };
}

/** Vetor para a frente do balcão (de onde a pessoa joga). @param {Balcao} b */
const frente = (b) => {
  const a = (b.yaw * Math.PI) / 180;
  return { x: -Math.sin(a), z: Math.cos(a) };
};

// ----------------------------------------------------------------------------- copos, bolinha e título
/** @param {string} prefixo @returns {Entity[]} */
function acharPorTag(prefixo) {
  return achadas(`copos:${prefixo}`, () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) {
      for (const e of world.getDimension(d).getEntities({ type: ENTIDADE })) if (e.getTags().some((t) => t.startsWith(prefixo))) achados.push(e);
    }
    return achados;
  });
}

/** @param {number} i */
const copo = (i) => acharPorTag(`${TAG_COPO}${i}`).find((e) => e.isValid && e.hasTag(`${TAG_COPO}${i}`));

function textoTitulo() {
  const cfg = config();
  return textos.TITULO_FLUTUANTE(cfg.copoApostaMin, cfg.copoApostaMax, cfg.copoPagamentoPct, lerDados().ultimo);
}

/** Devolve as apostas de uma rodada que nunca terminou (queda do servidor). */
function recuperarPendentes() {
  const d = lerDados();
  let mudou = false;
  for (const [id, valor] of Object.entries(d.pendentes)) {
    if (jogo?.id === id) continue;
    adicionarCaudas(id, valor);
    delete d.pendentes[id];
    mudou = true;
    const p = world.getAllPlayers().find((x) => x.id === id);
    if (p?.isValid) msg(p, textos.REEMBOLSO);
  }
  if (mudou) gravar();
}

/** Garante os três copos nos slots (parados) e o título. */
function manter() {
  try {
    if (!recuperou) {
      recuperou = true;
      recuperarPendentes();
    }
    const d = lerDados();
    const b = d.balcao;
    const ligada = config().copoLigado && !!b;
    manterTexto(TAG_TITULO, ligada && b ? { x: b.bx + 0.5, y: b.by + 1 + ALTURA_TITULO, z: b.bz + 0.5, d: b.d } : undefined, textoTitulo());
    if (!ligada || !b) {
      for (const e of [...acharPorTag(TAG_COPO), ...acharPorTag(TAG_BOLA)]) e.remove();
      return;
    }
    if (jogo) return;
    const dim = world.getDimension(b.d);
    for (let i = 0; i < 3; i++) {
      const p = pontoDoSlot(b, i);
      if (!dim.isChunkLoaded(p)) continue;
      const tag = `${TAG_COPO}${i}`;
      const todos = acharPorTag(tag);
      let ent = todos.find((e) => e.dimension.id === dim.id);
      for (const e of todos) if (e !== ent) e.remove();
      if (!ent) {
        ent = dim.spawnEntity(ENTIDADE, p);
        ent.addTag(tag);
        esquecerBuscas("copos:");
      } else if (Math.hypot(ent.location.x - p.x, ent.location.y - p.y, ent.location.z - p.z) > 0.03) {
        ent.teleport(p, { dimension: dim });
      }
      ent.setProperty("vulpus:modelo", INDICE_COPO);
      ent.setRotation({ x: 0, y: b.yaw });
    }
    for (const e of acharPorTag(TAG_BOLA)) e.remove();
  } catch (e) {
    registrarErro("Jogo do Copo: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

/** @param {Balcao} b @param {string} id @param {number} tom */
function ouvir(b, id, tom) {
  try {
    const c = pontoDoSlot(b, 1);
    for (const p of world.getDimension(b.d).getPlayers({ location: c, maxDistance: 20 })) som(p, id, { location: c, pitch: tom, volume: 0.7 });
  } catch (e) {
    registrarErro("Jogo do Copo: som", e);
  }
}

/** @param {(p: Player) => void} fn */
function paraPerto(fn) {
  const b = lerDados().balcao;
  if (!b) return;
  try {
    for (const p of world.getDimension(b.d).getPlayers({ location: { x: b.bx, y: b.by, z: b.bz }, maxDistance: 20 })) fn(p);
  } catch (e) {
    registrarErro("Jogo do Copo: perto", e);
  }
}

// ------------------------------------------------------------------------------------- animações
/**
 * Levanta (ou baixa) um copo suavemente.
 * @param {Entity} ent
 * @param {{ x: number, y: number, z: number }} base
 * @param {number} de
 * @param {number} ate
 * @param {number} ticks
 * @param {() => void} fim
 */
function subir(ent, base, de, ate, ticks, fim) {
  let i = 0;
  const run = system.runInterval(() => {
    try {
      i++;
      if (!ent.isValid) {
        system.clearRun(run);
        fim();
        return;
      }
      const t = Math.min(1, i / ticks);
      const s = t * t * (3 - 2 * t);
      ent.teleport({ x: base.x, y: base.y + de + (ate - de) * s, z: base.z });
      if (t >= 1) {
        system.clearRun(run);
        fim();
      }
    } catch (e) {
      system.clearRun(run);
      registrarErro("Jogo do Copo: subir", e);
      fim();
    }
  }, 1);
}

/** Bolinha no chão, no slot do copo (some quando os copos andam). @param {Balcao} b @param {number} slot */
function pousarBola(b, slot) {
  const dim = world.getDimension(b.d);
  for (const e of acharPorTag(TAG_BOLA)) e.remove();
  const bola = dim.spawnEntity(ENTIDADE, pontoDoSlot(b, slot));
  bola.addTag(TAG_BOLA);
  esquecerBuscas("copos:");
  bola.setProperty("vulpus:modelo", INDICE_BOLINHA);
  efeitos.nuvem(dim, pontoDoSlot(b, slot), { n: 3, largura: 0.2, y0: 0.2, alto: 0.4 }, "minecraft:endrod");
}

/**
 * Troca dois copos de lugar: um passa na frente do outro, com um pulinho.
 * @param {Balcao} b
 * @param {number} ca  copo
 * @param {number} cb  copo
 * @param {number} sa  slot de ca
 * @param {number} sb  slot de cb
 * @param {number} ticks
 * @param {() => void} fim
 */
function trocar(b, ca, cb, sa, sb, ticks, fim) {
  const ea = copo(ca);
  const eb = copo(cb);
  const pa = pontoDoSlot(b, sa);
  const pb = pontoDoSlot(b, sb);
  const f = frente(b);
  if (!ea || !eb) {
    fim();
    return;
  }
  let i = 0;
  const run = system.runInterval(() => {
    try {
      i++;
      if (!ea.isValid || !eb.isValid) {
        system.clearRun(run);
        fim();
        return;
      }
      const t = Math.min(1, i / ticks);
      const s = t * t * (3 - 2 * t);
      const arco = Math.sin(Math.PI * t);
      ea.teleport({ x: pa.x + (pb.x - pa.x) * s + f.x * 0.32 * arco, y: pa.y + 0.06 * arco, z: pa.z + (pb.z - pa.z) * s + f.z * 0.32 * arco });
      eb.teleport({ x: pb.x + (pa.x - pb.x) * s - f.x * 0.32 * arco, y: pb.y + 0.03 * arco, z: pb.z + (pa.z - pb.z) * s - f.z * 0.32 * arco });
      if (t >= 1) {
        system.clearRun(run);
        fim();
      }
    } catch (e) {
      system.clearRun(run);
      registrarErro("Jogo do Copo: troca", e);
      fim();
    }
  }, 1);
}

/** Embaralha e depois chama `aoTerminar`. @param {Jogo} j @param {() => void} aoTerminar */
function embaralhar(j, aoTerminar) {
  const b = lerDados().balcao;
  if (!b) {
    aoTerminar();
    return;
  }
  const cfg = config();
  let restantes = Math.max(3, Math.floor(cfg.copoTrocas));
  const ticks = Math.max(2, Math.floor(cfg.copoTicksTroca));
  let ultimoPar = "";
  const proxima = () => {
    if (!jogo || jogo !== j) return;
    if (restantes <= 0) {
      aoTerminar();
      return;
    }
    restantes--;
    // dois slots diferentes (sem repetir o par seguido)
    let sa = 0;
    let sb = 0;
    let chave = "";
    do {
      sa = Math.floor(Math.random() * 3);
      sb = (sa + 1 + Math.floor(Math.random() * 2)) % 3;
      chave = [sa, sb].sort().join("-");
    } while (chave === ultimoPar);
    ultimoPar = chave;
    const ca = j.pos.indexOf(sa);
    const cb = j.pos.indexOf(sb);
    ouvir(b, "random.pop", 0.9 + Math.random() * 0.4);
    trocar(b, ca, cb, sa, sb, ticks, () => {
      j.pos[ca] = sb;
      j.pos[cb] = sa;
      proxima();
    });
  };
  proxima();
}

// ------------------------------------------------------------------------------------- jogo
/**
 * Confere se a pessoa pode jogar agora. Devolve o motivo (texto de erro) ou undefined.
 * @param {Player} player
 */
function motivoDeNao(player) {
  const cfg = config();
  if (!cfg.copoLigado || !lerDados().balcao) return textos.JOGO_FECHADO;
  if (jogo) return textos.OCUPADA;
  const r = registroDe(player.id);
  const espera = Math.ceil((r.ult + cfg.copoEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return textos.RECARGA(espera);
  if (r.ganho >= cfg.copoGanhoMaxDia) return textos.GANHO_MAX;
  if (cfg.copoPerdaMaxDia - r.perda < cfg.copoApostaMin) return textos.PERDA_MAX;
  if (saldo(player) < cfg.copoApostaMin) return textos.SEM_CAUDAS(cfg.copoApostaMin);
  return undefined;
}

/** @param {Player} player */
async function abrirAposta(player) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const r = registroDe(player.id);
  const minimo = cfg.copoApostaMin;
  const maximo = Math.max(minimo, Math.min(cfg.copoApostaMax, saldo(player), cfg.copoPerdaMaxDia - r.perda));
  const resp = await perguntar(player, textos.TITULO_APOSTA, [{ tipo: "numero", rotulo: textos.ROTULO_APOSTA, padrao: minimo, min: minimo, max: maximo }]);
  if (!resp) return;
  iniciar(player, resp[0]);
}

/**
 * Cobra a aposta e começa a rodada: mostra a bolinha, baixa os copos e embaralha.
 * @param {Player} player
 * @param {number} valorPedido
 */
function iniciar(player, valorPedido) {
  const motivo = motivoDeNao(player);
  if (motivo) {
    erro(player, motivo);
    return;
  }
  const cfg = config();
  const r = registroDe(player.id);
  const maximo = Math.max(cfg.copoApostaMin, Math.min(cfg.copoApostaMax, saldo(player), cfg.copoPerdaMaxDia - r.perda));
  const valor = limitar(Math.floor(valorPedido), cfg.copoApostaMin, maximo);
  if (saldo(player) < valor) {
    erro(player, textos.SEM_CAUDAS(valor));
    return;
  }
  r.ult = Date.now();
  adicionarCaudas(player, -valor);
  lerDados().pendentes[player.id] = valor;
  gravar();
  msg(player, textos.COMECOU(valor));
  comecar({ id: player.id, nome: player.name, valor, fase: "embaralhando", pos: [0, 1, 2], bola: Math.floor(Math.random() * 3), fim: 0, aposta: true });
}

/** @param {Jogo} j */
function comecar(j) {
  const b = lerDados().balcao;
  if (!b) {
    jogo = undefined;
    return;
  }
  jogo = j;
  const base = pontoDoSlot(b, j.bola);
  const ent = copo(j.bola);
  if (!ent) {
    cancelarComReembolso();
    return;
  }
  paraPerto((p) => p.onScreenDisplay.setActionBar(textos.OLHE_A_BOLINHA));
  // levanta o copo da bolinha, mostra a bolinha, e baixa
  pousarBola(b, j.bola);
  subir(ent, base, 0, 0.7, 12, () => {
    system.runTimeout(() => {
      if (jogo !== j) return;
      subir(ent, base, 0.7, 0, 10, () => {
        if (jogo !== j) return;
        for (const e of acharPorTag(TAG_BOLA)) e.remove();
        paraPerto((p) => p.onScreenDisplay.setActionBar(textos.EMBARALHANDO));
        embaralhar(j, () => {
          // espera os copos assentarem na tela de quem joga (o movimento chega atrasado) antes de abrir a escolha
          system.runTimeout(() => {
            if (jogo !== j) return;
            j.fase = "escolher";
            j.fim = system.currentTick + TEMPO_ESCOLHER;
            const jogador = world.getAllPlayers().find((p) => p.id === j.id);
            paraPerto((p) => p.onScreenDisplay.setActionBar(textos.ESCOLHA));
            if (jogador?.isValid && j.aposta) menuEscolha(jogador, j);
            system.runTimeout(() => {
              if (jogo === j && j.fase === "escolher") terminar(j, -1);
            }, TEMPO_ESCOLHER);
          }, TEMPO_ASSENTAR);
        });
      });
    }, 28);
  });
}

/**
 * O menu de escolha: três botões, um por posição.
 * @param {Player} player
 * @param {Jogo} j
 */
async function menuEscolha(player, j) {
  const lista = new Lista(textos.TITULO_ESCOLHA).texto(textos.CORPO_ESCOLHA);
  textos.BOTOES.forEach((nome, slot) => lista.botao(nome, undefined, () => escolher(player, slot)));
  await lista.abrir(player);
}

/** Alguém escolheu uma posição (menu ou clique no copo). @param {Player} player @param {number} slot */
function escolher(player, slot) {
  const j = jogo;
  if (!j || j.fase !== "escolher") return;
  if (player.id !== j.id) {
    erro(player, textos.ESPERANDO_OUTRA_PESSOA);
    return;
  }
  msg(player, textos.ESCOLHEU(slot));
  terminar(j, slot);
}

/** Revela os copos e paga. @param {Jogo} j @param {number} slot  -1 = tempo esgotado */
function terminar(j, slot) {
  if (jogo !== j) return;
  j.fase = "embaralhando"; // trava novos cliques
  const b = lerDados().balcao;
  const cfg = config();
  const slotBola = j.pos[j.bola];
  const acertou = slot === slotBola;
  const premio = Math.floor((j.valor * cfg.copoPagamentoPct) / 100);
  const d = lerDados();
  if (b) {
    const dim = world.getDimension(b.d);
    // revela: levanta o copo escolhido e depois o da bolinha
    const levantar = (/** @type {number} */ sl, /** @type {() => void} */ depois) => {
      const c = j.pos.indexOf(sl);
      const ent = c >= 0 ? copo(c) : undefined;
      if (!ent) {
        depois();
        return;
      }
      subir(ent, pontoDoSlot(b, sl), 0, 0.7, 10, depois);
    };
    pousarBola(b, slotBola);
    const fimRevela = () => {
      efeitos.anel(dim, pontoDoSlot(b, slotBola), { raio: 0.5, n: 10, y: 0.2 }, acertou ? "minecraft:endrod" : "minecraft:basic_flame_particle");
      ouvir(b, acertou ? "random.levelup" : "note.bass", acertou ? 1.2 : 0.8);
    };
    if (slot >= 0 && slot !== slotBola) levantar(slot, () => levantar(slotBola, fimRevela));
    else levantar(slotBola, fimRevela);
  }
  if (j.aposta) {
    const r = registroDe(j.id);
    delete d.pendentes[j.id];
    if (acertou) {
      adicionarCaudas(j.id, premio);
      r.ganho += premio - j.valor;
    } else r.perda += j.valor;
    d.ultimo = `${j.nome} ${acertou ? "§aacertou" : "§cerrou"}`;
    gravar();
    const jogador = world.getAllPlayers().find((p) => p.id === j.id);
    if (jogador?.isValid) {
      if (slot < 0) msg(jogador, textos.TEMPO_ESGOTOU);
      mostrarTitulo(jogador, acertou ? textos.TITULO_ACERTOU(premio) : textos.TITULO_ERROU, {
        subtitulo: acertou ? textos.SUB_ACERTOU : textos.SUB_ERROU(slotBola),
        entrada: 2,
        fica: 50,
        saida: 10,
      });
      msg(jogador, acertou ? textos.CHAT_ACERTOU(premio, j.valor) : textos.CHAT_ERROU(j.valor));
      som(jogador, acertou ? "random.levelup" : "note.bass", { pitch: acertou ? 1.2 : 0.8, volume: 0.8 });
    }
    if (acertou && premio >= GRANDE_PREMIO) world.sendMessage(textos.GRANDE_VITORIA(j.nome, premio));
  }
  system.runTimeout(() => {
    if (jogo === j) jogo = undefined;
    manter();
  }, 50);
}

/** Algo deu errado: devolve a aposta e libera o balcão. */
function cancelarComReembolso() {
  const j = jogo;
  jogo = undefined;
  if (j?.aposta) {
    adicionarCaudas(j.id, j.valor);
    delete lerDados().pendentes[j.id];
    gravar();
    const p = world.getAllPlayers().find((x) => x.id === j.id);
    if (p?.isValid) msg(p, textos.REEMBOLSO);
  }
  manter();
}

/** Só para teste: o slot em que está a bolinha agora. */
export const slotDaBolinha = () => (jogo ? jogo.pos[jogo.bola] : -1);

// ------------------------------------------------------------------------------ interações
/**
 * @param {Balcao | undefined} b
 * @param {import("@minecraft/server").Block} bloco
 */
const mesmoBloco = (b, bloco) => !!b && b.d === bloco.dimension.id && b.bx === bloco.location.x && b.by === bloco.location.y && b.bz === bloco.location.z;

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    if (!mesmoBloco(lerDados().balcao, block)) return;
    if (ehStaff(player) && player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    system.run(() => rodarSeguro(player, "Jogo do Copo", abrirAposta));
  } catch (e) {
    registrarErro("Jogo do Copo: interação", e);
  }
});

// Clicar num copo: se está na hora de escolher, escolhe aquele; senão abre a aposta.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    const alvo = ev.target;
    if (alvo.typeId !== ENTIDADE) return;
    const tag = alvo.getTags().find((t) => /^vulpus_copo_\d$/.test(t));
    if (!tag) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    const c = Number(tag.slice(TAG_COPO.length));
    system.run(() =>
      rodarSeguro(player, "Jogo do Copo", (p) => {
        if (jogo?.fase === "escolher") escolher(p, jogo.pos[c]);
        else if (!jogo) return abrirAposta(p);
        else erro(p, textos.OCUPADA);
        return undefined;
      }),
    );
  } catch (e) {
    registrarErro("Jogo do Copo: copo", e);
  }
});

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    if (!mesmoBloco(lerDados().balcao, ev.block)) return;
    if (!(ehStaff(ev.player) && ev.player.isSneaking)) ev.cancel = true;
  } catch (e) {
    registrarErro("Jogo do Copo: quebrar", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
/** Estado para o painel da staff. */
export function estadoCopos() {
  return { marcado: !!lerDados().balcao, fase: jogo ? jogo.fase : "livre" };
}

/** @param {Player} player */
export function marcarBalcao(player) {
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
  if (jogo) {
    erro(player, textos.OCUPADA);
    return;
  }
  const cx = b.x + 0.5;
  const cz = b.z + 0.5;
  // os copos ficam de frente para quem marcou (a frente do modelo olha na direção do yaw)
  const yaw = Math.round((Math.atan2(-(player.location.x - cx), player.location.z - cz) * 180) / Math.PI);
  lerDados().balcao = { x: cx, y: b.y + 1, z: cz, d: b.dimension.id, bx: b.x, by: b.y, bz: b.z, yaw };
  gravar();
  manter();
  ok(player, textos.BALCAO_MARCADO(formatarCoords(b)));
}

/** Uma rodada de teste, sem aposta nem prêmio: a staff escolhe pelo menu. @param {Player} player */
export function testarRodada(player) {
  if (!lerDados().balcao) {
    erro(player, textos.SEM_BALCAO);
    return;
  }
  if (jogo) {
    erro(player, textos.OCUPADA);
    return;
  }
  comecar({ id: player.id, nome: player.name, valor: 0, fase: "embaralhando", pos: [0, 1, 2], bola: Math.floor(Math.random() * 3), fim: 0, aposta: false });
  system.runTimeout(() => {
    if (!player.isValid) return;
    const atual = jogo;
    if (atual && !atual.aposta) {
      const esperar = system.runInterval(() => {
        if (!jogo || jogo !== atual) {
          system.clearRun(esperar);
          return;
        }
        if (atual.fase === "escolher") {
          system.clearRun(esperar);
          menuEscolha(player, atual);
        }
      }, 10);
    }
  }, 1);
}

/** @param {Player} player */
export function removerCopos(player) {
  if (jogo) cancelarComReembolso();
  const d = lerDados();
  d.balcao = undefined;
  gravar();
  manter();
  ok(player, textos.REMOVIDO);
}
