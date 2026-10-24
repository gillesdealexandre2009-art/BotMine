// @ts-check
// I - O LIMIAR (0..65 x 0..65) e o Portão (62..72). Lavanda e cinza-pérola, névoa leve.
// Composição: um eixo leste-oeste (véu -> plataforma de chegada -> caminho -> pórtico) cruzado por um eixo norte-sul
// (capela ao norte, rotunda ao sul), com dois campos de túmulos em fileiras na cruz. Cantos têm as peças "fora do eixo".
import { LAY, poste, fbm } from "./ecos_mapa_base.js";
import { colinaAlt, solo, tufos } from "./ecos_mapa_terreno.js";

/** colinas baixas de canto (as árvores mortas crescem nelas) */
const COLINAS = [
  { cx: 11, cz: 11, rx: 8, rz: 8, H: 3.4, seed: 11 },
  { cx: 10, cz: 56, rx: 8, rz: 7, H: 3.2, seed: 12 },
  { cx: 50, cz: 58, rx: 8, rz: 6, H: 2.4, seed: 13 },
];
export const altL = (x, z) => COLINAS.reduce((m, c) => Math.max(m, colinaAlt(x, z, c)), 0);

/**
 * Árvore morta esculpida. Os galhos saem do tronco em alturas fixas; nada aleatório.
 * @param {any} H @param {number} x @param {number} z @param {number} y0 @param {"A"|"B"|"C"} v @param {number} [sentido] 1 em pé, -1 de cabeça para baixo
 */
export function arvoreMorta(H, x, z, y0, v, sentido = 1) {
  const { M, S, tronco } = H;
  const L = M.palida.log;
  const T = {
    A: { h: 9, desvio: [], gal: [[5, 1, 0, 3, 2], [6, -1, 0, 3, 2], [8, 0, 1, 2, 1], [7, 0, -1, 3, 2]] },
    B: { h: 10, desvio: [[4, 1, 0], [7, 1, 0]], gal: [[6, -1, 0, 4, 2], [9, 1, 0, 2, 1], [8, 0, -1, 3, 3], [5, 0, 1, 2, 2]] },
    C: { h: 6, desvio: [], gal: [[4, 1, 0, 5, 1], [4, -1, 0, 5, 1], [6, 0, 1, 3, 1], [5, 0, -1, 3, 1]] },
  }[v];
  let tx = x;
  const sy = (n) => y0 + sentido * n;
  /** x do tronco em cada altura (o tronco entorta nos níveis de T.desvio) */
  const txs = [x];
  for (let i = 1; i <= T.h; i++) {
    const antes = tx;
    for (const d of T.desvio) if (d[0] === i) tx += d[1];
    txs[i] = tx;
    tronco(tx, sy(i), z, L);
    if (antes !== tx) tronco(antes, sy(i), z, L); // o tronco entorta sem quebrar: dois blocos no mesmo nível
  }
  const txAt = (n) => txs[Math.min(Math.max(n, 1), T.h)];
  // base grossa 2x2 nos três primeiros blocos e uma cavidade (o tronco é velho)
  for (let i = 1; i <= 3; i++) for (const [dx, dz] of [[1, 0], [0, 1], [1, 1]]) tronco(x + dx, sy(i), z + dz, L);
  if (sentido === 1) S(x, sy(3), z, M.ar);
  // raízes em leque
  /** @type {any[]} */
  const raizes = [[-1, 0, "x"], [1, 0, "x"], [0, -1, "z"], [0, 1, "z"]];
  for (const [dx, dz, ax] of raizes) tronco(x + dx, sy(1), z + dz, L, ax);
  S(x - 1, sy(2), z, L); // contraforte
  for (const [yb, dx, dz, len, rise] of T.gal) {
    let gx = txAt(yb), gy = yb, gz = z;
    for (let i = 1; i <= len; i++) {
      gx += dx;
      gz += dz;
      tronco(gx, sy(gy), gz, L, dx !== 0 ? "x" : "z");
      if (i % rise === 0) {
        gy++;
        tronco(gx, sy(gy), gz, L); // sobe sem cortar a ligação
      }
    }
    tronco(gx, sy(gy + 1), gz, L); // ponta que sobe
    if (sentido === 1) { S(gx, sy(gy), gz + 1, M.musgoPendente); S(gx + 1, sy(gy), gz, M.musgoPendente); }
  }
}

