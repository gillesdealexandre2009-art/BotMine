// @ts-check
// Evento de Halloween "O Último Outono de Hollow" (25/10 a 31/10/2026): os registros que o jogador encontra, o enigma da cronologia
// e as mensagens do evento. É só texto (nada de código aqui). A fonte da verdade da história é evento-hollow/01-lore-completa.md.
// Independente da lore da Vulpus (SONHE/ARG). Tratamento do desfecho: sério, sem cena e sem método, sem glorificar.
//
// Marcadores nos textos: {coord:casa|acampamento|abrigo|ponte} viram as coordenadas que a staff marcou (ou "[a staff ainda não marcou]").

/**
 * @typedef {Object} Registro
 * @property {string} id            código único (D01...D17)
 * @property {"casa"|"sotao"|"acampamento"|"abrigo"|"mesa"|"ponte"} local  onde o registro fica
 * @property {string} titulo
 * @property {string} texto
 * @property {string[]} requer      ids de registros que precisam ter sido lidos antes (e/ou "enigma" = cronologia resolvida)
 * @property {boolean} chave        conta para a conclusão do evento
 * @property {string} [audio]       id do áudio (A1...A4) para o link configurado pela staff
 * @property {string} trancado      texto mostrado enquanto os requisitos não foram cumpridos (sem spoiler)
 */

