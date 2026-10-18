"""Migrações versionadas do banco. Nunca edite uma migração já publicada: crie a próxima."""

MIGRACOES: list[tuple[int, str]] = [
    (
        1,
        """
CREATE TABLE config_guild (
    guild_id INTEGER NOT NULL,
    chave    TEXT    NOT NULL,
    valor    TEXT    NOT NULL,
    PRIMARY KEY (guild_id, chave)
);

CREATE TABLE cargos_nivel (
    guild_id INTEGER NOT NULL,
    role_id  INTEGER NOT NULL,
    nivel    INTEGER NOT NULL CHECK (nivel BETWEEN 0 AND 3),
    PRIMARY KEY (guild_id, role_id)
);

CREATE TABLE cargos_xp (
    guild_id INTEGER NOT NULL,
    nivel_xp INTEGER NOT NULL,
    role_id  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, nivel_xp)
);

CREATE TABLE painel_cargos (
    guild_id INTEGER NOT NULL,
    grupo    TEXT    NOT NULL,
    role_id  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, role_id)
);

CREATE TABLE regras_canal (
    guild_id INTEGER NOT NULL,
    canal_id INTEGER NOT NULL,
    regra    TEXT    NOT NULL,
    valor    TEXT    NOT NULL DEFAULT '',
    PRIMARY KEY (guild_id, canal_id, regra)
);

CREATE TABLE perfis (
    guild_id       INTEGER NOT NULL,
    user_id        INTEGER NOT NULL,
    xp             INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    saldo          INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    daily_ultimo   TEXT,
    daily_streak   INTEGER NOT NULL DEFAULT 0,
    casado_com     INTEGER,
    casado_desde   INTEGER,
    minecraft_uuid TEXT,            -- reservado para a futura ponte Discord <-> Minecraft
    criado_em      INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX idx_perfis_xp    ON perfis (guild_id, xp DESC);
CREATE INDEX idx_perfis_saldo ON perfis (guild_id, saldo DESC);

-- Livro-razão imutável: toda mudança de saldo deixa uma linha aqui.
CREATE TABLE transacoes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    tipo       TEXT    NOT NULL,
    valor      INTEGER NOT NULL,     -- positivo = crédito, negativo = débito
    saldo_apos INTEGER NOT NULL,
    ref        TEXT,
    criado_em  INTEGER NOT NULL
);
CREATE INDEX idx_transacoes_user ON transacoes (guild_id, user_id, id DESC);
CREATE TRIGGER transacoes_sem_update BEFORE UPDATE ON transacoes
BEGIN SELECT RAISE(ABORT, 'transacoes e imutavel'); END;
CREATE TRIGGER transacoes_sem_delete BEFORE DELETE ON transacoes
BEGIN SELECT RAISE(ABORT, 'transacoes e imutavel'); END;

CREATE TABLE casos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  INTEGER NOT NULL,
    numero    INTEGER NOT NULL,
    tipo      TEXT    NOT NULL,
    alvo_id   INTEGER NOT NULL,
    mod_id    INTEGER NOT NULL,
    motivo    TEXT    NOT NULL,
    duracao_s INTEGER,
    ativo     INTEGER NOT NULL DEFAULT 1,
    criado_em INTEGER NOT NULL,
    UNIQUE (guild_id, numero)
);
CREATE INDEX idx_casos_alvo ON casos (guild_id, alvo_id, numero DESC);

CREATE TABLE tickets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     INTEGER NOT NULL,
    canal_id     INTEGER NOT NULL UNIQUE,
    autor_id     INTEGER NOT NULL,
    categoria    TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'aberto',
    assumido_por INTEGER,
    sla_avisado  INTEGER NOT NULL DEFAULT 0,
    criado_em    INTEGER NOT NULL,
    fechado_em   INTEGER
);
CREATE UNIQUE INDEX ux_ticket_aberto
    ON tickets (guild_id, autor_id, categoria) WHERE status = 'aberto';

-- Um pedido por proponente. O valor fica "em custódia" (já debitado) até o desfecho.
CREATE TABLE pedidos_uniao (
    guild_id      INTEGER NOT NULL,
    proponente_id INTEGER NOT NULL,
    alvo_id       INTEGER NOT NULL,
    valor         INTEGER NOT NULL,
    criado_em     INTEGER NOT NULL,
    expira_em     INTEGER NOT NULL,
    PRIMARY KEY (guild_id, proponente_id)
);

-- Apostas em andamento: se o bot reiniciar, o valor é devolvido.
CREATE TABLE jogos_pendentes (
    guild_id  INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    jogo      TEXT    NOT NULL,
    aposta    INTEGER NOT NULL,
    criado_em INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id, jogo)
);
""",
    ),
]

