// @ts-check
// Evento de Halloween "O Último Outono de Hollow" (25 a 31/10/2026): uma investigação com registros (diário) espalhados pelo mundo.
// A staff marca blocos onde cada registro mora (nunca alteramos o bloco); botão direito num bloco marcado abre o registro. Cada pessoa
// tem o diário (/vulpus:hollow) com o que já leu. Alguns registros pedem outros antes (ou o enigma da data); o último só destrava com
// tudo lido. Concluir dentro da janela dá a posição (1, 2, 3...), a tag, a conquista e o relógio simbólico; só as duas primeiras
// posições levam o selo Kitsune, entregue pelo dono (hollow_staff.js). Perto da casa marcada, um vento avisa que há algo ali.
// Textos da história em textos/hollow_docs.js; textos de interface em textos/hollow.js.
import { ItemStack, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, lerMundo, salvarMundo } from "../core/db.js";
import { registrarLogDono, ehDono } from "../core/dono.js";
import { emitir } from "../core/eventos.js";
import { Lista, perguntar } from "../core/forms.js";
import { online, TAG_SUMIDO } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, msg, nomeDimensao, registrarErro, rodarSeguro, som } from "../core/util.js";
import { COFRE, ENIGMA, MENSAGENS, REGISTROS, VENTO } from "../textos/hollow_docs.js";
import * as textos from "../textos/hollow.js";
import { darConquista } from "./conquistas.js";
import { emMinigame } from "./mg_estado.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ d: string, x: number, y: number, z: number }} Ponto */
/** @typedef {{ id: string, nome: string, posicao: number, quando: number, entregue: boolean }} Conclusao */
/** @typedef {import("../textos/hollow_docs.js").Registro} Registro */

const CHAVE_PONTOS = "vulpus:hollow:pontos";
const CHAVE_LOCAIS = "vulpus:hollow:locais";
const CHAVE_AUDIOS = "vulpus:hollow:audios";
const CHAVE_COFRES = "vulpus:hollow:cofres";
const CHAVE_CONCLUSOES = "vulpus:hollow:conclusoes";
/** Tag de quem concluiu (só lembrança, sem efeito no jogo). */
export const TAG_HALLOWEEN = "vulpus:halloween2026";
export const CONQUISTA = "hollow";
/** Locais que a staff marca (coordenadas usadas nos textos dos registros). */
export const LOCAIS = Object.freeze(["casa", "acampamento", "abrigo", "ponte"]);
/** Áudios que a staff pode ligar a um link. */
export const AUDIOS = Object.freeze(["A1", "A2", "A3", "A4"]);
const ID_FINAL = "D17";
const ID_MESA = "D13";
/** Quantas posições levam o selo Kitsune. */
export const POSICOES_KITSUNE = 2;
const ESPERA_ENIGMA_TICKS = 60;
const PASSO_VENTO = 20;
const ABRINDO_TICKS = 10;
const ALCANCE_MARCAR = 8;
const MAX_CONCLUSOES = 300;
const MAX_COFRES = 50;
const ESPERA_COFRE_TICKS = 60;
const MAX_LINK = 200;

/** @type {Record<string, Ponto> | undefined} */
let pontos;
/** @type {Map<string, string>} bloco ("dim|x|y|z") → id do registro */
let indice = new Map();

/** Esquece o que está em memória (os dados são lidos de novo do mundo). */
export function recarregar() {
  pontos = undefined;
  indice = new Map();
  cofres = undefined;
  indiceCofres = new Set();
}

/** @type {Ponto[] | undefined} */
let cofres;
/** @type {Set<string>} */
let indiceCofres = new Set();

/** Papelzinhos (P1...) não contam entre os registros "N de 17". @param {string} id */
export const ehPapelzinho = (id) => /^P[0-9]$/.test(id);
/** Os registros da história (sem os papelzinhos). */
export const PRINCIPAIS = REGISTROS.filter((r) => !ehPapelzinho(r.id));
export const PAPELZINHOS = REGISTROS.filter((r) => ehPapelzinho(r.id));

