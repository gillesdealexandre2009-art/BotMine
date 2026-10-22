// @ts-check
// Pets: máquinas de cápsula no lobby (Caudas ou ficha), coleção com 8 pets de 4 raridades, evolução por fragmentos e o pet que
// segue a pessoa, com bônus leves (XP, sorte na masmorra, poções e cura). Dados e regras em pets_bonus.js.
import { system, world } from "@minecraft/server";
import { ICONES } from "../config.js";
import { registrarComando } from "../core/comandos.js";
import { config, lerMundo, salvarMundo } from "../core/db.js";
import * as efeitos from "../core/efeitos.js";
import { manterTexto } from "../core/flutuante.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { TAG_SUMIDO, online, posicoesOnline } from "../core/jogadores.js";
import { ehStaff } from "../core/permissoes.js";
import { mostrarTitulo } from "../core/tela.js";
import { teleportar } from "../core/teleporte.js";
import { erro, formatarCoords, msg, ok, registrarErro, rodarSeguro, som } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import { INDICE_PRIMEIRO_VIVO, MODELOS as NOMES_MODELOS } from "../textos/props_modelos.js";
import * as textos from "../textos/pets.js";
import { adicionarCaudas, saldo } from "./caudas.js";
import { temSelo } from "./kitsune.js";
import { DIM_ID } from "./mg.js";
import { emMinigame } from "./mg_estado.js";
import { NIVEL_MAX, custoEvolucao, dadosPet, darFicha, esquecerPet, evoluir, forca, petsAtivos, petPorId, raridade, receberPet, salvarPet, sortearPet } from "./pets_bonus.js";

/** @typedef {import("@minecraft/server").Entity} Entity */
/** @typedef {import("@minecraft/server").Player} Player */
/** @typedef {{ id: number, x: number, y: number, z: number, d: string, yaw: number }} Maquina */

const CHAVE_MAQ = "vulpus:pets_maq";
const ENTIDADE = "vulpus:vida";
const TAG_PET = "vulpus_pet";
const TAG_MAQ = "vulpus_pet_maq";
const TAG_MAQ_TXT = "vulpus_pet_maq_t";
const DIMENSOES = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
/** Onde procurar pets e efeitos soltos: inclui a dimensão dos minigames, aonde um pet pode ir parar junto com a staff. */
const DIMENSOES_LIMPEZA = [...DIMENSOES, DIM_ID];
const MAX_MAQUINAS = 6;
const PASSO_SEGUIR = 4;
const PASSO_EFEITOS = 40;
const PASSO_MANTER = 100;
const PASSO_LIMPAR = 100;
const ALTURA_TITULO = 2.0;
const DISTANCIA_TELEPORTE = 14;
const CURA_SEG = 25;
const ROSA = { red: 1, green: 0.55, blue: 0.85 };
const DOURADO = { red: 1, green: 0.78, blue: 0.22 };

/** Posição do primeiro pet e da máquina entre os modelos animados (vulpus:modelo da entidade vida). */
/** vulpus:modelo do pet, achado pelo nome do modelo. @param {{ nome: string }} pet */
const modeloPet = (pet) => NOMES_MODELOS.indexOf(`Pet: ${pet.nome}`) - INDICE_PRIMEIRO_VIVO;
const MODELO_MAQUINA = NOMES_MODELOS.indexOf("Máquina de cápsulas de pet") - INDICE_PRIMEIRO_VIVO;
const MODELO_MAQUINA_ATIVA = NOMES_MODELOS.indexOf("Máquina de cápsulas girando") - INDICE_PRIMEIRO_VIVO;
const MODELO_BOLA0 = NOMES_MODELOS.indexOf("Cápsula de pet: bola comum") - INDICE_PRIMEIRO_VIVO;
const TAG_FX = "vulpus_pet_fx";
/** Cor de cada raridade nas partículas. */
const COR_RARIDADE = { comum: { red: 0.92, green: 0.92, blue: 1 }, incomum: { red: 0.4, green: 0.95, blue: 0.5 }, raro: { red: 0.4, green: 0.65, blue: 1 }, lendario: { red: 1, green: 0.8, blue: 0.25 }, insano: { red: 1, green: 0.2, blue: 0.25 }, divino: { red: 0.5, green: 0.95, blue: 1 }, absoluto: { red: 0.9, green: 0.4, blue: 1 } };
const ORDEM_RAR = Object.keys(textos.RARIDADES);
/** vulpus:modelo da cápsula da raridade (as 4 primeiras são seguidas; as outras são achadas pelo nome). @param {string} rar */
const modeloBola = (rar) => {
  const i = ORDEM_RAR.indexOf(rar);
  if (i < 4) return MODELO_BOLA0 + i;
  const nome = { insano: "insana", divino: "divina", absoluto: "absoluta" }[/** @type {"insano"} */ (rar)];
  return NOMES_MODELOS.indexOf(`Cápsula de pet: bola ${nome}`) - INDICE_PRIMEIRO_VIVO;
};
const ARCO = [{ red: 1, green: 0.35, blue: 0.35 }, { red: 1, green: 0.7, blue: 0.25 }, { red: 1, green: 0.95, blue: 0.4 }, { red: 0.45, green: 0.95, blue: 0.5 }, { red: 0.4, green: 0.85, blue: 1 }, { red: 0.5, green: 0.55, blue: 1 }, { red: 0.8, green: 0.5, blue: 1 }];
/** Entidades de efeito vivas agora (as que sobrarem são varridas). */
const fxVivos = new Set();
/** Máquinas em plena abertura: o manter() não troca o modelo delas. */
const ativas = new Set();

// ------------------------------------------------------------------------------------ máquinas

/** @type {Maquina[] | undefined} */
let maquinas;
let seq = 0;

/** @returns {Maquina[]} */
function lista() {
  if (maquinas) return maquinas;
  const s = /** @type {any} */ (lerMundo(CHAVE_MAQ, {}));
  seq = Number.isFinite(s?.seq) ? s.seq : 0;
  maquinas = (Array.isArray(s?.lista) ? s.lista : [])
    .filter((m) => m && typeof m.d === "string" && [m.id, m.x, m.y, m.z, m.yaw].every((n) => Number.isFinite(n)))
    .map((m) => ({ id: m.id, x: m.x, y: m.y, z: m.z, d: m.d, yaw: m.yaw }));
  return maquinas;
}

