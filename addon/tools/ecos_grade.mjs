// Pincel em grade 3D para rodar o gerador do mapa dos Ecos fora do jogo (prévia e testes).
// Estende o PincelMemoria das obras: mesmo contrato, mas guarda os blocos numa grade compacta e registra escritas fora da CAIXA.
import { PincelMemoria } from "../vulpus_bp/scripts/sistemas/obras_pincel.js";

export class PincelGrade extends PincelMemoria {
  /**
   * @param {{ x1: number, x2: number, y1: number, y2: number, z1: number, z2: number }} caixa  limites permitidos (relativos)
   * @param {{ margem?: number, existe?: (id: string) => boolean }} [op]
   */
  constructor(caixa, op = {}) {
    super();
    const m = op.margem ?? 6;
    this.caixa = caixa;
    this.o = { x: caixa.x1 - m, y: caixa.y1 - m, z: caixa.z1 - m };
    this.dim = { x: caixa.x2 - caixa.x1 + 1 + 2 * m, y: caixa.y2 - caixa.y1 + 1 + 2 * m, z: caixa.z2 - caixa.z1 + 1 + 2 * m };
    this.grade = new Uint16Array(this.dim.x * this.dim.y * this.dim.z);
    /** @type {string[]} */
    this.paleta = ["minecraft:air"];
    this.indice = new Map([["minecraft:air", 0]]);
    this.fora = 0;
    /** @type {string[]} */
    this.foraAmostra = [];
    this.desconhecidos = new Set();
    this.existeFn = op.existe ?? (() => true);
    this.nSets = 0;
    this.maiorFill = 0;
  }

  existe(id) {
    return this.existeFn(id);
  }

  /** @param {string} id @param {any} [est] */
  idx(id, est) {
    const k = est ? id + "|" + JSON.stringify(est) : id;
    let i = this.indice.get(k);
    if (i === undefined) {
      i = this.paleta.length;
      this.paleta.push(k);
      this.indice.set(k, i);
    }
    return i;
  }

  pos(x, y, z) {
    const gx = x - this.o.x, gy = y - this.o.y, gz = z - this.o.z;
    if (gx < 0 || gy < 0 || gz < 0 || gx >= this.dim.x || gy >= this.dim.y || gz >= this.dim.z) return -1;
    return (gy * this.dim.z + gz) * this.dim.x + gx;
  }

  dentro(x, y, z) {
    const c = this.caixa;
    return x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2 && z >= c.z1 && z <= c.z2;
  }

  fill(x1, y1, z1, x2, y2, z2, tipo, soAr = false) {
    this.ops++;
    const xa = Math.min(x1, x2), xb = Math.max(x1, x2), ya = Math.min(y1, y2), yb = Math.max(y1, y2), za = Math.min(z1, z2), zb = Math.max(z1, z2);
    const vol = (xb - xa + 1) * (yb - ya + 1) * (zb - za + 1);
    if (vol > this.maiorFill) this.maiorFill = vol;
    if (!this.dentro(xa, ya, za) || !this.dentro(xb, yb, zb)) {
      this.fora++;
      if (this.foraAmostra.length < 8) this.foraAmostra.push(`fill ${xa},${ya},${za} → ${xb},${yb},${zb} ${tipo}`);
      return;
    }
    const i = this.idx(tipo);
    for (let y = ya; y <= yb; y++) for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) {
      const k = this.pos(x, y, z);
      if (soAr && this.grade[k] !== 0) continue;
      this.grade[k] = i;
    }
  }

  set(x, y, z, tipo, est) {
    this.ops++;
    this.nSets++;
    if (!this.dentro(x, y, z)) {
      this.fora++;
      if (this.foraAmostra.length < 8) this.foraAmostra.push(`set ${x},${y},${z} ${tipo}`);
      return;
    }
    this.grade[this.pos(x, y, z)] = this.idx(tipo, est);
  }

  /** id completo (com estado) na grade; fora = undefined */
  bruto(x, y, z) {
    const k = this.pos(x, y, z);
    return k < 0 ? "minecraft:air" : this.paleta[this.grade[k]];
  }

  id(x, y, z) {
    return this.bruto(x, y, z).split("|")[0];
  }

  /** estado como objeto (ou undefined) */
  estado(x, y, z) {
    const s = this.bruto(x, y, z).split("|")[1];
    return s ? JSON.parse(s) : undefined;
  }

  /** contagem por id (sem estado) */
  contagem() {
    const c = new Map();
    for (let i = 0; i < this.grade.length; i++) {
      if (!this.grade[i]) continue;
      const id = this.paleta[this.grade[i]].split("|")[0];
      c.set(id, (c.get(id) ?? 0) + 1);
    }
    return c;
  }
}
