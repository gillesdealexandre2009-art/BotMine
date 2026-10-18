// @ts-check
// O Intervalo: a dimensão intermediária da lore da VULPUS, feita como cinco regiões construídas por script no mundo comum (longe do
// spawn). Aqui ficam a construção sob demanda, as regiões do mistério (névoa, claridade, filtro de câmera antiga, lugar escondido do
// painel), os registros e enigmas 4 a 8 da bíblia, o progresso por pessoa e o painel do dono. A geometria está em intervalo_mapa.js e
// a lógica pura dos enigmas em intervalo_enigmas.js; todos os textos, em textos/intervalo.js.
import { GameMode, ItemLockMode, Player, system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { adicionarDetectorZona } from "../core/arg_zona.js";
import { adicionarDetectorFiltro } from "../core/filtro_tela.js";
import { lerMundo, salvarMundo } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { online, porId } from "../core/jogadores.js";
import { mostrarTitulo } from "../core/tela.js";
import { erro, formatarCoords, ok, registrarErro } from "../core/util.js";
import * as T from "../textos/intervalo.js";
import { NEVOAS } from "../textos/nevoas.js";
import { INDICE_PRIMEIRO_VIVO } from "../textos/props_modelos.js";
import * as E from "./intervalo_enigmas.js";
import { CAIXA, CHEGADA, PONTOS, PONTO_POR_POS, PORTAS, PROPS, REG, ROTULOS, ZONAS_NOME, construir, dentroDaCaixa, limpar, regiaoRelativa } from "./intervalo_mapa.js";
import { PincelMundo } from "./obras_pincel.js";
import { registrarComando } from "../core/comandos.js";
import { criar } from "./mg_itens.js";
import { posCofre } from "./mg_arena.js";
import { devolverItens, guardaDe, limparGuarda } from "./mg_cofre.js";
import { emMinigame, marcarFora } from "./mg_estado.js";
import { admitir, dimensaoMg, esperarCarga as esperarCargaMg, liberar, prepararAreas, soltarAreas as soltarAreasMg } from "./mg.js";
import { localSpawn } from "./spawn.js";
import * as sustos from "./pegadinhas.js";

/** @typedef {{ x: number, y: number, z: number, d: string }} Ponto */
/** @typedef {{ o: Ponto, built: boolean, bo?: Ponto, nevoas: string[], claros: boolean[], filtros: boolean[], ele: boolean, hud: boolean, dicaMin: number, janela: number }} Dados */

const CHAVE = "vulpus:intervalo";
const N = REG.length;
const ID_NEVOA = "vulpus_intervalo";
const TAG_SEM_EFEITOS = "vulpus_arg_off";
const TAG_LIVRE = "vulpus_int_livre";
const TAG_PROP = "vulpus_int_prop";
const CICLO = 10;
const DURACAO_CLARIDADE = 4800;
const ORCAMENTO_MS = 10;
const AREA_OBRA = "vulpus_intervalo_obra";
const AREA_VELHA = "vulpus_intervalo_velha";
/** A dimensão do Intervalo: separada do mundo comum, para ninguém entrar sem querer. Fica no vazio (gerador "void"). */
export const DIM_INTERVALO = "vulpus:intervalo";
const DIM_PADRAO = DIM_INTERVALO;
/** Bem longe do que existe na dimensão (os minigames ficam em outra, mas a distância evita qualquer vizinhança). */
const ORIGEM_PADRAO = Object.freeze({ x: 10000, y: 110, z: 10000, d: DIM_PADRAO });

let dimensaoRegistrada = false;
let erroDimensao = "";
// A dimensão só pode ser registrada na partida do sistema (startup).
system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
  if (!dimensionRegistry) return;
  try {
    dimensionRegistry.registerCustomDimension(DIM_INTERVALO);
    dimensaoRegistrada = true;
  } catch (e) {
    erroDimensao = String(e);
  }
});

world.afterEvents.worldLoad.subscribe(() => {
  const r = { registrada: dimensaoRegistrada, erro: erroDimensao };
  (r.erro ? console.warn : console.log)(`[Vulpus] Intervalo: dimensão ${dimensaoIntervalo() ? "disponível" : "indisponível"}${r.erro ? ` (${r.erro})` : ""}`);
});

/** Só isto pode existir lá dentro: o que é nosso (vulpus:*), itens soltos e a experiência. O resto (zumbis, esqueletos, aranhas...) some. */
const PERMITIDOS = new Set(["minecraft:player", "minecraft:item", "minecraft:xp_orb"]);
/** @param {import("@minecraft/server").Entity} e */
const intruso = (e) => e.dimension.id === DIM_INTERVALO && !e.typeId.startsWith("vulpus:") && !PERMITIDOS.has(e.typeId);
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  try {
    if (entity.isValid && intruso(entity)) entity.remove();
  } catch {
    // já saiu
  }
});
// varredura: pega o que já estava lá (de antes de a regra existir) e o que nasce sem avisar
system.runInterval(() => {
  try {
    const dim = dimensaoIntervalo();
    if (!dim) return;
    for (const e of dim.getEntities()) if (intruso(e)) e.remove();
  } catch {
    // dimensão ainda não carregada
  }
}, 200);

/** A dimensão do Intervalo, ou undefined se o mundo não a tem. */
export function dimensaoIntervalo() {
  try {
    return world.getDimension(DIM_INTERVALO);
  } catch {
    return undefined;
  }
}

/** Para o diagnóstico: a dimensão foi registrada? */
export const diagnosticoDimensao = () => ({ registrada: dimensaoRegistrada, erro: erroDimensao, pronta: !!dimensaoIntervalo() });

/** @type {Dados | undefined} */
let dados;

/** @param {any} p @returns {Ponto | undefined} */
const pontoValido = (p) => (p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => Number.isFinite(n)) ? { x: p.x, y: p.y, z: p.z, d: p.d } : undefined);

/** @returns {Dados} */
function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  const lista = (/** @type {any} */ v, /** @type {(i: number) => any} */ padrao, /** @type {string} */ tipo) => Array.from({ length: N }, (_, i) => (Array.isArray(v) && typeof v[i] === tipo ? v[i] : padrao(i)));
  dados = {
    o: pontoValido(s.o) && pontoValido(s.o)?.d === DIM_INTERVALO ? /** @type {Ponto} */ (pontoValido(s.o)) : { ...ORIGEM_PADRAO },
    built: s.built === true && !!pontoValido(s.bo),
    bo: pontoValido(s.bo),
    nevoas: lista(s.nevoas, () => "", "string"),
    claros: lista(s.claros, () => true, "boolean"),
    filtros: lista(s.filtros, (i) => i < 4, "boolean"),
    ele: s.ele === true,
    hud: s.hud !== false,
    dicaMin: Number.isFinite(s.dicaMin) ? Math.max(0, Math.min(120, Math.floor(s.dicaMin))) : 5,
    janela: Number.isFinite(s.janela) ? Math.max(10, Math.min(1800, Math.floor(s.janela))) : 120,
  };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** Estado da construção em andamento. */
const cons = { ocupado: false, fase: "", pct: 0 };

// ------------------------------------------------------------------------------------ o que o resto do addon enxerga
/** O Intervalo já foi construído no mundo? */
export const intervaloConstruido = () => lerDados().built && lerDados().bo?.d === DIM_INTERVALO;

/** Onde quem chega aparece (a Região A), ou undefined se ainda não foi construído. @returns {Ponto | undefined} */
export function pontoChegada() {
  const d = lerDados();
  if (!d.built || !d.bo || d.bo.d !== DIM_INTERVALO) return undefined;
  return { x: d.bo.x + CHEGADA.x, y: d.bo.y + CHEGADA.y, z: d.bo.z + CHEGADA.z, d: d.bo.d };
}

