// @ts-check
// Ponte entre as Eras e os sistemas de ganhos (XP, Caudas do tempo online, leilão). Os sistemas só consultam estas funções (sem
// importar as Eras, para não criar import circular); sistemas/eras_mecanicas.js registra quem responde. Sem Era ativa tudo vale 1
// (ou 0 de bônus), e qualquer falha do provedor também cai nesse padrão: as Eras nunca podem atrapalhar os ganhos normais.

/** @typedef {import("@minecraft/server").Player} Player */
/**
 * @typedef {object} Provedor
 * @property {(player: Player) => number} xp
 * @property {(player: Player) => number} caudasMinuto
 * @property {(vendedorId: string, itemTipo: string, liquido: number, quantidade: number) => number} bonusVenda
 */

/** @type {Provedor} */
let provedor = { xp: () => 1, caudasMinuto: () => 1, bonusVenda: () => 0 };

/** @param {Partial<Provedor>} p */
export function registrarModificadores(p) {
  provedor = { ...provedor, ...p };
}

/** Multiplicador do XP ganho por quem está online (1 = nenhum). @param {Player} player */
export function multiplicadorXpEra(player) {
  try {
    const v = provedor.xp(player);
    return Number.isFinite(v) && v >= 1 ? v : 1;
  } catch {
    return 1;
  }
}

/** Multiplicador das Caudas do tempo online (1 = nenhum). @param {Player} player */
export function multiplicadorCaudasMinutoEra(player) {
  try {
    const v = provedor.caudasMinuto(player);
    return Number.isFinite(v) && v >= 1 ? v : 1;
  } catch {
    return 1;
  }
}

/**
 * Caudas extras que a Era paga ao vendedor de um lote do leilão (0 = nenhuma). Nunca duplica o item: é só um bônus em Caudas.
 * @param {string} vendedorId
 * @param {string} itemTipo  typeId do item vendido
 * @param {number} liquido  o que o vendedor recebe depois da taxa
 * @param {number} quantidade  itens no lote
 */
export function bonusVendaEra(vendedorId, itemTipo, liquido, quantidade) {
  try {
    const v = provedor.bonusVenda(vendedorId, itemTipo, liquido, quantidade);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}
