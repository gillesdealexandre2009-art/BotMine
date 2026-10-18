// @ts-check
// Textos do Intervalo (a dimensão intermediária da lore da VULPUS). Fonte: addon/docs/lore/biblia_de_lore_vulpus.md
// (seções 12 e 13). Os trechos marcados "bíblia" são os da bíblia, sem mudar uma palavra; o resto é texto novo, no mesmo tom.

export const NOME = "O Intervalo";

/** As cinco regiões, na ordem do caminho (A a E). */
export const REGIOES = [
  { id: "A", nome: "Corredores" },
  { id: "B", nome: "Piscina Vazia" },
  { id: "C", nome: "Casa de Máquinas" },
  { id: "D", nome: "Estação" },
  { id: "E", nome: "Sala de Espera" },
];

/** Narradora, uma fala por região (bíblia 13.6). */
export const NARRADORA = [
  "§8§o(as portas se parecem tanto que a gente começa a achar que é o corredor que anda.)",
  "§8§o(tem eco aqui. mas é o eco de quem foi embora.)",
  "§8§o(alguém cuida disto. ninguém sabe quem.)",
  "§8§o(todos os trens saíram. a estação continua esperando.)",
  "§8§o(o silêncio agora tem forma de cadeira.)",
];

// ---- interface (bíblia 13.3)
/** O número nunca bate com o relógio de verdade. @param {number} n */
export const AQUI_HA = (n) => `§7§oVocê está aqui há ${n} minutos.`;
export const NAO_CONSTRUIDO = "§7§o...ainda não há nada deste lado. Volte quando alguém tiver construído o Intervalo.";
export const NOME_LEMBRADO = "§7§oAlguém foi lembrado.";
export const FALTA_ALGUEM = "§7§oFalta alguém.";
export const TITULO_CHEGADA = "§7O Intervalo";
export const SUB_CHEGADA = "§8você está esperando";
/** Falha rara e curta do painel (bíblia 13.3). @param {number} online */
export const HUD_FALHA = (online) => `§7Nível ░ · Caudas ░░ · ${online} online`;

// ---- placas e sinalização (bíblia 13.4)
export const PLACA_AREA = "§7ÁREA 1 — 2 — 1 — 2";
export const PLACA_PORTA_14 = "§c14\n§7PISCINA (EM REFORMA DESDE SEMPRE)";
export const PLACA_ESTACAO = "§7PRÓXIMO TREM: ————\n§cDESTINO: RISCADO";
export const PLACA_MAQUINAS = "§6NÃO DESLIGUE.\n§6ALGUÉM AINDA USA.";
export const PLACA_ESPERA = "§7SENTE-SE.\n§7ELES JÁ VÃO CHEGAR.";
/** @param {number} n */
export const PLACA_SALA = (n) => `§7SALA ${n}`;
/** @param {number} n */
export const PLACA_VALVULA = (n) => `§bVÁLVULA\n§fRAIA ${n}`;
export const PLACA_PLATAFORMA = "§7PLATAFORMA 0";
export const PLACA_CONFIRMAR = "§6CONFIRMAR";
/** @param {number} k */
export const PLACA_INTERRUPTOR = (k) => `§6${k}`;
/** @param {number} k */
export const PLACA_LUZ = (k) => `§e${k}`;
export const PLACA_MANUTENCAO = "§6MANUTENÇÃO";
export const PLACA_LETRAS = (/** @type {number} */ n) => `§8${Array.from({ length: n }, () => "▢").join(" ")}`;

// ---- "salas para você": só a própria pessoa lê, só quando está perto
/** @param {string} nome */
export const SALA_PARA_VOCE = (nome) => `§7§o(a sala está arrumada para §f${nome}§7§o)`;
/** @param {string} nome */
export const ULTIMA_PLACA = (nome) => `§7§o(a última placa, apagada, tem um nome: §f${nome}§7§o)`;

