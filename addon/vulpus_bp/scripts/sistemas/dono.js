// @ts-check
// Painel de Dono (separado do painel da staff): times, guerras, donos e o log. Abre com /vulpus:dono, pelo
// botão no painel da staff ou, para dono que não é staff, pelo canto do Hub. As regras ficam em
// dono_acoes.js, que confere a permissão de novo em cada ação (o form pode estar velho).
import { DONOS, ICONES, NIVEIS_CLA } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { donosRegistrados, ehDono, logDono, registrarLogDono } from "../core/dono.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { erro, msg } from "../core/util.js";
import * as textosCla from "../textos/clas.js";
import * as textos from "../textos/dono.js";
import { claPorId, CORES_CLA, defNivel, membroDe, todosClas } from "./cla_dados.js";
import { guerraDe, lerEstado } from "./cla_guerra.js";
import * as acoes from "./dono_acoes.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {() => any} Volta */

/** Linhas do log no painel (o corpo do form tem limite de tamanho). */
const LOG_NO_PAINEL = 60;

/**
 * Confere o dono ao abrir cada tela; quem não é recebe o aviso e a tentativa vai para o log.
 * @param {Player} player
 * @param {string} tela
 */
function podeAbrir(player, tela) {
  if (ehDono(player)) return true;
  registrarLogDono(player.name, `abrir ${tela}`, "", false, textos.LOG_NAO_DONO);
  erro(player, textos.SO_DONO);
  return false;
}

/** @param {Cla} cla */
const nomeLider = (cla) => (cla.dono ? (membroDe(cla, cla.dono)?.nome ?? "?") : textos.SEM_LIDER);

/** Times em ordem de tag. */
const timesOrdenados = () => [...todosClas()].sort((a, b) => a.tag.localeCompare(b.tag));

/**
 * Painel de Dono.
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuDono(player, voltar) {
  if (!podeAbrir(player, "painel")) return;
  const aqui = () => menuDono(player, voltar);
  await new Lista(textos.TITULO)
    .texto(textos.CORPO(todosClas().length, lerEstado().guerras.length, donosRegistrados().length + DONOS.length))
    .botao(textos.BOTAO_TIMES, ICONES.cla, (p) => menuTimes(p, aqui))
    .botao(textos.BOTAO_GUERRAS, ICONES.guerra, (p) => menuGuerras(p, aqui))
    .botao(textos.BOTAO_DONOS, ICONES.dono, (p) => menuDonos(p, aqui))
    .botao(textos.BOTAO_LOG, ICONES.historico, (p) => menuLog(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

// ---------------------------------------------------------------- times

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuTimes(player, voltar) {
  if (!podeAbrir(player, "times")) return;
  const aqui = () => menuTimes(player, voltar);
  const times = timesOrdenados();
  const lista = new Lista(textos.TITULO_TIMES)
    .texto(textos.TIMES_CORPO(times.length))
    .botao(textos.BOTAO_CRIAR, ICONES.nova, (p) => fluxoCriar(p, aqui))
    .botao(textos.BOTAO_MOVER, ICONES.jogador, (p) => fluxoMover(p, aqui))
    .botao(textos.BOTAO_CONSULTAR, ICONES.buscar, async (p) => {
      const r = await perguntar(p, textos.BOTAO_CONSULTAR, [{ tipo: "texto", rotulo: textos.ROTULO_JOGADOR }]);
      if (r && r[0]) acoes.consultarTime(p, r[0]);
      await aqui();
    });
  for (const cla of times) {
    const id = cla.id;
    lista.botao(textos.BOTAO_TIME(cla, defNivel(cla.nivel).membros), ICONES.cla, (p) => menuTime(p, id, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Nome, tag, cor (as 12) e líder opcional; cria sem cobrar.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function fluxoCriar(player, voltar) {
  const r = await perguntar(player, textos.TITULO_CRIAR, [
    { tipo: "texto", rotulo: textos.ROTULO_NOME },
    { tipo: "texto", rotulo: textos.ROTULO_TAG, dica: "ABC" },
    { tipo: "lista", rotulo: textos.ROTULO_COR, opcoes: CORES_CLA.map((c) => `§${c}${textosCla.NOME_COR(c)}`) },
    { tipo: "texto", rotulo: textos.ROTULO_LIDER },
  ]);
  if (r) acoes.criarTime(player, r[0], r[1], CORES_CLA[r[2]] ?? CORES_CLA[0], r[3] || undefined);
  await voltar();
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function fluxoMover(player, voltar) {
  const times = timesOrdenados();
  if (!times.length) return voltar();
  const r = await perguntar(player, textos.BOTAO_MOVER, [
    { tipo: "texto", rotulo: textos.ROTULO_JOGADOR },
    { tipo: "lista", rotulo: textos.ROTULO_TIME, opcoes: times.map((c) => `[${c.tag}] ${c.nome}`) },
  ]);
  if (r && r[0] && times[r[1]]) acoes.moverJogador(player, r[0], times[r[1]].tag);
  await voltar();
}

/**
 * Um time: líder, nível, membros e guerra.
 * @param {Player} player
 * @param {string} claId
 * @param {Volta} voltar
 */
