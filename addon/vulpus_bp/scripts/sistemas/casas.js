// @ts-check
// Casas do jogador: criar, ir, mover, renomear e apagar, com limite configurável pela staff.
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador } from "../core/db.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { localDe, teleportar } from "../core/teleporte.js";
import { erro, formatarCoords, msg, nomeDimensao, ok } from "../core/util.js";
import * as textos from "../textos/casas.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/db.js").Casa} Casa */

const MAX_NOME = 16;

/** @param {string} nome */
const chave = (nome) => nome.toLowerCase();

/** Espaços nas pontas saem e espaços repetidos viram um só. @param {string} nome */
const limparNome = (nome) => nome.trim().replace(/\s+/g, " ");

/**
 * Casa pelo nome, sem diferenciar maiúsculas.
 * @param {Player} player
 * @param {string} nome
 * @returns {Casa | undefined}
 */
function acharCasa(player, nome) {
  return dadosJogador(player).casas.find((c) => chave(c.nome) === chave(nome));
}

/**
 * Por que o nome não serve (undefined se servir).
 * @param {Player} player
 * @param {string} nome  já limpo
 * @param {Casa} [propria]  a casa sendo renomeada (pode trocar só as maiúsculas)
 * @returns {string | undefined}
 */
function problemaNoNome(player, nome, propria) {
  if (nome === "") return textos.NOME_VAZIO;
  if ([...nome].length > MAX_NOME) return textos.NOME_LONGO(MAX_NOME);
  if (nome.includes("§")) return textos.NOME_COM_SECAO;
  const outra = acharCasa(player, nome);
  if (outra && outra !== propria) return textos.NOME_REPETIDO(outra.nome);
  return undefined;
}

/** Primeiro "Casa N" livre. @param {Player} player */
function nomePadrao(player) {
  let n = dadosJogador(player).casas.length + 1;
  while (acharCasa(player, textos.NOME_PADRAO(n))) n++;
  return textos.NOME_PADRAO(n);
}

/**
 * Onde o jogador está, no formato de casa (sem rotação).
 * @param {Player} player
 * @param {string} nome
 * @returns {Casa}
 */
function casaAqui(player, nome) {
  const { x, y, z, d } = localDe(player);
  return { nome, x, y, z, d };
}

/**
 * Cria uma casa onde o jogador está, conferindo nome e limite.
 * @param {Player} player
 * @param {string} nomeDigitado
 * @returns {boolean} se criou
 */
function criarCasa(player, nomeDigitado) {
  const nome = limparNome(nomeDigitado);
  const problema = problemaNoNome(player, nome);
  if (problema) {
    erro(player, problema);
    return false;
  }
  const limite = config().limiteCasas;
  if (dadosJogador(player).casas.length >= limite) {
    erro(player, textos.LIMITE(limite));
    return false;
  }
  editarJogador(player, (dados) => {
    dados.casas.push(casaAqui(player, nome));
  });
  ok(player, textos.CRIADA(nome));
  return true;
}

/**
 * Leva a casa para onde o jogador está.
 * @param {Player} player
 * @param {Casa} casa
 */
function moverCasa(player, casa) {
  if (!dadosJogador(player).casas.includes(casa)) {
    erro(player, textos.NAO_EXISTE(casa.nome));
    return;
  }
  const { x, y, z, d } = casaAqui(player, casa.nome);
  editarJogador(player, () => Object.assign(casa, { x, y, z, d }));
  ok(player, textos.MOVIDA(casa.nome));
}

/**
 * @param {Player} player
 * @param {Casa} casa
 */
function apagarCasa(player, casa) {
  editarJogador(player, (dados) => {
    dados.casas = dados.casas.filter((c) => c !== casa);
  });
  ok(player, textos.APAGADA(casa.nome));
}

/**
 * Teleporta para a casa. A posição é relida na chegada: se a casa sumir no meio da espera, cancela.
 * @param {Player} player
 * @param {Casa} casa
 */
function irCasa(player, casa) {
  teleportar(
    player,
    () => {
      const atual = acharCasa(player, casa.nome);
      return atual && { x: atual.x, y: atual.y, z: atual.z, d: atual.d };
    },
    { nome: casa.nome },
  );
}

/**
 * Pede um nome até ele servir. Nome inválido mostra o erro e reabre o form com o que foi digitado.
 * @param {Player} player
 * @param {string} titulo
 * @param {string} sugestao
 * @param {Casa} [propria]
 * @returns {Promise<string | undefined>} undefined se fechou o form
 */
async function pedirNome(player, titulo, sugestao, propria) {
  for (;;) {
    const respostas = await perguntar(player, titulo, [
      { tipo: "texto", rotulo: textos.CAMPO_NOME, dica: textos.DICA_NOME(MAX_NOME), padrao: sugestao },
    ]);
    if (!respostas) return undefined;
    const nome = limparNome(String(respostas[0]));
    const problema = problemaNoNome(player, nome, propria);
    if (!problema) return nome;
    erro(player, problema);
    sugestao = nome;
  }
}

/**
 * Nova casa pelo menu; depois volta para a lista.
 * @param {Player} player
 * @param {() => any} voltarCasas
 */
async function novaCasa(player, voltarCasas) {
  const nome = await pedirNome(player, textos.FORM_NOVA, nomePadrao(player));
  if (nome === undefined) return;
  criarCasa(player, nome);
  return voltarCasas();
}

