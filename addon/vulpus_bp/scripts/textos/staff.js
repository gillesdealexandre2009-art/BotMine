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
export const BOTAO_ITEM = "Pegar item do menu";

export const TITULO_CONFIG = "Configurações do Vulpus";
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
  hudPadrao: "HUD ligada para quem não escolheu",
};
export const DICA_LINK = "discord.gg/convite";
/** @param {string[]} mudou */
export const CONFIG_SALVA = (mudou) => `Configurações salvas! Mudou: §e${mudou.join("§r, §e")}§r.`;
export const CONFIG_IGUAL = "Nada mudou, tudo como estava.";
export const LINK_INVALIDO = "Esse link não parece um convite do Discord (ex.: discord.gg/vulpus). Mantive o anterior.";

export const TITULO_DAR = "Dar Caudas";
export const DAR_ESCOLHA = "§7Para quem? (valor negativo tira Caudas)";
/** @param {string} nome */
export const TITULO_VALOR = (nome) => `Caudas para ${nome}`;
export const ROTULO_VALOR = "Quantas Caudas? Negativo tira";
export const NINGUEM_ONLINE = "§7Ninguém online agora.";

export const ITEM_JA_TEM = "Você já tem o item do menu no inventário.";
export const DESC_STAFF = "Abre o painel da staff";
