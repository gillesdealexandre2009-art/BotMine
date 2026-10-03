// @ts-check
// Comandos /vulpus:<nome>. Os sistemas chamam registrarComando() no topo do módulo e tudo é
// registrado de uma vez no startup (sem precisar de cheats).
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, Player, system } from "@minecraft/server";
import * as textos from "../textos/geral.js";
import { ehStaff } from "./permissoes.js";
import { registrarErro, rodarSeguro } from "./util.js";

/**
 * @typedef {object} ParametroComando
 * @property {string} nome  como aparece na linha de comando
 * @property {string} tipo  "jogador" | "texto" | "inteiro"
 * @property {boolean} [opcional]
 */

/**
 * @typedef {object} DefComando
 * @property {string} nome  sem namespace: "menu" vira /vulpus:menu
 * @property {string} descricao
 * @property {boolean} [staff]  só staff pode usar
 * @property {ParametroComando[]} [parametros]
 */

/**
 * Recebe os argumentos na ordem de def.parametros: jogador → Player (null se o nome ou seletor
 * não achou ninguém online), texto → string, inteiro → number; opcional ausente → undefined.
 * @typedef {(player: Player, args: any[]) => any} HandlerComando
 */

/** @type {Record<string, CustomCommandParamType>} */
const TIPOS = {
  jogador: CustomCommandParamType.PlayerSelector,
  texto: CustomCommandParamType.String,
  inteiro: CustomCommandParamType.Integer,
};

/** @type {{ def: DefComando, handler: HandlerComando }[]} */
const pendentes = [];
let jaRegistrou = false;

/**
 * Registra /vulpus:<def.nome>. O handler roda fora do modo restrito (via system.run).
 * @param {DefComando} def
 * @param {HandlerComando} handler
 */
export function registrarComando(def, handler) {
  if (jaRegistrou) {
    console.warn(`[Vulpus] /vulpus:${def.nome} chegou depois do startup e ficou de fora.`);
    return;
  }
  pendentes.push({ def, handler });
}

/**
 * Mandatórios primeiro, opcionais depois: é a ordem em que o jogo entrega os valores.
 * @param {DefComando} def
 */
function emOrdemDoJogo(def) {
  const parametros = def.parametros ?? [];
  return [...parametros.filter((p) => !p.opcional), ...parametros.filter((p) => p.opcional)];
}

/**
 * @param {ParametroComando} parametro
 * @returns {import("@minecraft/server").CustomCommandParameter}
 */
function paraJogo(parametro) {
  const type = TIPOS[parametro.tipo];
  if (!type) throw new Error(`tipo de parâmetro desconhecido: "${parametro.tipo}"`);
  return { name: parametro.nome, type };
}

/**
 * Valores do jogo → argumentos na ordem de def.parametros (PlayerSelector chega como lista;
 * lista vazia vira null, para não ser confundida com o opcional ausente).
 * @param {DefComando} def
 * @param {any[]} valores
 */
function argumentos(def, valores) {
  const ordem = emOrdemDoJogo(def);
  return (def.parametros ?? []).map((parametro) => {
    const valor = valores[ordem.indexOf(parametro)];
    return parametro.tipo === "jogador" && Array.isArray(valor) ? (valor[0] ?? null) : valor;
  });
}

/**
 * Callback do jogo (modo restrito): confere quem chamou e agenda o handler.
 * @param {DefComando} def
 * @param {HandlerComando} handler
 * @param {import("@minecraft/server").CustomCommandOrigin} origem
 * @param {any[]} valores
 * @returns {import("@minecraft/server").CustomCommandResult}
 */
function receber(def, handler, origem, valores) {
  const player = origem.sourceEntity;
  if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: textos.SO_JOGADOR };
  if (def.staff && !ehStaff(player)) return { status: CustomCommandStatus.Failure, message: textos.SO_STAFF };
  const args = argumentos(def, valores);
  system.run(() => {
    if (player.isValid) rodarSeguro(player, `Comando /vulpus:${def.nome}`, (p) => handler(p, args));
  });
  return { status: CustomCommandStatus.Success };
}

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
  jaRegistrou = true;
  for (const { def, handler } of pendentes) {
    try {
      const parametros = emOrdemDoJogo(def);
      customCommandRegistry.registerCommand(
        {
          name: `vulpus:${def.nome}`,
          description: def.descricao,
          permissionLevel: CommandPermissionLevel.Any,
          cheatsRequired: false,
          mandatoryParameters: parametros.filter((p) => !p.opcional).map(paraJogo),
          optionalParameters: parametros.filter((p) => p.opcional).map(paraJogo),
        },
        (origem, ...valores) => receber(def, handler, origem, valores),
      );
    } catch (e) {
      registrarErro(`Registrar /vulpus:${def.nome}`, e);
    }
  }
  pendentes.length = 0;
});