/** @type {Registro[]} */
export const REGISTROS = [
  {
    id: "D01",
    local: "casa",
    titulo: "Bilhete na mesa da cozinha",
    chave: false,
    requer: [],
    trancado: "",
    texto:
      "Se vocês chegarem e eu não estiver, não se preocupem.\n\n" +
      "Deixei o fogão apagado e o pão-de-mel da vovó na lata. Eu volto antes de escurecer. Fui procurar vocês.\n\n" +
      "Hollow\n\n" +
      "P.S.: Lia, deixei a luz da varanda acesa.",
  },
  {
    id: "D02",
    local: "casa",
    titulo: "Papel colado no relógio da parede",
    chave: false,
    requer: [],
    trancado: "",
    texto:
      "O relógio parou na correria da festa. Marca 21h47.\n\n" +
      "Não vou mexer nele. O pai gosta de acertar o relógio sozinho.",
  },
  {
    id: "D03",
    local: "sotao",
    titulo: "Diário de Hollow, primeiras páginas",
    chave: true,
    audio: "A1",
    requer: [],
    trancado: "",
    texto:
      "Dia 1.\n" +
      "Voltei da festa sozinho. Não sei direito como. Estava escuro e chovia muito. Acho que me perdi do pessoal na saída e vim a pé pela estrada. A casa estava como a gente deixou.\n" +
      "Eles não chegaram. A mãe tinha escrito que a festa seria dia 22, então talvez tenham achado que era depois. O pai deve ter ido buscar a vó em outro lugar.\n\n" +
      "Dia 2.\n" +
      "Liguei para todo mundo. Ninguém atende. É normal, a rede aqui cai quando chove.\n\n" +
      "Dia 3.\n" +
      "Vou procurar. Já separei mantimentos. Vou montar acampamento na mata, perto do rio. Se eles voltarem por lá, me acham.\n" +
      "Vou deixar anotado onde estou, para eles saberem me encontrar.",
  },
  {
    id: "D04",
    local: "sotao",
    titulo: "Mapa do caminho até o acampamento",
    chave: false,
    requer: ["D03"],
    trancado: "Um papel dobrado, quase todo manchado de umidade. Você não entende o que ele quer dizer ainda. Talvez o diário ajude.",
    texto:
      "Desenhei o caminho. Saindo pela porta dos fundos, seguir a trilha de terra até a mata. Marquei com um X onde fica a barraca.\n\n" +
      "Acampamento: {coord:acampamento}\n\n" +
      "Deixo um lampião aceso toda noite. Quem seguir a luz chega.",
  },
  {
    id: "D05",
    local: "acampamento",
    titulo: "Diário de Hollow, segunda parte",
    chave: false,
    audio: "A2",
    requer: [],
    trancado: "",
    texto:
      "Dia 5.\n" +
      "Montei a barraca perto do rio. Fiz cartazes e preguei nas árvores. A tinta da impressora acabou e usei a do pai.\n\n" +
      "Dia 7.\n" +
      "Comi as últimas latas. Pensei em voltar para casa, mas e se eles chegam e não me acham?\n\n" +
      "Dia 9.\n" +
      "Faz nove dias. Ou foi mais? Amanhecer e anoitecer têm andado parecidos. Contei as velas: nove. Contei de novo: dezenove.\n" +
      "Contei errado. Deve ser o cansaço.\n\n" +
      "(No pé da página, a lápis, com outra letra:)\n" +
      "Dia 1 (2022)\n" +
      "Dia 1 (2023)\n" +
      "Dia 1 (2024)\n" +
      "Dia 1 (2025)",
  },
  {
    id: "D06",
    local: "acampamento",
    titulo: "Cartaz: DESAPARECIDOS",
    chave: true,
    requer: [],
    trancado: "",
    texto:
      "DESAPARECIDOS\n\n" +
      "ÁLVARO (45)\nMARTA (42)\nLIA (8)\nILDA (71)\n\n" +
      "Vistos pela última vez na Festa da Colheita de Salgueiral, na noite de 31 de outubro de 20▒▒ (a chuva borrou o resto do ano).\n" +
      "Caminhonete azul.\n\n" +
      "Quem tiver notícias procure o Hollow, na casa da estrada velha.\n\n" +
      "(Embaixo, a caneta, com a letra tremida:)\n" +
      "faz uma semana",
  },
  {
    id: "D07",
    local: "acampamento",
    titulo: "Carta da Marta",
    chave: true,
    audio: "A2",
    requer: [],
    trancado: "",
    texto:
      "Salgueiral, 12 de outubro de 2019.\n\n" +
      "Meu querido,\n\n" +
      "Como está o acampamento? Aqui está tudo normal. A Lia perdeu o dente da frente e já está treinando o sorriso para a foto da festa. A vó quer que você prove o pão-de-mel antes de todo mundo, então volte com fome.\n\n" +
      "Seu pai já separou a camisa xadrez que você gosta. No dia 31, depois do almoço, a gente sai todo mundo junto. Combinado?\n\n" +
      "Cuide-se, e não esqueça o casaco, que o tempo vira.\n\n" +
      "Com todo o amor,\nMamãe\n\n" +
      "(Na margem, a caneta:)\n" +
      "chegou ontem",
  },
  {
    id: "D08",
    local: "acampamento",
    titulo: "Pilha de calendários",
    chave: false,
    requer: [],
    trancado: "",
    texto:
      "Sete calendários de anos diferentes, empilhados dentro da barraca. Em todos, o dia 31 de outubro está circulado e os dias depois dele estão riscados com um X até o fim do mês.\n\n" +
      "No de cima, um bilhete preso com um prego:\n" +
      "\"Troco todo ano. Assim eu não perco a conta.\"",
  },
  {
    id: "D09",
    local: "acampamento",
    titulo: "Bilhete sobre o abrigo",
    chave: false,
    requer: [],
    trancado: "",
    texto:
      "Guardei o que eu não consigo carregar no abrigo da colheita, debaixo da colina.\n\n" +
      "Abrigo: {coord:abrigo}\n\n" +
      "Lá tem papéis de uma pessoa que passou por aqui. Não são meus. Não precisa ler. Mas guardei por via das dúvidas.",
  },
  {
    id: "D10",
    local: "abrigo",
    titulo: "Recorte de jornal",
    chave: true,
    requer: [],
    trancado: "",
    texto:
      "GAZETA DE SALGUEIRAL\n1º de novembro de 2019\n\n" +
      "CAMINHONETE CAI DA PONTE DO SALGUEIRAL DURANTE A TEMPESTADE\n\n" +
      "O veículo saiu da pista por volta das 21h40 de ontem, durante o temporal que atingiu a região depois da Festa da Colheita. As equipes de resgate encontraram cinco ocupantes.\n\n" +
      "[trecho coberto a caneta preta]\n\n" +
      "Um jovem de 16 anos foi localizado na margem, em estado de choque, e levado ao hospital. Ele repetia que a família \"ia chegar\".\n\n" +
      "[restante do texto coberto a caneta preta]",
  },
  {
    id: "D11",
    local: "abrigo",
    titulo: "Ingresso da Festa da Colheita",
    chave: true,
    requer: [],
    trancado: "",
    texto:
      "FESTA DA COLHEITA DE SALGUEIRAL\nEdição de outono\n\n" +
      "Entrada família (5 pessoas)\n" +
      "31 OUT · a partir das 14h\n" +
      "PAGO\n\n" +
      "(No verso, a lápis, com letra de criança:)\n" +
      "\"O Hollow ganha o último pedaço!\"",
  },
  {
    id: "D12",
    local: "abrigo",
    titulo: "Registro de ocorrência",
    chave: true,
    requer: [],
    trancado: "",
    texto:
      "REGISTRO DE OCORRÊNCIA\n\n" +
      "Local: Ponte do Salgueiral\n" +
      "Data e hora: 31/10, 21h47 (estimada pelo relógio de pulso do sobrevivente)\n" +
      "Ocupantes do veículo: 5\n" +
      "Sobreviventes: 1\n\n" +
      "O sobrevivente, 16 anos, foi encontrado na margem às 01h10, consciente e desorientado. Ele repetia que a família estava \"a caminho\". Encaminhado ao hospital. Assistência social acionada.\n" +
      "Velório e despedida: 04/11.\n\n" +
      "(Nos campos \"nome\" e \"parentesco\", tudo foi riscado a caneta. Só o número 1 de \"Sobreviventes\" continua legível, circulado várias vezes.)",
  },
  {
    id: "D13",
    local: "mesa",
    titulo: "Mesa de Hollow",
    chave: true,
    requer: [],
    trancado: "",
    texto:
      "Papéis espalhados por toda a mesa. No meio, uma folha em branco, só com uma pergunta:\n\n" +
      "\"Em que dia a gente se perdeu? Eu anoto aqui e então paro de contar.\"\n\n" +
      "Compare os registros que você encontrou: onde eles concordam, e onde é Hollow quem discorda deles.",
  },
  {
    id: "D14",
    local: "ponte",
    titulo: "Placa na ponte",
    chave: true,
    requer: ["enigma"],
    trancado: "O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow.",
    texto:
      "Em memória de\n\nÁLVARO\nMARTA\nLIA\nILDA\n\n31 de outubro de 2019\n\n\"Voltaram para casa.\"\n\n" +
      "Colocada pelos amigos de Salgueiral. Aos pés da placa, flores trocadas todo outono.",
  },
  {
    id: "D15",
    local: "ponte",
    titulo: "Caderninho da Lia",
    chave: false,
    requer: ["enigma"],
    trancado: "O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow.",
    texto:
      "Meu dente caiu. O Hollow disse que a fada deixa moeda. Eu quero um pão-de-mel.\n\n" +
      "Quando eu crescer eu vou morar na casa grande com o Hollow. Ele vai ficar velhinho e eu vou fazer o pão pra ele.\n\n" +
      "(O resto das páginas está molhado e ilegível.)",
  },
  {
    id: "D16",
    local: "ponte",
    titulo: "Gravador de Hollow (transcrição)",
    chave: true,
    audio: "A3",
    requer: ["enigma"],
    trancado: "O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow.",
    texto:
      "(chiado)\n" +
      "Gravando. Ponte do Salgueiral.\n" +
      "(pausa)\n" +
      "Eu fiz os cartazes. Escrevi todos os nomes. Eu sei de cor o nome de cada um.\n" +
      "(pausa longa)\n" +
      "Eu disse \"semana passada\" tantas vezes que... A Lia ia fazer nove anos em dezembro. Ia.\n" +
      "O verbo está certo. Por que é que dói tanto?\n" +
      "(respiração)\n" +
      "A luz da varanda. Eu deixei acesa. Todo ano, eu deixei acesa.\n" +
      "(a gravação continua em silêncio por alguns segundos)",
  },
  {
    id: "D17",
    local: "ponte",
    titulo: "O último registro de Hollow",
    chave: true,
    audio: "A4",
    requer: ["enigma", "D14", "D16"],
    trancado: "Uma folha dobrada, presa por uma pedra. Você sente que ainda não leu tudo o que precisa antes de abri-la.",
    texto:
      "Para quem encontrar isto.\n\n" +
      "Hoje é 31 de outubro de 2026. Eu contei: são sete anos.\n\n" +
      "Eu não estava procurando por eles. Estava procurando um jeito de não saber. Todo outono eu acordava no dia 1 e achava que ainda dava tempo.\n\n" +
      "Eles não se perderam de mim. Eles estavam no carro. Eu também estava. Eu sobrevivi, e passei sete anos sem conseguir dizer isso em voz alta.\n\n" +
      "A Lia não vai fazer nove anos. A vó não vai fazer o pão. O pai não vai acertar o relógio. A mãe não vai ler a carta que eu nunca respondi.\n\n" +
      "Eu não aguento mais. Não é culpa de ninguém que passou por aqui. Eu devia ter pedido ajuda muito antes, e não pedi. Se você está lendo isto e carrega algo parecido, peça. Ligue para alguém hoje. Eu não liguei, e queria ter ligado.\n\n" +
      "O casaco está dobrado aqui, na grade. Era o que a mãe mandou eu levar. Se alguém quiser, que fique com ele.\n\n" +
      "Eu apaguei a luz da varanda.\n\n" +
      "Hollow",
  },
];

