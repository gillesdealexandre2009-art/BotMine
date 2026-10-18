// @ts-check
// Gerador da montanha: transforma o modelo 2D (obras_modelo.js) em blocos. Primeiro o terreno, coluna a coluna e por pedaços
// (com faixas de rocha nos paredões, água, trilha com degraus, pontes e muros de arrimo), depois o santuário no pico, os torii
// e lanternas da trilha, o cais do lago e, por fim, a floresta e a vegetação. Cada etapa é um gerador (function*): cede a vez
// com `yield` e pede carga de área com `yield { area }`.
import { colunaDePonte, santuario, torii, toro } from "./obras_santuario.js";
import { arbusto, betula, cerejeira, pedregulho, pinheiro, troncoCaido } from "./obras_arvores.js";
import { construirModeloGen, ID_MAT, USO } from "./obras_modelo.js";
import { criarRng, fbm } from "./obras_ruido.js";
import { construirSalaDosPortais } from "./obras_portal_sala.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {import("./obras_modelo.js").Modelo} Modelo */
/** @typedef {{ area: { x1: number, z1: number, x2: number, z2: number } } | { espera: number } | void} Cede */

/**
 * @typedef {object} OpcoesMontanha
 * @property {{ x: number, z: number }} [rumo]  spawn: o pé da trilha aponta para lá
 * @property {number} cx
 * @property {number} cz
 * @property {number} baseY  nível do chão de referência
 * @property {number} raio
 * @property {number} altura
 * @property {number} semente
 * @property {boolean} floresta
 * @property {boolean} lago
 * @property {boolean} trilha
 * @property {number} densidade  árvores por 1000 blocos de grama
 */

/**
 * @typedef {object} ResultadoMontanha
 * @property {{ x: number, y: number, z: number }} topo
 * @property {{ x: number, y: number, z: number } | null} base
 * @property {{ x: number, y: number, z: number } | null} lago
 * @property {{ x: number, y: number, z: number } | null} nascente
 * @property {{ x: number, y: number, z: number } | null} mirante
 * @property {number} arvores
 * @property {import("./obras_portal_sala.js").ResultadoSala | null} sala  a Sala dos Portais (null se não coube)
 */

export const PADRAO_MONTANHA = Object.freeze({ raio: 70, altura: 70, semente: 20261012, floresta: true, lago: true, trilha: true, densidade: 38 });

const AR = "minecraft:air";
const PEDRA = "minecraft:stone";
const FAIXAS = ["minecraft:stone", "minecraft:stone", "minecraft:andesite", "minecraft:stone", "minecraft:tuff", "minecraft:stone", "minecraft:granite", "minecraft:andesite"];
const DIR_ESCADA = [0, 0, 1, 2, 3];

/** @param {Pincel} p @param {number} limite @param {{ n: number }} estado */
function cheio(p, limite, estado) {
  if (p.ops - estado.n < limite) return false;
  estado.n = p.ops;
  return true;
}

/** Pedaços quadrados de 48 que cobrem uma região. @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
function pedacos(x1, z1, x2, z2) {
  const lista = [];
  for (let z = z1; z <= z2; z += 48) for (let x = x1; x <= x2; x += 48) lista.push({ x1: x, z1: z, x2: Math.min(x + 47, x2), z2: Math.min(z + 47, z2) });
  return lista;
}

/**
 * Rocha de uma altura, em faixas de tipos diferentes (os paredões ficam estratificados).
 * @param {Pincel} p @param {number} x @param {number} z @param {number} y1 @param {number} y2 @param {number} semente @param {boolean} faixas
 */
function rocha(p, x, z, y1, y2, semente, faixas) {
  if (y2 < y1) return;
  if (!faixas) {
    p.fill(x, y1, z, x, y2, z, PEDRA);
    return;
  }
  const desloc = Math.floor(fbm(x * 0.05, z * 0.05, semente + 61, 2) * 5);
  let inicio = y1, atual = FAIXAS[0];
  for (let y = y1; y <= y2; y++) {
    const g = Math.floor((y + desloc) / 3);
    const tipo = FAIXAS[(Math.imul(g, 2654435761) >>> 0) % FAIXAS.length];
    if (y === y1) atual = tipo;
    if (tipo !== atual) {
      p.fill(x, inicio, z, x, y - 1, z, atual);
      inicio = y;
      atual = tipo;
    }
  }
  p.fill(x, inicio, z, x, y2, z, atual);
}

