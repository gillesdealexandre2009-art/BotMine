# 02 — Técnicas provadas da comunidade: Server Forms customizados via JSON UI (foco 1.21.70+ / 1.26.x)

Pesquisa feita em 2026-10-02. Alvo: Minecraft Bedrock 1.26.52 (GDK, Windows), `@minecraft/server` 2.10.0, `@minecraft/server-ui` 2.2.0.
Referência de verdade: `scratchpad/vanilla_1.26.52/ui/server_form.json` (extraído do jogo do usuário). Ele é **idêntico** ao `server_form.json` do bedrock-samples `v1.26.50.4` (diff vazio).

Cópias locais de todas as fontes baixadas: `scratchpad/pesquisa/src/` (wiki, chestui, tilemenu, minui, bcore, skyls, samples, npm).
Rascunho validado da proposta (JSON + JS, só no scratchpad): `scratchpad/pesquisa/proposta_rascunho/` (rodar `python validate.py` lá dentro).

---

## 0. TL;DR

1. **Técnica recomendada (compatível, 2025–2026):** NÃO redeclarar `long_form`. Fazer só 2 edições em `RP/ui/server_form.json`:
   - `main_screen_content` → `modifications` `insert_back` de **uma segunda factory** com `"name": "server_form_factory"` apontando `long_form` para o nosso painel (`@vulpus_menu.root`).
   - `long_form` → `modifications` `insert_back` em **`bindings`** (nunca em `controls`) escondendo o form vanilla quando o título tem a flag.
   Usado por: Bedrock Wiki "Modifying Server Forms" (2025-02, revisado 2026-05), MinUI (2026-09) e bedrock-core/ui (pack `min_engine_version 1.26.50`, 2026-09).
2. **Técnica antiga/popular (Chest-UI, tile-menu, Skyls):** redeclarar `long_form` com `type: panel` + `controls` próprios (recriando o dialog vanilla dentro, com gate). Funciona, mas: copia props vanilla que mudam (ex.: `$title_size` 14px→15px + `$title_max_size` na 1.21.80) e **conflita** com qualquer outro pack que faça o mesmo (o array `controls` do pack de cima substitui o do de baixo).
3. **Slots fixos:** `stack_panel` com `"collection_name": "form_buttons"` + filhos com `"collection_index": N` literal. **O próprio controle `button` precisa de `{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}`**, senão o clique volta como `canceled` (medido pelo bedrock-core em 2026-08-27). `collection_name` só é aceito em `stack_panel`/`grid`.
4. **Header/label/divider (1.21.70+):** o `collection_index` conta TODAS as entradas, mas `response.selection` conta **só botões**. No menu de slots fixos: usar só `.button()` (texto embaixo da logo via `.body()` → `#form_text`). Na lista: usar factory com `control_ids` + `#form_button_contents` (cópia da estrutura vanilla 1.21.70+), aí header/label/divider funcionam.
5. **Override com mesmo nome = MERGE por chave** (mantém a herança `@` vanilla); arrays declarados substituem inteiros; array só herdado é *sombreado* se você declarar ou inserir nele. Detalhes e evidências na §2.
6. **ModalFormData:** deixar vanilla (ou tema leve global via `$custom_background`). Nunca copiar `generated_contents` (é reutilizado pelo `pack_settings_screen.json` e ganhou `multiselect` na 1.26.50).
7. **DDUI** (`CustomForm`/`MessageBox` do server-ui 2.x) é outra tela (markup `minecraft:ui-root`, Ore UI), **não passa pelo `server_form.json`** → não serve para o menu customizado. Usar `ActionFormData`.

---

## 1. Base vanilla 1.26.52 (o que importa para hooks)

Árvore (namespace `server_form`):

```
third_party_server_screen@common.base_screen     ($screen_content = server_form.main_screen_content; button_mappings menu_cancel -> menu_exit global)
└─ main_screen_content            type panel, size [0,0]   ← DECLARA "controls" próprio (seguro inserir)
   └─ server_form_factory         type factory, control_ids { long_form: @server_form.long_form, custom_form: @server_form.custom_form }
long_form@common_dialogs.main_panel_no_buttons   ← NÃO declara controls nem bindings (herda controls de main_panel_no_buttons)
   $child_control = server_form.long_form_panel → scrolling_panel → long_form_scrolling_content
      ├─ main_label  text "#form_text" (cor $main_header_text_color)
      └─ long_form_dynamic_buttons_panel (stack_panel)
           factory { name "buttons", control_ids { button: server_form.dynamic_button, label: @server_form.dynamic_label,
                                                   header: @server_form.dynamic_header, divider: @settings_common.option_group_section_divider } }
           collection_name "form_buttons"; binding #form_button_contents -> #collection_length
custom_form@common_dialogs.main_panel_no_buttons → custom_form_panel@common.scrolling_panel → custom_form_scrolling_content
      ├─ generated_form@server_form.generated_contents  (factory "buttons": label/toggle/slider/step_slider/dropdown/input/header/divider/multiselect; collection "custom_form"; #custom_form_length)
      └─ submit_button (button.submit_custom_form, #submit_text, #submit_button_visible)
```

Bindings/nomes exatos (1.26.52): `#title_text`, `#form_text`, coleção `form_buttons` com `#form_button_text`, `#form_button_texture`, `#form_button_texture_file_system`; contagem `#form_button_contents`; clique `button.form_button_click`; modal: coleção `custom_form`, `#custom_text`, `#custom_form_length`, `button.submit_custom_form`; fechar: `button.menu_exit` (o `common.close_button` usa `$close_button_to_button_id|default = button.menu_exit`).

`dynamic_button` vanilla (modelo para nosso botão de lista): `stack_panel` horizontal 32px; ícone `image` com `#form_button_texture`→`#texture` e `#form_button_texture_file_system`→`#texture_file_system` (collection) e `#visible = (not ((#texture = '') or (#texture = 'loading')))`; botão `form_button@common_buttons.light_text_button` com `$pressed_button_name: button.form_button_click`, `$button_text: #form_button_text`, `$button_text_binding_type: collection`, `$button_text_grid_collection_name: form_buttons` e **`bindings: [{binding_type: collection_details, binding_collection_name: form_buttons}]` no próprio botão**.

Atenção: `server_form.generated_contents` também é usado por `pack_settings_screen.json` (`generated_form@server_form.generated_contents`) → mexer nele afeta a tela de configurações de pack.

### 1.1 Histórico do `server_form.json` vanilla (bedrock-samples, diff real)

