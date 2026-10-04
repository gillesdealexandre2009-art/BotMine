// @ts-check
// Textos do visual Kitsune (apelido e cor do nome). Tudo cosmético: nada de vantagem no jogo.

export const TITULO = "Visual Kitsune";
export const SEM_SELO =
  "§7Apelido e nome colorido são mimos de quem apoia a toca no Discord (selo Kitsune).\n\n" +
  "§fNão muda nada no jogo: é só visual. Quer saber mais? Pergunta para a staff!";
/**
 * @param {string} exibido  nome já pintado
 * @param {string} conta  nome da conta
 * @param {boolean} temApelido
 */
export const CORPO = (exibido, conta, temApelido) =>
  [
    `§7Seu nome aparece assim: ${exibido}`,
    ...(temApelido ? [`§7Conta: §f${conta}`] : []),
    "",
    "§7Vale no nome sobre a cabeça, no chat e no placar.",
  ].join("\n");
export const BOTAO_APELIDO = "Mudar apelido";
export const BOTAO_COR = "Cor do nome";
export const BOTAO_TIRAR = "Usar o nome da conta";
export const TITULO_APELIDO = "Apelido";
/** @param {number} min @param {number} max */
export const ROTULO_APELIDO = (min, max) => `Como você quer aparecer? (${min} a ${max} letras)`;
export const TITULO_COR = "Cor do nome";
export const COR_ESCOLHA = "§7Escolha um tema. A prévia já mostra o seu nome:";
/** @param {string} nome @param {boolean} atual */
export const BOTAO_SEM_TEMA = (nome, atual) => `§f${nome}§r §7(sem tema)${atual ? " §a✔" : ""}`;
/** @param {string} pintado @param {string} tema @param {boolean} atual */
export const BOTAO_TEMA = (pintado, tema, atual) => `${pintado}§r §7(${tema})${atual ? " §a✔" : ""}`;

export const SO_KITSUNE = "Isso é mimo do selo Kitsune. Sem o selo, o nome fica o da conta.";
/** @param {number} min @param {number} max */
export const APELIDO_TAMANHO = (min, max) => `O apelido precisa ter de ${min} a ${max} letras.`;
export const APELIDO_SIMBOLOS = "Só letras, números, espaço, ponto, traço e _.";
export const APELIDO_RESERVADO = "Esse apelido parece cargo ou nome do servidor. Escolhe outro?";
export const APELIDO_PROIBIDO = "Esse apelido não combina com a toca. Escolhe outro?";
export const APELIDO_DE_OUTRO = "Esse nome já é de outra pessoa da toca. Nada de se passar por alguém!";
/** @param {string} exibido */
export const APELIDO_OK = (exibido) => `Prontinho! Agora você aparece como ${exibido}.`;
export const APELIDO_TIRADO = "Voltou para o nome da conta.";
/** @param {string} exibido */
export const TEMA_OK = (exibido) => `Cor nova: ${exibido}.`;
/** @param {string} nome */
export const RESETOU = (nome) => `Apelido e cor de §e${nome}§r voltaram ao padrão.`;
export const RESETADO = "A staff tirou seu apelido e sua cor. Na dúvida, conversa com ela.";

export const DESC_APELIDO = "Apelido do selo Kitsune (sem nome abre o menu; tirar volta ao da conta)";
export const DESC_RESET = "Tira o apelido e a cor de alguém";
