// @ts-check
// Conquistas (selos de perfil). Cada uma tem um id curto (guardado no jogador) e o texto que aparece.

/** @type {Readonly<Record<string, { nome: string, cor: string }>>} */
export const CONQUISTAS = Object.freeze({
  cheguedo: { nome: "Chegou cedo hein!", cor: "§b" },
  branco: { nome: "Desperto no Branco", cor: "§f" },
  hollow: { nome: "O Último Outono", cor: "§6" },
  // Ecos dos Ausentes: o mesmo selo, com o título mudando pela escolha final (soltar, guardar ou lutar).
  ecos_soltar: { nome: "Ecos dos Ausentes: Descanso", cor: "§b" },
  ecos_guardar: { nome: "Ecos dos Ausentes: Memória", cor: "§d" },
  ecos_lutar: { nome: "Ecos dos Ausentes: Vigília", cor: "§c" },
  passos: { nome: "Raposinha Esperta", cor: "§6" },
});

/** @param {string} id */
export const NOME_CONQUISTA = (id) => (CONQUISTAS[id] ? `${CONQUISTAS[id].cor}[${CONQUISTAS[id].nome}]` : "");
/** @param {string} nome */
export const CONQUISTA_NOVA = (nome) => `§6Nova conquista: ${nome}§6!`;