function gravarMaq() {
  salvarMundo(CHAVE_MAQ, { seq, lista: lista() });
}

/** @type {Map<number, Entity>} */
const entMaq = new Map();

/** Garante cada máquina no lugar e o texto flutuante em cima dela. */
function manterMaquinas() {
  try {
    const ligado = config().petsLigados;
    /** @type {Entity[]} */
    let achadas = [];
    for (const d of DIMENSOES) achadas.push(...world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_MAQ] }));
    const ids = new Set(lista().map((m) => m.id));
    for (const e of achadas) {
      const id = Number(e.getTags().find((t) => t.startsWith(`${TAG_MAQ}_`))?.slice(TAG_MAQ.length + 1));
      if (!ids.has(id) || !ligado) {
        e.remove();
        achadas = achadas.filter((x) => x !== e);
      }
    }
    for (const m of lista()) {
      const tag = `${TAG_MAQ}_${m.id}`;
      manterTexto(`${TAG_MAQ_TXT}_${m.id}`, ligado ? { x: m.x, y: m.y + ALTURA_TITULO, z: m.z, d: m.d } : undefined, textos.TITULO_FLUTUANTE);
      if (!ligado) continue;
      const dim = world.getDimension(m.d);
      if (!dim.isChunkLoaded(m)) continue;
      const mesmas = achadas.filter((e) => e.hasTag(tag));
      let ent = mesmas.find((e) => e.dimension.id === dim.id);
      for (const e of mesmas) if (e !== ent) e.remove();
      if (!ent) {
        ent = dim.spawnEntity(ENTIDADE, m);
        ent.addTag(TAG_MAQ);
        ent.addTag(tag);
        ent.setRotation({ x: 0, y: m.yaw });
      } else if (Math.hypot(ent.location.x - m.x, ent.location.y - m.y, ent.location.z - m.z) > 0.05) {
        ent.teleport(m, { dimension: dim });
      }
      if (!ativas.has(m.id)) ent.setProperty("vulpus:modelo", MODELO_MAQUINA);
      entMaq.set(m.id, ent);
    }
  } catch (e) {
    registrarErro("Pets: máquinas", e);
  }
}
system.runInterval(manterMaquinas, PASSO_MANTER);

// ------------------------------------------------------------------------------------ abrir cápsula

/** @type {Set<string>} */
const abrindo = new Set();
const rng = Math.random;

/** @param {Player} player @param {Maquina | undefined} maq */
async function abrirMaquina(player, maq) {
  const cfg = config();
  if (!cfg.petsLigados) {
    erro(player, textos.SEM_PETS_LIGADOS);
    return;
  }
  const aqui = () => abrirMaquina(player, maq);
  const d = dadosPet(player);
  const tela = new Lista(textos.TITULO_MAQUINA)
    .texto(textos.CORPO_MAQUINA(saldo(player), d.fichas, d.hoje, cfg.petMaxDia, d.pr, cfg.petPityRaro, d.pl, cfg.petPityLendario, cfg.petCusto))
    .botao(textos.BOTAO_ABRIR(cfg.petCusto), ICONES.caudas, (p) => abrirCapsula(p, maq, false))
    .botao(textos.BOTAO_FICHA(d.fichas), ICONES.nova, (p) => abrirCapsula(p, maq, true))
    ;
  if (temSelo(player)) {
    const n = cfg.petKitsuneLote;
    if (n > 1) {
      tela.botao(textos.BOTAO_LOTE(n, cfg.petCusto * n), ICONES.caudas, (p) => abrirLote(p, maq, false));
      tela.botao(textos.BOTAO_LOTE_FICHA(n, d.fichas), ICONES.nova, (p) => abrirLote(p, maq, true));
    }
  }
  tela
    .botao(textos.BOTAO_MEUS_PETS, ICONES.perfil, (p) => menuColecao(p, aqui))
    .botao(textos.BOTAO_COMO_FUNCIONA, ICONES.regras, (p) => new Lista(textos.BOTAO_COMO_FUNCIONA).texto(textos.COMO_FUNCIONA).voltar(aqui).abrir(p));
  await tela.abrir(player);
}

/**
 * @param {Player} player
 * @param {Maquina | undefined} maq
 * @param {boolean} comFicha
 */
