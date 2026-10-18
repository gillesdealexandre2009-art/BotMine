// @ts-check
// Textos do Pillars of Fortune (minigame).

export const PF_DESC = "Cada um no topo de um pilar sobre o vazio. De tempos em tempos todo mundo ganha um item aleatório: construa, lute e derrube os outros. Quem cair é eliminado; o último de pé vence.";

/** @type {Record<string, string>} */
export const PF_MAPAS = { vazio: "Pilares do Vazio", fim: "Pilares do Fim", mundo: "Pilares do Mundo" };

export const PF_CAT_ITENS = "Itens";
export const PF_CAT_ITENS_DESC = "Como os itens chegam até você.";
export const PF_ITENS_NORMAL = { nome: "Normal", desc: "Cada um recebe um item aleatório a cada rodada." };
export const PF_ITENS_EQUILIBRADO = { nome: "Equilibrado", desc: "Todos recebem exatamente o mesmo item a cada rodada." };
export const PF_ITENS_EMBARALHADO = { nome: "Embaralhado", desc: "A cada 20 segundos a hotbar inteira é trocada por itens aleatórios, além dos itens normais." };
export const PF_ITENS_TROCADOR = { nome: "Trocador", desc: "De tempos em tempos os jogadores trocam de lugar entre si." };

export const PF_CAT_MAPA = "Modo do mapa";
export const PF_CAT_MAPA_DESC = "O que acontece com o mapa durante a partida.";
export const PF_MAPA_NORMAL = { nome: "Normal", desc: "O mapa não muda sozinho." };
export const PF_MAPA_LAVA = { nome: "Lava subindo", desc: "Uma camada de lava sobe do fundo; quem tocar nela é eliminado." };
export const PF_MAPA_FRAGIL = { nome: "Blocos frágeis", desc: "O bloco sob seus pés some se você ficar parado nele por uns 3 segundos." };

/** @param {number} seg */
export const PF_INICIO = (seg) => `§7Você está no topo de um pilar. Itens a cada §f${seg}§7 segundos; último de pé vence.`;
/** @param {string} nome */
export const PF_ITEM = (nome) => `§7Item: §f${nome}`;
export const PF_EMBARALHOU = "§d§lHotbar embaralhada! §r§7Seus itens da hotbar foram trocados.";
export const PF_TROCA_AVISO = "§5§lTroca de lugares em 3 segundos...";
export const PF_TROCOU = "§5§lTrocaram de lugar!";
/** @param {number} nivel */
export const PF_LAVA_AVISO = (nivel) => `§c§lA lava está subindo! §r§7Nível atual: §fy ${nivel}§7. Suba nos pilares.`;
/** @param {number} nivel */
export const PF_LAVA_NIVEL = (nivel) => `§cA lava chegou ao nível y ${nivel}.`;
export const PF_FRAGIL_AVISO = "§e§lBlocos frágeis! §r§7Não fique parado: o bloco sob seus pés some.";

/** @param {number} vivos @param {number} kills @param {string} tempo @param {number} prox @param {string} extra */
export const PF_BARRA = (vivos, kills, tempo, prox, extra) => `§fVivos: §e${vivos}  §fAbates: §c${kills}  §fTempo: §7${tempo}  §fItem em: §b${prox}s${extra ? `  ${extra}` : ""}`;
/** @param {number} nivel */
export const PF_BARRA_LAVA = (nivel) => `§cLava: y ${nivel}`;
