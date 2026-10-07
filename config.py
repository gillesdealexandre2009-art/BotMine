"""Configuração global da Kiza.

O que varia por servidor (canais, cargos, valores) vive no banco e é editado
via /setup e /ajustes. Aqui ficam só variáveis de ambiente e constantes de código.
"""
from __future__ import annotations

import os
from pathlib import Path

try:  # python-dotenv é opcional em produção (o Railway injeta as variáveis)
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass


def _flag(nome: str, padrao: bool) -> bool:
    bruto = os.getenv(nome)
    if bruto is None:
        return padrao
    return bruto.strip().lower() in {"1", "true", "sim", "yes", "on"}


def _inteiro(nome: str, padrao: int) -> int:
    try:
        return int(os.getenv(nome, str(padrao)))
    except ValueError:
        return padrao


VERSAO = "1.5.0"

# --------------------------------------------------------------------------- ambiente
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN", "")
DATABASE_PATH = os.getenv("DATABASE_PATH", "kiza.db")
# Cérebro (IA de conversa). Sem chave, a Kiza volta às frases fixas de textos.py.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CEREBRO_MODELO = os.getenv("CEREBRO_MODELO", "claude-haiku-4-5-20251001")
BACKUP_DIR = os.getenv("BACKUP_DIR", str(Path(DATABASE_PATH).resolve().parent / "backups"))
BACKUP_RETENCAO = _inteiro("BACKUP_RETENCAO", 7)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
# Se definido, os comandos são sincronizados só nesse servidor (aparecem na hora; útil em testes).
DEV_GUILD_ID = _inteiro("DEV_GUILD_ID", 0) or None

# --------------------------------------------------------------------------- cogs por flag
COGS_PADRAO = [
    "configuracao",
    "entrada",
    "cargos",
    "cargos_visual",
    "tickets",
    "logs",
    "moderacao",
    "automod",
    "canais",
    "xp",
    "economia",
    "casamento",
    "mines",
    "geral",
    "manutencao",
    "vitrine",
    "vida",
    "bump",
    "fidelidade",
    "cerebro",
]
_desativados = {c.strip() for c in os.getenv("COGS_DESATIVADOS", "").split(",") if c.strip()}
COGS = [c for c in COGS_PADRAO if c not in _desativados]
# Ponte com o Minecraft: reservada. Nada é carregado além de um aviso (veja cogs_minecraft/README.md).
ENABLE_MINECRAFT = _flag("ENABLE_MINECRAFT", False)

# --------------------------------------------------------------------------- identidade visual
COR_PRINCIPAL = 0xF28C38  # laranja-raposa
COR_OK = 0x7BC96F
COR_ERRO = 0xE5534B
COR_AVISO = 0xF5C542
COR_INFO = 0x6CB4EE

# ID do comando /bump do DISBOARD: vira um atalho clicável (</bump:ID>) nas mensagens da Kiza.
DISBOARD_BUMP_CMD_ID = 947088344167366698

# Moeda: troque só aqui.
MOEDA_NOME = "Caudas"
MOEDA_SINGULAR = "Cauda"
MOEDA_EMOJI = "🦊"

# --------------------------------------------------------------------------- níveis de permissão
NIVEL_MEMBRO = 0
NIVEL_HELPER = 1
NIVEL_STAFF = 2
NIVEL_ADMIN = 3
NOMES_NIVEL = {0: "Membro", 1: "Helper", 2: "Staff", 3: "Admin"}

