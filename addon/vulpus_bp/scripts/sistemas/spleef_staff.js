// @ts-check
// Spleef, lado da staff: Menu > Staff > Minigames > Spleef (marcar centro, raio, camadas, salvar, pontos, placar,
// configurações, resetar, começar e encerrar) e o comando /vulpus:spleef [ação], que também serve a quem joga.
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, salvarConfig } from "../core/db.js";
import { confirmar, Lista, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { localDe } from "../core/teleporte.js";
import { erro, msg, nomeDimensao, ok } from "../core/util.js";
import * as geral from "../textos/geral.js";
import * as textos from "../textos/spleef.js";
import * as arena from "./spleef_arena.js";
import * as spleef from "./spleef.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/db.js").Config} Config */
/** @typedef {import("./spleef_arena.js").Arena} Arena */

/** @type {(keyof Config)[]} */
const CHAVES = [
  "spleefLigado",
  "spleefMinimo",
  "spleefMaximo",
  "spleefContagem",
  "spleefContagemCheia",
  "spleefDuracaoMin",
  "spleefPremioVitoria",
  "spleefPremioParticipar",
  "spleefPremiosDia",
  "spleefXp",
  "spleefFerramenta",
  "spleefEficiencia",
  "spleefBolas",
  "spleefRecargaBola",
];

/** @type {Partial<Record<keyof Config, [number, number]>>} */
const FAIXAS = {
  spleefMinimo: [2, 16],
  spleefMaximo: [2, 32],
  spleefContagem: [3, 120],
  spleefContagemCheia: [3, 120],
  spleefDuracaoMin: [1, 30],
  spleefPremioVitoria: [0, 100000],
  spleefPremioParticipar: [0, 100000],
  spleefPremiosDia: [0, 100],
  spleefXp: [0, 10000],
  spleefEficiencia: [0, 5],
  spleefRecargaBola: [1, 60],
};

/** Nomes das fases para a staff. */
const FASES = {
  livre: "livre",
  contagem: "contagem",
  preparando: "largada",
  jogando: "valendo",
  fim: "terminando",
  resetando: "repondo a neve",
};

/**
 * Confere a staff (de novo, na hora da ação).
 * @param {Player} player
 */
function staffOk(player) {
  if (ehStaff(player)) return true;
  erro(player, geral.SO_STAFF);
  return false;
}

/**
 * Ação que mexe na arena: só sem partida e sem reset.
 * @param {Player} player
 */
function livreOk(player) {
  if (spleef.arenaLivre()) return true;
  erro(player, textos.DURANTE_PARTIDA);
  return false;
}

/**
 * Menu "Minigames" da staff (hoje só o Spleef; outros minigames entram aqui).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuMinigamesStaff(player, voltar) {
  if (!staffOk(player)) return;
  const aqui = () => menuMinigamesStaff(player, voltar);
  await new Lista(textos.TITULO_MINIGAMES)
    .texto(textos.MINIGAMES_CORPO)
    .botao(textos.BOTAO_SPLEEF, ICONES.spleef, (p) => menuSpleefStaff(p, aqui))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Painel do Spleef para a staff.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuSpleefStaff(player, voltar) {
  if (!staffOk(player)) return;
  const a = arena.lerArena();
  const aqui = () => menuSpleefStaff(player, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textos.TITULO_STAFF).texto(
    textos.CORPO_STAFF({
      temCentro: a.temCentro,
      dimensao: nomeDimensao(a.d),
      cx: a.cx,
      cz: a.cz,
      raio: a.raio,
      camadas: a.camadas.map((y, i) => ({ y, n: a.blocos[i] ?? 0 })),
      tipos: a.tipos,
      salvo: a.salvo !== "",
      salvoAtual: a.salvo === arena.assinatura(a),
      lobby: a.lobby,
      saida: a.saida,
      topo: a.topo,
      placar: a.placar,
      pronta: spleef.motivoArena(),
      fase: FASES[spleef.faseAtual()],
      fila: spleef.filaAtual().length,
    }),
  );
  lista
    .cabecalho("Arena")
    .botao(textos.BOTAO_CENTRO, ICONES.spawn, eVolta(marcarCentro))
    .botao(textos.BOTAO_RAIO, ICONES.editar, eVolta(ajustarRaio))
    .botao(textos.BOTAO_CAMADAS, ICONES.neve, eVolta(detectar))
    .botao(textos.BOTAO_TIPOS, ICONES.catBlocos, eVolta(editarTipos))
    .botao(textos.BOTAO_SALVAR, ICONES.banco, eVolta(salvarEstado))
    .cabecalho("Pontos")
    .botao(textos.BOTAO_LOBBY, ICONES.membros, eVolta((p) => marcarPonto(p, "lobby")))
    .botao(textos.BOTAO_SAIDA, ICONES.sair, eVolta((p) => marcarPonto(p, "saida")))
    .botao(a.topo ? textos.BOTAO_TOPO_PADRAO : textos.BOTAO_TOPO, ICONES.nova, eVolta((p) => (a.topo ? tirarTopo(p) : marcarPonto(p, "topo"))))
    .botao(a.placar ? textos.BOTAO_PLACAR_TIRAR : textos.BOTAO_PLACAR, ICONES.ranking, eVolta((p) => (a.placar ? tirarPlacar(p) : marcarPonto(p, "placar"))))
    .cabecalho("Jogo")
    .botao(textos.BOTAO_CONFIG, ICONES.ajustes, eVolta(editarConfig))
    .botao(textos.BOTAO_RESETAR, ICONES.ordenar, eVolta(resetar))
    .botao(textos.BOTAO_COMECAR, ICONES.sim, eVolta(comecar))
    .botao(textos.BOTAO_PARAR, ICONES.nao, eVolta(parar));
  await lista.voltar(voltar).abrir(player);
}

/**
 * Detecta as camadas e guarda na arena.
 * @param {Arena} a
 * @returns {{ y: number, n: number }[] | undefined}  undefined = chunk não carregado
 */
