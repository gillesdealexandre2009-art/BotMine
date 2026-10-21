// @ts-check
// Eras da Vulpus: 20 semanas, uma Era por semana (calendário em eras_calendario.js, perfis em eras_catalogo.js, visual em
// eras_visual.js e mecânicas em eras_mecanicas.js). Este arquivo junta tudo: vigia a troca de Era, anuncia, e traz o comando
// /vulpus:era, o menu de quem joga e o painel do dono (iniciar, forçar, encerrar, ligar ou desligar as mecânicas).
// Controlar a Era oficial é só do dono; a staff vê, valida e faz prévias; quem joga vê a Era da semana e o que ela dá e cobra.
import { Player, system } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { online } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import * as textos from "../textos/eras.js";
import {
  definirMecanicas,
  encerrarTemporada,
  irParaEra,
  iniciarTemporada,
  lerDataBrasilia,
  lerEstado,
  marcarAnunciada,
  situacao,
} from "./eras_calendario.js";
import { eraDe, ERAS, TOTAL_ERAS, validarCatalogo } from "./eras_catalogo.js";
import { validarEventos } from "./eras_eventos.js";
import "./eras_mecanicas.js";
import { temSelo } from "./kitsune.js";
import { atualizarTodos, definirPrevia, emAmbienteEspecial, eventoVisual, jaApresentada, limparPrevia, limparTodos, marcarApresentada, temPrevia } from "./eras_visual.js";

/** @typedef {() => any} Volta */

const PASSO_VIGIA = 200;
/** Marca da temporada encerrada em `ultima` (as Eras vão de 1 a 20). */
const MARCA_ENCERRADA = TOTAL_ERAS + 1;

// ------------------------------------------------------------------ vigia da troca de Era

/** Número que representa a situação em `estado.ultima`: 0 sem Era, 1 a 20 a Era, 21 temporada encerrada. @param {import("./eras_calendario.js").Situacao} s */
const marca = (s) => (s.fase === "encerrada" ? MARCA_ENCERRADA : s.fase === "ativa" ? s.numero : 0);

/**
 * Compara a Era oficial com a última anunciada. Se mudou (inclusive depois de dias fora do ar), anuncia UMA vez a Era certa,
 * sem repetir as que passaram, e põe todo mundo nela.
 */
export function vigiar() {
  try {
    const s = situacao();
    const agora = marca(s);
    const e = lerEstado();
    if (agora === e.ultima) return;
    if (agora === 0) {
      limparTodos();
      marcarAnunciada(0, "sem Era");
      console.warn("[Vulpus][Eras] sem Era oficial agora (temporada não iniciada, reagendada ou encerrada pelo dono)");
      return;
    }
    const motivo = e.ultima === 0 ? "temporada começou" : agora === MARCA_ENCERRADA ? "temporada encerrada" : "troca de Era";
    marcarAnunciada(agora, motivo);
    console.warn(`[Vulpus][Eras] ${motivo}: Era ${s.numero} (${s.era?.nome})`);
    if (!s.era) return;
    const era = s.era;
    for (const p of online()) {
      try {
        if (jaApresentada(p, era) && agora !== MARCA_ENCERRADA) continue; // acabou de entrar e já recebeu o anúncio desta Era
        for (const l of textos.ANUNCIO_ERA(era)) msg(p, l);
        if (agora === MARCA_ENCERRADA) for (const l of textos.TEMPORADA_ENCERROU) msg(p, l);
        mostrarTitulo(p, era.titulo, { subtitulo: era.subtitulo, entrada: 10, fica: 80, saida: 20 });
        marcarApresentada(p, era);
      } catch (e2) {
        registrarErro("Eras: anúncio", e2);
      }
    }
    atualizarTodos({ comTransicao: true });
  } catch (e) {
    registrarErro("Eras: vigia", e);
  }
}

system.runTimeout(vigiar, 100);
system.runInterval(vigiar, PASSO_VIGIA);

