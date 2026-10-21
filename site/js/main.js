/* ==========================================================================
   VULPUS — comportamento da página
   ========================================================================== */

/* ===================== CONFIGURE AQUI ===================== */
const CONFIG = {
  // Link de convite do Discord (https://discord.gg/...). Troca todos os botões "Entrar no Discord".
  convite: "https://discord.com/invite/KrsuH6PJCc",

  // Endereço do servidor. Preenchido, o passo 2 ganha um botão "copiar". Vazio, o site manda olhar o canal ip-e-porta.
  ip: "",
  porta: "19132",

  // URL base da API do bot (sem / no final). Vazio = painel ao vivo desligado.
  api: "",

  // Vídeos: cole o ID do YouTube (a parte depois de v=). A seção só aparece quando houver pelo menos um ID.
  videos: [
    { titulo: "A Kiza conversando", desc: "Contexto, memória e respostas naturais.", id: "", poster: "img/kiza-laptop.webp" },
    { titulo: "Figurinhas e álbum", desc: "Pacote diário e coleção.", id: "", poster: "img/kiza-presente.webp" },
    { titulo: "Addons no Minecraft", desc: "Menu, casas e TPA feitos à mão.", id: "", poster: "img/kiza-mapa.webp" }
  ]
};
/* ========================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
const toque = matchMedia("(hover: none)").matches;
const espera = ms => new Promise(r => setTimeout(r, ms));
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const SVG = "http://www.w3.org/2000/svg";

/* ---------------------------------------------------------------- convite e endereço */
$$(".js-convite").forEach(a => (a.href = CONFIG.convite));
if (CONFIG.ip) {
  const endereco = CONFIG.ip + ":" + CONFIG.porta;
  const botao = $("#copiarIp"), texto = $("#ipTexto");
  texto.textContent = endereco;
  botao.hidden = false;
  botao.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(endereco); texto.textContent = "Copiado!"; } catch { /* sem permissão: mantém o texto */ }
    setTimeout(() => (texto.textContent = endereco), 1600);
  });
}

/* ---------------------------------------------------------------- topo e menu */
const topo = $("#topo"), menu = $("#menu"), menuBtn = $("#menuBtn");
const alternarMenu = abrir => {
  menu.classList.toggle("aberto", abrir);
  menuBtn.setAttribute("aria-expanded", String(abrir));
  menuBtn.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
  menu.setAttribute("aria-hidden", String(!abrir));
};
menuBtn.addEventListener("click", () => alternarMenu(!menu.classList.contains("aberto")));
$$("a", menu).forEach(a => a.addEventListener("click", () => alternarMenu(false)));
addEventListener("keydown", e => { if (e.key === "Escape") alternarMenu(false); });

/* ---------------------------------------------------------------- revelar ao rolar */
const revelar = el => el.classList.add("on");
const observarRev = el => {
  if (calmo || !("IntersectionObserver" in window)) return revelar(el);
  ioRev.observe(el);
};
const ioRev = "IntersectionObserver" in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { revelar(e.target); ioRev.unobserve(e.target); } }), { threshold: .14 })
  : null;
$$(".rev").forEach(observarRev);