/** Túmulo: 4 modelos que se alternam em diagonal. dz = lado da frente (+1 sul, -1 norte). */
function tumulo(H, x, z, y, tipo, dz, ordem) {
  const { M, S, vela } = H;
  const P = M.pedra;
  S(x, y - 1, z + dz, M.podzol);
  S(x, y - 1, z + 2 * dz, M.podzol);
  if (tipo === 0) {
    S(x, y, z, P.b); S(x, y + 1, z, P.b); S(x, y + 2, z, P.slab);
  } else if (tipo === 1) {
    S(x, y, z, P.b); S(x, y + 1, z, P.b); S(x, y + 2, z, M.sbChis);
    S(x - 1, y + 1, z, P.slab); S(x + 1, y + 1, z, P.slab);
  } else if (tipo === 2) {
    S(x, y, z, M.andesito.b); S(x, y + 1, z, P.wall); S(x, y + 2, z, P.wall); S(x, y + 3, z, P.wall); S(x, y + 4, z, P.slab);
  } else {
    S(x, y, z, P.b); S(x + 1, y, z, P.b); S(x, y + 1, z, P.b); S(x + 1, y + 1, z, P.b);
    S(x, y + 2, z, P.stairs, { weirdo_direction: 0 }); S(x + 1, y + 2, z, P.stairs, { weirdo_direction: 1 });
  }
  if (ordem % 5 === 3) { S(x, y + 2, z, M.ar); S(x, y + 1, z, P.slab); S(x + 1, y, z + dz, M.sbCrack); } // lápide quebrada, o pedaço caído na frente
  if (ordem % 3 === 0) S(x - 1, y, z, M.musgoTapete);
  const flor = [M.allium, M.bluet, M.centaurea][ordem % 3];
  S(x, y, z + 2 * dz, flor);
  if (ordem % 4 === 0) vela(x - 1, y, z + dz, 2, true, "purple");
  else if (ordem % 4 === 2) S(x + 1, y, z + dz, M.rosaNegra);
}

/** Campo de túmulos sobre um plinto baixo (1 bloco), com friso de pedra e entrada em degraus. */
function* campo(H, x1, z1, x2, z2, dz, entradaZ) {
  const { M, F, S, st, pausa } = H;
  const P = M.pedra;
  F(x1, 0, z1, x2, 0, z2, M.terra);
  F(x1 + 1, 1, z1 + 1, x2 - 1, 1, z2 - 1, M.musgo);
  // friso: pedra lisa com uma pedra rachada a cada 5 blocos (ritmo), sem aleatório
  for (let x = x1; x <= x2; x++) for (const z of [z1, z2]) S(x, 1, z, (x - x1) % 5 === 2 ? M.sbCrack : P.b);
  for (let z = z1; z <= z2; z++) for (const x of [x1, x2]) S(x, 1, z, (z - z1) % 5 === 2 ? M.sbCrack : P.b);
  // aleia central de pedra (x 33..35) e entrada
  F(33, 1, z1, 35, 1, z2, M.andesito.b);
  F(34, 1, z1, 34, 1, z2, M.liso.b);
  const sulNorte = dz === 1 ? "n" : "s"; // sobe em direção ao campo
  for (const x of [33, 34, 35]) S(x, 1, entradaZ, M.andesito.stairs, { weirdo_direction: { n: 3, s: 2 }[sulNorte] });
  // fileiras de túmulos: colunas à esquerda e à direita da aleia, 3 fileiras
  const cols = [20, 24, 28, 40, 44, 48];
  const zs = dz === 1 ? [z1 + 3, z1 + 7, z1 + 11] : [z2 - 3, z2 - 7, z2 - 11];
  let n = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols.length; c++) {
      tumulo(H, cols[c], zs[r], 2, (c + 2 * r) % 4, dz, c + r * 2 + n);
    }
    n++;
    yield* pausa();
  }
  // postes de luz na aleia, alternados
  poste(H, 32, zs[0] + dz * 2, 1, "x", M.lanternaAlma);
  poste(H, 36, zs[1] + dz * 2, 1, "x", M.lanternaAlma);
  // bancos de pedra (dois pares) voltados para a aleia
  for (const zz of [zs[0] + dz * 2, zs[2] + dz * 2]) {
    S(30, 2, zz, M.pedra.stairs, { weirdo_direction: 1 }); S(38, 2, zz, M.pedra.stairs, { weirdo_direction: 0 });
    S(30, 2, zz + 1, M.pedra.slab); S(38, 2, zz + 1, M.pedra.slab);
  }
}

