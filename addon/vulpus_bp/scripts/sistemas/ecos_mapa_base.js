// @ts-check
// Base do mapa novo de "Ecos dos Ausentes": materiais resolvidos (com alternativa quando o jogo não conhece o bloco),
// ferramentas de desenho e as constantes de layout compartilhadas. Coordenadas relativas à origem; Y=0 é o chão.

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */

export const DIRS = { e: 0, w: 1, s: 2, n: 3 };
/** vira 180 graus */
export const OPOSTA = { e: "w", w: "e", s: "n", n: "s" };

/** Layout fixo (usado pelos construtores e pelos PONTOS, para nunca divergirem). */
export const LAY = {
  // Limiar
  chegada: { x: 12, z: 32 },
  veu: { x: 3, z: 32 },
  caminhoZ: 32,
  capela: { x: 34, z0: 2 },
  rotunda: { x: 34, z: 58 },
  semNome: { x: 58, z: 9 },
  tuco: { x: 14, z: 41 },
  // Vila
  rua: { z: 32 },
  praca: { x: 122, z: 32, r: 11 },
  torre: { x: 118, z: 12 },
  padaria: { x: 88, z: 12 },
  fechada: { x: 100, z: 47 },
  // Arquivo
  Y: -5,
  atrio: { x1: 175, x2: 189, z1: 20, z2: 46 },
  cela: { x: 220, z: 43 },
  salao: { x1: 192, x2: 222, z1: 14, z2: 52 },
  memoria: { x: 231, z: 33, r: 6 },
  // Arena
  arena: { x: 272, z: 33, y: -5 },
};

/**
 * @param {Pincel} p
 */
