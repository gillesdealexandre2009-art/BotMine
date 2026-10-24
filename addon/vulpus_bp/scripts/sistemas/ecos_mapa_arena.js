// @ts-check
// IV - O ÚLTIMO TESTEMUNHO (248..302 x 4..62) e o corredor final (238..250).
// Círculo cerimonial a céu aberto: miolo de luta (raio livre 14) com piso em oitavas de ardósia e calcita, fosso espelhado
// (água sobre lanternas-do-mar) com duas pontes, arquibancadas em ruína (dois níveis), colunas de end_rod e, ao fundo,
// uma porta-moldura gigante e vazia no alto de uma escadaria.
import { LAY } from "./ecos_mapa_base.js";

const Y = LAY.Y;
const { x: CX, z: CZ } = LAY.arena;

/** ângulo em graus (0..360), 0 = leste, 90 = sul */
const angDe = (dx, dz) => (((Math.atan2(dz, dx) * 180) / Math.PI) + 360) % 360;
const naJanela = (a, ini, fim) => a >= ini && a <= fim;
/** trechos em ruína das arquibancadas (graus) */
const RUINAS = [[100, 122], [212, 236], [300, 318]];
const emRuina = (a) => RUINAS.some(([i, f]) => naJanela(a, i, f));

export function* corredorFinal(H) {
  const { M, F, S, ar, st, vela, pendente, pausa } = H;
  F(239, Y - 2, 28, 247, Y + 9, 38, M.bsTijolo.b);
  ar(239, Y, 31, 247, Y + 6, 35);
  yield;
  // piso: ardósia que vira pedra-negra; faixa dourada ao centro e pares de pilastras a cada 3 blocos
  F(239, Y - 1, 31, 247, Y - 1, 35, M.bsPol.b);
  for (let x = 239; x <= 247; x++) { S(x, Y - 1, 33, x % 3 === 0 ? M.bsDourada : M.bsPol.b); if (x % 2) { S(x, Y - 1, 31, M.bs); S(x, Y - 1, 35, M.bs); } }
  for (let x = 241; x <= 246; x += 3) {
    for (const z of [30, 36]) {
      F(x, Y, z, x, Y + 6, z, M.bsPol.b);
      S(x, Y + 7, z, M.bsCinzel);
      S(x, Y + 1, z, M.bsDourada);
      ar(x, Y, z, x, Y, z);
      F(x, Y, z, x, Y, z, M.bsPol.b);
    }
    F(x, Y + 7, 30, x, Y + 7, 36, M.bsTijolo.b);
    pendente(x, Y + 6, 33, 2, M.lanternaAlma);
  }
  // lanternas de alma nos nichos das paredes
  // arco de entrada da arena (dourado e cinzelado)
  for (const z of [29, 37]) F(247, Y, z, 248, Y + 8, z, M.bsPol.b);
  F(247, Y + 8, 29, 248, Y + 8, 37, M.bsDourada);
  F(247, Y + 9, 30, 248, Y + 9, 36, M.bsTijolo.b);
  S(247, Y + 10, 33, M.bsCinzel);
  ar(247, Y, 30, 250, Y + 7, 36);
  yield* pausa();
}

