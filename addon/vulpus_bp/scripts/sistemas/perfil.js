// @ts-check
// Perfil: estatísticas do jogador (ou de outra pessoa, inclusive offline pelo id).
import { Player } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador } from "../core/db.js";
import { Lista } from "../core/forms.js";
import { outros, porId } from "../core/jogadores.js";
import { erro } from "../core/util.js";
import { JOGADOR_OFFLINE } from "../textos/geral.js";
import * as textos from "../textos/perfil.js";
import { sequenciaAtual } from "./caudas.js";

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
  const lista = new Lista(proprio ? textos.TITULO : textos.TITULO_DE(dados.nome)).texto(
    textos.CORPO({
      nome: dados.nome,
      online: Boolean(alvoOnline),
      caudas: dados.caudas,
      tempo: dados.tempo,
      primeira: dados.primeira,
      sequencia: sequenciaAtual(dados),
      mortes: dados.mortes,
      casas: dados.casas.length,
      limiteCasas: config().limiteCasas,
    }),
  );
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
