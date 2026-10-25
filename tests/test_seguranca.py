"""Segurança: detector de raid, contas novas, anti-nuke, regras nativas, auditoria e links de golpe (tudo com fakes)."""
import asyncio
import datetime
import re
import time
import types

import discord
import pytest

import config
import textos
from cogs import automod, seguranca
from utils import seguranca as seg

G = 1


# ------------------------------------------------------------------ relógio e banco falsos
class Relogio:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


class Banco:
    def __init__(self, **ajustes):
        self.ajustes = ajustes
        self.cfg_ = {}
        self.niveis = {}

    async def ajuste(self, _g, chave):
        return self.ajustes.get(chave, config.AJUSTES[chave][0])

    async def todos_ajustes(self, _g):
        return {k: await self.ajuste(_g, k) for k in config.AJUSTES}

    async def get_config(self, _g, chave, padrao=None):
        return self.cfg_.get(chave, padrao)

    async def get_config_int(self, _g, chave):
        v = self.cfg_.get(chave)
        return int(v) if v and v.lstrip("-").isdigit() else None

    async def set_config(self, _g, chave, valor):
        if valor is None:
            self.cfg_.pop(chave, None)
        else:
            self.cfg_[chave] = valor

    async def mapa_niveis(self, _g):
        return self.niveis

    async def cargos_por_nivel(self, _g):
        por = {0: [], 1: [], 2: [], 3: []}
        for rid, n in self.niveis.items():
            por[n].append(rid)
        return por


# ------------------------------------------------------------------ detector de raid
def _entrar(det, rel, quem, idade=10 * 86400, **kw):
    params = dict(n=6, janela=20, m=4, muito_nova_s=86400)
    params.update(kw)
    return det.registrar(G, quem, idade, **params)


def test_detector_dispara_com_n_contas_na_janela():
    rel = Relogio()
    det = seg.DetectorRaid(rel)
    for i in range(5):
        assert _entrar(det, rel, i) is None
        rel.t += 2
    disparo = _entrar(det, rel, 5)
    assert disparo is not None and disparo.motivo == "velocidade" and disparo.ids == [0, 1, 2, 3, 4, 5]
    assert _entrar(det, rel, 6) is None  # zera depois de disparar


def test_detector_nao_dispara_com_entradas_lentas():
    rel = Relogio()
    det = seg.DetectorRaid(rel)
    for i in range(30):  # uma conta a cada 5 s: 4 por janela de 20 s
        assert _entrar(det, rel, i) is None
        rel.t += 5


def test_detector_contas_muito_novas_em_60s():
    rel = Relogio()
    det = seg.DetectorRaid(rel)
    for i in range(3):
        assert _entrar(det, rel, i, idade=3600) is None
        rel.t += 15  # espaçadas demais para a regra de velocidade
    disparo = _entrar(det, rel, 3, idade=3600)
    assert disparo is not None and disparo.motivo == "contas_novas" and len(disparo.ids) == 4


def test_detector_contas_antigas_espacadas_nao_contam_como_novas():
    rel = Relogio()
    det = seg.DetectorRaid(rel)
    for i in range(10):
        assert _entrar(det, rel, i, idade=90 * 86400) is None
        rel.t += 15


def test_detector_separa_servidores():
    rel = Relogio()
    det = seg.DetectorRaid(rel)
    for i in range(5):
        det.registrar(1, i, 1e6, n=6, janela=20, m=4, muito_nova_s=86400)
    assert det.registrar(2, 99, 1e6, n=6, janela=20, m=4, muito_nova_s=86400) is None


# ------------------------------------------------------------------ idade e soft-limit
def test_idade_e_conta_nova():
    assert seg.idade_conta_s(100, 50) == 0
    assert seg.conta_nova(0, 2 * 86400, 3) and not seg.conta_nova(0, 3 * 86400, 3)


