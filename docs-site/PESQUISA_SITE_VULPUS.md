# VULPUS — Base técnica e visual para o site

> Documento de pesquisa (outubro/2026). Nenhum código de site foi escrito aqui: isto é a base para decidir **antes** de programar.
> Convenção de confiança: **[F]** = confirmado em fonte consultada (link na seção 22) · **[C]** = conhecimento meu, não verificado nesta pesquisa (precisa de teste ou conferência) · **[!]** = alerta/crítica.

---

## 0. Resumo executivo

1. **O site não é um produto isolado.** É a vitrine e o painel de um ecossistema que já tem três partes: o bot **Kiza** (Python + SQLite, no Railway), o **addon Bedrock** (JavaScript, módulos `@minecraft/server`) e o **Discord**. A decisão mais importante não é de framework: é **onde mora a "fonte da verdade"** dos dados (jogadores, Caudas, rankings). Hoje ela está dentro do SQLite do bot.
2. **Recomendação de stack:** **Astro 6 + TypeScript** (site estático-primeiro, com "ilhas" interativas), **CSS próprio com tokens** (ou Tailwind 4), **Hono** (API em TypeScript), **PostgreSQL** + **Drizzle**, **Better Auth** com login pelo **Discord**. Hospedagem do front na **Cloudflare Pages**; API e banco no **Railway** (onde você já está) ou Neon.
3. **A integração com o Minecraft Bedrock deve ser "de dentro para fora":** o addon (via `@minecraft/server-net`, que só funciona no **Bedrock Dedicated Server**) envia eventos para a API por HTTPS; o site **nunca** abre porta no servidor de jogo. Status online vem de **ping UDP feito pelo backend**, nunca pelo navegador.
4. **Três alertas críticos para o VULPUS** [!]:
   - **ECA Digital (Lei 15.211/2025)**, em vigor desde 17/03/2026, proíbe *loot boxes* para menores e exige verificação de idade em serviços de "provável acesso" por menores. Um servidor com público adolescente **está dentro do alvo**. Nada de caixa-surpresa paga, nem de rastreamento comportamental.
   - **O Kitsune "2x XP"** é um mimo de Discord que você já decidiu manter (sem nada dentro do jogo). O ponto de atenção é só um: hoje o **nível 5 é requisito para pedir Helper**, então quem paga chega **mais rápido** a um cargo de equipe. Se quiser sustentar o slogan "sem pay-to-win" sem ressalvas, calcule o requisito do Helper **sem o bônus pago** (ou tire o nível dos requisitos).
   - **Loja em Bedrock** exige cuidado com as regras comerciais da Mojang (só cosméticos, nada de vantagem de jogo, nada de caixa paga). Dá para fazer; deve ficar para a Fase 5+.
5. **Não construa tudo agora.** Ordem sugerida: fundação (design system + site estático em Astro) → status e notícias → backend e contas vinculadas → perfil de jogador e rankings → integrações → loja. Cada fase é útil sozinha.

---

## 1. O que sites de servidor fazem (e o que aprendi)

**Limite honesto da pesquisa:** consegui ler de verdade apenas **Wynncraft** e a **home do CubeCraft** (que é a página do *fórum*). O site do **The Hive** bloqueou a leitura (HTTP 403). O resto das conclusões abaixo combina o que li com conhecimento geral [C]; não afirmo nada específico sobre sites que não consegui abrir.

### O que vi
| Site | Estrutura observada | Lição |
|---|---|---|
| **Wynncraft** [F] | Hero → "o maior MMORPG de Minecraft" → **instruções de entrada (IP)** → builds/mapa → loot e economia → quests → endgame → CTA final. Nav: Home, News, Store, Community (Discord, Wiki, Ban Appeals, FAQ) + Stats, Items, Classes, Map. | **Vende o jogo pelo conteúdo**, não por adjetivos. O CTA "Jogar agora" aparece duas vezes com passos reais. Ferramentas de jogo (Stats, Items, Map) ficam numa nav secundária: o site vira *companheiro do jogo*. |
| **CubeCraft** [F] | IP e login no topo, anúncios em cards, forum com milhões de posts, loja, regras, segurança, "I want to play!". | Comunidade e **segurança/regras/denúncias** são cidadãos de primeira classe. Mas a home é de **fórum**: denso, datado visualmente. |

### O que fazem bem (padrões que valem conceitualmente)
- **Como entrar** é a primeira informação: IP, porta, plataformas, passo a passo. Em Bedrock isso é crítico (IP **e porta**; consoles têm limitações) [C].
- **Status vivo** (online agora, versão) cria prova social imediata.
- Navegação **curta** (5–7 itens) com a ação principal destacada.
- **Notícias/atualizações** mostram que o projeto está vivo.
- **Wiki, regras, FAQ e apelação de ban** reduzem carga de suporte.

### O que fazem mal (comum no nicho) [C]
- Template "gamer" genérico: neon + fundo escuro + fonte pixelada em tudo + partículas pesadas.
- Home que parece **fórum** ou **loja** antes de explicar o servidor.
- Carregamento pesado (vídeo de fundo, 3D) que pune celular, onde está a maior parte do público.
- Loja no centro da navegação (sensação de pay-to-win).
- Páginas de jogador que são tabelas cruas, sem hierarquia.

### O que parece moderno em 2026 [F]
Layouts **bento** (grade modular), **dark mode como padrão**, **micro-interações**, **scroll-driven animations em CSS**, header com **glassmorphism** (backdrop-filter) e design *performance-first*. O mesmo levantamento aponta que **3D/WebGL e personalização com IA "entregaram menos que o prometido"**: evite.

### O que está ultrapassado [C]
Carrossel de banner automático, contagem regressiva de "abertura" eterna, fundo de vídeo em loop, parallax pesado, ícones em fonte pixelada ilegível, pop-up de loja ao entrar, "fórum phpBB-like" como home.

> **Pendência de pesquisa:** analisar visualmente, com calma, 4–5 sites de servidores Bedrock e Java (incluindo Hive e Hypixel) em navegador. Isso não foi possível por leitura automática e deve ser feito manualmente antes da Fase 2.

---

## 2. Tecnologias: comparação

### 2.1 Frameworks de front-end
Dados de comparações de 2026 [F, fontes secundárias; os números de KB são ordens de grandeza, não garantia]: para um site de conteúdo de ~50 páginas, **Astro envia ~0–15 KB de JS**, **SvelteKit ~30–60 KB**, **Next.js ~80–150 KB**. Astro 6 saiu em março/2026 e o time do Astro foi adquirido pela Cloudflare em janeiro/2026 [F, relato de agregadores — vale conferir no comunicado oficial].

| Opção | Desempenho | Dev/manutenção | SEO | Ecossistema | Quando faz sentido | Veredito para o VULPUS |
|---|---|---|---|---|---|---|
| **HTML/CSS/JS puro** | Máximo | Ruim ao crescer (repetição, sem componentes) | Ótimo | — | Landing única (o que existe hoje) | Bom *protótipo*, **não** para anos de crescimento |
| **Astro 6** | Ótimo (HTML estático + ilhas) | Muito bom; Markdown/MDX para notícias, wiki, regras | Excelente | Médio-grande; usa React/Svelte/Vue como ilhas | Site público rico em conteúdo, com partes interativas pontuais | **Melhor encaixe para a parte pública** |
| **Next.js 16** | Bom, mais JS | Muito produtivo para *app* full-stack; Turbopack estável, Cache Components | Bom (SSR/SSG/ISR) | Gigante | Painel complexo logado, equipe React | Ótimo se o foco virar **app** (painel, loja). Excesso para o início |
| **SvelteKit** | Ótimo (bundle pequeno) | DX excelente | Bom | Menor | Apps interativos leves | Excelente escolha *alternativa*; menos pronto para conteúdo que o Astro |
| **Nuxt (Vue)** | Bom | Ótimo se a equipe curte Vue | Bom | Grande | Vue-first | Sem razão específica aqui |
| **Vue/React SPA puro** | Pior no primeiro carregamento | Simples | **Ruim** sem SSR | — | Dashboards internos | **Não** para site público |

