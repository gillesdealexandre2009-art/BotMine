// @ts-check
// "Pincel" das obras: a única parte que escreve blocos no mundo. Os geradores (montanha, masmorra) só falam com ele,
// então dá para testá-los com PincelMemoria sem o jogo.
import { BlockPermutation, BlockTypes, BlockVolume } from "@minecraft/server";

/** @typedef {import("@minecraft/server").Dimension} Dimension */
/** @typedef {Record<string, string | number | boolean>} Estados */

export const Y_MIN = -64;
export const Y_MAX = 319;

/**
 * @typedef {object} Pincel
 * @property {number} ops  operações feitas (os geradores usam para saber a hora de ceder a vez)
 * @property {(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, tipo: string, soAr?: boolean, estados?: Estados) => void} fill
 * @property {(x: number, y: number, z: number, tipo: string, estados?: Estados) => void} set
 * @property {(x: number, y: number, z: number) => string | undefined} id  tipo do bloco (undefined = não carregado)
 * @property {(x: number, z: number) => { y: number, id: string } | undefined} superficie  primeiro bloco sólido ou líquido de cima para baixo
 * @property {(x: number, y: number, z: number, linhas: string[]) => void} placa  escreve o texto de uma placa já posta
 * @property {(id: string) => boolean} existe  o jogo desta versão conhece esse bloco?
 */

/** Blocos que a superfície "atravessa": plantas, folhas, troncos e neve fina não são o chão. */
const NAO_CHAO = /(^minecraft:air$|leaves|_log$|_wood$|short_grass|tall_grass|fern|flower|poppy|dandelion|tulip|bluet|cornflower|daisy|allium|lily|bush|mushroom|vine|snow_layer|^minecraft:snow_layer$|sapling|cave_air|void_air|waterlily|reeds|deadbush|short_dry_grass|leaf_litter)/;

/** @param {string} id */
export function ehChao(id) {
  return !NAO_CHAO.test(id);
}

/** Pincel de verdade: escreve na dimensão. */
export class PincelMundo {
  /** @param {Dimension} dim */
  constructor(dim) {
    this.dim = dim;
    this.ops = 0;
    this.falhas = 0;
    /** colunas que ficaram sem terreno carregado (puladas) */
    this.semChao = 0;
    /** @type {string} */
    this.primeiraFalha = "";
    /** @type {Map<string, BlockPermutation>} */
    this.perms = new Map();
  }

  fill(x1, y1, z1, x2, y2, z2, tipo, soAr = false, estados = undefined) {
    const ya = Math.max(Y_MIN, Math.min(y1, y2)), yb = Math.min(Y_MAX, Math.max(y1, y2));
    if (ya > yb) return;
    this.ops++;
    try {
      const vol = new BlockVolume({ x: Math.min(x1, x2), y: ya, z: Math.min(z1, z2) }, { x: Math.max(x1, x2), y: yb, z: Math.max(z1, z2) });
      /** @type {any} */
      let alvo = tipo;
      if (estados) {
        const chave = tipo + JSON.stringify(estados);
        alvo = this.perms.get(chave);
        if (!alvo) {
          try {
            alvo = BlockPermutation.resolve(tipo, estados);
            this.perms.set(chave, alvo);
          } catch (e) {
            this.falha(`estado de ${tipo}`, e);
            alvo = tipo;
          }
        }
      }
      this.dim.fillBlocks(vol, alvo, soAr ? { blockFilter: { includeTypes: ["minecraft:air"] }, ignoreChunkBoundErrors: true } : { ignoreChunkBoundErrors: true });
    } catch (e) {
      this.falha(`fill ${tipo}`, e);
    }
  }

  /** Conta e guarda a primeira falha de cada tipo (a obra segue: um bloco ruim não derruba a geração). @param {string} onde @param {unknown} e */
  falha(onde, e) {
    this.falhas++;
    if (!this.primeiraFalha) this.primeiraFalha = `${onde}: ${e instanceof Error ? e.message : String(e)}`;
  }