export function criar(p) {
  const mc = (n) => "minecraft:" + n;
  const pick = (...ids) => ids.find((i) => p.existe(i)) ?? ids[0];
  const pk = (...ns) => pick(...ns.map(mc));
  /** família de bloco: [bloco, laje, escada, muro]; usa a primeira cujo bloco existe */
  const fam = (...opcoes) => {
    for (const o of opcoes) if (p.existe(mc(o[0])) && p.existe(mc(o[1] ?? o[0]))) return { b: mc(o[0]), slab: mc(o[1]), stairs: mc(o[2]), wall: mc(o[3] ?? o[0]) };
    const o = opcoes[opcoes.length - 1];
    return { b: mc(o[0]), slab: mc(o[1]), stairs: mc(o[2]), wall: mc(o[3] ?? o[0]) };
  };
  /** madeira: usa a primeira cujo conjunto existe */
  const madeira = (...nomes) => {
    const n = nomes.find((x) => p.existe(mc(x + "_planks")) && p.existe(mc(x + "_fence")) && p.existe(mc("stripped_" + x + "_log"))) ?? nomes[nomes.length - 1];
    return { planks: mc(n + "_planks"), log: mc(n + "_log"), strip: mc("stripped_" + n + "_log"), slab: mc(n + "_slab"), stairs: mc(n + "_stairs"), fence: mc(n + "_fence"), leaves: mc(n + "_leaves"), nome: n };
  };

  const pedra = fam(["stone_bricks", "stone_brick_slab", "stone_brick_stairs", "stone_brick_wall"], ["stonebrick", "stone_brick_slab", "stone_brick_stairs", "stone_brick_wall"]);
  const tufo = fam(["tuff_bricks", "tuff_brick_slab", "tuff_brick_stairs", "tuff_brick_wall"], ["stone_bricks", "stone_brick_slab", "stone_brick_stairs", "stone_brick_wall"]);
  const tufoPol = fam(["polished_tuff", "polished_tuff_slab", "polished_tuff_stairs", "polished_tuff_wall"], ["polished_andesite", "polished_andesite_slab", "polished_andesite_stairs", "cobblestone_wall"]);
  const andesito = fam(["polished_andesite", "polished_andesite_slab", "polished_andesite_stairs", "cobblestone_wall"]);
  const liso = fam(["smooth_stone", "smooth_stone_slab", "normal_stone_stairs", "cobblestone_wall"], ["polished_andesite", "polished_andesite_slab", "polished_andesite_stairs", "cobblestone_wall"]);
  const dsTijolo = fam(["deepslate_bricks", "deepslate_brick_slab", "deepslate_brick_stairs", "deepslate_brick_wall"]);
  const dsTela = fam(["deepslate_tiles", "deepslate_tile_slab", "deepslate_tile_stairs", "deepslate_tile_wall"]);
  const dsPol = fam(["polished_deepslate", "polished_deepslate_slab", "polished_deepslate_stairs", "polished_deepslate_wall"]);
  const bsTijolo = fam(["polished_blackstone_bricks", "polished_blackstone_brick_slab", "polished_blackstone_brick_stairs", "polished_blackstone_brick_wall"]);
  const bsPol = fam(["polished_blackstone", "polished_blackstone_slab", "polished_blackstone_stairs", "polished_blackstone_wall"]);
  const arenito = fam(["smooth_sandstone", "smooth_sandstone_slab", "smooth_sandstone_stairs", "sandstone_wall"], ["sandstone", "sandstone_slab", "sandstone_stairs", "sandstone_wall"], ["birch_planks", "birch_slab", "birch_stairs", "birch_fence"]);
  const tijolo = fam(["brick_block", "brick_slab", "brick_stairs", "brick_wall"], ["dark_oak_planks", "dark_oak_slab", "dark_oak_stairs", "dark_oak_fence"]);
  const quartzo = fam(["quartz_block", "quartz_slab", "quartz_stairs", "quartz_block"]);
  const palida = madeira("pale_oak", "birch");
  const escura = madeira("dark_oak");
  const abeto = madeira("spruce");

  const M = {
    ar: mc("air"), agua: mc("water"), barreira: mc("barrier"), bedrock: mc("bedrock"),
    pedra, tufo, tufoPol, andesito, liso, dsTijolo, dsTela, dsPol, bsTijolo, bsPol, arenito, tijolo, quartzo,
    palida, escura, abeto,
    sbMoss: pk("mossy_stone_bricks", "mossy_stonebrick"),
    sbCrack: pk("cracked_stone_bricks", "cracked_stonebrick"),
    sbChis: pk("chiseled_stone_bricks", "chiseled_stonebrick"),
    calcita: mc("calcite"), ametista: mc("amethyst_block"), cristal: mc("amethyst_cluster"), grande: mc("large_amethyst_bud"),
    obsidiana: mc("obsidian"), chora: mc("crying_obsidian"),
    dsLiso: pk("deepslate"), dsCrack: pk("cracked_deepslate_bricks"), dsCrackT: pk("cracked_deepslate_tiles"), dsCinzel: pk("chiseled_deepslate"),
    bsCinzel: pk("chiseled_polished_blackstone"), bsDourada: pk("gilded_blackstone"), bs: pk("blackstone"),
    tufoBase: mc("tuff"),
    musgo: pk("pale_moss_block", "moss_block"), musgoTapete: pk("pale_moss_carpet", "moss_carpet"),
    grama: mc("grass_block"), terra: mc("dirt"), terraGrossa: mc("coarse_dirt"), podzol: mc("podzol"), cascalho: mc("gravel"),
    caminhoTerra: pk("dirt_path", "grass_path"),
    pedraBruta: mc("cobblestone"), pedraMusgo: mc("mossy_cobblestone"), muroBruto: mc("cobblestone_wall"),
    lajeBruta: mc("cobblestone_slab"),
    // luz
    lanterna: mc("lantern"), lanternaAlma: mc("soul_lantern"), vela: mc("candle"), mar: mc("sea_lantern"), barra: mc("end_rod"),
    froglight: pk("pearlescent_froglight", "sea_lantern"), ouro: mc("gold_block"), fogoAlma: mc("soul_fire"), almaTerra: mc("soul_soil"), almaAreia: mc("soul_sand"),
    corrente: pk("iron_chain", "chain"), grade: mc("iron_bars"), liquen: mc("glow_lichen"), sculk: mc("sculk"), sculkVeia: mc("sculk_vein"), sculkCatalis: mc("sculk_catalyst"),
    // móveis
    estante: mc("bookshelf"), estanteCinz: mc("chiseled_bookshelf"), atril: mc("lectern"), barril: mc("barrel"), caldeirao: mc("cauldron"), vaso: mc("flower_pot"),
    fornalha: mc("furnace"), bancadaCorte: mc("stonecutter_block"), bigorna: mc("anvil"), sino: mc("bell"), mesaCartog: mc("cartography_table"), tear: mc("loom"),
    vidro: mc("glass"), painel: mc("glass_pane"),
    paineis: {
      roxo: mc("purple_stained_glass_pane"), cinza: mc("gray_stained_glass_pane"), claro: mc("light_gray_stained_glass_pane"), ambar: mc("yellow_stained_glass_pane"),
      azul: mc("light_blue_stained_glass_pane"), branco: mc("white_stained_glass_pane"), magenta: mc("magenta_stained_glass_pane"),
    },
    vidros: { roxo: mc("purple_stained_glass"), ambar: mc("yellow_stained_glass"), azul: mc("light_blue_stained_glass"), branco: mc("white_stained_glass") },
    la: (cor) => mc(cor + "_wool"),
    /** pano esmaecido (terracota): toldos, bandeirolas e varais, sem a saturação da lã */
    pano: (cor) => mc(cor + "_terracotta"),
    tapete: (cor) => mc(cor + "_carpet"),
    velaCor: (cor) => mc(cor + "_candle"),
    // plantas
    folhaFlor: pk("flowering_azalea_leaves", "azalea_leaves"), folhaAzalea: pk("azalea_leaves", "oak_leaves"), folhaAbeto: pk("spruce_leaves"), folhaBetula: pk("birch_leaves"), folhaEscura: pk("dark_oak_leaves"),
    folhaPalida: pk("pale_oak_leaves", "birch_leaves"),
    rosaNegra: mc("wither_rose"), arbusto: pk("deadbush", "dead_bush"), capim: pk("short_grass", "tallgrass"),
    allium: pk("allium", "cornflower"), bluet: pk("azure_bluet", "cornflower"), centaurea: pk("cornflower", "azure_bluet"), margarida: pk("oxeye_daisy", "azure_bluet"), papoula: pk("poppy", "dandelion"), dente: mc("dandelion"),
    orquidea: pk("blue_orchid", "cornflower"), lirio: pk("lily_of_the_valley", "azure_bluet"), olho: pk("closed_eyeblossom", "azure_bluet"),
    musgoPendente: pk("pale_hanging_moss", "hanging_roots"), videira: mc("vine"), nenufar: pk("waterlily"),
    // pedras de cena
    pedraLisa: mc("stone"), diorito: pk("polished_diorite"), diorito2: mc("diorite"),
    // vermelho/quente
    lajeArenito: pk("smooth_sandstone_slab", "sandstone_slab"),
    barro: pk("mud_bricks", "stone_bricks"), barroLaje: pk("mud_brick_slab", "stone_brick_slab"), barroEscada: pk("mud_brick_stairs", "stone_brick_stairs"),
    placaPeso: pk("stone_pressure_plate"), botao: pk("stone_button"), alavanca: pk("lever"),
    teia: mc("cobweb"), ferrolho: mc("iron_bars"),
    hay: pk("hay_block"), moldura: pk("frame"), prato: pk("flower_pot"),
    bolo: pk("white_candle_cake"), sinoEscuro: pk("copper_block"),
    cobreOx: pk("oxidized_copper", "oxidized_cut_copper"),
  };

  const F = (x1, y1, z1, x2, y2, z2, id) => p.fill(x1, y1, z1, x2, y2, z2, id);
  const S = (x, y, z, id, est) => p.set(x, y, z, id, est);
  const ar = (x1, y1, z1, x2, y2, z2) => F(x1, y1, z1, x2, y2, z2, M.ar);
  const col = (x, z, y1, y2, id) => F(x, y1, z, x, y2, z, id);
  /** escada: dir = lado para onde sobe (alto); top = de cabeça para baixo */
  const st = (x, y, z, id, dir, top = false) => S(x, y, z, id, top ? { weirdo_direction: DIRS[dir], upside_down_bit: true } : { weirdo_direction: DIRS[dir] });
  const sl = (x, y, z, id, top = false) => S(x, y, z, id, top ? { "minecraft:vertical_half": "top" } : undefined);
  const tronco = (x, y, z, id, eixo = "y") => S(x, y, z, id, eixo === "y" ? undefined : { pillar_axis: eixo });
  const vela = (x, y, z, n = 1, acesa = true, cor) => S(x, y, z, cor ? M.velaCor(cor) : M.vela, { candles: Math.max(0, Math.min(3, n - 1)), lit: acesa });
  const lampPend = (x, y, z, id = M.lanternaAlma) => S(x, y, z, id, { hanging: true });
  /** flor no chão: o bloco de baixo vira terra (podzol), onde a planta sempre sobrevive; vira canteiro */
  const flor = (x, y, z, id) => { S(x, y - 1, z, M.podzol); S(x, y, z, id); };
  /** laje de cima (a face de cima fica inteira: vela e lanterna se apoiam nela) */
  const lajeAlta = (x, y, z, id) => S(x, y, z, id, { "minecraft:vertical_half": "top" });
  /** corrente de yTopo para baixo com lanterna na ponta */
  const pendente = (x, yTopo, z, n = 2, id = M.lanternaAlma) => {
    for (let i = 0; i < n; i++) S(x, yTopo - i, z, M.corrente);
    lampPend(x, yTopo - n, z, id);
  };
  const folha = (x, y, z, id) => S(x, y, z, id, { persistent_bit: true });
  /** copa em elipsoide, com cantos cortados para ficar redonda */
  const copa = (cx, cy, cz, rx, ry, rz, id, /** @type {(a: number, b: number, c: number) => boolean} */ falha = () => false) => {
    for (let x = -rx; x <= rx; x++) for (let y = -ry; y <= ry; y++) for (let z = -rz; z <= rz; z++) {
      const d = (x * x) / (rx * rx + 0.6) + (y * y) / (ry * ry + 0.6) + (z * z) / (rz * rz + 0.6);
      if (d <= 1 && !falha(x, y, z)) folha(cx + x, cy + y, cz + z, id);
    }
  };
  /** percorre os pontos de um disco; fn(x, z, d) devolve id ou undefined */
  const disco = (cx, cz, y, r, fn) => {
    const ri = Math.ceil(r);
    for (let x = cx - ri; x <= cx + ri; x++) for (let z = cz - ri; z <= cz + ri; z++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > r) continue;
      const id = fn(x, z, d, x - cx, z - cz);
      if (id) S(x, y, z, id);
    }
  };
  /** direção (e/w/s/n) de (x,z) para o centro */
  const paraCentro = (dx, dz) => (Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? "w" : "e") : dz > 0 ? "n" : "s");
  const h = { mark: 0 };
  /** cede a vez de tempos em tempos (a obra é retomável por fase, mas cada passo tem de ser curto) */
  function* pausa(limite = 450) {
    if (p.ops - h.mark > limite) {
      h.mark = p.ops;
      yield;
    }
  }
  /** pseudo-aleatório determinístico (para escolhas que precisam parecer naturais mas serem sempre iguais) */
  const rnd = (a, b = 0, c = 0) => {
    let n = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return { M, F, S, ar, col, st, sl, tronco, vela, flor, lajeAlta, lampPend, pendente, folha, copa, disco, paraCentro, pausa, rnd, h, p, mc, pick };
}

