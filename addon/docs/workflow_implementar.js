export const meta = {
  name: 'implementar-addon-vulpus',
  description: 'Implementa o addon Vulpus (menu JSON UI + sistemas base) em BotVulpus/addon, verifica e revisa',
  phases: [
    { title: 'Implementar', detail: '6 agentes em paralelo, cada um dono de seus arquivos' },
    { title: 'Verificar', detail: 'tsc, verificar_ui, build; corrige erros mecânicos' },
    { title: 'Revisar', detail: 'revisão adversarial do JSON UI e da lógica dos scripts, com correção' },
  ],
}

const SCR = '<SCR>'
const ADDON = '<repo>\addon'

const BASE = `Você faz parte da equipe que implementa o addon "Vulpus" (Minecraft Bedrock 1.26.52, Script API @minecraft/server 2.10.0 + @minecraft/server-ui 2.2.0, sem experimentos) em ${ADDON}.
LEIA PRIMEIRO, INTEIRAS: ${SCR}\\spec\\01_spec_funcional.md e ${SCR}\\spec\\02_spec_tecnica.md (fonte da verdade: estrutura, donos de arquivo, contratos entre módulos, caminhos de textura, flags).
Regras:
- Crie/edite SOMENTE os arquivos que a spec técnica atribui ao seu papel (marcados [seu_papel]). Outros agentes trabalham ao mesmo tempo nos outros arquivos. Se precisar de algo de outro papel, siga o contrato da spec (e, se o arquivo do outro já existir, leia-o e use as assinaturas reais).
- Não mexa em nada do bot Python fora de ${ADDON} (exceto o que a spec permitir explicitamente ao seu papel).
- Qualidade de produção: código limpo, nomes em português como no bot, comentários curtos onde ajudam, sem código morto, sem placeholders "TODO". Textos para jogadores em PT-BR na voz da Kiza (leve, brincalhona, curta, gênero neutro), sem emoji (a fonte do jogo não tem; use •, », «, ✔, ✖, ★).
- Arquivos em UTF-8 sem BOM (os § das flags dependem disso).
- Verifique seu próprio trabalho antes de terminar (parse de JSON, "node --check" em JS, scripts Python rodando).
- NÃO grave relatórios .md no scratchpad (o harness bloqueia); sua resposta final em TEXTO deve listar: arquivos criados, decisões tomadas fora da spec (e por quê), dúvidas/riscos e o que precisa ser testado no jogo. Seja objetivo (até ~500 palavras).`

