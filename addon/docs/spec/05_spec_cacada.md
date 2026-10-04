# Addon Vulpus: Caçada (recompensa por cabeças)

Estende as specs 01 a 04, que continuam valendo. Versão: continua **0.2.0**. Explicação para o dono no `README.md` ("Caçada").

## 1. Arquivos

| Arquivo | Conteúdo |
|---|---|
| `scripts/sistemas/cacada.js` | dados, regras (pôr, coletar, expirar, staff tirar), menus, eventos e os 3 comandos |
| `scripts/textos/cacada.js` | textos e `curto(n)` ("1,2k") |
| `config.js` | 9 chaves `cacada*` em `PADROES`, `ICONES.cacada/mural/cabeca`, `SONS.cacada/cacou` |
| `glyphs.js`, `tools/gerar_glyphs.py` | `\uE236` CAVEIRA (folha E2, linha 3, coluna 6; 9x9 com o contorno, linhas 11..19 da célula, coluna 0) |

Mudanças mínimas em sistemas existentes (ganchos para não criar import circular):
- `caudas.js`: `adicionarSecaoCaudas({ titulo, botoes })`; o menu de Caudas desenha as seções registradas (cabeçalho + botões) antes do Voltar. Sem seção, o menu fica igual.
- `identidade.js`: `registrarMarcaNome(fn)`; as linhas devolvidas (não vazias) vão em cima do nameTag. Sem marca, o nameTag continua com 2 linhas.
- `hud.js` / `textos/hud.js`: campo `cabeca` e a linha "Sua cabeça vale X" logo depois das Caudas (até 13 linhas; o label do RP cabe 16).
- `staff.js` / `textos/staff.js`: botão "Caçada (staff)", grupo de configuração "Caçada" (6 grupos), faixas e a recusa de menor > maior.
- `textos/regras.js`: os 3 comandos em Regras > Comandos. `main.js`: importa `cacada.js` depois de `clas.js`.

Imports: `cacada → caudas, cla_dados, identidade, core/*`; `hud → cacada`; `staff → cacada`. `caudas` e `identidade` não importam `cacada`.

## 2. Dados (propriedades do mundo)

| Chave | Conteúdo |
|---|---|
| `vulpus:cacada:c:<id da vítima>` | `{ v: 1, id, nome, criada, pagadores: [{ id, nome, v, t }], anunciada }` (até 20 pagadores; `t` = última vez que aquela pessoa pôs) |
| `vulpus:cacada` | `{ mortes: { id: ms }, coletas: { "matador\|vítima": ms } }` (podado: mortes de até 3 h, no máx. 150; coletas dentro da espera, no máx. 300) |
| `vulpus:cacada:rank` | `{ id: { nome, total, n } }` (top 50 por total) |
| `vulpus:cacada:log` | `[{ t, k: colocou\|coletou\|expirou\|removeu, a, v, n }]` (100, até 20.000 caracteres) |

Leitura: as cabeças são carregadas uma vez num `Map` (fonte da verdade: o mundo). Dado corrompido não quebra: JSON ilegível fica de fora; pagador sem id, a própria vítima, valor ≤ 0, fora do teto ou não numérico sai; pagador repetido soma; cabeça sem pagador válido some; meta/rank/log de tipo errado viram vazios. Teto de 300 cabeças e 100.000.000 por cabeça.

## 3. Regras

- **Pôr** (`colocarRecompensa`): Caçada aberta; não na própria cabeça; valor inteiro em `cacadaMinimo..cacadaMaximo` (50..100.000); alvo online ou já registrado (`primeira > 0`); parte em no máx. `cacadaLimite` (5) cabeças (somar na mesma não conta de novo); saldo ≥ valor + taxa (`ceil(valor × cacadaTaxaPct / 100)`, 10%). Grava a cabeça e **só então** tira do saldo. Passou de `cacadaAnuncio` (500) pela primeira vez: anúncio global (uma vez; volta a valer se expirar abaixo).
- **Fluxo** (formulário velho e clique duplo): todo menu ou comando de pôr abre um fluxo numerado por pessoa (`novoFluxo`); a confirmação só vale se ainda for o fluxo mais novo, e uma vez só. A confirmação também leva o custo mostrado: se a taxa mudou, recusa. Tudo é conferido de novo no clique, sem `await` entre conferir, gravar e cobrar.
- **Coletar** (`entityDie`): matador = `damagingEntity` Player ou o `owner` do `damagingProjectile`. Toda morte de jogador grava a hora (vale para a vida mínima). Não paga: sem matador (monstro, ambiente), a própria vítima, mesmo clã, clã aliado (`aliados` de qualquer um dos dois lados, via `claDe`), pagador daquela cabeça, vítima morta há menos de `cacadaVidaMin` (5 min), o mesmo matador com a mesma vítima há menos de `cacadaRecargaHoras` (24 h). Paga: apaga a cabeça (no mundo e na memória) e depois dá o total ao matador; registra a coleta, o ranking e o log; anúncio global com som, título e partículas. Não lê nem escreve guerra ou CTF.
- **Expirar** (a cada 600 ticks): cada parte com `agora - t ≥ cacadaDuracaoDias` (7) volta a quem pagou **sem a taxa** (`adicionarCaudas` pelo id: funciona offline). Grava a cabeça sem essas partes antes de devolver.
- **Staff tirar** (`removerRecompensa`, menu ou `/vulpus:tirarrecompensa`): confere `ehStaff`, apaga a cabeça e devolve cada parte sem a taxa; tirar de novo responde "já saiu do mural".

## 4. Visual e menus

- **Caudas > Caçada > Mural de recompensas (n)** ou `/vulpus:cacada`: sua cabeça, recompensas ativas, Pôr recompensa (só aberta), Ranking de caçadores, Últimas caçadas (10), Como funciona e as cabeças (até 30, da mais valiosa; online, valor e quando a parte mais antiga volta). Ficha da cabeça: valor, número de pagadores (nomes em segredo), desde quando, a sua parte e "Pôr mais Caudas".
- **nameTag:** linha `CAVEIRA §c1,2k` em cima das 2 de sempre. **Sidebar:** `CAVEIRA Sua cabeça vale 1.234`.
- **Comandos:** `/vulpus:cacada`, `/vulpus:recompensa <jogador: texto> <valor: inteiro>` (texto para aceitar offline), `/vulpus:tirarrecompensa <jogador: texto>` (staff). Total de comandos: 38.

## 5. Testes

`C:/Users/gille/vt/mock/teste_cacada.mjs` (142 checagens): dados corrompidos, pôr/somar, taxa (inclusive o arredondamento), recusas (própria, faixa, sem registro, saldo, limite de 5), mesmo clã, aliado, pagador, monstro, queda, a própria vítima, vida mínima, coleta por quem é de fora, 24 h, projétil, clique duplo, formulário velho, taxa mudada, vítima saindo, saldo gasto antes de confirmar, offline, expiração total e parcial com reembolso, staff (comando, menu, log, permissão), nameTag, sidebar, mural, ficha, ranking, histórico, seção no menu de Caudas, configurações e Caçada fechada, guerra intocada. Os testes antigos `teste.mjs`, `teste_clas.mjs`, `teste_dono.mjs` e `teste_fumaca.mjs` passaram a esperar 38 comandos (cópias em `*.mjs.antes_cacada`).
