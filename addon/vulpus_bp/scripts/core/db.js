// @ts-check
// Persistência em propriedades dinâmicas do MUNDO (dá para ler dados de quem está offline).
// Tudo em JSON, com cache em memória. Dados do mundo (salvarMundo) e configuração gravam na hora; os dados de cada
// jogador (caudas, XP, tempo...) mudam o tempo todo e gravam em lote: a mudança vale na hora para o resto do addon (o
// cache em memória é a fonte) e vai para a propriedade dinâmica no máximo ATRASO_GRAVACAO ticks depois, com um só
// JSON.stringify por jogador por janela, não um por mudança.
// Janela de risco: se o servidor cair sem aviso (crash, kill), perdem-se as mudanças de jogador dos últimos
// ATRASO_GRAVACAO ticks (5 s). Parada normal não perde nada: grava tudo quando alguém sai (só os dados dele), ao
// desligar (system.beforeEvents.shutdown, quando existe), ao listar jogadores e ao chamar descarregarJogadores().
import { system, world } from "@minecraft/server";
import { CHAVE_CONFIG, PADROES, PREFIXO_JOGADOR } from "../config.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {typeof PADROES} Config */
/** @typedef {"laranja" | "black" | "sakura" | "lunar" | "espirito"} Tema  tema do painel (core/forms.js) */

/**
 * @typedef {object} Casa
 * @property {string} nome
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} d  dimension.id
 */

/**
 * @typedef {object} DadosJogador
 * @property {number} v  versão do formato (2; a 1 é da fase 1, completada com os padrões)
 * @property {string} nome  último nome visto
 * @property {number} caudas  saldo de Caudas
 * @property {number} xp  XP total (inteiro ≥ 0); o nível é calculado em sistemas/niveis.js
 * @property {number} tempo  segundos jogados
 * @property {number} primeira  ms da primeira entrada (0 = ainda não entrou)
 * @property {number} ultimaVez  ms da última entrada
 * @property {number} mortes
 * @property {{ dia: string, sequencia: number }} diaria  dia (Brasília, "2026-10-02") da última diária e dias seguidos
 * @property {Casa[]} casas
 * @property {import("./teleporte.js").Local | null} voltar
 * @property {{ hud: boolean | null, tpa: boolean, sons: boolean, tema: Tema, cla: boolean, pegadinhas: boolean, musica: boolean, abate: string }} ajustes
 *   hud (scoreboard lateral) null = usar config().hudPadrao; cla = linha do clã no placar
 * @property {boolean} recebeuItem
 * @property {string} apelido  nome de exibição (só vale com o selo Kitsune; "" = o nome da conta)
 * @property {string} apelidoDono  apelido posto por um dono (vale mesmo sem selo e manda no apelido da pessoa; "" = nenhum)
 * @property {string} temaNome  tema de cor do nome (cores.js; vale com o selo Kitsune, com o desbloqueio do evento ou para dono; "" = sem tema)
 * @property {ExtrasKitsune} extras  mimos extras do selo Kitsune (chegada e saída, looks salvos, cor da mensagem; só valem com o selo)
 * @property {string[]} conquistas  ids das conquistas ganhas (sistemas/conquistas.js)
 * @property {string[]} coresExtras  temas de cor desbloqueados por eventos (valem sem o selo Kitsune)
 * @property {number[]} inauguracao  números (0 a 19) das raposinhas do Evento de inauguração já achadas
 * @property {{ cap: number, tent: number, ate: number, fim: boolean }} arg  mistério da Vulpus: capítulos alcançados (0 a 6), tentativas no terminal, bloqueio até (ms) e se já passou
 * @property {{ lidos: string[], enigma: boolean, tentativas: number, conclusao: number, relogio: boolean }} hollow  evento Hollow: registros lidos (D01...), enigma resolvido, erros no enigma, posição de conclusão (0 = não concluiu) e se pegou o relógio
 * @property {Vinculo | null} vinculo  conta do Discord ligada (sistemas/vinculo.js); null = ainda não ligou
 * @property {SyncDiscord} sync  controle da soma de Caudas e XP com o Discord (sistemas/vinculo.js)
 */

