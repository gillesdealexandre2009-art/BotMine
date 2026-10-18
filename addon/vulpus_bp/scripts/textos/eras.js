// @ts-check
// Textos das Eras (sistemas/eras*.js). Os de erro já saem em §c.
import { duracaoCurta, formatarDataHora } from "../sistemas/eras_calendario.js";
import { TOTAL_ERAS } from "../sistemas/eras_catalogo.js";
import { eventoAtivo, eventosDe, proximoEvento } from "../sistemas/eras_eventos.js";

/** @typedef {import("../sistemas/eras_catalogo.js").Perfil} Perfil */
/** @typedef {import("../sistemas/eras_catalogo.js").Condicao} Condicao */
/** @typedef {import("../sistemas/eras_calendario.js").Situacao} Situacao */
/** @typedef {import("../sistemas/eras_calendario.js").EstadoEras} EstadoEras */

export const DESC_ERA = "Mostra a Era da semana, o que ela dá e o que ela cobra (a staff e o dono têm mais opções).";

export const SO_DONO = "Isso é só do dono do servidor.";
export const SO_STAFF = "Isso é só da staff.";
export const ERRO_INTERNO = "Algo deu errado aqui dentro; olha o Content Log.";

// ---------------------------------------------------------------- nomes
/** @type {Readonly<Record<Condicao, string>>} */
export const COND = Object.freeze({
  dia: "de dia",
  noite: "à noite",
  ceu: "ao céu aberto",
  teto: "debaixo de um teto",
  caverna: "no subsolo",
  agua: "na água",
  folhas: "perto de muitas folhas",
  altura: "nas alturas",
  sempre: "o tempo todo",
});

/** @type {Readonly<Record<string, string>>} */
export const EFEITO = Object.freeze({
  regeneration: "Regeneração",
  speed: "Velocidade",
  haste: "Pressa",
  jump_boost: "Super pulo",
  slow_falling: "Queda lenta",
  water_breathing: "Respirar na água",
  dolphins_grace: "Graça do golfinho",
  saturation: "Saciedade",
  slowness: "Lentidão",
  hunger: "Fome",
  mining_fatigue: "Fadiga de mineração",
});

/** @type {Readonly<Record<string, string>>} */
const ITEM = Object.freeze({
  "minecraft:lapis_lazuli": "lápis-lazúli",
  "minecraft:raw_copper": "cobre bruto",
  "minecraft:raw_iron": "ferro bruto",
  "minecraft:gold_nugget": "pepita de ouro",
  "minecraft:experience_bottle": "garrafa de experiência",
});
/** @param {string} id */
export const NOME_ITEM = (id) => ITEM[id] ?? id.replace("minecraft:", "").replace(/_/g, " ");

const ROMANOS = ["I", "II", "III", "IV"];
/** @param {number} n */
const nivelRomano = (n) => ROMANOS[Math.max(0, Math.min(3, n))];
/** @param {Condicao[]} q */
const quando = (q) => (q.length === 1 && q[0] === "sempre" ? "o tempo todo" : q.map((c) => COND[c]).join(", "));
/** @param {number} m */
const mult = (m) => `×${String(Math.round(m * 100) / 100).replace(".", ",")}`;
/** @param {number} c */
const pct = (c) => `${Math.round(c * 100)}%`;

/**
 * As regras de gameplay da Era, uma por linha, já com cor (§a vantagem, §c custo, §e evento). Sai sempre do catálogo.
 * @param {Perfil} era
 * @returns {string[]}
 */
