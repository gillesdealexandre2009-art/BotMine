// @ts-check
// Textos do painel da staff.

export const TITULO = "Staff";
/** @param {{ versao: string, online: number, registrados: number, spawnDefinido: boolean }} info */
export const CORPO = ({ versao, online, registrados, spawnDefinido }) =>
  [
    `§7Vulpus §f${versao}`,
    `§7Online agora: §f${online}`,
    `§7Raposas registradas: §f${registrados}`,
    `§7Spawn: ${spawnDefinido ? "§adefinido pela staff" : "§epadrão do mundo"}`,
  ].join("\n");

export const BOTAO_SPAWN = "Definir spawn aqui";
export const BOTAO_CONFIG = "Configurações";
export const BOTAO_DAR = "Dar Caudas";
export const BOTAO_CARGOS = "Cargos e Kitsune";
export const BOTAO_LEILAO = "Leilão (staff)";
export const BOTAO_CLAS = "Clãs (staff)";
export const BOTAO_CACADA = "Caçada (staff)";
export const BOTAO_LOBBY = "Lobby e portal (staff)";
export const BOTAO_COMUNIDADE = "Canto comunitário (staff)";
export const GRUPO_RTP = "RTP e barreira";
export const BOTAO_ITEM = "Pegar item do menu";
export const BOTAO_DONO = "Painel de Dono";

// Categorias do painel.
export const BOTAO_ECONOMIA = "Economia";
export const BOTAO_FEIRA = "Feira e minigames";
export const BOTAO_MUNDO = "Mundo e locais";
export const BOTAO_OBRAS = "Obras: montanha e masmorra";
export const BOTAO_CLAS_GUERRAS = "Clãs e guerras";
export const TITULO_ECONOMIA = "Economia (staff)";
export const CORPO_ECONOMIA = "§7Caudas, XP e o Leilão.";
export const TITULO_MUNDO = "Mundo e locais (staff)";
export const CORPO_MUNDO = "§7Spawn, lobby, zonas de música, portal, teleportes e o canto comunitário.";
export const TITULO_CLAS_GUERRAS = "Clãs e guerras (staff)";
export const CORPO_CLAS_GUERRAS = "§7Clãs, guerras e a Caçada de cabeças.";
export const TITULO_FEIRA = "Feira e minigames (staff)";
export const CORPO_FEIRA = "§7Barracas, jogos, arenas e decoração da feira do lobby. Cada um tem as próprias configurações.";
export const SECAO_APOSTAS = "Barracas de aposta";
export const SECAO_JOGOS = "Jogos e arenas";
export const SECAO_DECORACAO = "Decoração e eventos";
export const SECAO_CONFIGS = "Configurações";
/** @param {string} nome */
export const BOTAO_CONFIG_DE = (nome) => `Configurações: ${nome}`;

