// @ts-check
// Efeitos de abate dos Kitsune: quando alguém com o selo vence outro jogador no PvP, aparece uma cena curta onde a vítima
// caiu (entidades vulpus:abate com modelo e animação do resource pack, mais partículas e sons). Cada abate sorteia uma
// coreografia, um padrão de partículas, as variações de cada peça e os sons, sem repetir o anterior. Só visual.
import { Player, system, world } from "@minecraft/server";
import { config, dadosJogador, editarJogador } from "../core/db.js";
import { ehDono } from "../core/dono.js";
import { anel, emitir } from "../core/efeitos.js";
import { Lista } from "../core/forms.js";
import { registrarErro, som } from "../core/util.js";
import { ICONES } from "../config.js";
import * as textos from "../textos/abate.js";
import { ESTILOS_BANDEIRA } from "./cla_dados.js";
import { temSelo } from "./kitsune.js";

/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {import("@minecraft/server").Vector3} Vector3 */
/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").RGB} RGB */

const TIPO = "vulpus:abate";
/** Formas das peças (a propriedade vulpus:forma do modelo). */
const F = Object.freeze({ LAMINA: 0, SELO: 1, PILAR: 2, ESPIRITO: 3, ORBITAIS: 4, CLARAO: 5 });
/** Ticks da cena: depois disso as peças saem (o modelo já apaga sozinho, e a entidade tem um timer de reserva). */
const FIM = 48;
/** Quem estiver até aqui ouve os sons da cena (blocos). */
const RAIO_SOM = 24;
const ESPERA_PREVIA = 4000;

const cor = (r, g, b) => ({ red: r, green: g, blue: b });
const LARANJA = cor(1, 0.5, 0.08), BRANCO = cor(1, 0.95, 0.85), ROSA = cor(1, 0.5, 0.65), LAVANDA = cor(0.7, 0.66, 1);
const AZUL = cor(0.25, 0.65, 1), VERMELHO = cor(0.95, 0.25, 0.08), AMARELO = cor(1, 0.75, 0.2), VERDE = cor(0.25, 0.95, 0.65);
const MAGENTA = cor(0.85, 0.4, 1), ROXO = cor(0.55, 0.2, 0.95), DOURADO = cor(1, 0.82, 0.3);

const P = Object.freeze({
  CHAMA: "minecraft:colored_flame_particle",
  FATUO: "minecraft:basic_flame_particle",
  FAISCA: "minecraft:endrod",
  PETALA: "minecraft:cherry_leaves_particle",
  CORACAO: "minecraft:heart_particle",
  FUMACA: "minecraft:basic_smoke_particle",
  ALMA: "minecraft:soul_particle",
  TOTEM: "minecraft:totem_particle",
});
/** @typedef {[string, number, number]} Nota  id, tom, volume */

/**
 * @typedef {object} Visual
 * @property {RGB[]} cores  cores das chamas coloridas
 * @property {string} brilho  partícula principal (espirais e anéis)
 * @property {string} queda  partícula da chuva
 * @property {Nota[]} impacto  sons do primeiro instante (sorteia um)
 * @property {Nota[]} eco  sons depois do impacto (sorteia um)
 * @property {string[]} coreos  coreografias que combinam com o tema
 */

const S = Object.freeze({
  RAPOSA: "mob.fox.ambient",
  FOGOS: "firework.twinkle",
  SINO: "note.chime",
  ALMA: "particle.soul_escape",
  PORTAL: "mob.endermen.portal",
  SOPRO: "wind_charge.burst",
  CARGA: "respawn_anchor.charge",
  LAREIRA: "block.campfire.crackle",
  SINO_VILA: "block.bell.hit",
  ALLAY: "mob.allay.item_given",
  ARMADURA: "armor.equip_gold",
  NIVEL: "random.levelup",
  ORBE: "random.orb",
});

