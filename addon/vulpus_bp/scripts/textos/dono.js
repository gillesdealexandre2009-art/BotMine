// @ts-check
// Textos do Painel de Dono (sistemas/dono.js e dono_acoes.js). "Time" = clã. Os de erro já saem em §c.
import { formatarCoords, formatarData, formatarNumero } from "../core/util.js";
import { LINHA_BANDEIRA, NOME_CARGO } from "./clas.js";

/** @typedef {import("../sistemas/cla_dados.js").Cla} Cla */
/** @typedef {import("../sistemas/cla_dados.js").CargoCla} CargoCla */
/** @typedef {import("../sistemas/cla_dados.js").Membro} Membro */
/** @typedef {import("../sistemas/cla_guerra.js").Guerra} Guerra */
/** @typedef {import("../sistemas/cla_guerra.js").GuerraFim} GuerraFim */
/** @typedef {import("../core/dono.js").LinhaLogDono} LinhaLogDono */
/** @typedef {import("../core/dono.js").DonoRegistrado} DonoRegistrado */

/** @param {{ tag: string }} t */
const TAG = (t) => `[${t.tag}]`;
/** @param {{ tags: { a: string, b: string } }} g */
const PAR = (g) => `[${g.tags.a}] x [${g.tags.b}]`;
/** @param {{ tags: { a: string, b: string }, pontos: { a: number, b: number } }} g */
const PLACAR = (g) => `[${g.tags.a}] ${g.pontos.a} x ${g.pontos.b} [${g.tags.b}]`;

// ---------------------------------------------------------------- permissão e donos

export const SO_DONO = "Isso é só do dono do servidor.";
export const LOG_NAO_DONO = "recusado: não é dono";
export const ERRO_INTERNO = "Algo deu errado aqui dentro; olha o Content Log.";
/** @type {Readonly<Record<"ok" | "ja_tem" | "nao_op" | "erro", string>>} */
export const REIVINDICAR = Object.freeze({
  ok: "virou o primeiro dono",
  ja_tem: "O servidor já tem dono. Peça para um dono te adicionar.",
  nao_op: "Só um Operador pode reivindicar o servidor.",
  erro: "Não consegui gravar a lista de donos.",
});
export const REIVINDICOU = "Pronto: agora você é dono do servidor. Abra o painel com §e/vulpus:dono§r.";
/** @type {Readonly<Record<"sem_permissao" | "ja_e" | "cheio" | "erro", string>>} */
export const ADICIONAR_DONO_ERRO = Object.freeze({
  sem_permissao: SO_DONO,
  ja_e: "Essa pessoa já é dona.",
  cheio: "A lista de donos está cheia (20).",
  erro: "Não consegui gravar a lista de donos.",
});
/** @type {Readonly<Record<"sem_permissao" | "nao_e" | "ultimo" | "erro", string>>} */
export const REMOVER_DONO_ERRO = Object.freeze({
  sem_permissao: SO_DONO,
  nao_e: "Essa pessoa não está na lista de donos.",
  ultimo: "Não dá para tirar o último dono.",
  erro: "Não consegui gravar a lista de donos.",
});
/** @param {string} nome */
export const DONO_ADICIONADO = (nome) => `${nome} agora é dono do servidor.`;
/** @param {string} nome */
export const DONO_REMOVIDO = (nome) => `${nome} não é mais dono.`;
export const VIROU_DONO_AVISO = "Você virou dono do servidor. Painel: §e/vulpus:dono§r.";
/**
 * @param {DonoRegistrado[]} lista
 * @param {readonly string[]} config
 */
export const LISTA_DONOS = (lista, config) =>
  [
    `§7Donos registrados: §f${lista.length ? lista.map((d) => d.nome).join(", ") : "nenhum"}`,
    `§7Na config (DONOS): §f${config.length ? config.join(", ") : "nenhum"}`,
  ].join("\n");

// ---------------------------------------------------------------- busca

/** @param {string} nome */
export const PESSOA_NAO_ACHADA = (nome) => `Não achei "${nome}" (nem online, nem entre quem já entrou no mundo).`;
/** @param {string} ref */
export const TIME_NAO_ACHADO = (ref) => `Não achei o time "${ref}". Use a tag (3 letras).`;
/** @param {string} ref */
export const GUERRA_NAO_ACHADA = (ref) => `Não achei guerra para "${ref}".`;
export const JA_FINALIZADA = "Essa guerra já foi finalizada.";
export const ERRO_GRAVAR = "Não consegui gravar. Tenta de novo?";