**Critério decisivo:** a maior parte do site público é **conteúdo** (home, regras, notícias, wiki, como jogar). Interatividade real se concentra em poucas peças (status, ranking, perfil, busca). Isso é exatamente o desenho de **ilhas** do Astro: `client:visible` hidrata um componente só quando aparece na tela, e `server:defer` ("server islands") permite renderizar blocos dinâmicos sem travar o resto da página [F].

### 2.2 Estilo e componentes
- **Tailwind CSS 4**: rápido de produzir, consistente com tokens; risco de HTML poluído e "cara de template" se não houver sistema de design. **CSS puro com variáveis (tokens)**: dá identidade própria e é leve. **Recomendação:** tokens em CSS variables (já usados no site atual) + Tailwind opcional para espaçamento/utilitários. Bibliotecas de componentes (shadcn/ui, Radix) servem para **acessibilidade de modal/menu/tooltip**; use primitivas headless (Radix/Bits UI/Ark) e estilize você mesmo, para não parecer genérico.
- **Animação:** CSS (transições, `@keyframes`, scroll-driven animations, View Transitions API) cobre ~90%. Use **Motion/GSAP** só em casos específicos (timelines complexas). **Evite** WebGL/Three.js no início.
- **Estado:** quase não precisa. Páginas dirigidas por URL (filtros na query string) + cache de dados no servidor. Se houver estado de cliente: *nanostores* (Astro) ou stores do framework da ilha.

### 2.3 Backend, API e tempo real
- **REST/JSON** é o padrão certo: simples, cacheável, fácil para addon e bot consumirem. **GraphQL** não compensa. **WebSockets/SSE** só para "online agora" ao vivo e feed de atividade (Fase 5+); antes disso, **polling a cada 15–30 s com cache** resolve.
- **Framework de API:** **Hono** (TypeScript, leve, roda em Workers, Node, Bun) ou Fastify. Python/FastAPI seria coerente com o bot, mas dividiria o time de linguagens; veja a decisão na seção 7.
- **Autenticação:** **Better Auth** (biblioteca self-hosted, agnóstica de framework, guarda tudo no **seu** banco, suporta Discord OAuth e passkeys) vs **Auth.js v5** (maior catálogo, mais legado) vs **Clerk** (SaaS, custo). Comparações de 2026 apontam Better Auth como o crescimento mais rápido e com melhor TypeScript [F, fonte secundária]. **Para o VULPUS:** Better Auth + Discord.
- **Banco:** **PostgreSQL** (relacional, bom para economia/ledger, rankings, agregações). **SQLite** é excelente, mas o bot e a API concorreriam pelo arquivo. **ORM:** **Drizzle** (SQL-first, quase sem overhead, ótimo em edge) vs **Prisma** (DX completa, engine pesada) [F, fonte secundária]. Escolha: **Drizzle**.
- **Hospedagem:**
  - Front: **Cloudflare Pages** (estático grátis, CDN global; limites de free tier: 500 builds/mês [F]).
  - API/banco: **Railway** (já usado pelo bot) ou **Neon/Supabase** (Postgres gerenciado, tiers gratuitos para projeto pequeno [F]). **D1** (SQLite da Cloudflare) tem **limites diários de leitura/escrita aplicados desde set/2026** [F]: cuidado se for o banco principal.
  - **Imagens e arquivos:** Cloudflare R2 ou o próprio Pages para assets estáticos; WebP/AVIF.
  - **Monitoramento:** Sentry (erros) + UptimeRobot/Better Stack (disponibilidade) + Cloudflare Analytics (sem cookies).

### 2.4 Stack recomendada (e por quê)

| Camada | Escolha | Motivo técnico |
|---|---|---|
| Front público | **Astro 6 + TypeScript** | Conteúdo-primeiro, JS mínimo (Core Web Vitals), SEO nativo, Markdown/MDX para notícias/wiki/regras, ilhas para o que é dinâmico |
| Ilhas interativas | **Svelte 5** (ou Preact) | Bundles minúsculos para tabela de ranking, status, busca |
| Estilo | **CSS variables (tokens) + Tailwind 4 opcional** | Identidade própria e consistência |
| API | **Hono (TypeScript)** | Leve, tipada, portátil entre Workers/Node |
| Banco | **PostgreSQL + Drizzle** | Ledger e rankings confiáveis; migrações versionadas |
| Auth | **Better Auth + Discord OAuth** | Dados no seu banco; a comunidade já vive no Discord |
| Deploy | **Cloudflare Pages (front)** + **Railway (API/DB)** | Barato, simples e já familiar |

**Crítica a uma escolha "óbvia":** Next.js é a resposta famosa. Para o início do VULPUS ele traz mais JavaScript, mais complexidade de cache e dependência de padrões de hospedagem, sem entregar nada de que o site público precise. Se o painel logado crescer muito, ele pode virar um **app Next separado** depois (subdomínio `painel.`), sem refazer o site público.

---

## 3. Arquitetura e estrutura de pastas

Monorepo com **pnpm workspaces** (ou Turborepo): começa pequeno e comporta crescer.

```
vulpus/
├─ apps/
│  ├─ web/                    # Astro: site público
│  │  ├─ src/
│  │  │  ├─ pages/            # rotas (index, jogar, status, jogadores/[nome], rankings, noticias/[slug], regras, wiki/...)
│  │  │  ├─ layouts/          # Base.astro, Pagina.astro, Artigo.astro
│  │  │  ├─ components/
│  │  │  │  ├─ ui/            # Button, Card, Badge, Tabs, Modal, Tooltip, Skeleton (design system)
│  │  │  │  ├─ sections/      # Hero, StatusBar, FeatureBento, Roadmap, CTA
│  │  │  │  └─ islands/       # Ranking.svelte, StatusLive.svelte, PlayerSearch.svelte
│  │  │  ├─ content/          # Markdown/MDX: noticias, regras, wiki, changelog (Content Collections)
│  │  │  ├─ styles/           # tokens.css, base.css, utilities.css
│  │  │  ├─ lib/              # api client, formatadores, i18n
│  │  │  └─ assets/           # imagens (otimizadas no build), ícones SVG
│  │  └─ public/              # favicon, og images, robots.txt
│  └─ api/                    # Hono: backend
│     └─ src/
│        ├─ routes/           # /status, /players, /rankings, /ingest (addon), /auth, /me
│        ├─ services/         # regras de negócio (ranking, ledger, vínculo de contas)
│        ├─ db/               # schema Drizzle, migrações, seeds
│        ├─ auth/             # Better Auth, permissões (RBAC)
│        ├─ jobs/             # tarefas agendadas (snapshots, limpeza)
│        └─ lib/              # cache, rate limit, logger, config
├─ packages/
│  ├─ design-tokens/          # cores, tipografia, espaçamento (fonte única; CSS e TS)
│  ├─ shared/                 # tipos e schemas Zod compartilhados (contrato addon↔API↔site)
│  └─ ui/                     # (opcional) componentes reutilizáveis
├─ integrations/
│  ├─ addon/                  # (hoje: BotVulpus/addon) cliente HTTP do addon
│  └─ kiza/                   # (hoje: BotVulpus) ponte do bot com a API
├─ docs/                      # ADRs (decisões), design system, runbooks
└─ .github/workflows/         # CI: lint, testes, build, preview
```

