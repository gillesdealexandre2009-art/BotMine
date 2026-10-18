// @ts-check
// Textos do menu de pegadinhas do dono (sustos e brincadeiras com os membros, no estilo "From the Fog").

export const TITULO = "Pegadinhas";
export const BOTAO_PAINEL = "Pegadinhas (sustos)";
export const SECAO_JOGADORES = "Jogadores";

export const FECHADO = "As pegadinhas estão desligadas (Configurações → Pegadinhas).";
export const SO_DONO = "Só dono usa as pegadinhas.";
/** @param {number} n */
export const CORPO_ALVO = (n) =>
  [
    "§7Escolha quem vai levar o susto. Tudo é temporário e sem dano; quem não quer pegadinha pode desligar em Ajustes (ou com /vulpus:pegadinhas) e isso para tudo na hora.",
    "",
    `§fOnline agora: §e${n}`,
  ].join("\n");
/** @param {boolean} sumido */
export const BOTAO_SUMIR = (sumido) => (sumido ? "§aVoltar ao jogo (aparece \"entrou no jogo\")" : "§cSair do jogo (fingir que saí: -1 online, invisível)");
export const SUMIU = "§aVocê \"saiu\": todos viram a mensagem, o online caiu 1 e você está invisível, sem nome e fora das listas. A lista do menu de pausa do Minecraft não dá para esconder.";
export const VOLTOU = "§aVocê \"entrou\" de novo: invisibilidade e nome de volta.";
/** @param {number} n */
export const BOTAO_TODOS = (n) => `§cTodo mundo online §7(${n})`;
/** @param {string} nome @param {boolean} voce @param {boolean} ok */
export const BOTAO_JOGADOR = (nome, voce, ok) => `${nome}${voce ? " §7(você, para testar)" : ""}${ok ? "" : " §8(não quer pegadinha)"}`;
export const SEM_ALVO = "Ninguém para assustar: todo mundo que estava online desligou as pegadinhas.";
/** @param {string} nome */
export const NAO_QUER = (nome) => `${nome} desligou as pegadinhas.`;

/** @param {string} alvo */
export const TITULO_CATEGORIAS = (alvo) => `Pegadinhas: ${alvo}`;
export const CORPO_CATEGORIAS = "§7Escolha o tipo de susto. Cada botão roda na hora.";
export const CAT_SONS = "Sons (alguém por perto)";
export const CAT_APARICOES = "Aparições (Herobrine)";
export const CAT_AMBIENTE = "Ambiente (muda o mundo um pouco, tudo volta)";
export const CAT_FALSOS = "Telas e chat falsos";
export const CAT_CORPO = "Brincadeiras no corpo";
export const CAT_COMBOS = "Combos";
export const BOTAO_PARAR = "§aParar tudo agora";
export const PARADO = "§aPegadinhas paradas.";
/** @param {string} alvo */
export const MANDADA = (alvo) => `§aPegadinha mandada para §e${alvo}§a.`;
export const SEM_CHAO = "Não deu para fazer essa pegadinha aí (sem chão, vidro, placa, mexível ou espaço no inventário por perto).";
export const TITULO_FALA = "Fala falsa no chat";
export const ROTULO_QUEM = "Quem fala? (ex.: Herobrine)";
export const ROTULO_TEXTO = "O que a pessoa lê?";
export const AVISO_HEROBRINE_VISIVEL = "§7Lembrete: quem estiver perto também vê o Herobrine.";

