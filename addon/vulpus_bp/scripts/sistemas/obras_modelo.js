// @ts-check
// Modelo 2D da montanha: relevo com vários picos, rio que desce de um despenhadeiro até o lago, trilha em serpentina com
// degraus, platô do santuário no pico e o material de cada coluna. Tudo é calculado aqui, sem tocar no mundo, e só depois o
// gerador (obras_montanha.js) transforma o modelo em blocos. Assim dá para renderizar uma prévia e testar a forma.
import { criarRng, fbm } from "./obras_ruido.js";

/** Materiais do chão (índice no vetor ID_MAT). */
export const MAT = Object.freeze({
  NADA: 0, GRAMA: 1, TERRA: 2, PEDRA: 3, ANDESITO: 4, TUFO: 5, CASCALHO: 6, CALCITA: 7, NEVE: 8, GELO: 9, TERRA_GROSSA: 10,
  PODZOL: 11, AREIA: 12, CAMINHO: 13, MUSGO: 14, PEDRA_BRUTA: 15, ARDOSIA: 16, TIJOLO: 17, TIJOLO_MUSGO: 18, TIJOLO_RACHADO: 19,
  GRANITO: 20, DIORITO: 21, LISA: 22, LAMA: 23,
});

/** @type {(string | null)[]} */
export const ID_MAT = [
  null, "minecraft:grass_block", "minecraft:dirt", "minecraft:stone", "minecraft:andesite", "minecraft:tuff", "minecraft:gravel",
  "minecraft:calcite", "minecraft:snow", "minecraft:packed_ice", "minecraft:coarse_dirt", "minecraft:podzol", "minecraft:sand",
  "minecraft:grass_path", "minecraft:mossy_cobblestone", "minecraft:cobblestone", "minecraft:deepslate", "minecraft:stone_bricks",
  "minecraft:mossy_stone_bricks", "minecraft:cracked_stone_bricks", "minecraft:granite", "minecraft:diorite", "minecraft:smooth_stone",
  "minecraft:mud",
];

/** O que cada coluna é (vetor `uso`). */
export const USO = Object.freeze({ NATURAL: 0, TRILHA: 1, LAGO: 2, RIO: 3, PLATO: 4, MARGEM: 5, OMBRO: 6, BORDA_PLATO: 7, SALA: 8 });

/**
 * @typedef {object} OpcoesModelo
 * @property {number} cx
 * @property {number} cz
 * @property {number} raio
 * @property {number} altura
 * @property {number} semente
 * @property {boolean} lago
 * @property {boolean} trilha
 * @property {{ x: number, z: number }} [rumo]  para onde a trilha começa a apontar (o spawn): o pé da trilha fica desse lado
 */

/** @param {number} a @param {number} b @param {number} x */
function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Constrói o modelo da montanha, cedendo a vez a cada pouco (no jogo, um script que passa de alguns segundos derruba o servidor).
 * @param {OpcoesModelo} o
 * @returns {Generator<void, any, void>}
 */
