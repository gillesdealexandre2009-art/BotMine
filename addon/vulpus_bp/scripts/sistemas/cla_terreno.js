// @ts-check
// Terreno dos clãs: a base (quadrado com o raio do nível, todas as alturas, só no Mundo normal), a zona de
// amortecimento em volta dela, a proteção contra quem é de fora, o aviso de território e o bypass da staff.
// Tudo é matemática de quadrados (distância de Chebyshev entre centros): nada de varrer blocos.
// Os eventos "before" rodam em modo restrito: aqui só se lê e cancela; avisos vão por system.run.
import { BlockTypes, Direction, Player, system, world } from "@minecraft/server";
import { CHAVE_SPAWN, NIVEIS_CLA, SONS } from "../config.js";
import { config, lerMundo } from "../core/db.js";
import { online } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { emEspera } from "../core/teleporte.js";
import { erro, formatarCoords, msg, ok, registrarErro, som } from "../core/util.js";
import * as textos from "../textos/clas.js";
import { aoMudarCla, claDe, claPorId, defNivel, editarCla, moverBanco, pode, registrarLog, todosClas } from "./cla_dados.js";
import { emGuerraAtiva, guerraDe } from "./cla_guerra.js";

/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {import("@minecraft/server").ItemStack} ItemStack */
/** @typedef {import("./cla_dados.js").Cla} Cla */
/** @typedef {{ claId: string, x: number, z: number, raio: number }} AreaBase */
/** construir = quebrar, colocar e mexer no mundo; interagir = abrir portas, baús, botões e alavancas */
/** @typedef {"construir" | "interagir"} Acao */
/**
 * Também vale na zona de amortecimento: "mecanismo" sempre, "entidade" se o clã liga a proteção de entidades.
 * @typedef {"mecanismo" | "entidade" | undefined} Zona
 */

const OVERWORLD = "minecraft:overworld";
/** Menor base possível: o raio do nível 1. */
export const RAIO_MINIMO = NIVEIS_CLA[0].raio;
const TICKS_TERRITORIO = 10;
const TICKS_AVISO_BLOQUEIO = 40;
const HORA_MS = 60 * 60 * 1000;
/** Limites da base em partículas: 10 vezes, uma por segundo, até 24 blocos de quem pediu. */
const VEZES_LIMITES = 10;
const ALCANCE_LIMITES = 24;
const PARTICULA_LIMITE = "minecraft:villager_happy";
/**
 * Itens que mudam o mundo quando usados num bloco (aliado com acesso só interage sem eles): ferramentas,
 * e itens que plantam ou colocam bloco sem ter o mesmo id do bloco (sementes, linha, placas, estandartes...).
 */
const ITENS_DE_OBRA =
  /bucket|flint_and_steel|fire_charge|bone_meal|shears|_axe|_hoe|_shovel|brush|honeycomb|dye|ink_sac|seeds|carrot|potato|berries|cocoa_beans|string|sign|banner|glass_bottle|potion|book|sugar_cane|bamboo|kelp|nether_wart|pitcher_pod|torchflower|name_tag|saddle|ender_eye|^minecraft:bed$/;
/**
 * Redstone, mecanismos, líquidos (todo balde, até o vazio e os de peixe, que põem água) e fogo: proibidos
 * também na zona de amortecimento para quem é de fora. O vento (wind charge) abre portas e aperta botões.
 */
const MECANISMOS =
  /piston|observer|dispenser|dropper|tnt|redstone|repeater|comparator|activator_rail|detector_rail|powered_rail|^minecraft:(?:(?:lava|water|powder_snow|cod|salmon|pufferfish|tropical_fish|axolotl|tadpole)_)?bucket$|flint_and_steel|fire_charge|end_crystal|^minecraft:slime$|honey_block|hopper|crafter|wind_charge/;