// ---- os registros R-1 a R-10 (bíblia 13.5; texto da bíblia, sem alterar)
/** @type {readonly { id: number, titulo: string, texto: string }[]} */
export const REGISTROS = [
  {
    id: 1,
    titulo: "Carta de Alba a Íris",
    texto: "Íris, deixei a toalha na raia quatro. Você sempre esquecia, e eu sempre voltava para buscar. Hoje foi diferente: voltei e já não havia raia nem toalha. Se estiver lendo isto, fico feliz por uma coisa só: alguém ainda lê.",
  },
  {
    id: 2,
    titulo: "Caderno de Marta",
    texto: "Segunda, ou o que parece. Troquei as lâmpadas do corredor 3. Voltaram a queimar. Fico pensando se é a luz que queima ou se somos nós que esquecemos de trocar. Arrumei a sala 9 como pedido. Ninguém veio. Deixei o chá.",
  },
  {
    id: 3,
    titulo: "Mapa de Tomás",
    texto: "Medi o corredor 1 em 40 passos. Voltei: eram 43. Medi de novo: eram 38. Concluí que o erro sou eu. Mas anoto: toda vez que erro, a porta da piscina fica um pouco mais à esquerda.",
  },
  {
    id: 4,
    titulo: "Desenho de Beto",
    texto: "§9(giz azul, letras grandes)§r\nEu sei o caminho. Sigo a flor. A flor é amarela. Ela me disse que ia voltar.",
  },
  {
    id: 5,
    titulo: "Gravação 1",
    texto: "Oi... sou eu. Não sei se você está me ouvindo, mas... eu estou na estação. Fiquei esperando o trem que você disse que vinha. Não é raiva, tá? É que eu comecei a esquecer o seu rosto... e eu queria dizer o seu nome, pelo menos, antes que eu perca ele também.",
  },
  {
    id: 6,
    titulo: "Gravação 2",
    texto: "Ei... se você chegou até aqui, é porque alguém lembrou. Obrigada. De verdade. Eu nunca pedi para ser salva, sabe? Eu só queria ser lembrada. É diferente... um dia eu te explico.",
  },
  {
    id: 7,
    titulo: "Livro com final",
    texto: "...e quando fechei o livro, alguém do outro lado leu o meu nome em voz alta. Foi a primeira vez que o prédio ficou quieto.",
  },
  {
    id: 8,
    titulo: "Anotação rasurada de Tomás",
    texto: "Descobri por que os mapas mentem. Os mapas não estão errados. Eu é que não sou mais a mesma pessoa que os desenhou.",
  },
  {
    id: 9,
    titulo: "Placa de Beto",
    texto: "Quem esquece de mim fica com meu desenho.",
  },
  {
    id: 10,
    titulo: "Página de Alba",
    texto: "Os outros livros são de quem esqueceu. Este é de quem foi esquecida. Se você consegue ler isto, já está mais longe do que eu cheguei.",
  },
];

export const FECHAR = "Fechar";
/** @param {number} id */
export const TITULO_REGISTRO = (id) => `§7Registro R-${id}`;

// ---- nomes de quem esperou (bíblia 8.1 e 12.2, enigma 8): a ordem não importa
export const NOMES = ["Tomás", "Marta", "Beto", "Alba"];

/** Onde cada nome aparece, como objeto. */
export const CRACHA_TOMAS = "Um crachá preso à mesa, a foto raspada:\n\n§fTOMÁS§r\n§7Cartografia. Visitante permanente.";
export const ASSINATURA_MARTA = "§7(no alto da página, a letra firme de quem assina os relatórios: §fMarta§7, zeladora)";
export const ASSINATURA_BETO = "§7(no canto do desenho, em letras maiores que as outras: §fBETO§7)";
export const VASO_ALBA = "Um vaso com uma flor dourada, murcha, mas ainda inteira. Há uma etiqueta no pé, escrita à mão:\n\n§fALBA§r\n§7(a letra treme, como a de quem escreve com pressa para não esquecer)";

// ---- objetos sem registro numerado
export const TOALHA = "Uma toalha dobrada, ainda seca, com duas letras bordadas em fio azul:\n\n§fÍ.A.§r\n§7Ninguém a usou desde sempre.";
export const VASO_SECO = "Um vaso seco. Ficou a marca redonda onde a água esteve.";
export const TRANCADA = "§7§oA porta está trancada por dentro. Não se ouve ninguém.";
export const LIVRO_LACRADO = "O livro está preso por uma fita de manutenção. Alguém precisaria ajudar a abrir isto, do outro lado do prédio.";
export const LIVRO_LACRADO_TITULO = "Livro lacrado";

