# Addon Vulpus: clãs e visual Kitsune (desenho final)

Estende as specs 01 a 03, que continuam valendo. Versão do addon: continua **0.2.0** (a 0.2.0 ainda não foi testada nem publicada).

## 1. Arquivos

| Arquivo | Conteúdo |
|---|---|
| `scripts/sistemas/cla_dados.js` | tipos, leitura/validação, índices em memória, `editarCla` (atômica), permissões, níveis, banco, XP do minuto ativo, log da staff |
| `scripts/sistemas/cla_acoes.js` | ações com mensagens: criar, convites e pedidos, cargos, sair, dissolver, banco, evoluir, ajustes, casas, alianças, confiança, chat do clã, ações da staff |
| `scripts/sistemas/cla_terreno.js` | base, espaço entre bases, custo de mover, proteção, zona de amortecimento, explosões, território, bypass |
| `scripts/sistemas/cla_guerra.js` | guerras (aviso, início, pontos com anti-farm, sequências, cabeça do líder, Caçador, fim, baú, rendição, recarga) e fogo amigo |
| `scripts/sistemas/clas.js` | menus, comandos, avisos ao entrar e a checagem do tema Kitsune do clã (ao entrar e a cada 10 s) |
| `scripts/sistemas/kitsune.js` | apelido e tema do nome (selo Kitsune) |
| `scripts/cores.js` | temas de cor e `pintar()` (cópia no `vulpus_chat_bp/scripts/formato.js`) |
| `scripts/core/filtro.js` | filtro simples de palavrões |
| `scripts/textos/clas.js`, `textos/kitsune.js` | textos |

Imports sem ciclo: `cla_dados → caudas`; `cla_guerra → cla_dados`; `cla_terreno → cla_dados, cla_guerra`; `cla_acoes → cla_dados, cla_guerra, cla_terreno, kitsune, caudas`; `clas → todos`; `identidade, hud, perfil → cla_dados, kitsune`; `menu → clas`; `staff → clas`. `caudas.js` ganhou `aoMinutoAtivo(fn)` (o mesmo loop de 1 min com anti-AFK).

## 2. Dados (propriedades dinâmicas do mundo)

| Chave | Conteúdo |
|---|---|
| `vulpus:cla:c:<id>` | um `Cla` (v1): nome, tag, cor, tema, temaPor (id do Kitsune que escolheu o tema), emblema, desc, criado, dono, membros `{id, nome, cargo, desde, saque:{dia, valor}}`, aberto, pedidos, banco, extrato (30), xp, nivel, aporte/aporteMax, base `{x, y, z, d, marcada, raio}`, mudancasBase, protecao `{tnt, creeper, explosoes, entidades}`, casas, aliados, pedidosAlianca, confianca, acessoAliados, fogoAmigo, perms e limites por cargo |
| `vulpus:cla:seq` | próximo id (base 36) |
| `vulpus:cla:guerras` | `{ guerras[], historico[20], recargas{"a\|b": ms} }`; cada guerra guarda `abates{id: {n, nome, lado, t}}`, `recentes{vítima: ms}`, `seq{id: n}` e `cabecas{líder: ms}`; o histórico guarda o `cacador {nome, n, lado}` |
| `vulpus:cla:log` | últimas 40 ações da staff |
| `DadosJogador` | `+ apelido`, `+ temaNome`, `+ ajustes.cla` (linha do clã no placar) |

- A fonte da verdade é o registro de cada clã; os índices (tag, nome, quem é de qual clã) são montados em memória a partir dele. Dado ilegível fica de fora (log); campo errado ganha o padrão; exatamente um líder (ou nenhum, com `dono: ""`, só pelo Painel de Dono); listas com teto (JSON bem abaixo de 30.000).
- `editarCla(id, fn)` edita uma cópia e só troca a memória se gravou; `fn` pode devolver `false` para desistir. `moverBanco` nunca deixa negativo nem passa de 1e9.
- XP por depósito só na parte que passa do maior aporte já visto (`aporte = depositado - sacado`): sacar e depositar de novo não rende XP.
- Convites ficam só em memória (5 min). Pedidos de entrada valem 3 dias.

## 3. Regras

