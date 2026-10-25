// @ts-check
// Evento Ecos dos Ausentes, lado da staff e do dono: Staff > Ecos dos Ausentes (ligar, construir o mapa, portais, objetivos, criaturas,
// números) e, só para o dono, datas, reconstruir o mapa e resetar o progresso de uma pessoa. Nada aqui altera blocos do mundo,
// a não ser a construção do mapa dentro da dimensão dos Ecos.
import { world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config, salvarConfig } from "../core/db.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarTempo, ok } from "../core/util.js";
import { OBJETIVOS } from "../textos/ecos_docs.js";
import * as textos from "../textos/ecos.js";
import { acharPessoa } from "./dono_acoes.js";
import * as ecos from "./ecos.js";
import { construirEcos, dimEcos, DIM_ECOS, ecosConstruido, estadoConstrucao, jogadoresNosEcos } from "./ecos_dimensao.js";
import { alternarMarcadores, marcadoresLigados, sincronizarRotulos } from "./ecos_marcadores.js";
import { formatarDataHora, lerDataHora } from "./hollow.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {() => any} Volta */

/** @param {Player} p */
const staffOk = (p) => {
  if (ehStaff(p) || ehDono(p)) return true;
  erro(p, textos.SO_STAFF);
  return false;
};

/** @param {Player} p */
const donoOk = (p) => {
  if (ehDono(p)) return true;
  registrarLogDono(p.name, "ecos (painel do dono)", "", false, "recusado: não é dono");
  erro(p, textos.SO_DONO);
  return false;
};

/** Texto de "falta tanto" para o painel. @param {string} estado */
function textoRestante(estado) {
  const c = config();
  const agora = Date.now();
  if (estado === "antes") return `Abre em ${formatarTempo(Math.max(0, Math.ceil((c.ecosInicio - agora) / 1000)))}`;
  if (estado === "aberto") return `Fecha em ${formatarTempo(Math.max(0, Math.ceil((c.ecosFim - agora) / 1000)))}`;
  return "";
}

