// @ts-check
// O céu de "Ecos dos Ausentes": um teto de galáxia feito de blocos opacos (concreto), lá em cima, só nesta dimensão.
// Por que blocos e não bioma: o cliente pinta o céu pelo bioma do cliente, e a dimensão vazia usa um bioma que também serve
// às outras dimensões vulpus:* (intervalo, minigames). Trocar o céu dele pintaria o resto junto. O teto não tem esse risco.
// Todo ponto é função determinística de (x,z): a fase é retomável e dá o mesmo resultado em qualquer tick.
import { hash2, fbm } from "./ecos_mapa_base.js";

/** altura do teto (relativa ao chão): 7 blocos acima da copa mais alta (árvores de até 36 sobre colinas de até +4) */
export const Y_CEU = 50;
/** centro da galáxia espiral (sobre a ponte entre a Vila e o Arquivo) */
const GX = 165, GZ = 34;

/** Rampa de valor do espaço: do vazio ao brilho. Cada degrau é um bloco que existe no Bedrock. */
const RAMPA = [
  "black_concrete", "black_concrete", "blue_terracotta", "blue_concrete", "purple_concrete",
  "magenta_concrete", "light_blue_concrete", "cyan_concrete", "white_concrete",
];

/**
 * Intensidade da galáxia em [0,1] e matiz (0 = azul frio, 1 = violeta/rosa) em um ponto.
 * @returns {{ i: number, q: number }}
 */
function galaxia(x, z) {
  // elipse inclinada: o disco visto de lado, como num céu de verdade
  const a = -0.45, dx = x - GX, dz = z - GZ;
  const u = dx * Math.cos(a) - dz * Math.sin(a);
  const v = (dx * Math.sin(a) + dz * Math.cos(a)) / 0.5;
  const r = Math.hypot(u, v);
  const th = Math.atan2(v, u);
  // duas espirais logarítmicas
  const braco = 0.5 + 0.5 * Math.cos(2 * (th - 1.15 * Math.log(r + 4)));
  const queda = Math.exp(-r / 78);
  const bojo = Math.exp(-(r * r) / 140);
  const poeira = fbm(x, z, 71, 14, 2); // grumos de poeira dentro dos braços
  const i = bojo * 0.95 + braco * queda * (0.45 + 0.4 * poeira);
  return { i, q: Math.min(1, r / 90) };
}

/** Bloco do fundo (nebulosa + galáxia + vazio) em (x,z). */
function fundo(x, z) {
  const g = galaxia(x, z);
  const neb = fbm(x + 400, z, 33, 46, 3);        // nuvens grandes, baixa frequência
  const neb2 = fbm(x, z + 900, 57, 28, 2);
  // nebulosa roxa/azul longe da galáxia; some perto do núcleo para ele ficar limpo
  const longe = Math.min(1, Math.hypot(x - GX, z - GZ) / 70);
  let v = 0.1 + Math.max(0, neb - 0.3) * 0.7 * longe + g.i * 1.0 + Math.max(0, neb - 0.52) * 1.5 * longe + Math.max(0, neb2 - 0.62) * 0.9 * longe;
  v += (hash2(x, z, 5) - 0.5) * 0.05; // grão curto: gradiente macio, sem faixas
  v = Math.max(0, Math.min(0.999, v));
  let k = Math.floor(v * 7.4);
  // núcleo branco só no miolo; mais fora, a rampa fica no azul/violeta
  if (k >= 7 && g.i < 0.82) k = 6;
  if (k === 6 && g.q > 0.35 && neb < 0.6) k = 5;
  if (k === 5 && neb2 > 0.55 && g.q > 0.3) k = 4; // roxo mais frio nos braços de fora
  return RAMPA[Math.min(k, RAMPA.length - 1)];
}