/** Se o ponto está dentro do Intervalo (para esconder o lugar do painel: casas, teleportes, /voltar). @param {Ponto} p */
export function dentroDoIntervalo(p) {
  const d = lerDados();
  const o = d.built && d.bo ? d.bo : cons.ocupado ? d.o : undefined;
  if (!o || p.d !== o.d) return false;
  return dentroDaCaixa(p.x - o.x, p.y - o.y, p.z - o.z);
}

adicionarDetectorZona((p) => dentroDoIntervalo(p));

/** @type {Map<string, number>} id → região em que a pessoa está agora (-1 = fora) */
const atual = new Map();

adicionarDetectorFiltro((player) => {
  const i = atual.get(player.id) ?? -1;
  return i >= 0 && lerDados().filtros[i] === true && !player.hasTag(TAG_SEM_EFEITOS);
});

/** Região do Intervalo em que a pessoa está (0-4), ou -1. @param {Player} player */
export const regiaoAtual = (player) => atual.get(player.id) ?? -1;

/** A porta final (a que leva à SONHE) é do mistério da Vulpus: arg.js registra aqui o que ela faz. @type {(p: Player) => void} */
let portaFinal = () => {};
/** @param {(p: Player) => void} fn */
export function definirPortaFinal(fn) {
  portaFinal = fn;
}

// ------------------------------------------------------------------------------------ utilidades
/** @param {Player} p @param {string} texto */
function narrar(p, texto) {
  try {
    p.sendMessage(texto);
  } catch (e) {
    registrarErro("Intervalo: mensagem", e);
  }
}

/** Coordenadas da pessoa em relação à origem construída. @param {Player} p */
function relativoA(p) {
  const o = lerDados().bo;
  if (!o) return undefined;
  const l = p.location;
  return { x: l.x - o.x, y: l.y - o.y, z: l.z - o.z };
}

/** Região (0-4) em que a pessoa está agora; dentro das paredes entre duas regiões, continua na que estava. @param {Player} p */
function regiaoDe(p) {
  const d = lerDados();
  if (!d.built || !d.bo || p.dimension.id !== d.bo.d) return -1;
  const r = relativoA(p);
  if (!r || !dentroDaCaixa(r.x, r.y, r.z)) return -1;
  const i = regiaoRelativa(r.x, r.y, r.z);
  return i >= 0 ? i : (atual.get(p.id) ?? 0);
}

/** @param {Player} p */
const semEfeitos = (p) => p.hasTag(TAG_SEM_EFEITOS);
/** @param {Player} p */
const portasLivres = (p) => ehDono(p) && p.hasTag(TAG_LIVRE);

/** Ponto absoluto de uma posição relativa. @param {number} x @param {number} y @param {number} z */
function absoluto(x, y, z) {
  const o = /** @type {Ponto} */ (lerDados().bo);
  return { x: o.x + x, y: o.y + y, z: o.z + z, d: o.d };
}

// ------------------------------------------------------------------------------------ névoa e claridade
/** A névoa padrão de cada região (se o dono não escolher outra): a neblina branca dreamcore em todo o Intervalo. */
const NEVOA_PADRAO_REGIAO = ["nevoeiro", "nevoeiro", "nevoeiro", "nevoeiro", "nevoeiro"];

/** Id completo da névoa de uma região ("" = nenhuma). @param {number} i */
function nevoaDaRegiao(i) {
  const escolhida = lerDados().nevoas[i];
  if (escolhida === "nenhuma") return "";
  if (NEVOAS.some((n) => n.id === escolhida)) return `vulpus:nevoa_${escolhida}`;
  return `vulpus:nevoa_${NEVOA_PADRAO_REGIAO[i] ?? "leve"}`;
}

/** @param {Player} p @param {string} id */
function pushNevoa(p, id) {
  try {
    p.runCommand(`fog @s push ${id} "${ID_NEVOA}"`);
  } catch {
    // sem a névoa
  }
}

/** @param {Player} p */
function tirarNevoa(p) {
  try {
    p.runCommand(`fog @s remove "${ID_NEVOA}"`);
  } catch {
    // sem a névoa
  }
}

/** @param {Player} p @param {number} i */
function entrarNaRegiao(p, i) {
  const id = p.id;
  const primeira = E.marcarRegiao(id, i);
  E.marcarEntrou(id);
  if (primeira) sustos.agendar(p, 40, () => narrar(p, T.NARRADORA[i]));
  if (semEfeitos(p)) return;
  if (lerDados().claros[i]) sustos.efeito(p, "night_vision", DURACAO_CLARIDADE, 0);
  else {
    try {
      p.removeEffect("night_vision");
    } catch {
      // sem o efeito
    }
  }
  tirarNevoa(p);
  const nevoa = nevoaDaRegiao(i);
  if (!nevoa) return;
  // entra em dois degraus (mais leve, depois a cheia) para não "estalar" ao trocar de região
  pushNevoa(p, `${nevoa}_t2`);
  sustos.agendar(p, 30, () => {
    if (!p.isValid || atual.get(p.id) !== i) return;
    tirarNevoa(p);
    pushNevoa(p, nevoa);
  });
}

/** @param {Player} p */
function sairDaRegiao(p) {
  tirarNevoa(p);
  glitchAte.delete(p.id);
  try {
    p.removeEffect("night_vision");
  } catch {
    // sem o efeito
  }
}

// ------------------------------------------------------------------------------------ clima de cada região
const aleatorio = (/** @type {number} */ n) => Math.floor(Math.random() * n);
/** @type {Map<string, number>} id → ticks acumulados dentro da região (as dicas sozinhas contam de 10 em 10 s) */
const acumulado = new Map();
/** @type {Map<string, number>} id → tick até o qual o painel falha */
const glitchAte = new Map();
/** @type {Map<string, number>} "id|zona" → tick da última leitura */
const ultimaZona = new Map();
/** @type {Map<string, number>} id → tick em que "Ele" apareceu pela última vez */
const ultimaEle = new Map();
/** O ponto onde "Ele" pode ser olhado (só com a opção ligada): ponta do corredor leste da A e ponta da plataforma da D. */
const PONTOS_ELE = [{ regiao: 0, x: 36.5, y: 2, z: 20.5 }, { regiao: 3, x: 158.5, y: 2, z: 33.5 }];

/** @param {Player} p @param {number} i @param {number} agora */
function clima(p, i, agora) {
  const cada = (/** @type {number} */ t) => agora % t < CICLO;
  if (!semEfeitos(p) && lerDados().claros[i] && cada(200)) sustos.efeito(p, "night_vision", DURACAO_CLARIDADE, 0);
  if (i === 0 && cada(320)) sustos.tocarNela(p, "ambient.cave", 0.25, 0.6);
  else if (i === 1 && cada(180)) sustos.tocar(p, "liquid.water", sustos.relativo(p, 6 + aleatorio(6), aleatorio(360)), 0.18, 0.6);
  else if (i === 2 && cada(260)) sustos.tocarNela(p, "beacon.ambient", 0.2, 0.5);
  else if (i === 3 && cada(420)) sustos.tocar(p, "minecart.base", sustos.relativo(p, 14, aleatorio(360)), 0.2, 0.5);
  else if (i === 4 && cada(520)) sustos.tocarNela(p, "ambient.candle", 0.2, 0.6);
}

/** Falha rara e curta do painel: de vez em quando, nunca por muito tempo. @param {Player} p @param {number} agora */
function sortearFalha(p, agora) {
  if (!lerDados().hud || semEfeitos(p)) return;
  if (Math.random() < 0.1) glitchAte.set(p.id, agora + 30);
}

/** O painel do lado deve sair estragado para esta pessoa? (dentro de uma região do Intervalo, com o painel estragado ligado) @param {Player} p */
export function painelEstragado(p) {
  return (atual.get(p.id) ?? -1) >= 0 && lerDados().hud && !semEfeitos(p);
}

