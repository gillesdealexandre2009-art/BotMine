// @ts-check
// Textos de interface do evento "O Último Outono de Hollow" (sistemas/hollow.js e hollow_staff.js). A história em si fica em hollow_docs.js.
import { formatarCoords, nomeDimensao } from "../core/util.js";

// ------------------------------------------------------------------ jogador
export const DESC_COMANDO = "Abre o diário de investigação do evento de Halloween";
export const TITULO_DIARIO = "Diário de investigação";
export const BOTAO_DICA = "Dica";
export const BOTAO_FECHAR = "Fechar";
export const BOTAO_RELOGIO = "Pegar o Relógio de Hollow";
export const TITULO_TRANCADO = "Ainda não dá para ler";
export const TITULO_DICA = "Dica";
export const EVENTO_DESLIGADO = "O evento de Halloween está desligado agora.";
export const INTERACAO_PASSIVA = "§7Você mexe nos papéis, mas não consegue ler agora.";

/** @param {number} lidos @param {number} total */
export const LINHA_PROGRESSO = (lidos, total) => `§7Registros encontrados: §f${lidos} de ${total}`;
/** @param {number} posicao */
export const LINHA_CONCLUIDO = (posicao) => `§6Você concluiu a investigação (#${posicao}).`;
export const LINHA_VAZIO = "§8Você ainda não encontrou nenhum registro. Eles estão espalhados pelo mundo.";
export const LINHA_ENCERRADO = "§8O evento terminou: dá para reler os registros, mas não há mais recompensas.";
export const LINHA_AINDA_NAO = "§8O evento ainda não começou.";
/** @param {string} titulo @param {string} link */
export const LINHA_AUDIO = (titulo, link) => `§7${titulo}\n§b🎧 Ouvir: §f${link}`;
/** @param {string} link */
export const LINHA_AUDIO_REGISTRO = (link) => `\n\n§b🎧 Ouvir: §f${link}`;
export const SECAO_LER = "Registros que você já leu";
/** @param {string} nome */
export const BOTAO_REGISTRO = (nome) => nome;

// Dica do botão (primeira que se aplica, da etapa mais avançada para a menos).
export const DICA_ENIGMA = "Há um último lugar, junto da água.";
export const DICA_ABRIGO_SEM_ENIGMA = "Os papéis estão incompletos. Procure uma mesa no fundo.";
export const DICA_ACAMPAMENTO = "Um bilhete fala de um abrigo debaixo da colina.";
export const DICA_SOTAO = "O mapa aponta para a mata.";
export const DICA_CASA = "Há mais na casa. Olhe lá em cima, no sótão.";
export const DICA_NADA = "Comece pela casa perto do spawn. Procure um bilhete na cozinha.";
export const DICA_CONCLUIDO = "Você já reconstruiu a história. O resto é só reler.";

/** Nome do local que falta (só o lugar, nunca o texto). @param {string[]} locais */
export const FALTA_LOCAL = (locais) => `§7Você sente que ainda falta algo em: §f${locais.join(", ")}§7.`;
export const NOME_LOCAL = Object.freeze({ escondido: "Abrigo", casa: "Casa", sotao: "Casa", acampamento: "Acampamento", abrigo: "Abrigo", mesa: "Abrigo", ponte: "Ponte" });

export const DICA_COFRE = "Os papéis do abrigo estão trancados. Procure papelzinhos escondidos e um cofre.";
/** @param {number} x @param {number} total */
export const LINHA_PAPELZINHOS = (x, total) => `§7Papelzinhos: §f${x} de ${total}`;

// ------------------------------------------------------------------ cofre
export const TITULO_COFRE = "O cofre";
export const ROTULO_CODIGO = "Código (4 números)";
export const COFRE_INVALIDO = "O código tem 4 números.";
export const COFRE_ESPERA = "Espere um instante antes de tentar de novo.";
export const COFRE_ERRADO = "§7Nada acontece. O código não é esse.";
export const COFRE_ABERTO = "§7A caixa já está aberta.";
export const COFRE_SUCESSO = "§aClique. A caixa abre. Dentro, papéis dobrados: um jornal, um ingresso, um registro. Agora você consegue lê-los.";