- **Criar:** `custoCriarCla` (500). Nome 3-24 (`LETRAS_NOME`: latino com os acentos do português, números, espaço, `_ ' . -`; outros alfabetos não, contra o "а" cirílico), tag `^[A-Z0-9]{3}$`, únicos (o nome compara só letras e números, sem acento), filtro de palavrões. Glyphs (uso privado) somem de nome, descrição e casas. Um clã por pessoa; quem entra é Recruta.
- **Cargos:** lider > vice > oficial > membro > recruta. Permissões: `construir, convidar, expulsar, promover, sacar, terreno, guerra, editar` (padrões no README). Só mexe em quem está abaixo; promove até um abaixo do próprio cargo; liderança só por transferência (o antigo vira Vice).
- **Níveis 1-8** (`NIVEIS_CLA` em `config.js`): raio 8, 16, 32, 64, 128, 256, 512, 1024; membros 4-30; casas 1-5; cores 4-12; emblemas 1-5. Subir pede o XP e paga o custo com o banco; a base cresce até o raio novo onde couber.
- **Base:** quadrado (distância de Chebyshev) de raio `base.raio`, coluna inteira, só Overworld. `raioQueCabe`: entre duas bases sobram ao menos `zonaAmortecimento` blocos; a borda fica a `distanciaSpawnBase` (200) do spawn. Marca se couber o raio 8. Primeira vez grátis; a espera conta da última marcação (`baseMudou`), mesmo se a base foi tirada; mover custa `custoMoverBase × (1 + aumentoMoverBasePct/100)^(nível-1)` (500, +60%) e espera `recargaMoverBaseHoras` (24). Não muda em guerra. "Crescer a base" tenta de novo o raio do nível.
- **Proteção** (eventos `before` estáveis): `playerBreakBlock`, `playerInteractWithBlock` (bloco clicado e vizinho da face; cama: também os 4 em volta), `playerInteractWithEntity`, `itemUse` (barco, todo balde, cristal, vento, vara de pesca), `entityHurt` (bichos não-monstro) e `explosion` (filtra os blocos da base pela fonte: TNT/carrinho de TNT, creeper, o resto; só olha as bases que encostam no quadrado da explosão). `projectileHitEntity` (after): o anzol de quem é de fora que fisga um bicho da base some. Libera: membro com `construir`, pessoa de confiança, inimigo em guerra ativa, aliado com `acessoAliados` (só interagir de mão vazia ou com item comum), staff com bypass. Aviso na actionbar com recarga de 2 s.
- **Zona de amortecimento** (`zonaAmortecimento`, 12): fora da base, quem é de fora não usa itens de redstone/mecanismo/líquido (todo balde, até o vazio e os de peixe)/fogo/vento (sempre; com 1 bloco a mais, o alcance do pistão) nem de entidade e vara de pesca (se `protecao.entidades`). Não existe evento de pistão `before` na 2.10.0.
- **Guerra:** declara quem tem `guerra`; os dois com nível ≥ `guerraNivelMinimo` (2) e ≥ `guerraMembrosMinimos` (3); uma guerra por clã; aliados não; recarga do par `recargaGuerraDias` (7). Declarar tira `custoGuerra` (1000) do banco para o baú; começa depois de `guerraAvisoMin` (60) e dura `duracaoGuerraHoras` (24); no início o alvo põe `min(banco, custoGuerra)`. Abate entre os dois = 1 ponto, em qualquer lugar. Anti-farm: cada vítima só rende ponto 1 vez a cada `guerraAntiFarmMin` (5) para qualquer matador do clã inimigo; matador e vítima precisam ser do clã desde antes da declaração (sem outro tempo mínimo). Extras: **sequência** de 3, 5 e 10 abates válidos sem morrer (qualquer morte zera; marcos e fim da sequência anunciados aos dois clãs) dá `guerraBonusSequencia` (1) por marco; **cabeça do líder** (vítima = `dono` do clã inimigo) dá `guerraBonusLider` (1), no máximo 1 vez por hora por líder; 0 desliga o extra (o anúncio continua). **Caçador**: no fim (qualquer motivo), quem tem mais abates válidos (empate: quem chegou primeiro, pelo `t`) é anunciado a todos, ganha título na tela se estiver online e fica no histórico. O placar ao vivo já aparece na sidebar e no menu. Fim: mais pontos leva o baú; empate ou staff devolvem as partes; rendição e dissolução dão a vitória ao outro lado. Ciclo a cada 100 ticks com `Date.now()`.
- **Fogo amigo:** `entityHurt` before cancela dano entre membros do mesmo clã (o clã pode ligar).
- **Dissolver:** confirmação dupla; o banco volta para o líder; a guerra conta como rendição. A staff remove do mesmo jeito (com log).

