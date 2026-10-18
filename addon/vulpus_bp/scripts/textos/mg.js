// @ts-check
// Textos dos minigames (plataforma, guarda-volumes e Skywars).

export const NOME_JOGO = "Skywars";
export const TITULO = "Minigames";
export const CMD_MINIGAMES = "Abre os minigames (Skywars e outros)";
export const CMD_SAIR = "Sai da partida de minigame em que você está (e recebe suas coisas de volta)";

// ----------------------------------------------------------------------------------- estados
/** @type {Record<string, string>} */
export const ESTADOS = {
  ocioso: "§cfechado §7(a arena ainda não foi construída)",
  espera: "§aesperando jogadores",
  contagem: "§econtagem para começar",
  jogando: "§6partida em andamento",
  fim: "§dterminando",
  reset: "§7preparando a arena",
};

// ----------------------------------------------------------------------------------- entrar e sair
export const SEM_DIMENSAO = "§cA dimensão dos minigames não está disponível neste mundo (precisa das APIs Beta ligadas). Avise a staff.";
export const DESLIGADO = "§7Os minigames estão descansando no momento.";
export const JA_DENTRO = "§cVocê já está em um minigame.";
export const EM_COMBATE = "§cVocê está em combate. Espere acabar para entrar.";
export const SO_NO_MUNDO = "§cSaia da masmorra e de outras dimensões antes de entrar em um minigame.";
export const CHEIO = "§cA partida está cheia.";
export const EM_ANDAMENTO = "§cA partida já começou. Tente de novo em instantes.";
export const ARENA_PREPARANDO = "§cA arena está sendo preparada. Tente de novo em instantes.";
export const ARENA_FECHADA = "§cA arena ainda não foi construída. Avise a staff.";
export const ESPERA_SAIDA = (/** @type {number} */ s) => `§cVocê saiu de uma partida há pouco. Espere ${s}s para entrar de novo.`;
export const GUARDANDO = "§7Guardando suas coisas em segurança...";
export const COFRE_FALHOU = (/** @type {string} */ motivo) => `§cNão consegui guardar suas coisas (${motivo}). Nada foi mexido.`;
export const ENTROU = (/** @type {number} */ n, /** @type {number} */ min, /** @type {number} */ max) => `§aVocê entrou no Skywars! §7Jogadores: §f${n}§7/${max} (mínimo ${min}). Suas coisas estão guardadas e voltam quando você sair.`;
export const ENTROU_AVISO = (/** @type {string} */ nome, /** @type {number} */ n, /** @type {number} */ max) => `§e${nome} §7entrou no Skywars (${n}/${max}).`;
export const SAIU_AVISO = (/** @type {string} */ nome, /** @type {number} */ n, /** @type {number} */ max) => `§7${nome} saiu do Skywars (${n}/${max}).`;
export const VOLTOU = "§aSuas coisas voltaram para você. Até a próxima!";
export const SAIR_CONFIRMA = "Sair da partida agora? Se ela já começou, você é eliminado e perde o que estava com você na arena. Suas coisas de antes voltam.";
export const NAO_ESTA = "§7Você não está em nenhum minigame.";
export const TP_BLOQUEADO = "§cVocê está em um minigame. Use §f/vulpus:sairminigame§c para sair antes.";
export const RECUPERANDO = "§7Você saiu no meio de um minigame. Devolvendo suas coisas...";
export const FORA_DA_PARTIDA = "§cVocê já não faz parte dessa partida. Suas coisas foram devolvidas.";

