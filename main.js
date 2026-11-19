gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const TRI = '<svg aria-hidden="true"><use href="#tri"/></svg>';

const isHome = !!$('#hero');
if (isHome) document.body.classList.add('is-loading');

/* ---------- Scroll suau ---------- */
let lenis = null;
if (!reduce && window.Lenis) {
  lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (isHome) lenis.stop();
  window.lenis = lenis;
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { duration: 1.6 }); else target.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------- Loader ---------- */
function runLoader() {
  const num = $('#loaderNum'), bar = $('#loaderBar'), label = $('#loaderLabel');
  const labels = ['Posant-nos magnesi', 'Cordant els gats', 'Revisant les preses', 'Escalfant dits'];
  const counter = { v: 0 };
  const ready = Promise.race([
    Promise.all([document.fonts.load('900 100px Outfit'), new Promise((r) => {
      const v = $('.hero__video');
      if (v.readyState >= 3) r(); else v.addEventListener('canplay', r, { once: true });
    })]),
    new Promise((r) => setTimeout(r, 3500)),
  ]);
  const count = gsap.to(counter, {
    v: 100, duration: reduce ? 0.2 : 1.7, ease: 'power2.inOut',
    onUpdate: () => {
      num.textContent = String(Math.round(counter.v)).padStart(3, '0');
      bar.style.width = counter.v + '%';
      label.textContent = labels[Math.min(labels.length - 1, Math.floor(counter.v / 26))];
    },
  });
  Promise.all([ready, count.then()]).then(() => {
    layoutHero();
    ScrollTrigger.refresh();
    gsap.timeline({
      onComplete: () => {
        $('#loader').remove();
        document.body.classList.remove('is-loading');
        lenis && lenis.start();
        const h = location.hash && $(location.hash);
        if (h) { if (lenis) lenis.scrollTo(h, { immediate: true, offset: innerWidth < 820 ? -70 : 0 }); else h.scrollIntoView(); }
      },
    })
      .to('#loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' })
      .from(heroZoom, { s: 0.55, duration: 1.4, ease: 'expo.out', onUpdate: applyZoom }, '-=.55')
      .from('.nav > *', { y: -30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, '-=1.1')
      .from('.hero__top > *', { y: 20, opacity: 0, stagger: 0.1, duration: 0.8 }, '-=.9');
  });
}

/* ---------- Hero: vídeo dins de "pati" ---------- */
const svg = $('#heroSvg'), text = $('#heroText'), letters = $('#heroLetters');
const heroZoom = { s: 1, cx: 0, cy: 0 };

function layoutHero() {
  const w = svg.clientWidth, h = svg.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  ['#maskBg', '#heroCover'].forEach((s) => {
    const r = $(s);
    r.setAttribute('x', -20); r.setAttribute('y', -20);
    r.setAttribute('width', w + 40); r.setAttribute('height', h + 40);
  });
  letters.removeAttribute('transform'); // mesura sense el zoom aplicat
  text.setAttribute('font-size', 100);
  text.setAttribute('x', w / 2);
  text.setAttribute('y', 0);
  const len = text.getComputedTextLength();
  const fs = Math.min((w * 0.92) / len * 100, h * 0.78);
  text.setAttribute('font-size', fs);
  const baseline = h * 0.5 + fs * 0.2;
  text.setAttribute('y', baseline);

  // punt de zoom: al mig del pal de la "i"
  const ext = text.getExtentOfChar(3);
  heroZoom.cx = ext.x + ext.width * 0.5;
  heroZoom.cy = baseline - fs * 0.2;
  applyZoom();
}
function applyZoom() {
  const { s, cx, cy } = heroZoom;
  letters.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
}

if (isHome) gsap.timeline({
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
})
  .to(heroZoom, { s: 34, duration: 1, ease: 'power3.in', onUpdate: applyZoom })
  .to('#heroCover', { opacity: 0, duration: 0.22, ease: 'none', onUpdate() { svg.style.visibility = this.progress() >= 1 ? 'hidden' : 'visible'; } }, 0.66)
  .to('.hero__top', { opacity: 0, duration: 0.2 }, 0)
  .to('.hero__shade', { opacity: 1, duration: 0.3 }, 0.9)
  .to('.hero__claim .line > span', { y: 0, stagger: 0.12, duration: 0.45, ease: 'power3.out' }, 1.05)
  .to('.hero__video', { scale: 1.08, duration: 1.2 }, 0.9)
  .to({}, { duration: 0.35 });

