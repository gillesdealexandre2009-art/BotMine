// @ts-check
// Textos dos pets: cápsulas do lobby, coleção, evolução e painel da staff.

export const RARIDADES = Object.freeze({
  comum: { nome: "Comum", cor: "§7" },
  incomum: { nome: "Incomum", cor: "§a" },
  raro: { nome: "Raro", cor: "§9" },
  lendario: { nome: "Lendário", cor: "§6" },
  insano: { nome: "Insano", cor: "§c" },
  divino: { nome: "Divino", cor: "§b" },
  absoluto: { nome: "Absoluto", cor: "§d" },
});

/**
 * Os 50 pets (7 raridades). O modelo de cada um é achado pelo nome ("Pet: <nome>") na lista dos modelos animados.
 * Bônus: xp = % de XP a mais; sorte = % a mais de chance de loot raro na masmorra; efeitos = poções leves; cura = regenera
 * quando a pessoa está ferida. Cada nível de evolução reforça o bônus (veja MULT_NIVEL em pets_bonus.js).
 */
export const PETS = Object.freeze([
  { id: "mel", nome: "Raposinha-Mel", rar: "comum", tipo: "Coletor", xp: 5, sorte: 0, efeitos: [], cura: false, desc: "Doce de companhia: +5% de XP em tudo." },
  { id: "sapinho", nome: "Sapinho Verde", rar: "comum", tipo: "Explorador", xp: 0, sorte: 0, efeitos: ["speed"], cura: false, desc: "Pés ligeiros: velocidade I enquanto está com você." },
  { id: "pintinho", nome: "Pintinho Brilhante", rar: "comum", tipo: "Mineiro", xp: 0, sorte: 0, efeitos: ["haste"], cura: false, desc: "Cava com você: pressa I, ótimo para minerar." },
  { id: "coelho", nome: "Coelhinho-Lunar", rar: "comum", tipo: "Saltador", xp: 0, sorte: 0, efeitos: ["jump_boost"], cura: false, desc: "Pulos altos: salto I (II no nível 4)." },
  { id: "cogumelo", nome: "Cogumelo Sonhador", rar: "comum", tipo: "Explorador", xp: 2, sorte: 0, efeitos: ["slow_falling"], cura: false, desc: "Cai devagarinho: queda lenta e +2% de XP." },
  { id: "vagalume", nome: "Vaga-lume Amigo", rar: "comum", tipo: "Sortudo", xp: 0, sorte: 4, efeitos: [], cura: false, desc: "Ilumina a sorte: +4% de loot raro na masmorra." },
  { id: "coruja", nome: "Coruja Atenta", rar: "incomum", tipo: "Explorador", xp: 2, sorte: 0, efeitos: ["night_vision"], cura: false, desc: "Enxerga no escuro: visão noturna e +2% de XP." },
  { id: "carpa", nome: "Carpa-Nuvem", rar: "incomum", tipo: "Explorador", xp: 2, sorte: 0, efeitos: ["water_breathing"], cura: false, desc: "Respira debaixo d'água e dá +2% de XP." },
  { id: "lontra", nome: "Lontra Pescadora", rar: "incomum", tipo: "Explorador", xp: 3, sorte: 0, efeitos: ["dolphins_grace"], cura: false, desc: "Nada como golfinho: graça do golfinho e +3% de XP." },
  { id: "salamandra", nome: "Salamandra-Brasa", rar: "incomum", tipo: "Guardião", xp: 0, sorte: 3, efeitos: ["fire_resistance"], cura: false, desc: "Pele de brasa: resistência ao fogo e +3% de sorte na masmorra." },
  { id: "komainu", nome: "Komainu Mini", rar: "raro", tipo: "Guardião", xp: 0, sorte: 0, efeitos: [], cura: true, desc: "Protege você: cura leve quando a vida está baixa (a cada 25 s)." },
  { id: "trevo", nome: "Raposa-Trevo", rar: "raro", tipo: "Sortudo", xp: 0, sorte: 12, efeitos: [], cura: false, desc: "Traz sorte: +12% de chance de loot raro nos baús e inimigos da masmorra." },
  { id: "dragao", nome: "Dragãozinho de Jade", rar: "raro", tipo: "Aventureiro", xp: 6, sorte: 0, efeitos: ["speed"], cura: false, desc: "Voa ao seu lado: +6% de XP e velocidade." },
  { id: "espirito", nome: "Espírito Azul", rar: "raro", tipo: "Guardião", xp: 0, sorte: 0, efeitos: ["resistance"], cura: false, desc: "Chama gentil: resistência I contra o dano." },
  { id: "nove", nome: "Nove-Caudinhas", rar: "lendario", tipo: "Mascote", xp: 8, sorte: 8, efeitos: ["speed", "haste"], cura: true, desc: "Um pouquinho de tudo: +8% de XP, +8% de sorte, velocidade, pressa e cura." },
  { id: "fenix", nome: "Fênix de Brasa", rar: "lendario", tipo: "Mascote", xp: 6, sorte: 10, efeitos: ["fire_resistance", "slow_falling"], cura: true, desc: "Renasce das cinzas: +6% de XP, +10% de sorte, resistência ao fogo, queda lenta e cura." },
  { id: "gato", nome: "Gatinho-Novelo", rar: "comum", tipo: "Coletor", xp: 3, sorte: 0, efeitos: [], cura: false, desc: "Brinca com o novelo e te rende +3% de XP." },
  { id: "pinguim", nome: "Pinguim Desajeitado", rar: "comum", tipo: "Sortudo", xp: 0, sorte: 3, efeitos: [], cura: false, desc: "Escorrega, tropeça e traz +3% de sorte na masmorra." },
  { id: "joaninha", nome: "Joaninha Pontilhada", rar: "comum", tipo: "Sortudo", xp: 0, sorte: 4, efeitos: [], cura: false, desc: "Pontinhos da sorte: +4% de loot raro na masmorra." },
  { id: "slime", nome: "Geleiazinha", rar: "comum", tipo: "Saltador", xp: 0, sorte: 0, efeitos: ["jump_boost"], cura: false, desc: "Pula pula: salto I (II no nível 4)." },
  { id: "nuvem", nome: "Nuvenzinha", rar: "comum", tipo: "Explorador", xp: 1, sorte: 0, efeitos: ["slow_falling"], cura: false, desc: "Macia como algodão: queda lenta e +1% de XP." },
  { id: "ourico", nome: "Ouriço de Castanha", rar: "comum", tipo: "Coletor", xp: 4, sorte: 0, efeitos: [], cura: false, desc: "Junta castanhas pelo caminho: +4% de XP." },
  { id: "caracol", nome: "Caracol-Doce", rar: "comum", tipo: "Mineiro", xp: 0, sorte: 0, efeitos: ["haste"], cura: false, desc: "Devagar e sempre: pressa I para minerar." },
  { id: "pomba", nome: "Pombinha-Paz", rar: "comum", tipo: "Explorador", xp: 3, sorte: 0, efeitos: ["speed"], cura: false, desc: "Voa leve ao seu lado: velocidade I e +3% de XP." },
  { id: "panda", nome: "Panda Sonolento", rar: "incomum", tipo: "Coletor", xp: 5, sorte: 0, efeitos: [], cura: false, desc: "Cochila no seu ombro e rende +5% de XP." },
  { id: "lobo", nome: "Lobinho-Prata", rar: "incomum", tipo: "Explorador", xp: 2, sorte: 0, efeitos: ["speed"], cura: false, desc: "Companheiro de corrida: velocidade I e +2% de XP." },
  { id: "borboleta", nome: "Borboleta-Lua", rar: "incomum", tipo: "Sortudo", xp: 0, sorte: 5, efeitos: ["night_vision"], cura: false, desc: "Asas que brilham no escuro: visão noturna e +5% de sorte." },
  { id: "abelha", nome: "Abelha-Rainha Mini", rar: "incomum", tipo: "Mineiro", xp: 3, sorte: 0, efeitos: ["haste"], cura: false, desc: "Trabalhadeira real: pressa I e +3% de XP." },
  { id: "tartaruga", nome: "Tartaruga-Musgo", rar: "incomum", tipo: "Explorador", xp: 0, sorte: 0, efeitos: ["water_breathing","dolphins_grace"], cura: false, desc: "Dona dos rios: respira na água e nada rápido." },
  { id: "flamingo", nome: "Flamingo Rosado", rar: "incomum", tipo: "Explorador", xp: 5, sorte: 0, efeitos: ["slow_falling"], cura: false, desc: "Elegante num pé só: queda lenta e +5% de XP." },
  { id: "ratinho", nome: "Ratinho-Queijo", rar: "incomum", tipo: "Sortudo", xp: 0, sorte: 4, efeitos: ["jump_boost"], cura: false, desc: "Fareja tesouros: salto I e +4% de sorte." },
  { id: "tigre", nome: "Tigrinho-Trovão", rar: "raro", tipo: "Aventureiro", xp: 5, sorte: 0, efeitos: ["speed","strength"], cura: false, desc: "Rápido como um raio: velocidade, força e +5% de XP." },
  { id: "unicornio", nome: "Unicórnio-Pastel", rar: "raro", tipo: "Guardião", xp: 4, sorte: 0, efeitos: [], cura: true, desc: "Magia gentil: cura leve quando a vida está baixa e +4% de XP." },
  { id: "medusa", nome: "Medusa-Estrela", rar: "raro", tipo: "Explorador", xp: 0, sorte: 6, efeitos: ["night_vision","water_breathing"], cura: false, desc: "Brilha no fundo do mar: visão noturna, respirar na água e +6% de sorte." },
  { id: "golem", nome: "Golem de Cristal", rar: "raro", tipo: "Guardião", xp: 3, sorte: 0, efeitos: ["resistance"], cura: false, desc: "Casca de cristal: resistência I e +3% de XP." },
  { id: "yeti", nome: "Yeti Fofinho", rar: "raro", tipo: "Guardião", xp: 6, sorte: 0, efeitos: ["resistance"], cura: false, desc: "Peludo e protetor: resistência I e +6% de XP." },
  { id: "raposa_neve", nome: "Raposa-das-Neves", rar: "raro", tipo: "Sortudo", xp: 0, sorte: 8, efeitos: ["speed"], cura: false, desc: "Silenciosa na neve: velocidade I e +8% de sorte." },
  { id: "tanuki", nome: "Tanuki Sorridente", rar: "raro", tipo: "Sortudo", xp: 4, sorte: 10, efeitos: [], cura: false, desc: "Esperto e brincalhão: +4% de XP e +10% de sorte." },
  { id: "kirin", nome: "Kirin Celeste", rar: "lendario", tipo: "Mascote", xp: 10, sorte: 10, efeitos: ["speed","fire_resistance"], cura: true, desc: "Galopa entre nuvens: +10% de XP, +10% de sorte, velocidade, resistência ao fogo e cura." },
  { id: "grifo", nome: "Grifo Dourado", rar: "lendario", tipo: "Aventureiro", xp: 8, sorte: 12, efeitos: ["jump_boost","slow_falling"], cura: false, desc: "Rei dos céus: +8% de XP, +12% de sorte, salto e queda lenta." },
  { id: "sakura", nome: "Raposa-Sakura", rar: "lendario", tipo: "Mascote", xp: 9, sorte: 9, efeitos: ["haste","speed"], cura: true, desc: "Pétalas de primavera: +9% de XP, +9% de sorte, pressa, velocidade e cura." },
  { id: "cerbero", nome: "Cérbero Pequenino", rar: "insano", tipo: "Guardião", xp: 12, sorte: 14, efeitos: ["strength","fire_resistance","resistance"], cura: true, desc: "Três cabeças, um coração: +12% de XP, +14% de sorte, força, resistência, resistência ao fogo e cura." },
  { id: "tempestade", nome: "Dragão da Tempestade", rar: "insano", tipo: "Aventureiro", xp: 14, sorte: 12, efeitos: ["speed","haste","strength"], cura: false, desc: "Traz o trovão: +14% de XP, +12% de sorte, velocidade, pressa e força." },
  { id: "leviata", nome: "Leviatã Mini", rar: "insano", tipo: "Explorador", xp: 12, sorte: 16, efeitos: ["water_breathing","dolphins_grace","night_vision"], cura: true, desc: "Senhor dos mares: +12% de XP, +16% de sorte, respira e nada como rei, visão noturna e cura." },
  { id: "eclipse", nome: "Lobo-Eclipse", rar: "insano", tipo: "Caçador", xp: 13, sorte: 13, efeitos: ["night_vision","strength","speed"], cura: false, desc: "Caça sob a lua escura: +13% de XP, +13% de sorte, visão noturna, força e velocidade." },
  { id: "anjo", nome: "Anjo Guardião", rar: "divino", tipo: "Guardião", xp: 16, sorte: 16, efeitos: ["resistance","regeneration"], cura: true, desc: "Zela por você: +16% de XP, +16% de sorte, resistência, regeneração e cura." },
  { id: "pavao", nome: "Pavão-Aurora", rar: "divino", tipo: "Mascote", xp: 15, sorte: 18, efeitos: ["speed","haste","night_vision"], cura: true, desc: "Cauda de aurora: +15% de XP, +18% de sorte, velocidade, pressa, visão noturna e cura." },
  { id: "kitsune_celeste", nome: "Kitsune Celestial", rar: "divino", tipo: "Mascote", xp: 16, sorte: 17, efeitos: ["speed","regeneration","slow_falling"], cura: true, desc: "Cinco caudas e um halo: +16% de XP, +17% de sorte, velocidade, regeneração, queda lenta e cura." },
  { id: "vulpus", nome: "Vulpus Eterna", rar: "absoluto", tipo: "Mascote", xp: 25, sorte: 25, efeitos: ["speed","haste","strength","regeneration","resistance","night_vision"], cura: true, desc: "A raposa que sonha o servidor: +25% de XP, +25% de sorte, seis efeitos e cura." },
  { id: "infinito", nome: "Dragão do Infinito", rar: "absoluto", tipo: "Aventureiro", xp: 22, sorte: 30, efeitos: ["speed","haste","strength","fire_resistance","water_breathing","slow_falling"], cura: true, desc: "Sem começo nem fim: +22% de XP, +30% de sorte, seis efeitos e cura." },
]);

