"""Gera os inimigos da masmorra: modelo (geometria), textura pintada por código, animações, entidade do cliente (RP), entidade do
comportamento (BP) e a tabela de dados que o script lê (textos/masm_inimigos_dados.js).

Cada inimigo é uma especificação curta (rig, medidas, pintura por parte, habilidades). Rigs: biped, quad, flutuante, bloco.
Uso: python tools/gerar_inimigos.py   (grava no RP/BP e em docs/previas/inimigos.png)
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
RP = RAIZ / "vulpus_rp"
BP = RAIZ / "vulpus_bp"
PREVIA = RAIZ / "docs" / "previas" / "inimigos.png"
ID = "vulpus:m_"
# o golpe corpo a corpo cresce com o andar: no 1 é leve (a Toca é a porta de entrada), no 5 chega perto do cheio
ESCALA_DANO = {1: 0.4, 2: 0.5, 3: 0.62, 4: 0.75, 5: 0.9}

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inimigos_dados import INIMIGOS  # noqa: E402  (especificações)


# ------------------------------------------------------------------ pintura das faces
def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sombra(cor, f):
    return tuple(max(0, min(255, int(v * f))) for v in cor)


FACE_LUZ = {"up": 1.18, "north": 1.0, "south": 0.92, "east": 0.82, "west": 0.82, "down": 0.6}


def pintar_face(img, rect, face, pint, rng, olhos=None):
    """Preenche o retângulo (x, y, w, h) da textura com a pintura da peça."""
    x0, y0, w, h = rect
    cor = pint.get("cor", (150, 150, 150))
    cor2 = pint.get("cor2", sombra(cor, 0.7))
    estilo = pint.get("estilo", "liso")
    luz = FACE_LUZ[face]
    px = img.load()
    for j in range(h):
        for i in range(w):
            base = cor
            r = rng.random()
            if estilo == "pelo":
                if (i + j * 2) % 5 == 0 or r < 0.12:
                    base = cor2
                elif r > 0.93:
                    base = mix(cor, (255, 255, 255), 0.25)
            elif estilo == "listras":
                base = cor2 if (j // 2) % 2 == 0 else cor
                if r < 0.06:
                    base = sombra(base, 0.85)
            elif estilo == "manchas":
                base = cor2 if ((i // 2 + j // 2) * 7 + (i * j)) % 9 == 0 else cor
            elif estilo == "rocha":
                base = mix(cor, cor2, r * 0.9)
                if r > 0.93:
                    base = sombra(cor, 0.6)
            elif estilo == "metal":
                base = mix(cor, cor2, 0.5 if (i + j) % 6 == 0 else 0.0)
                if j == 0 or i == 0:
                    base = mix(base, (255, 255, 255), 0.18)
            elif estilo == "osso":
                base = mix(cor, cor2, 0.3 if (i * 3 + j) % 7 == 0 else 0.0)
            elif estilo == "folhas":
                base = cor2 if r < 0.35 else cor
                if r > 0.9:
                    base = mix(cor, (255, 255, 120), 0.35)
            elif estilo == "tecido":
                base = cor2 if (i % 4 == 0 or j % 4 == 0) else cor
            elif estilo == "brilho":
                d = math.hypot(i - (w - 1) / 2, j - (h - 1) / 2) / max(1, max(w, h) / 2)
                base = mix((255, 255, 255), cor, min(1, d * 1.1))
            elif estilo == "gradiente":
                base = mix(cor, cor2, j / max(1, h - 1))
            else:
                base = mix(cor, cor2, r * 0.25)
            if pint.get("brilho"):
                px[x0 + i, y0 + j] = (*mix(base, (255, 255, 255), 0.1), 255)
            else:
                px[x0 + i, y0 + j] = (*sombra(base, luz), 255)
    # borda escura sutil para dar volume
    if not pint.get("brilho") and w > 3 and h > 3 and pint.get("borda", True):
        for i in range(w):
            for j in (0, h - 1):
                px[x0 + i, y0 + j] = (*sombra(px[x0 + i, y0 + j][:3], 0.82), 255)
        for j in range(h):
            for i in (0, w - 1):
                px[x0 + i, y0 + j] = (*sombra(px[x0 + i, y0 + j][:3], 0.82), 255)
    # rosto na face da frente
    if olhos and face == "north":
        cor_olho = olhos.get("cor", (255, 230, 120))
        ew = max(1, olhos.get("larg", max(1, w // 5)))
        eh = max(1, olhos.get("alt", max(1, h // 5)))
        sep = max(2, olhos.get("sep", w // 3))
        ey = y0 + int(h * olhos.get("y", 0.42))
        cx = x0 + w // 2
        for lado in (-1, 1):
            ex = cx + lado * (sep // 2) - (ew // 2 if lado < 0 else ew // 2 - (ew - 1)) - (0 if lado > 0 else ew - 1) + (0 if lado > 0 else 0)
            ex = cx + lado * (sep // 2) - ew // 2
            for j in range(eh):
                for i in range(ew):
                    if 0 <= ex + i - x0 < w and 0 <= ey + j - y0 < h:
                        px[ex + i, ey + j] = (*cor_olho, 255)
        if olhos.get("boca"):
            by = y0 + int(h * 0.72)
            bw = max(2, w // 3)
            for i in range(bw):
                px[cx - bw // 2 + i, by] = (*olhos["boca"], 255)
            if olhos.get("presas"):
                px[cx - bw // 2, by + 1] = (255, 255, 255, 255)
                px[cx + bw // 2 - 1, by + 1] = (255, 255, 255, 255)


# ------------------------------------------------------------------ modelo
class Modelo:
    """Ossos e cubos de um inimigo; empacota as faces num atlas e escreve geometria."""

    def __init__(self, nome, tam=128):
        self.nome = nome
        self.tam = tam
        self.ossos = {}
        self.cubos = []  # (osso, origem, tam, pintura, olhos, inflate, mirror)

    def osso(self, nome, pai=None, pivo=(0, 0, 0), rot=None):
        self.ossos[nome] = {"pai": pai, "pivo": list(pivo), "rot": rot}

    def cubo(self, osso, origem, tam, pint, olhos=None, infla=0.0):
        self.cubos.append((osso, list(origem), list(tam), pint, olhos, infla))

    def construir(self, seed):
        rng = random.Random(seed)
        # empacota: cada cubo precisa de 6 retângulos
        retangulos = []
        for idx, (osso, origem, tam, pint, olhos, infla) in enumerate(self.cubos):
            w, h, d = [max(1, int(round(v))) for v in tam]
            for face, (fw, fh) in {"north": (w, h), "south": (w, h), "east": (d, h), "west": (d, h), "up": (w, d), "down": (w, d)}.items():
                retangulos.append((idx, face, fw, fh))
        retangulos.sort(key=lambda r: -r[3])
        atlas_w = self.tam
        x = y = linha = 0
        pos = {}
        for idx, face, fw, fh in retangulos:
            if x + fw + 1 > atlas_w:
                x = 0
                y += linha + 1
                linha = 0
            pos[(idx, face)] = (x, y, fw, fh)
            x += fw + 1
            linha = max(linha, fh)
        atlas_h = y + linha + 1
        # arredonda a altura para a próxima potência de 2 útil
        altura = 32
        while altura < atlas_h:
            altura *= 2
        if altura > self.tam * 2:
            raise ValueError(f"{self.nome}: modelo grande demais para o atlas ({atlas_h})")
        img = Image.new("RGBA", (self.tam, altura), (0, 0, 0, 0))
        for (idx, face), rect in pos.items():
            osso, origem, tam, pint, olhos, infla = self.cubos[idx]
            pintar_face(img, rect, face, pint, rng, olhos if idx in {i for i, c in enumerate(self.cubos) if c[4]} else None)
        self.imagem = img
        self.pos = pos
        self.altura = altura
        return img

    def geometria(self):
        ossos = []
        for nome, o in self.ossos.items():
            b = {"name": nome, "pivot": o["pivo"]}
            if o["pai"]:
                b["parent"] = o["pai"]
            if o["rot"]:
                b["rotation"] = o["rot"]
            cubos = []
            for idx, (osso, origem, tam, pint, olhos, infla) in enumerate(self.cubos):
                if osso != nome:
                    continue
                uv = {}
                for face in ("north", "south", "east", "west", "up", "down"):
                    x, y, fw, fh = self.pos[(idx, face)]
                    uv[face] = {"uv": [x, y], "uv_size": [fw, fh]}
                c = {"origin": origem, "size": tam, "uv": uv}
                if infla:
                    c["inflate"] = infla
                cubos.append(c)
            if cubos:
                b["cubes"] = cubos
            ossos.append(b)
        return {
            "format_version": "1.12.0",
            "minecraft:geometry": [{
                "description": {
                    "identifier": f"geometry.vulpus.m_{self.nome}",
                    "texture_width": self.tam,
                    "texture_height": self.altura,
                    "visible_bounds_width": 6,
                    "visible_bounds_height": 6,
                    "visible_bounds_offset": [0, 1.5, 0],
                },
                "bones": ossos,
            }],
        }


# ------------------------------------------------------------------ rigs
def P(cor, **kw):
    d = {"cor": cor}
    d.update(kw)
    return d


def rig_biped(m, e):
    """Humanoide. e['m'] tem cabeca, corpo, braco, perna (largura, altura, profundidade) e pintura por parte."""
    s = e["m"]
    ch, co, br, pe = s["cabeca"], s["corpo"], s["braco"], s["perna"]
    pint = e["pint"]
    ylegs = pe[1]
    ybody = ylegs + co[1]
    m.osso("raiz")
    m.osso("corpo", "raiz", (0, ylegs, 0))
    m.osso("cabeca", "raiz", (0, ybody, 0))
    m.osso("braco_e", "raiz", (co[0] / 2 + br[0] / 2, ybody - 2, 0))
    m.osso("braco_d", "raiz", (-(co[0] / 2 + br[0] / 2), ybody - 2, 0))
    m.osso("perna_e", "raiz", (pe[0] / 2 + (s.get("sep", 0)), ylegs, 0))
    m.osso("perna_d", "raiz", (-(pe[0] / 2 + (s.get("sep", 0))), ylegs, 0))
    m.cubo("corpo", (-co[0] / 2, ylegs, -co[2] / 2), co, pint["corpo"])
    m.cubo("cabeca", (-ch[0] / 2, ybody, -ch[2] / 2), ch, pint["cabeca"], e.get("olhos"))
    m.cubo("braco_e", (co[0] / 2, ybody - br[1] + 2, -br[2] / 2), br, pint.get("braco", pint["corpo"]))
    m.cubo("braco_d", (-co[0] / 2 - br[0], ybody - br[1] + 2, -br[2] / 2), br, pint.get("braco", pint["corpo"]))
    m.cubo("perna_e", (s.get("sep", 0), 0, -pe[2] / 2), pe, pint.get("perna", pint["corpo"]))
    m.cubo("perna_d", (-pe[0] - s.get("sep", 0), 0, -pe[2] / 2), pe, pint.get("perna", pint["corpo"]))
    return {"altura": ybody + ch[1], "largura": max(co[0] + 2 * br[0], 8)}


def rig_quad(m, e):
    s = e["m"]
    co, ch, pa = s["corpo"], s["cabeca"], s["pata"]
    pint = e["pint"]
    ypa = pa[1]
    m.osso("raiz")
    m.osso("corpo", "raiz", (0, ypa + co[1] / 2, 0))
    m.osso("cabeca", "raiz", (0, ypa + co[1] - 1, -co[2] / 2))
    m.osso("pata_fe", "raiz", (co[0] / 2 - pa[0] / 2, ypa, -co[2] / 2 + 1.5))
    m.osso("pata_fd", "raiz", (-co[0] / 2 + pa[0] / 2, ypa, -co[2] / 2 + 1.5))
    m.osso("pata_te", "raiz", (co[0] / 2 - pa[0] / 2, ypa, co[2] / 2 - 1.5))
    m.osso("pata_td", "raiz", (-co[0] / 2 + pa[0] / 2, ypa, co[2] / 2 - 1.5))
    m.cubo("corpo", (-co[0] / 2, ypa, -co[2] / 2), co, pint["corpo"])
    m.cubo("cabeca", (-ch[0] / 2, ypa + co[1] - ch[1] / 2 - 1, -co[2] / 2 - ch[2] + 1), ch, pint["cabeca"], e.get("olhos"))
    for nome, ox, oz in (("pata_fe", co[0] / 2 - pa[0], -co[2] / 2), ("pata_fd", -co[0] / 2, -co[2] / 2), ("pata_te", co[0] / 2 - pa[0], co[2] / 2 - pa[2]), ("pata_td", -co[0] / 2, co[2] / 2 - pa[2])):
        m.cubo(nome, (ox, 0, oz), pa, pint.get("pata", pint["corpo"]))
    return {"altura": ypa + co[1] + ch[1] / 2, "largura": co[0]}


def rig_flutuante(m, e):
    s = e["m"]
    co = s["corpo"]
    pint = e["pint"]
    m.osso("raiz")
    m.osso("corpo", "raiz", (0, s.get("alto", 10) + co[1] / 2, 0))
    y0 = s.get("alto", 10)
    m.cubo("corpo", (-co[0] / 2, y0, -co[2] / 2), co, pint["corpo"], e.get("olhos"))
    return {"altura": y0 + co[1], "largura": co[0]}


def rig_bloco(m, e):
    """Construtos pesados: corpo grande, cabeça e dois braços grossos, sem pernas animadas (base única)."""
    s = e["m"]
    co, ch, br = s["corpo"], s["cabeca"], s["braco"]
    pint = e["pint"]
    base = s.get("base", 6)
    ybody = base + co[1]
    m.osso("raiz")
    m.osso("corpo", "raiz", (0, base, 0))
    m.osso("cabeca", "raiz", (0, ybody, 0))
    m.osso("braco_e", "raiz", (co[0] / 2 + br[0] / 2, ybody - 3, 0))
    m.osso("braco_d", "raiz", (-(co[0] / 2 + br[0] / 2), ybody - 3, 0))
    m.cubo("corpo", (-co[0] / 2, base, -co[2] / 2), co, pint["corpo"])
    m.cubo("corpo", (-co[0] / 2 + 1, 0, -co[2] / 2 + 1), (co[0] - 2, base, co[2] - 2), pint.get("base", pint["corpo"]))
    m.cubo("cabeca", (-ch[0] / 2, ybody, -ch[2] / 2), ch, pint["cabeca"], e.get("olhos"))
    m.cubo("braco_e", (co[0] / 2, ybody - br[1] + 3, -br[2] / 2), br, pint.get("braco", pint["corpo"]))
    m.cubo("braco_d", (-co[0] / 2 - br[0], ybody - br[1] + 3, -br[2] / 2), br, pint.get("braco", pint["corpo"]))
    return {"altura": ybody + ch[1], "largura": co[0] + 2 * br[0]}


RIGS = {"biped": rig_biped, "quad": rig_quad, "flutuante": rig_flutuante, "bloco": rig_bloco}

# animações por rig: mapa osso -> rotação/posição em Molang
ANIM_ANDAR = "math.cos(query.modified_distance_moved * 38.17) * 70 * query.modified_move_speed"


def animacoes(e):
    rig = e["rig"]
    nome = e["id"]
    A = {}
    if rig in ("biped", "bloco"):
        ossos = {
            "perna_e": {"rotation": [f"{ANIM_ANDAR}", 0, 0]} if rig == "biped" else None,
            "perna_d": {"rotation": [f"-({ANIM_ANDAR})", 0, 0]} if rig == "biped" else None,
            "braco_e": {"rotation": [f"-({ANIM_ANDAR}) * 0.7 + math.sin(query.life_time * 80) * 3", 0, "2 + math.sin(query.life_time * 60) * 2"]},
            "braco_d": {"rotation": [f"({ANIM_ANDAR}) * 0.7 + math.sin(query.life_time * 80 + 90) * 3", 0, "-2 - math.sin(query.life_time * 60) * 2"]},
            "cabeca": {"rotation": ["math.sin(query.life_time * 40) * 2", "query.target_y_rotation * 0.4", 0]},
            "corpo": {"position": [0, "math.sin(query.life_time * 90) * 0.25", 0]},
        }
        A["andar"] = {"loop": True, "bones": {k: v for k, v in ossos.items() if v}}
        A["ataque"] = {"loop": True, "bones": {
            "braco_e": {"rotation": ["-95 * math.sin(variable.attack_time * 180)", 0, 0]},
            "braco_d": {"rotation": ["-95 * math.sin(variable.attack_time * 180)", 0, 0]},
            "corpo": {"rotation": [f"-12 * math.sin(variable.attack_time * 180)", 0, 0]},
        }}
    elif rig == "quad":
        A["andar"] = {"loop": True, "bones": {
            "pata_fe": {"rotation": [f"{ANIM_ANDAR}", 0, 0]},
            "pata_fd": {"rotation": [f"-({ANIM_ANDAR})", 0, 0]},
            "pata_te": {"rotation": [f"-({ANIM_ANDAR})", 0, 0]},
            "pata_td": {"rotation": [f"{ANIM_ANDAR}", 0, 0]},
            "cabeca": {"rotation": ["math.sin(query.life_time * 50) * 3 + query.target_x_rotation * 0.3", "query.target_y_rotation * 0.5", 0]},
            "corpo": {"position": [0, "math.abs(math.cos(query.modified_distance_moved * 38.17)) * 0.4 * query.modified_move_speed", 0]},
        }}
        A["ataque"] = {"loop": True, "bones": {
            "cabeca": {"rotation": ["30 * math.sin(variable.attack_time * 180)", 0, 0]},
            "corpo": {"rotation": ["-10 * math.sin(variable.attack_time * 180)", 0, 0]},
        }}
    elif rig == "flutuante":
        A["andar"] = {"loop": True, "bones": {
            "corpo": {"position": [0, "math.sin(query.life_time * 120) * 0.9", 0], "rotation": ["math.sin(query.life_time * 70) * 6", "query.life_time * 40", "math.cos(query.life_time * 90) * 5"]},
        }}
        A["ataque"] = {"loop": True, "bones": {"corpo": {"scale": ["1 + math.sin(variable.attack_time * 180) * 0.25"] * 3}}}
    # animação extra de cada inimigo (cauda, orbitais...), em e["anim"]
    for nome_a, dados in e.get("anim", {}).items():
        A[nome_a] = dados
    return {f"animation.vulpus.m_{nome}.{k}": v for k, v in A.items()}


# ------------------------------------------------------------------ BP
def entidade_bp(e):
    s = e["stats"]
    vida = s["vida"]
    larg, alt = e["caixa"]
    comp = {
        "minecraft:type_family": {"family": ["vulpus_inimigo", f"vulpus_andar{e['andar']}"] + e.get("familias", [])},
        "minecraft:health": {"value": vida, "max": vida},
        "minecraft:collision_box": {"width": larg, "height": alt},
        "minecraft:movement": {"value": s["vel"]},
        "minecraft:physics": {},
        "minecraft:knockback_resistance": {"value": s.get("kb", 0.0)},
        "minecraft:follow_range": {"value": 36, "max": 64},
        "minecraft:nameable": {"allow_name_tag_renaming": False},
        "minecraft:fire_immune": {} if e.get("imune_fogo") else {"": None},
        "minecraft:attack": {"damage": max(1, round(s["dano"] * ESCALA_DANO.get(e["andar"], 1.0)))},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.random_look_around": {"priority": 9},
        "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 12},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2,
            "must_see": False,
            "reselect_targets": True,
            "entity_types": [{"filters": {"test": "is_family", "subject": "other", "value": "player"}, "max_dist": e.get("alcance", 28)}],
        },
        "minecraft:behavior.hurt_by_target": {"priority": 1},
    }
    if not e.get("imune_fogo"):
        comp.pop("minecraft:fire_immune")
    voa = e["rig"] == "flutuante" or e.get("voa")
    if voa:
        comp["minecraft:navigation.hover"] = {"can_path_over_water": True, "can_pass_doors": False, "can_break_doors": False}
        comp["minecraft:movement.hover"] = {}
        comp["minecraft:flying_speed"] = {"value": s["vel"]}
        comp["minecraft:behavior.random_hover"] = {"priority": 7, "xz_dist": 8, "y_dist": 3, "y_offset": 0, "interval": 120, "hover_height": [1, 3]}
        comp["minecraft:can_fly"] = {}
        comp["minecraft:behavior.float"] = None
        comp.pop("minecraft:behavior.float")
    else:
        comp["minecraft:navigation.walk"] = {"can_path_over_water": False, "avoid_water": True, "can_pass_doors": False, "can_break_doors": False, "avoid_damage_blocks": True}
        comp["minecraft:movement.basic"] = {}
        comp["minecraft:jump.static"] = {}
        comp["minecraft:behavior.random_stroll"] = {"priority": 7}
    modo = e.get("ataque", "corpo")
    if modo == "corpo":
        comp["minecraft:behavior.melee_attack"] = {"priority": 3, "speed_multiplier": s.get("rush", 1.15), "track_target": True, "reach_multiplier": e.get("alcance_golpe", 1.0)}
    elif modo == "nenhum":
        comp.pop("minecraft:attack")
    else:
        proj = e.get("projetil", "minecraft:snowball")
        comp["minecraft:shooter"] = {"def": proj, "magic": False}
        comp["minecraft:behavior.ranged_attack"] = {"priority": 3, "attack_interval": e.get("intervalo", 2.2), "attack_radius": e.get("raio_tiro", 14), "speed_multiplier": 1.0}
        comp["minecraft:behavior.melee_attack"] = {"priority": 4, "speed_multiplier": 1.1, "track_target": True}
    comp = {k: v for k, v in comp.items() if v != {"": None}}
    return {
        "format_version": "1.26.0",
        "minecraft:entity": {
            "description": {
                "identifier": ID + e["id"],
                "is_spawnable": False,
                "is_summonable": True,
                "is_experimental": False,
                "properties": {
                    "vulpus:estado": {"type": "int", "range": [0, 5], "default": 0, "client_sync": True},
                    "vulpus:fase": {"type": "int", "range": [0, 9], "default": 0, "client_sync": True},
                    "vulpus:escudo": {"type": "bool", "default": False, "client_sync": True},
                },
            },
            "component_groups": {},
            "components": comp,
            "events": {},
        },
    }


# ------------------------------------------------------------------ RP
def entidade_rp(e, brilho):
    nome = e["id"]
    anim_nomes = {k.split(".")[-1]: k for k in animacoes(e)}
    anim_decl = {k: v for k, v in anim_nomes.items()}
    animate = []
    if "andar" in anim_decl:
        animate.append({"andar": "query.modified_move_speed > 0.02 || true"})
    if "ataque" in anim_decl:
        animate.append({"ataque": "variable.attack_time > 0"})
    for k in anim_decl:
        if k not in ("andar", "ataque"):
            animate.append(k)
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {"description": {
            "identifier": ID + nome,
            "materials": {"default": "entity_alphatest"},
            "textures": {"default": f"textures/vulpus/entidades/m_{nome}"},
            "geometry": {"default": f"geometry.vulpus.m_{nome}"},
            "animations": anim_decl,
            "scripts": {"animate": animate, "scale": str(e.get("escala", 1.0))},
            "render_controllers": ["controller.render.vulpus.m_brilho" if brilho else "controller.render.vulpus.m_padrao"],
            "spawn_egg": {"base_color": "#%02x%02x%02x" % tuple(e.get("ovo", (120, 80, 160))), "overlay_color": "#ffffff"},
        }},
    }


def render_controllers():
    return {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.vulpus.m_padrao": {"geometry": "Geometry.default", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"]},
            "controller.render.vulpus.m_brilho": {"geometry": "Geometry.default", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"], "ignore_lighting": True},
        },
    }


def gravar(caminho, dado):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def principal():
    TEX = RP / "textures" / "vulpus" / "entidades"
    TEX.mkdir(parents=True, exist_ok=True)
    folha = []
    linhas = []
    for e in INIMIGOS:
        m = Modelo(e["id"], e.get("atlas", 128))
        info = RIGS[e["rig"]](m, e)
        for extra in e.get("extras", []):
            osso, origem, tam, pint = extra[:4]
            m.cubo(osso, origem, tam, pint, extra[4] if len(extra) > 4 else None)
        for nome_osso, spec in e.get("ossos", {}).items():
            m.osso(nome_osso, spec.get("pai", "raiz"), spec.get("pivo", (0, 0, 0)), spec.get("rot"))
        m.construir(abs(hash(e["id"])) % 100000 if False else sum(ord(c) * (i + 1) for i, c in enumerate(e["id"])))
        m.imagem.save(TEX / f"m_{e['id']}.png")
        gravar(RP / "models" / "entity" / f"m_{e['id']}.geo.json", m.geometria())
        gravar(RP / "animations" / f"m_{e['id']}.animation.json", {"format_version": "1.8.0", "animations": animacoes(e)})
        gravar(RP / "entity" / f"m_{e['id']}.entity.json", entidade_rp(e, e.get("brilho", False)))
        gravar(BP / "entities" / f"m_{e['id']}.json", entidade_bp(e))
        folha.append((e["id"], m.imagem))
        s = e["stats"]
        linhas.append({
            "id": e["id"], "nome": e["nome"], "andar": e["andar"], "papel": e.get("papel", "comum"), "vida": s["vida"], "dano": s["dano"],
            "vel": s["vel"], "xp": e.get("xp", 5), "caudas": e.get("caudas", 1), "hab": e.get("hab", []), "loot": e.get("loot", "comum"),
            "grupo": e.get("grupo", 1), "altura": e["caixa"][1], "som": e.get("som", "mob.zombie.say"),
        })
    gravar(RP / "render_controllers" / "m.render_controllers.json", render_controllers())
    # tabela para o script
    js = "// @ts-check\n// GERADO por tools/gerar_inimigos.py (edite lá). Inimigos da masmorra: estatísticas, habilidades e recompensas.\n"
    js += "/** @type {readonly { id: string, nome: string, andar: number, papel: string, vida: number, dano: number, vel: number, xp: number, caudas: number, hab: any[], loot: string, grupo: number, altura: number, som: string }[]} */\n"
    js += "export const INIMIGOS = Object.freeze(" + json.dumps(linhas, ensure_ascii=False, indent=2) + ");\n"
    (BP / "scripts" / "textos" / "masm_inimigos_dados.js").write_text(js, encoding="utf-8")
    # prévia: cada atlas ampliado
    esc = 2
    cols = 5
    larg = max(i.width for _, i in folha) * esc
    alt = max(i.height for _, i in folha) * esc
    sheet = Image.new("RGBA", (cols * (larg + 8) + 8, ((len(folha) + cols - 1) // cols) * (alt + 8) + 8), (30, 30, 42, 255))
    for n, (_, img) in enumerate(folha):
        im = img.resize((img.width * esc, img.height * esc), Image.NEAREST)
        sheet.alpha_composite(im, (8 + (n % cols) * (larg + 8), 8 + (n // cols) * (alt + 8)))
    PREVIA.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(PREVIA)
    print("ok", len(INIMIGOS), "inimigos")


if __name__ == "__main__":
    principal()
