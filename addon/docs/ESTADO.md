# Addon Vulpus: estado da obra (passagem de bastão)

> **Fase 2 (0.2.0) pronta fora do jogo.** Especificação em [`docs/spec/03_spec_fase2.md`](spec/03_spec_fase2.md): glyphs, tema Black, níveis e ranks, scoreboard lateral, leilão e o pack "Vulpus Chat". A seção "Fase 2" logo abaixo é a situação atual; o resto do arquivo é da fase 1 e continua valendo.

## Temas do painel: situação em 2026-10-04

Pedido do dono: 5 temas para o menu; Laranja e Black para todos, **Sakura**, **Lunar** e **Espírito** só com o selo Kitsune (tag `vulpus:kitsune`), cada um com painel, cabeçalho, botões (3 estados), X (3 estados), divisor, título VULPUS e logo próprios. Explicação para o dono no `README.md` ("Temas do menu"); prévia em `docs/previas/temas.png`.

| Frente | Arquivos | Situação |
|---|---|---|
| Texturas | `tools/gerar_temas.py` (novo; importa de `gerar_texturas.py` e `gerar_glyphs.py`), `textures/vulpus/ui/{sakura,lunar,espirito}/*`, `ui/icone.png`, `ui/black/icone.png`, `docs/previas/temas.png` | **pronto** |
| JSON UI | `ui/vulpus/vulpus_menu.json` | **pronto** (0 erros no verificador) |
| Scripts | `core/forms.js` (tokens, `TEMAS_PAINEL`, `podeUsarTema`, `temaDoPainel`), `core/db.js` (`TEMAS_MENU`), `sistemas/ajustes.js` (`menuTemas`), `textos/ajustes.js`, `textos/geral.js`, `textos/menu.js`, `config.js` (ícones) | **pronto** |
| Verificador | `tools/verificar_ui.py` | **pronto** (grupos de tema, 5 temas simulados, contagem de controles) |
| Teste no jogo (cliente) | checklist do README, item 3 | **pendente: o dono** |

**Como funciona**
- **Tokens** logo depois de HUB/LISTA no título: Black `§v§b§r`, Sakura `§v§d§r`, Lunar `§v§9§r`, Espírito `§v§5§r` (Laranja sem token). O label do título tira os 4.
- **Antes:** o root montava 4 cópias inteiras (hub/lista × laranja/black) com `$vp_*` por cópia. **Agora:** o root tem só `hub` e `lista`; cada peça de tema virou um **grupo** (`tema_<peça>@vulpus_menu.tema_imagem`) com 5 imagens (`imagem_<tema>`), cada uma com o próprio gate pelo título e `property_bag {"#visible": false}`. As texturas vêm de `$tx_<tema>` fixos na definição do grupo, então as células da Lista não precisam de `factory_variables` para isso (só `$vp_creme`). O cabeçalho de seção da Lista tem 5 labels (cor por tema), também com gate.
- **Custo** (contagem do verificador): Hub 358 controles, Lista 81 + 27 por botão. Cinco cópias do menu seriam ~790 no Hub e ~60 por botão, e todas as cópias escondidas teriam também os bindings de coleção. Os gates novos são bindings globais simples (`#title_text` + `-`/`=`/`not`/`and`).
- **Selo perdido:** `temaDoPainel` (chamado ao montar todo título) troca um tema Kitsune sem a tag por Laranja, salva e avisa uma vez (`textos/geral.js`, `TEMA_VOLTOU`). Dados salvos: "laranja" e "black" continuam; tema desconhecido vira laranja (`completar`).
- **Ajustes > Tema do menu:** Lista com os 5 (raposinha de cada tema; cadeado e "Selo Kitsune" para quem não tem); o travado abre "Tema Kitsune" com a explicação (cosmético, sem vantagem); escolher reabre a escolha já no tema novo.
- O Black usa a logo e o título do Laranja (é "o atual"); a sidebar continua laranja.

**Checagens (2026-10-04)**

| Checagem | Resultado |
|---|---|
| `npm run check` (BP e chat) | 0 erros |
| `node --check` nos `.js` do BP e do chat | 56 de 56 ok |
| `python tools/verificar_ui.py` (jogo instalado e `--vanilla C:/Users/gille/vt/vanilla/ui`) | 4 arquivos, 144 controles, 116 texturas, 0 erros, 0 avisos |
| Mutações no verificador | pega textura do tema errado, grupo sem um tema, gate com token trocado, peça solta fora de grupo, token novo só no JS e label de cabeçalho sem gate |
| `gerar_texturas.py` / `gerar_glyphs.py` (sem `--forcar`) | nenhum PNG versionado alterado; `gerar_temas.py`: 39 PNGs |
| `python tools/build.py` | 0 erros; `Vulpus.mcaddon` 243 KB (RP 66 KB) |
| `mock/teste_fase2.mjs` (seção 6 reescrita; cópia anterior em `.antes_temas`) | 0 falhas: escolha com 5 + Voltar, cadeados, travado explica, Black no Hub e na Lista, Kitsune nos 3 temas (Hub e Lista), selo perdido volta ao Laranja com 1 aviso, migração de "black", "lunar" sem selo e lixo |
| Demais testes (`mock/*.mjs`, `mock_leilao/teste*.mjs`) | 0 falhas |
| BDS 1.26.52.3 (VulpusTeste) | sem erro de script (só o aviso conhecido do alias `hud`) |
| `instalar_dev.py --mundo "Testes Claude" --chat` | copiado; packs já ativos |