def test_soft_limit_so_para_conta_nova_na_janela():
    agora = 10 * 86400
    nova = agora - 86400  # 1 dia
    velha = agora - 400 * 86400
    assert seg.soft_limit_aplica(agora - 60, nova, agora, 10, 3)  # entrou há 1 min, conta nova
    assert not seg.soft_limit_aplica(agora - 11 * 60, nova, agora, 10, 3)  # janela passou
    assert not seg.soft_limit_aplica(agora - 60, velha, agora, 10, 3)  # conta antiga entrando agora passa
    assert not seg.soft_limit_aplica(agora - 86400 * 30, velha, agora, 10, 3)  # veterano


def _msg_soft(conteudo, entrou_ha_s=60, conta_dias=1, cargos=()):
    agora = discord.utils.utcnow()
    autor = types.SimpleNamespace(
        id=5,
        mention="<@5>",
        joined_at=agora - datetime.timedelta(seconds=entrou_ha_s),
        created_at=agora - datetime.timedelta(days=conta_dias),
        roles=[types.SimpleNamespace(id=i) for i in cargos],
    )
    apagadas, avisos = [], []

    async def apagar():
        apagadas.append(1)

    async def enviar(texto, **kw):
        avisos.append((texto, kw))

    msg = types.SimpleNamespace(
        guild=types.SimpleNamespace(id=G),
        author=autor,
        content=conteudo,
        mentions=[],
        role_mentions=[],
        delete=apagar,
        channel=types.SimpleNamespace(send=enviar),
    )
    return msg, apagadas, avisos


def _automod(banco):
    return automod.Automod(types.SimpleNamespace(banco=banco))  # type: ignore[arg-type]


def test_soft_limit_apaga_link_de_conta_nova_em_silencio(monkeypatch):
    monkeypatch.setattr(discord, "AllowedMentions", lambda **kw: None)
    banco = Banco()
    msg, apagadas, avisos = _msg_soft("olha https://exemplo.com")
    assert asyncio.run(_automod(banco)._soft_limit(msg)) is True
    assert apagadas == [1] and avisos[0][1]["delete_after"] == 8
    assert "contas novas" in avisos[0][0]


def test_soft_limit_deixa_passar_conta_antiga_e_conversa_normal():
    banco = Banco()
    msg, apagadas, _ = _msg_soft("olha https://exemplo.com", conta_dias=400)
    assert asyncio.run(_automod(banco)._soft_limit(msg)) is False and not apagadas
    msg, apagadas, _ = _msg_soft("oi gente, tudo bem?")
    assert asyncio.run(_automod(banco)._soft_limit(msg)) is False and not apagadas
    msg, apagadas, _ = _msg_soft("link https://x.com", entrou_ha_s=3600)
    assert asyncio.run(_automod(banco)._soft_limit(msg)) is False


def test_soft_limit_tres_mencoes_e_convite_contam_duas_nao():
    banco = Banco()
    m3 = " ".join(f"<@{1000000000000000 + i}>" for i in range(3))
    m2 = " ".join(f"<@{1000000000000000 + i}>" for i in range(2))
    assert asyncio.run(_automod(banco)._soft_limit(_msg_soft(m2)[0])) is False
    assert asyncio.run(_automod(banco)._soft_limit(_msg_soft(m3)[0])) is True
    assert asyncio.run(_automod(banco)._soft_limit(_msg_soft("entra aí discord . gg / abc123")[0])) is True


def test_soft_limit_respeita_desligado_e_cargo_isento():
    assert asyncio.run(_automod(Banco(seguranca_novo_ligado=0))._soft_limit(_msg_soft("https://x.com")[0])) is False
    banco = Banco()
    banco.cfg_["seguranca_cargos_isentos"] = "77,88"
    assert asyncio.run(_automod(banco)._soft_limit(_msg_soft("https://x.com", cargos=[88])[0])) is False