/**
 * Blocos que abrem o cofre (qualquer quantidade; todos abrem o mesmo formulário).
 * @returns {Ponto[]}
 */
export function lerCofres() {
  if (cofres) return cofres;
  const bruto = lerMundo(CHAVE_COFRES, []);
  /** @type {Ponto[]} */
  const lista = [];
  const visto = new Set();
  for (const p of Array.isArray(bruto) ? bruto : []) {
    if (!ehPonto(p)) continue;
    const ponto = { d: p.d, x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
    if (visto.has(chaveBloco(ponto)) || lista.length >= MAX_COFRES) continue;
    visto.add(chaveBloco(ponto));
    lista.push(ponto);
  }
  cofres = lista;
  indiceCofres = visto;
  return cofres;
}

/**
 * @param {Ponto[]} novo
 * @returns {boolean}
 */
export function salvarCofres(novo) {
  const ok = salvarMundo(CHAVE_COFRES, novo);
  cofres = undefined;
  indiceCofres = new Set();
  return ok;
}

/** Código do cofre em vigor (4 dígitos; configuração quebrada volta ao padrão). */
export function codigoCofre() {
  const c = String(config().hollowCofreCodigo);
  return /^[0-9]{4}$/.test(c) ? c : COFRE.codigoPadrao;
}

/** @param {any} p */
const ehPonto = (p) => !!p && typeof p === "object" && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n));
/** @param {Ponto} p */
const chaveBloco = (p) => `${p.d}|${Math.floor(p.x)}|${Math.floor(p.y)}|${Math.floor(p.z)}`;

/**
 * Blocos dos registros (id → ponto). Dado quebrado vira "vazio".
 * @returns {Record<string, Ponto>}
 */
export function lerPontos() {
  if (pontos) return pontos;
  const bruto = lerMundo(CHAVE_PONTOS, {});
  /** @type {Record<string, Ponto>} */
  const limpo = {};
  const novo = new Map();
  for (const reg of REGISTROS) {
    const p = bruto && typeof bruto === "object" ? bruto[reg.id] : undefined;
    if (!ehPonto(p)) continue;
    const ponto = { d: p.d, x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
    if (novo.has(chaveBloco(ponto))) continue;
    limpo[reg.id] = ponto;
    novo.set(chaveBloco(ponto), reg.id);
  }
  pontos = limpo;
  indice = novo;
  return pontos;
}

/**
 * @param {Record<string, Ponto>} novo
 * @returns {boolean}
 */
export function salvarPontos(novo) {
  const ok = salvarMundo(CHAVE_PONTOS, novo);
  recarregar();
  return ok;
}

/** @returns {Record<string, Ponto>} */
export function lerLocais() {
  const bruto = lerMundo(CHAVE_LOCAIS, {});
  /** @type {Record<string, Ponto>} */
  const limpo = {};
  for (const nome of LOCAIS) {
    const p = bruto && typeof bruto === "object" ? bruto[nome] : undefined;
    if (ehPonto(p)) limpo[nome] = { d: p.d, x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
  }
  return limpo;
}

/** @param {Record<string, Ponto>} novo */
export const salvarLocais = (novo) => salvarMundo(CHAVE_LOCAIS, novo);

/** Links dos áudios (id → link; só os que existem e são válidos). @returns {Record<string, string>} */
export function lerAudios() {
  const bruto = lerMundo(CHAVE_AUDIOS, {});
  /** @type {Record<string, string>} */
  const limpo = {};
  for (const id of AUDIOS) {
    const v = bruto && typeof bruto === "object" ? bruto[id] : undefined;
    if (linkValido(v)) limpo[id] = /** @type {string} */ (v);
  }
  return limpo;
}

/** @param {Record<string, string>} novo */
export const salvarAudios = (novo) => salvarMundo(CHAVE_AUDIOS, novo);

/** @param {unknown} v */
export const linkValido = (v) => typeof v === "string" && v.length > 0 && v.length <= MAX_LINK && /^https?:\/\/\S+$/.test(v) && !v.includes("§");

/** @returns {Conclusao[]} */
export function lerConclusoes() {
  const bruto = lerMundo(CHAVE_CONCLUSOES, []);
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((c) => c && typeof c.id === "string" && Number.isInteger(c.posicao) && c.posicao >= 1 && Number.isFinite(c.quando))
    .map((c) => ({ id: c.id, nome: typeof c.nome === "string" ? c.nome.slice(0, 32) : "?", posicao: c.posicao, quando: c.quando, entregue: c.entregue === true }))
    .slice(0, MAX_CONCLUSOES);
}

/** @param {Conclusao[]} lista */
export const salvarConclusoes = (lista) => salvarMundo(CHAVE_CONCLUSOES, lista);

// ------------------------------------------------------------------------------------ datas (Brasília, UTC-3 fixo)
const FUSO_MS = 3 * 60 * 60 * 1000;
const d2 = (/** @type {number} */ n) => String(n).padStart(2, "0");

/**
 * "2026-10-25 00:00" (Brasília).
 * @param {number} ms
 */
export function formatarDataHora(ms) {
  const d = new Date(ms - FUSO_MS);
  return `${d.getUTCFullYear()}-${d2(d.getUTCMonth() + 1)}-${d2(d.getUTCDate())} ${d2(d.getUTCHours())}:${d2(d.getUTCMinutes())}`;
}

/**
 * "AAAA-MM-DD hh:mm" (Brasília) → ms, ou undefined se não for uma data real. Com `fimDoMinuto`, vale até o segundo 59.
 * @param {string} texto
 * @param {boolean} [fimDoMinuto]
 */
export function lerDataHora(texto, fimDoMinuto = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(texto).trim());
  if (!m) return undefined;
  const [a, mes, dia, h, mi] = m.slice(1).map(Number);
  const data = new Date(Date.UTC(a, mes - 1, dia, h, mi, fimDoMinuto ? 59 : 0));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia || h > 23 || mi > 59) return undefined;
  return data.getTime() + FUSO_MS;
}

