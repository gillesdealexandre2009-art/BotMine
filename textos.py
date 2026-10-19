"""Textos fixos da Kiza.

A Kiza NÃO usa IA: a personalidade dela vive só aqui. Simpática, leve, em português
do Brasil, sem nenhum conteúdo romântico, sexual ou adulto (a comunidade tem menores).
Para mudar a voz do bot, edite este arquivo. Os {campos} são preenchidos pelo código.
"""

import random
import re
import unicodedata
from collections import deque

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
        "`/perfil` `/rank` `/ranking` — veja seu progresso\n`/daily` `/saldo` `/pagar` — suas {moeda}\n"
        "`/fidelidade` — seu caminho até Helper (bumps, boas-vindas, denúncias e publicações)",
    ),
    "diversao": (
        "🎮 Diversão",
        "`/mines jogar` — joguinho por diversão\n`/quiz` `/forca` — jogos de Minecraft que dão Caudas\n"
        "`/missoes` — 3 missões por dia\n`/rabisco-de-mim` — eu rabisco você\n"
        "`/casamento pedir` — forme uma dupla de toca\n`/aniversario definir` — ganhe parabéns e presente no seu dia\n`/minecraft vincular` — liga sua conta do jogo à do Discord",
    ),
    "suporte": (
        "🎫 Suporte",
        "Precisa de ajuda? Abra um ticket no canal de tickets.\nQuer virar Helper? Tíquete **🎖️ Solicitar rank**.",
    ),
    "helper": ("🛡️ Helper", "`/warn` `/avisos` `/caso` — avisos e histórico"),
    "staff": (
        "🔨 Staff",
        "`/timeout` `/remover-timeout` `/kick` `/limpar` `/remover-aviso` — moderação\nAtender tickets e ver logs\n"
        "`/fidelidade-ranking` — quem está mais perto de Helper • aprovar denúncias e pedidos de rank nos tíquetes\n"
        "`/resumo-semana` — números da semana • `/melhores-desenhos` — os desenhos com mais ⭐",
    ),
    "admin": (
        "👑 Admin",
        "`/setup` `/configuracao` `/ajustes` — configuração\n`/ban` `/unban` `/raid` `/canal-regra` `/economia-admin` `/backup`\n"
        "`/fidelidade-ajustar` — corrigir ou importar números da fidelidade",
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
        "Apoiar o servidor dá XP mais rápido, prioridade em anúncios e eventos e coisas decorativas. "
        "Poder dentro do jogo, nunca.",
    ),
    ("🗺️ Por onde começar", "1. Leia as {regras}\n2. Escolha seus cargos em {cargos}\n3. Dê um oi no {chat}. Eu não mordo. Muito."),
    ("🎫 Precisa de ajuda?", "Abra um tíquete em {tickets} ou pergunte em {duvidas}."),
]
INFOS_RODAPE = "Kiza Misuchi • guardiã da toca"

