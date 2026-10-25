# Ecos dos Ausentes: implementação e como montar o mundo

Versão básica ("o básico, depois melhora"). O código está todo no addon; nada é preciso editar à mão. O dono monta tudo pelo painel dentro do jogo.

## Arquivos

| Arquivo (em `addon/`) | Para quê |
|---|---|
| `vulpus_bp/scripts/sistemas/ecos.js` | janela de 24 h, avisos, entrada e saída, objetivos e falas, fragmentos, criaturas, morte e reaparecimento |
| `vulpus_bp/scripts/sistemas/ecos_staff.js` | painel Staff > Ecos dos Ausentes |
| `vulpus_bp/scripts/sistemas/ecos_dimensao.js` | dimensão `vulpus:ecos`, construção do mapa, fog por região, sons e partículas |
| `vulpus_bp/scripts/sistemas/ecos_mapa.js` | o mapa procedural das 4 áreas (Limiar, Vila, Arquivo, Arena) |
| `vulpus_bp/scripts/textos/ecos.js` | textos de interface (painel, avisos, botões) |
| `vulpus_bp/scripts/textos/ecos_docs.js` | história, falas, perguntas, fragmentos por objetivo e mensagens da janela |
| `vulpus_bp/scripts/textos/conquistas.js` | selos `ecos_soltar`, `ecos_guardar`, `ecos_lutar` |
| `vulpus_bp/entities/ecos_*.json`, `vulpus_rp/entity/ecos_*.entity.json` | as 4 criaturas (BP e cliente) |
| `vulpus_bp/loot_tables/vulpus/ecos_vazio.json` | tabela de loot vazia (nada cai) |
| `vulpus_rp/textures/vulpus/entidades/ecos_*.png` | texturas (geradas) |
| `vulpus_rp/fogs/ecos_*.json` | fog de cada área |
| `tools/gerar_ecos_criaturas.py` | refaz texturas e definições das criaturas |
| `vulpus_bp/scripts/core/db.js` | campo `ecos` do progresso de cada pessoa (validado ao ler) |
| `vulpus_bp/scripts/config.js` | `ecosLigado`, `ecosInicio`, `ecosFim`, `ecosTetoCriaturas`, `ecosReaparecerSeg`, `ecosDanoMin` |

Dados no mundo (propriedades dinâmicas): `vulpus:ecos:construido`, `:progresso` (fases do mapa prontas), `:fase` (antes/aberto/depois + avisos dados), `:portais`, `:pontos` (objetivos), `:criaturas` (pontos de aparição), `:origem`. Progresso de cada pessoa: dentro do dado do jogador, campo `ecos` (`feitos`, `frag`, `escolha`, `entrou`).

## Como a janela funciona

- Tudo é calculado de `ecosInicio` e `ecosFim` (ms); **reiniciar o servidor não reinicia o cronômetro**. O estado gravado no mundo serve só para não repetir avisos.
- A cada 5 s o script confere: abre sozinho (mensagem geral no chat de todos e aviso na dimensão), avisa 1 h, 10 min e 1 min antes, e ao fechar devolve ao spawn quem estiver lá e remove as criaturas. A dimensão não é apagada.
- Fora da janela só staff e dono entram (para testar). Quem aparecer na dimensão por outro meio volta ao spawn.
- Desligar `Ecos ligado` no painel tem o mesmo efeito de fechar.

## Painel (Staff > Ecos dos Ausentes, ou Configurações > Ecos dos Ausentes)

Mostra: estado, janela, tempo que falta, mapa (construído ou fases prontas), portais, objetivos marcados, pontos de criatura, criaturas vivas / teto, pessoas lá dentro, quantos **já entraram**, **fragmentos distribuídos** (soma) e quantos concluíram o final. Botões:

| Botão | Quem | O que faz |
|---|---|---|
| Ir para Ecos | staff | teletransporta ao Limiar (também no menu principal da staff) |
| Ligar / Desligar o evento | staff | `ecosLigado` |
| Construir mapa / Continuar construção | staff | constrói em fases, só fora da janela; retoma se o servidor reiniciar |
| Portais de entrada e saída | staff | marcar o bloco olhado, ir, remover |
| Objetivos E01 a E13 | staff | lista com coordenadas ou `[vazio]`; marcar, ver as falas (prévia), ir, remover |
| Criaturas | staff | adicionar ponto onde estou (tipo, quantas ao mesmo tempo, objetivo da sentinela), teto global, espera para reaparecer, dano mínimo, remover todas agora |
| Atualizar números | staff | reabre o painel |
| Datas da janela | **dono** | início e fim (AAAA-MM-DD hh:mm, Brasília); avisa se não forem 24 h |
| Reconstruir mapa | **dono** | apaga e refaz, com confirmação dupla; recusa com a janela aberta |
| Resetar progresso de uma pessoa | **dono** | zera objetivos, escolha, selos (fragmentos no inventário ficam) |

## Passo a passo para o dono montar o mundo

1. **Instalar os packs** (BP e RP) no servidor da BedHosting e **reiniciar** o servidor. A dimensão `vulpus:ecos` só é registrada na partida do servidor. Confira com um `/reload` ou no log: nada de erro vermelho do Vulpus.
2. **Construir o mapa** (fora da janela, com pouca gente online): Staff > Ecos dos Ausentes > **Construir mapa**. A barra de ação mostra a fase, a janela (n/6) e a porcentagem (16 fases x 9 janelas). Leva alguns minutos (estimativa: 3 a 8; cada janela abre sua área de ticking, carrega e constrói). Se o servidor reiniciar no meio, o botão vira "Continuar construção". No final aparece "Mapa dos Ecos construído". Se aparecer a contagem de "blocos que não puderam ser colocados", veja o Content Log.
3. **Conhecer o lugar:** botão **Ir para Ecos** (staff). Chega-se ao Limiar em (10012, 81, 10032). Passeie pelas 4 áreas.
4. **Portais:** no spawn, escolha um bloco (um portal bonito, um ladrilho, uma placa) e, olhando para ele, use Portais > **Entrada** > Marcar o bloco que estou olhando. Dentro da dimensão, no Limiar (perto da chegada), faça igual com **Saída**. Clicar no bloco de entrada leva à dimensão; o de saída leva ao spawn. Staff agachada mexe nos blocos normalmente.
5. **Objetivos:** vá a cada lugar sugerido (`01-historia.md`), olhe o bloco (a até 8 blocos) e use Objetivos > E0X > **Marcar o bloco que estou olhando**. Um bloco por objetivo; o bloco não é alterado. Use **Ver as falas** para conferir o texto e **Ir até lá** para voltar. Para E09 e E10 o bloco é só a dica; o fragmento vem da Sentinela (passo 6).
6. **Criaturas:** em pé onde a criatura deve nascer, Criaturas > **Adicionar ponto onde estou**. Sugestão básica:
   - 2 a 3 pontos de **Errante** (máx. 2 ou 3) em cada área;
   - 1 ponto de **Sentinela** com objetivo **E09** e outro com **E10** (no Arquivo, perto dos altares);
   - 1 ponto de **Memória Partida** (E12) no fim do Arquivo;
   - 1 ponto de **Último Testemunho** (E13) no centro da arena.
   O **teto global** (padrão 14) limita o total vivo na dimensão; o reaparecimento é lento (padrão 90 s). As criaturas só nascem com gente por perto e só durante a janela (ou com a staff lá dentro, para testar).
7. **Testar** (veja `04-checklist.md`): o modo teste da staff mostra as falas fora da janela e não grava nada. Para testar de verdade com uma conta normal, o dono muda as datas para daqui a alguns minutos, joga e depois usa **Resetar progresso** nas contas de teste.
8. **Datas finais:** Datas da janela: início `2026-11-02 00:05`, fim `2026-11-03 00:05` (já são o padrão). Confira se o painel mostra "24 h".
9. **Abrir e fechar:** não precisa fazer nada. O evento abre sozinho às 00:05 de 2/11 e fecha às 00:05 de 3/11. Para fechar antes, desligue o evento (todos voltam ao spawn). Os reinícios agendados desse dia devem estar desligados (o dono já fez).
10. **Depois do evento:** desligue o evento (ou deixe fechado). Fragmentos, armadura e varinha continuam existindo (ver `02-equipamentos.md`).

## Como o jogo se comporta (para quem for dar suporte)

