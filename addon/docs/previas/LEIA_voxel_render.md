# Renderizador 3D de blocos (voxel_render.py)

Mostra o mapa como no jogo: texturas reais do Bedrock, escadas/lajes de verdade, sombra direcional, oclusão de ambiente, luz colorida de lanternas/velas/froglights com brilho, névoa e céu. Serve para julgar composição, profundidade, luz e escala.

Arquivos: `addon/tools/voxel_render.py` (renderizador), `addon/tools/dump_mapa.mjs` (gera o dump do gerador), `addon/tools/voxel_paineis_ecos.json` (câmeras das 4 áreas), `addon/tools/voxel_exemplo.py` (dump de teste mínimo).

## Uso rápido (o agente do mapa)

PY=`C:\Users\gille\vt\py\python.exe` (numpy fica em `C:\Users\gille\vt\pynum`, o script o acha sozinho; sempre `-I`).

1. Gerar o dump do mapa atual (na pasta do loader):
```
cd /c/Users/gille/vt/mock
PATH=/c/Users/gille/vt/node:$PATH node --import ./registrar.mjs C:/Users/gille/OneDrive/Desktop/BotVulpus/BotVulpus/addon/tools/dump_mapa.mjs --mapa=ecos_mapa_novo.js
```
Grava `C:\Users\gille\vt\dumps_ecos\ecos_mapa_novo.json` (use `--saida=` para outro caminho, `--sem-pale` como na prévia).

2. Folhas de contato das 4 áreas (6 vistas cada, ~6 s por área):
```
cd C:/Users/gille/OneDrive/Desktop/BotVulpus/BotVulpus/addon/tools
C:/Users/gille/vt/py/python.exe -I voxel_render.py C:/Users/gille/vt/dumps_ecos/ecos_mapa_novo.json --painel voxel_paineis_ecos.json --saida ../docs/previas/ecos3d_{area}.png
```
`--area limiar,vila` renderiza só algumas. Saída: `ecos3d_limiar.png`, `ecos3d_vila.png`, `ecos3d_arquivo.png`, `ecos3d_arena.png`.

3. Uma vista de jogador (perspectiva):
```
python -I voxel_render.py DUMP --cam 12.5,2.62,32.5 --alvo 40,3,32 --fov 75 --size 1280x720 --nevoa 0xb8b3cc:80:14 --saida img.png
```
4. Isométrica de uma caixa (recorta o que está fora; `--rot 0..3` gira; `--ymax N` tira o telhado):
```
python -I voxel_render.py DUMP --iso --alvo 120,5,30 --caixa 100,-2,5,140,30,55 --rot 1 --ymax 5 --saida iso.png
```
5. Órbita (N quadros + folha `_folha.png`): `--orbita 8 --cam 140,12,50 --alvo 120,5,30 --saida orb.png` (com `--iso` gira a isométrica).

## Opções

- `--nevoa COR:FIM[:INICIO]` (ex. `0xE8D9B0:120:30`; início padrão = 25% do fim). `--ceu COR` (alto do céu; padrão = cor da névoa).
- `--ambiente 0..1` (luz mínima, 0.28), `--sol 0..1` (luz do céu, 0.8; use 0 no subsolo/noite), `--luz-ceu COR`, `--ao 0..1`, `--brilho` (halo das luzes), `--gama`.
- `--tinta-grama`, `--tinta-folhas`, `--agua` (cores fixas, bioma pálido por padrão), `--folhas-vazadas` (folhas com buracos).
- `--ss 2` suaviza (4x mais lento). `--size LxA`. `--verbose`.
- `--texturas PASTA` (ou variável `VOXEL_TEXTURAS`): padrão `C:\Users\gille\vt\vanilla_blocos\repo\resource_pack`.
- Câmera por yaw/pitch (só no painel JSON): `"yaw"` 0 = leste (+x), 90 = sul (+z), 270 = norte; `"pitch"` > 0 olha para baixo, como no jogo.

