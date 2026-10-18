// @ts-check
// Textos dos primeiros passos (missões de apresentação para quem acabou de chegar).

export const CMD_COMECAR = "Mostra os seus primeiros passos na Vulpus, com missões e recompensas";

/** Missões na ordem em que fazem sentido. A posição vira o bit guardado no jogador. */
export const MISSOES = Object.freeze([
  { id: "menu", nome: "Abrir o Menu do Vulpus", dica: "Segure o §6Menu do Vulpus §7(o item que veio no inventário) e use. Dele sai tudo." },
  { id: "diaria", nome: "Resgatar a diária", dica: "No menu, abra §6Caudas §7e resgate a §6recompensa diária§7. Volte todo dia: a sequência rende mais." },
  { id: "casa", nome: "Marcar a sua casa", dica: "No menu, abra §6Casas §7e marque o seu primeiro cantinho. Dá para voltar nele quando quiser." },
  { id: "cla", nome: "Entrar ou criar um clã", dica: "No menu, abra §6Clã §7e entre num clã com amigos ou crie o seu. O terreno do clã é protegido." },
  { id: "masmorra", nome: "Entrar na Masmorra", dica: "Suba a montanha, chegue à Sala dos Portais e atravesse o portal. Leve amigos: cabem até 4." },
  { id: "guardiao", nome: "Vencer a Raposa Mãe", dica: "No andar 1, derrote a §6Raposa Mãe §7e conquiste o §6Selo da Cauda §7para abrir o andar 2." },
]);

export const TITULO = "Primeiros passos";
export const TITULO_CHEGADA = "§6Primeiros passos";
/** @param {string} nome */
export const SUBTITULO_CHEGADA = (nome) => `§f${nome}, use /vulpus:comecar para ver as missões`;
/**
 * @param {number} feitas
 * @param {number} total
 * @param {string} barra
 */
export const CORPO = (feitas, total, barra) =>
  [
    "§7Bem-vinde à toca! Aqui vai o caminho para aprender o jogo e ganhar Caudas no caminho.",
    "§7Você está no §fspawn§7: o ponto de partida. Os painéis e placares em volta mostram o que rola no servidor.",
    "",
    `${barra} §e${feitas}§7/${total} missões`,
  ].join("\n");
/** @param {string} nome */
export const FEITA = (nome) => `§a✔ §7${nome}`;
/** @param {string} nome */
export const PENDENTE = (nome) => `§c✘ §f${nome}`;
/** @param {string} dica */
export const PROXIMA = (dica) => `§e§lAgora: §r§7${dica}`;
export const TUDO_FEITO = "§aVocê completou todos os primeiros passos! Agora é com você: explore, jogue e faça amigos.";
export const BOTAO_SPAWN = "Me leve ao spawn";
/**
 * @param {string} nome
 * @param {number} caudas
 */
export const MISSAO_FEITA = (nome, caudas) => `§aMissão cumprida: §f${nome}§a${caudas > 0 ? `. §6+${caudas} Caudas` : ""}`;
/** @param {number} caudas */
export const FINAL_FEITO = (caudas) => `§6§lPrimeiros passos completos! §r§7${caudas > 0 ? `Bônus de §6${caudas} Caudas§7. ` : ""}A Kiza tem orgulho de você.`;
export const TITULO_FINAL = "§6Missões completas";
export const SUBTITULO_FINAL = "§7A Kiza tem orgulho de você";
/**
 * @param {string} nome
 * @param {string} dica
 */
export const LEMBRETE = (nome, dica) => `§6Missão: §f${nome} §8| §7${dica.replace(/§./g, "")}`;
