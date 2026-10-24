// @ts-check
// II - A VILA SILENCIOSA (70..165 x 0..75). Poente quente e parado: reboco claro, madeira escura, telhados de tijolo.
// Rua larga leste-oeste, praça circular (poço, cadeiras vazias, gêmeos), torre do sino com relógio sem ponteiros ao norte,
// feira vazia ao sul, casas todas diferentes (ecos_mapa_casas.js), hortas e ruelas atrás, colinas baixas e abetos nas bordas.
import { LAY, poste, OPOSTA, piramide, fbm, suave, hash2 } from "./ecos_mapa_base.js";
import { casa, quintal } from "./ecos_mapa_casas.js";
import { solo, tufos } from "./ecos_mapa_terreno.js";

const SEED = 4107;
/** colinas baixas nas bordas norte (z<8) e sul (z>67): sobem até 3-4 blocos atrás das hortas */
export const altVila = (x, z) => {
  const b = Math.max(Math.max(0, (8 - z) / 8), Math.max(0, (z - 67) / 8));
  if (b <= 0) return 0;
  return suave(Math.min(1, b)) * (1.2 + 3.6 * fbm(x, z, SEED, 14, 2));
};

function* rua(H) {
  const { M, F, S, disco, pausa } = H;
  const P = M.pedra;
  F(70, -1, 0, 165, -1, 75, M.terra);
  F(70, 0, 0, 165, 0, 75, M.grama);
  yield;
  // colinas das bordas: grama em cima, terra grossa onde a encosta é íngreme
  const topo = (x, z, h, inc) => (inc >= 2 ? M.podzol : h > 0 && fbm(x, z, SEED + 9, 5, 2) > 0.7 ? M.terraGrossa : M.grama);
  yield* solo(H, 70, 0, 165, 8, altVila, topo, M.terra);
  yield* solo(H, 70, 66, 165, 75, altVila, topo, M.terra);
  const zc = LAY.rua.z;
  // rua: faixa central lisa, bordas de pedra, meio-fio de lajes; um pouco de pedra rachada e musgo em manchas (desgaste com causa: o meio-fio)
  for (let x = 70; x <= 165; x++) {
    if (x > 111 && x < 133) continue;
    F(x, 0, zc - 2, x, 0, zc + 2, M.andesito.b);
    F(x, 0, zc - 1, x, 0, zc + 1, M.liso.b);
    S(x, 0, zc - 2, P.b); S(x, 0, zc + 2, P.b);
    S(x, 1, zc - 3, P.slab); S(x, 1, zc + 3, P.slab);
    if ((x - 74) % 16 < 1) F(x, 0, zc - 1, x, 0, zc + 1, M.calcita);
    const n = fbm(x, 3, SEED + 21, 6, 2);
    if (n > 0.66) { S(x, 0, zc - 2, M.sbCrack); S(x, 0, zc + 1, M.sbCrack); }
    if (n < 0.24) { S(x, 0, zc + 2, M.sbMoss); S(x, 0, zc - 1, M.andesito.b); }
  }
  // praça: círculo em três anéis, com raios de calcita
  const { x: px, z: pz, r } = LAY.praca;
  disco(px, pz, 0, r, (x, z, d, dx, dz) => {
    if (d > r - 1.2) return P.b;
    const diag = Math.abs(Math.abs(dx) - Math.abs(dz)) === 0 && d > 3;
    if (dx === 0 || dz === 0 || diag) return d > 3.2 ? M.calcita : undefined;
    if (d > 6.5) return fbm(x, z, SEED + 31, 5, 2) > 0.7 ? M.sbCrack : M.andesito.b;
    return M.liso.b;
  });
  // canteiros baixos nas diagonais da praça, entre os postes: pedra, terra e flores de uma cor só
  for (const [sx, sz, f] of [[-1, -1, M.allium], [1, -1, M.centaurea], [-1, 1, M.bluet], [1, 1, M.allium]]) {
    const cx = px + sx * 8, cz = pz + sz * 4;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) { S(cx, 0, cz, M.podzol); S(cx, 1, cz, f); continue; }
      S(cx + dx, 1, cz + dz, P.slab);
      S(cx + dx, 0, cz + dz, P.b);
    }
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) poste(H, px + sx * 8, pz + sz * 7, 0, "x", M.lanterna);
  yield* pausa();
}