// ---- enigma 4: os mapas de Tomás (bíblia 12.2). Datas nas bordas, cada uma de uma cor.
/** @type {readonly { sala: number, data: string, cor: string, texto: string }[]} */
export const MAPAS = [
  { sala: 8, data: "04", cor: "§9", texto: "Nas bordas, em azul: §904§r.\nA piscina está marcada saindo da sala 8, no corredor leste. O traço é curto e firme." },
  { sala: 12, data: "09", cor: "§a", texto: "Nas bordas, em verde: §a09§r.\nA piscina mudou de lugar: agora o traço sai da sala 12 e sobe para o leste. Apaguei o anterior com a mão." },
  { sala: 3, data: "21", cor: "§c", texto: "Nas bordas, em vermelho: §c21§r.\nO traço atravessa o cruzamento e termina na porta 14, num círculo. Não risquei mais nada." },
];
export const MAPA_TITULO = (/** @type {number} */ sala) => `§7Mapa da sala ${sala}`;
export const MAPA_RASGADO = "Um quarto mapa, rasgado. Sobrou só uma seta, apontando para a direita, e a metade de um número que não dá para ler.";
export const MAPA_RASGADO_TITULO = "§7Mapa rasgado";
/** A ordem certa, pela data das bordas (a sala de cada mapa). */
export const ORDEM_MAPAS = [8, 12, 3];

export const MESA_TOMAS_TITULO = "§7Mesa de Tomás";
export const MESA_TOMAS_CORPO = "Uma mesa de cartógrafo, com a luz de uma lâmpada que ninguém acendeu. Há um crachá, uma anotação e espaço para três mapas.";
export const BOTAO_CRACHA = "Olhar o crachá";
export const BOTAO_ANOTACAO = "Ler a anotação";
export const BOTAO_ORDENAR = "Pôr os mapas em ordem";
export const ORDENAR_TITULO = "§7Os mapas, em ordem";
export const ORDENAR_ROTULO = (/** @type {number} */ i) => `${i}º mapa`;
/** @param {number} sala */
export const ORDENAR_OPCAO = (sala) => `Mapa da sala ${sala}`;
export const ORDENAR_REPETIDO = "§7§oCada mapa só entra uma vez.";
export const ORDENAR_ERRADO = "§7§oOs traços não se encontram. Os mapas ficam na mesa, como estavam.";
export const ORDENAR_CERTO = "§7§oOs traços se encontram, um depois do outro. A porta 14 deixa de ser só parede.";

// ---- enigma 5: a piscina
export const BANCA_TITULO = "§7Banca de salva-vidas";
export const BANCA_CORPO = "Uma banca baixa, de madeira clara. Em cima, um livro aberto.";
export const BOTAO_LER_LIVRO = "Ler o livro";
export const VALVULA_ERRADA = "§7§oA água sobe um pouco, hesita e desce. Nada acontece.";
export const VALVULA_CERTA = [
  "§7§oVocê gira a válvula. Em algum lugar, a água começa a subir.",
  "§7§oQuando você olha de novo, a piscina está como antes. Mas a passagem sob a raia 4 não é mais parede.",
];
export const VALVULA_JA = "§7§oA válvula já está aberta. A água sobe sem tocar em nada.";
export const ESCOTILHA_TRANCADA = "§7§oA passagem de manutenção está lacrada. A piscina precisa estar cheia.";

