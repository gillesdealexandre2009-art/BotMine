// @ts-check
// Painel da staff de "Feira e minigames": barracas de aposta, jogos e arenas (Spleef, Tiro, Torre, mesas),
// decoração e eventos. Cada barraca abre as próprias configurações pelo `abrirConfig` do staff.js.
import { ICONES } from "../config.js";
import { Lista, confirmar, perguntar } from "../core/forms.js";
import { ehStaff } from "../core/permissoes.js";
import { erro } from "../core/util.js";
import { SO_STAFF } from "../textos/geral.js";
import * as textosStaff from "../textos/staff.js";
import * as textosSpleef from "../textos/spleef.js";
import * as textosTiro from "../textos/tiro.js";
import { menuSpleefStaff } from "./spleef_staff.js";
import { menuTiroStaff } from "./tiro_staff.js";
import * as textosMesas from "../textos/mesas.js";
import * as textosCopos from "../textos/copos.js";
import * as textosCorrida from "../textos/corrida.js";
import * as textosForca from "../textos/forca.js";
import * as textosMoeda from "../textos/moeda.js";
import * as textosPesca from "../textos/pesca.js";
import * as textosQuiosque from "../textos/quiosque.js";
import * as textosTorre from "../textos/torre.js";
import * as textosInaug from "../textos/inauguracao.js";
import * as textosRoleta from "../textos/roleta.js";
import * as textosProps from "../textos/props.js";
import * as mesas from "./mesas.js";
import * as copos from "./copos.js";
import * as corrida from "./corrida.js";
import * as forca from "./forca.js";
import * as moeda from "./moeda.js";
import * as pesca from "./pesca.js";
import * as quiosque from "./quiosque.js";
import * as torre from "./torre.js";
import * as inaug from "./inauguracao.js";
import * as roleta from "./roleta.js";
import * as props from "./props.js";

/** @typedef {import("@minecraft/server").Player} Player */

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarMoeda]  abre as configurações do Cara ou Coroa
 */
async function menuMoedaStaff(player, voltar, configurarMoeda) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuMoedaStaff(player, voltar, configurarMoeda);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosMoeda.TITULO_STAFF)
    .texto(textosMoeda.CORPO_STAFF(moeda.estadoMoeda()))
    .botao(textosMoeda.BOTAO_MARCAR, ICONES.spawn, eVolta((p) => moeda.marcarBalcao(p)))
    .botao(textosMoeda.BOTAO_TESTAR, ICONES.caudas, eVolta((p) => moeda.testarGiro(p)));
  if (configurarMoeda) lista.botao(textosMoeda.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarMoeda(p)));
  lista.botao(
    textosMoeda.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosMoeda.BOTAO_REMOVER, texto: textosMoeda.CONFIRMAR_REMOVER })) moeda.removerMoeda(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 */
async function menuPropsStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuPropsStaff(player, voltar);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosProps.TITULO_STAFF)
    .texto(textosProps.CORPO_STAFF(props.quantosProps()))
    .botao(textosProps.BOTAO_VARINHA, ICONES.nova, eVolta((p) => props.darVarinha(p)))
    .botao(
      textosProps.BOTAO_MODELO(textosProps.MODELOS[props.modeloDa(player)]),
      ICONES.editar,
      eVolta(async (p) => {
        const r = await perguntar(p, textosProps.BOTAO_STAFF, [
          { tipo: "lista", rotulo: textosProps.ROTULO_MODELO, opcoes: [...textosProps.MODELOS], padrao: props.modeloDa(p) },
        ]);
        if (r && ehStaff(p)) props.escolherModelo(p, r[0]);
      }),
    )
    .botao(textosProps.BOTAO_POR_OLHANDO, ICONES.spawn, eVolta((p) => props.porProp(p, props.modeloDa(p))))
    .botao(textosProps.BOTAO_TROCAR_PERTO, ICONES.editar, eVolta((p) => props.trocarModeloProximo(p, props.modeloDa(p))))
    .botao(textosProps.BOTAO_GIRAR,ICONES.ordenar, eVolta((p) => props.girarProximo(p)))
    .botao(textosProps.BOTAO_REMOVER_PERTO, ICONES.apagar, eVolta((p) => props.removerProximo(p)))
    .botao(
      textosProps.BOTAO_REMOVER_TODOS,
      ICONES.apagar,
      eVolta(async (p) => {
        if (await confirmar(p, { titulo: textosProps.BOTAO_REMOVER_TODOS, texto: textosProps.CONFIRMAR_TODOS })) props.removerTodosProps(p);
      }),
    );
  await lista.voltar(voltar).abrir(player);
}

