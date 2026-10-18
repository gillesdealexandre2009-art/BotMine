// @ts-check
// O Intervalo, em blocos: o construtor das cinco regiões (A Corredores, B Piscina Vazia, C Casa de Máquinas, D Estação, E Sala de
// Espera) e o mapa de tudo o que se pode tocar (registros, painéis, portas). Só geometria: fala com o Pincel (testável sem o jogo).
// Todas as coordenadas daqui são RELATIVAS à origem (o bloco do chão do canto oeste-norte da Região A): x cresce para o leste, z para
// o sul e y = 0 é o chão das salas (a pessoa fica em y = 1). Paleta (bíblia 14.1): bege sujo, verde-água, cinza de concreto e laranja
// de aviso; luz fluorescente fria difusa (sea_lantern atrás de vidro), algumas lâmpadas queimadas; nada de amarelo.
// Cada região tem a sua identidade: A é um andar de escritórios (papel de parede listrado, rodapé de madeira, portas com marco),
// B um natatório de azulejos com arquibancada e claraboia, C a casa de máquinas (cobre oxidado, caldeiras, lâmpadas em gaiola),
// D uma estação com abóbada e vitrô, E uma sala de espera acabada, de luz quente e baixa.
import * as T from "../textos/intervalo.js";
import * as K from "../textos/intervalo_cenario.js";
import { INDICE_ABAJUR, INDICE_BALAO_AZUL, INDICE_BALAO_CREME, INDICE_BALAO_ROSA, INDICE_CADEIRA, INDICE_FLOR_DOURADA, INDICE_PATO, INDICE_TELEFONE, INDICE_TV_ESTATICA, INDICE_URSO } from "../textos/props_modelos.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Pos */
/** @typedef {{ x: number, y: number, z: number, yaw: number }} Chegada */

const AR = "minecraft:air";
/** @param {string} n */
const b = (n) => `minecraft:${n}`;

/** Materiais (todos vanilla do Bedrock). */
const M = {
  // gerais
  luz: b("sea_lantern"),
  vidro: b("glass"),
  queimada: b("gray_concrete"),
  coracao: b("shroomlight"),
  aviso: b("orange_concrete"),
  preto: b("black_concrete"),
  branco: b("white_concrete"),
  madeira: b("spruce_planks"),
  madeiraClara: b("birch_planks"),
  madeiraEscura: b("dark_oak_planks"),
  corrente: b("iron_chain"),
  grade: b("iron_bars"),
  ferro: b("iron_block"),
  cobre: b("copper_block"),
  cobreVelho: b("oxidized_copper"),
  quartzo: b("quartz_block"),
  quartzoLiso: b("smooth_quartz"),
  coluna: b("quartz_pillar"),
  capitel: b("chiseled_quartz_block"),
  // A
  papelA: b("white_terracotta"),
  listraA: b("light_gray_concrete"),
  cornijaA: b("calcite"),
  pisoA: b("light_gray_concrete"),
  corredor: b("cyan_terracotta"),
  // B
  paredeB: b("quartz_block"),
  azulejo1: b("light_blue_concrete"),
  azulejo2: b("prismarine_bricks"),
  // C
  paredeC: b("gray_concrete"),
  pisoC: b("deepslate_tiles"),
  // D
  paredeD: b("polished_andesite"),
  pisoD: b("polished_andesite"),
  // E
  paredeE: b("white_terracotta"),
  lisa: b("smooth_quartz"),
};

// ---------------------------------------------------------------------------------------------------------------- regiões
/**
 * As cinco regiões: a caixa inclui as paredes. Entre A e B, B e C e D e E as paredes têm dois blocos (cada lado com o seu acabamento);
 * entre C e D a parede é uma só (x = 120).
 * @type {readonly { id: string, nome: string, x1: number, x2: number, z1: number, z2: number, y1: number, y2: number }[]}
 */
export const REG = [
  { id: "A", nome: T.REGIOES[0].nome, x1: 0, x2: 40, z1: 0, z2: 40, y1: -1, y2: 12 },
  { id: "B", nome: T.REGIOES[1].nome, x1: 40, x2: 80, z1: 0, z2: 40, y1: -5, y2: 16 },
  { id: "C", nome: T.REGIOES[2].nome, x1: 80, x2: 120, z1: 0, z2: 40, y1: -1, y2: 12 },
  { id: "D", nome: T.REGIOES[3].nome, x1: 120, x2: 160, z1: 0, z2: 40, y1: -4, y2: 16 },
  { id: "E", nome: T.REGIOES[4].nome, x1: 160, x2: 192, z1: 0, z2: 40, y1: -1, y2: 8 },
];

/** Caixa de tudo (paredes incluídas). */
export const CAIXA = { x1: 0, x2: 192, z1: 0, z2: 40, y1: -5, y2: 16 };

/** Região (índice 0-4) em que um ponto RELATIVO está (só o interior), ou -1. @param {number} x @param {number} y @param {number} z */
export function regiaoRelativa(x, y, z) {
  for (let i = 0; i < REG.length; i++) {
    const r = REG[i];
    if (x >= r.x1 + 1 && x < r.x2 && z >= r.z1 + 1 && z < r.z2 && y >= r.y1 + 1 && y < r.y2 + 1) return i;
  }
  return -1;
}

/** Dentro da caixa de tudo (paredes incluídas, com folga de 1 bloco)? @param {number} x @param {number} y @param {number} z */
export const dentroDaCaixa = (x, y, z) => x >= CAIXA.x1 - 1 && x <= CAIXA.x2 + 2 && z >= CAIXA.z1 - 1 && z <= CAIXA.z2 + 2 && y >= CAIXA.y1 - 1 && y <= CAIXA.y2 + 2;

/** Onde quem chega aparece: o corredor oeste da Região A, de frente para o cruzamento. @type {Chegada} */
export const CHEGADA = { x: 2.5, y: 1, z: 20.5, yaw: -90 };

// ---------------------------------------------------------------------------------------------------------------- Região A
/** Numeração das salas (a 14 não existe: é a porta da piscina). */
const NUM_SALAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17];
/**
 * As 16 salas da Região A (interior 6x6) e a porta de cada uma (1 de largura, 2 de altura) para o corredor mais próximo.
 * @type {readonly { n: number, x1: number, z1: number, porta: { x: number, z: number }, fora: { x: number, z: number } }[]}
 */
export const SALAS_A = (() => {
  /** @type {{ n: number, x1: number, z1: number, porta: { x: number, z: number }, fora: { x: number, z: number } }[]} */
  const l = [];
  const quadrantes = [[4, 4], [22, 4], [4, 22], [22, 22]];
  quadrantes.forEach(([qx, qz], qi) => {
    for (let idx = 0; idx < 4; idx++) {
      const cx = idx % 2, cz = idx >> 1;
      const x1 = qx + 1 + cx * 7, z1 = qz + 1 + cz * 7;
      const porX = (cx + cz) % 2 === 0;
      const oeste = cx === 0, norte = cz === 0;
      const porta = porX ? { x: oeste ? x1 - 1 : x1 + 6, z: z1 + 2 } : { x: x1 + 2, z: norte ? z1 - 1 : z1 + 6 };
      const fora = porX ? { x: porta.x + (oeste ? -1 : 1), z: porta.z } : { x: porta.x, z: porta.z + (norte ? -1 : 1) };
      l.push({ n: NUM_SALAS[qi * 4 + idx], x1, z1, porta, fora });
    }
  });
  return l;
})();
/** @param {number} n */
const sala = (n) => /** @type {{ n: number, x1: number, z1: number, porta: { x: number, z: number }, fora: { x: number, z: number } }} */ (SALAS_A.find((s) => s.n === n));

/**
 * Coordenadas "da sala": u (0-5) corre ao longo da parede da porta, v (0-5) entra na sala a partir da porta. A porta fica sempre em u = 2,
 * então os móveis são desenhados uma vez e giram para qualquer lado.
 * @param {{ x1: number, z1: number, porta: { x: number, z: number } }} s
 */
function orientar(s) {
  const lado = s.porta.x < s.x1 ? "o" : s.porta.x > s.x1 + 5 ? "l" : s.porta.z < s.z1 ? "n" : "s";
  /** @param {number} u @param {number} v @returns {{ x: number, z: number }} */
  const P = (u, v) => (lado === "n" ? { x: s.x1 + u, z: s.z1 + v } : lado === "s" ? { x: s.x1 + u, z: s.z1 + 5 - v } : lado === "o" ? { x: s.x1 + v, z: s.z1 + u } : { x: s.x1 + 5 - v, z: s.z1 + u });
  return { lado, P };
}
/** Ângulo de um deslocamento no plano (0 = sul, 90 = oeste, 180 = norte, 270 = leste). @param {number} dx @param {number} dz */
const yawDe = (dx, dz) => (dz > 0 ? 0 : dz < 0 ? 180 : dx < 0 ? 90 : 270);
/** Código do degrau (weirdo_direction): 0 leste, 1 oeste, 2 sul, 3 norte. @param {number} dx @param {number} dz */
const codDir = (dx, dz) => (dx > 0 ? 0 : dx < 0 ? 1 : dz > 0 ? 2 : 3);

/** O que cada sala é (cada uma com sua cara; as três dos mapas e as duas "para alguém" têm identidade própria). */
const TIPO_SALA = /** @type {Record<number, string>} */ ({
  1: "escritorio", 2: "arquivo", 3: "mapa", 4: "aula", 5: "copa", 6: "escritorio", 7: "almox", 8: "mapa", 9: "marta",
  10: "arquivo", 11: "escritorio", 12: "mapa", 13: "aula", 15: "copa", 16: "almox", 17: "voce",
});

// ---------------------------------------------------------------------------------------------------------------- o que se toca
/**
 * Um ponto onde o jogador clica: o tipo diz o que acontece (a lógica está em intervalo.js).
 * @typedef {{ x: number, y: number, z: number, t: string, r?: number, n?: number, m?: number, g?: string }} Ponto
 */
/** @type {Ponto[]} */
export const PONTOS = [];
/** @param {number} x @param {number} y @param {number} z @param {string} t @param {Partial<Ponto>} [extra] */
const ponto = (x, y, z, t, extra = {}) => PONTOS.push({ x, y, z, t, ...extra });

/**
 * Passagens entre regiões: painéis sólidos (porta de verdade só existe para quem já resolveu o enigma; senão é parede).
 * `menos`/`mais` são os dois lados (pela coordenada do eixo): `req` é o enigma (0-4) que precisa estar resolvido, -1 = sempre abre.
 * @typedef {{ req: number, dest: Chegada }} Passo
 * @type {{ id: string, blocos: Pos[], eixo: "x" | "z", limite: number, menos: Passo, mais: Passo, trancada: string }[]}
 */
export const PORTAS = [
  {
    id: "A_B",
    blocos: [{ x: 40, y: 1, z: 20 }, { x: 40, y: 2, z: 20 }, { x: 40, y: 3, z: 20 }],
    eixo: "x",
    limite: 40.5,
    menos: { req: 0, dest: { x: 42.5, y: 1, z: 20.5, yaw: -90 } },
    mais: { req: -1, dest: { x: 38.5, y: 1, z: 20.5, yaw: 90 } },
    trancada: T.PORTAS.A_B,
  },
  {
    id: "B_C",
    blocos: [{ x: 75, y: -2, z: 20 }, { x: 75, y: -1, z: 20 }],
    eixo: "x",
    limite: 75.5,
    menos: { req: 1, dest: { x: 83.5, y: 1, z: 20.5, yaw: -90 } },
    mais: { req: -1, dest: { x: 73.5, y: -2, z: 20.5, yaw: 90 } },
    trancada: T.PORTAS.B_C,
  },
  {
    id: "C_B",
    blocos: [{ x: 81, y: 1, z: 20 }, { x: 81, y: 2, z: 20 }],
    eixo: "x",
    limite: 81.5,
    menos: { req: -1, dest: { x: 73.5, y: -2, z: 20.5, yaw: 90 } },
    mais: { req: -1, dest: { x: 73.5, y: -2, z: 20.5, yaw: 90 } },
    trancada: T.PORTAS.B_C,
  },
  {
    id: "D_E",
    blocos: [{ x: 160, y: 1, z: 30 }, { x: 160, y: 2, z: 30 }],
    eixo: "x",
    limite: 160.5,
    menos: { req: 3, dest: { x: 162.5, y: 1, z: 30.5, yaw: -90 } },
    mais: { req: -1, dest: { x: 158.5, y: 1, z: 30.5, yaw: 90 } },
    trancada: T.PORTAS.D_E,
  },
];
for (const g of PORTAS) for (const bl of g.blocos) PONTOS.push({ x: bl.x, y: bl.y, z: bl.z, t: "porta", g: g.id });

