// @ts-check
// Textos do mistério da Vulpus (ARG): lore, mensagens de cada capítulo e o painel do dono.

/** Capítulos, na ordem do caminho. */
export const CAPITULOS = [
  { id: "poco", nome: "O poço (a queda)" },
  { id: "lago", nome: "O lago dos pinheiros" },
  { id: "casa", nome: "A casa dos livros" },
  { id: "caverna", nome: "A caverna da luz" },
  { id: "corredor", nome: "O corredor 1x1" },
  { id: "sala", nome: "A sala branca" },
  { id: "trem", nome: "O trem" },
  { id: "campo", nome: "O campo de trigo" },
];

/** Mensagens da narradora, por capítulo (aparecem uma a uma, na primeira vez que a pessoa chega lá). */
export const FALAS = [
  ["§8§o(o chão cedeu. ninguém avisa que cair demora tanto.)", "§8§o(as luzes piscam amarelo, como se alguém estivesse contando.)"],
  ["§8§obem-vinda(o) ao que foi esquecido.", "§8§oa neve não é neve. é o que sobrou das lembranças."],
  ["§8§otodo livro aqui é de alguém que ninguém lembra.", "§8§oa flor dourada era dela. deixou na porta para você achar o caminho."],
  ["§8§oa luz no fundo é da Kiza. ainda acende, mesmo sem ninguém.", "§8§onão olhe para trás."],
  ["§8§ovocê está no meio do que não cabe.", "§4§oele não gosta de ser olhado."],
  ["§f§oVocê chegou.", "§7§oAqui o Branco guarda o que o mundo largou.", "§7§oVocê consegue encontrar a saída?"],
  ["§8§oo trem está parado desde antes de você.", "§8§oas janelas mostram um dia que não é o seu.", "§7§oanda até o fim. ele espera."],
  ["§6§oquanto trigo...", "§6§otão bonito que dói.", "§7§onão pise onde ele já te viu.", "§8§oa luz daqui não vem de nenhum sol."],
];

// terminal
export const TITULO_TERMINAL = "§l§0Terminal";
export const ROTULO_TERMINAL = "O que o Branco esconde?";
export const DICA_TERMINAL = "a palavra";
export const SO_NA_SALA = "§8§o...nada acontece.";
export const SEM_PORTA = "§7§oA porta ainda dorme. Volte quando a SONHE acordar.";
export const SEM_PORTA_SONHE = "§7§oA porta final ainda dorme. Volte quando a SONHE acordar.";
/** @param {number} min */
export const BLOQUEADO = (min) => `§8§o...o Branco não responde. Espere ${min} min.`;
/** @param {number} restam */
export const ERROU = (restam) => `§8§o...não é isso. (§7${restam}§8§o ${restam === 1 ? "tentativa" : "tentativas"})`;
export const ERROU_FIM = "§4§o...o Branco se fechou. Tente de novo mais tarde.";
export const JA_PASSOU = "§7§oVocê já lembrou. A porta está aberta.";
export const ACERTOU = [
  "§f§o...",
  "§f§oSim.",
  "§f§oObrigada por lembrar.",
  "§7§oHá um caminho que ninguém marcou no mapa.",
];
export const TITULO_FIM = "§f§lA porta se abriu";
export const SUB_FIM = "§7alguém lembrou de nós";
export const FRASE_PORTA = "§7§oA porta se abre para um lugar que anda.";
export const FRASE_PORTA_SONHE = "§7§oA porta leva a SONHE.";

// claridade por região
/** @param {boolean} ligada */
export const BOTAO_CLARIDADE = (ligada) => `Claridade total (visão noturna): ${ligada ? "§aligada" : "§cdesligada"}`;
/** @param {boolean} ligada */
export const CLARIDADE_MUDOU = (ligada) => (ligada ? "§aClaridade total ligada: de noite continua tudo claro nesta região." : "§aClaridade total desligada: a região segue o dia e a noite do jogo.");

// filtro de câmera antiga por região
/** @param {boolean} ligado */
export const BOTAO_FILTRO = (ligado) => `Filtro de câmera antiga: ${ligado ? "§aligado" : "§cdesligado"}`;
/** @param {boolean} ligado */
export const FILTRO_MUDOU = (ligado) => (ligado ? "§aFiltro de câmera antiga ligado: grão, vinheta e tom rosado nesta região." : "§aFiltro de câmera antiga desligado nesta região.");