/**
 * Mimos extras do selo Kitsune (sistemas/kitsune_extras.js). Tudo só visual. Perdeu o selo: os dados ficam, mas deixam de valer.
 * @typedef {object} ExtrasKitsune
 * @property {boolean} chegada  efeito de chegada e saída ligado para esta pessoa
 * @property {({ apelido: string, tema: string } | null)[]} looks  até MAX_LOOKS looks salvos (apelido + tema do nome; null = espaço vazio)
 * @property {string} msgCor  código § (1 caractere) da cor da mensagem no chat ("" = branco padrão)
 */

/** Quantos looks um Kitsune guarda. */
export const MAX_LOOKS = 3;

/**
 * @typedef {object} Vinculo
 * @property {string} discordId  id da conta do Discord
 * @property {string} nome  nome no Discord quando ligou (só para mostrar)
 * @property {number} desde  ms em que ligou
 * @property {string} mcId  id que o jogador tinha ao ligar
 */

/**
 * Caudas e XP são os mesmos no jogo e no Discord. O jogo manda a diferença desde a última soma (baseC, baseX = os totais que o
 * Discord devolveu) e recebe o total de volta. pend é o envio em andamento (guardado antes de enviar: se o servidor cair no meio,
 * o mesmo envio é repetido com a mesma chave e o Discord não soma duas vezes).
 * @typedef {object} SyncDiscord
 * @property {number} baseC  Caudas do Discord na última soma
 * @property {number} baseX  XP do Discord na última soma
 * @property {{ chave: string, c: number, x: number, sc: number, sx: number } | null} pend  chave, diferenças enviadas e totais do jogo no momento do envio
 */

/**
 * Temas do painel, na ordem da escolha em Ajustes. Laranja e Black são de todos; os outros, do selo Kitsune
 * (core/forms.js). Tema desconhecido no dado salvo vira laranja.
 * @type {readonly Tema[]}
 */
export const TEMAS_MENU = Object.freeze(["laranja", "black", "sakura", "lunar", "espirito"]);

/** Teto por propriedade (o jogo aceita até 32767 caracteres). */
const LIMITE_JSON = 30000;

/** Ticks entre uma mudança nos dados de um jogador e a gravação dela (a janela de risco de um crash). */
export const ATRASO_GRAVACAO = 100;

/** @type {Map<string, DadosJogador>} */
const cache = new Map();
/** Ids de jogador com mudança ainda não gravada na propriedade dinâmica. @type {Set<string>} */
const sujos = new Set();
let gravacaoAgendada = false;
/** @type {Config | undefined} */
let cacheConfig;

/** @returns {DadosJogador} */
function dadosNovos() {
  return {
    v: 2,
    nome: "",
    caudas: 0,
    xp: 0,
    tempo: 0,
    primeira: 0,
    ultimaVez: 0,
    mortes: 0,
    diaria: { dia: "", sequencia: 0 },
    casas: [],
    voltar: null,
    ajustes: { hud: null, tpa: true, sons: true, tema: "laranja", cla: true, pegadinhas: true, musica: true, abate: "auto" },
    recebeuItem: false,
    apelido: "",
    apelidoDono: "",
    temaNome: "",
    extras: extrasNovos(),
    conquistas: [],
    coresExtras: [],
    inauguracao: [],
    arg: { cap: 0, tent: 0, ate: 0, fim: false },
    hollow: hollowNovo(),
    vinculo: null,
    sync: { baseC: 0, baseX: 0, pend: null },
  };
}

/** @returns {ExtrasKitsune} */
function extrasNovos() {
  return { chegada: true, looks: Array.from({ length: MAX_LOOKS }, () => null), msgCor: "" };
}

