// @ts-check
// Textos das mesas de jogo (xadrez e jogo da velha).

export const NOME_JOGO = { xadrez: "Xadrez", velha: "Jogo da Velha" };

// ------------------------------------------------------------------------------ jogadores
export const MESAS_FECHADAS = "As mesas de jogo estão fechadas no momento.";
export const SENTAR_ANTES = "Sente numa almofada da mesa primeiro, depois clique na mesa para entrar na partida.";
export const ASSENTO_OCUPADO = "Essa almofada já está ocupada.";
export const JA_SENTADO = "Você já está sentado em outra mesa.";
export const NAO_SENTOU = "Não consegui te sentar ali. Tente de novo!";
/** @param {string} jogo */
export const SENTOU = (jogo) => `§6${jogo} §8» §7Você sentou. Clique na mesa para entrar na partida. Para sair, agache.`;
export const PARTIDA_EM_ANDAMENTO = "A partida desta mesa já começou.";
export const OUTRA_MESA = "Esta mesa é de outra pessoa jogando. Espere acabar!";
/** @param {string} jogo */
export const TITULO_MENU = (jogo) => jogo;
export const MENU_CORPO = "§7A partida começa quando as duas pessoas sentadas entrarem. Quem sair da almofada, desconectar ou fechar o menu na própria vez perde.";
export const BOTAO_ENTRAR = "Entrar na partida";
export const BOTAO_LEVANTAR = "Levantar da mesa";
export const BOTAO_DESISTIR = "Desistir da partida";
export const ENTROU = "§aVocê entrou! Esperando a outra pessoa...";
/** @param {string} nome */
export const OUTRO_ENTROU = (nome) => `§6Mesa §8» §f${nome} §7entrou na partida.`;
/** @param {number} s */
export const CONTAGEM = (s) => `§6A partida começa em §e${s}§6...`;
export const CONTAGEM_CANCELADA = "§cA partida foi cancelada: alguém saiu da mesa.";

/**
 * @param {string} jogo
 * @param {string} nome
 * @param {string} marca
 */
export const COMECOU = (jogo, nome, marca) => `§6${jogo} §8» §7Valendo! Você joga contra §f${nome}§7 (${marca}).`;
export const SUA_VEZ = "§aSua vez!";
export const VEZ_DO_OUTRO = (nome) => `§7Vez de §f${nome}`;
/** @param {string} tempo */
export const BARRA_VELHA = (vez, tempo) => `${vez} §8| §e${tempo}`;
/**
 * @param {string} voce
 * @param {string} outro
 * @param {boolean} suaVez
 */
export const BARRA_XADREZ = (voce, outro, suaVez) => `§7Você §e${voce} §8| §7Rival §f${outro} §8| ${suaVez ? "§aSua vez" : "§7Vez do rival"}`;
export const JOGADA_JA_FEITA = "A partida já terminou ou a vez passou.";

// ---------------------------------------------------------------------- jogo da velha
export const TITULO_VELHA = "Jogo da Velha";
/** @param {string} marca @param {number} seg */
export const CORPO_VELHA = (marca, seg) => `§7Você é o §f${marca} §8| §e${seg}s§7 por jogada`;

// ------------------------------------------------------------------------------ xadrez
export const TITULO_XADREZ = "Xadrez";
export const TITULO_XADREZ_DESTINO = "Xadrez: para onde?";
export const BOTAO_VOLTAR_PECA = "Escolher outra peça";
/** @param {string} cor @param {string} tabuleiro @param {string} ultimo @param {string} aviso */
export const CORPO_XADREZ = (cor, tabuleiro, ultimo, aviso) =>
  [`§7Você joga de §f${cor}§7. Escolha uma peça. Fechar este menu na sua vez é derrota.`, aviso, ultimo, "", tabuleiro].filter((l) => l !== "").join("\n");
export const TITULO_PROMOCAO = "Promover o peão";
export const CORPO_PROMOCAO = "§7Escolha a nova peça. Fechar este menu é derrota.";
export const DICA_ESCOLHA = "§7toque numa peça sua";
export const DICA_DESTINO = "§7toque no destino";
/** @param {string} cor @param {string} dica @param {string} ultimo */
export const CORPO_GRADE_XADREZ = (cor, dica, ultimo) => [`§7Você: §f${cor} §8| ${dica}`, ultimo].filter((l) => l !== "").join("\n");
export const BOTAO_DESISTIR_CURTO = "Desistir";
export const AVISO_XEQUE = "§cSeu rei está em xeque!";
/** @param {string} lance */
export const ULTIMO_LANCE = (lance) => `§8Último lance: §7${lance}`;
/** @param {string} peca @param {string} casa @param {number} n */
export const BOTAO_PECA = (peca, casa, n) => `${peca} ${casa} (${n})`;
export const BRANCAS = "brancas";
export const PRETAS = "pretas";
/** @param {string} peca @param {string} de @param {string} para @param {string} extra */
export const DESCRICAO_LANCE = (peca, de, para, extra) => `${peca} ${de}→${para}${extra ? ` ${extra}` : ""}`;

