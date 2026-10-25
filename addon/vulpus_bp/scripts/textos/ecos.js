// @ts-check
// Textos de interface do evento "Ecos dos Ausentes" (a história e as falas ficam em ecos_docs.js).

// ------------------------------------------------------------------------------------ jogo (quem joga)
export const NOME_DESTINO = "Ecos dos Ausentes";
export const AVISO_GERAL = "§7A passagem para os Ecos dos Ausentes está aberta no portal do spawn.";
export const DESLIGADO = "§7Os Ecos dos Ausentes não estão abertos agora.";
export const NAO_CONSTRUIDO = "A passagem ainda não está pronta. Avise a staff.";
export const EM_MINIGAME = "Termine o minigame antes de atravessar a passagem.";
export const SAIU = "§7Você voltou para o spawn.";
export const REAPARECEU = "§7Você acordou de novo no Limiar. Os fragmentos que você carregava ficaram com você.";
export const FRAGMENTOS_DEVOLVIDOS = "§dSeus fragmentos e equipamentos dos Ausentes foram devolvidos.";
export const TITULO_CHEGADA = "§6Ecos dos Ausentes";
export const SUB_CHEGADA = "§7O Limiar";
export const TITULO_PROLOGO = "Ecos dos Ausentes";
export const PROLOGO =
  "Na vila de Névoa-Velha, todo Dia de Finados as pessoas acendiam uma luz para quem partiu. A Guardiã Auren quis guardar todas as lembranças da vila " +
  "para que ninguém fosse esquecido, e para isso prendeu cada lembrança num fragmento de alma. Foi demais para uma pessoa só.\n\n" +
  "Agora os moradores são ecos que repetem o que faziam. Converse com eles, ajude-os a lembrar e junte os fragmentos: são 16 no total, e a passagem só fica aberta por 24 horas.";
export const BOTAO_CONTINUAR = "Continuar";
export const BOTAO_FECHAR = "Fechar";
export const BOTAO_SAIR_CONVERSA = "Sair da conversa";
export const BOTAO_TENTAR_DE_NOVO = "Tentar de novo";
export const TENTE_DE_NOVO = "Sem pressa: você pode responder de novo.";
export const AINDA_NAO = "Nada responde ainda. Talvez falte ouvir outros ecos antes.";
export const JA_FEITO = "Você já recolheu o que havia aqui.";
export const JA_RECOLHEU = "Já não há mais nada para você aqui.";
export const LUTAR_AVISO = "A luta começa quando você atacar. Quem causar dano até o fim leva os fragmentos.";
export const FRAGMENTO_CHAO = "§7Seu inventário está cheio: o fragmento caiu aos seus pés.";
export const FRAGMENTO_ERRO = "§cNão consegui entregar o fragmento. Avise a staff (nada foi perdido).";
export const SO_TESTE = "§7(Modo teste da staff: fora da janela do evento nada é recompensado.)";
export const FASE_DOIS = "§c§lO Testemunho se enche de velas. Ele chama os ecos para perto!";

/** @param {number} n @param {number} total @param {number} max */
export const FRAGMENTO_MAIS = (n, total, max) => `§dFragmento de Alma +${n} §7(${Math.min(total, max)}/${max})`;

/** Última fala do Testemunho muda pela escolha final; o resto da cena é igual. */
export const ULTIMA_FALA = Object.freeze({
  soltar: "Os ecos se despedem, um a um. A névoa levanta e a vila, enfim, descansa. Você não esquece, e eles também não.",
  guardar: "As velas voltam a acender e cada rosto retorna ao seu lugar. A vila fica guardada, e você guarda um pouco dela.",
  lutar: "Você enfrentou a lembrança de frente. O que sobra da vila lembra de você como quem não desviou o olhar.",
});