function* capela(H) {
  const { M, F, S, ar, st, sl, vela, pendente, tronco, pausa } = H;
  const P = M.pedra, cx = LAY.capela.x;
  const x1 = cx - 7, x2 = cx + 7, zb = 1, zf = 8;
  // piso: faixas de pedra e andesito, e uma passadeira de calcita até o altar
  F(x1, 0, zb, x2, 0, zf + 1, P.b);
  for (let z = zb; z <= zf + 1; z += 2) F(x1 + 1, 0, z, x2 - 1, 0, z, M.andesito.b);
  F(cx - 1, 0, zb, cx + 1, 0, zf + 1, M.calcita);
  // parede do fundo com rosácea
  F(x1, 1, zb, x2, 9, zb, M.tufo.b);
  for (let y = 1; y <= 9; y += 4) F(x1, y, zb, x2, y, zb, M.tufoPol.b);
  ar(cx - 2, 3, zb, cx + 2, 7, zb);
  const rosa = ["..###..", ".#####.", "#######", "###.###", "#######", ".#####.", "..###.."];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (rosa[r][c] === "#") S(cx - 3 + c, 8 - r, zb, (c + r) % 2 ? M.paineis.roxo : M.paineis.azul);
  F(cx - 4, 1, zb, cx - 4, 8, zb, M.tufoPol.b); F(cx + 4, 1, zb, cx + 4, 8, zb, M.tufoPol.b);
  S(cx, 9, zb, M.sbChis);
  // paredes laterais em ruína: degraus de altura decrescente para a frente
  const alt = [7, 7, 6, 6, 4, 4, 3, 2];
  for (let i = 0; i < 8; i++) {
    const z = zb + i;
    for (const x of [x1, x2]) {
      F(x, 1, z, x, alt[i], z, i % 3 === 1 ? M.sbMoss : P.b);
      S(x, alt[i] + 1, z, P.slab);
    }
  }
  // janelas altas laterais (z = 3 e 6) com vitral
  for (const z of [3, 6]) for (const x of [x1, x2]) { ar(x, 3, z, x, 5, z); F(x, 3, z, x, 5, z, M.paineis.roxo); }
  yield* pausa();
  // nervuras do teto: só o lado oeste inteiro, o leste se perdeu (ruína com intenção)
  for (const z of [3, 6]) {
    for (let y = 1; y <= 7; y++) tronco(x1 + 1, y, z, M.palida.log);
    for (const [dx, y] of [[2, 7], [3, 7], [4, 7], [4, 8], [5, 8]]) tronco(x1 + dx, y, z, M.palida.log, dx === 4 && y === 8 ? "y" : "x");
    for (let y = 1; y <= 3; y++) tronco(x2 - 1, y, z, M.palida.log);
  }
  // altar: pedestal de lanterna vazia
  F(cx - 2, 1, 2, cx + 2, 1, 4, P.b);
  F(cx - 1, 2, 2, cx + 1, 2, 3, M.sbChis);
  S(cx, 2, 4, P.b); S(cx, 3, 4, M.sbChis);
  S(cx, 4, 4, M.vaso);
  vela(cx - 2, 2, 2, 3, true, "purple"); vela(cx + 2, 2, 2, 3, true, "purple");
  vela(cx - 2, 2, 4, 2, true, "white"); vela(cx + 2, 2, 4, 2, true, "white");
  // bancos voltados para o altar, cinco fileiras: o leste tem uma cadeira a menos (faltou alguém)
  for (const z of [5, 7]) {
    for (const x of [cx - 5, cx - 4, cx - 3]) st(x, 1, z, P.stairs, "s");
    for (const x of z === 5 ? [cx + 3, cx + 4, cx + 5] : [cx + 3, cx + 4]) st(x, 1, z, P.stairs, "s");
  }
  // lanternas nas ombreiras e uma corrente solta no meio (a lanterna que falta)
  pendente(cx - 6, 7, 2, 2); pendente(cx + 6, 6, 2, 2);
  // degraus de entrada e pilares quebrados na frente (z = 8)
  for (const [x, a] of [[x1 + 1, 5], [x1 + 4, 3], [cx - 3, 2], [cx + 3, 4], [x2 - 4, 2], [x2 - 1, 6]]) {
    F(x, 1, zf, x, a, zf, M.tufoPol.b);
    S(x, a + 1, zf, M.tufoPol.slab);
  }
  for (let x = cx - 1; x <= cx + 1; x++) st(x, 1, zf + 1, P.stairs, "n");
}

function* rotunda(H) {
  const { M, F, S, ar, st, sl, vela, disco, pausa } = H;
  const P = M.pedra, cx = LAY.rotunda.x, cz = LAY.rotunda.z;
  // piso radial: anel exterior de pedra, anel de andesito, miolo de calcita com ametista
  disco(cx, cz, 0, 6.6, (x, z, d) => (d > 5.4 ? P.b : d > 3.4 ? M.andesito.b : d > 1.6 ? M.calcita : M.ametista));
  disco(cx, cz, 0, 4.4, (x, z, d, dx, dz) => (Math.abs(dx) === 0 || Math.abs(dz) === 0 ? M.liso.b : undefined));
  // viga em anel: lajes formando um halo, com o centro aberto
  disco(cx, cz, 7, 6.6, (x, z, d) => (d >= 4.3 ? M.tufoPol.slab : undefined));
  // oito pilares, nenhum no eixo norte-sul (a entrada fica livre)
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const px = cx + Math.round(Math.cos(a) * 5), pz = cz + Math.round(Math.sin(a) * 5);
    S(px, 1, pz, P.b);
    F(px, 2, pz, px, 5, pz, M.calcita);
    S(px, 6, pz, M.sbChis);
    S(px, 7, pz, M.tufoPol.b);
    S(px, 8, pz, M.lanternaAlma);
  }
  // miolo: pedestal de ametista com cristal
  F(cx, 1, cz, cx, 2, cz, M.ametista);
  S(cx, 3, cz, M.ametista);
  S(cx, 4, cz, M.cristal);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { S(cx + dx, 1, cz + dz, M.ametista); S(cx + dx * 2, 1, cz + dz * 2, M.cristal); }
  // velas num anel (ritmo de 8)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    vela(cx + Math.round(Math.cos(a) * 3), 1, cz + Math.round(Math.sin(a) * 3), 1 + (i % 2), true, i % 2 ? "white" : "purple");
  }
  // degraus de acesso ao norte
  for (let x = cx - 1; x <= cx + 1; x++) st(x, 1, cz - 7, P.stairs, "s");
  yield* pausa();
}

