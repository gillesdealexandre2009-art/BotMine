// @ts-check
// Textos do Leilão (sistemas/leilao.js e leilao_armazem.js), na voz da Kiza.
// Glyphs só no corpo e nos botões, nunca em títulos (fonte MinecraftTen).
// Funções que citam um item recebem o nome dele pronto (texto ou translate) e devolvem
// as partes de um RawMessage, que leilao.js monta.
import { formatarNumero, formatarTempo } from "../core/util.js";
import { G, glyph } from "../glyphs.js";

/** @typedef {import("@minecraft/server").RawMessage} RawMessage */
/** @typedef {string | RawMessage} Parte */

/** Moeda com glyph: "(moeda) 1.250". @param {number} n */
export const CAUDAS = (n) => `${glyph(G.CAUDAS)} §6${formatarNumero(n)}`;

/** Preço por unidade: inteiro com milhar ou, abaixo de 100, até 1 casa ("2,5"). @param {number} n */
export const POR_UNIDADE = (n) => (n >= 100 ? formatarNumero(n) : String(Math.round(n * 10) / 10).replace(".", ","));

// Títulos (sem glyph)
export const TITULO = "Leilão";
export const TITULO_COMPRAR = "Comprar";
export const TITULO_BUSCA = "Buscar no leilão";
/** @param {string} termo */
export const TITULO_RESULTADO = (termo) => `Busca: ${termo}`;
export const TITULO_DETALHE = "Anúncio";
export const TITULO_VENDER = "Vender item da mão";
export const TITULO_CONFIRMAR_COMPRA = "Comprar?";
export const TITULO_CANCELAR = "Cancelar anúncio?";
export const TITULO_REMOVER = "Remover anúncio?";
export const TITULO_MEUS = "Meus anúncios";
export const TITULO_CAIXA = "Caixa de retirada";
export const TITULO_HISTORICO = "Histórico";
export const TITULO_STAFF = "Leilão (staff)";
export const TITULO_CONFERIR = "Para conferir";
export const TITULO_LOTE_CONFERIR = "Conferir lote";
export const TITULO_DEVOLVER = "Devolver à caixa?";
export const TITULO_APAGAR = "Apagar de vez?";
export const TITULO_APAGAR_2 = "Certeza mesmo?";
export const TITULO_LOG = "Log do leilão";

// Botões (rótulos fixos da spec)
export const BOTAO_COMPRAR = "Comprar";
export const BOTAO_VENDER = "Vender item da mão";
/** @param {number} ativos @param {number} limite */
export const BOTAO_MEUS = (ativos, limite) => `Meus anúncios (${ativos}/${limite})`;
/** @param {number} n */
export const BOTAO_CAIXA = (n) => `Caixa de retirada (${n})`;
export const BOTAO_HISTORICO = "Histórico";
export const BOTAO_STAFF = "Staff: anúncios";
export const BOTAO_BUSCAR = "Buscar";
export const BOTAO_PROXIMA = "Próxima página";
export const BOTAO_ANTERIOR = "Página anterior";
/** @param {"novos" | "preco"} ordem */
export const BOTAO_ORDEM = (ordem) => `Ordem: ${ordem === "novos" ? "mais novos" : "menor preço"}`;
/** @param {number} preco */
export const BOTAO_COMPRAR_POR = (preco) => `Comprar por ${CAUDAS(preco)}`;
export const BOTAO_CANCELAR = "Cancelar anúncio";
export const BOTAO_REMOVER = "Remover anúncio";
export const BOTAO_ANUNCIAR = "Anunciar";
/** @param {number} n */
export const BOTAO_RETIRAR_CAUDAS = (n) => `Retirar ${CAUDAS(n)}§r Caudas`;
export const BOTAO_RETIRAR_TUDO = "Retirar tudo";
/** @param {number} n */
export const BOTAO_STAFF_ATIVOS = (n) => `Anúncios ativos (${n})`;
/** @param {number} n */
export const BOTAO_CONFERIR = (n) => `Para conferir (${n})`;
export const BOTAO_LOG = "Log";
export const BOTAO_DEVOLVER = "Devolver à caixa do dono";
export const BOTAO_DEVOLVER_MINHA = "Mandar para a minha caixa";
export const BOTAO_APAGAR = "Apagar";
export const BOTAO_SIM_APAGAR = "Sim, apagar";