/** Textos flutuantes (rótulos curtos). @type {{ x: number, y: number, z: number, t: string }[]} */
export const ROTULOS = [];
/** @param {number} x @param {number} y @param {number} z @param {string} t */
const rotulo = (x, y, z, t) => ROTULOS.push({ x, y, z, t });

/** Decoração (props da feira). @type {{ m: number, x: number, y: number, z: number, yaw: number }[]} */
export const PROPS = [];
/** @param {number} m @param {number} x @param {number} y @param {number} z @param {number} [yaw] */
const prop = (m, x, y, z, yaw = 0) => PROPS.push({ m, x, y, z, yaw });

/** Lugares "para você": só quem está perto lê, só no texto da própria pessoa. @type {{ x: number, y: number, z: number, r: number, t: "sala" | "placa" }[]} */
export const ZONAS_NOME = [];

// ---- A
// Mesa de Tomás (o enigma 4), no cruzamento, e os mapas nas salas 8, 12 e 3 (no fundo da sala, de frente para a porta)
ponto(20, 1, 20, "mesa");
for (const m of T.MAPAS) {
  const s = sala(m.sala);
  const q = orientar(s).P(2, 4);
  ponto(q.x, 1, q.z, "mapa", { m: m.sala });
}
ponto(1, 1, 10, "mapa_rasgado");
// a anotação rasurada de Tomás (R-8), na sala do primeiro mapa, no canto do fundo
{
  const q = orientar(sala(8)).P(4, 5);
  ponto(q.x, 1, q.z, "reg", { r: 8 });
}
// a sala 9, arrumada por Marta, e a sala 17: placas "para você"
ZONAS_NOME.push({ x: sala(9).x1 + 3, y: 1, z: sala(9).z1 + 3, r: 3.5, t: "sala" });
ZONAS_NOME.push({ x: sala(17).x1 + 3, y: 1, z: sala(17).z1 + 3, r: 3.5, t: "sala" });
// placas penduradas do teto (com o erro mínimo: a última repete a ordem trocada)
for (const [x, z] of [[2.5, 10.5], [20.5, 10.5], [38.5, 30.5]]) rotulo(x, 5.4, z, T.PLACA_AREA);
rotulo(20.5, 5.4, 30.5, K.AREA_ERRADA);
rotulo(39.5, 4.6, 20.5, T.PLACA_PORTA_14);
rotulo(10.5, 4.6, 1.4, K.SAIDA_DIREITA);
rotulo(30.5, 4.6, 39.6, K.SAIDA_ESQUERDA);
for (const s of SALAS_A) rotulo(s.fora.x + 0.5, 3.3, s.fora.z + 0.5, T.PLACA_SALA(s.n));
rotulo(20.5, 3.6, 22.5, K.MESA_TOMAS);
{
  const { P } = orientar(sala(9));
  const a = P(4, 3), c = P(3, 2), d = P(3, 3);
  prop(INDICE_ABAJUR, a.x + 0.5, 2, a.z + 0.5, 0);
  const { P: P9 } = orientar(sala(9));
  const dx = P9(4, 2).x - P9(3, 2).x, dz = P9(4, 2).z - P9(3, 2).z;
  prop(INDICE_CADEIRA, c.x + 0.5, 1, c.z + 0.5, yawDe(dx, dz));
  prop(INDICE_CADEIRA, d.x + 0.5, 1, d.z + 0.5, yawDe(dx, dz) + 20);
}
{
  const { P } = orientar(sala(17));
  const a = P(4, 3), dx = P(2, 0).x - P(2, 1).x, dz = P(2, 0).z - P(2, 1).z;
  prop(INDICE_CADEIRA, a.x + 0.5, 1, a.z + 0.5, yawDe(dx, dz));
}
prop(INDICE_TV_ESTATICA, 2.5, 2, 37.5, 270);

// ---- B
const LANE_Z = [11, 14, 17, 20, 23, 26];
ponto(44, 2, 35, "banca");
ponto(47, 1, 20, "toalha");
ponto(42, 1, 6, "vaso_seco");
LANE_Z.forEach((z, i) => {
  ponto(46, 1, z, "valvula", { n: i + 1 });
  rotulo(46.5, 2.8, z + 0.5, T.PLACA_VALVULA(i + 1));
});
// o quadro-negro de Beto (R-9) e o desenho de giz da flor (R-4): todas as casas do desenho respondem
for (let x = 70; x <= 72; x++) for (let y = 2; y <= 4; y++) ponto(x, y, 0, "reg", { r: 9 });
const FLOR_BETO = ["..#..", ".###.", "..#..", "..#..", "#####"];
// a flor inteira (todas as casas ao alcance, também as vazias em volta) responde ao toque: antes só as 3 fileiras de baixo contavam
for (let x = 59; x <= 63; x++) for (let y = 2; y <= 5; y++) ponto(x, y, 40, "reg", { r: 4 });
rotulo(74.4, -0.4, 20.5, T.PLACA_MANUTENCAO);
rotulo(44.5, 3.4, 32.4, K.SALVA_VIDAS);
rotulo(48.5, 3.2, 8.5, K.NAO_CORRA);
rotulo(61.5, 2.2, 9.5, K.PROFUNDIDADE);
rotulo(70.5, 3.4, 29.5, K.VESTIARIO_M);
rotulo(77.5, 3.4, 29.5, K.VESTIARIO_F);
rotulo(58.5, 5.4, 8.5, K.ARQUIBANCADA);
prop(INDICE_PATO, 55.5, -2, 15.5, 30);
prop(INDICE_PATO, 66.5, -2, 24.5, 200);
prop(INDICE_BALAO_AZUL, 52.5, 5, 4.5, 0); // preso no alto da arquibancada
prop(INDICE_BALAO_ROSA, 78.5, 4, 14.5, 0); // preso no trampolim
prop(INDICE_URSO, 43.5, 2, 34.5, 90);

// ---- C
ponto(100, 2, 16, "caderno");
ponto(100, 1, 36, "livro7");
ponto(100, 1, 11, "trancada");
const SW_X = [84, 86, 88, 90];
SW_X.forEach((x, i) => {
  ponto(x, 2, 2, "sw", { n: i + 1 });
  rotulo(x + 0.5, 3.4, 3.5, T.PLACA_INTERRUPTOR(i + 1));
});
const LUZ_X = [112, 114, 116, 118];
LUZ_X.forEach((x, i) => rotulo(x + 0.5, 3.4, 38.5, T.PLACA_LUZ(i + 1)));
ponto(110, 2, 35, "confirma");
rotulo(111.5, 3.2, 35.5, T.PLACA_CONFIRMAR);
rotulo(102.5, 3.4, 12.5, T.PLACA_MAQUINAS);
rotulo(86.5, 3.4, 12.5, K.QUADRO_GERAL);
rotulo(100.5, 4.4, 10.5, K.SALA_FECHADA);
rotulo(105.5, 7.6, 15.5, K.CALDEIRA(1));
rotulo(105.5, 7.6, 25.5, K.CALDEIRA(2));
rotulo(103.5, 5.2, 34.5, K.TANQUE);
rotulo(90.5, 3.4, 19.5, K.ALTA_PRESSAO);
prop(INDICE_ABAJUR, 99.5, 2, 15.5, 0);
prop(INDICE_CADEIRA, 97.5, 1, 16.5, 270);

// ---- D
const PAINEL_X1 = 136, PAINEL_X2 = 146;
for (let x = PAINEL_X1; x <= PAINEL_X2; x++) for (let y = 2; y <= 4; y++) ponto(x, y, 39, "painel");
for (let x = 133; x <= 134; x++) for (let y = 2; y <= 4; y++) ponto(x, y, 39, "fita");
ponto(150, 1, 37, "reg", { r: 5 });
rotulo(141.5, 5.4, 38.4, T.PLACA_ESTACAO);
rotulo(125.5, 2.8, 33.5, T.PLACA_PLATAFORMA);
rotulo(126.5, 5.4, 35.4, K.BILHETERIA);
rotulo(126.5, 3.4, 35.4, K.VOLTO_JA);
rotulo(140.5, 1.4, 27.5, K.LINHA);
rotulo(158.5, 3.9, 29.5, K.SEM_SERVICO);
prop(INDICE_TELEFONE, 150.5, 2, 37.5, 180);
prop(INDICE_BALAO_CREME, 132.5, 1, 30.5, 0); // esquecido, preso a um banco

// ---- E
ponto(178, 1, 30, "reg", { r: 6 });
ponto(178, 1, 28, "visitas");
ponto(178, 1, 32, "vaso");
ponto(164, 1, 36, "reg", { r: 10 });
const PLACAS_E = [24, 26, 34, 36];
const LETRAS_E = [5, 4, 5, 4];
PLACAS_E.forEach((z, i) => {
  ponto(192, 3, z, "placa", { n: LETRAS_E[i] });
  rotulo(191.4, 3.3, z + 0.5, T.PLACA_LETRAS(LETRAS_E[i]));
});
ponto(192, 3, 38, "placa", { n: 0 });
ZONAS_NOME.push({ x: 190, y: 1, z: 37, r: 3.2, t: "placa" });
for (let y = 1; y <= 3; y++) for (let z = 29; z <= 31; z++) ponto(192, y, z, "portaNomes");
rotulo(178.5, 3.4, 26.5, T.PLACA_ESPERA);
rotulo(191.4, 5.2, 30.5, K.SENHA_ATUAL);
rotulo(163.5, 3.6, 30.5, K.SUA_SENHA);
prop(INDICE_TELEFONE, 178.5, 2, 30.5, 90);
prop(INDICE_FLOR_DOURADA, 178.5, 2, 32.5, 0);
prop(INDICE_ABAJUR, 162.5, 2, 26.5, 0);
prop(INDICE_CADEIRA, 170.5, 1, 24.5, 270);
prop(INDICE_CADEIRA, 172.5, 1, 36.5, 270);

/** Pontos por posição relativa ("x,y,z"). @type {Map<string, Ponto>} */
export const PONTO_POR_POS = new Map(PONTOS.map((p) => [`${p.x},${p.y},${p.z}`, p]));

// ---------------------------------------------------------------------------------------------------------------- construção
/**
 * Apaga a área do Intervalo inteira (camada por camada: do chão ao teto, paredes incluídas).
 * @param {Pincel} p
 * @param {{ x: number, y: number, z: number }} o
 * @returns {Generator<any, void, any>}
 */
export function* limpar(p, o) {
  yield "limpando a área";
  for (let y = CAIXA.y1 - 1; y <= CAIXA.y2 + 1; y++) {
    p.fill(o.x - 1, o.y + y, o.z - 1, o.x + CAIXA.x2 + 1, o.y + y, o.z + CAIXA.z2 + 1, AR);
    if (y % 3 === 0) yield;
  }
}

