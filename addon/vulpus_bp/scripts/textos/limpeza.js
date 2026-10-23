// @ts-check
// Textos da limpeza automática (sistemas/limpeza.js e limpeza_staff.js). Tudo curto, em pt-BR.

export const AVISO_30 = "§e✦ Limpeza do servidor em §f30 segundos§e: itens soltos e mobs hostis serão removidos.";
export const AVISO_10 = "§e✦ Limpeza em §f10 segundos§e. Guarde o que estiver no chão!";
/** @param {number} n */
export const CONTAGEM = (n) => (n > 0 ? `§e✦ Limpeza em §f${n}` : "§a✦ Limpando...");
/** @param {number} itens @param {number} mobs */
export const RESULTADO = (itens, mobs) => `§a✦ Limpeza feita: §f${itens} §aitens e §f${mobs} §amobs removidos.`;

// Painel da staff
export const TITULO = "Limpeza automática";
/** @param {{ ligada: boolean, itens: boolean, mobs: boolean, intervalo: number, proxima: string, ultima: string, andando: boolean }} i */
export const CORPO = (i) =>
  [
    `§7Estado: ${i.ligada ? "§aligada" : "§cdesligada"}`,
    `§7A cada §f${i.intervalo} min §7(horas cheias de Brasília)`,
    `§7Itens soltos: ${i.itens ? "§asim" : "§cnão"}  §7Mobs hostis: ${i.mobs ? "§asim" : "§cnão"}`,
    `§7Próxima: §f${i.ligada ? i.proxima : "desligada"}${i.andando ? " §e(em andamento)" : ""}`,
    `§7Última: §f${i.ultima}`,
  ].join("\n");
/** @param {boolean} ligada */
export const BOTAO_LIGAR = (ligada) => (ligada ? "Desligar a limpeza" : "Ligar a limpeza");
export const BOTAO_AJUSTES = "Intervalo, itens e mobs";
export const BOTAO_AGORA = "Limpar agora (aviso de 10 s)";
export const BOTAO_AGORA_SEM_AVISO = "Limpar agora, sem aviso (dono)";
export const TITULO_AJUSTES = "Limpeza: ajustes";
export const ROTULO_INTERVALO = "Intervalo (minutos, de 5 a 120)";
export const ROTULO_ITENS = "Remover itens soltos";
export const ROTULO_MOBS = "Remover mobs hostis";
export const AJUSTES_SALVOS = "Ajustes da limpeza salvos.";
/** @param {boolean} ligada */
export const ESTADO = (ligada) => (ligada ? "Limpeza automática ligada." : "Limpeza automática desligada.");
export const JA_ANDANDO = "Já há uma limpeza em andamento.";
export const NADA_LIGADO = "Ligue itens ou mobs nos ajustes antes de limpar.";
export const COMECOU = "Limpeza começando.";
export const SO_STAFF = "Só a staff pode usar este painel.";
export const SO_DONO = "A limpeza sem aviso é só para o dono.";
export const SEM_ULTIMA = "ainda não rodou";
/** @param {string} quando @param {number} itens @param {number} mobs */
export const ULTIMA = (quando, itens, mobs) => `${quando}: ${itens} itens, ${mobs} mobs`;
/** @param {string} hora @param {number} min */
export const PROXIMA = (hora, min) => `${hora} (em ${min} min)`;
