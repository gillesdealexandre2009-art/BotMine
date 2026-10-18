// @ts-check
// Motor de xadrez (sem nada do Minecraft): regras completas (xeque, xeque-mate, afogamento, roque, en passant,
// promoção, empate por 50 lances, material insuficiente e repetição fica a cargo de quem chama, pela chave da posição).
// Tabuleiro: 64 casas, índice 0 = a8, 7 = h8, 56 = a1, 63 = h1. Peças: maiúsculas brancas (PNBRQK), minúsculas pretas.

/** @typedef {"w" | "b"} Cor */
/** @typedef {{ K: boolean, Q: boolean, k: boolean, q: boolean }} Roques */
/** @typedef {{ t: (string | null)[], vez: Cor, roque: Roques, ep: number | null, meio: number, cheio: number }} Estado */
/** @typedef {{ de: number, para: number, peca: string, cap: string | null, promo?: string, roque?: "K" | "Q", ep?: boolean }} Lance */

export const INICIO_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** @param {string} p @returns {Cor} */
export const corDe = (p) => (p === p.toUpperCase() ? "w" : "b");

/** @param {number} i */
export const linhaDe = (i) => i >> 3;
/** @param {number} i */
export const colunaDe = (i) => i & 7;

/** "e4" para o índice. @param {number} i */
export const nomeCasa = (i) => String.fromCharCode(97 + colunaDe(i)) + String(8 - linhaDe(i));

/** Índice da casa pelo nome ("e4"). @param {string} nome */
export const casaDe = (nome) => (8 - Number(nome[1])) * 8 + (nome.charCodeAt(0) - 97);

/**
 * Estado a partir de um FEN.
 * @param {string} fen
 * @returns {Estado}
 */
export function deFEN(fen) {
  const [pecas, vez, rq, ep, meio, cheio] = fen.trim().split(/\s+/);
  /** @type {(string | null)[]} */
  const t = [];
  for (const c of pecas) {
    if (c === "/") continue;
    if (c >= "1" && c <= "8") for (let i = 0; i < Number(c); i++) t.push(null);
    else t.push(c);
  }
  return {
    t,
    vez: vez === "b" ? "b" : "w",
    roque: { K: rq?.includes("K") ?? false, Q: rq?.includes("Q") ?? false, k: rq?.includes("k") ?? false, q: rq?.includes("q") ?? false },
    ep: ep && ep !== "-" ? casaDe(ep) : null,
    meio: Number(meio ?? 0) || 0,
    cheio: Number(cheio ?? 1) || 1,
  };
}

/** @returns {Estado} */
export const novoEstado = () => deFEN(INICIO_FEN);

const RETAS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAIS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const CAVALO = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

/**
 * A casa está atacada por alguma peça da cor?
 * @param {(string | null)[]} t
 * @param {number} casa
 * @param {Cor} por
 */
export function atacada(t, casa, por) {
  const l = linhaDe(casa);
  const c = colunaDe(casa);
  const maiusc = por === "w";
  const peca = (/** @type {string} */ p) => (maiusc ? p : p.toLowerCase());
  // peões: um peão branco ataca "para cima" (linha menor); então olhamos de onde ele viria
  const lp = maiusc ? l + 1 : l - 1;
  if (lp >= 0 && lp < 8) {
    for (const dc of [-1, 1]) {
      const cc = c + dc;
      if (cc >= 0 && cc < 8 && t[lp * 8 + cc] === peca("P")) return true;
    }
  }
  for (const [dl, dc] of CAVALO) {
    const ll = l + dl;
    const cc = c + dc;
    if (ll >= 0 && ll < 8 && cc >= 0 && cc < 8 && t[ll * 8 + cc] === peca("N")) return true;
  }
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dl && !dc) continue;
      const ll = l + dl;
      const cc = c + dc;
      if (ll >= 0 && ll < 8 && cc >= 0 && cc < 8 && t[ll * 8 + cc] === peca("K")) return true;
    }
  }
  for (const [dl, dc, tipos] of /** @type {[number, number, string[]][]} */ ([
    ...RETAS.map(([a, b]) => [a, b, ["R", "Q"]]),
    ...DIAGONAIS.map(([a, b]) => [a, b, ["B", "Q"]]),
  ])) {
    let ll = l + dl;
    let cc = c + dc;
    while (ll >= 0 && ll < 8 && cc >= 0 && cc < 8) {
      const p = t[ll * 8 + cc];
      if (p) {
        if (corDe(p) === por && tipos.includes(p.toUpperCase())) return true;
        break;
      }
      ll += dl;
      cc += dc;
    }
  }
  return false;
}

/** @param {(string | null)[]} t @param {Cor} cor */
const casaDoRei = (t, cor) => t.indexOf(cor === "w" ? "K" : "k");

/**
 * O rei da cor está em xeque?
 * @param {Estado} est
 * @param {Cor} cor
 */
