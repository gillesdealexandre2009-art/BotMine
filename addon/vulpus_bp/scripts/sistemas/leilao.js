// @ts-check
// Leilão "compre já": anunciar o item da mão por Caudas, vitrine com categorias e busca, caixa de
// retirada, histórico e painel da staff. O item real fica no armazém (leilao_armazem.js); aqui fica
// só o índice. Toda operação relê o estado e roda inteira num callback síncrono (uma thread só).
import { BlockTypes, GameMode, ItemLockMode, system, world } from "@minecraft/server";
import { ICONES, ITEM_MENU, SONS } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { Lista, perguntar } from "../core/forms.js";
import { porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, limitar, ok, registrarErro, som } from "../core/util.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/leilao.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import {
  aoFicarPronto,
  aoResgatar,
  apagar,
  armazemPronto,
  avisarStaff,
  entregar,
  estadoArmazem,
  existe,
  guardar,
  nomeEstrutura,
} from "./leilao_armazem.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("@minecraft/server").ItemStack} ItemStack */
/** @typedef {import("@minecraft/server").RawMessage} RawMessage */
/** @typedef {import("../textos/leilao.js").Parte} Parte */
/** @typedef {"blocos"|"ferramentas"|"armas"|"armaduras"|"comida"|"pocoes"|"livros"|"shulkers"|"outros"} Categoria */
/**
 * t typeId · q amount · k localizationKey · n nameTag · e encantamentos [id sem "minecraft:", nível] · d [dano, máx]
 * l lore (até 3, 40 caracteres) · s shulker top 5 · sn total de itens no shulker · b livro (autor, páginas) · busca: texto normalizado
 * @typedef {{ t: string, q: number, k: string, n?: string, e?: [string, number][], d?: [number, number],
 *   l?: string[], s?: [string, number][], sn?: number, b?: { a?: string, p: number }, c: Categoria, busca: string }} ResumoItem
 */
/**
 * obs (só em "conferir"): por que o lote foi separado (veja textos.OBS).
 * @typedef {{ v: 1, id: string, rev: number, estado: "ativo" | "caixa" | "retirando" | "conferir",
 *   vendedor: string, nomeVendedor: string, preco: number, criado: number, expira: number,
 *   dono: string | null, motivo: null | "comprado" | "expirou" | "cancelado" | "removido",
 *   comprador?: string, obs?: string, item: ResumoItem }} Lote
 */
/**
 * @typedef {{ t: number, e: "anunciou"|"vendeu"|"cancelou"|"expirou"|"removeu"|"retirou"|"caudas"|"conferir"|"devolveu"|"apagou",
 *   l?: string, i?: string, q?: number, p?: number, a: string, an: string, b?: string, bn?: string }} Evento
 */
/** @typedef {{ categoria?: Categoria, busca?: string, ordem: "novos" | "preco", pagina: number }} Filtro */

/** Teto de lotes no mundo (ativos + caixa + conferir). */
const LIMITE_LOTES = 1000;
const POR_PAGINA = 8;
const MAX_EVENTOS = 150;
const MAX_TIPOS_PRECO = 200;
const MAX_PRECOS_TIPO = 10;
const MIN_VENDAS_MEDIANA = 3;
const EVENTOS_JOGADOR = 20;
const EVENTOS_LOG = 30;
const MAX_LINHAS_LORE = 3;
const MAX_LORE = 40;
const MAX_NOME_BOTAO = 24; // nome da bigorna nos botões de lista: cabe numa linha
const TOP_SHULKER = 5;
const TICKS_EXPIRAR = 1200;
const TICKS_AVISO_ENTRADA = 60;
const HORA_MS = 60 * 60 * 1000;
/** Folga abaixo do limite do db.js para listas que crescem (histórico e preços). */
const LIMITE_LISTA = 29000;

const CHAVE_SEQ = "vulpus:ah:seq";
const PREFIXO_LOTE = "vulpus:ah:l:";
const PREFIXO_CAIXA = "vulpus:ah:c:";
const CHAVE_PRECOS = "vulpus:ah:p";
const CHAVE_EVENTOS = "vulpus:ah:h";

const ESTADOS = ["ativo", "caixa", "retirando", "conferir"];
/** @type {Categoria[]} */
const CATEGORIAS = ["blocos", "ferramentas", "armas", "armaduras", "comida", "pocoes", "livros", "shulkers", "outros"];
/** @type {[string, Categoria][]} */
const TAGS_CATEGORIA = [
  ["minecraft:is_sword", "armas"],
  ["minecraft:is_pickaxe", "ferramentas"],
  ["minecraft:is_axe", "ferramentas"],
  ["minecraft:is_shovel", "ferramentas"],
  ["minecraft:is_hoe", "ferramentas"],
  ["minecraft:is_armor", "armaduras"],
  ["minecraft:is_food", "comida"],
];

/** @type {Map<string, Lote> | undefined} */
let cache;

// ───────────────────────────── índice ─────────────────────────────

/**
 * @param {any} valor
 * @returns {valor is Lote}
 */
const ehLote = (valor) =>
  !!valor &&
  valor.v === 1 &&
  typeof valor.id === "string" &&
  ESTADOS.includes(valor.estado) &&
  Number.isInteger(valor.rev) &&
  Number.isSafeInteger(valor.preco) &&
  typeof valor.vendedor === "string" &&
  !!valor.item &&
  typeof valor.item.t === "string" &&
  Number.isInteger(valor.item.q);

/** Todos os lotes, do cache (lido do mundo na primeira vez). @returns {Map<string, Lote>} */
function lotes() {
  if (!cache) {
    cache = new Map();
    for (const chave of world.getDynamicPropertyIds()) {
      if (!chave.startsWith(PREFIXO_LOTE)) continue;
      const lote = lerMundo(chave);
      if (ehLote(lote) && chave === PREFIXO_LOTE + lote.id) cache.set(lote.id, lote);
      else registrarErro("Leilão", new Error(`lote inválido em ${chave}; deixei como está`));
    }
  }
  return cache;
}

/**
 * Grava o lote no mundo e só então no cache. Lança se não gravar (o chamador desfaz).
 * @param {Lote} lote
 */
function gravarLote(lote) {
  if (!salvarMundo(PREFIXO_LOTE + lote.id, lote)) throw new Error(`não gravei o lote ${lote.id}`);
  lotes().set(lote.id, lote);
}

/** @param {string} id */
function apagarLote(id) {
  salvarMundo(PREFIXO_LOTE + id, undefined);
  lotes().delete(id);
}

/** @param {Player | string} alvo */
const idDe = (alvo) => (typeof alvo === "string" ? alvo : alvo.id);

/** Número do id em base36 (ids de resgate ficam por último). @param {string} id */
const numeroId = (id) => (/^[0-9a-z]+$/.test(id) ? parseInt(id, 36) : -1);

/** Ordem "mais novos primeiro" (o id desempata lotes criados no mesmo ms). @param {Lote} a @param {Lote} b */
const maisNovo = (a, b) => b.criado - a.criado || numeroId(b.id) - numeroId(a.id);

/** Anúncios ativos de alguém. @param {string} id */
const ativosDe = (id) => [...lotes().values()].filter((l) => l.estado === "ativo" && l.vendedor === id);

/** Lotes na caixa de alguém, os mais novos primeiro. @param {string} id */
const caixaDe = (id) =>
  [...lotes().values()].filter((l) => l.estado === "caixa" && l.dono === id).sort(maisNovo);

/** Caudas esperando na caixa. @param {string} id @returns {number} */
function caudasCaixa(id) {
  const valor = lerMundo(PREFIXO_CAIXA + id, 0);
  return typeof valor === "number" && Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
}

