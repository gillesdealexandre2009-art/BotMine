"""Textos fixos da Kiza.

A Kiza NÃO usa IA: a personalidade dela vive só aqui. Simpática, leve, em português
do Brasil, sem nenhum conteúdo romântico, sexual ou adulto (a comunidade tem menores).
Para mudar a voz do bot, edite este arquivo. Os {campos} são preenchidos pelo código.
"""

NOME_BOT = "Kiza"

# ============================================================================ erros e avisos gerais
ERRO_GENERICO = "🦊 Ops, tropecei na minha própria cauda! Anotei o erro (código `{codigo}`). Tente de novo daqui a pouco."
SEM_PERMISSAO = "🦊 Esse comando é para o cargo **{nivel}** ou acima."
NAO_E_MEMBRO = "🦊 Primeiro leia as regras e clique em **Li e aceito** no canal de verificação para usar isso!"
NAO_CONFIGURADO = "🦊 Ainda não fui configurada por aqui. Um admin precisa rodar `/setup` primeiro."
FUNCAO_DESLIGADA = "🦊 Essa função ainda não foi configurada. Um admin pode fazer isso com `/setup`."
COOLDOWN = "🦊 Calma, raposinha! Tente de novo em **{seg}s**."
SO_SERVIDOR = "🦊 Esse comando só funciona dentro do servidor."
SEM_PERMISSAO_BOT = "🦊 Eu não tenho permissão para fazer isso. Peça a um admin para rodar `/configuracao` e conferir meus cargos e permissões."
CHECK_FALHOU = "🦊 Você não pode usar isso agora."
COMANDO_DESATUALIZADO = "🦊 Esse comando mudou de lugar. Feche e abra o Discord (ou tente de novo em instantes)."
VIEW_NAO_E_SUA = "🦊 Esses botões são de outra pessoa. Use o seu próprio comando!"
VIEW_EXPIROU = "⏳ Esse painel expirou. Rode o comando de novo."

# ============================================================================ entrada
BOAS_VINDAS_TITULO = "🦊 Uma nova raposa chegou!"
# {mencao} {servidor} {canal_regras}
BOAS_VINDAS_DESC = (
    "Oi, {mencao}! Que bom te ver por aqui, seja bem-vindo(a) ao **{servidor}**.\n\n"
    "📜 Leia as regras em {canal_regras} e clique em **Li e aceito** para liberar o resto da toca.\n"
    "Qualquer dúvida, é só abrir um ticket. Eu fico de olho por aqui! 🌿"
)
BOAS_VINDAS_CANAL_REGRAS_PADRAO = "o canal de regras"
BOAS_VINDAS_RODAPE = "Você é o membro nº {n}"  # {n}
ADEUS_TITULO = "🍂 Uma raposa foi embora"
ADEUS_DESC = "**{nome}** saiu da toca. Que as trilhas sejam boas!"  # {nome}
RAID_KICK_DM = (
    "Oi! O servidor **{servidor}** está temporariamente fechado para novos membros "
    "(modo de proteção). Tente entrar de novo mais tarde. 🦊"
)  # {servidor}

VERIFICACAO_TITULO = "🔑 Verificação"
VERIFICACAO_DESC = (
    "Para liberar todos os canais, leia as regras com atenção e clique no botão abaixo.\n\n"
    "Ao clicar em **Li e aceito**, você confirma que leu e vai seguir as regras da comunidade. 🦊"
)
VERIFICACAO_BOTAO = "Li e aceito"
VERIFICACAO_OK = "✅ Pronto! Agora você é **Membro**. Explore a toca e se divirta! 🦊"
VERIFICACAO_JA = "🦊 Você já é membro, pode explorar à vontade!"
VERIFICACAO_SEM_CARGO = "🦊 A verificação ainda não foi configurada. Avise a staff!"
VERIFICACAO_ERRO_PERM = "🦊 Não consegui te dar o cargo. Avise a staff para conferir a posição do meu cargo na lista!"

REGRAS_TITULO = "📜 Regras da toca"
REGRAS_INTRO = "Para todo mundo se divertir em paz, combinamos o seguinte:"
REGRAS = [
    ("💛 1. Respeito sempre", "Nada de ofensas, preconceito, assédio ou bullying. Aqui todo mundo é bem-vindo."),
    (
        "🚫 2. Nada de conteúdo impróprio",
        "Não é permitido conteúdo adulto, violento, perturbador ou de ódio — nem em texto, imagem, apelido ou avatar.",
    ),
    (
        "🔒 3. Privacidade em primeiro lugar",
        "Nunca compartilhe dados pessoais, seus ou de outras pessoas (endereço, telefone, escola, fotos privadas, senhas). "
        "A staff **nunca** pede sua senha.",
    ),
    ("📢 4. Sem spam nem divulgação", "Nada de flood, propaganda, convites de outros servidores ou links suspeitos."),
    ("🗂️ 5. Cada assunto no seu canal", "Leia a descrição dos canais e use cada um do jeito certo."),
    ("🎮 6. Jogue limpo", "Sem trapaças, golpes, contas falsas ou se passar por outra pessoa."),
    (
        "🛡️ 7. Fale com a staff",
        "Algo te deixou desconfortável? Abra um ticket. Respeite as decisões da staff; se discordar, converse por ticket.",
    ),
    ("📱 8. Regras do Discord", "Siga os Termos de Serviço e as Diretrizes da Comunidade do Discord, incluindo a idade mínima."),
]
REGRAS_RODAPE = "Ao continuar no servidor, você concorda com estas regras."

