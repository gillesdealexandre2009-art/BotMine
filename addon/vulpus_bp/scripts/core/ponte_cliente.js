// @ts-check
// Cliente da ponte com o bot do Discord. O addon NÃO fala HTTP: pede ao pack "Vulpus Ponte" (vulpus_ponte_bp, só no servidor
// dedicado) por script event e recebe a resposta em pedaços. Sem esse pack (mundo no cliente, sem servidor), nada responde:
// ponteViva() fica false e quem depende da ponte (vínculo obrigatório, chat) simplesmente não age.
import { ScriptEventSource, system } from "@minecraft/server";

const ID_PEDIDO = "vulpus:ponte_req";
const ID_RESPOSTA = "vulpus:ponte_res";
/** Sem resposta do pack em tantos ticks = falha (o pack tem 10 s de limite no HTTP, então 15 s cobre tudo). */
const TICKS_LIMITE = 15 * 20;
const TICKS_SAUDE_INICIAL = 60;
const TICKS_SAUDE_REPETE = 20 * 60;

/**
 * @typedef {object} RespostaPonte
 * @property {number} status  código HTTP do bot; 0 = não chegou (sem pack, sem rede, sem configuração, tempo esgotado)
 * @property {any} corpo  JSON da resposta (undefined se não veio ou não era JSON)
 * @property {string} [erro]
 */

/** @type {Map<string, { resolve: (r: RespostaPonte) => void, pedacos: (string | undefined)[], n: number, status: number, erro?: string }>} */
const pendentes = new Map();
let contador = 0;
let viva = false;

/** O pack da ponte respondeu pelo menos uma vez? (Mesmo com erro de rede: ele existe.) */
export const ponteViva = () => viva;

/**
 * Faz uma chamada ao bot e espera a resposta. Nunca lança.
 * @param {"GET" | "POST"} metodo
 * @param {string} caminho  ex.: "/mc/sync"
 * @param {unknown} [corpo]  vira JSON
 * @returns {Promise<RespostaPonte>}
 */
export function chamar(metodo, caminho, corpo) {
  return new Promise((resolve) => {
    contador = (contador + 1) % 1_000_000;
    const rid = `${Date.now().toString(36)}${contador.toString(36)}`;
    pendentes.set(rid, { resolve, pedacos: [], n: 0, status: 0 });
    system.runTimeout(() => {
      const p = pendentes.get(rid);
      if (!p) return;
      pendentes.delete(rid);
      resolve({ status: 0, corpo: undefined, erro: "tempo" });
    }, TICKS_LIMITE);
    try {
      system.sendScriptEvent(ID_PEDIDO, JSON.stringify({ rid, m: metodo, p: caminho, b: corpo === undefined ? undefined : JSON.stringify(corpo) }));
    } catch (e) {
      pendentes.delete(rid);
      resolve({ status: 0, corpo: undefined, erro: `envio: ${e}` });
    }
  });
}

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id !== ID_RESPOSTA || ev.sourceType !== ScriptEventSource.Server) return;
  let r;
  try {
    r = JSON.parse(ev.message);
  } catch {
    return;
  }
  const p = r && typeof r.rid === "string" ? pendentes.get(r.rid) : undefined;
  if (!p) return;
  viva = true;
  if (!Number.isInteger(r.n) || !Number.isInteger(r.i) || r.n < 1 || r.i < 0 || r.i >= r.n) return;
  p.n = r.n;
  p.status = Number(r.s) || 0;
  if (typeof r.e === "string") p.erro = r.e;
  p.pedacos[r.i] = typeof r.d === "string" ? r.d : "";
  for (let i = 0; i < p.n; i++) if (p.pedacos[i] === undefined) return; // faltam pedaços
  pendentes.delete(r.rid);
  const texto = p.pedacos.join("");
  /** @type {any} */
  let corpo;
  try {
    corpo = texto ? JSON.parse(texto) : undefined;
  } catch {
    corpo = undefined;
  }
  p.resolve({ status: p.status, corpo, erro: p.erro });
});

// Descobre se o pack da ponte existe: pergunta pela saúde do bot; qualquer resposta (até de erro) já prova que ele está aí.
function saude() {
  if (viva) return;
  void chamar("GET", "/mc/saude");
  system.runTimeout(saude, TICKS_SAUDE_REPETE);
}
system.runTimeout(saude, TICKS_SAUDE_INICIAL);
