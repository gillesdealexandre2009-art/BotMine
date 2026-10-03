# Addon Vulpus: estado da obra (passagem de bastão)

Atualizado em 2026-10-02, na conferência final. O addon está completo e conferido fora do jogo; falta o teste do dono dentro do jogo e, depois, o commit e o push.

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
| [texturas] | `tools/gerar_texturas.py`, `vulpus_rp/textures/**`, `pack_icon.png` (BP e RP) | **pronto** |
| [ui] | `vulpus_rp/ui/server_form.json`, `_ui_defs.json`, `ui/vulpus/vulpus_menu.json`, `tools/verificar_ui.py`, `tools/brarchive.py` | **pronto e revisado** (revisor corrigiu `factory_variables` da Lista e o verificador) |
| [core] | `vulpus_bp/scripts/main.js`, `config.js`, `core/*.js`, `textos/geral.js` | **pronto e revisado** |
| [sistemas1] | `scripts/sistemas/{menu,spawn,casas,voltar,tpa}.js` e textos | **pronto e revisado** |
| [sistemas2] | `scripts/sistemas/{caudas,perfil,ajustes,hud,regras,staff,boas_vindas}.js` e textos | **pronto e revisado** |
| [pacote] | manifests, `items/menu.json`, `texts/`, `package.json`, `jsconfig.json`, `tools/build.py`, `tools/instalar_dev.py`, `README.md` | **pronto** |
| Revisões | JSON UI, lógica dos scripts, conformidade com a spec | **feitas**: 2 correções na UI, 6 bugs corrigidos na lógica, textos e README ajustados |
| Teste de fumaça | BDS 1.26.52.3 oficial + API simulada | **passou**: pack carrega sem erro, 17 comandos registrados, `/menu` sem prefixo funciona, simulação dos sistemas sem falhas |
| Conferência final | checagens, limpeza, docs | **feita** |
| Teste no jogo (cliente) | visual do JSON UI, item, TPA com 2 pessoas | **pendente: o dono** |
| Commit e push na `main` | | **pendente** (depois do teste) |

## Checagens da conferência final (2026-10-02)

| Checagem | Resultado |
|---|---|
| `npm run check` (tsc contra 2.10.0 e 2.2.0) | 0 erros |
| `node --check` nos scripts do BP | 34 de 34 ok (`docs/workflow_implementar.js` não passa de propósito: é roteiro de workflow, com `return` no topo) |
| `python tools/verificar_ui.py` | 2 arquivos, 93 controles, 35 texturas, 0 erros, 0 avisos; `server_form.json` vanilla igual ao da 1.26.52 |
| `python tools/gerar_texturas.py` | 13 PNGs prontos, nenhum alterado (logo protegida) |
| `python tools/build.py` | 13 JSON ok; `dist/Vulpus.mcaddon` 66 KB (BP 53 KB, RP 12 KB) |
| `python tools/instalar_dev.py --simular --mundo "Testes Claude"` | acha o com.mojang (GDK) e o mundo; ativaria BP e RP com `.bak` |
| Lixo | sem `__pycache__`, `.ruff_cache`, BOM, emoji, `TODO` ou `console.log`; `node_modules/` e `dist/` cobertos pelo `.gitignore` da raiz |

## O que falta testar no jogo

1. O clique direito no item abre o menu. Se não abrir, acrescentar `minecraft:use_modifiers` em `items/menu.json`.
2. Visual do Hub: logo, 8 botões, texto embaixo da logo sem cortar (nome longo), coroa da staff no canto.
3. Visual da Lista (Casas, TPA): fundo laranja e marrom nos botões, cabeçalho laranja em Regras > Comandos, `§r` voltando à cor creme, Lista de 220 px cabendo em celular com GUI grande.
4. Content Log sem "Unknown property" (`factory_variables`).
5. Forms vanilla (ModalForm de nova casa, configurações da staff) continuam normais.
6. TPA com 2 pessoas; `/vulpus:tpaceitar NomeErrado` dá erro e não aceita outro pedido.
7. Teleporte cancelado andando: o aviso fica uns 3 s na actionbar.
8. Repetir num mundo **sem experimentos e sem cheats**, igual ao BDS.

## Próximos passos

1. O dono testa no jogo (passo a passo no `README.md`, seções "Teste rápido dos sistemas" e "Checklist").
2. Corrigir o que o teste apontar.
3. Commit e push na `main`.
4. Depois: subir no BDS da BedHosting.

## Armadilhas já conhecidas

- **Comandos:** `CustomCommand.cheatsRequired` vale **true** por padrão, então todo comando precisa de `cheatsRequired: false`.
- **Callback de comando:** roda em modo restrito. Mostrar form ou mexer no mundo exige `system.run`.
- **Seletor de jogador vazio:** `comandos.js` entrega `null` quando o nome foi passado e ninguém foi achado, e `undefined` quando o parâmetro opcional não veio. Os sistemas tratam `null` como `JOGADOR_OFFLINE`.
- **`Player.name` lança erro** com jogador inválido na 2.x: conferir `isValid` antes.
- **JSON UI:**
  - nunca inserir em `long_form.controls`;
  - nunca usar `$var` dentro de `modifications`;
  - cada botão precisa do binding `collection_details` no próprio button, senão o clique volta `canceled`;
  - nas expressões, só `=`, `not`, `and`, `or`, `-` e `+`;
  - o `collection_index` conta label, header e divider, mas o `selection` conta só botões;
  - **células criadas por factory não herdam as variáveis do `root`**: passe-as em `factory_variables` (como a vanilla faz);
  - o `texto_hub` usa `max_size` [100%, 84] (8 linhas), e não 72 como na spec: com nome longo, 72 ficava no limite.
- **Hub:** sempre manda 9 botões (os vazios vão com texto `''`). O slot 8 é o da staff.
- **Encoding:** arquivos com `§` precisam estar em UTF-8 sem BOM.
- **Texturas:** o `gerar_texturas.py` marca cada PNG com uma assinatura e não sobrescreve um arquivo trocado à mão, a não ser com `--forcar`. Isso protege a logo oficial.
- **Ferramentas neste PC:** o `python` do PATH é um atalho falso da Microsoft Store. Use `C:/Users/gille/vt/py` e `C:/Users/gille/vt/node` (no Bash: `export PATH="/c/Users/gille/vt/node:/c/Users/gille/vt/py:$PATH"`).
- **BDS:** o servidor não carrega UI; ele só prova scripts, comandos e item. O visual só se confere no cliente.
- **Mundo "Testes Claude":** tem experimentos ligados (incluindo Beta APIs) e cheats ativos. O addon não precisa deles, mas o teste final deve ser num mundo sem experimentos e sem cheats, igual ao servidor.
- **Apoio de teste fora do repo:** BDS em `C:/Users/gille/vt/bds` (script `C:/Users/gille/vt/rodar_bds.js`) e API simulada em `C:/Users/gille/vt/mock/` (`node --import ./registrar.mjs teste.mjs`).

## Página de andamento (opcional)

https://claude.ai/artifact/WcBX55EUA9v74XnYtm71Hk

A página lê o documento `painel/estado` do banco dela, que se atualiza com a ferramenta ArtifactData. É preciso ler o artifact antes de publicar nele.

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
