// @ts-check
// Visual Kitsune (selo do booster do Discord): apelido de exibição e tema de cor do nome. Só cosmético,
// nenhuma vantagem no jogo. O nome da conta continua no Perfil ("Conta: ...") para a moderação.
// Não importa identidade.js: quem mostra o nome se inscreve em aoMudarVisual.
import { Player } from "@minecraft/server";
import { ICONES, TAG_KITSUNE } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { dadosJogador, editarJogador, todosJogadores } from "../core/db.js";
import { reduzir, temPalavrao } from "../core/filtro.js";
import { Lista, perguntar } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { pintar, TEMAS_COR, temaValido } from "../cores.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/kitsune.js";

export const APELIDO_MIN = 3;
export const APELIDO_MAX = 16;
/** Ninguém se passa por cargo, pela Kiza ou pelo servidor (comparado também sem as trocas 4 = a, 1 = i...). */
const RESERVADOS = ["admin", "staff", "helper", "moder", "porteiro", "dono", "owner", "kiza", "vulpus", "servidor", "server", "console", "sistema"];
/**
 * Letras do apelido: alfabeto latino (com os acentos do português), números, espaço e _ . -. Letras de
 * outros alfabetos ficam de fora: o "а" cirílico passaria por "a" e o apelido imitaria outra pessoa.
 * O pack do chat (vulpus_chat_bp/scripts/canal.js) aceita as mesmas letras.
 */
export const LETRAS_APELIDO = /^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]+$/;

/** @type {((player: Player) => void)[]} */
const ouvintes = [];

/**
 * Registra quem mostra o nome (nameTag, chat, sidebar) para atualizar quando o visual muda.
 * @param {(player: Player) => void} fn
 */
export function aoMudarVisual(fn) {
  ouvintes.push(fn);
}

/** @param {Player | undefined} player */
function avisarMudanca(player) {
  if (!player?.isValid) return;
  for (const ouvinte of ouvintes) {
    try {
      ouvinte(player);
    } catch (e) {
      registrarErro("Ouvinte do visual Kitsune", e);
    }
  }
}

/**
 * Tem o selo Kitsune (tag do booster).
 * @param {Player} player
 */
export function temSelo(player) {
  try {
    return player.hasTag(TAG_KITSUNE);
  } catch {
    return false;
  }
}

/**
 * Apelido em uso ("" sem selo ou sem apelido).
 * @param {Player} player
 */
export function apelidoDe(player) {
  if (!temSelo(player)) return "";
  // Confere de novo: apelido salvo antes das regras de hoje (ou dado mexido) não aparece.
  const apelido = dadosJogador(player).apelido;
  return apelido && LETRAS_APELIDO.test(apelido) ? apelido : "";
}

/**
 * Tema do nome em uso ("" sem selo ou sem tema).
 * @param {Player} player
 */
export function temaNomeDe(player) {
  if (!temSelo(player)) return "";
  const tema = dadosJogador(player).temaNome;
  return temaValido(tema) ? tema : "";
}

/**
 * Nome que aparece para os outros, sem cor.
 * @param {Player} player
 */
export function nomeVisivel(player) {
  return apelidoDe(player) || player.name;
}

/**
 * Nome que aparece, pintado com o tema (ou com a cor padrão) e com §r no fim.
 * @param {Player} player
 * @param {string} [corPadrao]
 */
export function nomeExibido(player, corPadrao = "§f") {
  const nome = nomeVisivel(player);
  return `${pintar(nome, temaNomeDe(player)) ?? corPadrao + nome}§r`;
}

/** Só letras e números, sem acento (para comparar nomes parecidos). @param {string} texto */
const chave = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Por que o apelido não serve (texto pronto), ou undefined. Não vale imitar o nome (ou o apelido) de
 * outra pessoa registrada ou online, nem nomes de cargo.
 * @param {string} nome  já limpo
 * @param {string} dono  id de quem quer o apelido
 * @returns {string | undefined}
 */
export function problemaApelido(nome, dono) {
  const tamanho = [...nome].length;
  if (tamanho < APELIDO_MIN || tamanho > APELIDO_MAX) return textos.APELIDO_TAMANHO(APELIDO_MIN, APELIDO_MAX);
  if (!LETRAS_APELIDO.test(nome)) return textos.APELIDO_SIMBOLOS;
  const k = chave(nome);
  if (k.length < 2) return textos.APELIDO_SIMBOLOS;
  const r = reduzir(nome);
  if (RESERVADOS.some((x) => k.includes(x) || r.includes(x))) return textos.APELIDO_RESERVADO;
  if (temPalavrao(nome)) return textos.APELIDO_PROIBIDO;
  // Igual a outro nome tirando acento, maiúscula, símbolo e as trocas de letra por número ("K0pe" = "Kope").
  const parecido = (/** @type {string} */ outro) => !!outro && (chave(outro) === k || (r.length >= 3 && reduzir(outro) === r));
  for (const { id, dados } of todosJogadores()) {
    if (id !== dono && (parecido(dados.nome) || parecido(dados.apelido))) return textos.APELIDO_DE_OUTRO;
  }
  if (online().some((p) => p.id !== dono && parecido(p.name))) return textos.APELIDO_DE_OUTRO;
  return undefined;
}