/**
 * Painel de uma mesa: jogo, tabuleiro, assentos e remover.
 * @param {Player} player
 * @param {string} id
 * @param {() => any} voltar
 */
async function menuMesaStaff(player, id, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuMesaStaff(player, id, voltar);
  const e = mesas.estadoMesas().find((m) => m.id === id);
  if (!e) return;
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  await new Lista(textosMesas.TITULO_MESA(Number(id)))
    .texto(textosMesas.CORPO_MESA(Number(id), textosMesas.NOME_JOGO[e.tipo], e.mesa, e.a1, e.a2))
    .botao(
      textosMesas.BOTAO_TIPO,
      ICONES.ordenar,
      eVolta(async (p) => {
        const r = await perguntar(p, textosMesas.BOTAO_TIPO, [
          { tipo: "lista", rotulo: textosMesas.ROTULO_TIPO, opcoes: mesas.TIPOS_DE_MESA.map((t) => textosMesas.NOME_JOGO[t]), padrao: e.tipo === "velha" ? 1 : 0 },
        ]);
        if (r && ehStaff(p)) mesas.definirTipo(p, id, mesas.TIPOS_DE_MESA[r[0]] ?? "xadrez");
      }),
    )
    .botao(textosMesas.BOTAO_MARCAR_MESA, ICONES.spawn, eVolta((p) => mesas.marcarMesa(p, id)))
    .botao(textosMesas.BOTAO_MARCAR_ASSENTO(1), ICONES.casas, eVolta((p) => mesas.marcarAssento(p, id, 0)))
    .botao(textosMesas.BOTAO_MARCAR_ASSENTO(2), ICONES.casas, eVolta((p) => mesas.marcarAssento(p, id, 1)))
    .botao(textosMesas.BOTAO_REMOVER_MESA, ICONES.apagar, eVolta((p) => mesas.removerMesa(p, id)))
    .voltar(voltar)
    .abrir(player);
}

/**
 * Lista das mesas de jogo.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurar]
 */
async function menuMesasStaff(player, voltar, configurar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuMesasStaff(player, voltar, configurar);
  const lista = new Lista(textosMesas.TITULO_STAFF).texto(textosMesas.CORPO_LISTA);
  for (const m of mesas.estadoMesas()) {
    lista.botao(textosMesas.BOTAO_MESA(Number(m.id), textosMesas.NOME_JOGO[m.tipo], m.mesa, m.assentos), ICONES.minigames, (p) => menuMesaStaff(p, m.id, aqui));
  }
  if (configurar) {
    lista.botao(textosMesas.BOTAO_CONFIG, ICONES.ajustes, async (p) => {
      if (!ehStaff(p)) return;
      await configurar(p);
      await aqui();
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarForca]  abre as configurações do Teste de Força
 */
async function menuForcaStaff(player, voltar, configurarForca) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuForcaStaff(player, voltar, configurarForca);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosForca.TITULO_STAFF)
    .texto(textosForca.CORPO_STAFF(forca.estadoForca()))
    .botao(textosForca.BOTAO_MARCAR_PAD, ICONES.spawn, eVolta((p) => forca.marcarPlataforma(p)))
    .botao(textosForca.BOTAO_MARCAR_BASE, ICONES.spawn, eVolta((p) => forca.marcarBase(p)))
    .botao(textosForca.BOTAO_MARCAR_TOPO, ICONES.spawn, eVolta((p) => forca.marcarTopo(p)))
    .botao(textosForca.BOTAO_TESTAR, ICONES.caudas, eVolta((p) => forca.testarMarcador(p)));
  if (configurarForca) lista.botao(textosForca.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarForca(p)));
  lista.botao(
    textosForca.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosForca.BOTAO_REMOVER, texto: textosForca.CONFIRMAR_REMOVER })) forca.removerForca(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarPesca]  abre as configurações da Pescaria
 */
