# 05 · Enigmas e soluções

O evento tem **um** enigma de verdade (a cronologia). O resto da progressão é exploração e leitura. Menos é mais: um enigma justo e memorável.

## Enigma único: "Em que dia a gente se perdeu?" (Mesa de Hollow, D13)

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

## Estrutura de progressão (sem enigmas extras)

| Etapa | O que o jogador faz | O que destrava |
|---|---|---|
| Casa | Lê D01, D02, sobe ao sótão, lê D03 e D04 | Coordenadas do Acampamento |
| Acampamento | Lê D05 a D09 | Coordenadas do Abrigo |
| Abrigo | Lê D10, D11, D12, chega à Mesa (D13) | O enigma |
| Mesa | Acerta a data | Coordenadas da Ponte e registros D14 a D17 |
| Ponte | Lê D14, D15, D16 e então D17 | Conclusão |

## Fluxo com leitura fora de ordem

- **Achou o Abrigo antes do Acampamento:** pode ler D10 a D12 (não têm requisito). A Mesa funciona. Resolver o enigma sem ter ido ao acampamento não prejudica nada (D06 e D07 só reforçam).
- **Achou a Ponte antes de resolver o enigma:** D14 a D17 mostram um texto "trancado" sem spoiler ("O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow."). Nenhum registro de lá é marcado como lido.
- **Ignorou um registro:** só os registros **chave** contam para concluir (D03, D06, D07, D10, D11, D12, D13, D14, D16, D17). D01, D02, D04, D05, D08, D09, D15 são complementares. Se o jogador ainda não leu um registro chave quando abrir D17, o D17 não conclui e o diário diz qual **local** falta (sem dizer o texto).
- **Interpretou mal uma pista:** o enigma aceita só a data certa; os erros não têm consequência. As duas dicas apontam para os registros certos.
- **Dois jogadores ao mesmo tempo:** o progresso é individual; a ordem de conclusão é sequencial no mundo (ver `08`).
- **Perdeu uma pista (ex.: dropou ou apagou algo):** os registros **não são itens**, são pontos no mundo. Voltar ao local e interagir de novo basta; o diário guarda tudo o que já foi lido.
