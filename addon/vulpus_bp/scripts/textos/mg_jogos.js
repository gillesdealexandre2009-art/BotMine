// @ts-check
// Textos novos dos minigames: votação, hotbar do hub, Bedwars, resumo da partida.

// ----------------------------------------------------------------------------------- hub e votação
export const ITEM_VOTAR = "§b§lVotar no jogo §r§7(use)";
export const ITEM_SAIR = "§c§lSair do minigame §r§7(use)";
export const TITULO_VOTACAO = "Votação do jogo";
/** @param {string} jogos */
export const CORPO_VOTACAO = (jogos) => `§7O jogo mais votado vence; empate é sorteado. Você pode mudar o voto até a contagem final. O mapa é sorteado.\n\n${jogos}`;
/** @param {string} nome @param {string} desc @param {number} votos @param {boolean} meu */
export const LINHA_JOGO = (nome, desc, votos, meu) => `${meu ? "§a✔ " : "§f"}§l${nome}§r §8- §e${votos} voto${votos === 1 ? "" : "s"}\n§7${desc}`;
/** @param {string} nome @param {number} votos @param {boolean} meu */
export const BOTAO_VOTO = (nome, votos, meu) => `${meu ? "§a✔ " : ""}${nome} §8(${votos})`;
/** @param {string} nome */
export const VOTOU = (nome) => `§aVoto registrado: §f${nome}§a.`;
export const VOTACAO_FECHADA = "§cA votação já fechou: o jogo da partida foi escolhido.";
export const SEM_PARTIDA_PARA_VOTAR = "§7Entre na fila para votar.";
/** @param {string} jogo @param {string} mapa @param {number} votos */
export const JOGO_ESCOLHIDO = (jogo, mapa, votos) => `§b§l${jogo} §r§7em §f${mapa} §8(${votos} voto${votos === 1 ? "" : "s"})`;
export const TITULO_ESCOLHIDO = (/** @type {string} */ jogo) => `§b§l${jogo}`;
export const SUB_ESCOLHIDO = (/** @type {string} */ mapa) => `§7Mapa: §f${mapa}`;
/** @param {number} seg @param {number} n @param {number} min @param {number} max @param {string} votos */
export const BARRA_ESPERA = (seg, n, min, max, votos) => `§7Começa em §f${seg}s  §8| §7Jogadores §f${n}§7/${max}  §8| ${votos}`;
/** @param {number} n @param {number} min @param {number} max @param {string} votos */
export const BARRA_AGUARDANDO = (n, min, max, votos) => `§7Aguardando jogadores §f${n}§7/${max} §8(mínimo ${min})  §8| ${votos}`;
/** @param {string} nome @param {number} v */
export const VOTOS_LINHA = (nome, v) => `§b${nome} §f${v}`;
export const DICA_VOTAR = "§7Use a §bestrela§7 da hotbar para votar no jogo, nas opções e escolher o seu kit; o §citem vermelho§7 sai.";
export const CHEIO_ENCURTA = (/** @type {number} */ s) => `§aPartida cheia! Começando em §f${s}§a segundos.`;

// ----------------------------------------------------------------------------------- resumo
export const RESUMO_TITULO = "§6§l──── Resumo da partida ────";
export const RESUMO_VENCEDOR = (/** @type {string} */ nomes) => `§6Vencedor: §f${nomes}`;
export const RESUMO_TOP = (/** @type {number} */ pos, /** @type {string} */ nome, /** @type {number} */ kills) => `§7${pos}. §f${nome} §8» §c${kills} abate${kills === 1 ? "" : "s"}`;
export const RESUMO_DURACAO = (/** @type {string} */ t) => `§7Duração: §f${t}`;

