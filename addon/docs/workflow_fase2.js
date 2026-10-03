export const meta = {
  name: 'fase2-addon-vulpus',
  description: 'Fase 2 do addon Vulpus: glyphs, tema Black, scoreboard lateral, níveis/ranks, leilão, chat Beta; verificação, revisões, BDS e entrega',
  phases: [
    { title: 'Pesquisa', detail: '3 frentes: chat Beta, UI HUD/glyphs/tema, leilão' },
    { title: 'Spec', detail: 'spec da fase 2 com donos e contratos' },
    { title: 'Implementar', detail: '6 frentes em paralelo' },
    { title: 'Verificar', detail: 'tsc, node --check, verificar_ui, build' },
    { title: 'Revisar', detail: 'UI, lógica, anti-dupe do leilão' },
    { title: 'Fumaça', detail: 'BDS 1.26.52 com e sem Beta' },
    { title: 'Final', detail: 'conferência, ESTADO.md, passo a passo' },
  ],
}

const ADDON = 'C:/Users/gille/OneDrive/Desktop/BotVulpus/BotVulpus/addon'
const VT = 'C:/Users/gille/vt'
const SPEC2 = ADDON + '/docs/spec/03_spec_fase2.md'

const AMBIENTE = `Ambiente deste computador:
- Addon: ${ADDON} (fase 1 pronta e publicada: menu JSON UI, core, sistemas, pacote). Docs: ${ADDON}/docs/ESTADO.md, docs/spec/01_spec_funcional.md, 02_spec_tecnica.md, docs/pesquisa/*.
- UI vanilla 1.26.52 extraída (JSON minificado): ${VT}/vanilla/ui/ (inclui hud_screen.json, chat_screen.json, server_form.json, ui_common.json). Texturas vanilla PNG: "C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/textures/". Fontes vanilla: em "C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive/font.brarchive" (extraia com: python ${ADDON}/tools/brarchive.py <arquivo.brarchive> <destino> para uma pasta em ${VT}/vanilla/font se precisar). A vanilla já usa glyph_00..D7, E0, E1 e F9..FF: as folhas livres são E2..E9 (confirme).
- Tipagens estáveis: ${VT}/ref/node_modules/@minecraft/{server@2.10.0,server-ui@2.2.0,common}/index.d.ts.
- Ferramentas: no Bash faça export PATH="/c/Users/gille/vt/node:/c/Users/gille/vt/py:$PATH" (o "python" do sistema é um atalho falso). Python 3.12 + Pillow 11.3 (sem pip funcional). Node 22 + npm 10. Cuidado com MAX_PATH do Windows: use pastas curtas em ${VT} para instalações npm temporárias.
- BDS oficial 1.26.52.3 já baixado em ${VT}/bds (script de exemplo ${VT}/rodar_bds.js; mocks da API em ${VT}/mock/).
- Imagem do título do servidor: C:/Users/gille/OneDrive/Desktop/BotVulpus/BotVulpus/IMGS/minecraft_title.png (letras "VULPUS" douradas/bronze 3D em pixel art, contorno marrom escuro).
- Bot Discord (Kiza, Python, fora do addon; NÃO edite): ranks em ../config.py RANKS = (0 Filhote), (5 Raposinha), (10 Raposa Andarilha), (15 Raposa Lunar), (20 Raposa de Nove Caudas); emojis 🌱 🦊 🍂 🌙 ✨; XP para subir do nível n: 5n² + 50n + 100.`

