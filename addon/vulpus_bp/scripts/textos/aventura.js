// @ts-check
// Textos do Quadro de Aventureiros: a raposa branca do templo, no topo da montanha, que dá 3 quests por dia.

export const NOME_NPC = "Yuki";
export const TITULO_FLUTUANTE = "§b§l✦ YUKI ✦\n§7Quadro de Aventureiros\n§8clique para ver as quests de hoje";
export const FECHADO = "§7Yuki não está por aqui no momento.";

/**
 * Modelos de quest. `n` varia por dia (a escolha usa a data como semente, então todo mundo vê as mesmas 3 quests).
 * tipo: hostil = monstros do mundo comum; minerio = quebrar minérios; masm = inimigos da masmorra; guardiao = chefes da masmorra.
 */
export const MODELOS = Object.freeze({
  caca: [
    { tipo: "hostil", n: 15, titulo: (/** @type {number} */ n) => `Caçador: derrote ${n} monstros`, dica: "Zumbis, esqueletos, aranhas, creepers e afins, no mundo aberto." },
    { tipo: "hostil", n: 20, titulo: (/** @type {number} */ n) => `Noite longa: derrote ${n} monstros`, dica: "Vale qualquer monstro do mundo aberto. A noite ajuda." },
    { tipo: "hostil", n: 25, titulo: (/** @type {number} */ n) => `Limpeza de trilha: derrote ${n} monstros`, dica: "Monstros do mundo aberto, em qualquer lugar." },
  ],
  mina: [
    { tipo: "minerio", n: 12, titulo: (/** @type {number} */ n) => `Mineiro: quebre ${n} minérios`, dica: "Carvão, ferro, cobre, ouro, redstone, lápis, diamante... tudo conta." },
    { tipo: "minerio", n: 16, titulo: (/** @type {number} */ n) => `Veio fundo: quebre ${n} minérios`, dica: "Qualquer minério. Desça com tocha e cuidado." },
    { tipo: "minerio", n: 24, titulo: (/** @type {number} */ n) => `Grande escavação: quebre ${n} minérios`, dica: "Qualquer minério, no mundo aberto." },
  ],
  masm: [
    { tipo: "masm", n: 12, titulo: (/** @type {number} */ n) => `Explorador: derrote ${n} inimigos na Masmorra`, dica: "Qualquer andar. Quem luta perto de você também conta." },
    { tipo: "masm", n: 18, titulo: (/** @type {number} */ n) => `Expedição: derrote ${n} inimigos na Masmorra`, dica: "Qualquer andar. Leve amigos: o crédito divide com quem está perto." },
    { tipo: "guardiao", n: 1, titulo: () => "Quebra-selo: derrote um guardião da Masmorra", dica: "Qualquer um dos 5 guardiões: Raposa Mãe, Mestre da Feira, General, O Branco ou Nove Caudas." },
  ],
});

export const TITULO = "Yuki · Quadro de Aventureiros";
/** @param {string} nome */
export const CORPO = (nome) =>
  `§fOi, §e${nome}§f! Eu sou a Yuki, guia dos aventureiros. Todo dia eu separo §63 quests§f. Aceite as que quiser, cumpra e volte aqui para receber a recompensa. Elas renovam à meia-noite.`;
/** @param {number} bonus */
export const LINHA_BONUS = (bonus) => (bonus > 0 ? `§7Entregou as 3 no mesmo dia? Bônus de §6${bonus} Caudas§7.` : "");
/** @param {number} entregues */
export const LINHA_PROGRESSO = (entregues) => `§7Hoje: §e${entregues}§7/3 entregues`;

/**
 * @param {string} titulo
 * @param {number} caudas
 * @param {number} xp
 */
export const BOTAO_NOVA = (titulo, caudas, xp) => `§a[Aceitar] §r${titulo}\n§6${caudas} Caudas §8· §b${xp} XP`;
/**
 * @param {string} titulo
 * @param {number} p
 * @param {number} n
 */
export const BOTAO_ATIVA = (titulo, p, n) => `§e[Em andamento] §r${titulo}\n§7${Math.min(p, n)}/${n}`;
/** @param {string} titulo */
export const BOTAO_PRONTA = (titulo) => `§6§l[Entregar] §r${titulo}\n§aPronta! Toque para receber`;
/** @param {string} titulo */
export const BOTAO_ENTREGUE = (titulo) => `§8[Entregue] ${titulo}`;

/** @param {string} titulo @param {string} dica @param {number} p @param {number} n */
export const DETALHE = (titulo, dica, p, n) => `§e${titulo}\n\n§7${dica}\n\n§fProgresso: §e${Math.min(p, n)}§7/${n}`;
/** @param {string} titulo */
export const ACEITOU = (titulo) => `§aQuest aceita: §f${titulo}§a. Boa sorte, aventureiro!`;
/** @param {string} titulo */
export const COMPLETOU = (titulo) => `§6Quest cumprida: §f${titulo}§6! Volte à Yuki, no templo, para receber.`;
/** @param {number} caudas @param {number} xp */
export const ENTREGOU = (caudas, xp) => `§aRecompensa recebida: §6${caudas} Caudas §a e §b${xp} XP§a.`;
/** @param {number} bonus */
export const BONUS = (bonus) => `§6§lTrês de três! §r§7Bônus de §6${bonus} Caudas§7 da Yuki.`;
export const MOTIVO = "quest da Yuki";
export const MOTIVO_BONUS = "bônus das 3 quests da Yuki";
export const BOTAO_VOLTAR_QUADRO = "Voltar ao quadro";
export const DESLIGADO = "§7O quadro de aventureiros está descansando hoje.";

// Painel da staff
export const BOTAO_STAFF = "Yuki, a raposa dos aventureiros";
export const TITULO_STAFF = "Yuki e as quests diárias";
/** @param {boolean} marcada @param {string} coords */
export const CORPO_STAFF = (marcada, coords) =>
  [
    "§7Uma raposinha branca que dá 3 quests por dia (monstros, minérios e masmorra). Ela fica no bloco que você olhar; tem recompensa em Caudas e XP, com teto de 3 quests por pessoa por dia.",
    "",
    marcada ? `§fLugar: §a${coords}` : "§fLugar: §cainda não marcado",
  ].join("\n");
export const BOTAO_MARCAR = "Pôr a Yuki no bloco que estou olhando";
export const BOTAO_REMOVER = "Tirar a Yuki";
export const BOTAO_CONFIG = "Recompensas e ligar/desligar";
export const OLHE_PARA_BLOCO = "§cOlhe para o bloco onde a Yuki vai ficar (até 12 blocos).";
/** @param {string} coords */
export const MARCADA = (coords) => `§aYuki posta em §e${coords}§a, em cima do bloco que você olhou.`;
export const REMOVIDA = "§aYuki foi embora do templo.";
