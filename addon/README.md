# Addon Vulpus

Addon de Minecraft Bedrock do servidor **Vulpus**, com a Kiza (a raposa kitsune) falando com a galera.

- **O que tem:** um menu próprio, com a imagem "VULPUS" no topo, a logo no meio e 5 botões de cada lado:
  - à esquerda: Spawn, Casas, TPA, Voltar e Perfil;
  - à direita: Caudas, Leilão, Clã, Ajustes e Regras;
  - um botão extra da Staff (a coroa), que só a staff vê.
- **Novidades da versão 0.2.0:** níveis e ranks iguais aos do Discord, cargos e selos sobre a cabeça, um placar do lado da tela (scoreboard lateral), 5 temas para o menu (3 deles do selo Kitsune), símbolos próprios (glyphs), o leilão, um chat com selo e nível, **clãs** (tag, base protegida, banco, guerras e alianças) e o **visual Kitsune** (apelido e nome colorido).
- **Versão do jogo:** Bedrock **1.26.52**.
- **Peças:** três packs.
  - `vulpus_bp`: o pack de comportamento (os sistemas). Não precisa de experimento;
  - `vulpus_rp`: o pack de recursos (o visual do menu, do placar e os glyphs);
  - `vulpus_chat_bp`: o pack **Vulpus Chat**. É opcional e **precisa do experimento "APIs Beta"** (veja "O chat").
- **Sem pay-to-win:** nada no addon é vendido nem exclusivo de quem paga. O selo Kitsune (booster do Discord) é só enfeite.

## O que precisa ter no computador

Só para gerar o pacote ou mexer no addon. Para jogar, basta o Minecraft.

1. **Python 3** com a biblioteca **Pillow** (as texturas usam). Instale pelo site python.org e depois rode `pip install pillow`.
2. **Node.js** (site nodejs.org). Ele serve para conferir os scripts.
3. Na pasta `addon`, rode uma vez (e de novo sempre que o `package.json` mudar):

   ```
   npm install
   ```

Todos os comandos abaixo são digitados num terminal aberto **dentro da pasta `addon`**.

Os `npm run` de build, dev, texturas, glyphs e verificar chamam o `python` do sistema. Se o terminal disser que o Python não existe (ou abrir a Microsoft Store), instale o Python do python.org marcando **Add python.exe to PATH**.

## Como testar no jogo

### Jeito 1: o pacote pronto (mais fácil)

1. Gere o pacote:

   ```
   npm run build
   ```

   Ele confere tudo antes. Se algo estiver errado, ele para e diz o quê. Se der certo, cria a pasta `dist/` com:
   - `Vulpus.mcaddon`: os três packs juntos (é o que você usa);
   - `Vulpus_BP.mcpack`, `Vulpus_RP.mcpack` e `Vulpus_Chat.mcpack`: cada pack sozinho.
2. Dê **dois cliques** em `dist/Vulpus.mcaddon`. O Minecraft importa os três packs. Importar não liga nada em mundo nenhum.
3. Crie um mundo (ou edite um que já existe):
   - em **Pacotes de comportamento**, ative o **Vulpus**;
   - o pacote de recursos **Vulpus** entra junto. Se não entrar, ative em **Pacotes de recursos**;
   - o **Vulpus Chat** só se o mundo tiver "APIs Beta" (veja "O chat"). Sem ele, o resto funciona igual e o chat fica o normal do jogo.
4. Entre no mundo. Você recebe o item **Menu do Vulpus**. Use o item (botão direito ou tocar e segurar) ou digite `/vulpus:menu`.

Ao importar uma versão nova com o mesmo número, o jogo pode manter a antiga. Nesse caso, use o Jeito 2.

### Jeito 2: modo de desenvolvimento (para testar mudanças rápido)

1. **Feche o mundo** no jogo.
2. Rode:

   ```
   npm run dev -- --mundo "Testes Claude"
   ```

   Isso copia os três packs para as pastas de desenvolvimento do jogo e ativa o BP e o RP no mundo "Testes Claude".
   - Para ativar também o chat, acrescente `--chat`. Só faça isso num mundo que já tem "APIs Beta" (de preferência um mundo novo, de teste).
   - Antes de mexer no mundo, ele guarda uma cópia dos arquivos de packs do mundo (os `.bak`).
   - Sem o `--mundo`, ele só copia os packs; aí você ativa no mundo pelo jogo.
   - Para ver o que ele faria sem mexer em nada, acrescente `--simular`.
3. Abra o mundo de novo. Toda vez que mudar algo, repita os passos 1 a 3.

## Níveis e ranks

- O XP sobe **3 por minuto ativo** (andando, não parado/AFK) e **15 na diária**. Nada mais dá XP por enquanto, e o booster não multiplica.
- Para subir do nível n para o n+1 são `5n² + 50n + 100` de XP (a mesma conta do Discord).
- Ranks:

| Nível | Rank |
|---|---|
| 0 | Filhote |
| 5 | Raposinha |
| 10 | Raposa Andarilha |
| 15 | Raposa Lunar |
| 20 | Raposa de Nove Caudas |

- Ao subir de nível aparece uma mensagem; ao trocar de rank aparece um título na tela e um aviso para todo mundo.
- **Sobre a cabeça** (nameTag) ficam 2 linhas: o selo com o cargo ou o rank e o nível, e embaixo o nome.
- **Cargos:** Admin (operador ou tag `vulpus:admin`), Staff (tag `vulpus:staff`) e Helper (tag `vulpus:helper`). O cargo aparece no lugar do rank. Helper é só selo: não abre o painel da staff.
- **Kitsune:** a tag `vulpus:kitsune` põe o selo do booster. É só enfeite.
- Em **Perfil > Nível e ranks** (ou `/vulpus:nivel`) aparecem o seu nível, os ranks, o ranking e como ganhar XP. O lugar do antigo botão Nível no menu agora é do **Clã**.

## Placar do lado e tema

- **Scoreboard lateral (placar do lado):** uma caixinha no lado direito da tela com o rank, o nível, a barra de progresso, as Caudas, quem está online e as coordenadas. Liga e desliga em **Ajustes** ou com `/vulpus:hud`. A staff escolhe se começa ligada para quem nunca mexeu.
- **Tema do menu:** em **Ajustes > Tema do menu** (veja "Temas do menu" logo abaixo).

## Temas do menu

São 5 temas. Cada um troca o painel, o cabeçalho, os botões (normal, mouse em cima e apertado), o X, o divisor, o título VULPUS e a raposa do meio. A prévia de todos está em `docs/previas/temas.png`.

