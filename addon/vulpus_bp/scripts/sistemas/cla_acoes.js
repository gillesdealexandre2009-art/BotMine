// @ts-check
// Ações dos clãs (com as mensagens da Kiza): criar, convites e pedidos, cargos, sair, dissolver, banco,
// evoluir, ajustes, casas, alianças, confiança e o chat do clã. Menus em sistemas/clas.js.
// Cada ação confere tudo de novo na hora (o form pode estar velho) e grava de uma vez com editarCla.
import { Player, world } from "@minecraft/server";
import { SONS } from "../config.js";
import { config } from "../core/db.js";
import { temPalavrao } from "../core/filtro.js";
import { online, porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { localDe, teleportar } from "../core/teleporte.js";
import { diaBrasilia, erro, msg, ok, som } from "../core/util.js";
import { temaValido } from "../cores.js";
import * as textos from "../textos/clas.js";
import { PREFIXO } from "../textos/geral.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import {
  acima,
  apagarCla,
  CARGOS_CLA,
  claDe,
  claPorId,
  CORES_CLA,
  defNivel,
  editarCla,
  EMBLEMAS,
  ESTILOS_BANDEIRA,
  infoNivelCla,
  LIMITES,
  membroDe,
  moverBanco,
  novoCla,
  pedidosValidos,
  PERMISSOES,
  pode,
  problemaNome,
  problemaTag,
  registrarAporte,
  registrarLog,
  saqueDisponivel,
  todosClas,
  VALOR_MAXIMO,
} from "./cla_dados.js";
import { encerrarGuerrasDe, guerraDe, ladoDe, trocarTagNasGuerras } from "./cla_guerra.js";
import { expandirBase } from "./cla_terreno.js";
import { nomeVisivel, temSelo } from "./kitsune.js";

/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {import("./cla_dados.js").CargoCla} CargoCla */
/** @typedef {import("./cla_dados.js").Permissao} Permissao */
/** @typedef {{ claId: string, de: string, expira: number }} Convite */

const CONVITE_MS = 5 * 60 * 1000;
const CONVITES_MAXIMO = 5;
const CHAT_MAXIMO = 200;

/** @type {Map<string, Convite[]>} id de quem foi convidado → convites (só em memória) */
const convites = new Map();

/**
 * @param {Player} player
 * @param {string} texto
 * @returns {false}
 */
function falhar(player, texto) {
  erro(player, texto);
  return false;
}

/**
 * Mensagem para quem está online no clã (com som opcional), menos quem for passado em exceto.
 * @param {string} claId
 * @param {string} texto
 * @param {{ som?: string, exceto?: string, permissao?: Permissao }} [opcoes]  permissao = só quem tem
 */
export function avisarCla(claId, texto, opcoes = {}) {
  const cla = claPorId(claId);
  if (!cla) return;
  for (const p of online()) {
    if (p.id === opcoes.exceto || !membroDe(cla, p.id)) continue;
    if (opcoes.permissao && !pode(cla, p.id, opcoes.permissao)) continue;
    msg(p, texto);
    if (opcoes.som) som(p, opcoes.som);
  }
}

/**
 * Clã de quem chamou, já conferindo a permissão. Avisa e devolve undefined se não der.
 * @param {Player} player
 * @param {Permissao} [permissao]
 * @returns {Cla | undefined}
 */
function meuCla(player, permissao) {
  const cla = claDe(player);
  if (!cla) {
    erro(player, textos.SEM_CLA);
    return undefined;
  }
  if (permissao && !pode(cla, player.id, permissao)) {
    erro(player, textos.SEM_PERMISSAO);
    return undefined;
  }
  return cla;
}

/** Espaços nas pontas saem, espaço repetido vira um, códigos § e glyphs (selos falsos) somem (também no Painel de Dono). @param {string} t */
export const limpar = (t) => t.replace(/§./g, "").replace(/[-]/g, "").trim().replace(/\s+/g, " ");

/**
 * Valor inteiro entre 1 e VALOR_MAXIMO, ou undefined.
 * @param {unknown} valor
 */
function valorValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= VALOR_MAXIMO ? n : undefined;
}

// ---------------------------------------------------------------- criar e entrar

/**
 * Cria um clã: cobra custoCriarCla Caudas e deixa quem criou como líder.
 * @param {Player} player
 * @param {string} nomeBruto
 * @param {string} tagBruta
 * @param {string} cor  código § sem o § (uma das cores do nível 1)
 * @returns {boolean}
 */
export function criarCla(player, nomeBruto, tagBruta, cor) {
  if (claDe(player)) return falhar(player, textos.JA_TEM_CLA);
  const nome = limpar(nomeBruto);
  const tag = tagBruta.replace(/§./g, "").trim().toUpperCase();
  const problema = problemaNome(nome, undefined, temPalavrao);
  if (problema) return falhar(player, textos.NOME_PROBLEMA[problema]);
  const problemaT = problemaTag(tag, undefined, temPalavrao);
  if (problemaT) return falhar(player, textos.TAG_PROBLEMA[problemaT]);
  const custo = Math.max(0, Math.floor(config().custoCriarCla));
  if (saldo(player) < custo) return falhar(player, textos.SEM_CAUDAS(custo));
  const corOk = CORES_CLA.slice(0, defNivel(1).cores).includes(cor) ? cor : CORES_CLA[0];
  if (custo > 0) adicionarCaudas(player, -custo);
  const cla = novoCla({ id: player.id, nome: player.name }, { nome, tag, cor: corOk });
  if (!cla) {
    if (custo > 0) adicionarCaudas(player, custo);
    return falhar(player, textos.ERRO_GRAVAR);
  }
  convites.delete(player.id);
  tirarPedidos(player.id);
  world.sendMessage(PREFIXO + textos.CLA_CRIADO_ANUNCIO(cla, nomeVisivel(player)));
  ok(player, textos.CLA_CRIADO(cla, custo));
  return true;
}

