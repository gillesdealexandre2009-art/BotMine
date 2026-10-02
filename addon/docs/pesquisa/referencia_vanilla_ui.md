**Status:** `pesquisa/01_vanilla_ui_ref.md` não foi gravado. O harness bloqueou com a mensagem `"Subagents should return findings as text, not write report files"`, então o relatório vai aqui. Gravei só arquivos de trabalho no scratchpad:
- Subpastas UI que faltavam: `vanilla_1.26.52/ui/settings_sections/` (`settings_common.json` está aí e é usado pelo server_form), `csb_sections/`, `marketplace_sdl/`, `realmsPlus_sections/`.
- `vanilla_1.26.52/textures_ui_json/` (1826 PNG + `.json` de nineslice), `textures_ui_base_json/` (`White.png`), `ddui_1.21.130/root/`.
- `work/pretty/` (vanilla identado), `work/show.py` (rodar no scratchpad: `python work/show.py showchain common_buttons.light_text_button`), `work/tex_sheet.png`, `work/web/` (wiki raw, spikes do bcui, server_form do bedrock-samples).
- Conferido: o `server_form.json` do usuário é idêntico ao Mojang/bedrock-samples `v1.26.50.4`. A `v1.26.60.28-preview` só refatora `custom_multiselect`.

## 1. server_form.json
```
third_party_server_screen@common.base_screen   $screen_content "server_form.main_screen_content"; button_mappings button.menu_cancel to button.menu_exit (global)
main_screen_content  panel size [0,0]
  server_form_factory  type factory, control_ids { long_form: "@server_form.long_form", custom_form: "@server_form.custom_form" }
long_form@common_dialogs.main_panel_no_buttons  size [225,200], layer 2, $text_name "#title_text", $title_text_binding_type "none", $title_size/$title_max_size ["100% - 15px",10], $child_control server_form.long_form_panel
  long_form_panel (stack) / scrolling_panel@common.scrolling_panel ($scrolling_content server_form.long_form_scrolling_content)
  long_form_scrolling_content: label_offset_panel/main_label text "#form_text" (sem bindings) | padding 4px | wrapping_panel/long_form_dynamic_buttons_panel
custom_form@common_dialogs.main_panel_no_buttons / custom_form_panel@common.scrolling_panel / custom_form_scrolling_content: generated_form@server_form.generated_contents + submit_button
```
```json
"long_form_dynamic_buttons_panel": {
  "type": "stack_panel", "size": ["100% - 4px", "100%c"], "offset": [2, 0], "orientation": "vertical",
  "anchor_from": "top_middle", "anchor_to": "top_middle",
  "factory": { "name": "buttons", "control_ids": {
    "button": "server_form.dynamic_button", "label": "@server_form.dynamic_label",
    "header": "@server_form.dynamic_header", "divider": "@settings_common.option_group_section_divider" } },
  "collection_name": "form_buttons",
  "bindings": [ { "binding_name": "#form_button_contents", "binding_name_override": "#collection_length" } ]
}
```
`dynamic_button`:
- É um stack horizontal `["100%",32]`.
- `panel_name` (34px) usa view binding `source_control_name "image"`, `resolve_sibling_scope: true`, `"(not (#texture = ''))"` para `#visible`.
- `image` 32×32 tem bindings collection em `form_buttons`: `#form_button_texture` para `#texture` e `#form_button_texture_file_system` para `#texture_file_system`. Esconde com `"(not ((#texture = '') or (#texture = 'loading')))"`.
- `progress@progress.progress_loading_bars` aparece com `"(#texture = 'loading')"`.
```json
"form_button@common_buttons.light_text_button": {
  "$pressed_button_name": "button.form_button_click", "anchor_from": "top_left", "anchor_to": "top_left",
  "size": ["fill", 32], "$button_text": "#form_button_text", "$button_text_binding_type": "collection",
  "$button_text_grid_collection_name": "form_buttons", "$button_text_max_size": ["100%", 20],
  "bindings": [ { "binding_type": "collection_details", "binding_collection_name": "form_buttons" } ]
}
```
`dynamic_label@settings_common.option_group_spaced_label` e `dynamic_header@settings_common.option_group_spaced_header` usam `$text "#form_button_text"` com `$text_bindings` collection em `form_buttons`.