// ---- enigma 6: a Casa de Máquinas
export const CADERNO_TITULO = "§7Caderno de Marta";
export const CADERNO_CORPO = "Um caderno de capa mole, aberto em cima da mesa. Uma xícara de chá, ainda morna, ao lado.";
export const BOTAO_LER_CADERNO = "Ler o caderno";
export const BOTAO_PAGINA_RASURADA = "Virar para a página rasurada";
export const PAGINA_RASURADA = "Quinta, ou o que parece.\n\nPara ligar tudo, na ordem de sempre: §81, 2, 3, 4§r (riscado). Errei. A ordem é: o §f3§r, depois o §f1§r, depois o §f4§r, e por último o §f2§r.\n\nUma pessoa só consegue, correndo entre as salas. Mas tudo aqui foi feito para ser dividido.";
/** Ordem dos interruptores (bíblia 12.2, enigma 6; a ordem em si é nossa). */
export const ORDEM_INTERRUPTORES = [3, 1, 4, 2];
export const INTERRUPTOR_CERTO = "§7§o(o interruptor encaixa. algo, em outra sala, responde.)";
export const INTERRUPTOR_ERRADO = "§7§o(os interruptores estalam e voltam à posição de antes.)";
export const INTERRUPTOR_ARMADO = "§7§o(os quatro estão na posição. falta confirmar no outro painel.)";
export const INTERRUPTOR_JA = "§7§o(já estão na posição. falta confirmar no outro painel.)";
export const CONFIRMAR_SEM_ARMAR = "§7§oO painel não responde. Os interruptores ainda não estão na posição.";
export const CONFIRMAR_TARDE = "§7§oO painel espera, espera, e desiste. Os interruptores voltaram sozinhos.";
export const CONFIRMAR_CERTO = [
  "§7§oAs quatro luzes acendem juntas.",
  "§7§oEm algum lugar, longe daqui, o painel de uma estação volta a ter luz.",
];
export const CONFIRMAR_JA = "§7§oAs luzes já estão acesas.";
export const CONFIRMAR_EM_DUPLA = "§7§oVocês dois ouviram o prédio ficar quieto por um instante.";
export const LUZES_AJUDA = "§7§o(nas luzes, o ritmo de uma ordem: 3, 1, 4, 2.)";
export const LIVRO7_TITULO = "§7Livro com final";

// ---- enigma 7: a Estação
export const PAINEL_APAGADO = "§7§oO painel está apagado. Em algum lugar, uma casa de máquinas ainda não foi ligada.";
export const PAINEL_TITULO = "§7Painel de destinos";
/** Cada linha foi riscada, menos uma letra. Lidas de cima para baixo, as letras que sobraram escrevem a palavra. */
export const PAINEL_LINHAS = [
  "§fS§8▒▒▒▒▒▒▒▒▒",
  "§8▒▒▒▒▒§fO§8▒▒▒▒▒",
  "§8▒▒§fN§8▒▒▒▒▒",
  "§8▒▒▒▒▒▒§fH§8▒▒▒",
  "§8▒▒▒▒▒▒▒▒▒§fE",
];
export const PAINEL_CORPO = `${PAINEL_LINHAS.join("\n")}\n§8▒▒▒▒▒ §7(sob uma fita)\n\n§7PRÓXIMO TREM: ————\n§cDESTINO: RISCADO`;
export const FITA_TITULO = "§7A fita";
export const FITA_CORPO = "Uma fita de manutenção cobre a última linha do painel. Cinco letras, nenhuma à mostra.";
export const FITA_ROTULO = "Que destino ninguém riscou?";
export const FITA_DICA = "o destino";
/** Só o código desta palavra fica no estado (a palavra em si está aqui, na tela, como a de qualquer terminal). */
export const PALAVRA_FITA = "SONHE";
export const FITA_ERRADA = "§7§oA fita não se mexe.";
export const FITA_CERTA = [
  "§7§oA fita se solta sozinha, como se esperasse.",
  "§7§oO destino que ninguém riscou existe. E, no painel, uma nova linha acende: §fSALA DE ESPERA§7§o.",
];
export const FITA_JA = "§7§oA fita já se soltou. Embaixo, a última linha: §fSONHE§7§o.";
export const PORTA_ESTACAO_TRANCADA = "§7§oA porta de serviço não abre. O painel ainda não mostra para onde ela leva.";