// ------------------------------------------------------------------ acontecimentos: anuncia quando começam e quando acabam

/** @type {{ chave: string, nome: string, fim: string } | undefined} o acontecimento já anunciado (para anunciar uma vez só) */
let anunciadoEvento;

/** Conferência a cada 5 s: anuncia o começo (com título e som) e o fim, e já empurra a neblina nova para todo mundo. */
export function vigiarEventos() {
  try {
    const ev = eventoVisual();
    if (!ev) {
      if (anunciadoEvento) {
        for (const p of online()) if (!emAmbienteEspecial(p)) msg(p, textos.EVENTO_TERMINOU(anunciadoEvento.nome, anunciadoEvento.fim));
        anunciadoEvento = undefined;
        atualizarTodos();
      }
      return;
    }
    const chave = `${ev.numero}:${ev.evento.id}:${ev.inicio}`;
    if (anunciadoEvento?.chave === chave) return;
    anunciadoEvento = { chave, nome: ev.evento.nome, fim: ev.evento.fim };
    atualizarTodos();
    if (ev.restanteSeg < 30) return; // o servidor voltou no fim da janela: não vale anunciar
    for (const p of online()) {
      if (emAmbienteEspecial(p)) continue;
      for (const l of textos.EVENTO_COMECOU(ev.evento.nome, ev.evento.anuncio, ev.evento.duracaoMin)) msg(p, l);
      mostrarTitulo(p, textos.EVENTO_TITULO(ev.evento.nome), { subtitulo: textos.EVENTO_SUBTITULO(ev.evento.duracaoMin), entrada: 10, fica: 50, saida: 20 });
    }
  } catch (e) {
    registrarErro("Eras: acontecimentos", e);
  }
}

system.runInterval(vigiarEventos, 100);

// ------------------------------------------------------------------ permissões

/**
 * Só o dono controla a Era oficial. Quem não é recebe o aviso e a tentativa vai para o log.
 * @param {Player} p
 * @param {string} acao
 */
function soDono(p, acao) {
  if (ehDono(p)) return true;
  registrarLogDono(p.name, `eras ${acao}`, "", false, "recusado: não é dono");
  erro(p, textos.SO_DONO);
  return false;
}

/** @param {Player} p */
const staffOuDono = (p) => ehStaff(p) || ehDono(p);

/**
 * @param {Player} p
 * @param {string} acao
 * @param {string} detalhe
 * @param {boolean} deuCerto
 * @param {string} motivo
 */
const logar = (p, acao, detalhe, deuCerto, motivo) => registrarLogDono(p.name, `eras ${acao}`, detalhe, deuCerto, motivo);

// ------------------------------------------------------------------ ações (cada uma confere a permissão de novo)

/**
 * Começa ou reagenda a temporada (a Era 1 vale a partir da data; "agora" começa já). Se havia uma encerrada, esta é a seguinte.
 * @param {Player} p
 * @param {string} dataTexto
 */
export function acaoIniciar(p, dataTexto) {
  if (!soDono(p, "iniciar")) return false;
  const agora = Date.now();
  const ms = lerDataBrasilia(dataTexto || "agora", agora);
  if (ms === undefined) {
    logar(p, "iniciar", dataTexto, false, "data inválida");
    erro(p, textos.DATA_INVALIDA);
    return false;
  }
  if (!iniciarTemporada(ms, agora)) {
    erro(p, textos.ERRO_INTERNO);
    return false;
  }
  vigiar();
  const texto = textos.INICIO_DEFINIDO(ms, ms <= agora);
  logar(p, "iniciar", dataTexto || "agora", true, texto);
  ok(p, texto);
  return true;
}

/**
 * Força a Era oficial (a Era N começa agora e as semanas seguintes contam a partir dela).
 * @param {Player} p
 * @param {string} numeroTexto
 */
