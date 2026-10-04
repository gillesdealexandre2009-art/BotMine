// @ts-check
// Textos do Capture the Flag (as bandeiras nas guerras de clãs), na voz da Kiza. Os de erro já saem em §c.
import { formatarCoords, formatarNumero } from "../core/util.js";
import { G, glyph } from "../glyphs.js";

/** @typedef {import("../sistemas/cla_guerra.js").Guerra} Guerra */
/** @typedef {"a" | "b"} Lado */

const B = glyph(G.BANDEIRA);
/** [TAG] de um lado da guerra, com a cor guardada nela. @param {Guerra} g @param {Lado} lado */
const TAG = (g, lado) => `§8[§${g.cores[lado]}${g.tags[lado]}§8]§r`;
/** @param {Lado} lado @returns {Lado} */
const outro = (lado) => (lado === "a" ? "b" : "a");
/** @param {number} n */
const pontos = (n) => (n > 0 ? ` §a+${formatarNumero(n)} ponto${n > 1 ? "s" : ""}!` : "");
/** @param {Guerra} g */
const PLACAR = (g) => `§f[${g.tags.a}] ${g.pontos.a} x ${g.pontos.b} [${g.tags.b}]`;

/** Por que a bandeira caiu de quem levava. */
export const MOTIVOS_QUEDA = Object.freeze({
  morreu: "foi derrubado(a)",
  saiu: "saiu do jogo",
  dimensao: "trocou de dimensão",
  salto: "foi teleportado(a)",
  elytra: "vestiu a elytra",
});
/** @typedef {keyof typeof MOTIVOS_QUEDA} MotivoQueda */

/** @param {Guerra} g @param {Lado} lado  dono da bandeira @param {string} nome */
export const PEGOU = (g, lado, nome) => `${B} §f${nome} ${TAG(g, outro(lado))} §epegou a bandeira de ${TAG(g, lado)}§e!`;
/** @param {Guerra} g @param {Lado} lado @param {string} nome @param {MotivoQueda} motivo @param {number} segundos */
export const CAIU = (g, lado, nome, motivo, segundos) =>
  `${B} §7A bandeira de ${TAG(g, lado)} §7caiu: §f${nome} §7${MOTIVOS_QUEDA[motivo]}. Volta sozinha em ${segundos} s se ninguém encostar.`;
/** @param {Guerra} g @param {Lado} lado @param {string} nome @param {number} n */
export const DEVOLVEU = (g, lado, nome, n) => `${B} §f${nome} §7devolveu a bandeira de ${TAG(g, lado)} §7ao pedestal.${pontos(n)}`;
/** @param {Guerra} g @param {Lado} lado */
export const VOLTOU_SOZINHA = (g, lado) => `${B} §7Ninguém encostou: a bandeira de ${TAG(g, lado)} §7voltou sozinha ao pedestal.`;
/** @param {Guerra} g @param {Lado} lado */
export const VOLTOU_ABISMO = (g, lado) => `${B} §7A bandeira de ${TAG(g, lado)} §7caiu num lugar sem volta e reapareceu no pedestal.`;
/** @param {Guerra} g @param {Lado} quem  lado que capturou @param {string} nome @param {number} n */
export const CAPTUROU = (g, quem, nome, n) =>
  `${B} §6CAPTURA!§r §f${nome} ${TAG(g, quem)} §7levou a bandeira de ${TAG(g, outro(quem))} §7para casa.${pontos(n)} §7Placar: ${PLACAR(g)}`;
/** Anúncio curto para todo o servidor. @param {Guerra} g @param {Lado} quem @param {string} nome */
export const CAPTURA_GLOBAL = (g, quem, nome) => `${B} §f${nome} ${TAG(g, quem)} §7capturou a bandeira de ${TAG(g, outro(quem))}§7!`;
/** @param {Guerra} g @param {Lado} quem  lado de quem derrubou @param {string} matador @param {string} vitima @param {number} n */
export const DERRUBOU_CARREGADOR = (g, quem, matador, vitima, n) =>
  `${B} §f${matador} ${TAG(g, quem)} §7derrubou §f${vitima}§7, que levava a bandeira de ${TAG(g, quem)}§7.${pontos(n)}`;
/** @param {Guerra} g */
export const VOLTARAM_NO_FIM = (g) => `${B} §7Fim da guerra ${TAG(g, "a")} §7x ${TAG(g, "b")}§7: as bandeiras voltaram aos pedestais.`;

/** @param {Guerra} g */
export const CTF_LIGADO = (g) =>
  g.ctf
    ? `${B} §eCapture the Flag valendo!§r Pegue a bandeira inimiga e leve até a sua (ela precisa estar no pedestal). ` +
      `§7Bandeiras: ${TAG(g, "a")} §f${formatarCoords(g.ctf.a.pos)} §8• ${TAG(g, "b")} §f${formatarCoords(g.ctf.b.pos)}`
    : `${B} §7Esta guerra está sem bandeiras (falta pedestal num dos lados): só os abates contam.`;

/** @param {number} segundos */
export const RECARGA_BARRA = (segundos) => `§7Bandeira recarregando: §f${segundos}s`;
export const NOVATO_BARRA = "§7Só quem já era do clã quando a guerra foi declarada mexe nas bandeiras.";
export const TIRE_ELYTRA = "§cSem espaço para guardar a elytra: abra um espaço no inventário para pegar a bandeira.";
export const ELYTRA_GUARDADA = "Guardei sua elytra no inventário: com a bandeira não dá para planar.";
export const ITEM_BLOQUEADO = "Com a bandeira não dá para usar isso (pérola, fruta do coro, fogos ou elytra). Leve a pé!";
export const TP_BLOQUEADO = "Com a bandeira na mão não tem teleporte. Leve a pé!";
export const TITULO_PEGOU = "§eBANDEIRA!";
/** @param {Guerra} g @param {Lado} meu */
export const SUBTITULO_PEGOU = (g, meu) => `§7Leve até a bandeira de [${g.tags[meu]}] na sua base`;
export const TITULO_CAPTURA = "§6CAPTURA!";
/** @param {number} n */
export const SUBTITULO_CAPTURA = (n) => `§a+${formatarNumero(n)} pontos para o clã`;
/** nameTag da bandeira no pedestal (ou caída): [TAG] pintada. @param {string} tag */
export const NOME_ENTIDADE = (tag) => `${B} §8[${tag}§8]`;