// ---------------------------------------------------------------- times

export const COR_INVALIDA = "Cor inválida. Use o código (6, e, a, b, c, d, 9, 5, 3, 2, f, g) ou o nome (Azul, Vermelho...).";
/** @param {Cla} cla @param {string | undefined} lider */
export const TIME_CRIADO = (cla, lider) =>
  `Time ${TAG(cla)} ${cla.nome} criado sem custo${lider ? ` com ${lider} na liderança` : ", sem líder e sem membros"}.`;
/** @param {Cla} cla */
export const TIME_CRIADO_AVISO = (cla) => `O dono criou o time ${TAG(cla)} ${cla.nome} com você na liderança.`;
/** @param {string} nome @param {Cla} cla */
export const JA_LIDER = (nome, cla) => `${nome} já lidera ${TAG(cla)}.`;
/** @param {Cla} cla @param {number} max */
export const TIME_CHEIO = (cla, max) => `${TAG(cla)} está cheio (${max} no nível ${cla.nivel}). Suba o nível antes.`;
/** @param {string} nome @param {Cla} cla @param {string | undefined} anterior */
export const LIDER_DEFINIDO = (nome, cla, anterior) =>
  `${nome} agora lidera ${TAG(cla)}${anterior ? `; ${anterior} virou Vice` : ""}.`;
/** @param {Cla} cla */
export const VOCE_LIDER = (cla) => `O dono te colocou na liderança de ${TAG(cla)} ${cla.nome}.`;
/** @param {number} max */
export const NIVEL_INVALIDO = (max) => `Nível vai de 1 a ${max}.`;
/** @param {Cla} cla @param {number} raio @param {number} max */
export const NIVEL_DEFINIDO = (cla, raio, max) =>
  `${TAG(cla)} agora é nível ${cla.nivel} (até ${max} pessoas${cla.base ? `, base com raio ${raio}` : ""}).` +
  (cla.membros.length > max ? ` Atenção: tem ${cla.membros.length} pessoas, acima do limite (ninguém sai sozinho).` : "");
/** @param {number} nivel */
export const NIVEL_AVISO = (nivel) => `O dono mudou o nível do time para §e${nivel}§r.`;
/** @param {string} nome @param {Cla} cla */
export const JA_NO_TIME = (nome, cla) => `${nome} já é de ${TAG(cla)}.`;
/** @param {string} nome @param {Cla} novo @param {Cla | undefined} antigo */
export const COLOCADO = (nome, novo, antigo) =>
  `${nome} agora é de ${TAG(novo)}${antigo ? ` (saiu de ${TAG(antigo)})` : ""}.`;
/** @param {Cla} cla */
export const VOCE_COLOCADO = (cla) => `O dono te colocou no time ${TAG(cla)} ${cla.nome}.`;
/** @param {string} nome @param {boolean} eraLider */
export const SAIU_FORCADO = (nome, eraLider) => `O dono tirou ${nome} do time.${eraLider ? " O time ficou sem líder." : ""}`;
/** @param {string} nome */
export const SEM_TIME = (nome) => `${nome} não é de nenhum time.`;
/** @param {string} nome @param {Cla} cla */
export const NAO_E_DO_TIME = (nome, cla) => `${nome} não é de ${TAG(cla)}.`;
/** @param {string} nome @param {Cla} cla @param {boolean} eraLider */
export const REMOVIDO = (nome, cla, eraLider) => `${nome} saiu de ${TAG(cla)}.${eraLider ? " O time ficou sem líder." : ""}`;
/** @param {Cla} cla */
export const VOCE_REMOVIDO = (cla) => `O dono te tirou do time ${TAG(cla)}.`;
/**
 * @param {string} nome
 * @param {Cla | undefined} cla
 * @param {CargoCla | undefined} cargo
 * @param {string} lider
 * @param {boolean} online
 */
export const CONSULTA = (nome, cla, cargo, lider, online) =>
  cla
    ? `${nome}${online ? "" : " (offline)"}: ${TAG(cla)} ${cla.nome}, ${cargo ? NOME_CARGO[cargo] : "?"}. Líder: ${lider}. Nível ${cla.nivel}, ${cla.membros.length} pessoas.`
    : `${nome}${online ? "" : " (offline)"} não é de nenhum time.`;
