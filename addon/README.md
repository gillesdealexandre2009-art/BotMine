# Addon Vulpus

Addon de Minecraft Bedrock do servidor **Vulpus**, com a Kiza (a raposa kitsune) falando com a galera.

- **O que tem:** um menu próprio, com a logo no meio e 4 botões de cada lado:
  - à esquerda: Spawn, Casas, TPA e Voltar;
  - à direita: Caudas, Perfil, Ajustes e Regras;
  - um botão extra da Staff, que só a staff vê.
- **Versão do jogo:** Bedrock **1.26.52**, sem nenhum experimento ligado.
- **Peças:** dois packs que andam juntos.
  - `vulpus_bp`: o pack de comportamento (os sistemas);
  - `vulpus_rp`: o pack de recursos (o visual do menu).
- **Sem pay-to-win:** nada no addon é vendido nem exclusivo de quem paga.

## O que precisa ter no computador

Só para gerar o pacote ou mexer no addon. Para jogar, basta o Minecraft.

1. **Python 3** com a biblioteca **Pillow** (as texturas usam). Instale pelo site python.org e depois rode `pip install pillow`.
2. **Node.js** (site nodejs.org). Ele serve para conferir os scripts.
3. Na pasta `addon`, rode uma vez:

   ```
   npm install
   ```

Todos os comandos abaixo são digitados num terminal aberto **dentro da pasta `addon`**.

Os `npm run` de build, dev, texturas e verificar chamam o `python` do sistema. Se o terminal disser que o Python não existe (ou abrir a Microsoft Store), instale o Python do python.org marcando **Add python.exe to PATH**.

## Como testar no jogo

### Jeito 1: o pacote pronto (mais fácil)

1. Gere o pacote:

   ```
   npm run build
   ```

   Ele confere tudo antes. Se algo estiver errado, ele para e diz o quê. Se der certo, cria a pasta `dist/` com:
   - `Vulpus.mcaddon`: os dois packs juntos (é o que você usa);
   - `Vulpus_BP.mcpack` e `Vulpus_RP.mcpack`: cada pack sozinho, caso precise instalar um só.
2. Dê **dois cliques** em `dist/Vulpus.mcaddon`. O Minecraft abre e importa os dois packs.
3. Crie um mundo (ou edite um que já existe):
   - em **Pacotes de comportamento**, ative o **Vulpus**;
   - o pacote de recursos **Vulpus** entra junto. Se não entrar, ative em **Pacotes de recursos**;
   - **não** precisa ligar nenhum experimento.
4. Entre no mundo. Você recebe o item **Menu do Vulpus**. Use o item (botão direito ou tocar e segurar) ou digite `/vulpus:menu`.

Ao importar uma versão nova com o mesmo número, o jogo pode manter a antiga. Nesse caso, use o Jeito 2.

### Jeito 2: modo de desenvolvimento (para testar mudanças rápido)

1. **Feche o mundo** no jogo.
2. Rode:

   ```
   npm run dev -- --mundo "Testes Claude"
   ```

   Isso copia os packs para as pastas de desenvolvimento do jogo e ativa os dois no mundo "Testes Claude".
   - Antes de mexer no mundo, ele guarda uma cópia dos arquivos de packs do mundo (os `.bak`).
   - Sem o `--mundo`, ele só copia os packs; aí você ativa no mundo pelo jogo.
   - Para ver o que ele faria sem mexer em nada, acrescente `--simular`.
3. Abra o mundo de novo. Toda vez que mudar algo, repita os passos 1 a 3.

## Comandos

Os comandos funcionam com o `vulpus:` na frente e também sem ele (por exemplo, `/menu`), o que foi conferido num servidor 1.26.52. Se outro addon usar o mesmo nome curto, use a forma com `vulpus:`.

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
| `/vulpus:perfil [jogador]` | abre o seu perfil (ou o de outra pessoa online) |

Só para a staff:

| Comando | O que faz |
|---|---|
| `/vulpus:staff` | abre o menu da staff |
| `/vulpus:definirspawn` | define o spawn onde você está |
| `/vulpus:darcaudas <jogador> <valor>` | dá Caudas (valor negativo tira) |

**Quem é staff:** operador do mundo (ou quem tem nível de comando de operador), ou quem tiver a tag `vulpus:staff`. Para dar a tag, use `/tag NOME add vulpus:staff`.

## Como trocar a logo

1. Faça a imagem **quadrada** em PNG. O tamanho 128x128 é o ideal; até 256x256 funciona bem.
2. Salve por cima de `vulpus_rp/textures/vulpus/ui/logo.png`, com o mesmo nome.
3. Gere o pacote de novo (`npm run build`) ou rode `npm run dev`.

O `npm run texturas` refaz as texturas provisórias, mas **não apaga a sua logo**. Ele só sobrescreve uma imagem trocada à mão se você usar `python tools/gerar_texturas.py --forcar`.

## Como criar um botão ou um menu novo