/** Ilha flutuante com uma árvore de cabeça para baixo e a poça-espelho no chão. */
function ilha(H, x, z) {
  const { M, F, S, disco } = H;
  const yT = 15;
  disco(x, z, yT, 4.3, (a, b, d) => (d > 3.3 ? M.sbMoss : M.musgo));
  disco(x, z, yT - 1, 3.4, () => M.tufoBase);
  disco(x, z, yT - 2, 2.5, () => M.tufoBase);
  disco(x, z, yT - 3, 1.6, () => M.dsLiso);
  S(x, yT - 4, z, M.dsLiso);
  // em cima: lanterna num poste e flores
  F(x + 1, yT + 1, z, x + 1, yT + 3, z, M.pedra.wall);
  S(x + 1, yT + 4, z, M.lanternaAlma);
  H.flor(x - 2, yT + 1, z + 1, M.allium); H.flor(x - 1, yT + 1, z - 2, M.bluet); H.flor(x + 2, yT + 1, z + 2, M.centaurea);
  // de baixo: a árvore de cabeça para baixo desce do bloco de pedra
  arvoreMorta(H, x, z, yT - 4, "C", -1);
  // poça-espelho no chão, sob a ilha
  disco(x, z, 0, 3.4, (a, b, d) => (d > 2.4 ? M.pedra.b : M.agua));
  disco(x, z, 1, 3.4, (a, b, d) => (d > 2.4 && d <= 3.4 && (a + b) % 2 === 0 ? M.pedra.slab : undefined));
}

/** Canto do coveiro: telheiro de duas águas aberto para o caminho, ferramentas, um túmulo recém-cavado e um carrinho de mão. */
function* aldeiaDoCoveiro(H) {
  const { M, F, S, st, vela, pendente, tronco, pausa } = H;
  const { x, z } = LAY.tuco;
  const x1 = x - 3, x2 = x + 3, z1 = z + 2, z2 = z + 5; // frente em z1 (voltada ao caminho), fundos em z2
  F(x1 - 1, 0, z1 - 1, x2 + 1, 0, z2 + 1, M.pedra.b);
  F(x1, 0, z1, x2, 0, z2, M.palida.planks);
  for (const px of [x1, x2]) for (const pz of [z1, z2]) F(px, 1, pz, px, 3, pz, M.escura.strip);
  F(x1, 1, z2, x2, 3, z2, M.palida.planks); // fundos
  F(x1, 1, z1 + 1, x1, 2, z2 - 1, M.palida.planks); F(x2, 1, z1 + 1, x2, 2, z2 - 1, M.palida.planks); // meias paredes laterais
  F(x1 + 1, 4, z1, x2 - 1, 4, z2, M.escura.planks);
  // telhado de duas águas com cumeeira ao longo de x: escadas escuras, beiral de 1, cumeeira de laje
  for (let k = 0; ; k++) {
    const af = z1 - 1 + k, ab = z2 + 1 - k, y = 4 + k;
    if (af > ab) break;
    if (af === ab) { F(x1 - 1, y, af, x2 + 1, y, af, M.escura.slab); break; }
    for (let xx = x1 - 1; xx <= x2 + 1; xx++) { st(xx, y, af, M.escura.stairs, "s"); st(xx, y, ab, M.escura.stairs, "n"); }
    for (let zz = af + 1; zz <= ab - 1; zz++) for (const xx of [x1, x2]) S(xx, y, zz, M.palida.planks);
  }
  // dentro: grupo de três (barril alto, caixote, caldeirão) e uma lanterna pendurada
  S(x1 + 1, 1, z2 - 1, M.barril); S(x1 + 2, 1, z2 - 1, M.barril); S(x1 + 1, 2, z2 - 1, M.barril);
  S(x2 - 1, 1, z2 - 1, M.caldeirao); S(x2 - 2, 1, z2 - 1, M.hay);
  pendente(x, 3, z1 + 2, 1, M.lanterna);
  // o túmulo recém-cavado: monte de terra, estaca com cruz de madeira e a pá fincada (poste de cerca); uma pilha de terra ao lado
  F(x - 4, 1, z - 2, x - 1, 1, z - 1, M.terraGrossa);
  F(x - 3, 2, z - 2, x - 2, 2, z - 1, M.terraGrossa);
  S(x - 3, 3, z - 2, M.palida.fence); S(x - 3, 4, z - 2, M.palida.fence); S(x - 4, 4, z - 2, M.palida.fence); S(x - 2, 4, z - 2, M.palida.fence);
  S(x + 2, 1, z - 1, M.terraGrossa); S(x + 3, 1, z, M.terraGrossa); S(x + 2, 2, z - 1, M.palida.fence);
  // carrinho de mão: caldeirão sobre laje, duas hastes de cerca e uma roda de laje
  S(x + 3, 1, z + 1, M.caldeirao); S(x + 3, 1, z + 2, M.palida.fence); S(x + 4, 1, z + 1, M.pedra.slab);
  // três lápides antigas em fila (a mais velha afundada) e um banco do lado do telheiro
  for (let i = 0; i < 3; i++) { S(x + 5 + i * 0, 1, z - 4 + i * 2, M.pedra.b); if (i < 2) S(x + 5, 2, z - 4 + i * 2, M.pedra.slab); S(x + 5, 1, z - 3 + i * 2, M.musgoTapete); }
  // caminho de pedra até a plataforma de chegada
  for (let zz = z - 7; zz <= z + 1; zz++) F(x, 0, zz, x + 1, 0, zz, zz % 2 ? M.andesito.b : M.pedra.b);
  vela(x + 2, 1, z + 4, 1, false);
  void tronco;
  yield* pausa();
}

