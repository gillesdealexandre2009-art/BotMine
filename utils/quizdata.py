"""Perguntas do /quiz e palavras da /forca (dados e lógica pura, fáceis de testar)."""
from __future__ import annotations

import unicodedata

# (pergunta, [opções], índice da correta). As opções são embaralhadas na hora de mostrar.
PERGUNTAS: list[tuple[str, list[str], int]] = [
    ("Qual bloco é preciso para construir um portal do Nether?", ["Obsidiana", "Bedrock", "Pedra", "Vidro"], 0),
    ("Quantos corações de vida o jogador tem por padrão?", ["10", "5", "20", "3"], 0),
    ("Qual mob explode quando chega perto do jogador?", ["Creeper", "Zumbi", "Aranha", "Esqueleto"], 0),
    ("Qual item serve para domar um lobo?", ["Osso", "Trigo", "Peixe cru", "Maçã"], 0),
    ("Qual mob solta Pérola do Ender?", ["Enderman", "Blaze", "Slime", "Ghast"], 0),
    ("Quantas cabeças tem o Wither?", ["3", "1", "2", "5"], 0),
    ("Em que dimensão fica o Dragão do Ender?", ["O End", "O Nether", "Superfície", "Aether"], 0),
    ("O que impede um Enderman de te atacar ao olhar para ele?", ["Abóbora na cabeça", "Capacete de ferro", "Escudo", "Poção de fogo"], 0),
    ("Qual é a moeda de troca dos aldeões?", ["Esmeralda", "Ouro", "Diamante", "Ferro"], 0),
    ("Qual animal produz mel?", ["Abelha", "Vaca", "Raposa", "Papagaio"], 0),
    ("Quantos itens cabem, no máximo, numa pilha comum?", ["64", "16", "99", "32"], 0),
    ("Qual destes NÃO vai na receita de bolo?", ["Cacau", "Leite", "Açúcar", "Ovo"], 0),
    ("Onde se encontra uma Elytra?", ["Cidade do End", "Fortaleza do Nether", "Templo do deserto", "Mansão"], 0),
    ("Qual material faz a ferramenta comum mais forte?", ["Netherita", "Diamante", "Ouro", "Ferro"], 0),
    ("Qual item precisa para usar a mesa de encantamentos?", ["Lápis-lazúli", "Redstone", "Carvão", "Quartzo"], 0),
    ("Qual destes aguenta a explosão de um Creeper?", ["Obsidiana", "Terra", "Madeira", "Areia"], 0),
    ("Que tecla padrão abre o inventário no PC?", ["E", "I", "Tab", "Q"], 0),
    ("Qual mob solta linha (string)?", ["Aranha", "Zumbi", "Slime", "Cavalo"], 0),
    ("Qual ferramenta quebra madeira mais rápido?", ["Machado", "Picareta", "Pá", "Enxada"], 0),
    ("Qual bloco você usa para fazer um farol (beacon) funcionar?", ["Blocos de minério na pirâmide", "Terra", "Lã", "Vidro"], 0),
    ("O que o Blaze solta ao morrer?", ["Vara de Blaze", "Pólvora", "Osso", "Couro"], 0),
    ("Quantas caudas tem uma kitsune lendária?", ["9", "3", "5", "7"], 0),
    ("Qual é o nome da moeda do servidor VULPUS?", ["Caudas", "Esmeraldas", "Moedas", "Raposas"], 0),
    ("Quem é a mascote do servidor VULPUS?", ["Kiza", "Kope", "Steve", "Alex"], 0),
]

PALAVRAS_FORCA = [
    "CREEPER", "ENDERMAN", "ESMERALDA", "NETHERITA", "OBSIDIANA", "ALDEAO", "BUSSOLA", "PICARETA", "REDSTONE",
    "DIAMANTE", "ESQUELETO", "ZUMBI", "DRAGAO", "FORTALEZA", "ENCANTAMENTO", "CAVERNA", "BLAZE", "FAZENDA",
    "MINERACAO", "ARMADURA", "RAPOSA", "KITSUNE", "LAPIS", "TRIDENTE", "ELYTRA", "PORTAL",
]
MAX_ERROS = 6


def normalizar(texto: str) -> str:
    """Maiúsculas sem acento, para comparar chutes."""
    base = unicodedata.normalize("NFKD", texto.strip().upper())
    return "".join(c for c in base if not unicodedata.combining(c))


def mascarar(palavra: str, certas: set[str]) -> str:
    return " ".join(c if c in certas else "▢" for c in palavra)


def venceu(palavra: str, certas: set[str]) -> bool:
    return all(c in certas for c in palavra)


FORCA_BONECO = [
    "```\n  +---+\n  |   |\n      |\n      |\n      |\n=========\n```",
    "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n=========\n```",
    "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n=========\n```",
    "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n=========\n```",
    "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n=========\n```",
    "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n=========\n```",
    "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n=========\n```",
]