| Tema | Quem usa | Como é |
|---|---|---|
| **Laranja** | todos | o de sempre: marrom com laranja |
| **Black** | todos | preto com brilho laranja (mesma raposa) |
| **Sakura** | selo Kitsune | rosa-cerejeira, pétalas nos cantos, raposa rosa com flores na orelha |
| **Lunar** | selo Kitsune | azul-noite e prata, estrelinhas, raposa prateada de olhos acesos com a lua entre as orelhas |
| **Espírito** | selo Kitsune | roxo com fogo-fátuo azul, raposinha na frente de nove caudas em chama |

- **Como trocar:** **Ajustes > Tema do menu** mostra os 5, com a raposinha de cada um. Toque num tema: o menu reabre já com ele.
- **Sem o selo Kitsune**, Sakura, Lunar e Espírito aparecem com cadeado; tocar neles explica que é um mimo de quem apoia a toca no Discord. É só visual: não muda nada no jogo.
- **Perdeu o selo?** Na próxima vez que abrir o menu, o tema volta para o Laranja sozinho (com um aviso no chat).
- O placar do lado continua laranja em todos os temas. Formulários com campos continuam com o visual normal do jogo.
- **Para mexer na arte:** as cores e os desenhos ficam em `tools/gerar_temas.py`. Rode `npm run temas` para refazer as texturas e a prévia. Imagem trocada à mão não é sobrescrita (só com `--forcar`).
- **Custo:** em vez de montar o menu 5 vezes (um por tema), só as imagens do tema são repetidas. O Hub monta ~360 peças e cada botão de lista ~27; com 5 cópias do menu seriam ~790 e ~60.

## O chat (pack Vulpus Chat)

- Cada mensagem sai assim: `selo [nível] Nome » mensagem`, com a cor do cargo no nome.
- Ninguém consegue falsificar selos colando os símbolos na mensagem: eles são removidos.
- Ele usa uma parte do Minecraft que ainda está em teste (Beta). Por isso:
  - o mundo precisa do experimento **APIs Beta** (Editar mundo > Experimentos);
  - depois de ligado, o mundo fica marcado como experimental **para sempre**. **Teste primeiro num mundo novo**, nunca no mundo principal;
  - sem o experimento, o jogo recusa só o pack do chat; o resto do addon funciona.
- **Num servidor (BDS):** copie a pasta `vulpus_chat_bp` para `behavior_packs` do servidor, ponha o pack no `world_behavior_packs.json` do mundo e ligue o Beta no mundo (abra uma cópia do mundo no jogo, ligue "APIs Beta" e suba de volta).
- **A cada atualização do Minecraft** o chat para de carregar até trocar a versão Beta. É só isso:
  1. em `vulpus_chat_bp/manifest.json`, troque `"2.11.0-beta"` pela versão beta nova (ela aparece no aviso do Registro de conteúdo ou nas notas da versão);
  2. em `package.json`, troque o `@minecraft/server-beta` para `npm:@minecraft/server@<versão beta nova>.<versão do jogo>-stable` e rode `npm install`;
  3. rode `npm run check` e `npm run build`. O build avisa se as duas versões não baterem.

## Leilão

Compra e venda de itens por Caudas, entre as pessoas do servidor. Abre pelo botão **Leilão** do menu ou por `/vulpus:leilao`.

- **Vender:** segure o item na mão e use "Vender item da mão" (ou `/vulpus:vender <preço>`). O item sai da mão e vai para o leilão.
- **Comprar:** por categoria, por busca (sem precisar de acento) ou por ordem de preço, em páginas de 8. Cada anúncio mostra o item, os encantos, o nome, o vendedor, o tempo que falta e quanto o mesmo item costuma sair (pelas últimas vendas).
- **Meus anúncios:** os seus anúncios ativos; dá para cancelar (o item volta para o inventário; se estiver cheio, fica na caixa de retirada).
- **Caixa de retirada** (`/vulpus:caixa`): ali chegam os itens que venceram ou foram cancelados/removidos e as Caudas das vendas, mesmo com você offline. Nada é apagado: o item fica na caixa até você retirar. Quando tem algo, o botão do menu mostra "Leilão (n)".
- **Histórico:** o que aconteceu com os seus anúncios e compras.
- **Valores padrão** (a staff muda em Staff > Configurações > Leilão):

| O quê | Padrão |
|---|---|
| Taxa para anunciar (não volta) | 1% do preço, no mínimo 1 Cauda |
| Taxa da venda (sai da economia) | 5%: quem vende recebe 95% |
| Preço | de 1 a 1.000.000 Caudas |
| Anúncios por pessoa | 5 |
| Duração do anúncio | 48 h (depois vai para a caixa de retirada) |
| Itens na caixa de retirada | 54 (com a caixa cheia, não dá para anunciar) |

- **Não dá para anunciar:** no modo Criativo, o item do menu e itens travados no inventário.
- **Staff** (Staff > Leilão (staff), ou o botão da staff dentro do leilão): ver e remover qualquer anúncio (o item vai para a caixa do dono), ver o log e cuidar da lista "Para conferir".
- **Como o item é guardado:** cada item vira uma "estrutura" do mundo, guardada inteira (encantos, nome, livros, conteúdo de shulker). Para isso o addon usa o bloco de bedrock em (0, -64, 0) do Overworld e uma área sempre carregada chamada `vulpus_armazem`. **Não mexa nesse bloco nem nessa área.** O baú aparece e some no mesmo instante; ninguém consegue pegar nada dele.
- **"Para conferir":** se uma operação foi interrompida (o servidor caiu no meio, por exemplo), o lote vai para essa lista da staff, com o motivo. Antes de clicar em "Devolver", confira se a pessoa já não está com o item no inventário, senão ele duplica.
- **Backup:** restaure sempre o mundo **inteiro** de uma vez. Voltar só uma parte (o mundo sem as estruturas, ou o contrário) deixa o registro dos anúncios e os itens guardados desencontrados, e esses lotes vão para "Para conferir".

## Clãs

O clã é a turma de cada um na toca. Abre pelo botão **Clã** do menu ou por `/vulpus:cla`.

- **Criar:** custa 500 Caudas. Escolha um nome (3 a 24 letras), uma **tag de 3 letras ou números** (ex.: `RDL`) e a cor. A tag aparece **antes do nome sobre a cabeça** e **no chat** (com o pack do chat). Nomes e tags com palavrão são recusados; tag e nome não se repetem ("Raposas da Lua", "raposas-da-lua" e "RaposasDaLua" contam como o mesmo nome). O nome usa só letras do nosso alfabeto (com acento), números, espaço e `_ ' . -`.
- **Um clã por pessoa.** Para entrar: aceite um convite (vale 5 min; `/vulpus:claaceitar`) ou procure um clã em "Procurar clãs": se estiver **aberto**, entra na hora; se estiver **fechado**, fica um pedido para alguém do clã aprovar.
- **Cargos:** Líder, Vice, Oficial, Membro e Recruta (quem entra começa como Recruta). O Líder pode tudo e escolhe, em Ajustes do clã > Cargos e permissões, o que cada cargo pode e quanto pode sacar do banco por dia:

| Permissão | Padrão |
|---|---|
| Construir e mexer na base | Vice, Oficial, Membro (Recruta não) |
| Convidar e aprovar pedidos | Vice, Oficial |
| Expulsar e promover (só quem está abaixo) | Vice; Oficial só expulsa |
| Sacar do banco | Vice (5.000/dia), Oficial (1.000/dia) |
| Base, proteções e casas do clã | Vice |
| Guerras e alianças | Vice |
| Editar o clã e subir de nível | Vice |

- **Passar a liderança** pede confirmação (quem passa vira Vice). **Dissolver** pede duas confirmações: o banco volta inteiro para quem lidera, a base some e uma guerra em andamento conta como rendição.
- **Banco:** qualquer membro deposita (`/vulpus:cladepositar <valor>`); sacar só com permissão e dentro do limite do dia. O extrato mostra os últimos 30 movimentos. O banco paga a subida de nível, a guerra, as casas do clã e a mudança da base.
- **Nível (1 a 8):** o clã ganha XP com cada **minuto ativo** dos membros (o mesmo anti-AFK das Caudas) e com depósitos (10 Caudas = 1 XP; sacar e depositar de novo não conta). Com o XP, alguém com permissão sobe o nível pagando com o banco:

| Nível | XP | Custo | Pessoas | Raio da base | Casas |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 4 | 8 (17x17) | 1 |
| 2 | 1.000 | 1.000 | 6 | 16 | 1 |
| 3 | 3.000 | 3.000 | 8 | 32 | 2 |
| 4 | 7.000 | 6.000 | 10 | 64 | 2 |
| 5 | 14.000 | 12.000 | 14 | 128 | 3 |
| 6 | 25.000 | 25.000 | 18 | 256 | 3 |
| 7 | 45.000 | 50.000 | 22 | 512 | 4 |
| 8 | 80.000 | 100.000 | 30 | 1024 (2049x2049) | 5 |

  Cada nível também libera mais cores e emblemas. A tabela fica em `vulpus_bp/scripts/config.js` (`NIVEIS_CLA`).
- **Base:** em Terreno, fique no centro e toque em "Marcar base aqui" (só no Mundo normal). A base é um **quadrado** em volta do centro, com **todas as alturas**. A primeira marcação é grátis; **mudar a base de lugar custa Caudas do banco**, mais caro a cada nível (500 no nível 1, +60% por nível), e só uma vez a cada 24 h (tirar a base e marcar de novo não pula a espera). A base não pode encostar em outra base (nem na zona dela) e a borda fica a 200 blocos do spawn; se faltar espaço, ela fica menor que o raio do nível e cresce quando houver lugar ("Crescer a base até o nível"). "Ver os limites" mostra a borda com partículas.
- **Proteção:** dentro da base, quem não é do clã não quebra, não coloca, não abre baús, não usa portas, alavancas, botões e placas de escrever, não usa baldes nem isqueiro, não mexe em suportes de armadura nem fere os bichos. Nos Ajustes de Terreno dá para ligar e desligar: TNT, creeper e outras explosões não quebram a base (inclusive explosão que começa do lado de fora) e estranhos não colocam entidades (barco, carrinho, suporte, cristal do End).
- **Zona de amortecimento:** 12 blocos em volta da borda onde quem é de fora **não coloca redstone nem máquinas** (pistão, observador, dispenser, dropper, funil, TNT, trilhos, slime/mel, fogo, cristal do End, carga de vento) **nem usa balde** (lava, água, balde de peixe ou de neve, e o vazio, que pega líquido). Para pistão e redstone a zona tem 1 bloco a mais (um pistão empurra até 12 blocos). Com a proteção de entidades ligada, também não usa barco, carrinho, suporte e vara de pesca ali. Isso evita "invadir com redstone" de fora.
- **Exceções:** pessoas de confiança (até 10, em Terreno) constroem; aliados com acesso abrem portas e baús (mas não constroem, não plantam e não põem placa, linha ou estandarte); a staff só passa com o **bypass** ligado (`/vulpus:clabypass`, fica no log).
- **Ao entrar e sair** de uma base aparece "Território de [TAG]" na barra de baixo.
- **Guerras:** quem tem permissão declara guerra a outro clã. Regras (a staff muda em Configurações > Clãs e guerras, inclusive os 5 min do anti-farm e os pontos extras; 0 desliga o extra):
  - os dois clãs precisam de nível 2+, de 3+ pessoas e da **bandeira marcada** na base (veja "Capture the Flag"); um clã só tem uma guerra por vez; o mesmo par só guerreia de novo depois de 7 dias; aliados não guerreiam;
  - declarar tira 1.000 Caudas do banco (vai para o **baú de guerra**); a guerra começa **1 hora depois** (todo mundo é avisado) e dura **24 horas**;
  - quando começa, o clã alvo põe a parte dele no baú (o que tiver no banco, até 1.000);
  - durante a guerra, a **base de cada lado fica aberta só para o clã inimigo**; as explosões continuam como o clã escolheu;
  - cada **abate** entre os dois clãs vale 1 ponto, em qualquer lugar do mapa; o placar aparece no menu e no placar do lado, ao vivo;
  - **anti-farm:** cada pessoa abatida só rende ponto **uma vez a cada 5 min**, não importa quem do outro clã a derrubou; e só vale entre quem já era do clã quando a guerra foi declarada (conta reserva que entra no meio não vira ponto);
  - **sequência:** 3, 5 e 10 abates seguidos sem morrer ("Em chamas", "Imparável", "Lenda da toca") são anunciados para os dois clãs e valem **+1 ponto** cada; qualquer morte zera a sequência (e o fim dela também é anunciado);
  - **cabeça do líder:** derrubar quem lidera o clã inimigo vale **+1 ponto** extra (no máximo 1 vez por hora por líder);
  - **Caçador:** no fim, quem mais abateu (no empate, quem chegou lá primeiro) é anunciado para todo mundo como o Caçador da guerra, ganha um título na tela e fica no histórico;
  - no fim, quem tiver mais pontos leva o baú inteiro; empate devolve a parte de cada um; **render-se** dá a vitória ao outro lado;
  - a guerra continua certinha depois de reiniciar o servidor.
- **Fogo amigo:** quem é do mesmo clã não se fere (o clã pode ligar o fogo amigo nos Ajustes).
- **Aliados:** até 3. Um clã pede, o outro aceita; qualquer lado desfaz.
- **Casas do clã:** criadas por quem cuida do terreno (250 Caudas do banco cada); qualquer membro vai com `/vulpus:clacasa [nome]`, com o efeito de teleporte do clã.
- **Chat do clã:** `/vulpus:c <mensagem>` fala só com quem está no clã (até 8 palavras soltas; frase maior vai entre aspas: `/vulpus:c "bora pra mina às 20h"`). (Não existe "modo falar no clã": sem o pack Beta o addon não consegue segurar o chat normal, e a mensagem vazaria.)
- **Ranking de clãs:** por nível, XP e pessoas.
- **Placar do lado:** mostra a tag e o nome do clã e, em guerra, o placar (dá para esconder a linha do clã em Ajustes).
- **Staff:** Staff > Clãs (staff): ver qualquer clã, trocar a tag, encerrar uma guerra sem vencedor (cada lado recebe a sua parte), remover o clã (o banco volta para quem lidera) e o log.

