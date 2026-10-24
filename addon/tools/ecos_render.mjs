// Renderizador de prévias do mapa dos Ecos: PNG sem dependências (zlib do Node).
// Três vistas: de cima (cor por bloco), corte/elevação lateral e isométrica de um recorte.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ------------------------------------------------------------------ PNG
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (tipo, dados) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
export function salvarPNG(caminho, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, png);
}

// ------------------------------------------------------------------ cores por bloco
const CORES = {
  white: [235, 235, 232], light_gray: [160, 160, 155], gray: [75, 78, 82], black: [25, 25, 30], brown: [110, 75, 45], red: [165, 50, 45], orange: [225, 130, 40],
  yellow: [235, 205, 60], lime: [130, 190, 50], green: [85, 120, 50], cyan: [40, 130, 145], light_blue: [110, 175, 225], blue: [55, 80, 170], purple: [140, 70, 175],
  magenta: [190, 80, 180], pink: [235, 150, 175],
};
const REGRAS = [
  [/^minecraft:(air|cave_air|void_air|barrier|light_block.*)$/, null],
  [/water/, [60, 100, 190]],
  [/sea_lantern/, [185, 235, 230]],
  [/end_rod/, [250, 250, 235]],
  [/froglight/, [215, 170, 235]],
  [/soul_lantern/, [90, 205, 225]],
  [/lantern/, [255, 175, 60]],
  [/soul_fire|soul_torch/, [70, 190, 215]],
  [/candle/, null],
  [/calcite/, [232, 230, 222]],
  [/crying_obsidian/, [95, 35, 160]],
  [/obsidian/, [28, 18, 45]],
  [/amethyst/, [150, 100, 205]],
  [/deepslate_tile|deepslate_tiles/, [46, 47, 54]],
  [/chiseled_deepslate/, [72, 72, 80]],
  [/polished_deepslate/, [70, 70, 78]],
  [/deepslate_brick/, [58, 59, 66]],
  [/cracked_deepslate/, [52, 53, 60]],
  [/deepslate/, [78, 78, 84]],
  [/gilded_blackstone/, [105, 80, 40]],
  [/blackstone_brick|polished_blackstone/, [55, 50, 60]],
  [/blackstone/, [40, 36, 44]],
  [/mossy_stone|mossy_cobble/, [100, 122, 92]],
  [/cracked_stone/, [112, 112, 112]],
  [/chiseled_stone/, [135, 135, 138]],
  [/stone_brick|stonebrick/, [125, 125, 128]],
  [/smooth_stone/, [165, 165, 168]],
  [/polished_andesite/, [150, 152, 150]],
  [/polished_diorite|diorite/, [205, 205, 205]],
  [/polished_tuff/, [128, 130, 118]],
  [/tuff_brick/, [118, 120, 106]],
  [/tuff/, [108, 110, 98]],
  [/cobblestone/, [112, 112, 114]],
  [/^minecraft:stone$/, [125, 125, 125]],
  [/smooth_sandstone|sandstone/, [226, 212, 165]],
  [/brick/, [150, 92, 82]],
  [/mud_brick/, [140, 100, 90]],
  [/quartz/, [236, 232, 226]],
  [/pale_oak_leaves|pale_moss/, [175, 188, 168]],
  [/pale_oak/, [225, 215, 200]],
  [/flowering_azalea_leaves/, [150, 125, 145]],
  [/azalea_leaves/, [100, 150, 62]],
  [/spruce_leaves/, [42, 82, 48]],
  [/dark_oak_leaves/, [52, 100, 42]],
  [/birch_leaves/, [122, 160, 84]],
  [/leaves/, [70, 120, 55]],
  [/birch/, [212, 198, 145]],
  [/dark_oak/, [62, 42, 22]],
  [/spruce/, [112, 82, 52]],
  [/mangrove/, [120, 50, 50]],
  [/oak/, [160, 130, 75]],
  [/moss/, [92, 122, 44]],
  [/grass_block/, [112, 150, 82]],
  [/podzol/, [102, 72, 38]],
  [/coarse_dirt/, [112, 78, 52]],
  [/dirt_path|grass_path/, [152, 128, 74]],
  [/dirt/, [122, 88, 58]],
  [/gravel/, [132, 127, 122]],
  [/soul_soil|soul_sand/, [84, 64, 52]],
  [/chiseled_bookshelf/, [152, 112, 72]],
  [/bookshelf/, [138, 98, 54]],
  [/lectern|barrel|loom|cartography|stonecutter|anvil|furnace/, [120, 90, 60]],
  [/iron_bars|chain/, [120, 120, 130]],
  [/sculk/, [22, 48, 58]],
  [/glow_lichen/, [120, 190, 150]],
  [/wither_rose/, [35, 22, 38]],
  [/allium/, [180, 120, 220]],
  [/cornflower|orchid/, [95, 120, 220]],
  [/azure_bluet|lily|daisy|eyeblossom/, [235, 235, 245]],
  [/poppy/, [200, 40, 40]],
  [/dandelion/, [235, 210, 50]],
  [/short_grass|tallgrass|fern|capim/, [95, 140, 70]],
  [/deadbush|dead_bush/, [130, 100, 60]],
  [/vine|hanging/, [80, 120, 70]],
  [/cobweb/, [235, 235, 235]],
  [/copper/, [90, 160, 140]],
  [/gold_block/, [240, 205, 70]],
  [/hay_block/, [200, 170, 50]],
  [/flower_pot|cauldron/, [100, 70, 60]],
  [/bell/, [220, 180, 60]],
  [/bedrock/, [40, 40, 40]],
  [/glass/, null],
];
const cache = new Map();
export const semCor = new Set();
/** @returns {[number, number, number] | null} */
export function corDe(idBruto) {
  if (cache.has(idBruto)) return cache.get(idBruto);
  const id = idBruto.split("|")[0];
  let r;
  const nome = id.replace("minecraft:", "");
  const cm = nome.match(/^(white|light_gray|gray|black|brown|red|orange|yellow|lime|green|cyan|light_blue|blue|purple|magenta|pink)_(wool|carpet|candle|stained_glass|stained_glass_pane|concrete|terracotta|banner)$/);
  if (cm) {
    const b = CORES[cm[1]];
    r = cm[2].includes("glass") ? b.map((c) => Math.round(c * 0.75 + 55)) : cm[2] === "candle" ? b.map((c) => Math.min(255, c + 30)) : b;
  } else if (/candle/.test(nome)) r = [235, 228, 205];
  else if (/stained_glass|^glass/.test(nome)) r = [195, 215, 225];
  else {
    r = undefined;
    for (const [re, c] of REGRAS) if (re.test(id)) { r = c; break; }
    if (r === undefined) {
      semCor.add(id);
      r = [255, 0, 255];
    }
  }
  cache.set(idBruto, r);
  return r;
}
/** forma: [x0,x1,y0,y1,z0,z1] em fração do bloco */
export function formaDe(idBruto) {
  const nome = idBruto.split("|")[0].replace("minecraft:", "");
  if (/_slab$/.test(nome)) return idBruto.includes('"top"') ? [0, 1, 0.5, 1, 0, 1] : [0, 1, 0, 0.5, 0, 1];
  if (/carpet|pressure_plate|sculk_vein|glow_lichen|moss_carpet/.test(nome)) return [0, 1, 0, 0.12, 0, 1];
  if (/_wall$/.test(nome)) return [0.25, 0.75, 0, 1, 0.25, 0.75];
  if (/fence|chain|end_rod|iron_bars|_pane$/.test(nome)) return [0.38, 0.62, 0, 1, 0.38, 0.62];
  if (/lantern/.test(nome)) return [0.3, 0.7, 0.05, 0.65, 0.3, 0.7];
  if (/candle/.test(nome)) return [0.38, 0.62, 0, 0.45, 0.38, 0.62];
  if (/amethyst_cluster|bud/.test(nome)) return [0.3, 0.7, 0, 0.6, 0.3, 0.7];
  if (/flower|rose|allium|cornflower|orchid|bluet|lily|daisy|eyeblossom|poppy|dandelion|grass|fern|bush|vine|hanging|cobweb|waterlily|soul_fire|torch/.test(nome) && !/_block$/.test(nome)) return [0.3, 0.7, 0, 0.6, 0.3, 0.7];
  return null;
}
const OPACO = (idBruto) => corDe(idBruto) && !formaDe(idBruto) && !/glass/.test(idBruto);
const EMISSIVO = /lantern|sea_lantern|end_rod|froglight|candle|soul_fire|glow_lichen|amethyst_cluster/;