// ---- enigma 8: a porta dos nomes
export const PORTA_NOMES_TITULO = "§7A porta";
export const PORTA_NOMES_CORPO = "Uma porta lisa, sem maçaneta nem fechadura. Ao lado, quatro placas apagadas. Em volta, cadeiras vazias.";
export const BOTAO_DIZER_NOMES = "Dizer os nomes";
export const NOMES_TITULO = "§7Quem esperou?";
export const NOMES_ROTULO = (/** @type {number} */ i) => `Nome ${i}`;
export const NOMES_DICA = "um nome";
/** O que cada nome deixou no prédio (na ordem de NOMES): o objeto onde ele aparece escrito. */
export const OBJETO_DO_NOME = ["um crachá", "um caderno", "um desenho", "um vaso"];
/** @param {string} lista */
export const PORTA_FALTAM = (lista) => `\n§8Ainda não vi escrito: ${lista}`;
/** @param {number} n */
export const NOMES_PARCIAL = (n) => `§8§o(${n} de ${NOMES.length} certos)`;
export const NOME_NAO_VISTO = "§7§oTem um nome certo aí, mas você ainda não o viu escrito em lugar nenhum.";
export const NOMES_CERTO = [
  "§7§oVocê diz os nomes, um depois do outro.",
  "§7§oA porta abre. As quatro placas acendem. Em algum lugar, o telefone da mesa toca uma vez.",
];
export const NOMES_JA = "§7§oA porta está aberta. Ela espera por você.";
export const PLACA_APAGADA_TITULO = "§7Placa apagada";
/** @param {number} n */
export const PLACA_APAGADA = (n) => `Uma placa apagada. Dá para adivinhar o contorno de ${n} letras.`;
export const VISITAS_TITULO = "§7Livro de visitas";
export const VISITAS_FECHADO = "O livro de visitas está aberto, mas as letras não ficam paradas para serem lidas. Talvez, mais tarde.";
/** Os mesmos nomes, em outro alfabeto (bíblia 12.2, enigma 8, dica 3). */
export const VISITAS_ABERTO = "Os nomes, um embaixo do outro, em outro alfabeto:\n\n§fТомас\nМарта\nБето\nАльба§r\n\n§7E embaixo, em letra pequena: \"quem lembrar, venha.\"";

// ---- as três dicas de cada enigma (bíblia 12.2). Liberadas por tempo ou por botão.
/** @type {readonly { nome: string, dicas: readonly [string, string, string] }[]} */
export const ENIGMAS = [
  {
    nome: "O mapa de Tomás",
    dicas: [
      "Os números nas bordas dos mapas têm cores diferentes. Alguém quis que você os visse.",
      "Há um quarto mapa, rasgado, no corredor oeste. Ele só mostra uma direção.",
      "Uma seta de giz, no chão do corredor leste, aponta para o primeiro dos mapas.",
    ],
  },
  {
    nome: "A piscina vazia",
    dicas: [
      "A raia 4 tem a única escada que está limpa.",
      "O livro certo fica na banca de salva-vidas.",
      "Um desenho de Beto mostra uma seta para baixo, na raia.",
    ],
  },
  {
    nome: "A Casa de Máquinas",
    dicas: [
      "O caderno de Marta tem a ordem rasurada, mas legível.",
      "As luzes piscam no ritmo da ordem.",
      "Na parede, uma frase na letra de Marta: \"Comece pelo três. O resto você lembra.\"",
    ],
  },
  {
    nome: "A Estação",
    dicas: [
      "A fita está de um lado do painel.",
      "A letra inicial aparece em outra parte da Estação, grande, na parede.",
      "O telefone da plataforma toca uma vez.",
    ],
  },
  {
    nome: "A porta dos nomes",
    dicas: [
      "As placas têm o número de letras de cada nome.",
      "Cada região deixou um objeto com um nome: um crachá, um desenho, um caderno, um vaso.",
      "Um livro de visitas, na mesa, lista os nomes. Para quem desistir, ele os tem em outro alfabeto.",
    ],
  },
];
/** @param {string} enigma @param {number} n */
export const DICA_TITULO = (enigma, n) => `§7${enigma} §8· dica ${n}/3`;
export const BOTAO_DICA = "Preciso de uma dica";
export const DICAS_TITULO = "§7Dicas";
export const DICAS_NENHUMA = "Nenhuma dica ainda. Olhe em volta: o prédio nunca esconde o que já mostrou.";
/** @param {number} n @param {string} texto */
export const DICA_LINHA = (n, texto) => `§f${n}. §7${texto}`;
export const BOTAO_PROXIMA_DICA = "Mostrar a próxima dica";
export const DICAS_ACABARAM = "§8Essas são todas as dicas.";
/** Dica que chega sozinha, com o tempo. @param {string} texto */
export const DICA_SOLTA = (texto) => `§8§o(uma nota, na parede: ${texto})`;
export const BOTAO_VOLTAR = "Voltar";

