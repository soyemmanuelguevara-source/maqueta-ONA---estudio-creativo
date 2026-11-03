/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Interacciones y animaciones
   Sin dependencias. Se carga con `defer`, así que el DOM ya existe.

   Índice
   01. Config y helpers
   02. Loader y arranque del hero
   03. Navbar, parallax y menú móvil
   04. Marquee
   05. Reveal al hacer scroll + contadores
   06. Canvas del hero (aros flotantes)
   07. Formulario → WhatsApp
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ─── 01. CONFIG Y HELPERS ──────────────────────────────── */
  const WA_NUMBER = '523321697822'; // 52 + 10 dígitos (México)
  const MARQUEE_ITEMS = [
    'Grabación de video', 'Edición de video', 'Estilo visual de marca', 'Desarrollo web',
    'Reels', 'Identidad de marca', 'Marketing digital', 'Tu verdadera esencia',
  ];
  const SYMBOLS = ['sym-lunas', 'sym-ovalo', 'sym-ola']; // assets/img/<nombre>-blue.png

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const body = document.body;
  const navbar = $('#navbar');
  const heroBg = $('.hero-bg');


  /* ─── 02. LOADER Y ARRANQUE DEL HERO ────────────────────── */
  const loader = $('#loader');
  const LOADER_MIN_MS = reduceMotion ? 0 : 3700; // lo que dura el logo dibujándose (ver drawLoaderLogo)
  const startedAt = performance.now();
  let isReady = false;

  // El logotipo se "dibuja": cada contorno traza su línea (stroke-dashoffset), una punta
  // de plumón recorre el nombre y al final entra el relleno. Los contornos vienen de
  // vectorizar el logo (ver <svg id="loader-logo"> en index.html).
  const drawLoaderLogo = () => {
    const svg = $('#loader-logo');
    const title = $('.loader-title');
    if (!svg) return;
    const fill = $('.ll-fill', svg);
    const strokeLayer = $('.ll-stroke', svg);
    const nib = $('.ll-nib', svg);

    const showFinal = () => {
      fill.style.opacity = 1;
      strokeLayer.style.opacity = 0;
      title && title.classList.add('show');
    };
    if (reduceMotion) { showFinal(); return; }

    // [retraso base, duración] en ms por grupo: 0 lunas · 1 óvalo · 2 ola · w nombre · h huecos de la o y la a
    const TIMING = { 0: [150, 800], 1: [420, 800], 2: [700, 800], w: [1150, 1500], h: [2550, 500] };
    const FILL_AT = 2850;
    const FILL_MS = 600;
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const clamp = (v) => Math.min(1, Math.max(0, v));

    const seen = {};
    const strokes = $$('.ll-s', svg).map((el) => {
      const g = el.dataset.g;
      const k = (seen[g] = (seen[g] ?? -1) + 1); // el 2.º contorno del grupo arranca un poco después
      const len = el.getTotalLength() + 2;       // +2: evita el punto residual del trazo redondeado
      el.style.strokeDasharray = `${len} ${len}`;
      el.style.strokeDashoffset = len;
      return { el, g, len, delay: TIMING[g][0] + k * 70, dur: TIMING[g][1] };
    });
    const word = strokes.find((s) => s.g === 'w');

    const t0 = performance.now();
    const tick = (now) => {
      const t = now - t0;
      strokes.forEach((s) => {
        s.el.style.strokeDashoffset = (s.len * (1 - ease(clamp((t - s.delay) / s.dur)))).toFixed(1);
      });

      const pw = clamp((t - word.delay) / word.dur);
      if (pw > 0 && pw < 1) {
        const pt = word.el.getPointAtLength((word.len - 2) * ease(pw));
        nib.setAttribute('cx', pt.x);
        nib.setAttribute('cy', pt.y);
        nib.style.opacity = 1;
      } else {
        nib.style.opacity = 0;
      }

      const pf = clamp((t - FILL_AT) / FILL_MS);
      fill.style.opacity = pf;
      strokeLayer.style.opacity = 1 - pf;

      if (t < FILL_AT + FILL_MS) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => title && title.classList.add('show'), 2200);
  };
  drawLoaderLogo();

  const setReady = () => {
    if (isReady) return;
    isReady = true;
    body.classList.remove('is-loading');
    body.classList.add('is-ready'); // dispara las entradas del hero (ver CSS)
    if (loader) {
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 1300);
    }
  };

  const onPageLoaded = () => {
    const wait = Math.max(0, LOADER_MIN_MS - (performance.now() - startedAt));
    setTimeout(setReady, wait);
  };
  if (document.readyState === 'complete') onPageLoaded();
  else window.addEventListener('load', onPageLoaded);
  setTimeout(setReady, 5000); // seguro por si algún recurso externo se queda colgado


  /* ─── 03. NAVBAR, PARALLAX Y MENÚ MÓVIL ─────────────────── */
  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      navbar.classList.toggle('scrolled', y > 40);
      body.classList.toggle('is-scrolled', y > 80);
      if (heroBg && !reduceMotion && y < window.innerHeight * 1.2) {
        heroBg.style.setProperty('--py', `${(y * 0.16).toFixed(1)}px`);
      }
      scrollTicking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menú a pantalla completa (botón "Menú", visible en escritorio y móvil)
  const hamburger = $('#hamburger');
  const hamburgerLabel = $('.hamburger-label', hamburger);
  const mobMenu = $('#mob-menu');
  const setMenu = (open) => {
    hamburger.classList.toggle('open', open);
    mobMenu.classList.toggle('open', open);
    navbar.classList.toggle('menu-open', open);
    body.classList.toggle('menu-lock', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (hamburgerLabel) hamburgerLabel.textContent = open ? 'Cerrar' : 'Menú';
    if (open) mobMenu.scrollTop = 0;
  };
  hamburger.addEventListener('click', () => setMenu(!mobMenu.classList.contains('open')));
  // Al elegir una sección el menú se cierra y la página se desplaza sola (scroll-behavior: smooth)
  $$('a', mobMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Enlace activo según la sección visible (se resalta en el menú)
  const navLinks = $$('.menu-link');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => {
    const target = $(a.getAttribute('href'));
    if (target) sectionIO.observe(target);
  });


  /* ─── 04. MARQUEE ───────────────────────────────────────── */
  const marquee = $('#marquee');
  if (marquee) {
    // Se duplica el contenido para que el bucle (-50%) sea continuo
    const buildSet = () => MARQUEE_ITEMS.map((text, i) =>
      `<span class="marquee-item">${text}<img src="assets/img/${SYMBOLS[i % SYMBOLS.length]}-blue.png" alt="" width="34" height="34" loading="lazy"></span>`
    ).join('');
    marquee.innerHTML = buildSet() + buildSet();
  }


  /* ─── 05. REVEAL AL HACER SCROLL + CONTADORES ───────────── */
  const revealIO = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      obs.unobserve(el);
      setTimeout(() => el.classList.add('is-settled'), 1400); // quita el delay para los hover
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  $$('.reveal').forEach((el) => {
    if (reduceMotion) el.classList.add('in', 'is-settled');
    else revealIO.observe(el);
  });

  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const countUp = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = reduceMotion ? 0 : 1900;
    const t0 = performance.now();
    const tick = (now) => {
      const p = duration ? Math.min((now - t0) / duration, 1) : 1;
      el.textContent = Math.round(target * easeOutExpo(p)).toLocaleString('es-MX') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const countIO = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  $$('.stat-num[data-count]').forEach((el) => countIO.observe(el));

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ─── 06. CANVAS DEL HERO ───────────────────────────────── */
  // Aros, óvalos y medias lunas a la deriva: eco de los símbolos del logotipo.
  const canvas = $('#hero-canvas');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const hero = $('#hero');
    const CREAM = '250, 249, 244';
    const SKY = '183, 191, 255';
    let w = 0, h = 0, dpr = 1, shapes = [], running = false, rafId = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const rand = (a, b) => a + Math.random() * (b - a);

    const makeShapes = () => {
      const count = w < 720 ? 8 : 15;
      shapes = Array.from({ length: count }, () => ({
        type: ['ring', 'oval', 'moon', 'ring', 'dot'][Math.floor(Math.random() * 5)],
        x: rand(0, w), y: rand(0, h),
        r: rand(16, w < 720 ? 60 : 120),
        vx: rand(-0.16, 0.16), vy: rand(-0.2, -0.04),
        rot: rand(0, Math.PI * 2), vr: rand(-0.003, 0.003),
        depth: rand(8, 46),
        alpha: rand(0.1, 0.28),
        color: Math.random() > 0.6 ? SKY : CREAM,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeShapes();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      shapes.forEach((s) => {
        s.x += s.vx; s.y += s.vy; s.rot += s.vr;
        if (s.y < -s.r * 2) { s.y = h + s.r * 2; s.x = rand(0, w); }
        if (s.x < -s.r * 2) s.x = w + s.r * 2;
        if (s.x > w + s.r * 2) s.x = -s.r * 2;

        const px = s.x + mouse.x * s.depth;
        const py = s.y + mouse.y * s.depth;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(s.rot);
        ctx.strokeStyle = `rgba(${s.color}, ${s.alpha})`;
        ctx.fillStyle = `rgba(${s.color}, ${s.alpha * 0.9})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (s.type === 'ring') ctx.arc(0, 0, s.r, 0, Math.PI * 2);
        else if (s.type === 'oval') ctx.ellipse(0, 0, s.r * 0.72, s.r, 0, 0, Math.PI * 2);
        else if (s.type === 'moon') { ctx.arc(0, 0, s.r, -Math.PI / 2, Math.PI / 2); ctx.closePath(); }
        else ctx.arc(0, 0, s.r * 0.22, 0, Math.PI * 2);
        s.type === 'dot' ? ctx.fill() : ctx.stroke();
        ctx.restore();
      });
      rafId = requestAnimationFrame(draw);
    };

    const start = () => { if (!running) { running = true; rafId = requestAnimationFrame(draw); } };
    const stop  = () => { running = false; cancelAnimationFrame(rafId); };

    resize();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width - 0.5;
      mouse.ty = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });

    // Solo anima mientras el hero está en pantalla y la pestaña visible
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }


  /* ─── 07. FORMULARIO → WHATSAPP ─────────────────────────── */
  const form = $('#wa-form');
  if (form) {
    const fName = $('#f-name');
    const fInterest = $('#f-interest');
    const fMsg = $('#f-msg');

    $$('.form-control', form).forEach((field) => field.addEventListener('input', () => {
      field.classList.remove('invalid');
      field.removeAttribute('aria-invalid');
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let firstInvalid = null;
      [fName, fMsg].forEach((field) => {
        const bad = !field.value.trim();
        field.classList.toggle('invalid', bad);
        if (bad) {
          field.setAttribute('aria-invalid', 'true');
          firstInvalid = firstInvalid || field;
        }
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const text =
        `Hola, soy ${fName.value.trim()}. Vi su sitio web y quiero una cotización.\n` +
        `Me interesa: ${fInterest.value}.\n\n` +
        fMsg.value.trim();
      window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    });
  }
})();