/** Constelações: pontos [dx, dz] e quais são as estrelas-mãe (luz). Cada estrela vira uma cruz pequena. */
const CONSTELACOES = [
  // Cruzeiro do Sul, sobre quem chega ao Limiar
  { x: 22, z: 30, nome: "cruzeiro", pts: [[0, -10, 1], [0, 9, 1], [-6, 0, 0], [6, -2, 0], [3, 6, 0]] },
  // Ursa Maior (a Panela), sobre a Vila
  { x: 98, z: 46, nome: "panela", pts: [[0, 0, 0], [8, 1, 0], [15, -3, 1], [22, -4, 0], [24, 5, 1], [16, 8, 0], [9, 7, 0]] },
  // Cassiopeia (o W), sobre o Arquivo
  { x: 196, z: 10, nome: "w", pts: [[0, 0, 0], [6, 7, 1], [12, 1, 0], [18, 8, 1], [24, 0, 0]] },
  // Cinturão de Órion, sobre o corredor final
  { x: 236, z: 50, nome: "cinturao", pts: [[0, 0, 1], [5, 4, 1], [10, 8, 1]] },
];

/** Planeta com anel, sobre a arena (um marco para quem olha para cima antes do chefe). */
const PLANETA = { x: 275, z: 33, r: 7 };

/** @returns {Map<string, string>} células "x,z" -> bloco, por cima do fundo */
function adornos() {
  const m = new Map();
  const par = (x, z, id) => m.set(x + "," + z, id);
  // constelações
  for (const c of CONSTELACOES) {
    for (const [dx, dz, mae] of c.pts) {
      const x = c.x + dx, z = c.z + dz;
      if (mae) par(x, z, "sea_lantern");
      else par(x, z, "white_concrete");
      for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) par(x + ox, z + oz, mae ? "white_concrete" : "light_blue_concrete");
    }
  }
  // planeta com anel inclinado
  const { x: px, z: pz, r } = PLANETA;
  const ang = 0.35;
  for (let x = px - 18; x <= px + 18; x++) {
    for (let z = pz - 18; z <= pz + 18; z++) {
      const dx = x - px, dz = z - pz;
      const u = dx * Math.cos(ang) - dz * Math.sin(ang);
      const v = (dx * Math.sin(ang) + dz * Math.cos(ang)) / 0.3;
      const rr = Math.hypot(u, v);
      const noCorpo = Math.hypot(dx, dz) <= r;
      const noAnel = rr >= 10.5 && rr <= 16 && !(rr > 13 && rr < 13.8);
      if (noAnel && !noCorpo) par(x, z, rr < 13 ? "light_gray_concrete" : "white_concrete");
      if (noCorpo) {
        // sombra: o lado oposto ao brilho (norte-leste da arena) fica mais fundo
        const luz = (dx * -0.6 + dz * -0.8) / r; // -1..1
        const t = luz + (hash2(x, z, 9) - 0.5) * 0.35;
        par(x, z, t > 0.55 ? "pink_concrete" : t > 0.1 ? "magenta_concrete" : t > -0.45 ? "purple_concrete" : "black_concrete");
        // a metade da frente do anel passa por cima do corpo
        if (v > 0 && noAnel) par(x, z, "white_concrete");
      }
    }
  }
  return m;
}

/** Estrela solta em (x,z)? devolve o bloco ou null. Esparsas; mais densas dentro da galáxia. */
function estrela(x, z) {
  const g = galaxia(x, z).i;
  const dens = 0.011 + g * 0.03;
  const h = hash2(x, z, 1234);
  if (h > dens) return null;
  const s = hash2(x, z, 4321);
  if (g > 0.5 && s < 0.35) return "light_blue_concrete";
  if (s < 0.0035 / dens) return "sea_lantern"; // raríssimas: luz de verdade, quase imperceptível lá embaixo
  return s < 0.7 ? "white_concrete" : "quartz_block";
}

/**
 * Constrói o teto estrelado. Faixas de 1 bloco ao longo de x, com corridas do mesmo bloco viram um fill só.
 * @param {*} H  ferramentas da base
 * @param {{ x1:number, z1:number, x2:number, z2:number }} caixa
 */