function aplicarDeteccao(a) {
  const achou = arena.detectarCamadas(a);
  if (!achou) return undefined;
  a.camadas = achou.camadas;
  a.blocos = achou.blocos;
  arena.salvarArena(a);
  arena.garantirArea(a);
  spleef.arenaMudou();
  return a.camadas.map((y, i) => ({ y, n: a.blocos[i] }));
}

/**
 * "Marcar centro aqui": guarda x/z do bloco e a dimensão, mede o raio pela neve embaixo (ou na coluna) e detecta
 * as camadas.
 * @param {Player} player
 */
export function marcarCentro(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  const { x, y, z } = player.location;
  const dim = player.dimension;
  a.d = dim.id;
  a.cx = Math.floor(x);
  a.cz = Math.floor(z);
  a.cy = Math.floor(y);
  a.temCentro = true;
  // A camada embaixo dos pés (ou a primeira descendo pela coluna) mede o raio.
  /** @type {ReturnType<typeof arena.medirRaio>} */
  let medida;
  for (let dy = 1; dy <= 16 && !medida; dy++) medida = arena.medirRaio(dim, a.cx, a.cy - dy, a.cz, a.tipos);
  if (medida) {
    a.cx = medida.cx;
    a.cz = medida.cz;
    a.raio = Math.min(arena.RAIO_MAX, Math.max(arena.RAIO_MIN, medida.raio));
  }
  arena.salvarArena(a);
  const camadas = aplicarDeteccao(a);
  if (!medida) {
    erro(player, textos.CENTRO_SEM_NEVE);
    return;
  }
  if (!camadas) {
    erro(player, textos.CARREGANDO);
    return;
  }
  if (medida.raio < arena.RAIO_MIN) msg(player, textos.RAIO_PEQUENO(medida.raio));
  ok(player, textos.CENTRO_OK(a.raio, camadas, medida.recentrou));
}

/**
 * Raio à mão (3..32) e as camadas de novo.
 * @param {Player} player
 */
async function ajustarRaio(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  if (!a.temCentro) {
    erro(player, textos.PRECISA_CENTRO);
    return;
  }
  const r = await perguntar(player, textos.BOTAO_RAIO, [
    { tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao: a.raio, min: arena.RAIO_MIN, max: arena.RAIO_MAX },
  ]);
  if (!r || !staffOk(player) || !livreOk(player)) return;
  const b = arena.lerArena();
  b.raio = r[0];
  arena.salvarArena(b);
  if (!aplicarDeteccao(b)) {
    erro(player, textos.CARREGANDO);
    return;
  }
  ok(player, textos.RAIO_OK(b.raio));
}

/**
 * "Detectar camadas".
 * @param {Player} player
 */
export function detectar(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  if (!a.temCentro) {
    erro(player, textos.PRECISA_CENTRO);
    return;
  }
  const camadas = aplicarDeteccao(a);
  if (!camadas) {
    erro(player, textos.CARREGANDO);
    return;
  }
  if (camadas.length) ok(player, textos.CAMADAS_OK(camadas));
  else erro(player, textos.CAMADAS_OK(camadas));
}

/**
 * Lista de blocos que formam as camadas.
 * @param {Player} player
 */