/** Itens que viram entidade (barcos, carrinhos, suportes, cristais, ovos de criação, quadros) e a vara de pesca (puxa bichos). */
const ENTIDADES = /boat|minecart|armor_stand|end_crystal|spawn_egg|painting|frame|lead|fishing_rod/;
/** Cama: a cabeça ocupa o bloco ao lado de onde foi colocada. */
const CAMA = /(?:^|:)bed$/;
/** O pistão empurra até 12 blocos: para mecanismos a zona tem 1 bloco a mais (nenhum bloco empurrado entra na base). */
const MARGEM_PISTAO = 1;

/** @type {AreaBase[] | undefined} cache das bases (refeito quando um clã muda) */
let areas;
/** @type {Set<string>} staff com o bypass ligado (só nesta sessão) */
const bypass = new Set();
/** @type {Map<string, number>} id → tick do último aviso de bloqueio */
const ultimoAviso = new Map();
/** @type {Map<string, string>} id → clã do território onde a pessoa está ("" = fora) */
const territorio = new Map();

/** @returns {AreaBase[]} */
function listaAreas() {
  if (!areas) {
    areas = todosClas()
      .filter((c) => c.base && c.base.d === OVERWORLD)
      .map((c) => ({ claId: c.id, x: c.base.x, z: c.base.z, raio: c.base.raio }));
  }
  return areas;
}

/** @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
const distancia = (x1, z1, x2, z2) => Math.max(Math.abs(x1 - x2), Math.abs(z1 - z2));

/** Largura da zona de amortecimento (blocos em volta da borda). */
const larguraZona = () => Math.max(0, Math.floor(config().zonaAmortecimento));

/**
 * Base que cobre a posição (coluna inteira, só no Mundo normal).
 * @param {string} dimId
 * @param {number} x
 * @param {number} z
 * @returns {AreaBase | undefined}
 */
export function baseEm(dimId, x, z) {
  if (dimId !== OVERWORLD) return undefined;
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  return listaAreas().find((a) => distancia(bx, bz, a.x, a.z) <= a.raio);
}

/**
 * Base cuja zona de amortecimento (fora da base, até zonaAmortecimento blocos da borda) cobre a posição.
 * @param {string} dimId
 * @param {number} x
 * @param {number} z
 * @param {number} [extra]  blocos a mais na largura (mecanismos)
 * @returns {AreaBase | undefined}
 */
export function zonaEm(dimId, x, z, extra = 0) {
  if (dimId !== OVERWORLD) return undefined;
  const largura = larguraZona();
  if (largura === 0) return undefined;
  const zona = largura + extra;
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  return listaAreas().find((a) => {
    const d = distancia(bx, bz, a.x, a.z);
    return d > a.raio && d <= a.raio + zona;
  });
}

/** @param {string} id */
export const bypassLigado = (id) => bypass.has(id);

/**
 * A base que impede a ação, ou undefined se pode. Libera: membro (na base, só com "construir"), staff
 * com bypass, pessoa de confiança, clã em guerra valendo com o dono e (só interagir) aliado com acesso.
 * @param {Player} player
 * @param {string} dimId
 * @param {Vector3} pos
 * @param {Acao} acao
 * @param {Zona} [zona]  também barra na zona de amortecimento
 * @returns {AreaBase | undefined}
 */
export function bloqueio(player, dimId, pos, acao, zona) {
  if (bypass.has(player.id)) return undefined;
  let area = baseEm(dimId, pos.x, pos.z);
  const naZona = !area && !!zona;
  if (naZona) area = zonaEm(dimId, pos.x, pos.z, zona === "mecanismo" ? MARGEM_PISTAO : 0);
  if (!area) return undefined;
  const dona = claPorId(area.claId);
  if (!dona) return undefined;
  if (naZona && zona === "entidade" && !dona.protecao.entidades) return undefined;
  const meu = claDe(player);
  if (meu?.id === dona.id) return naZona || pode(dona, player.id, "construir") ? undefined : area;
  if (dona.confianca.some((c) => c.id === player.id)) return undefined;
  if (meu && emGuerraAtiva(meu.id, dona.id)) return undefined;
  if (acao === "interagir" && meu && dona.acessoAliados && dona.aliados.includes(meu.id)) return undefined;
  return area;
}