**Princípios**
- **Contrato primeiro:** um pacote `shared` com schemas Zod para os eventos do addon e as respostas da API. Addon, bot e site compartilham a mesma definição.
- **Conteúdo em Markdown**, não no banco: notícias, regras e wiki versionadas no git (revisão por PR, histórico grátis). O banco guarda **dados vivos** (jogadores, stats, economia).
- **Config por ambiente** em variáveis; **segredos nunca no repositório**.
- **Cache em camadas:** CDN (páginas estáticas) → cache da API (30–60 s para status/ranking) → banco.
- **Permissões (RBAC):** `jogador`, `helper`, `staff`, `admin`, mapeadas dos cargos do Discord (que o bot já usa com 4 níveis).

---

## 4. UI/UX para comunidade de jogo

**Hierarquia e ritmo**
- Uma ação principal por tela (Entrar/Jogar). Secundárias em estilo "fantasma".
- Escala tipográfica fixa (ex.: 14/16/20/28/40/56) e **grade de 8 px** para espaçamento. Linha de texto com 60–70 caracteres.
- **Contraste:** texto ≥ 4,5:1 (AA); texto grande e componentes de interface ≥ 3:1 [C, WCAG].

**Navegação**
- Desktop: 5–6 itens + botão destacado. Mobile: menu em tela cheia e **barra de ação fixa** (o site atual já faz isso).
- Breadcrumb em wiki. **Busca** (Pagefind, estático, gratuito) a partir da Fase 2 [C].

**Estados que quase todo site esquece**
- **Carregamento:** *skeletons* com a forma do conteúdo (cards, linhas de ranking), nunca spinner solitário.
- **Vazio:** frase útil + ação ("Nenhum jogador encontrado. Confira o nome do Xbox.").
- **Erro:** diga o que houve e como seguir; **não** culpe o usuário; com ação de tentar de novo.
- **Offline do servidor:** mostrar "último visto há X min", não "0 jogadores" (parece bug).

**Tabelas, filtros, paginação:** ranking como **cartões empilhados no celular**, tabela só ≥ 768 px; filtros na URL (compartilháveis); paginação clássica ou "carregar mais" (evite rolagem infinita; também é proibida/desencorajada para menores pela ECA Digital como padrão de design manipulativo [F, fonte secundária]).

**Modais e tooltips:** usar primitivas acessíveis (foco preso, `Esc`, retorno de foco). Tooltip **nunca** é o único lugar de informação essencial (não existe hover no celular).

**Como parecer premium e memorável sem cara de "site gamer"**
1. **Contenção:** poucos tons, muito espaço, tipografia forte.
2. **Um motivo visual próprio** repetido com disciplina (aqui: orelhas/cauda de raposa como *formas*, cubos como *estrutura*), em vez de mil efeitos.
3. **Conteúdo real** (prints, clipes de 6 s, a ficha da Kiza, o mapa) como protagonista; ilustração só onde agrega.
4. **Microtexto com voz** (a Kiza fala): é o diferencial que template nenhum copia.

---

## 5. Identidade visual do VULPUS

**Conceito:** *"A toca ao anoitecer"* — um mundo vivo, calmo e misterioso, iluminado por **luz de lua e brasa**, não uma "floresta laranja".

**Paleta (proposta; já parte do site atual)**
| Papel | Cor | Uso |
|---|---|---|
| Fundo | `#0E1124` (azul-tinta) e `#151A35` | 70–80% da superfície |
| Superfície | `#1A2040` / `#212852` | Cards, painéis |
| Borda | `#2D3566` | Divisores sutis |
| Texto | `#EEF0FB` / suave `#AAB1D6` | Corpo |
| **Brasa (acento principal)** | `#F28C38` → `#FF6F61` | **Só** CTA, números-chave, detalhes (≤ 8% da tela) |
| **Lua (acento 2)** | `#B9A7FF` | Destaques secundários, gradientes |
| **Gelo (acento 3)** | `#8FD0FF` | Informação, links, raridade "rara" |
| Sucesso/Aviso/Erro | `#7BC96F` / `#F5C542` / `#E5534B` | Estados |

**Tipografia:** **Fredoka** (já em uso, licença OFL) para títulos, que dá o tom amigável; corpo em fonte de sistema/Inter. **Fonte pixel** (ex.: Silkscreen, OFL) **só** em microdetalhes (selos, números). **Não** use a fonte oficial do Minecraft (propriedade da Mojang).

**Linguagem de forma**
- **Orgânica:** orelhas de raposa e a curva da cauda como recortes (cantos de cartas, divisores de seção).
- **Geométrica:** cubos/isometria sutil como textura de fundo (padrão de baixa opacidade), grade de "blocos" em seções de recursos.
- **Luz:** brilho radial suave atrás do herói (já no site), *vagalumes* (poucas partículas, ver seção 6).

**Efeitos, com disciplina**
- *Glassmorphism* **só no header fixo** (onde é duradouro) [F]; cards usam borda 1 px + sombra suave, não vidro pesado.
- Gradientes: um por seção, lentos, de baixo contraste.
- Texturas: grão/ruído de 3–4% de opacidade; nada que atrapalhe a leitura.

**O que NÃO fazer**
- Laranja em tudo; neon saturado; sombra colorida em todo card.
- Pixel art em 100% do site (fica infantil/ilegível); usar assets/logotipo da Mojang de modo que sugira afiliação [F: as diretrizes proíbem implicar endosso]. Mantenha o aviso "não afiliado à Mojang/Microsoft" (já está no rodapé).
- Muitos estilos de card diferentes; ícones de famílias misturadas.
- Imitar o visual de outro servidor.

---

## 6. Animações e efeitos

| Efeito | Quando usar | Quando evitar |
|---|---|---|
| **Fade/slide curto (150–300 ms)** ao revelar seções | Orientar a leitura | Em tudo; vira ruído |
| **Hover/focus** em botões e cards | Feedback de interatividade | Como única pista (não existe no toque) |
| **Scale leve** (1.02) em cards clicáveis | Reforçar clicabilidade | Em elementos não clicáveis |
| **Scroll-driven CSS** (barra de progresso, revelações) | Narrativa de página única | Se o suporte do navegador alvo falhar: faça *fallback* estático |
| **View Transitions** entre páginas | Sensação de app | Páginas muito pesadas |
| **Parallax** | Quase nunca | Celular (causa enjoo e jank) |
| **Partículas/vagalumes** | 8–12 pontos em canvas/CSS, só no hero | Fundo permanente, celular fraco, bateria baixa |
| **Cursor customizado** | Quase nunca | Acessibilidade: dificulta rastrear o ponteiro |
| **Gradiente animado** | Um por página, muito lento | Atrás de texto |
| **Blur** | Header fixo | Muitos elementos (custa GPU) |

**Regras de segurança**
1. Animar **apenas `transform` e `opacity`** (rodam na GPU; não causam *layout shift*).
2. Respeitar `prefers-reduced-motion`: desligar tudo que se move sem quebrar o conteúdo [F: WCAG 2.2 trata animação por interação em 2.3.3 (AAA); a prática é a media query] [C].
3. Pausar efeitos fora da tela (`IntersectionObserver`) e com aba em segundo plano.
4. Orçamento: JS de animação < 20 KB; nenhum efeito pode atrasar o LCP.

**Teste de ouro:** *"Se eu remover o efeito, o usuário perde informação ou orientação?"* Se não, é enfeite: corte ou deixe opcional. **Efeito bom** = mostra *o que mudou* (um item novo no ranking entra com destaque), confirma uma ação, orienta atenção. **Efeito ruim** = decora.

---

