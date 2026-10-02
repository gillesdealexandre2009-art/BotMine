Pesquisa concluída. O relatório está gravado. Nada foi testado dentro do jogo: o JSON e o JS foram validados só fora dele (parse, referências e sintaxe).

**Arquivos**
- Relatório: `<SCR>\pesquisa\02_tecnicas_comunidade.md`
- Rascunho validado (parse e referências conferidos contra a vanilla 1.26.52): `...\scratchpad\pesquisa\proposta_rascunho\`. Contém `RP/ui/server_form.json`, `_ui_defs.json`, `_global_variables.json`, `vulpus/vulpus_menu.json`, `vulpus_forms_rascunho.js` (passou no `node --check`) e `validate.py`.
- Cópias das fontes: `...\scratchpad\pesquisa\src\` (wiki, Chest-UI, tile-menu, MinUI, bedrock-core, Skyls, bedrock-samples, d.ts do npm).

**Conclusões**
1. O `server_form.json` da 1.26.52 é idêntico ao do bedrock-samples v1.26.50.4. Mudanças que quebram packs:
   - **1.21.70:** a lista de botões passou a usar `control_ids` (button/label/header/divider), e `#form_button_length` virou `#form_button_contents`.
   - **1.21.80:** o título mudou para `100% - 15px` e ganhou `$title_max_size`.
   - **1.26.50:** o ModalFormData ganhou `multiselect`.
2. **Mesmo nome = mescla, não substitui.**
   - Redeclarar `long_form` sem `@` mantém a herança vanilla (`@common_dialogs.main_panel_no_buttons`); só as chaves que você escreve mudam.
   - Prova principal: o bedrock-core (pack para 1.26.50) sobrescreve `third_party_server_screen` com só 2 chaves e os forms continuam abrindo. A wiki diz o mesmo ("strategically merged").
   - Arrays declarados substituem o array inteiro.
   - Um array que a definição só herda é apagado se você declarar ou inserir nele. Logo: nunca mexer em `long_form.controls`; inserir em `long_form.bindings` é seguro.
   - As edições têm que ficar no mesmo caminho de arquivo (`ui/server_form.json`).
3. **Técnica recomendada** (wiki 2025-02, MinUI e bedrock-core 2026-09): só 2 ganchos em `server_form.json`.
   - Em `main_screen_content`: inserir uma segunda factory com `"name": "server_form_factory"` apontando para `@vulpus_menu.root`.
   - Em `long_form.bindings`: inserir o binding que esconde o form vanilla quando o título tem a flag.
   - Todo o resto fica no namespace próprio `vulpus_menu`.
   - Forms de outros sistemas, sem flag, ficam intactos.
   - O estilo Chest-UI/tile-menu/Skyls (redeclarar `long_form.controls`) funciona, mas copia props vanilla que envelhecem e conflita com outros packs.
4. **Slots fixos:**
   - `stack_panel` com `collection_name: "form_buttons"` e filhos com `collection_index` literal (0–3 à esquerda, 4–7 à direita).
   - O próprio `button` precisa do binding `collection_details`; sem ele o clique volta como `canceled` (medido pelo bedrock-core).
   - `collection_name` só é aceito em `stack_panel`/`grid`.
   - Label e ícone precisam de binding próprio de coleção.
5. **Índices:** o `collection_index` conta todas as entradas, mas `selection` conta só botões.
   - Menu principal: usar só `.button()`; o texto abaixo da logo vai em `.body()` (`#form_text`).
   - Submenus em lista: factory igual à vanilla 1.21.70+, então header/label/divider funcionam.
6. **Flags:**
   - Base `§v§u§l§p`, menu principal `§v§u§l§p§0§r`, lista `§v§u§l§p§1§r`. Qualquer flag Vulpus que não seja a do menu principal cai na lista.
   - Detecção: `(not ((#title_text - 'FLAG') = #title_text))`.
   - O título exibido remove a flag via binding em `#text`.
7. **Slots vazios:** o script sempre manda 8 botões, com `''` nos vazios. O JSON esconde o conteúdo do slot, não o container, porque o `stack_panel` colapsa filhos invisíveis e desalinharia a coluna.
8. **Fechar:** `close@common.close_button` (vai para `button.menu_exit`); o script recebe `canceled` com `UserClosed`. ESC já fecha.
9. **ModalFormData:** deixar vanilla. Opcional: tema leve global com `"custom_form": {"$custom_background": ...}`. Nunca copiar `generated_contents`, que também é usado pela tela de configurações de pack.
10. **Logo provisória:** `textures/ui/csb_faq_fox`, um render vanilla de raposa (500x310) que combina com "Vulpus". Trocar depois é uma linha em `_global_variables.json`.
11. **Expressões seguras:** usar só `=`, `not`, `and`, `or`, `-` (remover substring) e `+`.
    - Evitar `<`, `>`, `>=` e `%`, e divisão ou `'' + #x` em strings (já crasharam o cliente).
    - Todo binding precisa ler uma `#propriedade`; se não ler, o array inteiro de bindings daquele controle é descartado.
    - Dentro do valor das `modifications`, usar strings literais, não `$var`.

**Riscos**
- **Custo:** `visible` não impede a construção. Nossos painéis são construídos em todo server form aberto, de qualquer sistema, e a lista cria células também para forms alheios. Manter o menu leve e sem slider/toggle/edit_box fixos (dão assert).
- **Updates do jogo:** se `main_screen_content` ou a factory mudarem, o form com flag pode abrir vazio. Comparar o `server_form.json` a cada versão.
- **DDUI/Ore UI:** `CustomForm`/`MessageBox` do server-ui 2.x usam outro formato de tela (`minecraft:ui-root`) e não passam por JSON UI. O menu tem que usar `ActionFormData`. Se a Mojang migrar o ActionFormData, a personalização cai.
- **Outros packs:** um pack que redeclare `long_form.controls` substitui o array do outro; vários bindings `#visible` no mesmo `long_form` provavelmente fazem o último vencer (não medido).
- **MessageFormData:** deve passar pelo `long_form` (a factory vanilla só tem `long_form` e `custom_form`), mas não foi verificado no jogo.
- **Detalhes menores:** pode haver um frame de flash do form vanilla. Os arquivos com `§` precisam ser UTF-8. O redimensionamento de `main_screen_content` via `#size_binding_*` tem medições contraditórias, por isso a proposta usa tamanhos fixos em px.

O relatório termina com um checklist de 8 testes para fazer no jogo.