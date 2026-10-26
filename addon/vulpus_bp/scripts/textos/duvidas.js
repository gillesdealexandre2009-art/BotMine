// @ts-check
// Textos do menu de Dúvidas (Q&A): perguntas e respostas organizadas por categoria.

export const TITULO = "Dúvidas";
export const CORPO = "§7Escolha uma categoria pra encontrar sua resposta.";

/**
 * @typedef {object} Pergunta
 * @property {string} q  pergunta
 * @property {string} a  resposta (pode usar § color codes)
 */

/**
 * @typedef {object} Categoria
 * @property {string} nome
 * @property {string} icone  chave de ICONES
 * @property {Pergunta[]} perguntas
 */

/** @type {Categoria[]} */
export const CATEGORIAS = [
  {
    nome: "Começando",
    icone: "nova",
    perguntas: [
      {
        q: "Como eu começo a jogar?",
        a: "Ao entrar, você cai no lobby. Passe pelo portal de saída pra ir pro mundo — você vai cair do céu com proteção. Use o menu (toque no item especial ou §e/vulpus:menu§r) pra acessar tudo.",
      },
      {
        q: "Como abro o menu?",
        a: "Toque no §eitem especial§r do inventário ou digite §e/vulpus:menu§r.",
      },
      {
        q: "O que são Caudas?",
        a: "É a §6moeda do servidor§r. Use pra comprar na loja, apostar, colocar recompensa e muito mais.",
      },
      {
        q: "Como ganho Caudas?",
        a: "Três formas: §ediária§r (todo dia no menu), §ejogando ativo§r (Caudas por minuto — AFK não conta) e §equests da Yuki§r.",
      },
      {
        q: "O que é a recompensa diária?",
        a: "Todo dia você pega Caudas de graça no menu. Dias seguidos aumentam o bônus. O dia vira à meia-noite de Brasília.",
      },
      {
        q: "Como ganho XP e subo de nível?",
        a: "XP vem de §etempo jogando ativo§r e da §ediária§r. Ficar parado não conta. Ranks: Filhote → Raposinha → Raposa Andarilha → Raposa Lunar → Raposa de Nove Caudas.",
      },
    ],
  },
  {
    nome: "Teleportes e Casas",
    icone: "tpa",
    perguntas: [
      {
        q: "Como salvo minha casa?",
        a: "Menu → Teleportes → Casas → §eNova casa§r. Salva onde você está. Limite padrão: 3 casas.",
      },
      {
        q: "Como volto pra minha casa?",
        a: "Menu → Teleportes → Casas → clique no nome. Teleporte após contagem regressiva.",
      },
      {
        q: "Como volto pro Spawn?",
        a: "Menu → Teleportes → Spawn. Teleporte direto.",
      },
      {
        q: "O que é o Retornar?",
        a: "Te leva onde você §cmorreu§r pela última vez ou de onde saiu no último teleporte. Ótimo pra buscar itens!",
      },
      {
        q: "Como uso o TPA?",
        a: "Menu → Teleportes → TPA. Peça pra §eir até alguém§r ou §etrazer alguém§r até você. A pessoa precisa aceitar.",
      },
      {
        q: "O que é o RTP?",
        a: "Teleporte aleatório. Você sai pelo portal do lobby e cai do céu com proteção de queda.",
      },
    ],
  },
  {
    nome: "Masmorra",
    icone: "ranks",
    perguntas: [
      {
        q: "O que é a Masmorra?",
        a: "§c5 andares§r subterrâneos com inimigos, baús e um guardião (boss) em cada. Temas: A Toca, A Feira Esquecida, O Campo de Guerra, O Sonho e O Coração.",
      },
      {
        q: "Como entro na Masmorra?",
        a: "Pela §eSala dos Portais§r perto do spawn. O 1º andar é aberto pra todos.",
      },
      {
        q: "O que são Selos da Cauda?",
        a: "Cada guardião dá um §eSelo§r ao ser derrotado. O Selo abre o portal pro próximo andar. São 5 no total.",
      },
      {
        q: "Se eu morrer, perco itens?",
        a: "§aNão!§r Quando sua vida fica baixa, a Kiza te resgata de volta ao altar com vida cheia e seus itens.",
      },
      {
        q: "Os baús renovam?",
        a: "Sim! Cada baú pode ser aberto §euma vez por dia§r por pessoa. Vira à meia-noite.",
      },
      {
        q: "Posso ir com amigos?",
        a: "§aSim!§r Os inimigos escalam com mais jogadores. Quem bate junto divide crédito e loot.",
      },
    ],
  },
  {
    nome: "Pets",
    icone: "perfil",
    perguntas: [
      {
        q: "Como consigo um pet?",
        a: "Nas §emáquinas de cápsulas§r no lobby! Cada uma custa §680 Caudas§r ou 1 ficha. Pet aleatório de 7 raridades.",
      },
      {
        q: "O que os pets fazem?",
        a: "Bônus variados: mais XP, mais sorte no loot, efeitos de poção (velocidade, visão noturna) ou cura automática.",
      },
      {
        q: "Como evoluo meu pet?",
        a: "Pet repetido dá §efragmentos§r. Junte o suficiente e evolua no menu. São 4 níveis com bônus maiores.",
      },
      {
        q: "O que são fichas?",
        a: "Fichas de cápsula: cada uma vale 1 cápsula grátis. Ganha completando feitos como derrotar guardiões.",
      },
      {
        q: "Posso ter mais de um pet ativo?",
        a: "Sim, mas tem um §elimite§r de ativos ao mesmo tempo. Gerencie na sua coleção.",
      },
    ],
  },
  {
    nome: "Caçada",
    icone: "buscar",
    perguntas: [
      {
        q: "O que é a Caçada?",
        a: "Coloque §6Caudas na cabeça§r de outro jogador. Quem der o golpe final coleta a recompensa — sistema de §cprocurado§r!",
      },
      {
        q: "Como coloco uma recompensa?",
        a: "Menu → Atividades → Caçada → Mural. Escolha o jogador e o valor. Você paga na hora (valor + taxa).",
      },
      {
        q: "Tem regras pra coletar?",
        a: "Não vale matar do próprio clã/aliado, não vale se você pagou a recompensa, e a vítima precisa estar viva há um tempo mínimo.",
      },
    ],
  },
  {
    nome: "Minigames",
    icone: "minigames",
    perguntas: [
      {
        q: "Que minigames tem?",
        a: "§eSpleef§r (quebre a neve e derrube os outros), §eCorrida de Raposas§r (aposte na mais rápida) e §ePescaria§r (pesque espécies e complete o álbum).",
      },
      {
        q: "Como funciona a Corrida?",
        a: "Aposte Caudas em 1 de 3 raposas. A primeira a cruzar a chegada ganha — todas têm a mesma chance, mas mudam de ritmo.",
      },
      {
        q: "Como funciona a Pescaria?",
        a: "Pague, receba vara e iscas por tempo limitado. Pesque espécies com tamanhos variados — novas espécies entram no álbum!",
      },
    ],
  },
  {
    nome: "Quests (Yuki)",
    icone: "comandos",
    perguntas: [
      {
        q: "O que são as quests?",
        a: "A §eYuki§r (raposa branca) te dá §e3 quests por dia§r: caçar, minerar e explorar a masmorra. Todos recebem as mesmas.",
      },
      {
        q: "Onde encontro a Yuki?",
        a: "No §etemplo do topo da montanha§r. Clique nela pra ver o quadro de aventureiros.",
      },
      {
        q: "Tem bônus por completar todas?",
        a: "§aSim!§r Entregar as 3 no mesmo dia dá bônus extra de Caudas.",
      },
    ],
  },
  {
    nome: "Clãs",
    icone: "cla",
    perguntas: [
      {
        q: "Como crio um clã?",
        a: "Menu → Clã → Criar. Custa Caudas. Escolha nome, tag (sigla) e cor.",
      },
      {
        q: "O que os clãs oferecem?",
        a: "Território protegido, casa do clã, banco compartilhado, guerras, alianças, bandeira e ranking.",
      },
      {
        q: "Como funciona a guerra?",
        a: "O líder declara guerra. Após aviso, abates entre clãs contam pontos. Mais pontos = vitória e baú de guerra.",
      },
      {
        q: "O que é Capture the Flag?",
        a: "Modo de guerra onde além de abates, cada clã tenta roubar a bandeira do outro na base inimiga.",
      },
    ],
  },
  {
    nome: "Personalização",
    icone: "tema",
    perguntas: [
      {
        q: "O que é o Selo Kitsune?",
        a: "Selo cosmético: §eapelido personalizado§r e §etema de cor§r. Só visual, §anenhuma vantagem§r no jogo.",
      },
      {
        q: "Como mudo meu apelido?",
        a: "Com o Selo Kitsune ativo, acesse pelo Perfil. Escolha apelido e cor.",
      },
      {
        q: "Como mudo o tema do menu?",
        a: "Menu → Ajustes. 5 temas: Laranja, Black, Sakura, Lunar e Espírito.",
      },
    ],
  },
  {
    nome: "Servidor",
    icone: "regras",
    perguntas: [
      {
        q: "O que são Eras?",
        a: "Temporadas semanais que mudam mecânicas. Cada Era traz modificadores diferentes (mais XP, mudanças no PvP, etc.).",
      },
      {
        q: "Onde vejo as regras?",
        a: "Menu → Servidor → Regras.",
      },
      {
        q: "O que é o Canto Comunitário?",
        a: "§eBaú de doações§r (doe pra meta coletiva), §emural de recados§r, §efogueira§r (XP por conversar) e §ecaixa de sugestões§r.",
      },
      {
        q: "Como resgato um código?",
        a: "Menu → Servidor → Código. Digite e receba a recompensa.",
      },
      {
        q: "Meus itens somem se eu sair?",
        a: "§aNão.§r Ficam com você. Cuidado com morte no void fora da masmorra.",
      },
      {
        q: "Tem P2W?",
        a: "§aNão.§r O Selo Kitsune é só cosmético. Tudo se conquista jogando.",
      },
      {
        q: "Perdi minha base sem querer",
        a: "Ações com casas agora pedem confirmação. Se foi bug, peça ajuda no Discord.",
      },
      {
        q: "Posso quebrar blocos na Masmorra?",
        a: "§cNão.§r Blocos protegidos. Só interaja com altares e baús.",
      },
      {
        q: "Como funciona o Leilão?",
        a: "Menu → Mercado → Leilão. §eVender§r: segure item → defina preço. §eComprar§r: navegue categorias. Tem taxa de anúncio e venda.",
      },
      {
        q: "Como falo com a staff?",
        a: "Chat do jogo ou Discord. A staff tem selo especial no nome.",
      },
      {
        q: "Onde fica o Discord?",
        a: "Link nas regras ou pergunte no chat.",
      },
    ],
  },
];