# --------------------------------------------------------------------------- funções configuráveis
CANAIS_CONFIG = {
    "boas_vindas": "Boas-vindas",
    "adeus": "Adeus",
    "regras": "Regras",
    "verificacao": "Verificação (botão 'Li e aceito')",
    "painel_cargos": "Painel de cargos",
    "tickets": "Painel de tickets",
    "logs_mod": "Logs de moderação (e transcrições)",
    "logs_gerais": "Logs gerais",
    "sugestoes": "Sugestões",
    "aviso_status": "Aviso fixo (ex.: \"em construção\", status de um addon futuro)",
    "infos": "Infos (fórum ou texto: apresentação do servidor)",
    "kitsune": "Seja um Kitsune (vantagens do VIP)",
    "lore": "Lore (história da Kiza e da toca)",
    "changelog": "Changelog (novidades da Kiza)",
    "comandos": "Comandos (guia dos comandos)",
    "duvidas": "Dúvidas (fórum ou texto: perguntas frequentes)",
    "chat": "Chat principal (pergunta do dia, drops, conversa)",
    "perolas": "Pérolas (mural das mensagens mais curtidas)",
    "bump": "Bump (onde lembrar do /bump do DISBOARD; sem isso, uso o canal do último bump)",
}
# Se um desses canais não estiver no /setup, a Kiza procura um canal cujo nome contenha a palavra
# (sem acento e sem maiúscula). Configurar no /setup sempre vence.
CANAIS_POR_NOME = {
    "infos": "infos",
    "kitsune": "kitsune",
    "lore": "lore",
    "changelog": "changelog",
    "comandos": "comandos",
    "duvidas": "duvidas",
    "chat": "chat",
    "perolas": "perolas",
}
CARGOS_BASE = {
    "visitante": "Visitante (cargo de quem acabou de entrar)",
    "membro": "Membro (após aceitar as regras)",
    "kitsune": "Kitsune (VIP cosmético)",
    "bump": "Avisos de bump (mencionado quando dá para dar /bump de novo)",
    "porteiro": "Porteiro (marcado nas boas-vindas para a equipe receber quem chega)",
    "helper": "Helper (dado pela staff no tíquete Solicitar rank)",
}
GRUPOS_CARGOS = {
    "cores": {"titulo": "🎨 Cores", "placeholder": "🎨 Escolha a cor do seu nome"},
    "genero": {"titulo": "🦊 Como você se identifica", "placeholder": "🦊 Como você se identifica?"},
    "dm": {"titulo": "📨 Mensagens diretas", "placeholder": "📨 Como está sua DM?"},
    "idade": {"titulo": "🎂 Faixa etária (só identificação)", "placeholder": "🎂 Sua faixa etária (opcional)"},
}
# Banners: assets/banners/<nome>.(webp|png|gif|jpg). Variantes <nome>_1, <nome>_2... são sorteadas. Sem arquivo, sai sem imagem.
PASTA_BANNERS = Path(__file__).resolve().parent / "assets" / "banners"
# Emoji de cada cargo do painel, pelo NOME do cargo (sem acento/maiúscula importar). Sem entrada, sai sem emoji.
EMOJIS_CARGOS = {
    "sun": "☀️", "moon": "🌙", "nebulosa": "🔮", "manteiga": "🧈",
    "morango": "🍓", "oceano": "🌊", "selva": "🌿", "melancia": "🍉",
    "garoto": "💙", "garota": "💗", "nao-binario": "💛",
    "dm liberada": "📬", "dm fechada": "📪",
    "+18": "🔞", "-18": "🌱",
}
CATEGORIAS_TICKET = [
    # (chave, rótulo, emoji, descrição)
    ("duvida", "Dúvida", "❓", "Perguntas sobre o servidor"),
    ("denuncia", "Denúncia", "🚨", "Denunciar alguém ou algo"),
    ("parceria", "Parceria", "🤝", "Propostas de parceria"),
    ("outro", "Outro", "💬", "Qualquer outro assunto"),
    ("rank", "Solicitar rank", "🎖️", "Pedir para subir a Helper (com provas)"),
]
NIVEIS_XP_OPCOES = list(range(1, 21))  # 1..20: um cargo por nível (combina com um ladder tipo "LV 01".."LV 20")

# --------------------------------------------------------------------------- visibilidade de categoria/canal
# Cada tier vira permission overwrites de verdade (view_channel/send_messages) quando o admin clica em
# "Aplicar permissões" no /setup. A ordem aqui é a ordem mostrada no menu.
TIERS_VISIBILIDADE = {
    "publico": "🌐 Público (até quem não verificou; só Staff/Admin postam)",
    "membro": "🙂 Membro ou acima",
    "helper": "🛡️ Helper ou acima",
    "staff": "🔨 Staff ou acima",
    "admin": "👑 Só Admin",
}