function* poco(H) {
  const { M, F, S, st, disco, pausa } = H;
  const { x: px, z: pz } = LAY.praca;
  disco(px, pz, 1, 3.2, (x, z, d) => (d > 1.8 ? M.pedra.b : undefined));
  disco(px, pz, 2, 3.2, (x, z, d) => (d > 2.2 ? M.pedra.slab : undefined));
  disco(px, pz, 0, 1.8, () => M.agua);
  disco(px, pz, -1, 1.8, () => M.pedra.b);
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) F(px + dx, 2, pz + dz, px + dx, 6, pz + dz, M.escura.fence);
  piramide(H, px, pz, 6, 3, M.tijolo);
  F(px - 2, 6, pz - 2, px + 2, 6, pz - 2, M.escura.slab);
  // balde: corrente e nada na ponta (o balde sumiu)
  S(px, 6, pz, M.corrente); S(px, 5, pz, M.corrente); S(px, 4, pz, M.corrente);
  // cadeiras vazias em círculo, voltadas para o poço (a rua passa sem cadeiras)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dx = Math.round(Math.cos(a) * 6.6), dz = Math.round(Math.sin(a) * 6.6);
    if (Math.abs(dz) <= 3 && Math.abs(dx) > 4) continue;
    const dirAlto = OPOSTA[H.paraCentro(dx, dz)];
    st(px + dx, 1, pz + dz, M.escura.stairs, dirAlto);
    if (i % 4 === 1) H.vela(px + Math.round(Math.cos(a) * 7.8), 1, pz + Math.round(Math.sin(a) * 7.8), 1, false);
  }
  // gêmeos: dois pedestais iguais, um de cada lado do eixo da rua
  for (const dz of [-5, 5]) {
    const gx = px + 8, gz = pz + dz;
    F(gx - 1, 1, gz - 1, gx + 1, 1, gz + 1, M.pedra.b);
    F(gx, 2, gz, gx, 5, gz, M.calcita);
    S(gx, 6, gz, M.sbChis);
    S(gx, 7, gz, M.lanterna);
    H.vela(gx - 1, 2, gz, 2, false); H.vela(gx + 1, 2, gz, 2, false);
  }
  yield* pausa();
}