## Capture the Flag (bandeiras nas guerras)

Toda base de clã tem uma **bandeira** num pedestal. Na guerra, além dos abates, vale roubar a bandeira do inimigo e levar para casa (como no CubeCraft).

- **Marcar a bandeira:** em Clã > Terreno, quem tem a permissão de terreno (o Líder e, por padrão, o Vice) fica onde quer o pedestal e toca em "Marcar a bandeira aqui". Precisa ser **dentro da base** e a no máximo **64 blocos do centro**. Mover tem espera de **1 hora** (a primeira marcação não espera) e não dá com guerra marcada ou valendo. Se a base mudar e a bandeira ficar de fora, é preciso marcar de novo.
- **Todo mundo sabe onde fica:** as coordenadas aparecem na ficha de cada clã (Procurar clãs), no Ranking, na lista de alvos ao declarar, no Terreno, na ficha da guerra e no Painel de Dono. A bandeira fica de pé no pedestal o tempo todo (com a tag do clã em cima).
- **Sem bandeira não tem guerra:** para declarar, os **dois** clãs precisam ter a bandeira marcada (a mensagem diz quem falta). As guerras forçadas pelo Painel de Dono continuam funcionando: se um dos times não tiver bandeira, essa guerra fica **sem bandeiras** (só os abates contam) e o dono é avisado. A guerra usa as bandeiras de onde elas estavam quando começou.
- **Como joga:**
  1. Só durante a guerra **valendo** (no aviso, não). Quem já era do clã quando a guerra foi declarada (a mesma regra dos abates) **encosta** na bandeira inimiga e pega.
  2. **Captura:** leve até a **sua** bandeira, que precisa estar no pedestal (se roubaram a sua, recupere primeiro). Ao encostar: **+10 pontos**, anúncio para os dois clãs e um aviso curto para o servidor, fogos e som. A bandeira capturada volta para o pedestal do dono e fica **2 minutos recarregando** (ninguém pega).
  3. **Quem leva** fica um pouco mais lento, com chamas da cor da bandeira em volta e a **bandeira pequena acima da cabeça**. Não usa teleporte do addon (spawn, casas, voltar, TPA, casa do clã), pérola do End, fruta do coro nem fogos de artifício, e não plana: a elytra vai para o inventário (sem espaço no inventário, não pega a bandeira; se vestir de novo sem espaço, a bandeira cai).
  4. **A bandeira cai** onde a pessoa estava se ela morrer, sair do jogo, trocar de dimensão ou for teleportada por fora do addon. Caída, quem é do clã dono encosta e **devolve (+2)**; o inimigo pode pegar de novo; se ninguém encostar, ela **volta sozinha em 30 s**. Se cair no vazio ou na lava, volta na hora.
  5. **Derrubar quem leva a sua bandeira** vale **+3** (além do ponto normal do abate, que continua com o anti-farm de 5 min; os +3 valem a cada vez).
  6. Fim da guerra (por tempo, rendição, staff ou dono): as bandeiras voltam para os pedestais e ninguém fica levando nada.
- **Placar do lado:** durante a guerra mostra a sua bandeira (em casa, com quem está, caída ou recarregando) e a do inimigo com a distância e a direção (N, NE, L...). Quem leva a bandeira vê o caminho de casa.
- **Visual:** mastro de 3 blocos com o pano na **cor do clã** e uma raposinha, tremulando; um **feixe** de partículas sobe da bandeira durante a guerra (fumaça enquanto recarrega); o pedestal vazio solta uma fumaça "fantasma"; a bandeira caída também tem feixe.
- **Valores** (Staff > Configurações > Clãs e guerras): captura (10), devolver (2), derrubar quem leva (3), distância máxima do centro (64) e espera para mover (1 h). Os 2 min de recarga e os 30 s de volta sozinha são fixos (`sistemas/ctf.js`).
- **Reiniciar o servidor:** bandeira roubada ou caída volta para o pedestal e quem levava perde a bandeira; o placar, as capturas e a recarga continuam.

## Painel de Dono

Painel só do **dono do servidor**, separado do da staff (staff comum e operador não são dono). "Time" aqui é o clã.

- **Como virar dono:** a primeira vez, um **Operador** usa `/vulpus:dono reivindicar` (só funciona enquanto não existe nenhum dono). Depois disso, só um dono adiciona ou tira outros (Painel > Donos, ou `/vulpus:dono adddono <nome>` / `remdono <nome>`); o último dono não sai. Também dá para fixar donos pelo nome da conta em `DONOS`, no `vulpus_bp/scripts/config.js` (vazio por padrão; com um nome lá, o reivindicar fecha).
- **Como abrir:** `/vulpus:dono`, ou Staff > Painel de Dono (o botão só aparece para dono). Dono que não é staff vê o botão **Dono** no canto do menu.
- **Times:** criar sem cobrar Caudas (nome, tag e cor com as validações de sempre; com ou sem líder), definir ou trocar o líder (o anterior vira Vice), definir o nível de 1 a 8 (a base acompanha o raio do nível), adicionar e remover pessoas sem convite (também offline, pelo nome de quem já entrou no mundo), forçar alguém a mudar de time (sai do anterior: um time por pessoa) e consultar o time de alguém. Time **sem líder** funciona normal: ninguém tem os poderes de Líder até o dono definir um.
- **Guerras:** começar agora entre dois times (sem aviso, sem custo, sem baú e sem exigir nível, pessoas ou trégua; fica marcada como forçada). **Modo evento:** em "Iniciar guerra agora" escolha a duração em minutos (ex.: 15; 0 = a duração normal) ou use `/vulpus:dono guerra AZL VRM 15`. Com as duas bandeiras marcadas a guerra tem Capture the Flag; sem, só abates. Também dá para somar ou definir pontos, finalizar na hora (vence quem tem mais pontos, ou o lado que o dono escolher), cancelar (sem vencedor; as apostas voltam), definir o vencedor e ver as guerras em andamento e as finalizadas. Finalizada é finalizada de verdade: a proteção volta, abates param de contar, sai do placar e dos menus, o baú é pago uma vez só, e finalizar ou cancelar de novo responde "Essa guerra já foi finalizada". Definir o vencedor de uma guerra já finalizada só corrige o histórico (e não vale se o baú já foi pago a outro lado).
- **Log do dono:** cada ação (e cada tentativa de quem não é dono) fica registrada com data, hora, alvo e ok/erro; as últimas 200 aparecem em Painel > Log do dono, e o Content Log mostra as linhas `[Vulpus][Dono]`.
- **Atalhos:** `/vulpus:dono ajuda` lista todos (`criar "Time Azul" AZL azul`, `lider AZL Fulano`, `nivel AZL 3`, `add AZL Fulano`, `remover Fulano`, `mover Fulano AZL`, `time Fulano`, `guerra AZL VRM [minutos]`, `pontos AZL 2` ou `pontos AZL 5 definir`, `finalizar AZL [VRM]`, `cancelar AZL`, `vencedor <id> AZL`, `guerras`, `log`). Nome com espaço vai entre aspas.