const DECISOES = `Decisões do dono (KOPE) para a fase 2:
1. Glyphs em pixel art (estilo da logo de raposa já feita) para evitar texto feio: ranks (broto, raposa, folha, lua, brilho), staff (Admin coroa, Staff escudo, Helper estrela), booster Kitsune (só cosmético), moeda Caudas, nível, ícones do leilão, e o título VULPUS (a partir de IMGS/minecraft_title.png) para menu/scoreboard/chat.
2. Tema do menu por jogador nos Ajustes: "Laranja" (o atual) e "Black" (preto com detalhes laranja). Se o Black for inviável, só o laranja.
3. Níveis e ranks no jogo IGUAIS aos do Discord (mesmos 5 ranks e a mesma fórmula de XP), para ligar com o Discord no futuro. XP: 3 por minuto ativo (mesmo anti-AFK das Caudas) + 15 na diária; staff sobrepõe o rank de nível no prefixo. Rank sobre a cabeça (nameTag em 2 linhas: glyph+rank / nome).
4. Scoreboard lateral PRÓPRIO (JSON UI, por jogador), com fundo do painel, título VULPUS, rank, nível com barra, Caudas, online e coordenadas; liga/desliga nos Ajustes; SUBSTITUI a HUD de actionbar atual (title/actionbar devem ficar livres para mensagens normais).
5. Leilão completo: vender item da mão por Caudas, comprar com páginas/busca/categorias, meus anúncios (cancelar), caixa de retirada (itens expirados/cancelados e Caudas das vendas, inclusive com vendedor offline), itens preservados por inteiro (encantamentos, nome, livros, shulkers) — sem serializar para texto. Valores (configuráveis pela staff): taxa de anúncio 1% (mín. 1, não volta), taxa de venda 5% (sai da economia), preço 1..1.000.000, 5 anúncios por jogador, 48 h de duração, depois vai para a caixa de retirada e nunca é apagado; mostrar a média das últimas vendas do mesmo item; histórico; staff pode remover anúncios. Sem pay-to-win.
6. Chat personalizado (opção A): pack SEPARADO "Vulpus Chat" que usa a API Beta (world.beforeEvents.chatSend, que NÃO existe no estável 2.10.0) — só ele depende de beta; o pack principal continua estável. O chat lê rank/nível/staff/booster do pack principal por um canal compartilhado (ex.: scoreboard objectives ou tags; propriedades dinâmicas são isoladas por pack). Exige o experimento "APIs Beta" no mundo; se o Beta quebrar num update, só o chat volta ao vanilla.
7. Sem pay-to-win. Textos PT-BR na voz da Kiza (leve, curta, gênero neutro), sem emoji (use glyphs próprios ou •, », «, ✔, ✖, ★).`

const REGRAS = `Regras gerais:
- Não mexa em nada fora de ${ADDON} (exceto pastas temporárias em ${VT}). Não toque no bot Python.
- Não faça git commit/push. Não abra o Minecraft. Não mexa nos mundos do usuário.
- Qualidade de produção, estilo do código existente (nomes em português, JSDoc + // @ts-check, comentários curtos), sem código morto, sem TODO. UTF-8 sem BOM.
- Verifique seu trabalho antes de terminar.`