/** @type {Record<string, Visual>} */
const VISUAL = {
  caudas: {
    cores: [LARANJA, BRANCO], brilho: P.FAISCA, queda: P.FATUO,
    impacto: [[S.RAPOSA, 1.2, 0.9], [S.FOGOS, 0.9, 0.9], [S.SOPRO, 1.3, 0.7]], eco: [[S.SINO, 1.5, 0.6], [S.ALMA, 1.2, 0.6], [S.FOGOS, 1.4, 0.6]],
    coreos: ["corte", "assombro", "floracao", "redemoinho", "cruz"],
  },
  sakura: {
    cores: [ROSA, BRANCO], brilho: P.PETALA, queda: P.PETALA,
    impacto: [[S.SINO, 1.7, 0.8], [S.ALLAY, 1.4, 0.8], [S.SOPRO, 1.5, 0.6]], eco: [[S.SINO, 2, 0.5], [S.ORBE, 1.6, 0.5], [S.FOGOS, 1.6, 0.5]],
    coreos: ["floracao", "redemoinho", "ascensao", "corte"],
  },
  lunar: {
    cores: [LAVANDA, BRANCO], brilho: P.FAISCA, queda: P.FAISCA,
    impacto: [[S.PORTAL, 1.6, 0.6], [S.SINO_VILA, 1.6, 0.6], [S.SOPRO, 1.1, 0.7]], eco: [[S.SINO, 1.9, 0.5], [S.ALLAY, 1.8, 0.6]],
    coreos: ["corte", "cruz", "ascensao", "assombro"],
  },
  espirito: {
    cores: [AZUL, BRANCO], brilho: P.ALMA, queda: P.ALMA,
    impacto: [[S.ALMA, 1, 1], [S.RAPOSA, 0.8, 0.9], [S.PORTAL, 1.3, 0.5]], eco: [[S.ALMA, 1.4, 0.8], [S.SINO, 1.3, 0.5]],
    coreos: ["assombro", "redemoinho", "ascensao", "cruz", "floracao"],
  },
  brasa: {
    cores: [VERMELHO, LARANJA, AMARELO], brilho: P.FATUO, queda: P.FATUO,
    impacto: [[S.LAREIRA, 1, 1], [S.CARGA, 1.4, 0.8], [S.SOPRO, 0.9, 0.9]], eco: [[S.LAREIRA, 1.3, 0.8], [S.FOGOS, 0.8, 0.7]],
    coreos: ["ascensao", "cruz", "corte", "floracao"],
  },
  aurora: {
    cores: [VERDE, MAGENTA, AZUL], brilho: P.FAISCA, queda: P.FAISCA,
    impacto: [[S.ALLAY, 1.2, 0.9], [S.CARGA, 1.8, 0.7], [S.SINO, 1.3, 0.8]], eco: [[S.SINO, 1.8, 0.6], [S.ORBE, 1.2, 0.5]],
    coreos: ["redemoinho", "ascensao", "floracao", "assombro"],
  },
  estelar: {
    cores: [DOURADO, LAVANDA, BRANCO], brilho: P.FAISCA, queda: P.TOTEM,
    impacto: [[S.NIVEL, 1.3, 0.7], [S.FOGOS, 1.2, 1], [S.ARMADURA, 1.1, 0.8]], eco: [[S.SINO, 2, 0.6], [S.ORBE, 1.9, 0.6]],
    coreos: ["cruz", "corte", "redemoinho", "ascensao"],
  },
  sombra: {
    cores: [ROXO, MAGENTA], brilho: P.ALMA, queda: P.FUMACA,
    impacto: [[S.PORTAL, 0.7, 0.8], [S.ALMA, 0.7, 1], [S.RAPOSA, 0.6, 0.9]], eco: [[S.PORTAL, 1, 0.5], [S.SINO_VILA, 0.7, 0.5]],
    coreos: ["assombro", "corte", "cruz", "redemoinho"],
  },
  ditadora: {
    cores: [ROXO, DOURADO, BRANCO], brilho: P.CORACAO, queda: P.FAISCA,
    impacto: [[S.ALLAY, 1.5, 0.9], [S.RAPOSA, 1.5, 0.8], [S.ARMADURA, 1.3, 0.8]], eco: [[S.SINO, 1.6, 0.6], [S.ORBE, 1.4, 0.5], [S.NIVEL, 1.6, 0.4]],
    coreos: ["floracao", "assombro", "redemoinho", "ascensao", "cruz"],
  },
};

/**
 * @typedef {object} Passo
 * @property {number} t  tick (depois do abate) em que a peça aparece
 * @property {number} forma
 * @property {number} v  variação 0..3 (sentido e velocidade do giro)
 * @property {number} tam  0..2
 * @property {number} yaw  graus
 */

