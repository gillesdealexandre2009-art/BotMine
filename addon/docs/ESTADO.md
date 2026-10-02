# Addon Vulpus: estado da obra (passagem de bastão)

Atualizado em 2026-10-02, por volta das 13:55. A obra foi parada a pedido do dono, porque ele mudou de computador.

## O que é

Addon de Minecraft Bedrock para o servidor Vulpus. O mascote é a Kiza Misuchi, uma raposa kitsune.
- **Plataforma:** Script API pura, sem plugin. O dono testa num mundo local; depois o addon vai para um BDS na BedHosting.
- **Foco desta fase:** um menu personalizado em JSON UI. A logo fica no meio, o texto embaixo dela e há 4 botões de cada lado, além dos sistemas base que os botões abrem:
  - Spawn, Casas, TPA e Voltar;
  - Caudas, Perfil, Ajustes e Regras;
  - Staff.
- **Versões:** Bedrock 1.26.52, `@minecraft/server` 2.10.0 e `@minecraft/server-ui` 2.2.0, sem experimentos.

## Onde está cada coisa

| Arquivo | Conteúdo |
|---|---|
| `docs/spec/01_spec_funcional.md` | o que cada botão e cada sistema faz (fonte da verdade) |
| `docs/spec/02_spec_tecnica.md` | estrutura, dono de cada arquivo, contratos entre módulos, flags, texturas e manifests (fonte da verdade) |
| `docs/pesquisa/02_tecnicas_comunidade.md` | pesquisa de JSON UI; a seção 5 é a arquitetura adotada |
| `docs/pesquisa/referencia_vanilla_ui.md` | regras medidas do JSON UI vanilla da 1.26.52 |
| `docs/pesquisa/resumo_comunidade.md` | resumo dos achados da comunidade |
| `docs/pesquisa/proposta_rascunho/` | rascunho validado que deu origem ao JSON UI |
| `docs/previas/mock_hub.png` | montagem aproximada do menu, feita fora do jogo |
| `docs/previas/texturas.png` | folha com todas as texturas |
| `docs/resultados/texturas.md` | relatório da frente de texturas, com as decisões tomadas |
| `docs/workflow_implementar.js` | roteiro do workflow usado (6 frentes, verificação e revisões) |

Nos documentos, `<SCR>` era a pasta temporária do outro computador, e `<repo>` é a raiz deste repositório.

## Situação por frente

| Frente | Arquivos | Situação |
|---|---|---|
| Pesquisa e specs | `docs/` | **pronto** |
| [texturas] | `tools/gerar_texturas.py`, `vulpus_rp/textures/**`, `pack_icon.png` (BP e RP) | **pronto**: agente concluiu e conferiu |
| [ui] | `vulpus_rp/ui/server_form.json`, `_ui_defs.json`, `ui/vulpus/vulpus_menu.json`, `tools/verificar_ui.py`, `tools/brarchive.py` | **feito, falta a revisão final do agente**: ele foi interrompido na própria checagem. Conferido depois: `verificar_ui.py` dá **0 erros e 0 avisos** contra a vanilla 1.26.52 (93 controles, 35 texturas) |
| [core] | `vulpus_bp/scripts/main.js`, `config.js`, `core/*.js`, `textos/geral.js` | **feito, falta o teste de fumaça**: interrompido no teste com mocks. Conferido depois: `node --check` ok e **tsc limpo** contra as tipagens 2.10.0 e 2.2.0 |
| [sistemas1] | `scripts/sistemas/{menu,spawn,casas,voltar,tpa}.js` e os `textos/` correspondentes | **não começou** |
| [sistemas2] | `scripts/sistemas/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js` e os `textos/` correspondentes | **não começou** |
| [pacote] | manifests, `items/menu.json`, `texts/`, `package.json`, `jsconfig.json`, `tools/build.py`, `tools/instalar_dev.py`, `README.md` | **não começou** (as linhas do `.gitignore` já foram feitas) |
| Verificação integrada | `npm run check`, `verificar_ui.py`, `gerar_texturas.py`, `build.py` | pendente |
| Revisões adversariais | revisão do JSON UI e revisão da lógica dos scripts | pendente |
| Conferência final | `.mcaddon` pronto e passo a passo de teste para o dono | pendente |

Observação: `main.js` já importa os 12 módulos de sistemas, que ainda não existem. O addon só carrega depois que [sistemas1] e [sistemas2] forem feitos.

## Próximos passos