export function linhasMecanicas(era) {
  const m = era.mecanicas;
  /** @type {string[]} */
  const l = [];
  for (const f of m.efeitos) {
    const nome = `${EFEITO[f.efeito] ?? f.efeito} ${nivelRomano(f.nivel)}`;
    l.push(f.tipo === "buff" ? `§a+ ${nome} §7${quando(f.quando)}` : `§c- ${nome} §7${quando(f.quando)}`);
  }
  if (m.xp) l.push(`§a+ XP ${mult(m.xp.mult)} §7${m.xp.quando ? quando(m.xp.quando) : "em tudo que rende XP"}`);
  if (m.caudasMinuto) l.push(`§a+ Caudas do tempo online ${mult(m.caudasMinuto.mult)} §7${m.caudasMinuto.quando ? quando(m.caudasMinuto.quando) : "o tempo todo"}`);
  if (m.venda) l.push(`§a+ Plantações vendidas no leilão rendem ${mult(m.venda.mult)} §7(bônus pago em Caudas pelo servidor: até ${m.venda.teto} por venda, ${m.venda.porItem} por item e ${m.venda.tetoDia} por dia)`);
  if (m.colheita) {
    const premios = m.colheita.premios.map(([id]) => NOME_ITEM(id)).join(", ");
    l.push(`§a+ ${pct(m.colheita.chance)} de chance de prêmio extra ao colher plantação madura §7(${premios}; até ${m.colheita.tetoDia} por dia)`);
  }
  if (m.minerio) l.push(`§a+ ${pct(m.minerio.chance)} de chance de +${m.minerio.caudas} Caudas ao quebrar minério §7(até ${m.minerio.tetoDia} por dia)`);
  if (m.abate) l.push(`§a+ ${m.abate.caudas} Caudas por monstro comum abatido ${m.abate.quando ? quando(m.abate.quando) : ""}§7(até ${m.abate.tetoDia} por dia)`);
  if (m.pulso) {
    const bonus = [m.pulso.xp ? `XP ${mult(m.pulso.xp)}` : "", m.pulso.caudas ? `Caudas do tempo online ${mult(m.pulso.caudas)}` : ""].filter(Boolean).join(" e ");
    l.push(`§e* ${m.pulso.nome}: a cada ${m.pulso.cadaMin} min, por ${m.pulso.duracaoSeg}s, ${bonus} para todos`);
  }
  if (!m.efeitos.some((f) => f.tipo === "debuff")) l.push("§7Sem custos nesta Era.");
  return l;
}

/** @typedef {import("../sistemas/eras_eventos.js").Evento} Evento */

/** @param {Evento} e */
export function descreverBonusEvento(e) {
  /** @type {string[]} */
  const b = [];
  for (const f of e.efeitos ?? []) b.push(`${EFEITO[f.efeito] ?? f.efeito} ${nivelRomano(f.nivel)}${f.quando.length === 1 && f.quando[0] === "sempre" ? "" : ` (${quando(f.quando)})`}`);
  if (e.xp) b.push(`XP ${mult(e.xp)}`);
  if (e.colheitaX) b.push(`chance de prêmio de colheita ${mult(e.colheitaX)}`);
  if (e.minerioX) b.push(`chance de prêmio de minério ${mult(e.minerioX)}`);
  if (e.abateX) b.push(`Caudas por abate ${mult(e.abateX)}`);
  return b.join(", ");
}

/** O acontecimento da Era, em linhas: nome, horários, duração e o que dá. @param {number} numero */
export function linhasEvento(numero) {
  return eventosDe(numero).flatMap((e) => [
    `§e* ${e.nome}§7: todo dia às §f${e.horarios.join("§7 e §f")}§7 (Brasília), por ${e.duracaoMin} min`,
    `§8  ${e.anuncio}`,
    `§a  Bônus: §7${descreverBonusEvento(e)}`,
  ]);
}

/** Status curto da temporada. @param {Situacao} s @param {EstadoEras} e @param {number} agora */
export function statusTemporada(s, e, agora) {
  const mec = e.mecanicas ? "§aligadas" : "§cdesligadas";
  switch (s.fase) {
    case "nao_iniciada":
      return `§7A temporada ainda não foi iniciada. O dono marca o início no painel de dono.\n§7Mecânicas: ${mec}`;
    case "aguardando":
      return `§7A temporada ${e.temporada} começa em §f${formatarDataHora(e.inicio)}§7 (daqui a §f${duracaoCurta(s.restanteMs)}§7).\n§7Mecânicas: ${mec}`;
    case "encerrada":
      return `§6Temporada ${e.temporada} encerrada em §f${formatarDataHora(s.fimTemporada)}§6.\n§7Fica a atmosfera da Era ${TOTAL_ERAS} até o dono decidir.\n§7As mecânicas pararam.`;
    default: {
      const agoraEv = eventoAtivo(s.numero, agora);
      const proximo = proximoEvento(s.numero, agora);
      const linhaEv = agoraEv
        ? `§e§lAcontecendo agora: ${agoraEv.evento.nome}§r§7 (mais ${Math.ceil(agoraEv.restanteSeg / 60)} min)`
        : proximo
          ? `§7Próximo acontecimento: §f${proximo.evento.nome}§7 às §f${formatarDataHora(proximo.inicio).slice(11)}§7 (daqui a ${duracaoCurta(proximo.inicio - agora)})`
          : "";
      return [
        `§6Temporada ${e.temporada} §8| §fEra ${s.numero} de ${TOTAL_ERAS}: §e${s.era?.nome ?? ""}`,
        `§7Troca em §f${duracaoCurta(s.restanteMs)} §7(${formatarDataHora(s.fimEra)})${s.proxima ? ` para §f${s.proxima.nome}` : " e a temporada se encerra"}`,
        linhaEv,
        `§7Mecânicas: ${mec}`,
        `§8Agora: ${formatarDataHora(agora)} (Brasília)`,
      ]
        .filter((l) => l !== "")
        .join("\n");
    }
  }
}

