// @ts-check
// Painel da staff, por categorias: Cargos e Kitsune; Economia (Caudas, XP, Leilão); Feira e minigames (feira_staff.js);
// Clãs e guerras (com a Caçada); Mundo e locais (spawn, lobby, portal, canto comunitário); Configurações (todos os
// grupos, em ordem de categoria) e o item do menu. Cada categoria abre as próprias configurações por abrirConfig.
import { CHAVE_SPAWN, ICONES, VERSAO } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, lerMundo, salvarConfig, todosJogadores } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { Lista, perguntar } from "../core/forms.js";
import { online } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok } from "../core/util.js";
import * as geral from "../textos/geral.js";
import * as textosSpleef from "../textos/spleef.js";
import * as textosMusica from "../textos/musica.js";
import * as textos from "../textos/staff.js";
import { garantirItem } from "./boas_vindas.js";
import { menuCacadaStaff } from "./cacada.js";
import { DAR_MAXIMO, darCaudas } from "./caudas.js";
import { menuClasStaff } from "./clas.js";
import { menuDono } from "./dono.js";
import { menuCargos } from "./identidade.js";
import { menuLeilaoStaff } from "./leilao.js";
import { definirSpawn } from "./spawn.js";
import { editarConfig as editarConfigSpleef } from "./spleef_staff.js";
import { menuLobbyStaff } from "./lobby_staff.js";
import { menuPaineis } from "./lobby_paineis.js";
import { menuAventuraStaff } from "./aventura.js";
import { menuPetsStaff } from "./pets.js";
import { menuMgStaff } from "./mg_menu.js";
import { BOTAO_STAFF as BOTAO_MG_STAFF } from "../textos/mg.js";
import { BOTAO_STAFF as BOTAO_PETS_STAFF } from "../textos/pets.js";
import { BOTAO_STAFF as BOTAO_YUKI } from "../textos/aventura.js";
import { menuPontosSpawn } from "./spawn_pontos.js";
import { BOTAO_MENU as BOTAO_PONTOS_SPAWN } from "../textos/spawn_pontos.js";
import { BOTAO_PAINEIS } from "../textos/lobby_paineis.js";
import { menuComunidadeStaff } from "./comunidade_staff.js";
import { menuFeiraStaff } from "./feira_staff.js";
import { menuMusicaStaff } from "./musica_staff.js";
import { menuXrayStaff } from "./xray.js";
import { menuObras } from "./obras.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/db.js").Config} Config */
/** @typedef {keyof Config} ChaveConfig */

/**
 * Faixa aceita em cada configuração numérica (fora dela, o valor é puxado para o limite).
 * @type {Partial<Record<ChaveConfig, [number, number]>>}
 */