export const TITULO_CONFIG = "Configurações do Vulpus";
export const CONFIG_ESCOLHA = "§7O que você quer ajustar? (cada categoria também tem as suas configurações no próprio painel)";
export const GRUPO_TELEPORTE = "Teleporte e casas";
export const GRUPO_CAUDAS = "Caudas e XP";
export const GRUPO_LEILAO = "Leilão";
export const GRUPO_CLAS = "Clãs e guerras";
export const GRUPO_CACADA = "Caçada";
export const GRUPO_QUIOSQUE = "Quiosque da Kiza";
export const GRUPO_ARG = "Mistério da Vulpus";
export const GRUPO_VINCULO = "Vínculo com o Discord e ponte do chat";
export const GRUPO_PEGADINHAS = "Pegadinhas";
export const GRUPO_ABATE = "Efeitos de abate";
export const GRUPO_PORTAIS = "Portais da masmorra";
export const GRUPO_PAINEL_LOBBY = "Painéis e ambiente do lobby";
export const GRUPO_NOVATO = "Primeiros passos (novatos)";
export const GRUPO_AVENTURA = "Quests da Yuki";
export const GRUPO_PETS = "Pets e cápsulas";
export const GRUPO_MINIGAMES = "Minigames (Skywars e Bedwars)";
export const GRUPO_XRAY = "Detecção de xray";
export const GRUPO_MUSICA = "Música e sons de ambiente";
export const GRUPO_FLOR = "Flor dourada";
export const GRUPO_INAUGURACAO = "Evento de inauguração";
export const GRUPO_TORRE = "Torre da Vulpus";
export const GRUPO_COPOS = "Jogo do copo";
export const GRUPO_ROLETA = "Roleta";
export const GRUPO_CORRIDA = "Corrida de raposas";
export const GRUPO_PESCA = "Pescaria";
export const GRUPO_FORCA = "Teste de força";
export const GRUPO_TIRO = "Tiro ao alvo";
export const GRUPO_MOEDA = "Cara ou coroa";
export const GRUPO_MESAS = "Mesas de jogo";
export const GRUPO_COMUNIDADE = "Canto comunitário";
export const GRUPO_ERAS = "Eras";
export const GRUPO_HOLLOW = "Evento Hollow (Halloween)";
export const BOTAO_HOLLOW = "Evento Hollow";
export const GRUPO_LIMPEZA = "Limpeza automática";
export const GRUPO_KITSUNE = "Kitsune: extras de estilo";
export const GRUPO_GERAL = "Geral";
/** Rótulos dos campos de configuração (as chaves são as de PADROES). */
export const CAMPOS = {
  esperaTeleporte: "Espera sem se mexer antes do teleporte (s)",
  recargaTeleporte: "Recarga entre teleportes (s)",
  protecaoSpawnRaio: "Proteção do spawn: raio em volta do spawn marcado (blocos; 0 = desligada). Dentro: sem quebrar, construir ou mexer em armaduras e molduras",
  rtpMinimo: "RTP: distância mínima do centro (blocos)",
  rtpMaximo: "RTP: distância máxima do centro (blocos)",
  rtpAltura: "RTP: altura (Y) de onde você cai",
  limiteMundo: "Barreira do mundo: distância máxima do centro (blocos)",
  combateSegundos: "Tempo em combate depois de um golpe (s)",
  tpaExpira: "Pedido de TPA expira em (s)",
  limiteCasas: "Limite de casas por pessoa",
  caudasPorIntervalo: "Caudas por tempo jogado",
  intervaloCaudasMin: "Minutos ativos para ganhar essas Caudas",
  diariaBase: "Diária: valor base",
  diariaBonusDia: "Diária: bônus por dia seguido",
  diariaBonusMax: "Diária: máximo de dias com bônus",
  linkDiscord: "Link do Discord (vazio = sem link)",
  hudPadrao: "Scoreboard lateral ligada para quem não escolheu",
  erasTinta: "Tinta de cor na tela durante as Eras (precisa do placar ligado; confira o visual antes de deixar ligada)",
  xpPorMinuto: "XP por minuto ativo",
  xpDiaria: "XP da diária",
  temaAnimadoNivel: "Nível mínimo (com Kitsune) para as cores de nome animadas",
  leilaoLigado: "Leilão aberto",
  taxaAnuncioPct: "Leilão: taxa para anunciar (%)",
  taxaVendaPct: "Leilão: taxa da venda (%)",
  precoMinimo: "Leilão: preço mínimo",
  precoMaximo: "Leilão: preço máximo",
  anunciosPorJogador: "Leilão: anúncios por pessoa",
  duracaoAnuncioHoras: "Leilão: duração do anúncio (h)",
  caixaLimite: "Leilão: itens na caixa de retirada",
  custoCriarCla: "Clã: Caudas para criar",
  claXpPorMinuto: "Clã: XP por minuto ativo de cada membro",
  claCaudasPorXp: "Clã: Caudas depositadas para 1 XP",
  custoCasaCla: "Clã: Caudas do banco por casa do clã",
  distanciaSpawnBase: "Base: distância mínima da borda até o spawn",
  custoMoverBase: "Base: custo para mover (nível 1)",
  aumentoMoverBasePct: "Base: aumento do custo de mover por nível (%)",
  recargaMoverBaseHoras: "Base: espera entre mudanças (h)",
  zonaAmortecimento: "Base: zona de amortecimento (blocos)",
  custoGuerra: "Guerra: Caudas de cada clã no baú",
  guerraNivelMinimo: "Guerra: nível mínimo dos dois clãs",
  guerraMembrosMinimos: "Guerra: pessoas mínimas em cada clã",
  guerraAvisoMin: "Guerra: aviso antes de começar (min)",
  duracaoGuerraHoras: "Guerra: duração (h)",
  recargaGuerraDias: "Guerra: trégua entre o mesmo par (dias)",
  guerraAntiFarmMin: "Guerra: a mesma vítima só vale ponto a cada (min)",
  guerraBonusSequencia: "Guerra: pontos extras por 3, 5 e 10 abates seguidos",
  guerraBonusLider: "Guerra: pontos extras pela cabeça do líder (1x por hora)",
  bandeiraDistanciaMax: "Bandeira: distância máxima do centro da base",
  recargaBandeiraHoras: "Bandeira: espera para mover (h)",
  ctfCaptura: "Bandeira: pontos por captura",
  ctfDevolver: "Bandeira: pontos por devolver a própria",
  ctfMatarCarregador: "Bandeira: pontos por derrubar quem leva a sua",
  cacadaLigada: "Caçada aberta (pôr recompensa nova)",
  cacadaMinimo: "Caçada: menor recompensa",
  cacadaMaximo: "Caçada: maior recompensa de uma vez",
  cacadaTaxaPct: "Caçada: taxa sobre o valor (%, some da economia)",
  cacadaLimite: "Caçada: cabeças pagas por pessoa ao mesmo tempo",
  cacadaVidaMin: "Caçada: vítima viva há pelo menos (min)",
  comLigado: "Canto comunitário ligado",
  comItensPorCauda: "Comunidade: itens doados para ganhar 1 Cauda",
  comDoacaoMaxDia: "Comunidade: máximo de Caudas por doações por dia",
  comDoacaoEsperaSeg: "Comunidade: espera entre doações da mesma pessoa (s)",
  comMetaPremio: "Comunidade: Caudas para cada doador quando a meta fecha",
  comFogueiraSeg: "Fogueira: de quantos em quantos segundos dá XP",
  comFogueiraXp: "Fogueira: XP base a cada rodada (soma mais com mais gente)",
  comFogueiraMaxDia: "Fogueira: máximo de XP por dia",
  comRecadoEsperaMin: "Mural: espera entre recados da mesma pessoa (min)",
  comRecadoMax: "Mural: tamanho máximo do recado (letras)",
  comRecadoHoras: "Mural: horas até o recado sumir",
  comSugestaoEsperaMin: "Sugestões: espera entre sugestões da mesma pessoa (min)",
  mesasLigadas: "Mesas de xadrez e jogo da velha ligadas",
  mesasDecoracao: "Mesas: tabuleiros e almofadas decorativos (props) nas mesas marcadas",
  textoAlcance: "Textos flutuantes (mesas, Cara ou Coroa, canto comunitário): aparecem a até quantos blocos (0 = sempre)",
  mesasVelhaSeg: "Jogo da velha: tempo para cada jogada (s)",
  mesasXadrezMin: "Xadrez: tempo de cada jogador na partida (min)",
  mesasContagemSeg: "Mesas: contagem antes de começar a partida (s)",
  mesasAssentoAlturaCm: "Mesas: altura do assento em centímetros (ajuste se a pessoa ficar alta ou baixa)",
  quiosqueLigado: "Quiosque da Kiza ligado",
  quiosqueFalaSeg: "Quiosque da Kiza: tempo entre as falas dela (s)",
  vinculoObrigatorio: "Vínculo com o Discord obrigatório (sem ele: tela preta e parado). Só vale no servidor com a ponte",
  vinculoSyncSeg: "Vínculo: de quantos em quantos segundos soma Caudas e XP com o Discord (10 a 600)",
  ponteChatLigada: "Ponte do chat ligada (mensagens, entradas e saídas vão e vêm do Discord)",
  proximidadeLigada: "Chat de voz por proximidade: manda ao Discord a posição de quem tem a conta ligada (só com a ponte)",
  argLigado: "Mistério da Vulpus ligado",
  argTentativas: "Mistério: tentativas no terminal antes de travar",
  argEsperaMin: "Mistério: espera depois de errar demais (min)",
  argGlitchPct: "Mistério: intensidade da corrupção do scoreboard (%)",
  xrayLigado: "Detecção de xray ligada (só avisa a staff)",
  xrayMinerios: "Xray: minérios raros (diamante, esmeralda, detritos) na janela para avisar",
  xrayJanelaMin: "Xray: janela de tempo observada (min)",
  xrayPct: "Xray: % mínima de minérios raros entre os blocos quebrados",
  portalEsperaSeg: "Portais da masmorra: espera entre dois usos do mesmo portal (s; a staff não espera)",
  masmLigada: "Masmorra de 5 andares ligada (inimigos, loot, ranking)",
  paineisLigados: "Painéis flutuantes do lobby (rankings, guia, avisos) ligados",
  ambienteLobby: "Ambiente do lobby: pétalas e vaga-lumes em volta de quem passa",
  ambienteDensidade: "Ambiente do lobby: quantidade de partículas (0 a 12)",
  mgLigado: "Minigames ligados (dimensão própria, Skywars)",
  mgMinJogadores: "Minigames: mínimo de jogadores para a contagem começar (1 serve para testar sozinho)",
  mgMaxJogadores: "Minigames: máximo de jogadores por partida (até 8, as ilhas de partida)",
  mgContagemSeg: "Minigames: espera em segundos depois que o mínimo de jogadores chega (a votação do jogo acontece nela)",
  mgCheioSeg: "Minigames: com a partida cheia a espera cai para quantos segundos",
  mgRefillSeg: "Skywars: de quantos em quantos segundos os baús são reabastecidos",
  mgBwCamasSeg: "Bedwars: segundos até todas as camas serem destruídas (morte súbita)",
  mgPilaresSeg: "Pillars of Fortune: de quantos em quantos segundos cada jogador recebe um item",
  mgPilaresLavaSeg: "Pillars of Fortune (lava): segundos para a lava subir um bloco",
  mgBridgeRespawnSeg: "The Bridge: segundos para renascer depois de morrer",
  mgBordaInicioSeg: "Minigames: segundos até a borda começar a fechar",
  mgBordaDuracaoSeg: "Minigames: segundos que a borda leva para fechar até o centro",
  mgDanoBorda: "Minigames: dano por segundo (meio coração = 1) de quem fica fora da borda",
  mgLimiteSeg: "Minigames: tempo máximo da partida em segundos (acaba por abates)",
  mgPremioVitoria: "Minigames: Caudas pela vitória",
  mgPremioKill: "Minigames: Caudas por abate (conta no máximo 5 por partida)",
  mgPremioCama: "Bedwars: Caudas por cama destruída (conta no máximo 3 por partida)",
  mgMinPremio: "Minigames: mínimo de jogadores no começo para pagar prêmio",
  mgCaudasDia: "Minigames: teto de Caudas por pessoa por dia nos minigames",
  mgRecargaPremioSeg: "Minigames: espera mínima entre dois prêmios da mesma pessoa, em segundos",
  mgEsperaSaidaSeg: "Minigames: espera para entrar de novo depois de sair no meio, em segundos",
  petsLigados: "Pets ligados (máquinas de cápsula, pets seguindo e bônus)",
  petCusto: "Pets: preço da cápsula em Caudas (uma ficha vale uma cápsula)",
  petEsperaSeg: "Pets: espera entre duas aberturas de cápsula, em segundos",
  petMaxDia: "Pets: máximo de cápsulas por pessoa por dia",
  petPityRaro: "Pets: garantia de pet raro ou melhor a cada tantas cápsulas",
  petPityLendario: "Pets: garantia de pet lendário a cada tantas cápsulas",
  petKitsuneLote: "Pets: quantas cápsulas o Kitsune abre de uma vez (mesmo preço cada; 1 = desliga)",
  petMaxAtivos: "Pets: quantos pets cada pessoa pode ter seguindo ao mesmo tempo (os bônus somam)",
  petBonusPct: "Pets: força dos bônus em % (100 = padrão; 0 = só visual)",
  questLigada: "Quests diárias da Yuki ligadas (3 por pessoa por dia)",
  questCaudas: "Quests da Yuki: Caudas por quest (a da masmorra paga 1,5x)",
  questXp: "Quests da Yuki: XP por quest (a da masmorra paga 1,5x)",
  questBonus: "Quests da Yuki: bônus em Caudas por entregar as 3 no dia",
  novatoLigado: "Primeiros passos: missões de apresentação para quem chegou agora",
  novatoCaudas: "Primeiros passos: Caudas por missão (paga uma vez por pessoa)",
  novatoBonus: "Primeiros passos: bônus em Caudas ao completar todas (uma vez por pessoa)",
  novatoDias: "Primeiros passos: por quantos dias a pessoa conta como novata",
  masmRaioCredito: "Masmorra: a que distância (blocos) de um inimigo uma pessoa ainda recebe o crédito do abate (só se ela deu dano)",
  masmCreditoSeg: "Masmorra: até quantos segundos depois de bater num inimigo a pessoa ainda recebe o crédito se ele morrer",
  masmDanoPct: "Masmorra: dificuldade dos ataques especiais dos inimigos, em % (60 = padrão; 100 = cheio; o andar 1 já sai mais fraco que o 5)",
  masmCaudasDia: "Masmorra: máximo de Caudas que cada pessoa ganha por dia (0 = nenhuma)",
  abateLigado: "Efeitos de abate dos Kitsune ligados (só visual)",
  hollowLigado: "Evento Hollow ligado",
  hollowInicio: "Evento Hollow: início (ms)",
  hollowFim: "Evento Hollow: fim (ms)",
  hollowCofreCodigo: "Evento Hollow: código do cofre (4 dígitos)",
  hollowKitsuneDias: "Evento Hollow: dias de Kitsune dos 2 primeiros",
  hollowVentoLigado: "Evento Hollow: vento da casa ligado",
  hollowVentoRaio: "Evento Hollow: raio do vento (blocos)",
  hollowVentoEsperaSeg: "Evento Hollow: espera entre ventos (s)",
  limpezaLigada: "Limpeza automática ligada",
  limpezaIntervaloMin: "Limpeza automática: intervalo (min, de 5 a 120)",
  limpezaItens: "Limpeza automática: remover itens soltos",
  limpezaMobs: "Limpeza automática: remover mobs hostis",
  kitsuneChegadaMsg: "Mensagem estilosa no chat quando um Kitsune chega ou sai (só visual; vale para quem deixou o efeito ligado)",
  kitsuneChegadaFx: "Efeito de chegada e saída dos Kitsune ligado (só visual; cada Kitsune ainda pode desligar o dele)",
  abateMaxSimultaneos: "Abates: efeitos ao mesmo tempo no servidor (os que passarem do limite são pulados)",
  abateEsperaSeg: "Abates: espera mínima entre dois efeitos da mesma pessoa (s)",
  pegadinhasLigadas: "Pegadinhas do dono ligadas",
  pegadinhaHerobrineSeg: "Pegadinhas: tempo máximo do Herobrine olhando de longe (s)",
  musicaLigada: "Música dos ambientes ligada (lobby, vila, feira e mistério)",
  musicaVolume: "Música: volume (0 a 100)",
  musicaFadeSeg: "Música: fade de entrada e saída (s), padrão do lobby; os outros ambientes ficam proporcionais",
  musicaPontuaisLigados: "Sons de ambiente pontuais ligados (sinos, gotas, passos, vento...)",
  musicaPontuaisVolume: "Sons de ambiente pontuais: volume (0 a 100)",
  florLigada: "Flor dourada reage a quem chega perto",
  florRaio: "Flor dourada: distância para reagir (blocos, aceita vírgula)",
  florEsperaSeg: "Flor dourada: espera da mesma pessoa para a mesma flor (s)",
  florFalas: "Flor dourada: falas, separadas por | (em ordem, uma por vez)",
  inauguracaoLigada: "Evento de inauguração ligado",
  torreLigada: "Torre da Vulpus ligada",
  torreCaudas: "Torre: prêmio ao chegar no topo (Caudas)",
  torreXp: "Torre: XP ao chegar no topo",
  torrePrimeiraCaudas: "Torre: bônus de primeira vez (Caudas)",
  torrePrimeiraXp: "Torre: bônus de primeira vez (XP)",
  torreRecordeCaudas: "Torre: bônus ao bater o próprio recorde (Caudas)",
  torreEsperaMin: "Torre: espera entre prêmios da mesma pessoa (min)",
  torreMaxDia: "Torre: máximo de prêmios por pessoa por dia",
  torreRaioInicio: "Torre: raio da zona de início (blocos)",
  torreRaioChegada: "Torre: raio da zona de chegada (blocos)",
  torreRaioMax: "Torre: distância máxima do início antes de cancelar a subida (blocos)",
  torreTempoMinSeg: "Torre: tempo mínimo para valer (s; abaixo disso é suspeito)",
  copoLigado: "Jogo do copo ligado",
  copoApostaMin: "Jogo do copo: aposta mínima (Caudas)",
  copoApostaMax: "Jogo do copo: aposta máxima (Caudas)",
  copoPagamentoPct: "Jogo do copo: pagamento de quem acerta (% da aposta; 150 = 1,5x)",
  copoTrocas: "Jogo do copo: quantas trocas os copos fazem (mais = mais difícil)",
  copoTicksTroca: "Jogo do copo: duração de cada troca em ticks (menos = mais rápido e difícil)",
  copoEspacoCm: "Jogo do copo: distância entre os copos (cm)",
  copoEsperaSeg: "Jogo do copo: espera entre rodadas da mesma pessoa (s)",
  copoGanhoMaxDia: "Jogo do copo: lucro máximo por pessoa por dia (Caudas)",
  copoPerdaMaxDia: "Jogo do copo: perda máxima por pessoa por dia (Caudas)",
  roletaLigada: "Roleta ligada",
  roletaCusto: "Roleta: custo de cada giro (Caudas)",
  roletaGiroSeg: "Roleta: duração do giro (s)",
  roletaEsperaSeg: "Roleta: espera entre giros da mesma pessoa (s)",
  roletaGanhoMaxDia: "Roleta: lucro máximo por pessoa por dia (Caudas)",
  roletaPerdaMaxDia: "Roleta: perda máxima por pessoa por dia (Caudas)",
  roletaInverter: "Roleta: inverter o sentido da roda (ligue se a seta parar no número 11 em vez do 3 no teste)",
  roletaAjusteGraus: "Roleta: ajuste da seta, em graus (se ela parar em outro número, mude de 30 em 30)",
  corridaLigada: "Corrida de raposas ligada",
  corridaApostaMin: "Corrida de raposas: aposta mínima (Caudas)",
  corridaApostaMax: "Corrida de raposas: aposta máxima (Caudas)",
  corridaPagamentoPct: "Corrida de raposas: pagamento de quem acerta (% da aposta; 270 = 2,7x)",
  corridaApostasSeg: "Corrida de raposas: tempo aberto para apostar antes da largada (s)",
  corridaDuracaoSeg: "Corrida de raposas: duração da corrida (s)",
  corridaEsperaSeg: "Corrida de raposas: espera entre apostas da mesma pessoa (s)",
  corridaGanhoMaxDia: "Corrida de raposas: lucro máximo por pessoa por dia (Caudas)",
  corridaPerdaMaxDia: "Corrida de raposas: perda máxima por pessoa por dia (Caudas)",
  pescaLigada: "Pescaria ligada",
  pescaCusto: "Pescaria: custo de cada pescaria (Caudas)",
  pescaIscas: "Pescaria: iscas (lançamentos) por pescaria",
  pescaMinutos: "Pescaria: tempo da vara (minutos)",
  pescaEsperaSeg: "Pescaria: espera entre pescarias da mesma pessoa (s)",
  pescaGanhoMaxDia: "Pescaria: lucro máximo por pessoa por dia (Caudas)",
  pescaPerdaMaxDia: "Pescaria: perda máxima por pessoa por dia (Caudas)",
  pescaPremioAlbum: "Pescaria: prêmio único por completar o álbum (Caudas)",
  pescaPeixes: "Pescaria: peixinhos nadando no tanque",
  forcaLigada: "Teste de força ligado",
  forcaCusto: "Teste de força: custo de cada tentativa (Caudas)",
  forcaPremioTopo: "Teste de força: prêmio no topo do mastro (x o custo)",
  forcaPremioAlto: "Teste de força: prêmio na parte alta (x o custo)",
  forcaEsperaSeg: "Teste de força: espera entre tentativas da mesma pessoa (s)",
  forcaGanhoMaxDia: "Teste de força: lucro máximo por pessoa por dia (Caudas)",
  forcaPerdaMaxDia: "Teste de força: perda máxima por pessoa por dia (Caudas)",
  moedaLigada: "Cara ou coroa ligado",
  moedaApostaMin: "Cara ou coroa: aposta mínima (Caudas)",
  moedaApostaMax: "Cara ou coroa: aposta máxima (Caudas)",
  moedaPagamentoPct: "Cara ou coroa: pagamento de quem ganha (% da aposta; 190 = 1,9x)",
  moedaEsperaSeg: "Cara ou coroa: espera entre apostas da mesma pessoa (s)",
  moedaGanhoMaxDia: "Cara ou coroa: lucro máximo por pessoa por dia (Caudas)",
  moedaPerdaMaxDia: "Cara ou coroa: perda máxima por pessoa por dia (Caudas)",
  tiroLigado: "Tiro ao alvo ligado",
  tiroFlechas: "Tiro: disparos por rodada",
  tiroPertoBlocos: "Tiro: até esta distância vale x1 (blocos)",
  tiroMedioBlocos: "Tiro: até esta distância vale x2, depois x3 (blocos)",
  tiroPontosPorCauda: "Tiro: pontos para ganhar 1 Cauda",
  tiroPremioDia: "Tiro: máximo de Caudas por dia",
  tiroRecargaSeg: "Tiro: espera entre rodadas da mesma pessoa (s)",
  tiroBonusMovel: "Tiro: multiplicador de pontos no alvo móvel 1 (cada número seguinte soma +1)",
  tiroAlvoVelocidade: "Tiro: velocidade do alvo móvel 1 (os outros são mais rápidos), blocos/s",
  cacadaRecargaHoras: "Caçada: a mesma pessoa caça a mesma cabeça a cada (h)",
  cacadaDuracaoDias: "Caçada: cada parte volta para quem pagou em (dias)",
  cacadaAnuncio: "Caçada: anunciar cabeça que passa de (0 = não)",
};
export const DICA_LINK = "discord.gg/convite";
export const DICA_FALAS = "§6§o...fala um | §6§o...fala dois (vazio = falas padrão)";
/** @param {string[]} mudou */
export const CONFIG_SALVA = (mudou) => `Configurações salvas! Mudou: §e${mudou.join("§r, §e")}§r.`;
export const CONFIG_IGUAL = "Nada mudou, tudo como estava.";
export const PRECO_INVERTIDO = "O preço mínimo ficou maior que o máximo. Mantive os dois como estavam.";
export const CACADA_INVERTIDA = "A menor recompensa ficou maior que a maior. Mantive as duas como estavam.";
export const LINK_INVALIDO = "Esse link não parece um convite do Discord (ex.: discord.gg/vulpus). Mantive o anterior.";

export const TITULO_DAR = "Dar Caudas";
export const DAR_ESCOLHA = "§7Para quem? (valor negativo tira Caudas)";
/** @param {string} nome */
export const TITULO_VALOR = (nome) => `Caudas para ${nome}`;
export const ROTULO_VALOR = "Quantas Caudas? Negativo tira";
export const NINGUEM_ONLINE = "§7Ninguém online agora.";

export const ITEM_JA_TEM = "Você já tem o item do menu no inventário.";
export const DESC_STAFF = "Abre o painel da staff";
