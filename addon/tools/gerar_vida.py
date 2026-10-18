#!/usr/bin/env python3
"""Gera as criaturas animadas de decoração (vulpus:vida): caranguejo, cardume de carpas, vaga-lumes, sapo, lírio d'água,
lanterna flutuante, gaivotas e flor dourada, mais props dreamcore, pets, máquina de cápsulas, portais e o acervo de pets 44 a 80
(arquétipos _quad, _ave, _dragao, _raposa...). Uma entidade só; a propriedade vulpus:modelo escolhe qual aparece.

Uso, a partir da pasta addon/:
    python tools/gerar_vida.py

Saída:
- vulpus_rp/textures/vulpus/entidades/vida.png (16x16): paleta de 1 pixel por cor (ver PALETA, 16 por linha).
- vulpus_rp/models/entity/vida.geo.json: um grupo de ossos por modelo, todos com o prefixo "m<i>_" (o render controller
  mostra só o grupo do modelo escolhido).
- vulpus_rp/animations/vida.animation.json: uma animação por modelo (Molang com query.life_time, em segundos).
- vulpus_rp/render_controllers/vida.render_controllers.json: normal e "brilho" (sem luz do mundo, para vaga-lumes e lanterna).
- vulpus_rp/entity/vida.entity.json e vulpus_bp/entities/vida.json.
- NOMES_VIVOS: (id, nome no painel) de cada modelo, na ordem de vulpus:modelo; o gerar_props.py anexa isso à lista da Varinha.
Unidades: pixels (16 = 1 bloco), origem nos pés da entidade, a frente é o lado norte (-Z).
Rotação y positiva no Bedrock gira no sentido horário visto de cima; se um dia o cardume nadar de ré, troque ORBITA_HORARIA.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"

# (id do osso, nome no painel); a ordem é a de vulpus:modelo
NOMES_VIVOS = [
    ("caranguejo", "Caranguejo vermelho (animado)"),
    ("cardume", "Cardume de carpas nadando (animado)"),
    ("vagalumes", "Bando de vaga-lumes (animado)"),
    ("sapo", "Sapo que respira e pisca (animado)"),
    ("lirio", "Lírio d'água com flor (animado)"),
    ("lanterna", "Lanterna de papel flutuante (animada)"),
    ("gaivota", "Gaivota pousada (animada)"),
    ("gaivotas", "Gaivotas voando em círculo (animadas)"),
    ("flor", "Flor dourada (brilha ao chegar perto)"),
    # props de lembrança (dreamcore): novos modelos sempre no fim, os índices já postos no mundo não mudam
    ("balao_rosa", "Balão flutuante rosa (dreamcore)"),
    ("balao_azul", "Balão flutuante azul-céu (dreamcore)"),
    ("balao_creme", "Balão flutuante amarelo-creme (dreamcore)"),
    ("tv_estatica", "TV de tubo com estática (dreamcore)"),
    ("urso", "Ursinho de pelúcia sentado (dreamcore)"),
    ("telefone", "Telefone de disco fora do gancho (dreamcore)"),
    ("cadeira", "Cadeira de escritório vazia, girando (dreamcore)"),
    ("abajur", "Abajur de chão aceso (dreamcore)"),
    ("pato", "Patinho de borracha (dreamcore)"),
    ("carrossel", "Carrossel de brinquedo girando (dreamcore)"),
    ("raposa_branca", "Raposa branca da Yuki (animada)"),
    ("pet_mel", "Pet: Raposinha-Mel"),
    ("pet_sapinho", "Pet: Sapinho Verde"),
    ("pet_pintinho", "Pet: Pintinho Brilhante"),
    ("pet_coruja", "Pet: Coruja Atenta"),
    ("pet_carpa", "Pet: Carpa-Nuvem"),
    ("pet_komainu", "Pet: Komainu Mini"),
    ("pet_trevo", "Pet: Raposa-Trevo"),
    ("pet_nove", "Pet: Nove-Caudinhas"),
    ("capsula", "Máquina de cápsulas de pet"),
    ("bola_comum", "Cápsula de pet: bola comum"),
    ("bola_incomum", "Cápsula de pet: bola incomum"),
    ("bola_raro", "Cápsula de pet: bola rara"),
    ("bola_lendario", "Cápsula de pet: bola lendária"),
    ("capsula_ativa", "Máquina de cápsulas girando"),
    ("pet_coelho", "Pet: Coelhinho-Lunar"),
    ("pet_cogumelo", "Pet: Cogumelo Sonhador"),
    ("pet_vagalume", "Pet: Vaga-lume Amigo"),
    ("pet_lontra", "Pet: Lontra Pescadora"),
    ("pet_salamandra", "Pet: Salamandra-Brasa"),
    ("pet_dragao", "Pet: Dragãozinho de Jade"),
    ("pet_espirito", "Pet: Espírito Azul"),
    ("pet_fenix", "Pet: Fênix de Brasa"),
    ("portal_mg", "Portal dos minigames"),
    ("portal_saida", "Portal de saída dos minigames"),
    # acervo de pets (44 a 80): novos modelos sempre no fim
    ("pet_gato", "Pet: Gatinho-Novelo"),
    ("pet_pinguim", "Pet: Pinguim Desajeitado"),
    ("pet_joaninha", "Pet: Joaninha Pontilhada"),
    ("pet_slime", "Pet: Geleiazinha"),
    ("pet_nuvem", "Pet: Nuvenzinha"),
    ("pet_ourico", "Pet: Ouriço de Castanha"),
    ("pet_caracol", "Pet: Caracol-Doce"),
    ("pet_pomba", "Pet: Pombinha-Paz"),
    ("pet_panda", "Pet: Panda Sonolento"),
    ("pet_lobo", "Pet: Lobinho-Prata"),
    ("pet_borboleta", "Pet: Borboleta-Lua"),
    ("pet_abelha", "Pet: Abelha-Rainha Mini"),
    ("pet_tartaruga", "Pet: Tartaruga-Musgo"),
    ("pet_flamingo", "Pet: Flamingo Rosado"),
    ("pet_ratinho", "Pet: Ratinho-Queijo"),
    ("pet_tigre", "Pet: Tigrinho-Trovão"),
    ("pet_unicornio", "Pet: Unicórnio-Pastel"),
    ("pet_medusa", "Pet: Medusa-Estrela"),
    ("pet_golem", "Pet: Golem de Cristal"),
    ("pet_yeti", "Pet: Yeti Fofinho"),
    ("pet_raposa_neve", "Pet: Raposa-das-Neves"),
    ("pet_tanuki", "Pet: Tanuki Sorridente"),
    ("pet_kirin", "Pet: Kirin Celeste"),
    ("pet_grifo", "Pet: Grifo Dourado"),
    ("pet_sakura", "Pet: Raposa-Sakura"),
    ("pet_cerbero", "Pet: Cérbero Pequenino"),
    ("pet_tempestade", "Pet: Dragão da Tempestade"),
    ("pet_leviata", "Pet: Leviatã Mini"),
    ("pet_eclipse", "Pet: Lobo-Eclipse"),
    ("pet_anjo", "Pet: Anjo Guardião"),
    ("pet_pavao", "Pet: Pavão-Aurora"),
    ("pet_kitsune_celeste", "Pet: Kitsune Celestial"),
    ("pet_vulpus", "Pet: Vulpus Eterna"),
    ("pet_infinito", "Pet: Dragão do Infinito"),
    ("bola_insano", "Cápsula de pet: bola insana"),
    ("bola_divino", "Cápsula de pet: bola divina"),
    ("bola_absoluto", "Cápsula de pet: bola absoluta"),
]
M_RAPOSA_BRANCA = 19
M_PET0 = 20
M_CAPSULA = 28
M_BOLA0 = 29
M_CAPSULA_ATIVA = 33
M_PET1 = 34
M_PORTAL = 42
# posição de cada modelo novo em NOMES_VIVOS (vulpus:modelo da entidade vida)
M_BALAO_ROSA, M_BALAO_AZUL, M_BALAO_CREME, M_TV, M_URSO, M_TELEFONE, M_CADEIRA, M_ABAJUR, M_PATO, M_CARROSSEL = range(9, 19)
M_GATO, M_PINGUIM, M_JOANINHA, M_SLIME, M_NUVEM, M_OURICO, M_CARACOL, M_POMBA, M_PANDA, M_LOBO, M_BORBOLETA, M_ABELHA, M_TARTARUGA, M_FLAMINGO, M_RATINHO = range(44, 59)
M_TIGRE, M_UNICORNIO, M_MEDUSA, M_GOLEM, M_YETI, M_RAPOSA_NEVE, M_TANUKI, M_KIRIN, M_GRIFO, M_SAKURA, M_CERBERO, M_TEMPESTADE, M_LEVIATA, M_ECLIPSE = range(59, 73)
M_ANJO, M_PAVAO, M_KITSUNE_CEL, M_VULPUS, M_INFINITO, M_BOLA_INSANO, M_BOLA_DIVINO, M_BOLA_ABSOLUTO = range(73, 81)
BRILHANTES = (2, 5)  # modelos que ignoram a luz do mundo (vaga-lumes e lanterna)
HALOS = (8, M_TV, M_ABAJUR, 36, 38, 40, 41, 42, 43, M_TIGRE, M_MEDUSA, M_GOLEM, M_KIRIN, M_CERBERO, M_TEMPESTADE, M_LEVIATA, M_ECLIPSE, M_ANJO, M_PAVAO, M_KITSUNE_CEL, M_VULPUS, M_INFINITO, M_BOLA_INSANO, M_BOLA_DIVINO, M_BOLA_ABSOLUTO)  # modelos com ossos "h<i>_*" que brilham (render controller à parte); o resto do modelo usa a luz do mundo
ORBITA_HORARIA = True  # rotação y positiva = horário visto de cima (convenção do Bedrock)

PALETA = {
    "preto": (30, 26, 34, 255),
    "branco": (250, 250, 250, 255),
    "cr_verm": (212, 52, 36, 255),
    "cr_esc": (150, 34, 28, 255),
    "cr_claro": (240, 110, 80, 255),
    "laranja": (245, 130, 40, 255),
    "laranja_esc": (205, 90, 25, 255),
    "creme": (255, 236, 205, 255),
    "ouro": (255, 200, 60, 255),
    "ouro_esc": (210, 150, 30, 255),
    "ouro_claro": (255, 232, 150, 255),
    "vaga": (255, 250, 170, 255),
    "vaga_nucleo": (255, 255, 228, 255),
    "sapo": (96, 170, 70, 255),
    "sapo_esc": (60, 120, 50, 255),
    "barriga": (205, 228, 150, 255),
    "folha": (70, 140, 70, 255),
    "folha_esc": (45, 100, 55, 255),
    "rosa": (245, 150, 175, 255),
    "rosa_claro": (255, 208, 222, 255),
    "madeira_clara": (168, 118, 74, 255),
    "madeira_esc": (80, 50, 32, 255),
    "ferrugem": (170, 70, 25, 255),
    "cinza": (150, 155, 165, 255),
    "cinza_claro": (206, 211, 219, 255),
    "bico": (250, 170, 40, 255),
    "pe": (240, 130, 60, 255),
    "pedra": (120, 120, 130, 255),
    # dreamcore: pastéis dessaturados (só acrescentar ao fim: os índices acima já estão em uso)
    "balao_rosa": (243, 176, 200, 255),
    "balao_rosa_luz": (255, 218, 232, 255),
    "balao_azul": (166, 203, 240, 255),
    "balao_azul_luz": (214, 233, 253, 255),
    "balao_creme": (250, 234, 168, 255),
    "balao_creme_luz": (255, 248, 214, 255),
    "fio": (226, 226, 236, 255),
    "tv_bege": (224, 210, 178, 255),
    "tv_bege_esc": (176, 162, 132, 255),
    "tv_tela": (148, 168, 184, 255),
    "tv_tela_esc": (104, 122, 138, 255),
    "tv_miolo": (186, 206, 220, 255),
    "tv_ruido_claro": (232, 238, 243, 255),
    "tv_ruido_esc": (62, 72, 86, 255),
    "urso": (224, 198, 162, 255),
    "urso_esc": (190, 160, 124, 255),
    "urso_focinho": (242, 226, 200, 255),
    "marrom": (98, 72, 60, 255),
    "botao": (84, 90, 112, 255),
    "tel_creme": (250, 238, 208, 255),
    "tel_esc": (212, 194, 158, 255),
    "cadeira": (130, 152, 174, 255),
    "cadeira_esc": (92, 112, 134, 255),
    "abajur_pe": (190, 172, 142, 255),
    "abajur_luz": (255, 244, 214, 255),
    "abajur_luz_esc": (250, 226, 176, 255),
    "pato": (250, 228, 132, 255),
    "pato_esc": (232, 198, 98, 255),
    "pato_bico": (246, 172, 112, 255),
    # pets e máquina de cápsulas
    "vidro": (200, 232, 248, 255),
    "vidro_esc": (140, 190, 222, 255),
    "bola_roxa": (170, 110, 230, 255),
    "bola_verde": (110, 220, 140, 255),
    "mel": (240, 170, 50, 255),
    "pintinho": (255, 226, 90, 255),
    "coruja": (150, 108, 76, 255),
    "coruja_cl": (214, 186, 146, 255),
    "carpa": (255, 128, 50, 255),
    "carpa_br": (250, 242, 232, 255),
    "trevo": (80, 200, 90, 255),
    "pedra_cl": (176, 178, 188, 255),
    "nc_1": (255, 90, 90, 255),
    "nc_2": (255, 170, 60, 255),
    "nc_3": (255, 235, 90, 255),
    "nc_4": (120, 220, 100, 255),
    "nc_5": (80, 205, 205, 255),
    "nc_6": (90, 150, 255, 255),
    "nc_7": (160, 110, 255, 255),
    "nc_8": (235, 120, 225, 255),
    # pets, segunda leva
    "lua": (205, 215, 255, 255),
    "lua_esc": (160, 172, 228, 255),
    "jade": (70, 190, 140, 255),
    "jade_esc": (40, 130, 100, 255),
    "azul_fogo": (90, 160, 255, 255),
    "azul_fogo_cl": (170, 215, 255, 255),
    "azul_fogo_esc": (45, 95, 215, 255),
    "lontra": (140, 98, 68, 255),
    "lontra_cl": (212, 176, 134, 255),
    "salam": (240, 112, 52, 255),
    "salam_esc": (186, 62, 32, 255),
    "salam_ponto": (255, 222, 96, 255),
    "mel_esc": (214, 140, 40, 255),
    "coruja_esc": (108, 74, 52, 255),
    "casca": (246, 241, 226, 255),
    # portal dos minigames
    "pedra_esc": (62, 62, 74, 255),
    "obs_cl": (92, 40, 150, 255),
    "vortice_a": (58, 30, 150, 255),
    "vortice_b": (130, 80, 230, 255),
    # acervo de pets (44 a 80)
    "pingu": (40, 46, 70, 255),
    "geleia": (110, 225, 120, 255),
    "geleia_cl": (190, 250, 190, 255),
    "geleia_esc": (60, 170, 90, 255),
    "nuvem_sombra": (206, 220, 240, 255),
    "castanha": (140, 92, 60, 255),
    "castanha_esc": (92, 58, 40, 255),
    "castanha_cl": (206, 156, 112, 255),
    "caracol": (236, 214, 176, 255),
    "caracol_esc": (200, 170, 130, 255),
    "lobo": (150, 158, 172, 255),
    "lobo_esc": (96, 102, 118, 255),
    "asa_az": (130, 160, 255, 255),
    "asa_li": (190, 140, 255, 255),
    "asa_br": (228, 218, 255, 255),
    "casco": (140, 98, 60, 255),
    "casco_esc": (96, 66, 44, 255),
    "musgo": (100, 150, 84, 255),
    "musgo_esc": (62, 104, 62, 255),
    "tarta": (170, 200, 120, 255),
    "flamingo": (255, 130, 170, 255),
    "flamingo_cl": (255, 190, 208, 255),
    "flamingo_esc": (220, 80, 130, 255),
    "raio": (255, 246, 90, 255),
    "raio_cl": (255, 255, 210, 255),
    "pa_1": (255, 176, 200, 255),
    "pa_2": (255, 212, 170, 255),
    "pa_3": (255, 245, 170, 255),
    "pa_4": (180, 240, 200, 255),
    "pa_5": (170, 215, 255, 255),
    "pa_6": (210, 185, 255, 255),
    "medusa": (230, 150, 255, 255),
    "medusa_cl": (250, 210, 255, 255),
    "medusa_esc": (170, 90, 220, 255),
    "cristal": (120, 230, 240, 255),
    "cristal_cl": (205, 250, 255, 255),
    "cristal_esc": (60, 160, 200, 255),
    "yeti": (214, 232, 248, 255),
    "yeti_esc": (160, 190, 220, 255),
    "tanuki": (136, 100, 76, 255),
    "tanuki_esc": (70, 52, 48, 255),
    "tanuki_cl": (226, 206, 170, 255),
    "kirin": (230, 240, 255, 255),
    "kirin_esc": (120, 150, 210, 255),
    "ciano": (80, 240, 255, 255),
    "ciano_cl": (200, 255, 255, 255),
    "ciano_esc": (30, 170, 210, 255),
    "sakura_esc": (232, 118, 158, 255),
    "sakura": (250, 160, 190, 255),
    "sakura_cl": (255, 224, 236, 255),
    "petala": (255, 200, 222, 255),
    "cerbero": (74, 56, 62, 255),
    "cerbero_esc": (40, 30, 36, 255),
    "cerbero_cl": (120, 90, 84, 255),
    "fogo_verm": (255, 70, 50, 255),
    "fogo_verm_cl": (255, 170, 90, 255),
    "tempe": (40, 60, 130, 255),
    "tempe_esc": (24, 34, 80, 255),
    "tempe_cl": (90, 120, 210, 255),
    "mar": (40, 130, 190, 255),
    "mar_esc": (24, 80, 140, 255),
    "mar_cl": (120, 210, 230, 255),
    "eclipse": (50, 40, 70, 255),
    "eclipse_esc": (26, 20, 40, 255),
    "eclipse_cl": (90, 76, 120, 255),
    "eclipse_anel": (255, 200, 100, 255),
    "eclipse_luz": (255, 242, 190, 255),
    "anjo": (255, 248, 225, 255),
    "anjo_asa": (232, 242, 255, 255),
    "pavao": (40, 170, 170, 255),
    "pavao_esc": (20, 100, 130, 255),
    "pavao_az": (50, 90, 200, 255),
    "cel": (150, 190, 255, 255),
    "cel_esc": (90, 130, 230, 255),
    "cosmo": (110, 50, 190, 255),
    "cosmo_esc": (54, 24, 110, 255),
    "cosmo_cl": (170, 120, 255, 255),
    "noite": (22, 16, 48, 255),
    "sangue": (150, 10, 24, 255),
    "sangue_cl": (230, 30, 40, 255),
    "sangue_esc": (80, 6, 16, 255),
}
INDICE = {nome: i for i, nome in enumerate(PALETA)}
FACES = ["north", "south", "east", "west", "up", "down"]


def cubo(origem: list[float], tamanho: list[float], cor: str) -> dict:
    """Cubo de uma cor só (um pixel da paleta em todas as faces)."""
    i = INDICE[cor]
    uv = {f: {"uv": [i % 16, i // 16], "uv_size": [1, 1]} for f in FACES}
    return {"origin": origem, "size": tamanho, "uv": uv}


def deslocar(cubos: list[dict], dx: float = 0, dy: float = 0, dz: float = 0) -> list[dict]:
    return [{**c, "origin": [c["origin"][0] + dx, c["origin"][1] + dy, c["origin"][2] + dz]} for c in cubos]


def espelhar_x(cubos: list[dict]) -> list[dict]:
    return [{**c, "origin": [-(c["origin"][0] + c["size"][0]), c["origin"][1], c["origin"][2]]} for c in cubos]


def espelhar_z(cubos: list[dict]) -> list[dict]:
    return [{**c, "origin": [c["origin"][0], c["origin"][1], -(c["origin"][2] + c["size"][2])]} for c in cubos]


def osso(nome: str, pivo: list[float], cubos: list[dict] | None = None, pai: str | None = None) -> dict:
    o: dict = {"name": nome, "pivot": pivo}
    if pai:
        o["parent"] = pai
    if cubos:
        o["cubes"] = cubos
    return o


def pivo_x(p: list[float]) -> list[float]:
    return [-p[0], p[1], p[2]]


# ---------------------------------------------------------------------------------- 0: caranguejo
def garra_cubos() -> tuple[list[dict], list[dict], list[dict]]:
    """Garra do lado +x: (braço e palma, dedo parado, dedo móvel)."""
    base = [cubo([4.5, 2.8, -5], [3, 2, 3], "cr_esc"), cubo([5, 2.2, -9], [4, 3.2, 4.4], "cr_verm")]
    fixo = [cubo([5, 2.8, -12.2], [1.7, 2.2, 3.4], "cr_claro")]
    movel = [cubo([7.3, 2.8, -12.2], [1.7, 2.2, 3.4], "cr_claro")]
    return base, fixo, movel


def modelo_caranguejo() -> tuple[list[dict], dict]:
    ossos = [osso("m0_raiz", [0, 0, 0])]
    corpo = [
        cubo([-5, 2.5, -3.5], [10, 3.5, 7], "cr_verm"),
        cubo([-4.5, 6, -3], [9, 1, 6], "cr_claro"),
        cubo([-1.5, 3.2, -3.7], [3, 1, 0.3], "cr_esc"),
        cubo([-2.6, 7, -1.5], [1.2, 0.3, 1.2], "cr_esc"),
        cubo([1.4, 7, 0.5], [1.2, 0.3, 1.2], "cr_esc"),
    ]
    ossos.append(osso("m0_corpo", [0, 0, 0], corpo, "m0_raiz"))
    anim: dict = {"m0_raiz": {"position": ["math.sin(query.life_time * 55) * 3", "math.sin(query.life_time * 200) * 0.4", 0]}}
    for lado, sinal in (("e", 1), ("d", -1)):
        fase = 0 if sinal == 1 else 70
        # olhos nos talos
        olho = [
            cubo([1.5, 6, -3], [1, 2.5, 1], "cr_esc"),
            cubo([1.2, 8.3, -3.6], [1.6, 1.6, 1.6], "branco"),
            cubo([1.5, 8.6, -4.0], [1, 1, 0.5], "preto"),
        ]
        if sinal == -1:
            olho = espelhar_x(olho)
        ossos.append(osso(f"m0_olho_{lado}", [sinal * 2, 6, -2.5], olho, "m0_raiz"))
        anim[f"m0_olho_{lado}"] = {
            "rotation": [f"math.sin(query.life_time * 260 + {fase}) * 14", f"math.sin(query.life_time * 170 + {fase}) * 20", 0],
            "position": [0, f"math.sin(query.life_time * 300 + {fase}) * 0.5", 0],
        }
        # garra: braço, palma e dois dedos (o de fora abre e fecha)
        base, fixo, movel = garra_cubos()
        if sinal == -1:
            base, fixo, movel = espelhar_x(base), espelhar_x(fixo), espelhar_x(movel)
        ossos.append(osso(f"m0_garra_{lado}", [sinal * 5, 4, -4], base + fixo, "m0_raiz"))
        ossos.append(osso(f"m0_dedo_{lado}", [sinal * 8.15, 3.9, -9], movel, f"m0_garra_{lado}"))
        anim[f"m0_garra_{lado}"] = {
            "rotation": [f"math.sin(query.life_time * 150 + {fase}) * 9", f"math.sin(query.life_time * 110 + {fase}) * 10", f"math.sin(query.life_time * 130 + {fase}) * 6"],
        }
        anim[f"m0_dedo_{lado}"] = {"rotation": [0, f"math.sin(query.life_time * 420 + {fase}) * 18", 0]}
        # três pernas de cada lado, agitando fora de fase
        for k, z in enumerate((-1.5, 0.5, 2.5)):
            perna = [cubo([5, 2.6, z - 0.5], [3, 1, 1], "cr_esc"), cubo([7.4, 0, z - 0.5], [1, 3.6, 1], "cr_esc")]
            if sinal == -1:
                perna = espelhar_x(perna)
            nome = f"m0_perna_{lado}{k}"
            ossos.append(osso(nome, [sinal * 5, 3, z], perna, "m0_raiz"))
            f2 = k * 55 + fase
            anim[nome] = {"rotation": [f"math.sin(query.life_time * 520 + {f2}) * 10", 0, f"math.sin(query.life_time * 520 + {f2 + 90}) * 12"]}
    return ossos, {"animation.vulpus.vida.caranguejo": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 1: cardume de carpas
def carpa(cor: str, nadadeira: str, mancha: str | None) -> tuple[list[dict], list[dict]]:
    """Carpa com a cabeça para -z: (corpo, cauda)."""
    corpo = [
        cubo([-1.8, 0.5, -3], [3.6, 3.6, 7], cor),
        cubo([-1.5, 0.7, -5.5], [3, 3.2, 2.6], cor),
        cubo([-1.4, 0.45, -3], [2.8, 0.3, 6.5], "creme"),
        cubo([-2.2, 2.6, -4.9], [0.4, 0.9, 0.9], "preto"),
        cubo([1.8, 2.6, -4.9], [0.4, 0.9, 0.9], "preto"),
        cubo([-0.3, 4.1, -2], [0.6, 1.8, 4.5], nadadeira),
        cubo([-2.6, 1, -2.5], [0.8, 0.6, 1.8], nadadeira),
        cubo([1.8, 1, -2.5], [0.8, 0.6, 1.8], nadadeira),
    ]
    if mancha:
        corpo.append(cubo([-1.3, 4.1, -2.5], [2.6, 0.25, 3.5], mancha))
    cauda = [cubo([-0.3, 1, 4], [0.6, 2.8, 2.6], nadadeira), cubo([-0.3, 0.3, 6.4], [0.6, 4.2, 2.2], nadadeira)]
    return corpo, cauda


def modelo_cardume() -> tuple[list[dict], dict]:
    ossos = [osso("m1_raiz", [0, 0, 0])]
    anim: dict = {}
    # (raio em px, altura, graus por segundo com sinal, fase, cor, nadadeira, mancha)
    peixes = [
        (20, 2, 50, 0, "laranja", "laranja_esc", None),
        (30, 4, -38, 140, "branco", "laranja", "laranja"),
        (40, 1.5, 30, 250, "ouro", "ouro_esc", "ouro_esc"),
    ]
    for k, (raio, alt, vel, fase, cor, nad, mancha) in enumerate(peixes, start=1):
        sentido = 1 if vel > 0 else -1
        corpo, cauda = carpa(cor, nad, mancha)
        cabeca_em_mais_z = (sentido > 0) == ORBITA_HORARIA
        pc = [0, 2, 4]
        if cabeca_em_mais_z:
            corpo, cauda = espelhar_z(corpo), espelhar_z(cauda)
            pc = [0, 2, -4]
        corpo, cauda = deslocar(corpo, raio, alt), deslocar(cauda, raio, alt)
        ossos.append(osso(f"m1_orbita{k}", [0, 0, 0], None, "m1_raiz"))
        ossos.append(osso(f"m1_peixe{k}", [raio, alt + 2, 0], corpo, f"m1_orbita{k}"))
        ossos.append(osso(f"m1_cauda{k}", [raio + pc[0], alt + pc[1], pc[2]], cauda, f"m1_peixe{k}"))
        anim[f"m1_orbita{k}"] = {"rotation": [0, f"{fase} + query.life_time * {vel}", 0]}
        anim[f"m1_peixe{k}"] = {
            "rotation": [0, f"math.sin(query.life_time * 300 + {fase}) * 7", 0],
            "position": [0, f"math.sin(query.life_time * 90 + {fase}) * 0.6", 0],
        }
        anim[f"m1_cauda{k}"] = {"rotation": [0, f"math.sin(query.life_time * 620 + {fase}) * 24", 0]}
    return ossos, {"animation.vulpus.vida.cardume": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 2: vaga-lumes
def modelo_vagalumes() -> tuple[list[dict], dict]:
    ossos = [osso("m2_raiz", [0, 0, 0])]
    anim: dict = {}
    # (amplitudes x, y, z em px; freq. x, y, z em graus/s; fases; altura; freq. e fase do piscar)
    voos = [
        (22, 8, 18, 41, 67, 29, (0, 90, 40), 22, 170, 0),
        (18, 9, 24, 53, 37, 61, (120, 20, 200), 30, 140, 60),
        (26, 6, 14, 31, 79, 47, (240, 150, 80), 16, 200, 120),
        (14, 10, 20, 67, 43, 35, (60, 270, 10), 26, 160, 200),
        (24, 7, 26, 37, 59, 23, (180, 330, 120), 34, 120, 260),
        (16, 8, 16, 47, 71, 55, (300, 60, 300), 20, 190, 310),
    ]
    for k, (ax, ay, az, fx, fy, fz, (px, py, pz), alt, fp, pp) in enumerate(voos, start=1):
        pedacos = [cubo([-0.7, alt - 0.7, -0.7], [1.4, 1.4, 1.4], "vaga"), cubo([-0.35, alt - 0.35, -0.35], [0.7, 0.7, 0.7], "vaga_nucleo")]
        ossos.append(osso(f"m2_v{k}", [0, alt, 0], pedacos, "m2_raiz"))
        anim[f"m2_v{k}"] = {
            "position": [
                f"math.sin(query.life_time * {fx} + {px}) * {ax}",
                f"math.sin(query.life_time * {fy} + {py}) * {ay}",
                f"math.sin(query.life_time * {fz} + {pz}) * {az}",
            ],
            # pisca: de bem apagadinho (0,15) a bem aceso (1,05)
            "scale": f"0.6 + math.sin(query.life_time * {fp} + {pp}) * 0.45",
        }
    return ossos, {"animation.vulpus.vida.vagalumes": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 3: sapo
def modelo_sapo() -> tuple[list[dict], dict]:
    corpo = [
        cubo([-3.2, 0, -2], [6.4, 4, 6.5], "sapo"),
        cubo([-2.4, 0.6, -2.1], [4.8, 2.6, 0.4], "barriga"),
        cubo([-1.7, 4, 0.2], [1.6, 0.3, 1.6], "sapo_esc"),
        cubo([0.6, 4, 2.2], [1.4, 0.3, 1.4], "sapo_esc"),
        cubo([-0.6, 4, 3.6], [1.2, 0.3, 1.2], "sapo_esc"),
    ]
    cabeca = [cubo([-3, 2.8, -5], [6, 3.2, 3.5], "sapo"), cubo([-2.6, 3.4, -5.1], [5.2, 0.35, 0.2], "sapo_esc")]
    papo = [cubo([-1.8, 1.4, -5.2], [3.6, 1.6, 1.6], "barriga")]
    pernas = [
        cubo([-3.9, 0, -1.8], [1.4, 2.6, 1.4], "sapo"),
        cubo([-5, 0.4, 1.4], [2, 3, 3.6], "sapo"),
        cubo([-5.6, 0, -0.6], [2.8, 0.8, 3.2], "sapo_esc"),
    ]
    pernas += espelhar_x(pernas)
    ossos = [
        osso("m3_raiz", [0, 0, 0]),
        osso("m3_corpo", [0, 0, 0], corpo + pernas, "m3_raiz"),
        osso("m3_cabeca", [0, 3, -2], cabeca, "m3_raiz"),
        osso("m3_papo", [0, 2.2, -4.4], papo, "m3_cabeca"),
    ]
    anim: dict = {
        "m3_corpo": {"scale": [1, "1 + math.sin(query.life_time * 200) * 0.07", 1]},
        "m3_papo": {"scale": ["1 + math.sin(query.life_time * 400) * 0.18", "1 + math.sin(query.life_time * 400) * 0.25", 1]},
        "m3_cabeca": {"rotation": [f"math.sin(query.life_time * 95) * 3", 0, 0]},
    }
    for lado, sinal in (("e", 1), ("d", -1)):
        olho = [cubo([1, 5.8, -4.6], [2.2, 2.2, 2.2], "ouro"), cubo([1.6, 6.2, -4.7], [1, 1.5, 0.2], "preto")]
        lid = [cubo([0.9, 5.7, -4.7], [2.4, 2.4, 2.4], "sapo")]
        if sinal == -1:
            olho, lid = espelhar_x(olho), espelhar_x(lid)
        ossos.append(osso(f"m3_olho_{lado}", [sinal * 2.1, 6.9, -3.5], olho, "m3_cabeca"))
        ossos.append(osso(f"m3_palpebra_{lado}", [sinal * 2.1, 6.9, -3.5], lid, "m3_cabeca"))
        # a pálpebra só aparece no instante do piscar (a cada 3,2 s)
        anim[f"m3_palpebra_{lado}"] = {"scale": ["1", "math.mod(query.life_time, 3.2) > 3.05 ? 1 : 0.01", "1"]}
    return ossos, {"animation.vulpus.vida.sapo": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 4: lírio d'água
def modelo_lirio() -> tuple[list[dict], dict]:
    folha = [
        cubo([-7, 0, -4], [14, 0.8, 8], "folha"),
        cubo([-4, 0, -7], [8, 0.8, 14], "folha"),
        cubo([-6, 0, -6], [12, 0.8, 12], "folha"),
        cubo([-0.3, 0.8, -5.5], [0.6, 0.2, 5], "folha_esc"),
        cubo([-5, 0.8, -0.3], [3.5, 0.2, 0.6], "folha_esc"),
        cubo([1.5, 0.8, -0.3], [3.5, 0.2, 0.6], "folha_esc"),
        cubo([4, 0, 3], [5, 0.8, 5], "folha_esc"),
    ]
    flor = [
        cubo([-1, 0.8, -1], [2, 3.4, 2], "ouro"),
        cubo([-1.6, 0.8, -4.2], [3.2, 2.2, 3], "rosa"),
        cubo([-1.6, 0.8, 1.2], [3.2, 2.2, 3], "rosa"),
        cubo([-4.2, 0.8, -1.6], [3, 2.2, 3.2], "rosa"),
        cubo([1.2, 0.8, -1.6], [3, 2.2, 3.2], "rosa"),
        cubo([-1.2, 3, -3.4], [2.4, 2.2, 2.2], "rosa_claro"),
        cubo([-1.2, 3, 1.2], [2.4, 2.2, 2.2], "rosa_claro"),
        cubo([-3.4, 3, -1.2], [2.2, 2.2, 2.4], "rosa_claro"),
        cubo([1.2, 3, -1.2], [2.2, 2.2, 2.4], "rosa_claro"),
        cubo([-0.8, 4.2, -0.8], [1.6, 1, 1.6], "ouro_claro"),
    ]
    ossos = [
        osso("m4_raiz", [0, 0, 0]),
        osso("m4_folha", [0, 0, 0], folha, "m4_raiz"),
        osso("m4_flor", [0, 0.8, 0], flor, "m4_folha"),
    ]
    anim = {
        "m4_folha": {"position": [0, "math.sin(query.life_time * 80) * 0.25", 0], "rotation": [0, "math.sin(query.life_time * 30) * 4", 0]},
        "m4_flor": {"rotation": ["math.sin(query.life_time * 100) * 5", 0, "math.sin(query.life_time * 75 + 90) * 5"]},
    }
    return ossos, {"animation.vulpus.vida.lirio": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 5: lanterna flutuante
def modelo_lanterna() -> tuple[list[dict], dict]:
    corpo = [
        cubo([-6, 0, -6], [12, 1.2, 12], "madeira_clara"),
        cubo([-5.5, 1.2, -5.5], [11, 0.8, 11], "madeira_esc"),
        cubo([-4.5, 2, -4.5], [9, 2.5, 9], "laranja"),
        cubo([-4, 4.5, -4], [8, 7, 8], "creme"),
        cubo([-4.5, 11.5, -4.5], [9, 2, 9], "laranja"),
        cubo([-5.5, 13.5, -5.5], [11, 1.2, 11], "madeira_clara"),
        cubo([-3, 14.7, -3], [6, 1.2, 6], "madeira_esc"),
        cubo([-0.6, 15.9, -0.6], [1.2, 1.2, 1.2], "ouro"),
        cubo([-1.8, 6, -4.1], [3.6, 4, 0.2], "ouro_claro"),
        cubo([-1.8, 6, 3.9], [3.6, 4, 0.2], "ouro_claro"),
        cubo([-4.1, 6, -1.8], [0.2, 4, 3.6], "ouro_claro"),
        cubo([3.9, 6, -1.8], [0.2, 4, 3.6], "ouro_claro"),
    ]
    chama = [cubo([-1.5, 5.8, -1.5], [3, 4.4, 3], "ouro")]
    ossos = [
        osso("m5_raiz", [0, 0, 0]),
        osso("m5_corpo", [0, 1, 0], corpo, "m5_raiz"),
        osso("m5_chama", [0, 8, 0], chama, "m5_corpo"),
    ]
    anim = {
        "m5_raiz": {"position": [0, "math.sin(query.life_time * 90) * 1.3 + 1.5", 0]},
        "m5_corpo": {"rotation": ["math.sin(query.life_time * 70) * 4", "math.sin(query.life_time * 25) * 10", "math.sin(query.life_time * 85 + 60) * 4"]},
        "m5_chama": {"scale": ["0.85 + math.sin(query.life_time * 520) * 0.15", "0.9 + math.sin(query.life_time * 400 + 80) * 0.2", "0.85 + math.sin(query.life_time * 520) * 0.15"]},
    }
    return ossos, {"animation.vulpus.vida.lanterna": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 6: gaivota pousada
def modelo_gaivota() -> tuple[list[dict], dict]:
    corpo = [
        cubo([-3, 4, -3.5], [6, 5, 9], "branco"),
        cubo([-1.8, 4.5, 5.5], [3.6, 1.2, 3.4], "branco"),
        cubo([-1.8, 4.5, 8.9], [3.6, 1.2, 1], "preto"),
        cubo([-2, 0, -0.5], [0.8, 4.2, 0.8], "pe"),
        cubo([1.2, 0, -0.5], [0.8, 4.2, 0.8], "pe"),
        cubo([-2.5, 0, -1.8], [1.8, 0.5, 2.4], "pe"),
        cubo([0.7, 0, -1.8], [1.8, 0.5, 2.4], "pe"),
        cubo([-2.4, 7, -3.8], [4.8, 1.6, 2.2], "branco"),
    ]
    cabeca = [
        cubo([-2, 8.6, -5], [4, 4, 4], "branco"),
        cubo([-0.8, 9.8, -7.8], [1.6, 1.3, 2.9], "bico"),
        cubo([-0.8, 9.8, -8], [1.6, 0.5, 0.4], "cr_verm"),
        cubo([-2.1, 11, -4.1], [0.4, 0.9, 0.9], "preto"),
        cubo([1.7, 11, -4.1], [0.4, 0.9, 0.9], "preto"),
    ]
    ossos = [
        osso("m6_raiz", [0, 0, 0]),
        osso("m6_corpo", [0, 0, 0], corpo, "m6_raiz"),
        osso("m6_cabeca", [0, 9, -3], cabeca, "m6_corpo"),
    ]
    anim: dict = {
        "m6_cabeca": {"rotation": ["math.sin(query.life_time * 130) * 5", "math.clamp(math.sin(query.life_time * 47) * 2.5, -1, 1) * 62", "math.sin(query.life_time * 61) * 4"]},
        "m6_corpo": {"scale": [1, "1 + math.sin(query.life_time * 210) * 0.02", 1]},
    }
    # asas: dobradas (finas, coladas ao corpo) e abertas (abertas para o lado); cada par aparece por escala
    aberta = "math.clamp((math.sin(query.life_time * 33) - 0.72) * 5, 0, 1)"
    for lado, sinal in (("e", 1), ("d", -1)):
        dobrada = [cubo([3, 4.5, -2], [0.9, 4.5, 8], "cinza_claro"), cubo([3, 4.5, 3.8], [0.9, 3.4, 2.4], "preto")]
        aberta_c = [cubo([3, 8, -2.5], [8, 0.8, 7], "branco"), cubo([11, 8, -2], [3.4, 0.8, 5.5], "preto")]
        if sinal == -1:
            dobrada, aberta_c = espelhar_x(dobrada), espelhar_x(aberta_c)
        ossos.append(osso(f"m6_asa_dobrada_{lado}", [sinal * 3, 8.5, 0], dobrada, "m6_corpo"))
        ossos.append(osso(f"m6_asa_aberta_{lado}", [sinal * 3, 8.4, 0], aberta_c, "m6_corpo"))
        anim[f"m6_asa_dobrada_{lado}"] = {"scale": [f"1 - {aberta} * 0.99", 1, 1]}
        anim[f"m6_asa_aberta_{lado}"] = {"scale": [f"0.01 + {aberta} * 0.99", 1, 1]}
    return ossos, {"animation.vulpus.vida.gaivota": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 7: gaivotas voando
def gaivota_voando(k: float) -> tuple[list[dict], list[dict], list[dict]]:
    """Gaivota em voo com a cabeça para -z, na escala k: (corpo, asa +x, asa -x). O osso da asa fica em (±1.2k, 0.8k, 0)."""
    def e(cubos: list[dict]) -> list[dict]:
        return [{**c, "origin": [v * k for v in c["origin"]], "size": [v * k for v in c["size"]]} for c in cubos]

    corpo = e([
        cubo([-1.4, -1, -3], [2.8, 2.4, 6], "branco"),
        cubo([-1.5, 1.3, -1.5], [3, 0.3, 4], "cinza_claro"),
        cubo([-1, 0, 3], [2, 0.7, 2.6], "branco"),
        cubo([-1, 0, 5.6], [2, 0.7, 0.6], "preto"),
        cubo([-1, 0.3, -4.8], [2, 2, 2], "branco"),
        cubo([-0.4, 0.7, -6.4], [0.8, 0.7, 1.7], "bico"),
        cubo([-1.1, 1.6, -4.2], [0.2, 0.5, 0.5], "preto"),
        cubo([0.9, 1.6, -4.2], [0.2, 0.5, 0.5], "preto"),
    ])
    asa_d = e([cubo([1, 0.4, -1.5], [7, 0.5, 3.8], "branco"), cubo([8, 0.4, -1.2], [3.4, 0.5, 2.6], "preto")])
    return corpo, asa_d, espelhar_x(asa_d)


def modelo_gaivotas() -> tuple[list[dict], dict]:
    ossos = [
        osso("m7_raiz", [0, 0, 0]),
        osso("m7_marco", [0, 0, 0], [cubo([-1.5, 0, -1.5], [3, 1.6, 3], "pedra"), cubo([-0.8, 1.6, -0.8], [1.6, 1.2, 1.6], "pedra")], "m7_raiz"),
    ]
    anim: dict = {}
    k = 1.6
    # (raio, altura, graus por segundo com sinal, fase)
    bando = [(96, 124, 36, 0), (84, 140, 42, 130), (104, 112, -32, 250)]
    for i, (raio, alt, vel, fase) in enumerate(bando, start=1):
        sentido = 1 if vel > 0 else -1
        corpo, asa_d, asa_e = gaivota_voando(k)
        if (sentido > 0) == ORBITA_HORARIA:
            corpo, asa_d, asa_e = espelhar_z(corpo), espelhar_z(asa_d), espelhar_z(asa_e)
        corpo, asa_d, asa_e = deslocar(corpo, raio, alt), deslocar(asa_d, raio, alt), deslocar(asa_e, raio, alt)
        ombro = 1.2 * k
        ossos.append(osso(f"m7_orbita{i}", [0, 0, 0], None, "m7_raiz"))
        ossos.append(osso(f"m7_g{i}", [raio, alt, 0], corpo, f"m7_orbita{i}"))
        ossos.append(osso(f"m7_asa_d{i}", [raio + ombro, alt + 0.8 * k, 0], asa_d, f"m7_g{i}"))
        ossos.append(osso(f"m7_asa_e{i}", [raio - ombro, alt + 0.8 * k, 0], asa_e, f"m7_g{i}"))
        anim[f"m7_orbita{i}"] = {"rotation": [0, f"{fase} + query.life_time * {vel}", 0]}
        anim[f"m7_g{i}"] = {"position": [0, f"math.sin(query.life_time * 70 + {fase}) * 3", 0]}
        anim[f"m7_asa_d{i}"] = {"rotation": [0, 0, f"math.sin(query.life_time * 420 + {fase}) * 32"]}
        anim[f"m7_asa_e{i}"] = {"rotation": [0, 0, f"-math.sin(query.life_time * 420 + {fase}) * 32"]}
    return ossos, {"animation.vulpus.vida.gaivotas": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 8: flor dourada
def modelo_flor() -> tuple[list[dict], dict]:
    """Flor dourada (~1 bloco): caule e folhas balançam ao vento (ossos m8_*, com luz do mundo); o miolo e o halo de pontinhos
    (ossos h8_*, que o render controller do halo desenha sem luz do mundo) pulsam e giram em volta."""
    balanco = "math.sin(query.life_time * 70) * 3.5"
    balanco_z = "math.sin(query.life_time * 52 + 90) * 3"
    caule = [cubo([-0.6, 0, -0.6], [1.2, 9.6, 1.2], "folha"), cubo([-1.4, 0, -1.4], [2.8, 0.8, 2.8], "folha_esc")]
    folhas = [
        cubo([0.6, 2.4, -0.7], [3.6, 0.8, 1.4], "folha"),
        cubo([4.2, 3.0, -0.7], [1.8, 0.8, 1.4], "folha"),
        cubo([0.6, 3.2, -0.2], [2.2, 0.3, 0.4], "folha_esc"),
        cubo([-4.2, 4.6, -0.7], [3.6, 0.8, 1.4], "folha"),
        cubo([-6.0, 5.2, -0.7], [1.8, 0.8, 1.4], "folha"),
        cubo([-2.8, 4.9, -0.2], [2.2, 0.3, 0.4], "folha_esc"),
    ]
    petalas = [
        # camada de baixo: 4 pétalas grandes em cruz
        cubo([-1.6, 9.4, -5.4], [3.2, 1.2, 3.8], "ouro"),
        cubo([-1.6, 9.4, 1.6], [3.2, 1.2, 3.8], "ouro"),
        cubo([-5.4, 9.4, -1.6], [3.8, 1.2, 3.2], "ouro"),
        cubo([1.6, 9.4, -1.6], [3.8, 1.2, 3.2], "ouro"),
        cubo([-1.0, 9.5, -5.9], [2.0, 1.0, 0.6], "ouro_esc"),
        cubo([-1.0, 9.5, 5.3], [2.0, 1.0, 0.6], "ouro_esc"),
        cubo([-5.9, 9.5, -1.0], [0.6, 1.0, 2.0], "ouro_esc"),
        cubo([5.3, 9.5, -1.0], [0.6, 1.0, 2.0], "ouro_esc"),
        # camada de cima: 4 pétalas nas diagonais, mais claras e mais curtas
        cubo([1.4, 10.4, 1.4], [2.6, 1.0, 2.6], "ouro_claro"),
        cubo([-4.0, 10.4, 1.4], [2.6, 1.0, 2.6], "ouro_claro"),
        cubo([1.4, 10.4, -4.0], [2.6, 1.0, 2.6], "ouro_claro"),
        cubo([-4.0, 10.4, -4.0], [2.6, 1.0, 2.6], "ouro_claro"),
    ]
    miolo = [cubo([-1.7, 9.7, -1.7], [3.4, 1.9, 3.4], "laranja"), cubo([-1.0, 11.6, -1.0], [2.0, 0.6, 2.0], "vaga_nucleo")]
    ossos = [
        osso("m8_raiz", [0, 0, 0]),
        osso("m8_balanco", [0, 0, 0], caule + folhas + petalas, "m8_raiz"),
        osso("h8_raiz", [0, 0, 0]),
        osso("h8_miolo", [0, 10.6, 0], miolo, "h8_raiz"),
        osso("h8_halo", [0, 10.6, 0], None, "h8_raiz"),
    ]
    anim: dict = {
        "m8_balanco": {"rotation": [balanco, 0, balanco_z]},
        "h8_raiz": {"rotation": [balanco, 0, balanco_z]},
        "h8_miolo": {"scale": "1 + math.sin(query.life_time * 150) * 0.1"},
        # o halo respira: cresce e encolhe devagar, com o giro dos pontinhos
        "h8_halo": {"scale": "1 + math.sin(query.life_time * 120) * 0.2"},
    }
    # (raio, altura, fase, velocidade do giro em graus/s, fase do piscar)
    motes = [
        (5.0, 10.6, 0, 55, 0),
        (6.2, 12.4, 60, -48, 90),
        (4.4, 14.0, 130, 66, 180),
        (5.8, 9.0, 200, -60, 270),
        (4.8, 13.0, 260, 44, 45),
        (6.6, 11.2, 320, -70, 135),
    ]
    for k, (raio, alt, fase, vel, pisca) in enumerate(motes, start=1):
        ossos.append(osso(f"h8_o{k}", [0, alt, 0], None, "h8_halo"))
        ossos.append(
            osso(
                f"h8_p{k}",
                [raio, alt, 0],
                [cubo([raio - 0.7, alt - 0.7, -0.7], [1.4, 1.4, 1.4], "vaga"), cubo([raio - 0.35, alt - 0.35, -0.35], [0.7, 0.7, 0.7], "vaga_nucleo")],
                f"h8_o{k}",
            )
        )
        anim[f"h8_o{k}"] = {"rotation": [0, f"{fase} + query.life_time * {vel}", 0], "position": [0, f"math.sin(query.life_time * 90 + {fase}) * 0.8", 0]}
        anim[f"h8_p{k}"] = {"scale": f"0.65 + math.sin(query.life_time * 200 + {pisca}) * 0.4"}
    return ossos, {"animation.vulpus.vida.flor": {"loop": True, "bones": anim}}


# ================================================================== props de lembrança (dreamcore), modelos 9 a 18
def girar(c: dict, eixo: int, graus: float, pivo: list[float]) -> dict:
    """Cubo girado num eixo só (0 = x, 1 = y, 2 = z) em torno de um pivô."""
    r = [0.0, 0.0, 0.0]
    r[eixo] = graus
    return {**c, "rotation": r, "pivot": pivo}


# ---------------------------------------------------------------------------------- 9, 10, 11: balões
def modelo_balao(i: int, nome: str, cor: str, luz: str, fase: float) -> tuple[list[dict], dict]:
    """Balão oval de camadas (corpo de uns 11 px, ~1,7 bloco com o nó) com fio até o chão; o balão sobe e desce 0,3 bloco e gira
    de leve, e o fio estica junto (escala em y) para ficar sempre preso ao chão."""
    p = f"m{i}_"
    n, base, alto, raio = 9, 17.0, 11.0, 4.9
    h = alto / n
    corpo: list[dict] = []
    r_cam = []
    for k in range(n):
        t = (k + 0.5) / n * 2 - 1
        r = max(1.6, raio * (1 - t * t * 0.82) ** 0.5)
        r_cam.append(r)
        corpo.append(cubo([-r, base + k * h, -r], [2 * r, h + 0.02, 2 * r], cor))
    # brilho (reflexo) na frente, em cima e à esquerda de quem olha de frente
    k = 6
    corpo.append(cubo([0.8, base + k * h + 0.2, -r_cam[k] - 0.25], [1.6, 2.6, 0.5], luz))
    corpo.append(cubo([2.0, base + (k + 1) * h, -r_cam[k + 1] - 0.2], [1.0, 1.0, 0.4], luz))
    nozinho = [cubo([-1.2, base - 1.0, -1.2], [2.4, 1.0, 2.4], cor), cubo([-0.6, base - 1.8, -0.6], [1.2, 0.8, 1.2], cor)]
    fio_h = base - 1.8
    fio = [cubo([-0.2, 0, -0.2], [0.4, fio_h, 0.4], "fio"), cubo([-1.2, 0, -1.2], [2.4, 0.8, 2.4], "fio")]
    ossos = [
        osso(p + "raiz", [0, 0, 0]),
        osso(p + "balao", [0, base + alto / 2, 0], corpo + nozinho, p + "raiz"),
        osso(p + "fio", [0, 0, 0], fio, p + "raiz"),
    ]
    dy = f"math.sin(query.life_time * 50 + {fase}) * 4.8"
    anim = {
        p + "balao": {"position": [0, dy, 0], "rotation": [0, f"math.sin(query.life_time * 36 + {fase}) * 14", 0]},
        p + "fio": {"scale": [1, f"1 + ({dy}) / {fio_h}", 1]},
    }
    return ossos, {f"animation.vulpus.vida.{nome}": {"loop": True, "bones": anim}}


def modelo_balao_rosa() -> tuple[list[dict], dict]:
    return modelo_balao(M_BALAO_ROSA, "balao_rosa", "balao_rosa", "balao_rosa_luz", 0)


def modelo_balao_azul() -> tuple[list[dict], dict]:
    return modelo_balao(M_BALAO_AZUL, "balao_azul", "balao_azul", "balao_azul_luz", 120)


def modelo_balao_creme() -> tuple[list[dict], dict]:
    return modelo_balao(M_BALAO_CREME, "balao_creme", "balao_creme", "balao_creme_luz", 240)


# ---------------------------------------------------------------------------------- 12: TV de tubo com estática
TV_CEL = 1.15  # lado de cada cubinho da estática
TV_COLUNAS, TV_LINHAS = 6, 5
TV_X0, TV_Y0 = -4.7, 2.9  # canto da grade de estática (px)
TV_CENTRO = [-1.25, 5.8, -7.0]


def estatica(semente: int) -> list[dict]:
    """Padrão de estática: cubinhos claros e escuros espalhados pela grade da tela (sempre o mesmo para a mesma semente)."""
    import random

    rng = random.Random(semente)
    cubos = []
    for c in range(TV_COLUNAS):
        for l in range(TV_LINHAS):
            sorteio = rng.random()
            if sorteio < 0.38:
                cor = "tv_ruido_claro"
            elif sorteio < 0.62:
                cor = "tv_ruido_esc"
            else:
                continue
            cubos.append(cubo([TV_X0 + c * TV_CEL, TV_Y0 + l * TV_CEL, -7.15], [TV_CEL, TV_CEL, 0.25], cor))
    return cubos


def modelo_tv() -> tuple[list[dict], dict]:
    """TV de tubo bege (~1,3 bloco): a tela abaulada tem miolo com brilho (halo) e três padrões de estática (halo) que alternam
    a ~12 quadros por segundo por escala (o que não é a vez fica com escala 0,01)."""
    p = M_TV
    corpo = [
        cubo([-7, 0.8, -5.5], [14, 10.4, 11], "tv_bege"),
        cubo([-5.2, 1.5, 5.4], [10.4, 8, 3.2], "tv_bege_esc"),  # fundo do tubo
        cubo([-3.8, 2.8, 8.5], [7.6, 5.2, 1.4], "tv_bege_esc"),
        cubo([-6.2, 0, -4.5], [2.2, 0.8, 2.2], "tv_bege_esc"),  # pezinhos
        cubo([4, 0, -4.5], [2.2, 0.8, 2.2], "tv_bege_esc"),
        cubo([-6.2, 0, 2.5], [2.2, 0.8, 2.2], "tv_bege_esc"),
        cubo([4, 0, 2.5], [2.2, 0.8, 2.2], "tv_bege_esc"),
        # moldura e vidro abaulado (o miolo da tela fica mais à frente)
        cubo([-5.9, 1.6, -5.9], [9.8, 8, 0.4], "tv_bege_esc"),
        cubo([-5.2, 2.2, -6.2], [8.4, 6.6, 0.7], "tv_tela_esc"),
        cubo([-4.6, 2.8, -6.6], [7.2, 5.4, 0.4], "tv_tela"),
        # painel de botões
        cubo([4.4, 1.8, -5.9], [2.2, 8, 0.4], "tv_bege_esc"),
        cubo([4.7, 7.4, -6.3], [1.6, 1.6, 0.5], "cinza_claro"),
        cubo([4.7, 5.0, -6.3], [1.6, 1.6, 0.5], "cinza_claro"),
        cubo([4.8, 2.6, -6.2], [1.4, 0.3, 0.4], "tv_ruido_esc"),
        cubo([4.8, 3.3, -6.2], [1.4, 0.3, 0.4], "tv_ruido_esc"),
        # base da antena
        cubo([-1.8, 11.2, -1.5], [3.6, 1, 3], "preto"),
    ]
    antena = [
        girar(cubo([-0.25, 12.2, -0.25], [0.5, 9, 0.5], "cinza_claro"), 2, 30, [0, 12.2, 0]),
        girar(cubo([-0.25, 12.2, -0.25], [0.5, 9, 0.5], "cinza_claro"), 2, -34, [0, 12.2, 0]),
        cubo([-0.6, 11.9, -0.6], [1.2, 0.5, 1.2], "cinza"),
    ]
    miolo = [cubo([-3.6, 3.6, -6.9], [4.7, 3.8, 0.3], "tv_miolo")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_antena", [0, 12, 0], antena, f"m{p}_raiz"),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_miolo", TV_CENTRO, miolo, f"h{p}_raiz"),
    ]
    anim: dict = {
        f"m{p}_antena": {"rotation": [0, f"math.sin(query.life_time * 40) * 3", 0]},
        f"h{p}_miolo": {"scale": "1 + math.sin(query.life_time * 90) * 0.04"},
    }
    for k in range(3):
        ossos.append(osso(f"h{p}_est{k}", TV_CENTRO, estatica(7 + k * 13), f"h{p}_raiz"))
        anim[f"h{p}_est{k}"] = {"scale": f"math.mod(math.floor(query.life_time * 12), 3) == {k} ? 1 : 0.01"}
    return ossos, {"animation.vulpus.vida.tv_estatica": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 13: ursinho de pelúcia
def modelo_urso() -> tuple[list[dict], dict]:
    """Ursinho bege sentado (~0,9 bloco) com a cabeça levemente torta e só um olho de botão: onde faltava o outro sobram
    dois fios soltos. Respira devagar e a cabeça balança bem pouco."""
    p = M_URSO
    corpo = [
        cubo([-3.6, 0, -2.6], [7.2, 7.4, 5.2], "urso"),
        cubo([-2.4, 0.6, -2.9], [4.8, 4.6, 0.4], "urso_focinho"),  # barriga
        cubo([-4.9, 0, -7], [3.6, 3, 5.2], "urso"),  # pernas esticadas
        cubo([1.3, 0, -7], [3.6, 3, 5.2], "urso"),
        cubo([-4.5, 0.3, -7.5], [2.8, 2.4, 0.6], "urso_focinho"),  # solas
        cubo([1.7, 0.3, -7.5], [2.8, 2.4, 0.6], "urso_focinho"),
        cubo([-5.9, 2.6, -2.2], [2.2, 4.6, 2.6], "urso"),  # braços
        cubo([3.7, 2.6, -2.2], [2.2, 4.6, 2.6], "urso"),
    ]
    cabeca = [
        cubo([-3.6, 7.2, -3.4], [7.2, 6, 6.4], "urso"),
        cubo([-3.9, 12.2, -2.6], [2.6, 2.4, 1.6], "urso"),  # orelhas
        cubo([1.3, 12.2, -2.6], [2.6, 2.4, 1.6], "urso"),
        cubo([-3.3, 12.2, -3.0], [1.4, 1.4, 0.4], "urso_esc"),
        cubo([1.9, 12.2, -3.0], [1.4, 1.4, 0.4], "urso_esc"),
        cubo([-1.7, 7.8, -4.8], [3.4, 2.6, 1.5], "urso_focinho"),  # focinho
        cubo([-0.8, 9.4, -5.2], [1.6, 1.1, 0.5], "marrom"),  # nariz
        cubo([1.2, 10.8, -3.8], [1.5, 1.5, 0.5], "botao"),  # único olho de botão (lado esquerdo de quem olha de frente)
        cubo([1.6, 11.2, -4.0], [0.5, 0.5, 0.3], "branco"),
        cubo([-2.7, 10.6, -3.7], [1.5, 1.5, 0.3], "urso_esc"),  # remendo onde caiu o outro botão
        cubo([-2.3, 9.4, -3.9], [0.25, 1.4, 0.25], "marrom"),  # fios soltos
        cubo([-1.9, 9.7, -3.9], [0.25, 1.1, 0.25], "marrom"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 7.2, 0], cabeca, f"m{p}_corpo"),
    ]
    anim = {
        f"m{p}_corpo": {"scale": [1, "1 + math.sin(query.life_time * 120) * 0.02", 1]},
        f"m{p}_cabeca": {"rotation": [0, "math.sin(query.life_time * 40) * 3", "7 + math.sin(query.life_time * 55) * 1.5"]},
    }
    return ossos, {"animation.vulpus.vida.urso": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 14: telefone de disco
def modelo_telefone() -> tuple[list[dict], dict]:
    """Telefone creme de disco com o fone fora do gancho, largado ao lado, preso pelo fio (que balança de leve)."""
    p = M_TELEFONE
    dx = -3.5
    base = [
        cubo([-4.6, 0, -4], [9.2, 3.4, 8], "tel_creme"),
        cubo([-4, 3.4, -3.4], [8, 1.6, 6.8], "tel_creme"),
        cubo([-3, 5, -2.6], [6, 0.4, 5.2], "tel_creme"),
        cubo([-4.8, 0, -4.2], [9.6, 0.8, 8.4], "tel_esc"),  # rodapé
        cubo([-2.6, 5.2, -2.4], [5.2, 0.5, 5.2], "tel_esc"),  # disco
        cubo([-0.8, 5.7, -0.6], [1.6, 0.4, 1.6], "tel_creme"),  # centro do disco
        # buraquinhos do disco
        *[
            cubo([2.0 * math.sin(math.radians(a)) - 0.35, 5.7, -2.0 * math.cos(math.radians(a)) - 0.35], [0.7, 0.3, 0.7], "marrom")
            for a in (-60, -20, 20, 60, 100, 140, 180, 220)
        ],
        # gancho vazio
        cubo([-3.4, 5, 2.2], [1.0, 2.2, 1.0], "tel_esc"),
        cubo([2.4, 5, 2.2], [1.0, 2.2, 1.0], "tel_esc"),
    ]
    fone = [
        cubo([6.5, 0, -2.5], [2.2, 1.8, 5.2], "tel_creme"),  # cabo do fone, deitado no chão
        cubo([6.1, 0, -5.4], [3.0, 2.8, 3.0], "tel_creme"),  # bocal
        cubo([6.1, 0, 2.8], [3.0, 2.8, 3.0], "tel_creme"),  # auricular
        cubo([6.3, 0.2, -5.7], [2.6, 2.4, 0.4], "tel_esc"),
        cubo([6.3, 0.2, 5.8], [2.6, 2.4, 0.4], "tel_esc"),
    ]
    fio = [cubo([4.4 + 0.5 * k, 0.4 + 0.6 * (k % 2), -0.4 + 0.5 * (k % 2) - 0.3], [1.1, 0.5, 0.5], "marrom") for k in range(5)]
    fio += [cubo([6.4, 0.5, -0.3], [0.8, 0.5, 0.5], "marrom")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_base", [0, 0, 0], deslocar(base, dx), f"m{p}_raiz"),
        osso(f"m{p}_fone", [0, 0, 0], deslocar(fone, dx), f"m{p}_raiz"),
        osso(f"m{p}_fio", [4.4 + dx, 0.5, 0], deslocar(fio, dx), f"m{p}_raiz"),
    ]
    anim = {f"m{p}_fio": {"rotation": [0, "math.sin(query.life_time * 70) * 5", 0]}}
    return ossos, {"animation.vulpus.vida.telefone": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 15: cadeira de escritório
def modelo_cadeira() -> tuple[list[dict], dict]:
    """Cadeira de escritório azul acinzentada, vazia, em que o assento e o encosto giram sozinhos bem devagar sobre a base."""
    p = M_CADEIRA
    base = [
        cubo([-0.9, 2.2, -0.9], [1.8, 5.2, 1.8], "cinza_claro"),
        cubo([-1.4, 1.6, -1.4], [2.8, 0.8, 2.8], "cinza"),
    ]
    for ang in (0, 72, 144, 216, 288):
        base.append(girar(cubo([-0.6, 1.0, -6.2], [1.2, 0.9, 6.2], "cinza"), 1, ang, [0, 0, 0]))
        base.append(girar(cubo([-1.0, 0, -6.6], [2.0, 1.6, 1.8], "preto"), 1, ang, [0, 0, 0]))
    giro = [
        cubo([-5.4, 7.4, -5.4], [10.8, 1.2, 10.8], "cadeira_esc"),
        cubo([-5.8, 8.6, -5.6], [11.6, 2.4, 11.2], "cadeira"),
        cubo([-0.8, 7.0, 3.6], [1.6, 4.4, 1.0], "cinza"),  # haste do encosto
        cubo([-4.8, 11.4, 4.2], [9.6, 8.6, 2.2], "cadeira"),
        cubo([-4.4, 11.8, 3.9], [8.8, 7.8, 0.4], "cadeira_esc"),
        cubo([-6.8, 11.6, -3.4], [1.0, 0.8, 6.8], "cinza"),  # braços
        cubo([5.8, 11.6, -3.4], [1.0, 0.8, 6.8], "cinza"),
        cubo([-6.6, 8.6, 0.8], [0.6, 3.0, 0.6], "cinza"),
        cubo([6.0, 8.6, 0.8], [0.6, 3.0, 0.6], "cinza"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_base", [0, 0, 0], base, f"m{p}_raiz"),
        osso(f"m{p}_giro", [0, 8, 0], giro, f"m{p}_raiz"),
    ]
    anim = {f"m{p}_giro": {"rotation": [0, "query.life_time * 14", 0]}}
    return ossos, {"animation.vulpus.vida.cadeira": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 16: abajur de chão
def modelo_abajur() -> tuple[list[dict], dict]:
    """Abajur de chão: pé fino de ~1,2 bloco e cúpula creme em degraus que brilha (halo) e pulsa como uma luz piscando longe."""
    p = M_ABAJUR
    pe = [
        cubo([-3.6, 0, -3.6], [7.2, 0.8, 7.2], "abajur_pe"),
        cubo([-2.4, 0.8, -2.4], [4.8, 0.8, 4.8], "abajur_pe"),
        cubo([-0.4, 1.6, -0.4], [0.8, 18.4, 0.8], "abajur_pe"),
        cubo([-1.0, 17.2, -1.0], [2.0, 0.8, 2.0], "ouro_esc"),
        # aros da cúpula (embaixo e em cima) e o bocal
        cubo([-5.3, 19.6, -5.3], [10.6, 0.6, 10.6], "abajur_pe"),
        cubo([-2.9, 26.8, -2.9], [5.8, 0.6, 5.8], "abajur_pe"),
        cubo([-0.5, 27.4, -0.5], [1.0, 1.0, 1.0], "ouro_esc"),
    ]
    camadas = [10.0, 9.0, 8.0, 7.0, 6.2, 5.4]
    cupula = []
    alt = 1.15
    for k, larg in enumerate(camadas):
        cor = "abajur_luz" if k % 2 == 0 else "abajur_luz_esc"
        cupula.append(cubo([-larg / 2, 20.2 + k * alt, -larg / 2], [larg, alt + 0.02, larg], cor))
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0], pe),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_cupula", [0, 23, 0], cupula, f"h{p}_raiz"),
    ]
    # pulsa devagar e, de vez em quando, tem um tremor curto de lâmpada falhando
    pisca = "(math.mod(query.life_time, 9) > 8.55 ? 0.93 + math.sin(query.life_time * 2400) * 0.04 : 1 + math.sin(query.life_time * 110) * 0.025)"
    anim = {f"h{p}_cupula": {"scale": pisca}}
    return ossos, {"animation.vulpus.vida.abajur": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 17: patinho de borracha
def modelo_pato() -> tuple[list[dict], dict]:
    """Patinho de borracha amarelo pastel (~0,6 bloco) que balança de leve, como numa água parada."""
    p = M_PATO
    corpo = [
        cubo([-3.6, 0.4, -3.4], [7.2, 4.4, 8.2], "pato"),
        cubo([-3.0, 0, -2.6], [6.0, 0.6, 6.8], "pato_esc"),
        cubo([-1.6, 3.8, 4.0], [3.2, 2.2, 1.8], "pato"),  # rabinho
        cubo([-4.3, 1.6, -1.2], [0.8, 2.6, 4.4], "pato_esc"),  # asas
        cubo([3.5, 1.6, -1.2], [0.8, 2.6, 4.4], "pato_esc"),
        cubo([-2.6, 4.8, -4.4], [5.2, 4.8, 5.0], "pato"),  # cabeça
        cubo([-2.0, 9.4, -3.6], [4.0, 0.6, 3.4], "pato"),
        cubo([-1.7, 6.0, -7.4], [3.4, 1.4, 3.2], "pato_bico"),  # bico
        cubo([-1.7, 5.6, -6.8], [3.4, 0.5, 2.4], "pato_bico"),
        cubo([-2.9, 7.4, -3.6], [0.4, 1.0, 1.0], "preto"),  # olhos
        cubo([2.5, 7.4, -3.6], [0.4, 1.0, 1.0], "preto"),
        cubo([1.0, 3.6, -3.7], [1.8, 1.0, 0.4], "branco"),  # brilho na barriga
    ]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_pato", [0, 2, 0], corpo, f"m{p}_raiz")]
    anim = {
        f"m{p}_pato": {
            "position": [0, "math.sin(query.life_time * 100) * 0.5", 0],
            "rotation": ["math.sin(query.life_time * 100) * 4", "math.sin(query.life_time * 30) * 6", "math.sin(query.life_time * 70 + 90) * 5"],
        }
    }
    return ossos, {"animation.vulpus.vida.pato": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 18: carrossel de brinquedo
def cavalinho(cor: str, crina: str) -> list[dict]:
    """Cavalinho de brinquedo de perfil, andando na direção +x, na posição z = -6,5 (o osso o gira para os quatro cantos)."""
    z = -7.4
    return [
        cubo([-2.8, 5.2, z], [5.6, 3.2, 2.0], cor),
        cubo([1.6, 6.4, z + 0.1], [2.0, 4.2, 1.8], cor),
        cubo([2.6, 9.2, z - 0.1], [2.8, 2.0, 2.0], cor),
        cubo([4.6, 8.8, z + 0.2], [1.2, 1.4, 1.6], "branco"),
        cubo([-3.6, 6.4, z + 0.1], [0.8, 1.8, 1.8], crina),
        cubo([0.9, 8.4, z + 0.3], [1.0, 3.4, 1.4], crina),
        cubo([-2.6, 3.6, z + 0.1], [0.9, 1.7, 0.9], cor),
        cubo([-2.6, 3.6, z + 1.0], [0.9, 1.7, 0.9], cor),
        cubo([1.7, 3.6, z + 0.1], [0.9, 1.7, 0.9], cor),
        cubo([1.7, 3.6, z + 1.0], [0.9, 1.7, 0.9], cor),
        cubo([3.4, 10.4, z - 0.1], [0.6, 0.6, 0.4], "preto"),
    ]


def modelo_carrossel() -> tuple[list[dict], dict]:
    """Carrossel de brinquedo (~1,2 bloco): quatro cavalinhos pastel presos por hastes, sob um teto listrado, giram devagar
    em volta do eixo; a plataforma fica parada."""
    p = M_CARROSSEL
    plataforma = [
        cubo([-9.5, 0, -9.5], [19, 1.4, 19], "tel_esc"),
        cubo([-9, 1.4, -9], [18, 0.8, 18], "balao_rosa_luz"),
        cubo([-3, 2.2, -3], [6, 0.6, 6], "balao_creme"),
    ]
    gira = [
        cubo([-1.4, 2.2, -1.4], [2.8, 15.6, 2.8], "balao_creme_luz"),
        cubo([-0.9, 11, -0.9], [1.8, 1.0, 1.8], "ouro_esc"),
    ]
    cores = [("balao_rosa", "branco"), ("balao_azul", "balao_creme_luz"), ("balao_creme", "balao_rosa"), ("branco", "balao_azul")]
    for k, (cor, crina) in enumerate(cores):
        ang = k * 90
        gira.append(girar(cubo([-0.3, 2.4, -6.9], [0.6, 15.0, 0.6], "ouro_claro"), 1, ang, [0, 0, 0]))
        gira += [girar(c, 1, ang, [0, 0, 0]) for c in cavalinho(cor, crina)]
    # teto em degraus listrados (rosa e creme) e um botão no topo
    for k, (larg, cor) in enumerate([(20, "balao_rosa"), (16.4, "balao_creme_luz"), (12.8, "balao_rosa"), (9.2, "balao_creme_luz"), (5.6, "balao_rosa")]):
        gira.append(cubo([-larg / 2, 17.4 + k * 1.2, -larg / 2], [larg, 1.22, larg], cor))
    gira.append(cubo([-0.7, 23.4, -0.7], [1.4, 1.6, 1.4], "ouro"))
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_base", [0, 0, 0], plataforma, f"m{p}_raiz"),
        osso(f"m{p}_gira", [0, 0, 0], gira, f"m{p}_raiz"),
    ]
    anim = {f"m{p}_gira": {"rotation": [0, "query.life_time * 16", 0]}}
    return ossos, {"animation.vulpus.vida.carrossel": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 19: raposa branca (Yuki)
def modelo_raposa_branca() -> tuple[list[dict], dict]:
    """Raposinha branca sentada, pequena (~0,75 bloco) com lenço vermelho e sininho: respira, balança a cauda, mexe as
    orelhas de vez em quando e inclina a cabeça. É a Yuki, a guia dos aventureiros."""
    p = M_RAPOSA_BRANCA
    corpo = [
        cubo([-3, 0, -2], [6, 5, 6], "branco"),
        cubo([-2, 0, -2.4], [4, 3.5, 0.5], "creme"),
        cubo([-2.6, 0, -3.6], [2, 1.5, 2.6], "branco"),
        cubo([0.6, 0, -3.6], [2, 1.5, 2.6], "branco"),
        cubo([-3.3, 4.3, -2.3], [6.6, 1.1, 6.6], "cr_verm"),
        cubo([-0.7, 3.4, -3.4], [1.4, 1.4, 0.8], "ouro"),
    ]
    cabeca = [
        cubo([-4, 5.2, -3.5], [8, 6.5, 7], "branco"),
        cubo([-2, 5.6, -4.7], [4, 3, 1.3], "creme"),
        cubo([-0.7, 7.4, -5.1], [1.4, 1, 0.5], "preto"),
        cubo([-3, 8.4, -3.9], [1.3, 1.7, 0.4], "preto"),
        cubo([1.7, 8.4, -3.9], [1.3, 1.7, 0.4], "preto"),
        cubo([-3.7, 6.3, -3.9], [1.3, 0.8, 0.4], "rosa"),
        cubo([2.4, 6.3, -3.9], [1.3, 0.8, 0.4], "rosa"),
    ]
    orelha_e = [cubo([-4, 11.7, -2.5], [2.8, 4, 2], "branco"), cubo([-3.4, 11.9, -2.7], [1.5, 2.6, 0.4], "rosa")]
    orelha_d = [cubo([1.2, 11.7, -2.5], [2.8, 4, 2], "branco"), cubo([1.9, 11.9, -2.7], [1.5, 2.6, 0.4], "rosa")]
    cauda = [cubo([-2, 0, 3.6], [4, 4, 4.5], "branco"), cubo([-2.2, 0.2, 8], [4.4, 4.4, 2.5], "creme")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 5.2, 0], cabeca, f"m{p}_corpo"),
        osso(f"m{p}_orelha_e", [-2.6, 11.7, -1.5], orelha_e, f"m{p}_cabeca"),
        osso(f"m{p}_orelha_d", [2.6, 11.7, -1.5], orelha_d, f"m{p}_cabeca"),
        osso(f"m{p}_cauda", [0, 2, 3.6], cauda, f"m{p}_corpo"),
    ]
    anim = {
        f"m{p}_raiz": {"scale": 0.85},
        f"m{p}_corpo": {"scale": [1, "1 + math.sin(query.life_time * 130) * 0.025", 1]},
        f"m{p}_cabeca": {"rotation": ["math.sin(query.life_time * 50) * 3", "math.sin(query.life_time * 38) * 6", "math.sin(query.life_time * 62) * 4"]},
        f"m{p}_orelha_e": {"rotation": [0, 0, "-math.clamp(math.sin(query.life_time * 90) * 3, 0, 1) * 18"]},
        f"m{p}_orelha_d": {"rotation": [0, 0, "math.clamp(math.sin(query.life_time * 70 + 40) * 3, 0, 1) * 18"]},
        f"m{p}_cauda": {"rotation": [0, "math.sin(query.life_time * 260) * 22", "math.sin(query.life_time * 130) * 4"]},
    }
    return ossos, {"animation.vulpus.vida.raposa_branca": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- pets (16) e a máquina de cápsulas
# Estilo: chibi (cabeça grande, olhos com brilho, bochechas), pequenos, pairando um pouco acima do chão. Frente = -Z.
def _flutua(p: int, amp: float = 0.9, vel: float = 110, base: float = 1.5, escala: float = 0.85) -> dict:
    """Todo pet paira um pouquinho acima do chão e balança de leve."""
    return {f"m{p}_raiz": {"position": [0, f"{base} + math.sin(query.life_time * {vel}) * {amp}", 0], "scale": escala}}


def _olho(x: float, y: float, z: float, w: float = 1.5, h: float = 2.2, cor: str = "preto") -> list[dict]:
    """Olho com brilho (duas peças; o brilho fica um tiquinho à frente)."""
    return [cubo([x, y, z], [w, h, 0.5], cor), cubo([x + w * 0.5, y + h * 0.5, z - 0.12], [w * 0.45, h * 0.42, 0.5], "branco")]


def _raposa(p: int, nome: str, corpo: str, sombra: str, barriga: str, ponta: str, orelha: str, ponta_orelha: str,
            cabeca_extra: list[dict] | None = None, corpo_extra: list[dict] | None = None, caudas: list[dict] | None = None,
            olho: str = "preto", bochecha: str = "rosa", escala: float = 0.85) -> tuple[list[dict], dict]:
    """Raposinha sentada, base de várias espécies: pelagem em 3 tons, bochechas peludas, focinho, orelhas com ponta e cauda em 3 gomos."""
    c_corpo = [
        cubo([-3.5, 0, -2.5], [7, 5.5, 6.5], corpo),
        cubo([-2.3, 0, -2.9], [4.6, 4, 0.5], barriga),
        cubo([-4.2, 0, 0.3], [2, 3.2, 3.6], sombra),
        cubo([2.2, 0, 0.3], [2, 3.2, 3.6], sombra),
        cubo([-2.9, 0, -4], [2, 1.7, 2.4], sombra),
        cubo([0.9, 0, -4], [2, 1.7, 2.4], sombra),
        cubo([-3.2, 4.6, -2.8], [6.4, 1.1, 7], sombra),
    ] + (corpo_extra or [])
    c_cabeca = [
        cubo([-4.5, 5.5, -4], [9, 7, 7.5], corpo),
        cubo([-5.3, 6.1, -3.2], [1.1, 2.4, 3.4], corpo),
        cubo([4.2, 6.1, -3.2], [1.1, 2.4, 3.4], corpo),
        cubo([-2.3, 5.8, -5.4], [4.6, 3.1, 1.6], barriga),
        cubo([-0.9, 7.5, -5.8], [1.8, 1.3, 0.6], "preto"),
        cubo([-0.3, 6.5, -5.6], [0.6, 0.9, 0.4], sombra),
        cubo([-4.5, 11.4, -4], [9, 1.1, 7.5], sombra),
        cubo([-3.4, 6.6, -4.3], [1.5, 0.9, 0.4], bochecha),
        cubo([1.9, 6.6, -4.3], [1.5, 0.9, 0.4], bochecha),
    ] + _olho(-3.5, 8.3, -4.3, 1.7, 2.6, olho) + _olho(1.8, 8.3, -4.3, 1.7, 2.6, olho) + (cabeca_extra or [])
    o_e = [cubo([-4.6, 12.4, -3], [3.3, 3.2, 2.4], corpo), cubo([-4.1, 15.4, -2.6], [2.3, 1.9, 1.6], ponta_orelha), cubo([-3.8, 12.6, -3.2], [1.8, 2.6, 0.4], orelha)]
    o_d = [cubo([1.3, 12.4, -3], [3.3, 3.2, 2.4], corpo), cubo([1.8, 15.4, -2.6], [2.3, 1.9, 1.6], ponta_orelha), cubo([2, 12.6, -3.2], [1.8, 2.6, 0.4], orelha)]
    cauda = caudas or [
        cubo([-2, 0.5, 3.8], [4, 4, 3], corpo),
        cubo([-2.5, 0.8, 6.6], [5, 4.8, 3], sombra),
        cubo([-2.8, 1.1, 9.4], [5.6, 5.2, 3], ponta),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], c_corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 5.5, 0], c_cabeca, f"m{p}_corpo"),
        osso(f"m{p}_orelha_e", [-3, 12.4, -1.8], o_e, f"m{p}_cabeca"),
        osso(f"m{p}_orelha_d", [3, 12.4, -1.8], o_d, f"m{p}_cabeca"),
        osso(f"m{p}_cauda", [0, 2, 3.8], cauda, f"m{p}_corpo"),
    ]
    anim = _flutua(p, escala=escala)
    anim.update({
        f"m{p}_corpo": {"scale": [1, "1 + math.sin(query.life_time * 130) * 0.025", 1]},
        f"m{p}_cabeca": {"rotation": ["math.sin(query.life_time * 50) * 3", "math.sin(query.life_time * 38) * 7", "math.sin(query.life_time * 62) * 4"]},
        f"m{p}_orelha_e": {"rotation": [0, 0, "-math.clamp(math.sin(query.life_time * 90) * 3, 0, 1) * 20"]},
        f"m{p}_orelha_d": {"rotation": [0, 0, "math.clamp(math.sin(query.life_time * 70 + 40) * 3, 0, 1) * 20"]},
        f"m{p}_cauda": {"rotation": [0, "math.sin(query.life_time * 260) * 24", "math.sin(query.life_time * 130) * 4"]},
    })
    return ossos, {f"animation.vulpus.vida.{nome}": {"loop": True, "bones": anim}}


def modelo_pet_mel() -> tuple[list[dict], dict]:
    return _raposa(M_PET0, "pet_mel", "mel", "mel_esc", "creme", "creme", "rosa_claro", "mel_esc",
                   [cubo([-1.6, 11.6, -4.3], [3.2, 0.9, 0.5], "ouro_claro"), cubo([-0.9, 10.7, -4.3], [1.8, 0.9, 0.5], "ouro"), cubo([-0.4, 9.9, -4.3], [0.8, 0.8, 0.5], "ouro")])


def modelo_pet_sapinho() -> tuple[list[dict], dict]:
    p = M_PET0 + 1
    corpo = [
        cubo([-3.6, 0, -3.2], [7.2, 4.6, 7], "sapo"),
        cubo([-2.6, 0, -3.6], [5.2, 3.4, 0.5], "barriga"),
        cubo([-3.9, 4.2, -2.4], [1.5, 1, 1.5], "sapo_esc"),
        cubo([1.2, 4.4, 0.2], [2, 1, 2], "sapo_esc"),
        cubo([-1.8, 4.5, 1.6], [1.6, 1, 1.6], "sapo_esc"),
        cubo([-5, 0, 0.8], [2.6, 3, 4.4], "sapo_esc"),
        cubo([2.4, 0, 0.8], [2.6, 3, 4.4], "sapo_esc"),
        cubo([-4.4, 0, -4.6], [2.2, 1.4, 2.8], "sapo"),
        cubo([2.2, 0, -4.6], [2.2, 1.4, 2.8], "sapo"),
    ]
    cabeca = [
        cubo([-4.4, 4, -4], [8.8, 4, 7], "sapo"),
        cubo([-4.4, 7.8, -3.2], [3.4, 2.8, 3.4], "sapo"),
        cubo([1, 7.8, -3.2], [3.4, 2.8, 3.4], "sapo"),
        cubo([-4, 8.4, -3.7], [2.6, 2.2, 0.6], "branco"),
        cubo([1.4, 8.4, -3.7], [2.6, 2.2, 0.6], "branco"),
        cubo([-3.1, 8.7, -4.1], [1.4, 1.6, 0.5], "preto"),
        cubo([1.6, 8.7, -4.1], [1.4, 1.6, 0.5], "preto"),
        cubo([-2.6, 9.6, -4.3], [0.6, 0.6, 0.4], "branco"),
        cubo([2.1, 9.6, -4.3], [0.6, 0.6, 0.4], "branco"),
        cubo([-2.2, 4.6, -4.4], [4.4, 0.5, 0.5], "sapo_esc"),
        cubo([-3.9, 5, -4.3], [1.5, 1, 0.4], "rosa"),
        cubo([2.4, 5, -4.3], [1.5, 1, 0.4], "rosa"),
        cubo([-2.6, 8, -0.8], [5.2, 0.8, 4.4], "folha"),
        cubo([-1.8, 8.8, -0.2], [3.6, 0.8, 3.2], "folha_esc"),
        cubo([-0.4, 9.6, 0.4], [0.8, 0.8, 1.8], "folha"),
    ]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 4, 0], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 1.6, 150)
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 200) * 0.06", 1]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 70) * 3", "math.sin(query.life_time * 40) * 8", "math.sin(query.life_time * 55) * 3"]}
    return ossos, {"animation.vulpus.vida.pet_sapinho": {"loop": True, "bones": anim}}


def modelo_pet_pintinho() -> tuple[list[dict], dict]:
    p = M_PET0 + 2
    corpo = [
        cubo([-4, 1.4, -3.6], [8, 5.5, 7.4], "pintinho"),
        cubo([-3, 6.8, -2.8], [6, 1.4, 5.8], "pintinho"),
        cubo([-2.6, 1.6, -4], [5.2, 3.6, 0.5], "creme"),
        cubo([-2.4, 0, -1], [1.4, 1.6, 2], "pe"),
        cubo([1, 0, -1], [1.4, 1.6, 2], "pe"),
        cubo([-2.8, 0, -2], [0.6, 0.6, 1.4], "pe"),
        cubo([0.2, 0, -2], [0.6, 0.6, 1.4], "pe"),
        cubo([-1.2, 4, 3.6], [2.4, 2.4, 1.4], "pintinho"),
        # casca do ovo no chão do bichinho: coroa em zigue-zague
        cubo([-4.4, 0.6, -4], [8.8, 1.6, 8.2], "casca"),
        cubo([-4.4, 2.2, -4], [2, 1.2, 2], "casca"),
        cubo([-1, 2.2, -4], [2, 1.2, 2], "casca"),
        cubo([2.4, 2.2, -4], [2, 1.2, 2], "casca"),
        cubo([-4.4, 2.2, 2.2], [2, 1.2, 2], "casca"),
        cubo([-1, 2.2, 2.2], [2, 1.2, 2], "casca"),
        cubo([2.4, 2.2, 2.2], [2, 1.2, 2], "casca"),
    ]
    cabeca = [
        cubo([-3.6, 8.2, -3.6], [7.2, 4.6, 6.4], "pintinho"),
        cubo([-1.2, 9.4, -5.2], [2.4, 1.4, 1.8], "bico"),
        cubo([-1, 8.6, -5], [2, 0.8, 1.4], "pe"),
        cubo([-3.4, 9.4, -3.9], [1.5, 0.9, 0.4], "rosa"),
        cubo([1.9, 9.4, -3.9], [1.5, 0.9, 0.4], "rosa"),
        cubo([-0.5, 12.8, -1], [1, 2.2, 1], "pintinho"),
        cubo([-1.5, 12.8, -0.4], [0.9, 1.8, 0.9], "pintinho"),
        cubo([0.7, 12.8, -0.4], [0.9, 1.6, 0.9], "pintinho"),
    ] + _olho(-2.6, 10.3, -4, 1.5, 2.2) + _olho(1.1, 10.3, -4, 1.5, 2.2)
    asa_e = [cubo([-5.4, 3.2, -2], [1.6, 3.8, 4], "pintinho"), cubo([-5.6, 2.4, -1.4], [1.4, 1.2, 2.8], "pe")]
    asa_d = [cubo([3.8, 3.2, -2], [1.6, 3.8, 4], "pintinho"), cubo([4.2, 2.4, -1.4], [1.4, 1.2, 2.8], "pe")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 8, 0], cabeca, f"m{p}_corpo"),
        osso(f"m{p}_asa_e", [-4, 6.6, 0], asa_e, f"m{p}_corpo"),
        osso(f"m{p}_asa_d", [4, 6.6, 0], asa_d, f"m{p}_corpo"),
    ]
    anim = _flutua(p, 1.3, 170)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 90) * 6", "math.sin(query.life_time * 50) * 9", "math.sin(query.life_time * 40) * 3"]}
    anim[f"m{p}_asa_e"] = {"rotation": [0, 0, "math.sin(query.life_time * 340) * 18"]}
    anim[f"m{p}_asa_d"] = {"rotation": [0, 0, "-math.sin(query.life_time * 340) * 18"]}
    return ossos, {"animation.vulpus.vida.pet_pintinho": {"loop": True, "bones": anim}}


def modelo_pet_coruja() -> tuple[list[dict], dict]:
    p = M_PET0 + 3
    corpo = [
        cubo([-3.6, 0, -3], [7.2, 6.4, 6], "coruja"),
        cubo([-2.6, 0.4, -3.4], [5.2, 5, 0.5], "coruja_cl"),
        cubo([-2.2, 3.8, -3.8], [1.4, 0.9, 0.4], "coruja"),
        cubo([0.8, 3.8, -3.8], [1.4, 0.9, 0.4], "coruja"),
        cubo([-0.7, 2.4, -3.8], [1.4, 0.9, 0.4], "coruja"),
        cubo([-2.2, 1.2, -3.8], [1.4, 0.9, 0.4], "coruja"),
        cubo([0.8, 1.2, -3.8], [1.4, 0.9, 0.4], "coruja"),
        cubo([-2.4, 0, -1.8], [1.8, 1, 2.4], "pe"),
        cubo([0.6, 0, -1.8], [1.8, 1, 2.4], "pe"),
        cubo([-2.8, 0.8, 2.8], [5.6, 4, 1.6], "coruja_esc"),
        cubo([-1.8, 0, 4], [1, 2.4, 1], "coruja_esc"),
        cubo([0.8, 0, 4], [1, 2.4, 1], "coruja_esc"),
    ]
    cabeca = [
        cubo([-5, 6, -3.6], [10, 6.6, 7.2], "coruja"),
        cubo([-5.2, 11.8, -2.6], [2.6, 3, 2], "coruja_esc"),
        cubo([2.6, 11.8, -2.6], [2.6, 3, 2], "coruja_esc"),
        cubo([-4.6, 12.6, -2.4], [1.6, 3, 1.6], "coruja_esc"),
        cubo([3, 12.6, -2.4], [1.6, 3, 1.6], "coruja_esc"),
        cubo([-4.7, 6.8, -4.2], [4.6, 4.8, 0.7], "coruja_cl"),
        cubo([0.1, 6.8, -4.2], [4.6, 4.8, 0.7], "coruja_cl"),
        cubo([-4, 7.6, -4.8], [3.2, 3.2, 0.6], "bico"),
        cubo([0.8, 7.6, -4.8], [3.2, 3.2, 0.6], "bico"),
        cubo([-3.2, 8.2, -5.3], [1.6, 2.2, 0.5], "preto"),
        cubo([1.6, 8.2, -5.3], [1.6, 2.2, 0.5], "preto"),
        cubo([-2.6, 9.4, -5.6], [0.7, 0.8, 0.4], "branco"),
        cubo([2.2, 9.4, -5.6], [0.7, 0.8, 0.4], "branco"),
        cubo([-1, 7.4, -4.9], [2, 2, 1.2], "pe"),
        cubo([-0.5, 6.6, -5.4], [1, 1.4, 0.8], "bico"),
        cubo([-4.4, 6.3, -4.6], [1.4, 0.9, 0.4], "rosa"),
        cubo([3, 6.3, -4.6], [1.4, 0.9, 0.4], "rosa"),
    ]
    asa_e = [cubo([-5.4, 1, -2.4], [2, 5.4, 4.8], "coruja_esc"), cubo([-5.4, 0.2, -1.8], [2, 1.4, 3.6], "coruja")]
    asa_d = [cubo([3.4, 1, -2.4], [2, 5.4, 4.8], "coruja_esc"), cubo([3.4, 0.2, -1.8], [2, 1.4, 3.6], "coruja")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 6, 0], cabeca, f"m{p}_corpo"),
        osso(f"m{p}_asa_e", [-3.6, 6, 0], asa_e, f"m{p}_corpo"),
        osso(f"m{p}_asa_d", [3.6, 6, 0], asa_d, f"m{p}_corpo"),
    ]
    anim = _flutua(p, 1.0, 100)
    anim[f"m{p}_cabeca"] = {"rotation": [0, "math.clamp(math.sin(query.life_time * 35) * 3, -1, 1) * 70", "math.sin(query.life_time * 60) * 3"]}
    anim[f"m{p}_asa_e"] = {"rotation": [0, 0, "math.sin(query.life_time * 120) * 4"]}
    anim[f"m{p}_asa_d"] = {"rotation": [0, 0, "-math.sin(query.life_time * 120) * 4"]}
    return ossos, {"animation.vulpus.vida.pet_coruja": {"loop": True, "bones": anim}}


def modelo_pet_carpa() -> tuple[list[dict], dict]:
    p = M_PET0 + 4
    corpo = [
        cubo([-2.4, 2, -5], [4.8, 5.4, 5], "carpa"),
        cubo([-2.6, 2.2, -0.2], [5.2, 5.6, 4], "carpa_br"),
        cubo([-2.2, 2.4, 3.6], [4.4, 4.6, 3.4], "carpa"),
        cubo([-2.7, 4.8, -2.4], [1.6, 1.6, 1.6], "preto"),
        cubo([1.1, 3.4, 0.4], [1.6, 1.6, 1.6], "preto"),
        cubo([-2.8, 6.4, 1], [1.4, 1.2, 1.4], "ouro"),
        cubo([1.4, 6.2, -2], [1.4, 1.2, 1.4], "ouro"),
        cubo([-2.1, 2.6, -5.6], [4.2, 3.4, 0.8], "carpa"),
        cubo([-2.4, 4.2, -5.9], [1.4, 1.8, 0.4], "preto"),
        cubo([1, 4.2, -5.9], [1.4, 1.8, 0.4], "preto"),
        cubo([-2.2, 4.6, -6.1], [0.6, 0.6, 0.4], "branco"),
        cubo([1.2, 4.6, -6.1], [0.6, 0.6, 0.4], "branco"),
        cubo([-0.8, 2.2, -6.3], [1.6, 0.8, 0.4], "creme"),
        cubo([-0.3, 7.2, -3], [0.6, 2.4, 5.8], "carpa"),
        cubo([-0.3, 9.4, -1], [0.6, 1.4, 3.4], "carpa_br"),
        cubo([-2, 2, -6.6], [0.5, 0.5, 2.2], "ouro_claro"),
        cubo([1.5, 2, -6.6], [0.5, 0.5, 2.2], "ouro_claro"),
    ]
    barb_e = [cubo([-6.4, 3, -2.6], [4, 0.6, 3.4], "carpa_br"), cubo([-7.4, 3, -2], [1.2, 0.6, 2.2], "carpa")]
    barb_d = [cubo([2.4, 3, -2.6], [4, 0.6, 3.4], "carpa_br"), cubo([6.2, 3, -2], [1.2, 0.6, 2.2], "carpa")]
    cauda = [cubo([-0.4, 2.8, 7], [0.8, 4, 2.6], "carpa"), cubo([-0.4, 1.6, 9.4], [0.8, 6.4, 2.6], "carpa_br"), cubo([-0.4, 0.8, 11.8], [0.8, 8, 1.6], "carpa")]
    nuvem = [
        cubo([-4, -2.4, -3], [8, 2, 7], "branco"),
        cubo([-2.6, -0.6, -4.2], [5.4, 1.6, 2], "branco"),
        cubo([-5, -2, -1], [2, 1.6, 4], "branco"),
        cubo([3, -2, -2], [2.4, 1.6, 4], "branco"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_nuvem", [0, 0, 0], nuvem, f"m{p}_raiz"),
        osso(f"m{p}_corpo", [0, 4, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_barb_e", [-2.4, 3.3, -1], barb_e, f"m{p}_corpo"),
        osso(f"m{p}_barb_d", [2.4, 3.3, -1], barb_d, f"m{p}_corpo"),
        osso(f"m{p}_cauda", [0, 5, 6.6], cauda, f"m{p}_corpo"),
    ]
    anim = _flutua(p, 1.6, 120, 3)
    anim[f"m{p}_corpo"] = {"rotation": [0, "math.sin(query.life_time * 170) * 6", "math.sin(query.life_time * 85) * 5"]}
    anim[f"m{p}_nuvem"] = {"scale": ["1 + math.sin(query.life_time * 90) * 0.05", 1, "1 + math.sin(query.life_time * 90) * 0.05"]}
    anim[f"m{p}_barb_e"] = {"rotation": [0, 0, "math.sin(query.life_time * 260) * 22"]}
    anim[f"m{p}_barb_d"] = {"rotation": [0, 0, "-math.sin(query.life_time * 260) * 22"]}
    anim[f"m{p}_cauda"] = {"rotation": [0, "math.sin(query.life_time * 340) * 30", 0]}
    return ossos, {"animation.vulpus.vida.pet_carpa": {"loop": True, "bones": anim}}


def modelo_pet_komainu() -> tuple[list[dict], dict]:
    p = M_PET0 + 5
    corpo = [
        cubo([-3.8, 0, -3], [7.6, 6.4, 7.4], "pedra_cl"),
        cubo([-2.6, 0, -3.4], [5.2, 4.6, 0.5], "cinza_claro"),
        cubo([-3.8, 0, -5.4], [2.6, 2.4, 3.4], "pedra_cl"),
        cubo([1.2, 0, -5.4], [2.6, 2.4, 3.4], "pedra_cl"),
        cubo([-3.9, 0, -5.6], [2.8, 1, 0.5], "pedra"),
        cubo([1.1, 0, -5.6], [2.8, 1, 0.5], "pedra"),
        cubo([-4.4, 0, 0.6], [2, 4, 4], "pedra"),
        cubo([2.4, 0, 0.6], [2, 4, 4], "pedra"),
        cubo([-4, 5.6, -3.2], [8, 1.2, 8], "cr_verm"),
        cubo([-1, 4.4, -3.9], [2, 2, 1], "ouro"),
        cubo([-0.4, 4.2, -4.3], [0.8, 0.8, 0.5], "ouro_esc"),
        cubo([-1.2, 2, 4], [2.4, 4.6, 2.4], "pedra_cl"),
        cubo([-1.6, 6.2, 4.6], [3.2, 2.4, 2.4], "folha"),
        cubo([1.8, 3, -3.5], [1, 0.4, 0.4], "pedra"),
        cubo([-3.4, 1.6, -3.5], [1.2, 0.4, 0.4], "pedra"),
    ]
    cabeca = [
        cubo([-4.4, 6.4, -4], [8.8, 6.6, 7.4], "pedra_cl"),
        cubo([-6, 5.6, -3.2], [1.8, 6.4, 6], "folha"),
        cubo([4.2, 5.6, -3.2], [1.8, 6.4, 6], "folha"),
        cubo([-4.8, 11.6, -2.6], [9.6, 2, 5.4], "folha"),
        cubo([-3.6, 13.4, -2], [7.2, 1.2, 4.2], "folha_esc"),
        cubo([-2.4, 6.8, -5.4], [4.8, 3.2, 1.6], "cinza_claro"),
        cubo([-1, 8.8, -5.8], [2, 1.2, 0.6], "preto"),
        cubo([-2, 6.8, -5.7], [4, 0.6, 0.4], "pedra"),
        cubo([-3.6, 10, -4.4], [2, 1.8, 0.5], "cr_verm"),
        cubo([1.6, 10, -4.4], [2, 1.8, 0.5], "cr_verm"),
        cubo([-3, 10.3, -4.8], [0.7, 0.7, 0.4], "branco"),
        cubo([2.3, 10.3, -4.8], [0.7, 0.7, 0.4], "branco"),
        cubo([-3.8, 12.4, -3.6], [1.2, 1.2, 0.5], "pedra"),
        cubo([2.6, 12.4, -3.6], [1.2, 1.2, 0.5], "pedra"),
        cubo([-3, 8, -4.3], [1.4, 0.8, 0.4], "rosa"),
        cubo([1.6, 8, -4.3], [1.4, 0.8, 0.4], "rosa"),
    ]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 6.4, 0], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 0.6, 80)
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 100) * 0.02", 1]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 45) * 2", "math.sin(query.life_time * 30) * 10", 0]}
    return ossos, {"animation.vulpus.vida.pet_komainu": {"loop": True, "bones": anim}}


def modelo_pet_trevo() -> tuple[list[dict], dict]:
    trevo = [
        cubo([-1.8, 12.4, -3.6], [1.8, 1.8, 0.6], "trevo"), cubo([0, 12.4, -3.6], [1.8, 1.8, 0.6], "trevo"),
        cubo([-1.8, 14.2, -3.6], [1.8, 1.8, 0.6], "trevo"), cubo([0, 14.2, -3.6], [1.8, 1.8, 0.6], "trevo"),
        cubo([-0.4, 13.2, -3.7], [0.8, 0.8, 0.5], "folha_esc"), cubo([-0.3, 11, -3.5], [0.6, 1.6, 0.5], "folha_esc"),
    ]
    caudas = [
        cubo([-2, 0.5, 3.8], [4, 4, 3], "branco"),
        cubo([-2.5, 0.8, 6.6], [5, 4.8, 3], "cinza_claro"),
        cubo([-2.8, 1.1, 9.4], [5.6, 5.2, 3], "trevo"),
    ]
    extra_corpo = [cubo([-1, 4.2, -2.9], [2, 1.2, 0.5], "ouro"), cubo([-0.5, 3.4, -3.1], [1, 1, 0.5], "ouro_esc")]
    return _raposa(M_PET0 + 6, "pet_trevo", "branco", "cinza_claro", "creme", "trevo", "trevo", "folha", trevo, extra_corpo, caudas)


def modelo_pet_nove() -> tuple[list[dict], dict]:
    p = M_PET0 + 7
    cores = ["nc_1", "nc_2", "nc_3", "nc_4", "nc_5", "nc_6", "nc_7", "nc_8", "branco"]
    caudas = []
    for i, c in enumerate(cores):
        ang = (i - 4) / 4
        h = 2.4 + 3.4 * (1 - abs(ang)) ** 1.1
        caudas.append(cubo([-0.9 + ang * 7, h, 3.8 + abs(ang) * 0.9], [1.8, 1.8, 4.2 - abs(ang) * 0.6], c))
        caudas.append(cubo([-0.8 + ang * 7.4, h + 0.2, 8 + abs(ang) * 0.6 - abs(ang) * 0.6], [1.6, 1.6, 1.4], "ouro_claro"))
    extras = [
        cubo([-2, 11.5, -4.3], [4, 0.9, 0.5], "ouro"),
        cubo([-0.7, 10.6, -4.4], [1.4, 1.4, 0.5], "cr_verm"),
        cubo([-0.3, 10.9, -4.6], [0.6, 0.6, 0.4], "cr_claro"),
    ]
    extras_corpo = [cubo([-3.6, 3, -2.6], [7.2, 1, 7], "ouro"), cubo([-0.8, 2.6, -3.1], [1.6, 1.6, 0.6], "ouro_esc")]
    o, a = _raposa(p, "pet_nove", "ouro_claro", "ouro", "creme", "ouro", "rosa_claro", "ouro_esc", extras, extras_corpo, caudas, "cr_esc", escala=0.9)
    # brasa suave nas pontas das caudas (osso que brilha)
    return o, a


# ---- novos pets
def modelo_pet_coelho() -> tuple[list[dict], dict]:
    p = M_PET1 + 0
    corpo = [
        cubo([-3.4, 0, -2.6], [6.8, 5.6, 6.2], "lua"),
        cubo([-2.3, 0, -3], [4.6, 4, 0.5], "branco"),
        cubo([-4, 0, 0.6], [2, 3.4, 3.8], "lua_esc"),
        cubo([2, 0, 0.6], [2, 3.4, 3.8], "lua_esc"),
        cubo([-2.8, 0, -4], [2, 1.6, 2.4], "lua_esc"),
        cubo([0.8, 0, -4], [2, 1.6, 2.4], "lua_esc"),
        cubo([-1.8, 0.8, 3.4], [3.6, 3.6, 3.2], "branco"),
    ]
    cabeca = [
        cubo([-4.2, 5.4, -3.8], [8.4, 6.8, 7], "lua"),
        cubo([-2.2, 5.6, -5.1], [4.4, 3, 1.5], "branco"),
        cubo([-0.7, 7.3, -5.5], [1.4, 1.1, 0.5], "rosa"),
        cubo([-0.3, 6.4, -5.4], [0.6, 0.9, 0.4], "lua_esc"),
        cubo([-3.4, 6.4, -4.1], [1.5, 0.9, 0.4], "rosa"),
        cubo([1.9, 6.4, -4.1], [1.5, 0.9, 0.4], "rosa"),
        cubo([-1.4, 10.4, -4.1], [2.8, 1.1, 0.5], "ouro_claro"),
        cubo([-1, 9.7, -4.1], [1.1, 0.9, 0.5], "ouro_claro"),
        cubo([0.4, 9.7, -4.1], [0.8, 0.9, 0.5], "lua"),
    ] + _olho(-3.3, 8, -4.1, 1.6, 2.5) + _olho(1.7, 8, -4.1, 1.6, 2.5)
    o_e = [cubo([-3.4, 12.2, -2.4], [2.4, 7.4, 1.6], "lua"), cubo([-3, 12.6, -2.6], [1.5, 6, 0.4], "rosa_claro")]
    o_d = [cubo([1, 12.2, -2.4], [2.4, 7.4, 1.6], "lua"), cubo([1.5, 12.6, -2.6], [1.5, 6, 0.4], "rosa_claro")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 5.4, 0], cabeca, f"m{p}_corpo"),
        osso(f"m{p}_orelha_e", [-2.2, 12.2, -1.6], o_e, f"m{p}_cabeca"),
        osso(f"m{p}_orelha_d", [2.2, 12.2, -1.6], o_d, f"m{p}_cabeca"),
    ]
    anim = _flutua(p, 1.8, 130)
    anim[f"m{p}_orelha_e"] = {"rotation": ["math.sin(query.life_time * 80) * 5", 0, "-8 - math.clamp(math.sin(query.life_time * 60) * 3, 0, 1) * 16"]}
    anim[f"m{p}_orelha_d"] = {"rotation": ["math.sin(query.life_time * 80 + 50) * 5", 0, "8 + math.clamp(math.sin(query.life_time * 75 + 30) * 3, 0, 1) * 16"]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 90) * 4", "math.sin(query.life_time * 40) * 7", 0]}
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.abs(math.sin(query.life_time * 65)) * 0.05", 1]}
    return ossos, {"animation.vulpus.vida.pet_coelho": {"loop": True, "bones": anim}}


def modelo_pet_cogumelo() -> tuple[list[dict], dict]:
    p = M_PET1 + 1
    haste = [
        cubo([-3, 0, -3], [6, 6, 6], "creme"),
        cubo([-3.2, 0, -3.2], [6.4, 1.2, 6.4], "casca"),
        cubo([-2.2, 4.4, -3.4], [1.6, 0.5, 0.4], "preto"),
        cubo([0.6, 4.4, -3.4], [1.6, 0.5, 0.4], "preto"),
        cubo([-0.9, 3.2, -3.4], [1.8, 0.5, 0.4], "cr_esc"),
        cubo([-3.1, 3.3, -3.4], [1.3, 0.8, 0.4], "rosa"),
        cubo([1.8, 3.3, -3.4], [1.3, 0.8, 0.4], "rosa"),
        cubo([-2.6, 0, -2], [1.8, 1, 2.2], "creme"),
        cubo([0.8, 0, -2], [1.8, 1, 2.2], "creme"),
    ]
    chapeu = [
        cubo([-6, 6, -6], [12, 2, 12], "cr_verm"),
        cubo([-5, 8, -5], [10, 2.4, 10], "cr_verm"),
        cubo([-3, 10.4, -3], [6, 1.6, 6], "cr_claro"),
        cubo([-6.2, 6, -6.2], [12.4, 0.6, 12.4], "cr_esc"),
        cubo([-4, 8.6, -5.4], [2.4, 2.4, 0.6], "branco"),
        cubo([1.6, 7, -6.4], [2.6, 2, 0.6], "branco"),
        cubo([-5.6, 8.2, 0], [0.6, 2.4, 2.6], "branco"),
        cubo([5, 7.6, -1.6], [0.6, 2.2, 2.4], "branco"),
        cubo([-1.4, 11.7, -1], [2.8, 0.6, 2.2], "branco"),
        cubo([2.8, 9, 3.4], [2.4, 2, 0.6], "branco"),
        cubo([-3.8, 7.2, 5.4], [2.6, 2, 0.6], "branco"),
    ]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_haste", [0, 0, 0], haste, f"m{p}_raiz"), osso(f"m{p}_chapeu", [0, 6, 0], chapeu, f"m{p}_haste")]
    anim = _flutua(p, 1.4, 90, 1.5, 0.75)
    anim[f"m{p}_chapeu"] = {"rotation": ["math.sin(query.life_time * 55) * 4", "math.sin(query.life_time * 30) * 6", "math.sin(query.life_time * 70) * 4"]}
    anim[f"m{p}_haste"] = {"scale": [1, "1 + math.sin(query.life_time * 90) * 0.04", 1]}
    return ossos, {"animation.vulpus.vida.pet_cogumelo": {"loop": True, "bones": anim}}


def modelo_pet_vagalume() -> tuple[list[dict], dict]:
    p = M_PET1 + 2
    corpo = [
        cubo([-2.4, 3, -2.4], [4.8, 5, 4.8], "madeira_esc"),
        cubo([-2.6, 7.4, -2.6], [5.2, 1.6, 5.2], "madeira_esc"),
        cubo([-2, 3.4, -2.8], [4, 3, 0.5], "creme"),
        cubo([-2.4, 1, -1.2], [0.8, 2.4, 0.8], "madeira_esc"),
        cubo([1.6, 1, -1.2], [0.8, 2.4, 0.8], "madeira_esc"),
        cubo([-0.4, 1, 1.4], [0.8, 2.4, 0.8], "madeira_esc"),
    ]
    cabeca = [
        cubo([-3, 8.8, -3], [6, 4.2, 5.4], "madeira_esc"),
        cubo([-2.6, 9.6, -3.4], [1.8, 2.2, 0.5], "preto"),
        cubo([0.8, 9.6, -3.4], [1.8, 2.2, 0.5], "preto"),
        cubo([-2.2, 10.6, -3.6], [0.7, 0.8, 0.4], "branco"),
        cubo([1.2, 10.6, -3.6], [0.7, 0.8, 0.4], "branco"),
        cubo([-3, 9, -3.4], [1.2, 0.8, 0.4], "rosa"),
        cubo([1.8, 9, -3.4], [1.2, 0.8, 0.4], "rosa"),
        cubo([-2.2, 13, -1], [0.6, 3, 0.6], "preto"),
        cubo([1.6, 13, -1], [0.6, 3, 0.6], "preto"),
        cubo([-2.5, 15.6, -1.2], [1.2, 1.2, 1.2], "ouro_claro"),
        cubo([1.3, 15.6, -1.2], [1.2, 1.2, 1.2], "ouro_claro"),
    ]
    luz = [
        cubo([-3, 2.6, 1.6], [6, 5.6, 5.6], "vaga"),
        cubo([-2.2, 3.4, 2.4], [4.4, 4, 4.4], "vaga_nucleo"),
    ]
    asa_e = [cubo([-7.4, 5.4, -0.4], [4.4, 0.6, 5.6], "fio"), cubo([-8.6, 5.4, 0.6], [1.6, 0.6, 3.6], "branco")]
    asa_d = [cubo([3, 5.4, -0.4], [4.4, 0.6, 5.6], "fio"), cubo([7, 5.4, 0.6], [1.6, 0.6, 3.6], "branco")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 8.8, 0], cabeca, f"m{p}_corpo"),
        osso(f"m{p}_asa_e", [-2.4, 6.2, 0], asa_e, f"m{p}_corpo"),
        osso(f"m{p}_asa_d", [2.4, 6.2, 0], asa_d, f"m{p}_corpo"),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_luz", [0, 5, 4], luz, f"h{p}_raiz"),
    ]
    anim = _flutua(p, 2.2, 160, 2.5)
    anim[f"m{p}_asa_e"] = {"rotation": [0, 0, "math.sin(query.life_time * 900) * 30"]}
    anim[f"m{p}_asa_d"] = {"rotation": [0, 0, "-math.sin(query.life_time * 900) * 30"]}
    anim[f"h{p}_raiz"] = anim[f"m{p}_raiz"]
    anim[f"h{p}_luz"] = {"scale": ["0.9 + math.sin(query.life_time * 140) * 0.12", "0.9 + math.sin(query.life_time * 140) * 0.12", "0.9 + math.sin(query.life_time * 140) * 0.12"]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 80) * 4", "math.sin(query.life_time * 45) * 7", 0]}
    return ossos, {"animation.vulpus.vida.pet_vagalume": {"loop": True, "bones": anim}}


def modelo_pet_lontra() -> tuple[list[dict], dict]:
    p = M_PET1 + 3
    corpo = [
        cubo([-3.4, 0, -3], [6.8, 7.4, 6], "lontra"),
        cubo([-2.4, 0.4, -3.4], [4.8, 6, 0.5], "lontra_cl"),
        cubo([-2.8, 0, -4.4], [2, 1.6, 2], "lontra"),
        cubo([0.8, 0, -4.4], [2, 1.6, 2], "lontra"),
        cubo([-2.4, 0, 2.4], [4.8, 2.6, 6.4], "lontra"),
        cubo([-1.8, 1, 8.4], [3.6, 2, 3.6], "lontra"),
        # o peixinho que ela segura
        cubo([-2.2, 3, -5.4], [4.4, 1.8, 1.4], "carpa"),
        cubo([-1.8, 3.2, -5.6], [1.2, 1.4, 0.4], "carpa_br"),
        cubo([1.6, 3.3, -5.2], [1.4, 1.4, 0.5], "carpa"),
        cubo([-2.7, 3.4, -5.3], [0.6, 0.6, 0.4], "preto"),
    ]
    cabeca = [
        cubo([-4, 7.2, -3.6], [8, 6, 6.8], "lontra"),
        cubo([-2.6, 7.4, -5.2], [5.2, 3, 2], "lontra_cl"),
        cubo([-0.9, 9.2, -5.7], [1.8, 1.2, 0.6], "preto"),
        cubo([-3.2, 8.3, -5], [0.5, 1.6, 0.5], "madeira_esc"),
        cubo([2.7, 8.3, -5], [0.5, 1.6, 0.5], "madeira_esc"),
        cubo([-4.2, 12.4, -2.2], [2.2, 1.8, 1.8], "lontra"),
        cubo([2, 12.4, -2.2], [2.2, 1.8, 1.8], "lontra"),
        cubo([-3.8, 8, -4], [1.4, 0.8, 0.4], "rosa"),
        cubo([2.4, 8, -4], [1.4, 0.8, 0.4], "rosa"),
        cubo([-3, 10.6, -4.1], [6, 1.2, 0.5], "lontra_cl"),
    ] + _olho(-3, 9.4, -4.1, 1.6, 2.4) + _olho(1.4, 9.4, -4.1, 1.6, 2.4)
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 7.2, 0], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 1.2, 100)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 60) * 4", "math.sin(query.life_time * 35) * 9", "math.sin(query.life_time * 50) * 4"]}
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 120) * 0.03", 1], "rotation": [0, 0, "math.sin(query.life_time * 55) * 2"]}
    return ossos, {"animation.vulpus.vida.pet_lontra": {"loop": True, "bones": anim}}


def modelo_pet_salamandra() -> tuple[list[dict], dict]:
    p = M_PET1 + 4
    corpo = [
        cubo([-3, 0.6, -2], [6, 3.8, 5], "salam"),
        cubo([-2.4, 0.6, -2.4], [4.8, 2.6, 0.5], "salam_ponto"),
        cubo([-2, 0.6, 3], [4, 3, 4], "salam"),
        cubo([-1.4, 0.6, 7], [2.8, 2.4, 4], "salam_esc"),
        cubo([-4.2, 0, -1.4], [1.8, 1.6, 2.4], "salam_esc"),
        cubo([2.4, 0, -1.4], [1.8, 1.6, 2.4], "salam_esc"),
        cubo([-3.6, 0, 3.4], [1.8, 1.6, 2.4], "salam_esc"),
        cubo([1.8, 0, 3.4], [1.8, 1.6, 2.4], "salam_esc"),
        cubo([-1.6, 4.4, -1], [1.2, 0.6, 1.2], "salam_ponto"),
        cubo([0.6, 4.4, 1.6], [1.2, 0.6, 1.2], "salam_ponto"),
        cubo([-0.6, 4.4, 4.4], [1.2, 0.6, 1.2], "salam_ponto"),
        cubo([-2.6, 4.4, 2.6], [1, 0.6, 1], "salam_ponto"),
    ]
    cabeca = [
        cubo([-3.6, 1.4, -5.8], [7.2, 4.4, 5.6], "salam"),
        cubo([-2.4, 1.4, -6.4], [4.8, 2.4, 1], "salam_ponto"),
        cubo([-3.2, 4.6, -4.4], [2.4, 1.8, 2.4], "salam"),
        cubo([0.8, 4.6, -4.4], [2.4, 1.8, 2.4], "salam"),
        cubo([-2.8, 4.9, -4.9], [1.5, 1.5, 0.5], "preto"),
        cubo([1.3, 4.9, -4.9], [1.5, 1.5, 0.5], "preto"),
        cubo([-2.3, 5.8, -5.2], [0.6, 0.6, 0.4], "branco"),
        cubo([1.8, 5.8, -5.2], [0.6, 0.6, 0.4], "branco"),
        cubo([-3.4, 2.2, -5.1], [1.4, 0.9, 0.4], "rosa"),
        cubo([2, 2.2, -5.1], [1.4, 0.9, 0.4], "rosa"),
        cubo([-1.4, 1.9, -6.6], [2.8, 0.5, 0.4], "salam_esc"),
        cubo([-4.4, 3.4, -3.4], [1, 2.4, 1.4], "salam_esc"),
        cubo([3.4, 3.4, -3.4], [1, 2.4, 1.4], "salam_esc"),
    ]
    chama = [
        cubo([-1.6, 0.4, 10.4], [3.2, 3.6, 2.6], "laranja"),
        cubo([-1.1, 1.4, 12.4], [2.2, 3.4, 1.8], "ouro"),
        cubo([-0.6, 2.4, 13.6], [1.2, 2.6, 1.2], "ouro_claro"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 3, -3], cabeca, f"m{p}_corpo"),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_chama", [0, 1.5, 10.4], chama, f"h{p}_raiz"),
    ]
    anim = _flutua(p, 1.0, 100, 1.6, 0.95)
    anim[f"m{p}_corpo"] = {"rotation": [0, "math.sin(query.life_time * 150) * 7", 0]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 70) * 3", "math.sin(query.life_time * 40) * 8", 0]}
    anim[f"h{p}_raiz"] = anim[f"m{p}_raiz"]
    anim[f"h{p}_chama"] = {"scale": ["0.9 + math.sin(query.life_time * 500) * 0.15", "0.85 + math.sin(query.life_time * 400 + 80) * 0.25", "0.9 + math.sin(query.life_time * 500) * 0.15"]}
    return ossos, {"animation.vulpus.vida.pet_salamandra": {"loop": True, "bones": anim}}


def modelo_pet_dragao() -> tuple[list[dict], dict]:
    p = M_PET1 + 5
    corpo = [
        cubo([-3.4, 0, -2.6], [6.8, 6.4, 6.2], "jade"),
        cubo([-2.4, 0, -3], [4.8, 5, 0.5], "creme"),
        cubo([-2.8, 0, -4.2], [2, 1.8, 2.4], "jade_esc"),
        cubo([0.8, 0, -4.2], [2, 1.8, 2.4], "jade_esc"),
        cubo([-4.2, 0, 0.4], [2, 3.4, 3.6], "jade_esc"),
        cubo([2.2, 0, 0.4], [2, 3.4, 3.6], "jade_esc"),
        cubo([-0.6, 6.4, -1.4], [1.2, 1.6, 1.6], "ouro"),
        cubo([-0.6, 6.4, 1.4], [1.2, 1.6, 1.6], "ouro"),
        cubo([-0.6, 5.4, 4], [1.2, 1.6, 1.6], "ouro"),
        # cauda de dragão com espinho
        cubo([-1.8, 0.8, 3.6], [3.6, 3.6, 3], "jade"),
        cubo([-1.3, 1, 6.4], [2.6, 2.6, 3], "jade_esc"),
        cubo([-0.8, 1.4, 9.2], [1.6, 1.8, 2.2], "jade"),
        cubo([-1.2, 1.2, 11.2], [2.4, 2.4, 1.2], "ouro"),
    ]
    cabeca = [
        cubo([-4.4, 6.2, -4], [8.8, 6.6, 7.4], "jade"),
        cubo([-2.6, 6.4, -6], [5.2, 3.4, 2.2], "creme"),
        cubo([-2.2, 8.2, -6.4], [0.8, 0.8, 0.5], "jade_esc"),
        cubo([1.4, 8.2, -6.4], [0.8, 0.8, 0.5], "jade_esc"),
        cubo([-2.4, 6.5, -6.3], [4.8, 0.6, 0.4], "jade_esc"),
        cubo([-4.8, 9.4, -2.6], [1.8, 3.6, 1.8], "ouro"),
        cubo([3, 9.4, -2.6], [1.8, 3.6, 1.8], "ouro"),
        cubo([-4.3, 12.8, -2.2], [1, 1.4, 1], "ouro_claro"),
        cubo([3.3, 12.8, -2.2], [1, 1.4, 1], "ouro_claro"),
        cubo([-3.6, 7, -4.3], [1.5, 0.9, 0.4], "rosa"),
        cubo([2.1, 7, -4.3], [1.5, 0.9, 0.4], "rosa"),
        cubo([-6.8, 7.4, -5], [3, 0.5, 0.5], "ouro_claro"),
        cubo([3.8, 7.4, -5], [3, 0.5, 0.5], "ouro_claro"),
        cubo([-1.2, 11.6, -3.4], [2.4, 1.4, 0.5], "jade_esc"),
    ] + _olho(-3.4, 8.6, -4.3, 1.7, 2.5, "preto") + _olho(1.7, 8.6, -4.3, 1.7, 2.5, "preto")
    asa_e = [cubo([-9, 4.4, -0.6], [5.6, 0.8, 4.8], "jade_esc"), cubo([-12, 4.4, 0], [3.2, 0.8, 3.4], "jade"), cubo([-8.4, 5.2, 0.2], [3.2, 0.6, 3], "jade")]
    asa_d = [cubo([3.4, 4.4, -0.6], [5.6, 0.8, 4.8], "jade_esc"), cubo([8.8, 4.4, 0], [3.2, 0.8, 3.4], "jade"), cubo([5.2, 5.2, 0.2], [3.2, 0.6, 3], "jade")]
    perola = [cubo([-1.4, 0, -1.4], [2.8, 2.8, 2.8], "branco"), cubo([-0.8, 1.6, -1.5], [0.8, 0.8, 0.5], "balao_azul_luz")]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 6.2, 0], cabeca, f"m{p}_corpo"),
        osso(f"m{p}_asa_e", [-3.4, 5, 0.6], asa_e, f"m{p}_corpo"),
        osso(f"m{p}_asa_d", [3.4, 5, 0.6], asa_d, f"m{p}_corpo"),
        osso(f"m{p}_perola", [0, 17, -7], deslocar(perola, 0, 15, -7), f"m{p}_raiz"),
    ]
    anim = _flutua(p, 1.5, 110, 1.8)
    anim[f"m{p}_asa_e"] = {"rotation": [0, 0, "math.sin(query.life_time * 300) * 18"]}
    anim[f"m{p}_asa_d"] = {"rotation": [0, 0, "-math.sin(query.life_time * 300) * 18"]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 55) * 3", "math.sin(query.life_time * 33) * 8", "math.sin(query.life_time * 60) * 3"]}
    anim[f"m{p}_perola"] = {"position": [0, "math.sin(query.life_time * 130) * 1", 0], "rotation": [0, "query.life_time * 90", 0]}
    return ossos, {"animation.vulpus.vida.pet_dragao": {"loop": True, "bones": anim}}


def modelo_pet_espirito() -> tuple[list[dict], dict]:
    p = M_PET1 + 6
    corpo = [
        cubo([-3, 3, -3], [6, 6, 6], "azul_fogo"),
        cubo([-3.6, 4, -3.6], [7.2, 4, 7.2], "azul_fogo"),
        cubo([-2.4, 2, -2.4], [4.8, 1.4, 4.8], "azul_fogo_esc"),
        cubo([-1.8, 0.4, -1.8], [3.6, 1.8, 3.6], "azul_fogo_esc"),
        cubo([-1, -0.8, -1], [2, 1.6, 2], "azul_fogo_cl"),
        cubo([-2.2, 4.8, -3.8], [4.4, 3, 0.8], "azul_fogo_cl"),
        cubo([-2.2, 9, -2.2], [4.4, 1.8, 4.4], "azul_fogo"),
        cubo([-1.4, 10.8, -1.4], [2.8, 1.8, 2.8], "azul_fogo_cl"),
        cubo([-0.8, 12.6, -0.8], [1.6, 1.8, 1.6], "branco"),
        cubo([3.4, 6, -1], [1.8, 1.4, 2], "azul_fogo_cl"),
        cubo([-5.2, 6, -1], [1.8, 1.4, 2], "azul_fogo_cl"),
    ]
    rosto = _olho(-2.5, 5.6, -4.1, 1.8, 2.6, "azul_fogo_esc") + _olho(0.7, 5.6, -4.1, 1.8, 2.6, "azul_fogo_esc") + [
        cubo([-3.4, 4.8, -4.1], [1.3, 0.8, 0.4], "rosa_claro"),
        cubo([2.1, 4.8, -4.1], [1.3, 0.8, 0.4], "rosa_claro"),
        cubo([-0.7, 4.7, -4.1], [1.4, 0.5, 0.4], "azul_fogo_esc"),
    ]
    cauda = [
        cubo([-1.6, 2, 2.8], [3.2, 3.2, 3], "azul_fogo"),
        cubo([-1.2, 3, 5.6], [2.4, 2.8, 2.6], "azul_fogo_cl"),
        cubo([-0.8, 4.4, 7.8], [1.6, 2, 1.8], "branco"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_corpo", [0, 3, 0], corpo, f"h{p}_raiz"),
        osso(f"h{p}_rosto", [0, 6, -4], rosto, f"h{p}_corpo"),
        osso(f"h{p}_cauda", [0, 3, 3], cauda, f"h{p}_corpo"),
    ]
    anim = _flutua(p, 2.4, 80, 2.5, 0.9)
    anim[f"h{p}_raiz"] = anim[f"m{p}_raiz"]
    anim[f"h{p}_corpo"] = {"scale": ["1 + math.sin(query.life_time * 300) * 0.05", "1 + math.sin(query.life_time * 230 + 40) * 0.07", "1 + math.sin(query.life_time * 300) * 0.05"], "rotation": [0, "math.sin(query.life_time * 40) * 8", "math.sin(query.life_time * 70) * 3"]}
    anim[f"h{p}_cauda"] = {"rotation": ["math.sin(query.life_time * 200) * 8", "math.sin(query.life_time * 150) * 18", 0]}
    return ossos, {"animation.vulpus.vida.pet_espirito": {"loop": True, "bones": anim}}


def modelo_pet_fenix() -> tuple[list[dict], dict]:
    p = M_PET1 + 7
    corpo = [
        cubo([-3.2, 1.2, -3], [6.4, 6, 6], "cr_claro"),
        cubo([-2.2, 1.4, -3.4], [4.4, 4.4, 0.5], "ouro_claro"),
        cubo([-2.4, 0, -1.2], [1.4, 1.6, 2], "bico"),
        cubo([1, 0, -1.2], [1.4, 1.6, 2], "bico"),
        cubo([-2.4, 6.4, -2.4], [4.8, 1.4, 4.8], "laranja"),
    ]
    cabeca = [
        cubo([-3.4, 7.4, -3.2], [6.8, 5.2, 5.8], "cr_claro"),
        cubo([-1.2, 8.6, -5.2], [2.4, 1.8, 2.2], "bico"),
        cubo([-0.8, 8.4, -5.4], [1.6, 0.7, 0.8], "ouro_esc"),
        cubo([-3.2, 8.6, -3.7], [1.4, 0.8, 0.4], "ouro"),
        cubo([1.8, 8.6, -3.7], [1.4, 0.8, 0.4], "ouro"),
    ] + _olho(-2.6, 9.6, -3.7, 1.5, 2.2, "preto") + _olho(1.1, 9.6, -3.7, 1.5, 2.2, "preto")
    crista = [
        cubo([-0.8, 12.6, -2.2], [1.6, 2.8, 1.8], "laranja"),
        cubo([-2, 12.6, -1], [1.4, 2.2, 1.6], "cr_claro"),
        cubo([0.6, 12.6, -1], [1.4, 2.2, 1.6], "cr_claro"),
        cubo([-0.5, 15.2, -1.9], [1, 1.8, 1.2], "ouro"),
        cubo([-0.3, 16.8, -1.7], [0.6, 1.4, 0.8], "ouro_claro"),
    ]
    asa_e = [
        cubo([-5.2, 3.6, -2.4], [2.4, 5, 5], "cr_claro"),
        cubo([-8, 3.8, -2], [3, 4.2, 4.4], "laranja"),
        cubo([-10.8, 4.2, -1.6], [3, 3.2, 3.6], "ouro"),
        cubo([-13, 4.6, -1.2], [2.4, 2.2, 2.8], "ouro_claro"),
    ]
    asa_d = [
        cubo([2.8, 3.6, -2.4], [2.4, 5, 5], "cr_claro"),
        cubo([5, 3.8, -2], [3, 4.2, 4.4], "laranja"),
        cubo([7.8, 4.2, -1.6], [3, 3.2, 3.6], "ouro"),
        cubo([10.6, 4.6, -1.2], [2.4, 2.2, 2.8], "ouro_claro"),
    ]
    cauda = [
        cubo([-0.9, 1.4, 2.8], [1.8, 1.8, 4], "cr_claro"), cubo([-0.9, 1.6, 6.6], [1.8, 1.8, 3.2], "laranja"), cubo([-0.9, 1.8, 9.6], [1.8, 1.8, 2.4], "ouro"),
        cubo([-3.4, 1.2, 2.8], [1.8, 1.8, 3.6], "cr_claro"), cubo([-3.6, 1.4, 6.2], [1.8, 1.8, 2.8], "laranja"), cubo([-3.8, 1.6, 8.8], [1.6, 1.6, 2], "ouro"),
        cubo([1.6, 1.2, 2.8], [1.8, 1.8, 3.6], "cr_claro"), cubo([1.8, 1.4, 6.2], [1.8, 1.8, 2.8], "laranja"), cubo([2.2, 1.6, 8.8], [1.6, 1.6, 2], "ouro"),
    ]
    chamas = [
        cubo([-2.6, 7.8, 3], [5.2, 2.4, 2.4], "ouro"), cubo([-1.8, 9.8, 3.2], [3.6, 2, 1.6], "ouro_claro"),
        cubo([-6, 6.8, 0.6], [1.4, 1.6, 1.6], "ouro_claro"), cubo([4.6, 6.8, 0.6], [1.4, 1.6, 1.6], "ouro_claro"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 7.4, 0], cabeca, f"m{p}_corpo"),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_crista", [0, 12.6, -1], crista, f"h{p}_raiz"),
        osso(f"m{p}_asa_e", [-3.2, 6.6, 0], asa_e, f"m{p}_corpo"),
        osso(f"m{p}_asa_d", [3.2, 6.6, 0], asa_d, f"m{p}_corpo"),
        osso(f"m{p}_cauda", [0, 2, 3], cauda, f"m{p}_corpo"),
        osso(f"h{p}_chamas", [0, 8, 3], chamas, f"h{p}_raiz"),
    ]
    anim = _flutua(p, 2.0, 110, 2.2, 0.9)
    anim[f"m{p}_asa_e"] = {"rotation": [0, 0, "math.sin(query.life_time * 260) * 22"]}
    anim[f"m{p}_asa_d"] = {"rotation": [0, 0, "-math.sin(query.life_time * 260) * 22"]}
    anim[f"m{p}_cauda"] = {"rotation": ["math.sin(query.life_time * 130) * 6", "math.sin(query.life_time * 100) * 12", 0]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 60) * 3", "math.sin(query.life_time * 40) * 7", 0]}
    anim[f"h{p}_raiz"] = anim[f"m{p}_raiz"]
    for h in (f"h{p}_crista", f"h{p}_chamas"):
        anim[h] = {"scale": ["0.9 + math.sin(query.life_time * 500) * 0.12", "0.85 + math.sin(query.life_time * 400 + 60) * 0.2", "0.9 + math.sin(query.life_time * 500) * 0.12"]}
    return ossos, {"animation.vulpus.vida.pet_fenix": {"loop": True, "bones": anim}}


# ---------------------------------------------------------------------------------- 42: portal dos minigames
def _portal(p: int, nome: str, cortina_cores: list[str], giro1: list[str], giro2: list[str], cor_gema: str) -> tuple[list[dict], dict]:
    """Portal monolítico (~4 blocos): pilares de pedra escura com faixas douradas e veios de obsidiana, verga em degraus com uma
    gema no alto, runas douradas girando em volta e uma cortina de energia violeta e ciano (a parte que brilha)."""
    moldura = [
        cubo([-24, 0, -9], [48, 3, 18], "pedra_esc"),
        cubo([-21, 3, -7.5], [42, 3, 15], "preto"),
    ]
    for lado in (-1, 1):
        x0 = -19 if lado < 0 else 11
        moldura.append(cubo([x0, 6, -5.5], [8, 57, 11], "pedra_esc"))
        moldura.append(cubo([x0 + 1, 6, -6], [6, 57, 1], "preto"))
        for y in (13, 30, 47):
            moldura.append(cubo([x0 - 0.5, y, -6.2], [9, 2.4, 12.4], "ouro_esc"))
            moldura.append(cubo([x0 + 2.5, y + 0.4, -6.5], [3, 1.6, 0.6], "ouro"))
        for k, y in enumerate((9, 19, 24, 36, 41, 53, 58)):
            moldura.append(cubo([x0 + 1 + (k * 3) % 5, y, -6.3], [1.6, 3.2 + (k % 3), 0.6], "obs_cl"))
        # borda interna violeta
        xi = -11 if lado < 0 else 10
        moldura.append(cubo([xi, 6, -3.2], [1.2, 57, 6.4], "obs_cl"))
    moldura += [
        cubo([-22, 63, -7], [44, 5, 14], "preto"),
        cubo([-17, 68, -6], [34, 4, 12], "pedra_esc"),
        cubo([-10, 72, -5], [20, 4, 10], "preto"),
        cubo([-23, 63.4, -7.4], [46, 1.6, 14.8], "ouro_esc"),
        cubo([-11, 61.8, -3.2], [22, 1.4, 6.4], "obs_cl"),
        cubo([-5, 64, -7.4], [10, 3, 0.6], "ouro"),
    ]
    # pontas de raposa sutis nas pontas da verga (escuras, com o miolo dourado)
    for lado in (-1, 1):
        x0 = -25 if lado < 0 else 21
        moldura.append(cubo([x0, 63, -4], [4, 7, 8], "pedra_esc"))
        moldura.append(cubo([x0 + (0.5 if lado < 0 else 0.5), 70, -3], [3, 5, 6], "preto"))
        moldura.append(cubo([x0 + 1, 64, -4.4], [2, 4, 0.6], "ouro"))
    gema = [cubo([-3, 76, -3], [6, 6, 6], cor_gema), cubo([-1.5, 77.5, -3.4], [3, 3, 0.8], "branco")]

    # cortina de energia: faixas verticais que ondulam
    cortina = []
    n = 9
    for k in range(n):
        x = -9.5 + k * (19 / n)
        cortina.append(cubo([x, 7, -0.8], [19 / n + 0.2, 54, 1.6], cortina_cores[k % len(cortina_cores)]))
    def braco(offset: float, cores: list[str]) -> list[dict]:
        cubos = []
        for arm in range(3):
            for i in range(5):
                r = 2.5 + i * 1.8
                ang = math.radians(arm * 120 + offset + i * 40)
                t = 2.2 - i * 0.2
                cubos.append(cubo([r * math.cos(ang) - t / 2, 33 + r * math.sin(ang) * 1.9 - t / 2, -1.4], [t, t, 2.8], cores[(arm + i) % len(cores)]))
        return cubos

    runas = []
    for k in range(6):
        a = 2 * math.pi * k / 6
        runas.append(cubo([30 * math.cos(a) - 1.5, 33 + 8 * math.sin(a * 2) - 2, 30 * math.sin(a) - 1.5], [3, 4, 3], "ouro"))
        runas.append(cubo([30 * math.cos(a) - 0.7, 33 + 8 * math.sin(a * 2) - 1, 30 * math.sin(a) - 2.1], [1.4, 2, 0.6], "azul_fogo_cl"))
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_moldura", [0, 0, 0], moldura, f"m{p}_raiz"),
        osso(f"m{p}_runas", [0, 33, 0], runas, f"m{p}_raiz"),
        osso(f"h{p}_raiz", [0, 0, 0]),
        osso(f"h{p}_cortina", [0, 33, 0], cortina, f"h{p}_raiz"),
        osso(f"h{p}_giro1", [0, 33, 0], braco(0, giro1), f"h{p}_raiz"),
        osso(f"h{p}_giro2", [0, 33, 0], braco(60, giro2), f"h{p}_raiz"),
        osso(f"h{p}_gema", [0, 79, 0], gema, f"h{p}_raiz"),
    ]
    anim = {
        f"m{p}_raiz": {"scale": 0.85},
        f"h{p}_raiz": {"scale": 0.85},
        f"m{p}_runas": {"rotation": [0, "query.life_time * 24", 0], "position": [0, "math.sin(query.life_time * 90) * 1.2", 0]},
        f"h{p}_cortina": {"scale": [1, "1 + math.sin(query.life_time * 150) * 0.015", 1]},
        f"h{p}_giro1": {"rotation": [0, 0, "query.life_time * 50"]},
        f"h{p}_giro2": {"rotation": [0, 0, "-query.life_time * 80"]},
        f"h{p}_gema": {"scale": ["0.92 + math.sin(query.life_time * 220) * 0.1", "0.92 + math.sin(query.life_time * 220) * 0.1", "0.92 + math.sin(query.life_time * 220) * 0.1"]},
    }
    return ossos, {f"animation.vulpus.vida.{nome}": {"loop": True, "bones": anim}}


def modelo_portal_mg() -> tuple[list[dict], dict]:
    return _portal(M_PORTAL, "portal_mg", ["vortice_a", "vortice_b", "vortice_a", "azul_fogo_esc", "vortice_b"], ["nc_5", "azul_fogo_cl", "vortice_b"], ["vortice_b", "branco", "nc_7"], "azul_fogo_cl")


def modelo_portal_saida() -> tuple[list[dict], dict]:
    """A saída: o mesmo monólito, mas com a energia em tons quentes (laranja e dourado) para ninguém confundir com a entrada."""
    return _portal(M_PORTAL + 1, "portal_saida", ["salam_esc", "salam", "salam_esc", "cr_esc", "salam"], ["ouro_claro", "salam_ponto", "cr_claro"], ["salam", "branco", "ouro"], "ouro_claro")


def _capsula(p: int, nome: str, vel: float = 1.0, tremor: float = 0.0) -> tuple[list[dict], dict]:
    """Máquina de cápsulas do lobby (~1,5 bloco): base vermelha com ouro, cúpula de vidro com bolinhas pulando, manivela."""
    base = [
        cubo([-6, 0, -6], [12, 2, 12], "ouro_esc"),
        cubo([-5.5, 2, -5.5], [11, 7, 11], "cr_verm"),
        cubo([-6, 9, -6], [12, 1.5, 12], "ouro"),
        cubo([-2.5, 2.5, -6], [5, 3, 0.8], "preto"),
        cubo([-1.8, 2.8, -6.3], [3.6, 2.2, 0.5], "madeira_esc"),
        cubo([-3, 6, -6.1], [6, 1.2, 0.4], "ouro_claro"),
        cubo([-5.5, 2, -5.5], [1.2, 7, 1.2], "cr_esc"),
        cubo([4.3, 2, -5.5], [1.2, 7, 1.2], "cr_esc"),
    ]
    cupula = [
        cubo([-5, 10.5, -5], [1, 11, 1], "vidro_esc"),
        cubo([4, 10.5, -5], [1, 11, 1], "vidro_esc"),
        cubo([-5, 10.5, 4], [1, 11, 1], "vidro_esc"),
        cubo([4, 10.5, 4], [1, 11, 1], "vidro_esc"),
        cubo([-5, 21, -5], [10, 1, 10], "ouro"),
        cubo([-1, 22, -1], [2, 1.6, 2], "ouro_esc"),
        cubo([-4.4, 10.5, -4.4], [8.8, 0.8, 8.8], "vidro"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_base", [0, 0, 0], base, f"m{p}_raiz"),
        osso(f"m{p}_cupula", [0, 0, 0], cupula, f"m{p}_raiz"),
        osso(f"m{p}_manivela", [5.5, 7.5, 0], [cubo([5.5, 6.5, -0.7], [1.6, 2, 1.4], "ouro"), cubo([7, 7, -0.4], [2.6, 0.8, 0.8], "ouro_claro"), cubo([9.2, 6.4, -0.8], [1.6, 2, 1.6], "cr_verm")], f"m{p}_base"),
    ]
    bolas = ["rosa", "balao_azul", "bola_roxa", "bola_verde", "laranja", "ouro_claro", "balao_rosa", "cr_claro", "branco"]
    anim: dict = {f"m{p}_manivela": {"rotation": [f"query.life_time * {360 * vel if vel > 1 else 0} + math.sin(query.life_time * 90) * 12", 0, 0]}}
    if tremor:
        anim[f"m{p}_raiz"] = {"position": [f"math.sin(query.life_time * 1500) * {tremor}", f"math.abs(math.sin(query.life_time * 1100)) * {tremor}", f"math.cos(query.life_time * 1300) * {tremor}"]}
    for i, c in enumerate(bolas):
        bx = -3.4 + (i % 3) * 3.0
        bz = -3.4 + (i // 3) * 3.0
        osso_b = f"m{p}_b{i}"
        ossos.append(osso(osso_b, [bx + 1.4, 11.5, bz + 1.4], [cubo([bx, 11.3, bz], [2.8, 2.8, 2.8], c), cubo([bx + 0.5, 13, bz + 0.5], [0.9, 0.9, 0.4], "branco")], f"m{p}_raiz"))
        anim[osso_b] = {
            "position": [f"math.sin(query.life_time * {(70 + i * 23) * vel} + {i * 40}) * 0.8", f"math.abs(math.sin(query.life_time * {(95 + i * 17) * vel} + {i * 55})) * {2.5 + (i % 4)}", f"math.sin(query.life_time * {(60 + i * 19) * vel}) * 0.8"],
            "rotation": [f"math.sin(query.life_time * {(110 + i * 13) * vel}) * 30", f"query.life_time * {(120 + i * 30) * vel}", 0],
        }
    return ossos, {f"animation.vulpus.vida.{nome}": {"loop": True, "bones": anim}}


def modelo_capsula() -> tuple[list[dict], dict]:
    return _capsula(M_CAPSULA, "capsula")


def modelo_capsula_ativa() -> tuple[list[dict], dict]:
    """A mesma máquina em plena abertura: manivela girando, bolinhas em fúria e a caixa tremendo."""
    return _capsula(M_CAPSULA_ATIVA, "capsula_ativa", 2.8, 0.45)


def _bola(p: int, nome: str, cor: str, cor2: str, baixo: str = "branco", baixo2: str = "creme", faixa: str = "ouro") -> tuple[list[dict], dict]:
    """A cápsula que sai da máquina: metade de baixo branca, metade de cima da cor da raridade, faixa dourada no meio."""
    baixo = [
        cubo([-2, 0, -2], [4, 1, 4], baixo),
        cubo([-3, 1, -3], [6, 2.2, 6], baixo),
        cubo([-3.2, 3.2, -3.2], [6.4, 1, 6.4], baixo2),
    ]
    cima = [
        cubo([-3.4, 4.2, -3.4], [6.8, 0.9, 6.8], faixa),
        cubo([-3.2, 5.1, -3.2], [6.4, 2.2, 6.4], cor),
        cubo([-2.4, 7.3, -2.4], [4.8, 1.2, 4.8], cor),
        cubo([-1.4, 8.5, -1.4], [2.8, 0.7, 2.8], cor2),
        cubo([-2.6, 6.2, -3.5], [1.4, 1.6, 0.4], "branco"),
    ]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_baixo", [0, 4, 0], baixo, f"m{p}_raiz"),
        osso(f"m{p}_cima", [0, 4.2, 0], cima, f"m{p}_raiz"),
    ]
    anim = {
        f"m{p}_raiz": {"position": [0, "math.sin(query.life_time * 260) * 0.8 + 4", 0], "rotation": ["math.sin(query.life_time * 190) * 8", "query.life_time * 420", "math.sin(query.life_time * 150) * 10"]},
        f"m{p}_cima": {"position": [0, "math.clamp(math.sin(query.life_time * 600) * 3, 0, 1) * 0.6", 0]},
    }
    return ossos, {f"animation.vulpus.vida.{nome}": {"loop": True, "bones": anim}}


def modelo_bola_comum() -> tuple[list[dict], dict]:
    return _bola(M_BOLA0, "bola_comum", "cinza_claro", "branco")


def modelo_bola_incomum() -> tuple[list[dict], dict]:
    return _bola(M_BOLA0 + 1, "bola_incomum", "bola_verde", "branco")


def modelo_bola_raro() -> tuple[list[dict], dict]:
    return _bola(M_BOLA0 + 2, "bola_raro", "nc_6", "balao_azul_luz")


def modelo_bola_lendario() -> tuple[list[dict], dict]:
    return _bola(M_BOLA0 + 3, "bola_lendario", "ouro", "ouro_claro")



# ================================================================== acervo de pets (modelos 44 a 80)
# Arquétipos reutilizáveis: _quad (quadrúpede/felino/canino sentado), _ave, _dragao e _raposa (acima), mais helpers de
# geometria. Ossos "m<p>_*" usam a luz do mundo; ossos "h<p>_*" brilham (ver HALOS).
def _esp(cubos: list[dict]) -> list[dict]:
    """Espelha em x (como espelhar_x), mas inverte também a rotação por cubo (y e z) e o pivô."""
    out = []
    for c in cubos:
        n = {**c, "origin": [-(c["origin"][0] + c["size"][0]), c["origin"][1], c["origin"][2]]}
        if "rotation" in c:
            r = c["rotation"]
            n["rotation"] = [r[0], -r[1], -r[2]]
            n["pivot"] = [-c["pivot"][0], c["pivot"][1], c["pivot"][2]]
        out.append(n)
    return out


def _redondo(cx: float, y: float, cz: float, w: float, h: float, d: float, cor: str, k: float = 0.9) -> list[dict]:
    """Caixa de quinas cortadas (3 caixas cruzadas da mesma cor), centrada em x e z; y é a base."""
    k = min(k, w / 2 - 0.05, h / 2 - 0.05, d / 2 - 0.05)
    return [
        cubo([cx - w / 2, y + k, cz - d / 2 + k], [w, h - 2 * k, d - 2 * k], cor),
        cubo([cx - w / 2 + k, y, cz - d / 2 + k], [w - 2 * k, h, d - 2 * k], cor),
        cubo([cx - w / 2 + k, y + k, cz - d / 2], [w - 2 * k, h - 2 * k, d], cor),
    ]


def _estrela(cx: float, cy: float, cz: float, r: float, cor: str, miolo: str) -> list[dict]:
    """Brilho em cruz 3D (✦): três hastes finas e um miolo."""
    t = r * 0.38
    return [
        cubo([cx - r, cy - t, cz - t], [2 * r, 2 * t, 2 * t], cor),
        cubo([cx - t, cy - r, cz - t], [2 * t, 2 * r, 2 * t], cor),
        cubo([cx - t, cy - t, cz - r], [2 * t, 2 * t, 2 * r], cor),
        cubo([cx - r * 0.5, cy - r * 0.5, cz - r * 0.5], [r, r, r], miolo),
    ]


def _anel_xy(cx: float, cy: float, cz: float, raio: float, n: int, cores: list[str], t0: float, t1: float, prof: float, ang0: float = 90) -> list[dict]:
    """Anel de cubinhos num plano vertical (xy); o tamanho vai de t0 a t1 ao longo do anel (cabeça de ouroboros etc.)."""
    out = []
    for i in range(n):
        a = math.radians(ang0 + 360 * i / n)
        t = t0 + (t1 - t0) * i / max(1, n - 1)
        out.append(cubo([cx + raio * math.cos(a) - t / 2, cy + raio * math.sin(a) - t / 2, cz - prof / 2], [t, t, prof], cores[i % len(cores)]))
    return out


def _anel_xz(cx: float, cy: float, cz: float, raio: float, n: int, cor: str, t: float, alt: float, cor2: str | None = None) -> list[dict]:
    """Anel horizontal (xz), como um halo de anjo."""
    out = []
    for i in range(n):
        a = math.radians(360 * i / n)
        out.append(cubo([cx + raio * math.cos(a) - t / 2, cy, cz + raio * math.sin(a) - t / 2], [t, alt, t], cor2 if (cor2 and i % 2) else cor))
    return out


def _fim(nome: str, anim: dict) -> dict:
    return {f"animation.vulpus.vida.{nome}": {"loop": True, "bones": anim}}


def _lados(ossos: list[dict], anim: dict, p: int, nome: str, cubos: list[dict], pivo: list[float], pai: str, rot=None, pos=None, esc=None, pre: str = "m") -> None:
    """Par de ossos simétricos: `cubos` e `pivo` são do lado +x (osso "<nome>_d"); o "_e" é o espelho. As funções rot/pos/esc
    recebem s ("-" no lado d, "" no e) para a animação ficar simétrica."""
    for lado, s in (("d", "-"), ("e", "")):
        n = f"{pre}{p}_{nome}_{lado}"
        ossos.append(osso(n, pivo if lado == "d" else pivo_x(pivo), cubos if lado == "d" else _esp(cubos), pai))
        a: dict = {}
        if rot:
            a["rotation"] = rot(s)
        if pos:
            a["position"] = pos(s)
        if esc:
            a["scale"] = esc(s)
        if a:
            anim[n] = a


def _h_de(ossos: list[dict], anim: dict, p: int, curto: str) -> str:
    """Osso h<p>_<curto> que espelha m<p>_<curto> (mesmo pivô e animação, pai espelhado): os cubos que brilham seguem o osso."""
    if curto == "raiz":
        if not any(o["name"] == f"h{p}_raiz" for o in ossos):
            ossos.append(osso(f"h{p}_raiz", [0, 0, 0]))
            if f"m{p}_raiz" in anim:
                anim[f"h{p}_raiz"] = anim[f"m{p}_raiz"]
        return f"h{p}_raiz"
    hn = f"h{p}_{curto}"
    if any(o["name"] == hn for o in ossos):
        return hn
    mo = next(o for o in ossos if o["name"] == f"m{p}_{curto}")
    pai_h = _h_de(ossos, anim, p, mo["parent"][len(f"m{p}_"):])
    ossos.append(osso(hn, mo["pivot"], None, pai_h))
    if f"m{p}_{curto}" in anim:
        anim[hn] = anim[f"m{p}_{curto}"]
    return hn


def _halos(ossos: list[dict], anim: dict, p: int, lista: list | None) -> None:
    """lista de (nome, pai curto ('raiz', 'cabeca', ...), pivô, cubos, animação ou None): ossos h<p>_<nome> que brilham."""
    for nome, pai, pivo, cubos, a in (lista or []):
        pai_h = _h_de(ossos, anim, p, pai)
        ossos.append(osso(f"h{p}_{nome}", pivo, cubos, pai_h))
        if a:
            anim[f"h{p}_{nome}"] = a


def _orbita(ossos: list[dict], anim: dict, p: int, nome: str, pai_osso: str, cy: float, raio: float, cubos: list[dict], vel: float, fase: float = 0,
            bob: float = 1.0, pulso: float = 0.0, pre: str = "m", eixo_y: bool = True) -> None:
    """Corpo celeste girando em volta do eixo y: `cubos` são desenhados em torno da origem e levados a (raio, cy, 0)."""
    on = f"{pre}{p}_{nome}_o"
    ossos.append(osso(on, [0, cy, 0], None, pai_osso))
    anim[on] = {"rotation": [0, f"{fase} + query.life_time * {vel}", 0]}
    n = f"{pre}{p}_{nome}"
    ossos.append(osso(n, [raio, cy, 0], deslocar(cubos, raio, cy, 0), on))
    a: dict = {"position": [0, f"math.sin(query.life_time * {70 + fase % 50} + {fase}) * {bob}", 0]}
    if pulso:
        a["scale"] = f"1 + math.sin(query.life_time * {160 + fase % 40} + {fase}) * {pulso}"
    anim[n] = a


def _brilho_pulso(vel: float = 300, amp: float = 0.12, fase: float = 0) -> dict:
    return {"scale": f"1 + math.sin(query.life_time * {vel} + {fase}) * {amp}"}


def _raio(x: float, y: float, z: float, k: float = 1.0, cor: str = "raio", cor2: str = "raio_cl") -> list[dict]:
    """Raio em zigue-zague (~5k de altura), de frente para -z."""
    return [
        cubo([x + 0.6 * k, y + 3.4 * k, z], [2.6 * k, 1.5 * k, 0.9], cor),
        cubo([x - 0.2 * k, y + 2.0 * k, z], [2.6 * k, 1.5 * k, 0.9], cor),
        cubo([x + 0.4 * k, y + 0.6 * k, z], [2.0 * k, 1.5 * k, 0.9], cor),
        cubo([x + 0.0 * k, y - 0.8 * k, z], [1.2 * k, 1.5 * k, 0.9], cor),
        cubo([x + 1.2 * k, y + 3.9 * k, z - 0.15], [1.0 * k, 0.7 * k, 0.9], cor2),
        cubo([x + 0.4 * k, y + 2.4 * k, z - 0.15], [1.0 * k, 0.7 * k, 0.9], cor2),
    ]


# ---------------------------------------------------------------------------------- arquétipo: quadrúpede sentado
def _orelha(tipo: str, cor: str, interna: str, ponta: str) -> list[dict]:
    """Orelha do lado -x (a do +x é o espelho)."""
    if tipo == "tri":
        return [cubo([-4.6, 12.4, -3], [3.3, 3.2, 2.4], cor), cubo([-4.1, 15.4, -2.6], [2.3, 1.9, 1.6], ponta), cubo([-3.8, 12.6, -3.2], [1.8, 2.6, 0.4], interna)]
    if tipo == "gato":
        return [cubo([-4.8, 12.2, -2.8], [3.4, 2.2, 2], cor), cubo([-4.4, 14.4, -2.5], [2.6, 1.8, 1.6], cor), cubo([-3.9, 16.2, -2.3], [1.4, 1.2, 1.2], ponta), cubo([-4.2, 12.5, -3], [2.2, 3.0, 0.4], interna)]
    if tipo == "redonda":
        return [cubo([-5.8, 11.0, -2.6], [3.4, 3.4, 1.8], cor), cubo([-5.2, 11.5, -3.0], [2.2, 2.2, 0.5], interna)]
    if tipo == "redonda_g":
        return [cubo([-7.0, 10.4, -2.6], [4.8, 4.8, 1.6], cor), cubo([-6.3, 11.0, -3.0], [3.4, 3.4, 0.5], interna)]
    if tipo == "longa":
        return [cubo([-4.4, 12.2, -2.4], [2.6, 7.0, 1.6], cor), cubo([-4.0, 12.6, -2.6], [1.7, 5.6, 0.4], interna)]
    return []


def _cauda(tipo: str, c: str, d: str, t: str, larg: float = 4.4) -> list[dict]:
    if tipo == "fina":
        return [cubo([-0.6, 0.8, 3.8], [1.2, 1.2, 3.2], c), cubo([-0.6, 0.8, 6.4], [1.2, 4.2, 1.2], c), cubo([-0.6, 4.6, 6.4], [1.2, 2.2, 1.2], c), cubo([-0.8, 6.8, 6.3], [1.6, 1.8, 1.4], t)]
    if tipo == "curta":
        return [cubo([-1.6, 0.8, 3.8], [3.2, 3.2, 2.6], c), cubo([-1.3, 1.1, 6.4], [2.6, 2.6, 1.2], t)]
    if tipo == "listrada":
        out = []
        for i in range(6):
            out.append(cubo([-larg / 2, 0.6 + i * 0.15, 3.8 + 2.0 * i], [larg, larg + 0.2, 2.0], d if i % 2 else c))
        out.append(cubo([-larg / 2 - 0.1, 0.9, 15.8], [larg + 0.2, larg + 0.2, 1.4], t))
        return out
    if tipo == "rato":
        return [cubo([-0.4, 0.5 + 0.55 * i, 3.6 + 1.8 * i], [0.8, 0.8, 2.0], c) for i in range(6)]
    if tipo == "lobo":
        return [cubo([-2, 0.2, 3.8], [4, 4.6, 3.6], c), cubo([-2.4, 0, 6.8], [4.8, 5.2, 3.6], d), cubo([-1.6, 0.4, 9.8], [3.2, 3.6, 2.4], t)]
    return [cubo([-2, 0.5, 3.8], [4, 4, 3], c), cubo([-2.5, 0.8, 6.6], [5, 4.8, 3], d), cubo([-2.8, 1.1, 9.4], [5.6, 5.2, 3], t)]


def _focinho(tipo: str, b: str, d: str, nariz: str) -> list[dict]:
    if tipo == "chato":
        return [cubo([-1.9, 5.8, -5.0], [3.8, 2.6, 1.2], b), cubo([-0.7, 7.2, -5.4], [1.4, 1.0, 0.5], nariz), cubo([-0.2, 6.4, -5.3], [0.4, 0.8, 0.3], "preto")]
    if tipo == "longo":
        return [cubo([-1.9, 5.7, -7.4], [3.8, 3.4, 3.5], b), cubo([-1.2, 7.6, -7.9], [2.4, 1.5, 0.7], nariz), cubo([-0.3, 6.2, -7.6], [0.6, 0.8, 0.4], d)]
    if tipo == "ponta":
        return [cubo([-1.5, 5.8, -6.6], [3.0, 2.6, 2.6], b), cubo([-0.8, 7.2, -7.2], [1.6, 1.4, 0.8], nariz)]
    if tipo == "bico":
        return [cubo([-1.5, 6.8, -6.8], [3.0, 2.8, 2.8], "bico"), cubo([-1.1, 5.4, -6.9], [2.2, 1.6, 1.0], "laranja_esc"), cubo([-1.0, 7.4, -7.2], [2.0, 1.2, 0.5], "ouro_esc")]
    if tipo == "nenhum":
        return []
    return [cubo([-2.3, 5.8, -5.4], [4.6, 3.1, 1.6], b), cubo([-0.9, 7.5, -5.8], [1.8, 1.3, 0.6], nariz), cubo([-0.3, 6.5, -5.6], [0.6, 0.9, 0.4], d)]


def _quad(p: int, nome: str, c: str, d: str, b: str, t: str, *, pata: str | None = None, c_cab: str | None = None, topo: str | None = None, bw: float = 7.0,
          orelha: str = "tri", o_cor: str | None = None, o_int: str = "rosa_claro", o_ponta: str | None = None, cauda: str = "fofa", caudas: list[dict] | None = None,
          larg_cauda: float = 4.4, focinho: str = "curto", nariz: str = "preto", olho: str = "preto", olho_h: float = 2.6, bochecha: str = "rosa",
          cab_larg: float = 9.0, dorso: str | None = None, bochechudo: bool = True, cabeca_extra: list[dict] | None = None, corpo_extra: list[dict] | None = None,
          extra_ossos: list[dict] | None = None, extra_anim: dict | None = None, halos: list | None = None, flut: tuple = (0.9, 110, 1.5), escala: float = 0.85,
          anim_cauda: float = 24, cauda_anim_extra: dict | None = None) -> tuple[list[dict], dict]:
    """Quadrúpede chibi sentado, parametrizável: cores (corpo c, sombra d, barriga b, ponta de cauda t), orelhas, cauda, focinho."""
    pata = pata or d
    c_cab = c_cab or c
    topo = topo or d
    dorso = dorso or d
    o_cor = o_cor or c_cab
    o_ponta = o_ponta or d
    hw = cab_larg
    corpo = [
        cubo([-bw / 2, 0, -2.5], [bw, 5.5, 6.5], c),
        cubo([-bw / 2 + 1.2, 0, -2.9], [bw - 2.4, 4, 0.5], b),
        cubo([-bw / 2 - 0.7, 0, 0.3], [2, 3.2, 3.6], d),
        cubo([bw / 2 - 1.3, 0, 0.3], [2, 3.2, 3.6], d),
        cubo([-2.9, 0, -4], [2, 1.7, 2.4], pata),
        cubo([0.9, 0, -4], [2, 1.7, 2.4], pata),
        cubo([-bw / 2 + 0.3, 4.6, -2.8], [bw - 0.6, 1.1, 7], dorso),
    ] + (corpo_extra or [])
    cab = [cubo([-hw / 2, 5.5, -4], [hw, 7, 7.5], c_cab), cubo([-hw / 2, 11.4, -4], [hw, 1.1, 7.5], topo)]
    if bochechudo:
        cab += [cubo([-hw / 2 - 0.8, 6.1, -3.2], [1.1, 2.4, 3.4], c_cab), cubo([hw / 2 - 0.3, 6.1, -3.2], [1.1, 2.4, 3.4], c_cab)]
    cab += _focinho(focinho, b, d, nariz)
    cab += [cubo([-hw / 2 + 1.1, 6.6, -4.3], [1.5, 0.9, 0.4], bochecha), cubo([hw / 2 - 2.6, 6.6, -4.3], [1.5, 0.9, 0.4], bochecha)]
    cab += _olho(-hw / 2 + 1.0, 8.3, -4.3, 1.7, olho_h, olho) + _olho(hw / 2 - 2.7, 8.3, -4.3, 1.7, olho_h, olho) + (cabeca_extra or [])
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, 5.5, 0], cab, f"m{p}_corpo"),
        osso(f"m{p}_cauda", [0, 2, 3.8], caudas or _cauda(cauda, c, d, t, larg_cauda), f"m{p}_corpo"),
    ]
    anim = _flutua(p, flut[0], flut[1], flut[2], escala)
    anim.update({
        f"m{p}_corpo": {"scale": [1, "1 + math.sin(query.life_time * 130) * 0.025", 1]},
        f"m{p}_cabeca": {"rotation": ["math.sin(query.life_time * 50) * 3", "math.sin(query.life_time * 38) * 7", "math.sin(query.life_time * 62) * 4"]},
        f"m{p}_cauda": {"rotation": [0, f"math.sin(query.life_time * 260) * {anim_cauda}", "math.sin(query.life_time * 130) * 4"]},
    })
    if cauda_anim_extra:
        anim[f"m{p}_cauda"] = cauda_anim_extra
    if orelha != "nenhuma":
        o = _orelha(orelha, o_cor, o_int, o_ponta)
        py = 11.5 if orelha.startswith("redonda") else 12.4
        px = 3.6 if orelha.startswith("redonda") else 3.0
        _lados_orelha = (o, _esp(o))
        ossos.append(osso(f"m{p}_orelha_e", [-px, py, -1.8], _lados_orelha[0], f"m{p}_cabeca"))
        ossos.append(osso(f"m{p}_orelha_d", [px, py, -1.8], _lados_orelha[1], f"m{p}_cabeca"))
        anim[f"m{p}_orelha_e"] = {"rotation": [0, 0, "-math.clamp(math.sin(query.life_time * 90) * 3, 0, 1) * 20"]}
        anim[f"m{p}_orelha_d"] = {"rotation": [0, 0, "math.clamp(math.sin(query.life_time * 70 + 40) * 3, 0, 1) * 20"]}
    ossos += extra_ossos or []
    anim.update(extra_anim or {})
    _halos(ossos, anim, p, halos)
    return ossos, _fim(nome, anim)


# ---------------------------------------------------------------------------------- arquétipo: ave
def _ave(p: int, nome: str, c: str, b: str, asa: str, asa2: str, bico: str, pe: str, *, pernas: float = 1.6, corpo_h: float = 6.5, bw: float = 7.4,
         bd: float = 6.5, pescoco: float = 0.0, cab_larg: float = 7.2, cab_c: str | None = None, cauda: list[dict] | None = None, cabeca_extra=None,
         corpo_extra: list[dict] | None = None, asas: str = "dobrada", asa_len: float = 6.0, asa_esp: float = 1.8, bico_tipo: str = "curto",
         olho: str = "preto", bochecha: str = "rosa", perna_larg: float = 1.2, perna_anim: dict | None = None, extra_ossos: list[dict] | None = None,
         extra_anim: dict | None = None, halos: list | None = None, flut: tuple = (1.3, 150, 1.6), escala: float = 0.85, balanco: float = 0,
         asa_amp: float = 18, asa_vel: float = 340) -> tuple[list[dict], dict]:
    cab_c = cab_c or c
    yc = pernas + corpo_h
    yh = yc + pescoco
    corpo = [
        cubo([-bw / 2, pernas, -bd / 2], [bw, corpo_h, bd], c),
        cubo([-bw / 2 + 1.1, pernas + 0.3, -bd / 2 - 0.4], [bw - 2.2, corpo_h - 1.6, 0.5], b),
    ] + (cauda if cauda is not None else [cubo([-1.4, pernas + corpo_h * 0.35, bd / 2 - 0.2], [2.8, 2.2, 2.2], c)]) + (corpo_extra or [])
    if pescoco:
        corpo += [
            cubo([-1.0, yc - 0.6, -1.2], [2.0, pescoco * 0.55 + 0.6, 2.0], cab_c),
            cubo([-1.0, yc + pescoco * 0.55 - 0.6, -2.2], [2.0, pescoco * 0.45 + 1.0, 2.0], cab_c),
        ]
    cab = [
        cubo([-cab_larg / 2, yh - 0.4, -3.4], [cab_larg, 4.8, 6.2], cab_c),
        cubo([-cab_larg / 2 + 0.2, yh + 0.7, -3.7], [1.4, 0.9, 0.4], bochecha),
        cubo([cab_larg / 2 - 1.6, yh + 0.7, -3.7], [1.4, 0.9, 0.4], bochecha),
    ] + _olho(-cab_larg / 2 + 0.9, yh + 1.8, -3.7, 1.5, 2.2, olho) + _olho(cab_larg / 2 - 2.4, yh + 1.8, -3.7, 1.5, 2.2, olho)
    if bico_tipo == "flamingo":
        cab += [cubo([-1.0, yh + 1.0, -5.8], [2.0, 1.6, 2.4], "branco"), cubo([-1.0, yh - 0.1, -7.4], [2.0, 2.2, 1.6], "preto")]
    else:
        cab += [cubo([-1.2, yh + 0.8, -5.4], [2.4, 1.5, 2.0], bico), cubo([-1.0, yh + 0.2, -5.2], [2.0, 0.7, 1.6], bico)]
    if cabeca_extra:
        cab += cabeca_extra(yh)
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]),
        osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cabeca", [0, yh, 0], cab, f"m{p}_corpo"),
    ]
    anim = _flutua(p, flut[0], flut[1], flut[2], escala)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 90) * 5", "math.sin(query.life_time * 50) * 9", "math.sin(query.life_time * 40) * 3"]}
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 130) * 0.02", 1]}
    if balanco:
        anim[f"m{p}_corpo"]["rotation"] = [0, 0, f"math.sin(query.life_time * 90) * {balanco}"]
    # pernas e pés
    perna = [cubo([1.0, 0, -0.6], [perna_larg, pernas + 0.4, 1.2], pe), cubo([0.4, 0, -2.5], [2.6, 0.7, 3.1], pe)]
    for lado, s in (("d", ""), ("e", "")):
        n = f"m{p}_perna_{lado}"
        ossos.append(osso(n, [1.6 if lado == "d" else -1.6, pernas, 0], perna if lado == "d" else _esp(perna), f"m{p}_raiz"))
        if perna_anim and lado in perna_anim:
            anim[n] = perna_anim[lado]
    if asas == "aberta":
        w = [cubo([bw / 2 - 0.2, yc - 1.6, -2.4], [asa_len * 0.6, 1.0, 4.8], asa), cubo([bw / 2 - 0.2 + asa_len * 0.6, yc - 1.4, -2.0], [asa_len * 0.4, 0.9, 4.0], asa2)]
        pv = [bw / 2 - 0.4, yc - 1.1, 0]
    else:
        w = [cubo([bw / 2 - 0.1, pernas + 0.6, -2.2], [asa_esp, corpo_h - 1.0, 4.6], asa), cubo([bw / 2 - 0.1, pernas + 0.1, -1.4], [asa_esp, 1.0, 3.2], asa2)]
        pv = [bw / 2, yc - 0.4, 0]
    _lados(ossos, anim, p, "asa", w, pv, f"m{p}_corpo", rot=lambda s: [0, 0, f"{s}math.sin(query.life_time * {asa_vel}) * {asa_amp}"])
    ossos += extra_ossos or []
    anim.update(extra_anim or {})
    _halos(ossos, anim, p, halos)
    return ossos, _fim(nome, anim)


# ---------------------------------------------------------------------------------- 44: gatinho-novelo
def modelo_pet_gato() -> tuple[list[dict], dict]:
    p = M_GATO
    bigodes = []
    for dy in (0, 0.9):
        bigodes += [cubo([4.5, 6.9 + dy, -4.5], [4.0, 0.25, 0.25], "creme"), cubo([-8.5, 6.9 + dy, -4.5], [4.0, 0.25, 0.25], "creme")]
    testa = [cubo([-0.4, 10.0, -4.2], [0.8, 2.2, 0.4], "laranja_esc"), cubo([-1.9, 10.9, -4.2], [0.8, 1.5, 0.4], "laranja_esc"), cubo([1.1, 10.9, -4.2], [0.8, 1.5, 0.4], "laranja_esc")]
    listras = [cubo([-3.75, 1.2, z], [0.5, 3.2, 0.9], "laranja_esc") for z in (-1.6, 0.2, 2.0)]
    corpo_extra = [cubo([-3.6, 4.1, -2.7], [7.2, 1.0, 6.6], "cr_verm"), cubo([-0.7, 3.2, -3.3], [1.4, 1.4, 0.7], "ouro")] + listras + _esp(listras)
    novelo = (
        _redondo(7.6, 0, -5.0, 5, 5, 5, "nc_8", 1.1)
        + [cubo([4.8, 1.8, -7.7], [5.6, 0.6, 5.4], "rosa"), cubo([7.2, -0.2, -7.7], [0.8, 5.4, 5.4], "rosa_claro"),
           cubo([3.4, 0.3, -5.2], [1.8, 0.5, 0.5], "rosa"), cubo([2.6, 0.3, -4.4], [1.0, 0.5, 1.0], "rosa")]
    )
    ossos = [osso(f"m{p}_novelo", [7.6, 2.5, -5.0], novelo, f"m{p}_raiz")]
    anim = {f"m{p}_novelo": {"rotation": ["math.sin(query.life_time * 60) * 40", 0, 0], "position": [0, 0, "math.sin(query.life_time * 60) * 0.8"]}}
    return _quad(p, "pet_gato", "laranja", "laranja_esc", "creme", "creme", orelha="gato", o_int="rosa", o_ponta="laranja_esc", cauda="fina", focinho="chato",
                 nariz="rosa", cabeca_extra=bigodes + testa, corpo_extra=corpo_extra, extra_ossos=ossos, extra_anim=anim, anim_cauda=32)


# ---------------------------------------------------------------------------------- 45: pinguim desajeitado
def modelo_pet_pinguim() -> tuple[list[dict], dict]:
    p = M_PINGUIM
    cachecol = [
        cubo([-4.3, 6.8, -3.6], [8.6, 1.5, 7.2], "cr_verm"), cubo([-4.3, 7.0, -3.6], [8.6, 0.4, 7.2], "cr_esc"),
        cubo([0.8, 2.8, -3.95], [2.2, 4.4, 0.8], "cr_verm"), cubo([0.8, 3.4, -4.0], [2.2, 0.5, 0.8], "cr_esc"), cubo([0.8, 4.6, -4.0], [2.2, 0.5, 0.8], "cr_esc"),
    ]
    rosto = lambda yh: [cubo([-3.4, yh + 0.9, -3.55], [2.7, 3.3, 0.3], "branco"), cubo([0.7, yh + 0.9, -3.55], [2.7, 3.3, 0.3], "branco")]
    return _ave(p, "pet_pinguim", "pingu", "branco", "pingu", "pingu", "bico", "pe", pernas=1.2, corpo_h=7.4, bw=8.0, bd=6.8, cab_larg=7.6,
                corpo_extra=cachecol, cabeca_extra=rosto, balanco=7, asa_esp=1.6, asa_amp=14, asa_vel=180, flut=(1.0, 180, 1.4))


# ---------------------------------------------------------------------------------- 46: joaninha pontilhada
def modelo_pet_joaninha() -> tuple[list[dict], dict]:
    p = M_JOANINHA
    corpo = [cubo([-4.2, 1.0, -3.0], [8.4, 2.2, 8.0], "preto"), cubo([-0.25, 2.6, -2.8], [0.5, 4.0, 7.6], "preto"), cubo([-2.6, 3.4, -4.0], [5.2, 1.4, 1.6], "preto"),
             cubo([0.5, 3.0, -2.2], [5.2, 0.5, 7.0], "fio")]
    corpo += _esp([cubo([0.5, 3.0, -2.2], [5.2, 0.5, 7.0], "fio")])
    elitro = _redondo(2.4, 2.0, 0.9, 4.3, 4.8, 7.8, "cr_verm", 1.2) + [
        cubo([1.4, 6.65, -1.2], [1.6, 0.35, 1.6], "preto"), cubo([2.3, 6.65, 2.4], [1.4, 0.35, 1.4], "preto"),
        cubo([4.3, 3.2, -0.9], [0.4, 1.6, 1.6], "preto"), cubo([4.3, 3.8, 2.8], [0.4, 1.4, 1.4], "preto"),
        cubo([0.6, 4.6, -3.1], [2.0, 1.8, 0.35], "cr_claro"),
    ]
    cabeca = [
        cubo([-3.8, 1.2, -7.0], [7.6, 4.4, 4.2], "preto"),
        cubo([-3.4, 2.0, -7.2], [2.8, 2.6, 0.4], "branco"), cubo([0.6, 2.0, -7.2], [2.8, 2.6, 0.4], "branco"),
        cubo([-2.6, 2.4, -7.5], [1.3, 1.6, 0.4], "preto"), cubo([1.3, 2.4, -7.5], [1.3, 1.6, 0.4], "preto"),
        cubo([-2.2, 3.3, -7.6], [0.5, 0.5, 0.3], "branco"), cubo([1.7, 3.3, -7.6], [0.5, 0.5, 0.3], "branco"),
        cubo([-3.9, 1.5, -6.9], [1.1, 0.8, 0.3], "rosa"), cubo([2.8, 1.5, -6.9], [1.1, 0.8, 0.3], "rosa"),
        cubo([-0.9, 1.5, -7.4], [1.8, 0.4, 0.3], "cr_esc"),
    ]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 3, -4], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 1.2, 140, 2.0, 1.15)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 70) * 4", "math.sin(query.life_time * 45) * 8", "math.sin(query.life_time * 55) * 4"]}
    _lados(ossos, anim, p, "elitro", elitro, [0.3, 6.4, 0], f"m{p}_corpo", rot=lambda s: [0, 0, f"{s}math.sin(query.life_time * 700) * 6"])
    ant = [cubo([1.4, 5.2, -6.4], [0.5, 3.2, 0.5], "preto"), cubo([1.1, 8.2, -6.7], [1.1, 1.1, 1.1], "cr_verm")]
    _lados(ossos, anim, p, "antena", ant, [1.6, 5.2, -6.2], f"m{p}_cabeca", rot=lambda s: [f"math.sin(query.life_time * 120) * 8", 0, f"{s}math.sin(query.life_time * 90) * 10"])
    for k, z in enumerate((-1.8, 0.6, 3.0)):
        pata = [cubo([3.6, 0.6, z - 0.35], [1.8, 0.6, 0.7], "preto"), cubo([5.0, 0, z - 0.35], [0.7, 1.2, 0.7], "preto")]
        _lados(ossos, anim, p, f"perna{k}", pata, [3.4, 1.0, z], f"m{p}_corpo",
               rot=lambda s, k=k: [f"math.sin(query.life_time * 420 + {k * 110 + (0 if s else 180)}) * 14", 0, 0])
    return ossos, _fim("pet_joaninha", anim)


# ---------------------------------------------------------------------------------- 47: geleiazinha
def modelo_pet_slime() -> tuple[list[dict], dict]:
    p = M_SLIME
    corpo = (
        _redondo(0, 0, 0, 11, 8, 10, "geleia", 2.0)
        + [cubo([-5.8, 0, -5.4], [11.6, 0.5, 10.8], "geleia_cl"),
           cubo([-4.4, 5.2, -5.2], [2.4, 1.6, 0.4], "geleia_cl"), cubo([-4.4, 3.8, -5.2], [1.0, 0.8, 0.4], "geleia_cl"),
           cubo([2.2, 1.0, -5.2], [1.4, 1.4, 0.4], "geleia_esc"), cubo([3.6, 5.6, -5.2], [1.0, 1.0, 0.4], "geleia_esc"),
           cubo([5.4, 2.6, -1.0], [0.4, 1.8, 1.8], "geleia_esc"), cubo([-5.8, 4.6, 1.4], [0.4, 1.4, 1.4], "geleia_esc"),
           cubo([-1.2, 7.6, 1.6], [2.4, 1.6, 2.4], "geleia"), cubo([-0.7, 9.0, 2.0], [1.4, 1.2, 1.4], "geleia_cl"),
           cubo([-3.2, 7.8, -2.4], [1.8, 0.5, 1.8], "geleia_cl")]
        + _olho(-3.5, 3.8, -5.4, 1.7, 2.6) + _olho(1.8, 3.8, -5.4, 1.7, 2.6)
        + [cubo([-1.2, 2.5, -5.3], [2.4, 0.5, 0.4], "geleia_esc"), cubo([-1.8, 2.9, -5.3], [0.6, 0.5, 0.4], "geleia_esc"), cubo([1.2, 2.9, -5.3], [0.6, 0.5, 0.4], "geleia_esc"),
           cubo([-4.8, 2.6, -5.3], [1.5, 0.9, 0.4], "rosa"), cubo([3.3, 2.6, -5.3], [1.5, 0.9, 0.4], "rosa")]
    )
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz")]
    anim = {
        f"m{p}_raiz": {"position": [0, "math.abs(math.sin(query.life_time * 100)) * 3 + 0.4", 0], "scale": 0.85},
        f"m{p}_corpo": {"scale": ["1 - math.sin(query.life_time * 200) * 0.06", "1 + math.sin(query.life_time * 200) * 0.13", "1 - math.sin(query.life_time * 200) * 0.06"]},
    }
    return ossos, _fim("pet_slime", anim)


# ---------------------------------------------------------------------------------- 48: nuvenzinha
def modelo_pet_nuvem() -> tuple[list[dict], dict]:
    p = M_NUVEM
    corpo = (
        _redondo(0, 2.2, 0, 10, 6, 8, "branco", 1.5) + _redondo(-5.2, 3.0, 0.4, 5, 5, 5.6, "branco") + _redondo(5.2, 2.8, 0.2, 5.6, 5, 5.4, "branco")
        + _redondo(-1.8, 7.0, 0, 5.6, 4.4, 5.4, "branco") + _redondo(2.6, 6.6, 0.4, 4.6, 4, 4.6, "branco")
        + [cubo([-4.4, 1.5, -3.4], [8.8, 1.0, 6.8], "nuvem_sombra"), cubo([-7.4, 2.3, -1.6], [4.4, 1.0, 4.0], "nuvem_sombra"), cubo([3.2, 2.1, -2.0], [4.6, 1.0, 4.0], "nuvem_sombra"),
           cubo([-4.5, 5.2, -3.4], [1.4, 1.0, 0.4], "nuvem_sombra")]
        + _olho(-3.2, 3.6, -4.3, 1.6, 2.4) + _olho(1.6, 3.6, -4.3, 1.6, 2.4)
        + [cubo([-4.0, 3.0, -4.2], [1.5, 0.9, 0.4], "rosa"), cubo([2.5, 3.0, -4.2], [1.5, 0.9, 0.4], "rosa"), cubo([-0.8, 2.9, -4.3], [1.6, 0.5, 0.4], "preto")]
    )
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 4, 0], corpo, f"m{p}_raiz")]
    anim = _flutua(p, 1.8, 90, 3.2, 0.9)
    anim[f"m{p}_corpo"] = {"scale": ["1 + math.sin(query.life_time * 100) * 0.04", "1 + math.sin(query.life_time * 100 + 90) * 0.05", "1 + math.sin(query.life_time * 100) * 0.04"]}
    for k, (x, z, off) in enumerate(((-2.6, -0.6, 0), (0.8, 1.0, 3.3), (3.6, -0.8, 6.0))):
        gota = [cubo([x - 0.6, 0, z - 0.6], [1.2, 1.4, 1.2], "azul_fogo_cl"), cubo([x - 0.3, 1.4, z - 0.3], [0.6, 0.8, 0.6], "azul_fogo_cl")]
        ossos.append(osso(f"m{p}_gota{k}", [x, 1.5, z], gota, f"m{p}_raiz"))
        q = f"math.mod(query.life_time * 9 + {off}, 9)"
        anim[f"m{p}_gota{k}"] = {"position": [0, f"-({q}) * 0.9", 0], "scale": f"math.clamp(1 - {q} / 9, 0.05, 1)"}
    return ossos, _fim("pet_nuvem", anim)


# ---------------------------------------------------------------------------------- 49: ouriço de castanha
def modelo_pet_ourico() -> tuple[list[dict], dict]:
    p = M_OURICO
    espinhos = [cubo([-3.6, 2.0, 2.4], [7.2, 3.4, 5.6], "castanha")]
    for ci, (z, h) in enumerate(((1.4, 9.0), (3.2, 8.0), (5.0, 6.4), (6.6, 4.4))):
        for cj, x in enumerate((-2.6, 0.0, 2.6)):
            hh = h - (cj % 2) * 1.2
            espinhos.append(cubo([x - 0.9, 3.2, z - 0.9], [1.8, hh, 1.8], "castanha_esc" if (ci + cj) % 2 == 0 else "castanha"))
            espinhos.append(cubo([x - 0.6, 3.2 + hh, z - 0.6], [1.2, 1.0, 1.2], "castanha_cl"))
    castanha = _redondo(0, 0, 0, 3.6, 3.6, 3.6, "castanha", 0.8) + [cubo([-1.9, 2.3, -1.9], [3.8, 1.4, 3.8], "castanha_cl"), cubo([-0.4, 3.7, -0.4], [0.8, 1.0, 0.8], "madeira_esc"),
                                                                 cubo([-0.9, 0.3, -2.0], [1.0, 1.4, 0.3], "castanha_cl")]
    topo_cab = [cubo([-1.6 + k * 1.1, 12.5, -0.6 + (k % 2) * 1.6], [0.9, 1.8 + (k % 2) * 0.8, 0.9], "castanha_esc") for k in range(4)]
    ossos = [osso(f"m{p}_castanha", [2.2, 1.8, -7.4], deslocar(castanha, 2.2, 0.6, -7.4), f"m{p}_raiz")]
    anim = {f"m{p}_castanha": {"rotation": [0, "query.life_time * 40", 0], "position": [0, "math.sin(query.life_time * 90) * 0.6", 0]}}
    return _quad(p, "pet_ourico", "castanha_cl", "castanha", "creme", "castanha", orelha="redonda", o_int="rosa_claro", focinho="ponta", nariz="preto",
                 cabeca_extra=topo_cab, corpo_extra=espinhos, extra_ossos=ossos, extra_anim=anim, anim_cauda=8, cauda="curta")


# ---------------------------------------------------------------------------------- 50: caracol-doce
def modelo_pet_caracol() -> tuple[list[dict], dict]:
    p = M_CARACOL
    corpo = [cubo([-2.6, 0.8, -3.0], [5.2, 2.6, 10.6], "caracol"), cubo([-2.9, 0, -3.0], [5.8, 0.9, 10.6], "caracol_esc"), cubo([-1.2, 1.4, 7.4], [2.4, 1.6, 1.4], "caracol")]
    cabeca = [
        cubo([-3.2, 1.8, -8.6], [6.4, 5.4, 5.8], "caracol"),
        cubo([-1.0, 3.4, -8.85], [2.0, 0.5, 0.3], "preto"), cubo([-0.5, 3.1, -8.85], [1.0, 0.4, 0.3], "preto"),
        cubo([-3.0, 3.6, -8.8], [1.5, 0.9, 0.3], "rosa"), cubo([1.5, 3.6, -8.8], [1.5, 0.9, 0.3], "rosa"),
        cubo([-1.5, 4.4, -8.8], [3.0, 1.0, 0.25], "caracol_esc"),
    ]
    concha = (
        _redondo(0, 3.0, 3.4, 6.0, 11.0, 11.0, "nc_8", 1.8) + _redondo(0, 4.0, 3.4, 8.0, 9.0, 9.0, "nc_3", 1.5)
        + _redondo(0, 5.2, 3.4, 10.0, 6.6, 6.6, "nc_5", 1.2) + _redondo(0, 6.4, 3.4, 11.6, 4.2, 4.2, "nc_2", 0.8)
        + [cubo([-3.2, 12.9, 2.9], [0.9, 0.9, 0.9], "ouro_claro"), cubo([2.4, 9.5, 8.4], [0.9, 0.9, 0.9], "branco"), cubo([-2.6, 4.2, 8.5], [0.9, 0.9, 0.9], "ouro_claro")]
    )
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 2, -3], cabeca, f"m{p}_corpo"),
             osso(f"m{p}_concha", [0, 5, 3.4], concha, f"m{p}_corpo")]
    anim = _flutua(p, 1.0, 100, 1.4, 0.95)
    anim[f"m{p}_corpo"] = {"scale": [1, 1, "1 + math.sin(query.life_time * 110) * 0.04"]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 60) * 4", "math.sin(query.life_time * 40) * 7", 0]}
    anim[f"m{p}_concha"] = {"rotation": [0, 0, "math.sin(query.life_time * 70) * 3"]}
    talo = [cubo([1.0, 7.0, -7.2], [0.8, 3.4, 0.8], "caracol_esc"), cubo([0.3, 10.2, -7.7], [2.2, 2.2, 2.2], "branco"), cubo([0.8, 10.5, -7.95], [1.2, 1.4, 0.4], "preto"),
            cubo([1.2, 11.3, -8.05], [0.5, 0.5, 0.3], "branco")]
    _lados(ossos, anim, p, "olho", talo, [1.4, 7.0, -6.8], f"m{p}_cabeca", rot=lambda s: [f"math.sin(query.life_time * 100 + {0 if s else 90}) * 9", 0, f"math.sin(query.life_time * 80) * 8"])
    return ossos, _fim("pet_caracol", anim)


# ---------------------------------------------------------------------------------- 51: pombinha-paz
def modelo_pet_pomba() -> tuple[list[dict], dict]:
    p = M_POMBA
    ramo = lambda yh: [
        cubo([-0.3, yh + 1.1, -9.4], [0.6, 0.6, 4.4], "madeira_clara"),
        cubo([-1.8, yh + 1.5, -9.2], [1.4, 0.4, 1.1], "folha"), cubo([0.4, 1.5 + yh, -9.2], [1.4, 0.4, 1.1], "folha"),
        cubo([-1.7, yh + 1.5, -7.6], [1.3, 0.4, 1.0], "folha_esc"), cubo([0.4, yh + 1.5, -7.6], [1.3, 0.4, 1.0], "folha_esc"),
        cubo([-0.6, yh + 1.0, -10.1], [1.2, 0.5, 1.0], "folha"),
    ]
    cauda = [cubo([-2.0, 3.4, 3.0], [4.0, 1.4, 3.2], "branco"), cubo([-1.6, 3.5, 6.0], [3.2, 1.0, 1.6], "cinza_claro")]
    return _ave(p, "pet_pomba", "branco", "creme", "cinza_claro", "branco", "rosa", "cr_claro", pernas=2.0, corpo_h=6.2, bw=7.0, bd=6.4, cab_larg=6.6,
                cauda=cauda, cabeca_extra=ramo, asas="aberta", asa_len=7.5, asa_amp=16, asa_vel=200, bochecha="rosa", flut=(1.8, 110, 2.0))


# ---------------------------------------------------------------------------------- 52: panda sonolento
def modelo_pet_panda() -> tuple[list[dict], dict]:
    p = M_PANDA
    cab = [cubo([-4.4, 7.6, -4.15], [3.2, 3.8, 0.4], "preto"), cubo([1.2, 7.6, -4.15], [3.2, 3.8, 0.4], "preto"),
           cubo([-3.6, 8.5, -4.5], [1.8, 0.35, 0.3], "branco"), cubo([1.8, 8.5, -4.5], [1.8, 0.35, 0.3], "branco"),
           cubo([-0.5, 5.6, -5.1], [1.0, 0.4, 0.4], "preto")]
    corpo = [cubo([-bw_ / 2 - 0.4, 2.4, -3.0], [bw_ + 0.8, 2.4, 2.4], "preto") for bw_ in (7.6,)] + [
        cubo([3.0, 0.2, -5.4], [1.2, 7.0, 1.2], "trevo"), cubo([2.9, 2.2, -5.5], [1.4, 0.4, 1.4], "folha_esc"), cubo([2.9, 4.8, -5.5], [1.4, 0.4, 1.4], "folha_esc"),
        cubo([4.2, 6.4, -5.2], [2.4, 0.4, 0.9], "trevo"), cubo([1.2, 5.8, -5.2], [2.0, 0.4, 0.9], "trevo")]
    zz = []
    for x0, y0, k in ((5.6, 15.5, 1.0), (8.4, 19.2, 0.7)):
        zz += [cubo([x0, y0 + 2.4 * k, -1], [2.6 * k, 0.6 * k, 0.5], "ouro_claro"), cubo([x0 + 1.8 * k, y0 + 1.8 * k, -1], [0.8 * k, 0.6 * k, 0.5], "ouro_claro"),
               cubo([x0 + 1.0 * k, y0 + 1.2 * k, -1], [0.8 * k, 0.6 * k, 0.5], "ouro_claro"), cubo([x0 + 0.2 * k, y0 + 0.6 * k, -1], [0.8 * k, 0.6 * k, 0.5], "ouro_claro"),
               cubo([x0, y0, -1], [2.6 * k, 0.6 * k, 0.5], "ouro_claro")]
    ossos = [osso(f"m{p}_zz", [7, 17, -1], zz, f"m{p}_raiz")]
    q = "math.mod(query.life_time * 5, 6)"
    anim = {f"m{p}_zz": {"position": [f"math.sin(query.life_time * 120) * 0.8", f"{q}", 0], "scale": f"math.clamp(1 - {q} / 6.5, 0.05, 1)"},
            f"m{p}_corpo": {"scale": [1, "1 + math.sin(query.life_time * 70) * 0.04", 1]},
            f"m{p}_cabeca": {"rotation": ["8 + math.sin(query.life_time * 40) * 4", "math.sin(query.life_time * 25) * 5", "math.sin(query.life_time * 35) * 5"]}}
    return _quad(p, "pet_panda", "branco", "preto", "branco", "preto", bw=7.6, cab_larg=9.6, dorso="branco", topo="branco", orelha="redonda", o_cor="preto", o_int="cinza",
                 focinho="chato", bochecha="rosa_claro", olho_h=0.6, cabeca_extra=cab, corpo_extra=corpo, extra_ossos=ossos, extra_anim=anim, cauda="curta", flut=(1.2, 80, 1.5))


# ---------------------------------------------------------------------------------- 53: lobinho-prata
def modelo_pet_lobo() -> tuple[list[dict], dict]:
    p = M_LOBO
    cab = [cubo([-4.8, 7.8, -3.0], [1.1, 1.6, 3.6], "cinza_claro"), cubo([3.7, 7.8, -3.0], [1.1, 1.6, 3.6], "cinza_claro"),
           cubo([-1.0, 12.5, -3.4], [2.0, 0.9, 5.0], "cinza_claro"), cubo([-3.2, 6.8, -4.4], [1.4, 0.4, 0.3], "lobo_esc")]
    corpo = [cubo([-2.6, 3.2, -3.5], [5.2, 2.6, 0.8], "cinza_claro"), cubo([-1.8, 1.6, -3.5], [3.6, 2.0, 0.7], "cinza_claro")]
    return _quad(p, "pet_lobo", "lobo", "lobo_esc", "cinza_claro", "branco", orelha="tri", o_int="rosa_claro", o_ponta="lobo_esc", focinho="longo", nariz="preto",
                 olho="ouro_esc", bochecha="rosa_claro", cauda="lobo", cabeca_extra=cab, corpo_extra=corpo, topo="lobo_esc", flut=(1.0, 100, 1.5))


# ---------------------------------------------------------------------------------- 54: borboleta-lua
def modelo_pet_borboleta() -> tuple[list[dict], dict]:
    p = M_BORBOLETA
    corpo = [
        cubo([-1.4, 0.8, -1.4], [2.8, 3.0, 2.8], "lua_esc"), cubo([-1.2, 0.2, -1.2], [2.4, 0.8, 2.4], "lua"),
        cubo([-1.8, 3.8, -1.8], [3.6, 3.2, 3.6], "lua"), cubo([-1.9, 4.6, -1.95], [3.8, 0.6, 3.9], "lua_esc"),
        cubo([-1.6, 5.0, -2.1], [3.2, 1.6, 0.4], "branco"),
    ]
    cabeca = (
        [cubo([-2.7, 7.0, -2.6], [5.4, 5.0, 5.2], "branco"), cubo([-2.5, 7.8, -2.9], [1.4, 0.9, 0.4], "rosa"), cubo([1.1, 7.8, -2.9], [1.4, 0.9, 0.4], "rosa"),
         cubo([-0.6, 7.9, -2.9], [1.2, 0.4, 0.4], "rosa")]
        + _olho(-2.0, 9.0, -2.9, 1.5, 2.3, "obs_cl") + _olho(0.5, 9.0, -2.9, 1.5, 2.3, "obs_cl")
    )
    asa_s = [cubo([1.8, 6.0, -0.4], [2.8, 6.0, 0.7], "asa_az"), cubo([4.6, 6.6, -0.4], [2.8, 6.6, 0.7], "asa_az"), cubo([7.4, 7.6, -0.4], [2.2, 5.2, 0.7], "asa_az"),
             cubo([2.8, 7.6, -0.8], [2.8, 2.6, 0.4], "asa_li"), cubo([5.4, 8.6, -0.8], [1.8, 2.0, 0.4], "asa_li"), cubo([7.9, 9.8, -0.8], [1.2, 1.2, 0.4], "asa_br"),
             cubo([4.2, 11.2, -0.8], [1.6, 1.0, 0.4], "branco"), cubo([4.6, 11.6, -0.9], [0.8, 0.5, 0.4], "lua")]
    asa_i = [cubo([1.8, 1.6, -0.4], [3.2, 4.4, 0.7], "asa_li"), cubo([5.0, 1.8, -0.4], [2.6, 3.6, 0.7], "asa_li"), cubo([2.2, 0.6, -0.4], [2.2, 1.0, 0.7], "asa_li"),
             cubo([2.8, 2.6, -0.8], [1.6, 1.6, 0.4], "asa_br"), cubo([5.2, 2.8, -0.8], [1.2, 1.2, 0.4], "asa_az")]
    ant = [cubo([0.8, 11.6, -0.4], [0.5, 3.4, 0.5], "asa_li"), cubo([0.5, 14.8, -0.7], [1.1, 1.1, 1.1], "nc_8")]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 7, 0], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 2.4, 70, 3.0, 0.9)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 60) * 4", "math.sin(query.life_time * 35) * 8", "math.sin(query.life_time * 50) * 4"]}
    _lados(ossos, anim, p, "asa_s", asa_s, [1.8, 6.0, 0], f"m{p}_corpo", rot=lambda s: [0, f"{s}(22 + math.sin(query.life_time * 420) * 30)", 0])
    _lados(ossos, anim, p, "asa_i", asa_i, [1.8, 3.0, 0], f"m{p}_corpo", rot=lambda s: [0, f"{s}(18 + math.sin(query.life_time * 420 + 25) * 24)", 0])
    _lados(ossos, anim, p, "antena", ant, [0.8, 11.6, -0.2], f"m{p}_cabeca", rot=lambda s: [f"math.sin(query.life_time * 110) * 8", 0, f"{s}math.sin(query.life_time * 90) * 9"])
    return ossos, _fim("pet_borboleta", anim)


# ---------------------------------------------------------------------------------- 55: abelha-rainha mini
def modelo_pet_abelha() -> tuple[list[dict], dict]:
    p = M_ABELHA
    corpo = []
    for z, w, h, cor in ((-2.4, 7.0, 5.4, "ouro"), (-0.4, 7.4, 5.8, "preto"), (1.6, 7.0, 5.4, "ouro"), (3.6, 6.0, 4.8, "preto"), (5.4, 4.2, 3.4, "ouro")):
        corpo.append(cubo([-w / 2, 1.8 + (5.8 - h) / 2, z], [w, h, 2.0 if z < 5 else 1.4], cor))
    corpo += [cubo([-0.4, 3.0, 6.8], [0.8, 0.8, 1.8], "preto"), cubo([-2.2, 5.2, -2.6], [4.4, 0.5, 6.2], "ouro_claro")]
    corpo += [cubo([1.6, 0.2, z], [0.7, 1.8, 0.7], "preto") for z in (-1.2, 1.2, 3.4)] + [cubo([-2.3, 0.2, z], [0.7, 1.8, 0.7], "preto") for z in (-1.2, 1.2, 3.4)]
    cabeca = (
        [cubo([-4.0, 3.2, -6.8], [8.0, 6.6, 5.2], "ouro"), cubo([-3.6, 3.6, -6.9], [7.2, 1.0, 0.3], "ouro_claro"),
         cubo([-3.9, 4.4, -6.7], [1.5, 0.9, 0.3], "rosa"), cubo([2.4, 4.4, -6.7], [1.5, 0.9, 0.3], "rosa"), cubo([-1.2, 4.2, -7.0], [2.4, 0.5, 0.3], "preto")]
        + _olho(-3.0, 5.6, -7.1, 1.7, 2.6) + _olho(1.3, 5.6, -7.1, 1.7, 2.6)
    )
    coroa = [cubo([-2.0, 9.8, -5.6], [4.0, 1.0, 3.6], "ouro_claro"), cubo([-2.0, 10.8, -5.6], [1.0, 1.4, 1.0], "ouro_claro"), cubo([-0.5, 10.8, -5.6], [1.0, 2.0, 1.0], "ouro_claro"),
             cubo([1.0, 10.8, -5.6], [1.0, 1.4, 1.0], "ouro_claro"), cubo([-2.0, 10.8, -2.8], [1.0, 1.2, 0.8], "ouro_claro"), cubo([1.0, 10.8, -2.8], [1.0, 1.2, 0.8], "ouro_claro"),
             cubo([-0.5, 9.9, -5.9], [1.0, 0.8, 0.4], "cr_verm"), cubo([-0.25, 12.8, -5.35], [0.5, 0.5, 0.5], "cr_claro")]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 6, -3], cabeca, f"m{p}_corpo"),
             osso(f"m{p}_coroa", [0, 9.8, -4], coroa, f"m{p}_cabeca")]
    anim = _flutua(p, 1.8, 210, 2.4, 0.85)
    anim[f"m{p}_corpo"] = {"rotation": ["math.sin(query.life_time * 80) * 3", 0, 0]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 90) * 4", "math.sin(query.life_time * 60) * 8", "math.sin(query.life_time * 70) * 3"]}
    anim[f"m{p}_coroa"] = {"rotation": [0, 0, "math.sin(query.life_time * 100) * 6"]}
    asa = [cubo([2.2, 7.4, -2.0], [6.4, 0.5, 4.0], "vidro"), cubo([7.0, 7.4, -1.4], [3.0, 0.5, 2.8], "vidro_esc"), cubo([2.4, 7.5, -0.4], [3.0, 0.4, 1.2], "branco")]
    _lados(ossos, anim, p, "asa", asa, [2.4, 7.4, 0], f"m{p}_corpo", rot=lambda s: [0, 0, f"{s}math.sin(query.life_time * 1500) * 24"])
    ant = [cubo([3.0, 9.6, -5.8], [0.5, 3.2, 0.5], "preto"), cubo([2.7, 12.6, -6.0], [1.1, 1.1, 1.1], "ouro_claro")]
    _lados(ossos, anim, p, "antena", ant, [3.2, 9.6, -5.6], f"m{p}_cabeca", rot=lambda s: [f"math.sin(query.life_time * 120) * 8", 0, f"{s}math.sin(query.life_time * 100) * 10"])
    return ossos, _fim("pet_abelha", anim)


# ---------------------------------------------------------------------------------- 56: tartaruga-musgo
def modelo_pet_tartaruga() -> tuple[list[dict], dict]:
    p = M_TARTARUGA
    casco = (
        _redondo(0, 2.2, 1.2, 11.6, 3.6, 10.8, "casco", 1.2) + _redondo(0, 5.4, 1.2, 10.0, 3.2, 9.2, "musgo", 1.2) + _redondo(0, 8.0, 1.2, 7.6, 2.4, 6.8, "musgo", 1.0)
        + [cubo([-5.9, 2.6, -2.0], [0.4, 2.6, 1.8], "casco_esc"), cubo([5.5, 2.6, 0.6], [0.4, 2.6, 1.8], "casco_esc"), cubo([-5.9, 2.6, 3.2], [0.4, 2.6, 1.8], "casco_esc"),
           cubo([5.5, 2.6, -4.0], [0.4, 2.6, 1.6], "casco_esc"), cubo([-2.6, 6.0, -3.5], [2.0, 1.6, 0.4], "musgo_esc"), cubo([1.2, 6.6, 5.4], [2.0, 1.8, 0.4], "musgo_esc"),
           cubo([-5.2, 6.4, 0.4], [0.4, 1.8, 2.0], "musgo_esc"), cubo([4.8, 6.0, -1.4], [0.4, 1.8, 2.0], "musgo_esc"),
           cubo([-2.8, 8.8, -0.4], [2.0, 1.8, 2.0], "musgo_esc"), cubo([1.0, 9.6, 2.2], [1.8, 1.4, 1.8], "musgo_esc"), cubo([-0.4, 10.4, 0.6], [0.8, 1.8, 0.8], "folha_esc"),
           cubo([-2.0, 12.0, 0.2], [2.0, 0.5, 1.2], "folha"), cubo([0.2, 12.4, 0.2], [2.0, 0.5, 1.2], "folha"), cubo([-0.6, 12.8, 0.0], [1.2, 1.0, 1.2], "rosa")]
        + [cubo([-5.0, 0.8, -3.6], [10.0, 1.6, 10.8], "tarta"), cubo([-0.8, 1.2, 6.2], [1.6, 1.6, 2.4], "tarta")]
    )
    cabeca = (
        [cubo([-3.4, 1.8, -9.6], [6.8, 5.6, 5.8], "tarta"), cubo([-3.0, 1.9, -9.8], [6.0, 1.0, 0.3], "creme"), cubo([-3.3, 3.2, -9.8], [1.4, 0.9, 0.3], "rosa"),
         cubo([1.9, 3.2, -9.8], [1.4, 0.9, 0.3], "rosa"), cubo([-1.0, 3.0, -9.9], [2.0, 0.4, 0.3], "preto"), cubo([-1.6, 3.4, -9.9], [0.6, 0.5, 0.3], "preto"), cubo([1.0, 3.4, -9.9], [0.6, 0.5, 0.3], "preto")]
        + _olho(-2.7, 4.2, -9.9, 1.6, 2.4) + _olho(1.1, 4.2, -9.9, 1.6, 2.4)
    )
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_casco", [0, 0, 0], casco, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 3, -4], cabeca, f"m{p}_casco")]
    anim = _flutua(p, 1.1, 85, 1.4, 0.95)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 50) * 4", "math.sin(query.life_time * 30) * 9", 0], "position": [0, 0, "math.sin(query.life_time * 50) * 0.6"]}
    anim[f"m{p}_casco"] = {"scale": [1, "1 + math.sin(query.life_time * 90) * 0.025", 1]}
    pf = [cubo([4.0, 0, -4.4], [3.2, 2.6, 3.4], "tarta"), cubo([4.2, 0, -5.0], [2.8, 0.8, 0.7], "creme")]
    pt = [cubo([4.0, 0, 3.0], [3.2, 2.6, 3.4], "tarta"), cubo([4.2, 0, 2.5], [2.8, 0.8, 0.7], "creme")]
    _lados(ossos, anim, p, "pata_f", pf, [4.8, 2.4, -3.0], f"m{p}_casco", rot=lambda s: [f"math.sin(query.life_time * 110 + {0 if s else 180}) * 18", 0, 0])
    _lados(ossos, anim, p, "pata_t", pt, [4.8, 2.4, 4.4], f"m{p}_casco", rot=lambda s: [f"math.sin(query.life_time * 110 + {180 if s else 0}) * 18", 0, 0])
    return ossos, _fim("pet_tartaruga", anim)


# ---------------------------------------------------------------------------------- 57: flamingo rosado
def modelo_pet_flamingo() -> tuple[list[dict], dict]:
    p = M_FLAMINGO
    cauda = [cubo([-1.6, 8.6, 2.8], [3.2, 2.4, 3.0], "flamingo"), cubo([-1.2, 8.7, 5.6], [2.4, 1.8, 1.8], "flamingo_esc")]
    crista = lambda yh: [cubo([-2.2, yh + 3.8, -1.2], [4.4, 1.0, 2.2], "flamingo_cl")]
    perna_anim = {"d": {"scale": [1, "0.4 + math.sin(query.life_time * 30) * 0.02", 1], "rotation": ["math.sin(query.life_time * 50) * 4", 0, 0]},
                  "e": {"rotation": [0, 0, "math.sin(query.life_time * 60) * 2"]}}
    return _ave(p, "pet_flamingo", "flamingo", "flamingo_cl", "flamingo", "preto", "branco", "flamingo_esc", pernas=8.5, corpo_h=5.4, bw=6.4, bd=6.2, pescoco=6.0,
                cab_larg=5.6, cauda=cauda, cabeca_extra=crista, bico_tipo="flamingo", perna_larg=0.9, perna_anim=perna_anim, bochecha="flamingo_cl", asa_esp=1.2,
                asa_amp=8, asa_vel=120, escala=0.62, flut=(1.6, 90, 1.7))


# ---------------------------------------------------------------------------------- 58: ratinho-queijo
def modelo_pet_ratinho() -> tuple[list[dict], dict]:
    p = M_RATINHO
    dentes = [cubo([-0.8, 5.0, -6.1], [0.8, 1.1, 0.4], "branco"), cubo([0.0, 5.0, -6.1], [0.8, 1.1, 0.4], "branco"),
              cubo([4.5, 7.2, -4.5], [3.4, 0.22, 0.22], "fio"), cubo([4.5, 6.6, -4.5], [3.4, 0.22, 0.22], "fio"), cubo([-7.9, 7.2, -4.5], [3.4, 0.22, 0.22], "fio"), cubo([-7.9, 6.6, -4.5], [3.4, 0.22, 0.22], "fio")]
    queijo = [cubo([5.2, 0, -7.4], [6.0, 1.6, 6.0], "ouro"), cubo([5.2, 1.6, -7.4], [4.2, 1.6, 6.0], "ouro"), cubo([5.2, 3.2, -7.4], [2.4, 1.4, 6.0], "ouro_claro"),
              cubo([5.8, 0.4, -7.55], [1.3, 0.9, 0.3], "ouro_esc"), cubo([8.0, 0.5, -7.55], [1.1, 0.8, 0.3], "ouro_esc"), cubo([5.9, 2.0, -7.55], [1.1, 0.8, 0.3], "ouro_esc"),
              cubo([11.0, 0.5, -5.4], [0.3, 0.9, 1.2], "ouro_esc"), cubo([5.4, 1.0, -1.6], [1.2, 1.0, 0.3], "ouro_esc")]
    ossos = [osso(f"m{p}_queijo", [8.2, 0, -4.4], queijo, f"m{p}_raiz")]
    anim = {f"m{p}_queijo": {"rotation": [0, "math.sin(query.life_time * 40) * 6", 0], "position": [0, "math.abs(math.sin(query.life_time * 90)) * 0.5", 0]}}
    return _quad(p, "pet_ratinho", "cinza_claro", "cinza", "branco", "rosa", orelha="redonda_g", o_cor="cinza_claro", o_int="rosa", focinho="ponta", nariz="rosa",
                 cauda="rato", larg_cauda=0.8, cabeca_extra=dentes, extra_ossos=ossos, extra_anim=anim, escala=0.8, bochecha="rosa_claro", anim_cauda=34, flut=(1.2, 140, 1.5))


# ---------------------------------------------------------------------------------- 59: tigrinho-trovão
def modelo_pet_tigre() -> tuple[list[dict], dict]:
    p = M_TIGRE
    lis = [cubo([-3.75, 1.0, z], [0.5, 3.6, 0.8], "preto") for z in (-1.8, 0.0, 1.8, 3.4)]
    cab = [cubo([-0.4, 10.0, -4.2], [0.8, 2.4, 0.4], "preto"), cubo([-1.9, 10.9, -4.2], [0.8, 1.4, 0.4], "preto"), cubo([1.1, 10.9, -4.2], [0.8, 1.4, 0.4], "preto"),
           cubo([-4.6, 8.6, -3.4], [0.3, 0.8, 1.6], "preto"), cubo([4.3, 8.6, -3.4], [0.3, 0.8, 1.6], "preto"), cubo([-4.6, 10.2, -3.4], [0.3, 0.8, 1.6], "preto"), cubo([4.3, 10.2, -3.4], [0.3, 0.8, 1.6], "preto")]
    raio_testa = _raio(-1.2, 12.0, -3.0, 0.8)
    halos = [
        ("raio_testa", "cabeca", [0, 12.4, -3], raio_testa, _brilho_pulso(500, 0.12)),
        ("raio_e", "raiz", [-10, 8, 0], _raio(-10, 6, -1.2, 1.3), {"scale": "1 + math.sin(query.life_time * 400) * 0.15", "position": [0, "math.sin(query.life_time * 120) * 1.2", 0]}),
        ("raio_d", "raiz", [10, 8, 0], _raio(8.4, 7, -1.2, 1.3), {"scale": "1 + math.sin(query.life_time * 400 + 90) * 0.15", "position": [0, "math.sin(query.life_time * 120 + 90) * 1.2", 0]}),
    ]
    return _quad(p, "pet_tigre", "laranja", "laranja_esc", "creme", "preto", orelha="redonda", o_cor="laranja", o_int="creme", o_ponta="laranja_esc", caudas=_cauda("listrada", "laranja", "preto", "preto", 2.8),
                 focinho="chato", nariz="rosa", bochecha="rosa_claro", cabeca_extra=cab, corpo_extra=lis + _esp(lis), halos=halos, anim_cauda=18, cauda_anim_extra=None)
    # (a cauda listrada usa as cores c/d: laranja e laranja_esc; a ponta é preta)


# ---------------------------------------------------------------------------------- 60: unicórnio-pastel
def modelo_pet_unicornio() -> tuple[list[dict], dict]:
    p = M_UNICORNIO
    pa = ["pa_1", "pa_2", "pa_3", "pa_4", "pa_5", "pa_6"]
    chifre = [cubo([-0.8, 12.4, -3.6], [1.6, 1.6, 1.6], "ouro_claro"), cubo([-0.6, 14.0, -3.5], [1.2, 1.6, 1.2], "ouro"), cubo([-0.4, 15.6, -3.4], [0.8, 1.4, 0.8], "ouro_claro"),
              cubo([-0.2, 17.0, -3.3], [0.4, 1.0, 0.4], "branco")]
    franja = [cubo([-1.8 + 1.2 * k, 11.0 - (k % 2) * 0.8, -4.5], [1.2, 2.0 + (k % 2) * 0.8, 0.7], pa[k]) for k in range(4)]
    crina = []
    for k in range(6):
        crina.append(cubo([4.3, 12.6 - k * 1.6, -3.0 + k * 1.2], [1.4, 2.2, 1.6], pa[k]))
        crina.append(cubo([-5.7, 12.6 - k * 1.6, -3.0 + k * 1.2], [1.4, 2.2, 1.6], pa[(k + 3) % 6]))
    crina_c = [cubo([-0.7, 11.6 - k * 1.4, 3.4 + k * 0.5], [1.4, 2.0, 1.6], pa[k]) for k in range(6)] + [cubo([-0.7, 12.6, -1.0], [1.4, 1.0, 5], pa[0])]
    cauda = [cubo([-1.4 + (k % 2) * 0.4, 0.4 + k * 0.5, 3.8 + k * 1.8], [2.8 - k * 0.1, 2.2, 2.2], pa[k]) for k in range(6)]
    cauda += [cubo([-2.0, 0.2, 4.6], [1.0, 3.6, 2.2], "pa_5"), cubo([1.0, 0.2, 5.0], [1.0, 3.2, 2.2], "pa_4")]
    ossos = [osso(f"m{p}_crina", [0, 12, 0], crina + crina_c, f"m{p}_cabeca")]
    anim = {f"m{p}_crina": {"rotation": ["math.sin(query.life_time * 90) * 4", 0, "math.sin(query.life_time * 120) * 5"]}}
    corpo = [cubo([-3.6, 4.6, -2.6], [7.2, 1.2, 1.0], "pa_2")]
    return _quad(p, "pet_unicornio", "branco", "lua", "branco", "pa_5", orelha="tri", o_cor="branco", o_int="pa_1", o_ponta="pa_1", focinho="longo", nariz="pa_1",
                 bochecha="pa_1", pata="pa_6", cabeca_extra=chifre + franja, corpo_extra=corpo, caudas=cauda, extra_ossos=ossos, extra_anim=anim, topo="branco", anim_cauda=30)


# ---------------------------------------------------------------------------------- 61: medusa-estrela
def modelo_pet_medusa() -> tuple[list[dict], dict]:
    p = M_MEDUSA
    sino = (
        _redondo(0, 8.5, 0, 12.0, 2.8, 12.0, "medusa", 1.4) + _redondo(0, 11.0, 0, 10.4, 3.2, 10.4, "medusa", 1.5) + _redondo(0, 14.0, 0, 8.0, 2.8, 8.0, "medusa_cl", 1.2)
        + _redondo(0, 16.6, 0, 4.6, 1.8, 4.6, "medusa_cl", 0.8)
        + [cubo([-6.2, 8.3, -6.2], [12.4, 0.7, 12.4], "medusa_esc"), cubo([-5.4, 11.0, -5.5], [10.8, 0.5, 0.3], "medusa_esc"), cubo([-1.2, 18.2, -1.2], [2.4, 0.6, 2.4], "branco")]
        + _estrela(0, 20.0, 0, 1.8, "ouro", "ouro_claro")
        + _olho(-3.4, 11.8, -5.5, 1.7, 2.3) + _olho(1.7, 11.8, -5.5, 1.7, 2.3)
        + [cubo([-4.8, 11.3, -5.45], [1.6, 0.9, 0.4], "rosa"), cubo([3.2, 11.3, -5.45], [1.6, 0.9, 0.4], "rosa"), cubo([-0.8, 11.3, -5.45], [1.6, 0.5, 0.4], "medusa_esc")]
    )
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"h{p}_raiz", [0, 0, 0]), osso(f"h{p}_sino", [0, 8.5, 0], sino, f"h{p}_raiz")]
    anim = _flutua(p, 2.4, 70, 3.6, 0.85)
    anim[f"h{p}_raiz"] = anim[f"m{p}_raiz"]
    anim[f"h{p}_sino"] = {"scale": ["1 + math.sin(query.life_time * 170) * 0.06", "1 - math.sin(query.life_time * 170) * 0.08", "1 + math.sin(query.life_time * 170) * 0.06"]}
    tent = [(-4.2, -3.6, "medusa"), (0.2, -4.4, "medusa_cl"), (4.2, -3.2, "medusa"), (-4.6, 2.6, "medusa_cl"), (0.0, 4.2, "medusa"), (4.4, 2.8, "medusa_cl"), (-1.8, 0.0, "nc_8"), (2.0, 0.4, "nc_7")]
    for k, (x, z, cor) in enumerate(tent):
        pai = f"h{p}_raiz"
        for j in range(5):
            n = f"h{p}_t{k}_{j}"
            y0 = 8.4 - j * 2.1
            seg = [cubo([x - 0.8 + j * 0.1, y0 - 2.1, z - 0.8 + j * 0.1], [1.6 - j * 0.2, 2.2, 1.6 - j * 0.2], cor if j % 2 == 0 else "medusa_cl")]
            ossos.append(osso(n, [x, y0, z], seg, pai))
            anim[n] = {"rotation": [f"math.sin(query.life_time * 150 - {j * 60} + {k * 45}) * 14", 0, f"math.sin(query.life_time * 130 - {j * 55} + {k * 70}) * 14"]}
            pai = n
    return ossos, _fim("pet_medusa", anim)


# ---------------------------------------------------------------------------------- 62: golem de cristal
def modelo_pet_golem() -> tuple[list[dict], dict]:
    p = M_GOLEM
    corpo = (
        _redondo(0, 0, 0.4, 9.0, 5.4, 7.0, "pedra_cl", 0.8) + [cubo([-3.0, 0, -3.3], [6.0, 4.2, 0.6], "cinza_claro"), cubo([-3.0, 0.8, -3.7], [1.4, 0.5, 0.4], "pedra"),
                                                                   cubo([-4.6, 4.8, -3.0], [9.2, 1.2, 7.0], "pedra"), cubo([-3.4, 0, 3.8], [2.6, 2.0, 2.0], "pedra"), cubo([0.8, 0, 3.8], [2.6, 2.0, 2.0], "pedra")]
    )
    cabeca = (
        _redondo(0, 5.4, -0.2, 10.0, 7.0, 8.0, "pedra_cl", 0.9)
        + [cubo([-5.0, 6.0, -4.2], [10.0, 0.7, 0.5], "pedra"), cubo([-4.4, 11.0, -3.6], [8.8, 1.0, 7.0], "pedra"), cubo([-2.6, 7.2, -4.4], [5.2, 2.6, 0.5], "cinza_claro"),
           cubo([-1.0, 7.4, -4.8], [2.0, 0.5, 0.4], "pedra")]
    )
    punho = _redondo(0, 0, 0, 4.0, 3.8, 4.0, "pedra", 0.7) + [cubo([-1.8, 3.6, -1.8], [3.6, 0.8, 3.6], "cinza_claro")]
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 5.4, 0], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 1.4, 90, 2.0, 0.85)
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 100) * 0.02", 1]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 50) * 2", "math.sin(query.life_time * 32) * 9", 0]}
    _lados(ossos, anim, p, "punho", deslocar(punho, 8.4, 2.4, -2.4), [8.4, 4.0, -2.4], f"m{p}_raiz", pos=lambda s: [0, f"math.sin(query.life_time * 110 + {0 if s else 150}) * 1.4", f"math.sin(query.life_time * 80 + {0 if s else 150}) * 0.8"],
            rot=lambda s: [f"math.sin(query.life_time * 70) * 8", 0, 0])
    # cristais que brilham: ombros, costas, cabeça, núcleo no peito, olhos
    cr_c = [cubo([-1.0, 11.8, -1.2], [2.0, 3.8, 2.0], "cristal"), cubo([-0.6, 15.4, -0.8], [1.2, 2.2, 1.2], "cristal_cl"), cubo([1.6, 11.8, 0.4], [1.6, 2.6, 1.6], "cristal"),
            cubo([-3.2, 11.8, 0.2], [1.6, 2.2, 1.6], "cristal_esc"), cubo([-0.4, 11.8, 2.0], [1.4, 3.0, 1.4], "cristal_esc")]
    cr_o = [cubo([-3.4, 8.0, -4.8], [2.0, 1.8, 0.5], "cristal_cl"), cubo([1.4, 8.0, -4.8], [2.0, 1.8, 0.5], "cristal_cl"), cubo([-2.8, 8.3, -4.95], [0.8, 0.8, 0.3], "branco"), cubo([2.0, 8.3, -4.95], [0.8, 0.8, 0.3], "branco")]
    ombro = [cubo([4.4, 5.2, -1.0], [1.8, 3.6, 1.8], "cristal"), cubo([4.8, 8.4, -0.6], [1.0, 2.4, 1.0], "cristal_cl"), cubo([5.4, 5.0, 1.4], [1.4, 2.4, 1.4], "cristal_esc")]
    costas = [cubo([-1.6, 5.4, 3.6], [3.2, 4.2, 1.8], "cristal"), cubo([-0.8, 9.4, 4.0], [1.6, 2.6, 1.2], "cristal_cl"), cubo([-3.4, 5.2, 3.6], [1.4, 2.6, 1.4], "cristal_esc"), cubo([2.4, 5.2, 3.6], [1.4, 3.2, 1.4], "cristal_esc")]
    nucleo = [cubo([-1.4, 1.4, -3.9], [2.8, 2.8, 0.5], "cristal_cl"), cubo([-0.6, 2.2, -4.2], [1.2, 1.2, 0.4], "branco")]
    _halos(ossos, anim, p, [
        ("cristais", "cabeca", [0, 11, 0], cr_c, _brilho_pulso(180, 0.06)),
        ("olhos", "cabeca", [0, 8, -4], cr_o, None),
        ("ombro_d", "corpo", [5, 6, 0], ombro, _brilho_pulso(150, 0.08)),
        ("ombro_e", "corpo", [-5, 6, 0], _esp(ombro), _brilho_pulso(150, 0.08, 90)),
        ("costas", "corpo", [0, 6, 4], costas, _brilho_pulso(130, 0.07, 45)),
        ("nucleo", "corpo", [0, 2.8, -4], nucleo, _brilho_pulso(260, 0.15)),
    ])
    return ossos, _fim("pet_golem", anim)


# ---------------------------------------------------------------------------------- 63: yeti fofinho
def modelo_pet_yeti() -> tuple[list[dict], dict]:
    p = M_YETI
    cab = [cubo([-3.4, 5.9, -4.35], [6.8, 5.4, 0.5], "yeti_esc"), cubo([-1.6, 5.3, -4.7], [1.0, 1.0, 0.4], "branco"), cubo([0.6, 5.3, -4.7], [1.0, 1.0, 0.4], "branco"),
           cubo([-2.4, 5.8, -4.7], [4.8, 0.5, 0.4], "preto")]
    cab += [cubo([-3.6 + k * 1.5, 12.5, -2.6 + (k % 2) * 1.8], [1.4, 1.8 + (k % 2), 1.4], "yeti") for k in range(5)]
    cab += [cubo([-5.6, 9.4, -2.0], [1.4, 2.6, 2.6], "yeti_esc"), cubo([4.2, 9.4, -2.0], [1.4, 2.6, 2.6], "yeti_esc")]
    cab += [cubo([-2.6, 11.8, -4.2], [2.0, 1.2, 0.4], "branco"), cubo([0.6, 11.8, -4.2], [2.0, 1.2, 0.4], "branco")]
    bracos = [cubo([-5.6, 1.0, -2.6], [2.2, 5.0, 3.6], "yeti"), cubo([-5.8, 0.4, -3.0], [2.6, 2.0, 4.0], "yeti_esc")]
    corpo = bracos + _esp(bracos) + [cubo([-3.6, 0, -3.3], [7.2, 4.4, 0.6], "branco"), cubo([-4.4, 3.0, 4.2], [8.8, 2.6, 1.6], "yeti")]
    return _quad(p, "pet_yeti", "yeti", "yeti_esc", "branco", "yeti_esc", bw=8.0, cab_larg=10.0, orelha="redonda", o_cor="yeti", o_int="yeti_esc", focinho="nenhum",
                 bochecha="rosa_claro", cabeca_extra=cab, corpo_extra=corpo, cauda="curta", flut=(1.0, 90, 1.4), topo="yeti_esc", dorso="yeti", pata="yeti_esc")


# ---------------------------------------------------------------------------------- 64: raposa-das-neves
def modelo_pet_raposa_neve() -> tuple[list[dict], dict]:
    cabeca = [cubo([-1.4, 11.6, -4.3], [2.8, 0.9, 0.5], "azul_fogo_cl"), cubo([-0.7, 10.7, -4.3], [1.4, 0.9, 0.5], "azul_fogo"),
              cubo([-4.8, 12.1, -1.0], [1.2, 1.2, 1.2], "branco"), cubo([3.6, 12.3, 0.4], [1.0, 1.0, 1.0], "branco")]
    cachecol = [cubo([-3.8, 3.8, -2.8], [7.6, 1.5, 7.0], "azul_fogo"), cubo([-3.8, 4.0, -2.8], [7.6, 0.4, 7.0], "azul_fogo_esc"), cubo([1.0, 1.2, -3.2], [2.0, 3.0, 0.8], "azul_fogo"),
                cubo([1.0, 1.6, -3.3], [2.0, 0.4, 0.8], "azul_fogo_esc")]
    return _raposa(M_RAPOSA_NEVE, "pet_raposa_neve", "yeti", "yeti_esc", "branco", "azul_fogo_cl", "rosa_claro", "yeti_esc", cabeca, cachecol, None, "azul_fogo_esc", "azul_fogo_cl")


# ---------------------------------------------------------------------------------- 65: tanuki sorridente
def modelo_pet_tanuki() -> tuple[list[dict], dict]:
    p = M_TANUKI
    cab = [cubo([-4.4, 7.9, -4.15], [3.2, 3.4, 0.4], "tanuki_esc"), cubo([1.2, 7.9, -4.15], [3.2, 3.4, 0.4], "tanuki_esc"),
           cubo([-1.8, 6.2, -5.1], [3.6, 0.5, 0.4], "preto"), cubo([-2.4, 6.7, -5.1], [0.6, 0.6, 0.4], "preto"), cubo([1.8, 6.7, -5.1], [0.6, 0.6, 0.4], "preto")]
    corpo = [cubo([-3.3, 0.2, -3.3], [6.6, 4.6, 0.8], "tanuki_cl"), cubo([-3.6, 3.4, -2.7], [7.2, 1.0, 6.6], "tanuki_esc")]
    folha = _redondo(0, 12.5, -0.2, 5.0, 0.8, 3.8, "folha", 0.3) + [cubo([-0.25, 13.2, -1.7], [0.5, 0.3, 3.4], "folha_esc"), cubo([-0.8, 12.5, -2.3], [1.6, 0.8, 0.7], "folha"),
                                                                    cubo([-0.5, 12.5, 1.8], [1.0, 0.8, 0.8], "folha_esc")]
    ossos = [osso(f"m{p}_folha", [0, 12.5, -0.2], folha, f"m{p}_cabeca")]
    anim = {f"m{p}_folha": {"rotation": ["math.sin(query.life_time * 70) * 4", "math.sin(query.life_time * 45) * 6", "math.sin(query.life_time * 55) * 5"]}}
    return _quad(p, "pet_tanuki", "tanuki", "tanuki_esc", "tanuki_cl", "tanuki_esc", orelha="redonda", o_cor="tanuki_esc", o_int="tanuki_cl", focinho="chato", nariz="preto",
                 bochecha="rosa", cabeca_extra=cab, corpo_extra=corpo, cauda="listrada", larg_cauda=4.6, extra_ossos=ossos, extra_anim=anim, topo="tanuki_esc")
    # a cauda listrada alterna tanuki / tanuki_esc


# ---------------------------------------------------------------------------------- 66: kirin celeste
def modelo_pet_kirin() -> tuple[list[dict], dict]:
    p = M_KIRIN
    chifre_e = [cubo([-3.6, 12.6, -1.4], [1.0, 2.8, 1.0], "ouro"), cubo([-4.4, 15.0, -1.4], [1.0, 2.2, 1.0], "ouro"), cubo([-5.6, 16.6, -1.4], [1.4, 1.0, 1.0], "ouro_claro"),
                cubo([-2.8, 14.6, -1.4], [0.8, 2.0, 0.8], "ouro_claro"), cubo([-3.0, 12.4, -1.7], [1.8, 0.8, 1.6], "ouro_esc")]
    cab = chifre_e + _esp(chifre_e) + [cubo([-0.4, 4.4, -5.6], [0.8, 2.0, 0.8], "ouro_claro"), cubo([-4.3, 9.8, -3.8], [0.4, 2.0, 1.4], "ouro_esc"), cubo([3.9, 9.8, -3.8], [0.4, 2.0, 1.4], "ouro_esc")]
    corpo = [cubo([-3.6, 3.0, -3.0], [7.2, 0.8, 0.8], "ouro"), cubo([-0.8, 2.2, -3.3], [1.6, 1.6, 0.6], "ciano")]
    halos = [
        ("crina", "cabeca", [0, 9, 4], [cubo([-1.0, 10.2 - k * 1.5, 3.4 + k * 0.4], [2.0, 3.0, 1.6], "ciano" if k % 2 == 0 else "ciano_cl") for k in range(4)]
                                         + [cubo([-0.5, 12.8, 2.0], [1.0, 1.8, 1.0], "ciano_cl"), cubo([-4.5, 8.0, 2.0], [1.4, 2.4, 1.4], "ciano"), cubo([3.1, 8.0, 2.0], [1.4, 2.4, 1.4], "ciano")],
         {"scale": ["1 + math.sin(query.life_time * 420) * 0.08", "1 + math.sin(query.life_time * 340) * 0.14", 1]}),
        ("dorso", "corpo", [0, 5.6, 1], [cubo([-0.8, 5.7, -1.8 + k * 1.9], [1.6, 2.2 + (k % 2) * 1.2, 1.4], "ciano" if k % 2 == 0 else "ciano_cl") for k in range(4)],
         {"scale": ["1 + math.sin(query.life_time * 380) * 0.08", "1 + math.sin(query.life_time * 300 + 60) * 0.16", 1]}),
        ("chama_cauda", "cauda", [0, 2, 8], [cubo([-1.8, 1.6, 8.8], [3.6, 4.2, 2.8], "ciano"), cubo([-1.2, 3.0, 10.4], [2.4, 3.4, 1.8], "ciano_cl"), cubo([-0.6, 4.4, 11.6], [1.2, 2.6, 1.2], "branco")],
         {"scale": ["1 + math.sin(query.life_time * 400) * 0.1", "1 + math.sin(query.life_time * 330 + 80) * 0.18", 1]}),
    ]
    return _quad(p, "pet_kirin", "kirin", "kirin_esc", "branco", "ciano", orelha="nenhuma", focinho="longo", nariz="ouro_esc", pata="ouro", olho="ciano_esc", bochecha="ciano_cl",
                 cabeca_extra=cab, corpo_extra=corpo, cauda="curta", halos=halos, topo="kirin_esc", flut=(1.5, 90, 2.2), escala=0.88)


# ---------------------------------------------------------------------------------- 67: grifo dourado
def modelo_pet_grifo() -> tuple[list[dict], dict]:
    p = M_GRIFO
    asa = [cubo([3.4, 4.0, -1.8], [3.0, 5.2, 4.6], "ouro"), cubo([6.2, 4.4, -1.6], [3.2, 4.6, 4.2], "ouro_claro"), cubo([9.2, 4.8, -1.4], [3.2, 4.0, 3.8], "creme"),
           cubo([11.8, 5.2, -1.2], [2.6, 3.2, 3.2], "branco"), cubo([3.4, 8.8, -1.2], [5.8, 0.8, 3.2], "ouro_esc")]
    ossos: list[dict] = []
    anim: dict = {}
    _lados(ossos, anim, p, "asa", asa, [3.4, 7.0, 0.4], f"m{p}_corpo", rot=lambda s: [0, 0, f"{s}math.sin(query.life_time * 240) * 20"])
    corpo = [cubo([-4.6, 5.0, -3.6], [9.2, 1.6, 7.6], "branco"), cubo([-4.4, 6.2, -3.4], [8.8, 0.8, 7.2], "creme")]
    cab = [cubo([-3.6, 11.9, -3.6], [1.4, 2.0, 0.6], "ouro_esc"), cubo([2.2, 11.9, -3.6], [1.4, 2.0, 0.6], "ouro_esc")]
    ob, oa = _quad(p, "pet_grifo", "ouro_esc", "madeira_clara", "ouro_claro", "ouro_esc", c_cab="branco", topo="creme", pata="bico", orelha="tri", o_int="ouro_claro",
                   o_ponta="ouro", focinho="bico", nariz="ouro_esc", bochecha="laranja", cauda="fina", cabeca_extra=cab, corpo_extra=corpo, flut=(1.2, 100, 1.8), escala=0.86, anim_cauda=26)
    a = list(oa.values())[0]["bones"]
    ob += ossos
    a.update(anim)
    return ob, oa


# ---------------------------------------------------------------------------------- 68: raposa-sakura
def _leque_v(n: int, amax: float, cores: list[str], cores2: list[str] | None = None, gomos: int = 3, w0: float = 3.2, w1: float = 4.6, alt: float = 3.2,
             zc: float = 4.6, y0: float = 2.0, ponta_h: str | None = None) -> tuple[list[dict], list[dict]]:
    """Leque de caudas num plano vertical atrás do corpo (cubos girados em z em torno de (0, y0, zc)); devolve (cubos, brilho das pontas)."""
    cubos: list[dict] = []
    brilho: list[dict] = []
    for i in range(n):
        a = -amax + 2 * amax * i / max(1, n - 1)
        cs = cores if (i % 2 == 0 or not cores2) else cores2
        z = zc + (i % 2) * 0.8
        for g in range(gomos):
            w = w0 + (w1 - w0) * g / max(1, gomos - 1)
            c = cubo([-w / 2, y0 + g * alt, z - w / 2], [w, alt + 0.2, w], cs[min(g, len(cs) - 1)])
            c["rotation"] = [0, 0, a]
            c["pivot"] = [0, y0, z]
            cubos.append(c)
        if ponta_h:
            w = w1 * 0.62
            c = cubo([-w / 2, y0 + gomos * alt - 0.2, z - w / 2], [w, 2.4, w], ponta_h)
            c["rotation"] = [0, 0, a]
            c["pivot"] = [0, y0, z]
            brilho.append(c)
    return cubos, brilho


def modelo_pet_sakura() -> tuple[list[dict], dict]:
    p = M_SAKURA
    caudas, _ = _leque_v(3, 34, ["sakura", "sakura_esc", "sakura_cl"], gomos=3, w0=3.6, w1=4.8, alt=3.4)
    cabeca = [cubo([-1.8, 11.6, -4.3], [3.6, 0.9, 0.5], "sakura_cl"), cubo([-0.4, 11.6, -4.5], [0.8, 0.9, 0.5], "petala"), cubo([-4.6, 12.2, -0.4], [1.6, 0.5, 1.6], "petala"),
              cubo([3.2, 12.0, 0.6], [1.4, 0.5, 1.4], "petala")]
    ob, oa = _quad(p, "pet_sakura", "rosa", "sakura_esc", "rosa_claro", "sakura_cl", orelha="tri", o_int="rosa_claro", o_ponta="sakura_esc", olho="sakura_esc", bochecha="rosa_claro",
                   caudas=caudas, cabeca_extra=cabeca, escala=0.88, cauda_anim_extra={"rotation": [0, "math.sin(query.life_time * 120) * 5", "math.sin(query.life_time * 90) * 3"]})
    # pétalas em órbita
    anim = list(oa.values())[0]["bones"]
    petala = [cubo([-0.9, -0.2, -0.9], [1.8, 0.5, 1.8], "petala"), cubo([-0.4, 0.2, -0.4], [0.8, 0.4, 0.8], "sakura_esc")]
    for k in range(7):
        _orbita(ob, anim, p, f"pet{k}", f"m{p}_raiz", 3.5 + (k % 4) * 3.2, 8.5 + (k % 3) * 1.6, petala, 55 + (k % 3) * 14, fase=k * 51, bob=1.2)
    return ob, oa


# ---------------------------------------------------------------------------------- 69: cérbero pequenino
def _cab_cao(cx: float, esc: float, y0: float = 5.5) -> list[dict]:
    w, h = 7.4 * esc, 6.2 * esc
    ty = y0 + h
    return [
        cubo([cx - w / 2, y0, -3.8], [w, h, 6.6], "cerbero"),
        cubo([cx - w / 2, ty - 1.0, -3.8], [w, 1.0, 6.6], "cerbero_esc"),
        cubo([cx - 1.8 * esc, y0 + 0.1, -7.2], [3.6 * esc, 3.0 * esc, 3.6], "cerbero_cl"),
        cubo([cx - 1.1 * esc, y0 + 2.6 * esc, -7.6], [2.2 * esc, 1.4 * esc, 0.7], "preto"),
        cubo([cx - 1.2 * esc, y0 - 0.3, -6.4], [0.7, 1.1, 0.5], "branco"), cubo([cx + 0.5 * esc, y0 - 0.3, -6.4], [0.7, 1.1, 0.5], "branco"),
        cubo([cx - w / 2 - 1.0, ty - 2.6, -2.8], [1.2, 3.2, 2.4], "cerbero_esc"), cubo([cx + w / 2 - 0.2, ty - 2.6, -2.8], [1.2, 3.2, 2.4], "cerbero_esc"),
        cubo([cx - w / 2 + 0.4, y0 + 1.0, -4.1], [1.4, 0.9, 0.4], "rosa"), cubo([cx + w / 2 - 1.8, y0 + 1.0, -4.1], [1.4, 0.9, 0.4], "rosa"),
        cubo([cx - w / 2 + 0.7, y0 + 0.62 * h, -4.3], [1.5, 1.7, 0.5], "fogo_verm"), cubo([cx + w / 2 - 2.2, y0 + 0.62 * h, -4.3], [1.5, 1.7, 0.5], "fogo_verm"),
        cubo([cx - w / 2 + 1.2, y0 + 0.62 * h + 0.8, -4.45], [0.6, 0.7, 0.4], "branco"), cubo([cx + w / 2 - 1.7, y0 + 0.62 * h + 0.8, -4.45], [0.6, 0.7, 0.4], "branco"),
    ]


def modelo_pet_cerbero() -> tuple[list[dict], dict]:
    p = M_CERBERO
    corpo = [
        cubo([-5.5, 0, -2.5], [11, 5.5, 6.5], "cerbero"), cubo([-4.3, 0, -2.9], [8.6, 4, 0.5], "cerbero_cl"),
        cubo([-6.2, 0, 0.3], [2, 3.4, 3.6], "cerbero_esc"), cubo([4.2, 0, 0.3], [2, 3.4, 3.6], "cerbero_esc"),
        cubo([-4.6, 0, -4.2], [2.4, 1.8, 2.6], "cerbero_esc"), cubo([2.2, 0, -4.2], [2.4, 1.8, 2.6], "cerbero_esc"), cubo([-1.2, 0, -4.2], [2.4, 1.8, 2.6], "cerbero_esc"),
        cubo([-5.2, 4.6, -2.8], [10.4, 1.1, 7], "cerbero_esc"), cubo([-5.8, 3.9, -2.7], [11.6, 1.0, 6.6], "ouro_esc"),
    ] + [cubo([-5.2 + k * 2.6, 4.9, -3.0], [0.9, 1.3, 0.9], "ouro_claro") for k in range(5)]
    cauda = _cauda("fina", "cerbero", "cerbero", "cerbero_esc")
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"),
        osso(f"m{p}_cab_c", [0, 5.5, 0], _cab_cao(0, 1.0), f"m{p}_corpo"),
        osso(f"m{p}_cab_e", [-7.4, 5.0, 0], _cab_cao(-7.6, 0.82, 4.6), f"m{p}_corpo"),
        osso(f"m{p}_cab_d", [7.4, 5.0, 0], _cab_cao(7.6, 0.82, 4.6), f"m{p}_corpo"),
        osso(f"m{p}_cauda", [0, 2, 3.8], cauda, f"m{p}_corpo"),
    ]
    anim = _flutua(p, 1.0, 100, 1.6, 0.78)
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 120) * 0.025", 1]}
    anim[f"m{p}_cab_c"] = {"rotation": ["math.sin(query.life_time * 55) * 3", "math.sin(query.life_time * 35) * 8", "math.sin(query.life_time * 60) * 3"]}
    anim[f"m{p}_cab_e"] = {"rotation": ["math.sin(query.life_time * 70 + 60) * 4", "-14 + math.sin(query.life_time * 42 + 90) * 10", "math.sin(query.life_time * 50) * 4"]}
    anim[f"m{p}_cab_d"] = {"rotation": ["math.sin(query.life_time * 66 + 120) * 4", "14 + math.sin(query.life_time * 38 + 40) * 10", "math.sin(query.life_time * 45) * 4"]}
    anim[f"m{p}_cauda"] = {"rotation": [0, "math.sin(query.life_time * 280) * 30", "math.sin(query.life_time * 130) * 4"]}
    chama_cab = lambda cx, k: [cubo([cx - 1.4 * k, 11.8 * (1 if k == 1 else 0.9) , -0.8], [2.8 * k, 2.6 * k, 2.0], "fogo_verm"), cubo([cx - 0.8 * k, 11.8 * (1 if k == 1 else 0.9) + 2.4 * k, -0.4], [1.6 * k, 2.4 * k, 1.2], "fogo_verm_cl")]
    pulso = {"scale": ["1 + math.sin(query.life_time * 500) * 0.12", "1 + math.sin(query.life_time * 400 + 70) * 0.22", "1 + math.sin(query.life_time * 500) * 0.12"]}
    _halos(ossos, anim, p, [
        ("olhos_c", "cab_c", [0, 5.5, 0], [cubo([-3.1, 9.2, -4.65], [1.2, 1.2, 0.3], "fogo_verm_cl"), cubo([1.9, 9.2, -4.65], [1.2, 1.2, 0.3], "fogo_verm_cl")], None),
        ("olhos_e", "cab_e", [-7.4, 5, 0], [cubo([-9.7, 8.7, -4.65], [1.0, 1.0, 0.3], "fogo_verm_cl"), cubo([-6.5, 8.7, -4.65], [1.0, 1.0, 0.3], "fogo_verm_cl")], None),
        ("olhos_d", "cab_d", [7.4, 5, 0], [cubo([5.5, 8.7, -4.65], [1.0, 1.0, 0.3], "fogo_verm_cl"), cubo([8.7, 8.7, -4.65], [1.0, 1.0, 0.3], "fogo_verm_cl")], None),
        ("chama_c", "cab_c", [0, 11.7, 0], chama_cab(0, 1.0), pulso),
        ("chama_cauda", "cauda", [0, 7, 6.4], [cubo([-1.0, 8.6, 5.6], [2.0, 2.2, 1.8], "fogo_verm"), cubo([-0.6, 10.4, 5.8], [1.2, 2.2, 1.2], "fogo_verm_cl")], pulso),
        ("brasas", "corpo", [0, 5.6, 0], [cubo([-4.4, 5.7, 0.4], [1.2, 1.6, 1.2], "fogo_verm"), cubo([3.2, 5.7, 1.8], [1.2, 1.8, 1.2], "fogo_verm"), cubo([-0.6, 5.7, 3.2], [1.2, 1.4, 1.2], "fogo_verm_cl")], pulso),
    ])
    return ossos, _fim("pet_cerbero", anim)


# ---------------------------------------------------------------------------------- arquétipo: dragão chibi
def _dragao(p: int, nome: str, c: str, d: str, b: str, chifre: str, asa: str, asa2: str, *, espinho: str = "ouro", olho: str = "preto", bochecha: str = "rosa",
            asa_k: float = 1.0, cauda_seg: int = 0, ponta: str = "ouro", cabeca_extra: list[dict] | None = None, corpo_extra: list[dict] | None = None,
            extra_ossos: list[dict] | None = None, extra_anim: dict | None = None, halos: list | None = None, flut: tuple = (1.5, 110, 1.8), escala: float = 0.85,
            asa_amp: float = 18, asa_vel: float = 300, bigode: str = "ouro_claro") -> tuple[list[dict], dict]:
    corpo = [
        cubo([-3.4, 0, -2.6], [6.8, 6.4, 6.2], c), cubo([-2.4, 0, -3], [4.8, 5, 0.5], b),
        cubo([-2.8, 0, -4.2], [2, 1.8, 2.4], d), cubo([0.8, 0, -4.2], [2, 1.8, 2.4], d), cubo([-4.2, 0, 0.4], [2, 3.4, 3.6], d), cubo([2.2, 0, 0.4], [2, 3.4, 3.6], d),
        cubo([-0.6, 6.4, -1.4], [1.2, 1.6, 1.6], espinho), cubo([-0.6, 6.4, 1.4], [1.2, 1.6, 1.6], espinho), cubo([-0.6, 5.4, 4], [1.2, 1.6, 1.6], espinho),
    ] + (corpo_extra or [])
    segs = [(3.6, 3.6, 3.0, 0.8, c), (2.6, 2.6, 3.0, 1.0, d), (1.6, 1.8, 2.2, 1.4, c)] + [(1.5, 1.7, 2.6, 1.4, d if i % 2 == 0 else c) for i in range(cauda_seg)] + [(2.4, 2.4, 1.2, 1.2, ponta)]
    cauda = []
    z = 3.6
    for w, h, l, y, cor in segs:
        cauda.append(cubo([-w / 2, y, z], [w, h, l], cor))
        z += l - 0.2
    cab = [
        cubo([-4.4, 6.2, -4], [8.8, 6.6, 7.4], c), cubo([-2.6, 6.4, -6], [5.2, 3.4, 2.2], b), cubo([-2.2, 8.2, -6.4], [0.8, 0.8, 0.5], d), cubo([1.4, 8.2, -6.4], [0.8, 0.8, 0.5], d),
        cubo([-2.4, 6.5, -6.3], [4.8, 0.6, 0.4], d), cubo([-4.8, 9.4, -2.6], [1.8, 3.6, 1.8], chifre), cubo([3, 9.4, -2.6], [1.8, 3.6, 1.8], chifre),
        cubo([-4.3, 12.8, -2.2], [1, 1.4, 1], "ouro_claro"), cubo([3.3, 12.8, -2.2], [1, 1.4, 1], "ouro_claro"),
        cubo([-3.6, 7, -4.3], [1.5, 0.9, 0.4], bochecha), cubo([2.1, 7, -4.3], [1.5, 0.9, 0.4], bochecha),
        cubo([-6.8, 7.4, -5], [3, 0.5, 0.5], bigode), cubo([3.8, 7.4, -5], [3, 0.5, 0.5], bigode), cubo([-1.2, 11.6, -3.4], [2.4, 1.4, 0.5], d),
    ] + _olho(-3.4, 8.6, -4.3, 1.7, 2.5, olho) + _olho(1.7, 8.6, -4.3, 1.7, 2.5, olho) + (cabeca_extra or [])
    k = asa_k
    w = [cubo([3.4, 4.4, -0.6], [5.6 * k, 0.8, 4.8], asa), cubo([3.4 + 5.6 * k, 4.4, 0], [3.2 * k, 0.8, 3.4], asa2), cubo([5.2, 5.2, 0.2], [3.2 * k, 0.6, 3], asa2)]
    if k > 1.2:
        w += [cubo([3.4 + 8.8 * k, 4.6, 0.6], [2.0 * k, 0.8, 2.0], asa), cubo([3.4, 4.0, -2.0], [4.4 * k, 0.5, 7.4], asa)]
    ossos = [
        osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 6.2, 0], cab, f"m{p}_corpo"),
        osso(f"m{p}_cauda", [0, 2.5, 3.6], cauda, f"m{p}_corpo"),
    ]
    anim = _flutua(p, flut[0], flut[1], flut[2], escala)
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 55) * 3", "math.sin(query.life_time * 33) * 8", "math.sin(query.life_time * 60) * 3"]}
    anim[f"m{p}_cauda"] = {"rotation": ["math.sin(query.life_time * 120) * 4", "math.sin(query.life_time * 170) * 16", 0]}
    _lados(ossos, anim, p, "asa", w, [3.4, 5, 0.6], f"m{p}_corpo", rot=lambda s: [0, 0, f"{s}math.sin(query.life_time * {asa_vel}) * {asa_amp}"])
    ossos += extra_ossos or []
    anim.update(extra_anim or {})
    _halos(ossos, anim, p, halos)
    return ossos, _fim(nome, anim)


# ---------------------------------------------------------------------------------- 70: dragão da tempestade
def modelo_pet_tempestade() -> tuple[list[dict], dict]:
    p = M_TEMPESTADE
    nuvem = [cubo([-5.2, -2.8, -3.6], [10.4, 2.2, 8.6], "pedra"), cubo([-3.6, -0.8, -4.6], [7.2, 1.6, 2.2], "cinza"), cubo([-6.4, -2.4, -1.4], [2.4, 1.8, 4.6], "pedra"),
             cubo([4.2, -2.4, -2.4], [2.6, 1.8, 4.8], "pedra"), cubo([-4.6, -3.2, 1.2], [9.2, 1.0, 2.8], "pedra_esc"), cubo([-1.2, -1.0, 4.6], [3.4, 1.2, 2.4], "cinza")]
    ossos = [osso(f"m{p}_nuvem", [0, -1.5, 0], nuvem, f"m{p}_raiz")]
    anim = {f"m{p}_nuvem": {"scale": ["1 + math.sin(query.life_time * 80) * 0.05", 1, "1 + math.sin(query.life_time * 80) * 0.05"]}}
    olhos = [cubo([-3.4, 8.6, -4.7], [1.7, 2.5, 0.4], "raio"), cubo([1.7, 8.6, -4.7], [1.7, 2.5, 0.4], "raio"), cubo([-2.9, 9.4, -4.85], [0.6, 0.8, 0.3], "branco"), cubo([2.2, 9.4, -4.85], [0.6, 0.8, 0.3], "branco")]
    dorso = [cubo([-0.7, 6.6, -1.4], [1.4, 1.8, 1.8], "raio"), cubo([-0.7, 6.6, 1.4], [1.4, 1.8, 1.8], "raio"), cubo([-0.7, 5.6, 4], [1.4, 1.8, 1.8], "raio")]
    ponta_c = [cubo([-1.3, 1.2, 13.6], [2.6, 2.6, 1.4], "raio_cl")]
    halos = [("olhos", "cabeca", [0, 6.2, 0], olhos, None), ("dorso", "corpo", [0, 6, 0], dorso, _brilho_pulso(400, 0.15)),
             ("ponta", "cauda", [0, 2.5, 3.6], ponta_c, _brilho_pulso(350, 0.2))]
    ob, oa = _dragao(p, "pet_tempestade", "tempe", "tempe_esc", "tempe_cl", "ouro_claro", "tempe_esc", "tempe_cl", espinho="tempe_cl", asa_k=1.3, cauda_seg=1, ponta="tempe_cl",
                     cabeca_extra=[cubo([-1.0, 11.8, -3.8], [2.0, 1.2, 0.5], "tempe_cl")], extra_ossos=ossos, extra_anim=anim, halos=halos, asa_amp=14, asa_vel=260, escala=0.8,
                     flut=(1.8, 100, 2.6), bochecha="tempe_cl", bigode="raio_cl")
    a = list(oa.values())[0]["bones"]
    # raios orbitando
    _h_de(ob, a, p, "raiz")
    for k in range(3):
        _orbita(ob, a, p, f"raio{k}", f"h{p}_raiz", 7 + k * 4.5, 12.5 + (k % 2) * 2, _raio(-1.2, -2, -0.45, 1.0), 90 + k * 25, fase=k * 120, bob=1.5, pulso=0.12, pre="h")
    return ob, oa


# ---------------------------------------------------------------------------------- 71: leviatã mini
def modelo_pet_leviata() -> tuple[list[dict], dict]:
    p = M_LEVIATA
    ossos = [osso(f"m{p}_raiz", [0, 0, 0])]
    anim = _flutua(p, 1.8, 70, 3.0, 0.82)
    n = 8
    for k in range(n):
        z = 1.0 + k * 3.4
        t = 6.2 - k * 0.55
        cubos = [cubo([-t / 2, 2.0, z - 1.9], [t, t, 3.8], "mar" if k % 2 == 0 else "mar_esc"), cubo([-t / 2 + 0.6, 1.6, z - 1.9], [t - 1.2, 0.8, 3.8], "mar_cl"),
                 cubo([-0.5, 2.0 + t, z - 1.4], [1.0, 1.6 + (3 - abs(k - 3)) * 0.3, 2.8], "mar_esc")]
        if k in (1, 4):
            nad = [cubo([t / 2, 2.4, z - 1.3], [3.0, 0.8, 2.6], "mar_cl"), cubo([t / 2 + 2.6, 2.4, z - 0.9], [1.6, 0.8, 1.8], "branco")]
            cubos += nad + _esp(nad)
        ossos.append(osso(f"m{p}_s{k}", [0, 2, z], cubos, f"m{p}_raiz"))
        anim[f"m{p}_s{k}"] = {"position": [0, f"math.sin(query.life_time * 120 - {k * 50}) * {2.0 - k * 0.1}", 0], "rotation": [f"math.cos(query.life_time * 120 - {k * 50}) * 8", 0, 0]}
    zf = 1.0 + n * 3.4
    fin = [cubo([-1.0, 2.2, zf - 2], [2.0, 2.2, 2.6], "mar"), cubo([-5.6, 3.0, zf + 0.4], [11.2, 0.9, 3.2], "mar_esc"), cubo([-3.6, 3.0, zf + 3.4], [7.2, 0.9, 2.0], "mar_cl"), cubo([-1.0, 3.0, zf - 1.0], [2.0, 0.9, 1.4], "mar")]
    ossos.append(osso(f"m{p}_cauda", [0, 3, zf - 1], fin, f"m{p}_raiz"))
    anim[f"m{p}_cauda"] = {"position": [0, f"math.sin(query.life_time * 120 - {n * 50}) * 1.2", 0], "rotation": ["math.sin(query.life_time * 240) * 14", 0, 0]}
    cab = (
        _redondo(0, 1.0, -6.0, 9.0, 7.4, 8.4, "mar", 1.6)
        + [cubo([-3.0, 1.0, -10.4], [6.0, 3.2, 3.0], "mar_cl"), cubo([-2.0, 4.0, -10.6], [1.6, 1.0, 0.5], "mar_esc"), cubo([0.4, 4.0, -10.6], [1.6, 1.0, 0.5], "mar_esc"),
           cubo([-1.8, 1.0, -10.55], [0.8, 1.2, 0.4], "branco"), cubo([1.0, 1.0, -10.55], [0.8, 1.2, 0.4], "branco"),
           cubo([-1.4, 8.2, -7.0], [2.8, 1.8, 5.0], "mar_esc"), cubo([-0.8, 10.0, -5.0], [1.6, 1.4, 3.0], "mar_cl"),
           cubo([-5.4, 3.0, -4.6], [1.6, 3.6, 3.0], "mar_cl"), cubo([3.8, 3.0, -4.6], [1.6, 3.6, 3.0], "mar_cl"),
           cubo([-3.8, 2.4, -10.0], [1.5, 0.9, 0.4], "rosa"), cubo([2.3, 2.4, -10.0], [1.5, 0.9, 0.4], "rosa")]
        + _olho(-3.4, 4.0, -10.0, 1.7, 2.6) + _olho(1.7, 4.0, -10.0, 1.7, 2.6)
    )
    ossos.append(osso(f"m{p}_cabeca", [0, 2, -4], cab, f"m{p}_raiz"))
    anim[f"m{p}_cabeca"] = {"position": [0, "math.sin(query.life_time * 120 + 60) * 2.0", 0], "rotation": ["math.sin(query.life_time * 120 + 20) * 6", "math.sin(query.life_time * 40) * 8", 0]}
    for k in range(3):
        bol = [cubo([-0.7, 0, -0.7], [1.4, 1.4, 1.4], "vidro"), cubo([-0.3, 0.8, -0.8], [0.5, 0.5, 0.3], "branco")]
        ossos.append(osso(f"m{p}_bolha{k}", [-3 + k * 3, 6, -7], deslocar(bol, -3 + k * 3, 12, -7), f"m{p}_raiz"))
        q = f"math.mod(query.life_time * 6 + {k * 3.3}, 10)"
        anim[f"m{p}_bolha{k}"] = {"position": [f"math.sin(query.life_time * 150 + {k * 60}) * 0.8", q, 0], "scale": f"math.clamp(1.2 - {q} / 10, 0.05, 1)"}
    # pintinhas bioluminescentes que acompanham os segmentos
    hal = []
    for k in (1, 3, 5, 7):
        t = 6.2 - k * 0.55
        z = 1.0 + k * 3.4
        pts = [cubo([t / 2 - 0.1, 3.4, z - 0.5], [0.4, 1.2, 1.2], "ciano"), cubo([-t / 2 - 0.3, 3.4, z - 0.5], [0.4, 1.2, 1.2], "ciano"), cubo([-0.8, 2.0 + t - 0.1, z - 0.6], [1.6, 0.5, 1.2], "ciano_cl")]
        hal.append((f"pt{k}", f"s{k}", [0, 2, z], pts, _brilho_pulso(260, 0.15, k * 40)))
    hal.append(("cab_pt", "cabeca", [0, 2, -4], [cubo([-1.4, 11.5, -5.8], [2.8, 0.5, 1.2], "ciano_cl"), cubo([-4.6, 5.6, -3.8], [0.4, 1.2, 1.2], "ciano"), cubo([4.2, 5.6, -3.8], [0.4, 1.2, 1.2], "ciano")], _brilho_pulso(300, 0.15)))
    _halos(ossos, anim, p, hal)
    return ossos, _fim("pet_leviata", anim)


# ---------------------------------------------------------------------------------- 72: lobo-eclipse
def modelo_pet_eclipse() -> tuple[list[dict], dict]:
    p = M_ECLIPSE
    disco = _redondo(0, 6.6, 5.4, 12.6, 12.0, 1.2, "preto", 2.4)
    ossos = [osso(f"m{p}_disco", [0, 12.5, 5.4], disco, f"m{p}_raiz")]
    anim = {f"m{p}_disco": {"rotation": [0, 0, "query.life_time * -8"]}}
    anel = _anel_xy(0, 12.5, 4.5, 7.0, 20, ["eclipse_anel", "eclipse_luz"], 1.5, 1.5, 1.0)
    raios = []
    for k in range(10):
        a = math.radians(k * 36 + 18)
        L = 3.0 if k % 2 == 0 else 1.6
        raios.append(cubo([8.6 * math.cos(a) - 0.5, 12.5 + 8.6 * math.sin(a) - 0.5, 4.3], [1.0 + (L - 1.6) * 0.0, 1.0, 1.0], "eclipse_luz"))
        raios.append(cubo([(8.6 + L * 0.6) * math.cos(a) - 0.4, 12.5 + (8.6 + L * 0.6) * math.sin(a) - 0.4, 4.4], [0.8, 0.8, 0.8], "eclipse_anel"))
    cab = [cubo([-3.4, 8.3, -4.55], [1.7, 2.6, 0.4], "ouro"), cubo([1.7, 8.3, -4.55], [1.7, 2.6, 0.4], "ouro"), cubo([-2.7, 9.6, -4.7], [0.6, 0.8, 0.3], "branco"), cubo([2.4, 9.6, -4.7], [0.6, 0.8, 0.3], "branco")]
    testa = [cubo([-0.4, 10.4, -4.2], [0.8, 1.8, 0.4], "eclipse_anel"), cubo([-1.2, 10.8, -4.2], [0.8, 0.8, 0.4], "eclipse_anel"), cubo([0.4, 10.8, -4.2], [0.8, 0.8, 0.4], "eclipse_anel")]
    halos = [
        ("anel", "raiz", [0, 12.5, 4.5], anel + raios, {"rotation": [0, 0, "query.life_time * 16"], "scale": "1 + math.sin(query.life_time * 120) * 0.04"}),
        ("olhos", "cabeca", [0, 5.5, 0], cab, None),
        ("peito", "corpo", [0, 3, -3], [cubo([-1.0, 2.0, -3.3], [2.0, 2.0, 0.6], "eclipse_anel"), cubo([-0.5, 2.5, -3.5], [1.0, 1.0, 0.4], "eclipse_luz")], _brilho_pulso(200, 0.12)),
    ]
    return _quad(p, "pet_eclipse", "eclipse_cl", "eclipse", "lua_esc", "eclipse", orelha="tri", o_int="cosmo_cl", o_ponta="eclipse", focinho="longo", nariz="preto",
                 bochecha="cosmo_cl", cauda="lobo", cabeca_extra=testa, extra_ossos=ossos, extra_anim=anim, halos=halos, topo="eclipse", flut=(1.0, 90, 1.8), escala=0.82)


# ---------------------------------------------------------------------------------- 73: anjo guardião
def modelo_pet_anjo() -> tuple[list[dict], dict]:
    p = M_ANJO
    corpo = [
        cubo([-3.4, 0.4, -3.4], [6.8, 1.8, 6.8], "branco"), cubo([-3.0, 2.2, -3.0], [6.0, 2.2, 6.0], "anjo"), cubo([-2.5, 4.4, -2.5], [5.0, 2.0, 5.0], "branco"),
        cubo([-2.6, 4.0, -2.7], [5.2, 0.7, 5.4], "ouro_claro"), cubo([-0.8, 3.7, -3.0], [1.6, 1.4, 0.6], "ouro"),
        cubo([-4.0, 3.2, -1.2], [1.4, 2.6, 2.0], "anjo"), cubo([2.6, 3.2, -1.2], [1.4, 2.6, 2.0], "anjo"), cubo([-4.0, 2.6, -1.0], [1.4, 1.0, 1.6], "creme"), cubo([2.6, 2.6, -1.0], [1.4, 1.0, 1.6], "creme"),
        cubo([-2.2, 0, -2.0], [1.8, 0.6, 2.2], "creme"), cubo([0.4, 0, -2.0], [1.8, 0.6, 2.2], "creme"),
    ]
    cabeca = (
        _redondo(0, 6.4, 0, 8.6, 7.4, 8.2, "creme", 1.3)
        + [cubo([-4.6, 11.4, -4.3], [9.2, 2.6, 8.6], "ouro_claro"), cubo([-4.3, 9.6, -4.6], [8.6, 2.0, 0.8], "ouro_claro"), cubo([-4.9, 7.6, -3.0], [1.0, 4.6, 6.6], "ouro_claro"), cubo([3.9, 7.6, -3.0], [1.0, 4.6, 6.6], "ouro_claro"),
           cubo([-4.6, 6.4, 3.2], [9.2, 5.6, 1.2], "ouro_claro"), cubo([-0.6, 7.8, -4.55], [1.2, 1.2, 0.4], "ouro_claro"),
           cubo([-3.8, 7.0, -4.3], [1.5, 0.9, 0.4], "rosa"), cubo([2.3, 7.0, -4.3], [1.5, 0.9, 0.4], "rosa"), cubo([-0.8, 6.6, -4.4], [1.6, 0.4, 0.4], "cr_claro")]
        + _olho(-3.0, 7.7, -4.35, 1.6, 2.2, "azul_fogo_esc") + _olho(1.4, 7.7, -4.35, 1.6, 2.2, "azul_fogo_esc")
    )
    ossos = [osso(f"m{p}_raiz", [0, 0, 0]), osso(f"m{p}_corpo", [0, 0, 0], corpo, f"m{p}_raiz"), osso(f"m{p}_cabeca", [0, 6.4, 0], cabeca, f"m{p}_corpo")]
    anim = _flutua(p, 2.0, 80, 2.6, 0.85)
    anim[f"m{p}_corpo"] = {"scale": [1, "1 + math.sin(query.life_time * 120) * 0.02", 1]}
    anim[f"m{p}_cabeca"] = {"rotation": ["math.sin(query.life_time * 50) * 3", "math.sin(query.life_time * 30) * 7", "math.sin(query.life_time * 60) * 3"]}
    asa_s = [cubo([2.6, 5.4, 2.6], [3.0, 7.0, 0.9], "branco"), cubo([5.4, 6.4, 2.6], [2.8, 6.6, 0.9], "anjo_asa"), cubo([8.0, 7.6, 2.6], [2.4, 5.4, 0.9], "branco"),
             cubo([10.2, 8.8, 2.6], [1.6, 3.6, 0.9], "anjo_asa"), cubo([2.6, 11.6, 2.5], [2.8, 1.4, 0.9], "branco"), cubo([5.4, 12.4, 2.5], [2.4, 1.4, 0.9], "anjo_asa")]
    asa_i = [cubo([2.6, 1.8, 2.4], [3.0, 3.8, 0.9], "branco"), cubo([5.4, 1.0, 2.4], [2.4, 3.2, 0.9], "anjo_asa"), cubo([7.6, 0.4, 2.4], [1.6, 2.4, 0.9], "branco")]
    _lados(ossos, anim, p, "asa_s", asa_s, [2.6, 6, 2.6], f"m{p}_corpo", rot=lambda s: [0, f"{s}(14 + math.sin(query.life_time * 150) * 16)", f"{s}math.sin(query.life_time * 150) * 4"])
    _lados(ossos, anim, p, "asa_i", asa_i, [2.6, 3, 2.6], f"m{p}_corpo", rot=lambda s: [0, f"{s}(12 + math.sin(query.life_time * 150 + 40) * 14)", 0])
    tip = [cubo([10.4, 9.0, 2.35], [1.2, 1.2, 0.4], "ouro_claro"), cubo([5.8, 12.6, 2.35], [1.0, 1.0, 0.4], "ouro_claro"), cubo([8.6, 7.8, 2.35], [1.0, 1.0, 0.4], "ouro_claro"), cubo([7.8, 0.8, 2.15], [1.0, 1.0, 0.4], "ouro_claro")]
    _halos(ossos, anim, p, [
        ("halo", "cabeca", [0, 15, 0], _anel_xz(0, 15.2, 0, 3.8, 14, "ouro_claro", 1.4, 0.9, "ouro"), {"rotation": ["math.sin(query.life_time * 60) * 4", "query.life_time * 40", "math.sin(query.life_time * 70) * 4"], "scale": "1 + math.sin(query.life_time * 200) * 0.05"}),
        ("pontas_d", "asa_s_d", [2.6, 6, 2.6], tip, _brilho_pulso(260, 0.2)),
        ("pontas_e", "asa_s_e", [-2.6, 6, 2.6], _esp(tip), _brilho_pulso(260, 0.2, 90)),
    ])
    _h_de(ossos, anim, p, "raiz")
    for k in range(3):
        _orbita(ossos, anim, p, f"brilho{k}", f"h{p}_raiz", 4 + k * 4, 8.5 + k, _estrela(0, 0, 0, 1.1, "ouro_claro", "branco"), 55 + k * 20, fase=k * 120, bob=1.2, pulso=0.2, pre="h")
    return ossos, _fim("pet_anjo", anim)


# ---------------------------------------------------------------------------------- 74: pavão-aurora
def modelo_pet_pavao() -> tuple[list[dict], dict]:
    p = M_PAVAO
    leque, olhos = [], []
    cores = ["nc_4", "nc_5", "nc_6", "nc_7", "nc_8", "nc_7", "nc_6", "nc_5", "nc_4"]
    for i in range(9):
        a = -72 + 18 * i
        pv = [0, 6.0, 3.4]
        for c in (cubo([-0.4, 6.0, 3.4], [0.8, 10.5, 0.8], "pavao_esc"), cubo([-1.5, 9.0, 3.5], [3.0, 6.4, 0.6], "pavao" if i % 2 == 0 else "pavao_esc")):
            c["rotation"] = [0, 0, a]
            c["pivot"] = pv
            leque.append(c)
        for c in (cubo([-1.2, 13.4, 2.9], [2.4, 2.8, 0.7], "pavao_az"), cubo([-0.65, 13.95, 2.6], [1.3, 1.7, 0.6], cores[i]), cubo([-0.3, 14.6, 2.35], [0.6, 0.6, 0.5], "ouro")):
            c["rotation"] = [0, 0, a]
            c["pivot"] = pv
            olhos.append(c)
    crista = lambda yh: [cubo([-0.25, yh + 4.2, -0.6], [0.5, 2.4, 0.5], "pavao_esc"), cubo([-1.4, yh + 4.2, -0.6], [0.5, 1.8, 0.5], "pavao_esc"), cubo([0.9, yh + 4.2, -0.6], [0.5, 1.8, 0.5], "pavao_esc"),
                         cubo([-0.5, yh + 6.4, -0.85], [1.0, 1.0, 1.0], "nc_5"), cubo([-1.65, yh + 5.8, -0.85], [1.0, 1.0, 1.0], "nc_5"), cubo([0.65, yh + 5.8, -0.85], [1.0, 1.0, 1.0], "nc_5")]
    train = [cubo([-1.4, 1.0, 3.0], [2.8, 1.0, 7.0], "pavao"), cubo([-1.0, 1.0, 9.8], [2.0, 1.0, 2.0], "pavao_esc"), cubo([-0.5, 1.1, 11.6], [1.0, 1.0, 1.2], "nc_5")]
    ossos = [osso(f"m{p}_leque", [0, 6, 3.4], leque, f"m{p}_corpo")]
    anim = {f"m{p}_leque": {"rotation": [0, "math.sin(query.life_time * 50) * 5", 0], "scale": ["1 + math.sin(query.life_time * 90) * 0.03", "1 + math.sin(query.life_time * 90) * 0.03", 1]}}
    halos = [("olhos_leque", "leque", [0, 6, 3.4], olhos, None)]
    return _ave(p, "pet_pavao", "pavao_az", "pavao", "pavao", "ouro_esc", "cinza_claro", "cinza", pernas=3.0, corpo_h=6.0, bw=6.6, bd=6.2, pescoco=2.5, cab_larg=5.8,
                cauda=train, cabeca_extra=crista, asa_esp=1.4, asa_amp=8, asa_vel=150, extra_ossos=ossos, extra_anim=anim, halos=halos, escala=0.78, flut=(1.6, 100, 2.2),
                bochecha="pavao")


# ---------------------------------------------------------------------------------- 75: kitsune celestial
def modelo_pet_kitsune_celeste() -> tuple[list[dict], dict]:
    p = M_KITSUNE_CEL
    caudas, pontas = _leque_v(5, 52, ["branco", "cel", "azul_fogo"], gomos=3, w0=3.4, w1=4.6, alt=3.4, ponta_h="azul_fogo_cl")
    marca = [cubo([-0.5, 10.4, -4.2], [1.0, 1.8, 0.4], "azul_fogo"), cubo([-1.5, 11.0, -4.2], [0.8, 0.8, 0.4], "azul_fogo"), cubo([0.7, 11.0, -4.2], [0.8, 0.8, 0.4], "azul_fogo"),
             cubo([-4.6, 6.8, -3.0], [0.3, 0.5, 2.0], "azul_fogo"), cubo([4.3, 6.8, -3.0], [0.3, 0.5, 2.0], "azul_fogo"), cubo([-4.6, 7.6, -3.0], [0.3, 0.5, 2.0], "azul_fogo"), cubo([4.3, 7.6, -3.0], [0.3, 0.5, 2.0], "azul_fogo")]
    corpo = [cubo([-3.6, 3.6, -2.7], [7.2, 0.9, 6.6], "cel"), cubo([-3.6, 3.9, -2.7], [7.2, 0.3, 6.6], "cel_esc")]
    pulso = {"scale": ["1 + math.sin(query.life_time * 500) * 0.1", "1 + math.sin(query.life_time * 400 + 60) * 0.2", "1 + math.sin(query.life_time * 500) * 0.1"]}
    halos = [
        ("chamas", "cauda", [0, 2, 3.8], pontas, pulso),
        ("aureola", "cabeca", [0, 14, 0], _anel_xz(0, 14.4, 0, 4.2, 16, "ouro_claro", 1.4, 0.9, "ouro"), {"rotation": [0, "query.life_time * 45", 0], "scale": "1 + math.sin(query.life_time * 180) * 0.04"}),
        ("olhos", "cabeca", [0, 5.5, 0], [cubo([-3.4, 8.3, -4.55], [1.7, 2.6, 0.4], "azul_fogo_cl"), cubo([1.7, 8.3, -4.55], [1.7, 2.6, 0.4], "azul_fogo_cl"), cubo([-2.6, 9.7, -4.7], [0.6, 0.8, 0.3], "branco"), cubo([2.3, 9.7, -4.7], [0.6, 0.8, 0.3], "branco")], None),
        ("gema", "corpo", [0, 3, -3], [cubo([-0.8, 2.6, -3.3], [1.6, 2.0, 0.6], "azul_fogo_cl"), cubo([-0.4, 3.0, -3.5], [0.8, 1.0, 0.4], "branco")], _brilho_pulso(200, 0.12)),
    ]
    ob, oa = _quad(p, "pet_kitsune_celeste", "branco", "lua", "branco", "azul_fogo", orelha="tri", o_cor="branco", o_int="azul_fogo_cl", o_ponta="azul_fogo", focinho="curto", nariz="azul_fogo_esc",
                   olho="azul_fogo_esc", bochecha="azul_fogo_cl", caudas=caudas, cabeca_extra=marca, corpo_extra=corpo, halos=halos, topo="lua", flut=(1.4, 90, 2.4), escala=0.84, cauda_anim_extra={"rotation": [0, "math.sin(query.life_time * 110) * 5", "math.sin(query.life_time * 80) * 3"]})
    a = list(oa.values())[0]["bones"]
    for k in range(3):
        _orbita(ob, a, p, f"fogo{k}", f"h{p}_raiz", 3 + k * 3.5, 9.5, [cubo([-0.9, -0.9, -0.9], [1.8, 1.8, 1.8], "azul_fogo_cl"), cubo([-0.4, 0.9, -0.4], [0.8, 1.2, 0.8], "branco")], 70 + k * 15, fase=k * 120, bob=1.5, pulso=0.2, pre="h")
    return ob, oa


# ---------------------------------------------------------------------------------- 76: vulpus eterna
def modelo_pet_vulpus() -> tuple[list[dict], dict]:
    p = M_VULPUS
    caudas, pontas = _leque_v(9, 74, ["cosmo", "cosmo", "cosmo_cl", "ouro"], ["cosmo_cl", "cosmo_cl", "cosmo", "ouro_claro"], gomos=4, w0=2.6, w1=4.0, alt=3.4, ponta_h="ouro_claro")
    coroa = [cubo([-1.2, 12.5, -3.4], [2.4, 0.9, 5.0], "ouro"), cubo([-1.2, 13.4, -3.4], [0.8, 1.6, 0.8], "ouro"), cubo([0.4, 13.4, -3.4], [0.8, 1.6, 0.8], "ouro"), cubo([-0.4, 13.4, -3.4], [0.8, 3.0, 0.8], "ouro_claro"),
             cubo([-1.2, 13.4, 0.2], [0.8, 1.4, 0.8], "ouro"), cubo([0.4, 13.4, 0.2], [0.8, 1.4, 0.8], "ouro"), cubo([-0.4, 12.6, -3.7], [0.8, 0.8, 0.4], "cr_verm")]
    marca = [cubo([-0.5, 10.2, -4.2], [1.0, 1.4, 0.4], "ouro"), cubo([-1.4, 10.8, -4.2], [0.8, 0.7, 0.4], "ouro"), cubo([0.6, 10.8, -4.2], [0.8, 0.7, 0.4], "ouro"),
             cubo([-4.6, 6.6, -3.0], [0.3, 0.5, 2.4], "ouro"), cubo([4.3, 6.6, -3.0], [0.3, 0.5, 2.4], "ouro"), cubo([-4.6, 7.5, -3.0], [0.3, 0.5, 2.4], "ouro"), cubo([4.3, 7.5, -3.0], [0.3, 0.5, 2.4], "ouro")]
    corpo = [cubo([-3.9, 3.7, -2.8], [7.8, 1.1, 7.0], "ouro"), cubo([-3.9, 3.9, -2.8], [7.8, 0.4, 7.0], "ouro_esc")]
    estrelas_c = [cubo([sx, sy, sz], [0.9, 0.9, 0.9], cor) for sx, sy, sz, cor in ((-3.7, 1.0, 0.4, "branco"), (3.0, 2.4, 1.6, "ouro_claro"), (-3.7, 3.0, 2.6, "ouro_claro"), (3.0, 0.8, -0.8, "branco"), (-1.4, 5.8, 1.2, "ouro_claro"),
                                                                              (1.2, 5.8, 3.0, "branco"), (-0.4, 1.0, 3.9, "ouro_claro"))]
    estrelas_cab = [cubo([sx, sy, sz], [0.8, 0.8, 0.4], cor) for sx, sy, sz, cor in ((-3.6, 11.0, -4.2, "branco"), (2.6, 11.0, -4.2, "ouro_claro"), (-2.4, 5.8, -4.5, "ouro_claro"), (3.0, 9.8, -4.2, "branco"))]
    cab_ou = [cubo([-3.5, 8.3, -4.55], [1.7, 2.6, 0.4], "ouro"), cubo([1.8, 8.3, -4.55], [1.7, 2.6, 0.4], "ouro"), cubo([-2.7, 9.7, -4.7], [0.6, 0.8, 0.3], "branco"), cubo([2.4, 9.7, -4.7], [0.6, 0.8, 0.3], "branco")]
    gema = [cubo([-1.0, 1.8, -3.3], [2.0, 2.6, 0.7], "ciano"), cubo([-0.5, 2.4, -3.5], [1.0, 1.4, 0.4], "branco")]
    # círculo mágico no chão (osso à parte: não flutua junto)
    c1 = _anel_xz(0, 0.1, 0, 12.0, 28, "ouro", 1.5, 0.5, "ouro_claro") + [cubo([12.0 * math.cos(math.radians(a)) - 0.5, 0.1, 12.0 * math.sin(math.radians(a)) - 0.5], [1.0, 0.5, 1.0], "cosmo_cl") for a in (45, 135, 225, 315)]
    c2 = _anel_xz(0, 0.2, 0, 8.6, 20, "cosmo_cl", 1.2, 0.5, "nc_7")
    for k in range(6):
        a = math.radians(60 * k + 30)
        c2.append(cubo([8.6 * math.cos(a) - 0.9, 0.2, 8.6 * math.sin(a) - 0.9], [1.8, 0.6, 1.8], "ouro_claro"))
        c2.append(cubo([4.2 * math.cos(a) - 0.5, 0.2, 4.2 * math.sin(a) - 0.5], [1.0, 0.5, 1.0], "ouro"))
    ob, oa = _quad(p, "pet_vulpus", "cosmo", "cosmo_esc", "cosmo_cl", "ouro", orelha="tri", o_int="cosmo_cl", o_ponta="ouro", focinho="curto", nariz="preto", olho="ouro_esc", bochecha="nc_8",
                   caudas=caudas, cabeca_extra=coroa + marca, corpo_extra=corpo, halos=[
                       ("chamas", "cauda", [0, 2, 3.8], pontas, _brilho_pulso(260, 0.18)),
                       ("estrelas", "corpo", [0, 3, 1], estrelas_c, {"scale": "1 + math.sin(query.life_time * 220) * 0.25"}),
                       ("estrelas_cab", "cabeca", [0, 8, -4], estrelas_cab, {"scale": "1 + math.sin(query.life_time * 260 + 80) * 0.25"}),
                       ("olhos", "cabeca", [0, 5.5, 0], cab_ou, None),
                       ("gema", "corpo", [0, 3, -3], gema, _brilho_pulso(180, 0.12)),
                   ], topo="cosmo_esc", flut=(1.6, 80, 2.8), escala=0.8, anim_cauda=10, cauda_anim_extra={"rotation": [0, "math.sin(query.life_time * 90) * 5", "math.sin(query.life_time * 70) * 3"]})
    a = list(oa.values())[0]["bones"]
    ob.append(osso(f"h{p}_chao1", [0, 0, 0], c1, None))
    ob.append(osso(f"h{p}_chao2", [0, 0, 0], c2, None))
    a[f"h{p}_chao1"] = {"rotation": [0, "query.life_time * 22", 0], "scale": 0.8}
    a[f"h{p}_chao2"] = {"rotation": [0, "query.life_time * -34", 0], "scale": 0.8}
    _h_de(ob, a, p, "raiz")
    orbes = [("nc_7", "branco"), ("nc_5", "branco"), ("ouro", "ouro_claro"), ("nc_8", "branco"), ("ciano", "ciano_cl")]
    for k, (c1_, c2_) in enumerate(orbes):
        orb = [cubo([-1.3, -1.3, -1.3], [2.6, 2.6, 2.6], c1_), cubo([-0.7, -0.7, -1.5], [1.4, 1.4, 0.5], c2_), cubo([1.6, -0.3, -0.3], [0.6, 0.6, 0.6], c2_), cubo([-2.2, -0.3, -0.3], [0.6, 0.6, 0.6], c2_)]
        _orbita(ob, a, p, f"orbe{k}", f"h{p}_raiz", 2.5 + k * 3.2, 12.5 + (k % 2) * 2.5, orb, (60 + k * 12) * (1 if k % 2 == 0 else -1), fase=k * 72, bob=1.6, pulso=0.12, pre="h")
    # estrelinhas subindo em volta (aura)
    for k in range(8):
        ang = math.radians(k * 45)
        raio = 7 + (k % 3) * 1.8
        est = _estrela(raio * math.cos(ang), 0, raio * math.sin(ang), 0.9, "ouro_claro", "branco")
        n = f"h{p}_aura{k}"
        ob.append(osso(n, [0, 0, 0], est, None))
        q = f"math.mod(query.life_time * {6 + k % 3} + {k * 2.1}, 18)"
        a[n] = {"position": [0, q, 0], "scale": f"math.clamp(1 - {q} / 18, 0.05, 1) * 0.8"}
    return ob, oa


# ---------------------------------------------------------------------------------- 77: dragão do infinito
def _ouroboros(cx: float, cy: float, cz: float, raio: float, n: int) -> list[dict]:
    cores = ["cosmo_cl", "ciano", "branco", "cosmo", "ciano_cl", "ouro_claro"]
    anel = _anel_xy(cx, cy, cz, raio, n, cores, 1.2, 3.4, 1.8, ang0=270)
    a = math.radians(270 + 360 * (n - 1) / n)
    hx, hy = cx + raio * math.cos(a), cy + raio * math.sin(a)
    anel += [cubo([hx - 1.9, hy - 1.9, cz - 1.2], [3.8, 3.8, 2.4], "ouro"), cubo([hx - 0.4, hy + 1.6, cz - 0.9], [0.8, 1.4, 1.8], "ouro_claro"), cubo([hx - 1.9, hy - 0.4, cz - 1.5], [1.0, 1.0, 0.5], "branco")]
    return anel


def modelo_pet_infinito() -> tuple[list[dict], dict]:
    p = M_INFINITO
    est_d = [cubo(x, [0.8, 0.5, 0.8], c) for x, c in (([5.4, 5.2, 0.4], "ouro_claro"), ([8.4, 5.2, 1.6], "branco"), ([11.4, 5.2, 0.2], "ouro_claro"), ([14.2, 5.2, 1.2], "branco"), ([7.0, 5.7, -0.6], "ciano_cl"))]
    est_c = [cubo(x, [0.9, 0.9, 0.9], c) for x, c in (([-3.7, 1.0, 0.4], "branco"), ([3.0, 2.4, 1.6], "ouro_claro"), ([-3.7, 3.4, 2.6], "ouro_claro"), ([3.0, 0.8, -0.8], "branco"), ([-1.4, 6.0, 1.2], "ciano_cl"))]
    olhos = [cubo([-3.4, 8.6, -4.7], [1.7, 2.5, 0.4], "ciano_cl"), cubo([1.7, 8.6, -4.7], [1.7, 2.5, 0.4], "ciano_cl"), cubo([-2.7, 9.6, -4.85], [0.6, 0.8, 0.3], "branco"), cubo([2.4, 9.6, -4.85], [0.6, 0.8, 0.3], "branco"),
             cubo([-0.8, 11.8, -3.9], [1.6, 1.6, 0.4], "ciano"), cubo([-0.3, 12.2, -4.1], [0.6, 0.6, 0.3], "branco")]
    dorso = [cubo([-0.7, 7.0, z], [1.4, 1.2, 1.8], "ciano_cl") for z in (-1.4, 1.4)] + [cubo([-0.7, 6.0, 4], [1.4, 1.2, 1.8], "ciano_cl")]
    ponta = [cubo([-1.3, 1.2, 17.0], [2.6, 2.6, 1.4], "branco")]
    halos = [
        ("olhos", "cabeca", [0, 6.2, 0], olhos, None), ("dorso", "corpo", [0, 6, 0], dorso, _brilho_pulso(300, 0.15)), ("ponta", "cauda", [0, 2.5, 3.6], ponta, _brilho_pulso(260, 0.25)),
        ("estrelas_c", "corpo", [0, 3, 1], est_c, {"scale": "1 + math.sin(query.life_time * 240) * 0.3"}),
        ("estrelas_ad", "asa_d", [3.4, 5, 0.6], est_d, {"scale": "1 + math.sin(query.life_time * 200 + 40) * 0.3"}),
        ("estrelas_ae", "asa_e", [-3.4, 5, 0.6], _esp(est_d), {"scale": "1 + math.sin(query.life_time * 200 + 140) * 0.3"}),
        ("ouroboros", "raiz", [0, 12.5, 7.5], _ouroboros(0, 12.5, 7.5, 12.5, 22), {"rotation": [0, 0, "query.life_time * -20"], "scale": "1 + math.sin(query.life_time * 100) * 0.03"}),
    ]
    ob, oa = _dragao(p, "pet_infinito", "cosmo", "cosmo_esc", "cosmo_cl", "ouro", "cosmo_esc", "cosmo_cl", espinho="ouro", asa_k=1.5, cauda_seg=2, ponta="ouro_claro", halos=halos, asa_amp=14, asa_vel=240,
                     escala=0.74, flut=(2.0, 90, 2.4), bochecha="ciano_cl", bigode="ciano_cl", cabeca_extra=[cubo([-4.4, 10.2, -4.1], [0.4, 0.8, 4], "ciano"), cubo([4.0, 10.2, -4.1], [0.4, 0.8, 4], "ciano")])
    a = list(oa.values())[0]["bones"]
    _h_de(ob, a, p, "raiz")
    for k in range(4):
        _orbita(ob, a, p, f"estrela{k}", f"h{p}_raiz", 5 + k * 4.5, 8.5 + (k % 2) * 2.4, _estrela(0, 0, 0, 1.3, ["ouro_claro", "ciano_cl", "branco", "nc_8"][k], "branco"), (70 + k * 10) * (1 if k % 2 == 0 else -1), fase=k * 90, bob=1.5, pulso=0.2, pre="h")
    return ob, oa


# ---------------------------------------------------------------------------------- 78, 79, 80: cápsulas insana, divina e absoluta
def _aura_bola(ossos: list[dict], anim: dict, p: int) -> str:
    """Osso de brilho que só segue a posição da bola (não o giro rápido); devolve o nome para os pais dos brilhos."""
    n = f"h{p}_raiz"
    ossos.append(osso(n, [0, 0, 0]))
    anim[n] = {"position": anim[f"m{p}_raiz"]["position"]}
    return n


def _giro_bola(ossos: list[dict], anim: dict, p: int) -> str:
    """Osso de brilho que copia a posição e o giro da bola (os ossos h não podem ser filhos de ossos m)."""
    n = f"h{p}_giro"
    ossos.append(osso(n, [0, 0, 0]))
    anim[n] = anim[f"m{p}_raiz"]
    return n


def modelo_bola_insano() -> tuple[list[dict], dict]:
    p = M_BOLA_INSANO
    ob, oa = _bola(p, "bola_insano", "sangue", "preto", baixo="preto", baixo2="sangue_esc", faixa="sangue_cl")
    anim = list(oa.values())[0]["bones"]
    esp = []
    for k in range(8):
        for c in (cubo([3.2, 4.1, -0.7], [2.2, 1.3, 1.4], "preto"), cubo([5.2, 4.3, -0.45], [0.9, 0.9, 0.9], "sangue_cl")):
            esp.append(girar(c, 1, k * 45, [0, 0, 0]))
    for k in range(4):
        esp.append(girar(cubo([2.2, 7.2, -0.6], [1.2, 2.2, 1.2], "preto"), 1, k * 90 + 45, [0, 0, 0]))
    ob.append(osso(f"m{p}_espinhos", [0, 4.2, 0], esp, f"m{p}_raiz"))
    aura = _aura_bola(ob, anim, p)
    giro = _giro_bola(ob, anim, p)
    ob.append(osso(f"h{p}_faixa", [0, 4.2, 0], [cubo([-3.55, 4.85, -3.55], [7.1, 0.35, 7.1], "fogo_verm_cl")], giro))
    ob.append(osso(f"h{p}_chama", [0, 9, 0], [cubo([-1.0, 9.2, -1.0], [2.0, 2.4, 2.0], "fogo_verm"), cubo([-0.6, 11.4, -0.6], [1.2, 2.2, 1.2], "fogo_verm_cl")], giro))
    anim[f"h{p}_chama"] = {"scale": ["0.9 + math.sin(query.life_time * 600) * 0.15", "0.85 + math.sin(query.life_time * 480 + 70) * 0.28", "0.9 + math.sin(query.life_time * 600) * 0.15"]}
    anim[f"h{p}_faixa"] = _brilho_pulso(300, 0.04)
    for k in range(4):
        _orbita(ob, anim, p, f"brasa{k}", aura, 4 + (k % 2) * 3, 6.8 + (k % 2), _estrela(0, 0, 0, 1.0, "fogo_verm", "fogo_verm_cl"), 150 * (1 if k % 2 == 0 else -1), fase=k * 90, bob=1.0, pulso=0.25, pre="h")
    return ob, oa


def modelo_bola_divino() -> tuple[list[dict], dict]:
    p = M_BOLA_DIVINO
    ob, oa = _bola(p, "bola_divino", "ciano_cl", "branco", baixo="branco", baixo2="ciano_cl", faixa="ouro_claro")
    anim = list(oa.values())[0]["bones"]
    asa = [cubo([3.6, 4.4, 0.0], [2.0, 3.6, 0.7], "branco"), cubo([5.4, 5.4, 0.0], [1.8, 3.8, 0.7], "branco"), cubo([7.0, 6.6, 0.0], [1.4, 3.0, 0.7], "ciano_cl"), cubo([3.6, 3.2, 0.0], [1.6, 1.4, 0.7], "branco")]
    _lados(ob, anim, p, "asa", asa, [3.4, 5.4, 0], f"m{p}_raiz", rot=lambda s: [0, f"{s}(15 + math.sin(query.life_time * 700) * 18)", 0])
    aura = _aura_bola(ob, anim, p)
    ob.append(osso(f"h{p}_halo", [0, 11.6, 0], _anel_xz(0, 11.6, 0, 3.2, 12, "ouro_claro", 1.2, 0.8, "branco"), aura))
    anim[f"h{p}_halo"] = {"rotation": ["math.sin(query.life_time * 120) * 6", "query.life_time * 90", 0], "scale": "1 + math.sin(query.life_time * 200) * 0.05"}
    ob.append(osso(f"h{p}_faixa", [0, 4.2, 0], [cubo([-3.55, 4.85, -3.55], [7.1, 0.35, 7.1], "branco")], _giro_bola(ob, anim, p)))
    anim[f"h{p}_faixa"] = _brilho_pulso(300, 0.04)
    for k in range(4):
        _orbita(ob, anim, p, f"luz{k}", aura, 3 + (k % 2) * 4, 6.6 + (k % 2), _estrela(0, 0, 0, 1.1, ["ciano", "branco", "ouro_claro", "ciano_cl"][k], "branco"), 130 * (1 if k % 2 == 0 else -1), fase=k * 90, bob=1.0, pulso=0.25, pre="h")
    return ob, oa


def modelo_bola_absoluto() -> tuple[list[dict], dict]:
    p = M_BOLA_ABSOLUTO
    ob, oa = _bola(p, "bola_absoluto", "cosmo", "ouro", baixo="cosmo_esc", baixo2="noite", faixa="ouro")
    anim = list(oa.values())[0]["bones"]
    coroa = []
    for k in range(6):
        for c in (cubo([1.6, 8.6, -0.5], [1.0, 2.6, 1.0], "ouro"), cubo([1.7, 11.0, -0.4], [0.8, 0.9, 0.8], "ouro_claro")):
            coroa.append(girar(c, 1, k * 60, [0, 0, 0]))
    ob.append(osso(f"m{p}_coroa", [0, 8.6, 0], coroa, f"m{p}_raiz"))
    aura = _aura_bola(ob, anim, p)
    r1 = _anel_xy(0, 0, 0, 8.4, 22, ["ouro", "ouro_claro", "cosmo_cl"], 1.0, 1.0, 0.9)
    r2 = _anel_xy(0, 0, 0, 7.0, 18, ["cosmo_cl", "nc_8", "branco"], 0.9, 0.9, 0.9)
    ob.append(osso(f"h{p}_anel1", [0, 5, 0], deslocar(r1, 0, 5, 0), aura))
    ob.append(osso(f"h{p}_anel2", [0, 5, 0], deslocar(r2, 0, 5, 0), aura))
    anim[f"h{p}_anel1"] = {"rotation": ["math.sin(query.life_time * 70) * 10", "query.life_time * 60", 0]}
    anim[f"h{p}_anel2"] = {"rotation": ["math.sin(query.life_time * 90) * 10", "90 + query.life_time * -80", 0]}
    ob.append(osso(f"h{p}_faixa", [0, 4.2, 0], [cubo([-3.55, 4.85, -3.55], [7.1, 0.35, 7.1], "ouro_claro"), cubo([-1.0, 8.7, -1.0], [2.0, 0.6, 2.0], "branco")], _giro_bola(ob, anim, p)))
    anim[f"h{p}_faixa"] = _brilho_pulso(300, 0.04)
    cores = [("ouro_claro", "branco"), ("nc_8", "branco"), ("ciano_cl", "branco"), ("nc_7", "branco"), ("ouro", "ouro_claro")]
    for k, (c1_, c2_) in enumerate(cores):
        _orbita(ob, anim, p, f"estrela{k}", aura, 2 + k * 2.2, 10.2 + (k % 2) * 1.6, _estrela(0, 0, 0, 1.2, c1_, c2_), (110 + k * 14) * (1 if k % 2 == 0 else -1), fase=k * 72, bob=1.2, pulso=0.25, pre="h")
    return ob, oa


FABRICAS = [
    modelo_caranguejo,
    modelo_cardume,
    modelo_vagalumes,
    modelo_sapo,
    modelo_lirio,
    modelo_lanterna,
    modelo_gaivota,
    modelo_gaivotas,
    modelo_flor,
    modelo_balao_rosa,
    modelo_balao_azul,
    modelo_balao_creme,
    modelo_tv,
    modelo_urso,
    modelo_telefone,
    modelo_cadeira,
    modelo_abajur,
    modelo_pato,
    modelo_carrossel,
    modelo_raposa_branca,
    modelo_pet_mel,
    modelo_pet_sapinho,
    modelo_pet_pintinho,
    modelo_pet_coruja,
    modelo_pet_carpa,
    modelo_pet_komainu,
    modelo_pet_trevo,
    modelo_pet_nove,
    modelo_capsula,
    modelo_bola_comum,
    modelo_bola_incomum,
    modelo_bola_raro,
    modelo_bola_lendario,
    modelo_capsula_ativa,
    modelo_pet_coelho,
    modelo_pet_cogumelo,
    modelo_pet_vagalume,
    modelo_pet_lontra,
    modelo_pet_salamandra,
    modelo_pet_dragao,
    modelo_pet_espirito,
    modelo_pet_fenix,
    modelo_portal_mg,
    modelo_portal_saida,
    modelo_pet_gato,
    modelo_pet_pinguim,
    modelo_pet_joaninha,
    modelo_pet_slime,
    modelo_pet_nuvem,
    modelo_pet_ourico,
    modelo_pet_caracol,
    modelo_pet_pomba,
    modelo_pet_panda,
    modelo_pet_lobo,
    modelo_pet_borboleta,
    modelo_pet_abelha,
    modelo_pet_tartaruga,
    modelo_pet_flamingo,
    modelo_pet_ratinho,
    modelo_pet_tigre,
    modelo_pet_unicornio,
    modelo_pet_medusa,
    modelo_pet_golem,
    modelo_pet_yeti,
    modelo_pet_raposa_neve,
    modelo_pet_tanuki,
    modelo_pet_kirin,
    modelo_pet_grifo,
    modelo_pet_sakura,
    modelo_pet_cerbero,
    modelo_pet_tempestade,
    modelo_pet_leviata,
    modelo_pet_eclipse,
    modelo_pet_anjo,
    modelo_pet_pavao,
    modelo_pet_kitsune_celeste,
    modelo_pet_vulpus,
    modelo_pet_infinito,
    modelo_bola_insano,
    modelo_bola_divino,
    modelo_bola_absoluto,
]


def montar() -> tuple[list[dict], dict]:
    ossos: list[dict] = []
    animacoes: dict = {}
    for fabrica in FABRICAS:
        o, a = fabrica()
        ossos += o
        animacoes.update(a)
    return ossos, animacoes


def geometria() -> dict:
    ossos, _ = montar()
    return {
        "description": {
            "identifier": "geometry.vulpus.vida",
            "texture_width": 16,
            "texture_height": 16,
            # o maior é o das gaivotas: raio de uns 7 blocos e altura de uns 9
            "visible_bounds_width": 18,
            "visible_bounds_height": 20,
            "visible_bounds_offset": [0, 8, 0],
        },
        "bones": ossos,
    }


def animacao() -> dict:
    _, animacoes = montar()
    return {"format_version": "1.8.0", "animations": animacoes}


def condicao(i: int) -> str:
    return f"query.property('vulpus:modelo') == {i}"


def controladores() -> dict:
    visibilidade: list[dict] = [{"*": False}]
    for i in range(len(NOMES_VIVOS)):
        visibilidade.append({f"m{i}_*": condicao(i)})

    def um(brilho: bool) -> dict:
        c: dict = {
            "geometry": "Geometry.default",
            "materials": [{"*": "Material.default"}],
            "textures": ["Texture.default"],
            "part_visibility": visibilidade,
        }
        if brilho:
            c["ignore_lighting"] = True
        return c

    halo = um(True)
    halo["part_visibility"] = [{"*": False}] + [{f"h{i}_*": condicao(i)} for i in HALOS]
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.vida": um(False),
            "controller.render.vulpus.vida_brilho": um(True),
            "controller.render.vulpus.vida_halo": halo,
        },
    }


def entidade_rp() -> dict:
    brilho = " || ".join(condicao(i) for i in BRILHANTES)
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "vulpus:vida",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/vulpus/entidades/vida"},
                "geometry": {"default": "geometry.vulpus.vida"},
                "animations": {nome: f"animation.vulpus.vida.{nome}" for nome, _ in NOMES_VIVOS},
                "scripts": {"animate": [{nome: condicao(i)} for i, (nome, _) in enumerate(NOMES_VIVOS)]},
                "render_controllers": [
                    {"controller.render.vulpus.vida": f"!({brilho})"},
                    {"controller.render.vulpus.vida_brilho": brilho},
                    {"controller.render.vulpus.vida_halo": " || ".join(condicao(i) for i in HALOS)},
                ],
            }
        },
    }


def entidade_bp() -> dict:
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": "vulpus:vida",
                "is_experimental": False,
                "is_summonable": True,
                "is_spawnable": False,
                "spawn_category": "misc",
                "properties": {"vulpus:modelo": {"type": "int", "range": [0, len(NOMES_VIVOS) - 1], "default": 0, "client_sync": True}},
            },
            "components": {
                "minecraft:type_family": {"family": ["vulpus_vida", "inanimate"]},
                "minecraft:collision_box": {"width": 0.8, "height": 0.8},
                "minecraft:physics": {"has_gravity": False, "has_collision": False},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
                "minecraft:persistent": {},
            },
        },
    }


def salvar_json(caminho: Path, conteudo: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    # RP vai minificado (menos bytes no download e menos para o cliente ler); BP segue legivel.
    texto = json.dumps(conteudo, separators=(",", ":"), ensure_ascii=False) if RP in caminho.parents else json.dumps(conteudo, indent=2, ensure_ascii=False)
    caminho.write_text(texto + "\n", encoding="utf-8")


def textura() -> Image.Image:
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for nome, cor in PALETA.items():
        i = INDICE[nome]
        img.putpixel((i % 16, i // 16), cor)
    return img


def main() -> None:
    destino = RP / "textures" / "vulpus" / "entidades" / "vida.png"
    destino.parent.mkdir(parents=True, exist_ok=True)
    textura().save(destino)
    salvar_json(RP / "models" / "entity" / "vida.geo.json", {"format_version": "1.16.0", "minecraft:geometry": [geometria()]})
    salvar_json(RP / "animations" / "vida.animation.json", animacao())
    salvar_json(RP / "render_controllers" / "vida.render_controllers.json", controladores())
    salvar_json(RP / "entity" / "vida.entity.json", entidade_rp())
    salvar_json(BP / "entities" / "vida.json", entidade_bp())
    print(f"ok: {len(NOMES_VIVOS)} criaturas animadas geradas (vulpus:vida)")


if __name__ == "__main__":
    main()
