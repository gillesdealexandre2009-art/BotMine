// @ts-check
// A Era no placar lateral: o número e o nome, e, durante um acontecimento, o nome dele e quantos minutos faltam. Sempre visível para quem
// está com o placar ligado, para a Era ficar presente no dia a dia. Só lê o calendário; não mexe em nada.
import { situacao } from "./eras_calendario.js";
import { eventoAtivo } from "./eras_eventos.js";

/** Corta o texto com reticências (o placar tem poucos caracteres por linha). @param {string} t @param {number} max */
const curto = (t, max) => {
  const sem = t.replace(/^(O|A|Os|As) /, ""); // "O Inverno Silencioso" cabe melhor como "Inverno Silencioso"
  return sem.length <= max ? sem : `${sem.slice(0, max - 1)}…`;
};

/**
 * Linhas da Era para o placar (0, 1 ou 2): "Era 4: Inverno Silencioso" e, no acontecimento, "» Nevasca Silenciosa 3m".
 * @returns {string[]}
 */
export function linhasEra() {
  const s = situacao();
  if ((s.fase !== "ativa" && s.fase !== "encerrada") || !s.era) return [];
  const linhas = [`§6Era ${s.numero}§7: §f${curto(s.era.nome, 19)}`];
  if (s.fase === "ativa") {
    const ev = eventoAtivo(s.numero);
    if (ev) linhas.push(`§e» §f${curto(ev.evento.nome, 20)} §7${Math.max(1, Math.ceil(ev.restanteSeg / 60))}m`);
  }
  return linhas;
}
