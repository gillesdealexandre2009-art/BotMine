# cogs_minecraft — ponte Discord ↔ Minecraft

- `ponte.py`: o cog. Sobe um servidor HTTP (aiohttp) dentro do bot, que o servidor de Minecraft consulta, e traz os comandos
  `/minecraft vincular`, `conta`, `desvincular` (staff) e `painel` (admin), além do painel de login com botões.
- `embeds.py`: funções puras que viram evento do jogo em embed (e montam os painéis do ip-e-porta e do login). Sem Discord conectado
  dá para testar tudo.

## O que a ponte faz
- **Chat** (`mc_chat`, 💬・chat-bridge): mensagens, entradas, saídas, mortes, sequências de abates, níveis e conquistas do jogo
  (minigames ficam de fora); o que se escreve nesse canal aparece no jogo.
- **Histórico** (`mc_historico`, 📖・histórico): clãs que nascem e se despedem; guerras que começam e como terminam.
- **IP e porta** (`mc_ip`, 🚪・ip-e-porta): painel com os dois endereços, o passo a passo e o status (quem está jogando). O servidor
  manda o status a cada minuto; sem notícias por `MC_STATUS_VALIDADE` segundos o painel mostra "fora do ar".
- **Login** (`mc_login`, ✅・log-in): painel com botões (Vincular conta, Minha conta, Como funciona) e o registro de logins,
  logouts, vínculos, desvínculos e códigos recusados.
- **Vínculo**: quem não tem a conta ligada fica com a tela preta no jogo e vê um código de 6 letras (vale 15 min);
  `/minecraft vincular` ou o botão liga a conta. Uma conta do jogo por pessoa e uma pessoa por conta. O vínculo é reconhecido
  pelo id do jogador e, se o id mudar (mundo copiado, servidor novo), pelo nome: ele não se perde.
- **Caudas e XP unificados**: o saldo e o XP do Discord (`perfis`) são a verdade. O jogo manda a *diferença* desde a última
  sincronização, com uma chave única (reenviar não soma duas vezes), e recebe o total de volta. A primeira sincronização manda
  tudo o que o jogador tinha: é a fusão (soma dos dois lados).

Os canais vêm do `/setup` (`canal_<chave>`) ou, sem isso, de `config.MC_CANAIS_PADRAO`. Os endereços ficam em `config.MC_SERVIDORES`.

## Rotas (todas com `Authorization: Bearer <MC_BRIDGE_TOKEN>`)
| rota | para quê |
|---|---|
| `POST /mc/vinculo` `{id, nome}` | diz se a conta está ligada ou devolve o código |
| `POST /mc/sync` `{id, nome, chave, caudas, xp}` | soma a diferença e devolve `{saldo, xp}` |
| `POST /mc/eventos` `{eventos: [...]}` | posta nos canais (tipos em `embeds.TIPOS_EVENTO`, campos em `ponte.validar_evento`) |
| `POST /mc/status` `{online: [...]}` | atualiza o painel do ip-e-porta |
| `GET /mc/chat?desde=N` | mensagens do chat-bridge depois de N (`-1` = só o marcador) |
| `GET /mc/saude` | `{ok: true}` |

## Configuração (variáveis de ambiente do Railway)
| variável | para quê |
|---|---|
| `MC_BRIDGE_TOKEN` | segredo que o servidor manda em `Authorization: Bearer ...`. **Sem ele a ponte não sobe.** |
| `PORT` | porta HTTP (o Railway define sozinho). Gere um domínio público para o serviço. |
| `MC_GUILD_ID` | só se o bot estiver em mais de um servidor |
| `MC_MAX_JOGADORES` | vagas mostradas no painel (padrão 8) |

O token e o endereço também ficam no servidor do jogo (arquivos de segredo da pasta `config/`); nunca no repositório.

## Dados e permanência
Tudo está no SQLite do bot (migração 7): `mc_vinculos`, `mc_codigos`, `mc_sync`, `mc_chat`, `mc_historico`. Nada é apagado numa
atualização; desvincular só tira a ligação (o saldo e o XP ficam) e deixa um registro em `mc_historico`.
`transacoes` continua sendo o livro-razão: cada soma vinda do jogo tem `tipo = 'minecraft'` e a chave do envio em `ref`.

## Lições do bot do SONHE (para não repetir)
- Rank/ações críticas não devem ir numa fila em memória "consumida ao ler": use confirmação (ack) e persista no banco.
- Entregar item/dinheiro em dois lugares exige "claim primeiro, entrega depois" com trava compartilhada, senão duplica.
- Serializar itens perde dados (poções, bundles, banners...): use allowlist de itens.