export function* arena(H) {
  const { M, F, S, ar, st, sl, vela, pendente, disco, paraCentro, pausa } = H;
  // a camada de barreira da fase 0 (até y=-2) não pode ficar dentro da arena aberta; o corredor (z 29..37, x 247..250) já foi esculpido
  ar(251, Y, 4, 301, -2, 62);
  ar(245, Y, 4, 250, -2, 28);
  ar(245, Y, 38, 250, -2, 62);
  ar(245, Y, 30, 250, -2, 36);
  // base sólida sob o círculo todo
  for (let z = CZ - 27; z <= CZ + 27; z++) {
    const w = Math.floor(Math.sqrt(27 * 27 - (z - CZ) * (z - CZ)));
    F(CX - w, -9, z, CX + w, Y - 2, z, M.dsLiso);
  }
  yield;
  const oposta = { e: "w", w: "e", s: "n", n: "s" };
  for (let x = CX - 27; x <= CX + 27; x++) {
    for (let z = CZ - 27; z <= CZ + 27; z++) {
      const dx = x - CX, dz = z - CZ, r = Math.hypot(dx, dz);
      if (r > 27) continue;
      const a = angDe(dx, dz);
      const avenidaO = dx < 0 && Math.abs(dz) <= 2 && r >= 13;
      const avenidaL = dx > 0 && Math.abs(dz) <= 2 && r >= 13 && r <= 18;
      let id = null, alt = 0; // alt: quantos blocos o piso sobe acima de Y-1
      if (r <= 14) {
        // miolo: oitavas alternadas de tijolo e ladrilho, raios de obsidiana, aros de calcita
        const oit = Math.floor(((a + 22.5) % 360) / 45);
        const raio = Math.abs(((a + 22.5) % 45) - 22.5) < 0.9 * (6 / Math.max(r, 6)) + 0.35 && r > 3;
        id = r > 13 ? M.obsidiana : Math.abs(r - 8.4) < 0.5 ? M.calcita : r > 12.3 ? M.dsPol.b : raio ? (r > 12 ? M.chora : M.obsidiana) : oit % 2 ? M.dsTela.b : M.dsPol.b;
        if (r <= 3.2) {
          id = Math.abs(((a + 22.5) % 45) - 22.5) < 6 && r > 1.4 ? M.obsidiana : M.calcita;
          alt = 1;
        }
        if (r <= 1.2) id = M.chora;
      } else if (r <= 18 && !avenidaO && !avenidaL) {
        id = "fosso";
      } else if (r <= 18) {
        id = M.calcita; // pontes
      } else if (r <= 25.5) {
        // cavea: um degrau de escada por anel (45 graus), do fosso ao muro; materiais alternam de anel em anel
        const j = Math.min(7, Math.floor(r - 18));
        const ruina = emRuina(a);
        const fechado = dx > 0 && Math.abs(dz) <= 7;
        if (avenidaO) {
          id = M.dsPol.b;
          if (Math.abs(dz) === 2) id = M.bsDourada;
        } else if (!fechado && !(ruina && j > 3)) {
          const mat = j % 3 === 0 ? M.dsTijolo : j % 3 === 1 ? M.tufoPol : M.dsTela;
          F(x, Y - 1, z, x, Y + j - 1, z, mat.b);
          if (ruina && j === 3 && (x + z) % 3 === 0) S(x, Y + j, z, M.sbCrack);
          else st(x, Y + j, z, mat.stairs, oposta[paraCentro(dx, dz)]);
          continue;
        }
      }
      if (id === null) continue;
      if (id === "fosso") {
        S(x, Y - 2, z, M.mar);
        S(x, Y - 1, z, M.agua);
        continue;
      }
      F(x, Y - 1, z, x, Y - 1 + alt, z, id);
    }
    if (x % 3 === 0) yield;
  }
  yield* pausa();

  // escadaria leste: oito degraus largos até o patamar da porta
  for (let i = 0; i < 9; i++) {
    const x = 290 + i;
    F(x, Y - 1, CZ - 6, x, Y - 1 + i, CZ + 6, i % 2 ? M.dsTijolo.b : M.dsTela.b);
    F(x, Y + i, CZ - 6, x, Y + i, CZ + 6, M.ar);
    for (let z = CZ - 6; z <= CZ + 6; z++) {
      if (Math.abs(z - CZ) <= 1) S(x, Y + i, z, M.calcita); // fita clara no meio: o caminho até a porta
      else st(x, Y + i, z, M.dsPol.stairs, "e");
    }
    for (const z of [CZ - 7, CZ + 7]) F(x, Y - 1, z, x, Y + i + 1, z, M.dsPol.b);
    if (i % 3 === 1) for (const z of [CZ - 7, CZ + 7]) S(x, Y + i + 2, z, M.lanternaAlma);
  }
  // patamar e a porta-moldura gigante, vazia
  const px = 299, yp = Y + 9; // y do primeiro bloco acima do patamar
  F(px, Y - 1, CZ - 9, px + 6, yp - 1, CZ + 9, M.dsTijolo.b);
  F(px, yp - 1, CZ - 9, px + 6, yp - 1, CZ + 9, M.dsPol.b);
  F(px + 1, yp - 1, CZ - 4, px + 5, yp - 1, CZ + 4, M.calcita);
  for (const z of [CZ - 4, CZ + 4]) F(px + 2, yp - 1, z, px + 4, yp - 1, z, M.obsidiana);
  const fx = px + 2; // espessura 3
  for (const dz of [-5, -4, 4, 5]) {
    F(fx, yp, CZ + dz, fx + 2, yp + 13, CZ + dz, M.calcita);
  }
  for (const dz of [-5, 5]) for (let y = yp + 2; y <= yp + 12; y += 3) F(fx, y, CZ + dz, fx + 2, y, CZ + dz, M.dsCinzel);
  for (const dz of [-4, 4]) for (let y = yp + 1; y <= yp + 12; y += 2) S(fx + 1, y, CZ + dz, M.obsidiana);
  F(fx, yp + 14, CZ - 6, fx + 2, yp + 15, CZ + 6, M.calcita);
  F(fx, yp + 16, CZ - 4, fx + 2, yp + 16, CZ + 4, M.dsPol.b);
  F(fx + 1, yp + 17, CZ - 2, fx + 1, yp + 17, CZ + 2, M.dsPol.b);
  S(fx + 1, yp + 18, CZ, M.chora);
  // uma única lanterna âmbar pendurada no vão vazio da porta: o único ponto quente do lugar
  H.pendente(fx + 1, yp + 13, CZ, 4, M.lanterna);
  S(fx + 1, yp + 19, CZ, M.barra);
  // uma segunda moldura menor, à frente, recuando em perspectiva (a porta dentro da porta)
  for (const dz of [-3, -2, 2, 3]) F(fx - 4, yp, CZ + dz, fx - 3, yp + 8, CZ + dz, M.calcita);
  for (const dz of [-3, 3]) for (let y = yp + 2; y <= yp + 7; y += 3) F(fx - 4, y, CZ + dz, fx - 3, y, CZ + dz, M.dsCinzel);
  F(fx - 4, yp + 9, CZ - 4, fx - 3, yp + 10, CZ + 4, M.calcita);
  F(fx - 4, yp + 11, CZ - 2, fx - 3, yp + 11, CZ + 2, M.dsPol.b);
  S(fx - 4, yp + 12, CZ, M.chora);
  // a base da moldura brilha: lanternas do mar e velas nos pés
  for (const dz of [-6, 6]) { F(fx, yp, CZ + dz, fx + 2, yp, CZ + dz, M.mar); }
  for (const dz of [-3, 3]) { vela(fx - 1, yp, CZ + dz, 3, true, "purple"); vela(fx + 3, yp, CZ + dz, 3, true, "white"); }
  yield* pausa();

  // colunas de end_rod em anel, tiradas dos eixos de passagem; algumas partidas (ruína)
  for (let i = 0; i < 12; i++) {
    const ang = i * 30 + 15;
    const rad = (ang * Math.PI) / 180;
    const x = CX + Math.round(Math.cos(rad) * 21), z = CZ + Math.round(Math.sin(rad) * 21);
    const dx = x - CX, dz = z - CZ;
    if ((dx < 0 && Math.abs(dz) <= 5) || (dx > 0 && Math.abs(dz) <= 8)) continue;
    const j = Math.min(7, Math.floor(Math.hypot(dx, dz) - 18));
    const yb = Y + j; // a coluna nasce no degrau da cavea (substitui a escada)
    const alta = emRuina(ang) ? 5 : 12;
    F(x, yb, z, x, yb + alta, z, M.calcita);
    S(x, yb, z, M.dsPol.b);
    for (let y = yb + 3; y <= yb + alta; y += 4) F(x, y, z, x, y, z, M.dsCinzel);
    if (!emRuina(ang)) {
      for (const [ex, ez] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let y = yb + 2; y <= yb + alta - 3; y++) S(x + ex, y, z + ez, M.barra);
      S(x, yb + alta + 1, z, M.froglight);
    } else {
      for (const [ex, ez] of [[1, 0], [0, 1]]) S(x + ex, yb + 1, z + ez, M.barra);
      S(x, yb + alta + 1, z, M.sbCrack);
    }
  }
  yield* pausa();
  // muro externo em ruína: anel de ardósia com ameias e lanternas de alma a cada 12 graus
  for (let x = CX - 29; x <= CX + 29; x++) {
    for (let z = CZ - 29; z <= CZ + 29; z++) {
      const dx = x - CX, dz = z - CZ, r = Math.hypot(dx, dz);
      if (r < 25.6 || r > 27.2) continue;
      if (Math.abs(dz) <= 7 && dx > 0) continue;
      if (Math.abs(dz) <= 3 && dx < 0) continue;
      const a = angDe(dx, dz);
      const ruina = emRuina(a);
      const h = ruina ? 5 : 10;
      F(x, Y - 1, z, x, Y + h, z, M.dsTijolo.b);
      if (!ruina && (x + z) % 2) S(x, Y + h + 1, z, M.dsTijolo.slab);
      if (!ruina && r < 26.2 && Math.round(a) % 30 === 0) { F(x, Y + 5, z, x, Y + 8, z, M.la("purple")); S(x, Y + 4, z, M.la("white")); } // estandarte embutido no muro
      if (!ruina && r < 26.2 && Math.round(a) % 12 === 0) S(x, Y + h + 1 - 2, z, M.lanternaAlma); // nicho de luz embutido no muro
    }
    if (x % 5 === 0) yield;
  }
  // arco de entrada oeste: pilares do muro, e plantas do corredor
  for (const z of [CZ - 4, CZ + 4]) { F(247, Y, z, 249, Y + 8, z, M.bsPol.b); S(248, Y + 9, z, M.bsCinzel); }
  F(247, Y + 8, CZ - 4, 249, Y + 8, CZ + 4, M.bsDourada);
  // poças-espelho (surreal): duas manchas de vidro azul rente ao piso do miolo, brilhando de baixo (não atrapalham a luta: são planas)
  for (const [ang] of [[40], [220]]) {
    const px = CX + Math.cos((ang * Math.PI) / 180) * 10.5, pz = CZ + Math.sin((ang * Math.PI) / 180) * 10.5;
    for (let x = Math.round(px) - 3; x <= Math.round(px) + 3; x++) for (let z = Math.round(pz) - 3; z <= Math.round(pz) + 3; z++) {
      if (Math.hypot(x - px, z - pz) > 2.3) continue;
      S(x, Y - 1, z, M.vidros.azul);
      S(x, Y - 2, z, M.mar);
    }
  }
  H.vela(CX, Y + 1, CZ + 1, 3, true, "purple");
  yield* pausa();
}
