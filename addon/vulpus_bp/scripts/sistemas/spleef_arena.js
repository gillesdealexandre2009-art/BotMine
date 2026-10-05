// @ts-check
// Arena do Spleef: um cilindro (centro + raio) com camadas de neve dentro de uma torre. Marca, mede o raio,
// detecta as camadas, salva cada camada como estrutura do mundo e repõe só neve/ar DENTRO do círculo (a torre
// nunca é mexida, mesmo que a estrutura quadrada pegue um pedaço da parede). Só os módulos do Spleef importam.
import {
  BlockTypes,
  StructureSaveMode,
  system,
  TickingAreaError,
  TickingAreaErrorReason,
  world,
} from "@minecraft/server";
import { lerMundo, salvarMundo } from "../core/db.js";
import { registrarErro } from "../core/util.js";

/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").Block} Block */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {{ x: number, y: number, z: number, d: string, rx?: number, ry?: number }} Local */

/**
 * @typedef {object} Arena
 * @property {number} v  versão do formato (1)
 * @property {string} d  dimensão
 * @property {boolean} temCentro
 * @property {number} cx  x do bloco do centro
 * @property {number} cz  z do bloco do centro
 * @property {number} cy  y de onde a staff marcou (começo da busca das camadas)
 * @property {number} raio  em blocos (13 de largura = 6)
 * @property {string[]} tipos  blocos que formam as camadas (padrão neve)
 * @property {number[]} camadas  y de cada camada, de cima para baixo
 * @property {number[]} blocos  blocos de cada camada na última detecção
 * @property {string} salvo  assinatura da arena quando o estado foi salvo ("" = nunca)
 * @property {number} total  blocos salvos (soma das camadas)
 * @property {Local | null} lobby  ponto de espera (o convite aparece em volta)
 * @property {Local | null} saida  para onde volta quem sai da partida
 * @property {Local | null} topo  centro do círculo de largada (null = centro, acima da camada mais alta)
 * @property {Local | null} placar  ranking flutuante
 */

export const CHAVE_ARENA = "vulpus:spleef:arena";
const AREA = "vulpus_spleef";
const PREFIXO_ESTRUTURA = "vulpus:spleef_c";
export const RAIO_MIN = 3;
export const RAIO_MAX = 32;
const AR = "minecraft:air";
export const TIPOS_PADRAO = Object.freeze(["minecraft:snow"]);
/** Até quantos blocos para cima e para baixo do centro a detecção procura camadas. */
const FAIXA_BUSCA = 64;
const MAX_CAMADAS = 8;
const MAX_TIPOS = 6;
/** Uma altura só vira camada com pelo menos esta fração do círculo coberta pelos blocos das camadas. */
const COBERTURA_MINIMA = 0.5;
/** Folga do círculo para blocos: conta quem está a até raio + 0,5 do centro. */
export const FOLGA_BLOCO = 0.5;
/** Folga para jogadores: mais longe que raio + 1,5 é "fora da torre". */
export const FOLGA_JOGADOR = 1.5;
/** Zona protegida (paredes inclusas): raio + 2,5 na horizontal; da camada mais baixa - 6 (a lava) até a mais alta + 6. */
const FOLGA_ZONA = 2.5;
const ABAIXO_ZONA = 6;
const ACIMA_ZONA = 6;
/** Reset: espera o chunk carregar por até 60 tentativas de 1 s. */
const TENTATIVAS_CHUNK = 60;
const TICKS_ENTRE_TENTATIVAS = 20;

/** @type {Arena | undefined} */
let cache;
/** @type {Map<number, [number, number][]>} raio → células [dx, dz] dentro do círculo */
const celulasPorRaio = new Map();
/** @type {Promise<number | undefined> | undefined} reset em andamento (um de cada vez) */
let resetando;
let areaPedida = "";

/** @returns {Arena} */
function arenaNova() {
  return {
    v: 1,
    d: "minecraft:overworld",
    temCentro: false,
    cx: 0,
    cz: 0,
    cy: 0,
    raio: 6,
    tipos: [...TIPOS_PADRAO],
    camadas: [],
    blocos: [],
    salvo: "",
    total: 0,
    lobby: null,
    saida: null,
    topo: null,
    placar: null,
  };
}

/** @param {any} n */
const inteiro = (n) => typeof n === "number" && Number.isInteger(n);

/**
 * @param {any} v
 * @returns {Local | null}
 */