/**
 * Como o item conta: ação (construir ou interagir) e se vale também na zona de amortecimento.
 * @param {ItemStack | undefined} item
 * @returns {{ acao: Acao, zona: Zona }}
 */
function classificar(item) {
  const id = item?.typeId ?? "";
  if (MECANISMOS.test(id)) return { acao: "construir", zona: "mecanismo" };
  if (ENTIDADES.test(id)) return { acao: "construir", zona: "entidade" };
  if (item && (BlockTypes.get(id) !== undefined || ITENS_DE_OBRA.test(id))) return { acao: "construir", zona: undefined };
  return { acao: "interagir", zona: undefined };
}

/**
 * Bloco vizinho na face clicada (onde um bloco seria colocado).
 * @param {Vector3} pos
 * @param {Direction} face
 * @returns {Vector3}
 */
function vizinho(pos, face) {
  switch (face) {
    case Direction.Up:
      return { x: pos.x, y: pos.y + 1, z: pos.z };
    case Direction.Down:
      return { x: pos.x, y: pos.y - 1, z: pos.z };
    case Direction.North:
      return { x: pos.x, y: pos.y, z: pos.z - 1 };
    case Direction.South:
      return { x: pos.x, y: pos.y, z: pos.z + 1 };
    case Direction.East:
      return { x: pos.x + 1, y: pos.y, z: pos.z };
    default:
      return { x: pos.x - 1, y: pos.y, z: pos.z };
  }
}

/**
 * Aviso curto na actionbar, com recarga (o evento roda em modo restrito: o aviso vai no próximo tick).
 * @param {Player} player
 * @param {AreaBase} area
 * @param {boolean} zona  bloqueou na zona de amortecimento
 */
function avisarBloqueio(player, area, zona) {
  const agora = system.currentTick;
  if (agora - (ultimoAviso.get(player.id) ?? -Infinity) < TICKS_AVISO_BLOQUEIO) return;
  ultimoAviso.set(player.id, agora);
  system.run(() => {
    if (!player.isValid) return;
    const dona = claPorId(area.claId);
    const membro = claDe(player)?.id === area.claId;
    const texto = membro || !dona ? textos.BASE_SEM_CONSTRUIR : zona ? textos.ZONA_PROTEGIDA(dona) : textos.BASE_PROTEGIDA(dona);
    player.onScreenDisplay.setActionBar(texto);
    som(player, SONS.erro);
  });
}

/**
 * Cancela o evento se a ação for bloqueada.
 * @param {{ cancel: boolean }} ev
 * @param {Player} player
 * @param {Vector3} pos
 * @param {AreaBase | undefined} area
 * @param {boolean} [avisar]
 */
function aplicar(ev, player, pos, area, avisar = true) {
  if (!area) return;
  ev.cancel = true;
  if (avisar) avisarBloqueio(player, area, distancia(Math.floor(pos.x), Math.floor(pos.z), area.x, area.z) > area.raio);
}

/**
 * Centro do spawn no Mundo normal (o marcado pela staff ou o padrão).
 * @returns {{ x: number, z: number } | undefined}
 */
function spawnXZ() {
  const salvo = lerMundo(CHAVE_SPAWN);
  if (salvo && salvo.d === OVERWORLD && Number.isFinite(salvo.x) && Number.isFinite(salvo.z)) return { x: salvo.x, z: salvo.z };
  try {
    const { x, z } = world.getDefaultSpawnLocation();
    return { x, z };
  } catch {
    return undefined;
  }
}

/**
 * Maior raio que uma base com centro em (x, z) pode ter: entre ela e cada outra base sobra pelo menos a
 * zona de amortecimento, e a borda fica a distanciaSpawnBase blocos do spawn.
 * @param {string} claId  a própria base não conta
 * @param {number} x
 * @param {number} z
 * @returns {{ raio: number, motivo?: string }}  motivo = tag do vizinho mais apertado ou "spawn"
 */
