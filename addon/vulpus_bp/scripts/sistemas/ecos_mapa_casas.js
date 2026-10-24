// @ts-check
// Casas da Vila Silenciosa (versão 2). Enxaimel claro sobre soco de pedra, telhado de duas águas com beiral, sofito e cumeeira escura,
// chaminé com capelo, janelas 2x2 emolduradas com peitoril e canteiro, porta com degraus, lanterna e (em algumas) alpendre.
// Coordenadas locais: u anda ao longo da rua (x), a anda para dentro da casa (a=0 é a parede da frente, a=d-1 a dos fundos).
import { piramide, OPOSTA } from "./ecos_mapa_base.js";

/** @typedef {{ x: number, z: number, w: number, d: number, h?: number, frente?: "s"|"n", plano?: string, cortina?: string, teto?: "tijolo"|"escura", chamine?: "l"|"r", fechada?: boolean, reboco?: "arenito"|"calcita", flor?: string }} Casa */

/** Mesa posta: tampo de tábuas (a vela precisa de bloco inteiro), prato e vela apagada, cadeiras olhando para a mesa. */
export function mesa(H, x, z, y, cadeiras = "nsew") {
  const { M, S, st, vela } = H;
  S(x, y, z, M.escura.planks);
  S(x + 1, y, z, M.escura.planks);
  S(x, y + 1, z, M.vaso);
  vela(x + 1, y + 1, z, 1, false);
  const cad = { n: [x, z - 1, "s"], s: [x + 1, z + 1, "n"], w: [x - 1, z, "e"], e: [x + 2, z, "w"] };
  for (const c of cadeiras) {
    const [cx, cz, d] = cad[c];
    st(cx, y, cz, M.escura.stairs, d);
  }
}