export const NOMES_EFEITO = Object.freeze({ speed: "velocidade", haste: "pressa", night_vision: "visão noturna", water_breathing: "respirar na água", jump_boost: "salto", slow_falling: "queda lenta", dolphins_grace: "graça do golfinho", fire_resistance: "resistência ao fogo", resistance: "resistência", strength: "força", regeneration: "regeneração" });
/** Efeitos que não crescem com o nível. */
export const EFEITOS_FIXOS = Object.freeze(["night_vision", "water_breathing", "slow_falling", "dolphins_grace", "fire_resistance", "resistance"]);

// ----------------------------------------------------------------------------------- cápsulas
export const TITULO_MAQUINA = "Cápsulas de pet";
export const TITULO_FLUTUANTE = "§d§l✦ CÁPSULAS DE PET ✦\n§7Abra uma e ganhe um companheiro\n§8clique na máquina";
export const CMD_PETS = "Abre a sua coleção de pets";
export const SEM_PETS_LIGADOS = "§7As cápsulas estão descansando hoje.";
export const SEM_MAQUINA = "§7A máquina de cápsulas não está por aqui.";
export const MOTIVO_CAPSULA = "cápsula de pet";

/**
 * @param {number} saldo
 * @param {number} fichas
 * @param {number} hoje
 * @param {number} max
 * @param {number} pr
 * @param {number} pityR
 * @param {number} pl
 * @param {number} pityL
 * @param {number} custo
 */