# ============================================================================ painel de cargos
CARGOS_TITULO = "🎭 Personalize seu perfil"
CARGOS_DESC = (
    "Escolha abaixo os cargos que combinam com você. Tudo é opcional e você pode trocar quando quiser.\n"
    "Dentro de cada grupo só um cargo fica ativo por vez."
)
CARGOS_RODAPE = "Os cargos de faixa etária são só identificação: não mudam o que você pode ver ou fazer."
CARGOS_NENHUM = "Nenhum / remover"
CARGOS_SO_MEMBROS = "🦊 Primeiro aceite as regras no canal de verificação para personalizar seu perfil!"
CARGOS_INVALIDO = "🦊 Essa opção não existe mais. Peça à staff para atualizar o painel."
CARGOS_ATUALIZADO = "✅ Pronto! Seu cargo agora é **{cargo}**."  # {cargo}
CARGOS_REMOVIDO = "✅ Removi seus cargos desse grupo."
CARGOS_ERRO_PERM = "🦊 Não consigo mexer no cargo **{cargo}**. Avise a staff: ele precisa ficar abaixo do meu cargo."  # {cargo}
CARGOS_NAO_CONFIGURADO = "🦊 Nenhum grupo de cargos foi configurado ainda. Use `/setup` → Painel de cargos."

# ============================================================================ tickets
TICKET_PAINEL_TITULO = "🎫 Precisa de ajuda?"
TICKET_PAINEL_DESC = (
    "Escolha uma categoria abaixo e eu abro um canal privado só para você e para a staff.\n\n"
    "{lista}\n\n"
    "Você pode ter **um** ticket aberto por categoria."
)  # {lista}
TICKET_ABERTO_TITULO = "🎫 Ticket • {categoria}"  # {categoria}
TICKET_ABERTO_DESC = (
    "Oi, {autor}! Conte o que aconteceu com o máximo de detalhes.\n"
    "A staff já foi avisada e vai te atender assim que possível. 🦊"
)  # {autor}
TICKET_JA_TEM = "🦊 Você já tem um ticket de **{categoria}** aberto: {canal}"  # {categoria} {canal}
TICKET_CRIADO = "✅ Ticket criado: {canal}"  # {canal}
TICKET_ERRO_CRIAR = "🦊 Não consegui criar o canal do ticket. Avise a staff (falta permissão de Gerenciar Canais?)."
TICKET_SO_MEMBROS = "🦊 Aceite as regras primeiro para abrir tickets."
TICKET_SEM_PAINEL = "🦊 O painel de tickets ainda não foi configurado."
TICKET_SO_STAFF_ASSUMIR = "🦊 Só a staff (cargo Staff ou acima) pode assumir tickets."
TICKET_ASSUMIDO = "🙋 {staff} assumiu este ticket!"  # {staff}
TICKET_JA_ASSUMIDO = "🦊 Este ticket já foi assumido por {staff}."  # {staff}
TICKET_NAO_ENCONTRADO = "🦊 Não encontrei esse ticket (talvez já tenha sido fechado)."
TICKET_SEM_PERM_FECHAR = "🦊 Só quem abriu o ticket ou a staff pode fechá-lo."
TICKET_CONFIRMAR_FECHAR = "Tem certeza de que quer **fechar** este ticket? O canal será apagado e a conversa salva no canal de logs."
TICKET_SEM_LOGS = (
    "\n\n⚠️ **Não há canal de logs configurado**: a transcrição **não será salva** e a conversa será perdida. "
    "Se quiser guardar, peça a um admin para configurar em `/setup` e feche depois."
)
TICKET_FECHANDO = "🔒 Ticket fechado por {quem}. Este canal será apagado em 5 segundos."  # {quem}
TICKET_TRANSCRICAO_TITULO = "📄 Ticket #{id} fechado"  # {id}
TICKET_SLA = (
    "⏰ {staff} este ticket está esperando atendimento há mais de **{min} min**. Alguém pode assumir?"
)  # {staff} {min}
TICKET_CANCELADO = "Certo, o ticket continua aberto. 🦊"

# ============================================================================ moderação
MOD_SI_MESMO = "🦊 Você não pode fazer isso consigo mesmo."
MOD_BOT = "🦊 Eu não posso ser alvo disso, sou só uma raposinha de plantão."
MOD_DONO = "🦊 Não dá para fazer isso com o dono do servidor."
MOD_NIVEL = "🦊 Você só pode agir sobre quem tem nível **menor** que o seu."
MOD_HIERARQUIA = "🦊 O cargo mais alto dessa pessoa é igual ou maior que o seu."
MOD_BOT_HIERARQUIA = "🦊 O cargo mais alto dessa pessoa é igual ou maior que o meu. Suba meu cargo na lista de cargos."
MOD_DM_TITULO = "Aviso do servidor {servidor}"  # {servidor}
MOD_DM_CORPO = "{acao}\n**Motivo:** {motivo}"  # {acao} {motivo}
MOD_DM_ACAO = {
    "warn": "Você recebeu um **aviso**.",
    "timeout": "Você foi colocado(a) em **timeout** ({duracao}).",
    "kick": "Você foi **expulso(a)** do servidor.",
    "ban": "Você foi **banido(a)** do servidor.",
}
MOD_DM_FALHOU = "\n📪 Não consegui enviar DM para a pessoa (DMs fechadas)."
MOD_WARN_OK = "✅ Aviso **#{numero}** registrado para {alvo}. Avisos ativos: **{ativos}**.{extra}"  # {numero} {alvo} {ativos} {extra}
MOD_AUTO_TIMEOUT = "\n⏳ Chegou a {limite} avisos: timeout automático de {duracao}."  # {limite} {duracao}
MOD_AUTO_TIMEOUT_FALHOU = "\n⚠️ Era hora do timeout automático, mas não consegui aplicá-lo (confira meu cargo)."
MOD_TIMEOUT_OK = "✅ {alvo} ficou em timeout por **{duracao}** (caso **#{numero}**)."  # {alvo} {duracao} {numero}
MOD_TIMEOUT_INVALIDO = "🦊 Duração inválida. Exemplos: `10m`, `2h`, `1d`, `1h30m` (mínimo 10s, máximo 28 dias)."
MOD_UNTIMEOUT_OK = "✅ Removi o timeout de {alvo} (caso **#{numero}**)."  # {alvo} {numero}
MOD_KICK_OK = "✅ {alvo} foi expulso(a) (caso **#{numero}**)."  # {alvo} {numero}
MOD_BAN_OK = "✅ **{alvo}** foi banido(a) (caso **#{numero}**)."  # {alvo} {numero}
MOD_UNBAN_OK = "✅ **{alvo}** foi desbanido(a) (caso **#{numero}**)."  # {alvo} {numero}
MOD_UNBAN_NAO_BANIDO = "🦊 Essa pessoa não está na lista de banidos."
MOD_ID_INVALIDO = "🦊 Isso não parece um ID de usuário válido."
MOD_LIMPAR_OK = "🧹 Apaguei **{n}** mensagem(ns)."  # {n}
MOD_AVISOS_VAZIO = "🦊 {alvo} não tem nenhum registro. Ficha limpinha!"  # {alvo}
MOD_CASO_NAO_ENCONTRADO = "🦊 Não encontrei o caso **#{numero}**."  # {numero}
MOD_AVISO_REMOVIDO = "✅ Aviso do caso **#{numero}** removido (não conta mais para o timeout automático)."  # {numero}
MOD_AVISO_NAO_REMOVIVEL = "🦊 O caso **#{numero}** não é um aviso ativo."  # {numero}
MOD_SEM_PERM_DISCORD = "🦊 Não tenho a permissão do Discord necessária para isso ({perm})."  # {perm}
MOD_ACAO_FALHOU = "🦊 Não consegui executar a ação. Confira meu cargo e minhas permissões."

