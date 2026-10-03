// @ts-check
// Identidade: cargo (Admin/Staff/Helper), selo Kitsune, nameTag de 2 linhas e o canal no scoreboard
// que o pack "Vulpus Chat" lê (formato da spec 03, §8.5). Só escreve o que mudou.
import { CommandPermissionLevel, Player, PlayerPermissionLevel, system, world } from "@minecraft/server";
import { ICONES, TAG_ADMIN, TAG_HELPER, TAG_KITSUNE, TAG_STAFF } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { Lista } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok, registrarErro } from "../core/util.js";
import { G, glyph } from "../glyphs.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/niveis.js";
import { aoSubirNivel, infoNivel } from "./niveis.js";

/** @typedef {"admin" | "staff" | "helper"} Cargo */
/** @typedef {{ nome: string, glyph: string, cor: string, codigo: number }} InfoCargo */
/** @typedef {import("@minecraft/server").ScoreboardObjective} ScoreboardObjective */

/** @type {Readonly<Record<Cargo, Readonly<InfoCargo>>>} */
export const CARGOS = Object.freeze({
  admin: Object.freeze({ nome: textos.NOMES_CARGO.admin, glyph: G.ADMIN, cor: "§c", codigo: 3 }),
  staff: Object.freeze({ nome: textos.NOMES_CARGO.staff, glyph: G.STAFF, cor: "§6", codigo: 2 }),
  helper: Object.freeze({ nome: textos.NOMES_CARGO.helper, glyph: G.HELPER, cor: "§a", codigo: 1 }),
});

/** Tag de cada cargo (o cargo mexe só nessas três). */
const TAGS_CARGO = /** @type {const} */ ([
  ["admin", TAG_ADMIN],
  ["staff", TAG_STAFF],
  ["helper", TAG_HELPER],
]);

/** Canal com o chat (versão 1): ids e nomes de exibição dos objectives. */
const CANAL = Object.freeze({ id: "vulpus_canal", nome: "Vulpus canal" });
const OBJ_NIVEL = Object.freeze({ id: "vulpus_nivel", nome: "Vulpus nível" });
const OBJ_RANK = Object.freeze({ id: "vulpus_rank", nome: "Vulpus rank" });
const OBJ_CARGO = Object.freeze({ id: "vulpus_cargo", nome: "Vulpus cargo" });
const VERSAO_CANAL = 1;
const PARTICIPANTE_VERSAO = "#versao";

const TICKS_PRIMEIRA = 20;
const TICKS_VARREDURA = 600;

/** @type {{ versao: ScoreboardObjective, nivel: ScoreboardObjective, rank: ScoreboardObjective, cargo: ScoreboardObjective } | undefined} */
let canal;
let mundoCarregado = false;

/**
 * Objective pelo id, criando se não existir.
 * @param {{ id: string, nome: string }} def
 */
function objetivo(def) {
  return world.scoreboard.getObjective(def.id) ?? world.scoreboard.addObjective(def.id, def.nome);
}

/** Cria (ou reencontra) os objectives do canal e grava a versão. */
function garantirCanal() {
  const versao = objetivo(CANAL);
  gravarScore(versao, PARTICIPANTE_VERSAO, VERSAO_CANAL);
  canal = { versao, nivel: objetivo(OBJ_NIVEL), rank: objetivo(OBJ_RANK), cargo: objetivo(OBJ_CARGO) };
}

/** Canal pronto para escrever (recria se alguém apagou um objective com /scoreboard; sem o vulpus_canal o chat fica vanilla). */
function canalValido() {
  if (!mundoCarregado) return undefined;
  if (!canal || !Object.values(canal).every((obj) => obj.isValid)) garantirCanal();
  return canal;
}

/**
 * Cargo pela primeira regra que valer: Admin (operador ou tag), Staff (tag ou nível de comando), Helper (tag).
 * @param {Player} player
 * @returns {Cargo | null}
 */
