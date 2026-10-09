"""Banco da Kiza: configuração por servidor, níveis, cargos, regras e visibilidade. Mixin de `Banco` (veja database/__init__.py)."""
from __future__ import annotations

from typing import Iterable, Optional

import config


class ConfigMixin:
    # ------------------------------------------------------------------ configuração por servidor
    async def cfg(self, guild_id: int) -> dict[str, str]:
        dados = self._cfg.get(guild_id)
        if dados is None:
            linhas = await self._todos("SELECT chave, valor FROM config_guild WHERE guild_id = ?", (guild_id,))
            dados = {linha["chave"]: linha["valor"] for linha in linhas}
            self._cfg[guild_id] = dados
        return dados

    async def get_config(self, guild_id: int, chave: str, padrao: Optional[str] = None) -> Optional[str]:
        return (await self.cfg(guild_id)).get(chave, padrao)

    async def get_config_int(self, guild_id: int, chave: str) -> Optional[int]:
        bruto = (await self.cfg(guild_id)).get(chave)
        if bruto is not None and bruto.lstrip("-").isdigit():
            return int(bruto)
        return None

    async def set_config(self, guild_id: int, chave: str, valor: Optional[str]) -> None:
        """Grava (ou apaga, se valor for None) uma configuração."""
        if valor is None:
            await self._exec("DELETE FROM config_guild WHERE guild_id = ? AND chave = ?", (guild_id, chave))
        else:
            await self._exec(
                "INSERT INTO config_guild (guild_id, chave, valor) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, chave) DO UPDATE SET valor = excluded.valor",
                (guild_id, chave, valor),
            )
        self._cfg.pop(guild_id, None)

    async def ajuste(self, guild_id: int, chave: str) -> int:
        """Valor de um ajuste numérico (o padrão vem de config.AJUSTES)."""
        padrao = config.AJUSTES[chave][0]
        bruto = (await self.cfg(guild_id)).get(f"ajuste_{chave}")
        if bruto is None:
            return padrao
        try:
            return int(bruto)
        except ValueError:
            return padrao

    async def todos_ajustes(self, guild_id: int) -> dict[str, int]:
        return {chave: await self.ajuste(guild_id, chave) for chave in config.AJUSTES}

    async def definir_ajuste(self, guild_id: int, chave: str, valor: Optional[int]) -> None:
        await self.set_config(guild_id, f"ajuste_{chave}", None if valor is None else str(int(valor)))

    # ------------------------------------------------------------------ níveis de permissão (cargo -> 0..3)
    async def mapa_niveis(self, guild_id: int) -> dict[int, int]:
        mapa = self._niveis.get(guild_id)
        if mapa is None:
            linhas = await self._todos("SELECT role_id, nivel FROM cargos_nivel WHERE guild_id = ?", (guild_id,))
            mapa = {linha["role_id"]: linha["nivel"] for linha in linhas}
            self._niveis[guild_id] = mapa
        return mapa

    async def cargos_por_nivel(self, guild_id: int) -> dict[int, list[int]]:
        resultado: dict[int, list[int]] = {n: [] for n in range(4)}
        for role_id, nivel in (await self.mapa_niveis(guild_id)).items():
            resultado[nivel].append(role_id)
        return resultado

    async def definir_cargos_nivel(self, guild_id: int, nivel: int, role_ids: Iterable[int]) -> None:
        """Substitui os cargos de um nível. Um cargo só pertence a um nível (o último vence)."""
        ids = list(dict.fromkeys(role_ids))
        async with self._tx() as conn:
            if ids:
                marcas = ",".join("?" * len(ids))
                await conn.execute(
                    f"DELETE FROM cargos_nivel WHERE guild_id = ? AND nivel = ? AND role_id NOT IN ({marcas})",
                    (guild_id, nivel, *ids),
                )
                for role_id in ids:
                    await conn.execute(
                        "INSERT INTO cargos_nivel (guild_id, role_id, nivel) VALUES (?, ?, ?) "
                        "ON CONFLICT(guild_id, role_id) DO UPDATE SET nivel = excluded.nivel",
                        (guild_id, role_id, nivel),
                    )
            else:
                await conn.execute("DELETE FROM cargos_nivel WHERE guild_id = ? AND nivel = ?", (guild_id, nivel))
        self._niveis.pop(guild_id, None)

    # ------------------------------------------------------------------ cargos por nível de XP
    async def definir_cargo_xp(self, guild_id: int, nivel_xp: int, role_id: Optional[int]) -> None:
        if role_id is None:
            await self._exec("DELETE FROM cargos_xp WHERE guild_id = ? AND nivel_xp = ?", (guild_id, nivel_xp))
        else:
            await self._exec(
                "INSERT INTO cargos_xp (guild_id, nivel_xp, role_id) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, nivel_xp) DO UPDATE SET role_id = excluded.role_id",
                (guild_id, nivel_xp, role_id),
            )

    async def listar_cargos_xp(self, guild_id: int) -> list[tuple[int, int]]:
        linhas = await self._todos(
            "SELECT nivel_xp, role_id FROM cargos_xp WHERE guild_id = ? ORDER BY nivel_xp", (guild_id,)
        )
        return [(linha["nivel_xp"], linha["role_id"]) for linha in linhas]

    # ------------------------------------------------------------------ painel de cargos (grupos)
    async def definir_grupo_cargos(self, guild_id: int, grupo: str, role_ids: Iterable[int]) -> None:
        """Substitui os cargos de um grupo do painel. Um cargo só pertence a um grupo."""
        ids = list(dict.fromkeys(role_ids))
        async with self._tx() as conn:
            if ids:
                marcas = ",".join("?" * len(ids))
                await conn.execute(
                    f"DELETE FROM painel_cargos WHERE guild_id = ? AND grupo = ? AND role_id NOT IN ({marcas})",
                    (guild_id, grupo, *ids),
                )
                for role_id in ids:
                    await conn.execute(
                        "INSERT INTO painel_cargos (guild_id, grupo, role_id) VALUES (?, ?, ?) "
                        "ON CONFLICT(guild_id, role_id) DO UPDATE SET grupo = excluded.grupo",
                        (guild_id, grupo, role_id),
                    )
            else:
                await conn.execute("DELETE FROM painel_cargos WHERE guild_id = ? AND grupo = ?", (guild_id, grupo))

    async def grupos_cargos(self, guild_id: int) -> dict[str, list[int]]:
        linhas = await self._todos("SELECT grupo, role_id FROM painel_cargos WHERE guild_id = ?", (guild_id,))
        resultado: dict[str, list[int]] = {g: [] for g in config.GRUPOS_CARGOS}
        for linha in linhas:
            resultado.setdefault(linha["grupo"], []).append(linha["role_id"])
        return resultado

    # ------------------------------------------------------------------ regras por canal
    async def regras_canal(self, guild_id: int) -> dict[int, dict[str, str]]:
        dados = self._regras.get(guild_id)
        if dados is None:
            linhas = await self._todos("SELECT canal_id, regra, valor FROM regras_canal WHERE guild_id = ?", (guild_id,))
            dados = {}
            for linha in linhas:
                dados.setdefault(linha["canal_id"], {})[linha["regra"]] = linha["valor"]
            self._regras[guild_id] = dados
        return dados

    async def adicionar_regra_canal(self, guild_id: int, canal_id: int, regra: str, valor: str = "") -> None:
        await self._exec(
            "INSERT INTO regras_canal (guild_id, canal_id, regra, valor) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(guild_id, canal_id, regra) DO UPDATE SET valor = excluded.valor",
            (guild_id, canal_id, regra, valor),
        )
        self._regras.pop(guild_id, None)

    async def remover_regra_canal(self, guild_id: int, canal_id: int, regra: str) -> bool:
        n = await self._exec(
            "DELETE FROM regras_canal WHERE guild_id = ? AND canal_id = ? AND regra = ?", (guild_id, canal_id, regra)
        )
        self._regras.pop(guild_id, None)
        return n == 1

    # ------------------------------------------------------------------ visibilidade (aplicada de verdade no Discord)
    async def definir_visibilidade(self, guild_id: int, canal_id: int, tier: Optional[str]) -> None:
        if tier is None:
            await self._exec("DELETE FROM visibilidade_canal WHERE guild_id = ? AND canal_id = ?", (guild_id, canal_id))
        else:
            await self._exec(
                "INSERT INTO visibilidade_canal (guild_id, canal_id, tier) VALUES (?, ?, ?) "
                "ON CONFLICT(guild_id, canal_id) DO UPDATE SET tier = excluded.tier",
                (guild_id, canal_id, tier),
            )

    async def visibilidades(self, guild_id: int) -> dict[int, str]:
        linhas = await self._todos("SELECT canal_id, tier FROM visibilidade_canal WHERE guild_id = ?", (guild_id,))
        return {linha["canal_id"]: linha["tier"] for linha in linhas}
