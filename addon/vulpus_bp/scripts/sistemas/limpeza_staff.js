// @ts-check
// Painel "Limpeza automática" (Staff > Configurações): ligar/desligar, intervalo, itens, mobs, "limpar agora" e quando é a próxima.
// "Limpar agora, sem aviso" é só para o dono.
import { ICONES } from "../config.js";
import { config, salvarConfig } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { Lista, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok } from "../core/util.js";
import * as textos from "../textos/limpeza.js";
import { formatarHora, limparAgora, limpezaAndando, proximaLimpeza, ultimaLimpeza } from "./limpeza.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {() => any} Volta */

/** @param {Player} p */
const staffOk = (p) => {
  if (ehStaff(p) || ehDono(p)) return true;
  erro(p, textos.SO_STAFF);
  return false;
};

/** @param {number} ms */
const quando = (ms) => `${String(new Date(ms - 3 * 3600000).getUTCDate()).padStart(2, "0")}/${String(new Date(ms - 3 * 3600000).getUTCMonth() + 1).padStart(2, "0")} ${formatarHora(ms)}`;

/**
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuLimpezaStaff(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuLimpezaStaff(player, voltar);
  const c = config();
  const proxima = proximaLimpeza();
  const u = ultimaLimpeza();
  const lista = new Lista(textos.TITULO)
    .texto(
      textos.CORPO({
        ligada: c.limpezaLigada,
        itens: c.limpezaItens,
        mobs: c.limpezaMobs,
        intervalo: c.limpezaIntervaloMin,
        proxima: textos.PROXIMA(formatarHora(proxima), Math.max(0, Math.round((proxima - Date.now()) / 60000))),
        ultima: u ? textos.ULTIMA(quando(u.t), u.itens, u.mobs) : textos.SEM_ULTIMA,
        andando: limpezaAndando(),
      }),
    )
    .botao(textos.BOTAO_LIGAR(c.limpezaLigada), ICONES.ajustes, async (p) => {
      if (!staffOk(p)) return;
      salvarConfig({ limpezaLigada: !config().limpezaLigada });
      ok(p, textos.ESTADO(config().limpezaLigada));
      await aqui();
    })
    .botao(textos.BOTAO_AJUSTES, ICONES.ajustes, async (p) => {
      await editarAjustes(p);
      await aqui();
    })
    .botao(textos.BOTAO_AGORA, ICONES.apagar, async (p) => {
      if (staffOk(p)) pedirLimpeza(p, "aviso");
      await aqui();
    });
  if (ehDono(player)) {
    lista.botao(textos.BOTAO_AGORA_SEM_AVISO, ICONES.dono, async (p) => {
      if (ehDono(p)) pedirLimpeza(p, "imediato");
      else erro(p, textos.SO_DONO);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} p
 * @param {import("./limpeza.js").ModoManual} modo
 */
function pedirLimpeza(p, modo) {
  const r = limparAgora(modo);
  if (r === "andando") erro(p, textos.JA_ANDANDO);
  else if (r === "nada") erro(p, textos.NADA_LIGADO);
  else msg(p, textos.COMECOU);
}

/** @param {Player} player */
async function editarAjustes(player) {
  if (!staffOk(player)) return;
  const c = config();
  const r = await perguntar(player, textos.TITULO_AJUSTES, [
    { tipo: "numero", rotulo: textos.ROTULO_INTERVALO, padrao: c.limpezaIntervaloMin, min: 5, max: 120 },
    { tipo: "alternar", rotulo: textos.ROTULO_ITENS, padrao: c.limpezaItens },
    { tipo: "alternar", rotulo: textos.ROTULO_MOBS, padrao: c.limpezaMobs },
  ]);
  if (!r || !staffOk(player)) return;
  salvarConfig({ limpezaIntervaloMin: r[0], limpezaItens: r[1], limpezaMobs: r[2] });
  ok(player, textos.AJUSTES_SALVOS);
}
