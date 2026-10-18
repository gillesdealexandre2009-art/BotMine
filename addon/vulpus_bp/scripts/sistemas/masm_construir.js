// @ts-check
// Construtor de andares da masmorra. Recebe a planta (masm_plano.js) e o tema do andar (paletas, formas das salas, peças por papel)
// e escava tudo: caixa de rocha, paredes de vários tijolos com rodapé e friso, pisos com padrão e borda, tetos abobadados, luz,
// peças de cada sala, passagens secretas, altar da entrada, portais e a arena do boss. Devolve o que o tempo de execução precisa:
// salas com pontos de nascimento, baús, altar, portais e a arena. É um gerador (function*): cede a vez e pede carga de área.
import { C, ehAberto, prepararGradeGen } from "./masm_grade.js";
import { escolher, hash3 } from "./obras_masmorra_pal.js";
import { criarRng } from "./obras_ruido.js";
import { AR } from "./masm_pecas.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {import("./masm_plano.js").Plano} Plano */
/** @typedef {import("./masm_plano.js").SalaPlano} Sala */
/** @typedef {import("./obras_masmorra_pal.js").Paleta} Paleta */
/** @typedef {import("./masm_pecas.js").Contexto} Contexto */

/**
 * @typedef {object} Tema
 * @property {string} id
 * @property {string} nome
 * @property {string} rocha  bloco da massa de rocha em volta
 * @property {Paleta[]} paletas  0 base, 1 boss, 2 tesouro e secreta, 3 corredor
 * @property {number} alturaCorredor
 * @property {number} abobada  quanto o teto desce junto às paredes (1 = suave, 2 = caverna)
 * @property {(s: Sala, i: number) => string} forma
 * @property {string} vela  vela colorida do tema
 * @property {(c: Contexto, s: Sala) => void} comum  estrutura comum de toda sala (pilastras, vigas, luz)
 * @property {Record<string, (c: Contexto, s: Sala) => void>} pecas  peça de cada papel
 * @property {(c: Contexto, plano: Plano) => void} [extras]  detalhes do andar inteiro (depois das salas)
 */

/**
 * @typedef {object} OpcoesAndar
 * @property {number} x0  canto noroeste da grade no mundo
 * @property {number} z0
 * @property {number} yPiso  nível do chão das salas
 * @property {number} andar  1 a 5
 * @property {boolean} decoracao
 * @property {number} semente
 */

/**
 * @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa
 * @typedef {object} SalaResultado
 * @property {number} id
 * @property {string} papel
 * @property {number} x  canto (interior) em blocos do mundo
 * @property {number} z
 * @property {number} w
 * @property {number} h
 * @property {number} y  nível do piso (pés)
 * @property {{ x: number, y: number, z: number }} centro
 * @property {number[][]} spawns  pontos de nascimento [x, y, z]
 * @typedef {object} ResultadoAndar
 * @property {number} andar
 * @property {number} yPiso
 * @property {SalaResultado[]} salas
 * @property {{ x: number, y: number, z: number, papel: string }[]} baus
 * @property {{ x: number, y: number, z: number } | null} altar  bloco do altar (interativo)
 * @property {{ x: number, y: number, z: number }} chegada  onde se nasce ao chegar de cima
 * @property {{ nome: string, zona: Caixa, chegada: { x: number, y: number, z: number } }[]} portais
 * @property {{ x: number, y: number, z: number, raio: number, sala: number } | null} arena
 * @property {Record<string, any>} extra  dados do tema
 */

export const K_MIN = -6;
export const K_MAX = 18;

/** weirdo_direction da escada que sobe no sentido (dx, dz). @param {number} dx @param {number} dz */
export const dirEscada = (dx, dz) => (dx > 0 ? 0 : dx < 0 ? 1 : dz > 0 ? 2 : 3);

/**
 * Constrói um andar.
 * @param {Pincel} p
 * @param {OpcoesAndar} o
 * @param {Tema} tema
 * @param {Plano} plano
 * @param {(f: number, t: string) => void} progresso
 * @returns {Generator<any, ResultadoAndar>}
 */
