// @ts-check
// Evento "Ecos dos Ausentes" (Dia de Finados, 2/11/2026, janela de 24 h): a história, os objetivos que dão Fragmentos de Alma e as falas.
// Só texto e dados (nada de código). Original: nenhum personagem, fala ou música de outro jogo. A fonte da história é evento-ecos/01-historia.md.
// Cada objetivo dá fragmentos UMA vez por jogador (a conta fica guardada), por isso a quantidade total é limitada e não dá para farmar.
// Total por pessoa: 16 fragmentos. Conjunto completo (armadura + varinha) custa 34: ninguém termina sozinho, só negociando.

/**
 * @typedef {Object} Opcao
 * @property {string} texto
 * @property {boolean} [certa]   no enigma, a resposta que resolve (as outras só dão uma pista e deixam tentar de novo)
 * @property {string} [resposta] o que o personagem diz depois dessa escolha
 */
/**
 * @typedef {Object} Objetivo
 * @property {string} id            código único
 * @property {"limiar"|"vila"|"arquivo"|"final"} area
 * @property {"dialogo"|"enigma"|"segredo"|"elite"|"memoria"|"chefe"} tipo
 * @property {string} quem          nome mostrado como quem fala
 * @property {string[]} falas       páginas de fala (uma por tela)
 * @property {string} [pergunta]    enigma/escolha: a pergunta
 * @property {Opcao[]} [opcoes]
 * @property {string[]} [falasFim]  fala depois de concluir (quando dá o fragmento)
 * @property {number} fragmentos    quantos fragmentos dá (uma vez por jogador)
 * @property {string[]} [requer]    ids de objetivos que precisam estar feitos antes
 */

export const HISTORIA = Object.freeze({
  titulo: "Ecos dos Ausentes",
  resumo:
    "Na vila de Névoa-Velha, todo Dia de Finados as pessoas acendiam uma luz para quem partiu. A Guardiã Auren quis guardar todas as lembranças da vila " +
    "para que ninguém fosse esquecido, e para isso prendeu cada lembrança num fragmento de alma. Foi demais para uma pessoa só: a alma dela se partiu, " +
    "a vila sumiu para um lugar fora do mundo, e os moradores viraram ecos que repetem o que faziam. Quem chega ajuda os ecos a lembrar, e no fim " +
    "decide se a vila volta a descansar (soltar) ou se fica para sempre guardada (guardar). As duas escolhas dão as mesmas recompensas.",
});

