// @ts-check
// Ruas decoradas: a lógica das obras (sem menu). A rua é marcada pelas BORDAS do piso (duas linhas, ou um contorno fechado).
// Aprender: lê, para fora de cada borda, a "fatia" de blocos de uma rua decorada à mão. Decorar: copia trechos dessas fatias
// para outra rua, só para fora das bordas e sem mexer no terreno. Tudo fala com o Pincel (testável com PincelMemoria).
// Os geradores seguem o protocolo das obras: `yield { area }` pede carga de área, `yield` puro cede a vez.

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {[number, number, number]} P3 */
/** @typedef {Record<string, string | number | boolean>} Estados */
/** @typedef {{ nome: string, modo: "lados" | "contorno", lados: P3[][], semente: number }} RuaDef */
/** @typedef {{ nome: string, p: [string, Estados?][], j: number[][][], fatias: number, celulas: number, cortou: boolean }} Perfil */
/** @typedef {{ fx: number, fz: number, nx: number, nz: number, par: number, te: number, yBorda: number, ok: boolean }} Estacao */
/** @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa */
/** @typedef {{ ops: [number, number, number, string, Estados | null][], colunas: number, protegidas: number, carga: number, caixa: Caixa | null }} Plano */

export const D_MAX = 4;
export const H_MAX = 4;
export const MAX_FATIAS = 120;
export const JANELA = 40;
export const MAX_JSON = 28000;
export const EST_MAX = 1500;
/** Quantos blocos para cada lado da linha marcada procuramos a borda real. */
const SNAP = 2;
const DIF_ALTURA = 3;

/** Piso de rua: pedra, cascalho, caminho de terra e a família (com lajes e escadas). */
const BASE = "stone|cobblestone|mossy_cobblestone|andesite|diorite|granite|polished_andesite|polished_diorite|polished_granite|stone_brick|mossy_stone_brick|smooth_stone|cobbled_deepslate|polished_deepslate|deepslate_brick|tuff|tuff_brick|polished_tuff|blackstone|polished_blackstone|polished_blackstone_brick";
export const FAMILIA = new RegExp(`^minecraft:(?:(?:${BASE})(?:_slab|_stairs)?|stone_bricks|mossy_stone_bricks|cracked_stone_bricks|chiseled_stone_bricks|deepslate_bricks|tuff_bricks|gravel|dirt_path|grass_path|packed_mud|mud_bricks)$`);
/** Chão natural, para achar o nível do terreno de uma coluna. */
const TERRENO = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|mud|farmland|dirt_path|grass_path|gravel|sand|red_sand|clay|stone|deepslate|andesite|diorite|granite|cobblestone|tuff|sandstone|snow)$/;
/** Único chão em que a decoração pode ficar (e o único bloco que ela pode trocar no nível do chão). */
const SOLO = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|moss_block)$/;
/** O que a decoração pode trocar acima do chão. */
const SUBSTITUIVEL = /^minecraft:(air|cave_air|short_grass|tall_grass|fern|large_fern|dead_bush|short_dry_grass|vine|leaf_litter|dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|torchflower|wither_rose|rose_bush|lilac|peony|sunflower|pink_petals|wildflowers|bush|azalea|flowering_azalea|[a-z_]+_leaves)$/;
/** Blocos do chão comum, que não vale a pena guardar no estilo. */
const COMUM = /^minecraft:(grass_block|dirt)$/;

/** @param {number} s */
function criarRng(s) {
  let x = (s >>> 0) || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** @param {string} id */
const completo = (id) => (id.includes(":") ? id : `minecraft:${id}`);
/** @param {string} id */
const curto = (id) => id.replace(/^minecraft:/, "");

// ---------------------------------------------------------------- geometria (sem mundo)

/** Estações de 1 em 1 bloco ao longo da linha. @param {P3[]} pts @param {boolean} fechada */
export function estacoesDaLinha(pts, fechada) {
  /** @type {{ fx: number, fz: number }[]} */
  const out = [];
  /** @param {number} fx @param {number} fz */
  const push = (fx, fz) => {
    const u = out[out.length - 1];
    if (u && Math.floor(u.fx) === Math.floor(fx) && Math.floor(u.fz) === Math.floor(fz)) return;
    out.push({ fx, fz });
  };
  const n = pts.length;
  const total = fechada ? n : n - 1;
  for (let i = 0; i < total; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const passos = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2])));
    for (let k = 0; k < passos; k++) push(a[0] + 0.5 + ((b[0] - a[0]) * k) / passos, a[2] + 0.5 + ((b[2] - a[2]) * k) / passos);
  }
  if (!fechada) push(pts[n - 1][0] + 0.5, pts[n - 1][2] + 0.5);
  return out;
}

