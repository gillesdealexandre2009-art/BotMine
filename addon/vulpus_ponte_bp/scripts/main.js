// @ts-check
// Pack "Vulpus Ponte": só repassa as chamadas do addon principal para o bot do Discord (HTTP). Não decide nada.
// O pack principal pede por script event ("vulpus:ponte_req") e recebe a resposta em pedaços ("vulpus:ponte_res"); assim o
// token e o endereço ficam só aqui, nos arquivos de segredo do servidor, e o addon principal continua rodando no jogo comum.
//
// Configuração no servidor (nunca no repositório): config/<uuid deste pack>/variables.json  {"ponte_url": "https://..."}
//                                                  config/<uuid deste pack>/secrets.json    {"ponte_auth": "Bearer <token>"}
// e "@minecraft/server-net" em config/default/permissions.json.
import { ScriptEventSource, system, world } from "@minecraft/server";
import { HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net";
import { secrets, variables } from "@minecraft/server-admin";

const ID_PEDIDO = "vulpus:ponte_req";
const ID_RESPOSTA = "vulpus:ponte_res";
/** Só estas rotas do bot (o pack principal nunca pede outra coisa). */
const CAMINHO_VALIDO = /^\/mc\/(saude|vinculo|sync|eventos|status|chat)(\?desde=-?\d{1,12})?$/;
const TAMANHO_PEDACO = 1200;
const TEMPO_LIMITE_SEG = 10;
const CORPO_MAXIMO = 8000;

/**
 * @param {string} rid
 * @param {number} status
 * @param {string} corpo
 * @param {string} [erro]
 */
function responder(rid, status, corpo, erro) {
  const n = Math.max(1, Math.ceil(corpo.length / TAMANHO_PEDACO));
  for (let i = 0; i < n; i++) {
    system.sendScriptEvent(ID_RESPOSTA, JSON.stringify({ rid, s: status, i, n, d: corpo.slice(i * TAMANHO_PEDACO, (i + 1) * TAMANHO_PEDACO), e: erro }));
  }
}

/** @param {string} rid @param {string} metodo @param {string} caminho @param {string | undefined} corpo */
async function pedir(rid, metodo, caminho, corpo) {
  let base;
  let auth;
  try {
    base = variables.get("ponte_url");
    auth = secrets.get("ponte_auth");
  } catch (e) {
    return responder(rid, 0, "", `sem_configuracao: ${e}`);
  }
  if (typeof base !== "string" || !base || !auth) return responder(rid, 0, "", "sem_configuracao");
  if (!CAMINHO_VALIDO.test(caminho) || (metodo !== "GET" && metodo !== "POST")) return responder(rid, 0, "", "pedido_invalido");
  if (corpo !== undefined && corpo.length > CORPO_MAXIMO) return responder(rid, 0, "", "corpo_grande");
  try {
    const req = new HttpRequest(base.replace(/\/+$/, "") + caminho);
    req.setMethod(metodo === "GET" ? HttpRequestMethod.Get : HttpRequestMethod.Post);
    req.addHeader("Authorization", auth);
    req.addHeader("Content-Type", "application/json");
    req.timeout = TEMPO_LIMITE_SEG;
    if (corpo !== undefined) req.setBody(corpo);
    const res = await http.request(req);
    responder(rid, res.status, res.body ?? "");
  } catch (e) {
    responder(rid, 0, "", `falha_http: ${e}`);
  }
}

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== ID_PEDIDO || ev.sourceType !== ScriptEventSource.Server) return;
  let p;
  try {
    p = JSON.parse(ev.message);
  } catch {
    return;
  }
  if (!p || typeof p.rid !== "string" || typeof p.p !== "string") return;
  void pedir(p.rid, String(p.m ?? "GET"), p.p, typeof p.b === "string" ? p.b : undefined);
});

// ---- chat (evento beta): repassa cada mensagem ao pack principal, que decide o que vai ao Discord.
/** Tag de quem está com a tela preta (igual a TAG_TRAVADO do pack principal): essas mensagens não saem. */
const TAG_TRAVADO = "vulpus:travado";
const AVISO_TRAVADO = "§cLigue sua conta do Discord para conversar: use o código da tela.";

world.beforeEvents.chatSend.subscribe((ev) => {
  const p = ev.sender;
  try {
    if (p.hasTag(TAG_TRAVADO)) {
      ev.cancel = true;
      system.run(() => {
        if (p.isValid) p.sendMessage(AVISO_TRAVADO);
      });
      return;
    }
    const carga = JSON.stringify({ i: p.id, t: ev.message.slice(0, 400) });
    system.run(() => system.sendScriptEvent("vulpus:ponte_chat", carga));
  } catch (e) {
    console.warn(`[Vulpus Ponte] chat: ${e}`);
  }
});