/**
 * Em que pé está o evento: desligado, antes da janela, aberto ou depois dela.
 * @param {number} [agora]
 * @returns {"desligado" | "antes" | "aberto" | "depois"}
 */
export function estadoEvento(agora = Date.now()) {
  const c = config();
  if (!c.hollowLigado) return "desligado";
  if (agora < c.hollowInicio) return "antes";
  if (agora > c.hollowFim) return "depois";
  return "aberto";
}

// ------------------------------------------------------------------------------------ registros
/** @param {string} id */
export const registroPorId = (id) => REGISTROS.find((r) => r.id === id);

/** Troca {coord:casa} etc. pelas coordenadas da staff e {digito1}...{digito4} pelo código do cofre. @param {string} texto */
export function resolverCoords(texto) {
  const locais = lerLocais();
  const codigo = codigoCofre();
  return texto.replace(/\{digito([1-4])\}/g, (_, n) => codigo[Number(n) - 1]).replace(/\{coord:(\w+)\}/g, (_, nome) => {
    const p = locais[nome];
    if (!p) return textos.SEM_COORD;
    return formatarCoords(p) + (p.d === "minecraft:overworld" ? "" : ` (${nomeDimensao(p.d)})`);
  });
}

/** @param {{ lidos: string[], enigma: boolean, cofre: boolean }} d @param {Registro} reg */
const cumpre = (d, reg) => reg.requer.every((r) => (r === "enigma" ? d.enigma : r === "cofre" ? d.cofre : d.lidos.includes(r)));

/** Registros chave que ainda faltam (sem o último). @param {{ lidos: string[] }} d */
const faltamChave = (d) => REGISTROS.filter((r) => r.chave && r.id !== ID_FINAL && !d.lidos.includes(r.id));

/** Nomes dos locais (sem repetir) onde falta algo. @param {Registro[]} faltam */
const locaisQueFaltam = (faltam) => [...new Set(faltam.map((r) => textos.NOME_LOCAL[r.local]))];