/** @param {Player | string} alvo */
const idDe = (alvo) => (typeof alvo === "string" ? alvo : alvo.id);

/**
 * Lê um JSON guardado no mundo; undefined se não houver ou estiver corrompido.
 * @param {string} chave
 * @returns {any}
 */
function lerJson(chave) {
  if (chave.startsWith(PREFIXO_JOGADOR) && sujos.has(chave.slice(PREFIXO_JOGADOR.length))) descarregarJogador(chave.slice(PREFIXO_JOGADOR.length));
  const bruto = world.getDynamicProperty(chave);
  if (typeof bruto !== "string") return undefined;
  try {
    return JSON.parse(bruto);
  } catch (e) {
    console.warn(`[Vulpus] JSON inválido em ${chave}: ${e}`);
    return undefined;
  }
}

/**
 * Grava um valor como JSON no mundo. Acima do limite, avisa no log e não grava.
 * @param {string} chave
 * @param {unknown} valor
 * @returns {boolean} se gravou
 */
function gravarJson(chave, valor) {
  const json = JSON.stringify(valor);
  if (json.length > LIMITE_JSON) {
    console.warn(`[Vulpus] ${chave} tem ${json.length} caracteres (limite ${LIMITE_JSON}); não gravei.`);
    return false;
  }
  world.setDynamicProperty(chave, json);
  return true;
}

/**
 * @param {unknown} valor
 * @param {number} padrao
 */
const numero = (valor, padrao) => (typeof valor === "number" && Number.isFinite(valor) ? valor : padrao);

/**
 * @param {unknown} valor
 * @param {boolean} padrao
 */
const booleano = (valor, padrao) => (typeof valor === "boolean" ? valor : padrao);

/**
 * Tem dimensão e coordenadas que dá para usar num teleporte.
 * @param {any} valor
 */
const ehPosicao = (valor) =>
  !!valor &&
  typeof valor === "object" &&
  typeof valor.d === "string" &&
  [valor.x, valor.y, valor.z].every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Junta o que foi lido com os padrões. Campo que falta ou veio com tipo errado (JSON antigo ou
 * editado à mão) ganha o valor padrão; casa sem nome ou sem posição é descartada.
 * Dados da v1 (fase 1) saem como v2 com xp 0 e tema laranja ("laranja" e "black" salvos continuam valendo).
 * @param {any} lido
 * @returns {DadosJogador}
 */
