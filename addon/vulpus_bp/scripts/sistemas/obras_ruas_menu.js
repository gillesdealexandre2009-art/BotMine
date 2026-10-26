// @ts-check
// Ruas decoradas: registro no mundo (ruas marcadas e perfis de estilo), menu da staff em Obras e o comando /vulpus:ruas.
// A conta das obras (aprender, planejar, aplicar) está em obras_ruas.js; aqui só se guarda, pergunta e roda como obra.
import { ItemLockMode, ItemStack, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { emitir } from "../core/efeitos.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/obras_ruas.js";
import { apagarBackup, restaurarBackup, salvarBackup } from "./obras_backup.js";
import { iniciarObra, trabalhoAtual } from "./obras.js";
import { aplicar, aprender, planejar, prepararLinhas } from "./obras_ruas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("./obras_ruas.js").Perfil} Perfil */
/** @typedef {import("./obras_ruas.js").Plano} Plano */
/** @typedef {import("./obras_backup.js").Backup} Backup */
/** @typedef {{ id: string, nome: string, modo: "lados" | "contorno", lados: [number, number, number][][], semente: number, d: string }} Rua */
/** @typedef {{ id: string, nome: string, f: number, c: number }} PerfilIndice */
/** @typedef {{ seq: number, ruas: Rua[], perfis: PerfilIndice[], ultimo: (Backup & { rua: string }) | null }} Registro */

const CHAVE = "vulpus:ruas";
const CHAVE_PERFIL = "vulpus:ruas_p_";
export const MAX_RUAS = 6;
export const MAX_PONTOS = 100;
export const MAX_PERFIS = 12;
const DIMENSAO_PADRAO = "minecraft:overworld";

/** @param {unknown} v @returns {[number, number, number][]} */
function pontosDe(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === "number" && Number.isFinite(n))).slice(0, MAX_PONTOS).map((p) => [p[0], p[1], p[2]]);
}

/** Registro normalizado (nada vindo do mundo é confiado). @returns {Registro} */
export function registroRuas() {
  const l = /** @type {any} */ (lerMundo(CHAVE, null)) ?? {};
  /** @type {Rua[]} */
  const ruas = (Array.isArray(l.ruas) ? l.ruas : [])
    .filter((/** @type {any} */ r) => r && typeof r.id === "string" && /^[a-z0-9_]{1,12}$/.test(r.id))
    .slice(0, MAX_RUAS)
    .map((/** @type {any} */ r) => ({
      id: r.id,
      nome: typeof r.nome === "string" ? r.nome.slice(0, 40) : r.id,
      modo: r.modo === "contorno" ? "contorno" : "lados",
      lados: [pontosDe(r.lados?.[0]), pontosDe(r.lados?.[1])],
      semente: typeof r.semente === "number" ? r.semente | 0 : 1,
      d: typeof r.d === "string" ? r.d : DIMENSAO_PADRAO,
    }));
  /** @type {PerfilIndice[]} */
  const perfis = (Array.isArray(l.perfis) ? l.perfis : [])
    .filter((/** @type {any} */ q) => q && typeof q.id === "string" && /^[a-z0-9_]{1,20}$/.test(q.id))
    .slice(0, MAX_PERFIS)
    .map((/** @type {any} */ q) => ({ id: q.id, nome: typeof q.nome === "string" ? q.nome.slice(0, 40) : q.id, f: Number(q.f) || 0, c: Number(q.c) || 0 }));
  const u = l.ultimo;
  const caixa = u?.caixa;
  const ultimo =
    u && typeof u.prefixo === "string" && /^[a-z0-9_]{1,24}$/.test(u.prefixo) && caixa && ["x1", "y1", "z1", "x2", "y2", "z2"].every((k) => typeof caixa[k] === "number") && typeof u.n === "number"
      ? { prefixo: u.prefixo, caixa: { x1: caixa.x1, y1: caixa.y1, z1: caixa.z1, x2: caixa.x2, y2: caixa.y2, z2: caixa.z2 }, tile: u.tile === 32 ? 32 : 64, n: u.n, falhas: Number(u.falhas) || 0, rua: typeof u.rua === "string" ? u.rua : "" }
      : null;
  return { seq: typeof l.seq === "number" ? l.seq | 0 : 0, ruas, perfis, ultimo };
}

