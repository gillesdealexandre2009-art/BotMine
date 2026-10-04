// @ts-check
// Textos da Caçada (recompensa por cabeças).
import { formatarData, formatarNumero, formatarTempo } from "../core/util.js";
import { G, glyph } from "../glyphs.js";
import { CAUDAS } from "./caudas.js";

/**
 * Valor curto para o nameTag: 950, "1,2k", "15k", "1,5M".
 * @param {number} n
 */
export function curto(n) {
  const v = Math.max(0, Math.floor(n));
  if (v < 1000) return String(v);
  const [divisor, sufixo] = v < 1_000_000 ? [1000, "k"] : [1_000_000, "M"];
  const x = v / divisor;
  const texto = x < 10 ? (Math.floor(x * 10) / 10).toFixed(1).replace(".", ",").replace(",0", "") : String(Math.floor(x));
  return texto + sufixo;
}

/**
 * Prazo curto: "45min", "5h 10min" ou, de 1 dia para cima, "6d 23h".
 * @param {number} ms
 */
const prazo = (ms) => {
  const horas = Math.floor(Math.max(0, ms) / 3600000);
  return horas >= 24 ? `${Math.floor(horas / 24)}d ${horas % 24}h` : formatarTempo(Math.max(0, ms) / 1000);
};

export const CAVEIRA = glyph(G.CAVEIRA);

// Menu de Caudas (seção nova)
export const SECAO = "Caçada";
/** @param {number} n  cabeças com recompensa */
export const BOTAO_MURAL = (n) => (n ? `Mural de recompensas §8(${n})` : "Mural de recompensas");

// Mural
export const TITULO = "Caçada";
/**
 * @param {{ minha: number, ativas: number, limite: number, ligada: boolean }} info
 */
export const CORPO = ({ minha, ativas, limite, ligada }) =>
  [
    "§7Ponha Caudas na cabeça de alguém. Quem derrubar essa pessoa em PvP leva tudo.",
    "§7Mesmo clã e clã aliado não contam.",
    "",
    minha > 0 ? `${CAVEIRA} §cSua cabeça vale ${CAUDAS(minha)}` : "§7Ninguém pôs nada na sua cabeça. Por enquanto.",
    `§7Recompensas suas ativas: §f${ativas}/${limite}`,
    ...(ligada ? [] : ["", "§cA staff fechou a Caçada: dá para ver, mas não pôr recompensa nova."]),
  ].join("\n");
export const MURAL_VAZIO = "§7O mural está limpinho. Nenhuma cabeça a prêmio.";
export const CABECALHO_CABECAS = "Cabeças a prêmio";
export const BOTAO_COLOCAR = "Pôr recompensa";
export const BOTAO_CACADORES = "Ranking de caçadores";
export const BOTAO_HISTORICO = "Últimas caçadas";
export const BOTAO_COMO = "Como funciona";
/**
 * Botão de uma cabeça no mural.
 * @param {{ nome: string, total: number, online: boolean, voce: boolean, msExpira: number }} c
 */
export const BOTAO_CABECA = ({ nome, total, online, voce, msExpira }) =>
  `${online ? "§a•" : "§8•"} ${voce ? "§c" : "§f"}${nome} §8» §6${formatarNumero(total)}\n§7some em ${prazo(msExpira)}`;

// Ficha de uma cabeça
/** @param {string} nome */
export const TITULO_CABECA = (nome) => `Cabeça de ${nome}`;
/**
 * @param {{ nome: string, total: number, pagadores: number, criada: number, msExpira: number, minha: number, online: boolean, voce: boolean }} c
 */