export const SEM_LIDER = "ninguém";

// ---------------------------------------------------------------- guerras

export const MESMO_TIME = "Escolha dois times diferentes.";
/** @param {string} tag */
export const JA_EM_GUERRA = (tag) => `[${tag}] já está numa guerra. Finalize ou cancele antes.`;
/** Estado de uma bandeira na guerra. */
const ESTADOS = Object.freeze({ casa: "em casa", roubada: "roubada", caida: "caída" });
/** @param {number} minutos */
const DURACAO =(minutos) => (minutos % 60 === 0 ? `${minutos / 60}h` : `${minutos} min`);
/** @param {Guerra} g @param {number} minutos */
export const GUERRA_INICIADA = (g, minutos) =>
  `Guerra ${PAR(g)} começou agora (forçada, sem baú, ${DURACAO(minutos)}, ${g.ctf ? "com bandeiras" : "sem bandeiras: falta pedestal num dos times"}). Id: ${g.id}`;
/** @param {number} max */
export const MINUTOS_INVALIDOS = (max) => `Duração inválida: use minutos de 1 a ${max} (0 ou vazio = a duração padrão).`;
export const ROTULO_MINUTOS = "Duração em minutos (0 = padrão; evento: 15)";
export const VALOR_INVALIDO = "Valor inválido: use um número inteiro (somar aceita negativo; definir, 0 ou mais).";
/** @param {string} ref */
export const LADO_INVALIDO = (ref) => `"${ref}" não está nessa guerra.`;
/** @param {Guerra} g */
export const PONTOS_ALTERADOS = (g) => `Placar ajustado: ${PLACAR(g)}.`;
/** @param {Guerra} g */
export const PONTOS_AVISO = (g) => `O dono ajustou o placar da guerra: §f${PLACAR(g)}§r.`;
/** @param {GuerraFim} h */
export const GUERRA_FINALIZADA = (h) =>
  `Guerra finalizada: ${PLACAR(h)}. ${h.vencedor ? `Vencedor: [${h.tags[h.vencedor]}]` : "Sem vencedor"}${h.premio > 0 ? ` (baú de ${formatarNumero(h.premio)} Caudas pago)` : ""}.`;
/** @param {GuerraFim} h */
export const GUERRA_CANCELADA = (h) => `Guerra ${PAR(h)} cancelada: sem vencedor, sem prêmio; as apostas voltaram.`;
/** @param {string} tag */
export const JA_VENCEDOR = (tag) => `[${tag}] já é o vencedor dessa guerra.`;
/** @param {GuerraFim} h */
export const PREMIO_JA_PAGO = (h) =>
  `O baú (${formatarNumero(h.premio)} Caudas) já foi pago a [${h.vencedor ? h.tags[h.vencedor] : "?"}]; não troco o vencedor para não pagar duas vezes.`;
/** @param {GuerraFim} h */
export const VENCEDOR_CORRIGIDO = (h) =>
  `Vencedor da guerra ${PAR(h)} agora é [${h.vencedor ? h.tags[h.vencedor] : "?"}] (só no histórico; nenhum baú pago de novo).`;
/** @param {Guerra} g */
const LINHA_ATIVA = (g) => `§f${PLACAR(g)} §8• ${g.estado === "ativa" ? "§cativa" : "§eem aviso"}${g.forcada ? " §8• forçada" : ""} §8• id ${g.id}`;
/** @param {GuerraFim} h */
const LINHA_FIM = (h) =>
  `§8${formatarData(h.fim)} §f${PLACAR(h)} §7${h.vencedor ? `venceu [${h.tags[h.vencedor]}]` : "sem vencedor"} §8(${h.motivo}${h.forcada ? ", forçada" : ""}${h.porDono ? ", vencedor pelo dono" : ""})${h.id ? ` • id ${h.id}` : ""}`;
/** @param {Guerra[]} ativas @param {GuerraFim[]} historico */
export const LISTA_GUERRAS = (ativas, historico) =>
  [
    `§7Ativas (${ativas.length}):`,
    ...(ativas.length ? ativas.map(LINHA_ATIVA) : ["§8  nenhuma"]),
    `§7Finalizadas (${historico.length}):`,
    ...(historico.length ? historico.map(LINHA_FIM) : ["§8  nenhuma"]),
  ].join("\n");

// ---------------------------------------------------------------- painel

