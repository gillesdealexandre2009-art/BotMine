// Gera um dump JSON compacto do mapa dos Ecos (para addon/tools/voxel_render.py).
// Uso (a partir de C:\Users\gille\vt\mock, por causa do loader que resolve @minecraft/server):
//   node --import ./registrar.mjs C:/.../addon/tools/dump_mapa.mjs [--mapa=ecos_mapa_novo.js] [--saida=C:/.../dump.json] [--sem-pale]
// Formato (vulpus-voxel-1): { formato, origem, caixa, pontos, paleta: ["minecraft:x", "minecraft:y|{estados}"],
//   blocos: [[x1,y,z,x2,y,z,idx], ...] }  (corridas ao longo de x; coordenadas relativas, as mesmas do gerador)
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { PincelGrade } from "./ecos_grade.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? "").slice(n.length + 3) || d;
const arq = arg("mapa", "ecos_mapa_novo.js");
const saida = arg("saida", join("C:/Users/gille/vt/dumps_ecos", arq.replace(/\.js$/, "") + ".json"));
const mapa = await import(pathToFileURL(join(aqui, "..", "vulpus_bp", "scripts", "sistemas", arq)).href);
const semPale = process.argv.includes("--sem-pale");
const existe = semPale ? (id) => !/pale_|resin|eyeblossom|iron_chain|tuff_brick|polished_tuff/.test(id) : () => true;
const g = new PincelGrade(mapa.CAIXA, { existe });
const t0 = Date.now();
for (const _ of mapa.construir(g, () => {}, 0, () => {})) { /* roda tudo */ }

const { x: ox, y: oy, z: oz } = g.o;
const { x: dx, y: dy, z: dz } = g.dim;
const blocos = [];
for (let y = 0; y < dy; y++) for (let z = 0; z < dz; z++) {
  let x = 0;
  while (x < dx) {
    const i = g.grade[(y * dz + z) * dx + x];
    if (!i) { x++; continue; }
    let x2 = x;
    while (x2 + 1 < dx && g.grade[(y * dz + z) * dx + x2 + 1] === i) x2++;
    blocos.push([x + ox, y + oy, z + oz, x2 + ox, y + oy, z + oz, i]);
    x = x2 + 1;
  }
}
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, JSON.stringify({ formato: "vulpus-voxel-1", origem: arq, caixa: mapa.CAIXA, pontos: mapa.PONTOS ?? [], paleta: g.paleta, blocos }));
console.log(`dump ${saida}: ${blocos.length} corridas, ${g.paleta.length} tipos, ${Date.now() - t0} ms, fora da caixa: ${g.fora}`);