export const CORPO_CABECA = ({ nome, total, pagadores, criada, msExpira, minha, online, voce }) =>
  [
    `${CAVEIRA} §f${nome} ${online ? "§a(online)" : "§8(offline)"}`,
    `§7Vale: ${CAUDAS(total)}`,
    `§7Quem pagou: §f${pagadores} ${pagadores === 1 ? "pessoa" : "pessoas"} §8(segredo meu)`,
    `§7A prêmio desde §f${formatarData(criada)}`,
    `§7A parte mais antiga volta para quem pagou em §e${prazo(msExpira)}`,
    ...(minha > 0 ? [`§7Sua parte: ${CAUDAS(minha)}`] : []),
    ...(voce ? ["", "§cÉ a sua cabeça! Fica de olho em quem chega perto."] : []),
  ].join("\n");
export const BOTAO_AUMENTAR = "Pôr mais Caudas";

// Pôr recompensa
export const TITULO_ESCOLHER = "Na cabeça de quem?";
export const ESCOLHER_CORPO = "§7Quem está online aparece aqui. Para alguém offline, procure pelo nome.";
export const NINGUEM_ONLINE = "§7Só você online agora. Procure alguém pelo nome.";
export const BOTAO_PROCURAR = "Procurar pelo nome";
export const TITULO_PROCURAR = "Procurar pessoa";
export const ROTULO_NOME = "Nome de quem já entrou na toca";
export const DICA_NOME = "Nome da conta";
export const NAO_ACHEI = "Não achei ninguém com esse nome por aqui.";
/** @param {string} nome */
export const TITULO_VALOR = (nome) => `Recompensa: ${nome}`;
/** @param {number} taxaPct */
export const ROTULO_VALOR = (taxaPct) => `Quantas Caudas na cabeça? (+${taxaPct}% de taxa)`;
export const TITULO_CONFIRMAR = "Confirmar recompensa";
/**
 * @param {{ nome: string, valor: number, taxa: number, custo: number, saldo: number, dias: number }} c
 */
export const CONFIRMAR = ({ nome, valor, taxa, custo, saldo, dias }) =>
  [
    `§7Na cabeça de §f${nome}§7: ${CAUDAS(valor)}`,
    `§7Taxa da toca: ${CAUDAS(taxa)} §8(não volta)`,
    `§7Sai do seu saldo agora: ${CAUDAS(custo)}`,
    `§7Seu saldo: ${CAUDAS(saldo)}`,
    "",
    `§7Se ninguém caçar em ${dias} ${dias === 1 ? "dia" : "dias"}, devolvo o valor (sem a taxa).`,
  ].join("\n");
export const BOTAO_PAGAR = "Pagar e pôr no mural";

// Erros e avisos de quem põe
export const FECHADA = "A Caçada está fechada pela staff agora.";
/** @param {number} min @param {number} max */
export const VALOR_INVALIDO = (min, max) => `A recompensa vai de §e${formatarNumero(min)}§c a §e${formatarNumero(max)}§c Caudas.`;
export const PROPRIA = "Na própria cabeça não dá, raposinha.";
export const SEM_REGISTRO = "Essa pessoa nunca entrou na toca.";
/** @param {number} limite */
export const LIMITE = (limite) => `Você já tem §e${limite}§c recompensas ativas. Espera alguma ser caçada ou voltar.`;
export const MURAL_CHEIO = "O mural está lotado. Tenta de novo mais tarde.";
export const PAGADORES_CHEIO = "Gente demais já pagou por essa cabeça. Escolhe outra.";
export const TETO = "Essa cabeça já está no valor máximo.";
/** @param {number} custo */
export const SEM_SALDO = (custo) => `Faltam Caudas: precisa de ${CAUDAS(custo)}§c (com a taxa).`;
export const MUDOU = "O preço mudou enquanto você decidia. Confere de novo e tenta outra vez.";
export const VELHO = "Esse formulário ficou para trás. Abre a Caçada de novo.";
/**
 * @param {string} nome
 * @param {number} valor
 * @param {number} total
 * @param {number} custo
 */
