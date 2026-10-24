// Prévias do mapa dos Ecos sem abrir o jogo.
// Uso (a partir de C:\Users\gille\vt\mock, por causa do loader que resolve @minecraft/server):
//   node --import ./registrar.mjs C:/.../addon/tools/previa_ecos.mjs [--sem-pale] [--so=geral,limiar,vila,arquivo,arena,iso] [--iso=nome1+nome2]
// Saída: addon/docs/previas/ecos_*.png
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { PincelGrade } from "./ecos_grade.mjs";
import { vistaCima, corte, isometrica, vistaJogador, salvarPNG, semCor } from "./ecos_render.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const saida = join(aqui, "..", "docs", "previas");
const arq = process.argv.find((a) => a.startsWith("--mapa="))?.slice(7) ?? "ecos_mapa_novo.js";
const mapa = await import(pathToFileURL(join(aqui, "..", "vulpus_bp", "scripts", "sistemas", arq)).href);
const semPale = process.argv.includes("--sem-pale");
const so = (process.argv.find((a) => a.startsWith("--so=")) ?? "").slice(5).split(",").filter(Boolean);
const quer = (n) => so.length === 0 || so.includes(n);
const soIso = (process.argv.find((a) => a.startsWith("--iso=")) ?? "").slice(6).split("+").filter(Boolean);

const existe = semPale ? (id) => !/pale_|resin|eyeblossom|iron_chain|tuff_brick|polished_tuff/.test(id) : () => true;
const g = new PincelGrade(mapa.CAIXA, { existe });
const t0 = Date.now();
let passos = 0, maxPasso = 0;
const gen = mapa.construir(g, () => {}, 0, () => {});
let ult = g.ops;
for (const _ of gen) {
  passos++;
  maxPasso = Math.max(maxPasso, g.ops - ult);
  ult = g.ops;
}
console.log(`construído em ${Date.now() - t0} ms: ${g.ops} operações, ${passos} passos, maior passo ${maxPasso} ops, fora da caixa: ${g.fora}`);
if (g.fora) console.log(g.foraAmostra.join("\n"));

const out = (nome, t) => { salvarPNG(join(saida, nome), t.w, t.h, t.px); console.log("  ->", nome); };
const P = mapa.PONTOS;
const Y = -5;