## 7. Minecraft + site: o que é possível e o que exige o quê

### 7.1 O que o Bedrock oferece de verdade
- **Servidor oficial: Bedrock Dedicated Server (BDS)** [F]. Há também BDS estendido por *plugin loaders* — **Endstone** (C++/Python, "API de plugin estilo Paper"), **LeviLamina** (C++) — e servidores customizados do zero (**PocketMine-MP**, **PowerNukkitX**, **Nukkit**, **Dragonfly** (Go), **Allay**, **Serenity**) [F]. A Bedrock Wiki avisa que muitos projetos PHP foram descontinuados e que **a manutenção varia**: confira a atividade do repositório antes de apostar.
- **Script API (`@minecraft/server`)** é o caminho dos **addons** (o VULPUS já usa). O módulo **`@minecraft/server-net`** permite **requisições HTTP (GET, HEAD, POST, PUT, DELETE)** e **só funciona no BDS**; exige habilitar o módulo em `allowed_modules` (`config/default/permissions.json`) e usar **`@minecraft/server-admin`** para guardar segredos (tokens) fora do código [F]. A documentação consultada **não menciona WebSocket** para esse módulo; as referências de classes listam `WebSocket`/`WebSocketClient`, então **teste na sua versão** antes de planejar tempo real por WebSocket [F+C].
- **Consequência prática:** *"o addon fala com o site"* é viável **em saída** (BDS → API). Não é um canal para o site mandar comandos ao jogo (a menos que o addon faça *polling* de uma fila).
- **Status:** servidores Bedrock respondem a um **Unconnected Ping** (RakNet, **UDP**, porta padrão 19132) com o *pong* (MOTD, jogadores, versão). Isso exige **UDP aberto**; o navegador **não** faz UDP [F]. Bibliotecas: `minecraft-server-util` (Node, Java+Bedrock), `mcstatus` (Python) e APIs públicas (mcstatus.io) [F].
- **Skins/avatares Bedrock:** a **Geyser Global API** converte gamertag↔XUID **apenas de jogadores já vistos pelo cache do Geyser**, e skins de quem entrou por Floodgate ficam em *mineskin* [F]. Serviços como `mc-api.io` renderizam face/busto/corpo por XUID [F]. **Ou seja:** para jogadores que **nunca** passaram por Geyser, você pode **não ter skin**; o **plano B** é exibir avatar genérico/foto de Discord ou capturar a skin dentro do próprio servidor. **[!] Verificar:** se o Script API do Bedrock expõe **XUID** diretamente é algo que **não consegui confirmar**; sem XUID, a identidade confiável vem do **gamertag verificado pelo Xbox Live** no BDS (único por vez, mas **pode ser trocado pelo jogador**) [C].

### 7.2 Classificação: o que exige o quê

| Funcionalidade | Só site (estático) | Exige backend | Exige integração com o servidor |
|---|:-:|:-:|:-:|
| Home, regras, notícias, wiki, como entrar | ✅ | | |
| IP copiável, instruções | ✅ | | |
| Contagem "online agora" | | ✅ (ping UDP + cache) | |
| Login com Discord, cargos | | ✅ | |
| Perfil público de jogador | | ✅ | ✅ (dados vêm do jogo) |
| Ranking (tempo, kills, Caudas) | | ✅ | ✅ |
| Vincular conta Discord ↔ gamertag | | ✅ | ✅ (código dentro do jogo) |
| Economia visível no site | | ✅ | ✅ |
| Conquistas e histórico | | ✅ | ✅ |
| Mapa ao vivo | | ✅ | ✅ (exportar mapa/posições; para Bedrock, ferramentas são escassas: **[C] tratar como futuro distante**) |
| Loja com entrega automática | | ✅ | ✅ (fila que o addon consome) |
| RCON | — | — | **Bedrock não tem RCON nativo confiável** [C]; **não** dependa disso. Use fila de comandos consumida pelo addon |

### 7.3 Arquitetura recomendada de dados

```
[ Jogo (BDS + addon) ] --HTTPS POST (eventos assinados)--> [ API Hono ] --> [ PostgreSQL ]
          ^                                                      |   ^
          | (polling de fila: entregas, comandos autorizados)    |   |
          +------------------------------------------------------+   |
[ Kiza (bot Discord) ] <------- API interna (token de serviço) ------+
[ Site Astro ] --GET (cache CDN/30 s)--> [ API ]    [ Backend: ping UDP do servidor, cache ]
```
- **Eventos:** `player_join`, `player_leave`, `session_heartbeat` (a cada 60 s), `stat_update` (agregado, **não** por tick), `achievement`, `economy_tx`.
- **Idempotência:** cada evento com `event_id` único (a API ignora repetidos).
- **Assinatura:** HMAC do corpo com segredo compartilhado, mais *timestamp* (janela de 60 s).
- **Orçamento de chamadas:** o módulo tem **limites de requisições** (há classe `HttpRequestLimitExceededError`) [F]: agregue e envie em lotes.

> **Decisão-chave [!]: ledger único de Caudas.** Hoje as Caudas vivem no SQLite do bot (tabela `transacoes`, débito atômico). Com economia **dentro do jogo**, haverá dois escritores (bot e addon) e o site como leitor. **Nunca** deixe dois sistemas gravarem saldo em bancos separados. Duas saídas: (a) a **API central** vira dona do ledger e o bot passa a chamá-la; (b) manter o bot dono e o addon pedir tudo ao bot por HTTP. Recomendo (a), mas só **quando a economia no jogo existir**; até lá o bot continua como está.

---

## 8. Banco de dados

**Princípio:** começar com poucas tabelas, **append-only** onde a verdade é histórica, com migrações versionadas (Drizzle).

### Fase 3 (nascimento do backend) — essencial
```
players        id (uuid) · gamertag · xuid (nullable) · primeira_vez · ultima_vez · pais? (não) 
accounts       id · player_id? · discord_id (único) · discord_nome · criado_em       # login do site
link_codes     code · discord_id · expira_em · usado_em                              # vínculo (código dentro do jogo)
sessions_game  id · player_id · entrou_em · saiu_em                                  # tempo jogado
stat_counters  player_id · chave (ex.: "tempo_s", "mortes") · valor · atualizado_em  # genérico: novas métricas sem migração
events         id · player_id · tipo · payload (JSONB) · criado_em · event_id (único) # log append-only (auditoria/reprocesso)
```
### Fase 4 — perfil e ranking
```
achievements   id · chave · titulo · descricao · icone
player_achievements  player_id · achievement_id · obtido_em
ranking_snapshots    periodo (dia/semana/mês) · chave · player_id · valor · posicao  # evita recalcular tudo
titles / player_titles
```
### Fase 5+ — quando houver sistema real
```
economy_ledger  id · player_id · tipo · valor · saldo_apos · ref · criado_em        # imutável (modelo já existe no bot)
clans, clan_members       reinos, reino_members                                       # se o jogo tiver
punishments     id · player_id · tipo · motivo · staff · criado_em · expira_em
store_orders, store_items (só quando a loja existir)
```
**Não crie agora:** inventários, posições, blocos quebrados por tick, histórico de chat completo (volume enorme, risco de privacidade, quase nenhum valor).
**Boas práticas:** `stat_counters` genérico (chave/valor) permite medir "tempo", "mortes", "blocos" sem alterar o esquema; *snapshots* de ranking mantêm leitura barata; dados pessoais mínimos (ver seção 13).

---

## 9. Perfil de jogador (`/jogador/nome`)

