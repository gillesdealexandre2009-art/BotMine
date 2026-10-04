// @ts-check
// Temas de cor (cosméticos): cores sólidas e degradês letra a letra com códigos §. Usados no nome dos
// Kitsunes e na tag/nome dos clãs. O pack do chat tem uma cópia desta tabela e de pintar()
// (vulpus_chat_bp/scripts/formato.js): mudou aqui, mude lá também (o teste teste_clas.mjs compara).

/**
 * cores: códigos § sem o §; modo "degrade" espalha as cores pelo texto, "ciclo" alterna letra a letra.
 * @typedef {{ nome: string, cores: string[], modo: "degrade" | "ciclo" }} TemaCor
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
  ametista: { nome: "Ametista", cores: ["d", "5"], modo: "degrade" },
  lunar: { nome: "Lunar", cores: ["f", "7", "b"], modo: "degrade" },
  brasa: { nome: "Brasa", cores: ["6", "c", "4"], modo: "degrade" },
});

/**
 * @param {unknown} id
 * @returns {id is string} se é um tema que existe
 */
export function temaValido(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(TEMAS_COR, id);
}

/**
 * Pinta o texto com o tema (sem §r no fim). Tema desconhecido: devolve undefined.
 * @param {string} texto
 * @param {string} temaId
 * @returns {string | undefined}
 */
export function pintar(texto, temaId) {
  if (!temaValido(temaId)) return undefined;
  const { cores, modo } = TEMAS_COR[temaId];
  const letras = [...texto];
  let saida = "";
  let anterior = "";
  letras.forEach((letra, i) => {
    const cor = modo === "ciclo" ? cores[i % cores.length] : cores[Math.min(cores.length - 1, Math.floor((i * cores.length) / letras.length))];
    if (cor !== anterior) saida += `§${cor}`;
    anterior = cor;
    saida += letra;
  });
  return saida;
}
