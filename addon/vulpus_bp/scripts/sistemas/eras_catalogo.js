// @ts-check
// Catálogo das 20 Eras da Vulpus: um perfil independente por Era (neblina, partículas, sons, transição e mecânicas). Aqui só tem
// DADOS: o calendário (eras_calendario.js), o visual (eras_visual.js) e as mecânicas (eras_mecanicas.js) leem este arquivo.
// Para mudar uma Era basta editar o perfil dela; para a neblina valer no jogo, rode `node tools/gerar_fogs_eras.mjs` (gera os
// vulpus_rp/fogs/era_NN.json a partir daqui) e suba o pacote de recursos.
//
// Estratégia comum de aplicação: a neblina é empurrada por jogador com `fog @s push vulpus:era_NN "vulpus_era"` (um só id, então
// nunca acumula) e tirada com `fog @s remove "vulpus_era"`; as partículas e os sons são só ao redor de quem está jogando. Nada aqui
// mexe em blocos, entidades, inventários ou construções. As mecânicas são regras temporárias de script (efeitos curtos que expiram
// sozinhos, multiplicadores e prêmios com teto diário).

/** @typedef {{ red: number, green: number, blue: number }} RGB */
/**
 * Condições (todas precisam valer): dia, noite, ceu (céu aberto), teto (sob cobertura), caverna (subsolo), agua, folhas (perto de
 * muitas folhas), altura (acima do Y 90), sempre.
 * @typedef {"dia" | "noite" | "ceu" | "teto" | "caverna" | "agua" | "folhas" | "altura" | "sempre"} Condicao
 */
/** @typedef {{ efeito: string, nivel: number, quando: Condicao[], tipo: "buff" | "debuff" }} EfeitoEra  nivel 0 = efeito I */
/** @typedef {{ mult: number, quando?: Condicao[] }} Multiplicador */
/**
 * @typedef {object} Mecanicas
 * @property {EfeitoEra[]} efeitos  efeitos de poção curtos, renovados enquanto a condição vale (nunca em combate)
 * @property {Multiplicador} [xp]  multiplica o XP ganho
 * @property {Multiplicador} [caudasMinuto]  multiplica as Caudas do tempo online
 * @property {{ mult: number, teto: number, tetoDia: number, porItem: number }} [venda]  bônus (pago em Caudas, sem duplicar itens) sobre plantações
 *   vendidas no leilão; teto por venda, por vendedor e por dia, e por item vendido (trava anúncios de preço absurdo entre contas amigas)
 * @property {{ chance: number, premios: [string, number, number][], tetoDia: number }} [colheita]  chance (0 a 1) de prêmio extra ao colher plantação madura
 * @property {{ chance: number, caudas: number, tetoDia: number }} [minerio]  chance de Caudas extras ao quebrar minério
 * @property {{ caudas: number, tetoDia: number, quando?: Condicao[] }} [abate]  Caudas por monstro comum abatido
 * @property {{ cadaMin: number, duracaoSeg: number, xp?: number, caudas?: number, nome: string }} [pulso]  janela periódica para todos
 */
/**
 * @typedef {object} Perfil
 * @property {string} id  "era_01"
 * @property {number} numero  1 a 20
 * @property {string} nome
 * @property {string} conceito
 * @property {string} emocional  objetivo emocional
 * @property {string} descricao  o que a pessoa vê e sente
 * @property {string[]} paleta  cores (hex) da identidade
 * @property {{ cor: string, agua: string, inicio: number, fim: number }} fog  neblina do ar (blocos) e cor da água
 * @property {{ id: string, cor?: RGB, n: number, raio: number, alturaMin: number, alturaMax: number, aoLonge?: boolean, chance: number }[]} particulas
 *   n por segundo (a cada 20 ticks, com chance); aoLonge = anel distante (10 a 20 blocos) em vez de em volta
 * @property {{ id: string, volume: number, pitch: number }[]} sons
 * @property {[number, number]} intervaloSom  segundos entre um som e outro (por jogador)
 * @property {number} [fundo]  volume do fundo sonoro contínuo da Era (0 a 0,8; padrão 0,45; a Sala Branca é quase silêncio)
 * @property {{ cor: RGB, seg: number }} transicao  fade de tela ao entrar na Era (seg 0 = sem fade)
 * @property {{ chance: number, cor: RGB }} [flash]  piscada de tela muito breve e rara (chance por segundo, por jogador)
 * @property {string} titulo
 * @property {string} subtitulo
 * @property {string} apresentacao  mensagem no chat quando a Era começa
 * @property {Mecanicas} mecanicas
 * @property {string[]} limitacoes  o que o Bedrock não deixa fazer e como esta Era contorna
 */

/** @param {string} hex @returns {RGB} */
export function rgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

/** @type {Condicao[]} */
const DIA_CEU = ["dia", "ceu"];
/** @type {Condicao[]} */
const NOITE_CEU = ["noite", "ceu"];