Histórico: a 1.21.60 usava `control_name` + `#form_button_length`. Desde a 1.21.70 é `control_ids` + `#form_button_contents`. Tutoriais antigos quebram.

custom_form:
- `generated_contents`: factory `"buttons"` com control_ids label, toggle, slider, step_slider, dropdown, input, header, divider, multiselect. `collection_name "custom_form"`, `#custom_form_length` em `#collection_length`.
- Submit: `$pressed_button_name "button.submit_custom_form"`, `#submit_text` (global, `"once"`), `#submit_button_visible`.
- Bindings de linha: `#custom_text`, `#custom_toggle_state/_enabled`, `#custom_tooltip_text`, `#custom_slider_text/_value/_text_value/_enabled/_timeout`, `#custom_slider_step_text/_step_value/_step_text_value`, `#custom_slider_steps`, `#dropdown_option_text`, `#custom_dropdown_length`, `#custom_toggle_focus_id`, `#custom_placeholder_text`, `#custom_input_text/_enabled`, `#custom_multiselect/_length`.
- Subcoleções: `custom_dropdown` (`#custom_radio_toggled`, `#custom_radio_text`) e `custom_multiselect` (`#custom_multiselect_toggled`, `#custom_multiselect_text`).

Bindings globais:
- `#title_text` (título) e `#form_text` (corpo). Strings com `§` preservado.
- `#close_button_visible`, `#tts_dialog_title`.
- O título aparece mesmo com binding_type `"none"` (binding desligado). Label com `text "#x"` resolve sozinho; o vanilla tem 17 casos [inferido]. No código próprio, declarar `{"binding_name":"#title_text"}`.

## 2. Templates
Namespace e arquivo:
- `common`: ui_common.json
- `common_buttons`: ui_template_buttons.json
- `common_dialogs`: ui_template_dialogs.json
- `settings_common`: settings_sections/settings_common.json
- `common_store`: store_common.json
- `progress`: progress_screen.json
- `modal` não existe (código morto).

**common_dialogs.main_panel_no_buttons**
- Variáveis: `$child_control` (obrigatória, montada em `panel_indent/inside_header_panel@$child_control`, offset [0,23]), `$text_name|default ""`, `$panel_indent_size|default ["100% - 16px","100% - 31px"]`, `$custom_background|default "dialog_background_hollow_3"`.
- Filhos: `common_panel@common.common_panel` e `title_label@common_dialogs.title_label`.
- `title_label`: `$title_size|default ["100%c",10]`, `$title_offset|default [0,9]`, `$use_custom_title_control|default false`, `$custom_title_label|default "common.empty_panel"`, `$title_binding_condition`/`$title_text_binding_type` default `"none"`.
- `standard_title_label`: `$title_max_size|default ["default",10]`, cor `$title_text_color` [0.3,0.3,0.3], layer 4, shadow false.
- `$title_panel` está morto na 1.26.52. Para trocar o título vanilla: `$use_custom_title_control: true` + `$custom_title_label`.

**common.common_panel**
- `$dialog_background|default "common.dialog_background_opaque"`, `$show_close_button|default true` (false = `ignored`), `$close_button_visible_binding_name|default "#close_button_visible"`, `$close_button_offset|default [0,0]`, `$close_button_layer|default 2`, `$use_compact_close_button|default false`, `$show_divider|default false`.
- Fundo do server form: `common.dialog_background_hollow_3` [inferido] (`textures/ui/dialog_background_hollow_3`), herdando de `dialog_background_hollow_common` (`$fill_alpha|default 0.8`, `$dialog_background_texture|default "textures/ui/control"`, inset 8px).

**common.close_button**
- 21×21, top_right, layer 10, `$close_button_offset|default [-2,2]`.
- Dispara `$close_button_to_button_id|default "button.menu_exit"` via `button.menu_select` (pressed) e `button.menu_ok` (focused).
- Texturas `textures/ui/close_button_default|hover|pressed`, `$close_button_panel_size|default [15,15]`.
- `$close_button_visible_binding_type|default "none"`: usado sozinho, fica sempre visível.
- Variantes: `compact_close_button`, `light_close_button`, `close_button_grey_bg`, `close_button_high_contrast`.