export function acaoForcar(p, numeroTexto) {
  if (!soDono(p, "ir")) return false;
  const n = Number(String(numeroTexto).trim());
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_ERAS) {
    logar(p, "ir", numeroTexto, false, "Era inválida");
    erro(p, textos.ERA_INVALIDA);
    return false;
  }
  if (!irParaEra(n)) {
    erro(p, textos.ERRO_INTERNO);
    return false;
  }
  vigiar();
  logar(p, "ir", String(n), true, textos.ERA_FORCADA(n));
  ok(p, textos.ERA_FORCADA(n));
  return true;
}

/**
 * Encerra a temporada (nenhuma Era vale até o dono iniciar outra). Pede a palavra "confirmar".
 * @param {Player} p
 * @param {string} confirmacao
 */
export function acaoEncerrar(p, confirmacao) {
  if (!soDono(p, "encerrar")) return false;
  if (situacao().fase === "nao_iniciada") {
    erro(p, textos.SEM_TEMPORADA);
    return false;
  }
  if (String(confirmacao ?? "").trim().toLowerCase() !== "confirmar") {
    erro(p, textos.PRECISA_CONFIRMAR);
    return false;
  }
  if (!encerrarTemporada()) {
    erro(p, textos.ERRO_INTERNO);
    return false;
  }
  vigiar();
  logar(p, "encerrar", "", true, textos.TEMPORADA_ENCERRADA_DONO);
  ok(p, textos.TEMPORADA_ENCERRADA_DONO);
  return true;
}

/**
 * Liga ou desliga as mecânicas (a atmosfera continua).
 * @param {Player} p
 * @param {boolean} ligar
 */
export function acaoMecanicas(p, ligar) {
  if (!soDono(p, "mecanicas")) return false;
  if (!definirMecanicas(ligar)) {
    erro(p, textos.ERRO_INTERNO);
    return false;
  }
  logar(p, "mecanicas", ligar ? "ligar" : "desligar", true, textos.MECANICAS_MUDARAM(ligar));
  ok(p, textos.MECANICAS_MUDARAM(ligar));
  return true;
}

/**
 * Prévia de uma Era só para quem pediu (staff ou dono).
 * @param {Player} p
 * @param {string} numeroTexto
 */
export function acaoPrevia(p, numeroTexto) {
  if (!staffOuDono(p)) {
    erro(p, textos.SO_STAFF);
    return false;
  }
  const n = Number(String(numeroTexto).trim());
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_ERAS) {
    erro(p, textos.ERA_INVALIDA);
    return false;
  }
  definirPrevia(p, n);
  msg(p, textos.PREVIA_TITULO(eraDe(n)));
  return true;
}

/** @param {Player} p */
export function acaoRestaurar(p) {
  if (!limparPrevia(p)) {
    erro(p, textos.PREVIA_SEM_ERA);
    return false;
  }
  msg(p, textos.PREVIA_FIM);
  return true;
}

/** @param {Player} p */
export function acaoValidar(p) {
  if (!staffOuDono(p)) {
    erro(p, textos.SO_STAFF);
    return false;
  }
  const problemas = [...validarCatalogo(), ...validarEventos()];
  if (problemas.length === 0) ok(p, textos.VALIDACAO_OK);
  else erro(p, textos.VALIDACAO_RUIM(problemas));
  return problemas.length === 0;
}

// ------------------------------------------------------------------ menus

/** O corpo dos menus de Era (status + ficha). */
const corpo = () => textos.CORPO_JOGADOR(situacao(), lerEstado(), Date.now());

