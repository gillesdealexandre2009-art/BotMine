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

/**
 * Donos do servidor pelo nome da conta (sem diferenciar maiúsculas), ex.: ["MeuGamertag"]. Vazio por padrão:
 * o primeiro dono entra com /vulpus:dono reivindicar (só Operador, e só enquanto não houver nenhum dono)
 * e os outros são adicionados por um dono no Painel de Dono (core/dono.js). Com um nome aqui, reivindicar
 * fica fechado. Dono não é o mesmo que staff: staff comum não é dono.
 * @type {readonly string[]}
 */
export const DONOS = Object.freeze([]);

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
  custoCriarCla: 500,
  claXpPorMinuto: 1,
  claCaudasPorXp: 10,
  custoCasaCla: 250,
  distanciaSpawnBase: 200,
  custoMoverBase: 500,
  aumentoMoverBasePct: 60,
  recargaMoverBaseHoras: 24,
  zonaAmortecimento: 12,
  custoGuerra: 1000,
  guerraNivelMinimo: 2,
  guerraMembrosMinimos: 3,
  guerraAvisoMin: 60,
  duracaoGuerraHoras: 24,
  recargaGuerraDias: 7,
  guerraAntiFarmMin: 5,
  guerraBonusSequencia: 1,
  guerraBonusLider: 1,
  bandeiraDistanciaMax: 64,
  recargaBandeiraHoras: 1,
  ctfCaptura: 10,
  ctfDevolver: 2,
  ctfMatarCarregador: 3,
  cacadaLigada: true,
  cacadaMinimo: 50,
  cacadaMaximo: 100000,
  cacadaTaxaPct: 10,
  cacadaLimite: 5,
  cacadaVidaMin: 5,
  cacadaRecargaHoras: 24,
  cacadaDuracaoDias: 7,
  cacadaAnuncio: 500,
  // Spleef (editados em Staff > Minigames > Spleef > Configurações, não nos grupos do painel)
  spleefLigado: true,
  spleefMinimo: 2,
  spleefMaximo: 16,
  spleefContagem: 10,
  spleefContagemCheia: 5,
  spleefDuracaoMin: 5,
  spleefPremioVitoria: 30,
  spleefPremioParticipar: 5,
  spleefPremiosDia: 3,
  spleefXp: 10,
  spleefFerramenta: "minecraft:diamond_shovel",
  spleefEficiencia: 5,
  spleefBolas: true,
  spleefRecargaBola: 3,
};

/**
 * Níveis dos clãs (do 1 ao 8). xp = XP total do clã para poder subir para este nível; custo = Caudas
 * do banco do clã para subir; membros = máximo de pessoas; raio = metade do lado da base quadrada
 * (8 = 17x17 blocos; 1024 = 2049x2049); casas = casas do clã; cores e emblemas = quantos itens das
 * listas de sistemas/cla_dados.js (CORES_CLA e EMBLEMAS) ficam liberados. Mexer aqui vale para todos.
 * A base cresce até o raio do nível só onde houver espaço: nunca encosta em outra base (nem na zona de
 * amortecimento dela) nem chega perto do spawn (sistemas/cla_terreno.js).
 */
export const NIVEIS_CLA = Object.freeze(
  [
    { nivel: 1, xp: 0, custo: 0, membros: 4, raio: 8, casas: 1, cores: 4, emblemas: 1 },
    { nivel: 2, xp: 1000, custo: 1000, membros: 6, raio: 16, casas: 1, cores: 5, emblemas: 1 },
    { nivel: 3, xp: 3000, custo: 3000, membros: 8, raio: 32, casas: 2, cores: 6, emblemas: 2 },
    { nivel: 4, xp: 7000, custo: 6000, membros: 10, raio: 64, casas: 2, cores: 7, emblemas: 2 },
    { nivel: 5, xp: 14000, custo: 12000, membros: 14, raio: 128, casas: 3, cores: 8, emblemas: 3 },
    { nivel: 6, xp: 25000, custo: 25000, membros: 18, raio: 256, casas: 3, cores: 10, emblemas: 4 },
    { nivel: 7, xp: 45000, custo: 50000, membros: 22, raio: 512, casas: 4, cores: 11, emblemas: 4 },
    { nivel: 8, xp: 80000, custo: 100000, membros: 30, raio: 1024, casas: 5, cores: 12, emblemas: 5 },
  ].map((n) => Object.freeze(n)),
);

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
  dono: "textures/items/gold_helmet",
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
  // Temas do painel (raposinha de cada tema; cadeado nos de Kitsune para quem não tem o selo)
  temaLaranja: "textures/vulpus/ui/icone",
  temaBlack: "textures/vulpus/ui/black/icone",
  temaSakura: "textures/vulpus/ui/sakura/icone",
  temaLunar: "textures/vulpus/ui/lunar/icone",
  temaEspirito: "textures/vulpus/ui/espirito/icone",
  cadeado: "textures/ui/icon_lock",
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
  // Clãs
  cla: "textures/items/banner_pattern",
  membros: "textures/ui/FriendsIcon",
  convites: "textures/ui/invite",
  banco: "textures/blocks/chest_front",
  terreno: "textures/items/map_empty",
  casaCla: "textures/items/campfire",
  guerra: "textures/items/diamond_sword",
  aliados: "textures/ui/trade_icon",
  sair: "textures/items/door_wood",
  bypass: "textures/blocks/barrier",
  kitsune: "textures/items/blaze_powder",
  apelido: "textures/items/name_tag",
  bandeira: "textures/vulpus/ui/bandeira",
  // Caçada (recompensa por cabeças)
  cacada: "textures/items/crossbow_arrow",
  mural: "textures/items/paper",
  cabeca: "textures/ui/wither_effect",
  // Minigames (Spleef)
  minigames: "textures/items/snowball",
  spleef: "textures/items/diamond_shovel",
  neve: "textures/blocks/snow",
  trofeu: "textures/ui/trophy",
};

export const SONS = {
  abrir: "random.pop",
  erro: "note.bass",
  ok: "random.orb",
  pedido: "random.levelup",
  nivel: "random.levelup",
  guerra: "horn.call.0",
  cacada: "block.bell.hit",
  cacou: "note.pling",
  spleefConta: "note.pling",
  spleefVai: "random.levelup",
  spleefCaiu: "random.pop2",
  spleefFogos: "firework.blast",
  spleefFogosSobe: "firework.launch",
  spleefBrilho: "firework.twinkle",
};
