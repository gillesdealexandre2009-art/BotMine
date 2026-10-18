// @ts-check
// Planta de um andar da masmorra: divide o retângulo em partições (BSP), põe uma sala em cada folha, liga as irmãs com
// corredores em L, acrescenta alguns laços e distribui os papéis (entrada, mini-chefe com a chave, elites, tesouros, secretas e
// o boss, o mais longe possível da entrada). Tudo determinístico pela semente.
import { criarRng } from "./obras_ruido.js";

/**
 * @typedef {"entrada" | "combate" | "elite" | "miniboss" | "boss" | "tesouro" | "secreta" | "descanso" | "armadilha"} Papel
 * @typedef {object} SalaPlano
 * @property {number} id
 * @property {number} x  canto (interior)
 * @property {number} z
 * @property {number} w
 * @property {number} h
 * @property {number} alt  altura livre
 * @property {Papel} papel
 * @property {number} dist  distância (em salas) da entrada
 * @typedef {{ eixo: "h" | "v", a: number, b: number, c: number, larg: number, tipo: "c" | "s", de: number, para: number }} CorredorPlano
 * @typedef {object} Plano
 * @property {number} N  lado da grade
 * @property {SalaPlano[]} salas
 * @property {CorredorPlano[]} corredores
 * @property {number} entradaId
 * @property {number} bossId
 * @property {number} chaveId  sala do mini-chefe (guarda a chave do boss)
 */

/**
 * @typedef {object} OpcoesPlano
 * @property {number} N
 * @property {number} semente
 * @property {number} salas  quantidade alvo de salas
 * @property {number} [tamMin]
 * @property {number} [tamMax]
 * @property {number} [bossTam]  lado da sala do boss
 */

/** @param {number} a @param {number} b */
const entre = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));

/**
 * Gera a planta.
 * @param {OpcoesPlano} o
 * @returns {Plano}
 */