/**
 * Chamado pelo painel (HUD): numa falha rara e curta, mostra a linha quebrada da bíblia (13.3) no lugar das normais.
 * @param {Player} player
 * @param {string[]} linhas
 * @returns {string[]}
 */
export function glitchHudIntervalo(player, linhas) {
  if ((atual.get(player.id) ?? -1) < 0 || system.currentTick >= (glitchAte.get(player.id) ?? 0)) return linhas;
  return [T.HUD_FALHA(online().length)];
}

/** Placas "para você": só a própria pessoa lê, só quando está perto. @param {Player} p @param {{ x: number, y: number, z: number }} r @param {number} agora */
function zonasDeNome(p, r, agora) {
  ZONAS_NOME.forEach((z, k) => {
    if (Math.hypot(z.x + 0.5 - r.x, z.z + 0.5 - r.z) > z.r || Math.abs(z.y - r.y) > 3) return;
    const chave = `${p.id}|${k}`;
    if (agora - (ultimaZona.get(chave) ?? -9999) < 600) return;
    ultimaZona.set(chave, agora);
    try {
      p.onScreenDisplay.setActionBar(z.t === "sala" ? T.SALA_PARA_VOCE(p.name) : T.ULTIMA_PLACA(p.name));
    } catch (e) {
      registrarErro("Intervalo: placa", e);
    }
  });
}

/** "Ele" (opcional, desligado por padrão): a luz cede por um instante quando a pessoa olha para o fim do corredor. @param {Player} p @param {number} i @param {{ x: number, y: number, z: number }} r @param {number} agora */
function olharEle(p, i, r, agora) {
  const alvo = PONTOS_ELE.find((e) => e.regiao === i);
  if (!alvo || agora - (ultimaEle.get(p.id) ?? -99999) < 1800) return;
  const dx = alvo.x - r.x, dy = alvo.y - (r.y + 1.6), dz = alvo.z - r.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 10 || dist > 32) return;
  const v = p.getViewDirection();
  const cos = (v.x * dx + v.y * dy + v.z * dz) / (Math.hypot(v.x, v.y, v.z) * dist || 1);
  if (cos < 0.985) return;
  ultimaEle.set(p.id, agora);
  sustos.efeito(p, "darkness", 50, 0);
  sustos.tocarNela(p, "ambient.cave", 0.5, 0.5);
}

/** Nada ataca ninguém no Intervalo (R3): bichos hostis que aparecerem são retirados. @param {Player} p */
function limparHostis(p) {
  try {
    for (const e of p.dimension.getEntities({ location: p.location, maxDistance: 24, families: ["monster"] })) {
      if (e.matches?.({ families: ["monster"] })) e.remove();
    }
  } catch {
    // nada a limpar
  }
}

system.runInterval(() => {
  try {
    const d = lerDados();
    if (!d.built) {
      if (atual.size) atual.clear();
      return;
    }
    const agora = system.currentTick;
    let alguem = false;
    for (const p of online()) {
      if (!p.isValid) continue;
      const z = regiaoDe(p);
      const antes = atual.get(p.id) ?? -1;
      if (z !== antes) {
        if (antes >= 0 && z < 0) sairDaRegiao(p);
        atual.set(p.id, z);
        if (z >= 0) {
          if (antes < 0) manterDecoracao();
          entrarNaRegiao(p, z);
        }
      }
      if (z < 0) continue;
      alguem = true;
      const r = relativoA(p);
      if (!r) continue;
      clima(p, z, agora);
      zonasDeNome(p, r, agora);
      if (d.ele) olharEle(p, z, r, agora);
      if (agora % 100 < CICLO) limparHostis(p);
      const ac = (acumulado.get(p.id) ?? 0) + CICLO;
      if (ac >= 200) {
        acumulado.set(p.id, 0);
        sortearFalha(p, agora);
        const subiu = E.somarTempo(p.id, z, 10, d.dicaMin);
        if (subiu > 0) {
          narrar(p, T.DICA_SOLTA(T.ENIGMAS[z].dicas[subiu - 1]));
          aoSubirDica(p, z, subiu);
        }
      } else acumulado.set(p.id, ac);
    }
    if (alguem && agora % 1200 < CICLO) manterDecoracao();
  } catch (e) {
    registrarErro("Intervalo: ciclo", e);
  }
}, CICLO);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  atual.delete(playerId);
  acumulado.delete(playerId);
  glitchAte.delete(playerId);
  ultimaEle.delete(playerId);
  for (const k of [...ultimaZona.keys()]) if (k.startsWith(`${playerId}|`)) ultimaZona.delete(k);
});

// a névoa do Intervalo nunca fica para trás (quem renasce lá fora, ou entra no jogo, é reavaliado no próximo ciclo)
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  tirarNevoa(player);
  atual.delete(player.id);
});

// ------------------------------------------------------------------------------------ decoração (rótulos e props)
/** Põe de volta o que for entidade e estiver faltando (rótulos curtos e props). Só funciona onde a área está carregada. */
function manterDecoracao() {
  const d = lerDados();
  if (!d.built || !d.bo) return;
  try {
    ROTULOS.forEach((r, i) => manterTexto(`vulpus_int_t${i}`, absoluto(r.x, r.y, r.z), r.t));
    const dim = world.getDimension(d.bo.d);
    const vistos = new Set();
    for (const e of dim.getEntities({ tags: [TAG_PROP] })) for (const t of e.getTags()) if (t.startsWith("vulpus_int_p")) vistos.add(t);
    PROPS.forEach((pr, i) => {
      const tag = `vulpus_int_p${i}`;
      if (vistos.has(tag)) return;
      const a = absoluto(pr.x, pr.y, pr.z);
      if (!dim.isChunkLoaded(a)) return;
      const vivo = pr.m >= INDICE_PRIMEIRO_VIVO;
      const ent = dim.spawnEntity(vivo ? "vulpus:vida" : "vulpus:prop", a);
      ent.addTag(TAG_PROP);
      ent.addTag(tag);
      ent.setRotation({ x: 0, y: pr.yaw });
      ent.setProperty("vulpus:modelo", vivo ? pr.m - INDICE_PRIMEIRO_VIVO : pr.m);
    });
  } catch (e) {
    registrarErro("Intervalo: decoração", e);
  }
}

/** Tira rótulos e props (ao refazer). */
function limparDecoracao() {
  try {
    for (let i = 0; i < ROTULOS.length + 20; i++) manterTexto(`vulpus_int_t${i}`, undefined, "");
    for (const dm of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end", DIM_INTERVALO]) {
      try {
        for (const e of world.getDimension(dm).getEntities({ tags: [TAG_PROP] })) e.remove();
      } catch {
        // dimensão ainda não registrada
      }
    }
  } catch (e) {
    registrarErro("Intervalo: limpar decoração", e);
  }
}

// ------------------------------------------------------------------------------------ entrar
// ------------------------------------------------------------------------------------ guarda-volumes
// Como nos minigames: ao entrar, tudo o que a pessoa leva (inventário, armadura, XP) vai para um cofre; ao sair, por QUALQUER caminho
// (item/comando de sair, /home, /tpa, /spawn, morte...), volta. A recuperação no login é a mesma dos minigames (mg.js: recuperar).
const MARCA_SAIR = "§8mgint:sair";
const PREFIXO_GUARDADO = "vulpus:iv:g:";
/** @type {Set<string>} quem está no Intervalo com as coisas guardadas */
const guardados = new Set();
/** @type {Set<string>} quem está saindo/devolvendo agora (o laço de vigia não mexe) */
const emSaida = new Set();

/** Reconstrói a lista depois de um /reload. */
function recarregarGuardados() {
  for (const k of world.getDynamicPropertyIds()) if (k.startsWith(PREFIXO_GUARDADO) && guardaDe(k.slice(PREFIXO_GUARDADO.length))) guardados.add(k.slice(PREFIXO_GUARDADO.length));
}
world.afterEvents.worldLoad.subscribe(recarregarGuardados);

