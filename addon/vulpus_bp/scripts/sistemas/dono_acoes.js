// @ts-check
// Ações do Painel de Dono: times (clãs) e guerras à força, e a lista de donos. Cada ação confere se quem pediu
// é dono ANTES de qualquer efeito (venha do painel, do comando ou de uma chamada direta) e registra o
// resultado (ok ou erro, com o motivo) no log do dono. Nada é reconstruído: os times usam editarCla/novoCla
// (cla_dados), os avisos e a limpeza de nome de cla_acoes, a base cresce com expandirBase (cla_terreno) e as
// guerras começam e terminam com iniciar/terminar (cla_guerra), os mesmos do jogo normal.
import { Player } from "@minecraft/server";
import { DONOS, NIVEIS_CLA, SONS } from "../config.js";
import { config, todosJogadores } from "../core/db.js";
import { adicionarDono, donosRegistrados, ehDono, logDono, registrarLogDono, reivindicarDono, removerDono } from "../core/dono.js";
import { temPalavrao } from "../core/filtro.js";
import { porId, porNome } from "../core/jogadores.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import * as textosCla from "../textos/clas.js";
import * as textos from "../textos/dono.js";
import { avisarCla, limpar } from "./cla_acoes.js";
import { claDe, claPorId, claPorTag, CORES_CLA, defNivel, editarCla, membroDe, novoCla, problemaNome, problemaTag, todosClas } from "./cla_dados.js";
import { guerraDe, iniciar, lerEstado, salvar as salvarGuerras, terminar } from "./cla_guerra.js";
import { expandirBase } from "./cla_terreno.js";

/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {import("./cla_guerra.js").Guerra} Guerra */
/** @typedef {import("./cla_guerra.js").GuerraFim} GuerraFim */
/** @typedef {import("./cla_guerra.js").Lado} Lado */
/** @typedef {{ id: string, nome: string }} Pessoa */
/** Texto de sucesso, ou { erro } com o motivo. @typedef {string | { erro: string }} Resultado */

const MINUTO_MS = 60 * 1000;
/** Guerra forçada: até 7 dias (em minutos). */
const MINUTOS_MAXIMO = 7 * 24 * 60;
const PONTOS_MAXIMO = 1_000_000;

/**
 * Roda uma ação do dono: confere a permissão antes de tudo, avisa quem pediu e registra no log.
 * @param {Player} autor
 * @param {string} acao  nome curto (log)
 * @param {string} alvo  jogador, time ou guerra (log)
 * @param {() => Resultado} fn
 * @returns {boolean} se deu certo
 */
function executar(autor, acao, alvo, fn) {
  const nome = typeof autor?.name === "string" ? autor.name : "?";
  if (!(autor instanceof Player) || !ehDono(autor)) {
    registrarLogDono(nome, acao, alvo, false, textos.LOG_NAO_DONO);
    if (autor instanceof Player) erro(autor, textos.SO_DONO);
    return false;
  }
  /** @type {Resultado} */
  let r;
  try {
    r = fn();
  } catch (e) {
    registrarErro(`Dono: ${acao}`, e);
    r = { erro: textos.ERRO_INTERNO };
  }
  if (typeof r === "string") {
    registrarLogDono(nome, acao, alvo, true, r);
    ok(autor, r);
    return true;
  }
  registrarLogDono(nome, acao, alvo, false, r.erro);
  erro(autor, r.erro);
  return false;
}

/** @param {unknown} v */
const textoDe = (v) => (v instanceof Player ? v.name : String(v ?? "").trim());

// ---------------------------------------------------------------- busca

/**
 * Pessoa pelo Player ou pelo nome: online primeiro, depois quem já entrou no mundo ou está num time (offline).
 * @param {Player | string | undefined} alvo
 * @returns {Pessoa | undefined}
 */