/**
 * Convites ainda válidos de alguém (os vencidos e os de clãs que sumiram saem).
 * @param {string} id
 * @returns {Convite[]}
 */
export function convitesDe(id) {
  const agora = Date.now();
  const lista = (convites.get(id) ?? []).filter((c) => c.expira > agora && claPorId(c.claId));
  if (lista.length) convites.set(id, lista);
  else convites.delete(id);
  return lista;
}

/**
 * Convida alguém online para o clã (vale 5 min).
 * @param {Player} player
 * @param {Player} alvo
 * @returns {boolean}
 */
export function convidar(player, alvo) {
  const cla = meuCla(player, "convidar");
  if (!cla) return false;
  if (!alvo.isValid) return falhar(player, textos.OFFLINE);
  if (alvo.id === player.id) return falhar(player, textos.CONVITE_SI_MESMO);
  if (claDe(alvo)) return falhar(player, textos.CONVITE_JA_TEM(alvo.name));
  if (cla.membros.length >= defNivel(cla.nivel).membros) return falhar(player, textos.CLA_CHEIO(defNivel(cla.nivel).membros));
  const lista = convitesDe(alvo.id).filter((c) => c.claId !== cla.id);
  lista.push({ claId: cla.id, de: player.name, expira: Date.now() + CONVITE_MS });
  convites.set(alvo.id, lista.slice(-CONVITES_MAXIMO));
  msg(alvo, textos.CONVITE_RECEBIDO(cla, nomeVisivel(player)));
  som(alvo, SONS.pedido);
  ok(player, textos.CONVITE_ENVIADO(alvo.name));
  return true;
}

/**
 * Convite pela tag (ou o único que houver).
 * @param {Player} player
 * @param {string} [tag]
 * @returns {Convite | undefined}
 */
function acharConvite(player, tag) {
  const lista = convitesDe(player.id);
  if (!lista.length) {
    erro(player, textos.SEM_CONVITE);
    return undefined;
  }
  if (tag) {
    const procurada = tag.trim().toUpperCase();
    const achado = lista.find((c) => claPorId(c.claId)?.tag === procurada);
    if (!achado) erro(player, textos.SEM_CONVITE_TAG(procurada));
    return achado;
  }
  if (lista.length > 1) {
    erro(player, textos.VARIOS_CONVITES);
    return undefined;
  }
  return lista[0];
}

/**
 * Aceita um convite (pela tag, ou o único).
 * @param {Player} player
 * @param {string} [tag]
 * @returns {boolean}
 */
export function aceitarConvite(player, tag) {
  const convite = acharConvite(player, tag);
  return convite ? entrar(player, convite.claId) : false;
}

/**
 * Recusa um convite (pela tag, ou o único).
 * @param {Player} player
 * @param {string} [tag]
 * @returns {boolean}
 */
export function recusarConvite(player, tag) {
  const convite = acharConvite(player, tag);
  if (!convite) return false;
  convites.set(player.id, convitesDe(player.id).filter((c) => c !== convite));
  const cla = claPorId(convite.claId);
  msg(player, textos.CONVITE_RECUSADO);
  if (cla) avisarCla(cla.id, textos.CONVITE_RECUSOU(nomeVisivel(player)), { permissao: "convidar" });
  return true;
}

/**
 * Tira os pedidos de entrada da pessoa em todos os clãs (entrou num clã ou criou o seu).
 * @param {string} id
 */
function tirarPedidos(id) {
  for (const cla of todosClas()) {
    if (cla.pedidos.some((p) => p.id === id)) {
      editarCla(cla.id, (c) => {
        c.pedidos = c.pedidos.filter((p) => p.id !== id);
      });
    }
  }
}

/**
 * Coloca a pessoa no clã como Recruta (convite aceito, clã aberto ou pedido aprovado).
 * @param {Player} player
 * @param {string} claId
 * @returns {boolean}
 */