export const TUDO = "Tudo";
/** Nome de cada categoria, na ordem da tela Comprar. */
export const CATEGORIAS = Object.freeze({
  blocos: "Blocos",
  ferramentas: "Ferramentas",
  armas: "Armas",
  armaduras: "Armaduras",
  comida: "Comida",
  pocoes: "Poções",
  livros: "Livros encantados",
  shulkers: "Shulkers",
  outros: "Outros",
});
/** @param {string} nome @param {number} n */
export const COM_CONTAGEM = (nome, n) => `${nome} §8(${n})`;

// Corpos
/**
 * @param {{ saldo: number, ativos: number, limite: number, itens: number, caudas: number, aberto: boolean }} info
 */
export const CORPO = ({ saldo, ativos, limite, itens, caudas, aberto }) =>
  [
    `§7Saldo: ${CAUDAS(saldo)}`,
    `${glyph(G.VENDER)} §7Anúncios no ar: §f${ativos}/${limite}`,
    `${glyph(G.CAIXA)} §7Caixa: §f${itens} ${itens === 1 ? "item" : "itens"} §7e ${CAUDAS(caudas)}§7 Caudas`,
    "",
    aberto ? "§7Compre já, sem lance: viu, gostou, levou." : "§cO leilão está fechado agora. §7A caixa continua funcionando.",
  ].join("\n");

/** @param {number} n */
export const CORPO_COMPRAR = (n) =>
  n ? `${glyph(G.COMPRAR)} §7${n} ${n === 1 ? "anúncio" : "anúncios"} na vitrine. Escolhe por onde fuçar.` : "§7A vitrine está vazia. Que tal ser a primeira venda?";

/** @param {{ total: number, pagina: number, paginas: number }} info */
export const CORPO_VITRINE = ({ total, pagina, paginas }) =>
  total
    ? `§7${total} ${total === 1 ? "anúncio" : "anúncios"} §8• §7página §f${pagina}/${paginas}`
    : "§7Nada por aqui. Tenta outra categoria ou outra busca.";

export const CAMPO_BUSCA = "O que você procura?";
export const DICA_BUSCA = "ex.: espada, diamante, livro";

/** @param {number} ativos @param {number} limite */
export const CORPO_MEUS = (ativos, limite) =>
  ativos ? `${glyph(G.VENDER)} §7${ativos}/${limite} anúncios no ar. Toca num para ver ou cancelar.` : "§7Nada seu à venda agora. Bora anunciar?";

/** @param {number} itens @param {number} caudas @param {number} limite */
export const CORPO_CAIXA = (itens, caudas, limite) =>
  itens || caudas
    ? [
        `${glyph(G.CAIXA)} §7Itens: §f${itens}/${limite}`,
        `§7Caudas: ${CAUDAS(caudas)}`,
        "",
        "§7Toca num item para pegar. O que não couber fica guardadinho aqui.",
      ].join("\n")
    : "§7Caixa vazia. Tudo o que você comprar, vender ou cancelar passa por aqui.";

export const HISTORICO_VAZIO = "§7Nada no histórico ainda.";
export const LOG_VAZIO = "§7O log está vazio.";
export const CONFERIR_VAZIO = "§7Nada para conferir. Tudo em ordem!";

/** @param {{ ativos: number, caixa: number, conferir: number, total: number, limite: number, armazem: string, aberto: boolean }} info */
export const CORPO_STAFF = ({ ativos, caixa, conferir, total, limite, armazem, aberto }) =>
  [
    `§7Leilão: ${aberto ? "§aaberto" : "§cfechado"}`,
    `§7Armazém: ${ARMAZEM[armazem] ?? armazem}`,
    `§7Ativos: §f${ativos} §8• §7nas caixas: §f${caixa} §8• §7conferir: §f${conferir}`,
    `§7Lotes no mundo: §f${total}/${limite}`,
  ].join("\n");
/** @type {Record<string, string>} */
const ARMAZEM = { pronto: "§apronto", acordando: "§eacordando", recusado: "§cdesligado (veja o log)" };

