"""Embeds da ponte com o Minecraft: funções puras (sem Discord conectado) que viram evento do jogo em mensagem.

Cada evento que o servidor manda (`montar_evento`) vira uma lista de saídas `(canal, texto, embed)`; o cog só entrega.
Os painéis dos canais ip-e-porta e log-in também são montados aqui (`montar_painel_ip`, `montar_painel_login`).
Tudo que vem do jogo já chegou limpo (sem códigos de cor, em uma linha, com tamanho máximo): aqui só se escapa o markdown.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any, Optional

import discord

import config
import textos

COR_ENTROU = 0x57F287
COR_SAIU = 0x95A5A6
COR_MORTE = 0xED4245
COR_STREAK = 0xFEE75C
COR_STREAK_FIM = 0xE67E22
COR_NIVEL = 0x9B59B6
COR_CONQUISTA = 0xF1C40F
COR_CLA_NASCE = 0x2ECC71
COR_CLA_MORRE = 0x7F8C8D
COR_GUERRA = 0xE74C3C
COR_GUERRA_FIM = 0xF39C12
COR_LOGIN = 0x3498DB
COR_ONLINE = 0x57F287
COR_OFFLINE = 0xED4245

LIMITE_CAMPO = 1024
LIMITE_TITULO = 256


@dataclass
class Contexto:
    """O que o bot sabe sobre a pessoa do evento (vazio se a conta não está ligada)."""

    avatar_url: Optional[str] = None
    mencao: str = ""  # <@id> do Discord, se ligada
    discord_nome: str = ""
    nivel: Optional[int] = None
    saldo: Optional[int] = None


Saida = tuple[str, Optional[str], Optional[discord.Embed]]  # (chave do canal, texto, embed)


def esc(texto: Any) -> str:
    """Escapa markdown e menções de um texto do jogo."""
    return discord.utils.escape_mentions(discord.utils.escape_markdown(str(texto)))


def _corta(texto: str, limite: int) -> str:
    return texto if len(texto) <= limite else texto[: limite - 1] + "…"


def formatar_duracao(segundos: int) -> str:
    segundos = max(0, int(segundos))
    h, resto = divmod(segundos, 3600)
    m, s = divmod(resto, 60)
    if h:
        return f"{h}h {m:02d}min"
    if m:
        return f"{m}min"
    return f"{s}s"


def _base(titulo: str, descricao: str, cor: int, nome: str = "", ctx: Optional[Contexto] = None) -> discord.Embed:
    e = discord.Embed(title=_corta(titulo, LIMITE_TITULO), description=descricao, color=cor, timestamp=discord.utils.utcnow())
    if nome:
        e.set_author(name=nome, icon_url=ctx.avatar_url if ctx and ctx.avatar_url else None)
    e.set_footer(text=textos.MC_RODAPE)
    return e


# ------------------------------------------------------------------ chat
def montar_morte(ev: dict[str, Any], ctx: Contexto, sorteio: random.Random = random) -> discord.Embed:  # type: ignore[assignment]
    vitima = esc(ev["nome"])
    matador = esc(ev.get("matador", ""))
    causa = str(ev.get("causa", "outro"))
    tipo_matador = ev.get("matador_tipo", "")
    if tipo_matador == "jogador" and matador:
        chave = "pvp"
    elif tipo_matador == "mob" and matador:
        chave = "mob"
    else:
        chave = causa if causa in textos.MC_MORTE_FRASES else "outro"
    frase = sorteio.choice(textos.MC_MORTE_FRASES[chave]).format(v=vitima, m=matador)
    local = esc(ev.get("local", ""))
    if local:
        frase += "\n" + textos.MC_MORTE_LOCAL.format(local=local)
    return _base(textos.MC_MORTE_TITULO.format(nome=ev["nome"]), frase, COR_MORTE, ev["nome"], ctx)


def montar_entrada(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    novo = bool(ev.get("novo"))
    titulo = textos.MC_ENTROU_NOVO.format(nome=ev["nome"]) if novo else textos.MC_ENTROU_TITULO.format(nome=ev["nome"])
    return _base(titulo, textos.MC_ENTROU_DESC.format(nome=esc(ev["nome"])), COR_ENTROU, ev["nome"], ctx)


def montar_saida(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    desc = textos.MC_SAIU_DESC.format(nome=esc(ev["nome"]))
    if ev.get("sessao", 0) > 0:
        desc += "\n" + textos.MC_SAIU_SESSAO.format(tempo=formatar_duracao(ev["sessao"]))
    return _base(textos.MC_SAIU_TITULO.format(nome=ev["nome"]), desc, COR_SAIU, ev["nome"], ctx)


def montar_streak(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    return _base(
        textos.MC_STREAK_TITULO.format(nome=ev["nome"]),
        textos.MC_STREAK_DESC.format(nome=esc(ev["nome"]), n=ev["n"]),
        COR_STREAK,
        ev["nome"],
        ctx,
    )


def montar_streak_fim(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    return _base(
        textos.MC_STREAK_FIM_TITULO,
        textos.MC_STREAK_FIM_DESC.format(matador=esc(ev["nome"]), vitima=esc(ev.get("vitima", "")), n=ev["n"]),
        COR_STREAK_FIM,
        ev["nome"],
        ctx,
    )


def montar_nivel(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    return _base(
        textos.MC_NIVEL_TITULO.format(nome=ev["nome"]),
        textos.MC_NIVEL_DESC.format(nome=esc(ev["nome"]), nivel=ev["nivel"], rank=esc(ev.get("rank", ""))),
        COR_NIVEL,
        ev["nome"],
        ctx,
    )


def montar_conquista(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    return _base(
        textos.MC_CONQUISTA_TITULO.format(nome=ev["nome"]),
        textos.MC_CONQUISTA_DESC.format(nome=esc(ev["nome"]), conquista=esc(ev.get("conquista", ""))),
        COR_CONQUISTA,
        ev["nome"],
        ctx,
    )


# ------------------------------------------------------------------ histórico
def montar_cla_criado(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    desc = textos.MC_CLA_CRIADO_DESC.format(tag=esc(ev["cla_tag"]), nome=esc(ev["cla_nome"]), fundador=esc(ev.get("fundador", "?")))
    return _base(textos.MC_CLA_CRIADO_TITULO, desc, COR_CLA_NASCE)


def montar_cla_extinto(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    desc = textos.MC_CLA_EXTINTO_DESC.format(tag=esc(ev["cla_tag"]), nome=esc(ev["cla_nome"]))
    desc += "\n" + textos.MC_CLA_EXTINTO_VIDA.format(dias=ev.get("dias", 0), membros=ev.get("membros", 0))
    return _base(textos.MC_CLA_EXTINTO_TITULO, desc, COR_CLA_MORRE)


def montar_guerra_inicio(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    desc = textos.MC_GUERRA_INICIO_DESC.format(a=esc(ev["a"]), b=esc(ev["b"]))
    extras = []
    if ev.get("aposta", 0) > 0:
        extras.append(textos.MC_GUERRA_APOSTA.format(valor=_moeda(ev["aposta"])))
    if ev.get("ctf"):
        extras.append(textos.MC_GUERRA_CTF)
    if extras:
        desc += "\n" + "\n".join(extras)
    return _base(textos.MC_GUERRA_INICIO_TITULO, desc, COR_GUERRA)


def montar_guerra_fim(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    a, b, pa, pb = esc(ev["a"]), esc(ev["b"]), ev.get("pa", 0), ev.get("pb", 0)
    vencedor = ev.get("vencedor", "")
    if vencedor and vencedor in (ev["a"], ev["b"]):
        perdedor = ev["b"] if vencedor == ev["a"] else ev["a"]
        # o placar sempre na ordem do vencedor primeiro
        pv, pp = (pa, pb) if vencedor == ev["a"] else (pb, pa)
        desc = textos.MC_GUERRA_FIM_VENCEU.format(vencedor=esc(vencedor), perdedor=esc(perdedor), pa=pv, pb=pp)
    else:
        desc = textos.MC_GUERRA_FIM_EMPATE.format(a=a, b=b, pa=pa, pb=pb)
    motivo = textos.MC_GUERRA_MOTIVOS.get(str(ev.get("motivo", "")), "")
    if motivo:
        desc += f" *({motivo})*"
    extras = []
    if ev.get("premio", 0) > 0:
        extras.append(textos.MC_GUERRA_PREMIO.format(valor=_moeda(ev["premio"])))
    if ev.get("cacador"):
        extras.append(textos.MC_GUERRA_CACADOR.format(nome=esc(ev["cacador"]), n=ev.get("cacador_n", 0)))
    if ev.get("capturas_a", 0) or ev.get("capturas_b", 0):
        extras.append(textos.MC_GUERRA_CAPTURAS.format(a=ev.get("capturas_a", 0), b=ev.get("capturas_b", 0)))
    if extras:
        desc += "\n" + "\n".join(extras)
    return _base(textos.MC_GUERRA_FIM_TITULO, desc, COR_GUERRA_FIM)


def _moeda(valor: int) -> str:
    nome = config.MOEDA_SINGULAR if abs(valor) == 1 else config.MOEDA_NOME
    return f"{valor:,}".replace(",", ".") + f" {config.MOEDA_EMOJI} {nome}"


# ------------------------------------------------------------------ login
def montar_login_entrou(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    desc = textos.MC_LOGIN_ENTROU_DESC.format(nome=esc(ev["nome"]), discord=ctx.mencao or esc(ctx.discord_nome) or "—")
    e = _base(textos.MC_LOGIN_ENTROU_TITULO, desc, COR_LOGIN, ev["nome"], ctx)
    if ctx.nivel is not None:
        e.add_field(name=textos.MC_LOGIN_CAMPO_NIVEL, value=str(ctx.nivel), inline=True)
    if ctx.saldo is not None:
        e.add_field(name=textos.MC_LOGIN_CAMPO_CAUDAS, value=_moeda(ctx.saldo), inline=True)
    return e


def montar_login_saiu(ev: dict[str, Any], ctx: Contexto) -> discord.Embed:
    e = _base(textos.MC_LOGIN_SAIU_TITULO, textos.MC_LOGIN_SAIU_DESC.format(nome=esc(ev["nome"])), COR_SAIU, ev["nome"], ctx)
    if ev.get("sessao", 0) > 0:
        e.add_field(name=textos.MC_LOGIN_CAMPO_SESSAO, value=formatar_duracao(ev["sessao"]), inline=True)
    return e


def montar_vinculado(nome_mc: str, ctx: Contexto) -> discord.Embed:
    desc = textos.MC_LOGIN_VINCULADO_DESC.format(discord=ctx.mencao or esc(ctx.discord_nome), nome=esc(nome_mc))
    e = _base(textos.MC_LOGIN_VINCULADO_TITULO, desc, COR_ENTROU, ctx.discord_nome, ctx)
    e.add_field(name=textos.MC_LOGIN_CAMPO_MC, value=esc(nome_mc), inline=True)
    e.add_field(name=textos.MC_LOGIN_CAMPO_DISCORD, value=ctx.mencao or esc(ctx.discord_nome), inline=True)
    return e


def montar_desvinculado(nome_mc: str, ctx: Contexto, staff: str) -> discord.Embed:
    desc = textos.MC_LOGIN_DESVINCULADO_DESC.format(discord=ctx.mencao or esc(ctx.discord_nome), nome=esc(nome_mc), staff=staff)
    return _base(textos.MC_LOGIN_DESVINCULADO_TITULO, desc, COR_MORTE, ctx.discord_nome, ctx)


def montar_codigo_recusado(ctx: Contexto) -> discord.Embed:
    desc = textos.MC_LOGIN_FALHA_DESC.format(discord=ctx.mencao or esc(ctx.discord_nome))
    return _base(textos.MC_LOGIN_FALHA_TITULO, desc, COR_STREAK_FIM, ctx.discord_nome, ctx)


# ------------------------------------------------------------------ despacho
TIPOS_EVENTO = frozenset(
    {"msg", "entrada", "saida", "morte", "streak", "streak_fim", "nivel", "conquista", "cla_criado", "cla_extinto", "guerra_inicio", "guerra_fim"}
)


def montar_evento(ev: dict[str, Any], ctx: Contexto, sorteio: random.Random = random) -> list[Saida]:  # type: ignore[assignment]
    """Evento do jogo (já validado) -> o que postar e onde."""
    t = ev["t"]
    if t == "msg":
        return [("mc_chat", textos.MC_PONTE_MSG.format(nome=esc(ev["nome"]), texto=discord.utils.escape_mentions(ev["texto"])), None)]
    if t == "entrada":
        return [("mc_chat", None, montar_entrada(ev, ctx)), ("mc_login", None, montar_login_entrou(ev, ctx))]
    if t == "saida":
        return [("mc_chat", None, montar_saida(ev, ctx)), ("mc_login", None, montar_login_saiu(ev, ctx))]
    if t == "morte":
        return [("mc_chat", None, montar_morte(ev, ctx, sorteio))]
    if t == "streak":
        return [("mc_chat", None, montar_streak(ev, ctx))]
    if t == "streak_fim":
        return [("mc_chat", None, montar_streak_fim(ev, ctx))]
    if t == "nivel":
        return [("mc_chat", None, montar_nivel(ev, ctx))]
    if t == "conquista":
        return [("mc_chat", None, montar_conquista(ev, ctx))]
    if t == "cla_criado":
        return [("mc_historico", None, montar_cla_criado(ev, ctx))]
    if t == "cla_extinto":
        return [("mc_historico", None, montar_cla_extinto(ev, ctx))]
    if t == "guerra_inicio":
        return [("mc_historico", None, montar_guerra_inicio(ev, ctx))]
    if t == "guerra_fim":
        return [("mc_historico", None, montar_guerra_fim(ev, ctx))]
    return []


# ------------------------------------------------------------------ painéis
def status_online(status: Optional[dict[str, Any]], agora: float) -> bool:
    return bool(status) and agora - float(status.get("ts", 0)) <= config.MC_STATUS_VALIDADE  # type: ignore[union-attr]


NOMES_NO_JOGO = {"principal": "VULPUS", "alternativo": "VULPUS-ALT"}


def link_servidor(chave: str) -> str:
    """Link que abre o Minecraft já com o servidor para adicionar (minecraft://?addExternalServer=NOME|ip:porta)."""
    for c, ip, porta in config.MC_SERVIDORES:
        if c == chave:
            return f"minecraft://?addExternalServer={NOMES_NO_JOGO.get(c, c.upper())}|{ip}:{porta}"
    return ""


def botoes_ip() -> list[tuple[str, str]]:
    """(texto, endereço) dos botões do painel de IP. O Discord só deixa clicar em https: o endereço é a página /entrar do site,
    que abre o minecraft://?addExternalServer=... no aparelho."""
    base = config.MC_SITE_URL.rstrip("/")
    botoes = [(textos.MC_BOTAO_ABRIR, f"{base}/entrar/")]
    if link_servidor("alternativo"):
        botoes.append((textos.MC_BOTAO_ABRIR_ALT, f"{base}/entrar/?s=alt"))
    return botoes


def nome_canal_online(status: Optional[dict[str, Any]], agora: float) -> str:
    """Nome do canal contador: '🟢 Online | (2) 🦊', ou o de fora do ar quando o servidor não dá notícias."""
    if status_online(status, agora) and status is not None:
        return textos.MC_ONLINE_NOME.format(n=len(status.get("online", [])))
    return textos.MC_OFFLINE_NOME


def montar_painel_ip(
    status: Optional[dict[str, Any]], agora: float, mencao_login: str = "#log-in", imagem: Optional[str] = None
) -> discord.Embed:
    online = status_online(status, agora)
    e = discord.Embed(
        title=textos.MC_IP_TITULO,
        description=textos.MC_IP_DESC,
        color=COR_ONLINE if online else COR_OFFLINE,
    )
    if imagem:
        e.set_image(url=f"attachment://{imagem}")
    nomes = {"principal": textos.MC_IP_CAMPO_PRINCIPAL, "alternativo": textos.MC_IP_CAMPO_ALTERNATIVO}
    for chave, ip, porta in config.MC_SERVIDORES:
        e.add_field(name=nomes.get(chave, chave), value=textos.MC_IP_VALOR.format(ip=ip, porta=porta), inline=True)
    rapido = textos.MC_IP_RAPIDO.format(link=link_servidor("principal"))
    e.add_field(name=textos.MC_IP_CAMPO_RAPIDO, value=_corta(rapido, LIMITE_CAMPO), inline=False)
    e.add_field(name=textos.MC_IP_CAMPO_COMO, value=_corta(textos.MC_IP_COMO.format(login=mencao_login), LIMITE_CAMPO), inline=False)
    if online and status is not None:
        lista = [esc(n) for n in status.get("online", [])]
        maximo = status.get("max") or config.MC_MAX_JOGADORES
        valor = textos.MC_IP_STATUS_ON.format(n=len(lista), max=maximo)
        if lista:
            valor += textos.MC_IP_STATUS_ON_LISTA.format(lista=", ".join(lista))
        else:
            valor += textos.MC_IP_STATUS_VAZIO
    else:
        valor = textos.MC_IP_STATUS_OFF
    e.add_field(name=textos.MC_IP_CAMPO_STATUS, value=_corta(valor, LIMITE_CAMPO), inline=False)
    e.add_field(name=textos.MC_IP_CAMPO_VERSAO, value=textos.MC_IP_VERSAO, inline=False)
    e.set_footer(text=textos.MC_IP_RODAPE)
    return e


def montar_painel_login(mencao_chat: str = "#chat-bridge") -> discord.Embed:
    e = discord.Embed(title=textos.MC_LOGINP_TITULO, description=textos.MC_LOGINP_DESC, color=config.COR_PRINCIPAL)
    ip = config.MC_SERVIDORES[0][1] if config.MC_SERVIDORES else ""
    e.add_field(name=textos.MC_LOGINP_CAMPO_PASSOS, value=textos.MC_LOGINP_PASSOS.format(ip=f"`{ip}`"), inline=False)
    e.add_field(name=textos.MC_LOGINP_CAMPO_VANTAGENS, value=textos.MC_LOGINP_VANTAGENS.format(chat=mencao_chat), inline=False)
    e.set_footer(text=textos.MC_LOGINP_RODAPE)
    return e


def montar_ajuda_login() -> discord.Embed:
    return discord.Embed(title=textos.MC_AJUDA_TITULO, description=textos.MC_AJUDA_DESC, color=config.COR_INFO)