export function raioQueCabe(claId, x, z) {
  const zona = Math.max(1, larguraZona());
  let raio = Infinity;
  /** @type {string | undefined} */
  let motivo;
  for (const c of todosClas()) {
    if (c.id === claId || c.base?.d !== OVERWORLD) continue;
    const livre = distancia(x, z, c.base.x, c.base.z) - c.base.raio - 1 - zona;
    if (livre < raio) {
      raio = livre;
      motivo = c.tag;
    }
  }
  const spawn = spawnXZ();
  if (spawn) {
    const livre = distancia(x, z, Math.floor(spawn.x), Math.floor(spawn.z)) - Math.max(0, config().distanciaSpawnBase);
    if (livre < raio) {
      raio = livre;
      motivo = "spawn";
    }
  }
  return { raio, motivo };
}

/**
 * Caudas que o banco paga para marcar a base agora: a primeira vez é grátis; depois, o custo base com
 * aumentoMoverBasePct % a mais a cada nível do clã.
 * @param {Cla} cla
 */
export function custoMoverBase(cla) {
  if (cla.mudancasBase === 0) return 0;
  const cfg = config();
  const fator = Math.pow(1 + Math.max(0, cfg.aumentoMoverBasePct) / 100, cla.nivel - 1);
  return Math.max(0, Math.round(Math.max(0, cfg.custoMoverBase) * fator));
}

/**
 * Ms que faltam para poder marcar a base de novo (0 = pode). Conta da última marcação, mesmo que a base
 * tenha sido tirada depois (tirar e marcar não pula a espera).
 * @param {Cla} cla
 */
export function recargaBase(cla) {
  if (!cla.base && !cla.baseMudou) return 0;
  const resto = Math.max(cla.baseMudou, cla.base?.marcada ?? 0) + Math.max(0, config().recargaMoverBaseHoras) * HORA_MS - Date.now();
  return resto > 0 ? resto : 0;
}

/**
 * Marca (ou muda) o centro da base onde a pessoa está. Cobra do banco o custo de mover.
 * @param {Player} player
 * @returns {boolean}
 */