/** @param {Player} player */
const staffOuDono = (player) => ehStaff(player) || ehDono(player);

/**
 * O evento deixa essa pessoa ler agora? (Antes da data e desligado: só a staff, para testar.) Já avisa quem não pode.
 * @param {Player} player
 */
function podeLer(player) {
  const st = estadoEvento();
  if (st === "aberto" || st === "depois") return true;
  if (staffOuDono(player)) return true;
  msg(player, st === "antes" ? MENSAGENS.aindaNao : textos.EVENTO_DESLIGADO);
  return false;
}

/**
 * @param {Player} player
 * @param {string} id
 */
function marcarLido(player, id) {
  editarJogador(player, (d) => {
    if (!d.hollow.lidos.includes(id)) d.hollow.lidos.push(id);
  });
}

/** Link do áudio do registro, se a staff configurou. @param {Registro} reg */
const linkDoRegistro = (reg) => (reg.audio ? lerAudios()[reg.audio] : undefined);

/**
 * Mostra o texto do registro (sem marcar nada).
 * @param {Player} player
 * @param {Registro} reg
 * @param {(() => any) | undefined} voltar
 */
async function mostrarTexto(player, reg, voltar) {
  const link = linkDoRegistro(reg);
  const corpo = `§f${resolverCoords(reg.texto)}` + (link ? textos.LINHA_AUDIO_REGISTRO(link) : "");
  const lista = new Lista(reg.titulo).texto(corpo);
  if (!voltar) lista.botao(textos.BOTAO_FECHAR, ICONES.nao);
  await lista.voltar(voltar).abrir(player);
}

/**
 * Prévia para a staff (não conta como lido).
 * @param {Player} player
 * @param {string} id
 * @param {(() => any) | undefined} [voltar]
 */
export async function previa(player, id, voltar) {
  const reg = registroPorId(id);
  if (reg && staffOuDono(player)) await mostrarTexto(player, reg, voltar);
}

/**
 * Registro trancado: nunca mostra o texto.
 * @param {Player} player
 * @param {Registro} reg
 * @param {(() => any) | undefined} voltar
 * @param {string} [extra]
 */
async function mostrarTrancado(player, reg, voltar, extra = "") {
  const lista = new Lista(textos.TITULO_TRANCADO).texto(`§7${reg.trancado || MENSAGENS.naoEhFinal}${extra ? `\n\n${extra}` : ""}`);
  if (!voltar) lista.botao(textos.BOTAO_FECHAR, ICONES.nao);
  await lista.voltar(voltar).abrir(player);
}

/**
 * Abre um registro: confere requisitos (trancado não marca nada), marca como lido e mostra. O D13 abre o enigma.
 * @param {Player} player
 * @param {string} id
 * @param {(() => any) | undefined} [voltar]
 */
export async function abrirRegistro(player, id, voltar) {
  const reg = registroPorId(id);
  if (!reg || !podeLer(player)) return;
  const d = dadosJogador(player).hollow;
  if (!cumpre(d, reg)) return mostrarTrancado(player, reg, voltar);
  if (reg.id === ID_FINAL) {
    const faltam = faltamChave(d);
    if (faltam.length) return mostrarTrancado(player, reg, voltar, textos.FALTA_LOCAL(locaisQueFaltam(faltam)));
  }
  if (d.lidos.length === 0) msg(player, MENSAGENS.inicio);
  const jaTinha = d.lidos.includes(reg.id);
  if (reg.id !== ID_MESA || d.enigma) marcarLido(player, reg.id);
  const novo = tentarConcluir(player);
  await mostrarTexto(player, reg, reg.id === ID_MESA && !d.enigma ? undefined : voltar);
  if (reg.id === ID_MESA) await enigma(player);
  if (novo) await telaConclusao(player, novo.posicao);
  else if (reg.id === ID_FINAL && !jaTinha && estadoEvento() === "depois") msg(player, MENSAGENS.encerrado);
}

// ------------------------------------------------------------------------------------ cofre do abrigo
/** Tick da última resposta de cada pessoa no cofre. @type {Map<string, number>} */
const ultimaCofre = new Map();

