// @ts-check
// Dados da tinta de cor de cada Era (sem nenhuma dependência do jogo: o gerador de UI em tools/ importa este arquivo direto).

/** @typedef {{ cor: string, tom: number, vinheta: string, borda: number }} Tinta  cor do tom + opacidade, cor das bordas + opacidade */

/** Uma tinta por Era (índice = número - 1). tom = opacidade do tom sobre a tela toda; borda = opacidade da vinheta (a textura já escurece só as bordas). */
export const TINTAS = Object.freeze(/** @type {readonly Tinta[]} */ ([
  { cor: "#ffd98a", tom: 0.1, vinheta: "#3a2a05", borda: 0.7 },
  { cor: "#d98a3d", tom: 0.16, vinheta: "#3a1a00", borda: 0.8 },
  { cor: "#1a2a6a", tom: 0.2, vinheta: "#000014", borda: 0.9 },
  { cor: "#cfe6ff", tom: 0.14, vinheta: "#0a1a33", borda: 0.75 },
  { cor: "#ffc2d6", tom: 0.12, vinheta: "#3a1a25", borda: 0.6 },
  { cor: "#c8d4ff", tom: 0.12, vinheta: "#10143a", borda: 0.7 },
  { cor: "#d6b8ff", tom: 0.12, vinheta: "#1a0f33", borda: 0.7 },
  { cor: "#1d5a52", tom: 0.2, vinheta: "#00110f", borda: 0.95 },
  { cor: "#f0f4ff", tom: 0.1, vinheta: "#8890a0", borda: 0.7 },
  { cor: "#e6c15a", tom: 0.16, vinheta: "#2a1d00", borda: 0.8 },
  { cor: "#8a8d84", tom: 0.2, vinheta: "#121210", borda: 0.9 },
  { cor: "#8a1520", tom: 0.2, vinheta: "#1a0004", borda: 0.95 },
  { cor: "#101010", tom: 0.14, vinheta: "#000000", borda: 1 },
  { cor: "#7d8fa3", tom: 0.16, vinheta: "#0d121a", borda: 0.8 },
  { cor: "#3a4a22", tom: 0.18, vinheta: "#000000", borda: 0.95 },
  { cor: "#ffffff", tom: 0.06, vinheta: "#9aa0a8", borda: 0.55 },
  { cor: "#0a1a40", tom: 0.22, vinheta: "#00020a", borda: 1 },
  { cor: "#d4af37", tom: 0.12, vinheta: "#0a0800", borda: 0.95 },
  { cor: "#3a4f8a", tom: 0.16, vinheta: "#04060f", borda: 0.8 },
  { cor: "#fff1c8", tom: 0.14, vinheta: "#1a1400", borda: 0.7 },
]));

/** Marca da tinta da Era no texto do placar (igual à do vulpus_era.json e à subtraída em vulpus_hud.json). @param {number} numero 1 a 20 */
export const FLAG_ERA_TINTA = (numero) => `§v§e§r${String(numero).padStart(2, "0")}`;

/** Todas as marcas, na ordem das Eras. */
export const TODAS_AS_MARCAS = Object.freeze(TINTAS.map((_, i) => FLAG_ERA_TINTA(i + 1)));