// ------------------------------------------------------------------ tela
class Tela {
  constructor(w, h, fundo = [18, 16, 24]) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 3] = fundo[0];
      this.px[i * 3 + 1] = fundo[1];
      this.px[i * 3 + 2] = fundo[2];
    }
  }
  ponto(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }
  ret(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.ponto(x + i, y + j, c);
  }
  misturar(x, y, c, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    for (let k = 0; k < 3; k++) this.px[i + k] = Math.round(this.px[i + k] * (1 - a) + c[k] * a);
  }
  /** polígono convexo por varredura */
  poli(pts, c) {
    let ymin = Infinity, ymax = -Infinity;
    for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    for (let y = Math.floor(ymin); y <= Math.ceil(ymax); y++) {
      const yy = y + 0.5;
      let xa = Infinity, xb = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          const t = (yy - a[1]) / (b[1] - a[1]);
          const x = a[0] + (b[0] - a[0]) * t;
          xa = Math.min(xa, x);
          xb = Math.max(xb, x);
        }
      }
      for (let x = Math.round(xa); x < Math.round(xb); x++) this.ponto(x, y, c);
    }
  }
}
const DIG = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111", "-": "000000111000000" };
function texto(t, s, x, y, c, k = 1) {
  let cx = x;
  for (const ch of String(s)) {
    const g = DIG[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === "1") t.ret(cx + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, c);
    cx += 4 * k;
  }
}
const sombra = (c, f) => [Math.max(0, Math.min(255, Math.round(c[0] * f))), Math.max(0, Math.min(255, Math.round(c[1] * f))), Math.max(0, Math.min(255, Math.round(c[2] * f)))];

