# 03 · Documentos (texto final)

> Fonte da verdade: `addon/vulpus_bp/scripts/textos/hollow_docs.js`. Este arquivo é gerado dele. Em cada texto, `{coord:X}` é preenchido com as coordenadas que a staff marcar.
> Os registros com 🔒 só abrem depois de cumprirem as dependências (o jogo mostra o texto de "trancado").

## Mensagens do evento

### Mensagem inicial

```
§6🎃 O Último Outono de Hollow
§7De 25 a 31 de outubro. Uma casa, uma mata, um abrigo e uma ponte guardam o que alguém tentou esquecer.
§8Aviso: a história trata de luto e tem um desfecho triste (sem cenas gráficas). Se não quiser acompanhar, tudo bem. Você pode jogar normalmente.
§7Comece pela casa perto do spawn. Use /vulpus:hollow para abrir o seu diário de investigação.
```

### Mensagem de conclusão (com o apoio ao CVV)

```
§7Você reconstruiu a história de Hollow.

§7Ele não estava perdido. Ele estava sozinho com uma dor grande demais, e não pediu ajuda a tempo.

§fSe você ou alguém que você conhece está sofrendo, não carregue isso sozinho: no Brasil, o §bCVV §fatende pelo §b188 §f(24 horas, gratuito) e em cvv.org.br.
```

### Vento da casa (muda com o progresso)

1. até 2 registros: Você sente um vento estranho passar por você. Ele parece se originar de uma casa misteriosa.
2. até 6 registros: O vento volta, mais frio, com cheiro de folhas molhadas. Parece que a casa estava esperando alguém.
3. até 99 registros: Dessa vez o vento não passa por você. Ele para, como quem escuta.

---

## O cofre do abrigo

- **Código padrão:** `2147` (a staff pode trocar em Evento Hollow > Código do cofre; os papelzinhos mudam sozinhos).
- **Guarda:** D10, D11 e D12 (trancados até abrir o cofre).
- **Como abre:** botão direito num bloco marcado como cofre; formulário com o código de 4 números. Sem punição por erro (espera de 3 s).
- **Dicas:**
  - depois de 3 erros: Cada papelzinho que você encontrar tem uma parte do código: primeira, segunda, terceira e quarta.
  - depois de 6 erros: O código tem 4 números, um por papelzinho. Procure em lugares onde ninguém olharia.
- **Texto de sucesso:** Clique. A caixa abre. Dentro, papéis dobrados: um jornal, um ingresso, um registro. Agora você consegue lê-los.
- **Já aberto:** A caixa já está aberta.
- **Papelzinhos P1 a P4:** não contam para o "N de 17" nem para a conclusão; o diário mostra "Papelzinhos: X de 4". Em cada texto, `{digito1}` a `{digito4}` viram o dígito correspondente do código em vigor.

---

## D01 · Bilhete na mesa da cozinha

- **Local:** A Casa (térreo)
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Calor e esperança: alguém saiu para buscar a família.
- **Informação revelada:** Hollow procura a família e deixa a luz da varanda acesa.
- **Próxima pista:** Ir ao sótão e ao resto da casa.

**Texto completo:**

```
Se vocês chegarem e eu não estiver, não se preocupem.

Deixei o fogão apagado e o pão-de-mel da vovó na lata. Eu volto antes de escurecer. Fui procurar vocês.

Hollow

P.S.: Lia, deixei a luz da varanda acesa.
```

## D02 · Papel colado no relógio da parede

- **Local:** A Casa (térreo)
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Estranheza leve: um relógio parado que ninguém consertou.
- **Informação revelada:** A hora 21h47 (guardada para o fim).
- **Próxima pista:** Explorar o sótão.

**Texto completo:**

```
O relógio parou na correria da festa. Marca 21h47.

Não vou mexer nele. O pai gosta de acertar o relógio sozinho.
```

## D03 · Diário de Hollow, primeiras páginas

