// @ts-check
// Temas de cor (cosméticos): cores sólidas e degradês letra a letra com códigos §. Usados no nome dos
// Kitsunes e na tag/nome dos clãs. O pack do chat tem uma cópia desta tabela e de pintar()
// (vulpus_chat_bp/scripts/formato.js): mudou aqui, mude lá também (o teste teste_clas.mjs compara).

/**
 * cores: códigos § sem o §; modo "degrade" espalha as cores pelo texto, "ciclo" alterna letra a letra e "onda" é um
 * ciclo que anda com o tempo (o parâmetro fase de pintar; o nameTag é redesenhado a cada instante).
 * grupo: "animado" (Kitsune nível 20) ou "evento" (desbloqueado por um evento); sem grupo = Kitsune comum.
 * oculto: continua valendo para quem já tem, mas não aparece mais nas listas (era quase igual a outro).
 * @typedef {{ nome: string, cores: string[], modo: "degrade" | "ciclo" | "onda", grupo?: "animado" | "evento", oculto?: boolean }} TemaCor
 */

/** @type {Readonly<Record<string, Readonly<TemaCor>>>} */
export const TEMAS_COR = Object.freeze({
  rosa: { nome: "Rosa", cores: ["d"], modo: "degrade" },
  ciano: { nome: "Ciano", cores: ["b"], modo: "degrade" },
  verde: { nome: "Verde", cores: ["a"], modo: "degrade" },
  amarelo: { nome: "Amarelo", cores: ["e"], modo: "degrade" },
  vermelho: { nome: "Vermelho", cores: ["c"], modo: "degrade" },
  roxo: { nome: "Roxo", cores: ["5"], modo: "degrade" },
  pordosol: { nome: "Pôr do sol", cores: ["e", "6", "c", "d"], modo: "degrade" },
  oceano: { nome: "Oceano", cores: ["b", "3", "9"], modo: "degrade" },
  sakura: { nome: "Sakura", cores: ["f", "d", "5"], modo: "degrade" },
  lava: { nome: "Lava", cores: ["e", "6", "c", "4"], modo: "degrade" },
  aurora: { nome: "Aurora", cores: ["a", "b", "d"], modo: "degrade" },
  floresta: { nome: "Floresta", cores: ["a", "2"], modo: "degrade" },
  arcoiris: { nome: "Arco-íris", cores: ["c", "6", "e", "a", "b", "9", "d"], modo: "ciclo" },
  gelo: { nome: "Gelo", cores: ["f", "b", "3"], modo: "degrade" },
  ouro: { nome: "Ouro", cores: ["g", "e", "6"], modo: "degrade" },
  ametista: { nome: "Ametista", cores: ["d", "5"], modo: "degrade", oculto: true },
  lunar: { nome: "Lunar", cores: ["f", "7", "b"], modo: "degrade", oculto: true },
  brasa: { nome: "Brasa", cores: ["6", "c", "4"], modo: "degrade", oculto: true },
  // novos, só de Kitsune (cada um com uma paleta que ainda não existia)
  algodaodoce: { nome: "Algodão-doce", cores: ["d", "f", "b"], modo: "degrade" },
  menta: { nome: "Menta", cores: ["a", "f", "b"], modo: "degrade" },
  crepusculo: { nome: "Crepúsculo", cores: ["9", "5", "d", "c"], modo: "degrade" },
  cereja: { nome: "Cereja", cores: ["4", "c", "d"], modo: "degrade" },
  outono: { nome: "Outono", cores: ["g", "6", "c", "4"], modo: "degrade" },
  lagoa: { nome: "Lagoa", cores: ["3", "b", "a"], modo: "degrade" },
  // animados (Kitsune nível 20; dono usa quando quiser)
  chamaviva: { nome: "Chama viva", cores: ["e", "6", "c", "4", "c", "6"], modo: "onda", grupo: "animado" },
  ondadomar: { nome: "Onda do mar", cores: ["f", "b", "3", "9", "3", "b"], modo: "onda", grupo: "animado" },
  auroraboreal: { nome: "Aurora boreal", cores: ["a", "b", "9", "d", "9", "b"], modo: "onda", grupo: "animado" },
  galaxia: { nome: "Galáxia", cores: ["5", "d", "9", "3", "9", "d"], modo: "onda", grupo: "animado" },
  eletrico: { nome: "Elétrico", cores: ["e", "f", "b", "9", "b", "f"], modo: "onda", grupo: "animado" },
  petalas: { nome: "Pétalas ao vento", cores: ["f", "d", "5", "d", "f", "d"], modo: "onda", grupo: "animado" },
  vagalume: { nome: "Vaga-lume", cores: ["2", "a", "e", "f", "e", "a"], modo: "onda", grupo: "animado" },
  // do Evento de inauguração: do branco ao azul
  inauguracao: { nome: "Céu da inauguração", cores: ["f", "b", "3", "9"], modo: "degrade", grupo: "evento" },
});

/**
 * @param {unknown} id
 * @returns {id is string} se é um tema que existe
 */
export function temaValido(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(TEMAS_COR, id);
}

/**
 * Temas de um grupo, sem os ocultos: "comum" (sem grupo), "animado" ou "evento".
 * @param {"comum" | "animado" | "evento"} grupo
 * @returns {[string, Readonly<TemaCor>][]}
 */
export function temasDoGrupo(grupo) {
  return Object.entries(TEMAS_COR).filter(([, t]) => !t.oculto && (t.grupo ?? "comum") === grupo);
}

/**
 * Pinta o texto com o tema (sem §r no fim). Tema desconhecido: devolve undefined.
 * Temas "onda" andam: a cor da letra i é a (i + fase) do ciclo; fase 0 = parado.
 * @param {string} texto
 * @param {string} temaId
 * @param {number} [fase]
 * @returns {string | undefined}
 */
export function pintar(texto, temaId, fase = 0) {
  if (!temaValido(temaId)) return undefined;
  const { cores, modo } = TEMAS_COR[temaId];
  const letras = [...texto];
  let saida = "";
  let anterior = "";
  letras.forEach((letra, i) => {
    const cor =
      modo === "onda"
        ? cores[(((i + Math.floor(fase)) % cores.length) + cores.length) % cores.length]
        : modo === "ciclo"
          ? cores[i % cores.length]
          : cores[Math.min(cores.length - 1, Math.floor((i * cores.length) / letras.length))];
    if (cor !== anterior) saida += `§${cor}`;
    anterior = cor;
    saida += letra;
  });
  return saida;
}
