// Gera ui/vulpus/vulpus_era.json (a tinta de cor da tela de cada Era) a partir de sistemas/eras_tinta_dados.js e confere o resto da ligação
// no RP (ui_defs, hud_screen e as expressões do placar que escondem as marcas).
// Uso (na pasta addon):  node tools/gerar_ui_eras.mjs        (com --conferir só confere, sem escrever)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const { TINTAS, TODAS_AS_MARCAS } = await import(pathToFileURL(join(raiz, "vulpus_bp/scripts/sistemas/eras_tinta_dados.js")).href);
const conferir = process.argv.includes("--conferir");
const arquivo = join(raiz, "vulpus_rp/ui/vulpus/vulpus_era.json");

/** "#rrggbb" -> [r, g, b] de 0 a 1 (arredondado a 3 casas). @param {string} hex */
const rgb = (hex) => [1, 3, 5].map((i) => Math.round((parseInt(hex.slice(i, i + 2), 16) / 255) * 1000) / 1000);

const dados = {
  type: "panel",
  size: [0, 0],
  property_bag: { "#preserved_text": "" },
  bindings: [
    { binding_name: "#hud_title_text_string", binding_condition: "always" },
    { binding_name: "#hud_title_text_string", binding_name_override: "#preserved_text", binding_condition: "visibility_changed" },
    {
      binding_type: "view",
      source_property_name: "((not (#hud_title_text_string = #preserved_text)) and (not ((#hud_title_text_string - '§v§s§b§r') = #hud_title_text_string)))",
      target_property_name: "#visible",
      binding_condition: "always",
    },
  ],
};

const ui = {
  namespace: "vulpus_era",
  raiz: {
    type: "panel",
    size: ["100%", "100%"],
    layer: 2,
    controls: [{ "dados_era@vulpus_era.dados": {} }, ...TINTAS.map((_, i) => ({ [`tinta_${String(i + 1).padStart(2, "0")}@vulpus_era.tinta_${String(i + 1).padStart(2, "0")}`]: {} }))],
  },
  dados,
};
TINTAS.forEach((t, i) => {
  const nome = `tinta_${String(i + 1).padStart(2, "0")}`;
  ui[nome] = {
    type: "panel",
    size: ["100%", "100%"],
    property_bag: { "#visible": false },
    visible: "#visible",
    bindings: [
      {
        binding_type: "view",
        source_control_name: "dados_era",
        resolve_sibling_scope: true,
        source_property_name: `(not ((#preserved_text - '${TODAS_AS_MARCAS[i]}') = #preserved_text))`,
        target_property_name: "#visible",
      },
    ],
    controls: [
      { tom: { type: "image", texture: "textures/vulpus/ui/era_tom", keep_ratio: false, size: ["100%", "100%"], color: rgb(t.cor), alpha: t.tom, layer: 1 } },
      { vinheta: { type: "image", texture: "textures/vulpus/ui/filtro_vinheta", keep_ratio: false, size: ["100%", "100%"], color: rgb(t.vinheta), alpha: t.borda, layer: 2 } },
    ],
  };
});
const texto = JSON.stringify(ui, null, 2) + "\n";

/** Expressão que tira do texto do placar a marca do placar, a do filtro e as 20 marcas de tinta (uma subtração aninhada). */
function semMarcas(base = "#preserved_text") {
  let e = `(${base} - '§v§s§b§r')`;
  for (const m of ["§v§f§i§l§r", ...TODAS_AS_MARCAS]) e = `(${e} - '${m}')`;
  return e;
}

const problemas = [];
let atual = "";
try { atual = readFileSync(arquivo, "utf8"); } catch { /* ainda não existe */ }
if (conferir) {
  if (atual !== texto) problemas.push("vulpus_era.json desatualizado: rode node tools/gerar_ui_eras.mjs");
} else {
  writeFileSync(arquivo, texto);
}
const lerJson = (c) => readFileSync(join(raiz, c), "utf8").replace(/^﻿/, "");
if (!JSON.parse(lerJson("vulpus_rp/ui/_ui_defs.json")).ui_defs.includes("ui/vulpus/vulpus_era.json")) problemas.push("_ui_defs.json não lista ui/vulpus/vulpus_era.json");
if (!lerJson("vulpus_rp/ui/hud_screen.json").includes("vulpus_era@vulpus_era.raiz")) problemas.push("hud_screen.json não inclui vulpus_era@vulpus_era.raiz");
const hud = lerJson("vulpus_rp/ui/vulpus/vulpus_hud.json");
const esperadoTexto = semMarcas();
if (!hud.includes(`"source_property_name": "${esperadoTexto.slice(1, -1).replace(/^\(/, "(")}`) && !hud.includes(esperadoTexto)) problemas.push("vulpus_hud.json: a expressão do texto do placar não esconde as marcas de tinta");
if (!hud.includes(`(not (${esperadoTexto} = '')))`)) problemas.push("vulpus_hud.json: a expressão de visibilidade da caixa não ignora as marcas de tinta");
if (problemas.length) {
  console.log(problemas.join("\n"));
  process.exit(1);
}
console.log(conferir ? "ui das Eras em dia" : `vulpus_era.json gerado (${TINTAS.length} tintas)`);