/** @param {Perfil} era */
export const FICHA_ERA = (era) =>
  [
    `§6Era ${era.numero}: §e${era.nome}`,
    `§7${era.conceito}`,
    "",
    `§f${era.descricao}`,
    `§7Sensação: §f${era.emocional}`,
    "",
    "§6Regras da Era",
    ...linhasMecanicas(era),
    "",
    "§6Acontecimento da Era",
    ...linhasEvento(era.numero),
    "",
    `§8Neblina: ${era.fog.inicio} a ${era.fog.fim} blocos`,
    ...era.limitacoes.map((x) => `§8- ${x}`),
  ].join("\n");

// ---------------------------------------------------------------- jogador
export const TITULO_JOGADOR = "§l§6Era da semana";
/** @param {Situacao} s @param {EstadoEras} e @param {number} agora */
export const CORPO_JOGADOR = (s, e, agora) => (s.era && s.fase !== "aguardando" ? `${statusTemporada(s, e, agora)}\n\n${FICHA_ERA(s.era)}` : statusTemporada(s, e, agora));
export const BOTAO_PROXIMA = (/** @type {Perfil} */ p) => `Prévia da próxima: ${p.nome}`;

/** @param {Perfil} era */
export const ANUNCIO_ERA = (era) => [`§6Era ${era.numero} §8» §e${era.nome}`, `§7${era.apresentacao}`, "§8Use /vulpus:era para ver o que ela dá e o que ela cobra."];
/** @param {string} nome @param {string} anuncio @param {number} min */
export const EVENTO_COMECOU = (nome, anuncio, min) => [`§e§l${nome} §r§8» §7${anuncio}`, `§8Dura ${min} min. Veja os bônus em /vulpus:era.`];
/** @param {string} nome */
export const EVENTO_TITULO = (nome) => `§e${nome}`;
/** @param {number} min */
export const EVENTO_SUBTITULO = (min) => `§7Acontecimento da Era, por ${min} min`;
/** @param {string} nome @param {string} fim */
export const EVENTO_TERMINOU = (nome, fim) => `§e${nome} §8» §7${fim}`;

/** @param {Perfil} era */
export const ENTRADA_ERA = (era) => `§6Era ${era.numero} §8» §e${era.nome}`;
export const TEMPORADA_ENCERROU = ["§6A temporada chegou ao fim.", "§7A Era 20 fica como está até o dono decidir o que vem depois."];
/** @param {string} nome @param {number} seg */
export const PULSO_COMECOU = (nome, seg) => `§e§l${nome} §r§7agora, por §f${seg}s§7. Aproveite!`;
/** @param {string} nome */
export const PULSO_TERMINOU = (nome) => `§7${nome} terminou.`;
/** @param {number} qtd @param {string} item */
export const PREMIO_COLHEITA = (qtd, item) => `§6Era §8» §7A colheita rendeu um extra: §f${qtd}x ${item}§7.`;
/** @param {number} c */
export const PREMIO_MINERIO = (c) => `§6Era §8» §7O minério brilhou: §e+${c} Caudas§7.`;
/** @param {number} c */
export const PREMIO_ABATE = (c) => `§6Era §8» §7Coragem premiada: §e+${c} Caudas§7.`;

