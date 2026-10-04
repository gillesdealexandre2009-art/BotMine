export const meta = {
  name: 'vulpus-spleef-torre',
  description: 'Spleef na torre: arena configurável no jogo, partidas com fila, eliminação, prêmios e reset automático; revisão anti-abuso, BDS e instalação',
  phases: [
    { title: 'Implementar', detail: 'sistema de spleef completo' },
    { title: 'Revisar', detail: 'revisão adversarial e correções' },
    { title: 'Entregar', detail: 'checagens, BDS, instalação' },
  ],
}

const ADDON = 'C:/Users/gille/OneDrive/Desktop/BotVulpus/BotVulpus/addon'
const VT = 'C:/Users/gille/vt'
const AMB = `Addon Minecraft Bedrock "Vulpus" 0.2.x em ${ADDON} (1.26.52; BP estável @minecraft/server 2.10.0 + server-ui 2.2.0, SEM experimentos no BP principal). Leia docs/ESTADO.md, docs/spec/02_spec_tecnica.md e 03_spec_fase2.md e o código real do core (config.js, core/*.js: forms, db, comandos, teleporte, efeitos, tela, util, permissoes) e dos sistemas (menu, staff, caudas, niveis, hud/sidebar, leilao_armazem como referência de estruturas e ticking area). Tipagens estáveis em ${VT}/ref/node_modules/@minecraft (confira TODA API usada). Ferramentas: no Bash, export PATH="/c/Users/gille/vt/node:/c/Users/gille/vt/py:$PATH". Mocks em ${VT}/mock e ${VT}/mock_leilao, BDS em ${VT}/bds. Arquivos vanilla do jogo para conferir nomes de partículas/sons/blocos: "C:/XboxGames/Minecraft for Windows/Content/data" (brarchive via tools/brarchive.py).
Regras: só mexa em ${ADDON}; não faça commit/push; UTF-8 sem BOM, LF; estilo do código existente (nomes em português, JSDoc, // @ts-check); textos PT-BR na voz da Kiza, curtos, gênero neutro, sem emoji (glyphs próprios ok); sem pay-to-win; sem TODO.`

const PEDIDO = `Pedido do dono: o spawn é uma ilha dividida em 4 partes; uma é de minigames. Há uma TORRE REDONDA (piso interno circular: 13 blocos de diâmetro em linha reta e 9 na diagonal, ou seja raio ~6-7; paredes de pedra/vidro, base com lava/magma visível) com 4 CAMADAS quebráveis de BLOCOS DE NEVE (minecraft:snow) em alturas diferentes. Ele quer um SPLEEF funcional já, bonito e caprichado. O mapa está no mundo do dono (não sabemos coordenadas nem o bloco exato), então TUDO precisa ser configurável no jogo pela staff.

Requisitos:
1. Configuração pela staff (Menu > Staff > Minigames > Spleef, e comando de staff equivalente):
   - A arena é um CILINDRO definido por CENTRO + RAIO (não por cantos): a staff fica no centro da torre (em qualquer camada) e clica "Marcar centro aqui" (guarda x/z do centro do bloco e a dimensão). O RAIO é detectado sozinho (a partir do centro, mede até onde vai a neve em cada direção; esperado ~6-7) e pode ser ajustado à mão (campo numérico, 3..32). A altura do cilindro vai de um pouco abaixo da camada mais baixa até um pouco acima da mais alta.
   - Marcar o ponto de espera (lobby, perto da entrada), o ponto de saída (para onde volta quem é eliminado/acaba) e, opcionalmente, o ponto de entrada no topo (padrão: centro acima da camada mais alta).
   - "Detectar camadas": varre a coluna do cilindro (do centro, para cima e para baixo, numa faixa de altura razoável, ex. ±64), encontra as alturas (Y) com piso de minecraft:snow (bloco configurável numa lista, padrão neve) e conta os blocos por camada; mostra o resultado (ex.: 4 camadas em Y=…, raio 6, N blocos cada). Só blocos DENTRO do círculo contam (distância horizontal ao centro <= raio + 0,5).
   - "Salvar estado" da arena: grava as camadas com world.structureManager (StructureSaveMode.World) para reconstruir depois de cada partida; o reset recoloca só as camadas (não a torre; uma estrutura por camada cobrindo o quadrado do círculo, mas restaurando só os blocos de neve/ar dentro do círculo para nunca apagar parede). Garanta que os chunks estejam carregados (ticking area estável como o leilão faz, ou checagem de carregamento) antes de salvar/resetar.
   - Configurações: mínimo de jogadores (2), máximo (16), contagem antes de começar (10 s depois de atingir o mínimo; 5 s se encher), tempo máximo da partida (5 min; depois disso, quem sobrou empata), prêmio do vencedor e de participação em Caudas (padrão 30 e 5) com LIMITE DIÁRIO por jogador (ex.: prêmios de no máximo 3 partidas por dia), XP de participação, ferramenta (pá de diamante com Eficiência), e bolas de neve que quebram o bloco atingido (liga/desliga, padrão ligado; recarga a cada X s).
2. Jogar:
   - Entrar na fila: comando /vulpus:spleef (abre o menu do spleef: entrar/sair da fila, como jogar, ranking, recordes) e ao pisar na área de espera (raio pequeno em volta do lobby) aparece o convite. Também um ponto de entrada no menu principal sem quebrar o layout atual (escolha a forma menos invasiva, ex.: botão "Minigames" num submenu existente que faça sentido, ou dentro do Perfil/Nível; justifique).
   - Partida: teleporta os jogadores (com o efeito de teleporte existente, sem espera) para a camada de cima espalhados em círculo; contagem 3-2-1 com títulos (core/tela.js) e sons; durante a partida a sidebar mostra "Spleef: vivos N, tempo" (integre com o hud/sidebar sem quebrar o resto); entrega a pá (item travado no inventário, não pode dropar) e bolas de neve se ligado; os itens DO JOGADOR não são mexidos (não limpar inventário!); se o inventário estiver cheio, não deixa entrar.
   - Quebra: só os blocos das camadas (dentro do círculo), só dentro da arena e só durante a partida (cancele playerBreakBlock/placeBlock nas paredes e fora da partida; staff em modo criativo pode editar fora da partida). Quebra instantânea do bloco da camada ao bater com a pá (entityHitBlock → setar ar com partículas), para ficar rápido e divertido.
   - Sem dano entre jogadores e sem morte por queda na arena (cancele dano com beforeEvents.entityHurt, se existir no estável — confira; senão use efeito de resistência/queda lenta); eliminação quando o jogador cair abaixo da camada mais baixa (Y < menor camada - 1) ou tocar lava/sair do cilindro (distância horizontal ao centro > raio + 1,5): efeito de eliminação (partículas + som + mensagem para a arena), teleporte para a saída, recolhe a pá/bolas.
   - Vitória: último vivo vence; fogos/partículas, título para todos da arena, anúncio no chat, prêmios, ranking (vitórias, partidas, melhor sequência) salvo; arena reseta automaticamente após alguns segundos e a fila volta a aceitar.
   - Saída/desconexão/morte/troca de dimensão durante a partida = eliminado e itens do spleef recolhidos (no próximo login também, se saiu no meio). Reload de script no meio da partida não pode deixar a arena quebrada nem jogadores presos: ao iniciar o script, se houver partida "aberta" salva, encerra e reseta.
3. Ranking flutuante opcional: texto no ar perto do lobby com o top 5 de vitórias (use nameTag de uma entidade invisível — ex. crie uma entidade simples no BP "vulpus:texto" sem colisão, imune, invisível, só com nome visível — ou explique a alternativa se inviável no estável), atualizado a cada partida; posição marcada pela staff.
4. Desempenho: checagens a cada 2-5 ticks só enquanto há partida; nada pesado parado.
5. Documente no README (seção Spleef: como a staff configura passo a passo e como jogar) e no ESTADO.md; comandos novos em Regras > Comandos; testes com mocks (fila, início, eliminação, vitória, desconexão, limite diário de prêmio, reset).`

