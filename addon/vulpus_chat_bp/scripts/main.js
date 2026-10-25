// @ts-check
// Entrada do pack "Vulpus Chat" (API Beta): troca a linha do chat pelo formato com selo, nível e cor.
// Em qualquer falha a mensagem segue vanilla; só cancela depois de reenviar com sucesso.
import { system, world } from "@minecraft/server";
import { lerIdentidade, lerModo, lerRaioLocal, lerTagCla, temCargo } from "./canal.js";
import { montarLinha, sanear } from "./formato.js";

/** @typedef {import("@minecraft/server").ChatSendBeforeEvent} ChatSendBeforeEvent */
/** @typedef {import("@minecraft/server").Player} Player */

/** Igual a TAG_TRAVADO em vulpus_bp/scripts/core/ponte_estado.js. */
const TAG_TRAVADO = "vulpus:travado";
const SO_SIMBOLOS = "§7Essa mensagem só tinha símbolos especiais.";
const SEM_TEXTO = "§7Escreva a mensagem depois do # (só o time) ou do ! (todos).";
const SEM_TIME = "§cVocê não tem um clã: o # e o modo Time precisam de um.";
const NINGUEM_PERTO = "§7Ninguém por perto leu. Use §f!mensagem§7 para falar com todos.";
const NINGUEM_TIME = "§7Ninguém do seu time está online.";
/** Marcas das linhas fora do chat global (o texto da mensagem nunca leva código de cor). */
const MARCA_LOCAL = "§8[§bLocal§8] ";
const MARCA_LONGE = "§8[§7Local · longe§8] ";
const MARCA_TIME = "§8[§6Time§8] ";
/** Identidade neutra para falar em local/time quando o canal do pack principal não existe (nunca vaza para todos). */
const IDENTIDADE_NEUTRA = Object.freeze({ nivel: 0, rank: 0, cargo: 0, kitsune: false, cla: null, apelido: "", tema: "", msgCor: "" });

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
 * @param {string} texto  a mensagem sem o prefixo ! (só o chat global vai ao Discord)
 */
function encaminharParaPonte(ev, texto) {
  try {
    const carga = JSON.stringify({ i: ev.sender.id, t: texto.slice(0, 400) });
    system.run(() => system.sendScriptEvent("vulpus:ponte_chat", carga));
  } catch (e) {
    registrarErro("Ponte do Discord", e);
  }
}

/**
 * Para quem vai a mensagem: "#texto" é só do time; no modo local ou time, "!texto" fala com todos uma vez.
 * @param {Player} remetente
 * @param {string} mensagem
 * @returns {{ destino: "global" | "local" | "time", texto: string, prefixado: boolean }}
 */
function escolherDestino(remetente, mensagem) {
  const modo = lerModo(remetente);
  if (mensagem.startsWith("#")) return { destino: "time", texto: mensagem.slice(1).trim(), prefixado: true };
  if (modo !== "global" && mensagem.startsWith("!")) return { destino: "global", texto: mensagem.slice(1).trim(), prefixado: true };
  if (modo === "local" && lerRaioLocal() <= 0) return { destino: "global", texto: mensagem, prefixado: false }; // staff desligou o chat local
  return { destino: modo, texto: mensagem, prefixado: false };
}

/** @param {Player} alvo @param {string} linha */
function enviar(alvo, linha) {
  try {
    if (alvo.isValid) alvo.sendMessage(linha);
  } catch (e) {
    registrarErro("Mensagem de chat (envio)", e);
  }
}

/**
 * Chat local (quem está até o raio, na mesma dimensão; quem tem cargo lê tudo, marcado quando está longe) ou do time
 * (só o mesmo clã). Não vai ao Discord. Qualquer falha aqui cancela a mensagem: nunca vaza para todos.
 * @param {Player} remetente
 * @param {"local" | "time"} destino
 * @param {Player[]} alvos
 * @param {import("./canal.js").Identidade | undefined} identidade
 * @param {string} texto  já saneado
 */
function entregarPrivado(remetente, destino, alvos, identidade, texto) {
  const id = identidade ?? IDENTIDADE_NEUTRA;
  const marca = destino === "time" ? MARCA_TIME : MARCA_LOCAL;
  const linha = montarLinha(remetente.name, id, texto, marca);
  enviar(remetente, linha);
  let ouviram = 0;
  if (destino === "time") {
    const meu = lerTagCla(remetente);
    for (const alvo of alvos) {
      if (alvo.id === remetente.id || !alvo.isValid || lerTagCla(alvo) !== meu) continue;
      enviar(alvo, linha);
      ouviram++;
    }
    if (!ouviram) enviar(remetente, NINGUEM_TIME);
    return;
  }
  const raio = lerRaioLocal();
  const dimensao = remetente.dimension.id;
  const origem = remetente.location;
  let linhaLonge = "";
  for (const alvo of alvos) {
    if (alvo.id === remetente.id || !alvo.isValid) continue;
    const p = alvo.location;
    const perto = alvo.dimension.id === dimensao && Math.hypot(p.x - origem.x, p.y - origem.y, p.z - origem.z) <= raio;
    if (perto) {
      enviar(alvo, linha);
      ouviram++;
    } else if (temCargo(alvo)) {
      linhaLonge ||= montarLinha(remetente.name, id, texto, MARCA_LONGE);
      enviar(alvo, linhaLonge);
    }
  }
  if (!ouviram) enviar(remetente, NINGUEM_PERTO);
}

/**
 * Roda em modo restrito: só leitura de scoreboard e tag e sendMessage (o único system.run é o repasse à ponte, que não mexe no chat).
 * @param {ChatSendBeforeEvent} ev
 */
function aoFalar(ev) {
  if (ev.cancel) return;
  let privado = false;
  try {
    // tela preta do vínculo com o Discord (tag do pack principal): quem não ligou a conta não fala
    if (ev.sender.hasTag(TAG_TRAVADO)) {
      ev.cancel = true;
      return;
    }
    const { destino, texto, prefixado } = escolherDestino(ev.sender, ev.message);
    privado = destino !== "global";
    if (destino === "time" && !lerTagCla(ev.sender)) {
      ev.cancel = true;
      ev.sender.sendMessage(SEM_TIME);
      return;
    }
    if (prefixado && texto === "") {
      ev.cancel = true;
      ev.sender.sendMessage(SEM_TEXTO);
      return;
    }
    if (!privado) encaminharParaPonte(ev, texto);
    const identidade = lerIdentidade(ev.sender);
    if (!identidade && !privado) return;
    const mensagem = sanear(texto);
    if (mensagem === "") {
      // Cancela antes do aviso: se o aviso falhar, o selo falso não vaza para o chat.
      ev.cancel = true;
      ev.sender.sendMessage(SO_SIMBOLOS);
      return;
    }
    if (destino !== "global") {
      ev.cancel = true; // antes de entregar: se algo falhar no meio, a mensagem não segue para todos
      entregarPrivado(ev.sender, destino, ev.targets ?? world.getAllPlayers(), identidade, mensagem);
      return;
    }
    const linha = montarLinha(ev.sender.name, /** @type {import("./canal.js").Identidade} */ (identidade), mensagem);
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
    if (privado) ev.cancel = true;
  }
}

world.beforeEvents.chatSend.subscribe(aoFalar);
