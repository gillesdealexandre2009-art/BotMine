// @ts-check
// Mapa procedural de "Ecos dos Ausentes" — dimensão void construída bloco a bloco.
// Coordenadas relativas a uma origem. X→leste, Z→sul, Y=0 é o chão.

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */

// ══════════════════════════════════════════════════ paleta de materiais
const M = {
  ar: "minecraft:air",
  bedrock: "minecraft:bedrock",
  barrier: "minecraft:barrier",

  // ── terra / exterior ──
  grama: "minecraft:grass_block",
  terra: "minecraft:coarse_dirt",
  podzol: "minecraft:podzol",
  soulSoil: "minecraft:soul_soil",
  soulSand: "minecraft:soul_sand",
  mycelium: "minecraft:mycelium",
  moss: "minecraft:moss_block",
  mudPacked: "minecraft:packed_mud",
  gravel: "minecraft:gravel",
  pathDirt: "minecraft:dirt_path",

  // ── pedra / ruínas ──
  stoneBrick: "minecraft:stonebrick",
  mossySB: "minecraft:mossy_stonebrick",
  crackedSB: "minecraft:cracked_stonebrick",
  chiseledSB: "minecraft:chiseled_stonebrick",
  cobble: "minecraft:mossy_cobblestone",
  cobbleNorm: "minecraft:cobblestone",
  andesiteSmooth: "minecraft:polished_andesite",
  tuff: "minecraft:tuff",
  tuffBricks: "minecraft:tuff_bricks",
  calcite: "minecraft:calcite",

  // ── madeira ──
  darkOakPlanks: "minecraft:dark_oak_planks",
  darkOakLog: "minecraft:dark_oak_log",
  darkOakStrip: "minecraft:stripped_dark_oak_log",
  darkOakSlab: "minecraft:dark_oak_slab",
  darkOakStairs: "minecraft:dark_oak_stairs",
  darkOakFence: "minecraft:dark_oak_fence",
  darkOakTrapdoor: "minecraft:dark_oak_trapdoor",
  sprucePlanks: "minecraft:spruce_planks",
  spruceLog: "minecraft:spruce_log",
  spruceStrip: "minecraft:stripped_spruce_log",
  spruceSlab: "minecraft:spruce_slab",
  spruceStairs: "minecraft:spruce_stairs",
  spruceFence: "minecraft:spruce_fence",
  spruceTrapdoor: "minecraft:spruce_trapdoor",
  mangrovePlanks: "minecraft:mangrove_planks",
  mangroveLog: "minecraft:mangrove_log",

  // ── decoração ──
  vidro: "minecraft:glass",
  vidroP: "minecraft:glass_pane",
  vidroGray: "minecraft:gray_stained_glass_pane",
  bookshelf: "minecraft:bookshelf",
  chiseledBookshelf: "minecraft:chiseled_bookshelf",
  ironBars: "minecraft:iron_bars",
  chain: "minecraft:chain",
  cobweb: "minecraft:cobweb",
  deadBush: "minecraft:deadbush",
  witherRose: "minecraft:wither_rose",
  vine: "minecraft:vine",
  mossCarpet: "minecraft:moss_carpet",
  glowLichen: "minecraft:glow_lichen",
  sculk: "minecraft:sculk",
  sculkVein: "minecraft:sculk_vein",
  barrel: "minecraft:barrel",
  loom: "minecraft:loom",
  lectern: "minecraft:lectern",
  flowerPot: "minecraft:flower_pot",
  cauldron: "minecraft:cauldron",

  // ── iluminação ──
  soulLantern: "minecraft:soul_lantern",
  lantern: "minecraft:lantern",
  soulTorch: "minecraft:soul_torch",
  soulFire: "minecraft:soul_fire",
  candle: "minecraft:candle",
  seaLantern: "minecraft:sea_lantern",
  endRod: "minecraft:end_rod",
  shroomlight: "minecraft:shroomlight",

  // ── lajes / escadas ──
  sbSlab: "minecraft:stone_brick_slab",
  sbStairs: "minecraft:stone_brick_stairs",
  cobbSlab: "minecraft:cobblestone_slab",
  cobbStairs: "minecraft:cobblestone_stairs",
  tuffSlab: "minecraft:polished_tuff_slab",
  tuffStairs: "minecraft:polished_tuff_stairs",

  // ── deepslate (arquivo) ──
  dsBricks: "minecraft:deepslate_bricks",
  dsTiles: "minecraft:deepslate_tiles",
  dsPolished: "minecraft:polished_deepslate",
  dsCracked: "minecraft:cracked_deepslate_bricks",
  dsCrackedTiles: "minecraft:cracked_deepslate_tiles",
  dsChiseled: "minecraft:chiseled_deepslate",
  dsWall: "minecraft:deepslate_brick_wall",
  dsSlab: "minecraft:deepslate_brick_slab",
  dsStairs: "minecraft:deepslate_brick_stairs",
  dsTileSlab: "minecraft:deepslate_tile_slab",
  dsTileStairs: "minecraft:deepslate_tile_stairs",

  // ── amethyst / cristal ──
  amethyst: "minecraft:amethyst_block",
  budding: "minecraft:budding_amethyst",
  cryingObs: "minecraft:crying_obsidian",

  // ── blackstone (arena) ──
  blackstone: "minecraft:blackstone",
  bsPol: "minecraft:polished_blackstone",
  bsBricks: "minecraft:polished_blackstone_bricks",
  bsGilded: "minecraft:gilded_blackstone",
  bsSlab: "minecraft:polished_blackstone_brick_slab",
  bsStairs: "minecraft:polished_blackstone_brick_stairs",
  bsWall: "minecraft:polished_blackstone_brick_wall",
  bsPolSlab: "minecraft:polished_blackstone_slab",
  obsidian: "minecraft:obsidian",
  respawnAnchor: "minecraft:respawn_anchor",

  // ── cobre oxidado (patina) ──
  copperOx: "minecraft:oxidized_copper",
  copperCut: "minecraft:oxidized_cut_copper",
  copperSlab: "minecraft:oxidized_cut_copper_slab",
  copperStairs: "minecraft:oxidized_cut_copper_stairs",

  // ── concreto (detalhes) ──
  grayConc: "minecraft:gray_concrete",
  blackConc: "minecraft:black_concrete",
  brownConc: "minecraft:brown_concrete",
  purpleConc: "minecraft:purple_concrete",

  // ── quartz (mausoléu/estátua) ──
  quartzSmooth: "minecraft:quartz_block",
  quartzPillar: "minecraft:quartz_block",  // com estado pillar_axis
  quartzChiseled: "minecraft:quartz_block", // com estado chisel_type
  quartzSlab: "minecraft:quartz_slab",
  quartzStairs: "minecraft:quartz_stairs",
};

// ══════════════════════════════════════════════════ regiões e caixa
export const REG = [
  { id: "limiar",  nome: "O Limiar",            x1: 0,   z1: 0,  x2: 65,  z2: 65,  y1: -3, y2: 18, fog: "vulpus:nevoa_ecos_limiar" },
  { id: "vila",    nome: "A Vila Silenciosa",    x1: 70,  z1: 0,  x2: 165, z2: 75,  y1: -3, y2: 20, fog: "vulpus:nevoa_ecos_vila" },
  { id: "arquivo", nome: "O Arquivo das Almas",  x1: 170, z1: 0,  x2: 240, z2: 65,  y1: -8, y2: 14, fog: "vulpus:nevoa_ecos_arquivo" },
  { id: "arena",   nome: "O Último Testemunho",  x1: 248, z1: 5,  x2: 298, z2: 60,  y1: -5, y2: 24, fog: "vulpus:nevoa_ecos_arena" },
];

export const CAIXA = { x1: -3, z1: -3, x2: 302, z2: 78, y1: -10, y2: 26 };

/** @type {{ x: number, y: number, z: number, t: string, dados?: any }[]} */
export const PONTOS = [];