export function marcarBase(player) {
  const cla = claDe(player);
  if (!cla) return falhar(player, textos.SEM_CLA);
  if (!pode(cla, player.id, "terreno")) return falhar(player, textos.SEM_PERMISSAO);
  if (player.dimension.id !== OVERWORLD) return falhar(player, textos.BASE_SO_OVERWORLD);
  if (guerraDe(cla.id)) return falhar(player, textos.BASE_EM_GUERRA);
  const recarga = recargaBase(cla);
  if (recarga > 0) return falhar(player, textos.BASE_RECARGA(Math.ceil(recarga / 1000)));
  const x = Math.floor(player.location.x);
  const z = Math.floor(player.location.z);
  const cabe = raioQueCabe(cla.id, x, z);
  if (cabe.raio < RAIO_MINIMO) {
    return falhar(player, cabe.motivo === "spawn" ? textos.BASE_PERTO_SPAWN(config().distanciaSpawnBase) : textos.BASE_PERTO_OUTRA(cabe.motivo ?? "?"));
  }
  const custo = custoMoverBase(cla);
  if (cla.banco < custo) return falhar(player, textos.BASE_SEM_BANCO(custo));
  const raio = Math.min(defNivel(cla.nivel).raio, cabe.raio);
  const novo = editarCla(cla.id, (c) => {
    if (custo > 0 && !moverBanco(c, "base", -custo, player.name)) return false;
    c.base = { x, y: Math.floor(player.location.y), z, d: OVERWORLD, marcada: Date.now(), raio };
    c.baseMudou = c.base.marcada;
    c.mudancasBase++;
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  ok(player, textos.BASE_MARCADA(formatarCoords({ x, y: player.location.y, z }), raio, custo));
  if (raio < defNivel(cla.nivel).raio) msg(player, textos.BASE_APERTADA(defNivel(cla.nivel).raio));
  mostrarLimites(player);
  return true;
}

/**
 * Cresce a base até o raio do nível, onde couber (depois de subir de nível ou de um vizinho sair).
 * @param {string} claId
 * @returns {number} o raio novo (ou o atual, se não cresceu; 0 sem base)
 */
export function expandirBase(claId) {
  const cla = claPorId(claId);
  if (!cla?.base) return 0;
  const alvo = Math.min(defNivel(cla.nivel).raio, Math.max(cla.base.raio, raioQueCabe(cla.id, cla.base.x, cla.base.z).raio));
  if (alvo <= cla.base.raio) return cla.base.raio;
  const novo = editarCla(cla.id, (c) => {
    if (c.base) c.base.raio = alvo;
  });
  return novo?.base?.raio ?? cla.base.raio;
}

/**
 * Tira a base (a área fica livre). Não vale no meio de uma guerra.
 * @param {Player} player
 * @returns {boolean}
 */
export function desmarcarBase(player) {
  const cla = claDe(player);
  if (!cla) return falhar(player, textos.SEM_CLA);
  if (!pode(cla, player.id, "terreno")) return falhar(player, textos.SEM_PERMISSAO);
  if (!cla.base) return falhar(player, textos.SEM_BASE);
  if (guerraDe(cla.id)) return falhar(player, textos.BASE_EM_GUERRA);
  if (
    !editarCla(cla.id, (c) => {
      c.base = null;
    })
  ) {
    return falhar(player, textos.ERRO_GRAVAR);
  }
  ok(player, textos.BASE_DESMARCADA);
  return true;
}

/**
 * Liga ou desliga uma proteção extra da base (TNT, creeper, outras explosões, entidades de fora).
 * @param {Player} player
 * @param {keyof import("./cla_dados.js").ProtecaoBase} chave
 * @returns {boolean}
 */
export function alternarProtecao(player, chave) {
  const cla = claDe(player);
  if (!cla) return falhar(player, textos.SEM_CLA);
  if (!pode(cla, player.id, "terreno")) return falhar(player, textos.SEM_PERMISSAO);
  const novo = editarCla(cla.id, (c) => {
    c.protecao[chave] = !c.protecao[chave];
  });
  if (!novo) return falhar(player, textos.ERRO_GRAVAR);
  ok(player, textos.PROTECAO_MUDOU(chave, novo.protecao[chave]));
  return true;
}

/**
 * Mostra a borda da base em partículas perto de quem pediu (10 s).
 * @param {Player} player
 */
export function mostrarLimites(player) {
  if (!claDe(player)?.base) {
    erro(player, textos.SEM_BASE);
    return;
  }
  let vezes = 0;
  const run = system.runInterval(() => {
    const base = claDe(player)?.base;
    if (!player.isValid || !base || ++vezes > VEZES_LIMITES) {
      system.clearRun(run);
      return;
    }
    desenharBorda(player, base);
  }, 20);
}

/**
 * Partículas na borda do quadrado (a cada 2 blocos), só no trecho perto do jogador.
 * @param {Player} player
 * @param {{ x: number, z: number, raio: number }} base
 */
function desenharBorda(player, base) {
  if (player.dimension.id !== OVERWORLD) return;
  const { x: px, y: py, z: pz } = player.location;
  const min = { x: base.x - base.raio, z: base.z - base.raio };
  const max = { x: base.x + base.raio + 1, z: base.z + base.raio + 1 };
  // Só o trecho de cada lado que fica a até ALCANCE_LIMITES blocos (bases grandes têm lados de 2 mil blocos).
  const de = (/** @type {number} */ c, /** @type {number} */ lo) => Math.max(0, Math.floor(c - ALCANCE_LIMITES - lo));
  const ate = (/** @type {number} */ c, /** @type {number} */ lo, /** @type {number} */ hi) => Math.min(hi - lo, Math.ceil(c + ALCANCE_LIMITES - lo));
  /** @type {{ x: number, z: number }[]} */
  const pontos = [];
  for (let t = de(px, min.x); t <= ate(px, min.x, max.x); t += 2) pontos.push({ x: min.x + t, z: min.z }, { x: min.x + t, z: max.z });
  for (let t = de(pz, min.z); t <= ate(pz, min.z, max.z); t += 2) pontos.push({ x: min.x, z: min.z + t }, { x: max.x, z: min.z + t });
  for (const p of pontos) {
    if (Math.abs(p.x - px) > ALCANCE_LIMITES || Math.abs(p.z - pz) > ALCANCE_LIMITES) continue;
    try {
      player.dimension.spawnParticle(PARTICULA_LIMITE, { x: p.x, y: py + 1, z: p.z });
    } catch {
      // Trecho num chunk que não carregou: só não desenha.
    }
  }
}

/**
 * Liga ou desliga o bypass da proteção (só staff, registrado no log dos clãs).
 * @param {Player} player
 * @returns {boolean}
 */
export function alternarBypass(player) {
  if (!ehStaff(player)) return falhar(player, textos.SO_STAFF);
  const ligado = !bypass.has(player.id);
  if (ligado) bypass.add(player.id);
  else bypass.delete(player.id);
  registrarLog(player.name, ligado ? textos.LOG_BYPASS_ON : textos.LOG_BYPASS_OFF);
  ok(player, textos.BYPASS_MUDOU(ligado));
  return true;
}

/**
 * @param {Player} player
 * @param {string} texto
 * @returns {false}
 */
function falhar(player, texto) {
  erro(player, texto);
  return false;
}

/**
 * A explosão desta fonte quebra blocos dentro da base? Depende das proteções ligadas no clã.
 * @param {Cla} cla
 * @param {string} fonte  typeId de quem explodiu ("" sem fonte: cama, âncora...)
 */
function explosaoBarrada(cla, fonte) {
  if (fonte === "minecraft:tnt" || fonte === "minecraft:tnt_minecart") return cla.protecao.tnt;
  if (fonte === "minecraft:creeper") return cla.protecao.creeper;
  return cla.protecao.explosoes;
}

/** Território: avisa na actionbar ao entrar e ao sair de uma base. */
function checarTerritorio() {
  const temBases = listaAreas().length > 0;
  if (!temBases && territorio.size === 0) return;
  for (const p of online()) {
    const area = temBases ? baseEm(p.dimension.id, p.location.x, p.location.z) : undefined;
    const atual = area?.claId ?? "";
    const antes = territorio.get(p.id) ?? "";
    if (atual === antes) continue;
    if (atual) territorio.set(p.id, atual);
    else territorio.delete(p.id);
    if (emEspera(p)) continue;
    const cla = claPorId(atual || antes);
    if (!cla) continue;
    const meu = claDe(p);
    const guerra = !!meu && emGuerraAtiva(meu.id, cla.id);
    p.onScreenDisplay.setActionBar(atual ? textos.ENTROU_TERRITORIO(cla, meu?.id === cla.id, guerra) : textos.SAIU_TERRITORIO(cla));
  }
}

aoMudarCla(() => {
  areas = undefined;
});

system.runInterval(() => {
  try {
    checarTerritorio();
  } catch (e) {
    registrarErro("Território dos clãs", e);
  }
}, TICKS_TERRITORIO);

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  try {
    const pos = ev.block.location;
    aplicar(ev, ev.player, pos, bloqueio(ev.player, ev.dimension.id, pos, "construir"));
  } catch (e) {
    registrarErro("Proteção (quebrar)", e);
  }
});

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  try {
    const { player, block } = ev;
    const dim = block.dimension.id;
    const { acao, zona } = classificar(ev.itemStack);
    // Colocar bloco: confere o bloco clicado e também onde o novo bloco vai parar.
    const alvo = vizinho(block.location, ev.blockFace);
    let pos = block.location;
    let area = bloqueio(player, dim, pos, acao, zona);
    if (!area && acao === "construir") {
      // A cama ocupa também um bloco ao lado: confere os 4 em volta de onde ela vai parar.
      const lados = CAMA.test(ev.itemStack?.typeId ?? "")
        ? [Direction.North, Direction.South, Direction.East, Direction.West].map((d) => vizinho(alvo, d))
        : [];
      for (const p of [alvo, ...lados]) {
        area = bloqueio(player, dim, p, acao, zona);
        pos = p;
        if (area) break;
      }
    }
    aplicar(ev, player, pos, area, ev.isFirstEvent);
  } catch (e) {
    registrarErro("Proteção (interagir)", e);
  }
});

