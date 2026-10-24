// @ts-check
// Mapa de "Ecos dos Ausentes" (desenho novo). Mesmo contrato do ecos_mapa.js: REG, CAIXA, PONTOS, FASES_MAPA, CHEGADA e construir().
// Cada fase é independente (usa só constantes de layout), então a obra pode ser retomada de qualquer uma.
// Áreas em ecos_mapa_limiar.js, _vila.js, _arquivo.js e _arena.js; materiais e ferramentas em ecos_mapa_base.js.
import { criar, LAY } from "./ecos_mapa_base.js";
import { limiar, portao } from "./ecos_mapa_limiar.js";
import { vila } from "./ecos_mapa_vila.js";
import { passagem, arquivo } from "./ecos_mapa_arquivo.js";
import { corredorFinal, arena } from "./ecos_mapa_arena.js";

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */

export const REG = [
  { id: "limiar", nome: "O Limiar", x1: 0, z1: 0, x2: 65, z2: 65, y1: -3, y2: 18, fog: "vulpus:nevoa_ecos_limiar" },
  { id: "vila", nome: "A Vila Silenciosa", x1: 70, z1: 0, x2: 165, z2: 75, y1: -3, y2: 40, fog: "vulpus:nevoa_ecos_vila" },
  { id: "arquivo", nome: "O Arquivo das Almas", x1: 170, z1: 0, x2: 240, z2: 65, y1: -8, y2: 20, fog: "vulpus:nevoa_ecos_arquivo" },
  { id: "arena", nome: "O Último Testemunho", x1: 248, z1: 4, x2: 302, z2: 62, y1: -8, y2: 26, fog: "vulpus:nevoa_ecos_arena" },
];

export const CAIXA = { x1: -3, z1: -3, x2: 306, z2: 78, y1: -10, y2: 40 };

/** Pontos de interesse (relativos à origem). Fixos: não dependem de a obra ter rodado na mesma sessão. */
/** @type {{ x: number, y: number, z: number, t: string, dados?: any }[]} */
export const PONTOS = [
  { x: 12, y: 1, z: 32, t: "spawn" },
  { x: 14, y: 1, z: 41, t: "npc_eco", dados: { id: "eco_coveiro" } },
  { x: 34, y: 1, z: 6, t: "npc_eco", dados: { id: "eco_lanterna" } },
  { x: 58, y: 2, z: 11, t: "npc_eco", dados: { id: "eco_tumulo_sem_nome" } },
  { x: 84, y: 1, z: 20, t: "npc_eco", dados: { id: "eco_padaria" } },
  { x: 118, y: 1, z: 14, t: "npc_eco", dados: { id: "eco_torre" } },
  { x: 130, y: 1, z: 32, t: "npc_eco", dados: { id: "eco_gemeos" } },
  { x: 98, y: 1, z: 49, t: "npc_eco", dados: { id: "eco_casa_fechada" } },
  { x: 181, y: -5, z: 33, t: "npc_eco", dados: { id: "eco_arquivo_entrada" } },
  { x: 230, y: -5, z: 8, t: "altar", dados: { id: "altar_cristal" } },
  { x: 230, y: -5, z: 57, t: "altar", dados: { id: "altar_almas" } },
  { x: 220, y: -5, z: 43, t: "npc_eco", dados: { id: "eco_prateleira_escondida" } },
  { x: 231, y: -5, z: 35, t: "npc_eco", dados: { id: "eco_memoria_partida" } },
  { x: 272, y: -4, z: 33, t: "boss_spawn", dados: { id: "ultimo_testemunho" } },
  { x: 251, y: -5, z: 33, t: "entrada_arena" },
];

/**
 * Palcos dos objetivos E01..E13: o bloco que a staff marca no painel (Staff > Ecos dos Ausentes > Objetivos), em coordenadas
 * relativas à origem. `re` é o que o bloco deve ser (a prévia e o teste conferem). `de` é de onde se fala com a criatura.
 */
