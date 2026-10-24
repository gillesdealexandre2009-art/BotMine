# Ecos dos Ausentes: o mapa novo

Desenho do mapa que `sistemas/ecos_mapa_novo.js` constrói (e os módulos `ecos_mapa_base.js`, `_limiar.js`, `_vila.js`, `_arquivo.js`, `_arena.js`). Coordenadas **relativas à origem** (padrão 10000, 80, 10000: some para ter a do mundo). X cresce para leste, Z para o sul, Y = 0 é o chão do Limiar e da Vila; no Arquivo e na arena a pessoa pisa em Y = -5.

Prévias geradas sem abrir o jogo:
- **3D com texturas do jogo** (as que valem para julgar beleza): `addon/docs/previas/ecos3d_limiar.png`, `ecos3d_vila.png`, `ecos3d_arquivo.png`, `ecos3d_arena.png` (nove vistas por área: de jogador, isométricas e cortes). Para refazer: `dump_mapa.mjs --mapa=ecos_mapa_novo.js` e depois `voxel_render.py DUMP --painel voxel_paineis_ecos2.json --saida ../docs/previas/ecos3d_{area}.png` (ver `docs/previas/LEIA_voxel_render.md`).
- Planas e coloridas (de cima, cortes, isométricas dos marcos): `addon/docs/previas/ecos_*.png`, por `addon/tools/previa_ecos.mjs`.

## Caminho de quem joga

Véu de entrada (3, 32) -> plataforma de chegada (12, 32) -> caminho largo até o Pórtico (62..66) -> avenida -> Vila (rua + praça) -> pátio e Boca do Arquivo (166) -> rampa que desce 6 blocos -> Átrio -> Salão de Leitura -> Sala da Memória Partida -> corredor final -> arena. Tudo é um eixo leste-oeste em z ≈ 32, com ramais para os lados.

## O desenho de cada área

**I. O Limiar (0..65 x 0..65)**: lavanda e cinza-pérola. Chega-se numa plataforma redonda de calcita com bússola de ametista; atrás, o **Véu** (arco de calcita com cortina de vitral roxo). O caminho largo (pedra lisa, bordas de tijolo, meio-fio de lajes, sebes de folha florida, postes em T com lanternas de alma) leva ao **Pórtico** (dois pilones de faixas, verga com arco, cortina de lanternas). Cruzando o caminho há um segundo eixo: **capela dos Lamentos** em ruína ao norte (rosácea, pedestal de lanterna vazia) e **rotunda** de oito pilares com cristal de ametista ao sul. Dois **campos de túmulos** sobre plintos, em fileiras (quatro modelos que se alternam em diagonal, flores e velas em ritmo), com aleia central e bancos. Árvores mortas esculpidas (três silhuetas), bosques de canto, canto do coveiro, monte do túmulo sem nome, trilhas de pedras. Toques surreais: o véu como "porta solitária" e a **ilha flutuante** com a árvore de cabeça para baixo sobre uma poça-espelho.

**II. A Vila Silenciosa (70..165 x 0..75)**: poente quente. Rua larga (mesma linguagem do Limiar), **praça circular** com poço de teto de tijolo e balde sumido, **cadeiras vazias em círculo**, os **pedestais gêmeos**; **torre do sino** (sineira aberta, só a corda, sem sino) com o **relógio gigante sem ponteiros** no alto; **feira vazia** com cinco barracas de toldo listrado (cada uma com uma mercadoria; a última só uma cadeira vazia); 9 casas com 6 plantas diferentes (padaria, casa longa, sobrado, casa da torrinha, chalé, casa fechada), mesas postas (pratos, vela apagada, cadeiras), cortinas de lã, estantes, camas de lã, hortas e ruelas dos fundos, varais de lã, abetos escuros em volta e árvores plantadas nas ruas.