// ------------------------------------------------------------------------------------ construção do mapa
export const JA_CONSTRUINDO = "O mapa já está sendo construído.";
export const SEM_DIMENSAO = "A dimensão dos Ecos não existe neste mundo (o addon precisa ser instalado e o servidor reiniciado).";
export const JA_CONSTRUIDO = "O mapa já está construído. Só o dono pode reconstruir.";
export const FASE_PREPARANDO = "preparando";
export const CONSTRUINDO = "Construindo o mapa dos Ecos aos poucos. Acompanhe pela actionbar; não precisa ficar perto.";
export const AREA_NAO_CARREGOU = "a área não carregou (tente de novo com o servidor mais vazio)";
/** @param {number} feitas @param {number} total */
export const RETOMANDO = (feitas, total) => `Continuando a construção (${feitas} de ${total} etapas já prontas).`;
/** o mundo recusou uma área de ticking: diz qual foi o pedido e que vai tentar em pedaços menores */
export const LIMITE_TICKING = (chunks, motivo, pedacos) => `O mundo recusou abrir a área de obra (~${chunks} chunks): ${motivo}. Tentando de novo em ${pedacos} pedaços menores.`;
/** a área da janela demorou para carregar: a obra tenta de novo em pedaços menores */
export const AREA_DEMOROU = (n, total, chunks, seg, pedacos) => `A área da janela ${n}/${total} (${chunks} chunks) não terminou de carregar em ${seg} s. Tentando de novo em ${pedacos} pedaços menores.`;
export const AREA_NAO_TERMINOU = (n, total, chunks, seg) => `a área da janela ${n}/${total} (${chunks} chunks) não terminou de carregar em ${seg} s, nem em pedaços menores (servidor ocupado ou chunks que não geram); use "Continuar construção" com o servidor mais vazio`;
export const OBRA_TRAVADA = (onde) => `A obra parece travada (${onde}). Soltei as áreas: tente "Continuar construção".`;
export const OBRA_PARADA_LINHA = (motivo) => `§cobra parada (${motivo}): use "Continuar construção"`;
export const LIMITE_TICKING_FIM = (chunks, motivo) => `nem a menor janela (~${chunks} chunks) abriu: ${motivo}. O limite de ticking do mundo (300 chunks somados) está tomado por outras áreas; libere-as e use "Continuar construção"`;
/** @param {string} m */
export const FALHA_CONSTRUCAO = (m) => `Não consegui construir o mapa: ${m}. Pode tentar de novo; ele continua de onde parou.`;
/** @param {number} falhas */
export const CONSTRUIDO = (falhas) => `Mapa dos Ecos construído${falhas > 0 ? ` (${falhas} blocos não puderam ser colocados; veja o Content Log)` : ""}.`;
/** @param {string} fase @param {number} pct */
export const CONSTRUINDO_FASE = (fase, pct) => `§6Ecos §7${fase}... ${pct}%`;

// ------------------------------------------------------------------------------------ marcações (staff)
export const SEM_BLOCO = "Olhe para um bloco (a até 8 blocos) e tente de novo.";
export const BLOCO_AR = "Isso é ar. Olhe para um bloco sólido.";
/** @param {string} uso */
export const BLOCO_EM_USO = (uso) => `Esse bloco já serve a outra coisa do evento (${uso}).`;
/** @param {string} qual */
export const PORTAL_MARCADO = (qual) => `§aPortal de ${qual === "entrada" ? "entrada" : "saída"} marcado no bloco que você olha.`;
/** @param {string} id */
export const OBJETIVO_MARCADO = (id) => `§aObjetivo ${id} marcado no bloco que você olha.`;
export const PONTOS_LIMITE = "Já são pontos demais (40). Remova algum antes.";

// ------------------------------------------------------------------------------------ painel da staff
export const TITULO_STAFF = "Ecos dos Ausentes";
export const SO_STAFF = "Só a staff pode abrir isto.";
export const SO_DONO = "Só o dono pode fazer isso.";
export const BOTAO_STAFF = "Ecos dos Ausentes";
export const BOTAO_IR_ECOS = "Ir para Ecos";
export const GRUPO_ECOS = "Ecos dos Ausentes (evento)";
export const VOLTAR = "Voltar";

/** @param {string} estado */
const NOME_ESTADO = (estado) => ({ desligado: "§cdesligado", antes: "§eaguardando abrir", aberto: "§aABERTO", depois: "§7encerrado" })[/** @type {"desligado"} */ (estado)] ?? estado;

/**
 * @param {{ estado: string, inicio: string, fim: string, duracaoH: number, restante: string, construido: boolean, fases: string, ocupado: string, vivas: number, teto: number, portais: string, objetivos: number, totalObjetivos: number, pontosCriatura: number, entraram: number, fragmentos: number, concluiram: number, noPlano: number }} d
 */
