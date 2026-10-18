// @ts-check
// Música e sons de ambiente. Cada pessoa "está" em, no máximo, um ambiente sonoro (textos/musicas.js, gerado por
// tools/sons_publicar.py a partir de Sons/_ambientes.json). Prioridade: mistério (capítulo) > feira > vila > lobby.
//   lobby = círculo do lobby protegido; feira e vila = círculos que a staff marca (painel Mundo e locais > Zonas de música);
//   mistério = capituloAtual(player) (0 poço ... 7 campo de trigo) mapeado em arg_poco ... arg_campo.
// Por pessoa e por ambiente:
//   1. MÚSICA: sacola embaralhada (todas tocam antes de repetir; nunca a mesma duas vezes seguidas; a sacola nova não começa
//      com a última). `music play` (substitui a música do Minecraft) na primeira e `music queue` quando a pausa sorteada é < 1 s
//      (sem vão); nas outras, espera o fim + a pausa e dá `play`. Camadas curtas (loop) repetem por um tempo sorteado e saem com fade.
//   2. PAUSAS de silêncio entre faixas, sorteadas em 'pausa' do ambiente.
//   3. PONTUAIS: sons curtos sorteados por peso em intervalos aleatórios 'pontualACada', com volume e tom sorteados, sem repetir o
//      anterior, vindos de uma direção aleatória quando 'posicional'. Os de 'susto' só tocam para quem não desligou as pegadinhas.
//   4. Trocar de ambiente: `music stop` com fade e o novo começa depois do fade; sair de tudo: `music stop <fade>`.
// Desligar (configuração ou opção pessoal) para tudo na hora. Um laço a cada 20 ticks, estado por pessoa limpo ao sair do jogo.
import { system, world } from "@minecraft/server";
import { registrarComando } from "../core/comandos.js";
import { config, dadosJogador, editarJogador, lerMundo, salvarMundo } from "../core/db.js";
import { posicoesOnline } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, limitar, msg, ok, registrarErro } from "../core/util.js";
import * as textosAjustes from "../textos/ajustes.js";
import * as textos from "../textos/musica.js";
import { AMBIENTES } from "../textos/musicas.js";
import { capituloAtual } from "./arg.js";
import { lobbyAtual, mostrarLimite } from "./lobby.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../textos/musicas.js").AmbienteSom} Ambiente */
/** @typedef {{ d: string, x: number, y: number, z: number, r: number }} Zona */

const CICLO = 20;
const TPS = 20;
/** Quantos ticks antes do fim da faixa já se decide a pausa (e se enfileira a próxima, quando não há pausa). */
const JANELA = 2 * TPS;
const FADE_BASE = 4;
/** Ambientes do mistério, na ordem dos capítulos (arg.js: capituloAtual 0..7). */
const AMBIENTE_ARG = ["arg_poco", "arg_lago", "arg_casa", "arg_caverna", "arg_corredor", "arg_sala", "arg_trem", "arg_campo"];
/** Zonas que a staff marca, da mais para a menos prioritária. */
export const ZONAS_IDS = ["feira", "vila"];
const CHAVE_ZONAS = "vulpus:musica_zonas";
export const ZONA_RAIO = { padrao: 40, min: 5, max: 1000 };
/** Pontual: distância (blocos) da pessoa em que o som "nasce" quando é posicional. */
const DIST_POSICIONAL = [8, 26];
/** Quantos pontuais recentes pesam menos no sorteio (além de o último nunca repetir). */
const MEMORIA_PONTUAL = 3;

/**
 * @typedef {{
 *   amb: string, ordem: number[], proximo: number, ultima: number, fim: number, inicio: number, loop: boolean, saindo: boolean,
 *   tocou: boolean, atraso: number, proxPont: number, ultimoPont: number, recentes: number[], faixaId?: string,
 * }} Estado
 *   ordem/proximo/ultima = sacola de músicas; fim = tick em que acaba o que já foi pedido; inicio = tick em que a próxima
 *   começa (-1 = nada agendado); loop/saindo = a camada atual repete e já recebeu o fade de saída; tocou = já pediu música
 *   (então sair exige `music stop`); atraso = ticks de espera antes da primeira faixa; proxPont/ultimoPont/recentes = pontuais.
 */