**III. O Arquivo das Almas (170..240 x 0..65)**: prédio de ardósia com pilastras e frestas azuis na fachada, parapeito e torreões; por dentro: **Boca** (pavilhão de calcita com estandartes, rampa), **Átrio** (piso em faixas com emblema, balcão do arquivista, caixotões, lustres de correntes e velas), **Salão de Leitura** (galerias em dois andares, estantes, mesas com velas, passadeira roxa, rosácea de vitral no fundo, prateleiras flutuando em hélice e a **escada que não leva a lugar nenhum**), **criptas das Sentinelas** norte e sul (nichos com estátuas de 4 em 4, sala do altar de cristal ao norte e de almas ao sul), **cela escondida** atrás das estantes, **Sala da Memória Partida** (piso em anéis cujo hemisfério norte escorregou um bloco, fragmentos de ametista flutuando).

**IV. O Último Testemunho (248..302 x 4..62)**: círculo a céu aberto de centro (272, 33). Miolo de luta de raio 14 (oitavas de ardósia, raios de obsidiana, dais de calcita), **fosso espelhado** (água sobre lanterna-do-mar) com duas pontes, **arquibancadas em ruína** em quatro degraus (dois níveis de público), anéis de velas, doze **colunas de end_rod**, muro externo em ruína, **escadaria** a leste até a **porta-moldura gigante e vazia** (com uma moldura menor à frente). Poças-espelho de vidro azul sobre lanterna-do-mar nas arquibancadas. A fase 2 do chefe só precisa de luz/névoa por script.

## Palcos dos objetivos (o bloco que a staff marca)

Staff > Ecos dos Ausentes > Objetivos > marcar o bloco olhando para ele. "De onde se fala" é o ponto onde a criatura/pessoa fica.

| ID | Quem / o quê | Bloco a marcar (relativo) | Mundo (origem 10000, 80, 10000) | Cena |
|---|---|---|---|---|
| E01 | Tuco, o Coveiro | barril (12, 1, 45) | 10012, 81, 10045 | canto do coveiro: telheiro de madeira pálida, barris, caldeirão e um monte de terra recém-cavado com estaca. Fica em (14, 1, 41) |
| E02 | Lanterna | pedra cinzelada (34, 3, 4) | 10034, 83, 10004 | pedestal da lanterna que falta, no altar da capela, entre velas roxas e brancas. Fica em (34, 1, 6) |
| E03 | Túmulo sem nome | lápide lisa (58, 2, 9) | 10058, 82, 10009 | monte redondo de podzol no canto nordeste, cerca de folhas, rosa-negra e vela apagada, árvore morta inclinada sobre ele. Fica em (58, 2, 11) |
| E04 | Dona Brasa | forno (83, 1, 19) | 10083, 81, 10019 | padaria: balcão, fardos de farinha e o forno de tijolo no fundo. Fica em (84, 1, 20); forno externo com chaminé alta no pátio ao lado |
| E05 | Mestre Sino | atril (118, 1, 12) | 10118, 81, 10012 | pé da torre do sino, atril sob a corda sem sino, quatro velas apagadas. Fica em (118, 1, 14) |
| E06 | Os Gêmeos Sussurro | calcita (130, 2, 27) | 10130, 82, 10027 | os dois pedestais gêmeos (z 27 e 37), a leste do poço. Fica em (130, 1, 32), entre os dois |
| E07 | Carta na casa fechada | barril (98, 4, 51) | 10098, 84, 10051 | caixa de correio no portão da casa fechada (janelas tampadas, teias, jardim morto). Fica em (98, 1, 49) |
| E08 | Pó, o Arquivista | atril (183, -4, 33) | 10183, 76, 10033 | balcão em U do Átrio. Fica em (181, -5, 33), dentro do balcão |
| E09 | Sentinela da Cripta (no texto do jogo "corredor leste"; no mapa é a **cripta norte**) | pedra cinzelada (230, -4, 6) | 10230, 76, 10006 | altar de cristal, ao fim do corredor de estátuas. Fica em (230, -5, 8) |
| E10 | Sentinela da Cripta (no texto "corredor oeste"; no mapa é a **cripta sul**) | pedra cinzelada (230, -4, 60) | 10230, 76, 10060 | altar das almas (sculk e fogo de alma). Fica em (230, -5, 57) |
| E11 | Prateleira escondida | estante cinzelada (220, -4, 41) | 10220, 76, 10041 | cela atrás das estantes do canto sudeste do Salão: entra-se de lado, em zigue-zague. Fica em (220, -5, 43) |
| E12 | Memória Partida | pedra cinzelada (231, -4, 33) | 10231, 76, 10033 | pedestal no meio da sala partida. Fica em (231, -5, 35) |
| E13 | O Último Testemunho | obsidiana chorosa (272, -5, 33) | 10272, 75, 10033 | estrela de obsidiana no dais do centro. O chefe nasce em (272, -4, 33) |