// ------------------------------------------------------------------ enigma
export const TITULO_ENIGMA = "A data";
export const ROTULO_DIA = "Dia";
export const ROTULO_MES = "Mês";
export const ROTULO_ANO = "Ano";
export const ENIGMA_INVALIDO = "Preencha dia, mês e ano só com números.";
export const ENIGMA_ESPERA = "Respire um instante antes de tentar de novo.";
export const ENIGMA_ERRADO = "§7Não é esse o dia. Os papéis ainda não concordam.";
export const ENIGMA_JA_RESOLVIDO = "§7Você já descobriu o dia. Os papéis não discordam mais.";
/** @param {string} ponte coordenadas (ou o aviso de que a staff não marcou) */
export const ENIGMA_SUCESSO = (ponte) => `§aEra esse o dia. Embaixo da folha há um mapa novo:\n§fPonte: ${ponte}`;
export const SEM_COORD = "[a staff ainda não marcou]";

// ------------------------------------------------------------------ conclusão
/** @param {number} n */
export const TELA_PREMIO = (n) => `§6Você foi a ${n}ª pessoa a concluir.\n\n§7O selo Kitsune será entregue pela staff.`;
export const TITULO_CONCLUIDO = "Fim da investigação";
export const RELOGIO_NOME = "§7Relógio de Hollow";
export const RELOGIO_LORE = ["§8Parado às 21h47.", "§8Ele só marca o que ficou."];
export const RELOGIO_OK = "§7Você guarda o relógio. Ele não anda, e tudo bem.";
export const RELOGIO_CHAO = "§7Seu inventário está cheio: o relógio caiu aos seus pés.";
export const RELOGIO_JA = "Você já pegou o relógio.";
export const RELOGIO_NAO_AINDA = "O relógio só é entregue a quem concluiu a investigação.";

// ------------------------------------------------------------------ vento
/** Som discreto do vento (vanilla). */
export const SOM_VENTO = "ambient.cave";

// ------------------------------------------------------------------ áudios das leituras (sons do resource pack)
/** @param {string} audio  A1..A4 */
export const SOM_AUDIO = (audio) => `vulpus.hollow_${audio.toLowerCase()}`;
export const BOTAO_OUVIR = "🎧 Ouvir a leitura";
export const BOTAO_PARAR = "Parar o áudio";

// ------------------------------------------------------------------ painel da staff
export const SO_STAFF = "Só a staff pode fazer isso.";
export const SO_DONO = "Só um dono pode fazer isso.";
export const TITULO_STAFF = "Evento Hollow";
/** @param {{ ligado: boolean, inicio: string, fim: string, pontos: number, total: number, casa: boolean, concluidos: number, ventoLigado: boolean, cofres: number }} i */
export const CORPO_STAFF = (i) =>
  [
    `§7Evento: ${i.ligado ? "§aligado" : "§cdesligado"}§7 · de §f${i.inicio}§7 a §f${i.fim}§7 (Brasília)`,
    `§7Registros e papelzinhos marcados: §f${i.pontos} de ${i.total} §7· cofres marcados: §f${i.cofres}`,
    `§7Casa (centro do vento): ${i.casa ? "§amarcada" : "§cnão marcada"}§7 · vento ${i.ventoLigado ? "§aligado" : "§cdesligado"}`,
    `§7Pessoas que concluíram: §f${i.concluidos}`,
  ].join("\n");
