from utils.rabisco import desenhar, extrair_json


def test_extrai_json_embrulhado():
    assert extrair_json('claro!\n```json\n{"itens": []}\n```') == {"itens": []}
    assert extrair_json("sem json") is None
    assert extrair_json("{quebrado") is None


def test_desenha_png_mesmo_com_lixo():
    spec = {
        "fundo": "vermelho",
        "itens": [
            {"t": "ret", "x": 100, "y": 100, "w": 200, "h": 80, "preench": "#aaccff"},
            {"t": "elipse", "x": 5000, "y": -3, "w": "x", "h": 50},
            {"t": "linha", "pts": [[0, 0], [800, 600], "oi"]},
            {"t": "texto", "x": 10, "y": 10, "txt": "navio", "tam": 9999},
            {"t": "poli", "pts": [[1, 1]]},
            "lixo", {"t": "foguete"},
        ],
    }
    png = desenhar(spec, semente=1)
    assert png[:8] == b"\x89PNG\r\n\x1a\n"


def test_spec_vazia_nao_quebra():
    assert desenhar({}, semente=1)[:4] == b"\x89PNG"


def test_json_cortado_aproveita_itens_completos():
    cortado = '{"fundo": "#ffffff", "itens": [{"t": "ret", "x": 1, "y": 1, "w": 5, "h": 5}, {"t": "linha", "pts": [[1,'
    spec = extrair_json(cortado)
    assert spec is not None and len(spec["itens"]) == 1
    assert desenhar(spec)[:4] == b"\x89PNG"