function abrirCapsula(player, maq, comFicha) {
  const cfg = config();
  const d = dadosPet(player);
  if (!cfg.petsLigados) return erro(player, textos.SEM_PETS_LIGADOS);
  if (abrindo.has(player.id)) return erro(player, textos.OCUPADA);
  const espera = Math.ceil((d.ult + cfg.petEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return erro(player, textos.ESPERA(espera));
  if (d.hoje >= cfg.petMaxDia) return erro(player, textos.LIMITE_DIA(d.hoje));
  if (comFicha) {
    if (d.fichas < 1) return erro(player, textos.SEM_FICHA);
  } else if (saldo(player) < cfg.petCusto) return erro(player, textos.SEM_SALDO(cfg.petCusto));
  // paga e sorteia na hora (a animação é só espetáculo: nada se perde se a pessoa sair no meio)
  if (comFicha) d.fichas -= 1;
  else if (cfg.petCusto > 0) adicionarCaudas(player, -cfg.petCusto, textos.MOTIVO_CAPSULA);
  d.hoje += 1;
  d.ult = Date.now();
  const pet = sortearPet(d, rng, cfg.petPityRaro, cfg.petPityLendario);
  const r = receberPet(d, pet);
  salvarPet(player);
  abrindo.add(player.id);
  espetaculo(player, maq, pet, r);
}

/**
 * Kitsune: abre várias de uma vez (o mesmo preço por cápsula, e todas contam no teto do dia). O espetáculo mostra a melhor e,
 * no fim, uma lista com todas. Só praticidade: ninguém ganha nada que não ganharia abrindo uma a uma.
 * @param {Player} player
 * @param {Maquina | undefined} maq
 * @param {boolean} comFicha
 */
function abrirLote(player, maq, comFicha) {
  const cfg = config();
  const n = cfg.petKitsuneLote;
  const d = dadosPet(player);
  if (!cfg.petsLigados) return erro(player, textos.SEM_PETS_LIGADOS);
  if (!temSelo(player) || n < 2) return;
  if (abrindo.has(player.id)) return erro(player, textos.OCUPADA);
  const espera = Math.ceil((d.ult + cfg.petEsperaSeg * 1000 - Date.now()) / 1000);
  if (espera > 0) return erro(player, textos.ESPERA(espera));
  if (d.hoje + n > cfg.petMaxDia) return erro(player, textos.SEM_TETO_LOTE(n));
  const custo = cfg.petCusto * n;
  if (comFicha) {
    if (d.fichas < n) return erro(player, textos.SEM_SALDO_LOTE(n, custo));
    d.fichas -= n;
  } else {
    if (saldo(player) < custo) return erro(player, textos.SEM_SALDO_LOTE(n, custo));
    if (custo > 0) adicionarCaudas(player, -custo, textos.MOTIVO_CAPSULA);
  }
  d.hoje += n;
  d.ult = Date.now();
  const ordem = ORDEM_RAR;
  /** @type {{ pet: import("./pets_bonus.js").Pet, r: { novo: boolean, fragmentos: number } }[]} */
  const resultados = [];
  for (let i = 0; i < n; i++) {
    const pet = sortearPet(d, rng, cfg.petPityRaro, cfg.petPityLendario);
    resultados.push({ pet, r: receberPet(d, pet) });
  }
  salvarPet(player);
  // a estrela do espetáculo: a maior raridade; entre iguais, a que é nova
  const estrela = resultados.reduce((a, b) => {
    const ra = ordem.indexOf(a.pet.rar), rb = ordem.indexOf(b.pet.rar);
    return rb > ra || (rb === ra && b.r.novo && !a.r.novo) ? b : a;
  });
  abrindo.add(player.id);
  espetaculo(player, maq, estrela.pet, estrela.r, resultados);
}

/** @param {Player} player @param {{ pet: import("./pets_bonus.js").Pet, r: { novo: boolean, fragmentos: number } }[]} lote */
function mostrarLote(player, lote) {
  const linhas = lote.map((x) => textos.LINHA_LOTE(raridade(x.pet.rar).cor, x.pet.nome, raridade(x.pet.rar).nome, x.r.novo ? textos.NOTA_NOVO : textos.NOTA_REPETIDO(x.r.fragmentos)));
  rodarSeguro(player, "Pets: lote", () => new Lista(textos.TITULO_LOTE).texto(linhas.join("\n")).abrir(player));
}

/** Toca um som no mundo, para quem estiver perto (o servidor pode recusar o id). @param {import("@minecraft/server").Dimension} dim @param {string} id @param {{ x: number, y: number, z: number }} pos @param {number} volume @param {number} pitch */
function tocar(dim, id, pos, volume, pitch) {
  try {
    dim.playSound(id, pos, { volume, pitch });
  } catch {
    // som inexistente: segue sem ele
  }
}

/** Clarão rápido na tela de quem abriu. @param {Player} player @param {{ red: number, green: number, blue: number }} cor */
function clarao(player, cor) {
  try {
    player.camera.fade({ fadeColor: cor, fadeTime: { fadeInTime: 0.08, holdTime: 0.06, fadeOutTime: 0.7 } });
  } catch {
    // sem câmera: segue
  }
}

/**
 * Uma entidade de efeito (bola ou pet de exibição).
 * @param {import("@minecraft/server").Dimension} dim
 * @param {{ x: number, y: number, z: number }} pos
 * @param {number} modelo
 */
function criarFx(dim, pos, modelo) {
  const e = dim.spawnEntity(ENTIDADE, pos);
  e.addTag(TAG_FX);
  e.setProperty("vulpus:modelo", modelo);
  fxVivos.add(e.id);
  return e;
}

/** @param {Entity | undefined} e */
function tirarFx(e) {
  if (!e) return;
  fxVivos.delete(e.id);
  try {
    if (e.isValid) e.remove();
  } catch {
    // já foi
  }
}

/**
 * A abertura: a máquina chacoalha, a cápsula cai com a cor da raridade, quica, paira e fica tensa; então abre e o pet surge.
 * ~5 s (7 s no lendário). A cor da bola já entrega o suspense; o texto só aparece na revelação.
 * @param {Player} player
 * @param {Maquina | undefined} maq
 * @param {import("./pets_bonus.js").Pet} pet
 * @param {{ novo: boolean, fragmentos: number }} r
 * @param {{ pet: import("./pets_bonus.js").Pet, r: { novo: boolean, fragmentos: number } }[]} [lote]  todas as cápsulas de uma abertura em lote
 */
function espetaculo(player, maq, pet, r, lote) {
  const rar = pet.rar;
  const cor = raridade(rar);
  const corP = /** @type {any} */ (COR_RARIDADE)[rar];
  const dim = player.dimension;
  const nivelRar = ORDEM_RAR.indexOf(rar);
  const forte = nivelRar >= 2;
  const lendario = nivelRar >= 3;
  const supremo = nivelRar >= 4;
  const yaw = maq ? (maq.yaw * Math.PI) / 180 : (player.getRotation().y * Math.PI) / 180 + Math.PI;
  const f = { x: -Math.sin(yaw), z: Math.cos(yaw) };
  const base = maq ? { x: maq.x, y: maq.y, z: maq.z } : { x: player.location.x - f.x * 1.5, y: player.location.y, z: player.location.z - f.z * 1.5 };
  const C0 = { x: base.x + f.x * 0.55, y: base.y + 0.45, z: base.z + f.z * 0.55 };
  const H = { x: base.x + f.x * 1.7, y: base.y + 1.45, z: base.z + f.z * 1.7 };
  const T_GIRA = 40, T_QUEDA = 20, T_TENSO = supremo ? 120 : lendario ? 90 : rar === "raro" ? 70 : 50, T_MOSTRA = supremo ? 120 : lendario ? 100 : 70;
  const t1 = T_GIRA, t2 = t1 + T_QUEDA, t3 = t2 + T_TENSO, t4 = t3 + T_MOSTRA;
  /** @type {Entity | undefined} */
  let bola;
  /** @type {Entity | undefined} */
  let exibe;
  const ent = maq ? entMaq.get(maq.id) : undefined;
  if (maq) ativas.add(maq.id);
  try {
    if (ent?.isValid) ent.setProperty("vulpus:modelo", MODELO_MAQUINA_ATIVA);
  } catch (e) {
    registrarErro("Pets: máquina girando", e);
  }
  player.onScreenDisplay.setActionBar(textos.ABRINDO);
  let t = 0;
  const terminar = () => {
    tirarFx(bola);
    tirarFx(exibe);
    if (maq) {
      ativas.delete(maq.id);
      try {
        if (ent?.isValid) ent.setProperty("vulpus:modelo", MODELO_MAQUINA);
      } catch {
        // máquina sumiu
      }
    }
    abrindo.delete(player.id);
    if (lote && player.isValid) system.runTimeout(() => mostrarLote(player, lote), 10);
  };
  const run = system.runInterval(() => {
    try {
      t += 2;
      if (t <= t1) {
        // 1) a máquina chacoalha: bolinhas em fúria, partículas na cúpula e um tambor que acelera
        const u = t / t1;
        if (t % 4 === 0) tocar(dim, "note.hat", base, 0.7, 0.8 + u * 1.2);
        if (t % 8 === 0) tocar(dim, "note.bass", base, 0.8, 0.6 + u * 0.5);
        efeitos.nuvem(dim, { x: base.x, y: base.y + 1.25, z: base.z }, { n: 2, largura: 0.45, y0: 0, alto: 0.7 }, "minecraft:endrod");
        if (t === t1) {
          const m = maq ? entMaq.get(maq.id) : undefined;
          if (m?.isValid) m.setProperty("vulpus:modelo", MODELO_MAQUINA);
          bola = criarFx(dim, C0, modeloBola(rar));
          tocar(dim, "random.pop", C0, 1, 0.8);
          tocar(dim, "note.bell", C0, 0.8, 0.9);
        }
      } else if (t <= t2) {
        // 2) a cápsula sai pela bandeja e quica até ficar à frente da máquina
        const u = (t - t1) / T_QUEDA;
        const arco = Math.sin(Math.min(1, u) * Math.PI) * 0.6;
        if (bola?.isValid) bola.teleport({ x: C0.x + (H.x - C0.x) * u, y: C0.y + (H.y - C0.y) * u + arco, z: C0.z + (H.z - C0.z) * u });
        if (t === t2) {
          tocar(dim, "note.bell", H, 0.9, 1.2);
          efeitos.anel(dim, H, { raio: 0.5, n: 8, y: -0.2 }, "minecraft:colored_flame_particle", [corP]);
        }
      } else if (t <= t3) {
        // 3) suspense: a bola paira, o anel se fecha e o som sobe; do raro em diante o coração bate
        const u = (t - t2) / T_TENSO;
        if (bola?.isValid) bola.teleport({ x: H.x, y: H.y + Math.sin(t * 0.35) * 0.06, z: H.z });
        const raio = 1.2 * (1 - u) + 0.18;
        const cores = lendario ? [ARCO[Math.floor(t / 2) % ARCO.length], ARCO[(Math.floor(t / 2) + 3) % ARCO.length]] : [corP];
        efeitos.anel(dim, H, { raio, n: 10, y: 0, giro: t * 0.5 }, "minecraft:colored_flame_particle", cores);
        if (forte) efeitos.anel(dim, H, { raio: raio * 0.6, n: 6, y: 0.1, giro: -t * 0.7 }, "minecraft:endrod");
        if (t % 6 === 0) tocar(dim, "note.pling", H, 0.55, 0.6 + u * 1.2);
        if (forte && t % 20 === 0) tocar(dim, "note.bass", H, 1, 0.5);
      } else if (t === t3 + 2) {
        // 4) abre: some a bola, clarão, explosão de partículas e o pet surge girando
        tirarFx(bola);
        bola = undefined;
        if (forte) clarao(player, lendario ? { red: 1, green: 0.9, blue: 0.5 } : { red: 0.7, green: 0.85, blue: 1 });
        efeitos.nuvem(dim, H, { n: supremo ? 60 : lendario ? 36 : forte ? 22 : 10, largura: 0.9, y0: -0.4, alto: 1.4 }, "minecraft:endrod");
        efeitos.nuvem(dim, H, { n: lendario ? 24 : forte ? 14 : 6, largura: 0.9, y0: -0.4, alto: 1.4 }, "minecraft:totem_particle");
        for (let k = 0; k < (supremo ? 5 : lendario ? 3 : forte ? 2 : 1); k++) efeitos.anel(dim, H, { raio: 0.7 + k * 0.6, n: 14, y: k * 0.25 }, "minecraft:colored_flame_particle", lendario ? ARCO : [corP]);
        tocar(dim, lendario ? "random.totem" : forte ? "random.levelup" : "random.orb", H, 1, forte ? 1 : 1.4);
        if (forte) tocar(dim, "random.explode", H, 0.35, 1.6);
        exibe = criarFx(dim, { x: H.x, y: H.y - 0.35, z: H.z }, modeloPet(pet));
        exibe.nameTag = `${cor.cor}${pet.nome}`;
        mostrarTitulo(player, textos.TITULO_RESULTADO(cor.cor, pet.nome, cor.nome), { subtitulo: textos.SUBTITULO_RESULTADO(cor.cor, cor.nome, r.novo, r.fragmentos), entrada: 6, fica: T_MOSTRA - 10, saida: 14 });
        if (lendario) world.sendMessage(textos.AVISO_LENDARIO(player.name, pet.nome, cor.cor, cor.nome));
        else if (rar === "raro") {
          for (const j of posicoesOnline()) if (j.d === dim.id && Math.hypot(j.x - H.x, j.z - H.z) <= 24 && j.p !== player) msg(j.p, textos.AVISO_RARO(player.name, pet.nome, cor.cor));
        }
      } else if (t <= t4) {
        // 5) o pet gira e paira para a pessoa admirar; faíscas leves
        if (exibe?.isValid) {
          exibe.teleport({ x: H.x, y: H.y - 0.35 + Math.sin(t * 0.25) * 0.08, z: H.z }, { rotation: { x: 0, y: (t * 9) % 360 } });
          if (t % 6 === 0) efeitos.nuvem(dim, H, { n: forte ? 3 : 1, largura: 0.6, y0: -0.2, alto: 1.1 }, "minecraft:endrod");
        }
      } else {
        system.clearRun(run);
        terminar();
      }
    } catch (e) {
      system.clearRun(run);
      terminar();
      registrarErro("Pets: abertura", e);
    }
  }, 2);
}

// Clicar na máquina abre o menu.
world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  try {
    if (ev.target.typeId !== ENTIDADE || !ev.target.hasTag(TAG_MAQ)) return;
    if (ehStaff(ev.player) && ev.player.isSneaking) return;
    ev.cancel = true;
    const player = ev.player;
    const id = Number(ev.target.getTags().find((t) => t.startsWith(`${TAG_MAQ}_`))?.slice(TAG_MAQ.length + 1));
    const maq = lista().find((m) => m.id === id);
    system.run(() => rodarSeguro(player, "Cápsulas de pet", (p) => abrirMaquina(p, maq)));
  } catch (e) {
    registrarErro("Pets: interação", e);
  }
});