export function* construirAndar(p, o, tema, plano, progresso) {
  progresso(0, "Planejando o andar");
  const g = yield* prepararGradeGen(plano, { semente: o.semente, alturaCorredor: tema.alturaCorredor });
  const { N, tipo, sala: dono, pal, alt, altAdj, dw, largura } = g;
  const rng = criarRng(o.semente + o.andar * 977);
  const CORRENTE = p.existe("minecraft:iron_chain") ? "minecraft:iron_chain" : "minecraft:chain";
  const wx = (/** @type {number} */ gx) => o.x0 + gx;
  const wz = (/** @type {number} */ gz) => o.z0 + gz;
  const wy = (/** @type {number} */ k) => o.yPiso + k;
  const ix = (/** @type {number} */ gx, /** @type {number} */ gz) => gz * N + gx;
  const dentro = (/** @type {number} */ gx, /** @type {number} */ gz) => gx >= 0 && gz >= 0 && gx < N && gz < N;
  const cel = (/** @type {number} */ gx, /** @type {number} */ gz) => (dentro(gx, gz) ? tipo[ix(gx, gz)] : C.ROCHA);
  const aberto = (/** @type {number} */ gx, /** @type {number} */ gz) => ehAberto(cel(gx, gz));
  const salaDe = (/** @type {number} */ gx, /** @type {number} */ gz) => (dentro(gx, gz) ? dono[ix(gx, gz)] : 0);
  const dwDe = (/** @type {number} */ gx, /** @type {number} */ gz) => (dentro(gx, gz) ? dw[ix(gx, gz)] : 0);
  const altDe = (/** @type {number} */ gx, /** @type {number} */ gz) => (dentro(gx, gz) ? alt[ix(gx, gz)] : 0);
  const palIdx = (/** @type {number} */ gx, /** @type {number} */ gz) => (dentro(gx, gz) ? pal[ix(gx, gz)] : 0);
  const paleta = (/** @type {number} */ i) => tema.paletas[Math.min(i, tema.paletas.length - 1)];
  const palDe = (/** @type {number} */ gx, /** @type {number} */ gz) => paleta(palIdx(gx, gz));
  const hash = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ c) => hash3(a + o.x0, b + o.z0, c + o.andar * 31);

  /** @type {Set<number>} */
  const ocupado = new Set();
  /** @type {ResultadoAndar["baus"]} */
  const baus = [];
  /** @type {ResultadoAndar["portais"]} */
  const portais = [];
  /** @type {Record<string, any>} */
  const meta = {};

  /** @type {(gx: number, k: number, gz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const bruto = (gx, k, gz, id, est) => p.set(wx(gx), wy(k), wz(gz), id, est);
  /** @type {(gx: number, k: number, gz: number, id: string, est?: Record<string, string | number | boolean>) => void} */
  const set = (gx, k, gz, id, est) => {
    if (k >= -6 && k <= 2 && dentro(gx, gz)) ocupado.add(ix(gx, gz));
    p.set(wx(gx), wy(k), wz(gz), id, est);
  };
  /** @type {(gx1: number, k1: number, gz1: number, gx2: number, k2: number, gz2: number, id: string) => void} */
  const fill = (gx1, k1, gz1, gx2, k2, gz2, id) => {
    if (k1 <= 2 && k2 >= -6) for (let gz = Math.min(gz1, gz2); gz <= Math.max(gz1, gz2); gz++) for (let gx = Math.min(gx1, gx2); gx <= Math.max(gx1, gx2); gx++) if (dentro(gx, gz)) ocupado.add(ix(gx, gz));
    p.fill(wx(gx1), wy(k1), wz(gz1), wx(gx2), wy(k2), wz(gz2), id);
  };
  const bloco = (/** @type {number} */ gx, /** @type {number} */ k, /** @type {number} */ gz) => p.id(wx(gx), wy(k), wz(gz));

  /** Altura do teto (índice k do bloco de teto) de uma célula aberta. @param {number} gx @param {number} gz */
  const tetoK = (gx, gz) => {
    const t = cel(gx, gz), a = altDe(gx, gz), d = dwDe(gx, gz);
    if (t === C.SALA) return a - Math.max(0, tema.abobada - (d - 1));
    if (t === C.PORTA) return 4;
    const l = largura[ix(gx, gz)];
    if (l >= 5) return d === 1 ? 3 : d === 2 ? 4 : a;
    return d === 1 ? 3 : 4;
  };

  /** Piso de uma célula aberta: padrão por sala, borda e desgaste. @param {number} gx @param {number} gz */
  const pisoDe = (gx, gz) => {
    const t = cel(gx, gz);
    const pa = palDe(gx, gz);
    if (t === C.PORTA) return pa.topo === "minecraft:sea_lantern" ? "minecraft:chiseled_stone_bricks" : pa.topo;
    if (t !== C.SALA) return escolher(pa.pisoCorredor, hash(gx, gz, 1));
    const s = plano.salas.find((x) => x.id === salaDe(gx, gz));
    if (!s) return pa.piso[0][0];
    const d = dwDe(gx, gz);
    const v = s.id % 4;
    if (s.w >= 11 && s.h >= 11 && d === 1 && s.papel !== "boss" && tema.id !== "toca") return pa.borda;
    if (v === 1) return pa.piso[(gx + gz) % 2][0];
    if (v === 2) return pa.piso[Math.min(d, 6) % 2][0];
    if (v === 3) return pa.piso[Math.floor((gx + gz) / 2) % 2][0];
    return escolher(pa.piso, hash(gx, gz, 2));
  };

  // ---------------------------------------------------------------- 1) caixa: rocha, paredes, células abertas
  const tile = 32;
  const total = Math.ceil(N / tile) ** 2;
  let feito = 0;
  const yBase = wy(K_MIN), yTopo = wy(K_MAX);
  for (let gz = -3; gz <= N + 2; gz++) {
    if (gz < 0 || gz >= N) p.fill(wx(-3), yBase, wz(gz), wx(N + 2), yTopo, wz(gz), tema.rocha);
    else {
      p.fill(wx(-3), yBase, wz(gz), wx(-1), yTopo, wz(gz), tema.rocha);
      p.fill(wx(N), yBase, wz(gz), wx(N + 2), yTopo, wz(gz), tema.rocha);
    }
  }
  yield;
  for (let tz = 0; tz < N; tz += tile) {
    for (let tx = 0; tx < N; tx += tile) {
      const gx2 = Math.min(tx + tile - 1, N - 1), gz2 = Math.min(tz + tile - 1, N - 1);
      yield { area: { x1: wx(tx), z1: wz(tz), x2: wx(gx2), z2: wz(gz2) } };
      for (let gz = tz; gz <= gz2; gz++) p.fill(wx(tx), yBase, wz(gz), wx(gx2), yTopo, wz(gz), tema.rocha);
      for (let gz = tz; gz <= gz2; gz++) {
        if (gz % 3 === 0) yield;
        for (let gx = tx; gx <= gx2; gx++) {
          const t = cel(gx, gz);
          if (t === C.ROCHA) continue;
          const pa = palDe(gx, gz);
          if (t === C.PAREDE) {
            const aa = altAdj[ix(gx, gz)];
            if (aa === 0) continue;
            const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const vizAberto = viz.filter(([dx, dz]) => aberto(gx + dx, gz + dz)).length;
            const nPorta = viz.filter(([dx, dz]) => cel(gx + dx, gz + dz) === C.PORTA).length;
            if (nPorta > 0 || (vizAberto >= 2 && tema.abobada < 2)) {
              bruto(gx, 0, gz, pa.rodape);
              p.fill(wx(gx), wy(1), wz(gz), wx(gx), wy(aa - 2), wz(gz), pa.pilar);
              bruto(gx, aa - 1, gz, pa.topo);
              continue;
            }
            bruto(gx, 0, gz, pa.rodape);
            for (let k = 1; k <= aa - 2; k += 2) p.fill(wx(gx), wy(k), wz(gz), wx(gx), wy(Math.min(k + 1, aa - 2)), wz(gz), escolher(pa.parede, hash(gx, gz, k)));
            bruto(gx, aa - 1, gz, hash(gx, gz, 99) < 0.7 ? pa.friso : escolher(pa.parede, hash(gx, gz, 98)));
            continue;
          }
          // célula aberta: piso, ar e teto
          const tk = tetoK(gx, gz);
          bruto(gx, -1, gz, pisoDe(gx, gz));
          p.fill(wx(gx), wy(0), wz(gz), wx(gx), wy(tk - 1), wz(gz), AR);
          bruto(gx, tk, gz, t === C.PORTA ? pa.friso : hash(gx, gz, 77) < 0.12 ? escolher(pa.parede, hash(gx, gz, 78)) : pa.teto);
        }
      }
      feito++;
      progresso((feito / total) * 0.4, "Escavando o andar");
      yield;
    }
  }

  // ---------------------------------------------------------------- 2) nichos de luz, teias, velas e lanternas dos corredores
  yield;
  let ops = 0;
  for (let gz = 0; gz < N; gz++) {
    if (gz % 3 === 0) yield;
    for (let gx = 0; gx < N; gx++) {
      const t = cel(gx, gz);
      const pa = palDe(gx, gz);
      if (t === C.PAREDE) {
        const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => aberto(gx + dx, gz + dz));
        if (viz.length === 1 && (gx * 7 + gz * 13) % 6 === 0 && altAdj[ix(gx, gz)] >= 4 && cel(gx + viz[0][0], gz + viz[0][1]) !== C.PORTA) {
          bruto(gx, 2, gz, pa.luz, { hanging: false });
          ops++;
        }
        continue;
      }
      if (t !== C.CORR) continue;
      const d = dwDe(gx, gz);
      if (d === 1 && hash(gx, gz, 5) < 0.06) {
        bruto(gx, 0, gz, tema.vela, { candles: 1 + Math.floor(hash(gx, gz, 6) * 3), lit: true });
        ocupado.add(ix(gx, gz));
        ops++;
      } else if (d === 1 && hash(gx, gz, 7) < 0.04) {
        bruto(gx, 0, gz, pa.sujo);
        ocupado.add(ix(gx, gz));
        ops++;
      } else if (d === 1 && hash(gx, gz, 8) < 0.03) {
        bruto(gx, tetoK(gx, gz) - 1, gz, "minecraft:web");
        ops++;
      }
      if (ops > 600) {
        ops = 0;
        yield;
      }
    }
  }
  for (const c of plano.corredores) {
    if (c.tipo !== "c") continue;
    for (let u = c.a + 2; u <= c.b - 1; u += 6) {
      const gx = c.eixo === "h" ? u : c.c, gz = c.eixo === "h" ? c.c : u;
      if (cel(gx, gz) === C.CORR) {
        const tk = tetoK(gx, gz);
        bruto(gx, tk - 1, gz, CORRENTE);
        bruto(gx, tk - 2, gz, palDe(gx, gz).luz, { hanging: true });
      }
    }
  }
  progresso(0.5, "Detalhes dos corredores");

  // ---------------------------------------------------------------- 3) salas: estrutura e peças do tema
  /** @type {Contexto} */
  const ctx = {
    p, rng, wx, wz, wy, set, bruto, fill, bloco, cel, aberto, salaDe, dwDe, altDe, tetoK,
    pal: paleta, palDe, hash, CORRENTE, dirEscada, N, yPiso: o.yPiso,
    bau: (gx, k, gz, dir, papel) => {
      set(gx, k, gz, "minecraft:chest", { "minecraft:cardinal_direction": dir });
      baus.push({ x: wx(gx), y: wy(k), z: wz(gz), papel });
    },
    portal: (z, nome) => {
      portais.push({
        nome,
        zona: { x1: wx(z.gx), y1: wy(0), z1: wz(z.gz), x2: wx(z.gx + z.w - 1), y2: wy(3), z2: wz(z.gz + z.d - 1) },
        chegada: { x: 0, y: 0, z: 0 },
      });
    },
    meta,
  };
  let n = 0;
  for (const s of plano.salas) {
    yield { area: { x1: wx(s.x) - 4, z1: wz(s.z) - 4, x2: wx(s.x + s.w) + 4, z2: wz(s.z + s.h) + 4 } };
    if (o.decoracao) {
      tema.comum(ctx, s);
      tema.pecas[s.papel]?.(ctx, s);
    }
    n++;
    progresso(0.5 + (n / plano.salas.length) * 0.32, "Decorando as salas");
    yield;
  }
  if (tema.extras) tema.extras(ctx, plano);

  // ---------------------------------------------------------------- 4) passagens secretas
  yield;
  for (const c of plano.corredores) {
    if (c.tipo !== "s") continue;
    const meio = Math.floor((c.a + c.b) / 2);
    const lado = Math.floor(c.larg / 2);
    const pa = paleta(3);
    for (let k = c.c - lado; k <= c.c + lado; k++) {
      const gx = c.eixo === "h" ? meio : k, gz = c.eixo === "h" ? k : meio;
      if (cel(gx, gz) !== C.SECRETO) continue;
      p.fill(wx(gx), wy(0), wz(gz), wx(gx), wy(tetoK(gx, gz) - 1), wz(gz), pa.pilar);
    }
    const cgx = c.eixo === "h" ? meio : c.c, cgz = c.eixo === "h" ? c.c : meio;
    if (cel(cgx, cgz) === C.SECRETO) {
      bruto(cgx, 1, cgz, "minecraft:cracked_stone_bricks");
      bruto(cgx, 2, cgz, "minecraft:chiseled_stone_bricks");
    }
  }
  progresso(0.86, "Passagens secretas");

  /** Bloco que não impede ficar em pé (ar, tapete, mato, vela...). @param {string | undefined} id */
  const vazado = (id) => !id || id === AR || /carpet|grass|fern|mushroom|candle|flower|roots|torch|web|button|pressure_plate|vine/.test(id);
  /** A célula serve de ponto de nascimento: chão firme embaixo e dois blocos livres em cima. @param {number} gx @param {number} gz */
  const podePisar = (gx, gz) => {
    const chao = bloco(gx, -1, gz);
    return !!chao && chao !== AR && chao !== "minecraft:lava" && chao !== "minecraft:water" && vazado(bloco(gx, 0, gz)) && vazado(bloco(gx, 1, gz)) && vazado(bloco(gx, 2, gz));
  };

  // ---------------------------------------------------------------- 5) resultado: salas, pontos de nascimento, chegada
  /** @type {SalaResultado[]} */
  const salasR = [];
  for (const s of plano.salas) {
    /** @type {number[][]} */
    const spawns = [];
    if (s.papel !== "entrada" && s.papel !== "descanso" && s.papel !== "tesouro" && s.papel !== "secreta") {
      /** @type {[number, number][]} */
      const cand = [];
      for (let gz = s.z; gz < s.z + s.h; gz++) for (let gx = s.x; gx < s.x + s.w; gx++) if (salaDe(gx, gz) === s.id && dwDe(gx, gz) >= 2 && !ocupado.has(ix(gx, gz)) && podePisar(gx, gz)) cand.push([gx, gz]);
      // embaralha de forma determinística e mantém os pontos afastados
      for (let i = cand.length - 1; i > 0; i--) {
        const j = Math.floor(hash(i, s.id, 4242) * (i + 1));
        [cand[i], cand[j]] = [cand[j], cand[i]];
      }
      const maximo = s.papel === "boss" ? 18 : 12;
      for (const [gx, gz] of cand) {
        if (spawns.length >= maximo) break;
        if (spawns.every(([x, , z]) => Math.hypot(x - wx(gx), z - wz(gz)) >= 3)) spawns.push([wx(gx) + 0.5, wy(0), wz(gz) + 0.5]);
      }
    }
    const cx = s.x + (s.w >> 1), cz = s.z + (s.h >> 1);
    salasR.push({ id: s.id, papel: s.papel, x: wx(s.x), z: wz(s.z), w: s.w, h: s.h, y: wy(0), centro: { x: wx(cx) + 0.5, y: wy(0), z: wz(cz) + 0.5 }, spawns });
  }
  const entrada = plano.salas.find((s) => s.id === plano.entradaId);
  const chegada = meta.chegada ?? (entrada ? { x: wx(entrada.x + (entrada.w >> 1)) + 0.5, y: wy(0), z: wz(entrada.z + (entrada.h >> 1)) + 0.5 } : { x: wx(10) + 0.5, y: wy(0), z: wz(10) + 0.5 });
  // as chegadas dos portais (para onde se vai ao atravessar) ficam 3 células à frente do arco, na direção da sala
  for (const pt of portais) {
    const ch = meta.chegadas?.[pt.nome];
    if (ch) pt.chegada = ch;
  }
  progresso(1, "Andar pronto");
  return {
    andar: o.andar,
    yPiso: o.yPiso,
    salas: salasR,
    baus,
    altar: meta.altar ?? null,
    chegada,
    portais,
    arena: meta.arena ?? null,
    extra: meta.extra ?? {},
  };
}