async function editarTipos(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  const r = await perguntar(player, textos.BOTAO_TIPOS, [
    { tipo: "texto", rotulo: textos.ROTULO_TIPOS, dica: "minecraft:snow", padrao: a.tipos.join(", ") },
  ]);
  if (!r || !staffOk(player) || !livreOk(player)) return;
  const lido = arena.lerTipos(String(r[0]));
  if ("invalido" in lido) {
    erro(player, textos.TIPO_INVALIDO(lido.invalido));
    return;
  }
  const b = arena.lerArena();
  b.tipos = lido.tipos;
  arena.salvarArena(b);
  if (b.temCentro) aplicarDeteccao(b);
  ok(player, textos.TIPOS_OK);
}

/**
 * "Salvar estado da arena" (com confirmação).
 * @param {Player} player
 */
async function salvarEstado(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  if (!a.temCentro) return erro(player, textos.PRECISA_CENTRO);
  if (!a.camadas.length) return erro(player, textos.PRECISA_CAMADAS);
  const camadas = a.camadas.map((y, i) => ({ y, n: a.blocos[i] ?? 0 }));
  const sim = await confirmar(player, { titulo: textos.BOTAO_SALVAR, texto: textos.SALVAR_CONFIRMA(camadas, arena.celulas(a.raio).length) });
  if (!sim) return;
  salvarAgora(player);
}

/**
 * Salva sem perguntar (comando).
 * @param {Player} player
 */
export function salvarAgora(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  if (!a.temCentro) return erro(player, textos.PRECISA_CENTRO);
  if (!a.camadas.length) return erro(player, textos.PRECISA_CAMADAS);
  const r = arena.salvarEstado(a);
  spleef.arenaMudou();
  if (r === "carregando") return erro(player, textos.CARREGANDO);
  if (r === "falhou") return erro(player, textos.SALVAR_FALHOU);
  const salva = arena.lerArena();
  ok(player, textos.SALVO_OK(salva.camadas.length, salva.total));
}

/**
 * Marca um ponto onde a staff está (espera, saída, entrada no topo ou placar).
 * @param {Player} player
 * @param {"lobby" | "saida" | "topo" | "placar"} qual
 */
export function marcarPonto(player, qual) {
  if (!staffOk(player)) return;
  if ((qual === "topo" || qual === "saida") && !livreOk(player)) return;
  const a = arena.lerArena();
  const aqui = localDe(player);
  if (qual !== "placar" && a.temCentro && aqui.d !== a.d) return erro(player, textos.OUTRA_DIMENSAO);
  const dentro = arena.naZona(a, aqui.d, { x: Math.floor(aqui.x), y: Math.floor(aqui.y), z: Math.floor(aqui.z) });
  if (qual === "saida" && dentro) return erro(player, textos.SAIDA_DENTRO);
  if (qual === "lobby" && dentro) return erro(player, textos.ESPERA_DENTRO);
  if (qual === "topo") {
    if (!a.temCentro) return erro(player, textos.PRECISA_CENTRO);
    if (arena.distancia(a, aqui.x, aqui.z) > a.raio - 1) return erro(player, textos.TOPO_FORA);
  }
  if (qual === "placar") {
    // O texto fica um pouco acima da cabeça de quem marcou, no meio do bloco.
    a.placar = { x: Math.floor(aqui.x) + 0.5, y: Math.floor(aqui.y) + 1.5, z: Math.floor(aqui.z) + 0.5, d: aqui.d };
  } else a[qual] = aqui;
  arena.salvarArena(a);
  spleef.arenaMudou();
  const nomes = { lobby: textos.NOME_LOBBY, saida: textos.NOME_SAIDA, topo: textos.NOME_TOPO, placar: textos.NOME_PLACAR };
  ok(player, textos.PONTO_OK(nomes[qual]));
  if (qual === "placar") spleef.atualizarPlacar();
}

/** @param {Player} player */
function tirarTopo(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  a.topo = null;
  arena.salvarArena(a);
  ok(player, textos.TOPO_PADRAO_OK);
}

/** @param {Player} player */
function tirarPlacar(player) {
  if (!staffOk(player)) return;
  const a = arena.lerArena();
  a.placar = null;
  arena.salvarArena(a);
  spleef.atualizarPlacar();
  ok(player, textos.PLACAR_TIRADO);
}

/**
 * Configurações do Spleef (salva só o que mudou).
 * @param {Player} player
 */
