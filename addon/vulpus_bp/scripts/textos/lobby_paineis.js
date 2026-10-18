// @ts-check
// Textos dos painéis flutuantes do lobby (placares, guia, aviso livre) e do ambiente.
import { G, glyph } from "../glyphs.js";

/** Tipos de painel, na ordem do formulário. */
export const TIPOS = Object.freeze([
  { id: "caudas", nome: "Ranking de Caudas" },
  { id: "nivel", nome: "Ranking de nível" },
  { id: "masm", nome: "Guardiões da masmorra" },
  { id: "pets", nome: "Colecionadores de pets" },
  { id: "online", nome: "Quem está na toca" },
  { id: "guia", nome: "Como jogar (guia do novato)" },
  { id: "livre", nome: "Texto livre (aviso, regra, evento)" },
]);

const ENFEITE = "§6§l✦";
/** @param {string} t */
const titulo = (t) => `${ENFEITE} §e§l${t} ${ENFEITE}`;
const FILETE = "§8§m                    ";

/** Cor da posição: ouro, prata, bronze e o resto. @param {number} pos */
const medalha = (pos) => (pos === 1 ? "§6§l" : pos === 2 ? "§7§l" : pos === 3 ? "§c§l" : "§8");

/**
 * @param {number} pos
 * @param {string} nome
 * @param {string} valor
 */
export const LINHA_RANK = (pos, nome, valor) => `${medalha(pos)}${pos}º §r§f${nome} §8» ${valor}`;
export const SEM_DADOS = "§7ninguém ainda... seja o primeiro!";

/** @param {string} linhas */
export const PAINEL_CAUDAS = (linhas) => [`${glyph(G.CAUDAS)} ${titulo("MAIS RICOS DA TOCA")}`, "§7quem juntou mais Caudas", FILETE, linhas].join("\n");
/** @param {string} linhas */
export const PAINEL_NIVEL = (linhas) => [`${glyph(G.NIVEL)} ${titulo("MAIORES NÍVEIS")}`, "§7quem mais viveu por aqui", FILETE, linhas].join("\n");
/** @param {number} caudas */
export const VALOR_CAUDAS = (caudas) => `§6${caudas.toLocaleString("pt-BR")} §e${glyph(G.CAUDAS)}`;
/**
 * @param {number} nivel
 * @param {string} rank
 */
export const VALOR_NIVEL = (nivel, rank) => `§aNv ${nivel} §7${rank}`;

/** @param {string} linhas */
export const PAINEL_MASM = (linhas) =>
  [`${glyph(G.TROFEU)} ${titulo("GUARDIÕES DA MASMORRA")}`, "§7a marca mais rápida de cada andar", FILETE, linhas].join("\n");
/**
 * @param {number} andar
 * @param {string} guardiao
 * @param {string} marca  "nome §8» 1:23" ou o texto de vazio
 */
export const LINHA_MASM = (andar, guardiao, marca) => `§6${andar}. §f${guardiao} §8» ${marca}`;
export const MASM_SEM_MARCA = "§7livre";

/** @param {number} total @param {string} nomes */
export const PAINEL_ONLINE = (total, nomes) =>
  [`${glyph(G.ONLINE)} ${titulo("NA TOCA AGORA")}`, `§f${total} §7${total === 1 ? "raposa" : "raposas"} por aqui`, FILETE, nomes || "§7ninguém além de você"].join("\n");

/** @param {string} linhas */
export const PAINEL_PETS = (linhas) => [`${glyph(G.PATA)} ${titulo("COLECIONADORES DE PETS")}`, "§7quem tem a maior coleção", FILETE, linhas].join("\n");
/**
 * @param {number} pets
 * @param {number} lendarios
 */
export const VALOR_PETS = (pets, lendarios) => `§d${pets} pets${lendarios > 0 ? ` §6(${lendarios} lendário${lendarios > 1 ? "s" : ""})` : ""}`;

export const PAINEL_GUIA = [
  `${glyph(G.RAPOSA)} ${titulo("COMO JOGAR")}`,
  "§7bem-vinde à toca! por onde começar:",
  FILETE,
  "§e1. §fAbra o §6Menu do Vulpus §7(item no inventário)",
  "§e2. §fPegue a §6diária §fem §6Caudas §7: ela rende todo dia",
  "§e3. §fExplore a Feira e jogue os minigames",
  "§e4. §fSuba a montanha e entre na §6Masmorra",
  "§e5. §fMonte um §6clã §fcom os amigos e proteja o terreno",
  "§7dúvida? pergunte no chat, a Kiza ajuda",
].join("\n");

/** @param {string} texto  linhas separadas por | */
export const PAINEL_LIVRE = (texto) => texto.split("|").map((l) => l.trim()).filter(Boolean).join("\n");

// Painel da staff
export const TITULO_PAINEIS = "Painéis do lobby";
export const SECAO_PAINEIS = "PAINÉIS FLUTUANTES";
export const BOTAO_PAINEIS = "Painéis flutuantes do lobby";
export const BOTAO_NOVO_PAINEL = "Pôr um painel aqui";
export const BOTAO_VOLTAR_PAINEIS = "Voltar aos painéis";
export const ROTULO_TIPO = "Tipo de painel";
export const ROTULO_ALTURA = "Altura acima dos seus pés (blocos)";
export const ROTULO_TEXTO = "Texto (use | para quebrar a linha)";
export const DICA_TEXTO = "§eEvento de sábado|§7às 20h na Feira";
export const SEM_PAINEIS = "§7Nenhum painel ainda. Fique onde ele deve aparecer e escolha \"Pôr um painel aqui\".";
/** @param {number} n */
export const CORPO_PAINEIS = (n) =>
  `§7Placares e avisos que flutuam no ar, no estilo Vulpus. Eles se atualizam sozinhos e aparecem só para quem chega perto (alcance em Configurações). Hoje: §f${n}§7 painel(is).`;
/** @param {string} tipo @param {string} coords */
export const ITEM_PAINEL = (tipo, coords) => `${tipo} §7(${coords})`;
/** @param {string} tipo */
export const PAINEL_POSTO = (tipo) => `§aPainel "${tipo}" posto aqui.`;
export const PAINEL_REMOVIDO = "§aPainel removido.";
export const PAINEL_TEXTO_VAZIO = "§cEscreva algum texto para o painel livre.";
export const BOTAO_IR = "Ir até ele";
export const BOTAO_MOVER = "Trazer para onde estou";
export const BOTAO_REMOVER = "Remover este painel";
export const BOTAO_EDITAR_TEXTO = "Editar o texto";
export const PAINEL_MOVIDO = "§aPainel movido para a sua posição.";
export const PAINEL_ATUALIZADO = "§aTexto atualizado.";
/** @param {string} tipo @param {string} coords */
export const CORPO_UM_PAINEL = (tipo, coords) => `§fTipo: §e${tipo}\n§fLugar: §e${coords}`;
export const LIMITE_PAINEIS = (/** @type {number} */ n) => `§cO limite é de ${n} painéis. Remova algum antes.`;