/* ---------------------------------------------------------------- 1 · fogo de raposa (kitsunebi) */
(() => {
  const hero = $("#inicio"), canvas = $("#fogo"), ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, rodando = false, visivel = true;
  const mouse = { x: -999, y: -999 };

  // brilho pré-desenhado (desenhar gradiente por partícula a cada quadro sai caro)
  const sprite = (cor, nucleo) => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, nucleo); r.addColorStop(.18, cor); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
  };
  const brasa = sprite("rgba(255,140,50,.55)", "rgba(255,240,220,1)");
  const azul = sprite("rgba(140,165,255,.5)", "rgba(235,240,255,1)");

  let estrelas = [], chamas = [];
  const novaChama = (inicio = false) => ({
    x: Math.random() * w,
    y: inicio ? Math.random() * h : h * (.75 + Math.random() * .3),
    r: 4 + Math.random() * 10,
    vy: .12 + Math.random() * .38,
    fase: Math.random() * Math.PI * 2,
    balanco: .3 + Math.random() * .8,
    vida: 0,
    duracao: 600 + Math.random() * 700,
    img: Math.random() < .8 ? brasa : azul,
    dx: 0
  });
  const medir = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const nEstrelas = Math.round(w * h / 9000);
    estrelas = Array.from({ length: nEstrelas }, () => ({ x: Math.random() * w, y: Math.random() * h * .7, r: Math.random() * 1.1 + .2, f: Math.random() * Math.PI * 2, v: .5 + Math.random() * 1.5 }));
    chamas = Array.from({ length: Math.round(Math.min(46, w / 32)) }, () => novaChama(true));
  };
  const quadro = t => {
    ctx.clearRect(0, 0, w, h);
    for (const s of estrelas) {
      ctx.globalAlpha = .25 + .55 * (calmo ? .6 : (Math.sin(t / 1000 * s.v + s.f) * .5 + .5));
      ctx.fillStyle = "#dfe4ff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    if (!calmo) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < chamas.length; i++) {
        const c = chamas[i];
        c.vida++;
        c.y -= c.vy;
        c.fase += .012;
        const ddx = c.x - mouse.x, ddy = c.y - mouse.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < 14000) c.dx += ddx / Math.sqrt(d2 + 1) * .25;
        c.dx *= .95;
        c.x += Math.sin(c.fase) * c.balanco * .35 + c.dx;
        const p = c.vida / c.duracao;
        const alfa = p < .15 ? p / .15 : p > .7 ? (1 - p) / .3 : 1;
        const tremor = .75 + Math.sin(t / 90 + c.fase * 7) * .25;
        ctx.globalAlpha = Math.max(0, alfa * tremor * .9);
        const s = c.r * 2.4;
        ctx.drawImage(c.img, c.x - s, c.y - s, s * 2, s * 2);
        if (p >= 1 || c.y < -20) chamas[i] = novaChama();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = 1;
  };
  const laco = t => { if (!rodando) return; quadro(t); requestAnimationFrame(laco); };
  const ligar = () => { if (rodando || calmo || !visivel || document.hidden) return; rodando = true; requestAnimationFrame(laco); };
  const desligar = () => (rodando = false);

  medir();
  if (calmo) quadro(0); else ligar();
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { medir(); if (calmo) quadro(0); }, 150); });
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; visivel ? ligar() : desligar(); }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? desligar() : ligar()));
  hero.addEventListener("pointermove", e => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });

  // profundidade: a arte reage ao mouse e desce mais devagar que a página
  const arte = $("#heroArte img");
  let alvoX = 0, alvoY = 0, atualX = 0, atualY = 0;
  if (!calmo && !toque) hero.addEventListener("pointermove", e => { alvoX = (e.clientX / innerWidth - .5); alvoY = (e.clientY / innerHeight - .5); });
  const paralaxe = () => {
    atualX += (alvoX - atualX) * .06; atualY += (alvoY - atualY) * .06;
    const desce = Math.min(scrollY, innerHeight) * .18;
    arte.style.transform = `translate3d(${atualX * -18}px, ${atualY * -12 + desce}px, 0) scale(1.08)`;
    if (visivel) requestAnimationFrame(paralaxe); else requestAnimationFrame(() => setTimeout(paralaxe, 200));
  };
  if (!calmo) requestAnimationFrame(paralaxe);
})();

/* ---------------------------------------------------------------- 2 · a lenda: um capítulo por vez, como um livro */
(() => {
  const livro = $("#livro"), imgs = $$("#arco img"), caps = $$(".capitulo"), marcas = $$("#marcas button");
  const ant = $("#capAnt"), prox = $("#capProx"), proxTxt = $("span", prox);
  let atual = 0;
  const ir = i => {
    i = (i + caps.length) % caps.length;
    caps.forEach((c, j) => {
      c.classList.toggle("ativo", j === i);
      c.classList.toggle("antes", j < i);
      c.setAttribute("aria-hidden", String(j !== i));
    });
    imgs.forEach((im, j) => im.classList.toggle("on", j === i));
    marcas.forEach((m, j) => {
      m.classList.toggle("lida", j < i);
      if (j === i) m.setAttribute("aria-current", "true"); else m.removeAttribute("aria-current");
    });
    ant.disabled = i === 0;
    proxTxt.textContent = i === caps.length - 1 ? "Ler de novo" : "Próximo capítulo";
    atual = i;
  };
  prox.addEventListener("click", () => ir(atual + 1));
  ant.addEventListener("click", () => ir(atual - 1));
  marcas.forEach(m => m.addEventListener("click", () => ir(+m.dataset.cap)));
  livro.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") ir(Math.min(atual + 1, caps.length - 1));
    if (e.key === "ArrowLeft") ir(Math.max(atual - 1, 0));
  });
  // arrastar para o lado no celular
  let x0 = null;
  livro.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") x0 = e.clientX; });
  livro.addEventListener("pointerup", e => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) ir(dx < 0 ? Math.min(atual + 1, caps.length - 1) : Math.max(atual - 1, 0));
  });
  livro.addEventListener("pointercancel", () => (x0 = null));
  ir(0);
})();

