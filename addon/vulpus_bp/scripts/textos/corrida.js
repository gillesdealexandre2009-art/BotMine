// @ts-check
// Textos da Corrida de Raposas (a barraca da feira).

/** As três raposas, uma por faixa (vermelha, amarela, verde). */
export const RAPOSAS = Object.freeze([
  { nome: "Brasa", cor: "§c", faixa: "vermelha" },
  { nome: "Faísca", cor: "§e", faixa: "amarela" },
  { nome: "Folha", cor: "§a", faixa: "verde" },
]);
/** @param {number} i */
export const NOME_COLORIDO = (i) => `${RAPOSAS[i].cor}${RAPOSAS[i].nome}`;

export const JOGO_FECHADO = "A Corrida de Raposas está fechada no momento.";
export const EM_ANDAMENTO = "A corrida já começou! Espere a próxima.";
export const JA_APOSTOU = "Você já apostou nesta corrida. Aguarde a largada!";
/** @param {number} s */
export const RECARGA = (s) => `Calma, apostador! A próxima aposta é em §e${s}s§c.`;
export const GANHO_MAX = "Você já ganhou o máximo de hoje na corrida. Volte amanhã!";
export const PERDA_MAX = "Chega de corrida por hoje! Volte amanhã.";
/** @param {number} minimo */
export const SEM_CAUDAS = (minimo) => `Você precisa de pelo menos §e${minimo} Caudas§c para apostar.`;

export const TITULO_APOSTA = "Corrida de Raposas";
export const ROTULO_RAPOSA = "Em qual raposa você aposta?";
export const ROTULO_VALOR = "Quanto você aposta (Caudas)?";
/** @param {number} i */
export const OPCAO_RAPOSA = (i) => `${RAPOSAS[i].nome} (faixa ${RAPOSAS[i].faixa})`;

/** @param {number} valor @param {number} i @param {number} seg */
export const APOSTOU = (valor, i, seg) => `§6Corrida §8» §7Você apostou §e${valor}§7 na ${NOME_COLORIDO(i)}§7. A corrida largará em até §f${seg}s§7!`;
/** @param {string} nome @param {number} i */
export const OUTRO_APOSTOU = (nome, i) => `§6Corrida §8» §f${nome} §7apostou na ${NOME_COLORIDO(i)}§7.`;
/** @param {number} n */
export const CONTAGEM = (n) => `§e${n}...`;
export const LARGADA = "§a§lJÁ!";
/** @param {number} i */
export const NA_FRENTE = (i) => `${NOME_COLORIDO(i)} §7na frente!`;
/** @param {number} i */
export const VENCEDORA = (i) => `${NOME_COLORIDO(i)}§6 venceu a corrida!`;
/** @param {number} i @param {number} premio */
export const TITULO_GANHOU = (i, premio) => `§6${RAPOSAS[i].nome} venceu! §e+${premio}`;
/** @param {number} i */
export const TITULO_PERDEU = (i) => `§7${RAPOSAS[i].nome} venceu`;
/** @param {number} premio */
export const SUB_GANHOU = (premio) => `§aVocê ganhou §e${premio} Caudas`;
/** @param {number} valor */
export const SUB_PERDEU = (valor) => `§7Não foi dessa vez (-${valor})`;
/** @param {number} i @param {number} valor @param {number} premio */
export const CHAT_GANHOU = (i, valor, premio) => `§6Corrida §8» §fA ${NOME_COLORIDO(i)}§f ganhou! Você recebeu §e${premio} Caudas §7(lucro de ${premio - valor}).`;
/** @param {number} i @param {number} valor */
export const CHAT_PERDEU = (i, valor) => `§6Corrida §8» §fA ${NOME_COLORIDO(i)}§f ganhou. Você perdeu §e${valor} Caudas§f. Na próxima!`;
/** @param {string} nome @param {number} i @param {number} premio */
export const GRANDE_VITORIA = (nome, i, premio) => `§6§l✦ §r§e${nome} §6apostou na ${NOME_COLORIDO(i)} §6e levou §e${premio} Caudas §6na corrida de raposas da feira!`;
export const REEMBOLSO = "§6Corrida §8» §7A corrida foi cancelada e sua aposta voltou.";

