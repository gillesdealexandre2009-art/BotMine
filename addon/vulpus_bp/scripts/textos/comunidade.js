// @ts-check
// Textos do Canto comunitário: baú de doações com meta, mural de recados, fogueira da roda e sugestões.

export const CMD_RECADO = "Deixa um recado no mural comunitário";
export const CMD_SUGESTAO = "Manda uma sugestão para a staff";
export const MOTIVO_DOACAO = "doação ao Canto comunitário";
export const MOTIVO_META = "meta comunitária batida";

// ----------------------------------------------------------------------------------- doações
export const TITULO_BAU = "Baú comunitário";
export const SEM_META = "§7Não tem meta ativa agora. Volte em breve: a staff vai abrir uma nova!";
export const SEM_BAU_ATIVO = "O canto comunitário está desligado no momento.";
/**
 * @param {string} nome
 * @param {string} item
 * @param {string} barra
 * @param {number} atual
 * @param {number} alvo
 * @param {boolean} feita
 */
export const META_CORPO = (nome, item, barra, atual, alvo, feita) =>
  [
    `§6${nome}`,
    feita ? "§aMeta concluída! Obrigado, pessoal!" : `§7Precisamos de §e${alvo}§7 de §f${item}§7.`,
    `${barra} §e${atual}§7/${alvo}`,
  ].join("\n");
/**
 * @param {number} meus  itens que a pessoa já doou nesta meta
 * @param {number} caudasHoje
 * @param {number} maxDia
 */
export const MEUS_NUMEROS = (meus, caudasHoje, maxDia) =>
  `§7Você doou §e${meus}§7 nesta meta. Caudas por doações hoje: §e${caudasHoje}§7/${maxDia}.`;
/** @param {number} n */
export const BOTAO_DOAR_TUDO = (n) => `Doar tudo o que tenho (${n})`;
export const BOTAO_DOAR_QTD = "Doar uma quantidade";
export const BOTAO_RANKING = "Maiores doadores da semana";
export const ROTULO_QTD = "Quantos itens?";
export const SEM_ITENS = "Você não tem esse item no inventário.";
/** @param {number} s */
export const ESPERA_DOACAO = (s) => `Calma! Dá para doar de novo em §e${s}s§c.`;
export const META_FECHADA = "A meta já foi concluída. Espere a próxima!";
/**
 * @param {number} qtd
 * @param {string} item
 * @param {number} caudas
 */
export const DOOU = (qtd, item, caudas) => `§aVocê doou §e${qtd}§a de §f${item}§a.` + (caudas > 0 ? ` §6+${caudas} Caudas.` : "");
/**
 * @param {string} nome
 * @param {number} premio
 */
export const META_BATIDA = (nome, premio) =>
  `§6§l✦ META BATIDA ✦ §r§e${nome}§6! Todo mundo que doou ganhou §e${premio} Caudas§6. Obrigada, comunidade!`;
export const RANKING_VAZIO = "§7Ninguém doou nesta semana ainda.";
/** @param {string} lista */
export const RANKING_CORPO = (lista) => `§6Maiores doadores da semana\n${lista}`;

// ------------------------------------------------------------------------------------ placar
export const PLACAR_TITULO = "§6§l✦ CANTO COMUNITÁRIO ✦";
export const PLACAR_SEM_META = "§7sem meta no momento";
export const PLACAR_DOADORES = "§eMaiores doadores da semana";
export const PLACAR_VAZIO = "§7ninguém ainda";
/**
 * @param {number} pos
 * @param {string} nome
 * @param {number} valor
 */
export const PLACAR_LINHA = (pos, nome, valor) => `§7${pos}. §f${nome} §8» §e${valor}`;
export const NOME_DESCONHECIDO = "???";

// ------------------------------------------------------------------- títulos flutuantes
export const TITULO_FLUTUANTE_BAU = "§6§l✦ BAÚ COMUNITÁRIO ✦\n§7Clique para doar e ajudar a meta";
export const TITULO_FLUTUANTE_FOGUEIRA = "§6§l✦ FOGUEIRA DA RODA ✦\n§7Fiquem juntos, conversem e ganhem XP";

// -------------------------------------------------------------------------------------- mural
export const MURAL_TITULO = "§6§lMURAL DE RECADOS";
export const MURAL_VAZIO = "§7nenhum recado ainda";
/**
 * @param {string} texto
 * @param {string} nome
 */
export const MURAL_LINHA = (texto, nome) => `§f${texto} §8— §7${nome}`;
export const TITULO_MURAL = "Mural de recados";
export const BOTAO_VER_RECADOS = "Ler os recados";
export const BOTAO_DEIXAR_RECADO = "Deixar um recado";
export const ROTULO_RECADO = "Seu recado";
export const DICA_RECADO = "bom jogo, pessoal!";
export const RECADO_VAZIO = "O recado está vazio.";
export const RECADO_PALAVRAO = "Esse recado não pode ser publicado. Tente outras palavras!";
/** @param {number} min */
export const ESPERA_RECADO = (min) => `Calma! Você pode deixar outro recado em §e${min} min§c.`;
export const RECADO_OK = "§aRecado publicado no mural! Ele substitui o seu anterior.";
export const NENHUM_RECADO = "§7O mural está vazio. Seja o primeiro!";