/** @param {Registro} r @returns {boolean} */
function salvar(r) {
  return salvarMundo(CHAVE, r);
}

/** Edita e grava; false se não coube. @param {(r: Registro) => void} fn */
function editar(fn) {
  const r = registroRuas();
  fn(r);
  return salvar(r);
}

/** Perfil guardado (normalizado) ou null. @param {string} id @returns {Perfil | null} */
export function lerPerfil(id) {
  const q = /** @type {any} */ (lerMundo(CHAVE_PERFIL + id, null));
  if (!q || !Array.isArray(q.p) || !Array.isArray(q.j)) return null;
  const p = q.p.filter((/** @type {any} */ e) => Array.isArray(e) && typeof e[0] === "string").map((/** @type {any} */ e) => (e[1] && typeof e[1] === "object" ? [e[0], e[1]] : [e[0]]));
  const j = q.j.filter(Array.isArray).map((/** @type {any[]} */ w) => w.map((f) => (Array.isArray(f) ? f.filter((n) => typeof n === "number") : [])));
  return { nome: typeof q.nome === "string" ? q.nome : id, p, j, fatias: Number(q.fatias) || 0, celulas: Number(q.celulas) || 0, cortou: q.cortou === true };
}

/** @param {string} nome */
function idDoNome(nome) {
  const s = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 16);
  return s || "perfil";
}

/** Guarda o perfil (troca um de mesmo nome). @param {Perfil} perfil @returns {"ok" | "limite" | "grande"} */
export function guardarPerfil(perfil) {
  const r = registroRuas();
  const id = idDoNome(perfil.nome);
  const ja = r.perfis.find((q) => q.id === id);
  if (!ja && r.perfis.length >= MAX_PERFIS) return "limite";
  if (!salvarMundo(CHAVE_PERFIL + id, perfil)) return "grande";
  r.perfis = [...r.perfis.filter((q) => q.id !== id), { id, nome: perfil.nome.slice(0, 40), f: perfil.fatias, c: perfil.celulas }];
  return salvar(r) ? "ok" : "grande";
}

/** @param {string} id */
export function apagarPerfil(id) {
  salvarMundo(CHAVE_PERFIL + id, undefined);
  editar((r) => {
    r.perfis = r.perfis.filter((q) => q.id !== id);
  });
}

// ---------------------------------------------------------------- marcação

/** Lado em que cada pessoa está marcando (só em memória). @type {Map<string, { rua: string, lado: number }>} */
const ativo = new Map();

/** @param {Player} p */
function exigirStaff(p) {
  if (ehStaff(p)) return true;
  erro(p, SO_STAFF);
  return false;
}

/** @param {Player} p @param {string} id */
function ladoAtivo(p, id) {
  const a = ativo.get(p.id);
  return a && a.rua === id ? a.lado : 1;
}

/** @param {Player} p @param {string} id @param {number} lado */
function marcarLado(p, id, lado) {
  ativo.set(p.id, { rua: id, lado });
}

/** Cria a rua. @param {string} nome @param {"lados" | "contorno"} modo @returns {Rua | null} */
export function criarRua(nome, modo, dimensao = DIMENSAO_PADRAO) {
  const r = registroRuas();
  if (r.ruas.length >= MAX_RUAS) return null;
  r.seq++;
  /** @type {Rua} */
  const rua = { id: `r${r.seq}`, nome: nome.slice(0, 40) || textos.NOME_RUA_PADRAO(r.seq), modo, lados: [[], []], semente: Math.floor(Math.random() * 2000000000) + 1, d: dimensao };
  r.ruas.push(rua);
  return salvar(r) ? rua : null;
}

