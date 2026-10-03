// @ts-check
// Textos de Nível, ranks, cargos e Kitsune (sistemas/niveis.js e sistemas/identidade.js).
// Glyphs só no corpo e nos botões, nunca em títulos (fonte MinecraftTen).
import { formatarNumero } from "../core/util.js";
import { barra, glyph } from "../glyphs.js";

/** @typedef {import("../sistemas/niveis.js").Rank} Rank */
/** @typedef {import("../sistemas/niveis.js").InfoNivel} InfoNivel */

/** Nomes na ordem da tabela de ranks (iguais aos do Discord). */
export const NOMES_RANK = Object.freeze(["Filhote", "Raposinha", "Raposa Andarilha", "Raposa Lunar", "Raposa de Nove Caudas"]);
export const NOMES_CARGO = Object.freeze({ admin: "Admin", staff: "Staff", helper: "Helper" });

export const TITULO = "Nível";
/** @param {string} nome */
export const TITULO_DE = (nome) => `Nível de ${nome}`;
export const TITULO_RANKS = "Ranks";
export const TITULO_RANKING = "Ranking de nível";
export const TITULO_COMO_GANHAR = "Como ganhar XP";

export const BOTAO_RANKS = "Ranks";
export const BOTAO_RANKING = "Ranking de nível";
export const BOTAO_COMO_GANHAR = "Como ganhar XP";

/** Glyph + nome colorido do rank. @param {Rank} rank */
export const RANK = (rank) => `${glyph(rank.glyph)} ${rank.cor}${rank.nome}`;

/**
 * Corpo do menu Nível.
 * @param {InfoNivel} info
 * @param {{ nome: string, online: boolean, proprio: boolean }} quem
 */
export const CORPO = (info, quem) =>
  [
    ...(quem.proprio ? [] : [`§6${quem.nome} ${quem.online ? "§a• online" : "§8• offline"}`, ""]),
    RANK(info.rank),
    `§7Nível §f${formatarNumero(info.nivel)} §8• §7${Math.floor(info.fracao * 100)}%`,
    barra(info.fracao, 10),
    `§7XP: §f${formatarNumero(info.xpNoNivel)}§7/${formatarNumero(info.xpParaProximo)} §8• §7total §f${formatarNumero(info.xp)}`,
    "",
    info.proximoRank
      ? `§7Próximo rank: ${RANK(info.proximoRank)} §7no nível §f${info.proximoRank.nivelMinimo}`
      : "§dRank máximo! A toca inteira olha pra cima.",
  ].join("\n");

/**
 * Linha da tela Ranks.
 * @param {Rank} rank
 * @param {number} xpTotal  XP total para chegar no nível mínimo
 * @param {boolean} atual
 */
export const RANKS_LINHA = (rank, xpTotal, atual) =>
  `${RANK(rank)}${atual ? " §a« você" : ""}\n§7  a partir do nível §f${rank.nivelMinimo} §8(§7${formatarNumero(xpTotal)} XP§8)`;
export const RANKS_RODAPE = [
  "§7Os ranks são os mesmos do Discord.",
  "§7Staff e Helper mostram o selo do cargo no lugar do rank.",
].join("\n");

/** @param {number} nivel */
export const SUBIU = (nivel) => `Subiu para o nível §e${formatarNumero(nivel)}§r! Bora!`;
/** @param {string} nome */
export const SUBTITULO_RANK = (nome) => `Você virou ${nome}!`;
/** Aviso para todo mundo (vai depois do PREFIXO). @param {string} quem @param {Rank} rank */
export const ANUNCIO_RANK = (quem, rank) => `§e${quem}§r virou ${rank.cor}${rank.nome}§r! A toca comemora.`;
/** @param {number} xp */
export const XP_DIARIA = (xp) => `§a+${formatarNumero(xp)} XP§7 pela diária.`;

export const RANKING_VAZIO = "§7Ninguém ganhou XP ainda. O topo está esperando!";
export const RANKING_LEGENDA = "§a• §7online   §8• §7offline";
/**
 * @param {number} posicao
 * @param {string} nome
 * @param {number} nivel
 * @param {Rank} rank
 * @param {{ online: boolean, voce: boolean }} marcas
 */
export const RANKING_LINHA = (posicao, nome, nivel, rank, { online, voce }) =>
  `${posicao <= 3 ? "§6" : "§e"}${posicao}. ${online ? "§a•" : "§8•"} ${glyph(rank.glyph)} ${voce ? "§a" : "§f"}${nome} §8» §7Nv §f${formatarNumero(nivel)}`;
