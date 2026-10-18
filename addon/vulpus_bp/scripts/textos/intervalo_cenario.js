// @ts-check
// Textos de cenário do Intervalo (placas e avisos que só enfeitam o lugar; os textos do enredo ficam em intervalo.js).
// A sinalização repete e erra de leve (bíblia 14.5): duas setas "SAÍDA" para lados opostos, uma área com a ordem trocada.

// ---- A: Corredores
export const AREA_ERRADA = "§7ÁREA 1 — 2 — 2 — 1";
export const SAIDA_DIREITA = "§7SAÍDA\n§8→";
export const SAIDA_ESQUERDA = "§7SAÍDA\n§8←";
export const MESA_TOMAS = "§7MESA DE CARTOGRAFIA\n§8não mexer nos mapas";
export const SALA_NOVE = "§7SALA 9\n§8(arrumada)";
export const ESCADA_INTERDITADA = "§7ESCADA\n§8(sem andar)";

// ---- B: Piscina Vazia
export const SALVA_VIDAS = "§7SALVA-VIDAS\n§8VOLTO JÁ";
export const NAO_CORRA = "§bPROIBIDO CORRER";
export const PROFUNDIDADE = "§b3,00 m\n§8(0,00 m)";
export const VESTIARIO_M = "§7VESTIÁRIO\n§8MASCULINO";
export const VESTIARIO_F = "§7VESTIÁRIO\n§8FEMININO";
export const ARQUIBANCADA = "§7LOTAÇÃO: 40\n§8(lotação atual: 40)";

// ---- C: Casa de Máquinas
export const ALTA_PRESSAO = "§6ALTA PRESSÃO\n§8NÃO ABRIR";
export const QUADRO_GERAL = "§6QUADRO GERAL";
export const CALDEIRA = (/** @type {number} */ n) => `§6CALDEIRA ${n}`;
export const TANQUE = "§6TANQUE\n§8nível: constante";
export const SALA_FECHADA = "§7ZELADORIA\n§8(ocupada)";

// ---- D: Estação
export const BILHETERIA = "§7BILHETERIA\n§8FECHADA";
export const VOLTO_JA = "§7VOLTO JÁ\n§8— 14:14 —";
export const LINHA = "§6NÃO ULTRAPASSE A LINHA";
export const SEM_SERVICO = "§7SERVIÇO\n§8ENCERRADO";

// ---- E: Sala de Espera
export const SENHA_ATUAL = "§7SENHA ATUAL\n§f— — —";
export const SUA_SENHA = "§7SUA SENHA\n§f14";