## Visual Kitsune

Mimo para quem tem o selo **Kitsune** (booster do Discord). **É só visual**, sem nenhuma vantagem no jogo. Fica em Ajustes > Visual Kitsune ou `/vulpus:apelido`.

- **Apelido:** de 3 a 16 letras, aparece no lugar do nome sobre a cabeça, no chat, no placar do lado e no menu. Só letras do nosso alfabeto (com acento), números, espaço e `_ . -`. Não vale palavrão, nome de cargo ("Admin", "Staff", "Porteiro"...) nem o nome de outra pessoa da toca, nem disfarçado com número no lugar de letra ("K1za", "4dmin"). O nome da conta continua no Perfil ("Conta: ...") para a moderação. `/vulpus:apelido tirar` volta ao nome da conta.
- **Cor do nome:** 18 temas, entre cores sólidas e degradês letra a letra (Pôr do sol, Oceano, Sakura, Lava, Aurora, Floresta, Arco-íris, Gelo, Ouro, Ametista, Lunar, Brasa...). O chat mostra o mesmo apelido e o mesmo tema.
- **Cor do clã:** quem tem o selo e pode editar o clã também escolhe um desses temas para a tag e o nome do clã. Os outros usam as cores normais, liberadas pelo nível.
- Sem o selo, o apelido e a cor ficam guardados, mas não aparecem.
- **Perdeu o selo:** o tema que a pessoa escolheu para o clã sai e a tag volta para a cor normal que o clã tinha antes (ou a primeira cor, se aquela não estiver liberada). Se ela estava offline quando o selo saiu, isso acontece assim que entrar (e a cada 10 s para quem está online). Se outro Kitsune trocou o tema do clã depois, o tema dele fica.
- A staff tira o apelido e a cor de alguém em Staff > Cargos e Kitsune ou com `/vulpus:resetapelido <jogador>`.

## Caçada (recompensa por cabeças)

Ponha Caudas na cabeça de alguém: quem derrubar essa pessoa em PvP leva tudo. Fica em **Caudas > Caçada > Mural de recompensas** (o Hub não mudou) ou `/vulpus:cacada`.

- **Pôr recompensa:** no mural, "Pôr recompensa" mostra quem está online e tem "Procurar pelo nome" para quem está offline (precisa já ter entrado na toca). Ou `/vulpus:recompensa <jogador> <valor>` (nome com espaço vai entre aspas). Vale de **50 a 100.000** Caudas, que saem do saldo **na hora** (é a garantia), mais **10% de taxa** que some da economia (arredonda para cima). Antes de pagar aparece a conta (valor, taxa e total).
- **Regras de quem põe:** na própria cabeça não dá. Várias pessoas somam na mesma cabeça; pôr de novo na mesma soma na sua parte. Cada pessoa tem parte em no máximo **5 cabeças** ao mesmo tempo. Quem pagou fica em segredo no mural (a staff vê); a vítima é avisada de que alguém pôs, sem saber quem.
- **Quem leva:** quem der o **golpe final em PvP** (flecha, tridente e outros projéteis contam para quem atirou) leva **tudo** e a cabeça zera. **Não vale:** quem é do **mesmo clã** da vítima, de clã **aliado** do clã dela, quem **pagou** por aquela cabeça, a própria vítima, e morte por monstro, queda, lava ou qualquer coisa sem jogador. Quem matou e não levou recebe o motivo no chat.
- **Anti-farm:** a vítima precisa estar **viva há 5 min** (desde a última morte, de qualquer jeito) e cada pessoa caça a **mesma** cabeça no máximo **1 vez a cada 24 h**. Fora isso, nada barra.
- **Prazo:** cada parte vale **7 dias** a partir da última vez que aquela pessoa pôs. Sem caçador, a parte volta para quem pagou **sem a taxa**, direto no saldo, até offline (aparece "+N Caudas (recompensa sem caçador)" para quem está online).
- **Diversão:** o mural lista as cabeças da mais valiosa para a menor, com quem está online e quanto falta para a parte mais antiga voltar; cabeça que passa de **500** é anunciada para todos (uma vez); a caçada é anunciada para todos ("Fulano caçou a cabeça de Beltrano e levou X Caudas!") com som, título e chamas; quem tem a cabeça a prêmio ganha uma **caveira com o valor curto** (ex.: "1,2k") em cima do nome e a linha "Sua cabeça vale X" no placar do lado; tem o **Ranking de caçadores** (total levado) e as **Últimas caçadas**.
- **Staff:** Staff > Caçada (staff) lista as cabeças com quem pagou; "Tirar e devolver" devolve a cada pagador (sem a taxa). Também `/vulpus:tirarrecompensa <jogador>`. O "Log da Caçada" mostra quem pôs, quem caçou, o que expirou e o que a staff tirou (as últimas 100).
- **Valores** (Staff > Configurações > Caçada): aberta ou fechada (fechada = ninguém põe recompensa nova; as que existem continuam valendo e expirando), menor e maior recompensa, taxa (%), cabeças por pessoa, vida mínima (min), espera para caçar a mesma cabeça (h), prazo (dias) e o valor do anúncio (0 = não anuncia).
- **Não mexe na guerra nem nas bandeiras:** a Caçada é paralela; um abate de guerra também pode render a recompensa, mas não muda pontos.
- **Sem pay-to-win:** só Caudas do jogo; o selo Kitsune não dá nada aqui.

## Comandos

Os comandos funcionam com o `vulpus:` na frente e, na maioria, também sem ele (por exemplo, `/menu`). O `/hud` curto já é do jogo, então use sempre `/vulpus:hud`.