export function cargoDe(player) {
  try {
    if (player.playerPermissionLevel === PlayerPermissionLevel.Operator || player.hasTag(TAG_ADMIN)) return "admin";
    if (player.hasTag(TAG_STAFF) || player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors) return "staff";
    if (player.hasTag(TAG_HELPER)) return "helper";
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {Player} player
 * @returns {boolean} tag vulpus:kitsune
 */
export function ehKitsune(player) {
  try {
    return player.hasTag(TAG_KITSUNE);
  } catch {
    return false;
  }
}

/**
 * Selo do prefixo (glyph do cargo ou do rank, + kitsune), com §f…§r.
 * @param {Player} player
 * @returns {string}
 */
export function selo(player) {
  const cargo = cargoDe(player);
  const base = glyph(cargo ? CARGOS[cargo].glyph : infoNivel(player).rank.glyph);
  return ehKitsune(player) ? `${base} ${glyph(G.KITSUNE)}` : base;
}

/**
 * Grava o score só quando mudou.
 * @param {ScoreboardObjective} obj
 * @param {Player | string} participante  jogador ou jogador falso ("#versao")
 * @param {number} valor
 */
function gravarScore(obj, participante, valor) {
  let atual;
  try {
    atual = obj.getScore(participante);
  } catch {
    // Quem ainda não tem score lança ("Failed to resolve identity") em vez de devolver undefined.
    atual = undefined;
  }
  if (atual !== valor) obj.setScore(participante, valor);
}

/**
 * nameTag (2 linhas: selo + cargo ou rank + nível / nome) e canal do chat, só o que mudou.
 * @param {Player} player
 */
export function atualizarIdentidade(player) {
  if (!player.isValid) return;
  const info = infoNivel(player);
  const cargo = cargoDe(player);
  const kitsune = ehKitsune(player);
  const marca = cargo ? CARGOS[cargo] : info.rank;
  const linha1 = `${glyph(marca.glyph)} ${marca.cor}${marca.nome} §7Nv ${info.nivel}${kitsune ? ` ${glyph(G.KITSUNE)}` : ""}`;
  const nameTag = `${linha1}\n§f${player.name}`;
  if (player.nameTag !== nameTag) player.nameTag = nameTag;
  const c = canalValido();
  if (!c) return;
  gravarScore(c.nivel, player, info.nivel);
  gravarScore(c.rank, player, info.rank.indice);
  gravarScore(c.cargo, player, cargo ? CARGOS[cargo].codigo : 0);
}

/**
 * atualizarIdentidade sem deixar erro escapar.
 * @param {Player} player
 */
function atualizarSeguro(player) {
  try {
    atualizarIdentidade(player);
  } catch (e) {
    registrarErro("Identidade", e);
  }
}

/**
 * Admin troca o cargo de alguém online: deixa só a tag do cargo escolhido (ou nenhuma).
 * @param {Player} autor
 * @param {Player} alvo
 * @param {Cargo | null} cargo  null = nenhum
 * @returns {boolean} se aplicou
 */
export function definirCargo(autor, alvo, cargo) {
  if (cargoDe(autor) !== "admin") {
    erro(autor, textos.CARGO_SO_ADMIN);
    return false;
  }
  if (!alvo.isValid) {
    erro(autor, geral.JOGADOR_OFFLINE);
    return false;
  }
  if (alvo.id === autor.id && cargo !== "admin") {
    erro(autor, textos.CARGO_PROPRIO_ADMIN);
    return false;
  }
  for (const [nome, tag] of TAGS_CARGO) {
    if (nome === cargo) {
      if (!alvo.hasTag(tag)) alvo.addTag(tag);
    } else if (alvo.hasTag(tag)) alvo.removeTag(tag);
  }
  atualizarIdentidade(alvo);
  const real = cargoDe(alvo);
  const nomeReal = real ? CARGOS[real].nome : null;
  ok(autor, textos.CARGO_OK(alvo.name, cargo ? CARGOS[cargo].nome : null));
  if (real !== cargo && nomeReal) msg(autor, textos.CARGO_CONTINUA(alvo.name, nomeReal));
  if (alvo.id !== autor.id) msg(alvo, textos.CARGO_AVISO(nomeReal));
  return true;
}

/**
 * Staff liga ou desliga o selo Kitsune de alguém online (só cosmético).
 * @param {Player} autor
 * @param {Player} alvo
 * @returns {boolean} se aplicou
 */
export function alternarKitsune(autor, alvo) {
  if (!ehStaff(autor)) {
    erro(autor, geral.SO_STAFF);
    return false;
  }
  if (!alvo.isValid) {
    erro(autor, geral.JOGADOR_OFFLINE);
    return false;
  }
  const ligado = !ehKitsune(alvo);
  if (ligado) alvo.addTag(TAG_KITSUNE);
  else alvo.removeTag(TAG_KITSUNE);
  atualizarIdentidade(alvo);
  ok(autor, textos.KITSUNE_OK(alvo.name, ligado));
  if (alvo.id !== autor.id) msg(alvo, textos.KITSUNE_AVISO(ligado));
  return true;
}

/**
 * Nome do cargo atual, ou null.
 * @param {Player} player
 */
function nomeCargo(player) {
  const cargo = cargoDe(player);
  return cargo ? CARGOS[cargo].nome : null;
}

/**
 * Lista online → escolher cargo (Admin/Staff/Helper/Nenhum) e alternar Kitsune.
 * Só admin muda cargo; staff alterna Kitsune.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuCargos(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuCargos(player, voltar);
  const pessoas = online().sort((a, b) => a.name.localeCompare(b.name));
  const lista = new Lista(textos.TITULO_CARGOS).texto(
    pessoas.length ? textos.CARGOS_ESCOLHA(cargoDe(player) === "admin") : textos.CARGOS_NINGUEM,
  );
  for (const pessoa of pessoas) {
    const id = pessoa.id;
    lista.botao(textos.BOTAO_PESSOA(selo(pessoa), pessoa.name, nomeCargo(pessoa)), ICONES.jogador, (p) =>
      menuPessoa(p, id, aqui),
    );
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Cargo e Kitsune de uma pessoa online.
 * @param {Player} player
 * @param {string} alvoId
 * @param {() => any} voltar
 */
async function menuPessoa(player, alvoId, voltar) {
  const alvo = porId(alvoId);
  if (!alvo) {
    erro(player, geral.JOGADOR_OFFLINE);
    return voltar();
  }
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuPessoa(player, alvoId, voltar);
  const admin = cargoDe(player) === "admin";
  const atual = cargoDe(alvo);
  const lista = new Lista(textos.TITULO_CARGO_DE(alvo.name)).texto(
    textos.CORPO_CARGO({ nome: alvo.name, cargo: nomeCargo(alvo), kitsune: ehKitsune(alvo), admin }),
  );
  if (admin) {
    /** @type {[Cargo | null, string, string][]} */
    const opcoes = [
      ["admin", CARGOS.admin.nome, ICONES.staff],
      ["staff", CARGOS.staff.nome, ICONES.cargos],
      ["helper", CARGOS.helper.nome, ICONES.cargos],
      [null, textos.NENHUM, ICONES.nao],
    ];
    for (const [cargo, nome, icone] of opcoes) {
      lista.botao(textos.BOTAO_CARGO(nome, atual === cargo), icone, async (p) => {
        const pessoa = porId(alvoId);
        if (pessoa) definirCargo(p, pessoa, cargo);
        else erro(p, geral.JOGADOR_OFFLINE);
        await aqui();
      });
    }
  }
  lista.botao(textos.BOTAO_KITSUNE(ehKitsune(alvo)), ICONES.ranks, async (p) => {
    const pessoa = porId(alvoId);
    if (pessoa) alternarKitsune(p, pessoa);
    else erro(p, geral.JOGADOR_OFFLINE);
    await aqui();
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * "admin", "staff", "helper" ou "nenhum" (sem acento nem maiúscula) → cargo; undefined se não for nenhum desses.
 * @param {unknown} texto
 * @returns {Cargo | null | undefined}
 */
function lerCargo(texto) {
  const limpo = String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (limpo === "nenhum") return null;
  return limpo === "admin" || limpo === "staff" || limpo === "helper" ? limpo : undefined;
}

aoSubirNivel((player) => atualizarIdentidade(player));

world.afterEvents.worldLoad.subscribe(() => {
  try {
    mundoCarregado = true;
    garantirCanal();
  } catch (e) {
    registrarErro("Canal do chat", e);
  }
  for (const player of online()) atualizarSeguro(player);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) {
    atualizarSeguro(player);
    return;
  }
  system.runTimeout(() => {
    if (player.isValid) atualizarSeguro(player);
  }, TICKS_PRIMEIRA);
});

system.runInterval(() => {
  for (const player of online()) atualizarSeguro(player);
}, TICKS_VARREDURA);

registrarComando(
  {
    nome: "cargo",
    descricao: textos.DESC_CARGO,
    staff: true,
    parametros: [
      { nome: "jogador", tipo: "jogador" },
      { nome: "cargo", tipo: "texto" },
    ],
  },
  (p, [alvo, texto]) => {
    if (!(alvo instanceof Player)) {
      erro(p, geral.JOGADOR_OFFLINE);
      return;
    }
    const cargo = lerCargo(texto);
    if (cargo === undefined) {
      erro(p, textos.CARGO_INVALIDO);
      return;
    }
    definirCargo(p, alvo, cargo);
  },
);

registrarComando(
  { nome: "kitsune", descricao: textos.DESC_KITSUNE, staff: true, parametros: [{ nome: "jogador", tipo: "jogador" }] },
  (p, [alvo]) => {
    if (!(alvo instanceof Player)) {
      erro(p, geral.JOGADOR_OFFLINE);
      return;
    }
    alternarKitsune(p, alvo);
  },
);
