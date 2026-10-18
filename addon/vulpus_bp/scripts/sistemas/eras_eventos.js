// @ts-check
// Acontecimentos das Eras: cada Era tem um próprio, que acontece duas vezes por dia em horário fixo (hora de Brasília, para o pessoal
// saber quando entrar) e dura poucos minutos. Durante o acontecimento a neblina da pessoa fecha ou muda de cor, as partículas e os sons
// ficam mais fortes, pode haver piscadas de tela e todo mundo ganha um bônus temporário (efeito de poção, XP maior ou mais chance de
// prêmio). Só DADOS e contas de horário: o visual está em eras_visual.js e os bônus em eras_mecanicas.js. Nada mexe em blocos,
// entidades, inventário ou terreno, e os bônus respeitam os tetos de sempre.
import { rgb, TOTAL_ERAS, LIMITES } from "./eras_catalogo.js";

/** @typedef {import("./eras_catalogo.js").RGB} RGB */
/** @typedef {import("./eras_catalogo.js").EfeitoEra} EfeitoEra */
/**
 * @typedef {object} Evento
 * @property {string} id  "ev_01"
 * @property {string} nome
 * @property {string[]} horarios  "HH:MM" em Brasília; acontece todo dia nesses horários
 * @property {number} duracaoMin
 * @property {string} anuncio  frase de quando começa
 * @property {string} fim  frase de quando acaba
 * @property {{ cor: string, inicio: number, fim: number }} fog  neblina durante o acontecimento (vira vulpus:era_NN_ev)
 * @property {{ id: string, cor?: RGB, n: number, raio: number, alturaMin: number, alturaMax: number, aoLonge?: boolean }[]} particulas
 * @property {{ id: string, volume: number, pitch: number } | undefined} [som]  tocado de tempos em tempos enquanto dura
 * @property {{ chance: number, cor: RGB } | undefined} [flash]  piscada de tela (chance por segundo)
 * @property {EfeitoEra[]} [efeitos]  efeitos de poção para todos enquanto dura
 * @property {number} [xp]  multiplicador de XP
 * @property {number} [colheitaX]  multiplica a chance do prêmio de colheita (o teto diário continua)
 * @property {number} [minerioX]  multiplica a chance do prêmio de minério
 * @property {number} [abateX]  multiplica as Caudas do prêmio de abate
 */

const DIA_MS = 24 * 60 * 60 * 1000;
const FUSO_MS = -3 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/** @typedef {import("./eras_catalogo.js").Condicao} Condicao_ */
/** @type {Condicao_[]} */
const SEMPRE = ["sempre"];

/** @param {string} efeito @param {number} [nivel] @param {Condicao_[]} [quando] @returns {EfeitoEra} */
const buff = (efeito, nivel = 0, quando = SEMPRE) => ({ efeito, nivel, quando, tipo: "buff" });

