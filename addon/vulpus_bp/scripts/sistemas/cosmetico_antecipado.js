// @ts-check
// Acesso antecipado a cosmético novo: o dono marca um tema de nome como "antecipado até uma data". Até lá só Kitsune (e o dono)
// usa; depois dela todo mundo pode, com ou sem selo. A marca fica no mundo; tirar a marca devolve o tema à regra normal
// (só Kitsune). Só vale para tema comum ou animado: o de evento continua só de quem o desbloqueou. Sem imports do kitsune.js
// (é o kitsune.js que consulta este arquivo).
import { ICONES } from "../config.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { erro, ok } from "../core/util.js";
import { TEMAS_COR, temasDoGrupo, temaValido } from "../cores.js";
import * as textos from "../textos/antecipado.js";

/** @typedef {{ ate: number, por: string, em: number }} Marca */
/** @typedef {() => any} Volta */

const CHAVE = "vulpus:cosm_antecipado";
export const DIAS_MAX = 90;
const DIA_MS = 24 * 60 * 60 * 1000;

/** @type {Record<string, Marca> | undefined} */
let cache;

/** Marcas lidas do mundo (entrada quebrada ou de tema que não existe mais fica de fora). @returns {Record<string, Marca>} */
function marcas() {
  if (cache) return cache;
  const bruto = lerMundo(CHAVE, {});
  /** @type {Record<string, Marca>} */
  const lista = {};
  if (bruto && typeof bruto === "object") {
    for (const [id, m] of Object.entries(bruto)) {
      const x = /** @type {any} */ (m);
      if (!temaValido(id) || TEMAS_COR[id].grupo === "evento" || !x || typeof x !== "object" || !Number.isFinite(x.ate)) continue;
      lista[id] = { ate: x.ate, por: typeof x.por === "string" ? x.por.slice(0, 32) : "?", em: Number.isFinite(x.em) ? x.em : 0 };
    }
  }
  cache = lista;
  return lista;
}

function gravar() {
  salvarMundo(CHAVE, marcas());
}

/** Esquece o cache (testes e recarga dos dados do mundo). */
export function recarregarAntecipados() {
  cache = undefined;
}

/**
 * Quando o acesso antecipado do tema termina (ms), ou 0 se o tema não está marcado.
 * @param {string} id
 */
export const marcaDe = (id) => (Object.prototype.hasOwnProperty.call(marcas(), id) ? marcas()[id].ate : 0);

/**
 * O tema está marcado e a data ainda não chegou (só Kitsune usa).
 * @param {string} id
 * @param {number} [agora]
 */
export function emAcessoAntecipado(id, agora = Date.now()) {
  const ate = marcaDe(id);
  return ate > 0 && agora < ate;
}

/**
 * O tema foi marcado e a data já passou: qualquer pessoa usa.
 * @param {string} id
 * @param {number} [agora]
 */
export function liberadoParaTodos(id, agora = Date.now()) {
  const ate = marcaDe(id);
  return ate > 0 && agora >= ate;
}

/** Algum tema já está livre para todos por ter passado da data? (abre o menu de cor do nome para quem não tem selo). */
export const haTemaLiberado = () => Object.keys(marcas()).some((id) => liberadoParaTodos(id));

/**
 * As marcas, da que termina mais tarde para a que terminou antes.
 * @returns {{ id: string, nome: string, ate: number, livre: boolean }[]}
 */
export function listarAntecipados() {
  return Object.entries(marcas())
    .map(([id, m]) => ({ id, nome: TEMAS_COR[id].nome, ate: m.ate, livre: Date.now() >= m.ate }))
    .sort((a, b) => b.ate - a.ate);
}

/**
 * Marca um tema como antecipado por alguns dias (só dono). Marcar de novo muda a data.
 * @param {import("@minecraft/server").Player} dono
 * @param {string} id
 * @param {number} dias
 * @returns {boolean}
 */
export function marcarAntecipado(dono, id, dias) {
  if (!ehDono(dono)) {
    registrarLogDono(dono.name, "cosmético antecipado", id, false, "recusado: não é dono");
    erro(dono, textos.SO_DONO);
    return false;
  }
  if (!temaValido(id) || TEMAS_COR[id].grupo === "evento") {
    erro(dono, textos.TEMA_INVALIDO);
    return false;
  }
  const n = Math.floor(dias);
  if (!Number.isFinite(n) || n < 1 || n > DIAS_MAX) {
    erro(dono, textos.DIAS_INVALIDOS);
    return false;
  }
  const ate = Date.now() + n * DIA_MS;
  marcas()[id] = { ate, por: dono.name, em: Date.now() };
  gravar();
  registrarLogDono(dono.name, "cosmético antecipado", TEMAS_COR[id].nome, true, `${n} dia(s)`);
  ok(dono, textos.MARCADO(TEMAS_COR[id].nome, n, ate));
  return true;
}

/**
 * Tira a marca (só dono): o tema volta à regra normal.
 * @param {import("@minecraft/server").Player} dono
 * @param {string} id
 * @returns {boolean}
 */
export function cancelarAntecipado(dono, id) {
  if (!ehDono(dono)) {
    registrarLogDono(dono.name, "cancelar antecipado", id, false, "recusado: não é dono");
    erro(dono, textos.SO_DONO);
    return false;
  }
  if (!marcaDe(id)) {
    erro(dono, textos.NAO_MARCADO);
    return false;
  }
  delete marcas()[id];
  gravar();
  registrarLogDono(dono.name, "cancelar antecipado", TEMAS_COR[id].nome, true);
  ok(dono, textos.CANCELADO(TEMAS_COR[id].nome));
  return true;
}

/**
 * Painel do dono: marcar um tema, ver as marcas e cancelar.
 * @param {import("@minecraft/server").Player} player
 * @param {Volta} [voltar]
 */
export async function menuAntecipado(player, voltar) {
  if (!ehDono(player)) {
    erro(player, textos.SO_DONO);
    return;
  }
  const aqui = () => menuAntecipado(player, voltar);
  const itens = listarAntecipados();
  const linhas = itens.map((i) => (i.livre ? textos.LINHA_LIVRE(i.nome, i.ate) : textos.LINHA_ANTECIPADO(i.nome, i.ate)));
  const lista = new Lista(textos.TITULO_PAINEL).texto(textos.CORPO_PAINEL(linhas));
  lista.botao(textos.BOTAO_MARCAR, ICONES.nova, async (p) => {
    if (!ehDono(p)) return;
    const elegiveis = [...temasDoGrupo("comum"), ...temasDoGrupo("animado")];
    const r = await perguntar(p, textos.TITULO_MARCAR, [
      { tipo: "lista", rotulo: textos.ROTULO_TEMA, opcoes: elegiveis.map(([, t]) => t.nome), padrao: 0 },
      { tipo: "numero", rotulo: textos.ROTULO_DIAS, padrao: 7, min: 1, max: DIAS_MAX },
    ]);
    if (r && elegiveis[r[0]]) marcarAntecipado(p, elegiveis[r[0]][0], r[1]);
    await aqui();
  });
  for (const item of itens) {
    lista.botao(textos.BOTAO_ITEM(item.nome, item.livre), ICONES.nao, async (p) => {
      if (!ehDono(p)) return;
      if (await confirmar(p, { titulo: textos.BOTAO_PAINEL, texto: textos.CONFIRMAR_CANCELAR(item.nome, item.livre) })) cancelarAntecipado(p, item.id);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}
