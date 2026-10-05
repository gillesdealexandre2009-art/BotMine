// @ts-check
// Textos do Spleef (minigame da torre de neve): fila, partida, prêmios, ranking e o painel da staff.
import { formatarCoords, formatarNumero } from "../core/util.js";
import { G, glyph } from "../glyphs.js";

/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */

export const SECAO = "Minigames";
export const TITULO = "Spleef";
export const TITULO_COMO = "Como jogar Spleef";
export const TITULO_RANKING = "Ranking do Spleef";
export const TITULO_RECORDES = "Recordes do Spleef";
export const TITULO_CONVITE = "Spleef na torre";
export const NOME_DESCONHECIDO = "Raposa misteriosa";

/** "1:05" (minutos:segundos). @param {number} segundos */
export const relogio = (segundos) => {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ------------------------------------------------------------- menu de quem joga

/** Botão na seção Minigames do menu de Caudas. @param {number} fila @param {boolean} jogando */
export const BOTAO_CAUDAS = (fila, jogando) =>
  `Spleef ${jogando ? "§a(valendo)" : fila > 0 ? `§7(fila: ${fila})` : ""}`.trim();

export const BOTAO_ENTRAR = "Entrar na fila";
export const BOTAO_SAIR = "Sair da fila";
export const BOTAO_DESISTIR = "Desistir da partida";
export const BOTAO_COMO = "Como jogar";
export const BOTAO_RANKING = "Ranking";
export const BOTAO_RECORDES = "Recordes";
export const BOTAO_STAFF = "Configurar a arena (staff)";
export const BOTAO_AGORA_NAO = "Agora não";

/**
 * @typedef {object} InfoMenu
 * @property {string} situacao  já pronta (SITUACAO_*)
 * @property {number} fila
 * @property {number} minimo
 * @property {number} maximo
 * @property {"fila" | "jogando" | "nada"} voce
 * @property {number} posicao  posição na fila (1 = primeira)
 * @property {{ v: number, p: number, m: number }} stats
 * @property {number} premiosRestantes
 * @property {number} premioVitoria
 * @property {number} premioParticipar
 */

/** @param {InfoMenu} i */
export const CORPO = (i) =>
  [
    `§7Arena: ${i.situacao}`,
    `§7Fila: §f${i.fila} §7(começa com ${i.minimo}, cabem ${i.maximo})`,
    i.voce === "fila"
      ? `§aVocê está na fila §7(${i.posicao}º)`
      : i.voce === "jogando"
        ? "§aVocê está jogando agora!"
        : "§7Você não está na fila.",
    "",
    `${glyph(G.TROFEU)} §7Vitórias: §f${i.stats.v} §8• §7Partidas: §f${i.stats.p} §8• §7Melhor sequência: §f${i.stats.m}`,
    `${glyph(G.CAUDAS)} §7Prêmios: §6${i.premioVitoria}§7 por vitória, §6${i.premioParticipar}§7 por jogar`,
    i.premiosRestantes > 0
      ? `§7Hoje ainda valem prêmio §f${i.premiosRestantes} ${i.premiosRestantes === 1 ? "partida" : "partidas"}§7.`
      : "§7Prêmios de hoje: §eesgotados§7 (dá para jogar por diversão).",
  ].join("\n");

export const SITUACAO_FECHADA = "§cfechada pela staff";
export const SITUACAO_SEM_ARENA = "§eainda não montada pela staff";
export const SITUACAO_LIVRE = "§alivre";
/** @param {number} s */
export const SITUACAO_CONTAGEM = (s) => `§ecomeça em ${s}s`;
/** @param {number} vivos @param {number} s */
export const SITUACAO_JOGANDO = (vivos, s) => `§bpartida rolando §7(${vivos} vivos, ${relogio(s)})`;
export const SITUACAO_RESETANDO = "§7arrumando a neve...";

export const COMO_JOGAR = (/** @type {{ minimo: number, duracaoMin: number, bolas: boolean, recargaBola: number, premioVitoria: number, premioParticipar: number, premiosDia: number }} */ c) =>
  [
    "§b★ O jogo",
    "§fTodo mundo começa na camada de neve mais alta da torre. Quebre a neve debaixo dos outros e fique em pé até o fim!",
    "",
    "§b★ Como quebrar",
    "§fBata na neve com a §bPá do Spleef§f: quebra na hora.",
    c.bolas ? `§fBola de neve também quebra o bloco onde acerta. Ganha uma nova a cada §e${c.recargaBola}s§f.` : "§7Bolas de neve estão desligadas nesta temporada.",
    "§7Só a neve das camadas quebra. Ninguém leva dano na arena.",
    "",
    "§b★ Quem sai",
    "§fCaiu abaixo da última camada, encostou na lava ou saiu da torre: eliminado. Sair do jogo, morrer ou trocar de mundo também conta.",
    "",
    "§b★ Fim",
    `§fO último em pé vence. Depois de §e${c.duracaoMin} min§f, quem sobrou empata.`,
    `§fVitória vale §6${c.premioVitoria}§f Caudas; jogar de verdade vale §6${c.premioParticipar}§f. Prêmios de até §e${c.premiosDia}§f partidas por dia.`,
    "§7Jogar de verdade = ficar em pé uns segundos ou quebrar alguns blocos.",
    "",
    `§7A partida começa quando a fila tem ${c.minimo} pessoas. Seus itens ficam guardados com você: só entrego a pá e as bolas, e pego de volta no fim.`,
  ].join("\n");

export const CONVITE = "§7Que bom te ver na torre do Spleef! Quer entrar na fila da próxima partida?";

// ------------------------------------------------------------- fila

/** @param {number} posicao @param {number} minimo */
export const ENTROU_FILA = (posicao, minimo) =>
  `Você entrou na fila do Spleef §7(${posicao}º)§r. Começa quando tiver ${minimo} pessoas. Pode passear enquanto isso!`;
export const ENTROU_FILA_PROXIMA = "Partida rolando agora: você entra na próxima. Te chamo!";
export const SAIU_FILA = "Você saiu da fila do Spleef.";
export const JA_NA_FILA = "Você já está na fila do Spleef.";
export const NAO_NA_FILA = "Você não está na fila do Spleef.";
export const JA_JOGANDO = "Você já está jogando! Foco na neve.";
export const FECHADO = "O Spleef está fechado agora. Volta mais tarde!";
export const SEM_ARENA = "A staff ainda não terminou de montar a arena do Spleef.";
export const MODO_ERRADO = "Para jogar Spleef, use o modo sobrevivência ou aventura.";
/** @param {number} n */
export const SEM_ESPACO = (n) => `Seu inventário está cheio! Libere ${n} ${n === 1 ? "espaço" : "espaços"} para a pá${n > 1 ? " e as bolas de neve" : ""}.`;
export const EM_COMBATE = "No meio da briga não dá para entrar no Spleef!";
/** @param {number} s @param {number} n @param {number} max */
export const BARRA_CONTAGEM = (s, n, max) => `§b» §fSpleef começa em §e${s}s §7(${n}/${max}) §b«`;
/** @param {number} n @param {number} min */
export const BARRA_FILA = (n, min) => `§b» §fFila do Spleef: §e${n}/${min} §b«`;
/** @param {number} faltam */
export const FILA_ESFRIOU = (faltam) => `Alguém saiu da fila do Spleef. Falta${faltam === 1 ? "" : "m"} ${faltam} para começar.`;
export const FALTOU_GENTE = "Não deu para começar: faltou gente pronta para jogar. Você continua na fila.";
/** @param {string} motivo */
export const NAO_ENTROU = (motivo) => `Você ficou de fora desta partida do Spleef: ${motivo}`;
export const ARENA_INDISPONIVEL = "A arena do Spleef não está pronta agora. Avisei a staff; você continua na fila.";

// ------------------------------------------------------------- partida

export const NOME_PA = "§bPá do Spleef";
export const NOME_BOLA = "§bBola de neve do Spleef";
/** Linha do lore que marca os itens do Spleef (é por ela que recolho no fim). */
export const MARCA = "§r§8Item do Spleef: volta para a Kiza no fim";
export const LORE_PA = "§7Bata na neve da arena: quebra na hora";
export const LORE_BOLA = "§7Acerte a neve da arena para quebrar";

export const TITULO_PREPARA = "§bSpleef";
/** @param {number} n */
export const SUB_PREPARA = (n) => `§7${n} raposas na torre`;
/** @param {number} n */
export const TITULO_CONTA = (n) => (n === 3 ? "§a3" : n === 2 ? "§e2" : "§c1");
export const SUB_CONTA = "§7Prepare a pá...";
export const TITULO_VAI = "§b§lVAI!";
export const SUB_VAI = "§fQuebre a neve dos outros!";
/** @param {string[]} nomes */
export const COMECOU = (nomes) => `§bSpleef começou!§r ${nomes.length} raposas: §f${nomes.join("§7, §f")}`;

export const TITULO_ELIMINADO = "§cFora da neve!";
/** @param {string} nome @param {string} motivo @param {number} restam */
export const ELIMINOU = (nome, motivo, restam) => `§c✖ §f${nome}§7 ${motivo}. ${restam === 1 ? "Resta §f1§7!" : `Restam §f${restam}§7.`}`;
export const MOTIVOS = Object.freeze({
  caiu: "caiu da última camada",
  lava: "encostou na lava",
  fora: "saiu da torre",
  saiu: "saiu do jogo",
  morreu: "não resistiu",
  dimensao: "trocou de mundo",
  modo: "trocou de modo de jogo",
  desistiu: "desistiu",
  staff: "saiu por decisão da staff",
});
/** @param {number} posicao @param {number} total */
export const SUB_ELIMINADO = (posicao, total) => `§7Você ficou em §f${posicao}º§7 de ${total}`;
export const VOCE_DESISTIU = "Você desistiu da partida. Fica para a próxima!";

/** @param {string} nome */
export const TITULO_VITORIA = (nome) => `§6${nome}`;
export const SUB_VITORIA = "§fvenceu o Spleef!";
export const TITULO_VOCE_VENCEU = "§6§lVITÓRIA!";
/** @param {number} total */
export const SUB_VOCE_VENCEU = (total) => `§fÚltima raposa em pé entre ${total}`;
/** @param {string} nome @param {number} total @param {number} segundos */
export const ANUNCIO_VITORIA = (nome, total, segundos) =>
  `§6★ §f${nome}§6 venceu o Spleef!§7 (${total} raposas, ${relogio(segundos)})`;
export const TITULO_EMPATE = "§eEmpate!";
/** @param {string[]} nomes */
export const SUB_EMPATE = (nomes) => `§7${nomes.length > 3 ? `${nomes.length} raposas` : nomes.join(", ")} em pé`;
/** @param {string[]} nomes */
export const ANUNCIO_EMPATE = (nomes) => `§e★ Spleef empatado:§7 o tempo acabou com §f${nomes.join("§7, §f")}§7 em pé.`;
export const ANUNCIO_SEM_VENCEDOR = "§7O Spleef acabou sem ninguém em pé. A neve venceu desta vez.";
export const CANCELADA = "A partida do Spleef foi cancelada: faltou gente. Ninguém perde nada.";
export const ENCERRADA_STAFF = "A staff encerrou a partida do Spleef. Sem prêmios desta vez.";
/** @param {number} n */
export const SEQUENCIA = (n) => `§6${n} vitórias seguidas no Spleef!`;

export const MOTIVO_VITORIA = "vitória no Spleef";
export const MOTIVO_PARTICIPAR = "partida de Spleef";
export const SEM_PREMIO_CURTA = "§7Partida curta demais: sem prêmio desta vez (precisa de pelo menos 2 pessoas jogando de verdade).";
export const SEM_PREMIO_PARADO = "§7Sem prêmio: fique em pé uns segundos ou quebre alguns blocos para contar.";
/** @param {number} n */
export const SEM_PREMIO_LIMITE = (n) => `§7Você já ganhou prêmio em ${n} partidas hoje. Amanhã tem mais!`;
/** @param {number} xp */
export const XP_GANHO = (xp) => `§a+${formatarNumero(xp)} XP §7(Spleef)`;

export const RECOLHI = "Peguei de volta a pá e as bolas de neve do Spleef.";
export const VOLTOU_FORA = "A partida do Spleef acabou enquanto você estava fora. Te trouxe para a saída.";
export const PROTEGIDO = "§cA torre do Spleef é protegida.";
export const INVASOR = "Partida de Spleef rolando! Te levei para fora da arena.";
export const ANTES_DO_RESET = "A neve da arena vai voltar agora: te tirei de lá para não ficar presa na neve.";
export const TP_BLOQUEADO = "Você está numa partida de Spleef! Para sair, desista pelo /vulpus:spleef.";

/** Linha da sidebar de quem joga. @param {number} vivos @param {number} segundos @param {boolean} valendo */
export const LINHA_HUD_JOGO = (vivos, segundos, valendo) =>
  `${glyph(G.TROFEU)} §bSpleef §f${vivos} §7vivos §8• §f${valendo ? relogio(segundos) : "prepara"}`;
/** Linha da sidebar de quem está na fila. @param {number} posicao @param {number} fila */
export const LINHA_HUD_FILA = (posicao, fila) => `${glyph(G.TROFEU)} §bSpleef §7fila §f${posicao}º §7de ${fila}`;

// ------------------------------------------------------------- ranking e recordes

export const RANKING_VAZIO = "§7Ninguém venceu ainda. O primeiro lugar está esperando por você!";
/** @param {number} posicao @param {string} nome @param {number} v @param {number} p @param {boolean} voce */
export const RANKING_LINHA = (posicao, nome, v, p, voce) =>
  `${posicao <= 3 ? "§6" : "§e"}${posicao}. ${voce ? "§a" : "§f"}${nome} §8» §f${v} ${v === 1 ? "vitória" : "vitórias"} §7em ${p}`;
/** @param {number} posicao */
export const RANKING_SUA = (posicao) => `§7Sua posição: §e${posicao}º`;
export const RANKING_FORA = "§7Você ainda não venceu. Bora para a torre!";
export const PLACAR_TITULO = "§b§lSpleef §r§7- top 5";
export const PLACAR_VAZIO = "§7Ninguém venceu ainda";
/** @param {number} posicao @param {string} nome @param {number} v */
export const PLACAR_LINHA = (posicao, nome, v) => `${posicao <= 3 ? "§6" : "§e"}${posicao}. §f${nome} §7- §f${v}`;

/**
 * @param {{ rapida: { n: string, s: number } | null, blocos: { n: string, q: number } | null, sequencia: { n: string, q: number } | null }} r
 */
export const RECORDES = (r) =>
  [
    "§b★ Vitória mais rápida",
    r.rapida ? `§f${r.rapida.n} §7em §e${relogio(r.rapida.s)}` : "§7Ninguém ainda.",
    "",
    "§b★ Mais neve quebrada numa partida",
    r.blocos ? `§f${r.blocos.n} §7com §e${formatarNumero(r.blocos.q)}§7 blocos` : "§7Ninguém ainda.",
    "",
    "§b★ Maior sequência de vitórias",
    r.sequencia ? `§f${r.sequencia.n} §7com §e${r.sequencia.q}§7 seguidas` : "§7Ninguém ainda.",
    "",
    "§7Só valem partidas com pelo menos 2 pessoas jogando de verdade.",
  ].join("\n");
/** @param {string} qual */
export const RECORDE_NOVO = (qual) => `§6★ Recorde novo do Spleef: ${qual}!`;
export const RECORDE_RAPIDA = "vitória mais rápida";
export const RECORDE_BLOCOS = "mais neve numa partida";
export const RECORDE_SEQUENCIA = "maior sequência";

// ------------------------------------------------------------- staff

export const TITULO_MINIGAMES = "Minigames (staff)";
export const MINIGAMES_CORPO = "§7Arenas e configurações dos minigames.";
export const TITULO_STAFF = "Spleef (staff)";
export const TITULO_CONFIG = "Configurações do Spleef";

/**
 * @typedef {object} InfoStaff
 * @property {boolean} temCentro
 * @property {string} dimensao
 * @property {number} cx
 * @property {number} cz
 * @property {number} raio
 * @property {{ y: number, n: number }[]} camadas
 * @property {string[]} tipos
 * @property {boolean} salvo
 * @property {boolean} salvoAtual  o estado salvo ainda bate com a arena
 * @property {Ponto | null} lobby
 * @property {Ponto | null} saida
 * @property {Ponto | null} topo
 * @property {Ponto | null} placar
 * @property {string} pronta  "" = pronta; senão o motivo
 * @property {string} fase
 * @property {number} fila
 */

/** @param {Ponto | null} p */
const PONTO = (p) => (p ? `§f${formatarCoords(p)}` : "§8não marcado");

/** @param {InfoStaff} i */
export const CORPO_STAFF = (i) =>
  [
    i.pronta ? `§eNão pronta: §f${i.pronta}` : "§aArena pronta para jogar.",
    `§7Partida: §f${i.fase} §8• §7Fila: §f${i.fila}`,
    "",
    i.temCentro ? `§7Centro: §f${i.cx}, ${i.cz} §8(${i.dimensao}) §8• §7Raio: §f${i.raio}` : "§7Centro: §8não marcado",
    i.camadas.length
      ? `§7Camadas: ${i.camadas.map((c) => `§fY=${c.y} §8(${c.n})`).join("§7, ")}`
      : "§7Camadas: §8nenhuma detectada",
    `§7Blocos das camadas: §f${i.tipos.map((t) => t.replace("minecraft:", "")).join(", ")}`,
    `§7Estado salvo: ${i.salvo ? (i.salvoAtual ? "§asim" : "§eantigo (salve de novo)") : "§cnão"}`,
    `§7Espera: ${PONTO(i.lobby)} §8• §7Saída: ${PONTO(i.saida)}`,
    `§7Entrada no topo: ${i.topo ? PONTO(i.topo) : "§7centro (padrão)"} §8• §7Placar: ${PONTO(i.placar)}`,
  ].join("\n");

export const BOTAO_CENTRO = "Marcar centro aqui";
export const BOTAO_RAIO = "Ajustar raio";
export const BOTAO_CAMADAS = "Detectar camadas";
export const BOTAO_TIPOS = "Blocos das camadas";
export const BOTAO_SALVAR = "Salvar estado da arena";
export const BOTAO_LOBBY = "Marcar espera aqui";
export const BOTAO_SAIDA = "Marcar saída aqui";
export const BOTAO_TOPO = "Marcar entrada no topo aqui";
export const BOTAO_TOPO_PADRAO = "Entrada no topo: voltar ao centro";
export const BOTAO_PLACAR = "Marcar placar flutuante aqui";
export const BOTAO_PLACAR_TIRAR = "Tirar o placar flutuante";
export const BOTAO_CONFIG = "Configurações";
export const BOTAO_RESETAR = "Resetar a neve agora";
export const BOTAO_COMECAR = "Começar já (com a fila)";
export const BOTAO_PARAR = "Encerrar a partida (sem prêmios)";
export const BOTAO_SPLEEF = "Spleef";

/**
 * @param {number} raio
 * @param {{ y: number, n: number }[]} camadas
 * @param {boolean} recentrou
 */
export const CENTRO_OK = (raio, camadas, recentrou) =>
  `Centro marcado${recentrou ? " §7(ajustei para o meio da neve)§r" : ""}! Raio §e${raio}§r. ${CAMADAS_OK(camadas)}`;
export const CENTRO_SEM_NEVE =
  "Marquei o centro, mas não achei neve das camadas aqui embaixo para medir o raio. Fique em cima de uma camada e tente de novo, ou ajuste o raio à mão.";
/** @param {number} raio */
export const RAIO_PEQUENO = (raio) => `A neve aqui só vai até ${raio} blocos: parece que você não está no meio da torre. Marquei mesmo assim; confira o raio.`;
/** @param {{ y: number, n: number }[]} camadas */
export const CAMADAS_OK = (camadas) =>
  camadas.length
    ? `Achei §e${camadas.length}§r ${camadas.length === 1 ? "camada" : "camadas"}: ${camadas.map((c) => `Y=${c.y} §7(${c.n} blocos)§r`).join(", ")}. Agora é só §esalvar o estado§r.`
    : "§cNão achei nenhuma camada§r dentro do círculo. Confira o centro, o raio e os blocos das camadas.";
export const PRECISA_CENTRO = "Marque o centro da arena primeiro.";
export const PRECISA_CAMADAS = "Detecte as camadas primeiro.";
/** @param {number} n */
export const RAIO_OK = (n) => `Raio ajustado para §e${n}§r. Detectei as camadas de novo; salve o estado quando a neve estiver inteira.`;
export const ROTULO_RAIO = "Raio da arena em blocos (13 de largura = 6)";
export const ROTULO_TIPOS = "Blocos das camadas, separados por vírgula";
/** @param {string} id */
export const TIPO_INVALIDO = (id) => `Não conheço o bloco "${id}". Mantive a lista anterior.`;
export const TIPOS_OK = "Blocos das camadas atualizados. Detectei as camadas de novo.";
/** @param {number} n @param {number} total */
export const SALVO_OK = (n, total) =>
  `Estado da arena salvo! ${n} ${n === 1 ? "camada" : "camadas"}, ${formatarNumero(total)} blocos. Depois de cada partida eu reponho tudo assim.`;
/** @param {{ y: number, n: number }[]} camadas @param {number} circulo  blocos que cabem no círculo */
export const SALVAR_CONFIRMA = (camadas, circulo) =>
  [
    "§7Salvo a neve como está agora: depois de cada partida, eu reponho exatamente isto.",
    "",
    ...camadas.map((c) => `§fY=${c.y}: ${c.n < circulo ? "§e" : "§a"}${c.n}§7 de ${circulo} blocos`),
    "",
    "§7Amarelo = a camada tem buracos ou decoração. Se for buraco, arrume antes de salvar. Salvar?",
  ].join("\n");
export const SALVAR_FALHOU = "Não consegui salvar o estado da arena (veja o log). Tente de novo perto da torre.";
export const CARREGANDO = "A arena ainda está carregando. Chegue mais perto da torre e tente de novo.";
export const DURANTE_PARTIDA = "Isso não dá para fazer com partida rolando ou a neve sendo reposta.";
/** @param {string} nome */
export const PONTO_OK = (nome) => `${nome} marcado onde você está.`;
export const NOME_LOBBY = "Ponto de espera";
export const NOME_SAIDA = "Ponto de saída";
export const NOME_TOPO = "Ponto de entrada no topo";
export const NOME_PLACAR = "Placar flutuante";
export const SAIDA_DENTRO = "A saída precisa ficar fora da arena (senão quem cai volta para a neve).";
export const ESPERA_DENTRO = "O ponto de espera precisa ficar fora da arena (perto da entrada da torre).";
export const TOPO_FORA = "A entrada no topo precisa ficar dentro do círculo da arena.";
export const OUTRA_DIMENSAO = "Esse ponto precisa ficar na mesma dimensão da arena.";
export const TOPO_PADRAO_OK = "Entrada no topo de volta ao centro, acima da camada mais alta.";
export const PLACAR_TIRADO = "Placar flutuante tirado.";
export const RESET_OK = "Neve reposta!";
/** @param {number} n */
export const RESET_FEITO = (n) => `Neve reposta! ${formatarNumero(n)} ${n === 1 ? "bloco voltou" : "blocos voltaram"}.`;
export const RESET_FALHOU = "Não consegui repor a neve da arena do Spleef (veja o log). Confira o estado salvo.";
export const COMECAR_POUCOS = "Precisa de pelo menos 2 pessoas na fila.";
export const COMECANDO = "Começando já!";
export const SEM_PARTIDA = "Não tem partida rolando.";
export const PARADA = "Partida encerrada.";
/** @param {string} motivo */
export const AVISO_STAFF_NAO_PRONTA = (motivo) => `§eO Spleef tem fila, mas a arena não está pronta: §f${motivo}`;
export const AVISO_STAFF_RECARGA =
  "§eUma partida do Spleef ficou aberta (reinício ou /reload). Encerrei sem prêmios e reponho a neve assim que a arena carregar.";

export const NAO_PRONTA_CENTRO = "falta marcar o centro";
export const NAO_PRONTA_CAMADAS = "falta detectar as camadas";
export const NAO_PRONTA_SALVO = "falta salvar o estado da arena";
export const NAO_PRONTA_ANTIGO = "a arena mudou depois do último estado salvo (salve de novo)";
export const NAO_PRONTA_ESTRUTURA = "o estado salvo sumiu do mundo (salve de novo)";
export const NAO_PRONTA_SAIDA = "falta marcar a saída (fora da torre)";

/** Rótulos das configurações (chaves de PADROES). */
export const CAMPOS = {
  spleefLigado: "Spleef aberto",
  spleefMinimo: "Pessoas para começar",
  spleefMaximo: "Máximo de pessoas por partida",
  spleefContagem: "Contagem antes de começar (s)",
  spleefContagemCheia: "Contagem com a arena cheia (s)",
  spleefDuracaoMin: "Tempo máximo da partida (min; depois, empate)",
  spleefPremioVitoria: "Caudas para quem vence",
  spleefPremioParticipar: "Caudas para quem joga de verdade",
  spleefPremiosDia: "Partidas com prêmio por pessoa por dia",
  spleefXp: "XP por partida jogada de verdade",
  spleefFerramenta: "Ferramenta",
  spleefEficiencia: "Nível de Eficiência da pá (0 = sem)",
  spleefBolas: "Bolas de neve quebram blocos",
  spleefRecargaBola: "Uma bola de neve nova a cada (s)",
};
export const FERRAMENTAS = ["Pá de madeira", "Pá de pedra", "Pá de ferro", "Pá de ouro", "Pá de diamante", "Pá de netherite"];
/** @param {string[]} mudou */
export const CONFIG_SALVA = (mudou) => `Configurações do Spleef salvas! Mudou: §e${mudou.join("§r, §e")}§r.`;
export const CONFIG_IGUAL = "Nada mudou, tudo como estava.";
export const MIN_MAIOR = "O mínimo de pessoas ficou maior que o máximo. Mantive os dois como estavam.";

export const DESC_SPLEEF = "Abre o Spleef: fila, ranking e recordes (staff: /vulpus:spleef staff)";
export const ACOES_STAFF =
  "Ações da staff: staff, centro, camadas, salvar, resetar, espera, saida, topo, placar, comecar, parar. Para jogar: entrar ou sair.";
/** @param {string} acao */
export const ACAO_DESCONHECIDA = (acao) => `Não conheço a ação "${acao}". Use entrar, sair, ranking ou (staff) staff.`;