/** @type {readonly (readonly Evento[])[]} índice = número da Era - 1 */
export const EVENTOS = Object.freeze([
  [{
    id: "ev_01", nome: "Revoada de Vagalumes", horarios: ["12:00", "19:00"], duracaoMin: 5,
    anuncio: "Uma revoada de vagalumes dourados atravessa a floresta!", fim: "Os vagalumes voltaram a dormir.",
    fog: { cor: "#f3e2a0", inicio: 14, fim: 60 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffd36b"), n: 3, raio: 8, alturaMin: 0.5, alturaMax: 4 }],
    som: { id: "vulpus.p_passaro_1", volume: 0.7, pitch: 1.1 },
    efeitos: [buff("regeneration")], xp: 1.5,
  }],
  [{
    id: "ev_02", nome: "Ventania de Folhas", horarios: ["11:00", "18:00"], duracaoMin: 5,
    anuncio: "Uma ventania de folhas cobre a colheita: os campos rendem muito mais!", fim: "A ventania passou.",
    fog: { cor: "#b8864f", inicio: 10, fim: 46 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#c4762f"), n: 3, raio: 8, alturaMin: 1, alturaMax: 5 }],
    som: { id: "vulpus.p_vento_rajada_1", volume: 0.7, pitch: 1 },
    colheitaX: 3,
  }],
  [{
    id: "ev_03", nome: "Procissão de Lanternas", horarios: ["20:00", "22:30"], duracaoMin: 6,
    anuncio: "Lanternas douradas desfilam ao longe. Siga a luz!", fim: "As lanternas se apagaram, uma a uma.",
    fog: { cor: "#1a2a55", inicio: 8, fim: 40 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffcf5e"), n: 3, raio: 20, alturaMin: 0.5, alturaMax: 3, aoLonge: true }],
    som: { id: "vulpus.p_flauta_distante_1", volume: 0.5, pitch: 1 },
    efeitos: [buff("speed")], xp: 1.3,
  }],
  [{
    id: "ev_04", nome: "Nevasca Silenciosa", horarios: ["10:00", "20:00"], duracaoMin: 5,
    anuncio: "A nevasca fecha o mundo em branco. Quem está abrigado trabalha mais depressa.", fim: "A nevasca cedeu.",
    fog: { cor: "#f4f8fc", inicio: 6, fim: 26 },
    particulas: [{ id: "minecraft:snowflake_particle", n: 4, raio: 8, alturaMin: 2, alturaMax: 6 }],
    som: { id: "vulpus.p_vento_rajada_3", volume: 0.5, pitch: 0.9 },
    efeitos: [buff("haste", 0, ["teto"])], xp: 1.3,
  }],
  [{
    id: "ev_05", nome: "Chuva de Pétalas", horarios: ["15:00", "21:00"], duracaoMin: 5,
    anuncio: "Chove pétalas por toda parte. Tudo floresce mais uma vez!", fim: "As últimas pétalas tocaram o chão.",
    fog: { cor: "#f7d4de", inicio: 12, fim: 60 },
    particulas: [{ id: "minecraft:cherry_leaves_particle", n: 4, raio: 8, alturaMin: 2, alturaMax: 7 }],
    som: { id: "vulpus.p_sino_suave_2", volume: 0.5, pitch: 1 },
    efeitos: [buff("regeneration")], colheitaX: 2,
  }],
  [{
    id: "ev_06", nome: "Maré Onírica", horarios: ["21:00", "23:30"], duracaoMin: 6,
    anuncio: "A maré dos sonhos sobe. Você está mais leve que o ar.", fim: "A maré baixou.",
    fog: { cor: "#dfe6f7", inicio: 6, fim: 30 },
    particulas: [{ id: "minecraft:endrod", n: 3, raio: 8, alturaMin: 0.5, alturaMax: 5 }],
    som: { id: "vulpus.p_ding_suave", volume: 0.5, pitch: 0.8 },
    efeitos: [buff("slow_falling"), buff("jump_boost")],
  }],
  [{
    id: "ev_07", nome: "Floração Impossível", horarios: ["13:00", "19:30"], duracaoMin: 5,
    anuncio: "O jardim floresce de um jeito impossível. Aproveite o brilho!", fim: "O jardim voltou ao normal (ou quase).",
    fog: { cor: "#d9c7f2", inicio: 10, fim: 44 },
    particulas: [
      { id: "minecraft:villager_happy", n: 3, raio: 8, alturaMin: 0.3, alturaMax: 4 },
      { id: "minecraft:colored_flame_particle", cor: rgb("#c9a8f0"), n: 2, raio: 8, alturaMin: 0.5, alturaMax: 4 },
    ],
    som: { id: "vulpus.p_sino_suave_3", volume: 0.5, pitch: 1.2 },
    xp: 1.6,
  }],
  [{
    id: "ev_08", nome: "Olhos na Mata", horarios: ["21:30", "00:30"], duracaoMin: 5,
    anuncio: "A neblina fecha e há olhos dourados entre as árvores. Corajosos são premiados!", fim: "Os olhos sumiram na mata.",
    fog: { cor: "#173838", inicio: 5, fim: 26 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#d4b15a"), n: 3, raio: 20, alturaMin: 1, alturaMax: 3, aoLonge: true }],
    som: { id: "vulpus.p_passos_distantes_1", volume: 0.6, pitch: 1 },
    abateX: 2,
  }],
  [{
    id: "ev_09", nome: "Apagão do Corredor", horarios: ["14:00", "22:00"], duracaoMin: 4,
    anuncio: "As lâmpadas do corredor falham, uma depois da outra. Corra!", fim: "A luz voltou.",
    fog: { cor: "#e4e8ee", inicio: 4, fim: 20 },
    particulas: [],
    som: { id: "vulpus.p_lampada_falhando_1", volume: 0.6, pitch: 1 },
    flash: { chance: 0.05, cor: rgb("#ffffff") },
    efeitos: [buff("speed")],
  }],
  [{
    id: "ev_10", nome: "A Ligação Atende", horarios: ["18:00", "23:00"], duracaoMin: 5,
    anuncio: "O telefone do campo de trigo toca. Atenda: a memória vale em dobro!", fim: "A ligação caiu.",
    fog: { cor: "#e0cd90", inicio: 8, fim: 34 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#e6c673"), n: 3, raio: 8, alturaMin: 0.3, alturaMax: 3.5 }],
    som: { id: "vulpus.ligacao", volume: 0.5, pitch: 1 },
    xp: 2,
  }],
  [{
    id: "ev_11", nome: "Poeira do Esquecimento", horarios: ["12:30", "20:30"], duracaoMin: 5,
    anuncio: "Poeira antiga sobe do chão e revela veios que ninguém lembrava. Os minérios rendem mais!", fim: "A poeira assentou.",
    fog: { cor: "#9a9c94", inicio: 5, fim: 24 },
    particulas: [{ id: "minecraft:basic_smoke_particle", n: 3, raio: 8, alturaMin: 0.3, alturaMax: 3 }],
    som: { id: "vulpus.p_rangido_madeira_2", volume: 0.6, pitch: 0.8 },
    minerioX: 2.5,
  }],
  [{
    id: "ev_12", nome: "A Lua Rubra no Alto", horarios: ["22:00", "01:00"], duracaoMin: 6,
    anuncio: "A lua rubra chega ao topo. Quem caça agora é recompensado em dobro!", fim: "A lua rubra desce.",
    fog: { cor: "#4d0f16", inicio: 4, fim: 22 },
    particulas: [
      { id: "minecraft:lava_particle", n: 2, raio: 7, alturaMin: 0.3, alturaMax: 2.5 },
      { id: "minecraft:redstone_ore_dust_particle", n: 3, raio: 8, alturaMin: 0.5, alturaMax: 4 },
    ],
    som: { id: "vulpus.p_dark_ambience_ambience_4", volume: 0.6, pitch: 0.8 },
    efeitos: [buff("haste")], abateX: 2,
  }],
  [{
    id: "ev_13", nome: "Surto de Instabilidade", horarios: ["16:00", "21:00"], duracaoMin: 4,
    anuncio: "A realidade falha por um momento. Nada vai te machucar: aproveite o pico!", fim: "A realidade se firmou.",
    fog: { cor: "#101012", inicio: 3, fim: 24 },
    particulas: [{ id: "minecraft:basic_crit_particle", n: 3, raio: 8, alturaMin: 0.5, alturaMax: 4 }],
    som: { id: "vulpus.p_lampada_falhando_2", volume: 0.6, pitch: 0.6 },
    flash: { chance: 0.06, cor: rgb("#f5f5f5") },
    xp: 2,
  }],
  [{
    id: "ev_14", nome: "Trem Sem Maquinista", horarios: ["17:00", "22:00"], duracaoMin: 5,
    anuncio: "Um apito de trem soa na vila vazia. Ninguém conduz, mas o caminho ficou mais rápido.", fim: "O trem seguiu viagem.",
    fog: { cor: "#8da0b5", inicio: 8, fim: 38 },
    particulas: [{ id: "minecraft:white_smoke_particle", n: 2, raio: 8, alturaMin: 0.5, alturaMax: 3 }],
    som: { id: "vulpus.p_apito_de_trem_distante", volume: 0.6, pitch: 1 },
    efeitos: [buff("speed")], xp: 1.3,
  }],
  [{
    id: "ev_15", nome: "Vagalumes da Flor Dourada", horarios: ["19:00", "23:00"], duracaoMin: 5,
    anuncio: "Pontinhos dourados cercam você. Alguém deixou um presente: colheita e minério rendem mais!", fim: "Os pontinhos se apagaram.",
    fog: { cor: "#10120d", inicio: 5, fim: 24 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffd34d"), n: 4, raio: 6, alturaMin: 0.3, alturaMax: 3 }],
    som: { id: "vulpus.p_flauta_distante_2", volume: 0.5, pitch: 1.3 },
    colheitaX: 2, minerioX: 2,
  }],
  [{
    id: "ev_16", nome: "O Silêncio Absoluto", horarios: ["12:00", "21:00"], duracaoMin: 4,
    anuncio: "Tudo silencia. Nada acontece, de propósito. Respire.", fim: "O som voltou.",
    fog: { cor: "#ffffff", inicio: 4, fim: 18 },
    particulas: [],
    efeitos: [buff("saturation"), buff("regeneration")],
  }],
  [{
    id: "ev_17", nome: "Maré de Estrelas Apagadas", horarios: ["22:00", "02:00"], duracaoMin: 6,
    anuncio: "Luzes de prata sobem do escuro como estrelas que o mar guardou.", fim: "O mar engoliu as luzes de novo.",
    fog: { cor: "#050c20", inicio: 4, fim: 24 },
    particulas: [{ id: "minecraft:endrod", n: 4, raio: 8, alturaMin: 0.3, alturaMax: 6 }],
    som: { id: "vulpus.p_gota_agua_2", volume: 0.6, pitch: 0.8 },
    efeitos: [buff("water_breathing", 0, ["agua"]), buff("dolphins_grace", 0, ["agua"]), buff("jump_boost")],
  }],
  [{
    id: "ev_18", nome: "O Véu Treme", horarios: ["20:00", "23:00"], duracaoMin: 4,
    anuncio: "O véu treme e deixa passar clarões dourados. Quem aproveita aprende mais!", fim: "O véu se firmou outra vez.",
    fog: { cor: "#1a1608", inicio: 4, fim: 24 },
    particulas: [{ id: "minecraft:colored_flame_particle", cor: rgb("#ffcc33"), n: 4, raio: 8, alturaMin: 0.3, alturaMax: 5 }],
    som: { id: "vulpus.p_sino_feira_1", volume: 0.5, pitch: 0.5 },
    flash: { chance: 0.05, cor: rgb("#d4af37") },
    efeitos: [buff("haste")], xp: 1.6,
  }],
  [{
    id: "ev_19", nome: "Lembranças em Coro", horarios: ["19:00", "23:00"], duracaoMin: 6,
    anuncio: "Fragmentos de todas as Eras cantam juntos. A toca se lembra de você.", fim: "O coro se calou.",
    fog: { cor: "#26396a", inicio: 8, fim: 40 },
    particulas: [
      { id: "minecraft:colored_flame_particle", cor: rgb("#e8a440"), n: 2, raio: 8, alturaMin: 0.5, alturaMax: 4 },
      { id: "minecraft:snowflake_particle", n: 2, raio: 8, alturaMin: 2, alturaMax: 6 },
      { id: "minecraft:endrod", n: 2, raio: 8, alturaMin: 0.5, alturaMax: 4 },
    ],
    som: { id: "vulpus.p_sino_suave_1", volume: 0.5, pitch: 0.9 },
    efeitos: [buff("regeneration")], xp: 1.5, colheitaX: 1.5,
  }],
  [{
    id: "ev_20", nome: "A Passagem", horarios: ["21:00", "00:00"], duracaoMin: 6,
    anuncio: "A passagem se abre para o outro lado do sonho. Luzes sobem, e o ciclo respira.", fim: "A passagem se fechou. Até o próximo ciclo.",
    fog: { cor: "#fff4d6", inicio: 6, fim: 30 },
    particulas: [
      { id: "minecraft:endrod", n: 4, raio: 8, alturaMin: 0.3, alturaMax: 7 },
      { id: "minecraft:colored_flame_particle", cor: rgb("#fbeec0"), n: 3, raio: 8, alturaMin: 0.3, alturaMax: 7 },
    ],
    som: { id: "vulpus.p_sino_suave_4", volume: 0.6, pitch: 0.9 },
    efeitos: [buff("slow_falling", 0, ["altura"]), buff("regeneration")], xp: 2,
  }],
]);

/** Eventos de uma Era (1 a 20). @param {number} numero @returns {readonly Evento[]} */
export const eventosDe = (numero) => EVENTOS[numero - 1] ?? [];

/** "21:30" -> minutos desde a meia-noite, ou -1. @param {string} h */
function minutosDoDia(h) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(h);
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

/**
 * Início (ms) do dia de Brasília que contém `agora`.
 * @param {number} agora
 */
const inicioDoDia = (agora) => Math.floor((agora + FUSO_MS) / DIA_MS) * DIA_MS - FUSO_MS;

/**
 * O acontecimento da Era que está valendo agora (se algum): olha os horários de hoje e de ontem (os que passam da meia-noite).
 * @param {number} numero  Era
 * @param {number} [agora]
 * @returns {{ evento: Evento, inicio: number, restanteSeg: number } | undefined}
 */
export function eventoAtivo(numero, agora = Date.now()) {
  const hoje = inicioDoDia(agora);
  for (const evento of eventosDe(numero)) {
    for (const h of evento.horarios) {
      const minuto = minutosDoDia(h);
      if (minuto < 0) continue;
      for (const dia of [0, -1]) {
        const inicio = hoje + dia * DIA_MS + minuto * MIN_MS;
        const fim = inicio + evento.duracaoMin * MIN_MS;
        if (agora >= inicio && agora < fim) return { evento, inicio, restanteSeg: Math.ceil((fim - agora) / 1000) };
      }
    }
  }
  return undefined;
}

/**
 * Quando começa o próximo acontecimento da Era (ms), contando de `agora`.
 * @param {number} numero
 * @param {number} [agora]
 * @returns {{ evento: Evento, inicio: number } | undefined}
 */
export function proximoEvento(numero, agora = Date.now()) {
  const hoje = inicioDoDia(agora);
  /** @type {{ evento: Evento, inicio: number } | undefined} */
  let melhor;
  for (const evento of eventosDe(numero)) {
    for (const h of evento.horarios) {
      const minuto = minutosDoDia(h);
      if (minuto < 0) continue;
      for (const dia of [0, 1]) {
        const inicio = hoje + dia * DIA_MS + minuto * MIN_MS;
        if (inicio > agora && (!melhor || inicio < melhor.inicio)) melhor = { evento, inicio };
      }
    }
  }
  return melhor;
}

const EFEITOS_PERMITIDOS = new Set([
  "regeneration", "speed", "haste", "jump_boost", "slow_falling", "water_breathing", "dolphins_grace", "saturation",
]);
const SOM = /^vulpus\.[a-z0-9_]+$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Limites dos acontecimentos (mais curtos que a Era, então a neblina pode fechar um pouco mais). */
export const LIMITES_EVENTO = Object.freeze({ fogFimMin: 18, duracaoMin: 3, duracaoMax: 10, mult: 3, chanceX: 3 });

/**
 * Confere os 20 acontecimentos: um por Era, horários válidos, nomes únicos, neblina jogável, efeitos permitidos e bônus nos limites.
 * @param {readonly (readonly Evento[])[]} [lista]
 * @returns {string[]}
 */
export function validarEventos(lista = EVENTOS) {
  /** @type {string[]} */
  const problemas = [];
  if (lista.length !== TOTAL_ERAS) problemas.push(`acontecimentos: ${lista.length} Eras (precisa de ${TOTAL_ERAS})`);
  const nomes = new Set();
  const ids = new Set();
  lista.forEach((eventos, i) => {
    const onde = `Era ${i + 1}`;
    if (eventos.length === 0) problemas.push(`${onde}: sem acontecimento`);
    for (const e of eventos) {
      if (!e.nome || !e.anuncio || !e.fim) problemas.push(`${onde}: acontecimento sem nome ou texto`);
      if (ids.has(e.id)) problemas.push(`${onde}: id de acontecimento repetido (${e.id})`);
      ids.add(e.id);
      if (nomes.has(e.nome)) problemas.push(`${onde}: nome de acontecimento repetido (${e.nome})`);
      nomes.add(e.nome);
      if (e.id !== `ev_${String(i + 1).padStart(2, "0")}` && eventos.length === 1) problemas.push(`${onde}: id "${e.id}" inesperado`);
      if (!Array.isArray(e.horarios) || e.horarios.length === 0 || !e.horarios.every((h) => minutosDoDia(h) >= 0)) problemas.push(`${onde}: horários inválidos`);
      if (!(e.duracaoMin >= LIMITES_EVENTO.duracaoMin && e.duracaoMin <= LIMITES_EVENTO.duracaoMax)) problemas.push(`${onde}: duração fora de ${LIMITES_EVENTO.duracaoMin} a ${LIMITES_EVENTO.duracaoMax} min`);
      if (!HEX.test(e.fog?.cor ?? "") || !(e.fog.fim > e.fog.inicio) || e.fog.fim < LIMITES_EVENTO.fogFimMin) problemas.push(`${onde}: neblina do acontecimento inválida ou fechada demais`);
      for (const p of e.particulas) {
        if (!/^minecraft:[a-z_]+$/.test(p.id) || !(p.n > 0 && p.n <= 5) || !(p.raio > 0 && p.raio <= 24) || p.alturaMax < p.alturaMin) problemas.push(`${onde}: partícula ${p.id} fora do limite`);
      }
      if (e.som && (!SOM.test(e.som.id) || !(e.som.volume > 0 && e.som.volume <= 1) || !(e.som.pitch >= 0.5 && e.som.pitch <= 2))) problemas.push(`${onde}: som do acontecimento inválido`);
      if (e.flash && !(e.flash.chance > 0 && e.flash.chance <= 0.08)) problemas.push(`${onde}: piscada acima de 8% por segundo`);
      for (const f of e.efeitos ?? []) {
        if (!EFEITOS_PERMITIDOS.has(f.efeito) || f.tipo !== "buff" || !(f.nivel >= 0 && f.nivel <= LIMITES.nivelMax)) problemas.push(`${onde}: efeito ${f.efeito} não permitido no acontecimento`);
      }
      if (e.xp !== undefined && !(e.xp >= 1 && e.xp <= LIMITES_EVENTO.mult)) problemas.push(`${onde}: XP do acontecimento fora de 1 a ${LIMITES_EVENTO.mult}`);
      for (const k of /** @type {const} */ (["colheitaX", "minerioX", "abateX"])) {
        const v = e[k];
        if (v !== undefined && !(v >= 1 && v <= LIMITES_EVENTO.chanceX)) problemas.push(`${onde}: ${k} fora de 1 a ${LIMITES_EVENTO.chanceX}`);
      }
      const temBonus = (e.efeitos?.length ?? 0) > 0 || e.xp || e.colheitaX || e.minerioX || e.abateX;
      if (!temBonus) problemas.push(`${onde}: acontecimento sem bônus`);
    }
  });
  return problemas;
}
