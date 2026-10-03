// @ts-check
// Texto da HUD na actionbar: curto, sem emoji.
import { formatarNumero } from "../core/util.js";

/**
 * "§6★ 120 Caudas §8| §f120 64 -30 §8| §7NE", com "+5" logo depois de ganhar.
 * @param {{ caudas: number, mudanca: number, x: number, y: number, z: number, direcao: string }} info
 */
export const LINHA = ({ caudas, mudanca, x, y, z, direcao }) => {
  const sinal = mudanca > 0 ? ` §a+${formatarNumero(mudanca)}` : mudanca < 0 ? ` §c${formatarNumero(mudanca)}` : "";
  return `§6★ ${formatarNumero(caudas)} Caudas${sinal} §8| §f${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)} §8| §7${direcao}`;
};