// Detalhe de um lote (cada função é uma linha)
/** @param {Parte} nome @param {number} q @returns {Parte[]} */
export const DETALHE_NOME = (nome, q) => ["§f", nome, ` §7x${q}`];
/** @param {string} nome */
export const DETALHE_VENDEDOR = (nome) => `§7Vendedor: §f${nome}`;
/** @param {number} preco @param {number} q */
export const DETALHE_PRECO = (preco, q) =>
  `§7Preço: ${CAUDAS(preco)}${q > 1 ? ` §8(${POR_UNIDADE(preco / q)} cada)` : ""}`;
/** @param {number} mediana */
export const DETALHE_MEDIANA = (mediana) => `§7Costuma sair por §6~${POR_UNIDADE(mediana)}§7 cada.`;
/** @param {string[]} encantos */
export const DETALHE_ENCANTOS = (encantos) => `${glyph(G.ENCANTADO)} §d${encantos.join("§7, §d")}`;
/** @param {number} restante @param {number} maximo */
export const DETALHE_DURABILIDADE = (restante, maximo) => `§7Durabilidade: §f${restante}/${maximo}`;
export const DETALHE_LORE = "§7Descrição:";
/** @param {string} linha */
export const DETALHE_LORE_LINHA = (linha) => `§5§o${linha}`;
/** @param {string | undefined} autor @param {number} paginas */
export const DETALHE_LIVRO = (autor, paginas) =>
  `§7Livro${autor ? ` de §f${autor}§7` : ""} §8• §f${paginas} ${paginas === 1 ? "página" : "páginas"}`;
/** @param {string[]} itens @param {number} resto */
export const DETALHE_SHULKER = (itens, resto) => `§7Dentro: §f${itens.join("§7, §f")}${resto > 0 ? ` §7e mais §f${resto}` : ""}`;
/** @param {number} ms */
export const DETALHE_EXPIRA = (ms) => `${glyph(G.TEMPO)} §7Expira em §f${formatarTempo(ms / 1000)}`;
/** @param {string} motivo */
export const DETALHE_MOTIVO = (motivo) => `§7Motivo: §f${motivo}`;
/** @param {string} nome */
export const DETALHE_DONO = (nome) => `§7Dono: §f${nome}`;
export const DETALHE_SEU = "§a• É seu anúncio.";

/** Por que o lote está em "conferir" (campo obs). */
/** @type {Record<string, string>} */
export const OBS = {
  retirando: "§eO servidor caiu no meio de uma retirada. Confere com a pessoa se o item chegou antes de devolver.",
  entrega: "§eA entrega deu erro depois de mover o item. Confere o inventário da pessoa antes de devolver.",
  divergente: "§eO item guardado não bateu com o anúncio.",
  estrutura: "§cO item guardado sumiu do armazém. Só dá para apagar o registro.",
  resgate: "§eAchei um baú perdido no armazém (servidor caiu no meio). Dono desconhecido. Com mais de um item, só sai por /structure load.",
};

/** Motivo de um lote na caixa. */
/** @type {Record<string, string>} */
export const MOTIVOS = { comprado: "comprado", expirou: "expirou", cancelado: "cancelado", removido: "removido pela staff" };

// Botão de anúncio e de item da caixa
/** @param {Parte} nome @param {number} q @param {boolean} encantado @param {number} preco @returns {Parte[]} */
export const BOTAO_ANUNCIO = (nome, q, encantado, preco) => [
  "§f",
  nome,
  ` §7x${q}${encantado ? ` ${glyph(G.ENCANTADO)}` : ""}\n${CAUDAS(preco)}`,
];
/** @param {Parte} nome @param {number} q @param {string} motivo @returns {Parte[]} */
export const BOTAO_ITEM_CAIXA = (nome, q, motivo) => ["§f", nome, ` §7x${q}\n§8${motivo}`];
/** @param {Parte} nome @param {number} q @param {string} quem @returns {Parte[]} */
export const BOTAO_ITEM_CONFERIR = (nome, q, quem) => ["§f", nome, ` §7x${q}\n§8${quem}`];

// Vender
/** @param {number} min @param {number} max */
export const CAMPO_PRECO = (min, max) => `Preço (Caudas) §7de ${formatarNumero(min)} a ${formatarNumero(max)}`;
export const DICA_PRECO = "ex.: 1000";
/** @param {number} mediana */
export const CAMPO_PRECO_MEDIANA = (mediana) => `\n§7Costuma sair por ~${POR_UNIDADE(mediana)} cada.`;
/**
 * @param {{ nome: Parte, q: number, preco: number, taxa: number, pctVenda: number, horas: number }} info
 * @returns {Parte[]}
 */
