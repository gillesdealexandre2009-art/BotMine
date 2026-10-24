// @ts-check
// III - O ARQUIVO DAS ALMAS (170..240 x 0..65), subterrâneo. Ardósia (deepslate), estantes, luz azul de alma e âmbar.
// Eixo leste-oeste: Boca (passagem) -> Átrio (arquivista) -> Salão de Leitura (galerias, escadas, prateleiras flutuantes)
// -> Sala da Memória Partida -> Corredor final. Dois ramais: Cripta das Sentinelas ao norte e ao sul, cada uma com um altar.
import { LAY, piramide } from "./ecos_mapa_base.js";

const Y = LAY.Y; // altura em que se pisa (blocos de piso em Y-1)

/** coluna com base, fuste e capitel */
function coluna(H, x, z, y1, y2, fuste) {
  const { M, F, S } = H;
  S(x, y1, z, M.dsPol.b);
  F(x, y1 + 1, z, x, y2 - 1, z, fuste ?? M.dsTijolo.b);
  S(x, y2, z, M.dsCinzel);
}

/** estante: parede de livros com uma fileira de estante-cinzelada de ritmo; altura em blocos */
function estante(H, x1, z1, x2, z2, y, alt, cinz = 4) {
  const { M, F, S } = H;
  F(x1, y, z1, x2, y + alt - 1, z2, M.estante);
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) if ((x + z) % cinz === 0) S(x, y + 1, z, M.estanteCinz);
}

/**
 * Passagem: o pátio de entrada (166..173), o pavilhão de fachada com o arco de calcita e a rampa de degraus que desce
 * 6 blocos até o Átrio. Também veste a face oeste do Arquivo (pilastras e frestas de luz azul) para ser marco de longe.
 */