function completar(lido) {
  const base = dadosNovos();
  if (!lido || typeof lido !== "object") return base;
  const diaria = lido.diaria && typeof lido.diaria === "object" ? lido.diaria : {};
  const ajustes = lido.ajustes && typeof lido.ajustes === "object" ? lido.ajustes : {};
  return {
    ...base,
    nome: typeof lido.nome === "string" ? lido.nome : base.nome,
    caudas: Math.max(0, Math.floor(numero(lido.caudas, base.caudas))),
    xp: Math.max(0, Math.floor(numero(lido.xp, base.xp))),
    tempo: Math.max(0, numero(lido.tempo, base.tempo)),
    primeira: numero(lido.primeira, base.primeira),
    ultimaVez: numero(lido.ultimaVez, base.ultimaVez),
    mortes: Math.max(0, Math.floor(numero(lido.mortes, base.mortes))),
    diaria: {
      dia: typeof diaria.dia === "string" ? diaria.dia : base.diaria.dia,
      sequencia: Math.max(0, Math.floor(numero(diaria.sequencia, base.diaria.sequencia))),
    },
    casas: Array.isArray(lido.casas)
      ? lido.casas.filter((c) => ehPosicao(c) && typeof c.nome === "string" && c.nome !== "")
      : base.casas,
    voltar: ehPosicao(lido.voltar) ? lido.voltar : null,
    ajustes: {
      hud: typeof ajustes.hud === "boolean" ? ajustes.hud : null,
      tpa: booleano(ajustes.tpa, base.ajustes.tpa),
      sons: booleano(ajustes.sons, base.ajustes.sons),
      tema: TEMAS_MENU.includes(ajustes.tema) ? ajustes.tema : "laranja",
      cla: booleano(ajustes.cla, base.ajustes.cla),
      pegadinhas: booleano(ajustes.pegadinhas, base.ajustes.pegadinhas),
      musica: booleano(ajustes.musica, base.ajustes.musica),
      abate: typeof ajustes.abate === "string" && /^[a-z]{1,12}$/.test(ajustes.abate) ? ajustes.abate : "auto",
    },
    recebeuItem: booleano(lido.recebeuItem, base.recebeuItem),
    apelido: typeof lido.apelido === "string" ? lido.apelido.slice(0, 16) : base.apelido,
    apelidoDono: typeof lido.apelidoDono === "string" ? lido.apelidoDono.slice(0, 16) : base.apelidoDono,
    temaNome: typeof lido.temaNome === "string" ? lido.temaNome.slice(0, 16) : base.temaNome,
    extras: extrasLidos(lido.extras),
    conquistas: listaTexto(lido.conquistas),
    coresExtras: listaTexto(lido.coresExtras),
    arg: argLido(lido.arg),
    hollow: hollowLido(lido.hollow),
    vinculo: vinculoLido(lido.vinculo),
    sync: syncLido(lido.sync),
    inauguracao: Array.isArray(lido.inauguracao) ? [...new Set(/** @type {number[]} */ (lido.inauguracao).filter((n) => Number.isInteger(n) && n >= 0 && n < 100))] : base.inauguracao,
  };
}

/**
 * Extras do Kitsune: campo que falta ou veio estranho (dado antigo ou mexido à mão) ganha o padrão; look com texto fora do formato
 * (apelido com símbolos, tema que não é só letras) vira espaço vazio.
 * @param {any} v
 * @returns {ExtrasKitsune}
 */
function extrasLidos(v) {
  const base = extrasNovos();
  if (!v || typeof v !== "object") return base;
  const looks = base.looks.map((_, i) => {
    const l = Array.isArray(v.looks) ? v.looks[i] : undefined;
    if (!l || typeof l !== "object") return null;
    const apelido = typeof l.apelido === "string" ? l.apelido : "";
    const tema = typeof l.tema === "string" ? l.tema : "";
    if ([...apelido].length > 16 || !/^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]*$/.test(apelido) || !/^[a-z]{0,16}$/.test(tema)) return null;
    return apelido === "" && tema === "" ? null : { apelido, tema };
  });
  return {
    chegada: booleano(v.chegada, base.chegada),
    looks,
    msgCor: typeof v.msgCor === "string" && /^[0-9a-g]$/.test(v.msgCor) ? v.msgCor : "",
  };
}

/** @param {any} v @returns {{ cap: number, tent: number, ate: number, fim: boolean }} */
function argLido(v) {
  const n = (/** @type {unknown} */ x) => (Number.isFinite(x) ? Math.max(0, Math.floor(/** @type {number} */ (x))) : 0);
  return v && typeof v === "object" ? { cap: Math.min(20, n(v.cap)), tent: n(v.tent), ate: n(v.ate), fim: v.fim === true } : { cap: 0, tent: 0, ate: 0, fim: false };
}

/** @returns {{ lidos: string[], enigma: boolean, tentativas: number, conclusao: number, relogio: boolean }} */
function hollowNovo() {
  return { lidos: [], enigma: false, tentativas: 0, conclusao: 0, relogio: false };
}

