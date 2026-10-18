// @ts-check
// Textos do Cara ou Coroa (a barraca da feira).

export const TITULO = "Cara ou Coroa";
export const ROTULO_LADO = "Qual lado você escolhe?";
export const LADOS = ["Cara (raposa)", "Coroa"];
export const ROTULO_APOSTA = "Quanto você aposta (Caudas)?";
export const MOTIVO = "cara ou coroa";

export const JOGO_FECHADO = "A barraca do Cara ou Coroa está fechada no momento.";
export const OCUPADA = "A moeda ainda está no ar! Espere ela cair.";
/** @param {number} s */
export const RECARGA = (s) => `Calma, apostador! A próxima aposta é em §e${s}s§c.`;
export const GANHO_MAX = "Você já ganhou o máximo de hoje na barraca. Volte amanhã!";
export const PERDA_MAX = "Chega de moeda por hoje! A barraca pede que você volte amanhã.";
/** @param {number} minimo */
export const SEM_CAUDAS = (minimo) => `Você precisa de pelo menos §e${minimo} Caudas§c para apostar.`;

/**
 * @param {number} aposta
 * @param {string} escolha
 */
export const GIRANDO = (aposta, escolha) => `§6Cara ou Coroa §8» §7Você apostou §e${aposta}§7 na §f${escolha}§7. A moeda subiu!`;
/**
 * @param {string} resultado
 * @param {boolean} venceu
 */
export const TITULO_RESULTADO = (resultado, venceu) => `${venceu ? "§6" : "§7"}${resultado.toUpperCase()}!`;
/** @param {number} premio */
export const SUB_GANHOU = (premio) => `§aVocê ganhou §e${premio} Caudas`;
/** @param {number} aposta */
export const SUB_PERDEU = (aposta) => `§7Não foi dessa vez (-${aposta})`;
/**
 * @param {string} resultado
 * @param {number} premio
 * @param {number} lucro
 */
export const CHAT_GANHOU = (resultado, premio, lucro) => `§6Cara ou Coroa §8» §fDeu §e${resultado}§f! Você recebeu §e${premio} Caudas §7(lucro de ${lucro}).`;
/**
 * @param {string} resultado
 * @param {number} aposta
 */
export const CHAT_PERDEU = (resultado, aposta) => `§6Cara ou Coroa §8» §fDeu §e${resultado}§f. Você perdeu §e${aposta} Caudas§f. A sorte vira!`;
/**
 * @param {string} nome
 * @param {number} premio
 */
export const GRANDE_VITORIA = (nome, premio) => `§6§l✦ §r§e${nome} §6ganhou §e${premio} Caudas §6no Cara ou Coroa da feira!`;

/**
 * @param {number} min
 * @param {number} max
 * @param {number} pct
 * @param {string[]} ultimos
 */
export const TITULO_FLUTUANTE = (min, max, pct, ultimos) =>
  [
    "§6§l✦ CARA OU COROA ✦",
    "§7Clique no balcão e aposte",
    `§e${min}§7 a §e${max}§7 Caudas §8• §7paga §e${(pct / 100).toFixed(2).replace(".", ",")}x`,
    ultimos.length ? `§8Últimas: §7${ultimos.join("§8, §7")}` : "§8Ninguém jogou ainda",
  ].join("\n");

// Painel da staff
export const TITULO_STAFF = "Cara ou Coroa (staff)";
export const BOTAO_STAFF = "Cara ou Coroa";
export const BOTAO_MARCAR = "Marcar o balcão (olhe para o bloco)";
export const BOTAO_TESTAR = "Girar a moeda (teste, sem apostar)";
export const BOTAO_CONFIG = "Configurações do Cara ou Coroa";
export const BOTAO_REMOVER = "Remover a barraca";
export const CONFIRMAR_REMOVER = "Remover o balcão, a moeda e o título do Cara ou Coroa?";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 8 blocos de distância (o balcão onde a moeda vai ficar).";
/** @param {string} onde */
export const BALCAO_MARCADO = (onde) => `§aBalcão marcado em §e${onde}§a. A moeda fica em cima dele; clicar nele abre a aposta (staff agachada abre normal).`;
export const REMOVIDO = "§aCara ou Coroa removido.";
export const SEM_BALCAO = "Marque o balcão primeiro.";
/**
 * @param {{ balcao: boolean, ultimos: string[], emJogo: boolean }} e
 */
export const CORPO_STAFF = (e) =>
  [
    "§7Uma moeda sobe, gira e cai: cara ou coroa decide quem ganha. Tudo com espera e limites por dia.",
    "",
    `§fBalcão: ${e.balcao ? "§amarcado" : "§cnão marcado"}`,
    `§fÚltimos resultados: §7${e.ultimos.length ? e.ultimos.join(", ") : "nenhum"}`,
    e.emJogo ? "§eA moeda está no ar agora." : "§fA moeda está parada.",
  ].join("\n");