/** @type {Map<string, Estado>} */
const estados = new Map();

// ------------------------------------------------------------------------------------------------ zonas da staff
/** @type {Record<string, Zona> | undefined} */
let zonas;

/** @param {unknown} v @returns {v is Zona} */
function ehZona(v) {
  const z = /** @type {any} */ (v);
  return !!z && typeof z.d === "string" && [z.x, z.y, z.z, z.r].every((n) => typeof n === "number" && Number.isFinite(n));
}

/** @returns {Record<string, Zona>} */
function todasZonas() {
  if (zonas) return zonas;
  /** @type {Record<string, Zona>} */
  const lidas = {};
  const salvo = lerMundo(CHAVE_ZONAS);
  if (salvo && typeof salvo === "object") {
    for (const id of ZONAS_IDS) if (ehZona(salvo[id])) lidas[id] = salvo[id];
  }
  zonas = lidas;
  return lidas;
}

/** @param {string} id @returns {Zona | undefined} */
export const zonaDe = (id) => todasZonas()[id];

/**
 * Marca a zona de música `id` onde a pessoa está.
 * @param {Player} player
 * @param {string} id  "feira" ou "vila"
 * @param {number} [raio]  sem raio, mantém o atual (ou o padrão)
 */
export function definirZona(player, id, raio) {
  if (!ZONAS_IDS.includes(id)) return;
  const r = limitar(Math.floor(raio ?? zonaDe(id)?.r ?? ZONA_RAIO.padrao), ZONA_RAIO.min, ZONA_RAIO.max);
  const { x, y, z } = player.location;
  /** @type {Zona} */
  const nova = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, d: player.dimension.id, r };
  const todas = { ...todasZonas(), [id]: nova };
  if (!salvarMundo(CHAVE_ZONAS, todas)) {
    erro(player, "Não consegui salvar a zona de música. Tenta de novo?");
    return;
  }
  zonas = todas;
  ok(player, textos.ZONA_DEFINIDA(id, formatarCoords(nova), r));
  mostrarLimite(nova);
}

/** @param {Player} player @param {string} id */
export function removerZona(player, id) {
  const todas = { ...todasZonas() };
  if (!todas[id]) {
    erro(player, textos.SEM_ZONA(id));
    return;
  }
  delete todas[id];
  salvarMundo(CHAVE_ZONAS, Object.keys(todas).length ? todas : undefined);
  zonas = todas;
  ok(player, textos.ZONA_REMOVIDA(id));
}

/** Resumo para o painel da staff. */
export const resumoZonas = () => textos.RESUMO_ZONAS(todasZonas());

// ---------------------------------------------------------------------------------------------------- sorteios
/** @param {number} n @returns {number[]} */
function embaralhar(n) {
  const v = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}

/** Próxima música da sacola; nunca igual à anterior (quando há mais de uma). @param {Estado} e @param {number} n */
function proximaFaixa(e, n) {
  if (e.proximo >= e.ordem.length || e.ordem.length !== n) {
    e.ordem = embaralhar(n);
    if (n > 1 && e.ordem[0] === e.ultima) {
      const j = 1 + Math.floor(Math.random() * (n - 1));
      [e.ordem[0], e.ordem[j]] = [e.ordem[j], e.ordem[0]];
    }
    e.proximo = 0;
  }
  const f = e.ordem[e.proximo++];
  e.ultima = f;
  return f;
}