/** Desenhos 3x5 dos números (de cima para baixo). */
const DIGITOS = /** @type {Record<number, string[]>} */ ({
  1: [".#.", "##.", ".#.", ".#.", "###"],
  2: ["###", "..#", "###", "#..", "###"],
  3: ["###", "..#", "###", "..#", "###"],
  4: ["#.#", "#.#", "###", "..#", "..#"],
  5: ["###", "#..", "###", "..#", "###"],
  6: ["###", "#..", "###", "#.#", "###"],
});

/**
 * Constrói as cinco regiões a partir da origem (a Região A começa nela). Cede a vez (`yield`) com frequência, para o motor
 * respeitar o orçamento de milissegundos por tick; os `yield` com texto dizem em que fase está.
 * @param {Pincel} p
 * @param {{ x: number, y: number, z: number }} o
 * @returns {Generator<any, void, any>}
 */
export function* construir(p, o) {
  /** Preenche (relativo à origem); divide os volumes grandes, porque o jogo aceita no máximo 32 768 blocos por vez. */
  const F = (/** @type {number} */ x1, /** @type {number} */ y1, /** @type {number} */ z1, /** @type {number} */ x2, /** @type {number} */ y2, /** @type {number} */ z2, /** @type {string} */ id) => {
    const a = [Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2)];
    const c = [Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2)];
    const n = [c[0] - a[0] + 1, c[1] - a[1] + 1, c[2] - a[2] + 1];
    if (n[0] * n[1] * n[2] <= 30000) {
      p.fill(o.x + a[0], o.y + a[1], o.z + a[2], o.x + c[0], o.y + c[1], o.z + c[2], id);
      return;
    }
    const k = n.indexOf(Math.max(...n));
    const meio = a[k] + (n[k] >> 1);
    const c1 = [...c], a2 = [...a];
    c1[k] = meio - 1;
    a2[k] = meio;
    F(a[0], a[1], a[2], c1[0], c1[1], c1[2], id);
    F(a2[0], a2[1], a2[2], c[0], c[1], c[2], id);
  };
  /** @param {number} x @param {number} y @param {number} z @param {string} id @param {Record<string, string | number | boolean>} [est] */
  const S = (x, y, z, id, est) => p.set(o.x + x, o.y + y, o.z + z, id, est);
  /** Ar. */
  const ar = (/** @type {number} */ x1, /** @type {number} */ y1, /** @type {number} */ z1, /** @type {number} */ x2, /** @type {number} */ y2, /** @type {number} */ z2) => F(x1, y1, z1, x2, y2, z2, AR);
  /** Desenho em blocos: `linhas` de cima para baixo; `#` = bloco. `pos(c, r)` dá a posição de cada casa. */
  const arte = (/** @type {string[]} */ linhas, /** @type {string} */ id, /** @type {(c: number, r: number) => Pos} */ pos) => {
    linhas.forEach((ln, r) => {
      for (let c = 0; c < ln.length; c++) {
        if (ln[c] !== "#") continue;
        const q = pos(c, linhas.length - 1 - r);
        S(q.x, q.y, q.z, id);
      }
    });
  };
  /** Número pintado no chão (3 de largura em z, 5 de comprimento em x; o "alto" do desenho aponta para o leste). */
  const digitoChao = (/** @type {number} */ n, /** @type {number} */ x0, /** @type {number} */ z0, /** @type {number} */ y, /** @type {string} */ id) => {
    arte(DIGITOS[n], id, (c, r) => ({ x: x0 + r, y, z: z0 + c }));
  };
  let nLuz = 0;
  const queimou = () => {
    nLuz++;
    return (nLuz * 7 + 3) % 6 === 0;
  };
  /**
   * Luminária de teto embutida: vidro leitoso na face e sea_lantern escondido por trás (nunca luz crua). De vez em quando uma queimada.
   * `y` é o plano do teto; o painel de luz fica em y + 1 (dentro da massa).
   */
  const painelLuz = (/** @type {number} */ x1, /** @type {number} */ z1, /** @type {number} */ x2, /** @type {number} */ z2, /** @type {number} */ y) => {
    if (queimou()) {
      F(x1, y, z1, x2, y, z2, M.queimada);
      return;
    }
    F(x1, y, z1, x2, y, z2, M.vidro);
    F(x1, y + 1, z1, x2, y + 1, z2, M.luz);
  };
  /** Lanterna pendurada por uma corrente (teto em `yTeto`; a lanterna fica `len` abaixo). */
  const pendente = (/** @type {number} */ x, /** @type {number} */ yTeto, /** @type {number} */ z, /** @type {number} */ len) => {
    F(x, yTeto - len + 1, z, x, yTeto, z, M.corrente);
    S(x, yTeto - len, z, b("lantern"), { hanging: true });
  };
  /** Lâmpada em gaiola (Região C): lanterna pendurada e grade em volta. */
  const gaiola = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z) => {
    S(x, y, z, b("lantern"), { hanging: true });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) S(x + dx, y, z + dz, M.grade);
    S(x, y - 1, z, M.grade);
  };
  /** Degrau como cadeira: de frente para (fx, fz) em coordenadas do mundo; o encosto fica atrás. */
  const cadeira = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z, /** @type {number} */ fx, /** @type {number} */ fz, id = b("spruce_stairs")) => {
    S(x, y, z, id, { weirdo_direction: codDir(-fx, -fz) });
  };
  /** Vaso de planta: base de musgo e a planta em cima. */
  const planta = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z, /** @type {string} */ qual = b("azalea")) => {
    S(x, y, z, b("moss_block"));
    S(x, y + 1, z, qual);
  };
  /**
   * Janela alta numa parede de planos z (norte ou sul) ou x (oeste/leste): moldura de madeira, vidro e, do lado de fora, um painel de
   * luz leitosa (a "claridade lá de fora": o prédio nunca escurece).
   * `eixo` "z": a parede é o plano z = pos, a janela corre de c1 a c2 em x; `fora` = +1 ou -1 (para onde fica o lado de fora).
   */
  const janela = (/** @type {"x" | "z"} */ eixo, /** @type {number} */ pos, /** @type {number} */ c1, /** @type {number} */ c2, /** @type {number} */ y1, /** @type {number} */ y2, /** @type {number} */ fora, /** @type {string} */ moldura, vidro = M.vidro) => {
    const g = (/** @type {number} */ a, /** @type {number} */ ya, /** @type {number} */ bb, /** @type {number} */ yb, /** @type {number} */ d, /** @type {string} */ id) => (eixo === "z" ? F(a, ya, pos + d, bb, yb, pos + d, id) : F(pos + d, ya, a, pos + d, yb, bb, id));
    g(c1, y1, c2, y2, 0, vidro);
    g(c1, y1, c2, y2, fora, M.luz);
    // moldura: soleira, verga e montantes
    g(c1 - 1, y1 - 1, c2 + 1, y1 - 1, 0, moldura);
    g(c1 - 1, y2 + 1, c2 + 1, y2 + 1, 0, moldura);
    g(c1 - 1, y1, c1 - 1, y2, 0, moldura);
    g(c2 + 1, y1, c2 + 1, y2, 0, moldura);
    const meio = (c1 + c2) >> 1;
    if (c2 - c1 >= 2) g(meio, y1, meio, y2, 0, moldura);
  };

  // ------------------------------------------------ 0. limpar tudo (camada por camada)
  yield* limpar(p, o);

  // ------------------------------------------------ 1. massa sólida de cada região (depois só se escava)
  yield "paredes";
  /** @type {string[]} */
  const paredes = [M.papelA, M.paredeB, M.paredeC, M.paredeD, M.paredeE];
  // de trás para a frente: cada região fica com a parede que divide com a vizinha do lado leste
  for (let i = REG.length - 1; i >= 0; i--) {
    const r = REG[i];
    F(r.x1, r.y1, r.z1, r.x2, r.y2, r.z2, paredes[i]);
    if (i % 2 === 0) yield;
  }
  yield;

  // ================================================================================================================ A. Corredores
  yield "A · Corredores";
  {
    /** Casas abertas (corredores, praça, salas, portas) no plano x,z: dizem onde há parede aparente. @type {Set<string>} */
    const aberto = new Set();
    const abre = (/** @type {number} */ x1, /** @type {number} */ z1, /** @type {number} */ x2, /** @type {number} */ z2) => {
      for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) aberto.add(`${x},${z}`);
    };
    const CORREDORES = [[1, 1, 39, 3], [1, 37, 39, 39], [1, 1, 3, 39], [37, 1, 39, 39], [19, 1, 21, 39], [1, 19, 39, 21]];
    // a "pele" das paredes: rodapé e friso de madeira, papel de parede (o miolo é a própria massa) e cornija
    F(0, 1, 0, 40, 2, 40, M.madeira);
    F(0, 3, 0, 40, 3, 40, M.madeiraClara);
    F(0, 7, 0, 40, 7, 40, M.cornijaA);
    F(0, 8, 0, 40, 8, 40, M.listraA);
    F(1, 0, 1, 39, 0, 39, M.pisoA);
    yield;
    // corredores (7 de altura), a praça do cruzamento (5x5, 10 de altura) e as quinas
    for (const [x1, z1, x2, z2] of CORREDORES) {
      ar(x1, 1, z1, x2, 7, z2);
      abre(x1, z1, x2, z2);
    }
    ar(18, 1, 18, 22, 10, 22);
    abre(18, 18, 22, 22);
    // as salas e as portas
    for (const s of SALAS_A) {
      ar(s.x1, 1, s.z1, s.x1 + 5, 5, s.z1 + 5);
      abre(s.x1, s.z1, s.x1 + 5, s.z1 + 5);
      abre(s.porta.x, s.porta.z, s.porta.x, s.porta.z);
    }
    yield;
    // listras do papel de parede: só onde há parede aparente (as casas fechadas com vizinha aberta), em diagonal para valer nos dois sentidos
    for (let x = 0; x <= 40; x++) {
      for (let z = 0; z <= 40; z++) {
        if ((x + z) % 4 !== 0 || aberto.has(`${x},${z}`)) continue;
        if (!(aberto.has(`${x + 1},${z}`) || aberto.has(`${x - 1},${z}`) || aberto.has(`${x},${z + 1}`) || aberto.has(`${x},${z - 1}`))) continue;
        F(x, 4, z, x, 6, z, M.listraA);
      }
    }
    yield;
    // piso dos corredores: faixa central verde-água, praça em anéis, quinas de aviso
    for (const x of [2, 20, 38]) F(x, 0, 1, x, 0, 39, M.corredor);
    for (const z of [2, 20, 38]) F(1, 0, z, 39, 0, z, M.corredor);
    F(18, 0, 18, 22, 0, 22, M.papelA);
    F(19, 0, 19, 21, 0, 21, M.corredor);
    F(20, 0, 20, 20, 0, 20, b("smooth_stone"));
    for (const [x, z] of [[1, 1], [37, 1], [1, 37], [37, 37]]) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S(x + i, 0, z + j, (i + j) % 2 === 0 ? M.aviso : M.preto);
    }
    // faixa de aviso diante da porta 14
    for (let z = 19; z <= 21; z++) for (let x = 36; x <= 39; x++) S(x, 0, z, (x + z) % 2 === 0 ? M.aviso : M.preto);
    yield;
    // teto: vigas a cada 6, luminárias difusas no meio de cada vão e o "coração" quente de cada corredor
    const VIGAS = [5, 11, 17, 23, 29, 35];
    const LUZES = [8, 14, 26, 32];
    for (const t of VIGAS) {
      F(19, 7, t, 21, 7, t, M.madeira);
      F(t, 7, 19, t, 7, 21, M.madeira);
      F(t, 7, 1, t, 7, 3, M.madeira);
      F(t, 7, 37, t, 7, 39, M.madeira);
      F(1, 7, t, 3, 7, t, M.madeira);
      F(37, 7, t, 39, 7, t, M.madeira);
    }
    for (const t of LUZES) {
      painelLuz(19, t - 1, 21, t + 1, 8);
      painelLuz(t - 1, 19, t + 1, 21, 8);
      painelLuz(t - 1, 1, t + 1, 3, 8);
      painelLuz(t - 1, 37, t + 1, 39, 8);
      painelLuz(1, t - 1, 3, t + 1, 8);
      painelLuz(37, t - 1, 39, t + 1, 8);
    }
    for (const [x, z] of [[20, 2], [2, 20], [38, 20], [20, 38]]) S(x, 8, z, M.coracao);
    yield;

    // ---- a praça do cruzamento: lanterna de luz no teto, quatro colunas e a mesa de Tomás
    F(18, 11, 18, 22, 11, 22, M.vidro);
    F(18, 12, 18, 22, 12, 22, M.luz);
    for (const [x, z] of [[19, 19], [21, 19], [19, 21], [21, 21]]) {
      F(x, 1, z, x, 9, z, M.coluna);
      S(x, 1, z, M.quartzoLiso);
      S(x, 10, z, M.capitel);
    }
    F(19, 10, 19, 21, 10, 19, M.madeira);
    F(19, 10, 21, 21, 10, 21, M.madeira);
    S(19, 10, 20, M.madeira);
    S(21, 10, 20, M.madeira);
    S(20, 10, 20, M.madeira);
    F(20, 7, 20, 20, 9, 20, M.corrente);
    S(20, 6, 20, b("lantern"), { hanging: true });
    // cornija da lanterna de luz
    F(17, 8, 17, 23, 8, 17, M.madeiraClara);
    F(17, 8, 23, 23, 8, 23, M.madeiraClara);
    F(17, 8, 17, 17, 8, 23, M.madeiraClara);
    F(23, 8, 17, 23, 8, 23, M.madeiraClara);
    S(20, 1, 20, b("cartography_table"));
    // vasos de samambaia nos cantos da praça e uma cadeira de espera
    planta(18, 1, 18, b("fern"));
    planta(22, 1, 22, b("fern"));
    S(22, 1, 18, b("flower_pot"));
    S(18, 1, 22, b("flower_pot"));
    yield;

    // ---- janelas altas nos corredores de fora (norte, sul e oeste): a luz "de fora" cai em manchas no piso
    for (const t of LUZES) {
      janela("z", 0, t - 1, t + 1, 4, 6, -1, M.madeiraClara);
      janela("z", 40, t - 1, t + 1, 4, 6, 1, M.madeiraClara);
      janela("x", 0, t - 1, t + 1, 4, 6, -1, M.madeiraClara);
      for (let k = 0; k < 3; k++) {
        F(t - 1 + k, 0, 1 + k, t + 1 + k, 0, 1 + k, M.cornijaA); // mancha de luz do norte
        F(t - 1 + k, 0, 39 - k, t + 1 + k, 0, 39 - k, M.cornijaA); // e do sul
        F(1 + k, 0, t - 1 + k, 1 + k, 0, t + 1 + k, M.cornijaA); // e do oeste
      }
    }
    yield;

    // ---- portas das salas: marco de madeira clara e verga
    for (const s of SALAS_A) {
      const na = s.porta.x < s.x1 || s.porta.x > s.x1 + 5;
      ar(s.porta.x, 1, s.porta.z, s.porta.x, 2, s.porta.z);
      for (const d of [-1, 1]) F(na ? s.porta.x : s.porta.x + d, 1, na ? s.porta.z + d : s.porta.z, na ? s.porta.x : s.porta.x + d, 4, na ? s.porta.z + d : s.porta.z, b("stripped_birch_log"));
      S(s.porta.x, 3, s.porta.z, b("stripped_birch_log"));
      S(s.porta.x, 4, s.porta.z, M.madeiraClara);
      // soleira no chão do corredor
      S(s.porta.x, 0, s.porta.z, M.madeiraClara);
    }
    yield;

    // ---- quadros no corredor (todos iguais, com um que erra a cor): só em paredes sem porta
    const portas = SALAS_A.map((s) => s.porta);
    const livre = (/** @type {number} */ x1, /** @type {number} */ z1, /** @type {number} */ x2, /** @type {number} */ z2) => {
      for (let x = x1 - 1; x <= x2 + 1; x++) for (let z = z1 - 1; z <= z2 + 1; z++) if (portas.some((q) => q.x === x && q.z === z)) return false;
      for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) if (aberto.has(`${x},${z}`)) return false;
      return true;
    };
    /** @param {number} x @param {number} z @param {"x" | "z"} eixo @param {string} cor */
    const quadro = (x, z, eixo, cor) => {
      const x2 = eixo === "x" ? x + 3 : x, z2 = eixo === "z" ? z + 3 : z;
      if (!livre(x, z, x2, z2)) return false;
      F(x, 4, z, x2, 6, z2, M.madeiraEscura);
      if (eixo === "x") F(x + 1, 5, z, x + 2, 5, z, cor);
      else F(x, 5, z + 1, x, 5, z + 2, cor);
      return true;
    };
    let q = 0;
    for (const [x, z, eixo] of /** @type {[number, number, "x" | "z"][]} */ ([[8, 4, "x"], [28, 4, "x"], [8, 36, "x"], [28, 36, "x"], [4, 8, "z"], [4, 28, "z"], [36, 8, "z"], [36, 28, "z"], [9, 18, "x"], [28, 18, "x"], [9, 22, "x"], [28, 22, "x"], [18, 9, "z"], [18, 28, "z"], [22, 9, "z"], [22, 28, "z"]])) {
      quadro(x, z, eixo, q === 6 ? b("green_glazed_terracotta") : b("cyan_glazed_terracotta"));
      q++;
    }
    yield;

    // ---- placas penduradas do teto por duas correntes (o texto flutua logo abaixo da barra) e as setas de SAÍDA nas paredes
    for (const [x1, x2, z] of [[1, 3, 10], [19, 21, 10], [37, 39, 30], [19, 21, 30]]) {
      F(x1, 6, z, x2, 6, z, M.madeiraEscura);
      S(x1, 7, z, M.corrente);
      S(x2, 7, z, M.corrente);
    }
    F(9, 4, 0, 12, 5, 0, M.madeiraEscura);
    F(29, 4, 40, 32, 5, 40, M.madeiraEscura);

    // ---- a porta 14: moldura alta, painel laranja e a verga
    F(40, 1, 19, 40, 5, 19, b("black_concrete"));
    F(40, 1, 21, 40, 5, 21, b("black_concrete"));
    F(40, 4, 20, 40, 5, 20, b("black_concrete"));
    F(40, 1, 20, 40, 3, 20, M.aviso);
    S(39, 4, 19, M.madeiraClara);
    S(39, 4, 21, M.madeiraClara);
    // a seta de giz de Beto, no corredor leste, aponta para a porta da sala do primeiro mapa (a sala 8)
    const s8 = sala(8);
    for (const [dx, dz] of [[0, 0], [1, 0], [2, 0], [1, -1], [1, 1]]) S(s8.fora.x + dx, 0, s8.fora.z + dz, M.branco);

    // ---- pontos tocáveis
    S(1, 1, 10, b("lectern"), { "minecraft:cardinal_direction": "east" });
    F(0, 3, 9, 0, 5, 11, M.madeiraEscura);
    S(0, 4, 9, b("white_glazed_terracotta"));
    S(0, 4, 11, b("white_glazed_terracotta"));
    S(0, 5, 10, b("white_glazed_terracotta"));
    // TV de estática num armário baixo, na quina sudoeste
    S(2, 1, 37, M.madeira);
    S(3, 1, 37, b("spruce_slab"));
    yield;

    // ---- as 16 salas
    for (const s of SALAS_A) {
      const { P } = orientar(s);
      const tipo = TIPO_SALA[s.n] ?? "escritorio";
      /** @param {number} u @param {number} v @param {number} y @param {string} id @param {Record<string, string | number | boolean>} [est] */
      const l = (u, v, y, id, est) => {
        const q2 = P(u, v);
        S(q2.x, y, q2.z, id, est);
      };
      /** @param {number} u1 @param {number} v1 @param {number} u2 @param {number} v2 @param {number} y1 @param {number} y2 @param {string} id */
      const lf = (u1, v1, u2, v2, y1, y2, id) => {
        const a = P(u1, v1), c = P(u2, v2);
        F(a.x, y1, a.z, c.x, y2, c.z, id);
      };
      /** Planta em (u, v) da sala (o segundo argumento é só o y, sempre 1). */
      const plp = (/** @type {number} */ u, /** @type {number} */ _y, /** @type {number} */ v, /** @type {string} */ qual = b("azalea")) => {
        const q2 = P(u, v);
        planta(q2.x, 1, q2.z, qual);
      };
      /** Cadeira em (u,v) olhando para (u+fu, v+fv). */
      const cad = (/** @type {number} */ u, /** @type {number} */ v, /** @type {number} */ fu, /** @type {number} */ fv) => {
        const a = P(u, v), c = P(u + fu, v + fv);
        cadeira(a.x, 1, a.z, c.x - a.x, c.z - a.z);
      };
      // teto, luz e teia
      F(s.x1, 6, s.z1, s.x1 + 5, 6, s.z1 + 5, M.listraA);
      if (s.n % 5 === 0) F(s.x1 + 2, 6, s.z1 + 2, s.x1 + 3, 6, s.z1 + 3, M.queimada);
      else {
        F(s.x1 + 2, 6, s.z1 + 2, s.x1 + 3, 6, s.z1 + 3, M.vidro);
        F(s.x1 + 2, 7, s.z1 + 2, s.x1 + 3, 7, s.z1 + 3, M.luz);
      }
      F(s.x1, 6, s.z1, s.x1 + 5, 6, s.z1, M.madeiraClara);
      F(s.x1, 6, s.z1 + 5, s.x1 + 5, 6, s.z1 + 5, M.madeiraClara);
      F(s.x1, 6, s.z1, s.x1, 6, s.z1 + 5, M.madeiraClara);
      F(s.x1 + 5, 6, s.z1, s.x1 + 5, 6, s.z1 + 5, M.madeiraClara);
      // piso por tipo
      if (tipo === "mapa") {
        const cor = s.n === 8 ? "light_blue" : s.n === 12 ? "green" : "red";
        lf(0, 0, 5, 5, 0, 0, b("light_gray_concrete"));
        lf(1, 1, 4, 5, 0, 0, b(`${cor}_wool`));
        lf(2, 2, 3, 4, 0, 0, b("white_wool"));
      } else if (tipo === "marta") {
        for (let v = 0; v < 6; v++) lf(0, v, 5, v, 0, 0, v % 2 === 0 ? M.madeira : M.madeiraClara);
        lf(1, 1, 5, 4, 0, 0, b("white_wool"));
        lf(2, 2, 4, 3, 0, 0, b("cyan_wool"));
      } else if (tipo === "voce") {
        for (let v = 0; v < 6; v++) lf(0, v, 5, v, 0, 0, v % 2 === 0 ? M.madeiraClara : M.madeira);
        lf(1, 1, 4, 5, 0, 0, b("light_gray_wool"));
        lf(2, 2, 3, 4, 0, 0, b("white_wool"));
      } else if (tipo === "almox") {
        lf(0, 0, 5, 5, 0, 0, b("gray_concrete"));
      } else if (tipo === "copa") {
        for (let u = 0; u < 6; u += 2) for (let v = 0; v < 6; v += 2) lf(u, v, u + 1, v + 1, 0, 0, ((u + v) / 2) % 2 === 0 ? M.branco : M.corredor);
      } else if (tipo === "aula") {
        lf(0, 0, 5, 5, 0, 0, b("light_gray_terracotta"));
        for (let v = 0; v < 6; v += 2) lf(0, v, 5, v, 0, 0, b("gray_terracotta"));
      } else {
        for (let v = 0; v < 6; v++) lf(0, v, 5, v, 0, 0, v % 2 === 0 ? M.madeira : M.madeiraClara);
        const cor = s.n % 3 === 0 ? "green" : s.n % 3 === 1 ? "cyan" : "light_gray";
        lf(1, 1, 4, 3, 0, 0, b(`${cor}_wool`));
      }
      // móveis por tipo (o corredor até o fundo, em u = 2, fica sempre livre)
      if (tipo === "escritorio") {
        lf(3, 4, 5, 4, 1, 1, M.madeira);
        l(5, 4, 2, b("lantern"));
        cad(4, 3, 0, 1);
        lf(0, 2, 0, 5, 1, 3, b("bookshelf"));
        plp(5, 1, 1);
        l(5, 5, 5, b("web"));
      } else if (tipo === "arquivo") {
        lf(0, 1, 0, 5, 1, 3, b("bookshelf"));
        lf(5, 1, 5, 5, 1, 3, b("bookshelf"));
        lf(3, 5, 4, 5, 1, 1, M.madeira);
        l(4, 5, 2, b("lantern"));
        l(3, 5, 2, b("flower_pot"));
        cad(3, 4, 0, 1);
        l(0, 5, 5, b("web"));
      } else if (tipo === "aula") {
        for (const v of [2, 4]) {
          l(0, v, 1, M.madeira);
          cad(1, v, -1, 0);
          l(5, v, 1, M.madeira);
          cad(4, v, 1, 0);
        }
        lf(1, 6, 4, 6, 2, 3, M.preto);
        lf(1, 6, 4, 6, 4, 4, M.madeira);
        lf(1, 6, 4, 6, 1, 1, M.madeira);
        l(2, 5, 1, M.madeira);
        l(5, 5, 4, b("web"));
      } else if (tipo === "copa") {
        lf(0, 5, 5, 5, 1, 1, M.madeira);
        l(1, 5, 2, b("cauldron"));
        l(4, 5, 2, b("brewing_stand"));
        l(5, 5, 2, b("flower_pot"));
        l(4, 2, 1, M.madeira);
        l(4, 2, 2, b("flower_pot"));
        cad(3, 2, 1, 0);
        cad(5, 2, -1, 0);
      } else if (tipo === "almox") {
        lf(0, 3, 1, 5, 1, 2, b("barrel"));
        l(5, 5, 1, b("composter"));
        l(5, 4, 1, b("barrel"));
        lf(5, 1, 5, 2, 1, 1, b("barrel"));
        l(0, 1, 1, b("web"));
        l(0, 5, 3, b("web"));
      } else if (tipo === "mapa") {
        const cor = s.n === 8 ? "light_blue" : s.n === 12 ? "green" : "red";
        // o mapa fica no fundo, de frente para a porta; quadros de mapas na parede do fundo e estantes dos lados
        lf(1, 6, 4, 6, 2, 3, b(`${cor}_glazed_terracotta`));
        lf(1, 6, 4, 6, 4, 4, M.madeiraEscura);
        lf(1, 6, 4, 6, 1, 1, M.madeiraEscura);
        lf(0, 2, 0, 4, 1, 2, b("bookshelf"));
        lf(5, 2, 5, 3, 1, 2, b("bookshelf"));
        l(0, 3, 3, b("lantern"));
        l(5, 2, 3, b("flower_pot"));
        if (s.n === 12) {
          plp(0, 1, 5, b("flowering_azalea"));
          plp(5, 1, 1);
        } else if (s.n === 3) {
          l(0, 5, 5, b("web"));
        }
      } else if (tipo === "marta") {
        // a sala arrumada por Marta: mesa de chá, estante de potes, plantas
        lf(4, 2, 5, 3, 1, 1, M.madeira);
        l(4, 2, 2, b("cauldron"));
        l(5, 3, 2, b("flower_pot"));
        lf(0, 1, 0, 5, 1, 2, b("bookshelf"));
        for (let v = 1; v <= 5; v += 2) l(0, v, 3, b("flower_pot"));
        plp(5, 1, 5, b("flowering_azalea"));
        plp(5, 1, 0);
        l(2, 6, 3, b("white_glazed_terracotta"));
      } else if (tipo === "voce") {
        // "preparada para alguém": mesa posta para um, a cadeira puxada, uma luz acesa
        lf(1, 4, 3, 4, 1, 1, M.madeira);
        l(1, 4, 2, b("flower_pot"));
        l(3, 4, 2, b("lantern"));
        l(2, 4, 2, b("white_carpet"));
        cad(2, 3, 0, 1);
        lf(0, 5, 5, 5, 1, 2, b("bookshelf"));
        plp(0, 1, 0);
        plp(5, 1, 0, b("fern"));
      }
    }
    yield;
    // o chá de Marta, na sala 9 (e o resto vem da lista de móveis acima)
    // mesa de Tomás: os móveis dos registros
    for (const pt of PONTOS) {
      if (pt.x > 40) continue;
      if (pt.t === "mapa" || (pt.t === "reg" && pt.r === 8)) {
        const s = pt.t === "mapa" ? sala(/** @type {number} */ (pt.m)) : sala(8);
        const { P } = orientar(s);
        const a = P(2, 0), c = P(2, 1);
        S(pt.x, pt.y, pt.z, b("lectern"), { "minecraft:cardinal_direction": Math.abs(a.x - c.x) > 0 ? (a.x < c.x ? "west" : "east") : a.z < c.z ? "north" : "south" });
      }
    }
    // poeira: teias nos cantos altos dos corredores
    for (const [x, z] of [[1, 1], [39, 1], [1, 39], [39, 39]]) S(x, 7, z, b("web"));
    yield;
  }

  // ================================================================================================================ B. Piscina Vazia
  yield "B · Piscina Vazia";
  {
    // o salão: 42..79 x 1..39, 14 de altura. A parede de oeste é a x = 41 (a x = 40 é a de A).
    ar(42, 1, 1, 79, 14, 39);
    // pele das paredes: azulejo branco com faixa verde-água, friso e reboco alto
    for (const [x1, z1, x2, z2] of [[41, 0, 41, 40], [80, 0, 80, 40], [41, 0, 80, 0], [41, 40, 80, 40]]) {
      F(x1, 1, z1, x2, 8, z2, M.quartzoLiso);
      F(x1, 2, z1, x2, 3, z2, M.azulejo2);
      F(x1, 4, z1, x2, 4, z2, b("cyan_terracotta"));
      F(x1, 9, z1, x2, 14, z2, b("calcite"));
      F(x1, 15, z1, x2, 15, z2, M.listraA);
    }
    // teto e claraboia central (três vãos entre as vigas), com a luz escondida acima
    F(42, 15, 1, 79, 15, 39, M.listraA);
    for (const [x1, x2] of [[54, 58], [60, 62], [64, 68]]) {
      F(x1, 15, 11, x2, 15, 27, M.vidro);
      F(x1, 16, 11, x2, 16, 27, M.luz);
    }
    // vigas de madeira a cada 8, alinhadas com os pilares
    const PIL = [45, 53, 69, 77];
    for (const x of [...PIL, 61]) {
      F(x, 14, 1, x, 14, 39, M.madeira);
      F(x, 13, 1, x, 13, 1, M.madeira);
      F(x, 13, 39, x, 13, 39, M.madeira);
    }
    F(42, 14, 1, 79, 14, 1, M.madeira);
    F(42, 14, 39, 79, 14, 39, M.madeira);
    yield;
    // recesso da porta 14 (a parede de cá é a x = 41) e moldura do lado da piscina
    F(41, 1, 20, 41, 3, 20, AR);
    for (const z of [19, 21]) F(41, 1, z, 41, 4, z, b("stripped_birch_log"));
    F(41, 4, 20, 41, 4, 20, b("stripped_birch_log"));
    // piso do deck: tijoleira bege com rejunte a cada 4 e moldura verde-água
    F(42, 0, 1, 79, 0, 39, M.papelA);
    for (let x = 44; x <= 79; x += 4) F(x, 0, 1, x, 0, 39, M.listraA);
    for (let z = 4; z <= 39; z += 4) F(42, 0, z, 79, 0, z, M.listraA);
    F(42, 0, 1, 79, 0, 1, M.corredor);
    F(42, 0, 39, 79, 0, 39, M.corredor);
    F(42, 0, 1, 42, 0, 39, M.corredor);
    F(79, 0, 1, 79, 0, 39, M.corredor);
    // a bacia (seca): 3 de fundo, 6 raias de 3 de largura
    ar(48, -2, 10, 74, 0, 27);
    F(47, -2, 9, 75, -1, 9, M.azulejo1);
    F(47, -2, 28, 75, -1, 28, M.azulejo1);
    F(47, -2, 10, 47, -1, 27, M.azulejo1);
    F(75, -2, 10, 75, -1, 27, M.azulejo1);
    // borda (a "pedra de coroamento") e faixa de azulejo escuro no alto da parede da bacia
    F(47, 0, 9, 75, 0, 9, M.azulejo2);
    F(47, 0, 28, 75, 0, 28, M.azulejo2);
    F(47, 0, 10, 47, 0, 27, M.azulejo2);
    F(75, 0, 10, 75, 0, 27, M.azulejo2);
    F(47, -1, 9, 75, -1, 9, b("cyan_terracotta"));
    F(47, -1, 28, 75, -1, 28, b("cyan_terracotta"));
    F(47, -1, 10, 47, -1, 27, b("cyan_terracotta"));
    F(75, -1, 10, 75, -1, 27, b("cyan_terracotta"));
    yield;
    // piso da bacia, com o desenho quase apagado (dois círculos que se encontram; o da direita já se perdeu em parte)
    for (let x = 48; x <= 74; x++) {
      for (let z = 10; z <= 27; z++) {
        let id = (x + z) % 2 === 0 ? M.azulejo1 : M.azulejo2;
        const d1 = Math.hypot(x - 57, z - 18.5), d2 = Math.hypot(x - 65, z - 18.5);
        if (Math.abs(d1 - 6) < 0.8) id = b("cyan_terracotta");
        else if (Math.abs(d2 - 6) < 0.8 && (x + z) % 3 !== 0) id = b("cyan_terracotta");
        S(x, -3, z, id);
      }
      if (x % 6 === 0) yield;
    }
    for (const z of LANE_Z) F(49, -3, z, 73, -3, z, b("dark_prismarine"));
    // luzes de piscina embutidas nas paredes da bacia
    for (const [x, z] of [[47, 14], [47, 26], [75, 14], [75, 26], [60, 9], [60, 28], [66, 9], [66, 28]]) S(x, -2, z, M.luz);
    // escadas cromadas: só a da raia 4 está limpa (as outras, interditadas)
    for (let i = 0; i < LANE_Z.length; i++) {
      const z = LANE_Z[i];
      for (let y = -2; y <= 0; y++) {
        if (i === 3) S(48, y, z, b("ladder"), { facing_direction: 5 });
        else S(48, y, z, M.grade);
      }
      if (i !== 3) S(47, 1, z + 1, b("moss_carpet"));
    }
    // a seta de giz de Beto para baixo, na parede da raia 4
    for (const [y, dz] of [[-2, 0], [-1, 0], [0, 0], [-1, -1], [-1, 1]]) S(47, y, 20 + dz, M.branco);
    // a passagem de manutenção sob a raia 4: moldura preta, faixas de aviso e porta de ferro
    for (let y = -2; y <= 0; y++) for (const z of [19, 20, 21]) S(75, y, z, M.preto);
    F(75, -2, 20, 75, -1, 20, M.ferro);
    S(75, 0, 20, M.aviso);
    S(75, -2, 19, M.aviso);
    S(75, -2, 21, M.aviso);
    yield;
    // os números das raias, pintados no deck em ciano, a ponta de cada raia
    LANE_Z.forEach((z, i) => digitoChao(i + 1, 42, z - 1, 0, b("cyan_concrete")));
    // válvulas, toalha, vaso seco
    for (const z of LANE_Z) S(46, 1, z, M.ferro);
    S(47, 1, 20, b("light_gray_carpet"));
    S(42, 1, 6, b("flower_pot"));
    F(42, 0, 5, 44, 0, 7, b("gray_terracotta"));
    S(43, 1, 7, b("moss_carpet"));
    S(43, 1, 5, b("deadbush"));
    S(44, 1, 6, b("moss_carpet"));
    yield;

    // pilares com capitel e janelas altas (vitrais de verde-água) entre eles, norte e sul
    for (const x of PIL) {
      for (const z of [1, 39]) {
        F(x, 1, z, x, 12, z, M.coluna);
        S(x, 1, z, M.quartzoLiso);
        S(x, 13, z, M.capitel);
      }
    }
    /** @param {number} c @param {number} z @param {number} fora */
    const vitral = (c, z, fora) => {
      janela("z", z, c - 1, c + 1, 6, 11, fora, M.madeiraClara, b("light_blue_stained_glass"));
      for (let y = 6; y <= 11; y++) for (let x = c - 1; x <= c + 1; x++) if ((x + y) % 3 === 0) S(x, y, z, b("cyan_stained_glass"));
    };
    for (const c of [49, 61, 73]) vitral(c, 0, -1);
    for (const c of [49, 73]) vitral(c, 40, 1);
    // arcos nas baías (arquitrave de madeira entre pilares)
    for (const z of [1, 39]) {
      F(42, 12, z, 79, 12, z, M.madeiraClara);
    }
    yield;

    // arquibancada de madeira e quartzo no lado norte (4 degraus) e a mesa de som
    for (let t = 0; t < 4; t++) {
      F(50, 1, 7 - t, 66, t + 1, 7 - t, M.quartzoLiso);
      F(50, t + 1, 7 - t, 66, t + 1, 7 - t, M.madeiraClara);
    }
    // grades laterais da arquibancada
    for (const x of [49, 67]) for (let t = 0; t < 4; t++) F(x, 1, 7 - t, x, t + 2, 7 - t, M.grade);
    // lugares marcados (um número a cada fileira, em ciano)
    for (let t = 0; t < 4; t++) for (let x = 52; x <= 64; x += 4) S(x, t + 1, 7 - t, b("cyan_terracotta"));
    // quadro-negro de Beto (R-9) na parede do fundo, com giz
    F(69, 1, 0, 73, 5, 0, M.madeiraEscura);
    F(70, 2, 0, 72, 4, 0, M.preto);
    arte([".#.", "###", "#.#"], M.branco, (c, r) => ({ x: 70 + c, y: 2 + r, z: 0 }));
    yield;

    // trampolins: duas torres de salto à direita da bacia, com a tábua para fora
    for (const z of [14, 24]) {
      F(77, 1, z, 79, 3, z + 1, M.quartzoLiso);
      F(78, 1, z - 2, 79, 1, z - 1, M.quartzoLiso);
      F(78, 2, z - 1, 79, 2, z - 1, M.quartzoLiso);
      F(70, 3, z, 76, 3, z, M.madeiraClara);
      S(79, 4, z, M.grade);
      S(79, 4, z + 1, M.grade);
    }
    // vestiários (masculino e feminino), no canto sudeste, com portas para o salão
    F(68, 1, 30, 79, 6, 39, M.quartzoLiso);
    ar(69, 1, 31, 73, 5, 38);
    ar(75, 1, 31, 79, 5, 38);
    F(74, 1, 30, 74, 6, 39, M.quartzoLiso);
    F(68, 1, 30, 79, 3, 30, M.azulejo2);
    for (const x of [71, 77]) {
      ar(x, 1, 30, x, 2, 30);
      F(x - 1, 1, 30, x - 1, 3, 30, b("stripped_birch_log"));
      F(x + 1, 1, 30, x + 1, 3, 30, b("stripped_birch_log"));
      S(x, 3, 30, b("stripped_birch_log"));
    }
    for (const [xa, xb] of [[69, 73], [75, 79]]) {
      for (let x = xa; x <= xb; x++) for (let z = 31; z <= 38; z++) S(x, 0, z, (x + z) % 2 === 0 ? M.azulejo1 : M.branco);
      // armários (colunas verde-água e cinza) nas paredes do fundo e do lado
      for (let z = 32; z <= 38; z++) F(xa === 69 ? 69 : 79, 1, z, xa === 69 ? 69 : 79, 3, z, z % 2 === 0 ? b("cyan_terracotta") : b("light_gray_concrete"));
      F(xa + 2, 1, 34, xa + 2, 1, 36, M.madeiraClara);
      F(xa, 6, 31, xb, 6, 38, M.listraA);
      S(xa + 2, 5, 34, b("lantern"), { hanging: true });
    }
    // chuveiros: grades de ferro no fundo
    for (let x = 70; x <= 72; x++) S(x, 3, 38, M.grade);
    for (let x = 76; x <= 78; x++) S(x, 3, 38, M.grade);
    yield;

    // a banca de salva-vidas: balcão de madeira, toldo laranja e branco, postes
    F(43, 1, 34, 45, 1, 36, M.madeira);
    S(44, 2, 35, b("lectern"), { "minecraft:cardinal_direction": "east" });
    for (const [x, z] of [[42, 33], [46, 33], [42, 37], [46, 37]]) F(x, 1, z, x, 3, z, M.grade);
    for (let x = 42; x <= 46; x++) for (let z = 33; z <= 37; z++) S(x, 4, z, x % 2 === 0 ? b("orange_wool") : b("white_wool"));
    // torre de salva-vidas ao sul da bacia
    for (const [x, z] of [[53, 30], [55, 30], [53, 32], [55, 32]]) F(x, 1, z, x, 2, z, M.grade);
    F(53, 3, 30, 55, 3, 32, M.quartzoLiso);
    cadeira(54, 4, 32, 0, -1, b("quartz_stairs"));
    for (let y = 1; y <= 3; y++) S(52, y, 31, b("ladder"), { facing_direction: 5 });
    // amarelinha de giz de Beto no deck do sul, perto da banca (os quadrados são brancos)
    for (const [x, z] of [[50, 38], [50, 37], [49, 36], [51, 36], [50, 35], [49, 34], [51, 34], [50, 33]]) S(x, 0, z, M.branco);
    for (const x of [49, 50, 51]) S(x, 0, 32, M.branco);
    // bancos ao longo da parede sul e planteiras de musgo (a piscina há muito sem água)
    for (const x of [58, 64]) F(x, 1, 38, x + 3, 1, 38, M.madeiraClara);
    for (const [x, z] of [[42, 2], [79, 2], [42, 38], [79, 29]]) planta(x, 1, z, b("flowering_azalea"));
    for (const [x, z] of [[44, 3], [78, 36], [60, 3]]) S(x, 0, z, b("moss_block"));
    // o desenho de Beto (a flor amarela, em giz azul), com moldura de madeira
    F(57, 1, 40, 65, 1, 40, M.madeiraEscura);
    F(57, 7, 40, 65, 7, 40, M.madeiraEscura);
    F(57, 2, 40, 58, 6, 40, M.preto);
    F(64, 2, 40, 65, 6, 40, M.preto);
    F(59, 2, 40, 63, 6, 40, M.preto);
    arte(FLOR_BETO, b("blue_concrete"), (c, r) => ({ x: 59 + c, y: 2 + r, z: 40 }));
    // lâmpadas penduradas (corrente + lanterna) nas vigas
    for (const x of [45, 53, 69, 77]) for (const z of [5, 20, 35]) pendente(x, 13, z, 4);
    for (const z of [5, 35]) pendente(61, 13, z, 4);
    // pés-direitos altos: lâmpadas embutidas nos pilares
    yield;
  }

  // ================================================================================================================ C. Casa de Máquinas
  yield "C · Casa de Máquinas";
  {
    // pele das paredes: rodapé preto, dado cinza escuro, friso de cobre oxidado
    F(81, 1, 0, 120, 1, 40, M.preto);
    F(81, 2, 0, 120, 3, 40, b("gray_concrete"));
    F(81, 4, 0, 120, 4, 40, b("polished_blackstone"));
    F(81, 0, 1, 119, 0, 39, M.pisoC);
    // [x1, z1, x2, z2, altura]
    const carvaC = [
      [82, 19, 95, 21, 4], // corredor de entrada
      [96, 12, 108, 28, 9], // a casa de máquinas
      [85, 10, 87, 18, 4], // para o painel dos interruptores
      [83, 3, 91, 9, 5], // sala dos interruptores
      [109, 19, 114, 21, 4], // corredor leste
      [113, 22, 115, 31, 4], // desce para o painel das luzes
      [116, 29, 119, 31, 4], // e vai à estação
      [111, 32, 118, 38, 5], // sala das luzes
      [99, 29, 101, 30, 4], // para o tanque
      [96, 31, 104, 38, 6], // sala do tanque
      [97, 4, 103, 10, 4], // sala trancada por dentro (sem entrada)
    ];
    for (const [x1, z1, x2, z2, h] of carvaC) ar(x1, 1, z1, x2, h, z2);
    yield;
    // tetos
    for (const [x1, z1, x2, z2, h] of carvaC) F(x1, h + 1, z1, x2, h + 1, z2, b("light_gray_concrete"));
    // canos de cobre oxidado e de cobre novo pelos corredores, com suportes de grade
    const cano = (/** @type {number} */ x1, /** @type {number} */ z1, /** @type {number} */ x2, /** @type {number} */ z2, /** @type {number} */ y, /** @type {string} */ id) => F(x1, y, z1, x2, y, z2, id);
    cano(82, 19, 95, 19, 4, M.cobreVelho);
    cano(82, 21, 95, 21, 3, M.cobre);
    cano(109, 19, 114, 19, 4, M.cobreVelho);
    cano(109, 21, 114, 21, 3, M.cobre);
    cano(113, 22, 113, 31, 4, M.cobreVelho);
    cano(115, 22, 115, 31, 3, M.cobre);
    cano(85, 10, 85, 18, 4, M.cobreVelho);
    cano(87, 10, 87, 18, 3, M.cobre);
    for (let x = 84; x <= 94; x += 5) S(x, 3, 19, M.grade);
    for (let x = 84; x <= 94; x += 5) S(x, 2, 21, M.grade);
    // grades de ralo no piso dos corredores
    F(88, 0, 20, 90, 0, 20, b("copper_grate"));
    F(110, 0, 20, 112, 0, 20, b("copper_grate"));
    F(114, 0, 25, 114, 0, 27, b("copper_grate"));
    // lâmpadas em gaiola nos corredores (a cada 6)
    for (const [x, z] of [[84, 20], [90, 20], [95, 20], [111, 20], [114, 20], [114, 26], [117, 30], [86, 14]]) gaiola(x, 4, z);
    for (let x = 83; x <= 94; x++) if (x % 5 === 0) S(x, 0, 21, b("orange_concrete"));
    yield;

    // ---- a casa de máquinas (13 x 17, 9 de altura, teto em y = 10)
    F(96, 0, 12, 108, 0, 28, b("polished_deepslate"));
    F(96, 0, 19, 108, 0, 21, b("gray_concrete")); // eixo de passagem
    for (let x = 96; x <= 108; x += 2) S(x, 0, 20, b("orange_concrete"));
    F(96, 10, 12, 108, 10, 28, b("light_gray_concrete"));
    // friso de cobre e dois canos grossos nas paredes altas
    F(96, 6, 11, 108, 6, 11, M.cobreVelho);
    F(96, 7, 11, 108, 7, 11, M.cobre);
    F(96, 8, 11, 108, 8, 11, M.cobreVelho);
    F(96, 6, 29, 96, 6, 29, M.cobreVelho);
    F(95, 6, 12, 95, 6, 28, M.cobreVelho);
    F(95, 8, 12, 95, 8, 28, M.cobre);
    F(109, 6, 12, 109, 6, 18, M.cobreVelho);
    F(109, 6, 22, 109, 6, 28, M.cobreVelho);
    F(109, 8, 12, 109, 8, 18, M.cobre);
    F(109, 8, 22, 109, 8, 28, M.cobre);
    // a porta de ferro da sala trancada, com moldura, corrente e janelinha
    F(99, 1, 11, 101, 4, 11, M.preto);
    F(100, 1, 11, 100, 2, 11, M.ferro);
    S(100, 3, 11, b("glass"));
    S(99, 1, 12, M.aviso);
    S(101, 1, 12, M.aviso);
    F(100, 2, 12, 100, 3, 12, M.corrente);
    // dentro dela: uma luz acesa, chá quente e uma cadeira (vista pela janelinha)
    F(99, 1, 7, 101, 1, 7, M.madeira);
    S(100, 2, 7, b("lantern"));
    S(100, 1, 9, b("spruce_stairs"), { weirdo_direction: 3 });
    F(97, 1, 4, 97, 3, 10, b("bookshelf"));
    F(97, 0, 4, 103, 0, 10, M.madeira);
    S(103, 1, 5, b("cauldron"));
    S(100, 4, 8, b("lantern"), { hanging: true });
    // caldeiras (duas, ao leste do eixo), com anéis de ferro, cúpula e chaminé de cobre
    for (const z0 of [13, 23]) {
      F(103, 1, z0, 106, 6, z0 + 3, M.cobreVelho);
      F(103, 1, z0, 106, 1, z0 + 3, M.ferro);
      F(103, 4, z0, 106, 4, z0 + 3, M.ferro);
      F(104, 7, z0 + 1, 105, 7, z0 + 2, M.cobre);
      F(104, 8, z0 + 1, 105, 9, z0 + 2, M.ferro);
      F(102, 1, z0, 102, 1, z0 + 3, M.aviso);
      F(107, 1, z0, 107, 3, z0 + 3, M.ferro);
      S(107, 4, z0 + 1, b("lightning_rod"), { facing_direction: 1 });
      // o manômetro: uma lâmpada no corpo
      S(103, 3, z0 + 1, b("redstone_lamp"));
    }
    // quadros elétricos ao longo da parede sul
    for (const x of [96, 103, 106]) {
      F(x, 1, 28, x + 1, 3, 28, b("light_gray_concrete"));
      F(x, 2, 28, x + 1, 2, 28, M.preto);
      S(x, 3, 28, b("redstone_lamp"));
      S(x + 1, 3, 28, b("iron_trapdoor"));
    }
    // passarela de grade (y = 4) ao longo da parede norte e a escada metálica que sobe até ela
    F(100, 4, 12, 107, 4, 13, b("copper_grate"));
    F(100, 5, 12, 107, 5, 12, M.grade);
    for (let i = 0; i < 4; i++) F(96 + i, 1, 13, 96 + i, i + 1, 13, M.pisoC);
    F(96, 4, 12, 99, 4, 12, b("copper_grate"));
    F(96, 5, 12, 99, 5, 12, M.grade);
    for (const x of [100, 107]) F(x, 1, 13, x, 3, 13, M.grade);
    // lâmpadas em gaiola penduradas no teto alto
    for (const [x, z] of [[100, 14], [100, 26], [104, 20], [97, 20], [108, 20], [100, 20]]) {
      F(x, 9, z, x, 9, z, M.corrente);
      F(x, 8, z, x, 8, z, M.corrente);
      gaiola(x, 7, z);
    }
    yield;
    // a mesa de Marta, no meio da casa de máquinas: tapete, mesa posta, cadeiras e plantas
    F(97, 0, 14, 101, 0, 18, b("red_wool"));
    F(98, 0, 15, 100, 0, 17, b("white_wool"));
    F(99, 1, 15, 101, 1, 17, M.madeira);
    S(100, 2, 16, b("lectern"), { "minecraft:cardinal_direction": "west" });
    S(101, 2, 16, b("cauldron"));
    S(101, 2, 15, b("flower_pot"));
    cadeira(98, 1, 16, 1, 0);
    cadeira(100, 1, 14, 0, 1);
    cadeira(100, 1, 18, 0, -1);
    planta(97, 1, 14, b("flowering_azalea"));
    planta(97, 1, 18);
    S(96, 1, 16, b("bookshelf"));
    F(96, 1, 17, 96, 2, 17, b("bookshelf"));
    S(96, 3, 17, b("flower_pot"));
    yield;

    // ---- o painel dos interruptores
    F(83, 1, 2, 91, 4, 2, M.cobreVelho);
    F(83, 1, 2, 91, 1, 2, M.preto);
    for (const x of SW_X) {
      S(x, 2, 2, M.cobre);
      S(x, 3, 2, b("redstone_lamp"));
    }
    F(83, 4, 2, 91, 4, 2, M.cobre);
    for (let x = 83; x <= 91; x++) S(x, 0, 3, x % 2 === 0 ? M.aviso : M.preto);
    for (const [x, z] of [[84, 6], [90, 6], [87, 8]]) gaiola(x, 5, z);
    F(83, 1, 9, 83, 2, 9, b("barrel"));
    F(91, 1, 9, 91, 3, 9, M.ferro);
    // cabos pretos no chão e uma chave-geral na parede
    for (let z = 4; z <= 9; z++) S(86, 0, z, b("black_concrete"));
    // ---- o painel das luzes e o botão de confirmar
    F(111, 1, 39, 118, 4, 39, M.cobreVelho);
    F(111, 1, 39, 118, 1, 39, M.preto);
    for (const x of LUZ_X) S(x, 2, 39, b("redstone_lamp"));
    F(111, 4, 39, 118, 4, 39, M.cobre);
    F(110, 1, 34, 110, 4, 36, M.cobreVelho);
    F(110, 1, 34, 110, 1, 36, M.preto);
    F(110, 3, 34, 110, 3, 36, M.cobre);
    S(110, 2, 35, M.ferro);
    for (let z = 33; z <= 37; z++) S(111, 0, z, z % 2 === 0 ? M.aviso : M.preto);
    gaiola(114, 5, 35);
    gaiola(117, 5, 35);
    F(118, 1, 32, 118, 2, 33, b("barrel"));
    // ---- tanque (vidro e água) e o livro com final, sozinho num pedestal
    F(102, 2, 32, 104, 5, 34, b("light_blue_stained_glass"));
    F(103, 2, 33, 103, 5, 33, b("water"));
    F(102, 1, 32, 104, 1, 34, M.ferro);
    F(102, 6, 32, 104, 6, 34, M.ferro);
    for (const [x, z] of [[97, 33], [97, 36]]) F(x, 1, z, x, 4, z, M.ferro);
    S(100, 1, 36, b("lectern"), { "minecraft:cardinal_direction": "north" });
    F(99, 0, 35, 101, 0, 37, b("red_wool"));
    S(99, 1, 37, b("candle"));
    S(101, 1, 37, b("candle"));
    F(97, 1, 38, 98, 3, 38, b("bookshelf"));
    F(102, 1, 37, 104, 3, 38, b("barrel"));
    gaiola(100, 6, 34);
    gaiola(100, 6, 37);
    // painel de retorno (de volta à piscina) na ponta do corredor de entrada
    F(81, 1, 19, 81, 4, 19, M.preto);
    F(81, 1, 21, 81, 4, 21, M.preto);
    F(81, 3, 20, 81, 4, 20, M.preto);
    F(81, 1, 20, 81, 2, 20, M.ferro);
    S(82, 1, 19, M.aviso);
    S(82, 1, 21, M.aviso);
    F(119, 4, 29, 119, 4, 31, M.cobre);
    yield;
  }

  // ================================================================================================================ D. Estação
  yield "D · Estação";
  {
    // o salão: 121..159 x 1..38 (a parede de oeste é a x = 120; a de leste, x = 160; a do fundo, z = 39). A abóbada é por degraus.
    ar(121, 1, 1, 159, 8, 38);
    const INSETS = [0, 1, 3, 5, 8, 11];
    INSETS.forEach((k, i) => ar(121, 9 + i, 1 + k, 159, 9 + i, 38 - k));
    // pele das paredes: azulejo branco, faixa verde-água, friso preto e reboco alto
    for (const [x1, z1, x2, z2] of [[120, 0, 120, 39], [160, 0, 160, 39], [120, 0, 160, 0], [120, 39, 160, 39]]) {
      F(x1, 1, z1, x2, 6, z2, M.branco);
      F(x1, 3, z1, x2, 4, z2, M.corredor);
      F(x1, 7, z1, x2, 7, z2, M.preto);
    }
    // a abertura vinda da Casa de Máquinas (oeste), com moldura de ferro
    F(120, 1, 29, 120, 3, 31, AR);
    F(120, 4, 29, 120, 4, 31, M.preto);
    for (const z of [28, 32]) F(120, 1, z, 120, 4, z, M.preto);
    // piso das plataformas (andesito polido com rejunte)
    F(121, 0, 1, 159, 0, 39, M.pisoD);
    for (let x = 124; x <= 159; x += 4) {
      F(x, 0, 1, x, 0, 12, b("smooth_stone"));
      F(x, 0, 26, x, 0, 38, b("smooth_stone"));
    }
    for (let z = 4; z <= 12; z += 4) F(121, 0, z, 159, 0, z, b("smooth_stone"));
    for (let z = 28; z <= 36; z += 4) F(121, 0, z, 159, 0, z, b("smooth_stone"));
    // a cava dos trilhos: brita, dormentes e dois trilhos
    ar(121, -2, 13, 159, 0, 25);
    F(121, -3, 13, 159, -3, 25, b("gravel"));
    for (let x = 122; x <= 159; x += 2) F(x, -3, 15, x, -3, 23, M.madeira);
    for (const z of [16, 22]) {
      F(121, -3, z, 159, -3, z, M.ferro);
      for (let x = 121; x <= 159; x++) S(x, -2, z, b("rail"), { rail_direction: 1 });
    }
    for (let x = 121; x <= 159; x++) {
      S(x, 0, 26, x % 2 === 0 ? M.aviso : M.preto);
      S(x, 0, 12, x % 2 === 0 ? M.aviso : M.preto);
    }
    F(121, -1, 13, 159, -1, 13, M.corredor);
    F(121, -1, 25, 159, -1, 25, M.corredor);
    // as bocas dos túneis, escuras, nas duas pontas
    F(120, -2, 15, 120, 3, 23, M.preto);
    F(160, -2, 15, 160, 3, 23, M.preto);
    F(120, 4, 16, 120, 4, 22, b("polished_blackstone"));
    F(160, 4, 16, 160, 4, 22, b("polished_blackstone"));
    // escadas de acesso à cava
    for (const x of [125, 155]) for (let y = -2; y <= 0; y++) S(x, y, 25, b("ladder"), { facing_direction: 2 });
    yield;
    // o teto: costelas de madeira a cada 8, claraboias entre elas (luz escondida acima)
    F(121, 15, 12, 159, 15, 27, M.listraA);
    const RIB = [124, 132, 140, 148, 156];
    for (const x of RIB) {
      INSETS.forEach((k, i) => {
        S(x, 9 + i, 1 + k, M.madeira);
        S(x, 9 + i, 38 - k, M.madeira);
      });
      F(x, 15, 12, x, 15, 27, M.madeira);
    }
    for (const [x1, x2] of [[126, 130], [134, 138], [142, 146], [150, 154]]) {
      F(x1, 15, 15, x2, 15, 24, M.vidro);
      F(x1, 16, 15, x2, 16, 24, M.luz);
    }
    // vigas ao longo do salão e pilares com capitel nas plataformas (uma fileira em cada)
    F(121, 12, 7, 159, 12, 7, M.madeira);
    F(121, 12, 32, 159, 12, 32, M.madeira);
    for (const x of RIB) {
      for (const z of [7, 32]) {
        F(x, 1, z, x, 11, z, M.coluna);
        S(x, 1, z, M.quartzoLiso);
        S(x, 12, z, M.capitel);
      }
    }
    for (const x of [128, 136, 144, 152]) for (const z of [16, 22]) pendente(x, 14, z, 4);
    for (const x of [128, 136, 144, 152]) for (const z of [7, 32]) pendente(x, 11, z, 2);
    yield;

    // ---- a letra S grande na parede de oeste, em laranja de aviso
    arte([".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."], M.aviso, (c, r) => ({ x: 120, y: 1 + r, z: 37 - c }));
    // ---- o painel de destinos (preto, com moldura) e a fita de manutenção ao lado
    F(PAINEL_X1 - 1, 1, 39, PAINEL_X2 + 1, 1, 39, M.madeiraEscura);
    F(PAINEL_X1 - 1, 5, 39, PAINEL_X2 + 1, 5, 39, M.madeiraEscura);
    F(PAINEL_X1 - 1, 2, 39, PAINEL_X1 - 1, 4, 39, M.madeiraEscura);
    F(PAINEL_X2 + 1, 2, 39, PAINEL_X2 + 1, 4, 39, M.madeiraEscura);
    F(PAINEL_X1, 2, 39, PAINEL_X2, 4, 39, M.preto);
    for (let y = 2; y <= 4; y++) for (let x = 133; x <= 134; x++) S(x, y, 39, (x + y) % 2 === 0 ? M.aviso : M.branco);
    // relógio parado em 14:14, em cima do painel
    for (let y = 8; y <= 12; y++) {
      for (let x = 139; x <= 143; x++) {
        const d = Math.hypot(x - 141, y - 10);
        if (d <= 2.7) S(x, y, 39, d > 2 ? M.preto : M.quartzoLiso);
      }
    }
    for (const [x, y] of [[141, 10], [140, 10], [139, 10], [141, 11], [142, 11]]) S(x, y, 39, M.preto);
    // o telefone da plataforma: pedestal e parede preta atrás
    S(150, 1, 37, M.preto);
    S(149, 1, 37, M.quartzoLiso);
    S(151, 1, 37, M.quartzoLiso);
    F(149, 1, 38, 151, 3, 38, M.preto);
    S(150, 5, 38, b("lantern"), { hanging: false });
    // bancos
    for (const x of [124, 132, 140, 148]) F(x + 1, 1, 30, x + 4, 1, 30, M.madeiraClara);
    for (const x of [126, 142]) F(x, 1, 4, x + 3, 1, 4, M.madeiraClara);
    // o quiosque fechado, com toldo listrado e persiana
    F(123, 1, 37, 130, 4, 38, M.madeira);
    F(123, 1, 36, 130, 3, 36, M.madeira);
    for (let y = 1; y <= 3; y++) F(124, y, 36, 129, y, 36, y % 2 === 0 ? b("iron_block") : b("light_gray_concrete"));
    for (let x = 123; x <= 130; x++) F(x, 4, 35, x, 4, 36, x % 2 === 0 ? M.aviso : M.branco);
    for (const x of [123, 130]) F(x, 1, 35, x, 3, 35, M.grade);
    // mapas rasgados de Tomás, em pedaços, na parede do fundo e no chão
    for (const [x, y] of [[151, 3], [152, 3], [152, 4], [155, 4], [153, 5]]) S(x, y, 39, b("white_glazed_terracotta"));
    for (const [x, z] of [[149, 34], [151, 35], [147, 33]]) S(x, 1, z, b("white_carpet"));
    // janelas altas na parede do fundo (sul) e um grande vitrô na do norte
    for (const x of [126, 130, 152, 156]) janela("z", 39, x, x + 1, 3, 8, 1, M.madeiraClara);
    F(135, 4, -1, 147, 11, -1, M.luz);
    for (let y = 4; y <= 11; y++) {
      for (let x = 135; x <= 147; x++) {
        const cor = (x * 7 + y * 3) % 5;
        const id = cor === 0 ? "orange_stained_glass" : cor === 1 ? "cyan_stained_glass" : cor === 2 ? "light_blue_stained_glass" : "white_stained_glass";
        S(x, y, 0, b(id));
      }
    }
    for (const x of [135, 139, 143, 147]) F(x, 4, 0, x, 11, 0, M.preto);
    for (const y of [4, 8, 11]) F(135, y, 0, 147, y, 0, M.preto);
    for (const x of [126, 152]) janela("z", 0, x, x + 2, 3, 8, -1, M.madeiraClara);
    // a porta de serviço para a Sala de Espera (a parede de lá é a x = 161)
    F(160, 1, 28, 160, 4, 28, M.preto);
    F(160, 1, 32, 160, 4, 32, M.preto);
    F(160, 4, 29, 160, 4, 31, M.preto);
    F(160, 1, 29, 160, 3, 29, M.preto);
    F(160, 1, 31, 160, 3, 31, M.preto);
    S(160, 3, 30, M.preto);
    S(160, 1, 30, b("iron_block"));
    S(160, 2, 30, b("iron_block"));
    S(159, 1, 29, M.aviso);
    S(159, 1, 31, M.aviso);
    yield;
  }

  // ================================================================================================================ E. Sala de Espera
  yield "E · Sala de Espera";
  {
    // a sala: 162..191 x 22..38 (parede de oeste x = 161; a de leste, x = 192). Calma, íntima, de madeira e luz quente.
    ar(162, 1, 22, 191, 6, 38);
    // pele das paredes: lambri de madeira, friso, papel de parede e cornija de madeira clara
    for (const [x1, z1, x2, z2] of [[161, 21, 161, 39], [192, 21, 192, 39], [161, 21, 192, 21], [161, 39, 192, 39]]) {
      F(x1, 1, z1, x2, 2, z2, M.madeira);
      F(x1, 3, z1, x2, 3, z2, M.madeiraClara);
      F(x1, 4, z1, x2, 6, z2, M.papelA);
      F(x1, 6, z1, x2, 6, z2, M.madeiraClara);
    }
    // a passagem vinda da Estação (recesso na parede de cá) e a sua moldura
    F(161, 1, 30, 161, 2, 30, AR);
    F(161, 3, 30, 161, 3, 30, b("stripped_birch_log"));
    for (const z of [29, 31]) F(161, 1, z, 161, 3, z, b("stripped_birch_log"));
    // listras suaves (calcita) no papel de parede, de 4 em 4
    for (let x = 162; x <= 191; x += 4) {
      F(x, 4, 21, x, 5, 21, b("calcite"));
      F(x, 4, 39, x, 5, 39, b("calcite"));
    }
    for (let z = 22; z <= 38; z += 4) {
      F(161, 4, z, 161, 5, z, b("calcite"));
      F(192, 4, z, 192, 5, z, b("calcite"));
    }
    // piso de parquet em faixas e o grande tapete
    for (let x = 162; x <= 191; x++) F(x, 0, 22, x, 0, 38, x % 2 === 0 ? M.madeiraClara : M.madeira);
    F(166, 0, 24, 188, 0, 36, b("light_gray_wool"));
    F(167, 0, 25, 187, 0, 35, b("white_wool"));
    F(168, 0, 26, 186, 0, 34, b("light_gray_wool"));
    // corredor central (tapete verde-água) até a mesa e a porta
    F(162, 0, 29, 191, 0, 31, b("cyan_wool"));
    F(162, 0, 30, 191, 0, 30, b("white_wool"));
    for (let x = 164; x <= 189; x += 5) F(x, 0, 30, x + 1, 0, 30, b("cyan_wool"));
    // teto de madeira com vigas, e a luz quente das lanternas penduradas
    F(162, 7, 22, 191, 7, 38, M.madeiraClara);
    for (const x of [165, 171, 177, 183, 189]) F(x, 6, 22, x, 6, 38, M.madeira);
    for (const z of [22, 30, 38]) F(162, 6, z, 191, 6, z, M.madeira);
    for (const x of [171, 177, 183]) for (const z of [26, 34]) pendente(x, 5, z, 1);
    for (const x of [168, 174, 180, 186]) pendente(x, 5, 30, 1);
    yield;
    // janelas recessas no norte (a parede é grossa: o painel de luz fica atrás) e no sul, com cortinas e vasos
    for (const [x1, x2] of [[166, 167], [172, 173], [180, 181], [186, 187]]) {
      janela("z", 21, x1, x2, 2, 5, -1, M.madeiraClara);
      janela("z", 39, x1, x2, 2, 5, 1, M.madeiraClara);
      for (const z of [22, 38]) {
        F(x1 - 2, 2, z, x1 - 2, 5, z, b("light_gray_wool"));
        F(x2 + 2, 2, z, x2 + 2, 5, z, b("light_gray_wool"));
      }
      planta(x1, 1, 38, b("flowering_azalea"));
      planta(x2, 1, 38);
    }
    // quadros de moldura escura entre as janelas
    for (const z of [21, 39]) {
      for (const x1 of [168, 175, 182]) {
        F(x1, 3, z, x1 + 3, 5, z, M.madeiraEscura);
        F(x1 + 1, 4, z, x1 + 2, 4, z, z === 21 ? b("cyan_glazed_terracotta") : b("white_glazed_terracotta"));
      }
    }
    // as fileiras de cadeiras (três colunas, seis lugares), todas de frente para a porta
    for (const x of [170, 172, 174]) for (const z of [24, 26, 28, 32, 34, 36]) S(x, 1, z, b("birch_stairs"), { weirdo_direction: 1 });
    // mesinhas entre as fileiras
    for (const z of [25, 27, 33, 35]) {
      S(168, 1, z, M.madeira);
      S(168, 2, z, b("flower_pot"));
    }
    // a mesa, o livro de visitas, o vaso e a página solta
    F(178, 1, 29, 178, 1, 31, M.madeira);
    S(178, 1, 28, b("lectern"), { "minecraft:cardinal_direction": "west" });
    S(178, 1, 32, b("flower_pot"));
    S(177, 1, 28, b("candle"));
    S(179, 1, 28, b("candle"));
    F(176, 0, 28, 180, 0, 32, b("cyan_wool"));
    F(177, 0, 29, 179, 0, 31, b("white_wool"));
    S(164, 1, 36, b("lectern"), { "minecraft:cardinal_direction": "east" });
    F(162, 1, 33, 162, 3, 37, b("bookshelf"));
    F(162, 1, 23, 162, 3, 25, b("bookshelf"));
    S(162, 1, 26, M.madeira);
    planta(163, 1, 37);
    yield;

    // a porta lisa e as placas apagadas: a porta mais destacada de todo o Intervalo
    F(192, 1, 28, 192, 5, 28, M.preto);
    F(192, 1, 32, 192, 5, 32, M.preto);
    F(192, 4, 29, 192, 5, 31, M.preto);
    F(192, 1, 29, 192, 3, 31, M.lisa);
    for (const z of [27, 33]) {
      F(191, 1, z, 191, 3, z, M.coluna);
      S(191, 4, z, M.capitel);
    }
    for (const z of [29, 31]) pendente(191, 6, z, 1);
    F(191, 0, 28, 191, 0, 32, b("light_gray_wool"));
    for (const z of [...PLACAS_E, 38]) {
      S(192, 3, z, M.preto);
      S(192, 2, z, M.madeiraEscura);
      S(192, 4, z, M.madeiraEscura);
    }
    yield;
  }
}