/**
 * Menu de quem joga: a Era da semana, o que ela dá e cobra, e a lista das 20.
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuEra(player, voltar) {
  const aqui = () => menuEra(player, voltar);
  const s = situacao();
  const lista = new Lista(textos.TITULO_JOGADOR).texto(corpo()).botao(textos.BOTAO_LISTA, ICONES.lore, (p) => menuListaEras(p, aqui));
  if (staffOuDono(player)) {
    if (s.proxima) {
      const n = s.proxima.numero;
      lista.botao(textos.BOTAO_PROXIMA(s.proxima), ICONES.tempo, async (p) => {
        acaoPrevia(p, String(n));
      });
    }
    if (temPrevia(player)) {
      lista.botao(textos.BOTAO_RESTAURAR, ICONES.voltar, async (p) => {
        acaoRestaurar(p);
        await aqui();
      });
    }
  }
  // Kitsune (e dono) lê a próxima Era em texto; só com a temporada ativa e se houver próxima.
  if (s.fase === "ativa" && s.proxima && (temSelo(player) || ehDono(player))) {
    lista.botao(textos.BOTAO_PROXIMA_KITSUNE(s.proxima), ICONES.tempo, (p) => menuProximaEra(p, aqui));
  }
  if (ehDono(player)) lista.botao(textos.BOTAO_PAINEL, ICONES.dono, (p) => menuEras(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Prévia em texto da próxima Era (mimo do selo Kitsune). Confere de novo ao abrir: sem selo, sem temporada ou sem próxima, não mostra.
 * @param {Player} player
 * @param {Volta} voltar
 */
export async function menuProximaEra(player, voltar) {
  const s = situacao();
  if (s.fase !== "ativa" || !s.proxima || !(temSelo(player) || ehDono(player))) return voltar();
  await new Lista(textos.TITULO_PROXIMA_KITSUNE).texto(textos.CORPO_PROXIMA_KITSUNE(s.proxima, s.fimEra)).voltar(voltar).abrir(player);
}

/**
 * As 20 Eras, em lista.
 * @param {Player} player
 * @param {Volta} voltar
 */