/** @param {string} id */
function esquecerGuardado(id) {
  guardados.delete(id);
  emSaida.delete(id);
  salvarMundo(PREFIXO_GUARDADO + id, undefined);
}

/** O item vermelho de sair, na última casa da hotbar. @param {Player} p */
function darItemSair(p) {
  try {
    const it = criar("minecraft:red_dye", 1, { nome: T.ITEM_SAIR, lore: [MARCA_SAIR, "§7Use para sair e pegar as suas coisas de volta."] });
    it.lockMode = ItemLockMode.inventory;
    it.keepOnDeath = true;
    p.getComponent("minecraft:inventory")?.container?.setItem(8, it);
  } catch (e) {
    registrarErro("Intervalo: item de sair", e);
  }
}

/**
 * Leva a pessoa ao Intervalo: guarda as coisas dela (como nos minigames) e a coloca na Região A.
 * @param {Player} player
 */
export function entrarNoIntervalo(player) {
  const c = pontoChegada();
  if (!c) {
    narrar(player, T.NAO_CONSTRUIDO);
    return;
  }
  // quem já está lá dentro com tudo guardado só volta ao começo
  if (guardados.has(player.id) && player.dimension.id === DIM_INTERVALO) return void chegar(player, c);
  if (emMinigame(player) || guardaDe(player.id)) return void narrar(player, T.OCUPADO_GUARDA);
  narrar(player, T.GUARDANDO);
  admitir(player, (ok, motivo) => {
    if (!ok) {
      if (player.isValid && motivo) erro(player, motivo);
      return;
    }
    marcarFora(player.id); // não é um minigame: o resto (teleportes, pets...) segue as regras do Intervalo
    guardados.add(player.id);
    salvarMundo(PREFIXO_GUARDADO + player.id, true);
    darItemSair(player);
    chegar(player, c);
  });
}

/** @param {Player} player @param {Ponto} c */
function chegar(player, c) {
  irPara(player, c, CHEGADA.yaw);
  E.marcarEntrou(player.id);
  mostrarTitulo(player, T.TITULO_CHEGADA, { subtitulo: T.SUB_CHEGADA, entrada: 20, fica: 50, saida: 20 });
  // o número nunca bate com o relógio de verdade (R4)
  sustos.agendar(player, 50, () => narrar(player, T.AQUI_HA(0)));
  sustos.agendar(player, 110, () => narrar(player, T.DICA_SAIR));
}

/** Saída por vontade própria (item, comando): devolve as coisas e leva a pessoa de volta para onde ela estava. @param {Player} player */
export function sairDoIntervalo(player) {
  if (!guardados.has(player.id)) {
    if (player.dimension.id === DIM_INTERVALO) {
      const s = localSpawn();
      if (s) player.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension(s.d) });
      return;
    }
    return void narrar(player, T.NAO_ESTA_NO_INTERVALO);
  }
  if (emSaida.has(player.id)) return;
  emSaida.add(player.id);
  liberar(player, (ok) => {
    emSaida.delete(player.id);
    if (!ok) return;
    esquecerGuardado(player.id);
    if (player.isValid) narrar(player, T.VOLTOU_NO_LUGAR);
  });
}

/**
 * A pessoa saiu do Intervalo por outro caminho (tpa, home, spawn, morte...): as coisas voltam onde ela estiver.
 * @param {Player} player
 */
function devolverNoLugar(player) {
  const id = player.id;
  const g = guardaDe(id);
  if (!g) return void esquecerGuardado(id);
  if (emSaida.has(id)) return;
  emSaida.add(id);
  const dim = dimensaoMg();
  const parar = () => emSaida.delete(id);
  if (!dim) return void parar();
  void prepararAreas(["hub"]).then((areaOk) => {
    if (!areaOk) return void parar();
    const { a, b } = posCofre(Math.max(0, g.i));
    esperarCargaMg(dim, [a, b], 40, (carregou) => {
      try {
        if (!player.isValid) return;
        if (!carregou) return void narrar(player, T.SEM_COFRE_AGORA);
        const r = devolverItens(player);
        if (!r.ok) return void narrar(player, T.SEM_COFRE_AGORA);
        player.getComponent("minecraft:health")?.resetToMaxValue();
        for (const e of player.getEffects?.() ?? []) player.removeEffect(e.typeId);
        player.setGameMode(/** @type {any} */ (GameMode)[g.modo] ?? GameMode.Survival);
        limparGuarda(id);
        esquecerGuardado(id);
        narrar(player, T.VOLTOU_NO_LUGAR);
      } catch (e) {
        registrarErro("Intervalo: devolver no lugar", e);
      } finally {
        parar();
        soltarAreasMg(["hub"]);
      }
    });
  });
}

// vigia: quem está marcado como guardado mas já não está na dimensão do Intervalo recebe as coisas de volta (uma tentativa por ciclo)
system.runInterval(() => {
  try {
    for (const id of [...guardados]) {
      const p = porId(id);
      if (!p || !p.isValid) continue;
      if (!guardaDe(id)) {
        esquecerGuardado(id);
        continue;
      }
      if (p.dimension.id === DIM_INTERVALO || emMinigame(p) || emSaida.has(id)) continue;
      devolverNoLugar(p);
    }
  } catch (e) {
    registrarErro("Intervalo: vigia do guarda-volumes", e);
  }
}, 20);

// o item vermelho
world.afterEvents.itemUse.subscribe((ev) => {
  try {
    if (!ev.itemStack?.getLore?.().includes(MARCA_SAIR)) return;
    const p = ev.source;
    system.run(() => sairDoIntervalo(p));
  } catch (e) {
    registrarErro("Intervalo: item de sair", e);
  }
});

registrarComando({ nome: "sairintervalo", descricao: T.CMD_SAIR }, (p) => sairDoIntervalo(p));

/** @param {Player} player @param {Ponto} c @param {number} yaw */
function irPara(player, c, yaw) {
  sustos.fade(player, [0, 0, 0], 0.05, 0.3, 0.7);
  try {
    player.teleport({ x: c.x, y: c.y, z: c.z }, { dimension: world.getDimension(c.d), rotation: { x: 0, y: yaw } });
  } catch (e) {
    registrarErro("Intervalo: chegada", e);
  }
}

// ------------------------------------------------------------------------------------ formulários
/** @param {Player} player @param {string} titulo @param {string} corpo */
async function verTexto(player, titulo, corpo) {
  await new Lista(titulo).texto(corpo).botao(T.FECHAR).abrir(player);
}

/** O primeiro nome lembrado ganha a mensagem discreta (bíblia 13.3). @param {Player} player @param {number} i */
function lembrarNome(player, i) {
  if (!E.lembrarNome(player.id, i)) return;
  if (E.nomesLembrados(player.id) === 1) narrar(player, T.NOME_LEMBRADO);
}

/** Lê um registro (R-1 a R-10). Reler não diz nada (R11). @param {Player} player @param {number} r @param {string} [extra] */
async function lerRegistro(player, r, extra = "") {
  const reg = T.REGISTROS[r - 1];
  E.lerRegistro(player.id, r);
  if (r === 4) lembrarNome(player, 2);
  if (r === 2) lembrarNome(player, 1);
  await verTexto(player, T.TITULO_REGISTRO(r), `§l${reg.titulo}§r\n\n${reg.texto}${extra}`);
}

/** Dicas liberadas e botão para a próxima. @param {Player} player @param {number} k @param {() => any} voltar */
async function menuDicas(player, k, voltar) {
  const aqui = () => menuDicas(player, k, voltar);
  const n = E.nivelDica(player.id, k);
  const linhas = E.dicasLiberadas(player.id, k).map((t, i) => T.DICA_LINHA(i + 1, t));
  const lista = new Lista(T.DICAS_TITULO).texto(linhas.length ? linhas.join("\n\n") : T.DICAS_NENHUMA);
  if (n < 3) {
    lista.botao(T.BOTAO_PROXIMA_DICA, undefined, async (p) => {
      aoSubirDica(p, k, E.subirDica(p.id, k));
      await aqui();
    });
  } else lista.rotulo(T.DICAS_ACABARAM);
  await lista.voltar(voltar).abrir(player);
}

