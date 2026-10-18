// @ts-check
// Textos da aba de Obras (montanha e masmorra).

export const TITULO = "Obras: montanha e masmorra";
export const SO_STAFF_OBRA = "As obras são só da staff.";
export const SO_DONO = "Gerar e apagar obras é só de dono.";

/**
 * @param {{ centro: string, montanha: string, masmorra: string, trabalho: string }} e
 */
export const CORPO = (e) =>
  [
    "§7Monta a montanha com o ecossistema em volta e a masmorra subterrânea completa, direto no mundo.",
    "",
    `§fCentro: §7${e.centro}`,
    `§fMontanha: §7${e.montanha}`,
    `§fMasmorra: §7${e.masmorra}`,
    ...(e.trabalho ? ["", e.trabalho] : []),
  ].join("\n");

export const CENTRO_NENHUM = "ainda não marcado";
/** @param {number} x @param {number} z @param {number} y */
export const CENTRO_MARCADO = (x, z, y) => `x ${x}, z ${z} (chão em y ${y})`;
export const NAO_FEITA = "ainda não gerada";
/** @param {number} raio @param {number} altura @param {boolean} backup */
export const MONTANHA_FEITA = (raio, altura, backup) => `pronta (raio ${raio}, ${altura} de altura)${backup ? " §a• com cópia de segurança" : " §e• sem cópia (só nivelando)"}`;
/** @param {number} piso @param {boolean} backup */
export const MASMORRA_FEITA = (piso, backup) => `pronta (piso em y ${piso})${backup ? " §a• com cópia de segurança" : " §e• sem cópia (só enchendo de pedra)"}`;

export const BOTAO_CENTRO = "Marcar o centro aqui";
export const BOTAO_MONTANHA_MEDIDAS = "Medidas da montanha";
export const BOTAO_MASMORRA_MEDIDAS = "Medidas da masmorra";
export const BOTAO_VER_LIMITES = "Ver a área no chão";
export const BOTAO_GERAR_MONTANHA = "Gerar a montanha";
export const BOTAO_GERAR_MASMORRA = "Gerar a masmorra";
export const BOTAO_GERAR_TUDO = "Gerar tudo (montanha e masmorra)";
export const BOTAO_TELEPORTES = "Teleportes da obra";
export const BOTAO_ANDAMENTO = "Andamento";
export const BOTAO_ESQUECER = "Esquecer o registro";

export const CENTRO_OK = (/** @type {number} */ x, /** @type {number} */ z, /** @type {number} */ y) =>
  `Centro marcado em §f${x}, ${z}§r (chão em y §f${y}§r). A montanha e a masmorra ficam centradas aqui.`;
export const SEM_CENTRO = "Marque o centro da obra primeiro (botão \"Marcar o centro aqui\").";
export const SEM_CHAO = "Não achei o chão aqui. Chegue perto do lugar e marque de novo.";
export const OCUPADO = "Já tem uma obra rodando. Veja o andamento ou cancele antes de começar outra.";

export const TITULO_MONTANHA = "Medidas da montanha";
export const ROTULO_RAIO = "Raio da base (blocos)";
export const ROTULO_ALTURA = "Altura do pico acima do chão";
export const ROTULO_SEMENTE = "Semente do relevo (número; vazio ou 0 = sorteia uma)";
export const ROTULO_FLORESTA = "Floresta em volta (árvores, flores e rochedos)";
export const ROTULO_LAGO = "Lago e riacho com cachoeira";
export const ROTULO_TRILHA = "Trilha em espiral e mirante no topo";
export const ROTULO_DENSIDADE = "Densidade da floresta (árvores por mil blocos de grama)";
export const MEDIDAS_OK = "Medidas salvas.";

export const TITULO_MASMORRA = "Medidas da masmorra";
export const ROTULO_PISO = "Altura (Y) do piso da masmorra. Quanto mais fundo, mais isolada (padrão -50)";
export const ROTULO_DECORACAO = "Decoração das salas (pilares, baús, estantes, teias...)";
export const ROTULO_RAMPAS = "Rampas das 4 entradas até a superfície";

/** @param {string} o */
export const CONFIRMAR_TITULO = (o) => `Gerar ${o}?`;
/** @param {string} resumo */
export const CONFIRMAR_TEXTO = (resumo) =>
  `${resumo}\n\n§cIsso SUBSTITUI os blocos da área e não tem desfazer. Faça uma cópia do mundo antes.\n§7A obra roda aos poucos, sem travar o servidor, e dá para cancelar.`;
/** @param {number} raio @param {number} altura @param {number} x @param {number} z */
export const RESUMO_MONTANHA = (raio, altura, x, z) => `Montanha de raio §f${raio}§r e §f${altura}§r de altura, centrada em §f${x}, ${z}§r.`;
/** @param {number} piso @param {number} x @param {number} z */
export const RESUMO_MASMORRA = (piso, x, z) => `Masmorra de 5 andares (A Toca, A Feira Esquecida, O Campo de Guerra, O Sonho e O Coração das Nove Caudas), lado a lado a partir de §f${x}, ${z}§r, com o piso em y §f${piso}§r.`;

