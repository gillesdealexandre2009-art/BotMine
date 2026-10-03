// @ts-check
// Painel da staff: definir spawn, configurações (em 4 grupos), dar Caudas, cargos e Kitsune,
// leilão e pegar o item do menu.
import { CHAVE_SPAWN, ICONES, VERSAO } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, lerMundo, salvarConfig, todosJogadores } from "../core/db.js";
import { Lista, perguntar } from "../core/forms.js";
import { online } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, msg, ok } from "../core/util.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/staff.js";
import { garantirItem } from "./boas_vindas.js";
import { DAR_MAXIMO, darCaudas } from "./caudas.js";
import { menuCargos } from "./identidade.js";
import { menuLeilaoStaff } from "./leilao.js";
import { definirSpawn } from "./spawn.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/db.js").Config} Config */
/** @typedef {keyof Config} ChaveConfig */

/**
 * Faixa aceita em cada configuração numérica (fora dela, o valor é puxado para o limite).
 * @type {Partial<Record<ChaveConfig, [number, number]>>}
 */
const FAIXAS = {
  esperaTeleporte: [0, 30],
  recargaTeleporte: [0, 600],
  combateSegundos: [0, 120],
  tpaExpira: [10, 600],
  limiteCasas: [0, 20],
  caudasPorIntervalo: [0, 1000],
  intervaloCaudasMin: [1, 120],
  diariaBase: [0, 100000],
  diariaBonusDia: [0, 10000],
  diariaBonusMax: [0, 365],
  xpPorMinuto: [0, 100],
  xpDiaria: [0, 10000],
  taxaAnuncioPct: [0, 50],
  taxaVendaPct: [0, 50],
  precoMinimo: [1, 1000000],
  precoMaximo: [1, 1000000],
  anunciosPorJogador: [0, 50],
  duracaoAnuncioHoras: [1, 720],
  caixaLimite: [9, 200],
};
const LINK_MAXIMO = 100;
/** Convite do Discord: discord.gg/xxx ou discord.com/invite/xxx (com ou sem https://). */
const LINK_DISCORD = /^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[\w-]{2,40}\/?$/i;

/**
 * Configurações em 4 formulários; cada chave de PADROES está em um grupo só.
 * @type {{ titulo: string, icone: string, chaves: ChaveConfig[] }[]}
 */
const GRUPOS = [
  {
    titulo: textos.GRUPO_TELEPORTE,
    icone: ICONES.tpa,
    chaves: ["esperaTeleporte", "recargaTeleporte", "combateSegundos", "tpaExpira", "limiteCasas"],
  },
  {
    titulo: textos.GRUPO_CAUDAS,
    icone: ICONES.caudas,
    chaves: ["caudasPorIntervalo", "intervaloCaudasMin", "diariaBase", "diariaBonusDia", "diariaBonusMax", "xpPorMinuto", "xpDiaria"],
  },
  {
    titulo: textos.GRUPO_LEILAO,
    icone: ICONES.leilao,
    chaves: [
      "leilaoLigado",
      "taxaAnuncioPct",
      "taxaVendaPct",
      "precoMinimo",
      "precoMaximo",
      "anunciosPorJogador",
      "duracaoAnuncioHoras",
      "caixaLimite",
    ],
  },
  { titulo: textos.GRUPO_GERAL, icone: ICONES.mundo, chaves: ["linkDiscord", "hudPadrao"] },
];

/**
 * Painel da staff (confere a permissão de novo ao abrir).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuStaff(player, voltar);
  await new Lista(textos.TITULO)
    .texto(
      textos.CORPO({
        versao: VERSAO,
        online: online().length,
        registrados: todosJogadores().length,
        spawnDefinido: lerMundo(CHAVE_SPAWN) !== undefined,
      }),
    )
    .botao(textos.BOTAO_SPAWN, ICONES.spawn, (p) => definirSpawn(p))
    .botao(textos.BOTAO_CONFIG, ICONES.ajustes, (p) => menuConfig(p, aqui))
    .botao(textos.BOTAO_DAR, ICONES.caudas, (p) => escolherQuemGanha(p, aqui))
    .botao(textos.BOTAO_CARGOS, ICONES.cargos, (p) => menuCargos(p, aqui))
    .botao(textos.BOTAO_LEILAO, ICONES.leilao, (p) => menuLeilaoStaff(p, aqui))
    .botao(textos.BOTAO_ITEM, ICONES.nova, (p) => {
      if (garantirItem(p) === "tinha") msg(p, textos.ITEM_JA_TEM);
    })
    .voltar(voltar)
    .abrir(player);
}

/**
 * Campo do formulário para uma configuração, conforme o tipo do padrão.
 * @param {ChaveConfig} chave
 * @param {Config} atual
 * @returns {import("../core/forms.js").Campo}
 */
