# Addon Vulpus — especificação funcional (fase 1: menu + base)

Servidor Vulpus (Minecraft Bedrock, comunidade BR, mascote Kiza Misuchi, raposa kitsune).
Regras de ouro do dono: sem pay-to-win; nada exclusivo de quem paga; nada que valha dentro do jogo
por dinheiro. Addon só dentro do Minecraft (sem ponte com Discord por enquanto). Script API pura,
sem plugin. Testado pelo dono num mundo local (Windows 10, Bedrock 1.26.52); depois vai para BDS.

## Pasta e estrutura

Tudo em `<repo>\addon\`:

```
addon/
  README.md                 PT-BR: o que é, como testar, como trocar a logo, como criar menus novos
  package.json              devDependencies: @minecraft/server 2.10.0, @minecraft/server-ui 2.2.0, typescript
  jsconfig.json             checkJs para tipagem (npm run check)
  tools/
    build.py                valida JSON, gera dist/Vulpus.mcaddon (+ dist/Vulpus_BP.mcpack, dist/Vulpus_RP.mcpack)
    instalar_dev.py         copia os packs para development_behavior_packs / development_resource_packs
    gerar_texturas.py       gera as texturas placeholder com Pillow (logo, painel, botões, item)
    verificar_ui.py         valida referências do JSON UI (@namespace.elemento) contra o vanilla extraído
    brarchive.py            extrai .brarchive do jogo instalado (usado pelo verificar_ui.py)
  vulpus_bp/                behavior pack
  vulpus_rp/                resource pack
  dist/                     saída do build (gitignored)
