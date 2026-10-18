// @ts-check
// Textos e espécies da Pescaria (a barraca da feira).

/**
 * Espécies pescáveis. peso = chance relativa; min/max = tamanho em cm; valor = Caudas de um peixe de tamanho médio.
 * `album` false = curiosidade (não conta para completar o álbum). Luta: cliques = quantos cliques seguidos puxam o
 * peixe (sem ele puxar de volta); puxo = quanto ele recupera por instante. Quanto mais raro, mais forte.
 * @type {readonly { id: string, nome: string, cor: string, raridade: string, peso: number, min: number, max: number, valor: number, album: boolean, cliques: number, puxo: number }[]}
 */
export const ESPECIES = Object.freeze([
  { id: "bota", nome: "Bota velha", cor: "§8", raridade: "lixo", peso: 6, min: 20, max: 35, valor: 0, album: false, cliques: 3, puxo: 0.004 },
  { id: "lata", nome: "Lata enferrujada", cor: "§8", raridade: "lixo", peso: 4, min: 8, max: 15, valor: 0, album: false, cliques: 3, puxo: 0.004 },
  { id: "lambari", nome: "Lambari", cor: "§7", raridade: "comum", peso: 30, min: 8, max: 15, valor: 2, album: true, cliques: 5, puxo: 0.008 },
  { id: "sardinha", nome: "Sardinha", cor: "§f", raridade: "comum", peso: 22, min: 10, max: 22, valor: 3, album: true, cliques: 5, puxo: 0.008 },
  { id: "tilapia", nome: "Tilápia", cor: "§a", raridade: "comum", peso: 18, min: 20, max: 35, valor: 4, album: true, cliques: 6, puxo: 0.01 },
  { id: "carpa", nome: "Carpa", cor: "§2", raridade: "incomum", peso: 10, min: 30, max: 60, valor: 7, album: true, cliques: 8, puxo: 0.013 },
  { id: "pacu", nome: "Pacu", cor: "§e", raridade: "incomum", peso: 8, min: 25, max: 55, valor: 8, album: true, cliques: 9, puxo: 0.014 },
  { id: "truta", nome: "Truta arco-íris", cor: "§b", raridade: "raro", peso: 6, min: 25, max: 50, valor: 12, album: true, cliques: 11, puxo: 0.016 },
  { id: "dourado", nome: "Dourado do rio", cor: "§6", raridade: "raro", peso: 5, min: 40, max: 80, valor: 14, album: true, cliques: 12, puxo: 0.017 },
  { id: "baiacu", nome: "Baiacu", cor: "§d", raridade: "raro", peso: 4, min: 15, max: 35, valor: 16, album: true, cliques: 13, puxo: 0.018 },
  { id: "bagre", nome: "Bagre gigante", cor: "§5", raridade: "épico", peso: 3.5, min: 40, max: 90, valor: 20, album: true, cliques: 14, puxo: 0.019 },
  { id: "pirarucu", nome: "Pirarucu", cor: "§c", raridade: "épico", peso: 2.5, min: 100, max: 200, valor: 28, album: true, cliques: 16, puxo: 0.021 },
  { id: "koi", nome: "Koi dourada", cor: "§6", raridade: "lendário", peso: 1.5, min: 50, max: 90, valor: 50, album: true, cliques: 18, puxo: 0.022 },
  { id: "lua", nome: "Peixe-lua", cor: "§3", raridade: "lendário", peso: 0.8, min: 120, max: 250, valor: 80, album: true, cliques: 22, puxo: 0.025 },
]);

export const NOME_VARA = "§bVara da Pescaria";
export const LORE_VARA = ["§7Clique para lançar a linha na água do tanque.", "§7Quando o peixe morder, clique de novo!"];

export const JOGO_FECHADO = "A Pescaria está fechada no momento.";
/** @param {number} s */
export const RECARGA = (s) => `Calma, pescador! A próxima pescaria é em §e${s}s§c.`;
export const GANHO_MAX = "Você já ganhou o máximo de hoje na Pescaria. Volte amanhã!";
export const PERDA_MAX = "Chega de pescaria por hoje! Volte amanhã.";
/** @param {number} custo */
export const SEM_CAUDAS = (custo) => `Você precisa de §e${custo} Caudas§c para pescar.`;
export const JA_PESCANDO = "Você já está pescando! Use a vara.";
export const SEM_ESPACO = "Seu inventário está cheio: libere um espaço para receber a vara.";