# ============================================================================ automod
AUTOMOD_AVISO = "{mencao}, {motivo} 🦊"  # {mencao} {motivo}
AUTOMOD_MOTIVOS = {
    "spam": "calma com o ritmo das mensagens, isso parece spam",
    "convite": "convites de outros servidores não são permitidos aqui",
    "link": "links não são permitidos neste servidor",
    "mencoes": "muitas menções de uma vez não são permitidas",
}
AUTOMOD_TIMEOUT_MOTIVO = "Automod: infrações repetidas ({motivo})"  # {motivo}
RAID_LIGADO = "🚨 Modo raid **ligado**. Novos membros serão barrados até você desligar com `/raid desligar`."
RAID_DESLIGADO = "✅ Modo raid **desligado**. A entrada de novos membros voltou ao normal."
RAID_STATUS_LIGADO = "🚨 O modo raid está **ligado**."
RAID_STATUS_DESLIGADO = "✅ O modo raid está **desligado**."

# ============================================================================ canais
CANAL_REGRA_DESCRICOES = {
    "so_anexos": "Só mensagens com anexo, figurinha ou link",
    "so_comandos": "Só comandos (mensagens comuns são apagadas)",
    "auto_thread": "Cria uma thread para cada mensagem (ou recepciona posts de fórum)",
    "reacao_auto": "Reage automaticamente às mensagens",
}
CANAL_REGRA_ADICIONADA = "✅ Regra **{regra}** ativada em {canal}."  # {regra} {canal}
CANAL_REGRA_REMOVIDA = "✅ Regra **{regra}** removida de {canal}."  # {regra} {canal}
CANAL_REGRA_INEXISTENTE = "🦊 Esse canal não tem essa regra."
CANAL_REGRA_VAZIO = "🦊 Nenhuma regra de canal configurada ainda."
CANAL_AVISO_SO_ANEXOS = "{mencao}, este canal é só para anexos, figurinhas ou links!"  # {mencao}
CANAL_AVISO_SO_COMANDOS = "{mencao}, este canal é só para comandos!"  # {mencao}
CANAL_THREAD_DUVIDA = "Dúvida de {nome}"  # {nome}
CANAL_THREAD_SUGESTAO = "Sugestão de {nome}"  # {nome}
FORUM_BOAS_VINDAS = (
    "Obrigada por perguntar! 🦊 Conte com detalhes o que você já tentou. "
    "Quando resolver, avise aqui para ajudar quem tiver a mesma dúvida."
)

# ============================================================================ xp e economia
XP_NIVEL_UP = "🌟 {mencao} subiu para o **nível {nivel}**!"  # {mencao} {nivel}
RANK_TITULO = "🌟 Rank de {nome}"  # {nome}
RANKING_TITULO_XP = "🌟 Ranking de XP"
RANKING_TITULO_MOEDAS = "{emoji} Ranking de {moeda}"  # {emoji} {moeda}
RANKING_VAZIO = "🦊 Ainda não tem ninguém no ranking. Que tal ser o primeiro?"
XP_ADMIN_OK = "✅ XP de {alvo} agora é **{xp}** (nível {nivel})."  # {alvo} {xp} {nivel}

DAILY_OK = (
    "🎁 Você resgatou **{valor}** no daily!\nSequência: **{streak}** dia(s). Saldo: **{saldo}**."
)  # {valor} {streak} {saldo}
DAILY_BONUS_KITSUNE = "\n🦊 Bônus Kitsune incluso!"
DAILY_JA = "🦊 Você já resgatou o daily de hoje. Volte amanhã!"
SALDO_TEXTO = "{emoji} {nome} tem **{saldo}**."  # {emoji} {nome} {saldo}
PERFIL_TITULO = "🦊 Perfil de {nome}"  # {nome}
PAGAR_OK = "💸 {de} enviou **{valor}** para {para}!"  # {de} {para} {valor}
PAGAR_SEM_SALDO = "🦊 Você não tem saldo suficiente."
PAGAR_INVALIDO = "🦊 Escolha outra pessoa (que não seja você nem um bot)."
PAGAR_LIMITE = "🦊 O valor máximo por pagamento é **{max}**."  # {max}
PAGAR_DESTINO_NAO_MEMBRO = "🦊 Essa pessoa ainda não é membro do servidor."
ECON_ADMIN_DAR = "✅ Dei **{valor}** para {alvo}. Novo saldo: **{saldo}**."  # {valor} {alvo} {saldo}
ECON_ADMIN_TIRAR = "✅ Tirei **{valor}** de {alvo}. Novo saldo: **{saldo}**."  # {valor} {alvo} {saldo}