// ----------------------------------------------------------------------------------- Bedwars
export const BW_DESC = "Times de até 2. Defenda a cama, junte ferro e ouro, compre equipamento, melhorias do time e armadilhas com diamantes, e destrua as camas dos outros. Sem cama, quem morre sai da partida; aos 20 minutos todas as camas somem.";
export const SW_DESC = "Cada um numa ilha: escolha um kit, ache os baús escondidos (e o lendário do centro), faça pontes e derrube os outros no vazio. Os baús são reabastecidos; a borda fecha. Último de pé vence.";
/** @param {string} cor @param {string} nome */
export const BW_VOCE_TIME = (cor, nome) => `§fVocê é do time ${cor}§l${nome}`;
export const BW_TITULO_TIME = (/** @type {string} */ cor, /** @type {string} */ nome) => `${cor}§lTime ${nome}`;
export const BW_SUB_TIME = "§7Defenda a sua cama!";
/** @param {string} cor @param {string} nome */
export const BW_CAMA_QUEBRADA = (cor, nome) => `§c§l✦ A cama do time ${cor}${nome} §r§c§lfoi destruída! ✦`;
export const BW_SUA_CAMA = "§c§lSUA CAMA FOI DESTRUÍDA! §r§7Agora você não renasce mais.";
export const BW_CAMA_PROPRIA = "§cVocê não pode quebrar a própria cama.";
export const BW_SO_SEUS_BLOCOS = "§cAqui só dá para quebrar o que os jogadores colocaram (e as camas dos outros).";
/** @param {number} s */
export const BW_RENASCE = (s) => `§eRenascendo em §f${s}`;
export const BW_TITULO_MORREU = "§c§lVocê morreu";
export const BW_TITULO_ELIMINADO = "§c§lSem cama, sem volta";
export const BW_TIME_ELIMINADO = (/** @type {string} */ cor, /** @type {string} */ nome) => `§c${cor}§lTime ${nome} §r§cfoi eliminado!`;
export const BW_LOJA_ITEM = "§a§lLoja §r§7(use)";
export const BW_LOJA_TITULO = "Loja do Bedwars";
export const BW_LOJA_CORPO = (/** @type {number} */ ferro, /** @type {number} */ ouro, /** @type {number} */ diamante, /** @type {number} */ esmeralda) => `§7Você tem: §f${ferro} ferro §8| §6${ouro} ouro §8| §b${diamante} diamante §8| §a${esmeralda} esmeralda`;
export const BW_SEM_MOEDA = (/** @type {string} */ preco) => `§cVocê precisa de ${preco}.`;
export const BW_COMPROU = (/** @type {string} */ nome) => `§aComprou: §f${nome}§a.`;
export const BW_JA_TEM = "§7Você já tem uma armadura igual ou melhor.";
export const BW_BARRA = (/** @type {string} */ time, /** @type {string} */ camas, /** @type {number} */ kills, /** @type {string} */ tempo) => `${time}  §8| ${camas}  §8| §fAbates: §c${kills}  §8| §7${tempo}`;
export const BW_CAMA_OK = "§aCama ✔";
export const BW_CAMA_SEM = "§cCama ✘";
export const BW_CAMAS_VIVAS = (/** @type {string} */ lista) => `Camas: ${lista}`;
export const BW_RESUMO_CAMAS = (/** @type {number} */ n) => `§7Camas destruídas por você: §f${n}`;
export const BW_EVENTO_DIAMANTE = "§b§lOs geradores de diamante estão ativos!";
export const BW_EVENTO_ESMERALDA = "§a§lA esmeralda do centro está ativa!";

export const NO_HUB_DEPOIS = "§7Você continua no hub: vote no próximo jogo ou saia pelo §fitem vermelho§7, pelo portal ou com §f/vulpus:sairminigame§7.";

// ---------------------------------------------------------------- opções de votação e kits
/** @param {string} jogo */
export const TITULO_OPCOES = (jogo) => `Opções: ${jogo}`;
export const CORPO_OPCOES = "§7Vote no jeito de jogar. A opção mais votada vale para a partida; sem votos, vale o padrão.";
/** @param {string} jogo */
export const BOTAO_OPCOES = (jogo) => `Opções do ${jogo}`;
/** @param {string} jogo @param {string} atual */
export const BOTAO_KITS = (jogo, atual) => `Kit do ${jogo}\n§7${atual}`;
/** @param {string} jogo */
export const TITULO_KITS = (jogo) => `Kits: ${jogo}`;
/** @param {string} atual */
export const CORPO_KITS = (atual) => `§7Escolha o kit com que você começa a partida. Kit atual: §f${atual}`;
/** @param {string} cat @param {string} opcao */
export const VOTOU_OPCAO = (cat, opcao) => `§aVoto registrado em §f${cat}§a: §f${opcao}§a.`;
/** @param {string} nome */
export const KIT_ESCOLHIDO = (nome) => `§aKit escolhido: §f${nome}§a.`;
export const KIT_FECHADO = "§cA partida já começou: o kit não muda mais.";
/** @param {string} texto */
export const OPCOES_ESCOLHIDAS = (texto) => `§7Opções da partida: ${texto}`;