const PAPEIS = [
  {
    key: 'ui',
    prompt: `SEU PAPEL: [ui]. Arquivos: vulpus_rp/ui/server_form.json, vulpus_rp/ui/_ui_defs.json, vulpus_rp/ui/vulpus/vulpus_menu.json, tools/verificar_ui.py, tools/brarchive.py.
Esta é a parte mais delicada (JSON UI de server forms). Antes de escrever, estude: ${SCR}\\pesquisa\\02_tecnicas_comunidade.md (seções 2, 3 e 5 inteiras), ${SCR}\\pesquisa\\resultado_2.md (referência vanilla, regras medidas), o rascunho validado ${SCR}\\pesquisa\\proposta_rascunho\\RP\\ui\\ (+ validate.py), o vanilla real em ${SCR}\\vanilla_1.26.52\\ui\\ (server_form.json, ui_common.json, ui_template_buttons.json, settings_sections\\settings_common.json) e exemplos reais baixados em ${SCR}\\pesquisa\\src\\ (chestui, minui, bcore, skyls, tilemenu).
Implemente exatamente a arquitetura da spec técnica (2 ganchos no server_form.json, namespace vulpus_menu, hub 330x210 com 4+logo/texto+4, slot staff 8 no canto superior esquerdo, X próprio, lista 270x220 com factory, rótulo/cabeçalho/divisor próprios). Texturas: use os caminhos FIXOS da tabela da spec (o agente [texturas] gera os PNG nesses caminhos ao mesmo tempo).
Cuide de: botão com collection_details NO PRÓPRIO button; label e ícone com binding de coleção próprio; esconder o conteúdo do slot e não o painel; expressões só com = not and or - +; nenhum $var dentro do valor das modifications; property_bag #visible false nos gates; layers coerentes (fundo < botões < textos); text_alignment e max_size para texto não vazar; foco para gamepad (focus_enabled, e se possível focus_change_* entre colunas).
tools/brarchive.py: extrator de .brarchive (formato: magic u64, count u32, version u32, entradas de 256 bytes = 1 byte tamanho do nome + 247 bytes nome + offset u32 + tamanho u32; dados começam em 16+count*256). Já existe uma versão funcionando em ${SCR}\\brarchive.py — reaproveite.
tools/verificar_ui.py: conforme a spec técnica (aceita --vanilla <pasta>; por padrão extrai do jogo instalado para uma pasta temporária). Rode-o contra ${SCR}\\vanilla_1.26.52\\ui e deixe passando (texturas do RP ainda podem não existir enquanto o agente de texturas trabalha: nesse caso trate como aviso, não erro, e reexecute no fim).`,
  },
  {
    key: 'texturas',
    prompt: `SEU PAPEL: [texturas]. Arquivos: tools/gerar_texturas.py (Pillow, já instalado: Python 3.12 + PIL 12.3), e tudo que ele gera: vulpus_rp/textures/vulpus/ui/*.png + .json de nineslice, vulpus_rp/textures/vulpus/itens/menu.png, vulpus_rp/textures/item_texture.json, vulpus_bp/pack_icon.png, vulpus_rp/pack_icon.png.
Siga a tabela de texturas e a paleta da spec técnica (tamanhos, nineslice_size, base_size, caminhos exatos). Estilo: pixel art nítido coerente com o Minecraft (sem antialias nas bordas dos painéis/botões; desenhe em baixa resolução e escale com NEAREST quando fizer sentido), tema raposa (laranja #F28C38, creme, marrom escuro).
- painel: fundo escuro levemente translúcido (alpha ~240), borda laranja de 2px com cantos recortados, leve sombra interna; nineslice 8 deve funcionar esticado em 330x210.
- botões: 3 estados bem distintos (normal escuro com borda marrom e brilho no topo; hover laranja; pressionado laranja escuro com sombra invertida). Legibilidade de texto creme com sombra por cima dos 3.
- fechar: X creme/laranja legível em 16x16.
- logo PROVISÓRIA (128x128): emblema de cabeça de raposa estilizada (orelhas, máscara creme, olhos), bonita e simples, que simbolize o Vulpus até o dono ter a logo oficial. Fundo transparente.
- item menu 16x16: mini cabeça de raposa reconhecível.
- pack_icon 256x256: emblema da raposa sobre fundo com a cor do Vulpus.
Rode o script (python tools/gerar_texturas.py, a partir de ${ADDON}) e confira os arquivos. Depois gere UMA folha de contato para revisão humana em ${SCR}\\preview\\texturas.png (todas as texturas ampliadas lado a lado, com nome) e UM mock aproximado do menu principal em ${SCR}\\preview\\mock_hub.png (330x210 ampliado 3x: painel, faixa de título "VULPUS", X, 4 botões de cada lado com ícones vanilla de ${SCR}\\vanilla_1.26.52\\textures\\items e \\ui conforme config da spec, logo no centro e 3 linhas de texto embaixo) — só para revisão, não vai no pack. Olhe as imagens geradas (ferramenta Read em PNG) e ajuste até ficar bonito.`,
  },
  {
    key: 'core',
    prompt: `SEU PAPEL: [core]. Arquivos: vulpus_bp/scripts/main.js, vulpus_bp/scripts/config.js, vulpus_bp/scripts/core/{util,db,permissoes,jogadores,forms,teleporte,comandos}.js, vulpus_bp/scripts/textos/geral.js.
Implemente EXATAMENTE os contratos da spec técnica (nomes, assinaturas, semântica) — dois outros agentes estão escrevendo os sistemas contra esse contrato agora. Confira cada API nas tipagens oficiais: ${SCR}\\pesquisa\\src\\npm\\server-2.10.0.d.ts e server-ui-2.2.0.d.ts (use grep; ex.: CustomCommandRegistry.registerCommand, CustomCommand.cheatsRequired (padrão true!), CustomCommandParamType, CommandPermissionLevel, PlayerPermissionLevel, Player.commandPermissionLevel, isValid é propriedade, TeleportOptions, system.waitTicks, ModalFormData.textField(label, placeholder, {defaultValue}), toggle/dropdown/slider com objetos de opções, FormCancelationReason.UserBusy).
Detalhes importantes:
- forms.js: Hub sempre envia 9 botões (vazios = ''), Lista mapeia selection (conta só botões) para a ação certa mesmo com cabecalho/rotulo/divisor; mostrar() repete em UserBusy; títulos = FLAG + texto; nunca lança.
- comandos.js: registra no system.beforeEvents.startup; callback roda em modo restrito, então use system.run para o handler; PlayerSelector chega como array.
- teleporte.js: espera parada com contagem na actionbar, cancela ao andar >0,6 bloco ou levar dano, combate via entityHurt, recarga, staff pula espera e recarga, salva voltar, teleporte entre dimensões.
- db.js: propriedades dinâmicas do MUNDO por jogador (prefixo), cache em memória, JSON, limite de tamanho, todosJogadores() para ranking offline.
- textos/geral.js: PREFIXO e mensagens gerais na voz da Kiza.
- main.js: só os imports na ordem da spec (os arquivos de sistemas serão criados pelos outros agentes).
Ao terminar, rode "node --check" em todos os seus arquivos e, se possível, um tsc rápido: crie ${SCR}\\tsc_core com jsconfig apontando para seus arquivos e para os tipos em ${SCR}\\npm_ref\\node_modules (typescript: use npx -y -p typescript@5 tsc ...). Corrija todos os erros de tipo.`,
  },
  {
    key: 'sistemas1',
    prompt: `SEU PAPEL: [sistemas1]. Arquivos: vulpus_bp/scripts/sistemas/{menu,spawn,casas,voltar,tpa}.js e vulpus_bp/scripts/textos/{menu,spawn,casas,voltar,tpa}.js.
Implemente as funcionalidades da spec funcional (menu principal/Hub com os 9 slots, spawn, casas com CRUD completo e limite, voltar com registro de morte, TPA ir/trazer com pedidos, expiração, aceitar/recusar pelo menu e por comando, bloqueio por ajuste) usando SOMENTE o contrato do core da spec técnica (forms.js Hub/Lista/confirmar/perguntar, teleporte.js, db.js, comandos.js registrarComando, util.js, permissoes.js, jogadores.js, config.js ICONES/SONS, textos/geral.js). Exports exigidos pela spec (abrirMenu, irSpawn, definirSpawn, menuCasas, irVoltar, menuTpa, contarPedidos) com as assinaturas da spec. menu.js importa caudas.saldo, menuCaudas, menuPerfil, menuAjustes, menuRegras, menuStaff dos arquivos do agente [sistemas2] (assinaturas da spec).
Texto do corpo do Hub: saudação neutra, saldo de Caudas, online, uma dica da Kiza sorteada (lista de ~10 dicas em textos/menu.js). Nos botões do Hub, rótulos curtos (cabem em ~70px): "Spawn", "Casas", "TPA", "Voltar", "Caudas", "Perfil", "Ajustes", "Regras"; o botão de TPA mostra contagem quando houver pedidos ("TPA (2)").
Valide entradas (nome de casa: 1–16 caracteres, sem duplicar, sem só espaços; jogador alvo offline; pedir TPA para si mesmo; alvo com TPA bloqueado; pedido duplicado; expirado). Mensagens úteis e curtas.
Se os arquivos de core já existirem quando você começar, leia-os e use as assinaturas reais; senão siga a spec e releia no fim para alinhar. Ao terminar, rode "node --check" em todos os seus arquivos.`,
  },
  {
    key: 'sistemas2',
    prompt: `SEU PAPEL: [sistemas2]. Arquivos: vulpus_bp/scripts/sistemas/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js e vulpus_bp/scripts/textos/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js.
Implemente as funcionalidades da spec funcional (Caudas: saldo, diária com sequência e meia-noite de Brasília, ganho por tempo online com anti-AFK, ranking top 10 com offline, como ganhar, darcaudas da staff; Perfil com estatísticas e ver outro jogador; Ajustes com 3 alternâncias; HUD na actionbar a cada 20 ticks pausando durante espera de teleporte; Regras com 4 páginas — regras adaptadas para Minecraft, comandos, a lenda de Kiza (5 capítulos curtos, ver resumo da lore na spec), Discord com link configurável; Staff com definir spawn, configurações por ModalForm (todos os campos de PADROES com validação), dar Caudas e pegar item; Boas-vindas com primeira entrada, título, entrega do item travado no inventário e keepOnDeath, comando item) usando SOMENTE o contrato do core da spec técnica. Exports exigidos pela spec: saldo, adicionarCaudas, menuCaudas, ranking, menuPerfil, menuAjustes, hudLigada, menuRegras, menuStaff, garantirItem (assinaturas da spec). staff.js importa spawn.definirSpawn (agente [sistemas1]).
Regras do servidor (adaptar do Discord para o jogo): respeito sempre; nada de conteúdo impróprio (construções, placas, nomes); privacidade; sem spam; jogue limpo (sem hack/x-ray/duplicação, sem griefing, sem roubar, sem matar quem não quer PvP); fale com a staff. A HUD: curta, ex. "§6★ 120 Caudas §8| §f120 64 -30 §8| §7NE".
Use Date.now() para dia/tempo real; ticks para loops. Ganho por tempo: loop de 1 min soma tempo e conta minuto ativo só se o jogador se mexeu (>1 bloco ou girou a câmera) desde a última checagem; a cada intervaloCaudasMin minutos ativos ganha caudasPorIntervalo com aviso discreto na actionbar.
Se os arquivos de core já existirem quando você começar, leia-os e use as assinaturas reais; senão siga a spec e releia no fim para alinhar. Ao terminar, rode "node --check" em todos os seus arquivos.`,
  },
  {
    key: 'pacote',
    prompt: `SEU PAPEL: [pacote]. Arquivos: vulpus_bp/manifest.json, vulpus_bp/items/menu.json, vulpus_rp/manifest.json, vulpus_rp/texts/{languages.json,pt_BR.lang,en_US.lang}, package.json, jsconfig.json, tools/build.py, tools/instalar_dev.py, README.md e a edição do .gitignore da raiz C:\\Users\\Desktop\\Desktop\\Projetos\\BotVulpus\\.gitignore (só acrescentar addon/node_modules/ e addon/dist/).
Siga a spec técnica (UUIDs fixos, versões de módulo, dependências BP<->RP, min_engine_version). Para o JSON do item custom e os manifests, confira o formato atual numa fonte oficial (WebFetch/WebSearch: learn.microsoft.com/minecraft/creator, github.com/Mojang/bedrock-samples; carregue as ferramentas com ToolSearch "select:WebSearch,WebFetch" se precisar) — prefira um format_version de item que a 1.26 aceite com certeza.
package.json/jsconfig.json: devem permitir "npm install" e "npm run check" (tsc --checkJs) funcionando dentro de ${ADDON}. Rode npm install ao terminar (node 24 + npm 11 instalados) para garantir que resolve.
tools/build.py: validação + .mcpack + .mcaddon em addon/dist; rode-o (os arquivos dos outros agentes podem ainda não existir: o script deve dar erro claro nesse caso; rode de novo no fim se der).
tools/instalar_dev.py: copia os packs para as pastas development_* do Minecraft (detecção GDK e UWP); NÃO rode a cópia de verdade, só um modo --simular que mostra os caminhos (implemente esse modo) e rode-o.
README.md: para o dono, que não é programador (tom simples, passo a passo, PT-BR), conforme a spec. Se o harness bloquear a escrita do README, devolva o conteúdo completo na resposta final.`,
  },
]

