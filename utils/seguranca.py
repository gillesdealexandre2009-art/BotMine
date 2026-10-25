"""Segurança: regras puras (detector de raid, contas novas, anti-nuke, links de golpe) e rotinas do Discord
(regras nativas do AutoMod, auditoria de permissões, alerta para a staff).

Tudo que decide fica em funções/classes sem Discord de verdade para ser testado com fakes; o relógio é injetável.
"""
from __future__ import annotations

import logging
import re
import time
import unicodedata
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import timedelta
from typing import TYPE_CHECKING, Any, Callable, Optional

import discord

import config
import textos
from utils.helpers import truncar

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.seguranca")

PREFIXO_REGRA = "Kiza: "


# ============================================================================ contas e janelas
def idade_conta_s(criada_ts: float, agora_ts: float) -> float:
    """Segundos desde que a conta do Discord foi criada (nunca negativo)."""
    return max(0.0, agora_ts - criada_ts)


def conta_nova(criada_ts: float, agora_ts: float, dias: int) -> bool:
    return idade_conta_s(criada_ts, agora_ts) < dias * 86400


def soft_limit_aplica(entrou_ts: float, criada_ts: float, agora_ts: float, minutos: int, dias: int) -> bool:
    """True só para conta nova (menos de `dias`) nos primeiros `minutos` depois de entrar. Antigo ou veterano: sempre False."""
    return agora_ts - entrou_ts <= minutos * 60 and conta_nova(criada_ts, agora_ts, dias)


# ============================================================================ detector de raid por velocidade
@dataclass
class DisparoRaid:
    motivo: str  # "velocidade" ou "contas_novas"
    ids: list[int] = field(default_factory=list)


class DetectorRaid:
    """Conta entradas por servidor numa janela deslizante. Relógio injetável (padrão: time.monotonic)."""

    def __init__(self, relogio: Callable[[], float] = time.monotonic) -> None:
        self._relogio = relogio
        self._hist: defaultdict[int, deque[tuple[float, int, float]]] = defaultdict(deque)

    def registrar(
        self,
        guild_id: int,
        membro_id: int,
        idade_s: float,
        *,
        n: int,
        janela: int,
        m: int,
        muito_nova_s: float,
        janela_novas: int = 60,
    ) -> Optional[DisparoRaid]:
        agora = self._relogio()
        hist = self._hist[guild_id]
        hist.append((agora, membro_id, idade_s))
        limite = max(janela, janela_novas)
        while hist and agora - hist[0][0] > limite:
            hist.popleft()
        recentes = [x for x in hist if agora - x[0] <= janela]
        if len(recentes) >= n:
            hist.clear()
            return DisparoRaid("velocidade", [x[1] for x in recentes])
        novas = [x for x in hist if agora - x[0] <= janela_novas and x[2] < muito_nova_s]
        if len(novas) >= m:
            hist.clear()
            return DisparoRaid("contas_novas", [x[1] for x in novas])
        return None


# ============================================================================ anti-nuke (alerta)
CATEGORIAS_NUKE = {
    "channel_delete": "apagar",
    "role_delete": "apagar",
    "kick": "banir",
    "ban": "banir",
    "webhook_create": "webhook",
}
JANELA_NUKE_S = {"apagar": 30, "banir": 60, "webhook": 60}
AJUSTE_NUKE = {"apagar": "seguranca_nuke_apagar", "banir": "seguranca_nuke_banir", "webhook": "seguranca_nuke_webhook"}


def categoria_nuke(nome_acao: str) -> Optional[str]:
    return CATEGORIAS_NUKE.get(nome_acao)


class ContadorNuke:
    """Ações destrutivas por (servidor, usuário, categoria) numa janela. Dispara uma vez e zera."""

    def __init__(self, relogio: Callable[[], float] = time.monotonic) -> None:
        self._relogio = relogio
        self._hist: defaultdict[tuple[int, int, str], deque[tuple[float, str]]] = defaultdict(deque)

    def registrar(
        self, guild_id: int, user_id: int, categoria: str, descricao: str, limite: int, janela: Optional[int] = None
    ) -> Optional[list[str]]:
        janela = janela or JANELA_NUKE_S[categoria]
        agora = self._relogio()
        hist = self._hist[(guild_id, user_id, categoria)]
        hist.append((agora, descricao))
        while hist and agora - hist[0][0] > janela:
            hist.popleft()
        if len(hist) >= limite:
            itens = [d for _, d in hist]
            hist.clear()
            return itens
        return None


