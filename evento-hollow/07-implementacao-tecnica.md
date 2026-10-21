# 07 · Implementação técnica

Tudo é código do addon (Script API) mais um pedaço no bot. Nada de plugin externo, nada de sistema de missões novo, nenhuma alteração de blocos pelo script.

## Arquitetura

| Peça | Onde | O que faz |
|---|---|---|
| Registros (texto) | `addon/vulpus_bp/scripts/textos/hollow_docs.js` | Os 17 registros, o enigma, mensagens, vento. Só dados. |
| Sistema | `sistemas/hollow.js` | Pontos marcados, leitura, requisitos, enigma, conclusão, relógio, vento, diário, `/vulpus:hollow`. |
| Painel | `sistemas/hollow_staff.js` | Telas da staff e do dono. |
| UI | `textos/hollow.js` | Textos de menu, dicas, mensagens de erro. |
| Dados | `core/db.js` | Campo `hollow` por jogador: `lidos`, `enigma`, `tentativas`, `conclusao`, `relogio`. |
| Mundo | propriedades `vulpus:hollow:*` | Pontos, locais, áudios, conclusões. |
| Ponte | `sistemas/ponte_chat.js` | Leva `hollow_conclusao` ao bot. |
| Bot | `cogs_minecraft/ponte.py`, `database/halloween.py` | Registra a conclusão, dá o cargo, `/halloween dar` e `/halloween vencedores`. |

## Como cada requisito é atendido

- **Registro em bloco:** `playerInteractWithBlock` (antes do evento); se o bloco está marcado, cancela a interação normal e abre o formulário no tick seguinte. Agachado, a staff mexe no bloco normalmente.
- **Texto com coordenadas:** `{coord:casa|acampamento|abrigo|ponte}` são trocados pelos Locais marcados.
- **Enigma:** `ModalForm` com três campos (dia, mês, ano), 3 s de espera entre tentativas, dicas com 3 e 6 erros.
- **Conclusão:** uma única escrita síncrona grava `{nome, posicao, quando}`; a posição é o próximo número da lista. Idempotente.
- **Kitsune:** só `posicao <= 2` e só pelo dono, pelo botão "Dar Kitsune (N dias)" (confirma antes, marca "entregue").
- **Relógio:** `minecraft:clock` com nome e lore, uma vez por jogador.
- **Vento:** a cada 20 ticks confere a distância 3D ao ponto Casa; entrou no raio e passou a espera → mensagem do nível (0 a 2 registros, 3 a 6, 7+), som discreto, uma vez por entrada. Estado só em memória.

## Comandos e menus

- Jogador: `/vulpus:hollow` (diário).
- Staff: **Menu > Staff > Evento Hollow** (ligar/desligar, datas, Locais, Registros, Áudios, Vento).
- Dono: **Painel do Dono > Evento Hollow: vencedores** (Kitsune, resetar progresso, resetar vencedores).

## Configurações (config.js)

`hollowLigado`, `hollowInicio`, `hollowFim`, `hollowKitsuneDias`, `hollowVentoRaio`, `hollowVentoEsperaSeg`, `hollowVentoLigado`. Todas aparecem no painel da staff.

## Instalação e teste

1. Atualizar os packs no servidor (rodar `_zip_servidor.py` e `_deploy_bed.py` em `C:\Users\gille\vt`) e o bot no Railway.
2. No `/setup` do Discord, **Cargos base > Halloween**: escolher o cargo (abaixo do cargo da Kiza, com a permissão Gerenciar Cargos).
3. No jogo, seguir o `06` para marcar Locais e Registros.
4. Testar com o checklist do `09`.

Mock: `C:\Users\gille\vt\mock\teste_hollow.mjs` (`node --import ./registrar.mjs teste_hollow.mjs`) cobre marcar pontos, leitura, requisitos, enigma e dicas, conclusão 1/2/3, Kitsune só nas duas primeiras, relógio, vento, dados corrompidos e permissões.

## Limitações

- Não foi testado no jogo real, só no mock.
- A lista de conclusões guarda cerca de 300 entradas (limite da propriedade do mundo).
- Antes do início, só a staff lê os registros (para testar); depois do fim todos leem mas não concluem.
- O áudio é um link configurado no painel (sem pack de sons).