// ------------------------------------------------------------------ vista de cima
/**
 * @param {import("./ecos_grade.mjs").PincelGrade} g
 * @param {{ x1: number, z1: number, x2: number, z2: number, k?: number, yMax?: number, pontos?: any[], regua?: number }} o
 */
export function vistaCima(g, o) {
  const k = o.k ?? 8, lw = o.x2 - o.x1 + 1, lh = o.z2 - o.z1 + 1;
  const mar = 22;
  const t = new Tela(lw * k + mar, lh * k + mar);
  const alt = new Int16Array(lw * lh).fill(-99);
  const topo = new Array(lw * lh);
  for (let z = 0; z < lh; z++) for (let x = 0; x < lw; x++) {
    for (let y = Math.min(o.yMax ?? 40, g.caixa.y2); y >= g.caixa.y1; y--) {
      const b = g.bruto(o.x1 + x, y, o.z1 + z);
      if (b === "minecraft:air" || !corDe(b)) continue;
      alt[z * lw + x] = y;
      topo[z * lw + x] = b;
      break;
    }
  }
  for (let z = 0; z < lh; z++) for (let x = 0; x < lw; x++) {
    const b = topo[z * lw + x];
    if (!b) continue;
    let c = corDe(b);
    const a = alt[z * lw + x];
    const vizN = z > 0 ? alt[(z - 1) * lw + x] : a, vizO = x > 0 ? alt[z * lw + x - 1] : a;
    let f = 1 + 0.07 * Math.max(-3, Math.min(3, (a - vizN) + (a - vizO) * 0.6));
    f *= 0.88 + 0.012 * Math.max(0, Math.min(20, a + 8));
    if (EMISSIVO.test(b)) f = 1.25;
    c = sombra(c, f);
    t.ret(mar + x * k, mar + z * k, k, k, c);
    if (k >= 6) {
      // contorno do bloco quase invisível, para o olho contar blocos
      for (let i = 0; i < k; i++) { t.misturar(mar + x * k + i, mar + z * k, [0, 0, 0], 0.1); t.misturar(mar + x * k, mar + z * k + i, [0, 0, 0], 0.1); }
    }
  }
  const passo = o.regua ?? 10;
  for (let x = o.x1; x <= o.x2; x++) if (x % passo === 0) {
    for (let z = 0; z < lh * k; z++) if (z % 3 === 0) t.misturar(mar + (x - o.x1) * k, mar + z, [255, 255, 255], 0.25);
    texto(t, x, mar + (x - o.x1) * k - 4, 8, [200, 200, 210]);
  }
  for (let z = o.z1; z <= o.z2; z++) if (z % passo === 0) {
    for (let x = 0; x < lw * k; x++) if (x % 3 === 0) t.misturar(mar + x, mar + (z - o.z1) * k, [255, 255, 255], 0.25);
    texto(t, z, 1, mar + (z - o.z1) * k - 2, [200, 200, 210]);
  }
  for (const p of o.pontos ?? []) {
    if (p.x < o.x1 || p.x > o.x2 || p.z < o.z1 || p.z > o.z2) continue;
    const cor = { spawn: [0, 255, 0], npc_eco: [255, 255, 0], altar: [255, 120, 0], boss_spawn: [255, 0, 0], entrada_arena: [0, 200, 255] }[p.t] ?? [255, 255, 255];
    const cx = mar + (p.x - o.x1) * k + k / 2, cz = mar + (p.z - o.z1) * k + k / 2;
    for (let i = -6; i <= 6; i++) { t.ponto(Math.round(cx + i), Math.round(cz), cor); t.ponto(Math.round(cx), Math.round(cz + i), cor); }
  }
  return t;
}