- **Local:** A Casa (sótão)
- **Conta para a conclusão:** sim
- **Dependências:** nenhuma
- **Áudio:** A1 (ver `04`)
- **Momento narrativo:** Esperança, com uma coisa fora do lugar: a data errada da festa.
- **Informação revelada:** Hollow diz que a festa era dia 22 (a carta dirá 31).
- **Próxima pista:** O mapa do acampamento (D04).

**Texto completo:**

```
Dia 1.
Voltei da festa sozinho. Não sei direito como. Estava escuro e chovia muito. Acho que me perdi do pessoal na saída e vim a pé pela estrada. A casa estava como a gente deixou.
Eles não chegaram. A mãe tinha escrito que a festa seria dia 22, então talvez tenham achado que era depois. O pai deve ter ido buscar a vó em outro lugar.

Dia 2.
Liguei para todo mundo. Ninguém atende. É normal, a rede aqui cai quando chove.

Dia 3.
Vou procurar. Já separei mantimentos. Vou montar acampamento na mata, perto do rio. Se eles voltarem por lá, me acham.
Vou deixar anotado onde estou, para eles saberem me encontrar.
```

## D04 · Mapa do caminho até o acampamento 🔒

- **Local:** A Casa (sótão)
- **Conta para a conclusão:** não
- **Dependências:** D03
- **Momento narrativo:** Direção clara: um caminho para seguir.
- **Informação revelada:** Onde fica o acampamento.
- **Próxima pista:** Ir à mata.
- **Texto enquanto trancado:** Um papel dobrado, quase todo manchado de umidade. Você não entende o que ele quer dizer ainda. Talvez o diário ajude.

**Texto completo:**

```
Desenhei o caminho. Saindo pela porta dos fundos, seguir a trilha de terra até a mata. Marquei com um X onde fica a barraca.

Acampamento: {coord:acampamento}

Deixo um lampião aceso toda noite. Quem seguir a luz chega.
```

## D05 · Diário de Hollow, segunda parte

- **Local:** O Acampamento
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Áudio:** A2 (ver `04`)
- **Momento narrativo:** Cansaço e as primeiras dúvidas: contou nove velas e depois dezenove; no rodapé, anos diferentes.
- **Informação revelada:** A busca dura anos, não dias.
- **Próxima pista:** Procurar a carta, o cartaz e o abrigo.

**Texto completo:**

```
Dia 5.
Montei a barraca perto do rio. Fiz cartazes e preguei nas árvores. A tinta da impressora acabou e usei a do pai.

Dia 7.
Comi as últimas latas. Pensei em voltar para casa, mas e se eles chegam e não me acham?

Dia 9.
Faz nove dias. Ou foi mais? Amanhecer e anoitecer têm andado parecidos. Contei as velas: nove. Contei de novo: dezenove.
Contei errado. Deve ser o cansaço.

(No pé da página, a lápis, com outra letra:)
Dia 1 (2022)
Dia 1 (2023)
Dia 1 (2024)
Dia 1 (2025)
```

## D06 · Cartaz: DESAPARECIDOS

- **Local:** O Acampamento
- **Conta para a conclusão:** sim
- **Dependências:** nenhuma
- **Momento narrativo:** Inquietude: um cartaz de desaparecidos com data borrada e a frase "faz uma semana".
- **Informação revelada:** Dia 31 de outubro; ano apagado; quatro nomes.
- **Próxima pista:** Ver o resto do acampamento e o bilhete do abrigo.

**Texto completo:**

```
DESAPARECIDOS

ÁLVARO (45)
MARTA (42)
LIA (8)
ILDA (71)

Vistos pela última vez na Festa da Colheita de Salgueiral, na noite de 31 de outubro de 20▒▒ (a chuva borrou o resto do ano).
Caminhonete azul.

Quem tiver notícias procure o Hollow, na casa da estrada velha.

(Embaixo, a caneta, com a letra tremida:)
faz uma semana
```

## D07 · Carta da Marta

- **Local:** O Acampamento
- **Conta para a conclusão:** sim
- **Dependências:** nenhuma
- **Áudio:** A2 (ver `04`)
- **Momento narrativo:** Ternura e dor: a última carta de uma mãe, com a anotação "chegou ontem".
- **Informação revelada:** 12/10/2019; a festa seria no dia 31 (Hollow disse 22).
- **Próxima pista:** Comparar com o diário e o cartaz.