/**
 * Painel "Ecos dos Ausentes".
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuEcosStaff(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuEcosStaff(player, voltar);
  const c = config();
  const estado = ecos.estadoEcos();
  const cons = estadoConstrucao();
  const portais = ecos.lerPortais();
  const n = ecos.estatisticas();
  const lista = new Lista(textos.TITULO_STAFF)
    .texto(
      textos.CORPO_STAFF({
        estado,
        inicio: formatarDataHora(c.ecosInicio),
        fim: formatarDataHora(c.ecosFim),
        duracaoH: Math.round(((c.ecosFim - c.ecosInicio) / 3_600_000) * 10) / 10,
        restante: textoRestante(estado),
        construido: cons.construido,
        fases: `${cons.prontas}/${cons.total} fases`,
        ocupado: cons.ocupado ? `${cons.fase} ${cons.pct}%` : cons.parada ? textos.OBRA_PARADA_LINHA(cons.parada) : "",
        vivas: ecos.totalVivas(),
        teto: c.ecosTetoCriaturas,
        portais: `entrada ${portais.entrada ? "ok" : "[vazio]"}, saída ${portais.saida ? "ok" : "[vazio]"}`,
        objetivos: Object.keys(ecos.lerPontos()).length,
        totalObjetivos: OBJETIVOS.length,
        pontosCriatura: ecos.lerCriaturas().length,
        entraram: n.entraram,
        fragmentos: n.fragmentos,
        concluiram: n.concluiram,
        noPlano: jogadoresNosEcos().length,
      }),
    )
    .botao(textos.BOTAO_IR_ECOS, ICONES.spawn, async (p) => {
      irParaEcos(p);
    })
    .botao(textos.BOTAO_LIGAR(c.ecosLigado), ICONES.ajustes, async (p) => {
      if (!staffOk(p)) return;
      salvarConfig({ ecosLigado: !config().ecosLigado });
      ok(p, textos.EVENTO_ESTADO(config().ecosLigado));
      ecos.conferirJanela();
      await aqui();
    })
    .botao(cons.construido ? textos.BOTAO_CONSTRUIR : cons.prontas > 0 ? textos.BOTAO_CONTINUAR_CONSTRUCAO(cons.prontas, cons.total) : textos.BOTAO_CONSTRUIR, ICONES.mundo, async (p) => {
      await construir(p);
      await aqui();
    })
    .botao(textos.BOTAO_PORTAIS, ICONES.spawn, (p) => menuPortais(p, aqui))
    .botao(textos.BOTAO_OBJETIVOS, ICONES.historico, (p) => menuObjetivos(p, aqui))
    .botao(textos.BOTAO_CRIATURAS, ICONES.ajustes, (p) => menuCriaturas(p, aqui))
    .botao(textos.BOTAO_MARCADORES(marcadoresLigados(player)), ICONES.buscar, async (p) => {
      const novo = alternarMarcadores(p);
      if (novo === undefined) return erro(p, textos.SO_STAFF);
      ok(p, textos.MARCADORES_ESTADO(novo));
      await aqui();
    })
    .botao(textos.BOTAO_ROTULOS, ICONES.ajustes, async (p) => {
      await editarRotulos(p);
      await aqui();
    })
    .botao(textos.BOTAO_ATUALIZAR, ICONES.ordenar, async () => {
      await aqui();
    });
  if (ehDono(player)) {
    lista
      .botao(textos.BOTAO_DATAS, ICONES.tempo, async (p) => {
        await editarDatas(p);
        await aqui();
      })
      .botao(textos.BOTAO_RECONSTRUIR, ICONES.apagar, async (p) => {
        await reconstruir(p);
        await aqui();
      })
      .botao(textos.BOTAO_RESETAR, ICONES.apagar, async (p) => {
        await resetarJogador(p);
        await aqui();
      });
  }
  await lista.voltar(voltar).abrir(player);
}

/** Leva a staff à entrada do Limiar. @param {Player} player */
export function irParaEcos(player) {
  if (!staffOk(player)) return false;
  if (!ecosConstruido() || !dimEcos()) {
    erro(player, textos.MAPA_NAO_CONSTRUIDO);
    return false;
  }
  const r = ecos.entrarNosEcos(player);
  if (!r) erro(player, textos.IR_ECOS_FALHOU);
  return r;
}

// ------------------------------------------------------------------------------------ construir, reconstruir
/** Construção só fora da janela (nunca na abertura). @param {Player} player */
async function construir(player) {
  if (!staffOk(player)) return;
  if (ecosConstruido()) return erro(player, textos.CONSTRUCAO_JA_FEITA);
  if (ecos.estadoEcos() === "aberto") return erro(player, textos.JANELA_ABERTA_NAO_CONSTROI);
  await construirEcos(player);
}

/** @param {Player} player */
async function reconstruir(player) {
  if (!donoOk(player)) return;
  if (ecos.estadoEcos() === "aberto") return erro(player, textos.JANELA_ABERTA_NAO_CONSTROI);
  if (!(await confirmar(player, { titulo: textos.TITULO_RECONSTRUIR, texto: textos.RECONSTRUIR_1, sim: textos.SIM_RECONSTRUIR }))) return;
  if (!(await confirmar(player, { titulo: textos.TITULO_RECONSTRUIR, texto: textos.RECONSTRUIR_2, sim: textos.SIM_RECONSTRUIR }))) return;
  if (!ehDono(player) || ecos.estadoEcos() === "aberto") return;
  registrarLogDono(player.name, "ecos: reconstruir mapa", "", true, "");
  ecos.removerCriaturas();
  await construirEcos(player, { refazer: true });
}