export function* passagem(H) {
  const { M, F, S, ar, st, sl, vela, pendente, pausa } = H;
  // pátio gramado até a face do prédio, com a rua em pedra chegando até a porta
  F(160, -1, 0, 173, -1, 65, M.terra);
  F(160, 0, 0, 173, 0, 65, M.grama);
  for (let x = 160; x <= 173; x++) {
    F(x, 0, 30, x, 0, 34, M.andesito.b);
    F(x, 0, 31, x, 0, 33, M.liso.b);
    S(x, 0, 30, M.pedra.b); S(x, 0, 34, M.pedra.b);
    S(x, 1, 29, M.pedra.slab); S(x, 1, 35, M.pedra.slab);
  }
  // face oeste do prédio inteiro: pilastras a cada 6, frestas azuis, cornija e parapeito com ameias
  F(174, -9, 0, 174, 11, 65, M.dsTijolo.b);
  for (let z = 0; z <= 65; z += 6) {
    if (z >= 18 && z <= 46) continue;
    F(173, 0, z, 173, 9, z, M.dsPol.b);
    S(173, 0, z, M.dsCinzel); S(173, 10, z, M.dsCinzel);
    for (const dz of [2, 3]) if (z + dz <= 65) { F(174, 3, z + dz, 174, 7, z + dz, M.paineis.azul); F(175, 3, z + dz, 175, 7, z + dz, M.mar); }
  }
  F(174, 9, 0, 174, 9, 17, M.dsPol.b); F(174, 9, 47, 174, 9, 65, M.dsPol.b);
  yield;
  // pavilhão
  F(166, -9, 20, 173, 12, 44, M.dsTijolo.b);
  // pilastras do pavilhão e frestas
  for (const z of [22, 26, 38, 42]) {
    F(165, 0, z, 165, 10, z, M.dsPol.b); S(165, 0, z, M.dsCinzel); S(165, 11, z, M.dsCinzel);
    F(165, 11, z, 166, 11, z, M.dsPol.slab);
  }
  for (const z of [24, 40]) { F(166, 3, z, 166, 8, z, M.paineis.azul); F(167, 3, z, 167, 8, z, M.mar); }
  for (const z of [21, 43]) F(166, 2, z, 166, 5, z, M.paineis.roxo);
  // moldura da porta: três colunas de calcita de cada lado, faixas cinzeladas, verga em degraus, chave de ametista
  ar(165, 1, 29, 166, 7, 35);
  for (const z of [26, 27, 28, 36, 37, 38]) {
    F(165, 1, z, 166, 10, z, M.calcita);
    for (let y = 3; y <= 9; y += 3) F(165, y, z, 166, y, z, M.dsCinzel);
  }
  F(165, 8, 26, 166, 10, 38, M.calcita);
  ar(165, 1, 29, 166, 7, 35);
  F(165, 8, 29, 166, 8, 35, M.dsPol.b);
  F(166, 11, 27, 166, 11, 37, M.dsPol.b);
  F(166, 12, 29, 166, 12, 35, M.dsPol.b);
  F(166, 13, 31, 166, 13, 33, M.dsPol.b);
  S(166, 14, 32, M.ametista); S(165, 11, 32, M.cristal);
  for (const [z, d] of [[29, "n"], [35, "s"]]) { st(165, 7, z, M.dsPol.stairs, d, true); st(166, 7, z, M.dsPol.stairs, d, true); }
  // estandartes de lã roxa nos dois lados e cornija contínua
  for (const z of [24, 40]) { F(165, 3, z, 165, 8, z, M.la("purple")); S(165, 2, z, M.la("white")); }
  F(165, 10, 21, 165, 10, 25, M.dsPol.slab); F(165, 10, 39, 165, 10, 43, M.dsPol.slab);
  // sobreluz: pendentes de luz de alma sob a verga, em curva
  [1, 2, 2, 3, 2, 2, 1].forEach((n, i) => pendente(166, 7, 29 + i, n, M.lanternaAlma));
  // torrezinhas nos cantos do pavilhão
  for (const z of [20, 42]) {
    F(165, 1, z, 168, 14, z + 2, M.dsTijolo.b);
    for (let y = 4; y <= 13; y += 4) F(165, y, z, 168, y, z + 2, M.dsPol.b);
    piramide(H, 166, z + 1, 15, 1, M.dsTijolo);
    S(166, 17, z + 1, M.lanternaAlma);
  }
  // rampa: sete colunas, cada uma um degrau abaixo da anterior
  for (let x = 167; x <= 174; x++) {
    const y = -Math.min(6, x - 167);
    ar(x, y + 1, 30, x, y + 5, 34);
    F(x, y, 30, x, y, 34, M.dsTela.b);
    if (x > 167 && x <= 173) for (let z = 30; z <= 34; z++) st(x, y, z, M.dsTela.stairs, "w");
    S(x, y, 30, M.dsPol.b); S(x, y, 34, M.dsPol.b);
    if (x % 2) { S(x, y + 3, 29, M.lanternaAlma); ar(x, y + 3, 29, x, y + 3, 29); }
  }
  for (const x of [169, 172]) pendente(x, -(x - 167) + 5, 32, 1, M.lanternaAlma);
  // postes de entrada e velas na soleira
  for (const z of [26, 38]) { F(163, 1, z, 163, 4, z, M.pedra.wall); S(163, 5, z, M.lanternaAlma); S(163, 0, z, M.pedra.b); }
  for (const z of [29, 35]) { vela(164, 1, z, 3, true, "purple"); vela(164, 1, z + (z === 29 ? -1 : 1), 2, true, "white"); }
  yield* pausa();
}