/** Número uniforme entre os dois valores (aceita a faixa invertida). @param {number[]} faixa */
function entre(faixa) {
  const [a, b] = [Number(faixa[0]) || 0, Number(faixa[1] ?? faixa[0]) || 0];
  return Math.min(a, b) + Math.random() * Math.abs(b - a);
}

/** @param {number} v */
const arredondar = (v) => Math.round(v * 100) / 100;

/**
 * Sorteia um pontual por peso: o último nunca repete (havendo outro) e os 3 mais recentes pesam menos.
 * @param {Estado} e
 * @param {Ambiente} amb
 * @param {boolean} querSusto
 * @returns {number} índice em amb.pontuais, ou -1
 */
function sortearPontual(e, amb, querSusto) {
  /** @type {number[]} */
  let elegiveis = [];
  amb.pontuais.forEach((s, i) => {
    if (s.peso > 0 && (querSusto || !s.susto)) elegiveis.push(i);
  });
  if (elegiveis.length > 1) elegiveis = elegiveis.filter((i) => i !== e.ultimoPont);
  if (elegiveis.length === 0) return -1;
  const pesos = elegiveis.map((i) => amb.pontuais[i].peso * (e.recentes.includes(i) ? 0.35 : 1));
  let sorte = Math.random() * pesos.reduce((a, b) => a + b, 0);
  for (let k = 0; k < elegiveis.length; k++) {
    sorte -= pesos[k];
    if (sorte < 0) return elegiveis[k];
  }
  return elegiveis[elegiveis.length - 1];
}

// ------------------------------------------------------------------------------------------------- comandos
/** @param {Player} p @param {string} comando */
function comando(p, comando) {
  try {
    p.runCommand(comando);
  } catch (e) {
    registrarErro("Música: " + comando, e);
  }
}

/**
 * Como tocar a música: "" (o /music aceita a chave do music_definitions), "music." (aceita o nome da definição de som), ou null
 * (o /music não aceitou nenhum: toca com player.playSound("music.<id>"), sem fila nem fade do jogo, só os fades gravados no
 * arquivo). undefined = ainda não descobri.
 * @type {string | null | undefined}
 */
let formaDoId;

/**
 * Descobre (uma vez) qual nome de faixa o comando /music aceita e devolve o id já na forma certa. Tenta em volume 0, sem fade.
 * @param {Player} p @param {string} id
 */
function idNoComando(p, id) {
  if (formaDoId !== undefined) return (formaDoId ?? "") + id;
  for (const forma of ["", "music."]) {
    try {
      const r = p.runCommand(`music play ${forma}${id} 0 0 play_once`);
      if ((r?.successCount ?? 0) > 0) {
        formaDoId = forma;
        try {
          p.runCommand("music stop 0");
        } catch {
          // nada tocando
        }
        return forma + id;
      }
    } catch {
      // esse nome não existe: tenta o outro
    }
  }
  registrarErro("Música: o /music não aceitou o nome da faixa; passo a tocar com playSound", id);
  formaDoId = null;
  return id;
}

/** Toca uma faixa pelo modo de fallback (playSound), parando a música do Minecraft. @param {Player} p @param {string} id @param {number} vol */
function tocarPorSom(p, id, vol) {
  comando(p, "music stop 0");
  try {
    p.playSound(`music.${id}`, { volume: Math.max(0.01, vol), pitch: 1 });
  } catch (e) {
    registrarErro(`Música: playSound ${id}`, e);
  }
}

