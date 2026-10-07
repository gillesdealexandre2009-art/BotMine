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

/* ---- cartas holográficas: seguem o ponteiro 1:1 e voltam com mola criticamente amortecida ----
   Sempre animam a partir do valor atual (nunca do alvo), então dá para "pegar" a carta no meio do retorno. */
const BASE = { c1: "rotate(-9deg) translateY(16px)", c2: "rotate(-3deg) translateY(-6px)" };
$$(".carta.holo").forEach(carta => {
  const base = BASE[carta.classList.contains("c1") ? "c1" : "c2"];
  const est = { rx: 0, ry: 0, s: 1, vx: 0, vy: 0, vs: 0, alvoX: 0, alvoY: 0, alvoS: 1, rodando: false, ultimo: 0 };
  const K = 380, C = 2 * Math.sqrt(K); // mola com amortecimento 1.0 (sem quique)
  function passo(t) {
    const dt = Math.min(.032, (t - est.ultimo) / 1000 || .016); est.ultimo = t;
    let parado = true;
    for (const [v, vel, alvo] of [["rx", "vx", "alvoX"], ["ry", "vy", "alvoY"], ["s", "vs", "alvoS"]]) {
      const a = -K * (est[v] - est[alvo]) - C * est[vel];
      est[vel] += a * dt; est[v] += est[vel] * dt;
      if (Math.abs(est[v] - est[alvo]) > .002 || Math.abs(est[vel]) > .01) parado = false;
    }
    carta.style.transform = `${base} perspective(900px) rotateX(${est.rx}deg) rotateY(${est.ry}deg) scale(${est.s})`;
    if (parado) { est.rodando = false; carta.style.transform = ""; carta.style.zIndex = ""; return; }
    requestAnimationFrame(passo);
  }
  const acordar = () => { if (!est.rodando) { est.rodando = true; est.ultimo = performance.now(); carta.style.transition = "filter .5s"; requestAnimationFrame(passo); } };
  carta.addEventListener("pointermove", e => {
    if (e.pointerType === "touch" || reduzMovimento) return;
    const r = carta.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    carta.style.setProperty("--mx", `${x * 100}%`);
    carta.style.setProperty("--my", `${y * 100}%`);
    est.alvoX = (.5 - y) * 16; est.alvoY = (x - .5) * 18; est.alvoS = 1.07;
    carta.style.zIndex = 5;
    acordar();
  });
  carta.addEventListener("pointerdown", () => { est.alvoS = 1.03; acordar(); }); // resposta imediata ao toque
  carta.addEventListener("pointerleave", () => { est.alvoX = 0; est.alvoY = 0; est.alvoS = 1; acordar(); });
  carta.addEventListener("click", () => carta.classList.toggle("ativa")); // toque: liga o brilho
});

/* ---- onde estou: realça o link da seção visível ---- */
(function orientacao() {
  const links = $$(".links a");
  const alvos = links.map(a => $(a.getAttribute("href"))).filter(Boolean);
  if (!alvos.length || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle("atual", a.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  alvos.forEach(el => io.observe(el));
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
  tela.className = "quadro escuro" + (v.id ? "" : " vazio");
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