**Texto completo:**

```
Salgueiral, 12 de outubro de 2019.

Meu querido,

Como está o acampamento? Aqui está tudo normal. A Lia perdeu o dente da frente e já está treinando o sorriso para a foto da festa. A vó quer que você prove o pão-de-mel antes de todo mundo, então volte com fome.

Seu pai já separou a camisa xadrez que você gosta. No dia 31, depois do almoço, a gente sai todo mundo junto. Combinado?

Cuide-se, e não esqueça o casaco, que o tempo vira.

Com todo o amor,
Mamãe

(Na margem, a caneta:)
chegou ontem
```

## D08 · Pilha de calendários

- **Local:** O Acampamento
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Perturbação silenciosa: sete calendários com o dia 31 circulado.
- **Informação revelada:** Ele recomeça todo ano.
- **Próxima pista:** Ir ao abrigo (D09).

**Texto completo:**

```
Sete calendários de anos diferentes, empilhados dentro da barraca. Em todos, o dia 31 de outubro está circulado e os dias depois dele estão riscados com um X até o fim do mês.

No de cima, um bilhete preso com um prego:
"Troco todo ano. Assim eu não perco a conta."
```

## D09 · Bilhete sobre o abrigo

- **Local:** O Acampamento
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Suspeita: ele trata os papéis do abrigo como de "outra pessoa".
- **Informação revelada:** Onde fica o abrigo.
- **Próxima pista:** Ir ao Abrigo.

**Texto completo:**

```
Guardei o que eu não consigo carregar no abrigo da colheita, debaixo da colina.

Abrigo: {coord:abrigo}

Lá tem papéis de uma pessoa que passou por aqui. Não são meus. Não precisa ler. Mas guardei por via das dúvidas.

Os papéis estão trancados numa caixa de quatro números. Deixei cada número num papelzinho, em lugares onde só eu procuraria.
```

## D10 · Recorte de jornal 🔒

- **Local:** O Abrigo (dungeon existente)
- **Conta para a conclusão:** sim
- **Dependências:** cofre do abrigo aberto
- **Momento narrativo:** Choque contido: um jornal coberto a caneta.
- **Informação revelada:** O ano (2019) e que um jovem de 16 anos sobreviveu.
- **Próxima pista:** Ler o ingresso e o registro.
- **Texto enquanto trancado:** Está dentro de uma caixa trancada. Procure o cofre do abrigo e o código.

**Texto completo:**

```
GAZETA DE SALGUEIRAL
1º de novembro de 2019

CAMINHONETE CAI DA PONTE DO SALGUEIRAL DURANTE A TEMPESTADE

O veículo saiu da pista por volta das 21h40 de ontem, durante o temporal que atingiu a região depois da Festa da Colheita. As equipes de resgate encontraram cinco ocupantes.

[trecho coberto a caneta preta]

Um jovem de 16 anos foi localizado na margem, em estado de choque, e levado ao hospital. Ele repetia que a família "ia chegar".

[restante do texto coberto a caneta preta]
```

## D11 · Ingresso da Festa da Colheita 🔒

- **Local:** O Abrigo (dungeon existente)
- **Conta para a conclusão:** sim
- **Dependências:** cofre do abrigo aberto
- **Momento narrativo:** Comoção: um ingresso com letra de criança no verso.
- **Informação revelada:** Dia e mês (31 OUT).
- **Próxima pista:** Chegar à Mesa de Hollow.
- **Texto enquanto trancado:** Está dentro de uma caixa trancada. Procure o cofre do abrigo e o código.

**Texto completo:**

```
FESTA DA COLHEITA DE SALGUEIRAL
Edição de outono

Entrada família (5 pessoas)
31 OUT · a partir das 14h
PAGO

(No verso, a lápis, com letra de criança:)
"O Hollow ganha o último pedaço!"
```