/* ---------------------------------------------------------------- 3 · manifesto que acende palavra por palavra */
(() => {
  const el = $("#manifestoTexto"), secao = $("#principio");
  const chaves = new Set(["vantagem.", "Cauda", "vitória."]);
  const palavras = el.textContent.trim().split(/\s+/);
  el.innerHTML = palavras.map(p => `<span class="p${chaves.has(p) ? " chave" : ""}">${p}</span>`).join(" ");
  const spans = $$(".p", el);
  if (calmo) return spans.forEach(revelar);
  let pendente = false;
  const atualizar = () => {
    pendente = false;
    const r = secao.getBoundingClientRect();
    const p = limita((innerHeight * .78 - r.top) / (r.height * .42));
    const n = Math.round(p * spans.length);
    spans.forEach((s, i) => s.classList.toggle("on", i < n));
  };
  addEventListener("scroll", () => { if (!pendente) { pendente = true; requestAnimationFrame(atualizar); } }, { passive: true });
  atualizar();
})();

/* ---------------------------------------------------------------- leque das nove caudas (progresso) */
(() => {
  const secoes = $$(".secao"), svg = $("#lequeSvg"), leque = $("#leque"), aviso = $("#avisoCaudas");
  const nEl = $("#lequeN"), nomeEl = $("#lequeNome");
  const D = "M0 0C-8-14-12-36-6-56C-3-66 3-74 9-76C5-66 8-54 9-42C10-24 6-10 0 0Z";
  const caudas = secoes.map((s, i) => {
    const a = document.createElementNS(SVG, "a");
    a.setAttribute("href", "#" + s.id);
    a.setAttribute("aria-label", `Cauda ${i + 1}: ${s.dataset.nome}`);
    const t = document.createElementNS(SVG, "title"); t.textContent = s.dataset.nome; a.appendChild(t);
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("transform", `translate(80 94) rotate(${-64 + i * 16})`);
    const p = document.createElementNS(SVG, "path"); p.setAttribute("d", D);
    g.appendChild(p); a.appendChild(g); svg.appendChild(a);
    return a;
  });
  const links = $$(".links a");
  let max = 0, avisou = false;
  const marcar = i => {
    max = Math.max(max, i);
    caudas.forEach((c, j) => { c.classList.toggle("acesa", j <= max); c.classList.toggle("atual", j === i); });
    nEl.textContent = max + 1;
    nomeEl.textContent = secoes[i].dataset.nome;
    links.forEach(a => a.classList.toggle("ativo", a.getAttribute("href") === "#" + secoes[i].id));
    if (max === secoes.length - 1 && !avisou) {
      avisou = true;
      aviso.classList.add("on");
      setTimeout(() => aviso.classList.remove("on"), 5200);
    }
  };
  marcar(0);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) marcar(secoes.indexOf(e.target)); }), { rootMargin: "-48% 0px -50% 0px" });
    secoes.forEach(s => io.observe(s));
  }
  const aoRolar = () => {
    topo.classList.toggle("solido", scrollY > 40);
    leque.classList.toggle("on", scrollY > innerHeight * .35);
    // no fim da página a última seção pode nunca cruzar o meio da tela
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) marcar(secoes.length - 1);
  };
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();
})();

