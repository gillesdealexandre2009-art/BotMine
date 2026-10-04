// @ts-check
// Menus e comandos dos clãs. As regras ficam em cla_acoes.js (ações), cla_dados.js (dados), cla_terreno.js
// (base e proteção) e cla_guerra.js (guerras). Toda ação reconfere tudo na hora: o form pode estar velho.
import { Player, system, world } from "@minecraft/server";
import { ICONES, NIVEIS_CLA } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config } from "../core/db.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, registrarErro, rodarSeguro } from "../core/util.js";
import { pintar, TEMAS_COR } from "../cores.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/clas.js";
import { saldo } from "./caudas.js";
import * as acoes from "./cla_acoes.js";
import {
  CARGOS_CLA,
  claDe,
  claPorId,
  CORES_CLA,
  defNivel,
  editarCla,
  EMBLEMAS,
  infoNivelCla,
  iniciarClas,
  logStaff,
  membroDe,
  pedidosValidos,
  PERMISSOES,
  pode,
  saqueDisponivel,
  todosClas,
} from "./cla_dados.js";
import { declararGuerra, encerrarPelaStaff, guerraDe, historicoDe, impedimentoGuerra, renderSe } from "./cla_guerra.js";
import {
  alternarBypass,
  alternarProtecao,
  bypassLigado,
  custoMoverBase,
  desmarcarBase,
  expandirBase,
  marcarBase,
  mostrarLimites,
  recargaBase,
} from "./cla_terreno.js";
import { temSelo } from "./kitsune.js";

/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {import("./cla_dados.js").CargoCla} CargoCla */
/** @typedef {() => any} Volta */

const TICKS_AVISO_ENTRADA = 80;
/** De quanto em quanto tempo confere se quem escolheu o tema de um clã ainda é Kitsune (10 s). */
const TICKS_CONFERIR_TEMA = 200;
const TOP_RANKING = 10;
/** Palavras extras do /vulpus:c (o jogo separa a mensagem por espaço e aceita no máximo 8 parâmetros; entre aspas vale uma frase). */
const PALAVRAS_CHAT = 7;

/**
 * Rótulo do slot do Hub: "Clã", com o número de convites (sem clã) ou de pedidos de entrada (com permissão).
 * @param {Player} player
 */
export function rotuloHub(player) {
  const cla = claDe(player);
  if (!cla) return textos.HUB(acoes.convitesDe(player.id).length);
  return textos.HUB(pode(cla, player.id, "convidar") ? pedidosValidos(cla).length + cla.pedidosAlianca.length : 0);
}

/**
 * Menu do clã: visão geral de quem tem clã, ou criar/procurar/convites para quem não tem.
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuCla(player, voltar) {
  const cla = claDe(player);
  if (!cla) return menuSemCla(player, voltar);
  const aqui = () => menuCla(player, voltar);
  const info = infoNivelCla(cla);
  const guerra = guerraDe(cla.id);
  const conectados = online().filter((p) => membroDe(cla, p.id)).length;
  const eu = membroDe(cla, player.id);
  const lista = new Lista(textos.TITULO_CLA).texto(
    textos.VISAO({ cla, info, online: conectados, cargo: eu?.cargo ?? "membro", guerra }),
  );
  const pedidos = pedidosValidos(cla).length;
  lista
    .botao(textos.BOTAO_MEMBROS(cla.membros.length, defNivel(cla.nivel).membros), ICONES.membros, (p) => menuMembros(p, aqui))
    .botao(textos.BOTAO_CONVITES(pedidos), ICONES.convites, (p) => menuConvitesCla(p, aqui))
    .botao(textos.BOTAO_BANCO(cla.banco), ICONES.banco, (p) => menuBanco(p, aqui))
    .botao(textos.BOTAO_TERRENO, ICONES.terreno, (p) => menuTerreno(p, aqui))
    .botao(textos.BOTAO_CASAS(cla.casas.length, defNivel(cla.nivel).casas), ICONES.casaCla, (p) => menuCasasCla(p, aqui))
    .botao(textos.BOTAO_GUERRAS(!!guerra), ICONES.guerra, (p) => menuGuerras(p, aqui))
    .botao(textos.BOTAO_ALIADOS(cla.aliados.length, cla.pedidosAlianca.length), ICONES.aliados, (p) => menuAliados(p, aqui));
  if (pode(cla, player.id, "editar")) {
    lista.botao(textos.BOTAO_AJUSTES, ICONES.ajustes, (p) => menuAjustesCla(p, aqui));
    if (info.proximo) lista.botao(textos.BOTAO_EVOLUIR(info.proximo.nivel), ICONES.nivel, (p) => menuEvoluir(p, aqui));
  }
  lista.botao(textos.BOTAO_RANKING, ICONES.ranking, (p) => menuRanking(p, aqui));
  if (cla.dono === player.id) lista.botao(textos.BOTAO_DISSOLVER, ICONES.apagar, (p) => fluxoDissolver(p, aqui));
  else lista.botao(textos.BOTAO_SAIR, ICONES.sair, (p) => fluxoSair(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} [voltar]
 */
