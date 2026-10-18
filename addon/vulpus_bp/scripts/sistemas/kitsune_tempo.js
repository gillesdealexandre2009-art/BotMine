// @ts-check
// Selo Kitsune com prazo. Só um dono dá (pelo Painel de Dono): vale por N dias, soma ao prazo que a pessoa já tem, aparece no
// menu /apelido e no chat ao entrar, e some sozinho quando acaba (se a pessoa já tinha o selo do Discord, ele fica). O selo é
// a tag vulpus:kitsune; o que muda aqui é só o prazo, guardado no mundo. O prazo também vem de compras por PIX no Discord (o bot manda
// o fim do prazo no sync e o jogo aplica com concederPorCompra).
import { Player, system, world } from "@minecraft/server";
import { TAG_KITSUNE } from "../config.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { online, porId } from "../core/jogadores.js";
import { erro, formatarData, msg, ok, registrarErro } from "../core/util.js";
import * as textos from "../textos/kitsune_tempo.js";
import { acharPessoa } from "./dono_acoes.js";
import { atualizarIdentidade } from "./identidade.js";

/** @typedef {{ nome: string, ate: number, base: boolean }} Concessao */

const CHAVE = "vulpus:kitsune_tempo";
/** Propriedade da pessoa com o fim do prazo (o menu /apelido lê dela). */
export const PROP_ATE = "vulpus:kitsune_ate";
const DIA_MS = 24 * 60 * 60 * 1000;
const PASSO_CONFERIR = 1200;
const DIAS_MAX = 365;

/** @type {Record<string, Concessao> | undefined} */
let dados;

/** @returns {Record<string, Concessao>} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  /** @type {Record<string, Concessao>} */
  const lista = {};
  const bruto = s.concessoes && typeof s.concessoes === "object" ? s.concessoes : {};
  for (const [id, c] of Object.entries(bruto)) {
    const x = /** @type {any} */ (c);
    if (x && typeof x === "object" && Number.isFinite(x.ate)) lista[id] = { nome: String(x.nome ?? "?").slice(0, 32), ate: x.ate, base: x.base === true };
  }
  dados = lista;
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, { concessoes: lerDados() });
}

/** @param {Player} player */
const temTag = (player) => {
  try {
    return player.hasTag(TAG_KITSUNE);
  } catch {
    return false;
  }
};

/**
 * Quando acaba o selo com prazo da pessoa (ms), ou undefined.
 * @param {string} id
 */
export function expiracaoDe(id) {
  const c = lerDados()[id];
  return c && c.ate > Date.now() ? c.ate : undefined;
}

/** Quem tem selo com prazo agora (para o painel). */
export function listar() {
  const agora = Date.now();
  return Object.values(lerDados())
    .filter((c) => c.ate > agora)
    .map((c) => ({ nome: c.nome, ate: c.ate }))
    .sort((a, b) => a.ate - b.ate);
}

/**
 * Põe ou tira a tag e a propriedade de quem está online, conforme o prazo.
 * @param {Player} player
 * @param {boolean} avisar  avisa quando acabou (na entrada ou na checagem)
 */
export function conferir(player, avisar = true) {
  try {
    const c = lerDados()[player.id];
    if (!c) {
      if (player.getDynamicProperty(PROP_ATE) !== undefined) player.setDynamicProperty(PROP_ATE, undefined);
      return;
    }
    const agora = Date.now();
    if (c.ate > agora) {
      let mudou = false;
      if (!temTag(player)) {
        player.addTag(TAG_KITSUNE);
        mudou = true;
      }
      if (player.getDynamicProperty(PROP_ATE) !== c.ate) player.setDynamicProperty(PROP_ATE, c.ate);
      if (mudou) atualizarIdentidade(player);
      return;
    }
    // acabou
    delete lerDados()[player.id];
    gravar();
    player.setDynamicProperty(PROP_ATE, undefined);
    if (!c.base && temTag(player)) player.removeTag(TAG_KITSUNE);
    atualizarIdentidade(player);
    if (avisar) msg(player, textos.AVISO_EXPIROU);
  } catch (e) {
    registrarErro("Kitsune com prazo: conferir", e);
  }
}

/**
 * Um dono dá (ou prorroga) o selo Kitsune por alguns dias.
 * @param {Player} autor
 * @param {unknown} alvo  nome da conta ou Player
 * @param {unknown} diasBruto
 * @returns {boolean}
 */
