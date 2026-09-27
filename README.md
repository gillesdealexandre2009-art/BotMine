# 🦊 Kiza — bot do servidor VULPUS

Bot de comunidade (Python 3.11+, discord.py 2.x, SQLite). **Sem IA de chat e sem nenhuma dependência de LLM**:
a personalidade da Kiza vive só nos textos fixos (`textos.py`). Independente do SONHE (token, banco e config próprios).

**Módulos:** entrada (boas-vindas, adeus, autorole, regras, verificação) · painel de cargos · tickets · moderação e casos ·
automod e modo raid · logs · regras por canal e sugestões · XP e níveis · economia · união de toca · Mines · `/ajuda` `/status` · backup.

## 1. Discord Developer Portal (uma vez)
1. Crie o aplicativo → **Bot** → *Reset Token* (guarde o token, ele vira `DISCORD_TOKEN`).
2. Em **Privileged Gateway Intents**, ative **Server Members Intent** e **Message Content Intent** (sem isso o bot não sobe/não funciona).
3. Convite (troque `SEU_CLIENT_ID`; **não** pede Administrador):
   `https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&scope=bot%20applications.commands&permissions=1426197966038`

## 2. Rodar localmente (opcional)
```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                   # preencha DISCORD_TOKEN (e DEV_GUILD_ID p/ comandos instantâneos)
python main.py
pytest -q                                              # testes do banco e das funções puras
```

## 3. Deploy no Railway
1. Suba este projeto para um repositório (o `.gitignore` já protege `.env` e `*.db`) e crie um projeto no Railway a partir dele.
2. **Volume:** no serviço, *Add Volume* e monte em **`/data`**.
3. **Variáveis:** `DISCORD_TOKEN=<token>` e `DATABASE_PATH=/data/kiza.db`.
4. O comando de início é `python main.py` (já em `railway.json`). Se a Railway escolher uma versão antiga do Python, defina `NIXPACKS_PYTHON_VERSION=3.12`.
5. Backups diários vão para `/data/backups` (retenção 7). Estão no mesmo volume: de vez em quando baixe uma cópia (`/backup` cria uma na hora).

## 4. Primeiros passos no servidor
1. **Suba o cargo da Kiza** na lista de cargos, acima de Visitante, Membro, cores e demais cargos que ela precisa dar/tirar.
2. Rode **`/setup`** (só admin/dono) e configure, nesta ordem: 🛡️ *Níveis de permissão* (mapeie Helper, Helper | Header, Staff, Staff | Header, Admin…) → 🎭 *Cargos base* (Visitante, Membro, Kitsune) → 📺 *Canais* → 🎨 *Painel de cargos* → ⭐ *Cargos de XP* (opcional).
3. Em **📤 Publicar painéis**, publique regras, verificação, painel de cargos, tickets e o aviso fixo. Republicar **edita** a mensagem anterior (não duplica).
4. Em **🔒 Visibilidade**, escolha um nível (Público/Membro/Helper/Staff/Admin) e a categoria ou canal, depois clique em **Aplicar permissões** — a Kiza ajusta `Ver Canal`/`Enviar Mensagens` de verdade, sem apagar overwrites de outras pessoas/bots que já existam nesse canal.
5. Rode **`/configuracao`**: mostra o que falta, permissões que faltam à Kiza e cargos acima do dela. Ajuste números com **`/ajustes`**.

### Servidor já com tudo criado (como o VULPUS)?
Se os canais e cargos já existem, preencher o `/setup` cargo a cargo é tedioso. Em vez disso:
1. Copie `seed_vulpus.json`, troque os IDs pelos do seu servidor (mesmo formato).
2. Rode `python seed_apply.py seu_arquivo.json` **antes de** rodar o bot pela primeira vez (ou com o bot parado) — isso só grava configuração no banco, não toca no Discord.
3. Suba o bot, rode `/configuracao` para conferir hierarquia de cargos, e `/setup` → **Visibilidade** → **Aplicar permissões** para as permissões valerem de verdade.

## 5. Comandos por nível
| Nível | Comandos |
|---|---|
| Todos | `/ajuda` `/status` |
| Membro | `/perfil` `/rank` `/ranking` `/daily` `/saldo` `/pagar` `/mines jogar` `/casamento …` + painel de cargos e tickets |
| 1 Helper | `/warn` `/avisos` `/caso` |
| 2 Staff | `/timeout` `/remover-timeout` `/kick` `/limpar` `/remover-aviso`, atender tickets, ver logs |
| 3 Admin | `/ban` `/unban` `/setup` `/configuracao` `/ajustes` `/raid` `/canal-regra` `/economia-admin` `/backup` |

## 6. Padrões que eu decidi (ajuste quando quiser)
Tudo numérico abaixo muda em **`/ajustes`**; textos em **`textos.py`**; moeda e cores em **`config.py`**.