function local(v) {
  if (!v || typeof v !== "object" || typeof v.d !== "string") return null;
  if (![v.x, v.y, v.z].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  /** @type {Local} */
  const l = { x: v.x, y: v.y, z: v.z, d: v.d };
  if (typeof v.rx === "number" && typeof v.ry === "number") {
    l.rx = v.rx;
    l.ry = v.ry;
  }
  return l;
}

/**
 * Junta o que veio do mundo com os padrões (campo estragado volta ao padrão).
 * @param {any} lido
 * @returns {Arena}
 */
function completar(lido) {
  const base = arenaNova();
  if (!lido || typeof lido !== "object") return base;
  const camadas = Array.isArray(lido.camadas) ? lido.camadas.filter(inteiro).slice(0, MAX_CAMADAS) : [];
  const blocos = Array.isArray(lido.blocos) ? lido.blocos.map((n) => (inteiro(n) && n >= 0 ? n : 0)) : [];
  const tipos = Array.isArray(lido.tipos) ? lido.tipos.filter((t) => typeof t === "string" && t.includes(":")).slice(0, MAX_TIPOS) : [];
  const temCentro = lido.temCentro === true && inteiro(lido.cx) && inteiro(lido.cz) && typeof lido.d === "string";
  return {
    ...base,
    d: typeof lido.d === "string" ? lido.d : base.d,
    temCentro,
    cx: temCentro ? lido.cx : 0,
    cz: temCentro ? lido.cz : 0,
    cy: inteiro(lido.cy) ? lido.cy : 0,
    raio: inteiro(lido.raio) ? Math.min(RAIO_MAX, Math.max(RAIO_MIN, lido.raio)) : base.raio,
    tipos: tipos.length ? tipos : base.tipos,
    camadas: [...camadas].sort((a, b) => b - a),
    blocos: camadas.map((_, i) => blocos[i] ?? 0),
    salvo: typeof lido.salvo === "string" ? lido.salvo : "",
    total: inteiro(lido.total) && lido.total >= 0 ? lido.total : 0,
    lobby: local(lido.lobby),
    saida: local(lido.saida),
    topo: local(lido.topo),
    placar: local(lido.placar),
  };
}

/**
 * A arena configurada (cópia; mude e passe para salvarArena).
 * @returns {Arena}
 */
export function lerArena() {
  if (!cache) cache = completar(lerMundo(CHAVE_ARENA));
  return { ...cache, tipos: [...cache.tipos], camadas: [...cache.camadas], blocos: [...cache.blocos] };
}

/** @param {Arena} arena */
export function salvarArena(arena) {
  salvarMundo(CHAVE_ARENA, arena);
  cache = undefined;
}

/**
 * Identidade da arena para saber se o estado salvo ainda vale (mudou centro, raio, camadas ou blocos = salvar de novo).
 * @param {Arena} a
 */
export const assinatura = (a) => [a.d, a.cx, a.cz, a.raio, a.camadas.join(","), a.tipos.join(",")].join("|");

/** @param {number} i */
export const nomeEstrutura = (i) => PREFIXO_ESTRUTURA + i;

/** @param {Arena} a */
export const yMin = (a) => (a.camadas.length ? a.camadas[a.camadas.length - 1] : 0);
/** @param {Arena} a */
export const yTopo = (a) => (a.camadas.length ? a.camadas[0] : 0);

/**
 * Distância horizontal até o meio do bloco do centro.
 * @param {Arena} a
 * @param {number} x
 * @param {number} z
 */
export const distancia = (a, x, z) => Math.hypot(x - (a.cx + 0.5), z - (a.cz + 0.5));

/**
 * Células [dx, dz] dentro do círculo (bloco a até raio + 0,5 do centro). 13 de largura e 9 na diagonal com raio 6.
 * @param {number} raio
 * @returns {[number, number][]}
 */
export function celulas(raio) {
  let lista = celulasPorRaio.get(raio);
  if (!lista) {
    lista = [];
    const limite = (raio + FOLGA_BLOCO) ** 2;
    for (let dx = -raio; dx <= raio; dx++) {
      for (let dz = -raio; dz <= raio; dz++) if (dx * dx + dz * dz <= limite) lista.push([dx, dz]);
    }
    celulasPorRaio.set(raio, lista);
  }
  return lista;
}

/**
 * O bloco faz parte de uma camada da arena (altura de camada, dentro do círculo e do tipo certo)?
 * @param {Arena} a
 * @param {Block | undefined} bloco
 */
export function ehBlocoCamada(a, bloco) {
  if (!bloco || !a.temCentro || !a.camadas.length) return false;
  const { x, y, z } = bloco.location;
  if (bloco.dimension.id !== a.d || !a.camadas.includes(y)) return false;
  if ((x - a.cx) ** 2 + (z - a.cz) ** 2 > (a.raio + FOLGA_BLOCO) ** 2) return false;
  return a.tipos.includes(bloco.typeId);
}

/**
 * Dentro da zona protegida (o cilindro com folga para as paredes, da camada mais baixa à mais alta)?
 * @param {Arena} a
 * @param {string} dim
 * @param {Vector3} pos  posição de bloco (canto)
 */
export function naZona(a, dim, pos) {
  if (!a.temCentro || !a.camadas.length || dim !== a.d) return false;
  if (pos.y < yMin(a) - ABAIXO_ZONA || pos.y > yTopo(a) + ACIMA_ZONA) return false;
  return distancia(a, pos.x + 0.5, pos.z + 0.5) <= a.raio + FOLGA_ZONA;
}

/**
 * O bloco está dentro do círculo (até raio + 0,5 do centro)?
 * @param {Arena} a
 * @param {Vector3} pos  posição de bloco
 */
export const noCirculo = (a, pos) => (pos.x - a.cx) ** 2 + (pos.z - a.cz) ** 2 <= (a.raio + FOLGA_BLOCO) ** 2;

/**
 * Um jogador (posição dos pés) está dentro do cilindro da arena?
 * @param {Arena} a
 * @param {string} dim
 * @param {Vector3} pos
 */
export function noCilindro(a, dim, pos) {
  if (!a.temCentro || !a.camadas.length || dim !== a.d) return false;
  if (pos.y < yMin(a) - 1 || pos.y > yTopo(a) + ACIMA_ZONA) return false;
  return distancia(a, pos.x, pos.z) <= a.raio + FOLGA_JOGADOR;
}

/**
 * Bloco sem lançar (chunk descarregado ou fora do mundo = undefined).
 * @param {Dimension} dim
 * @param {Vector3} pos
 * @returns {Block | undefined}
 */
function bloco(dim, pos) {
  try {
    return dim.getBlock(pos);
  } catch {
    return undefined;
  }
}

/**
 * Mede até onde vai a neve a partir do centro, na altura y, nas 4 direções; recentra se a pessoa marcou fora do meio.
 * @param {Dimension} dim
 * @param {number} cx
 * @param {number} y
 * @param {number} cz
 * @param {string[]} tipos
 * @returns {{ raio: number, cx: number, cz: number, recentrou: boolean } | undefined}
 */
export function medirRaio(dim, cx, y, cz, tipos) {
  /** @param {number} dx @param {number} dz */
  const alcance = (dx, dz) => {
    let n = 0;
    while (n < RAIO_MAX + 2) {
      const b = bloco(dim, { x: cx + dx * (n + 1), y, z: cz + dz * (n + 1) });
      if (!b || !tipos.includes(b.typeId)) break;
      n++;
    }
    return n;
  };
  const centro = bloco(dim, { x: cx, y, z: cz });
  if (!centro || !tipos.includes(centro.typeId)) return undefined;
  const leste = alcance(1, 0);
  const oeste = alcance(-1, 0);
  const sul = alcance(0, 1);
  const norte = alcance(0, -1);
  // Meio da neve: se a pessoa ficou fora do centro, o lado mais comprido puxa o centro para lá.
  const ajusteX = Math.trunc((leste - oeste) / 2);
  const ajusteZ = Math.trunc((sul - norte) / 2);
  const raio = Math.max(Math.ceil((leste + oeste) / 2), Math.ceil((sul + norte) / 2));
  return {
    raio: Math.min(RAIO_MAX, Math.max(1, raio)),
    cx: cx + ajusteX,
    cz: cz + ajusteZ,
    recentrou: ajusteX !== 0 || ajusteZ !== 0,
  };
}

/**
 * Quantos blocos de camada há na altura y, dentro do círculo.
 * @param {Arena} a
 * @param {Dimension} dim
 * @param {number} y
 */
function contarCamada(a, dim, y) {
  let n = 0;
  for (const [dx, dz] of celulas(a.raio)) {
    const b = bloco(dim, { x: a.cx + dx, y, z: a.cz + dz });
    if (b && a.tipos.includes(b.typeId)) n++;
  }
  return n;
}

/**
 * Procura as camadas: amostra o centro e 4 pontos a meio raio em cada altura (±64 do ponto marcado) e conta o
 * círculo inteiro só onde a amostra achou o bloco. Vale como camada quem cobre pelo menos metade do círculo.
 * @param {Arena} a
 * @returns {{ camadas: number[], blocos: number[] } | undefined}  undefined = chunk não carregado
 */
export function detectarCamadas(a) {
  const dim = world.getDimension(a.d);
  if (!carregada(a, a.cy)) return undefined;
  const meio = Math.max(1, Math.floor(a.raio / 2));
  const amostras = [
    [0, 0],
    [meio, 0],
    [-meio, 0],
    [0, meio],
    [0, -meio],
  ];
  const minimo = Math.max(dim.heightRange.min, a.cy - FAIXA_BUSCA);
  const maximo = Math.min(dim.heightRange.max - 1, a.cy + FAIXA_BUSCA);
  const cobertura = Math.ceil(celulas(a.raio).length * COBERTURA_MINIMA);
  /** @type {{ y: number, n: number }[]} */
  const achadas = [];
  for (let y = maximo; y >= minimo && achadas.length < MAX_CAMADAS; y--) {
    const temAlgo = amostras.some(([dx, dz]) => {
      const b = bloco(dim, { x: a.cx + dx, y, z: a.cz + dz });
      return !!b && a.tipos.includes(b.typeId);
    });
    if (!temAlgo) continue;
    const n = contarCamada(a, dim, y);
    if (n >= cobertura) achadas.push({ y, n });
  }
  return { camadas: achadas.map((c) => c.y), blocos: achadas.map((c) => c.n) };
}

/**
 * O chunk da arena (centro e os 4 cantos do quadrado) está carregado na altura y?
 * @param {Arena} a
 * @param {number} [y]
 */
export function carregada(a, y = yTopo(a)) {
  if (!a.temCentro) return false;
  try {
    const dim = world.getDimension(a.d);
    const r = a.raio;
    return [
      [0, 0],
      [r, r],
      [-r, r],
      [r, -r],
      [-r, -r],
    ].every(([dx, dz]) => dim.isChunkLoaded({ x: a.cx + dx, y, z: a.cz + dz }));
  } catch {
    return false;
  }
}

/**
 * Motivo para a arena não poder receber partida ("" = pronta). Não confere chunk (isso é na hora de começar).
 * @param {Arena} a
 * @param {{ centro: string, camadas: string, salvo: string, antigo: string, estrutura: string, saida: string }} motivos
 */
export function motivoNaoPronta(a, motivos) {
  if (!a.temCentro) return motivos.centro;
  if (!a.camadas.length) return motivos.camadas;
  if (!a.salvo) return motivos.salvo;
  if (a.salvo !== assinatura(a)) return motivos.antigo;
  try {
    if (a.camadas.some((_, i) => !world.structureManager.get(nomeEstrutura(i)))) return motivos.estrutura;
  } catch (e) {
    registrarErro("Spleef: conferir o estado salvo", e);
    return motivos.estrutura;
  }
  const s = a.saida;
  if (!s || naZona(a, s.d, { x: Math.floor(s.x), y: Math.floor(s.y), z: Math.floor(s.z) })) return motivos.saida;
  return "";
}

/**
 * Grava cada camada como estrutura do mundo (o quadrado que cobre o círculo, 1 bloco de altura).
 * @param {Arena} a
 * @returns {"ok" | "carregando" | "falhou"}
 */
export function salvarEstado(a) {
  if (!a.temCentro || !a.camadas.length) return "falhou";
  if (!a.camadas.every((y) => carregada(a, y))) return "carregando";
  const dim = world.getDimension(a.d);
  const r = a.raio;
  try {
    // Estruturas de camadas que não existem mais (antes eram 5, agora 4) também saem.
    for (let i = 0; i < MAX_CAMADAS; i++) {
      if (world.structureManager.get(nomeEstrutura(i))) world.structureManager.delete(nomeEstrutura(i));
    }
    a.camadas.forEach((y, i) => {
      world.structureManager.createFromWorld(
        nomeEstrutura(i),
        dim,
        { x: a.cx - r, y, z: a.cz - r },
        { x: a.cx + r, y, z: a.cz + r },
        { includeBlocks: true, includeEntities: false, saveMode: StructureSaveMode.World },
      );
      if (!world.structureManager.get(nomeEstrutura(i))) throw new Error(`a estrutura ${nomeEstrutura(i)} não apareceu`);
    });
  } catch (e) {
    registrarErro("Spleef: salvar o estado da arena", e);
    return "falhou";
  }
  a.blocos = a.camadas.map((y) => contarCamada(a, dim, y));
  a.total = a.blocos.reduce((s, n) => s + n, 0);
  a.salvo = assinatura(a);
  salvarArena(a);
  return "ok";
}

/**
 * Repõe as camadas a partir das estruturas: para cada bloco dentro do círculo, se o salvo era neve (ou outro tipo
 * de camada) ou ar e o do mundo está diferente, volta ao salvo. Parede, vidro e o resto nunca são tocados.
 * Uma camada por tick; espera o chunk carregar (ticking area). Um reset de cada vez.
 * @returns {Promise<number | undefined>} blocos repostos; undefined se não deu
 */
export function resetar() {
  if (!resetando) {
    resetando = fazerReset().finally(() => {
      resetando = undefined;
    });
  }
  return resetando;
}

/** Há um reset em andamento? */
export const resetEmAndamento = () => resetando !== undefined;

/** @returns {Promise<number | undefined>} */
async function fazerReset() {
  const a = lerArena();
  if (!a.temCentro || !a.camadas.length || !a.salvo) return undefined;
  garantirArea(a);
  for (let t = 0; !a.camadas.every((y) => carregada(a, y)); t++) {
    if (t >= TENTATIVAS_CHUNK) {
      registrarErro("Spleef: resetar a arena", new Error("o chunk da arena não carregou"));
      return undefined;
    }
    await system.waitTicks(TICKS_ENTRE_TENTATIVAS);
  }
  const dim = world.getDimension(a.d);
  const r = a.raio;
  let repostos = 0;
  for (let i = 0; i < a.camadas.length; i++) {
    const y = a.camadas[i];
    try {
      const estrutura = world.structureManager.get(nomeEstrutura(i));
      if (!estrutura) throw new Error(`a estrutura ${nomeEstrutura(i)} sumiu`);
      for (const [dx, dz] of celulas(r)) {
        const salvo = estrutura.getBlockPermutation({ x: dx + r, y: 0, z: dz + r });
        const tipo = salvo?.type.id;
        if (!salvo || !tipo || (tipo !== AR && !a.tipos.includes(tipo))) continue;
        const b = bloco(dim, { x: a.cx + dx, y, z: a.cz + dz });
        if (!b) throw new Error(`bloco ${a.cx + dx}, ${y}, ${a.cz + dz} indisponível`);
        if (b.typeId === tipo) continue;
        b.setPermutation(salvo);
        repostos++;
      }
    } catch (e) {
      registrarErro(`Spleef: repor a camada Y=${y}`, e);
      return undefined;
    }
    if (i < a.camadas.length - 1) await system.waitTicks(1);
  }
  return repostos;
}

/**
 * Ticking area em volta da arena (para salvar e repor mesmo sem ninguém perto). Uma por arena; mudar o centro ou o
 * raio troca a área. Se o jogo recusar (limite de áreas), o reset espera alguém carregar o chunk.
 * @param {Arena} a
 */
export function garantirArea(a) {
  if (!a.temCentro) return;
  const chave = `${a.d}|${a.cx}|${a.cz}|${a.raio}|${yMin(a)}|${yTopo(a)}`;
  if (areaPedida === chave) return;
  areaPedida = chave;
  const gerente = world.tickingAreaManager;
  try {
    if (gerente.hasTickingArea?.(AREA)) gerente.removeTickingArea(AREA);
  } catch (e) {
    registrarErro("Spleef: trocar a ticking area", e);
  }
  const r = a.raio + 3;
  const y0 = a.camadas.length ? yMin(a) : a.cy;
  const y1 = a.camadas.length ? yTopo(a) : a.cy;
  try {
    gerente
      .createTickingArea(AREA, {
        dimension: world.getDimension(a.d),
        from: { x: a.cx - r, y: y0, z: a.cz - r },
        to: { x: a.cx + r, y: y1, z: a.cz + r },
      })
      .catch((e) => {
        if (e instanceof TickingAreaError && e.reason === TickingAreaErrorReason.IdentifierAlreadyExists) return;
        areaPedida = "";
        registrarErro("Spleef: ticking area da arena", e);
      });
  } catch (e) {
    areaPedida = "";
    registrarErro("Spleef: ticking area da arena", e);
  }
}

/**
 * Lista de blocos digitada pela staff ("snow, minecraft:ice") → ids válidos, ou o primeiro que não existe.
 * @param {string} texto
 * @returns {{ tipos: string[] } | { invalido: string }}
 */
export function lerTipos(texto) {
  const ids = texto
    .split(/[,;\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => (t.includes(":") ? t : `minecraft:${t}`));
  const unicos = [...new Set(ids)].slice(0, MAX_TIPOS);
  if (!unicos.length) return { tipos: [...TIPOS_PADRAO] };
  for (const id of unicos) {
    if (id === AR || !BlockTypes.get(id)) return { invalido: id };
  }
  return { tipos: unicos };
}