export function gerarPlano(o) {
  const rng = criarRng(o.semente);
  const N = o.N;
  const tamMin = o.tamMin ?? 9, tamMax = o.tamMax ?? 19;
  const margem = 4;
  /** @type {{ x: number, z: number, w: number, h: number, filhos?: [any, any], sala?: SalaPlano }} */
  const raiz = { x: margem, z: margem, w: N - margem * 2, h: N - margem * 2 };
  /** @type {typeof raiz[]} */
  const folhas = [];
  let guarda = 0;
  /** @param {typeof raiz} no @param {number} nivel */
  const dividir = (no, nivel) => {
    const podeV = no.w >= tamMin * 2 + 10, podeH = no.h >= tamMin * 2 + 10;
    const parar = (!podeV && !podeH) || (folhas.length + 1 >= o.salas && nivel > 1) || guarda > 400;
    guarda++;
    if (parar) {
      folhas.push(no);
      return;
    }
    const vertical = podeV && podeH ? no.w >= no.h : podeV;
    const razao = 0.4 + rng() * 0.2;
    if (vertical) {
      const cortar = Math.round(no.w * razao);
      no.filhos = [{ x: no.x, z: no.z, w: cortar, h: no.h }, { x: no.x + cortar, z: no.z, w: no.w - cortar, h: no.h }];
    } else {
      const cortar = Math.round(no.h * razao);
      no.filhos = [{ x: no.x, z: no.z, w: no.w, h: cortar }, { x: no.x, z: no.z + cortar, w: no.w, h: no.h - cortar }];
    }
    dividir(no.filhos[0], nivel + 1);
    dividir(no.filhos[1], nivel + 1);
  };
  dividir(raiz, 0);

  /** @type {SalaPlano[]} */
  const salas = [];
  for (const f of folhas) {
    const maxW = Math.min(tamMax, f.w - 6), maxH = Math.min(tamMax, f.h - 6);
    const w = entre(Math.min(tamMin, maxW), maxW, rng) | 1, h = entre(Math.min(tamMin, maxH), maxH, rng) | 1; // ímpar: centro exato
    const x = f.x + 3 + entre(0, Math.max(0, f.w - w - 6), rng);
    const z = f.z + 3 + entre(0, Math.max(0, f.h - h - 6), rng);
    const s = { id: salas.length + 1, x, z, w, h, alt: w * h >= 200 ? 8 : 7, papel: /** @type {Papel} */ ("combate"), dist: 0 };
    f.sala = s;
    salas.push(s);
  }

  // corredores: cada nó interno liga a sala mais próxima de cada lado
  /** @type {CorredorPlano[]} */
  const corredores = [];
  /** @param {typeof raiz} no @returns {SalaPlano[]} */
  const salasDe = (no) => (no.sala ? [no.sala] : [...salasDe(/** @type {any} */ (no.filhos)[0]), ...salasDe(/** @type {any} */ (no.filhos)[1])]);
  const centro = (/** @type {SalaPlano} */ s) => ({ x: s.x + (s.w >> 1), z: s.z + (s.h >> 1) });
  /** @param {SalaPlano} a @param {SalaPlano} b @param {number} larg @param {"c" | "s"} tipo */
  const ligar = (a, b, larg, tipo) => {
    const ca = centro(a), cb = centro(b);
    const horizontalPrimeiro = rng() < 0.5;
    if (horizontalPrimeiro) {
      corredores.push({ eixo: "h", a: Math.min(ca.x, cb.x), b: Math.max(ca.x, cb.x), c: ca.z, larg, tipo, de: a.id, para: b.id });
      corredores.push({ eixo: "v", a: Math.min(ca.z, cb.z), b: Math.max(ca.z, cb.z), c: cb.x, larg, tipo, de: a.id, para: b.id });
    } else {
      corredores.push({ eixo: "v", a: Math.min(ca.z, cb.z), b: Math.max(ca.z, cb.z), c: ca.x, larg, tipo, de: a.id, para: b.id });
      corredores.push({ eixo: "h", a: Math.min(ca.x, cb.x), b: Math.max(ca.x, cb.x), c: cb.z, larg, tipo, de: a.id, para: b.id });
    }
  };
  /** @param {typeof raiz} no */
  const percorrer = (no) => {
    if (!no.filhos) return;
    percorrer(no.filhos[0]);
    percorrer(no.filhos[1]);
    const A = salasDe(no.filhos[0]), B = salasDe(no.filhos[1]);
    let melhor = Infinity, par = /** @type {[SalaPlano, SalaPlano]} */ ([A[0], B[0]]);
    for (const a of A) for (const b of B) {
      const d = Math.abs(centro(a).x - centro(b).x) + Math.abs(centro(a).z - centro(b).z);
      if (d < melhor) {
        melhor = d;
        par = [a, b];
      }
    }
    ligar(par[0], par[1], rng() < 0.35 ? 5 : 3, "c");
  };
  percorrer(raiz);

  // adjacência entre salas (pelos corredores, de dois em dois segmentos)
  /** @type {Map<number, Set<number>>} */
  const viz = new Map(salas.map((s) => [s.id, new Set()]));
  for (const c of corredores) {
    viz.get(c.de)?.add(c.para);
    viz.get(c.para)?.add(c.de);
  }
  // laços: liga algumas salas próximas que ainda não são vizinhas
  const laços = Math.max(1, Math.round(salas.length / 6));
  let tentativas = 0, feitos = 0;
  while (feitos < laços && tentativas < 60) {
    tentativas++;
    const a = salas[Math.floor(rng() * salas.length)], b = salas[Math.floor(rng() * salas.length)];
    if (a === b || viz.get(a.id)?.has(b.id)) continue;
    const d = Math.abs(centro(a).x - centro(b).x) + Math.abs(centro(a).z - centro(b).z);
    if (d > N * 0.6) continue;
    ligar(a, b, 3, "c");
    viz.get(a.id)?.add(b.id);
    viz.get(b.id)?.add(a.id);
    feitos++;
  }

  // distância em salas a partir da entrada (a sala mais perto do canto de cima à esquerda)
  let entrada = salas[0];
  for (const s of salas) if (centro(s).x + centro(s).z < centro(entrada).x + centro(entrada).z) entrada = s;
  /** @type {Map<number, number>} */
  const dist = new Map([[entrada.id, 0]]);
  const fila = [entrada.id];
  for (let q = 0; q < fila.length; q++) {
    for (const v of viz.get(fila[q]) ?? []) {
      if (!dist.has(v)) {
        dist.set(v, (dist.get(fila[q]) ?? 0) + 1);
        fila.push(v);
      }
    }
  }
  for (const s of salas) s.dist = dist.get(s.id) ?? 0;
  const maxDist = Math.max(...salas.map((s) => s.dist));

  // papéis
  entrada.papel = "entrada";
  entrada.alt = 8;
  // a sala de entrada precisa de espaço para o altar e o portal de volta: pelo menos 13x13, com o mesmo centro
  {
    const f = folhas.find((q) => q.sala === entrada);
    if (f) {
      const c0 = centro(entrada);
      const nw = Math.min(Math.max(entrada.w, 13) | 1, (f.w - 6) | 1), nh = Math.min(Math.max(entrada.h, 13) | 1, (f.h - 6) | 1);
      entrada.w = nw;
      entrada.h = nh;
      entrada.x = Math.max(f.x + 3, Math.min(f.x + f.w - 3 - nw, c0.x - (nw >> 1)));
      entrada.z = Math.max(f.z + 3, Math.min(f.z + f.h - 3 - nh, c0.z - (nh >> 1)));
    }
  }
  let boss = salas.filter((s) => s !== entrada).sort((a, b) => b.dist - a.dist || b.w * b.h - a.w * a.h)[0];
  boss.papel = "boss";
  // o boss ganha uma sala grande e alta, se a folha permitir
  const lado = Math.max(o.bossTam ?? 25, tamMax);
  const folhaBoss = folhas.find((f) => f.sala === boss);
  if (folhaBoss) {
    const bw = Math.min(lado | 1, (folhaBoss.w - 6) | 1), bh = Math.min(lado | 1, (folhaBoss.h - 6) | 1);
    boss.w = bw;
    boss.h = bh;
    boss.x = folhaBoss.x + 3 + ((folhaBoss.w - 6 - bw) >> 1);
    boss.z = folhaBoss.z + 3 + ((folhaBoss.h - 6 - bh) >> 1);
  }
  boss.alt = 12;
  const restantes = salas.filter((s) => s !== entrada && s !== boss);
  const pelaDist = [...restantes].sort((a, b) => a.dist - b.dist);
  // mini-chefe: a sala mais a meio caminho do boss
  const alvoMeio = Math.max(1, Math.round(maxDist * 0.6));
  const mini = [...restantes].sort((a, b) => Math.abs(a.dist - alvoMeio) - Math.abs(b.dist - alvoMeio))[0];
  if (mini) {
    mini.papel = "miniboss";
    mini.alt = Math.max(mini.alt, 9);
  }
  // becos sem saída viram tesouro e secretas
  const becos = restantes.filter((s) => s !== mini && (viz.get(s.id)?.size ?? 0) === 1).sort((a, b) => b.dist - a.dist);
  const nSecretas = Math.min(2, Math.floor(becos.length / 2));
  becos.slice(0, nSecretas).forEach((s) => (s.papel = "secreta"));
  becos.slice(nSecretas).forEach((s) => (s.papel = "tesouro"));
  // elites e descanso, nas que sobraram
  const livres = pelaDist.filter((s) => s.papel === "combate");
  const nElites = Math.max(1, Math.round(salas.length / 5));
  [...livres].sort((a, b) => b.dist - a.dist).slice(0, nElites).forEach((s) => (s.papel = "elite"));
  const descanso = livres.find((s) => s.papel === "combate" && s.dist <= 2);
  if (descanso) descanso.papel = "descanso";
  const combates = salas.filter((s) => s.papel === "combate");
  combates.filter((_, i) => i % 3 === 2).forEach((s) => (s.papel = "armadilha"));

  // segmentos que levam a uma sala secreta viram passagens secretas
  for (const c of corredores) {
    const a = salas.find((s) => s.id === c.de), b = salas.find((s) => s.id === c.para);
    if ((a?.papel === "secreta" && (viz.get(a.id)?.size ?? 0) === 1) || (b?.papel === "secreta" && (viz.get(b.id)?.size ?? 0) === 1)) c.tipo = "s";
  }
  return { N, salas, corredores, entradaId: entrada.id, bossId: boss.id, chaveId: mini?.id ?? boss.id };
}