const FAIXAS = {
  esperaTeleporte: [0, 30],
  musicaVolume: [0, 100],
  musicaFadeSeg: [0, 20],
  musicaPontuaisVolume: [0, 100],
  recargaTeleporte: [0, 600],
  protecaoSpawnRaio: [0, 500],
  rtpMinimo: [0, 50000],
  rtpMaximo: [100, 100000],
  rtpAltura: [100, 318],
  limiteMundo: [500, 1000000],
  combateSegundos: [0, 120],
  tpaExpira: [10, 600],
  limiteCasas: [0, 20],
  caudasPorIntervalo: [0, 1000],
  intervaloCaudasMin: [1, 120],
  diariaBase: [0, 100000],
  diariaBonusDia: [0, 10000],
  diariaBonusMax: [0, 365],
  xpPorMinuto: [0, 100],
  xpDiaria: [0, 10000],
  taxaAnuncioPct: [0, 50],
  taxaVendaPct: [0, 50],
  precoMinimo: [1, 1000000],
  precoMaximo: [1, 1000000],
  anunciosPorJogador: [0, 50],
  duracaoAnuncioHoras: [1, 720],
  caixaLimite: [9, 200],
  custoCriarCla: [0, 1000000],
  claXpPorMinuto: [0, 100],
  claCaudasPorXp: [1, 100000],
  custoCasaCla: [0, 1000000],
  distanciaSpawnBase: [0, 100000],
  custoMoverBase: [0, 1000000],
  aumentoMoverBasePct: [0, 500],
  recargaMoverBaseHoras: [0, 720],
  zonaAmortecimento: [0, 64],
  custoGuerra: [0, 1000000],
  guerraNivelMinimo: [1, 8],
  guerraMembrosMinimos: [1, 30],
  guerraAvisoMin: [0, 1440],
  duracaoGuerraHoras: [1, 168],
  recargaGuerraDias: [0, 60],
  guerraAntiFarmMin: [0, 120],
  guerraBonusSequencia: [0, 10],
  guerraBonusLider: [0, 10],
  bandeiraDistanciaMax: [1, 1024],
  recargaBandeiraHoras: [0, 720],
  ctfCaptura: [0, 100],
  ctfDevolver: [0, 100],
  ctfMatarCarregador: [0, 100],
  cacadaMinimo: [1, 1000000],
  cacadaMaximo: [1, 1000000],
  cacadaTaxaPct: [0, 50],
  cacadaLimite: [1, 20],
  cacadaVidaMin: [0, 120],
  comItensPorCauda: [1, 1000],
  comDoacaoMaxDia: [0, 100000],
  comDoacaoEsperaSeg: [0, 3600],
  comMetaPremio: [0, 100000],
  comFogueiraSeg: [5, 600],
  comFogueiraXp: [0, 1000],
  comFogueiraMaxDia: [0, 100000],
  comRecadoEsperaMin: [0, 1440],
  comRecadoMax: [10, 120],
  comRecadoHoras: [1, 720],
  comSugestaoEsperaMin: [0, 1440],
  mesasVelhaSeg: [5, 600],
  textoAlcance: [0, 64],
  mesasXadrezMin: [1, 60],
  mesasContagemSeg: [0, 30],
  mesasAssentoAlturaCm: [-100, 150],
  moedaApostaMin: [1, 100000],
  moedaApostaMax: [1, 100000],
  moedaPagamentoPct: [100, 300],
  moedaEsperaSeg: [0, 3600],
  moedaGanhoMaxDia: [0, 1000000],
  moedaPerdaMaxDia: [0, 1000000],
  quiosqueFalaSeg: [5, 3600],
  pegadinhaHerobrineSeg: [5, 120],
  portalEsperaSeg: [0, 3600],
  masmCaudasDia: [0, 100000],
  masmDanoPct: [10, 300],
  masmRaioCredito: [6, 48],
  masmCreditoSeg: [5, 120],
  ambienteDensidade: [0, 12],
  novatoCaudas: [0, 1000],
  novatoBonus: [0, 5000],
  novatoDias: [1, 90],
  questCaudas: [0, 2000],
  questXp: [0, 2000],
  questBonus: [0, 5000],
  petCusto: [0, 100000],
  petEsperaSeg: [0, 600],
  petMaxDia: [0, 200],
  petPityRaro: [2, 200],
  petPityLendario: [5, 500],
  petBonusPct: [0, 300],
  petMaxAtivos: [1, 4],
  petKitsuneLote: [1, 10],
  mgMinJogadores: [1, 8],
  mgMaxJogadores: [2, 12],
  mgContagemSeg: [20, 300],
  mgCheioSeg: [5, 120],
  mgRefillSeg: [60, 900],
  mgBwCamasSeg: [300, 3600],
  mgPilaresSeg: [3, 30],
  mgPilaresLavaSeg: [5, 60],
  mgBridgeRespawnSeg: [1, 10],
  mgBordaInicioSeg: [30, 900],
  mgBordaDuracaoSeg: [20, 600],
  mgDanoBorda: [1, 20],
  mgLimiteSeg: [120, 1800],
  mgPremioVitoria: [0, 1000],
  mgPremioKill: [0, 200],
  mgPremioCama: [0, 100],
  mgMinPremio: [1, 8],
  mgCaudasDia: [0, 5000],
  mgRecargaPremioSeg: [0, 3600],
  mgEsperaSaidaSeg: [0, 600],
  abateMaxSimultaneos: [1, 20],
  abateEsperaSeg: [0, 60],
  xrayMinerios: [2, 50],
  xrayJanelaMin: [2, 60],
  xrayPct: [1, 100],
  florRaio: [1, 16],
  florEsperaSeg: [0, 3600],
  argTentativas: [1, 50],
  argEsperaMin: [0, 1440],
  argGlitchPct: [0, 60],
  vinculoSyncSeg: [10, 600],
  temaAnimadoNivel: [1, 100],
  torreCaudas: [0, 100000],
  torreXp: [0, 100000],
  torrePrimeiraCaudas: [0, 100000],
  torrePrimeiraXp: [0, 100000],
  torreRecordeCaudas: [0, 100000],
  torreEsperaMin: [0, 1440],
  torreMaxDia: [0, 100],
  torreRaioInicio: [1, 20],
  torreRaioChegada: [1, 20],
  torreRaioMax: [5, 200],
  torreTempoMinSeg: [0, 3600],
  copoApostaMin: [1, 100000],
  copoApostaMax: [1, 100000],
  copoPagamentoPct: [100, 300],
  copoTrocas: [3, 60],
  copoTicksTroca: [2, 20],
  copoEspacoCm: [30, 200],
  copoEsperaSeg: [0, 3600],
  copoGanhoMaxDia: [0, 1000000],
  copoPerdaMaxDia: [0, 1000000],
  roletaCusto: [1, 100000],
  roletaGiroSeg: [2, 30],
  roletaEsperaSeg: [0, 3600],
  roletaGanhoMaxDia: [0, 1000000],
  roletaPerdaMaxDia: [0, 1000000],
  roletaAjusteGraus: [-180, 180],
  corridaApostaMin: [1, 100000],
  corridaApostaMax: [1, 100000],
  corridaPagamentoPct: [100, 300],
  corridaApostasSeg: [5, 300],
  corridaDuracaoSeg: [5, 120],
  corridaEsperaSeg: [0, 3600],
  corridaGanhoMaxDia: [0, 1000000],
  corridaPerdaMaxDia: [0, 1000000],
  pescaCusto: [1, 100000],
  pescaIscas: [1, 50],
  pescaMinutos: [1, 30],
  pescaEsperaSeg: [0, 3600],
  pescaGanhoMaxDia: [0, 1000000],
  pescaPerdaMaxDia: [0, 1000000],
  pescaPremioAlbum: [0, 100000],
  pescaPeixes: [0, 20],
  forcaCusto: [1, 100000],
  forcaPremioTopo: [1, 50],
  forcaPremioAlto: [1, 50],
  forcaEsperaSeg: [0, 3600],
  forcaGanhoMaxDia: [0, 1000000],
  forcaPerdaMaxDia: [0, 1000000],
  tiroFlechas: [1, 100],
  tiroPertoBlocos: [1, 200],
  tiroMedioBlocos: [2, 400],
  tiroPontosPorCauda: [1, 1000],
  tiroPremioDia: [0, 100000],
  tiroRecargaSeg: [0, 86400],
  tiroBonusMovel: [1, 10],
  tiroAlvoVelocidade: [1, 20],
  cacadaRecargaHoras: [0, 168],
  cacadaDuracaoDias: [1, 30],
  cacadaAnuncio: [0, 1000000],
};
const LINK_MAXIMO = 100;
/** Convite do Discord: discord.gg/xxx ou discord.com/invite/xxx (com ou sem https://). */
const LINK_DISCORD = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[\w-]{2,40}\/?$/i;