**Estrutura (de cima para baixo)**
1. **Cabeçalho:** avatar (render do skin, ou fallback), nome, selos (Staff, Kitsune, Fundador), **"visto há…"**, botão copiar nome.
2. **Resumo em 4 cartões (bento):** tempo jogado · Caudas · posição no ranking geral · conquistas (n/total).
3. **Atividade recente:** linha do tempo curta (entrou, conquistou, subiu de nível).
4. **Conquistas:** grade com raridade; bloqueadas em silhueta com dica.
5. **Rankings do jogador:** "#12 em tempo, #3 em construção", com sparkline (opcional).
6. **Social:** clã/reino, amigos em comum (futuro), link do Discord (se a pessoa **optar**).
7. **Figurinhas (peculiar do VULPUS):** o álbum do jogador, que já existe no bot.

**Decisões de UX**
- **Privacidade por padrão:** perfil mostra só o necessário; **opt-out** do perfil público e do vínculo com Discord. [!] Há menores: nada de horário detalhado, nem localização, nem dados pessoais.
- **Celular:** cabeçalho compacto; cartões em 2 colunas; seções em abas ou acordeões; conquistas em carrossel **com botões** (não depender de arrastar).
- **Skeleton + cache:** perfil carrega em <1 s com dados em cache; dados vivos atualizam depois.
- **URL amigável:** `/jogador/Nome`; nome inválido → página de "não encontrado" com busca.

---

## 10. Páginas: o que fazer e quando

| Página | Classe | Justificativa |
|---|---|---|
| **Home** | ESSENCIAL | Explica o projeto e leva ao Discord/servidor |
| **Jogar** (como entrar) | ESSENCIAL | Bedrock: IP, porta, plataformas, passo a passo. É o que mais reduz desistência |
| **Regras** | ESSENCIAL | Moderação e base para apelações |
| **Discord/Comunidade** | ESSENCIAL | Já é o centro da comunidade (pode ser seção da home + página curta) |
| **Status** | IMPORTANTE | Prova social e redução de suporte ("o servidor caiu?") |
| **Notícias/Changelog** | IMPORTANTE | Mostra que o projeto está vivo (aproveitar o changelog que o bot já tem) |
| **FAQ** | IMPORTANTE | Reduz tíquetes |
| **Suporte/Apelação** | IMPORTANTE | Confiança; pode ser formulário + Discord |
| **Jogadores/Perfil** | FUTURA (Fase 4) | Depende do backend e de dados do jogo |
| **Rankings** | FUTURA (Fase 4) | Idem |
| **Eventos** | FUTURA | Só com eventos recorrentes (senão fica vazia) |
| **Wiki** | FUTURA | Valiosa quando houver sistemas próprios (clãs, economia) para explicar |
| **Mapa** | FUTURA (distante) | Tecnicamente caro em Bedrock |
| **Loja** | FUTURA (Fase 5+) | Alto risco legal/de percepção; só depois de o servidor ter jogadores |
| **Login/Painel** | FUTURA (Fase 3) | Necessário para vínculo e perfil |
| **Equipe/Recrutamento** | DESNECESSÁRIA agora | O recrutamento já acontece pelo Discord/fidelidade |
| **Fórum próprio** | **DESNECESSÁRIA** | Discord cumpre o papel; manter um fórum é custo de moderação |

---

## 11. Estrutura recomendada da home

A estrutura "Hero → Status → Identidade → Features → …" é razoável, mas **a ordem ideal depende do estágio**. O VULPUS **ainda não tem servidor aberto**: a home precisa **converter para o Discord**, não fingir um servidor lotado.

**Fase atual (pré-lançamento)**
1. **Hero:** proposta em uma frase + **Entrar no Discord** + "ver o que já tem". Arte da Kiza.
2. **Prova viva:** contagem de membros do Discord, últimas novidades, "x pessoas já na toca" (não mostre "0 online" do servidor).
3. **O que já existe** (bento): Kiza, níveis, figurinhas, lore, caminho até Helper.
4. **Vídeos curtos** (6–15 s, sem som obrigatório): a Kiza conversando, abrindo figurinha.
5. **Roadmap honesto:** "em construção / planejado".
6. **Princípios:** *sem pay-to-win* (com a regra concreta).
7. **Como a comunidade funciona:** equipe vem da comunidade.
8. **CTA final + FAQ curto.**

**Pós-lançamento do servidor**
1. Hero com **status ao vivo + IP copiável (1 clique)**.
2. Como entrar (passos).
3. Modos/sistemas (bento), 4. Rankings/jogadores em destaque, 5. Notícias/eventos, 6. Comunidade (Discord), 7. CTA, 8. Footer.

**Função de cada seção:** *Hero* decide em 5 s se a pessoa fica. *Prova viva* reduz o medo de "servidor morto". *Features* respondem "o que eu faço lá?". *Vídeo* mostra, não conta. *Roadmap* gera pertencimento. *Princípios* constroem confiança. *CTA* repete a ação com o contexto acumulado.

---

## 12. Performance

**Metas (p75 de usuários reais) [F]:** **LCP ≤ 2,5 s**, **INP ≤ 200 ms**, **CLS ≤ 0,1** (valores continuam os mesmos em 2026).

| Tema | Prática |
|---|---|
| **Renderização** | Páginas **estáticas (SSG)**; dados vivos por **ilhas** ou *server islands*; **ISR/cache** só onde precisar |
| **Imagens** | **WebP/AVIF**, `srcset`/`sizes`, **`width`/`height` sempre** (evita CLS; o site atual já falhou nisto uma vez), `loading="lazy"` abaixo da dobra, **`fetchpriority="high"`** na imagem do herói |
| **Vídeo** | **Nunca** hospedar vídeo pesado no site; YouTube *click-to-load* (já feito) ou clipes de poucos segundos em WebM/MP4 com `preload="none"` |
| **Fontes** | Subconjunto (latin), `font-display: swap`, **preload** só da fonte de título; no máximo 2 famílias |
| **JS** | Orçamento por página (ex.: < 60 KB gz); hidratar com `client:visible`/`idle` |
| **CSS** | CSS crítico inline na home; remover o não usado |
| **Cache/CDN** | Assets com `immutable` e hash no nome; HTML com cache curto; compressão **Brotli** |
| **Terceiros** | Evite scripts de rastreamento (também por LGPD/ECA); use analytics sem cookies |
| **Mobile** | Menos efeitos, imagens menores, `content-visibility: auto` em seções longas |

**Como manter bonito e leve:** o peso vem de **mídia e JS**, não de estética. CSS e SVG deixam o visual rico quase de graça. O site atual (≈1,2 MB, tudo estático) é um bom ponto de partida.

---

## 13. Segurança (inclui o risco específico "site ↔ servidor")

**Aplicação web**
- **Autenticação/sessão:** cookie **HttpOnly + Secure + SameSite=Lax**, sessão curta com renovação; **sem** token em `localStorage`.
- **OAuth Discord:** usar o **fluxo de código** com **`state`** (CSRF) e validar no retorno [F]; pedir só **`identify`** (e `guilds.members.read` **apenas** se precisar checar cargos); **evitar `email`** (minimização de dados) [F+C]. Tokens de acesso do Discord expiram (cerca de 7 dias) e devem ser revogáveis [F].
- **Autorização:** RBAC no servidor (nunca no front); toda rota de escrita checa permissão.
- **CSRF** em formulários/ações logadas; **XSS:** escape por padrão (Astro escapa), **nunca** `innerHTML` com dado de jogador; **CSP** restritiva (o Astro 6 tem suporte a CSP [F]).
- **SQL Injection:** ORM com parâmetros (Drizzle), nada de concatenar SQL.
- **Validação/sanitização:** Zod em toda entrada; limites de tamanho; gamertags podem conter caracteres estranhos.
- **Rate limiting:** por IP e por conta (login, busca, `/ingest`).
- **Segredos:** variáveis de ambiente; *secret scanning* no GitHub; rotação periódica; **uma chave por serviço** (addon, bot, site) com privilégio mínimo.