async function editarConfig(player) {
  if (!staffOk(player)) return;
  const atual = config();
  /** @type {import("../core/forms.js").Campo[]} */
  const campos = CHAVES.map((chave) => {
    const rotulo = textos.CAMPOS[/** @type {keyof typeof textos.CAMPOS} */ (chave)];
    const valor = atual[chave];
    if (chave === "spleefFerramenta") {
      const i = spleef.FERRAMENTAS.indexOf(String(valor));
      return { tipo: "lista", rotulo, opcoes: textos.FERRAMENTAS, padrao: i < 0 ? 4 : i };
    }
    if (typeof valor === "boolean") return { tipo: "alternar", rotulo, padrao: valor };
    const [min, max] = FAIXAS[chave] ?? [0, 100000];
    return { tipo: "numero", rotulo, padrao: valor, min, max };
  });
  const valores = await perguntar(player, textos.TITULO_CONFIG, campos);
  if (!valores || !staffOk(player)) return;
  /** @type {Record<string, unknown>} */
  const mudancas = {};
  CHAVES.forEach((chave, i) => {
    const valor = chave === "spleefFerramenta" ? spleef.FERRAMENTAS[valores[i]] ?? spleef.FERRAMENTAS[4] : valores[i];
    if (valor !== atual[chave]) mudancas[chave] = valor;
  });
  const minimo = /** @type {number} */ (mudancas.spleefMinimo ?? atual.spleefMinimo);
  const maximo = /** @type {number} */ (mudancas.spleefMaximo ?? atual.spleefMaximo);
  if (minimo > maximo) {
    erro(player, textos.MIN_MAIOR);
    delete mudancas.spleefMinimo;
    delete mudancas.spleefMaximo;
  }
  const mudou = Object.keys(mudancas);
  if (!mudou.length) {
    msg(player, textos.CONFIG_IGUAL);
    return;
  }
  salvarConfig(/** @type {Partial<Config>} */ (mudancas));
  ok(player, textos.CONFIG_SALVA(mudou.map((c) => textos.CAMPOS[/** @type {keyof typeof textos.CAMPOS} */ (c)])));
}

/**
 * Repor a neve agora.
 * @param {Player} player
 */
export async function resetar(player) {
  if (!staffOk(player) || !livreOk(player)) return;
  const a = arena.lerArena();
  if (!a.salvo) return erro(player, textos.NAO_PRONTA_SALVO);
  const n = await spleef.resetarPelaStaff();
  if (n === undefined) erro(player, textos.RESET_FALHOU);
  else ok(player, textos.RESET_FEITO(n));
}

/** @param {Player} player */
export function comecar(player) {
  if (!staffOk(player)) return;
  if (spleef.filaAtual().length < 2) return erro(player, textos.COMECAR_POUCOS);
  if (spleef.comecarJa()) ok(player, textos.COMECANDO);
  else erro(player, spleef.motivoArena() || textos.FALTOU_GENTE);
}

/** @param {Player} player */
export function parar(player) {
  if (!staffOk(player)) return;
  if (spleef.encerrarPelaStaff()) ok(player, textos.PARADA);
  else erro(player, textos.SEM_PARTIDA);
}

spleef.aoAbrirStaff(menuSpleefStaff);

/** Ações de /vulpus:spleef <ação> (as de staff conferem a permissão dentro). */
/** @type {Record<string, (p: Player) => any>} */
const ACOES = {
  entrar: (p) => spleef.entrarFila(p),
  fila: (p) => spleef.entrarFila(p),
  sair: (p) => (spleef.estaJogando(p.id) ? spleef.desistir(p) : spleef.sairFila(p)),
  ranking: (p) => spleef.menuRanking(p),
  como: (p) => spleef.menuComoJogar(p),
  staff: (p) => menuSpleefStaff(p),
  centro: marcarCentro,
  camadas: detectar,
  salvar: salvarAgora,
  resetar,
  espera: (p) => marcarPonto(p, "lobby"),
  lobby: (p) => marcarPonto(p, "lobby"),
  saida: (p) => marcarPonto(p, "saida"),
  topo: (p) => marcarPonto(p, "topo"),
  placar: (p) => marcarPonto(p, "placar"),
  comecar,
  parar,
};

registrarComando(
  { nome: "spleef", descricao: textos.DESC_SPLEEF, parametros: [{ nome: "acao", tipo: "texto", opcional: true }] },
  (p, [acao]) => {
    if (acao === undefined || String(acao).trim() === "") return spleef.menuSpleef(p);
    const chave = String(acao)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const fn = ACOES[chave];
    if (fn) return fn(p);
    erro(p, textos.ACAO_DESCONHECIDA(String(acao)));
    if (ehStaff(p)) msg(p, textos.ACOES_STAFF);
  },
);
