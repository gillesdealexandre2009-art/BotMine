// @ts-check
// Textos de Regras: regras do servidor, comandos, a lenda de Kiza e o Discord.

export const TITULO = "Regras";
export const CORPO = "§7Tudo o que você precisa saber para viver bem na toca.";
export const BOTAO_REGRAS = "Regras do servidor";
export const BOTAO_COMANDOS = "Comandos";
export const BOTAO_LENDA = "A lenda de Kiza";
export const BOTAO_DISCORD = "Discord";

// Regras do Discord adaptadas para dentro do jogo.
export const TITULO_REGRAS = "Regras da toca";
export const REGRAS_INTRO = "§7Para todo mundo se divertir em paz, combinamos o seguinte:";
/** @type {[string, string][]} */
export const REGRAS = [
  ["1. Respeito sempre", "Nada de ofensas, preconceito, assédio ou bullying, no chat ou em placas. Aqui todo mundo tem lugar."],
  [
    "2. Nada de conteúdo impróprio",
    "Nada adulto, violento ou de ódio: nem em construções, placas, livros, nomes de itens ou de bichinhos.",
  ],
  ["3. Privacidade em primeiro lugar", "Não passe dados pessoais, seus ou de ninguém. A staff nunca pede sua senha."],
  ["4. Sem spam", "Nada de flood no chat, propaganda de outros servidores ou links suspeitos."],
  [
    "5. Jogue limpo",
    "Sem hack, x-ray, duplicação ou bug explorado. Sem griefing, sem roubar baús e sem matar quem não quer PvP.",
  ],
  [
    "6. Fale com a staff",
    "Algo te incomodou? Chama a staff ou abre um ticket no Discord. Respeite as decisões; discordou, conversa por ticket.",
  ],
];
export const REGRAS_RODAPE = "§7Jogando aqui, você concorda com estas regras. Valeu por cuidar da toca!";

// Comandos (os da staff só aparecem para a staff)
export const TITULO_COMANDOS = "Comandos";
export const COMANDOS_INTRO = "§7Tudo também funciona pelo menu. Os comandos são atalhos:";
/** @type {[string, string][]} */
export const COMANDOS = [
  ["/vulpus:menu", "abre o menu"],
  ["/vulpus:item", "devolve o item do menu"],
  ["/vulpus:spawn", "vai para o spawn"],
  ["/vulpus:casa [nome]", "vai para uma casa (sem nome abre a lista)"],
  ["/vulpus:definircasa <nome>", "salva uma casa onde você está"],
  ["/vulpus:apagarcasa <nome>", "apaga uma casa"],
  ["/vulpus:tpa <jogador>", "pede para ir até alguém"],
  ["/vulpus:tpaqui <jogador>", "chama alguém até você"],
  ["/vulpus:tpaceitar [jogador]", "aceita um pedido de TPA"],
  ["/vulpus:tpanegar [jogador]", "recusa um pedido de TPA"],
  ["/vulpus:voltar", "volta para o último lugar"],
  ["/vulpus:caudas", "abre o menu de Caudas"],
  ["/vulpus:diaria", "pega a recompensa diária"],
  ["/vulpus:leilao", "abre o leilão"],
  ["/vulpus:vender <preço>", "anuncia o item da mão no leilão"],
  ["/vulpus:caixa", "abre a caixa de retirada do leilão"],
  ["/vulpus:perfil [jogador]", "mostra um perfil"],
  ["/vulpus:nivel [jogador]", "mostra o nível"],
  ["/vulpus:hud", "liga/desliga o placar do lado"],
  ["/vulpus:cla", "abre o menu do clã"],
  ["/vulpus:c <mensagem>", "fala só com o seu clã"],
  ["/vulpus:claconvidar <jogador>", "convida alguém para o clã"],
  ["/vulpus:claaceitar [tag]", "aceita um convite de clã"],
  ["/vulpus:clarecusar [tag]", "recusa um convite de clã"],
  ["/vulpus:clacasa [nome]", "vai para uma casa do clã"],
  ["/vulpus:cladepositar <valor>", "deposita Caudas no banco do clã"],
  ["/vulpus:apelido [nome]", "apelido do selo Kitsune (tirar = volta ao nome da conta)"],
];
export const COMANDOS_STAFF_TITULO = "§6Só da staff";
/** @type {[string, string][]} */
export const COMANDOS_STAFF = [
  ["/vulpus:staff", "abre o painel da staff"],
  ["/vulpus:definirspawn", "define o spawn onde você está"],
  ["/vulpus:darcaudas <jogador> <valor>", "dá Caudas (valor negativo tira)"],
  ["/vulpus:cargo <jogador> <cargo>", "admin, staff, helper ou nenhum"],
  ["/vulpus:kitsune <jogador>", "liga/desliga o selo Kitsune"],
  ["/vulpus:resetapelido <jogador>", "tira o apelido e a cor do nome de alguém"],
  ["/vulpus:clabypass", "liga/desliga o bypass da proteção dos clãs"],
];

// A lenda de Kiza (mesma lore do Discord, sem emoji)
export const TITULO_LENDA = "A lenda de Kiza";
export const LENDA_INTRO = "§7Senta que lá vem história. Escolha um capítulo:";
/** @type {{ titulo: string, texto: string }[]} */
export const CAPITULOS = [
  {
    titulo: "I. A raposa de uma cauda só",
    texto:
      "Dizem que toda kitsune ganha uma cauda nova a cada grande história que vive. " +
      "Kiza Misuchi nasceu com uma só, e odiava isso. As outras raposas tinham nove, brilhantes, " +
      "e ela tinha... uma. Branquinha. Meio despenteada.",
  },
  {
    titulo: "II. A floresta de blocos",
    texto:
      "Cansada de esperar histórias caírem do céu, Kiza andou até achar uma floresta estranha, feita de blocos. " +
      "Lá, as pessoas construíam casas, castelos e coisas que nem tinham nome. E cada coisa criada contava uma história.",
  },
  {
    titulo: "III. A toca",
    texto:
      "Kiza cavou uma toca no meio da floresta e a chamou de §6Vulpus§f. Não para guardar tesouros, mas para guardar gente. " +
      "Quem chegasse e criasse algo junto deixava um pouquinho de história por lá.",
  },
  {
    titulo: "IV. As Caudas",
    texto:
      "Cada história vivida na toca vira uma §6Cauda§f. É por isso que você ganha Caudas jogando e aparecendo todo dia. " +
      "Kiza diz que não liga, mas conta todas, uma por uma, toda noite.",
  },
  {
    titulo: "V. As pérolas",
    texto:
      "Os momentos mais bonitos da toca viram pérolas e ficam guardados para sempre. " +
      "Se a Kiza um dia ganhar suas nove caudas, vai ser por causa de quem está lendo isto. " +
      "Ela nunca vai admitir em voz alta, claro.",
  },
];
export const LENDA_RODAPE = "§7Capítulos novos aparecem conforme a toca cresce.";
export const BOTAO_PROXIMO = "Próximo capítulo";

// Discord
export const TITULO_DISCORD = "Discord";
/** @param {string} link */
export const DISCORD_COM_LINK = (link) =>
  `§7A toca também tem um cantinho no Discord, com eventos, avisos e muita conversa.\n\n§fLink: §6${link}`;
export const DISCORD_SEM_LINK = "§7A staff ainda não colocou o link. Pergunta para alguém da staff!";
export const BOTAO_LINK_CHAT = "Mandar o link no chat";
/** @param {string} link */
export const LINK_NO_CHAT = (link) => `Nosso Discord: §6${link}`;
