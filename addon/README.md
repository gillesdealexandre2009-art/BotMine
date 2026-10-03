# Addon Vulpus

Addon de Minecraft Bedrock do servidor **Vulpus**, com a Kiza (a raposa kitsune) falando com a galera.

- **O que tem:** um menu próprio, com a imagem "VULPUS" no topo, a logo no meio e 5 botões de cada lado:
  - à esquerda: Spawn, Casas, TPA, Voltar e Perfil;
  - à direita: Caudas, Leilão, Nível, Ajustes e Regras;
  - um botão extra da Staff (a coroa), que só a staff vê.
- **Novidades da versão 0.2.0:** níveis e ranks iguais aos do Discord, cargos e selos sobre a cabeça, um placar do lado da tela (scoreboard lateral), tema Black para o menu, símbolos próprios (glyphs), o leilão e um chat com selo e nível.
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
- No menu, o botão **Nível** mostra o seu nível, os ranks, o ranking e como ganhar XP.

## Placar do lado e tema

- **Scoreboard lateral (placar do lado):** uma caixinha no lado direito da tela com o rank, o nível, a barra de progresso, as Caudas, quem está online e as coordenadas. Liga e desliga em **Ajustes** ou com `/vulpus:hud`. A staff escolhe se começa ligada para quem nunca mexeu.
- **Tema do menu:** em **Ajustes**, troque entre **Laranja** e **Black**. O menu reabre já no tema novo. Os formulários com campos continuam com o visual normal do jogo nos dois temas.

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
| `/vulpus:leilao` | abre o leilão |
| `/vulpus:vender <preço>` | anuncia no leilão o item da mão por esse preço |
| `/vulpus:caixa` | abre a caixa de retirada do leilão |
| `/vulpus:perfil [jogador]` | abre o seu perfil (ou o de outra pessoa online) |
| `/vulpus:nivel [jogador]` | mostra o nível (o seu ou o de alguém online) |
| `/vulpus:hud` | liga ou desliga o placar do lado |

Só para a staff:

| Comando | O que faz |
|---|---|
| `/vulpus:staff` | abre o menu da staff |
| `/vulpus:definirspawn` | define o spawn onde você está |
| `/vulpus:darcaudas <jogador> <valor>` | dá Caudas (valor negativo tira) |
| `/vulpus:cargo <jogador> <cargo>` | muda o cargo: `admin`, `staff`, `helper` ou `nenhum` (só Admin consegue) |
| `/vulpus:kitsune <jogador>` | liga ou desliga o selo Kitsune |

**Quem é staff:** operador do mundo (ou quem tem nível de comando de operador), ou quem tiver a tag `vulpus:staff` ou `vulpus:admin`. Para dar a tag, use `/tag NOME add vulpus:staff` ou, pelo menu, Staff > Cargos e Kitsune.

**Configurações da staff:** Staff > Configurações tem 4 grupos: "Teleporte e casas", "Caudas e XP", "Leilão" e "Geral".

## Como trocar a logo

1. Faça a imagem **quadrada** em PNG. O tamanho 128x128 é o ideal; até 256x256 funciona bem.
2. Salve por cima de `vulpus_rp/textures/vulpus/ui/logo.png`, com o mesmo nome.
3. Gere o pacote de novo (`npm run build`) ou rode `npm run dev`.

O `npm run texturas` e o `npm run glyphs` refazem as texturas e os símbolos, mas **não apagam uma imagem trocada à mão**. Eles só sobrescrevem com `--forcar` (por exemplo, `python tools/gerar_glyphs.py --forcar`).

## Como criar um botão ou um menu novo

Os menus são montados com o "framework" que fica em `vulpus_bp/scripts/core/forms.js`:
- `Hub`: o menu principal, com as duas colunas;
- `Lista`: os submenus, que rolam;
- `confirmar`: uma pergunta de sim ou não;
- `perguntar`: um formulário com campos.

O tema (Laranja ou Black) é aplicado sozinho pelo framework.

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
7. **Nível:** abra o botão Nível, os Ranks, o Ranking e o Como ganhar XP. Para testar a troca de rank rápido, a staff pode pôr "XP por minuto ativo" em 100 nas Configurações (lembre de voltar para 3).
8. **Perfil, Ajustes e Regras:** confira rank, nível e cargo no perfil; ligue e desligue o placar do lado; troque o tema para Black e de volta; abra todas as páginas de Regras.
9. **Leilão:** anuncie um item da mão, veja ele em Comprar e em Meus anúncios, cancele (volta para o inventário) e anuncie de novo. Com outra conta, compre; o vendedor recebe as Caudas na caixa de retirada.
10. **Staff:** com operador ou com a tag, abra o painel, defina o spawn, mude uma configuração de cada grupo, dê e tire Caudas, mude um cargo em "Cargos e Kitsune", remova um anúncio em "Leilão (staff)" e pegue o item. Sem ser staff, o botão não aparece e `/vulpus:staff` recusa.

## Checklist de teste no jogo

Primeiro num **mundo novo** com "APIs Beta" ligado e sem cheats, com os três packs. Depois repita **sem o pack do chat** num mundo **sem experimentos**, para conferir que o resto não depende do Beta.

1. **Glyphs:**
   - aparecem no chat, sobre a cabeça, no placar do lado, no texto e nos botões dos menus;
   - uma cor (`§7`) antes do glyph muda a cor dele? (anotar);
   - o "VULPUS" em glyph na mensagem de primeira entrada fica com vãos entre as letras? (se ficar, avise: troca por texto).
2. **Menu principal:** botões alinhados, rótulos de 2 linhas sem cortar, imagem do título nítida, coroa no canto, foco andando pelas setas ou pelo controle.
3. **Tema:** trocar em Ajustes reabre no Black; menu, listas, botões e X pretos com laranja; confirmar e formulários com campos continuam normais; abrir e fechar 10 vezes sem travar.
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

## Limitações

- **Formulários com campos:** ficam com o visual normal do Minecraft nos dois temas, de propósito. Mexer neles quebra fácil a cada atualização.
- **Atualizações do jogo:** o visual do menu e do placar depende de arquivos internos do Minecraft.
  - A cada atualização, rode `npm run verificar` e refaça o checklist acima.
  - O verificador avisa quando um arquivo do jogo que o addon usa mudou.
  - O chat precisa da troca da versão Beta (veja "O chat").
- **Placar do lado:** usa o mesmo espaço do `/title`. Um `/title` de outro addon ou de comando pode ser cortado pelo placar.
- **Servidor:** o addon guarda tudo no próprio mundo e ainda não fala com o Discord (os níveis já usam a mesma conta, para ligar no futuro).
- **Sem loja:** as Caudas só compram no leilão, de outras pessoas.

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
| `docs/` | especificações e pesquisa |
| `dist/` | o pacote gerado; não vai para o git |
