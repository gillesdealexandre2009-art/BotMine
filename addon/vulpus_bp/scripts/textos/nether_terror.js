// @ts-check
// Textos internos do sistema de terror ambiental do Nether.

export const LOG = "[Vulpus] Nether terror";

// nomes dos eventos (só para log e diagnóstico; o jogador nunca vê)
export const EVENTOS = {
  eco_passos: "eco_passos",
  eco_pedra: "eco_pedra",
  eco_porta: "eco_porta",
  silencio: "silencio",
  presenca: "presenca",
  observador: "observador",
  peregrino: "peregrino",
  intruso: "intruso",
};

// diagnóstico da staff
export const DIAG_TITULO = "Terror do Nether";
export const DIAG_JOGADORES = (n) => `${n} jogador(es) no Nether`;
export const DIAG_EVENTO = (nome, jogador, tick) => `§7${nome} → ${jogador} (tick ${tick})`;
export const DIAG_NENHUM = "§7Nenhum evento recente.";