/* ---------- Manifest paraula a paraula ---------- */
(function () {
  const p = $('#manifest'); if (!p) return;
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w.trim()) { frag.append(w); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
  };
  wrap(p);
  gsap.to($$('.w', p), {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: p, start: 'top 75%', end: 'bottom 45%', scrub: true },
  });
})();

/* ---------- Paret 3D ---------- */
(function () {
  if (!$('#paret')) return;
  const wall = window.PatiWall;
  const callouts = $$('.callout');
  const step = $('#wallStep');
  const thresholds = { panel: 0.26, volume: 0.44, holds: 0.66, top: 0.84 };
  const offsets = { panel: [26, 40], volume: [30, -40], holds: [-24, -70], top: [28, -60] };
  let prog = 0;

  ScrollTrigger.create({
    trigger: '#paret', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => { prog = st.progress; wall && wall.setProgress(prog); },
    onToggle: (st) => wall && wall.setVisible(st.isActive || Math.abs(st.progress - 0.5) < 0.6),
  });
  gsap.fromTo('.wall__bgword', { xPercent: -36 }, {
    xPercent: -64, ease: 'none',
    scrollTrigger: { trigger: '#paret', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  let label = '';
  gsap.ticker.add(() => {
    if (!wall) return;
    const mobile = innerWidth < 820;
    callouts.forEach((c) => {
      const name = c.dataset.anchor;
      const on = prog > thresholds[name] && prog < 0.98;
      const pt = wall.project(name);
      const [ox, oy] = offsets[name];
      let x = pt.x + (mobile ? ox * 0.4 : ox);
      if (ox < 0 || x + c.offsetWidth > innerWidth - 16) x = pt.x - c.offsetWidth - 24;
      gsap.set(c, { x: Math.min(Math.max(16, x), innerWidth - c.offsetWidth - 16), y: pt.y + oy - c.offsetHeight / 2 });
      if (on !== c._on) { c._on = on; gsap.to(c, { opacity: on ? 1 : 0, scale: on ? 1 : 0.8, duration: 0.35, ease: 'back.out(2)' }); }
    });
    const next = prog < 0.34 ? 'Paret buida' : prog < 0.5 ? 'Volums' : prog < 0.8 ? 'Setting' : 'Bloc obert ✓';
    if (next !== label) {
      label = next;
      gsap.fromTo(step, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out', onStart: () => { step.textContent = next; } });
    }
  });
})();

/* ---------- Comptador d'anys ---------- */
(function () {
  const out = $('#yearsNum'), foot = $('#yearsFoot'); if (!out) return;
  const notes = [
    [2016, 'El primer pati, al Passatge de la Mercè de Manresa.'],
    [2024, 'Obrim el patiGran al Camí del Grau de Sant Fruitós.'],
    [2026, 'Deu anys, celebrats amb exposició i documental. I sala de bloc nova.'],
  ];
  let last = -1;
  ScrollTrigger.create({
    trigger: '#anys', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = clamp01(st.progress / 0.78);
      const y = Math.round(2016 + 10 * (1 - Math.pow(1 - p, 1.6)));
      out.textContent = y;
      out.classList.toggle('is-done', y === 2026);
      const n = notes.filter(([yy]) => y >= yy).pop();
      if (n && n[0] !== last) {
        last = n[0];
        gsap.fromTo(foot, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, onStart: () => { foot.textContent = n[1]; } });
      }
    },
  });
  gsap.from('.years__num', {
    scale: 0.7, ease: 'none',
    scrollTrigger: { trigger: '#anys', start: 'top bottom', end: 'top top', scrub: true },
  });
})();

/* ---------- Activitats en horitzontal ---------- */
(function () {
  const track = $('#track'); if (!track) return;
  const dist = () => track.scrollWidth - innerWidth;
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.acts__pin', start: 'top top', end: () => '+=' + dist() * 0.7,
      pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
    },
  });
  gsap.to('.acts__intro', {
    opacity: 0, x: -80, ease: 'none',
    scrollTrigger: { trigger: '.acts__pin', start: 'top top', end: () => '+=' + innerWidth * 0.5, scrub: true },
  });
})();

/* ---------- Els dos patis ---------- */
gsap.from('.gym', {
  y: 120, opacity: 0, stagger: 0.15, duration: 1.1, ease: 'power3.out',
  scrollTrigger: { trigger: '.gyms__grid', start: 'top 85%' },
});
$$('.gym__img img, .gym__img video').forEach((img) => gsap.fromTo(img, { yPercent: -10 }, {
  yPercent: 6, ease: 'none',
  scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true },
}));