/** @param {number} posicao */
export const RANKING_SUA_POSICAO = (posicao) => `§7Sua posição: §e${posicao}º`;
export const RANKING_FORA = "§7Você ainda não entrou no ranking. Anda por aí que o XP vem!";
export const NOME_DESCONHECIDO = "Raposa misteriosa";

/** @param {{ xpPorMinuto: number, xpDiaria: number }} cfg */
export const COMO_GANHAR = (cfg) =>
  [
    "§6★ Tempo de jogo",
    `§fCada minuto jogando de verdade vale §a${formatarNumero(cfg.xpPorMinuto)} XP§f.`,
    "§7Ficar parado não conta: eu percebo quem está AFK.",
    "",
    "§6★ Recompensa diária",
    `§fPegar a diária dá mais §a${formatarNumero(cfg.xpDiaria)} XP§f.`,
    "",
    "§6★ Subir de nível",
    "§fDo nível N para o seguinte: §e5×N² + 50×N + 100§f XP, a mesma conta do Discord.",
    "§7Aqui todo mundo ganha XP no mesmo ritmo.",
  ].join("\n");

export const DESC_NIVEL = "Mostra o seu nível (ou o de alguém online)";
export const DESC_CARGO = "Muda o cargo de alguém: admin, staff, helper ou nenhum (admin)";
export const DESC_KITSUNE = "Liga ou desliga o selo Kitsune de alguém (staff)";

// Cargos e Kitsune (staff)
export const TITULO_CARGOS = "Cargos e Kitsune";
/** @param {string} nome */
export const TITULO_CARGO_DE = (nome) => `Cargo de ${nome}`;
/** @param {boolean} admin */
export const CARGOS_ESCOLHA = (admin) =>
  admin ? "§7Escolha quem vai ganhar cargo ou selo Kitsune." : "§7Escolha quem vai ganhar ou perder o selo Kitsune.\n§7Cargo, só admin muda.";
export const CARGOS_NINGUEM = "§7Não tem ninguém online agora.";
/**
 * Botão de uma pessoa na lista.
 * @param {string} selo
 * @param {string} nome
 * @param {string | null} cargo  nome do cargo, ou null
 */
export const BOTAO_PESSOA = (selo, nome, cargo) => `${selo} §f${nome}\n§7${cargo ?? "sem cargo"}`;
/**
 * @param {{ nome: string, cargo: string | null, kitsune: boolean, admin: boolean }} info
 */
export const CORPO_CARGO = ({ nome, cargo, kitsune, admin }) =>
  [
    `§6${nome}`,
    `§7Cargo: §f${cargo ?? "nenhum"}`,
    `§7Kitsune: ${kitsune ? "§dligado" : "§8desligado"}`,
    "",
    admin ? "§7Operador do mundo sempre aparece como Admin." : "§7Cargo, só admin muda. Kitsune, a staff liga e desliga.",
  ].join("\n");
/** @param {string} nome @param {boolean} atual */
export const BOTAO_CARGO = (nome, atual) => (atual ? `${nome} §a✔` : nome);
export const NENHUM = "Nenhum";
/** @param {boolean} ligado */
export const BOTAO_KITSUNE = (ligado) => `Kitsune: ${ligado ? "§dligado" : "§8desligado"}`;

export const CARGO_SO_ADMIN = "Cargo só admin muda.";
export const CARGO_INVALIDO = "Cargo desconhecido. Use §eadmin§c, §estaff§c, §ehelper§c ou §enenhum§c.";
export const CARGO_PROPRIO_ADMIN = "Tirar o próprio admin não dá. Pede para outra pessoa admin.";
/** @param {string} nome @param {string | null} cargo */
export const CARGO_OK = (nome, cargo) => (cargo ? `Pronto! §e${nome}§r agora é §6${cargo}§r.` : `Pronto! §e${nome}§r ficou sem cargo.`);
/** Quando a permissão do jogo vence a tag. @param {string} nome @param {string} cargo */
export const CARGO_CONTINUA = (nome, cargo) => `§7Só que §e${nome}§7 continua §6${cargo}§7 pela permissão do mundo.`;
/** Aviso para quem mudou de cargo. @param {string | null} cargo */
export const CARGO_AVISO = (cargo) => (cargo ? `Agora seu cargo é §6${cargo}§r.` : "Agora você está sem cargo.");

/** @param {string} nome @param {boolean} ligado */
export const KITSUNE_OK = (nome, ligado) =>
  ligado ? `Selo Kitsune ligado para §e${nome}§r.` : `Selo Kitsune desligado para §e${nome}§r.`;
/** @param {boolean} ligado */
export const KITSUNE_AVISO = (ligado) =>
  ligado ? "§dSelo Kitsune ligado!§r Valeu por apoiar a toca no Discord!" : "Seu selo Kitsune foi desligado.";
