/* ==========================================================================
   VULPUS — comportamento da página
   ========================================================================== */

/* ===================== CONFIGURE AQUI ===================== */
const CONFIG = {
  // Link de convite do Discord (https://discord.gg/...). Troca todos os botões "Entrar no Discord".
  convite: "https://discord.gg/COLE_O_CONVITE_AQUI",

  // Quando o servidor de Minecraft abrir: preencha o endereço e a porta. O passo 04 vira um botão "copiar".
  ip: "",
  porta: "19132",

  // Vídeos: cole o ID do YouTube (a parte depois de v=). Sem "id", aparece "Em breve" sobre a imagem de "poster".
  videos: [
    { titulo: "A Kiza conversando", desc: "Ela entende o contexto, lembra de você e responde como gente.", id: "", poster: "img/kiza-laptop.webp" },
    { titulo: "Figurinhas e álbum", desc: "Abrindo pacotinhos e completando o álbum.", id: "", poster: "img/kiza-presente.webp" },
    { titulo: "Addons no Minecraft", desc: "O menu, as casas e o TPA feitos à mão.", id: "", poster: "img/kiza-mapa.webp" }
  ]
};
/* ========================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const espera = ms => new Promise(r => setTimeout(r, ms));
const ico = (id, cls = "icone") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* ---- convite e endereço do servidor ---- */
$$(".js-convite").forEach(a => (a.href = CONFIG.convite));
if (CONFIG.ip) {
  const enderecoCompleto = CONFIG.ip + ":" + CONFIG.porta;
  const botao = $("#copiarIp");
  $("#ipTexto").textContent = enderecoCompleto;
  $("#estadoServidor").hidden = true;
  botao.classList.add("on");
  botao.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(enderecoCompleto); $("#ipTexto").textContent = "Copiado!"; }
    catch { $("#ipTexto").textContent = enderecoCompleto; }
    setTimeout(() => ($("#ipTexto").textContent = enderecoCompleto), 1600);
  });
}

/* ---- menu e barra fixa (celular) ---- */
const menu = $("#menu"), menuBtn = $("#menuBtn"), barra = $("#barra");
const fecharMenu = () => {
  menu.classList.remove("aberto");
  menuBtn.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-hidden", "true");
  menuBtn.textContent = "☰";
};
menuBtn.addEventListener("click", () => {
  const abrir = !menu.classList.contains("aberto");
  menu.classList.toggle("aberto", abrir);
  menuBtn.setAttribute("aria-expanded", String(abrir));
  menu.setAttribute("aria-hidden", String(!abrir));
  menuBtn.textContent = abrir ? "✕" : "☰";
  atualizarBarra();
});
$$("a", menu).forEach(a => a.addEventListener("click", fecharMenu));
addEventListener("keydown", e => { if (e.key === "Escape") fecharMenu(); });

let ctaFinalVisivel = false;
function atualizarBarra() {
  barra.classList.toggle("on", scrollY > 520 && !ctaFinalVisivel && !menu.classList.contains("aberto"));
}
const ctaFinal = $(".final .btn");
if (ctaFinal && "IntersectionObserver" in window) {
  new IntersectionObserver(es => { ctaFinalVisivel = es[0].isIntersecting; atualizarBarra(); }).observe(ctaFinal);
}

/* ---- progresso de leitura ---- */
const progresso = $("#progresso");
let ticking = false;
function aoRolar() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const total = document.documentElement.scrollHeight - innerHeight;
    progresso.style.transform = `scaleX(${total > 0 ? Math.min(1, scrollY / total) : 0})`;
    atualizarBarra();
    ticking = false;
  });
}
addEventListener("scroll", aoRolar, { passive: true });
aoRolar();

/* ---- revelar ao rolar ---- */
const itensRev = $$(".rev");
if ("IntersectionObserver" in window && !reduzMovimento) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("on", "revelado"); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  itensRev.forEach(el => io.observe(el));
} else {
  itensRev.forEach(el => el.classList.add("on", "revelado"));
}

/* ---- cartas holográficas ---- */
const BASE = { c1: "rotate(-9deg) translateY(16px)", c2: "rotate(-3deg) translateY(-6px)" };
$$(".carta.holo").forEach(carta => {
  const base = BASE[carta.classList.contains("c1") ? "c1" : "c2"];
  let quadro = 0;
  carta.addEventListener("pointermove", e => {
    if (e.pointerType === "touch" || reduzMovimento) return;
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => {
      const r = carta.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      carta.style.setProperty("--mx", `${x * 100}%`);
      carta.style.setProperty("--my", `${y * 100}%`);
      carta.style.transition = "transform .08s linear, filter .5s";
      carta.style.transform = `${base} perspective(900px) rotateX(${(.5 - y) * 16}deg) rotateY(${(x - .5) * 18}deg) scale(1.07)`;
      carta.style.zIndex = 5;
    });
  });
  const soltar = () => {
    cancelAnimationFrame(quadro);
    carta.style.transition = "";
    carta.style.transform = "";
    carta.style.zIndex = "";
  };
  carta.addEventListener("pointerleave", soltar);
  carta.addEventListener("click", () => carta.classList.toggle("ativa")); // toque: liga o brilho
});