/** @param {string} id @param {number} valor */
function gravarCaudasCaixa(id, valor) {
  salvarMundo(PREFIXO_CAIXA + id, valor > 0 ? valor : undefined);
}

/**
 * Vale offline. @param {Player | string} alvo
 * @returns {{ itens: number, caudas: number }}
 */
export function resumoCaixa(alvo) {
  const id = idDe(alvo);
  return { itens: caixaDe(id).length, caudas: caudasCaixa(id) };
}

/** Ativos do jogador. @param {Player | string} alvo @returns {number} */
export function contarAnuncios(alvo) {
  return ativosDe(idDe(alvo)).length;
}

/** Próximo id livre (base36). Pula nomes de estrutura já usados, até 5 vezes. @returns {string | undefined} */
function reservarId() {
  const lido = lerMundo(CHAVE_SEQ, 0);
  let seq = typeof lido === "number" && Number.isSafeInteger(lido) && lido >= 0 ? lido : 0;
  for (let tentativa = 0; tentativa <= 5; tentativa++) {
    const id = seq.toString(36);
    seq++;
    if (!lotes().has(id) && !existe(nomeEstrutura(id))) {
      salvarMundo(CHAVE_SEQ, seq);
      return id;
    }
  }
  salvarMundo(CHAVE_SEQ, seq);
  return undefined;
}

/**
 * Grava uma lista no mundo, tirando os mais antigos (do fim) até caber.
 * @param {string} chave @param {any[]} lista
 */
function gravarLista(chave, lista) {
  while (lista.length > 1 && JSON.stringify(lista).length > LIMITE_LISTA) lista.pop();
  salvarMundo(chave, lista);
}

/** Últimos eventos do mundo, o mais novo primeiro. @returns {Evento[]} */
function eventos() {
  const lido = lerMundo(CHAVE_EVENTOS, []);
  return Array.isArray(lido) ? lido.filter((ev) => ev && typeof ev.e === "string" && typeof ev.t === "number") : [];
}

/** @param {Omit<Evento, "t">[]} novos */
function registrarEventos(novos) {
  if (!novos.length) return;
  const agora = Date.now();
  gravarLista(CHAVE_EVENTOS, [...novos.map((ev) => ({ t: agora, ...ev })).reverse(), ...eventos()].slice(0, MAX_EVENTOS));
}

/**
 * Evento sobre um lote (item, quantidade e preço já preenchidos).
 * @param {Evento["e"]} tipo @param {Lote} lote @param {{ id: string, nome: string }} autor
 * @param {{ id: string, nome: string }} [outro]
 * @returns {Omit<Evento, "t">}
 */
function eventoDe(tipo, lote, autor, outro) {
  return {
    e: tipo,
    l: lote.id,
    i: lote.item.k,
    q: lote.item.q,
    p: lote.preco,
    a: autor.id,
    an: autor.nome,
    ...(outro ? { b: outro.id, bn: outro.nome } : {}),
  };
}

/** @param {Player} player */
const quem = (player) => ({ id: player.id, nome: player.name });
/** @param {Lote} lote */
const vendedorDe = (lote) => ({ id: lote.vendedor, nome: lote.nomeVendedor });

// ───────────────────────────── itens ─────────────────────────────

/** Sem acento, minúsculo e com espaços simples. @param {string} texto */
const normalizar = (texto) =>
  texto
    .replace(/§./g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** @param {string} id */
const semPrefixo = (id) => id.replace(/^minecraft:/, "");

/** Linha de texto segura: sem quebra e sem "§" solto no fim. @param {string} texto @param {number} max */
const cortar = (texto, max) => texto.replace(/\n/g, " ").slice(0, max).replace(/§$/, "");

/** @param {ItemStack} item @returns {Categoria} */
function categoria(item) {
  for (const [tag, cat] of TAGS_CATEGORIA) if (item.hasTag(tag)) return cat;
  const t = item.typeId;
  if (t.endsWith("shulker_box")) return "shulkers";
  if (t.endsWith("enchanted_book")) return "livros";
  if (t.endsWith("potion")) return "pocoes";
  if (BlockTypes.get(t)) return "blocos";
  return "outros";
}

/**
 * Resumo do item para a tela e a busca (o item real nunca sai do baú da estrutura).
 * @param {ItemStack} item
 * @returns {ResumoItem}
 */
function resumir(item) {
  /** @type {ResumoItem} */
  // Poções vêm com "%" na frente da chave ("%potion.heal.name"); o translate quer a chave pura.
  const r = { t: item.typeId, q: item.amount, k: item.localizationKey.replace(/^%/, ""), c: categoria(item), busca: "" };
  // Exato: a retirada confere o nome do item com este.
  if (item.nameTag) r.n = item.nameTag;
  const encantos = item.getComponent("enchantable")?.getEnchantments() ?? [];
  if (encantos.length) r.e = encantos.map((e) => [semPrefixo(e.type.id), e.level]);
  const durabilidade = item.getComponent("durability");
  if (durabilidade) r.d = [durabilidade.damage, durabilidade.maxDurability];
  const lore = item.getLore().slice(0, MAX_LINHAS_LORE).map((linha) => cortar(linha, MAX_LORE));
  if (lore.length) r.l = lore;
  const livro = item.getComponent("book");
  if (livro) r.b = livro.author ? { a: cortar(livro.author, 32), p: livro.pageCount } : { p: livro.pageCount };
  const dentro = conteudo(item);
  if (dentro.total > 0) {
    r.s = dentro.top;
    r.sn = dentro.total;
  }
  r.busca = normalizar(`${semPrefixo(r.t).replace(/_/g, " ")} ${r.n ?? ""}`);
  return r;
}

/**
 * Conteúdo de um item com inventário (shulker): top 5 por quantidade e o total de itens.
 * @param {ItemStack} item
 * @returns {{ top: [string, number][], total: number }}
 */
function conteudo(item) {
  const caixa = item.getComponent("inventory")?.container;
  if (!caixa) return { top: [], total: 0 };
  /** @type {Map<string, number>} */
  const contagem = new Map();
  let total = 0;
  for (let i = 0; i < caixa.size; i++) {
    const dentro = caixa.getItem(i);
    if (!dentro) continue;
    contagem.set(semPrefixo(dentro.typeId), (contagem.get(semPrefixo(dentro.typeId)) ?? 0) + dentro.amount);
    total += dentro.amount;
  }
  const top = /** @type {[string, number][]} */ ([...contagem].sort((a, b) => b[1] - a[1]).slice(0, TOP_SHULKER));
  return { top, total };
}

/**
 * Assinatura do item mostrado: se mudar entre o form e a confirmação, a venda é recusada.
 * @param {ResumoItem} r
 */
const assinatura = (r) => JSON.stringify([r.t, r.q, r.n ?? "", r.e ?? [], r.d?.[0] ?? -1, r.sn ?? 0, r.l ?? []]);

/** Item que pode ir para o leilão. @param {ItemStack} item */
const itemPermitido = (item) => item.typeId !== ITEM_MENU && item.lockMode === ItemLockMode.none;

/**
 * Nome do item numa mensagem: o nome dado na bigorna (itálico) ou o translate do jogo.
 * @param {ResumoItem} item @param {number} [max] @returns {RawMessage}
 */
function nomeItem(item, max = 64) {
  if (!item.n) return { translate: item.k };
  return { text: `§o${cortar(item.n, max)}${item.n.length > max ? "..." : ""}§r` };
}

/** @param {Parte[]} partes @returns {RawMessage} */
const raw = (partes) => ({ rawtext: partes.map((p) => (typeof p === "string" ? { text: p } : p)) });

/** Junta linhas (cada uma, texto ou partes) num RawMessage. @param {(Parte | Parte[])[]} lista @returns {RawMessage} */
function linhas(lista) {
  /** @type {Parte[]} */
  const partes = [];
  lista.forEach((linha, i) => {
    if (i > 0) partes.push("\n");
    partes.push(...(Array.isArray(linha) ? linha : [linha]));
  });
  return raw(partes);
}

/**
 * Mensagem da Kiza com nome de item traduzido.
 * @param {Player | undefined} player @param {Parte[]} partes @param {string} [somId]
 */
function avisar(player, partes, somId) {
  if (!player?.isValid) return;
  player.sendMessage(raw([geral.PREFIXO, ...partes]));
  if (somId) som(player, somId);
}

// ───────────────────────────── preços ─────────────────────────────

/** @returns {{ t: string, p: number[] }[]} */
function precos() {
  const lido = lerMundo(CHAVE_PRECOS, []);
  return Array.isArray(lido) ? lido.filter((x) => x && typeof x.t === "string" && Array.isArray(x.p)) : [];
}

/** Entra na média: sem encanto, sem nome, shulker vazio e não é poção (todas têm o mesmo typeId). @param {ResumoItem} item */
const entraNaMedia = (item) => !item.e?.length && !item.n && !(item.sn ?? 0) && item.c !== "pocoes";

/**
 * Mediana do preço por unidade nas últimas vendas do mesmo typeId (3 ou mais).
 * @param {ResumoItem} item @returns {number | undefined}
 */
function medianaUnidade(item) {
  if (!entraNaMedia(item)) return undefined;
  const valores = precos().find((x) => x.t === item.t)?.p ?? [];
  if (valores.length < MIN_VENDAS_MEDIANA) return undefined;
  const ordem = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordem.length / 2);
  return ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2;
}