/** Torre do sino em estágios: soco com talude, base maciça com contrafortes de canto, estágio do relógio, sineira aberta, cornija e flecha. */
function* torre(H) {
  const { M, F, S, ar, st, disco, pausa } = H;
  const P = M.pedra, T = M.tufo, TP = M.tufoPol;
  const { x: tx, z: tz } = LAY.torre;
  const x1 = tx - 3, x2 = tx + 3, z1 = tz - 3, z2 = tz + 3;
  // adro de pedra até a praça
  F(x1 - 3, 0, z1 - 3, x2 + 3, 0, z2 + 3, P.b);
  F(x1 - 2, 0, z1 - 2, x2 + 2, 0, z2 + 2, M.andesito.b);
  F(tx - 1, 0, z2 + 1, tx + 1, 0, 28, M.liso.b);
  F(tx - 1, 0, 24, tx + 1, 0, 26, M.liso.b);
  // talude (soco): degrau de escadas voltadas para a torre em volta
  for (let x = x1 - 1; x <= x2 + 1; x++) { st(x, 1, z1 - 1, P.stairs, "s"); st(x, 1, z2 + 1, P.stairs, "n"); }
  for (let z = z1; z <= z2; z++) { st(x1 - 1, 1, z, P.stairs, "e"); st(x2 + 1, 1, z, P.stairs, "w"); }
  // fuste: base maciça (1-8), estágio do relógio (9-15)
  F(x1, 1, z1, x2, 16, z2, P.b);
  ar(x1 + 1, 1, z1 + 1, x2 - 1, 21, z2 - 1);
  // quinas de tufo e contrafortes de canto em degraus (2 de saliência embaixo, 1 no meio, 0 no topo)
  for (const [qx, qz, sx, sz] of [[x1, z1, -1, -1], [x2, z1, 1, -1], [x1, z2, -1, 1], [x2, z2, 1, 1]]) {
    F(qx, 1, qz, qx, 22, qz, T.b);
    for (const [ex, ez] of [[sx, 0], [0, sz]]) {
      F(qx + ex, 2, qz + ez, qx + ex, 5, qz + ez, T.b);
      S(qx + ex, 6, qz + ez, T.slab);
      S(qx + ex * 2, 2, qz + ez * 2, T.b); S(qx + ex * 2, 3, qz + ez * 2, T.slab);
    }
  }
  // frisos: faixa polida a cada estágio e dentículos de escadas invertidas sob o friso do sino
  for (const y of [8, 16]) F(x1, y, z1, x2, y, z2, TP.b);
  for (let x = x1; x <= x2; x += 2) { st(x, 15, z1 - 1, P.stairs, "s", true); st(x, 15, z2 + 1, P.stairs, "n", true); }
  for (let z = z1; z <= z2; z += 2) { st(x1 - 1, 15, z, P.stairs, "e", true); st(x2 + 1, 15, z, P.stairs, "w", true); }
  for (let y = 3; y <= 13; y += 2) { S(x1, y, z1 + 3, M.sbMoss); S(x2, y, z1 + 3, M.sbMoss); }
  // dentro do pé da torre: atril sob a corda do sino e quatro velas apagadas
  S(tx, 1, tz, M.atril);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) H.vela(tx + a * 2, 1, tz + b * 2, 1, false);
  // porta em arco de 3, com ombros de escada invertida e lanternas em postes
  ar(tx - 1, 1, z2, tx + 1, 3, z2); ar(tx, 4, z2, tx, 4, z2);
  st(tx - 1, 4, z2, P.stairs, "e", true); st(tx + 1, 4, z2, P.stairs, "w", true);
  for (const dx of [-2, 2]) { F(tx + dx, 1, z2 + 1, tx + dx, 3, z2 + 1, P.wall); S(tx + dx, 4, z2 + 1, M.lanterna); }
  // frestas (1x2) em ritmo nas faces sem relógio; uma janela âmbar acesa (a única luz da vila velha) na face leste
  for (const dz of [-2, 2]) { F(x1, 10, tz + dz, x1, 11, tz + dz, M.painel); F(x2, 10, tz + dz, x2, 11, tz + dz, dz < 0 ? M.paineis.ambar : M.painel); }
  for (const dx of [-2, 2]) F(tx + dx, 10, z1, tx + dx, 11, z1, M.painel);
  // relógio sem ponteiros (surreal): anel de calcita, face escura, quatro marcas douradas e nenhum ponteiro
  const cy = 12, cz = z2 + 1;
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
    const d = Math.hypot(dx, dy);
    if (d > 3.55) continue;
    if (d > 2.6) S(tx + dx, cy + dy, cz, M.calcita);
    else S(tx + dx, cy + dy, z2, M.dsTijolo.b);
  }
  for (const [dx, dy] of [[0, 2], [0, -2], [2, 0], [-2, 0]]) S(tx + dx, cy + dy, z2, M.ouro);
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) S(tx + dx, cy + dy, z2, M.dsTela.b);
  // sineira: pilares nas quinas e arcos de 3 de vão em cada face (ombros de escada invertida), piso de laje
  for (let y = 17; y <= 21; y++) F(x1, y, z1, x2, y, z2, P.b);
  ar(x1 + 1, 17, z1 + 1, x2 - 1, 21, z2 - 1);
  for (const [lado] of [["n"], ["s"], ["l"], ["r"]]) {
    for (let k = -1; k <= 1; k++) {
      const pos = (y) => (lado === "n" ? [tx + k, y, z1] : lado === "s" ? [tx + k, y, z2] : lado === "l" ? [x1, y, tz + k] : [x2, y, tz + k]);
      for (let y = 18; y <= 20; y++) { const [a, b, c] = pos(y); S(a, b, c, M.ar); }
    }
    const sh = (k) => (lado === "n" ? [tx + k, 21, z1] : lado === "s" ? [tx + k, 21, z2] : lado === "l" ? [x1, 21, tz + k] : [x2, 21, tz + k]);
    const dirs = lado === "n" || lado === "s" ? ["e", "w"] : ["s", "n"];
    const [a1, b1, c1] = sh(-1), [a2, b2, c2] = sh(1);
    st(a1, b1, c1, P.stairs, dirs[0], true); st(a2, b2, c2, P.stairs, dirs[1], true);
    const [a0, b0, c0] = sh(0); S(a0, b0, c0, M.ar);
  }
  // viga e corda do sino (o badalo não está)
  for (let x = x1 + 1; x <= x2 - 1; x++) H.tronco(x, 21, tz, M.escura.strip, "x");
  S(tx, 20, tz, M.corrente); S(tx, 19, tz, M.corrente); S(tx, 18, tz, M.corrente);
  S(tx, 17, tz, M.lanternaAlma);
  // cornija em balanço e flecha de tijolo com ponta de luz
  for (let x = x1 - 1; x <= x2 + 1; x++) { st(x, 22, z1 - 1, P.stairs, "s", true); st(x, 22, z2 + 1, P.stairs, "n", true); }
  for (let z = z1; z <= z2; z++) { st(x1 - 1, 22, z, P.stairs, "e", true); st(x2 + 1, 22, z, P.stairs, "w", true); }
  F(x1, 22, z1, x2, 22, z2, TP.b);
  piramide(H, tx, tz, 23, 4, M.tijolo);
  F(tx, 28, tz, tx, 31, tz, T.wall);
  S(tx, 32, tz, M.barra);
  // luz suave nos cantos do adro
  for (const [a, b] of [[x1 - 3, z2 + 3], [x2 + 3, z2 + 3]]) poste(H, a, b, 0, "x", M.lanterna);
  void disco;
  yield* pausa();
}