PERMISSOES_NUKE = ("administrator", "manage_guild", "manage_roles", "manage_channels", "ban_members", "kick_members", "manage_webhooks")


def cargos_perigosos(roles: list[Any]) -> list[Any]:
    """Cargos (não padrão, não gerenciados por integração) que têm alguma permissão capaz de destruir o servidor."""
    return [
        r
        for r in roles
        if not r.is_default() and not r.managed and any(getattr(r.permissions, p, False) for p in PERMISSOES_NUKE)
    ]


# ============================================================================ links
_ZERO_LARGURA = re.compile("[​-‏⁠﻿­]")
_PONTO_ESCRITO = re.compile(r"\s*(?:\(\s*dot\s*\)|\[\s*dot\s*\]|\{\s*dot\s*\}|\[\s*\.\s*\]|\(\s*\.\s*\)|\s+dot\s+)\s*", re.I)
_CONVITE = re.compile(
    r"(?:discord(?:app)?\.com/invite|discord\.(?:gg|io|me|li|link)|dsc\.gg|invite\.gg)/+[a-z0-9-]+", re.I
)


def normalizar_link(texto: str) -> str:
    """Tira zero-width, junta letras 'largas' (NFKC) e arruma 'discord . gg / abc', 'discord(dot)gg', 'discord[.]gg'."""
    t = unicodedata.normalize("NFKC", texto or "")
    t = _ZERO_LARGURA.sub("", t).lower()
    t = _PONTO_ESCRITO.sub(".", t)
    t = re.sub(r"\s*\.\s*(?=(?:gg|com|io|me|li|link)\b)", ".", t)  # "discord . gg" -> "discord.gg"
    t = re.sub(r"(?<=\.gg)\s*/\s*|(?<=/invite)\s*/\s*", "/", t)  # ".gg / abc" -> ".gg/abc"
    t = t.replace("\\", "/")
    return t


def tem_convite(texto: str) -> bool:
    """Convite de outro servidor, mesmo escrito com espaços, pontos entre colchetes ou letras largas."""
    return bool(_CONVITE.search(texto or "") or _CONVITE.search(normalizar_link(texto)))


# domínios legítimos (o próprio host ou subdomínios): nunca contam como golpe
DOMINIOS_LEGITIMOS = (
    "discord.com", "discord.gg", "discordapp.com", "discordapp.net", "discord.media", "discord.gift", "discord.new",
    "discordstatus.com", "steamcommunity.com", "steampowered.com", "youtube.com", "youtu.be", "twitch.tv", "google.com",
)
_DISCORD_PARECIDO = re.compile(r"d[i1l]s[ck][o0]r[dc]")
_PALAVRAS_ISCA = ("nitro", "gift", "steam", "giveaway", "airdrop")


def _hosts(texto: str) -> list[str]:
    saida = []
    for token in re.findall(r"[^\s<>()\[\]\"'|]+", normalizar_link(texto)):
        token = re.sub(r"^[a-z]+://", "", token)
        host = re.split(r"[/?#]", token, maxsplit=1)[0]
        if "@" in host:  # https://discord.com@golpe.xyz
            host = host.rsplit("@", 1)[1]
        host = re.sub(r":\d+$", "", host).strip(".,;!*_~")
        if "." in host:
            saida.append(host.removeprefix("www."))
    return saida


def host_legitimo(host: str) -> bool:
    return any(host == d or host.endswith("." + d) for d in DOMINIOS_LEGITIMOS)


