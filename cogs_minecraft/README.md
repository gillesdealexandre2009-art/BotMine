# cogs_minecraft — reservado

Nada de Minecraft foi implementado nesta entrega (de propósito). Esta pasta marca **onde plugar** a ponte
Discord ↔ Minecraft quando o servidor do jogo existir.

## O que já está pronto para isso
- Flag `ENABLE_MINECRAFT` (padrão `false`). Com `true`, o `main.py` tenta carregar este pacote (hoje só loga um aviso).
- `perfis.minecraft_uuid` (coluna nula) para ligar um perfil do Discord a um jogador.
- `transacoes`: livro-razão imutável. Qualquer compra/venda vinda do jogo deve passar por
  `Banco.debitar / creditar / transferir` (débito atômico) — **nunca** mexa no saldo por SQL direto.
- `jogos_pendentes` mostra o padrão "aposta em custódia": para itens em escrow, use a mesma ideia
  (marcar como pendente na mesma transação do débito e ser idempotente ao finalizar).

## Onde plugar
1. Crie um cog aqui (ex.: `cogs_minecraft/bridge.py` com `async def setup(bot)`), e carregue-o em `__init__.py`
   com `await bot.load_extension("cogs_minecraft.bridge")`.
2. Métodos novos de banco vão em `database/` (único pacote que acessa o SQLite; escolha o mixin do assunto) + uma migração nova em `migrations.py`.
3. Autenticação HTTP: compare segredos com `hmac.compare_digest`; nunca coloque segredos em código versionado.

## Lições do bot do SONHE (para não repetir)
- Rank/ações críticas não devem ir numa fila em memória "consumida ao ler": use confirmação (ack) e persista no banco.
- Entregar item/dinheiro em dois lugares exige "claim primeiro, entrega depois" com trava compartilhada, senão duplica.
- Serializar itens perde dados (poções, bundles, banners...): use allowlist de itens.