// névoa por região
export const BOTAO_NEVOA = (atual) => `Névoa desta região: §e${atual}`;
export const TITULO_NEVOA = "Névoa da região";
export const CORPO_NEVOA = "§7A névoa esconde o que estiver além da distância dela: paredes e teto somem se ficarem mais longe que o alcance. Vale só dentro desta região.";
export const NEVOA_PADRAO = "Padrão do capítulo";
export const NEVOA_NENHUMA = "Nenhuma";
/** @param {string} nome @param {string} ajuda @param {boolean} atual */
export const BOTAO_NEVOA_OPCAO = (nome, ajuda, atual) => `${nome}${atual ? " §a✔" : ""}
§8${ajuda}`;
/** @param {string} nome */
export const NEVOA_DEFINIDA = (nome) => `§aNévoa da região: §e${nome}§a.`;
export const BOTAO_NEVOA_TESTE = "Testar a névoa escolhida em mim (30 s)";
export const NEVOA_TESTANDO = "§7Névoa ligada por 30 segundos.";

// painel do dono
export const TITULO_PAINEL = "Mistério da Vulpus (ARG)";
export const BOTAO_PAINEL = "Mistério (ARG)";
export const BOTAO_REGIOES = "Regiões dos capítulos";
export const BOTAO_TERMINAL = "Terminal: marcar o bloco que estou olhando";
export const BOTAO_RESPOSTA = "Resposta secreta";
export const BOTAO_DESTINO = "Destino da porta do terminal (rumo ao metrô): marcar onde estou";
export const BOTAO_DESTINO_SONHE = "Destino da porta final (SONHE): marcar onde estou";
export const BOTAO_DESTINO_SONHE_LIMPAR = "Limpar o destino da SONHE";
export const BOTAO_TELEFONE = "Telefone: marcar o bloco que estou olhando";
export const BOTAO_INTERVALO = "O Intervalo (construir e testar)";
export const BOTAO_REENVIAR_LIGACAO = "Zerar a ligação de mim (para testar o telefone)";
export const LIGACAO_ZERADA = "§aA ligação e a casa corrompida foram zeradas para você.";
export const DESTINO_SONHE_MARCADO = (/** @type {string} */ onde) => `§aA porta final leva para §e${onde}§a.`;
export const DESTINO_SONHE_LIMPO = "§aDestino da SONHE limpo (a porta final fica fechada).";
export const TELEFONE_MARCADO = (/** @type {string} */ onde) => `§aTelefone marcado em §e${onde}§a. Ele toca para quem chega ao campo de trigo e clicar nele começa a ligação.`;
export const BOTAO_DESTINO_LIMPAR = "Limpar o destino da porta";
export const BOTAO_FRASE = "Frase do corredor (notas)";
export const BOTAO_PROGRESSO = "Progresso das pessoas";
export const BOTAO_SIMULAR = "Simular um capítulo em mim";
export const BOTAO_CONFIG = "Configurações do mistério";
export const BOTAO_EFEITOS_EM_MIM = (ligados) => `Efeitos em mim: ${ligados ? "§aligados" : "§cdesligados (para construir)"}`;
export const TITULO_REGIOES = "Regiões dos capítulos";
/** @param {string} nome @param {boolean} marcada */
export const BOTAO_REGIAO = (nome, marcada) => `${marcada ? "§a✔ " : "§c✘ §r"}${nome}`;
/** @param {string} nome */
export const TITULO_REGIAO = (nome) => nome;
export const BOTAO_CANTO1 = "Canto 1: onde estou";
export const BOTAO_CANTO2 = "Canto 2: onde estou";
export const BOTAO_CAIXA = "Caixa em volta de mim (raio)";
export const BOTAO_REMOVER_REGIAO = "Remover esta região";
export const ROTULO_RAIO_XZ = "Raio nos lados (blocos)";
export const ROTULO_RAIO_Y = "Altura para cima e para baixo (blocos)";
/** @param {string} nome @param {string} onde */
export const CANTO_MARCADO = (nome, onde) => `§a${nome}: canto marcado em §e${onde}§a.`;
/** @param {string} nome */
export const REGIAO_PRONTA = (nome) => `§a${nome}: região definida.`;
/** @param {string} nome */
export const REGIAO_REMOVIDA = (nome) => `§a${nome}: região removida.`;
export const OLHE_PARA_BLOCO = "Olhe para o bloco do terminal, a até 12 blocos.";
/** @param {string} onde */
export const TERMINAL_MARCADO = (onde) => `§aTerminal marcado em §e${onde}§a. Clicar nele na sala branca abre a pergunta.`;
export const TITULO_RESPOSTA = "Resposta secreta";
export const ROTULO_RESPOSTA = "A palavra ou frase que abre a porta (sem acento nem maiúscula; fica guardada só como código)";
export const RESPOSTA_GRAVADA = "§aResposta gravada. Ninguém consegue ler de volta, nem você: se esquecer, defina outra.";
export const RESPOSTA_VAZIA = "A resposta não pode ficar vazia.";
export const TITULO_FRASE = "Frase do corredor";
export const ROTULO_FRASE = "Palavra tocada em notas (uma por letra) quem anda no corredor; vazio = sem notas";
export const FRASE_GRAVADA = "§aFrase do corredor atualizada.";
/** @param {string} onde */
export const DESTINO_MARCADO = (onde) => `§aA porta leva para §e${onde}§a.`;
export const DESTINO_LIMPO = "§aDestino da porta limpo (a porta fica fechada).";
export const SIMULANDO = (nome) => `§7Simulando §f${nome}§7 por 60 segundos. Saia da região para voltar ao normal.`;
export const SEM_PROGRESSO = "§7Ninguém começou ainda.";
export const TITULO_PROGRESSO = "Progresso do mistério";
export const BOTAO_ZERAR_TODOS = "Zerar o progresso de todo mundo";
export const CONFIRMAR_ZERAR = "Zerar o progresso do mistério de TODAS as pessoas? (conquistas já dadas ficam)";
export const ZERADO = "§aProgresso do mistério zerado.";
/** @param {string} nome @param {number} cap @param {boolean} fim */
export const LINHA_PROGRESSO = (nome, cap, fim) => `${fim ? "§a✔ " : "§7"}${nome} §8- §f${Math.min(cap, CAPITULOS.length)}§7/${CAPITULOS.length}${fim ? " §8(passou)" : ""}`;
/** @param {{ regioes: number, terminal: boolean, resposta: boolean, destino: boolean, comecaram: number, passaram: number }} e */
export const CORPO_PAINEL = (e) =>
  [
    "§7Regiões marcadas fazem a magia: dentro delas o scoreboard e as coordenadas ficam corrompidos, o clima muda por capítulo e quem chega na sala branca pode tentar a resposta no terminal.",
    "§7Sair da região (tpa, morte, spawn ou andando) volta tudo ao normal.",
    "",
    `§fRegiões: §${e.regioes === CAPITULOS.length ? "a" : "e"}${e.regioes}/${CAPITULOS.length}`,
    `§fTerminal: ${e.terminal ? "§amarcado" : "§cnão marcado"}`,
    `§fResposta: ${e.resposta ? "§adefinida" : "§cnão definida"}`,
    `§fPorta (SONHE): ${e.destino ? "§amarcada" : "§7fechada"}`,
    `§fComeçaram: §7${e.comecaram}  §fPassaram: §7${e.passaram}`,
  ].join("\n");