phase('Implementar')
const impl = await agent(AMB + '\n\n' + PEDIDO + `

SEU PAPEL: implementar tudo, em arquivos novos (ex.: sistemas/spleef.js, sistemas/spleef_arena.js, textos/spleef.js, entidade vulpus:texto no BP se usar) e ganchos mínimos nos existentes (main.js, staff.js, menu/regras, hud.js, config.js PADROES, manifest/lang se precisar). Rode npm run check, node --check, python tools/verificar_ui.py, python tools/build.py e testes com mocks (crie ${VT}/mock/teste_spleef.mjs). Responda: arquivos, como funciona (para o dono), decisões, riscos, resultados.`, { label: 'implementar', phase: 'Implementar' })

phase('Revisar')
const rev = await agent(AMB + '\n\n' + PEDIDO + `

SEU PAPEL: revisão ADVERSARIAL do spleef e correção dos problemas reais. Relato do implementador:
${impl}

Tente quebrar: quebrar parede da torre ou bloco fora das camadas; colocar blocos; ficar fora da arena e não ser eliminado; voar/criativo/espectador; entrar duas vezes na fila; entrar sem espaço no inventário; dropar ou guardar a pá em baú; sair/desconectar/morrer/trocar dimensão no meio; /reload no meio; dois vencedores no mesmo tick; partida com 1 jogador; tempo esgotado; reset com chunk descarregado; farm de prêmios (entrar e sair, contas alternativas — limite diário funciona? prêmio de participação só para quem jogou de verdade, ex. ficou vivo X s ou quebrou N blocos); bolas de neve quebrando fora da arena; dano/morte na arena; desempenho com 16 jogadores; textos e sidebar. Confira APIs nas tipagens estáveis. Corrija o que for real e rode as checagens e os testes de novo. Responda: tabela cenário → antes/depois e correções.`, { label: 'revisar', phase: 'Revisar' })

phase('Entregar')
const ent = await agent(AMB + `

SEU PAPEL: entregar. Relatos:
=== implementação ===
${impl}
=== revisão ===
${rev}

1. Rode tudo: npm run check (+ chat), node --check em todos os .js, python tools/verificar_ui.py, python tools/gerar_texturas.py e gerar_glyphs.py (sem --forcar), python tools/build.py, todos os testes em ${VT}/mock e ${VT}/mock_leilao — 0 erros.
2. BDS ${VT}/bds (mundo VulpusTeste): carrega sem erro de script (content log), comandos novos no help, entidade nova (se houver) existe; se possível monte uma mini-arena por comandos de console (fill de neve em 2 camadas) e verifique detecção/salvar/reset via algum gatilho de teste; pare o servidor.
3. Instale: python tools/instalar_dev.py --mundo "Testes Claude" --chat.
4. Atualize docs/ESTADO.md com a situação.
Responda para o dono (não programador), curto: passo a passo para configurar a torre no jogo (o que marcar e onde), como jogar, valores padrão, e o que ainda pode precisar de ajuste depois do primeiro teste.`, { label: 'entregar', phase: 'Entregar' })

return { impl, rev, ent }