/** @param {any} v */
function hollowLido(v) {
  const base = hollowNovo();
  if (!v || typeof v !== "object") return base;
  const n = (/** @type {unknown} */ x) => (Number.isFinite(x) ? Math.max(0, Math.floor(/** @type {number} */ (x))) : 0);
  return {
    lidos: Array.isArray(v.lidos) ? [...new Set(v.lidos.filter((/** @type {unknown} */ t) => typeof t === "string" && /^D[0-9]{2}$/.test(t)))].slice(0, 40) : base.lidos,
    enigma: v.enigma === true,
    tentativas: Math.min(n(v.tentativas), 100000),
    conclusao: Math.min(n(v.conclusao), 1000000),
    relogio: v.relogio === true,
  };
}

/** @param {any} v @returns {Vinculo | null} */
function vinculoLido(v) {
  if (!v || typeof v !== "object" || typeof v.discordId !== "string" || !/^\d{5,25}$/.test(v.discordId)) return null;
  return {
    discordId: v.discordId,
    nome: typeof v.nome === "string" ? v.nome.slice(0, 40) : "",
    desde: numero(v.desde, 0),
    mcId: typeof v.mcId === "string" ? v.mcId.slice(0, 64) : "",
  };
}

/** @param {any} v @returns {SyncDiscord} */
function syncLido(v) {
  const n = (/** @type {unknown} */ x) => Math.max(0, Math.floor(numero(x, 0)));
  if (!v || typeof v !== "object") return { baseC: 0, baseX: 0, pend: null };
  const p = v.pend;
  const pend =
    p && typeof p === "object" && typeof p.chave === "string" && p.chave.length > 0 && p.chave.length <= 64
      ? { chave: p.chave, c: Math.floor(numero(p.c, 0)), x: Math.floor(numero(p.x, 0)), sc: n(p.sc), sx: n(p.sx) }
      : null;
  return { baseC: n(v.baseC), baseX: n(v.baseX), pend };
}

/** @param {unknown} v @returns {string[]} lista de textos curtos, sem repetição */
function listaTexto(v) {
  return Array.isArray(v) ? [...new Set(v.filter((t) => typeof t === "string" && t !== "").map((t) => t.slice(0, 24)))].slice(0, 60) : [];
}

/**
 * Dados do jogador, do cache (cria os padrões se não houver nada salvo).
 * Com um Player, também atualiza o nome guardado.
 * @param {Player | string} alvo  o jogador ou o id dele
 * @returns {DadosJogador}
 */
export function dadosJogador(alvo) {
  const id = idDe(alvo);
  let dados = cache.get(id);
  if (!dados) {
    dados = completar(lerJson(PREFIXO_JOGADOR + id));
    cache.set(id, dados);
  }
  if (typeof alvo !== "string" && alvo.isValid && dados.nome !== alvo.name) {
    dados.nome = alvo.name;
    marcarSujo(id);
  }
  return dados;
}

/** @param {string} id */
function marcarSujo(id) {
  sujos.add(id);
  if (gravacaoAgendada) return;
  gravacaoAgendada = true;
  system.runTimeout(() => {
    gravacaoAgendada = false;
    descarregarJogadores();
  }, ATRASO_GRAVACAO);
}

/**
 * Grava na propriedade dinâmica os dados de um jogador com mudança pendente.
 * @param {string} id
 */
function descarregarJogador(id) {
  sujos.delete(id);
  const dados = cache.get(id);
  if (dados) gravarJson(PREFIXO_JOGADOR + id, dados);
}

/** Grava já todos os dados de jogador com mudança pendente (saída, desligamento, listagens, testes). */
export function descarregarJogadores() {
  for (const id of [...sujos]) {
    try {
      descarregarJogador(id);
    } catch (e) {
      console.warn(`[Vulpus] Não gravei os dados de ${id}: ${e}`);
    }
  }
}

/**
 * O jogador tem dados guardados (já gravados ou esperando gravação)?
 * @param {string} id
 */
export function temDadosSalvos(id) {
  return sujos.has(id) || world.getDynamicProperty(PREFIXO_JOGADOR + id) !== undefined;
}