function* atrio(H) {
  const { M, F, S, ar, st, sl, vela, pendente, disco, copa, pausa } = H;
  const A = LAY.atrio;
  const cx = Math.floor((A.x1 + A.x2) / 2), cz = Math.floor((A.z1 + A.z2) / 2);
  ar(A.x1, Y, A.z1, A.x2, Y + 11, A.z2);
  // piso em faixas concêntricas e emblema
  F(A.x1, Y - 1, A.z1, A.x2, Y - 1, A.z2, M.dsPol.b);
  F(A.x1 + 1, Y - 1, A.z1 + 1, A.x2 - 1, Y - 1, A.z2 - 1, M.dsTela.b);
  F(A.x1 + 3, Y - 1, A.z1 + 3, A.x2 - 3, Y - 1, A.z2 - 3, M.dsTijolo.b);
  F(cx - 2, Y - 1, A.z1, cx + 2, Y - 1, A.z2, M.dsPol.b); // tapete-faixa ao longo do eixo z
  disco(cx, cz, Y - 1, 5.5, (x, z, d) => (d > 4.2 ? M.dsPol.b : d > 3.2 ? M.ametista : d > 1.4 ? M.dsTela.b : M.calcita));
  S(cx, Y - 1, cz, M.mar);
  // passagem do eixo oeste-leste: faixa de ardósia polida
  F(A.x1, Y - 1, 32, A.x2 + 3, Y - 1, 34, M.dsPol.b);
  // pilastras e estantes nos dois lados longos
  const px = [176, 180, 184, 188];
  for (const z of [A.z1 + 1, A.z2 - 1]) {
    for (const x of px) coluna(H, x, z, Y, Y + 8, M.dsPol.b);
    for (let i = 0; i < 3; i++) {
      const xa = px[i] + 1, xb = px[i + 1] - 1;
      estante(H, xa, z, xb, z, Y, 5, 2);
      for (let x = xa; x <= xb; x++) H.lajeAlta(x, Y + 5, z, M.dsPol.slab);
      S((xa + xb) >> 1, Y + 6, z, M.lanterna);
    }
    yield* pausa(300);
  }
  // balcão do arquivista (U aberto para o oeste) e atriz
  F(180, Y, 30, 183, Y, 30, M.escura.planks); F(180, Y, 36, 183, Y, 36, M.escura.planks);
  F(183, Y, 30, 183, Y, 36, M.escura.planks);
  S(183, Y + 1, 33, M.atril);
  S(181, Y + 1, 30, M.vaso); vela(183, Y + 1, 30, 3, true); vela(183, Y + 1, 36, 2, true); S(182, Y + 1, 36, M.vaso);
  F(184, Y, 31, 184, Y + 4, 35, M.estante);
  for (let y = Y; y <= Y + 4; y++) if (y % 2) for (let z = 31; z <= 35; z++) S(184, y, z, M.estanteCinz);
  // frestas de vitral azul no alto das paredes longas, uma por vão, com lanterna-do-mar atrás (luz de alma)
  for (const z of [A.z1 - 1, A.z2 + 1]) {
    const dz = z < A.z1 ? -1 : 1;
    for (let i = 0; i < 3; i++) {
      const mid = (px[i] + px[i + 1]) >> 1;
      F(mid - 1, Y + 6, z, mid + 1, Y + 9, z, M.paineis.azul);
      F(mid, Y + 10, z, mid, Y + 10, z, M.dsCinzel);
      F(mid - 1, Y + 6, z + dz, mid + 1, Y + 9, z + dz, M.mar);
    }
  }
  // passadeira roxa do eixo
  F(A.x1, Y, 32, 179, Y, 34, M.tapete("purple"));
  F(185, Y, 32, A.x2 + 3, Y, 34, M.tapete("purple"));
  yield* pausa();
  // teto em caixotões: viga polida em grade sobre fundo de tijolo, lustres de correntes e velas
  const yt = Y + 11;
  F(A.x1, yt, A.z1, A.x2, yt, A.z2, M.dsTijolo.b);
  for (let x = A.x1; x <= A.x2; x += 4) F(x, yt - 1, A.z1, x, yt - 1, A.z2, M.dsPol.b);
  for (let z = A.z1; z <= A.z2; z += 4) F(A.x1, yt - 1, z, A.x2, yt - 1, z, M.dsPol.b);
  for (const x of px) for (const z of [A.z1 + 1, A.z2 - 1]) F(x, Y + 8, z, x, yt - 1, z, M.dsPol.b);
  for (const [lx, lz] of [[178, 26], [178, 40], [186, 26], [186, 40], [cx, cz]]) {
    for (let y = yt - 1; y >= yt - 5; y--) S(lx, y, lz, M.corrente);
    S(lx, yt - 6, lz, M.grade);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { S(lx + dx, yt - 6, lz + dz, M.grade); vela(lx + dx, yt - 5, lz + dz, 2, true); }
    H.lampPend(lx, yt - 7, lz, M.lanternaAlma);
  }
  // portas: oeste (rampa) e leste (para o salão)
  ar(A.x1 - 1, Y, 30, A.x1, Y + 4, 34);
  ar(A.x2, Y, 29, A.x2 + 3, Y + 5, 37);
  for (const z of [28, 38]) coluna(H, A.x2, z, Y, Y + 7, M.dsPol.b);
  F(A.x2, Y + 6, 28, A.x2, Y + 6, 38, M.dsPol.b);
  yield* pausa();
}