/**
 * O cofre do abrigo: pede o código de 4 dígitos. Acertar libera D10, D11 e D12; errar só conta (dicas com 3 e 6 erros, sem punição).
 * @param {Player} player
 */
export async function abrirCofre(player) {
  if (!podeLer(player)) return;
  if (dadosJogador(player).hollow.cofre) {
    await new Lista(textos.TITULO_COFRE).texto(textos.COFRE_ABERTO).botao(textos.BOTAO_FECHAR, ICONES.sim).abrir(player);
    return;
  }
  if (system.currentTick - (ultimaCofre.get(player.id) ?? -1e9) < ESPERA_COFRE_TICKS) return erro(player, textos.COFRE_ESPERA);
  const r = await perguntar(player, textos.TITULO_COFRE, [{ tipo: "texto", rotulo: textos.ROTULO_CODIGO, dica: "0000" }]);
  if (!r) return;
  const tentado = String(r[0]).replace(/\s/g, "");
  if (!/^[0-9]{4}$/.test(tentado)) return erro(player, textos.COFRE_INVALIDO);
  ultimaCofre.set(player.id, system.currentTick);
  if (tentado === codigoCofre()) {
    editarJogador(player, (j) => {
      j.hollow.cofre = true;
    });
    msg(player, textos.COFRE_SUCESSO);
    await new Lista(textos.TITULO_COFRE).texto(textos.COFRE_SUCESSO).botao(textos.BOTAO_FECHAR, ICONES.sim).abrir(player);
    return;
  }
  const erros = editarJogador(player, (j) => {
    j.hollow.tentativasCofre += 1;
  }).hollow.tentativasCofre;
  msg(player, textos.COFRE_ERRADO);
  for (const dica of COFRE.dicas) if (erros >= dica.depois) msg(player, `§e${dica.texto}`);
}

// ------------------------------------------------------------------------------------ enigma da mesa
/** Tick da última resposta de cada pessoa (espera entre tentativas). @type {Map<string, number>} */
const ultimaTentativa = new Map();

/**
 * O ModalForm da data. Acerto marca o enigma e o D13; erro conta e, depois de algumas, dá dicas (sem punição).
 * @param {Player} player
 */
async function enigma(player) {
  const d = dadosJogador(player).hollow;
  if (d.enigma) {
    marcarLido(player, ID_MESA);
    msg(player, textos.ENIGMA_JA_RESOLVIDO);
    return;
  }
  if (system.currentTick - (ultimaTentativa.get(player.id) ?? -1e9) < ESPERA_ENIGMA_TICKS) return erro(player, textos.ENIGMA_ESPERA);
  const r = await perguntar(player, textos.TITULO_ENIGMA, [
    { tipo: "texto", rotulo: textos.ROTULO_DIA, dica: "31" },
    { tipo: "texto", rotulo: textos.ROTULO_MES, dica: "10" },
    { tipo: "texto", rotulo: textos.ROTULO_ANO, dica: "2019" },
  ]);
  if (!r) return;
  const [dia, mes, ano] = r.map((/** @type {string} */ t) => (/^\d{1,4}$/.test(String(t)) ? Number(t) : NaN));
  if (![dia, mes, ano].every(Number.isFinite)) return erro(player, textos.ENIGMA_INVALIDO);
  ultimaTentativa.set(player.id, system.currentTick);
  if (dia === ENIGMA.dia && mes === ENIGMA.mes && ano === ENIGMA.ano) {
    editarJogador(player, (j) => {
      j.hollow.enigma = true;
    });
    marcarLido(player, ID_MESA);
    const texto = textos.ENIGMA_SUCESSO(resolverCoords("{coord:ponte}"));
    msg(player, texto);
    await new Lista(textos.TITULO_ENIGMA).texto(texto).botao(textos.BOTAO_FECHAR, ICONES.sim).abrir(player);
    return;
  }
  const tentativas = editarJogador(player, (j) => {
    j.hollow.tentativas += 1;
  }).hollow.tentativas;
  msg(player, textos.ENIGMA_ERRADO);
  for (const dica of ENIGMA.dicas) if (tentativas >= dica.depois) msg(player, `§e${dica.texto}`);
}

