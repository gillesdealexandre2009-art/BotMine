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

// Teleporte (os de erro já saem em §c; §e destaca e §c volta à cor)
/** Contagem na actionbar. @param {number} segundos */
export const TP_ESPERA = (segundos) => `§6» §fTeleporte em §e${segundos}s§f. Não se mexe! §6«`;
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