| Comando | O que faz |
|---|---|
| `/vulpus:menu` | abre o menu |
| `/vulpus:item` | devolve o item do menu, se você perdeu |
| `/vulpus:spawn` | vai para o spawn |
| `/vulpus:casa [nome]` | vai para uma casa (sem nome, abre o menu de casas) |
| `/vulpus:definircasa <nome>` | salva uma casa onde você está |
| `/vulpus:apagarcasa <nome>` | apaga uma casa |
| `/vulpus:voltar` | volta para onde morreu ou para antes do último teleporte |
| `/vulpus:tpa <jogador>` | pede para ir até alguém |
| `/vulpus:tpaqui <jogador>` | pede para alguém vir até você |
| `/vulpus:tpaceitar [jogador]` | aceita um pedido de TPA (sem nome: se houver só um, aceita; se houver vários, abre a lista) |
| `/vulpus:tpanegar [jogador]` | recusa um pedido de TPA (sem nome: igual ao `tpaceitar`) |
| `/vulpus:caudas` | abre o menu das Caudas (a moeda do jogo) |
| `/vulpus:diaria` | pega a recompensa diária |
| `/vulpus:cacada` | abre o mural da Caçada |
| `/vulpus:recompensa <jogador> <valor>` | põe Caudas na cabeça de alguém (online ou offline) |
| `/vulpus:leilao` | abre o leilão |
| `/vulpus:vender <preço>` | anuncia no leilão o item da mão por esse preço |
| `/vulpus:caixa` | abre a caixa de retirada do leilão |
| `/vulpus:perfil [jogador]` | abre o seu perfil (ou o de outra pessoa online) |
| `/vulpus:nivel [jogador]` | mostra o nível (o seu ou o de alguém online) |
| `/vulpus:hud` | liga ou desliga o placar do lado |
| `/vulpus:cla` | abre o menu do clã |
| `/vulpus:c <mensagem>` | fala só com o seu clã |
| `/vulpus:claconvidar <jogador>` | convida alguém online para o seu clã |
| `/vulpus:claaceitar [tag]` | aceita um convite de clã (sem tag: se houver só um) |
| `/vulpus:clarecusar [tag]` | recusa um convite de clã |
| `/vulpus:clacasa [nome]` | vai para uma casa do clã (sem nome: a primeira) |
| `/vulpus:cladepositar <valor>` | deposita Caudas no banco do clã |
| `/vulpus:apelido [nome]` | apelido do selo Kitsune (sem nome abre o menu; `tirar` volta ao nome da conta) |

Só para a staff:

| Comando | O que faz |
|---|---|
| `/vulpus:staff` | abre o menu da staff |
| `/vulpus:definirspawn` | define o spawn onde você está |
| `/vulpus:darcaudas <jogador> <valor>` | dá Caudas (valor negativo tira) |
| `/vulpus:cargo <jogador> <cargo>` | muda o cargo: `admin`, `staff`, `helper` ou `nenhum` (só Admin consegue) |
| `/vulpus:kitsune <jogador>` | liga ou desliga o selo Kitsune |
| `/vulpus:resetapelido <jogador>` | tira o apelido e a cor do nome de alguém |
| `/vulpus:clabypass` | liga ou desliga o bypass da proteção dos clãs (fica no log) |
| `/vulpus:tirarrecompensa <jogador>` | tira a recompensa da cabeça de alguém e devolve a quem pagou (sem a taxa) |

Só para o dono: `/vulpus:dono [ação]` abre o Painel de Dono ou faz uma ação dele (veja "Painel de Dono"); `/vulpus:dono reivindicar` vale para o primeiro Operador enquanto não houver dono.

**Quem é staff:** operador do mundo (ou quem tem nível de comando de operador), ou quem tiver a tag `vulpus:staff` ou `vulpus:admin`. Para dar a tag, use `/tag NOME add vulpus:staff` ou, pelo menu, Staff > Cargos e Kitsune.

**Configurações da staff:** Staff > Configurações tem 6 grupos: "Teleporte e casas", "Caudas e XP", "Leilão", "Clãs e guerras", "Caçada" e "Geral".

## Como trocar a logo

1. Faça a imagem **quadrada** em PNG. O tamanho 128x128 é o ideal; até 256x256 funciona bem.
2. Salve por cima de `vulpus_rp/textures/vulpus/ui/logo.png`, com o mesmo nome (Laranja e Black usam essa). Os temas Kitsune têm a própria em `vulpus_rp/textures/vulpus/ui/sakura/logo.png`, `lunar/logo.png` e `espirito/logo.png`.
3. Gere o pacote de novo (`npm run build`) ou rode `npm run dev`.

O `npm run texturas` e o `npm run glyphs` refazem as texturas e os símbolos, mas **não apagam uma imagem trocada à mão**. Eles só sobrescrevem com `--forcar` (por exemplo, `python tools/gerar_glyphs.py --forcar`).

## Como criar um botão ou um menu novo

Os menus são montados com o "framework" que fica em `vulpus_bp/scripts/core/forms.js`:
- `Hub`: o menu principal, com as duas colunas;
- `Lista`: os submenus, que rolam;
- `confirmar`: uma pergunta de sim ou não;
- `perguntar`: um formulário com campos.

O tema do jogador (um dos 5) é aplicado sozinho pelo framework.

Exemplo de um submenu novo, num arquivo `vulpus_bp/scripts/sistemas/exemplo.js`:

```js
// @ts-check
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { Lista } from "../core/forms.js";
import { ok } from "../core/util.js";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {() => any} [voltar] o que o botão "Voltar" faz (vem de quem abriu este menu)
 */
export async function menuExemplo(player, voltar) {
  await new Lista("Exemplo")
    .texto("Escolhe uma opção:")
    .botao("Dizer oi", ICONES.sim, (p) => ok(p, "Oi! Que bom te ver."))
    .voltar(voltar)
    .abrir(player);
}

registrarComando({ nome: "exemplo", descricao: "Abre o menu de exemplo" }, (p) => menuExemplo(p));
```

Depois:
1. Acrescente `import "./sistemas/exemplo.js";` em `vulpus_bp/scripts/main.js`.
2. Para pôr o menu num botão do menu principal, use `menuExemplo(p, volta)` num `slot` em `sistemas/menu.js` (0 a 4 à esquerda, 5 a 9 à direita).
3. Rode `npm run check`, que confere os scripts, e depois `npm run build`.

Algumas regras:
- Os textos ficam nos arquivos de `vulpus_bp/scripts/textos/`.
- Não use emoji, porque a fonte do jogo não tem. Use `•`, `»`, `«`, `✔`, `✖` e `★`, ou os glyphs de `vulpus_bp/scripts/glyphs.js` (nunca em títulos de menu).
- Ícones: use os do `ICONES` em `config.js` ou qualquer caminho de textura do jogo.

## Onde ver os erros

- **No jogo:** vá em **Configurações > Criador** e ligue o **Registro de conteúdo** (Content Log), tanto o arquivo quanto a interface. Os erros aparecem na tela.
  - Os erros do addon começam com `[Vulpus]`, e os do chat com `[Vulpus Chat]`.