KITSUNE_TITULO = "🦊 Seja um Kitsune"
KITSUNE_DESC = (
    "Os **Kitsunes** são as raposas que ajudam a manter a toca de pé: a hospedagem do servidor é paga todo mês do bolso do dono, "
    "e cada Kitsune acende uma luz a mais. Em troca, você ganha um cantinho só seu, no Discord e no jogo. 😼\n\n"
    "Aperte **Virar Kitsune** aqui embaixo (ou use `/kitsune`), escolha o tempo e pague por **PIX**. "
    "Pagou, eu libero **na hora**."
)
KITSUNE_CAMPOS = [
    (
        "💳 Quanto custa",
        "**{kitsune_preco} por mês**, o tempo que você quiser:\n"
        "• 1 mês: {kitsune_1m}\n• 3 meses: {kitsune_3m}\n• 6 meses: {kitsune_6m}\n• 12 meses: {kitsune_12m}\n"
        "Renovou antes de acabar? O tempo novo **soma** ao que você ainda tem.",
    ),
    (
        "💬 No Discord",
        "• Cargo **Kitsune** e destaque na lista de membros\n"
        "• **{kitsune_xp} de XP** em toda mensagem (o XP é o mesmo do jogo)\n"
        "• Sua foto do Discord aparece quando você fala no chat do Minecraft",
    ),
    (
        "⛏️ No Minecraft (só visual e comodidade)",
        "• **Apelido e cor do nome**, inclusive os animados por nível\n"
        "• Temas do painel: **Sakura**, **Lunar** e **Espírito**\n"
        "• **Efeito de abate** à sua escolha\n"
        "• Clã: **tema e estilo da bandeira**\n"
        "• Abrir **várias cápsulas de pet de uma vez** e esconder os pets sem perder os bônus",
    ),
    (
        "🔗 Para o selo aparecer no jogo",
        "Ligue sua conta com `/minecraft vincular` (ou o botão em {login}). Se você comprar antes de ligar, o cargo vem agora e o selo chega "
        "quando você ligar.",
    ),
    (
        "⏳ E quando acaba?",
        "No fim do prazo o cargo e o selo saem sozinhos. Tudo o que você ganhou jogando continua com você, e dá para voltar quando quiser.",
    ),
    (
        "💖 Só quer ajudar?",
        "Doe qualquer valor com `/doar` e acompanhe as **metas** em {doacoes}. Doação não dá vantagem nenhuma: é só um obrigada.",
    ),
    (
        "⚖️ E pay-to-win?",
        "**Nunca no jogo.** Kitsune no Minecraft é só visual e comodidade: nada de dano, Caudas, itens ou vantagem em guerra, e nada fica "
        "exclusivo de quem paga além do enfeite. Boost do servidor não dá Kitsune.",
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
    (
        "🎮 Diversão",
        "`/mines jogar`: ache as casas seguras sem explodir\n`/quiz` e `/forca`: acerte e ganhe Caudas (tem limite por dia)\n"
        "`/missoes`: 3 missões por dia, com bônus se fizer todas\n`/rabisco-de-mim`: eu rabisco você com base no que sei de você\n"
        "`/casamento pedir`: forme uma dupla de toca",
    ),
    (
        "🚀 Bump",
        "`/bump` (o do DISBOARD): divulga a toca e te dá {moeda}\n`/bump` (o da Kiza): quando dá para o próximo e o ranking\n"
        "`/bump-avisos`: liga ou desliga a menção quando o bump voltar",
    ),
    (
        "🏅 Fidelidade",
        "`/fidelidade`: seus bumps, boas-vindas, denúncias aprovadas e publicações, e o que falta para virar Helper\n"
        "Bateu tudo? Abra um tíquete em **🎖️ Solicitar rank** em {tickets}",
    ),
    (
        "⛏️ Servidor de Minecraft",
        "`/minecraft vincular`: liga sua conta do jogo com o código da tela (também pelo botão em {login})\n"
        "`/minecraft conta`: mostra a conta ligada, seu nível e suas {moeda}\n"
        "`/online`: quem está jogando agora\n"
        "IP e porta em {ip}",
    ),
    (
        "💖 Apoio",
        "`/kitsune`: compre o selo Kitsune por PIX ({kitsune_preco} por mês)\n"
        "`/doar`: ajude a pagar a hospedagem com o valor que quiser\n"
        "`/convidar`: seu link para trazer amigos e ganhar {moeda}\n"
        "`/apoiar`: as metas do mês e os botões de apoio",
    ),
    ("ℹ️ Outros", "`/ajuda`: este resumo, onde você estiver\n`/status`: vê se eu estou acordada"),
]
COMANDOS_RODAPE = "Me marque no chat se quiser conversar. Prometo responder. Talvez."

DUVIDAS_POST = "❓ Perguntas frequentes"
DUVIDAS_TITULO = "❓ Perguntas frequentes"
DUVIDAS_DESC = "Antes de abrir um post novo, dá uma olhadinha aqui. Eu já respondi isso umas mil vezes. 🙄💛"
DUVIDAS_CAMPOS = [
    (
        "Como entro no servidor de Minecraft?",
        "O IP e a porta estão em {ip}. Na primeira vez a tela do jogo fica preta com um **código**: use `/minecraft vincular` "
        "(ou o botão em {login}). Isso liga sua conta e junta suas {moeda} e seu XP dos dois lugares.",
    ),
    ("É Java ou Bedrock?", "**Bedrock** (celular, console e Windows)."),
    ("Como ganho {moeda}?", "`/daily` todo dia, respondendo a pergunta do dia, pegando drops no chat e no seu aniversário."),
    ("Para que servem as {moeda}?", "Jogos, união de toca e, no futuro, coisas decorativas. Nada de vantagem no jogo."),
    (
        "Como subo de nível?",
        "Conversando aqui e jogando no servidor! Cada mensagem rende XP, com um intervalo entre elas, e o tempo jogando também. "
        "Flood não adianta, espertinho.",
    ),
    (
        "Como funciona o ranking?",
        "Seu nível define seu **rank**:\n🌱 Filhote (0) → 🦊 Raposinha (5) → 🍂 Raposa Andarilha (10) → "
        "🌙 Raposa Lunar (15) → ✨ Raposa de Nove Caudas (20)\nVeja o seu com `/rank` e o top 10 com `/ranking`.",
    ),
    (
        "O que ganho subindo de nível?",
        "A cada nível: **nível × 25 {moeda}** (nível 10 = 250). Alguns níveis liberam cores:\n"
        "🍉 Melancia (5) · 🔮 Nebulosa (10) · 🌙 Moon (15) · ☀️ Sun (20). As outras cores são livres desde o começo.",
    ),
    (
        "Tem como ganhar XP mais rápido?",
        "Sim! Quem dá **/bump** ganha **1,5x XP por 2h**, e Kitsunes ganham **2x XP** sempre. "
        "Os bônus não somam: vale o maior.",
    ),
    (
        "Como ganho o cargo Sugestor?",
        "Mandando uma **sugestão útil** que o dono aprove ou use no servidor ou no jogo. Aí o cargo {sugestor} é seu. 🌟",
    ),
    ("Como mudo a cor do meu nome?", "No canal de cargos, no menu **Cores**."),
    ("Fui punido injustamente, e agora?", "Abra um tíquete e explique com calma. A staff revisa."),
    (
        "Como viro Kitsune?",
        "Comprando por PIX com `/kitsune` (ou pelo botão do canal **seja-um-kitsune**): {kitsune_preco} por mês, pelo tempo que você quiser. "
        "O selo é liberado **dentro do jogo** e o cargo no Discord vem sozinho depois que você liga sua conta com `/minecraft vincular`. "
        "Boost não dá Kitsune. Também dá para ganhar o selo por brinde ou por tempo limitado, a critério do dono.",
    ),
    (
        "Como ajudo o servidor?",
        "Doando qualquer valor por PIX com `/doar` (a partir de {doacao_min}) ou comprando Kitsune. No canal de doações tem as **metas** do mês e o mural de quem ajudou. "
        "Doação não dá vantagem no jogo: é só para a toca continuar de pé. 💖",
    ),
    ("Marquei meu aniversário errado!", "Abra um tíquete com uma prova da data (um documento com o resto tampado serve). Um admin corrige."),
    ("O que é o bump?", "É o `/bump` do DISBOARD: ele sobe a toca na lista pública de servidores. Dá para fazer a cada 2h, e quem faz ganha {moeda}."),
    (
        "Como viro Helper?",
        "Mostrando que você cuida da toca: bumps, boas-vindas a quem chega, denúncias aprovadas e publicações. "
        "Veja o seu progresso com `/fidelidade` e, quando bater tudo, abra um tíquete em **🎖️ Solicitar rank**.",
    ),
]

# (versão, título, novidades). O mais novo primeiro. Cada versão vira uma mensagem própria no changelog.
CHANGELOG = [
    (
        "1.12.0",
        "Convide um amigo",
        [
            "🦊 `/convidar` te dá um **link pessoal**: quando quem entrar por ele ficar um tempo na toca, ligar a conta do Minecraft e chegar ao nível 3, vocês dois ganham {moeda}",
            "🏆 `/convites ranking` mostra quem mais trouxe amigos",
            "📊 Canal de **placares** que se atualiza sozinho: mais tempo em call, maior jogada seguida e mais tempo de jogo",
            "🟢 `/online` mostra quem está jogando Minecraft agora",
            "🦊 **Mimos Kitsune** (só estilo, nada de vantagem): a **Toca Kitsune** com chat e sala de voz só sua (`/sala nome`), votações só para Kitsunes e o **mural dos Kitsunes**",
        ],
    ),
    (
        "1.11.0",
        "Apoie a toca por PIX",
        [
            "🦊 Dá para **comprar Kitsune** por PIX com `/kitsune`: R$ 15 por mês, pelo tempo que você escolher (1, 3, 6 ou 12 meses). Pagou, o selo e o cargo chegam sozinhos",
            "💖 `/doar`: ajude a pagar a hospedagem com o valor que quiser, a partir de R$ 5. Tem mural de apoiadores e dá para doar anonimamente",
            "🎯 **Metas** de arrecadação com barra de progresso no canal de doações. A staff cria com `/meta`",
            "🚫 **Boost não dá mais Kitsune**: o selo agora é só por compra, brinde ou tempo limitado",
        ],
    ),
    (
        "1.10.0",
        "Ponte com o servidor",
        [
            "🔗 `/minecraft vincular` e `/minecraft conta`: ligue sua conta do jogo à do Discord (ou use o botão do canal de login)",
            "🔐 Painel de **login** com botões para ligar sua conta (o canal fica só com o painel)",
            "💬 **Ponte de chat**: o que acontece no servidor (mensagens, quem entra e sai, mortes e sequências de abates) aparece aqui (as mensagens saem como se o jogador estivesse falando, com a foto do Discord para os Kitsunes), e o que você escreve no canal vai para o jogo",
            "📖 **Histórico**: clãs que nascem e se despedem, guerras que começam e como terminam",
            "🚪 Painel de **IP e porta** sempre atualizado, com quem está jogando agora",
            "🦊 {moeda} e XP viram **um só** nos dois lugares. Subir de nível ficou mais difícil: cada mensagem rende menos XP",
            "🟢 Um canal mostra quantas pessoas estão jogando agora, atualizado na hora",
            "🦊 O **Kitsune** passa a ser controlado de dentro do jogo: o selo (com ou sem prazo) vira o cargo no Discord sozinho, e o cargo volta ao que o jogo manda se mexerem nele na mão. Staff: `/minecraft kitsune` mostra quem é quem",
            "🌟 Cargo novo: {sugestor}, para quem sugeriu algo útil que foi aprovado ou usado pelo dono",
            "🎙️ **Fidelidade** agora conta o **tempo em call**: para pedir Helper são precisos 48 h (só rende com 2 pessoas ou mais ligadas e sem estar ensurdecido)",
        ],
    ),
    (
        "1.9.0",
        "A Kiza tem humor (e jogos!)",
        [
            "😴 Meu **humor muda**: com sono de madrugada, animada no fim de semana, e emburrada com quem for grosso comigo",
            "🧠 Eu **lembro de você** e às vezes puxo assunto sobre o que você me contou",
            "💬 Também **reajo com emoji** nas suas mensagens, sem responder (parabéns, saudade, kkkk...)",
            "🎮 `/quiz` e `/forca`: jogos de Minecraft que dão {moeda} (com limite por dia)",
            "📋 `/missoes`: 3 missões por dia, com bônus de {moeda} se completar todas",
            "🎨 `/rabisco-de-mim`: eu rabisco você! E nos meus desenhos dá pra votar com ⭐",
            "📚 Agora eu sei explicar regras, {moeda}, ranks, cores e comandos sem inventar",
            "🦊 **Kiza:** \"se eu tô emburrada, é só pedir desculpa. eu perdoo rápido. quase sempre.\"",
        ],
    ),
    (
        "1.8.0",
        "Kiza mais esperta e mais humana",
        [
            "🧠 Voltei a **conversar de verdade**, com um cérebro novo (e sem custo pra toca)",
            "💬 Aprendi **mais de 150 frases novas**: quando eu não tiver a cabeça no lugar, respondo conforme o assunto (comida, sono, Minecraft, tchau, elogio...)",
            "🎨 **Desenhos bem melhores**: agora tenho rosto, orelhas, cauda e jaqueta de verdade (aquela bolinha flutuando acabou)",
            "👨‍👩‍👧 Dá pra pedir desenho com **várias pessoas**: ninguém mais fica em cima do outro, e cada um tem o seu visual",
            "🦊 **Kiza:** \"minha mãe tem nove caudas. eu tenho uma. mas eu tenho estilo.\"",
        ],
    ),
    (
        "1.7.1",
        "Ajustes da Kiza",
        [
            "🎨 O desenho que eu faço sozinha agora sai **a cada 10 dias** (e eu não esqueço quando reinicio)",
            "📸 Se alguém pedir um desenho do Kope, eu só tenho um: o retrato oficial",
            "🦊 **Kiza:** \"o retrato oficial é fiel. não aceito reclamação.\"",
        ],
    ),
    (
        "1.7.0",
        "Figurinhas da Kiza",
        [
            "🃏 `/figurinha abrir`: abra um pacotinho e ganhe uma figurinha (1 **grátis por dia**; depois é só com {moeda})",
            "📒 `/figurinha album`: veja quais você já tem e quais faltam, e `/figurinha ver` para mostrar uma carta",
            "✨ Raridades: ⚪ Comum e 🔵 Rara por enquanto. As Épicas e Lendárias estão vindo",
            "🦊 **Kiza:** \"eu tô numa figurinha dormindo e vocês acharam fofo. eu só tava com sono mesmo.\"",
        ],
    ),
    (
        "1.6.0",
        "A Kiza tem vida própria",
        [
            "🎨 Todo dia eu posto um desenho que eu mesma fiz no canal de mídias (às vezes com a minha mãe, que tem nove caudas!)",
            "📸 De vez em quando eu lembro a galera de postar o servidor nas redes e colar o link nas publicações: cada link vale +1 no seu `/fidelidade`",
            "📖 Todo mês tem um capítulo novo da minha lenda, com os amigos novos que eu fiz na toca",
            "🧠 Fiquei mais esperta: ajudo com Minecraft de verdade e rabisco o que você pedir (`kiza desenha...`)",
            "🦊 **Kiza:** \"pra quem perguntou: sim, eu sou uma raposa de verdade. mentira. sou uma menina com orelha de raposa, "
            "tá? meu desenho na verdade ficou parecendo um gato laranja kkkk\"",
        ],
    ),
    (
        "1.5.0",
        "A Kiza ganhou um cérebro",
        [
            "🧠 **Eu converso de verdade agora!** Me marca, responde uma mensagem minha ou fala meu nome no chat",
            "💭 Eu lembro do que você me conta e entendo o contexto da conversa (sim, eu presto atenção. às vezes.)",
            "🔎 `/memoria ver` mostra o que eu lembro de você e `/memoria esquecer` apaga tudo",
            "😭 **Kiza:** \"GENTE EU CONSIGO FALAR!! sem frase pronta, sem nada, tô tão feliz que vou chorar. "
            "pode me perguntar qualquer coisa... menos 1+1, que isso n é coisa de raposa kkk\"",
        ],
    ),
    (
        "1.4.0",
        "Caminho até Helper",
        [
            "🏅 `/fidelidade`: eu conto seus **bumps**, **boas-vindas**, **denúncias aprovadas** e **publicações** (e pede 1 mês de toca)",
            "🎖️ Tíquete novo **Solicitar rank**: mostra seu quadro e a staff pode te promover a Helper ali mesmo",
            "🚪 Cargo **Porteiro**: a equipe é chamada nas boas-vindas para receber quem chega",
            "🔔 Quem entra ganha uma marcação rapidinha no canal de verificação, para não ficar perdido(a)",
        ],
    ),
    (
        "1.3.0",
        "Bump turbinado",
        [
            "🚀 `/bump` da Kiza: mostra quando dá para bumpar, o prêmio e o ranking, com atalho direto pro DISBOARD",
            "🖼️ Chamada e agradecimento de bump com banner e várias falas novas",
        ],
    ),
    (
        "1.2.0",
        "Ranks, cores e bump",
        [
            "🏆 **Ranks**: 🌱 Filhote, 🦊 Raposinha, 🍂 Raposa Andarilha, 🌙 Raposa Lunar e ✨ Raposa de Nove Caudas",
            "🎁 Subir de nível agora dá {moeda} (nível × 25)",
            "🎨 Cores novas se desbloqueiam com nível: Melancia (5), Nebulosa (10), Moon (15) e Sun (20)",
            "🚀 Lembrete de **/bump**: quem bumpa ganha {moeda} e **1,5x XP por 2h**",
            "🔔 `/bump-avisos` ou o botão no canal de cargos: eu te marco quando o bump voltar",
            "⚡ Kitsunes ganham **2x XP**",
            "🎂 O aniversário agora só pode ser marcado uma vez (errou? tíquete com prova)",
        ],
    ),
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
        ],
    ),
]
# Changelog do Minecraft (addon), publicado no mesmo canal do da Kiza pelo botão Changelog do /setup. Mais novo primeiro.
# (chave única, título, texto pronto). O texto NÃO passa por .format (pode ter chaves). Espelha addon/CHANGELOG.md.
CHANGELOG_MC = [
    (
        "mc_2026_10_18_proximidade",
        "🎮 Minecraft · 18/10/2026: Chat de voz por proximidade",
        "Olá, pessoal! 🎧 Agora dá para conversar com quem está perto de você, direto na call do Discord:\n\n"
        "• **Entre na sala \"🎧 Entrada\"** do Discord e jogue normalmente: quem estiver a até **48 blocos** de você cai na mesma sala de voz, "
        "e quando vocês se afastam (uns **64 blocos**) cada um volta para a sua.\n"
        "• Precisa estar com a **conta ligada** (`/minecraft vincular`). Não quer ser movido? Use `/proximidade pausar`.\n"
        "• **Lugares especiais têm chamada própria**: todos os minigames ficam juntos numa sala, o Intervalo em outra, a dimensão secreta em outra, e assim por diante (sem olhar a distância). Nether e End funcionam por proximidade, igual ao mundo normal.\n"
        "• Não muda o volume de cada pessoa (o Discord não permite): é por **grupos de sala**.",
    ),
    (
        "mc_2026_10_18_conta_unica",
        "🎮 Minecraft · 18/10/2026: Conta única, Kitsune por PIX, mais privacidade e as Eras a caminho",
        "Olá, pessoal! 🦊 Foi uma semana grande na toca. Aqui vai o que mudou:\n\n"
        "**🔗 Discord e Minecraft viraram um só**\n"
        "• **Ligue sua conta** com `/minecraft vincular` (o código aparece na tela quando você entra, ou pelo botão no canal de login).\n"
        "• **Caudas e XP são os mesmos** no jogo e no Discord.\n"
        "• O **chat do jogo aparece no Discord**, e o que se escreve lá vai para o jogo. Entradas, saídas, mortes e sequências de abates também.\n"
        "• O canal de **ip-e-porta** mostra quem está jogando agora, e o contador de online se atualiza sozinho.\n"
        "• Reiniciar o servidor **não duplica nem perde** Caudas e XP.\n\n"
        "**🦊 Kitsune por PIX (e o boost não vale mais)**\n"
        "• O selo **Kitsune** agora se compra pelo Discord com `/kitsune`: **R$ 15 por mês**, pelo tempo que você quiser (1, 3, 6 ou 12 meses). O selo chega no jogo na hora.\n"
        "• **Boost não dá mais Kitsune.**\n"
        "• Quer só ajudar a pagar a hospedagem? Tem `/doar`, **metas** com barra de progresso e um mural de apoiadores. Doação não dá vantagem no jogo.\n\n"
        "**🕶️ Mais privacidade**\n"
        "• **Bases e bandeiras dos clãs ficam escondidas.** Só aparecem para o próprio clã e, quando uma guerra começa, para quem está nela.\n"
        "• **Mapas e coordenadas desligados** para ninguém achar outro jogador sem ele saber. (A staff continua com os mapas.)\n\n"
        "**🪂 Ajustes**\n"
        "• O **RTP** não deixa mais você morrer de queda: o pouso só vale com chão firme de verdade.\n"
        "• Várias correções no Intervalo, nos minigames e no mistério da Vulpus.\n\n"
        "**🌗 A caminho: as Eras**\n"
        "Vem aí uma **temporada de 20 semanas**, com uma Era por semana. Cada Era muda a neblina, as partículas e os sons, traz **vantagens e custos** próprios "
        "e um **acontecimento diário** em horário fixo (duas vezes por dia). Você acompanha tudo em **Menu → Misc → Era da semana**. "
        "Começa quando o dono apertar o botão. 👀\n\n"
        "Obrigada por jogar com a gente! 🧡",
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

BUMP_OBRIGADO_TITULOS = [
    "🚀 Bump feito!",
    "🚀 A toca subiu!",
    "🚀 Lá vamos nós pro topo!",
    "🚀 Bumpou, bumpou!",
    "🚀 Missão cumprida!",
]
BUMP_OBRIGADO = [
    "Valeu pelo bump, {mencao}! Ganhou **{premio}** e **{mult}x XP** por 2h. 😼",
    "{mencao} deu bump! Assim a toca cresce. **+{premio}** e **{mult}x XP** pra você. 🦊",
    "Bump feito por {mencao}! Não esperava menos. **+{premio}** e XP turbinado por 2h. ✨",
    "Olha só, {mencao} lembrou da gente! **+{premio}** na conta e **{mult}x XP**. Tô orgulhosa. 🧡",
    "{mencao} chegou primeiro! **+{premio}** e **{mult}x XP**. Os outros que lutem. 😤",
    "Ufa, {mencao} salvou o dia! O Vulpus subiu na lista. **+{premio}** e **{mult}x XP** por 2h. 🍂",
    "Bumpzinho de respeito, {mencao}! Toma **{premio}** e vai farmar XP com **{mult}x**. 🦊💨",
]  # {mencao} {premio} {mult}
BUMP_OBRIGADO_SEM_PREMIO = [
    "Valeu pelo bump, {mencao}! **{mult}x XP** por 2h. 🦊",
    "{mencao} deu bump! A toca agradece, e o seu XP também (**{mult}x** por 2h). 😼",
]  # {mencao} {mult}
BUMP_OBRIGADO_PROXIMO = "⏳ Volto a chamar <t:{quando}:R>."  # {quando}
BUMP_LEMBRETE_TITULOS = [
    "⏰ Hora do bump!",
    "⏰ O bump voltou!",
    "⏰ Bump liberado!",
    "⏰ Alguém aí?",
    "⏰ Chamando todas as raposas!",
]
BUMP_LEMBRETE = [
    "Já dá para dar {cmd} de novo! Quem chegar primeiro leva as Caudas. 😼",
    "A toca não se divulga sozinha, né? Clica em {cmd} e me deixa feliz. 🦊",
    "O {cmd} voltou! Bora, antes que eu fique entediada. 🙄",
    "Psiu... {cmd} liberado. Prêmio em Caudas e XP turbinado pra quem for rápido. ✨",
    "Duas horas sem bump é muito tempo pra uma raposa. Usa o {cmd}, vai! 🥺",
    "Se ninguém der {cmd} em 5 minutos, eu começo a cantar. Vocês foram avisados. 🎶",
    "Novas raposas estão procurando uma toca. Ajuda elas a achar a gente com {cmd}! 🧡",
]  # {cmd}
BUMP_STATUS_TITULO = "🚀 Bump do Vulpus"
BUMP_STATUS_PRONTO = "✅ **Dá para dar bump agora!** Clique aqui: {cmd}"  # {cmd}
BUMP_STATUS_ESPERA = "⏳ Próximo bump <t:{quando}:R> (<t:{quando}:t>)."  # {quando}
BUMP_STATUS_NUNCA = "🦊 Ainda não vi nenhum bump por aqui. Use {cmd} e eu começo a contar."  # {cmd}
BUMP_STATUS_PREMIO = "🎁 Quem bumpa ganha **{premio}** e **{mult}x XP por 2h**."  # {premio} {mult}
BUMP_STATUS_AVISOS = "🔔 Quer ser marcado(a) quando voltar? `/bump-avisos`"
BUMP_STATUS_ULTIMO = "Último bump: {quem} <t:{quando}:R>"  # {quem} {quando}
BUMP_RANKING = "🏆 Quem mais deu bump"
BUMP_AVISOS_LIGADO = "🔔 Pronto! Vou te marcar quando der para dar bump de novo."
BUMP_AVISOS_DESLIGADO = "🔕 Beleza, não te marco mais nos avisos de bump."
BUMP_AVISOS_SEM_CARGO = "🦊 O cargo de avisos de bump ainda não foi configurado. Um admin faz isso em `/setup` → Cargos base."

CONVERSA_MENCAO = [
    "me chamou? 👀",
    "oi! tava aqui contando minhas caudas. que foi? 🦊",
    "presente! fala",
    "hm? só não me pede pra fazer lição de casa 😼",
    "oi oi! se for pedir caudas a resposta é não 😤",
    "pode falar, tô ouvindo",
    "que foi?",
    "vc me marcou só pra ver se eu respondia, né? 🙄 respondi",
    "kiza na área 🦊",
    "se for fofoca, conta tudo 👀",
    "oi?",
    "tava quase dormindo aqui, mas fala",
    "hm, apareci. o que vc quer?",
    "oiê, tava distraída aqui, fala de novo",
    "ahn? me chamaram?",
    "eita, apareci do nada kkk fala",
    "tô aqui tô aqui, pode falar",
    "diz aí",
    "opa, que foi?",
    "falaa, tava vendo uns vídeos aqui",
    "oi, tava pensando na vida. e aí?",
    "hmm? sim?",
    "chegou chegando, hein? fala",
    "aaah oi 🦊",
    "pode mandar, tô sem nada pra fazer mesmo",
    "só um segundo, tava terminando um lanchinho. pronto, fala",
    "me achou! o que foi?",
    "oi gente boa, em que posso... não, para, eu n sou atendimento kkk fala",
]
CONVERSA_BOM_DIA = [
    "bom dia! ☀️ já tomou água hoje?",
    "bom diaaa! 🦊 hoje vai ser um bom dia, eu decidi",
    "bom dia! acordou cedo ou ainda nem dormiu? 👀",
    "bom dia! ainda tô com sono, mas bom dia",
    "bom dia! já comeu alguma coisa? n vale só café",
    "bom diaa ☀️ bora fazer alguma coisa de útil hoje, ou n",
    "dia! (tô tentando acordar ainda)",
    "bom dia! sonhou com algo estranho? eu sonhei com um creeper dançando",
]
CONVERSA_BOA_TARDE = [
    "boa tarde! 🌤️ bora fazer algo legal hoje?",
    "boa tarde! hora perfeita pra uma soneca... não que eu tire sonecas 😴",
    "boa tardeee! 🦊",
    "boa tarde! já almoçou? me conta o que foi",
    "boa tarde! o dia tá passando rápido ou devagar aí?",
    "boa tarde~ tô de boa aqui, e vc?",
    "boa tarde! se tiver tédio, o chat tá aqui pra isso",
]
CONVERSA_BOA_NOITE = [
    "boa noite! 🌙 dorme bem e sonha com caudas",
    "boa noite! vai dormir mesmo ou vai ficar no celular? 👀",
    "boa noite! 🌙✨",
    "boa noite! eu fico aqui de guarda. como sempre 😌",
    "boa noite, descansa! amanhã tem mais",
    "boa noite! n fica até tarde demais, hein",
    "boa noite 🌙 se der insônia vem aqui conversar",
    "boa noite! escova os dentes antes, viu",
]
CONVERSA_OBRIGADO = [
    "de nada! 💛",
    "imagina! sou incrível, eu sei 😌",
    "por nada! me paga em caudas. brincadeira. ...ou não 😼",
    "magina, tô aqui pra isso",
    "de nada, qualquer coisa chama",
    "disponha! mas n conta pra ninguém que eu sou boazinha",
    "ahh que isso, foi nada 🥺",
    "valeu vc! fiz com carinho",
]

CONVERSA_COMO_VAI = [
    "tô bem! um pouco com sono, mas bem. e vc?",
    "de boa! tava contando minhas caudas aqui. e vc, como tá?",
    "tô ótima, acabei de comer um lanchinho 😌 e vc?",
    "mais ou menos, tô com preguiça hoje kkk e vc?",
    "tô bem sim! e vc, como foi seu dia?",
    "tô tranquila! e vc, tá tudo certo?",
    "tô bem, obrigada por perguntar 🥺 e vc?",
    "na paz! sem fazer nada de útil, como sempre. e vc?",
]
CONVERSA_QUEM_E_VOCE = [
    "eu sou a kiza! a mascote da toca. sou um bot, mas n vira robô comigo não kkk",
    "kiza misuchi, 18 anos, tô aqui pra bater papo e cuidar da toca 🦊",
    "sou a kiza, a raposa da casa. n sou humana, mas converso igual",
    "a kiza! meio kitsune, meio preguiçosa 😌",
    "sou a mascote do vulpus! e sim, sou um bot, mas tenho personalidade tá",
]
CONVERSA_TCHAU = [
    "tchau! volta logo 🦊",
    "até mais! n some não",
    "fui também! tchauu",
    "tchau, se cuida! 💛",
    "até depois! me conta como foi quando voltar",
    "tchauzinho! eu fico aqui, como sempre",
    "vai com calma, até mais!",
]
CONVERSA_ELOGIO = [
    "ahh para, vou ficar sem graça 🥺",
    "ai, obrigada! vc que é legal",
    "kkk valeu, assim eu coro",
    "ownt, obrigada! me deixou feliz hoje",
    "para com isso que eu n sei lidar com elogio kkk",
    "obrigada! vc tbm é gente boa",
    "ah, que isso... 🙈 valeu mesmo",
    "kkk assim vc me deixa convencida, hein",
]
CONVERSA_OFENSA = [
    "eita, n precisa disso 😤",
    "kkk olha o respeito, hein",
    "ai que maldade comigo 😭",
    "hm, tô fingindo que n ouvi isso 😒",
    "isso doeu, mas eu sobrevivo",
    "nossa, quanta energia ruim. bora respirar",
    "tá bom, tá bom. n vou brigar com vc",
    "ok, anotei. na toca a gente se trata com carinho, tá? 😤",
]
CONVERSA_AMOR = [
    "eita, assunto errado hein 😤 sou só a mascote",
    "kkk n vem com isso n, aqui é papo de amigo",
    "ahh, valeu, mas eu só quero ser amiga de vc, tá? 💛",
    "vamos mudar de assunto? me conta do seu dia",
    "hm, n é bem por aí. me fala de outra coisa 😅",
]
CONVERSA_PIADA = [
    "por que o creeper n tem amigos? porque ele explode toda vez que se aproxima 💥",
    "sabe qual o bloco mais educado? o de terra. sempre diz 'de nada'... tá, essa foi péssima",
    "o que o zumbi falou pro outro? 'tô morto de saudade'",
    "por que o esqueleto n vai pra festa? porque n tem corpo pra isso kkk",
    "minha piada favorita é a lista de coisas que eu prometi fazer e n fiz",
    "o aldeão foi no médico e só fez 'hmmm'. o médico: 'tô vendo, sintoma de aldeão'",
]
CONVERSA_TEDIO = [
    "tédio, hein? bora conversar então. o que vc tá jogando?",
    "tô igual, sem nada pra fazer. alguém aí sugere algo?",
    "que tal construir alguma coisa no minecraft? sempre ajuda",
    "kkk tédio é o pior. bora puxar um assunto aleatório?",
    "vai ver uns vídeos, ou então conversa aqui comigo mesmo",
    "se ficou sem ideias, tenta fazer uma farm nova. n resolve o tédio, mas distrai",
]
CONVERSA_COMIDA = [
    "comida? tô ouvindo 👀 me conta o que é",
    "ai, agora fiquei com fome também 😭",
    "lanchinho é a melhor invenção do mundo, eu acho",
    "me manda uma pizza aí (n manda, eu sou um bot)",
    "adoro comida, mas n consigo comer. vive por mim?",
]
CONVERSA_SONO = [
    "ai, dormir é a melhor coisa, nem fala 😴",
    "tô com sono tbm kkk bora dormir cedo hoje?",
    "descansa sim, é importante! eu n resisto a uma soneca",
    "dorme bem então, amanhã vc se sente melhor",
]
CONVERSA_MINECRAFT = [
    "minecraft é vida! o que vc tá construindo?",
    "ai, adoro falar de minecraft. conta mais!",
    "faz tempo que n construo nada novo... me inspira aí",
    "o que vc mais gosta de fazer lá? construir, explorar, farmar?",
    "se tiver dúvida de construção ou redstone, pode perguntar, eu ajudo no que dá",
]
CONVERSA_CAUDAS = [
    "caudas são minha moeda favorita, mas n peço pra ninguém n 😤",
    "caudas? tô contando as minhas aqui, n atrapalha kkk",
    "ixi, falar de caudas me deixa viciada 😼",
    "caudas se ganha jogando, conversando, e com um pouco de sorte no drop",
]
CONVERSA_OI = [
    "oi! tudo bem?",
    "oiii 🦊 como vc tá?",
    "ei, oi! faz tempo que n te via",
    "olá! o que manda?",
    "e aí! tá tudo bem?",
    "oi oi, tava com saudade do chat kkk",
    "opa, oi! o que vc anda fazendo?",
    "salve! me conta uma novidade",
]
CONVERSA_DUVIDA = [
    "hm, essa eu n sei responder direito agora... pergunta no chat que alguém sabe 🦊",
    "boa pergunta! mas deixa eu pensar, tô com sono kkk",
    "eita, essa me pegou. tenta de novo mais tarde?",
    "n sei bem, mas me chama depois que eu tento descobrir",
    "n tenho certeza, n quero inventar nada. pergunta pra staff ou pro pessoal do chat",
    "ixi, esqueci. tô com a cabeça cheia de caudas hoje 😅",
]
CONVERSA_TEMAS = [
    (re.compile(r"\b(obrigad|valeu|vlw|brigadao)"), CONVERSA_OBRIGADO),
    (re.compile(r"\b(tchau|ate mais|ate logo|fui|vou nessa|xau)\b"), CONVERSA_TCHAU),
    (re.compile(r"\b(como (vai|voce esta|vc ta|vc esta|voce ta|ta)|tudo bem|td bem|ta bem)"), CONVERSA_COMO_VAI),
    (re.compile(r"\b(quem (e|eh) (voce|vc)|o que (voce|vc) (e|eh|faz)|qual (seu|o seu) nome)"), CONVERSA_QUEM_E_VOCE),
    (re.compile(r"\b(te amo|casa comigo|namora|namorar|gata|gostosa|beijo)"), CONVERSA_AMOR),
    (re.compile(r"\b(burra|idiota|lixo|feia|chata|inutil|odeio|cala a boca|fdp|besta)"), CONVERSA_OFENSA),
    (re.compile(r"\b(linda|fofa|lindinha|inteligente|legal|incrivel|perfeita|melhor|amo (voce|vc))"), CONVERSA_ELOGIO),
    (re.compile(r"\b(piada|conta uma|me faz rir|engracad)"), CONVERSA_PIADA),
    (re.compile(r"\b(tedio|entediad|sem nada pra fazer|nada pra fazer)"), CONVERSA_TEDIO),
    (re.compile(r"\b(fome|comida|pizza|lanche|hamburguer|almoco|jantar)"), CONVERSA_COMIDA),
    (re.compile(r"\b(sono|dormir|soneca|cansad)"), CONVERSA_SONO),
    (re.compile(r"\b(minecraft|mine|redstone|creeper|construir|farm|survival)"), CONVERSA_MINECRAFT),
    (re.compile(r"\b(cauda|caudas|moeda|dinheiro)"), CONVERSA_CAUDAS),
    (re.compile(r"^(oi+|ola|eae|e ai|opa|salve|hey|hello|fala)\b"), CONVERSA_OI),
]


_RECENTES: deque[str] = deque(maxlen=10)


def _escolher(frases: list[str]) -> str:
    """Sorteia sem repetir as últimas frases usadas (se der): a Kiza não diz a mesma coisa duas vezes seguidas."""
    candidatas = [f for f in frases if f not in _RECENTES] or frases
    escolhida = random.choice(candidatas)
    _RECENTES.append(escolhida)
    return escolhida


def resposta_fixa(texto: str) -> str:
    """Resposta pronta da Kiza que combina com a mensagem (sem IA): por tema, ou uma frase genérica."""
    limpo = unicodedata.normalize("NFKD", texto.lower())
    limpo = "".join(c for c in limpo if not unicodedata.combining(c))
    limpo = re.sub(r"<@!?&?\d+>|@\S+|\bkiza\b", " ", limpo)
    limpo = re.sub(r"\s+", " ", limpo).strip()
    for padrao, frases in CONVERSA_TEMAS:
        if padrao.search(limpo):
            return _escolher(frases)
    return _escolher(CONVERSA_DUVIDA if "?" in texto else CONVERSA_MENCAO)

RABISCO_FALHOU = [
    "ai, o rabisco empacou aqui 😭 me pede de novo?",
    "eita, a caneta secou! tenta pedir o desenho de novo, prometo que dessa vez vai 🦊",
    "não consegui rabiscar dessa vez kkk pede de novo pra mim?",
]
RABISCO_SEM_PERMISSAO = [
    "rabisquei, mas não consigo anexar aqui 😭 alguém da staff me dá a permissão de Anexar Arquivos nesse canal?",
]
PROVOCACOES = [
    "Cadê todo mundo? 😒 A toca tá tão quieta que dá pra ouvir um creeper respirando.",
    "Oi? Alô? Tem alguém aí ou eu tô falando sozinha de novo? 🦊",
    "Chat parado... perfeito pra alguém começar um assunto. Alguém. Qualquer um. 👀",
    "Se ninguém falar nada em 5 minutos, eu começo a cantar. Vocês foram avisados. 🎶",
    "Pergunta rápida pra acordar o chat: o que vocês estão fazendo agora?",
    "Tô entediada. Alguém conta uma coisa legal que aconteceu hoje? 🦊",
]
XP_NIVEL_PREMIO = "🎁 Ganhou **{premio}**!"  # {premio}
XP_NOVO_RANK = "🏆 Novo rank: {emoji} **{rank}**!"  # {emoji} {rank}
XP_COR_DESBLOQUEADA = "🎨 Cor desbloqueada: **{cores}**! Pegue no canal de cargos."  # {cores}
RANK_BONUS = "⚡ Bônus de XP ativo: {mult}x"  # {mult}
CARGOS_TRAVA = "🔒 nível {nivel}"  # {nivel}
CARGOS_CORES_RODAPE = "🔒 Algumas cores se desbloqueiam subindo de nível. Veja o seu com /rank."
CARGOS_COR_BLOQUEADA = (
    "🔒 **{cargo}** é para quem está no **nível {nivel}** ou acima. Você está no {atual}. Bora conversar! 😼"
)  # {cargo} {nivel} {atual}
BUMP_PAINEL_TITULO = "🚀 Quer ajudar a divulgar a toca?"
BUMP_PAINEL_DESC = (
    "A cada 2h dá para usar o **/bump** do DISBOARD, que sobe o Vulpus na lista pública de servidores.\n\n"
    "Quem bumpa ganha **{premio}** e **{mult}x XP por 2h**. 🦊\n"
    "Clique no botão e eu te marco quando o bump estiver liberado. Clicou de novo, eu paro."
)  # {premio} {mult}
BUMP_PAINEL_BOTAO = "Quero ser avisado(a)"

XP_NIVEL_UP_FRASES = [
    "🌟 {mencao} subiu para o **nível {nivel}**! Tá ficando famoso(a), hein? 😼",
    "🌟 **Nível {nivel}**, {mencao}! Eu sabia que você conseguia. (Mentira, tava em dúvida.)",
    "🌟 {mencao} chegou no **nível {nivel}**! Continua assim que eu fico orgulhosa. 🦊",
    "🌟 Olha só quem subiu para o **nível {nivel}**: {mencao}! 🎉",
    "🌟 {mencao} agora é **nível {nivel}**. Tá falando demais ou eu que tô contando errado? 👀",
]  # {mencao} {nivel}

# ============================================================================ fidelidade, porteiro e pedido de rank (1.4.0)
SETUP_PORTEIRO_BOTAO = "Criar cargo Porteiro"
BOAS_VINDAS_PORTEIRO = "{mencao} • Alô, {porteiro}? 🚪"  # {mencao} {porteiro}
SETUP_PORTEIRO_CRIADO = (
    "✅ Criei o cargo {cargo} e ele já é marcado nas boas-vindas. Dê ele para quem vai receber a galera "
    "(Helpers, Staff...). Os membros não pegam sozinhos."
)  # {cargo}
SETUP_PORTEIRO_REUSADO = "✅ Achei o cargo {cargo} e passei a usar ele como Porteiro nas boas-vindas."  # {cargo}
SETUP_PORTEIRO_NAO_MENCIONAVEL = (
    "⚠️ Mas ele não é mencionável e eu não consegui mudar isso. Ative **Permitir que todos @mencionem este cargo** "
    "nele, senão a marcação nas boas-vindas não avisa ninguém."
)
SETUP_PORTEIRO_EXISTE = "🦊 O Porteiro já está configurado: {cargo}."  # {cargo}
SETUP_PORTEIRO_ERRO = "🦊 Não consegui criar o cargo. Confira se eu tenho **Gerenciar Cargos**."
SETUP_HELPER_SEM_NIVEL = (
    "⚠️ {cargo} não está em **Níveis de permissão** como Helper: quem for promovido ganha o cargo, "
    "mas não os comandos de Helper (`/warn`, `/avisos`...)."
)  # {cargo}
SETUP_HELPER_PERIGOSO = "⚠️ {cargo} tem {permissoes}: eu não dou esse cargo pelo botão de promover."  # {cargo} {permissoes}
SETUP_PUBLICACOES_RODAPE = (
    "Conta post com imagem, vídeo ou link (ou post novo em fórum): até 2 por dia por pessoa, com 10 min entre eles. "
    "Apagou em menos de 24 h, desconta. Vazio = nenhum canal."
)

FIDELIDADE_TITULO = "🏅 Fidelidade de {nome}"  # {nome}
FIDELIDADE_DESC = "O caminho até **Helper**: mostrar que você cuida da toca. Eu conto tudo sozinha. 😼"
FIDELIDADE_LINHA = "{marca} {emoji} **{rotulo}** | **{atual}**/{meta}  {barra}"  # {marca} {emoji} {rotulo} {atual} {meta} {barra}
FIDELIDADE_PRONTO = "✅ Tudo certo! Já dá para pedir **Helper**: abra um tíquete em **🎖️ Solicitar rank**."
FIDELIDADE_FALTA = "Falta: {itens}. Bora, que a toca precisa de você! 🦊"  # {itens}
FIDELIDADE_FALTA_NIVEL = "nível {nivel}"  # {nivel}
FIDELIDADE_FALTA_DIAS = "mais {dias} dia(s) na toca"  # {dias}
FIDELIDADE_FALTA_CALL = "mais {tempo} na call"  # {tempo}
FIDELIDADE_JA_EQUIPE = "🛡️ Já faz parte da equipe (Helper ou acima). Obrigada por cuidar da toca! 🧡"
FIDELIDADE_SITUACAO = "Situação"
FIDELIDADE_COMO_TITULO = "Como conta"
FIDELIDADE_COMO = (
    "🚀 dar `/bump` no DISBOARD\n"
    "👋 dar boas-vindas a quem chegou, no canal de boas-vindas (marcando a pessoa ou dizendo \"bem-vindo(a)\"); "
    "conta nova no Discord e quem está voltando não contam\n"
    "🚨 denúncia por tíquete aprovada pela staff\n"
    "📸 post com imagem, vídeo ou link nos canais de publicação (até 2 por dia)\n"
    "🎙️ tempo na call de voz (conta com 2 pessoas ou mais ligadas, sem estar ensurdecido)\n"
    "⭐ nível de XP, conversando"
)
FIDELIDADE_RODAPE = "Algum número errado? A staff corrige com /fidelidade-ajustar."
FIDELIDADE_RANKING_TITULO = "🏅 Quem está mais perto de Helper"
FIDELIDADE_RANKING_VAZIO = "🦊 Ninguém pontuou na fidelidade ainda."
FIDELIDADE_RANKING_RODAPE = "% = quanto do caminho até Helper já foi feito • ✅ pode pedir • quem já é da equipe fica de fora"
FIDELIDADE_AJUSTE_OK = "✅ {tipo} de {alvo}: **{antes}** → **{depois}**."  # {tipo} {alvo} {antes} {depois}
FIDELIDADE_AJUSTE_BOT = "🦊 Bots não têm fidelidade (nem coração, segundo alguns)."
FIDELIDADE_LOG_AJUSTE = "🏅 Fidelidade ajustada"
FIDELIDADE_DETALHE_TITULO = "🔎 De onde vieram os números de {nome}"  # {nome}
FIDELIDADE_DETALHE_DESC = (
    "Só você (staff) vê isto. Desconfie de muitas boas-vindas para contas novas, que saíram ou que nunca verificaram."
)
FIDELIDADE_DETALHE_VERIFICOU = "✅ verificou"
FIDELIDADE_DETALHE_NAO_VERIFICOU = "⏳ não verificou"
FIDELIDADE_DETALHE_SAIU = "🚪 saiu"

DENUNCIA_AVALIAR_TITULO = "🛡️ Avaliação da denúncia (só staff)"
DENUNCIA_AVALIAR_DESC = (
    "Depois de olhar as provas, a staff aprova ou rejeita. Aprovar soma **+1 denúncia aprovada** "
    "na fidelidade de {autor} (vale uma vez por tíquete)."
)  # {autor}
DENUNCIA_APROVAR = "Aprovar denúncia"
DENUNCIA_REJEITAR = "Rejeitar"
DENUNCIA_APROVADA = "✅ Denúncia **aprovada** por {staff}. Valeu por ajudar a cuidar da toca, {autor}! 🦊"  # {staff} {autor}
DENUNCIA_REJEITADA = "❌ Denúncia **rejeitada** por {staff}."  # {staff}
DENUNCIA_JA_AVALIADA = "🦊 Essa denúncia já foi avaliada."
DENUNCIA_SO_STAFF = "🦊 Só a staff (Staff ou acima) avalia denúncias."
DENUNCIA_PROPRIA = "🦊 Ninguém avalia a própria denúncia. Chama outra pessoa da staff!"
DENUNCIA_LOG = "🚨 Denúncia {resultado}"  # {resultado}

RANK_TICKET_TITULO = "🎖️ Pedido de rank: Helper"
RANK_TICKET_DESC = (
    "{autor}, mande aqui as suas provas (prints, links, o que tiver). Abaixo está o seu quadro de fidelidade, "
    "contado por mim. Mesmo que falte algo, a staff pode avaliar. 🦊"
)  # {autor}
RANK_PROMOVER = "Promover a Helper"
RANK_RECUSAR = "Recusar"
RANK_SO_STAFF = "🦊 Só a staff (Staff ou acima) decide pedidos de rank."
RANK_SEM_CARGO = "🦊 O cargo Helper ainda não foi configurado. Um admin faz isso em `/setup` → Cargos base."
RANK_ERRO_HIERARQUIA = "🦊 Não dá para dar {cargo}: ele precisa ficar abaixo do meu cargo e do seu."  # {cargo}
RANK_AUTOR_SAIU = "🦊 Quem abriu o pedido não está mais no servidor."
RANK_PROPRIO = "🦊 Ninguém decide o próprio pedido de rank."
RANK_JA_TEM = "🦊 {autor} já tem {cargo}."  # {autor} {cargo}
RANK_JA_DECIDIDO = "🦊 Alguém da staff já decidiu esse pedido."
RANK_SEM_PERMISSAO = "🦊 Eu preciso da permissão **Gerenciar Cargos** para dar o Helper."
RANK_CARGO_PERIGOSO = (
    "🦊 Não vou dar {cargo} por botão: ele tem {permissoes}. Tire essas permissões do cargo ou dê à mão."
)  # {cargo} {permissoes}
RANK_PROMOVIDO = "🎖️ {autor} agora é **Helper**! Promovido(a) por {staff}. Bem-vindo(a) à equipe! 🦊🧡"  # {autor} {staff}
RANK_RECUSADO = (
    "🦊 Pedido recusado por {staff} por enquanto. Continue ajudando a toca e tente de novo mais tarde, {autor}!"
)  # {staff} {autor}
RANK_LOG = "🎖️ Pedido de rank {resultado}"  # {resultado}


# --------------------------------------------------------------------------- ponte com o Minecraft
MC_PONTE_MSG = "**{nome}** » {texto}"  # plano B quando o webhook não está disponível
MC_WEBHOOK_NOME = "Vulpus Chat"
MC_VINCULO_OK = (
    "🦊 Pronto! Sua conta do Discord agora está ligada a **{nome}**. Volte ao jogo: a tela preta some sozinha em alguns segundos. "
    "Suas Caudas e seu XP do jogo e do Discord foram somados."
)
MC_VINCULO_INVALIDO = "Esse código não existe ou já venceu. Entre no jogo e use o código novo que aparece na tela."
MC_VINCULO_MUITAS = "Muitas tentativas erradas. Espere uns minutos e tente de novo com o código da tela do jogo."
MC_VINCULO_JA = "Sua conta já está ligada a **{nome}**. Para trocar, peça à staff para desvincular."
MC_VINCULO_EM_USO = "A conta **{nome}** já está ligada a outra pessoa. Se for engano, chame a staff."
MC_CONTA_NENHUMA = "{alvo} ainda não ligou uma conta do Minecraft. No jogo aparece um código; use `/minecraft vincular`."
MC_CONTA_TITULO = "Conta do Minecraft"
MC_CONTA_CORPO = "{alvo} joga como **{nome}**.\nNível **{nivel}** · {saldo} · {xp} XP"
MC_DESVINCULO_OK = "Desvinculei {alvo} de **{nome}**. O saldo e o XP ficam no Discord; no jogo a pessoa precisará ligar de novo."
MC_DESVINCULO_NADA = "{alvo} não tem conta do Minecraft ligada."


# --------------------------------------------------------------------------- ponte com o Minecraft: eventos (embeds)
MC_RODAPE = "Vulpus • Minecraft"
MC_MSG_DISCORD_ANEXO = "[anexo]"
MC_ENTROU_TITULO = "🟢 {nome} entrou"
MC_ENTROU_DESC = "{nome} está jogando agora."
MC_ENTROU_NOVO = "🎉 {nome} chegou pela primeira vez!"
MC_SAIU_TITULO = "🔴 {nome} saiu"
MC_SAIU_DESC = "{nome} saiu do servidor."
MC_SAIU_SESSAO = "Jogou por **{tempo}**."
MC_MORTE_TITULO = "☠️ {nome} morreu"
MC_MORTE_FRASES = {
    "pvp": ["**{v}** foi derrotado(a) por **{m}**.", "**{m}** venceu o duelo contra **{v}**.", "**{v}** perdeu a luta para **{m}**."],
    "mob": ["**{v}** foi morto(a) por {m}.", "**{v}** não escapou de {m}.", "{m} acabou com **{v}**."],
    "queda": ["**{v}** caiu de uma altura perigosa.", "**{v}** achou que dava pra pular dali.", "**{v}** conheceu o chão com força."],
    "lava": ["**{v}** tentou nadar na lava.", "**{v}** virou churrasco na lava."],
    "fogo": ["**{v}** queimou até o fim.", "**{v}** não apagou o fogo a tempo."],
    "afogou": ["**{v}** ficou sem ar debaixo d'água.", "**{v}** se afogou."],
    "vazio": ["**{v}** caiu no vazio.", "**{v}** deu um passo além do mundo."],
    "explosao": ["**{v}** explodiu.", "**{v}** estava perto demais da explosão."],
    "fome": ["**{v}** morreu de fome.", "**{v}** esqueceu de comer."],
    "sufocou": ["**{v}** ficou preso(a) dentro de um bloco."],
    "raio": ["**{v}** foi atingido(a) por um raio."],
    "frio": ["**{v}** congelou."],
    "magia": ["**{v}** caiu vítima de magia."],
    "outro": ["**{v}** morreu.", "**{v}** não resistiu."],
}
MC_MORTE_LOCAL = "📍 {local}"
MC_STREAK_TITULO = "🔥 {nome} está imparável"
MC_STREAK_DESC = "**{nome}** está numa sequência de **{n}** abates sem morrer!"
MC_STREAK_FIM_TITULO = "💥 Sequência encerrada"
MC_STREAK_FIM_DESC = "**{matador}** acabou com a sequência de **{n}** abates de **{vitima}**."
MC_NIVEL_TITULO = "⬆️ {nome} subiu de nível"
MC_NIVEL_DESC = "**{nome}** chegou ao nível **{nivel}** · {rank}"
MC_CONQUISTA_TITULO = "🏅 Conquista de {nome}"
MC_CONQUISTA_DESC = "**{nome}** ganhou **{conquista}**."
MC_CLA_CRIADO_TITULO = "🏰 Nasce um clã"
MC_CLA_CRIADO_DESC = "**[{tag}] {nome}** foi fundado por **{fundador}**."
MC_CLA_EXTINTO_TITULO = "🪦 Um clã se despede"
MC_CLA_EXTINTO_DESC = "**[{tag}] {nome}** deixou de existir."
MC_CLA_EXTINTO_VIDA = "Viveu por **{dias}** dia(s) · **{membros}** membro(s) no fim"
MC_GUERRA_INICIO_TITULO = "⚔️ Começou uma guerra"
MC_GUERRA_INICIO_DESC = "**[{a}]** declarou guerra a **[{b}]**."
MC_GUERRA_APOSTA = "💰 Aposta: **{valor}**"
MC_GUERRA_CTF = "🚩 Capture a bandeira ligado"
MC_GUERRA_FIM_TITULO = "🏁 A guerra acabou"
MC_GUERRA_FIM_VENCEU = "**[{vencedor}]** venceu **[{perdedor}]** por **{pa} × {pb}**."
MC_GUERRA_FIM_EMPATE = "**[{a}]** e **[{b}]** empataram em **{pa} × {pb}**."
MC_GUERRA_MOTIVOS = {"tempo": "acabou o tempo", "staff": "encerrada pela staff", "dono": "decidida pelo dono", "rendicao": "rendição", "dissolvido": "um clã se desfez", "cancelada": "cancelada pelo dono"}
MC_GUERRA_PREMIO = "🏆 Prêmio: **{valor}**"
MC_GUERRA_CACADOR = "🎯 Caçador da guerra: **{nome}** ({n} abates)"
MC_GUERRA_CAPTURAS = "🚩 Capturas: **{a}** × **{b}**"
MC_HISTORICO_TITULO = "📖 Histórico da Vulpus"

# ---- login (canal log-in)
MC_LOGIN_ENTROU_TITULO = "🔓 Login"
MC_LOGIN_ENTROU_DESC = "**{nome}** entrou no servidor como {discord}."
MC_LOGIN_SAIU_TITULO = "🔒 Logout"
MC_LOGIN_SAIU_DESC = "**{nome}** saiu do servidor."
MC_LOGIN_VINCULADO_TITULO = "🔗 Conta ligada"
MC_LOGIN_VINCULADO_DESC = "{discord} ligou a conta **{nome}** do Minecraft."
MC_LOGIN_DESVINCULADO_TITULO = "⛔ Conta desvinculada"
MC_LOGIN_DESVINCULADO_DESC = "{discord} perdeu o vínculo com **{nome}**. Quem fez: {staff}."
MC_LOGIN_FALHA_TITULO = "⚠️ Código recusado"
MC_LOGIN_FALHA_DESC = "{discord} tentou um código que não existe ou venceu."
MC_LOGIN_CAMPO_NIVEL = "Nível"
MC_LOGIN_CAMPO_CAUDAS = "Caudas"
MC_LOGIN_CAMPO_SESSAO = "Sessão"
MC_LOGIN_CAMPO_DISCORD = "Discord"
MC_LOGIN_CAMPO_MC = "Minecraft"

# ---- painel do canal ip-e-porta
MC_IP_TITULO = "🦊 Entre na Vulpus"
MC_IP_DESC = "O servidor de **Minecraft Bedrock** da toca: celular, console e Windows. Copie o endereço, cole no jogo e venha jogar com a gente!"
MC_IP_CAMPO_PRINCIPAL = "🌐 Servidor principal"
MC_IP_CAMPO_ALTERNATIVO = "🔁 Servidor alternativo"
MC_IP_VALOR = "```\nIP:    {ip}\nPorta: {porta}\n```"
MC_IP_CAMPO_COMO = "📱 Como entrar"
MC_IP_COMO = (
    "1. Abra o Minecraft e vá em **Jogar → Servidores**\n"
    "2. Toque em **Adicionar servidor** e preencha o **IP** e a **porta**\n"
    "3. Entre. Na primeira vez a tela fica preta com um **código**\n"
    "4. No Discord, use **/minecraft vincular** (ou o botão no canal {login}) e digite o código"
)
MC_IP_CAMPO_STATUS = "📊 Agora"
MC_IP_STATUS_ON = "🟢 **Online** · **{n}/{max}** jogando"
MC_IP_STATUS_ON_LISTA = "\n{lista}"
MC_IP_STATUS_OFF = "🔴 **Fora do ar** ou sem resposta agora"
MC_IP_STATUS_VAZIO = "\n*Ninguém por aqui ainda. Seja o primeiro!*"
MC_IP_CAMPO_RAPIDO = "⚡ Entrada rápida"
MC_IP_RAPIDO = (
    "Toque em **Abrir no Minecraft** aqui embaixo: o jogo já pergunta se você quer adicionar o servidor.\n"
    "Se não abrir, copie este link e cole no navegador do celular ou do computador:\n```\n{link}\n```"
)
MC_BOTAO_ABRIR = "Abrir no Minecraft"
MC_BOTAO_ABRIR_ALT = "Servidor alternativo"
MC_ONLINE_NOME = "🟢 Online | ({n}) 🦊"
MC_OFFLINE_NOME = "🔴 Offline | (0) 🦊"
MC_IP_CAMPO_VERSAO = "🧩 Versão"
MC_IP_VERSAO = "Minecraft **Bedrock**. Entre com a versão mais nova do jogo."
MC_IP_RODAPE = "Atualizado a cada poucos minutos"

# ---- painel do canal log-in
MC_LOGINP_TITULO = "🔐 Login da Vulpus"
MC_LOGINP_DESC = (
    "Para jogar no servidor você precisa **ligar sua conta do Minecraft à do Discord**. É rápido, é uma vez só e "
    "ainda **soma suas Caudas e seu XP** dos dois lugares!"
)
MC_LOGINP_CAMPO_PASSOS = "✅ Passo a passo"
MC_LOGINP_PASSOS = (
    "1. Entre no servidor ({ip}). A tela fica preta e aparece um **código de 6 letras**\n"
    "2. Aqui neste canal, aperte **🔗 Vincular conta** e digite o código\n"
    "3. Pronto! A tela volta sozinha e você já pode jogar"
)
MC_LOGINP_CAMPO_VANTAGENS = "✨ O que muda"
MC_LOGINP_VANTAGENS = (
    "• **Caudas e XP** são os mesmos no jogo e no Discord\n"
    "• Seu **nível** vale nos dois lugares\n"
    "• Suas mensagens do jogo aparecem no {chat}\n"
    "• Sua conta fica protegida: ninguém joga com o seu nome sem passar por aqui"
)
MC_LOGINP_RODAPE = "Perdeu o código? Entre de novo no jogo para ver outro."
MC_BOTAO_VINCULAR = "Vincular conta"
MC_BOTAO_CONTA = "Minha conta"
MC_BOTAO_AJUDA = "Como funciona"
MC_MODAL_TITULO = "Ligar conta do Minecraft"
MC_MODAL_CAMPO = "Código da tela do jogo"
MC_MODAL_DICA = "Ex.: K7M2QX"
MC_AJUDA_TITULO = "❓ Como funciona o login"
MC_AJUDA_DESC = (
    "• O **código** aparece na tela preta do jogo e vale **15 minutos**. Entrou de novo? Um código novo aparece.\n"
    "• Uma conta do Minecraft para cada conta do Discord (e vice-versa).\n"
    "• Se o jogo não responder, espere um pouco: ele tenta de novo sozinho.\n"
    "• Trocou de nome no Xbox? Seu vínculo continua valendo.\n"
    "• Algo errado? Abra um tíquete que a staff te ajuda."
)
MC_OK_TITULO = "🦊 Conta ligada!"
MC_ERRO_TITULO = "⚠️ Não deu"
MC_CONTA_SEM_TITULO = "🔗 Você ainda não ligou uma conta"
MC_CONTA_SEM_DESC = "Entre no servidor, pegue o **código** da tela preta e use o botão **Vincular conta** aqui no canal."

# ---------------------------------------------------------------- visual dos cargos
CARGOS_VISUAL_TITULO = "🧹 Organizar cargos"
CARGOS_VISUAL_RODAPE = "Nada é apagado. Só nomes e separadores mudam."
CARGOS_VISUAL_NADA = "Tudo já está organizado. Nada a mudar. ✨"
CARGOS_VISUAL_OUTRO_SERVIDOR = "Este servidor não tem estilo de cargos configurado."
CARGOS_VISUAL_APLICANDO = "⏳ Aplicando, devagar para não sobrecarregar o Discord..."
CARGOS_VISUAL_FEITO = "✅ Pronto! **{renomeados}** cargo(s) renomeado(s), **{ajustados}** membro(s) ajustado(s)."
CARGOS_VISUAL_FALHAS = "⚠️ Falhou em: {lista}"  # {lista}


# ---- Kitsune controlado pelo jogo
MC_KITSUNE_DADO_TITULO = "🦊 Novo Kitsune"
MC_KITSUNE_DADO_DESC = "**{nome}** ganhou o selo **Kitsune**{prazo}."
MC_KITSUNE_PRAZO = " até {data} ({relativo})"
MC_KITSUNE_SEM_PRAZO = " sem prazo"
MC_KITSUNE_FIM_TITULO = "🍂 Fim do Kitsune"
MC_KITSUNE_FIM_EXPIROU = "O selo Kitsune de **{nome}** acabou."
MC_KITSUNE_FIM_TIRADO = "**{nome}** não é mais Kitsune."
MC_KITSUNE_CMD_TITULO = "🦊 Kitsune (quem manda é o jogo)"
MC_KITSUNE_CMD_COM = "✅ Com o selo no jogo ({n})"
MC_KITSUNE_CMD_LINHA = "{mencao} · {mc} · {prazo}"
MC_KITSUNE_CMD_SO_CARGO = "⚠️ Têm o cargo no Discord mas não o selo no jogo ({n})"
MC_KITSUNE_CMD_SO_CARGO_LINHA = "{mencao} · {situacao}"
MC_KITSUNE_CMD_SEM_CONTA = "não ligou a conta"
MC_KITSUNE_CMD_SEM_SELO = "ligou a conta ({mc}), mas está sem selo"
MC_KITSUNE_CMD_NADA = "Ninguém por aqui."
MC_KITSUNE_CMD_RODAPE = "O selo só se dá e se tira dentro do jogo (Painel de Dono → Kitsune com prazo). O cargo do Discord segue sozinho."
MC_KITSUNE_SEM_PRAZO_LINHA = "sem prazo"
MC_KITSUNE_ATE_LINHA = "até {data} ({relativo})"


# ---------------------------------------------------------------- apoio por PIX (Kitsune e doações)
APOIO_TITULO = "💖 Ajude a toca a continuar de pé"
APOIO_DESC = (
    "A hospedagem do servidor é paga todo mês do bolso do dono. Quem ajuda mantém as luzes acesas. 🦊\n\n"
    "• **Virar Kitsune:** {kitsune_preco} por mês, pelo tempo que quiser. O selo e o cargo chegam na hora.\n"
    "• **Doar:** qualquer valor a partir de {doacao_min}. Vai para a meta do mês.\n\n"
    "É tudo por **PIX**, sem sair do Discord. Doação **não dá vantagem no jogo**."
)
APOIO_RODAPE = "Obrigada, de coração, a cada pessoa que ajuda. 🧡"
APOIO_BOTAO_KITSUNE = "Virar Kitsune"
APOIO_BOTAO_DOAR = "Doar"
APOIO_BOTAO_METAS = "Ver metas"
APOIO_METAS_TITULO = "🎯 Metas"
APOIO_SEM_METAS = "Nenhuma meta ativa agora. Mas qualquer ajuda é bem-vinda! 💖"
APOIO_META_LINHA = "{barra} **{pct}%**\n{arrecadado} de {alvo}{prazo} · {apoiadores} apoiador(es)"
APOIO_META_PRAZO = " · até {data}"
APOIO_META_DESCRICAO = "_{descricao}_\n"
APOIO_MES = "📅 Neste mês a toca recebeu **{valor}**. Obrigada!"
APOIO_RECENTES = "💬 Últimas doações"
APOIO_RECENTE_LINHA = "**{nome}** · {valor}"
APOIO_ANONIMO = "Alguém especial"

APOIO_DESLIGADO = "O apoio por PIX está desligado agora."
APOIO_SEM_PROVEDOR = "O PIX ainda não foi ligado (falta a chave do Mercado Pago). Avise o dono."
APOIO_VALOR_INVALIDO = "O valor tem que ser um número inteiro de reais entre {minimo} e {maximo}."
APOIO_MUITOS_PENDENTES = "Você já tem {n} cobranças esperando pagamento. Pague, ou espere elas expirarem."
APOIO_ERRO_PIX = "Não consegui gerar o PIX agora. Tente de novo daqui a pouco; se continuar, avise a staff."
APOIO_ESCOLHA_MESES = "🦊 Quantos meses de Kitsune?"
APOIO_ESCOLHA_DESC = "Cada mês custa **{preco}** e dura **{dias} dias**. Se você já é Kitsune, o tempo novo é somado ao que você tem."
APOIO_MESES_OPCAO = "{n} mês(es) · {valor}"
APOIO_MESES_PLACEHOLDER = "Escolha o tempo"

PIX_TITULO_KITSUNE = "🦊 Kitsune por {meses} mês(es)"
PIX_TITULO_DOACAO = "💖 Doação"
PIX_DESC = (
    "Valor: **{valor}**\n\n"
    "**Como pagar:** abra o app do seu banco, vá em **PIX → Pix Copia e Cola** e cole o código abaixo "
    "(ou leia o QR code). Confira o valor e o nome antes de confirmar.\n\n"
    "Vale até {expira}. Quando o pagamento cair, eu libero **na hora**, não precisa avisar ninguém."
)
PIX_CAMPO_CODIGO = "📋 Copia e Cola"
PIX_BOTAO_COPIAR = "Copiar o código"
PIX_BOTAO_CONFERIR = "Já paguei"
PIX_BOTAO_CANCELAR = "Cancelar"
PIX_AINDA_NAO = "Ainda não vi o pagamento. Pode levar alguns segundos depois de pagar; eu aviso assim que cair. 🦊"
PIX_JA_PAGO = "Esse pagamento já foi confirmado. 💖"
PIX_CANCELADO = "Cobrança cancelada. Se você já tiver pago, me avise na staff que eu confiro."
PIX_NAO_E_SEU = "Essa cobrança não é sua."
PIX_EXPIROU = "Essa cobrança expirou. Gere outra com `/kitsune` ou `/doar`."

PAGO_KITSUNE_DM = (
    "🦊 **Pagamento confirmado!** Você agora é **Kitsune** até **{data}** ({relativo}).\n"
    "{jogo}"
)
PAGO_KITSUNE_JOGO_LIGADO = "No jogo o selo chega na próxima vez que você entrar ou em até 1 minuto, se já estiver online."
PAGO_KITSUNE_JOGO_SEM_CONTA = "Para o selo aparecer no Minecraft, ligue sua conta com `/minecraft vincular`."
PAGO_DOACAO_DM = "💖 **Doação recebida:** {valor}. Muito obrigada por ajudar a toca a continuar de pé! 🧡"
PAGO_META_COMPLETA = "🎉 **Meta batida:** {titulo}! Obrigada a todo mundo que ajudou. 🧡"
PAGO_MURAL = "💖 **{nome}** doou **{valor}**{meta}!{mensagem}"
PAGO_MURAL_META = " para a meta **{titulo}**"
PAGO_MURAL_MENSAGEM = "\n> {mensagem}"
PAGO_MURAL_KITSUNE = "🦊 **{nome}** virou Kitsune! Obrigada por apoiar a toca."
PAGO_LOG_VALOR_DIFERENTE = "Pagamento {id} chegou com valor diferente (esperado {esperado}, veio {veio}). Não liberei nada; confira no Mercado Pago."
PAGO_LOG_DEVOLVIDO = "O pagamento {id} ({tipo}, {valor}) foi devolvido ou contestado no Mercado Pago. Confira se precisa tirar o Kitsune."

DOAR_MODAL_TITULO = "Doar por PIX"
DOAR_MODAL_VALOR = "Valor em reais (ex.: 10)"
DOAR_MODAL_MENSAGEM = "Mensagem para o mural (opcional)"
DOAR_MODAL_ANONIMO = "Aparecer como anônimo? (sim ou não)"

META_CRIADA = "🎯 Meta **{titulo}** criada (id `{id}`): {alvo}. As doações novas já entram nela."
META_EDITADA = "Meta `{id}` atualizada."
META_ENCERRADA = "Meta `{id}` encerrada."
META_NAO_ACHADA = "Não achei a meta `{id}` (ou ela já foi encerrada)."
META_VALOR_INVALIDO = "O valor da meta tem que ser um número inteiro de reais, de 1 a 1.000.000."
META_PRAZO_INVALIDO = "O prazo é em dias, de 1 a 3650 (0 = sem prazo)."
META_NADA_PARA_EDITAR = "Diga pelo menos uma coisa para mudar."
META_LISTA_TITULO = "🎯 Metas"
META_LISTA_LINHA = "`{id}` · **{titulo}** · {arrecadado} / {alvo}"
META_LISTA_ENCERRADAS = "Encerradas há pouco"
META_FIM_CONCLUIDA = "concluída"
META_FIM_PRAZO = "prazo acabou"
META_FIM_ENCERRADA = "encerrada pela staff"
META_PRAZO_ACABOU = "⏰ O prazo da meta **{titulo}** acabou ({arrecadado} de {alvo})."

APOIO_ADMIN_TITULO = "💳 Pagamentos recentes"
APOIO_ADMIN_VAZIO = "Nenhum pagamento confirmado ainda."
APOIO_ADMIN_LINHA = "`{id}` · {tipo} · {valor} · <@{user}> · {quando}"
APOIO_ADMIN_TIPO = {"kitsune": "🦊 Kitsune", "doacao": "💖 Doação"}
APOIO_ADMIN_TOTAIS = "Mês: **{mes}** (Kitsune {kitsune}, doações {doacoes}) · Total: **{total}**"
APOIO_PAINEL_PUBLICADO = "Painel de apoio publicado em {canal}."
APOIO_PAINEL_SEM_CANAL = "Defina o canal **Doações e metas** no `/setup` primeiro."
APOIO_CONFERIDO = "Conferi {n} pagamento(s) pendente(s)."
APOIO_LOG_EXPIRADOS = "{n} cobrança(s) PIX expiraram sem pagamento."


# ---- /apoio configurar (cria o canal, publica os painéis e confere o Kitsune)
APOIO_CFG_TITULO = "🛠️ Apoio e Kitsune: conferência"
APOIO_CFG_OK = "✅ {texto}"
APOIO_CFG_AVISO = "⚠️ {texto}"
APOIO_CFG_ERRO = "❌ {texto}"
APOIO_CFG_CANAL_CRIADO = "Criei o canal {canal} (leitura para todos, só a staff escreve) e guardei no `/setup`."
APOIO_CFG_CANAL_EXISTE = "Canal de doações: {canal}."
APOIO_CFG_CANAL_FALHOU = "Não consegui criar o canal de doações (preciso da permissão **Gerenciar Canais**). Crie um e escolha em `/setup` → Canais → Doações e metas."
APOIO_CFG_PERMISSAO_FALHOU = "Criei o canal mas não consegui ajustar as permissões: {detalhe}"
APOIO_CFG_PAINEL_OK = "Painel de apoio (metas e botões) publicado em {canal}."
APOIO_CFG_PAINEL_FALHOU = "Não consegui publicar o painel de apoio."
APOIO_CFG_KITSUNE_PAINEL_OK = "Painel **Seja um Kitsune** atualizado em {canal} (com o botão de compra)."
APOIO_CFG_KITSUNE_PAINEL_SEM_CANAL = "O canal do painel Seja um Kitsune não está definido (`/setup` → Canais → Kitsune); sem ele os botões de compra só aparecem no canal de doações."
APOIO_CFG_PIX_OK = "PIX ligado: a chave do Mercado Pago está configurada."
APOIO_CFG_PIX_SEM_CHAVE = "PIX desligado: falta a variável `MERCADOPAGO_ACCESS_TOKEN` no Railway."
APOIO_CFG_AJUSTE_DESLIGADO = "O apoio está desligado em `/ajustes` (`apoio_ligado` = 0)."
APOIO_CFG_AVISOS_AUTOMATICOS = "Aviso automático do Mercado Pago: {estado}."
APOIO_CFG_WEBHOOK_URL = "configurado (`PUBLIC_BASE_URL` definida)"
APOIO_CFG_WEBHOOK_SEM_URL = "sem `PUBLIC_BASE_URL` (a Kiza confere a cada 15 s do mesmo jeito)"
APOIO_CFG_ASSINATURA_SIM = "assinatura secreta do webhook configurada"
APOIO_CFG_ASSINATURA_NAO = "sem `MERCADOPAGO_WEBHOOK_SECRET` (funciona, mas não confere a assinatura)"
APOIO_CFG_CARGO_OK = "Cargo Kitsune {cargo}: pode ser dado e tirado por mim."
APOIO_CFG_CARGO_SEM = "O cargo Kitsune não está configurado ou não existe neste servidor (`/setup` → Cargos base → Kitsune)."
APOIO_CFG_CARGO_GERENCIADO = (
    "O cargo {cargo} é **gerenciado pelo Discord** (cargo automático de booster ou de integração). Eu não consigo dar nem tirar esse cargo, "
    "e quem dá boost continua recebendo. Crie um cargo comum chamado Kitsune e escolha ele em `/setup` → Cargos base → Kitsune."
)
APOIO_CFG_CARGO_ALTO = "O cargo {cargo} está **acima do meu cargo**: arraste o cargo da Kiza para cima dele em Configurações do servidor → Cargos."
APOIO_CFG_BOOSTERS = "{n} booster(s) têm o cargo Kitsune. Se não era a intenção, o cargo some deles quando o selo não for confirmado (só vale para quem ligou a conta do jogo)."
APOIO_CFG_BOOSTER_SEM = "Nenhum booster está recebendo Kitsune de graça."
APOIO_CFG_SELOS = "Kitsunes pelo jogo ou por compra: {n}."
APOIO_CFG_METAS = "Metas ativas: {n}. Crie com `/meta criar`."
APOIO_CFG_APOIADOR = "Cargo Apoiador: {estado}."
APOIO_CFG_APOIADOR_SIM = "configurado ({cargo})"
APOIO_CFG_APOIADOR_NAO = "não configurado (opcional, em `/setup` → Cargos base)"


# ---- metas com imagem e prévia
META_PREVIA = "👀 **Prévia.** É assim que a meta vai aparecer no painel. Confira e confirme para criar."
META_PREVIA_BOTAO_CRIAR = "Criar meta"
META_PREVIA_BOTAO_EDITAR = "Editar"
META_PREVIA_BOTAO_SEM_IMAGEM = "Tirar imagem"
META_PREVIA_BOTAO_CANCELAR = "Cancelar"
META_PREVIA_CANCELADA = "Prévia cancelada. Nada foi criado."
META_PREVIA_EXPIROU = "A prévia expirou (10 min). Rode `/meta criar` de novo."
META_PREVIA_NAO_E_SUA = "Essa prévia é de outra pessoa."
META_PREVIA_JA_CRIADA = "Essa meta já foi criada."
META_EDITAR_MODAL = "Editar a meta"
META_EDITAR_TITULO = "Título"
META_EDITAR_DESCRICAO = "Descrição (opcional)"
META_EDITAR_VALOR = "Valor da meta em reais"
META_EDITAR_PRAZO = "Prazo em dias (0 = sem prazo)"
META_EDITAR_COR = "Cor em hexadecimal (ex.: #F28C38; vazio = padrão)"
META_IMAGEM_INVALIDA = "A imagem precisa ser PNG, JPG, WEBP ou GIF."
META_IMAGEM_GRANDE = "A imagem é grande demais ({tamanho}). O máximo é {maximo}: reduza e envie de novo."
META_COR_INVALIDA = "Cor inválida. Use 6 dígitos hexadecimais, como #F28C38."
META_PRAZO_CAMPO_INVALIDO = "O prazo precisa ser um número de dias entre 0 e 3650."
META_VALOR_CAMPO_INVALIDO = "O valor da meta precisa ser um número inteiro de reais, de 1 a 1.000.000."
META_IMAGEM_REMOVIDA = "Imagem da meta `{id}` removida."


# ---- caixinhas
CAIXA_TITULO = "🐷 Caixinhas"
CAIXA_AVISO = "O dinheiro de verdade fica todo na conta do Mercado Pago; aqui é só a conta de quanto é de quê."
CAIXA_LINHA = "{icone} **{nome}**: entrou {entrou} · saiu {saiu} · **saldo {saldo}**"
CAIXA_ICONE = {"kitsune": "🦊", "geral": "💖", "meta": "🎯"}
CAIXA_ENCERRADA = " (meta encerrada)"
CAIXA_TOTAL = "Total: entrou **{entrou}** · saiu **{saiu}** · saldo **{saldo}**"
CAIXA_GASTOS = "Últimos gastos"
CAIXA_GASTO_LINHA = "`{id}` · {valor} · {caixinha} · {motivo} · <t:{quando}:d>"
CAIXA_GASTO_REGISTRADO = "Gasto `{id}` registrado: {valor} da caixinha **{caixinha}** ({motivo}). Saldo agora: {saldo}."
CAIXA_GASTO_APAGADO = "Gasto `{id}` apagado."
CAIXA_GASTO_NAO_ACHADO = "Não achei o gasto `{id}`."
CAIXA_NAO_ACHADA = "Não achei essa caixinha. Use uma das opções que aparecem ao digitar."
CAIXA_VALOR_INVALIDO = "O valor do gasto precisa ser um número positivo em reais (ex.: 59,63)."
CAIXA_SEM_SALDO = "Atenção: a caixinha **{caixinha}** ficou com saldo negativo ({saldo}). Registrei mesmo assim."
CAIXA_GERAL_SEM_META = "💖 Doação geral (sem meta)"
DOAR_ONDE_TITULO = "💖 Para onde vai a doação?"
DOAR_ONDE_DESC = "Escolha a meta que você quer ajudar, ou a **caixinha geral**."
DOAR_ONDE_PLACEHOLDER = "Escolha para onde vai"

# --- Chat de proximidade (voz) ---
PROX_SEM_PERMISSAO = "Não consegui criar a categoria ou a sala. Me dê a permissão **Gerenciar canais** (e **Mover membros**) e tente de novo."
PROX_CONFIGURADO = (
    "Pronto! Entre em {entrada} para falar por proximidade: quem estiver a até **{distancia} blocos** de você no jogo cai na mesma sala. "
    "Precisa ter a conta ligada (`/minecraft vincular`). Para parar de ser movido, use `/proximidade pausar`."
)
PROX_PAUSADO = "Pausado: não vou mais te mover de sala. Use `/proximidade retomar` para voltar."
PROX_RETOMADO = "Voltei a te mover de sala por proximidade quando você estiver na sala de entrada."
PROX_STATUS_TITULO = "🎧 Chat de proximidade"
PROX_STATUS_LIGADA = "Ligado: **{estado}**"
PROX_STATUS_SEM_CANAIS = "Ainda não há sala de entrada. Use `/proximidade configurar`."
PROX_STATUS_ENTRADA = "Entrada: {sala} ({n} pessoa(s))"
PROX_STATUS_SALA = "{sala}: {quem}"
PROX_STATUS_VISTO = "Última posição recebida do jogo: {quando}"
PROX_STATUS_AJUSTES = "Entra a **{entrar}** blocos, sai a **{sair}**, espera **{espera}** s entre movimentos."


# --- Convide um amigo ---
CONVITE_DESLIGADO = "O programa de convites está desligado no momento."
CONVITE_SEM_PERMISSAO = "Não consegui criar o seu link. Me dê a permissão **Gerenciar servidor** e **Criar convite** e tente de novo."
CONVITE_SEM_CANAL = "Não achei um canal para criar o seu link. Fale com a staff."
CONVITE_TITULO = "🦊 Convide um amigo"
CONVITE_DESC = (
    "Seu link pessoal: {link}\n\n"
    "Quando quem entrar por ele **ficar {horas} h no servidor, ligar a conta do Minecraft (`/minecraft vincular`) e chegar ao nível {nivel}**, "
    "vocês dois ganham: **você {premio}** e **seu amigo {premio_novato}**.\n"
    "Vale em até **{dias} dias** depois da entrada, para contas com mais de {conta_dias} dias, e cada pessoa só rende uma vez. "
    "Teto de **{teto} prêmios por mês** para quem convida."
)
CONVITE_STATS = "Aguardando: **{pendentes}** · Já valeram: **{pagos}** · Ganho no total: **{ganho}**"
CONVITE_STATS_TETO = "Neste mês: **{mes}/{teto}** prêmios."
CONVITE_RANKING_TITULO = "🏆 Quem mais trouxe amigos"
CONVITE_RANKING_LINHA = "**{pos}.** {quem}: {pagos} amigo(s)"
CONVITE_RANKING_VAZIO = "Ninguém trouxe amigos ainda. Use `/convidar`!"
CONVITE_DM_CONVIDANTE = "🦊 Seu amigo **{amigo}** completou o caminho (tempo, conta do Minecraft e nível). Você ganhou **{premio}**!"
CONVITE_DM_CONVIDANTE_TETO = "🦊 Seu amigo **{amigo}** completou o caminho, mas você já chegou ao teto de prêmios deste mês. Ele ganhou o dele!"
CONVITE_DM_NOVATO = "🦊 Você completou o caminho de boas-vindas e ganhou **{premio}**! Obrigada por vir, {convidante} te trouxe."
CONVITE_LOG_TITULO = "Convite premiado"
CONVITE_LOG_DESC = "{convidante} convidou {amigo}: convidante {premio}, novato {premio_novato}."

# --- /online ---
MC_ONLINE_TITULO = "🟢 Quem está jogando"
MC_ONLINE_CONTAGEM = "**{n}/{max}** jogando agora"
MC_ONLINE_LINHA = "• {nome} ({discord})"
MC_ONLINE_VAZIO = "Ninguém por aqui agora (0/{max}). Seja o primeiro!"
MC_ONLINE_OFF = "🔴 O servidor está **fora do ar** ou sem resposta agora."


# --- Placares (#placares) ---
PLACAR_VAZIO = "*Ainda ninguém na lista. Quem será o primeiro?*"
PLACAR_RODAPE = "Atualiza sozinho a cada 10 minutos"
PLACAR_VOZ_TITULO = "🎧 Mais tempo em call"
PLACAR_VOZ_DESC = "Quem mais conversou nas calls do servidor (com gente na sala e sem estar ensurdecido)."
PLACAR_SESSAO_TITULO = "⏱️ Maior jogada seguida"
PLACAR_SESSAO_DESC = "A maior sequência de Minecraft sem sair do servidor."
PLACAR_TOTAL_TITULO = "🕹️ Mais tempo de jogo"
PLACAR_TOTAL_DESC = "Quem mais passou tempo jogando Minecraft na Vulpus, somando tudo."


# --- Mimos dos Kitsunes (sala de voz, votações, mural) ---
SO_KITSUNE = "Isso é um mimo só para **Kitsunes** 🦊. Veja como virar um no canal **seja-um-kitsune**."
SALA_SEM_CARGO = "Não achei o cargo Kitsune. Configure o cargo no `/setup` primeiro."
SALA_SEM_PERMISSAO = "Não consegui criar os canais. Me dê as permissões **Gerenciar canais**, **Gerenciar cargos** e **Mover membros** e tente de novo."
SALA_CONFIGURADA = "Pronto! Criei a categoria **🦊 Toca Kitsune** (só Kitsunes veem) com um chat e a sala **➕ Criar sala Kitsune**: quem entra nela ganha uma sala de voz só sua."
SALA_NOME_PADRAO = "Sala de {nome}"
SALA_NOME_INVALIDO = "Esse nome não serve. Use letras, números ou emojis (até 40)."
SALA_NOME_OK = "Pronto! Sua sala vai se chamar **{nome}**."
SALA_LIMITE_OK = "Pronto! Limite de **{n}** pessoas na sua sala."
VOTACAO_TITULO = "🗳️ {titulo}"
VOTACAO_ABERTA = "Só **Kitsunes** votam. Você pode trocar o seu voto até acabar ({quando})."
VOTACAO_ENCERRADA = "🔒 **Votação encerrada.** Obrigada por participar!"
VOTACAO_RODAPE = "{total} voto(s) até agora"
VOTACAO_OPCOES_INVALIDAS = "Preciso de **2 a 5 opções**, separadas por `;` e sem repetir."
VOTACAO_CRIADA = "Votação **#{id}** aberta em {canal}."
VOTACAO_NAO_ACHEI = "Não achei essa votação."
VOTACAO_JA_ENCERRADA = "Essa votação já tinha acabado."
VOTACAO_ENCERRADA_OK = "Votação **#{id}** encerrada."
VOTACAO_SO_KITSUNE = "Só **Kitsunes** votam nas votações da toca 🦊."
VOTACAO_ENCERROU = "Essa votação já acabou."
VOTACAO_IGUAL = "Você já votou nessa opção."
VOTACAO_VOTOU = "Voto registrado: **{opcao}**."
VOTACAO_TROCOU = "Voto trocado para **{opcao}**."
MURAL_TITULO = "🦊 Mural dos Kitsunes"
MURAL_DESC = "**{n}** Kitsunes ajudam a toca a seguir de pé. Obrigada de coração!"
MURAL_RODAPE = "Quer sair do mural? Use /mural sair"
MURAL_VAZIO = "*Ainda não há Kitsunes no mural. Que tal ser o primeiro?*"
MURAL_E_MAIS = " · e mais {n}"
MURAL_AGRADECIMENTO = "🧡 Mais um mês começou! Obrigada aos **{n} Kitsunes** que ajudam a toca a seguir de pé. Vocês fazem tudo isso existir."
MURAL_SAIU = "Pronto, tirei você do mural. Você continua Kitsune!"
MURAL_VOLTOU = "Seu nome voltou para o mural dos Kitsunes 🦊"
