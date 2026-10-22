# 06 · Plano de construção

**Regras:** nada de alteração destrutiva. Tudo o que for adicionado (blocos decorativos, objetos) fica **dentro de áreas de evento** e pode ser removido depois. Não destrua nem altere construções existentes. Onde faltar informação, está marcado `[VERIFICAR]` ou `[COORDENADAS DE X]` e o administrador preenche.

**Como o jogo sabe onde ficam os registros:** a staff usa **Staff > Evento Hollow > Registros > Marcar bloco que estou olhando**. Qualquer bloco serve (placa, livro estante, barril, lectern, cabeça de mob, pote, flor). Escolha blocos que **chamem a atenção** e que combinem com a cena. Locais (coordenadas que aparecem nos textos): **Staff > Evento Hollow > Locais > Marcar onde estou**.

| Área | Tempo | Prioridade |
|---|---|---|
| Casa (térreo e sótão) | 1,5 h | Obrigatória |
| Acampamento | 1,5 h | Obrigatória |
| Abrigo (dungeon) + Mesa | 1,5 h | Obrigatória |
| Ponte | 1,5 h | Obrigatória |
| Extras de atmosfera | 1 h | Opcional |

## 1. A Casa (casa do spawn) · `[COORDENADAS DA CASA]`

- **Reutiliza:** a casa do spawn (andar de baixo + sótão). `[VERIFICAR]` se o sótão tem acesso por escada; se não tiver, a staff só precisa **marcar um bloco** dentro dele.
- **Adicionar (decorativo, removível):**
  - Mesa posta para 5 com pratos e pó (teias de aranha), velas apagadas.
  - Um relógio na parede (use item frame com `minecraft:clock`) para o D02.
  - Uma lanterna acesa na varanda (e a luz acesa visível de fora).
  - Sótão: baú/barril antigo, uma mesa pequena, teias, um quadro virado para a parede.
- **Registros:** D01 (placa ou livro na mesa da cozinha), D02 (item frame do relógio), D03 (barril/livro estante no sótão), D04 (outro bloco no sótão, ex.: mapa em item frame).
- **Atmosfera:** pouca luz, só velas e lanternas; silêncio. O **vento** (ver `07`) toca ao chegar perto.
- **Coordenadas:** marque como Local **casa** (centro do vento).

## 2. O Acampamento (floresta) · `[COORDENADAS DO ACAMPAMENTO]`

- **Reutiliza:** qualquer clareira ou borda de floresta já existente `[VERIFICAR]` perto de um rio. **Não derrube** árvores nem altere o terreno: monte em uma clareira.
- **Adicionar:** barraca (lã e varas), fogueira apagada, lampião (lanterna), caixas, varal com cartazes (placas), mapa na árvore, pilha de calendários (item frames).
- **Registros:** D05 (livro/lectern), D06 (placa com o cartaz), D07 (carta numa mesa), D08 (calendários), D09 (bilhete preso numa árvore).
- **Atmosfera:** luz baixa, folhas caídas (folhas, azaleia seca), sons naturais.

## 3. O Abrigo (dungeon existente) · `[COORDENADAS DO ABRIGO]`

- **Reutiliza:** a dungeon existente `[VERIFICAR qual sala é a mais isolada]`. Uma única sala basta: o fundo do abrigo serve de "arquivo" com a Mesa.
- **Adicionar:** prateleiras com papéis (estantes), caixa de ferramentas, mesa grande com muitos papéis (Mesa de Hollow, um lectern ou mesa de cartografia).
- **Registros:** D10 (jornal, item frame ou placa), D11 (ingresso), D12 (registro de ocorrência) e **D13 = a Mesa**.
- **O cofre:** um baú, barril ou ender chest (só visual) numa sala do Abrigo, marcado em Evento Hollow > Cofres. Pode marcar **mais de um bloco** (ex.: um baú e um barril ao lado): todos abrem o mesmo formulário. D10, D11 e D12 moram em blocos próprios (estante, item frame, placa) e só abrem depois do cofre.
- **Os 4 papelzinhos (P1 a P4):** esconda em **lugares onde ninguém olharia**, marcando cada um em Evento Hollow > Registros. Sugestões de esconderijos:
  - P1: atrás de uma estante, num botão ou placa escondida perto da entrada do Abrigo.
  - P2: embaixo de uma cama ou num barril no canto mais escuro.
  - P3: num vaso ou pote (decorated pot, flower pot) em outra sala, ou sobre uma viga alta.
  - P4: perto do fim: no corredor da Mesa, dentro de um item frame invisível ou numa placa de um canto.
  - Pode espalhar também pela Casa e pelo Acampamento (o D09 só diz "onde só eu procuraria"), mas mantenha todos alcançáveis a pé e sem destruir blocos.
- **Atmosfera:** pouca luz, ar parado, sem monstros por perto (se a dungeon tiver mobs, o evento só exige que a sala da Mesa esteja segura).

## 4. A Ponte · `[COORDENADAS DA PONTE]`

- **Reutiliza:** qualquer ponte ou beira de rio `[VERIFICAR]`. Se não houver, uma ponte pequena em **área de evento** (removível).
- **Adicionar:** grade quebrada (cercas), placa memorial (placa com os nomes), flores (cravos, vasos), pedras, uma lanterna apagada, um casaco dobrado (use um item frame com roupas de armadura de couro ou colocado num suporte), a luz da varanda ao fundo (uma lanterna distante).
- **Registros:** D14 (placa), D15 (caderninho: livro estante), D16 (gravador: uma jukebox sem disco), D17 (folha dobrada presa por uma pedra: uma placa).
- **Atmosfera:** nevoeiro leve se possível, chuva fina (use `/weather rain` apenas no momento do teste; não deixe permanente), silêncio. Nada de monstros.

## 5. Sons ambientes (opcional)

Sem pack novo de sons. O vento da casa já usa um som discreto. Para a Ponte, use apenas o som de chuva do clima, se a staff ativar.

## Desmontagem (depois de 31/10)

Remover todos os blocos de decoração (guarde um backup via `/structure save` se quiser reutilizar). Os pontos marcados somem ao **Staff > Evento Hollow > Desligar evento** (os registros param de abrir). O mundo volta ao normal sem rastro.