/**
 * Grupos de configuração (um formulário cada; cada chave de PADROES está em um grupo só), em ordem de categoria.
 * `id` é como os painéis das categorias abrem o grupo (abrirConfig); `abrir` troca o formulário padrão; `oculto`
 * deixa o grupo fora da lista geral (é só um atalho para chaves que já estão em outro grupo).
 * @typedef {{ id: string, cat: string, titulo: string, icone: string, chaves: ChaveConfig[], abrir?: (p: Player) => Promise<any>, oculto?: boolean }} Grupo
 * @type {Grupo[]}
 */
const GRUPOS = [
  {
    id: "caudas",
    cat: textos.BOTAO_ECONOMIA,
    titulo: textos.GRUPO_CAUDAS,
    icone: ICONES.caudas,
    chaves: ["caudasPorIntervalo", "intervaloCaudasMin", "diariaBase", "diariaBonusDia", "diariaBonusMax", "xpPorMinuto", "xpDiaria", "temaAnimadoNivel"],
  },
  {
    id: "leilao",
    cat: textos.BOTAO_ECONOMIA,
    titulo: textos.GRUPO_LEILAO,
    icone: ICONES.leilao,
    chaves: ["leilaoLigado", "taxaAnuncioPct", "taxaVendaPct", "precoMinimo", "precoMaximo", "anunciosPorJogador", "duracaoAnuncioHoras", "caixaLimite"],
  },
  {
    id: "teleporte",
    cat: textos.BOTAO_MUNDO,
    titulo: textos.GRUPO_TELEPORTE,
    icone: ICONES.tpa,
    chaves: ["esperaTeleporte", "recargaTeleporte", "rtpMinimo", "rtpMaximo", "rtpAltura", "combateSegundos", "tpaExpira", "limiteCasas", "protecaoSpawnRaio"],
  },
  {
    id: "rtp",
    cat: textos.BOTAO_MUNDO,
    titulo: textos.GRUPO_RTP,
    icone: ICONES.mundo,
    chaves: ["rtpMinimo", "rtpMaximo", "rtpAltura", "limiteMundo"],
    oculto: true,
  },
  {
    id: "comunidade",
    cat: textos.BOTAO_MUNDO,
    titulo: textos.GRUPO_COMUNIDADE,
    icone: ICONES.cla,
    chaves: ["comLigado", "comItensPorCauda", "comDoacaoMaxDia", "comDoacaoEsperaSeg", "comMetaPremio", "comFogueiraSeg", "comFogueiraXp", "comFogueiraMaxDia", "comRecadoEsperaMin", "comRecadoMax", "comRecadoHoras", "comSugestaoEsperaMin"],
  },
  {
    id: "clas",
    cat: textos.BOTAO_CLAS_GUERRAS,
    titulo: textos.GRUPO_CLAS,
    icone: ICONES.cla,
    chaves: [
      "custoCriarCla",
      "claXpPorMinuto",
      "claCaudasPorXp",
      "custoCasaCla",
      "distanciaSpawnBase",
      "custoMoverBase",
      "aumentoMoverBasePct",
      "recargaMoverBaseHoras",
      "zonaAmortecimento",
      "custoGuerra",
      "guerraNivelMinimo",
      "guerraMembrosMinimos",
      "guerraAvisoMin",
      "duracaoGuerraHoras",
      "recargaGuerraDias",
      "guerraAntiFarmMin",
      "guerraBonusSequencia",
      "guerraBonusLider",
      "bandeiraDistanciaMax",
      "recargaBandeiraHoras",
      "ctfCaptura",
      "ctfDevolver",
      "ctfMatarCarregador",
    ],
  },
  {
    id: "cacada",
    cat: textos.BOTAO_CLAS_GUERRAS,
    titulo: textos.GRUPO_CACADA,
    icone: ICONES.cacada,
    chaves: ["cacadaLigada", "cacadaMinimo", "cacadaMaximo", "cacadaTaxaPct", "cacadaLimite", "cacadaVidaMin", "cacadaRecargaHoras", "cacadaDuracaoDias", "cacadaAnuncio"],
  },
  {
    id: "moeda",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_MOEDA,
    icone: ICONES.caudas,
    chaves: ["moedaLigada", "moedaApostaMin", "moedaApostaMax", "moedaPagamentoPct", "moedaEsperaSeg", "moedaGanhoMaxDia", "moedaPerdaMaxDia"],
  },
  {
    id: "roleta",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_ROLETA,
    icone: ICONES.caudas,
    chaves: ["roletaLigada", "roletaCusto", "roletaGiroSeg", "roletaEsperaSeg", "roletaGanhoMaxDia", "roletaPerdaMaxDia", "roletaInverter", "roletaAjusteGraus"],
  },
  {
    id: "copos",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_COPOS,
    icone: ICONES.caudas,
    chaves: ["copoLigado", "copoApostaMin", "copoApostaMax", "copoPagamentoPct", "copoTrocas", "copoTicksTroca", "copoEspacoCm", "copoEsperaSeg", "copoGanhoMaxDia", "copoPerdaMaxDia"],
  },
  {
    id: "corrida",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_CORRIDA,
    icone: ICONES.caudas,
    chaves: ["corridaLigada", "corridaApostaMin", "corridaApostaMax", "corridaPagamentoPct", "corridaApostasSeg", "corridaDuracaoSeg", "corridaEsperaSeg", "corridaGanhoMaxDia", "corridaPerdaMaxDia"],
  },
  {
    id: "pesca",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_PESCA,
    icone: ICONES.caudas,
    chaves: ["pescaLigada", "pescaCusto", "pescaIscas", "pescaMinutos", "pescaEsperaSeg", "pescaGanhoMaxDia", "pescaPerdaMaxDia", "pescaPremioAlbum", "pescaPeixes"],
  },
  {
    id: "forca",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_FORCA,
    icone: ICONES.caudas,
    chaves: ["forcaLigada", "forcaCusto", "forcaPremioTopo", "forcaPremioAlto", "forcaEsperaSeg", "forcaGanhoMaxDia", "forcaPerdaMaxDia"],
  },
  { id: "spleef", cat: textos.BOTAO_FEIRA, titulo: textosSpleef.BOTAO_SPLEEF, icone: ICONES.spleef, chaves: [], abrir: editarConfigSpleef },
  {
    id: "tiro",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_TIRO,
    icone: ICONES.cacada,
    chaves: ["tiroLigado", "tiroFlechas", "tiroPertoBlocos", "tiroMedioBlocos", "tiroPontosPorCauda", "tiroPremioDia", "tiroRecargaSeg", "tiroBonusMovel", "tiroAlvoVelocidade"],
  },
  {
    id: "torre",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_TORRE,
    icone: ICONES.minigames,
    chaves: ["torreLigada", "torreCaudas", "torreXp", "torrePrimeiraCaudas", "torrePrimeiraXp", "torreRecordeCaudas", "torreEsperaMin", "torreMaxDia", "torreRaioInicio", "torreRaioChegada", "torreRaioMax", "torreTempoMinSeg"],
  },
  {
    id: "mesas",
    cat: textos.BOTAO_FEIRA,
    titulo: textos.GRUPO_MESAS,
    icone: ICONES.minigames,
    chaves: ["mesasLigadas", "mesasDecoracao", "textoAlcance", "mesasVelhaSeg", "mesasXadrezMin", "mesasContagemSeg", "mesasAssentoAlturaCm"],
  },
  { id: "quiosque", cat: textos.BOTAO_FEIRA, titulo: textos.GRUPO_QUIOSQUE, icone: ICONES.ajustes, chaves: ["quiosqueLigado", "quiosqueFalaSeg"] },
  { id: "vinculo", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_VINCULO, icone: ICONES.ajustes, chaves: ["vinculoObrigatorio", "vinculoSyncSeg", "ponteChatLigada"] },
  { id: "arg", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_ARG, icone: ICONES.ajustes, chaves: ["argLigado", "argTentativas", "argEsperaMin", "argGlitchPct"] },
  { id: "minigames", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_MINIGAMES, icone: ICONES.ajustes, chaves: ["mgLigado", "mgMinJogadores", "mgMaxJogadores", "mgContagemSeg", "mgCheioSeg", "mgRefillSeg", "mgBwCamasSeg", "mgPilaresSeg", "mgPilaresLavaSeg", "mgBridgeRespawnSeg", "mgBordaInicioSeg", "mgBordaDuracaoSeg", "mgDanoBorda", "mgLimiteSeg", "mgPremioVitoria", "mgPremioKill", "mgPremioCama", "mgMinPremio", "mgCaudasDia", "mgRecargaPremioSeg", "mgEsperaSaidaSeg"] },
  { id: "pets", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_PETS, icone: ICONES.ajustes, chaves: ["petsLigados", "petCusto", "petEsperaSeg", "petMaxDia", "petPityRaro", "petPityLendario", "petBonusPct", "petMaxAtivos", "petKitsuneLote"] },
  { id: "aventura", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_AVENTURA, icone: ICONES.ajustes, chaves: ["questLigada", "questCaudas", "questXp", "questBonus"] },
  { id: "novato", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_NOVATO, icone: ICONES.ajustes, chaves: ["novatoLigado", "novatoCaudas", "novatoBonus", "novatoDias"] },
  { id: "painel_lobby", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_PAINEL_LOBBY, icone: ICONES.ajustes, chaves: ["paineisLigados", "textoAlcance", "ambienteLobby", "ambienteDensidade"] },
  { id: "portais", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_PORTAIS, icone: ICONES.ajustes, chaves: ["portalEsperaSeg", "masmLigada", "masmCaudasDia", "masmDanoPct", "masmRaioCredito", "masmCreditoSeg"] },
  { id: "abate", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_ABATE, icone: ICONES.ajustes, chaves: ["abateLigado", "abateMaxSimultaneos", "abateEsperaSeg"] },
  { id: "xray", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_XRAY, icone: ICONES.ajustes, chaves: [], abrir: (p) => menuXrayStaff(p, (j) => editarConfig(j, textos.GRUPO_XRAY, ["xrayLigado", "xrayMinerios", "xrayJanelaMin", "xrayPct"])) },
  { id: "pegadinhas", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_PEGADINHAS, icone: ICONES.ajustes, chaves: ["pegadinhasLigadas", "pegadinhaHerobrineSeg"] },
  { id: "musica", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_MUSICA, icone: ICONES.ajustes, chaves: ["musicaLigada", "musicaVolume", "musicaFadeSeg", "musicaPontuaisLigados", "musicaPontuaisVolume"] },
  { id: "flor", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_FLOR, icone: ICONES.ajustes, chaves: ["florLigada", "florRaio", "florEsperaSeg", "florFalas"] },
  { id: "inauguracao", cat: textos.BOTAO_FEIRA, titulo: textos.GRUPO_INAUGURACAO, icone: ICONES.ajustes, chaves: ["inauguracaoLigada"] },
  { id: "eras", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_ERAS, icone: ICONES.tempo, chaves: ["erasTinta"] },
  { id: "geral", cat: textos.BOTAO_CONFIG, titulo: textos.GRUPO_GERAL, icone: ICONES.mundo, chaves: ["linkDiscord", "hudPadrao", "limiteMundo"] },
];

