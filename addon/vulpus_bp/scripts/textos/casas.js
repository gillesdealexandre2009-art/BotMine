// @ts-check
// Textos das casas. Os de erro já saem em §c (§e destaca e §c volta à cor).

export const TITULO = "Casas";
/**
 * @param {number} usadas
 * @param {number} limite
 */
export const CONTAGEM = (usadas, limite) => `Casas: §6${usadas}/${limite}§r`;
export const DICA_LISTA = "§7Toque numa casa para ir, mover, renomear ou apagar.";
export const NENHUMA = "Nenhuma casa ainda. Que tal marcar uma aqui?";
/**
 * Botão de uma casa (duas linhas).
 * @param {string} nome
 * @param {string} dimensao
 * @param {string} coords
 */
export const BOTAO_CASA = (nome, dimensao, coords) => `${nome}\n§7${dimensao} • ${coords}`;
export const NOVA = "Nova casa aqui";
/** @param {number} limite */
export const NO_LIMITE = (limite) => `§7Limite de ${limite} ${limite === 1 ? "casa" : "casas"} atingido. Mova ou apague uma.`;

// Uma casa
/**
 * @param {string} dimensao
 * @param {string} coords
 */
export const INFO_CASA = (dimensao, coords) => `§7${dimensao}\n§r${coords}`;
export const IR = "Ir até ela";
export const MOVER = "Mover para cá";
export const RENOMEAR = "Renomear";
export const APAGAR = "Apagar";
/** @param {string} nome */
export const CONFIRMAR_APAGAR = (nome) => `Apagar a casa §6${nome}§r? Não dá para desfazer.`;
export const SIM_APAGAR = "Apagar";
export const NAO_APAGAR = "Deixa quieta";

// Formulários
export const FORM_NOVA = "Nova casa";
export const FORM_RENOMEAR = "Renomear casa";
export const CAMPO_NOME = "Nome da casa";
/** @param {number} max */
export const DICA_NOME = (max) => `até ${max} caracteres`;
/** @param {number} n */
export const NOME_PADRAO = (n) => `Casa ${n}`;

// Erros
export const NOME_VAZIO = "Toda casa precisa de um nome!";
/** @param {number} max */
export const NOME_LONGO = (max) => `Nome comprido demais: até §e${max}§c caracteres.`;
export const NOME_COM_SECAO = "O símbolo § não pode ir no nome.";
/** @param {string} nome */
export const NOME_REPETIDO = (nome) => `Você já tem uma casa chamada §e${nome}§c.`;
/** @param {number} limite */
export const LIMITE = (limite) => `Limite de §e${limite}§c ${limite === 1 ? "casa" : "casas"} atingido. Mova ou apague uma.`;
/** @param {string} nome */
export const NAO_EXISTE = (nome) => `Não achei a casa §e${nome}§c.`;
/** @param {string} lista */
export const SUAS_CASAS = (lista) => `§7Suas casas: ${lista}`;
export const SEM_CASAS = "Você ainda não tem casas. Use §e/vulpus:definircasa <nome>§c ou o menu.";

// Sucesso
/** @param {string} nome */
export const CRIADA = (nome) => `§aCasa §6${nome}§a marcada aqui!`;
/** @param {string} nome */
export const MOVIDA = (nome) => `§aA casa §6${nome}§a agora fica aqui.`;
/**
 * @param {string} antigo
 * @param {string} novo
 */
export const RENOMEADA = (antigo, novo) => `§a§6${antigo}§a agora se chama §6${novo}§a.`;
/** @param {string} nome */
export const APAGADA = (nome) => `§aCasa §6${nome}§a apagada.`;

export const CMD_CASA = "Vai para uma casa (sem nome, abre o menu de casas)";
export const CMD_DEFINIRCASA = "Marca (ou move) uma casa onde você está";
export const CMD_APAGARCASA = "Apaga uma das suas casas";