// ------------------------------------------------------------------ corte lateral (olhando para o norte)
/**
 * @param {{ x1: number, x2: number, y1: number, y2: number, zNear: number, zFar: number, k?: number }} o
 */
export function corte(g, o) {
  const k = o.k ?? 8, lw = o.x2 - o.x1 + 1, lh = o.y2 - o.y1 + 1;
  const mar = 22;
  const t = new Tela(lw * k + mar, lh * k + mar, [30, 28, 40]);
  for (let y = o.y1; y <= o.y2; y++) for (let x = o.x1; x <= o.x2; x++) {
    for (let z = o.zNear; z >= o.zFar; z--) {
      const b = g.bruto(x, y, z);
      if (b === "minecraft:air" || !corDe(b)) continue;
      let c = corDe(b);
      const prof = o.zNear - z;
      let f = Math.max(0.45, 1 - prof * 0.012);
      if (EMISSIVO.test(b)) f = 1.25;
      const forma = formaDe(b);
      const px = mar + (x - o.x1) * k, py = mar + (o.y2 - y) * k;
      if (forma) {
        t.ret(px + Math.round(forma[0] * k), py + Math.round((1 - forma[3]) * k), Math.max(1, Math.round((forma[1] - forma[0]) * k)), Math.max(1, Math.round((forma[3] - forma[2]) * k)), sombra(c, f));
      } else t.ret(px, py, k, k, sombra(c, f));
      if (k >= 6 && !forma) { t.misturar(px, py, [0, 0, 0], 0.15); for (let i = 1; i < k; i++) { t.misturar(px + i, py, [0, 0, 0], 0.1); t.misturar(px, py + i, [0, 0, 0], 0.1); } }
      break;
    }
  }
  for (let x = o.x1; x <= o.x2; x++) if (x % 10 === 0) texto(t, x, mar + (x - o.x1) * k - 4, 8, [200, 200, 210]);
  for (let y = o.y1; y <= o.y2; y++) if (y % 5 === 0) {
    texto(t, y, 1, mar + (o.y2 - y) * k + 1, [200, 200, 210]);
    for (let x = 0; x < lw * k; x += 4) t.misturar(mar + x, mar + (o.y2 - y) * k + k, [255, 255, 255], 0.2);
  }
  return t;
}

// ------------------------------------------------------------------ isométrica
/**
 * Visão isométrica de um recorte [x1..x2] [y1..y2] [z1..z2]. rot gira o ponto de vista (0 = sudeste, 1 = sudoeste, 2 = noroeste, 3 = nordeste).
 * yTeto corta o que está acima (para ver dentro de salas).
 */
