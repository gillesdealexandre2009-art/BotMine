// @ts-check
// Constantes do addon. O que a staff pode mudar no jogo fica em PADROES (salvo em vulpus:config).

export const VERSAO = "0.2.0";
export const ITEM_MENU = "vulpus:menu";
export const TAG_STAFF = "vulpus:staff";
export const TAG_ADMIN = "vulpus:admin";
export const TAG_HELPER = "vulpus:helper";
/** Booster do Discord: só o selo, nenhuma vantagem no jogo. */
export const TAG_KITSUNE = "vulpus:kitsune";
/** Prefixo da propriedade dinâmica do MUNDO com os dados de cada jogador (+ player.id). */
export const PREFIXO_JOGADOR = "vulpus:j:";
export const CHAVE_CONFIG = "vulpus:config";
export const CHAVE_SPAWN = "vulpus:spawn";

/** Padrões editáveis pela staff (vulpus:config mescla por cima). Tempos em segundos, salvo "Min" e "Horas"; "Pct" é porcentagem. */
export const PADROES = {
  esperaTeleporte: 3,
  recargaTeleporte: 10,
  combateSegundos: 10,
  tpaExpira: 60,
  limiteCasas: 3,
  caudasPorIntervalo: 5,
  intervaloCaudasMin: 10,
  diariaBase: 25,
  diariaBonusDia: 5,
  diariaBonusMax: 7,
  linkDiscord: "",
  hudPadrao: true,
  xpPorMinuto: 3,
  xpDiaria: 15,
  leilaoLigado: true,
  taxaAnuncioPct: 1,
  taxaVendaPct: 5,
  precoMinimo: 1,
  precoMaximo: 1000000,
  anunciosPorJogador: 5,
  duracaoAnuncioHoras: 48,
  caixaLimite: 54,
};

/** Ícones dos botões: texturas vanilla conferidas na 1.26.52. */
export const ICONES = {
  spawn: "textures/items/compass_item",
  casas: "textures/items/bed_red",
  tpa: "textures/items/ender_pearl",
  voltar: "textures/items/totem",
  caudas: "textures/items/gold_nugget",
  perfil: "textures/items/name_tag",
  ajustes: "textures/ui/gear",
  regras: "textures/items/book_writable",
  staff: "textures/ui/permissions_op_crown",
  nova: "textures/ui/plus",
  editar: "textures/ui/pencil_edit_icon",
  apagar: "textures/ui/icon_trash",
  sim: "textures/ui/check",
  nao: "textures/ui/cancel",
  jogador: "textures/ui/icon_steve",
  online: "textures/ui/friend_glyph",
  diaria: "textures/items/emerald",
  ranking: "textures/items/map_filled",
  tempo: "textures/items/clock_item",
  lore: "textures/items/book_enchanted",
  comandos: "textures/items/paper",
  discord: "textures/items/feather",
  voltarNav: "textures/ui/arrow_dark_left_stretch",
  mundo: "textures/ui/world_glyph_color_2x",
  // Leilão
  leilao: "textures/items/gold_ingot",
  comprar: "textures/ui/icon_deals",
  vender: "textures/ui/icon_import",
  anuncios: "textures/items/book_written",
  caixa: "textures/blocks/barrel_side",
  historico: "textures/ui/timer",
  buscar: "textures/ui/magnifyingGlass",
  proxima: "textures/ui/arrow_dark_right_stretch",
  ordenar: "textures/ui/refresh_light",
  conferir: "textures/ui/icon_lock",
  // Níveis, ajustes e cargos
  nivel: "textures/items/experience_bottle",
  ranks: "textures/items/nether_star",
  tema: "textures/items/blaze_powder",
  cargos: "textures/ui/permissions_member_star",
  // Categorias do leilão
  catTudo: "textures/ui/icon_recipe_item",
  catBlocos: "textures/blocks/grass_side_carried",
  catFerramentas: "textures/items/iron_pickaxe",
  catArmas: "textures/items/iron_sword",
  catArmaduras: "textures/items/iron_chestplate",
  catComida: "textures/items/bread",
  catPocoes: "textures/items/potion_bottle_heal",
  catLivros: "textures/items/book_enchanted",
  catShulkers: "textures/blocks/shulker_top_undyed",
  catOutros: "textures/items/stick",
};

export const SONS = {
  abrir: "random.pop",
  erro: "note.bass",
  ok: "random.orb",
  teleporte: "mob.endermen.portal",
  contagem: "note.hat",
  pedido: "random.levelup",
  nivel: "random.levelup",
};