/**
 * Abre o editor de configurações de um grupo (é o que os painéis de cada categoria chamam).
 * @param {Player} player
 * @param {string} id
 */
export async function abrirConfig(player, id) {
  const grupo = GRUPOS.find((g) => g.id === id);
  if (!grupo) return;
  if (grupo.abrir) await grupo.abrir(player);
  else await editarConfig(player, grupo.titulo, grupo.chaves);
}

/**
 * Botões "Configurações: X" de uma categoria (sem duplicar lógica: todos passam por abrirConfig).
 * @param {Lista} lista
 * @param {() => any} aqui  reabre o painel da categoria
 * @param {string[]} ids
 */
function botoesConfig(lista, aqui, ids) {
  lista.cabecalho(textos.SECAO_CONFIGS);
  for (const id of ids) {
    const grupo = GRUPOS.find((g) => g.id === id);
    if (!grupo) continue;
    lista.botao(textos.BOTAO_CONFIG_DE(grupo.titulo), ICONES.ajustes, async (p) => {
      await abrirConfig(p, id);
      await aqui();
    });
  }
}

/**
 * Categoria: Economia.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuEconomia(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuEconomia(player, voltar);
  const lista = new Lista(textos.TITULO_ECONOMIA)
    .texto(textos.CORPO_ECONOMIA)
    .botao(textos.BOTAO_DAR, ICONES.caudas, (p) => escolherQuemGanha(p, aqui))
    .botao(textos.BOTAO_LEILAO, ICONES.leilao, (p) => menuLeilaoStaff(p, aqui));
  botoesConfig(lista, aqui, ["caudas", "leilao"]);
  await lista.voltar(voltar).abrir(player);
}

/**
 * Categoria: Mundo e locais.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuMundo(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuMundo(player, voltar);
  const lista = new Lista(textos.TITULO_MUNDO)
    .texto(textos.CORPO_MUNDO)
    .botao(textos.BOTAO_SPAWN, ICONES.spawn, (p) => definirSpawn(p))
    .botao(BOTAO_PONTOS_SPAWN, ICONES.spawn, (p) => menuPontosSpawn(p, aqui))
    .botao(textos.BOTAO_LOBBY, ICONES.mundo, (p) => menuLobbyStaff(p, aqui, (j) => abrirConfig(j, "rtp")))
    .botao(BOTAO_PAINEIS, ICONES.mundo, (p) => menuPaineis(p, aqui, (j) => abrirConfig(j, "painel_lobby")))
    .botao(BOTAO_YUKI, ICONES.mundo, (p) => menuAventuraStaff(p, aqui, (j) => abrirConfig(j, "aventura")))
    .botao(BOTAO_PETS_STAFF, ICONES.mundo, (p) => menuPetsStaff(p, aqui, (j) => abrirConfig(j, "pets")))
    .botao(BOTAO_MG_STAFF, ICONES.mundo, (p) => menuMgStaff(p, aqui, (j) => abrirConfig(j, "minigames")))
    .botao(textosMusica.BOTAO_ZONAS, ICONES.ajustes, (p) => menuMusicaStaff(p, aqui, (j) => abrirConfig(j, "musica")))
    .botao(textos.BOTAO_COMUNIDADE, ICONES.cla, (p) => menuComunidadeStaff(p, aqui, (j) => abrirConfig(j, "comunidade")));
  botoesConfig(lista, aqui, ["teleporte", "rtp", "comunidade"]);
  await lista.voltar(voltar).abrir(player);
}

/**
 * Categoria: Clãs e guerras (com a Caçada).
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuClasGuerras(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuClasGuerras(player, voltar);
  const lista = new Lista(textos.TITULO_CLAS_GUERRAS)
    .texto(textos.CORPO_CLAS_GUERRAS)
    .botao(textos.BOTAO_CLAS, ICONES.cla, (p) => menuClasStaff(p, aqui))
    .botao(textos.BOTAO_CACADA, ICONES.cacada, (p) => menuCacadaStaff(p, aqui));
  botoesConfig(lista, aqui, ["clas", "cacada"]);
  await lista.voltar(voltar).abrir(player);
}

/**
 * Painel da staff (confere a permissão de novo ao abrir).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuStaff(player, voltar);
  const lista = new Lista(textos.TITULO)
    .texto(
      textos.CORPO({
        versao: VERSAO,
        online: online().length,
        registrados: todosJogadores().length,
        spawnDefinido: lerMundo(CHAVE_SPAWN) !== undefined,
      }),
    )
    .botao(textos.BOTAO_CARGOS, ICONES.cargos, (p) => menuCargos(p, aqui))
    .botao(textos.BOTAO_ECONOMIA, ICONES.caudas, (p) => menuEconomia(p, aqui))
    .botao(textos.BOTAO_FEIRA, ICONES.minigames, (p) => menuFeiraStaff(p, aqui, abrirConfig))
    .botao(textos.BOTAO_CLAS_GUERRAS, ICONES.cla, (p) => menuClasGuerras(p, aqui))
    .botao(textos.BOTAO_MUNDO, ICONES.mundo, (p) => menuMundo(p, aqui))
    .botao(textos.BOTAO_OBRAS, ICONES.mundo, (p) => menuObras(p, aqui))
    .botao(textos.BOTAO_CONFIG, ICONES.ajustes, (p) => menuConfig(p, aqui))
    .botao(textos.BOTAO_ITEM, ICONES.nova, (p) => {
      if (garantirItem(p) === "tinha") msg(p, textos.ITEM_JA_TEM);
    });
  // Painel de Dono: separado do da staff, o botão só aparece para quem é dono (staff comum não é).
  if (ehDono(player)) lista.botao(textos.BOTAO_DONO, ICONES.dono, (p) => menuDono(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Campo do formulário para uma configuração, conforme o tipo do padrão.
 * @param {ChaveConfig} chave
 * @param {Config} atual
 * @returns {import("../core/forms.js").Campo}
 */