async function menuTime(player, claId, voltar) {
  if (!podeAbrir(player, "time")) return;
  const cla = claPorId(claId);
  if (!cla) return voltar();
  const aqui = () => menuTime(player, claId, voltar);
  const tag = cla.tag;
  /** @param {string} rotulo @param {(p: Player, valor: string) => any} fn */
  const perguntarNome = (rotulo, fn) => async (/** @type {Player} */ p) => {
    const r = await perguntar(p, rotulo, [{ tipo: "texto", rotulo: textos.ROTULO_JOGADOR }]);
    if (r && r[0]) fn(p, r[0]);
    await aqui();
  };
  const guerra = guerraDe(cla.id);
  const lista = new Lista(textosCla.TITULO_VER(tag))
    .texto(textos.FICHA(cla, nomeLider(cla), defNivel(cla.nivel).membros, guerra))
    .botao(textos.BOTAO_LIDER, ICONES.staff, perguntarNome(textos.BOTAO_LIDER, (p, nome) => acoes.definirLider(p, tag, nome)))
    .botao(textos.BOTAO_NIVEL, ICONES.nivel, async (p) => {
      const r = await perguntar(p, textos.BOTAO_NIVEL, [{ tipo: "numero", rotulo: textos.ROTULO_NIVEL, padrao: cla.nivel, min: 1, max: NIVEIS_CLA.length }]);
      if (r) acoes.definirNivel(p, tag, r[0]);
      await aqui();
    })
    .botao(textos.BOTAO_ADICIONAR, ICONES.nova, perguntarNome(textos.BOTAO_ADICIONAR, (p, nome) => acoes.adicionarMembro(p, tag, nome)))
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, (p) => menuRemover(p, claId, aqui));
  if (guerra) {
    const guerraId = guerra.id;
    lista.botao(textosCla.BOTAO_GUERRAS(true), ICONES.guerra, (p) => menuGuerra(p, guerraId, aqui));
  } else lista.botao(textos.BOTAO_GUERRA_CONTRA, ICONES.guerra, (p) => menuAlvo(p, claId, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {string} claId
 * @param {Volta} voltar
 */
async function menuRemover(player, claId, voltar) {
  const cla = claPorId(claId);
  if (!cla) return voltar();
  const lista = new Lista(textos.TITULO_REMOVER).texto(cla.membros.length ? "" : textos.NINGUEM);
  for (const m of cla.membros) {
    const id = m.id;
    const nome = m.nome;
    lista.botao(textos.BOTAO_MEMBRO(m), ICONES.jogador, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_REMOVER, texto: textos.SAIU_FORCADO(nome, cla.dono === id) })) {
        acoes.removerMembro(p, nome, cla.tag);
      }
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Escolha do outro lado para uma guerra forçada.
 * @param {Player} player
 * @param {string} claId
 * @param {Volta} voltar
 */
async function menuAlvo(player, claId, voltar) {
  const cla = claPorId(claId);
  if (!cla) return voltar();
  const outros = timesOrdenados().filter((c) => c.id !== claId && !guerraDe(c.id));
  const lista = new Lista(textos.TITULO_ALVO).texto(outros.length ? "" : textos.NINGUEM);
  for (const alvo of outros) {
    const tag = alvo.tag;
    lista.botao(textos.BOTAO_TIME(alvo, defNivel(alvo.nivel).membros), ICONES.guerra, async (p) => {
      acoes.iniciarGuerra(p, cla.tag, tag);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- guerras

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuGuerras(player, voltar) {
  if (!podeAbrir(player, "guerras")) return;
  const aqui = () => menuGuerras(player, voltar);
  const guerras = lerEstado().guerras;
  const lista = new Lista(textos.TITULO_GUERRAS)
    .texto(textos.GUERRAS_CORPO(guerras.length))
    .botao(textos.BOTAO_INICIAR, ICONES.guerra, (p) => fluxoIniciar(p, aqui))
    .botao(textos.BOTAO_HISTORICO, ICONES.historico, (p) => menuHistorico(p, aqui));
  for (const g of guerras) {
    const id = g.id;
    lista.botao(textos.BOTAO_GUERRA(g), ICONES.guerra, (p) => menuGuerra(p, id, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function fluxoIniciar(player, voltar) {
  const times = timesOrdenados();
  if (times.length < 2) {
    erro(player, textos.MESMO_TIME);
    return voltar();
  }
  const opcoes = times.map((c) => `[${c.tag}] ${c.nome}`);
  const r = await perguntar(player, textos.TITULO_INICIAR, [
    { tipo: "lista", rotulo: textos.ROTULO_TIME_A, opcoes },
    { tipo: "lista", rotulo: textos.ROTULO_TIME_B, opcoes, padrao: 1 },
    { tipo: "numero", rotulo: textos.ROTULO_MINUTOS, padrao: 0, min: 0, max: 10080 },
  ]);
  if (r && times[r[0]] && times[r[1]]) acoes.iniciarGuerra(player, times[r[0]].tag, times[r[1]].tag, r[2] || undefined);
  await voltar();
}

/**
 * Uma guerra em andamento: pontos, finalizar (pelo placar ou com vencedor) e cancelar.
 * @param {Player} player
 * @param {string} guerraId
 * @param {Volta} voltar
 */
async function menuGuerra(player, guerraId, voltar) {
  if (!podeAbrir(player, "guerra")) return;
  const g = lerEstado().guerras.find((x) => x.id === guerraId);
  if (!g) {
    msg(player, textos.JA_FINALIZADA);
    return voltar();
  }
  const aqui = () => menuGuerra(player, guerraId, voltar);
  const tags = { a: g.tags.a, b: g.tags.b };
  /** @param {string} texto @param {(p: Player) => any} fn */
  const comConfirmacao = (texto, fn) => async (/** @type {Player} */ p) => {
    if (await confirmar(p, { titulo: textos.TITULO_GUERRA, texto })) fn(p);
    await voltar();
  };
  await new Lista(textos.TITULO_GUERRA)
    .texto(textos.GUERRA_CORPO(g))
    .botao(textos.BOTAO_PONTOS, ICONES.ranking, async (p) => {
      const r = await perguntar(p, textos.TITULO_PONTOS, [
        { tipo: "lista", rotulo: textos.ROTULO_LADO, opcoes: [`[${tags.a}]`, `[${tags.b}]`] },
        { tipo: "numero", rotulo: textos.ROTULO_VALOR, padrao: 1, min: -1000000, max: 1000000 },
        { tipo: "alternar", rotulo: textos.ROTULO_DEFINIR, padrao: false },
      ]);
      if (r) acoes.alterarPontos(p, guerraId, r[0] === 1 ? "b" : "a", r[1], r[2]);
      await aqui();
    })
    .botao(textos.BOTAO_FINALIZAR, ICONES.sim, comConfirmacao(textos.CONFIRMA_FINALIZAR, (p) => acoes.finalizarGuerra(p, guerraId)))
    .botao(textos.BOTAO_VENCE(tags.a), ICONES.ranks, comConfirmacao(textos.CONFIRMA_FINALIZAR, (p) => acoes.finalizarGuerra(p, guerraId, "a")))
    .botao(textos.BOTAO_VENCE(tags.b), ICONES.ranks, comConfirmacao(textos.CONFIRMA_FINALIZAR, (p) => acoes.finalizarGuerra(p, guerraId, "b")))
    .botao(textos.BOTAO_CANCELAR, ICONES.nao, comConfirmacao(textos.CONFIRMA_CANCELAR, (p) => acoes.cancelarGuerra(p, guerraId)))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Guerras finalizadas: ver e definir o vencedor (só no histórico, sem pagar de novo).
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuHistorico(player, voltar) {
  if (!podeAbrir(player, "histórico")) return;
  const aqui = () => menuHistorico(player, voltar);
  const historico = lerEstado().historico;
  const lista = new Lista(textos.TITULO_HISTORICO).texto(historico.length ? "" : textos.HISTORICO_VAZIO);
  for (const h of historico) {
    if (!h.id) {
      lista.rotulo(textos.FIM_CORPO(h));
      continue;
    }
    const id = h.id;
    lista.botao(textos.BOTAO_FIM(h), ICONES.historico, async (p) => {
      await new Lista(textos.TITULO_HISTORICO)
        .texto(textos.FIM_CORPO(h))
        .botao(textos.BOTAO_DEFINIR_VENCEDOR(h.tags.a), ICONES.ranks, (q) => acoes.definirVencedor(q, id, "a"))
        .botao(textos.BOTAO_DEFINIR_VENCEDOR(h.tags.b), ICONES.ranks, (q) => acoes.definirVencedor(q, id, "b"))
        .voltar(aqui)
        .abrir(p);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- donos e log

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuDonos(player, voltar) {
  if (!podeAbrir(player, "donos")) return;
  const aqui = () => menuDonos(player, voltar);
  const lista = new Lista(textos.TITULO_DONOS)
    .texto(textos.LISTA_DONOS(donosRegistrados(), DONOS))
    .botao(textos.BOTAO_ADICIONAR_DONO, ICONES.nova, async (p) => {
      const r = await perguntar(p, textos.BOTAO_ADICIONAR_DONO, [{ tipo: "texto", rotulo: textos.ROTULO_JOGADOR }]);
      if (r && r[0]) acoes.adicionarDonoAcao(p, r[0]);
      await aqui();
    });
  for (const d of donosRegistrados()) {
    const nome = d.nome;
    lista.botao(textos.BOTAO_TIRAR_DONO(nome), ICONES.apagar, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_DONOS, texto: textos.CONFIRMA_TIRAR_DONO(nome) })) acoes.removerDonoAcao(p, nome);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuLog(player, voltar) {
  if (!podeAbrir(player, "log")) return;
  const log = logDono().slice(0, LOG_NO_PAINEL);
  await new Lista(textos.TITULO_LOG)
    .texto(log.length ? log.map(textos.LINHA_LOG).join("\n") : textos.LOG_VAZIO)
    .voltar(voltar)
    .abrir(player);
}

// ---------------------------------------------------------------- comando

/**
 * Subcomandos: [quantos parâmetros obrigatórios, uso, ação].
 * @type {Record<string, [number, string, (p: Player, a: string[]) => any]>}
 */
const SUBCOMANDOS = {
  donos: [0, "donos", (p) => acoes.listarDonos(p)],
  adddono: [1, "adddono <nome>", (p, [a]) => acoes.adicionarDonoAcao(p, a)],
  remdono: [1, "remdono <nome>", (p, [a]) => acoes.removerDonoAcao(p, a)],
  criar: [2, "criar <nome> <TAG> [cor] [líder]", (p, [a, b, c, d]) => acoes.criarTime(p, a, b, c, d)],
  lider: [2, "lider <TAG> <nome>", (p, [a, b]) => acoes.definirLider(p, a, b)],
  nivel: [2, "nivel <TAG> <1-8>", (p, [a, b]) => acoes.definirNivel(p, a, b)],
  add: [2, "add <TAG> <nome>", (p, [a, b]) => acoes.adicionarMembro(p, a, b)],
  remover: [1, "remover <nome> [TAG]", (p, [a, b]) => acoes.removerMembro(p, a, b)],
  mover: [2, "mover <nome> <TAG>", (p, [a, b]) => acoes.moverJogador(p, a, b)],
  time: [1, "time <nome>", (p, [a]) => acoes.consultarTime(p, a)],
  guerra: [2, "guerra <TAG> <TAG> [minutos]", (p, [a, b, c]) => acoes.iniciarGuerra(p, a, b, c)],
  pontos: [2, "pontos <TAG> <valor> [definir]", (p, [a, b, c]) => acoes.alterarPontos(p, a, a, b, String(c ?? "").toLowerCase() === "definir")],
  finalizar: [1, "finalizar <TAG|id> [TAG vencedora]", (p, [a, b]) => acoes.finalizarGuerra(p, a, b)],
  cancelar: [1, "cancelar <TAG|id>", (p, [a]) => acoes.cancelarGuerra(p, a)],
  vencedor: [2, "vencedor <TAG|id> <TAG>", (p, [a, b]) => acoes.definirVencedor(p, a, b)],
  guerras: [0, "guerras", (p) => acoes.listarGuerras(p)],
  log: [0, "log", (p) => acoes.mostrarLog(p)],
};

/**
 * /vulpus:dono [ação] [a] [b] [c] [d]. Sem ação abre o painel. Só "reivindicar" vale para quem ainda não é
 * dono; para o resto, a checagem vem antes de qualquer efeito (e cada ação confere de novo).
 * @param {Player} player
 * @param {(string | undefined)[]} args
 */
export function comandoDono(player, args) {
  const [bruta, ...resto] = args;
  const acao = String(bruta ?? "").trim().toLowerCase();
  const valores = resto.map((v) => (typeof v === "string" ? v.trim() : ""));
  if (acao === "reivindicar") return acoes.reivindicar(player);
  if (!ehDono(player)) {
    registrarLogDono(player.name, `/vulpus:dono ${acao || "painel"}`, valores.join(" ").trim(), false, textos.LOG_NAO_DONO);
    erro(player, textos.SO_DONO);
    return false;
  }
  if (acao === "" || acao === "painel") return menuDono(player);
  if (acao === "ajuda") {
    msg(player, textos.AJUDA);
    return true;
  }
  const sub = SUBCOMANDOS[acao];
  if (!sub) {
    erro(player, textos.ACAO_DESCONHECIDA(acao));
    return false;
  }
  const [minimo, uso, fn] = sub;
  if (valores.filter((v) => v !== "").length < minimo) {
    registrarLogDono(player.name, `/vulpus:dono ${acao}`, valores.join(" "), false, textos.LOG_FALTOU);
    erro(player, textos.USO(uso));
    return false;
  }
  return fn(player, valores);
}

registrarComando(
  {
    nome: "dono",
    descricao: textos.DESC_DONO,
    parametros: [
      { nome: "acao", tipo: "texto", opcional: true },
      { nome: "a", tipo: "texto", opcional: true },
      { nome: "b", tipo: "texto", opcional: true },
      { nome: "c", tipo: "texto", opcional: true },
      { nome: "d", tipo: "texto", opcional: true },
    ],
  },
  (p, args) => comandoDono(p, args),
);