# ------------------------------------------------------------------ anti-nuke
def test_contador_nuke_limiares_e_janela():
    rel = Relogio()
    c = seg.ContadorNuke(rel)
    assert c.registrar(G, 9, "apagar", "a", 3) is None
    rel.t += 10
    assert c.registrar(G, 9, "apagar", "b", 3) is None
    rel.t += 10
    achou = c.registrar(G, 9, "apagar", "c", 3)
    assert achou == ["a", "b", "c"]
    assert c.registrar(G, 9, "apagar", "d", 3) is None  # zerou


def test_contador_nuke_fora_da_janela_e_por_usuario():
    rel = Relogio()
    c = seg.ContadorNuke(rel)
    for i in range(4):
        assert c.registrar(G, 9, "apagar", str(i), 3) is None
        rel.t += 31  # cada uma fora da janela de 30 s da anterior
    c2 = seg.ContadorNuke(rel)
    c2.registrar(G, 1, "banir", "x", 5)
    assert c2.registrar(G, 2, "banir", "y", 5) is None  # usuários diferentes não somam


def test_categorias_de_acao():
    assert seg.categoria_nuke("channel_delete") == seg.categoria_nuke("role_delete") == "apagar"
    assert seg.categoria_nuke("ban") == seg.categoria_nuke("kick") == "banir"
    assert seg.categoria_nuke("webhook_create") == "webhook"
    assert seg.categoria_nuke("message_delete") is None


def _entry(uid, acao="channel_delete", guild=None):
    return types.SimpleNamespace(
        guild=guild or types.SimpleNamespace(id=G, owner_id=100),
        user_id=uid,
        action=types.SimpleNamespace(name=acao),
        target=types.SimpleNamespace(id=1),
        created_at=discord.utils.utcnow(),
    )


def _cog_seg(banco):
    bot = types.SimpleNamespace(banco=banco, user=types.SimpleNamespace(id=42))
    return seguranca.Seguranca(bot)  # type: ignore[arg-type]


def test_nuke_alerta_depois_de_tres_ignorando_dono_e_bot(monkeypatch):
    alertas = []

    async def falso(bot, guild, e, view=None, marcar_staff=True):
        alertas.append(e)
        return True

    monkeypatch.setattr(seg, "enviar_alerta", falso)
    cog = _cog_seg(Banco())

    async def rodar():
        for uid in (100, 42):  # dono e o próprio bot: nunca
            for _ in range(5):
                await cog._nuke(_entry(uid))
        assert not alertas
        for _ in range(2):
            await cog._nuke(_entry(7))
        assert not alertas
        await cog._nuke(_entry(7))

    asyncio.run(rodar())
    assert len(alertas) == 1 and "<@7>" in alertas[0].description


def test_nuke_desligado_nao_alerta(monkeypatch):
    alertas = []

    async def falso(*a, **k):
        alertas.append(1)

    monkeypatch.setattr(seg, "enviar_alerta", falso)
    cog = _cog_seg(Banco(seguranca_nuke=0))

    async def rodar():
        for _ in range(5):
            await cog._nuke(_entry(7))

    asyncio.run(rodar())
    assert not alertas


def test_remover_perms_padrao_desligado_e_so_dono():
    assert config.AJUSTES["seguranca_nuke_remover_perms"][0] == 0
    assert "seguranca_nuke_remover_perms" in config.AJUSTES_SO_DONO


def test_cargos_perigosos_ignora_padrao_e_gerenciados():
    def role(nome, default=False, managed=False, **perms):
        return types.SimpleNamespace(
            name=nome, is_default=lambda: default, managed=managed, permissions=discord.Permissions(**perms)
        )

    roles = [role("@everyone", default=True, administrator=True), role("bot", managed=True, administrator=True),
             role("mod", ban_members=True), role("pessoa", send_messages=True)]
    assert [r.name for r in seg.cargos_perigosos(roles)] == ["mod"]