// Barco na água, balde no ar, cristal...: o uso do item sem mirar num bloco sólido.
world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    const { zona } = classificar(ev.itemStack);
    if (!zona) return;
    const player = ev.source;
    const pos = player.location;
    aplicar(ev, player, pos, bloqueio(player, player.dimension.id, pos, "construir", zona));
  } catch (e) {
    registrarErro("Proteção (usar item)", e);
  }
});

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    const { player, target } = ev;
    if (target instanceof Player) return;
    const { acao } = classificar(ev.itemStack);
    const pos = target.location;
    aplicar(ev, player, pos, bloqueio(player, target.dimension.id, pos, acao));
  } catch (e) {
    registrarErro("Proteção (entidade)", e);
  }
});

// Bichos, molduras e suportes de armadura da base: quem é de fora não fere (monstros continuam liberados).
world.beforeEvents.entityHurt.subscribe((ev) => {
  try {
    const alvo = ev.hurtEntity;
    const atacante = ev.damageSource.damagingEntity;
    if (alvo instanceof Player || !(atacante instanceof Player)) return;
    const pos = alvo.location;
    if (!baseEm(alvo.dimension.id, pos.x, pos.z)) return;
    let monstro = true;
    try {
      monstro = alvo.matches({ families: ["monster"] });
    } catch {
      // Sem família conhecida: trata como monstro (não atrapalha a defesa).
    }
    if (!monstro) aplicar(ev, atacante, pos, bloqueio(atacante, alvo.dimension.id, pos, "construir"));
  } catch (e) {
    registrarErro("Proteção (dano em entidade)", e);
  }
});