export function* ceu(H, caixa) {
  const { F, pausa } = H;
  const exc = adornos();
  const blocoEm = (x, z) => {
    const e = exc.get(x + "," + z);
    if (e) return "minecraft:" + e;
    // as bordas ficam no vazio mais escuro: o nevoeiro azul-noite e o preto se encontram sem emenda
    const borda = Math.min(x - caixa.x1, caixa.x2 - x, z - caixa.z1, caixa.z2 - z);
    if (borda < 6) return "minecraft:black_concrete";
    const s = estrela(x, z);
    if (s) return "minecraft:" + s;
    return "minecraft:" + fundo(x, z);
  };
  for (let z = caixa.z1; z <= caixa.z2; z++) {
    let ini = caixa.x1, atual = blocoEm(ini, z);
    for (let x = caixa.x1 + 1; x <= caixa.x2 + 1; x++) {
      const b = x <= caixa.x2 ? blocoEm(x, z) : null;
      if (b !== atual) {
        F(ini, Y_CEU, z, x - 1, Y_CEU, z, atual);
        ini = x;
        atual = b;
      }
    }
    yield* pausa(600);
  }
}

// ------------------------------------------------------------------------------------ paredes do céu
/** Rampa da parede: do vazio ao brilho (sem branco: o pé da parede é uma luz violeta, não uma lâmpada). */
const RAMPA_PAREDE = ["black_concrete", "black_concrete", "blue_terracotta", "blue_concrete", "purple_concrete", "magenta_concrete", "light_blue_concrete", "cyan_concrete"];
const Y_PE = -3;

/** constelações da parede: [s, y, pontos [ds, dy, mãe]] (s = posição ao longo do perímetro desenrolado) */
function constelacoesParede(P) {
  const mold = [
    [[0, 0, 1], [6, 3, 0], [12, 1, 1], [17, 6, 0], [23, 4, 0]],           // um arco de cinco estrelas
    [[0, 0, 0], [5, 6, 1], [11, 2, 0], [16, 9, 1], [22, 3, 0]],           // um W alto
    [[0, 4, 1], [7, 0, 0], [7, 8, 0], [14, 4, 1]],                         // um losango (a Pipa)
    [[0, 0, 0], [6, 2, 0], [12, 4, 1], [18, 7, 0], [24, 11, 1]],           // uma escada de estrelas subindo
  ];
  const lista = [];
  for (let i = 0; i < 12; i++) lista.push({ s: Math.floor((P * (i + 0.5)) / 12) - 10, y: 22 + ((i * 7) % 18), pts: mold[i % mold.length] });
  return lista;
}