function* veu(H) {
  const { M, F, S, ar, st, sl, vela, pausa } = H;
  const x = LAY.veu.x, zc = LAY.veu.z;
  // arco do véu: pilares duplos, verga em degraus, chave de ametista e um véu de vitral roxo
  for (const dz of [-6, 5]) {
    F(x, 1, zc + dz, x + 1, 1, zc + dz + 1, M.tufo.b);
    F(x, 2, zc + dz, x + 1, 8, zc + dz + 1, M.calcita);
    for (let y = 3; y <= 7; y += 2) F(x, y, zc + dz, x + 1, y, zc + dz + 1, M.tufoPol.b);
    F(x - 1, 1, zc + dz - 1, x + 2, 1, zc + dz + 2, M.tufo.b);
  }
  F(x, 8, zc - 6, x + 1, 9, zc + 6, M.calcita);
  F(x, 10, zc - 4, x + 1, 10, zc + 4, M.tufoPol.b);
  F(x, 11, zc - 2, x + 1, 11, zc + 2, M.tufo.b);
  S(x, 12, zc, M.ametista); S(x + 1, 12, zc, M.ametista); S(x, 13, zc, M.cristal);
  // raio de luz sob a verga: froglight e correntes
  S(x, 7, zc, M.froglight); S(x + 1, 7, zc, M.froglight);
  // meia-lua de degraus invertidos nos cantos (arco)
  /** @type {any[]} */
  const cantos = [[-5, "n"], [4, "s"]];
  for (const [dz, d] of cantos) { st(x, 7, zc + dz, M.tufoPol.stairs, d, true); st(x + 1, 7, zc + dz, M.tufoPol.stairs, d, true); }
  // o véu
  // véu em arco ogival: a cortina de vitral estreita para o alto (9, 9, 9, 9, 7, 5, 3) e a pedra fecha os cantos
  [4, 4, 4, 4, 3, 2, 1].forEach((hw, i) => {
    const y = i + 1;
    F(x, y, zc - hw, x, y, zc + hw, M.paineis.roxo);
    for (let dz = hw + 1; dz <= 4; dz++) { S(x, y, zc - dz, M.tufoPol.b); S(x, y, zc + dz, M.tufoPol.b); }
  });
  F(x, 1, zc, x, 7, zc, M.paineis.branco); // uma fresta de luz branca no meio do véu, de alto a baixo (o limiar da porta)
  // soleira de calcita
  F(x - 1, 0, zc - 3, x + 4, 0, zc + 3, M.calcita);
  for (const dz of [-3, 3]) { vela(x + 3, 1, zc + dz, 3, true, "purple"); vela(x + 2, 1, zc + dz, 2, true, "white"); }
  // trilha até a plataforma de chegada
  F(x + 5, 0, zc - 1, 8, 0, zc + 1, M.calcita);
  F(x + 5, 0, zc - 2, 8, 0, zc - 2, M.pedra.b); F(x + 5, 0, zc + 2, 8, 0, zc + 2, M.pedra.b);
  yield* pausa();
}