| Versão (commit) | Mudança | Impacto em packs |
|---|---|---|
| 1.19.30 (a3b394c) → 1.20.80 (e304be6) | submit usa `#submit_text` | — |
| → 1.21.60 (43ca279) | dropdown `$dropdown_area: inside_header_panel`, `layer 2` | quem copiou `custom_dropdown` |
| → **1.21.70 (8cb28e3)** | `long_form_dynamic_buttons_panel.factory`: `control_name: server_form.dynamic_button` → **`control_ids {button,label,header,divider}`**; binding **`#form_button_length` → `#form_button_contents`**; novos `dynamic_label`/`dynamic_header`; `custom_form` ganha `header`/`divider` | packs que redefiniram o painel de botões com `control_name` não desenham header/label/divider como tal; índices da coleção passam a contar entradas que não são botão |
| → 1.21.80 (745dbc8) | `$title_size` `100% - 14px` → `100% - 15px` + `$title_max_size`; tooltips (`#custom_tooltip_text`) nos campos do modal | cópias de `long_form` (Chest-UI/tile-menu/Skyls usam 14px) ficam defasadas (cosmético) |
| → 1.21.90 (d2c831e) | slider `#custom_slider_timeout` | — |
| → 1.21.100 (c32ab2a) | remove `$option_tooltip_visible` | — |
| → **1.26.50.4 (46ba6ea)** | `generated_contents` ganha `multiselect` (`custom_multiselect`, `#custom_multiselect_length`, coleção `custom_multiselect`) | quem copiou o factory do modal perde multiselect |
| 1.26.52 (local) | idêntico a 1.26.50.4 | — |

Não achei issue pública dizendo literalmente "quebrou na 1.21.70" (busca web não indexa `#form_button_length`); a evidência é o diff acima. Correção da comunidade: copiar a estrutura nova (`control_ids` + `#form_button_contents`) ou não redefinir o painel vanilla (usar painel próprio).

---

## 2. Pergunta-chave: definir `long_form` no nosso `server_form.json` substitui ou mescla?

**Resposta: mescla por chave (shallow merge), mantendo a herança `@` vanilla; mas qualquer array que você declarar substitui o array inteiro.**

| Afirmação | Evidência | Confiança |
|---|---|---|
| Redeclarar `X` (sem `@`) no mesmo arquivo/namespace **mescla** com a def vanilla: chaves suas sobrescrevem, as demais ficam, e a base `@` vanilla continua | bedrock-core (`packs/RP/ui/server_form.json`, pack 1.12.0, `min_engine_version 1.26.50`): `"third_party_server_screen": { "$screen_animations": [...], "gamepad_cursor": true }` — só 2 chaves, **sem** `@common.base_screen`; se não mesclasse, a tela perderia `type: screen`/`$screen_content` e nenhum form abriria. Wiki *Best Practices*: "The changes you make are strategically merged with the vanilla UI" e o exemplo `{"progress_text_label": {"shadow": false}}`. MinUI/bedrock-core: `main_screen_content` só com `size`+`property_bag`+`modifications` | Alta |
| Arrays (`controls`, `bindings`, `button_mappings`, `variables`) declarados no override **substituem** o array (não concatenam) | Chest-UI, bedrock-tile-menu e Skyls, ao declarar `long_form.controls`, precisam recriar o dialog vanilla como filho (`long_form@common_dialogs.main_panel_no_buttons` / `default_long_form@...` com `$child_control: server_form.long_form_panel`) — senão o form normal some. Wiki *Best Practices* (exemplo `root_panel` listando todos os controles vanilla) e a própria existência de `modifications` | Alta |
| Array que a def só **herda** é **sombreado** se você o declara **ou** se faz `modifications` insert nele (cria um array novo e o herdado some) | bedrock-core `docs/spikes/jsonui-container-facts.md` (medido em `chest.small_chest_screen`: "left the screen with only the inserted control… The same happens on any derived definition"); comentário em `hosts/form/mount.json` ("an insert into an array a definition merely INHERITS creates one that shadows it") | Alta (medido) |
| ⇒ No `long_form` vanilla: `controls` é herdado de `common_dialogs.main_panel_no_buttons` → **nunca** inserir em `controls`. `bindings` não existe em lugar nenhum da cadeia → inserir em `bindings` é seguro | dump da 1.26.52 (`main_panel_no_buttons` não tem `bindings`) + Wiki/MinUI/bedrock-core fazem exatamente isso | Alta |
| Override/`modifications` têm que estar no **mesmo caminho de arquivo** (`RP/ui/server_form.json`); "modifications are resolved per file path, not per namespace"; definição vanilla redeclarada em outro arquivo é ignorada em silêncio | bedrock-core container facts (medido com `chest_screen.json`; "Type not specified (or @-base not found)" / "Unknown property [modifications]" quando posto em outro arquivo) | Alta p/ chest, inferido p/ server_form |
| Packs empilham por prioridade: por chave, o pack de cima vence; `modifications` de todos os packs acumulam em ordem | comentários do bedrock-core (`_ui_defs.json`, `mount.json`) + wiki (`_ui_defs`: "it automatically gets merged with other packs") | Média-alta |
| Redeclarar com **outro** `@` (ex.: `"long_form@meu_ns.x"`) | sem evidência encontrada — **evitar** | — |
| `variables` não é alcançável por `modifications` (só `controls` e `bindings`); `remove` de filho herdado derruba o arquivo inteiro em silêncio | bedrock-core container facts (medido) | Alta |
| `$var` dentro de `source_property_name` num subtree **inserido via `modifications`** falha ("Must define a source property name in the binding!") → use literais no valor da modification; dentro de definições próprias (referenciadas pela factory) variáveis funcionam | bedrock-core container facts (medido em chest). Obs.: o próprio `server_form.json` do bedrock-core usa `$protocol_header` num binding inserido em `long_form`; MinUI e Wiki usam literal. **Recomendação: literal** | Média |

Conclusão prática para a 1.26.52: `long_form` (vanilla) = `long_form@common_dialogs.main_panel_no_buttons`. Se escrevermos `"long_form": { "modifications": [...] }`, a def continua sendo o dialog vanilla (mesma base, mesmas props) + bindings novos. Se escrevermos `"long_form": { "type": "panel", "controls": [...] }` (estilo Chest-UI), a def continua herdando de `main_panel_no_buttons` (e mantém `size [225,200]`, `$child_control` etc.), mas os `controls` herdados (fundo, título, `panel_indent/inside_header_panel`) são trocados pelos nossos — por isso o Chest-UI recria o dialog vanilla como filho.

---

## 3. Técnicas da comunidade (com JSON exato, versão e problemas)

### T1 — Segunda factory + esconder o vanilla via `modifications` (RECOMENDADA)