/** @param {Player} p @param {string} id */
function adicionarPonto(p, id) {
  if (!exigirStaff(p)) return;
  const lado = ladoAtivo(p, id);
  const x = Math.floor(p.location.x), y = Math.floor(p.location.y) - 1, z = Math.floor(p.location.z);
  let aviso = "";
  let n = 0;
  let modo = "lados";
  const gravou = editar((r) => {
    const rua = r.ruas.find((q) => q.id === id);
    if (!rua) return;
    modo = rua.modo;
    const total = rua.lados[rua.modo === "contorno" ? 0 : lado - 1].length;
    if (total >= MAX_PONTOS) {
      aviso = textos.LIMITE_PONTOS;
      return;
    }
    const nenhum = rua.lados[0].length === 0 && rua.lados[1].length === 0;
    if (nenhum) rua.d = p.dimension.id;
    else if (rua.d !== p.dimension.id) {
      aviso = textos.OUTRA_DIMENSAO;
      return;
    }
    const lista = rua.lados[rua.modo === "contorno" ? 0 : lado - 1];
    lista.push([x, y, z]);
    n = lista.length;
  });
  if (aviso) erro(p, aviso);
  else if (!gravou) erro(p, textos.NAO_GRAVOU);
  else if (n) ok(p, textos.PONTO_OK(lado, n, `${x}, ${y}, ${z}`, modo));
}

/** @param {Player} p @param {string} id */
function desfazerPonto(p, id) {
  if (!exigirStaff(p)) return;
  const lado = ladoAtivo(p, id);
  let tirou = false;
  editar((r) => {
    const rua = r.ruas.find((q) => q.id === id);
    const lista = rua?.lados[rua.modo === "contorno" ? 0 : lado - 1];
    if (lista?.length) {
      lista.pop();
      tirou = true;
    }
  });
  if (tirou) msg(p, textos.PONTO_TIRADO);
  else erro(p, textos.SEM_PONTO);
}

/** Mostra a marcação com partículas por alguns segundos. @param {Player} p @param {Rua} rua */
function verMarcacao(p, rua) {
  try {
    const dim = world.getDimension(rua.d);
    /** @type {{ x: number, y: number, z: number, c: number }[]} */
    const pts = [];
    rua.lados.forEach((l, i) => l.forEach((q) => pts.push({ x: q[0] + 0.5, y: q[1] + 2, z: q[2] + 0.5, c: i })));
    let vezes = 0;
    const run = system.runInterval(() => {
      try {
        if (++vezes > 12) {
          system.clearRun(run);
          return;
        }
        for (const q of pts) emitir(dim, q.c === 0 ? "minecraft:endrod" : "minecraft:basic_flame_particle", q);
      } catch (e) {
        system.clearRun(run);
        registrarErro("Ruas: ver marcação", e);
      }
    }, 10);
    ok(p, textos.VER_OK);
  } catch (e) {
    registrarErro("Ruas: ver marcação", e);
  }
}

// ---------------------------------------------------------------- obras

/** Prévias prontas, esperando "Aplicar" (só em memória). @type {Map<string, { plano: Plano, rua: Rua, perfil: string }>} */
const previas = new Map();

/** @param {Rua} rua */
const ruaDef = (rua) => ({ nome: rua.nome, modo: rua.modo, lados: rua.lados, semente: rua.semente });

/** @param {Player} p @param {Rua} rua @returns {import("@minecraft/server").Dimension | null} */
function dimensaoDa(p, rua) {
  if (rua.d !== p.dimension.id) {
    erro(p, textos.OUTRA_DIMENSAO);
    return null;
  }
  return p.dimension;
}