// o painel não reconhece o lugar
export const LUGAR_NAO_EXISTE = "§8§o...o painel não reconhece este lugar. Aqui não existe casa.";

// ------------------------------------------------------------------ o telefone e a casa corrompida
/** Nome da casa que aparece no menu depois da ligação (metade de "Aurora"). */
export const CASA_CORROMPIDA = "▒ura";
export const CASA_FIXA = "§8§o...essa casa não responde a nada que você faça.";
export const CASA_VAZIA = "§8§o...nada responde do outro lado.";
export const TELEFONE_MUDO = "§8§oO telefone está mudo. Só o chiado de uma linha muito longe.";
export const TELEFONE_SO_NO_CAMPO = "§8§o...o aparelho não toca para quem ainda não chegou ao campo.";
/** Id do som da ligação (a voz do projeto, gravada; ~24 s) no pacote de texturas. */
export const SOM_LIGACAO = "vulpus.ligacao";
/** Quando a gravação começa a tocar (ticks desde que a pessoa atende): depois do fade para o preto e do toque se afastando. */
export const LIGACAO_AUDIO_INICIO = 90;
/**
 * Cada fala como legenda: [ticks desde que atendeu, texto]. Os tempos seguem a gravação (a voz entra em 0,5 s, o "Alô, alô...?"
 * vai até ~4 s, a frase longa começa em ~4,6 s, "Não esqueça." em ~14,6 s e a última em ~18 s). O texto das quatro falas é o
 * definido no projeto, sem alteração.
 * @type {[number, string][]}
 */
export const LIGACAO = [
  [LIGACAO_AUDIO_INICIO + 10, "§f§o“Alô, alô...?”"],
  [LIGACAO_AUDIO_INICIO + 92, "§f§o“Eu não sei se alguém pode me ouvir, mas eu preciso que você não desista... por favor.”"],
  [LIGACAO_AUDIO_INICIO + 292, "§f§o“Não esqueça.”"],
  [LIGACAO_AUDIO_INICIO + 360, "§f§o“Eu marquei um lugar no seu mapa para você ir. Vá quando estiver pronto.”"],
];
/** Quando a ligação acaba e o aviso do menu de casas aparece (ticks): a gravação termina em ~24,2 s e o aviso vem 2 s depois. */
export const LIGACAO_FIM = LIGACAO_AUDIO_INICIO + 484 + 40;
export const LIGACAO_AVISO = "§7Algo apareceu no seu menu de casas.";