export function acharPessoa(alvo) {
  if (alvo instanceof Player) {
    try {
      return { id: alvo.id, nome: alvo.name };
    } catch {
      return undefined;
    }
  }
  const nome = String(alvo ?? "").trim().replace(/^@/, "").replace(/^"(.*)"$/, "$1");
  if (!nome) return undefined;
  const conectado = porNome(nome);
  if (conectado) return { id: conectado.id, nome: conectado.name };
  const procurado = nome.toLowerCase();
  const registrado = todosJogadores().find((j) => j.dados.nome.toLowerCase() === procurado);
  if (registrado) return { id: registrado.id, nome: registrado.dados.nome };
  for (const cla of todosClas()) {
    const m = cla.membros.find((x) => x.nome.toLowerCase() === procurado);
    if (m) return { id: m.id, nome: m.nome };
  }
  return undefined;
}

/**
 * Time pela tag (ou pelo id interno).
 * @param {unknown} ref
 * @returns {Cla | undefined}
 */
export function acharTime(ref) {
  const r = String(ref ?? "").trim();
  if (!r) return undefined;
  return claPorTag(r) ?? claPorId(r);
}

/**
 * Guerra em andamento pelo id ou pela tag de um dos times; se não houver, a finalizada (pelo id, ou a mais
 * recente do time da tag), para responder "já foi finalizada".
 * @param {unknown} ref
 * @returns {{ g?: Guerra, fim?: GuerraFim }}
 */
export function acharGuerra(ref) {
  const r = String(ref ?? "").trim();
  if (!r) return {};
  const estado = lerEstado();
  const ativa = estado.guerras.find((g) => g.id === r);
  if (ativa) return { g: ativa };
  const cla = acharTime(r);
  if (cla) {
    const g = guerraDe(cla.id);
    if (g) return { g };
    return { fim: estado.historico.find((h) => h.a === cla.id || h.b === cla.id) };
  }
  return { fim: estado.historico.find((h) => h.id !== "" && h.id === r) };
}

/**
 * Lado de uma guerra pela tag, pelo id do time ou por "a"/"b".
 * @param {{ a: string, b: string, tags: { a: string, b: string } }} g
 * @param {unknown} ref
 * @returns {Lado | undefined}
 */
function ladoDe(g, ref) {
  const r = String(ref ?? "").trim();
  if (r === "a" || r === "b") return r;
  const tag = r.toUpperCase();
  if (g.tags.a === tag || g.a === r) return "a";
  if (g.tags.b === tag || g.b === r) return "b";
  const cla = acharTime(r);
  return cla ? (cla.id === g.a ? "a" : cla.id === g.b ? "b" : undefined) : undefined;
}

/**
 * Cor pelo código (6, e, a...) ou pelo nome (Azul, Vermelho...); vazio = a primeira.
 * @param {unknown} cor
 * @returns {string | undefined}
 */
function lerCor(cor) {
  const c = String(cor ?? "").replace(/§/g, "").trim().toLowerCase();
  if (!c) return CORES_CLA[0];
  if (CORES_CLA.includes(c)) return c;
  return CORES_CLA.find((x) => textosCla.NOME_COR(x).toLowerCase() === c);
}

/**
 * Tira a pessoa do time em que estiver; se ela liderava, o time fica sem líder.
 * @param {string} id
 * @returns {Cla | undefined | false} o time de onde saiu (undefined = não tinha; false = não gravou)
 */
function tirarDoTime(id) {
  const atual = claDe(id);
  if (!atual) return undefined;
  const novo = editarCla(atual.id, (c) => {
    c.membros = c.membros.filter((m) => m.id !== id);
    if (c.dono === id) c.dono = "";
  });
  return novo ? atual : false;
}

/** @param {Cla} cla */
const nomeLider = (cla) => (cla.dono ? (membroDe(cla, cla.dono)?.nome ?? "?") : textos.SEM_LIDER);

// ---------------------------------------------------------------- donos

/**
 * Primeiro dono do servidor (só Operador e só enquanto não houver nenhum dono).
 * @param {Player} player
 * @returns {boolean}
 */
export function reivindicar(player) {
  const r = reivindicarDono(player);
  registrarLogDono(player.name, "reivindicar", player.name, r === "ok", textos.REIVINDICAR[r]);
  if (r === "ok") ok(player, textos.REIVINDICOU);
  else erro(player, textos.REIVINDICAR[r]);
  return r === "ok";
}