# --------------------------------------------------------------------------- ajustes numéricos por servidor
# chave: (padrão, mínimo, máximo, descrição). Editáveis com /ajustes.
AJUSTES = {
    "xp_min": (15, 1, 500, "XP mínimo por mensagem"),
    "xp_max": (25, 1, 500, "XP máximo por mensagem"),
    "xp_cooldown": (60, 5, 3600, "Segundos entre mensagens que rendem XP"),
    "xp_aviso_nivel": (1, 0, 1, "1 = avisa no chat quando alguém sobe de nível"),
    "kitsune_xp_pct": (100, 0, 500, "Bônus de XP do cargo Kitsune (%) — 100 = 2x"),
    "kitsune_daily_pct": (0, 0, 500, "Bônus no daily do cargo Kitsune (%)"),
    "daily_base": (100, 1, 100000, "Valor base do /daily"),
    "daily_passo": (10, 0, 10000, "Acréscimo por dia de sequência no /daily"),
    "daily_streak_max": (7, 1, 60, "Dias de sequência que aumentam o /daily"),
    "pagar_max": (5000, 1, 1000000, "Valor máximo por /pagar"),
    "mines_min_aposta": (10, 1, 100000, "Aposta mínima no Mines"),
    "mines_max_aposta": (500, 1, 100000, "Aposta máxima no Mines"),
    "casamento_custo": (2000, 0, 1000000, "Custo do pedido de união"),
    "casamento_expira_h": (24, 1, 168, "Horas até um pedido de união expirar"),
    "aviso_limite": (3, 1, 20, "Avisos ativos para o timeout automático"),
    "aviso_timeout_min": (30, 1, 40320, "Minutos do timeout automático por avisos"),
    "automod_antispam": (1, 0, 1, "1 = antispam ligado"),
    "automod_convites": (1, 0, 1, "1 = bloqueia convites de outros servidores"),
    "automod_links": (0, 0, 1, "1 = bloqueia links"),
    "automod_mencoes": (1, 0, 1, "1 = bloqueia menções em massa"),
    "automod_spam_msgs": (6, 3, 30, "Mensagens na janela que contam como spam"),
    "automod_spam_janela": (8, 3, 60, "Janela do antispam (segundos)"),
    "automod_mencoes_max": (5, 2, 50, "Máximo de menções por mensagem"),
    "automod_strikes": (3, 1, 10, "Infrações do automod (em 2 min) até o timeout"),
    "automod_timeout_min": (5, 1, 1440, "Minutos do timeout curto do automod"),
    "ticket_sla_min": (60, 0, 10080, "Minutos até lembrar a staff de um ticket sem dono (0 = desliga)"),
    "ticket_ping_staff": (1, 0, 1, "1 = menciona a staff ao abrir ticket"),
    "qotd_hora": (19, -1, 23, "Hora da pergunta do dia (-1 = desliga)"),
    "qotd_premio": (50, 0, 100000, "Caudas para quem responder a pergunta do dia"),
    "perolas_min": (3, 1, 50, "Reações ⭐ para uma mensagem virar pérola"),
    "drop_max_dia": (3, 0, 20, "Drops de Caudas por dia no chat (0 = desliga)"),
    "drop_min": (30, 1, 100000, "Valor mínimo de um drop"),
    "drop_max": (80, 1, 100000, "Valor máximo de um drop"),
    "conversa": (1, 0, 1, "1 = Kiza responde menções e cumprimentos"),
    "cerebro": (1, 0, 1, "1 = cérebro (IA) ligado: a Kiza conversa de verdade quando chamada"),
    "cerebro_max_dia": (400, 0, 100000, "Respostas do cérebro por dia no servidor (controle de custo)"),
    "provocar_h": (4, 0, 48, "Horas mínimas entre provocações de chat parado (0 = desliga)"),
    "chat_parado_min": (120, 15, 1440, "Minutos sem mensagem para o chat contar como parado"),
    "niver_premio": (200, 0, 100000, "Caudas de presente de aniversário"),
    "sabado_mult": (2, 1, 5, "Multiplicador de drops no Sábado da Raposa (1 = desliga o evento)"),
    "bump_lembrete": (1, 0, 1, "1 = avisa quando dá para dar /bump de novo"),
    "bump_premio": (30, 0, 100000, "Caudas para quem der /bump no DISBOARD"),
    "bump_xp_pct": (50, 0, 500, "Bônus de XP (%) de quem deu o último bump, por 2h — 50 = 1,5x"),
    "nivel_premio": (25, 0, 10000, "Caudas ao subir de nível (nível × este valor)"),
    "ping_verificacao": (1, 0, 1, "1 = marca quem entra no canal de verificação e apaga em seguida"),
    "helper_bumps": (10, 0, 10000, "Bumps para poder pedir Helper"),
    "helper_boas_vindas": (15, 0, 10000, "Boas-vindas dadas para poder pedir Helper"),
    "helper_denuncias": (2, 0, 10000, "Denúncias aprovadas para poder pedir Helper"),
    "helper_publicacoes": (5, 0, 10000, "Publicações para poder pedir Helper"),
    "helper_nivel": (5, 0, 500, "Nível mínimo de XP para poder pedir Helper"),
    "helper_dias": (30, 0, 3650, "Dias mínimos no servidor para poder pedir Helper"),
}