## 4. Visual

- **nameTag:** `§8[TAG]§r ` + selo/rank/nível na linha 1; linha 2 = nome (apelido e tema se Kitsune).
- **Canal para o chat** (tags de entidade, escritas por `identidade.js`): `vulpus:cla:<TAG>:<cor>[:<tema>]`, `vulpus:nome:<encodeURIComponent(apelido)>`, `vulpus:tema:<id>` (as duas últimas só com o selo). O chat valida tudo de novo e monta `selo [nível] [TAG] Nome » mensagem`.
- **Sidebar:** linha do nome (Kitsune), linha do clã (emblema, `[TAG]`, nome cortado em 16) e linha da guerra (placar ou "Guerra em N min"). Até 10 linhas.
- **Glyphs novos** (folha E2, linha 3): `\uE230` ESCUDO, `\uE231` BANDEIRA, `\uE232` TORRE, `\uE233` PATA, `\uE234` TROFEU (emblemas, liberados por nível), `\uE235` GUERRA.
- **Temas de cor** (`cores.js`, 18): 6 sólidos e 12 degradês (`degrade` espalha as cores pelo texto; `ciclo` alterna por letra). Kitsune escolhe para o próprio nome e, se tiver `editar`, para o clã; os outros usam `CORES_CLA` liberadas pelo nível.
- **Selo perdido:** o tema do clã guarda quem o escolheu (`temaPor`; cor sólida ou "sem tema" limpa). `conferirTemaKitsune` (em `cla_acoes.js`) tira o tema (volta para a `cor` sólida guardada; se ela não estiver liberada pelo nível, a primeira) de todo clã cujo `temaPor` é a pessoa, inclusive clã de onde ela já saiu, e avisa o clã. Roda ao entrar (o selo pode sumir entre sessões) e a cada 200 ticks para quem está online e é `temaPor` de algum clã. Se outro Kitsune trocou o tema depois, o `temaPor` é dele e nada muda. Tema sem `temaPor` (dado antigo) fica. Apelido e tema do nome já somem sem o selo (ficam guardados).
- **Apelido:** 3-16 caracteres (`LETRAS_APELIDO`: latino com acentos, números, espaço e `_ . -`; o chat aceita as mesmas), sem palavrão, sem nome de cargo/servidor (também com as trocas 4 = a, 1 = i...), sem imitar nome ou apelido de outra pessoa registrada ou online (comparando sem acento, símbolo e trocas de número). Apelido salvo fora dessas regras não aparece. A staff reseta. O Perfil mostra "Conta: <nome real>".

## 5. Menu e comandos

- O slot 7 do Hub (antes Nível) virou **Clã** (`Clã (n)` com convites ou pedidos). Nível foi para Perfil > "Nível e ranks" e `/vulpus:nivel`. Motivo: o Perfil já mostrava nível e barra, e clã é um sistema principal do SMP.
- Ajustes ganhou "Clã no placar" e "Visual Kitsune". Staff ganhou "Clãs (staff)" e o grupo de configurações "Clãs e guerras" (18 chaves novas em `PADROES`, incluindo `guerraAntiFarmMin`, `guerraBonusSequencia` e `guerraBonusLider`).
- Comandos novos (todos `cheatsRequired: false`): `cla`, `c <mensagem>` (até 8 palavras soltas, ou a frase entre aspas: o jogo aceita no máximo 8 parâmetros), `claconvidar`, `claaceitar [tag]`, `clarecusar [tag]`, `clacasa [nome]`, `cladepositar <valor>`, `apelido [nome]`; staff: `clabypass`, `resetapelido`. Total: 34.
- Sem "modo falar no clã": sem o pack Beta o BP não segura o chat normal e a mensagem vazaria.

## 6. Limites conhecidos

Sem evento estável para pistão, líquido escorrendo, fogo espalhando, endermen, wither e placa de pressão/fio pisados: a zona de amortecimento só impede que alguém de fora monte isso perto da base. Funis são barrados na zona inteira. Também não dá para barrar: máquina voadora (slime + observador) lançada de longe, flecha ou vento atirados de fora apertando botão ou abrindo porta, dispenser de longe atirando bola de fogo, raio do tridente com canalização, água/lava descendo morro de fora da zona, empurrão de bola de neve/ovo. Entrar na base (a pé, pérola, fruta do coro) é livre: a base protege blocos, bichos e baús, não a passagem. Teste adversarial: `C:/Users/gille/vt/mock/teste_clas_adv.mjs`. Teste: `C:/Users/gille/vt/mock/teste_clas.mjs`.