// ------------------------------------------------------------------------------------ datas (dono)
/** @param {Player} player */
async function editarDatas(player) {
  if (!donoOk(player)) return;
  const c = config();
  const r = await perguntar(player, textos.TITULO_DATAS, [
    { tipo: "texto", rotulo: textos.ROTULO_INICIO, dica: textos.DICA_DATA, padrao: formatarDataHora(c.ecosInicio) },
    { tipo: "texto", rotulo: textos.ROTULO_FIM, dica: textos.DICA_DATA, padrao: formatarDataHora(c.ecosFim) },
  ]);
  if (!r || !ehDono(player)) return;
  const inicio = lerDataHora(r[0]);
  const fim = lerDataHora(r[1]);
  if (inicio === undefined || fim === undefined) return erro(player, textos.DATA_INVALIDA);
  if (fim <= inicio) return erro(player, textos.DATA_INVERTIDA);
  salvarConfig({ ecosInicio: inicio, ecosFim: fim });
  registrarLogDono(player.name, "ecos: datas", `${r[0]} a ${r[1]}`, true, "");
  ok(player, textos.DATAS_SALVAS);
  ecos.conferirJanela();
}

/** @param {Player} player */
async function editarRotulos(player) {
  if (!staffOk(player)) return;
  const c = config();
  const r = await perguntar(player, textos.TITULO_ROTULOS, [
    { tipo: "alternar", rotulo: textos.ROTULO_ROTULOS, padrao: c.ecosRotulos },
    { tipo: "alternar", rotulo: textos.ROTULO_FAROL, padrao: c.ecosFarol },
    { tipo: "numero", rotulo: textos.ROTULO_FAROL_DIST, padrao: c.ecosFarolDistancia, min: 16, max: 128 },
  ]);
  if (!r || !staffOk(player)) return;
  salvarConfig({ ecosRotulos: r[0], ecosFarol: r[1], ecosFarolDistancia: r[2] });
  sincronizarRotulos(true);
  ok(player, textos.ROTULOS_SALVOS);
}

// ------------------------------------------------------------------------------------ portais
/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuPortais(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuPortais(player, voltar);
  const p = ecos.lerPortais();
  await new Lista(textos.TITULO_PORTAIS)
    .texto(textos.CORPO_PORTAIS)
    .botao(textos.BOTAO_PORTAL(textos.NOME_ENTRADA, p.entrada), ICONES.spawn, (q) => menuPortal(q, "entrada", aqui))
    .botao(textos.BOTAO_PORTAL(textos.NOME_SAIDA, p.saida), ICONES.spawn, (q) => menuPortal(q, "saida", aqui))
    .voltar(voltar)
    .abrir(player);
}

/**
 * @param {Player} player
 * @param {"entrada" | "saida"} qual
 * @param {Volta} voltar
 */
async function menuPortal(player, qual, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuPortal(player, qual, voltar);
  const ponto = ecos.lerPortais()[qual];
  await new Lista(qual === "entrada" ? textos.NOME_ENTRADA : textos.NOME_SAIDA)
    .texto(ponto ? `§7${ponto.x}, ${ponto.y}, ${ponto.z} (${ponto.d})` : `§7${textos.NADA_MARCADO}`)
    .botao(textos.BOTAO_MARCAR_OLHANDO, ICONES.nova, async (p) => {
      ecos.marcarPortalOlhando(p, qual);
      await aqui();
    })
    .botao(textos.BOTAO_IR, ICONES.spawn, async (p) => {
      if (!staffOk(p)) return;
      const alvo = ecos.lerPortais()[qual];
      if (!alvo) return erro(p, textos.NADA_MARCADO);
      irPara(p, alvo);
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      ecos.removerPortal(p, qual);
      ok(p, textos.REMOVIDO);
      await aqui();
    })
    .voltar(voltar)
    .abrir(player);
}

/** Leva a staff até um ponto (um bloco acima). @param {Player} player @param {{ d: string, x: number, y: number, z: number }} alvo */
function irPara(player, alvo) {
  try {
    player.teleport({ x: alvo.x + 0.5, y: alvo.y + 1, z: alvo.z + 0.5 }, { dimension: world.getDimension(alvo.d) });
  } catch (e) {
    erro(player, `Não consegui ir até lá: ${e}`);
  }
}

