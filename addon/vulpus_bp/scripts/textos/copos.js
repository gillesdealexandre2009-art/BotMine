// @ts-check
// Textos do Jogo do Copo (a barraca da feira).

export const POSICOES = ["da esquerda", "do meio", "da direita"];
export const BOTOES = ["Copo da esquerda", "Copo do meio", "Copo da direita"];

export const JOGO_FECHADO = "A barraca do Jogo do Copo está fechada no momento.";
export const OCUPADA = "Alguém está jogando agora! Espere a vez.";
/** @param {number} s */
export const RECARGA = (s) => `Calma, apostador! A próxima rodada é em §e${s}s§c.`;
export const GANHO_MAX = "Você já ganhou o máximo de hoje no Jogo do Copo. Volte amanhã!";
export const PERDA_MAX = "Chega de copos por hoje! Volte amanhã.";
/** @param {number} minimo */
export const SEM_CAUDAS = (minimo) => `Você precisa de pelo menos §e${minimo} Caudas§c para jogar.`;

export const TITULO_APOSTA = "Jogo do Copo";
export const ROTULO_APOSTA = "Quanto você aposta (Caudas)?";
/** @param {number} valor */
export const COMECOU = (valor) => `§6Copo §8» §7Você apostou §e${valor}§7. Olhe onde a bolinha está e siga o copo!`;
export const OLHE_A_BOLINHA = "§e§lOLHE A BOLINHA!";
export const EMBARALHANDO = "§7Embaralhando...";
export const ESCOLHA = "§a§lQUAL COPO TEM A BOLINHA? §r§7(clique no copo ou use o menu)";
export const TITULO_ESCOLHA = "Qual copo?";
export const CORPO_ESCOLHA = "§7Onde está a bolinha? Você também pode clicar direto no copo. Tempo limitado!";
export const ESPERANDO_OUTRA_PESSOA = "Essa rodada é de outra pessoa.";
/** @param {number} p */
export const ESCOLHEU = (p) => `§6Copo §8» §7Você escolheu o copo ${POSICOES[p]}...`;
/** @param {number} premio */
export const TITULO_ACERTOU = (premio) => `§a§lACERTOU! §e+${premio}`;
export const SUB_ACERTOU = "§7A bolinha estava mesmo ali!";
export const TITULO_ERROU = "§cErrou!";
/** @param {number} p */
export const SUB_ERROU = (p) => `§7A bolinha estava no copo ${POSICOES[p]}`;
/** @param {number} premio @param {number} valor */
export const CHAT_ACERTOU = (premio, valor) => `§6Copo §8» §aAcertou! §fVocê recebeu §e${premio} Caudas §7(lucro de ${premio - valor}).`;
/** @param {number} valor */
export const CHAT_ERROU = (valor) => `§6Copo §8» §fErrou. Você perdeu §e${valor} Caudas§f. Tente de novo!`;
export const TEMPO_ESGOTOU = "§6Copo §8» §cO tempo para escolher acabou: a aposta ficou com a barraca.";
/** @param {string} nome @param {number} premio */
export const GRANDE_VITORIA = (nome, premio) => `§6§l✦ §r§e${nome} §6achou a bolinha e levou §e${premio} Caudas §6no jogo do copo da feira!`;
export const REEMBOLSO = "§6Copo §8» §7A rodada foi cancelada e sua aposta voltou.";

/**
 * @param {number} min
 * @param {number} max
 * @param {number} pct
 * @param {string | undefined} ultimo
 */
export const TITULO_FLUTUANTE = (min, max, pct, ultimo) =>
  [
    "§6§lQUAL COPO?",
    `§7clique no balcão §8• §e${min}-${max} Caudas §8• §7paga §e${(pct / 100).toFixed(2).replace(".", ",")}x`,
    ultimo ? `§8Última: ${ultimo}` : "§8Ninguém jogou ainda",
  ].join("\n");

// Painel da staff
export const TITULO_STAFF = "Jogo do Copo (staff)";
export const BOTAO_STAFF = "Jogo do Copo";
export const BOTAO_MARCAR = "Marcar o balcão (olhe para o bloco do meio; os copos ficam de frente para você)";
export const BOTAO_TESTAR = "Fazer uma rodada de teste (sem aposta)";
export const BOTAO_CONFIG = "Configurações do Jogo do Copo";
export const BOTAO_REMOVER = "Remover a barraca";
export const CONFIRMAR_REMOVER = "Remover o balcão, os copos e a bolinha?";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 12 blocos de distância (o do meio do balcão).";
/** @param {string} onde */
export const BALCAO_MARCADO = (onde) => `§aBalcão marcado em §e${onde}§a. Os três copos ficam em cima dele, lado a lado, de frente para você. Clicar no bloco ou num copo abre a aposta.`;
export const REMOVIDO = "§aJogo do Copo removido.";
export const SEM_BALCAO = "Marque o balcão primeiro.";
/** @param {{ marcado: boolean, fase: string }} e */
export const CORPO_STAFF = (e) =>
  [
    "§7Três copos iguais: uma bolinha fica embaixo de um, eles se embaralham e a pessoa escolhe qual tem a bolinha.",
    "",
    `§fBalcão: ${e.marcado ? "§amarcado" : "§cnão marcado"}`,
    `§fAgora: §7${e.fase === "livre" ? "livre" : e.fase === "escolher" ? "alguém está escolhendo" : "rodada em andamento"}`,
  ].join("\n");
