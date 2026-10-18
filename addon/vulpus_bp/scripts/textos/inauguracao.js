// @ts-check
// Textos do Evento de inauguração: achar as raposinhas escondidas pelo mapa.

export const TOTAL = 20;
export const POR_PARTE = 5;
export const PARTES = 4;

export const FECHADO = "§7O Evento de inauguração já acabou.";
/** @param {number} n @param {number} total */
export const ACHOU = (n, total) => `§aVocê achou uma raposinha escondida! §e${n}/${total}`;
/** @param {number} n @param {number} total */
export const BARRA_ACHOU = (n, total) => `§6Raposinhas achadas: §f${n}§7/${total}`;
/** @param {number} n @param {number} total */
export const JA_ACHOU = (n, total) => `§7Essa você já achou. Faltam §e${total - n}§7!`;
export const TITULO_FIM = "§b§lCHEGOU CEDO HEIN!";
export const SUB_FIM = "§7Você achou todas as raposinhas";
export const MSG_FIM = "§aVocê completou o Evento de inauguração! Ganhou a cor de nome §fdo branco ao azul§a e a conquista §b[Chegou cedo hein!]§a. Escolha a cor em /apelido.";
/** @param {string} nome */
export const ANUNCIO_FIM = (nome) => `§6${nome} §eachou todas as raposinhas do Evento de inauguração!`;

// painel da staff
export const TITULO_STAFF = "Evento de inauguração (staff)";
export const BOTAO_STAFF = "Evento de inauguração";
export const BOTAO_MARCAR = "Esconder uma raposinha onde estou";
export const BOTAO_LISTA = "Ver, ir até e remover as escondidas";
export const BOTAO_CONFIG = "Configurações do evento";
export const BOTAO_REMOVER_TODAS = "Remover todas as raposinhas";
export const BOTAO_ZERAR = "Zerar o progresso de todo mundo";
export const CONFIRMAR_REMOVER = "Remover todas as raposinhas escondidas? (quem já completou continua com o prêmio)";
export const CONFIRMAR_ZERAR = "Zerar quantas raposinhas cada pessoa achou? (o prêmio já entregue fica)";
/** @param {number} parte @param {number} usadas */
export const BOTAO_PARTE = (parte, usadas) => `Parte ${parte} do mapa (${usadas}/${POR_PARTE} escondidas)`;
export const TITULO_PARTES = "Em que parte do mapa?";
export const PARTE_CHEIA = "Essa parte já tem as 5 raposinhas. Remova uma antes, ou escolha outra parte.";
/** @param {number} slot @param {string} onde */
export const MARCADA = (slot, onde) => `§aRaposinha §e#${slot + 1}§a escondida em §e${onde}§a. Quem clicar nela conta como achada.`;
/** @param {number} slot */
export const REMOVIDA = (slot) => `§aRaposinha #${slot + 1} removida.`;
export const REMOVIDAS_TODAS = "§aTodas as raposinhas foram removidas.";
export const ZERADO = "§aProgresso do evento zerado.";
export const SEM_ITENS = "§7Nenhuma raposinha escondida ainda.";
export const TITULO_LISTA = "Raposinhas escondidas";
/** @param {number} slot @param {string} onde */
export const BOTAO_ITEM = (slot, onde) => `#${slot + 1}  ${onde}`;
/** @param {number} slot */
export const TITULO_ITEM = (slot) => `Raposinha #${slot + 1}`;
export const BOTAO_IR = "Ir até ela";
export const BOTAO_REMOVER = "Remover esta";
/** @param {{ marcadas: number, completaram: number, achando: number }} e */
export const CORPO_STAFF = (e) =>
  [
    `§7Esconda ${TOTAL} raposinhas (${POR_PARTE} em cada uma das ${PARTES} partes do mapa). Cada pessoa clica em cada uma uma vez; achando todas ganha a cor de nome do branco ao azul e a conquista [Chegou cedo hein!].`,
    "",
    `§fEscondidas: §${e.marcadas === TOTAL ? "a" : "e"}${e.marcadas}/${TOTAL}${e.marcadas < TOTAL ? " §7(ninguém consegue completar até esconder todas)" : ""}`,
    `§fJá completaram: §7${e.completaram}`,
    `§fAinda procurando: §7${e.achando}`,
  ].join("\n");
