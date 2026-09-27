"""Aplica um arquivo de semente (config, cargos, painel de cargos, visibilidade) direto no banco.

Isso substitui clicar em cada menu do /setup — mas só grava CONFIGURAÇÃO no banco (guild_id,
canal_id, role_id). Não conecta no Discord, não cria nada, não muda permissão nenhuma sozinho:
é só o "estado salvo" que o /setup também produziria. Depois, rode `/setup` → seção **Visibilidade**
→ **Aplicar permissões** dentro do próprio Discord para as permissões valerem de verdade.

Uso:
    python seed_apply.py seed_vulpus.json
    (por padrão usa DATABASE_PATH do .env/ambiente; pode passar um segundo argumento com o caminho do banco)
"""
from __future__ import annotations

import asyncio
import json
import sys

import config
from database import Banco


async def aplicar(caminho_seed: str, caminho_db: str) -> None:
    with open(caminho_seed, encoding="utf-8") as f:
        semente = json.load(f)

    guild_id = int(semente["guild_id"])
    banco = Banco(caminho_db)
    await banco.conectar()
    print(f"Banco: {caminho_db}")
    print(f"Servidor (guild_id): {guild_id}\n")

    for chave, valor in semente.get("canais", {}).items():
        if valor:
            await banco.set_config(guild_id, f"canal_{chave}", str(valor))
            print(f"  canal_{chave} = {valor}")

    for chave, valor in semente.get("cargos_base", {}).items():
        if valor:
            await banco.set_config(guild_id, f"cargo_{chave}", str(valor))
            print(f"  cargo_{chave} = {valor}")

    for nivel, ids in semente.get("niveis", {}).items():
        await banco.definir_cargos_nivel(guild_id, int(nivel), [int(i) for i in ids])
        print(f"  nivel {nivel} = {ids}")

    for grupo, ids in semente.get("painel_cargos", {}).items():
        await banco.definir_grupo_cargos(guild_id, grupo, [int(i) for i in ids])
        print(f"  painel_cargos[{grupo}] = {len(ids)} cargo(s)")

    for nivel_xp, role_id in semente.get("cargos_xp", {}).items():
        await banco.definir_cargo_xp(guild_id, int(nivel_xp), int(role_id) if role_id else None)
    print(f"  cargos_xp: {len(semente.get('cargos_xp', {}))} degrau(s)")

    for canal_id, tier in semente.get("visibilidade", {}).items():
        await banco.definir_visibilidade(guild_id, int(canal_id), tier)
        print(f"  visibilidade[{canal_id}] = {tier}")

    await banco.fechar()
    print("\nPronto! Rode /setup no Discord, abra 'Visibilidade' e clique em 'Aplicar permissões'.")
    print("Confira também /configuracao para ver o que ainda falta (ex.: hierarquia de cargos).")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python seed_apply.py <arquivo.json> [caminho_do_banco]")
        sys.exit(1)
    caminho_banco = sys.argv[2] if len(sys.argv) > 2 else config.DATABASE_PATH
    asyncio.run(aplicar(sys.argv[1], caminho_banco))
