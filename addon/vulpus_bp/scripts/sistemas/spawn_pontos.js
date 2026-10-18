// @ts-check
// Pontos de spawn múltiplos: um círculo (ou pontos soltos) em volta do lobby. Novatos nascem num ponto sorteado; o /spawn
// sorteia ou deixa a pessoa escolher, conforme o modo. A staff cria, mostra e remove pelo menu Mundo e locais.
import { system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { dadosJogador, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { localDe, teleportar } from "../core/teleporte.js";
import { erro, formatarCoords, limitar, ok, registrarErro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textos from "../textos/spawn_pontos.js";

/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {import("../core/teleporte.js").Local} Local */
/** @typedef {{ modo: "aleatorio" | "escolher", pontos: Local[] }} Dados */

const CHAVE = "vulpus:spawns";
const MAX_PONTOS = 48;
const MIN_CIRCULO = 12;
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };

/** @type {Dados | undefined} */
let dados;

/** @param {any} p @returns {p is Local} */
const ehLocal = (p) => !!p && typeof p.d === "string" && [p.x, p.y, p.z].every((n) => typeof n === "number" && Number.isFinite(n));

/** @returns {Dados} */
function ler() {
  if (dados) return dados;
  const s = /** @type {any} */ (lerMundo(CHAVE, {}));
  dados = { modo: s?.modo === "escolher" ? "escolher" : "aleatorio", pontos: Array.isArray(s?.pontos) ? s.pontos.filter(ehLocal) : [] };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, ler());
}

/** Os pontos de spawn marcados. */
export const pontosDeSpawn = () => ler().pontos;

/** Um ponto sorteado, ou undefined se não há pontos. */
export function pontoSorteado() {
  const p = ler().pontos;
  return p.length ? p[Math.floor(Math.random() * p.length)] : undefined;
}

/**
 * Para onde o /spawn leva: sorteia, ou pergunta à pessoa no modo "escolher".
 * "nenhum" = sem pontos (vale o spawn único); "cancelou" = fechou a escolha.
 * @param {Player} player
 * @returns {Promise<{ tipo: "nenhum" | "cancelou" } | { tipo: "ponto", local: Local }>}
 */
export async function destinoDosPontos(player) {
  const d = ler();
  if (!d.pontos.length) return { tipo: "nenhum" };
  if (d.modo !== "escolher") return { tipo: "ponto", local: /** @type {Local} */ (pontoSorteado()) };
  /** @type {Local | undefined} */
  let escolhido;
  let respondeu = false;
  const tela = new Lista(textos.TITULO_ESCOLHA).texto(textos.CORPO_ESCOLHA);
  tela.botao(textos.BOTAO_SORTE, ICONES.spawn, () => {
    respondeu = true;
    escolhido = pontoSorteado();
  });
  d.pontos.forEach((p, i) =>
    tela.botao(textos.NOME_PONTO(i + 1), ICONES.spawn, () => {
      respondeu = true;
      escolhido = p;
    }),
  );
  await tela.abrir(player);
  return respondeu && escolhido ? { tipo: "ponto", local: escolhido } : { tipo: "cancelou" };
}

// Novatos nascem num ponto sorteado (antes de as boas-vindas gravarem a primeira entrada).
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;
  system.runTimeout(() => {
    try {
      if (!player.isValid) return;
      if (dadosJogador(player).primeira) return;
      const p = pontoSorteado();
      if (!p) return;
      player.teleport({ x: p.x, y: p.y, z: p.z }, { dimension: world.getDimension(p.d), rotation: { x: p.rx ?? 0, y: p.ry ?? 0 } });
    } catch (e) {
      registrarErro("Spawn múltiplo (novato)", e);
    }
  }, 10);
});

// ------------------------------------------------------------------------------ painel da staff

/** @param {Player} player */
function mostrar(player) {
  const dim = player.dimension;
  let vezes = 0;
  const run = system.runInterval(() => {
    try {
      if (++vezes > 8 || !player.isValid) {
        system.clearRun(run);
        return;
      }
      for (const p of ler().pontos) {
        if (p.d !== dim.id) continue;
        for (let k = 0; k < 4; k++) efeitos.emitir(dim, "minecraft:endrod", { x: p.x, y: p.y + 0.2 + k * 0.5, z: p.z });
        efeitos.emitir(dim, "minecraft:colored_flame_particle", { x: p.x, y: p.y + 2.4, z: p.z }, DOURADO);
      }
    } catch (e) {
      system.clearRun(run);
      registrarErro("Spawn múltiplo (mostrar)", e);
    }
  }, 10);
}

/**
 * Cria o círculo em volta de quem chamou: cada ponto na altura da pessoa, olhando para o centro, para fora ou como estava.
 * @param {Player} player
 * @param {number} raio
 * @param {number} qtd
 * @param {boolean} substituir
 * @param {number} olhar  índice em OLHARES
 */