export async function menuListaEras(player, voltar) {
  const aqui = () => menuListaEras(player, voltar);
  const atual = situacao().numero;
  const lista = new Lista(textos.BOTAO_LISTA).texto("");
  for (const e of ERAS) lista.botao(textos.BOTAO_ERA(e.numero, e.nome, e.numero === atual), ICONES.lore, (p) => menuFichaEra(p, e.numero, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * A ficha de uma Era (regras, limites do Bedrock) e, para a staff, o botão da prévia.
 * @param {Player} player
 * @param {number} numero
 * @param {Volta} voltar
 */
export async function menuFichaEra(player, numero, voltar) {
  const era = eraDe(numero);
  const lista = new Lista(`Era ${era.numero}`).texto(textos.FICHA_ERA(era));
  if (staffOuDono(player)) {
    lista.botao(textos.BOTAO_PREVIA, ICONES.tempo, async (p) => {
      acaoPrevia(p, String(numero));
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Painel do dono: status, prévia, validação e as decisões (iniciar, forçar, encerrar, mecânicas).
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuEras(player, voltar) {
  if (!soDono(player, "painel")) return;
  const aqui = () => menuEras(player, voltar);
  const e = lerEstado();
  await new Lista(textos.TITULO_PAINEL)
    .texto(textos.statusTemporada(situacao(), e, Date.now()))
    .cabecalho(textos.SECAO_VER)
    .botao(textos.BOTAO_LISTA, ICONES.lore, (p) => menuListaEras(p, aqui))
    .botao(textos.BOTAO_PREVIA, ICONES.tempo, async (p) => {
      const r = await perguntar(p, textos.TITULO_PREVIA, [{ tipo: "numero", rotulo: textos.ROTULO_ERA, padrao: Math.max(1, situacao().numero), min: 1, max: TOTAL_ERAS }]);
      if (r) acaoPrevia(p, String(r[0]));
    })
    .botao(textos.BOTAO_RESTAURAR, ICONES.voltar, async (p) => {
      acaoRestaurar(p);
      await aqui();
    })
    .botao(textos.BOTAO_VALIDAR, ICONES.conferir, async (p) => {
      acaoValidar(p);
      await aqui();
    })
    .cabecalho(textos.SECAO_DECIDIR)
    .botao(textos.BOTAO_INICIAR, ICONES.nova, async (p) => {
      if (!soDono(p, "painel iniciar")) return;
      const r = await perguntar(p, textos.TITULO_INICIAR, [{ tipo: "texto", rotulo: textos.ROTULO_DATA, padrao: "agora" }]);
      if (r) acaoIniciar(p, r[0] || "agora");
      await aqui();
    })
    .botao(textos.BOTAO_FORCAR, ICONES.editar, async (p) => {
      if (!soDono(p, "painel forçar")) return;
      const r = await perguntar(p, textos.TITULO_FORCAR, [{ tipo: "numero", rotulo: textos.ROTULO_ERA, padrao: Math.max(1, situacao().numero), min: 1, max: TOTAL_ERAS }]);
      if (r) acaoForcar(p, String(r[0]));
      await aqui();
    })
    .botao(textos.BOTAO_MECANICAS(e.mecanicas), ICONES.ajustes, async (p) => {
      acaoMecanicas(p, !lerEstado().mecanicas);
      await aqui();
    })
    .botao(textos.BOTAO_ENCERRAR, ICONES.apagar, async (p) => {
      if (!soDono(p, "painel encerrar")) return;
      if (await confirmar(p, { titulo: textos.BOTAO_ENCERRAR, texto: textos.CONFIRMAR_ENCERRAR })) acaoEncerrar(p, "confirmar");
      await aqui();
    })
    .voltar(voltar)
    .abrir(player);
}

// ------------------------------------------------------------------ comando

/**
 * /vulpus:era [ação] [a]. Sem ação abre o menu. lista e info são para todos; previa, restaurar e validar para a staff; o resto é do dono.
 * @param {Player} player
 * @param {(string | undefined)[]} args
 */
export function comandoEra(player, args) {
  const acao = String(args[0] ?? "").trim().toLowerCase();
  const a = String(args[1] ?? "").trim();
  switch (acao) {
    case "":
    case "menu":
    case "status":
      return menuEra(player);
    case "ajuda":
      msg(player, textos.AJUDA);
      return true;
    case "lista":
      return menuListaEras(player, () => menuEra(player));
    case "info": {
      const n = Number(a);
      if (!Number.isInteger(n) || n < 1 || n > TOTAL_ERAS) {
        erro(player, textos.USO("info <1-20>"));
        return false;
      }
      return menuFichaEra(player, n, () => menuEra(player));
    }
    case "previa":
      if (a === "") {
        erro(player, textos.USO("previa <1-20>"));
        return false;
      }
      return acaoPrevia(player, a);
    case "restaurar":
      return acaoRestaurar(player);
    case "validar":
      return acaoValidar(player);
    case "painel":
      return menuEras(player);
    case "iniciar":
      return acaoIniciar(player, [a, args[2] ?? ""].join(" ").trim());
    case "ir":
      if (a === "") {
        erro(player, textos.USO("ir <1-20>"));
        return false;
      }
      return acaoForcar(player, a);
    case "encerrar":
      return acaoEncerrar(player, a);
    case "mecanicas": {
      const v = a.toLowerCase();
      if (v !== "ligar" && v !== "desligar") {
        erro(player, textos.USO("mecanicas <ligar|desligar>"));
        return false;
      }
      return acaoMecanicas(player, v === "ligar");
    }
    default:
      erro(player, textos.AJUDA);
      return false;
  }
}

registrarComando(
  {
    nome: "era",
    descricao: textos.DESC_ERA,
    parametros: [
      { nome: "acao", tipo: "texto", opcional: true },
      { nome: "a", tipo: "texto", opcional: true },
      { nome: "b", tipo: "texto", opcional: true },
    ],
  },
  (p, args) => comandoEra(p, args),
);