# ============================================================================ união de toca (casamento amigável)
UNIAO_PEDIDO_TITULO = "🤝 Pedido de união de toca"
UNIAO_PEDIDO_DESC = (
    "{proponente} quer formar uma **união de toca** com {alvo}! É um título de dupla, só de brincadeira. 🦊\n"
    "Custo pago por quem pediu: **{custo}**. Se o pedido cair, devolvo tudo.\n"
    "O pedido expira em <t:{expira}:R>."
)  # {proponente} {alvo} {custo} {expira}
UNIAO_ACEITAR = "Aceitar"
UNIAO_RECUSAR = "Recusar"
UNIAO_FORMADA = "🎉 {a} e {b} agora são uma **dupla de toca**! Felicidades para a dupla! 🦊"  # {a} {b}
UNIAO_RECUSADA = "🦊 {alvo} recusou o pedido. Suas {moeda} foram devolvidas."  # {alvo} {moeda}
UNIAO_CANCELADA = "✅ Pedido cancelado. Devolvi **{valor}** para você."  # {valor}
UNIAO_EXPIRADA_DM = "⏳ Seu pedido de união de toca em **{servidor}** expirou. Devolvi **{valor}** para você. 🦊"  # {servidor} {valor}
UNIAO_JA_CASADO = "🦊 Você já está em uma dupla de toca. Use `/casamento divorciar` antes de pedir outra."
UNIAO_ALVO_CASADO = "🦊 Essa pessoa já está em uma dupla de toca."
UNIAO_PEDIDO_EXISTE = "🦊 Você já tem um pedido em andamento. Cancele com `/casamento cancelar` antes de fazer outro."
UNIAO_SEM_SALDO = "🦊 Você não tem saldo suficiente ({custo})."  # {custo}
UNIAO_INVALIDO = "🦊 Escolha outra pessoa (que não seja você nem um bot)."
UNIAO_SEM_PEDIDO = "🦊 Não encontrei um pedido entre vocês."
UNIAO_EXPIRADO = "⏳ Esse pedido expirou. O valor foi devolvido para quem pediu."
UNIAO_INDISPONIVEL = "🦊 Alguém do pedido já está em outra dupla de toca. Devolvi o valor para quem pediu."
UNIAO_DIVORCIADO = "✅ A dupla de toca com {parceiro} foi desfeita."  # {parceiro}
UNIAO_SEM_UNIAO = "🦊 Você não está em nenhuma dupla de toca."
UNIAO_STATUS = "🤝 {nome} está em dupla de toca com {parceiro} desde <t:{desde}:D>."  # {nome} {parceiro} {desde}
UNIAO_STATUS_SOLTO = "🦊 {nome} não está em nenhuma dupla de toca."  # {nome}
UNIAO_NAO_E_PARA_VOCE = "🦊 Esse pedido não é para você."

# ============================================================================ mines (só por diversão)
MINES_TITULO = "💎 Mines"
MINES_DESC = (
    "Encontre as casas seguras **sem** cair em uma mina! 💥\n"
    "Aposta: **{aposta}** • Minas: **{minas}**\n"
    "Multiplicador atual: **x{mult}** • Resgate: **{premio}**\n"
    "É só um joguinho com moeda virtual do servidor, sem valor real."
)  # {aposta} {minas} {mult} {premio}
MINES_GANHOU = "🏆 Você resgatou **{premio}** (x{mult})! Saldo: **{saldo}**."  # {premio} {mult} {saldo}
MINES_PERDEU = "💥 Boom! Você perdeu a aposta de **{aposta}**. Saldo: **{saldo}**."  # {aposta} {saldo}
MINES_PERFEITO = "🌟 Jogo perfeito! Você achou todas as casas seguras e resgatou **{premio}**! Saldo: **{saldo}**."  # {premio} {saldo}
MINES_TIMEOUT = "⏳ O tempo acabou: resgatei automaticamente **{premio}** para você. Saldo: **{saldo}**."  # {premio} {saldo}
MINES_REEMBOLSO = "⏳ O tempo acabou sem nenhuma jogada, então devolvi sua aposta de **{aposta}**. Saldo: **{saldo}**."  # {aposta} {saldo}
MINES_SEM_SALDO = "🦊 Você não tem saldo suficiente para essa aposta."
MINES_LIMITES = "🦊 A aposta precisa ficar entre **{min}** e **{max}**."  # {min} {max}
MINES_EM_ANDAMENTO = "🦊 Você já tem um jogo de Mines em andamento."
MINES_NAO_E_SEU = "🦊 Esse jogo é de outra pessoa!"
MINES_RESGATAR = "Resgatar"
MINES_ENCERRADO = "🦊 Esse jogo já terminou."

# ============================================================================ geral
AJUDA_TITULO = "🦊 Ajuda da Kiza"
AJUDA_INTRO = "Oi! Eu sou a **Kiza**, a raposinha guardiã do VULPUS. Aqui vai o que eu sei fazer:"
AJUDA_CAMPOS = {
    "membro": (
        "🌟 Perfil e XP",
        "`/perfil` `/rank` `/ranking` — veja seu progresso\n`/daily` `/saldo` `/pagar` — suas {moeda}",
    ),
    "diversao": (
        "🎮 Diversão",
        "`/mines jogar` — joguinho por diversão\n`/casamento pedir` — forme uma dupla de toca\n"
        "`/aniversario definir` — ganhe parabéns e presente no seu dia",
    ),
    "suporte": ("🎫 Suporte", "Precisa de ajuda? Abra um ticket no canal de tickets."),
    "helper": ("🛡️ Helper", "`/warn` `/avisos` `/caso` — avisos e histórico"),
    "staff": (
        "🔨 Staff",
        "`/timeout` `/remover-timeout` `/kick` `/limpar` `/remover-aviso` — moderação\nAtender tickets e ver logs",
    ),
    "admin": (
        "👑 Admin",
        "`/setup` `/configuracao` `/ajustes` — configuração\n`/ban` `/unban` `/raid` `/canal-regra` `/economia-admin` `/backup`",
    ),
}  # {moeda} em "membro"
STATUS_TITULO = "🦊 Status da Kiza"