/* ---------------------------------------------------------------- 4 · a toca: drop de Caudas e brilho que segue o mouse */
(() => {
  const botao = $("#pegar");
  botao.addEventListener("click", () => {
    if (botao.classList.contains("pego")) return;
    botao.classList.add("pego");
    botao.textContent = "Você pegou!";
    const mais = document.createElement("span");
    mais.className = "mais-caudas"; mais.textContent = "+74 Caudas";
    botao.parentElement.appendChild(mais);
    setTimeout(() => mais.remove(), 1500);
  });
  if (!toque) $$(".peca").forEach(p => p.addEventListener("pointermove", e => {
    const r = p.getBoundingClientRect();
    p.style.setProperty("--mx", e.clientX - r.left + "px");
    p.style.setProperty("--my", e.clientY - r.top + "px");
  }));
})();

/* ---------------------------------------------------------------- 5 · Kiza: humores e conversa */
(() => {
  const retrato = $("#retrato"), humorNome = $("#humorNome"), botoes = $$(".humores button");
  const nomes = { normal: "normal", feliz: "feliz", piscando: "piscando", surpresa: "surpresa", envergonhada: "envergonhada", lado: "desconfiada", bravo: "brava", triste: "triste" };
  const humor = h => {
    retrato.style.opacity = 0;
    setTimeout(() => { retrato.src = `img/humor-${h}.webp`; retrato.alt = `Rosto da Kiza: ${nomes[h]}`; retrato.style.opacity = 1; }, 140);
    humorNome.textContent = nomes[h];
    botoes.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.h === h)));
  };
  botoes.forEach(b => b.addEventListener("click", () => humor(b.dataset.h)));

  const roteiro = [
    { p: "onde acho axolote?", h: "piscando", r: ["nas cavernas exuberantes. procura uma árvore de azaleia na superfície, a caverna costuma estar logo embaixo", "leva um balde de água. é com ele que você pega"] },
    { p: "lembra do meu gato?", h: "feliz", r: ["o pipoca! ele ainda derruba tudo da mesa ou finalmente tomou jeito?"] },
    { p: "desenha você olhando as estrelas", h: "feliz", r: ["toma, rabisquei rapidinho"], img: true },
    { p: "você é uma IA?", h: "lado", r: ["sou a kiza, o bot-mascote da toca. então sim, mas com opinião própria", "e não vou fingir que sou gente de carne e osso. tenho uma cauda só, mas tenho ética"] },
    { p: "qual sua cor favorita?", h: "envergonhada", r: ["roxo. aquela cor do céu logo depois que o sol vai embora"] }
  ];
  const msgs = $("#chatMsgs"), digitando = $("#digitando"), chips = $$("#chips button");
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const adicionar = html => { const d = document.createElement("div"); d.className = "cm"; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; };
  let ocupada = false;
  chips.forEach(b => b.addEventListener("click", async () => {
    if (ocupada) return;
    ocupada = true; chips.forEach(c => (c.disabled = true));
    const item = roteiro[+b.dataset.p];
    adicionar(`<div class="av">V</div><div><b>você</b><p>${esc(item.p)}</p></div>`);
    for (let i = 0; i < item.r.length; i++) {
      await espera(calmo ? 100 : 450);
      digitando.classList.add("on"); msgs.scrollTop = msgs.scrollHeight;
      await espera(calmo ? 100 : Math.min(2200, 700 + item.r[i].length * 16));
      digitando.classList.remove("on");
      const extra = item.img && i === item.r.length - 1 ? `<img class="rabisco" src="img/rabisco.webp" width="800" height="600" alt="Rabisco da Kiza: ela sentada num morro, olhando as estrelas">` : "";
      adicionar(`<div class="av av-k"><img src="img/humor-${item.h}.webp" width="40" height="40" alt=""></div><div><b class="k">Kiza <span class="tag">APP</span></b><p>${esc(item.r[i])}</p>${extra}</div>`);
      if (i === 0) humor(item.h);
    }
    b.remove();
    ocupada = false; $$("#chips button").forEach(c => (c.disabled = false));
    if (!$("#chips button")) $(".chat-perguntas > p").textContent = "Ela tem mais a dizer no Discord";
  }));
})();

/* ---------------------------------------------------------------- 6 e 7 · figurinhas e cartão com inclinação holográfica */
if (!toque && !calmo) $$(".tilt").forEach(el => {
  el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", (x - .5) * 22 + "deg");
    el.style.setProperty("--rx", (.5 - y) * 18 + "deg");
    el.style.setProperty("--mx", x * 100 + "%");
    el.style.setProperty("--my", y * 100 + "%");
    el.style.setProperty("--bx", 100 - x * 100 + "%");
    el.style.setProperty("--by", 100 - y * 100 + "%");
  });
  el.addEventListener("pointerleave", () => ["--ry", "--rx", "--mx", "--my", "--bx", "--by"].forEach(v => el.style.removeProperty(v)));
});