function* feira(H) {
  const { M, F, S, st, vela, pendente, pausa } = H;
  const z = 48;
  F(110, 0, 44, 134, 0, 50, M.andesito.b);
  F(110, 0, 44, 134, 0, 44, M.pedra.b); F(110, 0, 50, 134, 0, 50, M.pedra.b);
  for (let i = 0; i < 5; i++) {
    const x = 112 + i * 5;
    for (const dx of [0, 3]) for (const dz of [0, 2]) F(x + dx, 1, z + dz - 1, x + dx, 3, z + dz - 1, M.escura.fence);
    // toldo de lã listrado, com caimento para a frente (laje de lã em duas fileiras)
    for (let dx = -1; dx <= 4; dx++) {
      const cor = (dx + 1) % 2 ? "white" : (i % 2 ? "orange" : "red");
      for (let dz = 0; dz <= 2; dz++) S(x + dx, 4, z + dz - 1, M.pano(cor));
      S(x + dx, 3, z - 2, M.pano(cor));
    }
    F(x + 1, 1, z - 1, x + 2, 1, z - 1, M.escura.planks);
    if (i === 0) { S(x + 1, 2, z - 1, M.vaso); S(x + 2, 2, z - 1, M.vaso); S(x + 1, 1, z + 1, M.barril); S(x + 2, 1, z + 1, M.barril); S(x + 1, 2, z + 1, M.hay); }
    if (i === 1) { for (const dx of [1, 2]) { S(x + dx, 2, z - 1, M.vaso); S(x + dx, 1, z + 1, M.hay); } vela(x + 1, 2, z + 1, 1, false); }
    if (i === 2) { vela(x + 1, 2, z - 1, 2, false); vela(x + 2, 2, z - 1, 1, false); S(x + 1, 1, z + 1, M.caldeirao); S(x + 2, 1, z + 1, M.estante); S(x + 2, 2, z + 1, M.estante); }
    if (i === 3) { S(x + 1, 2, z - 1, M.atril); S(x + 2, 2, z - 1, M.vaso); F(x + 1, 1, z + 1, x + 2, 3, z + 1, M.estante); }
    if (i === 4) { st(x + 1, 1, z, M.escura.stairs, "s"); vela(x + 1, 2, z - 1, 1, false); } // uma cadeira, vazia
    pendente(x + 1, 3, z, 1, M.lanterna);
  }
  yield* pausa();
}