// ---- portas entre as regiões
export const PORTA_TRANCADA = "§7§oA porta não cede. Ainda não.";
export const PORTA_PASSA = "§7§oA porta cede.";
export const PORTAS = {
  A_B: "§7§oA porta 14 está fechada. Parece que ela só abre para quem já entendeu onde fica a piscina.",
  B_C: ESCOTILHA_TRANCADA,
  D_E: PORTA_ESTACAO_TRANCADA,
};

// ---- bloqueios
export const SO_O_INTERVALO = "§7§o...o prédio não deixa.";

// ---- painel do dono
export const TITULO_PAINEL = "§l§0O Intervalo";
/** @param {{ construido: boolean, construindo: boolean, origem: string, comecaram: number, concluiram: number, ele: boolean }} e */
export const CORPO_PAINEL = (e) =>
  `A dimensão intermediária da lore: cinco regiões no mundo comum, longe do spawn, escondidas do painel (casas, teleportes e /voltar não as reconhecem).\n\n` +
  `§7Estado: ${e.construindo ? "§econstruindo..." : e.construido ? "§aconstruído" : "§cainda não construído"}\n` +
  `§7Origem: §f${e.origem}\n` +
  `§7Começaram: §f${e.comecaram} §7· Concluíram: §f${e.concluiram}\n` +
  `§7"Ele": ${e.ele ? "§aligado" : "§cdesligado"}`;
export const BOTAO_CONSTRUIR = (/** @type {boolean} */ jaFoi) => (jaFoi ? "Refazer o Intervalo" : "Construir o Intervalo");
export const BOTAO_IR = "Ir ao Intervalo (teste)";
export const BOTAO_ORIGEM = "Origem: marcar onde estou";
export const BOTAO_REGIOES = "Regiões (névoa, claridade, filtro)";
export const BOTAO_ELE = (/** @type {boolean} */ ligado) => `"Ele" (muda o ambiente quando olhado): ${ligado ? "§aligado" : "§cdesligado"}`;
export const BOTAO_HUD = (/** @type {boolean} */ ligado) => `Falha rara e curta do painel: ${ligado ? "§aligada" : "§cdesligada"}`;
export const BOTAO_DICA_MIN = (/** @type {number} */ min) => `Dica sozinha a cada: §f${min > 0 ? `${min} min` : "só por botão"}`;
export const BOTAO_JANELA = (/** @type {number} */ s) => `Janela do enigma 6 (solo): §f${s} s`;
export const BOTAO_PORTAS_LIVRES = (/** @type {boolean} */ livres) => `Portas abertas para mim (teste): ${livres ? "§aabertas" : "§cnormais"}`;
export const BOTAO_ZERAR_MEU = "Zerar meu progresso";
export const BOTAO_ZERAR_TODOS = "Zerar o progresso de todos";
export const CONFIRMAR_CONSTRUIR = (/** @type {boolean} */ jaFoi) =>
  jaFoi
    ? "Isto apaga o Intervalo que já existe (a área inteira vira ar) e constrói de novo na origem marcada. O progresso das pessoas é mantido. Leva alguns minutos de jogo, mas dá para continuar jogando. Refazer?"
    : "Construir as cinco regiões na origem marcada. Leva alguns minutos de jogo, mas dá para continuar jogando. Construir?";
