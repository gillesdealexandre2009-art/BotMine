// RASCUNHO (pesquisa) — nao e codigo do projeto. Script API: @minecraft/server-ui 2.2.0 / @minecraft/server 2.x
import { system } from '@minecraft/server';
import { ActionFormData, FormCancelationReason } from '@minecraft/server-ui';

// Flags = so codigos de formatacao validos (invisiveis) + §r no fim (reseta cor/estilo do titulo).
export const VULPUS_FLAG = Object.freeze({
  BASE: '§v§u§l§p',       // prefixo: RP esconde o long_form vanilla
  MAIN: '§v§u§l§p§0§r',   // layout menu principal (8 slots fixos, collection_index 0..7)
  LIST: '§v§u§l§p§1§r',   // layout lista (submenus); qualquer BASE != MAIN cai aqui
});

const MAIN_SLOTS = 8; // 0..3 coluna esquerda (cima->baixo), 4..7 coluna direita

/**
 * Menu principal. NAO usar label()/header()/divider() aqui: o collection_index conta
 * todas as entradas, mas response.selection conta so botoes (bedrock-core allocate.ts).
 * @param {string|import('@minecraft/server').RawMessage} title
 * @param {string|import('@minecraft/server').RawMessage} body  texto abaixo da logo (#form_text)
 * @param {Array<{text: string|import('@minecraft/server').RawMessage, icon?: string}|null>} slots
 */
export function buildMainMenu(title, body, slots) {
  const form = new ActionFormData()
    .title({ rawtext: [{ text: VULPUS_FLAG.MAIN }, typeof title === 'string' ? { text: title } : title] })
    .body(body);
  for (let i = 0; i < MAIN_SLOTS; i++) {
    const s = slots[i];
    form.button(s ? s.text : '', s?.icon); // '' = slot vazio -> RP esconde o conteudo do slot
  }
  return form;
}

/** Submenu em lista: aqui header()/label()/divider() sao livres (a factory do RP trata). */
export function buildListMenu(title, body) {
  return new ActionFormData()
    .title({ rawtext: [{ text: VULPUS_FLAG.LIST }, typeof title === 'string' ? { text: title } : title] })
    .body(body ?? '');
}

/** show() com retry quando o jogador esta ocupado (ex.: chat aberto). */
export async function showForm(player, form, maxTries = 20) {
  for (let i = 0; i < maxTries; i++) {
    const res = await form.show(player);
    if (!(res.canceled && res.cancelationReason === FormCancelationReason.UserBusy)) return res;
    await system.waitTicks(5);
  }
  return undefined;
}
