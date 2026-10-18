// @ts-check
// Menus dos minigames: o do jogador (entrar, votar, sair, rankings, como funciona) e o da staff (construir o hub, montar um mapa
// para visitar, ir ao hub/arena, portal do lobby, forçar, encerrar, devolver, diagnóstico e configurações).
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { ehDono } from "../core/dono.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/mg.js";
import { ARENA, HUB } from "./mg_arena.js";
import { dimensaoMg } from "./mg.js";
import { JOGOS, construir, devolverPresos, diagnostico, encerrarStaff, entrar, estadoPartida, forcarInicio, marcasDe, menuVotacao, participa, rankingJogo, sair } from "./mg_motor.js";
import { marcarPortalMg, quantosPortais, removerPortaisMg } from "./mg_portal.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * Menu do jogador.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuMinigames(player, voltar) {
  const aqui = () => menuMinigames(player, voltar);
  const e = estadoPartida();
  const m = marcasDe(player.id);
  const dentro = participa(player.id);
  const estado = `${textos.ESTADOS[e.estado] ?? ""}${e.jogo ? ` §7· §b${e.jogo} §7em §f${e.mapa}` : ""}`;
  const tela = new Lista(textos.TITULO).texto(textos.CORPO_MENU(estado, e.n, e.min, e.max, e.seg, textos.MEUS(m.vitorias, m.partidas, m.abates)));
  if (dentro) {
    tela.botao(textos.BOTAO_VOTAR, ICONES.sim, async (p) => {
      await menuVotacao(p);
      await aqui();
    });
    tela.botao(textos.BOTAO_SAIR, ICONES.voltar, async (p) => {
      if (await confirmar(p, { titulo: textos.BOTAO_SAIR, texto: textos.SAIR_CONFIRMA })) sair(p);
    });
  } else tela.botao(textos.BOTAO_ENTRAR, ICONES.nova, (p) => entrar(p));
  tela.botao(textos.BOTAO_RANKING, ICONES.trofeu, async (p) => {
    const sub = new Lista(textos.RANKING_TITULO);
    for (const j of JOGOS.values()) {
      sub.botao(j.nome, ICONES.trofeu, async (q) => {
        const top = rankingJogo(j.id, 10);
        const corpo = top.length ? top.map((l, i) => textos.RANKING_LINHA(i + 1, l.nome, l.v, l.k)).join("\n") : textos.RANKING_VAZIO;
        await new Lista(`${textos.RANKING_TITULO}: ${j.nome}`).texto(corpo).voltar(() => menuMinigames(q, voltar)).abrir(q);
      });
    }
    await sub.voltar(aqui).abrir(p);
  });
  tela.botao(textos.BOTAO_COMO, ICONES.regras, (p) => new Lista(textos.COMO_TITULO).texto(textos.COMO_TEXTO).voltar(aqui).abrir(p));
  await tela.voltar(voltar).abrir(player);
}

/**
 * Menu da staff.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]
 */
export async function menuMgStaff(player, voltar, configurar) {
  if (!ehStaff(player)) return erro(player, SO_STAFF);
  const aqui = () => menuMgStaff(player, voltar, configurar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const d = diagnostico();
  const tela = new Lista(textos.TITULO_STAFF).texto(textos.CORPO_STAFF(`${textos.DIAGNOSTICO(d)}\n§fJogos: §e${d.jogos}§7 · mapas: §e${d.mapas}\n${textos.PORTAIS_POSTOS(quantosPortais())}`));
  if (ehDono(player)) {
    tela.botao(textos.BOTAO_CONSTRUIR, ICONES.nova, eVolta(async (p) => {
      if (await confirmar(p, { titulo: textos.BOTAO_CONSTRUIR, texto: textos.CONFIRMAR_CONSTRUIR })) await construir(p, true);
    }));
    tela.botao(textos.BOTAO_ARENA, ICONES.nova, eVolta(async (p) => {
      const jogos = [...JOGOS.values()];
      const r = await perguntar(p, textos.BOTAO_ARENA, [{ tipo: "lista", rotulo: "Jogo", opcoes: jogos.map((j) => j.nome), padrao: 0 }]);
      if (!r || !ehDono(p)) return;
      const jogo = jogos[r[0]];
      const r2 = await perguntar(p, textos.BOTAO_ARENA, [{ tipo: "lista", rotulo: "Mapa", opcoes: jogo.mapas.map((m) => m.nome), padrao: 0 }]);
      if (!r2 || !ehDono(p)) return;
      await construir(p, false, { jogoId: jogo.id, mapaId: jogo.mapas[r2[0]].id });
    }));
  }
  tela.botao(textos.BOTAO_PORTAL_POR, ICONES.spawn, eVolta((p) => marcarPortalMg(p)));
  if (quantosPortais() > 0) tela.botao(textos.BOTAO_PORTAL_TIRAR, ICONES.apagar, eVolta((p) => removerPortaisMg(p)));
  tela.botao(textos.BOTAO_IR_HUB, ICONES.tpa, eVolta((p) => irA(p, { x: HUB.x + 0.5, y: HUB.y + 1, z: HUB.z + 0.5 })));
  tela.botao(textos.BOTAO_IR_ARENA, ICONES.tpa, eVolta((p) => irA(p, { x: ARENA.x + 0.5, y: ARENA.y + 12, z: ARENA.z + 0.5 })));
  tela.botao(textos.BOTAO_FORCAR, ICONES.sim, eVolta((p) => forcarInicio(p)));
  tela.botao(textos.BOTAO_ENCERRAR, ICONES.apagar, eVolta((p) => encerrarStaff(p)));
  tela.botao(textos.BOTAO_DEVOLVER, ICONES.voltar, eVolta((p) => devolverPresos(p)));
  if (configurar) tela.botao(textos.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurar(p)));
  await tela.voltar(voltar).abrir(player);
}

/** Staff passeia pela dimensão dos minigames (sem passar pelo guarda-volumes). @param {Player} p @param {{ x: number, y: number, z: number }} ponto */
function irA(p, ponto) {
  const dim = dimensaoMg();
  if (!dim) return erro(p, textos.SEM_DIMENSAO);
  try {
    p.teleport(ponto, { dimension: dim });
  } catch {
    erro(p, textos.SEM_DIMENSAO);
  }
}

registrarComando({ nome: "minigames", descricao: textos.CMD_MINIGAMES }, (p) => menuMinigames(p));