## 7. Capture the Flag (bandeiras nas guerras)

Pedido do dono (2026-10-04). Reaproveita clãs, terreno e guerras; as mudanças neles são pequenas e estão listadas abaixo.

**Arquivos**

| Arquivo | Conteúdo |
|---|---|
| `scripts/sistemas/ctf.js` (novo) | regras (pegar, capturar, cair, devolver, voltar sozinha, derrubar quem leva), restrições de quem leva, efeitos, sidebar (`infoSidebar`) e a entidade `vulpus:bandeira` (visual) |
| `scripts/sistemas/ctf_estado.js` (novo) | tipos e leitura do estado guardado na guerra (`lerCtf`, `prepararCtf`); só dados |
| `scripts/textos/ctf.js` (novo) | anúncios e avisos do CTF |
| `vulpus_bp/entities/bandeira.json` (novo) | entidade: sem gravidade nem colisão, imune a dano (`damage_sensor` all), não empurrável, persistente, nome sempre visível; propriedades `vulpus:cor` (int 0..11, `client_sync`) e `vulpus:mini` (bool); eventos `vulpus:mini`/`vulpus:normal` (grupo com `minecraft:scale` 0,45) |
| `vulpus_rp/entity/bandeira.entity.json`, `models/entity/bandeira.geo.json`, `animations/bandeira.animation.json`, `render_controllers/bandeira.render_controllers.json` (novos) | mastro de 48 px com ponta e pé dourados, pano de 28x16 em 4 ossos encadeados (UV por face; o lado norte espelhado com `uv_size` negativo), tremular com `math.sin(query.life_time ...)` em Y, textura escolhida por `Array.cores[query.property('vulpus:cor')]`, `ignore_lighting` |
| `vulpus_rp/textures/vulpus/entidades/bandeira_<cor>.png`, `ui/bandeira.png`, `tools/gerar_bandeira.py` (novos) | uma textura 64x64 por cor de `CORES_CLA` (mesma ordem), ícone do botão, prévia `docs/previas/bandeiras.png` |

Imports sem ciclo: `ctf_estado → cla_dados`; `cla_guerra → ctf_estado`; `ctf → cla_dados, cla_guerra, core`; `hud → ctf`. O glyph da bandeira já existia (`\uE231`).

**Mudanças nos sistemas existentes (mínimas)**
- `cla_dados.js`: `Cla.bandeira {x, y, z, d, marcada} | null` e `bandeiraMudou` (dado antigo: `null`/0); `problemaBandeira(cla, pos?)` → `"sem" | "sem_base" | "fora" | "longe" | undefined` (dentro da base pela régua de Chebyshev e a até `bandeiraDistanciaMax` do centro).
- `cla_terreno.js`: `marcarBandeira` (permissão `terreno`, base marcada, sem guerra em aviso ou ativa, posição válida, espera `recargaBandeiraHoras` contada da última marcação; a primeira não espera) e `recargaBandeira`; mover a base avisa se a bandeira ficou de fora.
- `cla_guerra.js`: `impedimentoGuerra` exige as duas bandeiras (por último, depois das outras regras); `iniciar` grava `g.ctf = prepararCtf(a, b)` (null = guerra só de abates); `terminar` avisa os ouvintes **logo depois de tirar a guerra da lista** (antes de pagar); `aoMudarGuerra("comecou" | "terminou", fn)`; `avisarClas` exportado; o histórico ganhou `capturas {a, b} | null`.
- `core/teleporte.js`: `registrarBloqueioTeleporte(regra)` (conferida no começo e de novo na hora de teleportar). `core/efeitos.js`: `emitir`, `anel` e `nuvem` exportados (o mesmo teto de 96 partículas por tick).
- `dono_acoes.iniciarGuerra(autor, a, b, minutos?)` (1 a 10.080; vazio/0 = `duracaoGuerraHoras`); o painel ("Iniciar guerra agora") pede os minutos; o comando é `guerra <TAG> <TAG> [minutos]`.
- Menus: Terreno (linha da bandeira e "Marcar/Mover a bandeira"), Meu clã, ficha pública, Ranking, lista de alvos, ficha da guerra (bandeiras, estado e capturas), ficha do Painel de Dono, histórico. Sidebar: 2 linhas em guerra ativa com bandeiras (até 12 linhas).
- `PADROES` (grupo "Clãs e guerras"): `bandeiraDistanciaMax` 64, `recargaBandeiraHoras` 1, `ctfCaptura` 10, `ctfDevolver` 2, `ctfMatarCarregador` 3.

