// @ts-check
// Textos da Loja (preço fixo, estoque compartilhado).

export const TITULO = "Loja";
export const CORPO = "§7Compre e venda itens do dia a dia por preços fixos.\n§7O estoque é compartilhado — jogadores abastecem a loja!";

export const BOTAO_COMPRAR = "Comprar";
export const BOTAO_VENDER = "Vender item da mão";

// ── Categorias
/** @type {Record<string, string>} */
export const NOMES_CAT = {
  blocos: "Blocos",
  ferramentas: "Ferramentas",
  armas: "Armas",
  armaduras: "Armaduras",
  comida: "Comida",
  pocoes: "Poções",
  outros: "Outros",
};

// ── Comprar
export const TITULO_CATEGORIAS = "Comprar — Categorias";
export const CORPO_CATEGORIAS = "§7Escolha uma categoria:";

/** @param {string} cat */
export const TITULO_CAT = (cat) => `Comprar — ${cat}`;
/** @param {string} cat */
export const CORPO_CAT = (cat) => `§7Itens disponíveis em §f${cat}§7. O preço é por unidade.`;

/** @param {string} nome @param {number} preco @param {number} estoque */
export const BOTAO_ITEM = (nome, preco, estoque) => `${nome}\n§6${preco} ★§r  §7×${estoque}`;

export const TITULO_QUANTIDADE = "Quantidade";
export const ROTULO_QUANTIDADE = "Quantas unidades?";

/** @param {string} nome @param {number} qtd @param {number} total */
export const CONFIRMAR_COMPRA_TITULO = "Confirmar compra";
/** @param {string} nome @param {number} qtd @param {number} total */
export const CONFIRMAR_COMPRA = (nome, qtd, total) =>
  `§fComprar §e${qtd}x ${nome}§f por §6${total} Caudas§f?\n\n§7O valor será descontado do seu saldo.`;

/** @param {string} nome @param {number} qtd */
export const COMPROU = (nome, qtd) => `§a✔ §fComprou §e${qtd}x ${nome}§f!`;
export const SEM_ESTOQUE = "Esse item está fora de estoque.";
/** @param {number} tem @param {number} pediu */
export const ESTOQUE_INSUFICIENTE = (tem, pediu) => `Só tem §f${tem}§c em estoque (você pediu ${pediu}).`;
export const SEM_SALDO = "Você não tem Caudas suficientes.";
export const INVENTARIO_CHEIO = "§eSeu inventário está cheio — os itens caíram no chão.";

// ── Vender
export const TITULO_VENDER = "Vender";
export const MAO_VAZIA = "Segure o item que quer vender na mão.";
export const ITEM_SEM_PRECO = "Esse item não é aceito pela Loja.";

/** @param {string} nome @param {number} qtd @param {number} unitario @param {number} total */
export const CONFIRMAR_VENDA = (nome, qtd, unitario, total) =>
  `§fVender §e${qtd}x ${nome}§f?\n\n§7Preço por unidade: §6${unitario} ★\n§7Total: §6${total} Caudas`;

export const AVISO_ENCANTADO =
  "\n\n§c⚠ Este item está encantado!\n§7Você receberá apenas o preço base, sem valor extra pelos encantamentos. Tem certeza?";

/** @param {string} nome @param {number} qtd @param {number} total */
export const VENDEU = (nome, qtd, total) => `§a✔ §fVendeu §e${qtd}x ${nome}§f por §6${total} Caudas§f!`;

// ── Geral
export const LOJA_FECHADA = "A loja está fechada no momento.";
export const NADA_NA_CATEGORIA = "§7Nenhum item nessa categoria.";