const PESQUISAS = [
  { key: 'chat', prompt: `PESQUISA [chat-beta]. Responda com fatos verificados (cite arquivo/linha ou URL):
1. Qual versão beta do @minecraft/server corresponde ao Minecraft 1.26.52 (rode "npm view @minecraft/server dist-tags" e "npm view @minecraft/server versions --json" numa pasta curta em ${VT}/npmq; identifique a beta que casa com 1.26.50/1.26.52 e a string de versão a usar no manifest, ex. "2.11.0-beta"). Instale essa beta em ${VT}/refbeta (npm i --legacy-peer-deps) e confira nas tipagens: world.beforeEvents.chatSend, ChatSendBeforeEvent (campos: message, sender, cancel; existem targets? outros?), world.sendMessage com RawMessage, e se há restrições (modo restrito: o que dá para fazer dentro do beforeEvent; precisa system.run?).
2. Dois behavior packs no mesmo mundo com versões diferentes de @minecraft/server (um 2.10.0 estável, outro beta) funcionam? (fontes oficiais/Bedrock wiki/learn.microsoft.com). Propriedades dinâmicas são isoladas por pack? Scoreboard (world.scoreboard) e tags de entidade são compartilhados? player.nameTag é compartilhado?
3. Como o chat vanilla mostra o nome (usa o nome da conta, não o nameTag)? Glyphs de fonte custom (U+E2xx) aparecem no chat? (sim, normalmente — confirme).
4. Experimento "Beta APIs": como ligar no BDS (server.properties? level.dat experiments? world_behavior_packs), e se dá para desligar depois de ligado num mundo. No BDS em ${VT}/bds, teste se um BP com dependência beta carrega num mundo de teste com o experimento ligado (crie mundo de teste novo em ${VT}/bds/worlds/BetaTeste; para ligar experimento no BDS pode ser preciso editar level.dat — o formato é NBT little-endian com header de 8 bytes; você pode escrever um pequeno editor NBT em Python; tag "experiments" com "gametest": 1 = Beta APIs; confira o nome certo da chave). Se não conseguir ligar o experimento, documente como.
Responda com um relatório objetivo (até ~700 palavras) com as respostas, a versão beta exata e o trecho de manifest recomendado para o pack de chat.` },
  { key: 'ui', prompt: `PESQUISA [ui-hud-glyph-tema]. Leia ${ADDON}/docs/pesquisa/02_tecnicas_comunidade.md e referencia_vanilla_ui.md, e o JSON UI atual em ${ADDON}/vulpus_rp/ui/**. Responda com fatos verificados contra a vanilla em ${VT}/vanilla/ui (cite elementos/arquivos) e fontes da comunidade (carregue WebSearch/WebFetch com ToolSearch "select:WebSearch,WebFetch"; ex.: wiki.bedrock.dev JSON UI, "custom sidebar json ui title", "hud_screen title modification", "actionbar json ui flag"):
1. Scoreboard lateral por jogador em JSON UI: técnica para renderizar texto enviado pelo script (player.onScreenDisplay.setTitle / setActionBar / updateSubtitle) num painel lateral próprio quando o texto tem uma flag (ex. "§v§s"), deixando titles/actionbar SEM flag 100% vanilla. Qual canal é mais robusto (title com fade/stay longos e reenvio? actionbar? subtitle?). Como evitar piscar, como esconder o title vanilla quando tem flag, como sumir quando desligado (enviar vazio/clear). Quais elementos de hud_screen.json modificar (nomes reais da 1.26.52: hud_title_text, hud_actionbar_text, root_panel etc.) e as bindings (#hud_title_text_string, #hud_actionbar_text_string, #hud_subtitle_text_string — confira). Como desenhar várias linhas (separar por \\n num label só, ou várias labels por substring?), fundo nineslice, imagem do título no topo, ancoragem à direita no meio da tela, tamanho que não atrapalha (escala com GUI scale). Escreva um rascunho mínimo do JSON (modifications em hud_screen.json + elementos num namespace vulpus_hud) e valide referências contra a vanilla.
2. Glyphs custom: formato exato (RP font/glyph_E2.png 256x256 = 16x16 células de 16px; pode ser 512 = 32px por célula? como o jogo escala; largura útil calculada pelos pixels não transparentes; cor: glyph colorido mantém cores mesmo com §? ), onde aparecem (chat, nameTag, forms, scoreboard, actionbar). Como escrever o caractere no JS ("\\uE200"). Limitações (glyph sobre a cabeça fica do tamanho da fonte; title VULPUS precisa de várias células lado a lado — quantas? fica legível?).
3. Tema por jogador no menu (server_form): como o JSON UI do Hub/Lista atual pode trocar texturas conforme o título (ex. flag extra §v§u§l§p§0§b§r para Black) sem quebrar as regras já medidas (só = not and or - +; gates por título; factory_variables nas células da Lista). Proponha a forma mais simples e robusta (ex.: duas variantes de imagem por slot com #visible por flag, ou variáveis definidas no root por tema não funcionam porque são estáticas?). Diga o custo (controles extras) e se é viável.
Responda com relatório objetivo (até ~900 palavras) + o rascunho de JSON da sidebar (pode ser longo se necessário).` },
  { key: 'leilao', prompt: `PESQUISA [leilao]. Responda com fatos verificados nas tipagens estáveis ${VT}/ref/node_modules/@minecraft/server/index.d.ts (cite linhas) e em fontes oficiais/comunidade (carregue WebSearch/WebFetch com ToolSearch "select:WebSearch,WebFetch"):
1. Como guardar ItemStacks por INTEIRO (encantamentos, nome, lore, livros escritos, shulker com conteúdo) só com a API ESTÁVEL 2.10.0, sem serializar para texto. Avalie: (a) entidade custom de armazenamento (BP entity com minecraft:inventory, invisível, sem colisão, imune) num local fixo do mundo carregado por tickingarea (dimension.runCommand("tickingarea add ...")? existe API estável para tickingarea?); (b) world.structureManager.createFromWorld(..., {includeEntities:true}) + place() para guardar/recuperar entidades com inventário (ou baús); (c) baús num chunk de armazenamento; (d) Container.setItem/getItem/moveItem/transferItem e ItemStack.clone entre containers. Qual é o mais robusto contra perda/duplicação (crash no meio, chunk descarregado, dois compradores ao mesmo tempo, vendedor offline, reload de script)? Proponha o desenho concreto (onde ficam, quantos itens por entidade, índice em propriedade dinâmica, operações atômicas em um tick, verificação de que o item ainda está lá antes de pagar, logs).
2. Como ler informações para exibir/buscar sem tirar o item do armazenamento: typeId, nameTag, amount, getComponent("enchantable").getEnchantments(), "durability", getLore(), localização do nome (RawMessage translate "item.<id>.name"/"tile.<id>.name" — ActionFormData aceita RawMessage nos botões?), ícone do item em botão de form (caminho de textura vanilla do item? não há mapa oficial; alternativas: ícones por categoria). Categorias simples baseadas em typeId/tags (ItemStack.getTags(), hasTag("minecraft:is_sword") etc.).
3. Valores justos: pesquise casas de leilão de servidores conhecidos (Hypixel Skyblock: taxa de anúncio e de recolhimento; DonutSMP/outros: limites, duração; CubeCraft/Lifeboat se houver) e compare com a economia do Vulpus (Caudas: ~30/h por tempo ativo, diária 25 a 60). Confirme ou ajuste a proposta (anúncio 1% mín. 1; venda 5%; 1..1.000.000; 5 anúncios; 48 h; caixa de retirada sem expirar) com justificativa curta.
4. Riscos de exploit conhecidos em AH de Bedrock/Java (dupe por desconexão, por form aberto com dados velhos, por shulker, por item na mão trocado entre abrir o form e confirmar) e como o desenho evita cada um.
Responda com relatório objetivo (até ~900 palavras) com o desenho recomendado.` },
]