/** @param {Player} p @param {Rua} rua */
async function aprenderEstilo(p, rua) {
  if (!exigirStaff(p)) return;
  const prep = prepararLinhas(ruaDef(rua));
  if ("erro" in prep) {
    erro(p, textos.RUA_INCOMPLETA(prep.erro));
    return;
  }
  const dim = dimensaoDa(p, rua);
  if (!dim) return;
  const v = await perguntar(p, textos.TITULO_APRENDER, [{ tipo: "texto", rotulo: textos.ROTULO_PERFIL, dica: "Era do Outono", padrao: rua.nome }]);
  if (!v || !ehStaff(p)) return;
  const nome = String(v[0]).slice(0, 40);
  if (!nome) {
    erro(p, textos.PERFIL_VAZIO_NOME);
    return;
  }
  iniciarObra(p, textos.NOME_APRENDER, dim, (pincel, prog) => aprender(pincel, ruaDef(rua), nome, prog), (res) => {
    if (!p.isValid) return;
    if (!res || "erro" in res) {
      erro(p, textos.APRENDER_FALHOU(res?.erro ?? "sem resultado"));
      return;
    }
    const g = guardarPerfil(res.perfil);
    if (g === "limite") erro(p, textos.LIMITE_PERFIS);
    else if (g === "grande") erro(p, textos.NAO_GRAVOU);
    else ok(p, textos.PERFIL_OK(res.perfil.nome, res.perfil.fatias, res.perfil.celulas, res.perfil.cortou));
  });
}

/** Pergunta perfil e opções e roda a prévia. @param {Player} p @param {Rua} rua */
async function decorarComEstilo(p, rua) {
  if (!exigirStaff(p)) return;
  const prep = prepararLinhas(ruaDef(rua));
  if ("erro" in prep) {
    erro(p, textos.RUA_INCOMPLETA(prep.erro));
    return;
  }
  const dim = dimensaoDa(p, rua);
  if (!dim) return;
  const perfis = registroRuas().perfis;
  if (!perfis.length) {
    erro(p, textos.SEM_PERFIS);
    return;
  }
  /** @type {PerfilIndice | undefined} */
  let escolhido;
  const lista = new Lista(textos.TITULO_DECORAR).texto(textos.ESCOLHA_PERFIL);
  for (const q of perfis) lista.botao(textos.ITEM_PERFIL(q.nome, q.f, q.c), ICONES.lore, () => {
    escolhido = q;
  });
  await lista.abrir(p);
  if (!escolhido) return;
  const perfil = lerPerfil(escolhido.id);
  if (!perfil) {
    erro(p, textos.PERFIL_SUMIU);
    return;
  }
  const v = await perguntar(p, textos.TITULO_DECORAR, [
    { tipo: "numero", rotulo: textos.ROTULO_INTENSIDADE, padrao: 100, min: 0, max: 100 },
    { tipo: "alternar", rotulo: textos.ROTULO_ESPELHAR, padrao: false },
  ]);
  if (!v || !ehStaff(p)) return;
  const opc = { intensidade: v[0], espelhar: v[1] === true };
  const nomePerfil = perfil.nome;
  iniciarObra(p, textos.NOME_PREVIA, dim, (pincel, prog) => planejar(pincel, ruaDef(rua), perfil, opc, prog), (plano) => {
    if (!p.isValid) return;
    if (!plano || "erro" in plano) {
      erro(p, textos.RUA_INCOMPLETA(plano?.erro ?? "sem resultado"));
      return;
    }
    previas.set(p.id, { plano, rua, perfil: nomePerfil });
    void mostrarPrevia(p);
  });
}

/** @param {Player} p */
async function mostrarPrevia(p) {
  const pv = previas.get(p.id);
  if (!pv) return;
  const { plano } = pv;
  if (!plano.ops.length) {
    msg(p, textos.CORPO_PREVIA(0, plano.protegidas, 0, plano.carga));
    erro(p, textos.PREVIA_VAZIA);
    previas.delete(p.id);
    return;
  }
  const antigo = registroRuas().ultimo;
  let aplicarAgora = false;
  await new Lista(textos.TITULO_PREVIA)
    .texto(textos.CORPO_PREVIA(plano.colunas, plano.protegidas, plano.ops.length, plano.carga) + (antigo ? `\n\n§e${textos.SUBSTITUI_COPIA}` : ""))
    .botao(textos.BOTAO_APLICAR, ICONES.sim, () => {
      aplicarAgora = true;
    })
    .botao(textos.BOTAO_CANCELAR, ICONES.nao)
    .abrir(p);
  if (!aplicarAgora) {
    previas.delete(p.id);
    return;
  }
  aplicarPlano(p);
}