async function menuSemCla(player, voltar) {
  const aqui = () => menuCla(player, voltar);
  const custo = Math.max(0, config().custoCriarCla);
  const convites = acoes.convitesDe(player.id);
  const lista = new Lista(textos.TITULO_CLAS).texto(textos.SEM_CLA_CORPO(custo, saldo(player)));
  if (convites.length) lista.botao(textos.BOTAO_MEUS_CONVITES(convites.length), ICONES.convites, (p) => menuMeusConvites(p, aqui));
  await lista
    .botao(textos.BOTAO_CRIAR(custo), ICONES.nova, (p) => fluxoCriar(p, aqui))
    .botao(textos.BOTAO_PROCURAR, ICONES.buscar, (p) => menuProcurar(p, aqui))
    .botao(textos.BOTAO_RANKING, ICONES.ranking, (p) => menuRanking(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Nome, tag e cor; depois a confirmação com o custo.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function fluxoCriar(player, voltar) {
  const cores = CORES_CLA.slice(0, defNivel(1).cores);
  const resposta = await perguntar(player, textos.TITULO_CRIAR, [
    { tipo: "texto", rotulo: textos.ROTULO_NOME, dica: textos.DICA_NOME },
    { tipo: "texto", rotulo: textos.ROTULO_TAG, dica: "ABC" },
    { tipo: "lista", rotulo: textos.ROTULO_COR, opcoes: cores.map((c) => textos.NOME_COR(c)) },
  ]);
  if (!resposta) return voltar();
  const [nome, tag, indiceCor] = resposta;
  const custo = Math.max(0, config().custoCriarCla);
  const certo = await confirmar(player, {
    titulo: textos.TITULO_CRIAR,
    texto: textos.CONFIRMA_CRIAR(nome, String(tag).toUpperCase(), cores[indiceCor] ?? cores[0], custo),
  });
  if (certo && acoes.criarCla(player, nome, tag, cores[indiceCor] ?? cores[0])) return menuCla(player);
  return voltar();
}

/**
 * Convites recebidos: aceitar ou recusar.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuMeusConvites(player, voltar) {
  const aqui = () => menuMeusConvites(player, voltar);
  const lista = new Lista(textos.TITULO_MEUS_CONVITES);
  const convites = acoes.convitesDe(player.id);
  lista.texto(convites.length ? textos.MEUS_CONVITES_CORPO : textos.SEM_CONVITE);
  for (const c of convites) {
    const cla = claPorId(c.claId);
    if (!cla) continue;
    const tag = cla.tag;
    lista.botao(textos.BOTAO_CONVITE(cla, c.de), ICONES.cla, async (p) => {
      const resposta = await escolher(p, textos.TITULO_CONVITE, textos.CONVITE_DETALHE(cla), [
        [textos.ACEITAR, ICONES.sim, (q) => acoes.aceitarConvite(q, tag)],
        [textos.RECUSAR, ICONES.nao, (q) => acoes.recusarConvite(q, tag)],
      ]);
      if (resposta) return claDe(p) ? menuCla(p) : aqui();
      return aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Lista com algumas ações; devolve true se alguma rodou.
 * @param {Player} player
 * @param {string} titulo
 * @param {string} corpo
 * @param {[string, string, (p: Player) => any][]} opcoes
 * @returns {Promise<boolean>}
 */
async function escolher(player, titulo, corpo, opcoes) {
  let rodou = false;
  const lista = new Lista(titulo).texto(corpo);
  for (const [texto, icone, acao] of opcoes) {
    lista.botao(texto, icone, (p) => {
      rodou = true;
      return acao(p);
    });
  }
  await lista.abrir(player);
  return rodou;
}

/**
 * Todos os clãs, para ver e pedir para entrar.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuProcurar(player, voltar) {
  const aqui = () => menuProcurar(player, voltar);
  const clas = ordenarRanking(todosClas());
  const lista = new Lista(textos.TITULO_PROCURAR).texto(clas.length ? textos.PROCURAR_CORPO : textos.NENHUM_CLA);
  for (const cla of clas) {
    const id = cla.id;
    lista.botao(textos.BOTAO_CLA_LISTA(cla, defNivel(cla.nivel).membros), ICONES.cla, (p) => menuVerCla(p, id, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Ficha pública de um clã (com "Entrar" ou "Pedir para entrar" para quem não tem clã).
 * @param {Player} player
 * @param {string} claId
 * @param {Volta} voltar
 */
async function menuVerCla(player, claId, voltar) {
  const cla = claPorId(claId);
  if (!cla) {
    erro(player, textos.CLA_SUMIU);
    return voltar();
  }
  const lider = cla.dono ? (membroDe(cla, cla.dono)?.nome ?? "?") : textos.SEM_LIDER;
  const lista = new Lista(textos.TITULO_VER(cla.tag)).texto(textos.FICHA(cla, lider, defNivel(cla.nivel).membros));
  if (!claDe(player)) {
    lista.botao(cla.aberto ? textos.BOTAO_ENTRAR : textos.BOTAO_PEDIR, ICONES.nova, (p) => {
      if (acoes.entrarOuPedir(p, claId) && claDe(p)) return menuCla(p);
      return voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- membros

/** @param {Cla} cla */
const membrosOrdenados = (cla) =>
  [...cla.membros].sort((a, b) => CARGOS_CLA.indexOf(a.cargo) - CARGOS_CLA.indexOf(b.cargo) || a.nome.localeCompare(b.nome));

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuMembros(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuMembros(player, voltar);
  const conectados = new Set(online().map((p) => p.id));
  const lista = new Lista(textos.TITULO_MEMBROS).texto(textos.MEMBROS_CORPO(cla.membros.length, defNivel(cla.nivel).membros));
  for (const m of membrosOrdenados(cla)) {
    const id = m.id;
    lista.botao(textos.BOTAO_MEMBRO(m, conectados.has(m.id)), ICONES.jogador, (p) => menuMembro(p, id, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Um membro: promover, rebaixar, expulsar e passar a liderança (conforme o cargo de quem abriu).
 * @param {Player} player
 * @param {string} alvoId
 * @param {Volta} voltar
 */
async function menuMembro(player, alvoId, voltar) {
  const cla = claDe(player);
  const alvo = cla && membroDe(cla, alvoId);
  if (!cla || !alvo) return voltar();
  const aqui = () => menuMembro(player, alvoId, voltar);
  const eu = membroDe(cla, player.id);
  const lista = new Lista(textos.TITULO_MEMBRO(alvo.nome)).texto(textos.MEMBRO_CORPO(alvo, !!porId(alvoId)));
  const mando = !!eu && CARGOS_CLA.indexOf(eu.cargo) < CARGOS_CLA.indexOf(alvo.cargo);
  if (mando && pode(cla, player.id, "promover")) {
    lista.botao(textos.BOTAO_PROMOVER, ICONES.sim, async (p) => {
      acoes.mudarCargo(p, alvoId, 1);
      await aqui();
    });
    lista.botao(textos.BOTAO_REBAIXAR, ICONES.nao, async (p) => {
      acoes.mudarCargo(p, alvoId, -1);
      await aqui();
    });
  }
  if (mando && pode(cla, player.id, "expulsar")) {
    lista.botao(textos.BOTAO_EXPULSAR, ICONES.apagar, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_EXPULSAR, texto: textos.CONFIRMA_EXPULSAR(alvo.nome) })) acoes.expulsar(p, alvoId);
      await voltar();
    });
  }
  if (cla.dono === player.id && alvoId !== player.id) {
    lista.botao(textos.BOTAO_LIDERANCA, ICONES.staff, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_LIDERANCA, texto: textos.CONFIRMA_LIDERANCA(alvo.nome) })) {
        acoes.transferirLideranca(p, alvoId);
      }
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- convites e pedidos

/**
 * Convidar alguém online e responder pedidos de entrada.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuConvitesCla(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuConvitesCla(player, voltar);
  const podeConvidar = pode(cla, player.id, "convidar");
  const pedidos = pedidosValidos(cla);
  const lista = new Lista(textos.TITULO_CONVITES).texto(textos.CONVITES_CORPO(cla.aberto, podeConvidar, pedidos.length));
  if (podeConvidar) {
    lista.botao(textos.BOTAO_CONVIDAR, ICONES.nova, (p) => menuConvidar(p, aqui));
    for (const pedido of pedidos) {
      const id = pedido.id;
      lista.botao(textos.BOTAO_PEDIDO(pedido.nome), ICONES.jogador, async (p) => {
        await escolher(p, textos.TITULO_PEDIDO, textos.PEDIDO_DETALHE(pedido.nome), [
          [textos.ACEITAR, ICONES.sim, (q) => acoes.responderPedido(q, id, true)],
          [textos.RECUSAR, ICONES.nao, (q) => acoes.responderPedido(q, id, false)],
        ]);
        await aqui();
      });
    }
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Quem está online e sem clã.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuConvidar(player, voltar) {
  const pessoas = online()
    .filter((p) => p.id !== player.id && !claDe(p))
    .sort((a, b) => a.name.localeCompare(b.name));
  const lista = new Lista(textos.TITULO_CONVIDAR).texto(pessoas.length ? textos.CONVIDAR_CORPO : textos.NINGUEM_SEM_CLA);
  for (const pessoa of pessoas) {
    const id = pessoa.id;
    lista.botao(pessoa.name, ICONES.jogador, async (p) => {
      const alvo = porId(id);
      if (alvo) acoes.convidar(p, alvo);
      else erro(p, textos.OFFLINE);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- banco

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuBanco(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuBanco(player, voltar);
  const livre = saqueDisponivel(cla, player.id);
  const lista = new Lista(textos.TITULO_BANCO).texto(
    textos.BANCO_CORPO({ banco: cla.banco, saldo: saldo(player), livre, porXp: Math.max(1, config().claCaudasPorXp) }),
  );
  lista.botao(textos.BOTAO_DEPOSITAR, ICONES.caudas, async (p) => {
    const r = await perguntar(p, textos.TITULO_DEPOSITAR, [
      { tipo: "numero", rotulo: textos.ROTULO_VALOR, padrao: 0, min: 0, max: Math.min(saldo(p), 1_000_000) },
    ]);
    if (r && r[0] > 0) acoes.depositar(p, r[0]);
    await aqui();
  });
  if (livre > 0) {
    lista.botao(textos.BOTAO_SACAR, ICONES.vender, async (p) => {
      const atual = claDe(p);
      const teto = atual ? Math.min(atual.banco, saqueDisponivel(atual, p.id), 1_000_000) : 0;
      const r = await perguntar(p, textos.TITULO_SACAR, [{ tipo: "numero", rotulo: textos.ROTULO_VALOR, padrao: 0, min: 0, max: teto }]);
      if (r && r[0] > 0) acoes.sacar(p, r[0]);
      await aqui();
    });
  }
  lista.botao(textos.BOTAO_EXTRATO, ICONES.historico, async (p) => {
    const atual = claDe(p);
    await new Lista(textos.TITULO_EXTRATO)
      .texto(atual?.extrato.length ? atual.extrato.map(textos.LINHA_EXTRATO).join("\n") : textos.EXTRATO_VAZIO)
      .voltar(aqui)
      .abrir(p);
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * Confirma a subida de nível com o custo.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuEvoluir(player, voltar) {
  const cla = claDe(player);
  const info = cla && infoNivelCla(cla);
  if (!cla || !info?.proximo) return voltar();
  const certo = await confirmar(player, { titulo: textos.TITULO_EVOLUIR, texto: textos.CONFIRMA_EVOLUIR(cla, info.proximo) });
  if (certo) acoes.evoluir(player);
  return voltar();
}

// ---------------------------------------------------------------- terreno e casas

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuTerreno(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuTerreno(player, voltar);
  const gerir = pode(cla, player.id, "terreno");
  const custo = custoMoverBase(cla);
  const lista = new Lista(textos.TITULO_TERRENO).texto(
    textos.TERRENO_CORPO({ cla, raioNivel: defNivel(cla.nivel).raio, zona: Math.max(0, config().zonaAmortecimento), custo, recarga: recargaBase(cla) }),
  );
  if (cla.base) lista.botao(textos.BOTAO_LIMITES, ICONES.terreno, (p) => mostrarLimites(p));
  if (gerir) {
    if (cla.base && cla.base.raio < defNivel(cla.nivel).raio) {
      const claId = cla.id;
      lista.botao(textos.BOTAO_CRESCER, ICONES.terreno, async (p) => {
        // O form pode estar velho: quem clicou pode ter saído do clã ou perdido a permissão.
        const atual = claDe(p);
        if (atual?.id !== claId || !pode(atual, p.id, "terreno")) {
          erro(p, textos.SEM_PERMISSAO);
          return aqui();
        }
        const antes = atual.base?.raio ?? 0;
        const raio = expandirBase(claId);
        if (raio > antes) msg(p, textos.BASE_CRESCEU(raio));
        else erro(p, textos.BASE_SEM_ESPACO);
        await aqui();
      });
    }
    lista.botao(cla.base ? textos.BOTAO_MOVER_BASE(custo) : textos.BOTAO_MARCAR_BASE(custo), ICONES.nova, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_TERRENO, texto: textos.CONFIRMA_BASE(!!cla.base, custo) })) marcarBase(p);
      await aqui();
    });
    for (const chave of /** @type {const} */ (["tnt", "creeper", "explosoes", "entidades"])) {
      lista.botao(textos.BOTAO_PROTECAO(chave, cla.protecao[chave]), cla.protecao[chave] ? ICONES.sim : ICONES.nao, async (p) => {
        alternarProtecao(p, chave);
        await aqui();
      });
    }
    lista.botao(textos.BOTAO_ACESSO_ALIADOS(cla.acessoAliados), ICONES.aliados, async (p) => {
      acoes.alternarAjuste(p, "acessoAliados");
      await aqui();
    });
    lista.botao(textos.BOTAO_CONFIANCA(cla.confianca.length), ICONES.cargos, (p) => menuConfianca(p, aqui));
    if (cla.base) {
      lista.botao(textos.BOTAO_DESMARCAR, ICONES.apagar, async (p) => {
        if (await confirmar(p, { titulo: textos.TITULO_TERRENO, texto: textos.CONFIRMA_DESMARCAR })) desmarcarBase(p);
        await aqui();
      });
    }
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Pessoas de fora que constroem na base.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuConfianca(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuConfianca(player, voltar);
  const lista = new Lista(textos.TITULO_CONFIANCA).texto(textos.CONFIANCA_CORPO(cla.confianca.length));
  for (const pessoa of cla.confianca) {
    const id = pessoa.id;
    lista.botao(textos.BOTAO_TIRAR_CONFIANCA(pessoa.nome), ICONES.apagar, async (p) => {
      acoes.removerConfianca(p, id);
      await aqui();
    });
  }
  const candidatos = online().filter((p) => !membroDe(cla, p.id) && !cla.confianca.some((c) => c.id === p.id));
  for (const pessoa of candidatos) {
    const id = pessoa.id;
    lista.botao(textos.BOTAO_DAR_CONFIANCA(pessoa.name), ICONES.nova, async (p) => {
      const alvo = porId(id);
      if (alvo) acoes.adicionarConfianca(p, alvo);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuCasasCla(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuCasasCla(player, voltar);
  const gerir = pode(cla, player.id, "terreno");
  const limite = defNivel(cla.nivel).casas;
  const lista = new Lista(textos.TITULO_CASAS).texto(textos.CASAS_CORPO(cla.casas.length, limite, Math.max(0, config().custoCasaCla)));
  for (const casa of cla.casas) {
    const nome = casa.nome;
    lista.botao(textos.BOTAO_CASA(casa), ICONES.casaCla, async (p) => {
      if (!gerir) return acoes.irCasaCla(p, nome);
      await escolher(p, textos.TITULO_CASA(nome), textos.CASA_DETALHE(casa), [
        [textos.BOTAO_IR, ICONES.casaCla, (q) => acoes.irCasaCla(q, nome)],
        [textos.BOTAO_APAGAR_CASA, ICONES.apagar, async (q) => {
          if (await confirmar(q, { titulo: textos.TITULO_CASA(nome), texto: textos.CONFIRMA_APAGAR_CASA(nome) })) acoes.apagarCasaCla(q, nome);
          await aqui();
        }],
      ]);
    });
  }
  if (gerir && cla.casas.length < limite) {
    lista.botao(textos.BOTAO_NOVA_CASA, ICONES.nova, async (p) => {
      const r = await perguntar(p, textos.TITULO_NOVA_CASA, [{ tipo: "texto", rotulo: textos.ROTULO_CASA, dica: textos.CASA_PADRAO }]);
      if (r) acoes.criarCasaCla(p, r[0]);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- guerras e aliados

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuGuerras(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuGuerras(player, voltar);
  const guerra = guerraDe(cla.id);
  const decide = pode(cla, player.id, "guerra");
  const cfg = config();
  const lista = new Lista(textos.TITULO_GUERRAS).texto(guerra ? textos.GUERRA_CORPO(guerra, cla.id) : textos.SEM_GUERRA_CORPO(cfg));
  if (decide && !guerra) lista.botao(textos.BOTAO_DECLARAR, ICONES.guerra, (p) => menuDeclarar(p, aqui));
  if (decide && guerra) {
    lista.botao(textos.BOTAO_RENDER, ICONES.nao, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_GUERRAS, texto: textos.CONFIRMA_RENDER })) renderSe(p);
      await aqui();
    });
  }
  lista.botao(textos.BOTAO_HISTORICO, ICONES.historico, async (p) => {
    const h = historicoDe(cla.id);
    await new Lista(textos.TITULO_HISTORICO)
      .texto(h.length ? h.map((x) => textos.LINHA_HISTORICO(x, cla.id)).join("\n") : textos.HISTORICO_VAZIO)
      .voltar(aqui)
      .abrir(p);
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * Clãs que dá para atacar (os outros aparecem com o motivo).
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuDeclarar(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const lista = new Lista(textos.TITULO_DECLARAR).texto(textos.DECLARAR_CORPO(Math.max(0, config().custoGuerra)));
  for (const alvo of ordenarRanking(todosClas()).filter((c) => c.id !== cla.id)) {
    const motivo = impedimentoGuerra(cla, alvo);
    if (motivo) {
      lista.rotulo(textos.ALVO_BLOQUEADO(alvo, motivo));
      continue;
    }
    const id = alvo.id;
    lista.botao(textos.BOTAO_ALVO(alvo), ICONES.guerra, async (p) => {
      if (await confirmar(p, { titulo: textos.TITULO_DECLARAR, texto: textos.CONFIRMA_DECLARAR(alvo, config()) })) declararGuerra(p, id);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuAliados(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const aqui = () => menuAliados(player, voltar);
  const decide = pode(cla, player.id, "guerra");
  const lista = new Lista(textos.TITULO_ALIADOS).texto(textos.ALIADOS_CORPO(cla.aliados.length, cla.acessoAliados));
  for (const id of cla.aliados) {
    const outro = claPorId(id);
    if (!outro) continue;
    lista.botao(textos.BOTAO_ALIADO(outro), ICONES.aliados, async (p) => {
      if (!decide) return menuVerCla(p, id, aqui);
      if (await confirmar(p, { titulo: textos.TITULO_ALIADOS, texto: textos.CONFIRMA_DESFAZER(outro) })) acoes.desfazerAlianca(p, id);
      await aqui();
    });
  }
  if (decide) {
    for (const id of cla.pedidosAlianca) {
      const outro = claPorId(id);
      if (!outro) continue;
      lista.botao(textos.BOTAO_PEDIDO_ALIANCA(outro), ICONES.convites, async (p) => {
        await escolher(p, textos.TITULO_ALIADOS, textos.PEDIDO_ALIANCA_DETALHE(outro), [
          [textos.ACEITAR, ICONES.sim, (q) => acoes.responderAlianca(q, id, true)],
          [textos.RECUSAR, ICONES.nao, (q) => acoes.responderAlianca(q, id, false)],
        ]);
        await aqui();
      });
    }
    lista.botao(textos.BOTAO_PEDIR_ALIANCA, ICONES.nova, (p) => menuPedirAlianca(p, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuPedirAlianca(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const outros = ordenarRanking(todosClas()).filter((c) => c.id !== cla.id && !cla.aliados.includes(c.id));
  const lista = new Lista(textos.TITULO_PEDIR_ALIANCA).texto(outros.length ? textos.PEDIR_ALIANCA_CORPO : textos.NENHUM_CLA);
  for (const outro of outros) {
    const id = outro.id;
    lista.botao(textos.BOTAO_CLA_LISTA(outro, defNivel(outro.nivel).membros), ICONES.cla, async (p) => {
      acoes.pedirAlianca(p, id);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- ajustes do clã

/**
 * Nome, descrição, cor (ou tema Kitsune), emblema, aberto/fechado, fogo amigo e permissões dos cargos.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuAjustesCla(player, voltar) {
  const cla = claDe(player);
  if (!cla || !pode(cla, player.id, "editar")) return voltar();
  const aqui = () => menuAjustesCla(player, voltar);
  const lista = new Lista(textos.TITULO_AJUSTES)
    .texto(textos.AJUSTES_CORPO(cla))
    .botao(textos.BOTAO_RENOMEAR, ICONES.editar, async (p) => {
      const r = await perguntar(p, textos.BOTAO_RENOMEAR, [{ tipo: "texto", rotulo: textos.ROTULO_NOME, padrao: cla.nome }]);
      if (r && r[0]) acoes.renomear(p, r[0]);
      await aqui();
    })
    .botao(textos.BOTAO_DESCRICAO, ICONES.editar, async (p) => {
      const r = await perguntar(p, textos.BOTAO_DESCRICAO, [{ tipo: "texto", rotulo: textos.ROTULO_DESCRICAO, padrao: cla.desc }]);
      if (r) acoes.mudarDescricao(p, r[0]);
      await aqui();
    })
    .botao(textos.BOTAO_COR, ICONES.tema, (p) => menuCorCla(p, aqui))
    .botao(textos.BOTAO_EMBLEMA, ICONES.cla, (p) => menuEmblema(p, aqui))
    .botao(textos.BOTAO_ABERTO(cla.aberto), cla.aberto ? ICONES.sim : ICONES.nao, async (p) => {
      acoes.alternarAjuste(p, "aberto");
      await aqui();
    })
    .botao(textos.BOTAO_FOGO_AMIGO(cla.fogoAmigo), cla.fogoAmigo ? ICONES.sim : ICONES.nao, async (p) => {
      acoes.alternarAjuste(p, "fogoAmigo");
      await aqui();
    });
  if (cla.dono === player.id) lista.botao(textos.BOTAO_PERMISSOES, ICONES.cargos, (p) => menuPermissoes(p, aqui));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Cores liberadas pelo nível e, para quem tem o selo Kitsune, os temas de cor.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuCorCla(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const liberadas = defNivel(cla.nivel).cores;
  const kitsune = temSelo(player);
  const lista = new Lista(textos.TITULO_COR).texto(textos.COR_CORPO(kitsune));
  CORES_CLA.forEach((cor, i) => {
    if (i < liberadas) {
      lista.botao(textos.BOTAO_COR_SOLIDA(cla.tag, cor, cla.tema === "" && cla.cor === cor), ICONES.tema, async (p) => {
        acoes.mudarCor(p, cor);
        await voltar();
      });
    } else lista.rotulo(textos.COR_TRANCADA(cor, nivelQueLibera(i, "cores")));
  });
  if (kitsune) {
    lista.cabecalho(textos.CABECALHO_TEMAS);
    for (const [id, tema] of Object.entries(TEMAS_COR)) {
      lista.botao(textos.BOTAO_TEMA_CLA(pintar(cla.tag, id) ?? cla.tag, tema.nome, cla.tema === id), ICONES.kitsune, async (p) => {
        acoes.mudarTemaCla(p, id);
        await voltar();
      });
    }
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Primeiro nível que libera o item i da lista (cores ou emblemas).
 * @param {number} i
 * @param {"cores" | "emblemas"} campo
 */
function nivelQueLibera(i, campo) {
  return (NIVEIS_CLA.find((n) => n[campo] > i) ?? NIVEIS_CLA[NIVEIS_CLA.length - 1]).nivel;
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuEmblema(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const liberados = defNivel(cla.nivel).emblemas;
  const lista = new Lista(textos.TITULO_EMBLEMA).texto(textos.EMBLEMA_CORPO);
  EMBLEMAS.forEach((codigo, i) => {
    if (i < liberados) {
      lista.botao(textos.BOTAO_EMBLEMA_ITEM(codigo, i, cla.emblema === i), ICONES.cla, async (p) => {
        acoes.mudarEmblema(p, i);
        await voltar();
      });
    } else lista.rotulo(textos.EMBLEMA_TRANCADO(codigo, i, nivelQueLibera(i, "emblemas")));
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * Líder escolhe o cargo e marca as permissões e o limite de saque por dia.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuPermissoes(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  const lista = new Lista(textos.TITULO_PERMISSOES).texto(textos.PERMISSOES_CORPO(cla));
  for (const cargo of /** @type {const} */ (["vice", "oficial", "membro", "recruta"])) {
    lista.botao(textos.NOME_CARGO[cargo], ICONES.cargos, async (p) => {
      const atual = claDe(p);
      if (!atual) return voltar();
      const r = await perguntar(p, textos.TITULO_PERMS_DE(cargo), [
        ...PERMISSOES.map((perm) => ({ tipo: "alternar", rotulo: textos.NOME_PERMISSAO[perm], padrao: atual.perms[cargo].includes(perm) })),
        { tipo: "numero", rotulo: textos.ROTULO_LIMITE, padrao: atual.limites[cargo], min: 0, max: 1_000_000 },
      ]);
      if (r) acoes.definirCargoPerms(p, cargo, PERMISSOES.filter((_, i) => r[i] === true), r[PERMISSOES.length]);
      await menuPermissoes(p, voltar);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- ranking, sair e dissolver

/** @param {Cla[]} clas */
function ordenarRanking(clas) {
  return [...clas].sort((a, b) => b.nivel - a.nivel || b.xp - a.xp || b.membros.length - a.membros.length || a.nome.localeCompare(b.nome));
}

/**
 * Top 10 por nível, XP e membros.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function menuRanking(player, voltar) {
  const todos = ordenarRanking(todosClas());
  const meu = claDe(player)?.id;
  const linhas = todos.slice(0, TOP_RANKING).map((c, i) => textos.RANKING_LINHA(i + 1, c, c.id === meu));
  const posicao = meu ? todos.findIndex((c) => c.id === meu) + 1 : 0;
  const corpo = todos.length ? [...linhas, "", ...(posicao ? [textos.RANKING_POSICAO(posicao)] : [])] : [textos.NENHUM_CLA];
  await new Lista(textos.TITULO_RANKING).texto(corpo.join("\n")).voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {Volta} voltar
 */
async function fluxoSair(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  if (await confirmar(player, { titulo: textos.BOTAO_SAIR, texto: textos.CONFIRMA_SAIR(cla) })) {
    if (acoes.sair(player)) return;
  }
  return voltar();
}

/**
 * Confirmação dupla: o banco volta para o líder e uma guerra em andamento vira rendição.
 * @param {Player} player
 * @param {Volta} voltar
 */
async function fluxoDissolver(player, voltar) {
  const cla = claDe(player);
  if (!cla) return voltar();
  if (!(await confirmar(player, { titulo: textos.BOTAO_DISSOLVER, texto: textos.CONFIRMA_DISSOLVER_1(cla) }))) return voltar();
  const certeza = await confirmar(player, {
    titulo: textos.BOTAO_DISSOLVER,
    texto: textos.CONFIRMA_DISSOLVER_2(cla, !!guerraDe(cla.id)),
    sim: textos.SIM_DISSOLVER,
  });
  if (certeza && acoes.dissolver(player)) return;
  return voltar();
}

// ---------------------------------------------------------------- staff

/**
 * Painel da staff para os clãs: bypass, lista (ver, remover, trocar tag, encerrar guerra) e log.
 * @param {Player} player
 * @param {Volta} [voltar]
 */
export async function menuClasStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuClasStaff(player, voltar);
  const clas = ordenarRanking(todosClas());
  const lista = new Lista(textos.TITULO_STAFF)
    .texto(textos.STAFF_CORPO(clas.length))
    .botao(textos.BOTAO_BYPASS(bypassLigado(player.id)), ICONES.bypass, async (p) => {
      alternarBypass(p);
      await aqui();
    })
    .botao(textos.BOTAO_LOG, ICONES.historico, async (p) => {
      const log = logStaff();
      await new Lista(textos.TITULO_LOG)
        .texto(log.length ? log.map(textos.LINHA_LOG).join("\n") : textos.LOG_VAZIO)
        .voltar(aqui)
        .abrir(p);
    });
  for (const cla of clas) {
    const id = cla.id;
    lista.botao(textos.BOTAO_CLA_LISTA(cla, defNivel(cla.nivel).membros), ICONES.cla, (p) => menuClaStaff(p, id, aqui));
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {string} claId
 * @param {Volta} voltar
 */
async function menuClaStaff(player, claId, voltar) {
  const cla = claPorId(claId);
  if (!cla || !ehStaff(player)) return voltar();
  const aqui = () => menuClaStaff(player, claId, voltar);
  const lider = cla.dono ? (membroDe(cla, cla.dono)?.nome ?? "?") : textos.SEM_LIDER;
  const guerra = guerraDe(cla.id);
  const lista = new Lista(textos.TITULO_VER(cla.tag)).texto(textos.FICHA_STAFF(cla, lider, defNivel(cla.nivel).membros, guerra));
  lista.botao(textos.BOTAO_MUDAR_TAG, ICONES.editar, async (p) => {
    const r = await perguntar(p, textos.BOTAO_MUDAR_TAG, [{ tipo: "texto", rotulo: textos.ROTULO_TAG, padrao: cla.tag }]);
    if (r && r[0]) acoes.mudarTagPelaStaff(p, claId, r[0]);
    await aqui();
  });
  if (guerra) {
    const guerraId = guerra.id;
    lista.botao(textos.BOTAO_ENCERRAR_GUERRA, ICONES.guerra, async (p) => {
      if (await confirmar(p, { titulo: textos.BOTAO_ENCERRAR_GUERRA, texto: textos.CONFIRMA_ENCERRAR })) encerrarPelaStaff(p, guerraId);
      await aqui();
    });
  }
  lista.botao(textos.BOTAO_REMOVER_CLA, ICONES.apagar, async (p) => {
    const um = await confirmar(p, { titulo: textos.BOTAO_REMOVER_CLA, texto: textos.CONFIRMA_REMOVER_1(cla) });
    const dois = um && (await confirmar(p, { titulo: textos.BOTAO_REMOVER_CLA, texto: textos.CONFIRMA_REMOVER_2(cla), sim: textos.SIM_REMOVER }));
    if (dois && acoes.removerPelaStaff(p, claId)) return voltar();
    await aqui();
  });
  await lista.voltar(voltar).abrir(player);
}

// ---------------------------------------------------------------- eventos e comandos

world.afterEvents.worldLoad.subscribe(() => iniciarClas());

// Ao entrar: o nome guardado no clã acompanha a conta, quem perdeu o selo Kitsune longe daqui perde o tema
// que escolheu para o clã, e quem decide vê o que está esperando.
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    if (!player.isValid) return;
    rodarSeguro(player, "Clã ao entrar", (p) => {
      acoes.conferirTemaKitsune(p);
      const cla = claDe(p);
      if (!cla) return;
      const m = membroDe(cla, p.id);
      if (m && m.nome !== p.name) {
        editarCla(cla.id, (c) => {
          const membro = membroDe(c, p.id);
          if (membro) membro.nome = p.name;
        });
      }
      const pedidos = pode(cla, p.id, "convidar") ? pedidosValidos(cla).length : 0;
      const aliancas = pode(cla, p.id, "guerra") ? cla.pedidosAlianca.length : 0;
      if (pedidos || aliancas) msg(p, textos.PENDENTES_AO_ENTRAR(pedidos, aliancas));
      const guerra = guerraDe(cla.id);
      if (guerra) msg(p, textos.GUERRA_AO_ENTRAR(guerra, cla.id));
    });
  }, TICKS_AVISO_ENTRADA);
});

// O selo Kitsune pode sair com a pessoa online (staff, /tag, bot): o tema que ela escolheu para o clã sai junto.
system.runInterval(() => {
  try {
    const donos = new Set(todosClas().map((c) => c.temaPor).filter((id) => id !== ""));
    if (!donos.size) return;
    for (const p of online()) if (donos.has(p.id)) acoes.conferirTemaKitsune(p);
  } catch (e) {
    registrarErro("Tema Kitsune do clã", e);
  }
}, TICKS_CONFERIR_TEMA);

registrarComando({ nome: "cla", descricao: textos.DESC_CLA }, (p) => menuCla(p));

registrarComando(
  {
    nome: "c",
    descricao: textos.DESC_C,
    parametros: [
      { nome: "mensagem", tipo: "texto" },
      ...Array.from({ length: PALAVRAS_CHAT }, (_, i) => ({ nome: `p${i + 2}`, tipo: "texto", opcional: true })),
    ],
  },
  (p, palavras) => acoes.falarNoCla(p, palavras.filter((x) => typeof x === "string").join(" ")),
);

registrarComando(
  { nome: "claconvidar", descricao: textos.DESC_CONVIDAR, parametros: [{ nome: "jogador", tipo: "jogador" }] },
  (p, [alvo]) => {
    if (!(alvo instanceof Player)) {
      erro(p, geral.JOGADOR_OFFLINE);
      return;
    }
    acoes.convidar(p, alvo);
  },
);

registrarComando(
  { nome: "claaceitar", descricao: textos.DESC_ACEITAR, parametros: [{ nome: "tag", tipo: "texto", opcional: true }] },
  (p, [tag]) => acoes.aceitarConvite(p, tag),
);

registrarComando(
  { nome: "clarecusar", descricao: textos.DESC_RECUSAR, parametros: [{ nome: "tag", tipo: "texto", opcional: true }] },
  (p, [tag]) => acoes.recusarConvite(p, tag),
);

registrarComando(
  { nome: "clacasa", descricao: textos.DESC_CASA, parametros: [{ nome: "nome", tipo: "texto", opcional: true }] },
  (p, [nome]) => acoes.irCasaCla(p, nome),
);

registrarComando(
  { nome: "cladepositar", descricao: textos.DESC_DEPOSITAR, parametros: [{ nome: "valor", tipo: "inteiro" }] },
  (p, [valor]) => acoes.depositar(p, valor),
);

registrarComando({ nome: "clabypass", descricao: textos.DESC_BYPASS, staff: true }, (p) => alternarBypass(p));