## D12 · Registro de ocorrência 🔒

- **Local:** O Abrigo (dungeon existente)
- **Conta para a conclusão:** sim
- **Dependências:** cofre do abrigo aberto
- **Momento narrativo:** O mundo vira: ocupantes 5, sobrevivente 1.
- **Informação revelada:** A hora (21h47) bate com o relógio da casa.
- **Próxima pista:** Resolver a cronologia na Mesa.
- **Texto enquanto trancado:** Está dentro de uma caixa trancada. Procure o cofre do abrigo e o código.

**Texto completo:**

```
REGISTRO DE OCORRÊNCIA

Local: Ponte do Salgueiral
Data e hora: 31/10, 21h47 (estimada pelo relógio de pulso do sobrevivente)
Ocupantes do veículo: 5
Sobreviventes: 1

O sobrevivente, 16 anos, foi encontrado na margem às 01h10, consciente e desorientado. Ele repetia que a família estava "a caminho". Encaminhado ao hospital. Assistência social acionada.
Velório e despedida: 04/11.

(Nos campos "nome" e "parentesco", tudo foi riscado a caneta. Só o número 1 de "Sobreviventes" continua legível, circulado várias vezes.)
```

## D13 · Mesa de Hollow

- **Local:** A Mesa de Hollow (no fundo do Abrigo)
- **Conta para a conclusão:** sim
- **Dependências:** nenhuma
- **Momento narrativo:** Concentração: é hora de dizer a data.
- **Informação revelada:** O enigma: "Em que dia a gente se perdeu?"
- **Próxima pista:** Resolver; abre o mapa da Ponte.

**Texto completo:**

```
Papéis espalhados por toda a mesa. No meio, uma folha em branco, só com uma pergunta:

"Em que dia a gente se perdeu? Eu anoto aqui e então paro de contar."

Compare os registros que você encontrou: onde eles concordam, e onde é Hollow quem discorda deles.
```

## D14 · Placa na ponte 🔒

- **Local:** A Ponte
- **Conta para a conclusão:** sim
- **Dependências:** cronologia resolvida (D13)
- **Momento narrativo:** Verdade sem saída: uma placa com os quatro nomes.
- **Informação revelada:** A data real e que eles morreram.
- **Próxima pista:** Ler o gravador (D16) e o caderninho.
- **Texto enquanto trancado:** O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow.

**Texto completo:**

```
Em memória de

ÁLVARO
MARTA
LIA
ILDA

31 de outubro de 2019

"Voltaram para casa."

Colocada pelos amigos de Salgueiral. Aos pés da placa, flores trocadas todo outono.
```

## D15 · Caderninho da Lia 🔒

- **Local:** A Ponte
- **Conta para a conclusão:** não
- **Dependências:** cronologia resolvida (D13)
- **Momento narrativo:** Lágrimas: a voz de uma criança que queria envelhecer com o irmão.
- **Informação revelada:** Quem era a Lia.
- **Próxima pista:** Ler o gravador.
- **Texto enquanto trancado:** O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow.

**Texto completo:**

```
Meu dente caiu. O Hollow disse que a fada deixa moeda. Eu quero um pão-de-mel.

Quando eu crescer eu vou morar na casa grande com o Hollow. Ele vai ficar velhinho e eu vou fazer o pão pra ele.

(O resto das páginas está molhado e ilegível.)
```

## D16 · Gravador de Hollow (transcrição) 🔒

- **Local:** A Ponte
- **Conta para a conclusão:** sim
- **Dependências:** cronologia resolvida (D13)
- **Áudio:** A3 (ver `04`)
- **Momento narrativo:** Reconhecimento: Hollow começa a aceitar.
- **Informação revelada:** Ele sabe, e a luz da varanda ficou acesa.
- **Próxima pista:** Abrir o último registro.
- **Texto enquanto trancado:** O lugar pede uma data que você ainda não sabe dizer. Volte à Mesa de Hollow.

**Texto completo:**

