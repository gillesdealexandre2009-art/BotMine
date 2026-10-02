Pronto: as 13 PNGs do papel [texturas] foram geradas e conferidas. Os caminhos e tamanhos batem com a tabela da spec, os JSON abrem sem erro e nada tem BOM. `ruff check` passou e o script roda limpo.

**Arquivos criados**
- `<repo>\addon\tools\gerar_texturas.py`
- Em `...\addon\vulpus_rp\textures\vulpus\ui\`: `painel`, `cabecalho`, `botao`, `botao_hover` e `botao_press` (`.png` + `.json` de nineslice cada); `fechar`, `fechar_hover`, `fechar_press`, `divisor` e `logo` (só `.png`).
- `...\addon\vulpus_rp\textures\vulpus\itens\menu.png`
- `...\addon\vulpus_rp\textures\item_texture.json` (conteúdo exato da spec)
- `...\addon\vulpus_bp\pack_icon.png` e `...\addon\vulpus_rp\pack_icon.png` (a mesma imagem nos dois)
- Prévias:
  - `<SCR>\preview\texturas.png`
  - `...\scratchpad\preview\mock_hub.png` (990x630, com o botão "Casas" no estado hover)
  - Script das prévias: `...\scratchpad\work\lab\previa.py`. Ele usa a fonte bitmap do jogo extraída.

O `vulpus_menu.json` do [ui] já existe. As 10 texturas que ele usa existem, e a geometria dele bate com o mock: faixa `100% - 4px` × 24 no offset [0,2], X 16x16 no [-6,6] e logo 60x60.

**Decisões fora da spec**
1. **Proteção da logo trocada:** cada PNG gerado leva uma assinatura (hash dos pixels) num campo interno do PNG. Se a assinatura não bate, o arquivo foi trocado ou editado à mão, e o script não sobrescreve sem `--forcar`. Assim, rodar `npm run texturas` não apaga a logo oficial. O [pacote] pode citar isso no README.
2. **Tons extras de luz e sombra** além dos 7 da paleta: laranja claro e médio, brasa clara, creme na sombra, fundo escuro, contorno e olho. Todos têm nome no topo do script.
3. **Logo e item são desenhos separados:** a logo é desenhada em 32x32 e ampliada 4x para 128, o que aguenta melhor a redução para 60 UI. O item 16x16 tem um desenho próprio. Os dois são simétricos e o contorno é gerado sozinho.
4. **Pack icon:** desenhado numa grade de 44 com pixel de 6 e cortado no centro, para a raposa e o medalhão terem o mesmo tamanho de pixel. Visual: medalhão escuro com aro laranja e brilhos creme sobre #F28C38.
5. **Relevo só nas faixas fixas do nineslice:** nos botões, cabeçalho e painel, a luz e a sombra ficam nas bordas que não esticam. Os miolos são lisos, então esticar não cria faixas.
6. **Saída do console em UTF-8**, para os acentos aparecerem certos no Git Bash.

**Dúvidas e riscos**
- **Texto no hover:** creme sobre #F28C38 tem contraste de cerca de 2,2:1 sem sombra. No mock, com a sombra do jogo, ficou legível. Se no jogo ficar fraco, basta trocar o preenchimento de `botao_hover` por `LARANJA_MEDIO` em `ESTADOS_BOTAO` (uma linha).
- **Logo a 60 UI:** a ampliação é sem suavização. Em escalas de GUI quebradas, alguns pixels podem sair desiguais. Se incomodar, o [ui] pode usar `"bilinear": true` na logo ou tamanho 64.
- **Fechar:** foi desenhado para 16x16 exatos, que é o tamanho que o [ui] usa.
- **Transparência do painel:** com alpha 240, o mundo quase não aparece atrás. Dá para ajustar em `ALFA_PAINEL`.
- **Campo interno do PNG:** é um campo padrão de texto do formato. Não deve afetar o Bedrock, mas vale confirmar ao carregar.

**Testar no jogo**
- Painel esticado em 330x210 (hub) e 270x220 (lista): cantos recortados nítidos e sem emendas.
- Os 3 estados do botão: mouse (hover), foco por teclado ou controle, e clique (pressionado). Ver a legibilidade do texto em cada um.
- Estados do X e a faixa do título com o texto em MinecraftTen.
- Logo em várias escalas de GUI.
- Ícone do item na hotbar e no inventário, com o brilho de encantamento.
- Pack icons na lista de packs (BP e RP).
- Divisor e slot staff 20x20 nas listas.