export const COLOCOU = (nome, valor, total, custo) =>
  `${CAVEIRA} §fPus ${CAUDAS(valor)} na cabeça de §e${nome}§f. Agora vale ${CAUDAS(total)}. §7(paguei ${formatarNumero(custo)} do seu saldo)`;
/** @param {number} total */
export const AVISO_VITIMA = (total) => `${CAVEIRA} §cAlguém pôs Caudas na sua cabeça! Agora ela vale ${CAUDAS(total)}§c. Cuidado por aí.`;
/** @param {string} nome @param {number} total */
export const ANUNCIO_SUBIU = (nome, total) => `${CAVEIRA} §fA cabeça de §e${nome}§f agora vale ${CAUDAS(total)}§f! Bora caçar?`;

// Coleta
/**
 * @param {string} matador
 * @param {string} vitima
 * @param {number} valor
 */
export const ANUNCIO_CACOU = (matador, vitima, valor) =>
  `${CAVEIRA} §e${matador}§f caçou a cabeça de §e${vitima}§f e levou ${CAUDAS(valor)}§f!`;
export const TITULO_CACOU = "§6Cabeça caçada!";
/** @param {number} valor */
export const SUB_CACOU = (valor) => `§f+${formatarNumero(valor)} Caudas`;
export const MOTIVO_CACOU = "caçada";
/** @param {string} vitima */
export const PAGADOR_CACOU = (vitima) => `§7A cabeça de §f${vitima}§7 que você pagou foi caçada.`;
// Por que não pagou (só para quem matou)
export const NAO_MESMO_CLA = "Recompensa não vale para quem é do mesmo clã.";
export const NAO_ALIADO = "Recompensa não vale entre clãs aliados.";
export const NAO_PAGADOR = "Você pagou por essa cabeça: não dá para cobrar a própria recompensa.";
/** @param {number} ms */
export const NAO_RECENTE = (ms) => `Essa raposa acabou de renascer. A recompensa volta a valer em §e${prazo(ms)}§c.`;
/** @param {number} ms */
export const NAO_RECARGA = (ms) => `Você já caçou essa cabeça há pouco. Pode de novo em §e${prazo(ms)}§c.`;

// Expiração e staff
export const MOTIVO_EXPIROU = "recompensa sem caçador";
export const MOTIVO_REMOVIDA = "recompensa tirada pela staff";

// Ranking e histórico
export const TITULO_CACADORES = "Caçadores";
export const CACADORES_VAZIO = "§7Ninguém caçou cabeça nenhuma ainda.";
/**
 * @param {number} posicao
 * @param {string} nome
 * @param {number} total
 * @param {number} n
 * @param {boolean} voce
 */
export const CACADOR_LINHA = (posicao, nome, total, n, voce) =>
  `${posicao <= 3 ? "§6" : "§e"}${posicao}. ${voce ? "§a" : "§f"}${nome} §8» ${CAUDAS(total)} §8(${n} ${n === 1 ? "cabeça" : "cabeças"})`;
export const TITULO_HISTORICO = "Últimas caçadas";
export const HISTORICO_VAZIO = "§7Ninguém caçou cabeça nenhuma ainda.";
/**
 * Uma caçada do histórico.
 * @param {{ t: number, a: string, v: string, n: number }} r
 */
export const HISTORICO_LINHA = (r) => `§8${formatarData(r.t)} §e${r.a}§7 caçou §f${r.v}§7: ${CAUDAS(r.n)}`;

/**
 * @param {{ cacadaMinimo: number, cacadaMaximo: number, cacadaTaxaPct: number, cacadaLimite: number, cacadaVidaMin: number, cacadaRecargaHoras: number, cacadaDuracaoDias: number, cacadaAnuncio: number }} cfg
 */