/** @type {readonly Perfil[]} */
export const ERAS = Object.freeze([
  {
    id: "era_01", numero: 1, nome: "O Primeiro Suspiro",
    conceito: "Nascimento, acolhimento e descoberta.",
    emocional: "Segurança e curiosidade.",
    descricao: "A floresta viva e luminosa que define a identidade de referência da Vulpus: neblina suave, vagalumes dourados e passarinhos.",
    paleta: ["#e8b25a", "#6fa55a", "#f2e3b8"],
    fog: { cor: "#f1e0ac", agua: "#4f8a6a", inicio: 13, fim: 62 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffd36b"), n: 2, raio: 7, alturaMin: 0.5, alturaMax: 3, chance: 0.9 }],
    sons: [{ id: "vulpus.p_passaro_1", volume: 0.6, pitch: 1 }, { id: "vulpus.p_passaro_2", volume: 0.6, pitch: 1 }, { id: "vulpus.p_passaro_3", volume: 0.6, pitch: 1 }],
    intervaloSom: [30, 90],
    transicao: { cor: rgb("#fff3d0"), seg: 1.2 },
    titulo: "§6Era 1", subtitulo: "§eO Primeiro Suspiro",
    apresentacao: "A floresta acordou. Tudo começa aqui, com calma.",
    mecanicas: {
      efeitos: [{ efeito: "regeneration", nivel: 0, quando: DIA_CEU, tipo: "buff" }],
      xp: { mult: 1.1 },
    },
    limitacoes: ["Sem debuffs: é a Era de acolhimento."],
  },
  {
    id: "era_02", numero: 2, nome: "Outono das Memórias",
    conceito: "Nostalgia e passagem do tempo.",
    emocional: "Saudade boa, contemplação.",
    descricao: "Cobre, dourado e marrom. Brasas quentes flutuam e o vento sopra entre as árvores. É a Era da Colheita.",
    paleta: ["#b87333", "#d9a441", "#6b4226"],
    fog: { cor: "#d89b54", agua: "#6b5a3a", inicio: 9, fim: 43 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#c4762f"), n: 2, raio: 7, alturaMin: 1, alturaMax: 4, chance: 0.9 }],
    sons: [{ id: "vulpus.p_vento_rajada_1", volume: 0.45, pitch: 1 }, { id: "vulpus.p_vento_rajada_3", volume: 0.45, pitch: 1 }],
    intervaloSom: [40, 100],
    transicao: { cor: rgb("#8a5a2b"), seg: 1.2 },
    titulo: "§6Era 2", subtitulo: "§eOutono das Memórias",
    apresentacao: "O ar cheira a lembrança. É tempo de colher.",
    mecanicas: {
      efeitos: [
        { efeito: "regeneration", nivel: 0, quando: DIA_CEU, tipo: "buff" },
        { efeito: "slowness", nivel: 0, quando: ["folhas"], tipo: "debuff" },
      ],
      venda: { mult: 2, teto: 2000, tetoDia: 6000, porItem: 40 },
      colheita: { chance: 0.1, premios: [["minecraft:lapis_lazuli", 1, 3], ["minecraft:raw_copper", 1, 2], ["minecraft:experience_bottle", 1, 1]], tetoDia: 10 },
    },
    limitacoes: ["Não troca folhas nem biomas: o outono é só a atmosfera.", "O bônus de venda vale para plantações vendidas no leilão e é pago em Caudas, sem duplicar itens."],
  },
  {
    id: "era_03", numero: 3, nome: "As Lanternas Distantes",
    conceito: "Exploração noturna e mistério.",
    emocional: "Curiosidade e um pouco de coragem.",
    descricao: "Azul profundo com pontos dourados perdidos ao longe, como lanternas de alguém que também explora a floresta.",
    paleta: ["#14213d", "#e0b04c", "#2b3a67"],
    fog: { cor: "#14295a", agua: "#102244", inicio: 7, fim: 35 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffcf5e"), n: 1, raio: 18, alturaMin: 0.5, alturaMax: 3, aoLonge: true, chance: 0.8 }],
    sons: [{ id: "vulpus.p_flauta_distante_1", volume: 0.4, pitch: 1 }, { id: "vulpus.p_ding_suave", volume: 0.35, pitch: 1 }],
    intervaloSom: [60, 150],
    transicao: { cor: rgb("#0c1530"), seg: 1.4 },
    titulo: "§9Era 3", subtitulo: "§6As Lanternas Distantes",
    apresentacao: "Luzes pequenas piscam longe, entre as árvores. Será que alguém te espera lá?",
    mecanicas: {
      efeitos: [
        { efeito: "speed", nivel: 0, quando: NOITE_CEU, tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["dia"], tipo: "debuff" },
      ],
      caudasMinuto: { mult: 1.2, quando: ["noite"] },
    },
    limitacoes: ["O servidor não muda o horário do céu de um jogador só: a atmosfera noturna vem da neblina azul."],
  },
  {
    id: "era_04", numero: 4, nome: "O Inverno Silencioso",
    conceito: "Frio, silêncio e isolamento.",
    emocional: "Quietude e aconchego de quem está abrigado.",
    descricao: "Branco, cinza e azul-gelo. Poucos flocos, quase nenhum som: o mundo parece prender a respiração.",
    paleta: ["#eef3f8", "#9fb8cc", "#c9d3dc"],
    fog: { cor: "#dce8f3", agua: "#7fa2bd", inicio: 8, fim: 34 },
    particulas: [{ id: "minecraft:snowflake_particle", n: 3, raio: 9, alturaMin: 3, alturaMax: 10, chance: 0.9 }],
    sons: [{ id: "vulpus.p_vento_rajada_1", volume: 0.25, pitch: 0.9 }],
    intervaloSom: [120, 240],
    transicao: { cor: rgb("#eef3f8"), seg: 1.5 },
    titulo: "§bEra 4", subtitulo: "§fO Inverno Silencioso",
    apresentacao: "A neve abafa tudo. Procure um teto e fique um pouco.",
    mecanicas: {
      efeitos: [
        { efeito: "haste", nivel: 0, quando: ["teto"], tipo: "buff" },
        { efeito: "slowness", nivel: 0, quando: NOITE_CEU, tipo: "debuff" },
      ],
      xp: { mult: 1.1 },
      pulso: { cadaMin: 60, duracaoSeg: 90, xp: 1.5, nome: "Lareira Acesa" },
    },
    limitacoes: ["Não cobre o mundo de neve: os flocos são partículas só perto de cada jogador.", "Poucas partículas de propósito, para não atrapalhar a visão."],
  },
  {
    id: "era_05", numero: 5, nome: "A Última Primavera",
    conceito: "Beleza, fragilidade e despedida.",
    emocional: "Ternura com um fundo de melancolia.",
    descricao: "Rosa-pálido, branco e verde suave. Pétalas caindo devagar, um sino distante que lembra que tudo passa.",
    paleta: ["#f3c6d3", "#ffffff", "#9cc59a"],
    fog: { cor: "#f7dae3", agua: "#7fb8a0", inicio: 16, fim: 68 },
    particulas: [{ id: "minecraft:cherry_leaves_particle", n: 3, raio: 9, alturaMin: 3, alturaMax: 10, chance: 0.85 }],
    sons: [{ id: "vulpus.p_sino_suave_1", volume: 0.45, pitch: 1 }, { id: "vulpus.p_sino_suave_2", volume: 0.45, pitch: 1 }, { id: "vulpus.p_sino_suave_3", volume: 0.45, pitch: 1 }, { id: "vulpus.p_sino_suave_4", volume: 0.45, pitch: 1 }],
    intervaloSom: [120, 300],
    transicao: { cor: rgb("#ffe6ee"), seg: 1.3 },
    titulo: "§dEra 5", subtitulo: "§fA Última Primavera",
    apresentacao: "Tudo floresce uma última vez. Olhe com carinho.",
    mecanicas: {
      efeitos: [
        { efeito: "regeneration", nivel: 0, quando: DIA_CEU, tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["noite"], tipo: "debuff" },
      ],
      venda: { mult: 1.5, teto: 1500, tetoDia: 4000, porItem: 30 },
      colheita: { chance: 0.14, premios: [["minecraft:lapis_lazuli", 1, 2], ["minecraft:raw_iron", 1, 2]], tetoDia: 12 },
    },
    limitacoes: ["As pétalas são partículas: nenhum bloco muda."],
  },
  {
    id: "era_06", numero: 6, nome: "Onde os Sonhos Começam",
    conceito: "A passagem da realidade para o universo onírico.",
    emocional: "Estranhamento suave.",
    descricao: "Azul-leitoso e prata. A neblina se adensa, o brilho flutua devagar e o mundo deixa de parecer inteiramente familiar.",
    paleta: ["#c9d6f2", "#c0c6d4", "#e6ebf7"],
    fog: { cor: "#cedaf7", agua: "#8ea5d6", inicio: 6, fim: 30 },
    particulas: [{ id: "minecraft:endrod", n: 2, raio: 7, alturaMin: 0.5, alturaMax: 4, chance: 0.9 }],
    sons: [{ id: "vulpus.p_ding_suave", volume: 0.4, pitch: 0.8 }, { id: "vulpus.p_sussurro_curto_1", volume: 0.2, pitch: 1 }],
    intervaloSom: [90, 180],
    transicao: { cor: rgb("#dfe6f7"), seg: 1.6 },
    titulo: "§bEra 6", subtitulo: "§fOnde os Sonhos Começam",
    apresentacao: "Algo mudou, e você não sabe dizer o quê. Continue andando.",
    mecanicas: {
      efeitos: [
        { efeito: "slow_falling", nivel: 0, quando: ["altura"], tipo: "buff" },
        { efeito: "jump_boost", nivel: 0, quando: NOITE_CEU, tipo: "buff" },
        { efeito: "mining_fatigue", nivel: 0, quando: ["caverna"], tipo: "debuff" },
      ],
    },
    limitacoes: ["Sem shader: o ar de sonho vem da neblina leitosa e das partículas."],
  },
  {
    id: "era_07", numero: 7, nome: "O Jardim Impossível",
    conceito: "Beleza irreal e natureza onírica.",
    emocional: "Encanto com um pouco de estranheza.",
    descricao: "Verde-pálido, lilás e branco. Esporos lilás sobem do chão e sinos delicados soam onde não deveria haver ninguém.",
    paleta: ["#b7d9b0", "#c9a8f0", "#ffffff"],
    fog: { cor: "#d2eccc", agua: "#9a86c8", inicio: 8, fim: 37 },
    particulas: [
      { id: "minecraft:villager_happy", n: 2, raio: 7, alturaMin: 0.3, alturaMax: 3, chance: 0.9 },
      { id: "minecraft:colored_flame_particle", cor: rgb("#c9a8f0"), n: 1, raio: 7, alturaMin: 0.5, alturaMax: 3.5, chance: 0.8 },
    ],
    sons: [{ id: "vulpus.p_sino_suave_2", volume: 0.4, pitch: 1.2 }, { id: "vulpus.p_sino_suave_3", volume: 0.4, pitch: 1.2 }],
    intervaloSom: [60, 150],
    transicao: { cor: rgb("#e3d6fa"), seg: 1.3 },
    titulo: "§aEra 7", subtitulo: "§dO Jardim Impossível",
    apresentacao: "As flores aqui não deveriam existir. Mesmo assim, são lindas.",
    mecanicas: {
      efeitos: [
        { efeito: "jump_boost", nivel: 1, quando: ["ceu"], tipo: "buff" },
        { efeito: "slowness", nivel: 0, quando: ["caverna"], tipo: "debuff" },
      ],
      xp: { mult: 1.15 },
    },
    limitacoes: ["Não planta nada: o jardim é feito de luz e partículas."],
  },
  {
    id: "era_08", numero: 8, nome: "A Floresta que Observa",
    conceito: "Presença desconhecida e inquietação.",
    emocional: "Cautela, sem sustos.",
    descricao: "Verde-petróleo com dourado distante. Silhuetas se destacam na neblina e, às vezes, parece que alguém anda onde não há ninguém.",
    paleta: ["#1f4a4a", "#d4b15a", "#0f2a2a"],
    fog: { cor: "#1f5653", agua: "#143838", inicio: 6, fim: 25 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#d4b15a"), n: 1, raio: 20, alturaMin: 1, alturaMax: 3, aoLonge: true, chance: 0.35 }],
    sons: [
      { id: "vulpus.p_passos_distantes_1", volume: 0.35, pitch: 1 }, { id: "vulpus.p_passos_distantes_2", volume: 0.35, pitch: 1 },
      { id: "vulpus.p_rangido_madeira_1", volume: 0.3, pitch: 1 }, { id: "vulpus.p_rangido_madeira_2", volume: 0.3, pitch: 1 }, { id: "vulpus.p_rangido_madeira_3", volume: 0.3, pitch: 1 },
    ],
    intervaloSom: [60, 180],
    transicao: { cor: rgb("#0d2a2a"), seg: 1.2 },
    titulo: "§3Era 8", subtitulo: "§6A Floresta que Observa",
    apresentacao: "Você tem a sensação de estar sendo olhado. Provavelmente é só a floresta.",
    mecanicas: {
      efeitos: [
        { efeito: "speed", nivel: 0, quando: ["folhas"], tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: NOITE_CEU, tipo: "debuff" },
      ],
      abate: { caudas: 6, tetoDia: 18, quando: ["noite"] },
    },
    limitacoes: ["Os pontos dourados são partículas ao longe, nunca entidades: nada aparece de verdade."],
  },
  {
    id: "era_09", numero: 9, nome: "Corredores do SONHE",
    conceito: "Espaços liminares, repetição e geometria estranha.",
    emocional: "Vazio calmo, quase hipnótico.",
    descricao: "Branco, cinza-claro e azul frio. A neblina é pálida, o silêncio é grande e só uma lâmpada falha de vez em quando. Uma homenagem à Sala Branca.",
    paleta: ["#f2f4f7", "#b9c4d6", "#dfe5ee"],
    fog: { cor: "#edf1f7", agua: "#a9b9d0", inicio: 4, fim: 21 },
    particulas: [],
    sons: [{ id: "vulpus.p_lampada_falhando_1", volume: 0.3, pitch: 1 }, { id: "vulpus.p_lampada_falhando_2", volume: 0.3, pitch: 1 }],
    intervaloSom: [40, 120],
    fundo: 0.3,
    transicao: { cor: rgb("#ffffff"), seg: 0.8 },
    titulo: "§fEra 9", subtitulo: "§7Corredores do SONHE",
    apresentacao: "Tudo parece o mesmo corredor. Siga em frente.",
    mecanicas: {
      efeitos: [
        { efeito: "speed", nivel: 0, quando: ["sempre"], tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["teto"], tipo: "debuff" },
      ],
      caudasMinuto: { mult: 1.15 },
    },
    limitacoes: ["Não leva ninguém à Sala Branca nem mexe no terreno: é só atmosfera."],
  },
  {
    id: "era_10", numero: 10, nome: "Não Esqueça",
    conceito: "Memória, persistência e mensagens ocultas.",
    emocional: "Um aperto bom no peito.",
    descricao: "Dourado de trigo, preto e tons pálidos. Poeira dourada no ar e, muito raramente, um telefone toca abafado em algum lugar do campo.",
    paleta: ["#d8b45c", "#0b0b0b", "#d9d2c0"],
    fog: { cor: "#e5cb80", agua: "#6b6340", inicio: 7, fim: 31 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#e6c673"), n: 2, raio: 7, alturaMin: 0.3, alturaMax: 3, chance: 0.9 }],
    sons: [{ id: "vulpus.ligacao", volume: 0.35, pitch: 1 }],
    intervaloSom: [1200, 2400],
    transicao: { cor: rgb("#f0dd9c"), seg: 1.3 },
    titulo: "§6Era 10", subtitulo: "§eNão Esqueça",
    apresentacao: "O trigo balança. Em algum lugar, um telefone toca para você.",
    mecanicas: {
      efeitos: [{ efeito: "slowness", nivel: 0, quando: NOITE_CEU, tipo: "debuff" }],
      xp: { mult: 1.25 },
      colheita: { chance: 0.12, premios: [["minecraft:gold_nugget", 1, 3], ["minecraft:experience_bottle", 1, 1]], tetoDia: 12 },
      pulso: { cadaMin: 90, duracaoSeg: 120, xp: 2, nome: "A Ligação" },
    },
    limitacoes: ["O telefone é um som raro, sem texto na tela.", "Não cria o campo de trigo: ele já existe na narrativa."],
  },
  {
    id: "era_11", numero: 11, nome: "As Coisas Esquecidas",
    conceito: "Decadência e perda de memória.",
    emocional: "Melancolia, desgaste, abandono.",
    descricao: "Cinza, verde apagado e marrom. Neblina dessaturada, poeira parada e rangidos de madeira velha.",
    paleta: ["#8a8d86", "#6b7560", "#6a5543"],
    fog: { cor: "#8f9187", agua: "#5b665a", inicio: 6, fim: 25 },
    particulas: [{ id: "minecraft:basic_smoke_particle", n: 2, raio: 7, alturaMin: 0.5, alturaMax: 3, chance: 0.8 }],
    sons: [{ id: "vulpus.p_rangido_madeira_1", volume: 0.35, pitch: 0.8 }, { id: "vulpus.p_rangido_madeira_2", volume: 0.35, pitch: 0.8 }, { id: "vulpus.p_vento_rajada_3", volume: 0.25, pitch: 0.8 }],
    intervaloSom: [60, 150],
    transicao: { cor: rgb("#7a7d75"), seg: 1.2 },
    titulo: "§7Era 11", subtitulo: "§8As Coisas Esquecidas",
    apresentacao: "O que foi esquecido ainda está por aí, esperando alguém lembrar.",
    mecanicas: {
      efeitos: [{ efeito: "hunger", nivel: 0, quando: ["caverna"], tipo: "debuff" }],
      minerio: { chance: 0.15, caudas: 8, tetoDia: 20 },
    },
    limitacoes: ["Não apaga nem desgasta nada: a decadência é só a cor do ar."],
  },
  {
    id: "era_12", numero: 12, nome: "A Lua Rubra",
    conceito: "Presságio e inquietação.",
    emocional: "Tensão contida.",
    descricao: "Vermelho-escuro e preto. A neblina fica curta e pesada, brasas vermelhas sobem raras e uma batida grave soa ao longe.",
    paleta: ["#3a0a0f", "#0a0a0a", "#8c1d28"],
    fog: { cor: "#44050c", agua: "#2a0a10", inicio: 4, fim: 20 },
    particulas: [
      { id: "minecraft:lava_particle", n: 1, raio: 6, alturaMin: 0.3, alturaMax: 2, chance: 0.7 },
      { id: "minecraft:redstone_ore_dust_particle", n: 2, raio: 7, alturaMin: 0.5, alturaMax: 3, chance: 0.8 },
    ],
    sons: [{ id: "vulpus.p_dark_ambience_ambience_1", volume: 0.4, pitch: 0.8 }, { id: "vulpus.p_dark_ambience_ambience_4", volume: 0.4, pitch: 0.8 }, { id: "vulpus.p_dark_ambience_ambience_5", volume: 0.4, pitch: 0.8 }],
    intervaloSom: [90, 240],
    transicao: { cor: rgb("#3a0a0f"), seg: 1.4 },
    titulo: "§4Era 12", subtitulo: "§cA Lua Rubra",
    apresentacao: "O céu ficou estranho. Quem sair à noite pode ser recompensado... ou não.",
    mecanicas: {
      efeitos: [
        { efeito: "haste", nivel: 0, quando: ["noite"], tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: NOITE_CEU, tipo: "debuff" },
      ],
      abate: { caudas: 10, tetoDia: 25, quando: ["noite"] },
    },
    limitacoes: ["Não existe lua vermelha de verdade: o servidor não troca o céu, então o presságio vem da neblina e das brasas."],
  },
  {
    id: "era_13", numero: 13, nome: "Erro de Realidade",
    conceito: "Falha, corrupção e instabilidade.",
    emocional: "Desconforto breve e controlado.",
    descricao: "Preto, branco e um vermelho pontual. A neblina parece errada, a tela pisca por um instante e uma estática curta corta o silêncio.",
    paleta: ["#0a0a0a", "#f5f5f5", "#c4161c"],
    fog: { cor: "#1a1a1c", agua: "#101012", inicio: 3, fim: 22 },
    particulas: [{ id: "minecraft:basic_crit_particle", n: 1, raio: 6, alturaMin: 0.5, alturaMax: 3, chance: 0.6 }],
    sons: [{ id: "vulpus.p_lampada_falhando_1", volume: 0.3, pitch: 0.6 }, { id: "vulpus.p_lampada_falhando_2", volume: 0.3, pitch: 0.6 }, { id: "vulpus.p_sussurro_curto_2", volume: 0.2, pitch: 0.7 }],
    intervaloSom: [25, 90],
    fundo: 0.35,
    transicao: { cor: rgb("#050505"), seg: 0.6 },
    flash: { chance: 0.012, cor: rgb("#f5f5f5") },
    titulo: "§8Era 13", subtitulo: "§cErro de Realidade",
    apresentacao: "Algo não está certo. Não se preocupe: nada aqui vai te machucar.",
    mecanicas: {
      efeitos: [
        { efeito: "haste", nivel: 0, quando: ["sempre"], tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["noite"], tipo: "debuff" },
      ],
      pulso: { cadaMin: 40, duracaoSeg: 40, xp: 3, nome: "Pico de Instabilidade" },
    },
    limitacoes: ["O glitch é só visual e sonoro: nada de teleporte, morte, perda de item ou mudança de estado."],
  },
  {
    id: "era_14", numero: 14, nome: "A Vila Sem Ninguém",
    conceito: "Abandono e ausência.",
    emocional: "Silêncio de lugar sem gente.",
    descricao: "Cinza-azulado e amarelo envelhecido. Poeira parada, vento e um mundo que continua existindo mesmo parecendo vazio.",
    paleta: ["#7c8a99", "#c9b458", "#4d5864"],
    fog: { cor: "#8395a7", agua: "#56677a", inicio: 7, fim: 32 },
    particulas: [{ id: "minecraft:white_smoke_particle", n: 1, raio: 7, alturaMin: 0.5, alturaMax: 3, chance: 0.8 }],
    sons: [{ id: "vulpus.p_vento_rajada_1", volume: 0.35, pitch: 0.9 }, { id: "vulpus.p_apito_de_trem_distante", volume: 0.25, pitch: 1 }],
    intervaloSom: [150, 420],
    transicao: { cor: rgb("#8795a3"), seg: 1.3 },
    titulo: "§7Era 14", subtitulo: "§eA Vila Sem Ninguém",
    apresentacao: "As janelas estão acesas na memória, mas não tem ninguém. Ainda assim, dá para ficar.",
    mecanicas: {
      efeitos: [
        { efeito: "speed", nivel: 0, quando: DIA_CEU, tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["teto"], tipo: "debuff" },
      ],
    },
    limitacoes: ["Ninguém, nada e nenhuma construção some: a ausência é só a sensação do ar."],
  },
  {
    id: "era_15", numero: 15, nome: "Ela Deixou Isso para Você",
    conceito: "Segredo, vestígio e descoberta.",
    emocional: "Carinho misterioso.",
    descricao: "Preto, dourado e verde-musgo. Pontinhos dourados aparecem raros no escuro e uma música de caixinha toca longe, como um recado deixado por alguém.",
    paleta: ["#0e0e0c", "#d4af37", "#4a5d3a"],
    fog: { cor: "#161911", agua: "#1d2a1a", inicio: 4, fim: 22 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffd34d"), n: 1, raio: 8, alturaMin: 0.3, alturaMax: 3, chance: 0.5 }],
    sons: [{ id: "vulpus.p_flauta_distante_2", volume: 0.3, pitch: 1.3 }, { id: "vulpus.p_flauta_distante_3", volume: 0.3, pitch: 1.3 }],
    intervaloSom: [90, 200],
    transicao: { cor: rgb("#0a0a08"), seg: 1.3 },
    titulo: "§6Era 15", subtitulo: "§2Ela Deixou Isso para Você",
    apresentacao: "Tem uma flor dourada em algum lugar. Alguém a deixou para você.",
    mecanicas: {
      efeitos: [
        { efeito: "regeneration", nivel: 0, quando: ["noite"], tipo: "buff" },
        { efeito: "slowness", nivel: 0, quando: DIA_CEU, tipo: "debuff" },
      ],
      minerio: { chance: 0.1, caudas: 10, tetoDia: 20 },
      colheita: { chance: 0.2, premios: [["minecraft:gold_nugget", 2, 4]], tetoDia: 15 },
    },
    limitacoes: ["A flor dourada é da narrativa: esta Era só empresta o clima."],
  },
  {
    id: "era_16", numero: 16, nome: "A Sala Branca",
    conceito: "Vazio, isolamento e suspensão.",
    emocional: "Calma absoluta.",
    descricao: "Branco dominante e cinza muito claro. Quase nenhum efeito, de propósito: a força vem da ausência.",
    paleta: ["#ffffff", "#ededed", "#f7f7f7"],
    fog: { cor: "#f6f6f6", agua: "#d8dde4", inicio: 6, fim: 20 },
    particulas: [],
    sons: [],
    intervaloSom: [600, 600],
    fundo: 0.12,
    transicao: { cor: rgb("#ffffff"), seg: 1 },
    titulo: "§fEra 16", subtitulo: "§7A Sala Branca",
    apresentacao: "Não tem nada aqui. É de propósito.",
    mecanicas: {
      efeitos: [{ efeito: "saturation", nivel: 0, quando: ["sempre"], tipo: "buff" }],
    },
    limitacoes: ["Sem partículas e sem sons: é a Era mais simples. Sem debuffs, porque a ausência é o próprio efeito."],
  },
  {
    id: "era_17", numero: 17, nome: "O Mar sem Estrelas",
    conceito: "Imensidão e solidão.",
    emocional: "Pequenez diante do grande.",
    descricao: "Azul quase preto e prata. Luzes prateadas sobem devagar e ondas soam ao longe, como se o mundo inteiro fosse mar.",
    paleta: ["#050a1a", "#c0c8d8", "#16213a"],
    fog: { cor: "#03102f", agua: "#050c20", inicio: 4, fim: 20 },
    particulas: [{ id: "minecraft:endrod", n: 2, raio: 7, alturaMin: 0.3, alturaMax: 4, chance: 0.9 }],
    sons: [{ id: "vulpus.p_gota_agua_1", volume: 0.4, pitch: 0.8 }, { id: "vulpus.p_gota_agua_2", volume: 0.4, pitch: 0.8 }, { id: "vulpus.p_gota_agua_3", volume: 0.4, pitch: 0.8 }, { id: "vulpus.p_vento_rajada_3", volume: 0.2, pitch: 0.7 }],
    intervaloSom: [30, 90],
    transicao: { cor: rgb("#030712"), seg: 1.5 },
    titulo: "§1Era 17", subtitulo: "§7O Mar sem Estrelas",
    apresentacao: "Não tem estrelas. Só você e o escuro grande.",
    mecanicas: {
      efeitos: [
        { efeito: "water_breathing", nivel: 0, quando: ["agua"], tipo: "buff" },
        { efeito: "dolphins_grace", nivel: 0, quando: ["agua"], tipo: "buff" },
        { efeito: "slowness", nivel: 0, quando: NOITE_CEU, tipo: "debuff" },
      ],
    },
    limitacoes: ["Não cria oceano nem muda o mapa: a imensidão é a neblina profunda."],
  },
  {
    id: "era_18", numero: 18, nome: "O Véu se Rompe",
    conceito: "A ruptura da realidade.",
    emocional: "Instabilidade crescente, com respeito ao que a Vulpus é.",
    descricao: "Preto, dourado e cinza. Fendas douradas pulsam no ar e um sino rachado soa de vez em quando, lembrando que a Vulpus de sempre continua ali.",
    paleta: ["#0b0b0b", "#d4af37", "#808080"],
    fog: { cor: "#141414", agua: "#0e0e10", inicio: 4, fim: 21 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffcc33"), n: 2, raio: 7, alturaMin: 0.3, alturaMax: 4, chance: 0.8 }],
    sons: [{ id: "vulpus.p_sino_feira_1", volume: 0.35, pitch: 0.5 }, { id: "vulpus.p_dark_ambience_ambience_5", volume: 0.3, pitch: 0.9 }],
    intervaloSom: [120, 300],
    transicao: { cor: rgb("#0a0a0a"), seg: 1.2 },
    flash: { chance: 0.006, cor: rgb("#d4af37") },
    titulo: "§6Era 18", subtitulo: "§8O Véu se Rompe",
    apresentacao: "Algo rachou entre o lado de cá e o lado de lá.",
    mecanicas: {
      efeitos: [{ efeito: "hunger", nivel: 0, quando: ["noite"], tipo: "debuff" }],
      xp: { mult: 1.2 },
      pulso: { cadaMin: 45, duracaoSeg: 45, xp: 2, caudas: 2, nome: "Ruptura" },
    },
    limitacoes: ["As fendas são partículas pontuais: o terreno nunca racha de verdade."],
  },
  {
    id: "era_19", numero: 19, nome: "Tudo o que Restou",
    conceito: "Fragmentos das memórias anteriores.",
    emocional: "Despedida carinhosa.",
    descricao: "Azul noturno, âmbar e branco. Um pouco de cada Era (brasa, floco, brilho) em pequena quantidade, como lembranças que sobraram.",
    paleta: ["#1b2a4a", "#e8a440", "#ffffff"],
    fog: { cor: "#1a3062", agua: "#142040", inicio: 6, fim: 31 },
    particulas: [
      { id: "minecraft:colored_flame_particle", cor: rgb("#e8a440"), n: 1, raio: 7, alturaMin: 0.5, alturaMax: 3, chance: 0.8 },
      { id: "minecraft:snowflake_particle", n: 1, raio: 8, alturaMin: 2, alturaMax: 6, chance: 0.6 },
      { id: "minecraft:endrod", n: 1, raio: 7, alturaMin: 0.5, alturaMax: 3.5, chance: 0.6 },
    ],
    sons: [{ id: "vulpus.p_flauta_distante_1", volume: 0.35, pitch: 1 }, { id: "vulpus.p_sino_suave_1", volume: 0.4, pitch: 0.9 }, { id: "vulpus.p_sino_suave_4", volume: 0.4, pitch: 0.9 }],
    intervaloSom: [90, 240],
    transicao: { cor: rgb("#16223f"), seg: 1.4 },
    titulo: "§9Era 19", subtitulo: "§6Tudo o que Restou",
    apresentacao: "Ficaram só pedaços, mas pedaços bonitos.",
    mecanicas: {
      efeitos: [
        { efeito: "regeneration", nivel: 0, quando: DIA_CEU, tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["caverna"], tipo: "debuff" },
      ],
      xp: { mult: 1.1 },
      colheita: { chance: 0.08, premios: [["minecraft:lapis_lazuli", 1, 2], ["minecraft:raw_copper", 1, 2]], tetoDia: 10 },
      minerio: { chance: 0.08, caudas: 6, tetoDia: 15 },
    },
    limitacoes: ["É uma composição própria, não a soma de todas as Eras: cada elemento aparece em dose pequena."],
  },
  {
    id: "era_20", numero: 20, nome: "O Outro Lado do Sonho",
    conceito: "Conclusão, passagem e expectativa.",
    emocional: "Encerramento e esperança.",
    descricao: "Branco-dourado, prata e escuridão. Luzes sobem para um céu que não se vê e um coro suave fecha o ciclo.",
    paleta: ["#fbf3dc", "#c0c0c8", "#0a0a12"],
    fog: { cor: "#efe2be", agua: "#4a4a62", inicio: 4, fim: 26 },
    particulas: [
      { id: "minecraft:endrod", n: 2, raio: 7, alturaMin: 0.3, alturaMax: 5, chance: 0.9 },
      { id: "minecraft:colored_flame_particle", cor: rgb("#fbeec0"), n: 1, raio: 7, alturaMin: 0.3, alturaMax: 5, chance: 0.8 },
    ],
    sons: [{ id: "vulpus.p_sino_suave_3", volume: 0.45, pitch: 0.9 }, { id: "vulpus.p_sino_suave_4", volume: 0.45, pitch: 0.9 }, { id: "vulpus.p_flauta_distante_1", volume: 0.4, pitch: 1 }],
    intervaloSom: [60, 180],
    transicao: { cor: rgb("#fff6dc"), seg: 1.8 },
    titulo: "§eEra 20", subtitulo: "§fO Outro Lado do Sonho",
    apresentacao: "O ciclo se fecha. O que vem depois só quem sonha sabe.",
    mecanicas: {
      efeitos: [
        { efeito: "slow_falling", nivel: 0, quando: ["altura"], tipo: "buff" },
        { efeito: "hunger", nivel: 0, quando: ["noite"], tipo: "debuff" },
      ],
      xp: { mult: 1.25 },
      caudasMinuto: { mult: 1.25 },
      pulso: { cadaMin: 60, duracaoSeg: 120, xp: 2, nome: "Passagem" },
    },
    limitacoes: ["Fecha a temporada sem começar outra: uma nova só nasce por decisão do dono."],
  },
]);

/** Quantidade de Eras da temporada. */
export const TOTAL_ERAS = 20;

/** @param {number} numero 1 a 20 */
export const eraDe = (numero) => ERAS[numero - 1];

const EFEITOS_PERMITIDOS = new Set([
  "regeneration", "speed", "haste", "jump_boost", "slow_falling", "water_breathing", "dolphins_grace", "saturation",
  "slowness", "hunger", "mining_fatigue",
]);
const CONDICOES = new Set(["dia", "noite", "ceu", "teto", "caverna", "agua", "folhas", "altura", "sempre"]);
const HEX = /^#[0-9a-fA-F]{6}$/;
const SOM = /^vulpus\.[a-z0-9_]+$/;
/** Limites para o catálogo não ficar injogável nem injusto. */
export const LIMITES = Object.freeze({ multMax: 3, fogFimMin: 20, nivelMax: 1, chanceMax: 0.5, tetoDiaMax: 60, caudasMax: 50, vendaTetoMax: 10000, vendaDiaMax: 20000, porItemMax: 200 });

/**
 * Confere o catálogo inteiro: 20 perfis, números de 1 a 20 sem repetir, campos obrigatórios, cores, neblina jogável, sons, efeitos e
 * mecânicas dentro dos limites. Devolve a lista de problemas (vazia = tudo certo).
 * @param {readonly Perfil[]} [lista]
 * @returns {string[]}
 */
export function validarCatalogo(lista = ERAS) {
  /** @type {string[]} */
  const problemas = [];
  if (lista.length !== TOTAL_ERAS) problemas.push(`o catálogo tem ${lista.length} Eras (precisa de ${TOTAL_ERAS})`);
  const ids = new Set();
  const assinaturas = new Set();
  lista.forEach((e, i) => {
    const onde = `Era ${i + 1}`;
    if (e.numero !== i + 1) problemas.push(`${onde}: número ${e.numero} fora de ordem`);
    if (e.id !== `era_${String(i + 1).padStart(2, "0")}`) problemas.push(`${onde}: id "${e.id}" inesperado`);
    if (ids.has(e.id)) problemas.push(`${onde}: id repetido`);
    ids.add(e.id);
    for (const campo of /** @type {const} */ (["nome", "conceito", "emocional", "descricao", "titulo", "subtitulo", "apresentacao"])) {
      if (typeof e[campo] !== "string" || e[campo].trim() === "") problemas.push(`${onde}: falta ${campo}`);
    }
    if (!Array.isArray(e.paleta) || e.paleta.length < 2 || !e.paleta.every((c) => HEX.test(c))) problemas.push(`${onde}: paleta inválida`);
    if (!HEX.test(e.fog?.cor ?? "") || !HEX.test(e.fog?.agua ?? "")) problemas.push(`${onde}: cor da neblina inválida`);
    if (!(e.fog.inicio >= 0 && e.fog.fim > e.fog.inicio)) problemas.push(`${onde}: neblina com início/fim inválidos`);
    if (e.fog.fim < LIMITES.fogFimMin) problemas.push(`${onde}: neblina fecha demais (fim ${e.fog.fim} < ${LIMITES.fogFimMin}) e atrapalha o jogo`);
    for (const p of e.particulas) {
      if (!/^minecraft:[a-z_]+$/.test(p.id)) problemas.push(`${onde}: partícula "${p.id}" inválida`);
      if (!(p.n > 0 && p.n <= 4) || !(p.chance > 0 && p.chance <= 1) || !(p.raio > 0 && p.raio <= 24) || p.alturaMax < p.alturaMin) problemas.push(`${onde}: partícula ${p.id} com números fora do limite`);
    }
    for (const s of e.sons) {
      if (!SOM.test(s.id)) problemas.push(`${onde}: som "${s.id}" inválido`);
      if (!(s.volume > 0 && s.volume <= 1) || !(s.pitch >= 0.5 && s.pitch <= 2)) problemas.push(`${onde}: som ${s.id} com volume/tom inválido`);
    }
    if (e.fundo !== undefined && !(e.fundo >= 0 && e.fundo <= 0.8)) problemas.push(`${onde}: volume do fundo fora de 0 a 0,8`);
    if (e.sons.length > 0 && !(e.intervaloSom[0] >= 20 && e.intervaloSom[1] >= e.intervaloSom[0])) problemas.push(`${onde}: intervalo de som inválido`);
    if (!(e.transicao.seg >= 0 && e.transicao.seg <= 3)) problemas.push(`${onde}: transição inválida`);
    if (e.flash && !(e.flash.chance > 0 && e.flash.chance <= 0.02)) problemas.push(`${onde}: piscada de tela fora do limite (máx. 2% por segundo)`);
    const m = e.mecanicas;
    for (const f of m.efeitos) {
      if (!EFEITOS_PERMITIDOS.has(f.efeito)) problemas.push(`${onde}: efeito "${f.efeito}" não permitido`);
      if (!(f.nivel >= 0 && f.nivel <= LIMITES.nivelMax)) problemas.push(`${onde}: nível de ${f.efeito} acima do limite`);
      if (f.quando.length === 0 || !f.quando.every((c) => CONDICOES.has(c))) problemas.push(`${onde}: condição inválida em ${f.efeito}`);
      if (f.tipo !== "buff" && f.tipo !== "debuff") problemas.push(`${onde}: tipo de ${f.efeito} inválido`);
    }
    for (const [nome, mult] of /** @type {[string, Multiplicador | undefined][]} */ ([["xp", m.xp], ["caudasMinuto", m.caudasMinuto]])) {
      if (mult && !(mult.mult >= 1 && mult.mult <= LIMITES.multMax)) problemas.push(`${onde}: multiplicador de ${nome} fora de 1 a ${LIMITES.multMax}`);
      if (mult?.quando && !mult.quando.every((c) => CONDICOES.has(c))) problemas.push(`${onde}: condição inválida em ${nome}`);
    }
    if (m.venda && !(m.venda.mult >= 1 && m.venda.mult <= LIMITES.multMax && m.venda.teto > 0 && m.venda.teto <= LIMITES.vendaTetoMax && m.venda.tetoDia >= m.venda.teto && m.venda.tetoDia <= LIMITES.vendaDiaMax && m.venda.porItem > 0 && m.venda.porItem <= LIMITES.porItemMax)) problemas.push(`${onde}: bônus de venda fora dos limites`);
    if (m.colheita) {
      if (!(m.colheita.chance > 0 && m.colheita.chance <= LIMITES.chanceMax) || !(m.colheita.tetoDia > 0 && m.colheita.tetoDia <= LIMITES.tetoDiaMax)) problemas.push(`${onde}: colheita fora dos limites`);
      if (m.colheita.premios.length === 0 || !m.colheita.premios.every(([id, a, b]) => /^minecraft:[a-z_]+$/.test(id) && a >= 1 && b >= a && b <= 8)) problemas.push(`${onde}: prêmios da colheita inválidos`);
    }
    if (m.minerio && !(m.minerio.chance > 0 && m.minerio.chance <= LIMITES.chanceMax && m.minerio.caudas > 0 && m.minerio.caudas <= LIMITES.caudasMax && m.minerio.tetoDia > 0 && m.minerio.tetoDia <= LIMITES.tetoDiaMax)) problemas.push(`${onde}: minério fora dos limites`);
    if (m.abate && !(m.abate.caudas > 0 && m.abate.caudas <= LIMITES.caudasMax && m.abate.tetoDia > 0 && m.abate.tetoDia <= LIMITES.tetoDiaMax)) problemas.push(`${onde}: abate fora dos limites`);
    if (m.pulso) {
      const p = m.pulso;
      if (!(p.cadaMin >= 10 && p.duracaoSeg >= 10 && p.duracaoSeg <= p.cadaMin * 6) || !p.nome) problemas.push(`${onde}: pulso inválido`);
      if (!(p.xp === undefined || (p.xp >= 1 && p.xp <= LIMITES.multMax)) || !(p.caudas === undefined || (p.caudas >= 1 && p.caudas <= LIMITES.multMax))) problemas.push(`${onde}: multiplicador do pulso fora dos limites`);
    }
    const temBuff = m.efeitos.some((f) => f.tipo === "buff") || m.xp || m.caudasMinuto || m.venda || m.colheita || m.minerio || m.abate || m.pulso;
    if (!temBuff) problemas.push(`${onde}: sem nenhum benefício`);
    if (!Array.isArray(e.limitacoes) || e.limitacoes.length === 0) problemas.push(`${onde}: falta documentar as limitações`);
    // cada Era precisa ser realmente diferente: a combinação (cor da neblina, distância, partículas, sons, mecânicas) não se repete
    const assinatura = JSON.stringify([e.fog, e.particulas.map((p) => p.id), e.sons.map((s) => s.id), e.mecanicas]);
    if (assinaturas.has(assinatura)) problemas.push(`${onde}: perfil igual ao de outra Era`);
    assinaturas.add(assinatura);
  });
  return problemas;
}