/**
 * @param {Player} autor
 * @param {Player | string} alvo
 */
export function adicionarDonoAcao(autor, alvo) {
  return executar(autor, "adicionar dono", textoDe(alvo), () => {
    const pessoa = acharPessoa(alvo);
    if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(alvo)) };
    const r = adicionarDono(autor, pessoa);
    if (r !== "ok") return { erro: textos.ADICIONAR_DONO_ERRO[r] };
    msg(porId(pessoa.id), textos.VIROU_DONO_AVISO);
    return textos.DONO_ADICIONADO(pessoa.nome);
  });
}

/**
 * @param {Player} autor
 * @param {Player | string} alvo  nome (ou o Player) de um dono registrado
 */
export function removerDonoAcao(autor, alvo) {
  return executar(autor, "remover dono", textoDe(alvo), () => {
    const nome = textoDe(alvo).toLowerCase();
    const registrado = donosRegistrados().find((d) => d.id === (alvo instanceof Player ? alvo.id : "") || d.nome.toLowerCase() === nome);
    const pessoa = registrado ?? acharPessoa(alvo);
    if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(alvo)) };
    const r = removerDono(autor, pessoa.id);
    if (r !== "ok") return { erro: textos.REMOVER_DONO_ERRO[r] };
    return textos.DONO_REMOVIDO(pessoa.nome);
  });
}

/**
 * Lista de donos (registrados e da config).
 * @param {Player} autor
 */
export function listarDonos(autor) {
  return executar(autor, "listar donos", "", () => textos.LISTA_DONOS(donosRegistrados(), DONOS));
}

// ---------------------------------------------------------------- times

/**
 * Cria um time sem cobrar ninguém. Sem líder, nasce sem líder e sem membros.
 * @param {Player} autor
 * @param {string} nomeBruto
 * @param {string} tagBruta
 * @param {string} [cor]  código ou nome da cor (vazio = a primeira)
 * @param {Player | string} [lider]  quem lidera (sai do time em que estiver)
 */
export function criarTime(autor, nomeBruto, tagBruta, cor, lider) {
  return executar(autor, "criar time", `${textoDe(tagBruta)} ${textoDe(nomeBruto)}`, () => {
    const nome = limpar(String(nomeBruto ?? ""));
    const tag = String(tagBruta ?? "").replace(/§./g, "").trim().toUpperCase();
    const problema = problemaNome(nome, undefined, temPalavrao);
    if (problema) return { erro: textosCla.NOME_PROBLEMA[problema] };
    const problemaT = problemaTag(tag, undefined, temPalavrao);
    if (problemaT) return { erro: textosCla.TAG_PROBLEMA[problemaT] };
    const corOk = lerCor(cor);
    if (!corOk) return { erro: textos.COR_INVALIDA };
    /** @type {Pessoa | null} */
    let pessoa = null;
    if (lider !== undefined && textoDe(lider) !== "") {
      pessoa = acharPessoa(lider) ?? null;
      if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(lider)) };
      const antigo = tirarDoTime(pessoa.id);
      if (antigo === false) return { erro: textos.ERRO_GRAVAR };
      if (antigo) avisarCla(antigo.id, textos.SAIU_FORCADO(pessoa.nome, antigo.dono === pessoa.id));
    }
    const cla = novoCla(pessoa, { nome, tag, cor: corOk });
    if (!cla) return { erro: textos.ERRO_GRAVAR };
    if (pessoa) msg(porId(pessoa.id), textos.TIME_CRIADO_AVISO(cla));
    return textos.TIME_CRIADO(cla, pessoa?.nome);
  });
}

/**
 * Define (ou troca) o líder. O líder anterior vira Vice; quem não era do time entra (e sai do time anterior).
 * @param {Player} autor
 * @param {string} refTime  tag
 * @param {Player | string} alvo
 */