/** parede de estantes em fileira livre, com vãos regulares */
function fileira(H, x1, x2, z, y0, alt) {
  const { M, F, S } = H;
  for (let x = x1; x <= x2; x += 8) {
    estante(H, x, z, Math.min(x + 4, x2), z, y0, alt, 3);
    for (let xx = x; xx <= Math.min(x + 4, x2); xx++) H.lajeAlta(xx, y0 + alt, z, M.dsPol.slab);
    S(x + 2, y0 + alt + 1, z, M.vela);
  }
}

function* salao(H) {
  const { M, F, S, ar, st, sl, vela, pendente, pausa } = H;
  const A = LAY.salao;
  const yt = Y + 14;
  ar(A.x1, Y, A.z1, A.x2, yt, A.z2);
  // piso: grade de tijolo/ladrilho com avenida central polida e tapete de ametista
  F(A.x1, Y - 1, A.z1, A.x2, Y - 1, A.z2, M.dsTela.b);
  for (let x = A.x1; x <= A.x2; x += 6) F(x, Y - 1, A.z1, x, Y - 1, A.z2, M.dsPol.b);
  F(A.x1, Y - 1, 29, A.x2, Y - 1, 37, M.dsPol.b);
  F(A.x1, Y - 1, 32, A.x2, Y - 1, 34, M.dsTela.b);
  for (let x = A.x1; x <= A.x2; x += 6) F(x, Y - 1, 29, x, Y - 1, 37, M.ametista);
  yield* pausa();
  // galerias norte e sul (z 14..18 / 48..52) sobre colunas, com mureta, estantes em dois andares e luz azul pendurada
  for (const [za, zr, zw, dir] of [[A.z1, A.z1 + 4, A.z1, "s"], [A.z2 - 4, A.z2 - 4, A.z2, "n"]]) {
    const a0 = dir === "s" ? A.z1 : A.z2 - 4, a1 = dir === "s" ? A.z1 + 4 : A.z2;
    F(A.x1, Y + 3, a0, A.x2, Y + 3, a1, M.dsPol.b);
    const zb = dir === "s" ? a1 : a0; // borda voltada para a nave
    F(A.x1, Y + 3, zb, A.x2, Y + 3, zb, M.dsTijolo.b);
    F(A.x1 + 1, Y + 4, zb, A.x2 - 1, Y + 4, zb, M.dsPol.wall);
    for (let x = A.x1 + 3; x <= A.x2 - 3; x += 6) {
      F(x, Y, zb, x, Y + 2, zb, M.dsPol.b);
      F(x, Y + 4, zb, x, Y + 10, zb, M.dsPol.b);
      S(x, Y + 11, zb, M.dsCinzel);
    }
    estante(H, A.x1 + 1, zw, A.x2 - 1, zw, Y, 3, 5);
    estante(H, A.x1 + 1, zw, A.x2 - 1, zw, Y + 4, 5, 5);
    for (let x = A.x1 + 2; x <= A.x2 - 2; x += 5) S(x, Y + 9, zw, M.lanterna);
    for (let x = A.x1 + 3; x <= A.x2 - 3; x += 6) pendente(x, Y + 13, dir === "s" ? zb - 2 : zb + 2, 4, M.lanternaAlma);
    // estandartes de lã roxa pendurados nas colunas, voltados para a nave, com ponta branca
    const lado = dir === "s" ? 1 : -1;
    for (let x = A.x1 + 3; x <= A.x2 - 3; x += 6) { F(x, Y + 6, zb + lado, x, Y + 10, zb + lado, M.la("purple")); S(x, Y + 5, zb + lado, M.la("white")); }
    yield* pausa();
  }
  // escadas de acesso às galerias (4 degraus subindo em direção à parede)
  /** @type {any[]} */
  const escadas = [[A.x1 + 1, A.z1 + 8, "n", -1, A.z1 + 4], [A.x2 - 6, A.z2 - 8, "s", 1, A.z2 - 4]];
  for (const [x, zs, dir, dz, zb] of escadas) {
    for (let i = 0; i < 4; i++) {
      const z = zs + dz * i;
      if (i > 0) F(x, Y, z, x + 1, Y + i - 1, z, M.dsPol.b);
      for (const xx of [x, x + 1]) st(xx, Y + i, z, M.dsTijolo.stairs, dir);
    }
    ar(x, Y + 4, zb, x + 1, Y + 4, zb);
  }
  yield* pausa();
  // fileiras de estantes no miolo (ritmo de 8), deixando a avenida central livre
  for (const z of [22, 26, 40, 44]) { fileira(H, A.x1 + 6, A.x2 - 6, z, Y, 4); yield* pausa(300); }
  // mesas de leitura nas pontas da avenida, com velas e lanternas de mesa
  for (const [x, z] of [[198, 30], [198, 36], [206, 30], [206, 36], [214, 30], [214, 36]]) {
    F(x, Y, z, x + 2, Y, z, M.escura.planks);
    vela(x + 1, Y + 1, z, 3, true, (x + z) % 2 ? "yellow" : undefined);
    S(x, Y + 1, z, M.vaso);
    st(x, Y, z + (z === 30 ? -1 : 1), M.escura.stairs, z === 30 ? "n" : "s");
    st(x + 2, Y, z + (z === 30 ? -1 : 1), M.escura.stairs, z === 30 ? "n" : "s");
  }
  // teto: caixotões, vigas, lustres
  F(A.x1, yt, A.z1, A.x2, yt, A.z2, M.dsTijolo.b);
  for (let x = A.x1; x <= A.x2; x += 6) F(x, yt - 1, A.z1, x, yt - 1, A.z2, M.dsPol.b);
  for (let z = A.z1; z <= A.z2; z += 6) F(A.x1, yt - 1, z, A.x2, yt - 1, z, M.dsPol.b);
  for (const x of [201, 213]) for (const z of [24, 42]) {
    for (let y = yt - 1; y >= yt - 4; y--) S(x, y, z, M.corrente);
    H.lampPend(x, yt - 5, z, M.lanternaAlma);
  }
  yield* pausa();
  // surreal, com intenção: os livros que se soltaram das estantes e sobem em hélice até a luz do teto (uma hélice só, regular)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = 206 + Math.round(Math.cos(a) * 6), z = 33 + Math.round(Math.sin(a) * 3), y = Y + 4 + Math.floor(i * 0.7);
    F(x, y, z, x + 1, y, z, M.estante);
    S(x, y + 1, z, i % 4 === 0 ? M.vela : M.estanteCinz);
  }
  // luz quente pendurada sobre a avenida (halos pontuais: o Arquivo era frio demais)
  for (const x of [199, 217]) H.pendente(x, yt - 1, 33, 5, M.lanterna);
  // surreal, com intenção: a escada que sobe ao nada. Ganha uma moldura de porta no topo e uma lanterna de alma dentro:
  // quem sobe vê que a "porta" dá no ar; fica no corredor norte da nave (z 19..20), fora da avenida.
  for (let i = 0; i < 9; i++) {
    for (const z of [19, 20]) {
      if (i > 0) F(199 + i, Y, z, 199 + i, Y + i - 1, z, M.dsPol.b);
      st(199 + i, Y + i, z, M.dsTijolo.stairs, "e");
    }
  }
  F(208, Y + 8, 19, 208, Y + 8, 20, M.dsPol.b);
  for (const z of [18, 21]) F(209, Y + 8, z, 209, Y + 12, z, M.dsPol.b);
  F(209, Y + 13, 18, 209, Y + 13, 21, M.dsPol.b);
  S(209, Y + 12, 19, M.dsCinzel); S(209, Y + 12, 20, M.dsCinzel);
  H.lampPend(209, Y + 11, 19, M.lanternaAlma);
  H.vela(208, Y + 9, 19, 3, true);
  // dais do Livro-Mestre no fim da avenida
  F(219, Y, 29, 222, Y, 37, M.dsPol.b);
  F(220, Y + 1, 31, 221, Y + 1, 35, M.dsPol.slab);
  S(221, Y + 1, 33, M.atril); S(220, Y + 1, 33, M.vela);
  for (const z of [30, 36]) coluna(H, 219, z, Y, Y + 6, M.dsPol.b);
  yield* pausa();

  // passadeira da avenida e rosácea monumental no fundo da nave (vitral roxo, azul e branco com luz atrás)
  F(A.x1 + 1, Y, 32, 218, Y, 34, M.tapete("purple"));
  const rx = A.x2 + 1, ry = Y + 8;
  for (let dz = -6; dz <= 6; dz++) for (let dy = -6; dy <= 6; dy++) {
    const d = Math.hypot(dz, dy);
    if (d > 5.6) continue;
    const ang = Math.abs(Math.round((Math.atan2(dy, dz) * 180) / Math.PI / 45)) % 2 === 0 && d > 1.5;
    const id = d > 4.4 ? M.paineis.roxo : d > 2.8 ? (ang ? M.paineis.branco : M.paineis.azul) : d > 1.2 ? M.paineis.magenta : M.paineis.branco;
    S(rx, ry + dy, 33 + dz, id);
    S(rx + 1, ry + dy, 33 + dz, M.mar);
  }
  yield* pausa(300);
  for (let a = 0; a < 16; a++) {
    const rad = (a / 16) * Math.PI * 2;
    S(rx, ry + Math.round(Math.sin(rad) * 6.2), 33 + Math.round(Math.cos(rad) * 6.2), M.dsCinzel);
  }
  // frestas nas paredes longas, acima das galerias
  for (const z of [A.z1 - 1, A.z2 + 1]) {
    const dz = z < A.z1 ? -1 : 1;
    for (let x = A.x1 + 4; x <= A.x2 - 4; x += 6) { F(x, Y + 10, z, x + 1, Y + 12, z, M.paineis.azul); F(x, Y + 10, z + dz, x + 1, Y + 12, z + dz, M.mar); }
  }
  // portas para as criptas (norte e sul) e para a Memória (leste)
  ar(196, Y, A.z1 - 4, 198, Y + 4, A.z1);
  ar(196, Y, A.z2, 198, Y + 4, A.z2 + 4);
  ar(A.x2, Y, 31, A.x2 + 2, Y + 4, 35);
  for (const [x, z] of [[195, A.z1], [199, A.z1], [195, A.z2], [199, A.z2]]) coluna(H, x, z, Y, Y + 5, M.dsPol.b);
  F(195, Y + 5, A.z1, 199, Y + 5, A.z1, M.dsPol.b); F(195, Y + 5, A.z2, 199, Y + 5, A.z2, M.dsPol.b);

  // cela esquecida (E11): nicho de estantes em zigue-zague no canto sudeste
  const nx = LAY.cela.x, nz = LAY.cela.z;
  F(nx - 2, Y, nz - 2, nx + 2, Y + 4, nz + 2, M.estante);
  ar(nx - 1, Y, nz - 1, nx + 1, Y + 3, nz + 1);
  ar(nx + 1, Y, nz + 2, nx + 1, Y + 3, nz + 2); // entrada de lado
  F(nx - 3, Y, nz + 3, nx, Y + 4, nz + 3, M.estante); // tela de estantes que esconde a entrada
  S(nx, Y + 1, nz - 2, M.estanteCinz); // a prateleira marcada
  S(nx, Y, nz - 1, M.atril);
  vela(nx - 1, Y, nz - 1, 3, true, "purple"); vela(nx + 1, Y, nz - 1, 2, true, "purple");
  F(nx - 1, Y + 4, nz - 1, nx + 1, Y + 4, nz + 1, M.estante);
  F(nx - 1, Y - 1, nz - 1, nx + 1, Y - 1, nz + 1, M.ametista);
  yield* pausa();
}