- **Arquivos de log:** ficam em `%APPDATA%\Minecraft Bedrock\logs`. Cole esse caminho na barra do Explorador de Arquivos.
- **Antes de abrir o jogo:**
  - `npm run check` confere os scripts (o BP e o chat);
  - `npm run verificar` confere o visual do menu e do placar contra o jogo instalado;
  - `npm run build` faz tudo isso e ainda gera o pacote.

## Teste rápido dos sistemas

Num mundo com o BP e o RP ativos (o ideal é ter uma segunda pessoa para o TPA):

1. **Menu:** abra pelo item e por `/vulpus:menu`. Confira a imagem VULPUS no topo, a saudação, a linha com selo, rank e nível, as Caudas, quem está online e a dica. São 10 botões.
2. **Spawn:** clique em Spawn e fique parado durante a contagem. Depois repita andando: tem que cancelar.
3. **Casas:** crie uma casa, vá até ela, mova, renomeie e apague (com a confirmação). Tente passar do limite de 3.
4. **TPA:** mande um pedido para a outra pessoa, que deve ver o aviso no chat e na barra. Aceite pelo menu e por `/vulpus:tpaceitar`. Teste também recusar, cancelar, esperar 60 s para vencer e bloquear em Ajustes.
5. **Voltar:** morra (não no vazio) e use Voltar; depois teleporte e use Voltar de novo.
6. **Caudas e XP:** pegue a diária (+15 XP junto). Jogue se mexendo e veja o XP subir no placar do lado; parado, não sobe.
7. **Nível:** abra Perfil > Nível e ranks, os Ranks, o Ranking e o Como ganhar XP. Para testar a troca de rank rápido, a staff pode pôr "XP por minuto ativo" em 100 nas Configurações (lembre de voltar para 3).
8. **Perfil, Ajustes e Regras:** confira rank, nível e cargo no perfil; ligue e desligue o placar do lado; troque o tema para Black e de volta (e, com a tag `vulpus:kitsune`, para Sakura, Lunar e Espírito); abra todas as páginas de Regras.
9. **Leilão:** anuncie um item da mão, veja ele em Comprar e em Meus anúncios, cancele (volta para o inventário) e anuncie de novo. Com outra conta, compre; o vendedor recebe as Caudas na caixa de retirada.
10. **Staff:** com operador ou com a tag, abra o painel, defina o spawn, mude uma configuração de cada grupo, dê e tire Caudas, mude um cargo em "Cargos e Kitsune", remova um anúncio em "Leilão (staff)" e pegue o item. Sem ser staff, o botão não aparece e `/vulpus:staff` recusa.
11. **Clãs** (precisa de 2 ou 3 contas; para ir rápido, a staff baixa os custos e o "Guerra: aviso antes de começar" para 0 em Configurações > Clãs e guerras):
    - crie um clã, convide a outra conta e aceite; promova e rebaixe; deposite e saque;
    - marque a base longe do spawn, veja os limites; com a conta de fora, tente quebrar, colocar, abrir um baú e uma porta (tudo barrado com aviso); na zona em volta, tente pôr um pistão (barrado) e um bloco comum (liberado);
    - crie um segundo clã, suba os dois para o nível 2 (a staff dá Caudas e põe "Clã: XP por minuto ativo" alto), declare guerra, espere começar e confira que o inimigo mexe na base e que o abate conta ponto; abater a mesma pessoa de novo antes de 5 min não conta; derrubar o líder dá ponto extra; no fim aparece o Caçador;
    - render-se, alianças, casa do clã, `/vulpus:c`, dissolver.
    - **bandeiras:** marque a bandeira dos dois clãs (Terreno), comece uma guerra de 15 min pelo Painel de Dono e: pegue a bandeira inimiga (ela vai para cima da cabeça), tente `/vulpus:spawn` e uma pérola (barrados), leve até a sua (captura +10), morra levando (cai; quem te derrubou ganha +3), devolva a sua caída (+2), deixe uma cair e espere 30 s.
12. **Visual Kitsune:** com `/vulpus:kitsune` em você, troque o apelido e a cor do nome em Ajustes; confira sobre a cabeça, no chat, no placar e no Perfil ("Conta:"). Escolha um tema para o clã, tire o selo com `/vulpus:kitsune` de novo: em até 10 s a tag do clã volta para a cor de antes.
13. **Caçada** (2 ou 3 contas): ponha uma recompensa pelo mural e por `/vulpus:recompensa` (confira a taxa na confirmação e no saldo); a caveira aparece em cima do nome da vítima e "Sua cabeça vale" no placar dela; mate a vítima com uma conta do mesmo clã (não paga, com o motivo) e com uma de fora (paga tudo, anúncio para todos); mate de novo logo depois (não paga: 5 min); a staff tira uma recompensa em Staff > Caçada (staff) e o valor volta.

## Checklist de teste no jogo

Primeiro num **mundo novo** com "APIs Beta" ligado e sem cheats, com os três packs. Depois repita **sem o pack do chat** num mundo **sem experimentos**, para conferir que o resto não depende do Beta.

1. **Glyphs:**
   - aparecem no chat, sobre a cabeça, no placar do lado, no texto e nos botões dos menus;
   - uma cor (`§7`) antes do glyph muda a cor dele? (anotar);
   - o "VULPUS" em glyph na mensagem de primeira entrada fica com vãos entre as letras? (se ficar, avise: troca por texto).
2. **Menu principal:** botões alinhados, rótulos de 2 linhas sem cortar, imagem do título nítida, coroa no canto, foco andando pelas setas ou pelo controle.
3. **Temas:** em Ajustes > Tema do menu, escolher cada um dos 5 reabre já nele; conferir no Hub e numa lista (Casas, Regras > Comandos) o painel, o cabeçalho, os botões com o mouse em cima e apertados, o X, o divisor, a raposa do meio e a cor dos cabeçalhos de seção; sem a tag `vulpus:kitsune`, os 3 de Kitsune com cadeado; tirar a tag com Sakura escolhido volta ao Laranja; confirmar e formulários com campos continuam normais; abrir e fechar 10 vezes em cada tema sem travar (no celular também).
4. **Placar do lado:**
   - liga e desliga em Ajustes e em `/vulpus:hud`;
   - um título normal (subir de rank, primeira entrada) aparece inteiro e o placar continua;
   - trocar o tamanho da interface (GUI scale): a caixa volta em até 10 s;
   - no celular, não cobre os botões de toque;
   - a barra de baixo fica livre: a contagem do teleporte e o aviso de TPA aparecem;
   - aparece "+5" depois do ganho de Caudas por tempo.
5. **Níveis:** XP sobe 3 por minuto andando e não sobe parado; a diária dá +15; virar Raposinha mostra o título e o aviso geral; o nome sobre a cabeça tem 2 linhas e muda na hora.
6. **Cargos:**
   - `/vulpus:cargo` (Admin) muda o selo; operador aparece como Admin;
   - Helper não abre o painel da staff;
   - `/vulpus:kitsune` põe e tira o selo;
   - uma `/tag` feita fora do menu aparece em até 30 s.