**Riscos que surgem quando o site conversa com o servidor** [C]
1. **Falsificação de eventos:** qualquer um pode chamar `/ingest` e inflar o ranking. → **HMAC + timestamp + idempotência**, token só no BDS, IP allowlist se possível.
2. **Vazamento do segredo do addon:** o pacote de addon pode ser lido por quem tiver acesso ao servidor. → guardar o segredo em **`server-admin` secrets**, **não** no código [F]; rotação fácil.
3. **Confiar em identidade enviada pelo cliente:** **nunca** aceite "sou o jogador X" do navegador; a identidade vem do **servidor** (evento do BDS) ou do **OAuth**.
4. **Vínculo de contas por sequestro:** o código de vínculo deve ser **de uso único, curto (5–10 min)** e gerado no Discord **ou** no jogo, com confirmação no outro lado.
5. **Execução de ações no jogo a partir do site (loja):** só por **fila** consumida pelo addon, com *allowlist* de ações e limites; **nunca** repasse texto livre como comando.
6. **Exposição de dados pessoais de menores:** gamertag público é aceitável; **horários, Discord e outros dados só com consentimento**.
7. **DoS:** o ping UDP ao servidor deve ser feito **uma vez** por intervalo no backend e **cacheado**; nunca por visitante.
8. **Abertura de portas:** a arquitetura "de dentro para fora" evita expor o BDS ao site.

**Conformidade (Brasil) [!]**
- **ECA Digital (Lei 15.211/2025)** [F, fontes secundárias]: vigente desde **17/03/2026**; alcança serviços "direcionados ou de provável acesso" por menores de 18; **verificação de idade (autodeclaração isolada não basta)**, **supervisão parental para menores de 16**, **proibição de publicidade comportamental**, **restrição a design manipulativo** (rolagem infinita, autoplay, notificações emocionais), **vedação de loot boxes**, **avaliação de impacto**; sanções de até **10% do faturamento (teto R$ 50 mi)**; fiscalização pela **ANPD**, em fases até janeiro/2027. **Não consegui abrir o texto oficial no Planalto** (conexão recusada): **leia a lei e peça orientação jurídica** antes de qualquer cobrança ou coleta de dados.
- **LGPD:** base legal, minimização, política de privacidade clara em português, canal para exclusão (o `/memoria esquecer` da Kiza é um bom precedente).

---

## 14. SEO

- **Metadados por página:** `<title>` único (≤ 60 caracteres), `meta description` (≤ 155), canonical, `lang="pt-BR"`.
- **Open Graph/Twitter Card:** imagem 1200×630 por página (a ficha da Kiza e os banners ajudam).
- **Favicon:** SVG + `apple-touch-icon` + manifest; **sitemap.xml** e **robots.txt** gerados no build.
- **URLs:** curtas, em português, sem parâmetros (`/jogar`, `/regras`, `/jogador/nome`).
- **Dados estruturados (Schema.org):** `Organization`, `WebSite` (com `SearchAction`), `BreadcrumbList`, `Article` nas notícias. [C] Resultados ricos de **FAQ** foram bastante restringidos pelo Google; use FAQ pelo valor ao usuário, não por SEO.
- **Indexação:** páginas de **perfil de jogador** só indexáveis se houver conteúdo útil e **consentimento**; use `noindex` nas demais e em páginas finas/duplicadas (filtros, paginação profunda).
- **Como aparecer em buscas "servidor minecraft bedrock brasil":** conteúdo próprio e atualizado (como entrar, regras, notícias), **listagens de servidores** (cadastro nas listas BR), **backlinks** da comunidade (Discord, YouTube), páginas por intenção ("servidor Bedrock sem pay-to-win", "como entrar no servidor Bedrock pelo celular"), e **Core Web Vitals** bons. SEO de nicho é, sobretudo, **conteúdo + autoridade local**.

---

## 15. Acessibilidade

- **WCAG 2.2 nível AA** como meta. Novidades relevantes [F]: **2.5.8 tamanho mínimo de alvo (24×24 px CSS)**, **2.5.7 movimentos de arrastar precisam de alternativa de um toque**, **2.4.11 foco não pode ficar totalmente encoberto** (cuidado com a **barra fixa do celular** cobrindo o item focado), 2.4.13 aparência do foco (AAA).
- **Auto-crítica ao site atual [!]:** o carrossel de features no celular **só se arrasta**; falta **botões de anterior/próximo** (2.5.7) e um indicador de posição. Corrigir na migração.
- **Teclado:** ordem lógica, foco **visível** (anel claro 3:1), "pular para o conteúdo", `Esc` fecha menu/modal.
- **Leitores de tela:** HTML semântico (`nav`, `main`, `h1..h3`), `aria-expanded` no menu (já feito), texto alternativo útil (decorativo = `alt=""`), anúncios `aria-live` educados para status.
- **Movimento reduzido** e **tamanho de texto** (rem, até 200% sem quebrar).
- **Cor nunca como única pista** (raridade tem ícone + texto, não só cor).
- **Estética sem sacrificar acesso:** o tema escuro tem contraste alto por natureza; garanta 4,5:1 nos textos "suaves" (`#AAB1D6` sobre `#0E1124` passa; revalide em todo novo par).

---

## 16. Mobile planejado (não "desktop encolhido")

- **Navegação:** barra inferior opcional com 4 ações (Jogar, Status, Rankings, Discord) em vez de só hambúrguer, na Fase 4+; hoje: menu + **barra fixa de CTA** (já existe).
- **Cards:** empilhados, **texto primeiro**, imagem secundária; gestos **sempre com alternativa em botão**.
- **Rankings/tabelas:** **cartões** com a posição em destaque; colunas secundárias viram "mais detalhes".
- **Perfil:** cabeçalho compacto, abas, informações essenciais "acima da dobra".
- **Loja (futuro):** checkout em **um fluxo**, **Pix com QR/copia-e-cola** como padrão no Brasil [F: Pix é o meio nº 1].
- **Animações:** reduzidas; sem parallax; partículas desligadas em baixa performance/`Save-Data`.
- **Imagens:** tamanhos menores por `srcset`; sem vídeo de fundo.
- **Testes reais:** celulares Android de entrada (a maioria do público Bedrock está em Android) com **Lighthouse mobile** como porta de qualidade.
- **Cuidado Bedrock [C]:** **muita gente entra pelo celular/console**; explique "como adicionar servidor" com prints por plataforma; consoles têm limitações de adição manual (**conferir a solução atual** antes de prometer).

---

## 17. Design System inicial do VULPUS