# ============================================================================ configuração
SETUP_NAO_ADMIN = "🦊 Só admins (ou o dono do servidor) podem usar o `/setup`."
SETUP_HUB_TITULO = "🛠️ Configuração da Kiza"
SETUP_HUB_DESC = (
    "Escolha no menu abaixo o que configurar. Nada é apagado: você pode mudar tudo depois.\n"
    "Quando terminar, vá em **Publicar painéis** para eu postar regras, verificação, cargos e tickets."
)
SETUP_ESCOLHA_PRIMEIRO = "🦊 Escolha primeiro a função no menu de cima."
SETUP_SALVO = "✅ Salvo!"
SETUP_LIMPO = "✅ Configuração removida."
SETUP_AVISO_CANAL = "⚠️ Nesse canal me falta: {faltas}."  # {faltas}
SETUP_AVISO_CARGO = "⚠️ Não consigo gerenciar: {cargos}. Suba o meu cargo acima deles em Configurações → Cargos."  # {cargos}
SETUP_MODULO_OFF = "Módulo desativado (veja COGS_DESATIVADOS)."
SETUP_PUBLICADO = "✅ {o_que} publicado em {canal}."  # {o_que} {canal}
SETUP_PUBLICAR_FALTA = "⚠️ {o_que}: {motivo}"  # {o_que} {motivo}
SETUP_SEM_CANAL = "canal não configurado"
SETUP_SEM_CARGOS = "nenhum cargo configurado nos grupos do painel"
SETUP_ERRO_PUBLICAR = "não consegui enviar a mensagem nesse canal (confira minhas permissões)"
AJUSTE_INVALIDO = "🦊 Esse ajuste não existe."
AJUSTE_FORA_FAIXA = "🦊 O valor de **{chave}** precisa ficar entre **{min}** e **{max}**."  # {chave} {min} {max}
AJUSTE_SALVO = "✅ **{chave}** agora é **{valor}**."  # {chave} {valor}
AJUSTE_REDEFINIDO = "✅ **{chave}** voltou ao padrão (**{valor}**)."  # {chave} {valor}
BACKUP_OK = "✅ Backup criado: `{nome}`."  # {nome}
BACKUP_FALHOU = "🦊 Não consegui criar o backup. Veja os logs do servidor."

# ============================================================================ (acréscimos) canais
CANAL_REGRA_SO_TEXTO = "🦊 Essa regra só funciona em canais de texto (fóruns só aceitam `auto_thread`)."
CANAL_REGRA_FALTA_EMOJI = "🦊 Para `reacao_auto` informe até 5 emojis, separados por espaço."

# ============================================================================ (acréscimos) aviso fixo e visibilidade
AVISO_STATUS_TITULO = "🚧 Em construção"
AVISO_STATUS_DESC = (
    "Essa área ainda está sendo preparada. Assim que estiver pronta, a staff avisa aqui mesmo "
    "com os detalhes (endereço, porta, o que for preciso) para todo mundo testar. 🦊"
)
SETUP_VISIBILIDADE_ESCOLHA_TIER = "🦊 Escolha o nível de visibilidade antes de escolher o canal/categoria."
SETUP_VISIBILIDADE_SALVO = "✅ **{alvo}** → {tier}. Clique em **Aplicar permissões** para valer no Discord."
SETUP_APLICANDO = "🔒 Aplicando permissões…"
SETUP_APLICAR_VAZIO = "🦊 Nenhuma visibilidade configurada ainda. Escolha os canais/categorias antes de aplicar."
SETUP_APLICAR_OK = "✅ {alvo}: aplicado ({tier})."
SETUP_APLICAR_ERRO_CARGO = "⚠️ {alvo}: não consegui mexer em {cargos} (suba o meu cargo acima deles)."
SETUP_APLICAR_ERRO_PERM = "❌ {alvo}: falha de permissão do Discord ao aplicar."
SETUP_APLICAR_SUMICO = "❌ o canal/categoria configurado não existe mais."

# ============================================================================ vitrine (canais fixos)
# Tom da Kiza: fofa, mas com atitude. Provoca de leve, nunca humilha ninguém.
# Campos {regras} {cargos} {chat} {tickets} {duvidas} viram menções de canal; {moeda} vira o nome da moeda.
INFOS_POST = "📖 Sobre o Vulpus"
INFOS_TITULO = "🦊 Bem-vindo(a) à toca do Vulpus!"
INFOS_DESC = (
    "Uma comunidade de **Minecraft Bedrock** feita para quem gosta de criar, explorar e fazer amigos.\n\n"
    "Aqui **não existe pay-to-win**. Ninguém compra vantagem: o que conta é a sua criatividade "
    "(e o quanto você aguenta me ouvir falar 😼)."
)
INFOS_CAMPOS = [
    (
        "🌲 O que tem por aqui",
        "Chat, mídias, eventos, pergunta do dia, drops de {moeda} e um servidor de Minecraft sendo preparado com carinho.",
    ),
    (
        "🚫 Sem pay-to-win",
        "Apoiar o servidor dá só coisas **decorativas** e prioridade em anúncios e eventos. Poder dentro do jogo, nunca.",
    ),
    ("🗺️ Por onde começar", "1. Leia as {regras}\n2. Escolha seus cargos em {cargos}\n3. Dê um oi no {chat}. Eu não mordo. Muito."),
    ("🎫 Precisa de ajuda?", "Abra um tíquete em {tickets} ou pergunte em {duvidas}."),
]
INFOS_RODAPE = "Kiza Misuchi • guardiã da toca"