**O que só o cliente confirma:** que uma imagem com gate pelo título dentro de célula de factory e de botão funciona igual ao gate do hub (o modelo é o mesmo binding global `#title_text`), e se 5 imagens por estado de botão pesam no celular. Plano B se pesar: tirar os temas Kitsune do `TEMAS_MENU` e dos grupos (o Laranja e o Black continuam no mesmo esquema).

## Clãs e visual Kitsune: situação em 2026-10-04

Pedido do dono (sistema de clãs de SMP, depois ampliado: 8 níveis, mover base pago, toggles de explosão/entidades, zona de amortecimento, apelido e temas de cor Kitsune). Desenho final em [`docs/spec/04_spec_clas.md`](spec/04_spec_clas.md); explicação para o dono no `README.md` ("Clãs" e "Visual Kitsune").

| Frente | Arquivos | Situação |
|---|---|---|
| Dados e ações | `sistemas/cla_dados.js`, `cla_acoes.js`, `textos/clas.js`, `core/filtro.js` | **pronto** |
| Terreno e proteção | `sistemas/cla_terreno.js` | **pronto** (bases quadradas, sem varrer blocos) |
| Guerras e fogo amigo | `sistemas/cla_guerra.js` | **pronto** (prazos com `Date.now()`, sobrevive a reinício) |
| Menus e comandos | `sistemas/clas.js`, `menu.js` (slot 7 = Clã), `perfil.js` (Nível e ranks), `staff.js`, `ajustes.js`, `textos/regras.js` | **pronto** |
| Visual Kitsune | `sistemas/kitsune.js`, `textos/kitsune.js`, `cores.js`, `identidade.js`, `hud.js` | **pronto** |
| Chat | `vulpus_chat_bp/scripts/canal.js` e `formato.js` (tags de clã, apelido e tema; cópia de `pintar`) | **pronto** |
| Glyphs | `tools/gerar_glyphs.py`, `glyph_E2.png`, `glyphs.js` (`\uE230`..`\uE235`) | **pronto** |
| Teste no jogo (cliente e BDS) | checklist do README (itens 11, 12 e 14) | **pendente: o dono** |

**Decisões fora do desenho original**
- O botão **Nível** saiu do Hub para dar lugar ao **Clã**; Nível ficou em Perfil > "Nível e ranks" (e `/vulpus:nivel`).
- Base **quadrada** (Chebyshev): mais fácil de entender pelas coordenadas e de calcular. A base guarda o próprio raio: cresce até o do nível só onde há espaço (sem encostar em outra base + zona, longe do spawn).
- **Baú de guerra:** quem declara paga na hora; o alvo põe o que tiver (até o mesmo valor) quando a guerra começa; vence quem fizer mais abates. Explosões seguem os toggles do clã mesmo em guerra.
- **Recruta** não constrói na base por padrão (proteção contra recém-chegado); o Líder muda isso.
- **Sem "falar no clã" automático:** sem o pack Beta o chat normal não é interceptado; só `/vulpus:c`.
- **Dissolver** devolve o banco ao líder (que já sacava sem limite); a staff ao remover também.
- Versão continua **0.2.0** (nada foi publicado ainda). Se o dono importar o `.mcaddon` por cima de uma 0.2.0 já instalada, o jogo pode manter a antiga: use `npm run dev` ou apague a antiga antes.

**Checagens (2026-10-04)**

| Checagem | Resultado |
|---|---|
| `npm run check` (BP e chat) | 0 erros |
| `node --check` nos `.js` do BP e do chat | 56 de 56 ok |
| `python tools/verificar_ui.py` | 4 arquivos, 114 controles, 78 texturas, 0 erros, 0 avisos |
| `python tools/build.py` | 21 JSON ok; `Vulpus.mcaddon` 200 KB |
| `mock/teste_clas.mjs` (novo) | 0 falhas (criar, convites, cargos, banco, 8 níveis, base e custo de mover, proteção, zona, explosões, entidades, guerra completa, aliados, chat do clã, apelido e temas no BP e no chat, staff, dissolver) |
| `mock/teste.mjs`, `teste_fase2.mjs`, `teste_fumaca.mjs`, `teste_efeitos.mjs`, `mock_leilao/teste*.mjs` | 0 falhas (ajustados: 34 comandos e Nível pelo Perfil) |
| `mock/teste_clas_adv.mjs` (revisão adversarial) | 0 falhas |
| BDS 1.26.52.3 (VulpusTeste) | sem erro de script; `help` mostra os 10 comandos novos, `/vulpus:c` com 8 parâmetros; servidor parado |