// ══════════════════════════════════════════════════ helpers reutilizáveis
/** @type {(p: Pincel) => { F: Function, S: Function, ar: Function, arte: Function, pendente: Function, gaiola: Function, posteSoul: Function, pilar: Function, arcada: Function, moldura: Function, mosaico: Function }} */
function helpers(p) {
  const F = (x1, y1, z1, x2, y2, z2, id) => p.fill(x1, y1, z1, x2, y2, z2, id);
  const S = (x, y, z, id, est) => p.set(x, y, z, id, est);
  const ar = (x1, y1, z1, x2, y2, z2) => F(x1, y1, z1, x2, y2, z2, M.ar);

  /** Pixel art vertical. linhas[0] = topo. '#' = bloco, '.' = ar, outros chars = blocos extras */
  const arte = (linhas, blocos, x, yBase, z, eixo) => {
    for (let row = 0; row < linhas.length; row++) {
      const y = yBase + (linhas.length - 1 - row);
      for (let col = 0; col < linhas[row].length; col++) {
        const ch = linhas[row][col];
        if (ch === ".") continue;
        const id = blocos[ch] ?? blocos["#"];
        if (!id) continue;
        if (eixo === "x") S(x, y, z + col, id);
        else S(x + col, y, z, id);
      }
    }
  };

  /** Lanterna pendente (corrente + soul lantern) */
  const pendente = (x, yTeto, z, len = 2) => {
    for (let i = 0; i < len; i++) S(x, yTeto - i, z, M.chain);
    S(x, yTeto - len, z, M.soulLantern);
  };

  /** Gaiola de luz (lanterna com iron_bars nos 4 lados) */
  const gaiola = (x, y, z) => {
    S(x, y, z, M.soulLantern);
    S(x - 1, y, z, M.ironBars); S(x + 1, y, z, M.ironBars);
    S(x, y, z - 1, M.ironBars); S(x, y, z + 1, M.ironBars);
  };

  /** Poste com soul lantern no topo */
  const posteSoul = (x, z, h = 3) => {
    for (let y = 1; y <= h; y++) S(x, y, z, M.darkOakFence);
    S(x, h + 1, z, M.soulLantern);
  };

  /** Pilar sólido de y1 a y2 */
  const pilar = (x, z, y1, y2, id) => { for (let y = y1; y <= y2; y++) S(x, y, z, id); };

  /** Arcada (arco entre dois pilares) */
  const arcada = (x1, z, x2, yBase, h, idPilar, idArco) => {
    pilar(x1, z, yBase, yBase + h, idPilar);
    pilar(x2, z, yBase, yBase + h, idPilar);
    F(x1, yBase + h, z, x2, yBase + h, z, idArco);
    F(x1 + 1, yBase + h + 1, z, x2 - 1, yBase + h + 1, z, idArco);
  };

  /** Moldura de janela (buraco + vidro + moldura) */
  const moldura = (x, y1, z, h, w, eixo, idMold, idVidro) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dw = 0; dw < w; dw++) {
        const vid = dy > 0 && dy < h - 1 && dw > 0 && dw < w - 1 ? idVidro : idMold;
        if (eixo === "x") S(x, y1 + dy, z + dw, vid);
        else S(x + dw, y1 + dy, z, vid);
      }
    }
  };

  /** Mosaico no chão: padrão xadrez */
  const mosaico = (x1, z1, x2, z2, y, id1, id2) => {
    for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) S(x, y, z, (x + z) % 2 === 0 ? id1 : id2);
  };

  return { F, S, ar, arte, pendente, gaiola, posteSoul, pilar, arcada, moldura, mosaico };
}

// ══════════════════════════════════════════════════ gerador principal

/** Nomes das fases da obra, na ordem. A construção é retomável: quem terminou uma fase não a refaz. */
export const FASES_MAPA = ["Limpando e base", "O Limiar", "Portão", "A Vila Silenciosa", "Passagem", "O Arquivo das Almas", "Corredor final", "O Último Testemunho"];

/** Onde a pessoa chega ao entrar (coordenadas relativas à origem; é o mesmo ponto "spawn" do Limiar). */
export const CHEGADA = Object.freeze({ x: 12, y: 1, z: 32 });

/**
 * @param {Pincel} p
 * @param {(f: number, txt: string) => void} progresso
 * @param {number} [desde]  primeira fase a fazer (as anteriores já estão prontas)
 * @param {(fase: number) => void} [fasePronta]  chamado ao terminar cada fase
 */
export function* construir(p, progresso, desde = 0, fasePronta = () => {}) {
  const h = helpers(p);
  const { F } = h;
  /** @type {[number, () => Generator<any, void, any>][]} fração do progresso ao começar a fase, gerador */
  const fases = [
    [0, function* () {
      for (let y = CAIXA.y2; y >= CAIXA.y1; y -= 4) {
        F(CAIXA.x1, Math.max(y - 3, CAIXA.y1), CAIXA.z1, CAIXA.x2, y, CAIXA.z2, M.ar);
        yield;
      }
      F(CAIXA.x1, CAIXA.y1, CAIXA.z1, CAIXA.x2, CAIXA.y1, CAIXA.z2, M.bedrock);
      F(CAIXA.x1, CAIXA.y1 + 1, CAIXA.z1, CAIXA.x2, -2, CAIXA.z2, M.barrier);
      yield;
    }],
    [0.05, () => limiar(h)],
    [0.22, () => portao(h)],
    [0.25, () => vila(h)],
    [0.55, () => passagem(h)],
    [0.58, () => arquivo(h)],
    [0.80, () => corredorFinal(h)],
    [0.83, () => arena(h)],
  ];
  for (let i = Math.max(0, desde); i < fases.length; i++) {
    progresso(fases[i][0], FASES_MAPA[i]);
    yield* fases[i][1]();
    fasePronta(i + 1);
  }
  progresso(1, "Concluído");
}

// ════════════════════════════════════════════════════════════════════════════
//  I — O LIMIAR  (0..65, 0..65)
//  Cemitério sombrio com mausoléu, capela arruinada, árvores chorosas,
//  lápides, grades de ferro, roseiras murchas e caminho serpenteante.
// ════════════════════════════════════════════════════════════════════════════