// ----------------------------------------------------------------------------------- contagem e partida
export const CONTAGEM_INICIA = (/** @type {number} */ s) => `§eA partida começa em §f${s}§e segundos.`;
export const CONTAGEM_CANCELADA = "§cJogadores insuficientes: a contagem foi cancelada.";
export const TITULO_CONTAGEM = (/** @type {number} */ s) => `§e${s}`;
export const TITULO_VAI = "§a§lVALENDO!";
export const SUB_VAI = "§7Último de pé vence. Boa sorte!";
export const AVISO_ILHAS = "§7Indo para as ilhas...";
export const ABRE_BAUS = "§7Os baús do centro têm os melhores itens.";
export const BORDA_COMECA = "§c§lA borda está fechando! §r§7Vá para o centro.";
export const BORDA_BARRA = (/** @type {number} */ r) => `§cBorda: ${r} blocos`;
/**
 * @param {number} vivos
 * @param {number} kills
 * @param {string} tempo
 * @param {string} borda
 */
export const BARRA_JOGO = (vivos, kills, tempo, borda) => `§fVivos: §e${vivos}  §fAbates: §c${kills}  §fTempo: §7${tempo}${borda ? `  ${borda}` : ""}`;
export const ELIMINADO = (/** @type {string} */ nome, /** @type {string} */ como) => `§c${nome} §7${como}`;
export const COMO_VAZIO = "caiu no vazio.";
export const COMO_DESISTIU = "desistiu.";
export const COMO_SAIU = "saiu da partida.";
export const COMO_BORDA = "ficou fora da borda.";
export const COMO_LAVA = "derreteu na lava.";
export const COMO_MORTO = "morreu.";
export const COMO_MATOU = (/** @type {string} */ quem) => `foi eliminado por §f${quem}§7.`;
export const TITULO_ELIMINADO = "§c§lEliminado";
export const SUB_ELIMINADO = (/** @type {number} */ pos) => `§7Você ficou em §f${pos}º§7 lugar. Assista até o fim ou use /vulpus:sairminigame.`;
export const TITULO_VENCEU = "§6§lVITÓRIA!";
export const SUB_VENCEU = "§7Você foi o último de pé.";
export const ANUNCIO_VENCEDOR = (/** @type {string} */ nome) => `§6§l✦ ${nome} §r§6venceu o Skywars! ✦`;
export const EMPATE = "§7A partida terminou sem vencedor.";
export const ENCERRADA_STAFF = "§cA partida foi encerrada pela staff. Suas coisas voltaram.";
export const VOLTANDO = "§7Voltando para o hub em instantes...";

// ----------------------------------------------------------------------------------- prêmios
export const PREMIO = (/** @type {number} */ caudas, /** @type {string} */ motivo) => `§6+${caudas} Caudas §7(${motivo})`;
export const MOTIVO_VITORIA = "vitória no Skywars";
export const MOTIVO_ABATES = "abates no Skywars";
export const SEM_PREMIO_POUCOS = (/** @type {number} */ min) => `§7Sem prêmio nesta partida: precisa de pelo menos ${min} jogadores.`;
export const SEM_PREMIO_CURTA = "§7Sem prêmio: a partida foi curta demais.";
export const SEM_PREMIO_TETO = "§7Você já atingiu o teto de Caudas dos minigames de hoje.";
export const SEM_PREMIO_ESPERA = (/** @type {number} */ s) => `§7Sem prêmio agora: o último prêmio foi há pouco (espere ${s}s entre prêmios).`;

// ----------------------------------------------------------------------------------- menu do jogador
export const BOTAO_ENTRAR = "Entrar nos minigames";
export const BOTAO_VOTAR = "Votar no jogo";
export const BOTAO_SAIR = "Sair da partida";
export const BOTAO_RANKING = "Rankings";
export const BOTAO_COMO = "Como funciona";
/**
 * @param {string} estado
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @param {number} seg
 * @param {string} meus
 */
export const CORPO_MENU = (estado, n, min, max, seg, meus) =>
  [
    "§7Um campo à parte, com regras próprias. Quando você entra, o que está com você fica guardado num cofre e volta quando você sai.",
    "",
    `§fMinigames: ${estado}`,
    `§fJogadores: §e${n}§7/${max} §8(mínimo ${min})${seg > 0 ? `  §7começa em §f${seg}s` : ""}`,
    meus,
  ].join("\n");
