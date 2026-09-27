"""Funções de apoio: embeds, durações, logs, publicação de painéis, XP."""
from __future__ import annotations

import logging
import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Optional

import discord

import config

try:
    from zoneinfo import ZoneInfo

    TZ = ZoneInfo("America/Sao_Paulo")
except Exception:  # tzdata ausente
    TZ = timezone(timedelta(hours=-3), "BRT")

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.helpers")


# ---------------------------------------------------------------- tempo
def agora_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def hoje_e_ontem() -> tuple[str, str]:
    """Datas (ISO) de hoje e ontem no fuso de São Paulo, usadas na sequência do /daily."""
    hoje = datetime.now(TZ).date()
    return hoje.isoformat(), (hoje - timedelta(days=1)).isoformat()


_DUR = re.compile(r"(\d+)([smhdw])")
_MULT = {"s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800}


def parse_duracao(texto: str) -> Optional[int]:
    """'10m' -> 600, '1h30m' -> 5400. None se inválido."""
    texto = texto.strip().lower().replace(" ", "")
    if not texto:
        return None
    total, pos = 0, 0
    for achado in _DUR.finditer(texto):
        if achado.start() != pos:
            return None
        total += int(achado.group(1)) * _MULT[achado.group(2)]
        pos = achado.end()
    if pos != len(texto) or total <= 0:
        return None
    return total


def formatar_duracao(segundos: int) -> str:
    segundos = int(segundos)
    partes = []
    for nome, valor in (("d", 86400), ("h", 3600), ("min", 60), ("s", 1)):
        qtd, segundos = divmod(segundos, valor)
        if qtd:
            partes.append(f"{qtd}{nome}")
    return " ".join(partes) or "0s"


# ---------------------------------------------------------------- texto
def truncar(texto: Optional[str], limite: int = 1000) -> str:
    texto = texto or ""
    return texto if len(texto) <= limite else texto[: limite - 1] + "…"


def slug(texto: str, maximo: int = 20) -> str:
    base = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    return (base or "usuario")[:maximo].strip("-") or "usuario"


def formatar_numero(valor: int) -> str:
    return f"{valor:,}".replace(",", ".")


def formatar_moeda(valor: int) -> str:
    nome = config.MOEDA_SINGULAR if abs(valor) == 1 else config.MOEDA_NOME
    return f"{formatar_numero(valor)} {config.MOEDA_EMOJI} {nome}"


def barra_progresso(atual: int, total: int, tamanho: int = 12) -> str:
    cheio = 0 if total <= 0 else min(tamanho, int(tamanho * atual / total))
    return "▰" * cheio + "▱" * (tamanho - cheio)


def embed(titulo: Optional[str] = None, descricao: Optional[str] = None, cor: Optional[int] = None) -> discord.Embed:
    return discord.Embed(title=titulo, description=descricao, color=config.COR_PRINCIPAL if cor is None else cor)


# ---------------------------------------------------------------- XP
def xp_para_subir(nivel: int) -> int:
    a, b, c = config.XP_BASE_NIVEL
    return a * nivel * nivel + b * nivel + c


def nivel_por_xp(xp: int) -> tuple[int, int, int]:
    """Retorna (nivel, xp_dentro_do_nivel, xp_necessario_para_o_proximo)."""
    nivel, restante = 0, max(0, xp)
    while restante >= xp_para_subir(nivel):
        restante -= xp_para_subir(nivel)
        nivel += 1
    return nivel, restante, xp_para_subir(nivel)


# ---------------------------------------------------------------- erros / respostas
def registrar_erro(erro: BaseException) -> str:
    codigo = uuid.uuid4().hex[:8]
    log.error("Erro %s", codigo, exc_info=erro)
    return codigo


async def responder(interaction: discord.Interaction, conteudo: Optional[str] = None, **kwargs: Any) -> None:
    """Responde uma interação (ou usa followup se já respondeu). Nunca levanta exceção do Discord."""
    kwargs.setdefault("ephemeral", True)
    if conteudo is not None:
        kwargs["content"] = conteudo
    kwargs = {k: v for k, v in kwargs.items() if v is not None}
    try:
        if interaction.response.is_done():
            await interaction.followup.send(**kwargs)
        else:
            await interaction.response.send_message(**kwargs)
    except discord.HTTPException:
        log.warning("Não consegui responder a interação", exc_info=True)


# ---------------------------------------------------------------- cargos e canais
def pode_gerenciar_cargo(guild: discord.Guild, cargo: discord.Role) -> bool:
    return not cargo.is_default() and not cargo.managed and cargo < guild.me.top_role


def faltas_no_canal(canal: discord.abc.GuildChannel, guild: discord.Guild, extras: tuple[str, ...] = ()) -> list[str]:
    """Permissões que faltam à Kiza num canal (nomes amigáveis)."""
    perms = canal.permissions_for(guild.me)
    nomes = {
        "view_channel": "Ver Canal",
        "send_messages": "Enviar Mensagens",
        "embed_links": "Incorporar Links",
        "attach_files": "Anexar Arquivos",
        "read_message_history": "Ler Histórico",
        "add_reactions": "Adicionar Reações",
        "manage_messages": "Gerenciar Mensagens",
    }
    obrigatorias = ("view_channel", "send_messages", "embed_links") + extras
    return [nomes.get(p, p) for p in obrigatorias if not getattr(perms, p)]


async def enviar_log(
    bot: "Kiza",
    guild: discord.Guild,
    canal_chave: str,
    *,
    embed: Optional[discord.Embed] = None,
    arquivo: Optional[discord.File] = None,
    conteudo: Optional[str] = None,
) -> bool:
    """Envia algo para o canal de log configurado ('logs_mod' ou 'logs_gerais'). True se enviou."""
    canal_id = await bot.banco.get_config_int(guild.id, f"canal_{canal_chave}")
    if not canal_id:
        return False
    canal = guild.get_channel(canal_id)
    if canal is None or not isinstance(canal, discord.abc.Messageable):
        return False
    perms = canal.permissions_for(guild.me)  # type: ignore[union-attr]
    if not (perms.view_channel and perms.send_messages):
        return False
    kwargs: dict[str, Any] = {"allowed_mentions": discord.AllowedMentions.none()}
    if embed is not None:
        kwargs["embed"] = embed
    if arquivo is not None:
        kwargs["file"] = arquivo
    if conteudo is not None:
        kwargs["content"] = conteudo
    try:
        await canal.send(**kwargs)
        return True
    except discord.HTTPException:
        log.warning("Falha ao enviar log para #%s", canal_chave, exc_info=True)
        return False


async def publicar_ou_editar(
    bot: "Kiza",
    guild: discord.Guild,
    canal: discord.TextChannel,
    chave_msg: str,
    *,
    embeds: list[discord.Embed],
    view: Optional[discord.ui.View] = None,
    content: Optional[str] = None,
) -> discord.Message:
    """Publica um painel; se já existir uma publicação anterior desse painel, edita em vez de duplicar."""
    msg_id = await bot.banco.get_config_int(guild.id, f"msg_{chave_msg}")
    extra: dict[str, Any] = {}
    if view is not None:
        extra["view"] = view
    if msg_id:
        try:
            msg = await canal.fetch_message(msg_id)
            await msg.edit(content=content, embeds=embeds, **extra)
            return msg
        except (discord.NotFound, discord.Forbidden):
            pass
    msg = await canal.send(content=content, embeds=embeds, allowed_mentions=discord.AllowedMentions.none(), **extra)
    await bot.banco.set_config(guild.id, f"msg_{chave_msg}", str(msg.id))
    return msg
