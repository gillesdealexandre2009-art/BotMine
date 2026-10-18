// @ts-check
// Textos do tiro ao alvo.

export const NOME_ARCO = "§6Arco da Cabana";
export const NOME_FLECHA = "§6Flecha da Cabana";
export const MARCA = "§8Tiro ao alvo";
export const LORE_ARCO = "§7Emprestado enquanto você está no posto de tiro";

export const CMD_DEFINIRTIRO = "Marca o posto de tiro ao alvo onde você está, com o raio em blocos (staff)";
export const CMD_PLACARTIRO = "Põe o placar flutuante do tiro ao alvo onde você está (staff)";
export const CMD_REMOVERTIRO = "Remove o posto e o placar do tiro ao alvo (staff)";

/**
 * @param {string} coords
 * @param {number} raio
 */
export const POSTO_DEFINIDO = (coords, raio) => `§aPosto de tiro marcado em §e${coords}§a (raio ${raio}). Alvos: blocos de Alvo (target).`;
export const PLACAR_DEFINIDO = "§aPlacar do tiro ao alvo posto aqui.";
export const TIRO_REMOVIDO = "§aTiro ao alvo removido.";
export const SEM_POSTO = "Ainda não existe posto de tiro. Use /vulpus:definirtiro no lugar de atirar.";
export const INVENTARIO_CHEIO = "Libere 2 espaços no inventário para pegar o arco da cabana.";

/**
 * @param {number} flechas
 * @param {number} perto
 * @param {number} medio
 */
export const COMECOU = (flechas, perto, medio) =>
  `§6Tiro ao alvo §8» §7${flechas} disparos. Alvo a até §e${perto}§7 blocos vale §ex1§7, até §e${medio}§7 vale §ex2§7, mais longe §ex3§7. Mosca vale o triplo!`;
/**
 * @param {number} pontos
 * @param {string} anel
 * @param {number} mult
 * @param {number} restam
 */
export const ACERTO = (pontos, anel, mult, restam) => `§6+${pontos} pontos §8| §e${anel} §7x${mult} §8| §7restam §e${restam}`;
export const ERROU = (restam) => `§7Foi para a parede... restam §e${restam}`;
export const ANEL_MOSCA = "MOSCA!";
export const ANEL_MEIO = "Boa!";
export const ANEL_BORDA = "Na borda";

export const FIM_TITULO = "§6Rodada encerrada";
/** @param {number} pontos */
export const FIM_SUB = (pontos) => `§e${pontos} §7pontos`;
/**
 * @param {number} pontos
 * @param {number} acertos
 * @param {number} tiros
 * @param {number} caudas
 * @param {boolean} recorde
 */
export const FIM_CHAT = (pontos, acertos, tiros, caudas, recorde) =>
  `§6Tiro ao alvo §8» §e${pontos}§7 pontos, §e${acertos}§7/${tiros} no alvo.` +
  (caudas > 0 ? ` §6+${caudas} Caudas.` : "") +
  (recorde ? " §aNovo recorde do dia!" : "");

export const PLACAR_TITULO = "§6§l✦ TIRO AO ALVO ✦";
export const PLACAR_HOJE = "§eMelhores de hoje";
export const PLACAR_SEMANA = "§eMelhores da semana";
export const PLACAR_VAZIO = "§7ninguém ainda";
/**
 * @param {number} pos
 * @param {string} nome
 * @param {number} pontos
 */
export const PLACAR_LINHA = (pos, nome, pontos) => `§7${pos}. §f${nome} §8» §e${pontos}`;
export const NOME_DESCONHECIDO = "???";
export const MOTIVO = "tiro ao alvo";