/**
 * @param {number} min
 * @param {number} max
 * @param {number} pct
 * @param {number[]} ultimas
 * @param {{ fase: "livre" | "apostas" | "correndo", seg: number, apostas: number }} estado
 */
export const TITULO_FLUTUANTE = (min, max, pct, ultimas, estado) =>
  [
    "§6§lCORRIDA DE RAPOSAS",
    estado.fase === "apostas"
      ? `§aApostas abertas: §e${estado.seg}s §8• §f${estado.apostas} aposta${estado.apostas === 1 ? "" : "s"}`
      : estado.fase === "correndo"
        ? "§eA corrida está rolando!"
        : `§7clique no balcão e escolha uma raposa §8• §e${min}-${max} Caudas §8• §7paga §e${(pct / 100).toFixed(2).replace(".", ",")}x`,
    ultimas.length ? `§8Últimas: ${ultimas.map((i) => NOME_COLORIDO(i)).join("§8, ")}` : "§8Nenhuma corrida ainda",
  ].join("\n");

// Painel da staff
export const TITULO_STAFF = "Corrida de Raposas (staff)";
export const BOTAO_STAFF = "Corrida de Raposas";
export const BOTAO_BALCAO = "Marcar o balcão (olhe para o bloco)";
/** @param {number} n */
export const BOTAO_LARGADA = (n) => `Marcar a largada da faixa ${n} (${RAPOSAS[n - 1].faixa}; olhe para o começo dela)`;
export const BOTAO_CHEGADA = "Marcar a chegada (olhe para o fim da faixa 1)";
export const BOTAO_TESTAR = "Fazer uma corrida de teste (sem apostas)";
export const BOTAO_CONFIG = "Configurações da corrida";
export const BOTAO_REMOVER = "Remover a barraca";
export const CONFIRMAR_REMOVER = "Remover o balcão, as marcas da pista e as raposas da corrida?";
export const OLHE_PARA_BLOCO = "Olhe para um bloco a até 12 blocos de distância.";
/** @param {string} onde */
export const BALCAO_MARCADO = (onde) => `§aBalcão marcado em §e${onde}§a. Clicar nele (ou numa raposa) abre a aposta (staff agachada mexe normal).`;
/** @param {number} n */
export const LARGADA_MARCADA = (n) => `§aLargada da faixa ${n} marcada.`;
export const CHEGADA_MARCADA = "§aChegada marcada: as raposas correm do começo da faixa 1 até aqui (as outras faixas seguem a mesma direção).";
export const PISTA_PRONTA = "§aPista pronta: as três raposas estão na largada.";
export const REMOVIDO = "§aCorrida de Raposas removida.";
export const SEM_PISTA = "Marque as três largadas e a chegada primeiro (a pista precisa ter pelo menos 3 blocos).";
export const OCUPADA = "Tem uma corrida acontecendo agora.";
/**
 * @param {{ balcao: boolean, largadas: boolean[], chegada: boolean, pista: boolean, fase: string }} e
 */
export const CORPO_STAFF = (e) =>
  [
    "§7Três raposas, uma por faixa. A pessoa aposta numa delas; abre uma janela de apostas e depois elas correm.",
    "",
    `§fBalcão: ${e.balcao ? "§amarcado" : "§cnão marcado"}`,
    `§fLargadas: ${e.largadas.map((m, i) => `${RAPOSAS[i].cor}${i + 1}§f ${m ? "§a✔" : "§c✘"}`).join("  ")}`,
    `§fChegada: ${e.chegada ? "§amarcada" : "§cnão marcada"}`,
    `§fPista: ${e.pista ? "§apronta" : "§cincompleta"}`,
    `§fAgora: §7${e.fase === "livre" ? "livre" : e.fase === "apostas" ? "apostas abertas" : "corrida rolando"}`,
  ].join("\n");