/**
 * Confere uma planta: salas dentro da grade e sem se tocar, todas alcançáveis pela entrada (sem passar pelas secretas),
 * e o boss alcançável.
 * @param {Plano} plano
 * @returns {string[]} problemas
 */
export function validarPlano(plano) {
  /** @type {string[]} */
  const erros = [];
  const { N, salas } = plano;
  for (const s of salas) {
    if (s.x < 2 || s.z < 2 || s.x + s.w > N - 2 || s.z + s.h > N - 2) erros.push(`sala ${s.id} fora da grade`);
  }
  for (let i = 0; i < salas.length; i++) {
    for (let j = i + 1; j < salas.length; j++) {
      const a = salas[i], b = salas[j];
      if (a.x - 3 < b.x + b.w && a.x + a.w + 3 > b.x && a.z - 3 < b.z + b.h && a.z + a.h + 3 > b.z) erros.push(`salas ${a.id} e ${b.id} muito juntas`);
    }
  }
  /** @type {Map<number, Set<number>>} */
  const viz = new Map(salas.map((s) => [s.id, new Set()]));
  for (const c of plano.corredores) {
    viz.get(c.de)?.add(c.para);
    viz.get(c.para)?.add(c.de);
  }
  const visto = new Set([plano.entradaId]);
  const fila = [plano.entradaId];
  for (let q = 0; q < fila.length; q++) for (const v of viz.get(fila[q]) ?? []) if (!visto.has(v)) {
    visto.add(v);
    fila.push(v);
  }
  for (const s of salas) if (!visto.has(s.id)) erros.push(`sala ${s.id} desconectada`);
  if (!visto.has(plano.bossId)) erros.push("o boss não é alcançável");
  return erros;
}

