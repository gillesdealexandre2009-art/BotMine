"""Feedback do servidor e códigos de resgate de Caudas.

* **Painel de feedback** (canal "feedback", só leitura): botão abre um formulário (nota, opinião, o que melhorar). Vai para os logs da staff
  e a pessoa recebe, só para ela, o pedido de avaliar o servidor no DISBOARD e um código pessoal de 1.000 Caudas.
  O DISBOARD não dá como conferir a avaliação: o código é na confiança. Antiabuso: mínimo de 20 caracteres, 60 s entre envios, um código
  por pessoa (para sempre), novo feedback só depois de 30 dias, código pessoal (só o dono resgata) e só vale com conta de Minecraft ligada.
* **Códigos** (`/codigo`, staff): criar, listar, desativar e ver usos. `/resgatar` troca o código por Caudas (o jogo usa a mesma função pela ponte).
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from database.codigos import CARACTERES_MIN_FEEDBACK, VALIDADE_FEEDBACK_DIAS, ResultadoCodigo, normalizar_codigo
from utils.helpers import canal_da_funcao, embed, enviar_log, formatar_moeda, publicar_ou_editar
from utils.permissoes import checar_membro, exigir_nivel

if TYPE_CHECKING:  # pragma: no cover
    from main import Kiza

log = logging.getLogger("kiza.feedback")
ESPERA_ENTRE_ENVIOS = 60.0
POR_PAGINA = 8
DIA = 86400


# ------------------------------------------------------------------ funções puras (testáveis)
def ler_nota(bruto: str) -> Optional[int]:
    """'4' -> 4; qualquer coisa fora de 1 a 5 -> None."""
    limpo = bruto.strip()
    return int(limpo) if limpo in {"1", "2", "3", "4", "5"} else None


def texto_longo_o_bastante(texto: str) -> bool:
    return len(" ".join(texto.split())) >= CARACTERES_MIN_FEEDBACK


def mensagem_do_resultado(r: ResultadoCodigo) -> str:
    """Texto puro (serve para o Discord e para o jogo)."""
    if r.ok:
        return textos.CODIGO_OK.format(caudas=f"{r.caudas:,}".replace(",", "."))
    return textos.CODIGO_RESPOSTAS.get(r.status, textos.CODIGO_RESGATAR_ERRO)


def codigo_valido(codigo: str) -> bool:
    return 4 <= len(codigo) <= 40 and all(c.isalnum() or c == "-" for c in codigo)


def resumo_usos(linha) -> str:
    return textos.CODIGO_USOS_ILIMITADOS if not linha["usos_max"] else f"{linha['usos']}/{linha['usos_max']} usos"


def resumo_validade(linha) -> str:
    if not linha["expira_em"]:
        return textos.CODIGO_SEM_VALIDADE
    return textos.CODIGO_VALE_ATE.format(quando=f"<t:{linha['expira_em']}:d>")


def estado_do_codigo(linha, agora: int) -> str:
    if not linha["ativo"]:
        return "⛔"
    if linha["expira_em"] and linha["expira_em"] <= agora:
        return "⌛"
    if linha["usos_max"] and linha["usos"] >= linha["usos_max"]:
        return "✅"
    return "🟢"


def linha_da_lista(linha, agora: int) -> str:
    extra = f" · 👤 <@{linha['dono_id']}>" if linha["dono_id"] else ""
    return textos.CODIGO_LISTA_LINHA.format(
        estado=estado_do_codigo(linha, agora),
        codigo=linha["codigo"],
        caudas=linha["caudas"],
        usos=resumo_usos(linha),
        validade=resumo_validade(linha),
        extra=extra,
    )


# ------------------------------------------------------------------ painel e formulário
class FeedbackModal(discord.ui.Modal, title=textos.FEEDBACK_MODAL_TITULO):
    def __init__(self, cog: "Feedback") -> None:
        super().__init__(timeout=900)
        self.cog = cog
        self.nota = discord.ui.TextInput(label=textos.FEEDBACK_CAMPO_NOTA, min_length=1, max_length=1, placeholder="5")
        self.texto = discord.ui.TextInput(
            label=textos.FEEDBACK_CAMPO_TEXTO, style=discord.TextStyle.paragraph, min_length=CARACTERES_MIN_FEEDBACK, max_length=1000
        )
        self.melhorar = discord.ui.TextInput(
            label=textos.FEEDBACK_CAMPO_MELHORAR, style=discord.TextStyle.paragraph, required=False, max_length=500
        )
        for campo in (self.nota, self.texto, self.melhorar):
            self.add_item(campo)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await self.cog.receber(interaction, str(self.nota.value), str(self.texto.value), str(self.melhorar.value))


class PainelFeedbackView(discord.ui.View):
    def __init__(self, cog: "Feedback") -> None:
        super().__init__(timeout=None)
        self.cog = cog

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    @discord.ui.button(label=textos.FEEDBACK_BOTAO, emoji="💬", style=discord.ButtonStyle.primary, custom_id="kiza:feedback:abrir")
    async def abrir(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await interaction.response.send_modal(FeedbackModal(self.cog))


class PaginaCodigosView(discord.ui.View):
    def __init__(self, cog: "Feedback", autor_id: int, guild_id: int, pagina: int, total: int) -> None:
        super().__init__(timeout=180)
        self.cog, self.autor_id, self.guild_id, self.pagina, self.total = cog, autor_id, guild_id, pagina, total
        paginas = max(1, -(-total // POR_PAGINA))
        self.anterior.disabled = pagina <= 0
        self.proxima.disabled = pagina >= paginas - 1

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return interaction.user.id == self.autor_id

    @discord.ui.button(label="Anterior", emoji="⬅️", style=discord.ButtonStyle.secondary)
    async def anterior(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.cog.mostrar_pagina(interaction, self.pagina - 1, editar=True)

    @discord.ui.button(label="Próxima", emoji="➡️", style=discord.ButtonStyle.secondary)
    async def proxima(self, interaction: discord.Interaction, botao: discord.ui.Button) -> None:
        await self.cog.mostrar_pagina(interaction, self.pagina + 1, editar=True)


class Feedback(commands.Cog):
    feedback = app_commands.Group(name="feedback", description="Feedback sobre o servidor.", guild_only=True)
    codigo = app_commands.Group(name="codigo", description="(Staff) Códigos de resgate de Caudas.", guild_only=True)

    def __init__(self, bot: "Kiza") -> None:
        self.bot = bot
        self._ultimo_envio: dict[int, float] = {}

    def views_persistentes(self) -> list[discord.ui.View]:
        return [PainelFeedbackView(self)]

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        return await checar_membro(interaction)

    # ------------------------------------------------------------------ painel
    @staticmethod
    def embed_painel() -> discord.Embed:
        e = embed(textos.FEEDBACK_PAINEL_TITULO, textos.FEEDBACK_PAINEL_DESC.format(moeda=config.MOEDA_NOME), config.COR_PRINCIPAL)
        e.set_footer(text=textos.FEEDBACK_PAINEL_RODAPE)
        return e

    async def publicar_painel(self, guild: discord.Guild) -> tuple[bool, str]:
        canal = await canal_da_funcao(self.bot, guild, "feedback")
        if not isinstance(canal, discord.TextChannel):
            return False, textos.SETUP_SEM_CANAL
        try:
            await publicar_ou_editar(
                self.bot, guild, canal, "feedback", embeds=[self.embed_painel()], view=PainelFeedbackView(self),
                mencoes=discord.AllowedMentions.none(),
            )
        except discord.HTTPException:
            log.warning("Falha ao publicar o painel de feedback", exc_info=True)
            return False, textos.SETUP_ERRO_PUBLICAR
        return True, canal.mention

    @feedback.command(name="configurar", description="(Admin) Cria o canal de feedback (só leitura) e publica o painel.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def configurar(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        assert guild is not None
        await interaction.response.defer(ephemeral=True)
        banco = self.bot.banco
        existente = await canal_da_funcao(self.bot, guild, "feedback")
        reaproveitou = isinstance(existente, discord.TextChannel)
        canal = existente
        if not reaproveitou:
            infos = await canal_da_funcao(self.bot, guild, "infos")
            categoria = infos.category if isinstance(infos, discord.TextChannel) else None
            regras = {
                guild.default_role: discord.PermissionOverwrite(
                    view_channel=True, read_message_history=True, send_messages=False, add_reactions=False,
                    create_public_threads=False, create_private_threads=False,
                ),
                guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, embed_links=True, read_message_history=True),
            }
            try:
                canal = await guild.create_text_channel(
                    textos.FEEDBACK_CANAL_NOME, category=categoria, overwrites=regras, reason="Kiza: canal de feedback"
                )
            except discord.HTTPException:
                log.warning("Não consegui criar o canal de feedback", exc_info=True)
                await interaction.followup.send(textos.FEEDBACK_SEM_PERMISSAO, ephemeral=True)
                return
        await banco.set_config(guild.id, "canal_feedback", str(canal.id))  # type: ignore[union-attr]
        ok, info = await self.publicar_painel(guild)
        if not ok:
            await interaction.followup.send(textos.SETUP_PUBLICAR_FALTA.format(o_que="Feedback", motivo=info), ephemeral=True)
            return
        modelo = textos.FEEDBACK_REAPROVEITADO if reaproveitou else textos.FEEDBACK_CONFIGURADO
        await interaction.followup.send(modelo.format(canal=info), ephemeral=True)

    @feedback.command(name="enviar", description="Conte o que você achou do servidor e ganhe um código de Caudas.")
    async def enviar(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_modal(FeedbackModal(self))

    # ------------------------------------------------------------------ envio
    async def receber(self, interaction: discord.Interaction, nota_bruta: str, texto: str, melhorar: str) -> None:
        guild, membro = interaction.guild, interaction.user
        assert guild is not None
        nota = ler_nota(nota_bruta)
        texto, melhorar = texto.strip(), melhorar.strip()
        if nota is None:
            await interaction.response.send_message(textos.FEEDBACK_NOTA_INVALIDA, ephemeral=True)
            return
        if not texto_longo_o_bastante(texto):
            await interaction.response.send_message(textos.FEEDBACK_CURTO.format(min=CARACTERES_MIN_FEEDBACK), ephemeral=True)
            return
        agora = time.monotonic()
        resta = ESPERA_ENTRE_ENVIOS - (agora - self._ultimo_envio.get(membro.id, -1e9))
        if resta > 0:
            await interaction.response.send_message(textos.FEEDBACK_ESPERA.format(seg=int(resta) + 1), ephemeral=True)
            return
        self._ultimo_envio[membro.id] = agora
        banco = self.bot.banco
        ultimo = await banco.feedback_ultimo(guild.id, membro.id)
        liberado = int(time.time()) if ultimo is None else int(ultimo["criado_em"]) + 30 * DIA
        if ultimo is not None and liberado > time.time():
            await interaction.response.send_message(textos.FEEDBACK_RECENTE.format(quando=f"<t:{liberado}:R>"), ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        try:
            com_codigo = not await banco.feedback_ja_ganhou_codigo(guild.id, membro.id)
            fid, codigo = await banco.feedback_registrar(guild.id, membro.id, nota, texto, melhorar, com_codigo=com_codigo)
        except Exception:
            log.exception("Falha ao gravar feedback")
            await interaction.followup.send(textos.FEEDBACK_ERRO, ephemeral=True)
            return
        await self._avisar_staff(guild, membro, fid, nota, texto, melhorar, bool(codigo))
        if codigo:
            validade = f"<t:{int(time.time()) + VALIDADE_FEEDBACK_DIAS * DIA}:d>"
            resposta = textos.FEEDBACK_OBRIGADA.format(
                link=textos.FEEDBACK_DISBOARD, moeda=config.MOEDA_NOME, validade=validade, codigo=codigo
            )
        else:
            resposta = textos.FEEDBACK_SEM_CODIGO
        await interaction.followup.send(resposta, ephemeral=True)

    async def _avisar_staff(self, guild: discord.Guild, membro: discord.abc.User, fid: int, nota: int, texto: str, melhorar: str, premiado: bool) -> None:
        e = embed(textos.FEEDBACK_LOG_TITULO, texto[:1000], config.COR_INFO)
        e.set_author(name=getattr(membro, "display_name", membro.name), icon_url=membro.display_avatar.url)
        e.add_field(name="Nota", value="⭐" * nota + f" ({nota}/5)", inline=True)
        e.add_field(name="Autor", value=f"{membro.mention} (`{membro.id}`)", inline=True)
        if melhorar:
            e.add_field(name=textos.FEEDBACK_LOG_MELHORAR, value=melhorar[:500], inline=False)
        e.set_footer(text=f"#{fid} · " + ("código de recompensa gerado" if premiado else "sem código (já ganhou antes)"))
        if not await enviar_log(self.bot, guild, "sugestoes", embed=e):
            await enviar_log(self.bot, guild, "logs_gerais", embed=e)

    # ------------------------------------------------------------------ resgate (Discord)
    async def resgatar_para(self, guild: discord.Guild, user_id: int, codigo: str) -> ResultadoCodigo:
        """Resgate completo: confere a conta de Minecraft ligada, resgata e avisa a staff. Usado pelo Discord."""
        banco = self.bot.banco
        vinculo = await banco.mc_vinculo_de_usuario(guild.id, user_id)
        nome = vinculo["mc_nome"] if vinculo else ""
        r = await banco.resgatar_codigo(guild.id, user_id, nome, codigo)
        if r.ok:
            await self.avisar_resgate(guild, user_id, normalizar_codigo(codigo), r.caudas, nome)
        return r

    async def avisar_resgate(self, guild: discord.Guild, user_id: int, codigo: str, caudas: int, nome: str) -> None:
        try:
            await enviar_log(
                self.bot, guild, "logs_gerais",
                embed=embed(None, textos.CODIGO_LOG.format(mencao=f"<@{user_id}>", codigo=codigo, caudas=caudas, nome=nome), config.COR_INFO),
            )
        except Exception:
            log.warning("Falha ao avisar o resgate de código", exc_info=True)

    @app_commands.command(name="resgatar", description="Troque um código por Caudas (precisa da conta do Minecraft ligada).")
    @app_commands.guild_only()
    @app_commands.describe(codigo="O código, por exemplo VULPUS-ABCD-EFGH")
    async def resgatar(self, interaction: discord.Interaction, codigo: str) -> None:
        guild = interaction.guild
        assert guild is not None
        try:
            r = await self.resgatar_para(guild, interaction.user.id, codigo)
        except Exception:
            log.exception("Falha ao resgatar código")
            await interaction.response.send_message(textos.CODIGO_RESGATAR_ERRO, ephemeral=True)
            return
        cor = config.COR_OK if r.ok else config.COR_ERRO
        extra = f"\nSaldo agora: {formatar_moeda(r.saldo)}. No jogo, aparece em instantes." if r.ok else ""
        await interaction.response.send_message(embed=embed(None, mensagem_do_resultado(r) + extra, cor), ephemeral=True)

    # ------------------------------------------------------------------ códigos (staff)
    @codigo.command(name="criar", description="Cria um código de resgate de Caudas.")
    @app_commands.describe(
        caudas="Quantas Caudas o código dá", codigo="O código (vazio = eu gero um)", usos_max="Quantas pessoas podem usar (0 = ilimitado)",
        dias_validade="Dias até expirar (0 = nunca)", motivo="Para que serve (só a staff vê)",
    )
    @exigir_nivel(config.NIVEL_ADMIN)
    async def criar(
        self, interaction: discord.Interaction, caudas: app_commands.Range[int, 1, 1_000_000], codigo: Optional[str] = None,
        usos_max: app_commands.Range[int, 0, 100_000] = 1, dias_validade: app_commands.Range[int, 0, 3650] = 0, motivo: str = "",
    ) -> None:
        guild = interaction.guild
        assert guild is not None
        pedido = normalizar_codigo(codigo) if codigo and codigo.strip() else None
        if pedido is not None and not codigo_valido(pedido):
            await interaction.response.send_message(textos.CODIGO_INVALIDO, ephemeral=True)
            return
        criado = await self.bot.banco.codigo_criar(
            guild.id, caudas, codigo=pedido, usos_max=usos_max, dias_validade=dias_validade, criado_por=interaction.user.id, motivo=motivo
        )
        if criado is None:
            await interaction.response.send_message(textos.CODIGO_JA_EXISTE, ephemeral=True)
            return
        usos = textos.CODIGO_USOS_ILIMITADOS if usos_max == 0 else textos.CODIGO_USOS_N.format(n=usos_max)
        validade = textos.CODIGO_VALE_ATE.format(quando=f"<t:{int(time.time()) + dias_validade * DIA}:d>") if dias_validade else textos.CODIGO_SEM_VALIDADE
        await interaction.response.send_message(textos.CODIGO_CRIADO.format(codigo=criado, caudas=caudas, usos=usos, validade=validade), ephemeral=True)

    async def mostrar_pagina(self, interaction: discord.Interaction, pagina: int, editar: bool = False) -> None:
        guild = interaction.guild
        assert guild is not None
        total = await self.bot.banco.codigo_contar(guild.id)
        paginas = max(1, -(-total // POR_PAGINA))
        pagina = min(max(0, pagina), paginas - 1)
        linhas = await self.bot.banco.codigo_listar(guild.id, POR_PAGINA, pagina * POR_PAGINA)
        agora = int(time.time())
        descricao = "\n".join(linha_da_lista(c, agora) for c in linhas) or textos.CODIGO_LISTA_VAZIA
        e = embed(textos.CODIGO_LISTA_TITULO.format(total=total), descricao, config.COR_INFO)
        e.set_footer(text=f"Página {pagina + 1}/{paginas} · 🟢 ativo ⛔ desativado ⌛ expirou ✅ esgotado")
        view = PaginaCodigosView(self, interaction.user.id, guild.id, pagina, total)
        if editar:
            await interaction.response.edit_message(embed=e, view=view)
        else:
            await interaction.response.send_message(embed=e, view=view, ephemeral=True, allowed_mentions=discord.AllowedMentions.none())

    @codigo.command(name="listar", description="Lista os códigos (os ativos primeiro).")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def listar(self, interaction: discord.Interaction) -> None:
        await self.mostrar_pagina(interaction, 0)

    @codigo.command(name="desativar", description="Desativa um código.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def desativar(self, interaction: discord.Interaction, codigo: str) -> None:
        guild = interaction.guild
        assert guild is not None
        ok = await self.bot.banco.codigo_desativar(guild.id, codigo)
        texto = textos.CODIGO_DESATIVADO.format(codigo=normalizar_codigo(codigo)) if ok else textos.CODIGO_NAO_ACHEI
        await interaction.response.send_message(texto, ephemeral=True)

    @codigo.command(name="usos", description="Quem usou um código.")
    @exigir_nivel(config.NIVEL_ADMIN)
    async def usos(self, interaction: discord.Interaction, codigo: str) -> None:
        guild = interaction.guild
        assert guild is not None
        linha = await self.bot.banco.codigo_obter(codigo)
        if linha is None or int(linha["guild_id"]) != guild.id:
            await interaction.response.send_message(textos.CODIGO_NAO_ACHEI, ephemeral=True)
            return
        usos = await self.bot.banco.codigo_usos(linha["codigo"])
        corpo = "\n".join(
            f"<@{u['user_id']}> · {discord.utils.escape_markdown(u['mc_nome'])} · <t:{u['quando']}:f>" for u in usos[:40]
        ) or textos.CODIGO_USOS_VAZIO
        e = embed(textos.CODIGO_USOS_TITULO.format(codigo=linha["codigo"]), linha_da_lista(linha, int(time.time())) + "\n\n" + corpo, config.COR_INFO)
        await interaction.response.send_message(embed=e, ephemeral=True, allowed_mentions=discord.AllowedMentions.none())


async def setup(bot: "Kiza") -> None:
    await bot.add_cog(Feedback(bot))