MIGRACOES.append((
    2,
    """
-- Visibilidade de categoria/canal por nível (aplicada de verdade nas permissões do Discord).
CREATE TABLE visibilidade_canal (
    guild_id INTEGER NOT NULL,
    canal_id INTEGER NOT NULL,
    tier     TEXT    NOT NULL,
    PRIMARY KEY (guild_id, canal_id)
);
""",
))

MIGRACOES.append((
    3,
    """
-- Recompensas que só podem sair uma vez por chave (drop pego, pergunta do dia respondida, aniversário do ano).
-- A PRIMARY KEY garante isso mesmo com cliques simultâneos.
CREATE TABLE recompensas_unicas (
    guild_id  INTEGER NOT NULL,
    chave     TEXT    NOT NULL,
    user_id   INTEGER NOT NULL,
    valor     INTEGER NOT NULL,
    criado_em INTEGER NOT NULL,
    PRIMARY KEY (guild_id, chave)
);

-- Mensagens que já viraram pérola (para não repostar e para editar a contagem).
CREATE TABLE perolas (
    guild_id     INTEGER NOT NULL,
    msg_id       INTEGER NOT NULL,
    perola_msg_id INTEGER NOT NULL,
    criado_em    INTEGER NOT NULL,
    PRIMARY KEY (guild_id, msg_id)
);

CREATE TABLE aniversarios (
    guild_id INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    dia      INTEGER NOT NULL,
    mes      INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX ix_aniversarios_data ON aniversarios (guild_id, mes, dia);
""",
))

MIGRACOES.append((
    4,
    """
-- Fidelidade: contadores por pessoa que contam para virar Helper (bumps, boas-vindas, denúncias, publicações).
CREATE TABLE fidelidade (
    guild_id   INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    tipo       TEXT    NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    PRIMARY KEY (guild_id, user_id, tipo)
);
-- Os bumps antigos já estavam guardados como recompensas únicas 'bump:<mensagem>': entram como histórico.
INSERT INTO fidelidade (guild_id, user_id, tipo, quantidade)
    SELECT guild_id, user_id, 'bumps', COUNT(*) FROM recompensas_unicas
    WHERE chave LIKE 'bump:%' GROUP BY guild_id, user_id;

-- Quem entrou há pouco (para contar boas-vindas). Linhas velhas são limpas a cada entrada nova.
CREATE TABLE entradas_recentes (
    guild_id  INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    entrou_em INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);

-- Uma boa-vinda por par (quem saudou, novato). entrada_em liga à entrada para desfazer se o novato sair logo.
CREATE TABLE boas_vindas_dadas (
    guild_id   INTEGER NOT NULL,
    membro_id  INTEGER NOT NULL,
    novato_id  INTEGER NOT NULL,
    entrada_em INTEGER NOT NULL,
    criado_em  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, membro_id, novato_id)
);
CREATE INDEX ix_boas_vindas_novato ON boas_vindas_dadas (guild_id, novato_id);

-- Publicações contadas (limites por tempo, desconto se apagar logo e histórico para a staff conferir).
CREATE TABLE publicacoes (
    guild_id  INTEGER NOT NULL,
    msg_id    INTEGER NOT NULL,
    canal_id  INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    criado_em INTEGER NOT NULL,
    PRIMARY KEY (guild_id, msg_id)
);
CREATE INDEX ix_publicacoes_user ON publicacoes (guild_id, user_id, criado_em);

-- Decisão da staff no tíquete: denúncia ('aprovada' | 'rejeitada') ou pedido de rank ('promovido' | 'recusado').
-- Só a primeira vale.
ALTER TABLE tickets ADD COLUMN avaliacao TEXT;
ALTER TABLE tickets ADD COLUMN avaliado_por INTEGER;
""",
))

