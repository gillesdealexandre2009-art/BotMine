// @ts-check
// Textos do painel da staff.

export const TITULO = "Staff";
/** @param {{ versao: string, online: number, registrados: number, spawnDefinido: boolean }} info */
export const CORPO = ({ versao, online, registrados, spawnDefinido }) =>
  [
    `§7Vulpus §f${versao}`,
    `§7Online agora: §f${online}`,
    `§7Raposas registradas: §f${registrados}`,
    `§7Spawn: ${spawnDefinido ? "§adefinido pela staff" : "§epadrão do mundo"}`,
  ].join("\n");

export const BOTAO_SPAWN = "Definir spawn aqui";
export const BOTAO_CONFIG = "Configurações";
export const BOTAO_DAR = "Dar Caudas";
export const BOTAO_CARGOS = "Cargos e Kitsune";
export const BOTAO_LEILAO = "Leilão (staff)";
export const BOTAO_ITEM = "Pegar item do menu";

export const TITULO_CONFIG = "Configurações do Vulpus";
export const CONFIG_ESCOLHA = "§7O que você quer ajustar?";
export const GRUPO_TELEPORTE = "Teleporte e casas";
export const GRUPO_CAUDAS = "Caudas e XP";
export const GRUPO_LEILAO = "Leilão";
export const GRUPO_GERAL = "Geral";
/** Rótulos dos campos de configuração (as chaves são as de PADROES). */
export const CAMPOS = {
  esperaTeleporte: "Espera sem se mexer antes do teleporte (s)",
  recargaTeleporte: "Recarga entre teleportes (s)",
  combateSegundos: "Tempo em combate depois de um golpe (s)",
  tpaExpira: "Pedido de TPA expira em (s)",
  limiteCasas: "Limite de casas por pessoa",
  caudasPorIntervalo: "Caudas por tempo jogado",
  intervaloCaudasMin: "Minutos ativos para ganhar essas Caudas",
  diariaBase: "Diária: valor base",
  diariaBonusDia: "Diária: bônus por dia seguido",
  diariaBonusMax: "Diária: máximo de dias com bônus",
  linkDiscord: "Link do Discord (vazio = sem link)",
  hudPadrao: "Scoreboard lateral ligada para quem não escolheu",
  xpPorMinuto: "XP por minuto ativo",
  xpDiaria: "XP da diária",
  leilaoLigado: "Leilão aberto",
  taxaAnuncioPct: "Leilão: taxa para anunciar (%)",
  taxaVendaPct: "Leilão: taxa da venda (%)",
  precoMinimo: "Leilão: preço mínimo",
  precoMaximo: "Leilão: preço máximo",
  anunciosPorJogador: "Leilão: anúncios por pessoa",
  duracaoAnuncioHoras: "Leilão: duração do anúncio (h)",
  caixaLimite: "Leilão: itens na caixa de retirada",
};
export const DICA_LINK = "discord.gg/convite";
/** @param {string[]} mudou */
export const CONFIG_SALVA = (mudou) => `Configurações salvas! Mudou: §e${mudou.join("§r, §e")}§r.`;
export const CONFIG_IGUAL = "Nada mudou, tudo como estava.";
export const PRECO_INVERTIDO = "O preço mínimo ficou maior que o máximo. Mantive os dois como estavam.";
export const LINK_INVALIDO = "Esse link não parece um convite do Discord (ex.: discord.gg/vulpus). Mantive o anterior.";

export const TITULO_DAR = "Dar Caudas";
export const DAR_ESCOLHA = "§7Para quem? (valor negativo tira Caudas)";
/** @param {string} nome */
export const TITULO_VALOR = (nome) => `Caudas para ${nome}`;
export const ROTULO_VALOR = "Quantas Caudas? Negativo tira";
export const NINGUEM_ONLINE = "§7Ninguém online agora.";

export const ITEM_JA_TEM = "Você já tem o item do menu no inventário.";
export const DESC_STAFF = "Abre o painel da staff";