/** @param {ResumoItem} item @param {number} preco */
function registrarPreco(item, preco) {
  if (!entraNaMedia(item)) return;
  const lista = precos();
  const antigo = lista.find((x) => x.t === item.t);
  const unidade = Math.round((preco / item.q) * 100) / 100;
  const novo = { t: item.t, p: [unidade, ...(antigo?.p ?? [])].slice(0, MAX_PRECOS_TIPO) };
  gravarLista(CHAVE_PRECOS, [novo, ...lista.filter((x) => x !== antigo)].slice(0, MAX_TIPOS_PRECO));
}

// ───────────────────────────── regras ─────────────────────────────

/**
 * Preço digitado ("1.000", "1 000"): inteiro de 1 a 7 dígitos dentro da faixa da staff.
 * @param {string} texto @returns {number | undefined}
 */
function lerPreco(texto) {
  const limpo = String(texto).replace(/[.\s]/g, "");
  if (!/^\d{1,7}$/.test(limpo)) return undefined;
  const preco = Number(limpo);
  const cfg = config();
  return Number.isSafeInteger(preco) && preco >= Math.max(1, cfg.precoMinimo) && preco <= cfg.precoMaximo ? preco : undefined;
}

/** Taxa de anúncio: pct% arredondado para cima, no mínimo 1 (0 se a taxa for 0%). @param {number} preco */
function taxaAnuncio(preco) {
  const pct = config().taxaAnuncioPct;
  return pct > 0 ? Math.max(1, Math.ceil((preco * pct) / 100)) : 0;
}

/** Taxa da venda em %, na faixa do painel da staff (o vendedor nunca recebe menos da metade). */
const pctVenda = () => limitar(config().taxaVendaPct, 0, 50);

/** Parte da venda que sai da economia. @param {number} preco */
const taxaVenda = (preco) => Math.floor((preco * pctVenda()) / 100);

/** @param {Player} player @param {number} slot @returns {ItemStack | undefined} */
function itemNoSlot(player, slot) {
  return player.getComponent("inventory")?.container?.getItem(slot);
}

/**
 * Por que o jogador não pode anunciar o item do slot agora (undefined = pode).
 * @param {Player} player @param {number} slot
 * @returns {string | undefined}
 */
function problemaParaVender(player, slot) {
  const cfg = config();
  if (!cfg.leilaoLigado) return textos.FECHADO;
  if (!armazemPronto()) return estadoArmazem() === "recusado" ? textos.ARMAZEM_DESLIGADO : textos.ARMAZEM_ACORDANDO;
  const modo = player.getGameMode();
  if (modo === GameMode.Creative || modo === GameMode.Spectator) return textos.MODO_PROIBIDO;
  const item = itemNoSlot(player, slot);
  if (!item) return textos.MAO_VAZIA;
  if (!itemPermitido(item)) return textos.ITEM_PROIBIDO;
  const ativos = contarAnuncios(player);
  if (ativos >= cfg.anunciosPorJogador) return textos.LIMITE_ANUNCIOS(cfg.anunciosPorJogador);
  if (caixaDe(player.id).length + ativos >= cfg.caixaLimite) return textos.CAIXA_CHEIA;
  if (lotes().size >= LIMITE_LOTES) return textos.LEILAO_LOTADO;
  return undefined;
}

/** O anúncio está à venda agora. @param {Lote} lote @param {number} [agora] */
const naVitrine = (lote, agora = Date.now()) => lote.estado === "ativo" && lote.expira > agora;

// ───────────────────────────── operações ─────────────────────────────

/**
 * Anuncia o item do slot. Relê tudo; nada é cobrado se o item não for guardado.
 * @param {Player} player
 * @param {{ slot: number, assinatura: string, preco: number }} pedido
 * @returns {boolean}
 */
function anunciar(player, pedido) {
  if (!player.isValid) return false;
  expirarVencidos();
  if (player.selectedSlotIndex !== pedido.slot) {
    erro(player, textos.ITEM_TROCOU);
    return false;
  }
  const problema = problemaParaVender(player, pedido.slot);
  if (problema) {
    erro(player, problema);
    return false;
  }
  const cfg = config();
  if (lerPreco(String(pedido.preco)) !== pedido.preco) {
    erro(player, textos.PRECO_INVALIDO(cfg.precoMinimo, cfg.precoMaximo));
    return false;
  }
  const taxa = taxaAnuncio(pedido.preco);
  if (saldo(player) < taxa) {
    erro(player, textos.SEM_SALDO_TAXA(taxa));
    return false;
  }
  const id = reservarId();
  if (!id) {
    erro(player, textos.NAO_GUARDOU);
    return false;
  }
  /** @type {ResumoItem | undefined} */
  let resumo;
  let recusado = false;
  const guardou = guardar(player, pedido.slot, nomeEstrutura(id), (item) => {
    const r = resumir(item);
    recusado = !itemPermitido(item) || assinatura(r) !== pedido.assinatura;
    if (!recusado) resumo = r;
    return !recusado;
  });
  if (!guardou || !resumo) {
    erro(player, recusado ? textos.ITEM_TROCOU : textos.NAO_GUARDOU);
    return false;
  }
  const agora = Date.now();
  /** @type {Lote} */
  const lote = {
    v: 1,
    id,
    rev: 0,
    estado: "ativo",
    vendedor: player.id,
    nomeVendedor: player.name,
    preco: pedido.preco,
    criado: agora,
    expira: agora + Math.max(1, cfg.duracaoAnuncioHoras) * HORA_MS,
    dono: null,
    motivo: null,
    item: resumo,
  };
  try {
    gravarLote(lote);
  } catch (e) {
    registrarErro(`Leilão: gravar o anúncio ${id}`, e);
    const volta = entregar(player, nomeEstrutura(id), { t: resumo.t, q: resumo.q, n: resumo.n });
    if (volta !== "ok") registrarErro("Leilão", new Error(`o item de ${nomeEstrutura(id)} não voltou para ${player.name} (${volta})`));
    erro(player, textos.NAO_GUARDOU);
    return false;
  }
  if (taxa > 0) adicionarCaudas(player, -taxa);
  registrarEventos([eventoDe("anunciou", lote, quem(player))]);
  ok(player, textos.ANUNCIOU(taxa));
  return true;
}

