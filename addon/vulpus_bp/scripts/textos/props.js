// @ts-check
// Textos dos props da feira (decoração) e da Varinha da Feira.

/** Modelos de prop, na ordem de vulpus:modelo (gerados por tools/gerar_props.py). */
export { INDICE_PRIMEIRO_VIVO, MODELOS } from "./props_modelos.js";

export const NOME_VARINHA = "§6Varinha da Feira";
export const LORE_VARINHA = [
  "§7Clique num bloco: põe o prop escolhido ali",
  "§7Bata num prop: ele some",
  "§7Clique num prop: gira 45 graus",
  "§7Agachada + clique no ar: troca o modelo",
  "§8Só para a staff",
];

export const TITULO_STAFF = "Props da feira (staff)";
export const BOTAO_STAFF = "Props e decoração";
export const BOTAO_VARINHA = "Pegar a Varinha da Feira";
/** @param {string} nome */
export const BOTAO_MODELO = (nome) => `Modelo da varinha: ${nome}`;
export const BOTAO_POR_OLHANDO = "Pôr o modelo onde estou olhando";
export const ROTULO_MODELO = "Qual prop a varinha põe?";
export const BOTAO_TROCAR_PERTO = "Trocar o prop mais próximo pelo modelo da varinha";
/** @param {string} nome */
export const TROCADO = (nome) => `§aProp trocado por §e${nome}§a.`;
export const BOTAO_GIRAR ="Girar o prop mais próximo (45°)";
export const BOTAO_REMOVER_PERTO = "Remover o prop mais próximo";
export const BOTAO_REMOVER_TODOS = "Remover todos os props";
export const CONFIRMAR_TODOS = "Remover TODOS os props da feira?";

export const VARINHA_DADA = "§aVarinha da Feira no seu inventário. Clique num bloco para pôr o prop, bata num prop para tirar.";
export const VARINHA_JA_TEM = "Você já tem a Varinha da Feira no inventário.";
export const SEM_ESPACO = "Inventário cheio: libere um espaço para a varinha.";
/** @param {string} nome */
export const MODELO_ATUAL = (nome) => `§6Varinha §8» §7modelo: §e${nome}`;
/** @param {string} nome @param {string} onde */
export const POSTO = (nome, onde) => `§a${nome} posto em §e${onde}§a.`;
/** @param {number} max */
export const LIMITE = (max) => `Já existem ${max} props, o máximo. Remova algum antes.`;
export const NENHUM_PERTO = "Nenhum prop a até 5 blocos de você.";
export const GIRADO = "§aProp girado.";
export const REMOVIDO = "§aProp removido.";
export const TODOS_REMOVIDOS = "§aTodos os props foram removidos.";
export const SO_TOPO_E_LADOS = "A varinha põe props no topo ou nos lados de um bloco, não embaixo.";
/** @param {number} n */
export const CORPO_STAFF = (n) =>
  [
    "§7Decoração de verdade para a feira: moedas, sacos, placas de cada barraca, rede, boia, caixote de peixes, aljava, alvo, martelo, lenha, lanterna, raposa de pelúcia, banco e barril.",
    "§7Decoração de praia e lago: guarda-sóis, espreguiçadeira, castelo de areia, prancha, barquinho, bola, toalha, estrela-do-mar, lírio d'água, sapo e lanterna flutuante.",
    "§7Criaturas animadas (no fim da lista de modelos): caranguejo, cardume de carpas, vaga-lumes, sapo, lírio, lanterna e gaivotas.",
    "§7Pegue a Varinha da Feira: clique num bloco e o prop nasce exatamente ali; bata nele para tirar.",
    "",
    `§fProps na feira: §e${n}`,
  ].join("\n");