/** @param {number} a @param {number} b */
const entre = (a, b) => a + Math.random() * (b - a);
/** @param {number} n */
const inteiro = (n) => Math.floor(Math.random() * n);
/** @template T @param {readonly T[]} lista @returns {T} */
const sortear = (lista) => lista[inteiro(lista.length)];
/** @returns {number} */
const yawAleatorio = () => entre(0, 360);
const jitter = () => inteiro(2);

/** @returns {Passo} @param {number} t @param {number} forma @param {number} [yaw] @param {number} [tam] */
function peca(t, forma, yaw = yawAleatorio(), tam = 1) {
  return { t, forma, v: inteiro(4), tam, yaw };
}

/** @type {Record<string, () => Passo[]>} */
const COREOS = {
  corte: () => {
    const y0 = yawAleatorio();
    const lista = [peca(0, F.CLARAO), peca(0, F.LAMINA, y0, 2), peca(3 + jitter(), F.LAMINA, y0 + entre(45, 75), 1), peca(6 + jitter(), F.LAMINA, y0 - entre(45, 75), 1)];
    if (Math.random() < 0.5) lista.push(peca(9 + jitter(), F.LAMINA, y0 + entre(100, 140), 2));
    return lista;
  },
  floracao: () => [peca(0, F.SELO), peca(0, F.CLARAO), peca(1, F.ORBITAIS), peca(7 + jitter(), F.PILAR, yawAleatorio(), 0)],
  ascensao: () => [peca(0, F.PILAR, yawAleatorio(), 2), peca(0, F.ORBITAIS), peca(6 + jitter(), F.ORBITAIS, yawAleatorio(), 2), peca(10 + jitter(), F.ESPIRITO)],
  assombro: () => {
    const y0 = yawAleatorio();
    return [peca(0, F.ESPIRITO, y0, 2), peca(2, F.LAMINA, y0 + 20, 1), peca(6 + jitter(), F.LAMINA, y0 + 110, 1), peca(10, F.SELO), peca(10, F.CLARAO)];
  },
  cruz: () => [peca(0, F.PILAR, yawAleatorio(), 1), peca(0, F.CLARAO), peca(2, F.SELO), peca(3 + jitter(), F.PILAR, yawAleatorio(), 1), peca(8, F.ORBITAIS)],
  redemoinho: () => [peca(0, F.ORBITAIS), peca(0, F.SELO), peca(3, F.ORBITAIS, yawAleatorio(), 2), peca(6 + jitter(), F.ESPIRITO), peca(12, F.CLARAO)],
};

let ativos = 0;
/** @type {Map<string, { tema: string, coreo: string, padrao: string, t: number }>} último abate de cada pessoa */
const ultimos = new Map();
/** @type {Map<string, number>} id → quando foi a última prévia */
const previas = new Map();

const PADROES = ["espiral", "explosao", "chuva", "aneis"];

/**
 * Cria uma peça no mundo (modelo animado no resource pack).
 * @param {Dimension} dim
 * @param {Vector3} pos
 * @param {number} tema
 * @param {Passo} p
 * @returns {Entity | undefined}
 */
function criarPeca(dim, pos, tema, p) {
  try {
    const e = dim.spawnEntity(TIPO, pos);
    e.setProperty("vulpus:tema", tema);
    e.setProperty("vulpus:forma", p.forma);
    e.setProperty("vulpus:var", p.v);
    e.setProperty("vulpus:tam", p.tam);
    e.setRotation({ x: 0, y: p.yaw % 360 });
    return e;
  } catch (e) {
    registrarErro("Abate: peça", e);
    return undefined;
  }
}

/**
 * Sons para quem está perto (cada pessoa só ouve se não desligou os sons).
 * @param {Dimension} dim
 * @param {Vector3} pos
 * @param {Nota} nota
 */
function tocar(dim, pos, nota) {
  try {
    for (const p of dim.getPlayers({ location: pos, maxDistance: RAIO_SOM })) som(p, nota[0], { location: pos, pitch: nota[1], volume: nota[2] });
  } catch (e) {
    registrarErro("Abate: som", e);
  }
}

/**
 * Partículas de apoio do tick k, conforme o padrão sorteado.
 * @param {Dimension} dim
 * @param {Vector3} c
 * @param {Visual} v
 * @param {string} padrao
 * @param {number} k
 * @param {number} base  ângulo inicial sorteado
 */