export function definirLider(autor, refTime, alvo) {
  return executar(autor, "definir líder", `${textoDe(refTime)} ${textoDe(alvo)}`, () => {
    const cla = acharTime(refTime);
    if (!cla) return { erro: textos.TIME_NAO_ACHADO(textoDe(refTime)) };
    const pessoa = acharPessoa(alvo);
    if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(alvo)) };
    if (cla.dono === pessoa.id) return { erro: textos.JA_LIDER(pessoa.nome, cla) };
    const jaEra = !!membroDe(cla, pessoa.id);
    const max = defNivel(cla.nivel).membros;
    if (!jaEra && cla.membros.length >= max) return { erro: textos.TIME_CHEIO(cla, max) };
    if (!jaEra) {
      const antigo = tirarDoTime(pessoa.id);
      if (antigo === false) return { erro: textos.ERRO_GRAVAR };
      if (antigo) avisarCla(antigo.id, textos.SAIU_FORCADO(pessoa.nome, antigo.dono === pessoa.id));
    }
    const anterior = cla.dono ? membroDe(cla, cla.dono)?.nome : undefined;
    const novo = editarCla(cla.id, (c) => {
      for (const m of c.membros) if (m.cargo === "lider") m.cargo = "vice";
      let m = membroDe(c, pessoa.id);
      if (!m) {
        m = { id: pessoa.id, nome: pessoa.nome, cargo: "lider", desde: Date.now(), saque: { dia: "", valor: 0 } };
        c.membros.push(m);
      }
      m.cargo = "lider";
      c.dono = pessoa.id;
      c.pedidos = c.pedidos.filter((p) => p.id !== pessoa.id);
    });
    if (!novo) return { erro: textos.ERRO_GRAVAR };
    avisarCla(novo.id, textosCla.NOVO_LIDER(pessoa.nome), { som: SONS.pedido, exceto: pessoa.id });
    msg(porId(pessoa.id), textos.VOCE_LIDER(novo));
    return textos.LIDER_DEFINIDO(pessoa.nome, novo, anterior);
  });
}

/**
 * Define o nível (1..8). Os limites vêm do nível (NIVEIS_CLA); a base encolhe até o raio do nível e
 * cresce onde couber (expandirBase, o mesmo de subir de nível).
 * @param {Player} autor
 * @param {string} refTime
 * @param {unknown} nivelBruto
 */
export function definirNivel(autor, refTime, nivelBruto) {
  return executar(autor, "definir nível", `${textoDe(refTime)} ${textoDe(nivelBruto)}`, () => {
    const cla = acharTime(refTime);
    if (!cla) return { erro: textos.TIME_NAO_ACHADO(textoDe(refTime)) };
    const nivel = Number(nivelBruto);
    if (!Number.isInteger(nivel) || nivel < 1 || nivel > NIVEIS_CLA.length) return { erro: textos.NIVEL_INVALIDO(NIVEIS_CLA.length) };
    const def = defNivel(nivel);
    const novo = editarCla(cla.id, (c) => {
      c.nivel = nivel;
      if (c.base) c.base.raio = Math.min(c.base.raio, def.raio);
    });
    if (!novo) return { erro: textos.ERRO_GRAVAR };
    const raio = expandirBase(novo.id);
    avisarCla(novo.id, textos.NIVEL_AVISO(nivel));
    return textos.NIVEL_DEFINIDO(claPorId(novo.id) ?? novo, raio, def.membros);
  });
}

/**
 * Coloca alguém no time como Membro, sem convite (mesmo offline); se era de outro time, sai dele antes.
 * @param {Player} autor
 * @param {string} acao
 * @param {string} refTime
 * @param {Player | string} alvo
 */
