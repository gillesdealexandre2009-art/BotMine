# Addon Vulpus: especificação da fase 2 (fonte da verdade para implementar)

Estende as specs `01_spec_funcional.md` e `02_spec_tecnica.md`, que continuam valendo em tudo o que esta não muda.
- Pasta de trabalho: `<repo>\addon\` (`<repo>` = `C:/Users/gille/OneDrive/Desktop/BotVulpus/BotVulpus`).
- Versão do addon nesta fase: **0.2.0**.
- Escrita a partir do código real da fase 1 (commit `e8dd038`) e das pesquisas `chat-beta`, `ui-hud-glyph-tema` e `leilao`.

## 0. Regras para quem implementa

- Mexa só nos arquivos do seu papel (seção 2). Pastas temporárias ficam em `C:/Users/gille/vt` ou no scratchpad.
- Não toque no bot Python, nos mundos do usuário, no `git` (sem commit nem push) e não abra o Minecraft.
- Código no estilo da fase 1:
  - `// @ts-check` no topo, JSDoc, nomes em português e comentários curtos;
  - imports relativos com `.js`;
  - nada de `console.log`; erros com `registrarErro` (`core/util.js`);
  - sem código morto e sem `TODO`.
- Arquivos em UTF-8 sem BOM.
- Nos scripts, glyphs só como escape `\uE2xx` (nunca o caractere cru), e sempre pelas constantes de `glyphs.js`.
- Sem emoji. Símbolos BMP liberados: • » « ✔ ✖ ★.
- Textos em PT-BR, na voz da Kiza: leves, curtos e com gênero neutro. Nada de "bem-vindo/bem-vinda", "o jogador" etc.
- **Sem pay-to-win.** O booster Kitsune é só um glyph.
- Os 6 papéis trabalham ao mesmo tempo. Até a [integracao] rodar, o `npm run check` vai acusar só o que depende das chaves listadas na seção 12 (PADROES, ICONES, TAGs, campos novos de `DadosJogador`). **Isso é esperado.** Qualquer outro erro é seu.
- Verifique o próprio trabalho antes de terminar:
  - `node --check` em cada `.js` seu;
  - `python` nos `.py`;
  - parse dos `.json`;
  - os testes BDS pedidos no seu papel.

Ferramentas neste PC:
- No Bash: `export PATH="/c/Users/gille/vt/node:/c/Users/gille/vt/py:$PATH"` (o `python` do sistema é falso).
- Pillow 11.3, Node 22.
- BDS 1.26.52.3 em `C:/Users/gille/vt/bds`, com o script de exemplo `C:/Users/gille/vt/rodar_bds.js`.
- Mocks em `C:/Users/gille/vt/mock/`.
- Tipagens: estável em `C:/Users/gille/vt/ref/node_modules/@minecraft/*`, beta em `C:/Users/gille/vt/refbeta/node_modules/@minecraft/server` (2.11.0-beta.1.26.52-stable).

## 1. Arquitetura e fluxo de dados

```
                         ┌──────────────── vulpus_bp (estável 2.10.0 / ui 2.2.0) ────────────────┐
 minuto ativo (anti-AFK) │ caudas.js ──ganharXpMinutoAtivo──► niveis.js ──aoSubirNivel──► identidade.js
 diária                  │ caudas.js ──ganharXpDiaria───────► niveis.js                     │  nameTag 2 linhas
                         │                                       │ infoNivel                 │  scoreboard (canal)
                         │ hud.js (sidebar) ◄── saldo, infoNivel, hudLigada, tituloLivre ◄── core/tela.js
                         │   └─ setTitle(FLAG_SIDEBAR + linhas)                              │
                         │ leilao.js ──► leilao_armazem.js ──► estruturas do mundo (1 bloco por lote)
                         │   └─ adicionarCaudas / lerMundo / salvarMundo                     │
                         │ menu.js (Hub 10 slots) · ajustes.js (sidebar, tema) · staff.js · perfil.js
                         └───────────────────────────────────┬──────────────────────────────────┘
                                                             │ scoreboard + tags (únicos dados compartilhados)
                         ┌──────────── vulpus_chat_bp (BETA 2.11.0-beta) ────────────┐
                         │ world.beforeEvents.chatSend → lê canal → cancela → reenvia │
                         └────────────────────────────────────────────────────────────┘
 vulpus_rp: font/glyph_E2.png, glyph_E3.png · textures/vulpus/ui/{titulo, black/*} · ui/hud_screen.json + ui/vulpus/vulpus_hud.json · ui/vulpus/vulpus_menu.json (tema Black, Hub 10 slots)
```

- **Fonte da verdade de cada dado:**
  - XP, tema e sidebar ficam em `DadosJogador`, na propriedade dinâmica do mundo;
  - cargo vem das tags e do nível de permissão;
  - booster vem da tag `vulpus:kitsune`;
  - lotes do leilão ficam nas chaves `vulpus:ah:*` e nas estruturas `vulpus:ah_*`.
- **O canal com o chat** é só leitura para o pack do chat, e só o BP principal escreve nele. Propriedades dinâmicas são isoladas por pack e não servem para isso (medido no BDS).
- **Canais de tela:**
  - **title** é da sidebar, com flag. Títulos normais passam por `core/tela.js`;
  - **actionbar** fica livre para mensagens normais (teleporte, TPA, avisos).
  - A HUD de actionbar da fase 1 deixa de existir.

## 2. Papéis e donos dos arquivos

| Papel | Arquivos (só estes) |
|---|---|
| [glyphs] | `tools/gerar_glyphs.py`; `vulpus_rp/font/glyph_E2.png`, `glyph_E3.png`; `vulpus_rp/textures/vulpus/ui/titulo.png`; `vulpus_rp/textures/vulpus/ui/black/*` (PNG + `.json` de nineslice); `vulpus_chat_bp/pack_icon.png`; `vulpus_bp/scripts/glyphs.js`; `docs/previas/glyphs.png` (prévia ampliada com rótulos) |
| [ui] | `vulpus_rp/ui/**`: `_ui_defs.json`, `server_form.json` (só se precisar), `vulpus/vulpus_menu.json`, **novos** `hud_screen.json` e `vulpus/vulpus_hud.json`; `tools/verificar_ui.py` |
| [ranks] | `vulpus_bp/scripts/sistemas/niveis.js`, `sistemas/identidade.js`, `textos/niveis.js`; **edição mínima** de `sistemas/caudas.js` (só os 2 ganchos da seção 8.3) |
| [sidebar] | `vulpus_bp/scripts/sistemas/hud.js` (reescrito), `textos/hud.js` (reescrito), **novo** `core/tela.js` |
| [leilao] | `vulpus_bp/scripts/sistemas/leilao.js`, `sistemas/leilao_armazem.js`, `textos/leilao.js` (o desenho não usa entidade nem bloco próprio no BP) |
| [chat] | `vulpus_chat_bp/manifest.json`, `vulpus_chat_bp/scripts/**`; **novo** `jsconfig.chat.json` (na raiz do addon) |
| [integracao] (depois dos 6) | `config.js`, `core/db.js`, `core/forms.js`, `core/permissoes.js`, `main.js`, `sistemas/{menu,ajustes,staff,perfil,regras,boas_vindas}.js` e os `textos/` deles, manifests BP e RP, `vulpus_rp/texts/*`, `package.json`, `jsconfig.json`, `tools/build.py`, `tools/instalar_dev.py`, `README.md`, `docs/ESTADO.md` |

Ninguém além da [integracao] edita `config.js`, `db.js`, `forms.js`, `menu.js` e os outros arquivos da última linha. Programe contra o que a seção 12 promete.

## 3. Versões, manifests e UUIDs

**BP e RP**
- Sobem para `[0,2,0]`: `header.version`, versão dos módulos e versão nas dependências cruzadas.
- UUIDs, `@minecraft/server` 2.10.0 e `@minecraft/server-ui` 2.2.0 não mudam.
- Descrições:
  - BP: "Menu, sistemas e leilão do servidor Vulpus";
  - RP: "Visual do Vulpus: menu, scoreboard lateral e glyphs".
- `VERSAO = "0.2.0"`.

**Pack novo "Vulpus Chat"** (pasta `vulpus_chat_bp/`, UUIDs fixos, não trocar):

```json
{
  "format_version": 2,
  "header": {
    "name": "Vulpus Chat",
    "description": "Chat do servidor Vulpus (precisa do experimento APIs Beta)",
    "uuid": "64b4756c-363d-4186-9e22-e4716171d6a7",
    "version": [0, 2, 0],
    "min_engine_version": [1, 26, 50]
  },
  "modules": [
    { "type": "script", "language": "javascript", "uuid": "c313c16c-70c6-4955-aeb9-d4c0c6824224",
      "version": [0, 2, 0], "entry": "scripts/main.js" }
  ],
  "dependencies": [{ "module_name": "@minecraft/server", "version": "2.11.0-beta" }],
  "metadata": { "authors": ["KOPE"] }
}
```

- O chat **não depende** do BP nem do RP (sem uuid nas dependências).
- Sem o BP, o chat fica vanilla (seção 10.3). Sem o RP, os glyphs viram quadradinhos.
- A string beta vale **só** para a 1.26.52. No próximo update do jogo, a [integracao] troca a versão no manifest e o alias no `package.json` (seção 12).

## 4. Glyphs

### 4.1 Formato
- **Folhas** (confirmado no `font.brarchive` 1.26.52): a vanilla usa `glyph_00..D7`, `E0`, `E1` e `F9..FF`, então E2..F8 estão livres. Usamos:
  - **E2**: ícones, folha de 512×512 px com células de 32 px (arte de até 16×16 no meio da célula);
  - **E3**: título, folha de 512×512 px com células de 32 px.
- **Código** = `0xE200 + linha*16 + coluna` (ex.: linha 1, coluna 0 = `\uE210`).
- **Posição na célula:**
  - a arte fica **encostada à esquerda** (x = 0) e centralizada na vertical;
  - o resto da célula fica transparente;
  - a largura que o jogo usa vai até a última coluna com pixel não transparente.
  - Nas fatias do título, ponha um pixel de alfa ~8 % na coluna 0 e na última coluna da fatia (truque da wiki), para a largura ficar exata.