Os mesmos números estão em `PALCOS` (e os pontos de fala em `PONTOS`) dentro de `ecos_mapa_novo.js`, e o teste confere que cada palco tem o bloco certo no lugar.

## Sugestões para os pontos de criatura

- **Errantes** (Limiar): aleia do campo norte (34, 1, 18), aleia do campo sul (34, 1, 46), perto do Véu (8, 1, 26). (Vila): rua (96, 1, 32) e feira (122, 1, 46).
- **Sentinelas**: cripta norte em (212, -5, 6) (E09) e cripta sul em (212, -5, 60) (E10); o ponto de criatura diz qual das duas paga.
- **Memória Partida**: (231, -5, 37), diante do pedestal.
- **O Último Testemunho**: nasce no centro (272, -4, 33); raio livre de 14 blocos em volta.

## Limites do que a prévia mostra

A prévia é feita com cores por bloco: não mostra a luz do jogo, a névoa, o céu nem a textura. Escadas e lajes aparecem como cubos; a direção das escadas segue a convenção "o lado alto aponta para o `weirdo_direction`". O que só se confirma dentro do jogo: o tom do chão (musgo-pálido) contra a névoa de cada área, o alcance da luz das velas e lanternas, e se `pale_oak_*`, `tuff_brick*` e `iron_chain` existem nesta versão (se não, o gerador cai para bétula e `chain`).

## Rodada 3: céu, sentido e névoa

- **Céu de galáxia (só em `vulpus:ecos`)**: nova fase 9, "O Céu" (`ecos_mapa_ceu.js`). Teto opaco de uma camada em y=46 (relativo), cobrindo a CAIXA inteira (CAIXA.y2 passou de 40 para 48): concreto preto/azul/roxo/magenta/ciano, galáxia espiral inclinada sobre a ponte Vila-Arquivo (165, 34), nebulosas, ~360 estrelas brancas, ~76 lanternas do mar (luz quase nula lá embaixo), 4 constelações (Cruzeiro do Sul sobre o Limiar, a Panela sobre a Vila, o W sobre o Arquivo, o Cinturão sobre o corredor final) e um planeta com anel sobre a arena (275, 33). Tudo é função de (x,z): retomável e idêntico em qualquer reconstrução. Mundos já construídos só rodam a fase 9 (a retomada pula as 8 primeiras).
- **Por que blocos e não bioma**: a cor do céu de dimensão vazia vem do bioma do cliente (`minecraft:sky_color` em `RP/biomes/*.client_biome.json`, formato 1.21.130+), e o bioma usado por `registerCustomDimension` é compartilhado por `vulpus:intervalo` e pelos minigames: trocar o céu dele pintaria todos. Não confirmado: qual bioma a API usa. Se um dia a Mojang permitir bioma por dimensão, o teto pode sair.
- **Névoa**: cores viraram azul-noite e o alcance cresceu para o teto aparecer: Limiar `#6e6a9a` 14..110 (t2 24..130), Vila `#8c6a6e` 14..115 (t2 24..135), Arquivo `#1e2a52` 8..90 (t2 20..120), Arena t2 `#2a2a5a` 18..120 (base `#150f1c` 6..40, sem mudança).
- **Camada baixa de partículas** (`particulasLeves`): alma rasteira (Limiar), vaga-lumes (Vila), pó roxo (Arquivo), a 1,3 bloco do chão.
- **Auditoria de sentido (Arquivo)**: a escada que sobe 6 blocos no meio da avenida (x213..218) foi removida (travava a avenida); agora há uma escada de 9 degraus no corredor norte do Salão (x199..207, z19..20) que termina numa moldura de porta no ar (x209, y+8..y+13) com lanterna de alma e vela: o absurdo é intencional e enquadrado. As prateleiras flutuantes em zigue-zague viraram uma hélice regular de 12 (os livros que subiram até o teto). Dois lustres quentes novos sobre a avenida (x199, x217) para dar valor ao Arquivo. Nenhum PALCO mudou: **a staff não precisa remarcar**.
- O que só o jogo confirma: o tom do teto sob a névoa, se `firefly_particle` existe na versão, e se a luz das lanternas do mar é perceptível.