/** Algumas dicas têm um som junto (o telefone da plataforma toca uma vez). @param {Player} p @param {number} k @param {number} nivel */
function aoSubirDica(p, k, nivel) {
  if (k === 3 && nivel === 3) {
    const fone = PONTOS.find((q) => q.t === "reg" && q.r === 5);
    if (fone && regiaoAtual(p) === 3) sustos.tocar(p, "note.bell", absoluto(fone.x + 0.5, fone.y + 1, fone.z + 0.5), 1, 1);
  }
}

/**
 * Menu de um enigma: os itens do próprio enigma e o botão de dica.
 * @param {Player} player @param {number} k @param {string} titulo @param {string} corpo
 * @param {{ texto: string, acao: (p: Player) => any }[]} itens
 */
async function menuEnigma(player, k, titulo, corpo, itens) {
  const aqui = () => menuEnigma(player, k, titulo, corpo, itens);
  const lista = new Lista(titulo).texto(corpo);
  for (const it of itens) {
    lista.botao(it.texto, undefined, async (p) => {
      await it.acao(p);
      await aqui();
    });
  }
  lista.botao(T.BOTAO_DICA, undefined, (p) => menuDicas(p, k, aqui));
  await lista.abrir(player);
}

// ------------------------------------------------------------------------------------ o que cada ponto faz
/** @param {Player} player @param {number} k enigma resolvido agora (0-4): marca e avisa */
function resolverEnigma(player, k) {
  E.resolver(player.id, k);
  sustos.tocarNela(player, "note.pling", 0.7, 0.8);
}

/** @param {Player} player @param {import("./intervalo_mapa.js").Ponto} pt */
async function tocar(player, pt) {
  const id = player.id;
  switch (pt.t) {
    case "reg": {
      const r = /** @type {number} */ (pt.r);
      if (r === 5) sustos.tocarNela(player, "note.bell", 0.6, 1);
      await lerRegistro(player, r, r === 4 ? `\n\n${T.ASSINATURA_BETO}` : "");
      return;
    }
    case "mesa":
      return menuMesa(player);
    case "mapa": {
      const m = T.MAPAS.find((x) => x.sala === pt.m);
      if (m) await verTexto(player, T.MAPA_TITULO(m.sala), `Tomás.\n\n${m.texto}`);
      return;
    }
    case "mapa_rasgado":
      return verTexto(player, T.MAPA_RASGADO_TITULO, T.MAPA_RASGADO);
    case "toalha":
      return verTexto(player, "§7Toalha", T.TOALHA);
    case "vaso_seco":
      return verTexto(player, "§7Vaso", T.VASO_SECO);
    case "banca":
      return menuEnigma(player, 1, T.BANCA_TITULO, T.BANCA_CORPO, [{ texto: T.BOTAO_LER_LIVRO, acao: (p) => lerRegistro(p, 1) }]);
    case "valvula":
      return valvula(player, /** @type {number} */ (pt.n));
    case "porta":
      return passar(player, /** @type {string} */ (pt.g));
    case "caderno":
      return menuEnigma(player, 2, T.CADERNO_TITULO, T.CADERNO_CORPO, [
        { texto: T.BOTAO_LER_CADERNO, acao: (p) => lerRegistro(p, 2, `\n\n${T.ASSINATURA_MARTA}`) },
        {
          texto: T.BOTAO_PAGINA_RASURADA,
          acao: (p) => {
            lembrarNome(p, 1); // a página rasurada também é assinada por Marta
            return verTexto(p, T.CADERNO_TITULO, `${T.PAGINA_RASURADA}\n\n${T.ASSINATURA_MARTA}`);
          },
        },
      ]);
    case "livro7":
      if (E.resolveuEmDupla(id)) await lerRegistro(player, 7);
      else await verTexto(player, T.LIVRO_LACRADO_TITULO, T.LIVRO_LACRADO);
      return;
    case "trancada":
      narrar(player, T.TRANCADA);
      sustos.tocarNela(player, "note.bass", 0.6, 0.6);
      return;
    case "sw":
      return interruptor(player, /** @type {number} */ (pt.n));
    case "confirma":
      return confirmarLuzes(player);
    case "painel":
      return painel(player);
    case "fita":
      return fita(player);
    case "visitas":
      return verTexto(player, T.VISITAS_TITULO, E.nivelDica(id, 4) >= 3 ? T.VISITAS_ABERTO : T.VISITAS_FECHADO);
    case "vaso":
      lembrarNome(player, 3);
      return verTexto(player, "§7Vaso", T.VASO_ALBA);
    case "placa":
      return verTexto(player, T.PLACA_APAGADA_TITULO, pt.n ? T.PLACA_APAGADA(pt.n) : T.ULTIMA_PLACA(player.name));
    case "portaNomes":
      return portaDosNomes(player);
    default:
  }
}

/** A mesa de Tomás: o crachá, a anotação e os mapas em ordem (enigma 4). @param {Player} player */
async function menuMesa(player) {
  await menuEnigma(player, 0, T.MESA_TOMAS_TITULO, T.MESA_TOMAS_CORPO, [
    {
      texto: T.BOTAO_CRACHA,
      acao: async (p) => {
        lembrarNome(p, 0);
        await verTexto(p, "§7Crachá", T.CRACHA_TOMAS);
      },
    },
    { texto: T.BOTAO_ANOTACAO, acao: (p) => lerRegistro(p, 3) },
    { texto: T.BOTAO_ORDENAR, acao: (p) => ordenarMapas(p) },
  ]);
}

/** @param {Player} player */
async function ordenarMapas(player) {
  if (E.resolvido(player.id, 0)) {
    narrar(player, T.ORDENAR_CERTO);
    return;
  }
  const salas = T.MAPAS.map((m) => m.sala).sort((a, b) => a - b);
  const r = await perguntar(
    player,
    T.ORDENAR_TITULO,
    [1, 2, 3].map((i) => ({ tipo: "lista", rotulo: T.ORDENAR_ROTULO(i), opcoes: salas.map((s) => T.ORDENAR_OPCAO(s)), padrao: i - 1 })),
  );
  if (!r) return;
  const ordem = r.map((i) => salas[Number(i)]);
  const res = E.conferirMapas(ordem);
  if (res === "repetida") narrar(player, T.ORDENAR_REPETIDO);
  else if (res === "errada") {
    narrar(player, T.ORDENAR_ERRADO);
    sustos.tocarNela(player, "note.bass", 0.8, 0.5);
  } else {
    narrar(player, T.ORDENAR_CERTO);
    resolverEnigma(player, 0);
  }
}

/** @param {Player} player @param {number} n raia */
async function valvula(player, n) {
  if (E.resolvido(player.id, 1)) {
    narrar(player, T.VALVULA_JA);
    return;
  }
  if (n !== 4) {
    narrar(player, T.VALVULA_ERRADA);
    sustos.tocarNela(player, "liquid.water", 0.5, 0.6);
    return;
  }
  resolverEnigma(player, 1);
  T.VALVULA_CERTA.forEach((l, i) => sustos.agendar(player, 10 + i * 60, () => narrar(player, l)));
  sustos.tocarNela(player, "liquid.water", 1, 0.7);
}

/** @param {Player} player @param {number} k 1 a 4 */
function interruptor(player, k) {
  const res = E.girarInterruptor(player.id, k, Date.now(), lerDados().janela * 1000);
  if (res === "errado") {
    narrar(player, T.INTERRUPTOR_ERRADO);
    sustos.tocarNela(player, "note.bass", 0.8, 0.5);
  } else if (res === "ja") narrar(player, T.INTERRUPTOR_JA);
  else {
    sustos.tocarNela(player, "note.pling", 0.6, 0.6 + k * 0.15);
    narrar(player, res === "armado" ? T.INTERRUPTOR_ARMADO : T.INTERRUPTOR_CERTO);
  }
}