async function menuPescaStaff(player, voltar, configurarPesca) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuPescaStaff(player, voltar, configurarPesca);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosPesca.TITULO_STAFF)
    .texto(textosPesca.CORPO_STAFF(pesca.estadoPesca()))
    .botao(textosPesca.BOTAO_MARCAR_BALCAO, ICONES.spawn, eVolta((p) => pesca.marcarBalcao(p)))
    .botao(textosPesca.BOTAO_CANTO1, ICONES.spawn, eVolta((p) => pesca.marcarCanto(p, 1)))
    .botao(textosPesca.BOTAO_CANTO2, ICONES.spawn, eVolta((p) => pesca.marcarCanto(p, 2)));
  if (configurarPesca) lista.botao(textosPesca.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarPesca(p)));
  lista.botao(
    textosPesca.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosPesca.BOTAO_REMOVER, texto: textosPesca.CONFIRMAR_REMOVER })) pesca.removerPesca(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarCorrida]  abre as configurações da Corrida de Raposas
 */
async function menuCorridaStaff(player, voltar, configurarCorrida) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuCorridaStaff(player, voltar, configurarCorrida);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosCorrida.TITULO_STAFF)
    .texto(textosCorrida.CORPO_STAFF(corrida.estadoCorrida()))
    .botao(textosCorrida.BOTAO_BALCAO, ICONES.spawn, eVolta((p) => corrida.marcarBalcao(p)))
    .botao(textosCorrida.BOTAO_LARGADA(1), ICONES.spawn, eVolta((p) => corrida.marcarLargada(p, 1)))
    .botao(textosCorrida.BOTAO_LARGADA(2), ICONES.spawn, eVolta((p) => corrida.marcarLargada(p, 2)))
    .botao(textosCorrida.BOTAO_LARGADA(3), ICONES.spawn, eVolta((p) => corrida.marcarLargada(p, 3)))
    .botao(textosCorrida.BOTAO_CHEGADA, ICONES.spawn, eVolta((p) => corrida.marcarChegada(p)))
    .botao(textosCorrida.BOTAO_TESTAR, ICONES.caudas, eVolta((p) => corrida.testarCorrida(p)));
  if (configurarCorrida) lista.botao(textosCorrida.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarCorrida(p)));
  lista.botao(
    textosCorrida.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosCorrida.BOTAO_REMOVER, texto: textosCorrida.CONFIRMAR_REMOVER })) corrida.removerCorrida(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * Editor das 12 fatias da roleta.
 * @param {Player} player
 * @param {() => any} [voltar]
 */
async function menuFatiasStaff(player, voltar) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuFatiasStaff(player, voltar);
  const lista = new Lista(textosRoleta.BOTAO_PREMIOS_STAFF).texto("§7Escolha a fatia para mudar o que ela dá. As cores da roda são fixas por posição.");
  roleta.fatiasAtuais().forEach((f, k) => {
    lista.botao(textosRoleta.LINHA_PREMIO(k, textosRoleta.DESCRICAO(f)), undefined, async (p) => {
      if (!ehStaff(p)) return;
      const r = await perguntar(p, textosRoleta.TITULO_FATIA(k), [
        { tipo: "lista", rotulo: textosRoleta.ROTULO_TIPO, opcoes: textosRoleta.NOMES_TIPO, padrao: Math.max(0, textosRoleta.TIPOS.indexOf(f.tipo)) },
        { tipo: "numero", rotulo: textosRoleta.ROTULO_VALOR, padrao: f.valor, min: 0, max: 100000 },
        { tipo: "texto", rotulo: textosRoleta.ROTULO_ITEM, dica: "minecraft:diamond", padrao: f.item },
      ]);
      if (r) roleta.definirFatia(p, k, r[0], r[1], r[2]);
      await aqui();
    });
  });
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarRoleta]  abre as configurações da Roleta
 */
async function menuRoletaStaff(player, voltar, configurarRoleta) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuRoletaStaff(player, voltar, configurarRoleta);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosRoleta.TITULO_STAFF)
    .texto(textosRoleta.CORPO_STAFF(roleta.estadoRoleta()))
    .botao(textosRoleta.BOTAO_MARCAR, ICONES.spawn, eVolta((p) => roleta.marcarRoleta(p)))
    .botao(textosRoleta.BOTAO_PREMIOS_STAFF, ICONES.caudas, (p) => menuFatiasStaff(p, aqui))
    .botao(textosRoleta.BOTAO_TESTAR, ICONES.caudas, eVolta((p) => roleta.testarAlinhamento(p)))
    .botao(textosRoleta.BOTAO_RESTAURAR, ICONES.nova, eVolta((p) => roleta.restaurarFatias(p)));
  if (configurarRoleta) lista.botao(textosRoleta.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarRoleta(p)));
  lista.botao(
    textosRoleta.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosRoleta.BOTAO_REMOVER, texto: textosRoleta.CONFIRMAR_REMOVER })) roleta.removerRoleta(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarCopos]  abre as configurações do Jogo do Copo
 */