export function isometrica(g, o) {
  const a = o.a ?? 6, b = a / 2, c = Math.round(a * 1.15);
  const rot = o.rot ?? 0;
  const mx = o.x2 - o.x1 + 1, mz = o.z2 - o.z1 + 1, ny = o.y2 - o.y1 + 1;
  const nx = rot % 2 ? mz : mx, nz = rot % 2 ? mx : mz;
  const W = Math.ceil((nx + nz) * a + 40), H = Math.ceil((nx + nz) * b + ny * c + 40);
  const t = new Tela(W, H, o.fundo ?? [34, 32, 44]);
  const ox = nz * a + 20, oy = ny * c + 20;
  const proj = (X, Y, Z) => [ox + (X - Z) * a, oy + (X + Z) * b - Y * c];
  const yMax = Math.min(o.y2, o.yTeto ?? o.y2);
  // posição girada de um bloco local (u,v) = (x - x1, z - z1)
  const rotPos = (u, v) => (rot === 0 ? [u, v] : rot === 1 ? [v, mx - 1 - u] : rot === 2 ? [mx - 1 - u, mz - 1 - v] : [mz - 1 - v, u]);
  const rotBox = (f) => {
    const [x0, x1, y0, y1, z0, z1] = f;
    if (rot === 0) return [x0, x1, y0, y1, z0, z1];
    if (rot === 1) return [z0, z1, y0, y1, 1 - x1, 1 - x0];
    if (rot === 2) return [1 - x1, 1 - x0, y0, y1, 1 - z1, 1 - z0];
    return [1 - z1, 1 - z0, y0, y1, x0, x1];
  };
  const lid = new Array(nx * ny * nz).fill(null);
  const ix = (X, Y, Z) => (Y * nz + Z) * nx + X;
  const lista = [];
  for (let x = o.x1; x <= o.x2; x++) for (let z = o.z1; z <= o.z2; z++) for (let y = o.y1; y <= yMax; y++) {
    const bl = g.bruto(x, y, z);
    if (bl === "minecraft:air" || !corDe(bl)) continue;
    const [X, Z] = rotPos(x - o.x1, z - o.z1);
    lid[ix(X, y - o.y1, Z)] = bl;
    lista.push([X, y - o.y1, Z, bl]);
  }
  const op = (X, Y, Z) => {
    if (X >= nx || Z >= nz || Y >= ny) return false;
    const v = lid[ix(X, Y, Z)];
    return v ? OPACO(v) : false;
  };
  lista.sort((p, q) => p[0] + p[2] - (q[0] + q[2]) || p[1] - q[1]);
  for (const [X, Y, Z, bl] of lista) {
    const cor = corDe(bl);
    const fo = formaDe(bl);
    const cheio = !fo;
    if (cheio && op(X + 1, Y, Z) && op(X, Y, Z + 1) && op(X, Y + 1, Z)) continue;
    const [fx0, fx1, fy0, fy1, fz0, fz1] = fo ? rotBox(fo) : [0, 1, 0, 1, 0, 1];
    const em = EMISSIVO.test(bl) ? 1.3 : 1;
    t.poli([proj(X + fx0, Y + fy1, Z + fz0), proj(X + fx1, Y + fy1, Z + fz0), proj(X + fx1, Y + fy1, Z + fz1), proj(X + fx0, Y + fy1, Z + fz1)], sombra(cor, 1.08 * em));
    t.poli([proj(X + fx0, Y + fy1, Z + fz1), proj(X + fx1, Y + fy1, Z + fz1), proj(X + fx1, Y + fy0, Z + fz1), proj(X + fx0, Y + fy0, Z + fz1)], sombra(cor, 0.82 * em));
    t.poli([proj(X + fx1, Y + fy1, Z + fz1), proj(X + fx1, Y + fy1, Z + fz0), proj(X + fx1, Y + fy0, Z + fz0), proj(X + fx1, Y + fy0, Z + fz1)], sombra(cor, 0.62 * em));
  }
  return t;
}

// ------------------------------------------------------------------ vista do jogador (traçado de raios em voxels)
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const VIDRO = /glass/;
/**
 * O que o jogador vê: câmera em `olho` (coordenadas relativas, em blocos), yaw em graus (0 = leste, 90 = sul, 270 = norte),
 * pitch em graus (positivo olha para cima), névoa linear como a do jogo (cor, início, fim).
 */
