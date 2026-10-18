// @ts-check
// Quiosque da Kiza: um NPC provisório (a raposinha de pelúcia) fica parado dentro do quiosque, vira o rosto para quem chega
// perto e solta uma fala de vez em quando. Clicar nele abre um menu com ajuda, diária, perfil, regras, guia da feira e
// sugestões. Quando o modelo da Kiza ficar pronto, é só trocar o modelo daqui. Painel da staff: feira_staff.js.
import { Player, system, world } from "@minecraft/server";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista } from "../core/forms.js";
import { posicoesOnline } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { erro, formatarCoords, ok, registrarErro, rodarSeguro } from "../core/util.js";
import { INDICE_RAPOSA_PELUCIA } from "../textos/props_modelos.js";
import * as textos from "../textos/quiosque.js";
import { resgatarDiaria } from "./caudas.js";
import { enviarSugestao } from "./comunidade.js";
import { abrirMenu } from "./menu.js";
import { menuPerfil } from "./perfil.js";
import { menuRegras } from "./regras.js";
import { achadas, esquecerBusca } from "../core/entidades.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {{ x: number, y: number, z: number, d: string, yaw: number }} Ponto */

const CHAVE = "vulpus:quiosque";
const ENTIDADE = "vulpus:npc";
const TAG_NPC = "vulpus_quiosque_kiza";
const TAG_TITULO = "vulpus_quiosque_titulo";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const PASSO_MANTER = 100;
const PASSO_OLHAR = 10;
const ALTURA_TITULO = 1.5;
const RAIO_OLHAR = 7;
const RAIO_FALA = 10;
/** Quanto tempo (ticks) a fala fica no ar. */
const TEMPO_FALA = 140;

/** @type {{ npc?: Ponto } | undefined} */
let dados;
/** @type {string | undefined} */
let fala;
let falaAte = 0;
let proximaFala = 0;
/** @type {string} */
let textoAtual = "";

function lerDados() {
  if (dados) return dados;
  const s = lerMundo(CHAVE) ?? {};
  const n = s.npc;
  dados = { npc: n && typeof n.d === "string" && [n.x, n.y, n.z, n.yaw].every((v) => Number.isFinite(v)) ? { x: n.x, y: n.y, z: n.z, d: n.d, yaw: n.yaw } : undefined };
  return dados;
}

function gravar() {
  salvarMundo(CHAVE, lerDados());
}

/** @returns {Entity[]} */
function acharNpc() {
  return achadas("quiosque:npc", () => {
    /** @type {Entity[]} */
    const achados = [];
    for (const d of DIMENSOES) achados.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_NPC] }));
    return achados;
  });
}

/** NPC guardado (a busca completa só roda de vez em quando) e a rotação que se sabe que ele tem. */
/** @type {Entity | undefined} */
let npcVivo;
/** @type {number | undefined} */
let yawAplicado;
let ciclosManter = 0;
/** A cada quantos ciclos de manter() se procura de novo por duplicatas. */
const CICLOS_BUSCA = 6;

function texto() {
  return [textos.TITULO_FLUTUANTE, fala && system.currentTick < falaAte ? textos.LINHA_FALA(fala) : textos.SUBTITULO_PADRAO].join("\n");
}

/** Garante o NPC parado no ponto e o texto em cima dele. */
function manter() {
  try {
    const n = lerDados().npc;
    const ligado = config().quiosqueLigado && !!n;
    textoAtual = texto();
    manterTexto(TAG_TITULO, ligado && n ? { x: n.x, y: n.y + ALTURA_TITULO, z: n.z, d: n.d } : undefined, textoAtual);
    const achados = npcVivo?.isValid && ciclosManter++ % CICLOS_BUSCA !== 0 ? [npcVivo] : acharNpc();
    if (!ligado || !n) {
      for (const e of achados) e.remove();
      npcVivo = undefined;
      return;
    }
    const dim = world.getDimension(n.d);
    if (!dim.isChunkLoaded(n)) return;
    let ent = achados.find((e) => e.dimension.id === dim.id);
    for (const e of achados) if (e !== ent) e.remove();
    if (!ent) {
      ent = dim.spawnEntity(ENTIDADE, n);
      ent.addTag(TAG_NPC);
      esquecerBusca("quiosque:npc");
      ent.setRotation({ x: 0, y: n.yaw });
    } else if (Math.hypot(ent.location.x - n.x, ent.location.y - n.y, ent.location.z - n.z) > 0.05) {
      ent.teleport(n, { dimension: dim });
    }
    ent.setProperty("vulpus:modelo", INDICE_RAPOSA_PELUCIA);
    if (npcVivo !== ent) yawAplicado = undefined;
    npcVivo = ent;
  } catch (e) {
    registrarErro("Quiosque: manter", e);
  }
}
system.runInterval(manter, PASSO_MANTER);