Os menus são montados com o "framework" que fica em `vulpus_bp/scripts/core/forms.js`:
- `Hub`: o menu principal, com as duas colunas;
- `Lista`: os submenus, que rolam;
- `confirmar`: uma pergunta de sim ou não;
- `perguntar`: um formulário com campos.

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
2. Para pôr o menu num botão do menu principal, use `menuExemplo(p, volta)` num `slot` em `sistemas/menu.js`.
3. Rode `npm run check`, que confere os scripts, e depois `npm run build`.

Algumas regras:
- Os textos ficam nos arquivos de `vulpus_bp/scripts/textos/`.
- Não use emoji, porque a fonte do jogo não tem. Use `•`, `»`, `«`, `✔`, `✖` e `★`.
- Ícones: use os do `ICONES` em `config.js` ou qualquer caminho de textura do jogo.

## Onde ver os erros

- **No jogo:** vá em **Configurações > Criador** e ligue o **Registro de conteúdo** (Content Log), tanto o arquivo quanto a interface. Os erros aparecem na tela.
  - Os erros do addon começam com `[Vulpus]`.
- **Arquivos de log:** ficam em `%APPDATA%\Minecraft Bedrock\logs`. Cole esse caminho na barra do Explorador de Arquivos.
- **Antes de abrir o jogo:**
  - `npm run check` confere os scripts;
  - `npm run verificar` confere o visual do menu contra o jogo instalado;
  - `npm run build` faz tudo isso e ainda gera o pacote.

## Teste rápido dos sistemas

Num mundo com os dois packs ativos (o ideal é ter uma segunda pessoa para o TPA):

1. **Menu:** abra pelo item (botão direito ou tocar e segurar) e por `/vulpus:menu`. Confira a saudação, as Caudas, quem está online e a dica.
2. **Spawn:** clique em Spawn e fique parado durante a contagem. Depois repita andando: tem que cancelar.
3. **Casas:** crie uma casa, vá até ela, mova, renomeie e apague (com a confirmação). Tente passar do limite de 3.
4. **TPA:** mande um pedido para a outra pessoa, que deve ver o aviso no chat e na barra. Aceite pelo menu e por `/vulpus:tpaceitar`. Teste também recusar, cancelar, esperar 60 s para vencer e bloquear em Ajustes.
5. **Voltar:** morra (não no vazio) e use Voltar; depois teleporte e use Voltar de novo.
6. **Caudas:** pegue a diária (a segunda tentativa no mesmo dia deve recusar). Jogue 10 min se mexendo e veja o `+5` na barra; parado, não ganha.
7. **Perfil, Ajustes e Regras:** confira os números do perfil, troque cada ajuste (a HUD some e volta) e abra todas as páginas de Regras.
8. **Staff:** com operador ou com a tag, abra o painel, defina o spawn, mude uma configuração, dê e tire Caudas e pegue o item. Sem ser staff, o botão não aparece e `/vulpus:staff` recusa.

## Checklist de teste no jogo

Confira estes 8 pontos depois de cada mudança no visual ou depois de cada atualização do Minecraft:

1. **Telas normais intactas:** um menu de outro addon, sem a marca do Vulpus, aparece igual ao do jogo.
2. **Menu principal:** com 8, 5 e 0 botões, os espaços vazios somem sem desalinhar as colunas, e cada botão faz o que está escrito.
3. **Fechar:** o X e o ESC fecham o menu sem erro.
4. **Listas:** nos submenus com títulos, textos e divisórias entre os botões, cada botão continua fazendo a coisa certa.
5. **Formulários normais intactos:** os formulários com campos (lista de opções, controle deslizante, seleção múltipla) e as caixas de mensagem continuam iguais aos do jogo.
6. **Controles:** funciona no toque (celular), no controle (o foco anda pelos botões) e no teclado e mouse.
7. **Sem erros:** o Registro de conteúdo não mostra erros de UI.
8. **Desempenho:** abrir e fechar o menu várias vezes seguidas não deixa o jogo lento.

## Limitações

- **Formulários com campos:** ficam com o visual normal do Minecraft, de propósito. Mexer neles quebra fácil a cada atualização.
- **Atualizações do jogo:** o visual do menu depende de arquivos internos do Minecraft.
  - A cada atualização, rode `npm run verificar` e refaça o checklist acima.
  - O verificador avisa quando o arquivo do jogo que o menu usa mudou.
- **Servidor:** o addon guarda tudo no próprio mundo e não fala com o Discord por enquanto.
- **Sem loja:** as Caudas ainda não compram nada. A loja fica para a fase de economia.

## Pastas

| Pasta ou arquivo | O que é |
|---|---|
| `vulpus_bp/` | pack de comportamento: manifest, item do menu e scripts |
| `vulpus_rp/` | pack de recursos: visual do menu, texturas e textos |
| `tools/build.py` | confere tudo e gera `dist/` |
| `tools/instalar_dev.py` | copia para o modo de desenvolvimento e ativa num mundo |
| `tools/verificar_ui.py` | confere o visual do menu contra o jogo instalado |
| `tools/gerar_texturas.py` | refaz as texturas provisórias |
| `docs/` | especificações e pesquisa |
| `dist/` | o pacote gerado; não vai para o git |