/* ---------- Tarifes (dades de les taules oficials del Pati) ---------- */
(function () {
  // [nom, detall, adults, infants, multicentre adults, multicentre infants]
  const DATA = {
    gran: [
      ['Entrada de dia', 'Un dia, tot el dia', 12, 9],
      ['Quota mensual', 'La més triada', 50, 42, 55, 47],
      ['Pack 10', '10 sessions sense caducitat', 98, 73],
      ['Quota semestral', 'Sis mesos', 268, 222, 298, 252],
      ['Quota anual', 'Tot l\'any', 515, 434, 565, 484],
      ['Abonament mes', 'Sense matrícula · per a no residents', 62, 53],
    ],
    xic: [
      ['Entrada de dia', 'Un dia, tot el dia', 10, 7],
      ['Quota mensual', 'La més triada', 40, 33, 53, 45],
      ['Pack 10', '10 sessions sense caducitat', 80, 60],
      ['Quota semestral', 'Sis mesos', 210, 180],
      ['Quota anual', 'Tot l\'any', 400, 330],
      ['Abonament mes', 'Sense matrícula · per a no residents', 50, 40],
    ],
  };
  const FAMILY = {
    gran: [['1 adult + 1 infant', '< 13 anys · +37 € per infant extra', 87, 95], ['2 adults + 1 infant', '< 13 anys · +35 € per infant extra', 137, 147.5], ['1 adult + 1 fill/a', 'Fins a 18 anys · +44 € per infant extra', 95, 103]],
    xic: [['1 adult + 1 infant', '< 13 anys · +28 € per infant extra', 68, 91], ['2 adults + 1 infant', '< 13 anys · +25 € per infant extra', 100, 141.5], ['1 adult + 1 fill/a', 'Fins a 18 anys · +35 € per infant extra', 75, 99]],
  };
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));
  const state = { gym: 'gran', who: 'a' };
  const grid = $('#priceGrid'), fam = $('#familyGrid'); if (!grid) return;

  grid.innerHTML = DATA.gran.map((r, i) => `
    <article class="price${i === 1 ? ' price--hot' : ''}">
      <h4>${r[0]}</h4><small>${r[1]}</small>
      <div class="price__n"><span data-v="0">0</span><sup>€</sup></div>
      <p class="price__multi"></p>
    </article>`).join('');
  fam.innerHTML = FAMILY.gran.map((r) => `
    <div class="fam"><h4>${r[0]}</h4><p></p>
      <div class="price__n"><span data-v="0">0</span><sup>€</sup></div>
      <p class="price__multi"></p></div>`).join('');

  function tween(el, to) {
    const o = { v: +el.dataset.v };
    el.dataset.v = to;
    gsap.to(o, { v: to, duration: 0.7, ease: 'expo.out', onUpdate: () => { el.textContent = fmt(Math.round(o.v * 2) / 2); } });
  }
  function render() {
    const rows = DATA[state.gym];
    $$('.price', grid).forEach((card, i) => {
      const r = rows[i];
      const v = state.who === 'a' ? r[2] : r[3];
      const m = state.who === 'a' ? r[4] : r[5];
      tween($('.price__n span', card), v);
      $('.price__multi', card).textContent = m ? `Multicentre: ${m} €` : '';
    });
    FAMILY[state.gym].forEach((r, i) => {
      const el = $$('.fam', fam)[i];
      $('p', el).textContent = r[1];
      tween($('.price__n span', el), r[2]);
      $('.price__multi', el).textContent = `Multicentre: ${fmt(r[3])} €`;
    });
  }
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.gym ? 'gym' : 'who';
    state[key] = b.dataset[key];
    $$('button', b.parentNode).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    render();
  }));
  ScrollTrigger.create({ trigger: '#tarifes', start: 'top 70%', once: true, onEnter: render });
  gsap.from('.price', { y: 60, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.prices__grid', start: 'top 85%' } });
})();