def eh_link_golpe(texto: str) -> bool:
    """Domínio que imita Discord/Steam com isca de nitro/presente. Link normal (discord.com, steam, youtube) não conta."""
    for host in _hosts(texto):
        if host_legitimo(host):
            continue
        imita_discord = "discord" in host or bool(_DISCORD_PARECIDO.search(host))
        if imita_discord and any(p in host for p in _PALAVRAS_ISCA):
            return True
        if "steam" in host and any(p in host for p in ("gift", "nitro", "giveaway", "airdrop", "wallet")):
            return True
    return False


# ============================================================================ regras nativas do AutoMod
# Regex do AutoMod do Discord: Rust regex (sem lookaround nem referência retroativa), até 260 caracteres por padrão.
REGEX_MENCOES = r"(?:<@[!&]?\d{5,25}>\s*){8,}"
MAX_REGEX_NATIVA = 260
MENSAGEM_BLOQUEIO = "Mensagem bloqueada pela proteção do servidor."
LIMITE_MENCOES_NATIVO = 8
TIMEOUT_NATIVO_MIN = 10
MAX_ISENTOS_NATIVO = 20
_NAO_SUPORTADO_RUST = ("(?=", "(?!", "(?<=", "(?<!", "\\1", "\\2", "(?P=")


def regex_compativel(padrao: str) -> bool:
    return len(padrao) <= MAX_REGEX_NATIVA and not any(x in padrao for x in _NAO_SUPORTADO_RUST) and bool(re.compile(padrao))


@dataclass
class RegraNativa:
    nome: str
    tipo: str  # "mention_spam", "keyword" ou "spam"
    trigger: discord.AutoModTrigger
    actions: list[discord.AutoModRuleAction]


def montar_regras(canal_alerta_id: Optional[int], *, spam_generico: bool = True) -> list[RegraNativa]:
    """As regras que a Kiza mantém no AutoMod do Discord (nomes com o prefixo 'Kiza: ')."""
    tipos = discord.AutoModRuleTriggerType
    ae = discord.AutoModRuleAction

    def acoes(com_timeout: bool) -> list[discord.AutoModRuleAction]:
        lista = [ae(type=discord.AutoModRuleActionType.block_message, custom_message=MENSAGEM_BLOQUEIO)]
        if canal_alerta_id:
            lista.append(ae(channel_id=canal_alerta_id))
        if com_timeout:
            lista.append(ae(duration=timedelta(minutes=TIMEOUT_NATIVO_MIN)))
        return lista

    regras = [
        RegraNativa(
            PREFIXO_REGRA + "spam de menções",
            "mention_spam",
            discord.AutoModTrigger(type=tipos.mention_spam, mention_limit=LIMITE_MENCOES_NATIVO, mention_raid_protection=True),
            acoes(True),
        ),
        RegraNativa(
            PREFIXO_REGRA + "menções repetidas",
            "keyword",
            discord.AutoModTrigger(type=tipos.keyword, regex_patterns=[REGEX_MENCOES]),
            acoes(True),
        ),
    ]
    if spam_generico and hasattr(tipos, "spam"):
        regras.append(
            RegraNativa(PREFIXO_REGRA + "spam suspeito", "spam", discord.AutoModTrigger(type=tipos.spam), acoes(False))
        )
    return regras


def _tipo_do_trigger(regra: Any) -> str:
    return getattr(getattr(regra.trigger, "type", None), "name", "")


async def ids_isentos_nativo(bot: "Kiza", guild: discord.Guild) -> list[discord.Object]:
    """Cargos staff/admin (do /setup) e o cargo do próprio bot: o AutoMod do Discord não mexe com eles."""
    por_nivel = await bot.banco.cargos_por_nivel(guild.id)
    ids: list[int] = []
    for n in (config.NIVEL_STAFF, config.NIVEL_ADMIN):
        ids.extend(por_nivel.get(n, []))
    meu = getattr(guild, "self_role", None)
    if meu is not None:
        ids.append(meu.id)
    ids = [i for i in dict.fromkeys(ids) if i != guild.id and guild.get_role(i) is not None]
    return [discord.Object(id=i) for i in ids[:MAX_ISENTOS_NATIVO]]


