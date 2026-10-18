// Gera vulpus_rp/fogs/era_NN.json (a neblina de cada Era) a partir do catálogo em vulpus_bp/scripts/sistemas/eras_catalogo.js.
// Uso (na pasta addon):  node tools/gerar_fogs_eras.mjs        (com --conferir só confere se os arquivos estão em dia)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const { ERAS } = await import(pathToFileURL(join(raiz, "vulpus_bp/scripts/sistemas/eras_catalogo.js")).href);
const { EVENTOS } = await import(pathToFileURL(join(raiz, "vulpus_bp/scripts/sistemas/eras_eventos.js")).href);
const pasta = join(raiz, "vulpus_rp/fogs");
mkdirSync(pasta, { recursive: true });
const conferir = process.argv.includes("--conferir");
let defasados = 0;

/** @param {{ fog: { cor: string, agua: string, inicio: number, fim: number }, id: string }} e */
function neblina(e) {
  const ar = { fog_start: e.fog.inicio, fog_end: e.fog.fim, fog_color: e.fog.cor, render_distance_type: "fixed" };
  const agua = { fog_start: 0.0, fog_end: 16.0, fog_color: e.fog.agua, render_distance_type: "fixed" };
  const lava = { fog_start: 0.0, fog_end: 2.5, fog_color: "#5a1c05", render_distance_type: "fixed" };
  const resistencia = { fog_start: 0.0, fog_end: 12.0, fog_color: "#5a1c05", render_distance_type: "fixed" };
  return {
    format_version: "1.16.100",
    "minecraft:fog_settings": {
      description: { identifier: `vulpus:${e.id}` },
      distance: { air: ar, water: agua, lava, lava_resistance: resistencia, weather: { ...ar } },
    },
  };
}

/** Neblina de cada Era e de cada acontecimento (era_NN_ev). */
const todas = [
  ...ERAS.map((e) => ({ id: e.id, fog: e.fog })),
  ...EVENTOS.map((lista, i) => ({ id: `${ERAS[i].id}_ev`, fog: { ...lista[0].fog, agua: lista[0].fog.cor } })),
];
for (const e of todas) {
  const caminho = join(pasta, `${e.id}.json`);
  const texto = JSON.stringify(neblina(e)) + "\n";
  if (conferir) {
    if (!existsSync(caminho) || readFileSync(caminho, "utf8") !== texto) {
      defasados++;
      console.log(`desatualizado: ${e.id}.json`);
    }
  } else {
    writeFileSync(caminho, texto);
  }
}
if (conferir) {
  console.log(defasados === 0 ? "fogs das Eras em dia" : `${defasados} arquivo(s) desatualizado(s): rode node tools/gerar_fogs_eras.mjs`);
  process.exit(defasados ? 1 : 0);
}
console.log(`${todas.length} neblinas geradas em vulpus_rp/fogs`);