// Ninguém machuca nem empurra os pets e as máquinas (já são imunes a dano; isto só garante).
// ------------------------------------------------------------------------------------ coleção

/** @param {Player} player @param {() => any} [voltar] */
export async function menuColecao(player, voltar) {
  const aqui = () => menuColecao(player, voltar);
  const d = dadosPet(player);
  const ativos = petsAtivos(player);
  const max = config().petMaxAtivos;
  const tem = Object.keys(d.own).length;
  const nomes = ativos.length ? ativos.map((a) => `${raridade(a.pet.rar).cor}${a.pet.nome}`).join("§7, ") : textos.NENHUM_ATIVO;
  const tela = new Lista(textos.TITULO_COLECAO).texto(textos.CORPO_COLECAO(textos.PETS.length, tem, nomes, ativos.length, max));
  if (ativos.length) {
    tela.botao(textos.BOTAO_GUARDAR_TODOS, ICONES.voltar, async (p) => {
      dadosPet(p).ativos = [];
      salvarPet(p);
      msg(p, textos.DESEQUIPOU);
      await aqui();
    });
  }
  if (tem) {
    if (temSelo(player)) {
      tela.botao(d.esconder ? textos.BOTAO_MOSTRAR : textos.BOTAO_ESCONDER, ICONES.ajustes, async (p) => {
        const x = dadosPet(p);
        x.esconder = !x.esconder;
        salvarPet(p);
        msg(p, x.esconder ? textos.ESCONDIDOS : textos.VISIVEIS);
        await aqui();
      });
    } else tela.rotulo(textos.DICA_KITSUNE);
  }
  if (!tem) tela.rotulo(textos.SEM_PETS);
  for (const pet of textos.PETS) {
    const x = d.own[pet.id];
    if (!x) {
      tela.botao(textos.BOTAO_NAO_TEM(pet.nome), ICONES.historico, aqui);
      continue;
    }
    tela.botao(textos.BOTAO_PET(pet.nome, raridade(pet.rar).cor, x[0], d.ativos.includes(pet.id)), ICONES.perfil, (p) => menuPet(p, pet.id, aqui));
  }
  await tela.voltar(voltar).abrir(player);
}

