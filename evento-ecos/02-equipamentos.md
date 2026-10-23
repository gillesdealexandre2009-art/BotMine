# Ecos dos Ausentes: equipamentos

## Permanente x temporário

- **Permanente (este documento):** fragmento, conjunto de armadura, varinha, receitas, habilidades. Existem para sempre, valem no leilão e em Caudas. IDs nunca mudam.
- **Temporário:** dimensão `vulpus:ecos`, janela de 24 h (2/11/2026), objetivos e criaturas. Desligar isso não afeta os itens. Para tirar só as habilidades: `ecosEquipLigado` = desligado (itens e leilão continuam normais).

## Itens

| ID | Nome | Notas |
|---|---|---|
| `vulpus:fragmento_alma` | Fragmento de Alma | empilha 64, brilho, sem uso próprio (só ingrediente e reparo) |
| `vulpus:ausente_helmet` | Elmo dos Ausentes | proteção 3, durabilidade 509 |
| `vulpus:ausente_chestplate` | Peitoral dos Ausentes | proteção 8, durabilidade 740 |
| `vulpus:ausente_leggings` | Calças dos Ausentes | proteção 6, durabilidade 694 |
| `vulpus:ausente_boots` | Botas dos Ausentes | proteção 3, durabilidade 601 |
| `vulpus:varinha_lamento` | Varinha Lamento | não empilha, durabilidade 400, brilho |

Armadura: soma 20 (como a netherita 3/8/6/3), durabilidade ~+25% sobre a netherita (407/592/555/481), encantável (valor 15), reparável com fragmentos (25% da durabilidade cada). Tags `minecraft:is_armor` (leilão: categoria "armaduras") e `vulpus:ecos_conjunto`.

## Receitas (mesa de trabalho, só `vulpus:fragmento_alma`)

| Item | Fragmentos | Padrão (F = fragmento) |
|---|---|---|
| Elmo | 5 | `F F` / `FFF` |
| Peitoral | 9 | `FFF` / `FFF` / `FFF` |
| Calças | 7 | `FFF` / `FF ` / `F F` |
| Botas | 5 | ` F ` / `F F` / `F F` |
| Varinha | 8 | ` FF` / `FFF` / `FFF` |

Total do conjunto + varinha: 34 fragmentos. Nenhum ingrediente extra. O peitoral usa o 3x3 cheio porque 9 só cabe assim.

## Habilidades (`sistemas/ecos_equip.js`)

- **Varinha Lamento:** ao usar, raio espectral de 20 blocos no primeiro alvo da mira. Dano mágico 6 (3 corações) em mobs; jogadores só com `ecosVaraPvp`. Recarga 4 s. 1 de durabilidade por uso (não gasta no criativo). Não funciona em minigame, em dimensões `vulpus:*` (exceto `vulpus:ecos`), nem para quem está sumido ou em espectador. Ignora itens e entidades do addon, exceto `vulpus:ecos_*`.
- **Passo dos Ausentes (conjunto completo):** sem dano de queda e brilho discreto a cada 2 s. Sem efeitos de combate. Mesmas restrições de minigame, dimensão e sumido.
- Custo: nada por tick; o brilho roda a cada 40 ticks e o dano de queda só confere a roupa quando a queda acontece.

## Configuração (Staff > Configurações > "Ecos dos Ausentes: equipamentos")

`ecosEquipLigado` (true), `ecosVaraDano` (6; faixa 1 a 40), `ecosVaraRecargaSeg` (4; 1 a 60), `ecosVaraPvp` (false), `ecosBonusConjunto` (true).

## Balanceamento

Sem p2w: nada liga a doação ou Kitsune. A armadura iguala a netherita em proteção e passa só na durabilidade; o bônus é utilidade (queda). A varinha é de utilidade/controle, não substitui espada (dano em mobs baixo, recarga longa, sem PvP por padrão).

## Limitações do Bedrock

- `minecraft:wearable` só aceita `slot` e `protection`: não há resistência a empurrão nem dureza (toughness) em armadura customizada. Não foi inventado; o bônus de conjunto compensa só com utilidade.
- Não há descrição/lore em item data-driven: o texto no lang é só o nome. Lore exigiria script e se perderia ao criar o item.
- A arte é básica (gerada por `addon/tools/gerar_ecos_itens.py`); a varinha aparece como sprite 2D na mão.