**Estado** (`guerra.ctf`, salvo a cada mudança): `{ a, b: { pos, estado: "casa" | "roubada" | "caida", por, porNome, chao, desde, recarga }, capturas: { a, b } }` (a/b = a bandeira do clã de cada lado). `pos` é copiado do clã quando a guerra começa (não muda no meio). Ao carregar do mundo (`/reload` ou reinício), `lerCtf` põe tudo em casa (`por`/`chao` limpos) e mantém `recarga` e `capturas`. Quem leva fica só na memória (`carregadores`).

**Regras**
- Só com a guerra `ativa` e `g.ctf`. Encostar = mesma dimensão, até 1,5 bloco na horizontal e os pés de 1,5 abaixo a 3 acima da base da bandeira; vivo (vida > 0) e fora do modo espectador; só quem é do clã desde antes da declaração (`desde <= g.declarada`, a regra dos abates; o novato vê o aviso na barra).
- Pegar: bandeira inimiga em casa e fora da recarga, ou caída. Quem leva sem espaço para guardar a elytra não pega.
- Capturar: quem leva encosta na própria bandeira **em casa** → `+ctfCaptura`, `capturas[lado]++`, a capturada volta ao pedestal com `recarga = agora + 2 min`; anúncio aos dois clãs, mensagem curta para quem não é dos clãs, título, fogos (anel na cor do clã, totem, faíscas) e sons.
- Cair: morte (no lugar da morte), sair do jogo (último lugar visto), trocar de dimensão (`playerDimensionChange`, `fromLocation`), salto de mais de 16 blocos entre duas conferências (teleporte de fora do addon), vestir a elytra sem onde guardar. Procura o chão até 64 blocos abaixo; vazio, lava ou abaixo do mundo = volta na hora.
- Caída: o dono encosta e devolve (`+ctfDevolver`); o inimigo pega; depois de 30 s volta sozinha.
- Derrubar quem leva: se o matador é do clã dono da bandeira (e veterano), `+ctfMatarCarregador` por evento; o abate normal (+1 com anti-farm) é contado à parte por `cla_guerra.js`.
- Quem leva: lentidão I (renovada a cada segundo, some sozinha), sem teleporte do addon, `itemUse` cancelado para pérola, fruta do coro, fogos e elytra, elytra do peito vai para o inventário.
- Fim (qualquer motivo, inclusive Painel de Dono e staff): tudo volta ao pedestal, `carregadores` limpo, aviso aos dois clãs se alguma estava fora.

**Entidade (visual)** — uma por clã com bandeira válida, sempre (também fora de guerra), com a tag `vulpus:bandeira:<id do clã>`. A cada 2 s (e logo depois de qualquer mudança de clã ou de estado) `sincronizar` adota as que já existem no mundo (depois de `/reload`), remove repetidas e as de clã sem bandeira, cria a que falta (só com o chunk carregado) e põe cada uma no lugar (pedestal, chão ou mini com quem leva), com `vulpus:cor`, `vulpus:mini` + evento e o nome `⚑ [TAG]` (vazio na mini). A mini é teleportada todo tick para 0,45 acima da cabeça. Conferido no BDS: `setProperty` só vale no tick seguinte (o `getProperty` do mesmo tick devolve o valor antigo), sem efeito no resultado.

**Efeitos** (a cada 10 ticks, só com guerra de bandeiras): feixe de chamas coloridas (cor do clã) de 3,4 a 27 blocos acima do pedestal, a cada 1,5 bloco, com uma faísca no topo (fumaça branca durante a recarga); feixe menor na bandeira caída; fumaça "fantasma" no pedestal vazio; anel de chamas em volta de quem leva.

**Desempenho:** toque a cada 2 ticks e efeitos a cada 10, só com guerra ativa de bandeiras e só para quem é dos dois clãs; a mini só é teleportada com alguém levando; fora disso, só a conferência das entidades a cada 2 s (`getEntities` por tipo).

**Limites da API estável:** sem efeito "glowing" (o marcador é a bandeira acima da cabeça e o anel de chamas); sem como cortar o planeio no ar (a elytra é tirada do peito); Correnteza do tridente não é barrada (o salto grande derruba a bandeira). Teste: `C:/Users/gille/vt/mock/teste_ctf.mjs`.
