// @ts-check
// Ajustes de cada jogador: scoreboard lateral (e a linha do clã nela), tema do painel (5; 3 do selo
// Kitsune), pedidos de TPA, sons do menu e o visual Kitsune.
// Não importa hud.js: a sidebar percebe a troca sozinha no próximo ciclo.
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, PECAS_DURABILIDADE, TEMAS_MENU } from "../core/db.js";
import { Lista, podeUsarTema, temaDoPainel } from "../core/forms.js";
import { erro, ok } from "../core/util.js";
import * as textos from "../textos/ajustes.js";
import * as textosChat from "../textos/chat_modo.js";
import * as textosDur from "../textos/durabilidade.js";
import * as textosExtras from "../textos/kitsune_extras.js";
import { menuAbate } from "./abate.js";
import { menuKitsune, temSelo } from "./kitsune.js";
import { alternarChegada, menuCorMensagem, menuLooks, nomeCorMensagem } from "./kitsune_extras.js";
import { alternarEsconderPets, menuColecao, menuVitrine, petsEscondidos, vitrineDe } from "./pets.js";
import { menuChat, modoChat } from "./chat_modo.js";
import { MODOS } from "./durabilidade.js";
import { alternarMusica } from "./musica.js";
import { alternarPegadinhas } from "./pegadinhas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/db.js").Tema} Tema */

/** Raposinha de cada tema na escolha. @type {Readonly<Record<Tema, string>>} */
const ICONE_TEMA = Object.freeze({
  laranja: ICONES.temaLaranja,
  black: ICONES.temaBlack,
  sakura: ICONES.temaSakura,
  lunar: ICONES.temaLunar,
  espirito: ICONES.temaEspirito,
});

/**
 * Scoreboard lateral ligada para o jogador (sem escolha própria, vale o hudPadrao da staff).
 * @param {Player | string} player
 * @returns {boolean}
 */
export function hudLigada(player) {
  return dadosJogador(player).ajustes.hud ?? config().hudPadrao;
}

/**
 * Liga ou desliga a scoreboard lateral e avisa.
 * @param {Player} player
 */
function alternarHud(player) {
  const ligada = !hudLigada(player);
  editarJogador(player, (d) => {
    d.ajustes.hud = ligada;
  });
  ok(player, textos.HUD_MUDOU(ligada));
}

/** @param {boolean} ligado */
const icone = (ligado) => (ligado ? ICONES.sim : ICONES.nao);

