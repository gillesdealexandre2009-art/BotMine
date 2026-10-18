// @ts-check
// GERADO por addon/tools/gerar_nevoas.py: não edite à mão. Névoas do resource pack (vulpus_rp/fogs).

/** @type {readonly { id: string, nome: string, ajuda: string }[]} */
export const NEVOAS = [
  { id: "trigo", nome: "Trigo (dourada, bem fechada)", ajuda: "Branco-dourada. Some com paredes e teto a mais de uns 13 blocos." },
  { id: "branca", nome: "Branca (muito fechada)", ajuda: "Branco puro; a sala branca sem fim." },
  { id: "densa", nome: "Densa (quase cega)", ajuda: "Só se vê a poucos blocos; esconde até paredes próximas." },
  { id: "azul", nome: "Azulada (sonho frio)", ajuda: "Azul-acinzentada, como um sonho gelado." },
  { id: "vermelha", nome: "Vermelha (opressiva)", ajuda: "Vermelho escuro, pesada." },
  { id: "negra", nome: "Negra (escuridão)", ajuda: "O escuro engole tudo depois de 7 blocos." },
  { id: "leve", nome: "Leve (só um véu)", ajuda: "Um véu discreto, sem esconder as construções." },
  { id: "pessego", nome: "Pêssego (quente, memória)", ajuda: "Pêssego quente, memória antiga." },
  { id: "lilas", nome: "Lilás (sonho suave)", ajuda: "Lilás suave de sonho." },
  { id: "creme", nome: "Creme (fim de tarde)", ajuda: "Creme claro, luz de fim de tarde." },
  { id: "rosa", nome: "Rosa-bebê (doce)", ajuda: "Rosa-bebê." },
  { id: "ceu", nome: "Céu (azul claro, nuvem)", ajuda: "Céu azul claro, nuvem." },
  { id: "nevoeiro", nome: "Neblina branca (dreamcore)", ajuda: "Branco-perolado suave: o lugar some devagar ao longe, como num sonho." },
];

/** @param {string} id */
export const nevoaValida = (id) => NEVOAS.some((n) => n.id === id);