function colocarNoTime(autor, acao, refTime, alvo) {
  return executar(autor, acao, `${textoDe(alvo)} -> ${textoDe(refTime)}`, () => {
    const cla = acharTime(refTime);
    if (!cla) return { erro: textos.TIME_NAO_ACHADO(textoDe(refTime)) };
    const pessoa = acharPessoa(alvo);
    if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(alvo)) };
    if (membroDe(cla, pessoa.id)) return { erro: textos.JA_NO_TIME(pessoa.nome, cla) };
    const max = defNivel(cla.nivel).membros;
    if (cla.membros.length >= max) return { erro: textos.TIME_CHEIO(cla, max) };
    const antigo = tirarDoTime(pessoa.id);
    if (antigo === false) return { erro: textos.ERRO_GRAVAR };
    const novo = editarCla(cla.id, (c) => {
      c.membros.push({ id: pessoa.id, nome: pessoa.nome, cargo: "membro", desde: Date.now(), saque: { dia: "", valor: 0 } });
      c.pedidos = c.pedidos.filter((p) => p.id !== pessoa.id);
    });
    if (!novo) return { erro: textos.ERRO_GRAVAR };
    if (antigo) avisarCla(antigo.id, textos.SAIU_FORCADO(pessoa.nome, antigo.dono === pessoa.id));
    avisarCla(novo.id, textosCla.ENTROU(pessoa.nome), { exceto: pessoa.id, som: SONS.ok });
    msg(porId(pessoa.id), textos.VOCE_COLOCADO(novo));
    return textos.COLOCADO(pessoa.nome, novo, antigo);
  });
}

/**
 * @param {Player} autor
 * @param {string} refTime
 * @param {Player | string} alvo
 */
export function adicionarMembro(autor, refTime, alvo) {
  return colocarNoTime(autor, "adicionar membro", refTime, alvo);
}

/**
 * Força a pessoa a mudar de time (sai do atual e entra no novo como Membro).
 * @param {Player} autor
 * @param {Player | string} alvo
 * @param {string} refTime
 */
export function moverJogador(autor, alvo, refTime) {
  return colocarNoTime(autor, "mover jogador", refTime, alvo);
}

/**
 * Tira a pessoa do time dela (com a tag, só se for daquele time). Se liderava, o time fica sem líder.
 * @param {Player} autor
 * @param {Player | string} alvo
 * @param {string} [refTime]
 */
export function removerMembro(autor, alvo, refTime) {
  return executar(autor, "remover membro", `${textoDe(alvo)}${refTime ? ` <- ${textoDe(refTime)}` : ""}`, () => {
    const pessoa = acharPessoa(alvo);
    if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(alvo)) };
    const cla = claDe(pessoa.id);
    if (!cla) return { erro: textos.SEM_TIME(pessoa.nome) };
    if (refTime) {
      const pedido = acharTime(refTime);
      if (!pedido) return { erro: textos.TIME_NAO_ACHADO(textoDe(refTime)) };
      if (pedido.id !== cla.id) return { erro: textos.NAO_E_DO_TIME(pessoa.nome, pedido) };
    }
    const eraLider = cla.dono === pessoa.id;
    const antigo = tirarDoTime(pessoa.id);
    if (!antigo) return { erro: textos.ERRO_GRAVAR };
    avisarCla(cla.id, textos.SAIU_FORCADO(pessoa.nome, eraLider));
    const quem = porId(pessoa.id);
    if (quem) erro(quem, textos.VOCE_REMOVIDO(cla));
    return textos.REMOVIDO(pessoa.nome, cla, eraLider);
  });
}

/**
 * De que time a pessoa é (online ou pelo nome registrado).
 * @param {Player} autor
 * @param {Player | string} alvo
 */
export function consultarTime(autor, alvo) {
  return executar(autor, "consultar time", textoDe(alvo), () => {
    const pessoa = acharPessoa(alvo);
    if (!pessoa) return { erro: textos.PESSOA_NAO_ACHADA(textoDe(alvo)) };
    const cla = claDe(pessoa.id);
    return textos.CONSULTA(pessoa.nome, cla, cla ? membroDe(cla, pessoa.id)?.cargo : undefined, cla ? nomeLider(cla) : "", !!porId(pessoa.id));
  });
}

// ---------------------------------------------------------------- guerras

/**
 * Começa uma guerra AGORA entre dois times: sem aviso, sem custo, sem baú e sem os requisitos de nível,
 * membros e recarga. Fica marcada como forçada (na guerra e no histórico). Modo evento: com minutos, dura
 * isso em vez de duracaoGuerraHoras. Sem bandeira num dos times, a guerra vale só pelos abates (sem CTF).
 * @param {Player} autor
 * @param {string} refA
 * @param {string} refB
 * @param {unknown} [minutosBruto]  vazio ou 0 = a duração padrão
 */