function* limiar(h) {
  const { F, S, ar, arte, pendente, posteSoul, pilar, mosaico, moldura } = h;

  // ── terreno base: grama com variação ──
  F(0, -1, 0, 65, -1, 65, M.terra);
  F(0, 0, 0, 65, 0, 65, M.grama);
  yield;

  // Manchas orgânicas de podzol, mycelium, soul soil, moss
  const manchas = [
    [3, 5, 10, 12, M.podzol], [18, 2, 25, 8, M.podzol], [40, 45, 50, 55, M.mycelium],
    [8, 28, 15, 35, M.soulSoil], [50, 10, 58, 18, M.soulSoil], [25, 50, 32, 58, M.mycelium],
    [35, 25, 42, 32, M.moss], [55, 40, 62, 48, M.podzol], [10, 50, 18, 58, M.soulSoil],
  ];
  for (const [x1, z1, x2, z2, id] of manchas) F(x1, 0, z1, x2, 0, z2, id);

  // Bordas elevadas (micro-colinas de 1 bloco)
  for (const [x1, z1, x2, z2] of [[2, 2, 8, 6], [52, 50, 60, 56], [45, 3, 52, 8]]) {
    F(x1, 1, z1, x2, 1, z2, M.terra);
    F(x1 + 1, 1, z1 + 1, x2 - 1, 1, z2 - 1, M.grama);
  }
  yield;

  // ── muralha perimetral arruinada ──
  // Norte (z=0): muro descontínuo de heights variáveis
  for (let x = 0; x <= 65; x++) {
    const seed = x * 31 + 7;
    const alt = 2 + seed % 5;
    if (seed % 4 === 0) continue; // lacuna
    const id = seed % 3 === 0 ? M.cobble : seed % 3 === 1 ? M.mossySB : M.crackedSB;
    for (let y = 1; y <= alt; y++) S(x, y, 0, id);
    if (seed % 5 === 0) S(x, alt + 1, 0, M.mossCarpet);
  }
  // Oeste (x=0)
  for (let z = 0; z <= 65; z++) {
    const seed = z * 23 + 11;
    const alt = 2 + seed % 4;
    if (seed % 5 === 0) continue;
    const id = seed % 2 === 0 ? M.stoneBrick : M.mossySB;
    for (let y = 1; y <= alt; y++) S(0, y, z, id);
  }
  // Sul (z=65) — parcial
  for (let x = 0; x <= 40; x++) {
    const seed = x * 17 + 3;
    if (seed % 3 === 0) continue;
    for (let y = 1; y <= 2 + seed % 3; y++) S(x, y, 65, M.cobble);
  }
  yield;

  // ── grades de ferro nos segmentos de muro ──
  for (let x = 12; x <= 20; x++) { S(x, 1, 0, M.stoneBrick); S(x, 2, 0, M.ironBars); S(x, 3, 0, M.ironBars); }
  for (let z = 10; z <= 18; z++) { S(0, 1, z, M.stoneBrick); S(0, 2, z, M.ironBars); S(0, 3, z, M.ironBars); }
  yield;

  // ── caminho serpenteante (cascalho + borda de cobblestone) ──
  for (let x = 5; x <= 63; x++) {
    const zc = 32 + Math.floor(Math.sin(x * 0.15) * 4 + Math.cos(x * 0.08) * 2);
    F(x, 0, zc - 1, x, 0, zc + 1, M.pathDirt);
    S(x, 0, zc, M.gravel);
    // Bordas de cobble
    if (x % 2 === 0) { S(x, 0, zc - 2, M.cobbleNorm); S(x, 0, zc + 2, M.cobbleNorm); }
    // Postes a cada 8 blocos
    if (x % 12 === 4) posteSoul(x, zc - 3, 3);
  }
  yield;

  // ── túmulos (4 grupos, cada um com 4-5 lápides e cercas) ──
  const gruposTumulo = [
    { cx: 10, cz: 12, n: 5 }, { cx: 25, cz: 8,  n: 4 },
    { cx: 14, cz: 45, n: 5 }, { cx: 42, cz: 15, n: 4 },
  ];
  for (const g of gruposTumulo) {
    // Cerca de iron bars ao redor do grupo
    const r = 5;
    for (let dx = -r; dx <= r; dx++) {
      S(g.cx + dx, 1, g.cz - r, M.ironBars);
      S(g.cx + dx, 1, g.cz + r, M.ironBars);
    }
    for (let dz = -r + 1; dz < r; dz++) {
      S(g.cx - r, 1, g.cz + dz, M.ironBars);
      S(g.cx + r, 1, g.cz + dz, M.ironBars);
    }
    // Entrada (abertura na cerca)
    S(g.cx, 1, g.cz + r, M.ar);
    S(g.cx + 1, 1, g.cz + r, M.ar);

    // Lápides individuais dentro
    for (let i = 0; i < g.n; i++) {
      const lx = g.cx - 3 + (i % 3) * 3;
      const lz = g.cz - 2 + Math.floor(i / 3) * 3;
      // Tipos variados de lápide
      if (i % 3 === 0) {
        // Cruz
        S(lx, 1, lz, M.stoneBrick); S(lx, 2, lz, M.stoneBrick);
        S(lx, 3, lz, M.chiseledSB); S(lx - 1, 2, lz, M.sbSlab); S(lx + 1, 2, lz, M.sbSlab);
      } else if (i % 3 === 1) {
        // Obelisco
        S(lx, 1, lz, M.andesiteSmooth); S(lx, 2, lz, M.andesiteSmooth); S(lx, 3, lz, M.andesiteSmooth);
        S(lx, 4, lz, M.sbSlab);
      } else {
        // Laje simples
        S(lx, 1, lz, M.stoneBrick); S(lx, 2, lz, M.sbSlab);
      }
      // Vela ou wither rose ao lado
      if (i % 2 === 0) S(lx + 1, 1, lz, M.witherRose);
      else S(lx - 1, 1, lz, M.candle);
    }
    F(g.cx - 3, 0, g.cz - 3, g.cx + 3, 0, g.cz + 3, M.soulSoil);
    yield;
  }

  // ── árvores chorosas (troncos altos com vines pendendo) ──
  const arvores = [
    [8, 8, 8], [22, 5, 9], [48, 50, 7], [35, 35, 6],
    [55, 12, 8], [12, 55, 7], [40, 42, 6], [58, 58, 5],
  ];
  for (const [x, z, alt] of arvores) {
    for (let y = 1; y <= alt; y++) S(x, y, z, M.darkOakLog);
    // Copa morta: galhos em cruz no topo
    for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]]) {
      S(x + dx, alt, z + dz, M.darkOakLog);
      if (Math.abs(dx) + Math.abs(dz) <= 2) S(x + dx, alt + 1, z + dz, M.darkOakLog);
    }
    // Vines pendendo dos galhos
    for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      for (let vy = alt - 1; vy >= alt - 3; vy--) S(x + dx, vy, z + dz, M.vine);
    }
    // Raízes expostas
    S(x - 1, 1, z, M.mangroveLog); S(x, 1, z + 1, M.mangroveLog);
  }
  yield;

  // ── mausoléu (estrutura grande, sudoeste 30..45 x 48..62) ──
  const mx1 = 30, mz1 = 48, mx2 = 45, mz2 = 62;
  // Plataforma elevada
  F(mx1 - 1, 0, mz1 - 1, mx2 + 1, 0, mz2 + 1, M.stoneBrick);
  F(mx1 - 1, 1, mz1 - 1, mx2 + 1, 1, mz2 + 1, M.andesiteSmooth);
  // Paredes (tuff bricks)
  F(mx1, 2, mz1, mx2, 8, mz1, M.tuffBricks);
  F(mx1, 2, mz2, mx2, 8, mz2, M.tuffBricks);
  F(mx1, 2, mz1, mx1, 8, mz2, M.tuffBricks);
  F(mx2, 2, mz1, mx2, 8, mz2, M.tuffBricks);
  ar(mx1 + 1, 2, mz1 + 1, mx2 - 1, 7, mz2 - 1);
  // Piso mosaico
  mosaico(mx1 + 1, mz1 + 1, mx2 - 1, mz2 - 1, 1, M.dsTiles, M.dsPolished);
  yield;

  // Pilares internos
  for (const [px, pz] of [[mx1 + 2, mz1 + 2], [mx2 - 2, mz1 + 2], [mx1 + 2, mz2 - 2], [mx2 - 2, mz2 - 2]]) {
    pilar(px, pz, 2, 7, M.tuff);
    S(px, 8, pz, M.tuffBricks); // capitel
  }
  // Teto com padrão
  mosaico(mx1, mz1, mx2, mz2, 8, M.tuffBricks, M.tuff);
  F(mx1 + 3, 9, mz1 + 3, mx2 - 3, 9, mz2 - 3, M.tuffBricks);
  F(mx1 + 4, 10, mz1 + 4, mx2 - 4, 10, mz2 - 4, M.tuffBricks);
  // Cúpula central
  S(37, 11, 55, M.tuffBricks); S(38, 11, 55, M.tuffBricks);
  S(37, 11, 56, M.tuffBricks); S(38, 11, 56, M.tuffBricks);
  yield;

  // Entrada do mausoléu (porta dupla ao norte)
  ar(36, 2, mz1, 39, 5, mz1);
  // Colunas da porta
  pilar(35, mz1, 2, 6, M.calcite);
  pilar(40, mz1, 2, 6, M.calcite);
  S(35, 7, mz1, M.tuffSlab);
  S(40, 7, mz1, M.tuffSlab);
  // Arco sobre a porta
  F(35, 6, mz1, 40, 6, mz1, M.chiseledSB);
  // Janelas nas laterais
  moldura(mx1, 3, mz1 + 4, 4, 3, "z", M.tuffBricks, M.vidroGray);
  moldura(mx2, 3, mz1 + 4, 4, 3, "z", M.tuffBricks, M.vidroGray);
  moldura(mx1, 3, mz2 - 6, 4, 3, "z", M.tuffBricks, M.vidroGray);
  moldura(mx2, 3, mz2 - 6, 4, 3, "z", M.tuffBricks, M.vidroGray);

  // Interior: sarcófago central
  F(36, 2, 54, 39, 2, 57, M.dsPolished);
  F(37, 3, 55, 38, 3, 56, M.dsTiles);
  S(37, 4, 55, M.candle); S(38, 4, 56, M.candle);
  // Velas nos cantos
  S(mx1 + 1, 2, mz1 + 1, M.candle); S(mx2 - 1, 2, mz1 + 1, M.candle);
  S(mx1 + 1, 2, mz2 - 1, M.candle); S(mx2 - 1, 2, mz2 - 1, M.candle);
  // Correntes com lanternas
  pendente(34, 7, 53, 2); pendente(41, 7, 53, 2);
  pendente(34, 7, 58, 2); pendente(41, 7, 58, 2);
  pendente(37, 8, 55, 3); // central
  yield;

  // ── capela arruinada (nordeste, 48..62 x 4..18) ──
  const cx1 = 48, cz1 = 4, cx2 = 62, cz2 = 18;
  F(cx1, 0, cz1, cx2, 0, cz2, M.cobbleNorm);
  // Paredes (incompletas — arruinadas)
  F(cx1, 1, cz1, cx2, 7, cz1, M.stoneBrick);
  F(cx1, 1, cz2, cx2, 5, cz2, M.mossySB);
  F(cx1, 1, cz1, cx1, 6, cz2, M.stoneBrick);
  F(cx2, 1, cz1, cx2, 4, cz2, M.crackedSB); // parede mais destruída
  ar(cx1 + 1, 1, cz1 + 1, cx2 - 1, 6, cz2 - 1);
  // Teto aberto (arruinado — só metade)
  F(cx1, 7, cz1, cx1 + 6, 7, cz2, M.spruceSlab);
  // Piso
  mosaico(cx1 + 1, cz1 + 1, cx2 - 1, cz2 - 1, 0, M.stoneBrick, M.cobbleNorm);
  yield;

  // Interior da capela
  // Altar no fundo
  F(cx1 + 2, 1, cz1 + 1, cx1 + 4, 1, cz1 + 2, M.andesiteSmooth);
  S(cx1 + 3, 2, cz1 + 1, M.soulLantern);
  // Bancos (escadas)
  for (let row = 0; row < 3; row++) {
    S(cx1 + 2, 1, cz1 + 5 + row * 2, M.sbStairs, { "weirdo_direction": 2 });
    S(cx1 + 3, 1, cz1 + 5 + row * 2, M.sbStairs, { "weirdo_direction": 2 });
    S(cx1 + 5, 1, cz1 + 5 + row * 2, M.sbStairs, { "weirdo_direction": 2 });
    S(cx1 + 6, 1, cz1 + 5 + row * 2, M.sbStairs, { "weirdo_direction": 2 });
  }
  // Rosácea (pixel art na parede norte)
  arte([
    "...#...",
    "..###..",
    ".#.#.#.",
    "###.###",
    ".#.#.#.",
    "..###..",
    "...#...",
  ], { "#": M.vidroGray }, cx1 + 4, 1, cz1, "z");
  // Cobwebs (teto destruído)
  S(cx2 - 2, 5, cz1 + 3, M.cobweb);
  S(cx2 - 3, 4, cz2 - 2, M.cobweb);
  S(cx1 + 5, 6, cz1 + 2, M.cobweb);
  // Porta (sul)
  ar(cx1 + 5, 1, cz2, cx1 + 7, 3, cz2);
  yield;

  // ── decoração final do limiar ──
  // Wither roses espalhadas
  const rosas = [[6, 15], [20, 40], [35, 10], [50, 30], [15, 60], [55, 55], [28, 22], [45, 60]];
  for (const [x, z] of rosas) S(x, 1, z, M.witherRose);

  // Dead bushes
  const bushes = [[4, 25], [18, 18], [32, 8], [50, 42], [60, 20], [22, 58], [40, 28], [8, 50]];
  for (const [x, z] of bushes) S(x, 1, z, M.deadBush);

  // Moss carpet em cima de muros/ruínas
  S(5, 4, 0, M.mossCarpet); S(15, 3, 0, M.mossCarpet); S(30, 5, 0, M.mossCarpet);

  PONTOS.push({ x: 12, y: 1, z: 32, t: "spawn" });
  PONTOS.push({ x: 37, y: 2, z: 55, t: "npc_eco", dados: { id: "eco_mausoleu" } });
  PONTOS.push({ x: 55, y: 1, z: 11, t: "npc_eco", dados: { id: "eco_capela" } });
  yield;
}