/** Poste em T de pedra com lanternas penduradas (modelo do lobby do dono). braco: eixo do braço ("x" ou "z"). */
export function poste(H, x, z, y0, braco, lamp, sufixo = "") {
  const { M, S, st, sl, pendente } = H;
  const P = M.pedra;
  S(x, y0 + 1, z, P.b);
  for (let y = 2; y <= 4; y++) S(x, y0 + y, z, P.wall);
  S(x, y0 + 5, z, P.b);
  const d = braco === "x" ? [1, 0] : [0, 1];
  for (const s of [-1, 1]) {
    S(x + d[0] * s, y0 + 5, z + d[1] * s, P.slab, { "minecraft:vertical_half": "top" });
    // lanterna num lado só alterna: braço comprido de um lado e curto do outro, como no modelo
  }
  pendente(x + d[0], y0 + 4, z + d[1], 2, lamp);
  pendente(x - d[0], y0 + 4, z - d[1], 1, lamp);
  if (lamp === M.lanternaAlma) S(x, y0 + 6, z, M.froglight); // fecho de luz lilás no alto do poste
  void sufixo;
}

/** Pirâmide de telhado: cada camada é um quadrado cheio (escadas na borda), para nada ficar solto no ar. */
export function piramide(H, cx, cz, y0, r, R) {
  const { S, st, F } = H;
  for (let i = 0; i < r; i++) {
    const rr = r - i, y = y0 + i;
    F(cx - rr + 1, y, cz - rr + 1, cx + rr - 1, y, cz + rr - 1, R.b);
    for (let a = -rr; a <= rr; a++) {
      st(cx + a, y, cz - rr, R.stairs, "s"); st(cx + a, y, cz + rr, R.stairs, "n");
      st(cx - rr, y, cz + a, R.stairs, "e"); st(cx + rr, y, cz + a, R.stairs, "w");
    }
  }
  S(cx, y0 + r, cz, R.b);
}

// ------------------------------------------------------------------ ruído determinístico (baixa frequência manda)
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const suave = (t) => t * t * (3 - 2 * t);
export function vnoise(x, z, seed) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const fx = suave(x - x0), fz = suave(z - z0);
  const a = hash2(x0, z0, seed), b = hash2(x0 + 1, z0, seed), c = hash2(x0, z0 + 1, seed), d = hash2(x0 + 1, z0 + 1, seed);
  return a + (b - a) * fx + (c + (d - c) * fx - (a + (b - a) * fx)) * fz;
}
/** soma de oitavas; period = tamanho da feição maior (em blocos); devolve [0,1] */
export function fbm(x, z, seed, period = 16, oitavas = 2) {
  let amp = 1, freq = 1 / period, soma = 0, norma = 0;
  for (let o = 0; o < oitavas; o++) { soma += vnoise(x * freq, z * freq, seed + o * 101) * amp; norma += amp; amp *= 0.5; freq *= 2; }
  return soma / norma;
}