export function emXeque(est, cor) {
  const r = casaDoRei(est.t, cor);
  return r >= 0 && atacada(est.t, r, cor === "w" ? "b" : "w");
}

const PROMOCOES = ["Q", "R", "B", "N"];

/**
 * Lances sem conferir se deixam o próprio rei em xeque.
 * @param {Estado} est
 * @returns {Lance[]}
 */
function pseudoLances(est) {
  /** @type {Lance[]} */
  const lances = [];
  const { t, vez } = est;
  const branca = vez === "w";
  for (let i = 0; i < 64; i++) {
    const p = t[i];
    if (!p || corDe(p) !== vez) continue;
    const tipo = p.toUpperCase();
    const l = linhaDe(i);
    const c = colunaDe(i);
    /** @param {number} para @param {string | null} cap @param {Partial<Lance>} [extra] */
    const add = (para, cap, extra = {}) => lances.push({ de: i, para, peca: p, cap, ...extra });
    if (tipo === "P") {
      const dir = branca ? -1 : 1;
      const inicial = branca ? 6 : 1;
      const ultima = branca ? 0 : 7;
      const l1 = l + dir;
      if (l1 >= 0 && l1 < 8) {
        if (!t[l1 * 8 + c]) {
          if (l1 === ultima) for (const pr of PROMOCOES) add(l1 * 8 + c, null, { promo: pr });
          else {
            add(l1 * 8 + c, null);
            if (l === inicial && !t[(l + 2 * dir) * 8 + c]) add((l + 2 * dir) * 8 + c, null);
          }
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const alvo = l1 * 8 + cc;
          const q = t[alvo];
          if (q && corDe(q) !== vez) {
            if (l1 === ultima) for (const pr of PROMOCOES) add(alvo, q, { promo: pr });
            else add(alvo, q);
          } else if (!q && est.ep === alvo) add(alvo, branca ? "p" : "P", { ep: true });
        }
      }
    } else if (tipo === "N" || tipo === "K") {
      const deltas = tipo === "N" ? CAVALO : [...RETAS, ...DIAGONAIS];
      for (const [dl, dc] of deltas) {
        const ll = l + dl;
        const cc = c + dc;
        if (ll < 0 || ll > 7 || cc < 0 || cc > 7) continue;
        const q = t[ll * 8 + cc];
        if (!q || corDe(q) !== vez) add(ll * 8 + cc, q);
      }
      if (tipo === "K") {
        const base = branca ? 60 : 4;
        const inimigo = branca ? "b" : "w";
        if (i === base && !atacada(t, base, inimigo)) {
          const torre = branca ? "R" : "r";
          if ((branca ? est.roque.K : est.roque.k) && !t[base + 1] && !t[base + 2] && t[base + 3] === torre && !atacada(t, base + 1, inimigo) && !atacada(t, base + 2, inimigo)) {
            add(base + 2, null, { roque: "K" });
          }
          if ((branca ? est.roque.Q : est.roque.q) && !t[base - 1] && !t[base - 2] && !t[base - 3] && t[base - 4] === torre && !atacada(t, base - 1, inimigo) && !atacada(t, base - 2, inimigo)) {
            add(base - 2, null, { roque: "Q" });
          }
        }
      }
    } else {
      const dirs = tipo === "R" ? RETAS : tipo === "B" ? DIAGONAIS : [...RETAS, ...DIAGONAIS];
      for (const [dl, dc] of dirs) {
        let ll = l + dl;
        let cc = c + dc;
        while (ll >= 0 && ll < 8 && cc >= 0 && cc < 8) {
          const q = t[ll * 8 + cc];
          if (!q) add(ll * 8 + cc, null);
          else {
            if (corDe(q) !== vez) add(ll * 8 + cc, q);
            break;
          }
          ll += dl;
          cc += dc;
        }
      }
    }
  }
  return lances;
}

/**
 * Joga o lance (sem validar) e devolve o novo estado.
 * @param {Estado} est
 * @param {Lance} m
 * @returns {Estado}
 */
export function aplicar(est, m) {
  const t = [...est.t];
  const branca = est.vez === "w";
  t[m.de] = null;
  t[m.para] = m.promo ? (branca ? m.promo : m.promo.toLowerCase()) : m.peca;
  if (m.ep) t[m.para + (branca ? 8 : -8)] = null;
  if (m.roque === "K") {
    t[m.para + 1] = null;
    t[m.para - 1] = branca ? "R" : "r";
  } else if (m.roque === "Q") {
    t[m.para - 2] = null;
    t[m.para + 1] = branca ? "R" : "r";
  }
  const roque = { ...est.roque };
  if (m.peca === "K") roque.K = roque.Q = false;
  if (m.peca === "k") roque.k = roque.q = false;
  for (const casa of [m.de, m.para]) {
    if (casa === 63) roque.K = false;
    if (casa === 56) roque.Q = false;
    if (casa === 7) roque.k = false;
    if (casa === 0) roque.q = false;
  }
  const peao = m.peca.toUpperCase() === "P";
  return {
    t,
    vez: branca ? "b" : "w",
    roque,
    ep: peao && Math.abs(m.para - m.de) === 16 ? (m.de + m.para) / 2 : null,
    meio: peao || m.cap ? 0 : est.meio + 1,
    cheio: est.cheio + (branca ? 0 : 1),
  };
}