KITSUNE_TITULO = "🦊 Seja um Kitsune"
KITSUNE_DESC = (
    "Os **Kitsunes** são as raposas que ajudam a manter a toca de pé. Sem eles, eu estaria "
    "dormindo num servidor desligado. 😿\n\n"
    "**Como virar Kitsune:** dê **boost** no servidor (o plano mensal, cerca de R$ 10).\n"
    "O cargo fica com você enquanto o boost estiver ativo."
)
KITSUNE_CAMPOS = [
    ("✨ Vantagens decorativas", "Cargo e cor exclusivos de Kitsune e destaque na lista de membros."),
    ("📢 Prioridade", "Fica sabendo primeiro dos anúncios e tem prioridade nas vagas de eventos."),
    (
        "⚖️ E pay-to-win?",
        "**Nunca.** Kitsune não ganha mais XP, mais {moeda} nem vantagem no jogo. É carinho, não poder.",
    ),
]
KITSUNE_RODAPE = "Obrigada, de verdade, a cada Kitsune. 🧡"

LORE_TITULO = "📖 A lenda de Kiza Misuchi"
LORE_CAPITULOS = [
    (
        "🌙 I. A raposa de uma cauda só",
        "Dizem que toda kitsune ganha uma cauda nova a cada grande história que vive. "
        "Kiza Misuchi nasceu com uma só, e odiava isso. As outras raposas tinham nove, brilhantes, "
        "e ela tinha... uma. Branquinha. Meio despenteada.",
    ),
    (
        "🌲 II. A floresta de blocos",
        "Cansada de esperar histórias caírem do céu, Kiza andou até achar uma floresta estranha, "
        "feita de blocos. Lá, as pessoas construíam casas, castelos e coisas que nem tinham nome. "
        "E cada coisa criada contava uma história.",
    ),
    (
        "🏡 III. A toca",
        "Kiza cavou uma toca no meio da floresta e a chamou de **Vulpus**. Não para guardar tesouros, "
        "mas para guardar **gente**. Quem chegasse e criasse algo junto deixava um pouquinho de história por lá.",
    ),
    (
        "🦊 IV. As Caudas",
        "Cada história contada na toca vira uma **Cauda**. É por isso que você ganha Caudas conversando, "
        "jogando e aparecendo. Kiza diz que não liga, mas conta todas, uma por uma, toda noite.",
    ),
    (
        "💎 V. As pérolas",
        "Os momentos mais bonitos da toca viram **pérolas** e ficam guardados para sempre. "
        "Se a Kiza um dia ganhar suas nove caudas, vai ser por causa de quem está lendo isto. "
        "Ela nunca vai admitir em voz alta, claro.",
    ),
]
LORE_RODAPE = "Capítulos novos aparecem conforme a toca cresce."

COMANDOS_TITULO = "🤖 O que a Kiza sabe fazer"
COMANDOS_DESC = "Todos os comandos começam com `/`. Use aqui mesmo, que é o lugar deles. 😼"
COMANDOS_CAMPOS = [
    ("🌟 Progresso", "`/perfil` `/rank` `/ranking`: seu nível e o dos outros"),
    ("🦊 {moeda}", "`/daily`: resgate diário (a sequência aumenta o valor)\n`/saldo` `/pagar`: sua carteira"),
    (
        "🎂 Aniversário",
        "`/aniversario definir`: eu te dou parabéns (e um presente) no seu dia. Só dá para marcar uma vez!\n"
        "`/aniversario lista`: próximos aniversários",
    ),
    ("🎮 Diversão", "`/mines jogar`: ache as casas seguras sem explodir\n`/casamento pedir`: forme uma dupla de toca"),
    (
        "🚀 Bump",
        "`/bump` (o do DISBOARD): divulga a toca e te dá {moeda}\n`/bump-status`: quando dá para o próximo\n"
        "`/bump-avisos`: liga ou desliga a menção quando o bump voltar",
    ),
    ("ℹ️ Outros", "`/ajuda`: este resumo, onde você estiver\n`/status`: vê se eu estou acordada"),
]
COMANDOS_RODAPE = "Me marque no chat se quiser conversar. Prometo responder. Talvez."

DUVIDAS_POST = "❓ Perguntas frequentes"
DUVIDAS_TITULO = "❓ Perguntas frequentes"
DUVIDAS_DESC = "Antes de abrir um post novo, dá uma olhadinha aqui. Eu já respondi isso umas mil vezes. 🙄💛"
DUVIDAS_CAMPOS = [
    (
        "Quando o servidor de Minecraft abre?",
        "Ele está sendo preparado. Quando tiver data, sai no canal de aviso, e os Kitsunes ficam sabendo primeiro.",
    ),
    ("É Java ou Bedrock?", "**Bedrock** (celular, console e Windows)."),
    ("Como ganho {moeda}?", "`/daily` todo dia, respondendo a pergunta do dia, pegando drops no chat e no seu aniversário."),
    ("Para que servem as {moeda}?", "Jogos, união de toca e, no futuro, coisas decorativas. Nada de vantagem no jogo."),
    ("Como subo de nível?", "Conversando! Cada mensagem rende XP, com um intervalo entre elas. Flood não adianta, espertinho."),
    ("Como mudo a cor do meu nome?", "No canal de cargos, no menu **Cores**."),
    ("Fui punido injustamente, e agora?", "Abra um tíquete e explique com calma. A staff revisa."),
    ("Como viro Kitsune?", "Dando boost no servidor. Está tudo no canal **seja-um-kitsune**."),
    ("Marquei meu aniversário errado!", "Abra um tíquete com uma prova da data (um documento com o resto tampado serve). Um admin corrige."),
    ("O que é o bump?", "É o `/bump` do DISBOARD: ele sobe a toca na lista pública de servidores. Dá para fazer a cada 2h, e quem faz ganha {moeda}."),
]