MIGRACOES.append((
    5,
    """
-- Cérebro da Kiza: fatos duradouros que ela lembra sobre cada pessoa (curtos, ditos pela própria pessoa).
CREATE TABLE cerebro_memorias (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    fato      TEXT    NOT NULL,
    criado_em INTEGER NOT NULL
);
CREATE INDEX ix_cerebro_memorias_user ON cerebro_memorias (guild_id, user_id, id);
""",
))

MIGRACOES.append((
    6,
    """
-- Figurinhas: inventário por pessoa e o controle do pacotinho grátis do dia.
CREATE TABLE figurinhas (
    guild_id    INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    carta_id    TEXT    NOT NULL,
    quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
    primeira_em INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id, carta_id)
);
CREATE TABLE figurinhas_gratis (
    guild_id INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    dia      TEXT    NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);
""",
))

# Ponte com o Minecraft: vínculo Discord <-> jogador, códigos de vínculo, livro de sincronização (idempotente) e fila do chat.
MIGRACOES.append((
    7,
    """
-- Um vínculo por pessoa e por conta do jogo. mc_id é o id do jogador no mundo (pode mudar se o mundo mudar: então a conta é
-- reconhecida pelo nome e o id é atualizado); mc_nome_norm é o nome sem caixa nem espaços repetidos.
CREATE TABLE mc_vinculos (
    guild_id     INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    mc_id        TEXT    NOT NULL,
    mc_nome      TEXT    NOT NULL,
    mc_nome_norm TEXT    NOT NULL,
    vinculado_em INTEGER NOT NULL,
    visto_em     INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);
CREATE UNIQUE INDEX ux_mc_vinculo_nome ON mc_vinculos (guild_id, mc_nome_norm);
CREATE UNIQUE INDEX ux_mc_vinculo_id   ON mc_vinculos (guild_id, mc_id);

-- Códigos que o jogo mostra na tela preta; a pessoa digita /minecraft vincular no Discord. Um código vivo por jogador.
CREATE TABLE mc_codigos (
    guild_id     INTEGER NOT NULL,
    codigo       TEXT    NOT NULL,
    mc_id        TEXT    NOT NULL,
    mc_nome      TEXT    NOT NULL,
    mc_nome_norm TEXT    NOT NULL,
    criado_em    INTEGER NOT NULL,
    expira_em    INTEGER NOT NULL,
    PRIMARY KEY (guild_id, codigo)
);
CREATE UNIQUE INDEX ux_mc_codigo_id ON mc_codigos (guild_id, mc_id);

-- O jogo manda a diferença de Caudas e XP desde a última sincronização, com uma chave única por envio: reenviar a mesma
-- chave (resposta perdida) não soma duas vezes. O saldo e o XP do Discord são a verdade; o jogo copia de volta.
CREATE TABLE mc_sync (
    guild_id   INTEGER NOT NULL,
    mc_id      TEXT    NOT NULL,
    chave      TEXT    NOT NULL,
    user_id    INTEGER NOT NULL,
    d_caudas   INTEGER NOT NULL,
    d_xp       INTEGER NOT NULL,
    saldo_apos INTEGER NOT NULL,
    xp_apos    INTEGER NOT NULL,
    criado_em  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, mc_id, chave)
);

-- Mensagens do canal da ponte esperando o jogo buscar (o jogo guarda até onde leu).
CREATE TABLE mc_chat (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  INTEGER NOT NULL,
    nome      TEXT    NOT NULL,
    texto     TEXT    NOT NULL,
    criado_em INTEGER NOT NULL
);

-- Quem vinculou, trocou ou desvinculou (para a staff conferir; nunca é apagado).
CREATE TABLE mc_historico (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    mc_id     TEXT,
    mc_nome   TEXT,
    evento    TEXT    NOT NULL,
    criado_em INTEGER NOT NULL
);
""",
))


