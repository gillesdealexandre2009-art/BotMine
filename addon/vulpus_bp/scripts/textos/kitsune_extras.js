// @ts-check
// Textos dos mimos extras do selo Kitsune: efeito de chegada e saída, looks salvos e cor da mensagem. Tudo só visual.

export const SO_KITSUNE = "Isso é mimo do selo Kitsune.";

// ---------------------------------------------------------------- chegada e saída
/** @param {boolean} ligado */
export const BOTAO_CHEGADA = (ligado) => `Efeito de chegada e saída: ${ligado ? "§aligado" : "§cdesligado"}`;
/** @param {boolean} ligado */
export const CHEGADA_MUDOU = (ligado) => (ligado ? "Seu efeito de chegada e saída está ligado." : "Seu efeito de chegada e saída está desligado.");
/** Frases de chegada e de saída no chat (o nome já vem pintado com o tema da pessoa). @type {((nome: string) => string)[]} */
export const FRASES_CHEGADA = [
  (n) => `§d✦ §7A raposa ${n} §7chegou na toca! §d✦`,
  (n) => `§6🦊 §7Uma cauda brilhante surgiu: ${n} §7entrou!`,
  (n) => `§b✧ §7${n} §7apareceu entre as pétalas. Bem-vinda(o)! §b✧`,
  (n) => `§e☄ §7O luar trouxe ${n} §7de volta à Vulpus!`,
];
/** @type {((nome: string) => string)[]} */
export const FRASES_SAIDA = [
  (n) => `§d✦ §7${n} §7voltou para a toca. Até já! §d✦`,
  (n) => `§6🦊 §7${n} §7sumiu num brilho de luar.`,
  (n) => `§b✧ §7As pétalas levaram ${n} §7embora. Volte logo! §b✧`,
];
export const CHEGADA_SEM_SERVIDOR = "§7(A staff desligou esses efeitos por enquanto; sua escolha fica guardada.)";

// ---------------------------------------------------------------- looks
export const BOTAO_LOOKS = "Meus looks";
export const TITULO_LOOKS = "Meus looks";
/** @param {number} max */
export const CORPO_LOOKS = (max) =>
  `§7Guarde até ${max} looks (apelido + cor do nome) e troque com um toque.\n§7Ao aplicar valem as mesmas regras do apelido: nada de imitar outra pessoa ou cargo.`;
/** @param {number} n */
export const BOTAO_LOOK_VAZIO = (n) => `Espaço ${n}: vazio\n§7toque para salvar seu visual atual`;
/** @param {number} n @param {string} pintado @param {string} tema */
export const BOTAO_LOOK = (n, pintado, tema) => `Espaço ${n}: ${pintado}§r\n§7${tema || "sem cor"}`;
/** @param {number} n */
export const TITULO_LOOK = (n) => `Look ${n}`;
/** @param {string} pintado @param {string} apelido @param {string} tema */
export const CORPO_LOOK = (pintado, apelido, tema) => `§7Nome: ${pintado}§r\n§7Apelido: §f${apelido || "(nome da conta)"}\n§7Cor: §f${tema || "nenhuma"}`;
export const BOTAO_APLICAR = "Aplicar este look";
export const BOTAO_SOBRESCREVER = "Guardar meu visual atual aqui";
export const BOTAO_APAGAR = "Apagar este look";
/** @param {number} n */
export const LOOK_SALVO = (n) => `Look salvo no espaço ${n}.`;
export const LOOK_PADRAO = "Seu visual atual é o padrão (sem apelido nem cor): não tem o que guardar.";
/** @param {number} n */
export const LOOK_APAGADO = (n) => `Look do espaço ${n} apagado.`;
/** @param {string} exibido */
export const LOOK_APLICADO = (exibido) => `Look aplicado! Agora você aparece como ${exibido}.`;
export const LOOK_TEMA_INDISPONIVEL = "A cor desse look não está mais disponível para você. Escolha outra e guarde de novo.";
export const LOOK_VAZIO = "Esse espaço está vazio.";
export const CONFIRMAR_APAGAR = "Apagar este look?";
export const LOOKS_SEM_SELO = "§7Seus looks continuam guardados, mas só voltam a valer com o selo Kitsune.";

// ---------------------------------------------------------------- cor da mensagem
export const BOTAO_COR_MSG = (/** @type {string} */ atual) => `Cor da mensagem no chat\n§7${atual || "branco (padrão)"}`;
export const TITULO_COR_MSG = "Cor da mensagem";
export const CORPO_COR_MSG = "§7Escolha uma das 8 cores para o texto que você escreve no chat. Só muda a cor: no Discord a mensagem sai normal.";
/** @param {string} cor @param {string} nome @param {boolean} atual */
export const BOTAO_COR_ITEM = (cor, nome, atual) => `§${cor}${nome}§r${atual ? " §a✔" : ""}\n§${cor}Olá, toca!`;
/** @param {boolean} atual */
export const BOTAO_COR_PADRAO = (atual) => `Branco (padrão)${atual ? " §a✔" : ""}`;
/** @param {string} nome */
export const COR_MSG_OK = (nome) => `Cor da mensagem: ${nome}.`;
export const COR_MSG_TIRADA = "Mensagem de volta ao branco.";

/** Nomes das 8 cores da mensagem (código §). */
export const NOMES_COR_MSG = Object.freeze({
  b: "Ciano",
  a: "Verde",
  e: "Amarelo",
  d: "Rosa",
  c: "Vermelho claro",
  6: "Dourado",
  9: "Azul",
  3: "Água",
});

// ---------------------------------------------------------------- pet de vitrine (o menu em si fica em textos/pets.js)
/** @param {string} atual */
export const BOTAO_VITRINE = (atual) => `Pet de vitrine\n§7${atual || "nenhum"}`;
