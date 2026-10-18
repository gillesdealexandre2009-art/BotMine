// @ts-check
// Painéis flutuantes do lobby: ranking de Caudas e de nível, guardiões da masmorra, quem está online, guia do novato e texto
// livre. A staff põe cada um onde está (menu Lobby e portal); eles se atualizam sozinhos. Também cuida do ambiente do lobby
// (pétalas e vaga-lumes em volta de quem passa) e das faíscas dos painéis.
import { system } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config, lerMundo, salvarMundo, todosJogadores } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { online, posicoesOnline } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { teleportar } from "../core/teleporte.js";
import { erro, formatarCoords, limitar, ok, registrarErro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import { GUARDIOES } from "../textos/masm.js";
import * as textos from "../textos/lobby_paineis.js";
import { ranking } from "./caudas.js";
import * as lobby from "./lobby.js";
import { ANDARES, ranking as rankingMasm } from "./masm_estado.js";
import { rankDoNivel, rankingNivel } from "./niveis.js";
import { rankingPets } from "./pets_bonus.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ id: number, tipo: string, x: number, y: number, z: number, d: string, texto: string }} Painel */

const CHAVE = "vulpus:paineis";
const TAG = "vulpus_pnl_";
const MAX_PAINEIS = 30;
const TOP = 5;
const PASSO_TEXTO = 100;
/** Os rankings leem todos os jogadores salvos: só se refazem de tempos em tempos. */
const VALIDADE_RANKING = 600;
const PASSO_ENFEITE = 20;
const ALCANCE_ENFEITE = 24;
const PASSO_AMBIENTE = 40;
const LARANJA = { red: 1, green: 0.5, blue: 0.08 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };
const NOME_MAX = 16;

/** @type {Painel[] | undefined} */
let paineis;
let seq = 0;
/** @type {Map<string, { texto: string, ate: number }>} */
const cache = new Map();

/** @returns {Painel[]} */
function lista() {
  if (paineis) return paineis;
  const s = /** @type {any} */ (lerMundo(CHAVE, {}));
  seq = Number.isFinite(s?.seq) ? s.seq : 0;
  const bruto = Array.isArray(s?.lista) ? s.lista : [];
  paineis = bruto
    .filter((p) => p && typeof p.d === "string" && typeof p.tipo === "string" && [p.id, p.x, p.y, p.z].every((n) => Number.isFinite(n)))
    .map((p) => ({ id: p.id, tipo: p.tipo, x: p.x, y: p.y, z: p.z, d: p.d, texto: typeof p.texto === "string" ? p.texto : "" }));
  return paineis;
}

function gravar() {
  salvarMundo(CHAVE, { seq, lista: lista() });
}

/** @param {string} tipo */
const nomeDoTipo = (tipo) => textos.TIPOS.find((t) => t.id === tipo)?.nome ?? tipo;

/** Nome curto e sem códigos de cor. @param {string} nome */
const curto = (nome) => String(nome).replace(/§./g, "").slice(0, NOME_MAX);

/** @param {number} ms */
const minSeg = (ms) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;

/**
 * Texto de um ranking, refeito só quando passa da validade.
 * @param {string} chave
 * @param {() => string} montar
 */
function guardado(chave, montar) {
  const agora = system.currentTick;
  const c = cache.get(chave);
  if (c && agora < c.ate) return c.texto;
  const texto = montar();
  cache.set(chave, { texto, ate: agora + VALIDADE_RANKING });
  return texto;
}

/** @param {Painel} p */
export function textoDoPainel(p) {
  switch (p.tipo) {
    case "caudas":
      return guardado("caudas", () => {
        const top = ranking(TOP);
        return textos.PAINEL_CAUDAS(top.length ? top.map((l, i) => textos.LINHA_RANK(i + 1, curto(l.nome), textos.VALOR_CAUDAS(l.caudas))).join("\n") : textos.SEM_DADOS);
      });
    case "nivel":
      return guardado("nivel", () => {
        const top = rankingNivel(TOP);
        return textos.PAINEL_NIVEL(top.length ? top.map((l, i) => textos.LINHA_RANK(i + 1, curto(l.nome), textos.VALOR_NIVEL(l.nivel, rankDoNivel(l.nivel).nome))).join("\n") : textos.SEM_DADOS);
      });
    case "masm":
      return guardado("masm", () => {
        const r = rankingMasm();
        const linhas = [];
        for (let n = 1; n <= ANDARES; n++) {
          const m = r[n]?.[0];
          linhas.push(textos.LINHA_MASM(n, GUARDIOES[n], m ? `§f${curto(m.nome)} §e${minSeg(m.t)}` : textos.MASM_SEM_MARCA));
        }
        return textos.PAINEL_MASM(linhas.join("\n"));
      });
    case "pets":
      return guardado("pets", () => {
        const top = rankingPets(TOP);
        return textos.PAINEL_PETS(top.length ? top.map((l, i) => textos.LINHA_RANK(i + 1, curto(l.nome), textos.VALOR_PETS(l.pets, l.lendarios))).join("\n") : textos.SEM_DADOS);
      });
    case "online": {
      const nomes = online().map((j) => curto(j.name));
      const mostra = nomes.slice(0, 8).map((n) => `§f${n}`).join("§8, ");
      return textos.PAINEL_ONLINE(nomes.length, nomes.length > 8 ? `${mostra} §7e mais ${nomes.length - 8}` : mostra);
    }
    case "guia":
      return textos.PAINEL_GUIA;
    default:
      return textos.PAINEL_LIVRE(p.texto);
  }
}

function atualizar() {
  const ligado = config().paineisLigados;
  for (const p of lista()) {
    manterTexto(TAG + p.id, ligado ? { x: p.x, y: p.y, z: p.z, d: p.d } : undefined, textoDoPainel(p));
  }
}

system.runInterval(() => {
  try {
    atualizar();
  } catch (e) {
    registrarErro("Painéis do lobby: textos", e);
  }
}, PASSO_TEXTO);

// Faíscas douradas em volta dos painéis que têm alguém perto, para chamar a atenção.
system.runInterval(() => {
  try {
    const cfg = config();
    if (!cfg.paineisLigados || !lista().length) return;
    const jogadores = posicoesOnline();
    if (!jogadores.length) return;
    for (const p of lista()) {
      const perto = jogadores.find((j) => j.d === p.d && Math.hypot(j.x - p.x, j.y - p.y, j.z - p.z) <= ALCANCE_ENFEITE);
      if (!perto) continue;
      const dim = perto.p.dimension;
      const c = { x: p.x, y: p.y, z: p.z };
      efeitos.nuvem(dim, c, { n: 2, largura: 1.5, y0: -0.8, alto: 2.6 }, "minecraft:endrod");
      efeitos.nuvem(dim, c, { n: 1, largura: 1.2, y0: -0.4, alto: 2 }, "minecraft:colored_flame_particle", Math.random() < 0.5 ? LARANJA : DOURADO);
    }
  } catch (e) {
    registrarErro("Painéis do lobby: faíscas", e);
  }
}, PASSO_ENFEITE);

// Ambiente: pétalas caindo e vaga-lumes em volta de quem está no lobby ou no círculo do spawn.
system.runInterval(() => {
  try {
    const cfg = config();
    const n = cfg.ambienteLobby ? cfg.ambienteDensidade : 0;
    if (n <= 0) return;
    for (const j of posicoesOnline()) {
      if (!lobby.dentro(j.d, j)) continue;
      const dim = j.p.dimension;
      const c = { x: j.x, y: j.y, z: j.z };
      efeitos.nuvem(dim, c, { n, largura: 9, y0: 1.5, alto: 5 }, "minecraft:cherry_leaves_particle");
      efeitos.nuvem(dim, c, { n: Math.ceil(n / 2), largura: 8, y0: 0.4, alto: 3 }, "minecraft:endrod");
      if (Math.random() < 0.35) efeitos.nuvem(dim, c, { n: 1, largura: 7, y0: 0.6, alto: 3 }, "minecraft:colored_flame_particle", Math.random() < 0.5 ? LARANJA : DOURADO);
    }
  } catch (e) {
    registrarErro("Ambiente do lobby", e);
  }
}, PASSO_AMBIENTE);

// ------------------------------------------------------------------------------ painel da staff

/** @param {Painel} p */
const rotulo = (p) => textos.ITEM_PAINEL(nomeDoTipo(p.tipo), formatarCoords(p));

/**
 * @param {Player} player
 * @param {number} tipo  índice em TIPOS
 * @param {number} altura
 * @param {string} texto
 */
function criar(player, tipo, altura, texto) {
  const t = textos.TIPOS[tipo];
  if (!t) return;
  if (t.id === "livre" && !texto.trim()) {
    erro(player, textos.PAINEL_TEXTO_VAZIO);
    return;
  }
  if (lista().length >= MAX_PAINEIS) {
    erro(player, textos.LIMITE_PAINEIS(MAX_PAINEIS));
    return;
  }
  const { x, y, z } = player.location;
  const r = (/** @type {number} */ n) => Math.round(n * 10) / 10;
  lista().push({ id: ++seq, tipo: t.id, x: r(x), y: r(y + limitar(altura, 0, 12)), z: r(z), d: player.dimension.id, texto: texto.trim().slice(0, 400) });
  gravar();
  atualizar();
  ok(player, textos.PAINEL_POSTO(t.nome));
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function novoPainel(player, voltar) {
  const r = await perguntar(player, textos.BOTAO_NOVO_PAINEL, [
    { tipo: "lista", rotulo: textos.ROTULO_TIPO, opcoes: textos.TIPOS.map((t) => t.nome), padrao: 0 },
    { tipo: "numero", rotulo: textos.ROTULO_ALTURA, padrao: 2, min: 0, max: 12 },
    { tipo: "texto", rotulo: textos.ROTULO_TEXTO, dica: textos.DICA_TEXTO, padrao: "" },
  ]);
  if (r && ehStaff(player)) criar(player, r[0], r[1], String(r[2] ?? ""));
  await voltar();
}

/**
 * @param {Player} player
 * @param {Painel} p
 * @param {() => any} voltar
 */
async function umPainel(player, p, voltar) {
  if (!ehStaff(player)) return;
  const aqui = () => umPainel(player, p, voltar);
  /** @param {(j: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ j) => {
    if (!ehStaff(j)) return;
    await fn(j);
    await (lista().includes(p) ? aqui() : voltar());
  };
  const tela = new Lista(nomeDoTipo(p.tipo)).texto(textos.CORPO_UM_PAINEL(nomeDoTipo(p.tipo), formatarCoords(p)));
  tela.botao(textos.BOTAO_IR, ICONES.tpa, eVolta((j) => teleportar(j, { x: p.x, y: p.y - 1.5, z: p.z, d: p.d }, { nome: nomeDoTipo(p.tipo), tema: "spawn" })));
  tela.botao(
    textos.BOTAO_MOVER,
    ICONES.spawn,
    eVolta((j) => {
      const l = j.location;
      p.x = Math.round(l.x * 10) / 10;
      p.y = Math.round((l.y + 2) * 10) / 10;
      p.z = Math.round(l.z * 10) / 10;
      p.d = j.dimension.id;
      gravar();
      atualizar();
      ok(j, textos.PAINEL_MOVIDO);
    }),
  );
  if (p.tipo === "livre") {
    tela.botao(
      textos.BOTAO_EDITAR_TEXTO,
      ICONES.editar,
      eVolta(async (j) => {
        const r = await perguntar(j, textos.BOTAO_EDITAR_TEXTO, [{ tipo: "texto", rotulo: textos.ROTULO_TEXTO, dica: textos.DICA_TEXTO, padrao: p.texto }]);
        if (!r || !ehStaff(j)) return;
        p.texto = String(r[0]).trim().slice(0, 400);
        gravar();
        atualizar();
        ok(j, textos.PAINEL_ATUALIZADO);
      }),
    );
  }
  tela.botao(
    textos.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (j) => {
      if (!(await confirmar(j, { titulo: textos.BOTAO_REMOVER, texto: rotulo(p) })) || !ehStaff(j)) return;
      paineis = lista().filter((x) => x !== p);
      gravar();
      manterTexto(TAG + p.id, undefined, "");
      ok(j, textos.PAINEL_REMOVIDO);
    }),
  );
  await tela.voltar(voltar).abrir(player);
}

/**
 * Menu dos painéis flutuantes do lobby.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]  abre as configurações do lobby e dos painéis
 */
export async function menuPaineis(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuPaineis(player, voltar, configurar);
  const tela = new Lista(textos.TITULO_PAINEIS).texto(textos.CORPO_PAINEIS(lista().length));
  tela.botao(textos.BOTAO_NOVO_PAINEL, ICONES.nova, (p) => novoPainel(p, aqui));
  if (!lista().length) tela.rotulo(textos.SEM_PAINEIS);
  for (const p of lista()) tela.botao(rotulo(p), ICONES.buscar, (j) => umPainel(j, p, aqui));
  if (configurar) tela.botao("Alcance, ambiente e ligar/desligar", ICONES.ajustes, async (j) => { await configurar(j); await aqui(); });
  await tela.voltar(voltar).abrir(player);
}