/**
 * @param {Player} player
 * @param {Casa} casa
 * @param {(nome: string) => any} voltarCasa  reabre o menu da casa (pelo nome novo)
 */
async function renomearCasa(player, casa, voltarCasa) {
  const nome = await pedirNome(player, textos.FORM_RENOMEAR, casa.nome, casa);
  if (nome === undefined) return;
  // Pode ter sido apagada enquanto o form estava aberto.
  if (!dadosJogador(player).casas.includes(casa)) {
    erro(player, textos.NAO_EXISTE(casa.nome));
    return;
  }
  if (nome !== casa.nome) {
    const antigo = casa.nome;
    editarJogador(player, () => {
      casa.nome = nome;
    });
    ok(player, textos.RENOMEADA(antigo, nome));
  }
  return voltarCasa(nome);
}

/**
 * @param {Player} player
 * @param {Casa} casa
 * @param {() => any} voltarCasas
 * @param {() => any} voltarCasa
 */
async function confirmarApagar(player, casa, voltarCasas, voltarCasa) {
  const sim = await confirmar(player, {
    titulo: casa.nome,
    texto: textos.CONFIRMAR_APAGAR(casa.nome),
    sim: textos.SIM_APAGAR,
    nao: textos.NAO_APAGAR,
  });
  if (!sim) return voltarCasa();
  if (dadosJogador(player).casas.includes(casa)) apagarCasa(player, casa);
  return voltarCasas();
}

/**
 * Menu de uma casa: ir, mover, renomear, apagar.
 * @param {Player} player
 * @param {string} nome
 * @param {() => any} voltarCasas
 */
async function menuCasa(player, nome, voltarCasas) {
  const casa = acharCasa(player, nome);
  if (!casa) {
    erro(player, textos.NAO_EXISTE(nome));
    return voltarCasas();
  }
  const reabrir = (nomeAtual = casa.nome) => menuCasa(player, nomeAtual, voltarCasas);
  await new Lista(casa.nome)
    .texto(textos.INFO_CASA(nomeDimensao(casa.d), formatarCoords(casa)))
    .botao(textos.IR, ICONES.tpa, () => irCasa(player, casa))
    .botao(textos.MOVER, ICONES.mundo, () => {
      moverCasa(player, casa);
      return reabrir();
    })
    .botao(textos.RENOMEAR, ICONES.editar, () => renomearCasa(player, casa, reabrir))
    .botao(textos.APAGAR, ICONES.apagar, () => confirmarApagar(player, casa, voltarCasas, reabrir))
    .voltar(voltarCasas)
    .abrir(player);
}

/**
 * Lista de casas com o botão de nova casa (se houver vaga).
 * @param {Player} player
 * @param {(() => any)} [voltar]
 */
export async function menuCasas(player, voltar) {
  const reabrir = () => menuCasas(player, voltar);
  const { casas } = dadosJogador(player);
  const limite = config().limiteCasas;
  const corpo = [textos.CONTAGEM(casas.length, limite), casas.length ? textos.DICA_LISTA : textos.NENHUMA];
  const lista = new Lista(textos.TITULO).texto(corpo.join("\n"));
  for (const casa of casas) {
    const rotulo = textos.BOTAO_CASA(casa.nome, nomeDimensao(casa.d), formatarCoords(casa));
    lista.botao(rotulo, ICONES.casas, () => menuCasa(player, casa.nome, reabrir));
  }
  if (casas.length < limite) lista.botao(textos.NOVA, ICONES.nova, () => novaCasa(player, reabrir));
  else lista.rotulo(textos.NO_LIMITE(limite));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Casa pelo nome digitado num comando; se não achar, avisa e mostra as que existem.
 * @param {Player} player
 * @param {string} nome
 * @returns {Casa | undefined}
 */
function casaDoComando(player, nome) {
  const casa = acharCasa(player, limparNome(nome));
  if (casa) return casa;
  const { casas } = dadosJogador(player);
  if (!casas.length) {
    erro(player, textos.SEM_CASAS);
    return undefined;
  }
  erro(player, textos.NAO_EXISTE(limparNome(nome)));
  msg(player, textos.SUAS_CASAS(casas.map((c) => c.nome).join(", ")));
  return undefined;
}

registrarComando(
  { nome: "casa", descricao: textos.CMD_CASA, parametros: [{ nome: "nome", tipo: "texto", opcional: true }] },
  (p, [nome]) => {
    if (!nome || !limparNome(nome)) return menuCasas(p);
    const casa = casaDoComando(p, nome);
    if (casa) irCasa(p, casa);
  },
);

registrarComando(
  { nome: "definircasa", descricao: textos.CMD_DEFINIRCASA, parametros: [{ nome: "nome", tipo: "texto" }] },
  (p, [nome]) => {
    const existente = acharCasa(p, limparNome(nome));
    if (existente) moverCasa(p, existente);
    else criarCasa(p, nome);
  },
);

registrarComando(
  { nome: "apagarcasa", descricao: textos.CMD_APAGARCASA, parametros: [{ nome: "nome", tipo: "texto" }] },
  (p, [nome]) => {
    const casa = casaDoComando(p, nome);
    if (casa) apagarCasa(p, casa);
  },
);