/**
 * Todos os lances legais de quem joga.
 * @param {Estado} est
 * @returns {Lance[]}
 */
export function lancesLegais(est) {
  const cor = est.vez;
  return pseudoLances(est).filter((m) => !emXeque(aplicar(est, m), cor));
}

/**
 * Situação do jogo: undefined se continua; senão { fim: "mate" | "afogamento" | "50" | "material", perdedor? }.
 * @param {Estado} est
 */
export function situacao(est) {
  const legais = lancesLegais(est);
  if (!legais.length) return emXeque(est, est.vez) ? { fim: "mate", perdedor: est.vez } : { fim: "afogamento" };
  if (est.meio >= 100) return { fim: "50" };
  const pecas = est.t.filter((p) => p && p.toUpperCase() !== "K");
  if (pecas.length === 0) return { fim: "material" };
  if (pecas.length === 1 && "BN".includes(/** @type {string} */ (pecas[0]).toUpperCase())) return { fim: "material" };
  return undefined;
}

/** Chave da posição (para contar repetições). @param {Estado} est */
export function chavePosicao(est) {
  const r = `${est.roque.K ? "K" : ""}${est.roque.Q ? "Q" : ""}${est.roque.k ? "k" : ""}${est.roque.q ? "q" : ""}`;
  return `${est.t.map((p) => p ?? ".").join("")} ${est.vez} ${r} ${est.ep ?? "-"}`;
}

/** Conta os nós de uma árvore de lances (para validar o motor). @param {Estado} est @param {number} prof */
export function perft(est, prof) {
  if (prof === 0) return 1;
  const lances = lancesLegais(est);
  if (prof === 1) return lances.length;
  let n = 0;
  for (const m of lances) n += perft(aplicar(est, m), prof - 1);
  return n;
}

export const NOMES_PECA = { P: "Peão", N: "Cavalo", B: "Bispo", R: "Torre", Q: "Dama", K: "Rei" };
const ORDEM = "KQRBNP";

/** Nome da peça em português. @param {string} p */
export const nomePeca = (p) => NOMES_PECA[/** @type {keyof typeof NOMES_PECA} */ (p.toUpperCase())];

/** Ordem de apresentação das peças (rei e dama primeiro). @param {string} p */
export const ordemPeca = (p) => ORDEM.indexOf(p.toUpperCase());

/**
 * Texto do lance para o botão: casa de destino com marcas (captura, roque, promoção, xeque).
 * @param {Estado} est
 * @param {Lance} m
 */
export function rotuloLance(est, m) {
  let txt;
  if (m.roque === "K") txt = "Roque pequeno";
  else if (m.roque === "Q") txt = "Roque grande";
  else {
    txt = nomeCasa(m.para);
    if (m.ep) txt += " (en passant)";
    else if (m.cap) txt += ` (captura ${nomePeca(m.cap).toLowerCase()})`;
    if (m.promo) txt += ` = ${nomePeca(m.promo)}`;
  }
  const depois = aplicar(est, m);
  if (emXeque(depois, depois.vez)) txt += lancesLegais(depois).length ? " +" : " # xeque-mate";
  return txt;
}

/**
 * Tabuleiro em texto, com códigos de cor do Minecraft. Brancas em maiúsculas brancas, pretas em minúsculas douradas.
 * @param {Estado} est
 * @param {Cor} perspectiva  quem olha (as peças dele ficam embaixo)
 * @param {number[]} [destaque]  casas para realçar (último lance)
 */
export function tabuleiroTexto(est, perspectiva, destaque = []) {
  const linhas = [];
  const rev = perspectiva === "b";
  const colunas = rev ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  linhas.push(`§8   ${colunas.map((c) => String.fromCharCode(97 + c)).join(" ")}`);
  for (let k = 0; k < 8; k++) {
    const l = rev ? 7 - k : k;
    const cel = colunas.map((c) => {
      const i = l * 8 + c;
      const p = est.t[i];
      const marca = destaque.includes(i);
      if (!p) return marca ? "§a·" : "§8·";
      return `${corDe(p) === "w" ? "§f" : "§6"}${p}`;
    });
    linhas.push(`§7${8 - l}  ${cel.join(" ")}  §7${8 - l}`);
  }
  linhas.push(`§8   ${colunas.map((c) => String.fromCharCode(97 + c)).join(" ")}`);
  return linhas.join("\n");
}