/* ---------------------------------------------------------------- vídeos (opcional) */
(() => {
  const comId = CONFIG.videos.filter(v => v.id);
  if (!comId.length) return;
  $("#videos").hidden = false;
  const lista = $("#listaVideos");
  comId.forEach((v, i) => {
    const el = document.createElement("article");
    el.className = "video rev"; el.style.setProperty("--i", i);
    const tela = document.createElement("button");
    tela.type = "button"; tela.className = "quadro";
    tela.setAttribute("aria-label", "Assistir: " + v.titulo);
    tela.innerHTML = `<img loading="lazy" alt="" src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg"><span class="play"><i></i></span>`;
    tela.addEventListener("click", () => {
      tela.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0" title="${v.titulo.replace(/"/g, "")}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }, { once: true });
    const h = document.createElement("h3"); h.textContent = v.titulo;
    const p = document.createElement("p"); p.textContent = v.desc;
    el.append(tela, h, p); lista.appendChild(el); observarRev(el);
  });
})();

/* ===================== PAINEL AO VIVO (API do bot) ===================== */
(function painelVivo() {
  // >>> SIMULAÇÃO: dados fake para preview (remover quando a API estiver no ar) <<<
  const FAKE = {
    ok: true,
    servidor: { online: true, jogando: 7, max: 10, nicks: ["KizaMisuchi", "LuzDoLuar", "RaposaNinja", "WolfBlaze", "LunaFox", "SkyBlock99", "NixCraft"] },
    enderecos: [{ nome: "principal", host: "plus-01.bedhosting.com.br", porta: 27151 }],
    clas: { ativos: 4, guerras: 2, top: [
      { tag: "ANB", nome: "Anúbis", membros: 8, nivel: 5 },
      { tag: "SOL", nome: "Solar", membros: 5, nivel: 3 },
      { tag: "LUA", nome: "Lua Cheia", membros: 4, nivel: 2 },
      { tag: "FOX", nome: "Raposas", membros: 3, nivel: 1 },
    ]},
    ranking_tempo: [
      { nome: "KizaMisuchi", horas: 127.3 },
      { nome: "LuzDoLuar", horas: 98.5 },
      { nome: "RaposaNinja", horas: 74.2 },
      { nome: "WolfBlaze", horas: 61.0 },
      { nome: "LunaFox", horas: 45.8 },
    ],
    ranking_nivel: [
      { nome: "KizaMisuchi", nivel: 18, rank: "Kitsune" },
      { nome: "LuzDoLuar", nivel: 15, rank: "Raposa Lunar" },
      { nome: "RaposaNinja", nivel: 12, rank: "Raposa Andarilha" },
      { nome: "WolfBlaze", nivel: 8, rank: "Raposão" },
      { nome: "LunaFox", nivel: 5, rank: "Raposinha" },
    ],
    atualizado: Date.now() / 1000 | 0,
  };
  const SIMULAR = !CONFIG.api;
  if (!CONFIG.api && !SIMULAR) return;
  const painel = $("#painelVivo");
  const elJogando = $("#pvJogando");
  const elNicks = $("#pvNicks");
  const elClas = $("#pvClas");
  const elClasN = $("#pvClasN");
  const elGuerras = $("#pvGuerras");
  const elGuerrasN = $("#pvGuerrasN");
  const colClas = $("#pvColClas");
  const clLista = $("#pvClasLista");
  const colTop = $("#pvColTop");
  const topLista = $("#pvTopLista");
  const tabs = $("#placarTabs");
  const lista = $("#placarLista");
  const vazio = $("#placarVazio");
  if (!painel) return;

  let dados = null;
  let abaAtual = "horas";

  function texto(el, t) { el.textContent = t; }

  function renderPainel(d) {
    const sv = d.servidor;
    texto(elJogando, sv.jogando);
    // nicks online
    elNicks.innerHTML = "";
    (sv.nicks || []).forEach(n => {
      const s = document.createElement("span");
      s.textContent = n;
      elNicks.appendChild(s);
    });
    // clãs no cabeçalho + coluna
    if (d.clas && d.clas.top) {
      elClas.hidden = false;
      texto(elClasN, d.clas.ativos);
      if (d.clas.guerras > 0) {
        elGuerras.hidden = false;
        texto(elGuerrasN, d.clas.guerras);
      }
      colClas.hidden = false;
      clLista.innerHTML = "";
      d.clas.top.slice(0, 4).forEach(c => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="pv-cla-tag"></span><span class="pv-cla-nome"></span><span class="pv-cla-mbr"></span>`;
        li.querySelector(".pv-cla-tag").textContent = c.tag;
        li.querySelector(".pv-cla-nome").textContent = c.nome;
        li.querySelector(".pv-cla-mbr").textContent = c.membros + " mbr";
        clLista.appendChild(li);
      });
    }
    // top horas coluna
    if (d.ranking_tempo && d.ranking_tempo.length) {
      colTop.hidden = false;
      topLista.innerHTML = "";
      d.ranking_tempo.slice(0, 4).forEach(r => {
        const li = document.createElement("li");
        li.innerHTML = `<span></span><span class="pv-top-h"></span>`;
        li.querySelector("span").textContent = r.nome;
        li.querySelector(".pv-top-h").textContent = r.horas + " h";
        topLista.appendChild(li);
      });
    }
    painel.hidden = false;
    // IP do servidor (usa o primeiro endereço)
    if (d.enderecos && d.enderecos.length && !CONFIG.ip) {
      CONFIG.ip = d.enderecos[0].host;
      CONFIG.porta = String(d.enderecos[0].porta);
      const copiar = $("#copiarIp");
      if (copiar) copiar.hidden = false;
    }
  }

  function renderPlacar() {
    lista.innerHTML = "";
    vazio.hidden = true;
    if (!dados) { vazio.hidden = false; return; }
    let items = [];
    if (abaAtual === "horas" && dados.ranking_tempo) {
      items = dados.ranking_tempo.map((r, i) => ({ pos: i + 1, nome: r.nome, valor: r.horas + " h" }));
    } else if (abaAtual === "nivel" && dados.ranking_nivel) {
      items = dados.ranking_nivel.map((r, i) => ({ pos: i + 1, nome: r.nome, valor: "Nv " + r.nivel }));
    } else if (abaAtual === "clas" && dados.clas && dados.clas.top) {
      items = dados.clas.top.map((c, i) => ({ pos: i + 1, nome: "[" + c.tag + "] " + c.nome, valor: c.membros + " mbr" }));
    }
    if (!items.length) { vazio.hidden = false; return; }
    const max = items[0] ? 100 : 1;
    items.forEach(it => {
      const pct = items[0] ? Math.round(
        (abaAtual === "horas" ? parseFloat(it.valor) / parseFloat(items[0].valor) :
         abaAtual === "nivel" ? parseInt(it.valor.replace("Nv ", "")) / parseInt(items[0].valor.replace("Nv ", "")) :
         parseInt(it.valor) / parseInt(items[0].valor)) * 100
      ) : 100;
      const li = document.createElement("li");
      li.innerHTML = `<span>${it.pos}</span><b></b><i style="--v:${pct}%"></i><em></em>`;
      li.querySelector("b").textContent = it.nome;
      li.querySelector("em").textContent = it.valor;
      lista.appendChild(li);
    });
  }

  if (tabs) {
    tabs.addEventListener("click", e => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      abaAtual = btn.dataset.tab;
      $$("button", tabs).forEach(b => b.classList.toggle("ativo", b === btn));
      renderPlacar();
    });
  }

  async function buscar() {
    try {
      if (SIMULAR) { dados = FAKE; renderPainel(dados); renderPlacar(); return; }
      const r = await fetch(CONFIG.api + "/site/resumo");
      if (!r.ok) return;
      dados = await r.json();
      if (!dados.ok) return;
      renderPainel(dados);
      renderPlacar();
    } catch { /* silencioso: o painel simplesmente não aparece */ }
  }

  buscar();
  // poll a cada 60 s enquanto a aba estiver visível
  setInterval(() => { if (!document.hidden) buscar(); }, 60_000);
})();