// ════════════════════════════════════════════════════════════════════════════
//  Portão de transição (62..72, 26..40)
// ════════════════════════════════════════════════════════════════════════════

function* portao(h) {
  const { F, S, ar, pilar, pendente } = h;
  // Caminho
  F(62, 0, 28, 72, 0, 38, M.pathDirt);
  F(63, 0, 30, 71, 0, 36, M.gravel);
  F(62, -1, 28, 72, -1, 38, M.cobbleNorm);

  // Pilares do portão (duplos, mais imponentes)
  for (const z of [28, 38]) {
    pilar(64, z, 1, 9, M.stoneBrick);
    pilar(65, z, 1, 9, M.tuffBricks);
    pilar(68, z, 1, 9, M.tuffBricks);
    pilar(69, z, 1, 9, M.stoneBrick);
    S(64, 10, z, M.chiseledSB); S(65, 10, z, M.tuffSlab);
    S(68, 10, z, M.tuffSlab); S(69, 10, z, M.chiseledSB);
  }

  // Arco principal
  F(64, 9, 28, 69, 9, 38, M.tuffBricks);
  F(65, 10, 30, 68, 10, 36, M.stoneBrick);
  F(66, 11, 31, 67, 11, 35, M.chiseledSB);
  ar(65, 1, 29, 68, 8, 37); // passagem aberta

  // Correntes com lanternas no interior do arco
  pendente(66, 9, 31, 3);
  pendente(67, 9, 35, 3);

  // Lado destruído (pedras caídas)
  ar(69, 6, 36, 69, 9, 38);
  S(69, 5, 37, M.crackedSB);
  S(70, 1, 37, M.cobble); S(70, 1, 38, M.cobble); // entulho
  S(71, 1, 38, M.mossySB);

  // Detalhes: vines e moss
  S(64, 7, 29, M.vine); S(69, 4, 37, M.vine);
  S(65, 9, 29, M.mossCarpet);
  yield;
}

// ════════════════════════════════════════════════════════════════════════════
//  II — A VILA SILENCIOSA  (70..165, 0..75)
//  Vila abandonada com rua principal, casas detalhadas, praça com fonte,
//  igreja com torre sineira, taverna, mercado, biblioteca.
// ════════════════════════════════════════════════════════════════════════════

