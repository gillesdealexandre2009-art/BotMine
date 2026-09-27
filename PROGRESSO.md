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
│   └── manutencao.py        # backup diário
├── cogs_minecraft/          # reservado (ENABLE_MINECRAFT=false)
└── tests/                   # test_database.py, test_helpers.py, conftest.py (pytest)
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
