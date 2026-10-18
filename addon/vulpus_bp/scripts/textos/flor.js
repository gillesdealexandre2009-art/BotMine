// @ts-check
// Textos da flor dourada (a que enfeita a entrada da casa do mistério): as falas padrão e o jeito de escrevê-las.

/** Separador das falas na configuração (florFalas). */
export const SEPARADOR_FALAS = "|";

/** Estilo das falas que a staff escreve sem cor: dourado e itálico. */
export const ESTILO_FALA = "§6§o";

/** Falas padrão, sombrias e doces, sobre lembrança (o mesmo texto que vai em PADROES.florFalas). */
export const FALAS_PADRAO = [
  "§6§o...ela deixou uma flor para você achar o caminho.",
  "§6§o...você lembra de mim?",
  "§6§o...ainda está quente. alguém passou por aqui.",
  "§6§o...não olhe para trás. siga a luz.",
];

/** @param {readonly string[]} falas */
export const juntarFalas = (falas) => falas.join(` ${SEPARADOR_FALAS} `);