async def aplicar_regras(bot: "Kiza", guild: discord.Guild) -> list[str]:
    """Cria ou atualiza (idempotente pelo nome com prefixo 'Kiza: ') as regras do AutoMod nativo. Devolve linhas de resultado."""
    if not guild.me.guild_permissions.manage_guild:
        return [textos.SEG_REGRAS_SEM_PERM]
    try:
        existentes = await guild.fetch_automod_rules()
    except discord.Forbidden:
        return [textos.SEG_REGRAS_SEM_PERM]
    except discord.HTTPException:
        log.warning("fetch_automod_rules falhou", exc_info=True)
        return [textos.SEG_REGRAS_ERRO]
    canal = await bot.banco.get_config_int(guild.id, "canal_logs_mod")
    canal_ok = canal if canal and guild.get_channel(canal) is not None else None
    isentos = await ids_isentos_nativo(bot, guild)
    linhas: list[str] = []
    if canal_ok is None:
        linhas.append(textos.SEG_REGRAS_SEM_CANAL)
    for regra in montar_regras(canal_ok):
        mesma = next((r for r in existentes if r.name == regra.nome), None)
        if mesma is None and regra.tipo in ("mention_spam", "spam"):  # o Discord só aceita 1 regra desses tipos por servidor
            outra = next((r for r in existentes if _tipo_do_trigger(r) == regra.tipo), None)
            if outra is not None:
                linhas.append(textos.SEG_REGRAS_OUTRA.format(nome=regra.nome, outra=outra.name))
                continue
        try:
            if mesma is None:
                await guild.create_automod_rule(
                    name=regra.nome,
                    event_type=discord.AutoModRuleEventType.message_send,
                    trigger=regra.trigger,
                    actions=regra.actions,
                    enabled=True,
                    exempt_roles=isentos,
                    reason="Kiza: /seguranca aplicar-regras",
                )
                linhas.append(textos.SEG_REGRAS_CRIADA.format(nome=regra.nome))
            else:
                await mesma.edit(
                    trigger=regra.trigger,
                    actions=regra.actions,
                    enabled=True,
                    exempt_roles=isentos,
                    reason="Kiza: /seguranca aplicar-regras",
                )
                linhas.append(textos.SEG_REGRAS_ATUALIZADA.format(nome=regra.nome))
        except discord.Forbidden:
            linhas.append(textos.SEG_REGRAS_SEM_PERM)
            break
        except discord.HTTPException as erro:
            linhas.append(textos.SEG_REGRAS_FALHOU.format(nome=regra.nome, motivo=truncar(getattr(erro, "text", "") or str(erro), 120)))
    return linhas


async def listar_regras(guild: discord.Guild) -> Optional[list[Any]]:
    """Regras do AutoMod do servidor, ou None se não deu para ler."""
    try:
        return list(await guild.fetch_automod_rules())
    except discord.HTTPException:
        return None


# ============================================================================ auditoria de permissões
GRAVIDADES = {"alta": "🔴 Alta", "media": "🟠 Média", "baixa": "🟡 Baixa"}


@dataclass
class Risco:
    gravidade: str
    codigo: str
    titulo: str
    explicacao: str
    sugestao: str
    corrigivel: bool = False


# (permissão, gravidade, título, explicação, sugestão, corrigível com o botão)
RISCOS_EVERYONE = [
    ("mention_everyone", "alta", "@everyone pode mencionar @everyone, @here e todos os cargos",
     "Qualquer pessoa marca o servidor inteiro e dá para floodar notificações.",
     "Tire **Mencionar @everyone** do cargo @everyone.", True),
    ("use_external_apps", "alta", "@everyone pode usar aplicativos externos",
     "Apps instalados na conta de alguém floodam os canais sem a pessoa ser membro.",
     "Tire **Usar aplicativos externos** do @everyone (ou só dos canais abertos).", True),
    ("manage_webhooks", "alta", "@everyone pode gerenciar webhooks",
     "Webhooks permitem mandar mensagens como se fossem de qualquer um.",
     "Tire **Gerenciar webhooks** do @everyone.", True),
    ("create_instant_invite", "baixa", "@everyone pode criar convites",
     "Fica difícil saber de onde vêm os raids.", "Deixe só para quem precisa, se não usa convite de amigo livre.", False),
    ("manage_expressions", "media", "@everyone pode gerenciar emojis e figurinhas",
     "Dá para apagar ou lotar os emojis do servidor.", "Tire **Gerenciar expressões** do @everyone.", False),
]
CORRECOES_SEGURAS = ("mention_everyone", "use_external_apps", "manage_webhooks")
PERMISSOES_AMPLAS = (
    ("administrator", "Administrador"),
    ("manage_guild", "Gerenciar Servidor"),
    ("manage_roles", "Gerenciar Cargos"),
    ("manage_channels", "Gerenciar Canais"),
    ("manage_messages", "Gerenciar Mensagens"),
    ("ban_members", "Banir"),
    ("kick_members", "Expulsar"),
)
PERMISSOES_MODERACAO = ("administrator", "manage_guild", "manage_roles", "manage_channels", "ban_members", "kick_members", "moderate_members")