function particulas(dim, c, v, padrao, k, base) {
  const chama = (/** @type {number} */ i) => v.cores[i % v.cores.length];
  if (padrao === "espiral") {
    if (k > 36) return;
    for (let braco = 0; braco < 2; braco++) {
      const a = base + k * 0.5 + braco * Math.PI;
      const r = 0.5 + k * 0.035;
      const pos = { x: c.x + Math.cos(a) * r, y: c.y + 0.1 + k * 0.07, z: c.z + Math.sin(a) * r };
      if (!emitir(dim, braco ? v.brilho : P.CHAMA, pos, chama(k + braco))) return;
    }
  } else if (padrao === "explosao") {
    if (k > 3) return;
    anel(dim, c, { raio: 0.4 + k * 0.7, n: 12 + k * 3, y: 0.3 + k * 0.25, giro: base }, k % 2 ? v.brilho : P.CHAMA, v.cores);
  } else if (padrao === "chuva") {
    if (k < 4 || k > 40) return;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.9;
      const pos = { x: c.x + Math.cos(a) * r, y: c.y + 3.6 - (k - 4) * 0.095, z: c.z + Math.sin(a) * r };
      if (!emitir(dim, i ? v.queda : P.CHAMA, pos, chama(k + i))) return;
    }
  } else {
    if (k % 6 !== 0 || k > 30) return;
    anel(dim, c, { raio: 1.3 + (k / 6) * 0.15, n: 14, y: 0.15 + k * 0.05, giro: base + k }, k % 12 ? P.CHAMA : v.brilho, v.cores);
  }
}

/**
 * Toca a cena inteira.
 * @param {Dimension} dim
 * @param {Vector3} pos
 * @param {string} tema  um id de ESTILOS_BANDEIRA
 * @param {string} coreo
 * @param {string} padrao
 */
export function tocarCena(dim, pos, tema, coreo, padrao) {
  const v = VISUAL[tema];
  const indice = ESTILOS_BANDEIRA.indexOf(tema);
  if (!v || indice < 0 || !COREOS[coreo]) return;
  const passos = COREOS[coreo]().sort((a, b) => a.t - b.t);
  const impacto = sortear(v.impacto), eco = sortear(v.eco);
  const base = Math.random() * Math.PI * 2;
  /** @type {Entity[]} */
  const pecas = [];
  let k = 0;
  ativos++;
  const id = system.runInterval(() => {
    try {
      for (const p of passos) if (p.t === k) {
        const e = criarPeca(dim, pos, indice, p);
        if (e) pecas.push(e);
      }
      particulas(dim, pos, v, padrao, k, base);
      if (k === 0) tocar(dim, pos, impacto);
      if (k === 7) tocar(dim, pos, eco);
    } catch (e) {
      registrarErro("Abate: cena", e);
      k = FIM;
    }
    k++;
    if (k <= FIM) return;
    system.clearRun(id);
    ativos = Math.max(0, ativos - 1);
    for (const e of pecas) {
      try {
        if (e.isValid) e.remove();
      } catch {
        // já sumiu sozinha (timer da entidade)
      }
    }
  }, 1);
}

/**
 * Sorteia tema, coreografia e padrão sem repetir o último abate daquela pessoa.
 * @param {string} id  de quem venceu
 * @param {string} escolha  "auto" ou um tema
 * @returns {{ tema: string, coreo: string, padrao: string }}
 */
export function sortearCena(id, escolha) {
  const ant = ultimos.get(id);
  const temas = ESTILOS_BANDEIRA.filter((t) => VISUAL[t]);
  let tema = temas.includes(escolha) ? escolha : sortear(temas.filter((t) => t !== ant?.tema).length ? temas.filter((t) => t !== ant?.tema) : temas);
  const coreos = VISUAL[tema].coreos;
  const coreo = sortear(coreos.filter((c) => c !== ant?.coreo).length ? coreos.filter((c) => c !== ant?.coreo) : coreos);
  const padrao = sortear(PADROES.filter((p) => p !== ant?.padrao));
  ultimos.set(id, { tema, coreo, padrao, t: Date.now() });
  return { tema, coreo, padrao };
}