phase('Implementar')
const impl = await parallel(PAPEIS.map(p => () =>
  agent(BASE + '\n\n' + p.prompt, { label: 'impl:' + p.key, phase: 'Implementar' }).then(r => ({ key: p.key, resumo: r }))
))
const feitos = impl.filter(Boolean)
log(feitos.length + '/' + PAPEIS.length + ' papéis concluídos')
const resumoImpl = feitos.map(f => '=== ' + f.key + ' ===\n' + f.resumo).join('\n\n')

phase('Verificar')
const verif = await agent(BASE + `

SEU PAPEL: [verificador]. Agora TODOS os papéis terminaram. Você pode editar QUALQUER arquivo de ${ADDON} para corrigir erros. Relatos dos implementadores:
${resumoImpl}

Faça, a partir de ${ADDON}:
1. npm install (se ainda não houver node_modules) e npm run check (tsc --checkJs). Corrija TODOS os erros de tipo e de integração (imports/exports com nomes ou assinaturas divergentes entre core e sistemas, parâmetros errados de API, isValid como propriedade, etc.). Repita até zerar.
2. node --check em todos os .js.
3. python tools/verificar_ui.py --vanilla "${SCR}\\vanilla_1.26.52\\ui" (e sem argumento, que extrai do jogo instalado). Corrija o que falhar.
4. python tools/gerar_texturas.py (garante texturas) e python tools/build.py. Confira que dist/Vulpus.mcaddon contém os dois packs com manifests válidos e todos os arquivos referenciados (scripts importados existem, texturas usadas existem, item_texture tem a chave do item, lang tem as chaves).
5. Varra inconsistências entre spec e código: flags iguais em forms.js e JSON; todos os comandos da spec registrados com cheatsRequired false; main.js importa todos os sistemas; nenhum ciclo de import com menu.js; textos sem emoji.
Responda com: resultado de cada checagem (comando + saída resumida), o que corrigiu (arquivo: motivo), e o que ficou pendente.`, { label: 'verificador', phase: 'Verificar' })

