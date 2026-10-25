// @ts-check
// Resgate de código de Caudas (botão da Miscelânea): o código vai ao bot do Discord pela ponte (/mc/codigo), que confere tudo
// (vínculo, validade, dono, uso único) e credita no saldo do Discord. O jogo NÃO soma nada por conta própria: pede uma soma
// imediata e o saldo novo chega pelo sync normal (somar em dobro seria bug). Sem a ponte, nada acontece.
import { Player, system } from "@minecraft/server";
import { perguntar } from "../core/forms.js";
import { chamar, ponteViva } from "../core/ponte_cliente.js";
import { erro, formatarNumero, msg, ok, registrarErro } from "../core/util.js";
import * as textos from "../textos/codigo.js";
import { somarAgora } from "./vinculo.js";

const ESPERA_TICKS = 3 * 20;
const MAX_ERROS = 5;
const JANELA_MS = 10 * 60 * 1000;

/** @type {Map<string, number>} tick da próxima tentativa liberada */
const proxima = new Map();
/** @type {Map<string, number[]>} horários (ms) dos erros recentes */
const errosPorJogador = new Map();

/** @param {string} id */
function errosRecentes(id) {
  const agora = Date.now();
  const lista = (errosPorJogador.get(id) ?? []).filter((t) => agora - t < JANELA_MS);
  errosPorJogador.set(id, lista);
  return lista.length;
}

/** @param {Player} player */
export async function resgatarCodigo(player) {
  if (!ponteViva()) return erro(player, textos.SEM_PONTE.replace(/^§c/, ""));
  const r = await perguntar(player, textos.TITULO, [{ tipo: "texto", rotulo: textos.ROTULO, dica: textos.DICA }]);
  if (!r || typeof r[0] !== "string") return;
  const codigo = r[0].trim().slice(0, 40);
  if (!codigo) return msg(player, textos.VAZIO);
  if (system.currentTick < (proxima.get(player.id) ?? 0)) return msg(player, textos.ESPERA);
  if (errosRecentes(player.id) >= MAX_ERROS) return msg(player, textos.MUITOS_ERROS);
  proxima.set(player.id, system.currentTick + ESPERA_TICKS);
  const resp = await chamar("POST", "/mc/codigo", { id: player.id, nome: player.name, codigo });
  if (!player.isValid) return;
  if (resp.status === 0 || !resp.corpo || typeof resp.corpo !== "object") return msg(player, textos.FALHA);
  if (resp.corpo.ok === true && Number.isFinite(resp.corpo.caudas)) {
    ok(player, textos.SUCESSO(formatarNumero(Math.floor(resp.corpo.caudas))));
    somarAgora(player.id);
    return;
  }
  if (resp.corpo.status === "nao_existe") (errosPorJogador.get(player.id) ?? errosPorJogador.set(player.id, []).get(player.id))?.push(Date.now());
  const texto = typeof resp.corpo.mensagem === "string" && resp.corpo.mensagem ? resp.corpo.mensagem : textos.FALHA.replace(/^§c/, "");
  erro(player, texto.slice(0, 200));
}

/** @param {Player} player */
export function resgatarCodigoSeguro(player) {
  return resgatarCodigo(player).catch((e) => registrarErro("Resgatar código", e));
}
