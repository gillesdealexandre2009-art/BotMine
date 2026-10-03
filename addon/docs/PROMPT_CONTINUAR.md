# Prompt para continuar em outro computador

Faça o `git pull` do repositório BotVulpus, abra o Claude Code na pasta do BotVulpus e cole o texto abaixo.

---

Continue o addon "Vulpus" (Minecraft Bedrock), em `addon/` deste repositório. Comecei em outro computador.

Antes de tudo, leia por inteiro:
- `addon/docs/ESTADO.md`: situação, decisões, armadilhas e próximos passos;
- `addon/docs/spec/01_spec_funcional.md` e `addon/docs/spec/02_spec_tecnica.md`: a fonte da verdade;
- a seção 5 de `addon/docs/pesquisa/02_tecnicas_comunidade.md`: a arquitetura do JSON UI.

Contexto rápido:
- Eu sou o KOPE (Luiz), dono do servidor Vulpus. Não sou programador. Quero respostas curtas e objetivas, em português.
- Trabalhe só dentro da pasta BotVulpus e não mexa no bot Python (Kiza) nesta tarefa.
- O addon é sem pay-to-win: nada exclusivo de quem paga e nada que valha dentro do jogo por dinheiro.
- Não agende tarefas nem rode retomadas sozinho. Se eu disser "pare", pare tudo.
- Versões: Bedrock 1.26.52, `@minecraft/server` 2.10.0 e `@minecraft/server-ui` 2.2.0, ambas estáveis e sem experimentos.

Situação atual (2026-10-02):
- **Pronto e conferido fora do jogo:** todas as frentes (texturas, JSON UI, core, sistemas, pacote), as revisões e a conferência final. O `dist/Vulpus.mcaddon` é gerado por `python tools/build.py`. Detalhes e resultados das checagens em `addon/docs/ESTADO.md`.
- **Falta:** o teste dentro do jogo (passo a passo em `ESTADO.md` e no `README.md`) e, depois dele, o commit e o push na `main`.

Pode seguir assim:
1. Leia a seção "O que falta testar no jogo" do `ESTADO.md`.
2. Rode de novo as checagens listadas lá, para confirmar que nada quebrou com o `git pull`.
3. Corrija o que o meu teste no jogo apontar e me diga o que mudou.

O roteiro de workflow usado está em `addon/docs/workflow_implementar.js` (só como registro; não precisa rodar de novo).