// ----------------------------------------------------------------------------------- sugestões
export const TITULO_SUGESTAO = "Caixa de sugestões";
export const ROTULO_SUGESTAO = "Sua sugestão para o servidor";
export const DICA_SUGESTAO = "ex.: um evento de construção...";
export const SUGESTAO_VAZIA = "A sugestão está vazia.";
export const SUGESTAO_PALAVRAO = "Essa sugestão não pode ser enviada. Reescreva com outras palavras!";
/** @param {number} min */
export const ESPERA_SUGESTAO = (min) => `Calma! Você pode mandar outra sugestão em §e${min} min§c.`;
export const SUGESTAO_OK = "§aSugestão enviada para a staff. Obrigada!";

// ----------------------------------------------------------------------------------- fogueira
/**
 * @param {number} xp
 * @param {number} pessoas
 */
export const FOGUEIRA_XP = (xp, pessoas) => `§6Roda de conversa §8» §e+${xp} XP §7(${pessoas} pessoas)`;

// ----------------------------------------------------------------------------- painel da staff
export const TITULO_STAFF = "Canto comunitário (staff)";
export const BOTAO_STAFF = "Canto comunitário (staff)";
export const BOTAO_MARCAR_BAU = "Marcar o baú de doações (olhe para o bloco)";
export const BOTAO_MARCAR_MURAL = "Marcar o mural (olhe para o bloco)";
export const BOTAO_MARCAR_FOGUEIRA = "Marcar a fogueira aqui";
export const BOTAO_RAIO_FOGUEIRA = "Ajustar o raio da fogueira";
export const BOTAO_PLACAR = "Pôr o placar flutuante aqui";
export const BOTAO_NOVA_META = "Nova meta de doação";
export const BOTAO_ZERAR_META = "Encerrar a meta atual";
/** @param {number} n */
export const BOTAO_SUGESTOES = (n) => `Sugestões recebidas (${n})`;
export const BOTAO_CONFIG = "Configurações do canto comunitário";
export const BOTAO_REMOVER = "Remover tudo do canto comunitário";
export const CONFIRMAR_REMOVER = "Remover o baú, o mural, a fogueira, o placar e a meta? Os recordes de doadores são mantidos.";
export const ROTULO_RAIO = "Raio da fogueira (blocos)";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 8 blocos de distância.";
/** @param {string} onde */
export const BLOCO_MARCADO = (onde) => `§aBloco marcado: §e${onde}§a. Clicar nele abre o painel; só a staff agachada abre normal.`;
export const MURAL_MARCADO = "§aMural marcado.";
export const FOGUEIRA_MARCADA = "§aFogueira marcada.";
export const PLACAR_MARCADO = "§aPlacar do canto comunitário posto aqui.";
export const ROTULO_META_NOME = "Nome da meta";
export const DICA_META_NOME = "ex.: Madeira para a ponte";
export const ROTULO_META_ITEM = "Item pedido (id)";
export const ROTULO_META_ALVO = "Quantidade total";
export const META_ITEM_INVALIDO = "Esse id de item não existe. Exemplo: minecraft:oak_log.";
export const META_NOVA = "§aNova meta aberta.";
export const META_ENCERRADA = "§aMeta encerrada.";
export const SEM_SUGESTOES = "§7Nenhuma sugestão por enquanto.";
export const BOTAO_APAGAR_SUGESTOES = "Apagar todas as sugestões";
export const TUDO_REMOVIDO = "§aCanto comunitário removido.";
/**
 * @param {{ bau: boolean, mural: boolean, fogueira: boolean, placar: boolean, meta?: { nome: string, atual: number, alvo: number, feita: boolean }, sugestoes: number }} e
 */
export const CORPO_STAFF = (e) =>
  [
    "§7Baú com meta de doação, mural de recados, fogueira da roda e caixa de sugestões.",
    "",
    `§fBaú de doações: ${e.bau ? "§amarcado" : "§cnão marcado"}`,
    `§fMural: ${e.mural ? "§amarcado" : "§cnão marcado"}`,
    `§fFogueira: ${e.fogueira ? "§amarcada" : "§cnão marcada"}`,
    `§fPlacar flutuante: ${e.placar ? "§asim" : "§cnão"}`,
    e.meta ? `§fMeta: §e${e.meta.nome} §7(${e.meta.atual}/${e.meta.alvo}${e.meta.feita ? ", concluída" : ""})` : "§fMeta: §cnenhuma",
    `§fSugestões: §e${e.sugestoes}`,
  ].join("\n");