/** O enigma da Mesa de Hollow: a data em que a família "se perdeu" (dia, mês, ano). */
export const ENIGMA = Object.freeze({
  id: "cronologia",
  dia: 31,
  mes: 10,
  ano: 2019,
  /** Dicas que aparecem depois de N tentativas erradas (nunca dão a resposta pronta). */
  dicas: [
    { depois: 3, texto: "Hollow escreveu datas em vários lugares, mas nem todas são dele. Procure o que veio de outras pessoas: um jornal, um ingresso, uma carta." },
    { depois: 6, texto: "O DIA e o MÊS estão no ingresso e na carta da Marta. O ANO está no jornal, que fala da noite \"de ontem\"." },
  ],
  /** Registros que ajudam a resolver (para a dica final listar). */
  evidencias: ["D07", "D10", "D11"],
});

export const MENSAGENS = Object.freeze({
  inicio:
    "§6🎃 O Último Outono de Hollow\n§7De 25 a 31 de outubro. Uma casa, uma mata, um abrigo e uma ponte guardam o que alguém tentou esquecer.\n§8Aviso: a história trata de luto e tem um desfecho triste (sem cenas gráficas). Se não quiser acompanhar, tudo bem. Você pode jogar normalmente.\n§7Comece pela casa perto do spawn. Use /vulpus:hollow para abrir o seu diário de investigação.",
  concluiu:
    "§7Você reconstruiu a história de Hollow.\n\n§7Ele não estava perdido. Ele estava sozinho com uma dor grande demais, e não pediu ajuda a tempo.\n\n§fSe você ou alguém que você conhece está sofrendo, não carregue isso sozinho: no Brasil, o §bCVV §fatende pelo §b188 §f(24 horas, gratuito) e em cvv.org.br.",
  naoEhFinal: "§7Você ainda não reuniu o que precisa para entender isto.",
  encerrado: "§7O Último Outono de Hollow já terminou. Os registros continuam aqui para quem quiser ler, mas as recompensas do evento acabaram.",
  aindaNao: "§7Esse evento ainda não começou. Volte em 25 de outubro.",
});

/** Vento da casa: o texto muda com a quantidade de registros que a pessoa já encontrou (sem revelar o segredo). */
export const VENTO = Object.freeze([
  { ate: 2, texto: "Você sente um vento estranho passar por você. Ele parece se originar de uma casa misteriosa." },
  { ate: 6, texto: "O vento volta, mais frio, com cheiro de folhas molhadas. Parece que a casa estava esperando alguém." },
  { ate: 99, texto: "Dessa vez o vento não passa por você. Ele para, como quem escuta." },
]);