/**
 * Compra: só segue se o lote ainda é o mesmo que foi mostrado (estado, rev e preço).
 * @param {Player} player @param {string} id @param {number} rev @param {number} preco
 * @returns {boolean}
 */
function comprar(player, id, rev, preco) {
  if (!player.isValid) return false;
  expirarVencidos();
  const cfg = config();
  const lote = lotes().get(id);
  if (!lote || !naVitrine(lote) || lote.rev !== rev || lote.preco !== preco) {
    erro(player, textos.SAIU_DA_VITRINE);
    return false;
  }
  if (!cfg.leilaoLigado) {
    erro(player, textos.FECHADO);
    return false;
  }
  if (lote.vendedor === player.id) {
    erro(player, textos.PROPRIO);
    return false;
  }
  if (saldo(player) < preco) {
    erro(player, textos.SEM_SALDO(preco));
    return false;
  }
  if (caixaDe(player.id).length >= cfg.caixaLimite) {
    erro(player, textos.CAIXA_CHEIA);
    return false;
  }
  adicionarCaudas(player, -preco);
  /** @type {Lote} */
  const vendido = { ...lote, estado: "caixa", dono: player.id, motivo: "comprado", comprador: player.id, rev: lote.rev + 1 };
  try {
    gravarLote(vendido);
  } catch (e) {
    adicionarCaudas(player, preco);
    registrarErro(`Leilão: comprar ${id}`, e);
    erro(player, geral.ERRO_INTERNO);
    return false;
  }
  const liquido = preco - taxaVenda(preco);
  gravarCaudasCaixa(lote.vendedor, caudasCaixa(lote.vendedor) + liquido);
  registrarPreco(lote.item, preco);
  registrarEventos([eventoDe("vendeu", lote, vendedorDe(lote), quem(player))]);
  avisar(player, textos.COMPROU(nomeItem(lote.item), lote.item.q, preco), SONS.ok);
  avisar(porId(lote.vendedor), textos.VENDIDO(nomeItem(lote.item), lote.item.q, player.name, liquido), SONS.ok);
  retirarComAviso(player, id);
  return true;
}

/**
 * Tira um anúncio da vitrine e manda para a caixa do vendedor (cancelar ou remover).
 * @param {Lote} lote @param {"cancelado" | "removido"} motivo
 * @returns {Lote} o lote novo
 */
function tirarDaVitrine(lote, motivo) {
  /** @type {Lote} */
  const novo = { ...lote, estado: "caixa", dono: lote.vendedor, motivo, rev: lote.rev + 1 };
  gravarLote(novo);
  return novo;
}

/**
 * O vendedor cancela o próprio anúncio; tenta devolver na hora.
 * @param {Player} player @param {string} id @param {number} rev
 */
function cancelar(player, id, rev) {
  expirarVencidos();
  const lote = lotes().get(id);
  if (!lote || lote.estado !== "ativo" || lote.rev !== rev) {
    erro(player, textos.SAIU_DA_VITRINE);
    return false;
  }
  if (lote.vendedor !== player.id) {
    erro(player, textos.NAO_E_SEU);
    return false;
  }
  tirarDaVitrine(lote, "cancelado");
  registrarEventos([eventoDe("cancelou", lote, quem(player))]);
  ok(player, textos.CANCELOU);
  retirarComAviso(player, id);
  return true;
}

/**
 * A staff remove um anúncio: vai para a caixa do dono, com aviso.
 * @param {Player} staff @param {string} id @param {number} rev
 */
function remover(staff, id, rev) {
  if (!ehStaff(staff)) {
    erro(staff, geral.SO_STAFF);
    return false;
  }
  expirarVencidos();
  const lote = lotes().get(id);
  if (!lote || lote.estado !== "ativo" || lote.rev !== rev) {
    erro(staff, textos.SAIU_DA_VITRINE);
    return false;
  }
  tirarDaVitrine(lote, "removido");
  registrarEventos([eventoDe("removeu", lote, quem(staff), vendedorDe(lote))]);
  ok(staff, textos.REMOVEU);
  avisar(porId(lote.vendedor), textos.REMOVIDO_AVISO(nomeItem(lote.item), lote.item.q), SONS.erro);
  return true;
}

/** Anúncios vencidos vão para a caixa do vendedor (só o índice muda; nada é apagado). */
function expirarVencidos() {
  const agora = Date.now();
  /** @type {Omit<Evento, "t">[]} */
  const novos = [];
  for (const lote of lotes().values()) {
    if (lote.estado !== "ativo" || lote.expira > agora) continue;
    try {
      gravarLote({ ...lote, estado: "caixa", dono: lote.vendedor, motivo: "expirou", rev: lote.rev + 1 });
      novos.push(eventoDe("expirou", lote, vendedorDe(lote)));
      avisar(porId(lote.vendedor), textos.EXPIROU(nomeItem(lote.item), lote.item.q));
    } catch (e) {
      registrarErro(`Leilão: expirar ${lote.id}`, e);
    }
  }
  registrarEventos(novos);
}

/**
 * Manda um lote para "conferir" (nunca volta a ficar disponível sozinho) e avisa a staff.
 * @param {Lote} lote @param {string} obs
 */
function separarParaConferir(lote, obs) {
  gravarLote({ ...lote, estado: "conferir", obs, rev: lote.rev + 1 });
  const dono = lote.dono ?? lote.vendedor;
  const nome = dono === lote.vendedor ? lote.nomeVendedor : nomeDe(dono);
  registrarEventos([eventoDe("conferir", lote, { id: dono, nome })]);
  avisarStaff(textos.AVISO_STAFF_CONFERIR(nome || textos.DESCONHECIDO, lote.id));
}

/**
 * Entrega um lote da caixa ao dono. Journal: "retirando" é gravado antes de mexer no armazém.
 * @param {Player} player @param {string} id
 * @returns {"ok" | "sem_espaco" | "indisponivel" | "conferir" | "sumiu"}
 */
function retirarLote(player, id) {
  const lote = lotes().get(id);
  if (!lote || lote.estado !== "caixa" || lote.dono !== player.id) return "sumiu";
  if (!armazemPronto()) return "indisponivel";
  gravarLote({ ...lote, estado: "retirando" });
  /** @type {ReturnType<typeof entregar>} */
  let resultado;
  try {
    resultado = entregar(player, nomeEstrutura(id), { t: lote.item.t, q: lote.item.q, n: lote.item.n });
  } catch (e) {
    // entregar só lança antes de tirar o item da estrutura: o lote volta para a caixa.
    registrarErro(`Leilão: retirar ${id}`, e);
    resultado = "indisponivel";
  }
  if (resultado === "ok") {
    apagarLote(id);
    registrarEventos([eventoDe("retirou", lote, quem(player))]);
    return "ok";
  }
  if (resultado === "sem_espaco" || resultado === "indisponivel") {
    gravarLote(lote);
    return resultado;
  }
  registrarErro("Leilão", new Error(`retirada de ${id} por ${player.name} deu "${resultado}"`));
  separarParaConferir(lote, resultado === "divergente" ? "divergente" : "entrega");
  return "conferir";
}