/** Casa detalhada. @returns {Generator} */
function* casaDetalhada(h, x1, z1, lx, lz, altura, tipo) {
  const { F, S, ar, mosaico, pendente } = h;
  const x2 = x1 + lx - 1, z2 = z1 + lz - 1;

  // Fundação
  F(x1 - 1, -1, z1 - 1, x2 + 1, 0, z2 + 1, M.cobbleNorm);

  // Paredes externas (spruce com molduras de dark oak)
  F(x1, 1, z1, x2, altura, z1, M.sprucePlanks);
  F(x1, 1, z2, x2, altura, z2, M.sprucePlanks);
  F(x1, 1, z1, x1, altura, z2, M.sprucePlanks);
  F(x2, 1, z1, x2, altura, z2, M.sprucePlanks);
  ar(x1 + 1, 1, z1 + 1, x2 - 1, altura, z2 - 1);

  // Pilares de canto (dark oak)
  for (const [px, pz] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]])
    for (let y = 1; y <= altura; y++) S(px, y, pz, M.darkOakLog);

  // Moldura horizontal (faixa de dark oak no meio da parede)
  const faixa = Math.ceil(altura / 2);
  F(x1, faixa, z1, x2, faixa, z1, M.darkOakStrip);
  F(x1, faixa, z2, x2, faixa, z2, M.darkOakStrip);
  F(x1, faixa, z1, x1, faixa, z2, M.darkOakStrip);
  F(x2, faixa, z1, x2, faixa, z2, M.darkOakStrip);

  // Piso interior
  mosaico(x1 + 1, z1 + 1, x2 - 1, z2 - 1, 0, M.sprucePlanks, M.darkOakPlanks);

  // Janelas (trapdoors como persianas + vidro)
  if (lx > 5) {
    for (const jx of [x1 + Math.floor(lx / 3), x1 + Math.floor(lx * 2 / 3)]) {
      S(jx, 2, z1, M.vidroP); S(jx, 3, z1, M.vidroP);
      S(jx, 2, z2, M.vidroP); S(jx, 3, z2, M.vidroP);
      S(jx, 4, z1, M.spruceTrapdoor); S(jx, 4, z2, M.spruceTrapdoor);
    }
  }
  if (lz > 5) {
    const jz = z1 + Math.floor(lz / 2);
    S(x1, 2, jz, M.vidroP); S(x1, 3, jz, M.vidroP);
    S(x2, 2, jz, M.vidroP); S(x2, 3, jz, M.vidroP);
  }

  // Porta (sul)
  const px = x1 + Math.floor(lx / 2);
  ar(px, 1, z2, px, 3, z2);
  S(px, 1, z2 + 1, M.spruceSlab); // degrau

  // Telhado inclinado (dark oak stairs/slabs)
  for (let i = 0; i <= Math.floor(lz / 2); i++) {
    const y = altura + 1 + i;
    S(x1 - 1, y, z1 + i, M.darkOakStairs, { "weirdo_direction": 2 });
    F(x1, y, z1 + i, x2, y, z1 + i, M.darkOakSlab);
    S(x2 + 1, y, z1 + i, M.darkOakStairs, { "weirdo_direction": 2 });
    if (z2 - i > z1 + i) {
      S(x1 - 1, y, z2 - i, M.darkOakStairs, { "weirdo_direction": 3 });
      F(x1, y, z2 - i, x2, y, z2 - i, M.darkOakSlab);
      S(x2 + 1, y, z2 - i, M.darkOakStairs, { "weirdo_direction": 3 });
    }
  }
  yield;

  // Interior baseado no tipo
  if (tipo === "alquimista") {
    S(x1 + 1, 1, z1 + 1, M.cauldron);
    S(x1 + 2, 1, z1 + 1, M.barrel);
    S(x2 - 1, 1, z1 + 1, M.bookshelf);
    S(x1 + 1, 1, z2 - 1, M.cobweb);
    pendente(Math.floor((x1 + x2) / 2), altura, Math.floor((z1 + z2) / 2), 1);
  } else if (tipo === "taverna") {
    // Balcão
    F(x1 + 1, 1, z1 + 2, x1 + 1, 1, z2 - 2, M.darkOakStrip);
    F(x1 + 1, 2, z1 + 2, x1 + 1, 2, z2 - 2, M.spruceSlab);
    // Barris atrás do balcão
    S(x1 + 1, 1, z1 + 1, M.barrel); S(x1 + 1, 2, z1 + 1, M.barrel);
    // Mesas
    S(x2 - 2, 1, z1 + 2, M.spruceFence); S(x2 - 2, 2, z1 + 2, M.spruceSlab);
    S(x2 - 2, 1, z2 - 2, M.spruceFence); S(x2 - 2, 2, z2 - 2, M.spruceSlab);
    // Velas nas mesas
    S(x2 - 2, 3, z1 + 2, M.candle); S(x2 - 2, 3, z2 - 2, M.candle);
    pendente(Math.floor((x1 + x2) / 2), altura, Math.floor((z1 + z2) / 2), 1);
  } else if (tipo === "ferreiro") {
    S(x1 + 1, 1, z1 + 1, M.cobbleNorm); S(x1 + 1, 2, z1 + 1, M.cobbleNorm);
    S(x1 + 2, 1, z1 + 1, M.cauldron);
    S(x2 - 1, 1, z2 - 1, M.barrel);
    S(x2 - 1, 1, z1 + 1, M.darkOakFence); S(x2 - 1, 2, z1 + 1, M.lantern);
  } else {
    // Casa genérica
    S(x1 + 1, 1, z1 + 1, M.bookshelf);
    S(x2 - 1, 1, z2 - 1, M.cobweb);
    S(x1 + 1, 1, z2 - 1, M.darkOakFence); S(x1 + 1, 2, z2 - 1, M.candle);
  }
  yield;
}