/**
 * Quem tem direito aos efeitos (selo Kitsune ou dono).
 * @param {Player} p
 */
function podeTer(p) {
  return temSelo(p) || ehDono(p);
}

/**
 * Um jogador venceu outro no PvP.
 * @param {Player} matador
 * @param {Player} vitima
 */
export function aoAbate(matador, vitima) {
  const cfg = config();
  if (!cfg.abateLigado || matador.id === vitima.id || !podeTer(matador)) return;
  const escolha = dadosJogador(matador).ajustes.abate;
  if (escolha === "off" || ativos >= cfg.abateMaxSimultaneos) return;
  const agora = Date.now();
  const ant = ultimos.get(matador.id);
  if (ant && agora - ant.t < cfg.abateEsperaSeg * 1000) return;
  const { x, y, z } = vitima.location;
  if (y < -62) return;
  const cena = sortearCena(matador.id, escolha);
  tocarCena(vitima.dimension, { x, y: y + 0.05, z }, cena.tema, cena.coreo, cena.padrao);
  try {
    matador.onScreenDisplay.setActionBar(textos.BARRA_ABATE(textos.NOME_TEMA(cena.tema)));
  } catch {
    // jogador saiu na hora
  }
}

/**
 * Prévia do efeito escolhido, alguns blocos à frente de quem pediu.
 * @param {Player} player
 */
export function previa(player) {
  if (!config().abateLigado) {
    player.sendMessage(textos.PREVIA_FORA);
    return;
  }
  const agora = Date.now();
  if (agora - (previas.get(player.id) ?? 0) < ESPERA_PREVIA) {
    player.sendMessage(textos.PREVIA_ESPERA);
    return;
  }
  previas.set(player.id, agora);
  const escolha = dadosJogador(player).ajustes.abate;
  const cena = sortearCena(player.id, escolha === "off" ? "auto" : escolha);
  const d = player.getViewDirection();
  const h = Math.hypot(d.x, d.z) || 1;
  const { x, y, z } = player.location;
  tocarCena(player.dimension, { x: x + (d.x / h) * 4, y, z: z + (d.z / h) * 4 }, cena.tema, cena.coreo, cena.padrao);
}

/**
 * Menu: escolher o tema (ou automático/desligado) e ver uma prévia.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuAbate(player, voltar) {
  if (!podeTer(player)) {
    await new Lista(textos.TITULO).texto(textos.SEM_SELO).voltar(voltar).abrir(player);
    return;
  }
  const aqui = () => menuAbate(player, voltar);
  const atual = dadosJogador(player).ajustes.abate;
  const escolher = (/** @type {string} */ valor, /** @type {boolean} */ ver) => async (/** @type {Player} */ p) => {
    editarJogador(p, (d) => {
      d.ajustes.abate = valor;
    });
    if (ver && valor !== "off") previa(p);
    await aqui();
  };
  const lista = new Lista(textos.TITULO).texto(textos.CORPO(textos.NOME_ESCOLHA(atual)));
  lista.botao(textos.BOTAO_OPCAO(textos.BOTAO_AUTO, textos.DESC_AUTO, atual === "auto"), ICONES.tema, escolher("auto", true));
  for (const t of ESTILOS_BANDEIRA) {
    lista.botao(textos.BOTAO_OPCAO(textos.NOME_TEMA(t), textos.DESCRICOES[t] ?? "", atual === t), ICONES.tema, escolher(t, true));
  }
  lista.botao(textos.BOTAO_PREVIA, ICONES.ajustes, async (p) => {
    previa(p);
    await aqui();
  });
  lista.botao(textos.BOTAO_OPCAO(textos.BOTAO_DESLIGADO, textos.DESC_DESLIGADO, atual === "off"), ICONES.nao, escolher("off", false));
  await lista.voltar(voltar).abrir(player);
}

/** @param {unknown} fonte */
function jogadorDe(fonte) {
  return fonte instanceof Player ? fonte : undefined;
}

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  try {
    if (!(deadEntity instanceof Player)) return;
    const matador = jogadorDe(damageSource.damagingEntity) ?? jogadorDe(damageSource.damagingProjectile);
    if (matador) aoAbate(matador, deadEntity);
  } catch (e) {
    registrarErro("Abate: morte", e);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  ultimos.delete(playerId);
  previas.delete(playerId);
});