**Armadilhas novas**
- No Bash deste PC, heredoc engole `\\`: para editar arquivo com barra invertida via Python, grave o script num arquivo antes.
- `mock/mc_server.mjs` ganhou `world.beforeEvents` (6 sinais), `Entity` com `matches` e `Direction` (cópia anterior em `mc_server.mjs.antes_clas`).
- Os temas de cor existem em dois lugares (`cores.js` e `vulpus_chat_bp/scripts/formato.js`); o `teste_clas.mjs` confere que pintam igual.

**Revisão adversarial (2026-10-04)** — teste novo `mock/teste_clas_adv.mjs` (97 checagens; mais de 30 falhavam no código anterior, e ele quebrava com o histórico corrompido)
- **Achado no BDS:** `/vulpus:c` tinha 16 parâmetros e o jogo aceita 8: o comando nem registrava. Agora são 8 (palavras soltas, ou a frase entre aspas); o teste confere o limite em todos os comandos.
- **Proteção:** todo balde (vazio, de peixe, de neve) conta como líquido e vale também na zona; carga de vento e vara de pesca barradas; anzol de estranho que fisga bicho da base some (`projectileHitEntity`); cama com a cabeça entrando na base barrada; zona + 1 bloco para mecanismos (o pistão empurra 12); aliado com acesso não planta nem põe linha/placa/estandarte; explosão só olha as bases perto (200 explosões de 1000 blocos com 150 bases: ~20 ms).
- **Base:** tirar e marcar de novo não pula mais a espera de 24 h (campo novo `baseMudou`).
- **Banco:** limite de saque NaN virava "sem limite"; agora vira 0 (e `saqueDisponivel` nunca devolve NaN).
- **Guerra:** abate só conta entre quem já era do clã na declaração (conta reserva entrando em clã aberto no meio da guerra não vira ponto). Histórico e abates corrompidos no mundo derrubavam o menu (`null` no histórico): agora são saneados.
- **Nomes:** nome de clã e apelido só com alfabeto latino (com acentos), contra o "а" cirílico; nome de clã compara só letras e números ("Raposas-da-Lua" = "Raposas da Lua"); apelido barra cargo/Kiza/pessoa com trocas de número ("K1za", "4dm1n", "K0pe") e "Porteiro"; glyphs somem de nome, descrição e casas; apelido salvo fora das regras não aparece (BP e chat).
- `mock/mc_server.mjs`: `afterEvents.projectileHitEntity`, `Entity.isValid` e `Entity.remove()` (cópia anterior em `mc_server.mjs.antes_adv`).