**Permissões**
- (PADRÃO) Helper: `/warn`, `/avisos`, `/caso`. Staff: timeout, kick, limpar, remover aviso, tickets, logs. Admin: ban/unban, `/setup`, `/configuracao`, `/ajustes`, `/raid`, `/canal-regra`, economia administrativa, `/backup`.
- (PADRÃO) O **dono** e quem tem **Administrador** do Discord contam como Admin (evita ficar trancado antes de mapear cargos). Cargos "Header" contam como o cargo-base (você os mapeia no mesmo nível).
- (PADRÃO) Ninguém age sobre quem tem nível igual ou maior (exceto o dono). Tickets: só Staff ou acima atendem.
- (PADRÃO) XP, economia, Mines, união, painel de cargos e tickets só para **Membros** verificados; com o cargo Membro não configurado, essas funções ficam desligadas com mensagem clara.

**Entrada e cargos**
- (PADRÃO) Boas-vindas pingam o novo membro; verificação por botão troca Visitante → Membro. Sem escolha de idade/gênero na entrada.
- (PADRÃO) Painel de cargos com 4 grupos (cores, gênero, DM, faixa etária), um cargo ativo por grupo, até 24 cargos por grupo. `+18/-18` são só identificação.
- (PADRÃO) Regras do servidor: 8 regras-modelo em `textos.py` (edite à vontade).

**Economia e jogos**
- (PADRÃO) Moeda **Caudas 🦊** (uma constante em `config.py`). Kitsune: **+25% XP** e **+10% no daily**; nenhum comando extra.
- (PADRÃO) XP 15–25 por mensagem a cada 60 s (5n²+50n+100 para subir do nível n); mensagens curtas ou repetidas não rendem. Degraus de cargo de XP configuráveis nos níveis 5/10/20/35/50.
- (PADRÃO) Daily 100 + 10 por dia de sequência (até 7 dias). `/pagar` até 5000 por vez. Cooldowns nos comandos de economia.
- (PADRÃO) **Mines** só por diversão: aposta 10–500, cooldown 30 s, 1–8 minas (padrão 3), margem da casa 3%, se o tempo (5 min) acabar **resgata sozinho**, apostas interrompidas por reinício são **devolvidas**.
- (PADRÃO) **Casamento** vira "**dupla de toca**" (título de brincadeira, sem nenhum tom romântico, por causa dos menores). Custo 2000, um pedido por pessoa, expira em 24 h, tudo que não vira dupla **devolve** o valor, divórcio é grátis.
- Toda mudança de saldo passa por débito atômico e grava o livro-razão imutável (`transacoes`).

**Moderação e automod**
- (PADRÃO) 3 avisos ativos → timeout de 30 min (e a cada múltiplo de 3). Cada ação vira um caso numerado no canal de logs de moderação; DM ao punido quando possível.
- (PADRÃO) Automod: antispam (mais de 6 mensagens em 8 s, ou 4 iguais), convites bloqueados, links liberados, mais de 5 menções; 3 infrações em 2 min → timeout de 5 min e limpeza das últimas mensagens. Ignora Staff+. Tudo com log.
- (PADRÃO) Modo raid ligado = novos membros são **expulsos** (com DM explicando) e registrados no log.

**Tickets e logs**
- (PADRÃO) Categorias: Dúvida, Denúncia, Parceria, Outro; 1 aberto por pessoa por categoria; a staff é mencionada ao abrir; lembrete se ninguém assumir em 60 min.
- (PADRÃO) Transcrição vai para o canal de **logs de moderação**. Sem canal de logs, a Kiza **avisa antes de fechar**; se não conseguir salvar a transcrição, **não apaga** o ticket.
- (PADRÃO) Logs gerais: entradas/saídas, mensagens editadas/apagadas (só as que a Kiza viu), cargos e apelidos.

**Visibilidade e permissões**
- (PADRÃO) 5 níveis (Público, Membro, Helper, Staff, Admin). Público = todo mundo enxerga, mas só Staff/Admin postam (padrão de "anúncio"); os demais negam `Ver Canal` para quem não atinge o nível. A Kiza nunca sobrescreve o overwrite inteiro do canal — só mexe no dela e nos cargos que você escolheu, deixando o resto (outros bots, pessoas específicas) intacto.

**Canais e infraestrutura**
- (PADRÃO) `so_anexos` aceita anexo, figurinha ou link; regras de canal não valem dentro de threads; sugestões recebem ✅/❌ e uma thread. Pérolas/caos/lore só têm reação automática opcional (`/canal-regra`).
- (PADRÃO) Sem comandos de prefixo (só slash e menção). Comandos sincronizados globalmente na inicialização (use `DEV_GUILD_ID` para testar).
- (PADRÃO) `allowed_mentions` global: `@everyone` e cargos **desligados**; só menções a usuários.
- (PADRÃO) Backup diário com retenção de 7; não cria outro se já existe um com menos de 20 h.

## 7. Minecraft (depois)
Nada foi implementado (`ENABLE_MINECRAFT=false`). Veja `cogs_minecraft/README.md` para onde plugar.

## 8. Problemas comuns
- **Comandos não aparecem:** confira o convite (`applications.commands`); globais podem demorar; use `DEV_GUILD_ID` para testar.
- **"Falha ao carregar o cog":** veja o log; o resto do bot continua de pé.
- **Kiza não dá cargos:** `/configuracao` mostra quais estão acima do cargo dela.
- **Bot não conecta / erro de intents:** ative as duas intents privilegiadas (seção 1).