/** Relatório de diagnóstico para a staff: onde a pessoa está, config, e o que o jogo respondeu aos comandos de música. @param {Player} p */
function diagnostico(p) {
  const cfg = config();
  const l = p.location;
  const j = { p, d: p.dimension.id, x: l.x, z: l.z };
  const amb = ambienteDe(j);
  const lob = lobbyAtual();
  const linhas = [
    `§6Diagnóstico da música`,
    `§7Ligada: §f${cfg.musicaLigada} §7| volume: §f${cfg.musicaVolume}% §7| sua opção pessoal: §f${dadosJogador(p).ajustes.musica}`,
    `§7Lobby: §f${lob ? `${formatarCoords(lob)} raio ${lob.r}` : "NÃO DEFINIDO (use /vulpus:definirlobby)"} §7| dentro dele: §f${dentro(j, lob)}`,
    `§7Ambiente agora: §f${amb || "nenhum"} §7| capítulo do mistério: §f${capituloAtual(p)}`,
  ];
  const faixa = (AMBIENTES.lobby?.musicas ?? [])[0];
  if (!faixa) {
    linhas.push("§cO ambiente 'lobby' não tem músicas em textos/musicas.js.");
  } else {
    for (const forma of ["", "music."]) {
      let resultado;
      try {
        const r = p.runCommand(`music play ${forma}${faixa.id} 0.3 0 play_once`);
        resultado = `successCount ${r?.successCount ?? "?"}`;
      } catch (e) {
        resultado = `ERRO: ${String(e).slice(0, 90)}`;
      }
      linhas.push(`§7music play §f${forma}${faixa.id}§7 -> §f${resultado}`);
    }
    let tocou;
    try {
      p.playSound(`music.${faixa.id}`, { volume: 0.3, pitch: 1 });
      tocou = "sem erro (se você ouviu, o playSound funciona)";
    } catch (e) {
      tocou = `ERRO: ${String(e).slice(0, 90)}`;
    }
    linhas.push(`§7playSound §fmusic.${faixa.id}§7 -> §f${tocou}`);
    system.runTimeout(() => {
      comando(p, "music stop 1");
      comando(p, `stopsound @s music.${faixa.id}`);
    }, 100);
    linhas.push("§7(a faixa de teste toca uns 5 s em volume baixo; se ouviu, o nome funciona)");
  }
  linhas.push(`§7modo em uso: §f${formaDoId === undefined ? "ainda não descoberto" : formaDoId === null ? "playSound (o /music não aceitou)" : `/music com o nome "${formaDoId}"`}`);
  for (const t of linhas) msg(p, t);
}

/** Fade (s) do ambiente: o do lobby é o `musicaFadeSeg` da config; os outros ficam proporcionais ao 'fade' do JSON. @param {Ambiente | undefined} amb @param {{ musicaFadeSeg: number }} cfg */
const fadeDe = (amb, cfg) => Math.max(0, Math.round((((amb?.fade) || FADE_BASE) / FADE_BASE) * cfg.musicaFadeSeg * 10) / 10);

/** Pede ao jogo mais uma faixa. @param {Player} p @param {Estado} e @param {Ambiente} amb @param {ReturnType<typeof config>} cfg @param {number} agora @param {"play" | "queue"} modo */
function pedir(p, e, amb, cfg, agora, modo) {
  const faixa = proximaFaixa(e, amb.musicas.length);
  const m = amb.musicas[faixa];
  const vol = arredondar((limitar(cfg.musicaVolume, 0, 100) / 100) * m.volume);
  const idCmd = idNoComando(p, m.id);
  const fade = fadeDe(amb, cfg);
  if (formaDoId === null) {
    // fallback: sem fila nem fade do jogo; a faixa toca inteira e a próxima só começa quando acabar
    tocarPorSom(p, m.id, vol);
    e.fim = agora + m.segundos * TPS;
    e.loop = false;
    e.faixaId = m.id;
    e.tocou = true;
    return;
  }
  if (m.loop) {
    comando(p, `music play ${idCmd} ${vol} ${fade} loop`);
    e.fim = agora + Math.round(entre(m.tempo ?? [90, 180]) * TPS);
    e.loop = true;
    e.saindo = false;
  } else {
    comando(p, `music ${modo} ${idCmd} ${vol} ${fade} play_once`);
    e.fim = (modo === "queue" ? e.fim : agora) + m.segundos * TPS;
    e.loop = false;
  }
  e.tocou = true;
}

