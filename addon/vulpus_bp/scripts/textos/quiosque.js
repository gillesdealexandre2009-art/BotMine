// @ts-check
// Textos do Quiosque da Kiza (NPC provisório que atende a galera).

export const FALAS = [
  "Oi! Eu sou a Kiza, a raposa da toca Vulpus!",
  "Já resgatou a sua diária hoje? Posso te ajudar!",
  "A feira tem jogos para ganhar Caudas. Dá uma olhada!",
  "Tem dúvida? É só clicar em mim!",
  "Dizem que a koi dourada é raríssima... já pescou uma?",
  "Na corrida de raposas, a Faísca é a minha favorita!",
  "Seja gentil com a galera. Aqui a toca é de todo mundo!",
  "Já passou pelo canto comunitário? A fogueira dá XP!",
  "Quer saber os comandos? Eu te mostro!",
];

export const TITULO_FLUTUANTE = "§6§lKIZA";
export const SUBTITULO_PADRAO = "§7clique para conversar";
/** @param {string} fala */
export const LINHA_FALA = (fala) => `§f“${fala}”`;

export const FECHADO = "O quiosque da Kiza está fechado no momento.";
export const TITULO_MENU = "Quiosque da Kiza";
/** @param {string} nome */
export const CORPO_MENU = (nome) => `§fOi, ${nome}! §7Eu sou a Kiza. Do que você precisa?`;
export const BOTAO_MENU = "Menu principal";
export const BOTAO_DIARIA = "Resgatar a diária";
export const BOTAO_PERFIL = "Meu perfil";
export const BOTAO_REGRAS = "Regras, comandos e a lenda";
export const BOTAO_FEIRA = "Guia da feira";
export const BOTAO_SUGESTAO = "Mandar uma sugestão";

export const TITULO_FEIRA = "Guia da feira";
export const CORPO_FEIRA = [
  "§6Jogos para ganhar Caudas §8(todos têm espera e limite por dia)",
  "§e- Cara ou Coroa: §7aposte e veja a moeda girar.",
  "§e- Pescaria: §7pegue a vara, fisgue e puxe os peixes; complete o álbum!",
  "§e- Teste de Força: §7pare o marcador lá no alto.",
  "§e- Corrida de Raposas: §7aposte na raposa que chega primeiro.",
  "§e- Roleta: §7gire a roda; tem Caudas, XP e itens.",
  "§e- Jogo do Copo: §7siga a bolinha embaixo dos copos.",
  "§e- Torre da Vulpus: §7suba até a casinha do topo; tem cronômetro, ranking e prêmio.",
  "§e- Evento de inauguração: §7ache as raposinhas escondidas pelo mapa; achando todas ganha uma cor de nome e a conquista [Chegou cedo hein!].",
  "§e- Tiro ao Alvo: §7acerte os alvos que se mexem.",
  "",
  "§6Só por diversão",
  "§e- Mesas de Xadrez e Jogo da Velha: §7sente na almofada e clique na mesa.",
].join("\n");

// painel da staff
export const TITULO_STAFF = "Quiosque da Kiza (staff)";
export const BOTAO_STAFF = "Quiosque da Kiza";
export const BOTAO_MARCAR = "Marcar o quiosque (olhe para o chão onde ela fica)";
export const BOTAO_CONFIG = "Configurações do quiosque";
export const BOTAO_REMOVER = "Remover a Kiza do quiosque";
export const CONFIRMAR_REMOVER = "Remover a Kiza (NPC) e o texto do quiosque?";
export const OLHE_PARA_BLOCO = "Olhe para o bloco onde ela deve ficar, a até 12 blocos de distância.";
/** @param {string} onde */
export const MARCADO = (onde) => `§aKiza posta em §e${onde}§a. Ela olha para quem chega perto; clicar nela abre o menu (staff agachada mexe normal).`;
export const REMOVIDO = "§aKiza removida do quiosque.";
/** @param {{ marcado: boolean, perto: number }} e */
export const CORPO_STAFF = (e) =>
  [
    "§7NPC provisório (raposinha de pelúcia) até o modelo da Kiza ficar pronto. Clicar nele abre um menu com ajuda, diária, perfil, regras, guia da feira e sugestões.",
    "",
    `§fKiza: ${e.marcado ? "§apostada" : "§cnão postada"}`,
    `§fPessoas por perto: §7${e.perto}`,
  ].join("\n");