- **Fragmentos:** entregues por objetivo, uma vez por pessoa. Inventário cheio: caem no chão aos pés da pessoa, e a conta já foi gravada.
- **Morte lá dentro:** a pessoa reaparece na entrada do Limiar (se a janela estiver aberta). Os fragmentos entregues têm `keepOnDeath`; além disso, o script tira uma "foto" dos fragmentos e das peças `ausente_*` a cada 5 s e a cada dano e devolve o que faltar.
- **Qualquer caminho de luta:** quem causou dano mínimo à elite, à Memória ou ao Testemunho até ela morrer leva o fragmento, uma vez por pessoa. Precisa estar online e a janela aberta.
- **Reinício do servidor no meio:** as criaturas somem e voltam pelo ciclo; o progresso das pessoas e a janela continuam.
- **Lag:** nada roda por tick; os ciclos são de 100 ticks e só trabalham quando alguém está na dimensão. A construção usa 10 ms por tick e solta as áreas de ticking no fim.
- **Construção por janelas (limite de ticking):** o BDS limita os chunks de ticking SOMADOS do mundo (300, contando as áreas de `intervalo`, `mg`, leilão etc.), e a caixa dos Ecos (mapa + floresta + céu, ~350 chunks) não cabe. A obra roda em 9 janelas (faixas de x de ~47 blocos, ~40-56 chunks cada, uma área de ticking por vez): para cada janela abre a área, espera carregar, roda TODAS as fases com um `PincelRecortado` (o que cai fora da faixa é ignorado; `id`/`superficie` fora dela devolvem `undefined`) e solta a área antes da próxima. O gerador nunca lê blocos, então cada bloco só é escrito pela janela que o contém e o mundo sai idêntico ao da obra inteira (testado). Progresso salvo em `vulpus:ecos:etapa` = janela x 16 + fase (a chave antiga por fase foi descartada: reconstrua; se o nº de janelas mudar, o progresso antigo não vale: use Reconstruir). Se o jogo recusar a área por limite, o dono recebe a mensagem com o pedido (chunks) e o motivo e a janela é refeita em 2, 4, 8 pedaços menores; se nem o menor couber, a obra para com a explicação e "Continuar construção" retoma. Áreas `vulpus_ecos_obra*` sobrando de uma queda são soltas ao ligar o mundo e antes de cada janela. Máximo simultâneo da obra: ~56 chunks.
- **Diagnóstico e travas da obra:** `createTickingArea` só resolve quando TODOS os chunks da área carregam, então a espera tem timeout de 60 s (`ajustes.esperaAreaTicks`); no estouro confere `isFullyLoaded` e, se não carregou, solta a área e refaz a janela em pedaços menores; se nem assim, para com a mensagem "a área da janela N/9 (X chunks) não terminou de carregar em 60 s". Um guarda a cada 5 s solta tudo e libera o botão se a obra ficar 90 s sem sinal de vida (`ajustes.batidaTicks`). O painel mostra "obra parada: ... use Continuar construção". No console do BDS (console.warn) a obra escreve `[Vulpus] Ecos obra: janela N/9 (X chunks) abrindo área`, `... carregada em T s`, `... N fases em T s`, `janela N/9 pronta em T s`, `concluída em T s` e `parou:`/`TRAVADA`; a barra do dono mostra "carregando área da janela N/9" enquanto espera. O `limpeza.js` ignora dimensões `vulpus:*`.
- **Limitação conhecida:** o conjunto de fragmentos soltos no chão ao morrer só é recolhido se o chão estiver carregado (perto de quem morreu, está); o resto vale a foto.

## Scoreboard dentro do Ecos

Quem está em `vulpus:ecos` vê uma sidebar própria: título, área (calculada pela região do mapa), tempo restante da janela, fragmentos N/16 (+ "na bolsa N"), objetivos N/13, Caudas e "Nv · online". Código: `sistemas/ecos_hud.js` (dados, cache de 20 ticks), `LINHAS_ECOS` em `textos/hud.js`, escolha em `sistemas/hud.js`. O jogador que desligou o scoreboard continua sem ele. Não há tinta azul-noite na caixa (exigiria uma marca nova no gerador de UI das Eras). A aparência das linhas (✦ e o relógio) só se confere no jogo.