/** @param {Player} player */
function confirmarLuzes(player) {
  if (E.resolvido(player.id, 2) && E.estadoPainel6().passo === 0) {
    narrar(player, T.CONFIRMAR_JA);
    return;
  }
  const r = E.confirmarLuzes(player.id, Date.now());
  if (r.res === "sem") narrar(player, T.CONFIRMAR_SEM_ARMAR);
  else if (r.res === "tarde") narrar(player, T.CONFIRMAR_TARDE);
  else {
    for (const id of r.todos) {
      const p = id === player.id ? player : porId(id);
      E.resolver(id, 2);
      if (r.dupla) E.marcarDupla(id);
      if (!p?.isValid) continue;
      sustos.tocarNela(p, "note.pling", 1, 1);
      T.CONFIRMAR_CERTO.forEach((l, i) => sustos.agendar(p, 10 + i * 60, () => narrar(p, l)));
      if (r.dupla) sustos.agendar(p, 130, () => narrar(p, T.CONFIRMAR_EM_DUPLA));
    }
  }
}

/** @param {Player} player */
async function painel(player) {
  const id = player.id;
  if (!E.resolvido(id, 2)) {
    narrar(player, T.PAINEL_APAGADO);
    return;
  }
  const corpo = E.resolvido(id, 3) ? `${T.PAINEL_CORPO.replace("§8▒▒▒▒▒ §7(sob uma fita)", "§fSONHE §7(a fita se soltou)")}\n§fSALA DE ESPERA §7(disponível)` : T.PAINEL_CORPO;
  await menuEnigma(player, 3, T.PAINEL_TITULO, corpo, []);
}

/** @param {Player} player */
async function fita(player) {
  const id = player.id;
  if (!E.resolvido(id, 2)) {
    narrar(player, T.PAINEL_APAGADO);
    return;
  }
  if (E.resolvido(id, 3)) {
    narrar(player, T.FITA_JA);
    return;
  }
  const r = await perguntar(player, T.FITA_TITULO, [{ tipo: "texto", rotulo: T.FITA_ROTULO, dica: T.FITA_DICA }]);
  if (!r) return;
  if (!E.acertouFita(String(r[0] ?? ""))) {
    narrar(player, T.FITA_ERRADA);
    sustos.tocarNela(player, "note.bass", 0.8, 0.5);
    return;
  }
  resolverEnigma(player, 3);
  T.FITA_CERTA.forEach((l, i) => sustos.agendar(player, 10 + i * 60, () => narrar(player, l)));
}

/** @param {Player} player */
/** Os objetos que ainda não foram olhados (um por nome que falta), sem dizer o nome. @param {string} id */
function faltamObjetos(id) {
  const falta = T.OBJETO_DO_NOME.filter((_, i) => !E.sabeNome(id, i));
  return falta.length ? T.PORTA_FALTAM(falta.join(", ")) : "";
}

async function portaDosNomes(player) {
  const id = player.id;
  if (E.concluiu(id)) {
    narrar(player, T.NOMES_JA);
    portaFinal(player);
    return;
  }
  await menuEnigma(player, 4, T.PORTA_NOMES_TITULO, `${T.PORTA_NOMES_CORPO}\n\n§8Nomes lembrados: ${E.nomesLembrados(id)}/${T.NOMES.length}${faltamObjetos(id)}`, [
    { texto: T.BOTAO_DIZER_NOMES, acao: (p) => dizerNomes(p) },
  ]);
}

/** @param {Player} player */
async function dizerNomes(player) {
  const campos = T.NOMES.map((_, i) => ({ tipo: "texto", rotulo: T.NOMES_ROTULO(i + 1), dica: T.NOMES_DICA }));
  const r = await perguntar(player, T.NOMES_TITULO, campos);
  if (!r) return;
  const res = E.conferirNomes(player.id, r.map((x) => String(x ?? "")));
  if (!res.completo) {
    narrar(player, `${T.FALTA_ALGUEM} ${T.NOMES_PARCIAL(res.certos.length)}`);
    if (res.naoVistos.length) narrar(player, T.NOME_NAO_VISTO);
    sustos.tocarNela(player, "note.bass", 0.6, 0.5);
    return;
  }
  resolverEnigma(player, 4);
  E.concluir(player.id);
  T.NOMES_CERTO.forEach((l, i) => sustos.agendar(player, 10 + i * 70, () => narrar(player, l)));
  const fone = PONTOS.find((q) => q.t === "reg" && q.r === 6);
  if (fone) sustos.agendar(player, 150, () => sustos.tocar(player, "note.bell", absoluto(fone.x + 0.5, fone.y + 1, fone.z + 0.5), 1, 1));
  sustos.agendar(player, 220, () => portaFinal(player));
}

/** Atravessa um painel entre regiões, se já se mereceu. @param {Player} player @param {string} gid */
function passar(player, gid) {
  const g = PORTAS.find((q) => q.id === gid);
  const o = lerDados().bo;
  if (!g || !o) return;
  const r = relativoA(player);
  if (!r) return;
  const passo = (g.eixo === "x" ? r.x : r.z) < g.limite ? g.menos : g.mais;
  if (passo.req >= 0 && !E.resolvido(player.id, passo.req) && !portasLivres(player)) {
    narrar(player, g.trancada);
    sustos.tocarNela(player, "note.bass", 0.6, 0.5);
    return;
  }
  sustos.tocarNela(player, "open.iron_door", 0.7, 0.8);
  narrar(player, T.PORTA_PASSA);
  irPara(player, { x: o.x + passo.dest.x, y: o.y + passo.dest.y, z: o.z + passo.dest.z, d: o.d }, passo.dest.yaw);
}

// ------------------------------------------------------------------------------------ eventos do mundo
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const d = lerDados();
    if (!d.built || !d.bo) return;
    const b = ev.block;
    if (b.dimension.id !== d.bo.d) return;
    const rx = b.location.x - d.bo.x, ry = b.location.y - d.bo.y, rz = b.location.z - d.bo.z;
    if (!dentroDaCaixa(rx, ry, rz)) return;
    const pt = PONTO_POR_POS.get(`${rx},${ry},${rz}`);
    if (!pt) return;
    if (ehDono(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const player = ev.player;
    system.run(() => {
      tocar(player, pt).catch((e) => registrarErro("Intervalo: interação", e));
    });
  } catch (e) {
    registrarErro("Intervalo: interação", e);
  }
});

/** Paredes, pisos e móveis do Intervalo não se quebram (só o dono mexe). @param {{ player: Player, block: import("@minecraft/server").Block, cancel: boolean }} ev */
function protegerBloco(ev) {
  try {
    if (ehDono(ev.player)) return;
    const l = ev.block.location;
    if (dentroDoIntervalo({ x: l.x, y: l.y, z: l.z, d: ev.block.dimension.id })) ev.cancel = true;
  } catch (e) {
    registrarErro("Intervalo: proteção", e);
  }
}
world.beforeEvents.playerBreakBlock.subscribe(protegerBloco);
// colocar: o jogo desta versão só avisa depois, então o bloco posto por quem não é dono é desfeito
world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
  try {
    if (ehDono(player)) return;
    const l = block.location;
    if (dentroDoIntervalo({ x: l.x, y: l.y, z: l.z, d: block.dimension.id })) block.setType("minecraft:air");
  } catch (e) {
    registrarErro("Intervalo: proteção", e);
  }
});

// ------------------------------------------------------------------------------------ construção
/**
 * Roda um gerador aos poucos (um orçamento de milissegundos por tick).
 * @param {import("@minecraft/server").Dimension} dim
 * @param {(p: PincelMundo) => Generator<any, any, any>} fabricar
 * @param {(ok: boolean, valor: string, falhas: number) => void} aoTerminar
 */