/** @param {string} o @param {number} pct @param {string} etapa */
export const BARRA = (o, pct, etapa) => `§6${o} §f${pct}% §7• ${etapa}`;
/** @param {string} o */
export const COMECOU = (o) => `Começou: ${o}. Acompanhe pela barra de ação ou em "Andamento".`;
/** @param {string} o @param {number} seg @param {number} falhas @param {string} primeira */
export const TERMINOU = (o, seg, falhas, primeira) =>
  `Pronto: §f${o}§r em ${seg}s.` + (falhas > 0 ? `\n§e${falhas} bloco(s) não foram colocados (ex.: ${primeira}).` : "");
/** @param {string} o */
export const CANCELADO = (o) => `Obra cancelada: ${o}. O que já foi feito continua no mundo.`;
export const FALHOU = (/** @type {string} */ o, /** @type {string} */ e) => `A obra "${o}" parou por um erro: ${e}`;
export const AREA_DEMOROU = "Uma parte do mapa demorou demais para carregar e foi pulada. Chegue perto e gere de novo.";

export const ANDAMENTO_NADA = "§7Nenhuma obra rodando agora.";
/** @param {string} o @param {number} pct @param {string} etapa @param {number} seg */
export const ANDAMENTO = (o, pct, etapa, seg) => `§fObra: §6${o}\n§fProgresso: §a${pct}%\n§fEtapa: §7${etapa}\n§fTempo: §7${seg}s`;
export const BOTAO_CANCELAR = "Cancelar a obra";
export const CONFIRMAR_CANCELAR = "Parar a obra agora? O que já foi gerado continua no mundo.";
export const ESQUECER_TEXTO = "Apaga só o registro (centro, medidas e pontos de teleporte). Os blocos do mundo não mudam.";

export const TITULO_TELEPORTES = "Teleportes da obra";
export const TP_SEM_OBRA = "§7Gere a montanha ou a masmorra primeiro: os pontos de teleporte aparecem aqui.";
export const TP_SUPERFICIE = "Superfície e montanha";
export const TP_PORTAS = "Portais de volta (lá embaixo)";
export const TP_FACHADA = "Fachada da Sala dos Portais";
export const TP_SALA_PORTAIS = "Sala dos Portais (por dentro)";
export const TP_SALAS = "Salas da masmorra";
/** @param {number} n */
export const TP_ANDAR = (n) => `Masmorra · andar ${n}`;
/** @param {number} n */
export const TP_ANDAR_CHEGADA = (n) => `Andar ${n}: altar (chegada)`;
/** @param {number} n */
export const TP_ANDAR_BOSS = (n) => `Andar ${n}: arena do guardião`;
export const TP_CENTRO = "Centro da obra";
export const TP_TOPO = "Topo da montanha (mirante)";
export const TP_TRILHA = "Início da trilha";
export const TP_LAGO = "Lago";
export const TP_NASCENTE = "Nascente do riacho";
/** @param {string} lado */
export const TP_PORTA = (lado) => `Entrada ${lado} da masmorra`;
/** @param {number} id @param {string} nome */
export const TP_SALA = (id, nome) => `${id}. ${nome.split(" - ").pop()}`;
/** @param {string} nome */
export const TP_OK = (nome) => nome;
export const TP_DIM = "A obra está em outra dimensão.";
export const VER_LIMITES_OK = "Mostrando a área por alguns segundos: círculo da montanha e quadrado da masmorra.";
export const ESQUECIDO = "Registro da obra apagado.";

export const NOME_SALA = "Sala dos Portais";
/** @param {number} n */
export const NOME_MASMORRA = (n) => `Masmorra: andar ${n}`;
/** @param {number} y */
export const PISO_ALTO = (y) => `O piso da masmorra precisa ficar bem abaixo do chão (chão em y ${y}). Baixe a altura do piso nas medidas da masmorra.`;
/** @param {string} o */
export const TEM_SEM_BACKUP = (o) => `Já existe uma ${o} gerada sem cópia de segurança. Desfaça (nivelar) antes de gerar de novo, para não empilhar uma obra em cima da outra.`;
export const NADA_A_DESFAZER = "Não tem nada gerado para desfazer.";

// desfazer
export const BOTAO_DESFAZER = "Desfazer ou limpar";
export const TITULO_DESFAZER = "Desfazer obras";
/** @param {boolean} bm @param {boolean} bd */
export const CORPO_DESFAZER = (bm, bd) =>
  `§7Com cópia de segurança, o terreno volta exatamente como era. Sem cópia (obras antigas), só o corpo da montanha (dentro do raio da base) vira chão plano de grama e a masmorra vira pedra maciça; qualquer coisa construída ali dentro some junto.\n\n§fMontanha: ${bm ? "§acom cópia" : "§esem cópia"}\n§fMasmorra: ${bd ? "§acom cópia" : "§esem cópia"}`;
