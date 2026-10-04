// @ts-check
// Estado do Capture the Flag de uma guerra (o campo `ctf` da guerra, salvo junto em vulpus:cla:guerras).
// Só dados: quem lê e grava é cla_guerra.js; quem mexe durante a guerra é ctf.js. Ao carregar do mundo
// (reload ou reinício), bandeira roubada ou caída volta ao pedestal; a recarga depois de uma captura e o
// placar de capturas continuam valendo.
import { claPorId, problemaBandeira } from "./cla_dados.js";

/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */

/**
 * Uma bandeira na guerra.
 * @typedef {object} EstadoBandeira
 * @property {Ponto} pos  pedestal (copiado do clã quando a guerra começou: não muda no meio dela)
 * @property {"casa" | "roubada" | "caida"} estado
 * @property {string} por  id de quem leva (roubada)
 * @property {string} porNome  nome de quem leva (roubada) ou de quem levava (caída)
 * @property {Ponto | null} chao  onde está caída
 * @property {number} desde  ms da última mudança de estado
 * @property {number} recarga  ms até quando não pode ser pega (2 min depois de capturada)
 */

/**
 * a/b = a bandeira de cada lado (a = quem declarou); capturas = quantas vezes cada lado capturou.
 * @typedef {{ a: EstadoBandeira, b: EstadoBandeira, capturas: { a: number, b: number } }} Ctf
 */

/** @param {unknown} v */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** @param {any} v @returns {v is Ponto} */
const ehPonto = (v) => !!v && typeof v === "object" && typeof v.d === "string" && [v.x, v.y, v.z].every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Bandeira em casa no pedestal.
 * @param {Ponto} pos
 * @param {number} [recarga]
 * @returns {EstadoBandeira}
 */
function emCasa(pos, recarga = 0) {
  return { pos: { x: pos.x, y: pos.y, z: pos.z, d: pos.d }, estado: "casa", por: "", porNome: "", chao: null, desde: Date.now(), recarga };
}

/**
 * Estado lido do mundo, sem o que estiver quebrado; null = guerra sem CTF. Tudo volta para casa.
 * @param {any} v
 * @returns {Ctf | null}
 */
export function lerCtf(v) {
  if (!v || typeof v !== "object" || !ehPonto(v.a?.pos) || !ehPonto(v.b?.pos)) return null;
  return {
    a: emCasa(v.a.pos, num(v.a.recarga)),
    b: emCasa(v.b.pos, num(v.b.recarga)),
    capturas: { a: Math.max(0, Math.floor(num(v.capturas?.a))), b: Math.max(0, Math.floor(num(v.capturas?.b))) },
  };
}

/**
 * CTF de uma guerra que começa agora: só se os dois clãs têm bandeira válida (senão null: só abates contam).
 * @param {string} idA
 * @param {string} idB
 * @returns {Ctf | null}
 */
export function prepararCtf(idA, idB) {
  const a = claPorId(idA);
  const b = claPorId(idB);
  if (!a?.bandeira || !b?.bandeira || problemaBandeira(a) || problemaBandeira(b)) return null;
  return { a: emCasa(a.bandeira), b: emCasa(b.bandeira), capturas: { a: 0, b: 0 } };
}