### Painel JSON (`voxel_paineis_ecos.json`)
`{"global": {...}, "areas": {"nome": {"nevoa": "...", "ambiente": .3, "sol": .75, "vistas": [ {...}, ... ]}}}`.
Cada vista aceita as mesmas chaves do CLI: `nome`, `cam` + (`alvo` ou `yaw`/`pitch`), `fov`, `iso`, `caixa_mundo` [x1,y1,z1,x2,y2,z2] (recorta e enquadra), `ymax`, `rot`, `elev`, `zoom`, `nevoa`, `ceu`, `ambiente`, `sol`, `brilho`, `ss`. Chaves da área valem para todas as vistas dela; `tile` ("640x360") e `colunas` em `global`. Copie o arquivo e ajuste as câmeras para a obra que está revisando (coordenadas = as do gerador).

## Formato do dump (vulpus-voxel-1)
```
{"formato":"vulpus-voxel-1",
 "paleta":["minecraft:stone_bricks", "minecraft:oak_stairs|{\"weirdo_direction\":0,\"upside_down_bit\":false}", "minecraft:lantern|{\"hanging\":true}"],
 "blocos":[[x,y,z,idx], [x1,y,z,x2,y,z,idx]]}
```
Blocos com 4 números = um bloco; com 7 = caixa preenchida (x1,y1,z1,x2,y2,z2). Entradas depois sobrescrevem as antes; `minecraft:air` apaga. Também vale uma lista simples `[{"x":0,"y":0,"z":0,"id":"minecraft:stone","estados":{...}}]` (ou `{"blocos":[...]}`). Paleta aceita `"id"`, `"id|{json}"`, `"id[estado=valor,...]"` ou `{"id":..,"estados":{..}}`. Exemplo pronto: `python -I voxel_exemplo.py saida.json`.

## O que faz
- Ray-marching em numpy (DDA de voxels): perspectiva e isométrica verdadeiras, z-buffer exato, transparência por alfa (vidro, água com profundidade).
- Texturas reais (mapeamento `blocks.json` + `terrain_texture.json`, apelidos como `stone_brick` -> `stonebrick`, grama/folhas com tinta fixa, cor procedural quando falta).
- Modelos: cubos, escadas (direção, de cabeça para baixo, quinas internas/externas calculadas pela vizinhança), lajes (em cima/embaixo), muros, cercas, portões, vidraças/grades (conectam pela vizinhança), tapetes, placas finas, troncos (eixo), lanternas/tochas/velas/correntes/hastes, plantas e teias em cruz, fogo, portas/alçapões aproximados.
- Luz: luz do céu (colunas abertas) e luz de blocos colorida propagada (lanterna, soul, vela acesa por quantidade, sea lantern, froglight, glowstone, lava, fogo, crying obsidian...), suavizada; AO por vértice; brilho (bloom) nas fontes; névoa linear por fragmento.
- Velocidade: região 314x42x86 em 640x360 ~1 s por vista; 1280x720 ~2-4 s. Montar a cena (dump inteiro) leva 2-5 s.

## O que NÃO faz
- Sem sombras projetadas do sol, sem reflexos, sem animação (primeiro quadro de água/fogo).
- Portas, alçapões, camas, baús, sinos, bandeiras etc. são aproximações (caixas finas/cubos); texturas de blocos de geometria própria (lanterna, vela) são sprites em cruz, não o modelo real.
- Blocos de pacote próprio (namespace `vulpus:`) viram cubo com a textura de `vulpus_rp` se existir, senão cor procedural. Terreno fora do dump não existe (céu/névoa).
- Cores são aproximadas: o jogo aplica sua própria curva de luz e névoa; use como julgamento de composição, não de cor exata.

## Texturas
Baixadas de `github.com/Mojang/bedrock-samples` (clone `--depth 1 --filter=blob:none --sparse`, só `resource_pack/textures/blocks`, `terrain_texture.json`, `blocks.json`) em `C:\Users\gille\vt\vanilla_blocos\repo\resource_pack` (fora do repositório; só PNG/TGA/JSON são lidos). Para renovar: `git -C C:/Users/gille/vt/vanilla_blocos/repo pull` (com `MSYS_NO_PATHCONV=1` ao usar `sparse-checkout set --no-cone /resource_pack/...`).