/** Ponto dentro do polígono (raio). @param {{ fx: number, fz: number }[]} poly @param {number} x @param {number} z */
export function dentroPoligono(poly, x, z) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.fz > z !== b.fz > z && x < ((b.fx - a.fx) * (z - a.fz)) / (b.fz - a.fz) + a.fx) dentro = !dentro;
  }
  return dentro;
}

/**
 * Estações das linhas da rua, com a normal apontando PARA FORA do piso (duas bordas: afastando da outra borda; contorno: para fora do polígono).
 * @param {RuaDef} rua
 * @returns {{ linhas: Estacao[][], poligono: { fx: number, fz: number }[] | null } | { erro: string }}
 */
export function prepararLinhas(rua) {
  const contorno = rua.modo === "contorno";
  const listas = contorno ? [rua.lados[0] ?? []] : [rua.lados[0] ?? [], rua.lados[1] ?? []];
  if (contorno ? listas[0].length < 3 : listas.some((l) => l.length < 2)) return { erro: contorno ? "contorno com menos de 3 pontos" : "cada lado precisa de pelo menos 2 pontos" };
  const brutas = listas.map((l) => estacoesDaLinha(l, contorno));
  if (brutas.some((b) => b.length > EST_MAX)) return { erro: "rua longa demais" };
  const poligono = contorno ? listas[0].map((p) => ({ fx: p[0] + 0.5, fz: p[2] + 0.5 })) : null;
  const linhas = brutas.map((b, li) => {
    const outra = contorno ? [] : brutas[1 - li];
    const n = b.length;
    return b.map((e, i) => {
      const i0 = contorno ? (i - 3 + n * 4) % n : Math.max(0, i - 3);
      const i1 = contorno ? (i + 3) % n : Math.min(n - 1, i + 3);
      let dx = b[i1].fx - b[i0].fx, dz = b[i1].fz - b[i0].fz;
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) {
        dx = 1;
        dz = 0;
      } else {
        dx /= len;
        dz /= len;
      }
      let nx = -dz, nz = dx, par = -1;
      if (contorno) {
        if (poligono && dentroPoligono(poligono, e.fx + nx * 2.5, e.fz + nz * 2.5)) {
          nx = -nx;
          nz = -nz;
        }
      } else {
        let melhor = Infinity;
        for (let k = 0; k < outra.length; k++) {
          const d = (outra[k].fx - e.fx) ** 2 + (outra[k].fz - e.fz) ** 2;
          if (d < melhor) {
            melhor = d;
            par = k;
          }
        }
        if (par >= 0 && nx * (e.fx - outra[par].fx) + nz * (e.fz - outra[par].fz) < 0) {
          nx = -nx;
          nz = -nz;
        }
      }
      return { fx: e.fx, fz: e.fz, nx, nz, par, te: 0, yBorda: 0, ok: false };
    });
  });
  return { linhas, poligono };
}

/** @param {Estacao} e @param {number} t */
const celulaDe = (e, t) => [Math.floor(e.fx + e.nx * t), Math.floor(e.fz + e.nz * t)];

/** Distância da posição à estação mais próxima da outra linha. @param {Estacao[]} outra @param {number} x @param {number} z */
function distAte(outra, x, z) {
  let m = Infinity;
  for (const o of outra) m = Math.min(m, (o.fx - x) ** 2 + (o.fz - z) ** 2);
  return Math.sqrt(m);
}

// ---------------------------------------------------------------- leitura do mundo