/** @param {boolean} ligado */
export const BOTAO_LIGAR = (ligado) => (ligado ? "Desligar o evento" : "Ligar o evento");
export const BOTAO_DATAS = "Datas do evento";
export const BOTAO_LOCAIS = "Locais";
export const BOTAO_REGISTROS = "Registros";
export const BOTAO_AUDIOS = "Áudios";
export const BOTAO_COFRES = "Cofres";
export const BOTAO_CODIGO = "Código do cofre";
export const TITULO_COFRES = "Cofres do abrigo";
export const CORPO_COFRES = "§7Marque quantos blocos quiser: todos abrem o mesmo cofre (o código vale para todos). Nunca altero o bloco.";
export const BOTAO_MARCAR_COFRE = "Marcar bloco que estou olhando";
/** @param {number} n @param {{ x: number, y: number, z: number }} p */
export const BOTAO_COFRE = (n, p) => `Cofre ${n}: ${formatarCoords(p)}`;
/** @param {string} coords */
export const COFRE_MARCADO = (coords) => `Cofre marcado em ${coords}.`;
export const COFRE_REMOVIDO = "Cofre removido.";
export const COFRE_JA_MARCADO = "Esse bloco já é um cofre.";
export const COFRE_LIMITE = "Já há cofres demais marcados (50).";
export const TITULO_CODIGO = "Código do cofre";
export const ROTULO_CODIGO_NOVO = "Código (4 números; muda os papelzinhos)";
export const CODIGO_INVALIDO = "O código precisa ter exatamente 4 números.";
/** @param {string} c */
export const CODIGO_SALVO = (c) => `Código do cofre: ${c}. Os papelzinhos já mostram os novos dígitos.`;
export const BOTAO_VENTO = "Vento da casa";
export const BOTAO_VENCEDORES = "Vencedores (dono)";
export const BOTAO_RESETAR_JOGADOR = "Resetar progresso de uma pessoa (dono)";
export const BOTAO_RESETAR_VENCEDORES = "Resetar vencedores (dono)";
export const BOTAO_DIAS = "Dias do selo Kitsune (dono)";
/** @param {boolean} ligado */
export const EVENTO_ESTADO = (ligado) => `Evento Hollow ${ligado ? "ligado" : "desligado"}.`;

export const TITULO_DATAS = "Datas do evento";
export const ROTULO_INICIO = "Início (AAAA-MM-DD hh:mm, Brasília)";
export const ROTULO_FIM = "Fim (AAAA-MM-DD hh:mm, Brasília; vale até o fim desse minuto)";
export const DATA_INVALIDA = "Data inválida. Use AAAA-MM-DD hh:mm, por exemplo 2026-10-25 00:00.";
export const DATA_INVERTIDA = "O fim precisa ser depois do início.";
export const DATAS_SALVAS = "Datas salvas.";
export const DICA_DATA = "2026-10-25 00:00";

export const TITULO_LOCAIS = "Locais do evento";
export const CORPO_LOCAIS = "§7Os textos dos registros mostram estas coordenadas. A casa é também o centro do vento.";
export const NOMES_LOCAIS = Object.freeze({ casa: "Casa", acampamento: "Acampamento", abrigo: "Abrigo", ponte: "Ponte" });
/** @param {string} nome @param {{ d: string, x: number, y: number, z: number } | undefined} p */
export const BOTAO_LOCAL = (nome, p) => `${nome}: ${p ? `§a${formatarCoords(p)}` : "§c[vazio]"}`;
/** @param {string} nome @param {{ d: string, x: number, y: number, z: number } | undefined} p */
export const CORPO_LOCAL = (nome, p) => (p ? `§7${nome}: §f${formatarCoords(p)} §7(${nomeDimensao(p.d)})` : `§7${nome}: §cainda não marcado.`);
export const BOTAO_MARCAR_AQUI = "Marcar onde estou";
export const BOTAO_IR = "Ir até lá";
export const BOTAO_REMOVER = "Remover";
/** @param {string} nome */
export const LOCAL_MARCADO = (nome) => `${nome} marcado onde você está.`;
/** @param {string} nome */
export const LOCAL_REMOVIDO = (nome) => `${nome} removido.`;
export const NADA_MARCADO = "Isso ainda não foi marcado.";

export const TITULO_REGISTROS = "Registros do evento";
export const CORPO_REGISTROS = "§7Cada registro mora num bloco do mundo (baú, placa, porta, o que você quiser). Olhe para o bloco e use \"Marcar\". Nunca altero o bloco.";
/** @param {string} id @param {string} titulo @param {{ x: number, y: number, z: number } | undefined} p */
export const BOTAO_REGISTRO_STAFF = (id, titulo, p) => `${id} · ${titulo}\n${p ? `§a${formatarCoords(p)}` : "§c[vazio]"}`;
/** @param {string} id @param {string} titulo */
export const TITULO_REGISTRO_STAFF = (id, titulo) => `${id} · ${titulo}`;
/** @param {string} local @param {{ d: string, x: number, y: number, z: number } | undefined} p @param {string} bloco */
export const CORPO_REGISTRO_STAFF = (local, p, bloco) =>
  `§7Local: §f${local}\n` + (p ? `§7Marcado em §f${formatarCoords(p)} §7(${nomeDimensao(p.d)}), bloco §f${bloco}` : "§cAinda não marcado.");
