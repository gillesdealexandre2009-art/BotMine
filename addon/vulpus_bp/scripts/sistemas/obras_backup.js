// @ts-check
// Cópia de segurança da área de uma obra (estruturas salvas no próprio mundo) para poder desfazer. A área é cortada em cubos
// (64, ou 32 se o jogo recusar o tamanho), cada um vira uma estrutura "vulpus:obra_<nome>_<n>". Restaurar coloca todos de volta
// e apaga as estruturas. Os geradores aqui seguem o mesmo protocolo das obras: `yield { area }` pede carga de área.
import { StructureSaveMode, world } from "@minecraft/server";
import { registrarErro } from "../core/util.js";

/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {{ x1: number, y1: number, z1: number, x2: number, y2: number, z2: number }} Caixa */
/** @typedef {{ prefixo: string, caixa: Caixa, tile: number, n: number, falhas: number }} Backup */

const Y_MIN = -64, Y_MAX = 319;

/** Cubos que cobrem a caixa. @param {Caixa} c @param {number} tile */
export function cubos(c, tile) {
  const lista = [];
  for (let y = Math.max(Y_MIN, c.y1); y <= Math.min(Y_MAX, c.y2); y += tile) {
    for (let z = c.z1; z <= c.z2; z += tile) {
      for (let x = c.x1; x <= c.x2; x += tile) {
        lista.push({ x, y, z, x2: Math.min(x + tile - 1, c.x2), y2: Math.min(y + tile - 1, Math.min(Y_MAX, c.y2)), z2: Math.min(z + tile - 1, c.z2) });
      }
    }
  }
  return lista;
}

/** @param {string} prefixo @param {number} i */
export const idEstrutura = (prefixo, i) => `vulpus:obra_${prefixo}_${i}`;

/**
 * Salva a área. Devolve o registro do backup (guarde para restaurar).
 * @param {Dimension} dim @param {string} prefixo @param {Caixa} caixa @param {(f: number, t: string) => void} progresso
 * @returns {Generator<any, Backup>}
 */
export function* salvarBackup(dim, prefixo, caixa, progresso) {
  let tile = 64;
  let lista = cubos(caixa, tile);
  let falhas = 0;
  for (let i = 0; i < lista.length; i++) {
    const t = lista[i];
    yield { area: { x1: t.x, z1: t.z, x2: t.x2, z2: t.z2 } };
    const id = idEstrutura(prefixo, i);
    try {
      if (world.structureManager.get(id)) world.structureManager.delete(id);
      world.structureManager.createFromWorld(id, dim, { x: t.x, y: t.y, z: t.z }, { x: t.x2, y: t.y2, z: t.z2 }, { includeEntities: false, includeBlocks: true, saveMode: StructureSaveMode.World });
    } catch (e) {
      if (tile === 64 && i === 0) {
        // o jogo não aceita cubos desse tamanho: recomeça com 32
        tile = 32;
        lista = cubos(caixa, tile);
        i = -1;
        continue;
      }
      falhas++;
      registrarErro("Obras: backup", e);
    }
    progresso((i + 1) / lista.length, "Guardando uma cópia da área");
    if (i % 4 === 3) yield;
  }
  return { prefixo, caixa, tile, n: lista.length, falhas };
}

/**
 * Coloca o backup de volta e apaga as estruturas.
 * @param {Dimension} dim @param {Backup} b @param {(f: number, t: string) => void} progresso
 * @returns {Generator<any, number>}  quantos cubos voltaram
 */
export function* restaurarBackup(dim, b, progresso) {
  const lista = cubos(b.caixa, b.tile);
  let voltou = 0;
  for (let i = 0; i < lista.length; i++) {
    const t = lista[i];
    yield { area: { x1: t.x, z1: t.z, x2: t.x2, z2: t.z2 } };
    const id = idEstrutura(b.prefixo, i);
    try {
      if (world.structureManager.get(id)) {
        world.structureManager.place(id, dim, { x: t.x, y: t.y, z: t.z }, { includeEntities: false });
        voltou++;
      }
    } catch (e) {
      registrarErro("Obras: restaurar", e);
    }
    progresso((i + 1) / lista.length, "Devolvendo o terreno original");
    if (i % 4 === 3) yield;
  }
  apagarBackup(b);
  return voltou;
}

/** Apaga as estruturas do backup. @param {Backup} b */
export function apagarBackup(b) {
  const total = cubos(b.caixa, b.tile).length;
  for (let i = 0; i < total; i++) {
    try {
      const id = idEstrutura(b.prefixo, i);
      if (world.structureManager.get(id)) world.structureManager.delete(id);
    } catch {
      // já não existe
    }
  }
}