export const CONFIRMA_VENDA = ({ nome, q, preco, taxa, pctVenda, horas }) => [
  "§7Anunciar §f",
  nome,
  ` §7x${q}§7 por ${CAUDAS(preco)}§7?\n\n`,
  `§7Taxa para anunciar: ${CAUDAS(taxa)}§7 (não volta).\n`,
  `§7Na venda, §f${pctVenda}%§7 fica com a toca: você recebe ${CAUDAS(preco - Math.floor((preco * pctVenda) / 100))}§7.\n`,
  `§7Fica no ar por §f${horas}h§7. Depois volta para a sua caixa.`,
];

// Comprar / cancelar / remover
/** @param {Parte} nome @param {number} q @param {number} preco @param {string} vendedor @returns {Parte[]} */
export const CONFIRMA_COMPRA = (nome, q, preco, vendedor) => [
  "§7Comprar §f",
  nome,
  ` §7x${q} de §f${vendedor}§7 por ${CAUDAS(preco)}§7?`,
];
/** @param {Parte} nome @param {number} q @returns {Parte[]} */
export const CONFIRMA_CANCELAR = (nome, q) => ["§7Tirar §f", nome, ` §7x${q} da vitrine? A taxa de anúncio não volta.`];
/** @param {Parte} nome @param {number} q @param {string} vendedor @returns {Parte[]} */
export const CONFIRMA_REMOVER = (nome, q, vendedor) => [
  "§7Remover §f",
  nome,
  ` §7x${q} de §f${vendedor}§7? Vai para a caixa da pessoa.`,
];
/** @param {Parte} nome @param {number} q @param {string} destino @param {string} obs @returns {Parte[]} */
export const CONFIRMA_DEVOLVER = (nome, q, destino, obs) => [
  "§7Mandar §f",
  nome,
  ` §7x${q} para a caixa de §f${destino}§7?\n\n${obs}`,
];
/** @param {Parte} nome @param {number} q @returns {Parte[]} */
export const CONFIRMA_APAGAR = (nome, q) => ["§cApagar §f", nome, ` §7x${q}§c para sempre? Não tem volta.`];
export const CONFIRMA_APAGAR_2 = "§cÚltima chance: o item some do mundo e fica registrado no log com o seu nome.";

// Mensagens (sucesso com ok(), erro com erro())
/** @param {number} taxa */
export const ANUNCIOU = (taxa) => (taxa > 0 ? `Anúncio no ar! Paguei §e${formatarNumero(taxa)}§r Caudas de taxa.` : "Anúncio no ar!");
/** @param {Parte} nome @param {number} q @param {number} preco @returns {Parte[]} */
export const COMPROU = (nome, q, preco) => ["Comprado! ", nome, ` §7x${q}§r por ${CAUDAS(preco)}§r. É seu!`];
/** @param {Parte} nome @param {number} q @param {string} comprador @param {number} liquido @returns {Parte[]} */
export const VENDIDO = (nome, q, comprador, liquido) => [
  `Vendido! §e${comprador}§r levou seu `,
  nome,
  ` §7x${q}§r. ${CAUDAS(liquido)}§r Caudas te esperam na caixa.`,
];
/** @param {Parte} nome @param {number} q @returns {Parte[]} */
export const EXPIROU = (nome, q) => ["Seu anúncio de ", nome, ` §7x${q}§r venceu. Ele está na sua caixa de retirada.`];
/** @param {Parte} nome @param {number} q @returns {Parte[]} */
export const REMOVIDO_AVISO = (nome, q) => ["A staff tirou seu ", nome, ` §7x${q}§r do leilão. Está na sua caixa de retirada.`];
export const CANCELOU = "Anúncio cancelado.";
export const REMOVEU = "Anúncio removido. Foi para a caixa da pessoa.";
/** @param {Parte} nome @param {number} q @returns {Parte[]} */
export const RETIROU = (nome, q) => ["Pronto, ", nome, ` §7x${q}§r está no seu inventário.`];
/** @param {number} n */
export const RETIROU_CAUDAS = (n) => `${CAUDAS(n)}§r Caudas foram para o seu saldo.`;
/** @param {number} itens @param {number} caudas */
export const RETIROU_TUDO = (itens, caudas) =>
  `Peguei §e${itens}§r ${itens === 1 ? "item" : "itens"}${caudas > 0 ? ` e ${CAUDAS(caudas)}§r Caudas` : ""} da caixa.`;