/* ---------- Xifres ---------- */
$$('[data-count]').forEach((el) => {
  const n = +el.dataset.count;
  const o = { v: 0 };
  gsap.to(o, {
    v: n, duration: 1.8, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 85%' },
    onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ca-ES').replace(/\s/g, '.'); },
  });
});
gsap.from('.stat', { y: 60, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 80%' } });

/* ---------- CTA ---------- */
gsap.from('#ctaBig span', {
  yPercent: 100, rotate: 3, stagger: 0.12, duration: 1.1, ease: 'expo.out',
  scrollTrigger: { trigger: '.cta', start: 'top 70%' },
});
gsap.from('.cta__grid > *', {
  y: 40, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out',
  scrollTrigger: { trigger: '.cta__grid', start: 'top 90%' },
});

/* ---------- El cim: escena 3D en temps real ---------- */
(function () {
  if (!$('#cim')) return;
  const peak = window.PatiPeak;
  const lines = $$('.peak__line');
  let shown = -1;
  ScrollTrigger.create({
    trigger: '#cim', start: 'top bottom', end: 'bottom top',
    onToggle: (st) => peak && peak.setVisible(st.isActive),
  });
  ScrollTrigger.create({ trigger: '#cim', start: 'top bottom+=150%', once: true, onEnter: () => peak && peak.preload() });
  ScrollTrigger.create({
    trigger: '#cim', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      peak && peak.setProgress(clamp01(st.progress / 0.92));
      let idx = -1; lines.forEach((l, i) => { if (st.progress >= +l.dataset.at) idx = i; });
      if (idx !== shown) {
        shown = idx;
        lines.forEach((l, i) => gsap.to(l, { opacity: i === idx ? 1 : 0, y: i === idx ? 0 : (i < idx ? -40 : 40), duration: 0.6, ease: 'power3.out' }));
      }
    },
  });
  gsap.fromTo('.peak__kicker', { opacity: 0, y: 20 }, { opacity: 1, y: 0, scrollTrigger: { trigger: '#cim', start: 'top 60%', end: 'top top', scrub: true } });
})();

/* ---------- Abans / després ---------- */
(function () {
  const r = $('#baRange'); if (!r) return;
  const set = (v) => { $('#baBefore').style.clipPath = `inset(0 ${100 - v}% 0 0)`; $('#baHandle').style.left = v + '%'; };
  r.addEventListener('input', () => set(+r.value));
  set(50);
  // petita insinuació en entrar, perquè es vegi que es pot arrossegar
  ScrollTrigger.create({ trigger: '#ba', start: 'top 70%', once: true, onEnter: () => {
    const o = { v: 50 };
    gsap.timeline().to(o, { v: 22, duration: 0.8, ease: 'power2.inOut', onUpdate: () => set(o.v) })
      .to(o, { v: 50, duration: 0.9, ease: 'power2.inOut', onUpdate: () => { set(o.v); r.value = o.v; } });
  } });
})();

gsap.from('.programs li', { y: 30, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.programs', start: 'top 85%' } });
gsap.fromTo('.school__media img', { yPercent: -8 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.school', start: 'top bottom', end: 'bottom top', scrub: true } });
gsap.from(".life__title span", { yPercent: 60, opacity: 0, stagger: 0.12, duration: 1, ease: "power4.out", scrollTrigger: { trigger: ".life__head", start: "top 80%" } });
gsap.from(".life__lead", { y: 30, opacity: 0, duration: 1, delay: 0.3, ease: "power3.out", scrollTrigger: { trigger: ".life__head", start: "top 80%" } });
document.querySelectorAll(".lt").forEach((el) => {
  gsap.from(el, { opacity: 0, scale: 0.9, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } });
  if (innerWidth > 820) gsap.fromTo(el.querySelector("img"), { yPercent: 0 }, { yPercent: -(+el.dataset.speed || 0) * 0.6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
  if (innerWidth > 820) gsap.to(el, { y: -(+el.dataset.speed || 0) * 6, ease: "none", scrollTrigger: { trigger: ".life__grid", start: "top bottom", end: "bottom top", scrub: true } });
});
gsap.from(".life__days li", { y: 40, opacity: 0, stagger: 0.08, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".life__days", start: "top 88%" } });
gsap.from('.post', { y: 60, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.feed__grid', start: 'top 85%' } });
gsap.from('.pillar', { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.pillars', start: 'top 85%' } });

/* ---------- Color de la barra segons el fons ---------- */
[['.dict', 'is-light'], ['#paret', 'is-light'], ['.acts', 'is-light'], ['.proj', 'is-light'], ['.gyms', 'is-light'], ['.feed', 'is-light'], ['.stats', 'is-light'], ['.cta', 'is-light'], ['.cta', 'is-gold']]
  .filter(([sel]) => $(sel)).forEach(([sel, cls]) => ScrollTrigger.create({
    trigger: sel, start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: '.nav', className: cls },
  }));

/* ---------- Barra de progrés ---------- */
gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

/* ---------- Vídeos: només quan es veuen ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
}), { rootMargin: '200px' });
$$('video[data-lazyplay]').forEach((v) => io.observe(v));
// clips que només es reprodueixen en un tram (data-in / data-out), en bucle
const clips = $$('video[data-in]').map((v) => ({ v, a: +v.dataset.in, b: +v.dataset.out || 0 }));
clips.forEach(({ v, a }) => v.addEventListener('loadedmetadata', () => { v.currentTime = a; }));
setInterval(() => clips.forEach(({ v, a, b }) => {
  if (v.paused && !v.ended) return;
  const end = Math.min(b || v.duration, v.duration) - 0.12;
  if (v.ended || v.currentTime >= end || v.currentTime < a - 0.05) { v.currentTime = a; if (v.paused) v.play().catch(() => {}); }
}), 100);

/* ---------- Inici ---------- */
if (isHome) {
  addEventListener('resize', () => { layoutHero(); });
  document.fonts.load('900 100px Outfit').then(() => { layoutHero(); ScrollTrigger.refresh(); });
  layoutHero();
  runLoader();
} else {
  gsap.from('.phead > *', { y: 40, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out' });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* ---------- Targetes cap a les altres pàgines ---------- */
gsap.from('.go', { y: 60, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.explore__grid', start: 'top 85%' } });

/* ---------- Comunitat: obertura amb vídeo ---------- */
(function () {
  if (!$('.chero')) return;
  const full = 'inset(0% 0% 0% 0% round 0px)';
  gsap.timeline({ scrollTrigger: { trigger: '.chero', start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
    .to('.chero__media', { clipPath: full, ease: 'power2.inOut', duration: 1 })
    .to('.chero__media video', { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
    .to('.chero__kicker, .chero__back', { opacity: 0, y: -40, duration: 0.4 }, 0.1)
    .fromTo('.chero__line--a', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0.55)
    .to('.chero__line--a', { opacity: 0, y: -40, duration: 0.3 }, 1.05)
    .fromTo('.chero__line--b', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 1.15)
    .to({}, { duration: 0.3 });
})();

/* ---------- Comunitat: un dia al pati ---------- */
(function () {
  const sec = $('.day'); if (!sec) return;
  const clock = $('#dayClock'), steps = $$('.day__step'), media = $$('.day__media > *');
  // minut de cada moment i color del fons, del matí a la nit
  const T = [8 * 60, 11 * 60, 14 * 60, 17 * 60 + 30, 20 * 60, 22 * 60 + 30];
  const BG = ['#f3e6c8', '#f1d79b', '#e3a20b', '#c8692c', '#2b2236', '#0e0e0f'];
  const INK = [true, true, true, false, false, false];
  let cur = -1;
  const show = (i) => {
    if (i === cur) return;
    cur = i;
    steps.forEach((s, k) => gsap.to(s, { opacity: k === i ? 1 : 0, y: k === i ? 0 : (k < i ? -30 : 30), duration: 0.6, ease: 'power3.out' }));
    media.forEach((m, k) => gsap.to(m, { opacity: k === i ? 1 : 0, scale: k === i ? 1 : 1.08, duration: 0.9, ease: 'power3.out' }));
    gsap.to(sec, { backgroundColor: BG[i], color: INK[i] ? '#0e0e0f' : '#faf8f3', duration: 0.9, ease: 'power2.out' });
  };
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = clamp01(st.progress / 0.9);
      const m = T[0] + (T[T.length - 1] - T[0]) * p;
      const h = Math.floor(m / 60), mm = Math.floor((m % 60) / 5) * 5;
      clock.textContent = String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
      let i = 0; T.forEach((t, k) => { if (m >= t - 20) i = k; });
      show(i);
      $('.nav').classList.toggle('is-light', st.isActive && INK[i]);
      $('.nav').classList.toggle('is-gold', st.isActive && i === 2);
    },
    onToggle: (st) => { if (!st.isActive) $('.nav').classList.remove('is-light', 'is-gold'); },
  });
  show(0);
})();

/* ---------- Comunitat: diccionari i roca ---------- */
$$('.word').forEach((w) => w.addEventListener('click', () => w.classList.toggle('is-flip')));
gsap.from('.word', { y: 60, opacity: 0, stagger: 0.06, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.dict__grid', start: 'top 85%' } });
gsap.from('.rock__list i', { scaleX: 0, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.rock__list', start: 'top 80%' } });
gsap.from('.rock__list li', { y: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.rock__list', start: 'top 85%' } });
