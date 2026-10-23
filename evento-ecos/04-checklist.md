# Ecos dos Ausentes: testes e cronograma até 2/11

## Testes automáticos (mock)

`cd C:\Users\gille\vt\mock && node --import ./registrar.mjs teste_ecos.mjs` cobre: janela antes/aberto/depois com relógio controlado (início inclusive, fim exclusive, 24 h exatas), estado gravado no mundo e avisos sem repetir depois de "reinício", entrada bloqueada e liberada, expulsão ao fechar (e de quem entra por outro meio), construção do mapa aos poucos, retomada, nenhuma operação de preenchimento acima de 30000 blocos, áreas de ticking soltas, reconstrução só do dono com confirmação dupla, portais e objetivos marcados (e permissões), falas uma por tela, enigma errado e certo, fragmento uma vez só, `requer` com texto neutro, elites por dano mínimo, teto de criaturas, reaparecimento lento, fase 2 do Testemunho, escolha final (3 variações de fala e selo), dados corrompidos, progresso por jogador, total de **16** fragmentos, inventário cheio, reaparecer após a morte com fragmentos protegidos, painel e números.

Também: `tsc` limpo nos três `jsconfig*.json`, e a suíte inteira (`bash rodar_todos.sh`).

## Checklist no jogo (antes de 2/11)

Marque cada item quando testar com **duas contas**: uma da staff e uma comum.

**Instalação**
- [ ] Packs novos instalados no servidor e servidor reiniciado.
- [ ] Sem erro do Vulpus no Content Log ao subir.
- [ ] Texturas e modelos das 4 criaturas aparecem (use `/summon vulpus:ecos_errante` como staff para ver; `ecos_sentinela`, `ecos_memoria`, `ecos_testemunho`).

**Mapa**
- [ ] Construir mapa chega a 100% e some a mensagem de progresso.
- [ ] Reiniciar o servidor no meio da construção e ver "Continuar construção" (opcional, se der).
- [ ] Ir para Ecos leva ao Limiar; as 4 áreas existem; o fog muda ao trocar de área.
- [ ] Nenhum buraco no chão, nenhuma sala fechada demais, escadas e portas passáveis.

**Portais**
- [ ] Entrada marcada: conta comum **antes** da janela recebe "ainda está fechada"; staff entra.
- [ ] Saída marcada: leva ao spawn.
- [ ] Botão "Ir para Ecos" no menu da staff.

**Objetivos (conta comum, com a janela de teste aberta)**
- [ ] E01 a E13 marcados e abrindo (clique direito no bloco; a staff agachada não abre).
- [ ] Cada objetivo dá o fragmento uma vez só; repetir mostra "já recolheu".
- [ ] Enigmas: resposta errada só dá a pista e deixa tentar de novo.
- [ ] E12 e E13 sem o E08: texto neutro "nada responde ainda".
- [ ] Tela "Fragmento de Alma +N" e o item no inventário.
- [ ] Inventário cheio: o fragmento cai no chão.

**Criaturas**
- [ ] Errantes, Sentinelas, Memória e Testemunho aparecem nos pontos, nunca acima do teto.
- [ ] Nada cai das criaturas e nenhuma explode nem quebra bloco.
- [ ] Sentinela do E09 e do E10 pagam o fragmento certo para quem bateu; reaparecem devagar.
- [ ] Clicar na Memória e no Testemunho abre a conversa antes da luta.
- [ ] Testemunho a 50%: dois errantes e o fog pesa; ao morrer o fog volta.
- [ ] Escolhas soltar, guardar e lutar: fragmentos iguais, última fala e selo diferentes.

**Morte e proteção**
- [ ] Morrer na dimensão: reaparece na entrada do Limiar, com os fragmentos.
- [ ] Peças `ausente_*` equipadas não somem na morte.

**Janela**
- [ ] Datas de teste (daqui a 5 min, duração curta): abre sozinha, aviso geral, aviso na dimensão.
- [ ] Avisos de fechamento (testar com janela de 70 min: 1 h e 10 min; 1 min).
- [ ] Ao fechar: todos voltam ao spawn, criaturas somem, conta comum não entra mais; staff entra.
- [ ] Reiniciar o servidor durante a janela: continua aberta, sem repetir "aberta".

**Depois dos testes**
- [ ] Resetar o progresso das contas de teste (dono).
- [ ] Datas finais: 2026-11-02 00:05 e 2026-11-03 00:05 (24 h).
- [ ] Evento ligado.

## Cronograma até 2/11

| Data | O que fazer |
|---|---|
| 23/10 a 25/10 | revisar o código e as falas; instalar os packs novos num servidor de teste |
| 26/10 | construir o mapa; olhar as 4 áreas e corrigir o que ficar estranho |
| 27/10 e 28/10 | marcar portais, E01 a E13 e os pontos de criatura; primeiro teste completo com duas contas |
| 29/10 | janela de teste com amigos (datas curtas); ajustar teto, espera e dano mínimo; resetar progresso depois |
| 30/10 | ajustes finais; congelar o código; instalar no servidor de verdade e reiniciar |
| 31/10 | o Hollow termina às 23:59:59; conferir que os dois eventos não se atrapalham; resetar os progressos de teste e confirmar as datas do Ecos |
| 1/11 | checagem final do painel (24 h, ligado, portais, objetivos, criaturas); aviso no Discord com a data e a hora; reinícios agendados de 2/11 desligados |
| 2/11 00:05 | a passagem abre sozinha; acompanhar o chat e o painel (números de entradas e fragmentos) |
| 2/11 (dia) | ficar de olho em lag e em dúvidas; nada de construir ou reconstruir com a janela aberta |
| 3/11 00:05 | a passagem fecha sozinha; todos voltam ao spawn |
| depois | desligar o evento, guardar os números do painel, ligar os reinícios agendados de novo |
