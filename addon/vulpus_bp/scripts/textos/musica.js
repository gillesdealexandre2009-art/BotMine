// @ts-check
// Textos da música e dos sons de ambiente (as playlists e os sons ficam em textos/musicas.js, gerado por tools/sons_publicar.py).

export const DESC_MUSICA = "Liga ou desliga a música e os sons de ambiente só para você";

// Painel da staff: zonas de música (feira e vila)
export const BOTAO_ZONAS = "Zonas de música (staff)";
export const TITULO_ZONAS = "Zonas de música (staff)";
export const SECAO_CONFIG = "AJUSTES DA MÚSICA";
export const BOTAO_CONFIG_MUSICA = "Volume, fade e sons de ambiente";
export const BOTAO_MARCAR = "Marcar zona aqui (raio)";
export const BOTAO_REMOVER = "Remover zona";
export const BOTAO_VER = "Mostrar o limite";
export const ROTULO_RAIO = "Raio (blocos)";
export const NOME_ZONA = /** @type {Record<string, string>} */ ({ feira: "Feira", vila: "Vila" });
/** @param {string} id */
export const SECAO_ZONA = (id) => `ZONA: ${(NOME_ZONA[id] ?? id).toUpperCase()}`;
/** @param {string} id */
export const CONFIRMAR_REMOVER = (id) => `Remover a zona da ${(NOME_ZONA[id] ?? id).toLowerCase()}? Quem estiver lá volta a ouvir o ambiente de baixo (lobby ou nada).`;
export const CORPO_ZONAS = [
  "§7Quem está dentro de uma zona ouve a música e os sons daquele lugar. Prioridade: mistério > feira > vila > lobby.",
  "§7Os sons ficam em §fSons/_ambientes.json§7 (rode tools/sons_publicar.py depois de mudar).",
].join("\n");
/**
 * @param {Record<string, { x: number, y: number, z: number, r: number } | undefined>} zonas
 */
export const RESUMO_ZONAS = (zonas) =>
  ["feira", "vila"]
    .map((id) => {
      const z = zonas[id];
      return z ? `§f${NOME_ZONA[id]}: §a${Math.round(z.x)}, ${Math.round(z.y)}, ${Math.round(z.z)} §7(raio ${z.r})` : `§f${NOME_ZONA[id]}: §cnão marcada`;
    })
    .join("\n");
/** @param {string} id @param {string} coords @param {number} raio */
export const ZONA_DEFINIDA = (id, coords, raio) => `§aZona de música da ${(NOME_ZONA[id] ?? id).toLowerCase()} em §e${coords}§a, raio de §e${raio}§a blocos.`;
/** @param {string} id */
export const ZONA_REMOVIDA = (id) => `§aZona de música da ${(NOME_ZONA[id] ?? id).toLowerCase()} removida.`;
/** @param {string} id */
export const SEM_ZONA = (id) => `Ainda não existe zona de música da ${(NOME_ZONA[id] ?? id).toLowerCase()}.`;
