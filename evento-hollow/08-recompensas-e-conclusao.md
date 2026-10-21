# 08 · Recompensas e conclusão

## O que é "concluir"

Verificável pelo jogo, sem depender de palavra de ninguém. O jogador conclui quando, dentro da janela do evento (25/10 00:00 a 31/10 23:59:59, horário de Brasília):

1. **resolveu a cronologia** (a Mesa, D13) e
2. **leu todos os registros chave:** D03, D06, D07, D10, D11, D12, D13, D14, D16 e **D17** (o último registro).

Ler o D17 sem ter os outros não conclui; o diário diz só o **local** que falta.

## Quem ganha o quê

| Recompensa | Quem | Como |
|---|---|---|
| **Selo Kitsune** | **Só as duas primeiras conclusões** (posição 1 e 2) | O jogo registra a ordem; o **dono** aperta "Dar Kitsune (N dias)" no Painel do Dono > Evento Hollow: vencedores. N padrão = 30 dias, editável. O botão confirma antes e marca "entregue". Posição 3+ nunca recebe. |
| **Tag `Halloween 2026`** no Minecraft | Todos que concluírem | Automático |
| **Cargo exclusivo de Halloween** no Discord | Todos que concluírem | Automático para quem tem a conta vinculada (`/minecraft vincular`); para os outros, `/halloween dar @membro` |
| **Conquista "O Último Outono"** | Todos que concluírem | Automática |
| **Relógio de Hollow** (símbolo, sem efeito) | Todos que concluírem | Botão no diário, uma vez |
| Mensagem final (com apoio CVV 188) | Todos que concluírem | Automática |

O **Relógio de Hollow** é um relógio comum com nome e lore (`§7Relógio de Hollow` / `Parado às 21h47. Ele só marca o que ficou.`). Sem vantagem de combate, XP, sorte ou Caudas.

## Como a ordem é registrada (sem disputa)

- Ao concluir, o jogo grava **uma única vez por jogador** `{nome, posição, horário}` numa lista do mundo (`vulpus:hollow:conclusoes`). A posição é o próximo número da lista, escrito de forma síncrona: **não há dois jogadores com a mesma posição**.
- O horário (Brasília) fica no painel do dono, e o bot registra a mesma conclusão no Discord (`/halloween vencedores`) com horário, para conferir.
- Concluir de novo não muda nada (idempotente). O mesmo jogador não pode ser 1º e 2º.
- Se alguém questionar: a lista do jogo e a do bot são a prova.
- **Contas diferentes da mesma pessoa:** a lista mostra o nome; a staff pode recusar o selo de uma conta secundária (o botão é manual).

## Casos de borda

| Caso | Resposta |
|---|---|
| Dois jogadores terminam no mesmo segundo | O servidor processa um de cada vez: um é 1º e o outro 2º. Ambos ganham Kitsune. |
| Terceiro colocado reclama | Recebe tag, cargo, conquista e relógio. Kitsune não. |
| Jogador sem conta vinculada | Ganha tag/conquista/relógio; o cargo é dado por `/halloween dar`. |
| Jogador sem o cargo configurado no `/setup` | O bot registra a conclusão e avisa em log; o cargo é dado depois. |
| Concluiu depois de 31/10 | Não conta. |
| Bug de registro | A staff pode "Resetar progresso" de um jogador (dono) e pedir que refaça os registros que faltam. Os posicionados **não** são apagados por esse botão. |

## Nada de automação não testada

A entrega do Kitsune é **manual de propósito** (um botão do dono). O resto é automático e coberto por teste no mock (ver `09`).