async function menuCoposStaff(player, voltar, configurarCopos) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuCoposStaff(player, voltar, configurarCopos);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosCopos.TITULO_STAFF)
    .texto(textosCopos.CORPO_STAFF(copos.estadoCopos()))
    .botao(textosCopos.BOTAO_MARCAR, ICONES.spawn, eVolta((p) => copos.marcarBalcao(p)))
    .botao(textosCopos.BOTAO_TESTAR, ICONES.caudas, eVolta((p) => copos.testarRodada(p)));
  if (configurarCopos) lista.botao(textosCopos.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarCopos(p)));
  lista.botao(
    textosCopos.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosCopos.BOTAO_REMOVER, texto: textosCopos.CONFIRMAR_REMOVER })) copos.removerCopos(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarQuiosque]  abre as configurações do quiosque
 */
async function menuQuiosqueStaff(player, voltar, configurarQuiosque) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuQuiosqueStaff(player, voltar, configurarQuiosque);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosQuiosque.TITULO_STAFF)
    .texto(textosQuiosque.CORPO_STAFF(quiosque.estadoQuiosque()))
    .botao(textosQuiosque.BOTAO_MARCAR, ICONES.spawn, eVolta((p) => quiosque.marcarQuiosque(p)));
  if (configurarQuiosque) lista.botao(textosQuiosque.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarQuiosque(p)));
  lista.botao(
    textosQuiosque.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosQuiosque.BOTAO_REMOVER, texto: textosQuiosque.CONFIRMAR_REMOVER })) quiosque.removerQuiosque(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarTorre]  abre as configurações da torre
 */
async function menuTorreStaff(player, voltar, configurarTorre) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuTorreStaff(player, voltar, configurarTorre);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosTorre.TITULO_STAFF)
    .texto(textosTorre.CORPO_STAFF(torre.estadoTorre()))
    .botao(textosTorre.BOTAO_INICIO, ICONES.spawn, eVolta((p) => torre.marcarInicio(p)))
    .botao(textosTorre.BOTAO_CHEGADA, ICONES.spawn, eVolta((p) => torre.marcarChegada(p)));
  if (configurarTorre) lista.botao(textosTorre.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarTorre(p)));
  lista.botao(
    textosTorre.BOTAO_ZERAR,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosTorre.BOTAO_ZERAR, texto: textosTorre.CONFIRMAR_ZERAR })) torre.zerarTorre(p);
    }),
  );
  lista.botao(
    textosTorre.BOTAO_REMOVER,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosTorre.BOTAO_REMOVER, texto: textosTorre.CONFIRMAR_REMOVER })) torre.removerTorre(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player) => Promise<any>} [configurarInauguracao]  abre as configurações do evento
 */
async function menuInauguracaoStaff(player, voltar, configurarInauguracao) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuInauguracaoStaff(player, voltar, configurarInauguracao);
  /** @param {(p: Player) => any} fn */
  const eVolta = (fn) => async (/** @type {Player} */ p) => {
    if (!ehStaff(p)) return;
    await fn(p);
    await aqui();
  };
  const lista = new Lista(textosInaug.TITULO_STAFF)
    .texto(textosInaug.CORPO_STAFF(inaug.estadoInauguracao()))
    .botao(textosInaug.BOTAO_MARCAR, ICONES.spawn, async (p) => {
      if (!ehStaff(p)) return;
      const usadas = inaug.usadasPorParte();
      const partes = new Lista(textosInaug.TITULO_PARTES);
      usadas.forEach((n, i) => partes.botao(textosInaug.BOTAO_PARTE(i + 1, n), ICONES.spawn, (q) => inaug.esconder(q, i)));
      await partes.voltar(aqui).abrir(p);
    })
    .botao(textosInaug.BOTAO_LISTA, ICONES.apelido, (p) => listaInauguracao(p, aqui));
  if (configurarInauguracao) lista.botao(textosInaug.BOTAO_CONFIG, ICONES.ajustes, eVolta((p) => configurarInauguracao(p)));
  lista.botao(
    textosInaug.BOTAO_ZERAR,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosInaug.BOTAO_ZERAR, texto: textosInaug.CONFIRMAR_ZERAR })) inaug.zerarProgresso(p);
    }),
  );
  lista.botao(
    textosInaug.BOTAO_REMOVER_TODAS,
    ICONES.apagar,
    eVolta(async (p) => {
      if (await confirmar(p, { titulo: textosInaug.BOTAO_REMOVER_TODAS, texto: textosInaug.CONFIRMAR_REMOVER })) inaug.removerTodos(p);
    }),
  );
  await lista.voltar(voltar).abrir(player);
}