export const TITULO = "Painel de Dono";
/** @param {number} times @param {number} guerras @param {number} donos */
export const CORPO = (times, guerras, donos) =>
  [
    `§7Times: §f${times} §8• §7Guerras ativas: §f${guerras} §8• §7Donos: §f${donos}`,
    "§7Tudo aqui vale na hora, sem custo, e fica no Log do dono.",
  ].join("\n");
export const BOTAO_TIMES = "Times";
export const BOTAO_GUERRAS = "Guerras";
export const BOTAO_DONOS = "Donos";
export const BOTAO_LOG = "Log do dono";

export const TITULO_TIMES = "Times (dono)";
/** @param {number} n */
export const TIMES_CORPO = (n) => `§7${n} times. Escolha um para mexer, ou crie um novo.`;
export const BOTAO_CRIAR = "Criar time";
export const BOTAO_MOVER = "Mover jogador de time";
export const BOTAO_CONSULTAR = "Consultar jogador";
/** @param {Cla} cla @param {number} max */
export const BOTAO_TIME = (cla, max) => `§8[§${cla.cor}${cla.tag}§8]§r ${cla.nome}\n§8Nv ${cla.nivel} • ${cla.membros.length}/${max}`;
export const TITULO_CRIAR = "Criar time";
export const ROTULO_NOME = "Nome (3 a 24)";
export const ROTULO_TAG = "Tag (3 letras ou números)";
export const ROTULO_COR = "Cor";
export const ROTULO_LIDER = "Líder (nome; vazio = sem líder)";
export const ROTULO_JOGADOR = "Nome do jogador";
export const ROTULO_TIME = "Time";
export const ROTULO_NIVEL = "Nível";
/** @param {Cla} cla @param {string} lider @param {number} max @param {Guerra | undefined} guerra */
export const FICHA = (cla, lider, max, guerra) =>
  [
    `§8[§${cla.cor}${cla.tag}§8] §f${cla.nome} §8• id ${cla.id}`,
    `§7Líder: §f${lider}`,
    `§7Nível: §f${cla.nivel} §8• §7Membros: §f${cla.membros.length}/${max}`,
    `§7Pessoas: §f${cla.membros.map((m) => `${m.nome} (${NOME_CARGO[m.cargo]})`).join(", ") || "ninguém"}`,
    `§7Banco: §6${formatarNumero(cla.banco)} §8• §7Base: ${cla.base ? `§fraio ${cla.base.raio}` : "§8nenhuma"}`,
    LINHA_BANDEIRA(cla),
    guerra ? `§cGuerra: ${PLACAR(guerra)}` : "§7Sem guerra",
  ].join("\n");
export const BOTAO_LIDER = "Definir líder";
export const BOTAO_NIVEL = "Definir nível";
export const BOTAO_ADICIONAR = "Adicionar membro";
export const BOTAO_REMOVER = "Remover membro";
export const BOTAO_GUERRA_CONTRA = "Iniciar guerra contra...";
export const TITULO_REMOVER = "Remover membro";
export const TITULO_ALVO = "Guerra contra";
/** @param {Membro} m */
export const BOTAO_MEMBRO = (m) => `${m.nome}\n§8${NOME_CARGO[m.cargo]}`;
export const NINGUEM = "§7Ninguém aqui.";

export const TITULO_GUERRAS = "Guerras (dono)";
/** @param {number} n */
export const GUERRAS_CORPO = (n) => `§7${n} guerras em andamento. Escolha uma para mexer.`;
export const BOTAO_INICIAR = "Iniciar guerra agora";
export const BOTAO_HISTORICO = "Histórico";
/** @param {Guerra} g */
export const BOTAO_GUERRA = (g) => `${PLACAR(g)}\n§8${g.estado === "ativa" ? "ativa" : "em aviso"}${g.forcada ? " • forçada" : ""}`;
export const TITULO_INICIAR = "Iniciar guerra";
export const ROTULO_TIME_A = "Time A";
export const ROTULO_TIME_B = "Time B";
export const TITULO_GUERRA = "Guerra (dono)";
/** @param {Guerra} g */
export const GUERRA_CORPO = (g) =>
  [
    LINHA_ATIVA(g),
    `§7Abates: §f${Object.values(g.abates).reduce((s, x) => s + x.n, 0)}`,
    g.ctf
      ? `§7Bandeiras: [${g.tags.a}] §f${formatarCoords(g.ctf.a.pos)} §7(${ESTADOS[g.ctf.a.estado]}) §8• §7[${g.tags.b}] §f${formatarCoords(g.ctf.b.pos)} §7(${ESTADOS[g.ctf.b.estado]}) §8• §7capturas §f${g.ctf.capturas.a} x ${g.ctf.capturas.b}`
      : "§7Sem bandeiras (só abates)",
  ].join("\n");