  set(x, y, z, tipo, estados) {
    if (y < Y_MIN || y > Y_MAX) return;
    this.ops++;
    try {
      if (!estados) {
        this.dim.setBlockType({ x, y, z }, tipo);
        return;
      }
      const chave = tipo + JSON.stringify(estados);
      let perm = this.perms.get(chave);
      if (!perm) {
        try {
          perm = BlockPermutation.resolve(tipo, estados);
        } catch (e) {
          this.falha(`estado de ${tipo}`, e);
          this.dim.setBlockType({ x, y, z }, tipo);
          return;
        }
        this.perms.set(chave, perm);
      }
      this.dim.setBlockPermutation({ x, y, z }, perm);
    } catch (e) {
      this.falha(`set ${tipo}`, e);
    }
  }

  id(x, y, z) {
    return this.dim.getBlock({ x, y, z })?.typeId;
  }

  superficie(x, z) {
    let topo;
    try {
      topo = this.dim.getTopmostBlock({ x, z });
    } catch {
      topo = undefined;
    }
    if (!topo) {
      this.semChao++;
      return undefined;
    }
    let y = topo.location.y;
    for (let i = 0; i < 40 && y > Y_MIN; i++) {
      const b = this.dim.getBlock({ x, y, z });
      if (!b) {
        this.semChao++;
        return undefined;
      }
      if (ehChao(b.typeId)) return { y, id: b.typeId };
      y--;
    }
    return { y, id: this.dim.getBlock({ x, y, z })?.typeId ?? "minecraft:stone" };
  }

  existe(id) {
    try {
      return BlockTypes.get(id) !== undefined;
    } catch {
      return false;
    }
  }

  placa(x, y, z, linhas) {
    try {
      const sinal = this.dim.getBlock({ x, y, z })?.getComponent("minecraft:sign");
      if (sinal && "setText" in sinal) /** @type {any} */ (sinal).setText(linhas.join("\n"));
    } catch {
      // a placa é só informação: sem ela a obra continua
    }
  }
}

/** Pincel de memória, para os testes: guarda os blocos num mapa e simula um terreno plano. */
export class PincelMemoria {
  /**
   * @param {{ chao?: (x: number, z: number) => { y: number, id: string } }} [opcoes]
   */
  constructor(opcoes = {}) {
    this.ops = 0;
    /** @type {Map<string, string>} */
    this.blocos = new Map();
    /** @type {Map<string, string[]>} */
    this.placas = new Map();
    this.chao = opcoes.chao ?? (() => ({ y: 64, id: "minecraft:grass_block" }));
  }

  /** @param {number} x @param {number} y @param {number} z */
  chave(x, y, z) {
    return `${x},${y},${z}`;
  }

  fill(x1, y1, z1, x2, y2, z2, tipo, soAr = false) {
    this.ops++;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      for (let y = Math.max(Y_MIN, Math.min(y1, y2)); y <= Math.min(Y_MAX, Math.max(y1, y2)); y++) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
          if (soAr && (this.id(x, y, z) ?? "minecraft:air") !== "minecraft:air") continue;
          this.blocos.set(this.chave(x, y, z), tipo);
        }
      }
    }
  }

  set(x, y, z, tipo) {
    this.ops++;
    this.blocos.set(this.chave(x, y, z), tipo);
  }

  id(x, y, z) {
    const k = this.chave(x, y, z);
    if (this.blocos.has(k)) return this.blocos.get(k);
    const c = this.chao(x, z);
    if (y === c.y) return c.id;
    return y < c.y ? "minecraft:stone" : "minecraft:air";
  }

  superficie(x, z) {
    for (let y = 300; y > Y_MIN; y--) {
      const id = this.id(x, y, z);
      if (id && id !== "minecraft:air" && ehChao(id)) return { y, id };
    }
    return undefined;
  }

  existe() {
    return true;
  }

  placa(x, y, z, linhas) {
    this.placas.set(this.chave(x, y, z), linhas);
  }
}
