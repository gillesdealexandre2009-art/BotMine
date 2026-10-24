// @ts-check
// O céu de "Ecos dos Ausentes": um teto de galáxia feito de blocos opacos (concreto), lá em cima, só nesta dimensão.
// Por que blocos e não bioma: o cliente pinta o céu pelo bioma do cliente, e a dimensão vazia usa um bioma que também serve
// às outras dimensões vulpus:* (intervalo, minigames). Trocar o céu dele pintaria o resto junto. O teto não tem esse risco.
// Todo ponto é função determinística de (x,z): a fase é retomável e dá o mesmo resultado em qualquer tick.
import { hash2, fbm } from "./ecos_mapa_base.js";

/** altura do teto (relativa ao chão). A torre mais alta da Vila termina em y=40. */
export const Y_CEU = 46;
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