/** Os pets da pessoa estão escondidos? (só vale para Kitsune) @param {Player} player */
export const petsEscondidos = (player) => dadosPet(player).esconder && temSelo(player);

/** Kitsune esconde ou mostra os pets. Devolve se ficaram escondidos. @param {Player} player */
export function alternarEsconderPets(player) {
  const x = dadosPet(player);
  x.esconder = !x.esconder;
  salvarPet(player);
  msg(player, x.esconder ? textos.ESCONDIDOS : textos.VISIVEIS);
  return x.esconder;
}

/** Linhas de bônus de um pet em certo nível. @param {import("./pets_bonus.js").Pet} pet @param {number} nivel */
export function linhasBonus(pet, nivel) {
  const f = forca(nivel);
  const amp = nivel >= NIVEL_MAX ? 1 : 0;
  /** @type {string[]} */
  const l = [];
  if (pet.xp > 0) l.push(textos.BONUS_XP(Math.round(pet.xp * f * 10) / 10));
  if (pet.sorte > 0) l.push(textos.BONUS_SORTE(Math.round(pet.sorte * f * 10) / 10));
  for (const e of pet.efeitos) l.push(textos.BONUS_EFEITO(/** @type {any} */ (textos.NOMES_EFEITO)[e] ?? e, textos.EFEITOS_FIXOS.includes(e) ? 0 : amp));
  if (pet.cura) l.push(textos.BONUS_CURA(Math.max(10, CURA_SEG - (nivel - 1) * 4)));
  return l;
}

