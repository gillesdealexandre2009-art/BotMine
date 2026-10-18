// @ts-check
// Visual Kitsune (selo do booster do Discord): apelido de exibição e tema de cor do nome. Só cosmético,
// nenhuma vantagem no jogo. O nome da conta continua no Perfil ("Conta: ...") para a moderação.
// Não importa identidade.js: quem mostra o nome se inscreve em aoMudarVisual.
import { Player } from "@minecraft/server";
import { ICONES, TAG_KITSUNE } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, todosJogadores } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { reduzir, temPalavrao } from "../core/filtro.js";
import { Lista, perguntar } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { pintar, TEMAS_COR, temasDoGrupo, temaValido } from "../cores.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/kitsune.js";
import * as textosTempo from "../textos/kitsune_tempo.js";
import { menuAbate } from "./abate.js";
import { infoNivel } from "./niveis.js";

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
  // O apelido posto por um dono vale para qualquer pessoa, com ou sem selo, e manda no apelido dela.
  const doDono = dadosJogador(player).apelidoDono;
  if (doDono && LETRAS_APELIDO.test(doDono)) return doDono;
  if (!temSelo(player)) return "";
  // Confere de novo: apelido salvo antes das regras de hoje (ou dado mexido) não aparece.
  const apelido = dadosJogador(player).apelido;
  return apelido && LETRAS_APELIDO.test(apelido) ? apelido : "";
}

/**
 * Se a pessoa pode usar este tema: dono usa qualquer um; os comuns pedem o selo Kitsune, os animados o selo e o nível
 * mínimo (config temaAnimadoNivel) e os de evento só valem para quem os desbloqueou.
 * @param {Player} player
 * @param {string} id
 */
export function podeUsarTema(player, id) {
  if (!temaValido(id)) return false;
  if (ehDono(player)) return true;
  const grupo = TEMAS_COR[id].grupo;
  if (grupo === "evento") return dadosJogador(player).coresExtras.includes(id);
  if (grupo === "animado") return temSelo(player) && infoNivel(player).nivel >= config().temaAnimadoNivel;
  return temSelo(player);
}

/**
 * Tema do nome em uso ("" sem direito ou sem tema).
 * @param {Player} player
 */
export function temaNomeDe(player) {
  const tema = dadosJogador(player).temaNome;
  return podeUsarTema(player, tema) ? tema : "";
}

/**
 * Desbloqueia um tema de evento (vale sem o selo Kitsune).
 * @param {Player | string} alvo
 * @param {string} tema
 */
export function desbloquearCor(alvo, tema) {
  if (!temaValido(tema)) return;
  editarJogador(alvo, (d) => {
    if (!d.coresExtras.includes(tema)) d.coresExtras.push(tema);
  });
  const p = typeof alvo === "string" ? porId(alvo) : alvo;
  avisarMudanca(p);
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
 * @param {number} [fase]  passo da animação (só temas animados)
 */
export function nomeExibido(player, corPadrao = "§f", fase = 0) {
  const nome = nomeVisivel(player);
  return `${pintar(nome, temaNomeDe(player), fase) ?? corPadrao + nome}§r`;
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
  if (tema !== "" && !temaValido(tema)) return false;
  if (tema !== "" && !podeUsarTema(player, tema)) {
    erro(player, TEMAS_COR[tema].grupo === "animado" ? textos.ANIMADO_TRAVADO(config().temaAnimadoNivel) : textos.SO_KITSUNE);
    return false;
  }
  editarJogador(player, (d) => {
    d.temaNome = tema;
  });
  avisarMudanca(player);
  ok(player, textos.TEMA_OK(nomeExibido(player)));
  return true;
}

/**
 * Um dono põe (ou, com "", tira) o apelido de alguém, vale offline (pelo id). Quem chama já conferiu o dono
 * e validou o texto (problemaApelido).
 * @param {string} alvoId
 * @param {string} apelido
 */
export function definirApelidoDoDono(alvoId, apelido) {
  editarJogador(alvoId, (d) => {
    d.apelidoDono = apelido;
  });
  avisarMudanca(porId(alvoId));
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
  const corLiberada = ehDono(player) || dadosJogador(player).coresExtras.length > 0;
  if (!temSelo(player) && !corLiberada) {
    await new Lista(textos.TITULO).texto(textos.SEM_SELO).voltar(voltar).abrir(player);
    return;
  }
  const aqui = () => menuKitsune(player, voltar);
  // selo com prazo (dado por um dono): mostra quando expira
  const ate = player.getDynamicProperty("vulpus:kitsune_ate");
  const aviso = typeof ate === "number" && ate > Date.now() ? `\n\n${textosTempo.LINHA_MENU(ate - Date.now(), ate)}` : "";
  const lista = new Lista(textos.TITULO).texto(textos.CORPO(nomeExibido(player), player.name, apelidoDe(player) !== "") + aviso);
  if (temSelo(player) || ehDono(player)) {
    lista.botao(textos.BOTAO_APELIDO, ICONES.apelido, async (p) => {
      const resposta = await perguntar(p, textos.TITULO_APELIDO, [
        { tipo: "texto", rotulo: textos.ROTULO_APELIDO(APELIDO_MIN, APELIDO_MAX), dica: p.name, padrao: apelidoDe(p) },
      ]);
      if (resposta && resposta[0] !== "") definirApelido(p, resposta[0]);
      await aqui();
    });
  }
  lista.botao(textos.BOTAO_COR, ICONES.tema, (p) => menuTemaNome(p, aqui));
  lista.botao(textos.BOTAO_ABATE, ICONES.ajustes, (p) => menuAbate(p, aqui));
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
  const botaoTema = (/** @type {string} */ id, /** @type {string} */ nomeTema) =>
    lista.botao(textos.BOTAO_TEMA(pintar(nome, id) ?? nome, nomeTema, id === atual), ICONES.tema, async (p) => {
      definirTemaNome(p, id);
      await voltar();
    });
  if (temSelo(player) || ehDono(player)) for (const [id, tema] of temasDoGrupo("comum")) botaoTema(id, tema.nome);
  for (const [id, tema] of temasDoGrupo("evento")) {
    if (podeUsarTema(player, id)) botaoTema(id, tema.nome);
  }
  const nivelAnimado = config().temaAnimadoNivel;
  for (const [id, tema] of temasDoGrupo("animado")) {
    if (podeUsarTema(player, id)) botaoTema(id, `${tema.nome} • animado`);
    else lista.botao(textos.BOTAO_ANIMADO_TRAVADO(pintar(nome, id) ?? nome, tema.nome, nivelAnimado), ICONES.nao, async (p) => {
      erro(p, textos.ANIMADO_TRAVADO(nivelAnimado));
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
