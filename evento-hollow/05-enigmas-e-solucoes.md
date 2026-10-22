# 05 · Enigmas e soluções

O evento tem **dois** enigmas: o **cofre do Abrigo** (código de 4 números) e a **cronologia** (a data, na Mesa de Hollow). O resto da progressão é exploração e leitura.

## Enigma 1: o cofre do Abrigo (código de 4 números)

1. **O que o jogador encontra:** uma caixa trancada (cofre) no Abrigo, que guarda os papéis D10 (jornal), D11 (ingresso) e D12 (registro de ocorrência). Interagir com ela abre um formulário de código de 4 números. Sem o código, D10, D11 e D12 mostram "Está dentro de uma caixa trancada. Procure o cofre do abrigo e o código."
2. **O que precisa descobrir:** o código. Cada dígito está num **papelzinho** (P1 a P4, "primeira parte" a "quarta parte"), escondido em lugares onde "só o Hollow procuraria".
3. **Cadeia de pistas:**
   - **D09 (Acampamento):** "Os papéis estão trancados numa caixa de quatro números. Deixei cada número num papelzinho, em lugares onde só eu procuraria."
   - **Botão Dica** do diário (depois de ler D09 e antes de abrir): "Os papéis do abrigo estão trancados. Procure papelzinhos escondidos e um cofre."
   - **P1 a P4:** cada um mostra uma "parte" do código na ordem (primeira, segunda, terceira, quarta).
4. **Solução padrão:** `2147` (trocável pela staff; o D12 menciona 21h47, que o jogador percebe depois).
5. **Sem ficar preso:** sem punição; espera de 3 s entre tentativas; **3 erros:** "Cada papelzinho que você encontrar tem uma parte do código: primeira, segunda, terceira e quarta."; **6 erros:** "O código tem 4 números, um por papelzinho. Procure em lugares onde ninguém olharia." As dicas nunca dão o código.
6. **Implementação:** vários blocos podem ser marcados como cofre (todos abrem o mesmo formulário); o código é uma configuração (`hollowCofreCodigo`) e os papelzinhos usam `{digito1}` a `{digito4}`. Abrir o cofre é por jogador (`cofre` no progresso).
7. **Como testar se é justo:** um testador que achou os 4 papelzinhos deve abrir o cofre na primeira tentativa; um que achou só 2 deve receber as dicas sem desistir.

## Enigma 2: "Em que dia a gente se perdeu?" (Mesa de Hollow, D13)

1. **O que o jogador encontra:** a Mesa de Hollow no fundo do Abrigo, com uma folha e uma pergunta. Ao abrir o registro, o jogo mostra um formulário com três campos: **dia, mês, ano**.
2. **O que precisa descobrir:** a data em que a família "se perdeu" (a da noite da Festa da Colheita).
3. **Pistas que permitem resolver (todas encontráveis antes):**
   - **D11 Ingresso:** "31 OUT" (dia e mês).
   - **D07 Carta da Marta:** "No dia 31, depois do almoço, a gente sai todo mundo junto" (confirma dia; carta de 12/10/2019).
   - **D10 Jornal:** "1º de novembro de 2019" e "durante o temporal de **ontem**" (ano e que foi na véspera).
   - **D06 Cartaz:** "noite de 31 de outubro de 20▒▒" (dia e mês de novo, ano apagado).
   - **Contra-pistas (o erro que o jogador deve perceber):** Hollow diz em D03 que a festa era **dia 22** e em D05/D08 conta "nove dias". Esses não batem com os documentos de outras pessoas.
4. **Solução correta:** **31 / 10 / 2019**.
5. **Próxima localização:** ao acertar, aparece o mapa novo com `{coord:ponte}` (a Ponte).
6. **Implementação:** formulário de 3 campos numéricos validados (`ModalForm`), ver `07`. Sem item nem mecanismo físico.
7. **Como impedir que o jogador fique preso:**
   - Sem punição por erro (no máximo espera de 3 s).
   - **3 erros:** dica 1 ("procure o que veio de outras pessoas: um jornal, um ingresso, uma carta").
   - **6 erros:** dica 2 ("o dia e o mês estão no ingresso e na carta; o ano está no jornal").
   - O botão **Dica** do diário (`/vulpus:hollow`) sempre diz onde está o próximo registro importante.
   - Se tudo falhar, a staff pode ver o progresso do jogador e ajudar (ver `08`), mas **nunca** dá a resposta pronta.
8. **Como testar se é justo:** dar a um testador que nunca ouviu falar do evento os registros D06, D07, D10, D11 e a Mesa. Ele deve acertar em até 3 tentativas **sem** ajuda externa. Se errar mais de 3 vezes, ajustar o texto das pistas (não a regra).

## Estrutura de progressão

| Etapa | O que o jogador faz | O que destrava |
|---|---|---|
| Casa | Lê D01, D02, sobe ao sótão, lê D03 e D04 | Coordenadas do Acampamento |
| Acampamento | Lê D05 a D09 | Coordenadas do Abrigo |
| Abrigo | Acha os 4 papelzinhos, abre o cofre, lê D10, D11, D12 e chega à Mesa (D13) | O enigma da data |
| Mesa | Acerta a data | Coordenadas da Ponte e registros D14 a D17 |
| Ponte | Lê D14, D15, D16 e então D17 | Conclusão |

## Fluxo com leitura fora de ordem

- **Achou o Abrigo antes do Acampamento:** D10 a D12 ficam trancados até abrir o cofre (os papelzinhos podem ser achados em qualquer ordem). A Mesa (D13) funciona mesmo sem o cofre, mas o **ano** só aparece no jornal (D10); a dica do enigma da data aponta para o jornal, então quem ainda não abriu o cofre precisa voltar a ele.
- **Achou a Ponte antes de resolver o enigma:** D14 a D17 mostram um texto "trancado" sem spoiler ("O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow."). Nenhum registro de lá é marcado como lido.
- **Achou só alguns papelzinhos:** o cofre só abre com os 4 dígitos; as dicas do cofre orientam. Os papelzinhos **não contam** para a conclusão nem para o "N de 17".
- **Ignorou um registro:** só os registros **chave** contam para concluir (D03, D06, D07, D10, D11, D12, D13, D14, D16, D17). D01, D02, D04, D05, D08, D09, D15 são complementares. Se o jogador ainda não leu um registro chave quando abrir D17, o D17 não conclui e o diário diz qual **local** falta (sem dizer o texto).
- **Interpretou mal uma pista:** o enigma aceita só a data certa; os erros não têm consequência. As duas dicas apontam para os registros certos.
- **Dois jogadores ao mesmo tempo:** o progresso é individual; a ordem de conclusão é sequencial no mundo (ver `08`).
- **Perdeu uma pista (ex.: dropou ou apagou algo):** os registros **não são itens**, são pontos no mundo. Voltar ao local e interagir de novo basta; o diário guarda tudo o que já foi lido.
