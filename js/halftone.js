/* ═══════════════════════════════════════════════════════════════
   ONA STUDIO — Titular en semitono (js/halftone.js)
   Adaptación a JavaScript sin dependencias de "Halftone Wordmark Footer", que originalmente es un componente de
   React (un pie de página con una palabra gigante impresa en puntos). El sitio no usa React: aquí se conserva su
   lógica (cobertura por celda, resortes, color que se calienta al desplazarse y onda al hacer clic) y se aplica a
   un titular real del HTML.

   · El texto sigue en el <h1> (lectores de pantalla, buscadores, selección); solo se vuelve transparente cuando el
     lienzo ya dibujó los puntos. Cada palabra se mide en su lugar exacto (Range) y se imprime con su fuente y su
     color (--ht-tinta en CSS), así los puntos caen justo encima del texto en cualquier ancho.
   · Debajo de los puntos va una capa tenue con la letra completa (CAPA): cada palabra se lee clara aunque el cursor
     aparte los puntos.
   · Entrada: los puntos llegan de abajo, de izquierda a derecha, calientes, y se enfrían al asentarse.
   · Con mouse, los puntos se apartan del cursor; un clic (o un toque en celular) manda una onda por las letras.
   · Se duerme en reposo y fuera de pantalla. Con movimiento reducido, los puntos quedan quietos.
   · Opciones de la portada: nube (los puntos llegan de una nube alrededor del slogan, del centro hacia afuera),
     margen (aire del lienzo alrededor del texto, en tamaños de letra) y onda(fuerza): una onda suave desde el centro
     del slogan, sincronizada con la señal del fondo (js/hero-escena.js).
   Uso: const t = Halftone.mount(h1, { host, warm, reduce, nube, margen }); t.intro(); t.onda(0.4);
═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const TIBIOS = 8;          // tonos intermedios entre el color de la letra y el caliente (se dibujan por lotes)
  const ANILLO_MS = 900;     // duración de la onda del clic
  const CAPA = 0.95;         // opacidad de la letra completa bajo los puntos (alta: cada palabra se lee clara)
  const BRILLO = 0.4;        // los puntos van un tono más claro que la letra: la trama se sigue viendo encima

  // Cualquier color CSS → [r, g, b] (el canvas lo normaliza a #rrggbb o rgba())
  const rgb = (() => {
    const c = document.createElement('canvas').getContext('2d');
    return (color) => {
      if (!c) return [250, 249, 244];
      c.fillStyle = '#000';
      c.fillStyle = color;
      const v = c.fillStyle;
      if (v[0] === '#') return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
      const m = v.match(/[\d.]+/g) || [0, 0, 0];
      return m.slice(0, 3).map(Number);
    };
  })();
  const mezcla = (a, b, k) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;

  // Radio del punto según cuánto cubre la letra su celda (por área: el tono se mantiene parejo)
  // (0.62: los puntos llenos se tocan apenas y la letra se lee más sólida)
  const radio = (cob, gap) => Math.sqrt(Math.min(1, Math.max(0, cob))) * gap * 0.65;

  function mount(title, opts = {}) {
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const host = opts.host || title;
    const reduce = !!opts.reduce;
    const caliente = rgb(opts.warm || '#FF4D3D');
    const nube = !!opts.nube;
    const margen = opts.margen || 0.55;
    cv.className = 'ht-canvas';
    cv.setAttribute('aria-hidden', 'true');
    title.prepend(cv);

    let w = 0, h = 0, dpr = 1, M = 0, fs = 48, R = 80;
    let dots = new Float32Array(0);   // x, y, vx, vy, hx, hy, r, color · por punto
    let sale = new Float32Array(0);   // cuándo sale cada punto en la entrada (ms)
    let n = 0;
    let tintas = [];                  // [{ rgb, css, tibios: [css…] }]
    let px = -1e5, py = -1e5;
    let anillo = { x: 0, y: 0, t: -1, f: 1 };
    let raf = 0, visible = true, despierto = true, listo = false;
    let entrada = 'espera';           // espera → corre → hecha (sin entrada, los puntos no se ven aún)
    let capa = null;                  // la letra completa, ya pintada con su tinta (se dibuja tenue bajo los puntos)
    let inicio = 0;                   // cuándo empezó la entrada
    let zona = null;                  // [x, y, ancho, alto]: el texto y el aire que pueden ocupar los puntos ya armados

    const layout = () => {
      const b = title.getBoundingClientRect();
      if (!b.width || !b.height) return false;
      fs = parseFloat(getComputedStyle(title).fontSize) || 48;
      M = Math.round(fs * margen);
      R = Math.max(40, Math.min(80, fs * 0.6));
      w = Math.round(b.width + M * 2);
      h = Math.round(b.height + M * 2);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      Object.assign(cv.style, { left: `${-M}px`, top: `${-M}px`, width: `${w}px`, height: `${h}px` });
      caja = null;
      // Con el slogan armado, cada cuadro borra y repinta solo esta zona (no todo el lienzo, que crece por la nube)
      const P = Math.min(M, R + 26);
      const zx = Math.max(0, Math.floor(M - P)), zy = Math.max(0, Math.floor(M - P));
      zona = [zx, zy, Math.min(w, Math.ceil(b.width + M + P)) - zx, Math.min(h, Math.ceil(b.height + M + P)) - zy];

      // Palabras: su caja real en pantalla, su fuente y su tinta
      const grupos = new Map();
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let nodo = walker.nextNode(); nodo; nodo = walker.nextNode()) {
        const el = nodo.parentElement;
        if (!el || el === cv) continue;
        const cs = getComputedStyle(el);
        const tinta = (cs.getPropertyValue('--ht-tinta') || '').trim() || cs.color;
        const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const mayus = cs.textTransform === 'uppercase';
        const texto = nodo.textContent;
        for (const m of texto.matchAll(/\S+/g)) {
          range.setStart(nodo, m.index);
          range.setEnd(nodo, m.index + m[0].length);
          const r = range.getBoundingClientRect();
          if (!r.width) continue;
          if (!grupos.has(tinta)) grupos.set(tinta, []);
          grupos.get(tinta).push({ txt: mayus ? m[0].toLocaleUpperCase('es') : m[0], font, x: r.left - b.left + M, y: r.top - b.top + M, w: r.width, h: r.height });
        }
      }
      range.detach();

      // Cada grupo de color se imprime en una máscara y se muestrea por celdas
      capa = document.createElement('canvas');
      capa.width = Math.round(w * dpr);
      capa.height = Math.round(h * dpr);
      const cp = capa.getContext('2d');
      const mask = document.createElement('canvas');
      mask.width = w;
      mask.height = h;
      const mk = mask.getContext('2d', { willReadFrequently: true });
      if (!mk) return false;
      // Trama fina (más puntos, letras más claras): ~4 px en escritorio, 2.5 px en celular
      const gap = Math.max(2.4, Math.min(4.4, fs / 32));
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp = [];
      tintas = [];
      [...grupos.entries()].forEach(([tinta, palabras], ci) => {
        const c = rgb(tinta);
        const claro = c.map((v) => v + (255 - v) * BRILLO);
        tintas.push({ rgb: claro, css: mezcla(claro, claro, 0), tibios: Array.from({ length: TIBIOS }, (_, k) => mezcla(claro, caliente, (k + 1) / TIBIOS)) });
        mk.clearRect(0, 0, w, h);
        mk.fillStyle = '#000';
        mk.textBaseline = 'alphabetic';
        palabras.forEach((p) => {
          mk.font = p.font;
          const met = mk.measureText(p.txt);
          const asc = met.fontBoundingBoxAscent || p.h * 0.8;
          const desc = met.fontBoundingBoxDescent || p.h * 0.2;
          mk.save();
          mk.translate(p.x, p.y + (p.h - (asc + desc)) / 2 + asc);
          if (met.width) mk.scale(p.w / met.width, 1);
          mk.fillText(p.txt, 0, 0);
          mk.restore();
        });
        // La misma palabra, con su color, en la capa de letra completa
        if (cp) {
          cp.setTransform(dpr, 0, 0, dpr, 0, 0);
          cp.fillStyle = tinta;
          cp.textBaseline = 'alphabetic';
          palabras.forEach((pp) => {
            cp.font = pp.font;
            const met = cp.measureText(pp.txt);
            const asc = met.fontBoundingBoxAscent || pp.h * 0.8;
            const desc = met.fontBoundingBoxDescent || pp.h * 0.2;
            cp.save();
            cp.translate(pp.x, pp.y + (pp.h - (asc + desc)) / 2 + asc);
            if (met.width) cp.scale(pp.w / met.width, 1);
            cp.fillText(pp.txt, 0, 0);
            cp.restore();
          });
        }
        const img = mk.getImageData(0, 0, w, h).data;
        for (let gy = 0; gy < rows; gy++) {
          for (let gx = 0; gx < cols; gx++) {
            let suma = 0;
            for (let sy = 0; sy < 3; sy++) {
              for (let sx = 0; sx < 3; sx++) {
                const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
                const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
                suma += img[(y * w + x) * 4 + 3];
              }
            }
            const cob = suma / (9 * 255);
            if (cob < 0.14) continue; // sin puntitos sueltos en los bordes
            const hx = gx * gap + gap / 2;
            const hy = gy * gap + gap / 2;
            tmp.push(hx, hy, 0, 0, hx, hy, radio(cob, gap), ci);
          }
        }
      });
      dots = new Float32Array(tmp);
      n = tmp.length / 8;
      sale = new Float32Array(n);
      return n > 0;
    };

    // La entrada: cada punto sale de abajo (desordenado) en una barrida de izquierda a derecha; con nube, los puntos
    // aparecen dispersos alrededor del slogan y se juntan en las letras, del centro hacia afuera (calientes al llegar)
    const arrancarEntrada = () => {
      const t0 = performance.now() + 60;
      const diag = Math.hypot(w, h) / 2;
      for (let i = 0; i < n; i++) {
        const j = i * 8;
        if (nube) {
          const a = Math.random() * TAU;
          const d = M * (0.3 + Math.random() * 0.8);
          dots[j] = Math.min(w - 2, Math.max(2, dots[j + 4] + Math.cos(a) * d * 1.5));
          dots[j + 1] = Math.min(h - 2, Math.max(2, dots[j + 5] + Math.sin(a) * d));
          sale[i] = t0 + (Math.hypot(dots[j + 4] - w / 2, dots[j + 5] - h / 2) / diag) * 760 + Math.random() * 420;
        } else {
          dots[j] = dots[j + 4] + (Math.random() - 0.5) * fs * 0.45;
          dots[j + 1] = dots[j + 5] + fs * (0.2 + Math.random() * 0.45);
          sale[i] = t0 + (dots[j + 4] / w) * 750 + Math.random() * 220;
        }
        dots[j + 2] = 0;
        dots[j + 3] = 0;
      }
      inicio = t0;
      entrada = 'corre';
    };
    const asentar = () => {
      for (let i = 0; i < n; i++) {
        const j = i * 8;
        dots[j] = dots[j + 4];
        dots[j + 1] = dots[j + 5];
        dots[j + 2] = 0;
        dots[j + 3] = 0;
      }
    };

    let calor = new Uint8Array(0);    // tono de cada punto en este cuadro (0 = en su lugar · 1…TIBIOS = desplazado)
    let escala = new Float32Array(0); // tamaño extra de cada punto al pasar la onda suave (un destello, sin moverlo)
    const draw = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const z = entrada === 'hecha' && zona ? zona : null;
      if (z) ctx.clearRect(z[0], z[1], z[2], z[3]);
      else ctx.clearRect(0, 0, w, h);
      if (entrada === 'espera') { despierto = false; return; }
      // La entrada tiene tiempo fijo: en equipos que dibujan pocos cuadros por segundo, a los 2.8 s los puntos que falten
      // llegan a su lugar (sin esto, la física por cuadro alargaría la entrada indefinidamente)
      if (entrada === 'corre' && now - inicio > 2800) { asentar(); entrada = 'hecha'; }
      // Letra completa, tenue, bajo los puntos (en la entrada aparece cuando los puntos ya van llegando)
      if (capa) {
        const k = entrada === 'corre' ? Math.min(1, Math.max(0, (now - inicio - 500) / 900)) : 1;
        if (k > 0) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = CAPA * k;
          if (z) ctx.drawImage(capa, z[0] * dpr, z[1] * dpr, z[2] * dpr, z[3] * dpr, z[0] * dpr, z[1] * dpr, z[2] * dpr, z[3] * dpr);
          else ctx.drawImage(capa, 0, 0);
          ctx.restore();
        }
      }
      if (calor.length !== n) calor = new Uint8Array(n);
      if (escala.length !== n) escala = new Float32Array(n).fill(1);
      const ocupa = new Uint8Array(tintas.length * (TIBIOS + 1)); // qué lotes (color × tono) tienen puntos: los vacíos se saltan
      const destello = anillo.f < 1;   // la onda de la señal: brillo que recorre las letras; el clic sí empuja
      const r = reduce ? 0 : R;
      const edad = anillo.t < 0 ? 1e9 : now - anillo.t;
      const rAnillo = edad * 0.9;
      let moviendo = false;
      let pendientes = false;
      for (let i = 0; i < n; i++) {
        const j = i * 8;
        if (entrada === 'corre' && now < sale[i]) { calor[i] = 255; pendientes = true; continue; }
        let x = dots[j], y = dots[j + 1], vx = dots[j + 2], vy = dots[j + 3];
        const hx = dots[j + 4], hy = dots[j + 5];
        escala[i] = 1;
        if (!reduce) {
          if (edad < ANILLO_MS && destello) {
            const d = Math.hypot(hx - anillo.x, hy - anillo.y);
            const banda = 1 - Math.min(1, Math.abs(d - rAnillo) / 38);
            if (banda > 0) escala[i] = 1 + banda * anillo.f * (1 - edad / ANILLO_MS);
          } else if (edad < ANILLO_MS) {
            const dx = hx - anillo.x;
            const dy = hy - anillo.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const banda = 1 - Math.min(1, Math.abs(d - rAnillo) / 20);
            if (banda > 0) {
              const f = banda * 2.2 * anillo.f * (1 - edad / ANILLO_MS);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
            }
          }
          const ex = x - px;
          const ey = y - py;
          const d2 = ex * ex + ey * ey;
          if (r > 0 && d2 < r * r) {
            const d = Math.sqrt(d2) + 0.001;
            const f = (1 - d / r) * 1.7;
            vx += (ex / d) * f;
            vy += (ey / d) * f;
          }
          vx = (vx + (hx - x) * 0.05) * 0.84;
          vy = (vy + (hy - y) * 0.05) * 0.84;
          x += vx;
          y += vy;
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moviendo = true;
          else { x = hx; y = hy; vx = 0; vy = 0; }
          dots[j] = x; dots[j + 1] = y; dots[j + 2] = vx; dots[j + 3] = vy;
        }
        const k = Math.min(1, Math.hypot(x - hx, y - hy) / 34);
        calor[i] = k > 0.02 ? Math.ceil(k * TIBIOS) : 0;
        ocupa[dots[j + 7] * (TIBIOS + 1) + calor[i]] = 1;
      }
      // Por lotes: un trazo por color y por tono (miles de puntos en pocas llamadas a fill)
      tintas.forEach((t, ci) => {
        for (let nivel = 0; nivel <= TIBIOS; nivel++) {
          if (!ocupa[ci * (TIBIOS + 1) + nivel]) continue;
          ctx.beginPath();
          let alguno = false;
          for (let i = 0; i < n; i++) {
            const j = i * 8;
            if (dots[j + 7] !== ci || calor[i] !== nivel) continue;
            let rr = dots[j + 6] * escala[i];
            if (entrada === 'corre') rr *= Math.min(1, (now - sale[i]) / 260);
            if (rr <= 0.05) continue;
            ctx.moveTo(dots[j] + rr, dots[j + 1]);
            ctx.arc(dots[j], dots[j + 1], rr, 0, TAU);
            alguno = true;
          }
          if (!alguno) continue;
          ctx.fillStyle = nivel ? t.tibios[nivel - 1] : t.css;
          ctx.fill();
        }
      });
      if (entrada === 'corre' && !pendientes && !moviendo) entrada = 'hecha';
      despierto = moviendo || pendientes || edad < ANILLO_MS || px > -1e4 || entrada === 'corre';
    };

    let salto = false;
    const loop = (now) => {
      raf = 0;
      if (!visible) return;
      // Si lo único vivo es el destello de la señal (sin cursor, sin clic, slogan ya armado), se dibuja un cuadro sí y otro no
      const soloDestello = anillo.f < 1 && entrada === 'hecha' && px < -1e4 && now - anillo.t < ANILLO_MS;
      salto = soloDestello && !salto;
      if (!salto) draw(now);
      if (despierto || salto) raf = requestAnimationFrame(loop);
    };
    const despertar = () => {
      despierto = true;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    // La posición del lienzo se mide una vez y se guarda hasta el siguiente scroll o cambio de tamaño: medir en cada
    // movimiento del mouse obliga al navegador a recalcular la página entera si algo cambió entretanto
    let caja = null;
    const olvidar = () => { caja = null; };
    window.addEventListener('scroll', olvidar, { passive: true });
    window.addEventListener('resize', olvidar, { passive: true });
    const local = (e) => {
      if (!caja) caja = cv.getBoundingClientRect();
      return [e.clientX - caja.left, e.clientY - caja.top];
    };
    if (!reduce) {
      host.addEventListener('pointermove', (e) => {
        if (!listo) return;
        [px, py] = local(e);
        despertar();
      });
      const salir = () => { px = -1e5; py = -1e5; despertar(); };
      host.addEventListener('pointerleave', salir);
      host.addEventListener('pointercancel', salir);
      host.addEventListener('pointerdown', (e) => {
        if (!listo || e.target.closest('a, button, input, label')) return;
        const [x, y] = local(e);
        anillo = { x, y, t: performance.now(), f: 1 };
        despertar();
      });
    }

    let pideEntrada = false;
    const preparar = () => {
      if (!layout()) return;
      listo = true;
      title.classList.add('is-halftone');
      if (pideEntrada && entrada === 'espera') {
        if (reduce) entrada = 'hecha';
        else arrancarEntrada();
      } else if (entrada !== 'espera') {
        entrada = 'hecha';
        asentar();
      }
      despertar();
    };

    // Medir con la fuente real: Anton se espera (máx. 2.5 s); si llega tarde, se vuelve a imprimir
    const fuente = document.fonts
      ? Promise.race([document.fonts.load(`400 ${Math.round(parseFloat(getComputedStyle(title).fontSize) || 48)}px Anton`), new Promise((r) => setTimeout(r, 2500))])
      : Promise.resolve();
    fuente.then(preparar, preparar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (listo) preparar(); });

    let rAncho = 0;
    let rT = 0;
    new ResizeObserver(() => {
      const ancho = title.getBoundingClientRect().width;
      if (!listo || Math.abs(ancho - rAncho) < 1) { rAncho = ancho; return; }
      rAncho = ancho;
      clearTimeout(rT);
      rT = setTimeout(preparar, 120);
    }).observe(title);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) despertar();
    }).observe(title);

    return {
      // La entrada se pide al terminar la pantalla de carga; si aún no se midió, corre en cuanto se pueda
      intro() {
        pideEntrada = true;
        if (!listo || entrada !== 'espera') return;
        if (reduce) entrada = 'hecha';
        else arrancarEntrada();
        despertar();
      },
      // Onda suave desde el centro del slogan (la señal del fondo pasa por las letras); solo con el slogan ya armado
      onda(fuerza = 0.4) {
        if (!listo || reduce || entrada !== 'hecha' || !visible) return;
        anillo = { x: w / 2, y: h / 2, t: performance.now(), f: fuerza };
        despertar();
      },
    };
  }

  window.Halftone = { mount };
})();