export const CORPO_STAFF = (d) =>
  [
    `§7Estado: ${NOME_ESTADO(d.estado)}`,
    `§7Janela: §f${d.inicio} §7a §f${d.fim} §7(Brasília, ${d.duracaoH} h)${d.duracaoH === 24 ? "" : " §e<- não são 24 h"}`,
    d.restante ? `§7${d.restante}` : "",
    `§7Mapa: ${d.construido ? "§aconstruído" : `§enão construído §7(${d.fases})`}${d.ocupado ? ` §7- ${d.ocupado}` : ""}`,
    `§7Portais: §f${d.portais}`,
    `§7Objetivos marcados: §f${d.objetivos}/${d.totalObjetivos} §7- pontos de criatura: §f${d.pontosCriatura}`,
    `§7Criaturas vivas: §f${d.vivas}/${d.teto} §7- pessoas na dimensão: §f${d.noPlano}`,
    `§7Já entraram: §f${d.entraram} §7- fragmentos distribuídos: §f${d.fragmentos} §7- concluíram o final: §f${d.concluiram}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

/** @param {boolean} ligado */
export const BOTAO_LIGAR = (ligado) => (ligado ? "Desligar o evento" : "Ligar o evento");
/** @param {boolean} ligado */
export const EVENTO_ESTADO = (ligado) => (ligado ? "Evento Ecos ligado." : "Evento Ecos desligado (quem está lá dentro volta ao spawn).");
export const BOTAO_DATAS = "Datas da janela (dono)";
export const BOTAO_CONSTRUIR = "Construir mapa";
/** @param {number} feitas @param {number} total */
export const BOTAO_CONTINUAR_CONSTRUCAO = (feitas, total) => `Continuar construção (${feitas}/${total})`;
export const BOTAO_RECONSTRUIR = "Reconstruir mapa (dono)";
export const BOTAO_PORTAIS = "Portais de entrada e saída";
export const BOTAO_OBJETIVOS = "Objetivos E01 a E13";
export const BOTAO_CRIATURAS = "Criaturas";
export const BOTAO_RESETAR = "Resetar progresso de uma pessoa (dono)";
export const BOTAO_ATUALIZAR = "Atualizar números";
export const CONSTRUCAO_JA_FEITA = "O mapa já está construído.";
export const JANELA_ABERTA_NAO_CONSTROI = "Não dá para construir ou reconstruir com a janela aberta. Feche ou desligue o evento antes.";
export const RECONSTRUIR_1 = "Reconstruir apaga TUDO o que está na dimensão dos Ecos (inclusive o que a staff tenha acrescentado ali) e refaz o mapa do zero. Quem estiver lá volta ao spawn. Continuar?";
export const RECONSTRUIR_2 = "Última confirmação: isso não tem volta. Reconstruir o mapa dos Ecos agora?";
export const TITULO_RECONSTRUIR = "Reconstruir mapa";
export const SIM_RECONSTRUIR = "Sim, reconstruir";

// datas
export const TITULO_DATAS = "Datas dos Ecos";
export const ROTULO_INICIO = "Início (AAAA-MM-DD hh:mm, Brasília)";
export const ROTULO_FIM = "Fim (AAAA-MM-DD hh:mm, Brasília)";
export const DICA_DATA = "2026-11-02 00:05";
export const DATA_INVALIDA = "Data inválida. Use AAAA-MM-DD hh:mm (ex.: 2026-11-02 00:05).";
export const DATA_INVERTIDA = "O fim precisa ser depois do início.";
export const DATAS_SALVAS = "Datas salvas.";

// portais
export const TITULO_PORTAIS = "Portais dos Ecos";
export const CORPO_PORTAIS =
  "§7Entrada: um bloco no spawn/lobby que a pessoa clica para atravessar. Saída: um bloco dentro da dimensão que leva de volta ao spawn. Olhe o bloco e marque.";
/** @param {string} nome @param {Ponto | undefined} p */
export const BOTAO_PORTAL = (nome, p) => `${nome}\n§7${p ? `${p.x}, ${p.y}, ${p.z}` : "[vazio]"}`;
export const NOME_ENTRADA = "Entrada";
export const NOME_SAIDA = "Saída";
export const BOTAO_MARCAR_OLHANDO = "Marcar o bloco que estou olhando";
export const BOTAO_IR = "Ir até lá";
export const BOTAO_REMOVER = "Remover";
export const BOTAO_VER_TEXTO = "Ver as falas";
export const NADA_MARCADO = "Nada marcado aqui ainda.";
export const REMOVIDO = "Removido.";

// objetivos
export const TITULO_OBJETIVOS = "Objetivos dos Ecos";
export const CORPO_OBJETIVOS = "§7Cada objetivo mora em um bloco marcado (o bloco não é alterado). As elites também precisam de um ponto de criatura com o objetivo escolhido.";
/** @param {string} id @param {string} quem @param {Ponto | undefined} p */
export const BOTAO_OBJETIVO = (id, quem, p) => `${id} - ${quem}\n§7${p ? `${p.x}, ${p.y}, ${p.z}` : "[vazio]"}`;
/** @param {string} id @param {string} quem */
export const TITULO_OBJETIVO = (id, quem) => `${id} - ${quem}`;
/** @param {string} tipo @param {number} frag @param {Ponto | undefined} p @param {string} bloco */
export const CORPO_OBJETIVO = (tipo, frag, p, bloco) => `§7Tipo: §f${tipo}§7 - fragmentos: §f${frag}\n§7Bloco: §f${p ? `${p.x}, ${p.y}, ${p.z} (${p.d}) - ${bloco}` : "nada marcado"}`;

// criaturas
export const TITULO_CRIATURAS = "Criaturas dos Ecos";
export const CORPO_CRIATURAS =
  "§7Pontos de aparição: fique em pé onde a criatura deve nascer e adicione. Cada ponto tem um tipo e um máximo vivo ao mesmo tempo; o teto global limita o total na dimensão.";
export const BOTAO_ADICIONAR_PONTO = "Adicionar ponto onde estou";
export const BOTAO_TETO = "Teto, espera e dano mínimo";
export const BOTAO_LIMPAR_CRIATURAS = "Remover todas as criaturas agora";
export const CRIATURAS_LIMPAS = "Criaturas removidas (voltam pelo ciclo normal).";
export const TITULO_ADICIONAR = "Novo ponto de criatura";
export const ROTULO_TIPO = "Tipo";
export const ROTULO_MAX = "Quantas ao mesmo tempo";
export const ROTULO_OBJ_ELITE = "Objetivo que a sentinela paga";
export const SEM_OBJETIVO = "Nenhum";
export const TITULO_TETO = "Limites das criaturas";
export const ROTULO_TETO = "Teto de criaturas vivas na dimensão";
export const ROTULO_REAPARECE = "Espera para reaparecer (s)";
export const ROTULO_DANO_MIN = "Dano mínimo para ganhar o fragmento";
export const LIMITES_SALVOS = "Limites salvos.";
/** @param {number} i @param {{ t: string, x: number, y: number, z: number, max: number, obj?: string }} p */
export const BOTAO_PONTO = (i, p) => `${i + 1}. ${p.t} x${p.max}${p.obj ? ` (${p.obj})` : ""}\n§7${p.x}, ${p.y}, ${p.z}`;
export const NOMES_TIPO = Object.freeze({ errante: "Errante (comum)", sentinela: "Sentinela (elite)", memoria: "Memória Partida (E12)", testemunho: "Último Testemunho (E13)" });

// dono
export const TITULO_RESETAR = "Resetar progresso";
export const ROTULO_PESSOA = "Nome da pessoa";
export const PESSOA_NAO_ACHADA = "Não achei essa pessoa.";
/** @param {string} nome */
export const CONFIRMA_RESETAR = (nome) => `Apagar o progresso de ${nome} nos Ecos (objetivos, escolha final e selos)? Os fragmentos que ela já tem no inventário ficam.`;
/** @param {string} nome */
export const JOGADOR_RESETADO = (nome) => `Progresso de ${nome} apagado.`;
export const MAPA_NAO_CONSTRUIDO = "O mapa ainda não foi construído (use Construir mapa).";
export const IR_ECOS_FALHOU = "Não consegui levar você até lá.";

/** @typedef {{ d: string, x: number, y: number, z: number }} Ponto */