def auditar(
    guild: Any, *, niveis: dict[int, int], canais_log_ids: list[int], ids_gerenciar: list[int]
) -> list[Risco]:
    """Só lê e relata. `niveis` = cargo -> nível mapeado no /setup (cargo mapeado conta como equipe)."""
    riscos: list[Risco] = []
    padrao = guild.default_role
    for attr, grav, titulo, expl, sug, corrigivel in RISCOS_EVERYONE:
        if getattr(padrao.permissions, attr, False):
            riscos.append(Risco(grav, attr, titulo, expl, sug, corrigivel))

    for role in guild.roles:
        if role.is_default() or role.managed or niveis.get(role.id, 0) >= config.NIVEL_HELPER:
            continue
        tem = [nome for attr, nome in PERMISSOES_AMPLAS if getattr(role.permissions, attr, False)]
        if tem:
            riscos.append(Risco(
                "alta" if "Administrador" in tem or "Gerenciar Servidor" in tem else "media",
                f"cargo_{role.id}",
                f"Cargo {role.name} não é de equipe mas tem: {', '.join(tem)}",
                "Quem tem esse cargo pode mexer no servidor ou punir gente sem estar mapeado como staff.",
                "Tire essas permissões ou mapeie o cargo no /setup (Níveis de permissão).",
            ))

    anuncios = [
        c.name for c in guild.channels
        if getattr(c, "is_news", lambda: False)() and c.permissions_for(padrao).send_messages
    ]
    if anuncios:
        riscos.append(Risco(
            "media", "anuncios", f"@everyone pode enviar mensagens em canal de anúncio ({', '.join(anuncios[:5])})",
            "Uma mensagem num canal de anúncio pode ser publicada em outros servidores.",
            "Tire **Enviar mensagens** do @everyone nesses canais.",
        ))

    for canal_id in canais_log_ids:
        canal = guild.get_channel(canal_id)
        if canal is not None and canal.permissions_for(padrao).view_channel:
            riscos.append(Risco(
                "alta", f"log_{canal_id}", f"O canal de logs #{canal.name} está visível para @everyone",
                "Os logs mostram quem foi punido e mensagens apagadas.", "Deixe visível só para a staff (/setup > Visibilidade).",
            ))

    topo = guild.me.top_role.position
    acima = []
    for cid in ids_gerenciar:
        role = guild.get_role(cid)
        if role is not None and role.position >= topo:
            acima.append(role.name)
    if acima:
        riscos.append(Risco(
            "media", "hierarquia", f"Meu cargo está abaixo de cargos que devo gerenciar ({', '.join(acima[:5])})",
            "Sem hierarquia eu não consigo dar nem tirar esses cargos nem agir sobre quem os tem.",
            "Arraste o cargo da Kiza para cima deles.",
        ))

    mfa = getattr(guild.mfa_level, "value", guild.mfa_level)
    tem_moderadores = any(
        not r.is_default() and any(getattr(r.permissions, p, False) for p in PERMISSOES_MODERACAO) for r in guild.roles
    )
    if int(mfa) == 0 and tem_moderadores:
        riscos.append(Risco(
            "media", "mfa", "Verificação em dois fatores (2FA) para moderadores está desligada",
            "Se a conta de um moderador for roubada, o ladrão ganha as permissões dele.",
            "O dono liga em Configurações do servidor > Segurança (eu não consigo fazer isso).",
        ))
    ordem = {"alta": 0, "media": 1, "baixa": 2}
    return sorted(riscos, key=lambda r: ordem[r.gravidade])


