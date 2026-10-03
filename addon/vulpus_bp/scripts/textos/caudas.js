// @ts-check
// Textos das Caudas (moeda do jogo), da diária e do ranking.
import { formatarNumero, formatarTempo } from "../core/util.js";

export const TITULO = "Caudas";
export const TITULO_RANKING = "Ranking de Caudas";
export const TITULO_COMO_GANHAR = "Como ganhar Caudas";

export const BOTAO_DIARIA = "Recompensa diária";
export const BOTAO_DIARIA_PEGA = "Diária §7(já pegou)";
export const BOTAO_RANKING = "Ranking";
export const BOTAO_COMO_GANHAR = "Como ganhar";

/** @param {number} n */
export const CAUDAS = (n) => `§6${formatarNumero(n)} §f${Math.abs(n) === 1 ? "Cauda" : "Caudas"}`;

/**
 * Corpo do menu de Caudas.
 * @param {{ saldo: number, sequencia: number, disponivel: boolean, msAteLiberar: number, premio: number }} info
 */
export const CORPO = ({ saldo, sequencia, disponivel, msAteLiberar, premio }) =>
  [
    `§7Saldo: ${CAUDAS(saldo)}`,
    `§7Sequência: §f${sequencia} ${sequencia === 1 ? "dia" : "dias"}`,
    disponivel
      ? `§7Diária: §aliberada! §7Vale ${CAUDAS(premio)}`
      : `§7Próxima diária em §e${formatarTempo(msAteLiberar / 1000)}`,
    "",
    "§7Conto cada uma toda noite. Não espalha.",
  ].join("\n");

/**
 * @param {number} premio
 * @param {number} sequencia
 * @param {number} saldo
 */
export const DIARIA_OK = (premio, sequencia, saldo) =>
  `§a✔ +${formatarNumero(premio)} Caudas!§r ${sequencia > 1 ? `§6${sequencia} dias seguidos§r, que constância!` : "Primeiro dia da sequência."} Saldo: ${CAUDAS(saldo)}`;
/** @param {number} ms */
export const DIARIA_JA_PEGOU = (ms) => `Você já pegou a diária de hoje! Volta em §e${formatarTempo(ms / 1000)}§c.`;
export const DIARIA_PERDEU = "§7Sua sequência tinha esfriado, então recomecei do dia 1.";

/** Aviso na actionbar do ganho por tempo online (só para quem desligou a HUD). @param {number} n */
export const GANHO_TEMPO_BARRA = (n) => `§6★ +${formatarNumero(n)} Caudas §7por jogar`;

/**
 * Aviso no chat quando alguém muda o saldo de outra pessoa.
 * @param {number} valor
 * @param {string} motivo
 * @param {number} saldo
 */
export const SALDO_MUDOU = (valor, motivo, saldo) =>
  `${valor >= 0 ? `§a+${formatarNumero(valor)}` : `§c${formatarNumero(valor)}`} Caudas §7(${motivo})§r. Saldo: ${CAUDAS(saldo)}`;
export const MOTIVO_STAFF = "da staff";

/**
 * @param {number} valor
 * @param {string} nome
 * @param {number} saldo
 */
export const STAFF_DEU = (valor, nome, saldo) =>
  `${valor >= 0 ? `Dei §6${formatarNumero(valor)}` : `Tirei §6${formatarNumero(-valor)}`} Caudas ${valor >= 0 ? "para" : "de"} §e${nome}§r. Saldo agora: ${CAUDAS(saldo)}`;
/** @param {number} max */
export const STAFF_VALOR_INVALIDO = (max) => `O valor precisa ser diferente de 0 e ficar entre §e-${formatarNumero(max)}§c e §e${formatarNumero(max)}§c.`;

export const RANKING_VAZIO = "§7Ninguém juntou Caudas ainda. A vaga de primeiro lugar está aberta!";
export const RANKING_LEGENDA = "§a• §7online   §8• §7offline";
/**
 * @param {number} posicao
 * @param {string} nome
 * @param {number} caudas
 * @param {{ online: boolean, voce: boolean }} marcas
 */
export const RANKING_LINHA = (posicao, nome, caudas, { online, voce }) =>
  `${posicao <= 3 ? "§6" : "§e"}${posicao}. ${online ? "§a•" : "§8•"} ${voce ? "§a" : "§f"}${nome} §8» ${CAUDAS(caudas)}`;
/** @param {number} posicao */
export const RANKING_SUA_POSICAO = (posicao) => `§7Sua posição: §e${posicao}º`;
export const RANKING_FORA = "§7Você ainda não entrou no ranking. Bora juntar umas Caudas?";
export const NOME_DESCONHECIDO = "Raposa misteriosa";

/** @param {{ diariaBase: number, diariaBonusDia: number, diariaBonusMax: number, caudasPorIntervalo: number, intervaloCaudasMin: number }} cfg */
export const COMO_GANHAR = (cfg) =>
  [
    "§6★ Recompensa diária",
    `§fPegue uma vez por dia: §6${formatarNumero(cfg.diariaBase)}§f Caudas, mais §6${formatarNumero(cfg.diariaBonusDia)}§f por dia seguido (bônus de até ${cfg.diariaBonusMax} ${cfg.diariaBonusMax === 1 ? "dia" : "dias"}).`,
    "§7O dia vira à meia-noite de Brasília. Pulou um dia, a sequência recomeça.",
    "",
    "§6★ Tempo de jogo",
    `§fA cada §e${cfg.intervaloCaudasMin} min§f jogando de verdade, ganha §6${formatarNumero(cfg.caudasPorIntervalo)}§f Caudas.`,
    "§7Ficar feito estátua não conta: eu percebo quem está AFK.",
    "",
    "§7Por enquanto ainda não tem loja. Vai juntando que vem novidade!",
  ].join("\n");

export const DESC_CAUDAS = "Abre o menu de Caudas";
export const DESC_DIARIA = "Pega a recompensa diária de Caudas";
export const DESC_DARCAUDAS = "Dá ou tira Caudas de alguém (staff)";