export const MEUS = (/** @type {number} */ v, /** @type {number} */ j, /** @type {number} */ k) => `§fSuas marcas: §e${v}§7 vitórias · §e${j}§7 partidas · §c${k}§7 abates`;
export const RANKING_TITULO = "Rankings";
export const RANKING_VAZIO = "§7Ninguém venceu ainda. Seja o primeiro!";
export const RANKING_LINHA = (/** @type {number} */ pos, /** @type {string} */ nome, /** @type {number} */ v, /** @type {number} */ k) => `§7${pos}. §f${nome} §8» §e${v} vitórias §7(${k} abates)`;
export const COMO_TITULO = "Como funcionam os minigames";
export const COMO_TEXTO = [
  "§6Entrar:§7 suas coisas (inventário, armadura, XP) ficam guardadas num cofre. Você espera no hub, onde pode §bvotar no jogo§7 (Skywars, Bedwars, Pillars of Fortune ou The Bridge), nas opções (tipo de baú, itens, ritmo dos geradores) e escolher o §bkit§7. Quando o mínimo de jogadores chega, uma espera de cerca de 1 minuto começa; com a partida cheia ela encurta.",
  "",
  "§6O mapa§7 é sorteado entre vários, cada um com um tema e um jeito de esconder os baús.",
  "",
  "§6Skywars:§7 cada um nasce numa ilha, numa gaiola. Procure os baús escondidos (enterrados, em cabanas, em pilhas de feno, no oco de troncos e dentro da pirâmide do centro, que tem o baú lendário). Os baús são reabastecidos de tempos em tempos (suprimentos, equipamento, tudo). Faça pontes e derrube os outros no vazio. A borda fecha com o tempo.",
  "",
  "§6Bedwars:§7 times de até 2. Defenda a sua cama, junte ferro e ouro, compre equipamento na loja (a esmeralda ou a bancada) e, com diamantes, §bmelhorias do time§7 (Afiação, Proteção, Forja, Pressa...) e §barmadilhas§7 para a sua ilha. Destrua as camas dos outros: sem cama, quem morre sai da partida. Os geradores do meio melhoram com o tempo e aos 20 minutos todas as camas somem.",
  "",
  "§6Pillars of Fortune:§7 cada um começa no topo de um pilar altíssimo e recebe itens aleatórios de tempos em tempos (comida inclusa). Use o que vier para sobreviver, derrube os outros e não caia: o último vivo vence. Vote o modo (normal, equilibrado, embaralhado, trocador) e o mapa (lava subindo, blocos frágeis).",
  "",
  "§6The Bridge:§7 dois times em duas pontas de uma ponte sobre o vazio. Entre no poço do time inimigo para marcar; a cada ponto todo mundo volta às gaiolas. Mortes só mandam você de volta para a base. Vence quem fizer a meta votada (3, 5 ou 10 pontos). Escolha o seu kit no hub.",
  "",
  "§6Sair no meio§7 conta como derrota, e você fica um tempo sem poder entrar de novo. Suas coisas sempre voltam, mesmo se o jogo ou o servidor cair.",
  "",
  "§6Enquanto está num minigame§7 não dá para usar /home, /tpa, /spawn nem os portais.",
].join("\n");