/** Peso de um registro de jogador: quanto progresso ele tem (para escolher o certo entre dois com o mesmo nome). @param {any} j */
const pesoDe = (j) => numero(j?.xp, 0) + numero(j?.caudas, 0) + numero(j?.tempo, 0);

/**
 * Passa tudo o que era de um id para outro: o registro do jogador, as chaves com o id e, dentro de qualquer valor do mundo
 * (donos, clãs, progresso de mistérios...), o id entre aspas.
 * @param {string} velho
 * @param {string} novo
 * @returns {number} quantas propriedades mudaram
 */
function trocarId(velho, novo) {
  let mudou = 0;
  const entre = `"${velho}"`;
  const por = `"${novo}"`;
  for (const chave of world.getDynamicPropertyIds()) {
    try {
      const valor = world.getDynamicProperty(chave);
      const alvo = chave.includes(velho) ? chave.split(velho).join(novo) : chave;
      const texto = typeof valor === "string" && valor.includes(entre) ? valor.split(entre).join(por) : valor;
      if (alvo === chave && texto === valor) continue;
      world.setDynamicProperty(alvo, texto);
      if (alvo !== chave) world.setDynamicProperty(chave, undefined);
      mudou++;
    } catch (e) {
      console.warn(`[Vulpus] Não passei ${chave} do id ${velho} para ${novo}: ${e}`);
    }
  }
  for (const id of [velho, novo]) {
    cache.delete(id);
    sujos.delete(id);
  }
  return mudou;
}

/**
 * Quem entra num id novo (mundo copiado de um mundo local para um servidor, conta trocada de aparelho...) e tem um registro
 * antigo com o MESMO NOME (conta Xbox, confiável) ganha de volta os dados antigos. O registro antigo some, então só acontece
 * uma vez, e só vale se o antigo tem mais progresso que o novo.
 * @param {string} id
 * @param {string} nome
 */
function adotarDadosAntigos(id, nome) {
  try {
    if (!nome) return;
    descarregarJogadores();
    const procurado = nome.toLowerCase();
    /** @type {{ velho: string, peso: number } | undefined} */
    let melhor;
    for (const chave of world.getDynamicPropertyIds()) {
      if (!chave.startsWith(PREFIXO_JOGADOR) || chave === PREFIXO_JOGADOR + id) continue;
      const velho = chave.slice(PREFIXO_JOGADOR.length);
      if (velho.length < 6) continue; // ids curtos podem aparecer dentro de outros textos
      const bruto = world.getDynamicProperty(chave);
      if (typeof bruto !== "string") continue;
      let lido;
      try {
        lido = JSON.parse(bruto);
      } catch {
        continue;
      }
      if (typeof lido?.nome !== "string" || lido.nome.toLowerCase() !== procurado) continue;
      const peso = pesoDe(lido);
      if (!melhor || peso > melhor.peso) melhor = { velho, peso };
    }
    if (!melhor) return;
    const atual = lerJson(PREFIXO_JOGADOR + id);
    if (atual !== undefined && pesoDe(atual) >= melhor.peso) return;
    const n = trocarId(melhor.velho, id);
    console.warn(`[Vulpus] ${nome}: dados antigos (id ${melhor.velho}) passaram para o id novo (${n} propriedades).`);
  } catch (e) {
    console.warn(`[Vulpus] Não consegui adotar os dados antigos de ${nome}: ${e}`);
  }
}
world.afterEvents.playerJoin.subscribe(({ playerId, playerName }) => adotarDadosAntigos(playerId, playerName));

// Quem sai leva os dados para a propriedade na hora; ao desligar, vai tudo.
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  const gravar = () => {
    if (!sujos.has(playerId)) return;
    try {
      descarregarJogador(playerId);
    } catch (e) {
      console.warn(`[Vulpus] Não gravei os dados de ${playerId} ao sair: ${e}`);
    }
  };
  gravar();
  // Os outros ouvintes de saída (tempo online, Caudas) ainda mexem nos dados neste tick: grava de novo no seguinte.
  system.run(gravar);
});
try {
  system.beforeEvents.shutdown?.subscribe(() => descarregarJogadores());
} catch (e) {
  console.warn(`[Vulpus] Sem gancho de desligamento: ${e}`);
}

