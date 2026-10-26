// @ts-check
// Loja de preço fixo: itens do dia a dia com estoque compartilhado (jogadores reabastecem vendendo).
// Compra e venda pelo menu; encantados pedem confirmação extra antes de vender.
import { ItemStack } from "@minecraft/server";
import { ICONES } from "../config.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { erro, msg, ok, registrarErro, som } from "../core/util.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { CATALOGO, CATEGORIAS, POR_ID } from "../textos/loja_catalogo.js";
import * as textos from "../textos/loja.js";

/** @typedef {import("@minecraft/server").Player} Player */

const CHAVE_ESTOQUE = "vulpus:loja:estoque";

// ───────────────────────────── estoque ─────────────────────────────

/** @type {Map<string, number> | null} */
let cache = null;
let sujo = false;

function carregar() {
  if (cache) return cache;
  /** @type {Record<string, number>} */
  const raw = lerMundo(CHAVE_ESTOQUE, {});
  cache = new Map(Object.entries(raw));
  return cache;
}

function salvar() {
  if (!cache || !sujo) return;
  /** @type {Record<string, number>} */
  const obj = {};
  for (const [k, v] of cache) if (v > 0) obj[k] = v;
  salvarMundo(CHAVE_ESTOQUE, obj);
  sujo = false;
}

/** @param {string} id @returns {number} */
function estoque(id) {
  return carregar().get(id) ?? 0;
}

/** @param {string} id @param {number} delta */
function alterarEstoque(id, delta) {
  const m = carregar();
  const atual = m.get(id) ?? 0;
  m.set(id, Math.max(0, atual + delta));
  sujo = true;
  salvar();
}

// ───────────────────────────── ícones por categoria ─────────────────────────────

/** @type {Record<string, string>} */
const ICONE_CAT = {
  blocos: ICONES.catBlocos,
  ferramentas: ICONES.catFerramentas,
  armas: ICONES.catArmas,
  armaduras: ICONES.catArmaduras,
  comida: ICONES.catComida,
  pocoes: ICONES.catPocoes,
  outros: ICONES.catOutros,
};

