// @ts-check
// Evento Hollow, lado da staff e do dono: Staff > Evento Hollow (ligar, datas, locais, registros, áudios, vento) e, só para o dono,
// vencedores (dar o selo Kitsune às duas primeiras posições), resetar o progresso de uma pessoa e resetar vencedores.
// Nada aqui altera blocos do mundo; marcar um registro só guarda onde ele mora.
import { world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { config, editarJogador, salvarConfig } from "../core/db.js";
import { ehDono, registrarLogDono } from "../core/dono.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, nomeDimensao, ok } from "../core/util.js";
import { REGISTROS } from "../textos/hollow_docs.js";
import * as textos from "../textos/hollow.js";
import { acharPessoa } from "./dono_acoes.js";
import * as hollow from "./hollow.js";
import { darKitsuneTempo } from "./kitsune_tempo.js";

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
  registrarLogDono(p.name, "hollow (painel do dono)", "", false, "recusado: não é dono");
  erro(p, textos.SO_DONO);
  return false;
};

/**
 * Painel "Evento Hollow".
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuHollowStaff(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuHollowStaff(player, voltar);
  const c = config();
  const lista = new Lista(textos.TITULO_STAFF)
    .texto(
      textos.CORPO_STAFF({
        ligado: c.hollowLigado,
        inicio: hollow.formatarDataHora(c.hollowInicio),
        fim: hollow.formatarDataHora(c.hollowFim),
        pontos: Object.keys(hollow.lerPontos()).length,
        total: REGISTROS.length,
        casa: !!hollow.lerLocais().casa,
        concluidos: hollow.lerConclusoes().length,
        ventoLigado: c.hollowVentoLigado,
        cofres: hollow.lerCofres().length,
      }),
    )
    .botao(textos.BOTAO_LIGAR(c.hollowLigado), ICONES.ajustes, async (p) => {
      if (!staffOk(p)) return;
      salvarConfig({ hollowLigado: !config().hollowLigado });
      ok(p, textos.EVENTO_ESTADO(config().hollowLigado));
      await aqui();
    })
    .botao(textos.BOTAO_DATAS, ICONES.tempo, async (p) => {
      await editarDatas(p);
      await aqui();
    })
    .botao(textos.BOTAO_LOCAIS, ICONES.spawn, (p) => menuLocais(p, aqui))
    .botao(textos.BOTAO_REGISTROS, ICONES.historico, (p) => menuRegistros(p, aqui))
    .botao(textos.BOTAO_COFRES, ICONES.ajustes, (p) => menuCofres(p, aqui))
    .botao(textos.BOTAO_CODIGO, ICONES.ajustes, async (p) => {
      await editarCodigo(p);
      await aqui();
    })
    .botao(textos.BOTAO_AUDIOS, ICONES.ajustes, async (p) => {
      await editarAudios(p);
      await aqui();
    })
    .botao(textos.BOTAO_VENTO, ICONES.ajustes, async (p) => {
      await editarVento(p);
      await aqui();
    });
  if (ehDono(player)) {
    lista
      .botao(textos.BOTAO_VENCEDORES, ICONES.dono, (p) => menuHollowVencedores(p, aqui))
      .botao(textos.BOTAO_RESETAR_JOGADOR, ICONES.apagar, async (p) => {
        await resetarJogador(p);
        await aqui();
      })
      .botao(textos.BOTAO_RESETAR_VENCEDORES, ICONES.apagar, async (p) => {
        await resetarVencedores(p);
        await aqui();
      })
      .botao(textos.BOTAO_DIAS, ICONES.tempo, async (p) => {
        await editarDias(p);
        await aqui();
      });
  }
  await lista.voltar(voltar).abrir(player);
}

// ------------------------------------------------------------------------------------ datas, vento, áudios
/** @param {Player} player */
async function editarDatas(player) {
  if (!staffOk(player)) return;
  const c = config();
  const r = await perguntar(player, textos.TITULO_DATAS, [
    { tipo: "texto", rotulo: textos.ROTULO_INICIO, dica: textos.DICA_DATA, padrao: hollow.formatarDataHora(c.hollowInicio) },
    { tipo: "texto", rotulo: textos.ROTULO_FIM, dica: textos.DICA_DATA, padrao: hollow.formatarDataHora(c.hollowFim) },
  ]);
  if (!r || !staffOk(player)) return;
  const inicio = hollow.lerDataHora(r[0]);
  const fim = hollow.lerDataHora(r[1], true);
  if (inicio === undefined || fim === undefined) return erro(player, textos.DATA_INVALIDA);
  if (fim <= inicio) return erro(player, textos.DATA_INVERTIDA);
  salvarConfig({ hollowInicio: inicio, hollowFim: fim });
  ok(player, textos.DATAS_SALVAS);
}