/**
 * Escolha do tema do painel: os 5, com os de Kitsune travados (cadeado) para quem não tem o selo.
 * Escolher reabre a lista já no tema novo; o travado explica que é cosmético de quem apoia no Discord.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuTemas(player, voltar) {
  const atual = temaDoPainel(player);
  const aqui = (/** @type {Player} */ p) => menuTemas(p, voltar);
  const lista = new Lista(textos.TITULO_TEMAS).texto(textos.CORPO_TEMAS(podeUsarTema(player, "sakura")));
  for (const tema of TEMAS_MENU) {
    const livre = podeUsarTema(player, tema);
    lista.botao(textos.BOTAO_ESCOLHA_TEMA(tema, tema === atual, livre), livre ? ICONE_TEMA[tema] : ICONES.cadeado, async (p) => {
      if (!podeUsarTema(p, tema)) {
        await new Lista(textos.TITULO_TEMA_KITSUNE).texto(textos.TEMA_SO_KITSUNE).voltar(aqui).abrir(p);
        return;
      }
      if (tema !== temaDoPainel(p)) {
        editarJogador(p, (d) => {
          d.ajustes.tema = tema;
        });
        ok(p, textos.TEMA_MUDOU(tema));
      }
      await aqui(p);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Lista de alternâncias; cada clique troca o valor e reabre o menu com o estado novo
 * (o tema abre a escolha, que já reabre no tema novo).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuAjustes(player, voltar) {
  const { tpa, sons, cla, pegadinhas, musica, durabilidade } = dadosJogador(player).ajustes;
  const tema = temaDoPainel(player);
  const hud = hudLigada(player);
  /** @param {(p: Player) => void} trocar */
  const eReabrir = (trocar) => async (/** @type {Player} */ p) => {
    trocar(p);
    await menuAjustes(p, voltar);
  };
  await new Lista(textos.TITULO)
    .texto(textos.CORPO)
    .botao(textos.BOTAO_HUD(hud), icone(hud), eReabrir(alternarHud))
    .botao(textosDur.BOTAO_DURABILIDADE(durabilidade), icone(durabilidade !== "desligado"), (p) => menuDurabilidade(p, () => menuAjustes(p, voltar)))
    .botao(textosChat.BOTAO_AJUSTE(modoChat(player)), ICONES.sim, (p) => menuChat(p, () => menuAjustes(p, voltar)))
    .botao(textos.BOTAO_TEMA(tema), ICONE_TEMA[tema], (p) => menuTemas(p, () => menuAjustes(p, voltar)))
    .botao(
      textos.BOTAO_TPA(tpa),
      icone(tpa),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.tpa = !tpa;
        });
        ok(p, textos.TPA_MUDOU(!tpa));
      }),
    )
    .botao(
      textos.BOTAO_SONS(sons),
      icone(sons),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.sons = !sons;
        });
        ok(p, textos.SONS_MUDOU(!sons));
      }),
    )
    .botao(
      textos.BOTAO_PEGADINHAS(pegadinhas),
      icone(pegadinhas),
      eReabrir((p) => {
        ok(p, textos.PEGADINHAS_MUDOU(alternarPegadinhas(p)));
      }),
    )
    .botao(
      textos.BOTAO_MUSICA(musica),
      icone(musica),
      eReabrir((p) => {
        ok(p, textos.MUSICA_MUDOU(alternarMusica(p)));
      }),
    )
    .botao(
      textos.BOTAO_CLA(cla),
      icone(cla),
      eReabrir((p) => {
        editarJogador(p, (d) => {
          d.ajustes.cla = !cla;
        });
        ok(p, textos.CLA_MUDOU(!cla));
      }),
    )
    .botao(textos.BOTAO_KITSUNE, ICONES.kitsune, (p) => menuCantoKitsune(p, () => menuAjustes(p, voltar)))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Durabilidade no HUD: o modo (placar e aviso / só aviso / desligado) e quais itens ganham linha.
 * Cada clique troca e reabre.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuDurabilidade(player, voltar) {
  const { durabilidade, durabilidadePecas } = dadosJogador(player).ajustes;
  const aqui = (/** @type {Player} */ p) => menuDurabilidade(p, voltar);
  const lista = new Lista(textosDur.TITULO_MENU).texto(textosDur.CORPO_MENU(durabilidade, durabilidadePecas.length));
  lista.botao(textosDur.BOTAO_MODO(durabilidade), icone(durabilidade !== "desligado"), async (p) => {
    const proximo = MODOS[(MODOS.indexOf(durabilidade) + 1) % MODOS.length];
    editarJogador(p, (d) => {
      d.ajustes.durabilidade = proximo;
    });
    ok(p, textosDur.DURABILIDADE_MUDOU(proximo));
    await aqui(p);
  });
  for (const id of PECAS_DURABILIDADE) {
    const ligado = durabilidadePecas.includes(id);
    lista.botao(textosDur.BOTAO_PECA(id, ligado), icone(ligado), async (p) => {
      editarJogador(p, (d) => {
        const atual = d.ajustes.durabilidadePecas;
        d.ajustes.durabilidadePecas = PECAS_DURABILIDADE.filter((x) => (x === id ? !ligado : atual.includes(x)));
      });
      await aqui(p);
    });
  }
  const todos = durabilidadePecas.length === PECAS_DURABILIDADE.length;
  lista.botao(todos ? textosDur.BOTAO_NADA : textosDur.BOTAO_TUDO, icone(!todos), async (p) => {
    editarJogador(p, (d) => {
      d.ajustes.durabilidadePecas = todos ? [] : [...PECAS_DURABILIDADE];
    });
    await aqui(p);
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * Cantinho Kitsune: todas as vantagens do selo reunidas, com atalho para cada uma.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuCantoKitsune(player, voltar) {
  const tem = temSelo(player);
  const aqui = () => menuCantoKitsune(player, voltar);
  const escondidos = petsEscondidos(player);
  const lote = config().petKitsuneLote;
  const tela = new Lista(textos.TITULO_CANTO).texto(`${textos.CANTO_INTRO}\n\n${textos.CANTO_LISTA(tem, lote, escondidos)}${tem ? "" : textos.CANTO_SEM_SELO}`);
  /** @param {(p: Player) => any} fn */
  const so = (fn) => async (/** @type {Player} */ p) => {
    if (!temSelo(p)) {
      erro(p, textos.BLOQUEADO_KITSUNE);
      return aqui();
    }
    return fn(p);
  };
  tela.botao(textos.BOTAO_CANTO_VISUAL, ICONES.apelido, (p) => menuKitsune(p, aqui));
  tela.botao(textos.BOTAO_CANTO_ABATE, ICONES.ajustes, so((p) => menuAbate(p, aqui)));
  tela.botao(textos.BOTAO_CANTO_PAINEL, ICONES.tema, (p) => menuTemas(p, aqui));
  tela.botao(textos.BOTAO_CANTO_PETS(escondidos), ICONES.perfil, so(async (p) => {
    alternarEsconderPets(p);
    await aqui();
  }));
  tela.botao(textos.BOTAO_CANTO_PETS_COLECAO, ICONES.perfil, (p) => menuColecao(p, aqui));
  tela.botao(textosExtras.BOTAO_VITRINE(vitrineDe(player)?.nome ?? ""), ICONES.perfil, so((p) => menuVitrine(p, aqui)));
  tela.botao(textosExtras.BOTAO_LOOKS, ICONES.apelido, (p) => menuLooks(p, aqui));
  tela.botao(textosExtras.BOTAO_COR_MSG(nomeCorMensagem(player)), ICONES.tema, so((p) => menuCorMensagem(p, aqui)));
  tela.botao(textosExtras.BOTAO_CHEGADA(dadosJogador(player).extras.chegada), ICONES.kitsune, so(async (p) => {
    alternarChegada(p);
    await aqui();
  }));
  await tela.voltar(voltar).abrir(player);
}

registrarComando({ nome: "hud", descricao: textos.DESC_HUD }, (p) => alternarHud(p));