/** Pede a área de carga da região da estação (uma por bloco de 24x24). @param {{ k: string }} est @param {number} x @param {number} z */
function* pedirArea(est, x, z) {
  const kx = Math.floor(x / 24), kz = Math.floor(z / 24);
  const k = `${kx},${kz}`;
  if (est.k === k) return;
  est.k = k;
  yield { area: { x1: kx * 24 - 10, z1: kz * 24 - 10, x2: kx * 24 + 33, z2: kz * 24 + 33 } };
}

/**
 * Chão da coluna: o primeiro bloco de terreno de cima para baixo (até 6 abaixo da superfície).
 * @param {Pincel} pincel @param {number} x @param {number} z
 * @returns {{ y: number, id: string } | "carga" | "liquido" | null}
 */
function chaoDaColuna(pincel, x, z) {
  const s = pincel.superficie(x, z);
  if (!s) return "carga";
  if (/water|lava/.test(s.id)) return "liquido";
  let y = s.y;
  for (let i = 0; i <= 6; i++, y--) {
    const id = pincel.id(x, y, z);
    if (id === undefined) return "carga";
    if (TERRENO.test(id) || FAMILIA.test(id)) return { y, id };
  }
  return null;
}

/**
 * Descobre o que é piso: a família de pedras e o que aparece no meio das duas bordas (para contorno, só a família).
 * @param {Pincel} pincel @param {Estacao[][]} linhas
 * @returns {Generator<any, (id: string) => boolean>}
 */
function* descobrirPiso(pincel, linhas) {
  /** @type {Map<string, number>} */
  const cont = new Map();
  let total = 0;
  const est = { k: "" };
  if (linhas.length === 2) {
    for (let i = 0; i < linhas[0].length; i += 4) {
      const a = linhas[0][i], b = linhas[1][a.par];
      if (!b) continue;
      const x = Math.floor((a.fx + b.fx) / 2), z = Math.floor((a.fz + b.fz) / 2);
      yield* pedirArea(est, x, z);
      const s = pincel.superficie(x, z);
      if (!s) continue;
      total++;
      cont.set(s.id, (cont.get(s.id) ?? 0) + 1);
    }
  }
  const extras = new Set([...cont].filter(([id, n]) => total >= 3 && n * 2 >= total && !/water|lava|air/.test(id)).map(([id]) => id));
  return (id) => FAMILIA.test(id) || extras.has(id);
}

/**
 * Acha a borda real de cada estação: varre ±2 na perpendicular e usa a transição piso → fora do piso mais perto da linha marcada;
 * se não houver, vale a linha marcada (o bloco marcado é o último do piso).
 * @param {Pincel} pincel @param {Estacao[][]} linhas @param {(id: string) => boolean} ehPiso @param {(f: number, t: string) => void} prog
 * @returns {Generator<any, number>}  estações puladas por falta de terreno carregado
 */
function* ajustarBordas(pincel, linhas, ehPiso, prog) {
  const est = { k: "" };
  let carga = 0, feitas = 0;
  const total = linhas.reduce((s, l) => s + l.length, 0);
  for (const linha of linhas) {
    for (const e of linha) {
      yield* pedirArea(est, Math.floor(e.fx), Math.floor(e.fz));
      /** @type {(boolean | undefined)[]} */
      const piso = [];
      for (let t = -SNAP; t <= SNAP + 1; t++) {
        const [x, z] = celulaDe(e, t);
        const s = pincel.superficie(x, z);
        piso.push(s === undefined ? undefined : ehPiso(s.id));
      }
      if (piso.some((v) => v === undefined)) {
        carga++;
      } else {
        let melhor = null;
        for (let t = -SNAP; t <= SNAP; t++) {
          if (piso[t + SNAP] === true && piso[t + SNAP + 1] === false && (melhor === null || Math.abs(t) < Math.abs(melhor))) melhor = t;
        }
        e.te = melhor ?? 0;
        const [bx, bz] = celulaDe(e, e.te);
        const sb = pincel.superficie(bx, bz);
        if (sb) {
          e.yBorda = sb.y;
          e.ok = true;
        } else carga++;
      }
      if (++feitas % 30 === 0) {
        prog(feitas / total, "Achando as bordas");
        yield;
      }
    }
  }
  return carga;
}