// ------------------------------------------------------------------------------- fim
/** @param {string} nome @param {string} motivo */
export const PERDEU_POR = (nome, motivo) => `§6Mesa §8» §f${nome} §7perdeu: ${motivo}.`;
export const MOTIVO_SAIU = "saiu da almofada";
export const MOTIVO_DESCONECTOU = "desconectou";
export const MOTIVO_FECHOU = "fechou o menu na própria vez";
export const MOTIVO_TEMPO = "o tempo acabou";
export const MOTIVO_DESISTIU = "desistiu";
export const MOTIVO_MATE = "xeque-mate";
export const MOTIVO_LINHA = "o rival completou uma linha";
/** @param {string} nome @param {string} jogo */
export const VITORIA = (nome, jogo) => `§6${jogo} §8» §a${nome} venceu a partida!`;
/** @param {string} jogo @param {string} motivo */
export const EMPATE = (jogo, motivo) => `§6${jogo} §8» §eEmpate: ${motivo}.`;
export const EMPATE_VELHA = "deu velha";
export const EMPATE_AFOGAMENTO = "rei afogado";
export const EMPATE_MATERIAL = "material insuficiente para dar mate";
export const EMPATE_50 = "50 lances sem captura nem peão";
export const EMPATE_REPETICAO = "a mesma posição três vezes";
export const TITULO_VENCEU = "§6VITÓRIA!";
export const TITULO_PERDEU = "§7Derrota";
export const TITULO_EMPATE = "§eEmpate";
/** @param {number} n */
export const SUB_VITORIAS = (n) => `§7Suas vitórias: §e${n}`;

// ------------------------------------------------------------------ texto da mesa
/** @param {string} jogo */
export const TITULO_FLUTUANTE = (jogo) => `§6${jogo}`;
export const FLUT_LIVRE = "§7sente numa almofada";
/** @param {string} nome */
export const FLUT_ESPERANDO = (nome) => `§f${nome} §7espera (1/2)`;
export const FLUT_AMBOS_SENTADOS = "§7clique na mesa";
/** @param {string} a @param {string} b */
export const FLUT_CONTRA = (a, b) => `§f${a} §8x §f${b}`;
/** @param {string} nome @param {string} tempo */
export const FLUT_VEZ = (nome, tempo) => `§7vez de §e${nome} §8• §7${tempo}`;
export const FLUT_MESA_SEM_CONFIG = "§8(mesa em montagem)";

// -------------------------------------------------------------------- painel da staff
export const TITULO_STAFF = "Mesas de jogo (staff)";
export const BOTAO_STAFF = "Mesas de jogo";
export const CORPO_LISTA =
  "§7Cada mesa tem um tabuleiro (clique), duas almofadas (assentos) e um jogo. Marque olhando para o bloco.";
/** @param {number} n @param {string} jogo @param {boolean} mesa @param {number} assentos */
export const BOTAO_MESA = (n, jogo, mesa, assentos) => `Mesa ${n}: ${jogo} ${mesa && assentos === 2 ? "§a(pronta)" : `§7(mesa ${mesa ? "ok" : "falta"}, assentos ${assentos}/2)`}`;
/** @param {number} n */
export const TITULO_MESA = (n) => `Mesa ${n}`;
export const BOTAO_TIPO = "Trocar o jogo desta mesa";
export const ROTULO_TIPO = "Qual jogo?";
export const BOTAO_MARCAR_MESA = "Marcar a mesa (olhe para o bloco do tabuleiro)";
/** @param {number} i */
export const BOTAO_MARCAR_ASSENTO = (i) => `Marcar o assento ${i} (olhe para a almofada)`;
export const BOTAO_REMOVER_MESA = "Remover esta mesa";
export const BOTAO_CONFIG = "Configurações das mesas";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 8 blocos de distância.";
export const MESA_MARCADA = "§aMesa marcada. Clicar nela abre o menu da partida.";
/** @param {number} i */
export const ASSENTO_MARCADO = (i) => `§aAssento ${i} marcado. Quem clicar na almofada senta aí.`;
export const MESA_REMOVIDA = "§aMesa removida.";
export const TIPO_TROCADO = "§aJogo da mesa trocado.";
export const MESA_EM_USO = "Há uma partida ou gente sentada nesta mesa. Espere acabar para mexer.";
/** @param {number} n @param {string} jogo @param {boolean} mesa @param {boolean} a1 @param {boolean} a2 */
export const CORPO_MESA = (n, jogo, mesa, a1, a2) =>
  [
    `§fJogo: §e${jogo}`,
    `§fMesa (tabuleiro): ${mesa ? "§amarcada" : "§cnão marcada"}`,
    `§fAssento 1: ${a1 ? "§amarcado" : "§cnão marcado"}`,
    `§fAssento 2: ${a2 ? "§amarcado" : "§cnão marcado"}`,
  ].join("\n");