export const CORPO_MAQUINA = (saldo, fichas, hoje, max, pr, pityR, pl, pityL, custo) =>
  [
    "§7Cada cápsula traz um pet: §7comum§7, §aincomum§7, §9raro§7, §6lendário§7, §cinsano§7, §bdivino §7ou §dabsoluto§7. Repetido vira fragmentos para evoluir o que você já tem.",
    "",
    `§fCusto: §6${custo} Caudas §7ou §d1 ficha`,
    `§fSeu saldo: §6${saldo} Caudas §7· §fFichas: §d${fichas}`,
    `§fAberturas hoje: §e${hoje}§7/${max}`,
    `§7Garantia: raro ou melhor em §f${Math.max(0, pityR - pr)} §7aberturas · lendário ou melhor em §f${Math.max(0, pityL - pl)}`,
  ].join("\n");
/** @param {number} custo */
export const BOTAO_ABRIR = (custo) => `Abrir uma cápsula (${custo} Caudas)`;
/** @param {number} fichas */
export const BOTAO_FICHA = (fichas) => `Abrir com uma ficha (${fichas})`;
/** @param {number} n @param {number} custo */
export const BOTAO_LOTE = (n, custo) => `§6Kitsune: abrir ${n} de uma vez (${custo} Caudas)`;
/** @param {number} n @param {number} fichas */
export const BOTAO_LOTE_FICHA = (n, fichas) => `§6Kitsune: abrir ${n} com fichas (${fichas}/${n})`;
export const TITULO_LOTE = "Resultado das cápsulas";
/** @param {number} n */
export const SEM_TETO_LOTE = (n) => `§cFaltam menos de ${n} aberturas no teto de hoje. Abra uma por vez.`;
/** @param {number} n @param {number} custo */
export const SEM_SALDO_LOTE = (n, custo) => `§cVocê precisa de ${custo} Caudas (ou ${n} fichas) para abrir ${n} cápsulas.`;
/** @param {string} cor @param {string} nome @param {string} rar @param {string} nota */
export const LINHA_LOTE = (cor, nome, rar, nota) => `${cor}${nome} §8(${rar}) §7${nota}`;
export const NOTA_NOVO = "§anovo!";
/** @param {number} f */
export const NOTA_REPETIDO = (f) => `§e+${f} fragmentos`;
export const BOTAO_MEUS_PETS = "Meus pets";
export const BOTAO_COMO_FUNCIONA = "Como ganhar fichas e evoluir";
export const COMO_FUNCIONA = [
  "§6Fichas grátis§7 (uma por vez, sem repetir):",
  "§f• §7Completar os §fPrimeiros passos",
  "§f• §7Cada §f3º dia§7 em que você entrega as 3 quests da Yuki",
  "§f• §7A primeira vez que vencer cada §fguardião da masmorra §7(5 no total)",
  "",
  "§6Evoluir:§7 pet repetido vira fragmentos (comum 2, incomum 3, raro 6, lendário 15, insano 25, divino 40, absoluto 70). Com fragmentos suficientes você sobe o nível do pet, até o 4, e o bônus aumenta.",
  "",
  "§6Equipar:§7 só um pet por vez te segue. Ele não atrapalha e ninguém mexe nele.",
].join("\n");
export const SEM_SALDO = (/** @type {number} */ custo) => `§cVocê precisa de ${custo} Caudas (ou uma ficha) para abrir uma cápsula.`;
export const SEM_FICHA = "§cVocê não tem fichas.";
export const ESPERA = (/** @type {number} */ s) => `§cCalma, aventureiro! Espere ${s}s para abrir outra cápsula.`;
export const LIMITE_DIA = (/** @type {number} */ n) => `§cVocê já abriu ${n} cápsulas hoje. Volte amanhã!`;
export const ABRINDO = "§d§lA cápsula está girando...";
export const OCUPADA = "§7Aguarde a cápsula atual terminar.";