// ------------------------------------------------------------------------------------ objetivos
/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuObjetivos(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuObjetivos(player, voltar);
  const pontos = ecos.lerPontos();
  const lista = new Lista(textos.TITULO_OBJETIVOS).texto(textos.CORPO_OBJETIVOS);
  for (const o of OBJETIVOS) lista.botao(textos.BOTAO_OBJETIVO(o.id, o.quem, pontos[o.id]), ICONES.historico, (p) => menuObjetivo(p, o.id, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {string} id
 * @param {Volta} voltar
 */
async function menuObjetivo(player, id, voltar) {
  if (!staffOk(player)) return;
  const obj = ecos.objetivoPorId(id);
  if (!obj) return;
  const aqui = () => menuObjetivo(player, id, voltar);
  const ponto = ecos.lerPontos()[id];
  let bloco = "?";
  if (ponto) {
    try {
      bloco = world.getDimension(ponto.d).getBlock(ponto)?.typeId ?? "?";
    } catch {
      bloco = "?";
    }
  }
  await new Lista(textos.TITULO_OBJETIVO(obj.id, obj.quem))
    .texto(textos.CORPO_OBJETIVO(obj.tipo, obj.fragmentos, ponto, bloco))
    .botao(textos.BOTAO_MARCAR_OLHANDO, ICONES.nova, async (p) => {
      ecos.marcarObjetivoOlhando(p, id);
      await aqui();
    })
    .botao(textos.BOTAO_VER_TEXTO, ICONES.buscar, async (p) => {
      await previa(p, id, aqui);
    })
    .botao(textos.BOTAO_IR, ICONES.spawn, async (p) => {
      if (!staffOk(p)) return;
      const alvo = ecos.lerPontos()[id];
      if (!alvo) return erro(p, textos.NADA_MARCADO);
      irPara(p, alvo);
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      if (!ecos.lerPontos()[id]) {
        erro(p, textos.NADA_MARCADO);
        return aqui();
      }
      ecos.removerObjetivo(p, id);
      ok(p, textos.REMOVIDO);
      await aqui();
    })
    .voltar(voltar)
    .abrir(player);
}

/** Prévia das falas para a staff (não conta como feito). @param {Player} player @param {string} id @param {Volta} voltar */
async function previa(player, id, voltar) {
  const obj = ecos.objetivoPorId(id);
  if (!obj || !staffOk(player)) return;
  const partes = [...obj.falas];
  if (obj.pergunta) partes.push(`§e${obj.pergunta}`, ...(obj.opcoes ?? []).map((o) => `§7- ${o.texto}${o.certa ? " §a(certa)" : ""}\n§8  ${o.resposta ?? ""}`));
  if (obj.falasFim?.length) partes.push("§6[Depois de concluir]", ...obj.falasFim);
  await new Lista(textos.TITULO_OBJETIVO(obj.id, obj.quem)).texto(partes.map((t) => (t.startsWith("§") ? t : `§f${t}`)).join("\n\n")).voltar(voltar).abrir(player);
}

// ------------------------------------------------------------------------------------ criaturas
/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuCriaturas(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuCriaturas(player, voltar);
  const lista = new Lista(textos.TITULO_CRIATURAS)
    .texto(textos.CORPO_CRIATURAS)
    .botao(textos.BOTAO_ADICIONAR_PONTO, ICONES.nova, async (p) => {
      await adicionarPonto(p);
      await aqui();
    })
    .botao(textos.BOTAO_TETO, ICONES.ajustes, async (p) => {
      await editarLimites(p);
      await aqui();
    })
    .botao(textos.BOTAO_LIMPAR_CRIATURAS, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      ecos.removerCriaturas();
      ok(p, textos.CRIATURAS_LIMPAS);
      await aqui();
    });
  ecos.lerCriaturas().forEach((pt, i) => lista.botao(textos.BOTAO_PONTO(i, pt), ICONES.spawn, (p) => menuPonto(p, i, aqui)));
  await lista.voltar(voltar).abrir(player);
}

/** @param {Player} player */
async function adicionarPonto(player) {
  if (!staffOk(player)) return;
  const tipos = [...ecos.TIPOS_CRIATURA];
  const objs = [textos.SEM_OBJETIVO, ...ecos.OBJETIVOS_ELITE];
  const r = await perguntar(player, textos.TITULO_ADICIONAR, [
    { tipo: "lista", rotulo: textos.ROTULO_TIPO, opcoes: tipos.map((t) => textos.NOMES_TIPO[/** @type {keyof typeof textos.NOMES_TIPO} */ (t)]) },
    { tipo: "numero", rotulo: textos.ROTULO_MAX, padrao: 1, min: 1, max: 6 },
    { tipo: "lista", rotulo: textos.ROTULO_OBJ_ELITE, opcoes: objs },
  ]);
  if (!r || !staffOk(player)) return;
  const tipo = tipos[r[0]] ?? "errante";
  const obj = r[2] > 0 ? objs[r[2]] : undefined;
  if (ecos.adicionarPontoCriatura(player, tipo, r[1], obj)) ok(player, textos.LIMITES_SALVOS);
}

/** @param {Player} player */
async function editarLimites(player) {
  if (!staffOk(player)) return;
  const c = config();
  const r = await perguntar(player, textos.TITULO_TETO, [
    { tipo: "numero", rotulo: textos.ROTULO_TETO, padrao: c.ecosTetoCriaturas, min: 0, max: 60 },
    { tipo: "numero", rotulo: textos.ROTULO_REAPARECE, padrao: c.ecosReaparecerSeg, min: 10, max: 3600 },
    { tipo: "numero", rotulo: textos.ROTULO_DANO_MIN, padrao: c.ecosDanoMin, min: 1, max: 100 },
  ]);
  if (!r || !staffOk(player)) return;
  salvarConfig({ ecosTetoCriaturas: r[0], ecosReaparecerSeg: r[1], ecosDanoMin: r[2] });
  ok(player, textos.LIMITES_SALVOS);
}

/**
 * @param {Player} player
 * @param {number} i
 * @param {Volta} voltar
 */
async function menuPonto(player, i, voltar) {
  if (!staffOk(player)) return;
  const ponto = ecos.lerCriaturas()[i];
  if (!ponto) return voltar();
  await new Lista(textos.BOTAO_PONTO(i, ponto).split("\n")[0])
    .texto(`§7${ponto.x}, ${ponto.y}, ${ponto.z} (${ponto.d})`)
    .botao(textos.BOTAO_IR, ICONES.spawn, async (p) => {
      if (!staffOk(p)) return;
      irPara(p, ponto);
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      ecos.removerPontoCriatura(p, i);
      ok(p, textos.REMOVIDO);
      await voltar();
    })
    .voltar(voltar)
    .abrir(player);
}

// ------------------------------------------------------------------------------------ dono: resetar progresso
/** @param {Player} player */
async function resetarJogador(player) {
  if (!donoOk(player)) return;
  const r = await perguntar(player, textos.TITULO_RESETAR, [{ tipo: "texto", rotulo: textos.ROTULO_PESSOA }]);
  if (!r || !r[0]) return;
  const pessoa = acharPessoa(r[0]);
  if (!pessoa) return erro(player, textos.PESSOA_NAO_ACHADA);
  if (!(await confirmar(player, { titulo: textos.TITULO_RESETAR, texto: textos.CONFIRMA_RESETAR(pessoa.nome) }))) return;
  if (!ehDono(player)) return;
  ecos.resetarProgresso(pessoa.id);
  registrarLogDono(player.name, "ecos: resetar progresso", pessoa.nome, true, "");
  ok(player, textos.JOGADOR_RESETADO(pessoa.nome));
}

export { DIM_ECOS };