// ------------------------------------------------------------------------------------ conclusão
/**
 * Se a pessoa cumpriu tudo dentro da janela, dá a posição (uma única vez; tudo síncrono, sem corrida) e as lembranças.
 * @param {Player} player
 * @returns {{ posicao: number } | undefined} só quando concluiu agora
 */
export function tentarConcluir(player) {
  try {
    const d = dadosJogador(player).hollow;
    if (d.conclusao > 0) return undefined;
    if (estadoEvento() !== "aberto") return undefined;
    if (!d.enigma || !d.lidos.includes(ID_FINAL) || REGISTROS.some((r) => r.chave && !d.lidos.includes(r.id))) return undefined;
    const lista = lerConclusoes();
    const antiga = lista.find((c) => c.id === player.id);
    if (antiga) {
      editarJogador(player, (j) => {
        j.hollow.conclusao = antiga.posicao;
      });
      return undefined;
    }
    const posicao = lista.reduce((m, c) => Math.max(m, c.posicao), 0) + 1;
    lista.push({ id: player.id, nome: player.name, posicao, quando: Date.now(), entregue: false });
    if (!salvarConclusoes(lista)) {
      registrarErro("Hollow: conclusão", new Error("não consegui gravar a lista de conclusões"));
      return undefined;
    }
    editarJogador(player, (j) => {
      j.hollow.conclusao = posicao;
    });
    try {
      player.addTag(TAG_HALLOWEEN);
    } catch (e) {
      registrarErro("Hollow: tag", e);
    }
    darConquista(player, CONQUISTA);
    msg(player, MENSAGENS.concluiu);
    if (posicao <= POSICOES_KITSUNE) msg(player, textos.TELA_PREMIO(posicao));
    emitir("hollow_conclusao", { nome: player.name, posicao });
    registrarLogDono(player.name, "hollow: conclusão", player.name, true, `posição ${posicao}`);
    return { posicao };
  } catch (e) {
    registrarErro("Hollow: concluir", e);
    return undefined;
  }
}

/**
 * @param {Player} player
 * @param {number} posicao
 */
async function telaConclusao(player, posicao) {
  await new Lista(textos.TITULO_CONCLUIDO).texto(MENSAGENS.concluiu).botao(textos.BOTAO_FECHAR, ICONES.sim).abrir(player);
  if (posicao <= POSICOES_KITSUNE) await new Lista(textos.TITULO_CONCLUIDO).texto(textos.TELA_PREMIO(posicao)).botao(textos.BOTAO_FECHAR, ICONES.sim).abrir(player);
}

/**
 * Entrega o Relógio de Hollow (uma vez, só a quem concluiu). Sem efeitos; inventário cheio solta no chão.
 * @param {Player} player
 * @returns {boolean}
 */
export function pegarRelogio(player) {
  const d = dadosJogador(player).hollow;
  if (d.conclusao <= 0) {
    erro(player, textos.RELOGIO_NAO_AINDA);
    return false;
  }
  if (d.relogio) {
    erro(player, textos.RELOGIO_JA);
    return false;
  }
  editarJogador(player, (j) => {
    j.hollow.relogio = true;
  });
  try {
    const item = new ItemStack("minecraft:clock", 1);
    item.nameTag = textos.RELOGIO_NOME;
    item.setLore(textos.RELOGIO_LORE);
    item.keepOnDeath = true;
    const inv = player.getComponent("minecraft:inventory")?.container;
    const sobra = inv ? inv.addItem(item) : item;
    if (sobra) {
      player.dimension.spawnItem(sobra, player.location);
      msg(player, textos.RELOGIO_CHAO);
    } else msg(player, textos.RELOGIO_OK);
    return true;
  } catch (e) {
    registrarErro("Hollow: relógio", e);
    editarJogador(player, (j) => {
      j.hollow.relogio = false;
    });
    return false;
  }
}

