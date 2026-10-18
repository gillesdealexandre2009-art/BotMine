# Dungeon 1º andar: salas e conexões

Coordenadas do INTERIOR: x (esquerda→direita, 0-149) e z (cima→baixo, 0-149); canto superior esquerdo + tamanho.

| Nº | Sala | Canto (x, z) | Largura×Comprimento | Tipo |
|---|---|---|---|---|
| 1 | Entrada Norte - Desembarque | (68, 1) até (82, 15) | 15×15 | entrada |
| 2 | Entrada Leste - Recepção subterrânea | (136, 70) até (148, 80) | 13×11 | entrada |
| 3 | Entrada Sul - Salão de entrada | (66, 132) até (84, 148) | 19×17 | entrada |
| 4 | Entrada Oeste - Galeria inicial | (1, 69) até (15, 81) | 15×13 | entrada |
| 5 | Câmara de saque | (2, 5) até (12, 15) | 11×11 | opcional/recompensa |
| 6 | Sala de armadilhas | (40, 3) até (54, 17) | 15×15 | comum |
| 7 | Distribuidor de corredores | (118, 14) até (130, 26) | 13×13 | comum |
| 8 | Galeria dos pilares | (17, 24) até (29, 40) | 13×17 | comum |
| 9 | Arquivo esquecido | (41, 26) até (51, 38) | 11×13 | comum |
| 10 | Catacumbas | (17, 48) até (31, 66) | 15×19 | comum |
| 11 | Câmara de combate | (127, 33) até (143, 49) | 17×17 | comum |
| 12 | Cofre secundário | (98, 19) até (108, 29) | 11×11 | opcional/recompensa |
| 13 | Salão central | (65, 82) até (85, 102) | 21×21 | comum |
| 14 | Câmara da chave | (134, 17) até (142, 25) | 9×9 | chave |
| 15 | Tesouro escondido | (2, 52) até (12, 62) | 11×11 | secreta |
| 16 | Sala de desafio | (97, 33) até (111, 47) | 15×15 | comum |
| 17 | Antecâmara do guardião | (70, 66) até (80, 78) | 11×13 | comum |
| 18 | Arena do boss | (63, 38) até (87, 62) | 25×25 | boss |
| 19 | Oficina abandonada | (28, 69) até (40, 81) | 13×13 | comum |
| 20 | Galeria sul | (26, 90) até (40, 100) | 15×11 | comum |
| 21 | Cripta lateral | (2, 91) até (12, 101) | 11×11 | opcional/recompensa |
| 22 | Câmara oculta | (126, 134) até (136, 144) | 11×11 | secreta |
| 23 | Salão da guarda | (101, 133) até (115, 145) | 15×13 | comum |
| 24 | Sala das correntes | (101, 107) até (113, 119) | 13×13 | comum |
| 25 | Prisão esquecida | (2, 121) até (14, 133) | 13×13 | comum |
| 26 | Depósito inundado | (24, 121) até (38, 133) | 15×13 | comum |

## Corredores (centro e largura)

- horizontal de x=55 a x=67, centro z=8, largura 5
- vertical de z=18 a z=25, centro x=47, largura 5
- horizontal de x=30 a x=40, centro z=32, largura 5
- vertical de z=41 a z=47, centro x=23, largura 5
- horizontal de x=32 a x=53, centro z=57, largura 5
- vertical de z=35 a z=88, centro x=56, largura 5
- horizontal de x=59 a x=64, centro z=86, largura 5
- horizontal de x=52 a x=53, centro z=36, largura 3
- vertical de z=16 a z=32, centro x=7, largura 3
- horizontal de x=6 a x=16, centro z=32, largura 3
- horizontal de x=13 a x=16, centro z=57, largura 3 (secreto)
- horizontal de x=16 a x=27, centro z=75, largura 5
- vertical de z=82 a z=89, centro x=34, largura 5
- horizontal de x=41 a x=64, centro z=95, largura 5
- vertical de z=82 a z=90, centro x=7, largura 3
- horizontal de x=13 a x=25, centro z=97, largura 3
- vertical de z=102 a z=120, centro x=7, largura 3
- horizontal de x=15 a x=23, centro z=127, largura 3
- vertical de z=101 a z=120, centro x=31, largura 3
- horizontal de x=85 a x=100, centro z=139, largura 5
- vertical de z=120 a z=132, centro x=107, largura 3
- horizontal de x=80 a x=100, centro z=109, largura 5
- vertical de z=103 a z=111, centro x=81, largura 5
- horizontal de x=116 a x=125, centro z=139, largura 3 (secreto)
- vertical de z=50 a z=69, centro x=141, largura 5
- horizontal de x=112 a x=126, centro z=41, largura 5
- vertical de z=48 a z=93, centro x=103, largura 5
- horizontal de x=86 a x=105, centro z=91, largura 5
- vertical de z=30 a z=32, centro x=103, largura 3
- horizontal de x=109 a x=117, centro z=23, largura 3
- vertical de z=27 a z=32, centro x=129, largura 3
- horizontal de x=131 a x=133, centro z=21, largura 3
- vertical de z=79 a z=81, centro x=74, largura 3 (CADEADO: exige a chave da sala 14)
- vertical de z=63 a z=65, centro x=74, largura 3

## Entradas externas (3 blocos)

- Norte: (74, 0) até (76, 0)
- Leste: (149, 74) até (149, 76)
- Sul: (74, 149) até (76, 149)
- Oeste: (0, 74) até (0, 76)

## Rotas

- Norte: 1 → 6 → 9 → 8 → 10 → corredor oeste → 13 (ramais: 5, secreta 15, retorno 9↔corredor)
- Oeste: 4 → 19 → 20 → 13 (ramais: 21 com retorno a 20; 25 → 26 com retorno a 20)
- Sul: 3 → 23 → 24 → 13 (ramal secreto: 22)
- Leste: 2 → 11 → 16 → 13 (ramais: 7 e 12 com retorno a 11/16; 14 = chave)
- Final: 13 → (cadeado) → 17 → 18