/**
 * Marca os dados do jogador para gravar (em lote, até ATRASO_GRAVACAO ticks depois; ver o topo do arquivo).
 * @param {Player | string} alvo
 * @returns {boolean} true (o limite de tamanho é conferido na gravação; avisa no log)
 */
export function salvarJogador(alvo) {
  dadosJogador(alvo);
  marcarSujo(idDe(alvo));
  return true;
}

/**
 * Aplica fn nos dados do jogador e salva.
 * @param {Player | string} alvo
 * @param {(dados: DadosJogador) => any} fn
 * @returns {DadosJogador}
 */
export function editarJogador(alvo, fn) {
  const dados = dadosJogador(alvo);
  fn(dados);
  salvarJogador(alvo);
  return dados;
}

/**
 * Todos os jogadores com dados salvos, inclusive quem está offline (ranking, staff).
 * @returns {{ id: string, dados: DadosJogador }[]}
 */
export function todosJogadores() {
  descarregarJogadores();
  return world
    .getDynamicPropertyIds()
    .filter((chave) => chave.startsWith(PREFIXO_JOGADOR))
    .map((chave) => {
      const id = chave.slice(PREFIXO_JOGADOR.length);
      return { id, dados: dadosJogador(id) };
    });
}

/**
 * Só as chaves que existem em PADROES, com o mesmo tipo do padrão.
 * @param {any} valores
 * @returns {Partial<Config>}
 */
function filtrarConfig(valores) {
  /** @type {Record<string, unknown>} */
  const limpo = {};
  if (!valores || typeof valores !== "object") return limpo;
  for (const [chave, padrao] of Object.entries(PADROES)) {
    const valor = valores[chave];
    if (typeof valor !== typeof padrao) continue;
    if (typeof valor === "number" && !Number.isFinite(valor)) continue;
    limpo[chave] = valor;
  }
  return limpo;
}

/**
 * Configurações em vigor: PADROES + o que a staff mudou. Devolve uma cópia.
 * @returns {Config}
 */
export function config() {
  if (!cacheConfig) cacheConfig = { ...PADROES, ...filtrarConfig(lerJson(CHAVE_CONFIG)) };
  return { ...cacheConfig };
}

/**
 * Salva parte das configurações. Chaves desconhecidas ou de tipo errado são ignoradas.
 * @param {Partial<Config>} parcial
 * @returns {Config} a configuração nova
 */
export function salvarConfig(parcial) {
  gravarJson(CHAVE_CONFIG, { ...filtrarConfig(lerJson(CHAVE_CONFIG)), ...filtrarConfig(parcial) });
  cacheConfig = undefined;
  return config();
}

/**
 * Lê um valor JSON guardado no mundo.
 * @param {string} chave
 * @param {any} [padrao]  devolvido se não houver nada (ou se estiver corrompido)
 * @returns {any}
 */
export function lerMundo(chave, padrao) {
  const valor = lerJson(chave);
  return valor === undefined ? padrao : valor;
}

/**
 * Grava um valor como JSON no mundo; undefined apaga a chave.
 * @param {string} chave
 * @param {any} valor
 * @returns {boolean} se gravou
 */
export function salvarMundo(chave, valor) {
  if (chave === CHAVE_CONFIG) cacheConfig = undefined;
  if (chave.startsWith(PREFIXO_JOGADOR)) {
    sujos.delete(chave.slice(PREFIXO_JOGADOR.length)); // a gravação de agora vale mais que a pendente
    cache.delete(chave.slice(PREFIXO_JOGADOR.length));
  }
  if (valor === undefined) {
    world.setDynamicProperty(chave, undefined);
    return true;
  }
  return gravarJson(chave, valor);
}