// Anzol de quem é de fora que fisgou um bicho da base: some antes de puxar (o bicho fica onde está).
world.afterEvents.projectileHitEntity.subscribe((ev) => {
  try {
    if (ev.projectile.typeId !== "minecraft:fishing_hook" || !(ev.source instanceof Player)) return;
    const alvo = ev.getEntityHit().entity;
    if (!alvo || alvo instanceof Player || !alvo.isValid) return;
    const pos = alvo.location;
    if (!baseEm(alvo.dimension.id, pos.x, pos.z)) return;
    if (bloqueio(ev.source, alvo.dimension.id, pos, "construir")) ev.projectile.remove();
  } catch (e) {
    registrarErro("Proteção (anzol)", e);
  }
});

// Explosões (inclusive com o centro do lado de fora) não quebram blocos da base, conforme as proteções do clã.
world.beforeEvents.explosion.subscribe((ev) => {
  try {
    if (ev.dimension.id !== OVERWORLD || !listaAreas().length) return;
    const fonte = ev.source?.typeId ?? "";
    const blocos = ev.getImpactedBlocks();
    if (!blocos.length) return;
    // Só as bases que encostam no quadrado da explosão (canhão de TNT = muitas explosões no mesmo tick).
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const { location: l } of blocos) {
      x0 = Math.min(x0, l.x);
      x1 = Math.max(x1, l.x);
      z0 = Math.min(z0, l.z);
      z1 = Math.max(z1, l.z);
    }
    const perto = listaAreas().filter((a) => a.x + a.raio >= x0 && a.x - a.raio <= x1 && a.z + a.raio >= z0 && a.z - a.raio <= z1);
    if (!perto.length) return;
    const barradas = perto.filter((a) => {
      const dona = claPorId(a.claId);
      return !!dona && explosaoBarrada(dona, fonte);
    });
    if (!barradas.length) return;
    const livres = blocos.filter((b) => !barradas.some((a) => distancia(Math.floor(b.location.x), Math.floor(b.location.z), a.x, a.z) <= a.raio));
    if (livres.length !== blocos.length) ev.setImpactedBlocks(livres);
  } catch (e) {
    registrarErro("Proteção (explosão)", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  bypass.delete(playerId);
  ultimoAviso.delete(playerId);
  territorio.delete(playerId);
});
