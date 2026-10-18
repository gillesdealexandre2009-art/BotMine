// @ts-check
// Textos da Roleta (a barraca da feira).

/** Cor de cada fatia da roda (a número 1 fica no topo e os números seguem em sentido horário). */
export const COR_FATIA = ["§cvermelha", "§6laranja", "§eamarela", "§alima", "§2verde", "§3turquesa", "§bciano", "§9azul", "§1índigo", "§5roxa", "§dmagenta", "§drosa"];
export const TIPOS = ["nada", "caudas", "xp", "item"];
export const NOMES_TIPO = ["Nada", "Caudas", "XP", "Item"];

export const JOGO_FECHADO = "A Roleta está fechada no momento.";
export const OCUPADA = "A roleta está girando! Espere ela parar.";
/** @param {number} s */
export const RECARGA = (s) => `Calma, sortudo! O próximo giro é em §e${s}s§c.`;
export const GANHO_MAX = "Você já ganhou o máximo de hoje na roleta. Volte amanhã!";
export const PERDA_MAX = "Chega de roleta por hoje! Volte amanhã.";
/** @param {number} custo */
export const SEM_CAUDAS = (custo) => `Você precisa de §e${custo} Caudas§c para girar a roleta.`;

/** @param {number} custo */
export const GIRANDO = (custo) => `§6Roleta §8» §7Você pagou §e${custo}§7. Girando... boa sorte!`;
export const TITULO_NADA = "§7Nada desta vez...";
export const SUB_NADA = "§8A roleta não gostou de você. Tente de novo!";
/** @param {string} desc */
export const TITULO_PREMIO = (desc) => `§6${desc}`;
/** @param {number} k @param {string} desc */
export const SUB_PREMIO = (k, desc) => `§7Fatia ${k + 1} (${COR_FATIA[k]}§7): ${desc}`;
/** @param {string} desc */
export const CHAT_PREMIO = (desc) => `§6Roleta §8» §fSaiu: ${desc}§f!`;
export const CHAT_NADA = "§6Roleta §8» §fNão saiu nada. A sorte vira!";
/** @param {string} nome @param {string} desc */
export const GRANDE_PREMIO = (nome, desc) => `§6§l✦ §r§e${nome} §6tirou ${desc} §6na roleta da feira!`;
export const SEM_ESPACO_ITEM = "§6Roleta §8» §7Seu inventário estava cheio: o item caiu no chão perto de você.";
export const ITEM_PERDIDO = "§6Roleta §8» §cO prêmio em item não pôde ser entregue.";

/** @param {{ tipo: string, valor: number, item: string }} f */
export const DESCRICAO = (f) =>
  f.tipo === "caudas" ? `§e${f.valor} Caudas` : f.tipo === "xp" ? `§b${f.valor} XP` : f.tipo === "item" ? `§f${f.valor}x ${f.item.replace("minecraft:", "")}` : "§8Nada";

/**
 * @param {number} custo
 * @param {string | undefined} ultimo
 */
export const TITULO_FLUTUANTE = (custo, ultimo) =>
  ["§6§lROLETA", `§7clique e gire §8• §e${custo} Caudas`, ultimo ? `§8Último: ${ultimo}` : "§8Ninguém girou ainda"].join("\n");

// menu do jogador
export const TITULO_MENU = "Roleta";
/** @param {number} custo */
export const CORPO_MENU = (custo) => `§7Gire a roleta por §e${custo} Caudas§7. A seta vermelha, no topo, mostra o prêmio. Tem prêmio em Caudas, XP e itens, e fatias vazias.`;
/** @param {number} custo */
export const BOTAO_GIRAR = (custo) => `Girar (${custo} Caudas)`;
export const BOTAO_PREMIOS = "Ver os prêmios";
export const TITULO_PREMIOS = "Prêmios da roleta";
/** @param {number} k @param {string} desc */
export const LINHA_PREMIO = (k, desc) => `§7${k + 1}. ${COR_FATIA[k]} §8» ${desc}`;

// painel da staff
export const TITULO_STAFF = "Roleta (staff)";
export const BOTAO_STAFF = "Roleta";
export const BOTAO_MARCAR = "Marcar a roleta (olhe para o bloco; ela fica de frente para você)";
export const BOTAO_PREMIOS_STAFF = "Editar os prêmios";
export const BOTAO_TESTAR = "Testar o alinhamento da seta (gira até a fatia 3)";
export const BOTAO_RESTAURAR = "Restaurar os prêmios padrão";
export const BOTAO_CONFIG = "Configurações da roleta";
export const BOTAO_REMOVER = "Remover a roleta";
export const CONFIRMAR_REMOVER = "Remover a roleta, a seta e o título?";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 12 blocos de distância (a roleta fica em cima dele).";
/** @param {string} onde */
export const MARCADA = (onde) => `§aRoleta marcada em §e${onde}§a. Ela fica em cima do bloco, de frente para você. Clicar nela ou no bloco abre o menu.`;
export const SEM_ROLETA = "Marque a roleta primeiro.";
export const TESTE_ALINHAMENTO = "§6Teste §8» §7A seta, no topo, deve parar no número §e3§7. Se parar no §e11§7, ligue 'inverter o sentido' nas configurações; se parar em outro número, use o 'ajuste da seta' (de 30 em 30 graus).";
export const REMOVIDO = "§aRoleta removida.";
export const PREMIOS_RESTAURADOS = "§aPrêmios padrão restaurados.";
/** @param {number} k */
export const TITULO_FATIA = (k) => `Fatia ${k + 1} (${COR_FATIA[k].replace(/§./g, "")})`;
export const ROTULO_TIPO = "O que a fatia dá?";
export const ROTULO_VALOR = "Quantidade (Caudas, XP ou itens)";
export const ROTULO_ITEM = "Item (só para o tipo Item, ex.: minecraft:diamond)";
export const ITEM_INVALIDO = "Esse item não existe. Use o id completo, como minecraft:diamond.";
/** @param {number} k @param {string} desc */
export const FATIA_SALVA = (k, desc) => `§aFatia ${k + 1} agora dá: ${desc}§a.`;
/** @param {{ marcada: boolean, girando: boolean, ultimo?: string }} e */
export const CORPO_STAFF = (e) =>
  [
    "§7Roda grande de pé, com 12 fatias numeradas, que gira até a seta marcar o prêmio. Cada fatia tem a mesma chance (1 em 12); edite o que cada uma dá.",
    "",
    `§fRoleta: ${e.marcada ? "§amarcada" : "§cnão marcada"}`,
    `§fÚltimo prêmio: §7${e.ultimo ?? "nenhum"}`,
    e.girando ? "§eEstá girando agora." : "§fParada.",
  ].join("\n");
