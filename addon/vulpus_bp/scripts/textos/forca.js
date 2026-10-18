// @ts-check
// Textos do Teste de Força (a barraca da feira).

export const MOTIVO = "teste de força";
export const JOGO_FECHADO = "A barraca do Teste de Força está fechada no momento.";
export const OCUPADA = "Tem gente testando a força agora! Espere a vez.";
/** @param {number} s */
export const RECARGA = (s) => `Calma, forte! O próximo teste é em §e${s}s§c.`;
export const GANHO_MAX = "Você já ganhou o máximo de hoje na barraca. Volte amanhã!";
export const PERDA_MAX = "Chega de força por hoje! Volte amanhã.";
/** @param {number} custo */
export const SEM_CAUDAS = (custo) => `Você precisa de §e${custo} Caudas§c para testar a força.`;

/** @param {number} custo */
export const COMECOU = (custo) => `§6Teste de Força §8» §7Você pagou §e${custo}§7. Um marcador vai subir e descer o mastro: §fbata de novo na plataforma§7 para pará-lo o mais alto possível!`;
/** @param {number} n */
export const CONTAGEM = (n) => `§e${n}...`;
export const BARRA_PARE = "§6§lBATA NA PLATAFORMA QUANDO ELE ESTIVER LÁ NO ALTO!";
export const VAI = "§a§lVAI!";

/** @param {number} pct */
export const TITULO_RESULTADO = (pct) => `§6${pct}%`;
/** @param {string} zona */
export const SUB_ZONA = (zona) => zona;
export const ZONA_TOPO = "§a§lFORÇA MÁXIMA!";
export const ZONA_ALTO = "§aMuito bem!";
export const ZONA_MEDIO = "§eNão foi mal";
export const ZONA_BAIXO = "§7Fraquinho...";
/**
 * @param {number} pct
 * @param {number} premio
 * @param {number} custo
 */
export const CHAT_RESULTADO = (pct, premio, custo) =>
  premio > custo
    ? `§6Teste de Força §8» §fVocê parou em §e${pct}%§f e recebeu §e${premio} Caudas §7(lucro de ${premio - custo}).`
    : premio === custo
      ? `§6Teste de Força §8» §fVocê parou em §e${pct}%§f e recuperou as §e${custo} Caudas§f.`
      : `§6Teste de Força §8» §fVocê parou em §e${pct}%§f. As §e${custo} Caudas§f ficaram na barraca.`;
/** @param {string} nome @param {number} pct */
export const NOVO_RECORDE = (nome, pct) => `§6§l✦ §r§e${nome} §6bateu o recorde do Teste de Força: §e${pct}%§6!`;
/** @param {string} nome @param {number} premio */
export const GRANDE_VITORIA = (nome, premio) => `§6§l✦ §r§e${nome} §6atingiu a força máxima e levou §e${premio} Caudas §6na feira!`;

/**
 * @param {number} custo
 * @param {number} topo
 * @param {{ nome: string, pct: number } | undefined} recorde
 */
export const TITULO_FLUTUANTE = (custo, topo, recorde) =>
  [
    "§6§lTESTE DE FORÇA",
    `§7bata na plataforma §8• §e${custo} Caudas`,
    `§7pare o marcador lá no alto §8• §7topo paga §e${topo}x`,
    recorde ? `§8Recorde: §f${recorde.nome} §e${recorde.pct}%` : "§8Ninguém testou ainda",
  ].join("\n");

// Painel da staff
export const TITULO_STAFF = "Teste de Força (staff)";
export const BOTAO_STAFF = "Teste de Força";
export const BOTAO_MARCAR_PAD = "Marcar a plataforma (olhe para o bloco que se bate)";
export const BOTAO_MARCAR_BASE = "Marcar a base do mastro (olhe para a face, embaixo)";
export const BOTAO_MARCAR_TOPO = "Marcar o topo do mastro (olhe para a face, em cima)";
export const BOTAO_TESTAR = "Subir o marcador (teste, sem custo)";
export const BOTAO_CONFIG = "Configurações do Teste de Força";
export const BOTAO_REMOVER = "Remover a barraca";
export const CONFIRMAR_REMOVER = "Remover a plataforma, o marcador e o título do Teste de Força?";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 8 blocos de distância.";
/** @param {string} onde */
export const PAD_MARCADO = (onde) => `§aPlataforma marcada em §e${onde}§a. Clicar ou bater nela joga (staff agachada mexe normal).`;
export const BASE_MARCADA = "§aBase do mastro marcada: o marcador começa aí.";
export const TOPO_MARCADO = "§aTopo do mastro marcado: o marcador sobe até aí.";
export const REMOVIDO = "§aTeste de Força removido.";
export const SEM_MARCAS = "Marque a plataforma, a base e o topo do mastro primeiro (o topo precisa estar acima da base).";
/**
 * @param {{ pad: boolean, base: boolean, topo: boolean, emJogo: boolean, recorde?: { nome: string, pct: number } }} e
 */
export const CORPO_STAFF = (e) =>
  [
    "§7Um marcador sobe e desce no mastro: a pessoa bate na plataforma para parar. Quanto mais alto, maior o prêmio.",
    "",
    `§fPlataforma: ${e.pad ? "§amarcada" : "§cnão marcada"}`,
    `§fBase do mastro: ${e.base ? "§amarcada" : "§cnão marcada"}`,
    `§fTopo do mastro: ${e.topo ? "§amarcado" : "§cnão marcado"}`,
    `§fRecorde: §7${e.recorde ? `${e.recorde.nome} (${e.recorde.pct}%)` : "nenhum"}`,
    e.emJogo ? "§eAlguém está jogando agora." : "§fLivre.",
  ].join("\n");