/**
 * @param {Player} player
 * @param {() => any} voltar
 */
async function listaInauguracao(player, voltar) {
  if (!ehStaff(player)) return;
  const aqui = () => listaInauguracao(player, voltar);
  const itens = inaug.listarItens();
  const lista = new Lista(textosInaug.TITULO_LISTA).texto(itens.length ? "" : textosInaug.SEM_ITENS);
  for (const it of itens) {
    lista.botao(textosInaug.BOTAO_ITEM(it.slot, it.onde), ICONES.spawn, async (p) => {
      if (!ehStaff(p)) return;
      await new Lista(textosInaug.TITULO_ITEM(it.slot))
        .botao(textosInaug.BOTAO_IR, ICONES.spawn, async (q) => {
          inaug.irAte(q, it.slot);
        })
        .botao(textosInaug.BOTAO_REMOVER, ICONES.apagar, async (q) => {
          inaug.removerItem(q, it.slot);
          await aqui();
        })
        .voltar(aqui)
        .abrir(p);
    });
  }
  await lista.voltar(voltar).abrir(player);
}

/**
 * Feira e minigames (staff): todas as barracas, jogos e eventos num lugar só.
 * @param {Player} player
 * @param {() => any} [voltar]
 * @param {(p: Player, id: string) => Promise<any>} [abrirConfig]  abre o editor de configurações do grupo `id` (vem de staff.js)
 */
export async function menuFeiraStaff(player, voltar, abrirConfig) {
  if (!ehStaff(player)) {
    erro(player, SO_STAFF);
    return;
  }
  const aqui = () => menuFeiraStaff(player, voltar, abrirConfig);
  /** @param {string} id */
  const cfg = (id) => (abrirConfig ? (/** @type {Player} */ p) => abrirConfig(p, id) : undefined);
  await new Lista(textosStaff.TITULO_FEIRA)
    .texto(textosStaff.CORPO_FEIRA)
    .cabecalho(textosStaff.SECAO_APOSTAS)
    .botao(textosMoeda.BOTAO_STAFF, ICONES.caudas, (p) => menuMoedaStaff(p, aqui, cfg("moeda")))
    .botao(textosRoleta.BOTAO_STAFF, ICONES.caudas, (p) => menuRoletaStaff(p, aqui, cfg("roleta")))
    .botao(textosCopos.BOTAO_STAFF, ICONES.caudas, (p) => menuCoposStaff(p, aqui, cfg("copos")))
    .botao(textosCorrida.BOTAO_STAFF, ICONES.caudas, (p) => menuCorridaStaff(p, aqui, cfg("corrida")))
    .botao(textosPesca.BOTAO_STAFF, ICONES.caudas, (p) => menuPescaStaff(p, aqui, cfg("pesca")))
    .botao(textosForca.BOTAO_STAFF, ICONES.caudas, (p) => menuForcaStaff(p, aqui, cfg("forca")))
    .cabecalho(textosStaff.SECAO_JOGOS)
    .botao(textosSpleef.BOTAO_SPLEEF, ICONES.spleef, (p) => menuSpleefStaff(p, aqui))
    .botao(textosTiro.BOTAO_STAFF, ICONES.cacada, (p) => menuTiroStaff(p, aqui, cfg("tiro")))
    .botao(textosTorre.BOTAO_STAFF, ICONES.minigames, (p) => menuTorreStaff(p, aqui, cfg("torre")))
    .botao(textosMesas.BOTAO_STAFF, ICONES.minigames, (p) => menuMesasStaff(p, aqui, cfg("mesas")))
    .cabecalho(textosStaff.SECAO_DECORACAO)
    .botao(textosQuiosque.BOTAO_STAFF, ICONES.spawn, (p) => menuQuiosqueStaff(p, aqui, cfg("quiosque")))
    .botao(textosInaug.BOTAO_STAFF, ICONES.nova, (p) => menuInauguracaoStaff(p, aqui, cfg("inauguracao")))
    .botao(textosProps.BOTAO_STAFF, ICONES.nova, (p) => menuPropsStaff(p, aqui))
    .voltar(voltar)
    .abrir(player);
}