phase('Pesquisa')
const pesq = await parallel(PESQUISAS.map(p => () =>
  agent(AMBIENTE + '\n\n' + DECISOES + '\n\n' + REGRAS + '\n\n' + p.prompt, { label: 'pesquisa:' + p.key, phase: 'Pesquisa' }).then(r => ({ key: p.key, r }))
))
const relPesq = pesq.filter(Boolean).map(x => '=== PESQUISA ' + x.key + ' ===\n' + x.r).join('\n\n')

phase('Spec')
const spec = await agent(AMBIENTE + '\n\n' + DECISOES + '\n\n' + REGRAS + `

SEU PAPEL: [arquiteto]. Escreva a especificação da fase 2 em ${SPEC2} (crie este único arquivo; pode também acrescentar um link para ele no topo de docs/ESTADO.md). Leia antes: docs/ESTADO.md, as specs 01 e 02 e o CÓDIGO REAL atual (vulpus_bp/scripts/**, vulpus_rp/ui/**, tools/*.py, manifests, package.json) — a spec nova estende o que existe e reusa o core (forms.js Hub/Lista/confirmar/perguntar, db.js, teleporte.js, comandos.js, config.js PADROES).
Relatórios de pesquisa:
${relPesq}

A spec deve ser a fonte da verdade para 6 implementadores que vão trabalhar AO MESMO TEMPO, cada um dono de arquivos disjuntos. Use exatamente estes papéis (pode ajustar o conteúdo, não os nomes):
- [glyphs]: tools/gerar_glyphs.py (Pillow) que gera vulpus_rp/font/glyph_E2.png (e outras folhas se precisar) + textura do título (a partir de IMGS/minecraft_title.png: recorte/redução para o menu e para a sidebar) + texturas do tema Black (painel/botões/cabeçalho/X em preto com laranja); scripts/glyphs.js com as constantes de caractere (ex. export const G = { CAUDAS: "\\uE200", ... }); tabela fixa de códigos na spec.
- [ui]: vulpus_rp/ui/** (tema Black no Hub/Lista e a sidebar em hud_screen.json + namespace próprio), tools/verificar_ui.py (estender para os novos arquivos/flags).
- [ranks]: scripts/sistemas/niveis.js (XP, nível, rank, ganho por minuto ativo e diária: defina como o ganho por minuto ativo é compartilhado com caudas.js sem duplicar o anti-AFK — ex. caudas.js chama uma função exportada, ou um evento interno), nameTag sobre a cabeça, escrita no canal compartilhado com o pack do chat (scoreboard objectives/tag), textos/niveis.js.
- [sidebar]: scripts/sistemas/hud.js reescrito como scoreboard lateral (substitui a HUD de actionbar; pausa/ajusta durante espera de teleporte conforme a pesquisa), textos/hud.js.
- [leilao]: scripts/sistemas/leilao.js (+ core extra só dele, ex. scripts/sistemas/leilao_armazem.js), textos/leilao.js, e a entidade/blocos do armazenamento no BP (vulpus_bp/entities/*.json etc.) se o desenho usar.
- [chat]: novo pack vulpus_chat_bp/ (manifest com a beta exata, scripts próprios, textos), sem importar nada do BP principal (packs não compartilham módulos JS); lê os dados pelo canal compartilhado.
- [integracao] (roda DEPOIS dos 6, junto com a verificação): config.js (PADROES novos), db.js (campos novos em DadosJogador com migração/completar), forms.js (flag de tema), menu.js (entrada do Leilão e o que mais mudar no Hub), ajustes.js (tema, sidebar), staff.js (configs novas, remover anúncio), perfil.js (nível/rank), regras.js/textos (comandos novos), boas_vindas.js, main.js, manifests, items, texts/lang, tools/build.py (3 packs no .mcaddon), instalar_dev.py (3º pack; o mundo precisa do Beta para o chat), README. Por isso, os 6 primeiros NÃO editam esses arquivos: a spec deve dizer exatamente o que a [integracao] vai acrescentar em cada um (assinaturas, campos, chaves), para os 6 programarem contra isso.
Conteúdo obrigatório: arquitetura e fluxo de dados; tabela de glyphs (código, nome, tamanho, desenho descrito); contratos (exports com assinaturas JSDoc) entre módulos; campos novos de DadosJogador e PADROES (com os valores do dono); canal compartilhado BP↔chat (formato exato); flags novas de UI (sidebar, tema) e o protocolo de texto da sidebar (linhas, ordem, tamanho máx.); desenho do armazenamento do leilão com garantias anti-dupe; comandos novos (todos vulpus:, cheatsRequired false); textos/rótulos; limites de desempenho (intervalos, nº de jogadores); o que fica fora do escopo; checklist de teste no jogo da fase 2. Se a pesquisa mostrou que algo é inviável (ex. tema Black), diga e defina o plano B.
Responda com um resumo curto (até ~400 palavras) da spec e de qualquer desvio das decisões do dono (e por quê).`, { label: 'arquiteto', phase: 'Spec' })