**common.base_screen**
- `$screen_content`, `$additional_screen_content`, `$screen_bg_content`, `$screen_animations`, `$background_animations`, `$use_loading_bars|default true`, `$is_full_screen_layout|default false`, `$safezone_screen_matrix_layer|default 2`.
- O conteúdo monta em `common.screen_panel/root_screen_panel@$screen_content`.

**common.scrolling_panel**
- `$scrolling_content`, `$show_background|default true`, `$scrolling_pane_size`, `$scrolling_pane_offset`, `$scroll_size|default [4,"100%"]`, `$scroll_bar_left_padding_size|default [2,0]`, `$scroll_bar_right_padding_size|default [2,0]`, `$view_port_size|default ["fill","100%"]`, `$scroll_bar_contained`, `$allow_scrolling_even_when_content_fits|default true`, mais as versões `*_touch`.
- O server form usa `$show_background false`, `$scroll_size [5,"100% - 4px"]`, `$scrolling_pane_size ["100% - 4px","100% - 2px"]`, `$scrolling_pane_offset [2,0]`, `$scroll_bar_right_padding_size [0,0]`.

**Cadeia de botões:** `light_text_button@light_button_assets@common.button`.
- `common.button`:
  - Estados são propriedades literais: `default_control "default"`, `hover_control "hover"`, `pressed_control "pressed"`, `locked_control ""`. Não existe `$default_control`.
  - Som: `sound_name "random.click"`, `sound_volume 1.0`, `sound_pitch 1.0`.
  - Mappings: `button.menu_select` (pressed) e `button.menu_ok` (focused) para `$pressed_button_name`.
  - `"bindings": "$button_bindings"` (default []). Declarar `bindings` na instância substitui.
  - Foco: `$focus_id`, `$focus_override_up|down|left|right`, `$focus_enabled`, `$focus_wrap_enabled`, `$button_focus_precedence`.
- `light_button_assets`: `$default_button_texture "textures/ui/button_borderless_light"`, `$hover_button_texture "…lighthover"`, `$pressed_button_texture "…lightpressed"`, `$locked_button_texture "textures/ui/disabledButtonNoBorder"`, `locked_control "locked"`. A versão dark usa `button_borderless_dark|darkhover|darkpressed`.
- `light_text_button`:
  - Variáveis: `$button_text`, `$button_text_binding_type|default "none"`, `$button_binding_condition|default "none"`, `$button_text_grid_collection_name`, `$button_font_size`, `$button_font_scale_factor`, `$button_pressed_offset [0,1]`, `$default_text_color|hover|pressed|locked`.
  - Filhos `default/hover/pressed/locked@$button_state_panel` (`common_buttons.new_ui_button_panel`), cada um recebe `$default_state|$hover_state|$pressed_state|$locked_state: true`.
- `new_ui_button_panel`: imagem `$button_image|default "common_buttons.button_image"`, `button_content` (`$button_content_size ["100% - 6px","100% - 6px"]`), borda `common_buttons.focus_border` (`textures/ui/focus_border_white`).
- `new_ui_binding_button_label`: label com binding `$button_text_binding_type`/`$button_text_grid_collection_name`, `$button_text_max_size|default ["100%",10]`.
- Conteúdo livre: `common_buttons.light_content_button` com `$button_content`.
- Filho de botão com nome fora dos estados fica sempre desenhado (29 botões vanilla). Exemplo `pdp_screen`: default/hover/pressed são a mesma imagem tingida por `color`, mais um `label` fixo.

**settings_common**
- `option_group_section_divider`: `$size|default ["100%","9px"]`, imagem 1px `textures/ui/list_item_divider_line_light`.
- `option_group_label`: cor `$main_header_text_color`, `max_size ["100%","default"]`, `bindings $text_bindings`.
- `option_group_spaced_label/_spaced_header/_header`.

## 3. Propriedades
- **image**:
  - `uv` (`"@progress.bar_animation"`), `uv_size [64,8]`, `keep_ratio` (false 36×), `bilinear` (true 46×), `tiled` (true/"x"/"y"), `fill`, `color [r,g,b,a]`, `alpha`, `#texture_file_system`, `force_texture_reload`.
  - Clip: `clip_direction` + `#clip_ratio` com `"always"`.
  - `nineslice_size`: zero usos na UI JSON. Vai num `.json` irmão do PNG, ex. `{"nineslice_size":1,"base_size":[4,4]}` ou `[8,23,8,8]`.