function* vila(h) {
  const { F, S, ar, pilar, pendente, posteSoul, mosaico, gaiola, arte } = h;

  // Terreno
  F(70, -1, 0, 165, -1, 75, M.terra);
  F(70, 0, 0, 165, 0, 75, M.grama);
  yield;

  // ── Rua principal ──
  for (let x = 70; x <= 165; x++) {
    const zc = 36 + Math.floor(Math.sin(x * 0.05) * 2);
    F(x, 0, zc - 3, x, 0, zc + 3, M.cobbleNorm);
    // Detalhes: lajes e gravel para variar a textura
    if (x % 3 === 0) S(x, 0, zc, M.gravel);
    if (x % 5 === 0) { S(x, 0, zc - 2, M.andesiteSmooth); S(x, 0, zc + 2, M.andesiteSmooth); }
    // Borda de cobble
    S(x, 0, zc - 4, M.cobbSlab); S(x, 0, zc + 4, M.cobbSlab);
  }
  // Postes de luz ao longo da rua
  for (let x = 75; x <= 160; x += 8) { posteSoul(x, 31); posteSoul(x, 43); }
  yield;

  // ── Casas ──
  yield* casaDetalhada(h, 78,  6,  9, 9,  5, "alquimista");
  yield* casaDetalhada(h, 93,  4, 11, 11, 6, "ferreiro");
  yield* casaDetalhada(h, 110, 5, 10, 10, 5, "");
  yield* casaDetalhada(h, 78, 50, 10, 10, 5, "");
  yield* casaDetalhada(h, 95, 48, 12, 12, 6, "taverna");
  yield* casaDetalhada(h, 115, 50, 10, 10, 5, "alquimista");
  yield;

  // ── Praça central (125..145, 28..48) ──
  F(125, 0, 28, 145, 0, 48, M.andesiteSmooth);
  // Borda decorativa
  for (let x = 125; x <= 145; x++) { S(x, 0, 28, M.stoneBrick); S(x, 0, 48, M.stoneBrick); }
  for (let z = 28; z <= 48; z++) { S(125, 0, z, M.stoneBrick); S(145, 0, z, M.stoneBrick); }
  // Piso em mosaico
  mosaico(126, 29, 144, 47, 0, M.andesiteSmooth, M.cobbleNorm);
  yield;

  // Fonte central (seca, com detalhes)
  const fx = 135, fz = 38;
  // Base octogonal (aproximada com quadrado + cantos cortados)
  F(fx - 3, 1, fz - 3, fx + 3, 1, fz + 3, M.tuffBricks);
  F(fx - 2, 1, fz - 2, fx + 2, 1, fz + 2, M.ar);
  F(fx - 2, 0, fz - 2, fx + 2, 0, fz + 2, M.dsTiles); // fundo seco
  // Pilar central
  pilar(fx, 1, fz, 1, 4, M.calcite);
  S(fx, 5, fz, M.soulLantern);
  // Bicos decorativos (fence posts)
  S(fx - 1, 3, fz, M.darkOakFence); S(fx + 1, 3, fz, M.darkOakFence);
  S(fx, 3, fz - 1, M.darkOakFence); S(fx, 3, fz + 1, M.darkOakFence);
  // Wither roses na fonte seca
  S(fx - 1, 1, fz - 1, M.witherRose); S(fx + 1, 1, fz + 1, M.witherRose);
  yield;

  // ── Igreja/capela com torre (130..152, 2..22) ──
  const ix1 = 130, iz1 = 2, ix2 = 152, iz2 = 22;
  // Fundação
  F(ix1 - 1, -1, iz1 - 1, ix2 + 1, 0, iz2 + 1, M.cobbleNorm);
  F(ix1, 0, iz1, ix2, 0, iz2, M.stoneBrick);
  // Paredes (stone bricks com detalhes)
  F(ix1, 1, iz1, ix2, 9, iz1, M.stoneBrick);
  F(ix1, 1, iz2, ix2, 9, iz2, M.stoneBrick);
  F(ix1, 1, iz1, ix1, 9, iz2, M.stoneBrick);
  F(ix2, 1, iz1, ix2, 9, iz2, M.stoneBrick);
  ar(ix1 + 1, 1, iz1 + 1, ix2 - 1, 8, iz2 - 1);
  // Piso mosaico
  mosaico(ix1 + 1, iz1 + 1, ix2 - 1, iz2 - 1, 0, M.stoneBrick, M.andesiteSmooth);
  yield;

  // Pilares internos (nave)
  for (let px = ix1 + 3; px <= ix2 - 3; px += 4) {
    pilar(px, iz1 + 3, 1, 8, M.chiseledSB);
    pilar(px, iz2 - 3, 1, 8, M.chiseledSB);
  }
  // Teto abobadado (arcos transversais)
  for (let px = ix1 + 1; px <= ix2 - 1; px += 4) {
    F(px, 9, iz1 + 3, px, 9, iz2 - 3, M.stoneBrick);
    S(px, 10, Math.floor((iz1 + iz2) / 2), M.chiseledSB);
  }
  F(ix1, 10, iz1, ix2, 10, iz2, M.spruceSlab);
  yield;

  // Torre sineira (canto noroeste)
  F(ix1, 1, iz1, ix1 + 4, 15, iz1 + 4, M.stoneBrick);
  ar(ix1 + 1, 1, iz1 + 1, ix1 + 3, 14, iz1 + 3);
  // Aberturas da torre (janelas em arco no topo)
  for (const z of [iz1, iz1 + 4]) {
    ar(ix1 + 1, 11, z, ix1 + 3, 13, z);
    S(ix1 + 2, 14, z, M.chiseledSB);
  }
  ar(ix1, 11, iz1 + 1, ix1, 13, iz1 + 3);
  // Sino (corrente + lanterna como representação)
  S(ix1 + 2, 13, iz1 + 2, M.chain);
  S(ix1 + 2, 12, iz1 + 2, M.lantern);
  // Coruchéu
  F(ix1, 15, iz1, ix1 + 4, 15, iz1 + 4, M.spruceSlab);
  F(ix1 + 1, 16, iz1 + 1, ix1 + 3, 16, iz1 + 3, M.spruceSlab);
  S(ix1 + 2, 17, iz1 + 2, M.spruceFence);
  S(ix1 + 2, 18, iz1 + 2, M.soulLantern);
  yield;

  // Rosácea na fachada sul
  arte([
    "....###....",
    "...#####...",
    "..##.#.##..",
    ".##..#..##.",
    "###.###.###",
    ".##..#..##.",
    "..##.#.##..",
    "...#####...",
    "....###....",
  ], { "#": M.vidroGray }, ix1 + 6, 2, iz2, "z");

  // Altar no fundo (norte)
  F(ix1 + 8, 1, iz1 + 1, ix1 + 12, 1, iz1 + 2, M.andesiteSmooth);
  S(ix1 + 10, 2, iz1 + 1, M.soulLantern);
  S(ix1 + 9, 2, iz1 + 1, M.candle); S(ix1 + 11, 2, iz1 + 1, M.candle);
  // Bancos
  for (let row = 0; row < 4; row++) {
    for (let bx = ix1 + 3; bx <= ix2 - 3; bx += 5) {
      S(bx, 1, iz1 + 6 + row * 3, M.sbStairs, { "weirdo_direction": 2 });
      S(bx + 1, 1, iz1 + 6 + row * 3, M.sbStairs, { "weirdo_direction": 2 });
    }
  }
  // Entrada
  ar(ix1 + 9, 1, iz2, ix1 + 11, 4, iz2);
  // Luz
  pendente(ix1 + 7, 9, iz1 + 8, 3);
  pendente(ix1 + 13, 9, iz1 + 8, 3);
  pendente(ix1 + 10, 9, iz1 + 14, 3);

  PONTOS.push({ x: ix1 + 10, y: 1, z: iz1 + 8, t: "npc_eco", dados: { id: "eco_igreja" } });
  yield;

  // ── Biblioteca (148..164, 50..70) ──
  F(148, -1, 50, 164, -1, 70, M.cobbleNorm);
  F(148, 0, 50, 164, 0, 70, M.stoneBrick);
  F(148, 1, 50, 164, 8, 50, M.tuffBricks);
  F(148, 1, 70, 164, 8, 70, M.tuffBricks);
  F(148, 1, 50, 148, 8, 70, M.tuffBricks);
  F(164, 1, 50, 164, 8, 70, M.tuffBricks);
  ar(149, 1, 51, 163, 7, 69);
  F(148, 9, 50, 164, 9, 70, M.spruceSlab);
  // Interior: corredores de estantes
  for (let x = 150; x <= 162; x += 3) {
    F(x, 1, 52, x, 4, 60, M.bookshelf);
    if (x % 6 === 0) F(x, 1, 62, x, 4, 68, M.chiseledBookshelf);
    else F(x, 1, 62, x, 4, 68, M.bookshelf);
  }
  // Área de leitura
  S(155, 1, 65, M.spruceFence); S(155, 2, 65, M.spruceSlab);
  S(155, 3, 65, M.candle);
  S(158, 1, 65, M.lectern);
  // Iluminação
  pendente(153, 7, 56, 2); pendente(159, 7, 56, 2);
  pendente(156, 7, 66, 2);
  // Entrada
  ar(155, 1, 50, 157, 4, 50);
  // Janelas
  for (const jz of [54, 60, 66]) {
    S(148, 3, jz, M.vidroP); S(148, 4, jz, M.vidroP);
    S(164, 3, jz, M.vidroP); S(164, 4, jz, M.vidroP);
  }

  PONTOS.push({ x: 156, y: 1, z: 60, t: "npc_eco", dados: { id: "eco_biblio" } });
  yield;

  // ── Mercado abandonado (praça, 126..134 x 28..35) ──
  // Barracas de madeira
  for (let bx = 126; bx <= 132; bx += 4) {
    S(bx, 1, 30, M.spruceFence); S(bx + 2, 1, 30, M.spruceFence);
    S(bx, 2, 30, M.spruceFence); S(bx + 2, 2, 30, M.spruceFence);
    F(bx, 3, 29, bx + 2, 3, 31, M.spruceSlab);
    S(bx + 1, 1, 30, M.barrel);
  }

  // Teias, pó, decoração de abandono
  S(128, 1, 45, M.cobweb); S(140, 2, 35, M.cobweb);
  S(133, 1, 42, M.deadBush); S(142, 1, 32, M.deadBush);
  yield;
}

// ════════════════════════════════════════════════════════════════════════════
//  Passagem subterrânea (162..172, 30..46)
// ════════════════════════════════════════════════════════════════════════════

function* passagem(h) {
  const { F, S, ar, pilar, pendente, mosaico } = h;

  F(162, -5, 30, 172, 6, 46, M.dsBricks);
  ar(163, -3, 31, 171, 5, 45);
  yield;

  // Degraus descendo
  for (let i = 0; i < 6; i++) {
    const x = 163 + i;
    F(x, -i, 31, x, -i, 45, M.dsTiles);
    ar(x, -i + 1, 31, x, 5 - i, 45);
  }
  // Piso final
  F(169, -5, 31, 171, -5, 45, M.dsTiles);

  // Tochas soul nas paredes
  for (let x = 163; x <= 171; x += 2) {
    S(x, Math.max(-Math.floor((x - 163) / 1.2) + 3, -2), 31, M.soulTorch);
    S(x, Math.max(-Math.floor((x - 163) / 1.2) + 3, -2), 45, M.soulTorch);
  }

  // Arco de entrada (deepslate chiseled)
  S(163, 5, 31, M.dsChiseled); S(163, 5, 45, M.dsChiseled);
  S(163, 4, 31, M.dsChiseled); S(163, 4, 45, M.dsChiseled);
  F(163, 6, 31, 163, 6, 45, M.dsBricks);

  // Correntes com lanternas
  pendente(165, 4, 38, 2);
  pendente(169, 1, 38, 2);
  yield;
}