/** @param {Player} player @param {string} id @param {() => any} voltar */
async function menuPet(player, id, voltar) {
  const pet = petPorId(id);
  const d = dadosPet(player);
  const x = d.own[id];
  if (!pet || !x) return voltar();
  const aqui = () => menuPet(player, id, voltar);
  const rar = raridade(pet.rar);
  const custo = custoEvolucao(x[0]);
  const tela = new Lista(pet.nome).texto(textos.CORPO_PET(rar.cor, pet.nome, rar.nome, pet.tipo, x[0], pet.desc, linhasBonus(pet, x[0]), x[1]));
  if (d.ativos.includes(id)) {
    tela.botao(textos.BOTAO_GUARDAR, ICONES.voltar, async (p) => {
      const y = dadosPet(p);
      y.ativos = y.ativos.filter((i) => i !== id);
      salvarPet(p);
      msg(p, textos.DESEQUIPOU);
      await aqui();
    });
  } else if (d.ativos.length < config().petMaxAtivos) {
    tela.botao(textos.BOTAO_EQUIPAR, ICONES.sim, async (p) => {
      const y = dadosPet(p);
      if (!y.ativos.includes(id) && y.ativos.length < config().petMaxAtivos) y.ativos.push(id);
      salvarPet(p);
      ok(p, textos.EQUIPOU(pet.nome));
      await aqui();
    });
  } else {
    for (const outro of d.ativos.slice(0, config().petMaxAtivos)) {
      const po = petPorId(outro);
      if (!po) continue;
      tela.botao(textos.BOTAO_TROCAR(po.nome), ICONES.sim, async (p) => {
        const y = dadosPet(p);
        y.ativos = y.ativos.map((i) => (i === outro ? id : i));
        salvarPet(p);
        ok(p, textos.EQUIPOU(pet.nome));
        await aqui();
      });
    }
  }
  if (custo > 0) {
    tela.botao(textos.BOTAO_EVOLUIR(custo, x[1]), ICONES.nova, async (p) => {
      const y = dadosPet(p);
      const n = evoluir(y, id);
      if (n) {
        salvarPet(p);
        ok(p, textos.EVOLUIU(pet.nome, n));
        som(p, "random.levelup", { volume: 0.8 });
      } else erro(p, textos.SEM_FRAGMENTOS);
      await aqui();
    });
  } else tela.rotulo(textos.NIVEL_MAXIMO);
  await tela.voltar(voltar).abrir(player);
}

registrarComando({ nome: "pets", descricao: textos.CMD_PETS }, (p) => menuColecao(p));

// ------------------------------------------------------------------------------------ o pet que segue

/** @type {Map<string, Entity>} "dono:pet" → entidade do pet */
const seguidores = new Map();

/** Tira os pets da pessoa, menos os de `manter`. @param {string} donoId @param {Set<string>} [manter] */
function semPets(donoId, manter) {
  for (const [k, e] of [...seguidores]) {
    if (!k.startsWith(`${donoId}:`) || manter?.has(k)) continue;
    try {
      if (e.isValid) e.remove();
    } catch {
      // já foi
    }
    seguidores.delete(k);
  }
}

/** Posição de um pet: o primeiro atrás e à esquerda, o segundo atrás e à direita. @param {Player} player @param {number} i */
function alvoDoPet(player, i) {
  const l = player.location;
  const yaw = (player.getRotation().y * Math.PI) / 180;
  const dx = -Math.sin(yaw), dz = Math.cos(yaw);
  const lado = i % 2 === 0 ? 1 : -1;
  return { x: l.x - dx * 1.3 + dz * 0.9 * lado, y: l.y + 0.1, z: l.z - dz * 1.3 - dx * 0.9 * lado };
}

/**
 * Cria (se precisar) e leva um pet até o alvo: teletransporte se está longe, passo suave se está perto.
 * @param {Player} player
 * @param {{ x: number, y: number, z: number }} j  posição da pessoa
 * @param {string} chave  "dono:pet"
 * @param {number} modelo
 * @param {string} nome
 * @param {{ x: number, y: number, z: number }} alvo
 */
function seguirPet(player, j, chave, modelo, nome, alvo) {
  let ent = seguidores.get(chave);
  const dim = player.dimension;
  if (!ent?.isValid) {
    ent = dim.spawnEntity(ENTIDADE, alvo);
    ent.addTag(TAG_PET);
    ent.setDynamicProperty("vulpus:dono", player.id);
    seguidores.set(chave, ent);
  }
  if (ent.getProperty("vulpus:modelo") !== modelo) {
    ent.setProperty("vulpus:modelo", modelo);
    ent.nameTag = nome;
  }
  const p = ent.location;
  const dist = Math.hypot(alvo.x - p.x, alvo.y - p.y, alvo.z - p.z);
  const yaw = (Math.atan2(-(j.x - p.x), j.z - p.z) * 180) / Math.PI;
  if (ent.dimension.id !== dim.id || dist > DISTANCIA_TELEPORTE) ent.teleport(alvo, { dimension: dim, rotation: { x: 0, y: yaw } });
  else if (dist > 0.15) {
    const k = Math.min(1, 0.3 + dist * 0.05);
    ent.teleport({ x: p.x + (alvo.x - p.x) * k, y: p.y + (alvo.y - p.y) * k, z: p.z + (alvo.z - p.z) * k }, { dimension: dim, rotation: { x: 0, y: yaw } });
  }
}

/** Posição do pet de vitrine: bem atrás da pessoa, no meio (os ativos ficam nos lados). @param {Player} player */
function alvoVitrine(player) {
  const l = player.location;
  const yaw = (player.getRotation().y * Math.PI) / 180;
  return { x: l.x + Math.sin(yaw) * 2.6, y: l.y + 0.1, z: l.z - Math.cos(yaw) * 2.6 };
}

/** O pet de vitrine da pessoa (só vale com o selo), ou undefined. @param {Player} player */
export function vitrineDe(player) {
  if (!temSelo(player)) return undefined;
  const d = dadosPet(player);
  return d.vitrine && d.own[d.vitrine] ? petPorId(d.vitrine) : undefined;
}

/**
 * Escolhe (ou, com "", tira) o pet de vitrine. Só Kitsune e só um pet que a pessoa tem; é puramente visual.
 * @param {Player} player
 * @param {string} id
 * @returns {boolean}
 */
export function definirVitrine(player, id) {
  if (!temSelo(player)) {
    erro(player, textos.VITRINE_SO_KITSUNE);
    return false;
  }
  const d = dadosPet(player);
  if (id !== "" && !d.own[id]) return false;
  d.vitrine = id;
  salvarPet(player);
  msg(player, id ? textos.VITRINE_OK(petPorId(id)?.nome ?? id) : textos.VITRINE_TIRADA);
  return true;
}