/**
 * Piso da trilha: um mosaico de pedras (borda de tijolo, miolo de andesito polido e cascalho) que vai ficando mais rústico no pé
 * da montanha e mais cuidado perto do santuário.
 * @param {Modelo} m @param {number} x @param {number} z @param {number} k @param {number} frac altura relativa @param {number} semente
 */
function mosaicoTrilha(m, x, z, k, frac, semente) {
  let borda = false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const kk = m.idx(x + dx, z + dz);
    if (kk >= 0 && m.uso[kk] !== USO.TRILHA && m.uso[kk] !== USO.OMBRO && m.agua[kk] <= -9000) borda = true;
  }
  const r = fbm(x * 0.8 + 3, z * 0.8 + 3, semente + 91, 2);
  const cuidado = Math.max(0, Math.min(1, (frac - 0.12) / 0.5));
  if (borda) return r < 0.35 ? "minecraft:mossy_stone_bricks" : r < 0.8 ? "minecraft:stone_bricks" : "minecraft:cracked_stone_bricks";
  const v = r * (0.6 + cuidado * 0.4) + (1 - cuidado) * 0.25 * ((x * 7 + z * 13) % 5) / 4;
  if (cuidado < 0.35) return v < 0.35 ? "minecraft:gravel" : v < 0.62 ? "minecraft:coarse_dirt" : v < 0.85 ? "minecraft:cobblestone" : "minecraft:andesite";
  return v < 0.3 ? "minecraft:polished_andesite" : v < 0.55 ? "minecraft:stone_bricks" : v < 0.75 ? "minecraft:polished_diorite" : v < 0.9 ? "minecraft:andesite" : "minecraft:cobblestone";
}

/**
 * Terreno: levanta, corta e pinta cada coluna do modelo.
 * @param {Pincel} p @param {OpcoesMontanha} o @param {Modelo} m @param {(f: number, t: string) => void} progresso
 * @returns {Generator<Cede, void>}
 */
function* terreno(p, o, m, progresso) {
  const estado = { n: p.ops };
  let celulas = 0;
  const lista = pedacos(m.ox, m.oz, m.ox + m.lado - 1, m.oz + m.lado - 1);
  let feito = 0;
  for (const t of lista) {
    yield { area: t };
    for (let z = t.z1; z <= t.z2; z++) {
      for (let x = t.x1; x <= t.x2; x++) {
        const k = m.idx(x, z);
        if (k < 0) continue;
        const hr = m.sup[k], u = m.uso[k];
        if (hr === 0 && u === USO.NATURAL) continue;
        if (++celulas % 200 === 0) yield;
        const s = p.superficie(x, z);
        if (!s) continue;
        const gy = s.y, topY = o.baseY + hr;
        const rochoso = hr > o.altura * 0.3 || m.inclinacao(x, z) >= 3;
        const abaixo = ID_MAT[m.sub[k]] ?? PEDRA;
        // 1) acerta o miolo: corta o que passa do alvo ou levanta rocha até ele
        if (gy > topY) {
          p.fill(x, topY + 1, z, x, gy + 10, z, AR);
          p.fill(x, topY - 2, z, x, topY - 1, z, abaixo);
        } else if (topY > gy) {
          rocha(p, x, z, gy + 1, topY - 3, o.semente, rochoso);
          p.fill(x, Math.max(gy + 1, topY - 2), z, x, topY - 1, z, abaixo);
        }
        // 2) superfície
        if (m.muro[k]) {
          // muro de arrimo e pódio: alvenaria de tijolo com musgo
          p.fill(x, Math.max(Math.min(gy, topY) - 1, topY - 9), z, x, topY, z, "minecraft:stone_bricks");
          for (let y = topY - 4; y <= topY; y++) {
            const r = fbm(x * 0.9 + y, z * 0.9, o.semente + 11, 2);
            if (r > 0.64) p.set(x, y, z, r > 0.72 ? "minecraft:mossy_stone_bricks" : "minecraft:cracked_stone_bricks");
          }
        } else if (m.escada[k]) {
          p.set(x, topY, z, "minecraft:stone_brick_stairs", { weirdo_direction: DIR_ESCADA[m.escada[k]], upside_down_bit: false });
        } else if (u === USO.TRILHA && m.ponte[k] === -9999) {
          p.set(x, topY, z, mosaicoTrilha(m, x, z, k, hr / o.altura, o.semente));
        } else {
          p.set(x, topY, z, ID_MAT[m.topo[k]] ?? PEDRA);
        }
        // 3) água
        const nivelAgua = m.agua[k];
        if (nivelAgua > -9000) p.fill(x, topY + 1, z, x, o.baseY + nivelAgua, z, "minecraft:water");
        // 4) ponte (o tabuleiro fica acima da água) ou limpeza do que sobrou acima
        const deck = m.ponte[k];
        if (deck > -9000) {
          let rail = false;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const kk = m.idx(x + dx, z + dz);
            if (kk >= 0 && m.ponte[kk] === -9999 && m.agua[kk] > -9000) rail = true;
          }
          colunaDePonte(p, x, o.baseY + deck, z, rail);
        } else {
          const acima = Math.max(topY, nivelAgua > -9000 ? o.baseY + nivelAgua : topY);
          p.fill(x, acima + 1, z, x, Math.max(topY, gy) + 22, z, AR);
        }
        if (cheio(p, 500, estado)) yield;
      }
    }
    feito++;
    progresso(feito / lista.length, "Esculpindo o relevo");
  }
}