- **Tamanho na tela** (corrigido depois do teste no jogo): o Bedrock desenha a célula de glyph com 16 px de GUI, o dobro da célula de 8 px da letra, qualquer que seja a resolução da folha. Na folha de 256 (células de 16) os ícones saíram com ~2× a altura da letra. Com células de 32 e a arte de 16 px centrada na vertical (como os ícones da vanilla em `glyph_E0`: arte de 14 a 16 px nas linhas 8..24 da célula de 32), cada pixel de arte vale 0,5 px de GUI e o ícone fica da altura da letra (8 px de GUI; a maiúscula tem 7).
- **Cor:** códigos § tingem o glyph (multiplicativo, a testar). Para manter as cores originais, sempre use `glyph(c)`, que devolve `"§f" + c + "§r"`. Depois dele, ponha de novo a cor do texto.
- **Onde funcionam:** chat, nameTag, scoreboard/title/actionbar, labels de JSON UI com `font_type` padrão, nome e lore de item.
- **Onde NÃO usar:**
  - títulos e cabeçalhos do menu (`font_type: MinecraftTen`, provavelmente sem fallback para PUA). Ou seja, nunca em `Lista(titulo)`, `Hub.titulo()`, `Lista.cabecalho()`;
  - telas Ore UI.
- **Estilo:** pixel art no estilo da logo de raposa (`gerar_texturas.py`):
  - contorno escuro de 1 px (`CONTORNO` #341A0C);
  - paleta Vulpus: laranja #F28C38, laranja escuro #C4621A, brasa #7A3A10, creme #FFF4E6;
  - luz no canto de cima à esquerda.

### 4.2 Tabela fixa de códigos

| Código | Nome (`G.`) | Arte (16×16 salvo indicação) | Uso |
|---|---|---|---|
| `\uE200` | `BROTO` | broto verde (#5DBB3F/#3E8A2A) de 2 folhas sobre um montinho de terra marrom | rank 0 Filhote |
| `\uE201` | `RAPOSA` | cabeça de raposa de frente, laranja, orelhas pontudas com miolo brasa, focinho creme e olhos escuros (a logo em miniatura) | rank 1 Raposinha |
| `\uE202` | `FOLHA` | folha de outono laranja/vermelha (#E2552B) com nervura brasa e cabinho | rank 2 Raposa Andarilha |
| `\uE203` | `LUA` | lua crescente creme com sombra azul-clara (#9FC7E8) e 2 estrelinhas de 1 px | rank 3 Raposa Lunar |
| `\uE204` | `BRILHO` | brilho de 4 pontas dourado (#FFD34D/#E0A100) com miolo branco | rank 4 Raposa de Nove Caudas |
| `\uE205` | `ADMIN` | coroa dourada de 3 pontas com 3 joias vermelhas | cargo Admin |
| `\uE206` | `STAFF` | escudo laranja com borda brasa e faixa creme na diagonal | cargo Staff |
| `\uE207` | `HELPER` | estrela de 5 pontas verde-água (#4FE0B0) com brilho branco | cargo Helper |
| `\uE208` | `KITSUNE` | chama de raposa (kitsunebi) rosa (#F47FFF/#B84FD0) com miolo branco | booster (só cosmético) |
| `\uE210` | `CAUDAS` | moeda dourada com uma cauda de raposa creme gravada | moeda |
| `\uE211` | `NIVEL` | losango verde (orbe de XP, #7CFC4A/#3FA81E) com seta creme para cima | nível |
| `\uE212` | `BARRA_CHEIA` | segmento de 6×14 px (linhas 9..22 da célula de 32 = 3×7 px de GUI, a altura da maiúscula), laranja com a linha de cima laranja-claro e contorno brasa; os segmentos encostam e formam a barra | barra de nível |
| `\uE213` | `BARRA_VAZIA` | segmento de 6×14 px, fundo #3A2A22 com contorno #8A5A36 | barra de nível |
| `\uE214` | `ONLINE` | duas silhuetas de cabeça e ombros, creme e creme-sombra | online |
| `\uE215` | `LOCAL` | pino de mapa laranja com furo creme | coordenadas |
| `\uE216` | `TEMPO` | ampulheta creme com areia laranja | tempo / expira |
| `\uE220` | `LEILAO` | martelo de leilão: cabo marrom e cabeça dourada | leilão |
| `\uE221` | `VENDER` | etiqueta de preço laranja com furinho e barbante | vender |
| `\uE222` | `COMPRAR` | sacola marrom com alça | comprar |
| `\uE223` | `CAIXA` | baú pequeno marrom com fecho dourado | caixa de retirada |
| `\uE224` | `BUSCA` | lupa (aro creme, cabo brasa) | busca |
| `\uE225` | `HISTORICO` | pergaminho creme com linhas brasa | histórico |
| `\uE226` | `ENCANTADO` | brilho roxo (#B26BFF) de 3 pontos | item encantado |
| `\uE300`..`\uE304` | `TITULO` (os 5 juntos) | "VULPUS" reduzido da mesma arte do `titulo.png` para 95×20, cortado em 5 fatias de 19 px, cada uma numa célula de 32 px da folha E3 (y = 6..25): 10 px de GUI, ~1,4× a maiúscula | só no chat (seção 4.4) |

As células E2 que não estão na tabela ficam transparentes. Uma folha só pode ganhar código novo numa célula livre; código existente nunca muda.

### 4.3 `vulpus_bp/scripts/glyphs.js` [glyphs]
```js
// @ts-check
// Códigos dos glyphs do RP (font/glyph_E2.png e glyph_E3.png). Tabela fixa: docs/spec/03_spec_fase2.md §4.2.
export const G = Object.freeze({
  BROTO: "\uE200", RAPOSA: "\uE201", FOLHA: "\uE202", LUA: "\uE203", BRILHO: "\uE204",
  ADMIN: "\uE205", STAFF: "\uE206", HELPER: "\uE207", KITSUNE: "\uE208",
  CAUDAS: "\uE210", NIVEL: "\uE211", BARRA_CHEIA: "\uE212", BARRA_VAZIA: "\uE213",
  ONLINE: "\uE214", LOCAL: "\uE215", TEMPO: "\uE216",
  LEILAO: "\uE220", VENDER: "\uE221", COMPRAR: "\uE222", CAIXA: "\uE223",
  BUSCA: "\uE224", HISTORICO: "\uE225", ENCANTADO: "\uE226",
  TITULO: "\uE300\uE301\uE302\uE303\uE304",
});
/** Glyph com as cores originais: "§f" + codigo + "§r". @param {string} codigo */
export function glyph(codigo) {}
/**
 * Barra de progresso: round(fracao*segmentos) BARRA_CHEIA + o resto BARRA_VAZIA, já com "§f…§r".
 * fracao fora de 0..1 é limitada. @param {number} fracao @param {number} [segmentos] padrão 10
 */
export function barra(fracao, segmentos = 10) {}
```

### 4.4 Título VULPUS
- **Textura `textures/vulpus/ui/titulo.png`, 130×28 exatos** (RGBA):
  1. O `gerar_glyphs.py` lê `<repo>/IMGS/minecraft_title.png` (1012×210), detecta o tamanho do pixel de arte (~15,6 px) e amostra o centro de cada pixel de arte (NEAREST), chegando à arte nativa (~65×14).
  2. Amplia 2× e encaixa em 130×28: centraliza, o que sobra fica transparente e nunca há distorção.
- **Usos:**
  - Hub, no lugar do texto do título: [ui];
  - topo da sidebar: [ui];
  - no chat, só via `G.TITULO`, na mensagem de primeira entrada ([integracao], `textos/boas_vindas.js`).
- **Plano B:** se o teste no jogo mostrar vãos feios entre as 5 células, a [integracao] troca `G.TITULO` nessa mensagem por `§6§lVULPUS§r`.
- O `gerar_glyphs.py` usa a mesma proteção do `gerar_texturas.py` (assinatura + `--forcar`). Importe as funções de lá (`caixa`, `pixel_art`, `linhas_de`, `espelhar`, `contornar`, `ampliar`, `salvar_png`, `salvar_json`, `rgba` e as cores) sem editar o arquivo.

## 5. Texturas novas [glyphs]

**Tema Black**
- Pasta `vulpus_rp/textures/vulpus/ui/black/`, com os mesmos nomes, tamanhos e `nineslice_size` das laranja (spec 02):
  - `painel` 32×32 ns 8;
  - `cabecalho` 32×16 ns 4;
  - `botao`, `botao_hover` e `botao_press` 16×16 ns 4;
  - `fechar`, `fechar_hover` e `fechar_press` 16×16;
  - `divisor` 32×2.
- Paleta Black:
  - fundo #101010, fundo claro #1C1C1C e sombra #080808;
  - borda e brilho em laranja #F28C38 e laranja escuro #C4621A.
- Peças:
  - **painel:** preto, borda laranja de 2 px e cantos recortados;
  - **cabecalho:** preto com uma linha laranja de 2 px embaixo;
  - **botao:** #1C1C1C com borda laranja escuro;
  - **botao_hover:** fundo #2A1A0E com borda laranja;
  - **botao_press:** laranja escuro afundado;
  - **fechar:** X creme sobre #1C1C1C, X laranja no hover e laranja escuro no press;
  - **divisor:** laranja suave.
- A logo e as cores de texto (creme) são as mesmas nos dois temas.

**Outros**
- `vulpus_chat_bp/pack_icon.png`: 256×256, o emblema do `pack_icon` com um balão de fala creme no canto inferior direito.
- `docs/previas/glyphs.png`: folha E2 ampliada 4×, com o código embaixo de cada glyph, mais o título e as peças Black.

## 6. JSON UI [ui]

### 6.1 Flags e tokens (todas UTF-8 sem BOM, só códigos § válidos)

| Constante | Valor | Onde | Canal |
|---|---|---|---|
| `FLAG.BASE`, `FLAG.HUB`, `FLAG.LISTA` | iguais à fase 1 | `core/forms.js` | `#title_text` do server form |
| `FLAG.TEMA_BLACK` | `§v§b§r` | `core/forms.js` (a [integracao] acrescenta) | vem logo depois da flag HUB/LISTA no título do form |
| `FLAG_SIDEBAR` | `§v§s§b§r` | `sistemas/hud.js` (export) | `#hud_title_text_string` da HUD |

- O título de um form fica `FLAG.HUB|FLAG.LISTA` + (`FLAG.TEMA_BLACK` se o tema for Black) + texto.
- `§v§b§r` não contém `§v§u§l§p` e não está contido em `HUB`/`LISTA`.
- **`verificar_ui.py`:**
  - trata `TEMA_BLACK` como token: não começa com BASE, termina em `§r`, não contém nem está contido nas flags;
  - lê `FLAG_SIDEBAR` de `sistemas/hud.js` e confere que é idêntica à do JSON;
  - toda flag e todo token do JSON existe no JS, e vice-versa.

### 6.2 Tema Black (viável: variantes por instância)

> **Substituído em 2026-10-04:** com 5 temas, o root passou a ter só `hub` e `lista`, e cada peça de tema virou um grupo de 5 imagens com gate pelo título (custo e motivo em `docs/ESTADO.md`, "Temas do painel"). O texto abaixo é o desenho original do Black.
- As `$vars` são estáticas (resolvidas no load), então não dá para trocar textura por binding. Concatenar textura com `'' + #x` já crashou o cliente.
- **Solução:** o `root` instancia 4 variantes do mesmo template:
  - `hub_laranja` e `lista_laranja` sem override, usando os `|default` atuais;
  - `hub_black` e `lista_black`, que passam `$vp_painel`, `$vp_cabecalho`, `$vp_botao*`, `$vp_fechar*` e `$vp_divisor` com `textures/vulpus/ui/black/*`.
- A Lista já repassa os `$vp_*` por `factory_variables`, então as células herdam o tema sem mudança.
- Gates (só `not`, `and`, `-`, `=`). "Contém X" = `(not ((#title_text - X) = #title_text))`:
  - **hub_laranja:** contém HUB e não contém TEMA_BLACK;
  - **hub_black:** contém HUB e contém TEMA_BLACK;
  - **lista_laranja e lista_black:** a regra atual da lista (contém BASE e não contém HUB), mais "não contém" ou "contém" TEMA_BLACK.
- O label `titulo` também remove `'§v§b§r'`.
- Mantenha o `property_bag {"#visible": false}` nas 4 variantes, para não piscar.
- **Custo aceito:** ~2× controles por server form, porque as duas variantes do layout ativo constroem as células. A alternativa (duas imagens por slot com `#visible`) é pior: ~33 imagens e ~66 bindings por frame.
- O ModalFormData continua vanilla nos dois temas.
- Plano B, se o teste no jogo mostrar lag ou erro: só o laranja. O botão de tema sai dos Ajustes, e o campo `tema` continua no `DadosJogador` sem efeito.

### 6.3 Hub com 10 slots e título em imagem
- Mapa de slots (contrato com `forms.js`/`menu.js`):

| Coluna | Slots |
|---|---|
| esquerda | 0 Spawn, 1 Casas, 2 TPA, 3 Voltar, 4 Perfil |
| direita | 5 Caudas, 6 Leilão, 7 Nível, 8 Ajustes, 9 Regras |
| canto | **10 Staff** (a coroa), no lugar do antigo 8 |

- A coluna continua com 151 px: 5 slots de **27 px** e 4 gaps de **4 px**.
- O rótulo do slot fica com `max_size` `[100% - 28px, 25]` (2 linhas). O ícone continua 18×18.
- O foco (`$foco_*`) liga cada slot ao vizinho da outra coluna na mesma linha.
- **Título do Hub:** o label de texto fica escondido no Hub, e no lugar entra a imagem `$vp_titulo` (`textures/vulpus/ui/titulo`, `|default` no `root`), com 97×21, centralizada na faixa do cabeçalho.
- A Lista continua com título em texto.

### 6.4 Scoreboard lateral (HUD)
- **Arquivos:**
  - `vulpus_rp/ui/hud_screen.json` (namespace `hud`, só `modifications`);
  - `vulpus_rp/ui/vulpus/vulpus_hud.json` (namespace `vulpus_hud`);
  - acrescentar `"ui/vulpus/vulpus_hud.json"` em `_ui_defs.json`.
- **Ponto de partida obrigatório:** o rascunho validado do apêndice A, também em `<SCR-sessão>/sidebar/` = `C:/Users/gille/AppData/Local/Temp/claude/c--Users-gille-OneDrive-Desktop-BotVulpus-BotVulpus/e8021101-1222-4304-9bca-2835389448b2/scratchpad/sidebar/`.
- **Ganchos:**
  1. `root_panel.controls` insert_back `vulpus_sidebar@vulpus_hud.sidebar`;
  2. `hud_title_text.bindings` insert_back o binding que esconde o title vanilla quando ele contém `FLAG_SIDEBAR`. Como `hud_title_text` não herda nada, isso não sombreia array herdado.
- Proibido mexer em `hud_actionbar_text*` e usar `$var` dentro de `modifications`.
- **Técnica "Preserve Title Texts":**
  - o painel `dados` guarda o último title **com a flag** em `#preserved_text` (`binding_condition: visibility_changed`);
  - titles sem flag não mexem nele;
  - há duas cópias de `dados`: `dados_visivel` (irmã, nunca escondida, decide a visibilidade da caixa via `resolve_sibling_scope`) e `dados_texto` (dentro do label);
  - texto exibido = `#preserved_text - FLAG_SIDEBAR`; a caixa aparece se isso não for `''`.
- **Visual:**
  - âncora `right_middle`, offset `[-4, 0]`, `layer` 20;
  - fundo nineslice `textures/vulpus/ui/painel` com `100%sm + 12px` × `100%sm + 10px` e alpha 0.9;
  - por cima, a imagem `textures/vulpus/ui/titulo` com 65×14;
  - 4 px de espaço e depois o label;
  - o label usa `font_type: "default"`, `localize: false`, sombra, cor branca, `max_size [140, 160]` e alinhamento à esquerda.
- A sidebar usa sempre o tema laranja (seção 15).
- **`verificar_ui.py`:**
  - estender para os 2 arquivos novos (referências, variáveis, texturas, expressões);
  - guardar o hash do `hud_screen.json` vanilla 1.26.52: `f3f23990abf0fec947e4e5b490729e3718eb424ad63a56462cd8ac6eec3fcbf6`, e avisar se mudar;
  - conferir os ganchos permitidos do namespace `hud` (`root_panel` → controls, `hud_title_text` → bindings);
  - conferir que o Hub tem `collection_index` 0..10 sem repetição;
  - conferir `FLAG_SIDEBAR` e `TEMA_BLACK` (6.1);
  - continuar com 0 erros no estado final (depois da [integracao]).

## 7. Protocolo da sidebar [sidebar]

### 7.1 Texto
`player.onScreenDisplay.setTitle(FLAG_SIDEBAR + linhas.join("\n"), { fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20 })`

| # | Linha (montada em `textos/hud.js`) | Exemplo |
|---|---|---|
| 0 | só com cargo (`cargoDe`/`CARGOS` de `identidade.js`, a regra do nameTag): `glyph(cargo.glyph) + " " + cargo.cor + cargo.nome` [+ `" " + glyph(G.KITSUNE)`] | (coroa) Admin (chama) |
| 1 | `glyph(rank.glyph) + " " + rank.cor + rank.nome` [+ Kitsune, quando não há a linha 0] | (lua) Raposa Lunar |
| 2 | `§7Nível §f{nivel} §8• §7{pct}%` (pct = floor(fracao*100)) | Nível 17 • 42% |
| 3 | `barra(fracao, 10)` | ■■■■□□□□□□ |
| 4 | `glyph(G.CAUDAS) + " §6{caudas}"` + ` §a+N` ou ` §c-N` por 3 s depois de mudar | (moeda) 1.250 +5 |
| 5 | `glyph(G.ONLINE) + " §f{n} §7online"` | (pessoas) 7 online |
| 6 | `glyph(G.LOCAL) + " §f{x} {y} {z} §7{dir}"` (inteiros, `direcao()` de util) | (pino) 120 64 -30 NE |

- No máximo 7 linhas (6 sem cargo) e 28 caracteres visíveis por linha (sem contar códigos §). O label tem `max_size` 160 de altura: 7 linhas de 10 px cabem.
- O texto inteiro tem menos de 400 caracteres e usa números com `formatarNumero`.
- O título VULPUS é a imagem do JSON e não vai no texto.
- **Desligar:** `setTitle(FLAG_SIDEBAR)` só com a flag, o que faz a caixa sumir. Nunca `setTitle('')`.

### 7.2 Envio
- Loop `system.runInterval` a cada **10 ticks**. Para cada jogador online:
  1. calcula `ligada = hudLigada(player)` (ajustes.js; vale o `hudPadrao` se o jogador não escolheu);
  2. se `!tituloLivre(player)` (tela.js), não envia nada nesse ciclo, para não cortar um título normal;
  3. ligada e texto diferente do último enviado, com pelo menos 20 ticks desde o último envio → envia;
  4. ligada e 200 ticks (10 s) sem envio → reenvia o mesmo texto. Isso recupera um rebuild do HUD, como trocar o GUI scale; o mesmo texto não pisca;
  5. passou de ligada para desligada → envia só a flag, uma vez.
- No `playerSpawn`:
  - initialSpawn: primeiro envio depois de 40 ticks (cliente carregando);
  - respawn: força reenvio.
- `playerLeave` limpa os mapas.
- A sidebar **não pausa** na espera de teleporte, que usa a actionbar (canal diferente). Parado, o texto nem muda.
- O "+N" vem da diferença de saldo entre ciclos (como o `mudancaRecente` atual) e dura 60 ticks.
- `caudas.js` continua mostrando `GANHO_TEMPO_BARRA` na actionbar só quando a sidebar está desligada (comportamento atual de `hudLigada`).
- **Limitação conhecida:** existe um slot de title só. Um `/title` disparado fora do addon pode ser cortado por um envio da sidebar.

### 7.3 `core/tela.js` [sidebar]
```js
/**
 * Título "normal" (não sidebar). Marca o jogador como ocupado até entrada+fica+saída (ticks),
 * para a sidebar não cortar. Todo título do addon passa por aqui.
 * @param {Player} player
 * @param {string} titulo
 * @param {{ subtitulo?: string, entrada?: number, fica?: number, saida?: number }} [opcoes]  padrão 10/70/20
 */
export function mostrarTitulo(player, titulo, opcoes) {}
/** Se nenhum título normal está na tela. @param {Player} player @returns {boolean} */
export function tituloLivre(player) {}
```
`tela.js` limpa o jogador no `playerLeave` e não importa sistemas.

### 7.4 `sistemas/hud.js` (reescrito)
- Export único: `export const FLAG_SIDEBAR = "§v§s§b§r";`.
- `pausarHud` deixa de existir. A [integracao] tira o import de `boas_vindas.js`.
- Imports: `ajustes.hudLigada`, `caudas.saldo`, `niveis.infoNivel`, `identidade.CARGOS/cargoDe/ehKitsune`, `tela.tituloLivre`, `glyphs`, `jogadores.online`, `util`.
- `textos/hud.js` exporta `LINHAS(info) → string[]`, com `info = { rank, cargo, kitsune, nivel, fracao, caudas, mudanca, online, x, y, z, direcao }` (`cargo` = `CARGOS[cargoDe(player)]` ou `null`; `kitsune` = `ehKitsune(player)`).

## 8. Níveis, ranks, cargos e identidade [ranks]

### 8.1 Ranks e fórmula (iguais ao Discord, `../config.py`)

| índice | nível mínimo | nome | glyph | cor |
|---|---|---|---|---|
| 0 | 0 | Filhote | `G.BROTO` | `§a` |
| 1 | 5 | Raposinha | `G.RAPOSA` | `§6` |
| 2 | 10 | Raposa Andarilha | `G.FOLHA` | `§e` |
| 3 | 15 | Raposa Lunar | `G.LUA` | `§b` |
| 4 | 20 | Raposa de Nove Caudas | `G.BRILHO` | `§d` |

**Fórmula**
- XP para subir **do nível n para o n+1**: `5n² + 50n + 100`.
- Guardamos o **XP total** (`dados.xp`), e o nível é calculado: começa no 0 e vai descontando enquanto der. Teto: nível 1000, XP 1e9.
- Conferência:
  - nível 5 = 1.150 XP (~6,4 h ativas a 3 XP/min);
  - nível 20 = 23.850 XP (~132 h).

**Ganho de XP**
- `xpPorMinuto` (3) por **minuto ativo**, com o mesmo anti-AFK das Caudas, sem duplicar a lógica (8.3).
- `xpDiaria` (15) ao pegar a diária.
- Nada mais dá XP nesta fase. Booster não multiplica.

**Ao subir de nível** (só online)
- Mensagem `ok()` com "Subiu para o nível N!".
- Som `SONS.nivel`.
- Se o rank mudou:
  - `mostrarTitulo(player, glyph + " " + cor + nome, { subtitulo: "Você virou " + nome + "!" })`;
  - `world.sendMessage(PREFIXO + "Fulano virou Raposa Lunar! A toca comemora.")`.
- Os ouvintes de `aoSubirNivel` são chamados. A identidade usa isso para atualizar o nameTag.

### 8.2 Cargos e booster

| Cargo | Regra (a primeira que valer) | glyph | cor | código no canal |
|---|---|---|---|---|
| `admin` | `playerPermissionLevel === Operator` ou tag `vulpus:admin` | `G.ADMIN` | `§c` | 3 |
| `staff` | tag `vulpus:staff` ou `commandPermissionLevel >= GameDirectors` | `G.STAFF` | `§6` | 2 |
| `helper` | tag `vulpus:helper` | `G.HELPER` | `§a` | 1 |
| (nenhum) | — | glyph do rank | cor do rank | 0 |

- **Helper é só selo:** não ganha poder de staff (`ehStaff` não muda para helper).
- **Admin conta como staff:** a [integracao] acrescenta `TAG_ADMIN` em `ehStaff`.
- **Booster:** tag `vulpus:kitsune`. Só acrescenta `glyph(G.KITSUNE)` depois do selo. Nada de vantagem.
- **Prefixo** (nameTag e chat): o cargo, quando há, **substitui** o rank. O nível aparece sempre.

### 8.3 Ganchos em `caudas.js` (única edição permitida, [ranks])
1. Import: `import { ganharXpDiaria, ganharXpMinutoAtivo } from "./niveis.js";`.
2. Em `checarPresenca`:
   - guarde `const ativo = seMexeu(antes, player);`;
   - use `ativo` no cálculo de `ativos`;
   - logo depois de somar `d.tempo`: `if (ativo) ganharXpMinutoAtivo(player);`.
3. Em `resgatarDiaria`, logo depois de `adicionarCaudas(player, premio)`: `ganharXpDiaria(player);`.

Nada mais muda em `caudas.js`. `niveis.js` **não** importa `caudas.js`, `hud.js` nem `identidade.js` (sem ciclos).

### 8.4 nameTag sobre a cabeça
```
linha 1: glyph(seloGlyph) + " " + cor + nomeCargoOuRank + " §7Nv " + nivel [+ " " + glyph(G.KITSUNE)]
linha 2: "§f" + player.name
nameTag = linha1 + "\n" + linha2
```
- Escrito por `atualizarIdentidade(player)` só quando mudou.
- **Quando atualizar:**
  - no initialSpawn (depois de 20 ticks);
  - no respawn;
  - em `aoSubirNivel`;
  - depois de `/vulpus:cargo` e `/vulpus:kitsune`;
  - numa varredura a cada **600 ticks** (pega `/tag` e mudanças de op feitas fora do addon).

### 8.5 Canal compartilhado BP → chat (formato exato, versão 1)

| Objective (`world.scoreboard`) | Participante | Valor |
|---|---|---|
| `vulpus_canal` | jogador falso `"#versao"` | `1` (formato do canal) |
| `vulpus_nivel` | a entidade Player | nível (0..1000) |
| `vulpus_rank` | a entidade Player | índice do rank (0..4) |
| `vulpus_cargo` | a entidade Player | 0 nenhum, 1 helper, 2 staff, 3 admin |
| tag `vulpus:kitsune` | a entidade Player | booster ativo |

- **Criação:** `identidade.js` cria os objectives no `world.afterEvents.worldLoad`, com `getObjective(id) ?? addObjective(id, nome)`. Nomes de exibição: "Vulpus canal", "Vulpus nível", "Vulpus rank" e "Vulpus cargo". Também grava `#versao = 1`.
- **Escrita:** só o BP, em `atualizarIdentidade`, com `setScore` só quando `getScore` for diferente.
- **Leitura:** nenhum display slot é usado. O pack do chat só lê.
- Mudar o formato exige `#versao = 2` e atualizar os dois packs.

### 8.6 Contratos

`sistemas/niveis.js`:
```js
/** @typedef {{ indice: number, nivelMinimo: number, nome: string, glyph: string, cor: string }} Rank */
/** @typedef {{ xp: number, nivel: number, xpNoNivel: number, xpParaProximo: number, fracao: number,
 *              rank: Rank, proximoRank: Rank | undefined }} InfoNivel */
export const RANKS;                                   // Rank[] congelado, tabela 8.1
/** @param {number} nivel @returns {number} 5n² + 50n + 100 */ export function xpParaSubir(nivel) {}
/** @param {number} xp total @returns {{ nivel: number, xpNoNivel: number, xpParaProximo: number }} */ export function nivelDeXp(xp) {}
/** @param {number} nivel @returns {Rank} */ export function rankDoNivel(nivel) {}
/** Vale para offline (id). @param {Player | string} alvo @returns {InfoNivel} */ export function infoNivel(alvo) {}
/** Soma XP (inteiro ≥ 0), salva e, se subir de nível com o jogador online, avisa e dispara aoSubirNivel.
 *  @param {Player | string} alvo @param {number} quantidade @returns {InfoNivel} o novo estado */ export function ganharXp(alvo, quantidade) {}
/** Chamado por caudas.js uma vez por minuto ativo: ganharXp(player, config().xpPorMinuto). @param {Player} player */ export function ganharXpMinutoAtivo(player) {}
/** Chamado por caudas.resgatarDiaria: ganharXp(player, config().xpDiaria) + msg curta "+15 XP". @param {Player} player */ export function ganharXpDiaria(player) {}
/** @param {(player: Player, antes: InfoNivel, depois: InfoNivel) => void} fn */ export function aoSubirNivel(fn) {}
/** Top n por XP, inclusive offline. @param {number} n @returns {{ id: string, nome: string, nivel: number, xp: number }[]} */ export function rankingNivel(n) {}
/** Menu "Nível": rank, nível, barra, XP, próximo rank; botões Ranks, Ranking de nível, Como ganhar XP, Voltar.
 *  @param {Player} player @param {() => any} [voltar] @param {string} [alvoId] */ export async function menuNivel(player, voltar, alvoId) {}
```
Comando: `nivel [jogador]` (abre `menuNivel`; `null` = `JOGADOR_OFFLINE`).

`sistemas/identidade.js`:
```js
/** @typedef {"admin" | "staff" | "helper"} Cargo */
export const CARGOS;  // { admin: { nome: "Admin", glyph: G.ADMIN, cor: "§c", codigo: 3 }, staff: {…"Staff", G.STAFF, "§6", 2}, helper: {…"Helper", G.HELPER, "§a", 1} }
/** @param {Player} player @returns {Cargo | null} */ export function cargoDe(player) {}
/** @param {Player} player @returns {boolean} tag vulpus:kitsune */ export function ehKitsune(player) {}
/** Selo do prefixo (glyph do cargo ou do rank, + kitsune), com §f…§r. @param {Player} player @returns {string} */ export function selo(player) {}
/** nameTag (8.4) + canal (8.5), só o que mudou. @param {Player} player */ export function atualizarIdentidade(player) {}
/** Lista online → escolher cargo (Admin/Staff/Helper/Nenhum) e alternar Kitsune. Só admin muda cargo; staff alterna Kitsune.
 *  @param {Player} player @param {() => any} [voltar] */ export async function menuCargos(player, voltar) {}
```
- **Comandos:**
  - `cargo <jogador> <cargo>` (staff no registro; só **admin** efetiva; cargo = `admin|staff|helper|nenhum`);
  - `kitsune <jogador>` (staff; alterna a tag).
- **Regras do `cargo`:**
  - mexe só nas tags `vulpus:admin`, `vulpus:staff` e `vulpus:helper`, deixando uma só;
  - um alvo operador continua admin, e a mensagem avisa;
  - ninguém tira o próprio admin.

`textos/niveis.js` [ranks]: todos os textos de `niveis.js` e `identidade.js`.

## 9. Leilão [leilao]

### 9.1 Regras e valores (configuráveis pela staff, seção 12)

| Regra | Padrão | Detalhe |
|---|---|---|
| Taxa de anúncio | `taxaAnuncioPct` 1 | `max(1, ceil(preco*pct/100))` se pct > 0; senão 0. Cobrada ao anunciar e **não volta** |
| Taxa de venda | `taxaVendaPct` 5 | `taxa = floor(preco*pct/100)`; o vendedor recebe `preco - taxa`. A taxa some da economia |
| Preço | `precoMinimo` 1 .. `precoMaximo` 1.000.000 | inteiro, `/^\d{1,7}$/` (depois de tirar `.` e espaços) e `Number.isSafeInteger` |
| Anúncios por jogador | `anunciosPorJogador` 5 | ativos ao mesmo tempo |
| Duração | `duracaoAnuncioHoras` 48 | depois o lote vai para a caixa do vendedor e **nunca é apagado** |
| Caixa de retirada | `caixaLimite` 54 | itens na caixa. Cheia bloqueia anunciar e comprar, nunca apaga |
| Leilão aberto | `leilaoLigado` true | fechado: não anuncia nem compra, mas a caixa sempre funciona |
| Teto global | `LIMITE_LOTES` 1000 (constante) | ativos + caixa + conferir, no mundo todo |

- **O que não vai para o leilão:** `ITEM_MENU`, item com `lockMode !== ItemLockMode.none` e vendedor em modo Criativo ou Espectador.
- **Outras proibições:** comprar o próprio anúncio. O preço não muda depois de anunciado (para mudar, cancela e anuncia de novo).
- **Venda de pilha:** o item da mão vai inteiro. Para vender menos, separe no inventário antes.
- **Ajuda de preço:** **mediana** do preço por unidade das últimas 10 vendas do mesmo `typeId`. Ficam de fora itens encantados, renomeados e shulkers com conteúdo. Só aparece com 3 vendas ou mais.

### 9.2 Telas (Lista do framework; glyphs só no corpo e nos botões)
- **Leilão:** o corpo mostra:
  - saldo;
  - anúncios ativos x/5;
  - caixa com N itens e X Caudas;
  - um aviso se estiver fechado.

  Botões:
  - Comprar;
  - Vender item da mão;
  - Meus anúncios (x/5);
  - Caixa de retirada (N);
  - Histórico;
  - (staff) Staff: anúncios;
  - Voltar.
- **Comprar:**
  - Categorias: Tudo, Blocos, Ferramentas, Armas, Armaduras, Comida, Poções, Livros encantados, Shulkers, Outros, mais "Buscar" (`perguntar` texto).
  - Página: 8 anúncios por página. Botões "Ordem: mais novos/menor preço" (alterna), "Página anterior" e "Próxima página" (só quando existem), e Voltar.
  - Botão do anúncio: `RawMessage` `{rawtext:[{text:"§f"},{translate: resumo.k},{text:" §7x"+q+(encantado?" "+glyph(G.ENCANTADO):"")+"\n"+glyph(G.CAUDAS)+" §6"+preco}]}`, com o ícone da categoria (`ICONES.cat*`).
  - Item com nome próprio mostra `§o` + nome no lugar do translate.
- **Detalhe do anúncio:**
  - corpo com nome e quantidade, vendedor, preço e preço por unidade, mediana recente, encantamentos, durabilidade, lore (até 3 linhas), livro (autor e páginas), conteúdo do shulker (top 5 `typeId×qtd` + "e mais N") e "expira em";
  - botão "Comprar por X" com `confirmar`, ou "Cancelar anúncio" se for seu;
  - (staff) "Remover anúncio";
  - Voltar.
- **Vender:**
  1. confere a mão;
  2. abre `perguntar` com o campo "Preço (Caudas)" (tipo `texto`, padrão = mediana × qtd, se houver; validação própria, 9.1);
  3. abre `confirmar` com o resumo, a taxa de anúncio e "na venda, N% fica com a toca";
  4. executa (9.4).
- **Meus anúncios:** lista dos ativos, que leva ao detalhe com Cancelar.
- **Caixa de retirada:**
  - "Retirar N Caudas" (se houver);
  - cada item (motivo: comprado, expirou, cancelado ou removido);
  - "Retirar tudo" (o que couber);
  - Voltar.
- **Histórico:** os últimos 20 eventos do jogador. **Staff: anúncios** mostra:
  - ativos com busca e Remover;
  - "Para conferir (N)": Devolver à caixa do dono, ou Apagar (com confirmação dupla e log);
  - "Log" com os últimos 30 eventos.
- **Avisos:**
  - **Venda:** o vendedor online recebe mensagem e som; o offline é avisado ao entrar, 60 ticks depois do initialSpawn: "Você tem N itens e X Caudas na caixa de retirada. Use /vulpus:caixa".
  - **Comprar ou cancelar:** tenta entregar na hora; sem espaço, o lote fica na caixa.

### 9.3 Armazenamento: um lote = uma estrutura de 1 bloco (`leilao_armazem.js`)

A API estável não serializa ItemStack. Por isso o item real fica num baú salvo como **estrutura do mundo**, fora do mapa:
- imune a `/kill`, explosão, hopper e `/fill`;
- preserva encantamentos, nome, lore, livros e o NBT inteiro de shulkers.

O mundo só é tocado dentro de **um único callback síncrono**: nenhum tick do jogo passa com o baú no mapa.

- **Ponto de trabalho:** overworld, bloco `(0, heightRange.min, 0)` (a camada de bedrock).
  - Na primeira vez, grava `vulpus:ah:armazem = {x,y,z,d,bloco}`, com o `typeId` do bloco original (normalmente `minecraft:bedrock`).
  - Se esse bloco tiver componente de inventário, o armazém **não liga** (log + aviso à staff).
- **Ticking area:**
  - `world.tickingAreaManager.createTickingArea("vulpus_armazem", { dimension, from: ponto, to: ponto })` no `worldLoad`;
  - `IdentifierAlreadyExists` conta como ok;
  - a Promise resolvida liga `armazemPronto()`;
  - toda operação confere também `dimension.isChunkLoaded(ponto)`.
  - Se falhar, anunciar e retirar respondem "o armazém está acordando, tenta já já" (comprar e cancelar só mexem no índice e continuam funcionando).
- **Nome da estrutura:** `vulpus:ah_<id>`, com `id` em base36 a partir de `vulpus:ah:seq`. Se `structureManager.get(nome)` já existir, avança o seq (até 5 vezes) e **nunca sobrescreve**.
- **Contrato** (só `leilao.js` importa):
```js
/** @returns {boolean} ticking area pronta e chunk carregado */ export function armazemPronto() {}
/**
 * Tira o item do slot do jogador e grava como estrutura. Síncrono. Antes de mover, chama conferir(item);
 * false aborta sem tocar em nada. Em qualquer falha depois de mover, devolve o item ao mesmo slot
 * (ou addItem, ou spawnItem nos pés) e restaura o bloco.
 * @param {Player} player @param {number} slot @param {string} nome @param {(item: ItemStack) => boolean} conferir
 * @returns {boolean} se a estrutura existe e o slot ficou vazio
 */ export function guardar(player, slot, nome, conferir) {}
/**
 * Coloca a estrutura, confere typeId/amount/nameTag com o esperado, move para firstEmptySlot do jogador e apaga a estrutura.
 * @param {Player} player @param {string} nome @param {{ t: string, q: number, n?: string }} esperado
 * @returns {"ok" | "sem_espaco" | "indisponivel" | "divergente" | "falhou_depois"}
 */ export function entregar(player, nome, esperado) {}
/** @param {string} nome @returns {boolean} */ export function existe(nome) {}
/** Só para a staff (Apagar). @param {string} nome @returns {boolean} */ export function apagar(nome) {}
```
- **`guardar`, passo a passo:**
  1. `armazemPronto`;
  2. `bloco = dim.getBlock(ponto)`; o tipo tem que ser o `bloco` registrado;
  3. `bloco.setType("minecraft:chest")`; `bau = getComponent("inventory").container`, que tem que estar vazio;
  4. `conferir(item da mão)`;
  5. `inv.moveItem(slot, 0, bau)`; confere que `bau.getItem(0)` bate e que o slot ficou vazio;
  6. `createFromWorld(nome, dim, ponto, ponto, { includeBlocks: true, includeEntities: false, saveMode: StructureSaveMode.World })`;
  7. `structureManager.get(nome)` existe;
  8. `bau.clearAll()`; `bloco.setPermutation(BlockPermutation.resolve(blocoOriginal))`.

  Se algo falhar antes do passo 7: `bau.moveItem(0, slot, inv)` e restaura o bloco.
- **`entregar`, passo a passo:**
  1. `inv.emptySlotsCount ≥ 1`, senão `"sem_espaco"`;
  2. bloco original no lugar;
  3. `structureManager.place(nome, dim, ponto, { includeEntities: false })`;
  4. `bau.getItem(0)` bate com o esperado, senão `clearAll` + restaurar + `"divergente"`;
  5. `bau.moveItem(0, inv.firstEmptySlot(), inv)`;
  6. `bau.clearAll()` + restaurar o bloco;
  7. `structureManager.delete(nome)`.

  Exceção depois do passo 5 → `"falhou_depois"` (o chamador marca `conferir`).
- **Teste obrigatório no BDS** (pack temporário em `C:/Users/gille/vt/bds/development_behavior_packs/`, mundo próprio de teste; depois devolva o `server.properties` como estava):
  1. `setType(chest)` + inventário legível no mesmo tick;
  2. `createFromWorld(World)` + `get`;
  3. `place` + leitura no mesmo tick;
  4. `clearAll` + `setPermutation(bedrock)` não solta item no chão;
  5. a estrutura sobrevive a reiniciar o servidor;
  6. a ticking area resolve.

  Use baú → baú no lugar do jogador. Relate o resultado na resposta final do papel.

### 9.4 Índice e algoritmos (`leilao.js`)

**Chaves no mundo** (pelo `lerMundo`/`salvarMundo` de `db.js`, cada uma < 30.000 caracteres):

| Chave | Conteúdo |
|---|---|
| `vulpus:ah:seq` | número, próximo id |
| `vulpus:ah:l:<id>` | `Lote` (abaixo) |
| `vulpus:ah:c:<playerId>` | número, Caudas a retirar |
| `vulpus:ah:p` | `{ t: string, p: number[] }[]`: últimas 10 vendas por unidade de até 200 `typeId`, o mais recente primeiro |
| `vulpus:ah:h` | `Evento[]`: últimos 150 do mundo |
| `vulpus:ah:armazem` | `{ x, y, z, d, bloco }` |

```js
/** @typedef {{ t: string, q: number, k: string, n?: string, e?: [string, number][], d?: [number, number],
 *   l?: string[], s?: [string, number][], sn?: number, b?: { a?: string, p: number }, c: Categoria, busca: string }} ResumoItem
 *  t typeId · q amount · k localizationKey · n nameTag · e encantamentos [id sem "minecraft:", nível] · d [dano, máx]
 *  l lore (até 3, 40 caracteres) · s shulker top 5 · sn total de itens no shulker · b livro (autor, páginas) · busca: texto normalizado */
/** @typedef {"blocos"|"ferramentas"|"armas"|"armaduras"|"comida"|"pocoes"|"livros"|"shulkers"|"outros"} Categoria */
/** @typedef {{ v: 1, id: string, rev: number, estado: "ativo" | "caixa" | "retirando" | "conferir",
 *   vendedor: string, nomeVendedor: string, preco: number, criado: number, expira: number,
 *   dono: string | null, motivo: null | "comprado" | "expirou" | "cancelado" | "removido",
 *   comprador?: string, item: ResumoItem }} Lote */
/** @typedef {{ t: number, e: "anunciou"|"vendeu"|"cancelou"|"expirou"|"removeu"|"retirou"|"caudas"|"conferir"|"devolveu"|"apagou",
 *   l?: string, i?: string, q?: number, p?: number, a: string, an: string, b?: string, bn?: string }} Evento */
```

**Cache em memória**
- No `worldLoad`, lê todas as chaves `vulpus:ah:l:` para um `Map`.
- "Caixa de X" = lotes com `estado === "caixa"` e `dono === X`.
- Gravar = atualizar o Map + `salvarMundo` (no mesmo tick).

**Categoria**
- Por `hasTag`: `minecraft:is_sword` → armas; `is_pickaxe`, `is_axe`, `is_shovel` ou `is_hoe` → ferramentas; `is_armor` → armaduras; `is_food` → comida.
- Por sufixo do `typeId`: `_shulker_box` → shulkers; `enchanted_book` → livros; `potion` → poções.
- `BlockTypes.get(typeId)` → blocos.
- O resto → outros.

**Busca**
- Por palavras, sem acento e sem diferenciar maiúsculas, em `busca` (palavras do typeId + nameTag).
- A consulta expande apelidos PT → EN de uma tabela pequena em `textos/leilao.js`: espada→sword, picareta→pickaxe, machado→axe, pá→shovel, enxada→hoe, capacete→helmet, peitoral→chestplate, calça→leggings, bota→boots, arco→bow, besta→crossbow, diamante→diamond, ferro→iron, ouro→gold, esmeralda→emerald, carvão→coal, livro→book, encantado→enchanted, poção→potion, maçã→apple, pão→bread, madeira→log/planks, pedra→stone, vidro→glass, lã→wool, élitro→elytra, tridente→trident, concreto→concrete, terracota→terracotta, entre outros.

**Anunciar** (tudo no mesmo callback, depois do `confirmar`)
1. Relê tudo e confere:
   - leilão ligado e armazém pronto;
   - modo de jogo;
   - `selectedSlotIndex` igual ao do início;
   - assinatura do item igual à mostrada (`typeId`, `amount`, `nameTag` e encantamentos);
   - item permitido;
   - preço válido;
   - ativos < limite;
   - caixa + ativos do vendedor < `caixaLimite`;
   - total < `LIMITE_LOTES`;
   - saldo ≥ taxa.
2. `id`/nome; `guardar(player, slot, nome, conferirAssinatura)`. Se falhar: erro e nada cobrado.
3. `adicionarCaudas(player, -taxa)`; grava o `Lote` (`estado "ativo"`, `rev 0`, `expira = agora + horas`); evento `anunciou`.

**Comprar**
1. Relê o lote pelo id. Só segue com:
   - `estado === "ativo"`, `rev` e `preco` iguais aos exibidos e ainda não expirado;
   - comprador ≠ vendedor;
   - saldo ≥ preço;
   - caixa do comprador < `caixaLimite`;
   - leilão ligado.

   Se não: "Esse anúncio já saiu da vitrine."
2. `adicionarCaudas(comprador, -preco)`.
3. Lote: `estado "caixa"`, `dono = comprador`, `motivo "comprado"`, `comprador` e `rev+1`.
4. `vulpus:ah:c:<vendedor> += preco - floor(preco*taxaVendaPct/100)`.
5. Preço por unidade em `vulpus:ah:p`, se elegível. Evento `vendeu`. Aviso ao vendedor.
6. Tenta `retirar` na hora.

O JS roda numa thread só: dois compradores → o segundo cai no passo 1.

**Cancelar** (vendedor, ou **Remover** pela staff)
- Lote ativo → `caixa`, `dono = vendedor`, `motivo "cancelado"/"removido"`, `rev+1`. Evento.
- No cancelar, tenta retirar na hora. No remover, o vendedor recebe aviso.

**Expirar**
- `runInterval` de 1200 ticks.
- Ativos com `expira ≤ agora` → `caixa`, `dono = vendedor`, `motivo "expirou"`, `rev+1`. Aviso se online.
- Só mexe no índice. A caixa pode passar do limite por expiração e nada é apagado.
- A vitrine também esconde os vencidos na hora de listar.

**Retirar**
1. Lote `caixa` com `dono === player.id`.
2. Marca `estado "retirando"` e grava.
3. `entregar`:
   - `"ok"` → apaga a chave do lote e grava o evento `retirou`;
   - `"sem_espaco"` ou `"indisponivel"` → volta a `caixa`;
   - `"divergente"` ou `"falhou_depois"` → `conferir` + log + aviso à staff online.
4. **Caudas da caixa:** `adicionarCaudas(player, valor)`, zera a chave e grava o evento `caudas`.

**Ao iniciar**, depois do armazém pronto:
- Se o ponto tiver um baú com itens, salva tudo como `vulpus:ah_rec_<ms base36>`, restaura o bloco e registra um evento `conferir` (`console.warn`).
- Lotes em `retirando` → `conferir`. Não volta para a caixa sozinho: isso evita dupe depois de um crash.
- Lotes `caixa`/`ativo` cuja estrutura não existe → `conferir`.

**Staff "Para conferir"**
- **Devolver à caixa:** só se a estrutura existir. Volta para a caixa do `dono` (ou do vendedor).
- **Apagar:** `apagar` + remove o lote. Evento com o nome da staff.

### 9.5 Garantias anti-dupe (resumo)

| Ameaça | Defesa |
|---|---|
| Item copiado ao anunciar | `moveItem` (sem cópia); a estrutura é confirmada antes de gravar o índice; se falhar, devolve |
| Item copiado ao retirar | a estrutura só é apagada depois de mover; qualquer falha depois de mover vai para `conferir` (nunca volta a ficar disponível) |
| Form velho, comprar 2×, comprar e cancelar | confirmação relê o lote, com `rev`, `estado` e `preco`; uma thread só |
| Trocar o item da mão durante o form | confere `selectedSlotIndex` e a assinatura antes de mover |
| Desconectar no meio | tudo síncrono dentro da resposta do form; vendedor offline recebe pela caixa |
| Shulker/livro | NBT inteiro dentro do baú da estrutura, nunca desmontado; a tela usa só o resumo |
| Criativo | não anuncia |
| Crash | journal `retirando` + reconciliação para `conferir`. O risco residual de rollback desencontrado (propriedade dinâmica × estrutura) fica documentado no README |
| Comprar de si / preço absurdo / overflow | bloqueado / faixa 1..1.000.000 / saldo com teto de 1e9 em `caudas.js` |

### 9.6 Contrato e comandos
```js
/** @param {Player} player @param {() => any} [voltar] */ export async function menuLeilao(player, voltar) {}
/** @param {Player} player @param {() => any} [voltar] */ export async function menuCaixa(player, voltar) {}
/** Só staff (confere ehStaff de novo). @param {Player} player @param {() => any} [voltar] */ export async function menuLeilaoStaff(player, voltar) {}
/** Vale offline. @param {Player | string} alvo @returns {{ itens: number, caudas: number }} */ export function resumoCaixa(alvo) {}
/** Ativos do jogador. @param {Player | string} alvo @returns {number} */ export function contarAnuncios(alvo) {}
```
Comandos:
- `leilao` (abre);
- `vender <preco>` (inteiro; vai direto para o `confirmar` do item da mão);
- `caixa` (abre a caixa).

## 10. Pack "Vulpus Chat" [chat]

### 10.1 Estrutura
```
vulpus_chat_bp/
  manifest.json        (seção 3, exatamente)
  pack_icon.png        ([glyphs])
  scripts/main.js      assina world.beforeEvents.chatSend no topo
  scripts/canal.js     leitura do canal (8.5)
  scripts/formato.js   montagem da linha, saneamento; cópia própria dos códigos de glyph e da tabela de ranks/cargos
```
- Não importa nada de `vulpus_bp` (packs não compartilham módulos).
- As cópias de glyphs, ranks e cargos seguem as tabelas 4.2, 8.1 e 8.2 **byte a byte**.
- **Tipagem:** `jsconfig.chat.json` na raiz do addon, igual ao `jsconfig.json`, mais:
  - `"include": ["vulpus_chat_bp/scripts/**/*.js"]`;
  - `"paths": { "@minecraft/server": ["./node_modules/@minecraft/server-beta/index.d.ts"] }`.

  Até a [integracao] instalar o alias, confira com um jsconfig temporário em `C:/Users/gille/vt` que aponte para `C:/Users/gille/vt/refbeta/node_modules/@minecraft/server/index.d.ts`.

### 10.2 Linha do chat
```
{selo}[ {kitsune}] §8[§e{nivel}§8] {corNome}{nome}§8 » §f{mensagem}
```
- `selo` = `"§f" + glyph + "§r"`: o glyph do cargo (score 1..3) ou do rank (score do `vulpus_rank`).
- `corNome` = cor do cargo, ou `§f` sem cargo.
- `nivel` = score de `vulpus_nivel`.
- Exemplo: `§f\uE203§r §8[§e17§8] §fLuiz§8 » §foi gente`.

### 10.3 Regras
- **Condições de partida:** se `ev.cancel` já for true (outro pack cancelou), não faz nada. Se o objective `vulpus_canal` não existir ou `#versao` não for 1, **não mexe** (chat vanilla).
- **Jogador sem score ainda:** nível 0, rank 0, cargo 0.
- **Saneamento:** remove `[\uE000-\uF8FF]` da mensagem, o que impede falsificar coroa ou selos. Se sobrar só espaço: cancela e manda ao autor `§7Essa mensagem só tinha símbolos especiais.`
- **Envio:**
  1. monta o texto;
  2. `try`: se `ev.targets` existir, `t.sendMessage(texto)` para cada alvo; senão, `world.sendMessage(texto)`;
  3. só depois de enviar com sucesso, `ev.cancel = true`.
  - Se o envio lançar erro, não cancela: a mensagem sai vanilla, e o erro vai para o log com o prefixo `[Vulpus Chat]`.
- **Modo restrito:** confira na tipagem beta cada chamada usada dentro do callback (`no-restricted-execution`). Leituras de scoreboard e tag e `sendMessage` são permitidas. Nada de `system.run` no caminho normal, para não reordenar o chat.
- Sem comandos e sem propriedades dinâmicas.
- **Experimento:** o mundo precisa de "APIs Beta" (no `level.dat`, `experiments.gametest = 1`). Depois de ligado, o mundo fica marcado como experimental para sempre. **Primeiro teste num mundo novo, nunca no mundo principal.**
- No BDS sem o experimento, o pack é recusado no log e o resto do addon roda normal.
- **Teste BDS do papel:** o pack carrega junto com BP e RP no mundo `C:/Users/gille/vt/bds/worlds/BetaTeste` (que já tem o Beta). `typeof world.beforeEvents.chatSend === "object"` e não aparece erro no log. Devolva o `server.properties` como estava.

## 11. Contratos que já existem e continuam

Sem mudança de assinatura:
- `forms.js`: `Hub`, `Lista`, `confirmar`, `perguntar`, `mostrar`;
- `db.js`: `dadosJogador`, `editarJogador`, `todosJogadores`, `config`, `lerMundo`, `salvarMundo`;
- `teleporte.js`: `emEspera`;
- `comandos.js`: `registrarComando` (tipos `jogador | texto | inteiro`; `null` = não achou);
- `util.js`: `msg`, `ok`, `erro`, `som`, `formatar*`, `direcao`, `registrarErro`, `rodarSeguro`;
- `caudas.js`: `saldo`, `adicionarCaudas` (vale offline pelo id; teto 1e9);
- `ajustes.js`: `hudLigada` (agora significa "sidebar ligada"; mesmo campo `ajustes.hud` e mesmo `hudPadrao`);
- `boas_vindas.js`: `garantirItem`.

Mapa de imports (sem ciclos):
- `caudas` → `niveis`;
- `identidade` → `niveis`;
- `hud` → `ajustes`, `caudas`, `niveis`, `tela`;
- `leilao` → `caudas`, `leilao_armazem`;
- `menu` → todos;
- `staff` → `leilao`, `identidade`;
- `perfil` → `niveis`, `identidade`.

Proibido:
- `niveis` importar `caudas`, `hud` ou `identidade`;
- `ajustes` importar `hud` (a sidebar percebe a troca sozinha no loop);
- qualquer sistema importar `menu`.

## 12. O que a [integracao] acrescenta (os 6 programam contra isto)

### `config.js`
- `VERSAO = "0.2.0"`.
- Tags: `TAG_ADMIN = "vulpus:admin"`, `TAG_HELPER = "vulpus:helper"` e `TAG_KITSUNE = "vulpus:kitsune"` (`TAG_STAFF` continua).
- `PADROES` (acrescentar, na ordem):

| Chave | Padrão | Faixa em `staff.js` | Rótulo (`textos/staff.js` CAMPOS) |
|---|---|---|---|
| `xpPorMinuto` | 3 | 0..100 | XP por minuto ativo |
| `xpDiaria` | 15 | 0..10000 | XP da diária |
| `leilaoLigado` | true | — | Leilão aberto |
| `taxaAnuncioPct` | 1 | 0..50 | Leilão: taxa para anunciar (%) |
| `taxaVendaPct` | 5 | 0..50 | Leilão: taxa da venda (%) |
| `precoMinimo` | 1 | 1..1000000 | Leilão: preço mínimo |
| `precoMaximo` | 1000000 | 1..1000000 | Leilão: preço máximo |
| `anunciosPorJogador` | 5 | 0..50 | Leilão: anúncios por pessoa |
| `duracaoAnuncioHoras` | 48 | 1..720 | Leilão: duração do anúncio (h) |
| `caixaLimite` | 54 | 9..200 | Leilão: itens na caixa de retirada |

- O rótulo de `hudPadrao` passa a ser "Scoreboard lateral ligada para quem não escolheu".
- `ICONES` (todas conferidas na 1.26.52):
  - Leilão:
    - `leilao: "textures/items/gold_ingot"`;
    - `comprar: "textures/ui/icon_deals"`;
    - `vender: "textures/ui/icon_import"`;
    - `anuncios: "textures/items/book_written"`;
    - `caixa: "textures/blocks/barrel_side"`;
    - `historico: "textures/ui/timer"`;
    - `buscar: "textures/ui/magnifyingGlass"`;
    - `proxima: "textures/ui/arrow_dark_right_stretch"`;
    - `ordenar: "textures/ui/refresh_light"`;
    - `conferir: "textures/ui/icon_lock"`.
  - Níveis, ajustes e cargos:
    - `nivel: "textures/items/experience_bottle"`;
    - `ranks: "textures/items/nether_star"`;
    - `tema: "textures/items/blaze_powder"`;
    - `cargos: "textures/ui/permissions_member_star"`.
  - Categorias do leilão:
    - `catTudo: "textures/ui/icon_recipe_item"`;
    - `catBlocos: "textures/blocks/grass_side_carried"`;
    - `catFerramentas: "textures/items/iron_pickaxe"`;
    - `catArmas: "textures/items/iron_sword"`;
    - `catArmaduras: "textures/items/iron_chestplate"`;
    - `catComida: "textures/items/bread"`;
    - `catPocoes: "textures/items/potion_bottle_heal"`;
    - `catLivros: "textures/items/book_enchanted"`;
    - `catShulkers: "textures/blocks/shulker_top_undyed"`;
    - `catOutros: "textures/items/stick"`.
- `SONS.nivel = "random.levelup"`.

### `core/db.js`
- `DadosJogador` ganha:
  - `v: 2`;
  - `xp: number` (XP total, inteiro ≥ 0, padrão 0);
  - `ajustes.tema: "laranja" | "black"` (padrão `"laranja"`).
- `completar()`:
  - `xp = max(0, floor(numero(lido.xp, 0)))`;
  - `tema = ajustes.tema === "black" ? "black" : "laranja"`.
- Dados da v1 ganham os padrões. Não há XP retroativo: a fase 1 não chegou a ter jogadores.

### `core/forms.js`
- `FLAG.TEMA_BLACK = "§v§b§r"`.
- O título vira `FLAG.HUB|LISTA + (dadosJogador(player).ajustes.tema === "black" ? FLAG.TEMA_BLACK : "") + titulo`.
- `SLOTS_HUB = 11` e `SLOT_STAFF = 10`. Doc do `slot()`: 0-4 esquerda, 5-9 direita, 10 staff.
- `Botao.texto` e os parâmetros de `Lista.texto/botao/rotulo/cabecalho` aceitam `string | RawMessage`. O contexto do log usa o texto quando for string, ou `"rawtext"`.

### `core/permissoes.js`
`ehStaff` também é true com `TAG_ADMIN`.

### `sistemas/menu.js` + `textos/menu.js`
- Slots conforme 6.3:
  - Perfil vai para 4;
  - Caudas 5;
  - **Leilão 6** (`menuLeilao`; rótulo `LEILAO(n)` = "Leilão (n)" quando `resumoCaixa(player).itens > 0`);
  - **Nível 7** (`menuNivel`);
  - Ajustes 8, Regras 9;
  - staff 10.
- Corpo: uma linha nova, depois da saudação, `LINHA_RANK(selo(player), rank.nome, nivel)`, por exemplo "(selo) Raposa Lunar • Nv 17".
- DICAS: trocar "A HUD liga e desliga em Ajustes." por "O placar do lado sai em Ajustes." e somar, com até ~34 caracteres:
  - "Venda e compre no Leilão!"
  - "Ativo no jogo = mais XP."
  - "Tema Black? Passa em Ajustes."

### `sistemas/ajustes.js` + `textos/ajustes.js`
- Botão "Scoreboard lateral: ligada/desligada": o mesmo campo `hud`, sem `setActionBar(" ")`, porque a sidebar se desliga sozinha.
- Botão "Tema do menu: §6Laranja / §fBlack" (ícone `ICONES.tema`), que alterna `ajustes.tema` e reabre (já no tema novo).
- Comando `hud`: alterna a sidebar e responde com `ok`.

### `sistemas/staff.js` + `textos/staff.js`
- **Configurações em 4 forms**, escolhidos numa Lista:
  - "Teleporte e casas": espera, recarga, combate, tpaExpira, limiteCasas;
  - "Caudas e XP": caudas*, diaria*, xp*;
  - "Leilão": as 8 do leilão;
  - "Geral": linkDiscord, hudPadrao.
- Se `precoMinimo > precoMaximo` depois de salvar: erro, e mantém os anteriores dessas duas.
- Botões novos:
  - "Leilão (staff)" → `menuLeilaoStaff`;
  - "Cargos e Kitsune" → `menuCargos`.

### `sistemas/perfil.js` + `textos/perfil.js`
- Linhas novas:
  - selo + rank;
  - "Nível N • x/y XP";
  - cargo, se houver;
  - "Kitsune: apoia a toca no Discord", se tiver a tag.
- Para offline, só rank e nível (por `infoNivel(id)`).

### `textos/regras.js`
`COMANDOS` ganha:
- `/vulpus:leilao` (abre o leilão);
- `/vulpus:vender <preço>` (anuncia o item da mão);
- `/vulpus:caixa` (abre a caixa de retirada);
- `/vulpus:nivel [jogador]` (mostra o nível);
- `/vulpus:hud` (liga/desliga o placar do lado).

`COMANDOS_STAFF` ganha:
- `/vulpus:cargo <jogador> <cargo>` (admin, staff, helper ou nenhum);
- `/vulpus:kitsune <jogador>` (liga/desliga o selo Kitsune).

### `sistemas/boas_vindas.js` + texto
- Tirar `pausarHud`.
- O título da primeira entrada passa por `mostrarTitulo` (`tela.js`), com os mesmos tempos.
- `CHAT_PRIMEIRA` começa com uma linha `glyph(G.TITULO)` (plano B na 4.4).

### `main.js`
Ordem de import:
1. `comandos`;
2. `teleporte`;
3. `tela`;
4. `menu`, `spawn`, `casas`, `voltar`, `tpa`;
5. `caudas`, `niveis`, `identidade`;
6. `perfil`, `ajustes`, `hud`;
7. `leilao`;
8. `regras`, `staff`, `boas_vindas`.

### Manifests, textos e pacote
- **Manifests:** seção 3 (BP e RP 0.2.0). O manifest do chat é do [chat]; a [integracao] só confere.
- **`vulpus_rp/texts/*`:** `pack.description` nova.
- **`package.json`:**
  - `version` 0.2.0;
  - devDependency `"@minecraft/server-beta": "npm:@minecraft/server@2.11.0-beta.1.26.52-stable"`;
  - `check` = `tsc -p jsconfig.json && tsc -p jsconfig.chat.json`;
  - script `glyphs` = `python tools/gerar_glyphs.py`;
  - rodar `npm install` (cuidado com MAX_PATH).
- **`jsconfig.json`:** inalterado, só o BP.

### `tools/build.py`
Valida os 3 packs:
- o chat usa `@minecraft/server` `2.11.0-beta`, e o alias do `package.json` começa com essa versão + `.`;
- os scripts do chat não importam fora de `vulpus_chat_bp`;
- BP e RP não usam beta;
- `font/glyph_E2.png` tem 256² e `glyph_E3.png` tem 512².

Saídas:
- `Vulpus_BP.mcpack`, `Vulpus_RP.mcpack` e **`Vulpus_Chat.mcpack`**;
- `Vulpus.mcaddon` com **as 3 pastas**. Importar não ativa nada; o chat só carrega em mundo com Beta.

### `tools/instalar_dev.py`
- Copia também `development_behavior_packs\Vulpus_Chat_BP`.
- Só ativa o chat no mundo com `--chat`, e avisa: "o mundo precisa do experimento APIs Beta, que não dá para desligar depois".

### README e ESTADO
- **`README.md`:**
  - leilão;
  - níveis e ranks;
  - sidebar e tema;
  - chat (como ligar o Beta num mundo NOVO e subir para o BDS);
  - atualização da string beta a cada update do jogo;
  - risco de rollback do leilão;
  - comandos novos;
  - checklist da seção 16.
- **`docs/ESTADO.md`:** situação da fase 2.

## 13. Textos e rótulos

- Rótulos fixos (os outros textos ficam a critério de cada papel, na voz da Kiza):
  - Hub: "Leilão", "Nível";
  - Leilão: "Comprar", "Vender item da mão", "Meus anúncios (x/y)", "Caixa de retirada (n)", "Histórico", "Buscar", "Próxima página", "Página anterior";
  - categorias: Tudo, Blocos, Ferramentas, Armas, Armaduras, Comida, Poções, Livros encantados, Shulkers, Outros;
  - Nível: "Ranks", "Ranking de nível", "Como ganhar XP".
- Exemplos de tom:
  - "Anúncio no ar! Paguei §e15§r Caudas de taxa.";
  - "Vendido! Alguém levou seu Diamante x64. §61.140§r Caudas te esperam na caixa.";
  - "Sua caixa está cheia. Retira alguma coisa antes, tá?";
  - "Esse anúncio já saiu da vitrine.";
  - "Subiu para o nível §e6§r! Bora!".
- Erros com `erro()`, sucessos com `ok()`.
- Glyphs nunca em títulos ou cabeçalhos (4.1).
- Nomes de encantamentos em PT numa tabela de `textos/leilao.js`, com reserva para o id sem `minecraft:` e `_` → espaço. Exemplos: sharpness → Afiação, efficiency → Eficiência, unbreaking → Inquebrável, mending → Remendo, fortune → Fortuna, silk_touch → Toque suave, protection → Proteção.

## 14. Limites de desempenho (alvo: 30 jogadores online, 1000 lotes)

| Rotina | Intervalo | Custo |
|---|---|---|
| Sidebar | 10 ticks | monta 6 ou 7 linhas por jogador; `setTitle` no máximo 1×/s quando muda, mais 1× a cada 10 s |
| Presença, Caudas e XP | 1200 ticks (o de `caudas.js`) | XP vai junto, sem loop novo |
| Identidade (nameTag + canal) | 600 ticks + eventos | escreve só o que mudou |
| Expiração do leilão | 1200 ticks | varre o Map em memória; grava só os que vencem |
| Vitrine e busca | ao abrir | filtro linear em memória (≤ 1000) |
| Chat | por mensagem | 3 `getScore` + 1 `hasTag` |

- Dynamic properties: cada chave < 30.000 caracteres.
- Histórico com 150 eventos (~25 mil caracteres) e preços com 200 tipos × 10.

## 15. Fora do escopo desta fase

- Ícone por item no leilão (usa o da categoria).
- Lances e leilão com tempo (só "compre já").
- Vender parte de uma pilha.
- Loja e "pagar" entre jogadores.
- Ligação real com o Discord (níveis e ranks já ficam iguais para isso).
- Multiplicador de XP do booster dentro do jogo.
- Moderação de chat (mute, filtro de palavras).
- Rank na lista de jogadores (Tab).
- Tema Black na sidebar e no ModalForm.
- Posição configurável da sidebar.
- Textos em inglês novos (o `en_US.lang` só mantém as chaves).

## 16. Checklist de teste no jogo (fase 2)

Primeiro num **mundo novo** com "APIs Beta" ligado e sem cheats. Depois repita sem o pack do chat num mundo **sem experimentos**, para conferir que o resto não depende do Beta.

1. **Glyphs:**
   - aparecem no chat, no nameTag, na sidebar, no corpo e nos botões da Lista;
   - `§7` antes do glyph tinge? (anotar);
   - num título de Lista (MinecraftTen) não usamos;
   - o título VULPUS em glyph no chat tem vão entre as células? (se tiver: plano B).
2. **Hub:** 10 botões alinhados, rótulos de 2 linhas sem cortar, imagem do título nítida, coroa no canto, foco por setas/controle.
3. **Tema:** trocar em Ajustes reabre no Black; Hub, Lista, botões e X pretos com laranja; confirmar e ModalForm continuam normais; abrir e fechar 10 vezes sem travar.
4. **Sidebar:**
   - liga e desliga em Ajustes e em `/vulpus:hud`;
   - um title normal (subir de rank, primeira entrada) aparece inteiro e a sidebar continua;
   - trocar o GUI scale: a caixa volta em até 10 s;
   - celular: não cobre os botões de toque;
   - actionbar livre: a contagem do teleporte e o aviso de TPA aparecem;
   - "+5" depois do ganho por tempo.
5. **Níveis:** XP sobe 3/min andando e não sobe parado; diária dá +15; virar Raposinha mostra título e aviso geral; nameTag em 2 linhas e mudando na hora.
6. **Cargos:**
   - `/vulpus:cargo` (admin) muda o selo; operador aparece como Admin;
   - helper não abre o painel da staff;
   - `/vulpus:kitsune` põe e tira o selo;
   - `/tag` feito fora aparece em até 30 s.
7. **Chat:**
   - selo, `[nível]` e cor do nome certos;
   - colar um glyph de coroa na mensagem não falsifica;
   - sem o BP (só o chat), o chat fica vanilla;
   - sem o Beta, o log recusa só o chat.
8. **Leilão, básico:**
   - anunciar espada encantada e renomeada, livro assinado, shulker cheio e pilha de 64;
   - comprar com outra conta: item idêntico (encantos, nome, conteúdo do shulker);
   - o vendedor recebe 95 % na caixa, inclusive offline.
9. **Leilão, limites:**
   - taxa de anúncio cobrada e não devolvida;
   - 6º anúncio recusado;
   - preço 0, 1.000.001 e "abc" recusados;
   - criativo recusado;
   - item do menu recusado.
10. **Leilão, caixa e dupe:**
    - expirar (staff põe 1 h e espera, ou testa com relógio) → caixa;
    - cancelar → volta para a mão;
    - caixa cheia bloqueia;
    - dois jogadores comprando juntos: só um leva;
    - trocar o item da mão com o form aberto: recusa;
    - sair no meio: nada some;
    - reiniciar o servidor: anúncios e caixa continuam;
    - staff remove → caixa do dono + log.
11. **Bedrock** em (0, -64, 0) continua bedrock depois de tudo; nenhum baú fica no mapa.
12. **Content Log** sem "Unknown property" e sem `[Vulpus]` de erro.

## 17. Riscos e planos B

| Risco | Sinal | Plano B |
|---|---|---|
| Tema Black pesado ou com erro | lag ao abrir, erro no log | só laranja (6.2) |
| Glyph não aparece em label do menu | quadrado ou vazio | usar só no corpo; se nem no corpo, símbolos BMP (★ •) no menu |
| Title da sidebar some com rebuild | caixa some por > 10 s | reduzir o reenvio para 5 s |
| `RawMessage` no botão não traduz | aparece `item.x.name` | texto do `typeId` "bonito" (palavras com maiúscula) |
| `place`/`setType` não síncrono no BDS | teste 9.3 falha | armazém com entidade de inventário em ticking area (opção "a" da pesquisa), com a mesma regra de journal; a decisão volta ao arquiteto |
| String beta muda no update | chat não carrega | trocar a versão no manifest e o alias; o resto segue |
| Vãos no título em glyph | VULPUS picado no chat | `§6§lVULPUS§r` |

## Apêndice A: rascunho validado da sidebar (pesquisa ui-hud-glyph-tema)

`vulpus_rp/ui/hud_screen.json`:
```json
{
  "namespace": "hud",
  "root_panel": { "modifications": [ { "array_name": "controls", "operation": "insert_back",
    "value": [ { "vulpus_sidebar@vulpus_hud.sidebar": {} } ] } ] },
  "hud_title_text": { "modifications": [ { "array_name": "bindings", "operation": "insert_back",
    "value": [
      { "binding_name": "#hud_title_text_string" },
      { "binding_type": "view",
        "source_property_name": "((#hud_title_text_string - '§v§s§b§r') = #hud_title_text_string)",
        "target_property_name": "#visible" } ] } ] }
}
```
`vulpus_rp/ui/vulpus/vulpus_hud.json`:
```json
{
  "namespace": "vulpus_hud",
  "dados": {
    "type": "panel", "size": [0, 0], "$vh_flag|default": "§v§s§b§r",
    "property_bag": { "#preserved_text": "" },
    "bindings": [
      { "binding_name": "#hud_title_text_string", "binding_condition": "always" },
      { "binding_name": "#hud_title_text_string", "binding_name_override": "#preserved_text", "binding_condition": "visibility_changed" },
      { "binding_type": "view",
        "source_property_name": "((not (#hud_title_text_string = #preserved_text)) and (not ((#hud_title_text_string - $vh_flag) = #hud_title_text_string)))",
        "target_property_name": "#visible", "binding_condition": "always" } ]
  },
  "sidebar": {
    "type": "panel", "size": ["100%", "100%"], "layer": 20, "$vh_flag": "§v§s§b§r",
    "controls": [ { "dados_visivel@vulpus_hud.dados": {} }, { "caixa@vulpus_hud.caixa": {} } ]
  },
  "caixa": {
    "type": "panel", "size": ["100%cm", "100%cm"],
    "anchor_from": "right_middle", "anchor_to": "right_middle", "offset": [-4, 0],
    "property_bag": { "#visible": false }, "visible": "#visible",
    "bindings": [ { "binding_type": "view", "source_control_name": "dados_visivel", "resolve_sibling_scope": true,
      "source_property_name": "(not ((#preserved_text - $vh_flag) = ''))", "target_property_name": "#visible" } ],
    "controls": [
      { "fundo": { "type": "image", "texture": "textures/vulpus/ui/painel", "size": ["100%sm + 12px", "100%sm + 10px"], "alpha": 0.9, "layer": 1 } },
      { "conteudo@vulpus_hud.conteudo": {} } ]
  },
  "conteudo": {
    "type": "stack_panel", "orientation": "vertical", "size": ["100%cm", "100%c"], "layer": 2,
    "controls": [
      { "titulo": { "type": "image", "texture": "textures/vulpus/ui/titulo", "size": [65, 14] } },
      { "espaco": { "type": "panel", "size": [1, 4] } },
      { "texto@vulpus_hud.texto": {} } ]
  },
  "texto": {
    "type": "label", "text": "#text", "size": ["default", "default"], "max_size": [140, 160],
    "text_alignment": "left", "color": [1.0, 1.0, 1.0], "shadow": true, "localize": false, "font_type": "default",
    "controls": [ { "dados_texto@vulpus_hud.dados": {} } ],
    "bindings": [ { "binding_type": "view", "source_control_name": "dados_texto",
      "source_property_name": "(#preserved_text - $vh_flag)", "target_property_name": "#text", "binding_condition": "always" } ]
  }
}
```
Riscos para testar:
- esconder a `caixa` não pode congelar os bindings que a mostram de novo (por isso `dados_visivel` é irmã);
- o tamanho `100%sm` do fundo segue o irmão `conteudo`;
- conferir o alinhamento do título com o texto.