// ════════════════════════════════════════════════════════════════════════════
//  III — O ARQUIVO DAS ALMAS (170..240, 0..65)
//  Subterrâneo profundo, corredores com arcadas, câmaras de cristal,
//  sculk, piso em mosaico, abóbadas com nervuras.
// ════════════════════════════════════════════════════════════════════════════

function* arquivo(h) {
  const { F, S, ar, pilar, pendente, gaiola, mosaico, arcada } = h;
  const Y = -5;

  // Massa sólida
  F(170, Y - 2, 0, 240, Y + 12, 65, M.dsBricks);
  yield;

  // ── Hall de entrada (172..185, 25..40) ──
  ar(172, Y, 27, 185, Y + 8, 40);
  F(172, Y - 1, 27, 185, Y - 1, 40, M.dsTiles);
  // Piso em mosaico
  mosaico(173, 28, 184, 39, Y - 1, M.dsTiles, M.dsPolished);
  // Pilares nas laterais
  for (const x of [174, 179, 184]) {
    pilar(x, 27, Y, Y + 8, M.dsChiseled);
    pilar(x, 40, Y, Y + 8, M.dsChiseled);
  }
  // Abóbada (nervuras no teto)
  for (const z of [29, 34, 38]) F(172, Y + 8, z, 185, Y + 8, z, M.dsPolished);
  for (const x of [175, 180]) F(x, Y + 8, 27, x, Y + 8, 40, M.dsPolished);
  // Iluminação
  pendente(176, Y + 8, 32, 3); pendente(182, Y + 8, 36, 3);
  gaiola(178, Y + 6, 33);
  yield;

  // ── Corredor principal (185..235, 28..38) ──
  ar(185, Y, 28, 235, Y + 7, 38);
  F(185, Y - 1, 28, 235, Y - 1, 38, M.dsTiles);
  // Borda decorativa no piso
  for (let x = 185; x <= 235; x++) {
    S(x, Y - 1, 28, M.dsPolished); S(x, Y - 1, 38, M.dsPolished);
  }
  // Pilares e arcadas ao longo do corredor
  for (let x = 188; x <= 232; x += 6) {
    pilar(x, 28, Y, Y + 7, M.dsChiseled);
    pilar(x, 38, Y, Y + 7, M.dsChiseled);
    F(x, Y + 7, 28, x, Y + 7, 38, M.dsPolished); // nervura
    // Iluminação alternada
    if (x % 12 === 0) pendente(x, Y + 7, 33, 2);
    else gaiola(x, Y + 5, 33);
  }
  // Sculk vein nas paredes
  for (let x = 190; x <= 230; x += 7) {
    S(x, Y + 2, 28, M.sculkVein); S(x + 1, Y + 3, 38, M.sculkVein);
  }
  yield;

  // ── Salas norte (3 câmaras de estudo) ──
  const salasN = [
    { x1: 188, z1: 5,  x2: 205, z2: 26, nome: "Estantes" },
    { x1: 208, z1: 5,  x2: 222, z2: 26, nome: "Cristais" },
    { x1: 225, z1: 8,  x2: 235, z2: 26, nome: "Relicário" },
  ];
  for (const s of salasN) {
    ar(s.x1, Y, s.z1, s.x2, Y + 7, s.z2);
    F(s.x1, Y - 1, s.z1, s.x2, Y - 1, s.z2, M.dsTiles);
    // Porta para o corredor
    const px = Math.floor((s.x1 + s.x2) / 2);
    ar(px - 1, Y, s.z2, px + 1, Y + 4, s.z2 + 1);
    // Arco da porta
    S(px - 2, Y + 4, s.z2, M.dsChiseled); S(px + 2, Y + 4, s.z2, M.dsChiseled);
    F(px - 1, Y + 5, s.z2, px + 1, Y + 5, s.z2, M.dsSlab);
    yield;
  }
  // Sala 1: estantes em fileiras
  for (let x = 190; x <= 203; x += 3) {
    F(x, Y, 7, x, Y + 3, 18, M.bookshelf);
    S(x, Y + 4, 12, M.soulLantern);
  }
  // Sala 2: formações de amethyst
  F(210, Y, 8, 213, Y + 4, 8, M.amethyst);
  F(217, Y, 8, 220, Y + 4, 8, M.amethyst);
  F(214, Y, 12, 216, Y + 3, 16, M.budding);
  S(215, Y, 20, M.sculk); S(216, Y, 21, M.sculk); S(214, Y, 19, M.sculk);
  S(215, Y + 4, 14, M.endRod);
  pendente(215, Y + 7, 10, 3);
  // Sala 3: relicário (baús, lecterns)
  S(227, Y, 10, M.lectern); S(230, Y, 10, M.lectern);
  S(233, Y, 10, M.barrel); S(233, Y + 1, 10, M.barrel);
  S(229, Y, 15, M.darkOakFence); S(229, Y + 1, 15, M.soulLantern);
  yield;

  // ── Salas sul (3 câmaras) ──
  const salasS = [
    { x1: 188, z1: 40, x2: 205, z2: 58, nome: "Mapas" },
    { x1: 208, z1: 40, x2: 222, z2: 58, nome: "Almas" },
    { x1: 225, z1: 40, x2: 235, z2: 56, nome: "Sarcófagos" },
  ];
  for (const s of salasS) {
    ar(s.x1, Y, s.z1, s.x2, Y + 7, s.z2);
    F(s.x1, Y - 1, s.z1, s.x2, Y - 1, s.z2, M.dsTiles);
    const px = Math.floor((s.x1 + s.x2) / 2);
    ar(px - 1, Y, s.z1 - 2, px + 1, Y + 4, s.z1);
    S(px - 2, Y + 4, s.z1, M.dsChiseled); S(px + 2, Y + 4, s.z1, M.dsChiseled);
    F(px - 1, Y + 5, s.z1, px + 1, Y + 5, s.z1, M.dsSlab);
    yield;
  }
  // Sala 4 (Mapas): mesa central, mapas nas paredes (item frames não funcionam por script, usar lecterns)
  F(193, Y, 46, 200, Y, 52, M.sprucePlanks);
  S(196, Y + 1, 49, M.lectern);
  pendente(196, Y + 7, 49, 3);
  // Sala 5 (Almas): crying obsidian + amethyst
  F(210, Y, 44, 213, Y + 3, 44, M.cryingObs);
  F(217, Y, 44, 220, Y + 3, 44, M.cryingObs);
  F(213, Y, 48, 217, Y + 2, 52, M.amethyst);
  S(215, Y, 50, M.soulFire);
  S(215, Y + 3, 50, M.endRod);
  // Sala 6 (Sarcófagos)
  for (const sz of [43, 49]) {
    F(227, Y, sz, 232, Y, sz + 2, M.dsPolished);
    F(228, Y + 1, sz, 231, Y + 1, sz + 2, M.dsTiles);
    S(229, Y + 2, sz + 1, M.candle);
  }
  yield;

  // ── Câmara das Almas (grande, 198..235, 8..58 — acessível pelo fundo do corredor) ──
  // Na verdade, vou colocar no final do corredor uma grande câmara
  // Abrir passagem do corredor pra câmara central (que fica nas salas de cristal já feitas)
  // A câmara central é a sala de Cristais + Almas combinada, já bem detalhada

  // Pontos interativos do arquivo
  PONTOS.push({ x: 178, y: Y, z: 33, t: "npc_eco", dados: { id: "eco_arquivo_entrada" } });
  PONTOS.push({ x: 215, y: Y, z: 14, t: "altar", dados: { id: "altar_cristal" } });
  PONTOS.push({ x: 215, y: Y, z: 50, t: "altar", dados: { id: "altar_almas" } });

  // Saída pro corredor final (leste)
  ar(235, Y, 30, 240, Y + 5, 36);
  yield;
}

// ════════════════════════════════════════════════════════════════════════════
//  Corredor final (238..250, 28..38)
// ════════════════════════════════════════════════════════════════════════════