/**
 * @param {string} cor
 * @param {string} nome
 * @param {string} raridade
 */
export const TITULO_RESULTADO = (cor, nome, raridade) => `${cor}§l${nome}`;
/** @param {string} cor @param {string} rar @param {boolean} novo @param {number} frag */
export const SUBTITULO_RESULTADO = (cor, rar, novo, frag) => (novo ? `${cor}${rar} §7· §anovo pet!` : `${cor}${rar} §7· repetido: §e+${frag} fragmentos`);
/** @param {string} nome @param {string} pet @param {string} cor @param {string} rar */
export const AVISO_LENDARIO = (nome, pet, cor, rar) => `${cor}§l✦ ${nome} §r${cor}abriu uma cápsula e ganhou o pet ${rar.toLowerCase()} §f${pet}${cor}! ✦`;
/** @param {string} nome @param {string} pet @param {string} cor */
export const AVISO_RARO = (nome, pet, cor) => `§d${nome} §7ganhou ${cor}${pet} §7numa cápsula!`;
/** @param {number} n @param {string} motivo */
export const FICHA_GANHA = (n, motivo) => `§d+${n} ficha de cápsula §7(${motivo}). Use na máquina do lobby ou em §f/vulpus:pets§7.`;

// ----------------------------------------------------------------------------------- coleção
export const TITULO_COLECAO = "Meus pets";
/**
 * @param {number} total
 * @param {number} tem
 * @param {string} ativos
 * @param {number} n
 * @param {number} max
 */