function rodar(dim, fabricar, aoTerminar) {
  const pincel = new PincelMundo(dim);
  const gen = fabricar(pincel);
  const run = system.runInterval(() => {
    try {
      const ini = Date.now();
      while (Date.now() - ini < ORCAMENTO_MS) {
        const r = gen.next();
        if (r.done) {
          system.clearRun(run);
          aoTerminar(true, "", pincel.falhas);
          return;
        }
        if (typeof r.value === "string") {
          cons.fase = r.value;
          const i = FASES.indexOf(r.value);
          if (i >= 0) cons.pct = Math.round((i / FASES.length) * 100);
        }
      }
    } catch (e) {
      system.clearRun(run);
      registrarErro("Intervalo: construção", e);
      aoTerminar(false, String(e), pincel.falhas);
    }
  }, 1);
}
const FASES = ["limpando a área", "paredes", "A · Corredores", "B · Piscina Vazia", "C · Casa de Máquinas", "D · Estação", "E · Sala de Espera"];

/** Espera os pontos carregarem (confere a cada 4 ticks). @param {import("@minecraft/server").Dimension} dim @param {{ x: number, y: number, z: number }[]} pontos @param {number} tentativas @param {(ok: boolean) => void} aoFim */
function esperarCarga(dim, pontos, tentativas, aoFim) {
  let n = 0;
  const confere = () => {
    let pronto = false;
    try {
      pronto = pontos.every((p) => dim.isChunkLoaded(p) && !!dim.getBlock(p));
    } catch {
      pronto = false;
    }
    if (pronto) return aoFim(true);
    if (++n >= tentativas) return aoFim(false);
    system.runTimeout(confere, 4);
  };
  confere();
}

/** @param {Ponto} o */
const caixaDe = (o) => ({
  from: { x: o.x - 2, y: Math.max(-64, o.y + CAIXA.y1 - 3), z: o.z - 2 },
  to: { x: o.x + CAIXA.x2 + 2, y: Math.min(319, o.y + CAIXA.y2 + 3), z: o.z + CAIXA.z2 + 2 },
});

/** @param {Ponto} o */
const pontosDaObra = (o) => [
  { x: o.x, y: o.y, z: o.z },
  { x: o.x + CAIXA.x2, y: o.y, z: o.z + CAIXA.z2 },
  { x: o.x + 96, y: o.y, z: o.z + 20 },
  { x: o.x + CAIXA.x2, y: o.y, z: o.z },
  { x: o.x, y: o.y, z: o.z + CAIXA.z2 },
];

/** @param {string} nome @param {import("@minecraft/server").Dimension} dim @param {Ponto} o */
async function criarArea(nome, dim, o) {
  const g = world.tickingAreaManager;
  try {
    if (g.getTickingArea(nome)) g.removeTickingArea(nome);
    await g.createTickingArea(nome, { dimension: dim, ...caixaDe(o) });
    return true;
  } catch (e) {
    registrarErro(`Intervalo: área ${nome}`, e);
    return false;
  }
}

function soltarAreas() {
  const g = world.tickingAreaManager;
  for (const nome of [AREA_OBRA, AREA_VELHA]) {
    try {
      if (g.getTickingArea(nome)) g.removeTickingArea(nome);
    } catch (e) {
      registrarErro(`Intervalo: soltar ${nome}`, e);
    }
  }
}

/** Quem estiver dentro quando se refaz o Intervalo volta para o spawn. */
function retirarQuemEstaDentro() {
  const s = localSpawn();
  for (const p of online()) {
    const l = p.location;
    if (!dentroDoIntervalo({ x: l.x, y: l.y, z: l.z, d: p.dimension.id })) continue;
    try {
      if (s) p.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension(s.d) });
    } catch (e) {
      registrarErro("Intervalo: retirar", e);
    }
  }
}

/**
 * Constrói (ou refaz) o Intervalo na origem marcada, aos poucos. A área antiga é limpa antes.
 * @param {Player | undefined} quem recebe os avisos
 * @returns {Promise<boolean>} se começou
 */
export async function construirIntervalo(quem) {
  if (cons.ocupado) {
    if (quem) erro(quem, T.JA_CONSTRUINDO);
    return false;
  }
  const d = lerDados();
  const o = { ...d.o };
  const velha = d.built && d.bo ? { ...d.bo } : undefined;
  /** @type {import("@minecraft/server").Dimension} */
  let dim;
  try {
    dim = world.getDimension(o.d);
  } catch {
    if (quem) erro(quem, T.FALHA_CONSTRUCAO("a dimensão da origem não existe"));
    return false;
  }
  cons.ocupado = true;
  cons.fase = "preparando";
  cons.pct = 0;
  if (quem) ok(quem, T.CONSTRUINDO);
  retirarQuemEstaDentro();
  d.built = false;
  gravar();
  limparDecoracao();
  const falhou = (/** @type {string} */ m) => {
    soltarAreas();
    cons.ocupado = false;
    cons.fase = "";
    if (quem?.isValid) erro(quem, T.FALHA_CONSTRUCAO(m));
    registrarErro("Intervalo: construção", m);
  };
  let areasOk = await criarArea(AREA_OBRA, dim, o);
  const mesmoLugar = velha && velha.d === o.d && velha.x === o.x && velha.y === o.y && velha.z === o.z;
  if (areasOk && velha && !mesmoLugar) areasOk = await criarArea(AREA_VELHA, world.getDimension(velha.d), velha);
  if (!areasOk) {
    falhou(T.AREA_NAO_CARREGOU);
    return false;
  }
  const limparAntigo = !!velha && !mesmoLugar;
  esperarCarga(dim, pontosDaObra(o), 75, (carregou) => {
    if (!carregou) return falhou(T.AREA_NAO_CARREGOU);
    const construirNovo = () => rodar(
      dim,
      function* (p) {
        yield* construir(p, o);
      },
      (certo, motivo, falhas) => {
        if (!certo) return falhou(motivo);
        if (falhas > 80) return falhou(`${falhas} blocos não puderam ser colocados`);
        d.bo = { ...o };
        d.built = true;
        gravar();
        cons.fase = "decorando";
        cons.pct = 100;
        manterDecoracao();
        // as entidades já nasceram com a área carregada; só então ela é solta
        system.runTimeout(() => {
          manterDecoracao();
          soltarAreas();
          cons.ocupado = false;
          cons.fase = "";
          if (quem?.isValid) ok(quem, T.CONSTRUIDO);
        }, 60);
      },
    );
    if (!limparAntigo || !velha) return construirNovo();
    // o lugar antigo (talvez em outra dimensão, como o do mundo comum de antes) é limpo primeiro, no seu próprio pincel
    const dimVelha = world.getDimension(velha.d);
    esperarCarga(dimVelha, pontosDaObra(velha), 75, (carregouVelha) => {
      if (!carregouVelha) return falhou(T.AREA_NAO_CARREGOU);
      cons.fase = "limpando o lugar antigo";
      rodar(
        dimVelha,
        function* (p) {
          yield* limpar(p, velha);
        },
        (certoVelha, motivoVelho) => (certoVelha ? construirNovo() : falhou(motivoVelho)),
      );
    });
  });
  if (quem) {
    const acompanha = system.runInterval(() => {
      if (!cons.ocupado || !quem.isValid) return system.clearRun(acompanha);
      quem.onScreenDisplay.setActionBar(T.CONSTRUINDO_FASE(cons.fase || "preparando", cons.pct));
    }, 20);
  }
  return true;
}

/** Estado da construção, para o painel e os testes. */
export const estadoConstrucao = () => ({ ocupado: cons.ocupado, fase: cons.fase, pct: cons.pct });

// ------------------------------------------------------------------------------------ painel do dono
/** @param {Player} p */
const soDono = (p) => {
  if (ehDono(p)) return true;
  erro(p, T.SO_DONO);
  return false;
};