function* perimetro(H) {
  const { M, F, S, pausa } = H;
  const P = M.pedra;
  /** muro baixo com pilastras a cada 8, e vãos definidos (ruína) */
  const trecho = (x1, z1, x2, z2, eixo) => {
    const n = eixo === "x" ? x2 - x1 : z2 - z1;
    for (let i = 0; i <= n; i++) {
      const x = eixo === "x" ? x1 + i : x1, z = eixo === "z" ? z1 + i : z1;
      const pil = i % 8 === 0;
      if (pil) {
        F(x, 1, z, x, 3, z, i % 16 === 0 ? M.sbMoss : P.b);
        S(x, 4, z, M.sbChis); S(x, 5, z, M.lanternaAlma);
        continue;
      }
      const vao = (i % 24) > 9 && (i % 24) < 14; // vão de 4 blocos a cada 24
      if (vao) {
        S(x, 1, z, i % 2 ? P.slab : M.pedraMusgo);
        continue;
      }
      S(x, 1, z, P.b); S(x, 2, z, P.wall);
      if (i % 8 === 4) S(x, 3, z, M.musgoTapete);
    }
  };
  trecho(0, 0, 25, 0, "x");
  trecho(43, 0, 65, 0, "x");
  trecho(0, 65, 65, 65, "x");
  trecho(0, 0, 0, 65, "z");
  trecho(65, 0, 65, 25, "z");
  trecho(65, 40, 65, 65, "z");
  // canteiros ao pé de cada pilastra (ritmo): três flores
  for (let i = 8; i <= 56; i += 8) {
    if (i < 24 || i > 44) { H.flor(i, 1, 2, M.allium); H.flor(i + 1, 1, 2, M.bluet); H.flor(i - 1, 1, 2, M.centaurea); }
    if (i < 24 || i > 44) { H.flor(i, 1, 63, M.allium); H.flor(i + 1, 1, 63, M.centaurea); H.flor(i - 1, 1, 63, M.bluet); }
  }
  yield* pausa();
}

function* caminho(H) {
  const { M, F, S, disco, vela, pausa } = H;
  const P = M.pedra, zc = LAY.caminhoZ;
  // plataforma de chegada: círculo com bússola de calcita e ametista
  disco(LAY.chegada.x, zc, 0, 4.6, (x, z, d, dx, dz) => {
    if (d <= 1.5) return M.calcita;
    if (d > 3.7) return P.b;
    if ((dx === 0 || dz === 0) || Math.abs(Math.abs(dx) - Math.abs(dz)) === 0 && d > 2) return M.ametista;
    return M.andesito.b;
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    vela(LAY.chegada.x + Math.round(Math.cos(a) * 3.6), 1, zc + Math.round(Math.sin(a) * 3.6), 1 + (i % 2), true, i % 2 ? "white" : "purple");
  }
  // o caminho largo: faixa central lisa, bordas de pedra, meio-fio de lajes e medalhões de calcita
  for (let x = 17; x <= 61; x++) {
    F(x, 0, zc - 2, x, 0, zc + 2, M.andesito.b);
    F(x, 0, zc - 1, x, 0, zc + 1, M.liso.b);
    S(x, 0, zc - 2, P.b); S(x, 0, zc + 2, P.b);
    S(x, 1, zc - 3, P.slab); S(x, 1, zc + 3, P.slab);
    const n = fbm(x, 5, 77, 6, 2);
    if (n > 0.67) { S(x, 0, zc - 1, M.sbCrack); S(x, 0, zc + 2, M.sbCrack); }
    if (n < 0.22) { S(x, 0, zc + 1, M.sbMoss); S(x, 0, zc - 2, M.sbMoss); }
  }
  for (const [cx, r] of [[24, 1], [34, 2], [44, 1]]) {
    for (let x = cx - r; x <= cx + r; x++) F(x, 0, zc - r, x, 0, zc + r, M.calcita);
    S(cx, 0, zc, M.ametista);
  }
  // sebes baixas (folha florida) ladeando o caminho, com vãos nas aleias; flores em tufos regulares
  for (let x = 18; x <= 61; x++) {
    if (x >= 32 && x <= 36) continue;
    for (const z of [zc - 4, zc + 4]) {
      S(x, 1, z, M.folhaPalida);
      if (x % 6 === 0) S(x, 2, z, M.folhaPalida);
    }
  }
  // postes em T, alternando os lados (ritmo N S N S)
  poste(H, 20, zc - 7, 0, "x", M.lanternaAlma);
  poste(H, 28, zc + 7, 0, "x", M.lanternaAlma);
  poste(H, 40, zc - 7, 0, "x", M.lanternaAlma);
  poste(H, 52, zc + 7, 0, "x", M.lanternaAlma);
  poste(H, 58, zc - 7, 0, "x", M.lanternaAlma);
  yield* pausa();
}

export function* limiar(H) {
  const { M, F, S, pausa } = H;
  // terreno: terra por baixo e musgo-pálido por cima
  F(0, -1, 0, 65, -1, 65, M.terra);
  F(0, 0, 0, 65, 0, 65, M.musgo);
  yield;
  // colinas de canto e manchas de terra pelo gramado (ruído de baixa frequência: nada de pontinhos)
  const topo = (x, z, h, inc) => (inc >= 2 ? M.podzol : M.musgo);
  yield* solo(H, 1, 1, 20, 21, altL, topo, M.terra);
  yield* solo(H, 1, 48, 19, 64, altL, topo, M.terra);
  yield* solo(H, 41, 51, 60, 64, altL, topo, M.terra);
  yield;
  // manchas de terreno desenhadas: elipses de cascalho/podzol em volta das construções (não ao acaso)
  H.disco(LAY.chegada.x, LAY.caminhoZ, 0, 7.5, (x, z, d) => (d > 5.2 && (x + z) % 3 === 0 ? M.cascalho : undefined));
  yield* perimetro(H);
  yield* veu(H);
  yield* caminho(H);
  yield* campo(H, 17, 12, 51, 26, 1, 26);
  yield* campo(H, 17, 38, 51, 51, -1, 38);
  yield* capela(H);
  yield* rotunda(H);
  yield* aldeiaDoCoveiro(H);
  yield* pausa();
  // túmulo sem nome (E03): monte redondo, cerca de folhas, uma lápide lisa, rosa-negra e a árvore que o cobre
  const { x: nx, z: nz } = LAY.semNome;
  H.disco(nx, nz, 1, 3.4, (x, z, d) => (d > 2.4 ? M.musgo : M.podzol));
  H.disco(nx, nz, 0, 3.4, () => M.terra);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const hx = nx + Math.round(Math.cos(ang) * 4.2), hz = nz + Math.round(Math.sin(ang) * 4.2);
    if (hz > nz + 2 && Math.abs(hx - nx) <= 1) continue;
    S(hx, 1, hz, M.folhaFlor);
  }
  S(nx, 2, nz, M.liso.b); S(nx, 3, nz, M.liso.b); S(nx, 4, nz, M.liso.slab);
  S(nx, 2, nz + 1, M.rosaNegra); H.vela(nx + 1, 2, nz + 1, 1, false);
  arvoreMorta(H, nx + 3, nz - 2, 1, "B");
  yield* pausa();
  // árvores mortas esculpidas, nos cantos e como pano de fundo (silhuetas diferentes lado a lado)
  arvoreMorta(H, 8, 56, Math.round(altL(8, 56)), "B");
  arvoreMorta(H, 22, 5, 0, "C");
  arvoreMorta(H, 47, 6, 0, "A");
  arvoreMorta(H, 58, 58, 0, "C");
  yield* pausa();
  ilha(H, 57, 48);
  yield* pausa();
  yield* arredores(H);
}