const BASE_IMPL = AMBIENTE + '\n\n' + DECISOES + '\n\n' + REGRAS + `
LEIA PRIMEIRO, INTEIROS: ${SPEC2} (fonte da verdade da fase 2), docs/ESTADO.md, e o código real do core (vulpus_bp/scripts/config.js, core/*.js) e dos sistemas que você toca. Outros 5 agentes trabalham ao mesmo tempo em arquivos disjuntos: crie/edite SOMENTE os arquivos que a spec atribui ao seu papel. O que a spec manda a [integracao] fazer depois (config.js, db.js, forms.js, menu.js, ajustes.js etc.) NÃO é seu: programe contra o contrato da spec.
Ao terminar: node --check nos seus .js, parse dos seus JSON, e se fizer sentido npm run check (erros de integração pendentes com a [integracao] são esperados; erros DOS SEUS arquivos não). Resposta final em texto (até ~500 palavras): arquivos, decisões fora da spec (e por quê), o que a [integracao] precisa saber, riscos, o que testar no jogo.`

const RETOMADA = ' RETOMADA: uma tentativa anterior deste papel foi interrompida no meio (limite de uso). Seus arquivos podem já existir PARCIAIS: leia o que houver, aproveite o que estiver certo e complete/corrija conforme a spec.'

