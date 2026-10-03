# Addon Vulpus: especificação técnica (fonte da verdade para implementar)

Leia também a especificação funcional, `01_spec_funcional.md`, na mesma pasta.
- Pasta de trabalho: `<repo>\addon\`.
- Scratchpad: `<SCR>` (`SCR`).
- Não toque em nada do bot Python (BotVulpus fora de `addon/`). A única exceção é o `.gitignore` da raiz, só para a agente do pacote.

## Referências locais (verdade da versão do usuário, Bedrock 1.26.52)
- UI vanilla extraída, JSON minificado: `SCR\vanilla_1.26.52\ui\`. Inclui `settings_sections\settings_common.json`. A versão identada está em `SCR\work\pretty\`, e há um navegador de herança: `python SCR\work\show.py showchain common_buttons.light_text_button`, rodado em SCR.
- Texturas vanilla de UI e itens, para consulta e para conferir caminhos:
  - `SCR\vanilla_1.26.52\textures\ui\`, `...\textures\items\`;
  - `SCR\vanilla_1.26.52\textures_ui_json\`, com os `.json` de nineslice.
- Tipagens oficiais:
  - `SCR\pesquisa\src\npm\server-2.10.0.d.ts`, `server-ui-2.2.0.d.ts`;
  - `SCR\npm_ref\node_modules\@minecraft\{server,server-ui,common}`.
- Pesquisa de JSON UI:
  - `SCR\pesquisa\02_tecnicas_comunidade.md` (seção 5 = arquitetura recomendada);
  - `SCR\pesquisa\resultado_2.md` (referência vanilla);
  - rascunho validado em `SCR\pesquisa\proposta_rascunho\`.

## Versões e manifests
- `@minecraft/server` **2.10.0** e `@minecraft/server-ui` **2.2.0**, ambos estáveis. Nenhum experimento.
- Manifests com `format_version: 2`:
  - `header.version` [0,1,0];
  - `min_engine_version` [1,26,50];
  - nomes literais: `"Vulpus"`, com a descrição "Menu e sistemas do servidor Vulpus" no BP e "Visual do menu do Vulpus" no RP.
- BP:
  - módulos `data` (uuid 235d63b2-cc2b-4734-b848-689d24c69b52) e `script` (uuid c87cf944-863b-451a-8db7-e2d42707bfe3, `language: "javascript"`, `entry: "scripts/main.js"`);
  - dependências: `@minecraft/server` 2.10.0, `@minecraft/server-ui` 2.2.0 e o RP `{uuid: 23661f46-bc60-4947-81ed-343c0279e638, version: [0,1,0]}`.
- RP:
  - header uuid 23661f46-bc60-4947-81ed-343c0279e638;
  - módulo `resources` com uuid 9632c594-0c36-4568-8c99-709774135b04;
  - dependência do BP `{uuid: 29023842-68f5-46b9-af72-b9e58ee29803, version: [0,1,0]}`.
- `metadata.authors: ["KOPE"]`.

## Estrutura de pastas e DONO de cada arquivo (cada agente só cria os seus)
```
addon/
  README.md, package.json, jsconfig.json                         [pacote]
  tools/build.py, tools/instalar_dev.py                          [pacote]
  tools/gerar_texturas.py                                        [texturas]
  tools/verificar_ui.py, tools/brarchive.py                      [ui]
  vulpus_bp/manifest.json, vulpus_bp/items/menu.json             [pacote]
  vulpus_bp/pack_icon.png                                        [texturas]
  vulpus_bp/scripts/main.js, config.js, core/*.js, textos/geral.js   [core]
  vulpus_bp/scripts/sistemas/{menu,spawn,casas,voltar,tpa}.js + textos/{menu,spawn,casas,voltar,tpa}.js   [sistemas1]
  vulpus_bp/scripts/sistemas/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js + textos/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js   [sistemas2]
  vulpus_rp/manifest.json, vulpus_rp/texts/*                     [pacote]
  vulpus_rp/textures/item_texture.json                           [texturas]
  vulpus_rp/textures/vulpus/**.png + .json (nineslice)           [texturas]
  vulpus_rp/pack_icon.png                                        [texturas]
  vulpus_rp/ui/server_form.json, ui/_ui_defs.json, ui/vulpus/vulpus_menu.json   [ui]
```

## Texturas (caminhos FIXOS combinados entre [ui] e [texturas])
Paleta Vulpus:
- laranja raposa #F28C38;
- laranja escuro #C4621A;
- brasa #7A3A10;
- creme #FFF4E6;
- fundo #2A1F1A;
- fundo claro #3A2A22;
- borda marrom #8A5A36.

Todas ficam em `vulpus_rp/textures/vulpus/ui/`, em PNG RGBA. Cada nineslice tem um `.json` irmão com `{"nineslice_size": N, "base_size": [W, H]}`.

| caminho (sem .png) | tamanho | nineslice | uso |
|---|---|---|---|
| `textures/vulpus/ui/painel` | 32x32 | 8 | fundo do menu (escuro, borda laranja 2px, cantos recortados) |
| `textures/vulpus/ui/cabecalho` | 32x16 | 4 | faixa do título (laranja escuro com brilho) |
| `textures/vulpus/ui/botao` | 16x16 | 4 | botão normal (fundo claro + borda marrom) |
| `textures/vulpus/ui/botao_hover` | 16x16 | 4 | botão em foco/hover (laranja) |
| `textures/vulpus/ui/botao_press` | 16x16 | 4 | botão pressionado (laranja escuro, "afundado") |
| `textures/vulpus/ui/fechar` | 16x16 | — | X creme em fundo escuro |
| `textures/vulpus/ui/fechar_hover` | 16x16 | — | X em laranja |
| `textures/vulpus/ui/fechar_press` | 16x16 | — | X em laranja escuro |
| `textures/vulpus/ui/divisor` | 32x2 | — | linha laranja suave (esticada) |
| `textures/vulpus/ui/logo` | 128x128 | — | LOGO PROVISÓRIA: emblema de raposa (pixel art estilo Minecraft) que o dono troca depois pelo mesmo nome de arquivo |
| `textures/vulpus/itens/menu` | 16x16 | — | ícone do item "Menu do Vulpus" (cabeça de raposa) |

Também ficam com [texturas]:
- `vulpus_bp/pack_icon.png` e `vulpus_rp/pack_icon.png`, ambos 256x256 com o emblema;
- `vulpus_rp/textures/item_texture.json`: `{"resource_pack_name":"vulpus","texture_name":"atlas.items","texture_data":{"vulpus_menu":{"textures":"textures/vulpus/itens/menu"}}}`.

Ícones dos botões são texturas VANILLA, todas conferidas na 1.26.52; os caminhos vão em `config.js`:
- spawn `textures/items/compass_item`
- casas `textures/items/bed_red`
- tpa `textures/items/ender_pearl`
- voltar `textures/items/totem`
- caudas `textures/items/gold_nugget`
- perfil `textures/items/name_tag`
- ajustes `textures/ui/gear`
- regras `textures/items/book_writable`
- staff `textures/ui/permissions_op_crown`
- nova `textures/ui/plus`
- editar `textures/ui/pencil_edit_icon`
- apagar `textures/ui/icon_trash`
- sim `textures/ui/check`
- nao `textures/ui/cancel`
- jogador `textures/ui/icon_steve`
- online `textures/ui/friend_glyph`
- diaria `textures/items/emerald`
- ranking `textures/items/map_filled`
- tempo `textures/items/clock_item`
- lore `textures/items/book_enchanted`
- comandos `textures/items/paper`
- discord `textures/items/feather`
- voltarNav `textures/ui/arrow_dark_left_stretch`
- mundo `textures/ui/world_glyph_color_2x`

## JSON UI (agente [ui]): arquitetura OBRIGATÓRIA
Use a técnica T1 da pesquisa (seção 5 de `02_tecnicas_comunidade.md`). Ponto de partida: o rascunho validado em `SCR\pesquisa\proposta_rascunho\RP\ui\`.

Flags, só códigos § válidos, terminando em §r, arquivo em UTF-8 sem BOM:
- `BASE = "§v§u§l§p"`;
- `HUB = "§v§u§l§p§0§r"`, para o menu principal;
- `LISTA = "§v§u§l§p§1§r"`, para os submenus. Qualquer título com BASE que não seja HUB cai na lista.

### `ui/server_form.json` (namespace `server_form`): SÓ 2 ganchos
1. `long_form.modifications`: `insert_back` em `bindings`, com `{binding_name:"#title_text"}` e um view binding `((#title_text - '§v§u§l§p') = #title_text)` para `#visible`. Isso esconde o vanilla quando a flag BASE está no título.
2. `main_screen_content.modifications`: `insert_back` em `controls`, com `{ "vulpus_form_factory": { "type":"panel", "factory": { "name":"server_form_factory", "control_ids": { "long_form":"@vulpus_menu.root" } } } }`.

Proibido:
- inserir em `long_form.controls`;
- tocar `custom_form`, `generated_contents` ou `dynamic_button`;
- usar `$var` dentro do valor das modifications (só literais).

O ModalFormData fica 100% vanilla.

### `ui/_ui_defs.json`
`{"ui_defs":["ui/vulpus/vulpus_menu.json"]}`. Não criar `_global_variables.json`: as variáveis ficam no `root` do nosso namespace, como `$vp_logo` etc. com `|default`.

### `ui/vulpus/vulpus_menu.json` (namespace `vulpus_menu`)
- `root`: painel com `hub` e `lista`. Ambos fazem gate pelo título, e o painel usa `property_bag {"#visible": false}` para evitar o flash.
- **hub** (menu principal), em px fixos, porque o pai `main_screen_content` é [0,0], centrado:
  - Quadro de **330x210**:
    - fundo `textures/vulpus/ui/painel`, que é nineslice;
    - faixa de título `cabecalho` no topo, com 24px de altura;
    - título (o texto sem as flags) em `font_type: "MinecraftTen"`, cor creme, centralizado.
  - **X** no canto superior direito: botão próprio com as texturas `fechar*` e `button_mappings` de `button.menu_select`/`button.menu_ok` para `button.menu_exit` (padrão Skyls).
  - **Slot staff** (collection_index 8) no canto superior esquerdo:
    - botão quadrado de 20x20 com as texturas `botao*`, mostrando só o ícone (`#form_button_texture`), sem label;
    - fica invisível quando `#form_button_text` é ''.
  - Corpo: `stack_panel` horizontal com `collection_name: "form_buttons"`.
    - **Coluna esquerda** (92px de largura): `stack_panel` vertical com `collection_name: "form_buttons"` e slots `collection_index` 0, 1, 2, 3. Cada slot tem 34px de altura, com gap de 5px.
    - **Centro** ("fill"): `stack_panel` vertical.
      - **LOGO** (`textures/vulpus/ui/logo`, 60x60) centralizada.
      - Gap.
      - **TEXTO** (`#form_text`, binding próprio `{binding_name:"#form_text"}`): centralizado, cor creme, sombra, `max_size` [100%, 72].
    - **Coluna direita**: igual à esquerda, com os índices 4, 5, 6 e 7.
  - Cada slot (painel 100% x 34):
    - Tem um filho `content`, escondido quando `(#form_button_text = '')` via binding de coleção.
    - Esconda o CONTEÚDO, não o painel do slot, para não desalinhar a coluna.
    - Dentro do `content`:
      - um `button` (`type:"button"`) com estados `default/hover/pressed` usando as imagens `botao/botao_hover/botao_press`;
      - no próprio botão, o binding `{"binding_type":"collection_details","binding_collection_name":"form_buttons"}`, que é OBRIGATÓRIO (sem ele o clique volta `canceled`);
      - `button_mappings` de `button.menu_select` (pressed) e `button.menu_ok` (focused) para `button.form_button_click`;
      - `sound_name "random.click"`, `focus_enabled true`;
      - ícone 18x18 à esquerda, com bindings de coleção `#form_button_texture` em `#texture` e `#form_button_texture_file_system` em `#texture_file_system`, escondido se for '' ou 'loading';
      - label `#form_button_text` com binding de coleção PRÓPRIO, cor creme, sombra, alinhado à esquerda depois do ícone, `max_size` [100% - 28px, 30].
- **lista** (submenus):
  - Quadro de **270x220**, com o mesmo fundo, título e X.
  - Dentro, um `common.scrolling_panel` com os mesmos `$scroll_size` e `$scrolling_pane_*` do vanilla `long_form_panel`, e `$show_background false`.
  - Conteúdo:
    1. o texto `#form_text`, alinhado à esquerda;
    2. um gap;
    3. a lista por factory, igual à vanilla 1.21.70+:
       - `factory` `{name:"buttons", control_ids:{button:"@vulpus_menu.item_lista", label:"@vulpus_menu.rotulo_lista", header:"@vulpus_menu.cabecalho_lista", divider:"@vulpus_menu.divisor_lista"}}`;
       - `collection_name "form_buttons"`;
       - binding `#form_button_contents` em `#collection_length`.
  - `item_lista` é uma célula de 32px de altura (botão de 30 + 2 de gap). Usa o mesmo botão do slot, com `collection_details`, mais ícone 20x20 e texto.
  - `rotulo_lista`, `cabecalho_lista` e `divisor_lista` são próprios (texto creme e cabeçalho laranja), lendo `#form_button_text` por binding de coleção. O divisor usa `textures/vulpus/ui/divisor`.
- Regras de expressões:
  - só `=`, `not`, `and`, `or`, `-` (remove substring) e `+`;
  - nada de `<`, `>`, `>=`, `%`, `/` ou `'' + #x`;
  - todo view binding lê alguma `#propriedade`.
- Mantenha leve: tudo é construído em todo server form aberto. Nada de slider/toggle/edit_box.
- `tools/verificar_ui.py` (feito por [ui]):
  - carrega a UI vanilla (pasta passada por argumento; o padrão é extrair do jogo instalado com `brarchive.py`, de `C:\XboxGames\Minecraft for Windows\Content\data\resource_packs\vanilla\__brarchive\ui.brarchive` e da subpasta `__brarchive\ui\settings_sections.brarchive`);
  - valida que todo `@namespace.elemento` e todo controle herdado existe;
  - valida que as variáveis `$` passadas para templates vanilla existem na cadeia;
  - valida as texturas referenciadas: as do RP existem como arquivo, as vanilla existem no jogo;
  - valida que as flags em `scripts/core/forms.js` são idênticas às do JSON;
  - avisa se o `server_form.json` vanilla mudou: compara hash com o da 1.26.52, guardado no script.

## Scripts (BP): contrato entre [core], [sistemas1] e [sistemas2]
Todos os arquivos usam JS ES module, com JSDoc e `// @ts-check` no topo, e passam no `tsc --checkJs` contra as tipagens 2.10.0 e 2.2.0. Os imports usam caminho relativo com extensão `.js`.
- Português nos nomes, como no bot: `abrirMenu`, `dadosJogador` etc.
- Comentários curtos, só onde ajudam.
- Nada de `console.log` solto. Use `console.warn` com o prefixo `[Vulpus]` só em erros.

### `scripts/config.js` [core]
```js
export const VERSAO = "0.1.0";
export const ITEM_MENU = "vulpus:menu";
export const TAG_STAFF = "vulpus:staff";
export const PREFIXO_JOGADOR = "vulpus:j:";            // + player.id (propriedade dinâmica do MUNDO)
export const CHAVE_CONFIG = "vulpus:config";
export const CHAVE_SPAWN = "vulpus:spawn";
/** Padrões editáveis pela staff (vulpus:config mescla por cima). */
export const PADROES = { esperaTeleporte: 3, recargaTeleporte: 10, combateSegundos: 10, tpaExpira: 60,
  limiteCasas: 3, caudasPorIntervalo: 5, intervaloCaudasMin: 10, diariaBase: 25, diariaBonusDia: 5,
  diariaBonusMax: 7, linkDiscord: "", hudPadrao: true };