export const SOBROU_NA_CAIXA = "§7O que não coube ficou na caixa.";
export const NADA_PARA_RETIRAR = "Sua caixa está vazia.";
export const SALDO_NO_TETO = "Seu saldo já está no máximo. As Caudas ficam na caixa por enquanto.";
export const FICOU_NA_CAIXA = "Seu inventário está cheio, então deixei na caixa de retirada.";
export const CONFERIR_JOGADOR = "Algo não bateu nesse item. Separei para a staff conferir, nada se perdeu.";
export const DEVOLVEU = "Devolvido à caixa.";
export const APAGOU = "Apagado. Ficou no log.";

export const SAIU_DA_VITRINE = "Esse anúncio já saiu da vitrine.";
export const FECHADO = "O leilão está fechado agora. A caixa de retirada continua aberta.";
export const ARMAZEM_ACORDANDO = "O armazém do leilão está acordando, tenta já já.";
export const ARMAZEM_DESLIGADO = "O armazém do leilão está desligado. Chama a staff, tá?";
export const MAO_VAZIA = "Segura na mão o que você quer vender.";
export const MODO_PROIBIDO = "No Criativo ou no Espectador não dá para anunciar.";
export const ITEM_PROIBIDO = "Esse item não pode ir para o leilão.";
export const ITEM_TROCOU = "O item da mão mudou. Cancelei para você não vender a coisa errada.";
/** @param {number} limite */
export const LIMITE_ANUNCIOS = (limite) => `Você já tem §e${limite}§c anúncios no ar. Espera vender ou cancela um.`;
export const CAIXA_CHEIA = "Sua caixa está cheia. Retira alguma coisa antes, tá?";
export const LEILAO_LOTADO = "O leilão está lotado agora. Tenta mais tarde.";
/** @param {number} min @param {number} max */
export const PRECO_INVALIDO = (min, max) =>
  `Preço inválido. Use um número inteiro de §e${formatarNumero(min)}§c a §e${formatarNumero(max)}§c.`;
/** @param {number} taxa */
export const SEM_SALDO_TAXA = (taxa) => `Faltam Caudas para a taxa de anúncio (§e${formatarNumero(taxa)}§c).`;
/** @param {number} preco */
export const SEM_SALDO = (preco) => `Faltam Caudas: isso custa §e${formatarNumero(preco)}§c.`;
export const PROPRIO = "Comprar de si mesmo não vale!";
export const NAO_E_SEU = "Esse anúncio não é seu.";
export const NAO_GUARDOU = "Não consegui guardar o item. Ele continua com você e nada foi cobrado.";
export const SEM_ESTRUTURA = "O item desse lote não está no armazém. Só dá para apagar.";

/** @param {number} itens @param {number} caudas */
export const AVISO_ENTRADA = (itens, caudas) => {
  const partes = [];
  if (itens > 0) partes.push(`§e${itens}§r ${itens === 1 ? "item" : "itens"}`);
  if (caudas > 0) partes.push(`${CAUDAS(caudas)}§r Caudas`);
  return `Você tem ${partes.join(" e ")} na caixa de retirada. Use §e/vulpus:caixa§r.`;
};
/** @param {string} quem @param {string} id */
export const AVISO_STAFF_CONFERIR = (quem, id) => `§eLeilão: o lote §f${id}§e (de ${quem}) foi para "Para conferir".`;
export const AVISO_STAFF_RECUSADO = "§cLeilão: o ponto do armazém tem um bloco com inventário. Armazém desligado (veja o log).";
/** @param {string} id */
export const AVISO_STAFF_RESGATE = (id) => `§eLeilão: achei um baú perdido no armazém e guardei como §f${id}§e. Veja "Para conferir".`;

export const DESCONHECIDO = "?";