/** @param {Player} player */
async function editarVento(player) {
  if (!staffOk(player)) return;
  const c = config();
  const r = await perguntar(player, textos.TITULO_VENTO, [
    { tipo: "alternar", rotulo: textos.ROTULO_VENTO_LIGADO, padrao: c.hollowVentoLigado },
    { tipo: "numero", rotulo: textos.ROTULO_VENTO_RAIO, padrao: c.hollowVentoRaio, min: 1, max: 200 },
    { tipo: "numero", rotulo: textos.ROTULO_VENTO_ESPERA, padrao: c.hollowVentoEsperaSeg, min: 5, max: 3600 },
  ]);
  if (!r || !staffOk(player)) return;
  salvarConfig({ hollowVentoLigado: r[0], hollowVentoRaio: r[1], hollowVentoEsperaSeg: r[2] });
  ok(player, textos.VENTO_SALVO);
}

/** @param {Player} player */
async function editarAudios(player) {
  if (!staffOk(player)) return;
  const atual = hollow.lerAudios();
  const r = await perguntar(
    player,
    textos.TITULO_AUDIOS,
    hollow.AUDIOS.map((id) => ({ tipo: "texto", rotulo: textos.ROTULO_AUDIO(id), dica: "https://...", padrao: atual[id] ?? "" })),
  );
  if (!r || !staffOk(player)) return;
  /** @type {Record<string, string>} */
  const novo = {};
  let invalido = false;
  hollow.AUDIOS.forEach((id, i) => {
    const v = String(r[i]).trim();
    if (v === "") return;
    if (hollow.linkValido(v)) novo[id] = v;
    else {
      invalido = true;
      if (atual[id]) novo[id] = atual[id];
    }
  });
  hollow.salvarAudios(novo);
  if (invalido) erro(player, textos.AUDIO_INVALIDO);
  else ok(player, textos.AUDIOS_SALVOS);
}

// ------------------------------------------------------------------------------------ cofres
/** @param {Player} player */
async function editarCodigo(player) {
  if (!staffOk(player)) return;
  const r = await perguntar(player, textos.TITULO_CODIGO, [{ tipo: "texto", rotulo: textos.ROTULO_CODIGO_NOVO, padrao: hollow.codigoCofre() }]);
  if (!r || !staffOk(player)) return;
  const codigo = String(r[0]).replace(/\s/g, "");
  if (!/^[0-9]{4}$/.test(codigo)) return erro(player, textos.CODIGO_INVALIDO);
  salvarConfig({ hollowCofreCodigo: codigo });
  ok(player, textos.CODIGO_SALVO(codigo));
}

/**
 * Marca o bloco que a staff olha como cofre (vários permitidos).
 * @param {Player} player
 * @returns {boolean}
 */