/**
 * Pontuação de uma planta: prefere salas na quantidade pedida, corredores curtos, boss longe da entrada e laços.
 * @param {Plano} plano @param {number} alvoSalas
 */
function pontuar(plano, alvoSalas) {
  let pontos = 0;
  pontos -= Math.abs(plano.salas.length - alvoSalas) * 6;
  let longo = 0, total = 0;
  for (const c of plano.corredores) {
    const comp = c.b - c.a;
    total += comp;
    if (comp > 38) longo += comp - 38;
  }
  pontos -= longo * 1.5;
  pontos -= total * 0.05;
  const boss = plano.salas.find((s) => s.id === plano.bossId);
  pontos += Math.min(6, boss?.dist ?? 0) * 8;
  pontos += plano.salas.filter((s) => s.papel === "tesouro" || s.papel === "secreta").length * 4;
  pontos += plano.salas.filter((s) => s.papel === "elite").length * 3;
  return pontos;
}

/**
 * Tenta várias sementes e devolve a melhor planta válida.
 * @param {OpcoesPlano} o  `semente` é o ponto de partida
 * @param {number} [tentativas]
 * @returns {Plano}
 */
export function melhorPlano(o, tentativas = 80) {
  /** @type {Plano | null} */
  let melhor = null;
  let melhorPontos = -Infinity;
  for (let i = 0; i < tentativas; i++) {
    const p = gerarPlano({ ...o, semente: o.semente + i * 7919 });
    if (validarPlano(p).length) continue;
    const pts = pontuar(p, o.salas);
    if (pts > melhorPontos) {
      melhorPontos = pts;
      melhor = p;
    }
  }
  if (!melhor) throw new Error("não achei uma planta válida");
  return melhor;
}

/**
 * Dá uma forma a cada sala. regra devolve "ret", "oval", "cruz", "ele", "octo" ou "anel".
 * @param {Plano} plano @param {(s: SalaPlano, i: number) => string} regra
 */
export function aplicarFormas(plano, regra) {
  plano.salas.forEach((s, i) => {
    /** @type {any} */ (s).forma = regra(s, i);
  });
}