/** Varais e bandeirolas: panos de lã pendurados em correntes entre postes (festa que ninguém desmontou). */
function* varais(H) {
  const { M, F, S, pausa } = H;
  for (const [x1, x2, z] of [[94, 102, 12], [130, 140, 12], [140, 150, 60]]) {
    F(x1, 1, z, x1, 4, z, M.escura.fence); F(x2, 1, z, x2, 4, z, M.escura.fence);
    for (let x = x1 + 1; x < x2; x++) S(x, 4, z, M.corrente, { pillar_axis: "x" });
    for (let x = x1 + 2; x < x2; x += 2) {
      S(x, 3, z, M.pano(((x - x1) / 2) % 2 ? "white" : "red"));
      S(x, 2, z, M.pano(((x - x1) / 2) % 2 ? "white" : "red"));
    }
  }
  // bandeirolas atravessando a rua, entre postes altos (cores alternadas, um pano caído no chão)
  for (const x of [88, 142]) {
    for (const z of [28, 36]) { F(x, 1, z, x, 7, z, M.escura.fence); S(x, 8, z, M.lanterna); }
    for (let zz = 29; zz <= 35; zz++) S(x, 7, zz, M.corrente, { pillar_axis: "z" });
    [30, 32, 34].forEach((zz, i) => { S(x, 6, zz, M.pano(["orange", "white", "red"][(i + (x > 100 ? 1 : 0)) % 3])); });
    S(x + 1, 1, 33, M.pano("white")); // o pano caído
  }
  yield* pausa();
}

/** Árvore de rua em canteiro de pedra; três silhuetas (redonda, esguia, de duas copas) para não repetir. */
function arvoreRua(H, x, z, tipo) {
  const { M, F, S, copa } = H;
  F(x - 1, 0, z - 1, x + 1, 0, z + 1, M.pedra.b);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S(x + dx, 1, z + dz, M.pedra.slab);
  S(x, 0, z, M.terra);
  const L = M.palida.log;
  if (tipo === 0) {
    F(x, 1, z, x, 5, z, L);
    copa(x, 6, z, 3, 2, 3, M.folhaAzalea, (a, b, c) => Math.abs(a) === 3 && Math.abs(c) === 3);
    S(x + 1, 5, z, L);
  } else if (tipo === 1) {
    F(x, 1, z, x, 7, z, L);
    copa(x, 8, z, 2, 3, 2, M.folhaAzalea, (a, b, c) => Math.abs(a) === 2 && Math.abs(c) === 2);
    copa(x + 1, 5, z, 2, 1, 1, M.folhaAzalea);
  } else {
    F(x, 1, z, x, 4, z, L);
    S(x - 1, 4, z, L); S(x + 1, 4, z, L); S(x - 1, 5, z, L); S(x + 1, 5, z, L);
    copa(x - 1, 7, z, 2, 2, 2, M.folhaAzalea, (a, b, c) => Math.abs(a) === 2 && Math.abs(c) === 2);
    copa(x + 2, 6, z, 2, 2, 2, M.folhaAzalea, (a, b, c) => Math.abs(a) === 2 && Math.abs(c) === 2);
  }
}