// ------------------------------------------------------------------------------------ diário
/**
 * A dica do botão: uma frase, da etapa mais avançada para a menos, sem spoiler.
 * @param {{ lidos: string[], enigma: boolean, conclusao: number, cofre?: boolean }} d
 */
export function textoDica(d) {
  const leu = (/** @type {string[]} */ ids) => ids.some((i) => d.lidos.includes(i));
  let frase = textos.DICA_NADA;
  if (d.conclusao > 0) frase = textos.DICA_CONCLUIDO;
  else if (d.enigma) frase = textos.DICA_ENIGMA;
  else if (leu(["D10", "D11", "D12"])) frase = textos.DICA_ABRIGO_SEM_ENIGMA;
  else if (leu(["D05", "D06", "D07", "D08", "D09"])) frase = textos.DICA_ACAMPAMENTO;
  else if (leu(["D03", "D04"])) frase = textos.DICA_SOTAO;
  else if (leu(["D01", "D02"])) frase = textos.DICA_CASA;
  if (!d.conclusao && d.lidos.includes("D09") && !d.cofre) frase += `\n${textos.DICA_COFRE}`;
  if (d.conclusao === 0 && d.enigma && d.lidos.includes("D14") && d.lidos.includes("D16")) {
    const faltam = faltamChave(d);
    if (faltam.length) frase += `\n${textos.FALTA_LOCAL(locaisQueFaltam(faltam))}`;
  }
  return frase;
}

/**
 * Diário de investigação (/vulpus:hollow).
 * @param {Player} player
 */
export async function abrirDiario(player) {
  if (!podeLer(player)) return;
  const aqui = () => abrirDiario(player);
  const d = dadosJogador(player).hollow;
  const st = estadoEvento();
  const audios = lerAudios();
  /** @type {string[]} */
  const linhas = [textos.LINHA_PROGRESSO(d.lidos.filter((id) => registroPorId(id) && !ehPapelzinho(id)).length, PRINCIPAIS.length)];
  const achados = d.lidos.filter(ehPapelzinho).length;
  if (achados > 0) linhas.push(textos.LINHA_PAPELZINHOS(achados, PAPELZINHOS.length));
  if (d.conclusao > 0) linhas.push(textos.LINHA_CONCLUIDO(d.conclusao));
  if (st === "depois") linhas.push(textos.LINHA_ENCERRADO);
  if (st === "antes") linhas.push(textos.LINHA_AINDA_NAO);
  if (d.lidos.length === 0) linhas.push(textos.LINHA_VAZIO, "", MENSAGENS.inicio);
  const jaMostrou = new Set();
  for (const reg of REGISTROS) {
    if (!d.lidos.includes(reg.id) || !reg.audio || jaMostrou.has(reg.audio) || !audios[reg.audio]) continue;
    jaMostrou.add(reg.audio);
    linhas.push("", textos.LINHA_AUDIO(reg.titulo, audios[reg.audio]));
  }
  const lista = new Lista(textos.TITULO_DIARIO).texto(linhas.join("\n"));
  const lidos = REGISTROS.filter((r) => d.lidos.includes(r.id));
  if (lidos.length) lista.cabecalho(textos.SECAO_LER);
  for (const reg of lidos) lista.botao(textos.BOTAO_REGISTRO(reg.titulo), ICONES.historico, (p) => abrirRegistro(p, reg.id, aqui));
  lista.botao(textos.BOTAO_DICA, ICONES.buscar, async (p) => {
    await new Lista(textos.TITULO_DICA).texto(`§7${textoDica(dadosJogador(p).hollow)}`).voltar(aqui).abrir(p);
  });
  if (d.conclusao > 0 && !d.relogio) {
    lista.botao(textos.BOTAO_RELOGIO, ICONES.tempo, async (p) => {
      pegarRelogio(p);
      await aqui();
    });
  }
  await lista.abrir(player);
}

registrarComando({ nome: "hollow", descricao: textos.DESC_COMANDO }, (p) => abrirDiario(p));