1. **Ler** as duas specs e a seção 5 de `docs/pesquisa/02_tecnicas_comunidade.md`.
2. **Recriar o material de apoio**, que ficou no outro PC:
   - **UI vanilla para consulta:** `python addon/tools/brarchive.py "<data do jogo>\resource_packs\vanilla\__brarchive" <pasta>`. O `<data do jogo>` costuma ser `C:\XboxGames\Minecraft for Windows\Content\data`. Sem argumentos, o `verificar_ui.py` já extrai sozinho; para outra instalação, use `--jogo PASTA`.
   - **Tipagens:** depois que o [pacote] criar o `package.json`, rodar `npm install` em `addon/`. Antes disso, dá para usar uma pasta temporária com `npm i @minecraft/server@2.10.0 @minecraft/server-ui@2.2.0 --legacy-peer-deps`.
3. **Implementar** [sistemas1], [sistemas2] e [pacote] seguindo os contratos da spec técnica. Antes, ler o código real do core: `scripts/core/forms.js`, `teleporte.js`, `db.js` e `comandos.js`.
4. **Verificação integrada:**
   - `npm install` e `npm run check`, com zero erros;
   - `node --check` em tudo;
   - `python tools/verificar_ui.py`, com zero erros;
   - `python tools/gerar_texturas.py`, que não sobrescreve uma logo trocada sem `--forcar`;
   - `python tools/build.py`, que deve gerar `dist/Vulpus.mcaddon`.
5. **Revisões adversariais:** a do JSON UI segue o checklist da seção 5 da pesquisa. A da lógica cobre:
   - modo restrito e `system.run`;
   - `UserBusy`;
   - casos de borda do TPA;
   - diária no fuso de Brasília;
   - anti-AFK;
   - `cheatsRequired: false` em todos os comandos.
6. **Conferência final:** o `.mcaddon` pronto e o passo a passo de teste no jogo para o dono (há um checklist de 8 itens no fim da seção 5 da pesquisa). Depois, commit e push na `main`.

## Armadilhas já conhecidas

- **Comandos:** `CustomCommand.cheatsRequired` vale **true** por padrão, então todo comando precisa de `cheatsRequired: false`.
- **Callback de comando:** roda em modo restrito. Mostrar form ou mexer no mundo exige `system.run`.
- **JSON UI:**
  - nunca inserir em `long_form.controls`;
  - nunca usar `$var` dentro de `modifications`;
  - cada botão precisa do binding `collection_details` no próprio button, senão o clique volta `canceled`;
  - nas expressões, só `=`, `not`, `and`, `or`, `-` e `+`;
  - o `collection_index` conta label, header e divider, mas o `selection` conta só botões.
- **Hub:** sempre manda 9 botões (os vazios vão com texto `''`). O slot 8 é o da staff.
- **Encoding:** arquivos com `§` precisam estar em UTF-8 sem BOM.
- **Texturas:** o `gerar_texturas.py` marca cada PNG com uma assinatura e não sobrescreve um arquivo trocado à mão, a não ser com `--forcar`. Isso protege a logo oficial.

## Página de andamento (opcional)

https://claude.ai/artifact/WcBX55EUA9v74XnYtm71Hk

A página lê o documento `painel/estado` do banco dela, que se atualiza com a ferramenta ArtifactData. É preciso ler o artifact antes de publicar nele. Parou em 44%.

## Pendências do bot Kiza (fora do addon, manuais)

- **Railway:** "Deploy Latest Commit" para subir o 1.3.0.
- **Discord:**
  - `/setup` > Publicar tudo;
  - conferir se o atalho `</bump:ID>` vira link;
  - liberar o `/bump` do DISBOARD para membros, em Integrações e nas permissões do canal;
  - criar o cargo 🔔 Bump;
  - **regenerar o token do bot**, que foi colado num chat antes.
- **Página do DISBOARD:** o texto novo está em https://claude.ai/artifact/MJskeuaCjt5bpZtZPjam5c

## Preferências do dono (KOPE / Luiz)

- **Comunicação:** respostas curtas e objetivas, em português. Ele não é programador.
- **Pasta:** trabalhar só dentro de `BotVulpus`.
- **Sem pay-to-win:**
  - o Kitsune (booster) tem 2x XP no Discord; isso foi aceito, porque todo mundo chega nas mesmas recompensas;
  - nada exclusivo de quem paga e nada que valha dentro do jogo por dinheiro.
- **Autorização:**
  - não escrever código sem um sinal explícito;
  - não agendar tarefas nem rodar retomadas ou agentes pesados por conta própria;
  - quando ele disser "pare", parar tudo e esperar.