// ---------------------------------------------------------------- staff e dono
export const PREVIA_TITULO = (/** @type {Perfil} */ e) => `§7Prévia da Era ${e.numero} (${e.nome}). Só você vê; dura 10 minutos. §f/vulpus:era restaurar §7volta à Era oficial.`;
export const PREVIA_FIM = "§7Prévia encerrada: voltou a Era oficial.";
export const PREVIA_SEM_ERA = "Você não está vendo prévia nenhuma.";
export const ERA_INVALIDA = `Era inválida. Use um número de 1 a ${TOTAL_ERAS}.`;
export const VALIDACAO_OK = `Catálogo válido: ${TOTAL_ERAS} Eras completas, sem repetição.`;
/** @param {string[]} problemas */
export const VALIDACAO_RUIM = (problemas) => `Catálogo com ${problemas.length} problema(s):\n${problemas.slice(0, 12).map((p) => `§c- ${p}`).join("\n")}${problemas.length > 12 ? `\n§7... e mais ${problemas.length - 12}` : ""}`;
export const DATA_INVALIDA = "Data inválida. Use \"agora\", AAAA-MM-DD ou AAAA-MM-DD HH:MM (hora de Brasília).";
/** @param {number} ms @param {boolean} ja */
export const INICIO_DEFINIDO = (ms, ja) => (ja ? `Temporada iniciada agora: a Era 1 já vale (${formatarDataHora(ms)}).` : `Temporada marcada: a Era 1 começa em ${formatarDataHora(ms)}.`);
/** @param {number} n */
export const ERA_FORCADA = (n) => `Era oficial agora: ${n}. As próximas semanas seguem a partir dela.`;
export const TEMPORADA_ENCERRADA_DONO = "Temporada encerrada. Nenhuma Era vale até você iniciar outra.";
/** @param {boolean} ligadas */
export const MECANICAS_MUDARAM = (ligadas) => (ligadas ? "Mecânicas das Eras ligadas (buffs, debuffs, multiplicadores e prêmios)." : "Mecânicas das Eras desligadas. A atmosfera continua.");
export const PRECISA_CONFIRMAR = "Para confirmar, repita o comando com a palavra \"confirmar\" no fim.";
export const SEM_TEMPORADA = "Não há temporada em andamento.";
export const USO = (/** @type {string} */ uso) => `Uso: /vulpus:era ${uso}`;
export const AJUDA = [
  "§6/vulpus:era §7mostra a Era da semana e o que ela dá e cobra",
  "§e lista §7as 20 Eras | §e info <n> §7ficha de uma Era",
  "§e previa <n> §7vê uma Era só para você (staff) | §e restaurar §7volta à oficial",
  "§e validar §7confere o catálogo (staff)",
  "§cDono: §e iniciar [agora|data] §7| §e ir <n> §7| §e encerrar confirmar §7| §e mecanicas <ligar|desligar> §7| §e painel",
].join("\n");

// painel de dono
export const BOTAO_PAINEL = "Eras da temporada";
export const TITULO_PAINEL = "§l§6Eras da temporada";
export const SECAO_VER = "Ver";
export const SECAO_DECIDIR = "Decisões do dono";
export const BOTAO_LISTA = "As 20 Eras";
export const BOTAO_PREVIA = "Ver uma Era (prévia, só para você)";
export const BOTAO_RESTAURAR = "Voltar à Era oficial";
export const BOTAO_VALIDAR = "Validar o catálogo";
export const BOTAO_INICIAR = "Iniciar ou reagendar a temporada";
export const BOTAO_FORCAR = "Forçar a Era oficial";
export const BOTAO_ENCERRAR = "Encerrar a temporada";
export const BOTAO_MECANICAS = (/** @type {boolean} */ ligadas) => `Mecânicas: ${ligadas ? "§aligadas" : "§cdesligadas"}§r (tocar para trocar)`;
export const TITULO_INICIAR = "Iniciar a temporada";
export const ROTULO_DATA = "Quando começa a Era 1? (agora ou AAAA-MM-DD HH:MM, hora de Brasília)";
export const TITULO_FORCAR = "Forçar a Era oficial";
export const ROTULO_ERA = `Era (1 a ${TOTAL_ERAS})`;
export const TITULO_PREVIA = "Prévia de uma Era";
export const CONFIRMAR_ENCERRAR = "Encerrar a temporada agora? Nenhuma Era vai valer até você iniciar outra. Ninguém perde nada do que já ganhou.";
/** @param {number} n @param {string} nome @param {boolean} atual */
export const BOTAO_ERA = (n, nome, atual) => `${atual ? "§l§6* " : ""}Era ${n}: ${nome}`;