function* arvores(H) {
  const { pausa } = H;
  [[84, 28, 0], [96, 36, 1], [108, 28, 2], [133, 36, 0], [148, 28, 1], [160, 36, 2], [80, 37, 1], [102, 37, 0]].forEach(([x, z, t]) => arvoreRua(H, x, z, t));
  yield* pausa();
}

/** Abeto escuro em camadas (como os do lobby), altura h, com base em y0 (as colinas sobem o chão) */
export function abeto(H, x, z, h, y0 = 0) {
  const { M, F, folha } = H;
  F(x, y0 + 1, z, x, y0 + h, z, M.abeto.log);
  for (let t = 0; t <= h - 3; t++) {
    const r = Math.min(3, Math.ceil((t + 1) / 2));
    const y = y0 + h + 1 - t;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > r + (r > 1 ? 1 : 0) || (dx === 0 && dz === 0 && y <= y0 + h)) continue;
      folha(x + dx, y, z + dz, M.folhaAbeto);
    }
  }
}

/** Horta cercada: canteiros de terra em fileiras, com flores, e um espantalho de fardo e lã */
function horta(H, x, z, w, d, flor) {
  const { M, F, S } = H;
  F(x - 1, 0, z - 1, x + w, 0, z + d, M.terraGrossa);
  for (let i = 0; i < w; i += 2) {
    F(x + i, 0, z, x + i, 0, z + d - 1, M.podzol);
    for (let j = 0; j < d; j += 2) S(x + i, 1, z + j, (i / 2 + j / 2) % 3 === 0 ? M.bluet : flor);
  }
  for (let i = -1; i <= w; i++) { S(x + i, 1, z - 1, M.palida.fence); S(x + i, 1, z + d, M.palida.fence); }
  for (let j = 0; j < d; j++) { S(x - 1, 1, z + j, M.palida.fence); S(x + w, 1, z + j, M.palida.fence); }
  // espantalho no meio: poste, fardo e lã (um por duas hortas)
  if ((x + z) % 2 === 0) { F(x + 3, 1, z + 2, x + 3, 2, z + 2, M.palida.fence); S(x + 3, 3, z + 2, M.hay); S(x + 3, 4, z + 2, M.la("brown")); }
}

/** Banco de pedra de dois lugares, de frente para dir ("s" olha para o sul) */
function banco(H, x, z, olha) {
  const { M, st, S } = H;
  const alto = { s: "n", n: "s", e: "w", w: "e" }[olha];
  if (olha === "s" || olha === "n") { st(x, 1, z, M.pedra.stairs, alto); st(x + 1, 1, z, M.pedra.stairs, alto); S(x - 1, 1, z, M.pedra.slab); S(x + 2, 1, z, M.pedra.slab); }
  else { st(x, 1, z, M.pedra.stairs, alto); st(x, 1, z + 1, M.pedra.stairs, alto); S(x, 1, z - 1, M.pedra.slab); S(x, 1, z + 2, M.pedra.slab); }
}

function* ruelas(H) {
  const { M, F, S, pausa } = H;
  // ruelas dos fundos (terra batida com pedras de borda) e vielas até a rua, com pedras de passagem
  for (const z of [13, 58]) {
    F(76, 0, z, 160, 0, z + 1, M.caminhoTerra);
    for (let x = 76; x <= 160; x += 4) S(x, 0, z, M.pedra.b);
  }
  for (const x of [89, 104, 132, 146]) {
    for (let zz = 14; zz <= 25; zz++) if (zz % 2) F(x, 0, zz, x + 1, 0, zz, M.pedra.b);
    for (let zz = 39; zz <= 57; zz++) if (zz % 2) F(x, 0, zz, x + 1, 0, zz, M.pedra.b);
  }
  horta(H, 78, 6, 8, 5, M.allium);
  horta(H, 94, 6, 8, 5, M.dente);
  horta(H, 137, 6, 8, 5, M.centaurea);
  horta(H, 152, 6, 8, 5, M.papoula);
  horta(H, 78, 62, 8, 5, M.dente);
  horta(H, 94, 62, 6, 5, M.allium);
  horta(H, 138, 62, 8, 5, M.papoula);
  yield* pausa();
}

