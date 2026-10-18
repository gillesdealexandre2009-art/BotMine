// @ts-check
// Textos dos pontos de spawn múltiplos (círculo em volta do spawn, sorteio ou escolha).

export const TITULO = "Pontos de spawn";
export const BOTAO_MENU = "Pontos de spawn (círculo)";
export const MODO_ALEATORIO = "Sorteado";
export const MODO_ESCOLHER = "A pessoa escolhe";
/** @param {number} n @param {string} modo */
export const CORPO = (n, modo) =>
  [
    "§7Vários pontos de chegada em volta do lobby, para o pessoal não nascer todo mundo no mesmo bloco.",
    "§7Novatos nascem num ponto sorteado. O §f/spawn §7e o botão Spawn do menu usam o modo abaixo.",
    "",
    `§fPontos: §e${n}`,
    `§fModo: §e${modo}`,
  ].join("\n");
export const BOTAO_CIRCULO = "Criar círculo de pontos aqui";
export const BOTAO_ADICIONAR = "Adicionar um ponto onde estou";
export const BOTAO_MODO = (/** @type {string} */ proximo) => `Mudar o modo para: ${proximo}`;
export const BOTAO_MOSTRAR = "Mostrar os pontos (partículas)";
export const BOTAO_LIMPAR = "Remover todos os pontos";
export const CONFIRMAR_LIMPAR = "Remover todos os pontos de spawn? O spawn único continua valendo.";
export const ROTULO_RAIO = "Raio do círculo (blocos)";
export const ROTULO_QTD = "Quantos pontos (12 ou mais)";
export const ROTULO_SUBSTITUIR = "Substituir os pontos que já existem";
export const ROTULO_OLHAR = "Direção que a pessoa olha ao chegar";
export const OLHARES = Object.freeze(["Para o centro", "Para fora", "Sem mudar"]);
/** @param {number} n @param {number} raio */
export const CIRCULO_OK = (n, raio) => `§a${n} pontos de spawn criados num círculo de §e${raio}§a blocos em volta de você.`;
/** @param {number} n */
export const PONTO_OK = (n) => `§aPonto de spawn §e${n}§a marcado aqui.`;
export const LIMITE = (/** @type {number} */ n) => `§cO limite é de ${n} pontos. Remova alguns antes.`;
export const SEM_PONTOS = "§7Nenhum ponto ainda. Fique no centro do lobby e crie o círculo.";
export const LIMPOS = "§aPontos de spawn removidos.";
/** @param {string} modo */
export const MODO_MUDOU = (modo) => `§aModo dos pontos de spawn: §e${modo}§a.`;
export const MOSTRANDO = "§7Mostrando os pontos por alguns segundos.";
/** @param {number} n */
export const NOME_PONTO = (n) => `Ponto ${n}`;
export const TITULO_ESCOLHA = "Para onde você vai?";
export const CORPO_ESCOLHA = "§7Escolha um ponto de chegada ou deixe a sorte decidir.";
export const BOTAO_SORTE = "Qualquer um (sorteio)";
export const BOTAO_IR = "Ir até ele";
export const BOTAO_REMOVER = "Remover este ponto";
export const CORPO_PONTO = (/** @type {string} */ coords) => `§fLugar: §e${coords}`;
export const PONTO_REMOVIDO = "§aPonto removido.";