export const BOTAO_PONTOS = "Alterar pontuação";
export const BOTAO_FINALIZAR = "Finalizar pelo placar";
/** @param {string} tag */
export const BOTAO_VENCE = (tag) => `Finalizar: vence [${tag}]`;
export const BOTAO_CANCELAR = "Cancelar (sem vencedor)";
export const TITULO_PONTOS = "Alterar pontuação";
export const ROTULO_LADO = "Time";
export const ROTULO_VALOR = "Valor (somar aceita negativo)";
export const ROTULO_DEFINIR = "Definir o valor (desligado = somar)";
export const CONFIRMA_FINALIZAR = "§7Finalizar a guerra agora? O vencedor leva o baú (se houver).";
export const CONFIRMA_CANCELAR = "§7Cancelar a guerra? Sem vencedor e sem prêmio; as apostas voltam.";
export const TITULO_HISTORICO = "Guerras finalizadas";
export const HISTORICO_VAZIO = "§7Nenhuma guerra finalizada.";
/** @param {GuerraFim} h */
export const BOTAO_FIM = (h) => `${PLACAR(h)}\n§8${formatarData(h.fim)} • ${h.vencedor ? `venceu [${h.tags[h.vencedor]}]` : "sem vencedor"}`;
/** @param {GuerraFim} h */
export const FIM_CORPO = (h) => LINHA_FIM(h);
/** @param {string} tag */
export const BOTAO_DEFINIR_VENCEDOR = (tag) => `Vencedor: [${tag}]`;

export const TITULO_DONOS = "Donos";
export const BOTAO_ADICIONAR_DONO = "Adicionar dono";
/** @param {string} nome */
export const BOTAO_TIRAR_DONO = (nome) => `Tirar ${nome}`;
/** @param {string} nome */
export const CONFIRMA_TIRAR_DONO = (nome) => `§7Tirar ${nome} da lista de donos?`;

export const TITULO_LOG = "Log do dono";
export const LOG_VAZIO = "§7Nada no log ainda.";
/** @param {LinhaLogDono} l */
export const LINHA_LOG = (l) =>
  `§8${formatarData(l.t)} ${new Date(l.t - 3 * 3600000).toISOString().slice(11, 16)} §f${l.a} §7${l.x}${l.al ? ` §f${l.al}` : ""} ${l.ok ? "§aok" : "§cerro"}${l.m ? ` §8${l.m}` : ""}`;

// ---------------------------------------------------------------- comando

export const DESC_DONO = "Painel de Dono (só donos). /vulpus:dono ajuda lista os atalhos";
export const AJUDA = [
  "§6Painel de Dono §7(/vulpus:dono sem nada abre o painel)",
  "§freivindicar §7- primeiro dono (só Operador, só sem dono)",
  "§fdonos §7| §fadddono <nome> §7| §fremdono <nome>",
  "§fcriar <nome> <TAG> [cor] [líder] §7- nome com espaço vai entre aspas",
  "§flider <TAG> <nome> §7| §fnivel <TAG> <1-8>",
  "§fadd <TAG> <nome> §7| §fremover <nome> §7| §fmover <nome> <TAG> §7| §ftime <nome>",
  "§fguerra <TAG> <TAG> [minutos] §7- começa agora, sem custo (minutos = modo evento, ex.: 15)",
  "§fpontos <TAG> <valor> [definir] §7- soma (ou define) os pontos do lado dessa TAG",
  "§ffinalizar <TAG|id> [TAG vencedora] §7| §fcancelar <TAG|id> §7| §fvencedor <TAG|id> <TAG>",
  "§fguerras §7| §flog",
].join("\n");
/** @param {string} acao */
export const ACAO_DESCONHECIDA = (acao) => `Não conheço "${acao}". Veja §e/vulpus:dono ajuda§c.`;
/** @param {string} uso */
export const USO = (uso) => `Faltou coisa. Uso: /vulpus:dono ${uso}`;
export const LOG_FALTOU = "faltou parâmetro";