function* cercaDeAbetos(H) {
  const { rnd, pausa } = H;
  const base = (x, z) => Math.max(0, Math.round(altVila(x, z)));
  for (let x = 73; x <= 162; x += 6) {
    const x1 = x + (x % 12 === 1 ? 1 : 0), z1 = 2 + (x % 12 === 1 ? 1 : 0), x2 = x + 2, z2 = 72 - (x % 12 === 1 ? 1 : 0);
    abeto(H, x1, z1, 9 + Math.floor(rnd(x, 1) * 4), base(x1, z1));
    abeto(H, x2, z2, 9 + Math.floor(rnd(x, 2) * 4), base(x2, z2));
    yield* pausa(600);
  }
  for (let z = 6; z <= 68; z += 8) {
    if (z > 22 && z < 44) continue;
    abeto(H, 72, z, 10 + Math.floor(rnd(z, 3) * 3), base(72, z));
    abeto(H, 163, z + 3, 10 + Math.floor(rnd(z, 4) * 3), base(163, z + 3));
    yield* pausa(600);
  }
  for (let x = 79; x <= 157; x += 13) { abeto(H, x, 5, 14, base(x, 5)); abeto(H, x + 4, 69, 14, base(x + 4, 69)); yield* pausa(600); }
  // clareiras de capim e flores em manchas nas colinas e nos quintais (fora de hortas, ruelas e caminhos)
  const hortas = [[77, 5, 87, 12], [93, 5, 103, 12], [136, 5, 146, 12], [151, 5, 161, 12], [77, 61, 87, 68], [93, 61, 101, 68], [137, 61, 147, 68], [74, 12, 162, 15], [74, 57, 162, 60]];
  tufos(H, [[74, 0, 162, 15], [74, 55, 162, 74]], hortas, altVila, SEED + 5, { limiar: 0.56, flor: 0.1 });
  tufos(H, [[74, 17, 162, 25], [74, 40, 162, 55]], [[76, 17, 87, 26], [88, 14, 90, 26], [92, 17, 104, 26], [105, 17, 112, 26], [135, 17, 145, 26], [150, 17, 158, 26], [76, 38, 85, 46], [92, 38, 102, 46], [135, 38, 144, 45], [148, 38, 160, 45], [87, 38, 91, 58], [103, 38, 106, 58], [131, 38, 134, 58], [145, 38, 148, 58], [88, 14, 90, 26], [103, 14, 106, 26], [131, 14, 134, 26], [145, 14, 148, 26], [86, 44, 134, 50], [89, 45, 105, 57], [108, 17, 136, 44], [110, 5, 126, 30]], altVila, SEED + 8, { limiar: 0.62, flor: 0.14 });
  yield* pausa();
}