# ------------------------------------------------------------------ modo raid suave no cog
class Membro:
    def __init__(self, uid, dias, nivel=0):
        agora = discord.utils.utcnow()
        self.id = uid
        self.bot = False
        self.mention = f"<@{uid}>"
        self.created_at = agora - datetime.timedelta(days=dias)
        self.guild = types.SimpleNamespace(id=G, owner_id=100)
        self.guild_permissions = types.SimpleNamespace(administrator=False)
        self.roles = [types.SimpleNamespace(id=900)] if nivel else []
        self.timeouts = []

    async def timeout(self, delta, reason=None):
        self.timeouts.append(delta)


def test_modo_suave_timeout_so_em_conta_nova_e_membro_antigo_entra_sem_atrito():
    banco = Banco()
    cog = _cog_seg(banco)

    async def rodar():
        await cog.ligar_suave(Membro(1, 1).guild)
        nova, velha = Membro(1, 1), Membro(2, 400)
        await cog._entrada(nova)
        await cog._entrada(velha)
        return nova, velha

    nova, velha = asyncio.run(rodar())
    assert len(nova.timeouts) == 1 and nova.timeouts[0].total_seconds() == 600
    assert velha.timeouts == []
    assert banco.cfg_["raid_suave_contas"] == "1"


def test_modo_manual_manda_e_suave_nao_age():
    banco = Banco()
    banco.cfg_["raid_ativo"] = "1"
    cog = _cog_seg(banco)

    async def rodar():
        await cog.ligar_suave(Membro(1, 1).guild)
        m = Membro(1, 1)
        for i in range(10):
            await cog._entrada(Membro(10 + i, 1))
        await cog._entrada(m)
        return m

    m = asyncio.run(rodar())
    assert m.timeouts == [] and "raid_suave_contas" not in banco.cfg_


def test_disparo_liga_modo_suave_e_alerta(monkeypatch):
    alertas = []

    async def falso(bot, guild, e, view=None, marcar_staff=True):
        alertas.append((e, view))
        return True

    monkeypatch.setattr(seg, "enviar_alerta", falso)
    banco = Banco(seguranca_raid_n=3)
    cog = _cog_seg(banco)
    membros = {i: Membro(i, 0.1) for i in (1, 2, 3)}

    async def rodar():
        guild = types.SimpleNamespace(id=G, owner_id=100, get_member=membros.get, get_role=lambda i: None, me=None)
        for m in membros.values():
            m.guild = guild
            await cog._entrada(m)
        return guild

    asyncio.run(rodar())
    assert len(alertas) == 1 and alertas[0][1] is not None
    assert int(banco.cfg_["raid_suave_ate"]) > time.time()
    assert banco.cfg_["raid_suave_contas"] == "1,2,3"
    assert all(len(m.timeouts) == 1 for m in membros.values())


def test_detector_desligado_nao_dispara():
    banco = Banco(seguranca_raid_auto=0, seguranca_raid_n=2)
    cog = _cog_seg(banco)

    async def rodar():
        for i in range(5):
            await cog._entrada(Membro(i, 0.1))

    asyncio.run(rodar())
    assert "raid_suave_ate" not in banco.cfg_


# ------------------------------------------------------------------ regex nativa e regras
def test_regex_nativa_compativel_com_rust():
    assert len(seg.REGEX_MENCOES) <= 260
    assert seg.regex_compativel(seg.REGEX_MENCOES)
    assert not seg.regex_compativel(r"(?=abc)abc")
    assert not seg.regex_compativel("a" * 261)
    rx = re.compile(seg.REGEX_MENCOES)
    oito = " ".join(f"<@{1000000000000000 + i}>" for i in range(8))
    sete = " ".join(f"<@{1000000000000000 + i}>" for i in range(7))
    assert rx.search(oito) and not rx.search(sete)
    assert rx.search("<@!123456789012345678><@&123456789012345678>" * 4)
    assert not rx.search("oi <@123456789012345678> tudo bem")


