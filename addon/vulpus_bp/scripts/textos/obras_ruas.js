// @ts-check
// Textos das Ruas decoradas (obra da staff).

export const TITULO = "Ruas decoradas";
export const DESC_RUAS = "Abre o menu das ruas decoradas (só staff)";
export const BOTAO_RUAS = "Ruas decoradas";
export const BOTAO_NOVA = "Nova rua";
export const BOTAO_PERFIS = "Perfis de estilo";
export const BOTAO_DESFAZER = "Desfazer última decoração";
export const BOTAO_PONTO = "Adicionar ponto de borda onde estou";
export const BOTAO_TROCAR_LADO = (/** @type {number} */ agora) => `Trocar de lado (agora: Lado ${agora})`;
export const BOTAO_DESFAZER_PONTO = "Desfazer o último ponto";
export const BOTAO_VER = "Ver a marcação no chão";
export const BOTAO_APRENDER = "Aprender estilo desta rua";
export const BOTAO_DECORAR = "Decorar com estilo...";
export const BOTAO_RENOMEAR = "Renomear";
export const BOTAO_APAGAR_RUA = "Apagar esta rua";
export const BOTAO_APAGAR_PERFIL = "Apagar este perfil";
export const BOTAO_APLICAR = "Aplicar";
export const BOTAO_CANCELAR = "Cancelar";

export const SO_STAFF = "As ruas decoradas são só da staff.";
export const SEM_RUAS = "Nenhuma rua marcada ainda.";
export const SEM_PERFIS = "Nenhum perfil de estilo ainda. Marque uma rua já decorada e use \"Aprender estilo desta rua\".";
export const LIMITE_RUAS = "Limite de ruas marcadas atingido: apague uma antes.";
export const LIMITE_PONTOS = "Limite de pontos desta borda atingido.";
export const NAO_GRAVOU = "Não consegui gravar (o registro ficou grande demais). Apague ruas ou perfis.";
export const OUTRA_DIMENSAO = "Esta rua foi marcada em outra dimensão.";
export const SEM_COPIA = "Não há decoração para desfazer.";
export const PERFIL_SUMIU = "Esse perfil não existe mais.";

export const TITULO_NOVA = "Nova rua";
export const ROTULO_NOME = "Nome da rua";
export const ROTULO_MODO = "Como marcar";
export const MODOS = ["Duas bordas (Lado 1 e Lado 2)", "Contorno fechado (praça, cruzamento)"];
export const NOME_RUA_PADRAO = (/** @type {number} */ n) => `Rua ${n}`;

/** @param {number} n */
export const LISTA_RUA = (n) => `${n} pt`;
/** @param {string} nome @param {string} modo @param {number} a @param {number} b */
export const ITEM_RUA = (nome, modo, a, b) => `${nome}\n§7${modo === "contorno" ? `contorno: ${a} pontos` : `lado 1: ${a} • lado 2: ${b}`}`;
/** @param {string} nome @param {number} f @param {number} c */
export const ITEM_PERFIL = (nome, f, c) => `${nome}\n§7${f} fatias • ${c} blocos`;

/** @param {number} ruas @param {number} perfis @param {boolean} copia */
export const CORPO = (ruas, perfis, copia) =>
  [
    "§7Marque as BORDAS da rua (só o piso, nunca a área dos arbustos). A ferramenta decora para fora delas igual a uma rua que você já decorou à mão.",
    "",
    `§fRuas marcadas: §7${ruas}   §fPerfis de estilo: §7${perfis}`,
    copia ? "§aHá uma decoração que pode ser desfeita." : "§7Nada para desfazer.",
  ].join("\n");

/** @param {string} nome @param {string} modo @param {number} a @param {number} b @param {number} lado */
export const CORPO_RUA = (nome, modo, a, b, lado) =>
  [
    `§fRua: §7${nome}`,
    modo === "contorno"
      ? `§fContorno fechado: §7${a} ponto(s) (mínimo 3). Ande pela borda do piso e adicione um ponto a cada curva.`
      : `§fLado 1: §7${a} ponto(s)   §fLado 2: §7${b} ponto(s) (mínimo 2 em cada)\n§fMarcando agora: §aLado ${lado}\n§7Ande por uma borda do piso adicionando pontos, depois troque de lado e faça a outra. O ponto pode ficar no último bloco do piso ou no primeiro bloco fora dele.`,
  ].join("\n");