// ───────────────────────────── menu principal ─────────────────────────────

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuLoja(player, voltar) {
  const aqui = () => menuLoja(player, voltar);
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(textos.BOTAO_COMPRAR, ICONES.comprar, (p) => menuCategorias(p, aqui))
    .botao(textos.BOTAO_VENDER, ICONES.vender, (p) => fluxoVenda(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

// ───────────────────────────── compra ─────────────────────────────

/** @param {Player} player @param {() => any} voltar */
async function menuCategorias(player, voltar) {
  const aqui = () => menuCategorias(player, voltar);
  const lista = new Lista(textos.TITULO_CATEGORIAS).texto(textos.CORPO_CATEGORIAS);
  for (const cat of CATEGORIAS) {
    const nome = textos.NOMES_CAT[cat] ?? cat;
    const total = CATALOGO.filter((i) => i.categoria === cat).reduce((s, i) => s + estoque(i.id), 0);
    lista.botao(`${nome} §7(${total})`, ICONE_CAT[cat], (p) => menuCategoria(p, cat, aqui));
  }
  lista.voltar(voltar);
  await lista.abrir(player);
}

/** @param {Player} player @param {string} cat @param {() => any} voltar */
async function menuCategoria(player, cat, voltar) {
  const aqui = () => menuCategoria(player, cat, voltar);
  const nome = textos.NOMES_CAT[cat] ?? cat;
  const itens = CATALOGO.filter((i) => i.categoria === cat);
  if (!itens.length) {
    msg(player, textos.NADA_NA_CATEGORIA);
    voltar();
    return;
  }
  const lista = new Lista(textos.TITULO_CAT(nome)).texto(textos.CORPO_CAT(nome));
  for (const item of itens) {
    const est = estoque(item.id);
    lista.botao(textos.BOTAO_ITEM(item.nome, item.compra, est), ICONE_CAT[item.categoria], (p) => menuQuantidade(p, item, aqui));
  }
  lista.voltar(voltar);
  await lista.abrir(player);
}

/**
 * @param {Player} player
 * @param {import("../textos/loja_catalogo.js").ItemLoja} item
 * @param {() => any} voltar
 */
async function menuQuantidade(player, item, voltar) {
  const est = estoque(item.id);
  if (est <= 0) {
    erro(player, textos.SEM_ESTOQUE);
    voltar();
    return;
  }
  const max = Math.min(est, 64);
  const resp = await perguntar(player, textos.TITULO_QUANTIDADE, [
    { tipo: "numero", rotulo: textos.ROTULO_QUANTIDADE, padrao: 1, min: 1, max },
  ]);
  if (!resp) {
    voltar();
    return;
  }
  const qtd = /** @type {number} */ (resp[0]);
  if (qtd < 1) {
    voltar();
    return;
  }

  const estAtual = estoque(item.id);
  if (estAtual < qtd) {
    if (estAtual <= 0) {
      erro(player, textos.SEM_ESTOQUE);
    } else {
      erro(player, textos.ESTOQUE_INSUFICIENTE(estAtual, qtd));
    }
    voltar();
    return;
  }

  const total = item.compra * qtd;
  const aceito = await confirmar(player, {
    titulo: textos.CONFIRMAR_COMPRA_TITULO,
    texto: textos.CONFIRMAR_COMPRA(item.nome, qtd, total),
  });
  if (!aceito) {
    voltar();
    return;
  }

  if (saldo(player) < total) {
    erro(player, textos.SEM_SALDO);
    voltar();
    return;
  }
  if (estoque(item.id) < qtd) {
    erro(player, textos.SEM_ESTOQUE);
    voltar();
    return;
  }

  adicionarCaudas(player, -total);
  alterarEstoque(item.id, -qtd);

  try {
    const stack = new ItemStack(item.id, qtd);
    const container = player.getComponent("inventory")?.container;
    if (container) {
      const sobra = container.addItem(stack);
      if (sobra) {
        player.dimension.spawnItem(sobra, player.location);
        msg(player, textos.INVENTARIO_CHEIO);
      }
    }
  } catch (e) {
    registrarErro("Loja: entregar item", e);
  }

  ok(player, textos.COMPROU(item.nome, qtd));
  som(player, "random.orb", { volume: 0.7 });
  voltar();
}

// ───────────────────────────── venda ─────────────────────────────

/** @param {Player} player @param {() => any} voltar */
async function fluxoVenda(player, voltar) {
  const container = player.getComponent("inventory")?.container;
  const slot = player.selectedSlotIndex;
  const itemNaMao = container?.getItem(slot);

  if (!itemNaMao) {
    erro(player, textos.MAO_VAZIA);
    voltar();
    return;
  }

  const dado = POR_ID.get(itemNaMao.typeId);
  if (!dado) {
    erro(player, textos.ITEM_SEM_PRECO);
    voltar();
    return;
  }

  const qtd = itemNaMao.amount;
  const unitario = dado.venda;
  const total = unitario * qtd;

  const encantos = itemNaMao.getComponent("enchantable")?.getEnchantments() ?? [];
  const textoExtra = encantos.length ? textos.AVISO_ENCANTADO : "";

  const aceito = await confirmar(player, {
    titulo: textos.TITULO_VENDER,
    texto: textos.CONFIRMAR_VENDA(dado.nome, qtd, unitario, total) + textoExtra,
  });
  if (!aceito) {
    voltar();
    return;
  }

  const agora = container?.getItem(slot);
  if (!agora || agora.typeId !== itemNaMao.typeId || agora.amount !== qtd) {
    erro(player, "O item na sua mão mudou.");
    voltar();
    return;
  }

  container.setItem(slot, undefined);
  adicionarCaudas(player, total);
  alterarEstoque(dado.id, qtd);

  ok(player, textos.VENDEU(dado.nome, qtd, total));
  som(player, "random.orb", { volume: 0.7 });
  voltar();
}