function campoDe(chave, atual) {
  const rotulo = textos.CAMPOS[chave];
  const valor = atual[chave];
  if (typeof valor === "boolean") return { tipo: "alternar", rotulo, padrao: valor };
  if (typeof valor === "string") return { tipo: "texto", rotulo, dica: chave === "florFalas" ? textos.DICA_FALAS : textos.DICA_LINK, padrao: valor };
  const [min, max] = FAIXAS[chave] ?? [0, Number.MAX_SAFE_INTEGER];
  return { tipo: "numero", rotulo, padrao: valor, min, max, casas: chave === "florRaio" ? 1 : 0 };
}

/**
 * Link do Discord limpo; undefined se não for um convite válido ("" apaga o link).
 * @param {string} bruto
 */
function limparLink(bruto) {
  const link = bruto.replace(/§./g, "").trim();
  if (link === "") return "";
  return link.length <= LINK_MAXIMO && LINK_DISCORD.test(link) ? link : undefined;
}

/**
 * Escolha do grupo de configurações.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuConfig(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuConfig(player, voltar);
  const lista = new Lista(textos.TITULO_CONFIG).texto(textos.CONFIG_ESCOLHA);
  let cat = "";
  for (const grupo of GRUPOS.filter((g) => !g.oculto)) {
    if (grupo.cat !== cat) lista.cabecalho((cat = grupo.cat));
    lista.botao(grupo.titulo, grupo.icone, async (p) => {
      await abrirConfig(p, grupo.id);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Formulário com as configurações de um grupo; salva só o que mudou.
 * @param {Player} player
 * @param {string} titulo
 * @param {ChaveConfig[]} chaves
 */