def test_montar_regras_nomes_tipos_e_acoes():
    regras = seg.montar_regras(555)
    assert all(r.nome.startswith("Kiza: ") for r in regras)
    por = {r.tipo: r for r in regras}
    assert por["mention_spam"].trigger.mention_limit == 8
    assert por["keyword"].trigger.regex_patterns == [seg.REGEX_MENCOES]
    tipos = lambda r: [a.type for a in r.actions]  # noqa: E731
    T = discord.AutoModRuleActionType
    assert tipos(por["mention_spam"]) == [T.block_message, T.send_alert_message, T.timeout]
    assert por["mention_spam"].actions[2].duration.total_seconds() == 600
    assert T.timeout not in tipos(por["spam"])  # spam genérico só bloqueia e avisa
    assert T.send_alert_message not in tipos(seg.montar_regras(None)[0])


class RegraFalsa:
    def __init__(self, nome, tipo):
        self.name, self.trigger, self.enabled = nome, types.SimpleNamespace(type=types.SimpleNamespace(name=tipo)), True
        self.edicoes = 0

    async def edit(self, **kw):
        self.edicoes += 1


class GuildRegras:
    def __init__(self, manage_guild=True, regras=()):
        self.id = G
        self.regras = list(regras)
        self.me = types.SimpleNamespace(guild_permissions=types.SimpleNamespace(manage_guild=manage_guild))
        self.self_role = types.SimpleNamespace(id=50)
        self.criadas = []

    def get_channel(self, i):
        return object()

    def get_role(self, i):
        return object()

    async def fetch_automod_rules(self):
        return list(self.regras)

    async def create_automod_rule(self, *, name, trigger, **kw):
        r = RegraFalsa(name, trigger.type.name)
        self.regras.append(r)
        self.criadas.append(name)
        assert 50 in [i.id for i in kw["exempt_roles"]]
        return r


def test_aplicar_regras_cria_e_depois_atualiza_idempotente():
    banco = Banco()
    banco.niveis = {2: 2}
    banco.cfg_["canal_logs_mod"] = "777"
    bot = types.SimpleNamespace(banco=banco)
    guild = GuildRegras()
    primeira = asyncio.run(seg.aplicar_regras(bot, guild))
    assert len(guild.criadas) == 3 and all("Criada" in linha for linha in primeira)
    segunda = asyncio.run(seg.aplicar_regras(bot, guild))
    assert len(guild.criadas) == 3 and all("Atualizada" in linha for linha in segunda)
    assert all(r.edicoes == 1 for r in guild.regras)


def test_aplicar_regras_sem_permissao_diz_qual():
    bot = types.SimpleNamespace(banco=Banco())
    linhas = asyncio.run(seg.aplicar_regras(bot, GuildRegras(manage_guild=False)))
    assert linhas == [textos.SEG_REGRAS_SEM_PERM] and "Gerenciar Servidor" in linhas[0]


def test_aplicar_regras_respeita_regra_alheia_do_mesmo_tipo():
    banco = Banco()
    bot = types.SimpleNamespace(banco=banco)
    guild = GuildRegras(regras=[RegraFalsa("Outra de menções", "mention_spam")])
    linhas = asyncio.run(seg.aplicar_regras(bot, guild))
    assert any("Outra de menções" in linha for linha in linhas)
    assert "Kiza: spam de menções" not in guild.criadas


# ------------------------------------------------------------------ auditoria
def _role(rid, nome, pos=1, default=False, managed=False, **perms):
    return types.SimpleNamespace(
        id=rid, name=nome, position=pos, managed=managed, is_default=lambda: default, permissions=discord.Permissions(**perms)
    )


def _canal(cid, nome, news=False, ver=False, enviar=False):
    return types.SimpleNamespace(
        id=cid, name=nome, is_news=lambda: news,
        permissions_for=lambda r: types.SimpleNamespace(view_channel=ver, send_messages=enviar),
    )


def _guild_aud(everyone, roles=(), canais=(), mfa=0, top=10):
    padrao = _role(G, "@everyone", pos=0, default=True, **everyone)
    todos = [padrao, *roles]
    mapa = {r.id: r for r in todos}
    return types.SimpleNamespace(
        default_role=padrao, roles=todos, channels=list(canais), mfa_level=types.SimpleNamespace(value=mfa),
        me=types.SimpleNamespace(top_role=types.SimpleNamespace(position=top)),
        get_role=mapa.get, get_channel={c.id: c for c in canais}.get,
    )