Fonte: Bedrock Wiki, *Modifying Server Forms* (https://wiki.bedrock.dev/json-ui/modifying-server-forms ; raw: https://raw.githubusercontent.com/Bedrock-OSS/bedrock-wiki/wiki/docs/json-ui/modifying-server-forms.md). Criada 2025-02-07 (TheoristMC); correções 2025-03-04, 2025-11-06 ("Fix binding_type source_control_name to source_property_name"), 2026-05-23.

```json
"main_screen_content": {
  "modifications": [ {
    "array_name": "controls", "operation": "insert_back",
    "value": [ { "wiki_server_form_factory": {      // nome livre, mas != "server_form_factory"
      "type": "panel",
      "factory": { "name": "server_form_factory",   // obrigatório: é esse nome que recebe os dados
                   "control_ids": { "long_form": "@server_form.our_long_form_panel" } } } } ]
  } ]
},
"long_form": {
  "modifications": [ {
    "array_name": "bindings", "operation": "insert_back",
    "value": [
      { "binding_name": "#title_text" },
      { "binding_type": "view",
        "source_property_name": "((#title_text - 'wiki_form:') = #title_text)",   // vários: (#title_text - 'a' - 'b')
        "target_property_name": "#visible" } ]
  } ]
},
"our_long_form_panel": {
  "type": "panel",
  "bindings": [ { "binding_name": "#title_text" } ],
  "controls": [ { "our_custom_made_long_form": {
    "type": "image", "texture": "textures/items/apple", "size": [32, 32],
    "$title_needs_to_contain": "wiki_form:",
    "bindings": [ { "binding_type": "view", "source_control_name": "our_long_form_panel",
                    "source_property_name": "(not ((#title_text - $title_needs_to_contain) = #title_text))",
                    "target_property_name": "#visible" } ] } } ]
}
```
O mesmo vale para `custom_form` (mapear `"custom_form": "@server_form.our_custom_form_panel"` e gate em `custom_form.bindings`).

Uso em produção 2026:
- **MinUI** (https://github.com/codex-alchemist-dev/MinUI, `rp/ui/server_form.json`, push 2026-09-28): igual à wiki, flag `oc1|`, factory `openchara_form_factory` → `@oc_screens.root`, e ainda redimensiona `main_screen_content`:
```json
"main_screen_content": {
  "size": ["0px", "0px"],
  "property_bag": { "#size_binding_x": "0px", "#size_binding_y": "0px" },
  "modifications": [
    { "array_name": "controls", "operation": "insert_back", "value": [ { "openchara_form_factory": { "type": "panel",
        "factory": { "name": "server_form_factory", "control_ids": { "long_form": "@oc_screens.root" } } } } ] },
    { "array_name": "bindings", "operation": "insert_back", "value": [
        { "binding_name": "#title_text" },
        { "binding_type": "view", "source_property_name": "((((#title_text - 'oc1|') = #title_text) and '0px') or '100%')", "target_property_name": "#size_binding_x" },
        { "binding_type": "view", "source_property_name": "((((#title_text - 'oc1|') = #title_text) and '0px') or '100%')", "target_property_name": "#size_binding_y" } ] } ]
}
```
- **bedrock-core/ui** (https://github.com/bedrock-core/ui, `packages/resource-pack/packs/RP/ui/server_form.json`, pack 1.12.0, `min_engine_version "1.26.50"`): mesmo esquema (header `corev0009`), mapeia `long_form` → `@core_ui_common.action_container` e `custom_form` → `@core_ui_common.modal_container`, gate em `long_form` e `custom_form`, mesmo redimensionamento de `main_screen_content`, e ainda:
```json
"third_party_server_screen": {
  "$screen_animations": [ "@core_ui_animations.screen_enter_animation", "@core_ui_animations.screen_exit_animation" ],
  "gamepad_cursor": true
}
// core_ui_animations.screen_enter_animation = { "anim_type": "wait", "duration": "$transition_time_pop", "play_event": "screen.entrance_pop", "end_event": "screen.entrance_end" }  (exit idem com screen.exit_pop/exit_end)
```
Problemas/correções relatados:
- MinUI tentou `cache_screen: true` / `load_screen_immediately: true` em `long_form` → content log: "Unknown property on def[long_form] from namespace[server_form]" a cada abertura → revertido.
- bedrock-core S8 (2026-09-13): `visible` **não impede construção**: toda tela customizada de todo pack é construída e diagramada em *todo* server form aberto ("Full re-layout of 5546 controls… for screen 'server_form.third_party_server_screen'"); sliders estáticos disparam `Assertion failed: Step out of range`. Correção: não colocar slider/toggle/edit_box estáticos em telas customizadas; controles com estado só via factory do motor (S9).
- Conflito entre packs: dois packs inserindo bindings `#visible` no mesmo `long_form` → o último binding escreve por último (inferência; não medido). Para nós: todas as flags num único binding.

### T2 — Redeclarar `long_form` inteiro (Chest-UI / tile-menu / Skyls)

**Chest-UI** (https://github.com/Herobrine643928/Chest-UI — 171★; RP manifest 1.5.0, `min_engine_version [1,21,0]`; `RP/ui/server_form.json` alterado por último em 2025-02-22; UI do baú atualizada 2026-01-07 "1.21.131 Update" e 2026-02-01; BP usa `@minecraft/server 1.18.0` e `server-ui 1.3.0`):
```json
{
  "namespace": "server_form",
  "long_form": {
    "type": "panel",
    "controls": [
      { "long_form@common_dialogs.main_panel_no_buttons": {
          "$title_panel": "common_dialogs.standard_title_label", "$title_size": ["100% - 14px", 10], "size": [225, 200],
          "$text_name": "#title_text", "$title_text_binding_type": "none", "$child_control": "server_form.long_form_panel", "layer": 2,
          "bindings": [ { "binding_name": "#title_text" },
            { "binding_type": "view",
              "source_property_name": "(((#title_text - '§c§h§e§s§t') = #title_text) and ((#title_text - '§f§u§r§n§a§c§e') = #title_text))",
              "target_property_name": "#visible" } ] } },
      { "chest_ui@chest_ui.chest_panel": { "bindings": [ { "binding_name": "#title_text" },
          { "binding_type": "view", "source_property_name": "(not ((#title_text - '§c§h§e§s§t') = #title_text))", "target_property_name": "#visible" } ] } },
      { "furnace_ui@furnace_ui.furnace_panel": { "ignored": "$disable_furnace_ui", "bindings": [ "...mesmo padrão com '§f§u§r§n§a§c§e'" ] } }
    ]
  }
}
```
Como funciona (respostas às perguntas do enunciado):
- **Interceptação:** redeclara `long_form` (merge → mantém base vanilla, troca `controls`); recria o dialog vanilla como filho com gate negativo. Não usa `modifications` nem segunda factory.
- **Detecção da flag:** `(not ((#title_text - '§c§h§e§s§t') = #title_text))` (o operador `-` remove a substring; se mudou, contém). Variantes por tamanho: `$condition` = `'§c§h§e§s§t§2§7'`, `'§c§h§e§s§t§5§4'` etc. em `chest_ui.chest_ui_template` (binding com `$condition` dentro da expressão — funciona porque é def própria, não subtree de `modifications`).
- **Remoção da flag do título:** não remove; o JS monta o título como rawtext `[{text: '§c§h§e§s§t§2§7§r'}, ...título]` (`constants.js` `CHEST_UI_SIZES`) — só códigos `§` (invisíveis) terminando em `§r` (reseta cor). O label usa `"text": "#title_text"` direto.
- **Mapeamento botão→slot:** baú = `grid` com `"collection_name": "form_buttons"`, `"grid_dimensions": "$grid_size"`, `"grid_item_template": "chest_ui.inventory_item_panel"` (grid indexa sozinho 0..N-1). Inventário = `stack_panel` com `"collection_name": "form_buttons"` e filhos `"collection_index": "($start_index + 9)"` etc., onde `"$start_index": "(($size - '§c§h§e§s§t' - '§') * 1)"` (string→número em variável; prova que `-` remove **todas** as ocorrências).
- **Clique devolve o índice:** `inventory_item@common.button` com `"$pressed_button_name": "button.form_button_click"` e bindings `{"binding_name": "#null", "binding_type": "collection_details", "binding_collection_name": "form_buttons"}` + `#form_button_text` (collection) + `"(not (#form_button_text = ''))"` → `#visible` (slots vazios: o JS manda `button('', undefined)` para todos os slots).
- Problemas: issues #38/#39 (1.21.130: ícones por aux-id sumiram — mudança de IDs; corrigido por forks/PRs de `typeIds.js`, ex.: stievenw/Chest-UI; recomendam path de textura); "Lag Improvement" (2025-02-21): desligar layouts não usados com `"ignored": "$disable_54_slots_layout"` em `_global_variables.json` (coerente com S8: tudo é construído); #43 furnace + `$show_inventory false` (corrigido #44); #51 (26.31, "UI not showing" — instalação errada). Nenhuma issue sobre header/label/divider (o grid lê a coleção crua).

**bedrock-tile-menu** (https://github.com/markeev/bedrock-tile-menu, push 2026-07-13, RP `min_engine_version [1,19,0]`, servidor Nukkit-MOT): mesmo override do Chest-UI, mas gate por **igualdade exata** de título:
```json
"source_property_name": "(#title_text = 'BedrockIslands')"       // menu custom
"source_property_name": "((((((#title_text - 'BedrockIslands') - 'Island Settings') - 'Islands§r') - 'Auction House') = #title_text))"  // vanilla
```
Slots: `stack_panel`s aninhados, **todos** com `"collection_name": "form_buttons"`, e `{"bi_x2_islands@server_form.bi_pic_button": {"$bg": "textures/ui/menu/islands", "$slot": [132,144], "$btn": [128,140], "collection_index": 2}}`. Botão cru:
```json
"bi_pic_click": {
  "type": "button", "size": ["100%","100%"], "layer": 1,
  "default_control": "default", "hover_control": "hover", "pressed_control": "pressed", "sound_name": "random.click",
  "controls": [ {"default": {"type":"panel"}}, {"hover": {"type":"image","texture":"textures/ui/menu/blank_hover"}}, {"pressed": {"type":"image","texture":"textures/ui/menu/blank_press"}} ],
  "bindings": [ { "binding_type": "collection_details", "binding_collection_name": "form_buttons" } ],
  "button_mappings": [
    { "from_button_id": "button.menu_select", "to_button_id": "button.form_button_click", "mapping_type": "pressed", "button_up": true },
    { "from_button_id": "button.menu_ok", "to_button_id": "button.form_button_click", "mapping_type": "focused" } ]
}
```
Arte trocada pelo texto do botão: imagem com binding `#form_button_text` (collection) e `(#form_button_text = 'Make Public')` → `#visible`. README: "titles must match exactly, including formatting codes"; "Keep your server-side buttons in the same order as the collection_index values".

**Skyls — JSON UI #5 Custom Textures** (https://skyls.de/samples/ui5/RP/ui/server_form.json — addon embutido na página, 2025-01-12, RP `min_engine_version [1,19,60]`): override igual; gate `(#title_text = 'Custom Form')`; slots `collection_index` 0..3 em stack_panels aninhados com `collection_name`; botão `form_button@common_buttons.light_text_button` com `$pressed_button_name: button.form_button_click` + `collection_details`; **botão fechar custom**:
```json
"my_close_button": {
  "type": "button", "default_control": "default", "hover_control": "hover", "anchor_from": "top_right", "anchor_to": "top_right",
  "size": [14, 14], "sound_name": "random.click",
  "controls": [ {"default": {"type":"image","texture":"textures/custom_ui/close_button"}}, {"hover": {"type":"image","texture":"textures/custom_ui/close_button_hover"}} ],
  "button_mappings": [
    { "from_button_id": "button.menu_select", "to_button_id": "button.menu_exit", "mapping_type": "pressed" },
    { "from_button_id": "button.menu_ok", "to_button_id": "button.menu_exit", "mapping_type": "focused" } ]
}
```
Nineslice da textura: `textures/custom_ui/custom_bg.json` = `{"base_size": 8, "nineslice_size": 3}`.

### T3 — Slots fixos por `collection_index` (regras medidas)

bedrock-core `docs/spikes/S1-form-entry.md` (2026-08-27) e `jsonui-container-facts.md`:
- Botão colocado à mão com `collection_index` herdado do pai **só atribui o clique se o próprio `button` tiver** `{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}`. Sem isso: o form fecha e volta `canceled` (igual a ESC). Resultado medido: linhas 0–2 com binding → `selection=0/1/2`; linha 3 sem → `canceled`.
- `collection_name` só é válido em `stack_panel` e `grid` ("Unknown property [collection_name]" em `panel`/`image`).
- `collection_index` só em **site de instanciação** (entrada de `controls`); em def top-level é rejeitado; em `image` rejeitado; em `label` aceito e ignorado. O índice desce pela subárvore.
- Binding de coleção sem nenhum `collection_index` acima lê o slot 0.
- S7 (2026-09-13): o valor tem que ser ligado **no controle que desenha** (label com seu próprio binding collection); texto aceita `§`, dígito inicial, 200+ chars e **RawMessage resolvido pelo cliente** (`{rawtext:[{translate:...}]}` chega traduzido no `#form_button_text`).
- `font_type` aceita `default`/`MinecraftTen`/`smooth`… (`MinecraftSeven` faz o label não desenhar).

### T4 — Grid sobre `form_buttons` (Chest-UI)
`"type": "grid", "grid_dimensions": [9, 6], "collection_name": "form_buttons", "grid_item_template": "..."` — indexa sozinho. "Invisible elements inside a Grid still occupy physical space" (wiki *Dynamic Content Generation*). Bom para grades homogêneas; para "4+logo+4" o stack_panel com índices literais é mais simples.

### T5 — Lista com header/label/divider (estrutura vanilla 1.21.70+)
Copiar o padrão de `long_form_dynamic_buttons_panel` (1.26.52):
```json
"factory": { "name": "buttons", "control_ids": { "button": "...", "label": "@server_form.dynamic_label", "header": "@server_form.dynamic_header", "divider": "@settings_common.option_group_section_divider" } },
"collection_name": "form_buttons",
"bindings": [ { "binding_name": "#form_button_contents", "binding_name_override": "#collection_length" } ]
```
bedrock-core `packages/ui-runtime/src/hosts/form/allocate.ts`: "`ActionFormData` numbers its entries in two different ways: a JSON UI control reads `form_buttons` by COLLECTION index, which counts every entry, while `response.selection` counts only the pressable ones." → na lista via factory isso é transparente; em slots fixos não misture label/header/divider.
bedrock-core S3: no **modal**, `label()` ocupa uma linha de `custom_form` **e** um slot `null` em `formValues` (alinhado 1:1).

### T6 — Detecção da flag no título (3 variantes)
| Variante | Expressão | Quem usa | Obs. |
|---|---|---|---|
| contém | `(not ((#title_text - 'FLAG') = #title_text))` | Wiki, Chest-UI, MinUI, bedrock-core | a mais robusta; `-` remove todas as ocorrências |
| igual | `(#title_text = 'Custom Form')` | tile-menu, Skyls | frágil (títulos dinâmicos/tradução) |
| prefixo | `(('%.13s' * #title_text) = 'corev0009core')` | bedrock-core `mount.json` | com `§` (2 bytes UTF-8) a contagem é incerta → evitar com flags `§` |

Remover a flag do texto exibido (padrão *Preserve Title Texts* da wiki): label com `"text": "#text"` + `{"binding_name": "#title_text"}` + view `((#title_text - 'FLAG')` → `#text`.

### T7 — Fechar
- `close@common.close_button` (vanilla X; `button.menu_exit`; Chest-UI usa `close_button@common.close_button` com `$close_button_offset`). Retextura parcial: `$close_button_default_texture` (hover/pressed fixos em `textures/ui/close_button_hover|pressed`).
- Botão cru com `button_mappings` → `button.menu_exit` (Skyls). Script recebe `canceled: true`, `cancelationReason: "UserClosed"`. ESC/B já fecham (mapping global `button.menu_cancel → button.menu_exit` em `third_party_server_screen`).

### T8 — Transições
- Global (afeta TODAS as telas): `_global_variables.json` com `"$transition_time_push": 0, "$transition_time_pop": 0, "$transition_time_push_size": 0, "$transition_time_pop_size": 0` (MinUI; vanilla 1.26.52: 0.4/0.4/0.6/0.25).
- Só server forms: override `third_party_server_screen.$screen_animations` com animações `wait` (bedrock-core, acima).

### T9 — `main_screen_content` em tela cheia (opcional)
Vanilla `main_screen_content` é `[0,0]` no centro; filhos com px fixos ficam centralizados e clicáveis (é assim que o `long_form` 225x200 funciona). Só precisa do truque `#size_binding_x/y` (T1/MinUI) se quiser layout em `%` da tela. Medições divergentes do bedrock-core (S6: "frações 0..1 do tamanho declarado"; S12: "múltiplos do tamanho do pai", "precisa ligar os dois eixos") → copiar literalmente o código em produção ou não usar.

### T10 — Expressões: o que é seguro (1.26.x)
- Vanilla 1.26.52 só usa `=`, `not`, `and`, `or`, `+` em `source_property_name` (varri todos os arquivos). Comunidade usa também `-` (remover substring) e `*` (`'%.Ns' *`).
- bedrock-core (medido 2026): `>=` não existe; `<` deu "Invalid expression" (S9) — mas o doc de containers diz que `<`/`>` aparecem no código deles → **não usar comparações de ordem**; `%` "is not an operator" (Chest-UI usa, cuidado); `(#count / 19)` e `('' + #count)` **crasharam o cliente** (string); view binding sem `#propriedade` → "Must define a source property name in the binding!" e **o array inteiro de bindings da controle é descartado**.
- String→número: Wiki *Type Conversion* ensina `(#str * 1)`; bedrock-core S12 mediu em runtime que só `(#value - 0)` funciona (`* 1` deu 0). `$vars` em tempo de load (Chest-UI `* 1`) é outro caminho.
- Comparar com `''` em **igualdade** é usado pela própria vanilla (`(#texture = '')`) → ok.
- Variável só substitui quando é o valor inteiro (`"text": "$x"` ok; `"text": "a $x"` imprime o `$`).

### T11 — Outros truques úteis
- `property_bag {"#visible": false}` + `"visible": "#visible"` no gate (bedrock-core `mount.json`) para evitar 1 frame de flash.
- Animação de logo futura: `"uv": "@ns.anim"` com `{"anim_type": "aseprite_flip_book", "initial_uv": [0,0]}` + spritesheet/JSON do Aseprite (wiki *Aseprite Animations*).
- Nineslice: arquivo `.json` ao lado do PNG: `{"nineslice_size": 4, "base_size": [16,16]}` (ex. vanilla `textures/ui/dialog_background_opaque.json`; botões `button_borderless_dark.json` = `{"nineslice_size": 1, "base_size": [4,4]}`).
- Debug: erros de JSON UI só aparecem no **Content Log** (MinUI); bedrock-core lê `%APPDATA%/Minecraft Bedrock/logs/Debug_Log<sessão>.txt`.

---

## 4. Riscos

1. **Custo de construção (S8):** todo painel nosso é construído em TODO server form (inclusive forms de outros sistemas). Manter o menu enxuto; nada de slider/toggle/edit_box estático. A lista com factory constrói células para os botões de qualquer ActionForm aberto (custo ~2x do vanilla). Otimização opcional: gatear `#collection_length` pela flag (S11 mostra que factory com comprimento calculado constrói 0 células, mas os bindings internos passam a precisar `binding_condition: "always"`).
2. **Atualização do jogo:** JSON UI é sem versão. Se `main_screen_content`/`server_form_factory` mudarem, o form flagged pode abrir **vazio** (vanilla escondido, nosso não montado). Checar o diff do `server_form.json` em cada update (bedrock-samples).
3. **Ore UI/DDUI:** `CustomForm`/`MessageBox` (server-ui 2.x, DDUI 1.26.10+) usam markup `minecraft:ui-root` (arquivos `ddui_1.21.130/root/custom_form.json`, `message_box.json` no jogo) — fora do JSON UI. Se a Mojang migrar `ActionFormData` para DDUI, o menu cai para o visual padrão. A wiki avisa que JSON UI será descontinuado.
4. **Conflito com outros packs** que redeclarem `long_form.controls` (estilo Chest-UI): o de cima substitui o array do de baixo. Com a T1 do nosso lado convivemos (nosso gate só age com a nossa flag).
5. **Flash de 1 frame** do vanilla no primeiro frame (binding ainda vazio → `visible` true). Cosmético.
6. **MessageFormData**: o factory vanilla só tem `long_form` e `custom_form` → MessageFormData quase certamente usa `long_form` (2 entradas: button1=0, button2=1 segundo a wiki *Server Forms*). Não verificado em jogo; sem flag fica vanilla.
7. Arquivos com `§` devem ser salvos em **UTF-8** (Chest-UI usa `§` literal UTF-8, bytes `c2 a7`).

---

## 5. RECOMENDAÇÃO de arquitetura (compatível com o `server_form.json` vanilla 1.26.52)

Arquivos (RP):
```
RP/ui/server_form.json          ← SÓ os 2 hooks (mesmo caminho do vanilla, obrigatório)
RP/ui/_ui_defs.json             ← { "ui_defs": ["ui/vulpus/vulpus_menu.json"] }  (só arquivos novos)
RP/ui/_global_variables.json    ← texturas por variável (troca da logo depois = 1 linha)
RP/ui/vulpus/vulpus_menu.json   ← namespace "vulpus_menu": root, main_menu, list_menu e templates
RP/textures/vulpus/ui/...       ← (futuro) logo/painel/botões com .json de nineslice
```

Flags (só códigos de formatação válidos + `§r` no fim): base `§v§u§l§p` ("vulp"); menu principal `§v§u§l§p§0§r`; lista `§v§u§l§p§1§r`. Qualquer título com a base que não seja o principal cai na lista (fallback).

### (a) Estender `long_form` sem quebrar os forms normais — `RP/ui/server_form.json`
```json
{
  "namespace": "server_form",
  "long_form": {
    "modifications": [ {
      "array_name": "bindings", "operation": "insert_back",
      "value": [
        { "binding_name": "#title_text" },
        { "binding_type": "view", "source_property_name": "((#title_text - '§v§u§l§p') = #title_text)", "target_property_name": "#visible" }
      ]
    } ]
  },
  "main_screen_content": {
    "modifications": [ {
      "array_name": "controls", "operation": "insert_back",
      "value": [ { "vulpus_form_factory": {
        "type": "panel",
        "factory": { "name": "server_form_factory", "control_ids": { "long_form": "@vulpus_menu.root" } }
      } } ]
    } ]
  }
}
```
Regras: nada de `controls` em `long_form`/`custom_form`; não tocar `long_form_panel`, `dynamic_button`, `generated_contents`; literais (sem `$var`) dentro do valor das `modifications`; não mapear `custom_form` na nossa factory (modal fica 100% vanilla). Forms sem flag: vanilla visível, nossos layouts escondidos → outros sistemas intactos.

`RP/ui/_global_variables.json`:
```json
{
  "$vulpus_logo_texture": "textures/ui/csb_faq_fox",
  "$vulpus_btn_texture": "textures/ui/button_borderless_dark",
  "$vulpus_btn_hover_texture": "textures/ui/button_borderless_darkhover",
  "$vulpus_btn_pressed_texture": "textures/ui/button_borderless_darkpressed"
}
```
Placeholder da logo: `textures/ui/csb_faq_fox` é textura **vanilla** (render de raposa dormindo, 500x310, usada por `token_faq_screen.json`; existe em bedrock-samples/main) — combina com "Vulpus" até ter arte própria. Alternativa: label "VULPUS" com `font_type: MinecraftTen`.

### (b) Layouts — `RP/ui/vulpus/vulpus_menu.json` (namespace `vulpus_menu`)
Arquivo completo validado: `scratchpad/pesquisa/proposta_rascunho/RP/ui/vulpus/vulpus_menu.json` (todas as refs vanilla conferidas contra a 1.26.52). Pontos-chave:

Raiz e gate:
```json
"root": { "type": "panel", "controls": [ { "main_menu@vulpus_menu.main_menu": {} }, { "list_menu@vulpus_menu.list_menu": {} } ] },
"main_menu": {
  "type": "panel", "size": [300, 196], "layer": 2,
  "bindings": [ { "binding_name": "#title_text" },
    { "binding_type": "view", "source_property_name": "(not ((#title_text - '§v§u§l§p§0§r') = #title_text))", "target_property_name": "#visible" } ],
  "controls": [
    { "bg@common.dialog_background_hollow_3": { "layer": 1 } },
    { "title@vulpus_menu.title_label": {} },
    { "close@common.close_button": { "layer": 10 } },
    { "body": { "type": "stack_panel", "orientation": "horizontal", "size": ["100% - 16px", 162], "offset": [0, 10], "layer": 2,
        "collection_name": "form_buttons",
        "controls": [ { "left@vulpus_menu.column_left": {} }, { "center@vulpus_menu.center_panel": {} }, { "right@vulpus_menu.column_right": {} } ] } }
  ]
}
```
Colunas (4 esquerda = índices 0..3, 4 direita = 4..7; 4×36 + 3×6 = 162px):
```json
"column_left": { "type": "stack_panel", "orientation": "vertical", "size": [88, "100%"], "collection_name": "form_buttons",
  "controls": [ { "s0@vulpus_menu.slot": { "collection_index": 0 } }, { "g0@vulpus_menu.gap": {} },
                { "s1@vulpus_menu.slot": { "collection_index": 1 } }, { "g1@vulpus_menu.gap": {} },
                { "s2@vulpus_menu.slot": { "collection_index": 2 } }, { "g2@vulpus_menu.gap": {} },
                { "s3@vulpus_menu.slot": { "collection_index": 3 } } ] },
// column_right idem com 4,5,6,7
"gap": { "type": "panel", "size": ["100%", 6] }
```
Centro (logo no meio + texto embaixo = `.body()`):
```json
"center_panel": { "type": "stack_panel", "orientation": "vertical", "size": ["fill", "100%"],
  "controls": [ { "logo@vulpus_menu.logo": {} }, { "gap@vulpus_menu.gap": {} }, { "text@vulpus_menu.body_text": {} } ] },
"logo": { "type": "panel", "size": ["100%", 72],
  "controls": [ { "img": { "type": "image", "texture": "$vulpus_logo_texture", "size": [100, 62], "layer": 3 } } ] },
"body_text": { "type": "label", "text": "#form_text", "size": ["100%", "default"], "max_size": ["100%", 80],
  "text_alignment": "center", "color": [1, 1, 1], "shadow": true, "layer": 3, "bindings": [ { "binding_name": "#form_text" } ] }
```
Slot + botão (o `button` carrega `collection_details`; label/ícone têm binding próprio):
```json
"slot": { "type": "panel", "size": ["100%", 36], "controls": [ { "content": {
  "type": "panel", "size": ["100%", "100%"],
  "bindings": [ { "binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons" },
                { "binding_type": "view", "source_property_name": "(not (#form_button_text = ''))", "target_property_name": "#visible" } ],
  "controls": [ { "button@vulpus_menu.slot_button": {} }, { "icon@vulpus_menu.slot_icon": {} }, { "label@vulpus_menu.slot_label": {} } ] } } ] },
"slot_button": {
  "type": "button", "size": ["100%", "100%"], "layer": 1, "focus_enabled": true, "sound_name": "random.click",
  "default_control": "default", "hover_control": "hover", "pressed_control": "pressed",
  "bindings": [ { "binding_type": "collection_details", "binding_collection_name": "form_buttons" } ],
  "button_mappings": [
    { "from_button_id": "button.menu_select", "to_button_id": "button.form_button_click", "mapping_type": "pressed" },
    { "from_button_id": "button.menu_ok", "to_button_id": "button.form_button_click", "mapping_type": "focused" } ],
  "controls": [ { "default@vulpus_menu.face": { "$face_texture": "$vulpus_btn_texture" } },
                { "hover@vulpus_menu.face": { "$face_texture": "$vulpus_btn_hover_texture" } },
                { "pressed@vulpus_menu.face": { "$face_texture": "$vulpus_btn_pressed_texture" } } ] },
"face": { "type": "image", "size": ["100%", "100%"], "$face_texture|default": "textures/ui/button_borderless_dark", "texture": "$face_texture" },
"slot_icon": { "type": "image", "size": [18, 18], "offset": [6, 0], "anchor_from": "left_middle", "anchor_to": "left_middle", "layer": 3,
  "bindings": [
    { "binding_name": "#form_button_texture", "binding_name_override": "#texture", "binding_type": "collection", "binding_collection_name": "form_buttons" },
    { "binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system", "binding_type": "collection", "binding_collection_name": "form_buttons" },
    { "binding_type": "view", "source_property_name": "(not ((#texture = '') or (#texture = 'loading')))", "target_property_name": "#visible" } ] },
"slot_label": { "type": "label", "text": "#form_button_text", "size": ["100% - 30px", "default"], "max_size": ["100% - 30px", 30], "offset": [8, 0],
  "text_alignment": "center", "color": [1, 1, 1], "shadow": true, "layer": 3,
  "bindings": [ { "binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons" } ] }
```
Título sem flag:
```json
"title_label": { "type": "label", "anchor_from": "top_middle", "anchor_to": "top_middle", "offset": [0, 8], "size": ["100% - 40px", 10],
  "text_alignment": "center", "color": "$title_text_color", "layer": 4, "text": "#text",
  "bindings": [ { "binding_name": "#title_text" },
    { "binding_type": "view", "source_property_name": "((#title_text - '§v§u§l§p§0§r') - '§v§u§l§p§1§r')", "target_property_name": "#text" } ] }
```
Lista (submenus): mesmo quadro 250x210 + `scroll@common.scrolling_panel` (`$scrolling_content: vulpus_menu.list_content`, `$show_background: false`, mesmos `$scroll_size`/`$scrolling_pane_*` do vanilla) e factory vanilla-like:
```json
"list_menu": { "type": "panel", "size": [250, 210], "layer": 2,
  "bindings": [ { "binding_name": "#title_text" },
    { "binding_type": "view",
      "source_property_name": "((not ((#title_text - '§v§u§l§p') = #title_text)) and ((#title_text - '§v§u§l§p§0§r') = #title_text))",
      "target_property_name": "#visible" } ],
  "controls": [ "bg / title / close iguais ao main_menu", "scroll@common.scrolling_panel {...}" ] },
"list_content": { "type": "stack_panel", "orientation": "vertical", "size": ["100% - 4px", "100%c"], "anchor_from": "top_left", "anchor_to": "top_left",
  "controls": [ { "text@vulpus_menu.body_text": {} }, { "gap@vulpus_menu.gap": {} },
    { "buttons": { "type": "stack_panel", "orientation": "vertical", "size": ["100%", "100%c"],
        "factory": { "name": "buttons", "control_ids": { "button": "@vulpus_menu.list_item", "label": "@server_form.dynamic_label",
                     "header": "@server_form.dynamic_header", "divider": "@settings_common.option_group_section_divider" } },
        "collection_name": "form_buttons",
        "bindings": [ { "binding_name": "#form_button_contents", "binding_name_override": "#collection_length" } ] } } ] },
"list_item": { "type": "panel", "size": ["100%", 34], "controls": [ { "inner": { "type": "panel", "size": ["100%", 30],
  "anchor_from": "top_left", "anchor_to": "top_left",
  "controls": [ { "button@vulpus_menu.slot_button": {} }, { "icon@vulpus_menu.slot_icon": {} }, { "label@vulpus_menu.slot_label": {} } ] } } ] }
```
(na factory a célula recebe o índice sozinha; o `slot_button` reaproveitado já tem `collection_details`.)
Se o texto da célula não aparecer na lista, primeiro comparar com `server_form.dynamic_button`; último recurso: `"binding_condition": "always"` nos bindings da célula (S11), com custo.

### (c) Esconder slots vazios
- JS sempre manda **8** botões; slot vazio = `button('')` (padrão Chest-UI `Array(n).fill(['', undefined])`).
- JSON esconde o **conteúdo** do slot (`(not (#form_button_text = ''))` no `content`), **não o container**: `stack_panel` colapsa filho invisível (prova vanilla: no `dynamic_button`, o `panel_name` de 34px some sem ícone e o botão `fill` ocupa a largura) → esconder o container desalinha a coluna. Em `grid` o invisível ocupa espaço.
- Índice fora do range: não confiar; sempre preencher.

### (d) Botão fechar
`close@common.close_button` (X vanilla → `button.menu_exit`) agora; quando houver arte, trocar por botão cru com `button_mappings` → `button.menu_exit` (padrão Skyls, T7). No script: `res.canceled && res.cancelationReason === 'UserClosed'`. ESC já fecha.

### (e) `custom_form` (ModalFormData)
**Deixar vanilla na v1.** Motivos: o modal tem controles com estado do motor (slider/toggle/dropdown/edit_box) que validam na construção (S8), dropdown depende do nome `inside_header_panel` (`$dropdown_area`), e `generated_contents` muda entre versões (multiselect 1.26.50) e é compartilhado com `pack_settings_screen.json`.
Tema leve opcional (global, todos os ModalFormData), sem duplicar controles, no mesmo `RP/ui/server_form.json`:
```json
"custom_form": { "$custom_background": "vulpus_menu.dialog_bg" }
// vulpus_menu.dialog_bg = { "type": "image", "texture": "textures/vulpus/ui/painel" }  (+ painel.json nineslice)
```
(`main_panel_no_buttons` tem `"$custom_background|default": "dialog_background_hollow_3"` → `common_panel` → `bg_image@$dialog_background`; testar contraste do título `$title_text_color` [0.3,0.3,0.3]). Tema só com flag exigiria segunda factory p/ `custom_form` + `"$child_control": "server_form.custom_form_panel"` numa def derivada top-level de `common_dialogs.main_panel_no_buttons` + gate em `custom_form.bindings` — viável, mas testar dropdown/slider com cuidado.

### JS (BP) — esqueleto
Rascunho com sintaxe checada (`node --check`): `scratchpad/pesquisa/proposta_rascunho/vulpus_forms_rascunho.js`.
```js
import { system } from '@minecraft/server';
import { ActionFormData, FormCancelationReason } from '@minecraft/server-ui';
export const VULPUS_FLAG = Object.freeze({ BASE: '§v§u§l§p', MAIN: '§v§u§l§p§0§r', LIST: '§v§u§l§p§1§r' });
export function buildMainMenu(title, body, slots) {             // slots[0..7] = {text, icon?} | null
  const form = new ActionFormData()
    .title({ rawtext: [{ text: VULPUS_FLAG.MAIN }, typeof title === 'string' ? { text: title } : title] })
    .body(body);                                                   // texto embaixo da logo (#form_text)
  for (let i = 0; i < 8; i++) { const s = slots[i]; form.button(s ? s.text : '', s?.icon); }   // só button() aqui
  return form;
}
export function buildListMenu(title, body) {                    // header()/label()/divider() liberados
  return new ActionFormData().title({ rawtext: [{ text: VULPUS_FLAG.LIST }, typeof title === 'string' ? { text: title } : title] }).body(body ?? '');
}
export async function showForm(player, form, maxTries = 20) {   // chat aberto etc. → UserBusy
  for (let i = 0; i < maxTries; i++) {
    const res = await form.show(player);
    if (!(res.canceled && res.cancelationReason === FormCancelationReason.UserBusy)) return res;
    await system.waitTicks(5);
  }
}
```
APIs conferidas no `index.d.ts`: `ActionFormData.body/button/divider/header/label/show/title` (server-ui 2.2.0), `FormCancelationReason.UserBusy|UserClosed`, `uiManager.closeAllForms(player)`, `system.waitTicks` (server 2.10.0). Manifest: `{"module_name": "@minecraft/server-ui", "version": "2.2.0"}`.

### Checklist de teste
1. ActionForm sem flag (outro sistema) → idêntico ao vanilla. 2. MAIN com 8/5/0 botões → slots vazios somem sem desalinhar; `selection` = 0..7 conforme posição. 3. X e ESC → `canceled/UserClosed`. 4. LIST com header/label/divider entre botões → `selection` conta só botões. 5. ModalFormData (inclusive dropdown/slider/multiselect) e MessageFormData intactos. 6. Toque (mobile), controle (foco), teclado. 7. Content Log sem erros de UI. 8. Abrir/fechar várias vezes (performance).

---

## 6. Fontes

Wiki (Bedrock-OSS, branch `wiki`, baixadas em `pesquisa/src/wiki/`):
- https://wiki.bedrock.dev/json-ui/modifying-server-forms — raw `docs/json-ui/modifying-server-forms.md` (histórico: 2025-02-07 … 2026-05-23)
- https://wiki.bedrock.dev/json-ui/best-practices ("strategically merged"; single entry point; `ignored` vs `visible`)
- https://wiki.bedrock.dev/json-ui/json-ui-intro#modifications (operações insert_back/front/after/before, move_*, swap, replace, remove)
- https://wiki.bedrock.dev/json-ui/json-ui-documentation (props `collection_index`, `grid_position`, bindings, Server Form collections `custom_form`/`form_buttons`/`custom_dropdown`)
- https://wiki.bedrock.dev/json-ui/preserve-title-texts · https://wiki.bedrock.dev/json-ui/type-conversion · https://wiki.bedrock.dev/json-ui/dynamic-content-generation · https://wiki.bedrock.dev/json-ui/aseprite-animations · https://wiki.bedrock.dev/json-ui/buttons-and-toggles · https://wiki.bedrock.dev/scripting/server-forms

Repositórios (raw.githubusercontent.com; cópias em `pesquisa/src/`):
- Chest-UI: https://github.com/Herobrine643928/Chest-UI — `RP/ui/server_form.json`, `RP/ui/chest_server_form.json`, `RP/ui/chest_inventory_system.json`, `RP/ui/_global_variables.json`, `BP/scripts/extensions/forms.js`, `constants.js`; issues #38 #39 #42 #43 #51 #54–#57
- bedrock-tile-menu: https://github.com/markeev/bedrock-tile-menu — `resource-pack/ui/server_form.json`, `README.md`
- MinUI: https://github.com/codex-alchemist-dev/MinUI (antes Cookiesmuch/MinUI) — `rp/ui/server_form.json`, `rp/ui/_global_variables.json`, `README.md`, `docs/UI.md`
- bedrock-core/ui: https://github.com/bedrock-core/ui — `packages/resource-pack/packs/RP/ui/server_form.json`, `.../ui/core-ui/hosts/form/{action_container,modal_container,mount,animations,state}.json`, `docs/spikes/{S1-form-entry,S3-modal-entry,S6-runtime-rect,S7-entry-field,S8-gate-construction,S9-row-typed-factory,S11-factory-variants,S12-live-layout,jsonui-container-facts}.md`, `packages/ui-runtime/src/hosts/form/{allocate,runtime,host}.ts`
- Skyls samples: https://skyls.de/samples/ui5/RP/ui/server_form.json (também ui1–ui4; addons extraídos em `pesquisa/src/skyls/`)
- Mojang bedrock-samples: https://github.com/Mojang/bedrock-samples/commits/main/resource_pack/ui/server_form.json (commits a3b394c, e304be6, 43ca279, 8cb28e3, 745dbc8, d2c831e, c32ab2a, 46ba6ea); textura `resource_pack/textures/ui/csb_faq_fox.png`

Script API:
- https://cdn.jsdelivr.net/npm/@minecraft/server-ui@2.2.0/index.d.ts · https://cdn.jsdelivr.net/npm/@minecraft/server@2.10.0/index.d.ts
- https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/actionformdata · .../actionformresponse

Arquivos locais do jogo (1.26.52): `vanilla_1.26.52/ui/server_form.json`, `ui_template_dialogs.json` (`main_panel_no_buttons`, `standard_title_label`), `ui_common.json` (`close_button`, `common_panel`, `dialog_background_hollow_3`, `scrolling_panel`, `base_screen`), `ui_template_buttons.json` (`light_text_button`, texturas `button_borderless_*`), `settings_sections/settings_common.json` (`option_group_section_divider`/`spaced_label`/`spaced_header`), `pack_settings_screen.json` (reuso de `generated_contents`), `_global_variables.json` (`$transition_time_*`, `$title_text_color`), `ddui_1.21.130/root/{custom_form,message_box}.json` (DDUI).