**Guerra divertida e selo Kitsune perdido (2026-10-04, pedido do dono)**
- **Anti-farm por vítima:** cada pessoa abatida só rende ponto 1 vez a cada `guerraAntiFarmMin` (5 min), para qualquer matador do clã inimigo (antes era por par matador/vítima, 10 min). A regra "só quem era do clã na declaração" continua; nenhum tempo mínimo novo.
- **Extras leves** (`cla_guerra.js`): sequência de 3, 5 e 10 abates sem morrer ("Em chamas", "Imparável", "Lenda da toca") anunciada aos dois clãs, +`guerraBonusSequencia` (1) por marco; fim da sequência anunciado; cabeça do líder inimigo +`guerraBonusLider` (1), 1 vez por hora por líder; **Caçador** (mais abates; empate: quem chegou antes) anunciado a todos no fim, com título na tela e no histórico. O placar ao vivo na sidebar já existia. As 3 chaves novas estão em Configurações > Clãs e guerras (0 desliga o extra).
- **Selo Kitsune perdido:** o clã guarda `temaPor` (quem escolheu o tema). `conferirTemaKitsune` (`cla_acoes.js`) tira o tema e volta para a cor sólida de antes (ou a primeira, se ela estiver travada pelo nível) só se o tema atual foi escolhido por quem perdeu o selo (vale também para clã de onde a pessoa saiu). Roda ao entrar (o selo pode sumir entre sessões) e a cada 10 s para quem está online (`clas.js`). `kitsune.js` e `identidade.js` não foram mexidos.
- `docs/spec/04_spec_clas.md` estava corrompido (um replace antigo com ``$` `` colou o começo do arquivo dentro da regra "Criar"): consertado.
- Testes: `teste_clas_adv.mjs` agora tem 131 checagens, com as novas de anti-farm, sequência, cabeça, Caçador, tema Kitsune online/offline/outro Kitsune/quem saiu; `teste_clas.mjs` passou a esperar 3 x 2 (a cabeça das duas líderes vale +1). Cópias anteriores: `*.mjs.antes_guerra_divertida`.
- Checagens: `npm run check` 0 erros; `node --check` 56 de 56; `python tools/build.py` 0 erros (`Vulpus.mcaddon` 241 KB, já com os temas novos do painel em obra); `teste.mjs`, `teste_clas.mjs`, `teste_clas_adv.mjs`, `teste_efeitos.mjs`, `teste_fase2.mjs`, `teste_fumaca.mjs`, `mock_leilao/teste*.mjs` e `chat_sim/teste.mjs`: 0 falhas.

## Fase 2 (0.2.0): situação em 2026-10-03

Tudo implementado, integrado, revisado e conferido fora do jogo (BDS e API simulada). Falta o teste do dono no jogo e o commit.

| Frente | Arquivos principais | Situação |
|---|---|---|
| [glyphs] | `tools/gerar_glyphs.py`, `vulpus_rp/font/glyph_E2.png` e `glyph_E3.png`, `scripts/glyphs.js`, `textures/vulpus/ui/titulo.png`, `docs/previas/glyphs.png` | **pronto** (folhas E2 e E3; a vanilla usa até D7, E0, E1 e F9..FF) |
| [ui] tema Black e título | `ui/vulpus/vulpus_menu.json`, `_ui_defs.json`, `textures/vulpus/ui/black/`, `tools/verificar_ui.py` | **pronto e revisado** |
| [sidebar] | `ui/hud_screen.json`, `ui/vulpus/vulpus_hud.json`, `core/tela.js`, `sistemas/hud.js`, `ajustes.js` | **pronto e revisado** |
| [ranks] níveis, cargos, nome sobre a cabeça | `sistemas/niveis.js`, `sistemas/identidade.js`, `textos/niveis.js`, `perfil.js`, `staff.js` | **pronto e revisado** |
| [chat] | `vulpus_chat_bp/` (`main.js`, `canal.js`, `formato.js`), `jsconfig.chat.json`, alias beta no `package.json` | **pronto e revisado** (só carrega com "APIs Beta") |
| [leilao] | `sistemas/leilao.js`, `sistemas/leilao_armazem.js`, `textos/leilao.js` | **pronto e revisado** |
| [integracao] | `config.js`, `db.js` (`v: 2`), `forms.js`, `permissoes.js`, `menu.js` (Hub de 10 slots, slot 6 Leilão), `staff.js`, `regras.js`, `main.js`, manifests 0.2.0, `texts/`, `build.py` (3 packs), `instalar_dev.py` (`--chat`), `README.md` | **pronto** |
| Revisões | JSON UI, lógica, leilão | **feitas**: 3 correções na UI, 3 na lógica, 5 no leilão (dupe e perda) |
| Fumaça | BDS 1.26.52.3 (mundo sem experimentos e mundo Beta temporário) + API simulada | **passou** |
| Conferência final | checagens, limpeza, docs | **feita** |
| Teste no jogo (cliente) | checklist do `README.md` | **pendente: o dono** |
| Commit e push | | **pendente** (depois do teste) |

**Desvios e achados**
- **Glyphs grandes demais (dois testes do dono):** na folha de 256 (células de 16) e depois na de 512 (células de 32) a mesma arte de 16 px saiu com ~2× a altura da letra. Medido nos prints: o jogo desenha glyph de página privada com **1 texel = 1 px de GUI**, qualquer que seja o tamanho da folha (a suposição de que "a célula vira 16 px de GUI" estava errada). Agora todos os ícones da E2 foram redesenhados com no máximo 9×9 texels, contorno incluído (como corações e comida da HUD), centralizados na vertical da célula de 32 (9 de altura: linhas 11..19; a maiúscula cai nas 12..18) e encostados na coluna 0. A barra de nível virou 4×7 (altura da maiúscula) e o título do chat (E3) virou 55×11 em 5 fatias de 11. A folha continua 512×512 (não muda o tamanho na tela). `docs/previas/glyphs.png` simula a regra real com a fonte default8 do jogo. Fontes só carregam ao abrir o Minecraft: feche e abra o jogo para ver.
- **Efeitos do teleporte (`core/efeitos.js`):** caudas de fogo de raposa em espiral na espera (uma cauda nova por segundo), barrinha na actionbar, sino que sobe de tom, fade de câmera (`Camera.fade`, estável), estouro na origem (quem está perto ouve o "puf") e chegada em 3 pulsos com título. Temas: Casa, Spawn, Voltar, TPA (quem recebe vê um portalzinho e ouve a chegada) e o padrão. Partículas e sons conferidos nos `.brarchive` da 1.26.52; teto de 96 partículas por tick no servidor; sons respeitam `ajustes.sons`; tudo protegido (falha vai ao log uma vez e o teleporte segue). Teste: `mock/teste_efeitos.mjs`.
- **Cargo na sidebar:** com cargo (Admin, Staff ou Helper, mesma regra do nameTag) a sidebar ganha uma 1ª linha com o glyph e o nome do cargo; o rank vem logo abaixo (7 linhas). O selo Kitsune vai no fim da 1ª linha.
- `pausarHud` saiu de vez (`hud.js`, `tpa.js` e `boas_vindas.js`): a sidebar usa o title, então não havia mais o que pausar.
- `identidade.js` lançava "Failed to resolve identity for '#versao'" no BDS ao criar o canal (o `getScore` de quem ainda não tem score lança). Corrigido com o `gravarScore` tolerante; o `canal.js` do chat tem a mesma proteção (`lerScore`).
- `/hud` curto já existe no jogo: o log avisa "Custom Command alias [hud] already in use" (aviso inofensivo) e só `/vulpus:hud` funciona. README e Regras usam a forma longa.
- `instalar_dev.py` copia o chat sempre, mas só o ativa com `--chat` (e faz o `.bak` do `world_behavior_packs.json` uma vez, antes da primeira mudança). Com o jogo aberto ele esvazia a pasta e copia por cima (o Windows não deixa apagar), então basta reabrir o mundo.
- Mundo "Testes Claude": às 02:14 de 2026-10-03 o próprio jogo regravou o `world_behavior_packs.json` sem o Vulpus Chat. Para testar o chat lá, rode de novo `npm run dev -- --mundo "Testes Claude" --chat` (o mundo já tem "APIs Beta").
- O texto do Hub usa `max_size` [100%, 96] (9 linhas), não 84: com a linha de rank e um nome longo chega a 9 linhas.
- A largura da sidebar é 170 px (a spec dizia 140): coordenadas de ±29.999.999 medem 162 px.
- Nos botões de lista do leilão (vitrine, caixa, "Para conferir"), o nome dado na bigorna é cortado em 24 caracteres com "..."; o detalhe do anúncio mostra até 64. O lote guarda o nome inteiro.
- O `worldLoad` dispara de novo depois de `/reload` (conferido no BDS): o armazém do leilão não fica preso em "acordando".
- Apoio de teste fora do repo: `C:/Users/gille/vt/mock` (API simulada com estruturas; a versão da fase 1 está em `mock/bak_antes_leilao/`), `C:/Users/gille/vt/mock_leilao` e `C:/Users/gille/vt/chat_sim`. Rodar com `node --import ./registrar.mjs <teste>.mjs` dentro da pasta.
- `docs/workflow_fase2.js` é o roteiro do workflow desta fase (só registro; tem `return` no topo e não passa no `node --check` de propósito).

**Checagens da conferência final (2026-10-03)**

| Checagem | Resultado |
|---|---|
| `npm run check` (BP contra 2.10.0/2.2.0 e chat contra 2.11.0-beta) | 0 erros |
| `node --check` em todos os `.js` do BP e do chat | 45 de 45 ok |
| `python tools/verificar_ui.py` (jogo instalado e `--vanilla C:/Users/gille/vt/vanilla/ui`) | 4 arquivos, 114 controles, 68 texturas, 0 erros, 0 avisos; `server_form.json` e `hud_screen.json` vanilla iguais aos da 1.26.52 |
| `python tools/gerar_texturas.py` / `gerar_glyphs.py` (sem `--forcar`) | 13 e 14 PNGs prontos, nenhum alterado |
| `python tools/build.py` | 21 JSON ok, sem avisos; `Vulpus.mcaddon` 134 KB (BP 95, RP 32, Chat 6) |
| `python tools/instalar_dev.py --simular --mundo "Testes Claude"` (com e sem `--chat`) | ok: BP e RP já ativos; com `--chat` ativaria o chat com `.bak` |
| Varredura | 24 comandos com `cheatsRequired: false`; sem BOM, CRLF, emoji, TODO ou `console.log` no código; `node_modules/`, `dist/` e `__pycache__/` cobertos pelo `.gitignore` da raiz |
| API simulada | `mock/teste.mjs` (67 forms), `teste_fase2.mjs`, `teste_fumaca.mjs` (BP + chat juntos, 42 forms), `mock_leilao/teste.mjs` (134 forms), `teste2.mjs`, `teste3.mjs` (dupe e perda): 0 falhas; `chat_sim/teste.mjs` ok |
| BDS 1.26.52.3 | `VulpusTeste` sem experimentos: BP e RP sem erro de script, comandos do leilão no `help`, bedrock em (0, -64, 0); mundo Beta temporário com os 3 packs: sem erro, placares do canal criados (mundo apagado depois) |

**O que testar no jogo (fase 2)**

O passo a passo está no `README.md` ("Teste rápido dos sistemas" e "Checklist de teste no jogo", itens 1 a 13). Pontos que só o cliente confirma:
1. Glyphs no chat, sobre a cabeça, na sidebar e nos menus; se `§7` antes do glyph muda a cor; vãos no "VULPUS" da primeira entrada.
2. Tema Black: abrir e fechar 10 vezes; forms com campos continuam vanilla.
3. Sidebar: title normal aparece inteiro; troca de GUI scale volta em até 10 s; no celular, não cobre botões de toque nem efeitos de poção.
4. Mensagem de morte e chat sem o pack Beta com o nome de 2 linhas (nameTag): anotar como fica.
5. Leilão: itens chegam idênticos (encantos, nome, shulker), nomes longos cortados com "...", 2 contas comprando juntas.
6. Repetir num mundo **sem experimentos e sem cheats**, sem o pack do chat.

**Como ligar o chat (Beta)**

> **Não tem volta:** depois que "APIs Beta" é ligado, o mundo fica marcado como experimental para sempre. Faça primeiro numa **cópia** ou num mundo novo, nunca no mundo principal sem backup.

- **Mundo local:** Editar mundo > Experimentos > "APIs Beta" (no `level.dat`, `experiments.gametest = 1`). Depois `npm run dev -- --mundo "<nome>" --chat` com o mundo fechado, ou ative o "Vulpus Chat" em Pacotes de comportamento.
- **Servidor (BDS):** abra uma cópia do mundo no jogo, ligue "APIs Beta", suba de volta; copie `vulpus_chat_bp` para `behavior_packs/` e ponha `{"pack_id": "64b4756c-363d-4186-9e22-e4716171d6a7", "version": [0, 2, 0]}` no `world_behavior_packs.json` do mundo.
- Sem o experimento, só o chat é recusado no log; o resto do addon funciona.
- A cada atualização do Minecraft a versão beta muda: troque `2.11.0-beta` no `vulpus_chat_bp/manifest.json` e o alias `@minecraft/server-beta` no `package.json` (passo a passo no README, "O chat").

**Armadilhas novas (fase 2)**
- **Sidebar e title:** a sidebar usa o canal do `/title` com uma marca própria; um `/title` de outro addon pode ser cortado por ela. O gate do `vulpus_hud.json` só mostra a caixa quando o texto tem a marca **e** sobra texto depois dela.
- **Glyphs:** nunca em títulos de menu; toda arte começa na coluna 0 (senão a largura sai errada). Folhas livres a partir de E2 (E2..F8).
- **Chat Beta:** dentro do `chatSend` nada de `system.run` (reordena o chat). Mensagens reenviadas saem como do servidor: o filtro de palavrões e o bloqueio do Xbox podem não valer. Se outro addon cancelar depois, a mensagem já saiu.
- **Leilão:**
  - o bloco de bedrock em (0, -64, 0) e a ticking area `vulpus_armazem` são do armazém: não mexer;
  - backup só do mundo **inteiro** (estruturas e registro juntos), senão os lotes vão para "Para conferir";
  - em "Para conferir", confira o inventário da pessoa antes de "Devolver" (senão duplica); lotes de resgate com mais de um item só saem por `/structure load`;
  - o item é marcado "movido" antes de mover: um erro no meio vai para devolução ou "Para conferir", nunca dupe.
- **Dados:** `db.js` está em `v: 2`; `completar()` preenche XP 0 e tema laranja para quem veio da fase 1.

Atualizado em 2026-10-03, na conferência final da fase 2. A fase 1 (abaixo) foi conferida em 2026-10-02.

## O que é

Addon de Minecraft Bedrock para o servidor Vulpus. O mascote é a Kiza Misuchi, uma raposa kitsune.
- **Plataforma:** Script API pura, sem plugin. O dono testa num mundo local; depois o addon vai para um BDS na BedHosting.
- **Foco desta fase:** um menu personalizado em JSON UI. A logo fica no meio, o texto embaixo dela e há 4 botões de cada lado, além dos sistemas base que os botões abrem:
  - Spawn, Casas, TPA e Voltar;
  - Caudas, Perfil, Ajustes e Regras;
  - Staff.
- **Versões:** Bedrock 1.26.52, `@minecraft/server` 2.10.0 e `@minecraft/server-ui` 2.2.0, sem experimentos.

## Onde está cada coisa

| Arquivo | Conteúdo |
|---|---|
| `docs/spec/01_spec_funcional.md` | o que cada botão e cada sistema faz (fonte da verdade) |
| `docs/spec/02_spec_tecnica.md` | estrutura, dono de cada arquivo, contratos entre módulos, flags, texturas e manifests (fonte da verdade) |
| `docs/pesquisa/02_tecnicas_comunidade.md` | pesquisa de JSON UI; a seção 5 é a arquitetura adotada |
| `docs/pesquisa/referencia_vanilla_ui.md` | regras medidas do JSON UI vanilla da 1.26.52 |
| `docs/pesquisa/resumo_comunidade.md` | resumo dos achados da comunidade |
| `docs/pesquisa/proposta_rascunho/` | rascunho validado que deu origem ao JSON UI |
| `docs/previas/mock_hub.png` | montagem aproximada do menu, feita fora do jogo |
| `docs/previas/texturas.png` | folha com todas as texturas |
| `docs/resultados/texturas.md` | relatório da frente de texturas, com as decisões tomadas |
| `docs/workflow_implementar.js` | roteiro do workflow usado (6 frentes, verificação e revisões) |
| `docs/spec/03_spec_fase2.md` | especificação da fase 2 (fonte da verdade da 0.2.0) |
| `docs/spec/04_spec_clas.md` | desenho final dos clãs e do visual Kitsune |
| `docs/previas/glyphs.png` | folha com os glyphs, o título VULPUS e as texturas do tema Black |
| `docs/previas/temas.png` | o Hub e um pedaço da Lista em cada um dos 5 temas (gerado por `tools/gerar_temas.py`) |
| `docs/workflow_fase2.js` | roteiro do workflow da fase 2 |

Nos documentos, `<SCR>` era a pasta temporária do outro computador, e `<repo>` é a raiz deste repositório.

## Situação por frente (fase 1)

| Frente | Arquivos | Situação |
|---|---|---|
| Pesquisa e specs | `docs/` | **pronto** |
| [texturas] | `tools/gerar_texturas.py`, `vulpus_rp/textures/**`, `pack_icon.png` (BP e RP) | **pronto** |
| [ui] | `vulpus_rp/ui/server_form.json`, `_ui_defs.json`, `ui/vulpus/vulpus_menu.json`, `tools/verificar_ui.py`, `tools/brarchive.py` | **pronto e revisado** (revisor corrigiu `factory_variables` da Lista e o verificador) |
| [core] | `vulpus_bp/scripts/main.js`, `config.js`, `core/*.js`, `textos/geral.js` | **pronto e revisado** |
| [sistemas1] | `scripts/sistemas/{menu,spawn,casas,voltar,tpa}.js` e textos | **pronto e revisado** |
| [sistemas2] | `scripts/sistemas/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js` e textos | **pronto e revisado** |
| [pacote] | manifests, `items/menu.json`, `texts/`, `package.json`, `jsconfig.json`, `tools/build.py`, `tools/instalar_dev.py`, `README.md` | **pronto** |
| Revisões | JSON UI, lógica dos scripts, conformidade com a spec | **feitas**: 2 correções na UI, 6 bugs corrigidos na lógica, textos e README ajustados |
| Teste de fumaça | BDS 1.26.52.3 oficial + API simulada | **passou**: pack carrega sem erro, 17 comandos registrados, `/menu` sem prefixo funciona, simulação dos sistemas sem falhas |
| Conferência final | checagens, limpeza, docs | **feita** |
| Teste no jogo (cliente) | visual do JSON UI, item, TPA com 2 pessoas | **pendente: o dono** |
| Commit e push na `main` | | **pendente** (depois do teste) |

## Checagens da conferência final (2026-10-02)

| Checagem | Resultado |
|---|---|
| `npm run check` (tsc contra 2.10.0 e 2.2.0) | 0 erros |
| `node --check` nos scripts do BP | 34 de 34 ok (`docs/workflow_implementar.js` não passa de propósito: é roteiro de workflow, com `return` no topo) |
| `python tools/verificar_ui.py` | 2 arquivos, 93 controles, 35 texturas, 0 erros, 0 avisos; `server_form.json` vanilla igual ao da 1.26.52 |
| `python tools/gerar_texturas.py` | 13 PNGs prontos, nenhum alterado (logo protegida) |
| `python tools/build.py` | 13 JSON ok; `dist/Vulpus.mcaddon` 66 KB (BP 53 KB, RP 12 KB) |
| `python tools/instalar_dev.py --simular --mundo "Testes Claude"` | acha o com.mojang (GDK) e o mundo; ativaria BP e RP com `.bak` |
| Lixo | sem `__pycache__`, `.ruff_cache`, BOM, emoji, `TODO` ou `console.log`; `node_modules/` e `dist/` cobertos pelo `.gitignore` da raiz |

## O que falta testar no jogo (fase 1)

1. O clique direito no item abre o menu. Se não abrir, acrescentar `minecraft:use_modifiers` em `items/menu.json`.
2. Visual do Hub: logo, 8 botões, texto embaixo da logo sem cortar (nome longo), coroa da staff no canto.
3. Visual da Lista (Casas, TPA): fundo laranja e marrom nos botões, cabeçalho laranja em Regras > Comandos, `§r` voltando à cor creme, Lista de 220 px cabendo em celular com GUI grande.
4. Content Log sem "Unknown property" (`factory_variables`).
5. Forms vanilla (ModalForm de nova casa, configurações da staff) continuam normais.
6. TPA com 2 pessoas; `/vulpus:tpaceitar NomeErrado` dá erro e não aceita outro pedido.
7. Teleporte cancelado andando: o aviso fica uns 3 s na actionbar.
8. Repetir num mundo **sem experimentos e sem cheats**, igual ao BDS.

## Próximos passos

1. O dono testa no jogo a 0.2.0 (passo a passo no `README.md`, seções "Teste rápido dos sistemas" e "Checklist de teste no jogo").
2. Corrigir o que o teste apontar.
3. Commit e push na `main`.
4. Depois: subir no BDS da BedHosting.

## Armadilhas já conhecidas

- **Comandos:** `CustomCommand.cheatsRequired` vale **true** por padrão, então todo comando precisa de `cheatsRequired: false`.
- **Callback de comando:** roda em modo restrito. Mostrar form ou mexer no mundo exige `system.run`.
- **Seletor de jogador vazio:** `comandos.js` entrega `null` quando o nome foi passado e ninguém foi achado, e `undefined` quando o parâmetro opcional não veio. Os sistemas tratam `null` como `JOGADOR_OFFLINE`.
- **`Player.name` lança erro** com jogador inválido na 2.x: conferir `isValid` antes.
- **JSON UI:**
  - nunca inserir em `long_form.controls`;
  - nunca usar `$var` dentro de `modifications`;
  - cada botão precisa do binding `collection_details` no próprio button, senão o clique volta `canceled`;
  - nas expressões, só `=`, `not`, `and`, `or`, `-` e `+`;
  - o `collection_index` conta label, header e divider, mas o `selection` conta só botões;
  - **células criadas por factory não herdam as variáveis do `root`**: passe-as em `factory_variables` (como a vanilla faz);
  - o `texto_hub` usa `max_size` [100%, 96] (9 linhas), e não 72 como na spec: com a linha de rank e um nome longo (15+ caracteres), o texto chega a 9 linhas.
- **Hub:** sempre manda 11 botões (os vazios vão com texto `''`). O slot 10 é o da staff; o 6 é o Leilão ("Leilão (n)" quando há itens na caixa de retirada).
- **Encoding:** arquivos com `§` precisam estar em UTF-8 sem BOM.
- **Texturas:** o `gerar_texturas.py` marca cada PNG com uma assinatura e não sobrescreve um arquivo trocado à mão, a não ser com `--forcar`. Isso protege a logo oficial.
- **Ferramentas neste PC:** o `python` do PATH é um atalho falso da Microsoft Store. Use `C:/Users/gille/vt/py` e `C:/Users/gille/vt/node` (no Bash: `export PATH="/c/Users/gille/vt/node:/c/Users/gille/vt/py:$PATH"`).
- **BDS:** o servidor não carrega UI; ele só prova scripts, comandos e item. O visual só se confere no cliente.
- **Mundo "Testes Claude":** tem experimentos ligados (incluindo Beta APIs) e cheats ativos. O addon não precisa deles, mas o teste final deve ser num mundo sem experimentos e sem cheats, igual ao servidor.
- **Apoio de teste fora do repo:** BDS em `C:/Users/gille/vt/bds` (script `C:/Users/gille/vt/rodar_bds.js`) e API simulada em `C:/Users/gille/vt/mock/` (`node --import ./registrar.mjs teste.mjs`).

## Página de andamento (opcional)

https://claude.ai/artifact/WcBX55EUA9v74XnYtm71Hk

A página lê o documento `painel/estado` do banco dela, que se atualiza com a ferramenta ArtifactData. É preciso ler o artifact antes de publicar nele.

## Pendências do bot Kiza (fora do addon, manuais)

- **Railway:** "Deploy Latest Commit" para subir o 1.4.0.
- **Discord:**
  - `/setup` > Publicar tudo;
  - conferir se o atalho `</bump:ID>` vira link;
  - liberar o `/bump` do DISBOARD para membros, em Integrações e nas permissões do canal;
  - criar o cargo 🔔 Bump;
  - **regenerar o token do bot**, que foi colado num chat antes.
- **Página do DISBOARD:** o texto novo está em https://claude.ai/artifact/MJskeuaCjt5bpZtZPjam5c

## Preferências do dono (KOPE / Luiz)

- **Comunicação:** respostas curtas e objetivas, em português. Ele não é programador.
- **Pasta:** trabalhar só dentro de `BotVulpus`.
- **Sem pay-to-win:**
  - o Kitsune (booster) tem 2x XP no Discord; isso foi aceito, porque todo mundo chega nas mesmas recompensas;
  - nada exclusivo de quem paga e nada que valha dentro do jogo por dinheiro.
- **Autorização:**
  - não escrever código sem um sinal explícito;
  - não agendar tarefas nem rodar retomadas ou agentes pesados por conta própria;
  - quando ele disser "pare", parar tudo e esperar.