export function darKitsuneTempo(autor, alvo, diasBruto) {
  const nomeAutor = typeof autor?.name === "string" ? autor.name : "?";
  const rotulo = `${typeof alvo === "string" ? alvo : /** @type {any} */ (alvo)?.name ?? "?"} +${String(diasBruto)}d`;
  if (!(autor instanceof Player) || !ehDono(autor)) {
    registrarLogDono(nomeAutor, "kitsune com prazo", rotulo, false, "recusado: não é dono");
    if (autor instanceof Player) erro(autor, textos.SO_DONO);
    return false;
  }
  const pessoa = acharPessoa(/** @type {any} */ (alvo));
  if (!pessoa) {
    erro(autor, textos.NAO_ACHADA(String(alvo)));
    registrarLogDono(nomeAutor, "kitsune com prazo", rotulo, false, "pessoa não achada");
    return false;
  }
  const dias = Math.floor(Number(diasBruto));
  if (!(dias >= 1 && dias <= DIAS_MAX)) {
    erro(autor, textos.DIAS_INVALIDOS);
    return false;
  }
  const lista = lerDados();
  const atual = lista[pessoa.id];
  const alvoOnline = porId(pessoa.id);
  if (!atual && alvoOnline && temTag(alvoOnline)) {
    erro(autor, textos.JA_PERMANENTE(pessoa.nome));
    registrarLogDono(nomeAutor, "kitsune com prazo", rotulo, false, "já tem o selo do Discord");
    return false;
  }
  const agora = Date.now();
  const prorrogou = !!atual && atual.ate > agora;
  const ate = Math.max(agora, atual?.ate ?? 0) + dias * DIA_MS;
  lista[pessoa.id] = { nome: pessoa.nome, ate, base: atual?.base ?? false };
  gravar();
  if (alvoOnline?.isValid) {
    conferir(alvoOnline, false);
    if (alvoOnline.id !== autor.id) msg(alvoOnline, textos.AVISO_DADO(dias, ate, prorrogou));
  }
  const texto = textos.DONO_OK(pessoa.nome, dias, ate, prorrogou);
  registrarLogDono(nomeAutor, "kitsune com prazo", rotulo, true, texto);
  ok(autor, texto);
  return true;
}

/**
 * Kitsune comprado por PIX no Discord: vale até `ate` (ms). Soma sem pisar no que a pessoa já tem (fica o maior prazo) e é seguro repetir
 * (o bot reenvia a mesma compra até o jogo confirmar). Quem já tinha o selo sem prazo continua com ele depois que acabar.
 * @param {string} id  id do jogador
 * @param {string} nome
 * @param {number} ate
 * @returns {boolean} se aplicou (false = prazo já passou)
 */
export function concederPorCompra(id, nome, ate) {
  try {
    if (typeof id !== "string" || !Number.isFinite(ate) || ate <= Date.now()) return false;
    const lista = lerDados();
    const atual = lista[id];
    const alvo = porId(id);
    const base = atual?.base ?? (!!alvo && temTag(alvo));
    const novo = Math.max(ate, atual?.ate ?? 0);
    const mudou = !atual || atual.ate < novo;
    lista[id] = { nome: String(nome).slice(0, 32), ate: novo, base };
    gravar();
    if (alvo?.isValid) {
      conferir(alvo, false);
      if (mudou) msg(alvo, textos.AVISO_COMPRA(novo));
    }
    if (mudou) registrarLogDono("Discord", "kitsune comprado", `${nome} até ${formatarData(novo)}`, true, "pagamento por PIX confirmado");
    return true;
  } catch (e) {
    registrarErro("Kitsune com prazo: compra", e);
    return false;
  }
}

/**
 * Um dono encerra o selo com prazo de alguém.
 * @param {Player} autor
 * @param {unknown} alvo
 * @returns {boolean}
 */
export function tirarKitsuneTempo(autor, alvo) {
  const nomeAutor = typeof autor?.name === "string" ? autor.name : "?";
  const rotulo = String(typeof alvo === "string" ? alvo : /** @type {any} */ (alvo)?.name ?? "?");
  if (!(autor instanceof Player) || !ehDono(autor)) {
    registrarLogDono(nomeAutor, "tirar kitsune com prazo", rotulo, false, "recusado: não é dono");
    if (autor instanceof Player) erro(autor, textos.SO_DONO);
    return false;
  }
  const pessoa = acharPessoa(/** @type {any} */ (alvo));
  if (!pessoa) {
    erro(autor, textos.NAO_ACHADA(rotulo));
    return false;
  }
  const lista = lerDados();
  const c = lista[pessoa.id];
  if (!c) {
    erro(autor, textos.NAO_TEM(pessoa.nome));
    return false;
  }
  c.ate = 0;
  const alvoOnline = porId(pessoa.id);
  if (alvoOnline?.isValid) {
    conferir(alvoOnline, false);
    if (alvoOnline.id !== autor.id) msg(alvoOnline, textos.AVISO_TIRADO);
  } else {
    delete lista[pessoa.id];
    gravar();
  }
  const texto = textos.TIRADO_DONO(pessoa.nome);
  registrarLogDono(nomeAutor, "tirar kitsune com prazo", rotulo, true, texto);
  ok(autor, texto);
  return true;
}

// Entrou: aplica o selo (se ainda vale), avisa quanto falta ou que acabou.
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    if (!player.isValid) return;
    conferir(player, true);
    const ate = expiracaoDe(player.id);
    if (ate) msg(player, textos.AVISO_RESTANTE(ate - Date.now(), ate));
  }, 100);
});

// De tempos em tempos tira o selo de quem acabou o prazo (também quem está logado há muito tempo).
system.runInterval(() => {
  for (const p of online()) conferir(p, true);
}, PASSO_CONFERIR);