/**
 * Menu do pet de vitrine: os pets que a pessoa tem e que não estão ativos (o ativo já aparece sozinho).
 * @param {Player} player
 * @param {() => any} [voltar]
 */
export async function menuVitrine(player, voltar) {
  if (!temSelo(player)) {
    erro(player, textos.VITRINE_SO_KITSUNE);
    return voltar?.();
  }
  const aqui = () => menuVitrine(player, voltar);
  const d = dadosPet(player);
  const atual = vitrineDe(player);
  const tela = new Lista(textos.TITULO_VITRINE).texto(textos.CORPO_VITRINE(atual ? atual.nome : ""));
  const livres = textos.PETS.filter((p) => d.own[p.id] && !d.ativos.includes(p.id));
  if (!livres.length) tela.rotulo(textos.VITRINE_SEM_PETS);
  for (const pet of livres) {
    tela.botao(textos.BOTAO_VITRINE_ITEM(raridade(pet.rar).cor, pet.nome), ICONES.perfil, async (p) => {
      definirVitrine(p, pet.id);
      await aqui();
    });
  }
  if (atual) {
    tela.botao(textos.BOTAO_VITRINE_TIRAR, ICONES.nao, async (p) => {
      definirVitrine(p, "");
      await aqui();
    });
  }
  await tela.voltar(voltar).abrir(player);
}

system.runInterval(() => {
  try {
    const ligado = config().petsLigados;
    for (const j of posicoesOnline()) {
      const player = j.p;
      const escondido = dadosPet(player).esconder && temSelo(player);
      // a mesma condição vale para os pets e para o de vitrine: confere uma vez só por pessoa
      const mostra = ligado && !escondido && !player.hasTag(TAG_SUMIDO) && !emMinigame(player) && !player.dimension.id.startsWith("vulpus:");
      const ativos = mostra ? petsAtivos(player) : [];
      const manter = new Set();
      ativos.forEach((a, i) => {
        const chave = `${player.id}:${a.pet.id}`;
        manter.add(chave);
        const modelo = modeloPet(a.pet);
        seguirPet(player, j, chave, modelo, `${raridade(a.pet.rar).cor}${a.pet.nome}`, alvoDoPet(player, i));
      });
      // Pet de vitrine (Kitsune): só enfeite, fora de petsAtivos (nenhum bônus de XP, sorte, poção ou cura).
      // Segue as mesmas regras dos outros (esconder, sumido, minigame, dimensões vulpus:*) e não repete um pet já ativo.
      const vit = mostra ? vitrineDe(player) : undefined;
      if (vit && !ativos.some((a) => a.pet.id === vit.id)) {
        const chave = `${player.id}:vit`;
        manter.add(chave);
        seguirPet(player, j, chave, modeloPet(vit), textos.NOME_VITRINE(raridade(vit.rar).cor, vit.nome), alvoVitrine(player));
      }
      semPets(player.id, manter);
    }
  } catch (e) {
    registrarErro("Pets: seguir", e);
  }
}, PASSO_SEGUIR);

// Poções leves enquanto os pets estão com a pessoa (o maior reforço de cada efeito vale).
system.runInterval(() => {
  try {
    if (!config().petsLigados) return;
    for (const p of online()) {
      if (emMinigame(p)) continue; // sem o pet por perto, sem o efeito dele
      /** @type {Map<string, number>} */
      const efs = new Map();
      for (const a of petsAtivos(p)) {
        for (const ef of a.pet.efeitos) {
          const fixo = textos.EFEITOS_FIXOS.includes(ef);
          efs.set(ef, Math.max(efs.get(ef) ?? 0, fixo ? 0 : a.nivel >= NIVEL_MAX ? 1 : 0));
        }
      }
      for (const [ef, amp] of efs) p.addEffect(ef, ef === "night_vision" ? 320 : 100, { amplifier: amp, showParticles: false });
    }
  } catch (e) {
    registrarErro("Pets: efeitos", e);
  }
}, PASSO_EFEITOS);

/** @type {Map<string, number>} */
const ultimaCura = new Map();
// Cura leve (Komainu e Nove-Caudinhas) quando a vida está abaixo de 60%.
system.runInterval(() => {
  try {
    if (!config().petsLigados) return;
    const agora = system.currentTick;
    for (const p of online()) {
      if (emMinigame(p)) continue;
      const curadores = petsAtivos(p).filter((a) => a.pet.cura);
      if (!curadores.length) continue;
      const nivel = Math.max(...curadores.map((a) => a.nivel));
      const intervalo = Math.max(10, CURA_SEG - (nivel - 1) * 4) * 20;
      if (agora - (ultimaCura.get(p.id) ?? -intervalo) < intervalo) continue;
      const vida = p.getComponent("minecraft:health");
      if (!vida || vida.currentValue > vida.effectiveMax * 0.6) continue;
      ultimaCura.set(p.id, agora);
      p.addEffect("regeneration", 80, { amplifier: nivel >= 3 ? 1 : 0, showParticles: true });
      efeitos.nuvem(p.dimension, p.location, { n: 5, largura: 0.5, y0: 0.2, alto: 1.5 }, "minecraft:heart_particle");
    }
  } catch (e) {
    registrarErro("Pets: cura", e);
  }
}, 20);

/** Tira todos os pets e efeitos de abertura soltos (sobras de antes de um /reload ou de um reinício). */
function limparSobras() {
  for (const d of DIMENSOES_LIMPEZA) {
    try {
      for (const e of world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_PET] })) e.remove();
      for (const e of world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_FX] })) e.remove();
    } catch (e) {
      if (d !== DIM_ID) registrarErro("Pets: sobras", e); // a dimensão dos minigames pode não existir ainda
    }
  }
}
// Ao carregar o script (inclusive no /reload) a memória dos seguidores zera, mas os pets antigos continuam no mundo: somem agora
// e os pets certos reaparecem em seguida. Sem isso cada /reload somava mais um pet atrás da pessoa.
system.run(limparSobras);