function entrar(player, claId) {
  if (claDe(player)) return falhar(player, textos.JA_TEM_CLA);
  const cla = claPorId(claId);
  if (!cla) return falhar(player, textos.CLA_SUMIU);
  if (cla.membros.length >= defNivel(cla.nivel).membros) return falhar(player, textos.CLA_CHEIO(defNivel(cla.nivel).membros));
  const novo = editarCla(cla.id, (c) => {
    c.membros.push({ id: player.id, nome: player.name, cargo: "recruta", desde: Date.now(), saque: { dia: "", valor: 0 } });
    c.pedidos = c.pedidos.filter((p) => p.id !== player.id);
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  convites.delete(player.id);
  tirarPedidos(player.id);
  avisarCla(cla.id, textos.ENTROU(nomeVisivel(player)), { exceto: player.id, som: SONS.ok });
  ok(player, textos.BEM_VINDO_CLA(novo));
  return true;
}

/**
 * Clã aberto: entra direto. Fechado: deixa um pedido para quem pode convidar aprovar.
 * @param {Player} player
 * @param {string} claId
 * @returns {boolean}
 */
export function entrarOuPedir(player, claId) {
  if (claDe(player)) return falhar(player, textos.JA_TEM_CLA);
  const cla = claPorId(claId);
  if (!cla) return falhar(player, textos.CLA_SUMIU);
  if (cla.aberto) return entrar(player, cla.id);
  if (pedidosValidos(cla).some((p) => p.id === player.id)) return falhar(player, textos.JA_PEDIU);
  if (pedidosValidos(cla).length >= LIMITES.pedidos) return falhar(player, textos.PEDIDOS_CHEIOS);
  const novo = editarCla(cla.id, (c) => {
    c.pedidos = pedidosValidos(c).filter((p) => p.id !== player.id);
    c.pedidos.push({ id: player.id, nome: player.name, t: Date.now() });
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  ok(player, textos.PEDIDO_ENVIADO(cla));
  avisarCla(cla.id, textos.PEDIDO_NOVO(nomeVisivel(player)), { permissao: "convidar", som: SONS.pedido });
  return true;
}

/**
 * Aprova (ou recusa) um pedido de entrada.
 * @param {Player} player
 * @param {string} pedidoId  id de quem pediu
 * @param {boolean} aprovar
 * @returns {boolean}
 */
export function responderPedido(player, pedidoId, aprovar) {
  const cla = meuCla(player, "convidar");
  if (!cla) return false;
  const pedido = pedidosValidos(cla).find((p) => p.id === pedidoId);
  if (!pedido) return falhar(player, textos.PEDIDO_SUMIU);
  const quem = porId(pedidoId);
  const tirar = () =>
    editarCla(cla.id, (c) => {
      c.pedidos = c.pedidos.filter((p) => p.id !== pedidoId);
    });
  if (!aprovar) {
    tirar();
    ok(player, textos.PEDIDO_RECUSADO(pedido.nome));
    if (quem) msg(quem, textos.PEDIDO_RECUSADO_AVISO(cla));
    return true;
  }
  if (claDe(pedidoId)) {
    tirar();
    return falhar(player, textos.CONVITE_JA_TEM(pedido.nome));
  }
  if (cla.membros.length >= defNivel(cla.nivel).membros) return falhar(player, textos.CLA_CHEIO(defNivel(cla.nivel).membros));
  const novo = editarCla(cla.id, (c) => {
    c.pedidos = c.pedidos.filter((p) => p.id !== pedidoId);
    c.membros.push({ id: pedidoId, nome: pedido.nome, cargo: "recruta", desde: Date.now(), saque: { dia: "", valor: 0 } });
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  convites.delete(pedidoId);
  tirarPedidos(pedidoId);
  avisarCla(cla.id, textos.ENTROU(pedido.nome), { som: SONS.ok });
  if (quem) ok(quem, textos.BEM_VINDO_CLA(novo));
  return true;
}

// ---------------------------------------------------------------- membros e cargos

/**
 * Sai do clã (o líder precisa passar a liderança ou dissolver antes).
 * @param {Player} player
 * @returns {boolean}
 */
export function sair(player) {
  const cla = meuCla(player);
  if (!cla) return false;
  if (cla.dono === player.id) return falhar(player, textos.LIDER_NAO_SAI);
  const novo = editarCla(cla.id, (c) => {
    c.membros = c.membros.filter((m) => m.id !== player.id);
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  ok(player, textos.SAIU_OK(cla));
  avisarCla(cla.id, textos.SAIU(nomeVisivel(player)));
  return true;
}

/**
 * Tira alguém de cargo menor do clã.
 * @param {Player} player
 * @param {string} alvoId
 * @returns {boolean}
 */
export function expulsar(player, alvoId) {
  const cla = meuCla(player, "expulsar");
  if (!cla) return false;
  const eu = membroDe(cla, player.id);
  const alvo = membroDe(cla, alvoId);
  if (!eu || !alvo) return falhar(player, textos.MEMBRO_SUMIU);
  if (!acima(eu.cargo, alvo.cargo)) return falhar(player, textos.CARGO_ACIMA);
  const novo = editarCla(cla.id, (c) => {
    c.membros = c.membros.filter((m) => m.id !== alvoId);
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  avisarCla(cla.id, textos.EXPULSO(alvo.nome, nomeVisivel(player)));
  const quem = porId(alvoId);
  if (quem) erro(quem, textos.EXPULSO_AVISO(cla));
  return true;
}

/**
 * Sobe (+1) ou desce (-1) o cargo de alguém. Só mexe em quem está abaixo, e nunca acima do próprio cargo
 * (o líder promove até Vice; liderança só por transferência).
 * @param {Player} player
 * @param {string} alvoId
 * @param {1 | -1} passo
 * @returns {boolean}
 */
export function mudarCargo(player, alvoId, passo) {
  const cla = meuCla(player, "promover");
  if (!cla) return false;
  const eu = membroDe(cla, player.id);
  const alvo = membroDe(cla, alvoId);
  if (!eu || !alvo) return falhar(player, textos.MEMBRO_SUMIU);
  if (!acima(eu.cargo, alvo.cargo)) return falhar(player, textos.CARGO_ACIMA);
  const indice = CARGOS_CLA.indexOf(alvo.cargo) - passo;
  const novoCargo = CARGOS_CLA[indice];
  if (!novoCargo || novoCargo === "lider") return falhar(player, passo > 0 ? textos.CARGO_TETO : textos.CARGO_PISO);
  if (passo > 0 && !acima(eu.cargo, novoCargo)) return falhar(player, textos.CARGO_TETO);
  const novo = editarCla(cla.id, (c) => {
    const m = membroDe(c, alvoId);
    if (m) m.cargo = novoCargo;
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  avisarCla(cla.id, textos.CARGO_MUDOU(alvo.nome, novoCargo, passo > 0));
  return true;
}

/**
 * Passa a liderança (quem chama já confirmou). O líder antigo vira Vice.
 * @param {Player} player
 * @param {string} alvoId
 * @returns {boolean}
 */
export function transferirLideranca(player, alvoId) {
  const cla = meuCla(player);
  if (!cla) return false;
  if (cla.dono !== player.id) return falhar(player, textos.SO_LIDER);
  const alvo = membroDe(cla, alvoId);
  if (!alvo || alvoId === player.id) return falhar(player, textos.MEMBRO_SUMIU);
  const novo = editarCla(cla.id, (c) => {
    c.dono = alvoId;
    for (const m of c.membros) {
      if (m.id === alvoId) m.cargo = "lider";
      else if (m.id === player.id) m.cargo = "vice";
    }
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  avisarCla(cla.id, textos.NOVO_LIDER(alvo.nome), { som: SONS.pedido });
  return true;
}

/**
 * Acaba com o clã: uma guerra em andamento conta como rendição e o banco volta para o líder.
 * @param {Cla} cla
 * @returns {number | undefined} Caudas devolvidas (undefined se não apagou)
 */
function acabarCla(cla) {
  encerrarGuerrasDe(cla.id);
  const atual = claPorId(cla.id);
  if (!atual || !apagarCla(cla.id)) return undefined;
  // Time sem líder (Painel de Dono): não há para quem devolver o banco.
  const devolvido = atual.dono ? atual.banco : 0;
  if (devolvido > 0) adicionarCaudas(atual.dono, devolvido);
  for (const [id, lista] of convites) convites.set(id, lista.filter((c) => c.claId !== cla.id));
  return devolvido;
}

/**
 * O líder dissolve o clã (quem chama já pediu a confirmação dupla).
 * @param {Player} player
 * @returns {boolean}
 */
export function dissolver(player) {
  const cla = meuCla(player);
  if (!cla) return false;
  if (cla.dono !== player.id) return falhar(player, textos.SO_LIDER);
  avisarCla(cla.id, textos.DISSOLVIDO_AVISO(cla), { exceto: player.id });
  const devolvido = acabarCla(cla);
  if (devolvido === undefined) return falhar(player, textos.ERRO_GRAVAR);
  world.sendMessage(PREFIXO + textos.DISSOLVIDO_ANUNCIO(cla));
  ok(player, textos.DISSOLVIDO_OK(devolvido));
  return true;
}

/**
 * Staff remove um clã (o banco volta para o líder, mesmo offline).
 * @param {Player} staff
 * @param {string} claId
 * @returns {boolean}
 */
export function removerPelaStaff(staff, claId) {
  if (!ehStaff(staff)) return falhar(staff, textos.SO_STAFF);
  const cla = claPorId(claId);
  if (!cla) return falhar(staff, textos.CLA_SUMIU);
  avisarCla(cla.id, textos.REMOVIDO_AVISO(cla));
  const devolvido = acabarCla(cla);
  if (devolvido === undefined) return falhar(staff, textos.ERRO_GRAVAR);
  registrarLog(staff.name, textos.LOG_REMOVEU(cla.tag, cla.nome, devolvido));
  ok(staff, textos.STAFF_REMOVEU(cla, devolvido));
  return true;
}

/**
 * Staff troca a tag de um clã.
 * @param {Player} staff
 * @param {string} claId
 * @param {string} tagBruta
 * @returns {boolean}
 */
export function mudarTagPelaStaff(staff, claId, tagBruta) {
  if (!ehStaff(staff)) return falhar(staff, textos.SO_STAFF);
  const cla = claPorId(claId);
  if (!cla) return falhar(staff, textos.CLA_SUMIU);
  const tag = tagBruta.replace(/§./g, "").trim().toUpperCase();
  const problema = problemaTag(tag, cla.id, temPalavrao);
  if (problema) return falhar(staff, textos.TAG_PROBLEMA[problema]);
  const antiga = cla.tag;
  if (
    !editarCla(cla.id, (c) => {
      c.tag = tag;
    })
  ) {
    return falhar(staff, textos.ERRO_GRAVAR);
  }
  trocarTagNasGuerras(cla.id, tag);
  registrarLog(staff.name, textos.LOG_TAG(antiga, tag));
  ok(staff, textos.STAFF_TAG(antiga, tag));
  avisarCla(cla.id, textos.TAG_TROCADA_AVISO(tag));
  return true;
}

// ---------------------------------------------------------------- banco e nível

/**
 * Deposita Caudas no banco do clã (a parte que passa do maior aporte vira XP do clã).
 * @param {Player} player
 * @param {unknown} valorBruto
 * @returns {boolean}
 */
export function depositar(player, valorBruto) {
  const cla = meuCla(player);
  if (!cla) return false;
  const valor = valorValido(valorBruto);
  if (!valor) return falhar(player, textos.VALOR_INVALIDO(VALOR_MAXIMO));
  if (saldo(player) < valor) return falhar(player, textos.SEM_CAUDAS(valor));
  const novo = editarCla(cla.id, (c) => {
    if (!moverBanco(c, "deposito", valor, player.name)) return false;
    registrarAporte(c, valor);
  });
  if (!novo) return falhar(player, textos.BANCO_FALHOU);
  adicionarCaudas(player, -valor);
  ok(player, textos.DEPOSITOU(valor, novo.banco));
  return true;
}

/**
 * Saca do banco (só com a permissão e dentro do limite do dia do cargo; o líder não tem limite).
 * @param {Player} player
 * @param {unknown} valorBruto
 * @returns {boolean}
 */
export function sacar(player, valorBruto) {
  const cla = meuCla(player, "sacar");
  if (!cla) return false;
  const valor = valorValido(valorBruto);
  if (!valor) return falhar(player, textos.VALOR_INVALIDO(VALOR_MAXIMO));
  const livre = saqueDisponivel(cla, player.id);
  if (valor > livre) return falhar(player, textos.LIMITE_SAQUE(livre));
  if (cla.banco < valor) return falhar(player, textos.BANCO_SEM_SALDO(cla.banco));
  const hoje = diaBrasilia(Date.now());
  const novo = editarCla(cla.id, (c) => {
    if (!moverBanco(c, "saque", -valor, player.name)) return false;
    registrarAporte(c, -valor);
    const m = membroDe(c, player.id);
    if (!m) return false;
    if (m.saque.dia !== hoje) m.saque = { dia: hoje, valor: 0 };
    m.saque.valor += valor;
  });
  if (!novo) return falhar(player, textos.BANCO_FALHOU);
  adicionarCaudas(player, valor);
  ok(player, textos.SACOU(valor, novo.banco));
  avisarCla(cla.id, textos.SAQUE_AVISO(nomeVisivel(player), valor), { exceto: player.id, permissao: "sacar" });
  return true;
}

/**
 * Sobe o clã de nível: precisa do XP e paga o custo com o banco. A base cresce onde couber.
 * @param {Player} player
 * @returns {boolean}
 */
export function evoluir(player) {
  const cla = meuCla(player, "editar");
  if (!cla) return false;
  const info = infoNivelCla(cla);
  if (!info.proximo) return falhar(player, textos.NIVEL_MAXIMO);
  const proximo = info.proximo;
  if (!info.xpPronto) return falhar(player, textos.FALTA_XP(proximo.xp - cla.xp));
  if (!info.bancoPronto) return falhar(player, textos.FALTA_BANCO(proximo.custo));
  const novo = editarCla(cla.id, (c) => {
    if (proximo.custo > 0 && !moverBanco(c, "nivel", -proximo.custo, player.name)) return false;
    c.nivel = proximo.nivel;
  });
  if (!novo) return falhar(player, textos.BANCO_FALHOU);
  const raio = expandirBase(novo.id);
  world.sendMessage(PREFIXO + textos.CLA_SUBIU_ANUNCIO(novo));
  for (const p of online()) {
    if (!membroDe(novo, p.id)) continue;
    som(p, SONS.nivel);
    mostrarTitulo(p, textos.TITULO_SUBIU(novo.nivel), { subtitulo: textos.SUBTITULO_SUBIU(novo) });
  }
  if (novo.base && raio < proximo.raio) msg(player, textos.BASE_APERTADA(proximo.raio));
  return true;
}

// ---------------------------------------------------------------- ajustes do clã

/**
 * Muda um ajuste simples do clã (precisa de "editar"; perms e limites só o líder).
 * @param {Player} player
 * @param {Permissao} permissao
 * @param {(c: Cla) => any} fn
 * @param {string} texto  aviso de sucesso
 * @returns {boolean}
 */
function ajustar(player, permissao, fn, texto) {
  const cla = meuCla(player, permissao);
  if (!cla) return false;
  if (!editarCla(cla.id, fn)) return falhar(player, textos.ERRO_GRAVAR);
  ok(player, texto);
  return true;
}

/**
 * @param {Player} player
 * @param {string} bruto
 * @returns {boolean}
 */
export function renomear(player, bruto) {
  const cla = meuCla(player, "editar");
  if (!cla) return false;
  const nome = limpar(bruto);
  const problema = problemaNome(nome, cla.id, temPalavrao);
  if (problema) return falhar(player, textos.NOME_PROBLEMA[problema]);
  return ajustar(player, "editar", (c) => {
    c.nome = nome;
  }, textos.RENOMEADO(nome));
}

/**
 * @param {Player} player
 * @param {string} bruto
 * @returns {boolean}
 */
export function mudarDescricao(player, bruto) {
  const desc = limpar(bruto).slice(0, LIMITES.desc);
  if (desc && temPalavrao(desc)) return falhar(player, textos.NOME_PROBLEMA.proibido);
  return ajustar(player, "editar", (c) => {
    c.desc = desc;
  }, textos.DESCRICAO_OK);
}

/**
 * Cor sólida da tag (das liberadas pelo nível). Tira o tema, se houver.
 * @param {Player} player
 * @param {string} cor
 * @returns {boolean}
 */
export function mudarCor(player, cor) {
  const cla = meuCla(player, "editar");
  if (!cla) return false;
  if (!CORES_CLA.slice(0, defNivel(cla.nivel).cores).includes(cor)) return falhar(player, textos.COR_BLOQUEADA);
  return ajustar(player, "editar", (c) => {
    c.cor = cor;
    c.tema = "";
    c.temaPor = "";
  }, textos.COR_OK);
}

/**
 * Tema de cor (degradê) da tag e do nome do clã: só quem tem o selo Kitsune escolhe ("" tira).
 * @param {Player} player
 * @param {string} tema
 * @returns {boolean}
 */
export function mudarTemaCla(player, tema) {
  if (!temSelo(player)) return falhar(player, textos.TEMA_SO_KITSUNE);
  if (tema !== "" && !temaValido(tema)) return false;
  return ajustar(player, "editar", (c) => {
    c.tema = tema;
    c.temaPor = tema ? player.id : "";
  }, textos.COR_OK);
}

/**
 * Estilo Kitsune da bandeira do clã (só visual): só quem tem o selo e pode editar o clã escolhe ("" volta para
 * a bandeira padrão na cor do clã). A entidade troca na próxima conferência (aoMudarCla → ctf.js).
 * @param {Player} player
 * @param {string} estilo
 * @returns {boolean}
 */
export function mudarEstiloBandeira(player, estilo) {
  if (!temSelo(player)) return falhar(player, textos.ESTILO_SO_KITSUNE);
  if (estilo !== "" && !ESTILOS_BANDEIRA.includes(estilo)) return false;
  return ajustar(player, "editar", (c) => {
    c.estiloBandeira = estilo;
    c.estiloPor = estilo ? player.id : "";
  }, textos.ESTILO_OK(estilo));
}

/**
 * Quem perdeu o selo Kitsune perde também o tema e o estilo de bandeira que escolheu para o clã: a tag e o nome
 * voltam para a cor sólida de antes (ou a primeira, se ela não estiver liberada) e a bandeira volta para a padrão
 * na cor do clã. Só mexe no que essa pessoa escolheu (se outro Kitsune trocou depois, fica). Vale também para o
 * clã de onde ela já saiu. Chamado ao entrar e na checagem periódica (o selo só some com a pessoa online, mas pode
 * sumir entre sessões).
 * @param {Player} player
 * @returns {number} quantos clãs mudaram
 */
export function conferirTemaKitsune(player) {
  if (!player.isValid || temSelo(player)) return 0;
  let voltaram = 0;
  for (const cla of todosClas()) {
    const tema = !!cla.tema && cla.temaPor === player.id;
    const estilo = !!cla.estiloBandeira && cla.estiloPor === player.id;
    if (!tema && !estilo) continue;
    /** @type {{ tema: boolean, estilo: boolean }} */
    const saiu = { tema: false, estilo: false };
    const novo = editarCla(cla.id, (c) => {
      if (c.tema && c.temaPor === player.id) {
        c.tema = "";
        c.temaPor = "";
        if (!CORES_CLA.slice(0, defNivel(c.nivel).cores).includes(c.cor)) c.cor = CORES_CLA[0];
        saiu.tema = true;
      }
      if (c.estiloBandeira && c.estiloPor === player.id) {
        c.estiloBandeira = "";
        c.estiloPor = "";
        saiu.estilo = true;
      }
      if (!saiu.tema && !saiu.estilo) return false;
    });
    if (!novo) continue;
    voltaram++;
    for (const texto of [saiu.tema ? textos.TEMA_KITSUNE_VOLTOU(player.name, novo) : "", saiu.estilo ? textos.ESTILO_KITSUNE_VOLTOU(player.name, novo) : ""]) {
      if (!texto) continue;
      avisarCla(novo.id, texto);
      if (!membroDe(novo, player.id)) msg(player, texto);
    }
  }
  return voltaram;
}

/**
 * @param {Player} player
 * @param {number} indice  em EMBLEMAS
 * @returns {boolean}
 */
export function mudarEmblema(player, indice) {
  const cla = meuCla(player, "editar");
  if (!cla) return false;
  if (!Number.isInteger(indice) || indice < 0 || indice >= Math.min(EMBLEMAS.length, defNivel(cla.nivel).emblemas)) {
    return falhar(player, textos.EMBLEMA_BLOQUEADO);
  }
  return ajustar(player, "editar", (c) => {
    c.emblema = indice;
  }, textos.EMBLEMA_OK);
}

/**
 * Alterna aberto/fechado, acesso dos aliados ou fogo amigo.
 * @param {Player} player
 * @param {"aberto" | "acessoAliados" | "fogoAmigo"} chave
 * @returns {boolean}
 */
export function alternarAjuste(player, chave) {
  const cla = meuCla(player, chave === "acessoAliados" ? "terreno" : "editar");
  if (!cla) return false;
  const valor = !cla[chave];
  return ajustar(player, chave === "acessoAliados" ? "terreno" : "editar", (c) => {
    c[chave] = valor;
  }, textos.AJUSTE_MUDOU(chave, valor));
}

/**
 * Líder define as permissões e o limite de saque por dia de um cargo.
 * @param {Player} player
 * @param {Exclude<CargoCla, "lider">} cargo
 * @param {Permissao[]} perms
 * @param {number} limite
 * @returns {boolean}
 */
export function definirCargoPerms(player, cargo, perms, limite) {
  const cla = meuCla(player);
  if (!cla) return false;
  if (cla.dono !== player.id) return falhar(player, textos.SO_LIDER);
  if (!CARGOS_CLA.includes(cargo) || /** @type {CargoCla} */ (cargo) === "lider") return false;
  // NaN aqui viraria "sem limite" (valor > NaN é sempre falso): número estranho conta como 0.
  const teto = Number.isFinite(limite) ? Math.max(0, Math.min(VALOR_MAXIMO, Math.floor(limite))) : 0;
  return ajustar(player, "editar", (c) => {
    c.perms[cargo] = PERMISSOES.filter((p) => perms.includes(p));
    c.limites[cargo] = teto;
  }, textos.PERMS_OK(cargo));
}

// ---------------------------------------------------------------- casas do clã

/**
 * Casa do clã onde a pessoa está (custo no banco; limite pelo nível).
 * @param {Player} player
 * @param {string} bruto
 * @returns {boolean}
 */
export function criarCasaCla(player, bruto) {
  const cla = meuCla(player, "terreno");
  if (!cla) return false;
  const nome = limpar(bruto) || textos.CASA_PADRAO;
  if ([...nome].length > LIMITES.nomeCasa) return falhar(player, textos.CASA_NOME_LONGO(LIMITES.nomeCasa));
  if (cla.casas.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return falhar(player, textos.CASA_REPETIDA);
  const limite = defNivel(cla.nivel).casas;
  if (cla.casas.length >= limite) return falhar(player, textos.CASA_LIMITE(limite));
  const custo = Math.max(0, Math.floor(config().custoCasaCla));
  if (cla.banco < custo) return falhar(player, textos.BANCO_SEM_SALDO(cla.banco));
  const local = localDe(player);
  const novo = editarCla(cla.id, (c) => {
    if (custo > 0 && !moverBanco(c, "casa", -custo, player.name)) return false;
    c.casas.push({ nome, ...local });
  });
  if (!novo) return falhar(player, textos.BANCO_FALHOU);
  ok(player, textos.CASA_CRIADA(nome, custo));
  avisarCla(cla.id, textos.CASA_AVISO(nome), { exceto: player.id });
  return true;
}

/**
 * @param {Player} player
 * @param {string} nome
 * @returns {boolean}
 */
export function apagarCasaCla(player, nome) {
  const cla = meuCla(player, "terreno");
  if (!cla) return false;
  if (!cla.casas.some((c) => c.nome === nome)) return falhar(player, textos.CASA_SUMIU);
  return ajustar(player, "terreno", (c) => {
    c.casas = c.casas.filter((x) => x.nome !== nome);
  }, textos.CASA_APAGADA(nome));
}

/**
 * Teleporte para uma casa do clã (sem nome: a primeira), com o efeito do tema "cla".
 * @param {Player} player
 * @param {string} [nome]
 * @returns {boolean}
 */
export function irCasaCla(player, nome) {
  const cla = meuCla(player);
  if (!cla) return false;
  const procurada = nome?.trim().toLowerCase();
  const casa = procurada ? cla.casas.find((c) => c.nome.toLowerCase() === procurada) : cla.casas[0];
  if (!casa) return falhar(player, cla.casas.length ? textos.CASA_SUMIU : textos.SEM_CASAS);
  const claId = cla.id;
  const nomeCasa = casa.nome;
  return teleportar(
    player,
    () => {
      // Resolve na hora: a casa pode ter sido apagada (ou a pessoa ter saído do clã) durante a espera.
      const atual = claDe(player);
      return atual?.id === claId ? atual.casas.find((c) => c.nome === nomeCasa) : undefined;
    },
    { nome: textos.DESTINO_CASA(cla, nomeCasa), tema: "cla" },
  );
}

// ---------------------------------------------------------------- alianças e confiança

/**
 * Pede aliança (ou aceita, se o outro clã já tinha pedido).
 * @param {Player} player
 * @param {string} outroId
 * @returns {boolean}
 */
export function pedirAlianca(player, outroId) {
  const cla = meuCla(player, "guerra");
  if (!cla) return false;
  const outro = claPorId(outroId);
  if (!outro || outro.id === cla.id) return falhar(player, textos.CLA_SUMIU);
  if (cla.aliados.includes(outro.id)) return falhar(player, textos.JA_ALIADOS);
  if (cla.pedidosAlianca.includes(outro.id)) return responderAlianca(player, outro.id, true);
  const g = guerraDe(cla.id);
  if (g && ladoDe(g, outro.id)) return falhar(player, textos.ALIANCA_EM_GUERRA);
  if (cla.aliados.length >= LIMITES.aliados || outro.aliados.length >= LIMITES.aliados) return falhar(player, textos.ALIADOS_CHEIO(LIMITES.aliados));
  if (outro.pedidosAlianca.includes(cla.id)) return falhar(player, textos.ALIANCA_JA_PEDIU);
  if (outro.pedidosAlianca.length >= LIMITES.pedidos) return falhar(player, textos.PEDIDOS_CHEIOS);
  const novo = editarCla(outro.id, (c) => {
    c.pedidosAlianca.push(cla.id);
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  ok(player, textos.ALIANCA_PEDIDA(outro));
  avisarCla(outro.id, textos.ALIANCA_NOVA(cla), { permissao: "guerra", som: SONS.pedido });
  return true;
}

/**
 * Aceita ou recusa um pedido de aliança.
 * @param {Player} player
 * @param {string} outroId
 * @param {boolean} aceitar
 * @returns {boolean}
 */
export function responderAlianca(player, outroId, aceitar) {
  const cla = meuCla(player, "guerra");
  if (!cla) return false;
  if (!cla.pedidosAlianca.includes(outroId)) return falhar(player, textos.PEDIDO_SUMIU);
  const outro = claPorId(outroId);
  const tirar = (/** @type {Cla} */ c) => {
    c.pedidosAlianca = c.pedidosAlianca.filter((x) => x !== outroId);
  };
  if (!aceitar || !outro) {
    editarCla(cla.id, tirar);
    ok(player, textos.ALIANCA_RECUSADA);
    if (outro) avisarCla(outro.id, textos.ALIANCA_RECUSADA_AVISO(cla), { permissao: "guerra" });
    return true;
  }
  const g = guerraDe(cla.id);
  if (g && ladoDe(g, outro.id)) return falhar(player, textos.ALIANCA_EM_GUERRA);
  if (cla.aliados.length >= LIMITES.aliados || outro.aliados.length >= LIMITES.aliados) return falhar(player, textos.ALIADOS_CHEIO(LIMITES.aliados));
  const novo = editarCla(cla.id, (c) => {
    tirar(c);
    if (!c.aliados.includes(outroId)) c.aliados.push(outroId);
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  editarCla(outro.id, (c) => {
    c.pedidosAlianca = c.pedidosAlianca.filter((x) => x !== cla.id);
    if (!c.aliados.includes(cla.id)) c.aliados.push(cla.id);
  });
  world.sendMessage(PREFIXO + textos.ALIANCA_ANUNCIO(cla, outro));
  return true;
}

/**
 * Desfaz uma aliança (dos dois lados).
 * @param {Player} player
 * @param {string} outroId
 * @returns {boolean}
 */
export function desfazerAlianca(player, outroId) {
  const cla = meuCla(player, "guerra");
  if (!cla) return false;
  if (!cla.aliados.includes(outroId)) return falhar(player, textos.NAO_ALIADOS);
  if (
    !editarCla(cla.id, (c) => {
      c.aliados = c.aliados.filter((x) => x !== outroId);
    })
  ) {
    return falhar(player, textos.ERRO_GRAVAR);
  }
  editarCla(outroId, (c) => {
    c.aliados = c.aliados.filter((x) => x !== cla.id);
  });
  const outro = claPorId(outroId);
  ok(player, textos.ALIANCA_DESFEITA(outro?.tag ?? "?"));
  if (outro) avisarCla(outro.id, textos.ALIANCA_DESFEITA_AVISO(cla));
  return true;
}

/**
 * Pessoa de fora que pode construir na base (amigo de confiança).
 * @param {Player} player
 * @param {Player} alvo
 * @returns {boolean}
 */
export function adicionarConfianca(player, alvo) {
  const cla = meuCla(player, "terreno");
  if (!cla) return false;
  if (!alvo.isValid) return falhar(player, textos.OFFLINE);
  if (membroDe(cla, alvo.id)) return falhar(player, textos.CONFIANCA_MEMBRO);
  if (cla.confianca.some((c) => c.id === alvo.id)) return falhar(player, textos.CONFIANCA_JA);
  if (cla.confianca.length >= LIMITES.confianca) return falhar(player, textos.CONFIANCA_CHEIA(LIMITES.confianca));
  if (
    !ajustar(player, "terreno", (c) => {
      c.confianca.push({ id: alvo.id, nome: alvo.name });
    }, textos.CONFIANCA_OK(alvo.name))
  ) {
    return false;
  }
  msg(alvo, textos.CONFIANCA_AVISO(cla));
  return true;
}

/**
 * @param {Player} player
 * @param {string} id
 * @returns {boolean}
 */
export function removerConfianca(player, id) {
  return ajustar(player, "terreno", (c) => {
    c.confianca = c.confianca.filter((x) => x.id !== id);
  }, textos.CONFIANCA_TIRADA);
}

// ---------------------------------------------------------------- chat do clã

/**
 * Mensagem só para quem está online no clã.
 * @param {Player} player
 * @param {string} bruto
 * @returns {boolean}
 */
export function falarNoCla(player, bruto) {
  const cla = meuCla(player);
  if (!cla) return false;
  const texto = bruto
    .replace(/§./g, "")
    .replace(/[-]/g, "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, CHAT_MAXIMO);
  if (!texto) return falhar(player, textos.CHAT_VAZIO);
  const cargo = membroDe(cla, player.id)?.cargo ?? "membro";
  const linha = textos.CHAT_CLA(cla, nomeVisivel(player), cargo, texto);
  for (const p of online()) if (membroDe(cla, p.id)) p.sendMessage(linha);
  return true;
}