/** Faz o backup da faixa e aplica a prévia. @param {Player} p */
function aplicarPlano(p) {
  if (!exigirStaff(p)) return;
  const pv = previas.get(p.id);
  if (!pv || !pv.plano.caixa) {
    erro(p, textos.PREVIA_SUMIU);
    return;
  }
  if (trabalhoAtual()) {
    erro(p, "Já tem uma obra rodando.");
    return;
  }
  const dim = dimensaoDa(p, pv.rua);
  if (!dim) return;
  previas.delete(p.id);
  const { plano } = pv;
  const c = plano.caixa;
  if (!c) return;
  const caixa = { x1: c.x1, y1: c.y1, z1: c.z1, x2: c.x2, y2: c.y2, z2: c.z2 };
  iniciarObra(p, textos.NOME_DECORAR, dim, function* (pincel, prog) {
    const velho = registroRuas().ultimo;
    if (velho) {
      apagarBackup(velho);
      editar((r) => {
        r.ultimo = null;
      });
    }
    const bk = yield* salvarBackup(dim, "ruas", caixa, (f, t) => prog(f * 0.3, t));
    editar((r) => {
      r.ultimo = { ...bk, rua: pv.rua.nome };
    });
    return yield* aplicar(pincel, plano, (f, t) => prog(0.3 + f * 0.7, t));
  }, (n) => {
    if (p.isValid) ok(p, textos.DECORADA(Number(n) || 0));
  });
}

/** @param {Player} p */
async function desfazerDecoracao(p) {
  if (!exigirStaff(p)) return;
  const bk = registroRuas().ultimo;
  if (!bk) {
    erro(p, textos.SEM_COPIA);
    return;
  }
  if (trabalhoAtual()) {
    erro(p, "Já tem uma obra rodando.");
    return;
  }
  if (!(await confirmar(p, { titulo: textos.BOTAO_DESFAZER, texto: textos.CONFIRMAR_DESFAZER })) || !ehStaff(p) || trabalhoAtual()) return;
  iniciarObra(p, textos.NOME_DESFAZER, p.dimension, function* (_pincel, prog) {
    yield* restaurarBackup(p.dimension, bk, prog);
    editar((r) => {
      r.ultimo = null;
    });
  }, () => {
    if (p.isValid) ok(p, "Decoração desfeita.");
  });
}

// ---------------------------------------------------------------- menus

/**
 * Menu das ruas decoradas (também abre pelo comando /vulpus:ruas).
 * @param {Player} player
 * @param {(p: Player) => any} [voltar]
 */
