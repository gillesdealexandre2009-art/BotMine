# PROGRESSO — Kiza (bot do VULPUS)

> Se a conversa for interrompida e você escrever **"continue"**, leia este arquivo
> e retome do primeiro item não marcado. Não refaça o que já está `[x]`.

## Árvore do projeto

```
kiza/
├── main.py                  # entrada: Bot, árvore de comandos, tratamento global de erros
├── config.py                # env + constantes (moeda, cores, ajustes padrão, permissões)
├── textos.py                # TODOS os textos fixos (voz da Kiza)
├── database.py              # ÚNICO módulo que acessa o SQLite
├── migrations.py            # migrações versionadas
├── requirements.txt / requirements-dev.txt
├── .env.example / .gitignore / railway.json
├── README.md / PROGRESSO.md
├── utils/
│   ├── permissoes.py        # níveis 0-3, checks, erros
│   ├── helpers.py           # embeds, durações, logs, publicar painéis, XP
│   ├── jogos.py             # matemática do Mines (funções puras)
│   └── views.py             # BaseView / DonoView
├── cogs/
│   ├── configuracao.py      # /setup, /configuracao, /ajustes
│   ├── entrada.py           # boas-vindas, adeus, autorole, regras, verificação
│   ├── cargos.py            # painel de cargos (cores, gênero, DM, idade)
│   ├── tickets.py           # tickets + SLA
│   ├── logs.py              # logs gerais
│   ├── moderacao.py         # warn/timeout/kick/ban/limpar + casos
│   ├── automod.py           # antispam, convites, links, menções, /raid
│   ├── canais.py            # /canal-regra + sugestões
│   ├── xp.py                # XP, níveis, /rank, /ranking
│   ├── economia.py          # /daily /perfil /saldo /pagar /economia-admin
│   ├── casamento.py         # união de toca (com reembolso e expiração)
│   ├── mines.py             # mini-game por diversão
│   ├── geral.py             # /ajuda, /status
│   ├── fidelidade.py        # /fidelidade, pedido de rank, contagem de boas-vindas/publicações
│   └── manutencao.py        # backup diário
├── cogs_minecraft/          # reservado (ENABLE_MINECRAFT=false)
└── tests/                   # test_database.py, test_helpers.py, test_bump.py, test_fidelidade.py, conftest.py
```

## Checklist

### Bloco 1 — Fundação
- [x] config.py
- [x] textos.py
- [x] migrations.py
- [x] database.py
- [x] utils/ (permissoes, helpers, views)
- [x] main.py
- [x] requirements, .env.example, .gitignore, railway.json

### Bloco 2 — MVP
- [x] cogs/configuracao.py (/setup, /configuracao, /ajustes)
- [x] cogs/entrada.py
- [x] cogs/cargos.py
- [x] cogs/tickets.py
- [x] cogs/logs.py
- [x] cogs/moderacao.py
- [x] cogs/geral.py
- [x] cogs/manutencao.py

### Bloco 3 — Engajamento
- [x] cogs/xp.py
- [x] cogs/economia.py
- [x] cogs/casamento.py
- [x] cogs/mines.py
- [x] cogs/canais.py
- [x] cogs/automod.py

### Bloco 4 — Docs e testes
- [x] tests/
- [x] cogs_minecraft/
- [x] README.md
- [x] Verificações (py_compile, checagem estática, testes do banco)

### Bloco 5 — Fidelidade e Porteiro (v1.4.0)
- [x] Marcação fantasma no canal de verificação ao entrar (`ping_verificacao` em /ajustes)
- [x] Cargo Porteiro: botão no /setup (Cargos base) e menção nas boas-vindas
- [x] Migração 4: contadores de fidelidade (com bumps antigos importados), entradas recentes, boas-vindas dadas, publicações, avaliação de denúncia
- [x] Contagem automática: bumps, boas-vindas, denúncias aprovadas, publicações (+ nível de XP)
- [x] /fidelidade, /fidelidade-ranking (staff), /fidelidade-ajustar (admin); metas `helper_*` em /ajustes
- [x] Tíquete "Solicitar rank" com quadro e botões Promover/Recusar; tíquete de denúncia com Aprovar/Rejeitar
- [x] /setup → Publicações (canais que contam); /configuracao mostra Porteiro, Helper e publicações
- [x] Textos, /ajuda, vitrine de comandos, FAQ, changelog 1.4.0, README; testes em tests/test_fidelidade.py
- [x] Revisão: anti-farm de boas-vindas (conta < 7 dias, quem volta, "bem-vindos" genérico só para os 3 últimos), publicações até 2/dia e desconto em 24 h com histórico, detalhe para a staff no /fidelidade, motivo obrigatório no /fidelidade-ajustar, decisão do pedido de rank gravada (sem clique duplo), Porteiro mencionável e sem cargo duplicado, mensagens apagadas só vão ao banco se forem de canal de publicação, avisos do cargo Helper no /configuracao
