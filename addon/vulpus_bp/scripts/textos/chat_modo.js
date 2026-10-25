// @ts-check
// Textos do modo do chat (/chat): global, local (só quem está perto) e time (só o clã).

export const DESC_CHAT = "Escolhe com quem você fala no chat: todos, quem está perto ou o seu time";
export const TITULO = "Modo do chat";

/** @type {Readonly<Record<string, string>>} */
export const NOME_MODO = Object.freeze({
  global: "§aGlobal",
  local: "§bLocal",
  time: "§6Time",
});

/** @type {Readonly<Record<string, string>>} */
export const DESC_MODO = Object.freeze({
  global: "todo mundo lê",
  local: "só quem está perto lê",
  time: "só o seu clã lê",
});

/** @param {string} modo @param {number} raio 0 = chat local desligado pela staff */
export const CORPO = (modo, raio) =>
  `§7Agora: ${NOME_MODO[modo] ?? modo}§7 (${DESC_MODO[modo] ?? ""})\n\n` +
  `§f#mensagem §7fala só com o seu time, uma vez.\n` +
  `§f!mensagem §7fala com todos, uma vez (no modo local ou time).\n` +
  (raio > 0 ? `§7Chat local: até §f${raio}§7 blocos, na mesma dimensão. A staff lê tudo.` : `§7O chat local está desligado pela staff.`);

/** @param {string} modo @param {boolean} atual */
export const BOTAO_MODO = (modo, atual) => `${NOME_MODO[modo]}§r: ${DESC_MODO[modo]}${atual ? " §8(atual)" : ""}`;
/** @param {string} modo */
export const BOTAO_AJUSTE = (modo) => `Chat: ${NOME_MODO[modo] ?? modo}`;

/** @param {string} modo */
export const MODO_MUDOU = (modo) =>
  ({
    global: "Chat global: todo mundo lê o que você escreve.",
    local: "Chat local: só quem está perto lê. Use ! antes da mensagem para falar com todos.",
    time: "Chat do time: só o seu clã lê. Use ! antes da mensagem para falar com todos.",
  })[modo] ?? "";
export const LOCAL_DESLIGADO = "O chat local está desligado pela staff.";
export const SEM_TIME = "Você não tem um clã. O modo Time precisa de um.";
export const MODO_INVALIDO = "Modos: global, local ou time.";