/**
 * Santuário, torii e lanternas da trilha, cais do lago e placas.
 * @param {Pincel} p @param {OpcoesMontanha} o @param {Modelo} m @param {() => number} rng
 * @returns {Generator<Cede, { topo: { x: number, y: number, z: number } }>}
 */
function* estruturas(p, o, m, rng) {
  const yTop = o.baseY + m.yPlato;
  yield { area: { x1: m.plato.x - 14, z1: m.plato.z - 14, x2: m.plato.x + 14, z2: m.plato.z + 14 } };
  santuario(p, m.plato.x, m.plato.z, yTop, m.entrada, rng);
  yield;
  const chaoEm = (/** @type {number} */ x, /** @type {number} */ z) => o.baseY + m.alt(x, z);
  for (const t of m.torii) {
    yield { area: { x1: t.x - 8, z1: t.z - 8, x2: t.x + 8, z2: t.z + 8 } };
    torii(p, t.x, t.z, o.baseY + t.y, t.eixo, chaoEm, false);
  }
  // postes de cerca com lanterna, alternando os lados da trilha (de dia dão ritmo ao caminho, de noite iluminam)
  for (let s0 = 6, lado = 1; s0 < m.trilha.length - 4; s0 += 9, lado = -lado) {
    const a0 = m.trilha[s0], b0 = m.trilha[Math.min(m.trilha.length - 1, s0 + 2)], c0 = m.trilha[Math.max(0, s0 - 2)];
    const tx0 = b0.x - c0.x, tz0 = b0.z - c0.z;
    const n0 = Math.hypot(tx0, tz0) || 1;
    const px = Math.round(a0.x + (-tz0 / n0) * 2.6 * lado), pz = Math.round(a0.z + (tx0 / n0) * 2.6 * lado);
    const kk = m.idx(px, pz);
    if (kk < 0 || m.uso[kk] === USO.TRILHA || m.uso[kk] === USO.LAGO || m.uso[kk] === USO.RIO || m.agua[kk] > -9000 || m.ponte[kk] > -9000 || m.muro[kk]) continue;
    yield { area: { x1: px - 3, z1: pz - 3, x2: px + 3, z2: pz + 3 } };
    const y0 = o.baseY + m.sup[kk];
    p.set(px, y0 + 1, pz, "minecraft:dark_oak_fence");
    p.set(px, y0 + 2, pz, "minecraft:dark_oak_fence");
    p.set(px, y0 + 3, pz, "minecraft:lantern");
  }
  // lanternas de pedra do lado direito da trilha, de vez em quando
  for (let s = 12; s < m.trilha.length - 6; s += 19) {
    const a = m.trilha[s], b = m.trilha[Math.min(m.trilha.length - 1, s + 2)], c = m.trilha[Math.max(0, s - 2)];
    const tx = b.x - c.x, tz = b.z - c.z;
    const n = Math.hypot(tx, tz) || 1;
    const lx = Math.round(a.x + (-tz / n) * 3), lz = Math.round(a.z + (tx / n) * 3);
    const k = m.idx(lx, lz);
    if (k < 0 || m.uso[k] === USO.LAGO || m.uso[k] === USO.RIO || m.agua[k] > -9000 || m.ponte[k] > -9000) continue;
    yield { area: { x1: lx - 3, z1: lz - 3, x2: lx + 3, z2: lz + 3 } };
    toro(p, lx, o.baseY + m.sup[k] + 1, lz);
  }
  // cais no lago, apontando para a montanha: tábuas rente ao chão, estacas na água, lanterna na ponta
  if (m.lago) {
    const l = m.lago;
    const vx = o.cx - l.x, vz = o.cz - l.z;
    const dx = Math.abs(vx) >= Math.abs(vz) ? Math.sign(vx) : 0, dz = dx === 0 ? Math.sign(vz) : 0;
    yield { area: { x1: l.x - l.raio - 6, z1: l.z - l.raio - 6, x2: l.x + l.raio + 6, z2: l.z + l.raio + 6 } };
    const comeco = l.raio + 1;
    for (let i = comeco; i >= comeco - 10; i--) {
      for (let w = -1; w <= 1; w++) {
        const px = l.x + dx * i + (dx === 0 ? w : 0), pz = l.z + dz * i + (dz === 0 ? w : 0);
        p.fill(px, o.baseY + 1, pz, px, o.baseY + 3, pz, AR);
        p.set(px, o.baseY, pz, "minecraft:dark_oak_planks");
      }
      if (i % 3 === 0) {
        for (const w of [-2, 2]) {
          const px = l.x + dx * i + (dx === 0 ? w : 0), pz = l.z + dz * i + (dz === 0 ? w : 0);
          p.fill(px, o.baseY - 3, pz, px, o.baseY + 1, pz, "minecraft:dark_oak_log");
          p.set(px, o.baseY + 2, pz, "minecraft:lantern");
        }
      }
    }
  }
  // placa no começo da trilha
  if (m.trilha.length) {
    const t0 = m.trilha[0];
    const k = m.idx(t0.x + 3, t0.z);
    if (k >= 0 && m.agua[k] === -9999) {
      const y = o.baseY + m.sup[k] + 1;
      p.set(t0.x + 3, y, t0.z, "minecraft:standing_sign", { ground_sign_direction: 4 });
      p.placa(t0.x + 3, y, t0.z, ["", "Trilha do", "Santuario", ""]);
    }
  }
  return { topo: { x: m.plato.x + m.entrada.dx * 5, y: yTop + 2, z: m.plato.z + m.entrada.dz * 5 } };
}