/** Cripta das Sentinelas: corredor com nichos e estátuas a cada 4, e sala do altar no fim. lado = -1 norte, +1 sul */
function* cripta(H, zc, lado) {
  const { M, F, S, ar, st, vela, pendente, disco, pausa } = H;
  const tema = lado < 0 ? "cristal" : "almas";
  const x1 = 192, x2 = 234;
  const za = zc - 3, zb = zc + 3;
  ar(x1, Y, za, x2, Y + 7, zb);
  // túnel de ligação com o salão
  const zt = lado < 0 ? [za + 7, za + 10] : [zb - 10, zb - 7];
  ar(196, Y, Math.min(...zt), 198, Y + 4, Math.max(...zt));
  F(x1, Y - 1, za, x2, Y - 1, zb, M.dsTela.b);
  F(x1, Y - 1, zc - 1, x2, Y - 1, zc + 1, M.dsPol.b);
  for (let x = x1 + 2; x <= x2 - 2; x += 8) F(x, Y - 1, zc, x + 1, Y - 1, zc, tema === "cristal" ? M.ametista : M.chora);
  // nichos e estátuas de sentinela de 4 em 4
  for (let x = x1 + 3; x <= 218; x += 4) {
    for (const z of [za, zb]) {
      const dz = z === za ? 1 : -1;
      ar(x, Y, z, x, Y + 3, z);
      F(x, Y, z, x, Y, z, M.dsPol.b);
      // estátua: pedestal, corpo de ladrilho, capacete cinzelado, lança de bastão
      S(x, Y + 1, z, M.dsTela.b); S(x, Y + 2, z, M.dsTela.b); S(x, Y + 3, z, M.dsCinzel);
      S(x + 1, Y + 1, z, M.dsPol.wall); S(x - 1, Y + 1, z, M.dsPol.wall);
      S(x, Y + 4, z, M.dsPol.slab);
      S(x, Y, z + dz, M.lanternaAlma);
    }
    // arcos que se repetem
    F(x, Y + 7, za, x, Y + 7, zb, M.dsPol.b);
    for (const z of [za, zb]) F(x, Y + 5, z, x, Y + 6, z, M.dsTijolo.b);
    yield* pausa(300);
  }
  F(x1, Y + 8, za, x2, Y + 8, zb, M.dsTijolo.b);
  // pendentes
  for (let x = x1 + 5; x <= 216; x += 8) pendente(x, Y + 7, zc, 2, tema === "cristal" ? M.lanternaAlma : M.lanterna);
  // sala do altar (222..234)
  ar(222, Y, za - 2, 234, Y + 9, zb + 2);
  F(222, Y - 1, za - 2, 234, Y - 1, zb + 2, M.dsPol.b);
  disco(230, zc, Y - 1, 5.5, (x, z, d) => (d > 4.2 ? M.dsTela.b : d > 3 ? (tema === "cristal" ? M.ametista : M.chora) : d > 1.4 ? M.dsTijolo.b : M.dsPol.b));
  F(229, Y, zc - 1, 231, Y, zc + 1, M.dsPol.b);
  F(230, Y + 1, zc, 230, Y + 1, zc, M.dsCinzel);
  if (tema === "cristal") {
    S(230, Y + 2, zc, M.cristal);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { F(230 + dx, Y, zc + dz, 230 + dx, Y + 1, zc + dz, M.ametista); S(230 + dx, Y + 2, zc + dz, M.cristal); }
  } else {
    for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) { S(230 + dx, Y, zc + dz, M.almaAreia); S(230 + dx, Y + 1, zc + dz, M.fogoAlma); }
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { S(230 + dx, Y, zc + dz, M.sculk); S(230 + dx, Y + 1, zc + dz, M.sculk); }
  }
  for (const [dx, dz] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) vela(230 + dx, Y, zc + dz, 3, true, tema === "cristal" ? "purple" : undefined);
  for (const dz of [-3, 3]) coluna(H, 226, zc + dz, Y, Y + 8, M.dsPol.b);
  F(222, Y + 10, za - 2, 234, Y + 10, zb + 2, M.dsTijolo.b);
  for (let y = Y + 9; y >= Y + 5; y--) S(230, y, zc, M.corrente);
  H.lampPend(230, Y + 4, zc, M.lanternaAlma);
  // porta da sala
  ar(220, Y, zc - 1, 222, Y + 4, zc + 1);
  F(220, Y + 5, za, 222, Y + 5, zb, M.dsPol.b);
  yield* pausa();
}