export const CORPO_COLECAO = (total, tem, ativos, n, max) =>
  `§7Você tem §f${tem}§7 de §f${total}§7 pets. Até §f${max}§7 seguem você ao mesmo tempo (os bônus somam).\n§fAtivos (§e${n}§7/${max}§f): ${ativos}`;
export const NENHUM_ATIVO = "§7nenhum";
export const SEM_PETS = "§7Você ainda não tem pets. Abra uma cápsula na máquina do lobby!";
/** @param {string} nome @param {string} cor @param {number} nivel @param {boolean} ativo */
export const BOTAO_PET = (nome, cor, nivel, ativo) => `${ativo ? "§a★ " : ""}${cor}${nome} §r§8Nv ${nivel}`;
export const BOTAO_NAO_TEM = (/** @type {string} */ nome) => `§8??? ${nome}`;
export const BOTAO_GUARDAR_TODOS = "Guardar todos os pets";
export const BOTAO_GUARDAR = "Guardar este pet";
export const BOTAO_ESCONDER = "Esconder meus pets (Kitsune)";
export const BOTAO_MOSTRAR = "Mostrar meus pets (Kitsune)";
export const DICA_KITSUNE = "§8Dica: quem é Kitsune pode esconder os pets sem perder os bônus.";
export const ESCONDIDOS = "§7Seus pets ficam escondidos (os bônus continuam valendo).";
export const VISIVEIS = "§aSeus pets voltaram a aparecer.";
/** @param {string} nome */
export const BOTAO_TROCAR = (nome) => `Trocar com ${nome}`;
export const BOTAO_EQUIPAR = "Equipar este pet";
/** @param {number} custo @param {number} tem */
export const BOTAO_EVOLUIR = (custo, tem) => `Evoluir (${tem}/${custo} fragmentos)`;
export const NIVEL_MAXIMO = "Nível máximo!";
/** @param {string} nome */
export const EQUIPOU = (nome) => `§a${nome} §7agora segue você.`;
export const DESEQUIPOU = "§7Pet guardado.";
/** @param {string} nome @param {number} nivel */
export const EVOLUIU = (nome, nivel) => `§6${nome} §asubiu para o nível ${nivel}!`;
export const SEM_FRAGMENTOS = "§cFragmentos insuficientes.";
/**
 * @param {string} cor
 * @param {string} nome
 * @param {string} rar
 * @param {string} tipo
 * @param {number} nivel
 * @param {string} desc
 * @param {string[]} bonus
 * @param {number} frag
 */
