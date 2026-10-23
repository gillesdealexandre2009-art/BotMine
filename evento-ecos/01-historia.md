# Ecos dos Ausentes: história, personagens e objetivos

Evento do **Dia de Finados, 2/11/2026**, janela de **24 horas** (padrão 00:05 de 2/11 até 00:05 de 3/11, horário de Brasília). Tudo é original: nenhum personagem, fala ou música de outro jogo. O texto que o jogo mostra fica em `addon/vulpus_bp/scripts/textos/ecos_docs.js` (não mexa lá sem avisar: os testes e as falas dependem dele). Os equipamentos que os fragmentos compram estão em `02-equipamentos.md`.

## A história em um parágrafo

Na vila de **Névoa-Velha**, todo Dia de Finados as pessoas acendiam uma luz para quem partiu. A Guardiã **Auren** quis guardar todas as lembranças da vila para que ninguém fosse esquecido, e para isso prendeu cada lembrança num **fragmento de alma**. Foi demais para uma pessoa só: a alma dela se partiu, a vila sumiu para um lugar fora do mundo e os moradores viraram **ecos** que repetem o que faziam. Quem chega ajuda os ecos a lembrar e, no fim, decide se a vila volta a descansar (**soltar**) ou se fica para sempre guardada (**guardar**). Existe ainda a terceira via, **lutar** contra o Testemunho antes de decidir. As três escolhas dão as mesmas recompensas.

## As quatro áreas

| Área | Clima | Fragmentos |
|---|---|---|
| **O Limiar** | cemitério, mausoléu e capela arruinada; é onde se chega | 3 |
| **A Vila Silenciosa** | casas fechadas, padaria, igreja com sino, biblioteca | 4 |
| **O Arquivo das Almas** | subsolo de estantes e cripta, com Sentinelas | 6 |
| **O Último Testemunho** | arena final de velas e névoa | 3 |

Total: **16 fragmentos por pessoa**. O conjunto completo (armadura + varinha) custa 34, então ninguém termina sozinho: é preciso negociar fragmentos.

## Personagens

| Quem | Onde | Papel |
|---|---|---|
| **Tuco, o Coveiro** | Limiar | primeiro contato, cuida dos túmulos; guardou a vela da Lanterna |
| **Lanterna** | Limiar | menina que perdeu a luz; precisa ouvir que alguém lembrou dela |
| **Dona Brasa** | Vila | padeira que assa pão para uma fila que não existe mais |
| **Mestre Sino** | Vila | conta quem responde ao sino; precisa aprender a esperar |
| **Os Gêmeos Sussurro** | Vila | falam em enigma e guardam as duas metades do nome "Auren" |
| **Pó, o Arquivista** | Arquivo | conta o que aconteceu com a Auren e avisa das Sentinelas |
| **Sentinelas da Cripta** | Arquivo | elites que só querem que ninguém mexa nas prateleiras |
| **Memória Partida** | Arquivo | a aprendiz da Auren, que se culpa; muda de forma |
| **O Último Testemunho** | Arena | a última lembrança da Auren, grande, de névoa e velas |

## Objetivos (E01 a E13)

"Marcar" = a staff marca um bloco no painel (Staff > Ecos dos Ausentes > Objetivos). Os locais abaixo são **sugestões** em coordenadas do mapa (origem 10000, 80, 10000; some os valores para ter a coordenada do mundo). `requer` = precisa ter concluído antes (sem isso o jogo só diz "nada responde ainda").

| ID | Quem / o quê | Tipo | Fragmentos | Requer | Onde marcar (sugestão) |
|---|---|---|---|---|---|
| E01 | Tuco, o Coveiro | diálogo | 1 | - | perto da chegada (12, 1, 32) |
| E02 | Lanterna | enigma (3 opções) | 1 | - | capela arruinada (55, 1, 11) |
| E03 | Túmulo sem nome | segredo (bloco) | 1 | - | canto afastado do cemitério |
| E04 | Dona Brasa | diálogo | 1 | - | casa da padaria, na Vila |
| E05 | Mestre Sino | enigma | 1 | - | igreja da Vila (140, 1, 10) |
| E06 | Os Gêmeos Sussurro | enigma | 1 | - | praça da Vila |
| E07 | Carta na casa fechada | segredo | 1 | - | casa fechada da Vila |
| E08 | Pó, o Arquivista | diálogo | 1 | - | entrada do Arquivo (178, -5, 33) |
| E09 | Sentinela da Cripta (corredor leste) | elite (combate) | 1 | - | altar norte (215, -5, 14) |
| E10 | Sentinela da Cripta (corredor oeste) | elite (combate) | 1 | - | altar sul (215, -5, 50) |
| E11 | Prateleira escondida | segredo | 1 | - | estante escondida do Arquivo |
| E12 | Memória Partida | conversa ou combate | 2 | E08 | perto do corredor final do Arquivo |
| E13 | O Último Testemunho | conversa ou combate (chefe) | 3 | E08 | arena (273, -1, 33) |

Segredos (E03, E07, E11) são só um bloco que a pessoa clica. Nas elites (E09, E10), o bloco marcado é opcional: ele só mostra a dica; o fragmento sai da **morte da Sentinela**, e é o **ponto de criatura** da Sentinela que diz se ela paga E09 ou E10.

## Escolha final (E13)

Soltar, guardar ou lutar. O jogo guarda a última escolha feita antes de concluir. As três dão os mesmos 3 fragmentos; muda apenas a última fala da cena e o título do selo no perfil:

| Escolha | Selo no perfil |
|---|---|
| Soltar | Ecos dos Ausentes: Descanso |
| Guardar | Ecos dos Ausentes: Memória |
| Lutar | Ecos dos Ausentes: Vigília |

Na Memória Partida (E12), as duas respostas gentis concluem a conversa sem luta; derrotá-la também conclui. Uma vez por pessoa, em qualquer caminho.

## Regras de recompensa

- Cada objetivo dá fragmentos **uma única vez por pessoa** (a conta fica guardada no progresso de quem joga).
- Nenhuma criatura solta item nem XP: fragmento só vem de objetivo. Não existe farm.
- Nas lutas, vale quem causou pelo menos 4 de dano (configurável) à criatura, até ela morrer.
- Os fragmentos entregues ficam com a pessoa ao morrer, e o script devolve o que faltar caso algo caia.
