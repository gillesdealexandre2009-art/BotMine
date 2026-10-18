// @ts-check
// Painel da staff do Canto comunitário: marcar o baú, o mural, a fogueira e o placar, abrir metas,
// ler as sugestões e abrir as configurações.
import { ICONES } from "../config.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro } from "../core/util.js";
import * as textos from "../textos/comunidade.js";
import { SO_STAFF } from "../textos/geral.js";
import * as com from "./comunidade.js";

/** @typedef {import("@minecraft/server").Player} Player */

/** @param {number} ts */
const quando = (ts) => {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  return min < 60 ? `${min} min` : min < 1440 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`;
};

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuSugestoes(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const lista = com.listarSugestoes();
  const corpo = lista.length ? lista.map((s) => `§7${quando(s.ts)} §f${s.n}§7: ${s.t}`).join("\n\n") : textos.SEM_SUGESTOES;
  const tela = new Lista(textos.BOTAO_SUGESTOES(lista.length)).texto(corpo);
  if (lista.length) {
    tela.botao(textos.BOTAO_APAGAR_SUGESTOES, ICONES.apagar, async (p) => {
      if (ehStaff(p)) com.apagarSugestoes(p);
      await voltar();
    });
  }
  await tela.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]  abre o formulário de configurações do canto comunitário
 */
export async function menuComunidadeStaff(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuComunidadeStaff(player, voltar, configurar);
  const e = com.estadoComunidade();
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };

  const lista = new Lista(textos.TITULO_STAFF)
    .texto(textos.CORPO_STAFF({ ...e, sugestoes: e.sugestoes }))
    .botao(textos.BOTAO_MARCAR_BAU, ICONES.caixa, eVolta((p) => com.marcarBau(p)))
    .botao(textos.BOTAO_MARCAR_MURAL, ICONES.anuncios, eVolta((p) => com.marcarMural(p)))
    .botao(textos.BOTAO_MARCAR_FOGUEIRA, ICONES.casaCla, eVolta((p) => com.marcarFogueira(p)))
    .botao(
      textos.BOTAO_RAIO_FOGUEIRA,
      ICONES.editar,
      eVolta(async (p) => {
        const r = await perguntar(p, textos.BOTAO_RAIO_FOGUEIRA, [
          { tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao: e.raioFogueira, min: 1, max: com.LIMITES_COMUNIDADE.raioFogueiraMax },
        ]);
        if (r && ehStaff(p)) com.raioFogueira(p, r[0]);
      }),
    )
    .botao(textos.BOTAO_PLACAR, ICONES.trofeu, eVolta((p) => com.marcarPlacar(p)))
    .botao(
      textos.BOTAO_NOVA_META,
      ICONES.nova,
      eVolta(async (p) => {
        const r = await perguntar(p, textos.BOTAO_NOVA_META, [
          { tipo: "texto", rotulo: textos.ROTULO_META_NOME, dica: textos.DICA_META_NOME, padrao: e.meta?.nome ?? "" },
          { tipo: "texto", rotulo: textos.ROTULO_META_ITEM, padrao: com.itemNaMao(p) },
          { tipo: "numero", rotulo: textos.ROTULO_META_ALVO, padrao: e.meta?.alvo ?? 256, min: 1, max: 1000000 },
        ]);
        if (r && ehStaff(p)) com.novaMeta(p, String(r[0]), String(r[1]).trim(), r[2]);
      }),
    );
  if (e.meta) lista.botao(textos.BOTAO_ZERAR_META, ICONES.nao, eVolta((p) => com.encerrarMeta(p)));
  lista.botao(textos.BOTAO_SUGESTOES(e.sugestoes), ICONES.lore, (p) => menuSugestoes(p, aqui));
  if (configurar) lista.botao(textos.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurar(p)));
  lista.botao(
    textos.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textos.BOTAO_REMOVER, texto: textos.CONFIRMAR_REMOVER })) com.removerTudoComunidade(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}