export function iniciarGuerra(autor, refA, refB, minutosBruto) {
  const alvoLog = `${textoDe(refA)} x ${textoDe(refB)}${minutosBruto ? ` (${textoDe(minutosBruto)} min)` : ""}`;
  return executar(autor, "iniciar guerra", alvoLog, () => {
    const a = acharTime(refA);
    if (!a) return { erro: textos.TIME_NAO_ACHADO(textoDe(refA)) };
    const b = acharTime(refB);
    if (!b) return { erro: textos.TIME_NAO_ACHADO(textoDe(refB)) };
    if (a.id === b.id) return { erro: textos.MESMO_TIME };
    if (guerraDe(a.id)) return { erro: textos.JA_EM_GUERRA(a.tag) };
    if (guerraDe(b.id)) return { erro: textos.JA_EM_GUERRA(b.tag) };
    const pedidos = minutosBruto === undefined || textoDe(minutosBruto) === "" ? 0 : Number(textoDe(minutosBruto));
    if (!Number.isInteger(pedidos) || pedidos < 0 || pedidos > MINUTOS_MAXIMO) return { erro: textos.MINUTOS_INVALIDOS(MINUTOS_MAXIMO) };
    const minutos = pedidos || Math.max(1, config().duracaoGuerraHoras) * 60;
    const estado = lerEstado();
    const agora = Date.now();
    let n = agora;
    const usado = (/** @type {string} */ id) => estado.guerras.some((g) => g.id === id) || estado.historico.some((h) => h.id === id);
    while (usado(n.toString(36))) n++;
    /** @type {Guerra} */
    const g = {
      id: n.toString(36),
      a: a.id,
      b: b.id,
      tags: { a: a.tag, b: b.tag },
      cores: { a: a.cor, b: b.cor },
      declarada: agora,
      inicio: agora,
      fim: agora + minutos * MINUTO_MS,
      estado: "aviso",
      lembrou: true,
      aposta: { a: 0, b: 0 },
      pontos: { a: 0, b: 0 },
      abates: {},
      recentes: {},
      seq: {},
      cabecas: {},
      forcada: true,
    };
    estado.guerras.push(g);
    iniciar(g);
    return textos.GUERRA_INICIADA(g, minutos);
  });
}

/**
 * Soma (ou define) os pontos de um lado de uma guerra em andamento.
 * @param {Player} autor
 * @param {string} refGuerra  id da guerra ou tag de um dos times
 * @param {string} refLado  tag do lado (ou "a"/"b")
 * @param {unknown} valorBruto
 * @param {boolean} [definir]  true = define o valor; false = soma (aceita negativo)
 */
export function alterarPontos(autor, refGuerra, refLado, valorBruto, definir = false) {
  return executar(autor, definir ? "definir pontos" : "somar pontos", `${textoDe(refGuerra)} ${textoDe(refLado)} ${textoDe(valorBruto)}`, () => {
    const { g, fim } = acharGuerra(refGuerra);
    if (!g) return { erro: fim ? textos.JA_FINALIZADA : textos.GUERRA_NAO_ACHADA(textoDe(refGuerra)) };
    const lado = ladoDe(g, refLado);
    if (!lado) return { erro: textos.LADO_INVALIDO(textoDe(refLado)) };
    const valor = Number(valorBruto);
    if (!Number.isInteger(valor) || Math.abs(valor) > PONTOS_MAXIMO || (definir && valor < 0)) return { erro: textos.VALOR_INVALIDO };
    g.pontos[lado] = Math.min(PONTOS_MAXIMO, Math.max(0, definir ? valor : g.pontos[lado] + valor));
    salvarGuerras();
    for (const id of [g.a, g.b]) avisarCla(id, textos.PONTOS_AVISO(g));
    return textos.PONTOS_ALTERADOS(g);
  });
}