## Rodada 4: caixa do céu, floresta, barreira e sem monstros

- **Reconstrução obrigatória** ("Reconstruir mapa"): as fases passaram de 9 para 16 e a numeração mudou. Ordem: base e áreas como antes (0-7), "O Chão do Bosque" (8), "O Bosque 1/4..4/4" (9-12), "O Céu" (13), "As Paredes do Céu" (14), "A Barreira" (15). PONTOS, PALCOS, CHEGADA e a janela de 24 h não mudaram (a staff não precisa remarcar).
- **CAIXA** agora é x -57..360, z -57..132, y -10..52 (o mapa original ficou em `MAPA_INTERNO`). Quatro fatias de ticking viraram cinco (a caixa passa de 100 chunks).
- **Floresta**: anel de ~50 blocos (x -55..358, z -55..130) em volta de tudo, e também nas faixas vazias entre as áreas. Chão com colinas suaves que sobem até a parede (musgo-pálido, podzol, grama, terra grossa), sem plataforma cortada. 4 tipos de árvore (carvalho escuro em camadas, pálida de tronco curvo, abeto, árvore morta) que crescem com a distância à construção: 6-12 perto, 12-26 no meio, 28-36 junto à parede. Copas de oito lados feitas de 3 fills, estampas reaproveitadas, tudo determinístico. Folhas com `persistent_bit` (não apodrecem). Região nova "bosque" em REG (fog `vulpus:nevoa_ecos_bosque`, #38466f 12..100); dentro do mapa original as passagens seguem sem região.
- **Caixa do céu**: teto em y=50 (7 blocos acima da copa mais alta) cobrindo tudo, e 4 paredes de 2 blocos do fundo ao teto: camada de fora preta, de dentro galáxia com degradê de luz violeta no pé, nuvens de nebulosa, estrelas e 12 constelações; perímetro desenrolado para não ter emenda nos cantos.
- **Barreira**: 2 blocos de `minecraft:barrier` logo dentro das paredes, do fundo ao teto, só em blocos vazios (a copa não ganha buracos). Fica fora da área caminhável. O fundo é bedrock + chão contínuo + uma camada de barreira em y=-9.
- **Sem monstros** (`ecos_dimensao.js`): `entitySpawn` na dimensão remove monstros (família monster) e bichos passivos naturais; varredura a cada 100 ticks só com alguém lá dentro; limpeza ~5 s após ligar o mundo. Tudo `vulpus:*` fica (incluindo as criaturas do evento, que seguem limitadas por `ecosTetoCriaturas`; para desligá-las, 0 no painel). Aldeão, gato e golem ficam.
- `PincelMundo.fill` ganhou um parâmetro opcional de estados (usado nas folhas persistentes).