# (versão, título, novidades). O mais novo primeiro. Cada versão vira uma mensagem própria no changelog.
CHANGELOG = [
    (
        "1.1.0",
        "A toca acordou!",
        [
            "🎨 Painel de cargos novo, com banner e emojis em cada grupo",
            "❓ **Pergunta do dia** no chat, com {moeda} para quem responder",
            "💎 **Pérolas**: mensagens com muitas ⭐ vão para o mural",
            "🎁 **Drops** de {moeda} aparecem no chat. Seja rápido!",
            "🎂 `/aniversario`: parabéns e presente no seu dia",
            "🦊 **Sábado da Raposa**: drops em dobro aos sábados",
            "💬 Agora eu converso: respondo menção, bom dia, boa noite...",
            "⚖️ Kitsune não dá mais bônus de XP nem de daily. Aqui é sem pay-to-win",
        ],
    ),
]
CHANGELOG_TITULO = "🎞️ Versão {versao}: {titulo}"  # {versao} {titulo}

# ============================================================================ vida (engajamento)
QOTD_TITULO = "❓ Pergunta do dia"
QOTD_DESC = (
    "**{pergunta}**\n\nResponda no tópico abaixo e ganhe **{premio}**. Só vale a primeira resposta de cada um, tá? 😼"
)  # {pergunta} {premio}
QOTD_TOPICO = "Respostas de {data}"  # {data}
PERGUNTAS_DO_DIA = [
    "Se você pudesse morar em qualquer bioma do Minecraft, qual seria?",
    "Qual foi a construção mais bonita que você já fez?",
    "Creeper ou Enderman: qual é o mais irritante?",
    "Se você fosse um mob, qual seria?",
    "Qual comida do Minecraft você comeria na vida real?",
    "Qual o melhor encantamento de todos os tempos?",
    "Você é do time que constrói ou do time que explora?",
    "Qual música você mais escuta ultimamente?",
    "Se a toca tivesse uma estátua, de quem ou do quê seria?",
    "Qual o seu pet favorito no Minecraft?",
    "Qual jogo você jogaria para sempre, se só pudesse escolher um?",
    "Qual foi a coisa mais engraçada que já aconteceu com você num jogo?",
    "Se você pudesse adicionar um bloco novo ao Minecraft, qual seria?",
    "Café da manhã ideal: salgado ou doce?",
    "Qual o seu filme ou anime de conforto?",
    "Você prefere o dia ou a noite?",
    "Qual seria o nome da sua cidade no servidor?",
    "Nether ou End: onde você construiria sua casa?",
    "Qual foi a última coisa que te fez rir muito?",
    "Se você ganhasse 1 milhão de Caudas, o que faria?",
    "Qual habilidade inútil você tem orgulho de ter?",
    "Sobrevivência ou criativo?",
    "Qual o seu emoji favorito? (sem mentir)",
    "Que evento você queria ver na toca?",
    "Qual o lugar mais bonito que você já visitou (de verdade ou num jogo)?",
    "Gato, cachorro ou raposa? (pense bem antes de responder 😼)",
    "Qual a pior morte que você já teve no Minecraft?",
    "Qual o seu YouTuber ou streamer favorito?",
    "Se você tivesse uma loja no servidor, o que venderia?",
    "Qual o seu hobby fora dos jogos?",
    "Que superpoder você escolheria?",
    "Qual a sua estação do ano favorita?",
    "Picareta de netherite vale mesmo a pena?",
    "Qual seria o seu título de NPC no servidor?",
    "Você dá nome para seus pets e ferramentas no jogo?",
    "Qual a sua cor favorita? Ela está no painel de cores?",
    "Prefere jogar sozinho(a) ou em grupo?",
    "O que você mais gosta na toca até agora?",
    "Qual mob merecia ser mais forte?",
    "Se a Kiza ganhasse uma segunda cauda, de que cor seria?",
    "Qual é a sua construção dos sonhos?",
    "Qual música te lembra de alguém?",
    "Qual o seu doce favorito?",
    "Qual o seu maior medo no Minecraft? (fala a verdade: caverna escura)",
    "O que você nunca fez no Minecraft e quer fazer?",
]

PEROLAS_EMOJI = "⭐"
PEROLA_CABECALHO = "{emoji} **{n}** • {canal}"  # {emoji} {n} {canal}
PEROLA_LINK = "Ver mensagem original"

DROP_TITULO = "🎁 Caudas perdidas apareceram!"
DROP_TITULO_SABADO = "🦊 Sábado da Raposa: drop em dobro!"
DROP_DESC = "Tem **{valor}** jogadas no chão. Quem pegar primeiro leva. Rápido, antes que eu pegue! 😼"  # {valor}
DROP_BOTAO = "Pegar!"
DROP_PEGO = "🎉 {mencao} pegou **{valor}**! O resto... fica pra próxima. 😼"  # {mencao} {valor}
DROP_JA_PEGO = "🙄 Tarde demais, alguém foi mais rápido."
DROP_SO_MEMBROS = "🦊 Aceite as regras primeiro, aí você pode pegar drops!"
DROP_EXPIROU = "💨 Ninguém pegou... então eu peguei. Valeu! 🦊"

SABADO_ANUNCIO = (
    "🦊 **Sábado da Raposa!** Hoje os drops de {moeda} vêm em **dobro** e aparecem mais vezes. "
    "Fica de olho no chat. 😼"
)  # {moeda}

NIVER_DEFINIDO = (
    "🎂 Anotado: **{dia:02d}/{mes:02d}**. No seu dia eu apareço. Vê se não some! 😼\n"
    "⚠️ Só dá para marcar **uma vez**. Errou? Abra um tíquete com uma prova da data."
)  # {dia} {mes}
NIVER_JA_DEFINIDO = (
    "🙄 Seu aniversário já está marcado (**{dia:02d}/{mes:02d}**) e não muda assim, não. "
    "Se estiver errado, abra um tíquete com uma prova da data e um admin corrige."
)  # {dia} {mes}
NIVER_ADMIN_OK = "✅ Aniversário de {alvo} agora é **{dia:02d}/{mes:02d}**."  # {alvo} {dia} {mes}
NIVER_ADMIN_REMOVIDO = "✅ Tirei o aniversário de {alvo}. A pessoa pode marcar de novo uma vez."  # {alvo}
NIVER_DATA_INVALIDA = "🙄 Essa data não existe. Tenta de novo com um dia e um mês de verdade."
NIVER_SEU = "🎂 Seu aniversário está marcado para **{dia:02d}/{mes:02d}**."  # {dia} {mes}
NIVER_SEM = "🦊 Você ainda não marcou seu aniversário. Use `/aniversario definir`."
NIVER_LISTA_TITULO = "🎂 Próximos aniversários"
NIVER_LISTA_VAZIA = "🦊 Ninguém marcou aniversário ainda. Seja o primeiro!"
NIVER_PARABENS = (
    "🎂 **Hoje é dia de festa na toca!**\n{mencoes}\n\nParabéns! Ganhou **{premio}** de presente. "
    "E não, não vou cantar. ...tá bom, só um pouquinho. 🎶🦊"
)  # {mencoes} {premio}

