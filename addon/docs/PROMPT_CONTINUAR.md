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

Situação atual:
- **Prontos e conferidos:**
  - as texturas;
  - o JSON UI do menu (`verificar_ui.py` com 0 erros);
  - a base dos scripts (core, com `tsc` limpo).
- **Faltam:**
  - [sistemas1]: menu, spawn, casas, voltar e tpa;
  - [sistemas2]: caudas, perfil, ajustes, hud, regras, staff e boas_vindas;
  - [pacote]: manifests, item, lang, `package.json`, `jsconfig.json`, `build.py`, `instalar_dev.py` e README.
- **Depois disso:** a verificação integrada, as revisões adversariais (JSON UI e lógica) e a conferência final.

Pode seguir direto:
1. Implemente o que falta conforme a spec técnica. Antes, leia o código real do core.
2. Rode todas as verificações listadas no `ESTADO.md` até zerar os erros.
3. Revise o JSON UI e os scripts tentando quebrar.
4. Gere o `dist/Vulpus.mcaddon`.
5. No fim, faça commit e push na `main` e me diga, passo a passo, o que testar no jogo.

Se for usar workflows com agentes, o roteiro usado está em `addon/docs/workflow_implementar.js`. Troque `<SCR>` por uma pasta temporária e `<repo>` pela raiz do repositório. As frentes [ui], [texturas] e [core] já estão feitas, então não as refaça; só revise.

ultracode