/** @param {Ponto} o */
const origemTexto = (o) => formatarCoords(o);

/** Painel do dono: construir, testar, zerar. @param {Player} player @param {() => any} [voltar] */
export async function menuIntervaloDono(player, voltar) {
  if (!soDono(player)) return;
  const d = lerDados();
  const aqui = () => menuIntervaloDono(player, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!soDono(p)) return;
    await fn(p);
    await aqui();
  };
  const est = E.estatisticas();
  await new Lista(T.TITULO_PAINEL)
    .texto(T.CORPO_PAINEL({ construido: d.built, construindo: cons.ocupado, origem: origemTexto(d.o), comecaram: est.comecaram, concluiram: est.concluiram, ele: d.ele }))
    .botao(
      T.BOTAO_CONSTRUIR(d.built),
      ICONES.spawn,
      eVolta(async (p) => {
        if (cons.ocupado) return erro(p, T.JA_CONSTRUINDO);
        if (await confirmar(p, { titulo: T.BOTAO_CONSTRUIR(lerDados().built), texto: T.CONFIRMAR_CONSTRUIR(lerDados().built) })) await construirIntervalo(p);
      }),
    )
    .botao(
      T.BOTAO_IR,
      ICONES.spawn,
      eVolta((p) => {
        const c = pontoChegada();
        if (!c) return erro(p, T.NAO_CONSTRUIDO_DONO);
        irPara(p, c, CHEGADA.yaw);
        ok(p, T.IR_TESTE);
      }),
    )
    .botao(T.BOTAO_ORIGEM, ICONES.spawn, eVolta((p) => marcarOrigem(p)))
    .botao(T.BOTAO_REGIOES, ICONES.ajustes, (p) => menuRegioes(p, aqui))
    .botao(
      T.BOTAO_ELE(d.ele),
      ICONES.ajustes,
      eVolta(() => {
        d.ele = !d.ele;
        gravar();
      }),
    )
    .botao(
      T.BOTAO_HUD(d.hud),
      ICONES.ajustes,
      eVolta(() => {
        d.hud = !d.hud;
        gravar();
      }),
    )
    .botao(
      T.BOTAO_DICA_MIN(d.dicaMin),
      ICONES.ajustes,
      eVolta(async (p) => {
        const r = await perguntar(p, T.TITULO_DICA_MIN, [{ tipo: "numero", rotulo: T.ROTULO_DICA_MIN, padrao: d.dicaMin, min: 0, max: 120 }]);
        if (r) {
          d.dicaMin = Number(r[0]);
          gravar();
        }
      }),
    )
    .botao(
      T.BOTAO_JANELA(d.janela),
      ICONES.ajustes,
      eVolta(async (p) => {
        const r = await perguntar(p, T.TITULO_JANELA, [{ tipo: "numero", rotulo: T.ROTULO_JANELA, padrao: d.janela, min: 10, max: 1800 }]);
        if (r) {
          d.janela = Number(r[0]);
          gravar();
        }
      }),
    )
    .botao(
      T.BOTAO_PORTAS_LIVRES(player.hasTag(TAG_LIVRE)),
      ICONES.ajustes,
      eVolta((p) => {
        if (p.hasTag(TAG_LIVRE)) p.removeTag(TAG_LIVRE);
        else p.addTag(TAG_LIVRE);
      }),
    )
    .botao(
      T.BOTAO_ZERAR_MEU,
      ICONES.nao,
      eVolta((p) => {
        E.zerar(p.id);
        ok(p, T.ZERADO_MEU);
      }),
    )
    .botao(
      T.BOTAO_ZERAR_TODOS,
      ICONES.nao,
      eVolta(async (p) => {
        if (await confirmar(p, { titulo: T.BOTAO_ZERAR_TODOS, texto: T.CONFIRMAR_ZERAR_TODOS })) {
          E.zerarTodos();
          ok(p, T.ZERADO_TODOS);
        }
      }),
    )
    .voltar(voltar)
    .abrir(player);
}

/** @param {Player} p */
async function marcarOrigem(p) {
  const d = lerDados();
  if (d.built && !(await confirmar(p, { titulo: T.BOTAO_ORIGEM, texto: T.CONFIRMAR_ORIGEM }))) return;
  const l = p.location;
  const y = Math.floor(l.y) - 1;
  if (y + CAIXA.y1 - 3 < -64 || y + CAIXA.y2 + 3 > 319) {
    erro(p, `Altura fora do mundo: o Intervalo precisa de ${CAIXA.y2 - CAIXA.y1 + 7} blocos de altura.`);
    return;
  }
  // a origem é sempre na dimensão do Intervalo (só as coordenadas vêm de onde você está)
  d.o = { x: Math.floor(l.x), y, z: Math.floor(l.z), d: DIM_INTERVALO };
  gravar();
  ok(p, T.ORIGEM_MARCADA(origemTexto(d.o)));
}

/** @param {Player} player @param {() => any} voltar */
async function menuRegioes(player, voltar) {
  if (!soDono(player)) return;
  const aqui = () => menuRegioes(player, voltar);
  const lista = new Lista(T.BOTAO_REGIOES);
  REG.forEach((r, i) => {
    lista.botao(`${r.id} · ${r.nome}`, ICONES.spawn, (p) => menuRegiao(p, i, aqui));
  });
  await lista.voltar(voltar).abrir(player);
}

/** @param {string} id */
const nomeDaNevoa = (id) => (id === "nenhuma" ? T.NEVOA_NENHUMA : (NEVOAS.find((n) => n.id === id)?.nome ?? T.NEVOA_PADRAO));

/** @param {Player} player @param {number} i @param {() => any} voltar */
async function menuRegiao(player, i, voltar) {
  if (!soDono(player)) return;
  const d = lerDados();
  const aqui = () => menuRegiao(player, i, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!soDono(p)) return;
    await fn(p);
    await aqui();
  };
  await new Lista(T.TITULO_REGIAO(REG[i].nome))
    .botao(T.BOTAO_NEVOA(nomeDaNevoa(d.nevoas[i])), ICONES.ajustes, (p) => menuNevoa(p, i, aqui))
    .botao(
      T.BOTAO_CLARIDADE(d.claros[i]),
      ICONES.ajustes,
      eVolta(() => {
        d.claros[i] = !d.claros[i];
        gravar();
      }),
    )
    .botao(
      T.BOTAO_FILTRO(d.filtros[i]),
      ICONES.ajustes,
      eVolta(() => {
        d.filtros[i] = !d.filtros[i];
        gravar();
      }),
    )
    .voltar(voltar)
    .abrir(player);
}

/** @param {Player} player @param {number} i @param {() => any} voltar */
async function menuNevoa(player, i, voltar) {
  if (!soDono(player)) return;
  const d = lerDados();
  const aqui = () => menuNevoa(player, i, voltar);
  /** @param {string} id */
  const escolher = (id) => async (/** @type {Player} */ p) => {
    if (!soDono(p)) return;
    d.nevoas[i] = id;
    gravar();
    ok(p, T.NEVOA_DEFINIDA(nomeDaNevoa(id)));
    await aqui();
  };
  const atualId = d.nevoas[i];
  const lista = new Lista(T.TITULO_NEVOA)
    .texto(T.CORPO_NEVOA)
    .botao(`${T.NEVOA_PADRAO}${atualId === "" ? " §a✔" : ""}`, ICONES.ajustes, escolher(""))
    .botao(`${T.NEVOA_NENHUMA}${atualId === "nenhuma" ? " §a✔" : ""}`, ICONES.ajustes, escolher("nenhuma"));
  for (const n of NEVOAS) lista.botao(T.BOTAO_NEVOA_OPCAO(n.nome, n.ajuda, atualId === n.id), ICONES.ajustes, escolher(n.id));
  await lista.voltar(voltar).abrir(player);
}
