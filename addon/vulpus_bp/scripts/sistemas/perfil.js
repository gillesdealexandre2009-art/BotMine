// @ts-check
// Perfil: estatísticas do jogador (ou de outra pessoa, inclusive offline pelo id).
import { Player } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { outros, porId } from "../core/jogadores.js";
import { erro } from "../core/util.js";
import { glyph } from "../glyphs.js";
import { JOGADOR_OFFLINE } from "../textos/geral.js";
import * as textos from "../textos/perfil.js";
import { sequenciaAtual } from "./caudas.js";
import { claDe, membroDe, tagPintada } from "./cla_dados.js";
import { CARGOS, cargoDe, ehKitsune, selo } from "./identidade.js";
import { apelidoDe, nomeExibido } from "./kitsune.js";
import { infoNivel, menuNivel } from "./niveis.js";

/**
 * Perfil de quem abriu ou, com alvoId, de outra pessoa.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {string} [alvoId]  id do jogador a mostrar (padrão: o próprio)
 */
export async function menuPerfil(player, voltar, alvoId) {
  const id = alvoId ?? player.id;
  const proprio = id === player.id;
  const alvoOnline = proprio ? player : porId(id);
  const dados = dadosJogador(alvoOnline ?? id);
  const info = infoNivel(alvoOnline ?? id);
  // Cargo e Kitsune vêm das tags: só dá para ler de quem está online.
  const cargo = alvoOnline ? cargoDe(alvoOnline) : null;
  const cla = claDe(id);
  const aqui = () => menuPerfil(player, voltar, alvoId);
  const lista = new Lista(proprio ? textos.TITULO : textos.TITULO_DE(dados.nome)).texto(
    textos.CORPO({
      nome: alvoOnline ? nomeExibido(alvoOnline) : dados.nome,
      conta: alvoOnline && apelidoDe(alvoOnline) ? alvoOnline.name : null,
      cla: cla ? { tag: tagPintada(cla), nome: cla.nome, cargo: membroDe(cla, id)?.cargo ?? "membro" } : null,
      online: Boolean(alvoOnline),
      selo: alvoOnline ? selo(alvoOnline) : glyph(info.rank.glyph),
      rank: info.rank,
      nivel: info.nivel,
      xpNoNivel: info.xpNoNivel,
      xpParaProximo: info.xpParaProximo,
      cargo: cargo ? CARGOS[cargo] : null,
      kitsune: alvoOnline ? ehKitsune(alvoOnline) : false,
      caudas: dados.caudas,
      tempo: dados.tempo,
      primeira: dados.primeira,
      sequencia: sequenciaAtual(dados),
      mortes: dados.mortes,
      casas: dados.casas.length,
      limiteCasas: config().limiteCasas,
    }),
  );
  lista.botao(textos.BOTAO_NIVEL, ICONES.nivel, (p) => menuNivel(p, aqui, alvoId));
  if (proprio) lista.botao(textos.BOTAO_OUTRO, ICONES.online, (p) => escolherJogador(p, () => menuPerfil(p, voltar)));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Lista de quem está online para ver o perfil.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function escolherJogador(player, voltar) {
  const aqui = () => escolherJogador(player, voltar);
  const pessoas = outros(player).sort((a, b) => a.name.localeCompare(b.name));
  const lista = new Lista(textos.TITULO_OUTROS).texto(pessoas.length ? textos.ESCOLHA : textos.SO_VOCE);
  for (const pessoa of pessoas) {
    const id = pessoa.id;
    lista.botao(pessoa.name, ICONES.jogador, (p) => menuPerfil(p, aqui, id));
  }
  await lista.voltar(voltar).abrir(player);
}

registrarComando(
  { nome: "perfil", descricao: textos.DESC_PERFIL, parametros: [{ nome: "jogador", tipo: "jogador", opcional: true }] },
  (p, [alvo]) => {
    if (alvo === null) {
      erro(p, JOGADOR_OFFLINE);
      return;
    }
    return menuPerfil(p, undefined, alvo instanceof Player ? alvo.id : undefined);
  },
);