def test_auditoria_acha_riscos_do_everyone():
    g = _guild_aud(dict(mention_everyone=True, use_external_apps=True, create_instant_invite=True, manage_webhooks=True))
    codigos = [r.codigo for r in seg.auditar(g, niveis={}, canais_log_ids=[], ids_gerenciar=[])]
    assert {"mention_everyone", "use_external_apps", "create_instant_invite", "manage_webhooks"} <= set(codigos)
    assert codigos.index("create_instant_invite") > codigos.index("mention_everyone")  # alta antes de baixa


def test_auditoria_cargos_amplos_so_fora_da_equipe():
    mod = _role(2, "Mod", ban_members=True)
    loja = _role(3, "Vip", manage_messages=True, kick_members=True)
    bot = _role(4, "bot", managed=True, administrator=True)
    g = _guild_aud({}, roles=[mod, loja, bot])
    cods = [r.codigo for r in seg.auditar(g, niveis={2: 2}, canais_log_ids=[], ids_gerenciar=[])]
    assert "cargo_3" in cods and "cargo_2" not in cods and "cargo_4" not in cods


def test_auditoria_canal_de_log_visivel_hierarquia_anuncio_e_2fa():
    log_ch = _canal(10, "logs", ver=True)
    aviso = _canal(11, "avisos", news=True, enviar=True)
    alto = _role(5, "Membro", pos=20)
    mod = _role(6, "Mod", pos=3, kick_members=True)
    g = _guild_aud({}, roles=[alto, mod], canais=[log_ch, aviso], mfa=0, top=10)
    cods = [r.codigo for r in seg.auditar(g, niveis={6: 2}, canais_log_ids=[10], ids_gerenciar=[5])]
    assert {"log_10", "anuncios", "hierarquia", "mfa"} <= set(cods)


def test_auditoria_limpa_e_embed():
    g = _guild_aud({}, mfa=1)
    riscos = seg.auditar(g, niveis={}, canais_log_ids=[], ids_gerenciar=[])
    assert riscos == []
    assert seg.embed_auditoria(riscos).description == textos.SEG_AUDITORIA_LIMPA
    g2 = _guild_aud(dict(mention_everyone=True))
    e = seg.embed_auditoria(seg.auditar(g2, niveis={}, canais_log_ids=[], ids_gerenciar=[]))
    assert e.fields and "Só leio" not in (e.description or "") and "não mudei nada" in e.description


def test_correcoes_seguras_tiram_so_o_combinado():
    editado = {}

    async def editar(permissions, reason):
        editado["p"] = permissions

    padrao = _role(G, "@everyone", default=True, mention_everyone=True, use_external_apps=True, send_messages=True)
    padrao.edit = editar
    g = types.SimpleNamespace(default_role=padrao)
    linhas = asyncio.run(seg.aplicar_correcoes_seguras(g, "teste"))
    assert "mention_everyone" in linhas[0]
    p = editado["p"]
    assert not p.mention_everyone and not p.use_external_apps and p.send_messages
    padrao2 = _role(G, "@everyone", default=True, send_messages=True)
    assert asyncio.run(seg.aplicar_correcoes_seguras(types.SimpleNamespace(default_role=padrao2), "t")) == [textos.SEG_CORRECAO_NADA]


# ------------------------------------------------------------------ links
@pytest.mark.parametrize("texto", [
    "https://discord.gg/abc123",
    "entra: discord.com/invite/abc",
    "discordapp.com/invite/xyz",
    "dsc.gg/meuservidor",
    "discord . gg / abc123",
    "discord(dot)gg/abc123",
    "discord[.]gg/abc123",
    "ｄｉｓｃｏｒｄ.ｇｇ/abc",  # letras largas
    "dis​cord.gg/abc",  # zero-width
    "https://www.discordapp.com/invite/xyz",
])
def test_convites_em_varias_formas(texto):
    assert seg.tem_convite(texto)