```
(chiado)
Gravando. Ponte do Salgueiral.
(pausa)
Eu fiz os cartazes. Escrevi todos os nomes. Eu sei de cor o nome de cada um.
(pausa longa)
Eu disse "semana passada" tantas vezes que... A Lia ia fazer nove anos em dezembro. Ia.
O verbo está certo. Por que é que dói tanto?
(respiração)
A luz da varanda. Eu deixei acesa. Todo ano, eu deixei acesa.
(a gravação continua em silêncio por alguns segundos)
```

## D17 · O último registro de Hollow 🔒

- **Local:** A Ponte
- **Conta para a conclusão:** sim
- **Dependências:** cronologia resolvida (D13), D14, D16
- **Áudio:** A4 (ver `04`)
- **Momento narrativo:** Silêncio e peso: a despedida.
- **Informação revelada:** O que aconteceu com Hollow, sem cena e sem método; e um pedido de ajuda.
- **Próxima pista:** Fim do evento.
- **Texto enquanto trancado:** Uma folha dobrada, presa por uma pedra. Você sente que ainda não leu tudo o que precisa antes de abri-la.

**Texto completo:**

```
Para quem encontrar isto.

Hoje é 31 de outubro de 2026. Eu contei: são sete anos.

Eu não estava procurando por eles. Estava procurando um jeito de não saber. Todo outono eu acordava no dia 1 e achava que ainda dava tempo.

Eles não se perderam de mim. Eles estavam no carro. Eu também estava. Eu sobrevivi, e passei sete anos sem conseguir dizer isso em voz alta.

A Lia não vai fazer nove anos. A vó não vai fazer o pão. O pai não vai acertar o relógio. A mãe não vai ler a carta que eu nunca respondi.

Eu não aguento mais. Não é culpa de ninguém que passou por aqui. Eu devia ter pedido ajuda muito antes, e não pedi. Se você está lendo isto e carrega algo parecido, peça. Ligue para alguém hoje. Eu não liguei, e queria ter ligado.

O casaco está dobrado aqui, na grade. Era o que a mãe mandou eu levar. Se alguém quiser, que fique com ele.

Eu apaguei a luz da varanda.

Hollow
```

## P1 · Papelzinho (1ª parte)

- **Local:** Escondido no Abrigo (papelzinho do cofre)
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Curiosidade: um papelzinho dobrado, com a letra do Hollow.
- **Informação revelada:** Primeiro dígito do código do cofre.
- **Próxima pista:** Procurar os outros papelzinhos e o cofre.

**Texto completo:**

```
Um papelzinho dobrado, com a letra do Hollow:

"Primeira parte: {digito1}"

Guardei onde ninguém tropeça.
```

## P2 · Papelzinho (2ª parte)

- **Local:** Escondido no Abrigo (papelzinho do cofre)
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Curiosidade: o segundo papelzinho.
- **Informação revelada:** Segundo dígito do código do cofre.
- **Próxima pista:** Procurar o terceiro e o quarto.

**Texto completo:**

```
Um papelzinho dobrado, com a letra do Hollow:

"Segunda parte: {digito2}"

Escondi onde a luz não chega.
```

## P3 · Papelzinho (3ª parte)

- **Local:** Escondido no Abrigo (papelzinho do cofre)
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Curiosidade: o terceiro papelzinho.
- **Informação revelada:** Terceiro dígito do código do cofre.
- **Próxima pista:** Procurar o quarto.

**Texto completo:**

```
Um papelzinho dobrado, com a letra do Hollow:

"Terceira parte: {digito3}"

Deixei onde o vento passa e a mão não.
```

## P4 · Papelzinho (4ª parte)

- **Local:** Escondido no Abrigo (papelzinho do cofre)
- **Conta para a conclusão:** não
- **Dependências:** nenhuma
- **Momento narrativo:** Resolução: o último papelzinho.
- **Informação revelada:** Quarto dígito do código do cofre.
- **Próxima pista:** Abrir o cofre e ler os papéis do abrigo.

**Texto completo:**

```
Um papelzinho dobrado, com a letra do Hollow:

"Quarta parte: {digito4}"

Esta eu guardei perto do fim.
```

