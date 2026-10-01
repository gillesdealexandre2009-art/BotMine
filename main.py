"""Kiza — bot do servidor VULPUS.

Uso: python main.py   (variáveis: DISCORD_TOKEN e DATABASE_PATH; veja .env.example)
"""
from __future__ import annotations

import logging
import math
import sys

import discord
from discord import app_commands
from discord.ext import commands

import config
import textos
from database import Banco
from utils.helpers import registrar_erro, responder
from utils.permissoes import NaoConfigurado, NaoEMembro, SemPermissao

log = logging.getLogger("kiza")


class KizaTree(app_commands.CommandTree):
    """Árvore de comandos com tratamento global de erros, na voz da Kiza."""

    async def on_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError) -> None:
        original = getattr(error, "original", error)
        if isinstance(error, SemPermissao):
            texto = textos.SEM_PERMISSAO.format(nivel=config.NOMES_NIVEL[error.nivel])
        elif isinstance(error, NaoEMembro):
            texto = textos.NAO_E_MEMBRO
        elif isinstance(error, NaoConfigurado):
            texto = textos.NAO_CONFIGURADO
        elif isinstance(error, app_commands.CommandOnCooldown):
            texto = textos.COOLDOWN.format(seg=math.ceil(error.retry_after))
        elif isinstance(error, app_commands.NoPrivateMessage):
            texto = textos.SO_SERVIDOR
        elif isinstance(error, app_commands.BotMissingPermissions):
            texto = textos.SEM_PERMISSAO_BOT
        elif isinstance(error, app_commands.CommandNotFound):
            texto = textos.COMANDO_DESATUALIZADO
        elif isinstance(error, app_commands.CheckFailure):
            texto = textos.CHECK_FALHOU
        elif isinstance(original, discord.Forbidden):
            texto = textos.SEM_PERMISSAO_BOT
        else:
            codigo = registrar_erro(original)
            texto = textos.ERRO_GENERICO.format(codigo=codigo)
        await responder(interaction, texto)


class Kiza(commands.Bot):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.members = True  # privilegiada: ative no Developer Portal
        intents.message_content = True  # privilegiada: ative no Developer Portal
        super().__init__(
            command_prefix=commands.when_mentioned,
            intents=intents,
            tree_cls=KizaTree,
            help_command=None,
            # everyone e cargos NUNCA são mencionados por padrão; quem precisa pingar cargo pede explicitamente.
            allowed_mentions=discord.AllowedMentions(everyone=False, roles=False, users=True, replied_user=False),
            activity=discord.Activity(type=discord.ActivityType.watching, name="a toca do VULPUS 🦊"),
        )
        self.banco = Banco(config.DATABASE_PATH)
        self.iniciou_em = discord.utils.utcnow()

    async def setup_hook(self) -> None:
        await self.banco.conectar()
        reembolsos = await self.banco.reembolsar_jogos_pendentes()
        if reembolsos:
            log.info("Devolvi %d aposta(s) de jogos interrompidos por reinício", len(reembolsos))

        for nome in config.COGS:
            try:
                await self.load_extension(f"cogs.{nome}")
                log.info("Cog carregado: %s", nome)
            except Exception:
                log.exception("Falha ao carregar o cog %s", nome)

        if config.ENABLE_MINECRAFT:
            try:
                await self.load_extension("cogs_minecraft")
            except Exception:
                log.exception("ENABLE_MINECRAFT=true, mas cogs_minecraft não pôde ser carregado")

        # Views persistentes: registradas aqui, com custom_id estáveis, para os botões
        # antigos continuarem funcionando depois de um reinício.
        for cog in self.cogs.values():
            fabrica = getattr(cog, "views_persistentes", None)
            if fabrica is not None:
                for view in fabrica():
                    self.add_view(view)

        try:
            if config.DEV_GUILD_ID:
                guild = discord.Object(id=config.DEV_GUILD_ID)
                self.tree.copy_global_to(guild=guild)
                await self.tree.sync(guild=guild)
            else:
                await self.tree.sync()
        except discord.HTTPException:
            log.exception("Não consegui sincronizar os comandos")

    async def on_command_error(self, ctx: commands.Context, erro: commands.CommandError) -> None:
        # Só há comandos de barra; "@Kiza oi" cairia aqui como comando de prefixo inexistente.
        if isinstance(erro, commands.CommandNotFound):
            return
        log.error("Erro em comando de prefixo", exc_info=erro)

    async def on_ready(self) -> None:
        log.info("Kiza online como %s em %d servidor(es)", self.user, len(self.guilds))

    async def close(self) -> None:
        await super().close()
        await self.banco.fechar()


def configurar_logs() -> None:
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL, logging.INFO),
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        stream=sys.stdout,
    )
    logging.getLogger("discord.http").setLevel(logging.WARNING)


def main() -> None:
    configurar_logs()
    if not config.DISCORD_TOKEN:
        log.critical("DISCORD_TOKEN não definido. Copie .env.example para .env e preencha.")
        sys.exit(1)
    Kiza().run(config.DISCORD_TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