/** Retira um lote e diz o que aconteceu. @param {Player} player @param {string} id */
function retirarComAviso(player, id) {
  const lote = lotes().get(id);
  const resultado = retirarLote(player, id);
  if (resultado === "ok" && lote) avisar(player, textos.RETIROU(nomeItem(lote.item), lote.item.q), SONS.ok);
  else if (resultado === "sem_espaco") erro(player, textos.FICOU_NA_CAIXA);
  else if (resultado === "indisponivel") erro(player, textos.ARMAZEM_ACORDANDO);
  else if (resultado === "conferir") erro(player, textos.CONFERIR_JOGADOR);
  else if (resultado === "sumiu") erro(player, textos.SAIU_DA_VITRINE);
  return resultado;
}

/**
 * Passa as Caudas da caixa para o saldo (o que passar do teto do saldo fica na caixa).
 * @param {Player} player @returns {number} quanto passou
 */
function retirarCaudas(player) {
  const valor = caudasCaixa(player.id);
  if (valor <= 0) return 0;
  const antes = saldo(player);
  const pago = Math.max(0, adicionarCaudas(player, valor) - antes);
  gravarCaudasCaixa(player.id, valor - pago);
  if (pago > 0) registrarEventos([{ e: "caudas", p: pago, a: player.id, an: player.name }]);
  return pago;
}

/** @param {Player} player */
function retirarCaudasComAviso(player) {
  if (caudasCaixa(player.id) <= 0) {
    erro(player, textos.NADA_PARA_RETIRAR);
    return;
  }
  const pago = retirarCaudas(player);
  if (pago > 0) ok(player, textos.RETIROU_CAUDAS(pago));
  else erro(player, textos.SALDO_NO_TETO);
}

/** Tudo o que couber: itens até o inventário encher, depois as Caudas. @param {Player} player */
function retirarTudo(player) {
  let itens = 0;
  /** @type {string | undefined} */
  let parou;
  for (const lote of caixaDe(player.id)) {
    const resultado = retirarLote(player, lote.id);
    if (resultado === "ok") itens++;
    else if (resultado === "conferir") erro(player, textos.CONFERIR_JOGADOR);
    else if (resultado !== "sumiu") {
      parou = resultado;
      break;
    }
  }
  const caudas = retirarCaudas(player);
  const pegou = itens > 0 || caudas > 0;
  if (pegou) ok(player, textos.RETIROU_TUDO(itens, caudas));
  if (parou === "indisponivel") erro(player, textos.ARMAZEM_ACORDANDO);
  else if (parou === "sem_espaco") {
    if (pegou) avisar(player, [textos.SOBROU_NA_CAIXA]);
    else erro(player, textos.FICOU_NA_CAIXA);
  } else if (caudasCaixa(player.id) > 0) erro(player, textos.SALDO_NO_TETO);
  else if (!pegou) erro(player, textos.NADA_PARA_RETIRAR);
}

// ───────────────────────────── staff: conferir ─────────────────────────────

/**
 * Devolve um lote "conferir" à caixa do dono (ou do vendedor; sem nenhum, à caixa da staff).
 * @param {Player} staff @param {string} id @param {number} rev
 */
function devolverConferido(staff, id, rev) {
  if (!ehStaff(staff)) {
    erro(staff, geral.SO_STAFF);
    return false;
  }
  const lote = lotes().get(id);
  if (!lote || lote.estado !== "conferir" || lote.rev !== rev) {
    erro(staff, textos.SAIU_DA_VITRINE);
    return false;
  }
  if (!existe(nomeEstrutura(id))) {
    erro(staff, textos.SEM_ESTRUTURA);
    return false;
  }
  const destino = destinoConferido(lote, staff);
  /** @type {Lote} */
  const novo = { ...lote, estado: "caixa", dono: destino.id, motivo: lote.motivo ?? "removido", rev: lote.rev + 1 };
  delete novo.obs;
  gravarLote(novo);
  registrarEventos([eventoDe("devolveu", lote, quem(staff), destino)]);
  ok(staff, textos.DEVOLVEU);
  return true;
}

/** Para quem vai um lote conferido. @param {Lote} lote @param {Player} staff */
function destinoConferido(lote, staff) {
  if (lote.dono) return { id: lote.dono, nome: lote.dono === lote.vendedor ? lote.nomeVendedor : nomeDe(lote.dono) };
  if (lote.vendedor) return vendedorDe(lote);
  return quem(staff);
}

/** Nome de quem tem o id (online ou pelo último evento). @param {string} id */
function nomeDe(id) {
  const conectado = porId(id);
  if (conectado) return conectado.name;
  for (const ev of eventos()) {
    if (ev.a === id) return ev.an;
    if (ev.b === id && ev.bn) return ev.bn;
  }
  return textos.DESCONHECIDO;
}

/**
 * Apaga de vez um lote "conferir" (estrutura e registro), com log.
 * @param {Player} staff @param {string} id @param {number} rev
 */
function apagarConferido(staff, id, rev) {
  if (!ehStaff(staff)) {
    erro(staff, geral.SO_STAFF);
    return false;
  }
  const lote = lotes().get(id);
  if (!lote || lote.estado !== "conferir" || lote.rev !== rev) {
    erro(staff, textos.SAIU_DA_VITRINE);
    return false;
  }
  if (existe(nomeEstrutura(id)) && !apagar(nomeEstrutura(id))) {
    erro(staff, geral.ERRO_INTERNO);
    return false;
  }
  apagarLote(id);
  const dono = lote.dono ?? lote.vendedor;
  registrarEventos([eventoDe("apagou", lote, quem(staff), { id: dono, nome: dono ? nomeDe(dono) : "" })]);
  console.warn(`[Vulpus] Leilão: ${staff.name} apagou o lote ${id} (${lote.item.t} x${lote.item.q}).`);
  ok(staff, textos.APAGOU);
  return true;
}

// ───────────────────────────── início ─────────────────────────────

/** Depois de um crash: "retirando" e lotes sem estrutura vão para "conferir" (nunca voltam sozinhos). */
function reconciliar() {
  for (const lote of [...lotes().values()]) {
    try {
      if (lote.estado === "retirando") separarParaConferir(lote, "retirando");
      else if ((lote.estado === "ativo" || lote.estado === "caixa") && !existe(nomeEstrutura(lote.id))) {
        separarParaConferir(lote, "estrutura");
      }
    } catch (e) {
      registrarErro(`Leilão: conferir ${lote.id}`, e);
    }
  }
}

/**
 * Baú perdido resgatado pelo armazém: vira um lote "conferir" sem dono.
 * @param {string} id @param {ItemStack[]} itens
 */
function loteResgatado(id, itens) {
  if (!itens.length) return;
  const agora = Date.now();
  /** @type {Lote} */
  const lote = {
    v: 1,
    id,
    rev: 0,
    estado: "conferir",
    vendedor: "",
    nomeVendedor: textos.DESCONHECIDO,
    preco: 0,
    criado: agora,
    expira: agora,
    dono: null,
    motivo: null,
    obs: "resgate",
    item: resumir(itens[0]),
  };
  gravarLote(lote);
  registrarEventos([eventoDe("conferir", lote, { id: "", nome: "" })]);
}

// ───────────────────────────── telas ─────────────────────────────

