// @ts-check
// Textos gerais da Kiza: leves, brincalhões e curtos, com gênero neutro.
// Sem emoji (a fonte do jogo não tem); símbolos que funcionam: • » « ✔ ✖ ★

export const PREFIXO = "§6Kiza §8» §r";

export const ERRO_INTERNO = "Ops, tropecei na minha própria cauda! Tenta de novo daqui a pouco.";
export const SO_STAFF = "Esse truque é só da staff.";
export const SO_JOGADOR = "Esse comando só funciona com alguém dentro do jogo.";
export const JOGADOR_OFFLINE = "Não achei essa pessoa online. Confere o nome?";

// Botões padrão dos menus
export const VOLTAR = "Voltar";
export const SIM = "Sim";
export const NAO = "Não";
export const CONFIRMAR = "Confirmar";

// Tema do painel de quem perdeu o selo Kitsune (core/forms.js)
export const TEMA_VOLTOU =
  "Seu painel voltou para o tema §6Laranja§r: os temas Sakura, Lunar e Espírito são mimo do selo Kitsune.";

// Teleporte (os de erro já saem em §c; §e destaca e §c volta à cor)
/**
 * Contagem na actionbar, com a barrinha que enche.
 * @param {number} segundos
 * @param {string} barra  já com as cores (glyphs.barra)
 */
export const TP_ESPERA = (segundos, barra) => `§6» §fNão se mexe! ${barra} §e${segundos}s §6«`;
export const TP_CANCELADO_BARRA = "§c✖ Teleporte cancelado";
export const TP_CANCELADO_ANDOU = "Ih, você se mexeu! Cancelei o teleporte.";
export const TP_CANCELADO_DANO = "Ai! Você levou dano, então cancelei o teleporte.";
/** @param {number} segundos */
export const TP_COMBATE = (segundos) => `No meio da briga não dá! Espera mais §e${segundos}s§c sem lutar.`;
/** @param {number} segundos */
export const TP_RECARGA = (segundos) => `Calma, raposinha! Minhas caudas ainda recarregam. Tenta em §e${segundos}s§c.`;
/** @param {string} [destino] */
export const TP_CHEGOU = (destino) => (destino ? `Zás! Chegamos §8» §6${destino}` : "Zás! Chegamos.");
export const TP_SEM_DESTINO = "Opa, o destino sumiu do mapa. Cancelei o teleporte.";
export const TP_FALHOU = "Não consegui te levar até lá. Tenta de novo?";
/** Título da chegada: o nome do destino. @param {string} [destino] */
export const TP_TITULO = (destino) => `§6${destino ?? "Zás!"}`;
export const TP_SUB_KITSUNE = "§7Viagem de raposa concluída";
export const TP_SUB_CASA = "§7Lar, doce toca";
export const TP_SUB_SPAWN = "§7O coração do Vulpus";
export const TP_TITULO_VOLTAR = "§7De volta!";
export const TP_SUB_VOLTAR = "§8Ao seu último lugar";
export const TP_SUB_TPA = "§7Visita entregue pelas caudas";
export const TP_SUB_CLA = "§7Casa do clã, casa de todo mundo";