export const BOTAO_DESFAZER_MONTANHA = "Desfazer a montanha";
export const BOTAO_DESFAZER_MASMORRA = "Desfazer a masmorra";
export const BOTAO_DESFAZER_TUDO = "Desfazer tudo";
export const MODO_BACKUP = "devolvendo o terreno original (cópia de segurança)";
export const MODO_NIVELAR = "sem cópia: nivelando o terreno";
/** @param {string} o @param {string} modo */
export const RESUMO_DESFAZER = (o, modo) => `§f${o}§r: ${modo}.`;
export const CONFIRMAR_DESFAZER = "Desfazer a obra?";
/** @param {string} resumo */
export const CONFIRMAR_DESFAZER_TEXTO = (resumo) => `${resumo}\n\n§cO que foi construído ali some. Isso não tem volta.\n§7Roda aos poucos e dá para cancelar.`;
export const SEM_SALA = "A Sala dos Portais não coube nessa montanha (água ou platô no caminho). Mude a semente ou aumente o raio e a altura e gere de novo: sem a sala não há como descer à masmorra.";
export const ESPERANDO_CARGA = "Esperando o jogo carregar o terreno";
/** @param {string} o @param {number} areas @param {number} colunas */
export const INCOMPLETA = (o, areas, colunas) =>
  `A obra "${o}" ficou INCOMPLETA: ${areas} pedaço(s) do mapa não carregaram a tempo e ${colunas} coluna(s) ficaram sem terreno. ` +
  "Fique perto do centro da obra, espere o mundo carregar e use Desfazer + Gerar de novo (a cópia de segurança devolve o terreno).";

// ---------------------------------------------------------------- Sala dos Portais por cantos
export const BOTAO_SALA = "Sala dos Portais (marcar cantos)";
export const TITULO_SALA = "Sala dos Portais";
/**
 * @param {string} c1
 * @param {string} c2
 * @param {string} tam
 * @param {boolean} backup
 */
export const CORPO_SALA = (c1, c2, tam, backup) =>
  [
    "§7Marque dois cantos opostos do salão (um no chão, outro no alto, em diagonal) e construa. O salão se ajusta ao tamanho, com o Portão Kitsune no fundo, relicários dos andares, canais, lustres e abóbada. Tudo o que estiver dentro da caixa é substituído, e a cópia do que havia fica guardada.",
    "",
    `§fCanto 1: §e${c1}`,
    `§fCanto 2: §e${c2}`,
    tam ? `§fCaixa: §e${tam}` : "§fCaixa: §7(marque os dois cantos)",
    backup ? "§fCópia da última sala: §aguardada (dá para desfazer)" : "",
  ].filter((l) => l !== "").join("\n");
export const NAO_MARCADO = "não marcado";
export const BOTAO_CANTO1 = "Marcar o canto 1 (bloco que olho ou onde estou)";
export const BOTAO_CANTO2 = "Marcar o canto 2 (bloco que olho ou onde estou)";
export const BOTAO_VER_CAIXA = "Mostrar a caixa (partículas)";
export const BOTAO_CONSTRUIR_SALA = "Construir a sala na caixa";
export const BOTAO_DESFAZER_SALA = "Desfazer a última sala (devolver a cópia)";
/**
 * @param {number} n
 * @param {string} c
 */
export const CANTO_OK = (n, c) => `§aCanto ${n} marcado em §e${c}§a.`;
export const FALTAM_CANTOS = "§cMarque os dois cantos antes (na mesma dimensão).";
export const ROTULO_LADO = "Lado da entrada";
export const LADOS = Object.freeze(["Norte (z menor)", "Sul (z maior)", "Leste (x maior)", "Oeste (x menor)"]);
/** @param {string} motivo */
export const CAIXA_RUIM = (motivo) => `§cA caixa não serve: ${motivo}.`;
export const OUTRA_DIMENSAO = "§cMarque a sala na mesma dimensão da obra.";
/**
 * @param {string} tam
 * @param {string} lado
 */
export const CONFIRMAR_SALA = (tam, lado) => `Construir a Sala dos Portais na caixa de ${tam}, com a entrada ao ${lado}? Tudo dentro dela será substituído (a cópia fica guardada para desfazer) e o portão passa a levar à masmorra.`;
export const SALA_PRONTA = "§aSala dos Portais pronta! O Portão Kitsune já leva ao andar 1.";
export const SEM_COPIA_SALA = "Não há cópia de uma sala anterior para devolver.";
export const CONFIRMAR_DESFAZER_SALA = "Devolver o que havia na caixa antes da última sala? Se não houver outra sala, o portal da masmorra deixa de existir até você construir uma nova.";