export function vistaJogador(g, o) {
  const w = o.w ?? 720, h = o.h ?? 405;
  const t = new Tela(w, h);
  const fov = ((o.fov ?? 80) * Math.PI) / 180, tg = Math.tan(fov / 2), asp = w / h;
  const yaw = (o.yaw * Math.PI) / 180, pit = ((o.pitch ?? 0) * Math.PI) / 180;
  const F = [Math.cos(pit) * Math.cos(yaw), Math.sin(pit), Math.cos(pit) * Math.sin(yaw)];
  const R = [-Math.sin(yaw), 0, Math.cos(yaw)];
  const U = [-Math.sin(pit) * Math.cos(yaw), Math.cos(pit), -Math.sin(pit) * Math.sin(yaw)];
  const fogC = hex(o.fog), ini = o.ini ?? 10, fim = o.fim ?? 60, alcance = Math.min(fim * 1.4, o.alcance ?? 140);
  const mist = (c, d) => { const f = Math.max(0, Math.min(1, (d - ini) / (fim - ini))); return [c[0] + (fogC[0] - c[0]) * f, c[1] + (fogC[1] - c[1]) * f, c[2] + (fogC[2] - c[2]) * f]; };
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const sx = ((px + 0.5) / w * 2 - 1) * tg, sy = -((py + 0.5) / h * 2 - 1) * tg / asp;
    let dx = F[0] + R[0] * sx + U[0] * sy, dy = F[1] + R[1] * sx + U[1] * sy, dz = F[2] + R[2] * sx + U[2] * sy;
    const n = Math.hypot(dx, dy, dz);
    dx /= n; dy /= n; dz /= n;
    let x = Math.floor(o.olho[0]), y = Math.floor(o.olho[1]), z = Math.floor(o.olho[2]);
    const sX = dx > 0 ? 1 : -1, sY = dy > 0 ? 1 : -1, sZ = dz > 0 ? 1 : -1;
    const tdx = dx === 0 ? Infinity : Math.abs(1 / dx), tdy = dy === 0 ? Infinity : Math.abs(1 / dy), tdz = dz === 0 ? Infinity : Math.abs(1 / dz);
    let tmx = dx === 0 ? Infinity : ((dx > 0 ? x + 1 - o.olho[0] : o.olho[0] - x) * tdx);
    let tmy = dy === 0 ? Infinity : ((dy > 0 ? y + 1 - o.olho[1] : o.olho[1] - y) * tdy);
    let tmz = dz === 0 ? Infinity : ((dz > 0 ? z + 1 - o.olho[2] : o.olho[2] - z) * tdz);
    let tt = 0, face = 1, acc = [0, 0, 0], trans = 1, cor = null, dist = alcance;
    for (let i = 0; i < 400 && tt < alcance; i++) {
      const bl = g.bruto(x, y, z);
      if (bl !== "minecraft:air") {
        const c = corDe(bl);
        if (c) {
          const forma = formaDe(bl);
          let hit = true, td = tt;
          if (forma) {
            // interseção raio-caixa dentro do voxel
            let a0 = 0, a1 = Infinity;
            const o3 = [o.olho[0] - x, o.olho[1] - y, o.olho[2] - z], d3 = [dx, dy, dz], lo = [forma[0], forma[2], forma[4]], hi = [forma[1], forma[3], forma[5]];
            for (let k = 0; k < 3; k++) {
              if (Math.abs(d3[k]) < 1e-9) { if (o3[k] < lo[k] || o3[k] > hi[k]) { hit = false; break; } continue; }
              let ta = (lo[k] - o3[k]) / d3[k], tb = (hi[k] - o3[k]) / d3[k];
              if (ta > tb) [ta, tb] = [tb, ta];
              a0 = Math.max(a0, ta); a1 = Math.min(a1, tb);
              if (a0 > a1) { hit = false; break; }
            }
            if (hit) { td = a0; if (a1 < tt) hit = false; }
          }
          if (hit) {
            const sh = [0.7, 1.05, 0.82][face];
            let col = c.map((v) => Math.min(255, v * sh * (EMISSIVO.test(bl) ? 1.35 : 1)));
            col = mist(col, td);
            if (VIDRO.test(bl)) {
              const al = 0.4;
              acc = acc.map((v, k) => v + trans * al * col[k]);
              trans *= 1 - al;
            } else {
              cor = col; dist = td; acc = acc.map((v, k) => v + trans * col[k]); trans = 0;
              break;
            }
          }
        }
      }
      if (tmx < tmy && tmx < tmz) { x += sX; tt = tmx; tmx += tdx; face = 0; }
      else if (tmy < tmz) { y += sY; tt = tmy; tmy += tdy; face = 1; }
      else { z += sZ; tt = tmz; tmz += tdz; face = 2; }
    }
    if (trans > 0) acc = acc.map((v, k) => v + trans * fogC[k]);
    t.ponto(px, py, [Math.round(acc[0]), Math.round(acc[1]), Math.round(acc[2])]);
    void cor; void dist;
  }
  return t;
}
