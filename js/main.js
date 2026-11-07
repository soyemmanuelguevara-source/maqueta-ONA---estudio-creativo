/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Interacciones y efectos
   Se carga con `defer` después de GSAP, ScrollTrigger y Lenis (js/vendor/). Si alguna librería
   falta, cada efecto tiene un respaldo; si este archivo falla, el <head> quita .js a los 5 s.

   Niveles de efecto:
   · reduce  → prefers-reduced-motion: sin animaciones, todo en su estado final.
   · rich    → puntero fino + equipo con recursos: Lenis, cursor, inclinación 3D, parallax.
   · el resto (móvil, táctil, equipos modestos): efectos ligeros (CSS + progreso de scroll).

   Índice
   01. Config (WHATSAPP_NUMERO), helpers y medición
   02. Preloader y entrada del hero (titular en semitono: js/halftone.js)
   03. Scroll suave (Lenis) y anclas
   04. Header, menú y sección activa
   05. Bucle de scroll: progreso, header inteligente, brecha, línea de tiempo, galería, barra móvil
   06. Revelados, scramble y parallax de imágenes (GSAP)
   07. Cursor personalizado y botones magnéticos
   08. Bento: spotlight e inclinación 3D
   09. Cinta con velocidad según el scroll
   10. Línea de tiempo interactiva
   11. Antes/después
   12. Calculadora
   13. WhatsApp y formulario
   14. Códigos de tiempo y año
   15. Nuestra visión e historia de contenido
   16. Servicios: portal de letra (js/glyph-portal.js)
   17. Títulos con movimiento: Cómo trabajamos y El después
   18. Servicios: microescenas de los mosaicos
   19. Nuestra visión: logo que se dibuja y lente sobre la cita
   20. Por qué Ona: sellos, subrayados, título "plantilla", cursor de grabación y capa "high tech"
   21. Qué incluye y calculadora: entregables vivos, tablero que voltea y reloj
   22. Preguntas y Escríbenos: chat que contesta, acordeón animado, pila de fotos y avance del formulario
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ─── 01. CONFIG, HELPERS Y MEDICIÓN ────────────────────── */
  // Número de WhatsApp con lada (52 + 10 dígitos): +52 33 2169 7822, confirmado por el dueño. Es también el teléfono
  // del sitio: todos los enlaces del número abren este chat. Si se deja vacío (''), el formulario usa el correo y se
  // ocultan los botones de WhatsApp.
  const WHATSAPP_NUMERO = '523321697822';
  const EMAIL = 'ona.studiosc@gmail.com';

  const doc = document;
  const root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mq = (q) => window.matchMedia(q).matches;

  const reduce = mq('(prefers-reduced-motion: reduce)');
  const fine = mq('(hover: hover) and (pointer: fine)');
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const rich = !reduce && fine && !lowEnd;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const hasGsap = !!(gsap && ST) && !reduce;
  if (hasGsap) gsap.registerPlugin(ST);

  root.classList.add('js-ready'); // el <head> lo espera; si no llega, quita .js

  // Medición: eventos para Google Tag Manager (dataLayer). Sin IDs: se conectan al pegar el snippet de GTM.
  window.dataLayer = window.dataLayer || [];
  const track = (event, params = {}) => window.dataLayer.push({ event, ...params });
  doc.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { label: el.dataset.trackLabel || el.textContent.trim() });
  });


  /* ─── 02. PRELOADER Y ENTRADA DEL HERO ──────────────────── */
  const heroTitle = $('#hero-title');
  // Envuelve cada palabra en <span class="w"><i style="--i:n"> para revelarlas con máscara
  const splitWords = (el) => {
    let n = 0;
    const walk = (node) => [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) return walk(child);
      if (child.nodeType !== 3 || !child.textContent.trim()) return;
      const frag = doc.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(doc.createTextNode(part));
        const w = doc.createElement('span');
        const i = doc.createElement('i');
        w.className = 'w';
        i.style.setProperty('--i', n++);
        i.textContent = part;
        w.append(i);
        frag.append(w);
      });
      child.replaceWith(frag);
    });
    walk(el);
  };
  // El titular se imprime en puntos de semitono (js/halftone.js); sin ese archivo, las palabras entran con máscara
  // (nube: los puntos llegan de una nube alrededor del slogan; margen: aire del lienzo para esa nube)
  const semitono = heroTitle && window.Halftone ? window.Halftone.mount(heroTitle, { host: $('#inicio'), warm: '#FF4D3D', reduce, nube: true, margen: 1.1 }) : null;
  // Escena de la portada (js/hero-escena.js): campo de señal, tarjetas en profundidad y buscador
  const escena = heroTitle && window.HeroEscena && $('#inicio') ? window.HeroEscena.mount({ hero: $('#inicio'), title: heroTitle, semitono, reduce, destello: rich }) : null;
  if (heroTitle && !reduce && !semitono) splitWords(heroTitle);
  // El subtítulo entra palabra por palabra (de desenfocado a nítido) cuando el titular ya se imprimió
  const heroSub = $('[data-hero-sub]');
  if (heroSub && !reduce) { splitWords(heroSub); heroSub.classList.add('is-split'); }
  const startHero = () => {
    if (!heroTitle) return;
    const portada = $('#inicio');
    if (portada) portada.classList.add('is-vivo'); // enfoque automático y tarjetas (CSS)
    if (escena) escena.iniciar();
    if (semitono) semitono.intro();
    else if (!reduce) heroTitle.classList.add('is-cut');
    heroTitle.classList.add('is-split');
    if (heroSub) setTimeout(() => heroSub.classList.add('is-in'), reduce ? 0 : 900);
    if (heroSub && !reduce) setTimeout(() => heroSub.classList.add('is-listo'), 900 + 2600);
  };

  // Salida tipo portal (inspirada en Glyph Portal © 2026 Christian Katzmann, MIT): las letras del logo siguen blancas
  // y la cámara entra por la "o" de ona hasta que el blanco llena la pantalla; luego aparece la página.
  // Si algo falta (sin Path2D, sin el marcado), la salida es la cortina de siempre.
  const crearPortal = (pre) => {
    const campo = $('.intro-portal', pre);
    const glifo = $('.intro-portal__glifo', pre); // el <clipPath> (dentro de un clipPath no se puede agrupar con <g>)
    const logo = $('.intro-logo', pre);
    const trazos = logo ? $$('.intro-logo__fill path', logo) : [];
    if (!campo || !glifo || !trazos.length || !window.Path2D) return null;
    const copias = trazos.map((p) => glifo.appendChild(p.cloneNode()));
    const VB = { x: 2, y: -5, w: 992, h: 690 }; // viewBox del logo
    const c0 = { x: VB.x + VB.w / 2, y: VB.y + VB.h / 2 };
    const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
    // Punto de entrada: el cuadrado de tinta más grande dentro de la "o" de ona (el método de Glyph Portal)
    const entrada = () => {
      const cv = doc.createElement('canvas');
      cv.width = VB.w;
      cv.height = VB.h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.translate(-VB.x, -VB.y);
      cx.fill(new Path2D(trazos[trazos.length - 1].getAttribute('d'))); // la palabra "ona"
      const { data } = cx.getImageData(0, 0, VB.w, VB.h);
      const limite = 300 - VB.x; // solo la "o"
      const rows = new Uint16Array(VB.w + 1);
      let size = 0, bx = 0, by = 0;
      for (let y = 0; y < VB.h; y++) {
        let diag = 0;
        for (let x = 0; x < VB.w; x++) {
          const above = rows[x + 1];
          rows[x + 1] = x < limite && data[(y * VB.w + x) * 4 + 3] > 245 ? Math.min(above, rows[x], diag) + 1 : 0;
          diag = above;
          if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
        }
      }
      return { x: bx + 1 - size / 2 + VB.x, y: by + 1 - size / 2 + VB.y, r: Math.max(4, size / 2 - 1) };
    };
    let T = null, s0 = 1, sE = 1, P0 = { x: 0, y: 0 }, W = 1, H = 1;
    const medir = () => {
      const L = logo.getBoundingClientRect();
      W = window.innerWidth;
      H = window.innerHeight;
      s0 = L.width / VB.w;
      P0 = { x: L.left + L.width / 2, y: L.top + L.height / 2 };
      T = T || entrada();
      sE = Math.max(s0, Math.hypot(W, H) / (T.r * 1.35)); // al final, la tinta cubre toda la pantalla
    };
    // Cámara: acercamiento logarítmico hacia la "o", con un leve giro a medio camino (como Glyph Portal)
    const pintar = (t) => {
      const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const s = Math.exp(Math.log(s0) + Math.log(sE / s0) * e);
      const blend = sE === s0 ? 0 : (1 / s - 1 / s0) / (1 / sE - 1 / s0);
      const x = c0.x + (T.x - c0.x) * blend;
      const y = c0.y + (T.y - c0.y) * blend;
      const px = P0.x + (W / 2 - P0.x) * e;
      const py = P0.y + (H / 2 - P0.y) * e;
      const roll = -4 * smooth(0.06, 0.5, t) * (1 - smooth(0.62, 0.92, t));
      // Igual que Glyph Portal: escala y giro en el clipPath; el desplazamiento, ya girado, en cada trazo
      const rad = roll * Math.PI / 180;
      const dx = px / s;
      const dy = py / s;
      const v = `translate(${Math.cos(rad) * dx + Math.sin(rad) * dy - x} ${-Math.sin(rad) * dx + Math.cos(rad) * dy - y})`;
      glifo.setAttribute('transform', `scale(${s}) rotate(${roll})`);
      copias.forEach((p) => p.setAttribute('transform', v));
    };
    return {
      // Mientras el logo se desdibuja, la capa blanca con su forma queda debajo: las letras siguen blancas
      ventana() { medir(); pintar(0); pre.classList.add('is-portal'); },
      // La cámara entra; cuando el blanco ya casi llena la pantalla, se funde y aparece la página
      abrir(duracion, alFundir) {
        medir();
        const t0 = performance.now();
        let fundido = false;
        const paso = (now) => {
          const t = clamp((now - t0) / duracion);
          pintar(t);
          if (!fundido && t >= 0.9) { fundido = true; alFundir(); }
          if (t < 1) requestAnimationFrame(paso);
          else campo.style.clipPath = 'none';
        };
        requestAnimationFrame(paso);
      },
    };
  };

  // Entrada: el logo se dibuja (CSS) → se desdibuja (.is-undraw) con las letras blancas →
  // la cámara entra por la "o" (.is-out) → la página aparece (.is-fin). Sin portal, la cortina sube como antes.
  // Un clic o Esc la adelantan. Si este archivo fallara, el CSS la oculta solo a los 8 s.
  if (root.classList.contains('is-loading')) {
    const pre = $('.preloader');
    const portal = crearPortal(pre);
    let leaving = false;
    const liberar = () => { root.classList.remove('is-loading'); if (lenis) lenis.start(); };
    const leave = () => {
      if (leaving) return;
      leaving = true;
      pre.classList.add('is-undraw');
      if (portal) portal.ventana();
      setTimeout(() => {
        pre.classList.add('is-out');
        if (!portal) {
          startHero();
          setTimeout(liberar, 850);
          return;
        }
        portal.abrir(1050, () => {
          pre.classList.add('is-fin');
          startHero();
          setTimeout(liberar, 480);
        });
      }, 950);
    };
    const timer = setTimeout(leave, 3700); // el logo completo (y los servicios) se quedan en pantalla un momento
    const skip = () => { clearTimeout(timer); leave(); };
    pre.addEventListener('click', skip, { once: true });
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); }, { once: true });
  } else {
    startHero();
  }


  /* ─── 03. SCROLL SUAVE (LENIS) Y ANCLAS ─────────────────── */
  const header = $('#header');
  let lenis = null;
  if (rich && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    if (root.classList.contains('is-loading')) lenis.stop(); // se reanuda al terminar la entrada
    // Las anclas internas viajan con el mismo scroll suave
    doc.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      const id = a.getAttribute('href');
      const target = id.length > 1 && $(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === '#inicio' ? 0 : -(header.offsetHeight + 8), duration: 1.4 });
      history.pushState(null, '', id);
      if (target.matches('[tabindex="-1"]')) target.focus({ preventScroll: true });
    });
  }


  /* ─── 04. HEADER, MENÚ Y SECCIÓN ACTIVA ─────────────────── */
  const menu = $('#menu');
  const menuBtn = $('#menu-btn');
  const menuLabel = $('.header__menu-label', menuBtn);
  const setMenu = (open) => {
    menu.hidden = !open;
    header.classList.toggle('is-open', open);
    doc.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Cerrar' : 'Menú';
    // Con el menú abierto, lo de atrás no recibe foco ni clics
    ['#contenido', '.footer', '[data-mbar]', '.wa-float'].forEach((s) => { const el = $(s); if (el) el.inert = open; });
    if (lenis) (open ? lenis.stop() : lenis.start());
    if (open) $('a', menu).focus();
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia('(min-width: 1240px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  const navLinks = $$('[data-liquid-nav] a'); // menú del header y barra inferior del celular
  // Sección activa = la que cruza la franja central de la pantalla (se decide con el conjunto, así los saltos
  // instantáneos, como Inicio/Fin, no la confunden). Entre secciones sin enlace se queda la última.
  const enBanda = new Set();
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? enBanda.add(e.target) : enBanda.delete(e.target)));
    if (!enBanda.size) return;
    const id = [...enBanda].pop().id;
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.hash === `#${id}`)));
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = $(a.hash); if (s) sectionIO.observe(s); });
  if ($('#inicio')) sectionIO.observe($('#inicio')); // en el hero ninguna opción queda activa


  /* ─── 05. BUCLE DE SCROLL ───────────────────────────────── */
  // Un solo listener (Lenis también dispara `scroll` nativo). Solo se escriben transform, opacity y variables CSS.
  const progress = $('.progress');
  const mbar = $('[data-mbar]');
  const hero = $('#inicio');
  const brecha = $('[data-brecha]');
  const gapEl = brecha && $('[data-estudio]', brecha); // el perfil que se construye
  const steps = brecha ? $$('.brecha__step', brecha) : [];
  const tlBox = $('[data-tl]');
  const gal = $('[data-gallery]:not([hidden])'); // la galería puede estar oculta (hidden)
  const galTrack = $('[data-gallery-track]');
  const gpPortal = $('[data-gp]'); // portal de letra de Servicios: su acercamiento oculta las barras un momento

  // La brecha se fija (sticky) en pantallas amplias: las frases arman el perfil al avanzar con el scroll. En las
  // chicas se lee en lista y los pasos llegan solos al verla.
  // (en tabletas el texto va arriba del celular y no caben los dos: ahí la escena corre sola, como en el celular)
  const pinBrecha = !reduce && innerWidth >= 960 && innerHeight >= 600;
  if (brecha && pinBrecha) brecha.classList.add('is-pinned');
  // --g (qué tan derecho está el celular) es una propiedad registrada que NO se hereda (css: @property --g): se escribe
  // solo en los elementos que la usan. Heredada desde la figura, cada cuadro del scroll obligaba a recalcular el
  // estilo de los ~800 elementos del celular (tirones al bajar y al regresar a la portada).
  const gUsan = gapEl ? [gapEl].concat([...gapEl.querySelectorAll('.estudio__tel, .estudio__sombra, .estudio__pantalla')]) : [];
  const escribirG = (s) => gUsan.forEach((el) => el.style.setProperty('--g', s));
  if (gapEl && !reduce) escribirG('0');
  // --g solo se escribe si cambió; ya derecho, el celular se dibuja plano (nítido)
  let gAntes = '';
  const ponerG = (g) => {
    const s = g.toFixed(3);
    if (s === gAntes) return;
    gAntes = s;
    escribirG(s);
    gapEl.classList.toggle('is-plano', g >= 0.999);
    alPixel();
  };
  // Alineación al píxel físico: con el celular derecho y la escena fija, se corrige la fracción de píxel de su posición
  const telEl = gapEl && $('.estudio__tel', gapEl);
  let pixelRaf = 0;
  function alPixel() {
    if (!telEl) return;
    cancelAnimationFrame(pixelRaf);
    telEl.style.translate = '';
    if (!gapEl.classList.contains('is-plano') || !pinBrecha) return;
    pixelRaf = requestAnimationFrame(() => {
      const r = telEl.getBoundingClientRect();
      const d = devicePixelRatio || 1;
      const dx = (Math.round(r.left * d) - r.left * d) / d;
      const dy = (Math.round(r.top * d) - r.top * d) / d;
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) telEl.style.translate = `${dx.toFixed(3)}px ${dy.toFixed(3)}px`;
    });
  }
  window.addEventListener('resize', alPixel, { passive: true });
  const CORTE = 0.59; // parte del tramo fijado en la que las frases arman el perfil; el resto, el celular corre solo
  // Con el perfil listo (paso 3) el celular corre solo, como un video (CICLO ms por vuelta, en bucle mientras se ve):
  // toca el aro → historias → desliza hacia abajo y vuelve al perfil → toca el reel → reel (video real) con doble toque →
  // sale al inicio → toca la web → la recorre → sale → toca el calendario → calendario con las sesiones agendadas.
  // Cada tramo: [pantalla, fracción de la vuelta, gestos [desde, hasta, nombre] dentro del tramo].
  const CICLO = 40000;
  const TRAMOS = [
    ['perfil', 0.08, [[0.74, 1, 'avatar']]],
    ['stories', 0.17, [[0.9, 1, 'baja']]],
    ['perfil', 0.075, [[0.7, 1, 'post']]],
    ['reel', 0.125, [[0.22, 0.6, 'doble'], [0.88, 1, 'casa']]], // el reel, corto: un doble toque y a la web
    ['inicio', 0.085, [[0.66, 1, 'web']]], // el inicio del iPhone se alcanza a ver antes de tocar
    ['web', 0.21, [[0.2, 0.86, 'desliza'], [0.91, 1, 'casa']]],
    ['inicio', 0.085, [[0.66, 1, 'cal']]],
    ['calendario', 0.17, []],
  ];
  const DESLIZA = { de: 0.2, a: 0.86, veces: 5 }; // la portada se alcanza a ver; luego la web baja en cinco deslizadas
  const SERVICIO = { perfil: 'redes', stories: 'redes', reel: 'redes', web: 'web', calendario: 'estrategia' };
  const cel = (() => {
    if (!gapEl) return { ir() {}, ver() {} };
    const pant = $('.estudio__pantalla', gapEl);
    const dedo = $('[data-estudio-dedo]', gapEl);
    const video = $('[data-reel-video]', gapEl);
    const pagina = $('[data-web-pagina]', gapEl);
    const vista = pagina && pagina.parentElement;
    const puntos = {};
    let largoWeb = 0;
    gapEl.style.setProperty('--t-desliza', `${Math.round(CICLO * TRAMOS[5][1] * (DESLIZA.a - DESLIZA.de) / DESLIZA.veces)}ms`);
    // Dónde está cada cosa que se toca, relativo a la pantalla (con offsets: no les afecta la inclinación del celular).
    // De ahí salen el lugar del dedo y los recortes desde los que se abre cada app (--o-*).
    const caja = (el) => {
      let x = 0;
      let y = 0;
      let n = el;
      while (n && n !== pant) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };
    const medir = () => {
      const W = pant ? pant.clientWidth : 0;
      const H = pant ? pant.clientHeight : 0;
      if (!W) return;
      const px = (v) => `${v.toFixed(1)}px`;
      $$('[data-toca]', gapEl).forEach((el) => {
        const b = caja(el);
        const k = el.dataset.toca;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        puntos[k] = [cx, cy];
        if (k === 'avatar') {
          gapEl.style.setProperty('--o-avatar', `circle(${px(b.w / 2)} at ${px(cx)} ${px(cy)})`);
          gapEl.style.setProperty('--o-avatar-lleno', `circle(${px(Math.hypot(W, H))} at ${px(cx)} ${px(cy)})`);
        } else {
          const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
          gapEl.style.setProperty(`--o-${k}`, `inset(${px(b.y)} ${px(W - b.x - b.w)} ${px(H - b.y - b.h)} ${px(b.x)} round ${px(r)})`);
        }
      });
      puntos.doble = [W * 0.5, H * 0.45];
      puntos.baja = [W * 0.5, H * 0.3];
      puntos.casa = [W * 0.5, H - W * 0.05];
      puntos.desliza = [W * 0.62, H * 0.74];
      if (pagina && vista) largoWeb = Math.max(0, pagina.scrollHeight - vista.clientHeight);
    };
    medir();
    window.addEventListener('resize', medir, { passive: true });
    window.addEventListener('load', medir);
    // Calendario del mes en curso (lunes primero): lunes, miércoles y viernes se publica; dos días son sesión de fotos y video
    const hoy = new Date();
    const mes = $('[data-cal-mes]', gapEl);
    if (mes) mes.textContent = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(hoy);
    const hoyTxt = $('[data-cal-hoy]', gapEl);
    if (hoyTxt) hoyTxt.textContent = `Hoy · ${new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(hoy)}`;
    const ano = $('[data-cal-ano]', gapEl);
    if (ano) ano.textContent = hoy.getFullYear();
    const dias = $('[data-cal-dias]', gapEl);
    if (dias) {
      const primero = (new Date(hoy.getFullYear(), hoy.getMonth(), 1).getDay() + 6) % 7;
      const total = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      const tipos = ['Reel', 'Post', 'Story'];
      let k = 0;
      let p = 0;
      let sesiones = 0;
      for (let i = 0; i < primero; i++) dias.append(doc.createElement('i'));
      for (let d = 1; d <= total; d++) {
        const c = doc.createElement('i');
        const sem = (primero + d - 1) % 7;
        let tipo = '';
        if (sem === 0 || sem === 2 || sem === 4) tipo = tipos[p++ % 3];
        else if ((sesiones === 0 && sem === 1 && d > 7) || (sesiones === 1 && sem === 3 && d > 14)) { tipo = 'Sesión'; sesiones++; }
        c.textContent = d;
        if (d === hoy.getDate()) c.classList.add('is-hoy');
        if (tipo) { c.classList.add('is-pub'); c.dataset.tipo = tipo; c.style.setProperty('--k', k++); }
        dias.append(c);
      }
    }
    // Inicio del iPhone: el día de hoy en el widget de agenda y en el ícono del calendario
    $$('[data-ini-dia]', gapEl).forEach((el) => { el.textContent = hoy.getDate(); });
    $$('[data-ini-sem]', gapEl).forEach((el) => { el.textContent = new Intl.DateTimeFormat('es-MX', { weekday: el.dataset.iniSem }).format(hoy).replace('.', ''); });
    // El reel es un video real: corre solo con su pantalla abierta y la escena a la vista; la barra sigue al video
    let viendo = false;
    let vRaf = 0;
    const barraVideo = $('.reel__barra i', gapEl);
    const vPinta = () => {
      if (video.duration && barraVideo) barraVideo.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
      vRaf = requestAnimationFrame(vPinta);
    };
    const reel = () => {
      if (!video) return;
      const on = viendo && gapEl.dataset.pantalla === 'reel';
      if (on && video.paused) {
        const pr = video.play();
        if (pr) pr.catch(() => {});
        if (!vRaf) vRaf = requestAnimationFrame(vPinta);
      } else if (!on && !video.paused) {
        cancelAnimationFrame(vRaf);
        vRaf = 0;
        video.pause();
      }
    };
    let pantallaAntes = '';
    let gestoAntes = '';
    // Fluidez: en cada cuadro solo se escribe lo que cambió, y el avance (--lp) va en la app que lo usa (historias o
    // calendario), no en todo el celular: así el navegador no recalcula cientos de elementos por cuadro
    const estado = {};
    const fijar = (k, v) => { const s = String(v); if (estado[k] !== s) { estado[k] = s; gapEl.dataset[k] = s; } };
    const APP_LP = { stories: $('.app--stories', gapEl), calendario: $('.app--calendario', gapEl) };
    const lpAntes = {};
    let webAntes = '';
    const ir = (t) => {
      let a = 0;
      let i = 0;
      while (i < TRAMOS.length - 1 && t >= a + TRAMOS[i][1]) { a += TRAMOS[i][1]; i++; }
      const [pantalla, dur, gestos] = TRAMOS[i];
      const lp = clamp((t - a) / dur);
      if (pantalla !== pantallaAntes) {
        const deReel = pantallaAntes === 'reel';
        pantallaAntes = pantalla;
        medir();
        gapEl.dataset.pantalla = pantalla;
        if (pantalla === 'reel' && video) {
          try { video.currentTime = 0; } catch (err) { /* aún sin datos */ }
          reel();
        }
        if (deReel) setTimeout(reel, 620); // sigue corriendo mientras el reel se cierra hacia su ícono
      }
      const app = APP_LP[pantalla]; // cada app conserva su avance mientras se cierra
      const lpTxt = lp.toFixed(3);
      if (app && lpAntes[pantalla] !== lpTxt) { lpAntes[pantalla] = lpTxt; app.style.setProperty('--lp', lpTxt); }
      if (pantalla === 'stories') fijar('st', Math.min(2, Math.floor(lp * 3)));
      fijar('visto', i >= 2 ? '1' : '0');
      fijar('servicio', SERVICIO[pantalla] || ''); // la etiqueta de afuera: lo que hacemos en esa app
      // Notificaciones de iOS: en el inicio llega un "me encanta" del reel; en el calendario, el aviso de la sesión
      fijar('banner', i === 4 && lp > 0.06 && lp < 0.6 ? 'like' : pantalla === 'calendario' && lp > 0.55 && lp < 0.95 ? 'sesion' : '');
      fijar('likeado', pantalla === 'reel' && lp > 0.32 ? '1' : '0');
      fijar('latido', pantalla === 'reel' && lp > 0.32 && lp < 0.58 ? '1' : '0');
      let gesto = '';
      gestos.forEach(([d, h, g]) => { if (lp >= d && (lp < h || h === 1)) gesto = g; });
      if (gesto !== gestoAntes) {
        gestoAntes = gesto;
        const pt = puntos[gesto];
        if (dedo && pt) { dedo.style.left = `${pt[0].toFixed(1)}px`; dedo.style.top = `${pt[1].toFixed(1)}px`; }
        gapEl.dataset.dedo = gesto;
      }
      if (pantalla === 'web' && pagina) {
        // La página baja a saltos, uno por deslizada: rápido al soltar y luego se frena, como en el teléfono
        const k = clamp((lp - DESLIZA.de) / (DESLIZA.a - DESLIZA.de)) * DESLIZA.veces;
        const n = Math.min(DESLIZA.veces - 1, Math.floor(k));
        const f = clamp((k - n) / 0.62);
        const y = (n + 1 - Math.pow(1 - f, 3)) / DESLIZA.veces;
        const tr = `translate(0, ${-Math.round(y * largoWeb)}px)`; // píxeles enteros: el texto no se desenfoca
        if (tr !== webAntes) { webAntes = tr; pagina.style.transform = tr; }
      }
    };
    let decodificadas = false;
    const ver = (v) => {
      viendo = v;
      if (v && !decodificadas && pant) {
        decodificadas = true;
        $$('img', pant).forEach((im) => { im.loading = 'eager'; if (im.decode) im.decode().catch(() => {}); });
      }
      if (v && video && video.preload !== 'auto') video.preload = 'auto';
      reel();
    };
    return { ir, ver };
  })();
  // El "video" del celular avanza con el reloj (no con el scroll) mientras se ve; se reinicia si se vuelve a armar el perfil
  const tour = (() => {
    if (!gapEl || reduce) return { iniciar() {}, parar() {} };
    let activo = false;
    let viendo = false;
    let acum = 0;
    let ultimo = 0;
    let raf = 0;
    const cuadro = (now) => {
      if (!activo || !viendo) { raf = 0; return; }
      acum += Math.min(80, now - (ultimo || now));
      ultimo = now;
      cel.ir((acum % CICLO) / CICLO);
      raf = requestAnimationFrame(cuadro);
    };
    const mover = () => { if (activo && viendo && !raf) { ultimo = 0; raf = requestAnimationFrame(cuadro); } };
    new IntersectionObserver(([e]) => { viendo = e.isIntersecting; cel.ver(viendo); mover(); }, { threshold: 0.25 }).observe(gapEl);
    return {
      iniciar() { if (!activo) { activo = true; acum = 0; mover(); } },
      parar() { if (activo) { activo = false; acum = 0; cel.ir(0); } },
    };
  })();
  // Reacciones alrededor del celular mientras se ve, en todos los momentos (perfil, historias, reel, inicio, web y
  // calendario): corazones, "me gusta" y comentarios, a los dos lados del celular. Usuarios y textos son ejemplos
  // (ninguno es una persona real); cada usuario lleva su color en el avatar y en el nombre.
  // Con lugar a los lados (escritorio y tableta): los corazones flotan sobre la orilla del celular y los globos
  // (comentarios, me gusta, avisos) justo afuera, cada uno en su carril y turnando alturas, así nunca se enciman entre
  // sí ni tapan la app. A la izquierda no pasan del centro de la pantalla (ahí empieza la mitad blanca).
  (() => {
    const caja = gapEl && $('[data-estudio-reac]', gapEl);
    if (!caja || reduce) return;
    const IG = [
      ['sofi.come.rico', '#D6336C', '¡Qué rico se ve! 😍'], ['el_charly.mx', '#0B7A6F', 'Ya quiero ir 🙌'],
      ['ana.cafecito', '#C2410C', 'Ese espresso 🤤🔥'], ['dani.viajero', '#6741D9', '¡Qué buena pinta!'],
      ['lu.antojos', '#1864AB', 'Guardado para el finde ✨'], ['memo.foodie', '#2B8A3E', '¿Tienen mesa hoy?'],
      ['pau.foodlover', '#AE3EC9', 'Necesito probar eso 😋'], ['jorge.cocina', '#E8590C', 'Qué presentación 👌'],
      ['mari.sabores', '#0C8599', 'Me encanta su estilo ✨'], ['toño.mx', '#5C940D', '¡Vamos este fin! 🙌'],
    ];
    const WEB = [
      ['vale.gourmet', '#D6336C', '¡Qué gran página! 👏'], ['rodrigo.mx', '#0B7A6F', 'Se ve súper profesional 🔥'],
      ['caro_viaja', '#6741D9', 'Reservé súper fácil ✨'], ['beto.eats', '#C2410C', 'El menú se ve increíble 😍'],
      ['ale.dev', '#1971C2', 'Carga rapidísimo ⚡'], ['nati.design', '#C2255C', 'Qué bonito diseño 😍'],
    ];
    const CAL = [
      ['ona.studiosc', '#0022D6', 'Sesión de fotos agendada 📸'], ['tu_marca', '#C2410C', '¡Perfecto! Ahí los esperamos 🙌'],
      ['ona.studiosc', '#0022D6', 'Sesión de video confirmada 🎬'], ['ona.studiosc', '#0022D6', 'Reels de la semana programados ✓'],
      ['tu_marca', '#C2410C', '¡Qué rápido quedó todo! ✨'], ['ona.studiosc', '#0022D6', 'Historias listas para el viernes ✓'],
    ];
    const FANS = [['sofi.come.rico', '#D6336C'], ['ana.cafecito', '#C2410C'], ['lu.antojos', '#1864AB'], ['memo.foodie', '#2B8A3E'],
      ['pau.foodlover', '#AE3EC9'], ['mari.sabores', '#0C8599'], ['dani.viajero', '#6741D9'], ['vale.gourmet', '#D6336C']];
    const GUSTA = { perfil: 'le gustó tu publicación', stories: 'reaccionó a tu historia', reel: 'le gustó tu reel', inicio: 'comenzó a seguirte', web: 'le gustó tu página', calendario: 'guardó tu publicación' };
    const AVISOS = ['Te escribieron por WhatsApp 💬', 'Nueva reserva desde tu web 📅'];
    const CORAZON = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10Z"/></svg>';
    // Cada globo aparta toda la franja que recorre en su vida (sube 64 px en 2.8 s): uno nuevo solo sale donde no toca a
    // ningún globo vivo de ese lado ni a la etiqueta de "Lo que hacemos"; si no hay lugar, espera al siguiente turno.
    const VIDA = 2800, SUBE = 64, AIRE = 10;
    const vivos = { der: [], izq: [] };
    let n = 0, timer = 0, ladoGlobo = 0, ladoCorazon = 0, giro = 0;
    const caja2 = (el) => { const a = el.getBoundingClientRect(); const c = caja.getBoundingClientRect(); return { top: a.top - c.top, bottom: a.bottom - c.top, left: a.left - c.left, right: a.right - c.left }; };
    const telBorde = () => {
      const rc = caja.getBoundingClientRect();
      const tel = $('.estudio__tel', gapEl).getBoundingClientRect();
      return { rc, izq: tel.left - rc.left, der: tel.right - rc.left };
    };
    // Busca una altura libre para un globo de alto h en ese lado (en px dentro de la caja), o null si no cabe
    const hueco = (lado, h, alto, prohibidas) => {
      const ahora = performance.now();
      vivos[lado] = vivos[lado].filter((v) => ahora - v.t < VIDA);
      const ocupadas = vivos[lado].map((v) => [v.y - SUBE - AIRE, v.y + v.h + 16 + AIRE]).concat(prohibidas);
      const pasos = 18, desde = alto * 0.08, hasta = alto * 0.92 - h - 16;
      giro = (giro + 7) % pasos;
      for (let k = 0; k < pasos; k++) {
        const y = desde + ((k + giro) % pasos) / (pasos - 1) * (hasta - desde);
        const franja = [y - SUBE, y + h + 16];
        if (franja[0] < 4) continue;
        if (ocupadas.every(([a, b]) => franja[1] < a || franja[0] > b)) return y;
      }
      return null;
    };
    const lanzar = (tipo, html, color) => {
      const r = doc.createElement('span');
      r.className = `reac reac--${tipo}`;
      r.innerHTML = html;
      if (color) r.style.setProperty('--uc', color);
      const ancho = caja.offsetWidth >= 420;
      const alto = caja.offsetHeight;
      if (tipo === 'corazon') {
        if (!ancho) {
          const lado = Math.random() < 0.5;
          r.style.setProperty('--x', `${lado ? -4 + Math.random() * 14 : 70 + Math.random() * 18}%`);
          r.style.setProperty('--y', `${30 + Math.random() * 50}%`);
          r.style.setProperty('--dx', `${(lado ? -1 : 1) * Math.round(Math.random() * 18)}px`);
        } else {
          // flotan sobre la orilla del celular (como los corazones de un en vivo), sin llegar al carril de los globos
          const b = telBorde();
          const izq = ladoCorazon++ % 2 === 0;
          r.style.setProperty('--x', `${izq ? b.izq - 16 + Math.random() * 4 : b.der - 22 - Math.random() * 4}px`);
          r.style.setProperty('--y', `${24 + Math.random() * 64}%`);
          r.style.setProperty('--dx', '0px');
        }
        r.addEventListener('animationend', () => r.remove());
        caja.append(r);
        return;
      }
      // Globos (comentarios, me gusta, avisos)
      r.style.visibility = 'hidden';
      r.style.setProperty('--dx', '0px');
      r.style.width = 'max-content';
      caja.append(r);
      const etiqueta = $('.estudio__servicio', gapEl);
      let lados, lugar = null;
      if (ancho) {
        const b = telBorde();
        const libreDer = innerWidth - 14 - (b.rc.left + b.der + 24);
        const tope = innerWidth >= 960 ? innerWidth / 2 + 12 : 10; // la mitad blanca empieza en el centro
        const libreIzq = b.rc.left + b.izq - 24 - tope;
        lados = (ladoGlobo++ % 2 === 0 ? ['der', 'izq'] : ['izq', 'der']).filter((l) => (l === 'der' ? libreDer : libreIzq) >= 118);
        for (const lado of lados) {
          r.style.maxWidth = `${Math.round(Math.max(118, Math.min(200, lado === 'der' ? libreDer : libreIzq)))}px`;
          const h = r.offsetHeight;
          const prohibidas = [];
          if (lado === 'der' && etiqueta) { const e = caja2(etiqueta); prohibidas.push([e.top - AIRE, e.bottom + AIRE]); }
          const y = hueco(lado, h, alto, prohibidas);
          if (y !== null) { lugar = { lado, y, h }; break; }
        }
        if (lugar) {
          if (lugar.lado === 'der') r.style.setProperty('--x', `${b.der + 24}px`);
          else { r.classList.add('reac--izq'); r.style.left = 'auto'; r.style.right = `${b.rc.width - (b.izq - 24)}px`; }
        }
      } else {
        // Celular: alrededor del celular, a los dos lados, sin encimarse entre sí ni con la etiqueta
        lados = ladoGlobo++ % 2 === 0 ? ['der', 'izq'] : ['izq', 'der'];
        for (const lado of lados) {
          const h = r.offsetHeight;
          const prohibidas = [];
          if (etiqueta) { const e = caja2(etiqueta); prohibidas.push([e.top - AIRE, e.bottom + AIRE]); }
          const y = hueco(lado, h, alto, prohibidas);
          if (y !== null) { lugar = { lado, y, h }; break; }
        }
        if (lugar) {
          if (lugar.lado === 'izq') r.style.setProperty('--x', '-4%');
          else { r.style.left = 'auto'; r.style.right = '2%'; }
        }
      }
      if (!lugar) { r.remove(); return; } // sin lugar libre: se salta este turno
      vivos[lugar.lado].push({ y: lugar.y, h: lugar.h, t: performance.now() });
      r.style.setProperty('--y', `${lugar.y}px`);
      r.style.visibility = '';
      r.addEventListener('animationend', () => r.remove());
    };
    const comentar = ([u, color, txt]) => {
      const av = u === 'ona.studiosc' ? '<img src="assets/img/ona-isotipo-cream.svg" alt="" width="11" height="14">' : u[0].toUpperCase();
      lanzar('comentario', `<i>${av}</i><span><b>${u}</b>${txt}</span>`, color);
    };
    const gustar = (pantalla, k) => {
      const [u, color] = de(FANS, k);
      lanzar('like', `<i>${CORAZON}</i><span><b>${u}</b> ${GUSTA[pantalla] || GUSTA.perfil}</span>`, color);
    };
    const de = (lista, k) => lista[k % lista.length];
    const tic = () => {
      n++;
      if (gapEl.dataset.paso !== '3') return;
      const p = gapEl.dataset.pantalla || 'perfil';
      if (p === 'perfil' || p === 'stories' || p === 'reel') {
        lanzar('corazon', CORAZON);
        if (n % 2 === 0) comentar(de(IG, n / 2 | 0));
        else if (n % 3 === 0) gustar(p, n / 3 | 0);
      } else if (p === 'inicio') {
        if (n % 2 === 0) gustar(p, n / 2 | 0);
        else lanzar('corazon', CORAZON);
      } else if (p === 'web') {
        if (n % 2 === 0) comentar(de(WEB, n / 2 | 0));
        else if (n % 5 === 1) lanzar('aviso', de(AVISOS, n / 5 | 0));
        else if (n % 5 === 3) gustar(p, n);
        else lanzar('corazon', CORAZON);
      } else if (p === 'calendario') {
        if (n % 2 === 0) comentar(de(CAL, n / 2 | 0));
        else if (n % 3 === 0) lanzar('corazon', CORAZON);
      }
    };
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) timer = setInterval(tic, 650);
    }, { threshold: 0.3 }).observe(gapEl);
  })();
  // Sin fijar (celular, pantallas bajas): los pasos llegan solos al ver la escena y luego corre el video del celular;
  // con movimiento reducido, completa y quieta
  if (gapEl && reduce) { gapEl.dataset.paso = 3; gapEl.dataset.pantalla = 'perfil'; gapEl.dataset.servicio = 'redes'; gapEl.classList.add('is-plano'); }
  else if (gapEl && !pinBrecha) {
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      [1, 2, 3].forEach((k, i) => setTimeout(() => { gapEl.dataset.paso = k; }, 700 + i * 1500));
      setTimeout(() => tour.iniciar(), 5200);
    }, { threshold: 0.3 }).observe(gapEl);
  }

  // La galería se fija y avanza en horizontal en escritorio; en móvil se desliza con el dedo.
  const pinGal = !reduce && !lowEnd && innerWidth >= 960;
  let galDist = 0;
  const sizeGallery = () => {
    if (!pinGal || !gal) return;
    gal.classList.add('is-pinned');
    galDist = Math.max(0, galTrack.scrollWidth - innerWidth);
    gal.style.height = `${innerHeight + galDist}px`;
  };
  sizeGallery();
  // Las fotos de la galería quedan fuera de pantalla en horizontal: se cargan cuando la sección se acerca
  if (gal) new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    $$('img[loading="lazy"]', gal).forEach((img) => { img.loading = 'eager'; });
    obs.disconnect();
  }, { rootMargin: '150% 0px' }).observe(gal);

  // Cómo trabajamos: la línea de tiempo se queda fija (sticky) mientras el cabezal avanza a lo largo de
  // ~1.8 pantallas de scroll, para que las imágenes cambien con calma. Solo si cabe completa en la pantalla.
  const trab = $('#como-trabajamos');
  const tlPin = $('[data-tl-pin]');
  let pinTl = false;
  const sizeTl = () => {
    if (!tlPin || !tlBox || reduce) return;
    trab.classList.add('is-pinned');
    const h = tlBox.offsetHeight;
    pinTl = h <= innerHeight - header.offsetHeight - 28;
    if (pinTl) tlPin.style.setProperty('--tl-h', `${h}px`);
    else { trab.classList.remove('is-pinned'); tlPin.style.removeProperty('--tl-h'); }
  };
  sizeTl();

  // Las luces animadas de la portada, la visión y el cierre (y el brillo del título de Por qué Ona) se pausan fuera de pantalla
  const offIO = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)));
  [hero, $('#vision'), $('#como-trabajamos'), $('#por-que'), $('#calculadora'), $('#preguntas'), $('#contacto'), $('.incluye'), $('.footer')].forEach((el) => el && offIO.observe(el));

  let activeStep = -1;
  const depthMarks = [25, 50, 75, 100];
  let tlFollowScroll = true;

  // Medidas que solo cambian al redimensionar o al cargar contenido: no se leen en cada cuadro
  const dims = { docH: 0, heroH: 400, headerH: 80, tlH: 0, galH: 0 };
  const measure = () => {
    dims.docH = root.scrollHeight;
    dims.heroH = hero ? hero.offsetHeight : 400;
    dims.headerH = header.offsetHeight;
    dims.tlH = tlBox ? tlBox.offsetHeight : 0;
    dims.galH = gal ? gal.offsetHeight : 0;
    // Recorrido del portal (alto de su pantalla × 1.6, el scrollLength con el que se monta)
    dims.gpTravel = gpPortal && gpPortal.dataset.gpMotion === 'on' ? parseFloat(getComputedStyle(gpPortal).getPropertyValue('--gp-height')) * 1.6 : 0;
  };
  measure();
  if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(doc.body);

  function onScroll() {
    // 1) Lecturas, todas juntas (así el navegador no recalcula el layout a media función)
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = dims.docH - vh;
    const rGap = gapEl && !reduce ? (pinBrecha ? brecha : gapEl).getBoundingClientRect() : null;
    const rTl = tlBox && tlFollowScroll && !reduce ? (pinTl ? tlPin : tlBox).getBoundingClientRect() : null;
    const rGal = pinGal && gal ? gal.getBoundingClientRect() : null;
    const rGp = dims.gpTravel ? gpPortal.getBoundingClientRect() : null;

    // 2) Escrituras
    if (progress) progress.style.setProperty('--prog', max > 0 ? (y / max).toFixed(4) : 0);

    // Header y barra inferior: siempre visibles. Solo se ocultan mientras la cámara del portal de Servicios
    // entra por la letra (pantalla completa) y vuelven cuando aparece el contenido.
    const gpP = rGp ? clamp(-rGp.top / dims.gpTravel) : 0;
    const inmersivo = gpP > 0.03 && gpP < 0.9 && menu.hidden;
    header.classList.toggle('is-scrolled', y > 24);
    header.classList.toggle('is-hidden', inmersivo);

    // La brecha: --g (0 → 1) y paso activo
    if (rGap) {
      if (pinBrecha) {
        // Primer tramo (CORTE): las frases arman el perfil con el scroll. Con el perfil listo, el celular corre solo
        const p = clamp(-rGap.top / (rGap.height - vh));
        const q = clamp(p / CORTE);
        ponerG(clamp(q / 0.72)); // derecho por completo antes del último paso: el recorrido corre con el celular plano (nítido)
        const step = Math.min(steps.length - 1, Math.floor(q * steps.length * 1.02));
        if (step !== activeStep) {
          activeStep = step;
          steps.forEach((s, i) => s.classList.toggle('is-active', i === step));
          gapEl.dataset.paso = step; // cada frase enciende su parte de la escena
          if (step === steps.length - 1) tour.iniciar(); else tour.parar();
        }
      } else {
        ponerG(clamp((vh * 0.9 - rGap.top) / (vh * 0.3)));
      }
    }

    // Línea de tiempo: con la sección fijada, el cabezal recorre ~1.8 pantallas de scroll
    if (rTl) {
      if (pinTl) setTl(clamp((dims.headerH + 14 - rTl.top) / Math.max(1, rTl.height - dims.tlH)));
      else setTl(clamp((vh * 0.8 - rTl.top) / (rTl.height + vh * 0.35)));
    }

    // Galería horizontal fijada (un tramo de reposo al inicio y al final)
    if (rGal) {
      const p = clamp((-rGal.top / Math.max(1, dims.galH - vh) - 0.08) / 0.84);
      galTrack.style.transform = `translate3d(${(-p * galDist).toFixed(1)}px, 0, 0)`;
    }

    if (mbar) mbar.classList.toggle('is-on', menu.hidden && !inmersivo);

    const pct = max > 0 ? (y / max) * 100 : 100;
    while (depthMarks.length && pct >= depthMarks[0] - 0.5) track('scroll_depth', { porcentaje: depthMarks.shift() });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { sizeGallery(); sizeTl(); measure(); if (hasGsap) ST.refresh(); onScroll(); }, 150);
  });


  /* ─── 06. REVELADOS, SCRAMBLE Y PARALLAX ────────────────── */
  // Texto que se "descifra": letras al azar que se asientan de izquierda a derecha
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+';
  const scramble = (el) => {
    if (reduce || el.dataset.busy) return;
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    el.dataset.busy = '1';
    let frame = 0;
    const total = 16;
    const tick = () => {
      const shown = Math.floor((frame / total) * final.length);
      el.textContent = [...final].map((c, i) => (i < shown || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (frame++ < total) requestAnimationFrame(tick);
      else { el.textContent = final; delete el.dataset.busy; }
    };
    tick();
  };
  $$('[data-scramble]').forEach((a) => {
    const txt = $('.nimbus-label', a) || a; // en el menú líquido solo se revuelve la etiqueta, no el ícono
    a.setAttribute('aria-label', txt.textContent.trim()); // los lectores de pantalla leen el texto final, nunca el revuelto
    if (fine) a.addEventListener('mouseenter', () => scramble(txt));
  });

  const revealIO = new IntersectionObserver((entries, obs) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    if (entry.target.hasAttribute('data-scramble-in')) scramble(entry.target);
    obs.unobserve(entry.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .media-reveal, [data-scramble-in], [data-reveal-wordmark]').forEach((el) => (reduce ? el.classList.add('in') : revealIO.observe(el)));

  if (hasGsap && rich) {
    // Hero: las tarjetas se acercan apenas y el texto sube un poco (sin desvanecer: al regresar, la portada se ve completa)
    if ($('.hero__frags')) gsap.to('.hero__frags', { scale: 1.06, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    // Logos de la marca en el fondo: se desplazan más lento que el contenido
    $$('[data-mark]').forEach((mark) => {
      gsap.fromTo(mark, { yPercent: -14 }, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: mark.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Parallax interno en fotos enmarcadas
    $$('.media-reveal img, .stack__media img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, {
        yPercent: 7, scale: 1.16, ease: 'none',
        scrollTrigger: { trigger: img.closest('figure, .stack__media'), start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }
  if (hasGsap) {
    // Tarjetas apiladas: cada una entra inclinada, como una carta que se asienta; la que queda detrás se encoge;
    // el número gigante calado se desplaza más lento que la tarjeta
    const cards = $$('.stack__card');
    cards.forEach((card, i) => {
      if (i > 0) {
        gsap.fromTo(card, { rotateX: 9, yPercent: 5, transformPerspective: 1400 }, {
          rotateX: 0, yPercent: 0, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 40%', scrub: true },
        });
      }
      const num = $('.stack__gigante', card);
      if (num && rich) gsap.fromTo(num, { yPercent: -12 }, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, { scale: 0.94, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } });
    });
  }


  /* ─── 07. CURSOR Y BOTONES MAGNÉTICOS ───────────────────── */
  if (rich) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const ring = $('.cursor__ring', cursor);
    const dot = $('.cursor__dot', cursor);
    const label = $('.cursor__label', cursor);
    const move = hasGsap
      ? { rx: gsap.quickTo(ring, 'x', { duration: 0.14, ease: 'power2' }), ry: gsap.quickTo(ring, 'y', { duration: 0.14, ease: 'power2' }) }
      : null;
    window.addEventListener('pointermove', (e) => {
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; // el punto, sin retraso
      if (move) { move.rx(e.clientX); move.ry(e.clientY); }
      else ring.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    }, { passive: true });
    doc.addEventListener('pointerover', (e) => {
      const withLabel = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, summary, label, input, textarea, [role="slider"]');
      cursor.classList.toggle('is-label', !!withLabel && !interactive);
      cursor.classList.toggle('is-hover', !!interactive);
      if (withLabel) label.textContent = withLabel.dataset.cursor;
    });
    doc.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    doc.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    doc.addEventListener('pointerleave', () => { cursor.style.opacity = 0; });
    doc.addEventListener('pointerenter', () => { cursor.style.opacity = 1; });

    // Botones magnéticos: se acercan al puntero dentro de su área
    $$('[data-magnetic]').forEach((el) => {
      const mx = hasGsap ? gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }) : null;
      const my = hasGsap ? gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' }) : null;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        if (mx) { mx(x); my(y); } else el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { if (mx) { mx(0); my(0); } else el.style.transform = ''; });
    });
  }


  /* ─── 08. BENTO: SPOTLIGHT E INCLINACIÓN 3D ─────────────── */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach((tile) => {
      const edge = doc.createElement('span');
      edge.className = 'tile__edge';
      edge.setAttribute('aria-hidden', 'true');
      tile.append(edge);
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        tile.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        tile.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
        if (rich) {
          tile.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`);
          tile.style.setProperty('--ry', `${((px - 0.5) * 9).toFixed(2)}deg`);
        }
      });
      tile.addEventListener('pointerleave', () => { tile.style.setProperty('--rx', '0deg'); tile.style.setProperty('--ry', '0deg'); });
    });
    // --mx/--my: luz bajo el cursor (px) · --ux/--uy: hacia dónde se asoman los sellos de Por qué Ona (-1 a 1)
    $$('[data-spot]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
        card.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
        card.style.setProperty('--ux', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        card.style.setProperty('--uy', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--ux', 0); card.style.setProperty('--uy', 0); });
    });
  }


  /* ─── 09. CINTA CON VELOCIDAD SEGÚN EL SCROLL ───────────── */
  const marquee = $('[data-marquee]');
  if (marquee && !reduce) {
    root.classList.add('js-marquee'); // apaga la animación CSS de respaldo
    const mTrack = $('.marquee__track', marquee);
    let x = 0;
    let dir = 1;
    let prevY = window.scrollY;
    let running = false;
    let last = 0;
    let half = mTrack.scrollWidth / 2;
    window.addEventListener('resize', () => { half = mTrack.scrollWidth / 2; }, { passive: true });
    const loop = (t) => {
      if (!running) return;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      const dy = window.scrollY - prevY;
      prevY = window.scrollY;
      if (dy) dir = dy > 0 ? 1 : -1;
      x -= (0.06 + Math.min(1.6, Math.abs(dy) * 0.05)) * dt * dir;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      mTrack.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) { last = 0; prevY = window.scrollY; requestAnimationFrame(loop); }
    }).observe(marquee);
  }


  /* ─── 10. LÍNEA DE TIEMPO INTERACTIVA ───────────────────── */
  // Todas las pistas corren a la vez: el cabezal muestra qué está "en pantalla" en cada momento.
  const tlBody = $('[data-tl-body]');
  const tlScrub = $('[data-tl-scrub]');
  const tlClips = $$('.tl__clip');
  const tlScreens = $$('[data-tl-screen]'); // dos capas: la de enfrente y la que entra
  let tlFront = 0;
  let tlToken = 0;
  const tlNow = $('[data-tl-now]');
  const clipSpan = (c) => ({ s: parseFloat(c.style.getPropertyValue('--s')), l: parseFloat(c.style.getPropertyValue('--l')) });
  let tlLead = null;
  function setTl(v) {
    if (!tlBody) return;
    const p = clamp(v);
    const pc = p * 100;
    tlBody.style.setProperty('--p', p.toFixed(4));
    const on = tlClips.filter((c) => { const { s, l } = clipSpan(c); return pc >= s && pc <= s + l; });
    tlClips.forEach((c) => c.classList.toggle('is-on', on.includes(c)));
    const lead = on.reduce((a, c) => (!a || clipSpan(c).s > clipSpan(a).s ? c : a), null);
    const names = [...new Set(on.map((c) => c.textContent.trim()))];
    tlScrub.setAttribute('aria-valuenow', Math.round(pc));
    tlScrub.setAttribute('aria-valuetext', names.join(', ') || 'Sin clips');
    if (lead && lead !== tlLead) {
      tlLead = lead;
      tlNow.textContent = lead.textContent.trim();
      if (tlNow.animate && !reduce) tlNow.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      const token = ++tlToken;
      const next = tlScreens[1 - tlFront];
      const show = () => {
        if (token !== tlToken) return; // ya se pidió otra imagen
        tlScreens[tlFront].classList.remove('is-front');
        next.classList.add('is-front');
        tlFront = 1 - tlFront;
      };
      if (next.getAttribute('src') === lead.dataset.src && next.complete) show();
      else { next.onload = show; next.src = lead.dataset.src; }
    }
  }
  if (tlBody) {
    const lane = $('.tl__lane', tlBody);
    const fromX = (clientX) => { const r = lane.getBoundingClientRect(); return (clientX - r.left) / r.width; };
    let dragging = false;
    let startX = 0;
    let moved = false;
    tlBody.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true; moved = false; startX = e.clientX; tlFollowScroll = false;
      tlBody.setPointerCapture(e.pointerId);
    });
    tlBody.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 4) moved = true;
      if (moved) setTl(fromX(e.clientX));
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (!moved) { // toque sin arrastre: sobre un clip lo centra; sobre la regla, salta ahí
        const clip = doc.elementFromPoint(e.clientX, e.clientY)?.closest('.tl__clip');
        if (clip) { const { s, l } = clipSpan(clip); setTl((s + l / 2) / 100); } else setTl(fromX(e.clientX));
      }
      track('timeline_uso', { modo: moved ? 'arrastre' : 'toque' });
    };
    tlBody.addEventListener('pointerup', end);
    tlBody.addEventListener('pointercancel', () => { dragging = false; });
    tlClips.forEach((c) => c.addEventListener('click', (e) => {
      if (e.detail !== 0) return; // los clics de puntero ya se resolvieron en pointerup; esto es Enter/Espacio
      const { s, l } = clipSpan(c); tlFollowScroll = false; setTl((s + l / 2) / 100);
    }));
    tlScrub.addEventListener('keydown', (e) => {
      const cur = parseFloat(tlBody.style.getPropertyValue('--p')) || 0;
      const step = { ArrowRight: 0.02, ArrowUp: 0.02, ArrowLeft: -0.02, ArrowDown: -0.02, PageUp: 0.1, PageDown: -0.1 }[e.key];
      if (step !== undefined) { e.preventDefault(); tlFollowScroll = false; setTl(cur + step); }
      if (e.key === 'Home') { e.preventDefault(); tlFollowScroll = false; setTl(0); }
      if (e.key === 'End') { e.preventDefault(); tlFollowScroll = false; setTl(1); }
    });
    setTl(reduce ? 0.5 : 0);
  }


  /* ─── 11. ANTES/DESPUÉS ─────────────────────────────────── */
  // Consola de color (decorativa): el histograma RGB y las ruedas siguen a la línea (t = parte "sin edición" a la vista).
  // Sin edición: dominante amarilla y luces quemadas; con edición: tonos repartidos y ruedas casi al centro.
  const pintarConsola = (() => {
    const consola = $('[data-consola]');
    if (!consola) return () => {};
    const caminos = ['r', 'g', 'b'].map((c) => $(`.consola__${c}`, consola));
    const discos = $$('[data-rueda]', consola);
    const modo = $('[data-consola-modo]', consola);
    const CON = [[0.72, 165, 62], [0.74, 150, 60], [0.7, 138, 60]]; // [altura, centro, ancho] por canal
    const SIN = [[0.95, 214, 34], [0.82, 186, 36], [0.55, 104, 30]];
    const DISCO_CON = [[-2, 1], [1, -1], [2, 0]];
    const DISCO_SIN = [[-8, 9], [11, -7], [13, -10]];
    const mezcla = (a, b, k) => a + (b - a) * k;
    return (t) => {
      caminos.forEach((path, c) => {
        const [A, C, W] = CON[c].map((v, j) => mezcla(v, SIN[c][j], t));
        let d = 'M0 80';
        for (let x = 0; x <= 300; x += 6) {
          let y = A * Math.exp(-((x - C) ** 2) / (2 * W * W));
          if (c === 0 && x >= 288) y += t * 0.5; // luces quemadas: el rojo se amontona en el borde
          d += `L${x} ${(80 - y * 74).toFixed(1)}`;
        }
        path.setAttribute('d', `${d}L300 80Z`);
      });
      discos.forEach((dsc, i) => { dsc.style.translate = `${mezcla(DISCO_CON[i][0], DISCO_SIN[i][0], t).toFixed(1)}px ${mezcla(DISCO_CON[i][1], DISCO_SIN[i][1], t).toFixed(1)}px`; });
      if (modo) modo.textContent = t >= 0.72 ? 'Sin edición' : t <= 0.28 ? 'Con edición' : 'Comparando';
    };
  })();
  $$('[data-compare]').forEach((fig) => {
    const range = $('[data-compare-range]', fig);
    const set = () => {
      const v = Number(range.value);
      fig.style.setProperty('--pos', `${v}%`);
      fig.classList.toggle('is-before', v >= 72);
      fig.classList.toggle('is-after', v <= 28);
      range.setAttribute('aria-valuetext', `${Math.round(v)} % de la foto sin edición a la vista`);
      pintarConsola(v / 100);
    };
    range.addEventListener('input', () => { stopSweep(); set(); });
    range.addEventListener('change', () => track('comparador_uso', { posicion: Number(range.value) }));

    // Movimiento suave de la línea hacia un punto (0 = todo con edición, 100 = todo sin edición)
    let anim = 0;
    let sweepTimers = [];
    const goTo = (to, ms = 650) => {
      cancelAnimationFrame(anim);
      if (reduce) { range.value = to; set(); return; }
      const from = Number(range.value);
      const t0 = performance.now();
      const step = (now) => {
        const k = clamp((now - t0) / ms);
        range.value = from + (to - from) * (1 - Math.pow(1 - k, 3));
        set();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    const stopSweep = () => { sweepTimers.forEach(clearTimeout); sweepTimers = []; cancelAnimationFrame(anim); };
    // Barrido de muestra: enseña que la línea se mueve y deja ver los dos lados
    const sweep = () => {
      if (reduce) return;
      stopSweep();
      sweepTimers = [setTimeout(() => goTo(80, 700), 250), setTimeout(() => goTo(22, 1000), 1050), setTimeout(() => goTo(50, 700), 2200)];
    };
    range.step = 'any';
    set();

    const stage = $('.compare__stage', fig);
    let hoverTracked = false;
    if (fine) {
      stage.addEventListener('pointermove', (e) => {
        if (e.buttons || e.target.closest('button')) return;
        stopSweep();
        const r = stage.getBoundingClientRect();
        range.value = clamp((e.clientX - r.left) / r.width) * 100;
        set();
        if (!hoverTracked) { hoverTracked = true; track('comparador_uso', { modo: 'cursor' }); }
      });
    }
    $$('[data-compare-go]', fig).forEach((b) => b.addEventListener('click', () => {
      stopSweep();
      const to = Number(b.dataset.compareGo);
      goTo(Number(range.value) === to ? 50 : to); // un segundo toque regresa al centro
      track('comparador_uso', { modo: 'etiqueta', posicion: to });
    }));
    // Obturador (CSS .iris): el diafragma se cierra girando, dispara un flash, cambia el ejemplo y se abre.
    // Empieza cerrado: la primera vez que se ve se abre y la foto se revela de negativo a positivo.
    const iris = reduce ? null : $('.iris', fig);
    const flash = $('.flash', fig);
    let irisT = [];
    const disparar = () => { flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); };
    const obturar = (cambio) => {
      irisT.forEach(clearTimeout);
      iris.classList.add('is-activo', 'is-cerrado');
      irisT = [
        setTimeout(() => { cambio(); disparar(); iris.classList.remove('is-cerrado'); }, 380),
        setTimeout(() => iris.classList.remove('is-activo'), 1050),
      ];
    };
    if (iris) iris.classList.add('is-activo', 'is-cerrado');
    let swept = false;
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || swept) return;
      swept = true;
      if (!iris) { sweep(); return; }
      stage.classList.add('is-revelando');
      disparar();
      iris.classList.remove('is-cerrado');
      irisT = [setTimeout(() => iris.classList.remove('is-activo'), 700), setTimeout(() => stage.classList.remove('is-revelando'), 2000), setTimeout(sweep, 1100)];
    }, { threshold: 0.55 }).observe(stage);

    // Video: los dos clips corren a la par; solo se reproducen con su pestaña abierta y en pantalla
    const vidFrame = $('[data-compare-video]', fig);
    const vids = vidFrame ? $$('video', vidFrame) : [];
    const vidBtn = vidFrame && $('[data-video-toggle]', vidFrame);
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    let userPaused = reduce || saveData;
    let figVisible = false;
    let syncTimer = 0;
    const syncVids = () => {
      const [a, b] = vids;
      if (a && b && !a.paused && Math.abs(a.currentTime - b.currentTime) > 0.12) b.currentTime = a.currentTime;
    };
    const updateVideo = () => {
      if (!vidFrame) return;
      const run = !vidFrame.hidden && figVisible && !userPaused;
      if (run) {
        vids.forEach((v) => { const pr = v.play(); if (pr) pr.catch(() => {}); });
        if (!syncTimer) syncTimer = setInterval(syncVids, 800);
      } else {
        vids.forEach((v) => v.pause());
        clearInterval(syncTimer); syncTimer = 0;
      }
      vidBtn.classList.toggle('is-paused', userPaused);
      vidBtn.setAttribute('aria-label', userPaused ? 'Reproducir video' : 'Pausar video');
    };
    if (vidFrame) {
      vidBtn.addEventListener('click', () => { userPaused = !userPaused; updateVideo(); track('video_comparador', { accion: userPaused ? 'pausa' : 'play' }); });
      new IntersectionObserver(([e]) => { figVisible = e.isIntersecting; updateVideo(); }, { threshold: 0.25 }).observe(fig);
    }

    // Pestañas: Platillo · Bebida · Espacio · Video
    const tabs = $$('[role="tab"]', fig);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      // El cambio de foto ocurre con el diafragma cerrado
      const cambiar = () => {
        tabs.forEach((t) => { $(`#${t.getAttribute('aria-controls')}`).hidden = t !== tab; });
        stopSweep(); range.value = 50; set();
        sweep();
        figVisible = true; // quien elige una pestaña está viendo el comparador
        updateVideo();
      };
      if (iris && swept) obturar(cambiar);
      else cambiar();
      track('comparador_ejemplo', { ejemplo: tab.dataset.pair });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
  });


  /* ─── 12. CALCULADORA ───────────────────────────────────── */
  // Solo multiplica lo que escribe el visitante: sin promedios ni ahorros prometidos.
  const calc = $('[data-calc]');
  if (calc) {
    const fVideos = $('[data-calc-videos]', calc);
    const fHoras = $('[data-calc-horas]', calc);
    const fmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
    const read = (f) => clamp(parseFloat(String(f.value).replace(',', '.')) || 0, 0, Number(f.max) || 1000);
    const out = $('.calc__out', calc);
    const big = $('.calc__big', calc);
    const aguja = $('.cronometro__aguja', calc);
    const elMes = $('[data-calc-mes]', calc);
    const elAnio = $('[data-calc-anio]', calc);
    let mostrado = 0;
    let animC = 0;
    const pintar = (v) => {
      elMes.textContent = fmt.format(v);
      elAnio.textContent = fmt.format(v * 12);
      if (aguja) aguja.style.rotate = `${(v * 36).toFixed(1)}deg`; // una vuelta del cronómetro cada 10 horas
    };
    // La cifra corre hasta el resultado con el cronómetro girando; el lector de pantalla espera al final (aria-busy)
    const contar = (hasta) => {
      cancelAnimationFrame(animC);
      if (reduce) { mostrado = hasta; pintar(hasta); return; }
      const desde = mostrado;
      const t0 = performance.now();
      out.setAttribute('aria-busy', 'true');
      big.classList.remove('is-cuenta'); void big.offsetWidth; big.classList.add('is-cuenta');
      const paso = (now) => {
        const k = clamp((now - t0) / 700);
        mostrado = desde + (hasta - desde) * (1 - (1 - k) ** 3);
        if (k < 1) { pintar(Math.round(mostrado * 10) / 10); animC = requestAnimationFrame(paso); }
        else { mostrado = hasta; pintar(hasta); out.setAttribute('aria-busy', 'false'); }
      };
      animC = requestAnimationFrame(paso);
    };
    const compute = () => {
      const mes = read(fVideos) * read(fHoras);
      $('.calc__empty', calc).hidden = mes > 0;
      $('.calc__result', calc).hidden = !(mes > 0);
      out.classList.toggle('is-lleno', mes > 0);
      if (mes > 0) contar(mes);
      else { cancelAnimationFrame(animC); mostrado = 0; out.setAttribute('aria-busy', 'false'); }
      return mes;
    };
    calc.addEventListener('input', compute);
    calc.addEventListener('change', () => { const mes = compute(); if (mes > 0) track('calc_use', { videos: read(fVideos), horas_video: read(fHoras), horas_mes: mes }); });
    calc.addEventListener('submit', (e) => e.preventDefault());
  }


  /* ─── 13. WHATSAPP Y FORMULARIO ─────────────────────────── */
  const waOn = /^\d{10,15}$/.test(WHATSAPP_NUMERO);
  const waUrl = (text) => `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(text)}`;
  const saludo = 'Hola, Ona Studio. Vi su sitio web y quiero hablar de mi marca.';
  $$('[data-wa-float]').forEach((a) => {
    a.hidden = !waOn;
    if (waOn) { a.href = waUrl(saludo); a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });
  $$('[data-wa-link]').forEach((a) => { if (waOn) a.href = waUrl(saludo); else a.closest('[data-wa-item]').hidden = true; });

  const form = $('#form-contacto');
  if (form) {
    const status = $('#form-status');
    const waBtn = $('[data-wa-submit]', form);
    const mailBtn = $('button[value="correo"]', form);
    if (!waOn) { waBtn.hidden = true; mailBtn.classList.replace('btn--ghost', 'btn--light'); }
    const fields = { nombre: $('#f-nombre'), marca: $('#f-marca'), contacto: $('#f-contacto') };
    const servicios = $$('input[name="servicio"]', form);

    const setInvalid = (field, bad) => {
      if (bad) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
      const err = $(`#${field.getAttribute('aria-describedby')}`);
      if (err) err.hidden = !bad;
    };
    const say = (html, type) => { status.innerHTML = html; status.dataset.type = type; };
    Object.values(fields).forEach((f) => f.addEventListener('input', () => setInvalid(f, false)));
    servicios.forEach((c) => c.addEventListener('change', () => { if (c.checked) track('servicio_elegido', { servicio: c.value }); }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const canal = waOn && e.submitter && e.submitter.value === 'whatsapp' ? 'whatsapp' : 'correo';
      if ($('#f-web').value) return; // honeypot: un bot llenó el campo oculto

      let first = null;
      Object.values(fields).forEach((f) => { const bad = !f.value.trim(); setInvalid(f, bad); if (bad && !first) first = f; });
      if (first) {
        say('Revisa los campos marcados para continuar.', 'error');
        first.focus();
        track('form_error', { motivo: 'validacion', canal });
        return;
      }

      const elegidos = servicios.filter((c) => c.checked).map((c) => c.value);
      const necesito = elegidos.length ? elegidos.join(', ') : 'Aún no lo sé';
      const mensaje = $('#f-mensaje').value.trim();
      const texto = [
        `Hola, Ona Studio. Soy ${fields.nombre.value.trim()} y les escribo desde su sitio web.`,
        `Marca o proyecto: ${fields.marca.value.trim()}`,
        `Necesito: ${necesito}`,
        `Pueden contestarme en: ${fields.contacto.value.trim()}`,
        mensaje ? `\n${mensaje}` : '',
      ].join('\n').trim();

      const btn = e.submitter || waBtn;
      btn.dataset.state = 'loading';
      setTimeout(() => { delete btn.dataset.state; }, 1200);

      if (canal === 'correo') {
        window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Contacto desde el sitio · ${fields.marca.value.trim()}`)}&body=${encodeURIComponent(texto)}`;
        say(`Abrimos tu app de correo con el mensaje listo. Si no se abrió, escríbenos a <a href="mailto:${EMAIL}">${EMAIL}</a>.`, 'ok');
        track('form_submit', { canal, servicios: necesito });
        return;
      }
      const win = window.open(waUrl(texto), '_blank');
      if (win) {
        win.opener = null;
        say('Listo: se abrió WhatsApp con tu mensaje. Solo falta que lo envíes.', 'ok');
        track('form_submit', { canal, servicios: necesito });
      } else {
        say(`No pudimos abrir WhatsApp. <a href="${waUrl(texto)}" target="_blank" rel="noopener noreferrer">Ábrelo aquí</a> o usa “Enviar por correo”.`, 'error');
        track('form_error', { motivo: 'ventana_bloqueada', canal });
      }
    });
  }


  /* ─── 14. CÓDIGOS DE TIEMPO Y AÑO ───────────────────────── */
  // Decorativos (visor del hero y monitor): 24 cuadros por segundo, solo mientras se ven.
  const tcs = $$('[data-timecode]');
  if (tcs.length && !reduce) {
    const shown = new Set();
    const t0 = performance.now();
    const pad = (n) => String(n).padStart(2, '0');
    let raf = 0;
    const tick = (now) => {
      const s = (now - t0) / 1000;
      const text = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}:${pad(Math.floor(s * 24) % 24)}`;
      shown.forEach((el) => { el.textContent = text; });
      raf = shown.size ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? shown.add(e.target) : shown.delete(e.target)));
      if (shown.size && !raf) raf = requestAnimationFrame(tick);
    });
    tcs.forEach((el) => io.observe(el));
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });


  /* ─── 15. NUESTRA VISIÓN E HISTORIA DE CONTENIDO ────────── */
  // Texto que se "entinta" palabra por palabra al entrar: la cita de la visión y los títulos oscuros [data-ink].
  // Se completa en poco recorrido; al terminar aparece el subrayado o el marcador de la frase clave.
  // Ola: las palabras de un título saltan en cadena (al terminar de entintarse y cada vez que entra el cursor)
  const wave = (el) => {
    if (reduce || el.classList.contains('is-wave')) return;
    el.classList.add('is-wave');
    setTimeout(() => el.classList.remove('is-wave'), 720 + $$('.w', el).length * 45);
  };
  const inkScrub = (el, start, end) => {
    splitWords(el);
    el.style.setProperty('--n', $$('.w', el).length);
    el.classList.add('is-scrub');
    let waved = false;
    const setP = (s) => {
      el.style.setProperty('--p', s.progress.toFixed(3));
      const done = s.progress > 0.9;
      el.classList.toggle('is-done', done);
      if (done && !waved && el.matches('.title[data-ink]')) { waved = true; wave(el); }
    };
    ST.create({ trigger: el, start, end, scrub: 0.3, onUpdate: setP, onRefresh: setP });
  };
  if (hasGsap) {
    $$('[data-vision-quote]').forEach((el) => inkScrub(el, 'top 95%', 'top 70%'));
    $$('.title[data-ink]').forEach((el) => inkScrub(el, 'top 94%', 'top 66%'));
    $$('p[data-ink]').forEach((el) => inkScrub(el, 'top 96%', 'top 72%'));
  }
  // Con mouse, las palabras cercanas al cursor se tiñen de azul (en los títulos además se elevan y hacen la ola)
  if (hasGsap && fine) {
    $$('[data-ink].is-scrub').forEach((el) => {
      const words = $$('.w > i', el);
      const isTitle = el.classList.contains('title');
      const radius = isTitle ? 180 : 120;
      let pts = [];
      el.addEventListener('pointerenter', () => {
        const b = el.getBoundingClientRect();
        pts = words.map((w) => {
          const r = w.getBoundingClientRect();
          return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2, r.width / 2];
        });
        if (isTitle) wave(el);
      });
      el.addEventListener('pointermove', (e) => {
        if (!pts.length) return;
        const b = el.getBoundingClientRect();
        const x = e.clientX - b.left;
        const y = e.clientY - b.top;
        words.forEach((w, k) => {
          const [cx, cy, hw] = pts[k];
          const d = Math.hypot(Math.max(0, Math.abs(x - cx) - hw), y - cy);
          w.style.setProperty('--near', clamp(1 - d / radius).toFixed(2));
        });
      });
      el.addEventListener('pointerleave', () => words.forEach((w) => w.style.setProperty('--near', 0)));
    });
  }

  // Por qué Ona: el texto de cada tarjeta entra (título con máscara, palabra por palabra) y las barras se llenan
  const stackCards = $$('.stack__card');
  stackCards.forEach((card) => { const h = $('h3', card); if (h && !reduce) splitWords(h); });
  const cardIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    const h = $('h3', e.target);
    if (h && !reduce) h.classList.add('is-cut');
    cardIO.unobserve(e.target);
  }), { threshold: 0.35 });
  stackCards.forEach((card) => (reduce ? card.classList.add('in') : cardIO.observe(card)));
  // Las escenas en bucle (reacciones, semana) solo corren mientras su tarjeta se ve
  const viendoIO = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-viendo', e.isIntersecting)), { threshold: 0.15 });
  stackCards.forEach((card) => viendoIO.observe(card));

  // Historia de ejemplo: cambia de foto cada 3.4 s (igual que la barra de progreso), solo mientras se ve
  const story = $('[data-story]');
  if (story) {
    const slides = $$('.story__slide', story);
    const bars = $$('.story__bars i', story);
    let cur = 0;
    let timer = 0;
    const show = (n) => {
      cur = n % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-on', i === cur));
      bars.forEach((b, i) => { b.classList.toggle('is-done', i < cur); b.classList.toggle('is-on', i === cur); });
    };
    const play = (on) => {
      clearInterval(timer);
      story.classList.toggle('is-paused', !on);
      if (on && !reduce) timer = setInterval(() => show(cur + 1), 3400);
    };
    show(0);
    new IntersectionObserver(([e]) => play(e.isIntersecting), { threshold: 0.3 }).observe(story);
  }


  /* ─── 16. SERVICIOS: PORTAL DE LETRA ────────────────────── */
  // js/glyph-portal.js (Glyph Portal © 2026 Christian Katzmann, MIT): al hacer scroll la cámara entra por la "O" de
  // SERVICIOS. La fuente se carga ANTES de montar: el portal congela la tipografía disponible en ese momento.
  const gpSec = $('[data-gp]');
  if (gpSec && window.GlyphPortal) {
    // Al encenderse o apagarse la cámara cambia el alto de la página: se recalculan medidas y ScrollTrigger.
    // Directo, sin disparar un "resize" global: el portal lo escucha y cancelaría su primer cuadro.
    let gpMotion = gpSec.dataset.gpMotion;
    let gpT = 0;
    new MutationObserver(() => {
      if (gpSec.dataset.gpMotion === gpMotion) return;
      gpMotion = gpSec.dataset.gpMotion;
      clearTimeout(gpT);
      gpT = setTimeout(() => { measure(); if (hasGsap) ST.refresh(); onScroll(); }, 60);
    }).observe(gpSec, { attributes: true, attributeFilter: ['data-gp-motion'] });
    const montar = () => window.GlyphPortal.mount(gpSec, {
      word: 'SERVICIOS', focusChar: 'O', interactive: false, scrollLength: 1.6,
      fontFamily: '"Anton", Impact, "Arial Narrow Bold", sans-serif', fontWeight: 400,
      letterLabel: (char, i, n) => `${char}, letra ${i + 1} de ${n}`,
    });
    const fuente = document.fonts ? Promise.race([document.fonts.load('400 100px Anton'), new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
    fuente.then(montar, montar);
  }


  /* ─── 17. TÍTULOS CON MOVIMIENTO: CÓMO TRABAJAMOS Y EL DESPUÉS ─ */
  // Cómo trabajamos: un cabezal de edición barre el título y lo revela (CSS .is-scan); se repite al pasar el mouse
  $$('[data-cabezal]').forEach((wrap) => {
    if (reduce) { wrap.classList.add('is-scan'); return; }
    const barrer = () => { wrap.classList.remove('is-scan'); void wrap.offsetWidth; wrap.classList.add('is-scan'); };
    new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); barrer(); } }, { threshold: 0.5 }).observe(wrap);
    if (fine) wrap.addEventListener('mouseenter', barrer);
  });

  // El después: el título pasa de "sin edición" a "con edición" con una línea que lo barre (como el comparador);
  // con mouse, la línea sigue al cursor y al salir termina de "editarlo"
  $$('[data-titulo-ad]').forEach((h) => {
    if (reduce) return;
    let x = 0;
    let anim = 0;
    const set = (v) => { x = v; h.style.setProperty('--x', `${v.toFixed(2)}%`); };
    const ir = (to, ms) => {
      cancelAnimationFrame(anim);
      h.classList.remove('is-hecho');
      const from = x;
      const t0 = performance.now();
      const paso = (now) => {
        const k = clamp((now - t0) / ms);
        set(from + (to - from) * (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2));
        if (k < 1) anim = requestAnimationFrame(paso);
        else h.classList.toggle('is-hecho', to >= 100);
      };
      anim = requestAnimationFrame(paso);
    };
    set(0);
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setTimeout(() => ir(100, 1700), 300);
    }, { threshold: 0.6 }).observe(h);
    if (fine) {
      h.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(anim);
        h.classList.remove('is-hecho');
        const r = h.getBoundingClientRect();
        set(clamp((e.clientX - r.left) / r.width) * 100);
      });
      h.addEventListener('pointerleave', () => ir(100, 700));
    }
  });


  /* ─── 18. SERVICIOS: MICROESCENAS DE LOS MOSAICOS ───────── */
  // Cada mosaico cuenta su servicio con una escena (CSS .tfx): corre al entrar a pantalla (.is-activo), se apaga al
  // salir y, con mouse, se repite al pasar encima. Con movimiento reducido quedan en su estado final.
  const tiles = $$('.tile[data-tfx]');
  // Web: el editor escribe solo (k = palabra clave, p = propiedad, s = texto, o = signos)
  const CODIGO = [
    ['const', 'k'], [' web = crear({\n', 'o'],
    ['  base', 'p'], [': ', 'o'], ["'desde cero'", 's'], [',\n', 'o'],
    ['  diseño', 'p'], [': ', 'o'], ["'a tu medida'", 's'], [',\n', 'o'],
    ['  móvil', 'p'], [': ', 'o'], ['true', 'k'], [',\n', 'o'],
    ['});\n', 'o'], ['web', 'p'], ['.publicar();', 'o'],
  ];
  const tipeo = (code) => {
    clearTimeout(code._t);
    code.textContent = '';
    if (reduce) {
      CODIGO.forEach(([txt, cls]) => { const s = doc.createElement('span'); s.className = `tk-${cls}`; s.textContent = txt; code.append(s); });
      return;
    }
    let tok = 0;
    let chr = 0;
    let span = null;
    const paso = () => {
      const [txt, cls] = CODIGO[tok];
      if (!chr) { span = doc.createElement('span'); span.className = `tk-${cls}`; code.append(span); }
      span.textContent += txt[chr++];
      const salto = txt[chr - 1] === '\n';
      if (chr >= txt.length) { tok++; chr = 0; }
      if (tok < CODIGO.length) code._t = setTimeout(paso, salto ? 260 : 26 + Math.random() * 40);
    };
    code._t = setTimeout(paso, 450);
  };
  // Edición: una copia "cruda" de la foto encima; el cabezal (--cx) la recorta y deja ver el color
  const corte = (tile) => {
    const foto = $('.tile__photo', tile);
    if (!foto || reduce) return null;
    const crudo = foto.cloneNode(true);
    crudo.classList.add('tfx-crudo');
    crudo.setAttribute('aria-hidden', 'true');
    $$('img', crudo).forEach((img) => { img.alt = ''; });
    foto.after(crudo);
    let cx = 0;
    let anim = 0;
    const set = (v) => { cx = v; tile.style.setProperty('--cx', `${v.toFixed(2)}%`); };
    const barrer = (to, ms) => {
      cancelAnimationFrame(anim);
      tile.classList.add('is-cortando');
      const from = cx;
      const t0 = performance.now();
      const paso = (now) => {
        const k = clamp((now - t0) / ms);
        set(from + (to - from) * (1 - (1 - k) ** 3));
        if (k < 1) anim = requestAnimationFrame(paso);
        else tile.classList.remove('is-cortando');
      };
      anim = requestAnimationFrame(paso);
    };
    set(0);
    if (fine) {
      tile.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(anim);
        tile.classList.add('is-cortando');
        const r = tile.getBoundingClientRect();
        set(clamp((e.clientX - r.left) / r.width) * 100);
      });
      tile.addEventListener('pointerleave', () => barrer(100, 700));
    }
    return { entra: () => { set(0); barrer(100, 2200); }, sale: () => { cancelAnimationFrame(anim); tile.classList.remove('is-cortando'); set(0); } };
  };
  tiles.forEach((tile) => {
    const tipo = tile.dataset.tfx;
    const code = $('[data-tipeo]', tile);
    const edicion = tipo === 'color' ? corte(tile) : null;
    const activar = (on) => {
      tile.classList.toggle('is-activo', on);
      if (code) (on ? tipeo(code) : clearTimeout(code._t));
      if (edicion) (on ? edicion.entra() : edicion.sale());
    };
    if (reduce) { activar(true); return; }
    let repite = 0;
    new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.35 && !tile.classList.contains('is-activo')) activar(true);
      else if (!e.isIntersecting) { clearTimeout(repite); activar(false); }
    }, { threshold: [0, 0.35] }).observe(tile);
    // Con mouse la escena se rebobina un instante y se repite al entrar (la de edición sigue al cursor)
    if (fine && !edicion) {
      tile.addEventListener('mouseenter', () => {
        if (!tile.classList.contains('is-activo')) return;
        clearTimeout(repite);
        activar(false);
        repite = setTimeout(() => activar(true), 380);
      });
    }
  });


  /* ─── 19. NUESTRA VISIÓN: LOGO QUE SE DIBUJA Y LENTE SOBRE LA CITA ─ */
  // El logo de ONA (los mismos trazos del preloader) se dibuja de fondo conforme bajas por la sección y al final
  // se rellena apenas. Sin GSAP o con movimiento reducido queda dibujado, quieto.
  const vision = $('#vision');
  const vLogo = $('[data-vision-logo]');
  if (vision && vLogo) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const relleno = doc.createElementNS(svgNS, 'g');
    relleno.setAttribute('class', 'vision__logo-relleno');
    $$('.intro-logo__fill path').forEach((src) => relleno.append(src.cloneNode(false)));
    const trazos = $$('.intro-logo__stroke path')
      .sort((a, b) => (parseFloat(a.style.getPropertyValue('--d')) || 0) - (parseFloat(b.style.getPropertyValue('--d')) || 0))
      .map((src) => {
        const path = doc.createElementNS(svgNS, 'path');
        path.setAttribute('d', src.getAttribute('d'));
        path.setAttribute('pathLength', '1');
        return path;
      });
    vLogo.append(relleno, ...trazos);
    if (hasGsap && trazos.length) {
      gsap.fromTo(trazos, { attr: { 'stroke-dashoffset': 1 } }, {
        attr: { 'stroke-dashoffset': 0 }, ease: 'none', stagger: { amount: 0.6 },
        scrollTrigger: {
          trigger: vision, start: 'top 85%', end: 'bottom 75%', scrub: 0.6,
          onUpdate: (s) => vLogo.classList.toggle('is-lleno', s.progress > 0.97),
        },
      });
      gsap.fromTo(vLogo, { yPercent: 10, rotate: -5, scale: 0.9 }, {
        yPercent: -10, rotate: 3, scale: 1, ease: 'none',
        scrollTrigger: { trigger: vision, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    } else {
      vLogo.classList.add('is-lleno');
    }
  }

  // La ventana: una lente circular sigue al cursor sobre la cita y la muestra en negativo (azul con texto claro).
  // En pantallas táctiles recorre la frase una vez al verla y aparece donde se toca.
  const lente = $('[data-lente]');
  const lenteTxt = lente && $('.vision__quote--lente', lente);
  if (lente && lenteTxt && !reduce) {
    const PAD = 60; // la copia sobresale 60px por lado (CSS) para que la lente no se corte en los bordes
    const cur = { x: 0, y: 0, r: 0 };
    const meta = { x: 0, y: 0, r: 0 };
    let raf = 0;
    const pinta = () => {
      cur.x += (meta.x - cur.x) * 0.2;
      cur.y += (meta.y - cur.y) * 0.2;
      cur.r += (meta.r - cur.r) * 0.16;
      lenteTxt.style.setProperty('--lx', `${cur.x.toFixed(1)}px`);
      lenteTxt.style.setProperty('--ly', `${cur.y.toFixed(1)}px`);
      lenteTxt.style.setProperty('--lr', `${Math.max(0, cur.r).toFixed(1)}px`);
      const quieta = Math.abs(meta.x - cur.x) < 0.3 && Math.abs(meta.y - cur.y) < 0.3 && Math.abs(meta.r - cur.r) < 0.3;
      raf = quieta ? 0 : requestAnimationFrame(pinta);
    };
    const mover = (x, y, r, salto) => {
      const b = lente.getBoundingClientRect();
      meta.x = x - b.left + PAD;
      meta.y = y - b.top + PAD;
      if (r != null) meta.r = r;
      if (salto) { cur.x = meta.x; cur.y = meta.y; }
      if (!raf) raf = requestAnimationFrame(pinta);
    };
    const radio = () => clamp(lente.offsetWidth * 0.16, 70, 120);
    if (fine) {
      lente.addEventListener('pointerenter', (e) => mover(e.clientX, e.clientY, radio(), cur.r < 1));
      lente.addEventListener('pointermove', (e) => mover(e.clientX, e.clientY, radio()));
      lente.addEventListener('pointerleave', (e) => mover(e.clientX, e.clientY, 0));
    } else {
      // Recorrido automático una vez, de izquierda a derecha por la mitad de la cita; luego un toque la muestra
      let recorrido = 0;
      const recorrer = () => {
        const r = radio();
        const t0 = performance.now();
        const paso = (now) => {
          const k = clamp((now - t0) / 2600);
          const b = lente.getBoundingClientRect();
          const x = b.left + b.width * (0.1 + 0.8 * k);
          const y = b.top + b.height * (0.5 + Math.sin(k * Math.PI * 2) * 0.22);
          mover(x, y, k < 0.85 ? r : 0, k === 0);
          if (k < 1) recorrido = requestAnimationFrame(paso);
        };
        recorrido = requestAnimationFrame(paso);
      };
      new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        setTimeout(recorrer, 900);
      }, { threshold: 0.75 }).observe(lente);
      let soltar = 0;
      lente.addEventListener('pointerdown', (e) => {
        cancelAnimationFrame(recorrido);
        clearTimeout(soltar);
        mover(e.clientX, e.clientY, radio(), cur.r < 1);
        soltar = setTimeout(() => { meta.r = 0; if (!raf) raf = requestAnimationFrame(pinta); }, 1100);
      });
    }
  }

  /* ─── 20. POR QUÉ ONA: SELLOS, SUBRAYADOS Y TEXTOS ──────── */
  // Los sellos, el número que se llena y los destellos son CSS (.in / .is-viendo). Aquí: el trazo de marcador bajo la
  // palabra clave de cada título, el título que empieza como "plantilla" y el cursor de grabación del párrafo.
  $$('.stack__clave').forEach((clave) => {
    clave.insertAdjacentHTML('beforeend', '<svg class="stack__trazo" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M6 12C48 9 104 8 150 9S188 11 194 10"/></svg>');
  });
  // Cada palabra del título necesita su índice en la caja (.w) para romper su barra de "plantilla" (CSS --k)
  $$('.porque .title.is-scrub .w').forEach((w) => {
    const i = w.firstElementChild;
    if (i) w.style.setProperty('--i', i.style.getPropertyValue('--i'));
  });
  // Un cursor rojo, como el punto de REC, avanza con la palabra que se está entintando; al terminar parpadea y se va
  const lead = $('.porque .section__lead.is-scrub');
  if (lead && hasGsap) {
    const palabras = $$('.w > i', lead);
    const cursorRec = doc.createElement('span');
    cursorRec.className = 'tinta-cursor';
    cursorRec.setAttribute('aria-hidden', 'true');
    lead.append(cursorRec);
    let fin = 0;
    const seguir = (p) => {
      if (!palabras.length) return;
      const idx = Math.max(0, Math.min(palabras.length - 1, Math.floor(p * (palabras.length + 3))));
      const b = lead.getBoundingClientRect();
      const r = palabras[idx].getBoundingClientRect();
      const alto = cursorRec.offsetHeight;
      cursorRec.style.translate = `${(r.right - b.left).toFixed(1)}px ${(r.top - b.top + (r.height - alto) / 2).toFixed(1)}px`;
      const escribiendo = p > 0.01 && p < 0.99;
      clearTimeout(fin);
      cursorRec.classList.remove('is-quieto');
      if (escribiendo) cursorRec.classList.add('is-on');
      else if (p >= 0.99 && cursorRec.classList.contains('is-on')) {
        cursorRec.classList.add('is-quieto');
        fin = setTimeout(() => cursorRec.classList.remove('is-on', 'is-quieto'), 3000);
      } else cursorRec.classList.remove('is-on');
    };
    ST.create({ trigger: lead, start: 'top 96%', end: 'top 72%', onUpdate: (s) => seguir(s.progress) });
  }
  // Capa "high tech" de cada tarjeta (CSS .hud): esquinas de visor, escáner con rejilla (se repite al pasar el mouse)
  // y ecualizador; alrededor del sello, una órbita con tres satélites
  stackCards.forEach((card) => {
    const texto = $('.stack__text', card);
    if (texto) {
      const barras = Array.from({ length: 10 }, (_, e) => `<i style="--e:${e}"></i>`).join('');
      texto.insertAdjacentHTML('afterbegin', `<span class="hud" aria-hidden="true"><i class="hud__esq"></i><i class="hud__esq"></i><i class="hud__esq"></i><i class="hud__esq"></i><span class="hud__scan"></span><span class="hud__eq">${barras}</span></span>`);
      const hud = texto.firstElementChild;
      if (fine && !reduce) card.addEventListener('mouseenter', () => hud.classList.toggle('is-otra'));
    }
    const sello = $('.sello', card);
    if (sello) sello.insertAdjacentHTML('afterbegin', '<span class="sello__orbita"><i></i><i></i><i></i></span>');
  });


  /* ─── 21. QUÉ INCLUYE Y CALCULADORA ─────────────────────── */
  // Qué incluye: los entregables caen girando y su idea clave se subraya al aterrizar (CSS); con mouse, una luz los
  // sigue y la tarjeta se inclina hacia el cursor
  const incluyeList = $('.incluye__list');
  if (incluyeList) {
    const items = $$('li', incluyeList);
    if (fine && !reduce) {
      items.forEach((li) => {
        li.addEventListener('pointermove', (e) => {
          const r = li.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          li.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
          li.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
          li.style.rotate = `${(-y).toFixed(3)} ${x.toFixed(3)} 0 ${(Math.hypot(x, y) * 14).toFixed(2)}deg`;
        });
        li.addEventListener('pointerleave', () => {
          li.style.rotate = '';
          li.style.setProperty('--mx', '-300px');
          li.style.setProperty('--my', '-300px');
        });
      });
    }
  }

  // Qué incluye · el camino de tu contenido: la línea avanza de paso en paso (Idea → Planeación → Producción →
  // Publicación); cada paso se marca al llegar, el recorrido completo se sostiene y vuelve a empezar (solo mientras se ve)
  const ruta = $('.incluye .ruta');
  if (ruta && !reduce) {
    const pasos = $$('li', ruta);
    let rT = 0;
    let viendo = false;
    const limpiar = () => pasos.forEach((li) => li.classList.remove('is-hecho', 'is-actual'));
    const poner = (k) => {
      ruta.style.setProperty('--avance', (k / (pasos.length - 1)).toFixed(3));
      rT = setTimeout(() => {
        pasos.forEach((li, i) => { li.classList.toggle('is-hecho', i <= k); li.classList.toggle('is-actual', i === k); });
        rT = setTimeout(k < pasos.length - 1 ? () => poner(k + 1) : reiniciar, k < pasos.length - 1 ? 800 : 2600);
      }, k === 0 ? 150 : 900);
    };
    const reiniciar = () => {
      limpiar();
      ruta.style.setProperty('--avance', 0);
      rT = setTimeout(() => { if (viendo) poner(0); }, 1000);
    };
    ruta.classList.add('is-viva');
    ruta.style.setProperty('--avance', 0);
    new IntersectionObserver(([e]) => {
      viendo = e.isIntersecting;
      clearTimeout(rT);
      if (!viendo) return;
      limpiar();
      ruta.style.setProperty('--avance', 0);
      rT = setTimeout(() => poner(0), 600);
    }, { threshold: 0.6 }).observe(ruta);
  }

  // Calculadora: el título voltea sus letras como un tablero de aeropuerto hasta asentarse (el texto real queda en
  // un span solo para lectores de pantalla)
  const flap = $('[data-flap]');
  if (flap && !reduce) {
    const texto = flap.textContent.trim();
    const sr = doc.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = texto;
    const vis = doc.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    const letras = [];
    texto.split(' ').forEach((pal, k) => {
      if (k) vis.append(' ');
      const w = doc.createElement('span');
      w.className = 'flap-palabra';
      [...pal].forEach((c) => {
        const s = doc.createElement('span');
        s.className = 'flap';
        s.textContent = c;
        s.dataset.c = c;
        w.append(s);
        letras.push(s);
      });
      vis.append(w);
    });
    flap.textContent = '';
    flap.append(sr, vis);
    const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const voltear = () => {
      letras.forEach((s, i) => {
        s.style.width = `${s.getBoundingClientRect().width}px`; // ancho fijo: las letras al azar no mueven el renglón
        let n = 3 + ((Math.random() * 3) | 0) + Math.floor(i * 0.2);
        s.classList.add('is-gira');
        const tic = () => {
          s.textContent = n > 0 ? ABC[(Math.random() * ABC.length) | 0] : s.dataset.c;
          s.classList.toggle('a', n % 2 === 0);
          s.classList.toggle('b', n % 2 === 1);
          if (n-- > 0) setTimeout(tic, 70);
          else setTimeout(() => { s.classList.remove('is-gira'); s.style.width = ''; }, 220);
        };
        setTimeout(tic, i * 22);
      });
    };
    new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); setTimeout(voltear, 450); } }, { threshold: 0.6 }).observe(flap);
  }

  // Reloj gigante: sus 60 marcas se dibujan aquí; el minutero y la aguja de horas giran con el scroll
  const reloj = $('[data-reloj]');
  if (reloj) {
    const marcas = $('.reloj__marcas', reloj);
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2;
      const hora = k % 5 === 0;
      const r1 = hora ? 82 : 90;
      const l = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', (Math.sin(a) * r1).toFixed(2));
      l.setAttribute('y1', (-Math.cos(a) * r1).toFixed(2));
      l.setAttribute('x2', (Math.sin(a) * 96).toFixed(2));
      l.setAttribute('y2', (-Math.cos(a) * 96).toFixed(2));
      if (hora) l.setAttribute('class', 'h');
      marcas.append(l);
    }
    if (hasGsap) {
      const recorrido = () => ({ trigger: '#calculadora', start: 'top bottom', end: 'bottom top', scrub: 0.6 });
      gsap.fromTo($('.reloj__min', reloj), { rotation: -40 }, { rotation: 680, svgOrigin: '0 0', ease: 'none', scrollTrigger: recorrido() });
      gsap.fromTo($('.reloj__hora', reloj), { rotation: 20 }, { rotation: 80, svgOrigin: '0 0', ease: 'none', scrollTrigger: recorrido() });
    }
  }


  /* ─── 22. PREGUNTAS Y ESCRÍBENOS ────────────────────────── */
  // Chat con ONA: mientras se ve, conversa solo con las preguntas del guion (tu pregunta, "escribiendo…", respuesta);
  // las preguntas rápidas y las de la lista se contestan al momento y pausan la conversación un rato. Solo lo que pide
  // la persona se anuncia al lector de pantalla (aria-live); la conversación automática no.
  const chatUI = (() => {
    const hilo = $('[data-chat-hilo]');
    if (!hilo) return null;
    const caja = hilo.closest('.chat');
    const guion = $$('[data-chat-guion] li').map((li) => ({ p: li.dataset.p, r: li.textContent.trim(), chip: li.dataset.chip }));
    let timers = [];
    let auto = 0;
    let idx = 0;
    let visible = false;
    let pausaHasta = 0;
    const burbuja = (quien, texto) => {
      const b = doc.createElement('p');
      b.className = `chat__msj chat__msj--${quien}`;
      if (quien === 'escribe') { b.innerHTML = '<i></i><i></i><i></i>'; b.setAttribute('aria-hidden', 'true'); } else b.textContent = texto;
      hilo.append(b);
      while (hilo.children.length > 6) hilo.firstElementChild.remove();
    };
    const conversar = (pregunta, respuesta, anunciar) => {
      timers.forEach(clearTimeout);
      timers = [];
      $$('.chat__msj--escribe', hilo).forEach((b) => b.remove());
      hilo.setAttribute('aria-live', anunciar ? 'polite' : 'off');
      burbuja('tu', pregunta);
      if (reduce) { burbuja('ona', respuesta); return; }
      timers.push(setTimeout(() => {
        burbuja('escribe');
        timers.push(setTimeout(() => { $$('.chat__msj--escribe', hilo).forEach((b) => b.remove()); burbuja('ona', respuesta); }, 600));
      }, 220));
    };
    const ciclo = () => {
      clearTimeout(auto);
      if (reduce || !visible || !guion.length) return;
      auto = setTimeout(() => {
        const g = guion[idx % guion.length];
        idx++;
        conversar(g.p, g.r, false);
        auto = setTimeout(ciclo, 820 + Math.min(3400, 1400 + g.r.length * 14)); // tiempo para leer la respuesta
      }, Math.max(600, pausaHasta - Date.now()));
    };
    const preguntar = (pregunta, respuesta) => {
      pausaHasta = Date.now() + 7000;
      conversar(pregunta, respuesta, true);
      ciclo();
    };
    const chips = $('[data-chat-chips]');
    if (chips) {
      guion.filter((g) => g.chip).forEach((g) => {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'chat__chip';
        b.textContent = g.chip;
        b.addEventListener('click', () => { preguntar(g.p, g.r); track('chat_pregunta', { pregunta: g.chip }); });
        chips.append(b);
      });
    }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) ciclo(); else clearTimeout(auto); }, { threshold: 0.4 }).observe(caja);
    return { preguntar };
  })();

  // Preguntas: una abierta a la vez; la respuesta crece suave y aparece palabra por palabra, y el chat la contesta
  // con su primera frase (el mismo texto de la respuesta)
  const faqLista = $('[data-faq]');
  if (faqLista) {
    const items = $$('.faq__item', faqLista);
    const contestar = (item) => {
      if (!chatUI) return;
      const resp = $('p', item).textContent.replace(/\s+/g, ' ').trim();
      const primera = (resp.match(/^.*?[.!?](\s|$)/) || [resp])[0].trim();
      chatUI.preguntar($('summary', item).textContent.trim(), primera);
    };
    const abrir = (item) => {
      item.open = true;
      if (reduce) return;
      const p = $('p', item);
      const alto = p.offsetHeight;
      p.animate([{ height: '0px', paddingBottom: '0px', opacity: 0 }, { height: `${alto}px`, paddingBottom: getComputedStyle(p).paddingBottom, opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      item.classList.remove('is-abre');
      void item.offsetWidth;
      item.classList.add('is-abre');
    };
    const cerrar = (item) => {
      if (reduce) { item.open = false; return; }
      const p = $('p', item);
      const a = p.animate([{ height: `${p.offsetHeight}px`, opacity: 1 }, { height: '0px', paddingBottom: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.4, 0, 1, 1)' });
      a.onfinish = () => { item.open = false; item.classList.remove('is-abre'); };
    };
    items.forEach((item, k) => {
      item.style.setProperty('--k', k);
      const p = $('p', item);
      if (p && !reduce) splitWords(p);
      $('summary', item).addEventListener('click', (e) => {
        e.preventDefault();
        if (item.open) { cerrar(item); return; }
        items.forEach((o) => { if (o !== item && o.open) cerrar(o); });
        abrir(item);
        contestar(item);
        track('faq_abre', { pregunta: k + 1 });
      });
    });
    if (reduce) faqLista.classList.add('in');
    else new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); faqLista.classList.add('in'); } }, { threshold: 0.12 }).observe(faqLista);
  }

  // Escríbenos: la pila de fotos baraja sola (la de enfrente pasa atrás); con mouse se pausa y un clic la baraja
  const pila = $('[data-pila]');
  if (pila) {
    const cartas = $$('.pila__carta', pila);
    const orden = cartas.map((_, i) => i); // orden[0] es la carta de enfrente
    const acomodar = () => orden.forEach((c, pos) => cartas[c].style.setProperty('--pos', pos));
    const barajar = () => {
      const c = orden.shift();
      orden.push(c);
      cartas[c].classList.remove('is-sale');
      void cartas[c].offsetWidth;
      cartas[c].classList.add('is-sale');
      acomodar();
    };
    acomodar();
    if (!reduce) {
      let timer = 0;
      let viendo = false;
      let pausa = false;
      const ciclo = () => { clearInterval(timer); if (viendo && !pausa) timer = setInterval(barajar, 3400); };
      new IntersectionObserver(([e]) => { viendo = e.isIntersecting; ciclo(); }).observe(pila);
      if (fine) {
        pila.addEventListener('mouseenter', () => { pausa = true; ciclo(); });
        pila.addEventListener('mouseleave', () => { pausa = false; ciclo(); });
      }
      pila.addEventListener('click', barajar);
    }
  }
  // Los símbolos del fondo siguen al cursor con distinta profundidad (CSS --ux/--uy)
  const contacto = $('#contacto');
  if (contacto && fine && !reduce) {
    contacto.addEventListener('pointermove', (e) => {
      contacto.style.setProperty('--ux', (e.clientX / window.innerWidth * 2 - 1).toFixed(3));
      contacto.style.setProperty('--uy', (e.clientY / window.innerHeight * 2 - 1).toFixed(3));
    });
  }
  // Vías de contacto: entran escalonadas
  const vias = $('[data-vias]');
  if (vias) {
    $$('li', vias).forEach((li, k) => li.style.setProperty('--k', k));
    if (reduce) vias.classList.add('in');
    else new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); vias.classList.add('in'); } }, { threshold: 0.3 }).observe(vias);
  }
  // Formulario: entra escalonado; la barra cuenta cuántos de los 3 datos necesarios ya escribiste y los servicios
  // elegidos hacen un pequeño "pop"
  const formC = $('#form-contacto');
  if (formC) {
    $$('.form__progreso, .field, .form__actions', formC).forEach((el, k) => el.style.setProperty('--k', k));
    const necesarios = $$('[required]', formC);
    const barra = $('[data-progreso]', formC);
    const paso = $('[data-paso]', formC);
    const avance = () => {
      const llenos = necesarios.filter((f) => f.value.trim()).length;
      if (barra) barra.style.setProperty('--p', (llenos / necesarios.length).toFixed(3));
      const listo = llenos === necesarios.length;
      formC.classList.toggle('is-listo', listo);
      if (paso) paso.textContent = listo ? 'Listo para enviar' : `${llenos} de ${necesarios.length} datos`;
    };
    formC.addEventListener('input', avance);
    avance();
    $$('.check input', formC).forEach((inp) => inp.addEventListener('change', () => {
      if (!inp.checked || reduce) return;
      const chip = inp.closest('.check');
      chip.classList.remove('is-pop');
      void chip.offsetWidth;
      chip.classList.add('is-pop');
    }));
  }


  /* ─── 23. EL DESPUÉS · CÓDIGO DE FONDO ───────────────────── */
  // Debajo del video, el código de una página escribiéndose en vivo (HTML y, en pantallas amplias, su CSS). Solo
  // escribe mientras se ve; al terminar el archivo hace una pausa y empieza de nuevo. Movimiento reducido: quieto.
  (() => {
    const box = $('[data-codigo]');
    if (!box) return;
    const ARCHIVOS = {
      html: [
        '<!DOCTYPE html>', '<html lang="es">', '<head>', '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width">', '  <title>Tu marca · Cocina de temporada</title>',
        '  <meta name="description" content="Reserva en línea.">', '  <link rel="stylesheet" href="estilos.css">', '</head>',
        '<body>', '  <!-- Encabezado con botón de reserva -->', '  <header class="nav">', '    <a class="nav__logo" href="/">Tu marca</a>',
        '    <a class="btn" href="#reservar">Reservar mesa</a>', '  </header>', '  <main>', '    <section class="hero">',
        '      <img src="salon.avif" alt="Nuestro salón">', '      <h1>Cocina de temporada</h1>',
        '      <p>Hecha aquí, todos los días.</p>', '    </section>', '    <section class="menu" id="menu">', '      <h2>Lo más pedido</h2>',
        '      <article class="platillo">', '        <img src="plato.avif" alt="Plato de temporada">',
        '        <h3>Plato de temporada</h3>', '      </article>', '    </section>', '    <a class="wa" href="#whatsapp">Escríbenos</a>',
        '  </main>', '</body>', '</html>',
      ],
      css: [
        '/* Tu marca · estilos */', ':root {', '  --tinta: #1B1410;', '  --crema: #FAF6EE;', '  --acento: #C8642D;', '}', 'body {', '  margin: 0;',
        '  font-family: "DM Sans", system-ui, sans-serif;', '  color: var(--tinta);', '  background: var(--crema);', '}', '.nav {', '  position: sticky;',
        '  top: 0;', '  display: flex;', '  justify-content: space-between;', '}', '.hero {', '  min-height: 100svh;', '  display: grid;',
        '  place-items: end start;', '}', '.btn {', '  padding: 14px 24px;', '  border-radius: 999px;', '  background: var(--acento);', '}',
        '@media (min-width: 960px) {', '  .menu { grid-template-columns: repeat(3, 1fr); }', '}',
      ],
      js: [
        '// Tu marca · interacciones', "const nav = document.querySelector('.nav');", "const reservar = document.querySelector('.btn');", '',
        '// El menú se fija al bajar', "addEventListener('scroll', () => {", "  nav.classList.toggle('fija', scrollY > 40);", '});', '',
        '// Las secciones entran al verlas', 'const io = new IntersectionObserver((items) => {', '  items.forEach((e) => {',
        "    e.target.classList.toggle('in', e.isIntersecting);", '  });', '});', "document.querySelectorAll('section')",
        '  .forEach((s) => io.observe(s));', '', '// Reservar abre WhatsApp con el mensaje listo', "reservar.addEventListener('click', (e) => {",
        '  e.preventDefault();', "  open('https://wa.me/?text=Quiero%20reservar');", '});',
      ],
    };
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Colores sencillos: etiquetas y signos (t), atributos y propiedades (a), valores (s), texto (x), comentarios (c)
    const tokHTML = (l) => {
      const out = [];
      let i = 0;
      let enTag = false;
      const add = (c, s) => { if (s) out.push([c, s]); };
      while (i < l.length) {
        if (l.startsWith('<!--', i)) { const f = l.indexOf('-->', i); const j = f < 0 ? l.length : f + 3; add('c', l.slice(i, j)); i = j; continue; }
        if (!enTag && l[i] === '<') {
          const m = /^<\/?[\w!-]+/.exec(l.slice(i));
          const s = m ? m[0] : '<';
          add('t', s); i += s.length; enTag = !!m; continue;
        }
        if (enTag) {
          if (l[i] === '>') { add('t', '>'); i++; enTag = false; continue; }
          if (l[i] === '"') { const f = l.indexOf('"', i + 1); const j = f < 0 ? l.length : f + 1; add('s', l.slice(i, j)); i = j; continue; }
          const m = /^[^">]+/.exec(l.slice(i));
          add('a', m[0]); i += m[0].length; continue;
        }
        const f = l.indexOf('<', i);
        const j = f < 0 ? l.length : f;
        add('x', l.slice(i, j)); i = j;
      }
      return out;
    };
    const tokCSS = (l) => {
      if (/^\s*\/\*/.test(l)) return [['c', l]];
      const m = /^(\s+)([\w-]+)(:\s*)(.*?)(;?)$/.exec(l);
      if (m) return [['x', m[1]], ['a', m[2]], ['t', m[3]], ['s', m[4]], ['t', m[5]]].filter((p) => p[1]);
      const sel = /^(.*?)(\s*[{}]\s*)$/.exec(l);
      if (sel) return [['x', sel[1]], ['t', sel[2]]].filter((p) => p[1]);
      return [['x', l]];
    };
    const tokJS = (l) => {
      const out = [];
      let i = 0;
      while (i < l.length) {
        const r = l.slice(i);
        let m;
        let c = 't';
        if ((m = /^\/\/.*/.exec(r))) c = 'c';
        else if ((m = /^'[^']*'?/.exec(r))) c = 's';
        else if ((m = /^(?:const|let|new|return)\b|^=>/.exec(r))) c = 'a';
        else if ((m = /^[\w$.]+/.exec(r))) c = 'x';
        else m = /^[^\w$'\/]+|^./.exec(r);
        out.push([c, m[0]]);
        i += m[0].length;
      }
      return out;
    };
    const pinta = (toks, n) => {
      let html = '';
      for (const [c, s] of toks) {
        if (n <= 0) break;
        html += `<span class="${c}">${esc(s.slice(0, n))}</span>`;
        n -= s.length;
      }
      return html;
    };
    const motores = $$('[data-codigo-pre]', box).map((pre) => {
      const tipo = pre.dataset.codigoPre;
      const lineas = ARCHIVOS[tipo] || [];
      const toks = lineas.map(tipo === 'css' ? tokCSS : tipo === 'js' ? tokJS : tokHTML);
      const fila = (k, n, cursor) => `<span class="codigo__n">${k + 1}</span>${pinta(toks[k], n)}${cursor ? '<i class="codigo__cursor"></i>' : ''}`;
      const limite = () => parseInt(getComputedStyle(box).getPropertyValue('--lineas'), 10) || 10;
      if (reduce) {
        pre.innerHTML = lineas.slice(0, limite()).map((l, k) => `<span class="codigo__l">${fila(k, l.length, false)}</span>`).join('');
        return null;
      }
      let li = 0;
      let ch = 0;
      let actual = null;
      // Un paso del motor: devuelve cuánto esperar para el siguiente (más en los saltos de línea y al terminar)
      return {
        visible: () => pre.offsetParent !== null,
        paso() {
          if (!actual) {
            if (li === 0) pre.textContent = '';
            actual = doc.createElement('span');
            actual.className = 'codigo__l';
            pre.append(actual);
            if (pre.children.length > limite()) {
              pre.firstElementChild.remove();
              pre.classList.remove('is-sube');
              void pre.offsetWidth;
              pre.classList.add('is-sube');
            }
            ch = lineas[li].length - lineas[li].trimStart().length; // la sangría llega sola, como en un editor
          }
          const largo = lineas[li].length;
          ch = Math.min(largo, ch + 2 + (Math.random() < 0.5 ? 1 : 0));
          actual.innerHTML = fila(li, ch, true);
          if (ch < largo) return 14 + Math.random() * 20;
          actual.innerHTML = fila(li, ch, false);
          actual = null;
          li = (li + 1) % lineas.length;
          return li === 0 ? 1800 : 60 + Math.random() * 90;
        },
      };
    }).filter(Boolean);
    if (!motores.length) return;
    let viendo = false;
    const timers = new Map();
    const correr = (m) => {
      if (!viendo || !m.visible()) { timers.delete(m); return; }
      timers.set(m, setTimeout(() => correr(m), m.paso()));
    };
    new IntersectionObserver(([e]) => {
      viendo = e.isIntersecting;
      if (viendo) motores.forEach((m) => { if (!timers.has(m)) correr(m); });
      else { timers.forEach((id) => clearTimeout(id)); timers.clear(); }
    }, { threshold: 0.05 }).observe(box);
  })();

  onScroll();
  window.addEventListener('load', () => { sizeGallery(); sizeTl(); measure(); if (hasGsap) ST.refresh(); onScroll(); });
})();