@pytest.mark.parametrize("texto", [
    "vamos jogar no discord hoje?",
    "https://discord.com/channels/1/2/3",
    "o gg foi bom, valeu",
    "https://youtube.com/watch?v=abc",
    "discord. Gg wp",
])
def test_conversa_normal_nao_e_convite(texto):
    assert not seg.tem_convite(texto)


@pytest.mark.parametrize("texto", [
    "ganhe nitro https://discord-nitro.gift-free.com/x",
    "https://discordgift.xyz/claim",
    "https://dlscord-nitro.com",
    "free steam gift http://steam-gift.ru/abc",
    "https://steamcommunlty-gift.com/trade",
    "https://discord.com@discord-nitro.xyz/x",
    "discord-nitro.com",
])
def test_links_de_golpe(texto):
    assert seg.eh_link_golpe(texto)


@pytest.mark.parametrize("texto", [
    "https://discord.com/channels/1/2/3",
    "https://discord.com/nitro",
    "https://discord.gift/abc",
    "https://discordapp.com/invite/abc",
    "https://store.steampowered.com/app/10",
    "https://steamcommunity.com/id/fulano",
    "https://www.youtube.com/watch?v=xyz",
    "https://youtu.be/xyz",
    "tem nitro de graça? nem sei, discord é bom",
    "https://exemplo.com.br/noticia",
])
def test_links_normais_nao_sao_golpe(texto):
    assert not seg.eh_link_golpe(texto)


def test_detectar_golpe_e_convite_variado():
    cog = _automod(Banco())
    base = dict(guild=types.SimpleNamespace(id=G), author=types.SimpleNamespace(id=2), mentions=[], role_mentions=[], mention_everyone=False)
    golpe = types.SimpleNamespace(content="nitro grátis https://discord-nitro.xyz", **base)
    assert asyncio.run(cog._detectar(golpe)) == "golpe"
    conv = types.SimpleNamespace(content="venha discord . gg / abc123", **base)
    assert asyncio.run(cog._detectar(conv)) == "convite"
    ok = types.SimpleNamespace(content="https://youtube.com/watch?v=1", **base)
    assert asyncio.run(cog._detectar(ok)) is None
    off = _automod(Banco(seguranca_golpe=0))
    assert asyncio.run(off._detectar(golpe)) is None


def test_golpe_tem_texto_e_conta_mencoes_inalterada():
    assert "golpe" in textos.AUTOMOD_MOTIVOS
    assert automod.contar_mencoes(" ".join(f"<@{1000000000000000 + i}>" for i in range(50))) == 50


# ------------------------------------------------------------------ ajustes e painel
def test_ajustes_de_seguranca_validos_e_cabem_no_menu():
    chaves = config.AJUSTES_SEG_NO_SETUP
    assert 10 <= len(chaves) <= 25
    for chave in chaves:
        padrao, minimo, maximo, desc = config.AJUSTES[chave]
        assert minimo <= padrao <= maximo and desc
    assert config.AJUSTES["seguranca_raid_n"][0] == 6 and config.AJUSTES["seguranca_raid_janela"][0] == 20
    assert config.AJUSTES["seguranca_raid_novas_m"][0] == 4 and config.AJUSTES["seguranca_raid_duracao_min"][0] == 15
    assert config.AJUSTES["seguranca_raid_timeout_min"][0] == 10 and config.AJUSTES["seguranca_raid_conta_dias"][0] == 7
    assert config.AJUSTES["seguranca_novo_minutos"][0] == 10 and config.AJUSTES["seguranca_conta_nova_dias"][0] == 3


def test_secao_seguranca_no_setup_e_cog_registrado():
    from cogs import configuracao

    assert "seguranca" in configuracao.SECOES and configuracao.SECAO_CLASSES["seguranca"] is configuracao.SecaoSeguranca
    assert "seguranca" in config.COGS_PADRAO