if (quer("geral")) out("ecos_mapa_geral.png", vistaCima(g, { x1: -3, z1: -3, x2: 306, z2: 78, k: 4, regua: 20, pontos: P, yMax: 12 }));
if (quer("limiar")) {
  out("ecos_mapa_limiar.png", vistaCima(g, { x1: -2, z1: -2, x2: 74, z2: 68, k: 12, pontos: P }));
  out("ecos_corte_limiar_ns.png", corte(g, { x1: 0, x2: 66, y1: -2, y2: 20, zNear: 70, zFar: 0, k: 12 }));
}
if (quer("vila")) {
  out("ecos_mapa_vila.png", vistaCima(g, { x1: 68, z1: -2, x2: 168, z2: 78, k: 10, pontos: P }));
  out("ecos_corte_vila_torre.png", corte(g, { x1: 70, x2: 166, y1: -2, y2: 28, zNear: 40, zFar: 0, k: 10 }));
}
if (quer("arquivo")) {
  out("ecos_mapa_arquivo.png", vistaCima(g, { x1: 158, z1: -2, x2: 252, z2: 68, k: 12, yMax: -2, pontos: P }));
  out("ecos_mapa_arquivo_alto.png", vistaCima(g, { x1: 158, z1: -2, x2: 252, z2: 68, k: 12, yMax: 7, pontos: P }));
  out("ecos_corte_arquivo_ew.png", corte(g, { x1: 160, x2: 252, y1: -9, y2: 14, zNear: 40, zFar: 24, k: 10 }));
}
if (quer("arena")) {
  out("ecos_mapa_arena.png", vistaCima(g, { x1: 236, z1: 0, x2: 306, z2: 66, k: 13, pontos: P }));
  out("ecos_corte_arena_ew.png", corte(g, { x1: 236, x2: 306, y1: -9, y2: 26, zNear: 38, zFar: 28, k: 11 }));
}
/** vistas isométricas nomeadas (marcos) */
const ISO = {
  veu: { x1: -2, x2: 24, y1: -1, y2: 16, z1: 18, z2: 46, a: 14 },
  portal: { x1: 52, x2: 78, y1: -1, y2: 16, z1: 18, z2: 46, a: 14, rot: 3 },
  capela: { x1: 14, x2: 54, y1: -1, y2: 16, z1: 0, z2: 30, a: 11 },
  campo: { x1: 14, x2: 54, y1: -1, y2: 12, z1: 28, z2: 66, a: 11 },
  rotunda: { x1: 22, x2: 48, y1: -1, y2: 14, z1: 46, z2: 66, a: 16 },
  semnome: { x1: 46, x2: 66, y1: -1, y2: 14, z1: 0, z2: 20, a: 18 },
  ilha: { x1: 46, x2: 66, y1: -1, y2: 22, z1: 38, z2: 58, a: 15 },
  coveiro: { x1: 4, x2: 24, y1: -1, y2: 10, z1: 34, z2: 52, a: 17 },
  praca: { x1: 104, x2: 142, y1: -1, y2: 28, z1: 4, z2: 52, a: 9 },
  torre: { x1: 108, x2: 130, y1: -1, y2: 30, z1: 4, z2: 30, a: 14 },
  rua: { x1: 70, x2: 112, y1: -1, y2: 14, z1: 2, z2: 62, a: 9 },
  padaria: { x1: 72, x2: 94, y1: -1, y2: 14, z1: 10, z2: 32, a: 17 },
  fechada: { x1: 88, x2: 108, y1: -1, y2: 14, z1: 34, z2: 56, a: 17, rot: 2 },
  feira: { x1: 106, x2: 138, y1: -1, y2: 12, z1: 38, z2: 62, a: 14 },
  arquivo_fora: { x1: 150, x2: 242, y1: -1, y2: 22, z1: 0, z2: 66, a: 8, rot: 1 },
  boca: { x1: 150, x2: 178, y1: Y - 3, y2: 12, z1: 22, z2: 44, a: 14, rot: 1 },
  atrio: { x1: 173, x2: 189, y1: Y - 2, y2: 8, z1: 18, z2: 46, a: 15, yTeto: -1 },
  salao: { x1: 190, x2: 222, y1: Y - 2, y2: 8, z1: 12, z2: 52, a: 12, yTeto: -1 },
  salao_alto: { x1: 190, x2: 224, y1: Y - 2, y2: 10, z1: 12, z2: 54, a: 12, yTeto: 5, rot: 1 },
  cripta: { x1: 190, x2: 234, y1: Y - 2, y2: 8, z1: 1, z2: 9, a: 13, yTeto: 2 },
  cripta_sul: { x1: 190, x2: 234, y1: Y - 2, y2: 8, z1: 57, z2: 66, a: 13, yTeto: 2, rot: 2 },
  memoria: { x1: 223, x2: 238, y1: Y - 2, y2: 10, z1: 24, z2: 40, a: 16, yTeto: 3 },
  arena: { x1: 244, x2: 306, y1: Y - 3, y2: 24, z1: 4, z2: 62, a: 9 },
  arena_oeste: { x1: 244, x2: 306, y1: Y - 3, y2: 24, z1: 4, z2: 62, a: 9, rot: 3 },
  porta: { x1: 282, x2: 308, y1: Y - 3, y2: 24, z1: 18, z2: 48, a: 14, rot: 1 },
};
/** vistas do jogador (olho em coordenadas relativas, yaw 0 = leste / 90 = sul / 270 = norte); névoa por área, como as de vulpus_rp/fogs */
const NEVOA = {
  limiar: { fog: "#b8b3cc", ini: 14, fim: 80 },
  vila: { fog: "#d9a77a", ini: 14, fim: 85 },
  arquivo: { fog: "#1b2440", ini: 8, fim: 60 },
  arena: { fog: "#2c2440", ini: 18, fim: 100 },
};
const NEVOA_ANTIGA = {
  limiar: { fog: "#2a3029", ini: 5, fim: 35 },
  vila: { fog: "#1f1a15", ini: 6, fim: 40 },
  arquivo: { fog: "#150a1e", ini: 3, fim: 25 },
  arena: { fog: "#0a0808", ini: 10, fim: 35 },
};
const JOGADOR = {
  limiar_chegada: { area: "limiar", olho: [12.5, 2.62, 32.5], yaw: 0, pitch: 3 },
  limiar_veu: { area: "limiar", olho: [12.5, 2.62, 32.5], yaw: 180, pitch: 4 },
  limiar_aleia: { area: "limiar", olho: [34.5, 3.62, 31.5], yaw: 270, pitch: 2 },
  limiar_campo: { area: "limiar", olho: [30.5, 3.62, 33.5], yaw: 300, pitch: -4 },
  limiar_portico: { area: "limiar", olho: [48.5, 2.62, 32.5], yaw: 0, pitch: 8 },
  vila_entrada: { area: "vila", olho: [74.5, 2.62, 32.5], yaw: 0, pitch: 4 },
  vila_praca: { area: "vila", olho: [106.5, 2.62, 32.5], yaw: 340, pitch: 14 },
  vila_torre: { area: "vila", olho: [122.5, 2.62, 26.5], yaw: 270, pitch: 20 },
  vila_feira: { area: "vila", olho: [122.5, 2.62, 41.5], yaw: 80, pitch: 0 },
  arquivo_boca: { area: "arquivo", olho: [150.5, 2.62, 32.5], yaw: 0, pitch: 8 },
  arquivo_atrio: { area: "arquivo", olho: [177.5, -2.38, 33.5], yaw: 0, pitch: 4 },
  arquivo_salao: { area: "arquivo", olho: [193.5, -2.38, 33.5], yaw: 0, pitch: 12 },
  arquivo_cripta: { area: "arquivo", olho: [193.5, -2.38, 6.5], yaw: 0, pitch: 2 },
  arquivo_memoria: { area: "arquivo", olho: [225.5, -2.38, 33.5], yaw: 0, pitch: 4 },
  arena_entrada: { area: "arena", olho: [249.5, -2.38, 33.5], yaw: 0, pitch: 6 },
  arena_centro: { area: "arena", olho: [268.5, -2.38, 33.5], yaw: 0, pitch: 10 },
  arena_porta: { area: "arena", olho: [284.5, -2.38, 33.5], yaw: 0, pitch: 18 },
};
if (quer("jogador")) {
  const antiga = process.argv.includes("--nevoa-antiga");
  for (const [nome, v] of Object.entries(JOGADOR)) {
    if (soIso.length && !soIso.includes(nome)) continue;
    const n = (antiga ? NEVOA_ANTIGA : NEVOA)[v.area];
    out(`ecos_jogador_${nome}${antiga ? "_nevoa_antiga" : ""}.png`, vistaJogador(g, { ...v, ...n, w: 640, h: 360 }));
  }
}
if (quer("iso")) {
  for (const [nome, o] of Object.entries(ISO)) if (soIso.length === 0 || soIso.includes(nome)) out(`ecos_iso_${nome}.png`, isometrica(g, o));
}
if (semCor.size) console.log("blocos sem cor na paleta da prévia:", [...semCor].join(", "));
const faltam = [...g.contagem().entries()].sort((a, b) => b[1] - a[1]);
console.log("materiais usados (" + faltam.length + "):", faltam.slice(0, 80).map(([k, v]) => k.replace("minecraft:", "") + "=" + v).join(" "));