export const PALCOS = [
  { id: "E01", nome: "Tuco, o Coveiro", area: "limiar", x: 12, y: 1, z: 45, re: "barrel", de: "canto do coveiro, barril ao lado do monte de terra" },
  { id: "E02", nome: "Lanterna", area: "limiar", x: 34, y: 3, z: 4, re: "chiseled", de: "capela dos Lamentos, pedestal da lanterna vazia" },
  { id: "E03", nome: "Túmulo sem nome", area: "limiar", x: 58, y: 2, z: 9, re: "smooth_stone", de: "monte do canto nordeste, lápide lisa" },
  { id: "E04", nome: "Dona Brasa", area: "vila", x: 83, y: 1, z: 19, re: "furnace", de: "padaria, forno de tijolo ao fundo" },
  { id: "E05", nome: "Mestre Sino", area: "vila", x: 118, y: 1, z: 12, re: "lectern", de: "pé da torre do sino, atril sob o sino que não toca" },
  { id: "E06", nome: "Os Gêmeos Sussurro", area: "vila", x: 130, y: 2, z: 27, re: "calcite", de: "praça, pedestais gêmeos a leste do poço" },
  { id: "E07", nome: "Carta na casa fechada", area: "vila", x: 98, y: 4, z: 51, re: "barrel", de: "portão do jardim da casa fechada, caixa de correio" },
  { id: "E08", nome: "Pó, o Arquivista", area: "arquivo", x: 183, y: -4, z: 33, re: "lectern", de: "balcão do Átrio, atril do arquivista" },
  { id: "E09", nome: "Sentinela da Cripta (norte)", area: "arquivo", x: 230, y: -4, z: 6, re: "chiseled_deepslate", de: "altar de cristal, ao fim da cripta norte" },
  { id: "E10", nome: "Sentinela da Cripta (sul)", area: "arquivo", x: 230, y: -4, z: 60, re: "chiseled_deepslate", de: "altar das almas, ao fim da cripta sul" },
  { id: "E11", nome: "Prateleira escondida", area: "arquivo", x: 220, y: -4, z: 41, re: "chiseled_bookshelf", de: "cela esquecida atrás das estantes do Salão (canto sudeste)" },
  { id: "E12", nome: "Memória Partida", area: "arquivo", x: 231, y: -4, z: 33, re: "chiseled_deepslate", de: "sala circular partida, pedestal central" },
  { id: "E13", nome: "O Último Testemunho", area: "arena", x: 272, y: -5, z: 33, re: "crying_obsidian", de: "centro da arena, estrela de obsidiana" },
];

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
  const H = criar(p);
  const { F, M } = H;
  /** @type {[number, () => Generator<any, void, any>][]} fração do progresso ao começar a fase, gerador */
  const fases = [
    [0, function* () {
      for (let y = CAIXA.y2; y >= CAIXA.y1; y -= 4) {
        F(CAIXA.x1, Math.max(y - 3, CAIXA.y1), CAIXA.z1, CAIXA.x2, y, CAIXA.z2, M.ar);
        yield;
      }
      F(CAIXA.x1, CAIXA.y1, CAIXA.z1, CAIXA.x2, CAIXA.y1, CAIXA.z2, M.bedrock);
      F(CAIXA.x1, CAIXA.y1 + 1, CAIXA.z1, CAIXA.x2, -2, CAIXA.z2, M.barreira);
      yield;
    }],
    [0.04, () => limiar(H)],
    [0.2, () => portao(H)],
    [0.23, () => vila(H)],
    [0.55, () => passagem(H)],
    [0.58, () => arquivo(H)],
    [0.8, () => corredorFinal(H)],
    [0.83, () => arena(H)],
  ];
  for (let i = Math.max(0, desde); i < fases.length; i++) {
    progresso(fases[i][0], FASES_MAPA[i]);
    H.h.mark = p.ops;
    yield* fases[i][1]();
    fasePronta(i + 1);
  }
  progresso(1, "Concluído");
}

export { LAY };