const FLORES = ["minecraft:dandelion", "minecraft:poppy", "minecraft:cornflower", "minecraft:azure_bluet", "minecraft:oxeye_daisy", "minecraft:lily_of_the_valley", "minecraft:allium", "minecraft:red_tulip"];

/**
 * Floresta e vegetação: espécies por altitude, clareiras, mato, flores em manchas, rochedos e troncos.
 * @param {Pincel} p @param {OpcoesMontanha} o @param {Modelo} m @param {(f: number, t: string) => void} progresso
 * @returns {Generator<Cede, number>}
 */
function* vegetacao(p, o, m, progresso) {
  const rng = criarRng(o.semente + 555);
  const estado = { n: p.ops };
  /** @type {Set<number>} */
  const ocupado = new Set();
  const dens = o.densidade / 1000;
  let arvores = 0;
  let celulas = 0;
  const lista = pedacos(m.ox + 3, m.oz + 3, m.ox + m.lado - 4, m.oz + m.lado - 4);
  let feito = 0;
  for (const t of lista) {
    yield { area: { x1: t.x1 - 4, z1: t.z1 - 4, x2: t.x2 + 4, z2: t.z2 + 4 } };
    for (let z = t.z1; z <= t.z2; z++) {
      for (let x = t.x1; x <= t.x2; x++) {
        const k = m.idx(x, z);
        if (k < 0) continue;
        const u = m.uso[k];
        if (u === USO.TRILHA || u === USO.LAGO || u === USO.RIO || u === USO.PLATO || u === USO.BORDA_PLATO || m.ponte[k] > -9000 || m.muro[k]) continue;
        const d = Math.hypot(x - o.cx, z - o.cz) / o.raio;
        if (d > 1.45) continue;
        if (++celulas % 250 === 0) yield;
        const mata = fbm(x * 0.05 + 7, z * 0.05 + 7, o.semente + 71, 3);
        const sorte = rng();
        // portão de probabilidade barato antes de consultar o mundo
        const pArv = dens * (0.35 + mata * 1.1) * (mata > 0.4 ? 1 : 0.15);
        const pMato = 0.11 + (mata > 0.5 ? 0.09 : 0);
        if (sorte > pArv + pMato + 0.003) continue;
        const mudou = m.sup[k] !== 0 || u !== USO.NATURAL;
        let y, id;
        if (mudou) {
          y = o.baseY + m.sup[k];
          id = ID_MAT[m.topo[k]];
        } else {
          const s = p.superficie(x, z);
          if (!s) continue;
          y = s.y;
          id = s.id;
        }
        const frac = m.sup[k] / o.altura;
        const inc = m.inclinacao(x, z);
        const gramado = id === "minecraft:grass_block" || id === "minecraft:podzol";
        if (sorte < pArv) {
          if (!gramado || inc > 2 || frac > 0.5 || ocupado.has(z * 100000 + x)) continue;
          if (!mudou && p.id(x, y + 1, z) !== AR) continue;
          const r = rng();
          // a árvore do servidor é o pinheiro: ele domina a mata em todas as alturas, com um toque de cerejeira e bétula no pé da serra
          if (frac < 0.14) {
            if (r < 0.74) pinheiro(p, x, y, z, rng, rng() < 0.4 ? 4 : 3);
            else if (r < 0.83) cerejeira(p, x, y, z, rng);
            else if (r < 0.9) betula(p, x, y, z, rng);
            else arbusto(p, x, y, z, rng);
          } else if (frac < 0.32) {
            if (r < 0.9) pinheiro(p, x, y, z, rng, 3);
            else arbusto(p, x, y, z, rng);
          } else {
            pinheiro(p, x, y, z, rng, 2);
          }
          for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) ocupado.add((z + b) * 100000 + (x + a));
          arvores++;
          if (rng() < 0.45) p.set(x, y, z, "minecraft:podzol");
        } else if (sorte < pArv + pMato) {
          if (!gramado || frac > 0.55 || ocupado.has(z * 100000 + x)) continue;
          if (!mudou && p.id(x, y + 1, z) !== AR) continue;
          const r = rng();
          const flor = FLORES[Math.floor(fbm(x * 0.08, z * 0.08, o.semente + 81, 2) * FLORES.length * 0.999)];
          p.set(x, y + 1, z, r < 0.4 ? "minecraft:short_grass" : r < 0.55 ? "minecraft:fern" : r < 0.9 ? flor : r < 0.96 ? "minecraft:sweet_berry_bush" : "minecraft:brown_mushroom");
        } else if (frac > 0.12 && frac < 0.62 && inc <= 3) {
          const r = rng();
          if (r < 0.5) pedregulho(p, x, y + 1, z, rng, ["minecraft:stone", "minecraft:andesite", "minecraft:mossy_cobblestone", "minecraft:cobblestone"]);
          else if (gramado && !mudou) troncoCaido(p, x, y, z, rng);
        }
        if (cheio(p, 600, estado)) yield;
      }
    }
    feito++;
    progresso(feito / lista.length, "Plantando a floresta");
  }
  return arvores;
}