// ---------------------------------------------------------------- aprender

/**
 * Lê a decoração de uma rua pronta e devolve o perfil (ou erro).
 * @param {Pincel} pincel @param {RuaDef} rua @param {string} nome @param {(f: number, t: string) => void} prog
 * @returns {Generator<any, { perfil: Perfil } | { erro: string }>}
 */
export function* aprender(pincel, rua, nome, prog) {
  const prep = prepararLinhas(rua);
  if ("erro" in prep) return { erro: prep.erro };
  const { linhas } = prep;
  const ehPiso = yield* descobrirPiso(pincel, linhas);
  yield* ajustarBordas(pincel, linhas, ehPiso, prog);
  /** @type {Map<string, { id: string, estados: Estados | null }>} */
  const tipos = new Map();
  /** @type {{ d: number, h: number, k: string }[][][]} */
  const brutas = [];
  const est = { k: "" };
  let feitas = 0;
  const total = linhas.reduce((s, l) => s + l.length, 0);
  for (const linha of linhas) {
    /** @type {{ d: number, h: number, k: string }[][]} */
    const seq = [];
    for (const e of linha) {
      /** @type {{ d: number, h: number, k: string }[]} */
      const fatia = [];
      if (e.ok) {
        yield* pedirArea(est, Math.floor(e.fx), Math.floor(e.fz));
        for (let d = 1; d <= D_MAX; d++) {
          const [x, z] = celulaDe(e, e.te + d);
          const s = pincel.superficie(x, z);
          if (!s || ehPiso(s.id)) continue;
          const g = chaoDaColuna(pincel, x, z);
          if (typeof g !== "object" || g === null) continue;
          for (let h = 0; h <= H_MAX; h++) {
            const id = pincel.id(x, g.y + h, z);
            if (!id || id === "minecraft:air" || id === "minecraft:cave_air") continue;
            if (h === 0 && COMUM.test(id)) continue;
            const estados = pincel.estados(x, g.y + h, z) ?? null;
            const k = id + JSON.stringify(estados ?? {});
            if (!tipos.has(k)) tipos.set(k, { id, estados: estados && Object.keys(estados).length ? estados : null });
            fatia.push({ d, h, k });
          }
        }
      }
      seq.push(fatia);
      if (++feitas % 30 === 0) {
        prog(feitas / total, "Lendo o estilo");
        yield;
      }
    }
    brutas.push(seq);
  }
  return montarPerfil(nome, brutas, tipos);
}

/**
 * Escolhe as janelas contíguas (limite de fatias e de tamanho) e monta o perfil com paleta.
 * @param {string} nome @param {{ d: number, h: number, k: string }[][][]} seqs @param {Map<string, { id: string, estados: Estados | null }>} tipos
 * @returns {{ perfil: Perfil } | { erro: string }}
 */
export function montarPerfil(nome, seqs, tipos) {
  const total = seqs.reduce((s, q) => s + q.length, 0);
  let cortou = false;
  /** @type {typeof seqs} */
  let janelas;
  if (total <= MAX_FATIAS) janelas = seqs.filter((q) => q.length);
  else {
    cortou = true;
    janelas = [];
    const usaveis = seqs.filter((q) => q.length);
    [0, 0.5, 1].forEach((pos, w) => {
      const q = usaveis[w % usaveis.length];
      const ini = Math.round(pos * Math.max(0, q.length - JANELA));
      janelas.push(q.slice(ini, ini + JANELA));
    });
  }
  /** @param {typeof seqs} js */
  const construir = (js) => {
    /** @type {Map<string, number>} */
    const idx = new Map();
    /** @type {[string, Estados?][]} */
    const p = [];
    let celulas = 0, fatias = 0;
    const j = js.map((q) =>
      q.map((f) => {
        fatias++;
        /** @type {number[]} */
        const flat = [];
        for (const c of f) {
          let i = idx.get(c.k);
          if (i === undefined) {
            const t = /** @type {{ id: string, estados: Estados | null }} */ (tipos.get(c.k));
            i = p.length;
            idx.set(c.k, i);
            p.push(t.estados ? [curto(t.id), t.estados] : [curto(t.id)]);
          }
          flat.push(c.d, c.h, i);
          celulas++;
        }
        return flat;
      }),
    );
    return { nome, p, j, fatias, celulas, cortou };
  };
  let perfil = construir(janelas);
  while (JSON.stringify(perfil).length > MAX_JSON && janelas.some((q) => q.length > 4)) {
    cortou = true;
    janelas = janelas.map((q) => q.slice(0, Math.max(4, Math.floor(q.length * 0.85))));
    perfil = construir(janelas);
  }
  if (perfil.celulas === 0) return { erro: "não achei nenhuma decoração para fora das bordas marcadas" };
  return { perfil: { ...perfil, cortou } };
}