def embed_auditoria(riscos: list[Risco]) -> discord.Embed:
    from utils.helpers import embed

    if not riscos:
        return embed(textos.SEG_AUDITORIA_TITULO, textos.SEG_AUDITORIA_LIMPA, config.COR_OK)
    e = embed(textos.SEG_AUDITORIA_TITULO, textos.SEG_AUDITORIA_RESUMO.format(n=len(riscos)), config.COR_AVISO)
    for r in riscos[:20]:
        e.add_field(
            name=truncar(f"{GRAVIDADES[r.gravidade]} • {r.titulo}", 250),
            value=truncar(f"{r.explicacao}\n➡️ {r.sugestao}", 1000),
            inline=False,
        )
    if len(riscos) > 20:
        e.set_footer(text=f"+{len(riscos) - 20} riscos menores não mostrados")
    return e


async def aplicar_correcoes_seguras(guild: discord.Guild, motivo: str) -> list[str]:
    """Tira Mencionar @everyone, Usar apps externos e Gerenciar webhooks do @everyone (só o que estiver ligado)."""
    padrao = guild.default_role
    perms = padrao.permissions
    mudar = [a for a in CORRECOES_SEGURAS if getattr(perms, a, False)]
    if not mudar:
        return [textos.SEG_CORRECAO_NADA]
    perms.update(**{a: False for a in mudar})
    try:
        await padrao.edit(permissions=perms, reason=motivo)
    except discord.Forbidden:
        return [textos.SEG_CORRECAO_SEM_PERM]
    except discord.HTTPException:
        return [textos.SEG_REGRAS_ERRO]
    return [textos.SEG_CORRECAO_OK.format(perms=", ".join(mudar))]


# ============================================================================ alerta para a staff
async def mencao_staff(bot: "Kiza", guild: discord.Guild) -> tuple[str, discord.AllowedMentions]:
    """Texto marcando os cargos Staff/Admin do /setup (nunca @everyone) e o AllowedMentions que só deixa esses passarem."""
    por_nivel = await bot.banco.cargos_por_nivel(guild.id)
    ids = list(dict.fromkeys(por_nivel.get(config.NIVEL_STAFF, []) + por_nivel.get(config.NIVEL_ADMIN, [])))
    cargos = [r for r in (guild.get_role(i) for i in ids) if r is not None and not r.is_default()][:5]
    return " ".join(r.mention for r in cargos), discord.AllowedMentions(roles=cargos, users=False, everyone=False)


async def enviar_alerta(
    bot: "Kiza", guild: discord.Guild, e: discord.Embed, view: Optional[discord.ui.View] = None, marcar_staff: bool = True
) -> bool:
    """Alerta no canal logs_mod (marca a staff). False se não há canal ou faltou permissão. Nunca levanta exceção do Discord."""
    canal_id = await bot.banco.get_config_int(guild.id, "canal_logs_mod")
    canal = guild.get_channel(canal_id) if canal_id else None
    if canal is None or not isinstance(canal, discord.abc.Messageable):
        return False
    perms = canal.permissions_for(guild.me)  # type: ignore[union-attr]
    if not (perms.view_channel and perms.send_messages):
        return False
    texto, permitidas = await mencao_staff(bot, guild) if marcar_staff else ("", discord.AllowedMentions.none())
    kwargs: dict[str, Any] = {"embed": e, "allowed_mentions": permitidas}
    if texto:
        kwargs["content"] = texto
    if view is not None:
        kwargs["view"] = view
    try:
        await canal.send(**kwargs)
        return True
    except discord.HTTPException:
        log.warning("Falha ao enviar alerta de segurança", exc_info=True)
        return False


def ids_da_lista(bruto: Optional[str]) -> list[int]:
    return [int(p) for p in (bruto or "").split(",") if p.strip().isdigit()]