// Histórico e log
/** Uma linha de evento. @param {string} quando @param {string} texto @param {Parte} [nome] @param {number} [q] @returns {Parte[]} */
export const EVENTO = (quando, texto, nome, q) =>
  nome === undefined ? [`§8${quando} §7${texto}`] : [`§8${quando} §7${texto} §f`, nome, ` §7x${q ?? 1}`];
/**
 * Texto de um evento. eu = o evento é sobre quem lê (no log da staff, sempre false).
 * a = quem fez, b = a outra pessoa, p = preço ou Caudas.
 * @param {string} tipo
 * @param {{ eu: boolean, a: string, b: string, p: number }} info
 */
export function TEXTO_EVENTO(tipo, { eu, a, b, p }) {
  const quem = eu ? "Você" : `§f${a || DESCONHECIDO}§7`;
  switch (tipo) {
    case "anunciou":
      return `${quem} anunciou por §6${formatarNumero(p)}§7:`;
    case "vendeu":
      return eu ? `Você vendeu para §f${b}§7 por §6${formatarNumero(p)}§7:` : `§f${b}§7 comprou de §f${a}§7 por §6${formatarNumero(p)}§7:`;
    case "comprou":
      return `Você comprou de §f${a}§7 por §6${formatarNumero(p)}§7:`;
    case "cancelou":
      return `${quem} cancelou:`;
    case "expirou":
      return `Venceu o anúncio de ${eu ? "você" : quem}:`;
    case "removeu":
      return eu ? "A staff tirou do leilão:" : `§f${a}§7 removeu de §f${b}§7:`;
    case "retirou":
      return `${quem} retirou da caixa:`;
    case "caudas":
      return `${quem} retirou §6${formatarNumero(p)}§7 Caudas da caixa.`;
    case "conferir":
      return `Lote de §f${a || DESCONHECIDO}§7 separado para conferir:`;
    case "devolveu":
      return eu ? "A staff devolveu à sua caixa:" : `§f${a}§7 devolveu à caixa de §f${b}§7:`;
    case "apagou":
      return eu ? "A staff apagou um lote seu:" : `§f${a}§7 apagou (dono: §f${b || DESCONHECIDO}§7):`;
    default:
      return tipo;
  }
}

/** Nomes dos encantamentos (id sem "minecraft:"). O que não estiver aqui vira o id com espaços. */
/** @type {Record<string, string>} */
export const ENCANTAMENTOS = {
  protection: "Proteção",
  fire_protection: "Proteção contra fogo",
  feather_falling: "Peso-pena",
  blast_protection: "Proteção contra explosões",
  projectile_protection: "Proteção contra projéteis",
  thorns: "Espinhos",
  respiration: "Respiração",
  depth_strider: "Passos profundos",
  aqua_affinity: "Afinidade aquática",
  sharpness: "Afiação",
  smite: "Julgamento",
  bane_of_arthropods: "Ruína dos artrópodes",
  knockback: "Repulsão",
  fire_aspect: "Aspecto flamejante",
  looting: "Saque",
  efficiency: "Eficiência",
  silk_touch: "Toque suave",
  unbreaking: "Inquebrável",
  fortune: "Fortuna",
  power: "Força",
  punch: "Impacto",
  flame: "Chama",
  infinity: "Infinidade",
  luck_of_the_sea: "Sorte do mar",
  lure: "Isca",
  frost_walker: "Passos gelados",
  mending: "Remendo",
  binding: "Maldição do vínculo",
  vanishing: "Maldição do desaparecimento",
  impaling: "Empalamento",
  riptide: "Correnteza",
  loyalty: "Lealdade",
  channeling: "Condutividade",
  multishot: "Rajada",
  piercing: "Perfuração",
  quick_charge: "Recarga rápida",
  soul_speed: "Velocidade das almas",
  swift_sneak: "Agachamento rápido",
  wind_burst: "Explosão de vento",
  density: "Densidade",
  breach: "Brecha",
  lunge: "Investida",
};
const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
/** "Afiação V". @param {string} id sem "minecraft:" @param {number} nivel */
export const ENCANTO = (id, nivel) => `${ENCANTAMENTOS[id] ?? id.replace(/_/g, " ")} ${ROMANOS[nivel] ?? nivel}`;