const PAPEIS = [
  { key: 'glyphs', p: `SEU PAPEL: [glyphs].` + RETOMADA + ` Faça os glyphs em pixel art nítido (estilo da logo de raposa e das texturas da fase 1: veja tools/gerar_texturas.py e docs/previas/texturas.png), legíveis no tamanho do texto (a célula fica do tamanho de uma letra: desenhe silhuetas simples e fortes, 2-3 cores com contorno escuro). O título VULPUS: gere a partir de IMGS/minecraft_title.png as versões que a spec pede (textura para o menu e a sidebar; versão em células de glyph se a spec pedir). Texturas do tema Black. Gere uma folha de contato ampliada em docs/previas/glyphs.png e olhe (Read no PNG) até ficar bonito; ajuste. O script deve proteger arquivos trocados à mão como o gerar_texturas.py faz.` },
  { key: 'ui', p: `SEU PAPEL: [ui].` + RETOMADA + ` JSON UI da fase 2 conforme a spec: tema Black no Hub/Lista e a sidebar. Respeite TODAS as regras medidas da fase 1 (docs/pesquisa/02_tecnicas_comunidade.md seção 5, docs/ESTADO.md armadilhas, factory_variables nas células da Lista). Estenda tools/verificar_ui.py para os novos arquivos e flags, e deixe-o com 0 erros contra ${VT}/vanilla/ui e contra o jogo instalado (texturas do [glyphs] podem ainda não existir enquanto você trabalha: trate como aviso e rode de novo no fim).` },
  { key: 'ranks', p: `SEU PAPEL: [ranks].` + RETOMADA + ` Níveis, XP e ranks conforme a spec (mesma fórmula e ranks do Discord), nameTag sobre a cabeça, e o canal compartilhado com o pack do chat. Use glyphs de scripts/glyphs.js (feito pelo [glyphs] agora; siga a tabela da spec). Cuidado com desempenho (não reescreva nameTag/scoreboard sem mudança) e com jogadores inválidos.` },
  { key: 'sidebar', p: `SEU PAPEL: [sidebar]. Reescreva sistemas/hud.js como o scoreboard lateral do protocolo da spec (substitui a HUD de actionbar: title/actionbar ficam livres). Mantenha o export que outros usam (hudLigada vem de ajustes.js; pausarHud é usado por tpa.js — mantenha compatível ou siga a spec). Desempenho: atualize só quando mudar ou no intervalo da spec.` },
  { key: 'leilao', p: `SEU PAPEL: [leilao].` + RETOMADA + ` Leilão completo conforme a spec, com o armazenamento anti-dupe desenhado. Cada operação (anunciar, comprar, cancelar, retirar, expirar, staff remover) deve ser atômica e verificar o estado REAL antes de mexer em Caudas ou itens (item ainda na mão e igual ao mostrado; anúncio ainda ativo; espaço no inventário). Teste a lógica com os mocks de ${VT}/mock/ (estenda-os numa cópia sua em ${VT}/mock_leilao/ se precisar) cobrindo: compra dupla, cancelar durante compra, expirar, vendedor offline, inventário cheio, item trocado na mão.` },
  { key: 'chat', p: `SEU PAPEL: [chat].` + RETOMADA + ` Pack vulpus_chat_bp/ conforme a spec (manifest com a versão beta exata da pesquisa, script próprio). Formato: glyph do rank/staff/booster + nível + nome + mensagem; cores; anti-spam leve se a spec pedir; nunca deixar a mensagem sumir se algo falhar (em erro, deixe o chat vanilla passar). Teste no BDS (${VT}/bds) num mundo de teste com o experimento Beta ligado, como a pesquisa descobriu: o pack deve carregar sem erro de script (o chat só dá para testar com jogador, então valide ao menos o carregamento e o registro do evento).` },
]

phase('Implementar')
const impl = await parallel(PAPEIS.map(x => () =>
  agent(BASE_IMPL + '\n\n' + x.p, { label: 'impl:' + x.key, phase: 'Implementar' }).then(r => ({ key: x.key, r }))
))
const relImpl = impl.filter(Boolean).map(x => '=== ' + x.key + ' ===\n' + x.r).join('\n\n')
log(impl.filter(Boolean).length + '/6 frentes concluídas')

