// @ts-check
// Entrada do pack "Vulpus Chat" (API Beta): troca a linha do chat pelo formato com selo, nível e cor.
// Em qualquer falha a mensagem segue vanilla; só cancela depois de reenviar com sucesso.
import { system, world } from "@minecraft/server";
import { lerIdentidade } from "./canal.js";
import { montarLinha, sanear } from "./formato.js";

/** @typedef {import("@minecraft/server").ChatSendBeforeEvent} ChatSendBeforeEvent */
/** @typedef {import("@minecraft/server").Player} Player */

/** Igual a TAG_TRAVADO em vulpus_bp/scripts/core/ponte_estado.js. */
const TAG_TRAVADO = "vulpus:travado";
const SO_SIMBOLOS = "§7Essa mensagem só tinha símbolos especiais.";

/**
 * Escreve um erro no Content Log com o prefixo [Vulpus Chat].
 * @param {string} contexto
 * @param {unknown} e
 */
function registrarErro(contexto, e) {
  const pilha = e instanceof Error && e.stack ? `\n${e.stack}` : "";
  console.warn(`[Vulpus Chat] ${contexto}: ${e}${pilha}`);
}

/**
 * Repassa a mensagem para a ponte com o Discord (o pack principal decide o que vai ao canal). Falhar aqui nunca atrapalha o chat.
 * @param {ChatSendBeforeEvent} ev
 */
function encaminharParaPonte(ev) {
  try {
    const carga = JSON.stringify({ i: ev.sender.id, t: ev.message.slice(0, 400) });
    system.run(() => system.sendScriptEvent("vulpus:ponte_chat", carga));
  } catch (e) {
    registrarErro("Ponte do Discord", e);
  }
}

/**
 * Roda em modo restrito: só leitura de scoreboard e tag e sendMessage (o único system.run é o repasse à ponte, que não mexe no chat).
 * @param {ChatSendBeforeEvent} ev
 */
function aoFalar(ev) {
  if (ev.cancel) return;
  try {
    // tela preta do vínculo com o Discord (tag do pack principal): quem não ligou a conta não fala
    if (ev.sender.hasTag(TAG_TRAVADO)) {
      ev.cancel = true;
      return;
    }
    encaminharParaPonte(ev);
    const identidade = lerIdentidade(ev.sender);
    if (!identidade) return;
    const mensagem = sanear(ev.message);
    if (mensagem === "") {
      // Cancela antes do aviso: se o aviso falhar, o selo falso não vaza para o chat.
      ev.cancel = true;
      ev.sender.sendMessage(SO_SIMBOLOS);
      return;
    }
    const linha = montarLinha(ev.sender.name, identidade, mensagem);
    if (!ev.targets) {
      world.sendMessage(linha);
      ev.cancel = true;
      return;
    }
    // Com alvos, quem já recebeu a linha nova não recebe a vanilla de novo: se falhar no meio,
    // a vanilla segue só para quem ficou sem.
    /** @type {Player[]} */
    const faltam = [];
    let erroEnvio;
    for (const alvo of ev.targets) {
      if (!alvo.isValid) continue;
      try {
        alvo.sendMessage(linha);
      } catch (e) {
        faltam.push(alvo);
        erroEnvio = e;
      }
    }
    if (faltam.length) {
      ev.targets = faltam;
      registrarErro("Mensagem de chat", erroEnvio);
    } else ev.cancel = true;
  } catch (e) {
    registrarErro("Mensagem de chat", e);
  }
}

world.beforeEvents.chatSend.subscribe(aoFalar);