/** @returns {(s: number, y: number) => string} bloco da parede em (s,y) */
function fabricaParede(P) {
  const ad = new Map();
  for (const c of constelacoesParede(P)) {
    for (const [ds, dy, mae] of c.pts) {
      const s = ((c.s + ds) % P + P) % P, y = c.y + dy;
      ad.set(s + "," + y, mae ? "sea_lantern" : "white_concrete");
      for (const [os, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = ((s + os) % P + P) % P + "," + (y + oy);
        if (!ad.has(k)) ad.set(k, mae ? "white_concrete" : "light_blue_concrete");
      }
    }
  }
  return (s, y) => {
    const a = ad.get(s + "," + y);
    if (a) return a;
    const t = (y - Y_PE) / (Y_CEU - Y_PE);
    // degradê de luz que sobe do horizonte: forte no pé, some antes da metade; nuvens alongadas de nebulosa por cima
    const luz = Math.exp(-(y - Y_PE) / 15);
    const nuvem = fbm(s * 0.7, y * 1.5, 11, 34, 3);
    const nuvem2 = fbm(s * 0.5 + 300, y * 1.2, 23, 22, 2);
    let v = luz * 0.62 + Math.max(0, nuvem - 0.42) * (1.1 - t) * 0.95 + Math.max(0, nuvem2 - 0.6) * 0.8 * (1 - t) * (t > 0.15 ? 1 : 0.3);
    v += (hash2(s, y, 5) - 0.5) * 0.06;
    v += 0.1 * (1 - t) * (1 - t); // azul de meia-noite de base, escurecendo para cima
    v = Math.max(0, Math.min(0.999, v * (1 - Math.max(0, t - 0.8) * 4))); // topo preto (encontra o teto sem emenda)
    const k = Math.floor(v * 8.2);
    if (k === 0 || k === 1) {
      // estrelas soltas só no escuro
      const h = hash2(s, y, 1234);
      if (h < 0.014) return hash2(s, y, 4321) < 0.0004 / 0.014 ? "sea_lantern" : hash2(s, y, 99) < 0.75 ? "white_concrete" : "quartz_block";
    }
    return RAMPA_PAREDE[Math.min(k, RAMPA_PAREDE.length - 1)];
  };
}

/**
 * Quatro paredes de 2 blocos em volta de tudo, do fundo ao teto, sem frestas nos cantos: a camada de fora é preta lisa e a de dentro
 * é a galáxia (um perímetro só, desenrolado, para as cores passarem os cantos sem emenda).
 * @param {*} H @param {{ x1:number, z1:number, x2:number, z2:number, y1:number }} c  a caixa do céu
 */
export function* paredes(H, c) {
  const { F, pausa } = H;
  const yTopo = Y_CEU - 1;
  // camada de fora e miolo enterrado: pretos e lisos (fatias de altura para o fill não passar de 30000)
  const lisa = (x1, z1, x2, z2) => {
    const area = (x2 - x1 + 1) * (z2 - z1 + 1);
    const passo = Math.max(1, Math.floor(28000 / area));
    for (let y = c.y1 + 1; y <= yTopo; y += passo) F(x1, y, z1, x2, Math.min(yTopo, y + passo - 1), z2, "minecraft:black_concrete");
  };
  lisa(c.x1, c.z1, c.x2, c.z1 + 1); lisa(c.x1, c.z2 - 1, c.x2, c.z2); lisa(c.x1, c.z1 + 2, c.x1 + 1, c.z2 - 2); lisa(c.x2 - 1, c.z1 + 2, c.x2, c.z2 - 2);
  yield;
  // camada de dentro: a galáxia, por colunas (corridas verticais do mesmo bloco viram um fill)
  const xi1 = c.x1 + 1, xi2 = c.x2 - 1, zi1 = c.z1 + 1, zi2 = c.z2 - 1;
  const Wd = xi2 - xi1, Hd = zi2 - zi1, P = 2 * (Wd + Hd);
  const bloco = fabricaParede(P);
  /** @type {[number, number, number][]} x, z, s */
  const colunas = [];
  for (let x = xi1; x <= xi2; x++) colunas.push([x, zi1, x - xi1]);
  for (let z = zi1 + 1; z <= zi2; z++) colunas.push([xi2, z, Wd + (z - zi1)]);
  for (let x = xi2 - 1; x >= xi1; x--) colunas.push([x, zi2, Wd + Hd + (xi2 - x)]);
  for (let z = zi2 - 1; z > zi1; z--) colunas.push([xi1, z, 2 * Wd + Hd + (zi2 - z)]);
  for (const [x, z, s] of colunas) {
    let ini = Y_PE, atual = bloco(s, ini);
    for (let y = Y_PE + 1; y <= yTopo + 1; y++) {
      const b = y <= yTopo ? bloco(s, y) : "";
      if (b !== atual) {
        F(x, ini, z, x, y - 1, z, "minecraft:" + atual);
        ini = y;
        atual = b;
      }
    }
    yield* pausa(600);
  }
}

/**
 * Barreira invisível (2 blocos) logo dentro das paredes, do fundo ao teto. Só ocupa o que está vazio: onde há tronco ou copa a
 * própria árvore já bloqueia, e a copa não fica com buraco.
 * @param {*} H @param {{ x1:number, z1:number, x2:number, z2:number, y1:number }} c
 */
export function* barreira(H, c) {
  const { p, M } = H;
  const id = M.barreira;
  const yTopo = Y_CEU - 1;
  const x1 = c.x1 + 2, x2 = c.x2 - 2, z1 = c.z1 + 2, z2 = c.z2 - 2;
  const lado = (ax, az, bx, bz) => {
    const area = (bx - ax + 1) * (bz - az + 1);
    const passo = Math.max(1, Math.floor(28000 / area));
    for (let y = c.y1 + 1; y <= yTopo; y += passo) p.fill(ax, y, az, bx, Math.min(yTopo, y + passo - 1), bz, id, true);
  };
  lado(x1, z1, x2, z1 + 1); yield;
  lado(x1, z2 - 1, x2, z2); yield;
  lado(x1, z1 + 2, x1 + 1, z2 - 2); yield;
  lado(x2 - 1, z1 + 2, x2, z2 - 2); yield;
}