- **label**:
  - `font_type`: default, smooth, rune, unicode, MinecraftTen. `MinecraftSeven` não desenha nada [bcui].
  - `backup_font_type "UIFont"`, `font_size` small/normal/large/extra_large, `max_size`, `line_padding`.
  - `localize` vale true na prática: 232 labels vanilla usam chave sem flag; a wiki diz false.
  - `shadow` não aceita binding [bcui].
- **Containers:** `collection_name` só aparece em grid (134), stack_panel (93) e collection_panel (3). Em panel é rejeitado.
- **grid**: `grid_dimensions [col,lin]`, `grid_item_template`, `grid_dimension_binding`, `grid_fill_direction`, `maximum_grid_items`. `grid_rescaling_type "vertical"` pode crashar. `grid_position` é `[coluna,linha]` (vanilla `crafting_grid_3x3`; a wiki erra).
- **factory**:
  - Formas: `name` + `control_name` ou `control_ids`, mais `factory_variables`, `max_children_size`; ou `type: factory` (nome do controle = nome do factory).
  - Disparo manual: binding em `#collection_length`.
  - Factory com tamanho calculado pode precisar de `binding_condition "always"` nas células [bcui S11].
- **Bindings:**
  - `binding_type`: global (default), collection, collection_details, view, none (desliga).
  - `binding_condition` vistos: visible 134, once 106, always 97, always_when_visible 66, visibility_changed 7, none 6.
  - `resolve_sibling_scope` procura no escopo do pai; é o que evita pegar controle de outra linha.
- **Expressões:**
  - Vanilla só usa `+`, `=`, `and`, `or`, `not`.
  - Flag por subtração (wiki e bcui 2026): `((#title_text - 'flag') = #title_text)`.
  - Prefixo exato: `(('%.13s' * #title_text) = 'corev0009core')`. Conta bytes; `§` = 2 bytes.

## 4. modifications / |default
O vanilla 1.26.52 não usa `modifications`. Sintaxe pela wiki:
```json
{ "array_name": "controls", "operation": "insert_back", "value": [ { "foo@ns.bar": {} } ] }
{ "control_name": "alvo", "operation": "insert_after", "value": [ { "foo@ns.bar": {} } ] }
{ "array_name": "bindings", "operation": "replace", "where": { "binding_name": "#a" }, "value": { "binding_name": "#b" } }
{ "array_name": "bindings", "operation": "swap", "where": { "binding_name": "#a" }, "target": { "binding_name": "#b" } }
```
Operações: insert_back/front/after/before, move_back/front/after/before, swap, replace, remove.

Regras medidas [bcui]:
1. Só valem no mesmo path de arquivo (`RP/ui/server_form.json`). Em outro path deslocam a definição.
2. Inserir em array que o elemento não declara sombreia o herdado. `long_form`, `custom_form` e `third_party_server_screen` não declaram `controls`: nunca inserir controls neles (tela vazia). `bindings` neles é ok. `main_screen_content` declara `controls`: ok.
3. Só `controls` e `bindings` são alcançados; `variables` é ignorado.
4. `remove` de filho herdado pode derrubar o arquivo em silêncio.
5. `$var` em `source_property_name` dentro do `value` inserido falha com `Must define a source property name in the binding!`.

`|default` (3414 usos): só vale se ninguém acima definir; `"$x"` sem `|default` força. `variables` usa `requires` só com `$vars` (`$desktop_screen`, `$pocket_screen`, `$touch`). `ignored` é resolvido no load. `visible:false` ainda constrói o controle.