function* extras(H) {
  const { M, F, S, st, vela, pausa } = H;
  for (const [x, z, o] of [[84, 27, "s"], [100, 37, "n"], [142, 27, "s"], [156, 37, "n"], [108, 37, "n"], [96, 27, "s"]]) banco(H, x, z, o);
  for (const [x, z] of [[88, 20], [105, 20], [133, 20], [147, 18]]) {
    S(x, 1, z, M.barril); S(x + 1, 1, z, M.barril); S(x, 2, z, M.hay); S(x + 1, 1, z + 1, M.caldeirao);
  }
  // forno de pão externo da padaria (tijolo, boca em arco e chaminé alta)
  const fx = 88, fz = 14;
  F(fx, 1, fz, fx + 2, 3, fz + 2, M.tijolo.b);
  F(fx + 1, 1, fz + 2, fx + 1, 2, fz + 2, M.ar);
  S(fx + 1, 1, fz + 2, M.fornalha); S(fx + 1, 2, fz + 2, M.grade);
  F(fx + 1, 4, fz + 1, fx + 1, 10, fz + 1, M.pedra.b);
  S(fx + 1, 11, fz + 1, M.pedra.slab);
  S(fx, 4, fz, M.tijolo.slab); S(fx + 2, 4, fz, M.tijolo.slab); S(fx, 4, fz + 2, M.tijolo.slab); S(fx + 2, 4, fz + 2, M.tijolo.slab);
  // casa fechada: jardim cercado, portão fechado e a caixa de correio (a carta)
  const gx1 = 90, gx2 = 103, gz2 = 56;
  for (let x = gx1; x <= gx2; x++) { S(x, 1, gz2, M.escura.fence); S(x, 1, 51, M.escura.fence); }
  for (let z = 51; z <= gz2; z++) { S(gx1, 1, z, M.escura.fence); S(gx2, 1, z, M.escura.fence); }
  for (const x of [90, 103]) F(x, 2, 51, x, 2, 51, M.escura.fence);
  F(98, 1, 51, 98, 3, 51, M.escura.fence);
  S(98, 4, 51, M.barril);
  S(98, 1, 50, M.arbusto); S(95, 1, 49, M.arbusto); S(100, 1, 48, M.teia); S(92, 1, 47, M.arbusto); S(101, 1, 49, M.rosaNegra);
  S(94, 1, 53, M.arbusto); S(100, 1, 54, M.arbusto);
  yield* pausa();
}

export function* vila(H) {
  const { M, pausa } = H;
  yield* rua(H);
  yield* poco(H);
  // casas ao norte (frente para o sul, z=26) e ao sul (frente para o norte, z=38): seis plantas, cinco telhados de duas cores
  /** @type {any[]} */
  const lista = [
    { x: 76, z: 26, w: 11, d: 10, h: 5, frente: "s", plano: "E", cortina: "red", chamine: "r", reboco: "arenito", flor: M.allium },
    { x: 92, z: 26, w: 12, d: 7, h: 5, frente: "s", plano: "B", cortina: "orange", teto: "escura", reboco: "calcita", flor: M.bluet },
    { x: 106, z: 26, w: 6, d: 8, h: 8, frente: "s", plano: "C", cortina: "white", reboco: "arenito", flor: M.allium },
    { x: 135, z: 26, w: 10, d: 8, h: 5, frente: "s", plano: "D", cortina: "orange", teto: "escura", chamine: "r", reboco: "calcita", flor: M.centaurea },
    { x: 150, z: 26, w: 8, d: 7, h: 5, frente: "s", plano: "A", cortina: "red", reboco: "arenito", flor: M.bluet },
    { x: 76, z: 38, w: 9, d: 7, h: 5, frente: "n", plano: "A", cortina: "white", teto: "escura", reboco: "arenito", flor: M.allium },
    { x: 92, z: 38, w: 10, d: 8, h: 5, frente: "n", plano: "F", cortina: "gray", fechada: true, reboco: "arenito" },
    { x: 135, z: 38, w: 9, d: 7, h: 5, frente: "n", plano: "A", cortina: "orange", chamine: "r", reboco: "calcita", flor: M.centaurea },
    { x: 148, z: 38, w: 12, d: 7, h: 5, frente: "n", plano: "B", cortina: "red", teto: "escura", chamine: "r", reboco: "arenito", flor: M.bluet },
  ];
  for (const c of lista) { yield* casa(H, c); yield* quintal(H, c); }
  yield* torre(H);
  yield* feira(H);
  yield* varais(H);
  yield* arvores(H);
  for (const [x, z] of [[82, 28], [100, 36], [140, 28], [156, 36], [74, 36], [160, 28], [91, 28], [147, 36]]) poste(H, x, z, 0, "x", M.lanterna);
  yield* ruelas(H);
  yield* extras(H);
  yield* cercaDeAbetos(H);
  void hash2;
  yield* pausa();
}
