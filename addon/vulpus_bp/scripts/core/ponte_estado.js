// @ts-check
// Estado compartilhado entre o vínculo (sistemas/vinculo.js) e a ponte do chat (sistemas/ponte_chat.js), sem import circular.
// O pack da ponte e o do chat (betas, que veem o chat antes de sair) leem a TAG para calar quem está com a tela preta.

/** Tag de quem está com a tela preta esperando ligar a conta. Os packs de chat conferem esta tag (mantenha igual lá). */
export const TAG_TRAVADO = "vulpus:travado";

/** Ids de quem está com a tela preta esperando ligar a conta. @type {Set<string>} */
export const travados = new Set();

/** @param {import("@minecraft/server").Player} p */
export function marcarTravado(p) {
  travados.add(p.id);
  try {
    if (!p.hasTag(TAG_TRAVADO)) p.addTag(TAG_TRAVADO);
  } catch {
    /* sem tag, só o estado em memória vale */
  }
}

/** @param {import("@minecraft/server").Player} p */
export function desmarcarTravado(p) {
  travados.delete(p.id);
  try {
    if (p.hasTag(TAG_TRAVADO)) p.removeTag(TAG_TRAVADO);
  } catch {
    /* jogador saindo */
  }
}