// Limpeza: pet sem dono online (ou duplicado) some.
system.runInterval(() => {
  try {
    const validos = new Set([...seguidores.values()].map((e) => e.id));
    for (const d of DIMENSOES_LIMPEZA) {
      try {
        for (const e of world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_PET] })) if (!validos.has(e.id)) e.remove();
        for (const e of world.getDimension(d).getEntities({ type: ENTIDADE, tags: [TAG_FX] })) if (!fxVivos.has(e.id)) e.remove();
      } catch {
        // dimensão dos minigames ainda não registrada
      }
    }
  } catch (e) {
    registrarErro("Pets: limpeza", e);
  }
}, PASSO_LIMPAR);

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  semPets(playerId);
  ultimaCura.delete(playerId);
  abrindo.delete(playerId);
  esquecerPet(playerId);
});

// ------------------------------------------------------------------------------ painel da staff

/** @param {Player} player */
function marcarMaquina(player) {
  if (lista().length >= MAX_MAQUINAS) return erro(player, textos.LIMITE_MAQUINAS(MAX_MAQUINAS));
  /** @type {import("@minecraft/server").Block | undefined} */
  let b;
  try {
    b = player.getBlockFromViewDirection({ maxDistance: 12 })?.block;
  } catch {
    b = undefined;
  }
  if (!b) return erro(player, textos.OLHE_PARA_BLOCO);
  const x = b.x + 0.5, z = b.z + 0.5;
  const yaw = Math.round((Math.atan2(-(player.location.x - x), player.location.z - z) * 180) / Math.PI);
  lista().push({ id: ++seq, x, y: b.y + 1, z, d: b.dimension.id, yaw });
  gravarMaq();
  manterMaquinas();
  ok(player, textos.MAQUINA_POSTA(formatarCoords(b)));
}

/**
 * Menu da staff das cápsulas e dos pets.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]
 */
export async function menuPetsStaff(player, voltar, configurar) {
  if (!ehStaff(player)) return erro(player, SO_STAFF);
  const aqui = () => menuPetsStaff(player, voltar, configurar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const tela = new Lista(textos.TITULO_STAFF).texto(textos.CORPO_STAFF(lista().length));
  tela.botao(textos.BOTAO_NOVA_MAQUINA, ICONES.nova, eVolta(marcarMaquina));
  tela.botao(textos.BOTAO_DAR_FICHAS, ICONES.caudas, eVolta(darFichasStaff));
  tela.botao(textos.BOTAO_DAR_PETS, ICONES.perfil, eVolta(darTodosPetsStaff));
  if (!lista().length) tela.rotulo(textos.SEM_MAQUINAS);
  for (const m of lista()) {
    tela.botao(`Máquina ${m.id} §7(${formatarCoords(m)})`, ICONES.buscar, async (p) => {
      if (!ehStaff(p)) return;
      await new Lista(`Máquina ${m.id}`)
        .botao(textos.BOTAO_IR, ICONES.tpa, async (j) => {
          if (ehStaff(j)) teleportar(j, { x: m.x, y: m.y, z: m.z + 1.5, d: m.d }, { nome: "máquina de cápsulas", tema: "spawn" });
        })
        .botao(textos.BOTAO_REMOVER, ICONES.apagar, async (j) => {
          if (!ehStaff(j) || !(await confirmar(j, { titulo: textos.BOTAO_REMOVER, texto: formatarCoords(m) }))) return;
          maquinas = lista().filter((x) => x !== m);
          gravarMaq();
          manterTexto(`${TAG_MAQ_TXT}_${m.id}`, undefined, "");
          manterMaquinas();
          ok(j, textos.MAQUINA_REMOVIDA);
          await aqui();
        })
        .voltar(aqui)
        .abrir(p);
    });
  }
  if (configurar) tela.botao(textos.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurar(p)));
  await tela.voltar(voltar).abrir(player);
}

/** Dá a coleção inteira (para testes e eventos). @param {Player} staff */
async function darTodosPetsStaff(staff) {
  const todos = online();
  if (!todos.length) return erro(staff, textos.NINGUEM_ONLINE);
  const r = await perguntar(staff, textos.BOTAO_DAR_PETS, [
    { tipo: "lista", rotulo: textos.ROTULO_QUEM, opcoes: todos.map((p) => p.name), padrao: 0 },
    { tipo: "numero", rotulo: textos.ROTULO_NIVEL, padrao: 1, min: 1, max: NIVEL_MAX },
  ]);
  if (!r || !ehStaff(staff)) return;
  const alvo = todos[r[0]];
  if (!alvo?.isValid) return;
  const nivel = Math.max(1, Math.min(NIVEL_MAX, Math.floor(r[1])));
  const d = dadosPet(alvo);
  for (const pet of textos.PETS) {
    const atual = d.own[pet.id];
    if (!atual) d.own[pet.id] = [nivel, 0];
    else if (atual[0] < nivel) atual[0] = nivel;
  }
  if (!d.ativos.length && textos.PETS.length) d.ativos.push(textos.PETS[0].id);
  salvarPet(alvo);
  ok(staff, textos.PETS_DADOS(textos.PETS.length, alvo.name));
  if (alvo.id !== staff.id) msg(alvo, textos.PETS_RECEBIDOS(textos.PETS.length));
}

/** @param {Player} staff */
async function darFichasStaff(staff) {
  const todos = online();
  if (!todos.length) return erro(staff, textos.NINGUEM_ONLINE);
  const r = await perguntar(staff, textos.BOTAO_DAR_FICHAS, [
    { tipo: "lista", rotulo: textos.ROTULO_QUEM, opcoes: todos.map((p) => p.name), padrao: 0 },
    { tipo: "numero", rotulo: textos.ROTULO_QTD, padrao: 1, min: 1, max: 50 },
  ]);
  if (!r || !ehStaff(staff)) return;
  const alvo = todos[r[0]];
  if (!alvo?.isValid) return;
  darFicha(alvo, Math.floor(r[1]), "presente da staff");
  ok(staff, textos.FICHAS_DADAS(Math.floor(r[1]), alvo.name));
}