export const COMO = (cfg) =>
  [
    `${CAVEIRA} §6Pôr recompensa`,
    `§fDe §6${formatarNumero(cfg.cacadaMinimo)}§f a §6${formatarNumero(cfg.cacadaMaximo)}§f Caudas, que saem do seu saldo na hora, mais §e${cfg.cacadaTaxaPct}%§f de taxa (a taxa some).`,
    `§fVárias pessoas somam na mesma cabeça. Até §e${cfg.cacadaLimite}§f cabeças pagas por você ao mesmo tempo. Na sua, não.`,
    "",
    `${CAVEIRA} §6Caçar`,
    "§fQuem der o golpe final em PvP leva tudo (flecha conta para quem atirou).",
    "§7Não vale: mesmo clã, clã aliado, quem pagou por aquela cabeça, monstro, queda ou lava.",
    `§7A vítima precisa estar viva há §f${cfg.cacadaVidaMin} min§7, e cada pessoa caça a mesma cabeça 1 vez a cada §f${cfg.cacadaRecargaHoras} h§7.`,
    "",
    `${CAVEIRA} §6Prazo`,
    `§fCada parte vale por §e${cfg.cacadaDuracaoDias} ${cfg.cacadaDuracaoDias === 1 ? "dia" : "dias"}§f. Sem caçador, volta para quem pagou (sem a taxa), até offline.`,
    cfg.cacadaAnuncio > 0 ? `§7Cabeça que passa de ${formatarNumero(cfg.cacadaAnuncio)} eu anuncio para a toca toda.` : "",
  ]
    .filter((linha) => linha !== "")
    .join("\n");

// Staff
export const BOTAO_STAFF = "Caçada (staff)";
export const TITULO_STAFF = "Caçada (staff)";
/** @param {number} n */
export const STAFF_CORPO = (n) => `§7Cabeças a prêmio: §f${n}§7. Tirar uma devolve o valor a quem pagou (sem a taxa).`;
export const BOTAO_LOG = "Log da Caçada";
/**
 * @param {string} nome
 * @param {number} total
 * @param {{ nome: string, v: number }[]} pagadores
 */
export const STAFF_CABECA = (nome, total, pagadores) =>
  [`${CAVEIRA} §f${nome} §8» ${CAUDAS(total)}`, "", "§7Quem pagou:", ...pagadores.map((p) => `§8• §f${p.nome} §8» §6${formatarNumero(p.v)}`)].join("\n");
export const BOTAO_REMOVER = "Tirar e devolver";
/** @param {string} nome */
export const CONFIRMAR_REMOVER = (nome) => `§7Tirar a recompensa de §f${nome}§7 e devolver tudo a quem pagou (sem a taxa)?`;
export const JA_NAO_EXISTE = "Essa cabeça já saiu do mural.";
/** @param {string} nome @param {number} total @param {number} n */
export const REMOVEU = (nome, total, n) =>
  `Tirei a cabeça de §e${nome}§r do mural e devolvi ${CAUDAS(total)}§r a ${n} ${n === 1 ? "pessoa" : "pessoas"}.`;
export const TITULO_LOG = "Log da Caçada";
export const LOG_VAZIO = "§7Nada no log ainda.";
/**
 * @param {{ t: number, k: string, a: string, v: string, n: number }} r
 */
export const LOG_LINHA = (r) => {
  const quando = `§8${formatarData(r.t)}`;
  const acoes = { colocou: "pôs", coletou: "caçou", expirou: "expirou", removeu: "tirou" };
  const acao = acoes[/** @type {keyof typeof acoes} */ (r.k)] ?? r.k;
  return r.k === "expirou"
    ? `${quando} §7${r.v}: ${formatarNumero(r.n)} devolvidas (${r.a})`
    : `${quando} §f${r.a} §7${acao} §f${r.v} §8» §6${formatarNumero(r.n)}`;
};

export const DESC_CACADA = "Abre o mural da Caçada (recompensas por cabeças)";
export const DESC_RECOMPENSA = "Põe Caudas na cabeça de alguém";
export const DESC_TIRAR = "Tira uma recompensa e devolve a quem pagou (staff)";