/** @param {number} segundos */
export const RECARGA = (segundos) => `§cCalma, atirador! Nova rodada em §e${segundos}s§c.`;
export const CMD_ALVOMOVEL = "Põe o alvo móvel 1 a 4 do tiro ao alvo onde você está, com a amplitude em blocos (staff)";
/** Como cada alvo móvel anda (o número define o jeito). */
export const JEITO_ALVO = ["velocidade normal", "mais rápido", "ainda mais rápido", "rápido, subindo e descendo (com palito)"];
/** @param {number} amplitude */
export const MOVEL_DEFINIDO = (n, amplitude) =>
  `§aAlvo móvel §e${n}§a posto (${JEITO_ALVO[n - 1]}): vai e volta §e${amplitude}§a blocos para cada lado.`;
/** @param {number} n */
export const MOVEL_REMOVIDO = (n) => `§aAlvo móvel §e${n}§a removido.`;
export const SEM_POSTO_MOVEL = "Marque o posto de tiro primeiro (/vulpus:definirtiro) para o alvo olhar para ele.";
/** @param {number} n */
export const NOME_MOVEL = (n) => `Alvo móvel ${n}`;

/** @param {number} raio */
export const RAIO_POSTO = (raio) => `§aRaio do posto agora é de §e${raio}§a blocos.`;
/** @param {number} n */
export const SEM_MOVEL = (n) => `O alvo móvel ${n} ainda não foi posto.`;

// Painel da staff
export const TITULO_STAFF = "Tiro ao alvo (staff)";
export const BOTAO_STAFF = "Tiro ao alvo";
export const BOTAO_POSTO = "Marcar o posto de tiro aqui";
export const BOTAO_RAIO_POSTO = "Ajustar o raio do posto";
export const BOTAO_PLACAR = "Pôr o placar flutuante aqui";
export const BOTAO_AMPLITUDE = "Ajustar a amplitude";
export const BOTAO_PONTO_MOVEL = "Pôr aqui";
export const BOTAO_REMOVER_MOVEL = "Remover este alvo";
export const BOTAO_REMOVER = "Remover posto, placar e alvo móvel";
export const BOTAO_CONFIG = "Configurações do tiro";
export const ROTULO_RAIO = "Raio do posto (blocos)";
export const ROTULO_AMPLITUDE = "Blocos para cada lado";
export const CONFIRMAR_REMOVER = "Remover o posto, o placar e todos os alvos móveis do tiro ao alvo?";
/**
 * @param {number} n
 * @param {boolean} posto
 */
export const BOTAO_ALVO = (n, posto) => `Alvo móvel ${n}: ${JEITO_ALVO[n - 1].split(",")[0]} ${posto ? "§a(posto)" : "§7(vazio)"}`;
/** @param {number} n */
export const TITULO_ALVO = (n) => `Alvo móvel ${n}`;
/**
 * @param {number} n
 * @param {{ amp: number } | undefined} m
 */
export const CORPO_ALVO = (n, m) =>
  [`§7Jeito: §f${JEITO_ALVO[n - 1]}`, m ? `§fPosto, amplitude §e${m.amp}` : "§fAinda não posto: fique onde ele deve ficar e use Pôr aqui."].join("\n");
/**
 * @param {{ posto?: { x: number, y: number, z: number, r: number }, placar?: object, moveis: Record<string, { amp: number }> }} e
 */
export const CORPO_STAFF = (e) =>
  [
    "§7Os alvos são blocos de Alvo (target) e os alvos móveis (1 a 4).",
    "",
    e.posto ? `§fPosto: §a${Math.round(e.posto.x)}, ${Math.round(e.posto.y)}, ${Math.round(e.posto.z)} §7(raio ${e.posto.r})` : "§fPosto: §cnão marcado",
    e.placar ? "§fPlacar flutuante: §asim" : "§fPlacar flutuante: §cnão",
    `§fAlvos móveis: §e${Object.keys(e.moveis).length}§f de 4`,
  ].join("\n");

// Dicas para quem joga
export const TITULO_POSTO = "§6§l✦ TIRO AO ALVO ✦\n§7Fique aqui para pegar o arco";
export const DICA_FORA = "§6Tiro ao alvo §8» §7Chegue mais perto do posto para pegar o arco";
export const VISITANTE = "§cVocê está como Visitante e não consegue usar o arco. Peça ao dono do mundo para te mudar para Membro.";