/** Para a música da pessoa (com fade) e esquece o estado. @param {Player} p @param {number} fade */
function parar(p, fade) {
  const e = estados.get(p.id);
  estados.delete(p.id);
  if (!e?.tocou) return;
  if (formaDoId === null) {
    if (e.faixaId) comando(p, `stopsound @s music.${e.faixaId}`);
    return;
  }
  comando(p, `music stop ${Math.max(0, fade)}`);
}

// --------------------------------------------------------------------------------------------------- ambientes
/** @param {{ d: string, x: number, z: number }} j @param {Zona | undefined} z */
const dentro = (j, z) => !!z && z.d === j.d && Math.hypot(j.x - z.x, j.z - z.z) <= z.r;

/** @param {Ambiente | undefined} a */
const temSom = (a) => !!a && (a.musicas.length > 0 || a.pontuais.length > 0);

/**
 * Em que ambiente sonoro a pessoa está (o de maior prioridade que tenha som), ou "" se em nenhum.
 * @param {{ p: Player, d: string, x: number, z: number }} j
 */
export function ambienteDe(j) {
  const cap = capituloAtual(j.p);
  const arg = cap >= 0 ? AMBIENTE_ARG[cap] : undefined;
  if (arg && temSom(AMBIENTES[arg])) return arg;
  for (const id of ZONAS_IDS) if (dentro(j, zonaDe(id)) && temSom(AMBIENTES[id])) return id;
  if (dentro(j, lobbyAtual()) && temSom(AMBIENTES.lobby)) return "lobby";
  return "";
}

/** Pessoa em condições de ouvir? @param {Player} p */
const querMusica = (p) => dadosJogador(p).ajustes.musica;

/** @param {string} amb @param {number} atraso @returns {Estado} */
const novoEstado = (amb, atraso) => ({
  amb, ordem: [], proximo: 0, ultima: -1, fim: 0, inicio: -1, loop: false, saindo: false, tocou: false, atraso,
  proxPont: -1, ultimoPont: -1, recentes: [],
});

/** @param {{ p: Player }} j @param {Estado} e @param {Ambiente} amb @param {ReturnType<typeof config>} cfg @param {number} agora */
function cicloMusica(j, e, amb, cfg, agora) {
  if (amb.musicas.length === 0) return;
  // modo playSound: as faixas ficam na categoria 'ambient', então dá para calar a música do Minecraft de tempos em tempos sem cortar a nossa
  if (formaDoId === null && e.tocou && agora % 200 < CICLO) comando(j.p, "music stop 0");
  const faltando = e.fim - agora;
  if (e.loop && !e.saindo && e.inicio < 0 && faltando <= fadeDe(amb, cfg) * TPS + CICLO) {
    if (formaDoId !== null) comando(j.p, `music stop ${fadeDe(amb, cfg)}`); // a camada acabou o tempo: sai com fade e a próxima vem depois da pausa
    e.saindo = true;
  }
  if (e.inicio < 0) {
    if (e.fim === 0) e.inicio = agora + e.atraso;
    else if (faltando <= JANELA) {
      const pausa = entre(amb.pausa);
      if (pausa < 1 && faltando > 0 && !e.loop && formaDoId !== null) pedir(j.p, e, amb, cfg, agora, "queue"); // sem vão: entra na fila do jogo
      else e.inicio = e.fim + Math.round(pausa * TPS);
    }
  }
  if (e.inicio >= 0 && agora >= e.inicio) {
    e.inicio = -1;
    pedir(j.p, e, amb, cfg, agora, "play");
  }
}