/** @param {number} custo @param {number} iscas @param {number} min */
export const COMECOU = (custo, iscas, min) =>
  `§bPescaria §8» §7Você pagou §e${custo}§7 e ganhou a vara com §f${iscas} iscas§7 por §f${min} min§7. Mire na água do tanque e clique para lançar; quando o peixe morder (!), clique de novo!`;
export const MIRE_NA_AGUA = "Mire na água do tanque e clique para lançar a linha.";
/** @param {number} iscas */
export const LANCOU = (iscas) => `§bPescaria §8» §7Linha lançada! Isca§f${iscas === 1 ? "" : "s"} restante${iscas === 1 ? "" : "s"}: §e${iscas}`;
export const PUXOU_CEDO = "§bPescaria §8» §cPuxou cedo demais! O peixe nem tinha mordido e a isca se foi.";
export const ESCAPOU = "§bPescaria §8» §cDemorou e o peixe escapou!";
export const BARRA_AGUARDE = "§7Aguardando o peixe morder...";
export const BARRA_MORDEU = "§c§l! O PEIXE MORDEU ! CLIQUE AGORA !";
export const FISGOU = "§bPescaria §8» §aFisgou! §fCLIQUE CLIQUE CLIQUE§7 para puxar, mais rápido que ele!";
/** @param {number} prog 0 a 1 @param {boolean} forte */
export const BARRA_LUTA = (prog, forte) => {
  const total = 24;
  const cheios = Math.max(0, Math.min(total, Math.round(prog * total)));
  const cor = prog > 0.66 ? "§a" : prog > 0.33 ? "§e" : "§c";
  return `${forte ? "§c§l⚠ PUXA FORTE! " : "§7Puxe! "}§8[${cor}${"|".repeat(cheios)}§8${"|".repeat(total - cheios)}§8] §f${Math.round(prog * 100)}%`;
};
export const ESCAPOU_LUTA = "§bPescaria §8» §cO peixe era forte demais e se soltou!";
export const SEM_ISCAS_AGORA = "§bPescaria §8» §7Suas iscas acabaram.";
/** @param {string} nome @param {number} cm @param {number} premio */
export const PEGOU = (nome, cm, premio) =>
  premio > 0 ? `§bPescaria §8» §fVocê pescou: ${nome} §7(${cm} cm) §8→ §e+${premio} Caudas` : `§bPescaria §8» §fVocê pescou: ${nome} §7(${cm} cm)... §7não vale nada, mas é divertido!`;
export const NOVA_ESPECIE = "§a§lNOVA ESPÉCIE no álbum!";
/** @param {number} cm */
export const NOVO_MAIOR = (cm) => `§6Seu maior ${cm} cm!`;
/** @param {string} nome @param {string} especie @param {number} cm */
export const RECORDE_DO_DIA = (nome, especie, cm) => `§b§l✦ §r§e${nome} §bpescou o maior peixe do dia: ${especie} §bde §e${cm} cm§b!`;
/** @param {string} nome @param {number} premio */
export const ALBUM_COMPLETO = (nome, premio) => `§b§l✦ §r§e${nome} §bcompletou o álbum de peixes da Pescaria e ganhou §e${premio} Caudas§b!`;
/** @param {number} premio */
export const ALBUM_COMPLETO_VOCE = (premio) => `§bPescaria §8» §aVocê completou o álbum! Prêmio único: §e${premio} Caudas§a.`;
/** @param {number} n @param {number} total @param {number} custo */
export const FIM = (n, total, custo) =>
  `§bPescaria §8» §7Fim da pescaria: §f${n} pescaria${n === 1 ? "" : "s"}§7, §e${total} Caudas§7 recebidas (custo ${custo}) ${total >= custo ? "§a▲" : "§c▼"}`;
export const FIM_TEMPO = "§bPescaria §8» §7O tempo da pescaria acabou.";
export const VARA_SEM_SESSAO = "Sua pescaria já acabou. A vara foi recolhida.";

/** @param {string} cor @param {string} nome */
export const TITULO_PEGOU = (cor, nome) => `${cor}${nome}`;
/** @param {number} cm @param {number} premio */
export const SUB_PEGOU = (cm, premio) => (premio > 0 ? `§7${cm} cm §8• §e+${premio} Caudas` : `§7${cm} cm`);

/**
 * @param {number} custo
 * @param {number} iscas
 * @param {{ nome: string, especie: string, cm: number } | undefined} recorde
 */
