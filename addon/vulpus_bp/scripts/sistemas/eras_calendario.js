// @ts-check
// Calendário das Eras: 20 semanas seguidas (140 dias) contadas a partir de uma data inicial gravada no mundo. A Era vem sempre
// de `Date.now()` contra essa data (nunca de ticks), então reiniciar o servidor, ficar offline ou todo mundo sair não muda nada:
// ao voltar, a Era certa é a que o relógio diz, sem repetir as trocas que passaram. O fuso das datas é o de Brasília (UTC-3, sem
// horário de verão). Depois da Era 20 a temporada fica "encerrada" até o dono decidir; nunca recomeça sozinha.
import { lerMundo, salvarMundo } from "../core/db.js";
import { eraDe, TOTAL_ERAS } from "./eras_catalogo.js";

/** @typedef {import("./eras_catalogo.js").Perfil} Perfil */
/**
 * inicio: ms em que a Era 1 começa (0 = ainda não existe temporada). temporada: contador (começa em 1, só sobe quando o dono
 * inicia uma nova depois do fim). mecanicas: liga/desliga os buffs e debuffs (o visual não depende disso). ultima: a última Era
 * que o servidor já anunciou (0 = nenhuma, 1 a 20 = Era, 21 = temporada encerrada; para anunciar uma troca só uma vez, mesmo depois de dias fora). historico: últimas trocas e
 * decisões, da mais nova para a mais velha.
 * @typedef {{ v: 1, inicio: number, temporada: number, mecanicas: boolean, ultima: number, historico: { t: number, era: number, motivo: string }[] }} EstadoEras
 */
/**
 * @typedef {object} Situacao
 * @property {"nao_iniciada" | "aguardando" | "ativa" | "encerrada"} fase
 * @property {number} numero  Era oficial agora (1 a 20); 0 se não iniciada ou aguardando; 20 se encerrada
 * @property {Perfil | undefined} era
 * @property {Perfil | undefined} proxima  Era da semana que vem (undefined na 20 ou fora da temporada)
 * @property {number} inicioEra  ms em que a Era atual começou (0 se não há)
 * @property {number} fimEra  ms em que a Era atual termina (0 se não há)
 * @property {number} fimTemporada  ms do fim da Era 20 (0 se não há temporada)
 * @property {number} restanteMs  tempo até a próxima troca (ou até o início, ou até o fim da temporada)
 */

export const CHAVE_ERAS = "vulpus:eras";
export const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
export const TEMPORADA_MS = TOTAL_ERAS * SEMANA_MS;
const FUSO_MS = -3 * 60 * 60 * 1000;
const HISTORICO_MAX = 30;

/** @returns {EstadoEras} */
const padrao = () => ({ v: 1, inicio: 0, temporada: 1, mecanicas: true, ultima: 0, historico: [] });

/** @type {EstadoEras | undefined} */
let cache;

/**
 * Lê o estado gravado (com cache) e conserta o que estiver fora do formato.
 * @returns {EstadoEras}
 */
export function lerEstado() {
  if (cache) return cache;
  const bruto = lerMundo(CHAVE_ERAS);
  const e = padrao();
  if (bruto && typeof bruto === "object") {
    if (Number.isFinite(bruto.inicio) && bruto.inicio >= 0) e.inicio = Math.floor(bruto.inicio);
    if (Number.isInteger(bruto.temporada) && bruto.temporada >= 1) e.temporada = bruto.temporada;
    if (typeof bruto.mecanicas === "boolean") e.mecanicas = bruto.mecanicas;
    if (Number.isInteger(bruto.ultima) && bruto.ultima >= 0 && bruto.ultima <= TOTAL_ERAS + 1) e.ultima = bruto.ultima;
    if (Array.isArray(bruto.historico)) {
      e.historico = bruto.historico
        .filter((h) => h && Number.isFinite(h.t) && Number.isInteger(h.era) && typeof h.motivo === "string")
        .slice(0, HISTORICO_MAX)
        .map((h) => ({ t: h.t, era: h.era, motivo: h.motivo.slice(0, 60) }));
    }
  }
  cache = e;
  return e;
}

/**
 * Altera e grava o estado.
 * @param {(e: EstadoEras) => void} fn
 * @returns {boolean} se gravou
 */
function editar(fn) {
  const e = lerEstado();
  const copia = { ...e, historico: [...e.historico] };
  fn(copia);
  if (!salvarMundo(CHAVE_ERAS, copia)) return false;
  cache = copia;
  return true;
}

/** Esquece o cache (para testes e depois de mexer na propriedade por fora). */
export function recarregarEstado() {
  cache = undefined;
}

/**
 * Onde a temporada está agora.
 * @param {number} [agora]
 * @param {EstadoEras} [estado]
 * @returns {Situacao}
 */
export function situacao(agora = Date.now(), estado = lerEstado()) {
  const vazio = { numero: 0, era: undefined, proxima: undefined, inicioEra: 0, fimEra: 0 };
  if (estado.inicio <= 0) return { fase: "nao_iniciada", ...vazio, fimTemporada: 0, restanteMs: 0 };
  const fimTemporada = estado.inicio + TEMPORADA_MS;
  if (agora < estado.inicio) return { fase: "aguardando", ...vazio, fimTemporada, restanteMs: estado.inicio - agora };
  if (agora >= fimTemporada) {
    const inicioEra = estado.inicio + (TOTAL_ERAS - 1) * SEMANA_MS;
    return { fase: "encerrada", numero: TOTAL_ERAS, era: eraDe(TOTAL_ERAS), proxima: undefined, inicioEra, fimEra: fimTemporada, fimTemporada, restanteMs: 0 };
  }
  const numero = Math.floor((agora - estado.inicio) / SEMANA_MS) + 1;
  const inicioEra = estado.inicio + (numero - 1) * SEMANA_MS;
  const fimEra = inicioEra + SEMANA_MS;
  return { fase: "ativa", numero, era: eraDe(numero), proxima: numero < TOTAL_ERAS ? eraDe(numero + 1) : undefined, inicioEra, fimEra, fimTemporada, restanteMs: fimEra - agora };
}