function* corredorFinal(h) {
  const { F, S, ar, pilar, pendente } = h;
  const Y = -5;

  F(238, Y - 1, 28, 250, Y + 8, 38, M.bsBricks);
  ar(239, Y, 29, 249, Y + 7, 37);
  F(239, Y - 1, 29, 249, Y - 1, 37, M.bsPol);
  yield;

  // Pilares com gilded blackstone
  for (let x = 240; x <= 248; x += 4) {
    pilar(x, 29, Y, Y + 7, M.bsPol);
    pilar(x, 37, Y, Y + 7, M.bsPol);
    S(x, Y + 1, 29, M.bsGilded);
    S(x, Y + 1, 37, M.bsGilded);
  }

  // Padrão no chão
  for (let x = 239; x <= 249; x++) {
    S(x, Y - 1, 33, M.bsGilded);
    if (x % 2 === 0) { S(x, Y - 1, 30, M.blackstone); S(x, Y - 1, 36, M.blackstone); }
  }

  // Correntes com lanternas
  pendente(242, Y + 7, 33, 3);
  pendente(247, Y + 7, 33, 3);

  // Glow lichen nas paredes (atmosfera)
  S(240, Y + 3, 28, M.glowLichen); S(245, Y + 4, 38, M.glowLichen);
  yield;
}

// ════════════════════════════════════════════════════════════════════════════
//  IV — O ÚLTIMO TESTEMUNHO  (248..298, 5..60)
//  Arena circular grandiosa, pilares com correntes, teto em abóbada,
//  altar ritual, mosaico de blackstone dourado, chandeliers, end rods.
// ════════════════════════════════════════════════════════════════════════════

function* arena(h) {
  const { F, S, ar, pilar, pendente, gaiola, mosaico } = h;
  const Y = -5;
  const CX = 273, CZ = 33, R = 22;

  // Massa sólida
  F(248, Y - 2, 5, 298, Y + 20, 60, M.bsBricks);
  yield;

  // Escavar arena circular
  for (let x = CX - R - 1; x <= CX + R + 1; x++) {
    for (let z = CZ - R - 1; z <= CZ + R + 1; z++) {
      const dx = x - CX, dz = z - CZ;
      const d2 = dx * dx + dz * dz;
      if (d2 <= R * R) {
        ar(x, Y, z, x, Y + 18, z);
        // Piso com anéis concêntricos
        const dist = Math.sqrt(d2);
        let piso;
        if (dist <= 3) piso = M.bsGilded;
        else if (dist <= 5) piso = M.obsidian;
        else if (dist <= 7) piso = M.bsPol;
        else if (dist <= 9) piso = M.blackstone;
        else if (dist <= 11) piso = M.bsPol;
        else if (dist >= R - 2) piso = M.bsGilded;
        else piso = (x + z) % 2 === 0 ? M.bsPol : M.blackstone;
        S(x, Y - 1, z, piso);
      }
    }
    if (x % 4 === 0) yield;
  }

  // ── 8 pilares com detalhes ──
  const R_P = 17;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const px = CX + Math.round(Math.cos(ang) * R_P);
    const pz = CZ + Math.round(Math.sin(ang) * R_P);
    // Pilar 2x2
    for (let y = Y; y <= Y + 16; y++) {
      S(px, y, pz, M.bsPol); S(px + 1, y, pz, M.bsPol);
      S(px, y, pz + 1, M.bsPol); S(px + 1, y, pz + 1, M.bsPol);
    }
    // Base decorada
    S(px, Y, pz, M.bsGilded); S(px + 1, Y, pz + 1, M.bsGilded);
    // Capitel
    S(px - 1, Y + 15, pz, M.bsSlab); S(px + 2, Y + 15, pz, M.bsSlab);
    S(px, Y + 15, pz - 1, M.bsSlab); S(px, Y + 15, pz + 2, M.bsSlab);
    // Corrente + lanterna
    S(px, Y + 14, pz, M.chain);
    S(px, Y + 13, pz, M.soulLantern);
    S(px + 1, Y + 14, pz + 1, M.chain);
    S(px + 1, Y + 13, pz + 1, M.soulLantern);
    // End rods nos lados (luz etérea)
    S(px - 1, Y + 10, pz, M.endRod); S(px + 2, Y + 10, pz + 1, M.endRod);
  }
  yield;

  // ── Teto abobadado com nervuras ──
  for (let x = CX - R; x <= CX + R; x++) {
    for (let z = CZ - R; z <= CZ + R; z++) {
      const dx = x - CX, dz = z - CZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > R) continue;
      const yTeto = Y + 18 - Math.floor((dist / R) * 6);
      S(x, yTeto, z, M.bsBricks);
      // Nervuras (raios do centro)
      const ang = Math.atan2(dz, dx);
      const angNorm = ((ang / Math.PI * 4) + 8) % 8;
      if (Math.abs(angNorm - Math.round(angNorm)) < 0.15 && dist > 4) {
        S(x, yTeto, z, M.bsPol);
        if (dist > 3) ar(x, Y, z, x, yTeto - 1, z);
      } else if (dist < R - 1) {
        ar(x, Y, z, x, yTeto - 1, z);
      }
    }
    if (x % 3 === 0) yield;
  }

  // ── Chandeliers (4 grandes, pendurados do teto) ──
  for (const [dx, dz] of [[-8, 0], [8, 0], [0, -8], [0, 8]]) {
    const cx = CX + dx, cz = CZ + dz;
    // Estrutura: correntes longas + plataforma de iron bars + soul lanterns
    for (let i = 0; i < 5; i++) S(cx, Y + 15 - i, cz, M.chain);
    S(cx, Y + 10, cz, M.ironBars);
    for (const [ddx, ddz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      S(cx + ddx, Y + 10, cz + ddz, M.ironBars);
      S(cx + ddx, Y + 9, cz + ddz, M.soulLantern);
    }
    S(cx, Y + 9, cz, M.shroomlight);
  }
  yield;

  // ── Altar central ritual ──
  // Plataforma circular de 5 blocos de raio
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (dx * dx + dz * dz <= 9) S(CX + dx, Y, CZ + dz, M.obsidian);
  }
  // Pilar central
  S(CX, Y + 1, CZ, M.cryingObs);
  S(CX, Y + 2, CZ, M.cryingObs);
  S(CX, Y + 3, CZ, M.respawnAnchor);
  S(CX, Y + 4, CZ, M.soulLantern);
  // 4 soul fires ao redor
  for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    S(CX + dx, Y, CZ + dz, M.soulSand);
    S(CX + dx, Y + 1, CZ + dz, M.soulFire);
  }
  // End rods diagonais (luz etérea ao redor do altar)
  for (const [dx, dz] of [[-2, -2], [2, 2], [-2, 2], [2, -2]]) {
    S(CX + dx, Y + 1, CZ + dz, M.endRod);
    S(CX + dx, Y + 2, CZ + dz, M.endRod);
  }
  // Crying obsidian ao redor no chão (padrão ritual)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const rx = CX + Math.round(Math.cos(ang) * 5);
    const rz = CZ + Math.round(Math.sin(ang) * 5);
    S(rx, Y - 1, rz, M.cryingObs);
    if (i % 2 === 0) S(rx, Y, rz, M.candle);
  }
  yield;

  // ── Galeria de observação (anel elevado) ──
  for (let x = CX - R; x <= CX + R; x++) {
    for (let z = CZ - R; z <= CZ + R; z++) {
      const dx = x - CX, dz = z - CZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist >= R - 3 && dist <= R) {
        S(x, Y + 5, z, M.bsPol); // plataforma elevada
        if (dist >= R - 1) {
          S(x, Y + 6, z, M.bsWall); // mureta
        }
      }
    }
    if (x % 5 === 0) yield;
  }

  // Entrada (oeste)
  ar(248, Y, 30, 252, Y + 6, 36);
  // Arco de entrada dramático
  for (let y = Y; y <= Y + 7; y++) { S(252, y, 29, M.bsPol); S(252, y, 37, M.bsPol); }
  F(252, Y + 7, 29, 252, Y + 7, 37, M.bsGilded);
  F(252, Y + 8, 30, 252, Y + 8, 36, M.bsBricks);

  PONTOS.push({ x: CX, y: Y + 4, z: CZ, t: "boss_spawn", dados: { id: "ultimo_testemunho" } });
  PONTOS.push({ x: 253, y: Y, z: 33, t: "entrada_arena" });
  yield;
}