# --------------------------------------------------------------------------- fidelidade (caminho até Helper)
# tipo: (emoji, rótulo, ajuste com a meta). A ordem aqui é a ordem do quadro do /fidelidade.
FIDELIDADE_TIPOS = {
    "bumps": ("🚀", "Bumps", "helper_bumps"),
    "boas_vindas": ("👋", "Boas-vindas", "helper_boas_vindas"),
    "denuncias": ("🚨", "Denúncias aprovadas", "helper_denuncias"),
    "publicacoes": ("📸", "Publicações", "helper_publicacoes"),
}
FIDELIDADE_NIVEL = ("⭐", "Nível de XP", "helper_nivel")  # requisito que vem do XP, não de um contador
FIDELIDADE_DIAS = ("📅", "Dias no servidor", "helper_dias")  # requisito que vem da data de entrada
BOAS_VINDAS_JANELA = 15 * 60  # segundos depois de uma entrada em que uma boa-vinda conta
BOAS_VINDAS_SAIDA_MIN = 60  # quem sai antes disso não rende boas-vindas (anti-farm com contas que entram e saem)
BOAS_VINDAS_CONTA_MIN_DIAS = 7  # conta do Discord mais nova que isso não rende boas-vindas (anti-conta fake)
BOAS_VINDAS_GENERICA_MAX = 3  # "bem-vindos" sem marcar ninguém vale só para os 3 que chegaram por último
PUBLICACAO_INTERVALO = 10 * 60  # no máximo uma publicação contada a cada 10 min por pessoa
PUBLICACAO_MAX_DIA = 2  # e no máximo 2 a cada 24 h
PUBLICACAO_DESCONTA = 24 * 3600  # publicação apagada antes disso deixa de contar
PING_VERIFICACAO_SEG = 3  # tempo até apagar a marcação no canal de verificação
PORTEIRO_NOME = "🚪 Porteiro"

# --------------------------------------------------------------------------- permissões do bot
# (atributo em discord.Permissions, nome amigável)
PERMISSOES_NECESSARIAS = [
    ("view_channel", "Ver Canais"),
    ("send_messages", "Enviar Mensagens"),
    ("send_messages_in_threads", "Enviar em Threads"),
    ("create_public_threads", "Criar Threads Públicas"),
    ("manage_threads", "Gerenciar Threads"),
    ("embed_links", "Incorporar Links"),
    ("attach_files", "Anexar Arquivos"),
    ("add_reactions", "Adicionar Reações"),
    ("read_message_history", "Ler Histórico de Mensagens"),
    ("use_external_emojis", "Usar Emojis Externos"),
    ("manage_roles", "Gerenciar Cargos"),
    ("manage_channels", "Gerenciar Canais"),
    ("manage_messages", "Gerenciar Mensagens"),
    ("moderate_members", "Moderar Membros"),
    ("kick_members", "Expulsar Membros"),
    ("ban_members", "Banir Membros"),
    ("view_audit_log", "Ver Registro de Auditoria"),
]

# --------------------------------------------------------------------------- ranks e desbloqueios
# (nível mínimo, emoji, nome). A lenda: cada história vivida na toca vira uma cauda.
RANKS = [
    (0, "🌱", "Filhote"),
    (5, "🦊", "Raposinha"),
    (10, "🍂", "Raposa Andarilha"),
    (15, "🌙", "Raposa Lunar"),
    (20, "✨", "Raposa de Nove Caudas"),
]
# Nível mínimo para usar cada cor do painel (pelo NOME do cargo, sem acento/maiúscula). Fora daqui = livre.
CORES_NIVEL = {
    "oceano": 0, "selva": 0, "morango": 0, "manteiga": 0,
    "melancia": 5, "nebulosa": 10, "moon": 15, "sun": 20,
}

# --------------------------------------------------------------------------- XP
XP_BASE_NIVEL = (5, 50, 100)  # xp para subir do nível n: 5n² + 50n + 100
MINES_CASAS = 16
MINES_MARGEM_CASA = 0.03