function* memoria(H) {
  const { M, F, S, ar, st, vela, disco, pausa } = H;
  const { x: cx, z: cz, r } = LAY.memoria;
  // sala circular um pouco maior que o raio de piso
  disco(cx, cz, Y, r + 1, () => M.ar);
  for (let y = Y + 1; y <= Y + 9; y++) { disco(cx, cz, y, r + 1, () => M.ar); yield* pausa(200); }
  ar(222, Y, 31, 224, Y + 4, 35);
  // piso em anéis; o hemisfério norte desliza um bloco para leste: a sala está "partida"
  disco(cx, cz, Y - 1, r + 1, (x, z, d) => {
    const xx = z < cz ? x - 1 : x;
    const dd = Math.hypot(xx - cx, z - cz);
    if (z === cz) return M.chora;
    return dd > 6.2 ? M.dsPol.b : dd > 4.6 ? M.dsTela.b : dd > 3.2 ? M.ametista : dd > 1.4 ? M.dsPol.b : M.calcita;
  });
  // cúpula de ardósia, com fresta de luz
  for (let y = Y + 5; y <= Y + 9; y++) {
    const rr = r + 1 - (y - (Y + 4)) * 0.9;
    disco(cx, cz, y, r + 2, (x, z, d) => (d > rr && d <= r + 2 ? M.dsTijolo.b : undefined));
  }
  disco(cx, cz, Y + 10, r + 2, (x, z, d) => (d > 1.5 ? M.dsTijolo.b : M.mar));
  // fragmentos: ametistas flutuando em anel, em alturas escalonadas (surreal, deliberado)
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2; // deslocado: nenhum fragmento no eixo das portas
    S(cx + Math.round(Math.cos(a) * 5.2), Y + 3 + (i % 3) * 2, cz + Math.round(Math.sin(a) * 5.2), M.ametista);
  }
  // pedestal da Memória
  F(cx - 1, Y, cz - 1, cx + 1, Y, cz + 1, M.dsPol.b);
  S(cx, Y + 1, cz, M.dsCinzel);
  S(cx, Y + 2, cz, M.barra);
  // estilhaços de vidro cinza em pé, dispersos num padrão de raios
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const x = cx + Math.round(Math.cos(a) * 5.4), z = cz + Math.round(Math.sin(a) * 5.4);
    F(x, Y, z, x, Y + 1 + (i % 3), z, M.paineis.claro);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    vela(cx + Math.round(Math.cos(a) * 3), Y, cz + Math.round(Math.sin(a) * 3), 2, true, "purple");
  }
  // saída leste
  ar(cx + r, Y, 31, 242, Y + 4, 35);
  yield* pausa();
}

