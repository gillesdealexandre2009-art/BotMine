// @ts-check
// Limpeza de obras SEM cópia de segurança (as geradas antes do desfazer existir): a montanha volta a ser chão plano de grama no
// nível de referência, e a masmorra vira pedra maciça de novo (com os túneis das escadas antigas tapados). O terreno original não
// é conhecido, então isto assume que o chão ali era plano. Quem tem backup usa a restauração, que devolve o terreno exato.

/** @typedef {import("./obras_pincel.js").Pincel} Pincel */
/** @typedef {{ x: number, y: number, z: number }} Ponto */

const AR = "minecraft:air";

/**
 * Remove a montanha e o ecossistema em volta (árvores incluídas) e devolve o chão plano de grama.
 * @param {Pincel} p
 * @param {{ cx: number, cz: number, baseY: number, raio: number, altura: number, lago: Ponto | null }} o
 * @param {(f: number, t: string) => void} progresso
 * @returns {Generator<any, void>}
 */
export function* limparMontanha(p, o, progresso) {
  // só o corpo da montanha: floresta e construções em volta, fora do raio da base, não são tocadas
  const R = Math.round(o.raio * 1.05) + 3;
  const passo = 48;
  const x1 = o.cx - R, z1 = o.cz - R, x2 = o.cx + R, z2 = o.cz + R;
  const tiles = [];
  for (let z = z1; z <= z2; z += passo) for (let x = x1; x <= x2; x += passo) tiles.push({ x1: x, z1: z, x2: Math.min(x + passo - 1, x2), z2: Math.min(z + passo - 1, z2) });
  let feito = 0;
  let n = p.ops;
  for (const t of tiles) {
    yield { area: t };
    for (let z = t.z1; z <= t.z2; z++) {
      for (let x = t.x1; x <= t.x2; x++) {
        const noLago = o.lago && Math.hypot(x - o.lago.x, z - o.lago.z) <= 24;
        if (Math.hypot(x - o.cx, z - o.cz) > R && !noLago) continue;
        // chão no nível de referência (ou abaixo) não tem nada da montanha para tirar: deixa como está
        const s = p.superficie(x, z);
        if (!noLago && (!s || s.y <= o.baseY + 1)) continue;
        p.fill(x, o.baseY + 1, z, x, o.baseY + o.altura + 36, z, AR);
        p.set(x, o.baseY, z, "minecraft:grass_block");
        // o que a montanha escavou (lago, rio, trilha) volta a ser terra
        p.fill(x, o.baseY - (noLago ? 9 : 2), z, x, o.baseY - 1, z, "minecraft:dirt");
        if (p.ops - n > 500) {
          n = p.ops;
          yield;
        }
      }
    }
    feito++;
    progresso(feito / tiles.length, "Nivelando a montanha");
  }
}

/**
 * Enche a caixa da masmorra de pedra e tapa as rampas antigas.
 * @param {Pincel} p
 * @param {{ x0: number, z0: number, yPiso: number, baseY: number, rampas: { porta: Ponto, superficie: Ponto | null }[] }} o
 * @param {(f: number, t: string) => void} progresso
 * @returns {Generator<any, void>}
 */
export function* limparMasmorra(p, o, progresso) {
  const rocha = o.yPiso < 0 ? "minecraft:deepslate" : "minecraft:stone";
  const y1 = o.yPiso - 6, y2 = o.yPiso + 19;
  const tile = 40;
  const total = Math.ceil(156 / tile) ** 2;
  let feito = 0;
  for (let tz = -3; tz < 153; tz += tile) {
    for (let tx = -3; tx < 153; tx += tile) {
      const gx2 = Math.min(tx + tile - 1, 152), gz2 = Math.min(tz + tile - 1, 152);
      yield { area: { x1: o.x0 + tx, z1: o.z0 + tz, x2: o.x0 + gx2, z2: o.z0 + gz2 } };
      for (let gz = tz; gz <= gz2; gz++) p.fill(o.x0 + tx, y1, o.z0 + gz, o.x0 + gx2, y2, o.z0 + gz, rocha);
      feito++;
      progresso((feito / total) * 0.8, "Enchendo a masmorra de pedra");
    }
  }
  // túneis das escadas antigas: do portal até a superfície, 7 de largura
  let r = 0;
  for (const rampa of o.rampas) {
    if (!rampa.superficie) continue;
    const vx = rampa.superficie.x - rampa.porta.x, vz = rampa.superficie.z - rampa.porta.z;
    const dx = Math.abs(vx) >= Math.abs(vz) ? Math.sign(vx) : 0, dz = dx === 0 ? Math.sign(vz) : 0;
    const comp = Math.round(Math.max(Math.abs(vx), Math.abs(vz))) + 6;
    const px = dx !== 0 ? 0 : 1, pz = dz !== 0 ? 0 : 1;
    yield { area: { x1: Math.round(Math.min(rampa.porta.x, rampa.superficie.x)) - 10, z1: Math.round(Math.min(rampa.porta.z, rampa.superficie.z)) - 10, x2: Math.round(Math.max(rampa.porta.x, rampa.superficie.x)) + 10, z2: Math.round(Math.max(rampa.porta.z, rampa.superficie.z)) + 10 } };
    for (let i = 0; i <= comp; i++) {
      for (let l = -4; l <= 4; l++) {
        const x = Math.floor(rampa.porta.x) + dx * i + px * l, z = Math.floor(rampa.porta.z) + dz * i + pz * l;
        p.fill(x, o.yPiso - 2, z, x, o.baseY - 4, z, "minecraft:stone");
        p.fill(x, o.baseY - 3, z, x, o.baseY - 1, z, "minecraft:dirt");
        p.set(x, o.baseY, z, "minecraft:grass_block");
        p.fill(x, o.baseY + 1, z, x, o.baseY + 10, z, AR);
      }
      if (i % 6 === 0) yield;
    }
    r++;
    progresso(0.8 + (r / Math.max(1, o.rampas.length)) * 0.2, "Tapando os túneis antigos");
  }
  progresso(1, "Masmorra desfeita");
}