function campoDe(chave, atual) {
  const rotulo = textos.CAMPOS[chave];
  const valor = atual[chave];
  if (typeof valor === "boolean") return { tipo: "alternar", rotulo, padrao: valor };
  if (typeof valor === "string") return { tipo: "texto", rotulo, dica: textos.DICA_LINK, padrao: valor };
  const [min, max] = FAIXAS[chave] ?? [0, Number.MAX_SAFE_INTEGER];
  return { tipo: "numero", rotulo, padrao: valor, min, max };
}

/**
 * Link do Discord limpo; undefined se não for um convite válido ("" apaga o link).
 * @param {string} bruto
 */
function limparLink(bruto) {
  const link = bruto.replace(/§./g, "").trim();
  if (link === "") return "";
  return link.length <= LINK_MAXIMO && LINK_DISCORD.test(link) ? link : undefined;
}

/**
 * Escolha do grupo de configurações.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function menuConfig(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, geral.SO_STAFF);
    return;
  }
  const aqui = () => menuConfig(player, voltar);
  const lista = new Lista(textos.TITULO_CONFIG).texto(textos.CONFIG_ESCOLHA);
  for (const grupo of GRUPOS) {
    lista.botao(grupo.titulo, grupo.icone, async (p) => {
      await editarConfig(p, grupo.titulo, grupo.chaves);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Formulário com as configurações de um grupo; salva só o que mudou.
 * @param {Player} player
 * @param {string} titulo
 * @param {ChaveConfig[]} chaves
 */
async function editarConfig(player, titulo, chaves) {
  const atual = config();
  const valores = await perguntar(player, titulo, chaves.map((chave) => campoDe(chave, atual)));
  if (!valores || !ehStaff(player)) return;
  /** @type {Record<string, unknown>} */
  const mudancas = {};
  chaves.forEach((chave, i) => {
    let valor = valores[i];
    if (chave === "linkDiscord") {
      valor = limparLink(String(valor));
      if (valor === undefined) {
        erro(player, textos.LINK_INVALIDO);
        return;
      }
    }
    if (valor !== atual[chave]) mudancas[chave] = valor;
  });
  const minimo = mudancas.precoMinimo ?? atual.precoMinimo;
  const maximo = mudancas.precoMaximo ?? atual.precoMaximo;
  if (typeof minimo === "number" && typeof maximo === "number" && minimo > maximo) {
    erro(player, textos.PRECO_INVERTIDO);
    delete mudancas.precoMinimo;
    delete mudancas.precoMaximo;
  }
  const mudou = Object.keys(mudancas);
  if (!mudou.length) {
    msg(player, textos.CONFIG_IGUAL);
    return;
  }
  salvarConfig(/** @type {Partial<Config>} */ (mudancas));
  ok(player, textos.CONFIG_SALVA(mudou.map((chave) => textos.CAMPOS[/** @type {ChaveConfig} */ (chave)])));
}

/**
 * Lista de quem está online para dar (ou tirar) Caudas.
 * @param {Player} player
 * @param {() => any} voltar
 */
async function escolherQuemGanha(player, voltar) {
  const pessoas = online().sort((a, b) => a.name.localeCompare(b.name));
  const lista = new Lista(textos.TITULO_DAR).texto(pessoas.length ? textos.DAR_ESCOLHA : textos.NINGUEM_ONLINE);
  for (const pessoa of pessoas) {
    lista.botao(pessoa.name, ICONES.jogador, async (p) => {
      if (!pessoa.isValid) {
        erro(p, geral.JOGADOR_OFFLINE);
        return voltar();
      }
      const resposta = await perguntar(p, textos.TITULO_VALOR(pessoa.name), [
        { tipo: "numero", rotulo: textos.ROTULO_VALOR, padrao: 0, min: -DAR_MAXIMO, max: DAR_MAXIMO },
      ]);
      if (resposta) darCaudas(p, pessoa, resposta[0]);
      await voltar();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

registrarComando({ nome: "staff", descricao: textos.DESC_STAFF, staff: true }, (p) => menuStaff(p));