// ---------------------------------------------------------------- decorar (plano)

/**
 * Sorteia, para cada estação, a fatia a copiar: trechos de 8 a 20 fatias seguidas de uma janela do perfil.
 * @param {number} n @param {number[][][]} janelas @param {() => number} rng @param {number} densidade 0..100
 */
export function escolherFatias(n, janelas, rng, densidade) {
  /** @type {(number[] | null)[]} */
  const sel = new Array(n).fill(null);
  const uteis = janelas.filter((w) => w.length > 0);
  if (!uteis.length) return sel;
  let i = 0;
  while (i < n) {
    const w = uteis[Math.floor(rng() * uteis.length)];
    const run = Math.min(w.length, 8 + Math.floor(rng() * 13));
    const ini = Math.floor(rng() * (w.length - run + 1));
    const ligada = rng() * 100 < densidade;
    for (let k = 0; k < run && i < n; k++, i++) if (ligada) sel[i] = w[ini + k];
  }
  return sel;
}

/**
 * Planeja a decoração (só lê o mundo): quais blocos mudariam e quantas colunas foram puladas por proteção.
 * @param {Pincel} pincel @param {RuaDef} rua @param {Perfil} perfil @param {{ intensidade: number, espelhar: boolean }} opc @param {(f: number, t: string) => void} prog
 * @returns {Generator<any, Plano | { erro: string }>}
 */