export const BOTAO_MARCAR_OLHANDO = "Marcar bloco que estou olhando";
export const BOTAO_VER_TEXTO = "Ver o texto (prévia, não conta como lido)";
export const SEM_BLOCO = "Não achei bloco na sua mira (chegue mais perto, até 8 blocos).";
export const BLOCO_AR = "Isso é ar: olhe para um bloco.";
/** @param {string} id */
export const JA_USADO = (id) => `Esse bloco já guarda o registro ${id}. Remova-o antes.`;
/** @param {string} id @param {string} coords */
export const REGISTRO_MARCADO = (id, coords) => `Registro ${id} marcado em ${coords}.`;
/** @param {string} id */
export const REGISTRO_REMOVIDO = (id) => `Registro ${id} removido.`;

export const TITULO_AUDIOS = "Links de áudio";
/** @param {string} id */
export const ROTULO_AUDIO = (id) => `Áudio ${id} (link; vazio = sem áudio)`;
export const AUDIO_INVALIDO = "O link precisa começar com http:// ou https:// e ter até 200 caracteres, sem espaços.";
export const AUDIOS_SALVOS = "Áudios salvos.";

export const TITULO_VENTO = "Vento da casa";
export const ROTULO_VENTO_LIGADO = "Vento ligado";
export const ROTULO_VENTO_RAIO = "Raio (blocos)";
export const ROTULO_VENTO_ESPERA = "Espera entre ventos, por pessoa (s)";
export const VENTO_SALVO = "Vento salvo.";

// ------------------------------------------------------------------ dono
export const TITULO_VENCEDORES = "Evento Hollow: vencedores";
/** @param {number} total @param {number} dias */
export const CORPO_VENCEDORES = (total, dias) => `§7Pessoas que concluíram: §f${total}\n§7Selo Kitsune: §f${dias} dias §7(só as duas primeiras ganham).`;
/** @param {{ nome: string, posicao: number, quando: string, entregue: boolean }} v */
export const LINHA_VENCEDOR = (v) => `§f${v.posicao}º §7${v.nome} · ${v.quando}${v.entregue ? " §a(Kitsune entregue)" : ""}`;
/** @param {number} dias */
export const BOTAO_DAR_KITSUNE = (dias) => `Dar Kitsune (${dias} dias)`;
export const VENCEDORES_VAZIO = "§8Ninguém concluiu ainda.";
/** @param {string} nome @param {number} dias */
export const CONFIRMA_KITSUNE = (nome, dias) => `Dar o selo Kitsune por ${dias} dias para ${nome}? Isso só pode ser feito uma vez por pessoa.`;
export const KITSUNE_SO_DOIS = "A recompensa Kitsune é só das duas primeiras posições.";
export const KITSUNE_JA_ENTREGUE = "O selo dessa pessoa já foi entregue.";
export const KITSUNE_FALHOU = "Não consegui entregar o selo (veja a mensagem acima). Tente de novo.";
export const ROTULO_DIAS = "Dias do selo (1 a 365)";
export const DIAS_SALVOS = "Dias salvos.";
export const ROTULO_PESSOA = "Nome da pessoa";
export const TITULO_RESETAR_JOGADOR = "Resetar progresso";
/** @param {string} nome */
export const CONFIRMA_RESETAR_JOGADOR = (nome) => `Apagar o progresso de ${nome} no evento (registros, enigma, relógio)? A lista de vencedores não muda.`;
/** @param {string} nome */
export const JOGADOR_RESETADO = (nome) => `Progresso de ${nome} apagado.`;
export const PESSOA_NAO_ACHADA = "Não achei essa pessoa.";
export const CONFIRMA_RESETAR_1 = "Apagar a lista de vencedores? Quem já concluiu continua com o evento concluído, mas as posições recomeçam do 1.";
export const CONFIRMA_RESETAR_2 = "Tem certeza mesmo? Isso não pode ser desfeito.";
export const VENCEDORES_RESETADOS = "Lista de vencedores apagada.";
export const BOTAO_PAINEL_DONO = "Evento Hollow: vencedores";