export function marcarCofreOlhando(player) {
  if (!staffOk(player)) return false;
  const bloco = hollow.blocoOlhado(player);
  if (!bloco) {
    erro(player, textos.SEM_BLOCO);
    return false;
  }
  if (bloco.isAir) {
    erro(player, textos.BLOCO_AR);
    return false;
  }
  const ponto = { d: bloco.dimension.id, x: bloco.location.x, y: bloco.location.y, z: bloco.location.z };
  const lista = hollow.lerCofres();
  if (lista.some((p) => p.d === ponto.d && p.x === ponto.x && p.y === ponto.y && p.z === ponto.z)) {
    erro(player, textos.COFRE_JA_MARCADO);
    return false;
  }
  const dono = Object.entries(hollow.lerPontos()).find(([, p]) => p.d === ponto.d && p.x === ponto.x && p.y === ponto.y && p.z === ponto.z);
  if (dono) {
    erro(player, textos.JA_USADO(dono[0]));
    return false;
  }
  if (lista.length >= 50) {
    erro(player, textos.COFRE_LIMITE);
    return false;
  }
  hollow.salvarCofres([...lista, ponto]);
  ok(player, textos.COFRE_MARCADO(`${formatarCoords(ponto)} (${nomeDimensao(ponto.d)})`));
  return true;
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuCofres(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuCofres(player, voltar);
  const lista = new Lista(textos.TITULO_COFRES).texto(textos.CORPO_COFRES);
  lista.botao(textos.BOTAO_MARCAR_COFRE, ICONES.nova, async (p) => {
    marcarCofreOlhando(p);
    await aqui();
  });
  hollow.lerCofres().forEach((ponto, i) => {
    lista.botao(textos.BOTAO_COFRE(i + 1, ponto), ICONES.spawn, (p) => menuCofre(p, i, aqui));
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {number} i
 * @param {Volta} voltar
 */
async function menuCofre(player, i, voltar) {
  if (!staffOk(player)) return;
  const ponto = hollow.lerCofres()[i];
  if (!ponto) return voltar();
  await new Lista(textos.BOTAO_COFRE(i + 1, ponto))
    .texto(`§7${nomeDimensao(ponto.d)}`)
    .botao(textos.BOTAO_IR, ICONES.spawn, async (p) => {
      if (!staffOk(p)) return;
      irPara(p, ponto);
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      const atual = hollow.lerCofres();
      hollow.salvarCofres(atual.filter((_, k) => k !== i));
      ok(p, textos.COFRE_REMOVIDO);
      await voltar();
    })
    .voltar(voltar)
    .abrir(player);
}

// ------------------------------------------------------------------------------------ locais
/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuLocais(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuLocais(player, voltar);
  const locais = hollow.lerLocais();
  const lista = new Lista(textos.TITULO_LOCAIS).texto(textos.CORPO_LOCAIS);
  for (const id of hollow.LOCAIS) {
    const nome = textos.NOMES_LOCAIS[/** @type {keyof typeof textos.NOMES_LOCAIS} */ (id)];
    lista.botao(textos.BOTAO_LOCAL(nome, locais[id]), ICONES.spawn, (p) => menuLocal(p, id, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {string} id
 * @param {Volta} voltar
 */
async function menuLocal(player, id, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuLocal(player, id, voltar);
  const nome = textos.NOMES_LOCAIS[/** @type {keyof typeof textos.NOMES_LOCAIS} */ (id)];
  const atual = hollow.lerLocais()[id];
  await new Lista(nome)
    .texto(textos.CORPO_LOCAL(nome, atual))
    .botao(textos.BOTAO_MARCAR_AQUI, ICONES.nova, async (p) => {
      if (!staffOk(p)) return;
      const l = p.location;
      const todos = hollow.lerLocais();
      todos[id] = { d: p.dimension.id, x: Math.floor(l.x), y: Math.floor(l.y), z: Math.floor(l.z) };
      hollow.salvarLocais(todos);
      ok(p, textos.LOCAL_MARCADO(nome));
      await aqui();
    })
    .botao(textos.BOTAO_IR, ICONES.spawn, async (p) => {
      if (!staffOk(p)) return;
      const alvo = hollow.lerLocais()[id];
      if (!alvo) return erro(p, textos.NADA_MARCADO);
      irPara(p, alvo);
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      const todos = hollow.lerLocais();
      delete todos[id];
      hollow.salvarLocais(todos);
      ok(p, textos.LOCAL_REMOVIDO(nome));
      await aqui();
    })
    .voltar(voltar)
    .abrir(player);
}

/**
 * Leva a staff até um ponto (um bloco acima, para não ficar dentro dele).
 * @param {Player} player
 * @param {{ d: string, x: number, y: number, z: number }} alvo
 */
function irPara(player, alvo) {
  try {
    player.teleport({ x: alvo.x + 0.5, y: alvo.y + 1, z: alvo.z + 0.5 }, { dimension: world.getDimension(alvo.d) });
  } catch (e) {
    erro(player, `Não consegui ir até lá: ${e}`);
  }
}


// ------------------------------------------------------------------------------------ registros
/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuRegistros(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuRegistros(player, voltar);
  const pontos = hollow.lerPontos();
  const lista = new Lista(textos.TITULO_REGISTROS).texto(textos.CORPO_REGISTROS);
  for (const reg of REGISTROS) lista.botao(textos.BOTAO_REGISTRO_STAFF(reg.id, reg.titulo, pontos[reg.id]), ICONES.historico, (p) => menuRegistro(p, reg.id, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Um registro: marcar o bloco que a staff olha, ver, ir até lá, remover.
 * @param {Player} player
 * @param {string} id
 * @param {Volta} voltar
 */
async function menuRegistro(player, id, voltar) {
  if (!staffOk(player)) return;
  const reg = REGISTROS.find((r) => r.id === id);
  if (!reg) return;
  const aqui = () => menuRegistro(player, id, voltar);
  const ponto = hollow.lerPontos()[id];
  let bloco = "?";
  if (ponto) {
    try {
      bloco = world.getDimension(ponto.d).getBlock(ponto)?.typeId ?? "?";
    } catch {
      bloco = "?";
    }
  }
  await new Lista(textos.TITULO_REGISTRO_STAFF(reg.id, reg.titulo))
    .texto(textos.CORPO_REGISTRO_STAFF(reg.local, ponto, bloco))
    .botao(textos.BOTAO_MARCAR_OLHANDO, ICONES.nova, async (p) => {
      marcarOlhando(p, id);
      await aqui();
    })
    .botao(textos.BOTAO_VER_TEXTO, ICONES.buscar, async (p) => {
      await hollow.previa(p, id, aqui);
    })
    .botao(textos.BOTAO_IR, ICONES.spawn, async (p) => {
      if (!staffOk(p)) return;
      const alvo = hollow.lerPontos()[id];
      if (!alvo) return erro(p, textos.NADA_MARCADO);
      irPara(p, alvo);
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (p) => {
      if (!staffOk(p)) return;
      const todos = hollow.lerPontos();
      if (!todos[id]) {
        erro(p, textos.NADA_MARCADO);
        return aqui();
      }
      const { [id]: _fora, ...resto } = todos;
      hollow.salvarPontos(resto);
      ok(p, textos.REGISTRO_REMOVIDO(id));
      await aqui();
    })
    .voltar(voltar)
    .abrir(player);
}

/**
 * Marca o bloco que a staff está olhando como o lar de um registro (um bloco por registro).
 * @param {Player} player
 * @param {string} id
 * @returns {boolean}
 */
export function marcarOlhando(player, id) {
  if (!staffOk(player)) return false;
  const bloco = hollow.blocoOlhado(player);
  if (!bloco) {
    erro(player, textos.SEM_BLOCO);
    return false;
  }
  if (bloco.isAir) {
    erro(player, textos.BLOCO_AR);
    return false;
  }
  const ponto = { d: bloco.dimension.id, x: bloco.location.x, y: bloco.location.y, z: bloco.location.z };
  const todos = hollow.lerPontos();
  if (hollow.lerCofres().some((p) => p.d === ponto.d && p.x === ponto.x && p.y === ponto.y && p.z === ponto.z)) {
    erro(player, textos.COFRE_JA_MARCADO);
    return false;
  }
  const dono = Object.entries(todos).find(([outro, p]) => outro !== id && p.d === ponto.d && p.x === ponto.x && p.y === ponto.y && p.z === ponto.z);
  if (dono) {
    erro(player, textos.JA_USADO(dono[0]));
    return false;
  }
  hollow.salvarPontos({ ...todos, [id]: ponto });
  ok(player, textos.REGISTRO_MARCADO(id, `${formatarCoords(ponto)} (${nomeDimensao(ponto.d)})`));
  return true;
}

// ------------------------------------------------------------------------------------ dono
/**
 * Painel do Dono > Evento Hollow: vencedores.
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuHollowVencedores(player, voltar) {
  if (!donoOk(player)) return;
  const aqui = () => menuHollowVencedores(player, voltar);
  const dias = config().hollowKitsuneDias;
  const todos = hollow.lerConclusoes().sort((a, b) => a.posicao - b.posicao);
  const lista = new Lista(textos.TITULO_VENCEDORES).texto(
    [
      textos.CORPO_VENCEDORES(todos.length, dias),
      "",
      ...(todos.length ? todos.map((v) => textos.LINHA_VENCEDOR({ nome: v.nome, posicao: v.posicao, quando: hollow.formatarDataHora(v.quando), entregue: v.entregue })) : [textos.VENCEDORES_VAZIO]),
    ].join("\n"),
  );
  for (const v of todos.filter((x) => x.posicao <= hollow.POSICOES_KITSUNE && !x.entregue)) {
    lista.botao(`${textos.BOTAO_DAR_KITSUNE(dias)}\n§7${v.posicao}º ${v.nome}`, ICONES.apelido, async (p) => {
      await entregarKitsune(p, v.id);
      await aqui();
    });
  }
  lista.botao(textos.BOTAO_DIAS, ICONES.tempo, async (p) => {
    await editarDias(p);
    await aqui();
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * Entrega o selo Kitsune a uma das duas primeiras posições (confirma antes; marca "entregue" para não duplicar).
 * @param {Player} autor
 * @param {string} idPessoa
 * @returns {Promise<boolean>}
 */
export async function entregarKitsune(autor, idPessoa) {
  if (!donoOk(autor)) return false;
  const v = hollow.lerConclusoes().find((c) => c.id === idPessoa);
  if (!v) return false;
  if (v.posicao > hollow.POSICOES_KITSUNE) {
    erro(autor, textos.KITSUNE_SO_DOIS);
    registrarLogDono(autor.name, "hollow: dar Kitsune", v.nome, false, "recusado: posição acima de 2");
    return false;
  }
  if (v.entregue) {
    erro(autor, textos.KITSUNE_JA_ENTREGUE);
    return false;
  }
  const dias = config().hollowKitsuneDias;
  if (!(await confirmar(autor, { titulo: textos.TITULO_VENCEDORES, texto: textos.CONFIRMA_KITSUNE(v.nome, dias) }))) return false;
  // a conferência acima pode ter demorado: relê e confere de novo antes de dar
  const lista = hollow.lerConclusoes();
  const atual = lista.find((c) => c.id === idPessoa);
  if (!atual || atual.entregue || !ehDono(autor)) return false;
  if (!darKitsuneTempo(autor, atual.nome, dias)) {
    erro(autor, textos.KITSUNE_FALHOU);
    return false;
  }
  atual.entregue = true;
  hollow.salvarConclusoes(lista);
  registrarLogDono(autor.name, "hollow: Kitsune entregue", atual.nome, true, `${dias} dias, posição ${atual.posicao}`);
  return true;
}

/** @param {Player} player */
async function editarDias(player) {
  if (!donoOk(player)) return;
  const r = await perguntar(player, textos.BOTAO_DIAS, [{ tipo: "numero", rotulo: textos.ROTULO_DIAS, padrao: config().hollowKitsuneDias, min: 1, max: 365 }]);
  if (!r || !ehDono(player)) return;
  salvarConfig({ hollowKitsuneDias: r[0] });
  registrarLogDono(player.name, "hollow: dias do Kitsune", String(r[0]), true, "");
  ok(player, textos.DIAS_SALVOS);
}

/**
 * Apaga o progresso de uma pessoa (para testes). A lista de vencedores não muda.
 * @param {Player} player
 */
async function resetarJogador(player) {
  if (!donoOk(player)) return;
  const r = await perguntar(player, textos.TITULO_RESETAR_JOGADOR, [{ tipo: "texto", rotulo: textos.ROTULO_PESSOA }]);
  if (!r || !r[0]) return;
  const pessoa = acharPessoa(r[0]);
  if (!pessoa) return erro(player, textos.PESSOA_NAO_ACHADA);
  if (!(await confirmar(player, { titulo: textos.TITULO_RESETAR_JOGADOR, texto: textos.CONFIRMA_RESETAR_JOGADOR(pessoa.nome) }))) return;
  if (!ehDono(player)) return;
  editarJogador(pessoa.id, (d) => {
    d.hollow = { lidos: [], enigma: false, tentativas: 0, conclusao: 0, relogio: false, cofre: false, tentativasCofre: 0 };
  });
  const online = porId(pessoa.id);
  if (online?.isValid) {
    try {
      online.removeTag(hollow.TAG_HALLOWEEN);
    } catch {
      // pessoa saindo
    }
  }
  registrarLogDono(player.name, "hollow: resetar progresso", pessoa.nome, true, "");
  ok(player, textos.JOGADOR_RESETADO(pessoa.nome));
}

/**
 * Apaga a lista de vencedores (confirmação dupla).
 * @param {Player} player
 */
async function resetarVencedores(player) {
  if (!donoOk(player)) return;
  if (!(await confirmar(player, { titulo: textos.BOTAO_RESETAR_VENCEDORES, texto: textos.CONFIRMA_RESETAR_1 }))) return;
  if (!(await confirmar(player, { titulo: textos.BOTAO_RESETAR_VENCEDORES, texto: textos.CONFIRMA_RESETAR_2 }))) return;
  if (!ehDono(player)) return;
  hollow.salvarConclusoes([]);
  registrarLogDono(player.name, "hollow: resetar vencedores", "", true, "");
  ok(player, textos.VENCEDORES_RESETADOS);
}