7. **Chat:**
   - selo, `[nível]` e cor do nome certos;
   - colar um símbolo de coroa na mensagem não falsifica;
   - só com o chat (sem o BP), o chat fica o normal do jogo;
   - sem o Beta, o log recusa só o chat.
8. **Leilão, básico:**
   - anunciar uma espada encantada e renomeada, um livro assinado, uma shulker cheia e uma pilha de 64;
   - comprar com outra conta: o item chega idêntico (encantos, nome, conteúdo da shulker);
   - os nomes dos itens aparecem traduzidos nos botões (inclusive poções), e os glyphs aparecem no texto e nos botões;
   - um nome de bigorna comprido aparece cortado com "..." nos botões e inteiro no detalhe do anúncio;
   - o vendedor recebe 95% na caixa, inclusive offline (e vê o aviso ao entrar).
9. **Leilão, limites:**
   - a taxa de anúncio é cobrada e não volta;
   - o 6º anúncio é recusado;
   - preço 0, 1.000.001 e "abc" são recusados;
   - no Criativo, recusa;
   - o item do menu é recusado.
10. **Leilão, caixa e duplicação:**
    - expirar (a staff põe a duração em 1 h e espera) manda o item para a caixa;
    - cancelar devolve para o inventário;
    - com a caixa cheia, não dá para anunciar;
    - duas contas comprando o mesmo anúncio juntas: só uma leva, a outra não paga;
    - trocar o item da mão com o formulário aberto: recusa;
    - sair do jogo no meio de uma compra ou venda: nada some;
    - reiniciar o servidor: anúncios e caixa continuam;
    - a staff remove um anúncio: vai para a caixa do dono e aparece no log.
11. **Armazém:** o bloco em (0, -64, 0) continua bedrock depois de tudo e nenhum baú fica no mapa.
12. **Registro de conteúdo** sem "Unknown property" e sem erro `[Vulpus]`.
13. **Telas de outros addons e formulários com campos** continuam iguais aos do jogo.
14. **Clãs no jogo de verdade:**
    - tag `[ABC]` antes do selo sobre a cabeça e no chat, com a cor (ou o degradê) do clã;
    - TNT e creeper do lado de fora não abrem buraco na base; com a opção desligada, abrem;
    - porta, alçapão, botão, alavanca, placa de escrever, baú, barril, funil e bigorna: barrados para quem é de fora;
    - balde de lava/água e isqueiro na borda e na zona: barrados;
    - barco na água dentro da zona: barrado;
    - "Território de [TAG]" aparece ao entrar e ao sair;
    - reiniciar o servidor no meio de uma guerra: ela continua com o mesmo placar e o mesmo horário de fim.
15. **Bandeiras (Capture the Flag):**
    - a bandeira aparece no pedestal com a cor do clã, o pano tremulando e a tag em cima; trocar a cor do clã muda a do pano em até 2 s;
    - de noite ela continua bem visível; o feixe aparece de longe durante a guerra;
    - a bandeira pequena acompanha a cabeça de quem leva sem ficar muito para trás (anotar se treme);
    - de elytra: ela vai para o inventário ao pegar; vestir de novo volta para o inventário;
    - no celular: a bandeira e o feixe não pesam (anotar o FPS perto de duas bandeiras).

16. **Caçada:** a caveira com o valor aparece em cima do nome (3 linhas) e some ao caçar; matar com arco conta para quem atirou; o anúncio e o som chegam para todos.

## Limitações

- **Formulários com campos:** ficam com o visual normal do Minecraft em todos os temas, de propósito. Mexer neles quebra fácil a cada atualização.
- **Atualizações do jogo:** o visual do menu e do placar depende de arquivos internos do Minecraft.
  - A cada atualização, rode `npm run verificar` e refaça o checklist acima.
  - O verificador avisa quando um arquivo do jogo que o addon usa mudou.
  - O chat precisa da troca da versão Beta (veja "O chat").
- **Placar do lado:** usa o mesmo espaço do `/title`. Um `/title` de outro addon ou de comando pode ser cortado pelo placar.
- **Servidor:** o addon guarda tudo no próprio mundo e ainda não fala com o Discord (os níveis já usam a mesma conta, para ligar no futuro).
- **Sem loja:** as Caudas só compram no leilão, de outras pessoas, e pagam as coisas do clã.
- **Proteção dos clãs:** a API estável não tem evento de pistão, de líquido escorrendo nem de fogo se espalhando. A zona de amortecimento impede que alguém de fora monte essas coisas perto da base, mas algo construído **antes** da base existir (ou um rio de lava vindo de longe) não é barrado. Endermen, wither e bichos que quebram blocos também não são barrados, e placa de pressão e fio de armadilha disparam com quem pisa (não há como impedir pela API). Funis ficam proibidos na zona inteira (não dá para saber para onde apontam antes de colocar).
- **Bandeiras:** o Bedrock não tem o efeito "brilho" (glowing) na API estável: quem leva a bandeira fica marcado pelas chamas em volta e pela bandeira acima da cabeça. A API também não tem como cortar o planeio no ar: a elytra é tirada do peito (vai para o inventário). Tridente com Correnteza não é barrado (um salto muito grande derruba a bandeira, como um teleporte).
- **Caçada:** vale quem o jogo aponta como autor do golpe final. Morte por queda, lava ou fogo depois de levar um golpe pode chegar sem jogador, e aí não paga.
- **Filtro de palavrões:** é simples (lista de palavras); a staff pode trocar a tag de um clã e tirar apelidos.

## Pastas

| Pasta ou arquivo | O que é |
|---|---|
| `vulpus_bp/` | pack de comportamento: manifest, item do menu e scripts |
| `vulpus_rp/` | pack de recursos: visual do menu e do placar, glyphs, texturas e textos |
| `vulpus_chat_bp/` | pack do chat (precisa de "APIs Beta") |
| `tools/build.py` | confere os três packs e gera `dist/` |
| `tools/instalar_dev.py` | copia para o modo de desenvolvimento e ativa num mundo (`--chat` ativa o chat) |
| `tools/verificar_ui.py` | confere o visual do menu e do placar contra o jogo instalado |
| `tools/gerar_texturas.py` | refaz as texturas provisórias |
| `tools/gerar_glyphs.py` | refaz os glyphs, o título VULPUS e as texturas do tema Black |
| `tools/gerar_bandeira.py` | refaz as texturas da bandeira (uma por cor de clã), o ícone do botão e a prévia `docs/previas/bandeiras.png` |
| `tools/gerar_temas.py` | refaz os temas Sakura, Lunar e Espírito, as raposinhas da escolha de tema e a prévia `docs/previas/temas.png` |
| `docs/` | especificações e pesquisa |
| `dist/` | o pacote gerado; não vai para o git |