export const PONTO_OK = (/** @type {number} */ lado, /** @type {number} */ n, /** @type {string} */ onde, /** @type {string} */ modo) =>
  modo === "contorno" ? `Ponto ${n} do contorno em ${onde}.` : `Ponto ${n} do Lado ${lado} em ${onde}.`;
export const PONTO_TIRADO = "Último ponto desfeito.";
export const SEM_PONTO = "Esta borda não tem pontos.";
export const LADO_AGORA = (/** @type {number} */ l) => `Marcando o Lado ${l}.`;
export const RENOMEADA = "Rua renomeada.";
export const APAGADA = "Rua apagada.";
export const VER_OK = "As bordas aparecem em partículas por alguns segundos.";
export const CONFIRMAR_APAGAR_RUA = "Apagar esta rua marcada? (A decoração já feita no mundo fica como está.)";
export const CONFIRMAR_APAGAR_PERFIL = "Apagar este perfil de estilo?";

export const TITULO_APRENDER = "Aprender estilo";
export const ROTULO_PERFIL = "Nome do perfil (ex.: Era do Outono)";
export const PERFIL_VAZIO_NOME = "Escolha um nome para o perfil.";
export const LIMITE_PERFIS = "Limite de perfis atingido: apague um antes.";
/** @param {string} nome @param {number} f @param {number} c @param {boolean} cortou */
export const PERFIL_OK = (nome, f, c, cortou) => `Perfil "${nome}" guardado: ${f} fatias, ${c} blocos.` + (cortou ? " §eA rua era longa: guardei só trechos contínuos para caber (limite de tamanho)." : "");
export const APRENDER_FALHOU = (/** @type {string} */ m) => `Não deu para aprender: ${m}.`;
export const RUA_INCOMPLETA = (/** @type {string} */ e) => `Marcação incompleta: ${e}.`;

export const TITULO_DECORAR = "Decorar a rua";
export const ESCOLHA_PERFIL = "Escolha o perfil de estilo:";
export const ROTULO_INTENSIDADE = "Intensidade (0 a 100%)";
export const ROTULO_ESPELHAR = "Espelhar os lados (os dois lados iguais)";
export const TITULO_PREVIA = "Prévia da decoração";
/** @param {number} cols @param {number} prot @param {number} blocos @param {number} carga */
export const CORPO_PREVIA = (cols, prot, blocos, carga) =>
  [
    `§fColunas que serão decoradas: §a${cols}`,
    `§fColunas puladas por proteção do terreno: §e${prot}`,
    `§fBlocos que mudam: §a${blocos}`,
    ...(carga > 0 ? [`§c${carga} ponto(s) não carregaram a tempo e ficaram de fora.`] : []),
    "",
    "§7Nada foi alterado ainda. Aplicar guarda uma cópia da área e depois decora.",
  ].join("\n");
export const PREVIA_VAZIA = "Nada para decorar com essas configurações (tudo pulado ou sem decoração no perfil).";
export const PREVIA_SUMIU = "A prévia expirou. Gere de novo.";
export const DECORADA = (/** @type {number} */ n) => `Rua decorada: ${n} blocos. Dá para desfazer pelo menu.`;
export const CONFIRMAR_DESFAZER = "Devolver a área ao que era antes da última decoração?";
export const SUBSTITUI_COPIA = "A cópia da decoração anterior será trocada pela desta (a anterior não poderá mais ser desfeita).";

export const NOME_APRENDER = "aprender estilo de rua";
export const NOME_PREVIA = "prévia da decoração";
export const NOME_DECORAR = "decorar rua";
export const NOME_DESFAZER = "desfazer decoração de rua";

/** @param {string} nome @param {number} f @param {number} c @param {number} paleta @param {boolean} cortou */
export const CORPO_PERFIL = (nome, f, c, paleta, cortou) =>
  [`§fPerfil: §7${nome}`, `§fFatias: §7${f}`, `§fBlocos: §7${c} (${paleta} tipos)`, ...(cortou ? ["§eGuardado só em trechos (a rua era longa)."] : [])].join("\n");