/** @type {Objetivo[]} */
export const OBJETIVOS = [
  // ---------------------------------------------------------------- Área I: O Limiar (3 fragmentos)
  {
    id: "E01", area: "limiar", tipo: "dialogo", quem: "Tuco, o Coveiro", fragmentos: 1, requer: [],
    falas: [
      "Ah. Gente viva. Faz tempo que o último passou por aqui... ou será que passou ontem? Aqui o tempo escorre.",
      "Me chamo Tuco. Cuido dos túmulos do Limiar. Ninguém vem visitar, mas cavar cova é o único jeito que eu sei de ficar de pé.",
      "Se vão seguir pela neblina, levem isto. Um fragmento de alma. Dizem que acalma quem ainda tem coisa para dizer.",
    ],
    falasFim: ["Se encontrarem a Lanterna, a menina, digam que o Tuco guardou a vela dela. Ela vai entender."],
  },
  {
    id: "E02", area: "limiar", tipo: "enigma", quem: "Lanterna", fragmentos: 1, requer: [],
    falas: [
      "Psiu. Eu perdi a minha luz. Hoje é o dia em que todo mundo acende uma luz para quem foi embora, e a minha sumiu.",
      "Eu só lembro que ela brilhava quando alguém dizia o nome de quem a gente ama.",
    ],
    pergunta: "O que você diz para a Lanterna?",
    opcoes: [
      { texto: "\"O Tuco guardou a sua vela.\"", certa: true, resposta: "A Lanterna sorri. Uma luzinha pequena acende entre as mãos dela. \"Então alguém lembrou de mim.\"" },
      { texto: "\"Eu acho a sua luz para você.\"", resposta: "\"Ninguém acha o que só se acende com lembrança. Pensa de novo.\"" },
      { texto: "\"Não sei de nada.\"", resposta: "\"Tudo bem. Se você ouvir alguém lembrar de mim, volta.\"" },
    ],
    falasFim: ["Obrigada. Pega este fragmento. Eu acendi a minha, ele já não precisa ficar comigo."],
  },
  {
    id: "E03", area: "limiar", tipo: "segredo", quem: "Túmulo sem nome", fragmentos: 1, requer: [],
    falas: [
      "Um túmulo sem nome, afastado dos outros. Alguém deixou uma flor seca aqui, e embaixo dela há um fragmento de alma que ainda guarda um pouco de calor.",
    ],
  },

  // ---------------------------------------------------------------- Área II: A Vila Silenciosa (4 fragmentos)
  {
    id: "E04", area: "vila", tipo: "dialogo", quem: "Dona Brasa", fragmentos: 1, requer: [],
    falas: [
      "Entra, entra! O pão acabou de sair. Todo dia eu faço para a vila toda, mesmo que ninguém apareça.",
      "Antes, tinha fila na porta. Agora só tem o cheiro. Mas se eu parar de assar... aí eu esqueço que existiu fila.",
      "Pega um pão. E pega este fragmento também, ele estava no meio da massa. Não me pergunte como.",
    ],
    falasFim: ["Se encontrar o Mestre Sino, diz que o pão dele ainda está guardado."],
  },
  {
    id: "E05", area: "vila", tipo: "enigma", quem: "Mestre Sino", fragmentos: 1, requer: [],
    falas: [
      "Eu toco o sino toda manhã e conto quem respondeu. Antes, todos respondiam. Hoje respondem três vozes.",
      "Mas eu continuo a contar. Se eu parar de contar, os ausentes deixam de contar também.",
    ],
    pergunta: "Quantas badaladas o Mestre Sino deve tocar para chamar quem partiu?",
    opcoes: [
      { texto: "Uma para cada pessoa que a vila perdeu.", resposta: "\"Isso eu já fiz, mil vezes. Não chamou ninguém.\"" },
      { texto: "Uma só, lenta, para quem ainda ouve.", certa: true, resposta: "\"Uma só... E esperar. Ninguém nunca me ensinou a esperar. Obrigado.\"" },
      { texto: "Nenhuma. Deixe-os descansar.", resposta: "\"Talvez. Mas e se eles estiverem esperando o sino? Pense mais um pouco.\"" },
    ],
    falasFim: ["Aqui. O fragmento que ficou preso na corda do sino. Ele só se soltou agora."],
  },
  {
    id: "E06", area: "vila", tipo: "enigma", quem: "Os Gêmeos Sussurro", fragmentos: 1, requer: [],
    falas: [
      "— Somos dois. — Somos um. — Um de nós mente. — Os dois mentem. — Não, só um. — Eu disse que somos dois.",
      "— Cada um de nós guarda metade de um nome. — O nome de quem fez a vila sumir.",
    ],
    pergunta: "Os Gêmeos dizem: \"Um de nós tem a metade \"Au\" e o outro a metade \"ren\". Qual é o nome inteiro?\"",
    opcoes: [
      { texto: "Auren", certa: true, resposta: "— Auren! — Ela mesma. — A Guardiã. — Estava tão perto o tempo todo." },
      { texto: "Renau", resposta: "— Quase. — Mas não. — Troque a ordem." },
      { texto: "Auran", resposta: "— Tem uma letra errada. — Olhe a segunda metade." },
    ],
    falasFim: ["— Fique com isto. — Era dela. — Mas ela não quer mais carregar sozinha."],
  },
  {
    id: "E07", area: "vila", tipo: "segredo", quem: "Carta na casa fechada", fragmentos: 1, requer: [],
    falas: [
      "Uma carta quase apagada, presa debaixo de um prato:\n\n\"Se alguém ler isto, saiba que a Auren não é má. Ela só não suportou ver ninguém ir embora. Ela pediu que guardássemos o que sobrasse dela. Está no Arquivo.\"",
      "Junto da carta há um fragmento de alma, enrolado num lenço.",
    ],
  },

  // ---------------------------------------------------------------- Área III: O Arquivo das Almas (6 fragmentos)
  {
    id: "E08", area: "arquivo", tipo: "dialogo", quem: "Pó, o Arquivista", fragmentos: 1, requer: [],
    falas: [
      "Shhh. Aqui se fala baixo. Cada prateleira guarda uma vida inteira, e vida acorda fácil.",
      "A Guardiã Auren veio aqui no último Finados. Pediu para guardar a vila inteira. Eu avisei: guardar demais pesa.",
      "Ela guardou mesmo assim. E quando o último fragmento encaixou... ela se partiu. Ouvi o som dela se quebrando, como vidro grosso.",
      "Procure os fragmentos que sobraram. Os que não são dela e os que são. Pegue este para começar.",
    ],
    falasFim: ["Cuidado com as Sentinelas. Elas só querem que ninguém mexa nas prateleiras, mas não sabem pedir de outro jeito."],
  },
  {
    id: "E09", area: "arquivo", tipo: "elite", quem: "Sentinela da Cripta (corredor leste)", fragmentos: 1, requer: [],
    falas: ["Uma Sentinela da Cripta bloqueia a passagem. Derrote-a, ou deixe a prateleira em paz e descubra o que ela guarda."],
  },
  {
    id: "E10", area: "arquivo", tipo: "elite", quem: "Sentinela da Cripta (corredor oeste)", fragmentos: 1, requer: [],
    falas: ["Outra Sentinela guarda a escada para as prateleiras mais fundas. O fragmento que ela protege reage ao seu."],
  },
  {
    id: "E11", area: "arquivo", tipo: "segredo", quem: "Prateleira escondida", fragmentos: 1, requer: [],
    falas: [
      "Entre dois livros, uma prateleira que ninguém catalogou. Na lombada está escrito à mão: \"O que eu não consegui guardar.\"",
      "Dentro, um fragmento de alma pequeno e frio.",
    ],
  },
  {
    id: "E12", area: "arquivo", tipo: "memoria", quem: "Memória Partida", fragmentos: 2, requer: ["E08"],
    falas: [
      "Uma figura que muda de forma, como lembrança mal contada. Tem a voz da Auren quando ela era jovem.",
      "\"Eu era a aprendiz dela. Eu fui a primeira a pedir que ela guardasse mais um. Só mais um. Foi minha culpa, não foi?\"",
      "\"Não me deixe virar só um erro na memória de alguém.\"",
    ],
    pergunta: "O que você diz à Memória Partida?",
    opcoes: [
      { texto: "\"Não foi culpa sua. Ninguém sabia.\"", certa: true, resposta: "A figura para de mudar de forma. Por um instante ela é só uma moça, cansada. \"Obrigada.\"" },
      { texto: "\"Foi, sim. Mas pode consertar.\"", certa: true, resposta: "\"Consertar... Sim. Eu posso tentar.\" Ela ergue a cabeça, sem fugir." },
      { texto: "\"Não importa mais.\"", resposta: "A figura estremece e se desfaz um pouco. \"Importa para mim. Tente de novo.\"" },
    ],
    falasFim: ["Dois fragmentos caem das mãos dela. \"Levem. E contem à Auren que eu não fugi.\""],
  },

  // ---------------------------------------------------------------- Área IV: O Último Testemunho (3 fragmentos)
  {
    id: "E13", area: "final", tipo: "chefe", quem: "O Último Testemunho", fragmentos: 3, requer: ["E08"],
    falas: [
      "No centro do Arquivo há uma figura imensa de névoa e velas. Ela não ataca de imediato. Ela olha.",
      "\"Eu sou a última coisa que a Auren lembra. Eu vi tudo. A vila inteira, uma luz de cada vez, sendo guardada.\"",
      "\"Ela não me prendeu aqui. Eu fiquei porque alguém precisava lembrar de tudo, mesmo quando doía.\"",
      "\"Vocês juntaram os fragmentos que sobraram. Agora decidam. O que a vila merece?\"",
    ],
    pergunta: "O que a vila de Névoa-Velha merece?",
    opcoes: [
      { texto: "Descansar. Soltar os ecos.", resposta: "\"Então eles vão em paz. E a Auren vai com eles. Obrigado por lembrar de nós.\"" },
      { texto: "Ser guardada. Não esquecer ninguém.", resposta: "\"Então eu continuo. Alguém precisa. Obrigado por não deixar de lado.\"" },
      { texto: "Lutar contra o Testemunho antes de decidir.", resposta: "\"Se precisa ser assim... então que seja uma lembrança honesta.\"" },
    ],
    falasFim: [
      "O Testemunho se desfaz em luz e velas. No chão, três fragmentos brilham.",
      "Qualquer escolha termina igual para você: as recompensas são as mesmas. Só a lembrança da vila muda.",
    ],
  },
];

/** Fragmentos por área (conferência de balanceamento). */
export const TOTAL_FRAGMENTOS = OBJETIVOS.reduce((n, o) => n + o.fragmentos, 0);

export const MENSAGENS = Object.freeze({
  antes: "§7A passagem ainda está fechada. Ela abre no Dia de Finados, 2 de novembro, por 24 horas.",
  aberta: "§6Ecos dos Ausentes §7— a passagem está aberta. Você tem até o fim das 24 horas para explorar.",
  fecha1h: "§6Ecos dos Ausentes §7— a passagem fecha em 1 hora.",
  fecha10min: "§6Ecos dos Ausentes §7— a passagem fecha em 10 minutos.",
  fecha1min: "§6Ecos dos Ausentes §7— a passagem fecha em 1 minuto. Volte para a saída!",
  encerrada: "§7A passagem se fechou. O que você levou nos bolsos continua com você.",
  expulso: "§7A névoa se dissipa e você volta para um lugar seguro.",
});