// ---------------------------------------------------------------- Skywars: kits e reabastecimento
export const SW_REFILL_AVISO = "§e§lOs baús vão ser reabastecidos em 10 segundos!";
/** @type {Record<string, string>} */
export const SW_FASES = { suprimento: "suprimentos (blocos, comida, projéteis)", equipamento: "equipamento (armas e armaduras)", geral: "tudo" };
/** @param {string} fase */
export const SW_REFILL = (fase) => `§6§lBaús reabastecidos §r§7com ${fase}. O baú lendário do centro não volta.`;
export const SW_PEROLA = "§5Você ganhou uma pérola do Ender.";
/** @param {string} kit */
export const SW_KIT = (kit) => `§7Seu kit: §f${kit}§7.`;

// ---------------------------------------------------------------- Bedwars: melhorias, armadilhas e eventos
export const BW_MELHORIAS_TITULO = "Melhorias do time";
/** @param {number} diamantes */
export const BW_MELHORIAS_CORPO = (diamantes) => `§7Valem para o time todo e continuam nas próximas vidas. Você tem §b${diamantes} diamantes§7.`;
export const BW_ARMADILHAS_TITULO = "Armadilhas da base";
/** @param {string} fila @param {number} custo @param {number} max @param {number} diamantes */
export const BW_ARMADILHAS_CORPO = (fila, custo, max, diamantes) => `§7Disparam sozinhas quando um inimigo chega à sua ilha (uma por vez, em ordem).\n§fFila: §e${fila} §8(máx. ${max})\n§7A próxima custa §b${custo} diamante${custo > 1 ? "s" : ""}§7. Você tem §b${diamantes}§7.`;
export const BW_BOTAO_MELHORIAS = "Melhorias do time";
export const BW_BOTAO_ARMADILHAS = "Armadilhas da base";
export const BW_MELHORIA_MAXIMA = "§7Essa melhoria já está no nível máximo.";
export const BW_FILA_CHEIA = "§cA fila de armadilhas está cheia.";
/** @param {string} quem @param {string} nome @param {string} efeito */
export const BW_MELHORIA_COMPRADA = (quem, nome, efeito) => `§b§l${quem} §r§acomprou §f${nome}§a: §7${efeito}`;
/** @param {string} quem @param {string} nome @param {number} n */
export const BW_ARMADILHA_COMPRADA = (quem, nome, n) => `§b§l${quem} §r§acomprou a armadilha §f${nome} §7(${n} na fila)`;
export const BW_PISOU_ARMADILHA = "§c§lVocê pisou numa armadilha!";
export const BW_ARMADILHA_DISPAROU = "§c§lARMADILHA!";
/** @param {string} nome */
export const BW_ARMADILHA_SUB = (nome) => `§7${nome} disparou na sua base`;
/** @param {number} n */
export const BW_GER_DIAMANTE = (n) => `§b§lGeradores de diamante nível ${n}! §r§7Mais diamantes no meio.`;
/** @param {number} n */
export const BW_GER_ESMERALDA = (n) => `§a§lGeradores de esmeralda nível ${n}! §r§7Mais esmeraldas no centro.`;
export const BW_CAMAS_SUMIRAM = "§c§lMORTE SÚBITA! §r§cTodas as camas foram destruídas. Quem morrer agora não volta mais.";
export const BW_TITULO_MORTE_SUBITA = "§4§lMORTE SÚBITA";
export const BW_SUB_MORTE_SUBITA = "§cAs camas acabaram!";

// ---------------------------------------------------------------- scoreboard lateral dos minigames (até 28 caracteres visíveis por linha)
export const HUD_TITULO = "§b§lMINIGAMES";
/** @param {number} n @param {number} min @param {number} max */
export const HUD_JOGADORES = (n, min, max) => `§7Jogadores §f${n}§7/§f${max} §8(mín. ${min})`;
/** @param {number} seg */
export const HUD_INICIO = (seg) => `§7Começa em §e${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, "0")}`;
/** @param {number} faltam */
export const HUD_AGUARDANDO = (faltam) => `§7Faltam §f${faltam} §7para começar`;
export const HUD_VOTE = "§7Vote com a §bestrela";
/** @param {string} nome @param {number} votos @param {boolean} meu */
export const HUD_VOTO = (nome, votos, meu) => `${meu ? "§a✔ " : "§b"}${nome} §f${votos}`;
/** @param {string} nome */
export const HUD_JOGO = (nome) => `§7Jogo §b${nome}`;
/** @param {string} nome */
export const HUD_MAPA = (nome) => `§7Mapa §f${nome}`;
/** @param {number} vivos @param {number} kills @param {string} tempo */
export const HUD_GERAL = (vivos, kills, tempo) => [`§7Vivos §f${vivos}`, `§7Abates §c${kills}`, `§7Tempo §f${tempo}`];