/** Trilha de pedras de passagem (uma sim, uma não) entre dois pontos em L */
function trilha(H, x1, z1, x2, z2) {
  const { M, S } = H;
  let i = 0;
  const passo = (x, z) => { if (i++ % 2 === 0) S(x, 0, z, M.pedra.b); else S(x, 0, z, M.andesito.b); };
  for (let x = x1; x !== x2; x += Math.sign(x2 - x1)) passo(x, z1);
  for (let z = z1; z !== z2; z += Math.sign(z2 - z1)) passo(x2, z);
  passo(x2, z2);
}

/** Bosque: três árvores mortas de silhuetas diferentes, num triângulo, com flores aos pés */
function bosque(H, x, z, ordem) {
  const { M, S } = H;
  /** @type {("A" | "B" | "C")[]} */
  const v = ["A", "B", "C"];
  arvoreMorta(H, x, z, Math.round(altL(x, z)), v[ordem % 3]);
  arvoreMorta(H, x + 10, z + 6, Math.round(altL(x + 10, z + 6)), v[(ordem + 1) % 3]);
  for (const [dx, dz, f] of [[3, 3, M.allium], [4, 2, M.bluet], [5, 4, M.centaurea], [7, 5, M.allium], [1, 3, M.rosaNegra], [8, 8, M.bluet]]) H.flor(x + dx, Math.round(altL(x + dx, z + dz)) + 1, z + dz, f);
}

function* arredores(H) {
  const { M, F, S, st, vela, pausa } = H;
  // faixas de flores lavanda ladeando o caminho (entre a sebe e os campos), em ritmo de três, com um tom mais forte a cada sexta
  for (let x = 18; x <= 60; x++) {
    if (x >= 32 && x <= 36) continue;
    if (x === 56) continue; // aqui passa a trilha de pedras
    for (const z of [27, 37]) H.flor(x, 1, z, x % 6 === 0 ? M.centaurea : x % 3 === 0 ? M.bluet : M.allium);
    if (x > 52) for (const z of [26, 38]) H.flor(x, 1, z, x % 3 === 0 ? M.bluet : M.allium);
  }
  // trilhas até o túmulo sem nome, a ilha e o canto do coveiro
  trilha(H, 56, 27, 56, 13);
  trilha(H, 56, 37, 56, 44);
  // bosques de canto e bancos de pedra em frente a eles
  bosque(H, 4, 4, 0);
  bosque(H, 4, 50, 1);
  bosque(H, 40, 56, 2);
  // capim e flores lilás em manchas pelo gramado livre (nunca sobre caminho, campo, capela, rotunda ou casa)
  tufos(H, [[2, 2, 64, 63]], [[0, 24, 22, 42], [14, 38, 22, 49], [16, 10, 52, 27], [16, 37, 52, 52], [24, 0, 44, 11], [25, 50, 43, 65], [0, 26, 66, 38], [53, 3, 63, 14], [52, 42, 62, 55], [60, 0, 65, 65], [0, 0, 1, 65], [0, 63, 65, 65], [0, 0, 65, 2]], altL, 91, { limiar: 0.6, flor: 0.28, apoio: M.podzol, flores: [M.allium, M.bluet, M.centaurea, M.allium] });
  for (const [x, z] of [[8, 24], [8, 40]]) { st(x, 1, z, M.pedra.stairs, "s"); st(x + 1, 1, z, M.pedra.stairs, "s"); H.lajeAlta(x - 1, 1, z, M.pedra.slab); H.lajeAlta(x + 2, 1, z, M.pedra.slab); vela(x - 1, 2, z, 1, true, "purple"); vela(x + 2, 2, z, 1, true, "white"); }
  yield* pausa();
}