phase('Revisar')
const revisoes = await parallel([
  () => agent(BASE + `

SEU PAPEL: [revisor-ui]. Revisão ADVERSARIAL do JSON UI (vulpus_rp/ui/**) — você PODE editar somente vulpus_rp/ui/** e tools/verificar_ui.py. Contexto: o verificador já rodou; relato dele:
${verif}

Tente QUEBRAR o design contra as regras medidas pela pesquisa (${SCR}\\pesquisa\\02_tecnicas_comunidade.md seções 2-5 e ${SCR}\\pesquisa\\resultado_2.md seções 4, 6 e 8) e contra o vanilla real em ${SCR}\\vanilla_1.26.52\\ui:
- forms sem flag continuam 100% vanilla? (nenhum controls inserido em long_form/custom_form; nada tocado em generated_contents/dynamic_button)
- o clique de CADA slot e de CADA item de lista devolve o índice certo? (collection_details no próprio button; collection_name no stack_panel pai; collection_index só em site de instanciação; label/ícone com binding próprio)
- slots vazios somem sem desalinhar; slot staff vazio some;
- título sem flag; X funciona (button.menu_exit); ESC funciona;
- expressões válidas (sem < > >= % / ''+); nenhum view binding sem #propriedade; nenhum $var dentro de modifications;
- props inválidas para o tipo (collection_name em panel, collection_index em def top-level, etc.); referências @ns.elem inexistentes; variáveis $ não usadas ou erradas; layers; tamanhos (330x210 e 270x220) e textos que podem vazar; foco no gamepad; desempenho (nada pesado construído à toa).
Para cada problema real: corrija e explique. Rode tools/verificar_ui.py no fim. Responda com a lista do que encontrou (real x descartado) e do que corrigiu.`, { label: 'revisor:ui', phase: 'Revisar' }),
  () => agent(BASE + `

SEU PAPEL: [revisor-logica]. Revisão ADVERSARIAL dos scripts (vulpus_bp/scripts/**) — você PODE editar somente vulpus_bp/scripts/**. Contexto: o verificador já rodou; relato dele:
${verif}

Procure bugs reais de jogo e de API (confira nas tipagens ${SCR}\\pesquisa\\src\\npm\\*.d.ts):
- chamadas proibidas em modo restrito/early-execution (world/form antes do mundo carregar; mexer no mundo dentro de beforeEvents/callback de comando sem system.run);
- show() de form que falha em silêncio (UserBusy, jogador saiu); exceções não tratadas em loops (runInterval que morre); jogador inválido (isValid) em callbacks atrasados;
- TPA: pedido para quem saiu, aceitar expirado, aceitar duas vezes, viajante muda de dimensão, alvo bloqueado, limpeza ao sair;
- teleporte: espera/combate/recarga/staff; destino em outra dimensão; salvar voltar; destino função undefined;
- casas: limite, nomes, duplicados, mover/renomear/apagar; dados corrompidos/antigos (JSON inválido, campos faltando) não podem quebrar;
- Caudas: diária (fuso, sequência, virada de dia), anti-AFK, ranking offline, nunca negativo, darcaudas negativo;
- HUD: não brigar com a contagem; desligar; desempenho com muitos jogadores;
- boas-vindas/item: duplicar item, item travado, keepOnDeath;
- staff: validação de números da config, permissões, comandos de staff bloqueados para não-staff;
- comandos: todos com cheatsRequired false, nomes válidos (namespace vulpus:), parâmetros corretos.
Corrija cada bug real (mínimo necessário, mantendo o estilo), rode node --check e npm run check (tsc) no fim, a partir de ${ADDON}. Responda com a lista do que encontrou (real x descartado) e do que corrigiu.`, { label: 'revisor:logica', phase: 'Revisar' }),
])

return { implementacao: feitos, verificacao: verif, revisoes: revisoes.filter(Boolean) }