/** As mecânicas valem agora? (temporada em andamento e o dono não desligou). @param {Situacao} s @param {EstadoEras} [estado] */
export function mecanicasValem(s, estado = lerEstado()) {
  return estado.mecanicas && s.fase === "ativa";
}

// ------------------------------------------------------------------ decisões administrativas (a permissão é conferida por quem chama)

/**
 * @param {string} motivo
 * @param {number} era
 * @param {number} [agora]
 */
function anotar(motivo, era, agora = Date.now()) {
  return (/** @type {EstadoEras} */ e) => {
    e.historico.unshift({ t: agora, era, motivo });
    e.historico.length = Math.min(e.historico.length, HISTORICO_MAX);
  };
}

/**
 * Começa (ou reagenda) a temporada: a Era 1 vale a partir de `inicio`. Se já havia uma temporada encerrada, esta é a seguinte.
 * @param {number} inicio  ms
 * @param {number} [agora]
 * @returns {boolean}
 */
export function iniciarTemporada(inicio, agora = Date.now()) {
  const antes = situacao(agora);
  return editar((e) => {
    if (antes.fase === "encerrada") e.temporada += 1;
    e.inicio = Math.floor(inicio);
    e.ultima = 0;
    anotar(`temporada ${e.temporada} marcada`, 1, agora)(e);
  });
}

/**
 * Força a Era oficial: ajusta a data inicial para que a Era `numero` comece agora (as semanas seguintes seguem a partir dela).
 * @param {number} numero  1 a 20
 * @param {number} [agora]
 * @returns {boolean}
 */
export function irParaEra(numero, agora = Date.now()) {
  if (!Number.isInteger(numero) || numero < 1 || numero > TOTAL_ERAS) return false;
  return editar((e) => {
    e.inicio = agora - (numero - 1) * SEMANA_MS;
    anotar("Era forçada pelo dono", numero, agora)(e);
  });
}

/**
 * Encerra a temporada à mão: apaga a data inicial (nada de Era até o dono iniciar outra).
 * @param {number} [agora]
 */
export function encerrarTemporada(agora = Date.now()) {
  return editar((e) => {
    const era = situacao(agora, e).numero;
    e.inicio = 0;
    e.ultima = 0;
    anotar("temporada encerrada pelo dono", era, agora)(e);
  });
}

/** @param {boolean} ligadas */
export function definirMecanicas(ligadas) {
  return editar((e) => {
    e.mecanicas = ligadas;
    anotar(ligadas ? "mecânicas ligadas" : "mecânicas desligadas", e.ultima)(e);
  });
}

/**
 * Anota que a Era `numero` já foi anunciada (para não repetir o anúncio).
 * @param {number} numero
 * @param {string} motivo
 * @param {number} [agora]
 */
export function marcarAnunciada(numero, motivo, agora = Date.now()) {
  return editar((e) => {
    e.ultima = numero;
    anotar(motivo, numero, agora)(e);
  });
}

// ------------------------------------------------------------------ datas de Brasília

const doisDigitos = (/** @type {number} */ n) => String(n).padStart(2, "0");

/**
 * "agora", "AAAA-MM-DD", "AAAA-MM-DD HH:MM" ou "DD/MM/AAAA HH:MM" (hora de Brasília) → ms. Data que não existe ou texto fora
 * dos formatos devolve undefined. Sem hora, vale meia-noite.
 * @param {string} texto
 * @param {number} [agora]
 * @returns {number | undefined}
 */
export function lerDataBrasilia(texto, agora = Date.now()) {
  const t = String(texto ?? "").trim().toLowerCase();
  if (t === "agora") return agora;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ t](\d{1,2}):(\d{2}))?$/.exec(t);
  /** @type {number[]} */
  let n;
  if (m) n = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0)];
  else {
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ](\d{1,2}):(\d{2}))?$/.exec(t);
    if (!m) return undefined;
    n = [Number(m[3]), Number(m[2]), Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0)];
  }
  const [ano, mes, dia, hora, minuto] = n;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59 || ano < 2020 || ano > 2100) return undefined;
  const ms = Date.UTC(ano, mes - 1, dia, hora, minuto) - FUSO_MS;
  const volta = new Date(ms + FUSO_MS);
  if (volta.getUTCMonth() !== mes - 1 || volta.getUTCDate() !== dia) return undefined; // 31/02 e afins
  return ms;
}

/** "18/10/2026 14:30" (Brasília). @param {number} ms */
export function formatarDataHora(ms) {
  const d = new Date(ms + FUSO_MS);
  return `${doisDigitos(d.getUTCDate())}/${doisDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${doisDigitos(d.getUTCHours())}:${doisDigitos(d.getUTCMinutes())}`;
}

/** "3 d 4 h", "5 h 10 min", "12 min". @param {number} ms */
export function duracaoCurta(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}