/** @param {Categoria} cat */
function iconeCategoria(cat) {
  /** @type {Record<Categoria, string>} */
  const icones = {
    blocos: ICONES.catBlocos,
    ferramentas: ICONES.catFerramentas,
    armas: ICONES.catArmas,
    armaduras: ICONES.catArmaduras,
    comida: ICONES.catComida,
    pocoes: ICONES.catPocoes,
    livros: ICONES.catLivros,
    shulkers: ICONES.catShulkers,
    outros: ICONES.catOutros,
  };
  return icones[cat] ?? ICONES.catOutros;
}

/**
 * Lista de sim ou não com texto rico (nome de item traduzido). Fechar conta como não.
 * @param {Player} player @param {string} titulo @param {RawMessage | string} texto @param {string} sim
 * @returns {Promise<boolean>}
 */
async function confirmarItem(player, titulo, texto, sim) {
  let aceitou = false;
  await new Lista(titulo)
    .texto(texto)
    .botao(sim, ICONES.sim, () => {
      aceitou = true;
    })
    .botao(geral.NAO, ICONES.nao)
    .abrir(player);
  return aceitou;
}

/**
 * Menu principal do leilão.
 * @param {Player} player @param {() => any} [voltar]
 */
export async function menuLeilao(player, voltar) {
  expirarVencidos();
  const cfg = config();
  const aqui = () => menuLeilao(player, voltar);
  const ativos = contarAnuncios(player);
  const caixa = resumoCaixa(player);
  const lista = new Lista(textos.TITULO)
    .texto(
      textos.CORPO({
        saldo: saldo(player),
        ativos,
        limite: cfg.anunciosPorJogador,
        itens: caixa.itens,
        caudas: caixa.caudas,
        aberto: cfg.leilaoLigado,
      }),
    )
    .botao(textos.BOTAO_COMPRAR, ICONES.comprar, (p) => menuCategorias(p, aqui))
    .botao(textos.BOTAO_VENDER, ICONES.vender, (p) => menuVender(p, aqui))
    .botao(textos.BOTAO_MEUS(ativos, cfg.anunciosPorJogador), ICONES.anuncios, (p) => menuMeusAnuncios(p, aqui))
    .botao(textos.BOTAO_CAIXA(caixa.itens), ICONES.caixa, (p) => menuCaixa(p, aqui))
    .botao(textos.BOTAO_HISTORICO, ICONES.historico, (p) => menuHistorico(p, aqui));
  if (ehStaff(player)) lista.botao(textos.BOTAO_STAFF, ICONES.conferir, (p) => menuLeilaoStaff(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/** Anúncios à venda agora. */
const vitrine = () => [...lotes().values()].filter((l) => naVitrine(l));

/**
 * Categorias e busca.
 * @param {Player} player @param {() => any} [voltar]
 */
async function menuCategorias(player, voltar) {
  expirarVencidos();
  const aqui = () => menuCategorias(player, voltar);
  const todos = vitrine();
  /** @param {Filtro} filtro */
  const abrir = (filtro) => (/** @type {Player} */ p) => menuVitrine(p, filtro, aqui);
  const lista = new Lista(textos.TITULO_COMPRAR)
    .texto(textos.CORPO_COMPRAR(todos.length))
    .botao(textos.COM_CONTAGEM(textos.TUDO, todos.length), ICONES.catTudo, abrir({ ordem: "novos", pagina: 0 }));
  for (const cat of CATEGORIAS) {
    const n = todos.filter((l) => l.item.c === cat).length;
    lista.botao(textos.COM_CONTAGEM(textos.CATEGORIAS[cat], n), iconeCategoria(cat), abrir({ categoria: cat, ordem: "novos", pagina: 0 }));
  }
  lista.botao(textos.BOTAO_BUSCAR, ICONES.buscar, async (p) => {
    const resposta = await perguntar(p, textos.TITULO_BUSCA, [{ tipo: "texto", rotulo: textos.CAMPO_BUSCA, dica: textos.DICA_BUSCA }]);
    const termo = resposta ? String(resposta[0]).replace(/§/g, "").slice(0, 32).trim() : "";
    await (termo ? menuVitrine(p, { busca: termo, ordem: "novos", pagina: 0 }, aqui) : aqui());
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * Busca por palavras (sem acento), com apelidos PT → EN. Palavras de até 2 letras só valem inteiras.
 * @param {Lote} lote @param {string[][]} termos  cada termo com as alternativas
 */
function casaBusca(lote, termos) {
  const palavras = lote.item.busca.split(" ");
  return termos.every((alternativas) =>
    alternativas.some((alt) => (alt.length <= 2 ? palavras.includes(alt) : lote.item.busca.includes(alt))),
  );
}

/** @param {string} busca @returns {string[][]} */
function termosDe(busca) {
  return normalizar(busca)
    .split(" ")
    .filter(Boolean)
    .map((palavra) => [palavra, ...(textos.APELIDOS[palavra] ?? [])]);
}

/**
 * Página da vitrine.
 * @param {Player} player @param {Filtro} filtro @param {() => any} voltar
 */
async function menuVitrine(player, filtro, voltar) {
  expirarVencidos();
  const termos = filtro.busca ? termosDe(filtro.busca) : [];
  const achados = vitrine()
    .filter((l) => !filtro.categoria || l.item.c === filtro.categoria)
    .filter((l) => casaBusca(l, termos))
    .sort((a, b) => (filtro.ordem === "preco" ? a.preco - b.preco : 0) || maisNovo(a, b));
  const paginas = Math.max(1, Math.ceil(achados.length / POR_PAGINA));
  const pagina = limitar(filtro.pagina, 0, paginas - 1);
  const aqui = () => menuVitrine(player, { ...filtro, pagina }, voltar);
  /** @param {Partial<Filtro>} mudanca */
  const ir = (mudanca) => (/** @type {Player} */ p) => menuVitrine(p, { ...filtro, ...mudanca }, voltar);
  const titulo = filtro.busca
    ? textos.TITULO_RESULTADO(filtro.busca)
    : filtro.categoria
      ? textos.CATEGORIAS[filtro.categoria]
      : textos.TUDO;
  const lista = new Lista(titulo).texto(textos.CORPO_VITRINE({ total: achados.length, pagina: pagina + 1, paginas }));
  for (const lote of achados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)) {
    lista.botao(botaoAnuncio(lote), iconeCategoria(lote.item.c), (p) => menuDetalhe(p, lote, aqui));
  }
  if (achados.length > 1) {
    lista.botao(textos.BOTAO_ORDEM(filtro.ordem), ICONES.ordenar, ir({ ordem: filtro.ordem === "novos" ? "preco" : "novos", pagina: 0 }));
  }
  if (pagina > 0) lista.botao(textos.BOTAO_ANTERIOR, ICONES.voltarNav, ir({ pagina: pagina - 1 }));
  if (pagina < paginas - 1) lista.botao(textos.BOTAO_PROXIMA, ICONES.proxima, ir({ pagina: pagina + 1 }));
  await lista.voltar(voltar).abrir(player);
}

/** @param {Lote} lote @returns {RawMessage} */
const botaoAnuncio = (lote) =>
  raw(textos.BOTAO_ANUNCIO(nomeItem(lote.item, MAX_NOME_BOTAO), lote.item.q, !!lote.item.e?.length, lote.preco));

/**
 * Linhas do item (nome, encantos, durabilidade, descrição, livro e conteúdo do shulker).
 * @param {ResumoItem} item @returns {(Parte | Parte[])[]}
 */
function linhasItem(item) {
  /** @type {(Parte | Parte[])[]} */
  const saida = [textos.DETALHE_NOME(nomeItem(item), item.q)];
  if (item.e?.length) saida.push(textos.DETALHE_ENCANTOS(item.e.map(([id, nivel]) => textos.ENCANTO(id, nivel))));
  if (item.d) saida.push(textos.DETALHE_DURABILIDADE(item.d[1] - item.d[0], item.d[1]));
  if (item.l?.length) saida.push(textos.DETALHE_LORE, ...item.l.map(textos.DETALHE_LORE_LINHA));
  if (item.b) saida.push(textos.DETALHE_LIVRO(item.b.a, item.b.p));
  if (item.s?.length) {
    const mostrados = item.s.reduce((soma, [, q]) => soma + q, 0);
    saida.push(textos.DETALHE_SHULKER(item.s.map(([t, q]) => `${t.replace(/_/g, " ")} x${q}`), (item.sn ?? 0) - mostrados));
  }
  return saida;
}

/**
 * Detalhe de um anúncio da vitrine (ou dos meus anúncios).
 * @param {Player} player @param {Lote} visto  o lote como estava na lista @param {() => any} voltar
 */
async function menuDetalhe(player, visto, voltar) {
  expirarVencidos();
  const lote = lotes().get(visto.id);
  if (!lote || lote.rev !== visto.rev || !naVitrine(lote)) {
    erro(player, textos.SAIU_DA_VITRINE);
    await voltar();
    return;
  }
  const meu = lote.vendedor === player.id;
  const mediana = medianaUnidade(lote.item);
  /** @type {(Parte | Parte[])[]} */
  const corpo = [
    ...linhasItem(lote.item),
    "",
    meu ? textos.DETALHE_SEU : textos.DETALHE_VENDEDOR(lote.nomeVendedor),
    textos.DETALHE_PRECO(lote.preco, lote.item.q),
    ...(mediana === undefined ? [] : [textos.DETALHE_MEDIANA(mediana)]),
    textos.DETALHE_EXPIRA(lote.expira - Date.now()),
  ];
  const nome = nomeItem(lote.item);
  const lista = new Lista(textos.TITULO_DETALHE).texto(linhas(corpo));
  if (meu) {
    lista.botao(textos.BOTAO_CANCELAR, ICONES.nao, async (p) => {
      if (await confirmarItem(p, textos.TITULO_CANCELAR, raw(textos.CONFIRMA_CANCELAR(nome, lote.item.q)), geral.SIM)) {
        cancelar(p, lote.id, lote.rev);
      }
      await voltar();
    });
  } else {
    lista.botao(textos.BOTAO_COMPRAR_POR(lote.preco), ICONES.comprar, async (p) => {
      const texto = raw(textos.CONFIRMA_COMPRA(nome, lote.item.q, lote.preco, lote.nomeVendedor));
      if (await confirmarItem(p, textos.TITULO_CONFIRMAR_COMPRA, texto, textos.BOTAO_COMPRAR_POR(lote.preco))) {
        comprar(p, lote.id, lote.rev, lote.preco);
      }
      await voltar();
    });
    if (ehStaff(player)) {
      lista.botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
        const texto = raw(textos.CONFIRMA_REMOVER(nome, lote.item.q, lote.nomeVendedor));
        if (await confirmarItem(p, textos.TITULO_REMOVER, texto, textos.BOTAO_REMOVER)) remover(p, lote.id, lote.rev);
        await voltar();
      });
    }
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Pede o preço até ele servir (fechar = desistir).
 * @param {Player} player @param {ResumoItem} item
 * @returns {Promise<number | undefined>}
 */
async function pedirPreco(player, item) {
  const cfg = config();
  const mediana = medianaUnidade(item);
  let padrao = mediana === undefined ? "" : String(limitar(Math.round(mediana * item.q), cfg.precoMinimo, cfg.precoMaximo));
  const rotulo = textos.CAMPO_PRECO(cfg.precoMinimo, cfg.precoMaximo) + (mediana === undefined ? "" : textos.CAMPO_PRECO_MEDIANA(mediana));
  for (;;) {
    const resposta = await perguntar(player, textos.TITULO_VENDER, [{ tipo: "texto", rotulo, dica: textos.DICA_PRECO, padrao }]);
    if (!resposta) return undefined;
    const preco = lerPreco(resposta[0]);
    if (preco !== undefined) return preco;
    erro(player, textos.PRECO_INVALIDO(cfg.precoMinimo, cfg.precoMaximo));
    padrao = resposta[0];
  }
}

/**
 * Vender o item da mão: confere, pede o preço (se não veio pelo comando), confirma e anuncia.
 * @param {Player} player @param {() => any} [voltar] @param {number} [precoDado]
 */
async function menuVender(player, voltar, precoDado) {
  expirarVencidos();
  const cfg = config();
  const slot = player.selectedSlotIndex;
  const problema = problemaParaVender(player, slot);
  const item = itemNoSlot(player, slot);
  if (problema || !item) {
    erro(player, problema ?? textos.MAO_VAZIA);
    await voltar?.();
    return;
  }
  const resumo = resumir(item);
  let preco = precoDado;
  if (preco === undefined) {
    preco = await pedirPreco(player, resumo);
    if (preco === undefined) {
      await voltar?.();
      return;
    }
  } else if (lerPreco(String(preco)) !== preco) {
    erro(player, textos.PRECO_INVALIDO(cfg.precoMinimo, cfg.precoMaximo));
    return;
  }
  const taxa = taxaAnuncio(preco);
  if (saldo(player) < taxa) {
    erro(player, textos.SEM_SALDO_TAXA(taxa));
    await voltar?.();
    return;
  }
  const texto = raw(
    textos.CONFIRMA_VENDA({
      nome: nomeItem(resumo),
      q: resumo.q,
      preco,
      taxa,
      pctVenda: pctVenda(),
      horas: Math.max(1, cfg.duracaoAnuncioHoras),
    }),
  );
  if (await confirmarItem(player, textos.TITULO_VENDER, texto, textos.BOTAO_ANUNCIAR)) {
    anunciar(player, { slot, assinatura: assinatura(resumo), preco });
  }
  await voltar?.();
}

/**
 * @param {Player} player @param {() => any} voltar
 */
async function menuMeusAnuncios(player, voltar) {
  expirarVencidos();
  const aqui = () => menuMeusAnuncios(player, voltar);
  const meus = ativosDe(player.id).sort(maisNovo);
  const lista = new Lista(textos.TITULO_MEUS).texto(textos.CORPO_MEUS(meus.length, config().anunciosPorJogador));
  for (const lote of meus) lista.botao(botaoAnuncio(lote), iconeCategoria(lote.item.c), (p) => menuDetalhe(p, lote, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Caixa de retirada: Caudas, cada item e "Retirar tudo".
 * @param {Player} player @param {() => any} [voltar]
 */
export async function menuCaixa(player, voltar) {
  expirarVencidos();
  const aqui = () => menuCaixa(player, voltar);
  const itens = caixaDe(player.id);
  const caudas = caudasCaixa(player.id);
  const lista = new Lista(textos.TITULO_CAIXA).texto(textos.CORPO_CAIXA(itens.length, caudas, config().caixaLimite));
  if (caudas > 0) {
    lista.botao(textos.BOTAO_RETIRAR_CAUDAS(caudas), ICONES.caudas, async (p) => {
      retirarCaudasComAviso(p);
      await aqui();
    });
  }
  for (const lote of itens) {
    const botao = raw(textos.BOTAO_ITEM_CAIXA(nomeItem(lote.item, MAX_NOME_BOTAO), lote.item.q, textos.MOTIVOS[lote.motivo ?? "removido"]));
    lista.botao(botao, iconeCategoria(lote.item.c), async (p) => {
      retirarComAviso(p, lote.id);
      await aqui();
    });
  }
  if (itens.length > 1 || (itens.length && caudas > 0)) {
    lista.botao(textos.BOTAO_RETIRAR_TUDO, ICONES.caixa, async (p) => {
      retirarTudo(p);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Uma linha de evento, do ponto de vista de quem lê (idLeitor undefined = log da staff).
 * @param {Evento} ev @param {string} [idLeitor] @returns {Parte[]}
 */
function linhaEvento(ev, idLeitor) {
  const comprou = ev.e === "vendeu" && idLeitor !== undefined && ev.b === idLeitor;
  const tipo = comprou ? "comprou" : ev.e;
  const eu = idLeitor !== undefined && (comprou || ev.a === idLeitor || (ev.b === idLeitor && ev.e !== "vendeu"));
  const texto = textos.TEXTO_EVENTO(tipo, { eu, a: ev.an, b: ev.bn ?? "", p: ev.p ?? 0 });
  return textos.EVENTO(textos.QUANDO(ev.t), texto, ev.i ? { translate: ev.i } : undefined, ev.q);
}

/** @param {Player} player @param {() => any} voltar */
async function menuHistorico(player, voltar) {
  const meus = eventos()
    .filter((ev) => ev.a === player.id || ev.b === player.id)
    .slice(0, EVENTOS_JOGADOR);
  const corpo = meus.length ? linhas(meus.map((ev) => linhaEvento(ev, player.id))) : textos.HISTORICO_VAZIO;
  await new Lista(textos.TITULO_HISTORICO).texto(corpo).voltar(voltar).abrir(player);
}

/**
 * Só staff (confere ehStaff de novo).
 * @param {Player} player @param {() => any} [voltar]
 */
export async function menuLeilaoStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  expirarVencidos();
  const aqui = () => menuLeilaoStaff(player, voltar);
  const todos = [...lotes().values()];
  const contar = (/** @type {Lote["estado"]} */ estado) => todos.filter((l) => l.estado === estado).length;
  const conferir = contar("conferir");
  await new Lista(textos.TITULO_STAFF)
    .texto(
      textos.CORPO_STAFF({
        ativos: contar("ativo"),
        caixa: contar("caixa"),
        conferir,
        total: todos.length,
        limite: LIMITE_LOTES,
        armazem: estadoArmazem(),
        aberto: config().leilaoLigado,
      }),
    )
    .botao(textos.BOTAO_STAFF_ATIVOS(vitrine().length), ICONES.comprar, (p) => menuCategorias(p, aqui))
    .botao(textos.BOTAO_CONFERIR(conferir), ICONES.conferir, (p) => menuConferir(p, aqui))
    .botao(textos.BOTAO_LOG, ICONES.historico, (p) => menuLog(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuConferir(player, voltar) {
  if (!ehStaff(player)) return;
  const aqui = () => menuConferir(player, voltar);
  const separados = [...lotes().values()].filter((l) => l.estado === "conferir").sort(maisNovo);
  const lista = new Lista(textos.TITULO_CONFERIR).texto(separados.length ? "" : textos.CONFERIR_VAZIO);
  for (const lote of separados) {
    const dono = lote.dono ? nomeDe(lote.dono) : lote.nomeVendedor;
    lista.botao(raw(textos.BOTAO_ITEM_CONFERIR(nomeItem(lote.item, MAX_NOME_BOTAO), lote.item.q, dono)), ICONES.conferir, (p) =>
      menuLoteConferir(p, lote, aqui),
    );
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player @param {Lote} visto @param {() => any} voltar
 */
async function menuLoteConferir(player, visto, voltar) {
  const lote = lotes().get(visto.id);
  if (!ehStaff(player) || !lote || lote.estado !== "conferir" || lote.rev !== visto.rev) {
    erro(player, textos.SAIU_DA_VITRINE);
    await voltar();
    return;
  }
  const temEstrutura = existe(nomeEstrutura(lote.id));
  const destino = destinoConferido(lote, player);
  const obs = textos.OBS[temEstrutura ? (lote.obs ?? "divergente") : "estrutura"] ?? "";
  /** @type {(Parte | Parte[])[]} */
  const corpo = [
    ...linhasItem(lote.item),
    "",
    textos.DETALHE_VENDEDOR(lote.nomeVendedor),
    ...(lote.dono ? [textos.DETALHE_DONO(nomeDe(lote.dono))] : []),
    ...(lote.motivo ? [textos.DETALHE_MOTIVO(textos.MOTIVOS[lote.motivo])] : []),
    `§8${lote.id}`,
    "",
    obs,
  ];
  const nome = nomeItem(lote.item);
  const lista = new Lista(textos.TITULO_LOTE_CONFERIR).texto(linhas(corpo));
  if (temEstrutura) {
    const rotulo = destino.id === player.id && !lote.dono && !lote.vendedor ? textos.BOTAO_DEVOLVER_MINHA : textos.BOTAO_DEVOLVER;
    lista.botao(rotulo, ICONES.caixa, async (p) => {
      const texto = raw(textos.CONFIRMA_DEVOLVER(nome, lote.item.q, destino.nome, obs));
      if (await confirmarItem(p, textos.TITULO_DEVOLVER, texto, rotulo)) devolverConferido(p, lote.id, lote.rev);
      await voltar();
    });
  }
  lista.botao(textos.BOTAO_APAGAR, ICONES.apagar, async (p) => {
    const primeira = await confirmarItem(p, textos.TITULO_APAGAR, raw(textos.CONFIRMA_APAGAR(nome, lote.item.q)), textos.BOTAO_APAGAR);
    if (primeira && (await confirmarItem(p, textos.TITULO_APAGAR_2, textos.CONFIRMA_APAGAR_2, textos.BOTAO_SIM_APAGAR))) {
      apagarConferido(p, lote.id, lote.rev);
    }
    await voltar();
  });
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuLog(player, voltar) {
  if (!ehStaff(player)) return;
  const ultimos = eventos().slice(0, EVENTOS_LOG);
  const corpo = ultimos.length ? linhas(ultimos.map((ev) => linhaEvento(ev))) : textos.LOG_VAZIO;
  await new Lista(textos.TITULO_LOG).texto(corpo).voltar(voltar).abrir(player);
}

// ───────────────────────────── eventos e comandos ─────────────────────────────

aoFicarPronto(reconciliar);
aoResgatar((id, itens) => {
  try {
    loteResgatado(id, itens);
  } catch (e) {
    registrarErro(`Leilão: registrar o resgate ${id}`, e);
  }
});

world.afterEvents.worldLoad.subscribe(() => {
  try {
    lotes();
  } catch (e) {
    registrarErro("Leilão: carregar os lotes", e);
  }
});

system.runInterval(() => {
  try {
    expirarVencidos();
  } catch (e) {
    registrarErro("Leilão: expirar anúncios", e);
  }
}, TICKS_EXPIRAR);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    try {
      if (!player.isValid) return;
      const { itens, caudas } = resumoCaixa(player);
      if (itens > 0 || caudas > 0) avisar(player, [textos.AVISO_ENTRADA(itens, caudas)], SONS.pedido);
    } catch (e) {
      registrarErro("Leilão: aviso da caixa", e);
    }
  }, TICKS_AVISO_ENTRADA);
});

registrarComando({ nome: "leilao", descricao: textos.DESC_LEILAO }, (p) => menuLeilao(p));
registrarComando(
  { nome: "vender", descricao: textos.DESC_VENDER, parametros: [{ nome: "preco", tipo: "inteiro" }] },
  (p, [preco]) => menuVender(p, undefined, preco),
);
registrarComando({ nome: "caixa", descricao: textos.DESC_CAIXA }, (p) => menuCaixa(p));