export const CONFIRMAR_ORIGEM = "O Intervalo já está construído. Mudar a origem não move nada: para usar o lugar novo, refaça o Intervalo (o antigo é apagado). Marcar mesmo assim?";
export const CONFIRMAR_ZERAR_TODOS = "Isto apaga o progresso de TODAS as pessoas no Intervalo (nomes lembrados, registros lidos, enigmas e conclusão). Não dá para desfazer. Continuar?";
export const CONSTRUINDO = "§7Construindo o Intervalo. Acompanhe pela barra de ação; dá para fazer outras coisas enquanto isso.";
/** @param {string} fase @param {number} pct */
export const CONSTRUINDO_FASE = (fase, pct) => `§7Construindo: §f${fase} §8(${pct}%)`;
export const JA_CONSTRUINDO = "O Intervalo já está sendo construído. Espere terminar.";
export const CONSTRUIDO = "O Intervalo está pronto. Use \"Ir ao Intervalo\" para ver.";
/** @param {string} m */
export const FALHA_CONSTRUCAO = (m) => `Não deu para construir o Intervalo: ${m}`;
export const AREA_NAO_CARREGOU = "a área não carregou (tente de novo com alguém por perto)";
/** @param {string} c */
export const ORIGEM_MARCADA = (c) => `Origem do Intervalo marcada em ${c}. O chão da Região A fica nessa altura.`;
export const ZERADO_MEU = "Seu progresso no Intervalo foi zerado.";
export const ZERADO_TODOS = "O progresso de todos no Intervalo foi zerado.";
export const TITULO_REGIAO = (/** @type {string} */ nome) => `§l§0${nome}`;
export const BOTAO_NEVOA = (/** @type {string} */ nome) => `Névoa: §f${nome}`;
export const NEVOA_PADRAO = "Leve (padrão)";
export const NEVOA_NENHUMA = "Nenhuma";
export const TITULO_NEVOA = "§l§0Névoa";
export const CORPO_NEVOA = "A névoa da região (só quem está dentro vê). Dura enquanto a pessoa estiver na região.";
export const BOTAO_NEVOA_OPCAO = (/** @type {string} */ nome, /** @type {string} */ ajuda, /** @type {boolean} */ atual) => `${nome}${atual ? " §a✔" : ""}\n§8${ajuda}`;
export const NEVOA_DEFINIDA = (/** @type {string} */ nome) => `Névoa: ${nome}.`;
export const BOTAO_CLARIDADE = (/** @type {boolean} */ l) => `Claridade (visão noturna leve): ${l ? "§aligada" : "§cdesligada"}`;
export const BOTAO_FILTRO = (/** @type {boolean} */ l) => `Filtro de câmera antiga: ${l ? "§aligado" : "§cdesligado"}`;
export const TITULO_DICA_MIN = "Dica sozinha";
export const ROTULO_DICA_MIN = "Minutos dentro da região para a dica aparecer sozinha (0 = só pelo botão)";
export const TITULO_JANELA = "Janela do enigma 6";
export const ROTULO_JANELA = "Segundos que o painel espera pela confirmação (solo)";
export const NAO_CONSTRUIDO_DONO = "O Intervalo ainda não foi construído.";
export const SO_DONO = "Só dono mexe no Intervalo.";
export const IR_TESTE = "Você foi ao Intervalo (teste: o progresso não é marcado).";

// ---------------------------------------------------------------- guarda-volumes (as coisas ficam guardadas enquanto a pessoa está lá)
export const GUARDANDO = "§7§oSuas coisas ficam guardadas enquanto você estiver lá. Elas voltam quando você sair, por qualquer caminho.";
export const OCUPADO_GUARDA = "§7§o...você já está com as coisas guardadas por outro motivo (um minigame?). Saia dele primeiro.";
export const ITEM_SAIR = "§c§lSair do Intervalo §r§7(use)";
export const DICA_SAIR = "§8§oPara sair quando quiser: o §citem vermelho§8§o ou §f/vulpus:sairintervalo§8§o. Suas coisas voltam.";
export const VOLTOU_NO_LUGAR = "§7§oSuas coisas voltaram.";
export const NAO_ESTA_NO_INTERVALO = "§7Você não está no Intervalo.";
export const CMD_SAIR = "Sai do Intervalo e devolve as suas coisas";
export const SEM_COFRE_AGORA = "§7§o...os cofres não responderam agora. Suas coisas continuam guardadas; tente de novo em instantes.";