phase('Verificar')
const integ = await agent(AMBIENTE + '\n\n' + DECISOES + '\n\n' + REGRAS + `

SEU PAPEL: [integracao] + verificação. Leia ${SPEC2} e o código real. As 6 frentes terminaram; IMPORTANTE: uma integração PARCIAL (tudo menos o leilão) JÁ FOI FEITA e testada no BDS (veja docs/ESTADO.md: o slot 6 do Hub está desligado e há um passo a passo da integração final do leilão). Complete só o que falta para o leilão (main.js, slot 6, staff, regras, dica, README, teste simulado em C:/Users/gille/vt/mock) e confira o resto, sem refazer. Relatos:
${relImpl}

1. Faça TODA a parte [integracao] da spec (config.js, db.js com migração dos dados antigos, forms.js, menu.js, ajustes.js, staff.js, perfil.js, regras.js e textos, boas_vindas.js, main.js, manifests, items, texts/lang, tools/build.py com os 3 packs no .mcaddon, tools/instalar_dev.py com o 3º pack, package.json/jsconfig se preciso (inclua vulpus_chat_bp no check com as tipagens beta, ex. um jsconfig separado), README atualizado para o dono).
2. Verifique e corrija até zerar: npm run check (e o check do pack de chat), node --check em todos os .js, python tools/verificar_ui.py (jogo instalado e --vanilla ${VT}/vanilla/ui), python tools/gerar_texturas.py e tools/gerar_glyphs.py (sem --forcar), python tools/build.py (confira o conteúdo do .mcaddon: 3 packs, manifests, dependências, UUIDs únicos e novos para o pack de chat), python tools/instalar_dev.py --simular --mundo "Testes Claude".
3. Varra: todos os comandos novos registrados com cheatsRequired false; nenhum ciclo de import; imports/exports batendo; textos sem emoji; sem BOM.
Responda: o que integrou (arquivo: o quê), resultados das checagens (comando + saída resumida), o que ficou pendente.`, { label: 'integracao', phase: 'Verificar' })

phase('Revisar')
const revs = await parallel([
  () => agent(AMBIENTE + '\n\n' + REGRAS + `\n\nSEU PAPEL: [revisor-ui]. Revisão ADVERSARIAL do JSON UI da fase 2 (vulpus_rp/ui/**, fontes/glyphs e texturas novas). Você PODE editar somente vulpus_rp/ui/**, vulpus_rp/font/** e tools/verificar_ui.py. Leia ${SPEC2}. Relato da integração:\n${integ}\n\nTente QUEBRAR: titles/actionbar SEM flag continuam 100% vanilla? a sidebar some quando desligada? pisca? cobre outros elementos (hotbar, chat, bossbar, efeitos)? GUI scale grande/pequena e tela de celular (proporção estreita)? o tema Black não quebrou o índice dos cliques nem os forms sem flag? expressões só com = not and or - +; nada de $var em modifications; factory_variables; layers; glyphs com largura certa (sem cortar/sobrepor), legíveis no nameTag e no chat. Meça textos com a fonte real como na fase 1. Corrija cada problema real e rode tools/verificar_ui.py. Responda: lista (real x descartado) e correções.`, { label: 'revisor:ui', phase: 'Revisar' }),
  () => agent(AMBIENTE + '\n\n' + REGRAS + `\n\nSEU PAPEL: [revisor-logica]. Revisão ADVERSARIAL dos scripts da fase 2 EXCETO o leilão (niveis, hud/sidebar, integração em menu/ajustes/staff/perfil/db/config, pack de chat). Você PODE editar vulpus_bp/scripts/** (menos sistemas/leilao*.js e textos/leilao.js) e vulpus_chat_bp/**. Leia ${SPEC2}. Relato da integração:\n${integ}\n\nProcure bugs reais de jogo e de API (tipagens estáveis em ${VT}/ref e beta em ${VT}/refbeta se existir): modo restrito; loops que morrem; jogador inválido; nameTag reescrito toda hora (desempenho) ou perdido ao morrer/renascer/trocar dimensão; XP duplicado com as Caudas ou burlando o anti-AFK; nível/rank errado nos limites (nível 0, 5, 20, acima de 20); migração de dados antigos da fase 1 (jogador sem os campos novos); canal BP↔chat (jogador novo sem dados, staff, booster, valores ausentes); chat: mensagem que some em erro, comandos (/) não podem ser afetados, mensagens com § ou muito longas, spam, mute/cancel; sidebar com muitos jogadores. Corrija cada bug real; rode node --check e os checks de tipos. Responda: lista (real x descartado) e correções.`, { label: 'revisor:logica', phase: 'Revisar' }),
  () => agent(AMBIENTE + '\n\n' + REGRAS + `\n\nSEU PAPEL: [revisor-leilao]. Revisão ADVERSARIAL do leilão, focada em DUPLICAÇÃO e PERDA de itens/Caudas. Você PODE editar somente vulpus_bp/scripts/sistemas/leilao*.js, vulpus_bp/scripts/textos/leilao.js e os arquivos do armazenamento do leilão no BP (entities etc.). Leia ${SPEC2}. Relato da integração:\n${integ}\n\nTente quebrar com cenários concretos e teste com mocks em ${VT}/mock_leilao (ou crie): dois compradores no mesmo tick; comprar o próprio anúncio; cancelar enquanto alguém compra; form aberto com dados velhos (anúncio já vendido/cancelado/expirado); item na mão trocado/dropado entre abrir o form e confirmar; pilha parcial; shulker; inventário cheio na retirada; vendedor offline; desconexão no meio; reload de script (/reload) no meio de uma operação; chunk do armazenamento descarregado; armazenamento cheio; índice corrompido; preço 0/negativo/não inteiro/acima do máximo; taxa arredondando para 0; Caudas negativas; staff removendo anúncio (item volta para quem?). Confira também se a taxa e a média de preços estão certas. Corrija cada problema real (mínimo necessário). Responda: tabela cenário → resultado (antes/depois) e correções.`, { label: 'revisor:leilao', phase: 'Revisar' }),
])
const [revUi, revLog, revLei] = revs