/* ---- vagalumes (só no herói, desligados em celular fraco e com movimento reduzido) ---- */
(function vagalumes() {
  const canvas = $("#vagalumes");
  if (!canvas || reduzMovimento || innerWidth < 700 || navigator.connection?.saveData) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  let w = 0, h = 0, rodando = false, visivel = true;
  const N = 16;
  const pts = Array.from({ length: N }, () => ({
    x: Math.random(), y: Math.random() * .8, r: 1.2 + Math.random() * 1.8,
    vx: (Math.random() - .5) * .00005, vy: -.00002 - Math.random() * .00005, f: Math.random() * 6.28, v: .6 + Math.random() * 1.2
  }));
  const medir = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  medir();
  new ResizeObserver(medir).observe(hero);
  let ultimo = performance.now();
  function quadro(t) {
    if (!rodando) return;
    const dt = Math.min(48, t - ultimo); ultimo = t;
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x += p.vx * dt * 6 + Math.sin(t / 1800 + p.f) * .00007 * dt;
      p.y += p.vy * dt * 6;
      if (p.y < -.05) { p.y = .9; p.x = Math.random(); }
      const a = .35 + .65 * Math.abs(Math.sin(t / 1000 * p.v + p.f));
      const x = p.x * w, y = p.y * h, g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4.5);
      g.addColorStop(0, `rgba(255,200,120,${a * .7})`);
      g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, p.r * 4.5, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(quadro);
  }
  const alternar = () => {
    const deve = visivel && !document.hidden;
    if (deve && !rodando) { rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); }
    else if (!deve) rodando = false;
  };
  new IntersectionObserver(es => { visivel = es[0].isIntersecting; alternar(); }).observe(hero);
  document.addEventListener("visibilitychange", alternar);
  alternar();
})();

/* ---- conversa que "acontece" quando entra na tela ---- */
(async function conversa() {
  const janela = $("#conversa");
  if (!janela) return;
  const msgs = $$(".msg", janela), digitando = $("#digitando");
  if (reduzMovimento || !("IntersectionObserver" in window)) { msgs.forEach(m => m.classList.add("on")); return; }
  const visto = await new Promise(resolve => {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); resolve(); } }, { threshold: .35 });
    io.observe(janela);
  });
  void visto;
  const roteiro = [[0, 400], [1, 1100], [2, 1500], [3, 1500]];
  for (const [i, pausa] of roteiro) {
    const ehKiza = i % 2 === 1;
    if (ehKiza) { digitando.classList.add("on"); await espera(pausa); digitando.classList.remove("on"); }
    else await espera(pausa);
    msgs[i].classList.add("on");
  }
})();

/* ---- vídeos ---- */
const lista = $("#listaVideos");
CONFIG.videos.forEach(v => {
  const el = document.createElement("article");
  el.className = "video rev";
  const tela = document.createElement(v.id ? "button" : "div");
  tela.className = "quadro" + (v.id ? "" : " vazio");
  const poster = v.id ? `https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg` : v.poster;
  if (v.id) {
    tela.type = "button";
    tela.setAttribute("aria-label", "Assistir: " + v.titulo);
    tela.innerHTML = `<img class="poster" loading="lazy" alt="" src="${poster}"><span class="play">${ico("i-play")}</span>`;
    tela.addEventListener("click", () => {
      tela.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0" title="${v.titulo.replace(/"/g, "")}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    }, { once: true });
  } else {
    tela.innerHTML = `<img class="poster" loading="lazy" alt="" src="${poster}"><div class="breve">${ico("i-clapper")}Em breve</div>`;
  }
  el.appendChild(tela);
  const h = document.createElement("h3"); h.textContent = v.titulo; el.appendChild(h);
  const p = document.createElement("p"); p.textContent = v.desc; el.appendChild(p);
  lista.appendChild(el);
});
if (!("IntersectionObserver" in window) || reduzMovimento) $$(".video", lista).forEach(el => el.classList.add("on"));
else {
  const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("on"); io2.unobserve(e.target); } }), { threshold: .15 });
  $$(".video", lista).forEach(el => io2.observe(el));
}
