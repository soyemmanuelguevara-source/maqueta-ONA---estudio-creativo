/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Módulo de movimiento
   Complementa js/main.js (no lo reemplaza; sus hooks siguen intactos) y se carga
   después, con `defer`. Estilos en css/motion.css (@layer motion).

   Índice
   01. Detección y estado
   02. Bucle de scroll único (header inteligente, progreso, fallbacks)
   03. Sección activa en el header
   04. Titulares por líneas
   05. Óvalo que se abre en imágenes
   06. Ondas entre secciones
   07. Servicios: storytelling sticky
   08. Marquee pausable + pausas fuera de pantalla
   09. Botones magnéticos
   10. Footer: wordmark gigante

   Reglas: solo transform/opacity/clip-path; un único listener de scroll; todo lo
   que reduce-motion no admite se desmonta; nada deja contenido oculto si algo falla.
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ─── 01. DETECCIÓN Y ESTADO ────────────────────────────── */
  const doc = document;
  const root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  // Scroll-driven animations: Chrome/Edge/Safari 26+. Firefox puede no tenerlas → fallback con variables.
  const hasSDA = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));

  root.classList.add('js-ready'); // el script del <head> lo espera; si no llega, quita .js y todo se ve
  if (!hasSDA) root.classList.add('no-sda');

  const navbar = $('#navbar');
  const hero = $('#hero');
  const heroContent = $('#hero .hero-content');
  const progressBar = $('.read-progress');


  /* ─── 02. BUCLE DE SCROLL ÚNICO ─────────────────────────── */
  // Header: transparente arriba → compacto → se oculta al bajar → reaparece al subir.
  // Las variables del fallback se escriben en el elemento que las usa (no en :root) para
  // no invalidar el estilo de toda la página en cada frame.
  const waves = [];
  let lastY = window.scrollY;
  let hidden = false;
  let compact = false;
  let ticking = false;
  const storyHooks = [];

  const frame = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (navbar) {
      const dy = y - lastY;
      if (Math.abs(dy) > 6) {
        const menuOpen = navbar.classList.contains('menu-open');
        const hide = dy > 0 && y > 240 && !menuOpen && !reduce.matches;
        if (hide !== hidden) { hidden = hide; navbar.classList.toggle('is-hidden', hide); }
        lastY = y;
      }
      if (y < 80 && hidden) { hidden = false; navbar.classList.remove('is-hidden'); }
      const isCompact = y > 240;
      if (isCompact !== compact) { compact = isCompact; navbar.classList.toggle('is-compact', isCompact); }
    }

    if (!hasSDA && !reduce.matches) {
      if (progressBar) {
        const max = root.scrollHeight - vh;
        progressBar.style.setProperty('--sp', (max > 0 ? clamp(y / max) : 0).toFixed(4));
      }
      if (heroContent) heroContent.style.setProperty('--hp', clamp(y / (vh * 0.7)).toFixed(4));
      for (const w of waves) {
        const r = w.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40) continue;
        w.style.setProperty('--wp', clamp((vh - r.top) / (vh + r.height)).toFixed(3));
      }
    }
    for (const fn of storyHooks) fn();
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  reduce.addEventListener('change', () => {
    if (reduce.matches && navbar) { hidden = false; navbar.classList.remove('is-hidden'); }
    onScroll();
  });


  /* ─── 03. SECCIÓN ACTIVA EN EL HEADER ───────────────────── */
  const navActions = $('.nav-actions');
  const menuLinks = $$('.menu-link');
  if (navActions && menuLinks.length) {
    const label = doc.createElement('span');
    label.className = 'nav-section';
    label.setAttribute('aria-hidden', 'true'); // el menú ya marca la sección con aria-current
    navActions.prepend(label);

    const sections = new Map(menuLinks.map((a) => {
      const num = $('.menu-num', a);
      return [a.getAttribute('href').slice(1), { a, num: num ? num.textContent : '', name: a.lastChild.textContent.trim() }];
    }));
    let current = '';
    const setActive = (id) => {
      const info = sections.get(id);
      if (!info || id === current) return;
      current = id;
      menuLinks.forEach((a) => (a === info.a ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
      label.classList.add('is-swapping');
      setTimeout(() => {
        label.textContent = '';
        const n = doc.createElement('b');
        n.textContent = info.num;
        label.append(n, ' ', info.name);
        label.classList.remove('is-swapping');
      }, reduce.matches ? 0 : 150);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((_, id) => { const el = doc.getElementById(id); if (el) io.observe(el); });
  }


  /* ─── 04. TITULARES POR LÍNEAS ──────────────────────────── */
  // Cada <br> (o bloque <em>) es una línea; se envuelve en una máscara y sube con stagger.
  // El texto sigue en el DOM tal cual (buscable, legible por lectores de pantalla).
  const splitLines = (h) => {
    if (h.dataset.split) return;
    h.dataset.split = '1';
    const lines = [[]];
    [...h.childNodes].forEach((n) => {
      if (n.nodeName === 'BR') { lines.push([]); n.remove(); return; }
      if (n.nodeType === 1 && getComputedStyle(n).display === 'block') {
        if (lines[lines.length - 1].length) lines.push([]);
        lines[lines.length - 1].push(n);
        lines.push([]);
        return;
      }
      lines[lines.length - 1].push(n);
    });
    h.textContent = '';
    let idx = 0;
    lines.forEach((nodes) => {
      while (nodes.length && nodes[0].nodeType === 3 && !nodes[0].textContent.trim()) nodes.shift();
      while (nodes.length && nodes[nodes.length - 1].nodeType === 3 && !nodes[nodes.length - 1].textContent.trim()) nodes.pop();
      if (!nodes.length) return;
      if (nodes[0].nodeType === 3) nodes[0].textContent = nodes[0].textContent.replace(/^\s+/, '');
      const last = nodes[nodes.length - 1];
      if (last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, '');
      const ln = doc.createElement('span');
      ln.className = 'ln';
      ln.style.setProperty('--l', idx++);
      const inner = doc.createElement('span');
      inner.className = 'ln-i';
      inner.append(...nodes);
      ln.append(inner);
      h.append(ln);
    });
    const wrapper = h.closest('.reveal');
    if (wrapper) wrapper.classList.add('reveal--lines');
  };
  if (!reduce.matches) $$('.reveal .section-title, .reveal .why-quote').forEach(splitLines);


  /* ─── 05. ÓVALO QUE SE ABRE ─────────────────────────────── */
  $$('.feature-visual').forEach((el) => {
    if (reduce.matches) return;
    el.classList.add('oval-reveal');
    el.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'clip-path') el.classList.add('is-open'); // sin clip-path: no recorta sombras
    });
  });


  /* ─── 06. ONDAS ENTRE SECCIONES ─────────────────────────── */
  // [selector de la sección, color de la sección ANTERIOR]. La onda es un decorado: aria-hidden.
  const WAVES = [
    ['#ambientes', 'var(--cream)'], ['#estudio', 'var(--blue-700)'], ['#proceso', 'var(--blue)'],
    ['#producto', 'var(--cream)'], ['#stats', 'var(--paper)'], ['#sectores', 'var(--blue)'],
    ['#contacto', 'var(--cream)'], ['footer', 'var(--paper)'],
  ];
  WAVES.forEach(([sel, color]) => {
    const section = $(sel);
    if (!section) return;
    const w = doc.createElement('div');
    w.className = 'wave';
    w.setAttribute('aria-hidden', 'true');
    w.style.setProperty('--wave-c', color);
    w.append(doc.createElement('i'));
    section.prepend(w);
    waves.push(w);
  });


  /* ─── 07. SERVICIOS: STORYTELLING STICKY ────────────────── */
  const story = (() => {
    const section = $('#ambientes');
    const grid = section && $('.ambientes-grid', section);
    if (!grid) return null;
    const cards = [...grid.children].filter((c) => c.classList.contains('amb-card'));
    const desktop = window.matchMedia('(min-width: 1024px)');
    let wrap = null;
    let items = [];
    let active = -1;
    let on = false;

    const update = () => {
      if (!on) return;
      const r = section.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const threshold = 84 + 28 + 90; // top pegajoso de las tarjetas + holgura
      let idx = 0;
      cards.forEach((c, i) => { if (c.getBoundingClientRect().top <= threshold) idx = i; });
      if (idx === active) return;
      active = idx;
      items.forEach((li, i) => li.classList.toggle('is-active', i === idx));
      cards.forEach((c, i) => c.classList.toggle('is-behind', i < idx));
    };
    const enable = () => {
      if (on) return;
      on = true;
      wrap = doc.createElement('div');
      wrap.className = 'amb-story is-on';
      const list = doc.createElement('ol');
      list.className = 'amb-index';
      list.setAttribute('aria-hidden', 'true'); // duplica los h3: decorativo
      items = cards.map((c, i) => {
        const li = doc.createElement('li');
        const n = doc.createElement('span');
        n.className = 'n';
        n.textContent = String(i + 1).padStart(2, '0');
        const t = doc.createElement('span');
        const h3 = $('h3', c);
        t.textContent = h3 ? h3.textContent : '';
        li.append(n, t);
        list.append(li);
        return li;
      });
      grid.before(wrap);
      wrap.append(list, grid);
      section.classList.add('has-story');
      active = -1;
      update();
    };
    const disable = () => {
      if (!on) return;
      on = false;
      wrap.before(grid);
      wrap.remove();
      section.classList.remove('has-story');
      cards.forEach((c) => c.classList.remove('is-behind'));
    };
    const sync = () => (desktop.matches && !reduce.matches ? enable() : disable());
    desktop.addEventListener('change', sync);
    reduce.addEventListener('change', sync);
    sync();
    storyHooks.push(update);
    return { update };
  })();


  /* ─── 08. MARQUEE PAUSABLE + PAUSAS FUERA DE PANTALLA ───── */
  // WCAG 2.2.2: lo que se mueve solo más de 5 s necesita un control de pausa.
  const marquee = $('.marquee');
  if (marquee) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'marquee-toggle';
    btn.setAttribute('aria-pressed', 'false');
    const icon = doc.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    btn.append(icon);
    marquee.append(btn);

    let userPaused = false;
    let visible = true;
    const sync = () => {
      marquee.classList.toggle('is-paused', userPaused || !visible || reduce.matches);
      btn.setAttribute('aria-pressed', String(userPaused));
      btn.setAttribute('aria-label', userPaused ? 'Reanudar animación del carrusel' : 'Pausar animación del carrusel');
      icon.className = userPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
    };
    btn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(marquee);
    reduce.addEventListener('change', sync);
    sync();
  }
  if (hero) {
    // grano, haces de luz y flotantes del hero dejan de animarse cuando el hero no se ve
    new IntersectionObserver(([e]) => hero.classList.toggle('is-offscreen', !e.isIntersecting)).observe(hero);
  }


  /* ─── 09. BOTONES MAGNÉTICOS ────────────────────────────── */
  // Solo puntero fino. Se mueve la propiedad `translate` (independiente del `transform` del hover).
  if (finePointer.matches && !reduce.matches) {
    $$('.btn-primary, .btn-outline, .form-submit, .wa-btn').forEach((el) => {
      let t = 0;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width;
        const y = (e.clientY - (r.top + r.height / 2)) / r.height;
        clearTimeout(t);
        el.classList.remove('mag-out');
        el.style.setProperty('--mx', `${(x * 10).toFixed(1)}px`);
        el.style.setProperty('--my', `${(y * 8).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.classList.add('mag-out');
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
        t = setTimeout(() => el.classList.remove('mag-out'), 520);
      });
    });
  }


  /* ─── 10. FOOTER: WORDMARK GIGANTE ──────────────────────── */
  const giant = $('.footer-giant');
  if (giant) {
    if (reduce.matches) giant.classList.add('is-in');
    else {
      const io = new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        giant.classList.add('is-in'); // una sola vez
        obs.disconnect();
      }, { threshold: 0.35 });
      io.observe(giant);
    }
  }

  frame();
  window.ONAMotion = { story, hasSDA }; // para pruebas
})();