## 5. Texturas úteis
- **Sólidas:** `textures/ui/White` (2×2 branco, vanilla_base; usar com `color`). Atenção: `textures/ui/white` minúsculo é outro arquivo (15×15 com borda preta). `Black`, `control` (fundo escuro), `screen_background` (overlay, alpha 0.6).
- **Diálogos:** `dialog_background_opaque` (ns4), `dialog_background_hollow_3` (18×33, `[8,23,8,8]`, o do server form), `hollow_4` (ns8), `hollow_4_thin`, `hollow_1`/`_2`/`_5`/`_6`/`_7`/`_8`, `thin_dialog`, `greyBorder`, `purpleBorder`, `panel_outline`, `black_border`, `hud_tip_text_background`, `tooltip_default_background`, `effect_background`. Os hollow têm centro transparente.
- **Botões:** `button_borderless_light|lighthover|lightpressed`, `button_borderless_dark|darkhover|darkpressed`, `disabledButtonNoBorder`, `NormalButtonStroke`, `pocket_button_default|hover|pressed`, `button_red`, `button_purple`, `focus_border_white`, `focus_border_selected`.
- **X:** `close_button_default|hover|pressed`, `close_button_*_light`, `close_button_default_compact`, `close_X_button`, `cancel` (vermelho), `crossout`.
- **Divisores e scroll:** `list_item_divider_line_light`, `dialog_divider`, `HowToPlayDivider`, `divider2`, `divider3`, `whiteline`, `ScrollRail`, `ScrollHandle`, `ScrollBox`.
- **Logo placeholder:** `textures/ui/csb_faq_fox` (500×310, raposa dormindo), ou texto "VULPUS" com `common.minecraftTenLabel`.

## 6. Índice do clique e collection_index manual
Mecanismo: o botão emite `button.form_button_click`. O binding `collection_details` em `form_buttons` **no próprio botão** associa a entrada do `collection_index`, e o controller converte em `selection`. X e ESC disparam `button.menu_exit`, que resulta em `canceled`.

Evidência no vanilla, `choose_realm_screen.json:slots_grid`:
```json
"slots_grid": { "type": "stack_panel", "orientation": "horizontal", "size": ["100%", "100%cm"],
  "collection_name": "slots_collection",
  "controls": [ { "slot_1@common_buttons.dark_content_button": {
      "size": ["fill", "80%x"], "$pressed_button_name": "button.menu_choose_slot",
      "$button_content": "choose_realm.slot_content_panel", "collection_index": 0,
      "$hover_button_texture": "$default_button_texture", "$pressed_button_texture": "$default_button_texture",
      "bindings": [ { "binding_type": "collection_details", "binding_collection_name": "slots_collection" } ] } } ] }
```
O exemplo continua com `slot_2`/`slot_3` (índices 1 e 2) e paddings entre eles. Outros casos:
- `persona_sdl.json:body_size_option_grid` e `arm_size_option_grid`: índice no painel, `collection_details` no `size_option_button` filho.
- `store_common.json:screenshots_grid`: `collection_panel` 2×2 posicionado só por âncoras.

Medição [bcui S1, 27/08/2026], server form real:
- Botões com `collection_details` próprio retornaram `selection=0/1/2`.
- Botão idêntico sem esse binding retornou `canceled`, em silêncio, igual a ESC.

Regras derivadas:
- `stack_panel` com `collection_name:"form_buttons"` + filho com `collection_index` basta para **ler** a entrada.
- O texto precisa do binding **no label que desenha**.
- `collection_index` conta label, header e divider; `selection` conta só botões.

## 7. Receita proposta (não testada in-game)
`RP/ui/_ui_defs.json`: `{"ui_defs":["ui/vulpus/vulpus_menu.json"]}`. Arquivo `RP/ui/server_form.json`:
```json
{
  "namespace": "server_form",
  "main_screen_content": {
    "size": ["100%", "100%"],
    "modifications": [ { "array_name": "controls", "operation": "insert_back", "value": [
      { "vulpus_server_form_factory": { "type": "panel", "size": ["100%", "100%"],
          "factory": { "name": "server_form_factory", "control_ids": { "long_form": "@vulpus_menu.long_form_root" } } } } ] } ]
  },
  "long_form": {
    "modifications": [ { "array_name": "bindings", "operation": "insert_back", "value": [
      { "binding_name": "#title_text" },
      { "binding_type": "view", "source_property_name": "((#title_text - '§v§p§v') = #title_text)", "target_property_name": "#visible" } ] } ]
  }
}
```
O `size` 100% é opcional. O long_form vanilla continua centrado (tamanho fixo + âncora center). Alternativa: root com tamanho em px.