// ------------------------------------------------------------------------------------ interação com os blocos marcados
/** @type {Map<string, number>} id → tick da última abertura (ignora cliques repetidos) */
const ultimaAbertura = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    if (!ev.isFirstEvent) return;
    const b = ev.block;
    lerPontos();
    lerCofres();
    if (indice.size === 0 && indiceCofres.size === 0) return;
    const chave = chaveBloco({ d: b.dimension.id, x: b.location.x, y: b.location.y, z: b.location.z });
    const id = indice.get(chave);
    const ehCofre = !id && indiceCofres.has(chave);
    if ((!id && !ehCofre) || estadoEvento() === "desligado") return;
    if (ev.player.isSneaking && staffOuDono(ev.player)) return; // a staff agachada mexe no bloco normalmente
    ev.cancel = true;
    const player = ev.player;
    const agora = system.currentTick;
    if (agora - (ultimaAbertura.get(player.id) ?? -1e9) < ABRINDO_TICKS) return;
    ultimaAbertura.set(player.id, agora);
    system.run(() => {
      if (player.isValid) rodarSeguro(player, "Hollow: registro", (p) => (id ? abrirRegistro(p, id) : abrirCofre(p)));
    });
  } catch (e) {
    registrarErro("Hollow: interação", e);
  }
});

// ------------------------------------------------------------------------------------ vento da casa
/** @type {Map<string, { dentro: boolean, ultimo: number }>} */
const vento = new Map();

/** @param {Player} p */
function elegivelVento(p) {
  try {
    if (p.hasTag(TAG_SUMIDO) || emMinigame(p)) return false;
    if (p.dimension.id.startsWith("vulpus:")) return false;
    return String(p.getGameMode()).toLowerCase() !== "spectator";
  } catch {
    return false;
  }
}

/**
 * Sopra o vento para a pessoa (texto pelo tanto de registros lidos).
 * @param {Player} player
 */
function soprar(player) {
  try {
    const n = dadosJogador(player).hollow.lidos.filter((id) => !ehPapelzinho(id)).length;
    const tier = VENTO.find((v) => n <= v.ate) ?? VENTO[VENTO.length - 1];
    const texto = `§7§o${tier.texto}`;
    player.sendMessage(texto);
    player.onScreenDisplay.setActionBar(texto);
    som(player, textos.SOM_VENTO, { volume: 0.4, pitch: 0.8 });
  } catch (e) {
    registrarErro("Hollow: vento", e);
  }
}

system.runInterval(() => {
  try {
    const cfg = config();
    if (!cfg.hollowVentoLigado || estadoEvento() !== "aberto") return;
    const casa = lerLocais().casa;
    if (!casa) return;
    const agora = system.currentTick;
    const raio2 = cfg.hollowVentoRaio * cfg.hollowVentoRaio;
    for (const p of online()) {
      let e = vento.get(p.id);
      if (!e) vento.set(p.id, (e = { dentro: false, ultimo: -1e9 }));
      if (!elegivelVento(p) || p.dimension.id !== casa.d) {
        e.dentro = false;
        continue;
      }
      const l = p.location;
      const dentro = (l.x - (casa.x + 0.5)) ** 2 + (l.y - casa.y) ** 2 + (l.z - (casa.z + 0.5)) ** 2 <= raio2;
      if (dentro && !e.dentro && agora - e.ultimo >= cfg.hollowVentoEsperaSeg * 20) {
        e.ultimo = agora;
        soprar(p);
      }
      e.dentro = dentro;
    }
  } catch (e) {
    registrarErro("Hollow: ciclo do vento", e);
  }
}, PASSO_VENTO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  vento.delete(playerId);
  ultimaAbertura.delete(playerId);
  ultimaTentativa.delete(playerId);
});

/** Linha do tamanho certo para a staff olhar o bloco. @param {Player} player */
export function blocoOlhado(player) {
  try {
    return player.getBlockFromViewDirection({ maxDistance: ALCANCE_MARCAR })?.block;
  } catch {
    return undefined;
  }
}
