// @ts-check
// GERADO por tools/sons_publicar.py — não edite à mão (a configuração fica em Sons/_ambientes.json). Duração real de cada som publicado (segundos).

/** @type {Record<string, { id: string, nome: string, segundos: number }[]>} */
export const PLAYLISTS = {
  lobby: [],
};

/**
 * Ambientes sonoros. musicas: faixa (id do `music play`), segundos reais, volume relativo, loop (camada que repete por `tempo` [min,max] s).
 * pontuais: som curto (id do playSound) sorteado por peso, volume relativo, tom [min,max], posicional, susto.
 * pausa = silêncio entre faixas (s); pontualACada = intervalo entre pontuais (s); fade = fade ao trocar de ambiente (s).
 * @typedef {{ id: string, nome: string, segundos: number, volume: number, loop: boolean, tempo?: number[] }} Musica
 * @typedef {{ id: string, segundos: number, volume: number, peso: number, tom: number[], posicional: boolean, susto: boolean }} Pontual
 * @typedef {{ nome: string, musicas: Musica[], pontuais: Pontual[], pausa: number[], pontualACada: number[], fade: number }} AmbienteSom
 * @type {Record<string, AmbienteSom>}
 */
export const AMBIENTES = {
  lobby: {
    nome: "Lobby",
    musicas: [],
    pontuais: [],
    pausa: [0, 2],
    pontualACada: [30, 90],
    fade: 4,
  },
  vila: {
    nome: "Vila",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_sino_vila_1", segundos: 9.0, volume: 0.5, peso: 1.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_sino_vila_2", segundos: 7.0, volume: 0.5, peso: 1.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_passaro_1", segundos: 1.0, volume: 0.5, peso: 2.0, tom: [0.9, 1.15], posicional: true, susto: false },
      { id: "vulpus.p_passaro_2", segundos: 1.0, volume: 0.5, peso: 2.0, tom: [0.9, 1.15], posicional: true, susto: false },
      { id: "vulpus.p_passaro_3", segundos: 1.1, volume: 0.45, peso: 2.0, tom: [0.9, 1.15], posicional: true, susto: false },
    ],
    pausa: [3, 12],
    pontualACada: [25, 70],
    fade: 4,
  },
  feira: {
    nome: "Feira de minigames",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_sino_feira_1", segundos: 2.4, volume: 0.5, peso: 2.0, tom: [0.95, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_sino_feira_2", segundos: 2.5, volume: 0.5, peso: 2.0, tom: [0.95, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_pop_bolha_1", segundos: 0.3, volume: 0.5, peso: 2.0, tom: [0.85, 1.25], posicional: true, susto: false },
      { id: "vulpus.p_pop_bolha_2", segundos: 0.3, volume: 0.5, peso: 2.0, tom: [0.85, 1.25], posicional: true, susto: false },
      { id: "vulpus.p_ding_suave", segundos: 2.2, volume: 0.5, peso: 1.0, tom: [0.9, 1.2], posicional: true, susto: false },
      { id: "vulpus.p_victory_victory", segundos: 3.9, volume: 0.45, peso: 1.0, tom: [0.95, 1.05], posicional: false, susto: false },
    ],
    pausa: [1, 6],
    pontualACada: [15, 45],
    fade: 3,
  },
  arg_poco: {
    nome: "Poço",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_gota_agua_1", segundos: 0.6, volume: 0.6, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_gota_agua_2", segundos: 0.5, volume: 0.6, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_gota_agua_3", segundos: 0.8, volume: 0.6, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_dark_ambience_ambience_1", segundos: 4.5, volume: 0.5, peso: 2.0, tom: [0.85, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_dark_ambience_ambience_5", segundos: 3.4, volume: 0.5, peso: 2.0, tom: [0.85, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_ghost_breath_ghostbreath", segundos: 3.3, volume: 0.5, peso: 1.0, tom: [0.85, 1.0], posicional: true, susto: false },
    ],
    pausa: [10, 35],
    pontualACada: [18, 55],
    fade: 4,
  },
  arg_lago: {
    nome: "Lago",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_vento_rajada_3", segundos: 6.4, volume: 0.6, peso: 3.0, tom: [0.85, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_vento_rajada_1", segundos: 4.9, volume: 0.5, peso: 2.0, tom: [0.8, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_gota_agua_1", segundos: 0.6, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_gota_agua_3", segundos: 0.8, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_rangido_madeira_1", segundos: 2.1, volume: 0.6, peso: 2.0, tom: [0.85, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_ghost_breath_ghostbreath", segundos: 3.3, volume: 0.4, peso: 1.0, tom: [0.85, 1.0], posicional: true, susto: false },
    ],
    pausa: [8, 25],
    pontualACada: [18, 55],
    fade: 4,
  },
  arg_casa: {
    nome: "Casa dos livros",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_sussurro_curto_1", segundos: 1.9, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_sussurro_curto_2", segundos: 2.5, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_sussurro_curto_3", segundos: 1.9, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_rangido_madeira_1", segundos: 2.1, volume: 0.7, peso: 2.0, tom: [0.85, 1.15], posicional: true, susto: false },
      { id: "vulpus.p_rangido_madeira_2", segundos: 1.7, volume: 0.7, peso: 2.0, tom: [0.85, 1.15], posicional: true, susto: false },
      { id: "vulpus.p_rangido_madeira_3", segundos: 2.6, volume: 0.7, peso: 2.0, tom: [0.85, 1.15], posicional: true, susto: false },
    ],
    pausa: [12, 40],
    pontualACada: [14, 50],
    fade: 4,
  },
  arg_caverna: {
    nome: "Caverna da luz",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_gota_agua_1", segundos: 0.6, volume: 0.8, peso: 3.0, tom: [0.8, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_gota_agua_2", segundos: 0.5, volume: 0.8, peso: 3.0, tom: [0.8, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_gota_agua_3", segundos: 0.8, volume: 0.8, peso: 3.0, tom: [0.8, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_dark_ambience_ambience_1", segundos: 4.5, volume: 0.5, peso: 2.0, tom: [0.8, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_dark_ambience_ambience_4", segundos: 1.4, volume: 0.5, peso: 1.0, tom: [0.8, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_passos_distantes_2", segundos: 3.6, volume: 0.6, peso: 1.0, tom: [0.8, 0.95], posicional: true, susto: false },
    ],
    pausa: [8, 25],
    pontualACada: [16, 50],
    fade: 4,
  },
  arg_corredor: {
    nome: "Corredor 1x1",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_sussurro_curto_1", segundos: 1.9, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_sussurro_curto_2", segundos: 2.5, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_passos_distantes_1", segundos: 3.1, volume: 0.8, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_passos_distantes_2", segundos: 3.6, volume: 0.8, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_lampada_falhando_1", segundos: 2.6, volume: 0.5, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_lampada_falhando_2", segundos: 2.0, volume: 0.5, peso: 3.0, tom: [0.9, 1.1], posicional: true, susto: false },
    ],
    pausa: [6, 20],
    pontualACada: [12, 40],
    fade: 3,
  },
  arg_sala: {
    nome: "Sala branca",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_sino_suave_3", segundos: 7.9, volume: 0.5, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_sino_suave_4", segundos: 8.0, volume: 0.5, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_sino_suave_1", segundos: 6.0, volume: 0.4, peso: 1.0, tom: [0.9, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_sino_suave_2", segundos: 7.5, volume: 0.4, peso: 1.0, tom: [0.9, 1.0], posicional: true, susto: false },
      { id: "vulpus.p_ding_suave", segundos: 2.2, volume: 0.4, peso: 1.0, tom: [0.8, 1.0], posicional: true, susto: false },
    ],
    pausa: [3, 12],
    pontualACada: [25, 80],
    fade: 5,
  },
  arg_trem: {
    nome: "Trem",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_apito_de_trem_distante", segundos: 3.1, volume: 0.6, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_apito_de_trem_distante_2", segundos: 3.9, volume: 0.6, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_apito_de_trem_distante_3", segundos: 2.7, volume: 0.6, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_buzina_dois_toques", segundos: 3.3, volume: 0.6, peso: 1.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_clack_vagao_1", segundos: 2.0, volume: 0.7, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
      { id: "vulpus.p_clack_vagao_2", segundos: 1.7, volume: 0.7, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
    ],
    pausa: [4, 15],
    pontualACada: [18, 60],
    fade: 4,
  },
  arg_campo: {
    nome: "Campo de trigo",
    musicas: [],
    pontuais: [
      { id: "vulpus.p_sino_suave_1", segundos: 6.0, volume: 0.5, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_sino_suave_2", segundos: 7.5, volume: 0.5, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_flauta_distante_1", segundos: 6.5, volume: 0.6, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_flauta_distante_2", segundos: 6.5, volume: 0.6, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_flauta_distante_3", segundos: 6.5, volume: 0.6, peso: 2.0, tom: [0.95, 1.05], posicional: true, susto: false },
      { id: "vulpus.p_vento_rajada_1", segundos: 4.9, volume: 0.5, peso: 2.0, tom: [0.9, 1.1], posicional: true, susto: false },
    ],
    pausa: [4, 14],
    pontualACada: [25, 75],
    fade: 5,
  },
};