/** @param {any} H @param {Casa} o */
export function* casa(H, o) {
  const { M, F, S, ar, st, tronco, vela, pendente, pausa } = H;
  const { x, z, w, d, h = 5, frente = "s", plano = "A", cortina = "orange", teto = "tijolo", chamine = "l", fechada = false } = o;
  const sd = frente === "s" ? 1 : -1; // sentido da rua a partir da frente (em z)
  const dF = frente === "s" ? "s" : "n"; // direção "para a rua"
  const dB = OPOSTA[dF]; // direção "para os fundos"
  const x1 = x;
  /** local -> mundo */
  const X = (u) => x1 + u;
  const Z = (a) => z - sd * a;
  const put = (u, y, a, id, est) => S(X(u), y, Z(a), id, est);
  const fill = (u1, y1, a1, u2, y2, a2, id) => F(X(u1), y1, Z(a1), X(u2), y2, Z(a2), id);
  const air = (u1, y1, a1, u2, y2, a2) => fill(u1, y1, a1, u2, y2, a2, M.ar);
  const viga = (u, y, a, eixo) => tronco(X(u), y, Z(a), M.escura.strip, eixo === "u" ? "x" : "z");
  const poste = (u, y1, y2, a) => { for (let y = y1; y <= y2; y++) tronco(X(u), y, Z(a), M.escura.strip, "y"); };
  const rebocoB = o.reboco === "calcita" ? M.calcita : M.arenito.b;
  const R = teto === "tijolo" ? M.tijolo : M.escura;
  const R2 = teto === "tijolo" ? M.escura : M.tijolo;
  const Rb = teto === "tijolo" ? M.tijolo.b : M.escura.planks;
  const cobreCumeeira = M.escura.slab;
  const eixoCumeeira = plano === "C" ? "z" : "x";
  const pu = plano === "B" ? 3 : plano === "C" ? Math.floor(w / 2) : Math.floor(w / 2);

  // ---- soco e piso
  fill(-1, 0, -1, w, 0, d, M.pedra.b);
  fill(0, 0, 0, w - 1, 0, d - 1, M.escura.planks);
  for (let u = 0; u < w; u += 2) fill(u, 0, 0, u, 0, d - 1, M.palida.planks);
  air(0, 1, 0, w - 1, h + 1, d - 1);
  // ---- paredes: soco escuro (1 bloco), corpo de reboco claro
  for (const [u1, a1, u2, a2] of [[0, 0, w - 1, 0], [0, d - 1, w - 1, d - 1], [0, 0, 0, d - 1], [w - 1, 0, w - 1, d - 1]]) {
    fill(u1, 1, a1, u2, h, a2, rebocoB);
    fill(u1, 1, a1, u2, 1, a2, M.pedra.b);
  }
  // quinas: viga vertical; faixa horizontal no meio e viga de topo
  for (const [u, a] of [[0, 0], [w - 1, 0], [0, d - 1], [w - 1, d - 1]]) poste(u, 1, h, a);
  const meio = Math.max(3, Math.floor(h / 2) + 1);
  for (let u = 1; u < w - 1; u++) for (const a of [0, d - 1]) { viga(u, h, a, "u"); if (h >= 5) viga(u, meio, a, "u"); }
  for (let a = 1; a < d - 1; a++) for (const u of [0, w - 1]) { viga(u, h, a, "a"); if (h >= 5) viga(u, meio, a, "a"); }
  // interior: forro de tábuas com vigas atravessando o menor vão
  fill(1, h, 1, w - 2, h, d - 2, M.escura.planks);
  if (w <= d) { for (let a = 2; a < d - 1; a += 3) for (let u = 1; u < w - 1; u++) viga(u, h, a, "u"); }
  else { for (let u = 2; u < w - 1; u += 3) for (let a = 1; a < d - 1; a++) viga(u, h, a, "a"); }

  // ---- montantes, janelas e braços por painel (módulo 4)
  /** @param {"f"|"t"|"l"|"r"} lado */
  const parede = (lado) => {
    const comp = lado === "f" || lado === "t" ? w : d;
    const pos = (i, y) => (lado === "f" ? [i, y, 0] : lado === "t" ? [i, y, d - 1] : lado === "l" ? [0, y, i] : [w - 1, y, i]);
    const fora = lado === "f" ? -1 : lado === "t" ? 1 : 0; // deslocamento em a para "fora"
    const foraU = lado === "l" ? -1 : lado === "r" ? 1 : 0;
    const ponha = (i, y, id, est) => { const [u, yy, a] = pos(i, y); put(u, yy, a, id, est); };
    const poste1 = (i) => { const [u, , a] = pos(i, 1); poste(u, 1, h, a); };
    const studs = [];
    for (let i = 0; i < comp; i += 4) studs.push(i);
    if (studs[studs.length - 1] !== comp - 1) studs.push(comp - 1);
    for (const i of studs) poste1(i);
    const portaI = lado === "f" ? pu : -99;
    for (let s = 0; s + 1 < studs.length; s++) {
      const i0 = studs[s], i1 = studs[s + 1], interno = i1 - i0 - 1;
      if (interno < 1) continue;
      const temPorta = portaI > i0 && portaI < i1;
      if (temPorta) continue;
      if (interno >= 2 && h >= 5) {
        const j1 = i0 + 1, j2 = i0 + 2;
        for (const j of [j1, j2]) for (const y of [2, 3]) {
          if (fechada) ponha(j, y, M.escura.planks);
          else ponha(j, y, M.painel);
        }
        // verga: escadas invertidas voltadas para fora; peitoril de laje saliente; canteiro embaixo
        for (const j of [j1, j2]) {
          const [u, , a] = pos(j, 4);
          st(X(u), 4, Z(a), M.escura.stairs, lado === "f" ? dB : lado === "t" ? dF : lado === "l" ? "e" : "w", true);
          const [u2, , a2] = pos(j, 1);
          H.lajeAlta(X(u2 + foraU), 1, Z(a2 + fora), M.escura.slab);
        }
        // cortinas por dentro (a cor aparece pelo vidro) e uma vela no peitoril interno
        if (fechada) {
          // tábuas em cruz sobre a janela
          for (const j of [j1, j2]) { const [u, , a] = pos(j, 3); put(u + foraU, 3, a + fora, M.escura.fence); }
        } else if (lado === "f" || lado === "t") {
          const dentroA = lado === "f" ? 1 : -1;
          for (const j of [j1, j2]) {
            const [u, , a] = pos(j, 2);
            put(u, 2, a + dentroA, M.la(cortina)); put(u, 3, a + dentroA, M.la(cortina));
          }
        }
      } else if (h >= 5) {
        // braço diagonal no painel estreito (viga ao sul/leste inclinada)
        for (let k = 0; k < Math.min(interno, 2); k++) ponha(i0 + 1 + k, 2 + k, M.escura.strip);
      }
    }
  };
  parede("f"); parede("t"); parede("l"); parede("r");
  yield* pausa();

  // ---- porta: batente em viga, verga em escadas invertidas, degraus e lanterna
  if (!fechada) {
    air(pu, 1, 0, pu, 3, 0); // porta de 3 de altura: o degrau de fora sobe meio bloco e a cabeça precisa de folga
    put(pu, 4, 0, M.escura.planks);
    st(X(pu - 1), 4, Z(-0), M.escura.stairs, "e", true); // ombros
    st(X(pu + 1), 4, Z(-0), M.escura.stairs, "w", true);
    poste(pu - 1, 1, 3, 0); poste(pu + 1, 1, 3, 0);
  } else {
    fill(pu, 1, 0, pu, 2, 0, M.escura.planks);
    put(pu, 2, -1, M.escura.fence); put(pu, 1, -1, M.escura.fence);
    put(pu - 1, 1, -1, M.teia);
  }
  const degrau = (u, a, y) => st(X(u), y, Z(a), M.pedra.stairs, dB);
  for (const u of [pu - 1, pu, pu + 1]) degrau(u, -1, 1);
  fill(pu - 1, 0, -2, pu + 1, 0, -2, M.pedra.slab);
  // lanterna em pé num poste de cerca ao lado da porta
  put(pu + 2, 1, -1, M.escura.fence); put(pu + 2, 2, -1, M.escura.fence); put(pu + 2, 3, -1, M.escura.fence);
  if (!fechada) put(pu + 2, 4, -1, M.lanterna);

  // ---- telhado: duas águas, beiral de 1, sofito e cumeeira escura
  const y0 = h + 1;
  if (eixoCumeeira === "x") {
    let k = 0;
    for (; ; k++) {
      const af = -1 + k, ab = d - k, y = y0 + k;
      if (af > ab) break;
      if (af === ab) { for (let u = -1; u <= w; u++) put(u, y, af, cobreCumeeira); break; }
      for (let u = -1; u <= w; u++) {
        st(X(u), y, Z(af), R.stairs, dB);
        st(X(u), y, Z(ab), R.stairs, dF);
      }
      // empena: preenche o triângulo e põe um montante de viga no centro
      for (let a = af + 1; a <= ab - 1; a++) for (const u of [0, w - 1]) put(u, y, a, rebocoB);
      if (ab - af === 2) { for (let u = -1; u <= w; u++) put(u, y, af + 1, Rb); }
    }
    // sofito: escadas invertidas sob o beiral dos dois lados
    for (let u = -1; u <= w; u++) { st(X(u), y0 - 1, Z(-1), M.escura.stairs, dB, true); st(X(u), y0 - 1, Z(d), M.escura.stairs, dF, true); }
    // viga e janela de empena no centro
    const cj = Math.floor((d - 1) / 2);
    for (const u of [0, w - 1]) {
      for (let y = y0; y <= y0 + 1; y++) tronco(X(u), y, Z(cj), M.escura.strip, "y");
      if (d >= 7) put(u, y0 + 1, cj + 1, M.painel);
    }
  } else {
    let k = 0;
    for (; ; k++) {
      const ul = -1 + k, ur = w - k, y = y0 + k;
      if (ul > ur) break;
      if (ul === ur) { for (let a = -1; a <= d; a++) put(ul, y, a, cobreCumeeira); break; }
      for (let a = -1; a <= d; a++) { st(X(ul), y, Z(a), R.stairs, "e"); st(X(ur), y, Z(a), R.stairs, "w"); }
      for (let u = ul + 1; u <= ur - 1; u++) for (const a of [0, d - 1]) put(u, y, a, rebocoB);
      if (ur - ul === 2) for (let a = -1; a <= d; a++) put(ul + 1, y, a, Rb);
      if (ur - ul === 1) { for (let a = -1; a <= d; a++) put(ur, y + 1, a, cobreCumeeira); break; }
    }
    for (let a = -1; a <= d; a++) { st(X(-1), y0 - 1, Z(a), M.escura.stairs, "e", true); st(X(w), y0 - 1, Z(a), M.escura.stairs, "w", true); }
    const cu = Math.floor((w - 1) / 2);
    for (const a of [0, d - 1]) { for (let y = y0; y <= y0 + 2; y++) tronco(X(cu), y, Z(a), M.escura.strip, "y"); }
    put(cu, y0 + 3, 0, M.painel); // janelinha de empena na frente
    // sacada na frente (andar de cima): laje saliente, grade e duas mísulas
    for (let u = cu - 1; u <= cu + 1; u++) {
      H.lajeAlta(X(u), 5, Z(-1), M.escura.slab); st(X(u), 4, Z(-1), M.escura.stairs, dB, true);
      put(u, 6, -1, M.escura.fence);
    }
    put(cu - 1, 6, 0, M.ar); put(cu, 6, 0, M.ar); put(cu + 1, 6, 0, M.ar);
    air(cu, 6, 0, cu, 7, 0);
  }
  yield* pausa();

  // ---- chaminé com capelo
  const cu = chamine === "l" ? 1 : w - 3;
  for (let y = 1; y <= y0 + 4; y++) { put(cu, y, d - 1, M.pedra.b); put(cu + 1, y, d - 1, M.pedra.b); }
  put(cu, y0 + 5, d - 1, M.pedra.slab); put(cu + 1, y0 + 5, d - 1, M.pedra.slab);
  st(X(cu - 1), y0 + 4, Z(d - 1), M.pedra.stairs, "e", true); st(X(cu + 2), y0 + 4, Z(d - 1), M.pedra.stairs, "w", true);
  // lareira por dentro (a padaria tem forno de tijolo no lugar)
  if (plano !== "E") {
    air(cu, 1, d - 2, cu + 1, 2, d - 2);
    put(cu, 1, d - 2, M.grade); put(cu + 1, 1, d - 2, M.fornalha);
  } else {
    fill(6, 1, d - 2, 9, 3, d - 1, M.tijolo.b);
    air(7, 1, d - 3, 8, 2, d - 3);
    put(7, 1, d - 3, M.fornalha); put(8, 1, d - 3, M.fornalha);
  }

  // ---- alpendre de meia-água sobre a porta (planos A e D) e cobertura listrada da padaria
  if (plano === "A" || plano === "D") {
    for (const u of [pu - 2, pu + 2]) for (let y = 1; y <= 3; y++) put(u, y, -3, M.escura.fence);
    for (let a = -3; a <= -1; a++) for (let u = pu - 2; u <= pu + 2; u++) st(X(u), 4 + (a + 3), Z(a), R.stairs, dB);
    for (let u = pu - 2; u <= pu + 2; u++) st(X(u), 3, Z(-3), M.escura.stairs, dB, true);
    fill(pu - 2, 0, -3, pu + 2, 0, -3, M.pedra.slab);
  }
  if (plano === "D") {
    // torrinha de canto (3x3) colada à fachada, mais alta que o telhado, com pirâmide da outra cor e uma lanterna no alto
    fill(w, 1, 0, w + 2, h + 3, 2, rebocoB);
    air(w + 1, 1, 1, w + 1, h + 3, 1);
    for (const [u, a] of [[w, 0], [w + 2, 0], [w, 2], [w + 2, 2]]) poste(u, 1, h + 3, a);
    fill(w, h + 3, 0, w + 2, h + 3, 2, M.escura.strip);
    fill(w, 1, 0, w + 2, 1, 2, M.pedra.b);
    air(w + 1, 1, 1, w + 1, 1, 1);
    air(w - 1, 1, 1, w - 1, 3, 1); // porta entre a casa e a torrinha
    put(w + 1, 3, 0, M.painel); put(w + 1, 4, 0, M.painel); put(w + 2, 3, 1, M.painel); put(w + 2, 4, 1, M.painel);
    piramide(H, X(w + 1), Z(1), h + 4, 2, R2);
    S(X(w + 1), h + 7, Z(1), M.lanterna);
  }
  if (plano === "E") {
    // toldo de lã listrado em declive sobre a frente da padaria, sobre postes de cerca
    for (let u = 1; u < w - 1; u++) {
      put(u, 4, -1, M.pano(u % 2 ? "white" : "orange"));
      put(u, 3, -2, M.pano(u % 2 ? "white" : "orange"));
    }
    for (const u of [1, w - 2]) for (let y = 1; y <= 2; y++) put(u, y, -2, M.escura.fence);
  }
  yield* pausa();

  // ---- canteiros de flor sob as janelas da frente (podzol + flor) e um monte de lenha na lateral
  if (!fechada) {
    for (let s = 0; s < w; s += 4) {
      const j1 = s + 1;
      if (j1 + 1 < w - 1 && Math.abs(j1 - pu) > 2) { H.flor(X(j1), 1, Z(-2), o.flor ? o.flor : M.bluet); H.flor(X(j1 + 1), 1, Z(-2), M.allium); }
    }
  }
  yield* pausa();

  // ---- interior vivido
  const cxm = Math.floor((w - 1) / 2), czm = Math.floor((d - 1) / 2);
  pendente(X(cxm), h - 1, Z(czm), 1, M.lanterna);
  const mx = X(cxm - 1), mz = Z(czm);
  if (fechada) {
    mesa(H, mx, mz, 1, "ns");
    put(1, 1, 1, M.teia); put(w - 2, 1, d - 2, M.teia); put(1, h - 1, 1, M.teia);
    put(2, 1, 1, M.atril);
    fill(1, 1, d - 3, 3, 1, d - 2, M.tapete("white"));
    return;
  }
  if (plano === "A" || plano === "D") {
    mesa(H, mx, mz, 1, "nsw");
    fill(1, 1, d - 2, 1, 3, d - 2, M.estante);
    put(w - 2, 1, 1, M.fornalha);
    fill(w - 4, 1, 2, w - 2, 1, 3, M.tapete("red"));
  } else if (plano === "B") {
    mesa(H, X(3), mz, 1, "ns");
    put(w - 2, 1, 1, M.barril); put(w - 3, 1, 1, M.barril);
    fill(w - 4, 1, d - 3, w - 2, 1, d - 2, M.la("red")); put(w - 2, 1, d - 2, M.la("white")); put(w - 2, 1, d - 3, M.la("white"));
    put(w - 2, 1, 2, M.barril);
  } else if (plano === "C") {
    mesa(H, mx, mz, 1, "ns");
    for (let i = 0; i < 4; i++) st(X(1), 1 + i, Z(1 + i), M.escura.stairs, dB);
    put(w - 2, 1, 1, M.estante); put(w - 2, 2, 1, M.estante);
  } else if (plano === "E") {
    for (let u = 2; u <= w - 3; u++) { put(u, 1, 2, M.escura.planks); H.lajeAlta(X(u), 2, Z(2), M.escura.slab); }
    for (let u = 3; u < w - 3; u += 2) put(u, 3, 2, M.vaso);
    vela(X(2), 3, Z(2), 2, false); vela(X(w - 3), 3, Z(2), 1, false);
    fill(1, 1, d - 2, 3, 1, d - 2, M.hay); fill(1, 2, d - 2, 2, 2, d - 2, M.hay);
    put(w - 2, 1, d - 2, M.barril); put(w - 3, 1, d - 2, M.barril);
    mesa(H, X(cxm - 1), Z(czm + 1), 1, "ns");
  }
  yield* pausa();
}

/** Quintal: lenha, barris e fardo junto à casa (grupo de 3 com alturas diferentes). */
export function* quintal(H, o) {
  const { M, tronco, S } = H;
  const { x, z, w, frente = "s" } = o;
  const sd = frente === "s" ? 1 : -1;
  for (let a = 0; a < 3; a++) for (let y = 1; y <= 2; y++) tronco(x + w + 1, y, z - sd * (1 + a), M.escura.log, "z");
  S(x - 2, 1, z - sd * 1, M.barril); S(x - 2, 1, z - sd * 2, M.barril); S(x - 2, 2, z - sd * 1, M.hay);
  yield;
}