// Vira o rosto para quem chega perto, solta falas de vez em quando e atualiza o texto.
system.runInterval(() => {
  try {
    const n = lerDados().npc;
    if (!n || !config().quiosqueLigado) return;
    const ent = npcVivo?.isValid ? npcVivo : acharNpc().find((e) => e.isValid);
    if (!ent) return;
    if (ent !== npcVivo) {
      npcVivo = ent;
      yawAplicado = undefined;
    }
    let alvo;
    let melhor = Infinity;
    let algumPertoFala = false;
    for (const j of posicoesOnline()) {
      if (j.d !== n.d) continue;
      const d3 = Math.hypot(j.x - n.x, j.y - n.y, j.z - n.z);
      if (d3 <= RAIO_FALA) algumPertoFala = true;
      if (d3 > RAIO_OLHAR) continue;
      const d = Math.hypot(j.x - n.x, j.z - n.z);
      if (d < melhor) {
        melhor = d;
        alvo = j;
      }
    }
    const yaw = alvo ? Math.round((Math.atan2(-(alvo.x - n.x), alvo.z - n.z) * 180) / Math.PI) : n.yaw;
    const atual = yawAplicado ?? (ent.getRotation()?.y ?? 0);
    if (Math.abs(atual - yaw) > 3) {
      ent.setRotation({ x: 0, y: yaw });
      yawAplicado = yaw;
    } else yawAplicado = atual;
    const agora = system.currentTick;
    if (agora >= proximaFala && algumPertoFala) {
      fala = textos.FALAS[Math.floor(Math.random() * textos.FALAS.length)];
      falaAte = agora + TEMPO_FALA;
      proximaFala = agora + Math.max(5, config().quiosqueFalaSeg) * 20;
    }
    const novo = texto();
    if (novo !== textoAtual) {
      textoAtual = novo;
      manterTexto(TAG_TITULO, { x: n.x, y: n.y + ALTURA_TITULO, z: n.z, d: n.d }, novo);
    }
  } catch (e) {
    registrarErro("Quiosque: olhar e falar", e);
  }
}, PASSO_OLHAR);

// ------------------------------------------------------------------------------------ menu
/** @param {Player} player */
async function menuFeira(player) {
  await new Lista(textos.TITULO_FEIRA).texto(textos.CORPO_FEIRA).voltar((p) => menu(p)).abrir(player);
}

/** @param {Player} player */
async function menu(player) {
  if (!config().quiosqueLigado || !lerDados().npc) {
    erro(player, textos.FECHADO);
    return;
  }
  const aqui = () => menu(player);
  await new Lista(textos.TITULO_MENU)
    .texto(textos.CORPO_MENU(player.name))
    .botao(textos.BOTAO_MENU, undefined, (p) => abrirMenu(p))
    .botao(textos.BOTAO_DIARIA, undefined, (p) => resgatarDiaria(p))
    .botao(textos.BOTAO_PERFIL, undefined, (p) => menuPerfil(p, aqui))
    .botao(textos.BOTAO_REGRAS, undefined, (p) => menuRegras(p, aqui))
    .botao(textos.BOTAO_FEIRA, undefined, (p) => menuFeira(p))
    .botao(textos.BOTAO_SUGESTAO, undefined, (p) => enviarSugestao(p))
    .abrir(player);
}

// Clicar na Kiza (o NPC) abre o menu.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE || !ev.target.hasTag(TAG_NPC)) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    system.run(() => rodarSeguro(player, "Quiosque", menu));
  } catch (e) {
    registrarErro("Quiosque: interação", e);
  }
});

// ------------------------------------------------------------------------------ painel da staff
export function estadoQuiosque() {
  const n = lerDados().npc;
  return { marcado: !!n, perto: n ? posicoesOnline().filter((j) => j.d === n.d && Math.hypot(j.x - n.x, j.y - n.y, j.z - n.z) <= RAIO_FALA).length : 0 };
}

/** @param {Player} player */
export function marcarQuiosque(player) {
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = player.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) {
    erro(player, textos.OLHE_PARA_BLOCO);
    return;
  }
  const x = b.x + 0.5;
  const z = b.z + 0.5;
  const yaw = Math.round((Math.atan2(-(player.location.x - x), player.location.z - z) * 180) / Math.PI);
  lerDados().npc = { x, y: b.y + 1, z, d: b.dimension.id, yaw };
  gravar();
  manter();
  ok(player, textos.MARCADO(formatarCoords(b)));
}

/** @param {Player} player */
export function removerQuiosque(player) {
  lerDados().npc = undefined;
  gravar();
  manter();
  ok(player, textos.REMOVIDO);
}