Trecho de `vulpus_menu.json`:
```json
"main_menu": { "type": "panel", "size": ["100%", "100%"], "property_bag": { "#visible": false },
  "bindings": [ { "binding_name": "#title_text" },
    { "binding_type": "view", "source_property_name": "(not ((#title_text - '§v§p§v§1§1') = #title_text))", "target_property_name": "#visible" } ] },
"left_column": { "type": "stack_panel", "orientation": "vertical", "size": ["30%", "100%c"], "collection_name": "form_buttons",
  "controls": [ { "b0@vulpus_menu.menu_button": { "collection_index": 0 } }, { "g0": { "type": "panel", "size": ["100%", 4] } },
                { "b1@vulpus_menu.menu_button": { "collection_index": 1 } } ] },
"menu_button@common.button": { "size": ["100%", 28], "$pressed_button_name": "button.form_button_click",
  "bindings": [ { "binding_type": "collection_details", "binding_collection_name": "form_buttons" },
    { "binding_type": "collection", "binding_collection_name": "form_buttons", "binding_name": "#form_button_text", "binding_name_override": "#vp_text" },
    { "binding_type": "view", "source_property_name": "(not (#vp_text = ''))", "target_property_name": "#visible" } ],
  "controls": [ { "default@vulpus_menu.face": { "$face": "textures/ui/button_borderless_dark" } },
    { "hover@vulpus_menu.face": { "$face": "textures/ui/button_borderless_darkhover" } },
    { "pressed@vulpus_menu.face": { "$face": "textures/ui/button_borderless_darkpressed" } },
    { "text@vulpus_menu.btn_label": {} } ] },
"face": { "type": "image", "texture": "$face", "size": ["100%", "100%"], "keep_ratio": false },
"btn_label": { "type": "label", "text": "#form_button_text", "layer": 3, "shadow": true, "max_size": ["100% - 8px", 20],
  "bindings": [ { "binding_type": "collection", "binding_collection_name": "form_buttons", "binding_name": "#form_button_text" } ] }
```
Notas da receita:
- A `left_column` está encurtada: completa vai até `b3` (índices 0–3, paddings entre eles). `right_column` igual com índices 4–7.
- Ícone: `#form_button_texture` / `_file_system`, igual ao `dynamic_button`.
- Logo: `textures/ui/csb_faq_fox`. Título: view `(#title_text - '§v§p§v§1§1')` em `#vp_title`. Texto abaixo da logo: label `#form_text`.
- X: `"close@common.close_button": {}`.
- Submenu em lista: copiar `long_form_dynamic_buttons_panel` com templates próprios dentro de `common.scrolling_panel`, flag `§v§p§v§2§2`.
- Script: `.title("§v§p§v§1§1§rVulpus")`, 8 × `.button()`, sem label/header/divider; `selection` 0–7. Chamar `show` fora de restricted-execution (`system.run`).

## 8. Riscos
- JSON UI não é versionado. Mexer o mínimo.
- Botão sem `collection_details` próprio vira cancel silencioso.
- Label, header e divider deslocam o `collection_index`.
- Parser [bcui 1.26]:
  - `%` e `>=` inválidos; falham em silêncio e `#visible` fica true.
  - `<` deu "Invalid expression".
  - Aritmética só inteira; `(#x - 0)` converte string numérica.
  - `('' + #x)` e `/` sobre string crasharam o cliente.
  - View binding sem `#propriedade` na expressão descarta todos os bindings do controle.
- `visible` não impede construção: tudo montado é construído em cada form [bcui S8]. Slider/toggle/edit estáticos assertionam no ModalForm; usar factory por tipo de linha.
- DDUI (`CustomForm`/`MessageBox` do server-ui 2.2.0) é Ore UI e não é afetado.
- MessageFormData provavelmente usa `long_form` [inferido]; testar.
- Logs: `%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt`.

## 9. Fontes
- wiki.bedrock.dev/json-ui/: `modifying-server-forms`, `json-ui-intro`, `json-ui-documentation`, `dynamic-content-generation`, `best-practices`, `type-conversion`, `buttons-and-toggles`.
- github.com/bedrock-core/ui PR #13, commit `edf0c7c6ce0aafce4c1d5126e8420aac2be95e0d`: `docs/spikes/S1,S3,S7,S8,S9,S11,S12`, `jsonui-container-facts.md`, `packages/resource-pack/packs/RP/ui/server_form.json`.
- github.com/Mojang/bedrock-samples, tags `v1.21.60.10`, `v1.21.70.3`, `v1.26.50.4`, `v1.26.60.28-preview`.
- learn.microsoft.com ActionFormData; unpkg `@minecraft/server-ui@2.2.0/index.d.ts`.