export async function menuRuas(player, voltar) {
  if (!exigirStaff(player)) return;
  const aqui = () => menuRuas(player, voltar);
  const r = registroRuas();
  const lista = new Lista(textos.TITULO).texto(textos.CORPO(r.ruas.length, r.perfis.length, r.ultimo !== null));
  lista.botao(textos.BOTAO_NOVA, ICONES.nova, (p) => novaRua(p, aqui));
  if (!r.ruas.length) lista.rotulo(textos.SEM_RUAS);
  for (const rua of r.ruas) lista.botao(textos.ITEM_RUA(rua.nome, rua.modo, rua.lados[0].length, rua.lados[1].length), ICONES.spawn, (p) => menuRua(p, rua.id, aqui));
  lista.botao(textos.BOTAO_PERFIS, ICONES.lore, (p) => menuPerfis(p, aqui));
  if (r.ultimo) {
    lista.botao(textos.BOTAO_DESFAZER, ICONES.apagar, async (p) => {
      await desfazerDecoracao(p);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/** Cria a rua e abre a tela dela; se não criar, volta à lista. @param {Player} p @param {() => any} voltar */
async function novaRua(p, voltar) {
  if (!exigirStaff(p)) return;
  if (registroRuas().ruas.length >= MAX_RUAS) {
    erro(p, textos.LIMITE_RUAS);
    await voltar();
    return;
  }
  const v = await perguntar(p, textos.TITULO_NOVA, [
    { tipo: "texto", rotulo: textos.ROTULO_NOME, dica: "Rua das Lanternas", padrao: "" },
    { tipo: "lista", rotulo: textos.ROTULO_MODO, opcoes: [...textos.MODOS], padrao: 0 },
  ]);
  if (!v || !ehStaff(p)) return;
  const rua = criarRua(String(v[0]), v[1] === 1 ? "contorno" : "lados", p.dimension.id);
  if (!rua) {
    erro(p, textos.NAO_GRAVOU);
    await voltar();
    return;
  }
  marcarLado(p, rua.id, 1);
  await menuRua(p, rua.id, voltar);
}

/** @param {Player} player @param {string} id @param {() => any} voltar */
async function menuRua(player, id, voltar) {
  if (!exigirStaff(player)) return;
  const rua = registroRuas().ruas.find((q) => q.id === id);
  if (!rua) return;
  const aqui = () => menuRua(player, id, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    await fn(p);
    await aqui();
  };
  const lado = ladoAtivo(player, id);
  const lista = new Lista(rua.nome).texto(textos.CORPO_RUA(rua.nome, rua.modo, rua.lados[0].length, rua.lados[1].length, lado));
  lista.botao(textos.BOTAO_KIT, ICONES.nova, eVolta((p) => darKit(p, rua)));
  lista.botao(textos.BOTAO_PONTO, ICONES.spawn, eVolta((p) => adicionarPonto(p, id)));
  if (rua.modo === "lados") {
    lista.botao(textos.BOTAO_TROCAR_LADO(lado), ICONES.ordenar, eVolta((p) => {
      const novo = ladoAtivo(p, id) === 1 ? 2 : 1;
      marcarLado(p, id, novo);
      msg(p, textos.LADO_AGORA(novo));
    }));
  }
  lista
    .botao(textos.BOTAO_DESFAZER_PONTO, ICONES.nao, eVolta((p) => desfazerPonto(p, id)))
    .botao(textos.BOTAO_VER, ICONES.buscar, eVolta((p) => verMarcacao(p, rua)))
    .botao(textos.BOTAO_APRENDER, ICONES.lore, eVolta((p) => aprenderEstilo(p, rua)))
    .botao(textos.BOTAO_DECORAR, ICONES.nova, eVolta((p) => decorarComEstilo(p, rua)))
    .botao(textos.BOTAO_RENOMEAR, ICONES.editar, eVolta(async (p) => {
      const v = await perguntar(p, textos.BOTAO_RENOMEAR, [{ tipo: "texto", rotulo: textos.ROTULO_NOME, padrao: rua.nome }]);
      if (!v || !ehStaff(p) || !String(v[0])) return;
      editar((r) => {
        const q = r.ruas.find((x) => x.id === id);
        if (q) q.nome = String(v[0]).slice(0, 40);
      });
      ok(p, textos.RENOMEADA);
    }))
    .botao(textos.BOTAO_APAGAR_RUA, ICONES.apagar, async (p) => {
      if (await confirmar(p, { titulo: textos.BOTAO_APAGAR_RUA, texto: textos.CONFIRMAR_APAGAR_RUA })) {
        editar((r) => {
          r.ruas = r.ruas.filter((q) => q.id !== id);
        });
        ok(p, textos.APAGADA);
        await voltar();
        return;
      }
      await aqui();
    });
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player @param {() => any} voltar */
async function menuPerfis(player, voltar) {
  if (!exigirStaff(player)) return;
  const aqui = () => menuPerfis(player, voltar);
  const perfis = registroRuas().perfis;
  const lista = new Lista(textos.BOTAO_PERFIS);
  if (!perfis.length) lista.texto(textos.SEM_PERFIS);
  for (const q of perfis) {
    lista.botao(textos.ITEM_PERFIL(q.nome, q.f, q.c), ICONES.lore, async (p) => {
      const perfil = lerPerfil(q.id);
      if (!perfil) {
        erro(p, textos.PERFIL_SUMIU);
        await aqui();
        return;
      }
      let apagar = false;
      await new Lista(q.nome)
        .texto(textos.CORPO_PERFIL(q.nome, perfil.fatias, perfil.celulas, perfil.p.length, perfil.cortou))
        .botao(textos.BOTAO_APAGAR_PERFIL, ICONES.apagar, () => {
          apagar = true;
        })
        .voltar(() => {})
        .abrir(p);
      if (apagar && (await confirmar(p, { titulo: textos.BOTAO_APAGAR_PERFIL, texto: textos.CONFIRMAR_APAGAR_PERFIL }))) apagarPerfil(q.id);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- itens de marcação

/** Item de vanilla de cada ferramenta (o que vale é o tipo + o nome). */
const ITEM_KIT = Object.freeze({
  ponto: "minecraft:lime_dye",
  ver: "minecraft:spyglass",
  remover: "minecraft:red_dye",
  lado: "minecraft:yellow_dye",
  finalizar: "minecraft:emerald",
});

/** @param {import("@minecraft/server").ItemStack | undefined} item @returns {keyof typeof ITEM_KIT | null} */
function ferramentaDe(item) {
  if (!item) return null;
  for (const [id, tipo] of Object.entries(ITEM_KIT)) {
    if (item.typeId === tipo && item.nameTag === textos.KIT[id].nome) return /** @type {keyof typeof ITEM_KIT} */ (id);
  }
  return null;
}

/** Tira do inventário todos os itens de marcação. @param {Player} p */
function recolherKit(p) {
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (!inv?.isValid) return;
  for (let i = 0; i < inv.size; i++) if (ferramentaDe(inv.getItem(i))) inv.setItem(i, undefined);
}

/**
 * Põe os itens de marcação no inventário (trocando os que já tinha) e deixa esta rua ativa.
 * @param {Player} p @param {Rua} rua
 */
export function darKit(p, rua) {
  if (!exigirStaff(p)) return;
  const inv = p.getComponent("minecraft:inventory")?.container;
  if (!inv?.isValid) return;
  recolherKit(p);
  if (!ativo.has(p.id) || ativo.get(p.id)?.rua !== rua.id) marcarLado(p, rua.id, 1);
  const ids = Object.keys(ITEM_KIT).filter((id) => id !== "lado" || rua.modo === "lados");
  for (const id of ids) {
    const item = new ItemStack(/** @type {any} */ (ITEM_KIT)[id], 1);
    item.nameTag = textos.KIT[id].nome;
    item.setLore([textos.KIT[id].dica]);
    item.lockMode = ItemLockMode.inventory;
    item.keepOnDeath = true;
    if (inv.addItem(item)) {
      erro(p, textos.KIT_SEM_ESPACO);
      return;
    }
  }
  ok(p, textos.KIT_DADO(rua.nome));
}

/** @type {Map<string, number>} último tick de uso por pessoa (itemUse pode chegar duas vezes) */
const ultimoUso = new Map();

world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
  const ferramenta = ferramentaDe(itemStack);
  if (!ferramenta) return;
  const agora = system.currentTick;
  if (agora - (ultimoUso.get(source.id) ?? -99) < 6) return;
  ultimoUso.set(source.id, agora);
  try {
    if (!exigirStaff(source)) return;
    const a = ativo.get(source.id);
    const rua = a ? registroRuas().ruas.find((q) => q.id === a.rua) : undefined;
    if (!a) return erro(source, textos.KIT_SEM_RUA);
    if (!rua) {
      recolherKit(source);
      return erro(source, textos.KIT_RUA_SUMIU);
    }
    if (ferramenta === "ponto") adicionarPonto(source, rua.id);
    else if (ferramenta === "remover") desfazerPonto(source, rua.id);
    else if (ferramenta === "ver") verMarcacao(source, rua);
    else if (ferramenta === "lado") {
      const novo = a.lado === 1 ? 2 : 1;
      marcarLado(source, rua.id, novo);
      msg(source, textos.LADO_AGORA(novo));
    } else {
      recolherKit(source);
      ativo.delete(source.id);
      ok(source, textos.KIT_FINAL(rua.nome, [rua.lados[0].length, rua.lados[1].length], rua.modo));
    }
  } catch (e) {
    registrarErro("Ruas: itens de marcação", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ultimoUso.delete(playerId);
  ativo.delete(playerId);
});

registrarComando({ nome: "ruas", descricao: textos.DESC_RUAS, staff: true }, (p) => menuRuas(p));
