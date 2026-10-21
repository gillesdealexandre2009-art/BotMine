# 09 · Cronograma e testes

Hoje: 21/10/2026 (quarta). Lançamento: 25/10 (domingo). Prioridade: **escopo mínimo**, qualidade da história acima de quantidade.

## Cronograma

| Quando | Tarefa | Quem | Prioridade |
|---|---|---|---|
| 21/10 | História, documentos, roteiros (`00` a `09`) | Claude | Obrigatória (pronto) |
| 21/10 | Sistema do jogo (registros, diário, enigma, vento, conclusão) e bot (cargo, vencedores) | Claude | Obrigatória |
| 21 a 22/10 | **Gravar A1 a A4** e subir os links | Dono | Desejável (o evento funciona sem áudio) |
| 22/10 | Instalar addon no servidor, `/setup` do cargo de Halloween | Dono | Obrigatória |
| 22 a 23/10 | **Construir** Casa, Acampamento, Abrigo, Ponte (ver `06`) e **marcar** pontos e locais | Dono/staff | Obrigatória |
| 23/10 | Preencher links dos áudios no painel | Dono | Desejável |
| 23 a 24/10 | **Testes completos** (checklist abaixo) com 2 pessoas | Equipe | Obrigatória |
| 24/10 | Correções finais, resetar progressos de teste e vencedores de teste | Equipe | Obrigatória |
| 24/10 noite | Ligar o evento (janela de datas já cobre o início) e preparar o anúncio | Dono | Obrigatória |
| 25/10 | Lançamento: mensagem inicial no Discord e no jogo | Dono | Obrigatória |
| 25 a 31/10 | Acompanhamento: `/halloween vencedores`, dar Kitsune às 2 primeiras, resolver dúvidas | Staff | Obrigatória |
| 01/11 | Desligar o evento, desmontar decorações | Staff | Obrigatória |

**Cortes se faltar tempo (nesta ordem):** extras de atmosfera, áudios A1 e A2, o caderninho (D15). A história funciona sem eles. **Não cortar:** o enigma, D17, a conclusão e o aviso de conteúdo.

## Checklist de testes

### Antes de testar
- [ ] Packs instalados e atualizados (BP, RP e chat).
- [ ] Locais marcados (casa, acampamento, abrigo, ponte).
- [ ] Os 17 registros marcados (nenhum "vazio" no painel).
- [ ] Cargo de Halloween configurado no `/setup` e abaixo do cargo da Kiza.
- [ ] Janela do evento ajustada para o teste (e restaurada depois).

### Jogador
- [ ] **Quem nunca ouviu falar:** consegue chegar ao fim só com o jogo, sem ajuda do administrador.
- [ ] **Ignora um documento complementar** (D05, D08...): ainda conclui.
- [ ] **Ignora um registro chave:** D17 não conclui e o diário diz o local que falta.
- [ ] **Encontra a Ponte antes:** D14 a D17 mostram "trancado" sem spoiler.
- [ ] **Chuta a data errada** 7 vezes: recebe as 2 dicas, sem bloqueio.
- [ ] **Acerta a data** (31/10/2019): destrava a Ponte e o mapa.
- [ ] **Releitura:** o diário mostra de novo o texto e o link do áudio.

### Vento
- [ ] Aparece ao entrar no raio.
- [ ] **Não** repete ficando parado dentro do raio.
- [ ] **Não** repete se sair e voltar antes da espera.
- [ ] Repete depois de sair, esperar e voltar.
- [ ] Dois jogadores: cada um recebe a sua, sem spam para o outro.
- [ ] O texto muda depois de 3 e de 7 registros lidos.
- [ ] Sem casa marcada: não acontece nada.

### Conclusão e recompensas
- [ ] 1º jogador: posição 1, tela de 1º, tag, conquista, cargo, relógio.
- [ ] 2º jogador: posição 2, mesma coisa.
- [ ] 3º jogador: posição 3, **sem** convite de Kitsune.
- [ ] Concluir de novo não duplica nada.
- [ ] "Dar Kitsune" (dono): funciona, confirma, marca "entregue" e não duplica.
- [ ] Concluir fora da janela não conta.
- [ ] `/halloween vencedores` no Discord bate com a lista do jogo.

### Mundo e Bedrock
- [ ] Interagir com blocos marcados não abre baú nem porta e não quebra nada.
- [ ] Nenhum bloco foi alterado pelo script (só o que a staff construiu).
- [ ] Funciona no celular e no PC (formulário de data legível).
- [ ] Desligar o evento deixa o mundo como estava (só retirar decoração).

### Prazo
- [ ] A equipe consegue montar e marcar tudo em até 2 dias com o `06`.
- [ ] Um jogador novo termina em 25 a 40 minutos.

## Resetar depois dos testes

Painel do dono: **Resetar progresso** dos testadores e **Resetar vencedores** (confirmação dupla). Remova o cargo de Halloween dos testadores no Discord.