export const TITULO_FLUTUANTE = (custo, iscas, recorde) =>
  [
    "§b§lPESCARIA",
    `§7clique no balcão §8• §e${custo} Caudas §8• §7${iscas} iscas`,
    recorde ? `§8Maior de hoje: §f${recorde.nome} §e${recorde.cm} cm §7${recorde.especie}` : "§8Ninguém pescou hoje ainda",
  ].join("\n");

// Menu do balcão
export const TITULO_MENU = "Pescaria";
/**
 * @param {number} custo
 * @param {number} iscas
 * @param {number} min
 * @param {number} especies
 * @param {number} total
 */
export const CORPO_MENU = (custo, iscas, min, especies, total) =>
  [
    `§7Pague §e${custo} Caudas§7 e receba uma vara com §f${iscas} iscas§7 por §f${min} min§7.`,
    "§7Lance a linha na água; quando o peixe morder (§c!§7), clique de novo. Peixes maiores e mais raros pagam mais.",
    `§7Seu álbum: §f${especies}§7/§f${total} §7espécies. Complete e ganhe um prêmio único!`,
  ].join("\n");
/** @param {number} custo */
export const BOTAO_PESCAR = (custo) => `Pescar (${custo} Caudas)`;
export const BOTAO_ALBUM = "Meu álbum de peixes";
export const BOTAO_TERMINAR = "Terminar a pescaria agora";
export const TITULO_ALBUM = "Álbum de peixes";
/** @param {number} feitas @param {number} total @param {boolean} completo @param {number} premio */
export const CORPO_ALBUM_TOPO = (feitas, total, completo, premio) =>
  `§7Espécies: §f${feitas}§7/§f${total}${completo ? " §a✔ Álbum completo!" : ` §8• §7completar paga §e${premio} Caudas§7 (uma vez)`}`;
/** @param {string} cor @param {string} nome @param {string} raridade @param {number} n @param {number} maior */
export const LINHA_ALBUM = (cor, nome, raridade, n, maior) => `§a✔ ${cor}${nome} §8(${raridade}) §7x${n}, maior §f${maior} cm`;
/** @param {string} raridade */
export const LINHA_ALBUM_VAZIA = (raridade) => `§8✘ ??? §8(${raridade}) — ainda não pescado`;

// Painel da staff
export const TITULO_STAFF = "Pescaria (staff)";
export const BOTAO_STAFF = "Pescaria";
export const BOTAO_MARCAR_BALCAO = "Marcar o balcão (olhe para o bloco)";
export const BOTAO_CANTO1 = "Marcar o canto 1 do tanque (olhe para a água)";
export const BOTAO_CANTO2 = "Marcar o canto 2 do tanque (olhe para a água, no canto oposto)";
export const BOTAO_CONFIG = "Configurações da Pescaria";
export const BOTAO_REMOVER = "Remover a Pescaria";
export const CONFIRMAR_REMOVER = "Remover o balcão, o tanque e os peixinhos da Pescaria?";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 10 blocos de distância (para a água, no caso do tanque).";
/** @param {string} onde */
export const BALCAO_MARCADO = (onde) => `§aBalcão da Pescaria marcado em §e${onde}§a. Clicar nele abre o menu (staff agachada mexe normal).`;
/** @param {number} n */
export const CANTO_MARCADO = (n) => `§aCanto ${n} do tanque marcado. Marque os dois cantos opostos (a água entre eles recebe os peixes).`;
export const TANQUE_PRONTO = "§aTanque pronto: os peixinhos já estão nadando.";
export const REMOVIDO = "§aPescaria removida.";
/**
 * @param {{ balcao: boolean, canto1: boolean, canto2: boolean, tanque: boolean, sessoes: number, peixes: number, recorde?: { nome: string, especie: string, cm: number } }} e
 */
export const CORPO_STAFF = (e) =>
  [
    "§7Peixinhos nadam no tanque; a pessoa paga, ganha uma vara e pesca de verdade, com mordida e tempo de puxar. Álbum de espécies e recorde do dia.",
    "",
    `§fBalcão: ${e.balcao ? "§amarcado" : "§cnão marcado"}`,
    `§fCanto 1 do tanque: ${e.canto1 ? "§amarcado" : "§cnão marcado"}`,
    `§fCanto 2 do tanque: ${e.canto2 ? "§amarcado" : "§cnão marcado"}`,
    `§fPeixes nadando: §7${e.tanque ? e.peixes : "tanque incompleto"}`,
    `§fPessoas pescando agora: §7${e.sessoes}`,
    `§fMaior peixe de hoje: §7${e.recorde ? `${e.recorde.nome} (${e.recorde.especie}, ${e.recorde.cm} cm)` : "nenhum"}`,
  ].join("\n");