// ----------------------------------------------------------------------------------- staff
export const BOTAO_STAFF = "Minigames (staff)";
export const TITULO_STAFF = "Minigames (staff)";
/** @param {string} diag */
export const CORPO_STAFF = (diag) => `§7Constrói e cuida da dimensão dos minigames. A arena do Skywars é gerada por script e refeita depois de cada partida.\n\n${diag}`;
export const BOTAO_CONSTRUIR = "Construir hub, cofres e arena";
export const BOTAO_ARENA = "Reconstruir só a arena";
export const BOTAO_IR_HUB = "Ir ao hub";
export const BOTAO_IR_ARENA = "Ir à arena";
export const BOTAO_FORCAR = "Forçar o início agora";
export const BOTAO_ENCERRAR = "Encerrar a partida (sem prêmio)";
export const BOTAO_DEVOLVER = "Devolver as coisas de todos os que estão presos";
export const BOTAO_CONFIG = "Configurações dos minigames";
export const CONFIRMAR_CONSTRUIR = "Construir o hub, os cofres e a arena na dimensão dos minigames? Isso substitui o que existir nessas áreas (só na dimensão dos minigames).";
export const CONSTRUINDO = "§7Construindo... acompanhe a barra. Pode levar alguns segundos.";
export const CONSTRUIDO = "§aHub, cofres e arena prontos!";
export const ARENA_PRONTA = "§aArena pronta para a próxima partida.";
export const FALHA_CONSTRUCAO = (/** @type {string} */ m) => `§cA construção falhou: ${m}`;
export const AREA_NAO_CARREGOU = "as áreas da dimensão não carregaram a tempo";
export const OCUPADO = "§cJá existe uma construção ou partida em andamento.";
export const NADA_PARA_FORCAR = "§cNão há jogadores esperando.";
export const FORCADO = "§aInício forçado.";
export const ENCERRADO = "§aPartida encerrada.";
export const DEVOLVIDOS = (/** @type {number} */ n) => `§a${n} pessoa(s) tiveram as coisas devolvidas.`;
export const NINGUEM_PRESO = "§7Ninguém online está com coisas guardadas fora de uma partida.";
export const DIAGNOSTICO = (/** @type {Record<string, string | number | boolean>} */ d) =>
  [
    `§fDimensão registrada: ${d.registrada ? "§asim" : "§cnão"}${d.erro ? ` §8(${d.erro})` : ""}`,
    `§fDimensão acessível: ${d.pronta ? "§asim" : "§cnão"}`,
    `§fHub e cofres construídos: ${d.hub ? "§asim" : "§cnão"}`,
    `§fArena pronta: ${d.arena ? "§asim" : "§cnão"}`,
    `§fCofres em uso: §e${d.cofres}§7/${d.capacidade}`,
    `§fEstado da partida: §e${d.estado}  §7jogadores: §e${d.jogadores}`,
  ].join("\n");

// ----------------------------------------------------------------------------------- mundo
export const TITULO_HUB = "§b§l✦ SKYWARS ✦";
export const SUBTITULO_HUB = "§7Esperando jogadores...";
export const PLACA_SAIR = "§7/vulpus:sairminigame para sair";

// ----------------------------------------------------------------------------------- portal do lobby
export const PORTAL_TITULO = "§b§l✦ PORTAL DOS MINIGAMES ✦\n§7Skywars e outros jogos\n§8suas coisas ficam guardadas até você sair";
export const PORTAL_COM_COISAS = "§cPara entrar por aqui, esvazie o inventário, a armadura e a mão secundária (guarde tudo num baú). Ou entre pelo menu: Miscelânea > Minigames, que guarda suas coisas para você.";
export const PORTAL_OLHE = "§cOlhe para o bloco onde o portal vai ficar (até 12 blocos).";
export const PORTAL_POSTO = (/** @type {string} */ c) => `§aPortal dos minigames posto em §e${c}§a.`;
export const PORTAL_LIMITE = (/** @type {number} */ n) => `§cO limite é de ${n} portais.`;
export const PORTAL_REMOVIDOS = "§aPortais dos minigames removidos.";
export const BOTAO_PORTAL_POR = "Pôr o portal no bloco que estou olhando";
export const BOTAO_PORTAL_TIRAR = "Tirar os portais do lobby";
export const PORTAIS_POSTOS = (/** @type {number} */ n) => `§fPortais no lobby: §e${n}`;
export const SAIDA_TITULO = "§6§l✦ SAÍDA ✦\n§7Volte ao lobby com tudo o que é seu";
export const SAIDA_NADA = "§7Você não estava em nenhuma partida: voltei você ao spawn.";