```

UUIDs fixos (não trocar depois):
- BP header 29023842-68f5-46b9-af72-b9e58ee29803
- BP módulo data 235d63b2-cc2b-4734-b848-689d24c69b52
- BP módulo script c87cf944-863b-451a-8db7-e2d42707bfe3
- RP header 23661f46-bc60-4947-81ed-343c0279e638
- RP módulo resources 9632c594-0c36-4568-8c99-709774135b04

Versão do addon: 0.1.0. BP depende do RP (uuid) e vice-versa é opcional.

## Menu principal (hub)

Abre por: comando `/vulpus:menu` (e `/menu` se o jogo aceitar sem prefixo), item "Menu do Vulpus"
(item próprio `vulpus:menu`, entregue na primeira entrada, não pode ser jogado fora e fica na morte).

Layout (JSON UI, flag HUB no título):
- painel central com fundo próprio, título "VULPUS" no topo, botão fechar (X) no canto superior direito;
- LOGO no meio (placeholder `textures/vulpus/ui/logo`), TEXTO abaixo da logo (corpo do form);
- 4 botões à esquerda da logo e 4 à direita; 9º slot opcional (Staff) embaixo do texto, só aparece se existir.

Ordem dos botões (índice = slot):
0 Spawn · 1 Casas · 2 TPA · 3 Voltar (esquerda)
4 Caudas · 5 Perfil · 6 Ajustes · 7 Regras (direita)
8 Staff (só staff)

Texto abaixo da logo (corpo): saudação neutra de gênero ("Que bom te ver na toca, {nome}!"), saldo de
Caudas, jogadores online, e uma dica curta da Kiza sorteada.

## Submenus (flag LISTA)

Tema igual, lista rolável de botões grandes com ícone. Último botão: "Voltar" (volta para o menu anterior).
Fechar (X) encerra a navegação.

### Spawn
Botão direto: teleporta para o spawn do servidor (definido pela staff; senão o spawn padrão do mundo).
Regras de teleporte valem (ver abaixo).

### Casas
- Lista as casas do jogador (nome + dimensão + coordenadas) e um botão "Nova casa aqui" (se abaixo do limite).
- Nova casa: ModalForm com campo de nome (máx. 16 caracteres, sem duplicar; padrão "Casa N").
- Clicar numa casa abre: Ir até ela · Mover para cá · Renomear · Apagar (com confirmação) · Voltar.
- Limite: `limiteCasas` (padrão 3), configurável pela staff.
- Comandos: `/vulpus:casa [nome]` (sem nome abre o menu de casas), `/vulpus:definircasa <nome>`, `/vulpus:apagarcasa <nome>`.

### TPA
- "Ir até alguém": lista jogadores online (menos você) e envia pedido.
- "Chamar alguém até mim": idem, pedido do tipo trazer.
- "Pedidos recebidos (N)": lista; clicar abre confirmação Aceitar / Recusar.
- "Cancelar meu pedido" quando houver pedido enviado pendente.
- Pedido expira em `tpaExpira` (60 s). Um pedido enviado por vez. Quem desligou TPA em Ajustes não recebe.
- Quem recebe ganha aviso no chat + som + actionbar dizendo como aceitar (menu ou `/vulpus:tpaceitar`).
- Ao aceitar, quem viaja passa pelas regras de teleporte (espera parado etc.).
- Comandos: `/vulpus:tpa <jogador>`, `/vulpus:tpaqui <jogador>`, `/vulpus:tpaceitar`, `/vulpus:tpanegar`.

### Voltar
Teleporta para o último local salvo: onde morreu ou de onde saiu no último teleporte (o mais recente).
Comando `/vulpus:voltar`.

### Caudas (moeda própria do jogo, salva no mundo)
- Mostra saldo, sequência de dias e quando a próxima diária libera.
- "Recompensa diária": `diariaBase` (25) + `diariaBonusDia` (5) × (sequência − 1), bônus limitado a
  `diariaBonusMax` (7) dias. Dia vira à meia-noite de Brasília (UTC−3). Pular um dia zera a sequência.
- Ganho por tempo online: a cada `intervaloCaudasMin` (10) min online e NÃO parado (anti-AFK: precisa ter
  se mexido no intervalo), ganha `caudasPorIntervalo` (5). Aviso discreto na actionbar.
- "Ranking": top 10 por saldo (inclui quem está offline).
- "Como ganhar": texto explicando.
- Comandos: `/vulpus:caudas`, `/vulpus:diaria`. Staff: `/vulpus:darcaudas <jogador> <valor>` (aceita negativo).
- Ainda não há loja nem pagar (fase de economia).

### Perfil
Corpo com: nome, Caudas, tempo de jogo, primeira entrada (data), dias seguidos da diária, mortes,
casas usadas/limite. Botão "Ver outro jogador" (lista online) e Voltar.

### Ajustes (por jogador)
Botões que alternam e reabrem o menu com o estado novo:
- HUD na tela: ligado/desligado (padrão `hudPadrao` = ligado);
- Pedidos de TPA: aceitando/bloqueados;
- Sons do menu: ligados/desligados.

### Regras
Páginas (cada uma é uma lista com o texto no corpo e Voltar):
- Regras do servidor (adaptar as regras do Discord para o jogo: respeito, nada impróprio, privacidade,
  sem spam, jogue limpo — sem hack, sem griefing, sem roubar — e fale com a staff);
- Comandos (lista dos comandos acima);
- A lenda de Kiza (capítulos curtos da lore);
- Discord: mostra o link configurado pela staff (`linkDiscord`), ou "a staff ainda não colocou o link".

### Staff (só staff: operador OU tag `vulpus:staff`)
- Definir spawn aqui (salva posição, dimensão e rotação).
- Configurações (ModalForm): esperaTeleporte, recargaTeleporte, combateSegundos, tpaExpira, limiteCasas,
  caudasPorIntervalo, intervaloCaudasMin, diariaBase, diariaBonusDia, diariaBonusMax, linkDiscord, hudPadrao.
- Dar Caudas (lista online + ModalForm de valor).
- Pegar item do menu.
- Comandos: `/vulpus:definirspawn`, `/vulpus:darcaudas <jogador> <valor>`.

## Regras de teleporte (spawn, casa, tpa, voltar)
- Espera de `esperaTeleporte` (3 s) PARADO, com contagem na actionbar. Mexeu mais de ~0,6 bloco ou levou
  dano: cancela.
- Em combate (levou ou deu dano nos últimos `combateSegundos` = 10 s): não teleporta.
- Recarga de `recargaTeleporte` (10 s) entre teleportes.
- Staff não tem espera nem recarga (opcional: manter para todos — escolha: staff pula a espera).
- Antes de teleportar, salva o local de origem como "Voltar".
- Teleporte entre dimensões funciona (dimension na opção do teleporte).
- Som ao chegar.

## HUD (actionbar)
A cada 1 s, para quem tem HUD ligado e não está numa contagem de teleporte: Caudas, coordenadas
(X Y Z) e direção (N/S/L/O). Texto curto. Sem emoji (a fonte não tem). Símbolos BMP ok (•, », ✔, ★).

## Primeira entrada
Título de boas-vindas da Kiza, mensagem no chat, entrega do item do menu. Sempre que entrar:
garante que tem o item (se não tiver, entrega de novo).

## Persistência
- Propriedades dinâmicas do MUNDO, para ler dados de quem está offline (ranking, staff):
  - `vulpus:j:<player.id>` → JSON do jogador:
    `{ v:1, nome, caudas, tempo, primeira, ultimaVez, mortes, diaria:{dia, sequencia}, casas:[{nome,x,y,z,d}],
       voltar:{x,y,z,d}|null, ajustes:{hud,tpa,sons}, recebeuItem }`
  - `vulpus:config` → JSON das configurações (mescla com os padrões);
  - `vulpus:spawn` → JSON `{x,y,z,d,rx,ry}`.
- Cache em memória com gravação imediata (dados são pequenos). Guardar tamanho < 32 000 caracteres.

## Voz e textos
Português BR, tom da Kiza (do bot): leve, brincalhona, curta. Mensagens do sistema com prefixo
`§6Kiza §8» §r`. Cores: §6 destaque/ouro, §e aviso, §a sucesso, §c erro, §7 secundário, §f normal.
Gênero neutro (nada de "bem-vindo/bem-vinda"). Todos os textos ficam em `scripts/textos.js`.

Lore (resumo para "A lenda de Kiza"): I. A raposa de uma cauda só (toda kitsune ganha uma cauda a cada
grande história; Kiza nasceu com uma só, branquinha e meio despenteada). II. A floresta de blocos.
III. A toca (Kiza cavou uma toca chamada Vulpus para guardar gente, não tesouros). IV. As Caudas (cada
história vira uma Cauda; ela diz que não liga, mas conta todas toda noite). V. As pérolas.