**Tokens (fonte única em `packages/design-tokens`)**
```
Cores: bg-0 #0E1124 · bg-1 #151A35 · surface-1 #1A2040 · surface-2 #212852 · border #2D3566
       text #EEF0FB · text-soft #AAB1D6 · ember #F28C38 · ember-2 #FF6F61 · moon #B9A7FF · ice #8FD0FF
       ok #7BC96F · warn #F5C542 · danger #E5534B
Tipografia: display Fredoka (600–700) · corpo system/Inter (400–600) · pixel Silkscreen (só detalhe)
   escala: 12 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 64 (clamp para fluido); altura de linha 1.5 corpo / 1.1 título
Espaçamento: base 4; passos 4 8 12 16 24 32 48 64 96 (seções: 56 mobile · 84 desktop)
Raios: sm 8 · md 14 · lg 20 · pill 999
Sombras/elevação: e0 nenhuma · e1 0 4px 14px rgba(0,0,0,.25) · e2 0 18px 50px rgba(0,0,0,.35) · glow-ember 0 10px 30px rgba(242,140,56,.35)
Movimento: rápido 120ms · normal 200ms · lento 400ms; easing cubic-bezier(.2,.8,.2,1)
```
**Componentes e regras**
- **Botões:** `primary` (gradiente brasa, texto escuro), `ghost` (borda), `danger`; altura mínima **44 px no toque**; estados: normal/hover/focus/active/disabled/loading.
- **Inputs:** rótulo sempre visível, erro abaixo com ícone + texto, foco claro.
- **Cards:** borda 1 px, raio lg, elevação e1; **uma** variante clicável (com hover e foco) e uma estática.
- **Badges/tags:** raridade (comum/rara/épica/lendária) com **ícone + cor**; status (online/offline/manutenção).
- **Modais/menus/tooltips:** primitivas acessíveis; trap de foco; `Esc`.
- **Ícones:** **uma** família (SVG, ex.: Lucide) + emojis só em conteúdo editorial (a voz da Kiza).
- **Estados:** todos os componentes de dados têm **loading (skeleton), vazio, erro** documentados.
- **Documentação viva:** uma página `/_design` (Storybook leve ou página Astro interna) mostrando todos os componentes e tokens. **Regra de ouro:** nenhuma cor/espaçamento "solto" no código; só tokens. Isso é o que faz as páginas parecerem **um produto só**.

---

## 18. Integração com Discord

| Integração | Recomendação | Observações |
|---|---|---|
| **Login com Discord (OAuth2, `identify`)** | **Recomendada** | Fluxo de código + `state` [F]; a comunidade já está lá |
| **`guilds.members.read`** | Recomendada, se for mostrar cargos/nível | Confirma que a pessoa **está** no servidor e lê cargos [F] |
| **Vincular gamertag ↔ Discord** | **Recomendada (núcleo do perfil)** | Código de uso único gerado no Discord (`/vincular`) e confirmado **no jogo** (ou o inverso) |
| **Cargos sincronizados** | Recomendada | O bot já controla níveis 0–3; a API consulta a mesma fonte |
| **Webhooks** (novidades, status, eventos) | Recomendada | Simples, sem servidor; o bot já posta em canais |
| **Widget público de membros/online** | Opcional | Bom para "prova viva" na home [C] |
| **Tíquetes/suporte pelo site** | **Desnecessário agora** | Já existem tíquetes no Discord; duplicar custa moderação |
| **Escopo `email`/`connections`** | **Evitar** | Não precisa; minimização de dados [F+C] |
| **Bot "ouvindo" tudo para o site** | Evitar | Privacidade e custo; envie **agregados** |

---

## 19. Loja (se e quando)

**Tese:** a loja é a parte **mais arriscada** (legal, ética e de percepção). Deve nascer **tarde**, **pequena** e **cosmética**.

- **Regras comerciais da Mojang (resumo das fontes consultadas, **não** do texto oficial, que não abriu):** vender **cosméticos** (chapéus, pets, efeitos, cores de nome, prefixos/títulos) é permitido; **não** é permitido vender **vantagem de jogo**, mecânicas *pay-to-win*, **loot boxes por dinheiro real**, kits com equipamento melhor, comandos que afetem o jogo (fly, godmode) [F, fontes secundárias]. Violar pode levar a **bloqueio do servidor** e outras sanções [F, fonte secundária]. **Leia o texto oficial** (*Commercial Usage Guidelines* / EULA) antes de lançar.
- **Brasil:** loot boxes são **vedadas para menores** (ECA Digital) [F]. **Nada de caixa-surpresa paga**, em hipótese alguma.
- **Pagamentos:** **Pix** é indispensável. Opções: **Tebex** (processa Pix via PagBrasil [F]; é a plataforma "padrão" de servidores, porém voltada principalmente a Java e com integração menos direta no Bedrock [C]) ou **Mercado Pago / Stripe** com checkout próprio (mais trabalho, mais controle) [F+C].
- **Fluxo seguro:** pedido → pagamento confirmado por **webhook** (valida assinatura) → grava `order` → **fila de entrega** → addon consome e **confirma** → histórico visível. **Nunca** entregar por redirecionamento do navegador.
- **UX anti-pay-to-win:** loja **fora da navegação principal** (link discreto "Apoiar"); copy de **apoio**, não de vantagem; **preço sempre visível**; **nenhum contador de escassez/urgência falsa**; sem pop-ups; mostrar em linguagem simples "o que isso **não** dá".
- **Menores:** pagamento exige adulto/consentimento; **sem** pressão de compra; limites de gasto sugeridos.

> **[!] Ponto de atenção sobre o que já existe:** o cargo **Kitsune** dá **2x de XP** (decisão que você já tomou: mimo só de Discord). Como o **nível mínimo do Helper** usa esse XP, o boost pago encurta o caminho até um cargo de equipe. Duas saídas simples: (a) o requisito de nível do Helper ignora o bônus pago; (b) o boost passa a ser 100% cosmético (cor, título, banner). O que **não** pode acontecer é o benefício de XP chegar ao jogo.

---

## 20. Roadmap

| Fase | O que construir | Por quê | Dependências | Dificuldade | Prioridade | Pode esperar |
|---|---|---|---|---|---|---|
| **1 — Fundação** | Monorepo; **design system/tokens**; migrar o site atual para **Astro**; CI (lint, build, Lighthouse); domínio e e-mail; política de privacidade | Evita retrabalho; define a "cara" | Escolhas desta pesquisa | Média | **Alta** | Loja, i18n, painel |
| **2 — Site público** | Home (estrutura da seção 11), **Jogar**, **Regras**, **FAQ**, **Notícias/Changelog** (Markdown), **Status** (ping UDP + cache), SEO básico, busca (Pagefind) | Primeira impressão e suporte | Fase 1 | Baixa–média | **Alta** | Wiki completa |
| **3 — Backend** | API Hono + Postgres + Drizzle; **login Discord** (Better Auth); **vínculo gamertag↔Discord**; endpoint `/ingest` assinado; observabilidade (Sentry, uptime) | Base de todo dado vivo | Fases 1–2; **servidor Bedrock no ar** | Média–alta | Média-alta | Tempo real |
| **4 — Jogadores** | `players`, `sessions`, `stat_counters`; **perfil**; **rankings** (snapshots); conquistas simples; figurinhas no perfil | O "gancho" do site: ver seu progresso | Fase 3 + addon enviando eventos | Média | Média | Mapa, clãs |
| **5 — Integrações** | Cargos sincronizados; webhooks (novidades/eventos); **ledger único de Caudas** via API; economia visível; ponte com o bot (Kiza consulta a API) | Unifica ecossistema | Fase 3–4 | Alta (migração do ledger) | Média | Loja |
| **6 — Sistemas avançados** | **Loja cosmética** (Pix, webhooks, fila de entrega); eventos recorrentes; wiki ampla; punições visíveis/apelações; clãs/reinos | Só com comunidade ativa | Fase 5; **parecer jurídico** | Alta | Baixa-média | Mapa ao vivo |
| **7 — Polimento** | Acessibilidade AA completa; i18n (EN/ES); PWA; micro-interações; testes de carga; backups e *runbooks*; auditoria de segurança | Qualidade durável | — | Média | Contínua | — |

**Marcos de decisão:** (a) *servidor Bedrock aberto?* → liga as Fases 3–4; (b) *ledger único?* → antes da economia no jogo; (c) *loja?* → só com parecer jurídico e benefício Kitsune revisto.

---

## 21. Entrega final (resumo operacional)

