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
    "diversao": ("🎮 Diversão", "`/mines jogar` — joguinho por diversão\n`/casamento pedir` — forme uma dupla de toca"),
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
