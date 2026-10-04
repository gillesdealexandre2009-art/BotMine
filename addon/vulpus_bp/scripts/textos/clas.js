// @ts-check
// Textos dos clãs, na voz da Kiza: curtos, leves e com gênero neutro. Glyphs só no corpo e nos botões
// (nunca em títulos de menu). Os de erro já saem em §c (util.erro).
import { formatarCoords, formatarData, formatarNumero, formatarTempo } from "../core/util.js";
import { barra, G, glyph } from "../glyphs.js";
import { EMBLEMAS, nomePintado, tagPintada } from "../sistemas/cla_dados.js";

/** @typedef {import("../sistemas/cla_dados.js").Cla} Cla */
/** @typedef {import("../sistemas/cla_dados.js").CargoCla} CargoCla */
/** @typedef {import("../sistemas/cla_dados.js").Permissao} Permissao */
/** @typedef {import("../sistemas/cla_dados.js").Membro} Membro */
/** @typedef {import("../sistemas/cla_dados.js").Movimento} Movimento */
/** @typedef {import("../sistemas/cla_dados.js").NivelCla} NivelCla */
/** @typedef {import("../sistemas/cla_dados.js").CasaCla} CasaCla */
/** @typedef {import("../sistemas/cla_guerra.js").Guerra} Guerra */
/** @typedef {import("../sistemas/cla_guerra.js").GuerraFim} GuerraFim */
/** @typedef {import("../core/db.js").Config} Config */

// ---------------------------------------------------------------- peças

/** "[ABC]" com a cor ou o tema do clã. @param {{ tag: string, cor: string, tema: string }} cla */
export const TAG = (cla) => `§8[${tagPintada(cla)}§8]§r`;
/** Emblema + [TAG] + nome pintado. @param {Cla} cla */
export const NOME = (cla) => `${glyph(EMBLEMAS[cla.emblema] ?? G.ESCUDO)} ${TAG(cla)} ${nomePintado(cla)}§r`;
/** [TAG] de uma guerra (só a tag e a cor guardadas nela). @param {Guerra} g @param {"a" | "b"} lado */
const TAG_GUERRA = (g, lado) => `§8[§${g.cores[lado]}${g.tags[lado]}§8]§r`;
/** @param {number} n */
const caudas = (n) => `${glyph(G.CAUDAS)} §6${formatarNumero(n)}§r`;

/**
 * "3d 4h", "5h 12min" ou "40s".
 * @param {number} segundos
 */