/** @param {import("../core/jogadores.js").PosJogador} j @param {Estado} e @param {Ambiente} amb @param {ReturnType<typeof config>} cfg @param {number} agora */
function cicloPontual(j, e, amb, cfg, agora) {
  if (!cfg.musicaPontuaisLigados || amb.pontuais.length === 0) return;
  if (e.proxPont < 0) {
    e.proxPont = agora + Math.round(entre(amb.pontualACada) * 0.5 * TPS); // o primeiro vem mais cedo
    return;
  }
  if (agora < e.proxPont) return;
  e.proxPont = agora + Math.round(entre(amb.pontualACada) * TPS);
  const i = sortearPontual(e, amb, dadosJogador(j.p).ajustes.pegadinhas);
  if (i < 0) return;
  const s = amb.pontuais[i];
  e.ultimoPont = i;
  e.recentes.push(i);
  if (e.recentes.length > MEMORIA_PONTUAL) e.recentes.shift();
  const volume = arredondar(Math.max(0, Math.min(1, s.volume * (limitar(cfg.musicaPontuaisVolume, 0, 100) / 100))));
  if (volume <= 0) return;
  const pitch = arredondar(entre(s.tom));
  try {
    if (s.posicional) {
      const ang = Math.random() * Math.PI * 2;
      const dist = DIST_POSICIONAL[0] + Math.random() * (DIST_POSICIONAL[1] - DIST_POSICIONAL[0]);
      const location = { x: j.x + Math.cos(ang) * dist, y: j.y + Math.random() * 4 - 1, z: j.z + Math.sin(ang) * dist };
      j.p.playSound(s.id, { location, volume, pitch });
    } else {
      j.p.playSound(s.id, { volume, pitch });
    }
  } catch (err) {
    registrarErro("Música: pontual " + s.id, err);
  }
}

function ciclo() {
  const cfg = config();
  const agora = system.currentTick;
  for (const j of posicoesOnline()) {
    try {
      const nome = cfg.musicaLigada && querMusica(j.p) ? ambienteDe(j) : "";
      let e = estados.get(j.id);
      if (!nome) {
        if (e) parar(j.p, fadeDe(AMBIENTES[e.amb], cfg));
        continue;
      }
      const amb = AMBIENTES[nome];
      if (e && e.amb !== nome) {
        // trocou de ambiente: o antigo sai com fade e o novo entra quando o fade acaba
        const antigo = AMBIENTES[e.amb] ?? amb;
        const fade = fadeDe(antigo, cfg);
        const tocou = e.tocou;
        parar(j.p, fade);
        e = undefined;
        estados.set(j.id, (e = novoEstado(nome, tocou ? Math.round(fade * TPS) + 10 : 0)));
      } else if (!e) {
        estados.set(j.id, (e = novoEstado(nome, 0)));
      }
      cicloMusica(j, e, amb, cfg, agora);
      cicloPontual(j, e, amb, cfg, agora);
    } catch (err) {
      registrarErro("Música: ciclo", err);
    }
  }
}

system.runInterval(ciclo, CICLO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  estados.delete(playerId);
});

// morreu ou renasceu: a fila do jogo se perde; recomeça do zero se ainda estiver em algum ambiente (o laço decide)
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  if (estados.has(player.id)) parar(player, 0);
});

/** Liga ou desliga a música e os sons de ambiente da própria pessoa (desligar para na hora). @param {Player} player */
export function alternarMusica(player) {
  const agora = !dadosJogador(player).ajustes.musica;
  editarJogador(player, (d) => {
    d.ajustes.musica = agora;
  });
  const e = estados.get(player.id);
  if (!agora && e) parar(player, fadeDe(AMBIENTES[e.amb], config()));
  return agora;
}

registrarComando({ nome: "musica", descricao: textos.DESC_MUSICA, parametros: [{ nome: "acao", tipo: "texto", opcional: true }] }, (p, [acao]) => {
  if (acao && String(acao).trim().toLowerCase() === "diag") {
    if (!ehStaff(p)) {
      erro(p, "O diagnóstico é só da staff.");
      return;
    }
    diagnostico(p);
    return;
  }
  msg(p, textosAjustes.MUSICA_MUDOU(alternarMusica(p)));
});