**Principais descobertas**
1. Para sites de servidor, **o "como entrar" e o status vivo** pesam mais que efeitos.
2. **Astro** encaixa melhor que Next.js no estágio atual; **Postgres + Hono + Better Auth** formam um back-end enxuto.
3. **`@minecraft/server-net` só existe no BDS** e é **de saída**; o desenho seguro é **"o jogo fala com a API"**.
4. **Skins Bedrock são o ponto fraco** (dependem de Geyser/Floodgate/capturas próprias).
5. **ECA Digital e as regras comerciais da Mojang** moldam a loja e o design.

**Erros a evitar**
- Construir backend, loja e mapa antes de o servidor ter jogadores.
- Dois sistemas gravando saldo de Caudas.
- Efeitos pesados, vídeo de fundo, parallax; tudo que agrade ao desktop e castigue o celular.
- Declarar "sem pay-to-win" com benefício pago de XP.
- Aceitar identidade do cliente; expor porta do BDS; `/ingest` sem assinatura.
- Coletar dados de menores sem necessidade; usar rastreadores de terceiros.
- Imitar o visual de outro servidor ou sugerir afiliação com a Mojang.
- Fórum próprio (duplica o Discord).
- Carrossel "só arrasta"; foco encoberto pela barra fixa.

**Crítica direta às ideias do projeto [!]**
- *"Um dos maiores servidores do Brasil"*: ótima ambição, mas **comunique em marcos** (primeiros 100 membros, primeiro evento), não em promessa de escala.
- *Muitas páginas ao mesmo tempo* (jogadores, rankings, mapa, loja): **exagero** neste estágio; vale começar com Home/Jogar/Regras/Status/Notícias.
- *Dois "donos" de dados* (bot e API) sem decisão clara: **o maior risco técnico** do projeto.

---

## 22. Fontes e o que aprendi de cada uma

| Fonte | O que aprendi |
|---|---|
| [Bedrock Wiki — Script Net](https://wiki.bedrock.dev/scripting/script-net) | `@minecraft/server-net` só roda no BDS; habilitar em `allowed_modules`; métodos HTTP; segredos via `server-admin`. Usei para o desenho de integração "de saída" e para as regras de segurança do addon |
| [Docs do Script API (jaylydev)](https://jaylydev.github.io/scriptapi-docs/latest/modules/_minecraft_server-net.html) | Lista de classes (`HttpClient`, `WebSocket`, `HttpRequestLimitExceededError`, `TLSOnlyError`): há limite de requisições e **TLS obrigatório** |
| [Bedrock Wiki — Server software](https://wiki.bedrock.dev/servers/server-software) | Panorama: BDS, Endstone, LeviLamina, PowerNukkitX, PocketMine, Dragonfly, Allay, Serenity; manutenção variável |
| [mcstatus (docs)](https://mcstatus.readthedocs.io), [mcstatus.io](https://mcstatusio.readthedocs.io/en/latest/usage.html), [minecraft-server-util](https://github.com/MCStatusBot/minecraft-server-util) | Status Bedrock = **Unconnected Ping/Pong sobre UDP 19132**; bibliotecas existentes; navegador não consegue → backend |
| [Geyser Global API](https://geysermc.org/wiki/api/api.geysermc.org/global-api), [mc-api.io](https://mc-api.io/docs) | Gamertag↔XUID só para jogadores no cache do Geyser; skins via mineskin; renders por XUID. Define o limite realista de avatares |
| [Wynncraft](https://wynncraft.com) | Estrutura de home orientada a conteúdo e "como entrar"; nav secundária de ferramentas de jogo |
| [CubeCraft](https://www.cubecraft.net) | Home de fórum, forte em regras/segurança/apelações; leitura de "o que **não** fazer" na home |
| [Astro — Islands](https://docs.astro.build/en/concepts/islands/) | Ilhas e `client:*`, `server:defer`; base da recomendação |
| [Comparativos Astro/Next/SvelteKit 2026](https://www.pkgpulse.com/guides/nextjs-vs-astro-vs-sveltekit-2026), [dev.to](https://dev.to/mr_manushukla/astro-6-vs-nextjs-16-for-content-sites-in-2026-speed-hosting-cost-and-when-to-switch-2icn) | Ordem de grandeza de JS enviado; Astro 6 (mar/2026); aquisição do time Astro pela Cloudflare (relato; **conferir**) |
| [Next.js 16](https://nextjs.org/blog/next-16) | Turbopack estável, Cache Components, React 19.2: Next continua forte para *apps* |
| [Better Auth vs Auth.js vs Clerk](https://itsourcecode.com/web-dev/better-auth-vs-clerk-vs-auth-js-2026-auth-libraries/) | Better Auth: self-hosted, TypeScript, Discord OAuth, dados no seu banco |
| [Drizzle vs Prisma](https://ecosire.com/pt/blog/drizzle-orm-vs-prisma-2026-comparison) | Drizzle: SQL-first, leve, bom em edge; Prisma: DX completa |
| [Limites do free tier Cloudflare](https://eastondev.com/blog/en/posts/dev/20260526-cloudflare-free-limits/), [D1 (changelog)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/), [Supabase vs Neon](https://bytebase.com/blog/neon-vs-supabase) | Limites reais do plano gratuito; D1 com cotas diárias aplicadas desde set/2026 |
| [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2) | Escopos, `state`, expiração e revogação de tokens |
| [Core Web Vitals 2026](https://corewebvitals.io/core-web-vitals) | LCP 2,5 s / INP 200 ms / CLS 0,1 continuam em 2026 |
| [WCAG 2.2 — o que mudou](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) | Tamanho de alvo, arrastar com alternativa, foco não encoberto |
| [Tendências de web design 2026](https://line25.com/articles/web-design-trends-2026/), [studiomeyer](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check) | Bento, dark mode, micro-interações, scroll-driven; 3D e personalização por IA decepcionam |
| [ECA Digital (resumos jurídicos)](https://confidata.com.br/blog/eca-digital-o-que-muda-empresas), [Demarest](https://demarest.com.br/wp-content/uploads/2025/10/ECA-Digital-traz-novas-perspectivas-e-desafios.pdf), [Mattos Filho](https://www.mattosfilho.com.br/unico/eca-digital-sancionada-lei/) | Vigência (17/03/2026), alcance, loot boxes, verificação de idade, sanções. **Texto oficial não verificado** |
| [Regras de monetização (resumos)](https://space-node.net/blog/minecraft-eula-server-monetization-rules-2026), [mineguard](https://mineguard.pro/en/blog/smp-economy-no-pay-to-win-monetization), [PCGamesN](https://pcgamesn.com/minecraft/mojang-clarify-new-server-rules-prevent-minecraft-servers-becoming-pay-win), [artigo oficial Mojang](https://www.minecraft.net/en-us/article/minecraft-eula-and-commercial-usage-guidelines-updates) | O que pode/não pode vender; **o artigo oficial não carregou** nesta pesquisa; ler antes da Fase 6 |
| [Tebex × PagBrasil (Pix)](https://www.pagbrasil.com/lp/cases/tebex/), [Mercado Pago Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix) | Pix disponível via Tebex/PagBrasil e via Mercado Pago |

### Lacunas desta pesquisa (para fechar antes de implementar)
1. Texto **oficial** da Mojang (Commercial Usage Guidelines) e da **Lei 15.211** (ambos não abriram por falha de conexão).
2. Análise visual direta de **The Hive** e **Hypixel** (bloqueio 403).
3. Se o **Script API expõe XUID** e se `WebSocket` funciona no BDS na versão usada.
4. Como **consoles** adicionam servidores personalizados hoje (afeta a página "Jogar").
5. Confirmar a **aquisição do Astro pela Cloudflare** e os limites atuais do plano gratuito antes de fixar custos.