/**
 * Finaliza na hora: vence quem tem mais pontos, ou o lado escolhido. Usa o mesmo fim do jogo (terminar):
 * a guerra sai da lista antes de pagar, então o baú é pago uma vez só.
 * @param {Player} autor
 * @param {string} refGuerra
 * @param {string} [refVencedor]
 */
export function finalizarGuerra(autor, refGuerra, refVencedor) {
  return executar(autor, "finalizar guerra", `${textoDe(refGuerra)}${refVencedor ? ` vence ${textoDe(refVencedor)}` : ""}`, () => {
    const { g, fim } = acharGuerra(refGuerra);
    if (!g) return { erro: fim ? textos.JA_FINALIZADA : textos.GUERRA_NAO_ACHADA(textoDe(refGuerra)) };
    /** @type {Lado | undefined} */
    let lado;
    if (refVencedor !== undefined && textoDe(refVencedor) !== "") {
      lado = ladoDe(g, refVencedor);
      if (!lado) return { erro: textos.LADO_INVALIDO(textoDe(refVencedor)) };
    }
    if (!terminar(g, "dono", lado)) return { erro: textos.JA_FINALIZADA };
    return textos.GUERRA_FINALIZADA(lerEstado().historico[0]);
  });
}

/**
 * Cancela: sem vencedor e sem prêmio; cada lado recebe a sua aposta de volta (como no empate).
 * @param {Player} autor
 * @param {string} refGuerra
 */
export function cancelarGuerra(autor, refGuerra) {
  return executar(autor, "cancelar guerra", textoDe(refGuerra), () => {
    const { g, fim } = acharGuerra(refGuerra);
    if (!g) return { erro: fim ? textos.JA_FINALIZADA : textos.GUERRA_NAO_ACHADA(textoDe(refGuerra)) };
    if (!terminar(g, "cancelada", null)) return { erro: textos.JA_FINALIZADA };
    return textos.GUERRA_CANCELADA(lerEstado().historico[0]);
  });
}

/**
 * Define o vencedor. Em andamento: finaliza com esse vencedor (leva o baú). Já finalizada: corrige só o
 * histórico, e só se nenhum baú foi pago (para não pagar duas vezes).
 * @param {Player} autor
 * @param {string} refGuerra
 * @param {string} refVencedor
 */
export function definirVencedor(autor, refGuerra, refVencedor) {
  return executar(autor, "definir vencedor", `${textoDe(refGuerra)} vence ${textoDe(refVencedor)}`, () => {
    const { g, fim } = acharGuerra(refGuerra);
    if (g) {
      const lado = ladoDe(g, refVencedor);
      if (!lado) return { erro: textos.LADO_INVALIDO(textoDe(refVencedor)) };
      if (!terminar(g, "dono", lado)) return { erro: textos.JA_FINALIZADA };
      return textos.GUERRA_FINALIZADA(lerEstado().historico[0]);
    }
    if (!fim) return { erro: textos.GUERRA_NAO_ACHADA(textoDe(refGuerra)) };
    const lado = ladoDe(fim, refVencedor);
    if (!lado) return { erro: textos.LADO_INVALIDO(textoDe(refVencedor)) };
    if (fim.vencedor === lado) return { erro: textos.JA_VENCEDOR(fim.tags[lado]) };
    if (fim.premio > 0) return { erro: textos.PREMIO_JA_PAGO(fim) };
    fim.vencedor = lado;
    fim.porDono = true;
    salvarGuerras();
    return textos.VENCEDOR_CORRIGIDO(fim);
  });
}

/**
 * Guerras em andamento e finalizadas (histórico).
 * @param {Player} autor
 */
export function listarGuerras(autor) {
  return executar(autor, "consultar guerras", "", () => {
    const estado = lerEstado();
    return textos.LISTA_GUERRAS(estado.guerras, estado.historico);
  });
}

/**
 * As últimas linhas do log do dono, no chat.
 * @param {Player} autor
 * @param {number} [quantas]
 */
export function mostrarLog(autor, quantas = 10) {
  return executar(autor, "ver log", "", () => {
    const log = logDono().slice(0, quantas);
    return log.length ? log.map(textos.LINHA_LOG).join("\n") : textos.LOG_VAZIO;
  });
}