export function* arquivo(H) {
  const { M, F, ar, pausa } = H;
  // massa de ardósia: o arquivo é escavado, não montado
  F(175, -9, 0, 240, 9, 65, M.dsTijolo.b);
  yield;
  yield* atrio(H);
  yield* salao(H);
  yield* cripta(H, 6, -1);
  yield* cripta(H, 60, 1);
  yield* memoria(H);
  yield* silhueta(H);
}

/** O telhado visto de longe: parapeito com ameias, quatro torreões de canto e uma lanterna de vitral azul sobre o Salão */
function* silhueta(H) {
  const { M, F, S, pausa } = H;
  for (let x = 175; x <= 240; x++) for (const z of [0, 65]) { S(x, 10, z, M.dsPol.wall); if (x % 2) S(x, 11, z, M.dsPol.slab); }
  for (let z = 0; z <= 65; z++) for (const x of [175, 240]) { S(x, 10, z, M.dsPol.wall); if (z % 2) S(x, 11, z, M.dsPol.slab); }
  // telhado em faixas: viga polida a cada 8, para não ser uma laje lisa
  for (let x = 176; x <= 239; x += 8) F(x, 9, 1, x, 9, 64, M.dsPol.b);
  for (let z = 8; z <= 57; z += 8) F(176, 9, z, 239, 9, z, M.dsPol.b);
  yield* pausa();
  for (const [cx, cz] of [[177, 2], [238, 2], [177, 63], [238, 63]]) {
    F(cx - 2, 10, cz - 2, cx + 2, 15, cz + 2, M.dsTijolo.b);
    for (let y = 12; y <= 15; y += 3) F(cx - 2, y, cz - 2, cx + 2, y, cz + 2, M.dsPol.b);
    piramide(H, cx, cz, 16, 2, M.dsTijolo);
    S(cx, 19, cz, M.lanternaAlma);
  }
  // lanterna central sobre o Salão: caixa de ardósia com frestas azuis acesas por dentro e telhado em degraus
  F(200, 10, 25, 214, 13, 41, M.dsTijolo.b);
  for (let x = 202; x <= 212; x += 2) for (const z of [25, 41]) { F(x, 11, z, x, 12, z, M.paineis.azul); F(x, 11, z + (z === 25 ? 1 : -1), x, 12, z + (z === 25 ? 1 : -1), M.mar); }
  for (let z = 27; z <= 39; z += 2) for (const x of [200, 214]) { F(x, 11, z, x, 12, z, M.paineis.azul); F(x + (x === 200 ? 1 : -1), 11, z, x + (x === 200 ? 1 : -1), 12, z, M.mar); }
  F(199, 14, 24, 215, 14, 42, M.dsPol.slab);
  F(202, 15, 27, 212, 15, 39, M.dsTijolo.b);
  F(205, 16, 30, 209, 16, 36, M.dsPol.b);
  S(207, 17, 33, M.ametista); S(207, 18, 33, M.cristal); S(207, 19, 33, M.barra);
  yield* pausa();
}