export function* construirModeloGen(o) {
  const { cx, cz, raio: R, altura: H, semente } = o;
  const rng = criarRng(semente);
  const margem = Math.round(R * 0.5) + 12;
  const meio = R + margem;
  const lado = meio * 2 + 1;
  const ox = cx - meio, oz = cz - meio;
  const n = lado * lado;
  const h = new Float32Array(n);
  const sup = new Int16Array(n);
  const topo = new Uint8Array(n);
  const sub = new Uint8Array(n);
  const uso = new Uint8Array(n);
  const agua = new Int16Array(n).fill(-9999);
  const escada = new Uint8Array(n);
  const muro = new Uint8Array(n);
  /** nível do tabuleiro de ponte onde a trilha cruza a água (relativo) ou -9999 */
  const ponte = new Int16Array(n).fill(-9999);
  /** índice da coluna (-1 fora do modelo) @param {number} x @param {number} z */
  const idx = (x, z) => {
    const i = x - ox, j = z - oz;
    return i < 0 || j < 0 || i >= lado || j >= lado ? -1 : j * lado + i;
  };

  // ------------------------------------------------------------ 1) relevo: picos pontudos, cristas e vales, terraços
  const ang0 = rng() * Math.PI * 2;
  const rumoOk = !!o.rumo && Math.hypot(o.rumo.x - cx, o.rumo.z - cz) > 12;
  const angRumo = rumoOk && o.rumo ? Math.atan2(o.rumo.z - cz, o.rumo.x - cx) : ang0;
  // um cone dominante de encosta côncava (íngreme no alto, suave no pé) e esporões (cristas) que descem do cume em várias direções
  const picos = [{ x: cx + Math.cos(ang0) * R * 0.03, z: cz + Math.sin(ang0) * R * 0.03, a: 1, s: 0.8, q: 1.12 }];
  const nEsp = 4 + Math.floor(rng() * 2);
  /** @type {{ c: number, s: number, a: number, larg: number, comp: number }[]} */
  const esporoes = [];
  for (let i = 0; i < nEsp; i++) {
    const ang = ang0 + (Math.PI * 2 * i) / nEsp + (rng() - 0.5) * 0.7;
    esporoes.push({ c: Math.cos(ang), s: Math.sin(ang), a: 0.5 + rng() * 0.28, larg: R * (0.11 + rng() * 0.06), comp: R * (0.85 + rng() * 0.2) });
  }
  /** cristas: ruído de picos afiados e vales (ridged multifractal), em [0, ~1] @param {number} x @param {number} z */
  const cristas = (x, z) => {
    let soma = 0, amp = 0.6, freq = 0.03, peso = 1;
    for (let i = 0; i < 5; i++) {
      let sinal = 1 - Math.abs(2 * fbm(x * freq, z * freq, semente + 50 + i * 13, 1) - 1);
      sinal *= sinal * peso;
      peso = Math.max(0, Math.min(1, sinal * 2.2));
      soma += sinal * amp;
      amp *= 0.52;
      freq *= 2.05;
    }
    return Math.min(1, soma * 1.5);
  };
  let maximo = 0, mx = cx, mz = cz;
  for (let j = 0; j < lado; j++) {
    yield;
    for (let i = 0; i < lado; i++) {
      const x = ox + i, z = oz + j;
      const wx = x + (fbm(x * 0.022, z * 0.022, semente + 7, 3) - 0.5) * R * 0.16;
      const wz = z + (fbm(x * 0.022 + 40, z * 0.022 + 40, semente + 9, 3) - 0.5) * R * 0.16;
      const d = Math.hypot(wx - cx, wz - cz) / R;
      const env = Math.pow(Math.max(0, 1 - Math.pow(d, 1.7)), 1.1);
      // picos pontudos (pirâmides) combinados por máximo suave
      let soma = 0;
      for (const p of picos) {
        const dd = Math.hypot(wx - p.x, wz - p.z) / (R * p.s);
        const c = p.a * Math.pow(Math.max(0, 1 - dd), p.q);
        soma += c * c * c;
      }
      // esporões: cristas largas que saem do cume e vão baixando
      let esp = 0;
      for (const e of esporoes) {
        const vx = wx - picos[0].x, vz = wz - picos[0].z;
        const ao = vx * e.c + vz * e.s, per = -vx * e.s + vz * e.c;
        if (ao < 0) continue;
        const t = Math.max(0, 1 - ao / e.comp);
        const lateral = Math.exp(-((per / (e.larg * (0.7 + 0.6 * t))) ** 2));
        esp = Math.max(esp, e.a * Math.pow(t, 1.15) * lateral);
      }
      const picosV = Math.min(1.05, Math.cbrt(soma) + esp * (1 - Math.cbrt(soma)) * 0.85);
      // textura natural suave: variação larga e um pouco de detalhe fino, sem cristas afiadas
      const larga = fbm(wx * 0.028, wz * 0.028, semente + 50, 3);
      const fina = fbm(wx * 0.09, wz * 0.09, semente + 63, 2);
      const rugosidade = 0.78 + 0.44 * larga + 0.1 * (fina - 0.5);
      let base = (picosV * 0.9 + env * 0.1) * rugosidade;
      const d0 = Math.hypot(x - cx, z - cz) / R;
      const colinas = Math.max(0, fbm(x * 0.035, z * 0.035, semente + 21, 3) - 0.42) * 0.2 * (1 - smooth(0.85, 1.5, d0));
      const v = base * (1 - smooth(0.82, 1.0, d0)) + colinas * (0.4 + base * 0.3);
      h[j * lado + i] = v;
      if (v > maximo) {
        maximo = v;
        mx = x;
        mz = z;
      }
    }
  }
  const escala = maximo > 0 ? H / maximo : 0;
  const passo = Math.max(6, H / 8);
  for (let j = 0; j < lado; j++) {
    yield;
    for (let i = 0; i < lado; i++) {
      const x = ox + i, z = oz + j;
      let v = h[j * lado + i] * escala;
      // terraços na rocha alta: degraus que viram patamares e paredões
      const m = 0; // sem terraços: a encosta é contínua e só o rio, a trilha e o platô a recortam
      if (m > 0) {
        const dn = (fbm(x * 0.03, z * 0.03, semente + 23, 2) - 0.5) * 1.4;
        const t = v / passo + dn;
        const fr = t - Math.floor(t);
        const alvo = (Math.floor(t) + smooth(0.5, 0.9, fr) - dn) * passo;
        v = v + (alvo - v) * m;
      }
      h[j * lado + i] = v;
    }
  }
  for (let k = 0; k < n; k++) sup[k] = Math.round(h[k]);
  const pico = { x: mx, z: mz };
  const hPico = sup[idx(mx, mz)];

  /** altura inteira da coluna (0 fora do modelo) @param {number} x @param {number} z */
  const alt = (x, z) => {
    const i = idx(x, z);
    return i < 0 ? 0 : sup[i];
  };

  // ------------------------------------------------------------ 2) platô do santuário num ombro do pico principal
  // A torre de rocha do pico fica atrás do santuário. Procura o ombro mais plano no nível do platô, em volta do pico.
  const yPlato = Math.round(H * 0.8);
  const rPlato = 8;
  // o platô é o próprio cume aplainado: a encosta sobe até ele de todos os lados, sem torre de rocha nem cratera atrás
  const plato = { x: mx, z: mz };
  const fusao = 10;
  for (let dz = -(rPlato + fusao); dz <= rPlato + fusao; dz++) {
    for (let dx = -(rPlato + fusao); dx <= rPlato + fusao; dx++) {
      const x = plato.x + dx, z = plato.z + dz, k = idx(x, z);
      if (k < 0) continue;
      const d = Math.hypot(dx, dz);
      if (d <= rPlato) {
        sup[k] = yPlato;
        h[k] = yPlato;
        uso[k] = USO.PLATO;
      } else if (d <= rPlato + fusao) {
        const m = smooth(rPlato, rPlato + fusao, d);
        const antes = sup[k];
        sup[k] = Math.round(yPlato + (sup[k] - yPlato) * m);
        h[k] = sup[k];
        // onde o platô foi aterrado, a borda vira um pódio de alvenaria
        if (d <= rPlato + 2.2 && antes < yPlato - 2) muro[k] = 1;
        if (d <= rPlato + 1.5) uso[k] = USO.BORDA_PLATO;
      }
    }
  }

  // ------------------------------------------------------------ 3) rio: desce do despenhadeiro e termina no lago
  /** @type {{ x: number, z: number, w: number }[]} */
  const rio = [];
  /** @type {{ x: number, z: number, raio: number, nivel: number } | null} */
  let lago = null;
  let nascente = null;
  if (o.lago) {
    // nascente: ponto de grande inclinação a meia altura, no setor do lago
    const angL = angRumo + Math.PI * (0.55 + rng() * 0.9);
    let melhor = null, melhorInc = -1;
    for (let t = 0; t < 400; t++) {
      const a = angL + (rng() - 0.5) * 1.1;
      const r = R * (0.3 + rng() * 0.32);
      const x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
      const y = alt(x, z);
      if (y < H * 0.34 || y > H * 0.66) continue;
      const inc = Math.max(Math.abs(y - alt(x + 2, z)), Math.abs(y - alt(x - 2, z)), Math.abs(y - alt(x, z + 2)), Math.abs(y - alt(x, z - 2)));
      if (inc > melhorInc) {
        melhorInc = inc;
        melhor = { x, z };
      }
    }
    if (melhor) {
      nascente = melhor;
      /** @type {Set<number>} */
      const visto = new Set();
      let { x, z } = melhor;
      let nivel = alt(x, z) - 1;
      for (let passos = 0; passos < 600; passos++) {
        if (passos % 15 === 0) yield;
        const ci = idx(x, z);
        if (ci < 0) break;
        visto.add(ci);
        nivel = Math.min(nivel, alt(x, z) - 1);
        rio.push({ x, z, w: nivel });
        if (alt(x, z) <= 1 && Math.hypot(x - cx, z - cz) > R * 0.9) break;
        // desce para o vizinho mais baixo; se travar, segue para fora da montanha
        let bx = x, bz = z, bh = Infinity;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dz) continue;
            const xx = x + dx, zz = z + dz, k = idx(xx, zz);
            if (k < 0 || visto.has(k)) continue;
            const ruido = (fbm(xx * 0.2, zz * 0.2, semente + 41, 2) - 0.5) * 1.6;
            const hh = h[k] + ruido + (dx && dz ? 0.35 : 0);
            if (hh < bh) {
              bh = hh;
              bx = xx;
              bz = zz;
            }
          }
        }
        if (bx === x && bz === z) break;
        const saiu = Math.hypot(bx - cx, bz - cz) > Math.hypot(x - cx, z - cz) + 0.0;
        if (bh >= h[ci] + 0.6 && !saiu) {
          // travou numa bacia: anda para fora
          const a = Math.atan2(z - cz, x - cx);
          bx = Math.round(x + Math.cos(a) * 1.4);
          bz = Math.round(z + Math.sin(a) * 1.4);
        }
        x = bx;
        z = bz;
      }
      const fim = rio[rio.length - 1];
      const rl = Math.max(9, Math.min(16, Math.round(R * 0.2)));
      lago = { x: fim.x, z: fim.z, raio: rl, nivel: -1 };
    }
  }

  // ------------------------------------------------------------ 4) trilha: contorna a montanha subindo aos poucos
  // O alvo de altura cresce a cada coluna; em cada ângulo a trilha para no raio em que o relevo chega nessa altura.
  /** @type {{ x: number, z: number, y: number }[]} */
  const trilha = [];
  if (o.trilha) {
    const aLago = lago ? Math.atan2(lago.z - cz, lago.x - cx) : ang0;
    // o pé da trilha aponta para o spawn; sem spawn, fica do lado oposto ao lago
    let a = rumoOk ? angRumo : aLago + Math.PI;
    const hRaso = (/** @type {number} */ x, /** @type {number} */ z) => {
      const k = idx(Math.round(x), Math.round(z));
      return k < 0 ? 0 : h[k];
    };
    let alvo = 1.5;
    let rAnt = R * 1.0;
    let ultimo = null, yAnt = null, desdeSubida = 9;
    for (let passo = 0; passo < 6000; passo++) {
      if (passo % 4 === 0) yield;
      let r = R * 1.15;
      for (; r > 2; r -= 0.5) if (hRaso(cx + Math.cos(a) * r, cz + Math.sin(a) * r) >= alvo) break;
      rAnt = rAnt * 0.8 + r * 0.2;
      const x = Math.round(cx + Math.cos(a) * rAnt), z = Math.round(cz + Math.sin(a) * rAnt);
      a += 1.05 / Math.max(5, rAnt);
      alvo = Math.min(yPlato, alvo + 0.19);
      if (ultimo && ultimo.x === x && ultimo.z === z) continue;
      const terreno = alt(x, z);
      let y = terreno;
      if (yAnt !== null) {
        const sobe = desdeSubida >= 2 ? 1 : 0;
        y = Math.max(yAnt - 1, Math.min(yAnt + sobe, terreno));
        desdeSubida = y > yAnt ? 0 : desdeSubida + 1;
      }
      trilha.push({ x, z, y });
      yAnt = y;
      ultimo = { x, z };
      if (Math.hypot(x - plato.x, z - plato.z) <= rPlato + 7 && y >= yPlato - 2) break;
    }
    // chegada ao platô: reta curta da última volta até a borda do cume, no nível do platô
    if (trilha.length) {
      const u = trilha[trilha.length - 1];
      let { x, z } = u;
      let y = u.y;
      for (let q = 0; q < 24 && Math.hypot(x - plato.x, z - plato.z) > rPlato + 1; q++) {
        const dx = plato.x - x, dz = plato.z - z;
        if (Math.abs(dx) >= Math.abs(dz)) x += Math.sign(dx);
        else z += Math.sign(dz);
        y = Math.min(yPlato, y + 1);
        trilha.push({ x, z, y });
      }
    }
  }

  // ------------------------------------------------------------ 5) rio e lago escavados no relevo
  if (lago) {
    for (let dz = -(lago.raio + 6); dz <= lago.raio + 6; dz++) {
      for (let dx = -(lago.raio + 6); dx <= lago.raio + 6; dx++) {
        const x = lago.x + dx, z = lago.z + dz, k = idx(x, z);
        if (k < 0) continue;
        const dd = Math.hypot(dx, dz) + (fbm(x * 0.12, z * 0.12, semente + 3, 3) - 0.5) * lago.raio * 0.55;
        if (dd <= lago.raio) {
          const prof = 1 + Math.round((1 - dd / lago.raio) * 3);
          sup[k] = lago.nivel - prof;
          agua[k] = lago.nivel;
          uso[k] = USO.LAGO;
        } else if (dd <= lago.raio + 3.4) {
          sup[k] = Math.max(lago.nivel + 1, Math.min(sup[k], lago.nivel + 3));
          uso[k] = USO.MARGEM;
        }
      }
    }
    for (let i = 0; i < rio.length; i++) {
      const p = rio[i];
      const prox = rio[Math.min(rio.length - 1, i + 1)];
      const px = -(prox.z - p.z) || 0, pz = prox.x - p.x || 0;
      const norma = Math.hypot(px, pz) || 1;
      for (let l = -1; l <= 1; l++) {
        const x = Math.round(p.x + (px / norma) * l), z = Math.round(p.z + (pz / norma) * l), k = idx(x, z);
        if (k < 0 || uso[k] === USO.LAGO || uso[k] === USO.PLATO) continue;
        agua[k] = p.w;
        sup[k] = p.w - 1;
        uso[k] = USO.RIO;
      }
      // poço de queda: onde a água cai 3 ou mais de uma vez, alarga e aprofunda
      const prox2 = rio[Math.min(rio.length - 1, i + 1)];
      if (p.w - prox2.w >= 3) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            const k = idx(prox2.x + dx, prox2.z + dz);
            if (k < 0 || uso[k] === USO.LAGO || Math.hypot(dx, dz) > 2.4) continue;
            agua[k] = prox2.w;
            sup[k] = prox2.w - 2;
            uso[k] = USO.RIO;
          }
        }
      }
    }
  }

  // ------------------------------------------------------------ 6) trilha: corta e aterra o relevo, marca degraus
  /** @type {number[]} */
  const trilhaIdx = [];
  for (let s = 0; s < trilha.length; s++) {
    const p = trilha[s];
    const ant = trilha[Math.max(0, s - 1)], prox = trilha[Math.min(trilha.length - 1, s + 1)];
    const tx = prox.x - ant.x, tz = prox.z - ant.z;
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = p.x + dx, z = p.z + dz, k = idx(x, z);
        if (k < 0 || uso[k] === USO.PLATO) continue;
        const d = Math.hypot(dx, dz);
        if (uso[k] === USO.LAGO || uso[k] === USO.RIO) {
          // a trilha cruza a água: tabuleiro de ponte no nível da trilha
          if (d <= 1.6) ponte[k] = Math.max(ponte[k], p.y);
          continue;
        }
        if (d <= 1.6) {
          sup[k] = p.y;
          uso[k] = USO.TRILHA;
          muro[k] = 0;
        } else if (d <= 2.7 && uso[k] !== USO.TRILHA) {
          // ombro: corta barranco acima e aterra com muro de arrimo abaixo
          if (sup[k] > p.y + 1) sup[k] = p.y + 1 + Math.min(2, sup[k] - p.y - 1);
          if (sup[k] < p.y - 1) {
            sup[k] = p.y - 1;
            muro[k] = 1;
          }
          if (uso[k] === USO.NATURAL) uso[k] = USO.OMBRO;
        }
      }
    }
    trilhaIdx.push(idx(p.x, p.z));
    if (s > 0 && p.y > ant.y) {
      const k = idx(p.x, p.z);
      // degrau: escada sobe no sentido da caminhada
      escada[k] = Math.abs(tx) >= Math.abs(tz) ? (tx >= 0 ? 1 : 2) : tz >= 0 ? 3 : 4;
    }
  }

  // ------------------------------------------------------------ 6b) portais (torii) ao longo da trilha e a entrada do platô
  /** @type {{ x: number, z: number, y: number, eixo: "x" | "z" }[]} */
  const torii = [];
  if (trilha.length > 40) {
    for (const f of [0.07, 0.22, 0.4, 0.58, 0.76]) {
      const s0 = Math.floor(trilha.length * f);
      const p = trilha[s0], q = trilha[Math.min(trilha.length - 1, s0 + 3)], r0 = trilha[Math.max(0, s0 - 3)];
      const tx = q.x - r0.x, tz = q.z - r0.z;
      const k = idx(p.x, p.z);
      if (k >= 0 && ponte[k] === -9999) torii.push({ x: p.x, z: p.z, y: p.y, eixo: Math.abs(tx) >= Math.abs(tz) ? "z" : "x" });
    }
  }
  // direção em que a trilha chega ao platô: o santuário olha para lá
  let entrada = { dx: 0, dz: 1 };
  if (trilha.length) {
    const u = trilha[trilha.length - 1];
    const vx = u.x - plato.x, vz = u.z - plato.z;
    entrada = Math.abs(vx) >= Math.abs(vz) ? { dx: Math.sign(vx) || 1, dz: 0 } : { dx: 0, dz: Math.sign(vz) || 1 };
  }

  // ------------------------------------------------------------ 6c) sala dos portais: um salão escavado na encosta, de frente para a trilha
  // Procura, ao longo do 1/3 do meio da trilha, onde a montanha tem rocha de sobra por cima do salão (15 de comprimento por 21 de
  // largura, 13 de altura no centro da abóbada). Onde faltar rocha, a encosta é levantada para cobrir o teto.
  /** @type {{ x: number, z: number, y: number, dx: number, dz: number } | null} */
  let portal = null;
  /** @type {Record<string, number>} */
  const diag = {};
  {
    /** @type {{ x: number, z: number, y: number }[]} */
    const cands = [];
    if (trilha.length > 40) {
      for (let s0 = Math.floor(trilha.length * 0.05); s0 <= Math.floor(trilha.length * 0.7); s0 += 1) cands.push(trilha[s0]);
    } else {
      for (let q = 0; q < 24; q++) {
        const a = (q * Math.PI) / 12;
        for (let r = R; r > 4; r--) {
          const x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
          if (alt(x, z) >= Math.round(H * 0.28)) {
            cands.push({ x, z, y: alt(x, z) });
            break;
          }
        }
      }
    }
    let melhorDef = Infinity;
    const DENTRO = 5; // a parede da frente do salão fica 5 colunas para dentro: o corredor de entrada (varanda) liga a trilha a ela
    for (const c1 of cands) {
      yield;
      const vx = mx - c1.x, vz = mz - c1.z;
      const din = Math.abs(vx) >= Math.abs(vz) ? { dx: Math.sign(vx) || 1, dz: 0 } : { dx: 0, dz: Math.sign(vz) || 1 };
      const lat = { x: -din.dz, z: din.dx };
      const c0 = { x: c1.x + din.dx * DENTRO, z: c1.z + din.dz * DENTRO, y: c1.y };
      let def = 0, ruim = false, conflitos = 0;
      for (let u = 0; u <= 18 && !ruim; u++) {
        for (let v = -12; v <= 12; v++) {
          const x = c0.x + din.dx * u + lat.x * v, z = c0.z + din.dz * u + lat.z * v, k = idx(x, z);
          if (k < 0) {
            ruim = true;
            diag.fora = (diag.fora ?? 0) + 1;
            break;
          }
          if (uso[k] === USO.LAGO || uso[k] === USO.RIO || uso[k] === USO.PLATO || uso[k] === USO.BORDA_PLATO) {
            ruim = true;
            diag.agua = (diag.agua ?? 0) + 1;
          }
          // outra volta da trilha só pode passar por cima do teto do salão
          if (uso[k] === USO.TRILHA && sup[k] < c0.y + 14) {
            conflitos++;
            diag.trilha = (diag.trilha ?? 0) + 1;
          }
          def += Math.max(0, c0.y + 16 - sup[k]);
        }
      }
      // prefere onde nenhuma outra volta da trilha atravessa o salão; se não houver, o que cortar menos
      const pontos = conflitos * 100000 + def;
      if (!ruim && pontos < melhorDef) {
        melhorDef = pontos;
        portal = { x: c0.x, z: c0.z, y: c0.y, dx: din.dx, dz: din.dz };
      }
    }
    if (portal) {
      const lat = { x: -portal.dz, z: portal.dx };
      const need = portal.y + 16;
      for (let u = -DENTRO; u <= 24; u++) {
        for (let v = -17; v <= 17; v++) {
          const x = portal.x + portal.dx * u + lat.x * v, z = portal.z + portal.dz * u + lat.z * v, k = idx(x, z);
          if (k < 0 || uso[k] === USO.TRILHA || uso[k] === USO.LAGO || uso[k] === USO.RIO || uso[k] === USO.PLATO) continue;
          const du = u < 0 ? -u : Math.max(0, u - 18);
          const dv = Math.max(0, Math.abs(v) - 12);
          const d = Math.hypot(du, dv);
          if (u < 0 && Math.abs(v) <= 5) continue; // a varanda fica livre
          const alvo = Math.round(need - d * 2);
          if (sup[k] < alvo) {
            sup[k] = alvo;
            h[k] = alvo;
            if (d < 1) uso[k] = USO.SALA;
          } else if (d < 1) uso[k] = USO.SALA;
        }
      }
    }
  }

  // ------------------------------------------------------------ 7) materiais
  const incl = (/** @type {number} */ x, /** @type {number} */ z) => {
    const y = alt(x, z);
    return Math.max(Math.abs(y - alt(x + 1, z)), Math.abs(y - alt(x - 1, z)), Math.abs(y - alt(x, z + 1)), Math.abs(y - alt(x, z - 1)));
  };
  for (let j = 0; j < lado; j++) {
    yield;
    for (let i = 0; i < lado; i++) {
      const x = ox + i, z = oz + j, k = j * lado + i;
      const y = sup[k], frac = y / H;
      const inc = incl(x, z);
      const r1 = fbm(x * 0.12, z * 0.12, semente + 31, 3);
      const r2 = fbm(x * 0.35 + 9, z * 0.35, semente + 33, 2);
      const linhaNeve = 0.7 + (fbm(x * 0.06, z * 0.06, semente + 37, 2) - 0.5) * 0.16;
      /** @type {[number, number]} */
      let par;
      const u = uso[k];
      if (u === USO.LAGO) par = [r1 > 0.55 ? MAT.CASCALHO : MAT.AREIA, MAT.PEDRA];
      else if (u === USO.RIO) par = [r2 > 0.6 ? MAT.MUSGO : MAT.PEDRA, MAT.PEDRA];
      else if (u === USO.PLATO) par = [MAT.LISA, MAT.PEDRA];
      else if (u === USO.TRILHA) par = [frac > 0.42 || inc >= 3 ? MAT.CASCALHO : MAT.CAMINHO, MAT.TERRA];
      else if (u === USO.MARGEM) par = [r1 > 0.5 ? MAT.AREIA : MAT.GRAMA, MAT.TERRA];
      else if (frac >= linhaNeve) par = inc >= 3 ? [r2 > 0.6 ? MAT.CALCITA : MAT.PEDRA, MAT.PEDRA] : [MAT.NEVE, MAT.PEDRA];
      else if (frac >= linhaNeve - 0.08 && r1 > 0.5) par = [inc >= 3 ? MAT.CALCITA : MAT.NEVE, MAT.PEDRA];
      else if (inc >= 3) par = [r1 > 0.62 ? MAT.TUFO : r1 < 0.3 ? MAT.ANDESITO : r2 > 0.7 ? MAT.GRANITO : MAT.PEDRA, MAT.PEDRA];
      else if (frac >= 0.46) par = [r1 > 0.6 ? MAT.CASCALHO : r1 < 0.34 ? MAT.ANDESITO : r2 > 0.8 ? MAT.DIORITO : MAT.PEDRA, MAT.PEDRA];
      else if (inc >= 2) par = [r1 > 0.58 ? MAT.TERRA_GROSSA : MAT.PEDRA, MAT.TERRA];
      else par = [frac > 0.28 && r1 > 0.56 ? MAT.PODZOL : MAT.GRAMA, MAT.TERRA];
      topo[k] = par[0];
      sub[k] = par[1];
    }
  }

  return {
    ...o,
    lado, ox, oz, meio, n,
    h, sup, topo, sub, uso, agua, escada, muro, ponte, torii, entrada, portal, portalDiag: diag,
    pico, hPico, yPlato, rPlato, plato, picos,
    rio, lago, nascente, trilha, trilhaIdx,
    idx,
    alt,
    /** altura (relativa) de uma coluna @param {number} x @param {number} z */
    altura: (x, z) => alt(x, z),
    /** inclinação da coluna @param {number} x @param {number} z */
    inclinacao: (x, z) => incl(x, z),
  };
}

/** @typedef {ReturnType<typeof construirModelo>} Modelo */

/**
 * Versão de uma vez só (testes e prévias, fora do jogo).
 * @param {OpcoesModelo} o
 * @returns {ReturnType<typeof construirModeloGen> extends Generator<any, infer R, any> ? R : never}
 */
export function construirModelo(o) {
  const g = construirModeloGen(o);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