export const ICONES = { /* tabela acima */ };
export const SONS = { abrir: "random.pop", erro: "note.bass", ok: "random.orb", pedido: "random.levelup" };
// Os sons do teleporte ficam em core/efeitos.js (com tom e volume).
```

### `scripts/core/util.js` [core]
- Funções:
  - `formatarTempo(segundos) → "2h 05min"`;
  - `formatarData(ms) → "02/10/2026"` (Brasília);
  - `diaBrasilia(ms) → "2026-10-02"` (UTC−3 fixo);
  - `diaAnterior(dia) → "2026-10-01"`;
  - `msAteMeiaNoiteBrasilia(ms)`;
  - `direcao(yaw) → "N"/"NE"/"L"/"SE"/"S"/"SO"/"O"/"NO"`;
  - `nomeDimensao(id) → "Mundo normal"/"Nether"/"End"`;
  - `formatarCoords({x,y,z}) → "120, 64, -30"` (inteiros);
  - `limitar(n, min, max)`;
  - `formatarNumero(n) → "1.234"`.
- Mensagens (todas usam o PREFIXO de `textos/geral.js`):
  - `msg(player, texto)`;
  - `ok(player, texto)`, que toca o som ok;
  - `erro(player, texto)`, que usa §c e o som de erro;
  - `som(player, id, opcoes?)`, com `PlayerSoundOptions` (tom, volume, local).
  - Todas ignoram jogador inválido (`player.isValid` é PROPRIEDADE na 2.x).

### `scripts/core/db.js` [core]
- `dadosJogador(alvo: Player|string) → DadosJogador`: objeto em cache, que já cria os padrões. Se for um Player, atualiza `nome`.
- `salvarJogador(alvo)`: grava o JSON com `world.setDynamicProperty(PREFIXO_JOGADOR+id, json)`. Se passar de 30000 caracteres, faz `console.warn` e não grava.
- `editarJogador(alvo, fn) → DadosJogador`: aplica `fn(dados)` e salva.
- `todosJogadores() → {id, dados}[]`: lê todas as chaves com o prefixo, inclusive de quem está offline.
- `config() → typeof PADROES`, mesclado com `vulpus:config`. `salvarConfig(parcial)`.
- `lerMundo(chave, padrao)` e `salvarMundo(chave, valor)`, com JSON.
- Tipo `DadosJogador`:
  `{ v:1, nome:string, caudas:number, tempo:number, primeira:number, ultimaVez:number, mortes:number,
     diaria:{dia:string, sequencia:number}, casas:{nome:string,x:number,y:number,z:number,d:string}[],
     voltar:Local|null, ajustes:{hud:boolean|null, tpa:boolean, sons:boolean}, recebeuItem:boolean }`
  - `ajustes.hud` null significa "usar `config().hudPadrao`".

### `scripts/core/permissoes.js` [core]
`ehStaff(player)` retorna true quando valer qualquer uma destas:
- `player.playerPermissionLevel === PlayerPermissionLevel.Operator`;
- `player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors`;
- `player.hasTag(TAG_STAFF)`.

### `scripts/core/jogadores.js` [core]
- `online() → Player[]`, só os válidos.
- `porNome(nome) → Player|undefined`, sem diferenciar maiúsculas.
- `outros(player) → Player[]`.
- `porId(id) → Player|undefined`.

### `scripts/core/forms.js` [core]: framework de menus
```js
export const FLAG = { BASE: "§v§u§l§p", HUB: "§v§u§l§p§0§r", LISTA: "§v§u§l§p§1§r" };
/** @typedef {{ texto: string, icone?: string, acao?: (p: import("@minecraft/server").Player) => any }} Botao */
export async function mostrar(player, form)   // ActionForm/ModalForm; repete enquanto UserBusy (chat aberto) a cada 10 ticks por até ~10 s; captura erro e retorna undefined; nunca lança
export class Hub {           // layout menu principal: SEMPRE 9 botões (0-7 colunas, 8 staff); vazios = ''
  titulo(t), texto(t), slot(indice, botao), staff(botao|undefined), async abrir(player) → boolean   // true se clicou em algo
}
export class Lista {         // layout lista; aceita cabecalho/rotulo/divisor; mapeia selection (só botões) para ação
  constructor(titulo), texto(t), botao(texto, icone?, acao?), cabecalho(t), rotulo(t), divisor(), voltar(acao),  // voltar = botão "Voltar" com ícone voltarNav no fim
  async abrir(player) → boolean
}
export async function confirmar(player, { titulo, texto, sim?, nao? }) → boolean   // Lista com 2 botões (ícones sim/nao); X = false
export async function perguntar(player, titulo, campos) → any[]|undefined         // ModalFormData vanilla
/* campos: {tipo:"texto", rotulo, dica?, padrao?} | {tipo:"numero", rotulo, padrao, min, max} (textField validado; inválido = mantém padrao)
           | {tipo:"alternar", rotulo, padrao} | {tipo:"lista", rotulo, opcoes:string[], padrao?:number} ; retorna valores já convertidos */