/**
 * Troca o apelido de quem tem o selo.
 * @param {Player} player
 * @param {string} bruto
 * @returns {boolean}
 */
export function definirApelido(player, bruto) {
  if (!temSelo(player)) {
    erro(player, textos.SO_KITSUNE);
    return false;
  }
  const nome = bruto.replace(/§./g, "").trim().replace(/\s+/g, " ");
  const problema = problemaApelido(nome, player.id);
  if (problema) {
    erro(player, problema);
    return false;
  }
  editarJogador(player, (d) => {
    d.apelido = nome;
  });
  avisarMudanca(player);
  ok(player, textos.APELIDO_OK(nomeExibido(player)));
  return true;
}

/**
 * Volta a mostrar o nome da conta.
 * @param {Player} player
 */
export function tirarApelido(player) {
  editarJogador(player, (d) => {
    d.apelido = "";
  });
  avisarMudanca(player);
  ok(player, textos.APELIDO_TIRADO);
}

/**
 * Troca o tema do nome ("" = sem tema).
 * @param {Player} player
 * @param {string} tema
 * @returns {boolean}
 */
export function definirTemaNome(player, tema) {
  if (!temSelo(player)) {
    erro(player, textos.SO_KITSUNE);
    return false;
  }
  if (tema !== "" && !temaValido(tema)) return false;
  editarJogador(player, (d) => {
    d.temaNome = tema;
  });
  avisarMudanca(player);
  ok(player, textos.TEMA_OK(nomeExibido(player)));
  return true;
}

/**
 * Staff apaga o apelido e o tema de alguém (vale offline, pelo id).
 * @param {Player} staff
 * @param {string} alvoId
 * @returns {boolean}
 */
export function resetarVisual(staff, alvoId) {
  if (!ehStaff(staff)) {
    erro(staff, geral.SO_STAFF);
    return false;
  }
  const dados = editarJogador(alvoId, (d) => {
    d.apelido = "";
    d.temaNome = "";
  });
  const alvo = porId(alvoId);
  avisarMudanca(alvo);
  ok(staff, textos.RESETOU(dados.nome));
  if (alvo && alvo.id !== staff.id) msg(alvo, textos.RESETADO);
  return true;
}

/**
 * Menu do visual Kitsune: apelido e cor do nome (quem não tem o selo vê como ganhar).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuKitsune(player, voltar) {
  if (!temSelo(player)) {
    await new Lista(textos.TITULO).texto(textos.SEM_SELO).voltar(voltar).abrir(player);
    return;
  }
  const aqui = () => menuKitsune(player, voltar);
  const lista = new Lista(textos.TITULO)
    .texto(textos.CORPO(nomeExibido(player), player.name, apelidoDe(player) !== ""))
    .botao(textos.BOTAO_APELIDO, ICONES.apelido, async (p) => {
      const resposta = await perguntar(p, textos.TITULO_APELIDO, [
        { tipo: "texto", rotulo: textos.ROTULO_APELIDO(APELIDO_MIN, APELIDO_MAX), dica: p.name, padrao: apelidoDe(p) },
      ]);
      if (resposta && resposta[0] !== "") definirApelido(p, resposta[0]);
      await aqui();
    })
    .botao(textos.BOTAO_COR, ICONES.tema, (p) => menuTemaNome(p, aqui));
  if (apelidoDe(player)) {
    lista.botao(textos.BOTAO_TIRAR, ICONES.nao, async (p) => {
      tirarApelido(p);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Lista de temas com a prévia no próprio nome.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuTemaNome(player, voltar) {
  const nome = nomeVisivel(player);
  const atual = temaNomeDe(player);
  const lista = new Lista(textos.TITULO_COR).texto(textos.COR_ESCOLHA);
  lista.botao(textos.BOTAO_SEM_TEMA(nome, atual === ""), ICONES.nao, async (p) => {
    definirTemaNome(p, "");
    await voltar();
  });
  for (const [id, tema] of Object.entries(TEMAS_COR)) {
    lista.botao(textos.BOTAO_TEMA(pintar(nome, id) ?? nome, tema.nome, id === atual), ICONES.tema, async (p) => {
      definirTemaNome(p, id);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

registrarComando(
  { nome: "apelido", descricao: textos.DESC_APELIDO, parametros: [{ nome: "nome", tipo: "texto", opcional: true }] },
  (p, [nome]) => {
    if (nome === undefined) return menuKitsune(p);
    if (/^(tirar|reset|limpar)$/i.test(String(nome).trim())) {
      tirarApelido(p);
      return;
    }
    definirApelido(p, String(nome));
  },
);

registrarComando(
  { nome: "resetapelido", descricao: textos.DESC_RESET, staff: true, parametros: [{ nome: "jogador", tipo: "jogador" }] },
  (p, [alvo]) => {
    if (!(alvo instanceof Player)) {
      erro(p, geral.JOGADOR_OFFLINE);
      return;
    }
    resetarVisual(p, alvo.id);
  },
);