/**
 * Apelidos PT → EN para a busca (chave já sem acento e minúscula). A palavra digitada também
 * vale como está (para achar nomes dados na bigorna).
 * @type {Record<string, string[]>}
 */
export const APELIDOS = {
  espada: ["sword"],
  picareta: ["pickaxe"],
  machado: ["axe"],
  pa: ["shovel"],
  enxada: ["hoe"],
  capacete: ["helmet"],
  peitoral: ["chestplate"],
  calca: ["leggings"],
  calcas: ["leggings"],
  bota: ["boots"],
  botas: ["boots"],
  arco: ["bow"],
  besta: ["crossbow"],
  flecha: ["arrow"],
  escudo: ["shield"],
  tridente: ["trident"],
  elitro: ["elytra"],
  diamante: ["diamond"],
  ferro: ["iron"],
  ouro: ["gold"],
  esmeralda: ["emerald"],
  carvao: ["coal"],
  cobre: ["copper"],
  netherita: ["netherite"],
  quartzo: ["quartz"],
  ametista: ["amethyst"],
  livro: ["book"],
  encantado: ["enchanted"],
  pocao: ["potion"],
  pocoes: ["potion"],
  maca: ["apple"],
  pao: ["bread"],
  carne: ["beef", "porkchop", "mutton", "chicken", "rabbit"],
  peixe: ["cod", "salmon", "fish"],
  cenoura: ["carrot"],
  batata: ["potato"],
  trigo: ["wheat"],
  semente: ["seeds"],
  sementes: ["seeds"],
  abobora: ["pumpkin"],
  melancia: ["melon"],
  cogumelo: ["mushroom"],
  bolo: ["cake"],
  biscoito: ["cookie"],
  mel: ["honey"],
  madeira: ["log", "planks", "wood"],
  tabua: ["planks"],
  tabuas: ["planks"],
  tronco: ["log"],
  pedra: ["stone"],
  pedregulho: ["cobblestone"],
  vidro: ["glass"],
  la: ["wool"],
  concreto: ["concrete"],
  terracota: ["terracotta"],
  tijolo: ["brick"],
  tijolos: ["brick"],
  areia: ["sand"],
  terra: ["dirt"],
  grama: ["grass"],
  obsidiana: ["obsidian"],
  gelo: ["ice"],
  neve: ["snow"],
  folha: ["leaves"],
  folhas: ["leaves"],
  muda: ["sapling"],
  flor: ["flower", "tulip", "poppy", "dandelion", "orchid", "allium", "daisy", "cornflower", "lily"],
  tinta: ["dye"],
  corante: ["dye"],
  couro: ["leather"],
  pena: ["feather"],
  linha: ["string"],
  osso: ["bone"],
  polvora: ["gunpowder"],
  perola: ["pearl"],
  bau: ["chest"],
  cama: ["bed"],
  porta: ["door"],
  escada: ["stairs", "ladder"],
  laje: ["slab"],
  cerca: ["fence"],
  tocha: ["torch"],
  lanterna: ["lantern"],
  vela: ["candle"],
  estante: ["bookshelf"],
  bigorna: ["anvil"],
  fornalha: ["furnace"],
  funil: ["hopper"],
  trilho: ["rail"],
  carrinho: ["minecart"],
  barco: ["boat"],
  tapete: ["carpet"],
  balde: ["bucket"],
  mapa: ["map"],
  bussola: ["compass"],
  relogio: ["clock"],
  sela: ["saddle"],
  ovo: ["egg"],
  cana: ["sugar cane"],
  bambu: ["bamboo"],
  cacto: ["cactus"],
  totem: ["totem"],
  disco: ["music disc"],
  lampada: ["lamp"],
  vara: ["fishing rod"],
  tesoura: ["shears"],
  isqueiro: ["flint and steel"],
  shulker: ["shulker"],
};

/** Data curta para o histórico: "02/10 14:30" (Brasília). @param {number} ms */
export const QUANDO = (ms) => {
  const d = new Date(ms - 3 * 60 * 60 * 1000);
  const dois = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return `${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)} ${dois(d.getUTCHours())}:${dois(d.getUTCMinutes())}`;
};

export const DESC_LEILAO = "Abre o leilão";
export const DESC_VENDER = "Anuncia no leilão o item da mão";
export const DESC_CAIXA = "Abre a caixa de retirada do leilão";