```
- O som `SONS.abrir` toca ao abrir o Hub e a Lista, se `ajustes.sons` estiver ligado.
- As ações rodam depois que o form fecha. Cada ação é chamada com try/catch, e um erro vira `erro(player, textos.ERRO_INTERNO)` mais `console.warn`.
- Navegação: toda função de submenu tem a assinatura `async (player, voltar?: () => any)`. O botão "Voltar" chama `voltar`. O X ou ESC encerra.
- `form.show()` não pode rodar em modo restrito. Os comandos já chegam via `system.run` (ver abaixo).

### `scripts/core/teleporte.js` [core]
- Tipo `Local = {x,y,z,d, rx?, ry?}`, onde `d` é `dimension.id` (ex.: "minecraft:overworld").
- `localDe(player) → Local`, com rotação.
- `teleportar(player, destino: Local | (() => Local|undefined), opcoes?)`:
  - `opcoes`: `{ nome?: string, semEspera?: boolean, salvarVoltar?: boolean (padrão true), tema?: "kitsune"|"casa"|"spawn"|"voltar"|"tpa", parceiro?: () => Player|undefined, aoChegar?: (p)=>void }`.
  - Bloqueios:
    - em combate (`config().combateSegundos`): erro e não teleporta;
    - recarga (`recargaTeleporte` desde o último teleporte): erro com os segundos restantes.
  - Espera (`esperaTeleporte` s):
    - contagem na actionbar com barrinha (glyphs) e os efeitos de `core/efeitos.js`;
    - cancela se andar mais de 0,6 bloco ou levar dano.
  - Staff pula a espera e a recarga.
  - No fim:
    - resolve o destino (uma função pode retornar undefined, o que cancela);
    - salva a origem em `dados.voltar` se `salvarVoltar`;
    - `player.teleport({x,y,z}, {dimension: world.getDimension(d), rotation: rx!=null?{x:rx,y:ry}:undefined, checkForBlocks:false, keepVelocity:false})`;
    - efeitos de saída e de chegada (`core/efeitos.js`) e mensagem de chegada.
  - Só uma espera por jogador: uma nova cancela a anterior.
- `emCombate(player) → boolean` e `marcarCombate(entity)`. O módulo assina `world.afterEvents.entityHurt` e marca combate quando um player apanha de uma entidade ou quando um player causa o dano.
- `emEspera(player) → boolean`, usado pela HUD para pausar.
- `cancelarEspera(player, motivo?)`.

### `scripts/core/efeitos.js` [efeitos]
Efeitos do teleporte, só com API estável (`Dimension.spawnParticle`, `MolangVariableMap`, `Player.playSound` com tom e volume, `Camera.fade`). Toda chamada ao jogo é protegida: um efeito que falhar vai para o log uma vez e o teleporte segue.
- Espera: `inicioEspera` (som de carga), `passoEspera` a cada 2 ticks (caudas de fogo em espiral; nasce uma cauda por segundo, de 2 a 5), `segundoEspera` (selo de fogo no chão e `note.chime` subindo de tom), `previaParceiro` (TPA: portalzinho nos pés de quem recebe a visita), `preparar` (fade da tela 4 ticks antes; sem espera, na hora).
- Teleporte: `saida` (rajada, anel de fogo e faíscas na origem; "puf" para quem está a até 16 blocos) e `chegada` (3 pulsos, em 4, 9 e 15 ticks: anel, coluna, título com `mostrarTitulo`, enfeite do tema e faíscas).
- `cancelado`: fumaça e `extinguish.candle`.
- Temas: `kitsune` (padrão), `casa` (corações e pétalas), `spawn` (anel dourado de 2 blocos, totem e sino), `voltar` (chamas e almas cinzentas, fade escuro), `tpa` (brilhos e coração; quem recebe ouve a chegada).
- Limite de 96 partículas por tick no servidor inteiro; sons passam por `som()` (respeitam `ajustes.sons`).
- Use ticks (`system.currentTick`) para tempos curtos.

### `scripts/core/comandos.js` [core]
- `registrarComando(def, handler)`:
  - `def = { nome:"menu", descricao, staff?:boolean, parametros?:[{nome, tipo:"jogador"|"texto"|"inteiro", opcional?:boolean}] }`.
  - Ele acumula numa lista. O módulo assina `system.beforeEvents.startup` UMA vez e registra tudo com `ev.customCommandRegistry.registerCommand(...)`, usando:
    - `name: "vulpus:"+nome`;
    - `permissionLevel: CommandPermissionLevel.Any`;
    - **`cheatsRequired: false`**, porque o padrão é true;
    - mandatory e optional parameters convertidos para `CustomCommandParamType.PlayerSelector`, `String` e `Integer`.
- No callback:
  - `const p = origin.sourceEntity`; se não for Player, retorna Failure;
  - se `def.staff` e não for staff, retorna `{status: Failure, message: textos.SO_STAFF}`;
  - senão, `system.run(() => handler(p, args))`, com try/catch, e retorna `{status: Success}`.
  - O PlayerSelector chega como array: entregue `jogadores[0]`.
- Os sistemas chamam `registrarComando` no topo do módulo, na importação.

### `scripts/textos/geral.js` [core]
- `PREFIXO = "§6Kiza §8» §r"`.
- `ERRO_INTERNO`, `SO_STAFF`.
- Mensagens de teleporte: espera, cancelado (andou, apanhou), combate, recarga e chegada.
- `JOGADOR_OFFLINE`.
- Sem emoji (a fonte não tem). Use símbolos BMP: •, », «, ✔, ✖, ★.

### `scripts/main.js` [core]
Importa nesta ordem:
1. `./core/comandos.js`;
2. `./core/teleporte.js`;
3. os sistemas: `./sistemas/menu.js`, `spawn.js`, `casas.js`, `voltar.js`, `tpa.js`, `caudas.js`, `perfil.js`, `ajustes.js`, `hud.js`, `regras.js`, `staff.js`, `boas_vindas.js`.

Mais nada.

### Exports que cada sistema DEVE oferecer (os outros importam)
- `sistemas/menu.js`:
  - `abrirMenu(player)`, que monta o Hub conforme a spec funcional. Slots:
    - 0 spawn: `irSpawn`;
    - 1 casas: `menuCasas(p, volta)`;
    - 2 tpa: `menuTpa(p, volta)`;
    - 3 voltar: `irVoltar`;
    - 4 caudas: `menuCaudas(p, volta)`;
    - 5 perfil: `menuPerfil(p, volta)`;
    - 6 ajustes: `menuAjustes(p, volta)`;
    - 7 regras: `menuRegras(p, volta)`;
    - 8 staff: `menuStaff(p, volta)`, só se `ehStaff`.
  - Comando `menu`.
  - Abertura pelo item: `world.afterEvents.itemUse` com `itemStack.typeId === ITEM_MENU`.
- `sistemas/spawn.js`: `irSpawn(player)`, `definirSpawn(player)` e os comandos `spawn` e `definirspawn` (staff).
  - Spawn: `lerMundo(CHAVE_SPAWN)`.
  - Se não houver, usa `world.getDefaultSpawnLocation()` no overworld. Se `y >= 32767`, usa `dimension.getTopmostBlock({x,z})` (+1). Se der undefined, erro "a staff ainda não definiu o spawn".
- `sistemas/casas.js`: `menuCasas(player, voltar?)` e os comandos `casa [nome]`, `definircasa <nome>` e `apagarcasa <nome>`.
- `sistemas/voltar.js`: `irVoltar(player)`, o comando `voltar`, e a assinatura de `entityDie` para player, que salva `voltar` = local da morte e `mortes++`.
- `sistemas/tpa.js`: `menuTpa(player, voltar?)`, `contarPedidos(player) → number` e os comandos `tpa <jogador>`, `tpaqui <jogador>`, `tpaceitar` e `tpanegar`.
  - Pedidos em memória.
  - Expiração via `runInterval`.
  - Limpar ao sair (`world.afterEvents.playerLeave`).
- `sistemas/caudas.js`:
  - `saldo(alvo)`, `adicionarCaudas(alvo, valor, motivo?) → number` (o novo saldo; não deixa ficar negativo), `menuCaudas(player, voltar?)` e `ranking(n) → {id,nome,caudas}[]`;
  - os comandos `caudas`, `diaria` e `darcaudas <jogador> <valor>` (staff);
  - o loop de tempo online e de ganho com anti-AFK, de 1 em 1 minuto, que também soma `dados.tempo`.
- `sistemas/perfil.js`: `menuPerfil(player, voltar?, alvoId?)` e o comando `perfil`.
- `sistemas/ajustes.js`: `menuAjustes(player, voltar?)` e `hudLigada(player) → boolean`.
- `sistemas/hud.js`: loop de 20 ticks que mostra a actionbar (usa `hudLigada`, `emEspera` e `saldo`).
- `sistemas/regras.js`: `menuRegras(player, voltar?)`.
- `sistemas/staff.js`: `menuStaff(player, voltar?)` e o comando `staff` (staff).
- `sistemas/boas_vindas.js`:
  - `garantirItem(player)`, que entrega o item se não houver um `ITEM_MENU` no inventário. O ItemStack recebe `lockMode = ItemLockMode.inventory`, `keepOnDeath = true` e a lore "Use para abrir o menu".
  - `world.afterEvents.playerSpawn` (initialSpawn): na primeira vez, preenche `primeira`, mostra o título de boas-vindas e entrega o item; nas outras, a actionbar "Que bom te ver de novo".
  - Também preenche `ultimaVez` e o comando `item`.
- Imports cruzados permitidos:
  - `menu.js` importa todos os sistemas;
  - os sistemas importam core, `caudas.saldo` e `ajustes.hudLigada`;
  - `staff.js` importa `spawn.definirSpawn`, `caudas.adicionarCaudas` e `boas_vindas.garantirItem`.
  - Evite ciclos: nenhum sistema importa `menu.js`, porque o `voltar` vem por parâmetro.

## Pacote (agente [pacote])
- `vulpus_bp/items/menu.json`, item `vulpus:menu`:
  - format_version moderno, que o agente confere em fonte atual (learn.microsoft.com ou bedrock-samples);
  - `menu_category` items;
  - `minecraft:icon` "vulpus_menu";
  - `minecraft:display_name` com a chave `item.vulpus:menu.name`;
  - `minecraft:max_stack_size` 1;
  - `minecraft:glint` true.
- RP `texts/languages.json` `["pt_BR","en_US"]`. `pt_BR.lang` e `en_US.lang` têm:
  - `item.vulpus:menu.name=§6Menu do Vulpus`;
  - `pack.name`;
  - `pack.description`.
- `package.json`:
  - `"type":"module"`, `private`;
  - devDependencies `@minecraft/server` 2.10.0, `@minecraft/server-ui` 2.2.0 e typescript ^5;
  - scripts:
    - `check`: tsc -p jsconfig.json;
    - `texturas`: python tools/gerar_texturas.py;
    - `verificar`: python tools/verificar_ui.py;
    - `build`: python tools/build.py;
    - `dev`: python tools/instalar_dev.py.
- `jsconfig.json`: `checkJs`, `strict` false (mas `noImplicitAny` false), `module`/`target` ES2022, `moduleResolution` "bundler", `include` `vulpus_bp/scripts/**/*.js`, `noEmit`.
- `tools/build.py`:
  - valida o parse de todos os .json dos packs em UTF-8;
  - roda `verificar_ui.py` se existir, sem falhar o build caso não ache o jogo instalado;
  - gera `dist/Vulpus_BP.mcpack`, `dist/Vulpus_RP.mcpack` e `dist/Vulpus.mcaddon`. O zip contém as pastas `vulpus_bp/` e `vulpus_rp/` na raiz, ou os dois .mcpack; escolha um formato que o Minecraft importe e documente.
- `tools/instalar_dev.py`:
  - acha com.mojang em `%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang` (GDK), com reserva em `%LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang`;
  - copia para `development_behavior_packs\Vulpus_BP` e `development_resource_packs\Vulpus_RP`;
  - apaga só essas duas pastas antes.
- `README.md`, em PT-BR para o dono (não programador):
  - o que é;
  - como testar: gerar e importar o .mcaddon ou usar o modo dev, criar o mundo e ativar os dois packs (sem experimentos), abrir com `/vulpus:menu` ou com o item;
  - como trocar a logo (substituir `vulpus_rp/textures/vulpus/ui/logo.png`, quadrada);
  - como criar um botão ou menu novo, com um exemplo curto do framework;
  - lista de comandos;
  - onde ver erros (Content Log em Configurações > Criador, e `%APPDATA%\Minecraft Bedrock\logs`);
  - checklist de teste no jogo, os 8 itens da pesquisa;
  - limitações: o ModalForm fica vanilla e é preciso conferir a UI a cada update do jogo.
- `.gitignore` da raiz do BotVulpus: acrescentar `addon/node_modules/` e `addon/dist/`.