BUMP_OBRIGADO = [
    "🚀 Valeu pelo bump, {mencao}! Ganhou **{premio}**. Próximo bump <t:{quando}:R>. 😼",
    "🚀 {mencao} deu bump! Assim a toca cresce. **+{premio}** pra você. Volto a chamar <t:{quando}:R>.",
    "🚀 Bump feito por {mencao}! Não esperava menos. **+{premio}**. Próximo <t:{quando}:R>. 🦊",
]  # {mencao} {premio} {quando}
BUMP_OBRIGADO_SEM_PREMIO = "🚀 Valeu pelo bump, {mencao}! Próximo bump <t:{quando}:R>. 🦊"  # {mencao} {quando}
BUMP_LEMBRETE = [
    "⏰ Já dá para dar **/bump** de novo! Quem chegar primeiro leva as Caudas. 😼",
    "⏰ Hora do **/bump**! A toca não se divulga sozinha, né? 🦊",
    "⏰ O **/bump** voltou! Bora, antes que eu fique entediada. 🙄",
]
BUMP_STATUS_TITULO = "🚀 Bump do DISBOARD"
BUMP_STATUS_PRONTO = "✅ **Dá para dar bump agora!** Use `/bump` (o do DISBOARD)."
BUMP_STATUS_ESPERA = "⏳ Próximo bump <t:{quando}:R> (<t:{quando}:t>)."  # {quando}
BUMP_STATUS_NUNCA = "🦊 Ainda não vi nenhum bump por aqui. Use `/bump` (o do DISBOARD) e eu começo a contar."
BUMP_STATUS_ULTIMO = "Último bump: {quem} <t:{quando}:R>"  # {quem} {quando}
BUMP_RANKING = "🏆 Quem mais deu bump"
BUMP_AVISOS_LIGADO = "🔔 Pronto! Vou te marcar quando der para dar bump de novo."
BUMP_AVISOS_DESLIGADO = "🔕 Beleza, não te marco mais nos avisos de bump."
BUMP_AVISOS_SEM_CARGO = "🦊 O cargo de avisos de bump ainda não foi configurado. Um admin faz isso em `/setup` → Cargos base."

CONVERSA_MENCAO = [
    "Me chamou? 👀",
    "Oi! Tava aqui contando minhas Caudas. Que foi? 🦊",
    "Presente! 🙋‍♀️ Fala.",
    "Hm? Só não me pede pra fazer lição de casa. 😼",
    "Oi oi! Se for pedir Caudas, a resposta é não. 😤",
    "Tô ocupada sendo fofa, mas pode falar. 💅",
    "Que foi, raposinha?",
    "Você me marcou só pra ver se eu respondia, né? 🙄 Respondi.",
    "Kiza na área! 🦊✨",
    "Se for fofoca, conta tudo. 👀",
]
CONVERSA_BOM_DIA = [
    "Bom dia! ☀️ Já tomou água hoje?",
    "Bom diaaa! 🦊 Hoje vai ser um bom dia, eu decidi.",
    "Bom dia! Acordou cedo ou ainda nem dormiu? 👀",
    "Bom dia, raposinha! ☀️",
]
CONVERSA_BOA_TARDE = [
    "Boa tarde! 🌤️ Bora fazer algo legal hoje?",
    "Boa tarde! Hora perfeita pra uma soneca... não que eu tire sonecas. 😴",
    "Boa tardeee! 🦊",
]
CONVERSA_BOA_NOITE = [
    "Boa noite! 🌙 Dorme bem e sonha com Caudas.",
    "Boa noite! Vai dormir mesmo ou vai ficar no celular? 👀",
    "Boa noite, raposinha! 🌙✨",
    "Boa noite! Eu fico aqui de guarda. Como sempre. 😌",
]
CONVERSA_OBRIGADO = [
    "De nada! 💛",
    "Imagina! Sou incrível, eu sei. 😌",
    "Por nada! Me paga em Caudas. Brincadeira. ...ou não. 😼",
]
PROVOCACOES = [
    "Cadê todo mundo? 😒 A toca tá tão quieta que dá pra ouvir um creeper respirando.",
    "Oi? Alô? Tem alguém aí ou eu tô falando sozinha de novo? 🦊",
    "Chat parado... perfeito pra alguém começar um assunto. Alguém. Qualquer um. 👀",
    "Se ninguém falar nada em 5 minutos, eu começo a cantar. Vocês foram avisados. 🎶",
    "Pergunta rápida pra acordar o chat: o que vocês estão fazendo agora?",
    "Tô entediada. Alguém conta uma coisa legal que aconteceu hoje? 🦊",
]
XP_NIVEL_UP_FRASES = [
    "🌟 {mencao} subiu para o **nível {nivel}**! Tá ficando famoso(a), hein? 😼",
    "🌟 **Nível {nivel}**, {mencao}! Eu sabia que você conseguia. (Mentira, tava em dúvida.)",
    "🌟 {mencao} chegou no **nível {nivel}**! Continua assim que eu fico orgulhosa. 🦊",
    "🌟 Olha só quem subiu para o **nível {nivel}**: {mencao}! 🎉",
    "🌟 {mencao} agora é **nível {nivel}**. Tá falando demais ou eu que tô contando errado? 👀",
]  # {mencao} {nivel}