phase('Fumaça')
const fumaca = await agent(AMBIENTE + '\n\n' + REGRAS + `

SEU PAPEL: [fumaca]. Você PODE editar qualquer arquivo de ${ADDON}. Relatos:
=== integração ===
${integ}
=== revisor-ui ===
${revUi}
=== revisor-logica ===
${revLog}
=== revisor-leilao ===
${revLei}

1. Rode tudo de novo: npm run check (+ check do chat), node --check, python tools/verificar_ui.py, python tools/build.py.
2. BDS 1.26.52.3 em ${VT}/bds: (a) mundo SEM experimentos só com Vulpus BP+RP (o principal deve carregar sem nenhum erro: content log limpo, comandos novos no help, item e entidade do leilão existem — ex. "summon"/"give" pelo console mostram que o tipo existe); (b) mundo COM o experimento Beta e os 3 packs (o pack de chat carrega sem erro de script e assina o chatSend). Use reload, help, list, scriptevent; capture saída e content log; corrija cada erro e rode de novo até limpar. Pare o servidor no fim.
3. Teste de fumaça com mocks (${VT}/mock, ${VT}/mock_leilao) cobrindo o fluxo principal: entrada de jogador novo e antigo (migração), ganho de XP/Caudas por minuto ativo, subir de nível/rank (nameTag e canal do chat), sidebar ligada/desligada, anunciar/comprar/cancelar/retirar no leilão.
Responda: versões, comandos rodados e saídas resumidas, erros achados e correções, estado final das checagens.`, { label: 'fumaca:bds', phase: 'Fumaça' })

phase('Final')
const final = await agent(AMBIENTE + '\n\n' + REGRAS + `

SEU PAPEL: [conferencia-final]. Você PODE editar qualquer arquivo de ${ADDON}. Relatos:
=== integração ===
${integ}
=== revisores ===
${revUi}

${revLog}

${revLei}
=== fumaça ===
${fumaca}

1. Corrija pontas soltas reais e pequenas que os relatos deixaram.
2. Rode a partir de ${ADDON}: npm run check (+ chat), node --check em todos os .js, python tools/verificar_ui.py, python tools/gerar_texturas.py e tools/gerar_glyphs.py (sem --forcar), python tools/build.py, python tools/instalar_dev.py --simular --mundo "Testes Claude". Tudo com 0 erros.
3. Sem lixo (caches, pastas de teste); .gitignore da raiz (só acrescente).
4. Atualize docs/ESTADO.md (fase 2: situação de cada frente, checagens, o que testar no jogo, armadilhas novas, como ligar o Beta no mundo/servidor e o aviso de que não tem volta) e o README para o dono. Mantenha as pendências do bot e as preferências do dono.
Responda: resultado de cada checagem, arquivos novos/alterados da fase 2, e um passo a passo CURTO de teste no jogo para o dono (não programador), incluindo como ativar o Beta só num mundo de teste.`, { label: 'conferencia', phase: 'Final' })

return { pesquisa: pesq.filter(Boolean).map(x => x.key), spec, implementacao: impl.filter(Boolean).map(x => x.key), integracao: integ, revisoes: { ui: revUi, logica: revLog, leilao: revLei }, fumaca, final }