# Kitsune controlado pelo jogo: o que o servidor de Minecraft diz sobre o selo de cada pessoa (o cargo do Discord só espelha isto).
MIGRACOES.append((
    8,
    """
-- ativo: tem o selo no jogo agora; ate: fim do prazo em ms (0 = sem prazo). O cargo do Discord segue (ativo e ainda no prazo).
CREATE TABLE mc_kitsune (
    guild_id      INTEGER NOT NULL,
    user_id       INTEGER NOT NULL,
    ativo         INTEGER NOT NULL CHECK (ativo IN (0, 1)),
    ate           INTEGER NOT NULL DEFAULT 0,
    atualizado_em INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
);
""",
))


# Apoio ao servidor: pagamentos por PIX (compra de Kitsune e doações) e as metas de arrecadação. Valores sempre em centavos.
MIGRACOES.append((
    9,
    """
CREATE TABLE metas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id       INTEGER NOT NULL,
    titulo         TEXT    NOT NULL,
    descricao      TEXT    NOT NULL DEFAULT '',
    alvo_centavos  INTEGER NOT NULL CHECK (alvo_centavos > 0),
    criada_em      INTEGER NOT NULL,
    prazo          INTEGER NOT NULL DEFAULT 0,      -- ts em segundos; 0 = sem prazo
    encerrada_em   INTEGER NOT NULL DEFAULT 0,      -- 0 = ativa
    motivo_fim     TEXT    NOT NULL DEFAULT ''      -- concluida, prazo ou encerrada
);
CREATE INDEX ix_metas_ativas ON metas (guild_id, encerrada_em);

CREATE TABLE pagamentos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    tipo            TEXT    NOT NULL CHECK (tipo IN ('kitsune', 'doacao')),
    valor_centavos  INTEGER NOT NULL CHECK (valor_centavos > 0),
    meses           INTEGER NOT NULL DEFAULT 0,
    meta_id         INTEGER,                         -- doação: a meta que recebeu (NULL = geral)
    anonimo         INTEGER NOT NULL DEFAULT 0,
    mensagem        TEXT    NOT NULL DEFAULT '',
    status          TEXT    NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'expirado', 'cancelado')),
    ref             TEXT    NOT NULL UNIQUE,         -- a nossa referência, enviada ao provedor
    provedor_id     TEXT    UNIQUE,                  -- o id do pagamento no provedor (Mercado Pago)
    copia_cola      TEXT    NOT NULL DEFAULT '',
    qr_base64       TEXT    NOT NULL DEFAULT '',
    criado_em       INTEGER NOT NULL,
    expira_em       INTEGER NOT NULL,
    pago_em         INTEGER NOT NULL DEFAULT 0,
    kitsune_ate     INTEGER NOT NULL DEFAULT 0,      -- ms: fim do prazo que esta compra dá (já somado às anteriores)
    aplicado        INTEGER NOT NULL DEFAULT 0,      -- o Discord já recebeu o efeito (cargo, aviso, mural)
    jogo_ok         INTEGER NOT NULL DEFAULT 0       -- o jogo já confirmou o selo (só compra de Kitsune)
);
CREATE INDEX ix_pagamentos_status ON pagamentos (status, expira_em);
CREATE INDEX ix_pagamentos_pessoa ON pagamentos (guild_id, user_id);
""",
))


# Metas com imagem e cor própria (a imagem fica no banco, porque o link de anexo do Discord expira).
MIGRACOES.append((
    10,
    """
ALTER TABLE metas ADD COLUMN imagem BLOB;
ALTER TABLE metas ADD COLUMN imagem_tipo TEXT NOT NULL DEFAULT '';
ALTER TABLE metas ADD COLUMN cor INTEGER NOT NULL DEFAULT 0;
""",
))


# Caixinhas: contabilidade do que entrou (pagamentos) e do que saiu (gastos que a staff registra) em cada "caixinha".
# O dinheiro de verdade fica na conta do Mercado Pago; isto só organiza a conta para o dono saber quanto é de quê.
MIGRACOES.append((
    11,
    """
CREATE TABLE gastos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,                 -- quem registrou
    caixinha        TEXT    NOT NULL,                 -- kitsune, geral ou meta:<id>
    valor_centavos  INTEGER NOT NULL CHECK (valor_centavos > 0),
    motivo          TEXT    NOT NULL,
    criado_em       INTEGER NOT NULL
);
CREATE INDEX ix_gastos_guild ON gastos (guild_id, caixinha);
""",
))