// ações: [id, nome do botão]
export const NOMES = {
  minerar: "Alguém minerando perto",
  passos: "Passos se aproximando por trás",
  tunel: "Alguém cavando por baixo",
  construir: "Alguém construindo",
  porta: "Porta abrindo e fechando",
  bau: "Baú abrindo e fechando",
  creeper: "Chiado de creeper (sem creeper)",
  zumbi: "Zumbi gemendo ao longe",
  explosao: "Explosão ao longe (treme a tela)",
  flecha: "Flechas passando (sem dano)",
  tnt: "TNT falso (pavio e estrondo)",
  coracao: "Batimento cardíaco no escuro",
  caverna: "Sons de caverna",
  longe: "Herobrine de longe (se aproxima quando você desvia o olhar)",
  atras: "Herobrine atrás de você (grita se você olhar)",
  frente: "Herobrine na sua cara (susto)",
  sombraLonge: "Sombra Alta de longe (se aproxima quando você desvia o olhar)",
  sombraAtras: "Sombra Alta atrás de você",
  sombraFrente: "Sombra Alta na sua cara",
  olhos: "Olhos brancos no escuro",
  sussurros: "Sussurros girando em volta da cabeça",
  sino: "Sino tocando ao longe",
  disco: "Disco 11 tocando de algum lugar",
  gritoDistante: "Grito bem longe",
  choroGhast: "Choro de ghast ao longe",
  tremor: "Tremor (cai pedra de algum lugar)",
  warden: "Warden se aproximando no escuro",
  blecaute: "Apagão (escurece, apaga as tochas, coração)",
  luzes: "Apagar as tochas e lanternas por perto (25 s)",
  portasBatendo: "Portas por perto batendo sozinhas",
  nevoa: "Névoa vermelha pesada (25 s)",
  flash: "Clarão e trovão",
  chamando: "Alguém sussurra o nome da pessoa",
  corrompido: "Mensagens corrompidas no chat",
  contagem: "Contagem regressiva que termina em susto",
  pesadelo: "Pesadelo (1 min 30 s de tudo junto)",
  duplo: "Duplo (uma figura cinza com o nome da pessoa)",
  silhueta: "Silhueta alta atrás de uma janela",
  caixaMusica: "Caixa de música que desafina",
  pregos: "Pregos de caixão (batidas de baixo da terra)",
  vidroQuebrando: "Vidro quebrando em outro cômodo",
  pegadas: "Pegadas de fumaça aparecendo atrás",
  sangue: "Poças e gotas vermelhas no chão",
  poltergeist: "Poltergeist (alçapões, portões e alavancas mexem sozinhos)",
  placaAssombrada: "Placas por perto mudam de texto",
  carta: "Carta do Herobrine no inventário",
  desconexao: "Falsa desconexão",
  reinicio: "Falso reinício que dá errado",
  casaAssombrada: "Casa assombrada (2 min de tudo junto)",
  visitaSolitaria: "Visita solitária (só quando está sozinha sob um teto)",
  perseguidor: "Perseguidor (3 minutos, volta e meia ele aparece)",
  entrou: "\"Herobrine entrou no jogo\"",
  saiu: "\"Herobrine saiu do jogo\"",
  fala: "Fala falsa no chat (você escreve)",
  ban: "Falso ban",
  fechando: "Servidor \"fechando\" em 5 segundos",
  inventario: "Falso \"inventário limpo\"",
  morte: "Aviso falso de morte por Herobrine",
  lancar: "Lançar para o alto (cai devagar)",
  congelar: "Congelar no lugar (5 s)",
  tontura: "Tontura (náusea)",
  escuridao: "Escuridão e coração batendo",
  piscar: "Luzes piscando",
  raio: "Trovão falso (sem dano)",
  chuva: "Chuva de ovelhas e galinhas",
  noite: "Noite do Herobrine (45 s de tensão)",
};

// mensagens falsas
export const ENTROU = "§e§oHerobrine entrou no jogo";
export const SAIU = "§e§oHerobrine saiu do jogo";
export const FALAS_HEROBRINE = ["eu estou atrás de você", "você não devia ter vindo aqui", "eu vejo você", "olhe para trás", "não confie nela"];
/** @param {string} nome */
export const MORTE_FALSA = (nome) => `§f${nome} foi assassinado por Herobrine`;
export const BAN_TITULO = "§c§lVOCÊ FOI BANIDO";
export const BAN_SUB = "§7Motivo: Herobrine • duração: permanente";
export const BAN_FIM_TITULO = "§a§lera brincadeira!";
export const BAN_FIM_SUB = "§7ninguém foi banido";
/** @param {number} n */
export const FECHANDO = (n) => `§c§lServidor fechando em ${n}...`;
export const FECHANDO_FIM = "§a§lBrincadeira! O servidor está ótimo.";
export const INVENTARIO = "§cUm administrador limpou o seu inventário.";
export const INVENTARIO_FIM = "§aSó brincadeira: o seu inventário está intacto.";
/** @param {string} quem @param {string} texto */
export const FALA = (quem, texto) => `<${quem}> ${texto}`;