async function editarConfig(player, titulo, chaves) {
  const atual = config();
  const valores = await perguntar(player, titulo, chaves.map((chave) => campoDe(chave, atual)));
  if (!valores || !ehStaff(player)) return;
  /** @type {Record<string, unknown>} */
  const mudancas = {};
  chaves.forEach((chave, i) => {
    let valor = valores[i];
    if (chave === "linkDiscord") {
      valor = limparLink(String(valor));
      if (valor === undefined) {
        erro(player, textos.LINK_INVALIDO);
        return;
      }
    }
    if (valor !== atual[chave]) mudancas[chave] = valor;
  });
  const minimo = mudancas.precoMinimo ?? atual.precoMinimo;
  const maximo = mudancas.precoMaximo ?? atual.precoMaximo;
  if (typeof minimo === "number" && typeof maximo === "number" && minimo > maximo) {
    erro(player, textos.PRECO_INVERTIDO);
    delete mudancas.precoMinimo;
    delete mudancas.precoMaximo;
  }
  const minCacada = mudancas.cacadaMinimo ?? atual.cacadaMinimo;
  const maxCacada = mudancas.cacadaMaximo ?? atual.cacadaMaximo;
  if (typeof minCacada === "number" && typeof maxCacada === "number" && minCacada > maxCacada) {
    erro(player, textos.CACADA_INVERTIDA);
    delete mudancas.cacadaMinimo;
    delete mudancas.cacadaMaximo;
  }
  const mudou = Object.keys(mudancas);
  if (!mudou.length) {
    msg(player, textos.CONFIG_IGUAL);
    return;
  }
  salvarConfig(/** @type {Partial<Config>} */ (mudancas));
  ok(player, textos.CONFIG_SALVA(mudou.map((chave) => textos.CAMPOS[/** @type {ChaveConfig} */ (chave)])));
}

/**
 * Lista de quem está online para dar (ou tirar) Caudas.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function escolherQuemGanha(player, voltar) {
  const pessoas = online().sort((a, b) => a.name.localeCompare(b.name));
  const lista = new Lista(textos.TITULO_DAR).texto(pessoas.length ? textos.DAR_ESCOLHA : textos.NINGUEM_ONLINE);
  for (const pessoa of pessoas) {
    lista.botao(pessoa.name, ICONES.jogador, async (p) => {
      if (!pessoa.isValid) {
        erro(p, geral.JOGADOR_OFFLINE);
        return voltar();
      }
      const resposta = await perguntar(p, textos.TITULO_VALOR(pessoa.name), [
        { tipo: "numero", rotulo: textos.ROTULO_VALOR, padrao: 0, min: -DAR_MAXIMO, max: DAR_MAXIMO },
      ]);
      if (resposta) darCaudas(p, pessoa, resposta[0]);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

registrarComando({ nome: "staff", descricao: textos.DESC_STAFF, staff: true }, (p) => menuStaff(p));