/** Pórtico (62..72): dois pilones altos de faixas, verga pesada com arco, cortina de lanternas e a avenida até a Vila. */
export function* portao(H) {
  const { M, F, S, ar, st, sl, vela, pendente, pausa } = H;
  const zc = LAY.caminhoZ;
  F(62, -1, 0, 72, -1, 65, M.terra);
  F(62, 0, 0, 72, 0, 65, M.musgo);
  // avenida
  for (let x = 62; x <= 72; x++) {
    F(x, 0, zc - 2, x, 0, zc + 2, M.andesito.b);
    F(x, 0, zc - 1, x, 0, zc + 1, M.liso.b);
    S(x, 0, zc - 2, M.pedra.b); S(x, 0, zc + 2, M.pedra.b);
    S(x, 1, zc - 3, M.pedra.slab); S(x, 1, zc + 3, M.pedra.slab);
  }
  for (const zz of [zc - 4, zc + 4]) F(62, 1, zz, 72, 1, zz, M.folhaPalida);
  for (let x = 66; x <= 72; x++) for (const z of [0, 65]) { S(x, 1, z, M.pedra.b); S(x, 2, z, M.pedra.wall); }
  // pilones: base larga, fuste com faixas de calcita a cada 3, cornija saliente, coroa com cristais
  for (const z0 of [zc - 7, zc + 5]) {
    F(62, 1, z0 - 1, 66, 2, z0 + 3, M.tufo.b);
    F(63, 3, z0, 65, 9, z0 + 2, M.tufo.b);
    for (let y = 4; y <= 9; y += 3) F(63, y, z0, 65, y, z0 + 2, M.calcita);
    F(64, 3, z0, 64, 9, z0 + 2, M.tufoPol.b);
    F(62, 10, z0 - 1, 66, 11, z0 + 3, M.tufoPol.b);
    F(62, 12, z0 - 1, 66, 12, z0 + 3, M.tufoPol.slab);
    F(63, 12, z0, 65, 13, z0 + 2, M.calcita);
    S(64, 14, z0 + 1, M.froglight);
    for (const [dx, dz] of [[63, 0], [65, 0], [63, 2], [65, 2]]) S(dx, 14, z0 + dz, M.cristal);
    S(62, 3, z0 + 1, M.cristal); S(66, 3, z0 + 1, M.cristal);
    st(61, 1, z0 + 1, M.tufoPol.stairs, "e"); st(67, 1, z0 + 1, M.tufoPol.stairs, "w");
    vela(61, 1, z0, 3, true, "purple"); vela(67, 1, z0 + 2, 3, true, "purple");
  }
  // verga de três camadas, em arco por dentro
  F(62, 9, zc - 7, 66, 11, zc + 7, M.tufoPol.b);
  F(63, 9, zc - 7, 65, 9, zc + 7, M.calcita);
  F(63, 12, zc - 5, 65, 12, zc + 5, M.tufoPol.slab);
  F(63, 13, zc - 3, 65, 13, zc + 3, M.calcita);
  F(64, 14, zc - 1, 64, 14, zc + 1, M.tufoPol.b);
  S(64, 15, zc, M.ametista); S(64, 16, zc, M.cristal);
  ar(62, 1, zc - 4, 66, 8, zc + 4);
  /** @type {any[]} */
  const arcos = [[-4, "n"], [4, "s"], [-3, "n"], [3, "s"]];
  for (const [dz, d] of arcos) for (let x = 63; x <= 65; x++) { st(x, 8, zc + dz, M.tufoPol.stairs, d, true); }
  // cortina de lanternas, em curva
  [1, 2, 3, 3, 3, 2, 1].forEach((n, i) => pendente(64, 8, zc - 3 + i, n, i === 3 ? M.lanternaAlma : M.lanterna));
  // postes de entrada na avenida
  poste(H, 69, zc - 6, 0, "x", M.lanterna);
  poste(H, 69, zc + 6, 0, "x", M.lanterna);
  yield* pausa();
}