export const CORPO_PET = (cor, nome, rar, tipo, nivel, desc, bonus, frag) =>
  [`${cor}§l${nome} §r§7(${rar} · ${tipo})`, `§fNível §e${nivel}§7/4 · fragmentos: §e${frag}`, "", `§7${desc}`, "", ...bonus.map((b) => `§f• §7${b}`)].join("\n");
export const BONUS_XP = (/** @type {number} */ v) => `XP: +${v}%`;
export const BONUS_SORTE = (/** @type {number} */ v) => `Sorte na masmorra: +${v}%`;
export const BONUS_EFEITO = (/** @type {string} */ nome, /** @type {number} */ amp) => `${nome} ${amp === 0 ? "I" : "II"}`;
export const BONUS_CURA = (/** @type {number} */ s) => `Cura leve a cada ${s} s quando você está ferido`;

// ----------------------------------------------------------------------------------- painel da staff
export const BOTAO_STAFF = "Cápsulas e pets";
export const TITULO_STAFF = "Cápsulas de pet (staff)";
/** @param {number} n */
export const CORPO_STAFF = (n) =>
  `§7Máquinas de cápsula do lobby (ficam no bloco que você olhar), fichas para eventos e configuração. Máquinas postas: §f${n}§7.`;
export const BOTAO_NOVA_MAQUINA = "Pôr uma máquina no bloco que estou olhando";
export const BOTAO_DAR_FICHAS = "Dar fichas a alguém online";
export const BOTAO_DAR_PETS = "Dar todos os pets a alguém online";
export const ROTULO_NIVEL = "Nível dos pets (1 a 4)";
/** @param {number} n @param {string} quem */
export const PETS_DADOS = (n, quem) => `§a${quem} recebeu os ${n} pets.`;
/** @param {number} n */
export const PETS_RECEBIDOS = (n) => `§d§lPresente da staff! §r§7Você ganhou todos os §f${n} pets§7. Abra §f/vulpus:pets §7para equipar.`;
export const BOTAO_CONFIG = "Preço, limites e bônus";
export const SEM_MAQUINAS = "§7Nenhuma máquina ainda.";
export const OLHE_PARA_BLOCO = "§cOlhe para o bloco onde a máquina vai ficar (até 12 blocos).";
/** @param {string} coords */
export const MAQUINA_POSTA = (coords) => `§aMáquina de cápsulas posta em §e${coords}§a.`;
export const MAQUINA_REMOVIDA = "§aMáquina removida.";
export const LIMITE_MAQUINAS = (/** @type {number} */ n) => `§cO limite é de ${n} máquinas.`;
export const BOTAO_IR = "Ir até ela";
export const BOTAO_REMOVER = "Remover esta máquina";
export const ROTULO_QUEM = "Quem recebe";
export const ROTULO_QTD = "Quantas fichas";
export const NINGUEM_ONLINE = "§cNinguém online para receber.";
/** @param {number} n @param {string} nome */
export const FICHAS_DADAS = (n, nome) => `§a${n} ficha(s) entregue(s) a §e${nome}§a.`;