export function duracao(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  if (s < 86400) return formatarTempo(s);
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

export const NOME_CARGO = Object.freeze({ lider: "Líder", vice: "Vice", oficial: "Oficial", membro: "Membro", recruta: "Recruta" });
/** @type {Readonly<Record<Permissao, string>>} */
export const NOME_PERMISSAO = Object.freeze({
  construir: "Construir e mexer na base",
  convidar: "Convidar e aprovar pedidos",
  expulsar: "Expulsar (cargos abaixo)",
  promover: "Promover e rebaixar (cargos abaixo)",
  sacar: "Sacar do banco",
  terreno: "Base, proteções e casas do clã",
  guerra: "Guerras e alianças",
  editar: "Editar o clã e subir de nível",
});
/** @type {Readonly<Record<string, string>>} */
const CORES = Object.freeze({
  6: "Laranja", e: "Amarelo", a: "Verde", b: "Azul-claro", c: "Vermelho", d: "Rosa",
  9: "Azul", 5: "Roxo", 3: "Ciano", 2: "Verde-escuro", f: "Branco", g: "Dourado",
});
/** @param {string} cor */
export const NOME_COR = (cor) => CORES[cor] ?? cor;
const NOMES_EMBLEMA = ["Escudo", "Bandeira", "Torre", "Pata", "Troféu"];
/** @type {Readonly<Record<"tnt" | "creeper" | "explosoes" | "entidades", string>>} */
const NOMES_PROTECAO = Object.freeze({
  tnt: "TNT não quebra a base",
  creeper: "Creeper não quebra a base",
  explosoes: "Outras explosões não quebram",
  entidades: "Estranhos não põem entidades",
});

// ---------------------------------------------------------------- geral

export const HUB = (/** @type {number} */ n) => (n > 0 ? `Clã (${n})` : "Clã");
export const SEM_CLA = "Você ainda não tem clã. Dá uma olhada em /vulpus:cla!";
export const SEM_PERMISSAO = "Seu cargo no clã ainda não pode fazer isso.";
export const SO_LIDER = "Só quem lidera o clã pode fazer isso.";
export const SO_STAFF = "Esse truque é só da staff.";
export const CLA_SUMIU = "Esse clã não existe mais.";
export const MEMBRO_SUMIU = "Essa pessoa não está mais no clã.";
export const OFFLINE = "Não achei essa pessoa online.";
export const ERRO_GRAVAR = "Não consegui salvar agora. Tenta de novo daqui a pouco?";
export const JA_TEM_CLA = "Você já tem clã. Um de cada vez!";
/** @param {number} valor */
export const SEM_CAUDAS = (valor) => `Faltam Caudas: precisa de §e${formatarNumero(valor)}§c.`;
/** @param {number} max */
export const VALOR_INVALIDO = (max) => `Use um número inteiro de 1 a ${formatarNumero(max)}.`;
export const ACEITAR = "Aceitar";
export const RECUSAR = "Recusar";

export const NOME_PROBLEMA = Object.freeze({
  curto: "O nome do clã precisa de pelo menos 3 letras.",
  longo: "O nome do clã pode ter até 24 letras.",
  simbolo: "No nome, só letras, números, espaço, ponto, traço, apóstrofo e _.",
  repetido: "Já existe um clã com esse nome.",
  proibido: "Esse nome não combina com a toca. Escolhe outro?",
});
export const TAG_PROBLEMA = Object.freeze({
  formato: "A tag tem exatamente 3 letras ou números (A-Z, 0-9).",
  repetida: "Essa tag já é de outro clã.",
  proibido: "Essa tag não combina com a toca. Escolhe outra?",
});

// ---------------------------------------------------------------- sem clã, criar e procurar

export const TITULO_CLAS = "Clãs";
/** @param {number} custo @param {number} saldo */
export const SEM_CLA_CORPO = (custo, saldo) =>
  [
    "§7Clã é a sua turma na toca: tag no nome, base protegida, banco, casas e guerras.",
    "",
    `§7Criar custa ${caudas(custo)}§7. Você tem ${caudas(saldo)}§7.`,
    "§7Ou entre num clã: aceite um convite ou procure um aberto.",
  ].join("\n");
/** @param {number} n */
export const BOTAO_MEUS_CONVITES = (n) => `Convites recebidos (${n})`;
/** @param {number} custo */
export const BOTAO_CRIAR = (custo) => `Criar clã (${formatarNumero(custo)} Caudas)`;
export const BOTAO_PROCURAR = "Procurar clãs";
export const BOTAO_RANKING = "Ranking de clãs";
export const TITULO_CRIAR = "Criar clã";
export const ROTULO_NOME = "Nome do clã (3 a 24 letras)";
export const DICA_NOME = "Raposas da Lua";
export const ROTULO_TAG = "Tag (3 letras ou números)";
export const ROTULO_COR = "Cor da tag";
/** @param {string} nome @param {string} tag @param {string} cor @param {number} custo */
export const CONFIRMA_CRIAR = (nome, tag, cor, custo) =>
  `§7Criar §8[§${cor}${tag}§8] §${cor}${nome}§7 por ${caudas(custo)}§7?\n\n§7Você vira Líder. O nome e a tag aparecem para todo mundo.`;
/** @param {Cla} cla @param {string} quem */
export const CLA_CRIADO_ANUNCIO = (cla, quem) => `Nasceu um clã! ${NOME(cla)} §7por §f${quem}§7.`;
/** @param {Cla} cla @param {number} custo */
export const CLA_CRIADO = (cla, custo) =>
  `Clã ${TAG(cla)} criado${custo ? ` (-${formatarNumero(custo)} Caudas)` : ""}! Chame a galera e marque a base em Terreno.`;

export const TITULO_MEUS_CONVITES = "Convites recebidos";
export const MEUS_CONVITES_CORPO = "§7Cada convite vale 5 minutos.";
export const SEM_CONVITE = "Você não tem convite de clã agora.";
/** @param {string} tag */
export const SEM_CONVITE_TAG = (tag) => `Não achei convite do clã [${tag}].`;
export const VARIOS_CONVITES = "Você tem mais de um convite: diga a tag (ex.: /vulpus:claaceitar ABC).";
/** @param {Cla} cla @param {string} de */
export const BOTAO_CONVITE = (cla, de) => `${TAG(cla)} ${nomePintado(cla)}\n§7de ${de}`;
export const TITULO_CONVITE = "Convite de clã";
/** @param {Cla} cla */
export const CONVITE_DETALHE = (cla) =>
  `${NOME(cla)}\n§7Nível §f${cla.nivel} §8• §7${cla.membros.length} pessoas\n${cla.desc ? `§f${cla.desc}` : ""}`;

export const TITULO_PROCURAR = "Procurar clãs";
export const PROCURAR_CORPO = "§7Aberto: entra na hora. Fechado: você pede e alguém do clã aprova.";
export const NENHUM_CLA = "§7Nenhum clã ainda. Que tal criar o primeiro?";
/** @param {Cla} cla @param {number} max */
export const BOTAO_CLA_LISTA = (cla, max) =>
  `${TAG(cla)} ${nomePintado(cla)}\n§7Nv ${cla.nivel} §8• §7${cla.membros.length}/${max} §8• ${cla.aberto ? "§aaberto" : "§7fechado"}`;
/** @param {string} tag */
export const TITULO_VER = (tag) => `Clã ${tag}`;
/** @param {Cla} cla @param {string} lider @param {number} max */
export const FICHA = (cla, lider, max) =>
  [
    NOME(cla),
    cla.desc ? `§f${cla.desc}` : "§8(sem descrição)",
    "",
    `§7Líder: §f${lider}`,
    `§7Nível: §f${cla.nivel} §8• §7Membros: §f${cla.membros.length}/${max}`,
    `§7Fundado em §f${formatarData(cla.criado)}`,
    `§7Entrada: ${cla.aberto ? "§aaberta" : "§7por pedido"}`,
  ].join("\n");
/** No lugar do nome do líder, quando o time está sem líder (Painel de Dono). */
export const SEM_LIDER = "§8sem líder";
export const BOTAO_ENTRAR = "Entrar no clã";
export const BOTAO_PEDIR = "Pedir para entrar";

// ---------------------------------------------------------------- visão geral

export const TITULO_CLA = "Meu clã";
/**
 * @param {{ cla: Cla, info: { atual: NivelCla, proximo?: NivelCla, fracao: number }, online: number,
 *   cargo: CargoCla, guerra: Guerra | undefined }} v
 */
export const VISAO = ({ cla, info, online, cargo, guerra }) =>
  [
    NOME(cla),
    cla.desc ? `§f${cla.desc}` : "",
    `§7Seu cargo: §f${NOME_CARGO[cargo]}`,
    "",
    `${glyph(G.NIVEL)} §7Nível §f${cla.nivel}${info.proximo ? ` §8• §7XP §f${formatarNumero(cla.xp)}§7/${formatarNumero(info.proximo.xp)}` : " §8• §6máximo"}`,
    info.proximo ? barra(info.fracao, 10) : "",
    `${glyph(G.CAUDAS)} §7Banco: §6${formatarNumero(cla.banco)}`,
    `${glyph(G.ONLINE)} §7Membros: §f${cla.membros.length}/${info.atual.membros} §8• §a${online} online`,
    `${glyph(G.LOCAL)} §7Base: ${cla.base ? `§f${formatarCoords(cla.base)} §8• §7raio §f${cla.base.raio}` : "§8sem base"}`,
    guerra ? `${glyph(G.GUERRA)} ${guerra.estado === "ativa" ? "§cEM GUERRA" : "§eGuerra marcada"}` : "",
  ]
    .filter((l, i) => l !== "" || i === 3)
    .join("\n");
/** @param {number} n @param {number} max */
export const BOTAO_MEMBROS = (n, max) => `Membros (${n}/${max})`;
/** @param {number} pedidos */
export const BOTAO_CONVITES = (pedidos) => (pedidos ? `Convites e pedidos (${pedidos})` : "Convites e pedidos");
/** @param {number} banco */
export const BOTAO_BANCO = (banco) => `Banco ${glyph(G.CAUDAS)} §6${formatarNumero(banco)}`;
export const BOTAO_TERRENO = "Terreno e proteção";
/** @param {number} n @param {number} max */
export const BOTAO_CASAS = (n, max) => `Casas do clã (${n}/${max})`;
/** @param {boolean} em */
export const BOTAO_GUERRAS = (em) => (em ? `Guerra ${glyph(G.GUERRA)}` : "Guerras");
/** @param {number} n @param {number} pedidos */
export const BOTAO_ALIADOS = (n, pedidos) => `Aliados (${n})${pedidos ? ` §e+${pedidos}` : ""}`;
export const BOTAO_AJUSTES = "Ajustes do clã";
/** @param {number} nivel */
export const BOTAO_EVOLUIR = (nivel) => `Subir para o nível ${nivel}`;
export const BOTAO_SAIR = "Sair do clã";
export const BOTAO_DISSOLVER = "Dissolver o clã";

// ---------------------------------------------------------------- membros e cargos

export const TITULO_MEMBROS = "Membros";
/** @param {number} n @param {number} max */
export const MEMBROS_CORPO = (n, max) => `§7${n} de ${max} vagas. Toque em alguém para ver as opções.`;
/** @param {Membro} m @param {boolean} online */
export const BOTAO_MEMBRO = (m, online) => `${online ? "§a• " : "§8• "}§f${m.nome}\n§7${NOME_CARGO[m.cargo]}`;
/** @param {string} nome */
export const TITULO_MEMBRO = (nome) => `Membro: ${nome}`;
/** @param {Membro} m @param {boolean} online */
export const MEMBRO_CORPO = (m, online) =>
  [`§f${m.nome} ${online ? "§a• online" : "§8• offline"}`, `§7Cargo: §f${NOME_CARGO[m.cargo]}`, `§7No clã desde §f${formatarData(m.desde)}`].join("\n");
export const BOTAO_PROMOVER = "Promover";
export const BOTAO_REBAIXAR = "Rebaixar";
export const BOTAO_EXPULSAR = "Expulsar";
export const BOTAO_LIDERANCA = "Passar a liderança";
export const TITULO_EXPULSAR = "Expulsar";
/** @param {string} nome */
export const CONFIRMA_EXPULSAR = (nome) => `§7Tirar §f${nome}§7 do clã?`;
export const TITULO_LIDERANCA = "Passar a liderança";
/** @param {string} nome */
export const CONFIRMA_LIDERANCA = (nome) => `§7Passar a liderança para §f${nome}§7?\n§7Você vira Vice. Não dá para desfazer sozinho.`;
export const CARGO_ACIMA = "Só dá para mexer em quem tem cargo abaixo do seu.";
export const CARGO_TETO = "Esse cargo já é o mais alto que você pode dar.";
export const CARGO_PISO = "Recruta já é o primeiro cargo.";
/** @param {string} nome @param {CargoCla} cargo @param {boolean} subiu */
export const CARGO_MUDOU = (nome, cargo, subiu) => `§f${nome}§r ${subiu ? "subiu" : "passou"} para §e${NOME_CARGO[cargo]}§r.`;
/** @param {string} nome */
export const NOVO_LIDER = (nome) => `§f${nome}§r agora lidera o clã!`;
/** @param {string} nome @param {string} por */
export const EXPULSO = (nome, por) => `§f${nome}§r saiu do clã (por ${por}).`;
/** @param {Cla} cla */
export const EXPULSO_AVISO = (cla) => `Você foi tirado do clã ${TAG(cla)}§c.`;
export const LIDER_NAO_SAI = "Quem lidera não sai assim: passe a liderança ou dissolva o clã.";
/** @param {Cla} cla */
export const CONFIRMA_SAIR = (cla) => `§7Sair do clã ${TAG(cla)}§7?`;
/** @param {Cla} cla */
export const SAIU_OK = (cla) => `Você saiu do clã ${TAG(cla)}. Boa estrada!`;
/** @param {string} nome */
export const SAIU = (nome) => `§f${nome}§r saiu do clã.`;

// ---------------------------------------------------------------- convites e pedidos

export const TITULO_CONVITES = "Convites e pedidos";
/** @param {boolean} aberto @param {boolean} podeConvidar @param {number} pedidos */
export const CONVITES_CORPO = (aberto, podeConvidar, pedidos) =>
  [
    `§7Entrada: ${aberto ? "§aaberta (entra direto)" : "§7por pedido"}`,
    podeConvidar ? `§7Pedidos esperando: §f${pedidos}` : "§7Seu cargo ainda não convida nem aprova pedidos.",
  ].join("\n");
export const BOTAO_CONVIDAR = "Convidar alguém online";
/** @param {string} nome */
export const BOTAO_PEDIDO = (nome) => `Pedido de ${nome}`;
export const TITULO_PEDIDO = "Pedido de entrada";
/** @param {string} nome */
export const PEDIDO_DETALHE = (nome) => `§f${nome}§7 quer entrar no clã.`;
export const TITULO_CONVIDAR = "Convidar";
export const CONVIDAR_CORPO = "§7Quem está online e sem clã:";
export const NINGUEM_SEM_CLA = "§7Todo mundo online já tem clã.";
export const CONVITE_SI_MESMO = "Você já está no próprio clã!";
/** @param {string} nome */
export const CONVITE_JA_TEM = (nome) => `${nome} já tem clã.`;
/** @param {number} max */
export const CLA_CHEIO = (max) => `O clã está cheio (${max} vagas). Suba de nível para abrir mais.`;
/** @param {Cla} cla @param {string} de */
export const CONVITE_RECEBIDO = (cla, de) =>
  `§f${de}§r te chamou para o clã ${NOME(cla)}§r! Use §e/vulpus:claaceitar ${cla.tag}§r ou o menu (vale 5 min).`;
/** @param {string} nome */
export const CONVITE_ENVIADO = (nome) => `Convite enviado para §f${nome}§r. Vale 5 minutos.`;
export const CONVITE_RECUSADO = "Convite recusado.";
/** @param {string} nome */
export const CONVITE_RECUSOU = (nome) => `§f${nome}§r recusou o convite.`;
/** @param {string} nome */
export const ENTROU = (nome) => `Gente nova no clã: §f${nome}§r! Recebam com carinho.`;
/** @param {Cla} cla */
export const BEM_VINDO_CLA = (cla) => `Que bom ter você no clã ${NOME(cla)}§r! Você começa como Recruta.`;
export const JA_PEDIU = "Você já pediu para entrar nesse clã. Espera a resposta!";
export const PEDIDOS_CHEIOS = "Esse clã tem pedidos demais esperando. Tenta mais tarde.";
/** @param {Cla} cla */
export const PEDIDO_ENVIADO = (cla) => `Pedido enviado para ${TAG(cla)}. Vale 3 dias.`;
/** @param {string} nome */
export const PEDIDO_NOVO = (nome) => `§f${nome}§r quer entrar no clã. Veja em Clã > Convites e pedidos.`;
export const PEDIDO_SUMIU = "Esse pedido não está mais valendo.";
/** @param {string} nome */
export const PEDIDO_RECUSADO = (nome) => `Pedido de §f${nome}§r recusado.`;
/** @param {Cla} cla */
export const PEDIDO_RECUSADO_AVISO = (cla) => `O clã ${TAG(cla)} recusou seu pedido. Tem outros por aí!`;
/** @param {number} pedidos @param {number} aliancas */
export const PENDENTES_AO_ENTRAR = (pedidos, aliancas) =>
  `Seu clã tem ${[pedidos ? `§e${pedidos}§r pedido(s) de entrada` : "", aliancas ? `§e${aliancas}§r pedido(s) de aliança` : ""]
    .filter(Boolean)
    .join(" e ")} esperando. /vulpus:cla`;

// ---------------------------------------------------------------- banco e nível

export const TITULO_BANCO = "Banco do clã";
/** @param {{ banco: number, saldo: number, livre: number, porXp: number }} b */
export const BANCO_CORPO = ({ banco, saldo, livre, porXp }) =>
  [
    `§7No banco: ${caudas(banco)}`,
    `§7Com você: ${caudas(saldo)}`,
    `§7Seu saque hoje: ${livre === Infinity ? "§fsem limite" : livre > 0 ? `§faté ${formatarNumero(livre)}` : "§8nenhum"}`,
    "",
    `§7Cada ${formatarNumero(porXp)} Caudas depositadas (acima do que já foi sacado) viram 1 XP do clã.`,
  ].join("\n");
export const BOTAO_DEPOSITAR = "Depositar";
export const BOTAO_SACAR = "Sacar";
export const BOTAO_EXTRATO = "Extrato (últimos 30)";
export const TITULO_DEPOSITAR = "Depositar no clã";
export const TITULO_SACAR = "Sacar do clã";
export const ROTULO_VALOR = "Quantas Caudas?";
export const TITULO_EXTRATO = "Extrato";
export const EXTRATO_VAZIO = "§7Nada por aqui ainda.";
/** @type {Readonly<Record<string, string>>} */
const TIPOS_MOV = Object.freeze({
  criacao: "criação", deposito: "depósito", saque: "saque", nivel: "nível", guerra: "guerra",
  premio: "prêmio", devolucao: "devolução", casa: "casa", base: "base", staff: "staff",
});
/** @param {Movimento} m */
export const LINHA_EXTRATO = (m) =>
  `§8${formatarData(m.t)} ${m.v > 0 ? "§a+" : "§c"}${formatarNumero(m.v)} §7${TIPOS_MOV[m.k] ?? m.k} §8• §f${m.a}`;
/** @param {number} valor @param {number} banco */
export const DEPOSITOU = (valor, banco) => `Depositou §6${formatarNumero(valor)}§r. Banco: §6${formatarNumero(banco)}§r.`;
/** @param {number} valor @param {number} banco */
export const SACOU = (valor, banco) => `Sacou §6${formatarNumero(valor)}§r. Banco: §6${formatarNumero(banco)}§r.`;
/** @param {string} nome @param {number} valor */
export const SAQUE_AVISO = (nome, valor) => `§f${nome}§r sacou §6${formatarNumero(valor)}§r do banco do clã.`;
/** @param {number} livre */
export const LIMITE_SAQUE = (livre) =>
  livre > 0 ? `Hoje você ainda pode sacar §e${formatarNumero(livre)}§c.` : "Seu cargo não tem saque livre hoje.";
/** @param {number} banco */
export const BANCO_SEM_SALDO = (banco) => `O banco do clã só tem §e${formatarNumero(banco)}§c.`;
export const BANCO_FALHOU = "O banco não fechou a conta. Nada foi mexido.";
export const NIVEL_MAXIMO = "O clã já está no nível máximo!";
/** @param {number} falta */
export const FALTA_XP = (falta) => `Faltam §e${formatarNumero(falta)}§c XP para o próximo nível.`;
/** @param {number} custo */
export const FALTA_BANCO = (custo) => `O próximo nível custa §e${formatarNumero(custo)}§c Caudas do banco.`;
export const TITULO_EVOLUIR = "Subir de nível";
/** @param {Cla} cla @param {NivelCla} prox */
export const CONFIRMA_EVOLUIR = (cla, prox) =>
  [
    `§7Nível §f${cla.nivel} §7→ §f${prox.nivel}`,
    `§7XP: §f${formatarNumero(cla.xp)}§7/${formatarNumero(prox.xp)} ${cla.xp >= prox.xp ? "§a✔" : "§c✖"}`,
    `§7Custo: ${caudas(prox.custo)} §7(banco: §6${formatarNumero(cla.banco)}§7) ${cla.banco >= prox.custo ? "§a✔" : "§c✖"}`,
    "",
    `§7Ganha: §f${prox.membros} vagas§7, base de raio §f${prox.raio}§7, §f${prox.casas}§7 casas, mais cores e emblemas.`,
  ].join("\n");
/** @param {Cla} cla */
export const CLA_SUBIU_ANUNCIO = (cla) => `O clã ${NOME(cla)}§r subiu para o nível §e${cla.nivel}§r! A toca aplaude.`;
/** @param {number} nivel */
export const TITULO_SUBIU = (nivel) => `§6Clã nível ${nivel}!`;
/** @param {Cla} cla */
export const SUBTITULO_SUBIU = (cla) => `§7${cla.nome} está maior`;

// ---------------------------------------------------------------- terreno

export const TITULO_TERRENO = "Terreno";
/** @param {{ cla: Cla, raioNivel: number, zona: number, custo: number, recarga: number }} t */
export const TERRENO_CORPO = ({ cla, raioNivel, zona, custo, recarga }) =>
  [
    cla.base
      ? `${glyph(G.LOCAL)} §7Centro: §f${formatarCoords(cla.base)} §8(Mundo normal)`
      : "§7Sem base. Fique no centro do terreno e toque em Marcar base aqui.",
    cla.base ? `§7Tamanho: §f${2 * cla.base.raio + 1}x${2 * cla.base.raio + 1} §7(raio ${cla.base.raio} de ${raioNivel} do nível)` : `§7Raio do nível: §f${raioNivel}`,
    `§7Zona de amortecimento: §f${zona} §7blocos em volta (sem redstone de fora)`,
    "",
    `§7Proteção: quem é de fora não quebra, não coloca, não abre baú e não usa portas e botões.`,
    `§7${cla.base ? "Mover" : "Marcar"} custa ${caudas(custo)}§7${recarga > 0 ? ` §8• §7liberado em §f${duracao(recarga / 1000)}` : ""}`,
  ].join("\n");
export const BOTAO_LIMITES = "Ver os limites (partículas)";
export const BOTAO_CRESCER = "Crescer a base até o nível";
/** @param {number} raio */
export const BASE_CRESCEU = (raio) => `A base cresceu: agora tem raio §f${raio}§r.`;
export const BASE_SEM_ESPACO = "Ainda não tem espaço para crescer (vizinhos ou spawn por perto).";
/** @param {number} custo */
export const BOTAO_MARCAR_BASE = (custo) => `Marcar base aqui${custo ? ` (${formatarNumero(custo)})` : " (grátis)"}`;
/** @param {number} custo */
export const BOTAO_MOVER_BASE = (custo) => `Mover base para cá (${formatarNumero(custo)})`;
/** @param {boolean} mover @param {number} custo */
export const CONFIRMA_BASE = (mover, custo) =>
  `§7${mover ? "Mudar o centro da base para onde você está" : "Marcar o centro da base onde você está"}?\n` +
  `§7Custo: ${custo ? caudas(custo) : "§agrátis"}§7. Depois, só dá para mover de novo daqui a um tempo.`;
/** @param {"tnt" | "creeper" | "explosoes" | "entidades"} chave @param {boolean} ligado */
export const BOTAO_PROTECAO = (chave, ligado) => `${NOMES_PROTECAO[chave]}: ${ligado ? "§asim" : "§cnão"}`;
/** @param {"tnt" | "creeper" | "explosoes" | "entidades"} chave @param {boolean} ligado */
export const PROTECAO_MUDOU = (chave, ligado) => `${NOMES_PROTECAO[chave]}: ${ligado ? "§aligado" : "§cdesligado"}§r.`;
/** @param {boolean} ligado */
export const BOTAO_ACESSO_ALIADOS = (ligado) => `Aliados abrem portas e baús: ${ligado ? "§asim" : "§cnão"}`;
/** @param {number} n */
export const BOTAO_CONFIANCA = (n) => `Pessoas de confiança (${n})`;
export const BOTAO_DESMARCAR = "Tirar a base";
export const CONFIRMA_DESMARCAR = "§7Tirar a base? A área fica livre para todo mundo.";
export const SEM_BASE = "O clã ainda não tem base.";
export const BASE_SO_OVERWORLD = "A base só pode ficar no Mundo normal.";
export const BASE_EM_GUERRA = "No meio de uma guerra a base não muda.";
/** @param {number} segundos */
export const BASE_RECARGA = (segundos) => `A base mudou há pouco. Dá para mover de novo em §e${duracao(segundos)}§c.`;
/** @param {number} distancia */
export const BASE_PERTO_SPAWN = (distancia) => `Muito perto do spawn: a borda da base precisa ficar a ${distancia} blocos dele.`;
/** @param {string} tag */
export const BASE_PERTO_OUTRA = (tag) => `Sem espaço aqui: encosta na base de [${tag}] (ou na zona dela). Afaste um pouco.`;
/** @param {number} custo */
export const BASE_SEM_BANCO = (custo) => `Marcar a base aqui custa §e${formatarNumero(custo)}§c Caudas do banco.`;
/** @param {string} coords @param {number} raio @param {number} custo */
export const BASE_MARCADA = (coords, raio, custo) =>
  `Base marcada em §f${coords}§r (raio ${raio})${custo ? `, §6-${formatarNumero(custo)}§r do banco` : ""}. Olha as partículas!`;
/** @param {number} raio */
export const BASE_APERTADA = (raio) => `A base ficou menor que o raio ${raio} do nível por falta de espaço (vizinhos ou spawn).`;
export const BASE_DESMARCADA = "Base tirada. A área está livre.";
export const BASE_SEM_CONSTRUIR = "§cSeu cargo ainda não mexe na base do clã.";
/** @param {Cla} cla */
export const BASE_PROTEGIDA = (cla) => `§cTerritório de ${TAG(cla)}§c: só o clã mexe aqui.`;
/** @param {Cla} cla */
export const ZONA_PROTEGIDA = (cla) => `§cPerto da base de ${TAG(cla)}§c: sem redstone, líquidos ou entidades de fora.`;
/** @param {Cla} cla @param {boolean} meu @param {boolean} guerra */
export const ENTROU_TERRITORIO = (cla, meu, guerra) =>
  `${glyph(EMBLEMAS[cla.emblema] ?? G.ESCUDO)} §7Território de ${TAG(cla)} ${nomePintado(cla)}§r${meu ? " §a(casa)" : guerra ? " §c(em guerra!)" : ""}`;
/** @param {Cla} cla */
export const SAIU_TERRITORIO = (cla) => `§8Saindo do território de ${TAG(cla)}`;
export const TITULO_CONFIANCA = "Pessoas de confiança";
/** @param {number} n */
export const CONFIANCA_CORPO = (n) => `§7Gente de fora que pode construir na base (${n}/10). Toque para tirar ou dar confiança:`;
/** @param {string} nome */
export const BOTAO_TIRAR_CONFIANCA = (nome) => `§a✔ §f${nome} §7(tirar)`;
/** @param {string} nome */
export const BOTAO_DAR_CONFIANCA = (nome) => `§f${nome} §7(dar confiança)`;
export const CONFIANCA_MEMBRO = "Quem é do clã já mexe na base.";
export const CONFIANCA_JA = "Essa pessoa já é de confiança.";
/** @param {number} n */
export const CONFIANCA_CHEIA = (n) => `Já são ${n} pessoas de confiança.`;
/** @param {string} nome */
export const CONFIANCA_OK = (nome) => `§f${nome}§r agora constrói na base.`;
/** @param {Cla} cla */
export const CONFIANCA_AVISO = (cla) => `O clã ${TAG(cla)} te deu confiança: você pode construir na base dele.`;
export const CONFIANCA_TIRADA = "Confiança tirada.";

// ---------------------------------------------------------------- casas do clã

export const TITULO_CASAS = "Casas do clã";
/** @param {number} n @param {number} max @param {number} custo */
export const CASAS_CORPO = (n, max, custo) => `§7${n} de ${max} casas. Criar uma custa ${caudas(custo)}§7 do banco. Todo membro pode ir.`;
/** @param {CasaCla} casa */
export const BOTAO_CASA = (casa) => `${casa.nome}\n§7${formatarCoords(casa)}`;
/** @param {string} nome */
export const TITULO_CASA = (nome) => `Casa: ${nome}`;
/** @param {CasaCla} casa */
export const CASA_DETALHE = (casa) => `§7${formatarCoords(casa)}`;
export const BOTAO_IR = "Ir para lá";
export const BOTAO_APAGAR_CASA = "Apagar casa";
/** @param {string} nome */
export const CONFIRMA_APAGAR_CASA = (nome) => `§7Apagar a casa §f${nome}§7? O custo não volta.`;
export const BOTAO_NOVA_CASA = "Nova casa aqui";
export const TITULO_NOVA_CASA = "Nova casa do clã";
export const ROTULO_CASA = "Nome da casa (até 16 letras)";
export const CASA_PADRAO = "Sede";
/** @param {number} max */
export const CASA_NOME_LONGO = (max) => `O nome da casa pode ter até ${max} letras.`;
export const CASA_REPETIDA = "Já tem uma casa com esse nome.";
/** @param {number} max */
export const CASA_LIMITE = (max) => `O clã já tem ${max} casas. Suba de nível para ter mais.`;
export const CASA_SUMIU = "Não achei essa casa do clã.";
export const SEM_CASAS = "O clã ainda não tem casas.";
/** @param {string} nome @param {number} custo */
export const CASA_CRIADA = (nome, custo) => `Casa do clã §f${nome}§r criada${custo ? ` (§6-${formatarNumero(custo)}§r do banco)` : ""}.`;
/** @param {string} nome */
export const CASA_AVISO = (nome) => `Casa nova do clã: §f${nome}§r. Use /vulpus:clacasa ${nome}`;
/** @param {string} nome */
export const CASA_APAGADA = (nome) => `Casa §f${nome}§r apagada.`;
/** @param {Cla} cla @param {string} nome */
export const DESTINO_CASA = (cla, nome) => `[${cla.tag}] ${nome}`;

// ---------------------------------------------------------------- guerras

export const TITULO_GUERRAS = "Guerras";
/** @param {Config} cfg */
export const SEM_GUERRA_CORPO = (cfg) =>
  [
    "§7Nenhuma guerra agora.",
    "",
    `§7Como funciona: a guerra começa ${cfg.guerraAvisoMin} min depois de declarada e dura ${cfg.duracaoGuerraHoras}h.`,
    "§7Durante ela, a base de cada lado fica aberta só para o outro clã.",
    "§7Cada abate entre os dois clãs vale 1 ponto. Quem tiver mais pontos leva o baú de guerra.",
    `§7A mesma vítima só vale ponto de novo depois de ${cfg.guerraAntiFarmMin} min.`,
    `§7Extras: 3, 5 e 10 abates seguidos sem morrer (§a+${cfg.guerraBonusSequencia}§7) e a cabeça do líder inimigo (§a+${cfg.guerraBonusLider}§7, 1x por hora).`,
    "§7No fim, quem mais abateu vira o §6Caçador§7 da guerra.",
    `§7Baú: ${caudas(cfg.custoGuerra)} §7de cada banco (o alvo põe o que tiver, até isso).`,
  ].join("\n");
/** @param {Guerra} g @param {string} claId */
export const GUERRA_CORPO = (g, claId) => {
  const agora = Date.now();
  const top = Object.values(g.abates)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((x) => `§7  ${x.nome} §8(${g.tags[x.lado]}) §f${x.n}`);
  return [
    `${TAG_GUERRA(g, "a")} §f${g.pontos.a} §7x §f${g.pontos.b} ${TAG_GUERRA(g, "b")}`,
    g.estado === "ativa"
      ? `§cEm guerra! §7Acaba em §f${duracao((g.fim - agora) / 1000)}`
      : `§eComeça em §f${duracao((g.inicio - agora) / 1000)}`,
    `§7Baú de guerra: ${caudas(g.aposta.a + g.aposta.b)}`,
    `§7Vocês ${g.a === claId ? "declararam" : "foram desafiados"}.`,
    ...(top.length ? ["", "§7Mais abates:", ...top] : []),
  ].join("\n");
};
export const BOTAO_DECLARAR = "Declarar guerra";
export const BOTAO_RENDER = "Render-se";
export const CONFIRMA_RENDER = "§7Render-se? O outro clã vence na hora e leva o baú de guerra.";
export const BOTAO_HISTORICO = "Histórico";
export const TITULO_HISTORICO = "Guerras passadas";
export const HISTORICO_VAZIO = "§7Nenhuma guerra ainda. Paz na toca!";
/** @type {Readonly<Record<GuerraFim["motivo"], string>>} */
const MOTIVOS_FIM = Object.freeze({
  tempo: "fim do tempo",
  rendicao: "rendição",
  staff: "encerrada pela staff",
  dissolvido: "clã dissolvido",
  dono: "finalizada pelo dono",
  cancelada: "cancelada pelo dono",
});
/** @param {GuerraFim} h @param {string} claId */
export const LINHA_HISTORICO = (h, claId) => {
  const meu = h.a === claId ? "a" : "b";
  const resultado = h.vencedor === null ? "§7empate" : h.vencedor === meu ? "§avitória" : "§cderrota";
  const cacador = h.cacador ? ` §8• §6Caçador: §f${h.cacador.nome} §8(${h.cacador.n})` : "";
  const extras = `${h.forcada ? " §8• forçada" : ""}${h.porDono ? " §8• vencedor pelo dono" : ""}`;
  return `§8${formatarData(h.fim)} §f[${h.tags.a}] ${h.pontos.a} x ${h.pontos.b} [${h.tags.b}] ${resultado} §8(${MOTIVOS_FIM[h.motivo] ?? h.motivo})${cacador}${extras}`;
};
export const TITULO_DECLARAR = "Declarar guerra";
/** @param {number} custo */
export const DECLARAR_CORPO = (custo) => `§7Declarar custa ${caudas(custo)}§7 do banco (vai para o baú de guerra). Escolha o alvo:`;
/** @param {Cla} alvo */
export const BOTAO_ALVO = (alvo) => `${TAG(alvo)} ${nomePintado(alvo)}\n§7Nv ${alvo.nivel} §8• §7${alvo.membros.length} pessoas`;
/** @param {Cla} alvo @param {string} motivo */
export const ALVO_BLOQUEADO = (alvo, motivo) => `§8[${alvo.tag}] ${alvo.nome}: §7${motivo}`;
/** @param {Cla} alvo @param {Config} cfg */
export const CONFIRMA_DECLARAR = (alvo, cfg) =>
  `§7Declarar guerra a ${TAG(alvo)} ${nomePintado(alvo)}§7?\n\n§7Começa em ${cfg.guerraAvisoMin} min e dura ${cfg.duracaoGuerraHoras}h. ` +
  `§7Sai ${caudas(cfg.custoGuerra)} §7do banco agora. Todo mundo fica sabendo.`;
export const GUERRA_SI_MESMO = "Guerra contra o próprio clã? Nem a Kiza briga com a própria cauda.";
export const GUERRA_ALIADO = "são aliados";
export const GUERRA_JA_EM_GUERRA = "seu clã já tem uma guerra";
/** @param {string} tag */
export const GUERRA_ALVO_OCUPADO = (tag) => `[${tag}] já está em guerra`;
/** @param {number} nivel */
export const GUERRA_NIVEL = (nivel) => `os dois clãs precisam ter nível ${nivel}+`;
/** @param {number} n */
export const GUERRA_MEMBROS = (n) => `os dois clãs precisam ter ${n}+ pessoas`;
/** @param {number} segundos */
export const GUERRA_RECARGA = (segundos) => `trégua por mais ${duracao(segundos)}`;
/** @param {number} custo */
export const GUERRA_SEM_BANCO = (custo) => `o banco precisa de ${formatarNumero(custo)} Caudas`;
export const SEM_GUERRA = "Seu clã não está em guerra.";
/** @param {Guerra} g @param {number} minutos */
export const GUERRA_DECLARADA = (g, minutos) =>
  `${glyph(G.GUERRA)} ${TAG_GUERRA(g, "a")} declarou guerra a ${TAG_GUERRA(g, "b")}! Começa em §e${minutos} min§r.`;
/** @param {number} aposta */
export const GUERRA_REGRAS = (aposta) =>
  `Guerra marcada! Quando começar, a base de cada lado abre só para o inimigo e cada abate vale 1 ponto (sequências e a cabeça do líder valem extra). Baú: §6${formatarNumero(aposta)}§r de cada lado.`;
/** @param {Guerra} g @param {number} minutos */
export const GUERRA_LEMBRETE = (g, minutos) => `${glyph(G.GUERRA)} A guerra ${TAG_GUERRA(g, "a")} x ${TAG_GUERRA(g, "b")} começa em §e${minutos} min§r. Preparem-se!`;
/** @param {Guerra} g */
export const GUERRA_COMECOU = (g) =>
  `${glyph(G.GUERRA)} §cComeçou a guerra§r ${TAG_GUERRA(g, "a")} x ${TAG_GUERRA(g, "b")}! Baú: §6${formatarNumero(g.aposta.a + g.aposta.b)}§r Caudas.`;
export const TITULO_GUERRA = "§cGUERRA!";
/** @param {Guerra} g */
export const SUBTITULO_GUERRA = (g) => `§7[${g.tags.a}] x [${g.tags.b}]`;
/** @param {Guerra} g @param {"a" | "b" | null} vencedor @param {GuerraFim["motivo"]} motivo @param {number} premio */
export const GUERRA_TERMINOU = (g, vencedor, motivo, premio) =>
  `${glyph(G.GUERRA)} Fim da guerra ${TAG_GUERRA(g, "a")} §f${g.pontos.a} x ${g.pontos.b} ${TAG_GUERRA(g, "b")} §8(${MOTIVOS_FIM[motivo]})§r. ` +
  (vencedor
    ? premio > 0
      ? `Vitória de ${TAG_GUERRA(g, vencedor)}, que leva §6${formatarNumero(premio)}§r Caudas!`
      : `Vitória de ${TAG_GUERRA(g, vencedor)}!`
    : motivo === "cancelada"
      ? "Sem vencedor: cada lado recebe a sua parte de volta."
      : "Empate: cada lado recebe a sua parte de volta.");
/** @param {Guerra} g @param {string} tag @param {string} matador @param {string} vitima */
export const ABATE = (g, tag, matador, vitima) =>
  `${glyph(G.GUERRA)} §f${matador} §8[${tag}] §7abateu §f${vitima}§7. Placar: §f[${g.tags.a}] ${g.pontos.a} x ${g.pontos.b} [${g.tags.b}]`;
/** @param {string} vitima @param {number} minutos */
export const ABATE_REPETIDO = (vitima, minutos) => `§7Esse abate não conta: §f${vitima}§7 já rendeu ponto há pouco. Vale de novo em §f${minutos} min§7.`;
/** Nome de cada marco de sequência (MARCOS_SEQUENCIA). @type {Readonly<Record<number, string>>} */
const NOMES_SEQUENCIA = Object.freeze({ 3: "§eEm chamas", 5: "§6Imparável", 10: "§cLenda da toca" });
/** @param {string} tag @param {string} nome @param {number} n @param {number} bonus */
export const SEQUENCIA = (tag, nome, n, bonus) =>
  `${glyph(G.GUERRA)} ${NOMES_SEQUENCIA[n] ?? "§eEm sequência"}! §f${nome} §8[${tag}] §7tem §f${n} abates seguidos§7 sem morrer.${bonus > 0 ? ` §a+${bonus} ponto${bonus > 1 ? "s" : ""}!` : ""}`;
/** @param {string} vitima @param {number} n @param {string} [matador] */
export const SEQUENCIA_FIM = (vitima, n, matador) =>
  `${glyph(G.GUERRA)} §7Acabou a sequência de §f${vitima}§7 (${n} abates)${matador ? ` §7pelas mãos de §f${matador}` : ""}§7.`;
/** @param {string} tag @param {string} matador @param {string} lider @param {number} bonus */
export const CABECA_LIDER = (tag, matador, lider, bonus) =>
  `${glyph(G.GUERRA)} §6Cabeça do líder!§r §f${matador} §8[${tag}] §7derrubou §f${lider}§7, quem lidera o outro lado.${bonus > 0 ? ` §a+${bonus} ponto${bonus > 1 ? "s" : ""}!` : ""}`;
/** @param {Guerra} g @param {string} nome @param {"a" | "b"} lado @param {number} n */
export const CACADOR = (g, nome, lado, n) =>
  `${glyph(G.GUERRA)} §6Caçador da guerra:§r §f${nome} ${TAG_GUERRA(g, lado)} §7com §f${n} abate${n > 1 ? "s" : ""}§7!`;
export const TITULO_CACADOR = "§6CAÇADOR!";
/** @param {Guerra} g @param {number} n */
export const SUBTITULO_CACADOR = (g, n) => `§7${n} abate${n > 1 ? "s" : ""} na guerra [${g.tags.a}] x [${g.tags.b}]`;
export const ABATE_NOVATO = "§7Esse abate não conta: só vale entre quem já era do clã quando a guerra foi declarada.";
/** @param {Guerra} g @param {string} claId */
export const GUERRA_AO_ENTRAR = (g, claId) =>
  g.estado === "ativa"
    ? `${glyph(G.GUERRA)} Seu clã está §cem guerra§r: §f[${g.tags.a}] ${g.pontos.a} x ${g.pontos.b} [${g.tags.b}]§r. Cuidado lá fora!`
    : `${glyph(G.GUERRA)} Guerra marcada contra §f[${g.a === claId ? g.tags.b : g.tags.a}]§r em ${duracao((g.inicio - Date.now()) / 1000)}.`;
export const AUTOR_GUERRA = "Guerra";
/** @param {string} a @param {string} b */
export const STAFF_GUERRA_ENCERRADA = (a, b) => `Guerra [${a}] x [${b}] encerrada sem vencedor (cada um recebeu a sua parte).`;

// ---------------------------------------------------------------- aliados

export const TITULO_ALIADOS = "Aliados";
/** @param {number} n @param {boolean} acesso */
export const ALIADOS_CORPO = (n, acesso) =>
  `§7Aliados não guerreiam entre si${acesso ? " e abrem portas e baús na base" : ""}. ${n}/3 alianças.`;
/** @param {Cla} outro */
export const BOTAO_ALIADO = (outro) => `${TAG(outro)} ${nomePintado(outro)}`;
/** @param {Cla} outro */
export const BOTAO_PEDIDO_ALIANCA = (outro) => `§ePedido: §r${TAG(outro)} ${nomePintado(outro)}`;
/** @param {Cla} outro */
export const PEDIDO_ALIANCA_DETALHE = (outro) => `${NOME(outro)}\n§7quer ser aliado do seu clã.`;
export const BOTAO_PEDIR_ALIANCA = "Pedir aliança";
export const TITULO_PEDIR_ALIANCA = "Pedir aliança";
export const PEDIR_ALIANCA_CORPO = "§7Para qual clã?";
/** @param {Cla} outro */
export const CONFIRMA_DESFAZER = (outro) => `§7Desfazer a aliança com ${TAG(outro)}§7?`;
export const JA_ALIADOS = "Vocês já são aliados.";
export const NAO_ALIADOS = "Vocês não são aliados.";
export const ALIANCA_EM_GUERRA = "Não dá para se aliar a quem está em guerra com vocês.";
/** @param {number} max */
export const ALIADOS_CHEIO = (max) => `Cada clã pode ter até ${max} aliados.`;
export const ALIANCA_JA_PEDIU = "O pedido de aliança já foi enviado.";
/** @param {Cla} outro */
export const ALIANCA_PEDIDA = (outro) => `Pedido de aliança enviado para ${TAG(outro)}.`;
/** @param {Cla} cla */
export const ALIANCA_NOVA = (cla) => `O clã ${TAG(cla)} quer ser aliado. Veja em Clã > Aliados.`;
export const ALIANCA_RECUSADA = "Pedido de aliança recusado.";
/** @param {Cla} cla */
export const ALIANCA_RECUSADA_AVISO = (cla) => `${TAG(cla)} recusou a aliança.`;
/** @param {Cla} a @param {Cla} b */
export const ALIANCA_ANUNCIO = (a, b) => `${TAG(a)} e ${TAG(b)} agora são aliados!`;
/** @param {string} tag */
export const ALIANCA_DESFEITA = (tag) => `Aliança com [${tag}] desfeita.`;
/** @param {Cla} cla */
export const ALIANCA_DESFEITA_AVISO = (cla) => `${TAG(cla)} desfez a aliança com vocês.`;

// ---------------------------------------------------------------- ajustes do clã

export const TITULO_AJUSTES = "Ajustes do clã";
/** @param {Cla} cla */
export const AJUSTES_CORPO = (cla) =>
  `${NOME(cla)}\n§7Entrada: ${cla.aberto ? "§aaberta" : "§7por pedido"} §8• §7Fogo amigo: ${cla.fogoAmigo ? "§cligado" : "§adesligado"}`;
export const BOTAO_RENOMEAR = "Mudar o nome";
export const BOTAO_DESCRICAO = "Mudar a descrição";
export const ROTULO_DESCRICAO = "Descrição (até 80 letras)";
export const BOTAO_COR = "Cor da tag e do nome";
export const BOTAO_EMBLEMA = "Emblema";
/** @param {boolean} aberto */
export const BOTAO_ABERTO = (aberto) => `Entrada: ${aberto ? "§aaberta" : "§7por pedido"}`;
/** @param {boolean} ligado */
export const BOTAO_FOGO_AMIGO = (ligado) => `Fogo amigo: ${ligado ? "§cligado" : "§adesligado"}`;
export const BOTAO_PERMISSOES = "Cargos e permissões";
/** @param {string} nome */
export const RENOMEADO = (nome) => `O clã agora se chama §f${nome}§r.`;
export const DESCRICAO_OK = "Descrição salva.";
/** @param {"aberto" | "acessoAliados" | "fogoAmigo"} chave @param {boolean} valor */
export const AJUSTE_MUDOU = (chave, valor) =>
  chave === "aberto"
    ? valor
      ? "Entrada aberta: quem quiser entra direto."
      : "Entrada por pedido: alguém do clã aprova."
    : chave === "acessoAliados"
      ? valor
        ? "Aliados agora abrem portas e baús na base."
        : "Aliados não abrem mais nada na base."
      : valor
        ? "Fogo amigo ligado: cuidado com as flechas!"
        : "Fogo amigo desligado.";
export const TITULO_COR = "Cor do clã";
/** @param {boolean} kitsune */
export const COR_CORPO = (kitsune) =>
  `§7Cores liberadas pelo nível do clã.${kitsune ? " Com o selo Kitsune, os temas em degradê também." : ""}`;
/** @param {string} tag @param {string} cor @param {boolean} atual */
export const BOTAO_COR_SOLIDA = (tag, cor, atual) => `§8[§${cor}${tag}§8] §${cor}${NOME_COR(cor)}${atual ? " §a✔" : ""}`;
/** @param {string} cor @param {number} nivel */
export const COR_TRANCADA = (cor, nivel) => `§8${NOME_COR(cor)}: libera no nível ${nivel}`;
export const CABECALHO_TEMAS = "Temas Kitsune";
/** @param {string} pintado @param {string} nome @param {boolean} atual */
export const BOTAO_TEMA_CLA = (pintado, nome, atual) => `§8[${pintado}§8] §7${nome}${atual ? " §a✔" : ""}`;
export const COR_OK = "Cor do clã trocada!";
export const COR_BLOQUEADA = "Essa cor ainda não foi liberada pelo nível do clã.";
export const TEMA_SO_KITSUNE = "Temas em degradê são mimo do selo Kitsune (só visual).";
/** @param {string} nome @param {Cla} cla */
export const TEMA_KITSUNE_VOLTOU = (nome, cla) =>
  `§7${nome} não tem mais o selo Kitsune: o tema de ${TAG(cla)} §7voltou para a cor de sempre.`;
export const TITULO_EMBLEMA = "Emblema do clã";
export const EMBLEMA_CORPO = "§7Aparece antes da tag no menu, no placar e no território.";
/** @param {string} codigo @param {number} i @param {boolean} atual */
export const BOTAO_EMBLEMA_ITEM = (codigo, i, atual) => `${glyph(codigo)} §f${NOMES_EMBLEMA[i] ?? "?"}${atual ? " §a✔" : ""}`;
/** @param {string} codigo @param {number} i @param {number} nivel */
export const EMBLEMA_TRANCADO = (codigo, i, nivel) => `${glyph(codigo)} §8${NOMES_EMBLEMA[i] ?? "?"}: libera no nível ${nivel}`;
export const EMBLEMA_OK = "Emblema trocado!";
export const EMBLEMA_BLOQUEADO = "Esse emblema ainda não foi liberado pelo nível do clã.";
export const TITULO_PERMISSOES = "Cargos e permissões";
/** @param {Cla} cla */
export const PERMISSOES_CORPO = (cla) =>
  [
    "§7Quem lidera pode tudo. Escolha um cargo para mudar:",
    ...(/** @type {const} */ (["vice", "oficial", "membro", "recruta"])).map(
      (c) => `§f${NOME_CARGO[c]}§7: ${cla.perms[c].length} permissões, saque ${formatarNumero(cla.limites[c])}/dia`,
    ),
  ].join("\n");
/** @param {Exclude<CargoCla, "lider">} cargo */
export const TITULO_PERMS_DE = (cargo) => `Permissões: ${NOME_CARGO[cargo]}`;
export const ROTULO_LIMITE = "Saque máximo por dia (Caudas)";
/** @param {Exclude<CargoCla, "lider">} cargo */
export const PERMS_OK = (cargo) => `Permissões de ${NOME_CARGO[cargo]} salvas.`;

// ---------------------------------------------------------------- ranking, dissolver, chat

export const TITULO_RANKING = "Ranking de clãs";
/** @param {number} pos @param {Cla} cla @param {boolean} meu */
export const RANKING_LINHA = (pos, cla, meu) =>
  `§6${pos}. ${TAG(cla)} §f${cla.nome} §7Nv ${cla.nivel} §8• §7${formatarNumero(cla.xp)} XP §8• §7${cla.membros.length} pessoas${meu ? " §a«" : ""}`;
/** @param {number} pos */
export const RANKING_POSICAO = (pos) => `§7Seu clã está em §f${pos}º§7.`;
/** @param {Cla} cla */
export const CONFIRMA_DISSOLVER_1 = (cla) => `§7Dissolver o clã ${TAG(cla)}§7? Todo mundo fica sem clã e a base some.`;
/** @param {Cla} cla @param {boolean} guerra */
export const CONFIRMA_DISSOLVER_2 = (cla, guerra) =>
  `§cÚltima chance!§7 O banco (${caudas(cla.banco)}§7) volta para você.${guerra ? " §cA guerra em andamento conta como rendição." : ""}`;
export const SIM_DISSOLVER = "Sim, dissolver";
/** @param {Cla} cla */
export const DISSOLVIDO_AVISO = (cla) => `O clã ${TAG(cla)} foi dissolvido por quem liderava.`;
/** @param {Cla} cla */
export const DISSOLVIDO_ANUNCIO = (cla) => `O clã ${TAG(cla)} ${cla.nome}§r chegou ao fim.`;
/** @param {number} valor */
export const DISSOLVIDO_OK = (valor) => `Clã dissolvido.${valor ? ` §6${formatarNumero(valor)}§r Caudas voltaram para você.` : ""}`;
/** @param {Cla} cla @param {string} nome @param {CargoCla} cargo @param {string} texto */
export const CHAT_CLA = (cla, nome, cargo, texto) => `${TAG(cla)} §7${NOME_CARGO[cargo]} §f${nome}§8 » §a${texto}`;
export const CHAT_VAZIO = "Escreva a mensagem: /vulpus:c oi, clã!";

// ---------------------------------------------------------------- staff

export const TITULO_STAFF = "Clãs (staff)";
/** @param {number} n */
export const STAFF_CORPO = (n) => `§7${n} clãs na toca. Tudo que a staff faz aqui fica no log.`;
/** @param {boolean} ligado */
export const BOTAO_BYPASS = (ligado) => `Bypass da proteção: ${ligado ? "§aligado" : "§cdesligado"}`;
/** @param {boolean} ligado */
export const BYPASS_MUDOU = (ligado) => (ligado ? "Bypass ligado: você mexe em qualquer base. Use com juízo!" : "Bypass desligado.");
export const BOTAO_LOG = "Log da staff";
export const TITULO_LOG = "Log dos clãs";
export const LOG_VAZIO = "§7Nada registrado.";
/** @param {{ t: number, a: string, x: string }} l */
export const LINHA_LOG = (l) => `§8${formatarData(l.t)} §f${l.a} §7${l.x}`;
export const LOG_BYPASS_ON = "ligou o bypass";
export const LOG_BYPASS_OFF = "desligou o bypass";
/** @param {string} tag @param {string} nome @param {number} devolvido */
export const LOG_REMOVEU = (tag, nome, devolvido) => `removeu [${tag}] ${nome} (${devolvido} Caudas ao líder)`;
/** @param {string} antiga @param {string} nova */
export const LOG_TAG = (antiga, nova) => `trocou a tag [${antiga}] por [${nova}]`;
/** @param {Cla} cla @param {string} lider @param {number} max @param {Guerra | undefined} guerra */
export const FICHA_STAFF = (cla, lider, max, guerra) =>
  [
    FICHA(cla, lider, max),
    `§7Banco: §6${formatarNumero(cla.banco)} §8• §7XP: §f${formatarNumero(cla.xp)}`,
    `§7Base: ${cla.base ? `§f${formatarCoords(cla.base)} §7raio ${cla.base.raio}` : "§8nenhuma"}`,
    guerra ? `§cGuerra: [${guerra.tags.a}] ${guerra.pontos.a} x ${guerra.pontos.b} [${guerra.tags.b}]` : "§7Sem guerra",
  ].join("\n");
export const BOTAO_MUDAR_TAG = "Mudar a tag";
export const BOTAO_ENCERRAR_GUERRA = "Encerrar a guerra";
export const CONFIRMA_ENCERRAR = "§7Encerrar a guerra sem vencedor? Cada clã recebe a sua parte do baú.";
export const BOTAO_REMOVER_CLA = "Remover o clã";
/** @param {Cla} cla */
export const CONFIRMA_REMOVER_1 = (cla) => `§7Remover o clã ${TAG(cla)} ${cla.nome}§7?`;
/** @param {Cla} cla */
export const CONFIRMA_REMOVER_2 = (cla) => `§cCerteza?§7 O banco (${caudas(cla.banco)}§7) volta para quem lidera e não tem volta.`;
export const SIM_REMOVER = "Sim, remover";
/** @param {Cla} cla */
export const REMOVIDO_AVISO = (cla) => `A staff removeu o clã ${TAG(cla)}. Dúvidas? Fale com ela.`;
/** @param {Cla} cla @param {number} devolvido */
export const STAFF_REMOVEU = (cla, devolvido) => `Clã [${cla.tag}] removido. ${formatarNumero(devolvido)} Caudas voltaram para quem liderava.`;
/** @param {string} antiga @param {string} nova */
export const STAFF_TAG = (antiga, nova) => `Tag [${antiga}] trocada por [${nova}].`;
/** @param {string} tag */
export const TAG_TROCADA_AVISO = (tag) => `A staff trocou a tag do clã para §f[${tag}]§r.`;

// ---------------------------------------------------------------- comandos

export const DESC_CLA = "Abre o menu do clã";
export const DESC_C = "Fala só com o seu clã: /vulpus:c <mensagem>";
export const DESC_CONVIDAR = "Convida alguém online para o seu clã";
export const DESC_ACEITAR = "Aceita um convite de clã (tag opcional)";
export const DESC_RECUSAR = "Recusa um convite de clã (tag opcional)";
export const DESC_CASA = "Vai para uma casa do clã (sem nome, a primeira)";
export const DESC_DEPOSITAR = "Deposita Caudas no banco do clã";
export const DESC_BYPASS = "Liga/desliga o bypass da proteção dos clãs";
