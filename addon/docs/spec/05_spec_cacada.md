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
| `vulpus:cacada:log` | `[{ t, k: colocou\|coletou\|expirou\|removeu\|negou, a, v, n, m? }]` (100, até 20.000 caracteres; `m` = motivo de "negou": `cla`, `aliado`, `pagador`, `recente`, `recarga`) |

Leitura: as cabeças são carregadas uma vez num `Map` (fonte da verdade: o mundo). Dado corrompido não quebra: JSON ilegível fica de fora; pagador sem id, a própria vítima, valor ≤ 0, fora do teto ou não numérico sai; pagador repetido soma; cabeça sem pagador válido some; meta/rank/log de tipo errado viram vazios. Teto de 300 cabeças e 100.000.000 por cabeça.

## 3. Regras

- **Pôr** (`colocarRecompensa`): Caçada aberta; não na própria cabeça; valor inteiro em `cacadaMinimo..cacadaMaximo` (50..100.000); alvo online ou já registrado (`primeira > 0`); parte em no máx. `cacadaLimite` (5) cabeças (somar na mesma não conta de novo); saldo ≥ valor + taxa (`ceil(valor × cacadaTaxaPct / 100)`, 10%). Grava a cabeça e **só então** tira do saldo. Passou de `cacadaAnuncio` (500) pela primeira vez: anúncio global (uma vez; volta a valer se expirar abaixo).
- **Fluxo** (formulário velho e clique duplo): todo menu ou comando de pôr abre um fluxo numerado por pessoa (`novoFluxo`); a confirmação só vale se ainda for o fluxo mais novo, e uma vez só. A confirmação também leva o custo mostrado: se a taxa mudou, recusa. Tudo é conferido de novo no clique, sem `await` entre conferir, gravar e cobrar.
- **Quem matou** (`matadorDe`): o jogador por trás de `damagingEntity` ou de `damagingProjectile` (`jogadorPor`: o próprio Player, o `tamedToPlayer`/`tamedToPlayerId` de bicho domesticado com `isTamed`, ou o `owner` do componente `minecraft:projectile`). Sem jogador ali, vale o **crédito do último golpe**: `afterEvents.entityHurt` (só jogadores) guarda o último jogador que feriu cada jogador (`golpes`, só na memória; limpo na morte e na saída); se ele foi há até `CREDITO_MS` (10 s) e o golpe final não veio de um bicho (sem `damagingEntity`, ou um de `SEM_DONO`: TNT, carrinho de TNT, cristal do End, raio, bloco caindo, nuvem de poção, fogos), ele leva o abate (Aspecto Flamejante, empurrar da beira, lava, TNT depois do golpe). Ferir a si mesmo não vale crédito. Precisa estar online.
- **Coletar** (`entityDie`): toda morte de jogador grava a hora (vale para a vida mínima: **toda** morte zera a conta, até a que não pagou). Não paga (`porQueNaoPaga` → `{ motivo, ms }`): mesmo clã (`cla`), clã aliado (`aliado`; `aliados` de qualquer um dos dois lados, via `claDe`), pagador daquela cabeça (`pagador`), vítima com menos de `cacadaVidaMin` (5 min) de vida (`recente`), o mesmo matador com a mesma vítima há menos de `cacadaRecargaHoras` (24 h) (`recarga`); sem matador e a própria vítima também não pagam. Paga: apaga a cabeça (no mundo e na memória) e depois dá o total ao matador; registra a coleta, o ranking e o log; anúncio global com som, título e partículas. Não lê nem escreve guerra ou CTF.
- **Quando não paga** (cabeça com recompensa): quem matou recebe o motivo no chat (`NAO_PAGOU`; em `recente` diz há quanto tempo a vítima renasceu e que volta a valer em `cacadaVidaMin` a partir de agora, porque esta morte zera a conta) e na actionbar (`BARRA_NAO_PAGOU`); a vítima recebe `VITIMA_CONTINUA` ("Sua cabeça continua valendo X: <motivo>. Nos próximos N min ela não paga.") **quando renasce** (`playerSpawn`; na tela de morte o chat passa despercebido), também nas mortes sem matador (`pve`) ou por ela mesma (`propria`); e o log da staff ganha `negou` (só com matador; a mesma recusa, mesmo matador e vítima, dentro de 1 min vira uma linha).
- **Id novo da mesma conta** (`trazerCabecaAntiga`, no primeiro spawn): se a pessoa não tem cabeça no id dela e existe uma cabeça com o mesmo nome num id que não está online e cujo registro (`vulpus:j:`) tem esse mesmo nome, a cabeça passa para o id novo (parte que ela mesma tinha posto volta para ela). `acharPessoa` com dois registros do mesmo nome escolhe o de `ultimaVez` mais recente.
- **Expirar** (a cada 600 ticks): cada parte com `agora - t ≥ cacadaDuracaoDias` (7) volta a quem pagou **sem a taxa** (`adicionarCaudas` pelo id: funciona offline). Grava a cabeça sem essas partes antes de devolver.
- **Staff tirar** (`removerRecompensa`, menu ou `/vulpus:tirarrecompensa`): confere `ehStaff`, apaga a cabeça e devolve cada parte sem a taxa; tirar de novo responde "já saiu do mural".

## 4. Visual e menus

- **Caudas > Caçada > Mural de recompensas (n)** ou `/vulpus:cacada`: sua cabeça, recompensas ativas, Pôr recompensa (só aberta), Ranking de caçadores, Últimas caçadas (10), Como funciona e as cabeças (até 30, da mais valiosa; online, valor e quando a parte mais antiga volta). Ficha da cabeça: valor, número de pagadores (nomes em segredo), desde quando, a sua parte e "Pôr mais Caudas".
- **nameTag:** linha `CAVEIRA §c1,2k` em cima das 2 de sempre. **Sidebar:** `CAVEIRA Sua cabeça vale 1.234`.
- **Comandos:** `/vulpus:cacada`, `/vulpus:recompensa <jogador: texto> <valor: inteiro>` (texto para aceitar offline), `/vulpus:tirarrecompensa <jogador: texto>` (staff). Total de comandos: 38.

## 5. Testes

`C:/Users/gille/vt/mock/teste_cacada.mjs` (173 checagens; as 31 novas reproduzem o caso do dono: recompensa por nome com a vítima offline que volta, morte de queda e logo depois um matador sem clã, o motivo para quem matou (chat com o tempo certo e actionbar), o aviso para a vítima ao renascer, o log da staff sem repetir, a coleta 5 min depois; tridente sem `damagingEntity`, lobo domesticado e selvagem, fogo 3 s depois do golpe, queda 11 s depois, zumbi no golpe final, TNT, ferir a si mesmo, e a conta que volta com outro id): dados corrompidos, pôr/somar, taxa (inclusive o arredondamento), recusas (própria, faixa, sem registro, saldo, limite de 5), mesmo clã, aliado, pagador, monstro, queda, a própria vítima, vida mínima, coleta por quem é de fora, 24 h, projétil, clique duplo, formulário velho, taxa mudada, vítima saindo, saldo gasto antes de confirmar, offline, expiração total e parcial com reembolso, staff (comando, menu, log, permissão), nameTag, sidebar, mural, ficha, ranking, histórico, seção no menu de Caudas, configurações e Caçada fechada, guerra intocada. Os testes antigos `teste.mjs`, `teste_clas.mjs`, `teste_dono.mjs` e `teste_fumaca.mjs` passaram a esperar 38 comandos (cópias em `*.mjs.antes_cacada`).