export function criarCirculo(player, raio, qtd, substituir, olhar) {
  const d = ler();
  const base = substituir ? [] : d.pontos;
  const n = limitar(Math.floor(qtd), 1, MAX_PONTOS - base.length);
  if (n < 1) {
    erro(player, textos.LIMITE(MAX_PONTOS));
    return;
  }
  const { x, y, z } = player.location;
  const rx = player.getRotation();
  const r1 = (/** @type {number} */ v) => Math.round(v * 10) / 10;
  /** @type {Local[]} */
  const novos = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * raio;
    const pz = z + Math.sin(a) * raio;
    // yaw do Minecraft: 0 = sul (+z), 90 = oeste (-x); para o centro = direção de (centro - ponto)
    const paraCentro = (Math.atan2(-(x - px), z - pz) * 180) / Math.PI;
    const ry = olhar === 0 ? paraCentro : olhar === 1 ? paraCentro + 180 : rx.y;
    novos.push({ x: r1(px), y: r1(y), z: r1(pz), d: player.dimension.id, rx: 0, ry: r1(((ry + 540) % 360) - 180) });
  }
  d.pontos = [...base, ...novos];
  gravar();
  ok(player, textos.CIRCULO_OK(n, raio));
  mostrar(player);
}

/**
 * @param {Player} player
 * @param {number} i
 * @param {() => any} voltar
 */
async function umPonto(player, i, voltar) {
  const p = ler().pontos[i];
  if (!p || !ehStaff(player)) return;
  await new Lista(textos.NOME_PONTO(i + 1))
    .texto(textos.CORPO_PONTO(formatarCoords(p)))
    .botao(textos.BOTAO_IR, ICONES.tpa, async (j) => {
      if (ehStaff(j)) teleportar(j, p, { nome: textos.NOME_PONTO(i + 1), tema: "spawn" });
    })
    .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (j) => {
      if (!ehStaff(j)) return;
      ler().pontos.splice(i, 1);
      gravar();
      ok(j, textos.PONTO_REMOVIDO);
      await voltar();
    })
    .voltar(voltar)
    .abrir(player);
}

/**
 * Menu dos pontos de spawn.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuPontosSpawn(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuPontosSpawn(player, voltar);
  /** @param {(j: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ j) => {
    if (!ehStaff(j)) return;
    await fn(j);
    await aqui();
  };
  const d = ler();
  const nomeModo = d.modo === "escolher" ? textos.MODO_ESCOLHER : textos.MODO_ALEATORIO;
  const lista = new Lista(textos.TITULO).texto(textos.CORPO(d.pontos.length, nomeModo));
  lista.botao(
    textos.BOTAO_CIRCULO,
    ICONES.nova,
    eVolta(async (j) => {
      const r = await perguntar(j, textos.BOTAO_CIRCULO, [
        { tipo: "numero", rotulo: textos.ROTULO_RAIO, padrao: 12, min: 3, max: 80 },
        { tipo: "numero", rotulo: textos.ROTULO_QTD, padrao: MIN_CIRCULO, min: 1, max: MAX_PONTOS },
        { tipo: "alternar", rotulo: textos.ROTULO_SUBSTITUIR, padrao: true },
        { tipo: "lista", rotulo: textos.ROTULO_OLHAR, opcoes: [...textos.OLHARES], padrao: 0 },
      ]);
      if (r && ehStaff(j)) criarCirculo(j, r[0], r[1], r[2], r[3]);
    }),
  );
  lista.botao(
    textos.BOTAO_ADICIONAR,
    ICONES.spawn,
    eVolta((j) => {
      if (ler().pontos.length >= MAX_PONTOS) {
        erro(j, textos.LIMITE(MAX_PONTOS));
        return;
      }
      ler().pontos.push(localDe(j));
      gravar();
      ok(j, textos.PONTO_OK(ler().pontos.length));
    }),
  );
  lista.botao(
    textos.BOTAO_MODO(d.modo === "escolher" ? textos.MODO_ALEATORIO : textos.MODO_ESCOLHER),
    ICONES.ajustes,
    eVolta((j) => {
      d.modo = d.modo === "escolher" ? "aleatorio" : "escolher";
      gravar();
      ok(j, textos.MODO_MUDOU(d.modo === "escolher" ? textos.MODO_ESCOLHER : textos.MODO_ALEATORIO));
    }),
  );
  lista.botao(
    textos.BOTAO_MOSTRAR,
    ICONES.buscar,
    eVolta((j) => {
      mostrar(j);
      ok(j, textos.MOSTRANDO);
    }),
  );
  if (!d.pontos.length) lista.rotulo(textos.SEM_PONTOS);
  d.pontos.forEach((p, i) => lista.botao(`${textos.NOME_PONTO(i + 1)} §7(${formatarCoords(p)})`, ICONES.tpa, (j) => umPonto(j, i, aqui)));
  if (d.pontos.length) {
    lista.botao(
      textos.BOTAO_LIMPAR,
      ICONES.apagar,
      eVolta(async (j) => {
        if (!(await confirmar(j, { titulo: textos.BOTAO_LIMPAR, texto: textos.CONFIRMAR_LIMPAR })) || !ehStaff(j)) return;
        d.pontos = [];
        gravar();
        ok(j, textos.LIMPOS);
      }),
    );
  }
  await lista.voltar(voltar).abrir(player);
}