export function* planejar(pincel, rua, perfil, opc, prog) {
  const prep = prepararLinhas(rua);
  if ("erro" in prep) return { erro: prep.erro };
  const { linhas, poligono } = prep;
  const ehPiso = yield* descobrirPiso(pincel, linhas);
  let carga = yield* ajustarBordas(pincel, linhas, ehPiso, (f, t) => prog(f * 0.4, t));
  const pal = perfil.p.map(([id, estados]) => ({ tipo: completo(id), estados: estados ?? null }));
  const daPaleta = new Set(pal.map((q) => q.tipo));
  const substituivel = (/** @type {string} */ id) => SUBSTITUIVEL.test(id) || daPaleta.has(id);
  /** @type {(number[] | null)[][]} */
  const sels = [];
  linhas.forEach((l, li) => {
    if (li === 1 && opc.espelhar) {
      const a = sels[0];
      sels.push(l.map((_, j) => a[Math.round((j * (a.length - 1)) / Math.max(1, l.length - 1))] ?? null));
    } else sels.push(escolherFatias(l.length, perfil.j, criarRng(rua.semente + li * 7919), opc.intensidade));
  });
  /** @type {Plano} */
  const plano = { ops: [], colunas: 0, protegidas: 0, carga: 0, caixa: null };
  const visitadas = new Set();
  const est = { k: "" };
  let feitas = 0;
  const total = linhas.reduce((s, l) => s + l.length, 0);
  for (let li = 0; li < linhas.length; li++) {
    const linha = linhas[li], outra = linhas.length === 2 ? linhas[1 - li] : null;
    for (let i = 0; i < linha.length; i++) {
      const e = linha[i], fatia = sels[li][i];
      if (++feitas % 20 === 0) {
        prog(0.4 + (feitas / total) * 0.6, "Planejando a decoração");
        yield;
      }
      if (!e.ok || !fatia || !fatia.length) continue;
      yield* pedirArea(est, Math.floor(e.fx), Math.floor(e.fz));
      const dBorda = outra ? distAte(outra, e.fx + e.nx * e.te, e.fz + e.nz * e.te) : 0;
      /** @type {Map<number, [number, number][]>} */
      const porD = new Map();
      for (let k = 0; k < fatia.length; k += 3) {
        if (fatia[k] < 1 || fatia[k] > D_MAX || fatia[k + 1] < 0 || fatia[k + 1] > H_MAX || !pal[fatia[k + 2]]) continue;
        const lista = porD.get(fatia[k]) ?? [];
        lista.push([fatia[k + 1], fatia[k + 2]]);
        porD.set(fatia[k], lista);
      }
      for (const [d, cells] of [...porD].sort((a, b) => a[0] - b[0])) {
        const [x, z] = celulaDe(e, e.te + d);
        const chave = `${x},${z}`;
        if (visitadas.has(chave)) continue;
        visitadas.add(chave);
        // nunca para dentro: nem no piso, nem entre as bordas, nem dentro do contorno
        const s = pincel.superficie(x, z);
        if (!s) {
          plano.carga++;
          continue;
        }
        if (ehPiso(s.id)) {
          plano.protegidas++;
          continue;
        }
        if (poligono ? dentroPoligono(poligono, x + 0.5, z + 0.5) : outra && distAte(outra, x + 0.5, z + 0.5) < dBorda - 0.01) {
          plano.protegidas++;
          continue;
        }
        const g = chaoDaColuna(pincel, x, z);
        if (g === "carga") {
          plano.carga++;
          continue;
        }
        if (g === null || g === "liquido" || !SOLO.test(g.id) || Math.abs(g.y - e.yBorda) > DIF_ALTURA) {
          plano.protegidas++;
          continue;
        }
        // construção em h=1..2 (ou bloco não carregado): pula a coluna toda
        const acima = [pincel.id(x, g.y + 1, z), pincel.id(x, g.y + 2, z)];
        if (acima.some((id) => id === undefined)) {
          plano.carga++;
          continue;
        }
        if (acima.some((id) => !substituivel(/** @type {string} */ (id)))) {
          plano.protegidas++;
          continue;
        }
        /** @type {Plano["ops"]} */
        const novas = [];
        for (const [h, ip] of cells) {
          const alvo = pal[ip];
          const y = g.y + h;
          const atual = pincel.id(x, y, z);
          if (atual === undefined) continue;
          if (h === 0 ? !SOLO.test(alvo.tipo) : !substituivel(atual)) continue; // o chão só vira outro solo; acima só plantas/ar/decoração
          if (atual === alvo.tipo) continue;
          novas.push([x, y, z, alvo.tipo, alvo.estados]);
        }
        if (!novas.length) continue;
        plano.colunas++;
        for (const o of novas) plano.ops.push(o);
      }
    }
  }
  plano.carga += carga;
  if (plano.ops.length) {
    let c = { x1: Infinity, y1: Infinity, z1: Infinity, x2: -Infinity, y2: -Infinity, z2: -Infinity };
    for (const [x, y, z] of plano.ops) c = { x1: Math.min(c.x1, x), y1: Math.min(c.y1, y), z1: Math.min(c.z1, z), x2: Math.max(c.x2, x), y2: Math.max(c.y2, y), z2: Math.max(c.z2, z) };
    plano.caixa = c;
  }
  return plano;
}

/**
 * Aplica o plano (depois do backup). Cede a vez e pede carga de área por região.
 * @param {Pincel} pincel @param {Plano} plano @param {(f: number, t: string) => void} prog
 * @returns {Generator<any, number>}  blocos postos
 */
export function* aplicar(pincel, plano, prog) {
  const est = { k: "" };
  let n = 0;
  for (const [x, y, z, tipo, estados] of plano.ops) {
    yield* pedirArea(est, x, z);
    pincel.set(x, y, z, tipo, estados ?? undefined);
    n++;
    if (n % 40 === 0) {
      prog(n / plano.ops.length, "Decorando");
      yield;
    }
  }
  prog(1, "Pronto");
  return n;
}