/**
 * Gera a montanha inteira: terreno, santuário e trilha, floresta.
 * @param {Pincel} p
 * @param {OpcoesMontanha} o
 * @param {(f: number, t: string) => void} progresso
 * @returns {Generator<Cede, ResultadoMontanha>}
 */
export function* gerarMontanha(p, o, progresso) {
  progresso(0, "Calculando o relevo");
  /** @type {Modelo} */
  const m = yield* construirModeloGen({ cx: o.cx, cz: o.cz, raio: o.raio, altura: o.altura, semente: o.semente, lago: o.lago, trilha: o.trilha, rumo: o.rumo });
  const rng = criarRng(o.semente + 321);
  yield* terreno(p, o, m, (f, t) => progresso(f * 0.55, t));
  progresso(0.56, "Construindo o santuário e a trilha");
  const est = yield* estruturas(p, o, m, rng);
  /** @type {import("./obras_portal_sala.js").ResultadoSala | null} */
  let sala = null;
  if (m.portal) {
    progresso(0.6, "Escavando a Sala dos Portais");
    sala = yield* construirSalaDosPortais(p, m.portal, o.baseY + m.portal.y, (x, z) => o.baseY + m.alt(x, z), rng);
  }
  let arvores = 0;
  if (o.floresta) arvores = yield* vegetacao(p, o, m, (f, t) => progresso(0.62 + f * 0.38, t));
  progresso(1, "Montanha pronta");
  const t0 = m.trilha[0];
  const topoY = o.baseY + m.yPlato;
  return {
    topo: { x: est.topo.x + 0.5, y: topoY + 2, z: est.topo.z + 0.5 },
    base: t0 ? { x: t0.x + 0.5, y: o.baseY + t0.y + 1, z: t0.z + 0.5 } : null,
    lago: m.lago ? { x: m.lago.x + m.lago.raio + 2.5, y: o.baseY + 2, z: m.lago.z + 0.5 } : null,
    nascente: m.nascente ? { x: m.nascente.x + 0.5, y: o.baseY + m.alt(m.nascente.x, m.nascente.z) + 2, z: m.nascente.z + 0.5 } : null,
    mirante: { x: m.plato.x + 0.5, y: topoY + 2, z: m.plato.z + 0.5 },
    arvores,
    sala,
  };
}
